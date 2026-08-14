// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — composants/visite-guidee.js
// VISITE GUIDÉE de la DÉMONSTRATION (13/08/2026, plan
// docs/PLAN-VISITE-GUIDEE.md) : un parcours pas à pas DANS
// l'application, pour découvrir les gestes clés sans lecture préalable.
//
// Décisions du propriétaire (13/08) : pastilles-guides + liste de
// mission COMBINÉES · les TROIS parcours proposés au choix du visiteur
// au lancement · proposée à la première visite + bouton permanent de la
// barre latérale.
//
// Invariants :
// - DÉMO seulement (`visiteDisponible`) — jamais un obstacle en Local ;
// - l'élément visé n'est JAMAIS recouvert ni rendu incliquable : le
//   repère est en pointer-events:none (aucun voile), le panneau se place
//   dans un coin qui ne recoupe pas la cible (`choisirCoin`) ;
// - jamais bloquant : « Suivant » toujours disponible, Échap quitte
//   (sauf quand une modale est ouverte : c'est elle que la touche
//   ferme), une étape se valide au GESTE RÉEL quand il est détectable
//   (navigation, compteur du magasin), à la main sinon ;
// - la couleur ne porte jamais seule une information (liseré + étiquette
//   texte ; étape faite = coche dessinée + libellé d'état) ;
// - prefers-reduced-motion : halo statique (géré dans la feuille de
//   style, aucune animation ne porte de contenu).
//
// v2 — LA VOIX DE LA DÉMONSTRATION (14/08, demande Franck) : chaque
// étape se DIT à l'arrivée (textes de l'écran, module voix-visite.js,
// MP3 Piper quand le lot existe, voix du navigateur sinon), speech de
// présentation dans la modale de choix (auto sur GESTE seulement),
// bouton couper/remettre la voix (préférence mémorisée), et la
// souris-enseignant : une flèche glisse jusqu'à l'élément visé et
// montre le clic (onde + petit son) — comme un enseignant devant
// l'élève. Sous prefers-reduced-motion, la flèche n'apparaît pas
// (décorative : consigne, liseré et étiquette disent déjà tout).
// ============================================================

import { ICONES } from '../core/icones.js';
import { esc } from '../core/utils.js';
import { modale, toast } from '../views/communs.js';
import {
  creerNarrateur, textesNarrationEtape, TEXTE_PRESENTATION, TEXTE_FIN
} from './voix-visite.js';

/** Clé de mémoire locale : la proposition n'est faite qu'à la première visite. */
export const CLE_MEMOIRE_VISITE = 'inerweb-fluide-v8-visite-guidee';

/**
 * La visite n'existe qu'en DÉMONSTRATION. En mode Local (et donc aussi
 * en mode exercice, qui est un mode Local), elle n'a ni bouton, ni
 * proposition, ni code actif — jamais un obstacle dans l'atelier.
 * @param {object|null} store
 * @returns {boolean}
 */
export function visiteDisponible(store) {
  return Boolean(store && store.modeLabel !== 'LOCAL');
}

/* ============================================================
   Les étapes (données pures)
   Chaque étape = UN geste réel : où le faire (`consigne`), ce que
   l'écran doit montrer (`attendu`), l'élément à surligner (`cibles`,
   le premier sélecteur trouvé à l'écran gagne — le lien de la barre
   latérale sert de repli visible depuis partout), et la détection du
   geste (`fait`) : navigation, compteur du magasin, ou main (null).
   ============================================================ */

const ETAPE_TABLEAU = {
  id: 'tableau', vue: 'dashboard',
  titre: 'Lire le tableau de bord',
  consigne: 'Ouvrez « Tableau de bord » dans la barre latérale.',
  attendu: 'Les chiffres du parc (machines, stock, équivalent CO2), le bandeau '
    + 'de conformité et les alertes réglementaires du monde fictif.',
  cibles: ['#sidebar .nav-item[data-vue="dashboard"]'],
  fait: { type: 'navigation' }
};

const ETAPE_MACHINE = {
  id: 'machine', vue: 'machines',
  titre: 'Créer une machine',
  consigne: 'Ouvrez « Parc machines » puis cliquez « Ajouter ». Donnez une '
    + 'désignation, un fluide et la charge nominale, puis enregistrez.',
  attendu: 'Votre machine apparaît dans le parc avec sa carte, son code et '
    + 'son statut.',
  cibles: ['#bouton-ajouter-machine', '#sidebar .nav-item[data-vue="machines"]'],
  fait: { type: 'compteur', methode: 'getMachines' }
};

const ETAPE_BOUTEILLE = {
  id: 'bouteille', vue: 'bouteilles',
  titre: 'Créer une bouteille',
  consigne: 'Ouvrez « Stock bouteilles » puis cliquez « Ajouter ». Choisissez '
    + 'le type (neuve ou récupération), le fluide, la tare et la masse brute.',
  attendu: 'Votre bouteille apparaît dans le stock, avec sa masse de fluide '
    + 'calculée.',
  cibles: ['.entete-vue-actions [data-action="ajouter"]',
    '#sidebar .nav-item[data-vue="bouteilles"]'],
  fait: { type: 'compteur', methode: 'getBouteilles' }
};

const ETAPE_MOUVEMENT = {
  id: 'mouvement', vue: 'mouvements',
  titre: 'Enregistrer un mouvement de fluide',
  consigne: 'Ouvrez « Mouvements » puis « Nouveau mouvement » : l\'assistant '
    + 'en 6 étapes vous guide jusqu\'à la signature. Machine et bouteille '
    + 'peuvent aussi se créer à la volée depuis l\'assistant.',
  attendu: 'Votre fiche d\'intervention en tête de liste — signée si vous '
    + 'êtes allé au bout, sinon en brouillon, à reprendre plus tard.',
  cibles: ['[data-action="nouveau-mouvement"]',
    '#sidebar .nav-item[data-vue="mouvements"]'],
  fait: { type: 'compteur', methode: 'getMouvements' }
};

const ETAPE_CERFA = {
  id: 'cerfa', vue: 'mouvements',
  titre: 'Ouvrir le CERFA d\'une fiche signée',
  consigne: 'Sur une fiche signée de la liste, cliquez « Visualiser CERFA » : '
    + 'le document officiel 15497*04 est rempli automatiquement à partir de '
    + 'la fiche.',
  attendu: 'Le CERFA rempli, prêt à imprimer — c\'est le document d\'exercice '
    + 'du mode Formation.',
  cibles: ['[data-action="voir-cerfa"]',
    '#sidebar .nav-item[data-vue="mouvements"]'],
  fait: null
};

const ETAPE_BALANCE = {
  id: 'balance', vue: 'balance',
  titre: 'Lire la balance matière',
  consigne: 'Ouvrez « Balance matière » dans la barre latérale.',
  attendu: 'Entrées, sorties et écarts par fluide — la balance qui doit '
    + 'savoir s\'expliquer le jour de l\'inspection.',
  cibles: ['#sidebar .nav-item[data-vue="balance"]'],
  fait: { type: 'navigation' }
};

const ETAPE_AUDIT = {
  id: 'audit', vue: 'audit-guide',
  titre: 'Ouvrir le dossier qui attend l\'inspecteur',
  consigne: 'Ouvrez « Audit guidé » dans la barre latérale.',
  attendu: 'Le parcours d\'audit en 9 étapes ordonnées, et l\'état de chacune '
    + 'sur le registre courant.',
  cibles: ['#sidebar .nav-item[data-vue="audit-guide"]'],
  fait: { type: 'navigation' }
};

const ETAPE_CONTROLE = {
  id: 'controle', vue: 'controles',
  titre: 'Lire les contrôles d\'étanchéité',
  consigne: 'Ouvrez « Contrôles d\'étanchéité ». Pour en enregistrer un, '
    + 'c\'est la carte « Contrôle d\'étanchéité » de l\'assistant Nouveau '
    + 'mouvement.',
  attendu: 'La liste des contrôles, leur résultat et la prochaine échéance '
    + 'calculée par machine.',
  cibles: ['#sidebar .nav-item[data-vue="controles"]'],
  fait: { type: 'navigation' }
};

const ETAPE_FUITE = {
  id: 'fuite', vue: 'machines',
  titre: 'Ouvrir un dossier de fuite',
  consigne: 'Depuis « Parc machines », ouvrez la fiche de la machine signalée '
    + 'en fuite, puis son bloc « Fuites » : le dossier raconte détection, '
    + 'réparation et contrôle de suivi.',
  attendu: 'Le dossier de fuite de la machine, épisode par épisode.',
  cibles: ['#sidebar .nav-item[data-vue="machines"]'],
  fait: null
};

/** Les trois parcours proposés au visiteur (décision du 13/08 : les trois, au choix). */
export const PARCOURS_VISITE = [
  {
    id: 'essentiel',
    titre: 'L\'essentiel',
    duree: '5 min environ',
    description: 'Le chemin le plus court : le tableau de bord, une fiche '
      + 'd\'intervention à l\'assistant, son CERFA, le dossier d\'audit.',
    etapes: [ETAPE_TABLEAU, ETAPE_MOUVEMENT, ETAPE_CERFA, ETAPE_AUDIT]
  },
  {
    id: 'complete',
    titre: 'La visite complète',
    duree: 'un quart d\'heure',
    description: 'Les gestes du quotidien : machine, bouteille, mouvement '
      + 'signé, CERFA, balance matière et dossier d\'audit.',
    etapes: [ETAPE_TABLEAU, ETAPE_MACHINE, ETAPE_BOUTEILLE, ETAPE_MOUVEMENT,
      ETAPE_CERFA, ETAPE_BALANCE, ETAPE_AUDIT]
  },
  {
    id: 'frigoriste',
    titre: 'La visite du frigoriste',
    duree: '20 min environ',
    description: 'La visite complète, plus le contrôle d\'étanchéité et le '
      + 'dossier de fuite.',
    etapes: [ETAPE_TABLEAU, ETAPE_MACHINE, ETAPE_BOUTEILLE, ETAPE_MOUVEMENT,
      ETAPE_CERFA, ETAPE_BALANCE, ETAPE_AUDIT, ETAPE_CONTROLE, ETAPE_FUITE]
  }
];

/* ============================================================
   Géométrie pure (éprouvée par la suite de tests)
   ============================================================ */

/** Vrai si deux rectangles {gauche, haut, droite, bas} se recoupent. */
export function seRecoupent(a, b) {
  if (!a || !b) return false;
  return a.gauche < b.droite && b.gauche < a.droite
    && a.haut < b.bas && b.haut < a.bas;
}

/** Rectangle occupé par le panneau s'il est posé dans un coin donné. */
function rectDuCoin(coin, fenetre, panneau, marge) {
  const gauche = coin.endsWith('gauche') ? marge : fenetre.largeur - marge - panneau.largeur;
  const haut = coin.startsWith('haut') ? marge : fenetre.hauteur - marge - panneau.hauteur;
  return { gauche, haut, droite: gauche + panneau.largeur, bas: haut + panneau.hauteur };
}

/**
 * Choisit le coin du panneau qui ne recoupe PAS l'élément visé — le
 * panneau ne recouvre jamais ce qu'il demande de cliquer. Sans cible,
 * ou si aucun coin n'est libre (cible géante), coin par défaut.
 * @param {{gauche,haut,droite,bas}|null} rectCible
 * @param {{largeur,hauteur}} fenetre
 * @param {{largeur,hauteur}} panneau
 * @returns {'bas-droite'|'bas-gauche'|'haut-droite'|'haut-gauche'}
 */
export function choisirCoin(rectCible, fenetre, panneau) {
  const coins = ['bas-droite', 'bas-gauche', 'haut-droite', 'haut-gauche'];
  if (!rectCible) return coins[0];
  const marge = 16;
  for (const coin of coins) {
    if (!seRecoupent(rectDuCoin(coin, fenetre, panneau, marge), rectCible)) {
      return coin;
    }
  }
  return coins[0];
}

/* ============================================================
   La fabrique
   ============================================================ */

// Chevron du bouton replier/déplier (propre au panneau, hors bibliothèque)
const ICONE_CHEVRON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" '
  + 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
  + 'aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6"></path></svg>';

// Haut-parleur (voix active) et haut-parleur barré (voix coupée) — propres
// au panneau, comme le chevron. L'état est AUSSI porté par aria-pressed et
// aria-label : jamais l'icône seule.
const ICONE_VOIX = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" '
  + 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
  + 'aria-hidden="true" focusable="false"><path d="M11 5 6 9H2v6h4l5 4V5Z"/>'
  + '<path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const ICONE_VOIX_COUPEE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" '
  + 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
  + 'aria-hidden="true" focusable="false"><path d="M11 5 6 9H2v6h4l5 4V5Z"/>'
  + '<path d="m16 9 6 6"/><path d="m22 9-6 6"/></svg>';

// La flèche de la souris-enseignant : pointe dessinée à l'origine (0,0) du
// dessin, pour que la translation posée par positionnerSouris amène la
// pointe exactement sur le centre de l'élément visé.
const ICONE_SOURIS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" '
  + 'aria-hidden="true" focusable="false"><path d="M1 1l7.5 20 2.7-8L19 10.3Z" fill="#ffffff" '
  + 'stroke="#1f3a5f" stroke-width="1.6" stroke-linejoin="round"/></svg>';

/**
 * Crée le contrôleur de la visite guidée.
 * @param {{ store: object, naviguer: (hash: string) => void, narrateur?: object }} contexte
 *   `narrateur` est injectable (suites de tests) ; par défaut, celui de
 *   `voix-visite.js` — la voix de la démonstration (v2, 14/08).
 */
export function creerVisiteGuidee({ store, naviguer, narrateur }) {
  const voix = narrateur || creerNarrateur();
  let parcours = null;       // parcours en cours (objet de PARCOURS_VISITE)
  let index = 0;             // étape courante
  const faites = new Set();  // ids des étapes accomplies
  let compteurBase = null;   // décompte du magasin au début d'une étape à compteur
  let actif = false;
  let terminaisonPropre = false;
  let panneau = null;
  let repere = null;
  let souris = null;             // la flèche-enseignant (jamais un obstacle)
  let etapeSourisMontree = null; // id d'étape dont le clic a déjà été montré
  let replie = false;
  let ecoutesPosees = false;

  /** Identifiant de la vue courante, lu dans le hash (« #/vue » ou « #/vue/param »). */
  function vueCourante() {
    const hash = (typeof window !== 'undefined' && window.location && window.location.hash) || '';
    return hash.replace(/^#\/?/, '').split('/')[0] || 'dashboard';
  }

  function etapeCourante() {
    return parcours ? parcours.etapes[index] : null;
  }

  /* ---------- détection des gestes réels ---------- */

  async function poserBaseCompteur() {
    const etape = etapeCourante();
    compteurBase = null;
    if (!etape || !etape.fait || etape.fait.type !== 'compteur') return;
    try {
      const liste = await store[etape.fait.methode]();
      compteurBase = Array.isArray(liste) ? liste.length : null;
    } catch (erreur) {
      console.error('Visite guidée : lecture du compteur impossible :', erreur);
    }
  }

  async function reevaluerCompteur() {
    const etape = etapeCourante();
    if (!actif || !etape || !etape.fait || etape.fait.type !== 'compteur') return;
    if (compteurBase === null || faites.has(etape.id)) return;
    try {
      const liste = await store[etape.fait.methode]();
      if (Array.isArray(liste) && liste.length > compteurBase) {
        marquerFaite(etape);
        toast('Étape réussie : ' + etape.titre + '.', 'succes');
      }
    } catch (erreur) {
      console.error('Visite guidée : relecture du compteur impossible :', erreur);
    }
  }

  function surNavigation() {
    const etape = etapeCourante();
    if (!actif || !etape) return;
    if (etape.fait && etape.fait.type === 'navigation' && !faites.has(etape.id)
      && vueCourante() === etape.vue) {
      marquerFaite(etape);
    }
    // La vue vient de changer : laisser le rendu se poser avant de repérer.
    programmerPositionnement();
  }

  function poserEcoutes() {
    if (ecoutesPosees) return;
    ecoutesPosees = true;
    // Le rappel reste inscrit pour la durée de vie de la page (le magasin
    // n'offre pas de désinscription) : le garde `actif` le rend inerte
    // dès que la visite s'arrête.
    store.surChangement(function () { reevaluerCompteur(); });
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('hashchange', surNavigation);
      window.addEventListener('resize', programmerPositionnement);
      window.addEventListener('scroll', programmerPositionnement, true);
    }
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('keydown', surTouche);
    }
  }

  function surTouche(evenement) {
    if (!actif || evenement.key !== 'Escape') return;
    // Une modale ouverte gère Échap elle-même (c'est elle que la touche
    // ferme) : la visite ne se quitte que sur un écran nu.
    if (document.querySelector('.modale-fond')) return;
    arreter();
  }

  /* ---------- rendu ---------- */

  function marquerFaite(etape) {
    faites.add(etape.id);
    rafraichirPanneau();
  }

  function libelleEtatMission(etape, i) {
    if (faites.has(etape.id)) return 'faite';
    return i === index ? 'en cours' : 'à faire';
  }

  function rafraichirPanneau() {
    if (!panneau) return;
    const n = parcours.etapes.length;
    const etape = etapeCourante();
    const missions = parcours.etapes.map(function (e, i) {
      const etat = libelleEtatMission(e, i);
      const classes = ['visite-mission'];
      if (faites.has(e.id)) classes.push('visite-mission--faite');
      if (i === index) classes.push('visite-mission--courante');
      return '<li>'
        + '<button type="button" class="' + classes.join(' ') + '" data-index="' + i + '">'
        + '<span class="visite-mission-etat" aria-hidden="true">'
        + (faites.has(e.id) ? ICONES.coche : '<span class="visite-mission-rond"></span>')
        + '</span>'
        + '<span class="visite-mission-titre">' + esc(e.titre) + '</span>'
        + '<span class="visite-mission-libelle">' + esc(etat) + '</span>'
        + '</button></li>';
    }).join('');

    panneau.innerHTML =
      '<div class="visite-entete">'
      + '<span class="visite-entete-icone" aria-hidden="true">' + ICONES.parcours + '</span>'
      + '<span class="visite-entete-titre">Visite guidée</span>'
      + '<span class="visite-entete-parcours">' + esc(parcours.titre) + '</span>'
      + (voix.disponible()
        ? '<button type="button" class="visite-replier visite-voix" data-action="voix" '
          + 'aria-pressed="' + (voix.estCoupee() ? 'true' : 'false') + '" '
          + 'title="' + (voix.estCoupee() ? 'Remettre la voix' : 'Couper la voix') + '" '
          + 'aria-label="' + (voix.estCoupee() ? 'Remettre la voix' : 'Couper la voix') + '">'
          + (voix.estCoupee() ? ICONE_VOIX_COUPEE : ICONE_VOIX) + '</button>'
        : '')
      + '<button type="button" class="visite-replier" data-action="replier" '
      + 'aria-expanded="' + (replie ? 'false' : 'true') + '" '
      + 'aria-label="' + (replie ? 'Déplier la visite guidée' : 'Replier la visite guidée') + '">'
      + ICONE_CHEVRON + '</button>'
      + '<button type="button" class="visite-fermer" data-action="quitter-croix" '
      + 'aria-label="Quitter la visite guidée">' + ICONES.croix + '</button>'
      + '</div>'
      + '<div class="visite-corps"' + (replie ? ' hidden' : '') + '>'
      + '<ol class="visite-missions" aria-label="Étapes de la visite">' + missions + '</ol>'
      + '<div class="visite-etape" aria-live="polite">'
      + '<div class="visite-etape-numero">Étape ' + (index + 1) + ' sur ' + n
      + (faites.has(etape.id) ? ' — faite' : '') + '</div>'
      + '<h4 class="visite-etape-titre">' + esc(etape.titre) + '</h4>'
      + '<p class="visite-consigne">' + esc(etape.consigne) + '</p>'
      + '<p class="visite-attendu"><strong>Ce que vous devez voir :</strong> '
      + esc(etape.attendu) + '</p>'
      + '</div>'
      + '<div class="visite-pied">'
      + '<button type="button" class="btn btn-secondaire btn-petit" data-action="precedent"'
      + (index === 0 ? ' disabled' : '') + '>Précédent</button>'
      + '<button type="button" class="btn btn-primaire btn-petit'
      + (faites.has(etape.id) ? ' visite-suivant--pret' : '') + '" data-action="suivant">'
      + (index === n - 1 ? 'Terminer' : 'Suivant') + '</button>'
      + '<button type="button" class="btn btn-contour btn-petit" data-action="quitter">Quitter</button>'
      + '</div>'
      + '</div>';

    cablerPanneau();
    programmerPositionnement();
  }

  function cablerPanneau() {
    panneau.querySelectorAll('.visite-mission').forEach(function (bouton) {
      bouton.addEventListener('click', function () {
        entrerEtape(Number(bouton.dataset.index) || 0);
      });
    });
    const precedent = panneau.querySelector('[data-action="precedent"]');
    if (precedent) {
      precedent.addEventListener('click', function () {
        if (index > 0) entrerEtape(index - 1);
      });
    }
    panneau.querySelector('[data-action="suivant"]').addEventListener('click', function () {
      if (index >= parcours.etapes.length - 1) {
        terminaisonPropre = true;
        arreter();
      } else {
        entrerEtape(index + 1);
      }
    });
    panneau.querySelector('[data-action="quitter"]').addEventListener('click', arreter);
    panneau.querySelector('[data-action="quitter-croix"]').addEventListener('click', arreter);
    panneau.querySelector('[data-action="replier"]').addEventListener('click', function () {
      replie = !replie;
      rafraichirPanneau();
    });
    const boutonVoix = panneau.querySelector('[data-action="voix"]');
    if (boutonVoix) {
      boutonVoix.addEventListener('click', function () {
        voix.basculer();
        rafraichirPanneau();
      });
    }
  }

  /* ---------- repère de surbrillance (jamais un obstacle) ---------- */

  function trouverCible() {
    const etape = etapeCourante();
    if (!etape) return null;
    for (const selecteur of etape.cibles) {
      const element = document.querySelector(selecteur);
      if (element) return element;
    }
    return null;
  }

  let positionnementDemande = false;
  function programmerPositionnement() {
    if (positionnementDemande) return;
    positionnementDemande = true;
    // Deux temps : le premier rendu (rAF), puis un rappel une fois que la
    // vue asynchrone s'est réellement posée. Le rappel fait AUSSI retomber
    // le drapeau : dans un onglet masqué ou bridé, le rAF peut ne jamais
    // jouer — le drapeau restait levé et TOUS les repositionnements
    // suivants étaient avalés jusqu'au retour de l'onglet (banc 13/08).
    requestAnimationFrame(function () {
      positionnementDemande = false;
      positionner();
    });
    if (typeof setTimeout === 'function') {
      setTimeout(function () {
        positionnementDemande = false;
        positionner();
      }, 400);
    }
  }

  function positionner() {
    if (!actif || !panneau || !repere) return;
    const cible = trouverCible();
    let rect = null;
    if (cible && typeof cible.getBoundingClientRect === 'function') {
      const r = cible.getBoundingClientRect();
      if (r && r.width > 0 && r.height > 0) {
        rect = { gauche: r.left, haut: r.top, droite: r.right, bas: r.bottom };
      }
    }
    if (rect) {
      const jeu = 6; // le liseré s'écarte du bord, sans jamais rien couvrir
      repere.style.left = (rect.gauche - jeu) + 'px';
      repere.style.top = (rect.haut - jeu) + 'px';
      repere.style.width = (rect.droite - rect.gauche + 2 * jeu) + 'px';
      repere.style.height = (rect.bas - rect.haut + 2 * jeu) + 'px';
      repere.hidden = false;
    } else {
      // Cible hors écran (autre vue) : la consigne du panneau suffit.
      repere.hidden = true;
    }
    const fenetre = {
      largeur: (typeof window !== 'undefined' && window.innerWidth) || 1280,
      hauteur: (typeof window !== 'undefined' && window.innerHeight) || 800
    };
    const taille = {
      largeur: panneau.offsetWidth || 340,
      hauteur: panneau.offsetHeight || 420
    };
    panneau.setAttribute('data-coin', choisirCoin(rect, fenetre, taille));
    positionnerSouris(rect, fenetre);
  }

  /* ---------- la souris-enseignant (v2, 14/08 — rêve de Franck) ----------
     Une flèche visible glisse jusqu'à l'élément visé puis « clique »
     (onde + petit son), comme un enseignant qui montre le geste devant
     l'élève. Décorative par nature : la consigne, le liseré et
     l'étiquette portent déjà toute l'information — sous
     prefers-reduced-motion elle n'apparaît donc pas du tout, et elle est
     en pointer-events:none (jamais un obstacle, jamais un vrai clic :
     le geste réel reste au visiteur). */

  function mouvementReduit() {
    try {
      return Boolean(typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (erreur) {
      return false;
    }
  }

  function positionnerSouris(rect, fenetre) {
    if (mouvementReduit()) {
      if (souris) { souris.remove(); souris = null; }
      return;
    }
    if (!rect) {
      if (souris) souris.hidden = true;
      return;
    }
    if (!souris) {
      souris = document.createElement('div');
      souris.id = 'visite-souris';
      souris.className = 'visite-souris no-print';
      souris.setAttribute('aria-hidden', 'true');
      souris.innerHTML = ICONE_SOURIS + '<span class="visite-souris-onde"></span>';
      // Départ du bord bas-droit : la glisse vers la cible se voit.
      souris.style.transform = 'translate(' + Math.round(fenetre.largeur - 60)
        + 'px, ' + Math.round(fenetre.hauteur - 120) + 'px)';
      document.body.appendChild(souris);
      if (souris.offsetWidth !== undefined) { /* pose le point de départ avant la transition */ }
    }
    souris.hidden = false;
    const x = Math.round((rect.gauche + rect.droite) / 2);
    const y = Math.round((rect.haut + rect.bas) / 2);
    souris.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    const etape = etapeCourante();
    if (etape && etapeSourisMontree !== etape.id) {
      etapeSourisMontree = etape.id;
      // La transition CSS dure 0,8 s : le clic se montre à l'arrivée.
      if (typeof setTimeout === 'function') {
        setTimeout(function () { montrerClic(etape.id); }, 850);
      }
    }
  }

  function montrerClic(idEtape) {
    const etape = etapeCourante();
    if (!actif || !souris || !etape || etape.id !== idEtape) return;
    const onde = souris.querySelector('.visite-souris-onde');
    if (onde && onde.classList) {
      onde.classList.remove('visite-souris-onde--active');
      if (onde.offsetWidth !== undefined) { /* la relance repart de zéro */ }
      onde.classList.add('visite-souris-onde--active');
    }
    voix.jouerClic();
  }

  /* ---------- cycle de vie ---------- */

  function entrerEtape(i) {
    index = Math.max(0, Math.min(parcours.etapes.length - 1, i));
    poserBaseCompteur();
    const etape = etapeCourante();
    // Une étape de navigation déjà à l'écran est un geste déjà fait.
    if (etape.fait && etape.fait.type === 'navigation' && vueCourante() === etape.vue) {
      faites.add(etape.id);
    }
    // v2 (14/08) : le clic-enseignant se remontre à chaque nouvelle étape…
    etapeSourisMontree = null;
    rafraichirPanneau();
    // …et l'étape se DIT à l'arrivée (chaque arrivée est un geste : choix
    // du parcours, Suivant, Précédent, clic de mission). Les textes dits
    // sont EXACTEMENT ceux que le panneau affiche.
    voix.direTextes(textesNarrationEtape(etape));
  }

  function demarrer(idParcours) {
    const choisi = PARCOURS_VISITE.find(function (p) { return p.id === idParcours; });
    if (!choisi) return;
    parcours = choisi;
    faites.clear();
    replie = false;
    terminaisonPropre = false;
    actif = true;
    poserEcoutes();
    if (!panneau) {
      panneau = document.createElement('aside');
      panneau.id = 'visite-guidee';
      panneau.className = 'visite-panneau no-print';
      panneau.setAttribute('role', 'complementary');
      panneau.setAttribute('aria-label', 'Visite guidée');
      document.body.appendChild(panneau);
    }
    if (!repere) {
      repere = document.createElement('div');
      repere.id = 'visite-repere';
      repere.className = 'visite-repere no-print';
      repere.setAttribute('aria-hidden', 'true');
      repere.hidden = true;
      repere.innerHTML = '<span class="visite-repere-etiquette">C\'est ici</span>';
      document.body.appendChild(repere);
    }
    entrerEtape(0);
  }

  function arreter() {
    if (!actif) return;
    actif = false;
    voix.arreter();
    if (panneau) { panneau.remove(); panneau = null; }
    if (repere) { repere.remove(); repere = null; }
    if (souris) { souris.remove(); souris = null; }
    etapeSourisMontree = null;
    if (terminaisonPropre) {
      // Le mot de fin : AFFICHÉ (toast) et DIT (voix), à l'identique —
      // jamais un mot à l'oreille qui ne soit pas sous les yeux.
      toast(TEXTE_FIN, 'succes');
      voix.direTextes([TEXTE_FIN]);
    } else {
      toast('Visite quittée. Relancez-la quand vous voulez : bouton '
        + '« Visite guidée », en bas de la barre latérale.', 'info');
    }
    terminaisonPropre = false;
  }

  /* ---------- proposition ---------- */

  function proposer(options) {
    // v2 (14/08) : `gesteHumain` est vrai quand la modale s'ouvre sur un
    // clic (bouton de la barre latérale) — le speech de présentation part
    // alors tout seul. À l'ouverture AUTOMATIQUE de la première visite,
    // aucun son (règle maison ET règle des navigateurs) : le bouton
    // « Écouter la présentation » est le geste.
    const gesteHumain = Boolean(options && options.gesteHumain);
    const cartes = PARCOURS_VISITE.map(function (p) {
      return '<button type="button" class="option-sauvegarde visite-choix" '
        + 'data-parcours="' + esc(p.id) + '">'
        + '<span class="option-titre">' + esc(p.titre)
        + ' <span class="visite-choix-duree">' + esc(p.duree) + ' · '
        + p.etapes.length + ' étapes</span></span>'
        + '<span class="option-detail">' + esc(p.description) + '</span>'
        + '</button>';
    }).join('');

    const instance = modale({
      titre: 'Visite guidée de la démonstration',
      contenuHtml:
        '<div class="visite-presentation">'
        + '<p class="visite-presentation-texte">' + esc(TEXTE_PRESENTATION) + '</p>'
        + (voix.disponible()
          ? '<button type="button" class="btn btn-secondaire btn-petit" '
            + 'data-role="ecouter-presentation">Écouter la présentation</button>'
          : '')
        + '</div>'
        + '<p class="modale-intro">Choisissez votre parcours : chaque étape est '
        + 'un geste réel dans l\'application, et rien n\'est bloquant — vous '
        + 'quittez quand vous voulez (bouton « Quitter » ou touche Échap).</p>'
        + '<div class="options-sauvegarde">' + cartes + '</div>',
      actionsHtml:
        '<button type="button" class="btn btn-secondaire btn-bloc" '
        + 'data-role="plus-tard">Plus tard</button>',
      surFermeture: function () { voix.arreter(); }
    });

    const boutonEcouter = instance.racine.querySelector('[data-role="ecouter-presentation"]');
    let lectureEnCours = false;
    function majBoutonEcouter() {
      if (!boutonEcouter) return;
      boutonEcouter.textContent = lectureEnCours
        ? 'Arrêter la lecture' : 'Écouter la présentation';
    }
    function lirePresentation() {
      lectureEnCours = true;
      majBoutonEcouter();
      voix.direTextes([TEXTE_PRESENTATION]).then(function () {
        lectureEnCours = false;
        majBoutonEcouter();
      });
    }
    if (boutonEcouter) {
      boutonEcouter.addEventListener('click', function () {
        if (lectureEnCours) {
          voix.arreter();
          lectureEnCours = false;
          majBoutonEcouter();
        } else {
          lirePresentation();
        }
      });
    }
    if (gesteHumain && voix.disponible() && !voix.estCoupee()) lirePresentation();

    instance.racine.querySelectorAll('.visite-choix').forEach(function (carte) {
      carte.addEventListener('click', function () {
        instance.fermer();
        demarrer(carte.dataset.parcours);
      });
    });
    instance.racine.querySelector('[data-role="plus-tard"]')
      .addEventListener('click', instance.fermer);
  }

  /**
   * Proposition discrète à la PREMIÈRE visite seulement : la mémoire est
   * posée quel que soit le choix (visite lancée ou « Plus tard ») — on ne
   * redemande jamais d'office, le bouton de la barre latérale reste là.
   */
  function proposerAuPremierChargement() {
    let dejaVue = null;
    try {
      dejaVue = localStorage.getItem(CLE_MEMOIRE_VISITE);
    } catch (erreur) {
      return; // stockage indisponible : ne rien proposer, ne pas insister
    }
    if (dejaVue) return;
    try { localStorage.setItem(CLE_MEMOIRE_VISITE, 'proposee'); } catch (e) { /* sans suite */ }
    proposer();
  }

  return {
    proposer,
    proposerAuPremierChargement,
    demarrer,
    arreter,
    estActive: function () { return actif; },
    etapeCourante
  };
}
