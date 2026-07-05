// ============================================================
// inerWeb Fluide — app.js
// Amorçage de l'application : sidebar, routeur, en-tête,
// modale de sauvegarde, tiroir mobile.
// ============================================================

import { creerStore } from './data/datastore.js';
import { creerRouteur } from './core/routeur.js';
import { ICONES } from './core/icones.js';
import { esc } from './core/utils.js';
import { modale, toast } from './views/communs.js';

// ---- Liste ordonnée des vues (contrat v8) ----
const VUES = [
  { id: 'dashboard',  libelle: 'Tableau de bord',          icone: 'grille' },
  { id: 'machines',   libelle: 'Parc machines',            icone: 'machine' },
  { id: 'bouteilles', libelle: 'Stock bouteilles',         icone: 'bouteille' },
  { id: 'mouvements', libelle: 'Mouvements',               icone: 'echange' },
  { id: 'controles',  libelle: "Contrôles d'étanchéité",   icone: 'controle' },
  { id: 'dechets',    libelle: 'Déchets / BSFF',           icone: 'dechets' },
  { id: 'outillage',  libelle: 'Outillage',                icone: 'outillage' },
  { id: 'personnel',  libelle: 'Personnel',                icone: 'utilisateur' },
  { id: 'stats',      libelle: 'Statistiques',             icone: 'stats' },
  { id: 'bilan',      libelle: 'Bilan annuel',             icone: 'bilan' },
  { id: 'balance',    libelle: 'Balance matière',          icone: 'balance' },
  { id: 'fluides',    libelle: 'Fluides',                  icone: 'flocon' },
  { id: 'admin',      libelle: 'Administration',           icone: 'engrenage' }
];

// Icône hamburger (propre au menu mobile, hors bibliothèque partagée)
const ICONE_MENU = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" '
  + 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" '
  + 'aria-hidden="true" focusable="false"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>';

// État global de l'application
let store = null;
let routeur = null;

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
    + '<button id="bouton-sauvegarde" class="btn-sauvegarde no-print" type="button">'
    + ICONES.sauvegarde + '<span>Sauvegarde</span>'
    + '</button>'
    + '<div class="etat-sauvegarde">'
    + '<span class="pastille-verte" aria-hidden="true"></span>'
    + '<span>' + (store && store.modeLabel === 'LOCAL'
      ? 'Données locales (SQLite)' : 'Données de démonstration') + '</span>'
    + '</div>'
    + '</div>';

  document.getElementById('bouton-sauvegarde').addEventListener('click', ouvrirModaleSauvegarde);

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

/** Charge dynamiquement une vue et l'affiche. */
async function afficherVue(id) {
  const zone = document.getElementById('vue');
  const definition = VUES.find(function (vue) { return vue.id === id; });
  const libelle = definition ? definition.libelle : id;

  // Item actif dans la sidebar
  document.querySelectorAll('#sidebar .nav-item').forEach(function (lien) {
    lien.classList.toggle('actif', lien.dataset.vue === id);
  });

  fermerTiroir();

  // Chargement du module de la vue
  let module = null;
  try {
    module = await import('./views/' + id + '.js');
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
      await module.render(conteneur, { store, naviguer: naviguer });
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

/** Navigation par programme (déléguée au routeur). */
function naviguer(id) {
  routeur.naviguer(id);
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
  document.getElementById('option-reinitialiser').addEventListener('click', function () {
    const confirme = window.confirm(
      'Réinitialiser la démonstration ?\n\n'
      + 'Toutes les données saisies sur cet appareil (mouvements, machines, pièces jointes…) '
      + 'seront effacées et remplacées par le monde fictif de départ.\n\n'
      + 'Pensez à exporter une sauvegarde avant si vous voulez garder une trace.'
    );
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

async function demarrer() {
  store = await creerStore();

  // Badge de mode dans l'en-tête (« ● DÉMO / FORMATION »)
  document.getElementById('badge-mode').textContent = store.modeLabel + ' / FORMATION';

  await verifierIntegriteRegistre();

  construireSidebar();
  initialiserTiroir();

  // IM-2(b) : le badge se met à jour après TOUTE mutation du store — plus
  // seulement à la navigation — pour couvrir les vues qui se re-rendent
  // elles-mêmes sans passer par le routeur (ex. machines.js, outillage.js).
  store.surChangement(majBadgeAlertes);
  majBadgeAlertes();

  routeur = creerRouteur({ surChangement: afficherVue });
  afficherVue(routeur.idCourant());
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
