/* =====================================================================
   LIVRET « inerweb.fr HabFluide » — LA MATRICE DE COUVERTURE
   ---------------------------------------------------------------------
   Avant d'écrire quelque part « l'intégralité du référentiel », il faut
   pouvoir le montrer ligne par ligne. Ce maillon le montre : pour chacun
   des 136 codes de l'arrêté du 21 novembre 2025 —

     · ce que le texte officiel exige, verbatim ;
     · pour quelles catégories, et en théorie (T) ou en pratique (P) ;
     · dans quel chapitre du livre il est traité ;
     · COMBIEN DE MOTS le livre lui consacre réellement.

   Ce dernier chiffre est le seul qui distingue « cité » de « traité ».
   Un code annoncé en tête de chapitre et expédié en deux lignes n'est
   pas couvert : la matrice le dit, et c'est elle qui doit décider d'un
   découpage en plusieurs tomes — pas une impression de volume.

   Sortie : dist/kdp/matrice-referentiel.md
   `node build/matrice-referentiel.mjs`
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPITRES } from './plan-chapitres.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const SOURCE = process.env.PILOTE_FLUIDES || 'C:/git/pilote-fluides';
const REF = JSON.parse(fs.readFileSync(path.join(SOURCE, 'packs', 'fluides', 'referentiel-2025.json'), 'utf8'));
const CONTENU = JSON.parse(fs.readFileSync(path.join(LIVRET, 'contenu.gen.json'), 'utf8'));

const CATS = ['A1', 'A2', 'B', 'C', 'D', 'E'];
const PREPAREES = ['A1', 'A2', 'D', 'E'];   // ce que ce tome annonce préparer

/* ---- Le référentiel, à plat ---- */
const codes = [];
for (const g of REF.groupes) {
  for (const c of g.codes || []) {
    codes.push({ ...c, groupe: g.id, groupeTitre: g.titre || '' });
  }
}

/* ---- Ce que le livre en fait ---- */
const mots = (s) => String(s).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
const parCode = new Map();          // code -> { chapitres:Set, mots:number }
for (const ch of CHAPITRES) {
  const contenu = CONTENU.chapitres.find((c) => c.num === ch.num);
  if (!contenu) continue;
  /* Le poids du chapitre : ses leçons, ses encadrés, son activité. On le
     répartit à parts égales entre les codes qu'il annonce traiter —
     approximation assumée, mais elle range les codes dans le bon ordre
     de grandeur, ce qu'aucune lecture à l'œil ne fait sur 136 lignes. */
  let poids = 0;
  for (const l of contenu.lecons || []) {
    for (const p of l.paras || []) poids += mots(p);
    for (const b of l.blocs || []) poids += mots(b.html || '');
  }
  const liste = ch.codes || [];
  const part = liste.length ? Math.round(poids / liste.length) : 0;
  for (const code of liste) {
    if (!parCode.has(code)) parCode.set(code, { chapitres: new Set(), mots: 0 });
    parCode.get(code).chapitres.add(ch.num);
    parCode.get(code).mots += part;
  }
}

/* ---- Le verdict, code par code ---- */
const SEUIL = 150;   // en dessous, le code est effleuré, pas traité
const verdict = (c) => {
  const vu = parCode.get(c.code);
  const exigeIci = PREPAREES.some((k) => c.cat[k] === 'T');
  const pratiqueIci = PREPAREES.some((k) => c.cat[k] === 'P');
  if (!vu) return exigeIci ? '**ABSENT**' : (pratiqueIci ? 'tome 2 (pratique)' : 'hors périmètre');
  if (!exigeIci && !pratiqueIci) return 'hors périmètre (cité)';
  if (!exigeIci && pratiqueIci) return vu.mots >= SEUIL ? 'théorie du geste' : 'effleuré → tome 2';
  return vu.mots >= SEUIL ? 'traité' : '**effleuré**';
};

const lignes = codes.map((c) => {
  const vu = parCode.get(c.code);
  const cats = CATS.map((k) => `${k}${c.cat[k] === '—' ? '·' : c.cat[k]}`).join(' ');
  return `| \`${c.code}\` | ${c.libelle.replace(/\|/g, '/').slice(0, 150)} | ${cats} | ${vu ? [...vu.chapitres].sort((a, b) => a - b).join(', ') : '—'} | ${vu ? vu.mots : 0} | ${verdict(c)} |`;
});

/* ---- Les comptes qui décident ---- */
const compte = (f) => codes.filter(f).length;
const theoriqueIci = codes.filter((c) => PREPAREES.some((k) => c.cat[k] === 'T'));
const traites = theoriqueIci.filter((c) => (parCode.get(c.code)?.mots || 0) >= SEUIL);
const effleures = theoriqueIci.filter((c) => (parCode.get(c.code)?.mots || 0) < SEUIL);
const pratiqueIci = codes.filter((c) => PREPAREES.some((k) => c.cat[k] === 'P'));
const horsPerimetre = codes.filter((c) => !PREPAREES.some((k) => c.cat[k] === 'T' || c.cat[k] === 'P'));

const md = `# Matrice de couverture du référentiel — inerweb.fr HabFluide

Générée par \`build/matrice-referentiel.mjs\` à chaque fabrication, depuis
\`referentiel-2025.json\` (verbatim de l'arrêté du 21 novembre 2025) et le
contenu réellement imprimé. Elle est la réponse à une seule question :
**qu'est-ce que ce livre couvre, et qu'est-ce qu'il ne couvre pas ?**

## Ce que l'arrêté demande

| | Codes |
|---|---|
| Total du référentiel | **${codes.length}** |
| Exigés en **théorie** pour A1, A2, D ou E — le périmètre de ce tome | **${theoriqueIci.length}** |
| Exigés en **pratique** pour ces mêmes catégories | **${pratiqueIci.length}** |
| Ne servant qu'aux catégories **B (CO₂)** et **C (NH₃)** | **${horsPerimetre.length}** |

Un code marqué **P** se valide « avec le matériel, l'outillage et
l'équipement nécessaires » (légende de l'arrêté) : aucun livre ne peut le
faire acquérir seul. Il peut en préparer la théorie du geste — c'est ce
que fait ce tome — mais l'atelier reste obligatoire.

## Ce que ce tome couvre

| | Codes | Part |
|---|---|---|
| Théorie exigée, **traitée** (≥ ${SEUIL} mots) | **${traites.length}** | ${Math.round(100 * traites.length / theoriqueIci.length)} % |
| Théorie exigée, **effleurée** (< ${SEUIL} mots) | ${effleures.length} | ${Math.round(100 * effleures.length / theoriqueIci.length)} % |
| Théorie exigée, **absente** | ${theoriqueIci.filter((c) => !parCode.has(c.code)).length} | — |

${effleures.length ? `### Les codes effleurés, à renforcer en priorité\n\n${effleures
    .map((c) => `- \`${c.code}\` (${parCode.get(c.code)?.mots || 0} mots) — ${c.libelle.slice(0, 120)}`).join('\n')}\n` : ''}
## Ce que ce tome ne couvre pas, et pourquoi

- **${pratiqueIci.length} codes pratiques** : gestes évalués en atelier — objet du tome 2.
- **${horsPerimetre.length} codes B et C** : le CO₂ et l'ammoniac sont d'autres
  attestations, passées par d'autres candidats. Les traiter sérieusement
  demande un volume propre, pas quelques chapitres annexes.

## La matrice, ligne par ligne

Colonne « catégories » : la lettre suivie de **T** (théorie), **P** (pratique)
ou **·** (non évalué). Colonne « mots » : ce que le livre consacre au code,
part du chapitre qui l'annonce.

| Code | Ce que l'arrêté exige | Catégories | Chapitre(s) | Mots | Couverture |
|---|---|---|---|---|---|
${lignes.join('\n')}
`;

const dossier = path.join(LIVRET, 'dist', 'kdp');
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, 'matrice-referentiel.md'), md, 'utf8');

console.log('Matrice de couverture du référentiel');
console.log(`  ${codes.length} codes · périmètre du tome : ${theoriqueIci.length} théoriques`);
console.log(`  traités ${traites.length} · effleurés ${effleures.length} · absents ${theoriqueIci.filter((c) => !parCode.has(c.code)).length}`);
console.log(`  hors périmètre : ${pratiqueIci.length} pratiques (tome 2) · ${horsPerimetre.length} pour B et C`);
console.log('✔ dist/kdp/matrice-referentiel.md');
