/* =====================================================================
   LIVRET « inerweb.fr HabFluide » — LE REGISTRE DES DROITS D'IMAGES
   ---------------------------------------------------------------------
   La relecture éditoriale l'a dit justement : « tous les visuels viennent
   de la bibliothèque inerWeb » est une déclaration, pas une preuve. Ce
   maillon produit la preuve : un registre asset par asset — auteur,
   source, licence — lu dans les MÉTADONNÉES des fichiers eux-mêmes
   (Dublin Core des SVG), jamais recopié à la main.

   Il a aussi le droit d'arrêter la chaîne : si un visuel utilisé sous
   licence CC BY n'est pas crédité dans les pages du livre, la
   fabrication échoue — l'attribution n'est pas optionnelle.

   Sortie : dist/kdp/registre-visuels.md
   `node build/registre-visuels.mjs`
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const SOURCE = process.env.PILOTE_FLUIDES || 'C:/git/pilote-fluides';
const VISUELS = JSON.parse(fs.readFileSync(path.join(LIVRET, 'visuels.gen.json'), 'utf8'));

const dc = (texte, balise) => {
  const m = new RegExp(`<dc:${balise}>([\\s\\S]*?)</dc:${balise}>`).exec(texte);
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
};

/* Ce que sont les familles — la règle générale, que les métadonnées
   d'un fichier précisent ou contredisent. */
const FAMILLES = {
  pack: 'Planche sécurité v2, SVG original construit par OpenAI Codex sous direction de F. Henninot',
  svg: 'Planche technique dessinée pour inerWeb',
  sym: 'Symbole fluidique de la charte inerWeb',
  illu: 'Illustration de la bibliothèque inerWeb (image générée par IA sous direction de F. Henninot)',
  amb: "Illustration d'ambiance de la bibliothèque inerWeb (image générée par IA sous direction de F. Henninot)",
  ico: 'Icône de la bibliothèque inerWeb (image générée par IA sous direction de F. Henninot)',
};

const lignes = [];
const attributions = new Map();   // texte d'attribution -> [refs]

for (const [ref, v] of Object.entries(VISUELS).sort()) {
  const famille = ref.split(':')[0];
  const chemin = path.join(SOURCE, v.source);
  let auteur = 'F. Henninot (inerWeb)';
  let origine = FAMILLES[famille] || famille;
  let licence = '© inerWeb, tous droits réservés';

  if (v.source.endsWith('.svg') && fs.existsSync(chemin)) {
    const s = fs.readFileSync(chemin, 'utf8');
    const createur = dc(s, 'creator');
    const src = dc(s, 'source');
    const droits = dc(s, 'rights');
    if (createur) auteur = createur;
    if (src) origine = src;
    if (droits) licence = droits;
    if (/CC\s*BY/i.test(droits)) {
      attributions.set(droits, [...(attributions.get(droits) || []), ref]);
    }
  }
  lignes.push(`| \`${ref}\` | ${v.source} | ${auteur} | ${licence} | ${v.citations} |`);
}

/* ---- L'attribution CC BY doit être IMPRIMÉE dans le livre ---- */
const liminaires = fs.readFileSync(path.join(ICI, 'textes-liminaires.mjs'), 'utf8');
const manquantes = [...attributions.keys()].filter(() => !/QElectroTech/.test(liminaires));
if (attributions.size && manquantes.length) {
  console.error('\n✖ Des visuels sous licence CC BY sont utilisés sans crédit imprimé :');
  for (const [droits, refs] of attributions) console.error(`  · ${refs.join(', ')}\n    ${droits}`);
  console.error('  → ajouter l\u2019attribution à la page « crédits » (textes-liminaires.mjs).');
  process.exit(1);
}

const compte = {};
for (const ref of Object.keys(VISUELS)) {
  const f = ref.split(':')[0];
  compte[f] = (compte[f] || 0) + 1;
}

const md = `# Registre des droits d'images — inerweb.fr HabFluide, tome 1

Généré à chaque fabrication par \`build/registre-visuels.mjs\`, à partir des
**métadonnées Dublin Core** embarquées dans les fichiers sources — jamais
recopié à la main. Il couvre les ${Object.keys(VISUELS).length} visuels du livre
(${Object.entries(compte).map(([f, n]) => `${n} ${f}`).join(' · ')}).

**Règles de la chaîne** : les images \`bib-*\` (supports AFPA, TP d'autres
enseignants, documentation constructeur) sont écartées d'office par
\`visuels.mjs\` — aucune ne peut entrer dans le livre. Les visuels sous
licence CC BY font échouer la fabrication si leur crédit n'est pas imprimé.

${attributions.size
    ? `## Attributions requises (imprimées en page crédits)\n\n${[...attributions.entries()]
      .map(([droits, refs]) => `- ${refs.map((r) => `\`${r}\``).join(', ')} — ${droits}`).join('\n')}\n`
    : `## Attributions requises\n\nAucune : aucun visuel du livre ne vient de la collection QElectroTech\nni d'une autre source sous licence à attribution.\n`}
## La couverture

La couverture (générée par \`build/couverture.mjs\`) ne contient que des
éléments dessinés dans son propre code : la croix du frigoriste (SVG écrit
dans le fichier), le logo inerWeb (texte composé en Trebuchet MS et Segoe
Script, polices du système utilisées conformément à leur licence Windows),
et le flocon ❄ (caractère Unicode). Aucune image importée.

## Le registre, asset par asset

| Référence | Fichier source (dépôt pilote-fluides) | Auteur | Licence / droits | Citations |
|---|---|---|---|---|
${lignes.join('\n')}
`;

const dossier = path.join(LIVRET, 'dist', 'kdp');
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, 'registre-visuels.md'), md, 'utf8');

console.log('Registre des droits d\u2019images');
console.log(`  ${Object.keys(VISUELS).length} visuels · ${attributions.size ? [...attributions.values()].flat().length + ' sous CC BY (crédit imprimé vérifié)' : 'aucune licence à attribution'}`);
console.log('✔ dist/kdp/registre-visuels.md');
