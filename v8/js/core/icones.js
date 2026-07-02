// ============================================================
// inerWeb Fluide — icones.js
// Bibliothèque d'icônes SVG linéaires (24×24, trait 1.8,
// stroke currentColor, extrémités arrondies). Aucune dépendance.
// ============================================================

/**
 * Fabrique une icône SVG homogène à partir de son contenu interne.
 * @param {string} contenu — balises internes du SVG (paths, circles…)
 * @returns {string} balise <svg> complète
 */
function svg(contenu) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" '
    + 'fill="none" stroke="currentColor" stroke-width="1.8" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
    + contenu + '</svg>';
}

export const ICONES = {

  // Tableau de bord : grille de quatre tuiles
  grille: svg(
    '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/>'
    + '<rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/>'
    + '<rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/>'
    + '<rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>'
  ),

  // Machine frigorifique : groupe extérieur avec ventilateur
  machine: svg(
    '<rect x="3" y="4.5" width="18" height="15" rx="2"/>'
    + '<circle cx="10" cy="12" r="3.6"/>'
    + '<path d="M10 8.4v3.6l2.5 2.5"/>'
    + '<path d="M17.5 8.5h.01M17.5 12h.01M17.5 15.5h.01"/>'
  ),

  // Bouteille de fluide : corps cylindrique, col et robinet
  bouteille: svg(
    '<path d="M10 6.5V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5"/>'
    + '<path d="M8.5 3.5h7"/>'
    + '<path d="M8 10a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v8a2.5 2.5 0 0 1-2.5 2.5h-3A2.5 2.5 0 0 1 8 18v-8Z"/>'
    + '<path d="M8 12h8"/>'
  ),

  // Mouvements : double flèche d'échange
  echange: svg(
    '<path d="M4 8h14"/>'
    + '<path d="m14.5 4.5 3.5 3.5-3.5 3.5"/>'
    + '<path d="M20 16H6"/>'
    + '<path d="m9.5 12.5-3.5 3.5 3.5 3.5"/>'
  ),

  // Contrôle d'étanchéité : loupe
  controle: svg(
    '<circle cx="10.5" cy="10.5" r="6.2"/>'
    + '<path d="m15.2 15.2 5.3 5.3"/>'
    + '<path d="M8 10.5h5"/>'
  ),

  // Statistiques : histogramme
  stats: svg(
    '<path d="M4 20h16"/>'
    + '<path d="M7.5 20v-6.5"/>'
    + '<path d="M12 20V8.5"/>'
    + '<path d="M16.5 20V4.5"/>'
  ),

  // Bilan annuel : document avec lignes
  bilan: svg(
    '<path d="M7 3h7l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/>'
    + '<path d="M14 3v4h4"/>'
    + '<path d="M9 13h6"/>'
    + '<path d="M9 16.5h4"/>'
  ),

  // Fluides frigorigènes : flocon à six branches
  flocon: svg(
    '<path d="M12 3v18"/>'
    + '<path d="m9.5 5 2.5 2 2.5-2"/>'
    + '<path d="m9.5 19 2.5-2 2.5 2"/>'
    + '<path d="m4.2 7.5 15.6 9"/>'
    + '<path d="M4.8 10.6 7.9 9.7l.3-3.2"/>'
    + '<path d="m19.2 13.4-3.1.9-.3 3.2"/>'
    + '<path d="m19.8 7.5-15.6 9"/>'
    + '<path d="m19.2 10.6-3.1-.9-.3-3.2"/>'
    + '<path d="m4.8 13.4 3.1.9.3 3.2"/>'
  ),

  // Administration : engrenage
  engrenage: svg(
    '<circle cx="12" cy="12" r="3.1"/>'
    + '<path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8"/>'
    + '<path d="m18.5 5.5-1.85 1.85M7.35 16.65 5.5 18.5M18.5 18.5l-1.85-1.85M7.35 7.35 5.5 5.5"/>'
  ),

  // Télécharger (export) : flèche vers le bas
  telecharger: svg(
    '<path d="M12 4v11"/>'
    + '<path d="m7 10.5 5 4.5 5-4.5"/>'
    + '<path d="M5 20h14"/>'
  ),

  // Téléverser (import) : flèche vers le haut
  televerser: svg(
    '<path d="M12 15V4"/>'
    + '<path d="m7 8.5 5-4.5 5 4.5"/>'
    + '<path d="M5 20h14"/>'
  ),

  // Ajouter
  plus: svg(
    '<path d="M12 5v14"/>'
    + '<path d="M5 12h14"/>'
  ),

  // Fermer
  croix: svg(
    '<path d="m6 6 12 12"/>'
    + '<path d="M18 6 6 18"/>'
  ),

  // Imprimer
  imprimer: svg(
    '<path d="M7 8V3.5h10V8"/>'
    + '<path d="M7 16H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/>'
    + '<rect x="7" y="13.5" width="10" height="7" rx="1"/>'
  ),

  // Alerte : triangle avec point d'exclamation
  alerte: svg(
    '<path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"/>'
    + '<path d="M12 9.5v4"/>'
    + '<path d="M12 16.8h.01"/>'
  ),

  // Coche de validation
  coche: svg(
    '<path d="m5 12.5 4.5 4.5L19 7.5"/>'
  ),

  // Flèche vers la droite
  'fleche-droite': svg(
    '<path d="M4 12h16"/>'
    + '<path d="m14 6 6 6-6 6"/>'
  ),

  // Utilisateur
  utilisateur: svg(
    '<circle cx="12" cy="8" r="3.8"/>'
    + '<path d="M5 20a7 7 0 0 1 14 0"/>'
  ),

  // Sauvegarde : disquette
  sauvegarde: svg(
    '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/>'
    + '<path d="M17 21v-7H7v7"/>'
    + '<path d="M7 3v4.5h7"/>'
  )
};
