// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — app.js
// Amorçage de l'application : sidebar, routeur, en-tête,
// modale de sauvegarde, tiroir mobile.
// ============================================================

import { creerStore } from './data/datastore.js';
import { estActif as modeExerciceActif } from './data/mode-exercice.js';
import { poserBandeauExercice } from './views/bandeau-exercice.js';
import { creerTransportHttp, EVENEMENT_SESSION_REQUISE } from './data/transport-http.js';
import { creerRouteur } from './core/routeur.js';
import { ICONES } from './core/icones.js';
import { esc } from './core/utils.js';
import { modale, toast, confirmer } from './views/communs.js';
import { creerVisiteGuidee, visiteDisponible } from './composants/visite-guidee.js';
import { render as rendreConnexion } from './views/connexion.js';
import { render as rendreBootstrap } from './views/bootstrap-admin.js';

// ---- Liste ordonnée des vues (contrat v8) ----
const VUES = [
  { id: 'dashboard',  libelle: 'Tableau de bord',          icone: 'grille' },
  { id: 'conformite', libelle: 'Conformité',               icone: 'coche' },
  { id: 'audit-guide', libelle: 'Audit guidé',             icone: 'parcours' },
  { id: 'machines',   libelle: 'Parc machines',            icone: 'machine' },
  { id: 'bouteilles', libelle: 'Stock bouteilles',         icone: 'bouteille' },
  { id: 'mouvements', libelle: 'Mouvements',               icone: 'echange' },
  { id: 'controles',  libelle: "Contrôles d'étanchéité",   icone: 'controle' },
  { id: 'dechets',    libelle: 'Déchets / remise en filière', icone: 'dechets' },
  { id: 'outillage',  libelle: 'Outillage',                icone: 'outillage' },
  { id: 'personnel',  libelle: 'Personnel',                icone: 'utilisateur' },
  { id: 'clients',    libelle: 'Clients / détenteurs',     icone: 'client' },
  { id: 'plaintes',   libelle: 'Registre des plaintes',    icone: 'alerte' },
  { id: 'stats',      libelle: 'Statistiques',             icone: 'stats' },
  { id: 'bilan',      libelle: 'Bilan annuel',             icone: 'bilan' },
  { id: 'balance',    libelle: 'Balance matière',          icone: 'balance' },
  { id: 'fluides',    libelle: 'Fluides',                  icone: 'flocon' },
  { id: 'admin',      libelle: 'Administration',           icone: 'engrenage' },
  { id: 'sauvegarde', libelle: 'Sauvegarde',               icone: 'sauvegarde' },
  { id: 'rgpd',       libelle: 'Protection des données',   icone: 'verrou' }
];

// Icône hamburger (propre au menu mobile, hors bibliothèque partagée)
const ICONE_MENU = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" '
  + 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" '
  + 'aria-hidden="true" focusable="false"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>';

// État global de l'application
let store = null;
let routeur = null;
// Visite guidée de la DÉMO (13/08) : contrôleur créé au démarrage en
// mode démonstration seulement — jamais un obstacle en mode Local.
let visiteGuidee = null;

/* ============================================================
   Session (V9-E5, vague 5)
   ============================================================ */

// Transport dédié aux routes de compte (connexion/déconnexion), distinct
// du transport du LocalStore : ces routes sont HORS du contrat DataStore
// (cf. routes-comptes.js) et n'existent qu'en Mode Local (store HTTP) —
// jamais construit contre le DemoStore, qui n'a ni serveur ni session.
const transportComptes = creerTransportHttp();

// Identité de la session en cours, connue seulement côté client une fois
// la connexion réussie (le cookie iwf_session, lui, est HttpOnly : seule
// source de vérité côté serveur). Perdue au rechargement — sans
// conséquence : la prochaine lecture/mutation qui l'exige redéclenche
// l'écran de connexion via EVENEMENT_SESSION_REQUISE si besoin.
let sessionCourante = null;

// Vrai pendant que l'écran de connexion occupe #vue : protège contre un
// écrasement par la suite de la séquence de démarrage (verifierIntegriteRegistre
// peut déclencher EVENEMENT_SESSION_REQUISE avant que construireSidebar/
// afficherVue n'aient tourné) ou par un rendu de vue concurrent.
let ecranConnexionAffiche = false;

/** Vrai si l'application tourne en Mode Local (store HTTP, sessions actives). */
function modeLocalActif() {
  return Boolean(store && store.modeLabel === 'LOCAL');
}

/* ============================================================
   Sidebar
   ============================================================ */

/** Construit le contenu de la barre latérale. */
function construireSidebar() {
  const sidebar = document.getElementById('sidebar');

  const liens = VUES.map(function (vue) {
    // IM-2 : les alertes couvrent bien plus que les seuls contrôles
    // d'étanchéité (capacité, aptitudes, outillage, garde déchets, écarts,
    // mouvements…) — le badge global est donc posé sur « Tableau de bord »,
    // première entrée de la sidebar, plutôt que sur une famille particulière.
    const badge = vue.id === 'dashboard'
      ? '<span id="badge-alertes" class="badge-rouge" hidden></span>'
      : '';
    return '<a class="nav-item" href="#/' + vue.id + '" data-vue="' + vue.id + '">'
      + '<span class="nav-icone">' + ICONES[vue.icone] + '</span>'
      + '<span class="nav-libelle">' + vue.libelle + '</span>'
      + badge
      + '</a>';
  }).join('');

  sidebar.innerHTML =
    '<div class="sidebar-logo">'
    + '<span class="logo-carre">' + ICONES.flocon + '</span>'
    + '<div class="logo-textes">'
    + '<div class="logo-nom">inerWeb <span class="logo-fluide">Fluide</span></div>'
    + '<div class="logo-sous-titre">Traçabilité F-Gas</div>'
    + '</div>'
    + '</div>'
    + '<nav class="sidebar-nav" aria-label="Vues de l\'application">' + liens + '</nav>'
    + '<div class="sidebar-pied">'
    // Visite guidée : bouton permanent en DÉMO seulement (décision 13/08)
    + (visiteDisponible(store)
      ? '<button id="bouton-visite-guidee" class="btn-sauvegarde no-print" type="button">'
        + ICONES.parcours + '<span>Visite guidée avec voix</span></button>'
      : '')
    + '<button id="bouton-sauvegarde" class="btn-sauvegarde no-print" type="button">'
    + ICONES.sauvegarde + '<span>Sauvegarde</span>'
    + '</button>'
    + '<div class="etat-sauvegarde">'
    + '<span class="pastille-verte" aria-hidden="true"></span>'
    + '<span>' + (store && store.modeLabel === 'LOCAL'
      ? 'Données locales (SQLite)' : 'Données de démonstration') + '</span>'
    + '</div>'
    + '<div class="pied-session" id="pied-session" hidden></div>'
    + '</div>';

  document.getElementById('bouton-sauvegarde').addEventListener('click', ouvrirModaleSauvegarde);
  const boutonVisite = document.getElementById('bouton-visite-guidee');
  if (boutonVisite) {
    boutonVisite.addEventListener('click', function () {
      // Le clic est le GESTE HUMAIN : le speech de présentation peut partir
      // (v2 voix, 14/08). À l'ouverture automatique de la première visite,
      // proposerAuPremierChargement ne le passe pas — aucun son sans geste.
      if (visiteGuidee) visiteGuidee.proposer({ gesteHumain: true });
    });
  }
  majPiedSession();

  // Sur mobile, un clic sur un lien referme le tiroir
  sidebar.querySelectorAll('.nav-item').forEach(function (lien) {
    lien.addEventListener('click', fermerTiroir);
  });
}

/** Met à jour le badge du compteur d'alertes sur « Contrôles d'étanchéité ». */
async function majBadgeAlertes() {
  const badge = document.getElementById('badge-alertes');
  if (!badge) return;
  try {
    const alertes = await store.getAlertes();
    if (alertes.length > 0) {
      badge.textContent = String(alertes.length);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  } catch (erreur) {
    console.error('Lecture des alertes impossible :', erreur);
    badge.hidden = true;
  }
}

/* ============================================================
   Tiroir mobile
   ============================================================ */

function ouvrirTiroir() {
  document.body.classList.add('menu-ouvert');
  const voile = document.getElementById('voile-sidebar');
  voile.hidden = false;
  requestAnimationFrame(function () { voile.classList.add('visible'); });
  document.getElementById('bouton-menu').setAttribute('aria-expanded', 'true');
}

function fermerTiroir() {
  if (!document.body.classList.contains('menu-ouvert')) return;
  document.body.classList.remove('menu-ouvert');
  const voile = document.getElementById('voile-sidebar');
  voile.classList.remove('visible');
  setTimeout(function () { voile.hidden = true; }, 220);
  document.getElementById('bouton-menu').setAttribute('aria-expanded', 'false');
}

function initialiserTiroir() {
  const bouton = document.getElementById('bouton-menu');
  bouton.innerHTML = ICONE_MENU;
  bouton.addEventListener('click', function () {
    if (document.body.classList.contains('menu-ouvert')) {
      fermerTiroir();
    } else {
      ouvrirTiroir();
    }
  });
  document.getElementById('voile-sidebar').addEventListener('click', fermerTiroir);
}

/* ============================================================
   Affichage des vues
   ============================================================ */

/** Panneau de repli si une vue est absente ou plante au rendu. */
function afficherConstruction(conteneur, libelle) {
  conteneur.innerHTML = '<div class="vue-construction">'
    + ICONES.engrenage
    + '<h2>Vue en construction</h2>'
    + '<p>La vue « ' + libelle + ' » n\'est pas encore disponible dans cette version.</p>'
    + '</div>';
}

/**
 * Charge dynamiquement une vue et l'affiche.
 * @param {string} id — identifiant de vue (ex. 'machines', ou 'm' pour la
 *   fiche machine, hors sidebar)
 * @param {string} [param=''] — paramètre brut porté par le hash (ex. le
 *   code public d'une machine pour id === 'm')
 */
async function afficherVue(id, param = '') {
  // L'écran de connexion occupe #vue : aucune vue ne doit l'écraser tant
  // qu'on ne s'est pas reconnecté (surConnexion rappelle afficherVue lui-même).
  if (ecranConnexionAffiche) return;

  // Route paramétrée '#/cl/<code>' (référence client QR) : retrouve le
  // client par son code_public opaque puis ouvre sa fiche ('#/c/<id>').
  // Code inconnu → annuaire clients + toast sobre, jamais d'exception.
  if (id === 'cl') {
    await ouvrirClientParCode(param);
    return;
  }

  const zone = document.getElementById('vue');
  const definition = VUES.find(function (vue) { return vue.id === id; });
  const libelle = definition ? definition.libelle : id;

  // Item actif dans la sidebar (aucun match pour une vue hors sidebar,
  // ex. la fiche machine 'm' : la boucle retire simplement toute classe
  // « actif », ce qui est le comportement voulu)
  document.querySelectorAll('#sidebar .nav-item').forEach(function (lien) {
    lien.classList.toggle('actif', lien.dataset.vue === id);
  });

  fermerTiroir();

  // Chargement du module de la vue. Les fiches (machine '#/m/<code>',
  // bouteille '#/b/<code>', client '#/c/<id>', dossier de fuite
  // '#/f/<idControleFuite>') sont des modules dédiés, volontairement
  // absents de VUES (pas d'entrée sidebar propre — la fiche client est
  // atteinte depuis l'annuaire 'clients' ou une carte machine, le dossier
  // de fuite depuis le bloc « Fuites » de la fiche machine).
  // Brique ② : '#/b/<code>' ouvre désormais la VRAIE fiche bouteille (le
  // hash des étiquettes QR imprimées est inchangé) ; l'édition reste
  // accessible par le bouton « Modifier la fiche » de la fiche.
  const nomModule = id === 'm' ? 'fiche-machine'
    : id === 'b' ? 'fiche-bouteille'
    : id === 'c' ? 'fiche-client'
    : id === 'o' ? 'fiche-outil'
    : id === 'f' ? 'fiche-fuite'
    : id;
  let module = null;
  try {
    module = await import('./views/' + nomModule + '.js');
  } catch (erreur) {
    console.error('Chargement de la vue « ' + id + ' » impossible :', erreur);
  }

  // Fil d'ariane + titre de page
  const titre = (module && module.titre) ? module.titre : libelle;
  document.getElementById('fil-ariane').textContent = 'inerWeb Fluide / ' + titre;
  document.getElementById('titre-page').textContent = titre;
  document.title = titre + ' — inerWeb Fluide';

  // Conteneur neuf avec animation d'apparition
  zone.innerHTML = '';
  const conteneur = document.createElement('div');
  conteneur.className = 'vue-contenu anim-fade';
  zone.appendChild(conteneur);

  if (module && typeof module.render === 'function') {
    try {
      await module.render(conteneur, { store, naviguer: naviguer, param: param });
    } catch (erreur) {
      console.error('Rendu de la vue « ' + id + ' » en échec :', erreur);
      afficherConstruction(conteneur, libelle);
    }
  } else {
    afficherConstruction(conteneur, libelle);
  }

  zone.scrollTop = 0;
  window.scrollTo(0, 0);
}

/**
 * Résout la route '#/cl/<code>' : retrouve le client par son code_public
 * puis ouvre sa fiche ('#/c/<id>'), qui liste ses machines. Code inconnu →
 * annuaire clients + toast sobre, sans exception. Utilisé par l'étiquette QR
 * « chez le client » (documents/etiquette-client.js).
 * @param {string} codePublic — paramètre brut porté par le hash
 */
async function ouvrirClientParCode(codePublic) {
  const code = String(codePublic || '').trim();
  try {
    const clients = await store.getClients();
    const client = clients.find(function (c) { return c.codePublic === code; });
    if (!client) {
      await afficherVue('clients');
      toast('Client introuvable (code inconnu).', 'erreur');
      return;
    }
    naviguer('c/' + client.id);
  } catch (erreur) {
    console.error('Ouverture du client par code impossible :', erreur);
    await afficherVue('clients');
    toast('Client introuvable (code inconnu).', 'erreur');
  }
}

/**
 * Navigation par programme (déléguée au routeur).
 * @param {string} hash — identifiant de vue, avec ou sans paramètre
 *   (ex. 'machines', ou 'm/AB12CD3')
 */
function naviguer(hash) {
  routeur.naviguer(hash);
}

/* ============================================================
   Écran de connexion (V9-E5, vague 5)
   ============================================================ */

/**
 * Affiche l'écran de connexion à la place de la vue courante. Hors
 * routeur hash (ne touche jamais window.location.hash) : à la
 * connexion réussie, on réaffiche simplement la vue déjà demandée par
 * l'utilisateur — jamais de redirection forcée vers le tableau de bord,
 * jamais de boucle avec l'écran qu'elle protège.
 */
function afficherEcranConnexion() {
  ecranConnexionAffiche = true;

  document.getElementById('fil-ariane').textContent = 'inerWeb Fluide / Connexion';
  document.getElementById('titre-page').textContent = 'Connexion';
  document.title = 'Connexion — inerWeb Fluide';

  const zone = document.getElementById('vue');
  zone.innerHTML = '';
  const conteneur = document.createElement('div');
  conteneur.className = 'vue-contenu anim-fade';
  zone.appendChild(conteneur);

  rendreConnexion(conteneur, {
    transport: transportComptes,
    surConnexion(resultat) {
      sessionCourante = resultat && resultat.utilisateur
        ? { role: resultat.role, utilisateur: resultat.utilisateur }
        : null;
      ecranConnexionAffiche = false;
      majPiedSession();
      toast('Connexion réussie.', 'succes');
      // On réaffiche la vue déjà demandée (le hash n'a jamais bougé) plutôt
      // que de forcer un retour au tableau de bord. Si le routeur n'est pas
      // encore prêt (connexion déclenchée pendant la séquence de démarrage,
      // avant creerRouteur), on reprend la séquence de démarrage à la place.
      if (routeur) {
        afficherVue(routeur.idCourant(), routeur.paramCourant());
      } else {
        reprendreDemarrageApresConnexion();
      }
    }
  });

  zone.scrollTop = 0;
  window.scrollTo(0, 0);
}

/**
 * Affiche l'écran de PREMIER LANCEMENT (création du 1er compte ADMIN) à la
 * place de la vue courante. Même patron que l'écran de connexion (hors routeur
 * hash, occupe #vue via le même verrou ecranConnexionAffiche pour ne pas être
 * écrasé par la suite du démarrage). À la création réussie, l'administrateur
 * est déjà connecté (le serveur a posé le cookie de session) : on enchaîne
 * directement sur l'application.
 */
function afficherEcranBootstrap() {
  ecranConnexionAffiche = true;

  document.getElementById('fil-ariane').textContent = 'inerWeb Fluide / Premier lancement';
  document.getElementById('titre-page').textContent = 'Premier lancement';
  document.title = 'Premier lancement — inerWeb Fluide';

  const zone = document.getElementById('vue');
  zone.innerHTML = '';
  const conteneur = document.createElement('div');
  conteneur.className = 'vue-contenu anim-fade';
  zone.appendChild(conteneur);

  rendreBootstrap(conteneur, {
    transport: transportComptes,
    surCreation(resultat) {
      sessionCourante = resultat && resultat.utilisateur
        ? { role: resultat.role, utilisateur: resultat.utilisateur }
        : null;
      ecranConnexionAffiche = false;
      majPiedSession();
      toast('Compte administrateur créé. Bienvenue !', 'succes');
      if (routeur) {
        afficherVue(routeur.idCourant(), routeur.paramCourant());
      } else {
        reprendreDemarrageApresConnexion();
      }
    }
  });

  zone.scrollTop = 0;
  window.scrollTo(0, 0);
}

/** Déconnexion : révoque la session serveur puis revient à l'écran de connexion. */
async function seDeconnecter() {
  try {
    await transportComptes('deconnexion', {});
  } catch (erreur) {
    // Idempotent côté serveur (cf. routes-comptes.js) : une erreur réseau
    // ici ne doit pas empêcher de nettoyer l'état local et de reproposer
    // l'écran de connexion.
    console.error('Déconnexion : appel serveur en échec :', erreur);
  }
  sessionCourante = null;
  majPiedSession();
  toast('Déconnecté.', 'info');
  afficherEcranConnexion();
}

/**
 * Construit (ou met à jour) le pied de session dans la sidebar : identité
 * + bouton Déconnexion si une session est active, rien en Mode Démo (pas
 * de compte à cette échelle) ni tant qu'aucune connexion n'a réussi.
 */
function majPiedSession() {
  const pied = document.getElementById('pied-session');
  if (!pied) return;

  if (!modeLocalActif() || !sessionCourante) {
    pied.hidden = true;
    pied.innerHTML = '';
    return;
  }

  const login = (sessionCourante.utilisateur && sessionCourante.utilisateur.login) || '';
  const role = sessionCourante.role || '';
  pied.hidden = false;
  pied.innerHTML =
    '<div class="pied-session-identite">'
    + '<span class="pied-session-login">' + esc(login) + '</span>'
    + '<span class="pied-session-role">' + esc(role) + '</span>'
    + '</div>'
    + '<button type="button" class="bouton-deconnexion" id="bouton-deconnexion" '
    + 'title="Déconnexion" aria-label="Déconnexion">' + ICONES.verrou + '</button>';

  document.getElementById('bouton-deconnexion').addEventListener('click', seDeconnecter);
}

/* ============================================================
   Modale de sauvegarde
   ============================================================ */

/** Télécharge la sauvegarde complète au format JSON. */
async function exporterSauvegarde() {
  try {
    const texte = await store.exporterJSON();
    const date = new Date().toISOString().slice(0, 10); // AAAA-MM-JJ
    const blob = new Blob([texte], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'inerweb-fluide-demo-' + date + '.json';
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    URL.revokeObjectURL(url);
    toast('Sauvegarde exportée.', 'succes');
  } catch (erreur) {
    console.error('Export de la sauvegarde en échec :', erreur);
    toast("L'export de la sauvegarde a échoué.", 'erreur');
  }
}

/** Restaure les données depuis un fichier JSON choisi par l'utilisateur. */
async function restaurerSauvegarde(fichier) {
  try {
    const texte = await fichier.text();
    const reussi = await store.importerJSON(texte);
    if (reussi) {
      toast('Données restaurées. Rechargement…', 'succes');
      setTimeout(function () { window.location.reload(); }, 900);
    } else {
      toast('Fichier invalide : restauration impossible.', 'erreur');
    }
  } catch (erreur) {
    console.error('Restauration en échec :', erreur);
    // CR-5 : le store refuse un fichier forgé avec un message explicite
    // (« Import refusé — … ») : le montrer tel quel plutôt qu'un générique.
    const message = erreur && erreur.message
      && erreur.message.startsWith('Import refusé')
      ? erreur.message
      : 'La restauration a échoué.';
    toast(message, 'erreur');
  }
}

/** Ouvre la modale « Sauvegarde » (export / restauration). */
function ouvrirModaleSauvegarde() {
  const { fermer } = modale({
    titre: 'Sauvegarde des données',
    contenuHtml:
      '<p class="modale-intro">Vos données sont enregistrées automatiquement sur cet appareil.</p>'
      + '<div class="options-sauvegarde">'
      + '<button id="option-exporter" class="option-sauvegarde" type="button">'
      + ICONES.telecharger
      + '<span class="option-titre">Exporter une sauvegarde</span>'
      + '<span class="option-detail">Télécharge un fichier .json contenant toutes vos données.</span>'
      + '</button>'
      + '<button id="option-restaurer" class="option-sauvegarde" type="button">'
      + ICONES.televerser
      + '<span class="option-titre">Restaurer</span>'
      + '<span class="option-detail">Recharge les données depuis un fichier .json exporté.</span>'
      + '</button>'
      + '<button id="option-reinitialiser" class="option-sauvegarde" type="button">'
      + ICONES.croix
      + '<span class="option-titre">Réinitialiser la démonstration</span>'
      + '<span class="option-detail">Efface tout et recharge le monde fictif de départ (machines, bouteilles, mouvements d\'exemple).</span>'
      + '</button>'
      + '</div>'
      + '<input id="fichier-restauration" type="file" accept=".json,application/json" hidden>',
    actionsHtml:
      '<button id="bouton-fermer-sauvegarde" class="btn btn-marine btn-bloc" type="button">Fermer</button>'
  });

  document.getElementById('option-exporter').addEventListener('click', exporterSauvegarde);

  const champFichier = document.getElementById('fichier-restauration');
  document.getElementById('option-restaurer').addEventListener('click', function () {
    champFichier.click();
  });
  champFichier.addEventListener('change', function () {
    const fichier = champFichier.files && champFichier.files[0];
    if (fichier) {
      fermer();
      restaurerSauvegarde(fichier);
    }
  });

  document.getElementById('bouton-fermer-sauvegarde').addEventListener('click', fermer);

  // Réinitialisation de la démonstration : on efface le registre local
  // (localStorage) ET les pièces jointes (IndexedDB), puis on recharge —
  // le monde fictif de départ se reconstruit tout seul au démarrage.
  document.getElementById('option-reinitialiser').addEventListener('click', async function () {
    const confirme = await confirmer({
      titre: 'Réinitialiser la démonstration',
      message: 'Toutes les données saisies sur cet appareil (mouvements, machines, pièces jointes…) '
        + 'seront effacées et remplacées par le monde fictif de départ. '
        + 'Pensez à exporter une sauvegarde avant si vous voulez garder une trace.',
      libelleConfirmer: 'Réinitialiser',
      danger: true
    });
    if (!confirme) return;
    try { localStorage.removeItem('inerweb-fluide-v8-demo'); } catch (e) { /* stockage indisponible */ }
    const suppression = indexedDB.deleteDatabase('inerweb-fluide-v8-pj');
    const recharger = function () { window.location.reload(); };
    suppression.onsuccess = recharger;
    suppression.onerror = recharger;
    suppression.onblocked = recharger;
  });
}

/* ============================================================
   Intégrité du registre (CR-5)
   ============================================================ */

/**
 * Affiche, si besoin, le bandeau rouge non fermable signalant une rupture
 * de la chaîne d'écritures (registre altéré : import forgé ou localStorage
 * réécrit hors application). Rien ne bloque l'application — c'est un
 * signal, pas un verrou (cf. `getEtatRegistre` dans demo-store.js).
 */
async function verifierIntegriteRegistre() {
  const bandeau = document.getElementById('bandeau-integrite');
  if (!bandeau) return;
  try {
    const etat = await store.getEtatRegistre();
    if (!etat.altere) {
      bandeau.hidden = true;
      return;
    }
    bandeau.className = 'bandeau-erreur';
    bandeau.innerHTML = ICONES.alerte
      + '<span><strong>Intégrité du registre non vérifiée</strong> : la chaîne des '
      + 'écritures a été rompue (écriture ' + esc(etat.casseA || '?') + '). '
      + 'Exportez une sauvegarde et contactez l’administrateur.</span>';
    bandeau.hidden = false;
  } catch (erreur) {
    console.error('Vérification de l’intégrité du registre impossible :', erreur);
  }
}

/* ============================================================
   Amorçage
   ============================================================ */

/**
 * Poursuit (ou reprend) l'amorçage une fois qu'aucun écran de connexion ne
 * bloque plus #vue : sidebar, tiroir, badge d'alertes, routeur. Appelée une
 * fois normalement par demarrer(), et de nouveau par surConnexion() si la
 * toute première lecture du démarrage (verifierIntegriteRegistre, sur une
 * origine LAN sans session) a fait basculer sur l'écran de connexion avant
 * que cette suite n'ait eu la main.
 */
function reprendreDemarrageApresConnexion() {
  // Visite guidée (13/08) : créée AVANT la sidebar (dont le bouton s'y
  // adosse), en démonstration seulement.
  if (visiteDisponible(store) && !visiteGuidee) {
    visiteGuidee = creerVisiteGuidee({ store: store, naviguer: naviguer });
  }

  construireSidebar();
  initialiserTiroir();

  // IM-2(b) : le badge se met à jour après TOUTE mutation du store — plus
  // seulement à la navigation — pour couvrir les vues qui se re-rendent
  // elles-mêmes sans passer par le routeur (ex. machines.js, outillage.js).
  store.surChangement(majBadgeAlertes);
  majBadgeAlertes();

  // Intégrité du registre : re-vérifiée ICI car, depuis le lot A, tout
  // démarrage passe par la connexion — la première tentative (demarrer, avant
  // session) a été refusée et a basculé sur l'écran de connexion. Sans ce
  // rappel, le bandeau audit-proof ne s'afficherait plus jamais en mono-poste.
  // Idempotent (simple lecture + mise à jour du bandeau).
  verifierIntegriteRegistre();

  routeur = creerRouteur({ surChangement: afficherVue });
  afficherVue(routeur.idCourant(), routeur.paramCourant());

  // Proposition discrète à la PREMIÈRE visite de la démo (mémoire
  // localStorage) — jamais re-proposée d'office, le bouton reste là.
  if (visiteGuidee) visiteGuidee.proposerAuPremierChargement();
}

async function demarrer() {
  store = await creerStore();

  // Badge de mode dans l'en-tête (« ● DÉMO / FORMATION »). En MODE
  // EXERCICE (13/08), le bac est un DemoStore mais le badge dit EXERCICE —
  // et le bandeau dédié (posé ci-dessous) porte le cycle de vie complet.
  document.getElementById('badge-mode').textContent =
    (modeExerciceActif() ? 'EXERCICE' : store.modeLabel) + ' / FORMATION';
  poserBandeauExercice(store);

  // Session (V9-E5) : uniquement en Mode Local (store HTTP, back par
  // sessions). Le Mode Démo n'a ni serveur ni cookie — rien à écouter.
  // Une seule écoute pour toute la durée de vie de la page : chaque appel
  // du transport (lecture ou mutation) peut la redéclencher, quelle que
  // soit la vue affichée au moment où la session expire.
  if (modeLocalActif()) {
    document.addEventListener(EVENEMENT_SESSION_REQUISE, () => {
      if (sessionCourante) {
        // On avait une session côté client : elle vient d'expirer côté
        // serveur (8 h dépassées, ou révoquée) — pas une simple absence
        // initiale. Le message le dit à l'utilisateur avant de le renvoyer
        // à l'écran de connexion.
        sessionCourante = null;
        majPiedSession();
        toast('Session expirée. Merci de vous reconnecter.', 'erreur');
      }
      afficherEcranConnexion();
    });
  }

  // Premier lancement (Mode Local) : si AUCUN compte n'existe encore, on
  // présente l'écran « Créer le compte administrateur » AVANT toute lecture
  // de données — plus de fenêtre CLI, plus d'impasse « base sans admin ».
  if (modeLocalActif()) {
    let initialise = true;
    try {
      const etat = await transportComptes('etatInitial', {});
      initialise = Boolean(etat && etat.initialise);
    } catch (erreur) {
      // Si l'état ne peut pas être lu, ne pas bloquer le démarrage : la
      // séquence normale (connexion) prendra le relais si besoin.
      console.error("Lecture de l'état d'initialisation impossible :", erreur);
    }
    if (!initialise) {
      afficherEcranBootstrap();
      return; // surCreation() reprendra la séquence de démarrage.
    }
  }

  await verifierIntegriteRegistre();

  // Si verifierIntegriteRegistre a basculé sur l'écran de connexion (LAN
  // sans session), on s'arrête là : surConnexion() reprendra la séquence
  // via reprendreDemarrageApresConnexion() une fois la connexion réussie.
  if (ecranConnexionAffiche) return;

  reprendreDemarrageApresConnexion();
}

demarrer().catch(function (erreur) {
  console.error("Démarrage de l'application impossible :", erreur);
  const zone = document.getElementById('vue');
  if (zone) {
    zone.innerHTML = '<div class="vue-construction">'
      + '<h2>Erreur au démarrage</h2>'
      + '<p>Le chargement des données a échoué. Rechargez la page ou consultez la console.</p>'
      + '</div>';
  }
});
