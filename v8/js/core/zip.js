// ============================================================
// inerWeb Fluide v8 — création de fichiers ZIP (Phase D, dossier d'audit)
// ZIP « stored » (sans compression) écrit en JS pur, zéro dépendance externe.
// Format : en-têtes locaux + répertoire central + fin de répertoire central
// (EOCD), CRC-32 par entrée, noms de fichiers en UTF-8 (bit 11 du flag
// général posé), dates DOS. Interopérable avec tout lecteur ZIP standard
// (Explorateur Windows, 7-Zip, module zipfile de Python, unzip…).
// Module ES + Node (CommonJS non requis : les tests utilisent des imports ES).
// ============================================================

/** Signatures binaires des trois structures du format ZIP. */
const SIGNATURE_ENTETE_LOCAL = 0x04034b50;
const SIGNATURE_ENTETE_CENTRAL = 0x02014b50;
const SIGNATURE_FIN_REPERTOIRE = 0x06054b50;

/** Méthode de compression 0 = « stored » (aucune compression). */
const METHODE_STOCKEE = 0;

/** Bit 11 du flag général de bits : noms de fichiers et commentaires en UTF-8. */
const BIT_UTF8 = 0x0800;

/** Version minimale nécessaire pour extraire (2.0 = fonctionnalités de base). */
const VERSION_NECESSAIRE = 20;

/** Version « faite par » (host Unix 3 << 8, en pratique peu vérifié à la lecture). */
const VERSION_FAITE_PAR = 20;

// ------------------------------------------------------------
// CRC-32 (table calculée une seule fois au chargement du module)
// ------------------------------------------------------------

/** Table des 256 restes de division polynomiale utilisée par le CRC-32 (IEEE 802.3). */
const TABLE_CRC32 = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/**
 * Calcule le CRC-32 (IEEE 802.3, celui utilisé par le format ZIP) d'un octet-tableau.
 * @param {Uint8Array} octets - contenu binaire à hacher
 * @returns {number} CRC-32 non signé (0 à 0xFFFFFFFF)
 */
export function crc32(octets) {
  let crc = 0xffffffff;
  for (let i = 0; i < octets.length; i += 1) {
    crc = TABLE_CRC32[(crc ^ octets[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ------------------------------------------------------------
// Conversions bas niveau (dates DOS, UTF-8, écriture little-endian)
// ------------------------------------------------------------

/**
 * Convertit une date JavaScript en date/heure DOS (format 16+16 bits utilisé
 * par le ZIP). L'époque DOS démarre en 1980 ; toute date antérieure est
 * ramenée au minimum représentable pour rester dans un ZIP valide.
 * @param {Date} date - date à convertir (heure locale)
 * @returns {{dateDos: number, heureDos: number}}
 */
function versDateDos(date) {
  const annee = Math.max(date.getFullYear(), 1980);
  const dateDos =
    (((annee - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  const heureDos =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2)) & 0x1f);
  return { dateDos: dateDos & 0xffff, heureDos: heureDos & 0xffff };
}

/**
 * Encode une chaîne en octets UTF-8.
 * @param {string} texte
 * @returns {Uint8Array}
 */
function encoderUtf8(texte) {
  return new TextEncoder().encode(texte);
}

/**
 * Convertit le contenu d'une entrée (string ou Uint8Array) en Uint8Array.
 * Les Blob ne sont volontairement pas acceptés ici : l'appelant doit les
 * convertir en amont (arrayBuffer) pour que ce module reste synchrone et
 * testable tel quel sous Node.
 * @param {string|Uint8Array} contenu
 * @returns {Uint8Array}
 */
function versOctets(contenu) {
  if (typeof contenu === 'string') return encoderUtf8(contenu);
  if (contenu instanceof Uint8Array) return contenu;
  throw new TypeError(
    'creerZip : le contenu d\'une entrée doit être une chaîne ou un Uint8Array ' +
    '(convertir un Blob en Uint8Array via arrayBuffer() avant appel).'
  );
}

/** Petit assembleur d'octets à taille dynamique (évite de recalculer les offsets à la main). */
class TamponOctets {
  constructor() {
    /** @type {number[]} */
    this.morceaux = [];
    this.taille = 0;
  }

  /** @param {Uint8Array} octets */
  ajouter(octets) {
    this.morceaux.push(octets);
    this.taille += octets.length;
  }

  /** @param {number} valeur - entier non signé 16 bits, little-endian */
  ajouterU16(valeur) {
    const o = new Uint8Array(2);
    new DataView(o.buffer).setUint16(0, valeur & 0xffff, true);
    this.ajouter(o);
  }

  /** @param {number} valeur - entier non signé 32 bits, little-endian */
  ajouterU32(valeur) {
    const o = new Uint8Array(4);
    new DataView(o.buffer).setUint32(0, valeur >>> 0, true);
    this.ajouter(o);
  }

  /** @returns {Uint8Array} concaténation de tous les morceaux ajoutés */
  concatener() {
    const resultat = new Uint8Array(this.taille);
    let decalage = 0;
    for (const morceau of this.morceaux) {
      resultat.set(morceau, decalage);
      decalage += morceau.length;
    }
    return resultat;
  }
}

// ------------------------------------------------------------
// Construction du ZIP
// ------------------------------------------------------------

/**
 * @typedef {object} EntreeZip
 * @property {string} nom - chemin/nom de fichier dans l'archive (accents permis, UTF-8)
 * @property {string|Uint8Array} contenu - contenu binaire ou texte de l'entrée
 */

/**
 * Construit un fichier ZIP « stored » (sans compression) à partir d'une liste
 * d'entrées, et retourne directement les octets bruts. C'est la fonction de
 * base testable sous Node (aucune dépendance à `Blob`).
 * @param {EntreeZip[]} entrees - fichiers à inclure (peut être vide → ZIP valide à 0 entrée)
 * @param {Date} [horodatage] - date appliquée à toutes les entrées (défaut : maintenant)
 * @returns {Uint8Array} octets du fichier ZIP complet
 */
export function creerZipOctets(entrees, horodatage = new Date()) {
  const { dateDos, heureDos } = versDateDos(horodatage);
  const corps = new TamponOctets();
  const repertoireCentral = new TamponOctets();

  // Décalage (depuis le début de l'archive) de chaque en-tête local, nécessaire
  // au répertoire central pour pointer vers son entrée locale correspondante.
  const decalagesLocaux = [];

  for (const entree of entrees) {
    const nomOctets = encoderUtf8(entree.nom);
    const contenuOctets = versOctets(entree.contenu);
    const crc = crc32(contenuOctets);
    const taille = contenuOctets.length;

    decalagesLocaux.push(corps.taille);

    // --- En-tête local ---
    corps.ajouterU32(SIGNATURE_ENTETE_LOCAL);
    corps.ajouterU16(VERSION_NECESSAIRE);
    corps.ajouterU16(BIT_UTF8);
    corps.ajouterU16(METHODE_STOCKEE);
    corps.ajouterU16(heureDos);
    corps.ajouterU16(dateDos);
    corps.ajouterU32(crc);
    corps.ajouterU32(taille); // taille compressée = taille réelle (stored)
    corps.ajouterU32(taille); // taille non compressée
    corps.ajouterU16(nomOctets.length);
    corps.ajouterU16(0); // pas de champ « extra »
    corps.ajouter(nomOctets);
    corps.ajouter(contenuOctets);

    // --- En-tête central (répertoire, écrit après tous les corps) ---
    repertoireCentral.ajouterU32(SIGNATURE_ENTETE_CENTRAL);
    repertoireCentral.ajouterU16(VERSION_FAITE_PAR);
    repertoireCentral.ajouterU16(VERSION_NECESSAIRE);
    repertoireCentral.ajouterU16(BIT_UTF8);
    repertoireCentral.ajouterU16(METHODE_STOCKEE);
    repertoireCentral.ajouterU16(heureDos);
    repertoireCentral.ajouterU16(dateDos);
    repertoireCentral.ajouterU32(crc);
    repertoireCentral.ajouterU32(taille);
    repertoireCentral.ajouterU32(taille);
    repertoireCentral.ajouterU16(nomOctets.length);
    repertoireCentral.ajouterU16(0); // extra
    repertoireCentral.ajouterU16(0); // commentaire de fichier
    repertoireCentral.ajouterU16(0); // n° de disque de début
    repertoireCentral.ajouterU16(0); // attributs internes
    repertoireCentral.ajouterU32(0); // attributs externes (droits Unix non renseignés)
    repertoireCentral.ajouterU32(decalagesLocaux[decalagesLocaux.length - 1]);
    repertoireCentral.ajouter(nomOctets);
  }

  const decalageRepertoireCentral = corps.taille;
  const tailleRepertoireCentral = repertoireCentral.taille;

  // --- Fin de répertoire central (EOCD) ---
  const eocd = new TamponOctets();
  eocd.ajouterU32(SIGNATURE_FIN_REPERTOIRE);
  eocd.ajouterU16(0); // n° de ce disque
  eocd.ajouterU16(0); // disque où commence le répertoire central
  eocd.ajouterU16(entrees.length); // nb d'entrées sur ce disque
  eocd.ajouterU16(entrees.length); // nb total d'entrées
  eocd.ajouterU32(tailleRepertoireCentral);
  eocd.ajouterU32(decalageRepertoireCentral);
  eocd.ajouterU16(0); // longueur du commentaire d'archive

  const archive = new TamponOctets();
  archive.ajouter(corps.concatener());
  archive.ajouter(repertoireCentral.concatener());
  archive.ajouter(eocd.concatener());
  return archive.concatener();
}

/**
 * Construit un fichier ZIP « stored » et le retourne sous forme de `Blob`
 * (usage navigateur : téléchargement, envoi réseau…). Sous un environnement
 * sans `Blob` global (Node hors flag expérimental ancien), retombe sur les
 * octets bruts pour rester utilisable en test.
 * @param {EntreeZip[]} entrees - fichiers à inclure
 * @param {Date} [horodatage] - date appliquée à toutes les entrées (défaut : maintenant)
 * @returns {Blob|Uint8Array} archive ZIP complète
 */
export function creerZip(entrees, horodatage = new Date()) {
  const octets = creerZipOctets(entrees, horodatage);
  if (typeof Blob !== 'undefined') {
    return new Blob([octets], { type: 'application/zip' });
  }
  return octets;
}
