// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test du dossier ZIP scellé « dossier de fuite » (brique ③, Phase 2 export)
// Exécution : node v8/js/documents/test-dossier-fuite.mjs
// Construit un parcours réel (détection → récupération → réparation tracée
// → complément → contrôle de suivi CONFORME) dans le DemoStore — même
// scénario que data/test-dossiers-fuite.mjs volet B — puis génère le
// dossier ZIP et relit l'archive (en-têtes locaux + EOCD) : les
// vérifications portent sur le fichier réellement produit.
// ============================================================

import { createHash } from 'node:crypto';
import { creerStore } from '../data/datastore.js';
import { genererDossierFuite } from './dossier-fuite.js';

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

/** Date ISO à `n` jours d'aujourd'hui (négatif = passé). */
function dateRelative(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Construction du scénario réel (identique à data/test-dossiers-fuite.mjs
// volet B) : un dossier de fuite FERMÉ, chronologie complète.
// ============================================================
const store = await creerStore();

const referent = await store.createPersonne({
  nom: 'Fuite', prenom: 'Export', typePersonne: 'ENSEIGNANT', roleApp: 'REFERENT'
});
const fluides = await store.getFluides();
const machine = await store.createMachine({
  designation: 'Machine export dossier fuite', fluide: fluides[0].code,
  chargeNominaleKg: 10, operateur: 'Testeur'
});
const source = await store.createBouteille({
  type: 'NEUVE', fluide: fluides[0].code, tareKg: 10, masseBruteKg: 25,
  contenanceMaxKg: 20
});
const recup = await store.createBouteille({
  type: 'RECUPERATION', fluide: fluides[0].code, tareKg: 8, masseBruteKg: 8,
  contenanceMaxKg: 15
});

// J-20 : mise en service (5 kg) — AVANT la fuite, hors dossier.
const mes = await store.creerMouvement({
  type: 'MISE_EN_SERVICE', machineId: machine.id, bouteilleSrcId: source.id,
  date: dateRelative(-20), peseeAvantKg: 15, peseeApresKg: 10,
  technicien: 'Testeur'
});
await store.soumettreMouvement(mes.id);
await store.validerMouvement(mes.id, referent.id);

// J-10 : détection de la fuite (contrôle FUITE localisé).
const controleFuite = await store.createControle({
  machineId: machine.id, resultat: 'FUITE', methode: 'DIRECTE',
  date: dateRelative(-10), localisationFuite: 'Raccord HP',
  operateur: 'Testeur'
});

// J-8 : récupération de 2 kg vers la bouteille de récupération.
const mvtRecup = await store.creerMouvement({
  type: 'RECUPERATION_MAINTENANCE', machineId: machine.id,
  bouteilleDstId: recup.id, date: dateRelative(-8),
  peseeAvantKg: 8, peseeApresKg: 10, technicien: 'Testeur'
});
await store.soumettreMouvement(mvtRecup.id);
await store.validerMouvement(mvtRecup.id, referent.id);

// J-5 : réparation tracée.
await store.tracerReparation(controleFuite.id, {
  dateReparation: dateRelative(-5), natureReparation: 'Remplacement raccord HP',
  reparateur: 'Testeur'
});

// J-3 : complément de charge (possible : la réparation est tracée).
const mvtAppoint = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machine.id, bouteilleSrcId: source.id,
  date: dateRelative(-3), peseeAvantKg: 10, peseeApresKg: 8,
  technicien: 'Testeur'
});
await store.soumettreMouvement(mvtAppoint.id);
await store.validerMouvement(mvtAppoint.id, referent.id);

// J-1 : contrôle de suivi CONFORME → la fuite est refermée.
const controleSuivi = await store.createControle({
  machineId: machine.id, resultat: 'CONFORME', methode: 'DIRECTE',
  date: dateRelative(-1), operateur: 'Testeur'
});

// ============================================================
// 1. Dossier de FUITE — export ZIP
// ============================================================
{
  const dossier = await genererDossierFuite(store, machine.id, controleFuite.id);
  verifier('nomFichier = dossier-fuite-<code>-<date>.zip',
    /^dossier-fuite-.+-\d{4}-\d{2}-\d{2}\.zip$/.test(dossier.nomFichier), dossier.nomFichier);

  const zip = await octetsDe(dossier.blob);
  verifier('archive non vide', zip.length > 0);
  verifier('signature ZIP locale valide', zip[0] === 0x50 && zip[1] === 0x4b);

  const { entrees, nbEocd } = lireZip(zip);
  const noms = entrees.map((e) => e.nom);
  verifier('EOCD = nombre d’entrées réelles', nbEocd === entrees.length,
    `${nbEocd} vs ${entrees.length}`);
  for (const attendu of ['00-SOMMAIRE.txt', '01-EMPREINTES-SHA256.txt',
    '02-SYNTHESE.csv', '03-CHRONOLOGIE.txt', '04-CONTROLES.csv',
    '05-MOUVEMENTS-PENDANT-FUITE.csv']) {
    verifier(`contient ${attendu}`, noms.includes(attendu), noms.join(', '));
  }
  verifier('au moins un CERFA dans cerfa/',
    noms.some((n) => n.startsWith('cerfa/')), noms.join(', '));
  verifier('nbDocuments = nombre d’entrées', dossier.nbDocuments === entrees.length);

  // Manifeste : chaque fichier de données listé avec une empreinte 64-hex.
  const manifeste = new TextDecoder().decode(
    entrees.find((e) => e.nom === '01-EMPREINTES-SHA256.txt').octets);
  verifier('le manifeste liste 02-SYNTHESE.csv avec une empreinte 64-hex',
    new RegExp('^[0-9a-f]{64}  02-SYNTHESE\\.csv$', 'm').test(manifeste));

  // Empreinte globale = SHA-256 de l'archive complète (le scellé externe).
  const sha = createHash('sha256').update(zip).digest('hex');
  verifier('empreinte retournée = SHA-256 de l’archive .zip', dossier.empreinte === sha);
  verifier('empreinte au format 64-hex', /^[0-9a-f]{64}$/.test(dossier.empreinte));

  // 02-SYNTHESE.csv : localisation et statut « Fermée ».
  const synthese = new TextDecoder().decode(
    entrees.find((e) => e.nom === '02-SYNTHESE.csv').octets);
  verifier('la synthèse porte la localisation de la fuite',
    synthese.includes('Raccord HP'));
  verifier('la synthèse porte le statut « Fermée »',
    synthese.includes('Fermée'));

  // 03-CHRONOLOGIE.txt : détection et réparation présentes.
  const chrono = new TextDecoder().decode(
    entrees.find((e) => e.nom === '03-CHRONOLOGIE.txt').octets);
  verifier('la chronologie mentionne « Fuite détectée »',
    chrono.includes('Fuite détectée'));
  verifier('la chronologie mentionne « Réparation tracée »',
    chrono.includes('Réparation tracée'));

  // 04-CONTROLES.csv : détection ET clôture présentes.
  const controlesCsv = new TextDecoder().decode(
    entrees.find((e) => e.nom === '04-CONTROLES.csv').octets);
  verifier('04-CONTROLES.csv liste le contrôle de détection',
    controlesCsv.includes(controleFuite.id));
  verifier('04-CONTROLES.csv liste le contrôle de clôture',
    controlesCsv.includes(controleSuivi.id));

  // 05-MOUVEMENTS-PENDANT-FUITE.csv : récupération ET complément, pas la MES.
  const mvtCsv = new TextDecoder().decode(
    entrees.find((e) => e.nom === '05-MOUVEMENTS-PENDANT-FUITE.csv').octets);
  verifier('05-MOUVEMENTS… liste la récupération et le complément, pas la mise en service',
    mvtCsv.includes(mvtRecup.id) && mvtCsv.includes(mvtAppoint.id)
    && !mvtCsv.includes(mes.id));

  // Accès par code public → même dossier.
  if (machine.codePublic) {
    const parCode = await genererDossierFuite(store, machine.codePublic, controleFuite.id);
    verifier('génération par code public → même nom de fichier',
      parCode.nomFichier === dossier.nomFichier);
  }
}

// ============================================================
// 2. Cas d'erreur
// ============================================================
{
  let leve = false;
  try { await genererDossierFuite(store, 'MACHINE-INEXISTANTE', controleFuite.id); }
  catch { leve = true; }
  verifier('machine inconnue → erreur', leve);
}
{
  let leve = false;
  try { await genererDossierFuite(store, machine.id, controleSuivi.id); }
  catch { leve = true; }
  verifier('contrôle CONFORME (pas un dossier de fuite) → erreur', leve);
}
{
  let leve = false;
  try { await genererDossierFuite(store, machine.id, 'controle-inconnu'); }
  catch { leve = true; }
  verifier('id de contrôle inconnu → erreur', leve);
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Dossier ZIP de fuite : tout est vert.');
