// ============================================================
// inerWeb Fluide — communs.js
// Helpers d'interface partagés par toutes les vues :
// en-têtes, cartes KPI, chips, barres, tableaux, toasts, modales.
// ============================================================

import { ICONES } from '../core/icones.js';
import { esc } from '../core/utils.js';

// Ré-export des icônes pour les vues
export { ICONES };

/* ============================================================
   En-tête de vue
   ============================================================ */

/**
 * En-tête standard d'une vue : titre Space Grotesk, sous-titre gris,
 * zone d'actions alignée à droite.
 * @param {{ titre: string, sousTitre?: string, actionsHtml?: string }} options
 * @returns {string} HTML
 */
export function enteteVue({ titre, sousTitre = '', actionsHtml = '' }) {
  return '<div class="entete-vue">'
    + '<div>'
    + '<h2 class="entete-vue-titre">' + esc(titre) + '</h2>'
    + (sousTitre ? '<p class="entete-vue-sous-titre">' + esc(sousTitre) + '</p>' : '')
    + '</div>'
    + (actionsHtml ? '<div class="entete-vue-actions">' + actionsHtml + '</div>' : '')
    + '</div>';
}

/* ============================================================
   Carte KPI
   ============================================================ */

/**
 * Carte KPI : libellé en capitales espacées, pastille d'icône colorée,
 * valeur énorme Space Grotesk, sous-texte gris.
 * @param {{ libelle: string, valeur: string, sousTexte?: string,
 *           icone?: string, teinte?: 'accent'|'rose'|'vert'|'violet' }} options
 * @returns {string} HTML
 */
export function carteKpi({ libelle, valeur, sousTexte = '', icone = '', teinte = 'accent' }) {
  // « icone » accepte une clé d'ICONES ou un SVG déjà construit
  const dessin = ICONES[icone] || (String(icone).startsWith('<svg') ? icone : '');
  return '<div class="carte carte-kpi">'
    + '<div class="kpi-haut">'
    + '<span class="kpi-libelle">' + esc(libelle) + '</span>'
    + (dessin ? '<span class="kpi-pastille kpi-pastille-' + esc(teinte) + '">' + dessin + '</span>' : '')
    + '</div>'
    + '<div class="kpi-valeur">' + esc(valeur) + '</div>'
    + (sousTexte ? '<div class="kpi-sous-texte">' + esc(sousTexte) + '</div>' : '')
    + '</div>';
}

/* ============================================================
   Chips d'état
   ============================================================ */

// Correspondance code métier → libellé + classe de teinte
const CHIPS_STATUT = {
  // Statuts machine
  EN_SERVICE:  { libelle: 'Conforme',        classe: 'chip-vert' },
  FUITE:       { libelle: 'Fuite',           classe: 'chip-rouge' },
  CONTROLE_DU: { libelle: 'Contrôle dû',     classe: 'chip-ambre' },
  ARRETEE:     { libelle: 'Arrêtée',         classe: 'chip-gris' },
  DEMANTELEE:  { libelle: 'Démantelée',      classe: 'chip-gris' },

  // Statuts d'outillage réglementaire (Phase C)
  A_VERIFIER:  { libelle: 'À vérifier',      classe: 'chip-ambre' },
  EXPIRE:      { libelle: 'Expiré',          classe: 'chip-rouge' },
  HORS_SERVICE:{ libelle: 'Hors service',    classe: 'chip-gris' },

  // Résultats de contrôle et statuts de mouvement (CR-1 : chaque
  // statut du cycle de vie a sa chip distincte)
  CONFORME:    { libelle: 'Conforme',        classe: 'chip-vert' },
  VALIDE:      { libelle: 'Signé',           classe: 'chip-vert' },
  SOUMIS:      { libelle: 'À valider',       classe: 'chip-ambre' },
  BROUILLON:   { libelle: 'Brouillon',       classe: 'chip-gris' },
  ANNULE:      { libelle: 'Annulé',          classe: 'chip-rouge' },

  // Types et états de bouteille
  NEUVE:        { libelle: 'Neuve',          classe: 'chip-teal' },
  RECUPERATION: { libelle: 'Récupération',   classe: 'chip-violet' },
  TRANSFERT:    { libelle: 'Transfert',      classe: 'chip-bleu' },
  DECHET:       { libelle: 'Déchet',         classe: 'chip-gris' },
  VIERGE:       { libelle: 'Vierge',         classe: 'chip-vert' },
  RECUPERE:     { libelle: 'Récupéré',       classe: 'chip-violet' },
  RECYCLE:      { libelle: 'Recyclé',        classe: 'chip-bleu' },
  REGENERE:     { libelle: 'Régénéré',       classe: 'chip-teal' },
  EN_STOCK:     { libelle: 'En stock',       classe: 'chip-vert' },
  VIDE:         { libelle: 'Vide',           classe: 'chip-gris' },
  A_RETOURNER:  { libelle: 'À retourner',    classe: 'chip-ambre' },

  // Impacts environnementaux (GWP)
  FAIBLE:     { libelle: 'Faible',           classe: 'chip-vert' },
  MODERE:     { libelle: 'Modéré',           classe: 'chip-ambre' },
  ELEVE:      { libelle: 'Élevé',            classe: 'chip-orange' },
  TRES_ELEVE: { libelle: 'Très élevé',       classe: 'chip-rouge' },

  // Modes et types de contrôle
  FORMATION:      { libelle: 'Formation',      classe: 'chip-ambre' },
  OFFICIEL:       { libelle: 'Officiel',       classe: 'chip-bleu' },
  PERIODIQUE:     { libelle: 'Périodique',     classe: 'chip-bleu' },
  NON_PERIODIQUE: { libelle: 'Non périodique', classe: 'chip-gris' },

  // Rôles applicatifs
  ADMIN:      { libelle: 'Admin',       classe: 'chip-marine' },
  REFERENT:   { libelle: 'Référent',    classe: 'chip-teal' },
  ENSEIGNANT: { libelle: 'Enseignant',  classe: 'chip-bleu' }
};

/**
 * Chip d'état colorée à partir d'un code métier.
 * Code inconnu → chip grise avec le code mis en forme.
 * @param {string} code — ex. 'EN_SERVICE', 'FUITE', 'FAIBLE'…
 * @returns {string} HTML
 */
export function chipStatut(code) {
  const connu = CHIPS_STATUT[code];
  if (connu) {
    return '<span class="chip ' + connu.classe + '">' + esc(connu.libelle) + '</span>';
  }
  const texte = code
    ? String(code).charAt(0).toUpperCase() + String(code).slice(1).toLowerCase().replace(/_/g, ' ')
    : '—';
  return '<span class="chip chip-gris">' + esc(texte) + '</span>';
}

// Correspondance type de mouvement → libellé + teinte
const CHIPS_TYPE_MOUVEMENT = {
  MISE_EN_SERVICE:           { libelle: 'Charge / Mise en service', classe: 'chip-bleu' },
  CHARGE_APPOINT:            { libelle: 'Complément de charge',     classe: 'chip-bleu' },
  RECUPERATION_MAINTENANCE:  { libelle: 'Récupération',             classe: 'chip-violet' },
  RECUPERATION_DEMANTELEMENT:{ libelle: 'Récupération',             classe: 'chip-violet' },
  TRANSFERT:                 { libelle: 'Transfert',                classe: 'chip-teal' }
};

/**
 * Chip colorée pour un type de mouvement de fluide.
 * @param {string} typeMouvement — ex. 'CHARGE_APPOINT'
 * @returns {string} HTML
 */
export function chipType(typeMouvement) {
  const connu = CHIPS_TYPE_MOUVEMENT[typeMouvement];
  if (connu) {
    return '<span class="chip ' + connu.classe + '">' + esc(connu.libelle) + '</span>';
  }
  return chipStatut(typeMouvement);
}

/* ============================================================
   Barre de progression
   ============================================================ */

/**
 * Barre de progression fine arrondie.
 * @param {number} pct — pourcentage (borné entre 0 et 100)
 * @param {'accent'|'vert'|'rouge'|'ambre'} [teinte='accent']
 * @returns {string} HTML
 */
export function barreProgression(pct, teinte = 'accent') {
  const largeur = Math.max(0, Math.min(100, Number(pct) || 0));
  return '<div class="barre" role="progressbar" aria-valuenow="' + largeur.toFixed(0)
    + '" aria-valuemin="0" aria-valuemax="100">'
    + '<div class="barre-remplissage barre-' + esc(teinte) + '" style="width:' + largeur + '%"></div>'
    + '</div>';
}

/* ============================================================
   Tableau
   ============================================================ */

/**
 * Tableau stylé charte : en-têtes capitales espacées, filets fins,
 * survol léger. Les lignes sont fournies déjà rendues (HTML brut).
 * @param {{ colonnes: {cle: string, libelle: string, align?: 'droite'|'centre'}[],
 *           lignesHtml: string[] }} options
 * @returns {string} HTML
 */
export function tableau({ colonnes, lignesHtml }) {
  const entetes = colonnes.map(function (col) {
    const classe = col.align ? ' class="align-' + esc(col.align) + '"' : '';
    return '<th scope="col"' + classe + ' data-cle="' + esc(col.cle) + '">' + esc(col.libelle) + '</th>';
  }).join('');

  const corps = (lignesHtml && lignesHtml.length)
    ? lignesHtml.join('')
    : '<tr><td colspan="' + colonnes.length + '">'
      + '<div class="etat-vide">' + ICONES.bilan + '<p>Aucune donnée à afficher.</p></div>'
      + '</td></tr>';

  return '<div class="tableau-defilement">'
    + '<table class="tableau">'
    + '<thead><tr>' + entetes + '</tr></thead>'
    + '<tbody>' + corps + '</tbody>'
    + '</table>'
    + '</div>';
}

/* ============================================================
   Toast (notification éphémère)
   ============================================================ */

const DUREE_TOAST_MS = 3800;

/**
 * Affiche une notification éphémère en bas à droite.
 * @param {string} message
 * @param {'info'|'succes'|'erreur'} [type='info']
 */
export function toast(message, type = 'info') {
  const zone = document.getElementById('zone-toasts');
  if (!zone) return;

  const icones = { succes: ICONES.coche, erreur: ICONES.croix, info: ICONES.alerte };
  const element = document.createElement('div');
  element.className = 'toast toast-' + type;
  element.setAttribute('role', 'status');
  element.innerHTML = '<span class="toast-icone">' + (icones[type] || icones.info) + '</span>'
    + '<span class="toast-message">' + esc(message) + '</span>';

  zone.appendChild(element);
  // Déclenche la transition d'entrée au rendu suivant
  requestAnimationFrame(function () { element.classList.add('visible'); });

  setTimeout(function () {
    element.classList.remove('visible');
    element.addEventListener('transitionend', function () { element.remove(); }, { once: true });
    // Filet de sécurité si la transition n'aboutit pas
    setTimeout(function () { element.remove(); }, 600);
  }, DUREE_TOAST_MS);
}

/* ============================================================
   Piège de focus (IM-20)
   ============================================================ */

// Sélecteur des éléments focusables au clavier (aligné WAI-ARIA Authoring Practices)
const SELECTEUR_FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Piège le focus clavier à l'intérieur d'un conteneur (modale, wizard…) :
 * Tab/Shift+Tab bouclent sur le premier/dernier élément focusable, le focus
 * initial est posé sur le premier champ ou bouton, et le focus est restitué
 * à l'élément qui avait le focus avant l'ouverture lorsqu'on appelle
 * la fonction de restitution retournée.
 * @param {HTMLElement} conteneur — élément racine du dialogue (déjà dans le DOM)
 * @returns {{ liberer: () => void, restituerFocus: () => void }}
 */
export function piegerFocus(conteneur) {
  const declencheur = document.activeElement;

  function elementsFocusables() {
    return Array.from(conteneur.querySelectorAll(SELECTEUR_FOCUSABLE))
      .filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
  }

  function focusInitial() {
    const elements = elementsFocusables();
    (elements[0] || conteneur).focus();
  }

  function surTouche(evenement) {
    if (evenement.key !== 'Tab') return;
    const elements = elementsFocusables();
    if (elements.length === 0) {
      evenement.preventDefault();
      return;
    }
    const premier = elements[0];
    const dernier = elements[elements.length - 1];
    if (evenement.shiftKey && document.activeElement === premier) {
      evenement.preventDefault();
      dernier.focus();
    } else if (!evenement.shiftKey && document.activeElement === dernier) {
      evenement.preventDefault();
      premier.focus();
    }
  }

  conteneur.addEventListener('keydown', surTouche);
  // Focus initial au rendu suivant (laisse le temps au contenu de s'insérer)
  requestAnimationFrame(focusInitial);

  function restituerFocus() {
    if (declencheur && typeof declencheur.focus === 'function') declencheur.focus();
  }

  function liberer() {
    conteneur.removeEventListener('keydown', surTouche);
  }

  return { liberer, restituerFocus };
}

/* ============================================================
   Modale
   ============================================================ */

/**
 * Ouvre une modale (carte centrée, feuille en bas sur mobile).
 * Fermeture : bouton croix, clic sur le fond, touche Échap.
 * Focus : piégé dans la modale (Tab/Shift+Tab bouclent), posé sur le
 * premier champ/bouton à l'ouverture, restitué à l'ouvreur à la fermeture.
 * @param {{ titre: string, contenuHtml?: string, actionsHtml?: string }} options
 * @returns {{ fermer: () => void, racine: HTMLElement }} racine = l'élément
 *   .modale CRÉÉ par cet appel. Les appelants doivent cibler leurs champs
 *   via cette racine, JAMAIS via document.querySelector('.modale') : quand
 *   deux modales s'empilent (ex. création de bouteille par-dessus le
 *   wizard, qui est lui-même une .modale), le sélecteur global attrape la
 *   mauvaise boîte et le câblage plante (bouton « submit » natif →
 *   rechargement de page — bug réel constaté le 04/07/2026).
 */
export function modale({ titre, contenuHtml = '', actionsHtml = '', surFermeture = null }) {
  const zone = document.getElementById('zone-modales') || document.body;

  const idTitre = 'modale-titre-' + Math.random().toString(36).slice(2, 9);

  const fond = document.createElement('div');
  fond.className = 'modale-fond';
  fond.innerHTML = '<div class="modale" role="dialog" aria-modal="true" aria-labelledby="' + idTitre + '">'
    + '<div class="modale-entete">'
    + '<h3 class="modale-titre" id="' + idTitre + '">' + esc(titre) + '</h3>'
    + '<button class="modale-fermer" type="button" aria-label="Fermer">' + ICONES.croix + '</button>'
    + '</div>'
    + '<div class="modale-corps">' + contenuHtml + '</div>'
    + (actionsHtml ? '<div class="modale-actions">' + actionsHtml + '</div>' : '')
    + '</div>';

  const boiteDialogue = fond.querySelector('.modale');
  const piege = piegerFocus(boiteDialogue);

  let fermee = false;

  function fermer() {
    if (fermee) return;
    fermee = true;
    // Notifie l'appelant AVANT tout retrait : ainsi la croix, le clic sur le
    // fond et la touche Échap — qui appellent tous ce fermer() local —
    // déclenchent la même résolution que le bouton Annuler (CF-18).
    if (typeof surFermeture === 'function') surFermeture();
    document.removeEventListener('keydown', surTouche);
    piege.liberer();
    fond.classList.remove('visible');
    piege.restituerFocus();
    setTimeout(function () { fond.remove(); }, 220);
  }

  function surTouche(evenement) {
    if (evenement.key === 'Escape') fermer();
  }

  fond.addEventListener('click', function (evenement) {
    if (evenement.target === fond) fermer();
  });
  fond.querySelector('.modale-fermer').addEventListener('click', fermer);
  document.addEventListener('keydown', surTouche);

  zone.appendChild(fond);
  requestAnimationFrame(function () { fond.classList.add('visible'); });

  return { fermer, racine: boiteDialogue };
}

/* ============================================================
   Confirmation (remplace window.confirm)
   ============================================================ */

/**
 * Modale de confirmation chartée, à la place du window.confirm() natif.
 * @param {{ titre?: string, message: string, libelleConfirmer?: string,
 *           danger?: boolean }} options
 * @returns {Promise<boolean>} true si l'utilisateur confirme, false sinon
 *   (bouton Annuler, croix, clic sur le fond ou touche Échap).
 */
export function confirmer({ titre = 'Confirmation', message, libelleConfirmer = 'Confirmer', danger = false }) {
  return new Promise(function (resoudre) {
    let repondu = false;

    function repondre(valeur) {
      if (repondu) return;
      repondu = true;
      resoudre(valeur);
    }

    // TOUTE fermeture (croix, clic sur le fond, touche Échap ou bouton
    // Annuler) passe par le fermer() interne de modale(), donc par ce
    // rappel : la promesse se résout alors à false. Le bouton Confirmer,
    // lui, résout à true AVANT d'appeler fermer(), et le garde `repondu`
    // empêche que la résolution false qui suit ne l'écrase (CF-18).
    const instance = modale({
      titre: titre,
      contenuHtml: '<p style="font-size:13px;color:var(--texte-2)">' + esc(message) + '</p>',
      actionsHtml:
        '<button type="button" class="btn btn-secondaire" data-role="annuler">Annuler</button>'
        + '<button type="button" class="btn ' + (danger ? 'btn-danger-contour' : 'btn-primaire')
        + '" data-role="confirmer">' + esc(libelleConfirmer) + '</button>',
      surFermeture: function () { repondre(false); }
    });

    instance.racine.querySelector('[data-role="annuler"]').addEventListener('click', instance.fermer);
    instance.racine.querySelector('[data-role="confirmer"]').addEventListener('click', function () {
      repondre(true);
      instance.fermer();
    });
  });
}
