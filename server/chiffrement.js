// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — Chiffrement des sauvegardes « coffre-fort » (V9-E4.2).
 * ======================================================================
 * AES-256-GCM + scrypt, EN NODE NATIF (`node:crypto`), ZÉRO dépendance externe
 * (VISION §4.5). Enveloppe un ZIP de sauvegarde (produit par sauvegarde.js) en
 * un fichier « .zip.chiffre » qu'un octet modifié ou une phrase fausse suffit
 * à faire REJETER (pas de bouillie silencieuse : le tag GCM authentifie).
 *
 * FORMAT DE L'ENVELOPPE (binaire, dans l'ordre) — le manifeste EST EN CLAIR EN
 * TÊTE (VISION §4.5 : « inventorier sans la phrase ») :
 *   [magic]        14 octets  : « IWF-CHIFFRE-1\n » (repère + version format)
 *   [lgManifeste]   4 octets  : longueur du JSON du manifeste (u32 BE)
 *   [manifeste]     N octets  : manifeste JSON UTF-8 EN CLAIR (chiffrement.actif
 *                               = true, algorithme, kdf + params, indice)
 *   [sel]          16 octets  : sel scrypt (aléatoire)
 *   [iv]           12 octets  : IV GCM (aléatoire, jamais réutilisé — nouveau
 *                               sel+IV à chaque chiffrement)
 *   [tag]          16 octets  : tag d'authentification GCM
 *   [ciphertext]    …         : le ZIP chiffré (AES-256-GCM)
 *
 * Le manifeste en clair est AUTHENTIFIÉ comme DONNÉE ADDITIONNELLE (AAD) du
 * GCM : le modifier fait échouer le déchiffrement (on ne peut pas mentir sur
 * les compteurs affichés sans casser le tag). L'AAD est le manifeste JSON tel
 * qu'il figure dans l'enveloppe (octets exacts), pas une re-sérialisation.
 *
 * DÉRIVATION : scrypt(phrase, sel, 32, { N: 32768, r: 8, p: 1 }) → clé 256
 * bits, paramètres FIGÉS par la VISION §4.5 (et déjà inscrits dans le manifeste
 * clair via manifeste.js:chiffrementParDefaut, kdfParams). maxmem est relevé :
 * N=32768, r=8 demande ~64 Mio, au-dessus du défaut 32 Mio de Node.
 *
 * RE-DÉCHIFFREMENT DE VÉRIFICATION (parade « phrase perdue = données perdues »,
 * VISION §4.5 a) : `chiffrer()` re-déchiffre en mémoire l'enveloppe qu'il vient
 * de produire et compare BIT-POUR-BIT au ZIP source ; si ça ne repasse pas, il
 * LÈVE — jamais annoncer « OK » sur un chiffré non ré-ouvrable.
 *
 * Zéro dépendance externe.
 */

const crypto = require('node:crypto');

// ------------------------------------------------------------
// Constantes du format (figées — un changement = nouveau magic/version).
// ------------------------------------------------------------

/** Repère + version du format d'enveloppe (14 octets, retour ligne final). */
const MAGIC = Buffer.from('IWF-CHIFFRE-1\n', 'utf8');

/** Longueurs binaires (octets). */
const LONGUEUR_LG_MANIFESTE = 4; // u32 big-endian
const LONGUEUR_SEL = 16;
const LONGUEUR_IV = 12;
const LONGUEUR_TAG = 16;
const LONGUEUR_CLE = 32; // 256 bits

/** Algorithme et paramètres KDF (miroir de manifeste.js — figés VISION §4.5). */
const ALGORITHME = 'aes-256-gcm';
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

/**
 * maxmem pour scrypt : coût mémoire ≈ 128 · N · r octets (~64 Mio ici), au-delà
 * du plafond par défaut de Node (32 Mio). On laisse une marge (×2) pour ne
 * jamais buter sur « memory limit exceeded » avec ces paramètres figés.
 */
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;

// ------------------------------------------------------------
// Dérivation de clé.
// ------------------------------------------------------------

/**
 * Dérive une clé AES-256 (32 octets) d'une phrase et d'un sel, par scrypt aux
 * paramètres figés de la VISION §4.5 (N=32768, r=8, p=1). Synchrone (on est
 * dans une séquence de sauvegarde/restauration synchrone ; DatabaseSync l'est
 * aussi). Une phrase vide est refusée : chiffrer sans phrase n'a pas de sens.
 * @param {string} phrase - phrase secrète
 * @param {Buffer} sel - sel (16 octets)
 * @returns {Buffer} clé de 32 octets
 */
function deriverCle(phrase, sel) {
  if (typeof phrase !== 'string' || phrase.length === 0) {
    throw new Error(
      'Phrase de chiffrement absente : impossible de dériver une clé sans phrase.');
  }
  if (!Buffer.isBuffer(sel) || sel.length !== LONGUEUR_SEL) {
    throw new Error(
      `Sel de dérivation invalide (attendu ${LONGUEUR_SEL} octets).`);
  }
  // Normalisation Unicode NFC (revue crypto E4.2) : une phrase française
  // accentuée saisie en NFC au chiffrement puis fournie en NFD à la
  // restauration (copier-coller macOS, gestionnaire de mots de passe) a des
  // octets DIFFÉRENTS sans normalisation → clé différente → sauvegarde
  // irrécupérable malgré la « bonne » phrase. NFC lève cette ambiguïté.
  return crypto.scryptSync(phrase.normalize('NFC'), sel, LONGUEUR_CLE, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM
  });
}

// ------------------------------------------------------------
// Test de reconnaissance d'enveloppe.
// ------------------------------------------------------------

/**
 * Vrai si `octets` commence par le magic d'une enveloppe chiffrée inerWeb
 * Fluide. Sert à distinguer un « .zip.chiffre » d'un « .zip » clair sans se
 * fier à la seule extension (magic = vérité). Tolère un tampon plus court que
 * le magic (renvoie faux, jamais d'exception).
 * @param {Buffer} octets
 * @returns {boolean}
 */
function estEnveloppeChiffree(octets) {
  if (!Buffer.isBuffer(octets) || octets.length < MAGIC.length) return false;
  return octets.subarray(0, MAGIC.length).equals(MAGIC);
}

// ------------------------------------------------------------
// Lecture de l'en-tête clair (magic + manifeste), SANS la phrase.
// ------------------------------------------------------------

/**
 * Décompose l'en-tête clair d'une enveloppe : vérifie le magic, lit la
 * longueur du manifeste puis découpe les segments. Renvoie les octets EXACTS
 * du manifeste (pour l'AAD) et les offsets des blocs cryptographiques. Lève un
 * message CLAIR (« ce fichier n'est pas … ») sur tout ce qui ne colle pas —
 * jamais un RangeError brut de Node.
 * @param {Buffer} enveloppe
 * @returns {{manifesteOctets: Buffer, sel: Buffer, iv: Buffer, tag: Buffer,
 *            ciphertext: Buffer}}
 */
function decomposer(enveloppe) {
  if (!Buffer.isBuffer(enveloppe)) {
    throw new Error('Enveloppe chiffrée illisible (octets attendus).');
  }
  if (!estEnveloppeChiffree(enveloppe)) {
    throw new Error(
      'Ce fichier n\'est pas une sauvegarde chiffrée inerWeb Fluide ' +
      '(en-tête « IWF-CHIFFRE-1 » absent).');
  }
  let curseur = MAGIC.length;

  // Longueur du manifeste (u32 BE).
  if (curseur + LONGUEUR_LG_MANIFESTE > enveloppe.length) {
    throw new Error(
      'Enveloppe chiffrée tronquée : longueur du manifeste absente.');
  }
  const lgManifeste = enveloppe.readUInt32BE(curseur);
  curseur += LONGUEUR_LG_MANIFESTE;

  // Manifeste JSON en clair.
  if (curseur + lgManifeste > enveloppe.length) {
    throw new Error(
      'Enveloppe chiffrée tronquée : manifeste en clair incomplet ' +
      `(annoncé ${lgManifeste} octets).`);
  }
  const manifesteOctets = enveloppe.subarray(curseur, curseur + lgManifeste);
  curseur += lgManifeste;

  // Sel + IV + tag.
  const finBlocs = curseur + LONGUEUR_SEL + LONGUEUR_IV + LONGUEUR_TAG;
  if (finBlocs > enveloppe.length) {
    throw new Error(
      'Enveloppe chiffrée tronquée : sel/IV/tag incomplets.');
  }
  const sel = enveloppe.subarray(curseur, curseur + LONGUEUR_SEL);
  curseur += LONGUEUR_SEL;
  const iv = enveloppe.subarray(curseur, curseur + LONGUEUR_IV);
  curseur += LONGUEUR_IV;
  const tag = enveloppe.subarray(curseur, curseur + LONGUEUR_TAG);
  curseur += LONGUEUR_TAG;

  // Ciphertext = tout le reste (peut être vide si le ZIP source l'était).
  const ciphertext = enveloppe.subarray(curseur);

  return { manifesteOctets, sel, iv, tag, ciphertext };
}

/**
 * Lit le manifeste EN CLAIR en tête d'une enveloppe chiffrée, SANS la phrase
 * (VISION §4.5 : inventorier sans ouvrir). Renvoie l'objet désérialisé. Sert à
 * listerSauvegardes pour un « .zip.chiffre » (compteurs, horodatage, type,
 * indice visibles). NE déchiffre RIEN.
 * @param {Buffer} enveloppe
 * @returns {object} manifeste (objet JSON)
 */
function lireManifesteClair(enveloppe) {
  const { manifesteOctets } = decomposer(enveloppe);
  try {
    return JSON.parse(manifesteOctets.toString('utf8'));
  } catch (erreur) {
    throw new Error(
      'Manifeste en clair de l\'enveloppe chiffrée illisible (JSON invalide) : ' +
      erreur.message);
  }
}

// ------------------------------------------------------------
// Chiffrement.
// ------------------------------------------------------------

/**
 * Chiffre un ZIP de sauvegarde en une enveloppe binaire (cf. FORMAT ci-dessus).
 * Le `manifesteClair` est sérialisé EN CLAIR en tête ET utilisé comme AAD du
 * GCM (le modifier casse le tag). Un sel et un IV ALÉATOIRES FRAIS sont tirés à
 * chaque appel (jamais de réutilisation d'IV avec la même clé).
 *
 * PARADE « phrase perdue = données perdues » (VISION §4.5 a) : après avoir
 * produit l'enveloppe, on la RE-DÉCHIFFRE en mémoire avec la MÊME phrase et on
 * compare BIT-POUR-BIT au ZIP source ; toute divergence LÈVE — on n'annonce
 * jamais « OK » sur un chiffré qu'on n'a pas prouvé ré-ouvrable.
 *
 * @param {Buffer} octetsZip - le ZIP de sauvegarde à chiffrer (peut être vide)
 * @param {string} phrase - phrase secrète (non vide)
 * @param {object} manifesteClair - manifeste (chiffrement.actif doit être true)
 * @param {object} [crochets] - injections de TEST (jamais en prod)
 * @param {(env: Buffer, phrase: string) => Buffer} [crochets._reDechiffrer] -
 *        remplace le déchiffreur de vérification (éprouve la parade
 *        phrase-perdue : un rendu non conforme ou une exception doit LEVER)
 * @returns {Buffer} enveloppe chiffrée complète
 */
function chiffrer(octetsZip, phrase, manifesteClair, crochets = {}) {
  if (!Buffer.isBuffer(octetsZip)) {
    throw new Error('chiffrer : le ZIP source doit être un Buffer.');
  }
  if (typeof phrase !== 'string' || phrase.length === 0) {
    throw new Error(
      'Chiffrement impossible : aucune phrase fournie. Une sauvegarde ' +
      'chiffrée exige une phrase (sans elle, rien à protéger ni à rouvrir).');
  }
  if (!manifesteClair || typeof manifesteClair !== 'object') {
    throw new Error('chiffrer : manifeste en clair absent ou invalide.');
  }

  // Manifeste en clair figé en octets (sert de tête ET d'AAD — mêmes octets).
  const manifesteOctets = Buffer.from(
    JSON.stringify(manifesteClair, null, 2), 'utf8');
  const lgManifeste = Buffer.allocUnsafe(LONGUEUR_LG_MANIFESTE);
  lgManifeste.writeUInt32BE(manifesteOctets.length, 0);

  // Sel + IV aléatoires FRAIS (jamais réutilisés).
  const sel = crypto.randomBytes(LONGUEUR_SEL);
  const iv = crypto.randomBytes(LONGUEUR_IV);
  const cle = deriverCle(phrase, sel);

  const chiffreur = crypto.createCipheriv(ALGORITHME, cle, iv, {
    authTagLength: LONGUEUR_TAG
  });
  // Le manifeste clair est AUTHENTIFIÉ (AAD) : le trafiquer casse le tag.
  chiffreur.setAAD(manifesteOctets);
  const ciphertext = Buffer.concat([
    chiffreur.update(octetsZip), chiffreur.final()
  ]);
  const tag = chiffreur.getAuthTag();

  const enveloppe = Buffer.concat([
    MAGIC, lgManifeste, manifesteOctets, sel, iv, tag, ciphertext
  ]);

  // ---- RE-DÉCHIFFREMENT DE VÉRIFICATION (parade phrase-perdue) ----
  // On rouvre l'enveloppe qu'on vient de produire, avec la MÊME phrase, et on
  // exige le ZIP source bit-pour-bit. Si ça ne repasse pas, on LÈVE : jamais
  // annoncer « OK » sur un chiffré non ré-ouvrable.
  // Le déchiffreur de vérification est indirectable pour les TESTS (crochet
  // _reDechiffrer, jamais fourni en prod) — même patron que restauration.js.
  const reDechiffrer = crochets._reDechiffrer ?? dechiffrer;
  let reouvert;
  try {
    reouvert = reDechiffrer(enveloppe, phrase);
  } catch (erreur) {
    throw new Error(
      'Chiffrement ABANDONNÉ : la sauvegarde chiffrée produite ne se ' +
      're-déchiffre pas avec la phrase fournie (' + erreur.message + '). ' +
      'Aucune sauvegarde chiffrée non ré-ouvrable ne sera écrite.');
  }
  if (!Buffer.isBuffer(reouvert) || !reouvert.equals(octetsZip)) {
    throw new Error(
      'Chiffrement ABANDONNÉ : le contenu re-déchiffré ne correspond pas ' +
      'bit-pour-bit au ZIP source. Aucune sauvegarde chiffrée douteuse ne ' +
      'sera écrite (parade « phrase perdue = données perdues »).');
  }

  return enveloppe;
}

// ------------------------------------------------------------
// Déchiffrement.
// ------------------------------------------------------------

/**
 * Déchiffre une enveloppe et renvoie le ZIP d'origine. Dérive la clé (scrypt
 * sur le sel de l'enveloppe), pose le tag GCM et le manifeste clair comme AAD,
 * puis `final()` : si le tag ne colle pas (phrase FAUSSE ou octet MODIFIÉ dans
 * le ciphertext, le tag OU le manifeste-AAD), `final()` LÈVE et on renvoie un
 * message CLAIR « Phrase incorrecte ou sauvegarde altérée » — jamais de
 * bouillie déchiffrée (VISION §4.5).
 * @param {Buffer} enveloppe
 * @param {string} phrase
 * @returns {Buffer} octets du ZIP d'origine
 */
function dechiffrer(enveloppe, phrase) {
  if (typeof phrase !== 'string' || phrase.length === 0) {
    throw new Error(
      'Déchiffrement impossible : aucune phrase fournie.');
  }
  const { manifesteOctets, sel, iv, tag, ciphertext } = decomposer(enveloppe);
  const cle = deriverCle(phrase, sel);

  const dechiffreur = crypto.createDecipheriv(ALGORITHME, cle, iv, {
    authTagLength: LONGUEUR_TAG
  });
  dechiffreur.setAAD(manifesteOctets);
  dechiffreur.setAuthTag(tag);
  try {
    return Buffer.concat([
      dechiffreur.update(ciphertext), dechiffreur.final()
    ]);
  } catch {
    // final() lève si le tag GCM ne vérifie pas : phrase fausse OU altération
    // (ciphertext, tag ou manifeste-AAD). On ne distingue pas les deux (c'est
    // la propriété du GCM) : message unique et clair, aucune donnée rendue.
    throw new Error('Phrase incorrecte ou sauvegarde altérée.');
  }
}

module.exports = {
  MAGIC,
  deriverCle,
  chiffrer,
  dechiffrer,
  lireManifesteClair,
  estEnveloppeChiffree,
  // Exposés pour tests ciblés / branchement.
  decomposer,
  LONGUEUR_SEL,
  LONGUEUR_IV,
  LONGUEUR_TAG
};
