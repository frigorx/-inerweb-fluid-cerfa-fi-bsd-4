/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — LE COMBLEMENT
   ---------------------------------------------------------------------
   La maquette du 30/08 pose la règle : « aucune page ne se termine sur
   du vide ». Ce maillon (`npm run combler`) affecte aux pieds de page
   vides une planche de la RÉSERVE — les planches dessinées pour le
   livre qu'aucune page n'utilise encore — par SUJET de chapitre, jamais
   pour boucher : un chapitre sans planche pertinente garde ses blancs.

   Il travaille sur le relevé `blancs.gen.json` que la finition écrit à
   chaque fabrication (blanc de pied et dernière ancre @@P|ch-n@@ de
   chaque page de contenu), et produit `comblement.gen.json`, que
   pages.mjs lit à la fabrication suivante : la planche s'imprime après
   son ancre, PLAFONNÉE à la hauteur du blanc mesuré — elle ne déplace
   donc jamais la pagination qui l'a désignée.

   Le cycle complet, à rejouer quand le texte a bougé — il part TOUJOURS
   d'une fabrication nue (le relevé d'un livre déjà comblé fausserait
   l'affectation, les blancs y sont déjà remplis) :
     supprimer comblement.gen.json
     npm run html      → fabrique nu + relève les blancs
     npm run combler   → affecte la réserve
     npm run visuels   → convertit les planches retenues (et purge les autres)
     npm run html      → fabrique le livre comblé
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');

/* ------------------------------------------------------------------
   LA RÉSERVE, chapitre par chapitre. L'ordre est une préférence : la
   première planche de la liste va au plus grand blanc du chapitre.

   SEULES les treize planches v2 dessinées POUR le livre sont
   éligibles. Les planches du pack en ligne restées sans page ont été
   regardées une à une et écartées sur pièce : état final d'animation
   illisible une fois figé (intro-securite superpose ses écrans,
   s1-double-accident double son libellé), libellé coupé au bord
   (coup-de-liquide-principe), ou doublon d'une planche déjà remplacée
   par sa v2 (secu-*). Une planche défectueuse est pire qu'un blanc.

   Chaque légende est une phrase d'USAGE : le titre est déjà écrit dans
   le bandeau du dessin, le répéter dessous ferait un doublon.
   ------------------------------------------------------------------ */
const RESERVE = {
  1: [{ ref: 'pack:consignation-cinq-etapes', legende: 'À dérouler avant de toucher au circuit — l’ordre ne s’inverse pas.' }],
  4: [{ ref: 'pack:categories-champs', legende: 'Repérez votre colonne : elle dit ce que votre attestation couvre.' }],
  5: [{ ref: 'pack:croix-frigoriste-etats', legende: 'La croix se lit organe par organe — l’état du fluide à chaque coin.' }],
  6: [{ ref: 'pack:logph-lecture', legende: 'Le cycle se lit sur le diagramme, jamais de mémoire.' }],
  7: [{ ref: 'pack:mesures-surchauffe-sous-refroidissement', legende: 'Deux écarts qui se mesurent — jamais ne se devinent.' }],
  9: [{ ref: 'pack:compresseurs-comparatif', legende: 'Quatre technologies sur le terrain, la fonction ne change pas.' }],
  12: [{ ref: 'pack:ligne-liquide-protection', legende: 'Du réservoir au détendeur, chaque organe veille sur le suivant.' }],
  13: [{ ref: 'pack:sequence-mise-en-service', legende: 'L’ordre des opérations avant la première charge.' }],
  14: [{ ref: 'pack:recherche-fuite-geste', legende: 'Le geste du contrôle : lent, près du raccord, confirmé.' }],
  15: [{ ref: 'pack:recuperation-securisee', legende: 'Rien ne part à l’air : le fluide rejoint la bouteille, pesé.' }],
  16: [{ ref: 'pack:brasage-balayage-azote', legende: 'L’azote balaie l’intérieur du tube pendant toute la chauffe.' }],
  18: [{ ref: 'pack:r290-zone-intervention', legende: 'Le propane impose sa zone : balisée, ventilée, sans flamme.' }],
  19: [{ ref: 'pack:co2-nh3-deux-risques', legende: 'Deux fluides naturels, deux dangers — un même réflexe : s’arrêter.' }],
};

/* Sous ce blanc, on ne pose rien : une vignette écrasée n'explique
   rien. Le plafond laisse une planche large (ratio 1,67) s'étaler sur
   toute la colonne (119,8 mm ÷ 1,67 ≈ 72 mm de haut) — une planche
   comme une autre, dit la maquette. La marge de sécurité garantit que
   la planche tient dans le blanc mesuré, légende comprise. */
const SEUIL_MM = 32;
const PLAFOND_MM = 75;
const SECURITE_MM = 14;

const chemin = path.join(LIVRET, 'blancs.gen.json');
if (!fs.existsSync(chemin)) {
  console.error('✗ blancs.gen.json manquant — fabriquer d’abord (npm run html).');
  process.exit(1);
}
const blancs = JSON.parse(fs.readFileSync(chemin, 'utf8'));

/* Les pages candidates, par chapitre de leur ancre, blanc décroissant. */
const parChapitre = new Map();
for (const b of blancs) {
  if (!b.ancre || b.blanc_mm < SEUIL_MM) continue;
  const ch = Number(b.ancre.split('-')[0]);
  if (!parChapitre.has(ch)) parChapitre.set(ch, []);
  parChapitre.get(ch).push(b);
}
for (const liste of parChapitre.values()) liste.sort((a, b) => b.blanc_mm - a.blanc_mm);

const table = {};
const rapport = [];
for (const [ch, planches] of Object.entries(RESERVE)) {
  const pages = parChapitre.get(Number(ch)) || [];
  let i = 0;
  for (const p of planches) {
    if (i >= pages.length) break;
    const cible = pages[i++];
    const h = Math.min(PLAFOND_MM, Math.round(cible.blanc_mm - SECURITE_MM));
    table[cible.ancre] = { ref: p.ref, h, legende: p.legende };
    rapport.push(`  ch.${String(ch).padStart(2)} p.${String(cible.page).padStart(3)}` +
      ` — blanc ${String(Math.round(cible.blanc_mm)).padStart(2)} mm → ${p.ref} (${h} mm)`);
  }
}

fs.writeFileSync(path.join(LIVRET, 'comblement.gen.json'),
  JSON.stringify(table, null, 1), 'utf8');

const sansPlace = Object.values(RESERVE).flat().length - Object.keys(table).length;
console.log('Comblement — l’affectation de la réserve');
for (const l of rapport) console.log(l);
console.log(`✔ comblement.gen.json — ${Object.keys(table).length} planche(s) posée(s)` +
  (sansPlace ? ` · ${sansPlace} restée(s) en réserve (pas de blanc dans leur chapitre)` : ''));
console.log('  Refabriquer maintenant (npm run html) pour imprimer le comblement.');
