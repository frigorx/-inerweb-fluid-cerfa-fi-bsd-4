// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — PREUVE de la CHAÎNE RÉELLE transport-http.js → HTTP → serveur
// Exécution : node server/test-transport-http.mjs
//
// Constat (docs/AUDIT-QUALITE-2026-07.md, lot 1) : v8/js/data/transport-http.js
// (le VRAI transport `fetch` du navigateur) n'apparaissait dans AUCUNE suite —
// seul harnais-contrat.mjs existait, et lui SIMULE le transport en process
// (jamais un vrai socket HTTP). Cette suite comble le trou : elle importe
// transport-http.js TEL QUEL (aucune modification, aucune doublure), lance un
// VRAI serveur (server/serveur.js en process enfant, base jetable via
// IWF_CHEMIN_BASE — cf. server/db.js — sur un port aléatoire haut), et fait
// dialoguer les deux par un vrai fetch() Node.
//
// Authentification : depuis le LOT A (audit-proof), une lecture anonyme est
// REFUSÉE même en loopback. Cette suite prouve donc que le refus (403
// « Session requise… ») remonte fidèlement à travers le VRAI transport fetch →
// HTTP → serveur, mot pour mot. Une lecture AUTHENTIFIÉE sur un vrai socket est
// couverte par test-routes-comptes.mjs (qui gère le cookie iwf_session) : le
// fetch de Node n'a pas de bocal à cookies partagé entre appels, la session ne
// peut donc pas transiter par le transport ici — c'est justement ce que le
// refus démontre. Le circuit connexion/cookie est éprouvé bout en bout là-bas.
//
// Limite documentée (point 4 de la mission) : l'en-tête `Host` n'est PAS
// falsifiable via `fetch()` — Node (comme un vrai navigateur) le recalcule
// TOUJOURS depuis l'URL de la requête, contrairement à `Origin` qui reste
// libre. Vérifié empiriquement (voir CHANGELOG / conversation de production
// de cette suite) : un `fetch(url, { headers: { Host: 'x' } })` envoie malgré
// tout le Host réel de `url`. La garde d'origine est donc prouvée ici pour
// `Origin` (un VRAI fetch, comme le ferait une page hostile ouverte dans le
// navigateur du poste) ; la garde `Host` (anti-DNS-rebinding) reste couverte
// par test-routes-comptes.mjs, qui pilote un socket HTTP brut (node:http)
// où l'en-tête Host EST falsifiable — c'est justement ce que l'attaque par
// rebinding imite, et ce que la garde doit intercepter.
//
// Familles :
//   1. Démarrage du vrai serveur (process enfant, port jetable, base jetable).
//   2. Lecture anonyme via transport-http.js : getFluides SANS session →
//      refus 403 « Session requise… » relevé mot pour mot (lot A audit-proof).
//   3. Méthode inconnue SANS session → 403 « Session requise… » (pas 501) :
//      la garde de session précède le dispatch, aucun oracle de méthode.
//   4. Garde d'origine : Origin étranger → refusé (403) ; Origin loopback
//      légitime sur une route d'amorçage (etatInitial) → 200.
//   5. Corps mal formé (champs à plat, sans l'enveloppe { params }) → erreur
//      propre, ET le serveur survit (ping suivant → 200).
//   6. CSP servie en en-tête HTTP sur le front (frame-ancestors 'none').
//
// Robustesse : le process serveur est tué dans un `finally` (jamais de
// processus orphelin même si une vérification lève), port aléatoire haut,
// délais bornés. Node ≥ 22 (node:sqlite embarqué par le serveur), sans DOM.
// ============================================================

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { creerTransportHttp } from '../v8/js/data/transport-http.js';

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
// Serveur jetable : le VRAI server/serveur.js en process enfant, base SQLite
// jetable sous os.tmpdir() (IWF_CHEMIN_BASE — jamais data/ réel), port
// aléatoire haut (jamais 2011, jamais de collision probable entre lancements
// concurrents).
// ------------------------------------------------------------
const DOSSIER = mkdtempSync(join(tmpdir(), 'inerweb-fluide-transport-http-'));
const CHEMIN_BASE = join(DOSSIER, 'data', 'inerweb-fluide.db');
const PORT = 33000 + Math.floor(Math.random() * 9000);
const BASE_API = `http://127.0.0.1:${PORT}/api`;

const CHEMIN_SERVEUR = join(import.meta.dirname, 'serveur.js');

let enfant = null;

/** Attend que /api/ping réponde (le serveur a fini sa séquence de démarrage). */
async function attendreDemarrage(dureeMaxMs = 10000) {
  const debut = Date.now();
  while (Date.now() - debut < dureeMaxMs) {
    try {
      const reponse = await fetch(`http://127.0.0.1:${PORT}/api/ping`);
      if (reponse.status === 200) return true;
    } catch {
      // pas encore prêt (ECONNREFUSED pendant la préparation du coffre-fort)
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

try {
  enfant = spawn(process.execPath, [CHEMIN_SERVEUR], {
    env: { ...process.env, PORT: String(PORT), IWF_CHEMIN_BASE: CHEMIN_BASE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let sortieServeur = '';
  enfant.stdout.on('data', (d) => { sortieServeur += d.toString(); });
  enfant.stderr.on('data', (d) => { sortieServeur += d.toString(); });

  // ============================================================
  // 1. Le vrai serveur démarre et répond
  // ============================================================
  const pret = await attendreDemarrage();
  verifier('le vrai serveur (process enfant) démarre et répond à /api/ping',
    pret, sortieServeur);

  if (pret) {
    const transport = creerTransportHttp(BASE_API);

    // ============================================================
    // 2. Lecture anonyme via transport-http.js (le VRAI transport, importé
    //    tel quel) : depuis le lot A, getFluides SANS session est REFUSÉ même
    //    en loopback. On prouve que le refus (403 « Session requise… ») remonte
    //    à travers le vrai transport fetch → HTTP → serveur, mot pour mot.
    //    (En Node il n'y a pas de `document` : le transport ne peut pas émettre
    //    l'évènement de redirection, il relève directement le message serveur.)
    // ============================================================
    {
      let leve = null;
      try {
        await transport('getFluides', {});
      } catch (erreur) {
        leve = erreur;
      }
      verifier('lecture anonyme (getFluides) refusée à travers le vrai transport [lot A]',
        leve instanceof Error, String(leve));
      verifier('le message de refus est CELUI DU SERVEUR, mot pour mot',
        leve?.message === 'Session requise (connexion nécessaire).',
        leve?.message);
    }

    // ============================================================
    // 3. Méthode INCONNUE sans session → 403 « Session requise… », PAS 501.
    //    Depuis le lot A, une méthode non listée dans ROLES_MUTATION est
    //    traitée comme une lecture : la garde de session la refuse AVANT le
    //    dispatch d'api.appeler. Un appelant anonyme n'obtient donc jamais le
    //    message « méthode non implémentée » — aucun oracle d'existence de
    //    méthode ne fuit. (La garde de session PRÉCÈDE le dispatch.)
    // ============================================================
    {
      let leve = null;
      try {
        await transport('methodeTotalementInconnue', {});
      } catch (erreur) {
        leve = erreur;
      }
      verifier('méthode inconnue → transport-http.js lève une Error',
        leve instanceof Error, String(leve));
      verifier('le message est « Session requise… » (garde AVANT dispatch, pas d\'oracle)',
        leve?.message === 'Session requise (connexion nécessaire).',
        leve?.message);
    }

    // ============================================================
    // 4. Garde d'origine au VRAI HTTP : un fetch brut avec un Origin
    //    étranger est refusé (403), comme le ferait une page hostile ouverte
    //    dans le navigateur du poste face au serveur loopback.
    // ============================================================
    {
      const reponseOrigineEtrangere = await fetch(`${BASE_API}/getFluides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://pirate.exemple',
        },
        body: JSON.stringify({ params: {} }),
      });
      const corps = await reponseOrigineEtrangere.json();
      verifier('Origin étranger → 403 (garde anti-CSRF/rebinding)',
        reponseOrigineEtrangere.status === 403, JSON.stringify(corps));
      verifier('le message nomme le refus d\'origine',
        corps?.erreur === 'Origine non autorisée (requête inter-site refusée).',
        corps?.erreur);

      // Origin LOOPBACK légitime (celui que poserait le front lui-même,
      // servi par ce même serveur) : doit passer la garde d'origine. On le
      // prouve sur une route d'AMORÇAGE (etatInitial), atteignable sans
      // session — une lecture métier serait, elle, refusée par la garde de
      // session (lot A), ce qui masquerait le verdict de la garde d'origine.
      const reponseOrigineLegitime = await fetch(`${BASE_API}/etatInitial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: `http://127.0.0.1:${PORT}`,
        },
        body: JSON.stringify({ params: {} }),
      });
      verifier('Origin loopback légitime → 200 (la garde d\'origine ne bloque pas tout)',
        reponseOrigineLegitime.status === 200);

      // Host étranger : NON falsifiable via fetch() (Node, comme un vrai
      // navigateur, recalcule TOUJOURS le Host depuis l'URL de la requête —
      // vérifié empiriquement en amont de cette suite). Documenté dans
      // l'en-tête ci-dessus ; couvert par test-routes-comptes.mjs via
      // node:http (socket brut, Host falsifiable — ce que l'attaque imite).
    }

    // ============================================================
    // 5. Corps mal formé (champs à plat, SANS l'enveloppe { params }) →
    //    erreur propre, et le serveur SURVIT (l'appel suivant fonctionne).
    // ============================================================
    {
      const reponseMalFormee = await fetch(`${BASE_API}/connexion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Pas d'enveloppe { params } : les champs sont à plat. Le serveur lit
        // enveloppe.params ?? {} → {} → login/motDePasse vides côté handler.
        body: JSON.stringify({ login: 'peu-importe', motDePasse: 'peu-importe' }),
      });
      const corpsMalForme = await reponseMalFormee.json();
      verifier('corps à plat (sans enveloppe {params}) → erreur propre (400)',
        reponseMalFormee.status === 400, JSON.stringify(corpsMalForme));
      verifier('le message reste le message métier normal (pas un crash)',
        typeof corpsMalForme?.erreur === 'string' && corpsMalForme.erreur.length > 0,
        JSON.stringify(corpsMalForme));

      // Le serveur survit : l'appel suivant fonctionne toujours. On le prouve
      // via /api/ping (atteignable sans session — une lecture métier serait
      // refusée par la garde du lot A, ce qui ne dirait rien sur la survie).
      const reponsePing = await fetch(`http://127.0.0.1:${PORT}/api/ping`);
      const corpsPing = await reponsePing.json();
      verifier('le serveur SURVIT au corps mal formé (ping suivant → 200)',
        reponsePing.status === 200 && corpsPing?.ok === true,
        JSON.stringify(corpsPing));
    }

    // ============================================================
    // 6. CSP servie en EN-TÊTE HTTP sur le front (lot A audit-proof) : le
    //    document HTML porte Content-Security-Policy, avec frame-ancestors
    //    'none' (que la balise <meta> ne peut pas exprimer) — plus l'en-tête
    //    anti-clickjacking hérité.
    // ============================================================
    {
      const reponseHtml = await fetch(`http://127.0.0.1:${PORT}/v8/index.html`);
      await reponseHtml.arrayBuffer(); // vide le corps (pas d'orphelin de socket)
      const csp = reponseHtml.headers.get('content-security-policy');
      verifier('le front est servi (200) avec un en-tête Content-Security-Policy',
        reponseHtml.status === 200 && typeof csp === 'string' && csp.length > 0, csp);
      verifier('la CSP en-tête pose frame-ancestors \'none\' (anti-clickjacking fort)',
        !!csp && csp.includes("frame-ancestors 'none'"), csp);
      verifier('la CSP en-tête garde default-src \'self\' et object-src \'none\'',
        !!csp && csp.includes("default-src 'self'") && csp.includes("object-src 'none'"),
        csp);
      verifier('X-Frame-Options: SAMEORIGIN conservé (repli anciens navigateurs)',
        reponseHtml.headers.get('x-frame-options') === 'SAMEORIGIN');
    }
  }
} finally {
  // Le process serveur est tué ICI, quoi qu'il arrive (même si une
  // vérification ci-dessus a levé) : jamais de processus orphelin.
  if (enfant) {
    enfant.kill();
    // Laisse le temps au process de libérer le fichier .db (WAL/SHM) avant
    // le nettoyage du dossier — et évite une purge du handle encore « en
    // vol » côté libuv (observé sous Windows sans ce délai).
    await new Promise((r) => setTimeout(r, 300));
  }
  try {
    rmSync(DOSSIER, { recursive: true, force: true });
  } catch {
    // Best-effort : sous Windows, WAL/SHM peuvent rester verrouillés un
    // court instant après l'arrêt du process — ne fait pas échouer la suite.
  }
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Transport HTTP réel (transport-http.js → HTTP → serveur) : tout est vert.');
process.exit(0);
