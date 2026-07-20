// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — vue « Tableau de bord »
// Vue d'ensemble : 4 cartes KPI, derniers mouvements de fluide,
// alertes réglementaires. Lecture seule (Phase A).
// ============================================================

import { enteteVue, carteKpi, ICONES, toast } from './communs.js';
import { esc, fmtNombre, fmtKgSigne, fmtDate } from '../core/utils.js';
import { ouvrirWizard } from '../wizard/wizard.js';
import { ouvrirCerfa } from '../cerfa/visualiseur.js';
import { collecterConformite } from '../data/feu-tricolore.js';

export const titre = 'Tableau de bord';

// Correspondance type de mouvement → libellé, teinte de pastille et icône
const TYPES_MOUVEMENT = {
  MISE_EN_SERVICE:            { libelle: 'Charge / Mise en service', pastille: 'charge',       icone: 'televerser' },
  CHARGE_APPOINT:             { libelle: 'Complément de charge',     pastille: 'charge',       icone: 'televerser' },
  RECUPERATION_MAINTENANCE:   { libelle: 'Récupération',             pastille: 'recuperation', icone: 'telecharger' },
  RECUPERATION_DEMANTELEMENT: { libelle: 'Récupération',             pastille: 'recuperation', icone: 'telecharger' },
  TRANSFERT:                  { libelle: 'Transfert',                pastille: 'transfert',    icone: 'echange' },
  CONTROLE_PERIODIQUE:        { libelle: 'Contrôle périodique',      pastille: 'transfert',    icone: 'controle' },
  CONTROLE_NON_PERIODIQUE:    { libelle: 'Contrôle d’étanchéité',    pastille: 'transfert',    icone: 'controle' }
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
  /* Sentinelle : « active depuis le … » + prise de connaissance */
  .tdb-alerte-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
  }
  .tdb-alerte-depuis {
    font-size: 11px;
    color: var(--texte-3);
    font-variant-numeric: tabular-nums;
  }
  .tdb-alerte-acquit {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    color: var(--succes);
  }
  .tdb-alerte-acquit svg { width: 13px; height: 13px; flex: none; }
  .tdb-alerte-acquit-btn {
    padding: 3px 9px;
    border: 1px solid var(--bordure);
    border-radius: var(--rayon-chip);
    background: var(--carte);
    font-size: 11px;
    font-weight: 600;
    color: var(--texte-2);
    cursor: pointer;
  }
  .tdb-alerte-acquit-btn:hover {
    border-color: var(--accent-fort);
    color: var(--accent-fort);
  }
  .tdb-alerte-acquit-btn:focus-visible {
    outline: 2px solid var(--accent-fort);
    outline-offset: 1px;
  }

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

  /* CF-2 : encart d'accueil affiché uniquement quand la base est vide
     (aucune machine ni bouteille) — disparaît dès qu'il y a des données. */
  .tdb-accueil {
    margin-top: 16px;
  }
  .tdb-accueil-titre {
    font-size: 15px;
    font-weight: 600;
    color: var(--texte);
  }
  .tdb-accueil-texte {
    margin-top: 4px;
    font-size: 12.5px;
    color: var(--texte-3);
  }
  .tdb-accueil-etapes {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 14px;
  }
  @media (max-width: 899px) {
    .tdb-accueil-etapes { grid-template-columns: 1fr; }
  }
  .tdb-accueil-etape {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--bordure-2);
    border-radius: var(--rayon-bouton);
  }
  .tdb-accueil-etape.tdb-accueil-etape-lien { cursor: pointer; }
  .tdb-accueil-etape.tdb-accueil-etape-lien:hover,
  .tdb-accueil-etape.tdb-accueil-etape-lien:focus-visible {
    background: var(--fond-2);
  }
  .tdb-accueil-etape.tdb-accueil-etape-lien:focus-visible {
    outline: 2px solid var(--accent-fort);
    outline-offset: -2px;
  }
  .tdb-accueil-numero {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex: none;
    border-radius: var(--rayon-chip);
    background: var(--accent-fond);
    color: var(--accent-fort);
    font-size: 12px;
    font-weight: 700;
    font-family: var(--police-mono);
  }
  .tdb-accueil-etape-titre {
    font-size: 13px;
    font-weight: 600;
    color: var(--texte);
  }
  .tdb-accueil-etape-detail {
    margin-top: 2px;
    font-size: 11.5px;
    color: var(--texte-3);
  }

  /* Brique 3 : carte « Conformité » (mini feu tricolore), pleine largeur,
     sous la rangée des 4 KPI — mêmes teintes que la vue Conformité. */
  .tdb-conformite {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 16px;
    padding: 14px 18px;
  }
  .tdb-conformite-etat {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: none;
  }
  .tdb-conformite-point {
    width: 14px;
    height: 14px;
    flex: none;
    border-radius: 50%;
  }
  .tdb-conformite-point-VERT   { background: var(--succes); }
  .tdb-conformite-point-ORANGE { background: var(--avert-icone); }
  .tdb-conformite-point-ROUGE  { background: var(--danger); }
  .tdb-conformite-libelle {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--texte);
  }
  .tdb-conformite-compteurs {
    margin-top: 1px;
    font-size: 11.5px;
    color: var(--texte-3);
  }
  .tdb-conformite-domaines {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }
  .tdb-conformite-puce {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--texte-2);
    white-space: nowrap;
  }
  .tdb-conformite-puce-point {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
  }
  .tdb-conformite-puce-point-VERT   { background: var(--succes); }
  .tdb-conformite-puce-point-ORANGE { background: var(--avert-icone); }
  .tdb-conformite-puce-point-ROUGE  { background: var(--danger); }
  .tdb-conformite .tdb-lien { flex: none; }
</style>`;

/** Libellés du feu global, repris de la vue Conformité (même sémantique). */
const LIBELLES_CONFORMITE_GLOBAL = {
  VERT: 'Conforme',
  ORANGE: 'À surveiller',
  ROUGE: 'Non conforme'
};

/**
 * Brique 3 : nom de l'exécutant d'un mouvement — résolu depuis le rôle réel
 * executeParId si la personne existe encore au registre, sinon le champ
 * libre technicien en repli (comportement d'origine), sinon rien.
 * @param {object} mouvement — mouvement du store
 * @param {Map<string, string>} personnelParId — id → « Prénom Nom »
 * @returns {string}
 */
function nomExecutantMouvement(mouvement, personnelParId) {
  if (mouvement.executeParId && personnelParId.has(mouvement.executeParId)) {
    return personnelParId.get(mouvement.executeParId);
  }
  return mouvement.technicien || '';
}

/**
 * Ligne d'un mouvement récent : pastille d'icône par type, machine en gras,
 * « type · date [· exécutant] » en gris, quantité mono signée colorée +
 * code fluide, bouton contour « CERFA ».
 * @param {object} mouvement — mouvement du store
 * @param {Map<string, string>} personnelParId — id → « Prénom Nom » (brique 3)
 * @returns {string} HTML
 */
function ligneMouvement(mouvement, personnelParId) {
  const type = TYPES_MOUVEMENT[mouvement.type]
    || { libelle: mouvement.type, pastille: 'charge', icone: 'echange' };
  const classeQuantite = mouvement.quantiteKg < 0 ? 'quantite-negative' : 'quantite-positive';
  const nomExecutant = nomExecutantMouvement(mouvement, personnelParId);

  return '<div class="tdb-mouvement">'
    + '<span class="tdb-pastille tdb-pastille-' + esc(type.pastille) + '">'
    + (ICONES[type.icone] || '') + '</span>'
    + '<div class="tdb-mouvement-infos">'
    + '<div class="tdb-mouvement-machine">' + esc(mouvement.machineLabel) + '</div>'
    + '<div class="tdb-mouvement-detail">' + esc(type.libelle) + ' · ' + esc(fmtDate(mouvement.date))
    + (nomExecutant ? ' · ' + esc(nomExecutant) : '') + '</div>'
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
 * Brique 3 : carte « Conformité » — un condensé cliquable du feu tricolore
 * (moteur pur feu-tricolore.js), pleine largeur, sous les 4 KPI. Ne
 * RECALCULE rien : reprend tel quel le verdict de collecterConformite().
 * IM-2 (même logique que bandeauModeOfficiel ci-dessus) : ne double pas la
 * carte « Alertes réglementaires », elle en donne la synthèse par domaine.
 * @param {ReturnType<typeof import('../data/feu-tricolore.js').evaluerConformite>} conformite
 * @returns {string} HTML
 */
function carteConformite(conformite) {
  const compteurs = [];
  if (conformite.nbCritiques) {
    compteurs.push(conformite.nbCritiques
      + ' critique' + (conformite.nbCritiques > 1 ? 's' : ''));
  }
  if (conformite.nbImportantes) {
    compteurs.push(conformite.nbImportantes
      + ' importante' + (conformite.nbImportantes > 1 ? 's' : ''));
  }
  const sousTexte = compteurs.join(', ');

  const puces = conformite.domaines.map((domaine) =>
    '<span class="tdb-conformite-puce" title="' + esc(domaine.resume) + '">'
    + '<span class="tdb-conformite-puce-point tdb-conformite-puce-point-'
    + esc(domaine.etat) + '" aria-hidden="true"></span>'
    + esc(domaine.titre) + '</span>'
  ).join('');

  return '<section class="carte tdb-conformite" aria-label="Conformité">'
    + '<div class="tdb-conformite-etat">'
    + '<span class="tdb-conformite-point tdb-conformite-point-'
    + esc(conformite.global) + '" aria-hidden="true"></span>'
    + '<div>'
    + '<div class="tdb-conformite-libelle">'
    + esc(LIBELLES_CONFORMITE_GLOBAL[conformite.global]) + '</div>'
    + (sousTexte ? '<div class="tdb-conformite-compteurs">' + esc(sousTexte) + '</div>' : '')
    + '</div>'
    + '</div>'
    + '<div class="tdb-conformite-domaines">' + puces + '</div>'
    + '<button type="button" id="lien-voir-conformite" class="tdb-lien">'
    + '<span>Voir la conformité</span>' + ICONES['fleche-droite'] + '</button>'
    + '</section>';
}

/**
 * Ligne d'alerte réglementaire : point coloré selon le niveau,
 * titre en gras, détail en gris.
 * IM-2(c) : chaque ligne porte `alerte.cible` (vue + id éventuel) et devient
 * un lien accessible (role=link, tabindex, activable au clic et à l'Entrée).
 * @param {object} alerte — alerte du store
 * @returns {string} HTML
 */
function ligneAlerte(alerte, episode, peutAcquitter) {
  const classePoint = alerte.niveau === 'CRITIQUE' ? 'tdb-point-critique' : 'tdb-point-important';
  const cible = alerte.cible || {};

  // Couche sentinelle : depuis quand l'alerte est active + prise de
  // connaissance. L'épisode ouvert est apparié par idAlerte (getAlertes
  // reste la vérité du présent ; la sentinelle ne fait que dater).
  let meta = '';
  if (episode) {
    const depuis = '<span class="tdb-alerte-depuis">Active depuis le '
      + esc(fmtDate(String(episode.apparueLe).slice(0, 10))) + '</span>';
    let acquit;
    if (episode.acquitteeLe) {
      acquit = '<span class="tdb-alerte-acquit">' + ICONES.coche
        + 'Pris connaissance le ' + esc(fmtDate(String(episode.acquitteeLe).slice(0, 10)))
        + (episode.acquitteePar ? ' · ' + esc(episode.acquitteePar) : '')
        + '</span>';
    } else if (peutAcquitter) {
      acquit = '<button type="button" class="tdb-alerte-acquit-btn" '
        + 'data-id-alerte="' + esc(alerte.id) + '">J’ai pris connaissance</button>';
    } else {
      acquit = '';
    }
    meta = '<div class="tdb-alerte-meta">' + depuis + acquit + '</div>';
  }

  return '<div class="tdb-alerte tdb-alerte-lien" role="link" tabindex="0" '
    + 'data-vue="' + esc(cible.vue || '') + '" data-id="' + esc(cible.id || '') + '" '
    + 'aria-label="' + esc(alerte.titre) + ' — ' + esc(alerte.detail) + '">'
    + '<span class="tdb-point ' + classePoint + '" aria-hidden="true"></span>'
    + '<div>'
    + '<div class="tdb-alerte-titre">' + esc(alerte.titre) + '</div>'
    + '<div class="tdb-alerte-detail">' + esc(alerte.detail) + '</div>'
    + meta
    + '</div>'
    + '</div>';
}

/**
 * CF-2 : encart d'accueil affiché uniquement quand la base est vide
 * (aucune machine ET aucune bouteille) — guide vers les 3 premières
 * étapes. Disparaît de lui-même dès qu'il y a des données (le test
 * porte sur les stats déjà lues, aucune requête supplémentaire).
 * @returns {string} HTML
 */
function encartAccueil(dossierAConfigurer) {
  const etapes = [
    { titre: 'Créer une machine', detail: 'Déclarer un équipement du parc.', vue: 'machines' },
    { titre: 'Ajouter une bouteille', detail: 'Enregistrer un contenant de fluide.', vue: 'bouteilles' },
    { titre: 'Enregistrer un mouvement', detail: 'Tracer une charge ou une récupération.', vue: '' }
  ];
  // Séance 0 : tant que le dossier opérateur (cadre 1 du CERFA) est vide,
  // la toute première étape est de le compléter — sans lui, aucun CERFA
  // généré n'est valable et le mode Officiel restera hors d'atteinte.
  if (dossierAConfigurer) {
    etapes.unshift({
      titre: 'Compléter votre établissement',
      detail: 'Raison sociale, SIRET, attestation de capacité (cadre 1 du CERFA).',
      vue: 'admin'
    });
  }
  etapes.forEach((etape, indice) => { etape.numero = String(indice + 1); });
  const etapesHtml = etapes.map((etape) => {
    const estLien = Boolean(etape.vue);
    return '<div class="tdb-accueil-etape' + (estLien ? ' tdb-accueil-etape-lien' : '') + '"'
      + (estLien ? ' role="link" tabindex="0" data-vue="' + esc(etape.vue) + '"' : '')
      + '>'
      + '<span class="tdb-accueil-numero" aria-hidden="true">' + esc(etape.numero) + '</span>'
      + '<div>'
      + '<div class="tdb-accueil-etape-titre">' + esc(etape.titre) + '</div>'
      + '<div class="tdb-accueil-etape-detail">' + esc(etape.detail) + '</div>'
      + '</div>'
      + '</div>';
  }).join('');

  return '<section class="carte tdb-accueil" aria-label="Prise en main">'
    + '<h3 class="tdb-accueil-titre">Prise en main</h3>'
    + '<p class="tdb-accueil-texte">Aucune donnée pour l’instant. '
    + (dossierAConfigurer ? 'Quatre' : 'Trois') + ' étapes pour démarrer la traçabilité.</p>'
    + '<div class="tdb-accueil-etapes">' + etapesHtml + '</div>'
    + '</section>';
}

/**
 * Rend la vue « Tableau de bord ».
 * @param {HTMLElement} conteneur — élément déjà vidé par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const { store, naviguer } = ctx;

  // Sentinelle : réconcilie la table d'épisodes avec les alertes du moment.
  // BEST-EFFORT — c'est une mutation (rôle OPERATEUR / session requise) ;
  // un lecteur non habilité (ex. loopback anonyme) ne doit pas casser
  // l'affichage : l'échec est silencieux, getAlertes reste la vérité.
  await store.rafraichirSentinelle().catch(() => {});

  // Lecture des données en parallèle (le store renvoie des copies)
  // Brique 3 : collecterConformite (feu tricolore) et le registre du
  // personnel (résolution des rôles réels) rejoignent le même Promise.all.
  const [stats, mouvements, alertes, etatOfficiel, sentinelle, utilisateur,
    conformite, personnel] = await Promise.all([
      store.getStats(),
      store.getMouvements(),
      store.getAlertes(),
      store.peutPasserEnOfficiel(),
      store.getSentinelle(),
      store.getUtilisateurCourant().catch(() => null),
      collecterConformite(store),
      store.getPersonnel()
    ]);

  const personnelParId = new Map(
    personnel.map((p) => [p.id, (p.prenom + ' ' + p.nom).trim()]));

  // Seul un valideur (référent / enseignant / admin) prend acte d'une
  // non-conformité réglementaire — jamais un élève (cohérent ROLES_MUTATION).
  const peutAcquitter =
    ['REFERENT', 'ENSEIGNANT', 'ADMIN'].includes(utilisateur?.roleApp);
  const nomOperateur = utilisateur
    ? `${utilisateur.prenom ?? ''} ${utilisateur.nom ?? ''}`.trim()
    : '';

  // Épisode OUVERT par id d'alerte : datte l'apparition et porte l'acquittement.
  const episodeParAlerte = new Map();
  for (const e of sentinelle) {
    if (e.resolueLe === null) episodeParAlerte.set(e.idAlerte, e);
  }

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
    ? derniersMouvements.map((mv) => ligneMouvement(mv, personnelParId)).join('')
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
    ? alertes.map((a) => ligneAlerte(a, episodeParAlerte.get(a.id), peutAcquitter)).join('')
    : '<div class="etat-vide">' + ICONES.coche + '<p>Aucune alerte en cours.</p></div>';

  const carteAlertes = '<section class="carte" aria-label="Alertes réglementaires">'
    + '<div class="tdb-carte-entete">'
    + '<h3 class="tdb-carte-titre">Alertes réglementaires'
    + (alertes.length ? '<span class="badge-rouge">' + alertes.length + '</span>' : '')
    + '</h3>'
    + '</div>'
    + listeAlertes
    + '</section>';

  // CF-2 : base vide (aucune machine ni bouteille) → encart de prise en main.
  // Lecture du dossier opérateur SEULEMENT dans ce cas (une lecture de plus
  // uniquement quand l'encart va s'afficher) : dossier vide → étape 1 dédiée.
  const baseVide = stats.nbMachines === 0 && stats.nbBouteilles === 0;
  let dossierAConfigurer = false;
  if (baseVide) {
    const etablissement = await store.getEtablissement().catch(() => null);
    dossierAConfigurer = !String(etablissement?.raisonSociale ?? '').trim();
  }

  // ---- Insertion unique dans le conteneur ----
  conteneur.innerHTML = STYLES_VUE
    + entete
    + rangeeKpi
    + carteConformite(conformite)
    + (baseVide ? encartAccueil(dossierAConfigurer) : '')
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

  // Brique 3 : lien « Voir la conformité » — même motif que « Voir tout »
  conteneur.querySelector('#lien-voir-conformite')
    .addEventListener('click', function () {
      naviguer('conformite');
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
    ligne.addEventListener('click', function (evenement) {
      // Le bouton d'acquittement, imbriqué, ne doit pas déclencher la navigation.
      if (evenement.target.closest('.tdb-alerte-acquit-btn')) return;
      naviguer(vueCible);
    });
    ligne.addEventListener('keydown', function (evenement) {
      if (evenement.target.closest('.tdb-alerte-acquit-btn')) return;
      if (evenement.key === 'Enter' || evenement.key === ' ') {
        evenement.preventDefault();
        naviguer(vueCible);
      }
    });
  });

  // Sentinelle : « J'ai pris connaissance » — acquitte l'alerte (trace au
  // journal chaîné) puis ré-affiche. stopPropagation : ne pas naviguer.
  conteneur.querySelectorAll('.tdb-alerte-acquit-btn').forEach(function (bouton) {
    bouton.addEventListener('click', async function (evenement) {
      evenement.stopPropagation();
      bouton.disabled = true;
      try {
        await store.acquitterAlerte(bouton.dataset.idAlerte, nomOperateur || null);
        toast('Prise de connaissance enregistrée.', 'succes');
        await render(conteneur, ctx);
      } catch (erreur) {
        bouton.disabled = false;
        toast(erreur.message || 'Acquittement impossible.', 'erreur');
      }
    });
  });

  // CF-2 : étapes de l'encart d'accueil cliquables → naviguent vers leur vue
  // (même comportement clavier que les lignes d'alerte).
  conteneur.querySelectorAll('.tdb-accueil-etape-lien').forEach(function (etape) {
    const vueCible = etape.dataset.vue;
    if (!vueCible) return;
    etape.addEventListener('click', function () {
      naviguer(vueCible);
    });
    etape.addEventListener('keydown', function (evenement) {
      if (evenement.key === 'Enter' || evenement.key === ' ') {
        evenement.preventDefault();
        naviguer(vueCible);
      }
    });
  });
}
