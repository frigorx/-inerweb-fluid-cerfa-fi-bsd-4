// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — Comptes utilisateurs : hachage, vérification, verrouillage
 * (V9-E5, vague 1/2 « crypto comptes »).
 * ============================================================================
 * Ce module NE GÈRE PAS les sessions (jeton, cookie) — c'est la vague 2. Il
 * couvre uniquement :
 *   1) le hachage d'un mot de passe (scrypt + sel 16 octets, phrase NFC —
 *      MÊME patron que `deriverCle` de chiffrement.js, mêmes paramètres KDF) ;
 *   2) la vérification d'un mot de passe (comparaison EN TEMPS CONSTANT) ;
 *   3) la logique de verrouillage : 5 échecs consécutifs → verrou 15 minutes,
 *      compteur PAR COMPTE (jamais par IP), remis à zéro sur connexion
 *      réussie (règle posée pour V9-E5, non négociable). Depuis la 4e
 *      relecture externe (27/07/2026, corrigé le 13/08) : un verrou EXPIRÉ
 *      rouvre une fenêtre COMPLÈTE de 5 essais — le compteur repart de
 *      l'échec courant, sinon le premier essai raté après l'attente
 *      re-verrouillait immédiatement, à perpétuité (tiré) ;
 *   4) les mêmes dérivations en ASYNCHRONE (A14) : `crypto.scrypt` hors de
 *      la boucle d'événements, une dérivation À LA FOIS (file bornée) — un
 *      déluge de tentatives de connexion fait attendre LES CONNEXIONS,
 *      jamais le serveur entier ni sa mémoire (chaque scrypt N=2^17 pèse
 *      ~128 Mio : deux en parallèle suffisaient à doubler l'empreinte).
 *
 * Sécurité :
 *   - Sel ALÉATOIRE de 16 octets par compte (jamais réutilisé entre comptes).
 *   - `hash_mot_de_passe` et `sel` sont stockés en hexadécimal (colonnes TEXT
 *     de utilisateurs_app — cohérent avec le commentaire du schéma).
 *   - Comparaison du hash par `crypto.timingSafeEqual` (jamais `===` : une
 *     comparaison à court-circuit fuiterait la position du premier octet
 *     différent par mesure de temps).
 *   - Message d'échec de connexion UNIQUE, produit par l'appelant (routes) —
 *     ce module renvoie un verdict structuré, jamais un texte à afficher.
 *
 * Zéro dépendance externe (node:crypto natif).
 */

const crypto = require('node:crypto');
const db = require('./db.js');

// ------------------------------------------------------------
// Paramètres KDF (P2-3, reprise RC 8.1). Le profil courant suit le minimum
// scrypt OWASP : N=2^17, r=8, p=1 (environ 128 Mio). Le profil historique
// N=2^15 (celui de chiffrement.js:deriverCle, qui NE CHANGE PAS — les
// archives chiffrées existantes en dépendent) reste ici UNIQUEMENT pour
// vérifier un ancien compte, puis le re-hacher dès sa connexion réussie
// (migration transparente, cf. routes-comptes.js).
// ------------------------------------------------------------
const LONGUEUR_SEL = 16;
const LONGUEUR_CLE = 32; // 256 bits
const SCRYPT_N = 131072;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;
const SCRYPT_N_HERITE = 32768;
const SCRYPT_MAXMEM_HERITE = 128 * SCRYPT_N_HERITE * SCRYPT_R * 2;

/** Règles de verrouillage (V9-E5, arrêtées — ne pas re-débattre). */
const SEUIL_ECHECS = 5;
const DUREE_VERROU_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Dérive un hash de mot de passe (32 octets) à partir d'une phrase et d'un
 * sel, par scrypt aux paramètres figés (mêmes que chiffrement.js). Normalise
 * la phrase en NFC AVANT dérivation : une phrase accentuée saisie en NFD
 * (copier-coller, clavier différent) ne doit jamais produire un hash
 * différent de la même phrase saisie en NFC.
 * @param {string} motDePasse
 * @param {Buffer} sel - 16 octets
 * @returns {Buffer} hash de 32 octets
 */
function deriverHash(motDePasse, sel) {
  if (typeof motDePasse !== 'string' || motDePasse.length === 0) {
    throw new Error(
      'Mot de passe absent : impossible de dériver un hash sans phrase.');
  }
  if (!Buffer.isBuffer(sel) || sel.length !== LONGUEUR_SEL) {
    throw new Error(`Sel invalide (attendu ${LONGUEUR_SEL} octets).`);
  }
  return crypto.scryptSync(motDePasse.normalize('NFC'), sel, LONGUEUR_CLE, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM
  });
}

/** Ancien profil (N=2^15), réservé à la migration transparente des comptes existants. */
function deriverHashHerite(motDePasse, sel) {
  if (typeof motDePasse !== 'string' || motDePasse.length === 0) {
    throw new Error(
      'Mot de passe absent : impossible de dériver un hash sans phrase.');
  }
  if (!Buffer.isBuffer(sel) || sel.length !== LONGUEUR_SEL) {
    throw new Error(`Sel invalide (attendu ${LONGUEUR_SEL} octets).`);
  }
  return crypto.scryptSync(motDePasse.normalize('NFC'), sel, LONGUEUR_CLE, {
    N: SCRYPT_N_HERITE, r: SCRYPT_R, p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM_HERITE
  });
}

/**
 * Hache un mot de passe EN CLAIR pour la création/modification d'un compte :
 * tire un sel aléatoire frais (16 octets, jamais réutilisé), dérive le hash,
 * renvoie les deux en hexadécimal — le format prêt à écrire dans
 * `utilisateurs_app.hash_mot_de_passe` / `utilisateurs_app.sel`.
 * @param {string} motDePasse
 * @returns {{hash: string, sel: string}} hash et sel en hexadécimal
 */
function hacherMotDePasse(motDePasse) {
  const sel = crypto.randomBytes(LONGUEUR_SEL);
  const hash = deriverHash(motDePasse, sel);
  return { hash: hash.toString('hex'), sel: sel.toString('hex') };
}

/**
 * Vérifie qu'un mot de passe EN CLAIR correspond à un hash+sel stockés
 * (hexadécimal). Comparaison EN TEMPS CONSTANT (`timingSafeEqual`) — jamais
 * `===`, qui fuiterait la position du premier octet différent par mesure de
 * temps. Ne lève jamais sur une entrée invalide : renvoie `false` (un hash
 * ou sel corrompu en base ne doit pas planter la route de connexion).
 * Verdict détaillé : `valide` (le mot de passe correspond, profil courant OU
 * hérité) et `rehashageRequis` (correspondance obtenue via l'ANCIEN profil
 * N=2^15 → routes-comptes remplace le hash à la connexion réussie).
 * @param {string} motDePasse - mot de passe EN CLAIR à vérifier
 * @param {string} hashHex - hash stocké (hexadécimal)
 * @param {string} selHex - sel stocké (hexadécimal)
 * @returns {{valide: boolean, rehashageRequis: boolean}}
 */
function verifierMotDePasseDetail(motDePasse, hashHex, selHex) {
  if (typeof motDePasse !== 'string' || motDePasse.length === 0) {
    return { valide: false, rehashageRequis: false };
  }
  if (typeof hashHex !== 'string' || typeof selHex !== 'string') {
    return { valide: false, rehashageRequis: false };
  }
  try {
    if (!/^[0-9a-f]{64}$/i.test(hashHex) || !/^[0-9a-f]{32}$/i.test(selHex)) {
      return { valide: false, rehashageRequis: false };
    }
    const sel = Buffer.from(selHex, 'hex');
    const hashAttendu = Buffer.from(hashHex, 'hex');
    if (sel.length !== LONGUEUR_SEL || hashAttendu.length !== LONGUEUR_CLE) {
      return { valide: false, rehashageRequis: false };
    }
    const hashCourant = deriverHash(motDePasse, sel);
    // timingSafeEqual exige deux tampons de MÊME longueur (déjà garanti par
    // les contrôles ci-dessus : hashAttendu et hashCalcule font LONGUEUR_CLE).
    if (crypto.timingSafeEqual(hashCourant, hashAttendu)) {
      return { valide: true, rehashageRequis: false };
    }
    // Compatibilité : un ancien hash n'est accepté que via l'ancien profil.
    // Une réussite déclenche son remplacement atomique dans routes-comptes.
    const hashHerite = deriverHashHerite(motDePasse, sel);
    const valideHerite = crypto.timingSafeEqual(hashHerite, hashAttendu);
    return { valide: valideHerite, rehashageRequis: valideHerite };
  } catch {
    // Hex malformé, sel/hash tronqués en base... : échec de vérification,
    // jamais une exception qui remonterait à l'appelant de la route.
    return { valide: false, rehashageRequis: false };
  }
}

function verifierMotDePasse(motDePasse, hashHex, selHex) {
  const verdict = verifierMotDePasseDetail(motDePasse, hashHex, selHex);
  return Boolean(verdict && verdict.valide);
}

// ------------------------------------------------------------
// Dérivations ASYNCHRONES (A14) — le chemin des ROUTES de connexion.
// `crypto.scrypt` travaille dans le pool de threads de Node : la boucle
// d'événements reste libre pendant la dérivation. La file ci-dessous
// sérialise les dérivations (UNE à la fois) et se BORNE : au-delà, refus
// immédiat avec `.code = 503` — mieux vaut refuser une tentative que figer
// le serveur entier ou empiler des scrypt de 128 Mio chacun.
// Les versions synchrones ci-dessus RESTENT : CLI (creer-admin,
// secours-compte), leurre dérivé au chargement du module, tests ciblés.
// ------------------------------------------------------------

/** Dérivations simultanées admises (au-delà : file d'attente). */
const CONCURRENCE_SCRYPT = 1;
/** Tentatives en attente admises (au-delà : refus 503, jamais un gel). */
const FILE_SCRYPT_MAX = 64;

let scryptActifs = 0;
const fileScrypt = [];

/** Joue la prochaine dérivation en attente si un créneau est libre. */
function jouerScryptSuivant() {
  if (scryptActifs >= CONCURRENCE_SCRYPT) return;
  const tache = fileScrypt.shift();
  if (!tache) return;
  scryptActifs += 1;
  crypto.scrypt(tache.phrase, tache.sel, LONGUEUR_CLE, tache.options,
    (erreur, cle) => {
      scryptActifs -= 1;
      if (erreur) tache.rejeter(erreur);
      else tache.resoudre(cle);
      jouerScryptSuivant();
    });
}

/**
 * Même dérivation que `deriverHash` (mêmes contrôles, mêmes paramètres),
 * mais asynchrone et SÉRIALISÉE par la file bornée ci-dessus.
 * @param {string} motDePasse
 * @param {Buffer} sel - 16 octets
 * @param {{herite?: boolean}} [options] - `herite` = ancien profil N=2^15
 * @returns {Promise<Buffer>} hash de 32 octets
 */
function deriverHashAsync(motDePasse, sel, { herite = false } = {}) {
  if (typeof motDePasse !== 'string' || motDePasse.length === 0) {
    return Promise.reject(new Error(
      'Mot de passe absent : impossible de dériver un hash sans phrase.'));
  }
  if (!Buffer.isBuffer(sel) || sel.length !== LONGUEUR_SEL) {
    return Promise.reject(
      new Error(`Sel invalide (attendu ${LONGUEUR_SEL} octets).`));
  }
  if (fileScrypt.length >= FILE_SCRYPT_MAX) {
    const erreur = new Error(
      'Trop de tentatives de connexion en attente : réessayez dans un instant.');
    erreur.code = 503;
    return Promise.reject(erreur);
  }
  const options = herite
    ? { N: SCRYPT_N_HERITE, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM_HERITE }
    : { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM };
  return new Promise((resoudre, rejeter) => {
    fileScrypt.push({
      phrase: motDePasse.normalize('NFC'), sel, options, resoudre, rejeter,
    });
    jouerScryptSuivant();
  });
}

/**
 * Verdict identique à `verifierMotDePasseDetail` (mêmes contrôles, même
 * sémantique profil courant puis hérité, mêmes replis silencieux), obtenu
 * sans bloquer la boucle d'événements. SEULE exception au « ne lève
 * jamais » : le refus de charge (`.code = 503`) de la file pleine est
 * PROPAGÉ — le confondre avec « mot de passe faux » enregistrerait un
 * échec que personne n'a commis.
 * @param {string} motDePasse
 * @param {string} hashHex
 * @param {string} selHex
 * @returns {Promise<{valide: boolean, rehashageRequis: boolean}>}
 */
async function verifierMotDePasseDetailAsync(motDePasse, hashHex, selHex) {
  if (typeof motDePasse !== 'string' || motDePasse.length === 0) {
    return { valide: false, rehashageRequis: false };
  }
  if (typeof hashHex !== 'string' || typeof selHex !== 'string') {
    return { valide: false, rehashageRequis: false };
  }
  try {
    if (!/^[0-9a-f]{64}$/i.test(hashHex) || !/^[0-9a-f]{32}$/i.test(selHex)) {
      return { valide: false, rehashageRequis: false };
    }
    const sel = Buffer.from(selHex, 'hex');
    const hashAttendu = Buffer.from(hashHex, 'hex');
    if (sel.length !== LONGUEUR_SEL || hashAttendu.length !== LONGUEUR_CLE) {
      return { valide: false, rehashageRequis: false };
    }
    const hashCourant = await deriverHashAsync(motDePasse, sel);
    if (crypto.timingSafeEqual(hashCourant, hashAttendu)) {
      return { valide: true, rehashageRequis: false };
    }
    const hashHerite = await deriverHashAsync(motDePasse, sel, { herite: true });
    const valideHerite = crypto.timingSafeEqual(hashHerite, hashAttendu);
    return { valide: valideHerite, rehashageRequis: valideHerite };
  } catch (erreur) {
    if (erreur && erreur.code === 503) throw erreur;
    return { valide: false, rehashageRequis: false };
  }
}

/** Forme booléenne de la vérification asynchrone (leurre de la route). */
async function verifierMotDePasseAsync(motDePasse, hashHex, selHex) {
  const verdict = await verifierMotDePasseDetailAsync(
    motDePasse, hashHex, selHex);
  return Boolean(verdict && verdict.valide);
}

/**
 * Même geste que `hacherMotDePasse` (sel frais + dérivation), sans bloquer
 * la boucle d'événements — chemin du re-hachage transparent à la connexion.
 * @param {string} motDePasse
 * @returns {Promise<{hash: string, sel: string}>}
 */
async function hacherMotDePasseAsync(motDePasse) {
  const sel = crypto.randomBytes(LONGUEUR_SEL);
  const hash = await deriverHashAsync(motDePasse, sel);
  return { hash: hash.toString('hex'), sel: sel.toString('hex') };
}

// ------------------------------------------------------------
// Verrouillage après échecs — compteur PAR COMPTE (jamais par IP).
// ------------------------------------------------------------

/**
 * Vrai si le compte est ACTUELLEMENT verrouillé (verrouille_jusqua dans le
 * futur). Un `verrouille_jusqua` passé n'est PAS un verrou actif : le compte
 * redevient utilisable au prochain essai (la remise à zéro du compteur
 * n'intervient qu'à la connexion RÉUSSIE, cf. `reinitialiserEchecs`).
 * @param {{verrouille_jusqua?: string|null}} compte - ligne utilisateurs_app
 * @param {Date} [maintenant]
 * @returns {boolean}
 */
function estVerrouille(compte, maintenant = new Date()) {
  if (!compte || !compte.verrouille_jusqua) return false;
  const echeance = new Date(compte.verrouille_jusqua);
  if (Number.isNaN(echeance.getTime())) return false;
  return echeance.getTime() > maintenant.getTime();
}

/**
 * Enregistre un ÉCHEC de connexion pour un compte : incrémente
 * `echecs_consecutifs` ; au SEUIL_ECHECS (5e échec inclus), pose
 * `verrouille_jusqua` = maintenant + 15 minutes. Le compteur continue de
 * monter au-delà du seuil (rejouer le verrou à chaque nouvel essai pendant
 * qu'il est actif) — l'appelant (route de connexion) doit de toute façon
 * refuser AVANT d'appeler ceci si `estVerrouille` est déjà vrai.
 *
 * ⚠ Verrou EXPIRÉ = fenêtre NOUVELLE (4e relecture externe, tiré) : si un
 * verrou avait été posé et que son échéance est passée, l'échec courant
 * COMPTE POUR UN, il ne s'ajoute pas aux 5 d'avant. Sans cela, le compteur
 * restait ≥ 5 pour toujours : chaque essai raté re-verrouillait 15 minutes,
 * et le titulaire légitime — y compris le SEUL ADMIN du poste — n'avait
 * plus jamais droit qu'à un essai par quart d'heure.
 * @param {string} utilisateurId
 * @param {Date} [maintenant]
 * @returns {{echecs: number, verrouilleJusqua: string|null}} nouvel état
 */
function enregistrerEchec(utilisateurId, maintenant = new Date()) {
  return db.transaction((bdd) => {
    const compte = bdd.prepare(
      `SELECT echecs_consecutifs, verrouille_jusqua
       FROM utilisateurs_app WHERE id = ?`)
      .get(utilisateurId);
    if (!compte) {
      throw new Error(
        `Compte introuvable (id ${utilisateurId}) : échec non enregistré.`);
    }
    const verrouExpire = Boolean(compte.verrouille_jusqua)
      && !estVerrouille(compte, maintenant);
    const echecs = verrouExpire ? 1 : (compte.echecs_consecutifs ?? 0) + 1;
    const verrouilleJusqua = echecs >= SEUIL_ECHECS
      ? new Date(maintenant.getTime() + DUREE_VERROU_MS).toISOString()
      : null;
    bdd.prepare(
      `UPDATE utilisateurs_app
       SET echecs_consecutifs = ?, verrouille_jusqua = ?
       WHERE id = ?`)
      .run(echecs, verrouilleJusqua, utilisateurId);
    return { echecs, verrouilleJusqua };
  });
}

/**
 * Remet à zéro le compteur d'échecs et lève le verrou d'un compte — appelé
 * sur une connexion RÉUSSIE (règle V9-E5 : le compteur ne se remet à zéro
 * QUE sur succès, jamais par simple écoulement du temps).
 * @param {string} utilisateurId
 */
function reinitialiserEchecs(utilisateurId) {
  db.run(
    `UPDATE utilisateurs_app
     SET echecs_consecutifs = 0, verrouille_jusqua = NULL
     WHERE id = ?`,
    [utilisateurId]);
}

module.exports = {
  SEUIL_ECHECS,
  DUREE_VERROU_MS,
  hacherMotDePasse,
  hacherMotDePasseAsync,
  verifierMotDePasse,
  verifierMotDePasseDetail,
  verifierMotDePasseAsync,
  verifierMotDePasseDetailAsync,
  estVerrouille,
  enregistrerEchec,
  reinitialiserEchecs,
  // Exposé pour tests ciblés (dérivation déterministe à sel fixé).
  deriverHash,
  deriverHashHerite,
  deriverHashAsync,
  LONGUEUR_SEL,
  SCRYPT_N,
};
