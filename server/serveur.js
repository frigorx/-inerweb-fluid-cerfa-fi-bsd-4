// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
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
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

// Garde de version, AVANT tout require d'un module local : le Mode Local
// s'appuie sur node:sqlite, module intégré à Node ≥ 22. Sur un Node plus
// ancien, le require('./db.js') ci-dessous échouerait par une erreur
// cryptique (« No such built-in module: node:sqlite ») ; on l'anticipe par
// un message clair, en français, et un code de sortie non nul.
const MAJEUR_NODE = Number(process.versions.node.split('.')[0]);
if (Number.isNaN(MAJEUR_NODE) || MAJEUR_NODE < 22) {
  console.error('');
  console.error('  [ERREUR] inerWeb Fluide a besoin de Node.js version 22 ou plus récente.');
  console.error(`  Version détectée sur ce poste : ${process.versions.node}.`);
  console.error('  Utilisez le paquet portable (Node est inclus, rien à installer)');
  console.error('  ou installez Node.js LTS (gratuit) depuis https://nodejs.org/fr .');
  console.error('');
  process.exit(1);
}

const api = require('./api.js');
const db = require('./db.js');
const sauvegarde = require('./sauvegarde.js');
const restauration = require('./restauration.js');
const routesSauvegarde = require('./routes-sauvegarde.js');
const routesComptes = require('./routes-comptes.js');
const sessions = require('./sessions.js');

// ----- Configuration -----
const PORT = Number(process.env.PORT) || 2011; // port par défaut du Mode Local
const VERSION = '8.0.0-dev';

/**
 * Écoute LAN (V9-E5, vague 4 — vision §16.6/§10.6) : par défaut le serveur
 * n'écoute QUE le loopback, comme depuis l'origine. Activer l'écoute sur
 * l'IP LAN du poste (nécessaire pour qu'une tablette du lycée l'atteigne)
 * exige une CONFIGURATION EXPLICITE — jamais un comportement par défaut :
 *   IWF_LAN=1 IWF_HOTE_LAN=192.168.1.42 IWF_TLS_CERT=cert.pem
 *   IWF_TLS_KEY=cle.pem node server/serveur.js
 * Sans IWF_LAN=1, IWF_HOTE_LAN est ignorée : on retombe sur 127.0.0.1 quoi
 * qu'il arrive. C'est le prix de la décision « LAN lycée = zone semi-fiable,
 * l'auth par compte reste la barrière » : ouvrir l'écoute SANS étendre du
 * même geste les hôtes/origines autorisés (ci-dessous) laisserait passer un
 * scan tablette en 403 systématique — ou pire, une écoute large sans jamais
 * vérifier Host/Origin. Les deux vont nécessairement ensemble.
 */
const LAN_ACTIF = process.env.IWF_LAN === '1';
const HOTE_LAN = process.env.IWF_HOTE_LAN || null;
const HOTE = (LAN_ACTIF && HOTE_LAN) ? HOTE_LAN : '127.0.0.1';

// Une exposition au LAN transporte des identités, des signatures et des
// justificatifs réglementaires : HTTP en clair est donc interdit. Le mode
// loopback reste en HTTP (trafic confiné au poste), mais IWF_LAN=1 exige un
// certificat et sa clé privée. Il n'existe aucun repli silencieux vers HTTP.
let OPTIONS_TLS = null;
if (LAN_ACTIF) {
  const cheminCertificat = process.env.IWF_TLS_CERT;
  const cheminClePrivee = process.env.IWF_TLS_KEY;
  if (!HOTE_LAN || !cheminCertificat || !cheminClePrivee) {
    console.error('');
    console.error('  [ERREUR] Le mode LAN exige HTTPS. Renseignez :');
    console.error('  IWF_HOTE_LAN, IWF_TLS_CERT et IWF_TLS_KEY.');
    console.error('  Aucun serveur HTTP en clair ne sera ouvert sur le réseau.');
    console.error('');
    process.exit(1);
  }
  try {
    OPTIONS_TLS = {
      cert: fs.readFileSync(path.resolve(cheminCertificat)),
      key: fs.readFileSync(path.resolve(cheminClePrivee)),
      minVersion: 'TLSv1.2',
    };
  } catch (erreur) {
    console.error('');
    console.error('  [ERREUR] Certificat HTTPS du mode LAN illisible :', erreur.message);
    console.error('');
    process.exit(1);
  }
}

// Racine des fichiers statiques = racine du dépôt (dossier parent de server/)
const RACINE = path.resolve(__dirname, '..');

// ------------------------------------------------------------
// P2-4 — DISTRIBUTION ALLOWLISTÉE (23/07). La règle était une liste
// NOIRE (data, documents, backups, server, .git, .env) : tout le reste
// du dépôt était servi, donc `.env.example`, `apps-script/`,
// `Code_API_v7.1.0.gs`, `CHANGELOG.md`, `docs/` — y compris les rapports
// d'audit qui ÉNUMÈRENT les faiblesses connues. Une liste noire est
// fausse par construction : elle oublie tout ce qu'on ajoute ensuite.
//
// Désormais : seul ce qui est NOMMÉ ici est servi. Un fichier ajouté au
// dépôt demain n'est pas exposé par accident. Tout le reste répond 404
// (et non 403 : on ne confirme pas l'existence d'un fichier privé).
//
// Le contenu vient des références RÉELLES des pages : v8/ porte
// l'application (css, js, polices), img/ les captures du guide et les
// icônes du manifeste, plus trois fichiers de racine.
// ------------------------------------------------------------
const DOSSIERS_SERVIS = ['v8', 'img'];
const FICHIERS_RACINE_SERVIS = ['index.html', 'guide.html', 'manifest.json'];

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

/** Nom du cookie de session (règle V9-E5, non négociable). */
const COOKIE_SESSION = 'iwf_session';

/**
 * Extrait la valeur d'un cookie nommé depuis l'en-tête `Cookie` brut. Analyse
 * MINIMALE (paires « nom=valeur » séparées par « ; ») : suffisant, ce serveur
 * ne pose jamais qu'un seul cookie. Ne décode pas (le jeton est déjà en
 * base64url, sans caractère à encoder).
 * @param {string|undefined} enteteCookie
 * @param {string} nom
 * @returns {string|null}
 */
function extraireCookie(enteteCookie, nom) {
  if (!enteteCookie) return null;
  for (const paire of enteteCookie.split(';')) {
    const indexEgal = paire.indexOf('=');
    if (indexEgal === -1) continue;
    const cle = paire.slice(0, indexEgal).trim();
    if (cle === nom) {
      return paire.slice(indexEgal + 1).trim();
    }
  }
  return null;
}

/**
 * Vrai si la connexion provient du loopback (127.0.0.1 / ::1) — le poste où
 * tourne le serveur lui-même.
 */
function estLoopback(requete) {
  const adresse = requete.socket?.remoteAddress ?? '';
  return adresse === '127.0.0.1' || adresse === '::1'
    || adresse === '::ffff:127.0.0.1';
}

/**
 * Contexte d'appel déterminé CÔTÉ SERVEUR — jamais depuis le corps de la
 * requête (un client pourrait y forger { role: 'ADMIN' }).
 *
 * V9-E5 : REMPLACE le raccourci provisoire « loopback = REFERENT ». Le rôle
 * vient DÉSORMAIS EXCLUSIVEMENT d'une session valide (cookie iwf_session
 * vérifié par sessions.verifierSession — jeton haché, comparé en temps
 * constant, expiration vérifiée à CHAQUE appel).
 *
 * Lectures vs mutations (décision non négociable, DURCIE au lot A audit-proof) :
 *   - Sans session (loopback OU LAN) : pas de rôle. TOUTE lecture (get*) est
 *     refusée par la garde de traiterApi (403 « Session requise… »), et les
 *     MUTATIONS tombent de toute façon en 403 via garderRole. Le loopback
 *     n'ouvre plus les lectures : l'accès anonyme mono-poste était le blocage
 *     n°1 de l'audit externe (15/07), il est levé. Le drapeau { loopback }
 *     reste posé, mais UNIQUEMENT pour les routes qui l'exigent encore par
 *     construction (bootstrapAdmin : 1er admin réservé au loopback strict).
 *   - Avec session valide : { role, utilisateur } — le rôle est CELUI FIGÉ
 *     à l'ouverture de session, jamais recalculé depuis le corps.
 */
function contexteDeLaConnexion(requete) {
  const jetonClair = extraireCookie(requete.headers.cookie, COOKIE_SESSION);
  const base = {
    loopback: estLoopback(requete),
    ip: requete.socket?.remoteAddress ?? null,
    // Jeton du cookie ENTRANT (brut, non vérifié) : utile à /api/deconnexion
    // pour révoquer la session même si elle est par ailleurs déjà expirée
    // (idempotence — cf. sessions.revoquerSession, no-op silencieux).
    jetonClair: jetonClair ?? null,
  };
  if (jetonClair) {
    const verdict = sessions.verifierSession(jetonClair);
    if (verdict) {
      return { ...base, role: verdict.role, utilisateur: verdict.utilisateur_id };
    }
  }
  // Aucune session valide : pas de rôle. Depuis le lot A, le loopback n'ouvre
  // PLUS les lectures (traiterApi exige une session pour tout get*) ; le
  // drapeau { loopback } ne sert plus qu'aux routes qui l'exigent encore par
  // construction (bootstrapAdmin en loopback strict).
  return base;
}

/**
 * Vrai si la requête est portée par TLS (HTTPS) — l'attribut `Secure` du
 * cookie n'est posé que dans ce cas (règle V9-E5 : « Secure seulement si
 * HTTPS » — ce serveur écoute en clair sur 127.0.0.1, un `Secure` posé à tort
 * empêcherait le navigateur de renvoyer le cookie).
 */
function estHttps(requete) {
  return Boolean(requete.socket?.encrypted);
}

/**
 * Fabrique l'en-tête Set-Cookie de connexion (règle V9-E5, attributs figés) :
 * nom iwf_session, HttpOnly, SameSite=Strict, Path=/, Max-Age=28800 (8 h,
 * cohérent avec sessions.DUREE_SESSION_MS), Secure seulement si HTTPS.
 * @param {string} jetonClair
 * @param {import('node:http').IncomingMessage} requete
 * @returns {string}
 */
function fabriquerCookieSession(jetonClair, requete) {
  const attributs = [
    `${COOKIE_SESSION}=${jetonClair}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=28800',
  ];
  if (estHttps(requete)) attributs.push('Secure');
  return attributs.join('; ');
}

/**
 * Fabrique l'en-tête Set-Cookie d'expiration immédiate (déconnexion) : mêmes
 * attributs que la pose (SameSite/Path/HttpOnly identiques, sinon certains
 * navigateurs ignorent la suppression), Max-Age=0.
 * @param {import('node:http').IncomingMessage} requete
 * @returns {string}
 */
function fabriquerCookieExpire(requete) {
  const attributs = [
    `${COOKIE_SESSION}=`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=0',
  ];
  if (estHttps(requete)) attributs.push('Secure');
  return attributs.join('; ');
}

// Hôtes et origines loopback légitimes (le front est servi par CE serveur).
const HOTES_AUTORISES = new Set([
  `127.0.0.1:${PORT}`, `localhost:${PORT}`, `[::1]:${PORT}`
]);
// LAN actif (IWF_LAN=1 + IWF_HOTE_LAN renseignée) : ÉTENDRE la liste des
// hôtes/origines autorisés à l'IP LAN du poste — sinon toute requête d'une
// tablette du réseau (Host = ip-lan:port) tomberait en 403 systématique par
// la garde anti-rebinding (refusReseau), alors même que le serveur écoute
// désormais sur cette interface. Sans cette extension, activer IWF_LAN
// ouvrirait l'écoute sans jamais laisser passer la moindre requête utile —
// un « LAN qui ne sert à rien » plutôt qu'un défaut dangereux, mais autant
// le faire correctement.
if (LAN_ACTIF && HOTE_LAN) {
  HOTES_AUTORISES.add(`${HOTE_LAN}:${PORT}`);
}
// Les origines loopback restent en http:// (le poste local n'est pas passé
// au TLS) ; l'origine LAN, elle, est NÉCESSAIREMENT https:// — un front servi
// en HTTPS n'émettra jamais d'Origin http, et l'accepter rouvrirait la porte
// à une page hostile servie en clair sur le réseau.
const ORIGINES_AUTORISEES = new Set([
  `http://127.0.0.1:${PORT}`,
  `http://localhost:${PORT}`,
  `http://[::1]:${PORT}`,
]);
if (LAN_ACTIF && HOTE_LAN) {
  ORIGINES_AUTORISEES.add(`https://${HOTE_LAN}:${PORT}`);
}

/**
 * Garde anti-CSRF / anti-DNS-rebinding sur /api (revue sécurité E3, CONSERVÉE
 * telle quelle par V9-E5 : l'authentification par session s'AJOUTE à cette
 * garde, elle ne la remplace pas). Sans elle, une PAGE WEB HOSTILE ouverte
 * dans le navigateur du poste pourrait, par une requête cross-origin vers
 * 127.0.0.1, rejouer le cookie de session du référent (déjà posé par le
 * navigateur) et déclencher n'importe quelle mutation en son nom (jusqu'à
 * importerJSON qui REMPLACE le registre). Deux barrières :
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

    const contexte = contexteDeLaConnexion(requete);

    // Routes d'authentification (V9-E5) : dédiées, HORS du contrat DataStore
    // ET hors routes-sauvegarde, aiguillées EN PREMIER (avant même la garde
    // de lecture LAN ci-dessous — se connecter ne peut pas exiger d'être
    // déjà connecté). connexion/deconnexion posent/lèvent le cookie
    // iwf_session ; creerCompte porte sa propre garde ADMIN.
    if (routesComptes.gereMethode(methode)) {
      try {
        const resultat = routesComptes.appeler(
          methode, enveloppe.params ?? {}, contexte);
        const entetes = { 'Content-Type': 'application/json; charset=utf-8' };
        // connexion ET bootstrapAdmin ouvrent une session (renvoient un
        // jetonClair) : dans les deux cas on pose le cookie iwf_session et on
        // ne renvoie au front que { role, utilisateur }, jamais le jeton.
        const poseSession = methode === 'connexion' || methode === 'bootstrapAdmin';
        if (poseSession) {
          entetes['Set-Cookie'] = fabriquerCookieSession(resultat.jetonClair, requete);
        } else if (methode === 'deconnexion') {
          entetes['Set-Cookie'] = fabriquerCookieExpire(requete);
        }
        const corps = JSON.stringify({
          ok: true,
          // Le jeton clair ne doit JAMAIS repartir dans le corps JSON (il
          // est déjà posé en cookie HttpOnly) : le front n'en a pas besoin.
          resultat: poseSession
            ? { role: resultat.role, utilisateur: resultat.utilisateur }
            : resultat,
        });
        entetes['Content-Length'] = Buffer.byteLength(corps);
        entetes['X-Content-Type-Options'] = 'nosniff';
        entetes['Cache-Control'] = 'no-store';
        reponse.writeHead(200, entetes);
        reponse.end(corps);
      } catch (erreur) {
        const code = codeHttpErreur(erreur);
        repondreJson(reponse, code, {
          ok: false, erreur: erreur.message, code,
        });
      }
      return;
    }

    // Routes E4 (sauvegarde/restauration) : dédiées, HORS du contrat
    // DataStore, aiguillées AVANT api.appeler. Même contexte de connexion
    // (session), garde ADMIN/REFERENT + anti-concurrence dans
    // routes-sauvegarde. Enveloppe standard identique.
    if (routesSauvegarde.gereMethode(methode)) {
      try {
        const resultat = routesSauvegarde.appeler(
          methode, enveloppe.params ?? {}, contexte);
        repondreJson(reponse, 200, { ok: true, resultat });
      } catch (erreur) {
        const code = codeHttpErreur(erreur);
        repondreJson(reponse, code, {
          ok: false, erreur: erreur.message, code,
        });
      }
      return;
    }

    // Garde lecture (V9-E5 + lot A audit-proof) : TOUTE lecture (get*) exige
    // une session valide, loopback COMPRIS. Un registre réglementaire doit
    // pouvoir dire QUI a consulté quoi ; l'accès anonyme en loopback (l'ancien
    // « confort mono-poste ») était le blocage n°1 de l'audit externe du
    // 15/07 — il est levé ici. Les seules routes atteignables sans session
    // sont, PAR CONSTRUCTION, aiguillées AVANT ce point : /api/ping (vie du
    // serveur) et les routes d'amorçage/connexion de routes-comptes
    // (etatInitial, bootstrapAdmin, connexion). Les mutations restent en outre
    // bloquées par garderRole (aucun rôle n'est habilité sans session).
    const estMutation = Object.prototype.hasOwnProperty.call(
      api.ROLES_MUTATION, methode);
    if (!estMutation && !contexte.role) {
      repondreJson(reponse, 403, {
        ok: false,
        erreur: 'Session requise (connexion nécessaire).',
        code: 403,
      });
      return;
    }

    try {
      // Le contexte vient de la CONNEXION, jamais de l'enveloppe cliente.
      const resultat = api.appeler(methode, enveloppe.params ?? {}, contexte);
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

// Content-Security-Policy servie en EN-TÊTE HTTP (lot A audit-proof). La
// balise <meta> de v8/index.html reste en place — indispensable au Mode Démo
// (GitHub Pages, aucun serveur pour poser un en-tête) — mais l'en-tête HTTP la
// DOUBLE côté registre local : il est plus robuste (appliqué avant le moindre
// octet de HTML, non contournable par une injection avant la balise) et sait
// exprimer `frame-ancestors 'none'`, que <meta> ne peut pas (l'anti-clickjacking
// ne repose donc plus sur le seul X-Frame-Options). Politique IDENTIQUE à la
// meta pour le reste — les deux doivent rester alignées (leur intersection est
// ce que le navigateur applique).
const CSP_ENTETE = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

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

  // P2-4 : seul ce qui est explicitement servi l'est. Un chemin hors de
  // la liste blanche répond 404 — on ne confirme pas l'existence d'un
  // fichier privé (data/, server/, docs/, .env.example, apps-script/…).
  const cheminRelatif = path.relative(RACINE, cheminFichier);
  const segments = cheminRelatif.split(path.sep);
  const autorise = segments.length === 1
    ? FICHIERS_RACINE_SERVIS.includes(segments[0])
    : DOSSIERS_SERVIS.includes(segments[0]);
  if (!autorise) {
    repondreErreur(reponse, 404, 'Fichier introuvable.');
    return;
  }

  // ⭐ L2 (25/07) — EXTENSIONS QUI NE SORTENT JAMAIS PAR LE WEB.
  // La liste blanche raisonne sur l'ARBORESCENCE ; celle-ci raisonne sur la
  // NATURE du fichier. Attaques tirées : une base vive placée sous
  // `v8/data/` (ou un dossier de sauvegarde pointé sous `v8/`) devenait
  // téléchargeable par un simple GET, sans la moindre session — tout le
  // registre, données nominatives comprises. Aucun fichier de ce type n'a
  // de raison d'être servi à un navigateur, où qu'il soit rangé.
  const EXTENSIONS_JAMAIS_SERVIES = ['.db', '.db-wal', '.db-shm', '.sqlite',
    '.sqlite3', '.zip', '.env', '.key', '.pem', '.pfx', '.bak'];
  const nomFichier = path.basename(cheminFichier).toLowerCase();
  // ⚠️ Revue L2 — UN NOM QUI COMMENCE PAR UN POINT N'A PAS D'EXTENSION.
  // `path.extname('.env')` rend une chaîne VIDE : la liste ci-dessus ne
  // voyait donc pas passer `.env`, et le fichier sortait en 200. Trouvé en
  // corrigeant le test lui-même (il demandait un fichier qui n'existait pas,
  // donc son 404 ne prouvait rien). Les fichiers cachés ne se servent pas :
  // ce sont, par convention, des fichiers de configuration.
  if (nomFichier.startsWith('.')
      || EXTENSIONS_JAMAIS_SERVIES.includes(
        path.extname(cheminFichier).toLowerCase())) {
    repondreErreur(reponse, 404, 'Fichier introuvable.');
    return;
  }

  // Lecture et envoi du fichier
  fs.stat(cheminFichier, (erreur, infos) => {
    if (erreur || !infos.isFile()) {
      repondreErreur(reponse, 404, 'Fichier introuvable.');
      return;
    }

    // ⭐ L2 (25/07) — LE CHEMIN RÉEL, PAS SEULEMENT LE CHEMIN DEMANDÉ.
    // La liste blanche ci-dessus juge le chemin LOGIQUE. Attaque tirée :
    // une jonction Windows (`mklink /J`, qui ne demande AUCUN privilège)
    // posée dans `v8/` et pointant vers `server/` faisait servir le code
    // source complet en 200, sans session. Un lien symbolique fait pareil
    // sous Linux. On résout donc le chemin PHYSIQUE et on lui réapplique
    // la même règle : ce qui sort doit être, RÉELLEMENT, dans un dossier
    // servi.
    fs.realpath(cheminFichier, (erreurLien, cheminReel) => {
      if (erreurLien) {
        repondreErreur(reponse, 404, 'Fichier introuvable.');
        return;
      }
      const relatifReel = path.relative(RACINE, cheminReel);
      const segmentsReels = relatifReel.split(path.sep);
      const reelAutorise = !relatifReel.startsWith('..')
        && !path.isAbsolute(relatifReel)
        && (segmentsReels.length === 1
          ? FICHIERS_RACINE_SERVIS.includes(segmentsReels[0])
          : DOSSIERS_SERVIS.includes(segmentsReels[0]));
      if (!reelAutorise) {
        repondreErreur(reponse, 404, 'Fichier introuvable.');
        return;
      }
      envoyerFichier(reponse, cheminFichier, infos);
    });
  });
}

/** Envoie un fichier statique déjà autorisé (en-têtes de sécurité compris). */
function envoyerFichier(reponse, cheminFichier, infos) {
  {
    const extension = path.extname(cheminFichier).toLowerCase();
    const typeContenu = TYPES_CONTENU[extension] || 'application/octet-stream';

    reponse.writeHead(200, {
      'Content-Type': typeContenu,
      'Content-Length': infos.size,
      'X-Content-Type-Options': 'nosniff',
      // CSP servie en en-tête (lot A) : rempart principal, `frame-ancestors
      // 'none'` compris. Appliquée à TOUTES les réponses statiques (inoffensive
      // sur css/js/images, décisive sur les documents HTML).
      'Content-Security-Policy': CSP_ENTETE,
      // Anti-clickjacking hérité, conservé pour les très vieux navigateurs qui
      // ignorent `frame-ancestors` : la page ne peut être cadrée que par le
      // serveur lui-même (SAMEORIGIN), jamais par un site tiers.
      'X-Frame-Options': 'SAMEORIGIN',
    });

    const flux = fs.createReadStream(cheminFichier);
    flux.on('error', () => {
      // Le fichier a pu disparaître entre stat() et la lecture
      reponse.destroy();
    });
    flux.pipe(reponse);
  }
}

// ----- Serveur HTTP -----

/**
 * Entrée par défaut du serveur local = la v9 (sous v8/), jamais l'ancienne
 * v7 restée à la racine du dépôt. Redirige '/' et '/index.html' vers '/v8/'
 * par une VRAIE redirection HTTP 302 (Location: /v8/) — PAS une réécriture
 * interne servant v8/index.html sur '/' : les chemins relatifs de la v9
 * (« ./css/... », « ./js/... ») résoudraient alors vers la racine (donc les
 * fichiers v7) et casseraient l'application. Seule la redirection change
 * l'URL vue par le navigateur, donc la base de résolution des chemins
 * relatifs. Vaut aussi bien en loopback qu'en LAN (même chemin de code,
 * aucune dépendance à l'hôte). '/v8/' et '/v8/index.html' ne sont PAS
 * concernés : ils continuent d'être servis normalement (pas de boucle).
 */
function estEntreeRacine(chemin) {
  return chemin === '/' || chemin === '/index.html';
}

function rediriger(reponse, cible) {
  reponse.writeHead(302, {
    'Location': cible,
    'Content-Length': 0,
    'Cache-Control': 'no-store',
  });
  reponse.end();
}

const traiterRequete = (requete, reponse) => {
  if (LAN_ACTIF) {
    reponse.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  // On ne garde que le chemin (sans la chaîne de requête ?a=b)
  const protocole = LAN_ACTIF ? 'https' : 'http';
  const url = new URL(requete.url, `${protocole}://${requete.headers.host || 'localhost'}`);
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

  // Entrée par défaut → v9 (voir estEntreeRacine ci-dessus). Placé avant le
  // service de fichiers : '/' et '/index.html' ne doivent JAMAIS atteindre
  // traiterStatique (qui servirait sinon la v7 de la racine).
  if (estEntreeRacine(chemin)) {
    rediriger(reponse, '/v8/');
    return;
  }

  traiterStatique(requete, reponse, chemin);
};

const serveur = LAN_ACTIF
  ? https.createServer(OPTIONS_TLS, traiterRequete)
  : http.createServer(traiterRequete);

/**
 * P1-6 : depuis que db.verifierEmplacementBase REFUSE une base vive sous un
 * espace synchronisé, ce chemin ne s'atteint plus qu'en DÉROGATION
 * (IWF_AUTORISER_BASE_SYNCHRONISEE=1, migration contrôlée) — l'avertissement
 * reste, sans ambiguïté, pour que la dérogation ne s'installe pas en silence.
 */
function avertirSiDataSousOneDrive() {
  const cheminBase = db.cheminOuvert();
  if (db.cheminSousSynchronisation(cheminBase)) {
    console.warn('');
    console.warn('  [AVERTISSEMENT] Dérogation active : la base se trouve');
    console.warn(`  sous un espace synchronisé (cloud) : ${cheminBase}`);
    console.warn('  La synchronisation permanente peut CORROMPRE la base');
    console.warn('  ouverte (journal WAL). Déplacez la base hors du cloud ;');
    console.warn('  réservez le cloud aux SAUVEGARDES (fichiers ZIP figés).');
    console.warn('');
  }
}

/**
 * Lot 0 / B3 : un poste réglé AVANT la garde peut encore pointer ses
 * sauvegardes vers un espace synchronisé. On AVERTIT sans empêcher de
 * démarrer — une sauvegarde qui ne se fait plus serait pire que le défaut
 * qu'on corrige. Le prochain enregistrement du réglage, lui, sera refusé.
 */
function avertirSiDestinationSauvegardeSynchronisee() {
  const message = sauvegarde.avertissementDestinationSynchronisee();
  if (message) {
    console.warn('');
    console.warn('  [AVERTISSEMENT] ' + message);
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
 *  4) AVERTIR si data/ — ou le dossier de sauvegarde réglé — est sous un
 *     espace cloud.
 * Toute erreur ici est fatale et explicite (mieux qu'un démarrage douteux).
 */
function preparerCoffreFort() {
  try {
    // P1-6 : refus AVANT même la reprise de restauration — aucune opération
    // disque ne doit viser par inadvertance une base active sous
    // synchronisation (le message de l'erreur dit quoi faire).
    db.verifierEmplacementBase(db.CHEMIN_BASE_DEFAUT);
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
    // Purge best-effort des sessions obsolètes (expirées, ou révoquées ET
    // expirées) — évite l'accumulation indéfinie dans la table sessions.
    const sessionsSupprimees = sessions.purgerSessionsObsoletes();
    if (sessionsSupprimees > 0) {
      console.log(`  [purge] ${sessionsSupprimees} session(s) obsolète(s) nettoyée(s).`);
    }
    avertirSiDataSousOneDrive();
    avertirSiDestinationSauvegardeSynchronisee();
  } catch (erreur) {
    console.error(
      '\n  [ERREUR] Préparation du coffre-fort impossible :',
      erreur.message, '\n');
    process.exit(1);
  }
}

preparerCoffreFort();

// Sauvegarde AUTOMATIQUE au démarrage (condition 6 du plan audit-proof) :
// une ARCHIVE complète si la dernière date de plus du seuil réglé (24 h par
// défaut), VÉRIFIÉE aussitôt. Jamais fatal : le module rend un compte-rendu.
{
  const sauvegardeAuto = require('./sauvegarde-auto.js');
  const auto = sauvegardeAuto.archiveAuDemarrageSiDue();
  if (auto.faite && auto.verifiee) {
    console.log(`  [sauvegarde] Archive automatique créée et VÉRIFIÉE : ${auto.fichier}`);
  } else if (auto.faite) {
    console.warn(
      `  [sauvegarde] Archive automatique créée mais NON vérifiée (${auto.erreur}) — ` +
      'ouvrez l\'écran Sauvegarde pour contrôler.');
  } else if (auto.erreur) {
    console.warn(`  [sauvegarde] Sauvegarde automatique impossible : ${auto.erreur}`);
  } else {
    console.log(`  [sauvegarde] ${auto.raison}.`);
  }
}

// Scellement externe SIMPLE (lot D du plan audit-proof) : le témoin
// quotidien — têtes des chaînes, compteurs, intervalle de numéros — est
// écrit dans le dossier de sauvegarde (synchronisé = il quitte le poste).
// Jamais fatal : compte-rendu en console seulement.
{
  const scellement = require('./scellement-externe.js');
  const temoin = scellement.ecrireTemoinQuotidien();
  if (temoin.fait) {
    console.log(`  [scellement] Témoin quotidien écrit : ${temoin.fichier}`);
  } else {
    console.warn(`  [scellement] Témoin quotidien impossible : ${temoin.erreur}`);
  }
}

// Témoins des PDF conservés (lot C, brique C3b) : les frères .sha256 et
// .manifeste.json se RE-DÉRIVENT des colonnes scellées — une restauration
// d'archive (documents/ remplacé en bloc) ou un échec toléré
// (TEMOINS_PDF_ECHEC) les laisse manquants, le démarrage les réécrit.
// Un témoin présent n'est JAMAIS écrasé. Jamais fatal.
{
  try {
    const bilan = api.reecrireTemoinsPdfFinalManquants();
    if (bilan.reecrits > 0) {
      console.log(
        `  [pdf-final] Témoins réécrits : ${bilan.reecrits} PDF conservé(s) ` +
        `sur ${bilan.examines} examiné(s).`);
    }
  } catch (erreur) {
    console.warn(`  [pdf-final] Réécriture des témoins impossible : ${erreur.message}`);
  }
}

// Brique C5 : les PDF conservés sont VÉRIFIÉS au démarrage (pièce jointe,
// fichier disque, .sha256 frère — chacun contre l'empreinte SCELLÉE dans
// l'écriture chaînée). Toute anomalie est affichée ET journalisée au
// journal chaîné (PDF_FINAL_ANOMALIE) — jamais fatal, même patron que le
// scellement externe du lot D.
{
  try {
    const bilan = api.verifierTousPdfFinalConserves();
    for (const anomalie of bilan.anomalies) {
      const details = anomalie.motifs.join(' · ');
      console.error(`  [pdf-final] ANOMALIE ${anomalie.numero} : ${details}`);
      try {
        db.journaliser({
          qui: 'système',
          action: 'PDF_FINAL_ANOMALIE',
          cible: anomalie.numero,
          details
        });
      } catch {
        // Journal indisponible : la console a déjà parlé.
      }
    }
    if (bilan.examines > 0 && bilan.anomalies.length === 0) {
      console.log(
        `  [pdf-final] ${bilan.examines} PDF conservé(s) vérifié(s) : intacts.`);
    }
  } catch (erreur) {
    console.warn(
      `  [pdf-final] Vérification des PDF conservés impossible : ${erreur.message}`);
  }
}

// Lot E2 (coffre des identités) : rattrapage de la purge disque — un
// plantage entre COMMIT et purge ne laisse jamais un scan en clair
// orphelin. Best-effort absolu (ne lève jamais).
{
  const bilan = api.rejouerPurgeCoffre();
  if (bilan.purges > 0 || bilan.restants > 0) {
    console.log(
      `  [coffre] purge de rattrapage : ${bilan.purges} fichier(s) ` +
      `supprimé(s), ${bilan.restants} restant(s).`);
  }
}

serveur.listen(PORT, HOTE, () => {
  console.log('');
  console.log('  inerWeb Fluide v8 — serveur local démarré');
  console.log(`  Application : ${LAN_ACTIF ? `https://${HOTE}:${PORT}` : `http://localhost:${PORT}`}`);
  if (LAN_ACTIF && HOTE_LAN) {
    console.log(`  Mode        : LAN HTTPS (écoute sur ${HOTE}) — auth obligatoire`);
    console.log(`  Réseau      : https://${HOTE}:${PORT} (TLS obligatoire, accessible depuis le LAN du lycée)`);
  } else {
    console.log(`  Mode        : local (écoute limitée à ${HOTE})`);
  }
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
