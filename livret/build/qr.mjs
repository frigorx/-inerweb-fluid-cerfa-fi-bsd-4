/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — QR CODES
   ---------------------------------------------------------------------
   Quatrième maillon (`npm run qr`). Un QR imprimé est gravé pour la
   durée de vie du papier : il ne porte donc JAMAIS l'adresse réelle
   d'un hébergeur, mais un alias court `https://inerweb.fr/f/<slug>`
   que l'on redirige (spécification posée par le storyboard H0, ici
   enfin réalisée).

   Ce maillon produit trois choses :
     qr.gen/<slug>.png        les 19 codes, prêts pour le papier
     qr.gen.json              le manifeste : alias, cible réelle, titre
     redirections.gen.htaccess  la table à poser sur inerweb.fr (OVH)

   La CIBLE de chaque alias suit une règle déterministe :
     · la CAPSULE narrée du chapitre si sa première fiche en a une
       (le chapitre expliqué à voix haute — l'idéal au téléphone) ;
     · sinon la fiche elle-même dans l'appli (`?carte=<id>`, entrée
       par URL que le moteur sait ouvrir — moteur.js) ;
     · le chapitre généré (les catégories) mène à l'accueil des
       parcours (`?carte=c00`), où l'on choisit sa catégorie.
   Changer une cible plus tard = changer UNE ligne du .htaccess ;
   le papier, lui, ne bouge pas.
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { CHAPITRES, QR_BASE } from './plan-chapitres.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = process.env.PILOTE_FLUIDES || 'C:/git/pilote-fluides';
const DEHORS = path.join(ICI, '..', 'qr.gen');
const MANIFESTE = path.join(ICI, '..', 'qr.gen.json');
const HTACCESS = path.join(ICI, '..', 'redirections.gen.htaccess');

/* L'appli élève, telle qu'elle est servie aujourd'hui : à la racine
   d'inerweb.fr (GitHub Pages y redirige en 301, vérifié le 27/08/2026).
   Si elle déménage, seule la table de redirections se régénère — pas
   le livret. */
const APPLI = 'https://inerweb.fr/';
const CAPSULES = path.join(SOURCE, 'packs', 'fluides', 'res', 'capsules', 'donnees');

const erreurs = [];
const entrees = [];

/* La meilleure cible d'une fiche : sa capsule narrée si elle existe
   (animations + voix), sinon la fiche interactive dans l'appli. */
const cibleDe = (src) => fs.existsSync(path.join(CAPSULES, `${src}.js`))
  ? `${APPLI}packs/fluides/res/capsules/index.html?c=${src}`
  : `${APPLI}?carte=${src}`;

for (const ch of CHAPITRES) {
  if (!ch.qr) { erreurs.push(`ch ${ch.num} « ${ch.titre} » : pas d'alias qr`); continue; }
  /* L'alias du chapitre... */
  entrees.push({
    chapitre: ch.num, titre: ch.titre, slug: ch.qr, alias: QR_BASE + ch.qr,
    cible: ch.genere ? `${APPLI}?carte=c00` : cibleDe(ch.lecons[0].src),
  });
  /* ...et un alias PAR LEÇON : sous chaque leçon du papier, le code qui
     ouvre son pendant interactif — l'animation, la voix, la correction.
     Le livret est aussi le sommaire de la formation en ligne. */
  for (const [i, l] of (ch.lecons || []).entries()) {
    entrees.push({
      chapitre: ch.num, lecon: i + 1, titre: l.t, slug: `${ch.qr}-${i + 1}`,
      alias: `${QR_BASE}${ch.qr}-${i + 1}`, cible: cibleDe(l.src),
    });
  }
}

const doublons = entrees.map((e) => e.slug).filter((s, i, t) => t.indexOf(s) !== i);
if (doublons.length) erreurs.push(`alias en double : ${[...new Set(doublons)].join(', ')}`);

if (erreurs.length) {
  console.error(`\n✖ QR refusés — ${erreurs.length} manque(s) :\n`);
  erreurs.forEach((e) => console.error('  · ' + e));
  process.exit(1);
}

/* ---------------- Les codes eux-mêmes ---------------- */
fs.mkdirSync(DEHORS, { recursive: true });
for (const e of entrees) {
  /* Correction d'erreur Q (25 %) : un QR de livret vit des photocopies,
     des taches et des coins cornés. 600 px ≈ 2 cm nets à 300 dpi. */
  await QRCode.toFile(path.join(DEHORS, `${e.slug}.png`), e.alias, {
    errorCorrectionLevel: 'Q',
    width: 600,
    margin: 4,
    color: { dark: '#1b3a63', light: '#ffffff' },
  });
  e.fichier = `${e.slug}.png`;
}

fs.writeFileSync(MANIFESTE, JSON.stringify(entrees, null, 1), 'utf8');

/* ---------------- La table de redirections ---------------- */
const lignes = [
  '# Table de redirections du livret « Habilitation Fluide » — tome 1',
  '# Générée par livret/build/qr.mjs — à poser à la racine de inerweb.fr',
  '# (ou à fusionner dans le .htaccess existant). Un alias par chapitre :',
  '# le QR papier ne change jamais, seule cette table bouge.',
  '',
  ...entrees.map((e) => `Redirect 302 /f/${e.slug} ${e.cible}`),
  '',
];
fs.writeFileSync(HTACCESS, lignes.join('\n'), 'utf8');

const capsules = entrees.filter((e) => e.cible.includes('capsules')).length;
const parChapitre = entrees.filter((e) => !e.lecon).length;
console.log('QR codes du livret — tome 1\n');
console.log(`  ${parChapitre} alias de chapitre + ${entrees.length - parChapitre} alias de leçon`);
console.log(`\n✔ ${entrees.length} codes (${capsules} vers une capsule narrée) · qr.gen.json · redirections.gen.htaccess`);
