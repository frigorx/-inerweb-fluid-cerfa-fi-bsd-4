// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Scellement externe simple (lot D — condition 5 du plan audit-proof) :
// le témoin quotidien constate les têtes des chaînes + compteurs dans le
// dossier de sauvegarde. Prouvé ici :
//   - contenu exact (têtes, compteurs, intervalle de numéros, versions),
//   - empreinte AUTO-VÉRIFIABLE par la recette embarquée dans le témoin,
//   - rafraîchi par le CROCHET RÉEL d'api.appeler (écriture scellée),
//   - mini-chaîne entre jours (témoin précédent) + falsification VISIBLE,
//   - best-effort absolu (échec écrit au journal, jamais d'exception).
// Exécution : node server/test-scellement-externe.mjs — base JETABLE.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, existsSync, readFileSync, writeFileSync,
  rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const api = require('./api.js');
const scellement = require('./scellement-externe.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}
const sha256 = (texte) =>
  createHash('sha256').update(texte, 'utf8').digest('hex');
const jourLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-` +
  String(d.getDate()).padStart(2, '0');

// Base JETABLE (jamais le data/ réel), NICHÉE sous <mkdtemp>/data/ : le
// dossier backups/ dérivé (frère de data/) reste DANS le bac à sable —
// sans cela il tomberait sur Temp\backups, partagé entre les suites.
const dossier = mkdtempSync(join(tmpdir(), 'inerweb-fluide-scellement-'));
mkdirSync(join(dossier, 'data'));
db.ouvrir(join(dossier, 'data', 'test.db'));

const CONTEXTE = { role: 'REFERENT' };
api.appeler('init', {}, CONTEXTE);
const valideur = api.appeler('createPersonne', { donneesPersonne: {
  prenom: 'Référent', nom: 'Témoin', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT' } }, CONTEXTE);
const machine = api.appeler('createMachine', { donneesMachine: {
  designation: 'Machine témoin', fluide: 'R-134a', chargeNominaleKg: 10,
  operateur: 'Testeur' } }, CONTEXTE);
const bouteille = api.appeler('createBouteille', { donneesBouteille: {
  type: 'NEUVE', fluide: 'R-134a', tareKg: 10, masseBruteKg: 30,
  contenanceMaxKg: 25 } }, CONTEXTE);
let pesee = 30;
function validerUnMouvement() {
  const mvt = api.appeler('creerMouvement', { donneesMouvement: {
    type: 'CHARGE_APPOINT', machineId: machine.id,
    bouteilleSrcId: bouteille.id, peseeAvantKg: pesee,
    peseeApresKg: pesee - 1, technicien: 'Testeur',
    causeMouvement: 'Preuve du témoin' } }, CONTEXTE);
  pesee -= 1;
  api.appeler('soumettreMouvement', { id: mvt.id }, CONTEXTE);
  return api.appeler('validerMouvement',
    { id: mvt.id, validateurId: valideur.id }, CONTEXTE);
}

// ============================================================
// 1. Le témoin du jour : présence, contenu exact, empreinte vérifiable
// ============================================================
// NB : validerUnMouvement passe par api.appeler → le crochet du lot D a
// DÉJÀ écrit un témoin ; on repart d'un appel explicite pour le constat.
const premierValide = validerUnMouvement();
{
  const compteRendu = scellement.ecrireTemoinQuotidien();
  verifier('ecrireTemoinQuotidien : fait, chemin retourné',
    compteRendu.fait === true && existsSync(compteRendu.fichier),
    JSON.stringify(compteRendu));

  const aujourdHui = jourLocal(new Date());
  const chemin = join(scellement.dossierScellement(),
    `${scellement.PREFIXE_TEMOIN}${aujourdHui}.json`);
  verifier('un fichier PAR JOUR, dans backups/scellement',
    compteRendu.fichier === chemin);

  const temoin = JSON.parse(readFileSync(chemin, 'utf8'));
  const teteRegistre = db.get(
    `SELECT hash_ecriture FROM mouvements
     WHERE ordre_validation IS NOT NULL
     ORDER BY ordre_validation DESC LIMIT 1`);
  const teteJournal = db.get(
    'SELECT hash FROM journal_audit ORDER BY id DESC LIMIT 1');
  verifier('têtes des chaînes = réalité SQL (registre + journal)',
    temoin.registre.teteChaine === teteRegistre.hash_ecriture &&
    temoin.registre.derniereEcriture === premierValide.numero &&
    temoin.journal.teteChaine === teteJournal.hash);
  verifier('compteurs et intervalle de numéros constatés',
    temoin.registre.ecrituresScellees === 1 &&
    temoin.registre.mouvementsTotal === 1 &&
    temoin.journal.entrees > 0 &&
    temoin.registre.numeros.length === 1 &&
    temoin.registre.numeros[0].mode === 'FORMATION' &&
    temoin.registre.numeros[0].premier === premierValide.numero &&
    temoin.registre.numeros[0].dernier === premierValide.numero,
    JSON.stringify(temoin.registre));
  verifier('versions constatées (logiciel, base, moteur réglementaire)',
    temoin.versionLogiciel === '8.0.0-dev' &&
    Number(temoin.versionBase) >= 22 &&
    /^[0-9a-f]{64}$/.test(temoin.empreinteMoteurReglementaire));
  verifier('premier témoin : aucun témoin précédent',
    temoin.temoinPrecedent === null);

  // La recette embarquée suffit à vérifier l'empreinte SANS le logiciel.
  const copie = JSON.parse(readFileSync(chemin, 'utf8'));
  const empreinteLue = copie.empreinte;
  delete copie.empreinte;
  verifier('empreinte du témoin AUTO-VÉRIFIABLE par la recette embarquée',
    sha256(JSON.stringify(copie)) === empreinteLue);
}

// ============================================================
// 2. Le CROCHET RÉEL : chaque écriture scellée rafraîchit le témoin
// ============================================================
{
  const second = validerUnMouvement(); // api.appeler → crochet du lot D
  const chemin = join(scellement.dossierScellement(),
    `${scellement.PREFIXE_TEMOIN}${jourLocal(new Date())}.json`);
  const temoin = JSON.parse(readFileSync(chemin, 'utf8'));
  verifier('après validation via api.appeler : témoin du jour RAFRAÎCHI',
    temoin.registre.ecrituresScellees === 2 &&
    temoin.registre.derniereEcriture === second.numero &&
    temoin.registre.teteChaine === db.get(
      `SELECT hash_ecriture FROM mouvements
       WHERE ordre_validation IS NOT NULL
       ORDER BY ordre_validation DESC LIMIT 1`).hash_ecriture,
    JSON.stringify(temoin.registre));
}

// ============================================================
// 3. Mini-chaîne entre jours + falsification de la veille VISIBLE
// ============================================================
{
  const hier = jourLocal(new Date(Date.now() - 86400000));
  const cheminHier = join(scellement.dossierScellement(),
    `${scellement.PREFIXE_TEMOIN}${hier}.json`);
  const contenuHier = JSON.stringify({ date: hier, exemple: 'témoin de la veille' });
  writeFileSync(cheminHier, contenuHier);

  scellement.ecrireTemoinQuotidien();
  const temoin = JSON.parse(readFileSync(join(scellement.dossierScellement(),
    `${scellement.PREFIXE_TEMOIN}${jourLocal(new Date())}.json`), 'utf8'));
  verifier('le témoin du jour embarque la date ET l’empreinte de la veille',
    temoin.temoinPrecedent?.date === hier &&
    temoin.temoinPrecedent?.empreinte === sha256(contenuHier));

  // L'ATTAQUE : réécrire la veille après coup — l'empreinte enregistrée
  // dans le témoin du jour ne correspond plus au fichier.
  writeFileSync(cheminHier, JSON.stringify({ date: hier, exemple: 'RÉÉCRIT' }));
  verifier('falsification de la veille DÉTECTABLE (empreinte divergente)',
    sha256(readFileSync(cheminHier, 'utf8')) !== temoin.temoinPrecedent.empreinte);
}

// ============================================================
// 4. Best-effort absolu : l'échec se journalise, ne bloque jamais
// ============================================================
{
  // Rend le dossier de scellement INUTILISABLE : un FICHIER porte son nom.
  rmSync(scellement.dossierScellement(), { recursive: true, force: true });
  writeFileSync(scellement.dossierScellement(), 'pas un dossier');

  const compteRendu = scellement.ecrireTemoinQuotidien();
  verifier('dossier inutilisable : compte-rendu d’échec, AUCUNE exception',
    compteRendu.fait === false && Boolean(compteRendu.erreur));

  const avant = db.get('SELECT COUNT(*) AS n FROM journal_audit').n;
  const valide = validerUnMouvement(); // le crochet échoue, la validation NON
  verifier('l’écriture scellée ABOUTIT malgré l’échec du témoin',
    valide.statut === 'VALIDE');
  const echec = db.get(
    `SELECT action, details FROM journal_audit
     WHERE action = 'SCELLEMENT_ECHEC' ORDER BY id DESC LIMIT 1`);
  const apres = db.get('SELECT COUNT(*) AS n FROM journal_audit').n;
  verifier('l’échec du témoin est JOURNALISÉ (SCELLEMENT_ECHEC)',
    Boolean(echec) && apres > avant, JSON.stringify(echec));

  rmSync(scellement.dossierScellement(), { force: true });
}

// ------------------------------------------------------------
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [scellement externe]`);
process.exit(nbEchecs === 0 ? 0 : 1);
