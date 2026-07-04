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

import { mkdtempSync, rmSync } from 'node:fs';
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

base2.exec(`INSERT INTO journal_audit (utilisateur, action)
            VALUES ('système', 'TEST_MIGRATIONS');`);
verifierLeve('le journal d’audit refuse toute modification',
  () => base2.exec("UPDATE journal_audit SET action = 'RETOUCHE';"),
  'ajout seul');
verifierLeve('le journal d’audit refuse toute suppression',
  () => base2.exec('DELETE FROM journal_audit;'),
  'ajout seul');

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
