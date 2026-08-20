/* =====================================================================
   voix-textes.mjs — CE QUE LA VOIX DIRA, ÉCRAN PAR ÉCRAN
   ---------------------------------------------------------------------
   POURQUOI CE FICHIER. La ligne CO₂ parle avec la voix du navigateur.
   Le dépôt sait faire mieux : `moteur/voix.js` remplace une lecture par
   son enregistrement Piper dès que le texte figure à l'index. Encore
   faut-il connaître LE TEXTE EXACT que le module fera lire — sinon la
   clé ne correspond pas et l'enregistrement reste ignoré.

   Ce script reconstruit ces textes, à l'identique de `texteParle()` du
   moteur : mêmes morceaux, même ordre, même oralisation (le tableau
   ORALISER est LU dans moteur.js, jamais recopié — deux copies
   divergeraient au premier ajout de règle).

   SORTIE   sans argument : la liste, pour relecture ;
            avec --ecrire : fusion dans build/voix/captures-runtime.json,
            que `collecter-narrations.mjs` verse ensuite au corpus.

   ENSUITE  node build/voix/collecter-narrations.mjs
            python build/voix/generer-audios-piper.py --model <…>.onnx \
              --output packs/fluides/res/voix/audio --index moteur/voix-index.js

   ⚠️ Un enregistrement fige un texte. Tant que le fond n'est pas relu par
   un frigoriste, la synthèse du navigateur reste préférable : elle suit
   la moindre correction. C'est la règle posée pour les capsules le
   13/08/2026, et elle vaut ici.
   ===================================================================== */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, "../../../..");

globalThis.window = {};
new Function(readFileSync(join(ICI, "cours.js"), "utf8"))();
const COURS = globalThis.window.__INERWEB_COURSE__;

/* --- L'oralisation et le mélange, lus dans le moteur --------------- */
const MOTEUR = readFileSync(join(ICI, "moteur.js"), "utf8");
const bloc = (nom, ouvrant, fermant) => {
  const debut = MOTEUR.indexOf(ouvrant);
  if (debut < 0) throw new Error(`voix-textes : ${nom} introuvable dans moteur.js`);
  return MOTEUR.slice(debut + ouvrant.length, MOTEUR.indexOf(fermant, debut));
};
const ORALISER = eval("[" + bloc("ORALISER", "const ORALISER = [", "\n  ];") + "]");
const pourLaVoix = (t) => ORALISER.reduce((s, [m, r]) => s.replace(m, r), String(t)).trim();

function graine(texte) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i += 1) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function ordreDe(question, chapitre, nb) {
  let g = graine(question.id + "·" + chapitre);
  const idx = Array.from({ length: nb }, (_, j) => j);
  for (let k = nb - 1; k > 0; k -= 1) {
    g = Math.imul(g ^ (g >>> 15), 1 | g) >>> 0;
    [idx[k], idx[g % (k + 1)]] = [idx[g % (k + 1)], idx[k]];
  }
  return idx;
}

/* --- Les textes, dans l'ordre où l'élève les entend ---------------- */
const CAPTION_QUIZ = "Aucune donnée n’est transmise : le score reste dans ce navigateur.";
const narrations = [];
const ajouter = (texte, ou) => narrations.push({ texte: pourLaVoix(texte), source: `packs/fluides/res/co2-r744/${ou}` });

const ecran = (item) => {
  const parts = [item.kicker, item.title, item.lead, ...(item.bullets || [])];
  if (item.callout) parts.push(`${item.callout.title} : ${item.callout.text}`);
  if (item.caption) parts.push("Ce que montre le schéma. " + item.caption);
  return parts.filter(Boolean).join(". ");
};

for (const [i, c] of COURS.chapitres.entries()) {
  for (const l of c.lessons) ajouter(ecran(l), `${c.id}/${l.id}`);

  c.quiz.forEach((q, iq) => {
    const parts = [`Questions · escale ${i + 1}`, q.question, "Choisissez, puis lisez l’explication.",
      "Ce que montre le schéma. " + CAPTION_QUIZ];
    ordreDe(q, c.id, q.choices.length).forEach((j, rang) => {
      parts.push(`Réponse ${rang + 1}. ${q.choices[j]}`);
    });
    ajouter(parts.join(". "), `${c.id}/${q.id}`);
    ajouter(`Bonne réponse. ${q.explanation}`, `${c.id}/${q.id}-juste`);
    ajouter(`À reprendre. ${q.explanation}`, `${c.id}/${q.id}-faux`);
    void iq;
  });

  ajouter(ecran(c.final), `${c.id}/${c.final.id}`);
}

const signes = narrations.reduce((n, x) => n + x.texte.length, 0);
console.log(`${narrations.length} narrations · ${signes} signes · ${Math.round(signes / 850)} minutes de voix environ`);

if (process.argv.includes("--ecrire")) {
  const cible = join(RACINE, "build/voix/captures-runtime.json");
  const existant = existsSync(cible) ? JSON.parse(readFileSync(cible, "utf8")) : [];
  const vues = new Set(existant.map((x) => (x.texte ?? x.text ?? "").trim()));
  const ajouts = narrations.filter((x) => !vues.has(x.texte.trim()));
  writeFileSync(cible, JSON.stringify(existant.concat(ajouts), null, 2) + "\n", "utf8");
  console.log(`+${ajouts.length} narrations ajoutées à build/voix/captures-runtime.json (${existant.length} déjà présentes)`);
} else {
  for (const n of narrations.slice(0, 3)) console.log("\n· " + n.texte.slice(0, 220) + "…");
  console.log("\n(relance avec --ecrire pour verser au corpus de voix)");
}
