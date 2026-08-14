// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// LE logo inerWeb — copie conforme de la référence FIGÉE de la charte
// graphique (§ 3.4, « re-gravée le 10/08/2026 »), version compacte
// 400 × 50 réduite à sa surface utile (240 × 50), cartouche « Fluide ».
//
// CE QUI EST FIGÉ (ne pas retoucher sans la charte) : emoji ❄️ ·
// « iner » Trebuchet MS gras · « Web » Segoe Script (repli Brush Script
// MT, cursive) · ligne et cartouche orange #e8914a (l'orange DU LOGO,
// pas l'orange d'accent du contenu) · bleu #1b3a63 · seule la LARGEUR
// du cartouche s'adapte au mot. La version compacte ne porte pas la
// signature « par F. Henninot » (cote de la charte).
//
// Consommé par : la sidebar (app.js, fond marine → fondSombre), les
// en-têtes des documents imprimables (bon d'intervention, fiche
// d'identification — papier blanc → clair). Les pages statiques
// (index.html, guide.html) portent la MÊME image en dur.
// ============================================================
'use strict';

/**
 * Le logo compact « inerWeb Fluide », en SVG en ligne.
 * @param {{ fondSombre?: boolean }} [options] fond marine (sidebar) ou clair
 * @returns {string} HTML
 */
export function logoInerwebFluide({ fondSombre = false } = {}) {
  const encre = fondSombre ? '#ffffff' : '#1b3a63';
  return '<svg class="logo-inerweb" xmlns="http://www.w3.org/2000/svg" '
    + 'viewBox="0 0 240 50" role="img" aria-label="inerWeb Fluide">'
    + `<text fill="${encre}" font-size="28px" x="4" y="34">❄️</text>`
    + `<text fill="${encre}" font-family="Trebuchet MS, Trebuchet, sans-serif" `
    + 'font-size="26px" font-weight="bold" x="44" y="32">iner</text>'
    + `<text fill="${encre}" font-family="Segoe Script, Brush Script MT, cursive" `
    + 'font-size="26px" x="94" y="32">Web</text>'
    + '<line stroke="#e8914a" stroke-width="2" x1="44" x2="150" y1="35" y2="35"/>'
    + '<rect fill="#e8914a" x="155" y="10" rx="5" ry="5" width="80" height="24"/>'
    + '<text fill="#ffffff" font-family="Segoe UI, Helvetica, Arial, sans-serif" '
    + 'font-size="14px" font-weight="bold" x="195" y="27" text-anchor="middle">Fluide</text>'
    + '</svg>';
}
