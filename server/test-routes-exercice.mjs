// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// MODE EXERCICE — preuve des routes serveur (13/08/2026, plan
// docs/PLAN-MODE-EXERCICE.md). VRAI serveur HTTP (process enfant, copie
// jetable — jamais le data/ réel, jamais le port 2011).
//
// Familles :
//   1. etatExercice : session requise ; code non défini au départ.
//   2. demarrerExercice AVANT toute définition → refus, MÊME message
//      qu'un code faux (indiscernables).
//   3. definirCodeExercice : sans session 403, ÉLÈVE 403, code court 400,
//      ADMIN + code correct → défini.
//   4. demarrerExercice : mauvais code 403 (message unique) ; BON code →
//      la photo COMPLÈTE (enveloppe d'export) + la date — y compris pour
//      un rôle ÉLÈVE muni du code (décision du propriétaire : le code EST
//      la clé, pas le rôle).
//   5. Journal chaîné : DEFINITION_CODE_EXERCICE et DEMARRAGE_EXERCICE
//      tracés — et le code en clair n'apparaît NULLE PART au journal.
// ============================================================

import { spawn } from 'node:child_process';
import { mkdtempSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

function requeteJson(port, methodeApi, params, { cookie } = {}) {
  return new Promise((resoudre, rejeter) => {
    const corps = JSON.stringify({ params: params ?? {} });
    const entetes = {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(corps),
      'Host': `127.0.0.1:${port}`,
    };
    if (cookie) entetes['Cookie'] = cookie;
    const requete = http.request({
      hostname: '127.0.0.1', port, path: `/api/${methodeApi}`,
      method: 'POST', headers: entetes,
    }, (reponse) => {
      let brut = '';
      reponse.on('data', (d) => { brut += d; });
      reponse.on('end', () => {
        let corpsReponse = null;
        try { corpsReponse = JSON.parse(brut); } catch { /* brut illisible */ }
        resoudre({
          statut: reponse.statusCode,
          corps: corpsReponse,
          setCookie: reponse.headers['set-cookie']?.[0] ?? null,
        });
      });
    });
    requete.on('error', rejeter);
    requete.write(corps);
    requete.end();
  });
}

function cookieDepuis(setCookie) {
  const m = /^iwf_session=([^;]*)/.exec(setCookie ?? '');
  return m ? `iwf_session=${m[1]}` : null;
}

// ---- Serveur jetable ----
const DOSSIER = mkdtempSync(join(tmpdir(), 'inerweb-fluide-routes-exercice-'));
cpSync(join(import.meta.dirname, '.'), join(DOSSIER, 'server'), { recursive: true });
const PORT = 2603 + Math.floor(Math.random() * 500);
const enfant = spawn(process.execPath, ['server/serveur.js'], {
  cwd: DOSSIER,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let sortieServeur = '';
enfant.stdout.on('data', (d) => { sortieServeur += d.toString(); });
enfant.stderr.on('data', (d) => { sortieServeur += d.toString(); });

async function attendreDemarrage(dureeMaxMs = 10000) {
  const debut = Date.now();
  while (Date.now() - debut < dureeMaxMs) {
    try {
      const r = await requeteJson(PORT, 'ping', {});
      if (r.statut === 200) return true;
    } catch { /* pas encore prêt */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

const pret = await attendreDemarrage();
verifier('le serveur jetable démarre et répond à /api/ping', pret, sortieServeur);
if (!pret) { console.error(sortieServeur); enfant.kill(); process.exit(1); }

// ---- Décor : 1er ADMIN + un compte ÉLÈVE connecté ----
const rBoot = await requeteJson(PORT, 'bootstrapAdmin',
  { login: 'admin.exo', motDePasse: 'MotDePasseAdmin-Exo-2026' });
verifier('outillage : bootstrap du 1er ADMIN', rBoot.statut === 200,
  JSON.stringify(rBoot.corps));
const cookieAdmin = cookieDepuis(rBoot.setCookie);

await requeteJson(PORT, 'creerCompte',
  { login: 'stagiaire.exo', motDePasseInitial: 'MotDePasseEleve-1', role: 'ELEVE' },
  { cookie: cookieAdmin });
const rConnEleve = await requeteJson(PORT, 'connexion',
  { login: 'stagiaire.exo', motDePasse: 'MotDePasseEleve-1' });
const cookieEleve = cookieDepuis(rConnEleve.setCookie);
verifier('outillage : un stagiaire (ÉLÈVE) est connecté',
  rConnEleve.statut === 200 && Boolean(cookieEleve));

// ============================================================
// 1. etatExercice : session requise ; aucun code au départ
// ============================================================
{
  const rSans = await requeteJson(PORT, 'etatExercice', {});
  verifier('etatExercice SANS session → 403', rSans.statut === 403);
  const rEtat = await requeteJson(PORT, 'etatExercice', {},
    { cookie: cookieAdmin });
  verifier('etatExercice : aucun code défini au départ',
    rEtat.statut === 200 && rEtat.corps?.resultat?.codeDefini === false,
    JSON.stringify(rEtat.corps));
}

// ============================================================
// 2. demarrerExercice AVANT définition : refus INDISCERNABLE d'un code faux
// ============================================================
let messageRefusAvant = null;
{
  const r = await requeteJson(PORT, 'demarrerExercice',
    { code: 'peu-importe' }, { cookie: cookieAdmin });
  verifier('démarrage sans code défini → 403', r.statut === 403,
    JSON.stringify(r.corps));
  messageRefusAvant = r.corps?.erreur;
}

// ============================================================
// 3. definirCodeExercice : gardes puis définition
// ============================================================
{
  const rSans = await requeteJson(PORT, 'definirCodeExercice',
    { code: 'Formation-2026' });
  verifier('définir le code SANS session → 403', rSans.statut === 403);
  const rEleve = await requeteJson(PORT, 'definirCodeExercice',
    { code: 'Formation-2026' }, { cookie: cookieEleve });
  verifier('définir le code en ÉLÈVE → 403 (ADMIN/RÉFÉRENT seulement)',
    rEleve.statut === 403, JSON.stringify(rEleve.corps));
  const rCourt = await requeteJson(PORT, 'definirCodeExercice',
    { code: 'abc' }, { cookie: cookieAdmin });
  verifier('code trop court (< 4) → 400', rCourt.statut === 400,
    JSON.stringify(rCourt.corps));
  const rOk = await requeteJson(PORT, 'definirCodeExercice',
    { code: 'Formation-2026' }, { cookie: cookieAdmin });
  verifier('ADMIN définit le code → 200', rOk.statut === 200,
    JSON.stringify(rOk.corps));
  const rEtat = await requeteJson(PORT, 'etatExercice', {},
    { cookie: cookieAdmin });
  verifier('etatExercice : le code est maintenant défini',
    rEtat.corps?.resultat?.codeDefini === true);
}

// ============================================================
// 4. demarrerExercice : mauvais code, puis bon code (ÉLÈVE compris)
// ============================================================
{
  const rFaux = await requeteJson(PORT, 'demarrerExercice',
    { code: 'Mauvais-Code' }, { cookie: cookieAdmin });
  verifier('mauvais code → 403', rFaux.statut === 403);
  verifier('⭐ « code faux » et « code non défini » : MÊME message '
    + '(indiscernables)',
  rFaux.corps?.erreur === messageRefusAvant,
  `avant=${messageRefusAvant} | après=${rFaux.corps?.erreur}`);

  const rSansSession = await requeteJson(PORT, 'demarrerExercice',
    { code: 'Formation-2026' });
  verifier('bon code mais SANS session → 403 (le code ne remplace pas la '
    + 'session)', rSansSession.statut === 403);

  const rBon = await requeteJson(PORT, 'demarrerExercice',
    { code: 'Formation-2026' }, { cookie: cookieEleve });
  verifier('⭐ bon code + session ÉLÈVE → la photo est délivrée (le CODE '
    + 'est la clé, décision du propriétaire)',
  rBon.statut === 200 && typeof rBon.corps?.resultat?.photo === 'string',
  JSON.stringify(rBon.corps).slice(0, 200));
  const photo = JSON.parse(rBon.corps.resultat.photo);
  verifier('la photo est l’export COMPLET (enveloppe, données, mouvements)',
    photo.application === 'inerWeb Fluide'
    && photo.donnees && Array.isArray(photo.donnees.mouvements));
  verifier('la date de la photo accompagne la réponse',
    typeof rBon.corps.resultat.date === 'string'
    && rBon.corps.resultat.date.length > 0);
}

// ============================================================
// 5. Journal chaîné : les gestes tracés, jamais le code en clair
// ============================================================
{
  const bdd = new DatabaseSync(join(DOSSIER, 'data', 'inerweb-fluide.db'));
  const definition = bdd.prepare(
    `SELECT COUNT(*) AS n FROM journal_audit
     WHERE action = 'DEFINITION_CODE_EXERCICE'`).get();
  verifier('DEFINITION_CODE_EXERCICE tracée au journal', definition.n === 1,
    `entrées : ${definition.n}`);
  const demarrage = bdd.prepare(
    `SELECT COUNT(*) AS n FROM journal_audit
     WHERE action = 'DEMARRAGE_EXERCICE'`).get();
  verifier('DEMARRAGE_EXERCICE tracé au journal (on sait QUI a tiré la photo)',
    demarrage.n === 1, `entrées : ${demarrage.n}`);
  const fuite = bdd.prepare(
    `SELECT COUNT(*) AS n FROM journal_audit
     WHERE details LIKE '%Formation-2026%'`).get();
  verifier('⭐ le code en clair n’apparaît NULLE PART au journal',
    fuite.n === 0, `entrées le portant : ${fuite.n}`);
  bdd.close();
}

// ============================================================
// Verdict
// ============================================================
enfant.kill();
console.log('');
console.log(`${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Routes du mode exercice : tout est vert.');
