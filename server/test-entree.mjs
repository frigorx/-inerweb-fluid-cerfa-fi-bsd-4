// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — PREUVE de l'entrée par défaut du serveur local (v9)
// Exécution : node server/test-entree.mjs
//
// Éprouve serveur.js : l'entrée par défaut ('/' et '/index.html') DOIT
// rediriger (302) vers '/v8/' — l'application v9 réelle — au lieu de servir
// silencieusement l'ancienne v7 restée à la racine du dépôt. Lance un VRAI
// serveur HTTP (process enfant, copie jetable de server/ sous os.tmpdir(),
// même patron que test-routes-comptes.mjs — jamais le data/ réel, jamais le
// port 2011 réel).
//
// Familles :
//   1. GET / → 302, Location: /v8/.
//   2. GET /index.html → 302, Location: /v8/ (même traitement que '/').
//   3. GET /v8/ → 200, PAS de redirection (pas de boucle).
//   4. GET /v8/index.html → 200, PAS de redirection.
//   5. GET /api/ping → 200 { mode: 'local' } (route inchangée par le correctif).
//
// Node ≥ 22 (node:http natif), sans DOM.
// ============================================================

import { spawn } from 'node:child_process';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';

// ------------------------------------------------------------
// Outillage de vérification (conventions maison des suites v8/v9).
// ------------------------------------------------------------
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
// Petit client HTTP natif : ne suit JAMAIS la redirection automatiquement
// (on veut observer le 302 et son en-tête Location tels quels).
// ------------------------------------------------------------
function requeteGet(port, chemin) {
  return new Promise((resoudre, rejeter) => {
    const requete = http.request({
      hostname: '127.0.0.1',
      port,
      path: chemin,
      method: 'GET',
      headers: { 'Host': `127.0.0.1:${port}` },
    }, (reponse) => {
      const morceaux = [];
      reponse.on('data', (m) => morceaux.push(m));
      reponse.on('end', () => {
        resoudre({
          statut: reponse.statusCode,
          location: reponse.headers['location'] ?? null,
          corps: Buffer.concat(morceaux).toString('utf8'),
        });
      });
    });
    requete.on('error', rejeter);
    requete.end();
  });
}

function requeteJson(port, methodeApi) {
  return new Promise((resoudre, rejeter) => {
    const corps = JSON.stringify({ params: {} });
    const requete = http.request({
      hostname: '127.0.0.1',
      port,
      path: `/api/${methodeApi}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(corps),
        'Host': `127.0.0.1:${port}`,
      },
    }, (reponse) => {
      const morceaux = [];
      reponse.on('data', (m) => morceaux.push(m));
      reponse.on('end', () => {
        let corpsJson = null;
        try { corpsJson = JSON.parse(Buffer.concat(morceaux).toString('utf8')); }
        catch { /* corps vide ou non JSON */ }
        resoudre({ statut: reponse.statusCode, corps: corpsJson });
      });
    });
    requete.on('error', rejeter);
    requete.write(corps);
    requete.end();
  });
}

// ------------------------------------------------------------
// Serveur jetable : copie de server/ sous un dossier temporaire, lancé en
// process enfant sur un port dédié (même patron que test-routes-comptes.mjs).
// Copie aussi v8/ (index.html + css/ + js/ minimal) pour que '/v8/' réponde
// vraiment 200 — sans quoi le test 3/4 ne prouverait rien.
// ------------------------------------------------------------
const DOSSIER = mkdtempSync(join(tmpdir(), 'inerweb-fluide-entree-'));
cpSync(join(import.meta.dirname, '.'), join(DOSSIER, 'server'), { recursive: true });
cpSync(join(import.meta.dirname, '..', 'v8'), join(DOSSIER, 'v8'), { recursive: true });

const PORT = 2593 + Math.floor(Math.random() * 500); // évite les collisions entre lancements

const enfant = spawn(process.execPath, ['server/serveur.js'], {
  cwd: DOSSIER,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let sortieServeur = '';
enfant.stdout.on('data', (d) => { sortieServeur += d.toString(); });
enfant.stderr.on('data', (d) => { sortieServeur += d.toString(); });

/** Attend que /api/ping réponde (le serveur a fini sa séquence de démarrage). */
async function attendreDemarrage(dureeMaxMs = 10000) {
  const debut = Date.now();
  while (Date.now() - debut < dureeMaxMs) {
    try {
      const r = await requeteJson(PORT, 'ping');
      if (r.statut === 200) return true;
    } catch { /* pas encore prêt */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

const pret = await attendreDemarrage();
verifier('le serveur jetable démarre et répond à /api/ping', pret, sortieServeur);
if (!pret) {
  console.error(sortieServeur);
  enfant.kill();
  process.exit(1);
}

// ============================================================
// 1. GET / → 302, Location: /v8/
// ============================================================
{
  const r = await requeteGet(PORT, '/');
  verifier('GET / → 302', r.statut === 302, `statut=${r.statut}`);
  verifier('GET / → Location: /v8/', r.location === '/v8/', `location=${r.location}`);
}

// ============================================================
// 2. GET /index.html → 302, Location: /v8/
// ============================================================
{
  const r = await requeteGet(PORT, '/index.html');
  verifier('GET /index.html → 302', r.statut === 302, `statut=${r.statut}`);
  verifier('GET /index.html → Location: /v8/', r.location === '/v8/', `location=${r.location}`);
}

// ============================================================
// 3. GET /v8/ → 200, pas de redirection (pas de boucle)
// ============================================================
{
  const r = await requeteGet(PORT, '/v8/');
  verifier('GET /v8/ → 200 (pas de redirection)', r.statut === 200, `statut=${r.statut}`);
  verifier('GET /v8/ → aucun en-tête Location', r.location === null, `location=${r.location}`);
}

// ============================================================
// 4. GET /v8/index.html → 200, pas de redirection (pas de boucle)
// ============================================================
{
  const r = await requeteGet(PORT, '/v8/index.html');
  verifier('GET /v8/index.html → 200 (pas de redirection)', r.statut === 200, `statut=${r.statut}`);
  verifier('GET /v8/index.html → aucun en-tête Location', r.location === null, `location=${r.location}`);
}

// ============================================================
// 5. GET /api/ping → 200 { mode: 'local' } (route inchangée)
// ============================================================
{
  const r = await requeteJson(PORT, 'ping');
  verifier('GET /api/ping → 200', r.statut === 200, JSON.stringify(r.corps));
  verifier('GET /api/ping → mode: local', r.corps?.mode === 'local', JSON.stringify(r.corps));
}

// ============================================================
// Verdict + nettoyage
// ============================================================
enfant.kill();
await new Promise((r) => setTimeout(r, 300)); // laisse le temps de libérer le fichier .db
try {
  rmSync(DOSSIER, { recursive: true, force: true });
} catch {
  // Best-effort : sous Windows, WAL/SHM peuvent rester verrouillés un court
  // instant après l'arrêt du process — ne fait pas échouer la suite.
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Entrée par défaut du serveur local (v9) : tout est vert.');
