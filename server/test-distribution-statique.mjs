// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — PREUVE de la DISTRIBUTION ALLOWLISTÉE (P2-4).
// Exécution : node server/test-distribution-statique.mjs
//
// Constat (audit externe #2, 20/07, P2-4) : « Racine HTTP trop large (sert
// code historique, docs, .env.example, .clasp.json) ». La règle était une
// liste NOIRE — data, documents, backups, server, .git, .env — donc TOUT
// le reste du dépôt était servi. Vérifié en le TIRANT avant correctif :
// `/docs/AUDIT-INERWEB-FLUIDE-2026-07-20.md` (le rapport qui ÉNUMÈRE les
// faiblesses connues), `/CHANGELOG.md`, `/README.md`,
// `/Code_API_v7.1.0.gs` et `/apps-script/Code.gs` répondaient 200.
//
// Une liste noire est fausse par construction : elle oublie tout ce qu'on
// ajoute ensuite au dépôt. La règle est désormais une liste BLANCHE — seuls
// `v8/`, `img/` et trois fichiers de racine sont servis.
//
// Ce test tient les DEUX bouts, et c'est le point :
//   1. l'application reste entièrement servie (sinon le correctif casse le
//      logiciel — un 404 sur une police ou un module ES le rendrait muet) ;
//   2. rien d'autre ne l'est, y compris des chemins qui n'existent pas
//      encore (le fichier ajouté demain n'est pas exposé par accident).
//
// Le refus est un 404, pas un 403 : on ne confirme pas l'existence d'un
// fichier privé à qui le demande.
//
// Isolation : serveur enfant sur port haut aléatoire, base JETABLE via
// IWF_CHEMIN_BASE (jamais data/ réel), process tué dans un `finally`.
// ============================================================

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import http from 'node:http';

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

// Conversion PORTABLE : même construction que les suites sœurs
// (test-emplacement-base, test-lan-https, test-transport-http). L'ancienne
// forme — « pathname » d'une URL de fichier, puis retrait du slash de
// tête — ne marchait QUE sous Windows : sous Unix elle transformait le
// chemin absolu en chemin relatif et un auditeur externe concluait à tort
// que le logiciel était cassé (audit externe P2-03, constat A23).
const CHEMIN_SERVEUR = join(import.meta.dirname, 'serveur.js');
const PORT = 21000 + Math.floor(Math.random() * 2000);
const DOSSIER = mkdtempSync(join(tmpdir(), 'iwf-dist-'));
const CHEMIN_BASE = join(DOSSIER, 'data', 'jetable.db');

/** GET simple : rend le code HTTP (0 si la requête échoue). */
function codeDe(chemin) {
  return new Promise((resoudre) => {
    const requete = http.get(
      { host: '127.0.0.1', port: PORT, path: chemin, timeout: 5000 },
      (reponse) => {
        reponse.resume();
        resoudre(reponse.statusCode);
      });
    requete.on('error', () => resoudre(0));
    requete.on('timeout', () => { requete.destroy(); resoudre(0); });
  });
}

// ============================================================
// 0. PORTABILITÉ DU HARNAIS (audit externe P2-03, constat A23)
// La conversion URL→chemin par « .pathname » + retrait du « / » de tête
// est un piège : correcte sous Windows, elle rend un chemin RELATIF sous
// Unix et fait échouer le lancement du serveur enfant. Deux gardes :
//   a) balayage statique des sources — le motif ne doit réapparaître
//      nulle part (c'est la racine qui compte, pas l'occurrence) ;
//   b) le chemin du serveur enfant est ABSOLU sur la machine courante.
// ============================================================
console.log('--- 0. Portabilité du harnais de test ---');
{
  const RACINE = join(import.meta.dirname, '..');
  const MOTIF_NON_PORTABLE = /\.pathname\s*\.replace\s*\(/;
  const fichiersFautifs = [];
  const balayer = (dossier) => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, entree.name);
      if (entree.isDirectory()) {
        if (entree.name === 'node_modules' || entree.name === '.git') continue;
        balayer(chemin);
      } else if (/\.(mjs|js)$/.test(entree.name)
        && MOTIF_NON_PORTABLE.test(readFileSync(chemin, 'utf8'))) {
        fichiersFautifs.push(chemin);
      }
    }
  };
  for (const dossier of ['server', 'outils', 'v8']) balayer(join(RACINE, dossier));
  verifier('aucune conversion URL vers chemin par « pathname » plus retrait '
    + 'du slash de tête dans les sources',
    fichiersFautifs.length === 0, fichiersFautifs.join(', '));
  verifier('le chemin du serveur enfant est absolu (portable Unix et Windows)',
    isAbsolute(CHEMIN_SERVEUR), CHEMIN_SERVEUR);
}

let enfant = null;
try {
  enfant = spawn(process.execPath, [CHEMIN_SERVEUR], {
    env: { ...process.env, PORT: String(PORT), IWF_CHEMIN_BASE: CHEMIN_BASE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let sortie = '';
  enfant.stdout.on('data', (d) => { sortie += d.toString(); });
  enfant.stderr.on('data', (d) => { sortie += d.toString(); });

  // Attente du démarrage (borné).
  const pret = await new Promise((resoudre) => {
    const debut = Date.now();
    const tic = setInterval(async () => {
      if (sortie.includes('serveur local démarré')) {
        clearInterval(tic); resoudre(true); return;
      }
      if (Date.now() - debut > 20000) { clearInterval(tic); resoudre(false); }
    }, 200);
  });
  verifier('le serveur de test démarre sur une base jetable', pret,
    sortie.slice(0, 300));

  // ============================================================
  // 1. L'APPLICATION RESTE ENTIÈREMENT SERVIE
  // Si l'un de ces chemins tombe, le correctif a cassé le logiciel.
  // ============================================================
  console.log('--- 1. Ce que l’application exige ---');
  const SERVIS = [
    '/v8/index.html',           // l'application
    '/v8/css/tokens.css',       // feuilles de style
    '/v8/js/app.js',            // modules ES
    '/v8/js/data/contrat.js',   // module profond (les imports en chaîne)
    '/img/icon-192.png',        // icône du manifeste
    '/manifest.json',           // manifeste PWA
    '/guide.html',              // guide utilisateur
  ];
  for (const chemin of SERVIS) {
    const code = await codeDe(chemin);
    verifier(`servi : ${chemin}`, code === 200, `code ${code}`);
  }
  // La racine « / » sert la vitrine (ou redirige vers l'application).
  {
    const code = await codeDe('/');
    verifier('servi : / (vitrine ou redirection)',
      code === 200 || code === 302, `code ${code}`);
  }

  // ============================================================
  // 2. ⭐ RIEN D'AUTRE N'EST SERVI
  // Chacun de ces chemins répondait 200 AVANT le correctif (sauf ceux
  // que la liste noire couvrait déjà) — vérifié en le tirant.
  // ============================================================
  console.log('--- 2. Ce qui ne doit PAS sortir ---');
  const REFUSES = [
    // ⭐ Le rapport d'audit : il ÉNUMÈRE les faiblesses connues du logiciel.
    '/docs/AUDIT-INERWEB-FLUIDE-2026-07-20.md',
    '/docs/CARTE-CODE.md',              // la carte du code
    '/docs/CONDITIONS-BLOCANTES-OFFICIEL.md',
    '/CHANGELOG.md',                    // l'historique complet du chantier
    '/README.md',
    '/SECURITE.md',
    '/RGPD.md',
    // Code v7 RETIRÉ du dépôt le 25/07/2026 (la v7 a été digérée par la v8) :
    // l'entrée RESTE au test — un chemin qui n'existe même plus ne doit
    // jamais être servi (le sens de la liste blanche : elle ne dépend pas
    // de ce qui reste dans le dépôt).
    '/Code_API_v7.1.0.gs',
    '/apps-script/Code.gs',
    '/.env.example',                    // métadonnées de déploiement
    '/.gitignore',
    '/server/api.js',                   // le code serveur
    '/server/serveur.js',
    '/data/jetable.db',                 // les données
    '/backups/',
    '/outils/lancer-tests.mjs',
    '/design/',
    '/lancer-inerweb.bat',
  ];
  for (const chemin of REFUSES) {
    const code = await codeDe(chemin);
    verifier(`refusé : ${chemin}`, code === 404, `code ${code}`);
  }

  // ============================================================
  // 3. La liste blanche vaut aussi pour l'INCONNU
  // Un fichier ajouté demain à la racine n'est pas exposé par accident :
  // c'est exactement ce qu'une liste noire ne sait pas faire.
  // ============================================================
  console.log('--- 3. Ce qui n’existe pas encore ---');
  for (const chemin of ['/secrets-du-lycee.md', '/notes/.env.production',
    '/un-dossier-ajoute-demain/fichier.json']) {
    const code = await codeDe(chemin);
    verifier(`refusé d’avance : ${chemin}`, code === 404, `code ${code}`);
  }

  // Traversée de chemin : toujours refusée (garde antérieure, non régressée).
  {
    const code = await codeDe('/v8/../server/api.js');
    verifier('traversée de chemin refusée (garde historique intacte)',
      code === 404 || code === 403, `code ${code}`);
  }
} finally {
  // Le serveur enfant tient la base ouverte : on attend sa sortie AVANT de
  // supprimer le dossier, sinon Windows refuse (EPERM). Le ménage reste
  // best-effort — un dossier temporaire oublié ne doit jamais faire échouer
  // un test qui a, lui, tout prouvé.
  if (enfant) {
    const fini = new Promise((resoudre) => {
      enfant.on('exit', resoudre);
      setTimeout(resoudre, 5000);
    });
    enfant.kill();
    await fini;
  }
  try {
    rmSync(DOSSIER, { recursive: true, force: true, maxRetries: 5,
      retryDelay: 200 });
  } catch {
    // Fichier encore verrouillé : sans conséquence (dossier temporaire).
  }
}

console.log('');
console.log(`Distribution statique : ${nbOk} réussies, ${nbEchecs} en échec.`);
if (nbEchecs > 0) process.exit(1);
console.log('Distribution allowlistée : l’application est servie, rien d’autre.');
