/* =====================================================================
   controle-quiz.mjs — LES QUESTIONS SE DEVINENT-ELLES SANS LIRE ?
   ---------------------------------------------------------------------
   Deux défauts rendent un quiz contournable, et les deux se mesurent :

     1. LA PLACE. Si la bonne réponse est presque toujours la première,
        cliquer la première case suffit. C'est exactement ce qui a été
        relevé sur un module importé le 31/07/2026 : positions
        1,0,1,1,0,0,0,0,0,0 et un seuil à 8 sur 10.
        Ici, `moteur.js` mélange les propositions à partir de
        l'identifiant de la question. Ce contrôle REFAIT ce mélange et
        mesure la place RÉELLEMENT VUE par l'élève, pas celle du fichier.
     2. LA LONGUEUR. Si la bonne réponse est presque toujours la plus
        longue, la lire suffit à la reconnaître sans rien comprendre.
        Aucun mélange n'y peut rien : c'est la rédaction qui répartit.

   Le contrôle est ASYMÉTRIQUE : il prouve un défaut, jamais la qualité
   pédagogique d'une question. Il sort en code 1 si un seuil est dépassé.

   USAGE   node packs/fluides/res/co2-r744/controle-quiz.mjs
   ===================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
globalThis.window = {};
new Function(readFileSync(join(ICI, "cours.js"), "utf8"))();
const COURS = globalThis.window.__INERWEB_COURSE__;

/* Le mélange du moteur, à l'identique. Si l'un des deux change, les
   chiffres de ce contrôle cessent de décrire ce que voit l'élève. */
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

const questions = COURS.chapitres.flatMap((c) => c.quiz.map((q) => ({ ...q, chapitre: c.id })));
const places = new Map();
let plusLongue = 0;
const suspectes = [];

for (const q of questions) {
  const ordre = ordreDe(q, q.chapitre, q.choices.length);
  const vue = ordre.indexOf(q.answer);
  places.set(vue, (places.get(vue) || 0) + 1);

  const longueurs = q.choices.map((c) => c.length);
  if (longueurs[q.answer] === Math.max(...longueurs)) {
    plusLongue += 1;
    suspectes.push(`${q.chapitre} · ${q.id}`);
  }
}

const total = questions.length;
const partPlace = Math.max(...places.values()) / total;
const partLongueur = plusLongue / total;

console.log(`${total} questions dans ${COURS.chapitres.length} escales`);
console.log("place RÉELLE de la bonne réponse à l’écran :",
  [...places.entries()].sort((a, b) => a[0] - b[0]).map(([p, n]) => `${p + 1}ᵉ : ${n}`).join(" · "),
  `— rang dominant ${Math.round(partPlace * 100)} %`);
console.log(`la bonne réponse est la plus longue : ${plusLongue} fois sur ${total} (${Math.round(partLongueur * 100)} %)`);

let defaut = false;
if (partPlace > 0.5) {
  console.error(`\n❌ UNE PLACE DOMINE : ${Math.round(partPlace * 100)} % des bonnes réponses au même rang à l’écran.`);
  defaut = true;
}
if (partLongueur > 0.5) {
  console.error(`\n❌ LA LONGUEUR TRAHIT : ${Math.round(partLongueur * 100)} % des bonnes réponses sont les plus longues.`);
  console.error("   " + suspectes.join("\n   "));
  defaut = true;
}
if (!defaut) console.log("\n✅ Ni la place à l’écran ni la longueur ne donnent la réponse.");
process.exit(defaut ? 1 : 0);
