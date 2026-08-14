// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// MESURE : LA TAILLE D'UN FICHIER DIT-ELLE S'IL Y A UNE SIGNATURE ?
//
// POURQUOI CET OUTIL EXISTE. Le lot B3 a RETIRÉ la borne basse de 1 Ko
// qui filtrait les signatures (« une image de moins de 1 Ko ne peut pas
// être un tracé »). Cette borne était consignée comme une décision
// antérieure : on ne la retire donc pas sur une intuition, mais sur une
// MESURE — et une mesure qu'un tiers doit pouvoir refaire. La revue
// adversariale du 25/07 a eu raison de le réclamer : les chiffres
// circulaient dans le CHANGELOG sans que rien, dans le dépôt, ne
// permette de les reproduire.
//
// CE QU'IL MESURE. Le poids, en octets, du PNG produit par la zone de
// signature du wizard (1400 × 700, la résolution ×2 de l'écran de
// saisie) dans quatre états : jamais touchée, blanche, griffée de deux
// pixels, et vraiment signée.
//
// CE QU'IL NE MESURE PAS. L'encodeur PNG d'un navigateur n'est pas
// celui de node:zlib : les valeurs ABSOLUES d'un vrai
// canvas.toDataURL() diffèrent. Ce qui se transporte d'un encodeur à
// l'autre, et qui est le SEUL point en cause ici, c'est l'ORDRE DE
// GRANDEUR RELATIF : une case vierge et une case griffée pèsent le même
// poids à quelques dizaines d'octets près, très loin l'une de l'autre
// d'aucun seuil séparateur. Aucune borne de taille ne peut donc
// distinguer « rien » de « quelque chose » — seul le décodage le peut,
// et c'est ce que fait désormais v8/js/data/png.js.
//
// POURQUOI C'EST UNE SUITE ET PAS UN SIMPLE SCRIPT. Un outil de mesure
// que personne ne relance pourrit en silence, et la mesure redevient
// invérifiable — exactement le reproche de la revue. Celle-ci tourne
// dans le filet à chaque incrément : le jour où quelqu'un voudrait
// remettre une borne de taille, elle devient ROUGE.
//
// Exécution : node outils/test-taille-signature.mjs
// Aucune I/O, aucun serveur, aucune base.
// ============================================================

import { deflateSync } from 'node:zlib';

const LARGEUR = 1400;
const HAUTEUR = 700;

// --- Encodeur PNG minimal (RGBA 8 bits, filtre 0) ------------------
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

/** Encode des pixels RGBA en un VRAI fichier PNG. */
function fichierPng(pixels) {
  const parLigne = LARGEUR * 4;
  const brut = Buffer.alloc(HAUTEUR * (parLigne + 1));
  for (let y = 0; y < HAUTEUR; y += 1) {
    brut[y * (parLigne + 1)] = 0; // filtre 0 : aucun
    Buffer.from(pixels.subarray(y * parLigne, (y + 1) * parLigne))
      .copy(brut, (y * (parLigne + 1)) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(LARGEUR, 0);
  ihdr.writeUInt32BE(HAUTEUR, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // RGBA
  const en = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([en, chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(brut, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))]);
}

// --- Les quatre états de la zone de signature ---------------------
function toile(couleur) {
  const p = new Uint8Array(LARGEUR * HAUTEUR * 4);
  for (let i = 0; i < p.length; i += 4) {
    p[i] = couleur[0]; p[i + 1] = couleur[1];
    p[i + 2] = couleur[2]; p[i + 3] = couleur[3];
  }
  return p;
}

function poser(pixels, x, y, couleur) {
  const i = ((y * LARGEUR) + x) * 4;
  pixels[i] = couleur[0]; pixels[i + 1] = couleur[1];
  pixels[i + 2] = couleur[2]; pixels[i + 3] = couleur[3];
}

/** Un trait d'encre : trace épaisse, comme un paraphe rapide. */
function avecUnTrait(pixels) {
  const noir = [17, 24, 39, 255];
  for (let x = 300; x < 1100; x += 1) {
    const y = Math.round(350 + (Math.sin((x - 300) / 90) * 70));
    for (let e = -3; e <= 3; e += 1) poser(pixels, x, y + e, noir);
  }
  return pixels;
}

/** Une griffure : deux pixels, l'essai maladroit d'un élève. */
function avecDeuxPixels(pixels) {
  poser(pixels, 700, 350, [17, 24, 39, 255]);
  poser(pixels, 701, 350, [17, 24, 39, 255]);
  return pixels;
}

const CAS = [
  ['zone JAMAIS touchée (canvas transparent — ce que le wizard produit)',
    toile([0, 0, 0, 0])],
  ['zone blanche unie (l\'ancien canvas, qui peignait son propre fond)',
    toile([255, 255, 255, 255])],
  ['GRIFFURE de deux pixels sur canvas transparent',
    avecDeuxPixels(toile([0, 0, 0, 0]))],
  ['GRIFFURE de deux pixels sur fond blanc',
    avecDeuxPixels(toile([255, 255, 255, 255]))],
  ['UN SEUL TRAIT (paraphe) sur canvas transparent',
    avecUnTrait(toile([0, 0, 0, 0]))],
  ['UN SEUL TRAIT (paraphe) sur fond blanc',
    avecUnTrait(toile([255, 255, 255, 255]))]
];

console.log(`Zone de signature ${LARGEUR} × ${HAUTEUR}, PNG RGBA `
  + '(encodeur node:zlib, niveau 9) — poids du fichier en octets :');
console.log('');
const mesures = [];
const fichiers = [];
for (const [libelle, pixels] of CAS) {
  const png = fichierPng(pixels);
  fichiers.push(png);
  mesures.push([libelle, png.length]);
  console.log(`  ${String(png.length).padStart(7)} o   ${libelle}`);
}

const vides = mesures.slice(0, 2).map((m) => m[1]);
const signes = mesures.slice(2).map((m) => m[1]);
const plusLourdVide = Math.max(...vides);
const plusLegerSigne = Math.min(...signes);
console.log(`Le plus LOURD des fichiers VIDES  : ${plusLourdVide} o`);
console.log(`Le plus LÉGER des fichiers SIGNÉS : ${plusLegerSigne} o`);
console.log('');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

// ① LA BORNE DE 1 Ko NE FILTRAIT RIEN. C'est le fait décisif : elle
//    n'a jamais refusé une seule case blanche, puisque même la zone
//    JAMAIS TOUCHÉE pèse plusieurs kilo-octets. Elle donnait donc la
//    sensation d'un contrôle sans en être un.
verifier('la borne de 1 Ko ne refusait AUCUNE case vierge (elles pèsent toutes'
  + ' plus de 1 Ko)', Math.min(...vides) > 1024,
`le plus léger des vides : ${Math.min(...vides)} o`);

// ② LES DEUX POPULATIONS SE CHEVAUCHENT. Aucun seuil, où qu'on le
//    place, ne sépare « rien » de « quelque chose » : il refuserait de
//    vraies signatures ou accepterait de vraies cases blanches.
verifier('aucune borne de taille ne sépare les deux populations :'
  + ' elles se CHEVAUCHENT', plusLegerSigne <= plusLourdVide,
`vide max ${plusLourdVide} o, signé min ${plusLegerSigne} o`);

// ③ Et la vraie frontière, elle, tranche les six cas sans se tromper.
const { verifierImageSignature, MSG_ZONE_VIERGE } =
  await import('../v8/js/data/signatures-mouvement.js');
let verdictsJustes = 0;
for (const [indice] of CAS.entries()) {
  const verdict = verifierImageSignature(fichiers[indice]);
  const attendu = indice < 2 ? MSG_ZONE_VIERGE : null;
  if (verdict === attendu) verdictsJustes += 1;
  else console.error(`  (cas ${indice} : ${verdict})`);
}
verifier('… là où le DÉCODAGE tranche les six cas sans se tromper',
  verdictsJustes === CAS.length, `${verdictsJustes} / ${CAS.length}`);

console.log('');
console.log(`Taille de signature : ${nbOk} vérifications réussies,`
  + ` ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('La taille d’un fichier ne dit RIEN d’une signature : la borne'
  + ' basse de 1 Ko est retirée à bon droit.');
