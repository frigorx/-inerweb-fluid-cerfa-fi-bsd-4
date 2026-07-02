// ============================================================
// inerWeb Fluide — vue « Bilan annuel »
// Bilan annuel de traçabilité : tableau de suivi réglementaire
// par fluide (déclaration ADEME), deux cartes de totaux dégradées,
// export CSV (séparateur « ; », BOM UTF-8) et impression.
// Lecture seule (Phase A) : tout vient de ctx.store.getBilan(année).
// ============================================================

import { enteteVue, tableau, toast, ICONES } from './communs.js';
import { esc, fmtKg, fmtNombre } from '../core/utils.js';

export const titre = 'Bilan annuel';

// Années proposées dans le sélecteur (monde de démo : 2026 uniquement)
const ANNEES = [2026];
const ANNEE_PAR_DEFAUT = 2026;

/* ============================================================
   Styles propres à la vue (cartes dégradées, bouton vert,
   sélecteur d'année) — préfixés .vue-bilan pour rester cloisonnés.
   ============================================================ */

const STYLES_VUE = `
<style>
  .vue-bilan .bilan-cartes { margin-bottom: 20px; }

  /* Grande carte de total : dégradé, texte blanc, valeur géante */
  .vue-bilan .bilan-carte-total {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 22px 24px;
    border-radius: var(--rayon-carte);
    color: #ffffff;
    box-shadow: var(--ombre-douce);
  }
  .vue-bilan .bilan-carte-charge   { background: var(--degrade-bouton); }
  .vue-bilan .bilan-carte-recupere { background: linear-gradient(150deg, #7c3aed, #5b21b6); }

  .vue-bilan .bilan-carte-libelle {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .12em;
    text-transform: uppercase;
    opacity: .85;
  }
  .vue-bilan .bilan-carte-valeur {
    font-family: var(--police-titres);
    font-size: 42px;
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .vue-bilan .bilan-carte-detail {
    font-size: 12.5px;
    opacity: .8;
  }

  /* Bouton vert (export CSV) : même gabarit que .btn */
  .vue-bilan .btn-vert {
    background: var(--succes);
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(22, 163, 74, .3);
  }
  .vue-bilan .btn-vert:hover:not(:disabled) { filter: brightness(1.06); }

  /* Sélecteur d'année dans les actions d'entête */
  .vue-bilan .selecteur-annee {
    padding: 8px 12px;
    border: 1px solid var(--bordure);
    border-radius: var(--rayon-bouton);
    background: var(--carte);
    color: var(--texte-2);
    font-size: 13.5px;
    font-weight: 600;
    box-shadow: var(--ombre-douce);
    cursor: pointer;
  }

  /* Cellules du tableau : code fluide mono gras, récupéré violet, CO₂ gras */
  .vue-bilan .bilan-fluide {
    font-family: var(--police-mono);
    font-weight: 600;
    color: var(--texte);
  }
  .vue-bilan .bilan-recupere-positif { color: var(--violet); font-weight: 600; }
  .vue-bilan .bilan-teq              { font-weight: 600; color: var(--texte); }
</style>`;

/* ============================================================
   Gabarits HTML
   ============================================================ */

/** Actions d'entête : sélecteur d'année, Export CSV (vert), Imprimer. */
function actionsEntete(annee) {
  const options = ANNEES.map((a) =>
    `<option value="${a}"${a === annee ? ' selected' : ''}>${a}</option>`
  ).join('');

  return `<select id="selecteur-annee" class="selecteur-annee no-print" aria-label="Année du bilan">${options}</select>`
    + `<button type="button" id="btn-export-csv" class="btn btn-vert no-print">${ICONES.telecharger}Export CSV</button>`
    + `<button type="button" id="btn-imprimer" class="btn btn-secondaire no-print">${ICONES.imprimer}Imprimer</button>`;
}

/** Les deux grandes cartes de totaux (chargé turquoise / récupéré violet). */
function cartesTotaux(bilan) {
  return '<div class="grille-2 bilan-cartes">'
    + '<section class="bilan-carte-total bilan-carte-charge">'
    + `<span class="bilan-carte-libelle">Total chargé ${esc(bilan.annee)}</span>`
    + `<span class="bilan-carte-valeur">${esc(fmtKg(bilan.totalChargeKg))}</span>`
    + '<span class="bilan-carte-detail">Charges et mises en service de l’année</span>'
    + '</section>'
    + '<section class="bilan-carte-total bilan-carte-recupere">'
    + `<span class="bilan-carte-libelle">Total récupéré ${esc(bilan.annee)}</span>`
    + `<span class="bilan-carte-valeur">${esc(fmtKg(bilan.totalRecupereKg))}</span>`
    + '<span class="bilan-carte-detail">Fluide récupéré en bouteilles sur l’année</span>'
    + '</section>'
    + '</div>';
}

/** Tableau réglementaire par fluide. */
function tableauBilan(bilan) {
  const colonnes = [
    { cle: 'fluide',    libelle: 'Fluide' },
    { cle: 'famille',   libelle: 'Famille' },
    { cle: 'gwp',       libelle: 'GWP',            align: 'droite' },
    { cle: 'charge',    libelle: 'Chargé (kg)',    align: 'droite' },
    { cle: 'recupere',  libelle: 'Récupéré (kg)',  align: 'droite' },
    { cle: 'enParc',    libelle: 'En parc (kg)',   align: 'droite' },
    { cle: 'teqCo2',    libelle: 'CO₂ éq (t)', align: 'droite' }
  ];

  const lignesHtml = bilan.lignes.map((ligne) => {
    const classeRecupere = ligne.recupereKg > 0 ? ' bilan-recupere-positif' : '';
    return '<tr>'
      + `<td class="bilan-fluide">${esc(ligne.fluide)}</td>`
      + `<td>${esc(ligne.famille)}</td>`
      + `<td class="cellule-mono align-droite">${esc(fmtNombre(ligne.gwpAr4, 0))}</td>`
      + `<td class="cellule-mono align-droite">${esc(fmtNombre(ligne.chargeKg, 2))}</td>`
      + `<td class="cellule-mono align-droite${classeRecupere}">${esc(fmtNombre(ligne.recupereKg, 2))}</td>`
      + `<td class="cellule-mono align-droite">${esc(fmtNombre(ligne.enParcKg, 2))}</td>`
      + `<td class="cellule-mono align-droite bilan-teq">${esc(fmtNombre(ligne.teqCo2, 2))}</td>`
      + '</tr>';
  });

  return tableau({ colonnes, lignesHtml });
}

/** Page complète de la vue pour un bilan donné. */
function construireHtml(bilan) {
  return '<div class="vue-bilan anim-fade">'
    + STYLES_VUE
    + enteteVue({
      titre: 'Bilan annuel de traçabilité',
      sousTitre: 'Tableau de suivi réglementaire par fluide — déclaration ADEME',
      actionsHtml: actionsEntete(bilan.annee)
    })
    + cartesTotaux(bilan)
    + tableauBilan(bilan)
    + '</div>';
}

/* ============================================================
   Export CSV
   ============================================================ */

/** Nombre au format CSV français : virgule décimale, sans séparateur de milliers. */
function nombreCsv(n, dec = 2) {
  const valeur = Number(n);
  if (!Number.isFinite(valeur)) return '';
  return valeur.toFixed(dec).replace('.', ',');
}

/**
 * Génère le contenu CSV du tableau (séparateur « ; », BOM UTF-8,
 * fins de ligne CRLF pour compatibilité tableur).
 * @param {object} bilan - résultat de store.getBilan(année)
 * @returns {string}
 */
function genererCsv(bilan) {
  const sep = ';';
  const rangees = [];

  rangees.push(['Fluide', 'Famille', 'GWP (AR4)', 'Chargé (kg)',
    'Récupéré (kg)', 'En parc (kg)', 'CO2 éq (t)'].join(sep));

  for (const ligne of bilan.lignes) {
    rangees.push([
      ligne.fluide,
      ligne.famille,
      nombreCsv(ligne.gwpAr4, 0),
      nombreCsv(ligne.chargeKg),
      nombreCsv(ligne.recupereKg),
      nombreCsv(ligne.enParcKg),
      nombreCsv(ligne.teqCo2)
    ].join(sep));
  }

  // Ligne de totaux (chargé / récupéré, comme les cartes)
  rangees.push(['TOTAL', '', '',
    nombreCsv(bilan.totalChargeKg),
    nombreCsv(bilan.totalRecupereKg),
    '', ''].join(sep));

  // BOM UTF-8 en tête pour que les tableurs reconnaissent l'encodage
  return '\uFEFF' + rangees.join('\r\n');
}

/** Déclenche le téléchargement d'un fichier CSV par lien temporaire. */
function telechargerCsv(contenu, nomFichier) {
  const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  // Libère l'URL objet une fois le téléchargement lancé
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * Rendu de la vue « Bilan annuel ».
 * @param {HTMLElement} conteneur - élément déjà vidé par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  let bilanCourant = null;

  /** Charge le bilan de l'année demandée, rend la page et branche les écouteurs. */
  async function chargerEtAfficher(annee) {
    bilanCourant = await ctx.store.getBilan(annee);
    conteneur.innerHTML = construireHtml(bilanCourant);
    attacherEcouteurs();
  }

  /** Branche sélecteur d'année, export CSV et impression. */
  function attacherEcouteurs() {
    const selecteur = conteneur.querySelector('#selecteur-annee');
    const boutonCsv = conteneur.querySelector('#btn-export-csv');
    const boutonImprimer = conteneur.querySelector('#btn-imprimer');

    selecteur.addEventListener('change', () => {
      chargerEtAfficher(Number(selecteur.value));
    });

    boutonCsv.addEventListener('click', () => {
      const nomFichier = `bilan-fluides-${bilanCourant.annee}.csv`;
      telechargerCsv(genererCsv(bilanCourant), nomFichier);
      toast(`Export « ${nomFichier} » téléchargé.`, 'succes');
    });

    boutonImprimer.addEventListener('click', () => {
      window.print();
    });
  }

  await chargerEtAfficher(ANNEE_PAR_DEFAUT);
}
