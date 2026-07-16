// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test du module de correspondance front ↔ SQL (V9-E0, refondu E1)
// Exécution : node server/test-mapping.mjs
//
// Quatre verrous anti-dérive :
//  1. ALLER-RETOUR : pour chaque table, un objet front couvrant tous les
//     champs traduits vers SQL puis retraduits revient IDENTIQUE.
//  2. COUVERTURE DE LA BASE RÉELLE : la base est créée par db.js
//     (schema.sql v1 + migrations) puis introspectée — toute colonne
//     réelle est mappée, réservée serveur, ou d'une table documentée non
//     mappée. Une migration qui ajoute une colonne sans la déclarer dans
//     mapping.js casse ce test.
//  3. COUVERTURE DU FRONT RÉEL : toute clé présente sur les objets du
//     DemoStore vivant (cycle de mutation complet provoqué) est connue.
//  4. CONTRAT ↔ CHECK : les énumérations du contrat (contrat.js) sont
//     acceptées par les CHECK de la base réelle.
// Node ≥ 22 (node:sqlite), sans DOM.
// ============================================================

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mapping from './mapping.js';
import db from './db.js';
import { TYPES_MOUVEMENT, STATUTS_MOUVEMENT, ROLES_VALIDEURS }
  from '../v8/js/data/contrat.js';

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
  if (cle === 'annee') return 2026;
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
// 2. Couverture de la BASE RÉELLE (schema.sql v1 + migrations)
// ============================================================
const DOSSIER = mkdtempSync(join(tmpdir(), 'inerweb-fluide-mapping-'));
const baseReelle = db.ouvrir(join(DOSSIER, 'carte.db'));

const tablesReelles = baseReelle.prepare(
  "SELECT name FROM sqlite_master WHERE type = 'table' " +
  "AND name NOT LIKE 'sqlite_%'").all().map((r) => r.name);
verifier('la base réelle expose au moins 15 tables',
  tablesReelles.length >= 15, `trouvées : ${tablesReelles.length}`);

for (const nomTable of tablesReelles) {
  if (nomTable in TABLES_NON_MAPPEES) continue;
  const def = TABLES[nomTable];
  verifier(`la table ${nomTable} est mappée ou documentée non mappée`,
    def !== undefined);
  if (!def) continue;
  // table_xinfo (et non table_info) : les colonnes GÉNÉRÉES virtuelles
  // (masse_nette_kg, tco2eq) sont masquées par table_info.
  const colonnes = baseReelle.prepare(`PRAGMA table_xinfo(${nomTable})`)
    .all().map((c) => c.name);
  const declarees = colonnesDeclarees(def);
  const orphelines = colonnes.filter((c) => !declarees.has(c));
  verifier(`toutes les colonnes réelles de ${nomTable} sont couvertes`,
    orphelines.length === 0, `non couvertes : ${orphelines.join(', ')}`);
  const fantomes = [...declarees].filter((c) => !colonnes.includes(c));
  verifier(`aucune colonne fantôme déclarée pour ${nomTable}`,
    fantomes.length === 0, `fantômes : ${fantomes.join(', ')}`);
}
for (const nomTable of Object.keys(TABLES)) {
  verifier(`la table mappée ${nomTable} existe dans la base réelle`,
    tablesReelles.includes(nomTable));
}
for (const nomTable of Object.keys(TABLES_NON_MAPPEES)) {
  verifier(`la table documentée non mappée ${nomTable} existe dans la base réelle`,
    tablesReelles.includes(nomTable));
}

// ============================================================
// 3. Les CHECK de la base acceptent les énumérations du CONTRAT
// ============================================================
function valeursCheck(nomTable, colonne) {
  const sql = baseReelle.prepare(
    'SELECT sql FROM sqlite_master WHERE name = ?').get(nomTable)?.sql ?? '';
  // Frontière de mot à gauche : sans elle, « ancien_statut IN (…) » serait
  // pris pour le CHECK de « statut » (revue E1).
  const motif = new RegExp(
    `(?:^|[^A-Za-z0-9_])${colonne}\\s+IN\\s*\\(((?:\\s*'[^']*'\\s*,?)+)\\)`);
  const trouve = sql.match(motif);
  if (!trouve) return null;
  return new Set([...trouve[1].matchAll(/'([^']*)'/g)].map((v) => v[1]));
}

const EXIGENCES_CHECK = [
  ['mouvements', 'type_operation', TYPES_MOUVEMENT],
  ['mouvements', 'statut', STATUTS_MOUVEMENT],
  ['machines', 'statut',
    ['EN_SERVICE', 'ARRETEE', 'DEMANTELEE', 'FUITE', 'CONTROLE_DU']],
  ['controles', 'resultat', ['CONFORME', 'FUITE']],
  ['personnel', 'role_applicatif', [...ROLES_VALIDEURS, 'ELEVE']],
  ['personnel', 'type_personne',
    ['SALARIE', 'ENSEIGNANT', 'ELEVE', 'SOUS_TRAITANT', 'INTERVENANT_EXT']],
  ['outillage', 'type',
    ['STATION_RECUPERATION', 'STATION_CHARGE', 'BALANCE', 'DETECTEUR',
      'POMPE_A_VIDE', 'MANIFOLD', 'THERMOMETRE', 'BOUTEILLE_RECUP',
      'FLEXIBLE', 'EPI', 'AUTRE']],
  ['bouteilles', 'type', ['NEUVE', 'RECUPERATION']],
  ['bouteilles', 'etat_fluide', ['VIERGE', 'RECUPERE', 'DECHET']],
  ['bouteilles', 'statut', ['EN_STOCK', 'EN_SERVICE', 'DECHET', 'RETOURNEE']],
  ['bouteilles', 'decision_fluide', ['REUTILISABLE', 'A_ANALYSER', 'DECHET']],
  ['non_conformites', 'statut', ['OUVERTE', 'SOLDEE']]
];
for (const [nomTable, colonne, attendues] of EXIGENCES_CHECK) {
  const check = valeursCheck(nomTable, colonne);
  const manquantes = check
    ? attendues.filter((v) => !check.has(v))
    : attendues;
  verifier(`le CHECK ${nomTable}.${colonne} accepte les valeurs du contrat`,
    check !== null && manquantes.length === 0,
    check ? `refusées : ${manquantes.join(', ')}` : 'CHECK introuvable');
}

// ============================================================
// 4. Couverture des objets RÉELS du DemoStore
// ============================================================
const { creerStore } = await import('../v8/js/data/datastore.js');
const store = await creerStore();

// Le monde de démo naît sans BSFF, sans journal, sans inventaire ni retour
// fournisseur, et ses mouvements seedés ne portent pas les clés posées par
// mutation. On provoque TOUT le cycle pour éprouver les clés réelles.
let machineEssai;
let retourCr3;
let retourVidage;
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

  // Branche CR-3 : un mouvement avec contrôle DÉCLARÉ crée un vrai
  // contrôle croisé (controles[].mouvementId + controle.controleId).
  const detecteur = (await store.getOutillage())
    .find((o) => o.typeOutil === 'DETECTEUR');
  const mouvementControle = await store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId: machineEssai.id,
    bouteilleSrcId: source.id, peseeAvantKg: 18, peseeApresKg: 17,
    technicien: 'Test mapping',
    controle: { statutControle: 'CONFORME', detecteurId: detecteur?.id ?? null }
  });
  await store.soumettreMouvement(mouvementControle.id);
  retourCr3 = await store.validerMouvement(mouvementControle.id, validateur.id);

  // Branche « vidage » : la récupération qui vide la machine pose le champ
  // éphémère proposerDemantelement sur la copie retournée.
  const bRecup = await store.createBouteille({
    type: 'RECUPERATION', fluide, tareKg: 5, masseBruteKg: 5,
    contenanceMaxKg: 10
  });
  const mouvementVidage = await store.creerMouvement({
    type: 'RECUPERATION_DEMANTELEMENT', machineId: machineEssai.id,
    bouteilleDstId: bRecup.id, peseeAvantKg: 5, peseeApresKg: 6,
    technicien: 'Test mapping'
  });
  await store.soumettreMouvement(mouvementVidage.id);
  retourVidage = await store.validerMouvement(mouvementVidage.id, validateur.id);

  await store.retournerFournisseur(source.id, 'Test mapping');
  await store.ajouterPieceJointe({
    entiteType: 'MACHINE', entiteId: machineEssai.id, categorie: 'AUTRE',
    nomFichier: 'essai.png', mimeType: 'image/png',
    // Vraie signature PNG 1×1 : le store vérifie les octets réels (audit-proof).
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk'
      + 'YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  });
  const annee = new Date().getFullYear();
  const balance = await store.getBalanceMatiere(annee);
  const ligne = balance.lignes.find((l) => l.fluide === fluide);
  await store.saisirInventaire(annee,
    [{ fluide, stockReelKg: ligne.stockTheoriqueKg + 0.5 }], 'Test mapping');
  await store.justifierEcart(annee, fluide, 'Essai de mapping.');
}

// Les collections sans lecture dédiée (stocks initiaux, inventaires,
// justifications) sont prises dans l'export : formes front réelles.
const donneesExport = JSON.parse(await store.exporterJSON()).donnees;

/** Union des clés présentes sur tous les éléments d'une collection. */
function unionDesCles(collection) {
  const cles = new Set();
  for (const objet of collection) {
    for (const cle of Object.keys(objet ?? {})) cles.add(cle);
  }
  return cles;
}

verifier('la branche « vidage » pose bien le champ éphémère à éprouver',
  retourVidage?.proposerDemantelement === true);
verifier('la branche CR-3 croise bien contrôle et mouvement',
  typeof retourCr3?.controle?.controleId === 'string');

const COLLECTIONS = [
  ['machines', await store.getMachines()],
  ['bouteilles', await store.getBouteilles()],
  // Les copies RETOURNÉES par validerMouvement portent des clés que les
  // objets relus n'ont pas (proposerDemantelement) : on les éprouve aussi.
  ['mouvements', [...await store.getMouvements(), retourCr3, retourVidage]],
  ['controles', await store.getControles()],
  ['personnel', await store.getPersonnel()],
  ['clients_detenteurs', await store.getClients()],
  ['outillage', await store.getOutillage()],
  ['fluides', await store.getFluides()],
  ['audits_etablissement', await store.getAuditsOrganisme()],
  ['non_conformites', await store.getNonConformites()],
  ['bsff', await store.getBsff()],
  ['retours_fournisseur', await store.getRetoursFournisseur()],
  ['journal_audit', await store.getJournalAudit()],
  ['etablissements', [await store.getEtablissement()]],
  ['pieces_jointes',
    await store.listerPiecesJointes('MACHINE', machineEssai.id)],
  ['stocks_initiaux', donneesExport.stocksInitiaux ?? []],
  ['inventaires', donneesExport.inventaires ?? []],
  ['justifications_ecarts', donneesExport.justificationsEcarts ?? []]
];

for (const [nomTable, collection] of COLLECTIONS) {
  if (collection.length === 0) {
    verifier(`couverture front de ${nomTable}`, false,
      'collection vide : la couverture n\'est pas éprouvée (provoquer un objet)');
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
// 5. Traductions et conversions de types
// ============================================================
verifier('detectionPermanente : booléen → 0/1 → booléen',
  versSql('machines', { detectionPermanente: true }).detection_permanente === 1
  && versFront('machines', { detection_permanente: 0 })
    .detectionPermanente === false);
verifier('les enums du contrat passent tels quels (identité depuis E1)',
  versSql('machines', { statut: 'FUITE' }).statut === 'FUITE'
  && versSql('controles', { resultat: 'FUITE' }).resultat === 'FUITE'
  && versSql('outillage', { typeOutil: 'DETECTEUR' }).type === 'DETECTEUR'
  && versSql('personnel', { typePersonne: 'INTERVENANT_EXT' })
    .type_personne === 'INTERVENANT_EXT'
  && versSql('non_conformites', { statut: 'SOLDEE' }).statut === 'SOLDEE');
verifier('les renommages structurants tiennent (date, chaîne, rôle)',
  'date_mouvement' in versSql('mouvements', { date: '2026-07-04' })
  && 'hash_precedent' in versSql('mouvements', { hashPrecedent: 'a'.repeat(64) })
  && 'ordre_validation' in versSql('mouvements', { ordreValidation: 3 })
  && 'role_applicatif' in versSql('personnel', { roleApp: 'REFERENT' })
  && 'mime_type' in versSql('pieces_jointes', { mimeType: 'image/png' })
  && 'mouvement_id' in versSql('controles', { mouvementId: 'mvt-x' })
  && 'commentaire_solde' in versSql('non_conformites',
    { commentaireSolde: 'preuve' }));
verifier('tableau front → TEXT JSON → tableau',
  versSql('personnel', { activitesAutorisees: ['MANIPULATION'] })
    .activites_autorisees === '["MANIPULATION"]'
  && JSON.stringify(versFront('personnel',
    { activites_autorisees: '["MANIPULATION"]' }).activitesAutorisees)
    === '["MANIPULATION"]');
verifier('sitesCouverts (tableau) est sérialisé, jamais altéré en chaîne',
  versSql('etablissements', { sitesCouverts: ['Atelier', 'Labo'] })
    .sites_couverts === '["Atelier","Labo"]');
verifier('la masse nette (colonne générée) se lit mais ne s\'écrit pas',
  versFront('bouteilles', { masse_nette_kg: 7.5 }).masseNetteKg === 7.5
  && !('masse_nette_kg' in versSql('bouteilles', { masseNetteKg: 7.5 })));

// ============================================================
// 6. Les garde-fous lèvent des erreurs explicites
// ============================================================
verifierLeve('l\'objet imbriqué mouvements.controle reste bloqué (E3)',
  () => versSql('mouvements', { controle: { statutControle: 'SANS_OBJET' } }),
  'non transposable');
verifier('le journal du contrat se traduit en entier depuis E2',
  (() => {
    const ligne = versSql('journal_audit', { date: '2026-07-04T18:00:00.000Z',
      qui: 'Testeur', action: 'ESSAI', cible: 'M1', details: 'détail' });
    return ligne.date_heure === '2026-07-04T18:00:00.000Z'
      && ligne.cible === 'M1' && ligne.details === 'détail';
  })());
verifierLeve('une clé front inconnue est refusée (anti-dérive)',
  () => versSql('machines', { cleFarfelue: 1 }), 'inconnue');
verifierLeve('une clé pathologique (constructor) est refusée, pas héritée',
  () => versSql('machines', { constructor: 1 }), 'inconnue');
verifierLeve('une colonne SQL inconnue est refusée (anti-dérive)',
  () => versFront('machines', { colonne_farfelue: 1 }), 'inconnue');
verifierLeve('une table inconnue est refusée',
  () => versSql('table_mysterieuse', {}), 'Table inconnue');

verifier('les divergences restantes sont consignées et datées d\'un incrément',
  Array.isArray(DIVERGENCES) && DIVERGENCES.length >= 4
  && DIVERGENCES.every((d) => d.objet && d.constat && d.echeance));

// ============================================================
// Verdict
// ============================================================
db.fermer();
rmSync(DOSSIER, { recursive: true, force: true });
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Correspondance front ↔ SQL : tout est vert.');
