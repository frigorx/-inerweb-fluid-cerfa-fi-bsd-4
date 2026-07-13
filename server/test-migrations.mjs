// ============================================================
// Test du versionnage de la base SQLite (V9-E1)
// Exécution : node server/test-migrations.mjs
//
// Éprouve : la création du socle v1 sur base vierge, la boucle de
// migrations user_version (002 sites, 003 codes publics), l'idempotence
// à la réouverture, le refus d'une base pré-versionnage, le rollback
// transactionnel d'une migration qui échoue, les verrous WORM du
// registre, l'alignement des CHECK sur le contrat DataStore (E0),
// les nouvelles tables de la balance matière et la vue bilan_matiere.
// Node ≥ 22 (node:sqlite), sans DOM.
// ============================================================

import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import db from './db.js';
import migrations from './migrations.js';

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

const PROCHE = (a, b) => Math.abs(a - b) < 1e-9;
const DOSSIER = mkdtempSync(join(tmpdir(), 'inerweb-fluide-migrations-'));
const CHEMIN_NEUVE = join(DOSSIER, 'neuve.db');
const CHEMIN_LEGACY = join(DOSSIER, 'legacy.db');

// ============================================================
// 1. Base vierge : socle v1 + migrations jusqu'à la cible
// ============================================================
const base = db.ouvrir(CHEMIN_NEUVE);
const versionApresOuverture = migrations.lireVersion(base);
verifier(`une base vierge est portée à la version cible (${migrations.versionCible()})`,
  versionApresOuverture === migrations.versionCible());

function colonnes(table) {
  return base.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}
verifier('la table sites existe (migration 002)',
  base.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name = 'sites'")
    .get().n === 1);
verifier('machines porte site_id (002) et code_public (003)',
  colonnes('machines').includes('site_id')
  && colonnes('machines').includes('code_public'));
verifier('bouteilles porte code_public (003)',
  colonnes('bouteilles').includes('code_public'));
verifier('le référentiel des fluides est semé (9 fluides)',
  base.prepare('SELECT count(*) AS n FROM fluides').get().n === 9);
verifier('les colonnes de chaîne du registre existent (E0 → E1)',
  ['hash_precedent', 'ordre_validation', 'date_soumission', 'motif_rejet',
    'motif', 'signature_data_url', 'machine_label', 'technicien',
    'statut_controle_declare', 'controle_lie_id']
    .every((c) => colonnes('mouvements').includes(c)));
verifier('les tables de la balance matière existent',
  ['retours_fournisseur', 'stocks_initiaux', 'inventaires',
    'justifications_ecarts'].every((t) =>
    base.prepare('SELECT count(*) AS n FROM sqlite_master WHERE name = ?')
      .get(t).n === 1));

// ============================================================
// 2. Réouverture : idempotente, version conservée
// ============================================================
db.fermer();
const base2 = db.ouvrir(CHEMIN_NEUVE);
verifier('la réouverture est idempotente (version conservée, aucune erreur)',
  migrations.lireVersion(base2) === migrations.versionCible());

// ============================================================
// 3. Verrous WORM du registre (déclencheurs)
// ============================================================
base2.exec(`INSERT INTO etablissements (id, raison_sociale)
            VALUES ('ETB-TEST', 'Lycée du test');`);
const insererMouvement = base2.prepare(`
  INSERT INTO mouvements (id, numero, etablissement_id, date_mouvement,
    mode, type_operation, fluide, quantite_calculee_kg, statut,
    hash_ecriture, hash_precedent, ordre_validation)
  VALUES (?, ?, 'ETB-TEST', '2026-07-04', 'FORMATION', 'CHARGE_APPOINT',
    'R-410A', ?, ?, ?, ?, ?)`);
insererMouvement.run('MVT-T1', 'FORM-2026-0001', 2, 'VALIDE', 'a'.repeat(64), null, 1);

verifierLeve('modifier une écriture VALIDE est bloqué par déclencheur',
  () => base2.exec(
    "UPDATE mouvements SET quantite_calculee_kg = 99 WHERE id = 'MVT-T1';"),
  'Registre verrouillé');
verifierLeve('supprimer une écriture VALIDE est bloqué par déclencheur',
  () => base2.exec("DELETE FROM mouvements WHERE id = 'MVT-T1';"),
  'Registre verrouillé');
base2.exec("UPDATE mouvements SET statut = 'ANNULE' WHERE id = 'MVT-T1';");
verifier('la seule transition admise (VALIDE → ANNULE, contenu intact) passe',
  base2.prepare("SELECT statut FROM mouvements WHERE id = 'MVT-T1'")
    .get().statut === 'ANNULE');
verifierLeve('une écriture ANNULE est totalement figée',
  () => base2.exec(
    "UPDATE mouvements SET observation = 'retouche' WHERE id = 'MVT-T1';"),
  'figée');
insererMouvement.run('MVT-T2', 'FORM-2026-0002', null, 'BROUILLON', null, null, null);
base2.exec("DELETE FROM mouvements WHERE id = 'MVT-T2';");
verifier('un BROUILLON reste supprimable (CR-1)',
  base2.prepare("SELECT count(*) AS n FROM mouvements WHERE id = 'MVT-T2'")
    .get().n === 0);

verifierLeve('deux écritures ne peuvent pas porter le même rang de scellement',
  () => insererMouvement.run('MVT-T3', 'FORM-2026-0003', 1, 'VALIDE',
    'b'.repeat(64), 'a'.repeat(64), 1),
  'UNIQUE');

// --- le trou REPLACE (revue adversariale E1) : sans recursive_triggers,
// --- le DELETE implicite d'un REPLACE ne déclenche pas les BEFORE DELETE.
verifier('recursive_triggers est actif (préalable du verrou anti-REPLACE)',
  base2.prepare('PRAGMA recursive_triggers').get().recursive_triggers === 1);
insererMouvement.run('MVT-T4', 'FORM-2026-0004', 3, 'VALIDE',
  'c'.repeat(64), 'a'.repeat(64), 2);
verifierLeve('INSERT OR REPLACE ne remplace pas une écriture scellée',
  () => base2.exec(`INSERT OR REPLACE INTO mouvements (id, numero,
      etablissement_id, date_mouvement, mode, type_operation, statut,
      quantite_calculee_kg)
    VALUES ('MVT-T4', 'FORM-2026-0004', 'ETB-TEST', '2026-07-04',
      'FORMATION', 'CHARGE_APPOINT', 'VALIDE', 999);`),
  'Registre verrouillé');
insererMouvement.run('MVT-T5', 'FORM-2026-0005', null, 'BROUILLON',
  null, null, null);
verifierLeve('UPDATE OR REPLACE ne peut pas évincer un scellé par son numéro',
  () => base2.exec(`UPDATE OR REPLACE mouvements
    SET numero = 'FORM-2026-0004' WHERE id = 'MVT-T5';`),
  'Registre verrouillé');
verifierLeve('VALIDE → ANNULE avec contenu retouché dans la même passe est bloqué',
  () => base2.exec(`UPDATE mouvements SET statut = 'ANNULE',
    quantite_calculee_kg = 777 WHERE id = 'MVT-T4';`),
  'Registre verrouillé');
verifier('l’écriture scellée est restée intacte après les trois assauts',
  PROCHE(base2.prepare(
    "SELECT quantite_calculee_kg AS q FROM mouvements WHERE id = 'MVT-T4'")
    .get().q, 3));
base2.exec("DELETE FROM mouvements WHERE id = 'MVT-T5';");

// --- garde anti-migration : le déclencheur VALIDE→ANNULE doit couvrir
// --- TOUTES les colonnes de mouvements (une future migration qui ajoute
// --- une colonne sans étendre la liste casse ce test).
{
  const sqlDeclencheur = base2.prepare(`SELECT sql FROM sqlite_master
    WHERE name = 'mouvements_interdire_modification_validee'`).get().sql;
  const nonCouvertes = base2.prepare('PRAGMA table_xinfo(mouvements)').all()
    .map((c) => c.name)
    .filter((c) => c !== 'statut' && !sqlDeclencheur.includes(`NEW.${c}`));
  verifier('le déclencheur VALIDE→ANNULE couvre toutes les colonnes du registre',
    nonCouvertes.length === 0, `non couvertes : ${nonCouvertes.join(', ')}`);
}

// Depuis E2, TOUT passe par journaliser (une ligne sans hash = anomalie).
db.journaliser({ qui: 'système', action: 'TEST_MIGRATIONS' });
verifierLeve('le journal d’audit refuse toute modification',
  () => base2.exec("UPDATE journal_audit SET action = 'RETOUCHE';"),
  'ajout seul');
verifierLeve('le journal d’audit refuse toute suppression',
  () => base2.exec('DELETE FROM journal_audit;'),
  'ajout seul');

// --- E2 : le journal CHAÎNÉ — le vrai passage démo → coffre-fort ---------
verifier('le journal porte les colonnes du chaînage (migration 004)',
  (() => {
    const noms = base2.prepare('PRAGMA table_xinfo(journal_audit)').all()
      .map((c) => c.name);
    return ['cible', 'details', 'hash_precedent', 'hash']
      .every((c) => noms.includes(c));
  })());
verifierLeve('journaliser exige une action',
  () => db.journaliser({ qui: 'Testeur', action: '  ' }), 'obligatoire');
const HEX_64 = /^[0-9a-f]{64}$/;
const empreintes = [
  db.journaliser({ qui: 'Testeur', action: 'CREATION_MACHINE',
    cible: 'M-TEST', details: 'première entrée chaînée' }),
  db.journaliser({ action: 'VALIDATION_MOUVEMENT', cible: 'FORM-2026-0001' }),
  db.journaliser({ qui: 'Testeur', action: 'SAISIE_INVENTAIRE' })
];
verifier('chaque entrée chaînée porte une empreinte SHA-256',
  empreintes.every((h) => HEX_64.test(h)));
{
  const entrees = base2.prepare(
    'SELECT * FROM journal_audit ORDER BY id').all();
  verifier('la chaîne du journal se tisse (hash_precedent de proche en proche)',
    entrees.length === 4 && entrees[0].hash_precedent === null
    && entrees.every((e, i) => HEX_64.test(e.hash)
      && (i === 0 || e.hash_precedent === entrees[i - 1].hash)));
  verifier('qui absent → « système » (convention du contrat)',
    entrees.find((e) => e.action === 'VALIDATION_MOUVEMENT')
      .utilisateur === 'système');
}
verifier('verifierChaineJournal valide une chaîne intacte',
  (() => { const v = db.verifierChaineJournal();
    return v.ok === true && v.casseA === null; })());

// Ré-entrance (revue E2) : journaliser DANS une transaction ouverte rejoint
// le tout-ou-rien de l'appelant au lieu de le saborder.
db.transaction((bdd) => {
  bdd.prepare("INSERT INTO parametres (cle, valeur) VALUES (?, ?)")
    .run('essai_reentrance', 'oui');
  db.journaliser({ qui: 'Testeur', action: 'ESSAI_REENTRANCE' });
});
verifier('journaliser rejoint une transaction ouverte (mutation + journal atomiques)',
  base2.prepare("SELECT valeur FROM parametres WHERE cle = 'essai_reentrance'")
    .get()?.valeur === 'oui'
  && db.verifierChaineJournal().ok === true
  && base2.prepare(`SELECT count(*) AS n FROM journal_audit
      WHERE action = 'ESSAI_REENTRANCE'`).get().n === 1);
verifierLeve('une panne dans la transaction annule mutation ET journal d’un bloc',
  () => db.transaction((bdd) => {
    bdd.prepare("INSERT INTO parametres (cle, valeur) VALUES (?, ?)")
      .run('essai_rollback', 'non');
    db.journaliser({ qui: 'Testeur', action: 'JAMAIS_COMMITEE' });
    throw new Error('panne simulée après journalisation');
  }), 'panne simulée');
verifier('après le rollback : ni paramètre, ni entrée de journal, chaîne intacte',
  base2.prepare("SELECT count(*) AS n FROM parametres WHERE cle = 'essai_rollback'")
    .get().n === 0
  && base2.prepare(`SELECT count(*) AS n FROM journal_audit
      WHERE action = 'JAMAIS_COMMITEE'`).get().n === 0
  && db.verifierChaineJournal().ok === true);

// Altération de hash_precedent SEUL, par outil externe : détectée puis réparée.
{
  const declencheurs = base2.prepare(`SELECT name, sql FROM sqlite_master
    WHERE type = 'trigger' AND tbl_name = 'journal_audit'`).all();
  for (const d of declencheurs) base2.exec(`DROP TRIGGER ${d.name};`);
  const deuxieme = base2.prepare(
    'SELECT id, hash_precedent FROM journal_audit ORDER BY id LIMIT 1 OFFSET 1')
    .get();
  base2.prepare('UPDATE journal_audit SET hash_precedent = ? WHERE id = ?')
    .run('f'.repeat(64), deuxieme.id);
  const verdictAltere = db.verifierChaineJournal();
  verifier('une altération du seul hash_precedent casse la chaîne au bon endroit',
    verdictAltere.ok === false && verdictAltere.casseA === deuxieme.id,
    `verdict = ${JSON.stringify(verdictAltere)}`);
  base2.prepare('UPDATE journal_audit SET hash_precedent = ? WHERE id = ?')
    .run(deuxieme.hash_precedent, deuxieme.id);
  verifier('chaîne redevenue intacte après restauration',
    db.verifierChaineJournal().ok === true);
  for (const d of declencheurs) base2.exec(d.sql + ';');
}

// Forgerie : une entrée insérée SANS hash (l'INSERT n'est pas bloqué par les
// déclencheurs) doit être SIGNALÉE — plus jamais de feu vert sur un journal
// contenant une ligne hors chaîne (trou de la revue E2).
{
  base2.exec(`INSERT INTO journal_audit (utilisateur, action)
              VALUES ('PIRATE', 'FAUSSE_ENTREE');`);
  const forgee = base2.prepare(
    'SELECT id FROM journal_audit ORDER BY id DESC LIMIT 1').get().id;
  const verdict = db.verifierChaineJournal();
  verifier('une entrée forgée sans hash est signalée (jamais tolérée)',
    verdict.ok === false && verdict.casseA === forgee,
    `verdict = ${JSON.stringify(verdict)}`);
}

// Excision par OUTIL EXTERNE (contourne les déclencheurs) : détectée.
{
  const declencheurs = base2.prepare(`SELECT name, sql FROM sqlite_master
    WHERE type = 'trigger' AND tbl_name = 'journal_audit'`).all();
  for (const d of declencheurs) base2.exec(`DROP TRIGGER ${d.name};`);
  const milieu = base2.prepare(`SELECT id FROM journal_audit
    WHERE hash IS NOT NULL ORDER BY id LIMIT 1 OFFSET 1`).get().id;
  base2.exec(`DELETE FROM journal_audit WHERE id = ${milieu};`);
  for (const d of declencheurs) base2.exec(d.sql + ';');
  const suivante = base2.prepare(`SELECT id FROM journal_audit
    WHERE hash IS NOT NULL AND id > ? ORDER BY id LIMIT 1`).get(milieu).id;
  const verdict = db.verifierChaineJournal();
  verifier('une excision au milieu du journal CASSE la chaîne, au bon endroit',
    verdict.ok === false && verdict.casseA === suivante,
    `verdict = ${JSON.stringify(verdict)}`);
}

// ============================================================
// 4. Les CHECK sont alignés sur le contrat DataStore (E0)
// ============================================================
base2.exec(`INSERT INTO machines (id, etablissement_id, designation, statut)
            VALUES ('MAC-T1', 'ETB-TEST', 'Machine du test', 'FUITE');`);
verifier('machines.statut accepte FUITE et CONTROLE_DU (enum du contrat)',
  base2.prepare("SELECT statut FROM machines WHERE id = 'MAC-T1'")
    .get().statut === 'FUITE');
verifierLeve('machines.statut refuse l’ancien masculin ARRETE',
  () => base2.exec(`INSERT INTO machines (id, etablissement_id, designation, statut)
                    VALUES ('MAC-T2', 'ETB-TEST', 'X', 'ARRETE');`),
  'CHECK');
base2.exec(`INSERT INTO personnel (id, etablissement_id, nom, prenom,
              type_personne, role_applicatif)
            VALUES ('PER-T1', 'ETB-TEST', 'Test', 'Référent',
              'INTERVENANT_EXT', 'REFERENT');`);
verifier('personnel accepte INTERVENANT_EXT et le rôle REFERENT (contrat)',
  base2.prepare("SELECT role_applicatif FROM personnel WHERE id = 'PER-T1'")
    .get().role_applicatif === 'REFERENT');
verifierLeve('personnel refuse l’ancien rôle VOIR',
  () => base2.exec(`INSERT INTO personnel (id, etablissement_id, nom, prenom,
                      type_personne, role_applicatif)
                    VALUES ('PER-T2', 'ETB-TEST', 'X', 'X', 'ELEVE', 'VOIR');`),
  'CHECK');
base2.exec(`INSERT INTO controles (id, etablissement_id, type_controle,
              machine_id, date_controle, resultat, operateur)
            VALUES ('CTL-T1', 'ETB-TEST', 'PERIODIQUE', 'MAC-T1',
              '2026-07-04', 'FUITE', 'Testeur Migrations');`);
verifier('controles.resultat accepte FUITE (enum du contrat) et porte operateur',
  base2.prepare("SELECT operateur FROM controles WHERE id = 'CTL-T1'")
    .get().operateur === 'Testeur Migrations');
verifierLeve('controles.resultat refuse l’ancien FUITE_DETECTEE',
  () => base2.exec(`INSERT INTO controles (id, etablissement_id, type_controle,
                      machine_id, date_controle, resultat)
                    VALUES ('CTL-T2', 'ETB-TEST', 'PERIODIQUE', 'MAC-T1',
                      '2026-07-04', 'FUITE_DETECTEE');`),
  'CHECK');
base2.exec(`INSERT INTO outillage (id, etablissement_id, type)
            VALUES ('OUT-T1', 'ETB-TEST', 'DETECTEUR');`);
verifier('outillage.type accepte DETECTEUR (enum du contrat)',
  base2.prepare("SELECT type FROM outillage WHERE id = 'OUT-T1'")
    .get().type === 'DETECTEUR');
verifierLeve('outillage.type refuse l’ancien DETECTEUR_FUITE',
  () => base2.exec(`INSERT INTO outillage (id, etablissement_id, type)
                    VALUES ('OUT-T2', 'ETB-TEST', 'DETECTEUR_FUITE');`),
  'CHECK');
base2.exec(`INSERT INTO bouteilles (id, etablissement_id, type, fluide,
              tare_kg, masse_brute_kg, proprietaire)
            VALUES ('BTL-T1', 'ETB-TEST', 'NEUVE', 'R-410A', 10, 20,
              'Climalife');`);
verifier('bouteilles.proprietaire accepte le texte libre (contrat)',
  base2.prepare("SELECT proprietaire FROM bouteilles WHERE id = 'BTL-T1'")
    .get().proprietaire === 'Climalife');
verifier('masse_nette_kg est bien calculée (brute − tare = 10)',
  PROCHE(base2.prepare("SELECT masse_nette_kg FROM bouteilles WHERE id = 'BTL-T1'")
    .get().masse_nette_kg, 10));
verifierLeve('masse_nette_kg (colonne générée) refuse toute écriture directe',
  () => base2.exec(
    "INSERT INTO bouteilles (id, etablissement_id, type, masse_nette_kg) " +
    "VALUES ('BTL-T2', 'ETB-TEST', 'NEUVE', 5);"),
  'generated');

// ============================================================
// 5. Balance matière : tables neuves et vue bilan_matiere
// ============================================================
base2.exec(`INSERT INTO stocks_initiaux (etablissement_id, annee, fluide,
              stock_neuf_kg, stock_recupere_kg)
            VALUES ('ETB-TEST', 2026, 'R-410A', 1.0, 0);`);
base2.exec(`UPDATE bouteilles SET date_entree_stock = '2026-02-01',
              masse_nette_entree_kg = 10 WHERE id = 'BTL-T1';`);
base2.exec(`INSERT INTO bsff (id, etablissement_id, numero_bsff, fluide,
              masse_remise_kg, date_remise)
            VALUES ('BSFF-T1', 'ETB-TEST', 'BSFF-TEST-1', 'R-410A', 0.5,
              '2026-06-01');`);
base2.exec(`INSERT INTO retours_fournisseur (id, etablissement_id, fluide,
              masse_kg, date_retour, operateur)
            VALUES ('RF-T1', 'ETB-TEST', 'R-410A', 1.5, '2026-06-15',
              'Testeur');`);
{
  // Écritures figées comptées : MVT-T1 (ANNULE, +2 kg) et MVT-T4 (VALIDE,
  // +3 kg — le survivant des assauts REPLACE).
  const ligne = base2.prepare(`SELECT * FROM bilan_matiere
    WHERE etablissement_id = 'ETB-TEST' AND fluide = 'R-410A' AND annee = 2026`)
    .get();
  verifier('la vue bilan_matiere calcule le stock théorique du contrat (4,0 kg)',
    ligne && PROCHE(ligne.stock_theorique_kg, 1 + 10 - 2 - 3 - 1.5 - 0.5),
    ligne ? `théorique = ${ligne.stock_theorique_kg}` : 'ligne absente');
  verifier('sans inventaire : stock réel et écart NULL',
    ligne.stock_reel_kg === null && ligne.ecart_kg === null);
}
// Fidélité au contrat (revue E1) : un fluide n'ayant QU'un inventaire ne
// crée PAS de ligne ; une NEUVE sans masse d'entrée figée se replie sur sa
// masse nette courante.
verifier('un inventaire seul ne crée pas de ligne fantôme dans la vue',
  (() => {
    base2.exec(`INSERT INTO inventaires (etablissement_id, annee, fluide,
      stock_reel_kg) VALUES ('ETB-TEST', 2026, 'R-134a', 7.5);`);
    return base2.prepare(`SELECT count(*) AS n FROM bilan_matiere
      WHERE fluide = 'R-134a' AND annee = 2026`).get().n === 0;
  })());
verifier('une NEUVE sans masse d’entrée figée compte pour sa nette courante',
  (() => {
    base2.exec(`INSERT INTO bouteilles (id, etablissement_id, type, fluide,
      tare_kg, masse_brute_kg, date_entree_stock)
      VALUES ('BTL-T3', 'ETB-TEST', 'NEUVE', 'R-32', 10, 22, '2026-03-01');`);
    const ligne = base2.prepare(`SELECT achats_kg FROM bilan_matiere
      WHERE fluide = 'R-32' AND annee = 2026`).get();
    return ligne && PROCHE(ligne.achats_kg, 12);
  })());
base2.exec(`INSERT INTO inventaires (etablissement_id, annee, fluide,
              stock_reel_kg, date_saisie, operateur)
            VALUES ('ETB-TEST', 2026, 'R-410A', 4.5, '2026-07-04', 'Testeur');`);
base2.exec(`INSERT INTO justifications_ecarts (etablissement_id, annee, fluide,
              justification, date_justification)
            VALUES ('ETB-TEST', 2026, 'R-410A', 'Purge non pesée.',
              '2026-07-04');`);
{
  const ligne = base2.prepare(`SELECT * FROM bilan_matiere
    WHERE etablissement_id = 'ETB-TEST' AND fluide = 'R-410A' AND annee = 2026`)
    .get();
  verifier('avec inventaire : écart = réel − théorique (+0,5 kg), justification jointe',
    PROCHE(ligne.ecart_kg, 0.5) && ligne.justification === 'Purge non pesée.');
}
verifierLeve('inventaires refuse un doublon (année, fluide) — l’upsert est explicite',
  () => base2.exec(`INSERT INTO inventaires (etablissement_id, annee, fluide,
                      stock_reel_kg) VALUES ('ETB-TEST', 2026, 'R-410A', 9);`),
  'UNIQUE');

// ============================================================
// 6. Sites et codes publics (migrations 002 / 003)
// ============================================================
base2.exec(`INSERT INTO clients_detenteurs (id, etablissement_id, raison_sociale)
            VALUES ('CLI-T1', 'ETB-TEST', 'Client du test');`);
base2.exec(`INSERT INTO sites (id, etablissement_id, client_detenteur_id, nom)
            VALUES ('SITE-T1', 'ETB-TEST', 'CLI-T1', 'Cuisine centrale');`);
base2.exec("UPDATE machines SET site_id = 'SITE-T1', code_public = '8F3K2Q' " +
  "WHERE id = 'MAC-T1';");
verifier('une machine se rattache à un site et reçoit un code public',
  base2.prepare("SELECT site_id, code_public FROM machines WHERE id = 'MAC-T1'")
    .get().code_public === '8F3K2Q');
verifierLeve('le code public est unique (résolution QR sans ambiguïté)',
  () => base2.exec(`INSERT INTO machines (id, etablissement_id, designation,
                      code_public)
                    VALUES ('MAC-T3', 'ETB-TEST', 'X', '8F3K2Q');`),
  'UNIQUE');

// ============================================================
// 6bis. Backfill du code public pour les machines PRÉEXISTANTES
// (migration 006) — simule une base restée bloquée en version 5 avec
// des machines créées AVANT l'introduction du générateur (V9.1).
//
// IMPORTANT : db.ouvrir() est un SINGLETON (rend la même instance si déjà
// ouverte) — la base « ancienne » doit donc être montée directement via
// DatabaseSync, jamais via db.ouvrir, exactement comme la section 7 le
// fait déjà pour la base pré-versionnage.
// ============================================================
{
  const CHEMIN_ANCIENNE = join(DOSSIER, 'ancienne.db');
  const ancienne = new DatabaseSync(CHEMIN_ANCIENNE);
  ancienne.exec(readFileSync(
    new URL('./schema.sql', import.meta.url), 'utf8'));
  ancienne.exec(`PRAGMA user_version = ${migrations.VERSION_BASE};`);
  migrations.migrer(ancienne, { 2: migrations.MIGRATIONS[2],
    3: migrations.MIGRATIONS[3], 4: migrations.MIGRATIONS[4],
    5: migrations.MIGRATIONS[5] }); // portée à 5, PAS encore 6

  // Machines « anciennes » sans code_public, comme l'aurait laissé une
  // base réelle créée avant que createMachine ne génère systématiquement
  // le code (le code_public de la migration 003 restait vide).
  ancienne.exec(`INSERT INTO etablissements (id, raison_sociale)
                 VALUES ('ETB-ANC', 'Lycée ancien');`);
  for (let i = 0; i < 4; i += 1) {
    ancienne.exec(`INSERT INTO machines (id, etablissement_id, designation)
                   VALUES ('MAC-ANC-${i}', 'ETB-ANC', 'Machine ancienne ${i}');`);
  }
  // Une machine qui aurait DÉJÀ un code_public (posée par une exécution
  // partielle antérieure de la migration 003, par exemple) : son code
  // ne doit ni être régénéré, ni entrer en collision avec le backfill.
  ancienne.exec(`INSERT INTO machines (id, etablissement_id, designation,
                   code_public)
                 VALUES ('MAC-ANC-DEJA', 'ETB-ANC', 'Déjà pourvue', 'ABCDEFG');`);

  verifier('avant migration 006 : les machines anciennes sont sans code public',
    ancienne.prepare(`SELECT count(*) AS n FROM machines
      WHERE etablissement_id = 'ETB-ANC' AND code_public IS NULL`)
      .get().n === 4);
  verifier('avant migration 006 : la base est bloquée en version 5',
    migrations.lireVersion(ancienne) === 5);

  const versionFinale = migrations.migrer(ancienne, { 6: migrations.MIGRATIONS[6] });
  verifier('la migration 006 porte la base à la version 6',
    versionFinale === 6 && migrations.lireVersion(ancienne) === 6);

  const lignes = ancienne.prepare(`SELECT id, code_public FROM machines
    WHERE etablissement_id = 'ETB-ANC' ORDER BY id`).all();
  verifier('toutes les machines anciennes reçoivent un code public (format Crockford)',
    lignes.every((m) => /^[0-9A-HJKMNP-TV-Z]{7}$/.test(m.code_public)));
  verifier('les codes publics backfillés sont tous distincts',
    new Set(lignes.map((m) => m.code_public)).size === lignes.length);
  verifier('une machine déjà pourvue conserve SON code (jamais régénéré)',
    lignes.find((m) => m.id === 'MAC-ANC-DEJA').code_public === 'ABCDEFG');

  ancienne.close();
}

// ============================================================
// 6ter. Backfill du code public pour les bouteilles PRÉEXISTANTES
// (migration 009) — parité exacte de la 6bis (machines), simule une base
// bloquée en version 8 avec des bouteilles créées AVANT l'introduction
// du générateur côté bouteilles (V9.2).
// ============================================================
{
  const CHEMIN_ANCIENNE_BTL = join(DOSSIER, 'ancienne-bouteilles.db');
  const ancienneBtl = new DatabaseSync(CHEMIN_ANCIENNE_BTL);
  ancienneBtl.exec(readFileSync(
    new URL('./schema.sql', import.meta.url), 'utf8'));
  ancienneBtl.exec(`PRAGMA user_version = ${migrations.VERSION_BASE};`);
  migrations.migrer(ancienneBtl, { 2: migrations.MIGRATIONS[2],
    3: migrations.MIGRATIONS[3], 4: migrations.MIGRATIONS[4],
    5: migrations.MIGRATIONS[5], 6: migrations.MIGRATIONS[6],
    7: migrations.MIGRATIONS[7],
    8: migrations.MIGRATIONS[8] }); // portée à 8, PAS encore 9

  ancienneBtl.exec(`INSERT INTO etablissements (id, raison_sociale)
                 VALUES ('ETB-ANC-B', 'Lycée ancien');`);
  for (let i = 0; i < 4; i += 1) {
    ancienneBtl.exec(`INSERT INTO bouteilles (id, etablissement_id, type, fluide)
                   VALUES ('BTL-ANC-${i}', 'ETB-ANC-B', 'NEUVE', 'R-410A');`);
  }
  // Une bouteille qui aurait DÉJÀ un code_public : son code ne doit ni
  // être régénéré, ni entrer en collision avec le backfill.
  ancienneBtl.exec(`INSERT INTO bouteilles (id, etablissement_id, type, fluide,
                   code_public)
                 VALUES ('BTL-ANC-DEJA', 'ETB-ANC-B', 'NEUVE', 'R-410A', 'HJKMNPQ');`);

  verifier('avant migration 009 : les bouteilles anciennes sont sans code public',
    ancienneBtl.prepare(`SELECT count(*) AS n FROM bouteilles
      WHERE etablissement_id = 'ETB-ANC-B' AND code_public IS NULL`)
      .get().n === 4);
  verifier('avant migration 009 : la base est bloquée en version 8',
    migrations.lireVersion(ancienneBtl) === 8);

  const versionFinaleBtl = migrations.migrer(ancienneBtl, { 9: migrations.MIGRATIONS[9] });
  verifier('la migration 009 porte la base à la version 9',
    versionFinaleBtl === 9 && migrations.lireVersion(ancienneBtl) === 9);

  const lignesBtl = ancienneBtl.prepare(`SELECT id, code_public FROM bouteilles
    WHERE etablissement_id = 'ETB-ANC-B' ORDER BY id`).all();
  verifier('toutes les bouteilles anciennes reçoivent un code public (format Crockford)',
    lignesBtl.every((b) => /^[0-9A-HJKMNP-TV-Z]{7}$/.test(b.code_public)));
  verifier('les codes publics backfillés (bouteilles) sont tous distincts',
    new Set(lignesBtl.map((b) => b.code_public)).size === lignesBtl.length);
  verifier('une bouteille déjà pourvue conserve SON code (jamais régénéré)',
    lignesBtl.find((b) => b.id === 'BTL-ANC-DEJA').code_public === 'HJKMNPQ');

  ancienneBtl.close();
}

// ============================================================
// 6quater. Catégories de pièces jointes élargies (migration 010) —
// sur la base NEUVE (déjà à la version cible) : les cinq catégories du
// front passent, une inconnue est refusée, l'unique index a survécu à
// la recréation de la table. ETB-TEST et PER-T1 existent (sections 3-4).
// ============================================================
{
  const NOUVELLES = ['SIGNATURE', 'ATTESTATION_APTITUDE',
    'ATTESTATION_CAPACITE', 'BORDEREAU_BSFF', 'CERTIFICAT_ETALONNAGE'];
  const insertPj = (id, cat) => base2.exec(
    `INSERT INTO pieces_jointes (id, etablissement_id, entite_type, entite_id,
       categorie, nom_fichier)
     VALUES ('${id}', 'ETB-TEST', 'PERSONNEL', 'PER-T1', '${cat}', 'preuve.pdf');`);
  verifier('pieces_jointes accepte les cinq catégories du front (migration 010)',
    (() => {
      try { NOUVELLES.forEach((c, i) => insertPj(`PJ-NEW-${i}`, c)); return true; }
      catch (e) { return false; }
    })());
  verifier('une catégorie du socle v1 (RAPPORT) reste acceptée',
    (() => { insertPj('PJ-RAPPORT', 'RAPPORT'); return true; })());
  verifierLeve('une catégorie inconnue est toujours refusée par le CHECK',
    () => insertPj('PJ-KO', 'CATEGORIE_BIDON'), 'CHECK');
  verifier('l’index idx_pj_entite a survécu à la recréation de la table',
    base2.prepare(`SELECT count(*) AS n FROM sqlite_master
      WHERE type = 'index' AND name = 'idx_pj_entite'`).get().n === 1);
}

// ============================================================
// 6quinquies. Migration 010 sur une base PRÉEXISTANTE (v9 → v10) : les
// pièces jointes déjà stockées sont TOUTES préservées ; une nouvelle
// catégorie, refusée avant, passe après. Même patron que 6bis/6ter.
// ============================================================
{
  const CHEMIN_ANCIENNE_PJ = join(DOSSIER, 'ancienne-pj.db');
  const anciennePj = new DatabaseSync(CHEMIN_ANCIENNE_PJ);
  anciennePj.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  anciennePj.exec(`PRAGMA user_version = ${migrations.VERSION_BASE};`);
  const jusqua9 = {};
  for (let v = 2; v <= 9; v += 1) jusqua9[v] = migrations.MIGRATIONS[v];
  migrations.migrer(anciennePj, jusqua9); // portée à 9, PAS encore 10

  anciennePj.exec(`INSERT INTO etablissements (id, raison_sociale)
                   VALUES ('ETB-PJ', 'Lycée PJ');`);
  anciennePj.exec(`INSERT INTO pieces_jointes (id, etablissement_id, entite_type,
      entite_id, categorie, nom_fichier)
    VALUES ('PJ-OLD-1', 'ETB-PJ', 'MACHINE', 'MAC-X', 'CERTIFICAT', 'a.pdf'),
           ('PJ-OLD-2', 'ETB-PJ', 'BOUTEILLE', 'BTL-X', 'PHOTO_PESEE', 'b.png');`);

  verifier('avant migration 010 : une nouvelle catégorie est refusée',
    (() => {
      try {
        anciennePj.exec(`INSERT INTO pieces_jointes (id, etablissement_id,
          entite_type, entite_id, categorie, nom_fichier)
          VALUES ('PJ-KO', 'ETB-PJ', 'PERSONNEL', 'PER-X',
            'ATTESTATION_CAPACITE', 'c.pdf');`);
        return false;
      } catch { return true; }
    })());
  verifier('avant migration 010 : la base est bloquée en version 9',
    migrations.lireVersion(anciennePj) === 9);

  const vFinale = migrations.migrer(anciennePj, { 10: migrations.MIGRATIONS[10] });
  verifier('la migration 010 porte la base à la version 10',
    vFinale === 10 && migrations.lireVersion(anciennePj) === 10);
  verifier('les pièces jointes préexistantes sont TOUTES préservées (données intactes)',
    anciennePj.prepare(`SELECT count(*) AS n FROM pieces_jointes
      WHERE etablissement_id = 'ETB-PJ'`).get().n === 2
    && anciennePj.prepare(
      "SELECT categorie FROM pieces_jointes WHERE id = 'PJ-OLD-1'")
      .get().categorie === 'CERTIFICAT'
    && anciennePj.prepare(
      "SELECT nom_fichier FROM pieces_jointes WHERE id = 'PJ-OLD-2'")
      .get().nom_fichier === 'b.png');
  verifier('après migration 010 : les cinq nouvelles catégories passent',
    (() => {
      try {
        ['SIGNATURE', 'ATTESTATION_APTITUDE', 'ATTESTATION_CAPACITE',
          'BORDEREAU_BSFF', 'CERTIFICAT_ETALONNAGE'].forEach((c, i) =>
          anciennePj.exec(`INSERT INTO pieces_jointes (id, etablissement_id,
            entite_type, entite_id, categorie, nom_fichier)
            VALUES ('PJ-AP-${i}', 'ETB-PJ', 'PERSONNEL', 'PER-X', '${c}', 'd.pdf');`));
        return true;
      } catch { return false; }
    })());
  verifier('après migration 010 : une catégorie inconnue reste refusée',
    (() => {
      try {
        anciennePj.exec(`INSERT INTO pieces_jointes (id, etablissement_id,
          entite_type, entite_id, categorie, nom_fichier)
          VALUES ('PJ-KO2', 'ETB-PJ', 'PERSONNEL', 'PER-X', 'NIMPORTE', 'e.pdf');`);
        return false;
      } catch { return true; }
    })());
  verifier('l’index idx_pj_entite existe sur la base migrée 010',
    anciennePj.prepare(`SELECT count(*) AS n FROM sqlite_master
      WHERE type = 'index' AND name = 'idx_pj_entite'`).get().n === 1);

  anciennePj.close();
}

// ============================================================
// 6sexies. Code public des clients (migration 011) — sur une base
// PRÉEXISTANTE (v10 → v11) : la colonne est ajoutée, tous les clients
// reçoivent un code Crockford unique, l'index UNIQUE est en place.
// ============================================================
{
  const CHEMIN_ANCIENNE_CL = join(DOSSIER, 'ancienne-clients.db');
  const ancienneCl = new DatabaseSync(CHEMIN_ANCIENNE_CL);
  ancienneCl.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  ancienneCl.exec(`PRAGMA user_version = ${migrations.VERSION_BASE};`);
  const jusqua10 = {};
  for (let v = 2; v <= 10; v += 1) jusqua10[v] = migrations.MIGRATIONS[v];
  migrations.migrer(ancienneCl, jusqua10); // portée à 10, PAS encore 11

  ancienneCl.exec(`INSERT INTO etablissements (id, raison_sociale)
                   VALUES ('ETB-CL', 'Lycée CL');`);
  for (let i = 0; i < 4; i += 1) {
    ancienneCl.exec(`INSERT INTO clients_detenteurs (id, etablissement_id, raison_sociale)
                     VALUES ('CLI-ANC-${i}', 'ETB-CL', 'Client ancien ${i}');`);
  }

  verifier('avant migration 011 : la base est bloquée en version 10',
    migrations.lireVersion(ancienneCl) === 10);
  verifier('avant migration 011 : clients_detenteurs n’a pas encore code_public',
    !ancienneCl.prepare('PRAGMA table_info(clients_detenteurs)').all()
      .some((c) => c.name === 'code_public'));

  const vFinaleCl = migrations.migrer(ancienneCl, { 11: migrations.MIGRATIONS[11] });
  verifier('la migration 011 porte la base à la version 11',
    vFinaleCl === 11 && migrations.lireVersion(ancienneCl) === 11);

  const lignesCl = ancienneCl.prepare(`SELECT id, code_public FROM clients_detenteurs
    WHERE etablissement_id = 'ETB-CL' ORDER BY id`).all();
  verifier('tous les clients reçoivent un code public (format Crockford)',
    lignesCl.length === 4
    && lignesCl.every((c) => /^[0-9A-HJKMNP-TV-Z]{7}$/.test(c.code_public)));
  verifier('les codes publics clients sont tous distincts',
    new Set(lignesCl.map((c) => c.code_public)).size === lignesCl.length);
  verifierLeve('le code public client est unique (index UNIQUE partiel)',
    () => ancienneCl.exec(`INSERT INTO clients_detenteurs (id, etablissement_id,
        raison_sociale, code_public)
      VALUES ('CLI-DUP', 'ETB-CL', 'Doublon', '${lignesCl[0].code_public}');`),
    'UNIQUE');

  ancienneCl.close();
}

// ============================================================
// 6septies. Code public de l'outillage (migration 012) — base
// PRÉEXISTANTE (v11 → v12) : colonne ajoutée, backfill Crockford unique.
// ============================================================
{
  const CHEMIN_ANCIENNE_OUT = join(DOSSIER, 'ancienne-outillage.db');
  const ancienneOut = new DatabaseSync(CHEMIN_ANCIENNE_OUT);
  ancienneOut.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  ancienneOut.exec(`PRAGMA user_version = ${migrations.VERSION_BASE};`);
  const jusqua11 = {};
  for (let v = 2; v <= 11; v += 1) jusqua11[v] = migrations.MIGRATIONS[v];
  migrations.migrer(ancienneOut, jusqua11); // portée à 11, PAS encore 12

  ancienneOut.exec(`INSERT INTO etablissements (id, raison_sociale)
                    VALUES ('ETB-OUT', 'Lycée OUT');`);
  for (let i = 0; i < 3; i += 1) {
    ancienneOut.exec(`INSERT INTO outillage (id, etablissement_id, type)
                      VALUES ('OUT-ANC-${i}', 'ETB-OUT', 'DETECTEUR');`);
  }

  verifier('avant migration 012 : la base est bloquée en version 11',
    migrations.lireVersion(ancienneOut) === 11);
  verifier('avant migration 012 : outillage n’a pas encore code_public',
    !ancienneOut.prepare('PRAGMA table_info(outillage)').all()
      .some((c) => c.name === 'code_public'));

  const vFinaleOut = migrations.migrer(ancienneOut, { 12: migrations.MIGRATIONS[12] });
  verifier('la migration 012 porte la base à la version 12',
    vFinaleOut === 12 && migrations.lireVersion(ancienneOut) === 12);

  const lignesOut = ancienneOut.prepare(`SELECT id, code_public FROM outillage
    WHERE etablissement_id = 'ETB-OUT' ORDER BY id`).all();
  verifier('tous les outils reçoivent un code public (format Crockford)',
    lignesOut.length === 3
    && lignesOut.every((o) => /^[0-9A-HJKMNP-TV-Z]{7}$/.test(o.code_public)));
  verifier('les codes publics outils sont tous distincts',
    new Set(lignesOut.map((o) => o.code_public)).size === lignesOut.length);
  verifierLeve('le code public outil est unique (index UNIQUE partiel)',
    () => ancienneOut.exec(`INSERT INTO outillage (id, etablissement_id, type, code_public)
      VALUES ('OUT-DUP', 'ETB-OUT', 'DETECTEUR', '${lignesOut[0].code_public}');`),
    'UNIQUE');

  ancienneOut.close();
}

// ============================================================
// 6octies. PRP figé sur les mouvements (migration 013) — base
// PRÉEXISTANTE (v12 → v13) : colonne ajoutée NULL sur l'existant,
// écriture scellée INTACTE, déclencheur WORM recréé qui couvre
// prg_fige (et répare le trou migration 8 des vieilles bases).
// ============================================================
{
  const CHEMIN_ANCIENNE_PRP = join(DOSSIER, 'ancienne-prp.db');
  const anciennePrp = new DatabaseSync(CHEMIN_ANCIENNE_PRP);
  anciennePrp.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  anciennePrp.exec(`PRAGMA user_version = ${migrations.VERSION_BASE};`);
  const jusqua12 = {};
  for (let v = 2; v <= 12; v += 1) jusqua12[v] = migrations.MIGRATIONS[v];
  migrations.migrer(anciennePrp, jusqua12); // portée à 12, PAS encore 13

  anciennePrp.exec(`INSERT INTO etablissements (id, raison_sociale)
                    VALUES ('ETB-PRP', 'Lycée PRP');`);
  // Une écriture SCELLÉE d'avant la migration (comme une vraie base).
  anciennePrp.exec(`INSERT INTO mouvements (id, numero, etablissement_id,
      date_mouvement, mode, type_operation, statut, quantite_calculee_kg,
      hash_ecriture, hash_precedent, ordre_validation)
    VALUES ('MVT-PRP-1', 'FORM-2026-0001', 'ETB-PRP', '2026-07-01',
      'FORMATION', 'CHARGE_APPOINT', 'VALIDE', 2.5,
      '${'d'.repeat(64)}', NULL, 1);`);

  verifier('avant migration 013 : la base est bloquée en version 12',
    migrations.lireVersion(anciennePrp) === 12);
  verifier('avant migration 013 : mouvements n’a pas encore prg_fige',
    !anciennePrp.prepare('PRAGMA table_info(mouvements)').all()
      .some((c) => c.name === 'prg_fige'));

  const vFinalePrp = migrations.migrer(anciennePrp,
    { 13: migrations.MIGRATIONS[13] });
  verifier('la migration 013 porte la base à la version 13',
    vFinalePrp === 13 && migrations.lireVersion(anciennePrp) === 13);
  verifier('la colonne prg_fige existe après migration',
    anciennePrp.prepare('PRAGMA table_info(mouvements)').all()
      .some((c) => c.name === 'prg_fige'));

  const scellee = anciennePrp.prepare(
    "SELECT * FROM mouvements WHERE id = 'MVT-PRP-1'").get();
  verifier('l’écriture scellée d’avant la migration est INTACTE (pas de backfill)',
    scellee.prg_fige === null && scellee.hash_ecriture === 'd'.repeat(64)
    && PROCHE(scellee.quantite_calculee_kg, 2.5));

  // Le déclencheur recréé couvre prg_fige : impossible de poser une valeur
  // sur une écriture scellée, même pendant la bascule VALIDE→ANNULE.
  verifierLeve('le WORM recréé bloque tout backfill de prg_fige sur une écriture scellée',
    () => anciennePrp.exec(
      "UPDATE mouvements SET prg_fige = 675 WHERE id = 'MVT-PRP-1';"),
    'Registre verrouillé');
  verifierLeve('VALIDE → ANNULE avec prg_fige retouché dans la même passe est bloqué',
    () => anciennePrp.exec(`UPDATE mouvements SET statut = 'ANNULE',
      prg_fige = 675 WHERE id = 'MVT-PRP-1';`),
    'Registre verrouillé');

  const sqlDeclencheurPrp = anciennePrp.prepare(`SELECT sql FROM sqlite_master
    WHERE name = 'mouvements_interdire_modification_validee'`).get().sql;
  verifier('le déclencheur recréé couvre prg_fige ET localisation_fuite_declaree (trou migration 8 réparé)',
    sqlDeclencheurPrp.includes('NEW.prg_fige')
    && sqlDeclencheurPrp.includes('NEW.localisation_fuite_declaree'));

  anciennePrp.close();
}

// ============================================================
// 6nonies. Sentinelle d'alertes (migration 015) — base
// PRÉEXISTANTE (v14 → v15) : la table sentinelle_alertes est
// créée, et l'index UNIQUE partiel garantit l'invariant « un seul
// épisode OUVERT par alerte » (tout en laissant cohabiter un
// épisode résolu et un nouvel épisode ouvert — la réapparition).
// ============================================================
{
  const CHEMIN_SENT = join(DOSSIER, 'ancienne-sentinelle.db');
  const ancienneSent = new DatabaseSync(CHEMIN_SENT);
  ancienneSent.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  ancienneSent.exec(`PRAGMA user_version = ${migrations.VERSION_BASE};`);
  const jusqua14 = {};
  for (let v = 2; v <= 14; v += 1) jusqua14[v] = migrations.MIGRATIONS[v];
  migrations.migrer(ancienneSent, jusqua14); // portée à 14, PAS encore 15

  verifier('avant migration 015 : la base est bloquée en version 14',
    migrations.lireVersion(ancienneSent) === 14);
  verifier('avant migration 015 : la table sentinelle_alertes n’existe pas',
    ancienneSent.prepare(
      "SELECT count(*) AS n FROM sqlite_master WHERE name = 'sentinelle_alertes'")
      .get().n === 0);

  const vFinaleSent = migrations.migrer(ancienneSent,
    { 15: migrations.MIGRATIONS[15] });
  verifier('la migration 015 porte la base à la version 15',
    vFinaleSent === 15 && migrations.lireVersion(ancienneSent) === 15);
  verifier('la table sentinelle_alertes existe après migration',
    ancienneSent.prepare(
      "SELECT count(*) AS n FROM sqlite_master WHERE name = 'sentinelle_alertes'")
      .get().n === 1);
  verifier('l’index UNIQUE partiel des épisodes ouverts existe',
    ancienneSent.prepare(
      "SELECT count(*) AS n FROM sqlite_master WHERE name = 'idx_sentinelle_ouverte'")
      .get().n === 1);

  ancienneSent.exec(`INSERT INTO etablissements (id, raison_sociale)
                     VALUES ('ETB-SEN', 'Lycée Sentinelle');`);
  ancienneSent.exec(`INSERT INTO sentinelle_alertes
      (id, etablissement_id, id_alerte, niveau, titre, apparue_le)
    VALUES ('SEN-A', 'ETB-SEN', 'alr-capacite', 'CRITIQUE', 'Capacité',
      '2026-07-13T09:00:00.000Z');`);
  verifierLeve('l’index empêche un SECOND épisode ouvert pour la même alerte',
    () => ancienneSent.exec(`INSERT INTO sentinelle_alertes
        (id, etablissement_id, id_alerte, niveau, titre, apparue_le)
      VALUES ('SEN-B', 'ETB-SEN', 'alr-capacite', 'CRITIQUE', 'Capacité',
        '2026-07-13T10:00:00.000Z');`),
    'UNIQUE');
  // Réapparition : un épisode RÉSOLU + un nouvel ouvert cohabitent.
  ancienneSent.exec(
    "UPDATE sentinelle_alertes SET resolue_le = '2026-07-14T09:00:00.000Z' WHERE id = 'SEN-A';");
  ancienneSent.exec(`INSERT INTO sentinelle_alertes
      (id, etablissement_id, id_alerte, niveau, titre, apparue_le)
    VALUES ('SEN-C', 'ETB-SEN', 'alr-capacite', 'CRITIQUE', 'Capacité',
      '2026-07-15T09:00:00.000Z');`);
  verifier('un épisode résolu et un nouvel ouvert cohabitent (réapparition)',
    ancienneSent.prepare(
      "SELECT count(*) AS n FROM sentinelle_alertes WHERE id_alerte = 'alr-capacite'")
      .get().n === 2);

  ancienneSent.close();
}

// ============================================================
// 7. Base pré-versionnage : refusée avec un message clair
// ============================================================
db.fermer();
{
  const legacy = new DatabaseSync(CHEMIN_LEGACY);
  legacy.exec('CREATE TABLE ancienne (x TEXT);');
  legacy.close();
}
verifierLeve('une base non versionnée mais non vide est refusée à l’ouverture',
  () => db.ouvrir(CHEMIN_LEGACY), 'mais non vide');

// ============================================================
// 8. Le moteur : rollback transactionnel, registre troué
// ============================================================
const base3 = db.ouvrir(CHEMIN_NEUVE);
{
  const versionAvant = migrations.lireVersion(base3);
  const ratee = {
    [versionAvant + 1]: {
      nom: 'migration_ratee',
      appliquer(bdd) {
        bdd.exec('CREATE TABLE trace_rollback (x TEXT);');
        throw new Error('panne simulée au milieu de la migration');
      }
    }
  };
  verifierLeve('une migration qui échoue est annulée d’un bloc (transaction)',
    () => migrations.migrer(base3, ratee), 'panne simulée');
  verifier('après l’échec : version intacte et AUCUNE trace partielle',
    migrations.lireVersion(base3) === versionAvant
    && base3.prepare(
      "SELECT count(*) AS n FROM sqlite_master WHERE name = 'trace_rollback'")
      .get().n === 0);
  verifierLeve('un trou dans le registre des migrations est refusé',
    () => migrations.migrer(base3, {
      [versionAvant + 2]: { nom: 'trop_loin', appliquer() {} }
    }), 'troué');
}

// ============================================================
// Verdict
// ============================================================
db.fermer();
rmSync(DOSSIER, { recursive: true, force: true });
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Versionnage de la base : tout est vert.');
