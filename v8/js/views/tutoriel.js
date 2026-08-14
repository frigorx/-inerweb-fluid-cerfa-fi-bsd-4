// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// VISITE GUIDÉE DE LA DÉMONSTRATION (13/08/2026, plan
// docs/PLAN-TUTORIEL-DEMO.md — patron de surcouche : bandeau-exercice).
// ------------------------------------------------------------
// Un parcours en 7 étapes SUR l'écran réel : à chaque étape, la visite
// amène sur la bonne vue, met en évidence l'élément à cliquer (liseré +
// étiquette « Ici » — jamais la couleur seule, jamais de recouvrement)
// et dit le geste à faire dans un panneau posé au coin OPPOSÉ de la
// cible. Jamais bloquante : Précédent / Suivant / Quitter, Échap ferme,
// tout l'écran reste cliquable. Vit en DÉMONSTRATION seulement — en
// Mode Local, poserVisiteGuidee refuse d'elle-même.
// L'avancement tient dans une clé localStorage DÉDIÉE, distincte du
// monde démo (qui, lui, est timbré VERSION_SEMIS et peut être jeté).
// ============================================================

/** Clé localStorage de la visite ({ proposee, etape }) — hors monde démo. */
export const CLE_VISITE = 'inerweb-fluide-v8-visite';

const STYLE_ID = 'style-visite-guidee';
const ID_PANNEAU = 'visite-panneau';
const ID_INVITE = 'visite-invite';
const ID_ETIQUETTE = 'visite-etiquette';
const CLASSE_CIBLE = 'visite-cible';

/**
 * Les étapes du parcours (exportées : la suite de tests vérifie que
 * chaque cible existe dans le RENDU RÉEL de sa vue).
 * `vue` = identifiant de route ; `cible` = sélecteur de l'élément à
 * mettre en évidence (null : panneau seul, aucune surbrillance).
 */
export const ETAPES = [
  {
    vue: 'dashboard', cible: null,
    titre: 'Le tableau de bord',
    consigne: 'Les quatre compteurs résument le parc : machines, stock en '
      + 'bouteilles, équivalent CO₂, fiches d’intervention. En dessous, les '
      + 'alertes réglementaires disent ce qui est à faire et pourquoi. '
      + 'Cliquez sur Suivant.'
  },
  {
    vue: 'machines', cible: '#bouton-ajouter-machine',
    titre: 'Créer une machine',
    consigne: 'Cliquez sur le bouton « Ajouter » mis en évidence et '
      + 'remplissez la fiche : client, fluide, charge. Enregistrez, puis '
      + 'revenez au panneau et cliquez sur Suivant.'
  },
  {
    vue: 'bouteilles', cible: '[data-action="ajouter"]',
    titre: 'Créer une bouteille',
    consigne: 'Cliquez sur « Ajouter » : une bouteille neuve, son fluide, '
      + 'ses masses. C’est elle qui servira à charger la machine. '
      + 'Enregistrez puis cliquez sur Suivant.'
  },
  {
    vue: 'dashboard', cible: '#btn-nouveau-mouvement',
    titre: 'Faire un mouvement',
    consigne: '« Nouveau mouvement » ouvre l’assistant : machine, '
      + 'bouteille, quantité, contrôle, signatures. Faites une charge et '
      + 'allez jusqu’à la validation — rien ne s’écrit ailleurs que dans '
      + 'la démonstration.'
  },
  {
    vue: 'mouvements', cible: '[data-action="voir-cerfa"]',
    titre: 'Ouvrir le document',
    consigne: 'Chaque écriture validée a son document : « Visualiser '
      + 'CERFA ». En démonstration, il sort avec le filigrane FORMATION. '
      + 'Ouvrez-le ; vous pouvez l’imprimer.'
  },
  {
    vue: 'balance', cible: null,
    titre: 'La balance matière',
    consigne: 'Reçu, chargé, récupéré, remis en filière : la balance fait '
      + 'la somme par fluide. L’écart doit rester nul — ou être justifié. '
      + 'C’est elle que regarde un auditeur.'
  },
  {
    vue: 'bilan', cible: '#btn-dossier-audit',
    titre: 'Le dossier d’audit',
    consigne: 'Le bilan annuel rassemble tout ; le bouton mis en évidence '
      + 'télécharge le dossier d’audit complet. Fin de la visite — le '
      + 'reste se découvre en manipulant, tout est effaçable.'
  }
];

// Navigation par programme, fournie par app.js au moment de la pose.
let naviguerVersVue = null;

// Index de l'étape affichée (le gestionnaire de clic du panneau le lit).
let etapeCourante = 0;

// Jeton d'annulation de la recherche de cible en cours (une par étape).
let rechercheEnCours = 0;

/* ============================================================
   Styles (patron bandeau-exercice : injectés une fois)
   ============================================================ */

function assurerStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${CLASSE_CIBLE} {
      outline: 3px solid var(--avert-icone, #f59e0b);
      outline-offset: 3px;
      border-radius: 4px;
    }
    @media (prefers-reduced-motion: no-preference) {
      .${CLASSE_CIBLE} { animation: visite-pulsation 1.6s ease-in-out infinite; }
      @keyframes visite-pulsation {
        0%, 100% { outline-color: var(--avert-icone, #f59e0b); }
        50%      { outline-color: var(--avert, #b45309); }
      }
    }
    #${ID_ETIQUETTE} {
      position: absolute;
      z-index: 9998;
      pointer-events: none;
      background: var(--marine-900, #0e2a47);
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      box-shadow: 0 2px 8px rgba(14, 42, 71, 0.35);
      white-space: nowrap;
    }
    #${ID_PANNEAU}, #${ID_INVITE} {
      position: fixed;
      z-index: 9999;
      width: min(340px, calc(100vw - 32px));
      background: var(--carte, #ffffff);
      color: var(--texte, #1e293b);
      border: 2px solid var(--marine-900, #0e2a47);
      border-radius: 10px;
      box-shadow: 0 8px 28px rgba(14, 42, 71, 0.25);
      padding: 14px 16px;
      font-size: 14px;
      line-height: 1.45;
    }
    #${ID_PANNEAU}.coin-haut-gauche { top: 16px;    left: 16px; }
    #${ID_PANNEAU}.coin-haut-droite { top: 16px;    right: 16px; }
    #${ID_PANNEAU}.coin-bas-gauche  { bottom: 16px; left: 16px; }
    #${ID_PANNEAU}.coin-bas-droite  { bottom: 16px; right: 16px; }
    #${ID_INVITE} { bottom: 16px; right: 16px; }
    .visite-surtitre {
      font-size: 12px;
      font-weight: 700;
      color: var(--texte-3, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin: 0 0 2px;
    }
    .visite-titre { margin: 0 0 6px; font-size: 16px; font-weight: 700; }
    .visite-texte { margin: 0 0 12px; }
    .visite-boutons { display: flex; gap: 8px; flex-wrap: wrap; }
    .visite-boutons button {
      padding: 7px 12px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--marine-900, #0e2a47);
      background: transparent;
      color: var(--marine-900, #0e2a47);
    }
    .visite-boutons button.visite-principal {
      background: var(--marine-900, #0e2a47);
      color: #ffffff;
    }
    .visite-boutons button:disabled { opacity: 0.45; cursor: default; }
    #${ID_PANNEAU} .visite-quitter { margin-left: auto; }
    @media print {
      #${ID_PANNEAU}, #${ID_INVITE}, #${ID_ETIQUETTE} { display: none; }
    }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   Avancement (clé dédiée, jamais le monde démo)
   ============================================================ */

function lireAvancement() {
  try {
    const brut = localStorage.getItem(CLE_VISITE);
    return brut ? JSON.parse(brut) : {};
  } catch {
    return {};
  }
}

function ecrireAvancement(valeurs) {
  try {
    localStorage.setItem(CLE_VISITE,
      JSON.stringify({ ...lireAvancement(), ...valeurs }));
  } catch {
    // Stockage indisponible : la visite marche quand même, sans reprise.
  }
}

/* ============================================================
   Géométrie : le panneau au coin OPPOSÉ de la cible
   ============================================================ */

/**
 * Choisit le coin du panneau à l'OPPOSÉ du quadrant où vit la cible,
 * pour ne jamais la recouvrir. Fonction pure (testée par la suite).
 * @param {?{left:number,top:number,width:number,height:number}} rect
 *   rectangle de la cible (null : pas de cible)
 * @param {{width:number,height:number}} fenetre - taille de la fenêtre
 * @returns {string} 'haut-gauche' | 'haut-droite' | 'bas-gauche' | 'bas-droite'
 */
export function coinOppose(rect, fenetre) {
  if (!rect) return 'bas-droite';
  const centreX = rect.left + rect.width / 2;
  const centreY = rect.top + rect.height / 2;
  const cibleADroite = centreX > fenetre.width / 2;
  const cibleEnBas = centreY > fenetre.height / 2;
  return (cibleEnBas ? 'haut' : 'bas') + '-' + (cibleADroite ? 'gauche' : 'droite');
}

/** Rectangle de la cible, ou null hors navigateur (bancs de test). */
function rectDe(element) {
  return typeof element.getBoundingClientRect === 'function'
    ? element.getBoundingClientRect() : null;
}

/* ============================================================
   Surbrillance de la cible
   ============================================================ */

function retirerSurbrillance() {
  document.querySelectorAll('.' + CLASSE_CIBLE)
    .forEach((el) => el.classList.remove(CLASSE_CIBLE));
  const etiquette = document.getElementById(ID_ETIQUETTE);
  if (etiquette) etiquette.remove();
}

function poserSurbrillance(cible) {
  cible.classList.add(CLASSE_CIBLE);
  const etiquette = document.createElement('span');
  etiquette.id = ID_ETIQUETTE;
  etiquette.textContent = 'Ici';
  etiquette.setAttribute('aria-hidden', 'true');
  document.body.appendChild(etiquette);
  const rect = rectDe(cible);
  if (rect) {
    // Au-dessus de la cible, jamais dessus ; à ras du bord si la place manque.
    etiquette.style.top = Math.max(4,
      rect.top + (window.scrollY || 0) - (etiquette.offsetHeight || 24) - 8) + 'px';
    etiquette.style.left = Math.max(4, rect.left + (window.scrollX || 0)) + 'px';
  }
  const reduit = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof cible.scrollIntoView === 'function') {
    cible.scrollIntoView({ block: 'center', behavior: reduit ? 'auto' : 'smooth' });
  }
}

/**
 * VEILLE de surbrillance (40 × 250 ms, ~10 s) : cherche la cible le
 * temps que la vue se rende, la met en évidence, et la REPOSE si un
 * re-rendu de la vue (navigation, mutation du store) a remplacé
 * l'élément marqué — sans veille, le liseré se perdait dans la course
 * avec le rendu (vu au banc navigateur). Cible jamais trouvée : panneau
 * seul, la consigne suffit — la visite n'échoue pas.
 */
function chercherEtSurligner(selecteur, jeton) {
  if (!selecteur) return;
  let restantes = 40;
  const boucle = () => {
    if (jeton !== rechercheEnCours) return; // étape quittée entre-temps
    const cible = document.querySelector(selecteur);
    if (cible && !cible.classList.contains(CLASSE_CIBLE)) {
      retirerSurbrillance(); // marque et étiquette d'un élément détaché
      poserSurbrillance(cible);
      positionnerPanneau(cible);
    }
    restantes -= 1;
    if (restantes > 0) setTimeout(boucle, 250);
  };
  boucle();
}

/* ============================================================
   Panneau d'étape
   ============================================================ */

function positionnerPanneau(cible) {
  const panneau = document.getElementById(ID_PANNEAU);
  if (!panneau) return;
  const fenetre = {
    width: window.innerWidth || 0, height: window.innerHeight || 0
  };
  panneau.className = 'coin-' + coinOppose(cible ? rectDe(cible) : null, fenetre);
}

function surTouche(evt) {
  if (evt.key === 'Escape') quitterVisite();
}

function surClicPanneau(evt) {
  const geste = evt.target && evt.target.dataset
    ? evt.target.dataset.visite : undefined;
  if (geste === 'precedent') afficherEtape(etapeCourante - 1);
  else if (geste === 'suivant') {
    if (etapeCourante === ETAPES.length - 1) terminerVisite();
    else afficherEtape(etapeCourante + 1);
  } else if (geste === 'quitter') quitterVisite();
}

/** Quitte la visite (bouton Quitter, Échap) : reprise possible plus tard. */
export function quitterVisite() {
  rechercheEnCours += 1;
  retirerSurbrillance();
  const panneau = document.getElementById(ID_PANNEAU);
  if (panneau) panneau.remove();
  document.removeEventListener('keydown', surTouche);
}

function afficherEtape(index) {
  const etape = ETAPES[index];
  if (!etape) { terminerVisite(); return; }
  etapeCourante = index;
  rechercheEnCours += 1;
  const jeton = rechercheEnCours;
  retirerSurbrillance();
  ecrireAvancement({ proposee: true, etape: index });

  if (typeof naviguerVersVue === 'function') naviguerVersVue(etape.vue);

  let panneau = document.getElementById(ID_PANNEAU);
  if (!panneau) {
    panneau = document.createElement('section');
    panneau.id = ID_PANNEAU;
    panneau.setAttribute('role', 'dialog');
    panneau.setAttribute('aria-label', 'Visite guidée');
    panneau.tabIndex = -1;
    panneau.addEventListener('click', surClicPanneau);
    document.body.appendChild(panneau);
    document.addEventListener('keydown', surTouche);
  }
  panneau.className = 'coin-bas-droite';
  panneau.innerHTML =
    '<p class="visite-surtitre">Visite guidée — étape ' + (index + 1)
    + ' sur ' + ETAPES.length + '</p>'
    + '<h2 class="visite-titre">' + etape.titre + '</h2>'
    + '<p class="visite-texte">' + etape.consigne + '</p>'
    + '<div class="visite-boutons">'
    + '<button type="button" data-visite="precedent"'
    + (index === 0 ? ' disabled' : '') + '>Précédent</button>'
    + '<button type="button" class="visite-principal" data-visite="suivant">'
    + (index === ETAPES.length - 1 ? 'Terminer' : 'Suivant') + '</button>'
    + '<button type="button" class="visite-quitter" data-visite="quitter">'
    + 'Quitter</button>'
    + '</div>';
  if (typeof panneau.focus === 'function') {
    panneau.focus({ preventScroll: true });
  }

  chercherEtSurligner(etape.cible, jeton);
}

function terminerVisite() {
  ecrireAvancement({ proposee: true, etape: 0 });
  quitterVisite();
}

/* ============================================================
   Entrées : démarrage, invite, bouton de barre latérale
   ============================================================ */

/** Démarre (ou reprend, si elle avait été quittée en route) la visite. */
export function demarrerVisite() {
  const invite = document.getElementById(ID_INVITE);
  if (invite) invite.remove();
  ecrireAvancement({ proposee: true });
  const depart = Number(lireAvancement().etape) || 0;
  afficherEtape(depart < ETAPES.length ? depart : 0);
}

function poserInvite() {
  const invite = document.createElement('section');
  invite.id = ID_INVITE;
  invite.setAttribute('role', 'dialog');
  invite.setAttribute('aria-label', 'Proposition de visite guidée');
  invite.innerHTML =
    '<h2 class="visite-titre">Première visite ?</h2>'
    + '<p class="visite-texte">Une visite guidée montre les gestes clés '
    + 'de la démonstration en une dizaine de minutes — créer une machine, '
    + 'une bouteille, un mouvement, jusqu’au dossier d’audit.</p>'
    + '<div class="visite-boutons">'
    + '<button type="button" class="visite-principal" data-visite="commencer">'
    + 'Commencer la visite</button>'
    + '<button type="button" data-visite="plus-tard">Plus tard</button>'
    + '</div>';
  invite.addEventListener('click', (evt) => {
    const geste = evt.target && evt.target.dataset
      ? evt.target.dataset.visite : undefined;
    if (geste === 'commencer') demarrerVisite();
    else if (geste === 'plus-tard') {
      ecrireAvancement({ proposee: true });
      invite.remove();
    }
  });
  document.body.appendChild(invite);
}

function poserBoutonSidebar() {
  const pied = document.querySelector('#sidebar .sidebar-pied');
  if (!pied || document.getElementById('bouton-visite-guidee')) return;
  const bouton = document.createElement('button');
  bouton.id = 'bouton-visite-guidee';
  bouton.type = 'button';
  bouton.className = 'btn-sauvegarde no-print';
  bouton.innerHTML = '<span aria-hidden="true">🧭</span><span>Visite guidée</span>';
  bouton.addEventListener('click', demarrerVisite);
  // insertBefore : absent du shim DOM des bancs de test (repli appendChild).
  if (typeof pied.insertBefore === 'function') {
    pied.insertBefore(bouton, pied.firstChild);
  } else {
    pied.appendChild(bouton);
  }
}

/**
 * Pose la visite guidée : bouton « Visite guidée » au pied de la barre
 * latérale, et invite discrète à la première visite. DÉMONSTRATION
 * seulement — en Mode Local, ne fait rien (auto-défense, en plus de la
 * garde d'app.js).
 * @param {object} store - magasin courant (modeLabel lu, rien d'autre)
 * @param {Function} naviguer - navigation par programme d'app.js
 */
export function poserVisiteGuidee(store, naviguer) {
  if (store && store.modeLabel === 'LOCAL') return;
  naviguerVersVue = naviguer;
  assurerStyle();
  poserBoutonSidebar();
  if (!lireAvancement().proposee) poserInvite();
}
