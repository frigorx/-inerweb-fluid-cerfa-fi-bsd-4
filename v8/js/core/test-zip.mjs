// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Mini-test du module ZIP (exécution : node test-zip.mjs)
// Vérifie la structure binaire du format ZIP « stored » produit par zip.js :
// signatures, EOCD, CRC-32, noms accentués UTF-8, tailles, cas à 0 entrée,
// intégrité d'un contenu binaire. Un mini-lecteur ZIP (parsing du répertoire
// central + extraction stored) est réécrit ici pour ne dépendre d'aucune
// bibliothèque tierce. Bonus : si l'interpréteur Python est disponible en
// ligne de commande, une extraction via son module natif `zipfile` prouve
// l'interopérabilité avec un lecteur ZIP tiers réel.
// ============================================================

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { creerZip, creerZipOctets, crc32 } from './zip.js';

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
// Mini-lecteur ZIP indépendant (répertoire central → entrées « stored »)
// Sert d'oracle de relecture pour ne pas se fier uniquement au code qui
// a produit l'archive.
// ------------------------------------------------------------

/**
 * Relit un fichier ZIP « stored » produit par zip.js et retourne ses entrées.
 * @param {Uint8Array} octets
 * @returns {{nom: string, contenu: Uint8Array, crcDeclare: number, crcRecalcule: number}[]}
 */
function lireZip(octets) {
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);

  // Recherche de l'EOCD en partant de la fin (pas de commentaire d'archive ici,
  // donc il est à taille fixe 22 octets avant la fin du fichier).
  const SIG_EOCD = 0x06054b50;
  let offsetEocd = -1;
  for (let i = octets.length - 22; i >= 0; i -= 1) {
    if (vue.getUint32(i, true) === SIG_EOCD) { offsetEocd = i; break; }
  }
  if (offsetEocd === -1) throw new Error('EOCD introuvable');

  const nbEntrees = vue.getUint16(offsetEocd + 10, true);
  const tailleRepertoire = vue.getUint32(offsetEocd + 12, true);
  const decalageRepertoire = vue.getUint32(offsetEocd + 16, true);

  const entrees = [];
  let curseur = decalageRepertoire;
  const SIG_CENTRAL = 0x02014b50;
  for (let i = 0; i < nbEntrees; i += 1) {
    if (vue.getUint32(curseur, true) !== SIG_CENTRAL) {
      throw new Error(`Signature d'en-tête central invalide à l'entrée ${i}`);
    }
    const methode = vue.getUint16(curseur + 10, true);
    const crcDeclare = vue.getUint32(curseur + 16, true);
    const tailleCompressee = vue.getUint32(curseur + 20, true);
    const tailleReelle = vue.getUint32(curseur + 24, true);
    const longueurNom = vue.getUint16(curseur + 28, true);
    const longueurExtra = vue.getUint16(curseur + 30, true);
    const longueurCommentaire = vue.getUint16(curseur + 32, true);
    const decalageLocal = vue.getUint32(curseur + 42, true);
    const nomOctets = octets.slice(curseur + 46, curseur + 46 + longueurNom);
    const nom = new TextDecoder('utf-8').decode(nomOctets);

    if (methode !== 0) throw new Error(`Méthode non « stored » inattendue : ${methode}`);
    if (tailleCompressee !== tailleReelle) throw new Error('Taille compressée ≠ taille réelle en mode stored');

    // Localisation du contenu via l'en-tête local (longueur nom + extra variables).
    const longueurNomLocal = vue.getUint16(decalageLocal + 26, true);
    const longueurExtraLocal = vue.getUint16(decalageLocal + 28, true);
    const debutContenu = decalageLocal + 30 + longueurNomLocal + longueurExtraLocal;
    const contenu = octets.slice(debutContenu, debutContenu + tailleReelle);

    entrees.push({
      nom,
      contenu,
      crcDeclare,
      crcRecalcule: crc32(contenu),
    });

    curseur += 46 + longueurNom + longueurExtra + longueurCommentaire;
  }

  return { entrees, nbEntreesDeclare: nbEntrees, tailleRepertoire, decalageRepertoire };
}

// ------------------------------------------------------------
// 1. Signature PK\x03\x04 en tête du premier en-tête local
// ------------------------------------------------------------

const zipSimple = creerZipOctets([
  { nom: 'bonjour.txt', contenu: 'Bonjour le monde' },
]);
verifier('signature PK\\x03\\x04 en tête de la première entrée locale',
  zipSimple[0] === 0x50 && zipSimple[1] === 0x4b &&
  zipSimple[2] === 0x03 && zipSimple[3] === 0x04);

// ------------------------------------------------------------
// 2. EOCD présent (signature PK\x05\x06)
// ------------------------------------------------------------

let signatureEocdTrouvee = false;
for (let i = zipSimple.length - 22; i >= 0; i -= 1) {
  if (zipSimple[i] === 0x50 && zipSimple[i + 1] === 0x4b &&
      zipSimple[i + 2] === 0x05 && zipSimple[i + 3] === 0x06) {
    signatureEocdTrouvee = true;
    break;
  }
}
verifier('EOCD (PK\\x05\\x06) présent dans l\'archive', signatureEocdTrouvee);

// ------------------------------------------------------------
// 3. Nombre d'entrées cohérent (relecture répertoire central)
// ------------------------------------------------------------

const entreesTest = [
  { nom: 'un.txt', contenu: 'un' },
  { nom: 'deux.txt', contenu: 'deux' },
  { nom: 'trois.txt', contenu: 'trois' },
];
const zipTrois = creerZipOctets(entreesTest);
const lu3 = lireZip(zipTrois);
verifier('nombre d\'entrées relu = 3', lu3.nbEntreesDeclare === 3,
  `valeur = ${lu3.nbEntreesDeclare}`);
verifier('les 3 noms relus correspondent, dans l\'ordre',
  lu3.entrees.map((e) => e.nom).join(',') === 'un.txt,deux.txt,trois.txt');

// ------------------------------------------------------------
// 4. CRC-32 d'un contenu connu (valeur de référence externe)
// ------------------------------------------------------------

// CRC-32 (IEEE 802.3) de la chaîne ASCII "123456789" = 0xCBF43926 (valeur de
// référence standard du test CRC-32, utilisée dans toutes les implémentations).
const crcReference = crc32(new TextEncoder().encode('123456789'));
verifier('CRC-32("123456789") === 0xCBF43926 (valeur de référence normalisée)',
  crcReference === 0xcbf43926,
  `valeur = 0x${crcReference.toString(16)}`);

// ------------------------------------------------------------
// 5. Noms accentués relus correctement (UTF-8, bit 11 posé)
// ------------------------------------------------------------

const nomsAccentues = [
  'établissement.csv',
  'cerfa/FI-2026-0007.pdf',
  'pièces-jointes/attestation capacité.pdf',
];
const zipAccents = creerZipOctets(
  nomsAccentues.map((nom) => ({ nom, contenu: `contenu de ${nom}` }))
);
const luAccents = lireZip(zipAccents);
verifier('noms accentués relus identiques (UTF-8)',
  luAccents.entrees.every((e, i) => e.nom === nomsAccentues[i]),
  `relu = ${JSON.stringify(luAccents.entrees.map((e) => e.nom))}`);

// Bit 11 du flag général posé sur chaque en-tête local (offset +6 dans l'en-tête local).
const vueAccents = new DataView(zipAccents.buffer);
const flagPremiereEntree = vueAccents.getUint16(6, true);
verifier('bit 11 (UTF-8) posé dans le flag général de la première entrée',
  (flagPremiereEntree & 0x0800) !== 0,
  `flag = 0x${flagPremiereEntree.toString(16)}`);

// ------------------------------------------------------------
// 6. Tailles cohérentes (annoncée === réelle, mode stored)
// ------------------------------------------------------------

const contenuLong = 'A'.repeat(5000) + 'texte français avec des accents éàçù' + 'B'.repeat(3000);
const zipTaille = creerZipOctets([{ nom: 'gros-fichier.txt', contenu: contenuLong }]);
const luTaille = lireZip(zipTaille);
const tailleAttendue = new TextEncoder().encode(contenuLong).length;
verifier('taille de contenu relue cohérente avec la taille réelle écrite',
  luTaille.entrees[0].contenu.length === tailleAttendue,
  `attendu ${tailleAttendue}, relu ${luTaille.entrees[0].contenu.length}`);
verifier('CRC-32 relu du gros fichier === CRC-32 recalculé sur le contenu extrait',
  luTaille.entrees[0].crcDeclare === luTaille.entrees[0].crcRecalcule);
verifier('contenu texte relu identique caractère pour caractère',
  new TextDecoder('utf-8').decode(luTaille.entrees[0].contenu) === contenuLong);

// ------------------------------------------------------------
// 7. ZIP à 0 entrée valide
// ------------------------------------------------------------

const zipVide = creerZipOctets([]);
verifier('ZIP à 0 entrée : taille non nulle (EOCD minimal présent)',
  zipVide.length === 22, // EOCD seul, aucun corps ni répertoire central
  `taille = ${zipVide.length}`);
const luVide = lireZip(zipVide);
verifier('ZIP à 0 entrée : 0 entrée déclarée et 0 entrée relue',
  luVide.nbEntreesDeclare === 0 && luVide.entrees.length === 0 &&
  luVide.tailleRepertoire === 0);

// ------------------------------------------------------------
// 8. Contenu Uint8Array binaire intact (toutes les valeurs d'octet 0-255)
// ------------------------------------------------------------

const octetsBinaires = new Uint8Array(256);
for (let i = 0; i < 256; i += 1) octetsBinaires[i] = i;
const zipBinaire = creerZipOctets([{ nom: 'binaire.bin', contenu: octetsBinaires }]);
const luBinaire = lireZip(zipBinaire);
verifier('contenu binaire (256 valeurs d\'octet) relu strictement identique',
  luBinaire.entrees[0].contenu.length === 256 &&
  luBinaire.entrees[0].contenu.every((valeur, i) => valeur === i));
verifier('CRC-32 du contenu binaire relu === CRC-32 recalculé après extraction',
  luBinaire.entrees[0].crcDeclare === luBinaire.entrees[0].crcRecalcule);

// ------------------------------------------------------------
// 9. creerZip() : Blob sous Node (undici expose Blob globalement dès Node 18)
// ------------------------------------------------------------

const resultatCreerZip = creerZip([{ nom: 'a.txt', contenu: 'a' }]);
const estBlob = typeof Blob !== 'undefined' && resultatCreerZip instanceof Blob;
const estUint8 = resultatCreerZip instanceof Uint8Array;
verifier('creerZip() retourne un Blob (ou des octets bruts si Blob indisponible)',
  estBlob || estUint8,
  `type = ${resultatCreerZip?.constructor?.name}`);
if (estBlob) {
  const octetsDepuisBlob = new Uint8Array(await resultatCreerZip.arrayBuffer());
  verifier('contenu du Blob relisible et valide (EOCD présent)',
    lireZip(octetsDepuisBlob).entrees[0]?.nom === 'a.txt');
}

// ------------------------------------------------------------
// Bonus fiabilité : dézippage par Python (module natif zipfile), si dispo
// ------------------------------------------------------------

function trouverPython() {
  for (const commande of ['python', 'python3']) {
    try {
      const version = execFileSync(commande, ['--version'], { encoding: 'utf-8' });
      if (version && /Python 3/.test(version)) return commande;
    } catch {
      // commande absente ou échoue : on essaie la suivante
    }
  }
  return null;
}

const commandePython = trouverPython();
if (commandePython) {
  const dossierTemp = mkdtempSync(join(tmpdir(), 'inerweb-zip-test-'));
  const cheminZip = join(dossierTemp, 'dossier-test.zip');

  const entreesPython = [
    { nom: 'sommaire.txt', contenu: 'Dossier de test — vérification interopérabilité Python' },
    { nom: 'sous-dossier/établissement.csv', contenu: 'nom;valeur\nLycée;éàçù€' },
    { nom: 'binaire.bin', contenu: octetsBinaires },
  ];
  const zipPourPython = creerZipOctets(entreesPython);
  writeFileSync(cheminZip, zipPourPython);

  // Script Python autonome, écrit dans un fichier temporaire pour éviter tout
  // souci d'échappement de guillemets entre shells (cmd.exe / PowerShell / bash).
  const cheminScript = join(dossierTemp, 'lire_zip.py');
  writeFileSync(cheminScript, [
    'import zipfile',
    'import json',
    'import sys',
    'import io',
    '',
    // Console Windows en cp1252/cp850 par défaut : on force la sortie standard
    // en UTF-8 pour ne pas corrompre les noms accentués au moment du print()
    // (le contenu du ZIP, lui, est UTF-8 correct dès la lecture — ceci ne
    // concerne que l'affichage du résultat JSON).
    'sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")',
    '',
    'chemin = sys.argv[1]',
    'resultat = {"ok": True, "noms": [], "erreurs": []}',
    'try:',
    '    with zipfile.ZipFile(chemin) as archive:',
    '        bad = archive.testzip()',
    '        if bad is not None:',
    '            resultat["ok"] = False',
    '            resultat["erreurs"].append("entree corrompue: " + bad)',
    '        resultat["noms"] = archive.namelist()',
    '        contenu_csv = archive.read("sous-dossier/établissement.csv").decode("utf-8")',
    '        resultat["contenu_csv_ok"] = (contenu_csv == "nom;valeur\\nLycée;éàçù€")',
    '        contenu_bin = archive.read("binaire.bin")',
    '        resultat["contenu_bin_ok"] = (list(contenu_bin) == list(range(256)))',
    'except Exception as exc:',
    '    resultat["ok"] = False',
    '    resultat["erreurs"].append(str(exc))',
    'print(json.dumps(resultat, ensure_ascii=False))',
  ].join('\n'), 'utf-8');

  try {
    const sortie = execFileSync(commandePython, [cheminScript, cheminZip], {
      encoding: 'utf-8',
    });
    const resultatPython = JSON.parse(sortie.trim().split('\n').pop());

    verifier('Python zipfile ouvre l\'archive sans erreur (testzip)',
      resultatPython.ok === true,
      JSON.stringify(resultatPython.erreurs));
    verifier('Python zipfile relit les 3 noms d\'entrée attendus (dont accents)',
      Array.isArray(resultatPython.noms) &&
      resultatPython.noms.length === 3 &&
      resultatPython.noms.includes('sous-dossier/établissement.csv'),
      JSON.stringify(resultatPython.noms));
    verifier('Python zipfile relit le CSV accentué UTF-8 identique',
      resultatPython.contenu_csv_ok === true);
    verifier('Python zipfile relit le contenu binaire (256 octets) identique',
      resultatPython.contenu_bin_ok === true);
  } catch (erreur) {
    verifier('Python zipfile : exécution du script de vérification', false,
      String(erreur && erreur.message ? erreur.message : erreur));
  } finally {
    try { rmSync(dossierTemp, { recursive: true, force: true }); } catch {
      // nettoyage best-effort, sans impact sur le résultat des tests
    }
  }
} else {
  console.log('  --  Python indisponible en ligne de commande : vérification structurelle seule (bonus ignoré).');
}

// ------------------------------------------------------------
// Bilan
// ------------------------------------------------------------

console.log('');
console.log(`${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) {
  console.log('DES TESTS ONT ÉCHOUÉ.');
  process.exitCode = 1;
} else {
  console.log('Tous les tests passent.');
}
