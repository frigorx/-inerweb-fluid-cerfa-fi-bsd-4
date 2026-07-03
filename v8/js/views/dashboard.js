// ============================================================
// inerWeb Fluide — vue « Tableau de bord »
// Vue d'ensemble : 4 cartes KPI, derniers mouvements de fluide,
// alertes réglementaires. Lecture seule (Phase A).
// ============================================================

import { enteteVue, carteKpi, ICONES } from './communs.js';
import { esc, fmtNombre, fmtKgSigne, fmtDate } from '../core/utils.js';
import { ouvrirWizard } from '../wizard/wizard.js';
import { ouvrirCerfa } from '../cerfa/visualiseur.js';

export const titre = 'Tableau de bord';

// Correspondance type de mouvement → libellé, teinte de pastille et icône
const TYPES_MOUVEMENT = {
  MISE_EN_SERVICE:            { libelle: 'Charge / Mise en service', pastille: 'charge',       icone: 'televerser' },
  CHARGE_APPOINT:             { libelle: 'Complément de charge',     pastille: 'charge',       icone: 'televerser' },
  RECUPERATION_MAINTENANCE:   { libelle: 'Récupération',             pastille: 'recuperation', icone: 'telecharger' },
  RECUPERATION_DEMANTELEMENT: { libelle: 'Récupération',             pastille: 'recuperation', icone: 'telecharger' },
  TRANSFERT:                  { libelle: 'Transfert',                pastille: 'transfert',    icone: 'echange' }
};

// Nombre de mouvements affichés dans la carte « Derniers mouvements »
const NB_DERNIERS_MOUVEMENTS = 5;

// Styles propres à la vue (colonnes 2/3 – 1/3, listes de mouvements et d'alertes),
// absents des feuilles communes ; préfixe « tdb- » pour éviter toute collision.
const STYLES_VUE = `
<style>
  .tdb-colonnes {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
    margin-top: 16px;
  }
  @media (max-width: 899px) {
    .tdb-colonnes { grid-template-columns: 1fr; }
  }
  .tdb-carte-entete {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }
  .tdb-carte-titre {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--texte);
  }
  .tdb-lien {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: none;
    background: none;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--accent-fort);
    cursor: pointer;
  }
  .tdb-lien:hover { text-decoration: underline; }
  .tdb-lien svg { width: 15px; height: 15px; }

  .tdb-mouvement {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 0;
    border-bottom: 1px solid var(--bordure-2);
  }
  .tdb-mouvement:last-child { border-bottom: none; padding-bottom: 2px; }
  .tdb-pastille {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    flex: none;
    border-radius: var(--rayon-bouton);
  }
  .tdb-pastille svg { width: 17px; height: 17px; }
  .tdb-pastille-charge       { background: var(--info-fond);   color: var(--info); }
  .tdb-pastille-recuperation { background: var(--violet-fond); color: var(--violet); }
  .tdb-pastille-transfert    { background: var(--accent-fond); color: var(--accent-fort); }
  .tdb-mouvement-infos { flex: 1; min-width: 0; }
  .tdb-mouvement-machine {
    font-size: 13px;
    font-weight: 600;
    color: var(--texte);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tdb-mouvement-detail { margin-top: 2px; font-size: 11.5px; color: var(--texte-3); }
  .tdb-mouvement-quantites { flex: none; text-align: right; }
  .tdb-quantite {
    font-family: var(--police-mono);
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .tdb-fluide {
    margin-top: 2px;
    font-family: var(--police-mono);
    font-size: 11px;
    color: var(--texte-3);
  }

  .tdb-alerte {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--bordure-2);
  }
  .tdb-alerte:last-child { border-bottom: none; padding-bottom: 2px; }
  /* IM-2(c) : ligne d'alerte cliquable → navigue vers ctx.cible.vue */
  .tdb-alerte-lien {
    cursor: pointer;
    border-radius: var(--rayon-bouton);
    margin: 0 -8px;
    padding: 10px 8px;
  }
  .tdb-alerte-lien:last-child { padding-bottom: 8px; }
  .tdb-alerte-lien:hover,
  .tdb-alerte-lien:focus-visible {
    background: var(--fond-2);
  }
  .tdb-alerte-lien:focus-visible {
    outline: 2px solid var(--accent-fort);
    outline-offset: -2px;
  }
  .tdb-point {
    width: 9px;
    height: 9px;
    flex: none;
    border-radius: var(--rayon-chip);
    margin-top: 4px;
  }
  .tdb-point-critique  { background: var(--danger); }
  .tdb-point-important { background: var(--avert-icone); }
  .tdb-alerte-titre  { font-size: 12.5px; font-weight: 600; color: var(--texte); }
  .tdb-alerte-detail { margin-top: 2px; font-size: 11.5px; color: var(--texte-3); }

  /* Bandeau « Mode Officiel » (CR-6) : discret mais permanent, sous les KPI */
  .tdb-officiel {
    margin-top: 16px;
  }
  .tdb-officiel-motifs {
    margin: 6px 0 0;
    padding-left: 18px;
  }
  .tdb-officiel-motifs li { margin-top: 2px; }
  .tdb-officiel-note {
    margin-top: 6px;
    font-style: italic;
    opacity: .9;
  }
  .tdb-officiel-ok {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding: 8px 14px;
    border-radius: var(--rayon-bouton);
    background: var(--succes-fond);
    color: var(--succes);
    font-size: 12.5px;
    font-weight: 600;
  }
  .tdb-officiel-ok svg { width: 15px; height: 15px; flex: none; }
</style>`;

/**
 * Ligne d'un mouvement récent : pastille d'icône par type, machine en gras,
 * « type · date » en gris, quantité mono signée colorée + code fluide,
 * bouton contour « CERFA ».
 * @param {object} mouvement — mouvement du store
 * @returns {string} HTML
 */
function ligneMouvement(mouvement) {
  const type = TYPES_MOUVEMENT[mouvement.type]
    || { libelle: mouvement.type, pastille: 'charge', icone: 'echange' };
  const classeQuantite = mouvement.quantiteKg < 0 ? 'quantite-negative' : 'quantite-positive';

  return '<div class="tdb-mouvement">'
    + '<span class="tdb-pastille tdb-pastille-' + esc(type.pastille) + '">'
    + (ICONES[type.icone] || '') + '</span>'
    + '<div class="tdb-mouvement-infos">'
    + '<div class="tdb-mouvement-machine">' + esc(mouvement.machineLabel) + '</div>'
    + '<div class="tdb-mouvement-detail">' + esc(type.libelle) + ' · ' + esc(fmtDate(mouvement.date)) + '</div>'
    + '</div>'
    + '<div class="tdb-mouvement-quantites">'
    + '<div class="tdb-quantite ' + classeQuantite + '">' + esc(fmtKgSigne(mouvement.quantiteKg)) + '</div>'
    + '<div class="tdb-fluide">' + esc(mouvement.fluide) + '</div>'
    + '</div>'
    // CF-1 / IM-12 : le CERFA n'existe (et ne se visualise sans erreur) que pour
    // une écriture figée (VALIDE/ANNULE) hors TRANSFERT (pas de CERFA machine — registre).
    + (peutAfficherCerfa(mouvement)
      ? '<button type="button" class="btn btn-contour btn-petit tdb-btn-cerfa" '
        + 'data-id="' + esc(mouvement.id) + '">CERFA</button>'
      : '')
    + '</div>';
}

/**
 * CF-1 + IM-12 : un bouton « CERFA » n'a de sens que sur une écriture figée
 * (VALIDE ou ANNULE) et jamais pour un TRANSFERT (pas de CERFA machine —
 * SPEC-V8.md §7.1 : c'est une écriture de registre interne).
 * @param {object} mouvement — mouvement du store
 * @returns {boolean}
 */
function peutAfficherCerfa(mouvement) {
  return (mouvement.statut === 'VALIDE' || mouvement.statut === 'ANNULE')
    && mouvement.type !== 'TRANSFERT';
}

/**
 * Bandeau « Mode Officiel » (CR-6) : rend visible et testable, dès la Démo,
 * le contrat de blocage §7.2 — sinon `peutPasserEnOfficiel()` n'est qu'une
 * donnée calculée dans le vide, jamais montrée à l'écran.
 * IM-2 : pas de doublon visuel avec la carte « Alertes réglementaires »
 * malgré un recoupement de fond assumé (ex. écart de balance matière non
 * justifié peut apparaître dans les deux) — les deux blocs répondent à une
 * question différente : « que faut-il traiter maintenant » (alertes,
 * cliquables vers leur vue) vs « qu'est-ce qui bloque le mode Officiel »
 * (bandeau, prérequis figés). Emplacement (sous les KPI, avant les colonnes)
 * et gabarit (bandeau pleine largeur vs carte à points) déjà différenciés.
 * @param {{ok: boolean, motifs: string[]}} etatOfficiel
 * @returns {string} HTML
 */
function bandeauModeOfficiel(etatOfficiel) {
  if (etatOfficiel.ok) {
    return '<div class="tdb-officiel-ok">' + ICONES.coche
      + '<span>Prérequis du mode Officiel : tous réunis.</span></div>';
  }
  const motifs = etatOfficiel.motifs.map((motif) => '<li>' + esc(motif) + '</li>').join('');
  return '<div class="bandeau-avertissement tdb-officiel">'
    + ICONES.alerte
    + '<div>'
    + '<strong>Mode Officiel indisponible</strong>'
    + '<ul class="tdb-officiel-motifs">' + motifs + '</ul>'
    + '<p class="tdb-officiel-note">En mode démonstration, tout reste en FORMATION ; '
    + 'ces verrous s’appliqueront au mode réel.</p>'
    + '</div>'
    + '</div>';
}

/**
 * Ligne d'alerte réglementaire : point coloré selon le niveau,
 * titre en gras, détail en gris.
 * IM-2(c) : chaque ligne porte `alerte.cible` (vue + id éventuel) et devient
 * un lien accessible (role=link, tabindex, activable au clic et à l'Entrée).
 * @param {object} alerte — alerte du store
 * @returns {string} HTML
 */
function ligneAlerte(alerte) {
  const classePoint = alerte.niveau === 'CRITIQUE' ? 'tdb-point-critique' : 'tdb-point-important';
  const cible = alerte.cible || {};
  return '<div class="tdb-alerte tdb-alerte-lien" role="link" tabindex="0" '
    + 'data-vue="' + esc(cible.vue || '') + '" data-id="' + esc(cible.id || '') + '" '
    + 'aria-label="' + esc(alerte.titre) + ' — ' + esc(alerte.detail) + '">'
    + '<span class="tdb-point ' + classePoint + '" aria-hidden="true"></span>'
    + '<div>'
    + '<div class="tdb-alerte-titre">' + esc(alerte.titre) + '</div>'
    + '<div class="tdb-alerte-detail">' + esc(alerte.detail) + '</div>'
    + '</div>'
    + '</div>';
}

/**
 * Rend la vue « Tableau de bord ».
 * @param {HTMLElement} conteneur — élément déjà vidé par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const { store, naviguer } = ctx;

  // Lecture des données en parallèle (le store renvoie des copies)
  const [stats, mouvements, alertes, etatOfficiel] = await Promise.all([
    store.getStats(),
    store.getMouvements(),
    store.getAlertes(),
    store.peutPasserEnOfficiel()
  ]);

  const derniersMouvements = mouvements.slice(0, NB_DERNIERS_MOUVEMENTS);

  // ---- En-tête de vue ----
  const entete = enteteVue({
    titre: 'Tableau de bord',
    sousTitre: 'Vue d’ensemble de la traçabilité des fluides frigorigènes',
    actionsHtml: '<button type="button" id="btn-nouveau-mouvement" class="btn btn-primaire">'
      + ICONES.plus + '<span>Nouveau mouvement</span></button>'
  });

  // ---- Rangée des 4 cartes KPI ----
  const rangeeKpi = '<div class="grille-4">'
    + carteKpi({
      libelle: 'Parc machines',
      valeur: String(stats.nbMachines),
      sousTexte: fmtNombre(stats.chargeParcKg, 1) + ' kg de fluide en charge',
      icone: 'machine',
      teinte: 'accent'
    })
    + carteKpi({
      libelle: 'Stock bouteilles',
      valeur: fmtNombre(stats.stockBouteillesKg, 1) + ' kg',
      sousTexte: stats.nbBouteilles + ' contenants actifs',
      icone: 'bouteille',
      teinte: 'rose'
    })
    + carteKpi({
      libelle: 'Équiv. CO₂',
      valeur: fmtNombre(stats.teqCo2Parc, 1) + ' t',
      sousTexte: 'tonnes CO₂ équivalent en parc',
      icone: 'flocon',
      teinte: 'vert'
    })
    + carteKpi({
      libelle: 'CERFA générés',
      valeur: String(stats.nbCerfa),
      sousTexte: stats.nbFiches + ' fiches d’intervention',
      icone: 'bilan',
      teinte: 'violet'
    })
    + '</div>';

  // ---- Carte « Derniers mouvements » (colonne 2/3) ----
  const listeMouvements = derniersMouvements.length
    ? derniersMouvements.map(ligneMouvement).join('')
    : '<div class="etat-vide">' + ICONES.echange + '<p>Aucun mouvement enregistré.</p></div>';

  const carteMouvements = '<section class="carte" aria-label="Derniers mouvements">'
    + '<div class="tdb-carte-entete">'
    + '<h3 class="tdb-carte-titre">Derniers mouvements</h3>'
    + '<button type="button" id="lien-voir-mouvements" class="tdb-lien">'
    + '<span>Voir tout</span>' + ICONES['fleche-droite'] + '</button>'
    + '</div>'
    + listeMouvements
    + '</section>';

  // ---- Carte « Alertes réglementaires » (colonne 1/3) ----
  const listeAlertes = alertes.length
    ? alertes.map(ligneAlerte).join('')
    : '<div class="etat-vide">' + ICONES.coche + '<p>Aucune alerte en cours.</p></div>';

  const carteAlertes = '<section class="carte" aria-label="Alertes réglementaires">'
    + '<div class="tdb-carte-entete">'
    + '<h3 class="tdb-carte-titre">Alertes réglementaires'
    + (alertes.length ? '<span class="badge-rouge">' + alertes.length + '</span>' : '')
    + '</h3>'
    + '</div>'
    + listeAlertes
    + '</section>';

  // ---- Insertion unique dans le conteneur ----
  conteneur.innerHTML = STYLES_VUE
    + entete
    + rangeeKpi
    + bandeauModeOfficiel(etatOfficiel)
    + '<div class="tdb-colonnes">' + carteMouvements + carteAlertes + '</div>';

  // ---- Écouteurs ----

  // Bouton « + Nouveau mouvement » : assistant en 6 étapes (Phase B)
  conteneur.querySelector('#btn-nouveau-mouvement')
    .addEventListener('click', function () {
      ouvrirWizard(ctx);
    });

  // Lien « Voir tout » : bascule vers la vue Mouvements
  conteneur.querySelector('#lien-voir-mouvements')
    .addEventListener('click', function () {
      naviguer('mouvements');
    });

  // Boutons « CERFA » : visualiseur plein écran du PDF officiel rempli
  conteneur.querySelectorAll('.tdb-btn-cerfa').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      ouvrirCerfa(ctx, { source: 'mouvement', id: bouton.dataset.id });
    });
  });

  // IM-2(c) : lignes d'alerte cliquables → naviguent vers leur cible
  // (clic souris ou clavier, la cible étant un rôle « link »).
  conteneur.querySelectorAll('.tdb-alerte-lien').forEach(function (ligne) {
    const vueCible = ligne.dataset.vue;
    if (!vueCible) return;
    ligne.addEventListener('click', function () {
      naviguer(vueCible);
    });
    ligne.addEventListener('keydown', function (evenement) {
      if (evenement.key === 'Enter' || evenement.key === ' ') {
        evenement.preventDefault();
        naviguer(vueCible);
      }
    });
  });
}
