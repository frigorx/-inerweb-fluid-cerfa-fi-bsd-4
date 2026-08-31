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
import { leconsCategories, questionsCategories } from './contenu-categories.mjs';

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
const REF = JSON.parse(fs.readFileSync(path.join(PACK, 'referentiel-2025.json'), 'utf8'));

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
   Le référentiel, code par code. Le tome 1 prépare l'épreuve THÉORIQUE
   des catégories que le centre valide : A1, A2, D, E — pas la V
   (automobile), pas B/C (CO₂ et NH₃, traités en information). Son
   périmètre exact est donc : les codes marqués « T » pour au moins
   une de ces quatre catégories.
   ------------------------------------------------------------------ */
const CATEGORIES = ['A1', 'A2', 'D', 'E'];
const IDX_REF = new Map();
for (const g of REF.groupes) for (const c of g.codes || []) {
  IDX_REF.set(c.code, { libelle: c.libelle, groupe: g.id, groupe_titre: g.titre, cat: c.cat || {} });
}
const referentielDe = (ou, codes) => codes.map((code) => {
  const e = IDX_REF.get(code);
  if (!e) { erreurs.push(`${ou} : code « ${code} » inconnu du référentiel`); return null; }
  /* Le référentiel n'exige PAS la même chose de chaque catégorie : le
     livret doit dire, code par code, qui est concerné et à quel titre
     (T = épreuve théorique, P = épreuve pratique, donc tome 2). */
  const parCat = {};
  for (const k of CATEGORIES) if (e.cat[k] && e.cat[k] !== '—') parCat[k] = e.cat[k];
  return {
    code, libelle: e.libelle, groupe: e.groupe,
    theorie: CATEGORIES.some((k) => e.cat[k] === 'T'),
    cats: parCat,
    catsT: CATEGORIES.filter((k) => e.cat[k] === 'T'),
  };
}).filter(Boolean);

/* ------------------------------------------------------------------
   Le corps d'une fiche est du HTML concaténé : boutons-capsules,
   schémas, photos, puis les paragraphes de cours. Le livret ne veut
   que ces derniers — les visuels, le plan les désigne lui-même, et
   les capsules audio deviennent des QR codes.
   ------------------------------------------------------------------ */
/* Ce que l'écran affiche et que le papier ne peut pas montrer : une
   réglette interactive dans un `<iframe>`, une animation `<img>`, un
   `<figure>`. Ces balises s'imprimaient EN TOUTES LETTRES sur dix-huit
   pages — « <iframe src="…reglette.html" » au milieu d'un encadré. On les
   retire, et le `<br>` devient ce qu'il est sur papier : un alinéa. */
const pourLePapier = (html) => String(html || '')
  .replace(/<p class="lien-experience"[\s\S]*?<\/p>/g, '')
  .replace(/<figure[\s\S]*?<\/figure>/g, '')
  .replace(/<iframe[\s\S]*?<\/iframe>/g, '')
  .replace(/<iframe[^>]*>/g, '')
  .replace(/<img[^>]*>/g, '')
  .replace(/<p[^>]*>/g, '<p>')
  .replace(/<br\s*\/?>/g, '</p><p>')
  .replace(/<p>\s*<\/p>/g, '');

const paragraphes = (corps) => (pourLePapier(corps).match(/<p>[\s\S]*?<\/p>/g) || [])
  .map((p) => p.replace(/^<p>/, '').replace(/<\/p>$/, '').trim())
  .filter(Boolean);

/* Une désignation du plan (src + paras + blocs) devient un extrait. */
const extraire = (ou, { src, paras = 'tous', blocs = [], tranche = null }) => {
  const carte = parId.get(src);
  if (!carte) { erreurs.push(`${ou} : fiche « ${src} » introuvable dans cartes.js`); return null; }
  const tous = paragraphes(carte.corps);
  let indices = paras === 'tous' ? tous.map((_, i) => i) : paras;
  /* La part de cette leçon dans une carte partagée : une tranche
     consécutive, calculée pour que rien ne se perde ni ne se répète. */
  if (tranche && paras === 'tous') {
    const debut = Math.round((tranche.rang * tous.length) / tranche.sur);
    const fin = Math.round(((tranche.rang + 1) * tous.length) / tranche.sur);
    indices = indices.slice(debut, fin);
  }
  const horsLimite = indices.filter((i) => i < 0 || i >= tous.length);
  if (horsLimite.length) {
    erreurs.push(`${ou} : fiche « ${src} » a ${tous.length} paragraphes (0–${tous.length - 1}), ` +
      `le plan demande ${horsLimite.join(', ')}`);
  }
  const blocsManquants = blocs.filter((i) => !(carte.blocs || [])[i]);
  if (blocsManquants.length) {
    erreurs.push(`${ou} : fiche « ${src} » n'a pas de bloc ${blocsManquants.join(', ')}`);
  }
  /* Les codes que la carte source DÉCLARE traiter (son champ `dc` :
     « G8 · codes 8.01 · 8.05 »). C'est la seule source honnête d'un
     rattachement page → référentiel : elle est écrite par l'auteur du
     cours, pas devinée après coup. Le livre les imprimera en pied de
     page, et l'audit comptera ce qui est réellement vu. */
  const dc = String(carte.dc || '');
  const codesDeclares = [];
  /* Le `dc` écrit ses codes un à un (« 4.06 · 4.07 ») ou par INTERVALLE
     (« codes 5.05 → 5.09 »). Ne lire que les nombres laissait tomber tout
     ce qui est entre les bornes : 5.06, 5.07 et 5.08 n'étaient marqués
     nulle part alors que le chapitre les traite. On développe. */
  const reste = dc.replace(/(\d{1,2})\.(\d{2})\s*(?:→|->|à)\s*(\d{1,2})\.(\d{2})/g,
    (tout, g1, d1, g2, d2) => {
      if (g1 !== g2) return tout;
      const sortie = [];
      for (let n = Number(d1); n <= Number(d2); n += 1) {
        sortie.push(`${g1}.${String(n).padStart(2, '0')}`);
      }
      codesDeclares.push(...sortie);
      return '';
    });
  codesDeclares.push(...(reste.match(/\d{1,2}\.\d{2}/g) || []));

  return {
    src,
    titre_source: carte.titre,
    codes: [...new Set(codesDeclares)],
    paras: indices.filter((i) => i >= 0 && i < tous.length).map((i) => tous[i]),
    /* Les encadrés passent par le même nettoyage que le texte courant :
       c'est là que se cachaient les iframes de réglette.
       Beaucoup sont écrits d'un seul tenant, alinéas au <br> : une fois
       les <br> devenus </p><p>, le premier et le dernier alinéa
       restaient sans balise et l'imprimeur d'encadrés les PERDAIT —
       14 encadrés sur 109 amputés de leur ouverture et de leur chute,
       dont « Ce que la valeur vous dit » (relecture du 30/08).
       L'enveloppe referme la clôture ; un <p> redoublé est nettoyé
       en aval, un <p></p> vide l'est déjà ici. */
    blocs: blocs.map((i) => (carte.blocs || [])[i]).filter(Boolean)
      .map((b) => ({ ...b, html: pourLePapier('<p>' + String(b.html || '') + '</p>') })),
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

  const referentiel = referentielDe(ou, ch.codes || []);

  if (ch.genere === 'categories') {
    /* Ce chapitre n'a pas de fiche source : ses questions venaient donc
       du groupe G1 de la banque — la nomenclature des fluides — dans un
       chapitre qui parle des catégories. Elles se génèrent comme son
       texte, depuis le référentiel. */
    /* Les leçons ÉCRITES du plan précèdent les leçons générées : la
       refonte ajoute ici le code 1.00 (législation, DEEE, écoconception),
       que le générateur de catégories ne produit pas et que les cartes du
       pack ne couvraient qu'en 27 mots. Le générateur garde la main sur
       le tableau des catégories, qui doit rester dérivé du référentiel. */
    const ecrites = (ch.lecons || []).filter((l) => l.ecrit).map((l) => ({
      t: l.t, src: l.src || `ecrit:${ch.num}`, titre_source: l.t,
      codes: [...new Set(l.codes || [])], paras: l.paras.slice(),
      blocs: (l.blocs || []).map((b) => ({ ...b, html: String(b.html || '') })),
      question: l.question || null,
    }));
    return { num: ch.num, genere: ch.genere, referentiel,
      lecons: [...ecrites, ...leconsCategories(REF)], questions: questionsCategories(REF) };
  }
  if (ch.genere) {
    erreurs.push(`${ou} : générateur « ${ch.genere} » inconnu`);
    return { num: ch.num, genere: ch.genere, lecons: [], questions };
  }

  /* Plusieurs leçons d'un même chapitre puisent souvent dans la MÊME
     carte. Depuis que chacune prend « tous » les paragraphes, elles
     réimprimaient toutes le même texte : sept paires de pages jumelles
     dans le livre. On répartit donc la carte entre ses leçons, en
     tranches consécutives — le contenu reste entier, l'ordre est tenu,
     et rien ne paraît deux fois. Une leçon qui désigne ses paragraphes à
     la main (`paras: [0, 2]`) garde évidemment son choix. */
  const partages = new Map();
  for (const l of ch.lecons || []) {
    if (l.ecrit || !l.src) continue;
    if (l.paras && l.paras !== 'tous') continue;
    partages.set(l.src, (partages.get(l.src) || 0) + 1);
  }
  const rangDansLaCarte = new Map();

  const lecons = (ch.lecons || []).map((l, i) => {
    /* LEÇON ÉCRITE DANS LE PLAN — `ecrit: true`. La refonte 2026 approfondit
       des codes que les cartes du pack ne couvrent pas (écoconception, PFAS,
       efficacité énergétique, comptes rendus). Leur texte vit ici, dans le
       plan, et non dans `cartes.js` : le site et le livre n'ont pas le même
       découpage, et une carte de site n'est pas toujours un chapitre de livre.
       La forme de retour est celle d'`extraire()`, pour que rien en aval ne
       sache faire la différence. */
    if (l.ecrit) {
      if (!l.paras || !l.paras.length) {
        erreurs.push(`${ou}, leçon ${i + 1} « ${l.t} » : déclarée écrite, mais sans texte`);
        return null;
      }
      return {
        t: l.t, src: l.src || `ecrit:${ch.num}-${i + 1}`,
        titre_source: l.t, codes: [...new Set(l.codes || [])],
        paras: l.paras.slice(),
        blocs: (l.blocs || []).map((b) => ({ ...b, html: String(b.html || '') })),
        question: l.question || null,
      };
    }
    let demande = l;
    const combien = partages.get(l.src) || 0;
    if (combien > 1 && (!l.paras || l.paras === 'tous')) {
      const rang = rangDansLaCarte.get(l.src) || 0;
      rangDansLaCarte.set(l.src, rang + 1);
      demande = { ...l, tranche: { rang, sur: combien } };
    }
    const e = extraire(`${ou}, leçon ${i + 1} « ${l.t} »`, demande);
    return e && { t: l.t, ...e };
  }).filter(Boolean);

  /* L'activité de fin de chapitre peut s'appuyer sur une fiche
     exercice (`src`) : son texte et sa question viennent alors aussi
     de la source. Sans `src`, l'activité vit toute entière dans le plan. */
  const activite = ch.activite?.src
    ? extraire(`${ou}, activité « ${ch.activite.t} »`, { src: ch.activite.src })
    : null;

  return { num: ch.num, referentiel, lecons, activite, questions };
});

/* Être sûr de ne rien oublier : chaque code exigé en théorie pour
   A1/A2/D/E doit être couvert par au moins un chapitre. Un manque
   arrête la chaîne — c'est la raison d'être du livret. */
const exiges = [...IDX_REF.entries()].filter(([, e]) => CATEGORIES.some((k) => e.cat[k] === 'T'));
/* COUVERTURE ET PROFONDEUR — le contrôle qui compte.
   Jusqu'ici on vérifiait qu'un code figurait dans le tableau `codes:` du
   plan, écrit à la main. Un chapitre pouvait donc ANNONCER un code sans
   qu'une seule ligne ne le traite, et la chaîne passait au vert. Le
   cadrage éditorial du 31/08/2026 refuse cela mot pour mot : « un code
   imprimé en tête d'un chapitre ne constitue pas une preuve de
   couverture ». On mesure donc ce que le livre écrit RÉELLEMENT sous
   chaque code, et un code sous le plancher arrête la fabrication. */
const PLANCHER_MOTS = 250;
const compteMots = (s) => (String(s || '').replace(/<[^>]+>/g, ' ')
  .match(/[A-Za-zÀ-ÿ0-9'’-]+/g) || []).length;

const motsParCode = new Map();
for (const c of chapitres) {
  for (const l of c.lecons || []) {
    const m = compteMots(l.paras.join(' ')) +
      compteMots((l.blocs || []).map((b) => b.html).join(' '));
    for (const code of l.codes || []) {
      motsParCode.set(code, (motsParCode.get(code) || 0) + m);
    }
  }
}

const couverts = new Set(CHAPITRES.flatMap((c) => c.codes || []));
const maigres = [];
for (const [code, e] of exiges) {
  if (!couverts.has(code)) {
    erreurs.push(`couverture : code théorique « ${code} » (${e.groupe}) couvert par aucun chapitre`);
    continue;
  }
  const m = motsParCode.get(code) || 0;
  if (m < PLANCHER_MOTS) maigres.push(`${code} (${e.groupe}) — ${m} mot(s) écrits sous ce code`);
}
if (maigres.length) {
  const message = `profondeur : ${maigres.length} code(s) théorique(s) sous le plancher de ` +
    `${PLANCHER_MOTS} mots :\n      ${maigres.join('\n      ')}`;
  /* Pendant la refonte, le livre est par construction incomplet : le
     verrou avertit au lieu d'arrêter. Il redevient bloquant dès que
     REFONTE n'est plus posé — c'est-à-dire pour toute fabrication
     destinée au téléversement. Le compte est imprimé dans les deux cas :
     personne ne peut prétendre ne pas l'avoir vu. */
  if (process.env.REFONTE) {
    console.warn(`\n⚠ ${message}\n  (REFONTE posé : avertissement. Sans REFONTE, ceci arrête la chaîne.)`);
  } else {
    erreurs.push(message);
  }
}

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
  categories: CATEGORIES,
  codes_theorie_exiges: exiges.length,
  chapitres,
}, null, 1), 'utf8');

let nParas = 0; let nBlocs = 0; let nQ = 0;
console.log('Extraction du livret — tome 1\n');
for (const c of chapitres) {
  const plan = CHAPITRES.find((p) => p.num === c.num);
  const paras = c.lecons.reduce((s, l) => s + l.paras.length, 0) + (c.activite?.paras.length || 0);
  const blocs = c.lecons.reduce((s, l) => s + l.blocs.length, 0);
  nParas += paras; nBlocs += blocs; nQ += c.questions.length;
  const marque = c.genere ? ` [généré : ${c.genere}]` : '';
  console.log(`  ch ${String(c.num).padStart(2)} — ${c.lecons.length} leçons · ${paras} § · ${blocs} blocs · ${c.questions.length} q.  (${plan.titre})${marque}`);
}
console.log(`\n✔ ${chapitres.length} chapitres · ${nParas} paragraphes · ${nBlocs} blocs · ${nQ} questions`);
console.log(`  source : ${sourceCommit} → ${path.relative(process.cwd(), SORTIE)}`);
