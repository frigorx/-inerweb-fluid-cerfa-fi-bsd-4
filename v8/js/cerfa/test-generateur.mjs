// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test du générateur CERFA 15497*04 (Phase D)
// Exécution : node test-generateur.mjs (depuis v8/js/cerfa/)
// Chaque PDF généré est RELU avec pdf-lib : les valeurs vérifiées
// sont celles réellement inscrites dans le formulaire officiel.
// ============================================================

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { creerStore } from '../data/datastore.js';
import { genererCerfaPdf, chargerPdfLib, calculerCadre7 }
  from './generateur.js';

let nbOk = 0;
let nbEchecs = 0;

function verifier(libelle, condition, detail = '') {
  if (condition) {
    nbOk += 1;
    console.log(`  OK  ${libelle}`);
  } else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

const PDFLib = await chargerPdfLib();

/** Relit un PDF généré et retourne des accès simples au formulaire. */
async function relire(octets) {
  const doc = await PDFLib.PDFDocument.load(octets);
  const form = doc.getForm();
  return {
    texte: (nom) => form.getTextField(nom).getText() ?? '',
    coche: (nom) => form.getCheckBox(nom).isChecked(),
    radio: (nom) => form.getRadioGroup(nom).getSelected()
  };
}

const store = await creerStore();

// ============================================================
// 0. Référentiel fluides : classeSecurite exposée par getFluides
// ============================================================
const fluides = await store.getFluides();
const classes = new Map(fluides.map((f) => [f.code, f.classeSecurite]));
verifier('getFluides : 9 fluides au référentiel', fluides.length === 9);
verifier('classeSecurite R-455A = A2L', classes.get('R-455A') === 'A2L');
verifier('classeSecurite R-410A = A1', classes.get('R-410A') === 'A1');
verifier('classeSecurite R-290 = A3', classes.get('R-290') === 'A3');
verifier('classeSecurite renseignée pour TOUS les fluides',
  fluides.every((f) => ['A1', 'A2L', 'A2', 'A3'].includes(f.classeSecurite)));

// ============================================================
// 1. FI-2026-0005 — récupération R-455A sur M5 (machine en fuite,
//    détection permanente, contrôle du 18/06 au registre)
// ============================================================
const recup = await genererCerfaPdf(store, {
  source: 'mouvement', id: 'mvt-0005'
});
verifier('FI-2026-0005 : numero retourné', recup.numero === 'FI-2026-0005');
verifier('FI-2026-0005 : nom de fichier',
  recup.nomFichier === 'cerfa-15497-04_FI-2026-0005.pdf');
verifier('FI-2026-0005 : octets Uint8Array non vides',
  recup.octets instanceof Uint8Array && recup.octets.length > 10000);

const r = await relire(recup.octets);
verifier('FI-2026-0005 : Fiche_no', r.texte('Fiche_no') === 'FI-2026-0005');

// Cadre 1-2-3 : opérateur, détenteur, équipement non vides
verifier('cadre 1 : opérateur = établissement (multiligne, SIRET)',
  r.texte('Operateur').includes('Vidal') &&
  r.texte('Operateur').includes('SIRET'));
verifier('cadre 1 : Attestation_no = capacité',
  r.texte('Attestation_no') === 'AC-13-004567');
verifier('cadre 2 : détenteur = client de la machine (Le Fournil)',
  r.texte('Detenteur').includes('Boulangerie Le Fournil'));
verifier('cadre 3 : Equipement_ID (code + désignation + n° série)',
  r.texte('Equipement_ID').includes('M5') &&
  r.texte('Equipement_ID').includes('Fournil') &&
  r.texte('Equipement_ID').includes('ZX-33107'));
verifier('cadre 3 : fluide sans préfixe R-',
  r.texte('Equipement_Fluide') === '455A');
verifier('cadre 3 : charge nominale 3,20',
  r.texte('Equipement_Charge') === '3,20');
verifier('cadre 3 : teqCO2 0,47 (3,20 kg × 148 / 1000)',
  r.texte('Equipement_teqCO2') === '0,47');

// Cadre 4 : RECUPERATION_MAINTENANCE → Case_Maintenance, les autres décochées
verifier('cadre 4 : Case_Maintenance cochée', r.coche('Case_Maintenance'));
verifier('cadre 4 : les 7 autres cases décochées',
  ['Case_Assemblage', 'Case_MiseService', 'Case_Modif', 'Case_CtrlPerio',
    'Case_CtrlNonPerio', 'Case_Demantel', 'Case_Autre']
    .every((c) => !r.coche(c)));

// Cadre 6 : M5 a la détection permanente → radio « 1 » (Oui)
verifier('cadre 6 : Bouton_Oui = « 1 » (détection permanente M5)',
  r.radio('Bouton_Oui') === '1');

// Cadre 7 : R-455A est un mélange traité comme un HFC (Règle A) ; sur la
// charge NOMINALE (3,20 kg) → 3,20 × 148 / 1000 = 0,47 t éq. CO₂ < 5 →
// AUCUNE case de seuil ni de fréquence. (Bug corrigé : auparavant classé
// HFO/kg, il cochait Case_HFO_1 + Case_Avec_24m à tort.)
verifier('cadre 7 : aucune case de seuil (R-455A sous 5 t éq. CO₂ en HFC)',
  ['Case_HCFC_2', 'Case_HCFC_30', 'Case_HCFC_300', 'Case_HFC_5',
    'Case_HFC_50', 'Case_HFC_500', 'Case_HFO_1', 'Case_HFO_10',
    'Case_HFO_100'].every((c) => !r.coche(c)));
verifier('cadre 7 : aucune case de fréquence (hors périmètre à cette charge)',
  ['Case_Sans_12m', 'Case_Sans_6m', 'Case_Sans_3m', 'Case_Avec_24m',
    'Case_Avec_12m', 'Case_Avec_6m'].every((c) => !r.coche(c)));

// Cadre 10 : recoupé avec le contrôle du 18/06 (FUITE) sur M5
verifier('cadre 10 : Case_Fuite_Oui cochée (contrôle du 18/06)',
  r.coche('Case_Fuite_Oui'));
verifier('cadre 10 : Case_Fuite_Non décochée', !r.coche('Case_Fuite_Non'));
verifier('cadre 10 : réparation à faire (ligne 1)',
  r.coche('Case_Rep_Fuite1_AFaire') && !r.coche('Case_Rep_Fuite1_realisee'));

// Cadre 11 : récupération sans décision déchet → QE, QDE = somme
verifier('cadre 11 : 11_Denom = R-455A', r.texte('11_Denom') === 'R-455A');
verifier('cadre 11 : 11_Quantite = charge nominale (3,20)',
  r.texte('11_Quantite') === '3,20');
verifier('cadre 11 : 11_QE = 0,15 (récupération pour réutilisation)',
  r.texte('11_QE') === '0,15');
verifier('cadre 11 : 11_QDE = 0,15 (total récupéré)',
  r.texte('11_QDE') === '0,15');
verifier('cadre 11 : QA, QB, QC, QD vides',
  ['11_QA', '11_QB', '11_QC', '11_QD'].every((c) => r.texte(c) === ''));

// Cadre 12 : récupération d'un fluide A2L → UN 3161 (inflammable)
verifier('cadre 12 : Case_12_UN3161 cochée (R-455A classe A2L)',
  r.coche('Case_12_UN3161'));
verifier('cadre 12 : Case_12_UN1078 décochée', !r.coche('Case_12_UN1078'));
verifier('cadre 12 : cases « autre déchet » décochées',
  !r.coche('Case_12_Autre140601') && !r.coche('Case_12_Autre160504'));

// Signatures
verifier('signature : opérateur = technicien (Sophie Bianchi)',
  r.texte('Sign_Operateur_Nom') === 'Sophie Bianchi');
verifier('signature : qualité = titulaire attestation d’aptitude',
  r.texte('Sign_Operateur_Qualite') === 'Titulaire attestation d’aptitude');
verifier('signature : détenteur = Boulangerie Le Fournil',
  r.texte('Sign_Detenteur_Nom') === 'Boulangerie Le Fournil');
verifier('signature : dates au format JJ/MM/AAAA',
  r.texte('Sign_Operateur_Date') === '18/06/2026' &&
  r.texte('Sign_Detenteur_Date') === '18/06/2026');

// Cadre 14 : mouvement de démo en mode FORMATION → mention obligatoire
verifier('cadre 14 : mention MODE FORMATION (mouvement de démo)',
  r.texte('14_Observations').includes('MODE FORMATION — DOCUMENT NON ' +
    'OFFICIEL — NE PAS UTILISER POUR UNE INTERVENTION RÉELLE'));

// ============================================================
// 2. FI-2026-0007 — CHARGE_APPOINT R-404A sur M1 (sans détection)
// ============================================================
const charge = await genererCerfaPdf(store, {
  source: 'mouvement', id: 'mvt-0007'
});
const c = await relire(charge.octets);
verifier('FI-2026-0007 : Fiche_no', c.texte('Fiche_no') === 'FI-2026-0007');

// Cadre 4 : CHARGE_APPOINT → Case_Maintenance
verifier('cadre 4 : Case_Maintenance cochée (charge/appoint)',
  c.coche('Case_Maintenance'));
verifier('cadre 4 : Case_MiseService et Case_Demantel décochées',
  !c.coche('Case_MiseService') && !c.coche('Case_Demantel'));

// Cadre 6 : M1 sans détection permanente → radio « 2 » (Non)
verifier('cadre 6 : Bouton_Oui = « 2 » (M1 sans détection)',
  c.radio('Bouton_Oui') === '2');

// Cadre 7 : R-404A HFC — 4,20 kg × 3922 / 1000 = 16,47 teq ≥ 5
verifier('cadre 7 : Case_HFC_5 cochée (16,47 teq ≥ 5)',
  c.coche('Case_HFC_5'));
verifier('cadre 7 : Case_Sans_12m cochée (sans détection)',
  c.coche('Case_Sans_12m'));
verifier('cadre 7 : Case_HFO_1 et Case_Avec_24m décochées',
  !c.coche('Case_HFO_1') && !c.coche('Case_Avec_24m'));

// Cadre 10 : contrôle CONFORME du 29/06 sur M1 (recoupement registre)
verifier('cadre 10 : Case_Fuite_Non cochée (contrôle conforme du 29/06)',
  c.coche('Case_Fuite_Non') && !c.coche('Case_Fuite_Oui'));

// Cadre 11 : charge depuis bouteille vierge (par défaut) → QA
verifier('cadre 11 : 11_QA = 0,30 (fluide vierge)',
  c.texte('11_QA') === '0,30');
verifier('cadre 11 : QB, QC, QD, QE, QDE vides (aucune récupération)',
  ['11_QB', '11_QC', '11_QD', '11_QE', '11_QDE']
    .every((n) => c.texte(n) === ''));
verifier('cadre 11 : 11_Quantite = charge nominale M1 (4,50)',
  c.texte('11_Quantite') === '4,50');
verifier('cadre 3 : teqCO2 M1 = 17,65 (4,50 × 3922 / 1000)',
  c.texte('Equipement_teqCO2') === '17,65');

// Cadre 12 : RIEN coché pour une charge (transport hors sujet)
verifier('cadre 12 : aucune case cochée pour une charge',
  ['Case_12_UN1078', 'Case_12_UN3161', 'Case_12_Autre140601',
    'Case_12_Autre160504'].every((n) => !c.coche(n)));

// Signatures : Julien Martin est élève (aucune attestation)
verifier('signature : qualité = Élève en formation (Julien Martin)',
  c.texte('Sign_Operateur_Qualite') === 'Élève en formation');

// ============================================================
// 3. CERFA de contrôle (source « controle ») — ctl-003 périodique
// ============================================================
const ctrl = await genererCerfaPdf(store, {
  source: 'controle', id: 'ctl-003'
});
const k = await relire(ctrl.octets);
verifier('contrôle : Fiche_no = numéro de fiche du contrôle (plus l\'id technique ctl-)',
  k.texte('Fiche_no') === 'C-FORM-2026-0003');
verifier('contrôle en formation : mention FORMATION au cadre 14 (filigrane effectif)',
  k.texte('14_Observations').includes('MODE FORMATION'));
verifier('contrôle : Case_CtrlPerio cochée (contrôle périodique)',
  k.coche('Case_CtrlPerio'));
verifier('contrôle : Case_CtrlNonPerio et Case_Maintenance décochées',
  !k.coche('Case_CtrlNonPerio') && !k.coche('Case_Maintenance'));
verifier('contrôle : résultat CONFORME → Case_Fuite_Non',
  k.coche('Case_Fuite_Non') && !k.coche('Case_Fuite_Oui'));
verifier('contrôle : équipement M1 renseigné',
  k.texte('Equipement_ID').includes('M1'));
// Données démo anonymisées : l'opérateur de ctl-003 est Marc Delorme
// (REFERENT titulaire d'une attestation d'aptitude).
verifier('contrôle : opérateur = Marc Delorme (titulaire)',
  k.texte('Sign_Operateur_Nom') === 'Marc Delorme' &&
  k.texte('Sign_Operateur_Qualite') === 'Titulaire attestation d’aptitude');
verifier('contrôle : observations décrivent le contrôle',
  k.texte('14_Observations').toLowerCase().includes('périodique'));

// Contrôle NON périodique (ctl-002, fuite sur M5)
const ctrl2 = await genererCerfaPdf(store, {
  source: 'controle', id: 'ctl-002'
});
const k2 = await relire(ctrl2.octets);
verifier('contrôle non périodique : Case_CtrlNonPerio cochée',
  k2.coche('Case_CtrlNonPerio') && !k2.coche('Case_CtrlPerio'));
verifier('contrôle non périodique : fuite → Case_Fuite_Oui + à réparer',
  k2.coche('Case_Fuite_Oui') && k2.coche('Case_Rep_Fuite1_AFaire'));

// ============================================================
// 4. Mouvement FORMATION créé de bout en bout (wizard simulé) :
//    signature PNG + détecteur lié + numérotation FORM-
// ============================================================
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYA' +
  'AAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const brouillon = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  mode: 'FORMATION',
  machineId: 'M6',
  bouteilleSrcId: 'B5',
  peseeAvantKg: 13.9,
  peseeApresKg: 13.8,
  controle: { statutControle: 'CONFORME', detecteurId: 'out-1' },
  signatureDataUrl: PNG_1PX,
  technicien: 'Lucas Moreau'
});
await store.soumettreMouvement(brouillon.id);
await store.validerMouvement(brouillon.id, 'per-fh');

const formation = await genererCerfaPdf(store, {
  source: 'mouvement', id: brouillon.id
});
const f = await relire(formation.octets);
verifier('formation : numérotation FORM-2026-0001',
  formation.numero === 'FORM-2026-0001' &&
  f.texte('Fiche_no') === 'FORM-2026-0001');
verifier('formation : mention obligatoire au cadre 14',
  f.texte('14_Observations').includes('MODE FORMATION — DOCUMENT NON ' +
    'OFFICIEL — NE PAS UTILISER POUR UNE INTERVENTION RÉELLE'));
verifier('cadre 5 : détecteur lié (Testo 316-3, n° série)',
  f.texte('Detecteur_ID').includes('Testo 316-3') &&
  f.texte('Detecteur_ID').includes('T316-45872'));
// 22/07 : les dates d'étalonnage du monde démo sont RELATIVES au jour —
// l'attendu se dérive de la fiche outillage, jamais d'une date figée.
const testoDemo = (await store.getOutillage()).find((o) => o.id === 'out-1');
const [anneeEtal, moisEtal, jourEtal] = testoDemo.dateEtalonnage.split('-');
verifier('cadre 5 : date d’étalonnage J/M/A (celle du détecteur de démo)',
  f.texte('Controle_Jour') === jourEtal &&
  f.texte('Controle_Mois') === moisEtal &&
  f.texte('Controle_Annee') === anneeEtal,
  `attendu ${jourEtal}/${moisEtal}/${anneeEtal} — lu ${f.texte('Controle_Jour')}/`
  + `${f.texte('Controle_Mois')}/${f.texte('Controle_Annee')}`);
verifier('cadre 10 : contrôle du wizard CONFORME → Case_Fuite_Non',
  f.coche('Case_Fuite_Non') && !f.coche('Case_Fuite_Oui'));
verifier('cadre 11 : 11_QA = 0,10 (pesées 13,9 → 13,8)',
  f.texte('11_QA') === '0,10');
verifier('cadre 11 : contenant = n° réel de la bouteille source',
  f.texte('11_Contenant_ID') === 'WF-410-31554');
verifier('formation : PDF avec signature plus lourd que le vierge',
  formation.octets.length > 10000);

// ============================================================
// 4 bis. IM-13 + IM-14 — récupération vers DÉCHET : cadre 12
//    complet (ligne « autre déchet » + code déchet européen) et
//    cause du mouvement reportée au cadre 14 (« Cause : … »).
// ============================================================

// Fluide NON inflammable (R-404A, classe A1) : B3 (bouteille de
// récupération) reçoit la vidange de M1, puis son fluide est déclaré
// DÉCHET → UN 1078 + « autre déchet » code 14 06 01.
const recupDechet = await store.creerMouvement({
  type: 'RECUPERATION_MAINTENANCE',
  mode: 'FORMATION',
  machineId: 'M1',
  bouteilleDstId: 'B3',
  peseeAvantKg: 16.8,
  peseeApresKg: 17.0,
  causeMouvement: 'Vidange avant remplacement du compresseur',
  technicien: 'Sophie Bianchi'
});
await store.soumettreMouvement(recupDechet.id);
await store.validerMouvement(recupDechet.id, 'per-fh');
await store.deciderFluideRecupere('B3', 'DECHET', 'per-fh');

const dechet = await genererCerfaPdf(store, {
  source: 'mouvement', id: recupDechet.id
});
const d = await relire(dechet.octets);
verifier('IM-14 : cause reportée au cadre 14 en préfixe « Cause : »',
  d.texte('14_Observations')
    .includes('Cause : Vidange avant remplacement du compresseur'));
verifier('cadre 11 : décision DÉCHET → 11_QD = 0,20 (QE vide)',
  d.texte('11_QD') === '0,20' && d.texte('11_QE') === '' &&
  d.texte('11_QDE') === '0,20');
verifier('IM-13 : Case_12_UN1078 cochée (R-404A classe A1)',
  d.coche('Case_12_UN1078') && !d.coche('Case_12_UN3161'));
verifier('IM-13 : Case_12_Autre140601 cochée (déchet non inflammable)',
  d.coche('Case_12_Autre140601') && !d.coche('Case_12_Autre160504'));
verifier('IM-13 : champ texte = code déchet 14 06 01',
  d.texte('Autre-FF-NON-inflammable').includes('14 06 01') &&
  d.texte('Autre-FF-inflammable') === '');

// Fluide INFLAMMABLE (R-455A, classe A2L) : nouvelle bouteille de
// récupération, vidange de M5, décision DÉCHET → UN 3161 + code 16 05 04.
const bouteilleA2L = await store.createBouteille({
  type: 'RECUPERATION',
  fluide: 'R-455A',
  tareKg: 12.0,
  masseBruteKg: 12.0,
  contenanceMaxKg: 10,
  operateur: 'per-fh'
});
const recupInflammable = await store.creerMouvement({
  type: 'RECUPERATION_MAINTENANCE',
  mode: 'FORMATION',
  machineId: 'M5',
  bouteilleDstId: bouteilleA2L.id,
  peseeAvantKg: 12.0,
  peseeApresKg: 12.1,
  technicien: 'Sophie Bianchi'
});
await store.soumettreMouvement(recupInflammable.id);
await store.validerMouvement(recupInflammable.id, 'per-fh');
await store.deciderFluideRecupere(bouteilleA2L.id, 'DECHET', 'per-fh');

const dechetInf = await genererCerfaPdf(store, {
  source: 'mouvement', id: recupInflammable.id
});
const di = await relire(dechetInf.octets);
verifier('IM-13 : Case_12_UN3161 + Case_12_Autre160504 (A2L déchet)',
  di.coche('Case_12_UN3161') && di.coche('Case_12_Autre160504') &&
  !di.coche('Case_12_UN1078') && !di.coche('Case_12_Autre140601'));
verifier('IM-13 : champ texte = code déchet 16 05 04',
  di.texte('Autre-FF-inflammable').includes('16 05 04') &&
  di.texte('Autre-FF-NON-inflammable') === '');
verifier('cadre 11 : 11_QD = 0,10 (déchet inflammable)',
  di.texte('11_QD') === '0,10' && di.texte('11_QE') === '');

// ============================================================
// 4 ter. IM-15 (volet générateur) — types ASSEMBLAGE /
//    MODIFICATION / AUTRE : cases du cadre 4 + champ « Autre ».
//    Le store de démo ne crée pas encore ces types (volet wizard) :
//    un mouvement validé fictif est injecté PAR-DESSUS le store réel
//    (Proxy sur getMouvements), le générateur ne voyant que ses
//    accesseurs.
// ============================================================
function storeAvecMouvement(mouvementFictif) {
  return new Proxy(store, {
    get(cible, propriete) {
      if (propriete === 'getMouvements') {
        return async () =>
          [...(await cible.getMouvements()), mouvementFictif];
      }
      const valeur = cible[propriete];
      return typeof valeur === 'function' ? valeur.bind(cible) : valeur;
    }
  });
}

const CASES_CADRE_4 = ['Case_Assemblage', 'Case_MiseService', 'Case_Modif',
  'Case_Maintenance', 'Case_CtrlPerio', 'Case_CtrlNonPerio',
  'Case_Demantel', 'Case_Autre'];
const CAS_IM15 = [
  { type: 'ASSEMBLAGE', caseAttendue: 'Case_Assemblage' },
  { type: 'MODIFICATION', caseAttendue: 'Case_Modif' },
  { type: 'AUTRE', caseAttendue: 'Case_Autre' }
];
for (const { type, caseAttendue } of CAS_IM15) {
  const fictif = {
    id: `mvt-im15-${type.toLowerCase()}`,
    numero: `TEST-${type}`,
    date: '2026-07-01',
    mode: 'FORMATION',
    type,
    machineId: 'M1',
    quantiteKg: null,
    technicien: 'Sophie Bianchi',
    causeMouvement: type === 'AUTRE'
      ? 'Rinçage du circuit à l’azote' : null,
    statut: 'VALIDE'
  };
  const pdfType = await genererCerfaPdf(storeAvecMouvement(fictif), {
    source: 'mouvement', id: fictif.id
  });
  const t = await relire(pdfType.octets);
  verifier(`IM-15 : ${type} → ${caseAttendue} cochée, les 7 autres non`,
    t.coche(caseAttendue) &&
    CASES_CADRE_4.filter((n) => n !== caseAttendue)
      .every((n) => !t.coche(n)));
  if (type === 'AUTRE') {
    verifier('IM-15 : champ « Autre » du cadre 4 renseigné (type AUTRE)',
      t.texte('Autre') !== '');
    verifier('IM-15 : la cause du type AUTRE est au cadre 14 (préfixe)',
      t.texte('14_Observations')
        .includes('Cause : Rinçage du circuit à l’azote'));
  }
}

// ============================================================
// 4 quater. R6 — cadre 11 : ventilation selon le VRAI etatFluide de
//    la bouteille SOURCE d'une charge. RECUPERE réutilisable et
//    MELANGE ne cochent JAMAIS QA (constat d'audit corrigé).
// ============================================================
const machineR6 = await store.createMachine({
  designation: 'Machine du cadre 11 (R6)', fluide: 'R-410A',
  chargeNominaleKg: 5, operateur: 'per-fh'
});

// --- RECUPERE réutilisable en source de charge → QE (jamais QA) --------
const bouteilleRecupereReutilisable = await store.createBouteille({
  type: 'RECUPERATION', fluide: 'R-410A', etatFluide: 'RECUPERE',
  tareKg: 5, masseBruteKg: 8, contenanceMaxKg: 10, operateur: 'per-fh'
});
await store.deciderFluideRecupere(
  bouteilleRecupereReutilisable.id, 'REUTILISABLE', 'per-fh');
const chargeDepuisRecupere = await store.creerMouvement({
  type: 'CHARGE_APPOINT', mode: 'FORMATION', machineId: machineR6.id,
  bouteilleSrcId: bouteilleRecupereReutilisable.id,
  peseeAvantKg: 3, peseeApresKg: 2.5, technicien: 'Sophie Bianchi'
});
await store.soumettreMouvement(chargeDepuisRecupere.id);
await store.validerMouvement(chargeDepuisRecupere.id, 'per-fh');
const pdfRecupere = await genererCerfaPdf(store,
  { source: 'mouvement', id: chargeDepuisRecupere.id });
const rR6 = await relire(pdfRecupere.octets);
verifier('R6 : charge depuis une bouteille RECUPERE réutilisable → 11_QA VIDE',
  rR6.texte('11_QA') === '');
verifier('R6 : charge depuis une bouteille RECUPERE réutilisable → 11_QE = 0,50',
  rR6.texte('11_QE') === '0,50');

// --- MELANGE en source de charge → QE + mention, jamais QA --------------
// Le store BLOQUE désormais la charge depuis une bouteille MELANGE (R2 :
// contenu incertain, jamais vers une installation) — le générateur doit
// POURTANT ventiler correctement une telle écriture si elle existe dans
// un registre HISTORIQUE (antérieur au blocage, ou importé) : on injecte
// donc un mouvement VALIDE fictif sans passer par validerMouvement.
const bouteilleMelangeR6 = await store.createBouteille({
  type: 'RECUPERATION', fluide: 'R-410A', etatFluide: 'MELANGE',
  tareKg: 5, masseBruteKg: 9, contenanceMaxKg: 10, operateur: 'per-fh'
});
const chargeDepuisMelange = {
  id: 'mvt-r6-melange',
  numero: 'TEST-R6-MELANGE',
  date: '2026-07-01',
  mode: 'FORMATION',
  type: 'CHARGE_APPOINT',
  machineId: machineR6.id,
  fluide: 'R-410A',
  quantiteKg: 0.3,
  peseeAvantKg: 4,
  peseeApresKg: 3.7,
  bouteilleSrcId: bouteilleMelangeR6.id,
  technicien: 'Sophie Bianchi',
  statut: 'VALIDE'
};
const pdfMelange = await genererCerfaPdf(storeAvecMouvement(chargeDepuisMelange),
  { source: 'mouvement', id: chargeDepuisMelange.id });
const mR6 = await relire(pdfMelange.octets);
verifier('R6 : charge depuis une bouteille MELANGE → 11_QA VIDE',
  mR6.texte('11_QA') === '');
verifier('R6 : charge depuis une bouteille MELANGE → 11_QE = 0,30',
  mR6.texte('11_QE') === '0,30');
verifier('R6 : mention du mélange sur 11_Contenant_ID',
  mR6.texte('11_Contenant_ID').includes('(mélange)'));
verifier('R6 : mention du mélange reportée au cadre 14 (observations)',
  mR6.texte('14_Observations').toLowerCase().includes('mélang'));

// ============================================================
// 4 quinquies. CM-4b — mention d'anomalie de surcharge de réemploi
//   au cadre 14. La charge R6 ci-dessus (0,5 kg réintroduits depuis
//   une bouteille de RÉCUPÉRATION sans récupération préalable sur
//   cette machine) EST une surcharge → mention présente. Un réemploi
//   ≤ récupéré n'en porte pas. Signalée, JAMAIS bloquante (décision
//   Franck 22/07) : la génération n'a d'ailleurs jamais levé.
// ============================================================
verifier('CM-4b : surcharge de réemploi → mention d’anomalie au cadre 14',
  rR6.texte('14_Observations').includes('Anomalie de réemploi signalée')
  && rR6.texte('14_Observations').includes('0,50 kg'),
  `observations = ${rR6.texte('14_Observations')}`);

// Parcours propre : récupération de 0,4 kg de machineR6 puis réemploi de
// 0,2 kg sur la même machine (≤ récupéré) → aucune mention.
const bouteilleReemploiOk = await store.createBouteille({
  type: 'RECUPERATION', fluide: 'R-410A', etatFluide: 'RECUPERE',
  tareKg: 5, masseBruteKg: 5, contenanceMaxKg: 10, operateur: 'per-fh'
});
const recupPourReemploi = await store.creerMouvement({
  type: 'RECUPERATION_MAINTENANCE', mode: 'FORMATION',
  machineId: machineR6.id, bouteilleDstId: bouteilleReemploiOk.id,
  peseeAvantKg: 0, peseeApresKg: 0.4, technicien: 'Sophie Bianchi'
});
await store.soumettreMouvement(recupPourReemploi.id);
await store.validerMouvement(recupPourReemploi.id, 'per-fh');
await store.deciderFluideRecupere(
  bouteilleReemploiOk.id, 'REUTILISABLE', 'per-fh');
const reemploiDansAvoir = await store.creerMouvement({
  type: 'CHARGE_APPOINT', mode: 'FORMATION', machineId: machineR6.id,
  bouteilleSrcId: bouteilleReemploiOk.id,
  peseeAvantKg: 0.4, peseeApresKg: 0.2, technicien: 'Sophie Bianchi'
});
await store.soumettreMouvement(reemploiDansAvoir.id);
await store.validerMouvement(reemploiDansAvoir.id, 'per-fh');
const pdfReemploiOk = await genererCerfaPdf(store,
  { source: 'mouvement', id: reemploiDansAvoir.id });
const okR = await relire(pdfReemploiOk.octets);
verifier('CM-4b : réemploi ≤ récupéré → aucune mention d’anomalie',
  !okR.texte('14_Observations').includes('Anomalie de réemploi'),
  `observations = ${okR.texte('14_Observations')}`);

// CM-5 : la CONSOLIDATION légitime (récup → transfert → recharge) ne
// porte plus de mention — les lots d'origine suivent le transfert (le
// faux positif de la revue adversariale du 22/07, tué).
const bConsoA = await store.createBouteille({
  type: 'RECUPERATION', fluide: 'R-410A', etatFluide: 'RECUPERE',
  tareKg: 5, masseBruteKg: 5, contenanceMaxKg: 10, operateur: 'per-fh'
});
const bConsoB = await store.createBouteille({
  type: 'RECUPERATION', fluide: 'R-410A', etatFluide: 'RECUPERE',
  tareKg: 5, masseBruteKg: 5, contenanceMaxKg: 10, operateur: 'per-fh'
});
const recupConso = await store.creerMouvement({
  type: 'RECUPERATION_MAINTENANCE', mode: 'FORMATION',
  machineId: machineR6.id, bouteilleDstId: bConsoA.id,
  peseeAvantKg: 0, peseeApresKg: 0.2, technicien: 'Sophie Bianchi'
});
await store.soumettreMouvement(recupConso.id);
await store.validerMouvement(recupConso.id, 'per-fh');
await store.deciderFluideRecupere(bConsoA.id, 'REUTILISABLE', 'per-fh');
const transfertConso = await store.creerMouvement({
  type: 'TRANSFERT', mode: 'FORMATION', bouteilleSrcId: bConsoA.id,
  bouteilleDstId: bConsoB.id, peseeAvantKg: 0.2, peseeApresKg: 0,
  technicien: 'Sophie Bianchi'
});
await store.soumettreMouvement(transfertConso.id);
await store.validerMouvement(transfertConso.id, 'per-fh');
await store.deciderFluideRecupere(bConsoB.id, 'REUTILISABLE', 'per-fh');
const rechargeConso = await store.creerMouvement({
  type: 'CHARGE_APPOINT', mode: 'FORMATION', machineId: machineR6.id,
  bouteilleSrcId: bConsoB.id, peseeAvantKg: 0.2, peseeApresKg: 0.1,
  technicien: 'Sophie Bianchi'
});
await store.soumettreMouvement(rechargeConso.id);
await store.validerMouvement(rechargeConso.id, 'per-fh');
const pdfConso = await genererCerfaPdf(store,
  { source: 'mouvement', id: rechargeConso.id });
const cR = await relire(pdfConso.octets);
verifier('CM-5 : consolidation (récup → transfert → recharge) → AUCUNE mention à tort',
  !cR.texte('14_Observations').includes('Anomalie de réemploi'),
  `observations = ${cR.texte('14_Observations')}`);

// ============================================================
// 5. Couverture : les 72 champs officiels de SPEC-CERFA sont
//    TOUS traités par le module générateur (aucun oubli possible)
// ============================================================
const CHAMPS_OFFICIELS = [
  'Fiche_no', 'Operateur', 'Attestation_no', 'Detenteur',
  'Equipement_ID', 'Equipement_Fluide', 'Equipement_Charge',
  'Equipement_teqCO2',
  'Case_Assemblage', 'Case_MiseService', 'Case_Modif', 'Case_Maintenance',
  'Case_CtrlPerio', 'Case_CtrlNonPerio', 'Case_Demantel', 'Case_Autre',
  'Autre',
  'Detecteur_ID', 'Controle_Jour', 'Controle_Mois', 'Controle_Annee',
  'Bouton_Oui',
  'Case_HCFC_2', 'Case_HCFC_30', 'Case_HCFC_300',
  'Case_HFC_5', 'Case_HFC_50', 'Case_HFC_500',
  'Case_HFO_1', 'Case_HFO_10', 'Case_HFO_100',
  'Case_Sans_12m', 'Case_Sans_6m', 'Case_Sans_3m',
  'Case_Avec_24m', 'Case_Avec_12m', 'Case_Avec_6m',
  'Case_Fuite_Oui', 'Case_Fuite_Non',
  'Fuite_Loca_1', 'Fuite_Loca_2', 'Fuite_Loca_3',
  'Case_Rep_Fuite1_realisee', 'Case_Rep_Fuite1_AFaire',
  'Case_Rep_Fuite2_realisee', 'Case_Rep_Fuite2_AFaire',
  'Case_Rep_Fuite3_realisee', 'Case_Rep_Fuite3_AFaire',
  '11_Denom', '11_Quantite', '11_QA', '11_QB', '11_QC',
  '11_QD', '11_QE', '11_QDE', '11_Contenant_ID', '11_BSFF',
  'Case_12_UN1078', 'Case_12_Autre140601', 'Autre-FF-NON-inflammable',
  'Case_12_UN3161', 'Case_12_Autre160504', 'Autre-FF-inflammable',
  '13_Instal', '14_Observations',
  'Sign_Operateur_Nom', 'Sign_Operateur_Qualite', 'Sign_Operateur_Date',
  'Sign_Detenteur_Nom', 'Sign_Detenteur_Qualite', 'Sign_Detenteur_Date'
];
verifier('liste de couverture : exactement 72 champs officiels',
  new Set(CHAMPS_OFFICIELS).size === 72,
  `valeur = ${new Set(CHAMPS_OFFICIELS).size}`);

const sourceGenerateur = await readFile(
  fileURLToPath(new URL('./generateur.js', import.meta.url)), 'utf8');
const manquants = CHAMPS_OFFICIELS.filter((nom) =>
  !sourceGenerateur.includes(`'${nom}'`));
verifier('couverture : les 72 noms apparaissent dans generateur.js',
  manquants.length === 0, `manquants : ${manquants.join(', ')}`);

// Contre-vérification : les 72 noms correspondent bien au PDF officiel
{
  const octetsVierge = await readFile(fileURLToPath(
    new URL('../../cerfa_15497-04_officiel.pdf', import.meta.url)));
  const docVierge = await PDFLib.PDFDocument.load(octetsVierge);
  const nomsPdf = docVierge.getForm().getFields().map((ch) => ch.getName());
  verifier('le PDF officiel expose exactement 72 champs',
    nomsPdf.length === 72, `valeur = ${nomsPdf.length}`);
  verifier('les noms du PDF et la liste de couverture coïncident',
    nomsPdf.every((nom) => CHAMPS_OFFICIELS.includes(nom)) &&
    CHAMPS_OFFICIELS.every((nom) => nomsPdf.includes(nom)));
}

// ============================================================
// 6. Unité cadre 7 : cas limites de la table seuil × fréquence
// ============================================================
const hfc = { famille: 'HFC', gwpAr4: 2088 };
verifier('cadre 7 : 300 kg HCFC sans détection → 3 mois',
  JSON.stringify(calculerCadre7({ famille: 'HCFC', gwpAr4: 1810 }, 300, false))
  === JSON.stringify({ caseSeuil: 'Case_HCFC_300',
    caseFrequence: 'Case_Sans_3m', frequenceMois: 3 }));
verifier('cadre 7 : 30 teq HFC avec détection → 24 mois (niveau bas)',
  calculerCadre7(hfc, 30 / 2.088, true).caseFrequence === 'Case_Avec_24m');
verifier('cadre 7 : 60 teq HFC sans détection → 6 mois (niveau moyen)',
  calculerCadre7(hfc, 60 / 2.088, false).caseFrequence === 'Case_Sans_6m');
verifier('cadre 7 : charge sous le seuil → aucune case',
  JSON.stringify(calculerCadre7({ famille: 'HFO', gwpAr4: 1 }, 0.5, false))
  === JSON.stringify({ caseSeuil: null, caseFrequence: null,
    frequenceMois: null }));
verifier('cadre 7 : R-290 (HC) hors périmètre → aucune case',
  calculerCadre7({ famille: 'HC', gwpAr4: 3 }, 50, false).caseSeuil === null);

// ============================================================
// 7. Lot C (C4) — PDF FINAL officiel : fiche SOUMISE + signatures
//    réelles (magasin factice bâti sur la démo, aucun verrou contourné :
//    on teste le GÉNÉRATEUR, le store reste seul juge de la validation)
// ============================================================
const { genererPdfFinalBase64, calculerChampsCerfa } =
  await import('./generateur.js');

// PNG 1×1 valide (nombres magiques réels — le dessin doit aboutir).
const PNG_MINI = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8'
  + 'z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const mouvementsDemo = await store.getMouvements();
const modeleDemo = mouvementsDemo.find((m) => m.id === 'mvt-0005');
const officielSoumis = { ...modeleDemo,
  id: 'mvt-c4', numero: 'FI-2026-9999', mode: 'OFFICIEL', statut: 'SOUMIS' };

const signatureTechnicienPerimee = { role: 'TECHNICIEN', nom: 'Perime',
  prenom: 'Vieux', qualite: 'Élève en formation', parDelegation: false,
  organisation: null, dateHeure: '2026-07-18T08:00:00.000Z',
  declaration: 'Déclaration périmée.', imagePng: PNG_MINI, valide: false };
const signatureTechnicien = { role: 'TECHNICIEN', nom: 'Eleve',
  prenom: 'Un', qualite: 'Élève en formation', parDelegation: false,
  organisation: null, dateHeure: '2026-07-19T09:12:00.000Z',
  declaration: 'Je certifie…', imagePng: PNG_MINI, valide: true };
const signatureDetenteur = { role: 'DETENTEUR', nom: 'Henninot',
  prenom: 'Franck',
  qualite: 'Professeur, par délégation du détenteur (LP Antoine Vidal)',
  parDelegation: true, organisation: 'LP Antoine Vidal',
  dateHeure: '2026-07-19T09:15:00.000Z',
  declaration: 'Je reconnais…', imagePng: PNG_MINI, valide: true };

const storeOfficiel = {
  ...store,
  getMouvements: async () => [...mouvementsDemo, officielSoumis],
  getSignaturesMouvement: async (id) => (id === 'mvt-c4'
    ? [signatureTechnicienPerimee, signatureTechnicien, signatureDetenteur]
    : [])
};

// Non-régression : SANS le canal réservé, une fiche SOUMISE reste refusée.
{
  let message = '';
  try {
    await genererCerfaPdf(storeOfficiel, { source: 'mouvement', id: 'mvt-c4' });
  } catch (erreur) { message = erreur.message; }
  verifier('C4 : une fiche SOUMISE reste refusée hors canal du PDF final',
    message.startsWith('CERFA impossible'), `message = « ${message} »`);
}

// Le PDF final : généré sur la fiche SOUMISE, signatures réelles inscrites.
{
  const base64 = await genererPdfFinalBase64(storeOfficiel, officielSoumis);
  verifier('C4 : PDF final en base64, nombres magiques %PDF',
    typeof base64 === 'string' && base64.startsWith('JVBERi'));
  const relu = await relire(new Uint8Array(Buffer.from(base64, 'base64')));
  verifier('C4 : détenteur = personne PHYSIQUE (jamais la raison sociale seule)',
    relu.texte('Sign_Detenteur_Nom') === 'Franck Henninot',
    `valeur = « ${relu.texte('Sign_Detenteur_Nom')} »`);
  verifier('C4 : qualité du détenteur = la délégation signée',
    relu.texte('Sign_Detenteur_Qualite') ===
    'Professeur, par délégation du détenteur (LP Antoine Vidal)');
  verifier('C4 : date détenteur = date RÉELLE de signature (pas l’intervention)',
    relu.texte('Sign_Detenteur_Date') === '19/07/2026');
  verifier('C4 : opérateur = le signataire technicien VALIDE (le périmé est ignoré)',
    relu.texte('Sign_Operateur_Nom') === 'Un Eleve',
    `valeur = « ${relu.texte('Sign_Operateur_Nom')} »`);
  verifier('C4 : qualité de l’opérateur = celle signée',
    relu.texte('Sign_Operateur_Qualite') === 'Élève en formation');
  verifier('C4 : date opérateur = date réelle de signature',
    relu.texte('Sign_Operateur_Date') === '19/07/2026');
}

// Hors mode Officiel : AUCUN PDF final (la Formation n'en envoie jamais).
{
  const rien = await genererPdfFinalBase64(store, modeleDemo);
  verifier('C4 : hors mode Officiel, genererPdfFinalBase64 rend null',
    rien === null);
}

// Canal du PDF FINAL sans tolérance (revue adversariale C4) : signatures
// incomplètes ou lecture en échec → REFUS, jamais de blocs historiques.
{
  const sansDetenteur = { ...storeOfficiel,
    getSignaturesMouvement: async () =>
      [signatureTechnicienPerimee, signatureTechnicien] };
  let message = '';
  try { await genererPdfFinalBase64(sansDetenteur, officielSoumis); }
  catch (erreur) { message = erreur.message; }
  verifier('C4 : PDF final REFUSÉ sans signature détenteur valide',
    message.startsWith('PDF final impossible'), `message = « ${message} »`);
}
{
  const lectureEnPanne = { ...storeOfficiel,
    getSignaturesMouvement: async () => {
      throw new Error('Panne réseau simulée.');
    } };
  let message = '';
  try { await genererPdfFinalBase64(lectureEnPanne, officielSoumis); }
  catch (erreur) { message = erreur.message; }
  verifier('C4 : PDF final — un raté de lecture des signatures REMONTE '
    + '(jamais de conservation silencieuse des blocs historiques)',
    message === 'Panne réseau simulée.', `message = « ${message} »`);
}

// Chemin de la CORRECTION élève : les signatures réelles sont IGNORÉES —
// les valeurs attendues de l'élève ne changent jamais (revue C4).
{
  const officielValide = { ...officielSoumis, statut: 'VALIDE' };
  const storeValide = { ...storeOfficiel,
    getMouvements: async () => [...mouvementsDemo, officielValide] };
  const avec = await calculerChampsCerfa(storeValide,
    { source: 'mouvement', id: 'mvt-c4' });
  const sans = await calculerChampsCerfa(storeValide,
    { source: 'mouvement', id: 'mvt-c4' }, { sansSignaturesReelles: true });
  verifier('C4 : sansSignaturesReelles → blocs historiques malgré le parcours',
    avec.texte['Sign_Detenteur_Nom'] === 'Franck Henninot'
    && sans.texte['Sign_Detenteur_Nom'] !== 'Franck Henninot'
    && sans.signatureTechnicienPng === null
    && sans.signatureDetenteurPng === null);
}

// Une fiche VALIDÉE du parcours (démo, sans signatures réelles) garde
// les blocs historiques — non-régression des CERFA existants.
{
  const champs = await calculerChampsCerfa(store,
    { source: 'mouvement', id: 'mvt-0005' });
  verifier('C4 : sans signatures réelles, blocs de signature historiques',
    champs.texte['Sign_Detenteur_Nom'] === 'Boulangerie Le Fournil'
    && champs.signatureTechnicienPng === null
    && champs.signatureDetenteurPng === null);
}

// ============================================================
// 8. P7-d — CERFA d'un MOUVEMENT de type CONTROLE (option A) :
//    le contrôle est l'objet de l'écriture — case cadre 4 du bon
//    type, cadre 7 rempli, cadre 10 du résultat, quantités VIDES.
// ============================================================
{
  // Machine dédiée : R-410A 12 kg → 25,06 t éq. CO₂ ⇒ cadre 7 : tranche
  // 5-50 t (Case_HFC_5), fréquence 12 mois sans détection permanente.
  const machineP7 = await store.createMachine({
    designation: 'Vitrine P7-d', fluide: 'R-410A', chargeNominaleKg: 12,
    localisation: 'Atelier P7', operateur: 'Marc Delorme'
  });
  const mvtCtrl = await store.creerMouvement({
    type: 'CONTROLE_PERIODIQUE', mode: 'FORMATION',
    machineId: machineP7.id, technicien: 'Marc Delorme',
    controle: { statutControle: 'CONFORME', detecteurId: 'out-1' }
  });
  await store.soumettreMouvement(mvtCtrl.id);
  await store.validerMouvement(mvtCtrl.id, 'per-fh');

  const pdfCtrl = await genererCerfaPdf(store, {
    source: 'mouvement', id: mvtCtrl.id
  });
  const p7 = await relire(pdfCtrl.octets);
  verifier('P7-d : Fiche_no = numéro FORM- du mouvement CONTROLE',
    pdfCtrl.numero.startsWith('FORM-')
    && p7.texte('Fiche_no') === pdfCtrl.numero);
  verifier('P7-d : cadre 4 — Case_CtrlPerio cochée, les 7 autres décochées',
    p7.coche('Case_CtrlPerio') &&
    ['Case_Assemblage', 'Case_MiseService', 'Case_Modif', 'Case_Maintenance',
      'Case_CtrlNonPerio', 'Case_Demantel', 'Case_Autre']
      .every((c) => !p7.coche(c)));
  verifier('P7-d : cadre 5 — détecteur du contrôle lié renseigné',
    p7.texte('Detecteur_ID').length > 0);
  verifier('P7-d : cadre 7 — seuil 5-50 t (Case_HFC_5) + fréquence 12 mois',
    p7.coche('Case_HFC_5') && p7.coche('Case_Sans_12m'));
  verifier('P7-d : cadre 10 — CONFORME → Case_Fuite_Non seule',
    p7.coche('Case_Fuite_Non') && !p7.coche('Case_Fuite_Oui'));
  verifier('P7-d : cadre 11 — TOUTES les quantités vides (contrôle « sec »)',
    ['11_QA', '11_QB', '11_QC', '11_QD', '11_QE', '11_QDE']
      .every((n) => p7.texte(n) === ''));
  verifier('P7-d : cadre 12 — aucune case transport (pas une récupération)',
    ['Case_12_UN1078', 'Case_12_UN3161', 'Case_12_Autre140601',
      'Case_12_Autre160504'].every((n) => !p7.coche(n)));
  verifier('P7-d : cadre 14 — mention FORMATION présente',
    p7.texte('14_Observations').includes('MODE FORMATION'));
}

// ============================================================
// Lot B carte blanche (13/08, 4e relecture) : la réimpression d'une fiche
// scellée lit le PRP FIGÉ du mouvement — corriger le référentiel ne
// réécrit ni la donnée NI le document. Un mouvement SANS prpFige
// (antérieur au figeage) suit, lui, le référentiel courant (repli).
// ============================================================
{
  const prpAvant = Number(
    (await store.getFluides()).find((f) => f.code === 'R-410A').gwpAr4);

  const validateurB = await store.createPersonne({
    nom: 'Valideur', prenom: 'LotB', typePersonne: 'ENSEIGNANT',
    roleApp: 'REFERENT'
  });
  const machineB = await store.createMachine({
    designation: 'Vitrine lot B (PRP figé)', fluide: 'R-410A',
    chargeNominaleKg: 10, chargeActuelleKg: 0, operateur: 'Testeur lot B'
  });
  const bouteilleB = await store.createBouteille({
    type: 'NEUVE', fluide: 'R-410A', etatFluide: 'VIERGE',
    tareKg: 10, masseBruteKg: 40, contenanceMaxKg: 50, proprietaire: 'Lycée'
  });
  const brouillonB = await store.creerMouvement({
    mode: 'FORMATION', type: 'CHARGE_APPOINT', date: '2026-08-13',
    machineId: machineB.id, bouteilleSrcId: bouteilleB.id,
    fluide: 'R-410A', peseeAvantKg: 40, peseeApresKg: 38,
    causeMouvement: 'Appoint (preuve PRP figé)', technicien: 'Testeur lot B',
    controle: { statutControle: 'SANS_OBJET', detecteurId: null }
  });
  await store.soumettreMouvement(brouillonB.id);
  await store.validerMouvement(brouillonB.id, validateurB.id);
  const mouvementB = (await store.getMouvements())
    .find((mv) => mv.id === brouillonB.id);
  verifier('lot B : la validation a FIGÉ le PRP du jour sur le mouvement',
    Number(mouvementB.prpFige) === prpAvant,
    `prpFige = ${mouvementB.prpFige}, attendu ${prpAvant}`);

  // Le référentiel est « corrigé » APRÈS le scellement (le geste réel de
  // l'écran d'administration des fluides, P1-2).
  const prpCorrige = prpAvant + 1000;
  await store.updateFluide('R-410A',
    { gwpAr4: prpCorrige, sourcePrp: 'Valeur d’essai (preuve lot B)' });

  const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
  const pdfFige = await genererCerfaPdf(store,
    { source: 'mouvement', id: mouvementB.id });
  const lectureFige = await relire(pdfFige.octets);
  verifier('lot B : la fiche scellée réimprime le teqCO2 au PRP FIGÉ, pas au corrigé',
    lectureFige.texte('Equipement_teqCO2') === fmt(10 * prpAvant / 1000),
    `teq imprimé = ${lectureFige.texte('Equipement_teqCO2')}, `
    + `attendu ${fmt(10 * prpAvant / 1000)} (corrigé aurait donné `
    + `${fmt(10 * prpCorrige / 1000)})`);

  // Repli : un mouvement de démonstration SANS prpFige (antérieur au
  // figeage) suit le référentiel COURANT — comportement d'avant, conservé.
  const prpR455 = Number(
    (await store.getFluides()).find((f) => f.code === 'R-455A').gwpAr4);
  await store.updateFluide('R-455A',
    { gwpAr4: prpR455 + 500, sourcePrp: 'Valeur d’essai (preuve lot B)' });
  const pdfRepli = await genererCerfaPdf(store,
    { source: 'mouvement', id: 'mvt-0005' });
  const lectureRepli = await relire(pdfRepli.octets);
  verifier('lot B : un mouvement SANS prpFige suit le référentiel courant (repli)',
    lectureRepli.texte('Equipement_teqCO2') === fmt(3.20 * (prpR455 + 500) / 1000),
    `teq imprimé = ${lectureRepli.texte('Equipement_teqCO2')}`);
  await store.updateFluide('R-455A',
    { gwpAr4: prpR455, sourcePrp: 'Valeur d’essai (preuve lot B, retour)' });
}

// ============================================================
// Bilan
// ============================================================
console.log('');
console.log(`Vérifications : ${nbOk} réussies, ${nbEchecs} en échec.`);
if (nbEchecs > 0) process.exit(1);
console.log('Générateur CERFA : tout est vert.');
