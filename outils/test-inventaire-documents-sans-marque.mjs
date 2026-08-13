// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// LE DOSSIER DE SIGNATURE COMPTE JUSTE (revue B6).
//
// Quatre pièces du dossier remis à l'établissement portent le MÊME
// inventaire — les documents qui sortent sans marque de non-officialité —
// et chacune annonce son nombre en toutes lettres dans son texte courant :
// « vingt et un autres documents ». L'inventaire est passé de dix-neuf à
// vingt et un entrées ; deux annonces sur dix étaient restées à
// « dix-neuf », dont celle du tableau de synthèse que le chef
// d'établissement signe. Personne ne l'a vu : rien ne reliait le nombre
// écrit à la liste comptée.
//
// Un nombre tenu par la seule vigilance du rédacteur n'est pas un nombre.
// Cette suite EST le lien manquant : elle compte la liste, et exige que
// toutes les annonces chiffrées des quatre pièces disent ce compte-là.
// Le nombre attendu est DÉDUIT de la liste, jamais écrit en dur ici :
// ajouter une entrée à l'inventaire ne casse pas la suite, oublier de
// mettre à jour une annonce la casse.
//
// Elle est VOLONTAIREMENT stricte : tout nombre écrit juste avant le mot
// « documents » dans ces quatre pièces doit être le compte. Si une phrase
// sans rapport (« les trois documents annexes ») la fait rougir un jour,
// l'échec nomme la phrase en clair : on la reformule, on ne desserre pas
// la garde. Un faux rouge coûte une minute ; un faux vert, c'est le
// chiffre faux qui repart à la signature.
//
// Elle vérifie aussi la promesse de vérification du § 5.3 lui-même
// (« la contre-épreuve rend vingt lignes ») : c'est un compte, il est
// cité comme preuve, il doit donc être vrai le jour de la signature.
//
// Exécution : node outils/test-inventaire-documents-sans-marque.mjs
// ============================================================

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

// Les quatre pièces qui reprennent l'inventaire à l'identique.
const PIECES = [
  'LIMITE-DE-RESPONSABILITE.md',
  'docs/POINTS-DE-FRICTION.md',
  'docs/REGISTRE-DES-ARBITRAGES.md',
  'docs/NOTE-DECISION-ETABLISSEMENT.md',
];

const ANCRE = '<a id="inventaire-documents-sans-marque">';
// Le paragraphe qui suit immédiatement la liste dans les quatre pièces.
const FIN_DE_LISTE = 'Une précision, pour éviter un contresens';

// Les signes diacritiques combinants, designes par leur code plutot que
// tapes en clair : un accent combinant est invisible dans une source.
const DIACRITIQUES = new RegExp(
  '[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']', 'g');

/** Minuscules, accents retirés, traits d'union et blancs normalisés. */
function normaliser(texte) {
  return texte.normalize('NFD').replace(DIACRITIQUES, '')
    .replace(/[’´`]/g, "'").replace(/[-—–]/g, ' ')
    .replace(/\s+/g, ' ').toLowerCase();
}

/** Le nombre écrit en toutes lettres, en français, de 1 à 69. */
const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit',
  'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf'];
const DIZAINES = { 20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante', 60: 'soixante' };
function enToutesLettres(n) {
  if (n < 20) return UNITES[n];
  if (n > 69) return null;
  const d = DIZAINES[Math.floor(n / 10) * 10];
  const u = n % 10;
  if (u === 0) return d;
  if (u === 1) return `${d} et un`;
  return `${d}-${UNITES[u]}`;
}
// Tous les nombres reconnus, du plus long au plus court : « vingt et un »
// doit l'emporter sur « un », sinon l'alternance mordrait au mauvais endroit.
const MOTS_NOMBRES = [];
for (let n = 1; n <= 69; n += 1) {
  const mot = enToutesLettres(n);
  if (mot) MOTS_NOMBRES.push(normaliser(mot));
}
MOTS_NOMBRES.sort((a, b) => b.length - a.length);
const ALTERNANCE = `(?:${MOTS_NOMBRES.map((m) => m.replace(/ /g, '\\s+')).join('|')}|\\d{1,3})`;

/** Texte d'une pièce, débarrassé du gras markdown et du préfixe de citation. */
function texteCourant(brut) {
  return normaliser(brut.split('\n').map((l) => l.replace(/^\s*>\s?/, '')).join(' ')
    .replace(/\*+/g, ' '));
}

/** Le bloc de liste numérotée, de l'entrée « 1. » à la fin de l'inventaire. */
function listeDeLInventaire(brut) {
  const lignes = brut.split('\n').map((l) => l.replace(/^\s*>\s?/, '').replace(/\s+$/, ''));
  const debutAncre = lignes.findIndex((l) => l.includes(ANCRE));
  if (debutAncre === -1) return null;
  const reste = lignes.slice(debutAncre + 1);
  const fin = reste.findIndex((l) => l.includes(FIN_DE_LISTE));
  const fenetre = fin === -1 ? reste : reste.slice(0, fin);
  const premiere = fenetre.findIndex((l) => /^1\.\s/.test(l));
  if (premiere === -1) return null;
  return fenetre.slice(premiere).filter((l) => l !== '');
}

// ---------------------------------------------------------------
// 1. Les quatre pièces existent et portent la MÊME liste.
// ---------------------------------------------------------------

const listes = new Map();
for (const piece of PIECES) {
  const chemin = join(RACINE, piece);
  if (!existsSync(chemin)) { verifier(`${piece} existe`, false); continue; }
  const liste = listeDeLInventaire(readFileSync(chemin, 'utf8'));
  verifier(`${piece} porte l'inventaire des documents sans marque`, liste !== null);
  if (liste) listes.set(piece, liste);
}

if (listes.size !== PIECES.length) {
  console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
  process.exit(1);
}

const [pieceReference] = PIECES;
const reference = listes.get(pieceReference).join('\n');
for (const piece of PIECES.slice(1)) {
  const copie = listes.get(piece).join('\n');
  verifier(`${piece} reprend l'inventaire à l'identique (${pieceReference})`,
    copie === reference,
    copie === reference ? '' : 'les listes ont divergé : la consigne ne porte plus sur les mêmes documents');
}

// ---------------------------------------------------------------
// 2. Le compte de référence est DÉDUIT de la liste.
// ---------------------------------------------------------------

const entrees = listes.get(pieceReference)
  .filter((l) => /^\d+\.\s/.test(l))
  .map((l) => ({ numero: Number(l.match(/^(\d+)\./)[1]), texte: l }));

const COMPTE = entrees.length;
const contigue = entrees.every((e, i) => e.numero === i + 1);
verifier(`l'inventaire est numéroté sans trou (1 à ${COMPTE})`, contigue,
  contigue ? '' : `numéros lus : ${entrees.map((e) => e.numero).join(', ')}`);

const MOT_ATTENDU = enToutesLettres(COMPTE);
verifier(`le compte de l'inventaire s'écrit en toutes lettres (${COMPTE} = « ${MOT_ATTENDU} »)`,
  MOT_ATTENDU !== null, 'compte hors de la table 1-69 : étendre enToutesLettres()');

// Les textes disent « N AUTRES documents » : le CERFA, seul document marqué,
// ne doit pas figurer dans la liste, sans quoi le mot « autres » serait faux.
const cerfaDansLaListe = entrees.filter((e) => /cerfa/i.test(e.texte));
verifier('le CERFA (seul document marqué) ne figure pas dans l\'inventaire des non marqués',
  cerfaDansLaListe.length === 0, cerfaDansLaListe.map((e) => e.texte).join(' | '));

// ---------------------------------------------------------------
// 3. Toutes les annonces chiffrées des quatre pièces disent ce compte.
// ---------------------------------------------------------------

const attenduNormalise = normaliser(MOT_ATTENDU ?? '');
const TOURNURES = [
  // « vingt et un documents », « vingt et un autres documents »
  new RegExp(`\\b${ALTERNANCE}\\s+(?:autres\\s+)?documents\\b`, 'g'),
  // « il y en a vingt et un »
  new RegExp(`\\bil y en a\\s+${ALTERNANCE}\\b`, 'g'),
  // « les vingt et un autres sortent sans marque »
  new RegExp(`\\b${ALTERNANCE}\\s+autres\\s+sortent\\b`, 'g'),
];
const NOMBRES_CONNUS = new Set(MOTS_NOMBRES);

for (const piece of PIECES) {
  const texte = texteCourant(readFileSync(join(RACINE, piece), 'utf8'));
  const annonces = [];
  for (const tournure of TOURNURES) {
    for (const trouve of texte.matchAll(tournure)) {
      const nombre = normaliser(trouve[0])
        .replace(/^il y en a\s+/, '')
        .replace(/\s+(?:autres\s+)?(?:documents|sortent)$/, '')
        .trim();
      // Un mot qui n'est pas un nombre (« ces documents ») ne compte rien.
      if (NOMBRES_CONNUS.has(nombre) || /^\d+$/.test(nombre)) {
        annonces.push({ nombre, extrait: trouve[0] });
      }
    }
  }
  verifier(`${piece} annonce le compte au moins une fois`, annonces.length > 0,
    'aucune annonce chiffrée trouvée : la garde ne mordrait sur rien dans cette pièce');

  const fausses = annonces.filter((a) => a.nombre !== attenduNormalise
    && a.nombre !== String(COMPTE));
  verifier(`${piece} : les ${annonces.length} annonce(s) disent toutes « ${MOT_ATTENDU} » (${COMPTE})`,
    fausses.length === 0,
    fausses.map((a) => `« ${a.extrait} »`).join(' | '));
}

// ---------------------------------------------------------------
// 4. La contre-épreuve citée au § 5.3 dit encore vrai.
//    Reproduction en Node de la commande écrite dans le document.
// ---------------------------------------------------------------

const MOTIF_MENTION = /MENTION_FORMATION|MODE FORMATION|NON OFFICIEL|non officiel/;

function lignesQuiPortentLaMention(dossier, prefixe, resultat) {
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const relatif = prefixe ? `${prefixe}/${entree.name}` : entree.name;
    if (entree.isDirectory()) {
      lignesQuiPortentLaMention(join(dossier, entree.name), relatif, resultat);
    } else if (entree.name.endsWith('.js') || entree.name.endsWith('.mjs')) {
      const lignes = readFileSync(join(dossier, entree.name), 'utf8').split('\n');
      for (const ligne of lignes) {
        if (MOTIF_MENTION.test(ligne)) resultat.push(relatif);
      }
    }
  }
  return resultat;
}

// ⚠ LOT 1 BRANCHE A (27/07/2026) — L'EXCEPTION EST NOMMÉE, PAS ÉLARGIE.
// Jusqu'à ce jour, un SEUL document du logiciel portait la mention de
// non-officialité : la fiche CERFA. Le justificatif de régularisation
// (v8/js/documents/regularisation.js), créé pour remplacer le CERFA d'une
// écriture d'annulation, la porte lui aussi — et c'est le RÉSULTAT VOULU :
// s'il en était sorti sans, il serait devenu le VINGT-DEUXIÈME document de
// l'inventaire ci-dessus, et la dette du dossier aurait grandi.
// L'exception est donc NOMMÉE fichier par fichier : tout AUTRE module qui
// se mettrait à porter la mention ferait rougir cette suite, comme avant.
// ⭐ REVUE DU 27/07 : l'exception était le FRAGMENT de chemin
// « regularisation » — tout futur fichier dont le chemin contient ce mot
// obtenait un laissez-passer sans que personne ne l'ait décidé. Une
// exception qui s'élargit toute seule n'est plus une exception. Les
// chemins sont donc EXACTS ; les trois fichiers concernés sont ceux que
// cite le § 5.3 de docs/NOTE-DECISION-ETABLISSEMENT.md.
const CHEMINS_MARQUES_EXACTS = new Set([
  'documents/regularisation.js',
  'documents/regularisation-apercu.js',
  'documents/test-justificatif-regularisation.mjs'
]);
const DOCUMENTS_MARQUES = [
  (chemin) => chemin.startsWith('cerfa/'),
  (chemin) => CHEMINS_MARQUES_EXACTS.has(chemin)
];
const porteuses = lignesQuiPortentLaMention(join(RACINE, 'v8', 'js'), '', []);
const horsMarques = porteuses.filter(
  (c) => !DOCUMENTS_MARQUES.some((estMarque) => estMarque(c)));
verifier('hors des deux documents MARQUÉS, aucune ligne ne porte la mention '
  + 'de formation (commande du § 5.3)',
horsMarques.length === 0, [...new Set(horsMarques)].join(', '));

// Le document annonce le nombre de lignes que rend la contre-épreuve.
const compteLignes = porteuses.length;
const motLignes = enToutesLettres(compteLignes);
const texteNote = texteCourant(readFileSync(join(RACINE, 'docs/NOTE-DECISION-ETABLISSEMENT.md'), 'utf8'));
const annonceLignes = texteNote.match(new RegExp(`\\brend\\s+${ALTERNANCE}\\s+lignes\\b`));
verifier('le § 5.3 annonce le nombre de lignes de sa contre-épreuve', annonceLignes !== null);
if (annonceLignes) {
  const dit = annonceLignes[0].replace(/^rend\s+/, '').replace(/\s+lignes$/, '').trim();
  verifier(`le § 5.3 annonce le bon nombre de lignes (« ${motLignes} » = ${compteLignes})`,
    dit === normaliser(motLignes ?? '') || dit === String(compteLignes),
    `le document dit « ${dit} », la commande rend ${compteLignes}`);
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
