// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
//
// FABRIQUER LE LOT AUDIO DE LA VISITE GUIDÉE — outil d'emballage, jamais
// du produit (patron `build/voix/generer-audios-piper.py` de Pilote
// Fluides, transposé : même voix, même recette d'empreinte).
//
// Ce que fait l'outil : il LIT le module de la visite (l'écran est la
// seule source de vérité des textes), fabrique un MP3 par texte avec
// Piper (voix française fr_FR-siwis-medium, locale — aucun service
// distant), et RÉÉCRIT l'index `v8/res/voix-visite/index.js` (à ne
// jamais éditer à la main). Un fichier déjà en place est conservé :
// la clé est l'empreinte du texte, même clé = même texte.
//
// Prérequis sur le poste (fabrication seulement — la démo ne dépend
// jamais du lot : sans lot, la visite parle avec la voix du navigateur) :
//   - Piper (https://github.com/rhasspy/piper), binaire `piper` ;
//   - le modèle de voix `fr_FR-siwis-medium.onnx` (+ son .json à côté) ;
//   - ffmpeg (encodage MP3).
//
// Usage :
//   IWF_PIPER_MODELE=chemin/vers/fr_FR-siwis-medium.onnx node outils/generer-voix-visite.mjs
//   (variables facultatives : IWF_PIPER=piper, IWF_FFMPEG=ffmpeg ;
//    option --nettoyer : supprime les MP3 orphelins, sinon ils sont listés)

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RACINE = path.resolve(import.meta.dirname, '..');
const DOSSIER_LOT = path.join(RACINE, 'v8', 'res', 'voix-visite');
const DOSSIER_AUDIO = path.join(DOSSIER_LOT, 'audio');
const FICHIER_INDEX = path.join(DOSSIER_LOT, 'index.js');

const PIPER = process.env.IWF_PIPER || 'piper';
const MODELE = process.env.IWF_PIPER_MODELE || '';
const FFMPEG = process.env.IWF_FFMPEG || 'ffmpeg';
const NETTOYER = process.argv.includes('--nettoyer');

// Les modules de la visite touchent au DOM à l'import de leurs voisins :
// le shim des suites de tests suffit (aucun navigateur pour fabriquer).
const { installerDocumentFactice } = await import('../v8/js/core/shim-dom-tests.mjs');
installerDocumentFactice();
const { PARCOURS_VISITE } = await import('../v8/js/composants/visite-guidee.js');
const {
  textesNarrationEtape, TEXTE_PRESENTATION, TEXTE_FIN,
  empreinteTexte, normaliserTexte, texteADire
} = await import('../v8/js/composants/voix-visite.js');

/* ---------- le corpus : l'écran, rien que l'écran ---------- */

const corpus = [];
const vues = new Set();
function ajouter(texte) {
  const normalise = normaliserTexte(texte);
  if (!normalise) return;
  const cle = empreinteTexte(normalise);
  if (vues.has(cle)) return;
  vues.add(cle);
  corpus.push({ cle, texte: normalise });
}
ajouter(TEXTE_PRESENTATION);
for (const parcours of PARCOURS_VISITE) {
  for (const etape of parcours.etapes) {
    for (const texte of textesNarrationEtape(etape)) ajouter(texte);
  }
}
ajouter(TEXTE_FIN);

console.log(`Corpus : ${corpus.length} narrations (l'écran est la source).`);

/* ---------- les outils du poste ---------- */

function outilPresent(commande, args) {
  try {
    const essai = spawnSync(commande, args, { stdio: 'ignore' });
    return !essai.error;
  } catch (erreur) {
    return false;
  }
}

if (!MODELE || !fs.existsSync(MODELE)) {
  console.error('MANQUE : le modèle de voix. Donnez IWF_PIPER_MODELE='
    + 'chemin/vers/fr_FR-siwis-medium.onnx (le .json doit être à côté).');
  console.error('Sans lot audio, la visite parle déjà — voix du navigateur (repli prévu).');
  process.exit(1);
}
if (!outilPresent(PIPER, ['--help'])) {
  console.error(`MANQUE : Piper introuvable (« ${PIPER} »). Installez-le ou donnez IWF_PIPER=.`);
  process.exit(1);
}
if (!outilPresent(FFMPEG, ['-version'])) {
  console.error(`MANQUE : ffmpeg introuvable (« ${FFMPEG} »). Installez-le ou donnez IWF_FFMPEG=.`);
  process.exit(1);
}

/* ---------- la fabrication ---------- */

fs.mkdirSync(DOSSIER_AUDIO, { recursive: true });
const dossierTravail = fs.mkdtempSync(path.join(os.tmpdir(), 'voix-visite-'));

let fabriques = 0;
let conserves = 0;
const rates = [];

for (const { cle, texte } of corpus) {
  const cibleMp3 = path.join(DOSSIER_AUDIO, cle + '.mp3');
  if (fs.existsSync(cibleMp3)) { conserves += 1; continue; }

  const wav = path.join(dossierTravail, cle + '.wav');
  // Piper reçoit le texte tel qu'il se DIT (la clé, elle, reste l'écran).
  const piper = spawnSync(PIPER, ['--model', MODELE, '--output_file', wav], {
    input: texteADire(texte), encoding: 'utf8'
  });
  if (piper.status !== 0 || !fs.existsSync(wav)) {
    rates.push({ cle, etape: 'piper', detail: (piper.stderr || '').slice(0, 200) });
    continue;
  }
  const ffmpeg = spawnSync(FFMPEG, [
    '-y', '-loglevel', 'error', '-i', wav,
    '-ac', '1', '-ar', '22050', '-b:a', '48k', cibleMp3
  ], { encoding: 'utf8' });
  if (ffmpeg.status !== 0 || !fs.existsSync(cibleMp3)) {
    rates.push({ cle, etape: 'ffmpeg', detail: (ffmpeg.stderr || '').slice(0, 200) });
    continue;
  }
  fabriques += 1;
  console.log(`  fabriqué  ${cle}.mp3  (${texte.slice(0, 52)}…)`);
}

fs.rmSync(dossierTravail, { recursive: true, force: true });

if (rates.length) {
  console.error(`\n${rates.length} narration(s) en échec :`);
  for (const rate of rates) console.error(`  ${rate.cle} (${rate.etape}) ${rate.detail}`);
  console.error('Index NON réécrit : le lot doit être complet ou ne pas être.');
  process.exit(1);
}

/* ---------- les orphelins (textes disparus de l'écran) ---------- */

const orphelins = fs.readdirSync(DOSSIER_AUDIO)
  .filter((nom) => nom.endsWith('.mp3') && !vues.has(nom.slice(0, -4)));
for (const nom of orphelins) {
  if (NETTOYER) {
    fs.rmSync(path.join(DOSSIER_AUDIO, nom));
    console.log(`  supprimé (orphelin) ${nom}`);
  } else {
    console.log(`  ORPHELIN (texte disparu de l'écran) : ${nom} — --nettoyer pour supprimer`);
  }
}

/* ---------- l'index, réécrit en entier ---------- */

const entrees = {};
for (const { cle } of [...corpus].sort((a, b) => a.cle.localeCompare(b.cle))) {
  const fichier = path.join(DOSSIER_AUDIO, cle + '.mp3');
  const octets = fs.readFileSync(fichier);
  entrees[cle] = {
    fichier: 'audio/' + cle + '.mp3',
    sha256: crypto.createHash('sha256').update(octets).digest('hex').slice(0, 16),
    octets: octets.length
  };
}

const index = {
  version: '1',
  voix: 'fr_FR-siwis-medium',
  moteur: 'Piper / VITS',
  modeleFabrication: path.basename(MODELE),
  frequenceHz: 22050,
  debitKbps: 48,
  narrationsAttendues: corpus.length,
  entrees
};

fs.writeFileSync(FICHIER_INDEX,
  '/* Index du lot audio de la visite guidée — GÉNÉRÉ par\n'
  + '   `node outils/generer-voix-visite.mjs` : ne pas modifier à la main.\n'
  + '   Un texte absent d\'ici retombe sur la voix du navigateur. */\n'
  + 'export const INDEX_VOIX_VISITE = ' + JSON.stringify(index, null, 2) + ';\n');

console.log(`\nFAIT — ${fabriques} fabriqué(s), ${conserves} conservé(s), `
  + `${orphelins.length} orphelin(s)${NETTOYER ? ' supprimés' : ''}. Index réécrit.`);
console.log('Rejouez ensuite : node outils/lancer-tests.mjs --tout (cohérence index/fichiers).');
