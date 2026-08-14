// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// UNE CONTRE-ÉCRITURE NE PRODUIT PLUS DE CERFA
// (lot 1, branche A — décision du propriétaire du 27/07/2026,
//  docs/PLAN-LOT1-CONTRE-ECRITURE.md § 3).
// Exécution : node v8/js/cerfa/test-contre-ecriture.mjs [demo|local]
//
// CE QUE CETTE SUITE PROUVE, ET POURQUOI ELLE A CHANGÉ DE SUJET.
// Le 4ᵉ audit externe a mesuré ceci : le dossier d'audit SCELLÉ
// embarquait, pour une contre-écriture, une vraie fiche CERFA 15497*04
// numérotée à la suite de l'originale et indiscernable d'elle sur 66
// champs sur 71. La première réponse (le matin du 27/07) fut de rendre
// cette fiche honnête : quantité signée, mention d'annulation, motif
// imprimé, filigrane, blocs de signature vidés. Le propriétaire a
// tranché l'après-midi, et il a tranché plus haut :
//
//   « Émettre un CERFA pour un geste comptable, c'est attester une
//     intervention qui n'a pas eu lieu. »
//
// Le CERFA 15497*04 est une fiche d'INTERVENTION sur un équipement.
// Aucune intervention n'a lieu le jour d'une annulation au registre.
// Donc : plus de CERFA du tout pour une contre-écriture, et à la place
// un JUSTIFICATIF DE RÉGULARISATION (documents/regularisation.js), qui
// porte tout ce que la fiche portait — numéro annulé, motif, auteur,
// masse signée — sur un document qui ne ressemble pas à un formulaire
// officiel. Le document lui-même est éprouvé par
// `v8/js/documents/test-justificatif-regularisation.mjs` ; ICI on
// éprouve le REFUS, et surtout ce que le refus ne doit PAS casser.
//
// ⚠️ CE QUI NE DOIT PAS BOUGER — C'EST L'USAGE QUOTIDIEN. Le CERFA sert
// de SUJET D'EXERCICE : l'élève l'imprime, le remplit, le signe à la
// main, et `correction.js` corrige sa copie. Les sections 4 et 5 tiennent
// les trois cas de tous les jours (mouvement signé, fiche d'exercice non
// signée, correction de copie) : si l'un rougit, la brique est refusée.
//
// Suite DOUBLÉE au lanceur (demo puis local) : c'est le STORE qui porte
// `contreEcritureDe` et `cerfaNumero`, la preuve ne vaut que jouée contre
// les deux. ÉCRIT dans le store cible — base JETABLE en local (harnais).
// ============================================================

import zlib from 'node:zlib';
import {
  genererCerfaPdf, calculerChampsCerfa, chargerPdfLib,
  MSG_CERFA_CONTRE_ECRITURE
} from './generateur.js';
import { corrigerCerfaEleve } from './correction.js';
import { estContreEcriture } from '../documents/regularisation.js';

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

/** Attend un REJET, et vérifie que le message dit la bonne chose. */
async function verifierRejet(libelle, promesse, fragment) {
  try {
    await promesse;
    verifier(libelle, false, 'aucune erreur levée');
  } catch (erreur) {
    const message = erreur && erreur.message ? erreur.message : String(erreur);
    verifier(libelle, message.includes(fragment),
      `message = « ${message} »`);
  }
}

// ------------------------------------------------------------
// Un PNG de signature RÉELLEMENT ENCRÉ. Depuis le lot B3 l'image est
// décodée pour de bon (IHDR, CRC-32 de chaque chunk, IDAT, IEND) et une
// zone rigoureusement uniforme est REFUSÉE : un PNG 1×1 ne passe plus.
// ------------------------------------------------------------
const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(octets) {
  let crc = 0xffffffff;
  for (const o of octets) crc = TABLE_CRC[(crc ^ o) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunkPng(type, donnees) {
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(donnees)]);
  const taille = Buffer.alloc(4);
  taille.writeUInt32BE(donnees.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corps), 0);
  return Buffer.concat([taille, corps, crc]);
}
function pngAvecEncre(largeur = 60, hauteur = 24) {
  const parLigne = largeur * 4;
  const brut = Buffer.alloc(hauteur * (parLigne + 1));
  for (let y = 0; y < hauteur; y += 1) {
    const base = y * (parLigne + 1);
    for (let x = 0; x < largeur; x += 1) {
      const encre = y === Math.floor(hauteur / 2) && x > 2 && x < largeur - 3;
      const p = base + 1 + x * 4;
      brut[p] = encre ? 10 : 255;
      brut[p + 1] = encre ? 10 : 255;
      brut[p + 2] = encre ? 10 : 255;
      brut[p + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunkPng('IHDR', ihdr),
    chunkPng('IDAT', zlib.deflateSync(brut, { level: 9 })),
    chunkPng('IEND', Buffer.alloc(0))]);
}
const PNG_ENCRE = pngAvecEncre().toString('base64');

// ------------------------------------------------------------
// Lecture des PDF produits : champs du formulaire, et FLUX DE CONTENU de
// la page (c'est là que vivent les filigranes ; les polices standard y
// écrivent en chaînes HEXADÉCIMALES, pas en clair).
// ------------------------------------------------------------
const PDFLib = await chargerPdfLib();

async function relire(octets) {
  const doc = await PDFLib.PDFDocument.load(octets);
  const form = doc.getForm();
  return (nom) => form.getTextField(nom).getText() ?? '';
}

async function contenuDePage(octets) {
  const doc = await PDFLib.PDFDocument.load(octets);
  const contenu = doc.getPages()[0].node.Contents();
  const refs = contenu?.asArray ? contenu.asArray() : [contenu];
  let texte = '';
  for (const ref of refs) {
    const flux = doc.context.lookup(ref);
    if (!flux) continue;
    texte += Buffer.from(PDFLib.decodePDFRawStream(flux).decode())
      .toString('latin1');
  }
  return texte;
}

/** Un filigrane est-il dessiné sur la page ? (texte en hexadécimal) */
async function filigranePresent(octets, mot) {
  const contenu = await contenuDePage(octets);
  const hex = Buffer.from(mot, 'latin1').toString('hex');
  return contenu.toLowerCase().includes(hex.toLowerCase());
}

const CHAMPS_SIGNATURE = ['Sign_Operateur_Nom', 'Sign_Operateur_Qualite',
  'Sign_Operateur_Date', 'Sign_Detenteur_Nom', 'Sign_Detenteur_Qualite',
  'Sign_Detenteur_Date'];

// ============================================================
// Décor : un validateur, deux machines, deux bouteilles.
// ============================================================
const store = await fabriquerStore(NOM_STORE);
if (store.init) await store.init();
console.log(`\n— Contre-écriture et CERFA, store « ${NOM_STORE} » —`);

// La base jetable du store « local » naît vide : sans raison sociale, le
// bloc DÉTENTEUR sort légitimement vide et le décor, pas le correctif,
// ferait rougir la section 4.
await store.updateEtablissement({
  raisonSociale: 'Lycée d’essai C1', adresse: '1 rue du Banc, Marseille',
  siret: '12345678900011', numAttestationCapacite: 'AC-13-000001'
});

const validateur = await store.createPersonne({
  nom: 'Delaunay', prenom: 'Régis', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
const machine = await store.createMachine({
  designation: 'Vitrine C1 (contre-écriture)', fluide: 'R-410A',
  chargeNominaleKg: 10, chargeActuelleKg: 0, operateur: 'Testeur C1'
});
const bouteilleNeuve = await store.createBouteille({
  type: 'NEUVE', fluide: 'R-410A', etatFluide: 'VIERGE',
  tareKg: 10, masseBruteKg: 40, contenanceMaxKg: 50, proprietaire: 'Lycée'
});

/** Crée une charge d'appoint, la signe éventuellement, la valide. */
async function chargeValidee({ signer, peseeAvantKg, peseeApresKg }) {
  const brouillon = await store.creerMouvement({
    mode: 'FORMATION', type: 'CHARGE_APPOINT', date: '2026-07-27',
    machineId: machine.id, bouteilleSrcId: bouteilleNeuve.id,
    fluide: 'R-410A', peseeAvantKg, peseeApresKg,
    causeMouvement: 'Appoint après réparation', technicien: 'Régis Delaunay',
    controle: { statutControle: 'SANS_OBJET', detecteurId: null }
  });
  if (signer) {
    await store.signerMouvement(brouillon.id, {
      role: 'TECHNICIEN', nom: 'Dupont', prenom: 'Marc',
      qualite: 'Titulaire attestation d’aptitude', imagePng: PNG_ENCRE
    });
    await store.signerMouvement(brouillon.id, {
      role: 'DETENTEUR', nom: 'Martin', prenom: 'Claire',
      qualite: 'Détenteur de l’équipement', imagePng: PNG_ENCRE
    });
  }
  await store.soumettreMouvement(brouillon.id);
  await store.validerMouvement(brouillon.id, validateur.id);
  return (await store.getMouvements()).find((mv) => mv.id === brouillon.id);
}

// (A) charge SIGNÉE, (B) charge NON signée = le sujet d'exercice.
const chargeSignee = await chargeValidee({
  signer: true, peseeAvantKg: 40, peseeApresKg: 38
});
const chargeExercice = await chargeValidee({
  signer: false, peseeAvantKg: 38, peseeApresKg: 37
});

// Les documents AVANT toute annulation (référence de non-régression).
const pdfSigneAvant = await genererCerfaPdf(store,
  { source: 'mouvement', id: chargeSignee.id });
const pdfExercice = await genererCerfaPdf(store,
  { source: 'mouvement', id: chargeExercice.id });

// (C) la contre-écriture.
const MOTIF = 'Bouteille source erronée à la saisie';
const contreCharge = await store.annulerParContreEcriture(
  chargeSignee.id, MOTIF, validateur.id);

const litSigne = await relire(pdfSigneAvant.octets);
const litExercice = await relire(pdfExercice.octets);

// ============================================================
// 1. LE NUMÉRO DE FICHE — LA PARITÉ DES DEUX MAGASINS
// ============================================================
console.log('\n--- 1. Aucun numéro de fiche CERFA sur une contre-écriture ---');

verifier('la contre-écriture ne porte AUCUN numéro de fiche CERFA',
  contreCharge.cerfaNumero === null
  || contreCharge.cerfaNumero === undefined,
  `cerfaNumero = ${JSON.stringify(contreCharge.cerfaNumero)}`);
verifier('… relue au registre, même verdict (parité demo/local)',
  ((await store.getMouvements()).find((mv) => mv.id === contreCharge.id)
    ?.cerfaNumero ?? null) === null);
verifier('elle garde bien son numéro d’ÉCRITURE INTERNE, lui',
  typeof contreCharge.numero === 'string' && contreCharge.numero.length > 0,
  `numero = ${contreCharge.numero}`);
verifier('l’écriture ORDINAIRE, elle, garde son numéro de fiche',
  Boolean(chargeSignee.cerfaNumero),
  `cerfaNumero = ${chargeSignee.cerfaNumero}`);
verifier('le prédicat de la maison reconnaît l’écriture d’annulation',
  estContreEcriture(contreCharge) === true
  && estContreEcriture(chargeSignee) === false);

// ============================================================
// 2. LE REFUS — TOUTES LES PORTES, LE MÊME MESSAGE
// ============================================================
console.log('\n--- 2. Le CERFA est refusé, et le refus dit où aller ---');

await verifierRejet('genererCerfaPdf REFUSE une contre-écriture',
  genererCerfaPdf(store, { source: 'mouvement', id: contreCharge.id }),
  'JUSTIFICATIF DE RÉGULARISATION');
await verifierRejet('calculerChampsCerfa la refuse par la même porte',
  calculerChampsCerfa(store, { source: 'mouvement', id: contreCharge.id }),
  'JUSTIFICATIF DE RÉGULARISATION');
// Le refus est posé dans `assemblerContexte`, exactement comme celui du
// TRANSFERT : il couvre donc AUSSI le chemin de la correction de copie.
// C'est voulu — corriger la copie d'un élève sur une écriture
// d'annulation n'a pas de sens, et le bouton a été retiré des écrans.
await verifierRejet('la correction de copie d’élève la refuse aussi',
  corrigerCerfaEleve(store, { source: 'mouvement', id: contreCharge.id },
    pdfSigneAvant.octets),
  'JUSTIFICATIF DE RÉGULARISATION');
verifier('le message est celui du module, mot pour mot',
  MSG_CERFA_CONTRE_ECRITURE.includes('JUSTIFICATIF DE RÉGULARISATION')
  && MSG_CERFA_CONTRE_ECRITURE.includes('aucune intervention'),
  MSG_CERFA_CONTRE_ECRITURE);

// ⚠️ LE POINT CENTRAL DE LA DÉCISION, ET IL SE TIRE.
// Le refus se porte sur `contreEcritureDe`, JAMAIS sur `cerfaNumero`.
// Les contre-écritures enregistrées AVANT ce lot gardent leur numéro de
// fiche, scellé dans l'empreinte v2 (le déclencheur WORM interdit d'y
// revenir, et on ne réécrit pas le passé). Si le refus s'était appuyé
// sur `cerfaNumero`, elles auraient continué de sortir un CERFA. On le
// prouve en fabriquant l'ANCIENNE forme : un store qui rend la même
// écriture, mais avec son `cerfaNumero` d'époque.
const storeAncienneForme = {
  ...store,
  getMouvements: async () => (await store.getMouvements()).map((mv) =>
    mv.id === contreCharge.id
      ? { ...mv, cerfaNumero: mv.numero }
      : mv)
};
for (const cle of Object.keys(store)) {
  if (typeof store[cle] === 'function' && cle !== 'getMouvements') {
    storeAncienneForme[cle] = store[cle].bind(store);
  }
}
{
  const ancienne = (await storeAncienneForme.getMouvements())
    .find((mv) => mv.id === contreCharge.id);
  verifier('décor : l’ANCIENNE forme porte bien un cerfaNumero',
    ancienne.cerfaNumero === contreCharge.numero,
    `cerfaNumero = ${ancienne.cerfaNumero}`);
  await verifierRejet(
    '⭐ une contre-écriture ANCIENNE (cerfaNumero scellé) ne sort plus de CERFA',
    genererCerfaPdf(storeAncienneForme,
      { source: 'mouvement', id: contreCharge.id }),
    'JUSTIFICATIF DE RÉGULARISATION');
}

// ============================================================
// 3. L'ÉCRITURE ANNULÉE, ELLE, GARDE SA FICHE
// Le passé ne se réécrit pas : la fiche d'origine reste opposable, et
// elle porte toujours la mention qui dit qu'elle a été annulée.
// ============================================================
console.log('\n--- 3. L’écriture ANNULÉE garde sa fiche et sa mention ---');

const pdfAnnulee = await genererCerfaPdf(store,
  { source: 'mouvement', id: chargeSignee.id });
const litAnnulee = await relire(pdfAnnulee.octets);
verifier('la fiche de l’écriture annulée est toujours produite',
  pdfAnnulee.octets instanceof Uint8Array && pdfAnnulee.octets.length > 10000);
verifier('elle conserve sa mention « Écriture annulée par contre-écriture »',
  litAnnulee('14_Observations')
    .includes('Écriture annulée par contre-écriture (registre).'));
verifier('sa quantité reste celle de l’intervention réelle (2,00 kg)',
  litAnnulee('11_QA') === '2,00', `valeur = « ${litAnnulee('11_QA')} »`);
verifier('aucun filigrane « ANNULATION » sur un CERFA — il n’en existe plus',
  !(await filigranePresent(pdfAnnulee.octets, 'ANNULATION')));
verifier('le filigrane de FORMATION, lui, est toujours là',
  await filigranePresent(pdfAnnulee.octets, 'MODE FORMATION'));

// ============================================================
// 4. L'USAGE QUOTIDIEN — LES TROIS CAS QUI NE DOIVENT PAS BOUGER
// ============================================================
console.log('\n--- 4. L’usage quotidien : les trois cas ---');

// (a) mouvement normal SIGNÉ : les signatures réelles, intactes.
verifier('(a) mouvement SIGNÉ : le signataire physique est inscrit',
  litSigne('Sign_Operateur_Nom') === 'Marc Dupont',
  `valeur = « ${litSigne('Sign_Operateur_Nom')} »`);
verifier('(a) mouvement SIGNÉ : le détenteur physique est inscrit',
  litSigne('Sign_Detenteur_Nom') === 'Claire Martin',
  `valeur = « ${litSigne('Sign_Detenteur_Nom')} »`);
verifier('(a) mouvement SIGNÉ : les six blocs sont remplis',
  CHAMPS_SIGNATURE.every((nom) => litSigne(nom) !== ''));
verifier('(a) mouvement SIGNÉ : quantité positive, cadre 14 sans annulation',
  litSigne('11_QA') === '2,00'
  && !litSigne('14_Observations').includes('ANNULATION'));

// (b) mouvement normal NON signé : le SUJET D'EXERCICE garde ses blocs.
verifier('(b) fiche d’exercice NON signée : blocs pré-remplis (le sujet)',
  CHAMPS_SIGNATURE.every((nom) => litExercice(nom) !== ''),
  CHAMPS_SIGNATURE.map((n) => `${n}=${litExercice(n)}`).join(' | '));
verifier('(b) fiche d’exercice : nom = le technicien de l’intervention',
  litExercice('Sign_Operateur_Nom') === 'Régis Delaunay');
verifier('(b) fiche d’exercice : date = la date d’intervention',
  litExercice('Sign_Operateur_Date') === '27/07/2026');
verifier('(b) fiche d’exercice : le libellé « Cause : » est inchangé',
  litExercice('14_Observations').includes('Cause : Appoint après réparation'));

// (c) correction d'une copie d'élève : 100 % sur une copie parfaite.
{
  const rendu = await corrigerCerfaEleve(store,
    { source: 'mouvement', id: chargeExercice.id }, pdfExercice.octets);
  verifier('(c) correction : la copie parfaite du sujet reste notée 100 %',
    rendu.rapport.pourcentage === 100 && rendu.rapport.nbATort === 0,
    `pourcentage = ${rendu.rapport.pourcentage}, `
    + `à tort = ${rendu.rapport.nbATort}`);
}
{
  const attendu = await calculerChampsCerfa(store,
    { source: 'mouvement', id: chargeExercice.id },
    { sansSignaturesReelles: true });
  verifier('(c) correction : les blocs de signature HISTORIQUES sont la référence',
    CHAMPS_SIGNATURE.every((nom) => attendu.texte[nom] !== ''),
    CHAMPS_SIGNATURE.map((n) => `${n}=${attendu.texte[n]}`).join(' | '));
}

// ============================================================
// 5. LE CONTRÔLE PÉRIODIQUE — l'autre cas d'atelier
// ⚠️ Sur une machine À PART : un contrôle du registre se recoupe avec
// tout mouvement de MÊME machine et MÊME date (cadre 10) et changerait
// les valeurs attendues des fiches (a) et (b). Piège payé en le tirant.
// ============================================================
console.log('\n--- 5. Contrôle périodique : fiche normale, puis annulation ---');

const machineCtrl = await store.createMachine({
  designation: 'Chambre froide C1 (contrôle)', fluide: 'R-410A',
  chargeNominaleKg: 12, chargeActuelleKg: 12, operateur: 'Testeur C1'
});
const brouillonCtrl = await store.creerMouvement({
  mode: 'FORMATION', type: 'CONTROLE_PERIODIQUE', date: '2026-07-27',
  machineId: machineCtrl.id, fluide: 'R-410A', quantiteKg: 0,
  peseeAvantKg: null, peseeApresKg: null, technicien: 'Régis Delaunay',
  controle: { statutControle: 'CONFORME', detecteurId: null }
});
await store.soumettreMouvement(brouillonCtrl.id);
await store.validerMouvement(brouillonCtrl.id, validateur.id);
const controlePerio = (await store.getMouvements())
  .find((mv) => mv.id === brouillonCtrl.id);
const pdfCtrl = await genererCerfaPdf(store,
  { source: 'mouvement', id: controlePerio.id });
const litCtrl = await relire(pdfCtrl.octets);
verifier('le contrôle périodique produit sa fiche, charge nominale positive',
  litCtrl('11_Quantite') !== '' && !litCtrl('11_Quantite').startsWith('-'),
  `11_Quantite = ${litCtrl('11_Quantite')}`);

const contreControle = await store.annulerParContreEcriture(
  controlePerio.id, 'Contrôle saisi sur la mauvaise machine', validateur.id);
verifier('l’annulation d’un contrôle non plus n’a de numéro de fiche',
  (contreControle.cerfaNumero ?? null) === null);
await verifierRejet('… et son CERFA est refusé comme les autres',
  genererCerfaPdf(store, { source: 'mouvement', id: contreControle.id }),
  'JUSTIFICATIF DE RÉGULARISATION');

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
