// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
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
// Authentification : NON nécessaire ici. Toutes les preuves demandées portent
// sur des routes de LECTURE (getFluides) ou sur les gardes réseau/format, qui
// s'exercent AVANT toute notion de session — et le contexte de connexion
// loopback (contexteDeLaConnexion, serveur.js) laisse les lectures ouvertes
// sans compte (confort mono-poste). Le circuit connexion/cookie est déjà
// éprouvé bout en bout par test-routes-comptes.mjs ; pas de doublon ici.
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
//   2. Lecture réelle via transport-http.js : getFluides → tableau non vide,
//      R-32 présent (seedé par schema.sql sur base vierge).
//   3. Erreur API → Error avec le message français du serveur (mot pour mot).
//   4. Garde d'origine : Origin étranger → requête fetch brute refusée (403).
//   5. Corps mal formé (champs à plat, sans l'enveloppe { params }) → erreur
//      propre, ET le serveur survit (l'appel suivant fonctionne).
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
    // 2. Lecture réelle via transport-http.js (le VRAI transport, importé
    //    tel quel) : getFluides → tableau non vide, R-32 présent.
    // ============================================================
    {
      const fluides = await transport('getFluides', {});
      verifier('transport-http.js : getFluides renvoie un tableau non vide',
        Array.isArray(fluides) && fluides.length > 0,
        JSON.stringify(fluides)?.slice(0, 200));
      verifier('le résultat est bien DÉPLIÉ (pas d\'enveloppe {ok,resultat})',
        fluides.ok === undefined && fluides.resultat === undefined);
      verifier('R-32 est présent (seedé par schema.sql sur base vierge)',
        fluides.some((f) => f.code === 'R-32'));
    }

    // ============================================================
    // 3. Erreur API → Error avec le message français du serveur, mot pour
    //    mot (méthode inconnue : passe la garde réseau et la garde lecture
    //    LAN — loopback — puis échoue dans api.appeler avec code 501).
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
      verifier('le message est CELUI DU SERVEUR, mot pour mot',
        leve?.message === 'Méthode « methodeTotalementInconnue » non encore ' +
          'implémentée (chantier V9-E3).',
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
      // servi par ce même serveur) : doit passer — la garde cible bien
      // l'origine étrangère, pas la présence de l'en-tête en soi.
      const reponseOrigineLegitime = await fetch(`${BASE_API}/getFluides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: `http://127.0.0.1:${PORT}`,
        },
        body: JSON.stringify({ params: {} }),
      });
      verifier('Origin loopback légitime → 200 (la garde ne bloque pas tout)',
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

      // Le serveur survit : l'appel suivant (une vraie lecture, via le vrai
      // transport) fonctionne toujours.
      const fluidesApres = await transport('getFluides', {});
      verifier('le serveur SURVIT au corps mal formé (lecture suivante OK)',
        Array.isArray(fluidesApres) && fluidesApres.length > 0);
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
