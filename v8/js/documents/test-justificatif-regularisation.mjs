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

import { readFileSync } from 'node:fs';
import {
  estContreEcriture, construireJustificatif, assemblerJustificatif,
  gabaritJustificatif, justificatifHtmlAutonome,
  CSS_JUSTIFICATIF, CSS_IMPRESSION_APERCU, ANCETRES_MODALE,
  TITRE_JUSTIFICATIF, MENTION_PAS_UNE_FICHE_CERFA, MENTION_SANS_SIGNATURE,
  MENTION_MODE_INDETERMINE,
  MSG_PAS_UNE_CONTRE_ECRITURE, LIGNE_SOMMAIRE_REGULARISATIONS
} from './regularisation.js';
import { MENTION_FORMATION } from '../cerfa/generateur.js';
import { genererDossierAudit } from './dossier-audit.js';
import { genererDossierMachine } from './dossier-machine.js';

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
// ⚠ Le DÉTENTEUR est un TIERS : c'est le cas normal au lycée (machines de
// clients réparées à l'atelier), et c'est celui que la revue du 27/07 a
// trouvé muet sur le document.
const client = await store.createClient({
  raisonSociale: 'Boulangerie Le Fournil Lot1A',
  adresse: '4 quai du Port, 13002 Marseille',
  siret: '48291035700022'
});
const machine = await store.createMachine({
  designation: 'Vitrine Lot1A', fluide: 'R-410A',
  chargeNominaleKg: 10, chargeActuelleKg: 0, operateur: 'Testeur Lot1A',
  clientId: client.id, marque: 'Profroid', modele: 'CF-6',
  numSerie: 'SN-778899'
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
// ⭐ REVUE DU 27/07 : le document affirmait une preuve que le mécanisme
// ne délivre pas — « elle prouve que ce justificatif n'a pas été
// fabriqué après coup ». Le justificatif EST composé après coup, à
// chaque ouverture ; l'empreinte imprimée est recopiée du registre. Elle
// soutient que l'ÉCRITURE était scellée à sa création, rien de plus.
verifier('⑦ … et le document dit ce que l’empreinte porte, sans promettre '
  + 'que CE PAPIER est d’époque',
document.includes('elle porte sur l’ÉCRITURE au registre')
  && document.includes('composé à la demande')
  && !/fabriqué\s+après\s+coup/.test(document));

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
// 2 bis. AUCUNE MASSE INVENTÉE — l'image inverse du précédent maison
//
// Tiré sur la contre-écriture d'un TRANSFERT (aucune machine) : le
// document imprimait « Charge nominale de l'équipement : 0,00 kg » sous
// une ligne « Équipement : — ». Mécanisme : `Number(null) === 0`, qui est
// fini, de sorte que la garde ne se déclenchait JAMAIS. Sur une pièce de
// preuve, « 0,00 kg » est une AFFIRMATION, et elle était fausse.
// ⚠ Un zéro RÉELLEMENT porté au registre (contrôle, ci-dessus) reste un
// zéro : le doute ne retire jamais une masse, il refuse d'en inventer une.
// ============================================================
console.log('\n--- 2 bis. Aucune masse inventée ---');
{
  const b2 = await store.createBouteille({
    type: 'RECUPERATION', fluide: 'R-410A', etatFluide: 'RECUPERE',
    tareKg: 10, masseBruteKg: 15, contenanceMaxKg: 50, proprietaire: 'Lycée'
  });
  const bt = await store.creerMouvement({
    mode: 'FORMATION', type: 'TRANSFERT', date: '2026-07-27',
    bouteilleSrcId: bouteille.id, bouteilleDstId: b2.id, fluide: 'R-410A',
    peseeAvantKg: 39.5, peseeApresKg: 38.5, technicien: 'Régis Delaunay',
    controle: { statutControle: 'SANS_OBJET', detecteurId: null }
  });
  await store.soumettreMouvement(bt.id);
  await store.validerMouvement(bt.id, validateur.id);
  const contreT = await store.annulerParContreEcriture(
    bt.id, 'Transfert saisi deux fois', validateur.id);
  const faitsT = await construireJustificatif(store, contreT.id);
  const docT = gabaritJustificatif(faitsT);
  verifier('⭐ sans équipement, la charge nominale n’est PAS inventée à zéro',
    faitsT.chargeNominaleKg === null
    && !docT.includes('Charge nominale de l’équipement</span>'
      + '<span class="justif-valeur">0,00 kg</span>'),
    `chargeNominaleKg = ${JSON.stringify(faitsT.chargeNominaleKg)}`);
  verifier('… la case porte le tiret de l’absence, pas un chiffre',
    docT.includes('Charge nominale de l’équipement</span>'
      + '<span class="justif-valeur">—</span>'));
  verifier('… et la MASSE de l’écriture, elle, est bien là avec son signe',
    docT.includes('− 1,00 kg'),
    `quantiteKg = ${contreT.quantiteKg}`);
  verifier('… le bloc « détenteur » ne s’affiche pas sans équipement',
    faitsT.detenteur === null
    && !docT.includes('Détenteur de l’équipement'));
}

// ============================================================
// 2 ter. LE DÉTENTEUR EST UN TIERS, ET LE DOCUMENT LE DIT
//
// Constat de la revue du 27/07 : le seul nom d'entreprise imprimé était
// celui du LYCÉE, en tête, SANS étiquette de qualité — un lecteur pressé
// en concluait que le matériel lui appartient. L'ancien CERFA, lui,
// distinguait le cadre 1 (opérateur) du cadre 2 (détenteur).
// ============================================================
console.log('\n--- 2 ter. Opérateur et détenteur, deux qualités ---');

verifier('⭐ le DÉTENTEUR TIERS est nommé',
  document.includes('Boulangerie Le Fournil Lot1A')
  && faits.detenteur.tiers === true);
verifier('… avec son adresse et son SIRET',
  document.includes('4 quai du Port, 13002 Marseille')
  && document.includes('48291035700022'));
verifier('… et l’établissement porte SA qualité d’opérateur',
  document.includes('Opérateur — entreprise qui a réalisé l’opération '
    + 'annulée'));
verifier('… avec son n° d’attestation de capacité',
  document.includes('AC-13-000001'));
verifier('l’équipement est identifié (marque, modèle, n° de série)',
  document.includes('Profroid CF-6') && document.includes('SN-778899'));
verifier('le PRP FIGÉ à l’écriture est imprimé (il est au registre)',
  faits.prpFige === 2088 && document.includes('2088'));
verifier('… et l’équivalent CO₂ de la charge nominale, calculé, pas promis',
  document.includes('20,88 t CO₂'),
  `teqNominale = ${faits.teqNominale}`);
verifier('la CAUSE portée sur l’écriture annulée est imprimée',
  document.includes('Appoint après réparation'));

// Sans client détenteur, le repli sur l'établissement est celui du CERFA
// (cadre 2) — mais il est DIT, pour qu'on ne prenne pas une absence de
// client pour une propriété constatée.
{
  const sansClient = assemblerJustificatif({
    mouvement: contre,
    mouvements: await store.getMouvements(),
    machines: (await store.getMachines())
      .map((m) => ({ ...m, clientId: null })),
    bouteilles: await store.getBouteilles(),
    fluides: await store.getFluides(),
    personnel: await store.getPersonnel(),
    clients: await store.getClients(),
    etablissement: await store.getEtablissement()
  });
  verifier('sans client détenteur, le repli sur l’établissement est DIT',
    sansClient.detenteur.tiers === false
    && gabaritJustificatif(sansClient)
      .includes('Aucun client détenteur n’est enregistré'));
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

// ============================================================
// ⚠️⚠️ 3 bis. LA BOÎTE DE LA MODALE NE DOIT PLUS ROGNER LA FEUILLE
//
// CONSTAT TIRÉ le 27/07 (impression réelle, Chrome ET Edge) : le bouton
// « Imprimer » du logiciel sortait UNE page de 219 caractères au lieu de
// deux pages complètes de 2 703. Il n'y restait que le bandeau de mode,
// le titre et le sous-titre — le numéro de la fiche annulée, le motif,
// les trois masses, l'auteur et l'empreinte étaient ABSENTS DU PAPIER.
// La mention de mode, elle, survivait : le piège du 22ᵉ document était
// bien gardé, mais le DOCUMENT, lui, ne l'était pas.
//
// Le rognage vient des ANCÊTRES de la modale (max-height + overflow +
// backdrop-filter), pas du document. Ce que cette section garde :
//   ① chaque ancêtre que `modale()` pose est remis à plat ;
//   ② `views/communs.js` pose ENCORE ces classes-là — sans quoi la remise
//      à plat viserait à côté et la feuille redeviendrait muette SANS que
//      rien ne rougisse ;
//   ③ le `transform` de `.modale-fond.visible .modale`, qui bat la remise
//      à plat par spécificité, est réécrit : un ancêtre transformé devient
//      le bloc conteneur des descendants `position: fixed`, et le bandeau
//      répété cessait de se répéter.
// ============================================================
console.log('\n--- 3 bis. La modale ne rogne plus la feuille ---');

for (const classe of ANCETRES_MODALE) {
  verifier(`⭐ l’ancêtre .${classe} est remis à plat à l’impression`,
    new RegExp(`\\.${classe}[,\\s]`).test(CSS_IMPRESSION_APERCU));
}
for (const propriete of ['position: static', 'overflow: visible',
  'max-height: none', 'backdrop-filter: none']) {
  verifier(`⭐ … et la remise à plat porte « ${propriete} »`,
    CSS_IMPRESSION_APERCU.includes(propriete));
}
verifier('⭐ le transform de la modale est réécrit (bloc conteneur des '
  + 'éléments fixes, donc du bandeau répété)',
/\.modale-fond\.visible \.modale \{ transform: none; \}/
  .test(CSS_IMPRESSION_APERCU));
verifier('⭐ rien de l’application ne prend de place sur la feuille',
  /body > \* \{ display: none !important; \}/.test(CSS_IMPRESSION_APERCU)
  && /body > #zone-modales/.test(CSS_IMPRESSION_APERCU));

// ② La liste des ancêtres n'est pas une supposition : on relit le module
// qui les fabrique. Renommer une classe de la modale sans toucher ici
// rougit — c'était la seule façon que le correctif reste vrai.
{
  const sourceModale = readFileSync(
    new URL('../views/communs.js', import.meta.url), 'utf8');
  for (const classe of ANCETRES_MODALE) {
    if (classe === 'justif-apercu') continue; // posée par l'aperçu, pas par modale()
    verifier(`⭐ décor : modale() pose bien la classe .${classe}`,
      sourceModale.includes(`'${classe}'`)
      || sourceModale.includes(`"${classe}"`)
      || sourceModale.includes(`class="${classe}`)
      || sourceModale.includes(`class="${classe} `),
      `classe « ${classe} » introuvable dans views/communs.js`);
  }
}

// ============================================================
// 3 ter. UNE FEUILLE DÉTACHÉE PORTE SA MARQUE ET SON IDENTITÉ
//
// Avec les marges par défaut le document sort sur DEUX pages. La page 2
// ne portait ni mention de mode, ni filigrane de titre, ni numéro
// d'écriture : une feuille sans marque et sans identité.
// ============================================================
console.log('\n--- 3 ter. Chaque feuille porte sa marque ---');

verifier('⭐ le document porte un bandeau destiné à CHAQUE page',
  document.includes('class="justif-repere"'));
verifier('⭐ … il est DANS le nœud `.justif-document` (donc imprimé)',
  document.slice(ouverture).includes('class="justif-repere"'));
verifier('⭐ … il porte l’identité de l’écriture',
  document.includes(TITRE_JUSTIFICATIF + ' — écriture n° ' + contre.numero));
verifier('⭐ … et il porte la mention de mode',
  (document.split('class="justif-repere"')[1] ?? '')
    .includes(MENTION_FORMATION));
verifier('⭐ il est invisible À L’ÉCRAN (il n’a de sens que sur le papier)',
  /\.justif-repere \{ display: none; \}/.test(CSS_JUSTIFICATIF));
verifier('⭐ … et RÉPÉTÉ sur chaque feuille (position: fixed)',
  /@media print[\s\S]*\.justif-repere \{[\s\S]*?position: fixed;/
    .test(CSS_JUSTIFICATIF));
verifier('⭐ … avec la marge basse qui lui est réservée',
  /@page \{ margin: [^}]*\}/.test(CSS_JUSTIFICATIF));
verifier('un libellé ne part jamais sans sa valeur (empreinte SHA-256 '
  + 'orpheline en bas de page)',
/\.justif-ligne,[\s\S]*?break-inside: avoid/.test(CSS_JUSTIFICATIF));

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
// 6 bis. LES BORDS : LE DOUTE AJOUTE LA MARQUE, IL N'AFFIRME RIEN
//
// Trois constats de la revue du 27/07, tous TIRÉS :
//  — un mouvement SANS mode sortait un document sans AUCUNE marque
//    (repli `mode ?? 'OFFICIEL'`, c'est-à-dire le repli le plus ouvert) ;
//  — une écriture annulée non retrouvée faisait AFFIRMER au document
//    trois choses qu'il n'avait pas mesurées ;
//  — la mention sans signature promettait un nom (« nommé ci-dessus »)
//    qui pouvait manquer.
// ============================================================
console.log('\n--- 6 bis. Les bords : le doute marque, il n’affirme pas ---');

const sources = {
  mouvements: await store.getMouvements(),
  machines: await store.getMachines(),
  bouteilles: await store.getBouteilles(),
  fluides: await store.getFluides(),
  personnel: await store.getPersonnel(),
  clients: await store.getClients(),
  etablissement: await store.getEtablissement()
};

{
  const sansMode = assemblerJustificatif({
    ...sources, mouvement: { ...contre, mode: undefined }
  });
  const docSansMode = gabaritJustificatif(sansMode);
  verifier('⭐ mode ABSENT du registre : le document est MARQUÉ quand même',
    docSansMode.includes(MENTION_MODE_INDETERMINE),
    `mode retenu = ${JSON.stringify(sansMode.mode)}`);
  verifier('… et la marque ne prétend pas savoir que c’était de la formation',
    !docSansMode.includes(MENTION_FORMATION)
    && MENTION_MODE_INDETERMINE.includes('NON RENSEIGNÉ')
    && MENTION_MODE_INDETERMINE.includes('DOCUMENT NON OFFICIEL'));
  verifier('… la ligne « Mode » dit ce qu’on sait, pas ce qu’on suppose',
    docSansMode.includes('non renseigné au registre'));
}

{
  const orpheline = assemblerJustificatif({
    ...sources, mouvements: [], mouvement: contre
  });
  const docOrphelin = gabaritJustificatif(orpheline);
  verifier('⭐ écriture annulée non retrouvée : le document le DIT',
    orpheline.annuleeTrouvee === false
    && docOrphelin.includes('écriture annulée non retrouvée au registre '
      + 'fourni'));
  verifier('… et il n’AFFIRME plus ce qu’il n’a pas mesuré',
    !docOrphelin.includes('aucune (cette écriture n’en portait pas)')
    && !docOrphelin.includes('Masse de l’écriture annulée</span>'
      + '<span class="justif-valeur">non renseignée au registre</span>'));
  verifier('… la masse de la PRÉSENTE écriture, elle, reste imprimée',
    docOrphelin.includes('− 0,50 kg'));
}

{
  const sansAuteur = assemblerJustificatif({
    ...sources,
    mouvement: {
      ...contre, executeParId: null, validateurId: null, technicien: null
    }
  });
  verifier('⭐ auteur non résolu : la mention ne promet plus de nom',
    sansAuteur.auteur === null
    && !MENTION_SANS_SIGNATURE.includes('nommé ci-dessus')
    && MENTION_SANS_SIGNATURE.includes('scellée dans l’empreinte'));
}

{
  const sansEmpreinte = assemblerJustificatif({
    ...sources, mouvement: { ...contre, hashEcriture: null }
  });
  const docSansEmpreinte = gabaritJustificatif(sansEmpreinte);
  verifier('⭐ sans empreinte au registre, le document ne vante pas une '
    + 'preuve absente',
  !docSansEmpreinte.includes('elle porte sur l’ÉCRITURE au registre')
    && docSansEmpreinte.includes('le recoupement par empreinte n’est pas '
      + 'possible ici'));
}

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

// ============================================================
// 7 bis. LES AUTRES DOSSIERS SCELLÉS DISENT AUSSI CE QUI A CHANGÉ
//
// Constat de la revue du 27/07 : seul le dossier d'AUDIT avait reçu son
// paragraphe. Les dossiers MACHINE et FUITE passent par le sommaire
// GÉNÉRIQUE de `dossier-commun.js`, qui n'avait pas bougé : ils
// embarquaient des `regularisations/*.html` sans un mot, et le lecteur
// voyait une écriture du registre sans CERFA — donc une pièce manquante.
//
// Et le symétrique, tiré lui aussi : le paragraphe était posé SANS
// CONDITION dans le dossier d'audit. Sur une année sans contre-écriture,
// l'archive annonçait des fichiers qu'elle ne contenait pas.
// ============================================================
console.log('\n--- 7 bis. Les autres dossiers scellés le disent aussi ---');

{
  const dm = await genererDossierMachine(store, machine.id);
  const octetsDm = dm.blob instanceof Uint8Array
    ? dm.blob : new Uint8Array(await dm.blob.arrayBuffer());
  const entreesDm = lireZip(octetsDm);
  const nomsDm = entreesDm.map((e) => e.nom);
  const sommaireDm = new TextDecoder()
    .decode(entreesDm.find((e) => e.nom === '00-SOMMAIRE.txt').octets);
  verifier('le dossier MACHINE embarque bien un justificatif',
    nomsDm.some((n) => n.includes('regularisations/')),
    nomsDm.join(', '));
  verifier('⭐ … et SON sommaire explique ce que c’est',
    sommaireDm.includes('ÉCRITURES D\'ANNULATION')
    && sommaireDm.includes('ne donne plus lieu'));
  verifier('⭐ … le justificatif du dossier machine porte le DÉTENTEUR tiers',
    new TextDecoder().decode(
      entreesDm.find((e) => e.nom.includes('regularisations/')).octets)
      .includes('Boulangerie Le Fournil Lot1A'));
}

{
  // Une année SANS contre-écriture : le sommaire ne doit annoncer aucune
  // pièce de régularisation (sinon on fait chercher un fichier absent).
  const vide = await genererDossierAudit(store, 2024);
  const octetsVide = vide.blob instanceof Uint8Array
    ? vide.blob : new Uint8Array(await vide.blob.arrayBuffer());
  const entreesVide = lireZip(octetsVide);
  const sommaireVide = new TextDecoder()
    .decode(entreesVide.find((e) => e.nom === '00-SOMMAIRE.txt').octets);
  verifier('décor : l’année 2024 ne porte aucune écriture d’annulation',
    !entreesVide.some((e) => e.nom.includes('regularisations/')));
  verifier('⭐ … et le sommaire n’annonce alors AUCUN justificatif',
    !sommaireVide.includes('ÉCRITURES D\'ANNULATION')
    && !sommaireVide.includes('regularisations/'));
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
