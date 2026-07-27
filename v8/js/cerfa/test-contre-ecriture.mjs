// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// LE DOCUMENT D'UNE CONTRE-ÉCRITURE NE DIT PLUS LE CONTRAIRE DE CE
// QU'ELLE EST (lot 1 / C1 — 4e relecture externe, 27/07/2026).
// Exécution : node v8/js/cerfa/test-contre-ecriture.mjs [demo|local]
//
// LE CONSTAT, TIRÉ AVANT CORRECTIF. Une erreur ne s'efface jamais dans ce
// registre : elle se corrige par une écriture INVERSE. Le mécanisme
// comptable est sain — c'est le DOCUMENT produit pour cette écriture
// inverse qui mentait :
//   2. la quantité sortait en valeur ABSOLUE : une contre-écriture de
//      −0,50 kg imprimait « 0,50 kg de fluide vierge chargé », exactement
//      comme l'originale — deux CERFA indiscernables, au numéro près ;
//   3. rien ne disait qu'elle ANNULE : la mention « Écriture annulée par
//      contre-écriture » n'était posée que sur l'écriture ANNULÉE ;
//   4. les blocs de signature sortaient PRÉ-REMPLIS (nom du validateur,
//      qualité de repli, date du jour) alors que personne n'avait signé :
//      une case de signature à laquelle il ne manquait que le paraphe ;
//   5. le MOTIF de l'annulation, scellé dans l'empreinte et écrit au
//      journal, n'était imprimé sur aucune fiche — c'est la « cause » de
//      l'écriture d'origine qui s'affichait à sa place.
//
// LE PIÈGE, ET IL EST SÉRIEUX. Le pré-remplissage des blocs de signature
// n'est PAS un défaut partout : le CERFA sert aussi de SUJET D'EXERCICE
// (l'élève l'imprime, le remplit, le signe à la main) et `correction.js`
// corrige sa copie contre les blocs de signature HISTORIQUES. Une
// correction qui viderait les blocs partout casserait l'usage QUOTIDIEN
// du logiciel. La section 4 tient les QUATRE cas : mouvement signé,
// mouvement non signé (exercice), correction de copie, contre-écriture.
//
// Suite DOUBLÉE au lanceur (demo puis local) : le générateur lit un
// store, et c'est le store qui lui porte `contreEcritureDe` et `motif` —
// la preuve ne vaut que jouée contre les deux.
// ÉCRIT dans le store cible — base JETABLE en local (harnais).
// ============================================================

import zlib from 'node:zlib';
import {
  genererCerfaPdf, calculerChampsCerfa, chargerPdfLib,
  MENTION_CONTRE_ECRITURE, PREFIXE_MOTIF_ANNULATION, PREFIXE_CAUSE_ANNULEE,
  MENTION_QUANTITES_NEGATIVES, PREFIXE_ENREGISTREE_PAR
} from './generateur.js';
import { corrigerCerfaEleve, comparerChamps } from './correction.js';

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
// Lecture des PDF produits : les champs du formulaire officiel, et le
// FLUX DE CONTENU de la page (c'est là que vivent les filigranes ; les
// polices standard y écrivent en chaînes HEXADÉCIMALES, pas en clair).
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
// Décor : un validateur, une machine, deux bouteilles.
// ============================================================
const store = await fabriquerStore(NOM_STORE);
if (store.init) await store.init();
console.log(`\n— Document d'une contre-écriture, store « ${NOM_STORE} » —`);

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
const bidonRecup = await store.createBouteille({
  type: 'RECUPERATION', fluide: 'R-410A', etatFluide: 'RECUPERE',
  tareKg: 10, masseBruteKg: 10, contenanceMaxKg: 50, proprietaire: 'Lycée'
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

// (D) une RÉCUPÉRATION : au registre sa quantité est déjà NÉGATIVE — le
// piège symétrique, qu'une simple lecture du signe stocké aurait raté.
const brouillonRecup = await store.creerMouvement({
  mode: 'FORMATION', type: 'RECUPERATION_MAINTENANCE', date: '2026-07-27',
  machineId: machine.id, bouteilleDstId: bidonRecup.id, fluide: 'R-410A',
  peseeAvantKg: 10, peseeApresKg: 13, technicien: 'Régis Delaunay',
  causeMouvement: 'Récupération avant démontage',
  controle: { statutControle: 'SANS_OBJET', detecteurId: null }
});
await store.soumettreMouvement(brouillonRecup.id);
await store.validerMouvement(brouillonRecup.id, validateur.id);
const recuperation = (await store.getMouvements())
  .find((mv) => mv.id === brouillonRecup.id);

// Les documents AVANT toute annulation (référence de non-régression).
const pdfSigneAvant = await genererCerfaPdf(store,
  { source: 'mouvement', id: chargeSignee.id });
const pdfExercice = await genererCerfaPdf(store,
  { source: 'mouvement', id: chargeExercice.id });
const pdfRecup = await genererCerfaPdf(store,
  { source: 'mouvement', id: recuperation.id });

// (C) les contre-écritures. La récupération d'abord : ses effets inverses
// remettent le fluide dans la machine, sans quoi l'annulation de la charge
// buterait sur une machine vide (le store refuse de vider ce qui est vide).
const MOTIF = 'Bouteille source erronée à la saisie';
const contreRecup = await store.annulerParContreEcriture(
  recuperation.id, 'Pesée relevée sur la mauvaise balance', validateur.id);
const contreCharge = await store.annulerParContreEcriture(
  chargeSignee.id, MOTIF, validateur.id);

const pdfContreCharge = await genererCerfaPdf(store,
  { source: 'mouvement', id: contreCharge.id });
const pdfContreRecup = await genererCerfaPdf(store,
  { source: 'mouvement', id: contreRecup.id });

// (E) REVUE ADVERSARIALE — un CONTRÔLE PÉRIODIQUE : son cadre 11 ne porte
// AUCUNE quantité d'intervention, seulement la charge NOMINALE de
// l'équipement. C'est le cas qui a mis en défaut la première rédaction de
// la mention (elle annonçait des « quantités ci-dessous » négatives alors
// que la seule quantité imprimée était cette charge nominale, positive).
// ⚠️ Sur une machine À PART : un contrôle du registre se recoupe avec tout
// mouvement de MÊME machine et MÊME date (cadre 10), et changerait les
// valeurs attendues des fiches (a) et (b) — le décor casserait la section 4
// sans qu'aucun correctif soit en cause. Piège payé en le tirant.
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
const contreControle = await store.annulerParContreEcriture(
  controlePerio.id, 'Contrôle saisi sur la mauvaise machine', validateur.id);
const pdfContreControle = await genererCerfaPdf(store,
  { source: 'mouvement', id: contreControle.id });
const litContreCtrl = await relire(pdfContreControle.octets);

const litSigne = await relire(pdfSigneAvant.octets);
const litExercice = await relire(pdfExercice.octets);
const litRecup = await relire(pdfRecup.octets);
const litContre = await relire(pdfContreCharge.octets);
const litContreRecup = await relire(pdfContreRecup.octets);

// ============================================================
// 1. LA QUANTITÉ NE MENT PLUS (constat 2)
// ============================================================
console.log('\n--- 1. La quantité inscrite dit ce que l’écriture EST ---');

verifier('l’écriture d’origine porte bien « 2,00 » en QA (fluide vierge chargé)',
  litSigne('11_QA') === '2,00', `valeur = « ${litSigne('11_QA')} »`);
verifier('la contre-écriture porte « -2,00 », jamais « 2,00 »',
  litContre('11_QA') === '-2,00', `valeur = « ${litContre('11_QA')} »`);
verifier('les deux fiches ne sont plus indiscernables sur la quantité',
  litContre('11_QA') !== litSigne('11_QA'));

// ⚠ Règle de la maison : le doute retire un ALLÈGEMENT, jamais une MASSE.
// Vider la case aurait fait disparaître d'un document officiel une masse
// réellement écrite au registre. Le précédent existe (les masses détruites
// évaporées d'une déclaration annuelle) : il ne se refait pas.
verifier('la masse n’a pas DISPARU : la case est remplie, au signe près',
  litContre('11_QA') !== ''
  && Math.abs(Number(litContre('11_QA').replace(',', '.')))
     === Math.abs(Number(litSigne('11_QA').replace(',', '.'))));

verifier('récupération d’origine : QD/QE et QDE positifs',
  litRecup('11_QDE') === '3,00'
  && (litRecup('11_QD') === '3,00' || litRecup('11_QE') === '3,00'),
  `QD=${litRecup('11_QD')} QE=${litRecup('11_QE')} QDE=${litRecup('11_QDE')}`);
verifier('contre-écriture d’une RÉCUPÉRATION : les mêmes cases passent au négatif',
  litContreRecup('11_QDE') === '-3,00'
  && (litContreRecup('11_QD') === '-3,00'
    || litContreRecup('11_QE') === '-3,00'),
  `QD=${litContreRecup('11_QD')} QE=${litContreRecup('11_QE')} `
  + `QDE=${litContreRecup('11_QDE')}`);
verifier('le signe se prend sur la NATURE de l’écriture, pas sur le signe stocké',
  Number(recuperation.quantiteKg) < 0
  && Number(contreRecup.quantiteKg) > 0
  && litContreRecup('11_QDE').startsWith('-'),
  `registre : origine=${recuperation.quantiteKg} `
  + `contre=${contreRecup.quantiteKg}`);

// ============================================================
// 2. LE DOCUMENT DIT QU'IL ANNULE, ET LAQUELLE (constat 3)
// ============================================================
console.log('\n--- 2. Le document dit qu’il annule, et laquelle ---');

const obsContre = litContre('14_Observations');
verifier('la mention d’annulation est en TÊTE du cadre 14',
  obsContre.startsWith(MENTION_CONTRE_ECRITURE),
  `cadre 14 = « ${obsContre.slice(0, 90)}… »`);
verifier('la mention nomme le NUMÉRO de l’écriture annulée',
  obsContre.includes(chargeSignee.numero),
  `numéro attendu = ${chargeSignee.numero}`);
verifier('la mention dit que l’écriture annulée est RETIRÉE du registre',
  obsContre.includes('RETIRE DU REGISTRE'));
verifier('le mécanisme réutilisé est celui des mentions du cadre 14 (pas un second)',
  obsContre.includes('MODE FORMATION'));

// ⚠️ REVUE ADVERSARIALE — LA PHRASE NE PROMET QUE CE QU'ELLE TIENT.
// Première rédaction : « LES QUANTITÉS PORTÉES CI-DESSOUS SONT RETIRÉES
// DU REGISTRE (VALEURS NÉGATIVES) ». Or le cadre 11 porte AUSSI
// `11_Quantite`, la charge NOMINALE de l'équipement — positive, intacte,
// et toujours imprimée. Sur la contre-écriture d'un CONTRÔLE, c'était même
// la SEULE quantité du cadre : le document affirmait qu'une masse positive
// était retirée du registre. Le négatif n'est annoncé que s'il est écrit.
verifier('l’annonce du NÉGATIF accompagne une contre-écriture qui en porte',
  obsContre.includes(MENTION_QUANTITES_NEGATIVES),
  `cadre 14 = « ${obsContre} »`);
verifier('la charge NOMINALE du cadre 11 reste positive et intacte',
  litContre('11_Quantite') === litSigne('11_Quantite')
  && !litContre('11_Quantite').startsWith('-'),
  `nominale origine=${litSigne('11_Quantite')} `
  + `contre=${litContre('11_Quantite')}`);

const obsContreCtrl = litContreCtrl('14_Observations');
verifier('contre-écriture d’un CONTRÔLE : aucune quantité d’intervention imprimée',
  ['11_QA', '11_QB', '11_QC', '11_QD', '11_QE', '11_QDE']
    .every((nom) => litContreCtrl(nom) === ''),
  ['11_QA', '11_QB', '11_QC', '11_QD', '11_QE', '11_QDE']
    .map((n) => `${n}=${litContreCtrl(n)}`).join(' '));
verifier('contre-écriture d’un CONTRÔLE : elle annonce quand même l’annulation',
  obsContreCtrl.startsWith(MENTION_CONTRE_ECRITURE)
  && obsContreCtrl.includes(controlePerio.numero));
verifier('contre-écriture d’un CONTRÔLE : elle ne prétend RIEN retirer en négatif',
  !obsContreCtrl.includes(MENTION_QUANTITES_NEGATIVES),
  `cadre 14 = « ${obsContreCtrl} »`);
// La garde ci-dessus ne suffit pas : la phrase fautive pouvait vivre dans
// N'IMPORTE QUELLE ligne du cadre. L'invariant se dit en entier — le cadre
// 14 parle de quantités négatives SI ET SEULEMENT SI le cadre 11 en porte.
const parleDeNegatif = (texte) =>
  /négatif|negatif|négative|negative|retirée|retiree/i.test(texte)
  && /quantité|quantite/i.test(texte);
verifier('cadre 14 : « quantités négatives » annoncées SI ET SEULEMENT SI écrites',
  parleDeNegatif(obsContre) === true
  && parleDeNegatif(obsContreCtrl) === false,
  `avec quantité → ${parleDeNegatif(obsContre)} · `
  + `sans quantité → ${parleDeNegatif(obsContreCtrl)} · `
  + `cadre 14 du contrôle = « ${obsContreCtrl} »`);
verifier('… alors que la charge nominale, elle, est bien imprimée et POSITIVE',
  litContreCtrl('11_Quantite') !== ''
  && !litContreCtrl('11_Quantite').startsWith('-'),
  `11_Quantite = ${litContreCtrl('11_Quantite')}`);

// Visible « pas dans un coin » : le cadre 14 est en bas de page, donc le
// PDF porte AUSSI un filigrane en diagonale. Deux CERFA posés côte à côte
// sur le bureau d'un inspecteur se distinguent d'un coup d'œil.
verifier('le PDF de la contre-écriture porte le filigrane « ANNULATION »',
  await filigranePresent(pdfContreCharge.octets, 'ANNULATION'));
verifier('une écriture ordinaire n’en porte AUCUN',
  !(await filigranePresent(pdfSigneAvant.octets, 'ANNULATION')));
verifier('le filigrane de FORMATION coexiste, il n’est pas recouvert',
  await filigranePresent(pdfContreCharge.octets, 'MODE FORMATION'));

// L'écriture ANNULÉE garde sa mention historique — c'est l'annulante qui
// n'en avait aucune.
const pdfAnnulee = await genererCerfaPdf(store,
  { source: 'mouvement', id: chargeSignee.id });
const litAnnulee = await relire(pdfAnnulee.octets);
verifier('l’écriture ANNULÉE conserve sa mention historique',
  litAnnulee('14_Observations')
    .includes('Écriture annulée par contre-écriture (registre).'));
verifier('l’écriture ANNULÉE ne prend PAS la mention de l’annulante',
  !litAnnulee('14_Observations').includes(MENTION_CONTRE_ECRITURE));

// ============================================================
// 3. LE MOTIF EST SUR LE DOCUMENT (constat 5)
// ============================================================
console.log('\n--- 3. Le motif de l’annulation est imprimé ---');

verifier('le motif scellé est imprimé au cadre 14',
  obsContre.includes(`${PREFIXE_MOTIF_ANNULATION} : ${MOTIF}`),
  `cadre 14 = « ${obsContre} »`);
verifier('la « cause » reprise de l’origine est libellée comme telle',
  obsContre.includes(`${PREFIXE_CAUSE_ANNULEE} : Appoint après réparation`));
verifier('une écriture ordinaire garde le libellé « Cause : » (inchangé)',
  litExercice('14_Observations').includes('Cause : Appoint après réparation')
  && !litExercice('14_Observations').includes(PREFIXE_CAUSE_ANNULEE));

// ============================================================
// 4. LES SIGNATURES — LES QUATRE CAS (constat 4 ET son piège)
// ============================================================
console.log('\n--- 4. Signatures : les quatre cas ---');

// (a) mouvement normal SIGNÉ : les signatures réelles, intactes.
verifier('(a) mouvement SIGNÉ : le signataire physique est inscrit',
  litSigne('Sign_Operateur_Nom') === 'Marc Dupont',
  `valeur = « ${litSigne('Sign_Operateur_Nom')} »`);
verifier('(a) mouvement SIGNÉ : le détenteur physique est inscrit',
  litSigne('Sign_Detenteur_Nom') === 'Claire Martin',
  `valeur = « ${litSigne('Sign_Detenteur_Nom')} »`);
verifier('(a) mouvement SIGNÉ : les six blocs sont remplis',
  CHAMPS_SIGNATURE.every((nom) => litSigne(nom) !== ''));

// (b) mouvement normal NON signé : le SUJET D'EXERCICE garde ses blocs.
verifier('(b) mouvement NON signé : les blocs restent pré-remplis (exercice)',
  CHAMPS_SIGNATURE.every((nom) => litExercice(nom) !== ''),
  CHAMPS_SIGNATURE.map((n) => `${n}=${litExercice(n)}`).join(' | '));
verifier('(b) mouvement NON signé : nom = le technicien de l’intervention',
  litExercice('Sign_Operateur_Nom') === 'Régis Delaunay');
verifier('(b) mouvement NON signé : date = la date d’intervention',
  litExercice('Sign_Operateur_Date') === '27/07/2026');

// (c) correction d'une copie d'élève : les blocs HISTORIQUES, sur TOUTES
// les cibles — contre-écriture comprise. Les valeurs attendues d'un élève
// ne bougent pour AUCUNE cible : c'est l'usage quotidien du logiciel.
for (const [libelle, cible] of [
  ['mouvement signé', chargeSignee.id],
  ['mouvement non signé', chargeExercice.id],
  ['contre-écriture', contreCharge.id]
]) {
  const attendu = await calculerChampsCerfa(store,
    { source: 'mouvement', id: cible }, { sansSignaturesReelles: true });
  verifier(`(c) correction — ${libelle} : blocs de signature HISTORIQUES conservés`,
    CHAMPS_SIGNATURE.every((nom) => attendu.texte[nom] !== ''),
    CHAMPS_SIGNATURE.map((n) => `${n}=${attendu.texte[n]}`).join(' | '));
}
{
  const rendu = await corrigerCerfaEleve(store,
    { source: 'mouvement', id: chargeExercice.id }, pdfExercice.octets);
  verifier('(c) correction — la copie parfaite du sujet reste notée 100 %',
    rendu.rapport.pourcentage === 100 && rendu.rapport.nbATort === 0,
    `pourcentage = ${rendu.rapport.pourcentage}, `
    + `à tort = ${rendu.rapport.nbATort}`);
}

// (d) contre-écriture : AUCUN bloc pré-rempli. Personne n'a signé.
verifier('(d) contre-écriture : les six blocs de signature sont VIDES',
  CHAMPS_SIGNATURE.every((nom) => litContre(nom) === ''),
  CHAMPS_SIGNATURE.map((n) => `${n}=${litContre(n)}`).join(' | '));
{
  const champs = await calculerChampsCerfa(store,
    { source: 'mouvement', id: contreCharge.id });
  verifier('(d) contre-écriture : aucun tracé manuscrit dessiné non plus',
    champs.signatureTechnicienPng === null
    && champs.signatureDetenteurPng === null
    && champs.signatureDataUrl === null);
  verifier('(d) contre-écriture : le fait est porté par le générateur',
    champs.contreEcriture !== null
    && champs.contreEcriture.numeroAnnule === chargeSignee.numero
    && champs.contreEcriture.motif === MOTIF);
}
{
  const champs = await calculerChampsCerfa(store,
    { source: 'mouvement', id: chargeExercice.id });
  verifier('une écriture ordinaire n’est JAMAIS marquée contre-écriture',
    champs.contreEcriture === null);
}

// (e) ⚠️ REVUE ADVERSARIALE — VIDER N'EST PAS EFFACER.
// Vider les blocs était juste : personne n'a signé. Mais le nom du
// validateur ne figurait alors PLUS NULLE PART sur la fiche, alors qu'il
// y était avant le lot (au mauvais endroit : dans la case de signature).
// « Le doute retire l'ALLÈGEMENT, jamais l'OBLIGATION » : l'identité
// revient comme un FAIT du registre, hors de toute case de signature —
// c'est déjà ce que fait la colonne « Technicien » de mouvements.csv.
verifier('(e) la fiche DIT qui a passé la contre-écriture',
  obsContre.includes(`${PREFIXE_ENREGISTREE_PAR} : ${contreCharge.technicien}`),
  `technicien au registre = ${contreCharge.technicien} · `
  + `cadre 14 = « ${obsContre} »`);
verifier('(e) … et elle explique POURQUOI les cases de signature sont vides',
  obsContre.includes('aucune signature manuscrite'));
verifier('(e) ce nom n’est INSCRIT dans AUCUNE case de signature',
  CHAMPS_SIGNATURE.every((nom) => litContre(nom) === ''));
verifier('(e) une écriture ordinaire ne porte jamais cette ligne',
  !litExercice('14_Observations').includes(PREFIXE_ENREGISTREE_PAR));
{
  // ⚠️ RGPD (lot E2) : le nom vient de la FICHE VIVANTE, jamais du champ
  // figé — sinon une personne mise AU COFFRE serait pseudonymisée dans
  // `mouvements.csv` et re-nommée en clair sur le CERFA voisin, dans le
  // MÊME dossier scellé. On le tire en renommant la fiche : le document
  // suit, alors que le champ figé du registre, lui, ne bouge pas.
  await store.updatePersonne(validateur.id, { nom: 'Élève', prenom: '2026-07' });
  const apres = await calculerChampsCerfa(store,
    { source: 'mouvement', id: contreCharge.id });
  const gele = (await store.getMouvements())
    .find((mv) => mv.id === contreCharge.id).technicien;
  verifier('(e) le nom suit la FICHE VIVANTE (pseudonyme si la personne est au coffre)',
    apres.texte['14_Observations']
      .includes(`${PREFIXE_ENREGISTREE_PAR} : 2026-07 Élève`)
    && gele === 'Régis Delaunay',
    `champ figé au registre = « ${gele} » · cadre 14 = `
    + `« ${apres.texte['14_Observations'].split('\n')[3] ?? ''} »`);
  await store.updatePersonne(validateur.id,
    { nom: 'Delaunay', prenom: 'Régis' });
}

// (f) ⚠️ REVUE ADVERSARIALE — L'USAGE QUOTIDIEN, MESURÉ.
// Les lignes ajoutées au cadre 14 sont écrites MOT POUR MOT par
// l'application, comme MODE FORMATION et comme la mention de réemploi.
// Le lot les avait laissées dans la comparaison : un élève à qui l'on
// donne une contre-écriture comme sujet était attendu sur la phrase
// canonique « ÉCRITURE D'ANNULATION — … », qu'il ne peut pas écrire
// (mesuré : 95 % sur une copie par ailleurs parfaite).
{
  const attendu = await calculerChampsCerfa(store,
    { source: 'mouvement', id: contreCharge.id },
    { sansSignaturesReelles: true });
  const copie = {
    texte: { ...attendu.texte },
    cases: { ...attendu.cases },
    radio: attendu.radio
  };
  // L'élève écrit la seule ligne qui soit une DONNÉE (la cause de
  // l'écriture annulée) et ignore les phrases de l'application.
  copie.texte['14_Observations'] =
    String(attendu.texte['14_Observations'] ?? '').split('\n')
      .filter((l) => l.startsWith(PREFIXE_CAUSE_ANNULEE)).join('\n');
  const rendu = comparerChamps(attendu, copie);
  const ligne14 = rendu.lignes.find((l) => l.nom === '14_Observations');
  verifier('(f) les mentions SYSTÈME de l’annulation ne sont pas exigées de l’élève',
    ligne14.statut === 'OK',
    `statut du cadre 14 = ${ligne14.statut} · copie = `
    + `« ${copie.texte['14_Observations']} »`);
  verifier('(f) … et la DONNÉE, elle, reste exigée',
    String(attendu.texte['14_Observations']).includes(PREFIXE_CAUSE_ANNULEE));
}
{
  // Le même élève qui n'écrit RIEN au cadre 14 doit, lui, être repris :
  // écarter les mentions système ne doit pas éteindre le champ.
  const attendu = await calculerChampsCerfa(store,
    { source: 'mouvement', id: contreCharge.id },
    { sansSignaturesReelles: true });
  const copie = {
    texte: { ...attendu.texte, '14_Observations': '' },
    cases: { ...attendu.cases }, radio: attendu.radio
  };
  const ligne14 = comparerChamps(attendu, copie).lignes
    .find((l) => l.nom === '14_Observations');
  verifier('(f) un cadre 14 laissé VIDE reste compté « Oublié »',
    ligne14.statut === 'MANQUANT', `statut = ${ligne14.statut}`);
}

// ============================================================
// 5. LE DOSSIER D'AUDIT SE PRODUIT TOUJOURS
// Le ZIP scellé embarque un CERFA par écriture du registre, la
// contre-écriture comprise : ce qui change, c'est le CONTENU de sa fiche.
// ============================================================
console.log('\n--- 5. Le document reste produisible de bout en bout ---');
verifier('le PDF de la contre-écriture est un PDF valide et non vide',
  pdfContreCharge.octets instanceof Uint8Array
  && pdfContreCharge.octets.length > 10000
  && Buffer.from(pdfContreCharge.octets.subarray(0, 5)).toString('latin1')
     === '%PDF-');
verifier('son nom de fichier reste celui de son propre numéro',
  pdfContreCharge.nomFichier
    === `cerfa-15497-04_${contreCharge.numero}.pdf`);

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
