/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — EXTRACTEUR DE CONTENU
   ---------------------------------------------------------------------
   Premier maillon de la chaîne (`npm run extraire`). Il ne rédige RIEN :
   il va chercher, dans la source éditoriale du pack « Habilitation
   fluides frigorigènes » (dépôt frigorx/pilote-fluides, écrit par
   F. Henninot), le texte que `plan-chapitres.mjs` désigne page par page,
   et le dépose dans `livret/contenu.gen.json` pour les maillons suivants.

   Ce qu'il lit :
     packs/fluides/cartes.js       → les fiches de cours (paragraphes,
                                     blocs « à retenir » / « piège »,
                                     question de fin de fiche)
     packs/fluides/banque.gen.json → la banque d'entraînement, filtrée
                                     par chapitre

   Ce qui ne s'approche jamais du livret : les 89 questions OFFICIELLES
   (ids `pk-*`). Attention, la banque les CONTIENT — mêlées aux 180
   questions publiques `q-*` — donc on les écarte du tirage, et un
   verrou final vérifie qu'aucune n'a filtré.

   Le chapitre marqué `genere:` dans le plan (les sept catégories) n'a
   pas de fiche source : il sera rédigé par `contenu-categories.mjs` à
   partir du référentiel. Ici, on ne pose qu'un jalon.

   L'extracteur ÉCHOUE (code 1) si une seule désignation du plan ne
   trouve pas sa cible : fiche absente, paragraphe hors limite, bloc
   manquant, chapitre sans aucune question. Un livret ne s'imprime pas
   avec des trous.
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CHAPITRES } from './plan-chapitres.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const SORTIE = path.join(ICI, '..', 'contenu.gen.json');

/* La source vit dans son propre dépôt. Chemin d'atelier par défaut,
   surchargeable pour une autre machine : PILOTE_FLUIDES=<chemin>. */
const SOURCE = process.env.PILOTE_FLUIDES || 'C:/git/pilote-fluides';
const PACK = path.join(SOURCE, 'packs', 'fluides');

if (!fs.existsSync(path.join(PACK, 'cartes.js'))) {
  console.error(`Source introuvable : ${PACK}\n` +
    `Cloner frigorx/pilote-fluides, ou pointer PILOTE_FLUIDES vers le dépôt.`);
  process.exit(1);
}

const { CARTES } = await import(pathToFileURL(path.join(PACK, 'cartes.js')).href);
const BANQUE = JSON.parse(fs.readFileSync(path.join(PACK, 'banque.gen.json'), 'utf8'));

/* La trace de source : quel commit de pilote-fluides a fourni le texte.
   Sans elle, impossible de savoir quel livret correspond à quel état
   du pack. */
let sourceCommit = '(hors git)';
try {
  sourceCommit = execSync('git rev-parse --short HEAD', { cwd: SOURCE }).toString().trim();
} catch { /* dépôt absent ou git indisponible : la mention suffit */ }

const parId = new Map(CARTES.map((c) => [c.id, c]));
const erreurs = [];

/* ------------------------------------------------------------------
   Le corps d'une fiche est du HTML concaténé : boutons-capsules,
   schémas, photos, puis les paragraphes de cours. Le livret ne veut
   que ces derniers — les visuels, le plan les désigne lui-même, et
   les capsules audio deviennent des QR codes.
   ------------------------------------------------------------------ */
const paragraphes = (corps) => {
  const texte = (corps || '')
    .replace(/<p class="lien-experience"[\s\S]*?<\/p>/g, '')
    .replace(/<figure[\s\S]*?<\/figure>/g, '')
    .replace(/<img [^>]*>/g, '');
  return (texte.match(/<p[^>]*>[\s\S]*?<\/p>/g) || [])
    .map((p) => p.replace(/^<p[^>]*>/, '').replace(/<\/p>$/, '').trim());
};

/* Une désignation du plan (src + paras + blocs) devient un extrait. */
const extraire = (ou, { src, paras = 'tous', blocs = [] }) => {
  const carte = parId.get(src);
  if (!carte) { erreurs.push(`${ou} : fiche « ${src} » introuvable dans cartes.js`); return null; }
  const tous = paragraphes(carte.corps);
  const indices = paras === 'tous' ? tous.map((_, i) => i) : paras;
  const horsLimite = indices.filter((i) => i < 0 || i >= tous.length);
  if (horsLimite.length) {
    erreurs.push(`${ou} : fiche « ${src} » a ${tous.length} paragraphes (0–${tous.length - 1}), ` +
      `le plan demande ${horsLimite.join(', ')}`);
  }
  const blocsManquants = blocs.filter((i) => !(carte.blocs || [])[i]);
  if (blocsManquants.length) {
    erreurs.push(`${ou} : fiche « ${src} » n'a pas de bloc ${blocsManquants.join(', ')}`);
  }
  return {
    src,
    titre_source: carte.titre,
    paras: indices.filter((i) => i >= 0 && i < tous.length).map((i) => tous[i]),
    blocs: blocs.map((i) => (carte.blocs || [])[i]).filter(Boolean),
    question: carte.question || null,
  };
};

/* ------------------------------------------------------------------
   Les questions d'entraînement d'un chapitre : celles des groupes
   du plan (`groupesQ`). Quand le plan précise des codes (`codesQ`),
   les questions codées se resserrent sur ces codes ; celles sans code
   (sécurité hors référentiel) restent — c'est leur raison d'être.
   ------------------------------------------------------------------ */
const questionsDe = (ch) => {
  let pool = BANQUE.filter((q) => !String(q.id).startsWith('pk-') &&
    (ch.groupesQ || []).includes(q.dc));
  if (ch.codesQ) pool = pool.filter((q) => !q.code || ch.codesQ.includes(q.code));
  return pool;
};

/* ------------------------------------------------------------------ */
const chapitres = CHAPITRES.map((ch) => {
  const ou = `chapitre ${ch.num} « ${ch.titre} »`;
  const questions = questionsDe(ch);
  if (!questions.length) erreurs.push(`${ou} : aucune question dans la banque pour ${JSON.stringify(ch.groupesQ)}`);

  if (ch.genere) {
    return { num: ch.num, genere: ch.genere, questions };
  }

  const lecons = (ch.lecons || []).map((l, i) => {
    const e = extraire(`${ou}, leçon ${i + 1} « ${l.t} »`, l);
    return e && { t: l.t, ...e };
  }).filter(Boolean);

  /* L'activité de fin de chapitre peut s'appuyer sur une fiche
     exercice (`src`) : son texte et sa question viennent alors aussi
     de la source. Sans `src`, l'activité vit toute entière dans le plan. */
  const activite = ch.activite?.src
    ? extraire(`${ou}, activité « ${ch.activite.t} »`, { src: ch.activite.src })
    : null;

  return { num: ch.num, lecons, activite, questions };
});

/* Verrou : aucune question officielle (ids `pk-*`) ne doit s'être
   glissée dans l'extraction, d'où qu'elle vienne. */
const officielle = chapitres.flatMap((c) => c.questions).find((q) => String(q.id).startsWith('pk-'));
if (officielle) erreurs.push(`question officielle « ${officielle.id} » détectée : interdite dans le livret`);

/* ------------------------------------------------------------------ */
if (erreurs.length) {
  console.error(`\n✖ Extraction refusée — ${erreurs.length} manque(s) :\n`);
  erreurs.forEach((e) => console.error('  · ' + e));
  process.exit(1);
}

fs.writeFileSync(SORTIE, JSON.stringify({
  source: { depot: 'frigorx/pilote-fluides', commit: sourceCommit },
  chapitres,
}, null, 1), 'utf8');

let nParas = 0; let nBlocs = 0; let nQ = 0;
console.log('Extraction du livret — tome 1\n');
for (const c of chapitres) {
  const plan = CHAPITRES.find((p) => p.num === c.num);
  if (c.genere) { console.log(`  ch ${String(c.num).padStart(2)} — (généré : ${c.genere}) · ${c.questions.length} q.`); nQ += c.questions.length; continue; }
  const paras = c.lecons.reduce((s, l) => s + l.paras.length, 0) + (c.activite?.paras.length || 0);
  const blocs = c.lecons.reduce((s, l) => s + l.blocs.length, 0);
  nParas += paras; nBlocs += blocs; nQ += c.questions.length;
  console.log(`  ch ${String(c.num).padStart(2)} — ${c.lecons.length} leçons · ${paras} § · ${blocs} blocs · ${c.questions.length} q.  (${plan.titre})`);
}
console.log(`\n✔ ${chapitres.length} chapitres · ${nParas} paragraphes · ${nBlocs} blocs · ${nQ} questions`);
console.log(`  source : ${sourceCommit} → ${path.relative(process.cwd(), SORTIE)}`);
