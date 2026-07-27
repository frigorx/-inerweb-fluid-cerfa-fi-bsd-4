// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — PREUVE du mode LAN HTTPS obligatoire (P1-5, RC 8.1 reprise)
// Exécution : node server/test-lan-https.mjs
//
// Constat (audit externe #2, 20/07) : une écoute LAN transporte identités,
// signatures et justificatifs réglementaires — HTTP en clair y est interdit.
// Le serveur exige donc, dès IWF_LAN=1, un certificat + sa clé (IWF_TLS_CERT /
// IWF_TLS_KEY) et n'ouvre JAMAIS de repli HTTP silencieux sur le réseau.
// Le loopback (sans IWF_LAN) reste en HTTP : trafic confiné au poste, couvert
// par test-transport-http.mjs / test-routes-comptes.mjs — inchangé.
//
// Astuce d'isolation : l'« IP LAN » du test est 127.0.0.2 — une adresse de
// bouclage Windows/Linux DIFFÉRENTE de 127.0.0.1. On prouve ainsi les
// propriétés LAN (écoute dédiée, origine https:// exigée pour l'hôte LAN)
// sans jamais ouvrir de socket sur le vrai réseau ni réveiller le pare-feu.
//
// Familles :
//   1. IWF_LAN=1 SANS certificat → le serveur REFUSE de démarrer (exit 1,
//      message explicite, aucune écoute en clair ouverte).
//   2. IWF_LAN=1 + certificat/clé → HTTPS réel : /api/ping répond en TLS
//      (version ≥ 1.2 vérifiée sur le socket) + en-tête HSTS présent.
//   3. HTTP EN CLAIR sur le port LAN → aucune réponse HTTP (la poignée de
//      main TLS échoue, le socket est coupé) : pas de repli silencieux.
//   4. Garde d'origine en LAN : Origin https://<hôte LAN> → accepté ;
//      Origin http://<hôte LAN> (en clair) → 403 — un front servi en HTTPS
//      n'émet jamais d'Origin http, l'accepter rouvrirait la porte à une
//      page hostile servie en clair sur le réseau.
//
// Certificat : auto-signé CN=127.0.0.1, généré une fois pour CE test
// (validité 100 ans), embarqué en littéral. La clé privée ci-dessous ne
// protège RIEN : elle n'existe que pour ce banc d'essai. Le client de test
// utilise rejectUnauthorized:false (auto-signé, hôte 127.0.0.2 ≠ CN) — ce
// qui est éprouvé ici est le REFUS du clair, pas la chaîne de confiance.
//
//   5. HERMÉTICITÉ DU BANC lui-même : chaque requête émise l'a été par les
//      agents DÉDIÉS du test, et la réponse HTTPS vient bien du serveur que
//      le banc a monté — pas d'un intermédiaire.
//
// ------------------------------------------------------------
// POURQUOI la famille 5 existe (audit externe #4, 27/07) — le motif, écrit
// noir sur blanc : LE FAUX VERT EST PLUS DANGEREUX QUE LE FAUX ROUGE, et
// c'est LUI qu'on ferme ici.
//
// Le banc parle à une adresse de BOUCLAGE (127.0.0.2). Tant qu'il passait par
// l'agent HTTP global de Node, il était détournable : `NODE_USE_ENV_PROXY=1`
// équipe cet agent global d'un mandataire lu dans l'environnement, et le
// NO_PROXY d'un poste ne couvre en général que 127.0.0.1 — pas 127.0.0.2.
//   - Faux ROUGE (rencontré par l'auditeur) : avec un mandataire complet, la
//     requête en clair reçoit un 502 du mandataire et le HTTPS local ne
//     répond pas ; la suite échoue alors que le produit va bien. Gênant.
//   - Faux VERT (trouvé en le TIRANT) : avec HTTP_PROXY renseigné et
//     HTTPS_PROXY absent — la configuration banale d'un établissement qui ne
//     filtre que le trafic en clair —, la suite affiche 11 OK / 0 échec
//     alors que les DEUX vérifications qui portent TOUTE la propriété
//     « aucun repli HTTP en clair sur le port LAN » sont parties au
//     mandataire et n'ont JAMAIS interrogé le serveur. Un voyant vert qui
//     n'a rien tiré, sur la seule propriété de sécurité du mode LAN.
// La correction est dans le CODE DU TEST (agents dédiés), jamais dans un
// NO_PROXY élargi : un NO_PROXY dépend du poste de celui qui joue la suite,
// l'agent dédié ferme le trou partout. Et la famille 5 fait que retirer les
// agents dédiés rend la suite ROUGE, au lieu de rouvrir le trou en silence.
// ------------------------------------------------------------
//
// Robustesse : process serveur tué dans un `finally`, port aléatoire haut,
// base jetable via IWF_CHEMIN_BASE (jamais data/ réel), délais bornés.
// ============================================================

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import https from 'node:https';
import http from 'node:http';

// ------------------------------------------------------------
// Agents DÉDIÉS du banc (audit externe #4, 27/07).
//
// Toutes les requêtes du test visent une adresse de BOUCLAGE (127.0.0.2).
// L'agent GLOBAL de Node ne convient donc pas : `NODE_USE_ENV_PROXY=1` lui
// installe le mandataire lu dans l'environnement (HTTP_PROXY / HTTPS_PROXY),
// et le NO_PROXY d'un poste ne couvre en général que 127.0.0.1 — jamais
// 127.0.0.2. Une requête du banc peut alors partir chez un intermédiaire :
// au mieux la suite échoue à tort, au pire elle passe au VERT sans avoir
// interrogé le serveur (voir le motif en tête de fichier).
//
// Ces deux agents sont construits SANS aucune option : ils ne portent donc
// aucune configuration de mandataire, et la famille 5 le vérifie.
// ------------------------------------------------------------
const AGENT_HTTPS = new https.Agent();
const AGENT_HTTP = new http.Agent();

// Témoins d'hermeticité : l'agent RÉELLEMENT porté par chaque requête émise.
// On n'interroge pas les options qu'on croit avoir passées, on relit l'objet
// requête que Node a construit — c'est ce qui rend la famille 5 opposable.
const AGENTS_UTILISES = { https: [], clair: [] };

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
// Certificat de TEST (auto-signé, aucune valeur de sécurité).
// ------------------------------------------------------------
const CLE_TEST = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC9iQbqRNGy9AYX
EoQMcCkE8Icl5fafZxpPerT/smoZWka8BHp6+FHgPR396u/OjP6Bi1H6kq2pTBZC
Z0gOc9soGzVrbx7WXAusp8ZSpAwne9FEPqwC8Q3d4JuRIiYptmOBTxIIze1Otmcb
2oIYDG63pABvqkypOnbdfSgV1eLpK55eAe6y/lqZjLI6TVX4gIxTz6IX4SLkVBAL
/TqzPiY149JRbS9UJkUGHupKYJlVqKHt7V3/yh3/AqOwEuAu144dXuFUs9awUz37
SoGhN/GbVMbN90iUFQZWi//SQV2iEDqszSL6B9xnRySF13jMJlJxGvGcaOJBcvhm
3SLgDfDLAgMBAAECggEARzcD1qVaB3viB+xImmXQO89mcGp6IoW6YI+yD3tJm1IM
ztt969N+7Br6uGv8g+b9P86J1HUldD2nBXdKH0gP2f9zMHVVqGR4bHyzq1yBRpqi
1BoaRpatR6d7vGoQ3c5uj+kWVSGO32rwzgnppMCTH0Qrd8mMuW9Ct1Et7RprAoHg
ClAl/SERAO29CqwOOCiJXqtUFNlaHcLYpTLasIo/xwgrXmQHukokhmo46w6U4jGT
clXYuxbQmzo3ijs/bw2I0cXEn7ErjuonnLo5LiYSCmJxQ9V10ZqeG+uN05LUoOhg
2VR5UtkLxH0RrDT3OAy1vCEQPCjKV1uumBFgb4DZ+QKBgQDi2VKd8Tmxq2pF9LNz
2x9aQJHhs1b7MX0//pgTjBq6l4ggvJa+7bZPyWEWuqL1NJpcQfd/RltdnY7PN0Xo
GCBC+A/VPeWA/HMpil3W6mpFgq4iFjfIW/rGua4oIWGw7kyFw3s9EbL51fMoT8OT
OiLeAnKa1yikzDtg9ge42IWGeQKBgQDV5DE6UbJ3Gfz0nPV9dP7qUZxhQCIPDFMJ
iuW/0PXJ01kQgg2IQDOe4YySOVagVOgvNOE/ofp6me0afZB2N4bNUWSK1uCD2asV
zzbNgZE7da0GbaWrh2JdRxy7QuV75R7A5WBc22EcFYL5YBugh4TyQNqvCBEVR8km
CCEOeMZwYwKBgQDW2gxEqS8Clp6N6Uh5p4TXXyaMBOaR/PpqvQBeKyk5psF4eAWy
icRNZyb8dwJWiV7VmGkH86QfU1Xp7qjYPNl5dCbSyc/vzappIrLkFZtXgIDaqf5l
VrB6vWw0eAFlqR1y54V2fqfrtnaZrIpIjBxv9xOCkdvd0c0/dWY07WXxyQKBgQCQ
JmIm87hbHGCmWsH380l5kdbak+ZgTeYIoFuGksWTZ6S2w29rTBl+EnQyeAIxvAdf
CTxlLj0pM2PgXo9lnLZ02U3xZC+brK7o2+YLSi8e64fYtTzaBTv9sVdjvQn8HcZE
KlJvQkqIKtdCSctUvQCUY7D+FWmt9dtSjlf48NyMEQKBgQCRWVQI+qVWWrdGcILm
VvC3Zd997wiHy5tVPKCY9ED62esv4YlbiHjIAhlDql5IZ73NLcxBybwZ7Rv69l+M
pgs8a9OuoiLsKmmAAZEul2iQ0F1Sas8ifp36JI/aq63CM56Yf8GOKbXZ5kPlUDg7
IJgsdMZU1038LxucAuDiFd/1Eg==
-----END PRIVATE KEY-----
`;
const CERT_TEST = `-----BEGIN CERTIFICATE-----
MIIDHDCCAgSgAwIBAgIUfmuZeqSHol2Fwxbfswgj2f5lkoIwDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJMTI3LjAuMC4xMCAXDTI2MDcyMDEzMTM0NVoYDzIxMjYw
NjI2MTMxMzQ1WjAUMRIwEAYDVQQDDAkxMjcuMC4wLjEwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQC9iQbqRNGy9AYXEoQMcCkE8Icl5fafZxpPerT/smoZ
Wka8BHp6+FHgPR396u/OjP6Bi1H6kq2pTBZCZ0gOc9soGzVrbx7WXAusp8ZSpAwn
e9FEPqwC8Q3d4JuRIiYptmOBTxIIze1Otmcb2oIYDG63pABvqkypOnbdfSgV1eLp
K55eAe6y/lqZjLI6TVX4gIxTz6IX4SLkVBAL/TqzPiY149JRbS9UJkUGHupKYJlV
qKHt7V3/yh3/AqOwEuAu144dXuFUs9awUz37SoGhN/GbVMbN90iUFQZWi//SQV2i
EDqszSL6B9xnRySF13jMJlJxGvGcaOJBcvhm3SLgDfDLAgMBAAGjZDBiMB0GA1Ud
DgQWBBR9RLj+dZrLRvbNYsfiQK0c3J6w6DAfBgNVHSMEGDAWgBR9RLj+dZrLRvbN
YsfiQK0c3J6w6DAPBgNVHRMBAf8EBTADAQH/MA8GA1UdEQQIMAaHBH8AAAEwDQYJ
KoZIhvcNAQELBQADggEBAA2SFeqGuJFZQDHGhqHdbJQTkiNYXHGelkRZ0QuuAGRe
EQ9Rz4c3bGS++/GUL5p3QVOl4K1sKCt+/LTCpH6VWFxzEGlJvnlstjCYTkZigsHm
ZaV+Lh5BsGkYmDue+lbz8PrmEA0GABY8qYj+eb8Bz/6RkT3jkdMJ/n1cFi3o9YU6
drzPPRjD9TBUsFnTsygnaRSv7CexsWK7TTBwQy5yphz+ho/5NaafJYJGxkdTlclt
dQHcgYeAFo6xeBQCl2+0+86AoXS00jM8/HSMmb6A3byg4EjQ8vtkB05icmW0AZBl
Q0imFrYmK0i5Sww6N2i1MBCuTMip9KzQ+SGNw+4jlio=
-----END CERTIFICATE-----
`;

// ------------------------------------------------------------
// Banc d'essai : dossier jetable (base + PEM), port aléatoire haut,
// « IP LAN » = 127.0.0.2 (bouclage, jamais le vrai réseau).
// ------------------------------------------------------------
const DOSSIER = mkdtempSync(join(tmpdir(), 'inerweb-fluide-lan-https-'));
const CHEMIN_BASE = join(DOSSIER, 'data', 'inerweb-fluide.db');
const CHEMIN_CERT = join(DOSSIER, 'cert-test.pem');
const CHEMIN_CLE = join(DOSSIER, 'cle-test.pem');
writeFileSync(CHEMIN_CERT, CERT_TEST);
writeFileSync(CHEMIN_CLE, CLE_TEST);

const PORT = 34000 + Math.floor(Math.random() * 9000);
const HOTE_LAN = '127.0.0.2';
const CHEMIN_SERVEUR = join(import.meta.dirname, 'serveur.js');

let enfant = null;
// Le /api/ping de la famille 2, gardé pour la famille 5 (d'où vient la réponse).
let pingRetenu = null;

/** Requête HTTPS brute (auto-signé accepté), renvoie {statut, enTetes, corps, protocoleTls, pairDistant}. */
function requeteHttps(chemin, enTetes = {}) {
  return new Promise((resoudre, rejeter) => {
    const requete = https.request({
      host: HOTE_LAN,
      port: PORT,
      path: chemin,
      method: 'GET',
      headers: enTetes,
      rejectUnauthorized: false,
      timeout: 5000,
      // Agent DÉDIÉ : jamais l'agent global, détournable par mandataire.
      agent: AGENT_HTTPS,
    }, (reponse) => {
      // Le protocole TLS ET le pair distant se lisent À LA RÉCEPTION : à
      // l'événement `end`, le socket est déjà détaché de la réponse (null
      // sous Node 24).
      const protocoleTls = reponse.socket?.getProtocol?.() ?? null;
      const pairDistant = {
        adresse: reponse.socket?.remoteAddress ?? null,
        port: reponse.socket?.remotePort ?? null,
      };
      let corps = '';
      reponse.on('data', (d) => { corps += d.toString(); });
      reponse.on('end', () => resoudre({
        statut: reponse.statusCode,
        enTetes: reponse.headers,
        corps,
        protocoleTls,
        pairDistant,
      }));
    });
    AGENTS_UTILISES.https.push(requete.agent);
    requete.on('timeout', () => { requete.destroy(new Error('délai dépassé')); });
    requete.on('error', rejeter);
    requete.end();
  });
}

/** Requête HTTP EN CLAIR vers le port LAN : doit ÉCHOUER (jamais de réponse). */
function requeteClairEchoue(chemin) {
  return new Promise((resoudre) => {
    const requete = http.request({
      host: HOTE_LAN, port: PORT, path: chemin, method: 'GET', timeout: 5000,
      // Agent DÉDIÉ : sans lui, cette vérification — celle qui porte TOUTE
      // la propriété « aucun repli en clair » — part chez le mandataire de
      // l'environnement et conclut au VERT sans avoir touché le serveur.
      agent: AGENT_HTTP,
    }, (reponse) => {
      // Une réponse HTTP ici = un repli en clair : c'est l'échec du test.
      resoudre({ reponduEnClair: true, statut: reponse.statusCode });
    });
    requete.on('timeout', () => {
      requete.destroy();
      resoudre({ reponduEnClair: false, motif: 'délai (aucune réponse HTTP)' });
    });
    requete.on('error', (erreur) => {
      resoudre({ reponduEnClair: false, motif: erreur.code ?? erreur.message });
    });
    AGENTS_UTILISES.clair.push(requete.agent);
    requete.end();
  });
}

/** Une configuration de mandataire portée par un agent (aucune attendue ici). */
function configurationMandataire(agent) {
  const options = agent?.options ?? {};
  if (options.proxyEnv) return 'options.proxyEnv';
  if (options.proxy) return 'options.proxy';
  if (agent?.proxyEnv) return 'agent.proxyEnv';
  if (agent?.proxy) return 'agent.proxy';
  return null;
}

/** Attend que /api/ping réponde en HTTPS (fin de la séquence de démarrage). */
async function attendreDemarrageHttps(dureeMaxMs = 10000) {
  const debut = Date.now();
  while (Date.now() - debut < dureeMaxMs) {
    try {
      const reponse = await requeteHttps('/api/ping');
      if (reponse.statut === 200) return true;
    } catch {
      // pas encore prêt
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

try {
  // ============================================================
  // 1. IWF_LAN=1 SANS certificat → refus de démarrer, aucune écoute
  // ============================================================
  {
    const sansCert = spawn(process.execPath, [CHEMIN_SERVEUR], {
      env: {
        ...process.env,
        PORT: String(PORT),
        IWF_CHEMIN_BASE: CHEMIN_BASE,
        IWF_LAN: '1',
        IWF_HOTE_LAN: HOTE_LAN,
        IWF_TLS_CERT: '',
        IWF_TLS_KEY: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let sortie = '';
    sansCert.stdout.on('data', (d) => { sortie += d.toString(); });
    sansCert.stderr.on('data', (d) => { sortie += d.toString(); });
    const codeSortie = await new Promise((resoudre) => {
      sansCert.on('exit', (code) => resoudre(code));
      setTimeout(() => { sansCert.kill(); resoudre(null); }, 8000);
    });
    verifier('IWF_LAN=1 sans certificat : le serveur refuse de démarrer (code 1)',
      codeSortie === 1, `code de sortie : ${codeSortie}`);
    verifier('le refus est explicite (« Le mode LAN exige HTTPS »)',
      sortie.includes('Le mode LAN exige HTTPS'), sortie.slice(0, 300));
    const enClair = await requeteClairEchoue('/api/ping');
    verifier('aucune écoute HTTP en clair n\'a été ouverte sur le port LAN',
      !enClair.reponduEnClair, JSON.stringify(enClair));
  }

  // ============================================================
  // 2. IWF_LAN=1 + certificat → HTTPS réel (TLS ≥ 1.2) + HSTS
  // ============================================================
  enfant = spawn(process.execPath, [CHEMIN_SERVEUR], {
    env: {
      ...process.env,
      PORT: String(PORT),
      IWF_CHEMIN_BASE: CHEMIN_BASE,
      IWF_LAN: '1',
      IWF_HOTE_LAN: HOTE_LAN,
      IWF_TLS_CERT: CHEMIN_CERT,
      IWF_TLS_KEY: CHEMIN_CLE,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let sortieServeur = '';
  enfant.stdout.on('data', (d) => { sortieServeur += d.toString(); });
  enfant.stderr.on('data', (d) => { sortieServeur += d.toString(); });

  const pret = await attendreDemarrageHttps();
  verifier('le serveur LAN démarre et /api/ping répond en HTTPS',
    pret, sortieServeur.slice(0, 500));

  if (pret) {
    const ping = await requeteHttps('/api/ping');
    pingRetenu = ping;
    verifier('la connexion négocie TLS 1.2 au minimum',
      ping.protocoleTls === 'TLSv1.2' || ping.protocoleTls === 'TLSv1.3',
      `protocole : ${ping.protocoleTls}`);
    verifier('l\'en-tête Strict-Transport-Security est servi en mode LAN',
      typeof ping.enTetes['strict-transport-security'] === 'string'
        && ping.enTetes['strict-transport-security'].includes('max-age='),
      JSON.stringify(ping.enTetes['strict-transport-security']));
    verifier('la bannière de démarrage annonce le LAN en HTTPS',
      sortieServeur.includes('LAN HTTPS') && sortieServeur.includes(`https://${HOTE_LAN}:${PORT}`),
      sortieServeur.slice(0, 500));

    // ============================================================
    // 3. HTTP en clair sur le port LAN → poignée de main coupée
    // ============================================================
    const enClair = await requeteClairEchoue('/api/ping');
    verifier('une requête HTTP EN CLAIR sur le port LAN n\'obtient JAMAIS de réponse',
      !enClair.reponduEnClair, JSON.stringify(enClair));

    // ============================================================
    // 4. Garde d'origine : https://<hôte LAN> accepté, http:// refusé
    // ============================================================
    const origineHttps = await requeteHttps('/api/ping', {
      Host: `${HOTE_LAN}:${PORT}`,
      Origin: `https://${HOTE_LAN}:${PORT}`,
    });
    verifier('Origin https://<hôte LAN> (le front servi par CE serveur) → accepté',
      origineHttps.statut === 200, `statut : ${origineHttps.statut}`);

    const origineClair = await requeteHttps('/api/ping', {
      Host: `${HOTE_LAN}:${PORT}`,
      Origin: `http://${HOTE_LAN}:${PORT}`,
    });
    verifier('Origin http://<hôte LAN> (page servie EN CLAIR) → 403 refusé',
      origineClair.statut === 403, `statut : ${origineClair.statut}`);

    const origineTierce = await requeteHttps('/api/ping', {
      Host: `${HOTE_LAN}:${PORT}`,
      Origin: 'https://site-hostile.exemple',
    });
    verifier('Origin d\'un site tiers → 403 refusé (garde inchangée en LAN)',
      origineTierce.statut === 403, `statut : ${origineTierce.statut}`);
  }

  // ============================================================
  // 5. HERMÉTICITÉ DU BANC : ce voyant a-t-il seulement TIRÉ sur la cible ?
  //
  // Sans cette famille, retirer les agents dédiés ne casse RIEN et rouvre
  // en silence le faux vert décrit en tête de fichier. On ne relit donc pas
  // les options qu'on croit avoir passées : on relit l'agent que Node a
  // réellement attaché à CHAQUE requête émise, et l'adresse d'où la réponse
  // HTTPS est réellement venue.
  // ============================================================
  verifier('le banc a bien émis des requêtes des DEUX sortes (vérification non vide)',
    AGENTS_UTILISES.https.length > 0 && AGENTS_UTILISES.clair.length > 0,
    `https : ${AGENTS_UTILISES.https.length}, clair : ${AGENTS_UTILISES.clair.length}`);

  verifier('TOUTES les requêtes HTTPS du banc ont porté son agent dédié (jamais l\'agent global)',
    AGENTS_UTILISES.https.every((agent) => agent === AGENT_HTTPS),
    `${AGENTS_UTILISES.https.filter((a) => a !== AGENT_HTTPS).length} requête(s) hors agent dédié`);

  verifier('TOUTES les requêtes EN CLAIR du banc ont porté son agent dédié (jamais l\'agent global)',
    AGENTS_UTILISES.clair.every((agent) => agent === AGENT_HTTP),
    `${AGENTS_UTILISES.clair.filter((a) => a !== AGENT_HTTP).length} requête(s) hors agent dédié`);

  const mandataireHttps = configurationMandataire(AGENT_HTTPS);
  const mandataireClair = configurationMandataire(AGENT_HTTP);
  verifier('aucun des deux agents dédiés ne porte de configuration de mandataire',
    mandataireHttps === null && mandataireClair === null,
    `https : ${mandataireHttps}, clair : ${mandataireClair}`);

  verifier('la réponse HTTPS vient du serveur monté par le banc, pas d\'un intermédiaire',
    pingRetenu !== null
      && pingRetenu.pairDistant.adresse === HOTE_LAN
      && pingRetenu.pairDistant.port === PORT,
    pingRetenu ? JSON.stringify(pingRetenu.pairDistant) : 'aucun ping retenu');
} finally {
  if (enfant) enfant.kill();
  // Laisser le process libérer la base avant de balayer le dossier jetable.
  await new Promise((r) => setTimeout(r, 300));
  try { rmSync(DOSSIER, { recursive: true, force: true }); } catch { /* Windows : verrou résiduel toléré */ }
}

console.log('');
console.log(`Bilan test-lan-https : ${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
