/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — LA MARQUE inerWeb
   ---------------------------------------------------------------------
   Le logo est UNE spécification, figée par la charte inerWeb § 3.4 et
   déjà gravée dans l'en-tête du site (index.html de pilote-fluides) :

     ❄  iner  Web   [produit]
        ────────
     · flocon #1b3a63 ;
     · « iner » en Trebuchet MS gras, #1b3a63, souligné du trait
       orange DU LOGO #e8914a (distinct de l'orange du contenu) ;
     · « Web » en Segoe Script, #1b3a63 ;
     · cartouche arrondi #e8914a, produit en blanc gras.

   Règle de F. Henninot (31/08) : partout où « inerWeb » s'écrit — la
   couverture, le pied de CHAQUE page (une photocopie doit montrer la
   marque), les pages /f/ — c'est CE dessin, jamais le mot en typo
   courante.

   LES FONTES. Trebuchet MS et Segoe Script sont des fontes Microsoft :
   présentes sur la machine de fabrication de F. Henninot (Windows),
   absentes d'un conteneur Linux, et NON redistribuables par le dépôt.
   D'où trois étages de candidats, du plus fidèle au filet :
     1. les fontes Windows de la machine (C:/Windows/Fonts) ;
     2. livret/fontes-locales/ — le Trebuchet du paquet « Core fonts
        for the web » (trebuc32.exe), extrait localement, jamais commité
        (.gitignore) : l'archive seule est redistribuable, pas ses
        fichiers ;
     3. livret/fontes/ — les substituts libres commis avec leur licence
        OFL : Dancing Script pour le script (pas de clone libre de
        Segoe Script) ; pour le gras, Carlito déjà intégrée fait le
        dernier filet via la pile CSS.
   Les @font-face déclarent les NOMS de la charte (« Trebuchet MS »,
   « Segoe Script ») : tout le CSS existant qui les cite se met à rendre
   juste, et le même nom masque proprement la fonte système quand le
   fichier est fourni — le rendu ne dépend plus de la machine.
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const premier = (chemins) => chemins.find((c) => fs.existsSync(c));

export const FONTE_MARQUE_SANS = premier([
  'C:/Windows/Fonts/trebucbd.ttf',
  path.join(ICI, '..', 'fontes-locales', 'Trebucbd.ttf'),
]);
export const FONTE_MARQUE_SCRIPT = premier([
  'C:/Windows/Fonts/segoesc.ttf',
  path.join(ICI, '..', 'fontes', 'DancingScript.ttf'),
]);

const url = (c) => 'file:///' + String(c).replace(/\\/g, '/').replace(/^\//, '');

/* Les @font-face à injecter dans tout document que Chrome imprime :
   sans fichier trouvé, la règle s'omet et la pile CSS retombe sur ses
   fallbacks — la chaîne ne casse jamais pour une fonte absente. */
export const fontFaceMarque = () => [
  FONTE_MARQUE_SANS
    && `@font-face{font-family:"Trebuchet MS";src:url("${url(FONTE_MARQUE_SANS)}");font-weight:bold}`,
  FONTE_MARQUE_SCRIPT
    && `@font-face{font-family:"Segoe Script";src:url("${url(FONTE_MARQUE_SCRIPT)}")}`,
].filter(Boolean).join('\n');

/* Le logo lui-même, en SVG — la spécification du site, mot du produit
   en cartouche. `hauteurMm` fixe la taille rendue ; sans elle, le SVG
   suit son conteneur. Les font-family restent les NOMS de la charte :
   dans un document à @font-face ils rendent les fichiers fournis ;
   dans une page /f/ nue ils rendent comme le site — avec les fontes
   du téléphone. */
export const svgMarque = (produit = 'HabFluide', hauteurMm = 0) => {
  const largeurCartouche = 14 + produit.length * 7.8;
  const largeur = produit ? 155 + largeurCartouche + 4 : 155;
  const taille = hauteurMm ? ` height="${hauteurMm}mm" width="${(hauteurMm * largeur / 50).toFixed(2)}mm"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largeur} 50"${taille} role="img" aria-label="inerWeb ${produit}">
<text fill="#1b3a63" font-size="30px" x="2" y="36">&#10052;</text>
<text fill="#1b3a63" font-family="Trebuchet MS, Trebuchet, sans-serif" font-size="26px" font-weight="bold" x="44" y="32">iner</text>
<text fill="#1b3a63" font-family="Segoe Script, Brush Script MT, cursive" font-size="26px" x="94" y="32">Web</text>
<line stroke="#e8914a" stroke-width="2" x1="44" x2="150" y1="35" y2="35"></line>
${produit ? `<rect fill="#e8914a" x="155" y="10" rx="5" ry="5" width="${largeurCartouche}" height="24"></rect>
<text fill="#ffffff" font-family="Segoe UI, Carlito, Calibri, Helvetica, sans-serif" font-size="14px" font-weight="bold" x="${155 + largeurCartouche / 2}" y="27" text-anchor="middle">${produit}</text>` : ''}
</svg>`;
};

/* La variante CLAIRE, pour les fonds bleus (1re de couverture, dos) :
   textes et flocon en blanc, le trait et le cartouche gardent l'orange
   du logo — le cartouche passe son mot en bleu charte pour rester
   lisible sur l'orange. */
export const svgMarqueClaire = (produit = 'HabFluide', hauteurMm = 0) => svgMarque(produit, hauteurMm)
  .replaceAll('fill="#1b3a63" font-size="30px"', 'fill="#ffffff" font-size="30px"')
  .replaceAll('fill="#1b3a63" font-family', 'fill="#ffffff" font-family');
