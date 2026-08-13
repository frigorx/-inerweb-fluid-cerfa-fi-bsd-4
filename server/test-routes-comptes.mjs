// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — PREUVE des routes d'authentification (V9-E5, vague 3)
// Exécution : node server/test-routes-comptes.mjs
//
// Éprouve serveur.js + routes-comptes.js + le contexteDeLaConnexion basé
// sessions (qui REMPLACE le raccourci « loopback = REFERENT ») en lançant un
// VRAI serveur HTTP (process enfant, copie jetable de server/ sous
// os.tmpdir() — jamais le data/ réel, jamais le port 2011 réel).
//
// Familles :
//   0. Premier lancement : etatInitial (non initialisé) puis bootstrapAdmin
//      (crée le 1er ADMIN + session ; refuse mdp court / sans login / 2e appel
//      / origine non loopback).
//   1. Mutation sans session → 403.
//   2. Connexion pose un cookie iwf_session ; requête suivante avec ce
//      cookie porte le rôle attendu.
//   3. Session ELEVE : validerMouvement (VALIDEUR) → 403 ; session REFERENT
//      → passe la garde de rôle (peut échouer plus loin pour raison métier,
//      mais PAS 403).
//   4. creerCompte : non-admin → 403 ; admin → 200 (compte utilisable).
//   5. Verrou : 5 échecs consécutifs → refus MÊME avec le bon mot de passe,
//      réponse INDISCERNABLE d'un échec ordinaire ou d'un login inexistant
//      (4e relecture externe : l'ancien « Compte verrouillé » 403 énumérait
//      les identifiants) ; verrou expiré = fenêtre NOUVELLE de 5 essais.
//   6. Lecture (get*) : loopback sans session → 200 ; « LAN » (Host distinct
//      simulé) sans session → 403 (session exigée même en lecture).
//   7. Déconnexion : après logout, le cookie ne porte plus de rôle (une
//      mutation qui marchait avant échoue en 403 après).
//
// Node ≥ 22 (node:sqlite, node:http natifs), sans DOM.
// ============================================================

import { spawn } from 'node:child_process';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';

// comptes.js (CommonJS) : uniquement pour DÉRIVER un hash à l'ancien profil
// scrypt (famille 10) — aucune base n'est ouverte par cet import.
const require = createRequire(import.meta.url);
const comptes = require('./comptes.js');

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
// Petit client HTTP natif (pas de fetch nécessaire, node:http suffit et
// donne un contrôle total sur l'en-tête Host — indispensable pour simuler
// une origine « LAN » face à la garde anti-rebinding de serveur.js).
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
        catch { /* corps vide ou non JSON (405...) */ }
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
// process enfant sur un port dédié. La base et backups/ se créent tout
// seuls à l'intérieur (jamais le data/ réel du dépôt).
// ------------------------------------------------------------
const DOSSIER = mkdtempSync(join(tmpdir(), 'inerweb-fluide-routes-comptes-'));
cpSync(join(import.meta.dirname, '.'), join(DOSSIER, 'server'), { recursive: true });

const PORT = 2093 + Math.floor(Math.random() * 500); // évite les collisions entre lancements

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

// ============================================================
// 0. Premier lancement : /api/etatInitial + /api/bootstrapAdmin
//    Sur base VIERGE (aucun compte), etatInitial signale non-initialisé et
//    bootstrapAdmin crée le 1er ADMIN puis ouvre une session. C'est désormais
//    le chemin NOMINAL (il remplace l'ancien amorçage direct en base / CLI) :
//    l'ADMIN 'admin.amorce' ainsi créé sert d'outillage aux familles suivantes.
// ============================================================
{
  const rEtat0 = await requeteJson(PORT, 'etatInitial', {});
  verifier('etatInitial sur base vierge → { initialise: false }',
    rEtat0.statut === 200 && rEtat0.corps?.resultat?.initialise === false,
    JSON.stringify(rEtat0.corps));

  const rCourt = await requeteJson(PORT, 'bootstrapAdmin',
    { login: 'admin.amorce', motDePasse: 'court12' });
  verifier('bootstrapAdmin avec mot de passe < 10 caractères → 400',
    rCourt.statut === 400, JSON.stringify(rCourt.corps));

  const rSansLogin = await requeteJson(PORT, 'bootstrapAdmin',
    { login: '   ', motDePasse: 'MotDePasseAdmin-Amorce-2026' });
  verifier('bootstrapAdmin sans identifiant → 400',
    rSansLogin.statut === 400, JSON.stringify(rSansLogin.corps));

  // Toujours aucun compte : les tentatives invalides n'ont rien créé.
  const rEtatEncore = await requeteJson(PORT, 'etatInitial', {});
  verifier('après tentatives invalides, l’installation reste NON initialisée',
    rEtatEncore.corps?.resultat?.initialise === false,
    JSON.stringify(rEtatEncore.corps));

  const rBoot = await requeteJson(PORT, 'bootstrapAdmin',
    { login: 'admin.amorce', motDePasse: 'MotDePasseAdmin-Amorce-2026' });
  verifier('bootstrapAdmin valide en loopback → 200', rBoot.statut === 200,
    JSON.stringify(rBoot.corps));
  verifier('bootstrapAdmin pose un Set-Cookie iwf_session (connexion immédiate)',
    rBoot.setCookie?.includes('iwf_session=') === true);
  verifier('bootstrapAdmin ne renvoie PAS le jeton clair (role ADMIN seulement)',
    rBoot.corps?.resultat?.jetonClair === undefined &&
    rBoot.corps?.resultat?.role === 'ADMIN', JSON.stringify(rBoot.corps));

  // La session ouverte par le bootstrap est immédiatement utilisable.
  const cookieBoot = `iwf_session=${extraireJetonDuSetCookie(rBoot.setCookie)}`;
  const rLectureBoot = await requeteJson(PORT, 'getEtablissement', {}, { cookie: cookieBoot });
  verifier('la session ouverte par bootstrapAdmin fonctionne (lecture 200)',
    rLectureBoot.statut === 200, JSON.stringify(rLectureBoot.corps));

  const rEtat1 = await requeteJson(PORT, 'etatInitial', {});
  verifier('après bootstrapAdmin → etatInitial { initialise: true }',
    rEtat1.corps?.resultat?.initialise === true, JSON.stringify(rEtat1.corps));

  // FENÊTRE UNIQUE : un 2e bootstrap est refusé (un compte existe désormais).
  const rBoot2 = await requeteJson(PORT, 'bootstrapAdmin',
    { login: 'autre.admin', motDePasse: 'UnAutreMotDePasse-2026' });
  verifier('bootstrapAdmin une fois initialisé → 403 (fenêtre refermée)',
    rBoot2.statut === 403, JSON.stringify(rBoot2.corps));

  // Défense réseau : depuis un Host non loopback (simule une origine LAN), la
  // garde anti-rebinding (refusReseau) refuse AVANT même la garde loopback du
  // handler — le bootstrap n'est jamais atteignable à distance (même limite de
  // portée que la famille 6 : l'écoute réelle reste sur 127.0.0.1).
  const rBootLan = await requeteJson(PORT, 'bootstrapAdmin',
    { login: 'lan.admin', motDePasse: 'MotDePasseLan-2026' },
    { host: 'un-autre-hote:1234' });
  verifier('bootstrapAdmin depuis un Host non loopback → 403 (jamais à distance)',
    rBootLan.statut === 403, JSON.stringify(rBootLan.corps));
}

// ============================================================
// 1. Mutation sans session → 403
// ============================================================
{
  const r = await requeteJson(PORT, 'createClient', {
    donneesClient: { raisonSociale: 'Client sans session', adresse: '1 rue Test', siret: '12345678901234' }
  });
  verifier('mutation (createClient) sans cookie de session → 403',
    r.statut === 403, JSON.stringify(r.corps));
}

// ============================================================
// 2. Connexion pose un cookie ; la session ouverte porte le bon rôle
// ============================================================
let cookieAdmin;
{
  const rEchec = await requeteJson(PORT, 'connexion',
    { login: 'admin.amorce', motDePasse: 'MauvaisMotDePasse' });
  // Le texte est lu de routes-comptes.js (message canonique) : la suite
  // prouve que la ROUTE le rend tel quel, pas que le texte n'a pas changé.
  const routesComptes = require('./routes-comptes.js');
  verifier('connexion avec mauvais mot de passe → 400, message unique',
    rEchec.statut === 400 &&
    rEchec.corps?.erreur === routesComptes.MSG_ECHEC_CONNEXION);

  const rLoginInexistant = await requeteJson(PORT, 'connexion',
    { login: 'nexiste-pas-du-tout', motDePasse: 'peu-importe-12345' });
  verifier('connexion avec login inexistant → même message (pas de fuite)',
    rLoginInexistant.statut === 400 &&
    rLoginInexistant.corps?.erreur === rEchec.corps?.erreur);

  const rOk = await requeteJson(PORT, 'connexion',
    { login: 'admin.amorce', motDePasse: 'MotDePasseAdmin-Amorce-2026' });
  verifier('connexion avec bon mot de passe → 200', rOk.statut === 200,
    JSON.stringify(rOk.corps));
  verifier('un Set-Cookie iwf_session est posé', rOk.setCookie?.includes('iwf_session=') === true);
  verifier('le cookie porte HttpOnly; SameSite=Strict; Path=/; Max-Age=28800',
    rOk.setCookie?.includes('HttpOnly') &&
    rOk.setCookie?.includes('SameSite=Strict') &&
    rOk.setCookie?.includes('Path=/') &&
    rOk.setCookie?.includes('Max-Age=28800'));
  verifier('le corps de réponse NE PORTE PAS le jeton clair (seulement role/utilisateur)',
    rOk.corps?.resultat?.jetonClair === undefined && rOk.corps?.resultat?.role === 'ADMIN');

  const jeton = extraireJetonDuSetCookie(rOk.setCookie);
  cookieAdmin = `iwf_session=${jeton}`;

  const rQui = await requeteJson(PORT, 'getEtablissement', {}, { cookie: cookieAdmin });
  verifier('lecture avec le cookie ADMIN fonctionne (200)', rQui.statut === 200);
}

// ============================================================
// 3. Session ELEVE : validerMouvement → 403 ; REFERENT → passe la garde
// ============================================================
let cookieReferent;
let cookieEleve;
{
  // Créer un référent et un élève via /api/creerCompte (garde ADMIN,
  // testée en famille 4 — ici on l'utilise juste comme outillage).
  const rCreeRef = await requeteJson(PORT, 'creerCompte',
    { login: 'referent.test3', motDePasseInitial: 'MotDePasseRef-Long-2026', role: 'REFERENT' },
    { cookie: cookieAdmin });
  verifier('création REFERENT via ADMIN → 200 (outillage famille 3)',
    rCreeRef.statut === 200, JSON.stringify(rCreeRef.corps));

  const rCreeEleve = await requeteJson(PORT, 'creerCompte',
    { login: 'eleve.test3', motDePasseInitial: 'MotDePasseEleve1', role: 'ELEVE' },
    { cookie: cookieAdmin });
  verifier('création ELEVE via ADMIN → 200 (outillage famille 3)',
    rCreeEleve.statut === 200, JSON.stringify(rCreeEleve.corps));

  const rLoginRef = await requeteJson(PORT, 'connexion',
    { login: 'referent.test3', motDePasse: 'MotDePasseRef-Long-2026' });
  cookieReferent = `iwf_session=${extraireJetonDuSetCookie(rLoginRef.setCookie)}`;

  const rLoginEleve = await requeteJson(PORT, 'connexion',
    { login: 'eleve.test3', motDePasse: 'MotDePasseEleve1' });
  cookieEleve = `iwf_session=${extraireJetonDuSetCookie(rLoginEleve.setCookie)}`;

  const rMutationEleve = await requeteJson(PORT, 'validerMouvement',
    { id: 'MVT-INEXISTANT' }, { cookie: cookieEleve });
  verifier('validerMouvement avec session ELEVE → 403 (rôle non habilité)',
    rMutationEleve.statut === 403, JSON.stringify(rMutationEleve.corps));

  const rMutationRef = await requeteJson(PORT, 'validerMouvement',
    { id: 'MVT-INEXISTANT' }, { cookie: cookieReferent });
  verifier('validerMouvement avec session REFERENT → PASSE la garde de rôle (pas 403 ; ' +
    'échoue pour raison métier, mouvement introuvable)',
    rMutationRef.statut !== 403, JSON.stringify(rMutationRef.corps));
}

// ============================================================
// 4. creerCompte : non-admin → 403 ; admin → 200 (déjà exercé en famille 3,
//    on ajoute ici le rejet explicite d'un rôle non-ADMIN)
// ============================================================
{
  const rNonAdmin = await requeteJson(PORT, 'creerCompte',
    { login: 'intrus.test4', motDePasseInitial: 'PeuImporteQuoi1', role: 'ELEVE' },
    { cookie: cookieReferent });
  verifier('creerCompte avec session REFERENT (non-ADMIN) → 403',
    rNonAdmin.statut === 403, JSON.stringify(rNonAdmin.corps));

  const rSansSession = await requeteJson(PORT, 'creerCompte',
    { login: 'intrus2.test4', motDePasseInitial: 'PeuImporteQuoi2', role: 'ELEVE' });
  verifier('creerCompte sans session → 403',
    rSansSession.statut === 403, JSON.stringify(rSansSession.corps));

  const rRoleInvalide = await requeteJson(PORT, 'creerCompte',
    { login: 'role.invalide4', motDePasseInitial: 'MotDePasseValide99', role: 'TECHNICIEN' },
    { cookie: cookieAdmin });
  verifier('creerCompte avec un rôle TECHNICIEN (absent en V9) → refusé (400, pas 500)',
    rRoleInvalide.statut === 400, JSON.stringify(rRoleInvalide.corps));

  const rMdpCourt = await requeteJson(PORT, 'creerCompte',
    { login: 'admin.court4', motDePasseInitial: 'court12', role: 'ADMIN' },
    { cookie: cookieAdmin });
  verifier('creerCompte ADMIN avec mot de passe < 10 caractères → refusé',
    rMdpCourt.statut === 400, JSON.stringify(rMdpCourt.corps));

  const rDoublon = await requeteJson(PORT, 'creerCompte',
    { login: 'admin.amorce', motDePasseInitial: 'UnAutreMotDePasse1', role: 'ENSEIGNANT' },
    { cookie: cookieAdmin });
  verifier('creerCompte avec un login déjà pris → refusé',
    rDoublon.statut === 400, JSON.stringify(rDoublon.corps));
}

// ============================================================
// 5. Verrou : 5 échecs consécutifs → refus MÊME avec le bon mot de passe,
//    mais réponse INDISCERNABLE d'un échec ordinaire (message unique,
//    4e relecture externe) ; verrou expiré = fenêtre NOUVELLE de 5 essais.
// ============================================================
{
  const rCree = await requeteJson(PORT, 'creerCompte',
    { login: 'verrou.test5', motDePasseInitial: 'MotDePasseVerrou-2026', role: 'ENSEIGNANT' },
    { cookie: cookieAdmin });
  verifier('compte de test du verrou créé (outillage famille 5)',
    rCree.statut === 200, JSON.stringify(rCree.corps));

  let dernierStatut = null;
  let dernierMessage = null;
  for (let i = 0; i < 5; i += 1) {
    const r = await requeteJson(PORT, 'connexion',
      { login: 'verrou.test5', motDePasse: 'MauvaisMotDePasse' });
    dernierStatut = r.statut;
    dernierMessage = r.corps?.erreur;
  }
  verifier('les 5 échecs consécutifs sont bien refusés (400, message unique)',
    dernierStatut === 400);

  // Pendant le verrou, MÊME le bon mot de passe est refusé (décision V9-E5
  // maintenue) — mais la réponse est INDISCERNABLE d'un échec ordinaire.
  // L'ancien « Compte verrouillé. » (403) ne sortait que pour un login
  // EXISTANT : cinq requêtes suffisaient à énumérer les identifiants
  // (4e relecture externe, tirée). Ces assertions redeviennent rouges si
  // le refus différencié revient.
  const rBonMdpApresVerrou = await requeteJson(PORT, 'connexion',
    { login: 'verrou.test5', motDePasse: 'MotDePasseVerrou-2026' });
  verifier('après 5 échecs : même le BON mot de passe est refusé',
    rBonMdpApresVerrou.statut === 400,
    JSON.stringify(rBonMdpApresVerrou.corps));
  verifier('le refus de verrou ne se distingue pas d’un échec ordinaire',
    rBonMdpApresVerrou.corps?.erreur === dernierMessage,
    JSON.stringify(rBonMdpApresVerrou.corps));

  // Non-énumération TIRÉE : un login INEXISTANT répond exactement pareil
  // (statut ET message) que le compte verrouillé ci-dessus.
  const rInexistant = await requeteJson(PORT, 'connexion',
    { login: 'login.fantome5', motDePasse: 'MotDePasseVerrou-2026' });
  verifier('login inexistant : statut identique au compte verrouillé',
    rInexistant.statut === rBonMdpApresVerrou.statut,
    `${rInexistant.statut} vs ${rBonMdpApresVerrou.statut}`);
  verifier('login inexistant : message identique au compte verrouillé',
    rInexistant.corps?.erreur === rBonMdpApresVerrou.corps?.erreur,
    JSON.stringify(rInexistant.corps));

  // Verrou EXPIRÉ = fenêtre NOUVELLE (correctif de la 4e relecture) : on
  // force l'échéance dans le passé (accès direct à la base jetable, patron
  // de la famille 10), puis UN échec — il compte pour UN et ne re-verrouille
  // pas ; le bon mot de passe passe ensuite. Avant le correctif, le compteur
  // restait à 5 : cet échec re-verrouillait 15 minutes et la connexion
  // suivante échouait (contre-épreuve tirée en retirant la fenêtre).
  const cheminBase = join(DOSSIER, 'data', 'inerweb-fluide.db');
  {
    const bdd = new DatabaseSync(cheminBase);
    bdd.prepare(
      `UPDATE utilisateurs_app SET verrouille_jusqua = ?
       WHERE login = 'verrou.test5'`)
      .run(new Date(Date.now() - 1000).toISOString());
    bdd.close();
  }
  const rEchecApresExpiration = await requeteJson(PORT, 'connexion',
    { login: 'verrou.test5', motDePasse: 'MauvaisMotDePasse' });
  verifier('après expiration du verrou : un échec est refusé normalement',
    rEchecApresExpiration.statut === 400);
  {
    const bdd = new DatabaseSync(cheminBase);
    const ligneCompte = bdd.prepare(
      `SELECT echecs_consecutifs, verrouille_jusqua FROM utilisateurs_app
       WHERE login = 'verrou.test5'`).get();
    bdd.close();
    verifier('cet échec COMPTE POUR UN : fenêtre nouvelle, pas de re-verrou',
      ligneCompte.echecs_consecutifs === 1
      && ligneCompte.verrouille_jusqua === null,
      `compteur=${ligneCompte.echecs_consecutifs}, verrou=${ligneCompte.verrouille_jusqua}`);
  }
  const rBonMdpFenetre = await requeteJson(PORT, 'connexion',
    { login: 'verrou.test5', motDePasse: 'MotDePasseVerrou-2026' });
  verifier('le BON mot de passe se connecte après expiration (plus de verrou perpétuel)',
    rBonMdpFenetre.statut === 200, JSON.stringify(rBonMdpFenetre.corps));
}

// ============================================================
// 6. Lecture SANS session → 403 (lot A audit-proof), loopback COMPRIS,
//    et « LAN » sans session → 403 (garde anti-rebinding, antérieure).
// ============================================================
{
  // Lot A : depuis l'audit externe du 15/07, une lecture anonyme n'est plus
  // tolérée MÊME en loopback (l'ancien « confort mono-poste » était le
  // blocage n°1). Un registre réglementaire doit dire QUI a consulté quoi :
  // toute lecture exige une session. Cette assertion échouerait contre le
  // serveur d'avant le lot A (où elle renvoyait 200) : garde-fou anti-
  // régression. Seules ping, etatInitial, bootstrapAdmin et connexion
  // restent atteignables sans session — aiguillées AVANT la garde de lecture.
  const rLoopback = await requeteJson(PORT, 'getFluides', {});
  verifier('lecture (getFluides) en loopback SANS session → 403 [lot A]',
    rLoopback.statut === 403, JSON.stringify(rLoopback.corps));
  verifier('le refus porte « Session requise (connexion nécessaire). »',
    rLoopback.corps?.erreur === 'Session requise (connexion nécessaire).',
    JSON.stringify(rLoopback.corps));

  // Simulation « LAN » : Host distinct de la liste des hôtes loopback
  // autorisés → cette requête tombe sous la garde anti-rebinding
  // (refusReseau, ANTÉRIEURE à E5, CONSERVÉE), qui refuse encore plus tôt
  // (403 avant même d'atteindre la garde de session). On vérifie que le
  // refus est bien un 403, quelle qu'en soit la barrière exacte.
  //
  // NOTE DE PORTÉE : tant que serveur.js n'écoute QUE sur 127.0.0.1 (HOTE),
  // une vraie requête « LAN » (IP source non loopback) ne peut structurel-
  // lement jamais atteindre ce serveur — le test ci-dessus (Host étranger)
  // est donc le seul cas de « non-loopback » observable de bout en bout
  // aujourd'hui. Depuis le lot A, la garde de session couvre de toute façon
  // loopback ET non-loopback de façon uniforme (plus de branche `loopback`).
  const rHostEtranger = await requeteJson(PORT, 'getFluides', {}, { host: 'un-autre-hote:1234' });
  verifier('lecture avec un Host non loopback (simule une origine LAN) → 403',
    rHostEtranger.statut === 403, JSON.stringify(rHostEtranger.corps));
}

// ============================================================
// 7. Déconnexion : après logout, la session ne porte plus de rôle
// ============================================================
{
  const rMutationAvant = await requeteJson(PORT, 'createClient', {
    donneesClient: { raisonSociale: 'Avant logout', adresse: '2 rue Test', siret: '98765432109876' }
  }, { cookie: cookieReferent });
  verifier('mutation avec session REFERENT valide, AVANT déconnexion → pas 403',
    rMutationAvant.statut !== 403, JSON.stringify(rMutationAvant.corps));

  const rLogout = await requeteJson(PORT, 'deconnexion', {}, { cookie: cookieReferent });
  verifier('déconnexion → 200', rLogout.statut === 200);
  verifier('déconnexion pose un Set-Cookie qui efface le cookie (Max-Age=0)',
    rLogout.setCookie?.includes('Max-Age=0') === true);

  const rMutationApres = await requeteJson(PORT, 'createClient', {
    donneesClient: { raisonSociale: 'Après logout', adresse: '3 rue Test', siret: '11122233344455' }
  }, { cookie: cookieReferent });
  verifier('la MÊME mutation, APRÈS déconnexion (cookie révoqué) → 403',
    rMutationApres.statut === 403, JSON.stringify(rMutationApres.corps));

  // Idempotence : redéconnecter un jeton déjà révoqué ne doit jamais lever.
  const rLogout2 = await requeteJson(PORT, 'deconnexion', {}, { cookie: cookieReferent });
  verifier('déconnexion répétée (jeton déjà révoqué) → 200, pas d’erreur',
    rLogout2.statut === 200);

  // Déconnexion sans cookie du tout : no-op silencieux également.
  const rLogoutSansCookie = await requeteJson(PORT, 'deconnexion', {});
  verifier('déconnexion sans cookie → 200 (no-op silencieux)',
    rLogoutSansCookie.statut === 200);
}

// ============================================================
// 8. Anti-oracle de timing : le temps de réponse d'un login INEXISTANT ne doit
//    PAS être discernablement plus court que celui d'un login EXISTANT (mais
//    mauvais mot de passe). Les deux doivent payer un scrypt complet ; sans le
//    correctif, le login inexistant court-circuitait le scrypt et répondait en
//    quelques millisecondes, exposant l'existence des identifiants.
//
//    Mesure d'ORDRE DE GRANDEUR uniquement, avec tolérance large : on ne vise
//    pas l'égalité stricte (bruit d'ordonnancement, GC, WAL), seulement
//    l'ABSENCE d'un delta de la taille d'un scrypt (~dizaines de ms). On médiane
//    plusieurs mesures pour lisser le bruit, et on utilise un compte dédié
//    (jamais verrouillé pendant la mesure : seulement des mauvais mots de passe
//    sur un login existant NON verrouillé — on crée un compte frais et on reste
//    sous le seuil de 5 échecs par salve en le recréant si besoin).
// ============================================================
{
  // Compte existant JAMAIS verrouillé : on mesure avec le BON login mais un
  // mauvais mot de passe. Pour ne pas déclencher le verrou (5 échecs), on
  // limite le nombre de mesures « login existant » à moins de 5 et on
  // réinitialise via une connexion réussie entre les salves.
  await requeteJson(PORT, 'creerCompte',
    { login: 'timing.test8', motDePasseInitial: 'MotDePasseTiming-2026', role: 'ENSEIGNANT' },
    { cookie: cookieAdmin });

  function mediane(valeurs) {
    const triees = [...valeurs].sort((a, b) => a - b);
    const milieu = Math.floor(triees.length / 2);
    return triees.length % 2 === 0
      ? (triees[milieu - 1] + triees[milieu]) / 2
      : triees[milieu];
  }

  async function mesurer(login, motDePasse) {
    const t0 = process.hrtime.bigint();
    await requeteJson(PORT, 'connexion', { login, motDePasse });
    const t1 = process.hrtime.bigint();
    return Number(t1 - t0) / 1e6; // millisecondes
  }

  const tempsInexistant = [];
  const tempsExistant = [];
  // 4 mesures de chaque type, entrelacées, en restant sous le seuil de verrou
  // (4 mauvais essais < 5) et en remettant à zéro par une connexion réussie.
  for (let i = 0; i < 4; i += 1) {
    tempsInexistant.push(await mesurer('nexiste-vraiment-pas-8', 'peu-importe-12345'));
    tempsExistant.push(await mesurer('timing.test8', 'MauvaisMotDePasseXY'));
  }
  // Remise à zéro du compteur d'échecs par une connexion réussie (évite le
  // verrou pour la suite et respecte la règle « reset au succès »).
  await requeteJson(PORT, 'connexion',
    { login: 'timing.test8', motDePasse: 'MotDePasseTiming-2026' });

  const medInexistant = mediane(tempsInexistant);
  const medExistant = mediane(tempsExistant);

  // Sans le correctif, medExistant >> medInexistant (delta ~ coût d'un scrypt,
  // typiquement plusieurs dizaines de ms). Avec le correctif, les deux médianes
  // sont du même ordre. On tolère largement le bruit : on exige seulement que
  // le login inexistant ne soit pas plus rapide que la moitié du login existant
  // (donc qu'un scrypt a bien été payé aussi sur le chemin « inexistant »).
  verifier('anti-oracle de timing : login inexistant paie aussi un scrypt ' +
    '(médiane inexistant >= moitié de la médiane existant)',
    medInexistant >= medExistant / 2,
    `inexistant=${medInexistant.toFixed(1)}ms existant=${medExistant.toFixed(1)}ms`);
}

// ============================================================
// 9. Gestion des comptes (ADMIN) : listerComptes / reinitialiserMotDePasse /
//    definirActivationCompte + garde-fous.
// ============================================================
{
  // --- listerComptes : garde ADMIN, jamais de secret exposé ---
  const rListeSansSession = await requeteJson(PORT, 'listerComptes', {});
  verifier('listerComptes sans session → 403',
    rListeSansSession.statut === 403, JSON.stringify(rListeSansSession.corps));

  const rListe = await requeteJson(PORT, 'listerComptes', {}, { cookie: cookieAdmin });
  verifier('listerComptes en ADMIN → 200 + tableau', rListe.statut === 200
    && Array.isArray(rListe.corps?.resultat), JSON.stringify(rListe.corps));
  const comptesListe = rListe.corps?.resultat ?? [];
  verifier('la liste contient admin.amorce',
    comptesListe.some((c) => c.login === 'admin.amorce'));
  verifier('la liste n’expose NI hash NI sel',
    comptesListe.every((c) => c.hash_mot_de_passe === undefined
      && c.sel === undefined && c.hash === undefined));
  const adminAmorce = comptesListe.find((c) => c.login === 'admin.amorce');

  // --- reinitialiserMotDePasse : garde ADMIN + révocation de session +
  //     changement effectif du mot de passe ---
  const rCreeRef9 = await requeteJson(PORT, 'creerCompte',
    { login: 'gestion.ref9', motDePasseInitial: 'MotDePasseRef9-Ancien', role: 'REFERENT' },
    { cookie: cookieAdmin });
  verifier('création REFERENT gestion.ref9 (outillage) → 200',
    rCreeRef9.statut === 200, JSON.stringify(rCreeRef9.corps));
  const idRef9 = rCreeRef9.corps.resultat.id;

  const rLoginRef9 = await requeteJson(PORT, 'connexion',
    { login: 'gestion.ref9', motDePasse: 'MotDePasseRef9-Ancien' });
  const cookieRef9 = `iwf_session=${extraireJetonDuSetCookie(rLoginRef9.setCookie)}`;

  const rMutationAvant = await requeteJson(PORT, 'createClient', {
    donneesClient: { raisonSociale: 'Ref9 avant reset', adresse: '9 rue Test', siret: '55566677788899' }
  }, { cookie: cookieRef9 });
  verifier('mutation avec la session REFERENT valide (avant reset) → pas 403',
    rMutationAvant.statut !== 403, JSON.stringify(rMutationAvant.corps));

  const rReinitNonAdmin = await requeteJson(PORT, 'reinitialiserMotDePasse',
    { id: adminAmorce?.id, nouveauMotDePasse: 'PeuImporte-123456' }, { cookie: cookieRef9 });
  verifier('reinitialiserMotDePasse par un non-ADMIN → 403',
    rReinitNonAdmin.statut === 403, JSON.stringify(rReinitNonAdmin.corps));

  const rReinit = await requeteJson(PORT, 'reinitialiserMotDePasse',
    { id: idRef9, nouveauMotDePasse: 'MotDePasseRef9-Nouveau' }, { cookie: cookieAdmin });
  verifier('reinitialiserMotDePasse en ADMIN → 200', rReinit.statut === 200,
    JSON.stringify(rReinit.corps));

  const rMutationApres = await requeteJson(PORT, 'createClient', {
    donneesClient: { raisonSociale: 'Ref9 apres reset', adresse: '9 rue Test', siret: '55566677788899' }
  }, { cookie: cookieRef9 });
  verifier('après reset, l’ancienne session REFERENT est révoquée (mutation → 403)',
    rMutationApres.statut === 403, JSON.stringify(rMutationApres.corps));

  const rAncienMdp = await requeteJson(PORT, 'connexion',
    { login: 'gestion.ref9', motDePasse: 'MotDePasseRef9-Ancien' });
  verifier('l’ancien mot de passe ne fonctionne plus après reset → 400',
    rAncienMdp.statut === 400, JSON.stringify(rAncienMdp.corps));

  const rNouveauMdp = await requeteJson(PORT, 'connexion',
    { login: 'gestion.ref9', motDePasse: 'MotDePasseRef9-Nouveau' });
  verifier('le nouveau mot de passe fonctionne après reset → 200',
    rNouveauMdp.statut === 200, JSON.stringify(rNouveauMdp.corps));

  // --- definirActivationCompte : désactivation bloque la connexion, réactivation la rétablit ---
  const rCreeAct9 = await requeteJson(PORT, 'creerCompte',
    { login: 'gestion.act9', motDePasseInitial: 'MotDePasseAct9', role: 'ENSEIGNANT' },
    { cookie: cookieAdmin });
  verifier('création ENSEIGNANT gestion.act9 (outillage) → 200',
    rCreeAct9.statut === 200, JSON.stringify(rCreeAct9.corps));
  const idAct9 = rCreeAct9.corps.resultat.id;

  const rDesactive = await requeteJson(PORT, 'definirActivationCompte',
    { id: idAct9, actif: false }, { cookie: cookieAdmin });
  verifier('définirActivationCompte (désactivation) en ADMIN → 200',
    rDesactive.statut === 200 && rDesactive.corps?.resultat?.actif === false,
    JSON.stringify(rDesactive.corps));

  const rLoginDesactive = await requeteJson(PORT, 'connexion',
    { login: 'gestion.act9', motDePasse: 'MotDePasseAct9' });
  verifier('un compte désactivé ne peut plus se connecter → 400',
    rLoginDesactive.statut === 400, JSON.stringify(rLoginDesactive.corps));

  const rReactive = await requeteJson(PORT, 'definirActivationCompte',
    { id: idAct9, actif: true }, { cookie: cookieAdmin });
  verifier('définirActivationCompte (réactivation) en ADMIN → 200',
    rReactive.statut === 200 && rReactive.corps?.resultat?.actif === true,
    JSON.stringify(rReactive.corps));

  const rLoginReactive = await requeteJson(PORT, 'connexion',
    { login: 'gestion.act9', motDePasse: 'MotDePasseAct9' });
  verifier('après réactivation, la connexion refonctionne → 200',
    rLoginReactive.statut === 200, JSON.stringify(rLoginReactive.corps));

  // --- Garde-fous ---
  const rAutoDesactivation = await requeteJson(PORT, 'definirActivationCompte',
    { id: adminAmorce?.id, actif: false }, { cookie: cookieAdmin });
  verifier('un ADMIN ne peut pas désactiver son PROPRE compte → 400',
    rAutoDesactivation.statut === 400, JSON.stringify(rAutoDesactivation.corps));

  const rActivSansSession = await requeteJson(PORT, 'definirActivationCompte',
    { id: idAct9, actif: false });
  verifier('définirActivationCompte sans session → 403',
    rActivSansSession.statut === 403, JSON.stringify(rActivSansSession.corps));
}

// ============================================================
// 10. P2-3 (reprise RC 8.1) : re-hachage transparent à la connexion.
//     Un compte encore haché à l'ANCIEN profil scrypt (N=2^15) doit pouvoir
//     se connecter, et son hash doit être RENFORCÉ (N=2^17) dans la même
//     transaction, avec trace au journal chaîné. Preuve : on rétrograde le
//     hash D'AUTORITÉ en SQL direct dans la base du serveur (WAL — écriture
//     concurrente entre deux requêtes), puis on observe le remplacement.
// ============================================================
{
  const CHEMIN_DB = join(DOSSIER, 'data', 'inerweb-fluide.db');
  const MDP_HERITE = 'MotDePasseHerite-2026';

  const rAdmin = await requeteJson(PORT, 'connexion',
    { login: 'admin.amorce', motDePasse: 'MotDePasseAdmin-Amorce-2026' });
  const cookieP23 = `iwf_session=${extraireJetonDuSetCookie(rAdmin.setCookie)}`;
  const rCree = await requeteJson(PORT, 'creerCompte',
    { login: 'herite.p23', motDePasseInitial: MDP_HERITE, role: 'ENSEIGNANT' },
    { cookie: cookieP23 });
  verifier('famille 10 : le compte témoin est créé (profil scrypt courant)',
    rCree.statut === 200, JSON.stringify(rCree.corps));

  // Rétrograder le hash à l'ancien profil, comme un compte d'avant P2-3.
  let idHerite = null;
  let hashHerite = null;
  {
    const bdd = new DatabaseSync(CHEMIN_DB);
    const ligne = bdd.prepare(
      `SELECT id, sel, hash_mot_de_passe FROM utilisateurs_app
       WHERE login = 'herite.p23'`).get();
    idHerite = ligne.id;
    hashHerite = comptes.deriverHashHerite(
      MDP_HERITE, Buffer.from(ligne.sel, 'hex')).toString('hex');
    verifier('le hash à l\'ancien profil DIFFÈRE du hash courant (sinon rien à prouver)',
      hashHerite !== ligne.hash_mot_de_passe);
    bdd.prepare(
      `UPDATE utilisateurs_app SET hash_mot_de_passe = ? WHERE id = ?`)
      .run(hashHerite, idHerite);
    bdd.close();
  }

  // Connexion : l'ancien profil est ACCEPTÉ (sans P2-3 ce serait un 400).
  const rHerite = await requeteJson(PORT, 'connexion',
    { login: 'herite.p23', motDePasse: MDP_HERITE });
  verifier('un compte haché à l\'ancien profil (N=2^15) se connecte encore → 200',
    rHerite.statut === 200, JSON.stringify(rHerite.corps));

  // Le hash a été REMPLACÉ par le profil courant + trace au journal.
  {
    const bdd = new DatabaseSync(CHEMIN_DB);
    const ligne = bdd.prepare(
      `SELECT sel, hash_mot_de_passe FROM utilisateurs_app WHERE id = ?`)
      .get(idHerite);
    verifier('après connexion, le hash hérité a été remplacé',
      ligne.hash_mot_de_passe !== hashHerite);
    const verdict = comptes.verifierMotDePasseDetail(
      MDP_HERITE, ligne.hash_mot_de_passe, ligne.sel);
    verifier('le nouveau hash relève du profil COURANT (N=2^17, plus de re-hachage requis)',
      verdict.valide === true && verdict.rehashageRequis === false,
      JSON.stringify(verdict));
    const trace = bdd.prepare(
      `SELECT COUNT(*) AS n FROM journal_audit
       WHERE action = 'RENFORCEMENT_HASH_MOT_DE_PASSE'`).get();
    verifier('le renforcement est tracé au journal chaîné (1 entrée)',
      trace.n === 1, `entrées : ${trace.n}`);
    bdd.close();
  }

  // Une connexion suivante ne re-hache PLUS (idempotence).
  const rSuivante = await requeteJson(PORT, 'connexion',
    { login: 'herite.p23', motDePasse: MDP_HERITE });
  verifier('la connexion suivante fonctionne toujours → 200',
    rSuivante.statut === 200, JSON.stringify(rSuivante.corps));
  {
    const bdd = new DatabaseSync(CHEMIN_DB);
    const trace = bdd.prepare(
      `SELECT COUNT(*) AS n FROM journal_audit
       WHERE action = 'RENFORCEMENT_HASH_MOT_DE_PASSE'`).get();
    verifier('aucun re-hachage superflu à la connexion suivante (toujours 1 entrée)',
      trace.n === 1, `entrées : ${trace.n}`);
    bdd.close();
  }
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
console.log('Routes de comptes (V9-E5, vague 3) : tout est vert.');
