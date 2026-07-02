// ============================================================
// inerWeb Fluide — vue « Statistiques »
// Répartition de la charge par fluide (barres horizontales),
// flux mensuels sur 6 mois (histogramme) et 3 grandes tuiles
// de conformité. Lecture seule, données issues de store.getStats().
// ============================================================

import { enteteVue, barreProgression } from './communs.js';
import { esc, fmtKg, fmtTeq, fmtNombre } from '../core/utils.js';

export const titre = 'Statistiques';

/* ============================================================
   Styles propres à la vue (préfixe .stats- pour éviter toute
   collision avec les autres vues) — la charte ne fournit pas
   de classes pour l'histogramme ni les grandes tuiles.
   ============================================================ */

const STYLES_VUE = `
<style>
  /* ---- Titre de carte ---- */
  .stats-titre-carte {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 16px;
  }

  /* ---- Charge par fluide : lignes à barres horizontales ---- */
  .stats-lignes-fluides {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .stats-ligne-haut {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
  }

  .stats-code-fluide {
    font-size: 13px;
    font-weight: 600;
    color: var(--texte);
  }

  .stats-ligne-valeurs {
    font-size: 12px;
    color: var(--texte-3);
    white-space: nowrap;
  }

  /* ---- Flux mensuels : légende ---- */
  .stats-legende {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 14px;
    font-size: 12px;
    color: var(--texte-2);
  }

  .stats-legende-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .stats-point {
    width: 9px;
    height: 9px;
    flex: none;
    border-radius: var(--rayon-chip);
  }

  .stats-point-charge { background: var(--accent); }
  .stats-point-recup  { background: var(--violet); }

  /* ---- Flux mensuels : histogramme en divs flex ---- */
  .stats-histogramme {
    display: flex;
    align-items: stretch;
    gap: 8px;
  }

  .stats-groupe-mois {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .stats-barres {
    height: 150px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 6px;
  }

  .stats-colonne {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    height: 100%;
    width: 22px;
  }

  .stats-valeur-barre {
    font-family: var(--police-mono);
    font-variant-numeric: tabular-nums;
    font-size: 10.5px;
    color: var(--texte-2);
    white-space: nowrap;
  }

  .stats-valeur-nulle {
    color: var(--texte-faible);
  }

  .stats-barre-v {
    width: 100%;
    border-radius: 4px 4px 0 0;
    transition: height .35s ease;
  }

  .stats-barre-charge { background: var(--degrade-bouton); }
  .stats-barre-recup  { background: var(--violet); }
  .stats-barre-vide   { background: var(--bordure); height: 2px; }

  .stats-libelle-mois {
    text-align: center;
    font-size: 11.5px;
    color: var(--texte-3);
    border-top: 1px solid var(--bordure-2);
    padding-top: 6px;
    white-space: nowrap;
  }

  /* ---- Grandes tuiles de conformité ---- */
  .stats-tuile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 26px 20px;
    text-align: center;
  }

  .stats-tuile-valeur {
    font-family: var(--police-titres);
    font-size: 40px;
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  .stats-tuile-vert   .stats-tuile-valeur { color: var(--succes); }
  .stats-tuile-marine .stats-tuile-valeur { color: var(--marine-900); }
  .stats-tuile-rouge  .stats-tuile-valeur { color: var(--danger); }

  .stats-tuile-libelle {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--texte-3);
  }

  /* ---- Espacement entre rangées ---- */
  .stats-rangee {
    margin-bottom: 16px;
  }
</style>`;

/* ============================================================
   Gabarits
   ============================================================ */

/**
 * Carte « Charge par fluide (kg en parc) » : une ligne par fluide
 * présent en parc (kg > 0), barre horizontale proportionnelle au max.
 * @param {{ fluide: string, kgEnParc: number, teqCo2: number }[]} chargeParFluide
 * @returns {string} HTML
 */
function carteChargeParFluide(chargeParFluide) {
  const entrees = chargeParFluide.filter((e) => e.kgEnParc > 0);
  const maxKg = entrees.reduce((max, e) => Math.max(max, e.kgEnParc), 0);

  const lignes = entrees.map((e) => {
    const pct = maxKg > 0 ? (e.kgEnParc / maxKg) * 100 : 0;
    return '<div class="stats-ligne-fluide">'
      + '<div class="stats-ligne-haut">'
      + '<span class="mono stats-code-fluide">' + esc(e.fluide) + '</span>'
      + '<span class="mono stats-ligne-valeurs">'
      + esc(fmtKg(e.kgEnParc)) + ' · ' + esc(fmtTeq(e.teqCo2))
      + '</span>'
      + '</div>'
      + barreProgression(pct, 'accent')
      + '</div>';
  }).join('');

  return '<section class="carte">'
    + '<h3 class="stats-titre-carte">Charge par fluide (kg en parc)</h3>'
    + '<div class="stats-lignes-fluides">'
    + (lignes || '<p class="stats-ligne-valeurs">Aucun fluide en parc.</p>')
    + '</div>'
    + '</section>';
}

/**
 * Une colonne de l'histogramme : valeur au-dessus (« 0,0 » gris si nul),
 * barre verticale de hauteur proportionnelle au maximum des flux.
 * @param {number} valeurKg — quantité du mois (kg)
 * @param {number} maxKg — maximum tous mois et tous types confondus
 * @param {'charge'|'recup'} type — teinte de la barre
 * @returns {string} HTML
 */
function colonneHistogramme(valeurKg, maxKg, type) {
  const nulle = !(valeurKg > 0);
  const pct = (!nulle && maxKg > 0) ? Math.max(3, (valeurKg / maxKg) * 100) : 0;
  const classeValeur = 'stats-valeur-barre' + (nulle ? ' stats-valeur-nulle' : '');
  const barre = nulle
    ? '<div class="stats-barre-v stats-barre-vide"></div>'
    : '<div class="stats-barre-v stats-barre-' + type + '" style="height:' + pct.toFixed(1) + '%"></div>';

  return '<div class="stats-colonne">'
    + '<span class="' + classeValeur + '">' + esc(fmtNombre(valeurKg, 1)) + '</span>'
    + barre
    + '</div>';
}

/**
 * Carte « Flux mensuels (6 mois) » : légende + histogramme en divs flex,
 * un groupe par mois (barre Charge turquoise, barre Récupération violette).
 * @param {{ mois: string, chargeKg: number, recupKg: number }[]} fluxMensuels
 * @returns {string} HTML
 */
function carteFluxMensuels(fluxMensuels) {
  const maxKg = fluxMensuels.reduce(
    (max, f) => Math.max(max, f.chargeKg, f.recupKg), 0);

  const groupes = fluxMensuels.map((f) =>
    '<div class="stats-groupe-mois">'
    + '<div class="stats-barres">'
    + colonneHistogramme(f.chargeKg, maxKg, 'charge')
    + colonneHistogramme(f.recupKg, maxKg, 'recup')
    + '</div>'
    + '<span class="stats-libelle-mois">' + esc(f.mois) + '</span>'
    + '</div>'
  ).join('');

  return '<section class="carte">'
    + '<h3 class="stats-titre-carte">Flux mensuels (6 mois)</h3>'
    + '<div class="stats-legende">'
    + '<span class="stats-legende-item"><span class="stats-point stats-point-charge"></span>Charge</span>'
    + '<span class="stats-legende-item"><span class="stats-point stats-point-recup"></span>Récupération</span>'
    + '</div>'
    + '<div class="stats-histogramme" role="img" aria-label="Histogramme des charges et récupérations mensuelles en kilogrammes">'
    + groupes
    + '</div>'
    + '</section>';
}

/**
 * Grande tuile de synthèse : valeur géante colorée + libellé en capitales.
 * @param {{ valeur: string, libelle: string, teinte: 'vert'|'marine'|'rouge' }} options
 * @returns {string} HTML
 */
function grandeTuile({ valeur, libelle, teinte }) {
  return '<div class="carte stats-tuile stats-tuile-' + esc(teinte) + '">'
    + '<div class="stats-tuile-valeur">' + esc(valeur) + '</div>'
    + '<div class="stats-tuile-libelle">' + esc(libelle) + '</div>'
    + '</div>';
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * Rend la vue Statistiques dans le conteneur fourni (déjà vidé).
 * @param {HTMLElement} conteneur
 * @param {{ store: object, naviguer: (vue: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const stats = await ctx.store.getStats();

  conteneur.innerHTML = STYLES_VUE
    + enteteVue({
      titre: 'Statistiques',
      sousTitre: 'Répartition des fluides, flux et conformité'
    })
    + '<div class="grille-2 stats-rangee">'
    + carteChargeParFluide(stats.chargeParFluide)
    + carteFluxMensuels(stats.fluxMensuels)
    + '</div>'
    + '<div class="grille-3">'
    + grandeTuile({
      valeur: fmtNombre(stats.tauxConformitePct, 0) + ' %',
      libelle: 'Taux conformité',
      teinte: 'vert'
    })
    + grandeTuile({
      valeur: fmtNombre(stats.nbControles, 0),
      libelle: 'Contrôles réalisés',
      teinte: 'marine'
    })
    + grandeTuile({
      valeur: fmtNombre(stats.nbFuites, 0),
      libelle: 'Fuites détectées',
      teinte: 'rouge'
    })
    + '</div>';

  // Vue en lecture seule : aucun écouteur à attacher.
}
