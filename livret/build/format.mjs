/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — LE FORMAT, EN UN SEUL ENDROIT
   ---------------------------------------------------------------------
   Les cotes de page vivent dans `reglages.json`. Ce module les relit et
   en dérive ce que toute la chaîne répétait en dur : les millimètres,
   les pouces, et le suffixe des noms de fichiers.

   Avant, « 6x9 » était écrit à la main dans six fichiers (build-html,
   build-livret, couverture, paquet-kdp, tout, package.json) et les cotes
   152,4 / 228,6 dans quatre autres. Changer de format demandait de tous
   les retrouver — et d'en oublier un suffisait à produire une couverture
   qui ne correspondait plus à son intérieur.

   Une seule vérité, donc : `reglages.json`. Changer `page_l_mm` et
   `page_h_mm` refabrique le livre, la couverture, le dos et le contrôle
   KDP, sans qu'aucune autre ligne ne bouge.
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const R = JSON.parse(fs.readFileSync(path.join(ICI, '..', 'reglages.json'), 'utf8'));

const MM_PO = 25.4;

/* Les cotes, en millimètres — ce que le CSS et le PDF manipulent. */
export const PAGE_L = R.page_l_mm;
export const PAGE_H = R.page_h_mm;

/* Les mêmes en pouces : c'est la langue d'Amazon KDP, et celle du
   contrôle qui refuse un fichier hors format. Arrondies au centième,
   parce que 177,8 / 25,4 vaut 6,999999… en flottant. */
export const PAGE_L_PO = Math.round((PAGE_L / MM_PO) * 100) / 100;
export const PAGE_H_PO = Math.round((PAGE_H / MM_PO) * 100) / 100;

/* Le suffixe des fichiers : « 7x10 ». Il suit le format, il ne le
   précède pas — un fichier nommé 6x9 qui contiendrait du 7x10 serait
   téléversé de travers. */
export const SUFFIXE = `${PAGE_L_PO}x${PAGE_H_PO}`.replace(/\.\d+/g, '');

/* Le format écrit pour un humain : « 7 × 10 pouces (177,8 × 254 mm) ». */
export const FORMAT_LISIBLE = `${PAGE_L_PO} × ${PAGE_H_PO} pouces`;
export const COTES_LISIBLES = `${String(PAGE_L).replace('.', ',')} × ${String(PAGE_H).replace('.', ',')} mm`;

/* La justification réelle : ce qui reste au texte une fois la reliure,
   la tranche et — quand elle existe — la marge de renvois retirées. */
export const marge_renvois = R.marge_renvois_mm || 0;
export const separation = R.separation_mm || 0;
export const JUSTIFICATION = +(PAGE_L - R.gouttiere_mm - R.exterieur_mm
  - marge_renvois - separation).toFixed(1);
export const HAUTEUR_UTILE = +(PAGE_H - R.haut_mm - R.bas_mm).toFixed(1);

export const NOM_INTERIEUR = `inerweb.fr-HabFluide-Tome1-Livret-eleve-${SUFFIXE}`;
export const NOM_COUVERTURE = `inerweb.fr-HabFluide-Tome1-Couverture-${SUFFIXE}`;
