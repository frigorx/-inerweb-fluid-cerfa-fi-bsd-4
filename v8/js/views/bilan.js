// ============================================================
// inerWeb Fluide — vue « Bilan annuel »
// Bilan annuel de traçabilité : tableau de suivi réglementaire
// par fluide (déclaration ADEME), deux cartes de totaux dégradées,
// export CSV (séparateur « ; », BOM UTF-8) et impression.
// IM-16 : synthèse « Audit en 5 minutes », page unique imprimable.
// Lecture seule (Phase A) : tout vient de ctx.store.getBilan(année).
// ============================================================

import { enteteVue, tableau, modale, toast, ICONES } from './communs.js';
import { esc, fmtKg, fmtDate, fmtNombre } from '../core/utils.js';
import { genererDossierAudit } from '../documents/dossier-audit.js';

export const titre = 'Bilan annuel';

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
function construireHtml(bilan, annees) {
  return '<div class="vue-bilan anim-fade">'
    + STYLES_VUE
    + enteteVue({
      titre: 'Bilan annuel de traçabilité',
      sousTitre: 'Tableau de suivi réglementaire par fluide — déclaration ADEME',
      actionsHtml: actionsEntete(bilan.annee, annees)
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

  // CERFA générés sur l'année (mouvements validés/annulés avec numéro)
  const prefixeAnnee = `${annee}-`;
  const nbCerfa = mouvements.filter((mv) =>
    mv.cerfaNumero && mv.date.startsWith(prefixeAnnee)).length;

  return {
    annee, etablissement, jour,
    aptitudesValides, aptitudesExpirees,
    outillageConforme, outillageExpire,
    machinesActives, controlesEnRetard,
    alertesCritiques,
    ecartsJustifies, ecartsNonJustifies, lignesInventoriees,
    nbCerfa
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
    + '<h3>CERFA</h3>'
    + '<div class="audit5min-lignes">'
    + ligneAudit5min('CERFA générés en ' + d.annee, String(d.nbCerfa))
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

  const { fermer } = modale({
    titre: 'Audit en 5 minutes — ' + annee,
    contenuHtml: gabaritAudit5Minutes(donnees),
    actionsHtml:
      '<button type="button" id="audit5min-fermer" class="btn btn-secondaire no-print">Fermer</button>'
      + '<button type="button" id="audit5min-imprimer" class="btn btn-marine no-print">'
      + ICONES.imprimer + '<span>Imprimer</span></button>'
  });

  const racine = document.querySelector('.modale-fond:last-of-type .modale')
    || document.querySelector('.modale');

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
  let anneesDisponibles = [];

  /** Charge le bilan de l'année demandée, rend la page et branche les écouteurs. */
  async function chargerEtAfficher(annee) {
    bilanCourant = await ctx.store.getBilan(annee);
    conteneur.innerHTML = construireHtml(bilanCourant, anneesDisponibles);
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
        const { blob, nomFichier, nbDocuments } =
          await genererDossierAudit(ctx.store, bilanCourant.annee);
        telechargerBlob(blob, nomFichier);
        toast(`Dossier d'audit ${bilanCourant.annee} téléchargé : `
          + `${nbDocuments} documents (« ${nomFichier} »).`, 'succes');
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
