/* =====================================================================
   LIVRET « inerweb.fr HabFluide » — L'AUDIT DU RÉFÉRENTIEL
   ---------------------------------------------------------------------
   L'inventaire exhaustif : pour chaque compétence de l'arrêté du
   21 novembre 2025, SUR QUELLES PAGES du livre elle est vue, et combien
   de fois. Il ne s'appuie sur aucune déclaration d'intention : la source
   est `inventaire-pages.gen.json`, écrit par la finition à partir des
   codes réellement imprimés en pied de page.

   Le périmètre est la THÉORIE, et elle seule : les codes que l'arrêté
   évalue en épreuve pratique (P) sont comptés à part, car aucun livre ne
   peut les faire acquérir. Un code théorique absent est une faute ; un
   code pratique absent ne l'est pas.

   Sortie : dist/kdp/audit-referentiel.md
   `node build/audit-referentiel.mjs`
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const SOURCE = process.env.PILOTE_FLUIDES || 'C:/git/pilote-fluides';
const REF = JSON.parse(fs.readFileSync(path.join(SOURCE, 'packs', 'fluides', 'referentiel-2025.json'), 'utf8'));
const fichierInv = path.join(LIVRET, 'inventaire-pages.gen.json');
if (!fs.existsSync(fichierInv)) {
  console.error('\n✖ inventaire-pages.gen.json manque : lancez « npm run html » avant l’audit.');
  process.exit(1);
}
const INV = JSON.parse(fs.readFileSync(fichierInv, 'utf8'));

const PREPAREES = ['A1', 'A2', 'D', 'E'];   // les catégories que ce tome prépare

const codes = [];
for (const g of REF.groupes) {
  for (const c of g.codes || []) {
    const theorie = PREPAREES.some((k) => c.cat[k] === 'T');
    const pratique = PREPAREES.some((k) => c.cat[k] === 'P');
    codes.push({
      ...c,
      groupe: g.id,
      groupeTitre: g.titre || '',
      theorie,
      pratique,
      horsPerimetre: !theorie && !pratique,
      pages: INV[c.code] || [],
    });
  }
}

const theoriques = codes.filter((c) => c.theorie);
const pratiques = codes.filter((c) => c.pratique);
const hors = codes.filter((c) => c.horsPerimetre);

/* Un code vu sur une seule page est vu « en passant » ; on le signale. */
const MINCE = 2;
const absentsT = theoriques.filter((c) => !c.pages.length);
const mincesT = theoriques.filter((c) => c.pages.length && c.pages.length < MINCE);
const vusT = theoriques.filter((c) => c.pages.length >= MINCE);

const ligne = (c) => `| \`${c.code}\` | ${c.libelle.replace(/\|/g, '/').slice(0, 120)} | ${c.groupe} | ${c.pages.length} | ${c.pages.length ? c.pages.join(', ') : '—'} |`;

/* Le classement par fréquence : ce qui est martelé, ce qui est effleuré. */
const parFrequence = [...theoriques].sort((a, b) => b.pages.length - a.pages.length);

/* Les codes marqués en pied de page qui n'appartiennent PAS au référentiel
   théorique du tome : ni faute ni oubli, mais il faut savoir qu'ils sont là. */
const marquesHorsTheorie = Object.keys(INV)
  .filter((code) => {
    const c = codes.find((x) => x.code === code);
    return !c || !c.theorie;
  })
  .map((code) => ({ code, pages: INV[code].length, connu: !!codes.find((x) => x.code === code) }));

const md = `# Audit du référentiel — inerweb.fr HabFluide, tome 1

Inventaire exhaustif, page par page. La source n'est pas une déclaration
d'intention : ce sont les **codes réellement imprimés en pied de page** du
PDF fini, relevés par la finition.

**Périmètre : la THÉORIE des catégories A1, A2, D et E.** Les codes que
l'arrêté évalue en épreuve pratique — « le candidat exécute la tâche avec le
matériel, l'outillage et l'équipement nécessaires » — sont comptés à part :
aucun livre ne peut les faire acquérir, et leur absence n'est pas une faute.

---

## 1. Le verdict

| | Codes | État |
|---|---|---|
| **Théorie exigée, vue sur ${MINCE} pages ou plus** | **${vusT.length}** / ${theoriques.length} | ${vusT.length === theoriques.length ? '✔ complet' : ''} |
| Théorie exigée, vue sur 1 seule page | ${mincesT.length} | ${mincesT.length ? '⚠ à renforcer' : '✔ aucun'} |
| **Théorie exigée, ABSENTE** | **${absentsT.length}** | ${absentsT.length ? '✖ à traiter' : '✔ aucune'} |
| Pratique (épreuve en atelier) | ${pratiques.length} | hors périmètre du tome |
| Catégories B (CO₂) et C (NH₃) | ${hors.length} | autre attestation, autre public |

${absentsT.length ? `### ✖ Codes théoriques absents du livre\n\n${absentsT.map((c) => `- \`${c.code}\` — ${c.libelle.slice(0, 130)}`).join('\n')}\n` : ''}
${mincesT.length ? `### ⚠ Codes théoriques vus sur une seule page\n\n${mincesT.map((c) => `- \`${c.code}\` (page ${c.pages[0]}) — ${c.libelle.slice(0, 120)}`).join('\n')}\n` : ''}
---

## 2. Combien de fois chaque compétence est-elle vue ?

Du plus travaillé au moins travaillé. La colonne « pages » donne le nombre
de pages qui portent le code en pied ; le déséquilibre se lit d'un coup
d'œil, et se corrige en ajoutant ou en allégeant une leçon.

| Code | Ce que l'arrêté exige | Groupe | Pages | Où |
|---|---|---|---|---|
${parFrequence.map(ligne).join('\n')}

---

## 3. Les codes pratiques, pour mémoire

Ils sont **hors du périmètre théorique**. Le livre en donne la théorie du
geste quand elle éclaire l'examen écrit, mais leur validation se fait en
atelier. S'ils apparaissent ci-dessous avec des pages, c'est cette théorie
du geste qui est comptée — pas une prétention à remplacer la pratique.

| Code | Ce que l'arrêté exige | Pages |
|---|---|---|
${pratiques.map((c) => `| \`${c.code}\` | ${c.libelle.replace(/\|/g, '/').slice(0, 110)} | ${c.pages.length} |`).join('\n')}

---

## 4. Contrôle de cohérence

${marquesHorsTheorie.length
    ? `Codes marqués en pied de page hors de la théorie A1/A2/D/E :\n\n${marquesHorsTheorie
      .map((m) => `- \`${m.code}\` — ${m.pages} page(s)${m.connu ? '' : ' — **ce code n’existe pas au référentiel : à corriger dans la carte source**'}`).join('\n')}`
    : 'Tous les codes marqués en pied de page appartiennent à la théorie du périmètre.'}

---

*Régénéré à chaque fabrication par \`npm run audit\`. Si un code change de
place dans le livre, ce tableau le suit sans intervention.*
`;

const dossier = path.join(LIVRET, 'dist', 'kdp');
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, 'audit-referentiel.md'), md, 'utf8');

console.log('Audit du référentiel');
console.log(`  théorie A1/A2/D/E : ${vusT.length} vus · ${mincesT.length} sur une seule page · ${absentsT.length} absents`);
if (absentsT.length) console.log(`  ✖ absents : ${absentsT.map((c) => c.code).join(', ')}`);
const inconnus = marquesHorsTheorie.filter((m) => !m.connu);
if (inconnus.length) console.log(`  ✖ codes inconnus du référentiel : ${inconnus.map((m) => m.code).join(', ')}`);
console.log('✔ dist/kdp/audit-referentiel.md');
if (absentsT.length || inconnus.length) process.exit(1);
