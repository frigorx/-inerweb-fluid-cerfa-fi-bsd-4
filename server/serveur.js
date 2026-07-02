'use strict';

/**
 * inerWeb Fluide v8 — serveur local (Mode Local Lycée, Phase E)
 * =============================================================
 * Serveur Node.js pur (module http natif), ZÉRO dépendance externe.
 * - Écoute sur 127.0.0.1 uniquement (jamais exposé au réseau).
 * - Sert les fichiers statiques du front depuis la racine du dépôt.
 * - Expose l'espace /api/* (JSON) — pour l'instant seul /api/ping répond.
 *
 * Référence : docs/SPEC-V8.md (§2.2 Mode Local Lycée, §3 Architecture, §8 Sécurité).
 *
 * TODO Phase E : brancher la base SQLite via require('./db.js')
 * (module node:sqlite, Node ≥ 22) — fichier créé séparément, ne pas
 * l'importer tant que le contrat n'est pas stabilisé.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// ----- Configuration -----
const PORT = Number(process.env.PORT) || 2011; // port par défaut du Mode Local
const HOTE = '127.0.0.1';                      // localhost uniquement (sécurité)
const VERSION = '8.0.0-dev';

// Racine des fichiers statiques = racine du dépôt (dossier parent de server/)
const RACINE = path.resolve(__dirname, '..');

// Dossiers et fichiers JAMAIS servis par HTTP (données réelles, secrets, code serveur)
const CHEMINS_INTERDITS = ['data', 'documents', 'backups', 'server', '.git', '.env'];

// Types de contenu par extension (UTF-8 pour tout ce qui est textuel)
const TYPES_CONTENU = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

// ----- Aides -----

/** Envoie une réponse JSON avec les en-têtes adaptés (jamais mise en cache). */
function repondreJson(reponse, code, objet) {
  const corps = JSON.stringify(objet);
  reponse.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(corps),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store', // les réponses d'API ne doivent jamais être mises en cache
  });
  reponse.end(corps);
}

/** Envoie une page d'erreur simple (pour les fichiers statiques introuvables). */
function repondreErreur(reponse, code, message) {
  reponse.writeHead(code, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  reponse.end(`${code} — ${message}\n`);
}

// ----- Routes de l'API (/api/*) -----

function traiterApi(requete, reponse, chemin) {
  // Vérification de vie du serveur : utilisée par le front pour détecter le Mode Local
  if (chemin === '/api/ping') {
    repondreJson(reponse, 200, { ok: true, version: VERSION, mode: 'local' });
    return;
  }

  // TODO Phase E : routes du registre (machines, bouteilles, mouvements, contrôles…)
  // branchées sur SQLite via ./db.js — voir docs/SPEC-V8.md §5 (modèle de données).
  repondreJson(reponse, 501, {
    ok: false,
    erreur: 'Route non encore implémentée (chantier Phase E).',
    chemin,
  });
}

// ----- Fichiers statiques (le front : index.html, css/, js/, img/…) -----

function traiterStatique(requete, reponse, chemin) {
  // La racine sert index.html (application monopage)
  if (chemin === '/') {
    chemin = '/index.html';
  }

  // Décodage des caractères encodés dans l'URL (%20, accents…)
  let cheminDecode;
  try {
    cheminDecode = decodeURIComponent(chemin);
  } catch {
    repondreErreur(reponse, 400, 'Requête mal formée.');
    return;
  }

  // Protection contre la traversée de chemin : on résout le chemin demandé
  // et on vérifie qu'il reste STRICTEMENT à l'intérieur de la racine du dépôt.
  const cheminFichier = path.resolve(RACINE, '.' + path.posix.normalize(cheminDecode));
  if (cheminFichier !== RACINE && !cheminFichier.startsWith(RACINE + path.sep)) {
    repondreErreur(reponse, 403, 'Accès refusé.');
    return;
  }

  // Refuser l'accès aux dossiers sensibles (données réelles, secrets, code serveur)
  const cheminRelatif = path.relative(RACINE, cheminFichier);
  const premierSegment = cheminRelatif.split(path.sep)[0].toLowerCase();
  if (CHEMINS_INTERDITS.some((interdit) => premierSegment === interdit || premierSegment.startsWith('.env'))) {
    repondreErreur(reponse, 403, 'Accès refusé.');
    return;
  }

  // Lecture et envoi du fichier
  fs.stat(cheminFichier, (erreur, infos) => {
    if (erreur || !infos.isFile()) {
      repondreErreur(reponse, 404, 'Fichier introuvable.');
      return;
    }

    const extension = path.extname(cheminFichier).toLowerCase();
    const typeContenu = TYPES_CONTENU[extension] || 'application/octet-stream';

    reponse.writeHead(200, {
      'Content-Type': typeContenu,
      'Content-Length': infos.size,
      'X-Content-Type-Options': 'nosniff',
    });

    const flux = fs.createReadStream(cheminFichier);
    flux.on('error', () => {
      // Le fichier a pu disparaître entre stat() et la lecture
      reponse.destroy();
    });
    flux.pipe(reponse);
  });
}

// ----- Serveur HTTP -----

const serveur = http.createServer((requete, reponse) => {
  // On ne garde que le chemin (sans la chaîne de requête ?a=b)
  const url = new URL(requete.url, `http://${requete.headers.host || 'localhost'}`);
  const chemin = url.pathname;

  // Seules les lectures sont autorisées pour l'instant (squelette Phase E)
  if (chemin.startsWith('/api/')) {
    traiterApi(requete, reponse, chemin);
    return;
  }

  if (requete.method !== 'GET' && requete.method !== 'HEAD') {
    repondreErreur(reponse, 405, 'Méthode non autorisée.');
    return;
  }

  traiterStatique(requete, reponse, chemin);
});

serveur.listen(PORT, HOTE, () => {
  console.log('');
  console.log('  inerWeb Fluide v8 — serveur local démarré');
  console.log(`  Application : http://localhost:${PORT}`);
  console.log(`  Mode        : local (écoute limitée à ${HOTE})`);
  console.log('');
  console.log('  Fermez cette fenêtre pour arrêter inerWeb Fluide.');
});

serveur.on('error', (erreur) => {
  if (erreur.code === 'EADDRINUSE') {
    console.error(`\n  [ERREUR] Le port ${PORT} est déjà utilisé.`);
    console.error('  inerWeb Fluide est peut-être déjà lancé dans une autre fenêtre.');
    console.error('  Fermez l\'autre fenêtre puis relancez, ou changez PORT dans le fichier .env.\n');
  } else {
    console.error('\n  [ERREUR] Impossible de démarrer le serveur :', erreur.message, '\n');
  }
  process.exit(1);
});
