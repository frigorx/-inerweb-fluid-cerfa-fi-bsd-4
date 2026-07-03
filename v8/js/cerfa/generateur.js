// ============================================================
// inerWeb Fluide v8 — générateur CERFA 15497*04 (Phase D)
// Remplit LE PDF OFFICIEL (v8/cerfa_15497-04_officiel.pdf) via
// pdf-lib, conformément à docs/SPEC-CERFA.md (72 champs AcroForm).
// Ce qui s'affiche et s'imprime EST le document officiel rempli :
// aucune reproduction HTML du formulaire.
//
// Fonctionne en NAVIGATEUR (pdf-lib UMD chargé paresseusement par
// balise <script> → window.PDFLib) et sous NODE pour les tests
// (createRequire du fichier UMD).
// ============================================================

/** Cache de la bibliothèque pdf-lib (une seule initialisation). */
let promessePdfLib = null;

/** Cache des octets du PDF officiel vierge (chargé une seule fois). */
let octetsModele = null;

/**
 * Charge pdf-lib paresseusement.
 * — Navigateur : injection unique d'une balise <script> (UMD → window.PDFLib).
 * — Node (tests) : createRequire + require du fichier UMD.
 * @returns {Promise<object>} l'espace de noms PDFLib
 */
export async function chargerPdfLib() {
  if (typeof window === 'undefined') {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    return require('../lib/pdf-lib.min.js');
  }
  if (window.PDFLib) return window.PDFLib;
  if (!promessePdfLib) {
    promessePdfLib = new Promise((resoudre, rejeter) => {
      const balise = document.createElement('script');
      balise.src = new URL('../lib/pdf-lib.min.js', import.meta.url).href;
      balise.onload = resoudre;
      balise.onerror = () =>
        rejeter(new Error('Impossible de charger pdf-lib.'));
      document.head.appendChild(balise);
    });
  }
  await promessePdfLib;
  if (!window.PDFLib) {
    throw new Error('pdf-lib chargé mais introuvable (window.PDFLib).');
  }
  return window.PDFLib;
}

/** Charge les octets du PDF officiel vierge (fetch ou lecture disque). */
async function chargerModele() {
  if (octetsModele) return octetsModele;
  const url = new URL('../../cerfa_15497-04_officiel.pdf', import.meta.url);
  if (typeof window === 'undefined') {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    octetsModele = new Uint8Array(await readFile(fileURLToPath(url)));
  } else {
    const reponse = await fetch(url.href);
    if (!reponse.ok) {
      throw new Error('Impossible de charger le PDF CERFA officiel.');
    }
    octetsModele = new Uint8Array(await reponse.arrayBuffer());
  }
  return octetsModele;
}

// ------------------------------------------------------------
// Tables de correspondance UNIQUES (SPEC-CERFA, cadre 4)
// ------------------------------------------------------------

/** Type d'intervention v8 → case à cocher du cadre 4. */
const TYPE_VERS_CASE = {
  CHARGE_APPOINT: 'Case_Maintenance',
  MISE_EN_SERVICE: 'Case_MiseService',
  RECUPERATION_MAINTENANCE: 'Case_Maintenance',
  RECUPERATION_DEMANTELEMENT: 'Case_Demantel',
  TRANSFERT: 'Case_Maintenance',
  ASSEMBLAGE: 'Case_Assemblage',
  MODIFICATION: 'Case_Modif',
  CONTROLE_PERIODIQUE: 'Case_CtrlPerio',
  CONTROLE_NON_PERIODIQUE: 'Case_CtrlNonPerio',
  AUTRE: 'Case_Autre'
};

/** Mention obligatoire du cadre 14 en mode formation. */
const MENTION_FORMATION = 'MODE FORMATION — DOCUMENT NON OFFICIEL — ' +
  'NE PAS UTILISER POUR UNE INTERVENTION RÉELLE';

// ------------------------------------------------------------
// Petits formatages locaux (indépendants du fuseau horaire)
// ------------------------------------------------------------

/** Nombre en notation française à 2 décimales : 3.2 → « 3,20 ». */
function fmtVirgule(n, dec = 2) {
  const valeur = Number(n);
  if (!Number.isFinite(valeur)) return '';
  return valeur.toFixed(dec).replace('.', ',');
}

/** Date ISO « AAAA-MM-JJ » → « JJ/MM/AAAA » (sans objet Date). */
function fmtDateFr(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [annee, mois, jour] = iso.slice(0, 10).split('-');
  return `${jour}/${mois}/${annee}`;
}

/** Code fluide sans le préfixe « R- » : « R-455A » → « 455A ». */
function sansPrefixeR(code) {
  return String(code || '').replace(/^R-?/, '');
}

// ------------------------------------------------------------
// Cadre 7 — seuil de charge et fréquence de contrôle
// (logique EXACTE de SPEC-CERFA : HCFC en kg, HFC/PFC en t éq.
// CO₂, HFO en kg ; fréquence croisée avec la détection permanente)
// ------------------------------------------------------------

/**
 * Détermine la case de seuil et la case de fréquence du cadre 7.
 * @param {object|null} fluideRef - fiche du référentiel fluides
 * @param {number} chargeKg - charge de fluide de l'équipement (kg)
 * @param {boolean} detectionPermanente - cadre 6
 * @returns {{caseSeuil: string|null, caseFrequence: string|null,
 *            frequenceMois: number|null}}
 */
export function calculerCadre7(fluideRef, chargeKg, detectionPermanente) {
  const famille = String(fluideRef?.famille || '').toUpperCase();
  const charge = Number(chargeKg) || 0;
  let caseSeuil = null;
  let niveau = null; // 1 = bas, 2 = moyen, 3 = haut

  if (famille.includes('HFO')) {
    // HFO (et mélanges contenant un HFO) : seuils en kilogrammes
    if (charge >= 100) { caseSeuil = 'Case_HFO_100'; niveau = 3; }
    else if (charge >= 10) { caseSeuil = 'Case_HFO_10'; niveau = 2; }
    else if (charge >= 1) { caseSeuil = 'Case_HFO_1'; niveau = 1; }
  } else if (famille.includes('HCFC')) {
    // HCFC : seuils en kilogrammes
    if (charge >= 300) { caseSeuil = 'Case_HCFC_300'; niveau = 3; }
    else if (charge >= 30) { caseSeuil = 'Case_HCFC_30'; niveau = 2; }
    else if (charge >= 2) { caseSeuil = 'Case_HCFC_2'; niveau = 1; }
  } else if (famille.includes('HFC') || famille.includes('PFC')) {
    // HFC / PFC : seuils en tonnes équivalent CO₂
    const teq = charge * (Number(fluideRef?.gwpAr4) || 0) / 1000;
    if (teq >= 500) { caseSeuil = 'Case_HFC_500'; niveau = 3; }
    else if (teq >= 50) { caseSeuil = 'Case_HFC_50'; niveau = 2; }
    else if (teq >= 5) { caseSeuil = 'Case_HFC_5'; niveau = 1; }
  }
  // Autres familles (CO₂, HC…) : hors périmètre F-Gas, aucune case

  let caseFrequence = null;
  let frequenceMois = null;
  if (niveau === 1) {
    caseFrequence = detectionPermanente ? 'Case_Avec_24m' : 'Case_Sans_12m';
    frequenceMois = detectionPermanente ? 24 : 12;
  } else if (niveau === 2) {
    caseFrequence = detectionPermanente ? 'Case_Avec_12m' : 'Case_Sans_6m';
    frequenceMois = detectionPermanente ? 12 : 6;
  } else if (niveau === 3) {
    caseFrequence = detectionPermanente ? 'Case_Avec_6m' : 'Case_Sans_3m';
    frequenceMois = detectionPermanente ? 6 : 3;
  }
  return { caseSeuil, caseFrequence, frequenceMois };
}

// ------------------------------------------------------------
// Assemblage des données depuis le store
// ------------------------------------------------------------

/** Retrouve une personne du registre du personnel par son nom complet. */
function trouverPersonneParNom(personnel, nomComplet) {
  if (!nomComplet) return null;
  const cherche = String(nomComplet).trim().toLowerCase();
  return personnel.find((p) =>
    `${p.prenom} ${p.nom}`.trim().toLowerCase() === cherche) || null;
}

/**
 * Rassemble tout le contexte nécessaire au remplissage du CERFA.
 * @param {object} store - magasin de données v8
 * @param {{source: 'mouvement'|'controle', id: string}} cible
 */
async function assemblerContexte(store, { source, id }) {
  const [etablissement, machines, bouteilles, controles, fluides,
    personnel, clients, outillage, bsffListe] = await Promise.all([
    store.getEtablissement(),
    store.getMachines(),
    store.getBouteilles(),
    store.getControles(),
    store.getFluides(),
    store.getPersonnel(),
    store.getClients(),
    store.getOutillage(),
    store.getBsff()
  ]);

  const contexte = {
    etablissement, machines, bouteilles, controles, fluides,
    personnel, clients, outillage, bsffListe,
    numero: null,
    mode: 'OFFICIEL',
    typeIntervention: null,
    date: null,
    machine: null,
    bouteilleSrc: null,
    bouteilleDst: null,
    quantiteKg: null,
    // Résultat du contrôle d'étanchéité lié (cadre 10)
    resultatControle: null,      // 'CONFORME' | 'FUITE' | null
    localisationFuite: null,
    reparationImmediate: null,
    detecteur: null,             // outil DETECTEUR lié (cadre 5)
    operateurNom: null,
    signatureDataUrl: null,
    observations: []
  };

  if (source === 'mouvement') {
    const mouvement = (await store.getMouvements()).find((mv) => mv.id === id);
    if (!mouvement) throw new Error(`Mouvement introuvable : ${id}.`);
    if (mouvement.statut !== 'VALIDE' && mouvement.statut !== 'ANNULE') {
      throw new Error(
        'CERFA impossible : seul un mouvement validé (ou annulé) est ' +
        'inscrit au registre.');
    }
    // SPEC §7.1 (IM-12) : un TRANSFERT bouteille → bouteille est une
    // opération interne au stock, tracée au registre — jamais un CERFA.
    if (mouvement.type === 'TRANSFERT') {
      throw new Error(
        'Un transfert entre contenants ne donne pas lieu à une fiche ' +
        'd’intervention machine : consultez le registre des mouvements.');
    }
    contexte.numero = mouvement.numero;
    contexte.mode = mouvement.mode ?? 'OFFICIEL';
    contexte.typeIntervention = mouvement.type;
    contexte.date = mouvement.date;
    contexte.machine =
      machines.find((m) => m.id === mouvement.machineId) || null;
    contexte.bouteilleSrc =
      bouteilles.find((b) => b.id === mouvement.bouteilleSrcId) || null;
    contexte.bouteilleDst =
      bouteilles.find((b) => b.id === mouvement.bouteilleDstId) || null;
    contexte.quantiteKg = mouvement.quantiteKg;
    contexte.operateurNom = mouvement.technicien ?? null;
    contexte.signatureDataUrl = mouvement.signatureDataUrl ?? null;
    if (mouvement.causeMouvement) {
      // IM-14 : la cause saisie est reportée au cadre 14 (observations)
      contexte.observations.push(`Cause : ${String(mouvement.causeMouvement)}`);
    }
    if (mouvement.statut === 'ANNULE') {
      contexte.observations.push(
        'Écriture annulée par contre-écriture (registre).');
    }

    // Contrôle d'étanchéité lié : champ mouvement.controle en priorité,
    // sinon recoupement avec un contrôle du registre (même machine,
    // même date) — cas des données de démonstration.
    const lie = mouvement.controle || {};
    const duRegistre = controles.find((c) =>
      c.machineId === mouvement.machineId && c.date === mouvement.date) || null;
    if (lie.statutControle === 'CONFORME' || lie.statutControle === 'FUITE') {
      contexte.resultatControle = lie.statutControle;
    } else if (duRegistre) {
      contexte.resultatControle = duRegistre.resultat;
    }
    contexte.localisationFuite = duRegistre?.localisationFuite ?? null;
    contexte.reparationImmediate = duRegistre
      ? Boolean(duRegistre.reparationImmediate)
      : false;
    const detecteurId = lie.detecteurId ?? duRegistre?.detecteurId ?? null;
    contexte.detecteur =
      outillage.find((o) => o.id === detecteurId) || null;

  } else if (source === 'controle') {
    const controle = controles.find((c) => c.id === id);
    if (!controle) throw new Error(`Contrôle introuvable : ${id}.`);
    contexte.numero = controle.numero ?? controle.id;
    contexte.mode = controle.mode ?? 'OFFICIEL';
    contexte.typeIntervention = controle.typeControle === 'NON_PERIODIQUE'
      ? 'CONTROLE_NON_PERIODIQUE'
      : 'CONTROLE_PERIODIQUE';
    contexte.date = controle.date;
    contexte.machine =
      machines.find((m) => m.id === controle.machineId) || null;
    contexte.resultatControle = controle.resultat ?? null;
    contexte.localisationFuite = controle.localisationFuite ?? null;
    contexte.reparationImmediate = Boolean(controle.reparationImmediate);
    contexte.detecteur =
      outillage.find((o) => o.id === controle.detecteurId) || null;
    contexte.operateurNom = controle.operateur ?? null;
    contexte.observations.push(
      `Contrôle d'étanchéité ${controle.typeControle === 'NON_PERIODIQUE'
        ? 'non périodique' : 'périodique'} — méthode ${String(
        controle.methode || 'directe').toLowerCase()}.`);

  } else {
    throw new Error(`Source de CERFA inconnue : ${source}.`);
  }

  return contexte;
}

// ------------------------------------------------------------
// Génération du PDF rempli
// ------------------------------------------------------------

/**
 * Génère le CERFA 15497*04 officiel rempli.
 * @param {object} store - magasin de données v8
 * @param {{source: 'mouvement'|'controle', id: string}} cible
 * @returns {Promise<{octets: Uint8Array, nomFichier: string, numero: string}>}
 */
export async function genererCerfaPdf(store, { source, id }) {
  const PDFLib = await chargerPdfLib();
  const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;

  const ctx = await assemblerContexte(store, { source, id });
  const doc = await PDFDocument.load(await chargerModele());
  const form = doc.getForm();
  const page = doc.getPages()[0];
  const police = await doc.embedFont(StandardFonts.Helvetica);

  const machine = ctx.machine;
  const client = machine?.clientId
    ? ctx.clients.find((c) => c.id === machine.clientId) || null
    : null;
  const fluideCode = machine?.fluide ?? ctx.bouteilleSrc?.fluide ?? null;
  const fluideRef = ctx.fluides.find((f) => f.code === fluideCode) || null;
  const formation = ctx.mode === 'FORMATION';

  // ---- Cadre 1 — opérateur (établissement, multiligne) ----
  const operateurTexte = [
    ctx.etablissement.raisonSociale,
    ctx.etablissement.adresse,
    ctx.etablissement.siret ? `SIRET : ${ctx.etablissement.siret}` : ''
  ].filter(Boolean).join('\n');

  // ---- Cadre 2 — détenteur (client de la machine, sinon établissement) ----
  const detenteur = client || {
    raisonSociale: ctx.etablissement.raisonSociale,
    adresse: ctx.etablissement.adresse,
    siret: ctx.etablissement.siret
  };
  const detenteurTexte = [
    detenteur.raisonSociale,
    detenteur.adresse,
    detenteur.siret ? `SIRET : ${detenteur.siret}` : ''
  ].filter(Boolean).join('\n');

  // ---- Cadre 3 — équipement (multiligne) ----
  const equipementTexte = machine ? [
    `${machine.code} — ${machine.designation}`,
    [machine.marque, machine.modele].filter(Boolean).join(' '),
    machine.numSerie ? `N° série : ${machine.numSerie}` : ''
  ].filter(Boolean).join('\n') : '';
  const chargeNominale = Number(machine?.chargeNominaleKg);
  const teqNominale = Number.isFinite(chargeNominale) && fluideRef
    ? chargeNominale * (Number(fluideRef.gwpAr4) || 0) / 1000
    : null;

  // ---- Cadre 4 — nature de l'intervention (table unique) ----
  const caseIntervention = TYPE_VERS_CASE[ctx.typeIntervention] ?? null;

  // ---- Cadre 5 — détecteur manuel de fuite ----
  const detecteur = ctx.detecteur;
  const detecteurTexte = detecteur ? [
    [detecteur.marque, detecteur.modele].filter(Boolean).join(' '),
    detecteur.numSerie ? `n° ${detecteur.numSerie}` : ''
  ].filter(Boolean).join(' — ') : '';
  const etalonnage = detecteur?.dateEtalonnage ?? null;
  const [etalAnnee, etalMois, etalJour] =
    etalonnage && /^\d{4}-\d{2}-\d{2}/.test(etalonnage)
      ? etalonnage.slice(0, 10).split('-')
      : [null, null, null];

  // ---- Cadre 7 — seuil et fréquence (charge de fluide EN machine) ----
  const cadre7 = machine
    ? calculerCadre7(fluideRef, machine.chargeActuelleKg,
        Boolean(machine.detectionPermanente))
    : { caseSeuil: null, caseFrequence: null, frequenceMois: null };

  // ---- Cadre 10 — résultat du contrôle d'étanchéité ----
  const fuite = ctx.resultatControle === 'FUITE';
  const conforme = ctx.resultatControle === 'CONFORME';

  // ---- Cadre 11 — quantités de fluide ----
  const estCharge = ctx.typeIntervention === 'CHARGE_APPOINT' ||
    ctx.typeIntervention === 'MISE_EN_SERVICE';
  const estRecuperation =
    ctx.typeIntervention === 'RECUPERATION_MAINTENANCE' ||
    ctx.typeIntervention === 'RECUPERATION_DEMANTELEMENT';
  const quantite = Number.isFinite(Number(ctx.quantiteKg))
    ? Math.abs(Number(ctx.quantiteKg))
    : null;

  let qA = '', qB = '', qC = '', qD = '', qE = '', qDE = '';
  let contenant = null;
  let bsffLie = null;
  let versDechet = false;
  if (estCharge && quantite !== null) {
    // Ventilation selon l'état du fluide de la bouteille SOURCE
    const etat = ctx.bouteilleSrc?.etatFluide ?? 'VIERGE';
    if (etat === 'RECYCLE') qB = fmtVirgule(quantite);
    else if (etat === 'REGENERE') qC = fmtVirgule(quantite);
    else qA = fmtVirgule(quantite);
    contenant = ctx.bouteilleSrc;
  } else if (estRecuperation && quantite !== null) {
    // Destination déchet : décision de la chaîne déchets ou BSFF lié
    const dst = ctx.bouteilleDst;
    bsffLie = dst
      ? ctx.bsffListe.find((b) => b.bouteilleId === dst.id ||
          (dst.numBsff && b.numeroBsff === dst.numBsff)) || null
      : null;
    versDechet = Boolean(dst && (dst.decisionFluide === 'DECHET' ||
      dst.statut === 'DECHET' || dst.numBsff || bsffLie));
    if (versDechet) qD = fmtVirgule(quantite);
    else qE = fmtVirgule(quantite);
    qDE = fmtVirgule(quantite);
    contenant = dst;
  }

  // ---- Cadre 12 — transport (récupérations UNIQUEMENT) ----
  const classeSecurite = String(fluideRef?.classeSecurite || '').toUpperCase();
  const transportNonInflammable = estRecuperation && classeSecurite === 'A1';
  const transportInflammable = estRecuperation &&
    ['A2L', 'A2', 'A3'].includes(classeSecurite);
  // IM-13 : fluide récupéré parti en DÉCHET → la ligne « autre déchet »
  // du cadre 12 est cochée, avec le code déchet européen dans le champ
  // texte (14 06 01 non inflammable, 16 05 04 inflammable — SPEC-CERFA).
  const dechetNonInflammable = transportNonInflammable && versDechet;
  const dechetInflammable = transportInflammable && versDechet;

  // ---- Cadre 13 — installation de destination (BSFF) ----
  const installationTexte = bsffLie ? [
    bsffLie.installationDestination,
    bsffLie.transporteur ? `Transporteur : ${bsffLie.transporteur}` : ''
  ].filter(Boolean).join('\n') : '';

  // ---- Cadre 14 — observations (+ mention formation) ----
  const observations = [...ctx.observations];
  if (formation) observations.push(MENTION_FORMATION);

  // ---- Signatures ----
  const personne = trouverPersonneParNom(ctx.personnel, ctx.operateurNom);
  const qualiteOperateur = ctx.operateurNom
    ? (personne && personne.numAttestationAptitude
        ? 'Titulaire attestation d’aptitude'
        : 'Élève en formation')
    : '';
  const dateFr = fmtDateFr(ctx.date);

  // ==========================================================
  // Remplissage : les 72 champs officiels sont TOUS traités
  // (texte « » = volontairement vide, case décochée = volontaire).
  // ==========================================================

  const champsTexte = {
    // En-tête
    'Fiche_no': ctx.numero ?? '',
    // Cadre 1 — opérateur
    'Operateur': operateurTexte,
    'Attestation_no': ctx.etablissement.numAttestationCapacite ?? '',
    // Cadre 2 — détenteur
    'Detenteur': detenteurTexte,
    // Cadre 3 — équipement
    'Equipement_ID': equipementTexte,
    'Equipement_Fluide': sansPrefixeR(fluideCode),
    'Equipement_Charge': Number.isFinite(chargeNominale)
      ? fmtVirgule(chargeNominale) : '',
    'Equipement_teqCO2': teqNominale !== null ? fmtVirgule(teqNominale) : '',
    // Cadre 4 — champ libre « Autre »
    'Autre': ctx.typeIntervention === 'AUTRE' ? 'Voir observations' : '',
    // Cadre 5 — détecteur manuel
    'Detecteur_ID': detecteurTexte,
    'Controle_Jour': etalJour ?? '',
    'Controle_Mois': etalMois ?? '',
    'Controle_Annee': etalAnnee ?? '',
    // Cadre 10 — localisation des fuites (une seule ligne alimentée)
    'Fuite_Loca_1': fuite ? (ctx.localisationFuite ?? '') : '',
    'Fuite_Loca_2': '',
    'Fuite_Loca_3': '',
    // Cadre 11 — quantités
    '11_Denom': fluideCode ?? '',
    '11_Quantite': Number.isFinite(chargeNominale)
      ? fmtVirgule(chargeNominale) : '',
    '11_QA': qA,
    '11_QB': qB,
    '11_QC': qC,
    '11_QD': qD,
    '11_QE': qE,
    '11_QDE': qDE,
    '11_Contenant_ID': contenant
      ? (contenant.numeroReel ?? contenant.code ?? '')
      : '',
    '11_BSFF': bsffLie?.numeroBsff ?? ctx.bouteilleDst?.numBsff ?? '',
    // Cadre 12 — champs libres transport (codes déchets européens)
    'Autre-FF-NON-inflammable': dechetNonInflammable
      ? 'Fluide frigorigène usagé — code déchet 14 06 01' : '',
    'Autre-FF-inflammable': dechetInflammable
      ? 'Fluide frigorigène usagé — code déchet 16 05 04' : '',
    // Cadre 13 — installation de destination
    '13_Instal': installationTexte,
    // Cadre 14 — observations
    '14_Observations': observations.join('\n'),
    // Signatures
    'Sign_Operateur_Nom': ctx.operateurNom ?? '',
    'Sign_Operateur_Qualite': qualiteOperateur,
    'Sign_Operateur_Date': ctx.operateurNom ? dateFr : '',
    'Sign_Detenteur_Nom': detenteur.raisonSociale ?? '',
    'Sign_Detenteur_Qualite': 'Détenteur de l’équipement',
    'Sign_Detenteur_Date': dateFr
  };

  const cases = {
    // Cadre 4 — nature de l'intervention (une seule case)
    'Case_Assemblage': caseIntervention === 'Case_Assemblage',
    'Case_MiseService': caseIntervention === 'Case_MiseService',
    'Case_Modif': caseIntervention === 'Case_Modif',
    'Case_Maintenance': caseIntervention === 'Case_Maintenance',
    'Case_CtrlPerio': caseIntervention === 'Case_CtrlPerio',
    'Case_CtrlNonPerio': caseIntervention === 'Case_CtrlNonPerio',
    'Case_Demantel': caseIntervention === 'Case_Demantel',
    'Case_Autre': caseIntervention === 'Case_Autre',
    // Cadre 7 — seuils
    'Case_HCFC_2': cadre7.caseSeuil === 'Case_HCFC_2',
    'Case_HCFC_30': cadre7.caseSeuil === 'Case_HCFC_30',
    'Case_HCFC_300': cadre7.caseSeuil === 'Case_HCFC_300',
    'Case_HFC_5': cadre7.caseSeuil === 'Case_HFC_5',
    'Case_HFC_50': cadre7.caseSeuil === 'Case_HFC_50',
    'Case_HFC_500': cadre7.caseSeuil === 'Case_HFC_500',
    'Case_HFO_1': cadre7.caseSeuil === 'Case_HFO_1',
    'Case_HFO_10': cadre7.caseSeuil === 'Case_HFO_10',
    'Case_HFO_100': cadre7.caseSeuil === 'Case_HFO_100',
    // Cadre 7 — fréquences
    'Case_Sans_12m': cadre7.caseFrequence === 'Case_Sans_12m',
    'Case_Sans_6m': cadre7.caseFrequence === 'Case_Sans_6m',
    'Case_Sans_3m': cadre7.caseFrequence === 'Case_Sans_3m',
    'Case_Avec_24m': cadre7.caseFrequence === 'Case_Avec_24m',
    'Case_Avec_12m': cadre7.caseFrequence === 'Case_Avec_12m',
    'Case_Avec_6m': cadre7.caseFrequence === 'Case_Avec_6m',
    // Cadre 10 — résultat du contrôle
    'Case_Fuite_Oui': fuite,
    'Case_Fuite_Non': conforme,
    'Case_Rep_Fuite1_realisee': fuite && ctx.reparationImmediate === true,
    'Case_Rep_Fuite1_AFaire': fuite && ctx.reparationImmediate !== true,
    'Case_Rep_Fuite2_realisee': false,
    'Case_Rep_Fuite2_AFaire': false,
    'Case_Rep_Fuite3_realisee': false,
    'Case_Rep_Fuite3_AFaire': false,
    // Cadre 12 — transport du fluide récupéré
    'Case_12_UN1078': transportNonInflammable,
    'Case_12_UN3161': transportInflammable,
    'Case_12_Autre140601': dechetNonInflammable,
    'Case_12_Autre160504': dechetInflammable
  };

  for (const [nom, valeur] of Object.entries(champsTexte)) {
    form.getTextField(nom).setText(valeur || '');
  }
  for (const [nom, coche] of Object.entries(cases)) {
    const champ = form.getCheckBox(nom);
    if (coche) champ.check();
    else champ.uncheck();
  }
  // Cadre 6 — détection permanente : radio « 1 » = Oui, « 2 » = Non
  if (machine) {
    form.getRadioGroup('Bouton_Oui')
      .select(machine.detectionPermanente ? '1' : '2');
  }

  // ---- Signature manuscrite (image PNG) sur la zone opérateur ----
  if (ctx.signatureDataUrl) {
    try {
      const image = await doc.embedPng(ctx.signatureDataUrl);
      const gabarit = form.getTextField('Sign_Operateur_Date')
        .acroField.getWidgets()[0].getRectangle();
      const hauteur = 30;
      const largeur = Math.min(
        hauteur * (image.width / image.height), 130);
      page.drawImage(image, {
        x: gabarit.x,
        y: gabarit.y - hauteur - 4,
        width: largeur,
        height: hauteur
      });
    } catch {
      // Signature illisible ou zone introuvable : le CERFA reste valide
    }
  }

  // ---- Filigrane diagonal en mode FORMATION ----
  if (formation) {
    page.drawText('MODE FORMATION', {
      x: 130,
      y: 170,
      size: 64,
      font: police,
      color: rgb(0.35, 0.4, 0.5),
      opacity: 0.14,
      rotate: degrees(45)
    });
  }

  form.updateFieldAppearances(police);
  // objectsPerTick: Infinity → sauvegarde d'un seul bloc, sans minuteries
  // intermédiaires : les onglets en arrière-plan (minuteries bridées par le
  // navigateur) ne gèlent plus la génération (constaté sur le CERFA : le
  // save() par défaut avance par lots espacés de setTimeout).
  const octets = await doc.save({ objectsPerTick: Infinity });
  return {
    octets,
    nomFichier: `cerfa-15497-04_${ctx.numero}.pdf`,
    numero: ctx.numero
  };
}
