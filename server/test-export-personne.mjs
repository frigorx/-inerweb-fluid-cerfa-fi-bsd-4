// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Export RGPD des données d'une personne (lot E ①) — droits d'accès et de
// portabilité (art. 15 / 20). Trois plans de preuve :
//   1. PARITÉ du module pur : le miroir serveur (CJS) produit EXACTEMENT le
//      même export que la source ESM du front, sur des sources fixes, ET un
//      test discriminant (un champ modifié → sorties différentes).
//   2. COMPORTEMENT du module pur : filtrage par identité, absence de binaire,
//      personne introuvable → Error.
//   3. GARDE DE RÔLE serveur : l'export est réservé au niveau VALIDEUR — un
//      élève est refusé (403), un référent obtient l'export ; l'attaque est
//      TIRÉE contre un vrai dispatcher sur base JETABLE.
// Exécution : node server/test-export-personne.mjs — base JETABLE.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assemblerExportPersonne as esm, VERSION_EXPORT_PERSONNE }
  from '../v8/js/data/export-personne.js';

const require = createRequire(import.meta.url);
const { assemblerExportPersonne: cjs } = require('./export-personne.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}
function attendreRejet(libelle, fn, extrait, codeAttendu = null) {
  try {
    fn();
    verifier(libelle, false, 'aucune erreur levée');
  } catch (erreur) {
    verifier(libelle,
      String(erreur.message).includes(extrait) &&
      (codeAttendu === null || erreur.code === codeAttendu),
      `message = « ${erreur.message} », code = ${erreur.code}`);
  }
}

// Sources fixes : une élève (per-jm) présente partout, un référent (per-fh).
function sourcesFixes() {
  return {
    personnel: [
      { id: 'per-jm', nom: 'Martin', prenom: 'Jean', typePersonne: 'ELEVE',
        roleApp: 'ELEVE', email: null, actif: true, activitesAutorisees: [] },
      { id: 'per-fh', nom: 'Delorme', prenom: 'Fabrice',
        typePersonne: 'ENSEIGNANT', roleApp: 'REFERENT', email: 'f@x.fr',
        actif: true, activitesAutorisees: ['MAINTENANCE'] }
    ],
    habilitations: [
      { id: 'h1', personneId: 'per-jm', regime: '2025', categorie: 'II' },
      { id: 'h2', personneId: 'per-fh' }
    ],
    mentions: [{ id: 'm1', personneId: 'per-jm', fluideMention: 'CO2' }],
    signaturesMouvement: [
      { id: 's2', mouvementId: 'mv1', role: 'TECHNICIEN', nom: 'Martin',
        prenom: 'Jean', dateHeure: '2026-05-02T10:00:00Z', declaration: 'x',
        versionDocument: 0, sha256Document: 'abc', sessionPersonnelId: 'per-jm',
        imagePng: 'BINAIRE_LOURD' },
      { id: 's1', mouvementId: 'mv1', role: 'DETENTEUR', nom: 'Autre',
        prenom: 'X', dateHeure: '2026-05-02T09:00:00Z',
        sessionPersonnelId: 'per-fh' }
    ],
    mouvements: [
      { numero: 'FORM-2026-0001', date: '2026-05-02', type: 'CHARGE',
        statut: 'VALIDE', mode: 'FORMATION', machineId: 'M1', fluide: 'R-32',
        technicien: 'Jean Martin', validateurId: 'per-fh', executeParId: null,
        superviseurId: null, responsableRegistreId: null },
      { numero: 'FORM-2026-0002', date: '2026-04-01', type: 'RECUP',
        statut: 'BROUILLON', mode: 'FORMATION', technicien: 'Quelqu’un',
        validateurId: null }
    ],
    controles: [
      { id: 'c1', date: '2026-05-02', machineId: 'M1', resultat: 'CONFORME',
        operateur: 'jean martin', operateurId: null }
    ],
    piecesJointes: [
      { id: 'pj2', entiteType: 'personne', entiteId: 'per-jm',
        categorie: 'SIGNATURE', nomFichier: 'sig.png', mimeType: 'image/png',
        taille: 2048, hashSha256: 'zzz', dateAjout: '2026-01-02T00:00:00Z' },
      { id: 'pj1', entiteType: 'personne', entiteId: 'per-jm',
        categorie: 'ATTESTATION_APTITUDE', nomFichier: 'att.pdf',
        mimeType: 'application/pdf', taille: 5000, hashSha256: 'yyy',
        dateAjout: '2026-01-01T00:00:00Z' },
      { id: 'pj3', entiteType: 'MOUVEMENT', entiteId: 'mv1', categorie: 'AUTRE',
        nomFichier: 'x', mimeType: 'application/pdf', taille: 1,
        dateAjout: '2026-01-03T00:00:00Z' }
    ]
  };
}

// ============================================================
// 1. PARITÉ du module pur (ESM du front ↔ miroir CJS serveur)
// ============================================================
{
  const s = sourcesFixes();
  const t = '2026-07-19T12:00:00Z';
  const a = esm('per-jm', s, t);
  const b = cjs('per-jm', s, t);
  verifier('parité ESM/CJS : sorties identiques (JSON)',
    JSON.stringify(a) === JSON.stringify(b));
  // Test DISCRIMINANT : un nom modifié doit changer la sortie (sinon le test
  // de parité ne prouverait rien).
  const s2 = sourcesFixes();
  s2.personnel[0].nom = 'Martinez';
  const c = cjs('per-jm', s2, t);
  verifier('parité : test discriminant (un champ modifié → sortie différente)',
    JSON.stringify(a) !== JSON.stringify(c));
  verifier('version d’export exposée',
    VERSION_EXPORT_PERSONNE === 1 && a.version === 1);
}

// ============================================================
// 2. COMPORTEMENT du module pur
// ============================================================
{
  const s = sourcesFixes();
  const exp = esm('per-jm', s, '2026-07-19T12:00:00Z');

  verifier('enveloppe : application + personneId + horodatage',
    exp.application === 'inerWeb Fluide' && exp.personneId === 'per-jm' &&
    exp.genereLe === '2026-07-19T12:00:00Z');
  verifier('fiche : la personne exportée est bien la bonne',
    exp.personne.id === 'per-jm' && exp.personne.nom === 'Martin');
  verifier('habilitations : seules celles de la personne (1)',
    exp.habilitations.length === 1 && exp.habilitations[0].id === 'h1');
  verifier('mentions : seules celles de la personne (1)',
    exp.mentions.length === 1);
  verifier('signatures : seule la sienne (par sessionPersonnelId), triée',
    exp.signatures.length === 1 && exp.signatures[0].id === 's2');
  verifier('signatures : AUCUN binaire (imagePng absent de l’export)',
    !('imagePng' in exp.signatures[0]));
  verifier('interventions : le mouvement où elle est technicien déclaré',
    exp.interventions.length === 1 &&
    exp.interventions[0].numero === 'FORM-2026-0001' &&
    exp.interventions[0].roles.some((r) => r.startsWith('Technicien')));
  verifier('contrôles : rapprochés par nom d’opérateur (insensible casse/accents)',
    exp.controles.length === 1 && exp.controles[0].id === 'c1');
  verifier('pièces jointes : les 2 de la personne, triées, PJ de mouvement exclue',
    exp.piecesJointes.length === 2 &&
    exp.piecesJointes[0].id === 'pj1' && exp.piecesJointes[1].id === 'pj2');
  verifier('avertissement RGPD présent',
    typeof exp.avertissement === 'string' && exp.avertissement.length > 40);

  // Le référent : validateur du mouvement mv1 → 1 intervention (VALIDATEUR).
  const expFh = esm('per-fh', s, 't');
  verifier('autre personne : rôle validateur reconnu',
    expFh.interventions.length === 1 &&
    expFh.interventions[0].roles.includes('Validateur'));

  attendreRejet('personne introuvable → Error',
    () => esm('inconnu', s, 't'), 'introuvable');
}

// ============================================================
// 3. GARDE DE RÔLE serveur — export réservé au niveau VALIDEUR
// ============================================================
{
  const db = require('./db.js');
  const api = require('./api.js');
  const dossier = mkdtempSync(join(tmpdir(), 'inerweb-fluide-export-'));
  mkdirSync(join(dossier, 'data'));
  db.ouvrir(join(dossier, 'data', 'test.db'));

  const referent = { role: 'REFERENT' };
  api.appeler('init', {}, referent);

  const eleve = api.appeler('createPersonne', { donneesPersonne: {
    prenom: 'Léa', nom: 'Bonnet', typePersonne: 'ELEVE',
    roleApp: 'ELEVE' } }, referent);
  api.appeler('createHabilitation', { donneesHabilitation: {
    personneId: eleve.id, regime: '2025', categorie: 'A1' } }, referent);
  // Un mouvement où l'élève est le technicien déclaré (BROUILLON suffit).
  const machine = api.appeler('createMachine', { donneesMachine: {
    designation: 'Banc RGPD', fluide: 'R-134a', chargeNominaleKg: 8,
    operateur: 'Testeur' } }, referent);
  api.appeler('creerMouvement', { donneesMouvement: {
    type: 'CHARGE_APPOINT', machineId: machine.id,
    technicien: 'Léa Bonnet', causeMouvement: 'Exercice' } }, referent);

  // 3a. Un ÉLÈVE ne peut pas exporter les données d'une personne (403).
  attendreRejet(
    'exporterDonneesPersonne refuse (403) une session ELEVE',
    () => api.appeler('exporterDonneesPersonne',
      { personneId: eleve.id }, { role: 'ELEVE' }),
    'réservée aux rôles habilités', 403);

  // 3b. Une session SANS rôle est refusée aussi.
  attendreRejet(
    'exporterDonneesPersonne refuse (403) une session sans rôle',
    () => api.appeler('exporterDonneesPersonne',
      { personneId: eleve.id }, {}),
    'réservée aux rôles habilités', 403);

  // 3c. Le référent obtient l'export, correctement composé côté serveur.
  const exp = api.appeler('exporterDonneesPersonne',
    { personneId: eleve.id }, referent);
  verifier('référent : export obtenu, fiche exacte',
    exp.personneId === eleve.id && exp.personne.nom === 'Bonnet');
  verifier('référent : habilitation reprise (composition serveur réelle)',
    exp.habilitations.length === 1 &&
    exp.habilitations[0].personneId === eleve.id);
  verifier('référent : intervention rapprochée par nom (mouvement réel)',
    exp.interventions.length === 1 &&
    exp.interventions[0].roles.some((r) => r.startsWith('Technicien')));
  verifier('référent : pas de binaire, journal non repris',
    !('journalAudit' in exp) && Array.isArray(exp.signatures));

  // 3d. Personne introuvable côté serveur → Error (après la garde de rôle).
  attendreRejet('serveur : personne introuvable → Error',
    () => api.appeler('exporterDonneesPersonne',
      { personneId: 'per-inexistant' }, referent),
    'introuvable');
}

// Nettoyage RGPD : base jetable, effets réels et refus avant toute écriture.
{
  const assert = (await import('node:assert/strict')).default;
  const fs = require('node:fs');
  const pur = await import('../v8/js/data/revue-formation.js');
  const miroir = require('./revue-formation.js');
  const mouvements = [
    { id: 'a', mode: 'FORMATION', statut: 'BROUILLON', date: '2020-01-01' },
    { id: 'b', mode: 'FORMATION', statut: 'VALIDE', date: '2020-01-01' },
    { id: 'c', mode: 'OFFICIEL', statut: 'BROUILLON', date: '2020-01-01' },
    { id: 'd', mode: 'FORMATION', statut: 'BROUILLON', date: '2020-02-30' },
    { id: 'e', mode: 'FORMATION', statut: 'BROUILLON', date: '2021-01-01' }
  ];
  const r = pur.preparerRevueFormation(mouvements, '2021-01-01', '2026-09-10');
  assert.deepEqual(r, miroir.preparerRevueFormation(mouvements, '2021-01-01', '2026-09-10'));
  assert.equal(r.supprimables, 1); assert.equal(r.protegees, 2);
  assert.equal(pur.preparerRevueFormation([{ ...mouvements[0], date: '2020-01-01-invalide' }],
    '2021-01-01', '2026-09-10').supprimables, 0);
  assert.throws(() => pur.preparerRevueFormation([], '2026-02-30', '2026-09-10'));
  assert.throws(() => pur.preparerRevueFormation([], '2027-01-01', '2026-09-10'));
  assert.equal(pur.preparerRevueFormation(mouvements, '2021-01-01', '2026-09-10', [], [],
    [{ mouvementId: 'a' }]).supprimables, 0);
  assert.throws(() => pur.verifierSelectionFormation(r, ['a', 'a'], 'SUPPRIMER 2', 'Motif suffisamment long', true));
  assert.throws(() => pur.verifierSelectionFormation(r, ['b'], 'SUPPRIMER 1', 'Motif suffisamment long', true));
  verifier('nettoyage : parité, dates impossibles, coupure exclusive et traces protégées', true);

  const db = require('./db.js'), api = require('./api.js');
  db.fermer();
  const dossier = mkdtempSync(join(tmpdir(), 'inerweb-nettoyage-'));
  db.ouvrir(join(dossier, 'test.db'));
  const appeler = (m, p = {}) => api.appeler(m, p, { role: 'REFERENT' });
  appeler('init');
  const machine = appeler('createMachine', { donneesMachine: {
    designation: 'Banc fictif nettoyage', fluide: 'R-134a', chargeNominaleKg: 8 } });
  const creer = () => {
    const m = appeler('creerMouvement', { donneesMouvement: {
      type: 'CHARGE_APPOINT', mode: 'FORMATION', machineId: machine.id, technicien: 'Personne fictive' } });
    db.run('UPDATE mouvements SET date_mouvement = ? WHERE id = ?', ['2020-01-01', m.id]);
    return m;
  };
  const a = creer(), b = creer(), soumis = creer(), officiel = creer();
  db.run("UPDATE mouvements SET statut = 'SOUMIS' WHERE id = ?", [soumis.id]);
  db.run("UPDATE mouvements SET mode = 'OFFICIEL' WHERE id = ?", [officiel.id]);
  const pj = appeler('ajouterPieceJointe', { donneesPj: {
    entiteType: 'MOUVEMENT', entiteId: a.id, categorie: 'AUTRE',
    nomFichier: 'essai.pdf', mimeType: 'application/pdf', base64: 'JVBERi0xLjQK' } });
  const fichier = join(dossier, 'documents', pj.id);
  const avant = '2021-01-01';
  const apercu = () => appeler('previsualiserNettoyageFormation', { avant });
  const options = () => ({ avant, ids: [a.id, b.id], empreinte: apercu().empreinte,
    confirmation: 'SUPPRIMER 2', motif: 'Exercices fictifs arrivés au terme de leur utilité.', copiesExternes: true });
  const etatAvant = JSON.parse(appeler('exporterJSON')).donnees;
  const r0 = apercu();
  assert.deepEqual(JSON.parse(appeler('exporterJSON')).donnees, etatAvant);
  assert.equal(r0.supprimables, 2); assert.equal(r0.protegees, 1);
  assert.equal(r0.lignes.find(l => l.id === a.id).pieces, 1);
  assert.ok(!JSON.stringify(r0).includes('Personne fictive'));
  for (const role of ['ELEVE', 'ENSEIGNANT', null]) {
    assert.throws(() => api.appeler('previsualiserNettoyageFormation', { avant }, { role }), e => e.code === 403);
    assert.throws(() => api.appeler('nettoyerBrouillonsFormation', options(), { role }), e => e.code === 403);
  }
  const env = process.env.IWF_LAN;
  process.env.IWF_LAN = '1';
  assert.throws(apercu);
  assert.throws(() => appeler('nettoyerBrouillonsFormation', {}));
  if (env === undefined) delete process.env.IWF_LAN; else process.env.IWF_LAN = env;
  assert.throws(() => appeler('nettoyerBrouillonsFormation', { ...options(), ids: [officiel.id], confirmation: 'SUPPRIMER 1' }));
  assert.throws(() => appeler('nettoyerBrouillonsFormation', { ...options(), copiesExternes: false }));
  const perime = options();
  db.run('UPDATE mouvements SET technicien = ? WHERE id = ?', ['Autre nom fictif', a.id]);
  assert.throws(() => appeler('nettoyerBrouillonsFormation', perime), /ont changé/);
  verifier('nettoyage : aperçu sans mutation, accès réservé, LAN, officiel, confirmation et état périmé refusés', true);

  // Injecte une panne SQL après les suppressions du premier élément : tout revient,
  // et aucun fichier n'a été effacé avant le COMMIT.
  db.run(`CREATE TRIGGER test_refus_nettoyage BEFORE DELETE ON mouvements
    WHEN OLD.id = '${b.id}' BEGIN SELECT RAISE(ABORT, 'panne simulée'); END;`);
  assert.throws(() => appeler('nettoyerBrouillonsFormation', options()), /panne simulée/);
  assert.ok(db.get('SELECT id FROM mouvements WHERE id = ?', [a.id]));
  assert.ok(db.get('SELECT id FROM pieces_jointes WHERE id = ?', [pj.id]));
  assert.ok(fs.existsSync(fichier));
  assert.equal(db.get('SELECT count(*) AS n FROM coffre_purge_en_attente').n, 0);
  db.run('DROP TRIGGER test_refus_nettoyage');
  verifier('nettoyage : rollback global et fichier conservé si panne avant commit', true);

  // Simule un fichier temporairement verrouillé sous Windows, après COMMIT.
  const rm = fs.rmSync;
  let resultat;
  try {
    fs.rmSync = function(p, ...args) { if (p === fichier) throw new Error('verrou simulé'); return rm(p, ...args); };
    resultat = appeler('nettoyerBrouillonsFormation', options());
  } finally { fs.rmSync = rm; }
  assert.equal(resultat.supprimes, 2); assert.equal(resultat.pieces, 1); assert.equal(resultat.fichiersEnAttente, 1);
  assert.ok(fs.existsSync(fichier));
  assert.equal(db.get('SELECT count(*) AS n FROM mouvements').n, 2);
  assert.equal(db.get('SELECT count(*) AS n FROM pieces_jointes').n, 0);
  assert.equal(db.get('SELECT count(*) AS n FROM journal_audit WHERE action = ?', ['NETTOYAGE_BROUILLONS_FORMATION']).n, 1);
  api.rejouerPurgeCoffre();
  assert.ok(!fs.existsSync(fichier));
  assert.equal(db.get('SELECT count(*) AS n FROM coffre_purge_en_attente').n, 0);
  assert.throws(() => appeler('nettoyerBrouillonsFormation', perime));
  verifier('nettoyage : fichiers en attente signalés puis purgés, traces protégées intactes et double envoi refusé', true);
  db.fermer();
}

// ------------------------------------------------------------
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [export et nettoyage RGPD]`);
process.exit(nbEchecs === 0 ? 0 : 1);
