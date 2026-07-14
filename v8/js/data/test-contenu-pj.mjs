// Suite « contenu binaire des pièces jointes » (module PUR contenu-pj.js).
// Prouve : l'aller-retour Blob ↔ base64 est FIDÈLE (octets binaires
// compris), les gros contenus (5 Mo) ne débordent pas la pile, et surtout
// qu'un contenu non textuel — le `{}` que JSON fabrique à partir d'un Blob —
// est REFUSÉ au lieu d'être décodé en 9 octets de déchet (audit du 14/07).

import {
  versBase64,
  versBlob,
  base64VersOctets,
  estBase64,
  MSG_CONTENU_ATTENDU,
  MSG_BASE64_ILLISIBLE
} from './contenu-pj.js';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}
async function attendreErreur(libelle, promesse, extrait) {
  try {
    await promesse;
    verifier(libelle, false, 'aucune erreur levée');
  } catch (erreur) {
    verifier(libelle, String(erreur.message) === extrait,
      `message = « ${erreur.message} »`);
  }
}

// ============================================================
// 1. Aller-retour fidèle depuis les types que le DemoStore accepte
// ============================================================
const TEXTE = 'preuve de pesée — accents é à ü, symboles ✓ €';
const OCTETS_TEXTE = new TextEncoder().encode(TEXTE);

const base64DuBlob = await versBase64(new Blob([TEXTE]));
verifier('Blob → base64 (chaîne pure, sans préfixe data:)',
  typeof base64DuBlob === 'string' && estBase64(base64DuBlob)
  && !base64DuBlob.startsWith('data:'));
verifier('Blob → base64 → octets : contenu identique à l’original',
  new TextDecoder().decode(base64VersOctets(base64DuBlob)) === TEXTE);

verifier('Uint8Array → base64 : même résultat que le Blob',
  await versBase64(OCTETS_TEXTE) === base64DuBlob);
verifier('ArrayBuffer → base64 : même résultat que le Blob',
  await versBase64(OCTETS_TEXTE.buffer.slice(0)) === base64DuBlob);
verifier('chaîne base64 → rendue telle quelle (idempotence)',
  await versBase64(base64DuBlob) === base64DuBlob);
verifier('data URL → le préfixe est retiré',
  await versBase64(`data:image/png;base64,${base64DuBlob}`) === base64DuBlob);

// ============================================================
// 2. Binaire véritable (0x00 → 0xFF) : aucune perte, aucun UTF-8 parasite
// ============================================================
{
  const octets = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) octets[i] = i;
  const relus = base64VersOctets(await versBase64(octets));
  let identique = relus.length === 256;
  for (let i = 0; identique && i < 256; i += 1) {
    if (relus[i] !== octets[i]) identique = false;
  }
  verifier('les 256 valeurs d’octet survivent à l’aller-retour', identique);
}

// ============================================================
// 3. Gros contenu : l’encodage par tranches ne déborde pas la pile
//    (String.fromCharCode(...5 Mo) lève un RangeError — piège évité)
// ============================================================
{
  const CINQ_MO = 5 * 1024 * 1024;
  const gros = new Uint8Array(CINQ_MO).fill(0x41);
  let base64Gros = '';
  let leve = false;
  try {
    base64Gros = await versBase64(gros);
  } catch {
    leve = true;
  }
  verifier('5 Mo encodés sans déborder la pile',
    !leve && base64VersOctets(base64Gros).length === CINQ_MO);
}

// ============================================================
// 4. LA SENTINELLE : le `{}` que JSON fabrique à partir d’un Blob
// ============================================================
{
  // Exactement ce que subit une pièce jointe qui part vers le serveur local :
  // JSON.stringify réduit le Blob à {} — il ne doit JAMAIS être décodé.
  const apresJson = JSON.parse(JSON.stringify({ blob: new Blob([TEXTE]) })).blob;
  verifier('JSON réduit bien un Blob à {} (la cause du défaut)',
    typeof apresJson === 'object' && Object.keys(apresJson).length === 0);
  await attendreErreur('un Blob passé par JSON ({}) est REFUSÉ',
    versBase64(apresJson), MSG_CONTENU_ATTENDU);
}

await attendreErreur('un objet quelconque est refusé',
  versBase64({ faux: true }), MSG_CONTENU_ATTENDU);
await attendreErreur('un nombre est refusé',
  versBase64(42), MSG_CONTENU_ATTENDU);
await attendreErreur('null est refusé',
  versBase64(null), MSG_CONTENU_ATTENDU);

// ============================================================
// 5. Base64 illisible : refusée des deux côtés du contrat
// ============================================================
await attendreErreur('une chaîne hors alphabet base64 est refusée',
  versBase64('@@@ pas du base64 @@@'), MSG_BASE64_ILLISIBLE);
await attendreErreur('« [object Object] » (le déchet historique) est refusé',
  versBase64('[object Object]'), MSG_BASE64_ILLISIBLE);
verifier('estBase64 : refuse le déchet, accepte une vraie base64',
  estBase64('[object Object]') === false && estBase64(base64DuBlob) === true
  && estBase64(null) === false);
{
  let leve = false;
  try { base64VersOctets('[object Object]'); } catch { leve = true; }
  verifier('base64VersOctets refuse « [object Object] » au lieu de rendre 9 octets',
    leve);
}

// ============================================================
// 6. versBlob : le contenu binaire promis par le contrat
// ============================================================
{
  const blob = versBlob(base64DuBlob, 'image/png');
  const estUnBlob = typeof Blob !== 'undefined' && blob instanceof Blob;
  verifier('versBlob rend un Blob au bon type MIME',
    estUnBlob && blob.type === 'image/png');
  verifier('versBlob : contenu relisible à l’identique',
    estUnBlob && (await blob.text()) === TEXTE);
  verifier('versBlob : type par défaut si le MIME est absent',
    versBlob(base64DuBlob).type === 'application/octet-stream');
}

// ------------------------------------------------------------
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [module pur contenu-pj]`);
process.exit(nbEchecs === 0 ? 0 : 1);
