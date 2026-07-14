// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — PREUVE de getUtilisateurCourant câblé sur la SESSION
// (V9-E5, finition — remplace le stub « premier REFERENT du personnel »).
// Exécution : node server/test-utilisateur-courant.mjs
//
// Éprouve que getUtilisateurCourant renvoie l'utilisateur RÉELLEMENT
// authentifié (contexte.utilisateur issu du cookie iwf_session), en lançant
// un VRAI serveur HTTP (process enfant, copie jetable de server/ sous
// os.tmpdir() — jamais le data/ réel, jamais le port 2011 réel).
//
// Familles :
//   1. Base fraîche, personnel VIDE, SANS session (loopback) → repli
//      historique : Error « Aucun référent dans le personnel. » (inchangé).
//   2. Session ADMIN (compte amorcé en CLI, personnel_id NULL, personnel
//      encore VIDE) → 200, objet minimal { id: compte, roleApp: 'ADMIN' }.
//      C'EST LE BUG CORRIGÉ : avant, le wizard « Nouveau mouvement » ne
//      s'ouvrait pas du tout faute de référent dans le personnel.
//   3. Session d'un compte LIÉ à une fiche personnel → l'identité riche de la
//      fiche (id PER-…, prénom, nom), roleApp = rôle de la SESSION.
//   4. Divergence fiche/session : compte REFERENT lié à une fiche ELEVE →
//      roleApp = 'REFERENT' (la session fait autorité, jamais la fiche).
//   5. Retour au loopback SANS session, personnel désormais peuplé → repli
//      premier REFERENT (comportement d'avant E5, préservé).
//
// Node ≥ 22 (node:sqlite, node:http natifs), sans DOM.
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
// Petit client HTTP natif (contrôle total sur Cookie).
// ------------------------------------------------------------
function requeteJson(port, methodeApi, params, { cookie, host } = {}) {
  return new Promise((resoudre, rejeter) => {
    const corps = JSON.stringify({ params: params ?? {} });
    const entetes = {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(corps),
      'Host': host ?? `127.0.0.1:${port}`,
    };
    if (cookie) entetes['Cookie'] = cookie;
    const requete = http.request({
      hostname: '127.0.0.1',
      port,
      path: `/api/${methodeApi}`,
      method: 'POST',
      headers: entetes,
    }, (reponse) => {
      const morceaux = [];
      reponse.on('data', (m) => morceaux.push(m));
      reponse.on('end', () => {
        let corpsJson = null;
        try { corpsJson = JSON.parse(Buffer.concat(morceaux).toString('utf8')); }
        catch { /* corps vide ou non JSON */ }
        resoudre({
          statut: reponse.statusCode,
          setCookie: reponse.headers['set-cookie']?.[0] ?? null,
          corps: corpsJson,
        });
      });
    });
    requete.on('error', rejeter);
    requete.write(corps);
    requete.end();
  });
}

/** Extrait le jeton du cookie posé (« iwf_session=XXX; HttpOnly; ... »). */
function extraireJetonDuSetCookie(setCookie) {
  if (!setCookie) return null;
  const m = /^iwf_session=([^;]*)/.exec(setCookie);
  return m ? m[1] : null;
}

// ------------------------------------------------------------
// Serveur jetable : copie de server/ sous un dossier temporaire, lancé en
// process enfant sur un port dédié.
// ------------------------------------------------------------
const DOSSIER = mkdtempSync(join(tmpdir(), 'inerweb-fluide-uti-courant-'));
cpSync(join(import.meta.dirname, '.'), join(DOSSIER, 'server'), { recursive: true });

const PORT = 2600 + Math.floor(Math.random() * 500); // évite les collisions

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
if (!pret) {
  console.error(sortieServeur);
  enfant.kill();
  process.exit(1);
}

// ------------------------------------------------------------
// Amorçage : un compte ADMIN créé DIRECTEMENT en base (simule le CLI
// creer-admin.js), SANS fiche personnel (personnel_id NULL) — exactement le
// cas d'une base fraîche où seul l'admin existe et où le personnel est vide.
// ------------------------------------------------------------
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const cheminDb = join(DOSSIER, 'data', 'inerweb-fluide.db');
const dbTest = require(join(DOSSIER, 'server', 'db.js'));
const comptesTest = require(join(DOSSIER, 'server', 'comptes.js'));

/**
 * Insère un lot de comptes en base (une seule ouverture/fermeture de la base
 * partagée en WAL avec le process enfant — évite les cycles répétés). Chaque
 * compte : { id, login, motDePasse, role, personnelId? }.
 */
function seederComptes(comptes) {
  dbTest.ouvrir(cheminDb);
  try {
    for (const c of comptes) {
      const { hash, sel } = comptesTest.hacherMotDePasse(c.motDePasse);
      dbTest.run(
        `INSERT INTO utilisateurs_app (id, login, hash_mot_de_passe, sel, role, personnel_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [c.id, c.login, hash, sel, c.role, c.personnelId ?? null]);
    }
  } finally {
    dbTest.fermer();
  }
}

const MDP_ADMIN = 'MotDePasseAdmin-Amorce-2026';
seederComptes([
  { id: 'UTI-ADMIN-AMORCE', login: 'admin.amorce', motDePasse: MDP_ADMIN, role: 'ADMIN' },
]);

// ============================================================
// 1. Base fraîche, personnel VIDE, SANS session (loopback) → repli historique
// ============================================================
{
  const r = await requeteJson(PORT, 'getUtilisateurCourant', {});
  verifier('sans session + personnel vide → Error « Aucun référent » (repli historique)',
    r.statut === 400 && r.corps?.erreur === 'Aucun référent dans le personnel.',
    JSON.stringify(r.corps));
}

// ============================================================
// 2. Session ADMIN, personnel toujours VIDE → objet minimal (BUG CORRIGÉ)
// ============================================================
let cookieAdmin;
{
  const rLogin = await requeteJson(PORT, 'connexion',
    { login: 'admin.amorce', motDePasse: MDP_ADMIN });
  verifier('connexion ADMIN → 200', rLogin.statut === 200, JSON.stringify(rLogin.corps));
  cookieAdmin = `iwf_session=${extraireJetonDuSetCookie(rLogin.setCookie)}`;

  const r = await requeteJson(PORT, 'getUtilisateurCourant', {}, { cookie: cookieAdmin });
  const u = r.corps?.resultat;
  verifier('session ADMIN sans fiche personnel → 200 (le wizard peut s\'ouvrir)',
    r.statut === 200, JSON.stringify(r.corps));
  verifier('… l\'utilisateur courant est le compte de session, pas un référent inventé',
    u?.id === 'UTI-ADMIN-AMORCE' && u?.roleApp === 'ADMIN', JSON.stringify(u));
  verifier('… objet de forme « personnel » complète (nom=login, prénom vide, attestations nulles)',
    u?.nom === 'admin.amorce' && u?.prenom === '' &&
    Array.isArray(u?.activitesAutorisees) && u?.activitesAutorisees.length === 0 &&
    u?.numAttestationAptitude === null && u?.actif === true,
    JSON.stringify(u));
}

// ============================================================
// 3+4. Comptes liés à une fiche personnel : identité riche + rôle de session
// ============================================================
// On crée (via HTTP, session ADMIN) deux fiches personnel, puis on seede deux
// comptes qui les référencent : un REFERENT lié à une fiche REFERENT (cas
// nominal), et un REFERENT lié à une fiche ELEVE (divergence rôle).
let idFicheReferent;
let idFicheEleve;
{
  // Prérequis produit : l'établissement singleton doit exister avant toute
  // fiche personnel (FK etablissement_id). Sur une vraie base il est configuré
  // à l'onboarding ; ici on l'amorce d'un patch minimal (session ADMIN).
  const rEtab = await requeteJson(PORT, 'updateEtablissement',
    { patch: { raisonSociale: 'Lycée de test' } }, { cookie: cookieAdmin });
  verifier('amorçage de l\'établissement (updateEtablissement, session ADMIN) → 200',
    rEtab.statut === 200, JSON.stringify(rEtab.corps));

  const rRef = await requeteJson(PORT, 'createPersonne',
    { donneesPersonne: { nom: 'Dupont', prenom: 'Jean',
      typePersonne: 'ENSEIGNANT', roleApp: 'REFERENT' } },
    { cookie: cookieAdmin });
  verifier('createPersonne (fiche REFERENT « Jean Dupont ») → 200',
    rRef.statut === 200, JSON.stringify(rRef.corps));
  idFicheReferent = rRef.corps?.resultat?.id;

  const rEleve = await requeteJson(PORT, 'createPersonne',
    { donneesPersonne: { nom: 'Martin', prenom: 'Léa',
      typePersonne: 'ELEVE', roleApp: 'ELEVE' } },
    { cookie: cookieAdmin });
  verifier('createPersonne (fiche ELEVE « Léa Martin ») → 200',
    rEleve.statut === 200, JSON.stringify(rEleve.corps));
  idFicheEleve = rEleve.corps?.resultat?.id;
}

const MDP_LIE = 'MotDePasseCompteLie-2026';
seederComptes([
  { id: 'UTI-REF-LIE', login: 'referent.lie', motDePasse: MDP_LIE,
    role: 'REFERENT', personnelId: idFicheReferent },
  // Compte au rôle REFERENT mais rattaché à une fiche dont roleApp = ELEVE :
  { id: 'UTI-REF-SUR-ELEVE', login: 'referent.sureleve', motDePasse: MDP_LIE,
    role: 'REFERENT', personnelId: idFicheEleve },
]);

// 3. Session d'un compte lié à sa fiche → identité de la fiche, rôle session
{
  const rLogin = await requeteJson(PORT, 'connexion',
    { login: 'referent.lie', motDePasse: MDP_LIE });
  const cookie = `iwf_session=${extraireJetonDuSetCookie(rLogin.setCookie)}`;
  const r = await requeteJson(PORT, 'getUtilisateurCourant', {}, { cookie });
  const u = r.corps?.resultat;
  verifier('session liée à une fiche → identité de la fiche (id PER-…, prénom, nom)',
    r.statut === 200 && u?.id === idFicheReferent &&
    u?.prenom === 'Jean' && u?.nom === 'Dupont', JSON.stringify(u));
  verifier('… roleApp = rôle de la SESSION (REFERENT)',
    u?.roleApp === 'REFERENT', JSON.stringify(u));
}

// 4. Divergence : compte REFERENT lié à une fiche ELEVE → roleApp REFERENT
{
  const rLogin = await requeteJson(PORT, 'connexion',
    { login: 'referent.sureleve', motDePasse: MDP_LIE });
  const cookie = `iwf_session=${extraireJetonDuSetCookie(rLogin.setCookie)}`;
  const r = await requeteJson(PORT, 'getUtilisateurCourant', {}, { cookie });
  const u = r.corps?.resultat;
  verifier('compte REFERENT sur fiche ELEVE → identité de la fiche',
    r.statut === 200 && u?.id === idFicheEleve && u?.prenom === 'Léa',
    JSON.stringify(u));
  verifier('… mais roleApp = REFERENT (session), JAMAIS ELEVE (fiche)',
    u?.roleApp === 'REFERENT', JSON.stringify(u));
}

// ============================================================
// 5. Retour au loopback SANS session, personnel désormais peuplé → repli
//    premier REFERENT (comportement d'avant E5, préservé).
// ============================================================
{
  const r = await requeteJson(PORT, 'getUtilisateurCourant', {});
  const u = r.corps?.resultat;
  verifier('sans session, personnel peuplé → repli premier REFERENT (Jean Dupont)',
    r.statut === 200 && u?.id === idFicheReferent && u?.roleApp === 'REFERENT',
    JSON.stringify(u));
}

// ============================================================
// Verdict + nettoyage
// ============================================================
enfant.kill();
await new Promise((r) => setTimeout(r, 300)); // laisse le temps de libérer le .db
try {
  rmSync(DOSSIER, { recursive: true, force: true });
} catch {
  // Best-effort : sous Windows, WAL/SHM peuvent rester verrouillés un instant.
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('getUtilisateurCourant câblé sur la session (V9-E5) : tout est vert.');
