// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// LECTURE RÉELLE D'UNE IMAGE PNG (lot B3, brique 1) :
//   1. PARITÉ STRICTE du module pur ESM (v8/js/data/png.js) et de son
//      miroir CommonJS (server/png.js) — mêmes verdicts, mêmes motifs ;
//   2. le DÉCODAGE : en-tête IHDR, chaîne des chunks, CRC-32 de chacun,
//      IDAT présent, IEND final — tiré contre de VRAIS PNG fabriqués
//      ici avec node:zlib (encodeur INDÉPENDANT de notre décodeur, qui
//      lui est écrit à la main : le dépôt n'a aucune dépendance tierce) ;
//   3. les ATTAQUES : le bloc de texte préfixé des 8 octets magiques
//      (constat A04 du 25/07), le CRC retouché, le chunk tronqué, l'IEND
//      absent, les octets ajoutés après IEND ;
//   4. l'ENCRE : image RIGOUREUSEMENT uniforme = VIDE (la case est
//      restée vierge), UN SEUL pixel différent = ENCRE (aucun seuil de
//      densité — décision du propriétaire), format non relisible =
//      INDETERMINABLE (on ne conclut jamais au vide sur un doute).
// Exécution : node server/test-png.mjs — aucun serveur, aucune base.
// ============================================================

import { createRequire } from 'node:module';
import * as moduleEsm from '../v8/js/data/png.js';

const require = createRequire(import.meta.url);
const zlib = require('node:zlib');
const miroir = require('./png.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

// ============================================================
// Fabrique de VRAIS PNG (encodeur de test, indépendant du décodeur)
// ============================================================

const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = TABLE_CRC[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, donnees) {
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(donnees)]);
  const taille = Buffer.alloc(4);
  taille.writeUInt32BE(donnees.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corps), 0);
  return Buffer.concat([taille, corps, crc]);
}
const EN_TETE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Fabrique un PNG à partir d'un tableau de pixels bruts.
 * @param {object} o largeur, hauteur, pixels (Uint8Array), canaux,
 *   typeCouleur, profondeur, filtre (0-4), entrelacement, niveau,
 *   strategie (zlib), chunksIdat (découpe du flux)
 */
function construirePng(o) {
  const canaux = o.canaux ?? 4;
  const profondeur = o.profondeur ?? 8;
  const typeCouleur = o.typeCouleur ?? 6;
  const filtre = o.filtre ?? 0;
  const bpp = canaux * (profondeur / 8);
  const parLigne = o.largeur * bpp;
  const brut = Buffer.alloc(o.hauteur * (parLigne + 1));
  const precedente = new Uint8Array(parLigne);
  for (let y = 0; y < o.hauteur; y += 1) {
    const base = y * (parLigne + 1);
    brut[base] = filtre;
    const ligne = o.pixels.subarray(y * parLigne, (y + 1) * parLigne);
    for (let x = 0; x < parLigne; x += 1) {
      const a = x >= bpp ? ligne[x - bpp] : 0;
      const b = precedente[x];
      const c = x >= bpp ? precedente[x - bpp] : 0;
      let code;
      if (filtre === 0) code = ligne[x];
      else if (filtre === 1) code = ligne[x] - a;
      else if (filtre === 2) code = ligne[x] - b;
      else if (filtre === 3) code = ligne[x] - ((a + b) >> 1);
      else code = ligne[x] - paeth(a, b, c);
      brut[base + 1 + x] = code & 0xff;
    }
    precedente.set(ligne);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(o.largeur, 0);
  ihdr.writeUInt32BE(o.hauteur, 4);
  ihdr[8] = profondeur;
  ihdr[9] = typeCouleur;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = o.entrelacement ?? 0;
  const options = { level: o.niveau ?? 9 };
  if (o.strategie !== undefined) options.strategy = o.strategie;
  const compresse = zlib.deflateSync(brut, options);
  const morceaux = [];
  const decoupe = o.chunksIdat ?? 1;
  const pas = Math.ceil(compresse.length / decoupe);
  for (let i = 0; i < compresse.length; i += pas) {
    morceaux.push(chunk('IDAT', compresse.subarray(i, i + pas)));
  }
  return Buffer.concat([EN_TETE, chunk('IHDR', ihdr), ...morceaux,
    chunk('IEND', Buffer.alloc(0))]);
}

/**
 * Fabrique un PNG en PALETTE 8 bits (type de couleur 3) : indices,
 * PLTE, et éventuellement tRNS (alpha par entrée de palette).
 * @param {object} o largeur, hauteur, indices (Uint8Array), palette
 *   (octets RVB), trns (octets alpha, facultatif)
 */
function construirePngPalette(o) {
  const parLigne = o.largeur;
  const brut = Buffer.alloc(o.hauteur * (parLigne + 1));
  for (let y = 0; y < o.hauteur; y += 1) {
    brut[y * (parLigne + 1)] = 0;
    Buffer.from(o.indices.subarray(y * parLigne, (y + 1) * parLigne))
      .copy(brut, (y * (parLigne + 1)) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(o.largeur, 0);
  ihdr.writeUInt32BE(o.hauteur, 4);
  ihdr[8] = 8;
  ihdr[9] = 3;
  const morceaux = [EN_TETE, chunk('IHDR', ihdr),
    chunk('PLTE', Buffer.from(o.palette))];
  if (o.trns) morceaux.push(chunk('tRNS', Buffer.from(o.trns)));
  morceaux.push(chunk('IDAT', zlib.deflateSync(brut)));
  morceaux.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(morceaux);
}

/** Damier d'indices de palette (une entrée sur deux). */
function indicesDamier(largeur, hauteur, a, b) {
  const p = new Uint8Array(largeur * hauteur);
  for (let i = 0; i < p.length; i += 1) p[i] = (i % 2) ? b : a;
  return p;
}

/** Image RGBA d'une seule couleur (canvas jamais dessiné). */
function pixelsUnis(largeur, hauteur, couleur) {
  const p = new Uint8Array(largeur * hauteur * 4);
  for (let i = 0; i < p.length; i += 4) {
    p[i] = couleur[0]; p[i + 1] = couleur[1];
    p[i + 2] = couleur[2]; p[i + 3] = couleur[3];
  }
  return p;
}

// ============================================================
// 1. Parité stricte ESM ↔ CommonJS
// ============================================================
{
  const blancUni = construirePng({
    largeur: 40, hauteur: 20, pixels: pixelsUnis(40, 20, [255, 255, 255, 255]) });
  const avecTrace = (() => {
    const p = pixelsUnis(40, 20, [255, 255, 255, 255]);
    p[4 * (10 * 40 + 20)] = 14; // un seul pixel encré
    return construirePng({ largeur: 40, hauteur: 20, pixels: p });
  })();
  const fauxPng = (() => {
    const bloc = Buffer.alloc(2348, 0x2e);
    EN_TETE.copy(bloc, 0);
    Buffer.from('signature de complaisance').copy(bloc, 8);
    return bloc;
  })();
  const CAS = [
    null, new Uint8Array(0), new Uint8Array([1, 2, 3]),
    fauxPng, blancUni, avecTrace,
    construirePng({ largeur: 3, hauteur: 3, pixels: pixelsUnis(3, 3, [0, 0, 0, 0]) }),
    construirePng({ largeur: 8, hauteur: 8, entrelacement: 1,
      pixels: pixelsUnis(8, 8, [1, 2, 3, 4]) })
  ];
  let structuresIdentiques = 0;
  let encresIdentiques = 0;
  for (const cas of CAS) {
    const octets = cas ? new Uint8Array(cas) : cas;
    const a = moduleEsm.verifierStructurePng(octets);
    const b = miroir.verifierStructurePng(octets);
    if (a.ok === b.ok && a.motif === b.motif) structuresIdentiques += 1;
    if (moduleEsm.analyseEncre(octets) === miroir.analyseEncre(octets)) {
      encresIdentiques += 1;
    }
  }
  verifier(`structure : mêmes verdicts et motifs sur ${CAS.length} cas discriminants`,
    structuresIdentiques === CAS.length);
  verifier(`encre : mêmes réponses sur ${CAS.length} cas discriminants`,
    encresIdentiques === CAS.length);
  verifier('constantes identiques des deux côtés',
    JSON.stringify(miroir.MAGIQUES_PNG) === JSON.stringify(moduleEsm.MAGIQUES_PNG)
    && miroir.SURFACE_MAX_OCTETS === moduleEsm.SURFACE_MAX_OCTETS);
}

// ============================================================
// 2. Le décodage : un VRAI PNG est lu, son en-tête est rendu
// ============================================================
{
  const png = construirePng({
    largeur: 12, hauteur: 5, pixels: pixelsUnis(12, 5, [255, 255, 255, 255]) });
  const verdict = miroir.verifierStructurePng(png);
  verifier('un vrai PNG est accepté, IHDR relu (dimensions, canaux)',
    verdict.ok === true && verdict.entete.largeur === 12
    && verdict.entete.hauteur === 5 && verdict.entete.canaux === 4
    && verdict.entete.profondeur === 8 && verdict.idat.length === 1,
    JSON.stringify(verdict.entete));
  const decoupe = construirePng({
    largeur: 12, hauteur: 5, chunksIdat: 3,
    pixels: pixelsUnis(12, 5, [255, 255, 255, 255]) });
  const verdictDecoupe = miroir.verifierStructurePng(decoupe);
  verifier('un PNG à IDAT multiples est lu (le flux zlib est recollé)',
    verdictDecoupe.ok === true && verdictDecoupe.idat.length === 3
    && miroir.analyseEncre(decoupe) === 'VIDE');
}

// ============================================================
// 3. Les ATTAQUES sur la structure (constat A04, tiré et confirmé)
// ============================================================
{
  // L'attaque exacte du constat : 8 octets magiques + une phrase répétée.
  const bloc = Buffer.alloc(2348, 0x2e);
  EN_TETE.copy(bloc, 0);
  Buffer.from('ceci n est pas une image').copy(bloc, 8);
  const verdictBloc = miroir.verifierStructurePng(bloc);
  verifier('ATTAQUE A04 : bloc de 2 348 o aux bons octets magiques → REFUSÉ',
    verdictBloc.ok === false, JSON.stringify(verdictBloc.motif));

  const valide = construirePng({
    largeur: 6, hauteur: 6, pixels: pixelsUnis(6, 6, [9, 9, 9, 255]) });

  const crcCasse = Buffer.from(valide);
  crcCasse[crcCasse.length - 5] ^= 0xff; // dernier octet des données IEND-1
  const crcIhdr = Buffer.from(valide);
  crcIhdr[29] ^= 0x01; // un octet du CRC de l'IHDR
  verifier('ATTAQUE : CRC-32 de l’IHDR retouché → REFUSÉ',
    miroir.verifierStructurePng(crcIhdr).ok === false
    && miroir.verifierStructurePng(crcIhdr).motif.includes('CRC-32'),
    miroir.verifierStructurePng(crcIhdr).motif);

  const donneeIhdrRetouchee = Buffer.from(valide);
  donneeIhdrRetouchee[19] = 99; // largeur modifiée, CRC laissé tel quel
  verifier('ATTAQUE : dimension réécrite sans refaire le CRC → REFUSÉ',
    miroir.verifierStructurePng(donneeIhdrRetouchee).ok === false);

  verifier('ATTAQUE : fichier tronqué (IEND coupé) → REFUSÉ',
    miroir.verifierStructurePng(valide.subarray(0, valide.length - 6)).ok === false);

  const sansIend = Buffer.concat([
    EN_TETE,
    valide.subarray(8, valide.length - 12)]);
  verifier('ATTAQUE : IEND absent → REFUSÉ',
    miroir.verifierStructurePng(sansIend).ok === false
    && miroir.verifierStructurePng(sansIend).motif === 'IEND absent');

  const apresIend = Buffer.concat([valide, Buffer.from('charge utile cachée')]);
  verifier('ATTAQUE : octets ajoutés APRÈS IEND → REFUSÉ',
    miroir.verifierStructurePng(apresIend).ok === false
    && miroir.verifierStructurePng(apresIend).motif === 'octets après IEND');

  const sansIdat = Buffer.concat([
    EN_TETE, valide.subarray(8, 8 + 25), chunk('IEND', Buffer.alloc(0))]);
  verifier('ATTAQUE : aucun IDAT (en-tête seul) → REFUSÉ',
    miroir.verifierStructurePng(sansIdat).ok === false
    && miroir.verifierStructurePng(sansIdat).motif.includes('IDAT'));

  const ihdrZero = Buffer.alloc(13);
  ihdrZero.writeUInt32BE(0, 0);
  ihdrZero.writeUInt32BE(4, 4);
  ihdrZero[8] = 8; ihdrZero[9] = 6;
  const dimensionNulle = Buffer.concat([
    EN_TETE, chunk('IHDR', ihdrZero), chunk('IDAT', zlib.deflateSync(Buffer.alloc(4))),
    chunk('IEND', Buffer.alloc(0))]);
  verifier('ATTAQUE : IHDR de dimension nulle (CRC juste) → REFUSÉ',
    miroir.verifierStructurePng(dimensionNulle).ok === false
    && miroir.verifierStructurePng(dimensionNulle).motif === 'dimension nulle');

  const ihdrCouleur = Buffer.alloc(13);
  ihdrCouleur.writeUInt32BE(2, 0);
  ihdrCouleur.writeUInt32BE(2, 4);
  ihdrCouleur[8] = 8; ihdrCouleur[9] = 7; // type de couleur inexistant
  const couleurIllegale = Buffer.concat([
    EN_TETE, chunk('IHDR', ihdrCouleur),
    chunk('IDAT', zlib.deflateSync(Buffer.alloc(4))),
    chunk('IEND', Buffer.alloc(0))]);
  verifier('ATTAQUE : type de couleur inexistant (CRC juste) → REFUSÉ',
    miroir.verifierStructurePng(couleurIllegale).motif === 'type de couleur illégal');
}

// ============================================================
// 4. L'ENCRE : « rien du tout » contre « quelque chose »
// ============================================================
{
  // Le canvas de signature du wizard, jamais dessiné : 1400 × 700 (la
  // résolution ×2 de l'écran de saisie), fond uni.
  const vierge = construirePng({
    largeur: 1400, hauteur: 700,
    pixels: pixelsUnis(1400, 700, [255, 255, 255, 255]) });
  verifier('canvas 1400×700 blanc uni (jamais dessiné) → VIDE',
    miroir.analyseEncre(vierge) === 'VIDE');
  const viergeTransparent = construirePng({
    largeur: 1400, hauteur: 700, pixels: pixelsUnis(1400, 700, [0, 0, 0, 0]) });
  verifier('canvas 1400×700 entièrement transparent → VIDE',
    miroir.analyseEncre(viergeTransparent) === 'VIDE');
  const noirUni = construirePng({
    largeur: 60, hauteur: 30, pixels: pixelsUnis(60, 30, [0, 0, 0, 255]) });
  verifier('image noire unie (aplat, aucun tracé) → VIDE',
    miroir.analyseEncre(noirUni) === 'VIDE');

  // DÉCISION DU PROPRIÉTAIRE : aucun seuil d'encre. Une griffure d'UN
  // SEUL pixel est une signature — le signataire seul juge son tracé.
  for (const position of [0, 1, 1400 * 700 - 1]) {
    const p = pixelsUnis(1400, 700, [255, 255, 255, 255]);
    p[position * 4] = 14;
    p[position * 4 + 1] = 42;
    p[position * 4 + 2] = 71;
    const png = construirePng({ largeur: 1400, hauteur: 700, pixels: p });
    verifier(`griffure d’UN SEUL pixel (position ${position}) → ENCRE`,
      miroir.analyseEncre(png) === 'ENCRE');
  }
  // Une différence sur le SEUL canal alpha compte aussi (tracé sur fond
  // transparent : c'est ce que produit un canvas non peint en blanc).
  {
    const p = pixelsUnis(200, 100, [0, 0, 0, 0]);
    p[4 * 512 + 3] = 1;
    verifier('un seul pixel d’alpha 1 sur fond transparent → ENCRE',
      miroir.analyseEncre(construirePng({ largeur: 200, hauteur: 100, pixels: p }))
        === 'ENCRE');
  }

  // Les CINQ filtres de la norme, et les trois familles de blocs DEFLATE :
  // notre décompresseur écrit à la main doit lire ce que zlib produit.
  for (const filtre of [0, 1, 2, 3, 4]) {
    const uni = pixelsUnis(64, 32, [200, 210, 220, 255]);
    const encre = pixelsUnis(64, 32, [200, 210, 220, 255]);
    encre[4 * (17 * 64 + 33)] = 3;
    verifier(`filtre ${filtre} : uni → VIDE, un pixel différent → ENCRE`,
      miroir.analyseEncre(construirePng(
        { largeur: 64, hauteur: 32, pixels: uni, filtre })) === 'VIDE'
      && miroir.analyseEncre(construirePng(
        { largeur: 64, hauteur: 32, pixels: encre, filtre })) === 'ENCRE');
  }
  const varie = new Uint8Array(64 * 32 * 4);
  for (let i = 0; i < varie.length; i += 1) varie[i] = (i * 37) % 251;
  for (const [nom, options] of [
    ['bloc stocké (niveau 0)', { niveau: 0 }],
    ['Huffman fixe', { niveau: 9, strategie: zlib.constants.Z_FIXED }],
    ['Huffman dynamique', { niveau: 9 }]
  ]) {
    const png = construirePng({ largeur: 64, hauteur: 32, pixels: varie, ...options });
    verifier(`DEFLATE ${nom} : image bruitée relue → ENCRE`,
      miroir.analyseEncre(png) === 'ENCRE');
    const uni = construirePng({ largeur: 64, hauteur: 32,
      pixels: pixelsUnis(64, 32, [7, 7, 7, 255]), ...options });
    verifier(`DEFLATE ${nom} : image unie relue → VIDE`,
      miroir.analyseEncre(uni) === 'VIDE');
  }

  // Autres formats de pixels : gris, gris+alpha, RVB, palette.
  const gris = new Uint8Array(20 * 10).fill(128);
  verifier('niveaux de gris unis → VIDE',
    miroir.analyseEncre(construirePng({ largeur: 20, hauteur: 10,
      pixels: gris, canaux: 1, typeCouleur: 0 })) === 'VIDE');
  gris[57] = 0;
  verifier('niveaux de gris avec un pixel noir → ENCRE',
    miroir.analyseEncre(construirePng({ largeur: 20, hauteur: 10,
      pixels: gris, canaux: 1, typeCouleur: 0 })) === 'ENCRE');
  const rvb = new Uint8Array(9 * 9 * 3).fill(64);
  verifier('RVB uni → VIDE',
    miroir.analyseEncre(construirePng({ largeur: 9, hauteur: 9,
      pixels: rvb, canaux: 3, typeCouleur: 2 })) === 'VIDE');
  const seize = new Uint8Array(8 * 8 * 2).fill(0x33);
  verifier('gris 16 bits uni → VIDE',
    miroir.analyseEncre(construirePng({ largeur: 8, hauteur: 8,
      pixels: seize, canaux: 1, typeCouleur: 0, profondeur: 16 })) === 'VIDE');
  seize[11] = 0x34;
  verifier('gris 16 bits avec un demi-pixel différent → ENCRE',
    miroir.analyseEncre(construirePng({ largeur: 8, hauteur: 8,
      pixels: seize, canaux: 1, typeCouleur: 0, profondeur: 16 })) === 'ENCRE');

  // On ne conclut JAMAIS au vide sur un format que l'on ne sait pas lire.
  const entrelace = construirePng({ largeur: 16, hauteur: 16,
    entrelacement: 1, pixels: pixelsUnis(16, 16, [255, 255, 255, 255]) });
  verifier('PNG entrelacé (Adam7) : structure VALIDE mais encre INDETERMINABLE',
    miroir.verifierStructurePng(entrelace).ok === true
    && miroir.analyseEncre(entrelace) === 'INDETERMINABLE');
  const palette = (() => {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(8, 0);
    ihdr.writeUInt32BE(8, 4);
    ihdr[8] = 4; ihdr[9] = 3; // profondeur 4 bits, palette
    const brut = Buffer.alloc(8 * (4 + 1));
    return Buffer.concat([EN_TETE, chunk('IHDR', ihdr),
      chunk('PLTE', Buffer.alloc(6)),
      chunk('IDAT', zlib.deflateSync(brut)), chunk('IEND', Buffer.alloc(0))]);
  })();
  verifier('PNG en palette 4 bits : structure VALIDE mais encre INDETERMINABLE',
    miroir.verifierStructurePng(palette).ok === true
    && miroir.analyseEncre(palette) === 'INDETERMINABLE');

  // Flux zlib menteur : structure impeccable, contenu indéchiffrable.
  const idatMenteur = (() => {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(4, 0);
    ihdr.writeUInt32BE(4, 4);
    ihdr[8] = 8; ihdr[9] = 6;
    return Buffer.concat([EN_TETE, chunk('IHDR', ihdr),
      chunk('IDAT', Buffer.from('pas du zlib du tout')),
      chunk('IEND', Buffer.alloc(0))]);
  })();
  verifier('IDAT qui n’est pas du zlib : structure VALIDE, encre INDETERMINABLE',
    miroir.verifierStructurePng(idatMenteur).ok === true
    && miroir.analyseEncre(idatMenteur) === 'INDETERMINABLE');

  // Bombe de décompression : surface déclarée démesurée → jamais décodée.
  const bombe = (() => {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(20000, 0);
    ihdr.writeUInt32BE(20000, 4);
    ihdr[8] = 8; ihdr[9] = 6;
    return Buffer.concat([EN_TETE, chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(Buffer.alloc(1024))),
      chunk('IEND', Buffer.alloc(0))]);
  })();
  const debut = Date.now();
  verifier('bombe de décompression 20 000 × 20 000 : INDETERMINABLE, sans décoder',
    miroir.analyseEncre(bombe) === 'INDETERMINABLE' && Date.now() - debut < 2000);
}

// ============================================================
// 5. LES IMAGES VISUELLEMENT BLANCHES (revue adversariale du 25/07)
//
// Le module comparait les octets BRUTS, canal par canal — il répondait
// donc « ENCRE » AVEC ASSURANCE sur deux familles d'images sur
// lesquelles il n'y a RIGOUREUSEMENT RIEN à voir. Ce n'était pas un
// doute assumé (INDETERMINABLE) : c'était le mensonge exact que le lot
// prétend fermer, retourné contre lui. On compose l'alpha, on résout la
// palette — et on vérifie que rien de VISIBLE n'a été perdu au passage.
// ============================================================
{
  const lesDeux = (octets, attendu, libelle) => {
    const a = moduleEsm.analyseEncre(new Uint8Array(octets));
    const b = miroir.analyseEncre(new Uint8Array(octets));
    verifier(libelle, a === attendu && b === attendu, `ESM ${a} · CJS ${b}`);
  };

  // FAMILLE A — alpha nul PARTOUT, couleurs qui varient. Rien ne se voit.
  {
    const p = new Uint8Array(400 * 200 * 4);
    for (let i = 0; i < p.length; i += 4) {
      p[i] = (i * 7) % 251;
      p[i + 1] = (i * 13) % 241;
      p[i + 2] = (i * 29) % 239;
      p[i + 3] = 0; // invisible
    }
    lesDeux(construirePng({ largeur: 400, hauteur: 200, pixels: p }), 'VIDE',
      '⭐ RGBA 400×200, alpha nul partout et couleurs qui varient → VIDE');
  }
  // … même chose en gris+alpha (type 4) et en 16 bits : la composition de
  // l'alpha ne doit pas dépendre du format.
  {
    const p = new Uint8Array(60 * 30 * 2);
    for (let i = 0; i < p.length; i += 2) { p[i] = (i * 11) % 253; p[i + 1] = 0; }
    lesDeux(construirePng({ largeur: 60, hauteur: 30, pixels: p,
      canaux: 2, typeCouleur: 4 }), 'VIDE',
    'gris+alpha, alpha nul partout et gris qui varie → VIDE');
  }
  {
    const p = new Uint8Array(20 * 10 * 8);
    for (let i = 0; i < p.length; i += 8) {
      p[i] = (i * 3) % 251; p[i + 1] = (i * 5) % 247;
      p[i + 2] = (i * 7) % 241; p[i + 3] = (i * 11) % 239;
      p[i + 4] = (i * 13) % 233; p[i + 5] = (i * 17) % 229;
      p[i + 6] = 0; p[i + 7] = 0; // alpha 16 bits nul
    }
    lesDeux(construirePng({ largeur: 20, hauteur: 10, pixels: p,
      canaux: 4, typeCouleur: 6, profondeur: 16 }), 'VIDE',
    'RGBA 16 bits, alpha nul partout et couleurs qui varient → VIDE');
  }
  // CONTRE-ÉPREUVE : dès que l'alpha VARIE, quelque chose se voit.
  {
    const p = new Uint8Array(40 * 20 * 4);
    for (let i = 0; i < p.length; i += 4) {
      p[i] = 10; p[i + 1] = 20; p[i + 2] = 30; p[i + 3] = 0;
    }
    p[4 * 137 + 3] = 255; // un seul pixel opaque
    lesDeux(construirePng({ largeur: 40, hauteur: 20, pixels: p }), 'ENCRE',
      'contre-épreuve : UN pixel opaque sur fond transparent → ENCRE');
  }

  // FAMILLE B — palette dont toutes les entrées sont BLANCHES : les
  // index varient, l'image est un aplat.
  {
    const png = construirePngPalette({ largeur: 64, hauteur: 32,
      indices: indicesDamier(64, 32, 0, 1),
      palette: [255, 255, 255, 255, 255, 255] });
    lesDeux(png, 'VIDE',
      '⭐ palette 8 bits, deux entrées TOUTES DEUX blanches, damier → VIDE');
  }
  // CONTRE-ÉPREUVE : deux entrées de couleurs DIFFÉRENTES → il y a un tracé.
  {
    const png = construirePngPalette({ largeur: 64, hauteur: 32,
      indices: indicesDamier(64, 32, 0, 1),
      palette: [255, 255, 255, 14, 42, 71] });
    lesDeux(png, 'ENCRE',
      'contre-épreuve : palette à deux couleurs DIFFÉRENTES → ENCRE');
  }
  // CONTRE-ÉPREUVE : mêmes couleurs, mais tRNS rend une entrée invisible —
  // blanc opaque contre transparent, cela se voit.
  {
    const png = construirePngPalette({ largeur: 64, hauteur: 32,
      indices: indicesDamier(64, 32, 0, 1),
      palette: [255, 255, 255, 255, 255, 255], trns: [255, 0] });
    lesDeux(png, 'ENCRE',
      'contre-épreuve : palette blanche mais tRNS transparent sur une '
      + 'entrée → ENCRE');
  }
  // … et si TOUTES les entrées sont transparentes, il n'y a rien.
  {
    const png = construirePngPalette({ largeur: 64, hauteur: 32,
      indices: indicesDamier(64, 32, 0, 1),
      palette: [255, 255, 255, 14, 42, 71], trns: [0, 0] });
    lesDeux(png, 'VIDE',
      'palette à deux couleurs mais tRNS transparent PARTOUT → VIDE');
  }
  // Palette illisible : on ne conclut RIEN (doute assumé, jamais « vide »).
  {
    const sansPlte = (() => {
      const ihdr = Buffer.alloc(13);
      ihdr.writeUInt32BE(4, 0);
      ihdr.writeUInt32BE(4, 4);
      ihdr[8] = 8; ihdr[9] = 3;
      return Buffer.concat([EN_TETE, chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(Buffer.alloc(4 * 5))),
        chunk('IEND', Buffer.alloc(0))]);
    })();
    lesDeux(sansPlte, 'INDETERMINABLE',
      'palette annoncée mais PLTE absent → INDETERMINABLE (jamais « vide »)');
    const horsPalette = construirePngPalette({ largeur: 8, hauteur: 4,
      indices: indicesDamier(8, 4, 0, 5), // l'index 5 n'existe pas
      palette: [255, 255, 255, 0, 0, 0] });
    lesDeux(horsPalette, 'INDETERMINABLE',
      'index hors de la palette → INDETERMINABLE (jamais « vide »)');
  }

  // Une signature RÉELLE reste une signature : le tracé sombre sur fond
  // transparent que produit le canvas du wizard depuis la brique 4.
  {
    const p = new Uint8Array(200 * 100 * 4);
    for (let x = 20; x < 180; x += 1) {
      const i = ((50 * 200) + x) * 4;
      p[i] = 14; p[i + 1] = 42; p[i + 2] = 71; p[i + 3] = 255;
    }
    lesDeux(construirePng({ largeur: 200, hauteur: 100, pixels: p }), 'ENCRE',
      'non-régression : un trait opaque sur canvas transparent → ENCRE');
  }
}

// ============================================================
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('PNG : décodage réel (IHDR, chunks, CRC-32, DEFLATE écrit à la main), parité stricte ESM/CJS, et la frontière « rien du tout » contre « quelque chose ».');
