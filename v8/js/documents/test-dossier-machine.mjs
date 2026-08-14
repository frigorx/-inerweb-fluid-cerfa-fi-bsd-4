// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Test des dossiers ZIP scellés « machine » et « client » (Phase 2)
// Exécution : node v8/js/documents/test-dossier-machine.mjs
// Génère les dossiers sur les données de démonstration puis relit l'archive
// ZIP (en-têtes locaux + EOCD) : les vérifications portent sur le fichier
// réellement produit. Couvre aussi le correctif de parité versOctets(base64).
// ============================================================

import { createHash } from 'node:crypto';
import { creerStore } from '../data/datastore.js';
import { genererDossierMachine } from './dossier-machine.js';
import { genererDossierClient } from './dossier-client.js';
import { versOctets } from './dossier-commun.js';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

/** Relit un ZIP « stored » : liste { nom, octets } + compte EOCD. */
function lireZip(zip) {
  const vue = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const entrees = [];
  let position = 0;
  while (position + 4 <= zip.length && vue.getUint32(position, true) === 0x04034b50) {
    const tailleContenu = vue.getUint32(position + 18, true);
    const tailleNom = vue.getUint16(position + 26, true);
    const tailleExtra = vue.getUint16(position + 28, true);
    const nom = new TextDecoder().decode(zip.subarray(position + 30, position + 30 + tailleNom));
    const debut = position + 30 + tailleNom + tailleExtra;
    entrees.push({ nom, octets: zip.subarray(debut, debut + tailleContenu) });
    position = debut + tailleContenu;
  }
  let nbEocd = -1;
  for (let i = zip.length - 22; i >= 0; i -= 1) {
    if (vue.getUint32(i, true) === 0x06054b50) { nbEocd = vue.getUint16(i + 10, true); break; }
  }
  return { entrees, nbEocd };
}

const octetsDe = async (blob) => blob instanceof Uint8Array
  ? blob : new Uint8Array(await blob.arrayBuffer());

const store = await creerStore();
const machines = await store.getMachines();
verifier('des machines de démonstration sont disponibles', machines.length > 0);
const machine = machines.find((m) => m.clientId) || machines[0];

// ============================================================
// 1. Dossier MACHINE
// ============================================================
{
  const dossier = await genererDossierMachine(store, machine.id);
  verifier('nomFichier = dossier-machine-<code>.zip',
    /^dossier-machine-.+\.zip$/.test(dossier.nomFichier), dossier.nomFichier);
  const zip = await octetsDe(dossier.blob);
  verifier('archive non vide', zip.length > 0);
  verifier('signature ZIP locale valide', zip[0] === 0x50 && zip[1] === 0x4b);

  const { entrees, nbEocd } = lireZip(zip);
  const noms = entrees.map((e) => e.nom);
  verifier('EOCD = nombre d’entrées réelles', nbEocd === entrees.length,
    `${nbEocd} vs ${entrees.length}`);
  for (const attendu of ['00-SOMMAIRE.txt', '01-EMPREINTES-SHA256.txt',
    'identite-machine.csv', 'mouvements.csv', 'controles.csv']) {
    verifier(`contient ${attendu}`, noms.includes(attendu), noms.join(', '));
  }
  verifier('nbDocuments = nombre d’entrées', dossier.nbDocuments === entrees.length);

  const identite = new TextDecoder().decode(
    entrees.find((e) => e.nom === 'identite-machine.csv').octets);
  verifier('identite-machine.csv porte le code public de la machine',
    !machine.codePublic || identite.includes(machine.codePublic));

  // Manifeste : chaque fichier de données listé avec une empreinte 64-hex.
  const manifeste = new TextDecoder().decode(
    entrees.find((e) => e.nom === '01-EMPREINTES-SHA256.txt').octets);
  verifier('le manifeste liste mouvements.csv avec une empreinte 64-hex',
    new RegExp('^[0-9a-f]{64}  mouvements\\.csv$', 'm').test(manifeste));

  // Empreinte globale = SHA-256 de l'archive complète (le scellé externe).
  const sha = createHash('sha256').update(zip).digest('hex');
  verifier('empreinte retournée = SHA-256 de l’archive .zip', dossier.empreinte === sha);

  // Accès par code public → même dossier.
  if (machine.codePublic) {
    const parCode = await genererDossierMachine(store, machine.codePublic);
    verifier('génération par code public → même nom de fichier',
      parCode.nomFichier === dossier.nomFichier);
  }
}

// Référence inconnue → erreur claire.
{
  let leve = false;
  try { await genererDossierMachine(store, 'MACHINE-INEXISTANTE'); }
  catch { leve = true; }
  verifier('machine inconnue → erreur', leve);
}

// ============================================================
// 2. Dossier CLIENT
// ============================================================
if (machine.clientId) {
  const dossier = await genererDossierClient(store, machine.clientId);
  verifier('nomFichier = dossier-client-<...>.zip',
    /^dossier-client-.+\.zip$/.test(dossier.nomFichier), dossier.nomFichier);
  const zip = await octetsDe(dossier.blob);
  const { entrees } = lireZip(zip);
  const noms = entrees.map((e) => e.nom);
  verifier('contient identite-client.csv', noms.includes('identite-client.csv'));
  verifier('contient machines.csv', noms.includes('machines.csv'));
  verifier('contient au moins un dossier de machine imbriqué (machines/<code>/identite-machine.csv)',
    noms.some((n) => /^machines\/.+\/identite-machine\.csv$/.test(n)), noms.join(', '));
  const sha = createHash('sha256').update(zip).digest('hex');
  verifier('empreinte client = SHA-256 de l’archive', dossier.empreinte === sha);
} else {
  console.log('  (aucune machine rattachée à un client dans la démo — dossier client non exercé)');
}

// ============================================================
// 3. Parité PJ : versOctets accepte une chaîne base64 (mode Local)
// ============================================================
{
  const source = new Uint8Array([0, 1, 2, 250, 255, 42]);
  const b64 = Buffer.from(source).toString('base64');
  const decode = await versOctets(b64);
  verifier('versOctets(base64) → Uint8Array identique aux octets d’origine',
    decode instanceof Uint8Array && decode.length === source.length
    && [...decode].every((v, i) => v === source[i]),
    JSON.stringify([...decode]));
  const passthrough = await versOctets(source);
  verifier('versOctets(Uint8Array) inchangé', passthrough === source);
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Dossiers ZIP machine / client : tout est vert.');
