/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — LA RÉSERVE DE PLANCHES
   ---------------------------------------------------------------------
   Règle de fabrication : aucune page ne se termine sur du vide. Le livre
   en laissait 93 avec 35 mm ou plus, jusqu'à 196 mm — presque une page
   blanche au milieu d'un chapitre.

   Ce maillon prépare de quoi les combler. Il ne comble pas lui-même :
   c'est `finition.py` qui, la pagination faite, sait où sont les trous et
   combien de place il reste. Ici on prépare la MATIÈRE.

   Ce qu'il fait :
     · liste les planches de `pilote-fluides` qu'aucune page n'utilise
       encore — la réserve ;
     · lit leur `aria-label` (les planches inerWeb en portent toutes un,
       pour les lecteurs d'écran) : il donne à la fois la légende et les
       mots qui disent de quoi elles parlent ;
     · les attribue au chapitre dont elles traitent le sujet ;
     · les rastérise, prêtes à poser.

   ⚠️ UNE PLANCHE COLLE AU SUJET, OU ELLE NE SERT PAS. Une image
   décorative posée pour boucher est pire qu'un blanc : elle fait croire
   à un rapport qui n'existe pas, et le lecteur cherche ce qu'il devrait
   comprendre. L'attribution exige donc un recouvrement FRANC de mots
   avec le chapitre ; en dessous, la planche reste inutilisée et le
   compte rendu le dit. Mieux vaut une réserve courte et juste.

   Sortie : reserve.gen/<nom>.png + reserve.gen.json
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CHAPITRES } from './plan-chapitres.mjs';
import { etatFinal } from './visuels.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const SOURCE = process.env.PILOTE_FLUIDES || 'C:/git/pilote-fluides';
const RES = path.join(SOURCE, 'packs', 'fluides', 'res');
const DEHORS = path.join(LIVRET, 'reserve.gen');
const MANIFESTE = path.join(LIVRET, 'reserve.gen.json');

/* Une planche de comblement s'imprime en pleine justification : 119,8 mm
   à 300 ppp font 1415 px. On monte à 1600 pour garder de la marge si la
   justification s'élargit un jour. */
const LARGEUR = 1600;

/* Les dossiers où vivent les planches réutilisables. Les symboles isolés
   en sont exclus : une vignette de robinet agrandie sur 80 mm de vide ne
   comble pas, elle interroge. */
const DOSSIERS = ['svg', 'illustrations', 'bibliotheque'];

const VISUELS = JSON.parse(fs.readFileSync(path.join(LIVRET, 'visuels.gen.json'), 'utf8'));
const dejaPris = new Set(Object.values(VISUELS).map((o) => path.basename(o.source)));

/* ------------------------------------------------------------------
   Les mots qui disent de quoi on parle. On écarte l'outillage de la
   langue : sans cela, « le » et « de » apparieraient n'importe quoi
   avec n'importe quoi.
   ------------------------------------------------------------------ */
const VIDES = new Set(('le la les un une des du de et ou a au aux en dans sur pour par ce '
  + 'qui que quoi son sa ses il elle on ne pas plus toujours jamais est sont avec sans '
  + 'comme deux trois quatre cinq entre vers chaque tout tous toute toutes leur leurs '
  + 'quand alors donc mais car si cela celui celle ceux dont ici la-bas gauche droite '
  + 'haut bas premier premiere second seconde autre autres meme memes').split(' '));

const mots = (t) => String(t || '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .split(/[^a-z0-9]+/)
  .filter((m) => m.length > 3 && !VIDES.has(m));

/* La légende : la première phrase de l'aria-label, qui décrit la planche
   pour un lecteur d'écran — donc en une phrase, sans jargon de fichier. */
const legendeDe = (label, nom) => {
  if (!label) return nom.replace(/[-_]/g, ' ').replace(/\.svg$/, '');
  const phrase = label.split(/\.\s|\.$/)[0].trim();
  return phrase.length > 110 ? `${phrase.slice(0, 107)}…` : phrase;
};

/* ------------------------------------------------------------------
   La réserve : ce que le livre n'utilise pas encore.
   ------------------------------------------------------------------ */
const reserve = [];
let animees = 0;
for (const d of DOSSIERS) {
  const dossier = path.join(RES, d);
  if (!fs.existsSync(dossier)) continue;
  for (const f of fs.readdirSync(dossier)) {
    if (!f.endsWith('.svg') || dejaPris.has(f)) continue;
    const source = path.join(dossier, f);
    const texte = fs.readFileSync(source, 'utf8');
    const label = (texte.match(/aria-label="([^"]*)"/) || [])[1] || '';
    /* Une planche sans description n'est pas attribuable : on ne sait pas
       ce qu'elle montre, donc on ne peut pas jurer qu'elle colle. */
    if (!label) continue;

    /* ⚠️ UNE PLANCHE ANIMEE RASTERISEE TELLE QUELLE SORT BLANCHE : elle
       naît avec ses elements invisibles, et c'est l'animation qui les
       revele. Le livre a ainsi affiche une legende flottant seule au
       milieu du vide qu'elle devait combler. On saisit donc l'INSTANT LE
       PLUS RICHE, comme `visuels.mjs` le fait pour les planches du texte. */
    const anime = /<animate|<animateTransform/.test(texte);
    const dessin = anime ? etatFinal(texte) : texte;
    if (anime) animees++;

    reserve.push({
      nom: f.replace(/\.svg$/, ''), source, dossier: d, label, dessin,
      legende: legendeDe(label, f),
      mots: new Set([...mots(label), ...mots(f)]),
      /* Le NOM du fichier est le jugement de celui qui a dessine la
         planche : « le-circuit_detendeur » dit detendeur, quoi que sa
         description mentionne au passage. Il pese donc double — sans quoi
         ce detendeur-la partait au chapitre du condenseur, dont le label
         citait « liquide » et « haute pression ». */
      motsNom: new Set(mots(f)),
      anime,
    });
  }
}

/* ------------------------------------------------------------------
   L'ATTRIBUTION. Une planche va au chapitre dont elle traite le sujet,
   ou elle ne va nulle part.
   ------------------------------------------------------------------ */
const profils = CHAPITRES.map((ch) => ({
  num: ch.num,
  titre: ch.titre,
  mots: new Set([
    ...mots(ch.titre), ...mots(ch.objectif),
    ...(ch.lecons || []).flatMap((l) => mots(l.t)),
  ]),
}));

/* ------------------------------------------------------------------
   COMPTER LES MOTS COMMUNS NE SUFFIT PAS. « fluide », « circuit »,
   « pression » sont partout : deux mots partages avec un chapitre ne
   prouvent alors rien, et le premier essai a envoye un detendeur dans
   « Ce qui peut vous blesser » et une planche d'espace clos dans « Le
   condenseur ».

   Un mot ne vaut donc que par sa RARETE : present dans un seul chapitre
   il designe, present dans quinze il ne dit rien. On pese chaque mot
   commun par l'inverse du nombre de chapitres qui l'emploient.
   ------------------------------------------------------------------ */
const frequence = new Map();
for (const prof of profils) {
  for (const m of prof.mots) frequence.set(m, (frequence.get(m) || 0) + 1);
}
const poids = (m) => 1 / (frequence.get(m) || 1);

/* Le seuil se lit ainsi : deux mots propres a un seul chapitre (2 x 1),
   ou un mot propre et quelques mots partages. En dessous, on ne parie
   pas — la planche reste inutilisee et le compte rendu le dit. */
const SEUIL = 1.6;

/* Un chapitre n'a pas besoin de quinze planches : il a besoin d'assez
   pour ses trous. Au-dela, on garde les mieux appariees et on laisse le
   reste disponible pour un autre. */
const PLAFOND = 6;

const parChapitre = new Map(CHAPITRES.map((c) => [c.num, []]));
const orphelines = [];
const vues = new Set();

for (const p of reserve) {
  /* Une meme planche peut vivre dans deux dossiers : on ne la pose pas
     deux fois dans le meme livre. */
  if (vues.has(p.nom)) continue;
  vues.add(p.nom);

  /* D'ABORD le nom. S'il porte un mot que deux chapitres au plus
     emploient, ce mot DESIGNE : « le-circuit_detendeur » va au chapitre
     du detendeur, meme si sa description cite au passage le condenseur
     et la haute pression. Une accumulation de mots banals ne doit pas
     l'emporter sur un mot qui nomme. */
  let meilleur = null;
  for (const prof of profils) {
    let designe = 0;
    for (const m of p.motsNom) {
      if (prof.mots.has(m) && (frequence.get(m) || 9) <= 2) designe += poids(m);
    }
    if (designe > 0 && (!meilleur || designe > meilleur.designe)) {
      meilleur = { num: prof.num, score: designe, designe };
    }
  }

  /* A defaut, le recouvrement general, pondere par la rarete. */
  if (!meilleur) {
    for (const prof of profils) {
      let score = 0;
      for (const m of p.mots) if (prof.mots.has(m)) score += poids(m);
      for (const m of p.motsNom) if (prof.mots.has(m)) score += poids(m);
      if (score >= SEUIL && (!meilleur || score > meilleur.score)) {
        meilleur = { num: prof.num, score, designe: 0 };
      }
    }
  }
  if (meilleur) parChapitre.get(meilleur.num).push({ ...p, force: +meilleur.score.toFixed(2) });
  else orphelines.push(p);
}

for (const [num, liste] of parChapitre) {
  liste.sort((a, b) => b.force - a.force);
  if (liste.length > PLAFOND) {
    orphelines.push(...liste.splice(PLAFOND));
  }
}

/* ------------------------------------------------------------------
   La rastérisation. Même réglage que `visuels.mjs` : densité haute pour
   que le trait reste net à l'impression.
   ------------------------------------------------------------------ */
fs.rmSync(DEHORS, { recursive: true, force: true });
fs.mkdirSync(DEHORS, { recursive: true });

const sortie = {};
let posables = 0;
for (const [num, liste] of parChapitre) {
  sortie[num] = [];
  for (const p of liste) {
    const fichier = `${p.nom}.png`;
    const info = await sharp(Buffer.from(p.dessin), { density: 500 })
      .resize({ width: LARGEUR, withoutEnlargement: false })
      .png({ compressionLevel: 9 })
      .toFile(path.join(DEHORS, fichier));
    sortie[num].push({
      nom: p.nom, fichier, legende: p.legende, anime: p.anime,
      largeur: info.width, hauteur: info.height, force: p.force,
    });
    posables++;
  }
}

fs.writeFileSync(MANIFESTE, JSON.stringify(sortie, null, 1), 'utf8');

console.log('Réserve de planches — de quoi ne jamais laisser de blanc\n');
console.log(`  ${reserve.length} planches inutilisées par le livre, décrites et donc attribuables`);
console.log(`  ${animees} animées, saisies à leur instant le plus riche (sinon blanches)`);
console.log(`  ${posables} rattachées à un chapitre · ${orphelines.length} sans rapport franc, laissées de côté`);
const garnis = [...parChapitre].filter(([, l]) => l.length).length;
console.log(`  ${garnis} chapitres sur ${CHAPITRES.length} ont de quoi combler`);
const vides = [...parChapitre].filter(([, l]) => !l.length).map(([n]) => n);
if (vides.length) console.log(`  ⚠ sans réserve : chapitres ${vides.join(', ')} — leurs blancs devront être comblés autrement`);
console.log(`\n✔ reserve.gen/ (${posables} planches) · reserve.gen.json`);
