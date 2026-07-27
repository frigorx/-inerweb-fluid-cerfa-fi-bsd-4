// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — vue « Bilan annuel »
// Bilan annuel de traçabilité : tableau de suivi réglementaire
// par fluide, la déclaration annuelle réglementaire (11 rubriques, arrêté
// du 21/11/2025 — matrice préparatoire à valider par l'organisme agréé),
// deux cartes de totaux dégradées,
// export CSV (séparateur « ; », BOM UTF-8) et impression.
// IM-16 : synthèse « Audit en 5 minutes », page unique imprimable.
// Lecture seule (Phase A) : tout vient de ctx.store.getBilan(année).
// ============================================================

import { enteteVue, tableau, modale, toast, ICONES } from './communs.js';
import { esc, fmtKg, fmtDate, fmtNombre } from '../core/utils.js';
import { genererDossierAudit } from '../documents/dossier-audit.js';
import { estContreEcriture } from '../documents/regularisation.js';
import { MENTION_PIECE_NON_PROBANTE } from '../data/remise-filiere.js';

export const titre = 'Bilan annuel';

/**
 * Affiche l'empreinte SHA-256 de scellement du dossier d'audit qui vient
 * d'être exporté. L'utilisateur doit la CONSERVER HORS du logiciel : c'est
 * la preuve d'inviolabilité (tamper-evidence) — recalculer l'empreinte du
 * .zip et la comparer révèle toute modification ultérieure.
 * @param {number} annee
 * @param {string} nomFichier
 * @param {string} empreinte - SHA-256 hex du fichier .zip
 */
function afficherEmpreinteScellement(annee, nomFichier, empreinte) {
  const { fermer, racine } = modale({
    titre: `Scellement du dossier d'audit ${annee}`,
    contenuHtml:
      '<p class="modale-intro">Empreinte <strong>SHA-256</strong> du dossier « '
      + esc(nomFichier) + ' ». Conservez-la <strong>hors du logiciel</strong> '
      + '(impression, courriel à vous-même, coffre numérique) : elle prouve '
      + 'que le dossier n\'a pas été modifié après l\'export. Pour vérifier plus '
      + 'tard, recalculez l\'empreinte SHA-256 du fichier .zip et comparez-la à '
      + 'cette valeur.</p>'
      + '<div class="empreinte-scellement">' + esc(empreinte) + '</div>',
    actionsHtml:
      '<button type="button" id="empreinte-copier" class="btn btn-contour">Copier l\'empreinte</button>'
      + '<button type="button" id="empreinte-fermer" class="btn btn-marine">Fermer</button>'
  });
  const champ = racine.querySelector('.empreinte-scellement');
  if (champ && !document.getElementById('style-empreinte-scellement')) {
    const style = document.createElement('style');
    style.id = 'style-empreinte-scellement';
    style.textContent = '.empreinte-scellement{font-family:var(--police-mono);'
      + 'font-size:13px;line-height:1.6;word-break:break-all;background:var(--fond-2);'
      + 'border:1px solid var(--bordure);border-radius:var(--rayon-bouton);'
      + 'padding:12px;color:var(--texte);user-select:all;}';
    document.head.appendChild(style);
  }
  racine.querySelector('#empreinte-fermer').addEventListener('click', fermer);
  racine.querySelector('#empreinte-copier').addEventListener('click', async function () {
    try {
      await navigator.clipboard.writeText(empreinte);
      toast('Empreinte copiée.', 'succes');
    } catch {
      // Presse-papiers indisponible : la valeur reste sélectionnable à l'écran
      // (user-select:all) — l'utilisateur peut la copier à la main.
      toast('Copie automatique indisponible — sélectionnez le texte affiché.', 'info');
    }
  });
}

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

  /* Déclaration annuelle réglementaire (11 rubriques, P0-8) */
  .vue-bilan .decl-section { margin-top: 28px; }
  .vue-bilan .decl-titre { font-size: 1.05rem; margin: 0 0 8px; }
  .vue-bilan .decl-actions { margin-bottom: 10px; }
  .vue-bilan .decl-note { font-size: 0.85rem; color: var(--texte-doux); margin: 0 0 10px; }
  .vue-bilan .decl-bandeau { border-radius: var(--rayon-bouton); padding: 10px 14px; margin-bottom: 12px; font-size: 0.9rem; }
  .vue-bilan .decl-ok { background: var(--fond-2); border: 1px solid var(--bordure); color: var(--texte-doux); }
  .vue-bilan .decl-anomalies { background: #fdf3e7; border: 1px solid #e0a96d; color: #8a4b16; }
  .vue-bilan .decl-anomalies ul { margin: 6px 0 0; padding-left: 20px; }
  .vue-bilan .decl-scroll { overflow-x: auto; }
  .vue-bilan .decl-table { min-width: 1100px; }
  .vue-bilan .decl-legende { font-size: 0.8rem; color: var(--texte-doux); margin-top: 10px; }
  .vue-bilan .decl-vide { color: var(--texte-doux); font-style: italic; }
</style>`;

/* ============================================================
   Gabarits HTML
   ============================================================ */

/** Actions d'entête : sélecteur d'année, Export CSV (vert), Imprimer. */
function actionsEntete(annee, annees) {
  const options = annees.map((a) =>
    `<option value="${a}"${a === annee ? ' selected' : ''}>${a}</option>`
  ).join('');

  return `<select id="selecteur-annee" class="selecteur-annee no-print" aria-label="Année du bilan">${options}</select>`
    + `<button type="button" id="btn-audit-5min" class="btn btn-contour no-print">${ICONES.controle}Audit en 5 minutes</button>`
    + `<button type="button" id="btn-dossier-audit" class="btn btn-marine no-print">${ICONES.telecharger}Dossier audit annuel (ZIP)</button>`
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
      // Décimales adaptatives : PRP < 1 depuis F-Gas III (0,501 · 0,02),
      // un arrondi à l'entier afficherait « 1 » ou « 0 » (faux).
      + `<td class="cellule-mono align-droite">${esc(fmtNombre(ligne.gwpAr4, ligne.gwpAr4 < 1 ? 3 : 0))}</td>`
      + `<td class="cellule-mono align-droite">${esc(fmtNombre(ligne.chargeKg, 2))}</td>`
      + `<td class="cellule-mono align-droite${classeRecupere}">${esc(fmtNombre(ligne.recupereKg, 2))}</td>`
      + `<td class="cellule-mono align-droite">${esc(fmtNombre(ligne.enParcKg, 2))}</td>`
      + `<td class="cellule-mono align-droite bilan-teq">${esc(fmtNombre(ligne.teqCo2, 2))}</td>`
      + '</tr>';
  });

  return tableau({ colonnes, lignesHtml });
}

/* ------------------------------------------------------------
   Déclaration annuelle réglementaire (11 rubriques, P0-8)
   ------------------------------------------------------------ */

/** Masse en kg : « — » pour un zéro (nil réglementaire), sinon 2 décimales. */
function celKg(x) {
  return Math.abs(Number(x) || 0) < 1e-9 ? '—' : esc(fmtNombre(x, 2));
}

/** Note « préparatoire » + bandeau d'anomalies / complétude. */
function bandeauDeclaration(declaration) {
  const note = '<p class="decl-note">Matrice <strong>préparatoire</strong> — '
    + 'à valider par l’organisme agréé avant tout dépôt. Ce n’est pas le '
    + 'formulaire officiel.</p>';
  if (!declaration.anomalies.length) {
    return note + '<div class="decl-bandeau decl-ok">Aucune anomalie détectée '
      + 'pour cette année (stocks établis, traitements finaux attestés).</div>';
  }
  const items = declaration.anomalies
    .map((a) => `<li>${esc(a.message)}</li>`).join('');
  return note + '<div class="decl-bandeau decl-anomalies">'
    + `<strong>${declaration.anomalies.length} point(s) à régulariser :</strong>`
    + `<ul>${items}</ul></div>`;
}

/** Le tableau des 11 rubriques (large, défilable horizontalement). */
function tableauDeclaration(declaration) {
  if (!declaration.lignes.length) {
    return '<p class="decl-vide">Aucun mouvement de fluide déclarable pour '
      + `${esc(declaration.annee)}.</p>`;
  }
  const enTete = ['Fluide', '1. Acquis.', '2. Ch. neuf', '3. Ch. maint.',
    '4. Récup. HU', '5. Récup. maint.', '6. Remises distrib.',
    '7. Recycl. propre', '8. Régénér.', '9. Destruction', '10. Cessions',
    'Stock 1/1 (neuf·récup·déchet)', 'Stock 31/12 (neuf·récup·déchet)']
    .map((t, i) => `<th${i === 0 ? '' : ' class="align-droite"'}>${esc(t)}</th>`)
    .join('');
  const cel = (x) => `<td class="cellule-mono align-droite">${celKg(x)}</td>`;
  const lignes = declaration.lignes.map((l) => {
    const instR = l.regenerationInstallations.join(' · ');
    const instD = l.destructionInstallations.join(' · ');
    const stockD = `${celKg(l.stockDebutNeufKg)} · ${celKg(l.stockDebutRecupKg)} · ${celKg(l.stockDebutDechetKg)}`;
    const stockF = `${celKg(l.stockFinNeufKg)} · ${celKg(l.stockFinRecupKg)} · ${celKg(l.stockFinDechetKg)}`;
    return '<tr>'
      + `<td class="bilan-fluide">${esc(l.fluide)}</td>`
      + cel(l.acquisitionsKg) + cel(l.chargesNeufKg)
      + cel(l.chargesMaintenanceKg) + cel(l.recupHorsUsageKg)
      + cel(l.recupMaintenanceKg) + cel(l.remisesDistributeurKg)
      + cel(l.recyclagePropreKg)
      + `<td class="cellule-mono align-droite"${instR ? ` title="${esc(instR)}"` : ''}>${celKg(l.regenerationKg)}</td>`
      + `<td class="cellule-mono align-droite"${instD ? ` title="${esc(instD)}"` : ''}>${celKg(l.destructionKg)}</td>`
      + cel(l.cessionsKg)
      + `<td class="cellule-mono align-droite">${stockD}</td>`
      + `<td class="cellule-mono align-droite">${stockF}</td>`
      + '</tr>';
  }).join('');
  return '<div class="decl-scroll"><table class="tableau decl-table">'
    + `<thead><tr>${enTete}</tr></thead><tbody>${lignes}</tbody></table></div>`;
}

/** Section « Déclaration annuelle réglementaire ». */
function sectionDeclaration(declaration) {
  return '<section class="decl-section">'
    + '<h3 class="decl-titre">Déclaration annuelle réglementaire — '
    + `11 rubriques (${esc(declaration.annee)})</h3>`
    + '<div class="decl-actions no-print">'
    + `<button type="button" id="btn-export-decl" class="btn btn-vert">${ICONES.telecharger}Export déclaration (CSV)</button>`
    + '</div>'
    + bandeauDeclaration(declaration)
    + tableauDeclaration(declaration)
    + '<p class="decl-legende">Rubrique 9 (destruction) : uniquement les '
    + 'remises en filière dont l’issue « destruction » est '
    + '<strong>attestée</strong> (installation en info-bulle). Une remise '
    + 'sans issue attestée n’est jamais comptée en destruction. Une issue '
    + 'attestée sur un suivi sans aucune pièce jointe reste comptée, mais '
    + 'elle est signalée en anomalie : la pièce est à produire en cas de '
    + 'contrôle. ' + esc(MENTION_PIECE_NON_PROBANTE) + ' Rubrique 7 (recyclage sous '
    + 'responsabilité propre) : sans objet ici — le recyclé / régénéré s’achète '
    + 'certifié.</p>'
    + '</section>';
}

/** Page complète de la vue pour un bilan donné. */
function construireHtml(bilan, declaration, annees) {
  return '<div class="vue-bilan anim-fade">'
    + STYLES_VUE
    + enteteVue({
      titre: 'Bilan annuel de traçabilité',
      sousTitre: 'Synthèse annuelle par fluide et déclaration réglementaire',
      actionsHtml: actionsEntete(bilan.annee, annees)
    })
    + cartesTotaux(bilan)
    + tableauBilan(bilan)
    + sectionDeclaration(declaration)
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

  rangees.push(['Fluide', 'Famille', 'PRP réglementaire', 'Chargé (kg)',
    'Récupéré (kg)', 'En parc (kg)', 'CO2 éq (t)'].join(sep));

  for (const ligne of bilan.lignes) {
    rangees.push([
      ligne.fluide,
      ligne.famille,
      // Décimales adaptatives (PRP < 1 depuis F-Gas III) — le CSV est un
      // support de déclaration, « 0 » serait factuellement faux.
      nombreCsv(ligne.gwpAr4, ligne.gwpAr4 < 1 ? 3 : 0),
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

/**
 * CSV de la d\u00E9claration annuelle (11 rubriques par fluide). M\u00EAme format que
 * genererCsv (s\u00E9parateur \u00AB ; \u00BB, BOM UTF-8, CRLF). Les champs texte
 * (installations) voient leur \u00AB ; \u00BB remplac\u00E9 par \u00AB , \u00BB pour ne pas casser
 * les colonnes (le format existant ne cite pas les champs).
 */
function genererCsvDeclaration(declaration) {
  const sep = ';';
  const texte = (s) => String(s ?? '').replace(/;/g, ',');
  const rangees = [];
  rangees.push(['Fluide', 'Acquisitions (kg)', 'Charges equip. neufs (kg)',
    'Charges maintenance (kg)', 'Recuperations hors usage (kg)',
    'Recuperations maintenance (kg)', 'Remises distributeur (kg)',
    'Recyclage responsabilite propre (kg)', 'Regeneration (kg)',
    'Installations regeneration', 'Destruction (kg)',
    'Installations destruction', 'Cessions (kg)',
    'Stock 1/1 neuf (kg)', 'Stock 1/1 recupere (kg)', 'Stock 1/1 dechet (kg)',
    'Stock 31/12 neuf (kg)', 'Stock 31/12 recupere (kg)',
    'Stock 31/12 dechet (kg)'].join(sep));
  for (const l of declaration.lignes) {
    rangees.push([
      texte(l.fluide),
      nombreCsv(l.acquisitionsKg), nombreCsv(l.chargesNeufKg),
      nombreCsv(l.chargesMaintenanceKg), nombreCsv(l.recupHorsUsageKg),
      nombreCsv(l.recupMaintenanceKg), nombreCsv(l.remisesDistributeurKg),
      nombreCsv(l.recyclagePropreKg), nombreCsv(l.regenerationKg),
      texte(l.regenerationInstallations.join(' | ')),
      nombreCsv(l.destructionKg),
      texte(l.destructionInstallations.join(' | ')),
      nombreCsv(l.cessionsKg),
      nombreCsv(l.stockDebutNeufKg), nombreCsv(l.stockDebutRecupKg),
      nombreCsv(l.stockDebutDechetKg), nombreCsv(l.stockFinNeufKg),
      nombreCsv(l.stockFinRecupKg), nombreCsv(l.stockFinDechetKg)
    ].join(sep));
  }
  return '\uFEFF' + rangees.join('\r\n');
}

/** Déclenche le téléchargement d'un fichier CSV par lien temporaire. */
function telechargerCsv(contenu, nomFichier) {
  const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8' });
  telechargerBlob(blob, nomFichier);
}

/** Déclenche le téléchargement d'un Blob quelconque par lien temporaire. */
function telechargerBlob(blob, nomFichier) {
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
   IM-16 : synthèse « Audit en 5 minutes »
   ------------------------------------------------------------
   Page unique en lecture seule, imprimable, résumant en un coup
   d'œil ce qu'un auditeur F-Gas viendrait vérifier : attestation
   de capacité, personnel (aptitudes), outillage, machines/contrôles,
   alertes critiques ouvertes, balance de l'année, nombre de CERFA.
   Tout est recalculé depuis le store (aucune saisie ici).
   ============================================================ */

const STYLE_AUDIT5MIN_ID = 'style-audit-5-minutes';

/** Injecte une fois le style de la synthèse (écran + impression). */
function assurerStyleAudit5Minutes() {
  if (document.getElementById(STYLE_AUDIT5MIN_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_AUDIT5MIN_ID;
  style.textContent = `
    .audit5min-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 760px;
      margin: 0 auto;
    }
    .audit5min-entete {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-bottom: 10px;
      border-bottom: 2px solid var(--marine-900);
    }
    .audit5min-entete h2 {
      font-family: var(--police-titres);
      font-size: 19px;
      font-weight: 700;
      color: var(--marine-900);
    }
    .audit5min-entete p {
      font-size: 12.5px;
      color: var(--texte-3);
    }
    .audit5min-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 0;
      border-bottom: 1px solid var(--bordure-2);
    }
    .audit5min-section:last-child { border-bottom: none; }
    .audit5min-section h3 {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: var(--texte-3);
    }
    .audit5min-lignes { display: flex; flex-direction: column; gap: 4px; }
    .audit5min-ligne {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
      color: var(--texte);
    }
    .audit5min-ligne-libelle { color: var(--texte-2); }
    .audit5min-ligne-valeur { font-weight: 600; text-align: right; }
    .audit5min-ok { color: var(--succes, #16a34a); }
    .audit5min-alerte { color: var(--danger, #dc2626); }
    .audit5min-liste-puces {
      margin: 0;
      padding-left: 18px;
      font-size: 12.5px;
      color: var(--texte-2);
    }
    .audit5min-liste-puces li { margin-bottom: 3px; }
    .audit5min-liste-puces .audit5min-alerte { font-weight: 600; }
    .audit5min-vide { font-size: 12.5px; color: var(--texte-3); }

    @media print {
      body * { visibility: hidden; }
      .audit5min-page, .audit5min-page * { visibility: visible; }
      .audit5min-page {
        position: fixed; inset: 0; margin: 0; max-width: 100%;
        padding: 14mm;
      }
    }
  `;
  document.head.appendChild(style);
}

/** Une ligne libellé/valeur, avec classe optionnelle sur la valeur. */
function ligneAudit5min(libelle, valeur, classeValeur = '') {
  return '<div class="audit5min-ligne">'
    + '<span class="audit5min-ligne-libelle">' + esc(libelle) + '</span>'
    + '<span class="audit5min-ligne-valeur' + (classeValeur ? ' ' + classeValeur : '') + '">'
    + esc(valeur) + '</span>'
    + '</div>';
}

/** Rassemble les données de la synthèse depuis le store (une année donnée). */
async function collecterDonneesAudit5Minutes(store, annee) {
  const [etablissement, personnel, outillage, machines, alertes, balance, mouvements] =
    await Promise.all([
      store.getEtablissement(),
      store.getPersonnel(),
      store.getOutillage(),
      store.getMachines(),
      store.getAlertes(),
      store.getBalanceMatiere(annee),
      store.getMouvements()
    ]);

  const jour = new Date().toISOString().slice(0, 10);

  // Personnel actif : aptitudes valides vs expirées
  const personnelActif = personnel.filter((p) => p.actif !== false);
  const aptitudesExpirees = personnelActif.filter(
    (p) => p.dateFinValidite && p.dateFinValidite < jour);
  const aptitudesValides = personnelActif.length - aptitudesExpirees.length;

  // Outillage : conforme vs expiré (statut déjà recalculé par le store)
  const outillageExpire = outillage.filter((o) => o.statut === 'EXPIRE');
  const outillageConforme = outillage.length - outillageExpire.length;

  // Machines : en service vs à l'arrêt/démantelées, et contrôles en retard
  const machinesActives = machines.filter((m) => m.statut !== 'DEMANTELEE');
  const controlesEnRetard = machines.filter((m) =>
    m.statut !== 'DEMANTELEE' && m.statut !== 'ARRETEE' &&
    m.prochainControle && m.prochainControle < jour);

  // Alertes critiques ouvertes (déjà triées, critiques en tête)
  const alertesCritiques = alertes.filter((a) => a.niveau === 'CRITIQUE');

  // Balance : écarts justifiés / non justifiés (fluides avec inventaire saisi)
  const lignesInventoriees = balance.lignes.filter((l) => l.stockReelKg !== null);
  const ecartsNonJustifies = lignesInventoriees.filter((l) =>
    l.ecartKg !== null && Math.abs(l.ecartKg) > 0.01 && !l.justification);
  const ecartsJustifies = lignesInventoriees.filter((l) =>
    l.ecartKg !== null && Math.abs(l.ecartKg) > 0.01 && l.justification);

  // A02 : le numéro de fiche est posé dans TOUS les modes (Formation
  // comprise) — un total annoncé « CERFA » compterait donc aussi les
  // exercices d'élèves, dans un document remis tel quel à un auditeur.
  // On sépare : la part opposable se lit au MODE scellé de l'écriture,
  // JAMAIS au préfixe du numéro (la Démo numérote « FI- » des fiches
  // Formation). Tout mouvement dont le mode n'est pas OFFICIEL compte en
  // exercice : on ne surestime jamais le chiffre officiel.
  const prefixeAnnee = `${annee}-`;
  // ⚠ Lot 1 branche A (27/07/2026) : les CONTRE-ÉCRITURES sortent du
  // compte — même règle et même critère qu'au tableau de bord. Les
  // nouvelles n'ont plus de `cerfaNumero`, les anciennes gardent le leur
  // mais ne donnent plus de fiche : les compter annoncerait, dans un
  // document remis tel quel à un auditeur, des fiches qui n'existent pas.
  const fichesAnnee = mouvements.filter((mv) =>
    mv.cerfaNumero && !estContreEcriture(mv)
    && mv.date.startsWith(prefixeAnnee));
  const nbCerfaOfficiels =
    fichesAnnee.filter((mv) => mv.mode === 'OFFICIEL').length;
  const nbFichesFormation = fichesAnnee.length - nbCerfaOfficiels;

  return {
    annee, etablissement, jour,
    aptitudesValides, aptitudesExpirees,
    outillageConforme, outillageExpire,
    machinesActives, controlesEnRetard,
    alertesCritiques,
    ecartsJustifies, ecartsNonJustifies, lignesInventoriees,
    nbFichesAnnee: fichesAnnee.length, nbCerfaOfficiels, nbFichesFormation
  };
}

/** Construit le HTML complet de la page de synthèse. */
function gabaritAudit5Minutes(d) {
  const echeanceCapacite = d.etablissement.dateEcheanceCapacite;
  const capaciteExpiree = Boolean(echeanceCapacite && echeanceCapacite < d.jour);

  const listeControles = d.controlesEnRetard.length
    ? '<ul class="audit5min-liste-puces">' + d.controlesEnRetard.map((m) =>
        '<li class="audit5min-alerte">' + esc(m.designation)
        + ' — échéance ' + esc(fmtDate(m.prochainControle)) + '</li>').join('') + '</ul>'
    : '<p class="audit5min-vide">Aucun contrôle en retard.</p>';

  const listeAlertes = d.alertesCritiques.length
    ? '<ul class="audit5min-liste-puces">' + d.alertesCritiques.map((a) =>
        '<li class="audit5min-alerte">' + esc(a.titre)
        + (a.detail ? ' — ' + esc(a.detail) : '') + '</li>').join('') + '</ul>'
    : '<p class="audit5min-vide">Aucune alerte critique ouverte.</p>';

  return '<div class="audit5min-page">'

    + '<div class="audit5min-entete">'
    + '<h2>Audit en 5 minutes — ' + esc(d.annee) + '</h2>'
    + '<p>' + esc(d.etablissement.raisonSociale || '—')
    + ' · document généré le ' + esc(fmtDate(d.jour)) + '</p>'
    + '</div>'

    + '<div class="audit5min-section">'
    + '<h3>Attestation de capacité</h3>'
    + '<div class="audit5min-lignes">'
    + ligneAudit5min('Numéro', d.etablissement.numAttestationCapacite || '—')
    + ligneAudit5min('Échéance', fmtDate(echeanceCapacite),
        capaciteExpiree ? 'audit5min-alerte' : 'audit5min-ok')
    + '</div>'
    + '</div>'

    + '<div class="audit5min-section">'
    + '<h3>Personnel</h3>'
    + '<div class="audit5min-lignes">'
    + ligneAudit5min('Aptitudes valides', String(d.aptitudesValides), 'audit5min-ok')
    + ligneAudit5min('Aptitudes expirées', String(d.aptitudesExpirees.length),
        d.aptitudesExpirees.length ? 'audit5min-alerte' : 'audit5min-ok')
    + '</div>'
    + '</div>'

    + '<div class="audit5min-section">'
    + '<h3>Outillage réglementaire</h3>'
    + '<div class="audit5min-lignes">'
    + ligneAudit5min('Conforme', String(d.outillageConforme), 'audit5min-ok')
    + ligneAudit5min('Expiré', String(d.outillageExpire.length),
        d.outillageExpire.length ? 'audit5min-alerte' : 'audit5min-ok')
    + '</div>'
    + '</div>'

    + '<div class="audit5min-section">'
    + '<h3>Machines et contrôles d’étanchéité</h3>'
    + '<div class="audit5min-lignes">'
    + ligneAudit5min('Machines suivies', String(d.machinesActives.length))
    + ligneAudit5min('Contrôles en retard', String(d.controlesEnRetard.length),
        d.controlesEnRetard.length ? 'audit5min-alerte' : 'audit5min-ok')
    + '</div>'
    + listeControles
    + '</div>'

    + '<div class="audit5min-section">'
    + '<h3>Alertes critiques ouvertes</h3>'
    + listeAlertes
    + '</div>'

    + '<div class="audit5min-section">'
    + '<h3>Balance matière ' + esc(d.annee) + '</h3>'
    + '<div class="audit5min-lignes">'
    + ligneAudit5min('Fluides inventoriés', String(d.lignesInventoriees.length))
    + ligneAudit5min('Écarts justifiés', String(d.ecartsJustifies.length))
    + ligneAudit5min('Écarts non justifiés', String(d.ecartsNonJustifies.length),
        d.ecartsNonJustifies.length ? 'audit5min-alerte' : 'audit5min-ok')
    + '</div>'
    + '</div>'

    + '<div class="audit5min-section">'
    + '<h3>Fiches d’intervention</h3>'
    + '<div class="audit5min-lignes">'
    + ligneAudit5min('Fiches numérotées en ' + d.annee, String(d.nbFichesAnnee))
    + ligneAudit5min('CERFA officiels (mode Officiel)', String(d.nbCerfaOfficiels))
    + ligneAudit5min('Fiches d’exercice (mode Formation)', String(d.nbFichesFormation))
    + '</div>'
    + '</div>'

    + '</div>';
}

/**
 * Ouvre la modale « Audit en 5 minutes » : synthèse imprimable une page.
 * @param {{ store: object }} ctx
 * @param {number} annee
 */
async function ouvrirAudit5Minutes(ctx, annee) {
  assurerStyleAudit5Minutes();
  const donnees = await collecterDonneesAudit5Minutes(ctx.store, annee);

  const { fermer, racine } = modale({
    titre: 'Audit en 5 minutes — ' + annee,
    contenuHtml: gabaritAudit5Minutes(donnees),
    actionsHtml:
      '<button type="button" id="audit5min-fermer" class="btn btn-secondaire no-print">Fermer</button>'
      + '<button type="button" id="audit5min-imprimer" class="btn btn-marine no-print">'
      + ICONES.imprimer + '<span>Imprimer</span></button>'
  });

  racine.querySelector('#audit5min-fermer').addEventListener('click', function () {
    fermer();
  });
  racine.querySelector('#audit5min-imprimer').addEventListener('click', function () {
    window.print();
  });
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
  let declarationCourante = null;
  let anneesDisponibles = [];

  /** Charge le bilan de l'année demandée, rend la page et branche les écouteurs. */
  async function chargerEtAfficher(annee) {
    [bilanCourant, declarationCourante] = await Promise.all([
      ctx.store.getBilan(annee),
      ctx.store.getDeclarationAnnuelle(annee)
    ]);
    conteneur.innerHTML =
      construireHtml(bilanCourant, declarationCourante, anneesDisponibles);
    attacherEcouteurs();
  }

  /** Branche sélecteur d'année, dossier d'audit, export CSV, audit 5 min et impression. */
  function attacherEcouteurs() {
    const selecteur = conteneur.querySelector('#selecteur-annee');
    const boutonDossier = conteneur.querySelector('#btn-dossier-audit');
    const boutonCsv = conteneur.querySelector('#btn-export-csv');
    const boutonAudit5min = conteneur.querySelector('#btn-audit-5min');
    const boutonImprimer = conteneur.querySelector('#btn-imprimer');

    selecteur.addEventListener('change', () => {
      chargerEtAfficher(Number(selecteur.value));
    });

    // IM-16 : synthèse « Audit en 5 minutes », une page imprimable.
    boutonAudit5min.addEventListener('click', async () => {
      await ouvrirAudit5Minutes(ctx, bilanCourant.annee);
    });

    // Dossier d'audit annuel : ZIP complet (sommaire, CSV, CERFA, PJ)
    boutonDossier.addEventListener('click', async () => {
      boutonDossier.disabled = true;
      toast('Assemblage du dossier…', 'info');
      try {
        const { blob, nomFichier, nbDocuments, empreinte } =
          await genererDossierAudit(ctx.store, bilanCourant.annee);
        telechargerBlob(blob, nomFichier);
        toast(`Dossier d'audit ${bilanCourant.annee} téléchargé : `
          + `${nbDocuments} documents (« ${nomFichier} »).`, 'succes');
        afficherEmpreinteScellement(bilanCourant.annee, nomFichier, empreinte);
      } catch (erreur) {
        toast(erreur && erreur.message
          ? erreur.message
          : 'Impossible d\'assembler le dossier d\'audit.', 'erreur');
      } finally {
        boutonDossier.disabled = false;
      }
    });

    boutonCsv.addEventListener('click', () => {
      const nomFichier = `bilan-fluides-${bilanCourant.annee}.csv`;
      telechargerCsv(genererCsv(bilanCourant), nomFichier);
      toast(`Export « ${nomFichier} » téléchargé.`, 'succes');
    });

    // P0-8 : export CSV de la déclaration annuelle (11 rubriques)
    const boutonDecl = conteneur.querySelector('#btn-export-decl');
    if (boutonDecl) {
      boutonDecl.addEventListener('click', () => {
        const nomFichier = `declaration-annuelle-${bilanCourant.annee}.csv`;
        telechargerCsv(genererCsvDeclaration(declarationCourante), nomFichier);
        toast(`Export « ${nomFichier} » téléchargé.`, 'succes');
      });
    }

    boutonImprimer.addEventListener('click', () => {
      window.print();
    });
  }

  // IM-10 : années dérivées des données réelles (plus de [2026] figé) ;
  // par défaut, l'année la plus récente disponible.
  anneesDisponibles = await ctx.store.getAnneesDisponibles();
  const anneeParDefaut = anneesDisponibles[0];
  await chargerEtAfficher(anneeParDefaut);
}
