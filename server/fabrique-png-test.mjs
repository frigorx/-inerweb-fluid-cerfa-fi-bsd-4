// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// FABRIQUE DE VRAIS PNG POUR LES TESTS (lot B3, brique 2)
//
// Pourquoi ce fichier : jusqu'au 25/07, les suites fabriquaient de FAUX
// PNG (8 octets magiques + remplissage) et les faisaient ACCEPTER par
// signerMouvement. Le filet vert attestait donc le comportement
// DÉFAILLANT. Depuis que le logiciel décode réellement l'image
// (v8/js/data/png.js), un tracé de test doit être un VRAI PNG.
//
// Ce module n'est JAMAIS chargé par l'application : c'est un outil de
// test (node:zlib pour comprimer — l'encodeur de test reste ainsi
// indépendant du décompresseur écrit à la main que l'on éprouve).
//
// pngDeTest(taille)  : PNG valide d'AU MOINS `taille` octets, portant
//                      un tracé (au moins deux pixels différents).
// pngVierge(taille)  : PNG valide rigoureusement UNIFORME — la case de
//                      signature restée vierge, que le logiciel doit
//                      refuser depuis le lot B3.
// Le calage à la taille demandée passe par un chunk auxiliaire tEXt
// (chunk parfaitement légal, CRC compris) : la taille du fichier n'est
// plus un indice de ce qu'il y a dessus — c'est précisément la leçon.
// ============================================================

import { deflateSync } from 'node:zlib';

const EN_TETE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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

function crc32(octets) {
  let crc = 0xffffffff;
  for (let i = 0; i < octets.length; i += 1) {
    crc = TABLE_CRC32[(crc ^ octets[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Un chunk PNG complet : longueur, type, données, CRC-32. */
export function chunkPng(type, donnees) {
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(donnees)]);
  const taille = Buffer.alloc(4);
  taille.writeUInt32BE(donnees.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corps), 0);
  return Buffer.concat([taille, corps, crc]);
}

/** Assemble un PNG RGBA 8 bits non entrelacé, filtre 0, à partir des pixels. */
function assembler(largeur, hauteur, pixels, remplissage) {
  const parLigne = largeur * 4;
  const brut = Buffer.alloc(hauteur * (parLigne + 1));
  for (let y = 0; y < hauteur; y += 1) {
    brut[y * (parLigne + 1)] = 0;
    Buffer.from(pixels.subarray(y * parLigne, (y + 1) * parLigne))
      .copy(brut, y * (parLigne + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const morceaux = [EN_TETE, chunkPng('IHDR', ihdr),
    chunkPng('IDAT', deflateSync(brut, { level: 9 }))];
  if (remplissage && remplissage.length) {
    morceaux.push(chunkPng('tEXt',
      Buffer.concat([Buffer.from('Cale', 'latin1'), Buffer.from([0]),
        remplissage])));
  }
  morceaux.push(chunkPng('IEND', Buffer.alloc(0)));
  return Buffer.concat(morceaux);
}

/** Pixels d'une image RGBA d'une seule couleur. */
function pixelsUnis(largeur, hauteur, couleur) {
  const pixels = new Uint8Array(largeur * hauteur * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = couleur[0];
    pixels[i + 1] = couleur[1];
    pixels[i + 2] = couleur[2];
    pixels[i + 3] = couleur[3];
  }
  return pixels;
}

/** Cale le fichier à la taille demandée avec un chunk auxiliaire tEXt. */
function caler(largeur, hauteur, pixels, taille) {
  const nu = assembler(largeur, hauteur, pixels, null);
  if (!taille || nu.length >= taille) return new Uint8Array(nu);
  // 12 octets d'ossature de chunk + 4 pour le mot-clé « Cale »
  // + 1 pour le NUL qui l'en sépare (norme PNG, chunk tEXt). Le NUL est
  // ÉCRIT À PART : glissé dans la chaîne, il rendait ce fichier BINAIRE aux
  // yeux de git, donc invisible à la relecture de diff (revue du 25/07).
  const manque = taille - nu.length - 12 - 5;
  const remplissage = Buffer.alloc(Math.max(1, manque), 0x61);
  return new Uint8Array(assembler(largeur, hauteur, pixels, remplissage));
}

/**
 * VRAI PNG portant un tracé (deux pixels différents au moins), d'au
 * moins `taille` octets.
 * @param {number} [taille] taille minimale du fichier en octets
 * @returns {Uint8Array}
 */
export function pngDeTest(taille = 1200) {
  const largeur = 40;
  const hauteur = 20;
  const pixels = pixelsUnis(largeur, hauteur, [255, 255, 255, 255]);
  // Un trait, comme un signataire en trace un : quelques pixels sombres.
  for (let x = 6; x < 34; x += 1) {
    const index = ((10 * largeur) + x) * 4;
    pixels[index] = 14;
    pixels[index + 1] = 42;
    pixels[index + 2] = 71;
  }
  return caler(largeur, hauteur, pixels, taille);
}

/**
 * VRAI PNG dont UN SEUL pixel diffère du fond : la griffure de deux
 * pixels que la décision du propriétaire exige de laisser passer
 * (aucun seuil d'encre, c'est le signataire qui juge son tracé).
 * @param {number} [taille] taille minimale du fichier en octets
 * @returns {Uint8Array}
 */
export function pngUnSeulPixel(taille = 0) {
  const pixels = pixelsUnis(40, 20, [255, 255, 255, 255]);
  pixels[(10 * 40 + 20) * 4] = 14;
  return caler(40, 20, pixels, taille);
}

/**
 * VRAI PNG rigoureusement UNIFORME : la case de signature restée
 * vierge. Structure impeccable, CRC justes — et rien dessus.
 * @param {number} [taille] taille minimale du fichier en octets
 * @param {Array<number>} [couleur] RGBA de l'aplat (blanc par défaut)
 * @returns {Uint8Array}
 */
export function pngVierge(taille = 1200, couleur = [255, 255, 255, 255]) {
  return caler(40, 20, pixelsUnis(40, 20, couleur), taille);
}

/** Le même, directement en base64 (ce que reçoit signerMouvement). */
export function pngDeTestBase64(taille = 1200) {
  return Buffer.from(pngDeTest(taille)).toString('base64');
}

/** Le vierge, directement en base64. */
export function pngViergeBase64(taille = 1200, couleur) {
  return Buffer.from(pngVierge(taille, couleur)).toString('base64');
}
