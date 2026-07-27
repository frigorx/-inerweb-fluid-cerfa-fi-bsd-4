// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// LE JUSTIFICATIF DE RÉGULARISATION — la pièce qui REMPLACE le CERFA
// d'une contre-écriture (lot 1, branche A — décision du propriétaire du
// 27/07/2026, docs/PLAN-LOT1-CONTRE-ECRITURE.md § 3).
// Exécution : node v8/js/documents/test-justificatif-regularisation.mjs [demo|local]
//
// CE QUE CETTE SUITE PROUVE.
//  1. Le document porte les HUIT faits exigés par le plan : numéro
//     d'écriture interne, date, auteur, motif en toutes lettres, numéro
//     ET date de la fiche annulée, masse AVEC SON SIGNE, matériel,
//     empreinte scellée, mention de mode.
//  2. ⚠️ LA MENTION DE MODE EST DANS LE DOCUMENT, PAS AUTOUR — et elle
//     survit à l'impression. C'est LE piège de ce lot : le dépôt tient un
//     inventaire NOMINATIF des documents qui sortent sans marque de
//     non-officialité (LIMITE-DE-RESPONSABILITE.md + trois pièces qui le
//     reprennent, plus une suite qui les compte). Un document neuf qui
//     sortirait sans marque deviendrait le suivant de la liste. Le badge
//     de mode de l'application, lui, disparaît à l'impression
//     (v8/css/coquille.css masque #entete) et la modale d'aperçu masque
//     tout ce qui n'est pas le document : une mention posée « à côté » ne
//     serait pas sur le papier. La section 3 le tire dans les deux sens.
//  3. Le document NE RESSEMBLE PAS À UN CERFA : aucun champ de
//     formulaire, aucune reprise de la maquette officielle, aucun numéro
//     présenté comme réglementaire. « Deux pièces qui ne se ressemblent
//     pas », c'est tout le point de la décision.
//  4. La masse est portée AVEC SON SIGNE et la case n'est JAMAIS vide.
//     Précédent maison : une garde a fait DISPARAÎTRE d'une déclaration
//     officielle des masses réellement détruites. Le doute retire un
//     allègement, jamais une masse.
//  5. L'auteur vient de la FICHE VIVANTE, jamais du champ figé — sinon
//     une personne mise AU COFFRE DES IDENTITÉS serait re-nommée en clair
//     dans le dossier scellé, à côté d'un `mouvements.csv` qui la
//     pseudonymise.
//  6. Le DOSSIER D'AUDIT scellé reste COMPLET : le CERFA de la
//     contre-écriture n'est pas retiré, il est REMPLACÉ, et le sommaire
//     le dit.
//
// Suite DOUBLÉE au lanceur (demo puis local) : le document lit un store.
// ÉCRIT dans le store cible — base JETABLE en local (harnais).
// ============================================================

import {
  estContreEcriture, construireJustificatif, assemblerJustificatif,
  gabaritJustificatif, justificatifHtmlAutonome,
  CSS_JUSTIFICATIF, CSS_IMPRESSION_APERCU,
  TITRE_JUSTIFICATIF, MENTION_PAS_UNE_FICHE_CERFA, MENTION_SANS_SIGNATURE,
  MSG_PAS_UNE_CONTRE_ECRITURE, LIGNE_SOMMAIRE_REGULARISATIONS
} from './regularisation.js';
import { MENTION_FORMATION } from '../cerfa/generateur.js';
import { genererDossierAudit } from './dossier-audit.js';

const NOM_STORE = process.argv[2] ?? 'demo';

async function fabriquerStore(nom) {
  switch (nom) {
    case 'demo': {
      const { creerStore } = await import('../data/datastore.js');
      return creerStore();
    }
    case 'local': {
      const { creerStoreDeTest } =
        await import('../../../server/harnais-contrat.mjs');
      return creerStoreDeTest();
    }
    default:
      console.error(`Store inconnu : « ${nom} » (demo ou local).`);
      process.exit(2);
  }
}

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

async function verifierRejet(libelle, promesse, fragment) {
  try {
    await promesse;
    verifier(libelle, false, 'aucune erreur levée');
  } catch (erreur) {
    const message = erreur && erreur.message ? erreur.message : String(erreur);
    verifier(libelle, message.includes(fragment), `message = « ${message} »`);
  }
}

/** Relit un ZIP « stored » : liste { nom, octets } (même lecteur que
 *  test-dossier-audit.mjs — on relit le fichier RÉELLEMENT produit). */
function lireZip(zip) {
  const vue = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const entrees = [];
  let position = 0;
  while (position + 4 <= zip.length &&
         vue.getUint32(position, true) === 0x04034b50) {
    const tailleContenu = vue.getUint32(position + 18, true);
    const tailleNom = vue.getUint16(position + 26, true);
    const tailleExtra = vue.getUint16(position + 28, true);
    const nom = new TextDecoder().decode(
      zip.subarray(position + 30, position + 30 + tailleNom));
    const debut = position + 30 + tailleNom + tailleExtra;
    entrees.push({ nom, octets: zip.subarray(debut, debut + tailleContenu) });
    position = debut + tailleContenu;
  }
  return entrees;
}

// ============================================================
// Décor
// ============================================================
const store = await fabriquerStore(NOM_STORE);
if (store.init) await store.init();
console.log(`\n— Justificatif de régularisation, store « ${NOM_STORE} » —`);

await store.updateEtablissement({
  raisonSociale: 'Lycée d’essai Lot1A', adresse: '1 rue du Banc, Marseille',
  siret: '12345678900011', numAttestationCapacite: 'AC-13-000001'
});

const validateur = await store.createPersonne({
  nom: 'Delaunay', prenom: 'Régis', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
const machine = await store.createMachine({
  designation: 'Vitrine Lot1A', fluide: 'R-410A',
  chargeNominaleKg: 10, chargeActuelleKg: 0, operateur: 'Testeur Lot1A'
});
const bouteille = await store.createBouteille({
  type: 'NEUVE', fluide: 'R-410A', etatFluide: 'VIERGE',
  tareKg: 10, masseBruteKg: 40, contenanceMaxKg: 50, proprietaire: 'Lycée'
});

const brouillon = await store.creerMouvement({
  mode: 'FORMATION', type: 'CHARGE_APPOINT', date: '2026-07-27',
  machineId: machine.id, bouteilleSrcId: bouteille.id, fluide: 'R-410A',
  peseeAvantKg: 40, peseeApresKg: 39.5,
  causeMouvement: 'Appoint après réparation', technicien: 'Régis Delaunay',
  controle: { statutControle: 'SANS_OBJET', detecteurId: null }
});
await store.soumettreMouvement(brouillon.id);
await store.validerMouvement(brouillon.id, validateur.id);
const charge = (await store.getMouvements())
  .find((mv) => mv.id === brouillon.id);

const MOTIF = 'Bouteille source erronée à la saisie — appoint jamais réalisé';
const contre = await store.annulerParContreEcriture(
  charge.id, MOTIF, validateur.id);

const faits = await construireJustificatif(store, contre.id);
const document = gabaritJustificatif(faits);
const page = justificatifHtmlAutonome(faits);

// ============================================================
// 1. LES HUIT FAITS EXIGÉS PAR LE PLAN
// ============================================================
console.log('\n--- 1. Le document porte les huit faits exigés ---');

verifier('① le NUMÉRO D’ÉCRITURE INTERNE de la contre-écriture',
  document.includes(contre.numero), `numéro = ${contre.numero}`);
verifier('… et il est libellé « INTERNE », jamais comme un n° réglementaire',
  document.includes('Numéro d’écriture INTERNE au registre'));
verifier('② la DATE de l’écriture d’annulation',
  document.includes('27/07/2026') && faits.date === contre.date);
verifier('② l’AUTEUR de l’écriture',
  document.includes('Régis Delaunay') && faits.auteur === 'Régis Delaunay',
  `auteur = ${faits.auteur}`);
verifier('③ le MOTIF, en toutes lettres',
  document.includes(MOTIF) && faits.motif === MOTIF);
verifier('④ le NUMÉRO de la fiche annulée',
  document.includes(charge.numero) && faits.numeroAnnule === charge.numero);
verifier('④ la DATE de la fiche annulée',
  faits.dateAnnulee === charge.date && document.includes('27/07/2026'));
verifier('④ le N° de fiche CERFA annulé, quand il existe',
  faits.cerfaAnnule === charge.cerfaNumero
  && document.includes(String(charge.cerfaNumero)),
  `cerfaAnnule = ${faits.cerfaAnnule}`);
verifier('⑥ la MACHINE concernée',
  document.includes('Vitrine Lot1A'));
verifier('⑥ le FLUIDE concerné',
  document.includes('R-410A') && faits.fluideCode === 'R-410A');
verifier('⑥ la BOUTEILLE concernée',
  Boolean(faits.bouteilleSrc) && document.includes(bouteille.code),
  `contenant source = ${faits.bouteilleSrc}`);
verifier('⑦ l’EMPREINTE scellée de l’écriture',
  typeof faits.empreinte === 'string' && faits.empreinte.length === 64
  && document.includes(faits.empreinte),
  `empreinte = ${faits.empreinte}`);
verifier('⑦ … et le document dit ce qu’elle prouve',
  document.includes('fabriqué après coup'));

// ============================================================
// 2. LA MASSE, AVEC SON SIGNE, ET JAMAIS DE CASE VIDE
// ============================================================
console.log('\n--- 2. La masse porte son signe, la case n’est jamais vide ---');

verifier('la masse de l’écriture d’annulation est NÉGATIVE au registre',
  Number(contre.quantiteKg) === -0.5,
  `quantiteKg = ${contre.quantiteKg}`);
verifier('⑤ le document l’imprime AVEC son signe (− 0,50 kg)',
  document.includes('− 0,50 kg'),
  document.split('\n').find((l) => l.includes('annulation')) ?? '');
verifier('⑤ il imprime AUSSI la masse de l’écriture annulée (+ 0,50 kg)',
  document.includes('+ 0,50 kg'));
verifier('⑤ et la SOMME des deux, calculée, pas promise',
  faits.somme === 0 && document.includes('Somme des deux écritures'));
// ⚠ Règle de la maison : le doute retire un ALLÈGEMENT, jamais une MASSE.
verifier('⑤ aucune masse n’a DISPARU du document',
  !document.includes('Masse de la présente écriture d’annulation</span>'
    + '<span class="justif-valeur">—</span>'));
verifier('⑤ le document DIT que les signes sont ceux du registre',
  document.includes('avec le signe qu’elles ont AU REGISTRE'));

// Le cas qui a mis en défaut la première rédaction du CERFA : un CONTRÔLE,
// dont la quantité d'intervention est ZÉRO. La case doit porter « + 0,00 kg »
// et surtout pas rester vide ni disparaître.
{
  const machineCtrl = await store.createMachine({
    designation: 'Chambre froide Lot1A', fluide: 'R-410A',
    chargeNominaleKg: 12, chargeActuelleKg: 12, operateur: 'Testeur Lot1A'
  });
  const bctrl = await store.creerMouvement({
    mode: 'FORMATION', type: 'CONTROLE_PERIODIQUE', date: '2026-07-27',
    machineId: machineCtrl.id, fluide: 'R-410A', quantiteKg: 0,
    peseeAvantKg: null, peseeApresKg: null, technicien: 'Régis Delaunay',
    controle: { statutControle: 'CONFORME', detecteurId: null }
  });
  await store.soumettreMouvement(bctrl.id);
  await store.validerMouvement(bctrl.id, validateur.id);
  const contreCtrl = await store.annulerParContreEcriture(
    bctrl.id, 'Contrôle saisi sur la mauvaise machine', validateur.id);
  const doc = gabaritJustificatif(
    await construireJustificatif(store, contreCtrl.id));
  verifier('contre-écriture d’un CONTRÔLE : la masse nulle s’écrit « + 0,00 kg »',
    doc.includes('+ 0,00 kg'));
  verifier('… et la charge NOMINALE de l’équipement est dite à part',
    doc.includes('Charge nominale de l’équipement')
    && doc.includes('12,00 kg'));
}

// ============================================================
// 3. ⚠️ LA MENTION DE MODE — DANS LE DOCUMENT, ET SUR LE PAPIER
// ============================================================
console.log('\n--- 3. La mention de mode est DANS le document ---');

verifier('la mention de non-officialité est présente',
  document.includes(MENTION_FORMATION), MENTION_FORMATION);
verifier('elle est la MÊME que celle du CERFA (une seule rédaction)',
  MENTION_FORMATION.includes('MODE FORMATION')
  && MENTION_FORMATION.includes('DOCUMENT NON OFFICIEL'));

// Elle est DANS le nœud `.justif-document` — pas autour. On le prouve en
// coupant le document à son ouverture : tout ce qui suit est dedans.
const ouverture = document.indexOf('<div class="justif-document"');
verifier('décor : le document s’ouvre bien par son nœud racine',
  ouverture === 0, `index = ${ouverture}`);
verifier('⭐ la mention est À L’INTÉRIEUR du nœud `.justif-document`',
  document.slice(ouverture).includes(MENTION_FORMATION));
verifier('⭐ elle n’est dans AUCUN élément marqué « no-print »',
  !/class="[^"]*no-print[^"]*"/.test(document));
verifier('⭐ elle n’est pas portée par l’en-tête de l’application (#entete)',
  !document.includes('id="entete"'));

// Et le bloc d'impression, lui, laisse voir ce nœud ET ses descendants.
// Sans la seconde règle, la mention — qui est un DESCENDANT — resterait
// invisible sur le papier alors que le cadre du document s'imprimerait.
verifier('le bloc d’impression masque tout le reste de la page',
  /@media print[\s\S]*body \* \{ visibility: hidden; \}/
    .test(CSS_IMPRESSION_APERCU));
verifier('⭐ … et rend visible le document ET TOUS SES DESCENDANTS',
  /\.justif-document,\s*\n?\s*\.justif-document \* \{ visibility: visible; \}/
    .test(CSS_IMPRESSION_APERCU),
  CSS_IMPRESSION_APERCU.slice(0, 400));

// La mention est du TEXTE (elle s'imprime même si le navigateur refuse
// les fonds colorés, réglage par défaut de la plupart des postes) : sa
// couleur est portée par `color`, jamais par un `background` seul.
verifier('la mention est lisible sans impression des fonds (couleur du texte)',
  /\.justif-mode \{[^}]*color: #a51c1c;/.test(CSS_JUSTIFICATIF));
verifier('le filigrane « ANNULATION » est du TEXTE, pas une image de fond',
  document.includes('>ANNULATION<')
  && /\.justif-filigrane \{[^}]*color:/.test(CSS_JUSTIFICATIF));

// La page AUTONOME du dossier scellé porte les mêmes garanties.
verifier('la page autonome du dossier scellé porte la mention elle aussi',
  page.includes(MENTION_FORMATION));
verifier('… et elle embarque ses styles (aucune feuille externe, aucun réseau)',
  page.includes(CSS_JUSTIFICATIF.trim().slice(0, 60))
  && !page.includes('<link')
  && !/src\s*=\s*"https?:/.test(page));

// Contre-épreuve du SENS : une écriture en mode OFFICIEL n'a rien à
// déclarer — la mention ne doit pas être posée « au cas où ».
{
  const faitsOfficiels = assemblerJustificatif({
    mouvement: { ...contre, mode: 'OFFICIEL' },
    mouvements: await store.getMouvements(),
    machines: await store.getMachines(),
    bouteilles: await store.getBouteilles(),
    fluides: await store.getFluides(),
    personnel: await store.getPersonnel(),
    etablissement: await store.getEtablissement()
  });
  const docOfficiel = gabaritJustificatif(faitsOfficiels);
  verifier('un document OFFICIEL ne porte pas la mention de formation',
    !docOfficiel.includes(MENTION_FORMATION));
  verifier('… mais il porte toujours tout le reste (motif, masse, empreinte)',
    docOfficiel.includes(MOTIF) && docOfficiel.includes('− 0,50 kg')
    && docOfficiel.includes(faits.empreinte));
}

// ============================================================
// 4. IL NE RESSEMBLE PAS À UN CERFA
// ============================================================
console.log('\n--- 4. Deux pièces qui ne se ressemblent pas ---');

verifier('le titre est « JUSTIFICATIF DE RÉGULARISATION »',
  document.includes(TITRE_JUSTIFICATIF));
verifier('aucun champ de formulaire (ni input, ni form, ni AcroForm)',
  !/<input|<form|<select|<textarea|AcroForm/i.test(page));
verifier('aucune reprise de la maquette officielle (cadres numérotés)',
  !/cadre\s*1[0-4]|11_Q[A-E]|Sign_Operateur|Sign_Detenteur/i.test(page));
// Le mot « CERFA » n'apparaît que pour DÉSIGNER la fiche annulée, ou pour
// dire que ce document n'en est pas une. Aucune autre occurrence : le
// document ne se présente jamais comme une fiche d'intervention.
{
  const total = (document.match(/CERFA/g) || []).length;
  const legitimes =
    (document.match(/N° de fiche CERFA annulée/g) || []).length
    + (document.match(/CERFA 15497\*04/g) || []).length;
  verifier('le document dit qu’il N’EST PAS une fiche CERFA',
    document.includes(MENTION_PAS_UNE_FICHE_CERFA));
  verifier('« CERFA » n’y apparaît QUE pour désigner la fiche annulée',
    total === legitimes && total === 2,
    `occurrences = ${total}, légitimes = ${legitimes}`);
}
verifier('il explique l’absence de case de signature',
  document.includes(MENTION_SANS_SIGNATURE));
verifier('il ne contient AUCUNE case de signature',
  !/signature[^<]*:\s*_+|à signer|Signature du/i.test(document));

// ============================================================
// 5. L'AUTEUR VIENT DE LA FICHE VIVANTE
// ============================================================
console.log('\n--- 5. L’auteur est résolu par la fiche VIVANTE ---');

{
  // ⚠️ RGPD (lot E2) : si la personne est mise AU COFFRE DES IDENTITÉS,
  // c'est son pseudonyme qui doit sortir. Prendre le champ figé
  // `technicien` la re-nommerait EN CLAIR, dans le dossier scellé, à côté
  // d'un `mouvements.csv` qui vient de la pseudonymiser. On le tire en
  // renommant la fiche : le document suit, le champ figé ne bouge pas.
  await store.updatePersonne(validateur.id,
    { nom: 'Élève', prenom: '2026-07' });
  const apres = await construireJustificatif(store, contre.id);
  const gele = (await store.getMouvements())
    .find((mv) => mv.id === contre.id).technicien;
  verifier('⭐ le nom suit la FICHE VIVANTE (pseudonyme si personne au coffre)',
    apres.auteur === '2026-07 Élève' && gele === 'Régis Delaunay',
    `document = « ${apres.auteur} » · champ figé = « ${gele} »`);
  verifier('… et le document imprimé porte bien le nom vivant',
    gabaritJustificatif(apres).includes('2026-07 Élève'));
  await store.updatePersonne(validateur.id,
    { nom: 'Delaunay', prenom: 'Régis' });
}

// ============================================================
// 6. LES REFUS
// ============================================================
console.log('\n--- 6. Les refus canoniques ---');

await verifierRejet('une écriture ORDINAIRE n’a pas de justificatif',
  construireJustificatif(store, charge.id), MSG_PAS_UNE_CONTRE_ECRITURE);
await verifierRejet('une écriture introuvable est refusée, pas devinée',
  construireJustificatif(store, 'mvt-qui-n-existe-pas'), 'introuvable');
verifier('le prédicat unique de la maison distingue les deux',
  estContreEcriture(contre) && !estContreEcriture(charge));

// ============================================================
// 7. LE DOSSIER D'AUDIT SCELLÉ : REMPLACÉ, PAS RETIRÉ
// ============================================================
console.log('\n--- 7. Le dossier d’audit scellé reste complet ---');

const dossier = await genererDossierAudit(store, 2026);
const octetsZip = dossier.blob instanceof Uint8Array
  ? dossier.blob : new Uint8Array(await dossier.blob.arrayBuffer());
const entrees = lireZip(octetsZip);
const noms = entrees.map((e) => e.nom);
const texteDe = (nom) => new TextDecoder()
  .decode(entrees.find((e) => e.nom === nom).octets);

verifier('⭐ le CERFA de la contre-écriture N’EST PLUS dans l’archive',
  !noms.includes(`cerfa/${contre.numero}.pdf`),
  noms.filter((n) => n.startsWith('cerfa/')).join(', '));
verifier('⭐ … il est REMPLACÉ par le justificatif de régularisation',
  noms.includes(`regularisations/${contre.numero}.html`),
  noms.filter((n) => n.startsWith('regularisations/')).join(', '));
verifier('le CERFA de l’écriture ANNULÉE, lui, est toujours là',
  noms.includes(`cerfa/${charge.numero}.pdf`));

const justificatifArchive = texteDe(`regularisations/${contre.numero}.html`);
verifier('le justificatif de l’archive porte le motif',
  justificatifArchive.includes(MOTIF));
verifier('⭐ … et SA mention de non-officialité (rien ne l’entoure ici)',
  justificatifArchive.includes(MENTION_FORMATION));
verifier('… et il s’ouvre seul (page HTML complète)',
  justificatifArchive.startsWith('<!DOCTYPE html>')
  && justificatifArchive.includes('</html>'));

const sommaire = texteDe('00-SOMMAIRE.txt');
verifier('⭐ le sommaire DIT ce qui a changé',
  sommaire.includes('ÉCRITURES D\'ANNULATION')
  && sommaire.includes('ne donne plus lieu'));
verifier('… en toutes lettres, sans renvoyer à un document absent',
  LIGNE_SOMMAIRE_REGULARISATIONS.includes('remplacée')
  && sommaire.includes('remplacée'));
verifier('le sommaire liste le justificatif parmi les fichiers du dossier',
  sommaire.includes(`regularisations/${contre.numero}.html`));

const manifeste = texteDe('01-EMPREINTES-SHA256.txt');
verifier('le manifeste d’empreintes couvre le justificatif',
  manifeste.includes(`regularisations/${contre.numero}.html`));
verifier('l’archive reste scellée par une empreinte globale',
  typeof dossier.empreinte === 'string' && dossier.empreinte.length === 64);
verifier('le compte de documents annoncé = le compte réel des entrées',
  dossier.nbDocuments === entrees.length,
  `annoncé ${dossier.nbDocuments}, lus ${entrees.length}`);

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
