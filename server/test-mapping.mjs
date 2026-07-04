// ============================================================
// Test du module de correspondance front ↔ SQL (V9-E0)
// Exécution : node server/test-mapping.mjs
//
// Trois verrous anti-dérive :
//  1. ALLER-RETOUR : pour chaque table, un objet front couvrant tous les
//     champs traduits vers SQL puis retraduits revient IDENTIQUE.
//  2. COUVERTURE DU SCHÉMA : toute colonne de server/schema.sql est soit
//     mappée, soit réservée serveur, soit d'une table documentée non
//     mappée — une migration qui ajoute une colonne sans la déclarer
//     dans mapping.js casse ce test.
//  3. COUVERTURE DU FRONT RÉEL : toute clé présente sur les objets du
//     DemoStore vivant est connue du mapping (mappée, calculée ou
//     divergence consignée).
// Node ≥ 18, sans DOM.
// ============================================================

import { readFileSync } from 'node:fs';
import mapping from './mapping.js';

const { TABLES, TABLES_NON_MAPPEES, DIVERGENCES, versSql, versFront } = mapping;

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

/** Vérifie qu'un appel synchrone LÈVE avec un message contenant `extrait`. */
function verifierLeve(libelle, fn, extrait = '') {
  try {
    fn();
    verifier(libelle, false, 'aucune erreur levée');
  } catch (erreur) {
    verifier(libelle,
      !extrait || String(erreur.message).includes(extrait),
      `message = « ${erreur.message} »`);
  }
}

/** Toutes les clés front connues d'une table (mappées, calculées, bloquées). */
function clesConnues(def) {
  return new Set([
    ...Object.keys(def.champs),
    ...Object.keys(def.champsLectureSeule ?? {}),
    ...(def.frontSeulement ?? []),
    ...Object.keys(def.bloquees ?? {})
  ]);
}

/** Toutes les colonnes SQL déclarées par une table du mapping. */
function colonnesDeclarees(def) {
  return new Set([
    ...Object.values(def.champs),
    ...Object.values(def.champsLectureSeule ?? {}),
    ...(def.sqlSeulement ?? [])
  ]);
}

// ============================================================
// 1. Aller-retour front → SQL → front fidèle, table par table
// ============================================================
function valeurEssai(def, cle) {
  if ((def.booleens ?? []).includes(cle)) return true;
  if ((def.tableauxJson ?? []).includes(cle)) return ['I', 'II'];
  const enumeration = def.valeurs?.[cle];
  if (enumeration) return Object.keys(enumeration)[0];
  if (cle.endsWith('Kg')) return 12.345;
  return `essai-${cle}`;
}

for (const [nomTable, def] of Object.entries(TABLES)) {
  const objet = {};
  for (const cle of Object.keys(def.champs)) {
    objet[cle] = valeurEssai(def, cle);
  }
  const ligne = versSql(nomTable, objet);
  const retour = versFront(nomTable, ligne);
  const clesIdentiques =
    JSON.stringify(Object.keys(objet).sort())
    === JSON.stringify(Object.keys(retour).sort());
  const valeursIdentiques = Object.keys(objet).every((cle) =>
    JSON.stringify(objet[cle]) === JSON.stringify(retour[cle]));
  verifier(`aller-retour fidèle : ${nomTable}`,
    clesIdentiques && valeursIdentiques,
    !clesIdentiques ? 'jeux de clés différents'
      : `valeur altérée : ${Object.keys(objet)
        .filter((c) => JSON.stringify(objet[c]) !== JSON.stringify(retour[c]))
        .join(', ')}`);
}

// Les null traversent sans se déformer.
{
  const ligne = versSql('machines', { localisation: null });
  verifier('null front → null SQL → null front',
    ligne.localisation === null
    && versFront('machines', ligne).localisation === null);
}

// ============================================================
// 2. Couverture du schéma SQL (schema.sql fait foi)
// ============================================================
const sqlSchema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

function extraireTablesDuSchema(sql) {
  const tables = {};
  const motsContrainte = new Set(['foreign', 'unique', 'check', 'primary',
    'constraint', 'references']);
  const re = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/g;
  let bloc;
  while ((bloc = re.exec(sql)) !== null) {
    const [, nom, corps] = bloc;
    const colonnes = [];
    for (const ligne of corps.split('\n')) {
      const colonne = ligne.trim()
        .match(/^([a-z_][a-z0-9_]*)\s+(TEXT|INTEGER|REAL|BLOB|NUMERIC)/i);
      if (colonne && !motsContrainte.has(colonne[1].toLowerCase())) {
        colonnes.push(colonne[1]);
      }
    }
    tables[nom] = colonnes;
  }
  return tables;
}

const tablesSchema = extraireTablesDuSchema(sqlSchema);
verifier('le schéma est lisible (au moins 10 tables extraites)',
  Object.keys(tablesSchema).length >= 10,
  `extraites : ${Object.keys(tablesSchema).length}`);

for (const [nomTable, colonnes] of Object.entries(tablesSchema)) {
  if (nomTable in TABLES_NON_MAPPEES) continue;
  const def = TABLES[nomTable];
  verifier(`la table ${nomTable} est mappée ou documentée non mappée`,
    def !== undefined);
  if (!def) continue;
  const declarees = colonnesDeclarees(def);
  const orphelines = colonnes.filter((c) => !declarees.has(c));
  verifier(`toutes les colonnes de ${nomTable} sont couvertes`,
    orphelines.length === 0, `non couvertes : ${orphelines.join(', ')}`);
  const fantomes = [...declarees].filter((c) => !colonnes.includes(c));
  verifier(`aucune colonne fantôme déclarée pour ${nomTable}`,
    fantomes.length === 0, `fantômes : ${fantomes.join(', ')}`);
}
for (const nomTable of Object.keys(TABLES)) {
  verifier(`la table mappée ${nomTable} existe dans le schéma`,
    nomTable in tablesSchema);
}
for (const nomTable of Object.keys(TABLES_NON_MAPPEES)) {
  verifier(`la table documentée non mappée ${nomTable} existe dans le schéma`,
    nomTable in tablesSchema);
}

// --- les traductions d'énumérations visent des valeurs RÉELLES des CHECK --
// (une faute de frappe dans une valeur SQL de valeurs{} passerait sinon)
function extraireChecksDuSchema(sql) {
  const parColonne = {};
  const re = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/g;
  let bloc;
  while ((bloc = re.exec(sql)) !== null) {
    const [, nomTable, corps] = bloc;
    const reCheck = /(\w+)\s+IN\s*\(((?:\s*'[^']*'\s*,?)+)\)/g;
    let check;
    while ((check = reCheck.exec(corps)) !== null) {
      const valeurs = [...check[2].matchAll(/'([^']*)'/g)].map((v) => v[1]);
      parColonne[`${nomTable}.${check[1]}`] = new Set(valeurs);
    }
  }
  return parColonne;
}
const checksSchema = extraireChecksDuSchema(sqlSchema);
for (const [nomTable, def] of Object.entries(TABLES)) {
  for (const [cle, enumeration] of Object.entries(def.valeurs ?? {})) {
    const colonne = def.champs[cle];
    const check = checksSchema[`${nomTable}.${colonne}`];
    if (!check) continue; // colonne sans CHECK : rien à confronter
    const horsCheck = Object.values(enumeration)
      .filter((v) => !check.has(v));
    verifier(`les traductions de ${nomTable}.${cle} visent des valeurs du CHECK`,
      horsCheck.length === 0, `hors CHECK : ${horsCheck.join(', ')}`);
  }
}

// ============================================================
// 3. Couverture des objets RÉELS du DemoStore
// ============================================================
const { creerStore } = await import('../v8/js/data/datastore.js');
const store = await creerStore();

// Le monde de démo naît sans BSFF, sans entrée de journal, et ses
// mouvements seedés ne portent pas les clés posées par mutation
// (dateSoumission, motifRejet, motif, hashPrecedent, ordreValidation…).
// On provoque TOUT le cycle pour éprouver la couverture des clés réelles.
let machineEssai;
{
  const fluide = (await store.getFluides())[0].code;
  const bouteille = await store.createBouteille({
    type: 'RECUPERATION', fluide, tareKg: 5, masseBruteKg: 6,
    contenanceMaxKg: 10
  });
  await store.deciderFluideRecupere(bouteille.id, 'DECHET', 'Test mapping');
  await store.createBsff({
    bouteilleId: bouteille.id, numeroBsff: 'BSFF-MAPPING-001',
    transporteur: 'Transports du Sud', installationDestination: 'Récupfluides',
    masseRemiseKg: 1
  });

  machineEssai = await store.createMachine({
    designation: 'Machine du mapping', fluide, chargeNominaleKg: 10,
    operateur: 'Test mapping'
  });
  const source = await store.createBouteille({
    type: 'NEUVE', fluide, tareKg: 10, masseBruteKg: 20, contenanceMaxKg: 12
  });
  const validateur = await store.getUtilisateurCourant();
  const mouvement = await store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId: machineEssai.id,
    bouteilleSrcId: source.id, peseeAvantKg: 20, peseeApresKg: 18,
    technicien: 'Test mapping'
  });
  await store.soumettreMouvement(mouvement.id);       // pose dateSoumission
  await store.rejeterMouvement(mouvement.id, 'Essai'); // pose motifRejet
  await store.soumettreMouvement(mouvement.id);
  await store.validerMouvement(mouvement.id, validateur.id); // scelle
  await store.annulerParContreEcriture(mouvement.id, 'Essai de mapping',
    validateur.id);                                    // pose motif
  await store.ajouterPieceJointe({
    entiteType: 'MACHINE', entiteId: machineEssai.id, categorie: 'AUTRE',
    nomFichier: 'essai.png', mimeType: 'image/png',
    base64: Buffer.from('essai mapping').toString('base64')
  });
}

/** Union des clés présentes sur tous les éléments d'une collection. */
function unionDesCles(collection) {
  const cles = new Set();
  for (const objet of collection) {
    for (const cle of Object.keys(objet ?? {})) cles.add(cle);
  }
  return cles;
}

const COLLECTIONS = [
  ['machines', await store.getMachines()],
  ['bouteilles', await store.getBouteilles()],
  ['mouvements', await store.getMouvements()],
  ['controles', await store.getControles()],
  ['personnel', await store.getPersonnel()],
  ['clients_detenteurs', await store.getClients()],
  ['outillage', await store.getOutillage()],
  ['fluides', await store.getFluides()],
  ['audits_etablissement', await store.getAuditsOrganisme()],
  ['non_conformites', await store.getNonConformites()],
  ['bsff', await store.getBsff()],
  ['journal_audit', await store.getJournalAudit()],
  ['etablissements', [await store.getEtablissement()]],
  ['pieces_jointes',
    await store.listerPiecesJointes('MACHINE', machineEssai.id)]
];

for (const [nomTable, collection] of COLLECTIONS) {
  if (collection.length === 0) {
    console.log(`  --  ${nomTable} : collection vide dans le monde de démo, ` +
      'couverture front non évaluable');
    continue;
  }
  const connues = clesConnues(TABLES[nomTable]);
  const inconnues = [...unionDesCles(collection)]
    .filter((cle) => !connues.has(cle));
  verifier(`toutes les clés réelles de ${nomTable} sont connues du mapping ` +
    `(${collection.length} objet(s))`,
    inconnues.length === 0, `inconnues : ${inconnues.join(', ')}`);
}

// ============================================================
// 4. Traductions d'énumérations et de types
// ============================================================
verifier('detectionPermanente : booléen → 0/1 → booléen',
  versSql('machines', { detectionPermanente: true }).detection_permanente === 1
  && versFront('machines', { detection_permanente: 0 })
    .detectionPermanente === false);
verifier('résultat de contrôle : FUITE ↔ FUITE_DETECTEE',
  versSql('controles', { resultat: 'FUITE' }).resultat === 'FUITE_DETECTEE'
  && versFront('controles', { resultat: 'FUITE_DETECTEE' })
    .resultat === 'FUITE');
verifier('type de personne : INTERVENANT_EXT ↔ INTERVENANT_EXTERIEUR',
  versSql('personnel', { typePersonne: 'INTERVENANT_EXT' })
    .type_personne === 'INTERVENANT_EXTERIEUR');
verifier('type d’outil : DETECTEUR ↔ DETECTEUR_FUITE',
  versSql('outillage', { typeOutil: 'DETECTEUR' }).type === 'DETECTEUR_FUITE');
verifier('statut machine : ARRETEE ↔ ARRETE',
  versSql('machines', { statut: 'ARRETEE' }).statut === 'ARRETE'
  && versFront('machines', { statut: 'ARRETE' }).statut === 'ARRETEE');
verifier('statut de non-conformité : SOLDEE ↔ CLOTUREE',
  versSql('non_conformites', { statut: 'SOLDEE' }).statut === 'CLOTUREE');
verifier('tableau front → TEXT JSON → tableau',
  versSql('personnel', { activitesAutorisees: ['MANIPULATION'] })
    .activites_autorisees === '["MANIPULATION"]'
  && JSON.stringify(versFront('personnel',
    { activites_autorisees: '["MANIPULATION"]' }).activitesAutorisees)
    === '["MANIPULATION"]');
verifier('la masse nette (colonne générée) se lit mais ne s’écrit pas',
  versFront('bouteilles', { masse_nette_kg: 7.5 }).masseNetteKg === 7.5
  && !('masse_nette_kg' in versSql('bouteilles', { masseNetteKg: 7.5 })));

// ============================================================
// 5. Les garde-fous lèvent des erreurs explicites
// ============================================================
verifierLeve('un statut machine sans valeur SQL (FUITE) est refusé',
  () => versSql('machines', { statut: 'FUITE' }), 'sans équivalent SQL');
verifierLeve('une valeur pathologique (constructor) est refusée, pas héritée',
  () => versSql('machines', { statut: 'constructor' }), 'sans équivalent SQL');
verifierLeve('un champ en divergence (hashPrecedent) est refusé',
  () => versSql('mouvements', { hashPrecedent: 'abc' }), 'non transposable');
verifierLeve('le roleApp (enum SQL désaccordé) est refusé',
  () => versSql('personnel', { roleApp: 'REFERENT' }), 'non transposable');
verifierLeve('une clé front inconnue est refusée (anti-dérive)',
  () => versSql('machines', { cleFarfelue: 1 }), 'inconnue');
verifierLeve('une colonne SQL inconnue est refusée (anti-dérive)',
  () => versFront('machines', { colonne_farfelue: 1 }), 'inconnue');
verifierLeve('une table inconnue est refusée',
  () => versSql('table_mysterieuse', {}), 'Table inconnue');

verifier('les divergences sont consignées et datées d’un incrément',
  Array.isArray(DIVERGENCES) && DIVERGENCES.length >= 10
  && DIVERGENCES.every((d) => d.objet && d.constat && d.echeance));

// ============================================================
// Verdict
// ============================================================
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Correspondance front ↔ SQL : tout est vert.');
