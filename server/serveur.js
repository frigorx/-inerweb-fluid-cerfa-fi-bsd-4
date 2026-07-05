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
const api = require('./api.js');
const db = require('./db.js');
const sauvegarde = require('./sauvegarde.js');
const restauration = require('./restauration.js');
const routesSauvegarde = require('./routes-sauvegarde.js');

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

/** Lit le corps d'une requête (JSON), borné à 20 Mo (pièces jointes base64). */
function lireCorps(requete) {
  return new Promise((resoudre, rejeter) => {
    const morceaux = [];
    let taille = 0;
    const MAX = 20 * 1024 * 1024;
    requete.on('data', (morceau) => {
      taille += morceau.length;
      if (taille > MAX) {
        rejeter(new Error('Corps de requête trop volumineux.'));
        requete.destroy();
        return;
      }
      morceaux.push(morceau);
    });
    requete.on('end', () => resoudre(Buffer.concat(morceaux).toString('utf8')));
    requete.on('error', rejeter);
  });
}

/** Code HTTP à renvoyer selon le code métier porté par une erreur d'api. */
function codeHttpErreur(erreur) {
  if (erreur && erreur.code === 403) return 403;
  if (erreur && erreur.code === 409) return 409; // opération E4 déjà en cours
  if (erreur && erreur.code === 400) return 400; // violation métier explicite
  if (erreur && erreur.code === 501) return 500; // méthode inconnue = erreur serveur
  return 400; // violation métier (message français destiné à l'interface)
}

/**
 * Contexte d'appel déterminé CÔTÉ SERVEUR — jamais depuis le corps de la
 * requête (un client pourrait y forger { role: 'ADMIN' }).
 *
 * PROVISOIRE V9-E3, à remplacer par les sessions E5 (cookie opaque
 * HttpOnly, table sessions) : le serveur n'écoutant QUE sur 127.0.0.1,
 * une connexion loopback = le poste du référent → rôle REFERENT.
 * ⚠ Ne JAMAIS élargir ce raccourci à une écoute LAN (décision §16.6) :
 * l'écoute réseau exigera l'authentification E5 d'abord.
 */
function contexteDeLaConnexion(requete) {
  const adresse = requete.socket?.remoteAddress ?? '';
  const loopback = adresse === '127.0.0.1' || adresse === '::1'
    || adresse === '::ffff:127.0.0.1';
  return loopback
    ? { role: 'REFERENT', utilisateur: 'poste-local' }
    : {};
}

// Hôtes et origines loopback légitimes (le front est servi par CE serveur).
const HOTES_AUTORISES = new Set([
  `127.0.0.1:${PORT}`, `localhost:${PORT}`, `[::1]:${PORT}`
]);
const ORIGINES_AUTORISEES = new Set([...HOTES_AUTORISES]
  .map((h) => `http://${h}`));

/**
 * Garde anti-CSRF / anti-DNS-rebinding sur /api (revue sécurité E3).
 * Le rôle REFERENT est accordé à toute connexion loopback : sans ce garde,
 * une PAGE WEB HOSTILE ouverte dans le navigateur du poste pourrait, par une
 * requête cross-origin vers 127.0.0.1, déclencher n'importe quelle mutation
 * (jusqu'à importerJSON qui REMPLACE le registre). Deux barrières :
 *  - En-tête `Host` : doit désigner le loopback (un nom DNS qui résout vers
 *    127.0.0.1 — attaque par rebinding — porte un autre Host → rejeté).
 *  - En-tête `Origin` (envoyé par le navigateur sur toute requête
 *    cross-origin, y compris « simple ») : s'il est présent, il doit être
 *    une origine loopback de ce serveur. Une navigation directe n'a pas
 *    d'Origin (autorisée). Une page tierce porte SON origine → rejetée.
 * @returns {string|null} un message de refus, ou null si la requête est sûre.
 */
function refusReseau(requete) {
  const hote = requete.headers.host ?? '';
  if (!HOTES_AUTORISES.has(hote)) {
    return 'Hôte non autorisé (accès local uniquement).';
  }
  const origine = requete.headers.origin;
  if (origine !== undefined && !ORIGINES_AUTORISEES.has(origine)) {
    return 'Origine non autorisée (requête inter-site refusée).';
  }
  return null;
}

function traiterApi(requete, reponse, chemin) {
  // Barrière réseau AVANT tout traitement (ping compris) : CSRF / rebinding.
  const refus = refusReseau(requete);
  if (refus) {
    repondreJson(reponse, 403, { ok: false, erreur: refus, code: 403 });
    return;
  }

  // Vérification de vie du serveur : utilisée par le front pour détecter le Mode Local
  if (chemin === '/api/ping') {
    repondreJson(reponse, 200, { ok: true, version: VERSION, mode: 'local' });
    return;
  }

  // Toutes les routes du DataStore sont en POST /api/:methode.
  if (requete.method !== 'POST') {
    repondreErreur(reponse, 405, 'Méthode non autorisée.');
    return;
  }

  const methode = chemin.slice('/api/'.length);

  lireCorps(requete).then((brut) => {
    let enveloppe;
    try {
      enveloppe = brut ? JSON.parse(brut) : {};
    } catch {
      repondreJson(reponse, 400, {
        ok: false,
        erreur: 'Corps de requête JSON invalide.',
        code: 400,
      });
      return;
    }

    // Routes E4 (sauvegarde/restauration) : dédiées, HORS du contrat
    // DataStore, aiguillées AVANT api.appeler. Même contexte de connexion
    // (rôle REFERENT en loopback), garde ADMIN/REFERENT + anti-concurrence
    // dans routes-sauvegarde. Enveloppe standard identique.
    if (routesSauvegarde.gereMethode(methode)) {
      try {
        const resultat = routesSauvegarde.appeler(
          methode, enveloppe.params ?? {}, contexteDeLaConnexion(requete));
        repondreJson(reponse, 200, { ok: true, resultat });
      } catch (erreur) {
        const code = codeHttpErreur(erreur);
        repondreJson(reponse, code, {
          ok: false, erreur: erreur.message, code,
        });
      }
      return;
    }

    try {
      // Le contexte vient de la CONNEXION, jamais de l'enveloppe cliente.
      const resultat = api.appeler(
        methode, enveloppe.params ?? {}, contexteDeLaConnexion(requete));
      repondreJson(reponse, 200, { ok: true, resultat });
    } catch (erreur) {
      const code = codeHttpErreur(erreur);
      repondreJson(reponse, code, {
        ok: false,
        erreur: erreur.message,
        code,
      });
    }
  }).catch(() => {
    repondreJson(reponse, 500, {
      ok: false,
      erreur: 'Erreur interne du serveur local.',
      code: 500,
    });
  });
}

// ----- Fichiers statiques (le front : index.html, css/, js/, img/…) -----

function traiterStatique(requete, reponse, chemin) {
  // Un chemin de dossier sert son index.html : '/' → la v7 (racine),
  // '/v8/' → l'application v8 (le mode Local sert le front ET l'API).
  if (chemin.endsWith('/')) {
    chemin += 'index.html';
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

/**
 * Détecte un `data/` sous OneDrive / « Mon Drive » (segment de chemin OU
 * variable d'environnement) et AVERTIT fortement : la synchro cloud corrompt
 * le WAL d'une base vive (vision §4, piège Windows n°5). Le cloud = pour des
 * ZIP figés, jamais pour la base ouverte. N'empêche pas le démarrage
 * (l'utilisateur peut savoir ce qu'il fait), mais le signale sans ambiguïté.
 */
function avertirSiDataSousOneDrive() {
  const cheminData = path.resolve(RACINE, 'data');
  const segments = cheminData.toLowerCase().split(/[\\/]/);
  const motsCloud = ['onedrive', 'mon drive', 'my drive', 'google drive',
    'dropbox'];
  const trouve = segments.some((s) => motsCloud.includes(s))
    || (process.env.OneDrive
        && cheminData.toLowerCase().startsWith(
          String(process.env.OneDrive).toLowerCase()));
  if (trouve) {
    console.warn('');
    console.warn('  [AVERTISSEMENT] Le dossier des données semble se trouver');
    console.warn(`  sous un espace synchronisé (cloud) : ${cheminData}`);
    console.warn('  La synchronisation permanente peut CORROMPRE la base');
    console.warn('  ouverte (journal WAL). Déplacez data/ hors du cloud ;');
    console.warn('  réservez le cloud aux SAUVEGARDES (fichiers ZIP figés).');
    console.warn('');
  }
}

/**
 * Séquence de démarrage « coffre-fort » (E4), AVANT toute écoute et AVANT la
 * première ouverture de la base :
 *  1) REPRENDRE une restauration interrompue (data/inerweb-fluide.db absent
 *     + restauration-en-cours/ présent) — doit passer AVANT db.ouvrir, qui
 *     recréerait sinon un socle vierge par-dessus une restauration en cours ;
 *  2) OUVRIR la base (socle v1 sur base vierge, migrations sinon) ;
 *  3) PURGER les .partiel / tmp orphelins (sauvegarde interrompue = n'existe pas) ;
 *  4) AVERTIR si data/ est sous un espace cloud.
 * Toute erreur ici est fatale et explicite (mieux qu'un démarrage douteux).
 */
function preparerCoffreFort() {
  try {
    const reprise = restauration.reprendreRestaurationInterrompue();
    if (reprise.repris) {
      console.log(`  [reprise] Restauration interrompue reprise : ${reprise.action}.`);
    }
    db.ouvrir();
    const purge = sauvegarde.purgerPartiels();
    if (purge.partielsSupprimes > 0 || purge.tempsSupprimes > 0) {
      console.log(
        `  [purge] ${purge.partielsSupprimes} sauvegarde(s) partielle(s) et ` +
        `${purge.tempsSupprimes} fichier(s) temporaire(s) nettoyés.`);
    }
    avertirSiDataSousOneDrive();
  } catch (erreur) {
    console.error(
      '\n  [ERREUR] Préparation du coffre-fort impossible :',
      erreur.message, '\n');
    process.exit(1);
  }
}

preparerCoffreFort();

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
