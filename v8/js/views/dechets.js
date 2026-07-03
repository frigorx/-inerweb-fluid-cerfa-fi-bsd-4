// ============================================================
// inerWeb Fluide — vue « Déchets / BSFF » (Phase C, SPEC §5.8)
// Chaîne complète : récupération → décision (réutilisable / à
// analyser / déchet) → BSFF → enlèvement → sortie du stock.
// ============================================================

import { enteteVue, chipStatut, tableau, toast, modale, ICONES } from './communs.js';
import { esc, fmtNombre, fmtDate } from '../core/utils.js';
import { ouvrirFormBsff } from '../modales/bsff-form.js';

export const titre = 'Déchets / BSFF';

/* ============================================================
   Décision sur le fluide récupéré : libellés + teintes de chip
   (table propre à cette vue : ce ne sont pas des statuts machine)
   ============================================================ */

const LIBELLES_DECISION = {
  REUTILISABLE: { libelle: 'Réutilisable', classe: 'chip-vert' },
  A_ANALYSER:   { libelle: 'À analyser',   classe: 'chip-ambre' },
  DECHET:       { libelle: 'Déchet',       classe: 'chip-rouge' }
};

/**
 * Chip de décision sur le fluide récupéré. Décision absente → chip
 * grise « — » (aucune décision prise pour le moment).
 * @param {string|null|undefined} decision
 * @returns {string} HTML
 */
function chipDecision(decision) {
  const connue = LIBELLES_DECISION[decision];
  if (connue) {
    return '<span class="chip ' + connue.classe + '">' + esc(connue.libelle) + '</span>';
  }
  return '<span class="chip chip-gris">—</span>';
}

/* ============================================================
   Styles propres à la vue
   ============================================================ */

const STYLES_VUE = `
<style>
  .vue-dechets {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .carte-recup {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .recup-haut {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .recup-fluide {
    font-family: var(--police-titres);
    font-size: 22px;
    font-weight: 700;
    color: var(--texte);
  }
  .recup-masse {
    font-size: 14px;
    font-weight: 600;
    color: var(--texte-2);
  }
  .recup-detail {
    font-size: 12px;
    color: var(--texte-3);
  }
  .recup-garde {
    font-size: 12px;
    font-weight: 600;
  }
  .recup-garde-depassee {
    color: var(--danger);
  }
  .recup-garde-ok {
    color: var(--texte-3);
    font-weight: 400;
  }
  .recup-pied {
    display: flex;
    gap: 8px;
    margin-top: 4px;
    padding-top: 12px;
    border-top: 1px solid var(--bordure-2);
  }
</style>`;

/* ============================================================
   Section 1 : fluides récupérés en attente
   ============================================================ */

/**
 * Une bouteille de récupération est « en attente » tant qu'elle
 * contient du fluide (masse > 0) — qu'une décision ait déjà été
 * prise ou non.
 * @param {object[]} bouteilles
 * @returns {object[]}
 */
function bouteillesRecupPendantes(bouteilles) {
  return bouteilles.filter((b) => b.type === 'RECUPERATION' && b.masseNetteKg > 0);
}

/**
 * Carte d'une bouteille de fluide récupéré en attente de décision
 * ou de sortie de stock.
 * @param {object} b - bouteille
 * @param {string} jour - date du jour ISO, pour comparer la garde
 * @returns {string} HTML
 */
function carteRecuperation(b, jour) {
  const gardeDepassee = Boolean(b.dateLimiteGarde && b.dateLimiteGarde < jour);
  const infoGarde = b.decisionFluide === 'DECHET'
    ? '<div class="recup-garde ' + (gardeDepassee ? 'recup-garde-depassee' : 'recup-garde-ok') + '">'
      + (gardeDepassee ? ICONES.alerte : '')
      + 'Date limite de garde : ' + esc(fmtDate(b.dateLimiteGarde))
      + (gardeDepassee ? ' — dépassée' : '')
      + '</div>'
    : '';

  const boutonBsff = b.decisionFluide === 'DECHET'
    ? '<button type="button" class="btn btn-marine btn-petit" data-action="creer-bsff" data-id="' + esc(b.id) + '">'
      + 'Créer le BSFF</button>'
    : '';

  return '<article class="carte carte-recup">'
    + '<div class="recup-haut">'
    + '<span class="recup-fluide mono">' + esc(b.fluide) + '</span>'
    + chipDecision(b.decisionFluide)
    + '</div>'
    + '<div class="recup-masse mono">' + esc(fmtNombre(b.masseNetteKg, 2)) + ' kg</div>'
    + '<div class="recup-detail">Bouteille ' + esc(b.code)
    + (b.numeroReel ? ' · n° ' + esc(b.numeroReel) : '') + '</div>'
    + '<div class="recup-detail">Dernière entrée : ' + esc(fmtDate(b.datePesee || b.dateEntree)) + '</div>'
    + infoGarde
    + '<div class="recup-pied">'
    + '<button type="button" class="btn btn-secondaire btn-petit" data-action="decider" data-id="' + esc(b.id) + '">'
    + 'Décider</button>'
    + boutonBsff
    + '</div>'
    + '</article>';
}

/* ============================================================
   Section 2 : tableau des bordereaux BSFF
   ============================================================ */

/**
 * Ligne de tableau pour un BSFF.
 * @param {object} bsff
 * @returns {string} HTML
 */
function ligneBsff(bsff) {
  return '<tr>'
    + '<td class="mono">' + esc(bsff.numeroBsff) + '</td>'
    + '<td>' + esc(fmtDate(bsff.dateRemise)) + '</td>'
    + '<td>' + esc(bsff.bouteilleCode) + '</td>'
    + '<td class="mono">' + esc(bsff.fluide) + '</td>'
    + '<td class="align-droite mono">' + esc(fmtNombre(bsff.masseRemiseKg, 2)) + ' kg</td>'
    + '<td>' + esc(bsff.transporteur || '—') + '</td>'
    + '<td>' + esc(bsff.installationDestination || '—') + '</td>'
    + '</tr>';
}

/* ============================================================
   Modale de décision sur le fluide récupéré
   ============================================================ */

/**
 * Ouvre la modale de décision (réutilisable / à analyser / déchet)
 * pour une bouteille de fluide récupéré.
 * @param {{ store: object, naviguer: function, rafraichir?: function }} ctx
 * @param {object} bouteille
 */
function ouvrirDecision(ctx, bouteille) {
  const decisionCourante = bouteille.decisionFluide || null;

  const contenuHtml = ''
    + '<p class="modale-intro">Bouteille <strong>' + esc(bouteille.code) + '</strong>'
    + ' · Fluide <span class="mono">' + esc(bouteille.fluide) + '</span>'
    + ' · <span class="mono">' + esc(fmtNombre(bouteille.masseNetteKg, 2)) + ' kg</span></p>'
    + '<div id="zone-erreur-decision"></div>'
    + '<div class="grille-form-2">'
    + '<button type="button" class="carte-choix' + (decisionCourante === 'REUTILISABLE' ? ' selectionnee' : '')
    + '" data-decision="REUTILISABLE">'
    + '<strong>Réutilisable</strong><span>Fluide propre, remis en stock utilisable</span>'
    + '</button>'
    + '<button type="button" class="carte-choix' + (decisionCourante === 'A_ANALYSER' ? ' selectionnee' : '')
    + '" data-decision="A_ANALYSER">'
    + '<strong>À analyser</strong><span>Qualité incertaine, analyse à faire avant décision</span>'
    + '</button>'
    + '<button type="button" class="carte-choix' + (decisionCourante === 'DECHET' ? ' selectionnee' : '')
    + '" data-decision="DECHET">'
    + '<strong>Déchet</strong><span>Fluide non réutilisable, direction BSFF</span>'
    + '</button>'
    + '</div>';

  const actionsHtml = ''
    + '<button type="button" class="btn btn-contour" data-action="annuler">Annuler</button>'
    + '<button type="button" class="btn btn-marine" data-action="valider" disabled>'
    + ICONES.coche + '<span>Valider la décision</span></button>';

  const instance = modale({
    titre: 'Décider du fluide récupéré',
    contenuHtml,
    actionsHtml
  });

  const racine = document.getElementById('zone-modales') || document.body;
  const zoneErreur = racine.querySelector('#zone-erreur-decision');
  const boutonValider = racine.querySelector('[data-action="valider"]');
  const boutonAnnuler = racine.querySelector('[data-action="annuler"]');
  let decisionChoisie = decisionCourante;

  if (decisionChoisie) boutonValider.disabled = false;

  function afficherErreur(message) {
    zoneErreur.innerHTML = '<div class="bandeau-erreur">' + ICONES.alerte
      + '<span>' + esc(message) + '</span></div>';
  }

  racine.querySelectorAll('.carte-choix[data-decision]').forEach(function (carte) {
    carte.addEventListener('click', function () {
      racine.querySelectorAll('.carte-choix[data-decision]').forEach(function (autre) {
        autre.classList.remove('selectionnee');
      });
      carte.classList.add('selectionnee');
      decisionChoisie = carte.getAttribute('data-decision');
      boutonValider.disabled = false;
    });
  });

  boutonAnnuler.addEventListener('click', function () {
    instance.fermer();
  });

  boutonValider.addEventListener('click', async function () {
    if (!decisionChoisie) return;
    zoneErreur.innerHTML = '';
    try {
      const utilisateur = await ctx.store.getUtilisateurCourant();
      const operateur = utilisateur.prenom + ' ' + utilisateur.nom;
      await ctx.store.deciderFluideRecupere(bouteille.id, decisionChoisie, operateur);
      toast('Décision enregistrée.', 'succes');
      instance.fermer();
      if (typeof ctx.rafraichir === 'function') ctx.rafraichir();
    } catch (erreur) {
      afficherErreur(erreur.message || 'Impossible d’enregistrer cette décision.');
    }
  });
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * @param {HTMLElement} conteneur - élément vidé d'avance par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const [bouteilles, bsffListe] = await Promise.all([
    ctx.store.getBouteilles(),
    ctx.store.getBsff()
  ]);

  const jour = new Date().toISOString().slice(0, 10);
  const enAttente = bouteillesRecupPendantes(bouteilles);

  const entete = enteteVue({
    titre: 'Déchets / BSFF',
    sousTitre: 'Fluides récupérés : décision, bordereaux BSFF et sortie du stock'
  });

  const encartAide = '<div class="encart-aide">'
    + 'Récupération → décision (réutilisable / à analyser / déchet) → BSFF → enlèvement → sortie du stock.'
    + '</div>';

  const sectionRecuperation = '<section class="carte">'
    + '<h3 class="carte-titre">Fluides récupérés en attente</h3>'
    + (enAttente.length > 0
      ? '<div class="grille-3">' + enAttente.map((b) => carteRecuperation(b, jour)).join('') + '</div>'
      : '<div class="etat-vide">' + ICONES.dechets
        + '<p>Aucun fluide récupéré en attente pour le moment.</p></div>')
    + '</section>';

  const sectionBsff = '<section class="carte">'
    + '<h3 class="carte-titre">Bordereaux BSFF</h3>'
    + tableau({
      colonnes: [
        { cle: 'numero', libelle: 'N° BSFF' },
        { cle: 'date', libelle: 'Date remise' },
        { cle: 'bouteille', libelle: 'Bouteille' },
        { cle: 'fluide', libelle: 'Fluide' },
        { cle: 'masse', libelle: 'Masse remise', align: 'droite' },
        { cle: 'transporteur', libelle: 'Transporteur' },
        { cle: 'destination', libelle: 'Destination' }
      ],
      lignesHtml: bsffListe.map(ligneBsff)
    })
    + '</section>';

  conteneur.innerHTML = STYLES_VUE
    + '<div class="vue-contenu vue-dechets anim-fade">'
    + entete
    + encartAide
    + sectionRecuperation
    + sectionBsff
    + '</div>';

  conteneur.addEventListener('click', function (evenement) {
    const bouton = evenement.target.closest('[data-action]');
    if (!bouton || !conteneur.contains(bouton)) return;

    const action = bouton.dataset.action;
    const id = bouton.dataset.id;
    const ctxAvecRafraichissement = Object.assign({}, ctx, {
      rafraichir: function () { ctx.naviguer('dechets'); }
    });

    if (action === 'decider') {
      const bouteille = bouteilles.find((b) => b.id === id);
      if (bouteille) ouvrirDecision(ctxAvecRafraichissement, bouteille);
    } else if (action === 'creer-bsff') {
      ouvrirFormBsff(ctxAvecRafraichissement, id);
    }
  });
}
