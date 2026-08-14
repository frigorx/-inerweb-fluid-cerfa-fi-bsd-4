// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — ZIP « stored » côté serveur (V9-E4.1, coffre-fort).
 * ===================================================================
 * Port CommonJS du créateur ZIP du front (`v8/js/core/zip.js`) ET
 * PROMOTION du lecteur jusqu'ici cantonné au test (`v8/js/core/
 * test-zip.mjs:lireZip`). Le noyau de sauvegarde a besoin des DEUX sens :
 *   - ÉCRIRE une archive vérifiable (base + manifeste + documents) ;
 *   - LIRE une seule entrée (le manifeste) SANS tout extraire, pour
 *     inventorier une sauvegarde en un coup d'œil (listerSauvegardes) ;
 *   - EXTRAIRE entrée par entrée en flux fichier, CRC-32 vérifié, sans
 *     charger toute l'archive utile en RAM d'un bloc (une base .db peut
 *     peser plusieurs dizaines de Mo — on écrit chaque entrée directement
 *     sur le disque au fil de sa lecture).
 *
 * Format : en-têtes locaux + répertoire central + fin de répertoire
 * central (EOCD), CRC-32 par entrée, noms UTF-8 (bit 11 posé), méthode 0
 * (stored, aucune compression). Interopérable avec tout lecteur standard
 * (Explorateur Windows, 7-Zip, `zipfile` de Python…).
 *
 * ⚠ Le CRÉATEUR est un CLONE FIDÈLE de zip.js : mêmes constantes, même
 * sérialisation binaire, mêmes CRC — un ZIP écrit ici est identique à un
 * ZIP écrit par le front. ⚠ AUCUNE suite ne verrouille aujourd'hui cette
 * équivalence octet à octet : elle tient par la relecture des deux
 * fichiers. Ne pas la croire prouvée. Zéro dépendance externe (uniquement
 * `node:fs`, `node:path`).
 */

const fs = require('node:fs');
const path = require('node:path');

// ------------------------------------------------------------
// Signatures et constantes du format ZIP (identiques à zip.js).
// ------------------------------------------------------------

const SIGNATURE_ENTETE_LOCAL = 0x04034b50;
const SIGNATURE_ENTETE_CENTRAL = 0x02014b50;
const SIGNATURE_FIN_REPERTOIRE = 0x06054b50;

/** Méthode 0 = « stored » (aucune compression). */
const METHODE_STOCKEE = 0;

/** Bit 11 du flag général : noms de fichiers en UTF-8. */
const BIT_UTF8 = 0x0800;

/** Version minimale d'extraction (2.0). */
const VERSION_NECESSAIRE = 20;

/** Version « faite par ». */
const VERSION_FAITE_PAR = 20;

/** Taille fixe de l'EOCD sans commentaire d'archive. */
const TAILLE_EOCD = 22;

// ------------------------------------------------------------
// CRC-32 (table calculée une seule fois, IEEE 802.3 — identique à zip.js).
// ------------------------------------------------------------

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
 * CRC-32 (IEEE 802.3) d'un tampon d'octets. Accepte Uint8Array ou Buffer
 * (un Buffer EST un Uint8Array : l'indexation par octet est identique).
 * @param {Uint8Array|Buffer} octets
 * @returns {number} CRC-32 non signé (0 à 0xFFFFFFFF)
 */
function crc32(octets) {
  let crc = 0xffffffff;
  for (let i = 0; i < octets.length; i += 1) {
    crc = TABLE_CRC32[(crc ^ octets[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ------------------------------------------------------------
// Conversions bas niveau (date DOS, UTF-8) — identiques à zip.js.
// ------------------------------------------------------------

/**
 * Date JavaScript → date/heure DOS (16 + 16 bits). L'époque DOS démarre
 * en 1980 ; une date antérieure est ramenée au minimum représentable.
 * @param {Date} date - heure locale
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
 * Contenu d'une entrée (string ou octets) → Buffer. Une string est
 * encodée en UTF-8 (comme zip.js). Les Buffer/Uint8Array passent tels
 * quels (contenu binaire d'un .db ou d'une PJ).
 * @param {string|Uint8Array|Buffer} contenu
 * @returns {Buffer}
 */
function versOctets(contenu) {
  if (typeof contenu === 'string') return Buffer.from(contenu, 'utf8');
  if (Buffer.isBuffer(contenu)) return contenu;
  if (contenu instanceof Uint8Array) return Buffer.from(contenu);
  throw new TypeError(
    'zip-node : le contenu d\'une entrée doit être une chaîne, un Buffer ' +
    'ou un Uint8Array.');
}

// ------------------------------------------------------------
// Écriture — création d'un ZIP « stored » en octets bruts.
// (Un petit assembleur de morceaux, comme le TamponOctets de zip.js,
// mais en Buffer natif : les .db se comptent en Mo, Buffer.concat est
// le chemin le plus direct et sans copie superflue.)
// ------------------------------------------------------------

/** Entier non signé 16 bits little-endian. */
function u16(valeur) {
  const b = Buffer.allocUnsafe(2);
  b.writeUInt16LE(valeur & 0xffff, 0);
  return b;
}

/** Entier non signé 32 bits little-endian. */
function u32(valeur) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32LE(valeur >>> 0, 0);
  return b;
}

/**
 * @typedef {object} EntreeZip
 * @property {string} nom - chemin/nom dans l'archive (accents permis, UTF-8)
 * @property {string|Uint8Array|Buffer} contenu - contenu de l'entrée
 */

/**
 * Construit un ZIP « stored » à partir d'une liste d'entrées et renvoie
 * les octets bruts. Clone fidèle de `zip.js:creerZipOctets`.
 * @param {EntreeZip[]} entrees - fichiers à inclure (liste vide = ZIP valide)
 * @param {Date} [horodatage] - date appliquée à toutes les entrées
 * @returns {Buffer} octets du fichier ZIP complet
 */
function creerZipOctets(entrees, horodatage = new Date()) {
  const { dateDos, heureDos } = versDateDos(horodatage);
  const corps = [];
  let tailleCorps = 0;
  const repertoire = [];
  let tailleRepertoire = 0;

  for (const entree of entrees) {
    const nomOctets = Buffer.from(entree.nom, 'utf8');
    const contenu = versOctets(entree.contenu);
    const crc = crc32(contenu);
    const taille = contenu.length;
    const decalageLocal = tailleCorps;

    // En-tête local + nom + contenu.
    const enteteLocal = Buffer.concat([
      u32(SIGNATURE_ENTETE_LOCAL),
      u16(VERSION_NECESSAIRE),
      u16(BIT_UTF8),
      u16(METHODE_STOCKEE),
      u16(heureDos),
      u16(dateDos),
      u32(crc),
      u32(taille), // taille compressée = réelle (stored)
      u32(taille), // taille non compressée
      u16(nomOctets.length),
      u16(0),      // pas de champ « extra »
      nomOctets
    ]);
    corps.push(enteteLocal, contenu);
    tailleCorps += enteteLocal.length + contenu.length;

    // En-tête central correspondant (écrit après tous les corps).
    const enteteCentral = Buffer.concat([
      u32(SIGNATURE_ENTETE_CENTRAL),
      u16(VERSION_FAITE_PAR),
      u16(VERSION_NECESSAIRE),
      u16(BIT_UTF8),
      u16(METHODE_STOCKEE),
      u16(heureDos),
      u16(dateDos),
      u32(crc),
      u32(taille),
      u32(taille),
      u16(nomOctets.length),
      u16(0), // extra
      u16(0), // commentaire de fichier
      u16(0), // n° de disque de début
      u16(0), // attributs internes
      u32(0), // attributs externes
      u32(decalageLocal),
      nomOctets
    ]);
    repertoire.push(enteteCentral);
    tailleRepertoire += enteteCentral.length;
  }

  const decalageRepertoire = tailleCorps;
  const eocd = Buffer.concat([
    u32(SIGNATURE_FIN_REPERTOIRE),
    u16(0), // n° de ce disque
    u16(0), // disque du début du répertoire central
    u16(entrees.length), // nb d'entrées sur ce disque
    u16(entrees.length), // nb total d'entrées
    u32(tailleRepertoire),
    u32(decalageRepertoire),
    u16(0)  // longueur du commentaire d'archive
  ]);

  return Buffer.concat([...corps, ...repertoire, eocd]);
}

// ------------------------------------------------------------
// Lecture — répertoire central → entrées « stored ».
// PROMOTION de test-zip.mjs:lireZip, complétée d'une vérification CRC-32
// systématique et d'extraction en flux.
// ------------------------------------------------------------

/**
 * Localise l'EOCD (fin de répertoire central) en partant de la fin. On
 * balaie une fenêtre bornée pour tolérer un éventuel commentaire d'archive
 * (nos ZIP n'en ont pas, mais un ZIP tiers pourrait) : la signature est
 * cherchée sur les 64 Ko finaux au plus (longueur max d'un commentaire).
 * @param {Buffer} octets
 * @returns {number} décalage de l'EOCD
 */
function trouverEocd(octets) {
  // Un fichier plus court que l'EOCD minimal ne peut pas être un ZIP : le
  // dire clairement plutôt que de laisser un index négatif filer vers un
  // RangeError de readUInt32LE.
  if (octets.length < TAILLE_EOCD) {
    throw new Error(
      'Archive corrompue : fichier trop court pour un ZIP (fin de ' +
      'répertoire central absente).');
  }
  const min = Math.max(0, octets.length - TAILLE_EOCD - 0xffff);
  for (let i = octets.length - TAILLE_EOCD; i >= min; i -= 1) {
    if (octets.readUInt32LE(i) === SIGNATURE_FIN_REPERTOIRE) return i;
  }
  throw new Error('Archive illisible : fin de répertoire central (EOCD) introuvable.');
}

/**
 * Lit un entier 32 bits little-endian APRÈS avoir vérifié que les 4 octets
 * tiennent dans le buffer. Un offset hors bornes (issu d'un ZIP corrompu ou
 * malveillant : EOCD menteur, en-tête central forgé) donne un message CLAIR
 * « archive corrompue » au lieu du RangeError brut de Node.
 * @param {Buffer} octets
 * @param {number} position
 * @param {string} quoi - libellé du champ pour le message d'erreur
 */
function lireU32(octets, position, quoi) {
  if (!Number.isInteger(position) || position < 0
    || position + 4 > octets.length) {
    throw new Error(
      `Archive corrompue : ${quoi} pointe hors des limites du fichier ` +
      `(offset ${position}, taille ${octets.length}).`);
  }
  return octets.readUInt32LE(position);
}

/** Comme lireU32, pour un entier 16 bits (2 octets). */
function lireU16(octets, position, quoi) {
  if (!Number.isInteger(position) || position < 0
    || position + 2 > octets.length) {
    throw new Error(
      `Archive corrompue : ${quoi} pointe hors des limites du fichier ` +
      `(offset ${position}, taille ${octets.length}).`);
  }
  return octets.readUInt16LE(position);
}

/**
 * Parse le répertoire central d'un ZIP et renvoie le CATALOGUE de ses
 * entrées (métadonnées + position du contenu), SANS copier les contenus.
 * C'est le socle commun de lireEntree / extraireVers : on ne matérialise
 * un contenu que lorsqu'on en a besoin.
 * @param {Buffer} octets - archive complète en mémoire
 * @returns {{nom: string, methode: number, crcDeclare: number,
 *            taille: number, debutContenu: number}[]}
 */
function catalogue(octets) {
  const offsetEocd = trouverEocd(octets);
  const nbEntrees = lireU16(octets, offsetEocd + 10, 'nombre d\'entrées');
  const decalageRepertoire = lireU32(
    octets, offsetEocd + 16, 'décalage du répertoire central');
  // Le répertoire central doit commencer DANS le fichier (avant l'EOCD).
  if (decalageRepertoire > offsetEocd) {
    throw new Error(
      'Archive corrompue : le répertoire central commence hors des ' +
      `limites du fichier (offset ${decalageRepertoire}, EOCD à ` +
      `${offsetEocd}).`);
  }

  const entrees = [];
  let curseur = decalageRepertoire;
  for (let i = 0; i < nbEntrees; i += 1) {
    // Chaque en-tête central fait AU MOINS 46 octets fixes ; les valider dans
    // les bornes AVANT toute lecture (un nbEntrees mensonger ne doit pas
    // provoquer un RangeError mais un refus clair).
    if (lireU32(octets, curseur, `en-tête central de l'entrée ${i}`)
      !== SIGNATURE_ENTETE_CENTRAL) {
      throw new Error(
        `Archive corrompue : en-tête central invalide à l'entrée ${i}.`);
    }
    const methode = lireU16(octets, curseur + 10, 'méthode');
    const crcDeclare = lireU32(octets, curseur + 16, 'CRC déclaré');
    const tailleCompressee = lireU32(octets, curseur + 20, 'taille compressée');
    const tailleReelle = lireU32(octets, curseur + 24, 'taille réelle');
    const longueurNom = lireU16(octets, curseur + 28, 'longueur du nom');
    const longueurExtra = lireU16(octets, curseur + 30, 'longueur extra');
    const longueurCommentaire = lireU16(
      octets, curseur + 32, 'longueur commentaire');
    const decalageLocal = lireU32(
      octets, curseur + 42, 'décalage de l\'en-tête local');
    // Le nom doit tenir entièrement dans le buffer.
    if (curseur + 46 + longueurNom > octets.length) {
      throw new Error(
        `Archive corrompue : nom de l'entrée ${i} hors des limites du fichier.`);
    }
    const nom = octets.toString(
      'utf8', curseur + 46, curseur + 46 + longueurNom);

    if (methode !== METHODE_STOCKEE) {
      throw new Error(
        `Archive non « stored » (méthode ${methode}) pour « ${nom} » : ` +
        'ce coffre-fort n\'écrit que du stored, refus.');
    }
    if (tailleCompressee !== tailleReelle) {
      throw new Error(
        `Archive incohérente : tailles compressée/réelle différentes pour « ${nom} ».`);
    }

    // Le contenu se localise VIA L'EN-TÊTE LOCAL (longueurs nom/extra
    // propres au local, parfois différentes du central). L'en-tête local a
    // 30 octets fixes : valider ses lectures dans les bornes.
    if (lireU32(octets, decalageLocal, `en-tête local de « ${nom} »`)
      !== SIGNATURE_ENTETE_LOCAL) {
      throw new Error(
        `Archive corrompue : en-tête local absent ou invalide pour « ${nom} ».`);
    }
    const longueurNomLocal = lireU16(
      octets, decalageLocal + 26, 'longueur du nom (local)');
    const longueurExtraLocal = lireU16(
      octets, decalageLocal + 28, 'longueur extra (local)');
    const debutContenu =
      decalageLocal + 30 + longueurNomLocal + longueurExtraLocal;

    entrees.push({
      nom, methode, crcDeclare, taille: tailleReelle, debutContenu
    });
    curseur += 46 + longueurNom + longueurExtra + longueurCommentaire;
  }
  return entrees;
}

/**
 * Extrait le contenu d'UNE entrée du catalogue en vérifiant son CRC-32.
 * @param {Buffer} octets
 * @param {{nom, crcDeclare, taille, debutContenu}} entree
 * @returns {Buffer} contenu (copie indépendante)
 */
function contenuVerifie(octets, entree) {
  // Début ET fin du contenu doivent tenir dans le buffer : un décalage local
  // forgé (négatif après calcul, ou colossal) est refusé proprement.
  if (!Number.isInteger(entree.debutContenu) || entree.debutContenu < 0
    || entree.debutContenu > octets.length) {
    throw new Error(
      `Archive corrompue : début du contenu de « ${entree.nom} » hors ` +
      'des limites du fichier.');
  }
  const fin = entree.debutContenu + entree.taille;
  if (fin > octets.length) {
    throw new Error(
      `Archive tronquée : contenu de « ${entree.nom} » hors limites.`);
  }
  // Copie (pas une vue) : le tampon global peut être libéré ensuite.
  const contenu = Buffer.from(
    octets.subarray(entree.debutContenu, fin));
  const crc = crc32(contenu);
  if (crc !== entree.crcDeclare) {
    throw new Error(
      `Intégrité rompue (CRC-32) pour « ${entree.nom} » : ` +
      `déclaré ${entree.crcDeclare.toString(16)}, ` +
      `recalculé ${crc.toString(16)} — archive endommagée.`);
  }
  return contenu;
}

/**
 * Relit un ZIP « stored » en mémoire et renvoie toutes ses entrées avec
 * leur contenu, CRC-32 vérifié. Équivalent enrichi de test-zip.mjs:lireZip
 * (ici le CRC est VÉRIFIÉ, pas seulement recalculé pour comparaison). À
 * réserver aux petites archives (tests) : pour une vraie archive, préférer
 * extraireVers (flux) et lireEntree (une seule entrée).
 * @param {Buffer} octets
 * @returns {{entrees: {nom: string, contenu: Buffer}[], nbEntrees: number}}
 */
function lireZip(octets) {
  const cat = catalogue(octets);
  const entrees = cat.map((e) => ({
    nom: e.nom,
    contenu: contenuVerifie(octets, e)
  }));
  return { entrees, nbEntrees: cat.length };
}

/**
 * Lit UNE SEULE entrée d'un fichier ZIP sur disque, par son nom, SANS
 * extraire le reste — le cœur de listerSauvegardes (lire `manifeste.json`
 * en tête d'une archive de plusieurs Mo sans la dérouler). L'archive est
 * lue une fois en mémoire pour parser le répertoire central puis n'en
 * matérialiser QUE l'entrée demandée (CRC-32 vérifié).
 *
 * Note d'ingénierie : le répertoire central est en FIN de fichier ; le
 * localiser sans lire le fichier exigerait des lectures à décalage. À
 * l'échelle d'un poste (archives lues à la demande, pas en boucle serveur),
 * une lecture séquentielle est la solution simple et sûre — on évite juste
 * de RECOPIER tous les contenus, ce que faisait l'ancien lireZip.
 * @param {string} cheminZip - chemin du fichier .zip
 * @param {string} nom - nom exact de l'entrée recherchée
 * @returns {Buffer|null} contenu de l'entrée, ou null si absente
 */
function lireEntree(cheminZip, nom) {
  const octets = fs.readFileSync(cheminZip);
  const cat = catalogue(octets);
  const entree = cat.find((e) => e.nom === nom);
  if (!entree) return null;
  return contenuVerifie(octets, entree);
}

/**
 * Extrait toutes les entrées d'un ZIP vers un dossier de destination, une
 * par une, EN FLUX (chaque contenu écrit sur disque puis libéré — jamais
 * toutes les entrées en RAM simultanément), CRC-32 vérifié avant écriture.
 * Un CRC faux INTERROMPT l'extraction (rien de douteux n'atterrit sur le
 * disque au-delà du point de rupture).
 *
 * Sécurité chemins (anti « zip slip ») : le chemin de destination de chaque
 * entrée DOIT rester strictement sous `dossier` après résolution — une
 * entrée nommée « ../evasion » est refusée. Les sous-dossiers implicites
 * (« documents/PJ-… ») sont créés au besoin.
 * @param {string} cheminZip
 * @param {string} dossier - dossier de destination (créé au besoin)
 * @returns {{nom: string, chemin: string, taille: number}[]} entrées écrites
 */
function extraireVers(cheminZip, dossier) {
  const racine = path.resolve(dossier);
  fs.mkdirSync(racine, { recursive: true });

  const octets = fs.readFileSync(cheminZip);
  const cat = catalogue(octets);
  const ecrites = [];

  for (const entree of cat) {
    // Un nom se terminant par « / » est un dossier pur (nos archives n'en
    // écrivent pas, mais un ZIP tiers pourrait) : on crée le dossier.
    const estDossier = entree.nom.endsWith('/');
    const cible = path.resolve(racine, entree.nom);
    if (cible !== racine && !cible.startsWith(racine + path.sep)) {
      throw new Error(
        `Entrée d'archive hors du dossier cible (« ${entree.nom} ») : ` +
        'extraction refusée (protection contre l\'évasion de chemin).');
    }
    if (estDossier) {
      fs.mkdirSync(cible, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(cible), { recursive: true });
    const contenu = contenuVerifie(octets, entree); // CRC vérifié AVANT écriture
    fs.writeFileSync(cible, contenu);
    ecrites.push({ nom: entree.nom, chemin: cible, taille: entree.taille });
  }
  return ecrites;
}

/**
 * Liste les NOMS des entrées d'un ZIP sur disque (répertoire central seul,
 * aucun contenu matérialisé). Utile pour vérifier la présence d'une PJ sans
 * l'extraire.
 * @param {string} cheminZip
 * @returns {{nom: string, taille: number, crcDeclare: number}[]}
 */
function listerEntrees(cheminZip) {
  const octets = fs.readFileSync(cheminZip);
  return catalogue(octets).map((e) => ({
    nom: e.nom, taille: e.taille, crcDeclare: e.crcDeclare
  }));
}

module.exports = {
  crc32,
  creerZipOctets,
  lireZip,
  lireEntree,
  extraireVers,
  listerEntrees
};
