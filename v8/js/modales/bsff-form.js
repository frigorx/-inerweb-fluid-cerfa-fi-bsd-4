// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — modale « Enregistrer la remise en filière » (Phase C)
// Sortie de stock d'une bouteille de fluide récupéré déclarée
// DÉCHET : transporteur, installation de destination, masse remise,
// date de remise. Opération tracée et non réversible
// (store.createBsff). Zone de pièces jointes après création.
// ⚠ Lot B2 : ce suivi est INTERNE — il ne remplace pas le bordereau
// de suivi de déchets dématérialisé obligatoire (mention permanente).
// ============================================================

import { modale, toast, ICONES } from '../views/communs.js';
import { esc, fmtNombre, nombreFr } from '../core/utils.js';
import { zonePiecesJointes } from '../composants/pieces-jointes.js';
import {
  LIBELLE_SUIVI, MENTION_BORDEREAU_OFFICIEL, LIBELLE_BORDEREAU_EXTERNE
} from '../data/remise-filiere.js';

/**
 * Date du jour au format ISO (AAAA-MM-JJ), cohérent avec le store.
 * @returns {string}
 */
function aujourdHuiIso() {
  const d = new Date();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/**
 * Ouvre la modale de création d'un BSFF pour une bouteille de
 * fluide récupéré déjà déclarée DÉCHET.
 * @param {{ store: object, naviguer: (id: string) => void, rafraichir?: function }} ctx
 * @param {string} bouteilleId - id de la bouteille concernée
 * @returns {Promise<void>}
 */
export async function ouvrirFormBsff(ctx, bouteilleId) {
  const { store } = ctx;
  const bouteilles = await store.getBouteilles();
  const bouteille = bouteilles.find((b) => b.id === bouteilleId);

  if (!bouteille) {
    toast('Bouteille introuvable.', 'erreur');
    return;
  }
  if (bouteille.statut !== 'DECHET') {
    toast('Cette bouteille n’est pas (ou plus) déclarée déchet.', 'erreur');
    return;
  }

  const masseMax = fmtNombre(bouteille.masseNetteKg, 2).replace(',', '.');

  const contenuHtml = ''
    + '<form class="formulaire" id="form-bsff" novalidate>'
    + '<div id="zone-erreur-bsff"></div>'

    + '<p class="modale-intro">Bouteille <strong>' + esc(bouteille.code) + '</strong>'
    + (bouteille.numeroReel ? ' · n° ' + esc(bouteille.numeroReel) : '') + '<br>'
    + 'Fluide : <span class="mono">' + esc(bouteille.fluide) + '</span>'
    + ' · Masse nette actuelle : <span class="mono">' + esc(fmtNombre(bouteille.masseNetteKg, 2)) + ' kg</span></p>'

    // ⚠ Lot B2 — MENTION PERMANENTE : ce que ce document n'est PAS.
    + '<div class="bandeau-avertissement">' + ICONES.alerte
    + '<span>' + esc(MENTION_BORDEREAU_OFFICIEL) + '</span></div>'

    + '<div class="bandeau-avertissement">' + ICONES.alerte
    + '<span>Opération tracée, non réversible. Remise totale : la bouteille '
    + 'sort du stock. Remise partielle : le reliquat reste en stock, '
    + 'toujours en statut déchet (délai de garde conservé).</span></div>'

    + '<div class="grille-form-2">'
    + '<div class="champ">'
    + '<label for="bsff-numero">N° du suivi interne *</label>'
    + '<input id="bsff-numero" name="numeroBsff" type="text" required>'
    + '</div>'
    + '<div class="champ">'
    + '<label for="bsff-date">Date de remise *</label>'
    + '<input id="bsff-date" name="dateRemise" type="date" required'
    + ' value="' + esc(aujourdHuiIso()) + '">'
    + '</div>'
    + '</div>'

    // ⚠ Lot B2 — LE NUMÉRO RÉEL A SA PLACE : le bordereau officiel a son
    // propre champ, jamais mélangé au numéro du suivi interne.
    + '<div class="champ">'
    + '<label for="bsff-externe">' + esc(LIBELLE_BORDEREAU_EXTERNE) + '</label>'
    + '<input id="bsff-externe" name="bordereauExterne" type="text"'
    + ' placeholder="numéro ou lien du bordereau dématérialisé">'
    + '<span class="champ-erreur" style="color:var(--texte-faible)">'
    + 'Reportez ici le numéro du bordereau établi sur la plateforme '
    + 'nationale, et joignez-le en pièce jointe. Laissez vide s’il n’est '
    + 'pas encore établi.</span>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ">'
    + '<label for="bsff-transporteur">Transporteur *</label>'
    + '<input id="bsff-transporteur" name="transporteur" type="text" required>'
    + '</div>'
    + '<div class="champ">'
    + '<label for="bsff-destination">Installation de destination *</label>'
    + '<input id="bsff-destination" name="installationDestination" type="text" required>'
    + '</div>'
    + '</div>'

    + '<div class="champ">'
    + '<label for="bsff-masse">Masse remise *</label>'
    + '<div class="champ-unite" data-unite="kg">'
    + '<input id="bsff-masse" name="masseRemiseKg" type="number" min="0" step="0.01"'
    + ' max="' + esc(masseMax) + '" value="' + esc(masseMax) + '" required>'
    + '</div>'
    + '<span class="champ-erreur" style="color:var(--texte-faible)">'
    + 'Ne peut pas dépasser le contenu de la bouteille (' + esc(fmtNombre(bouteille.masseNetteKg, 2)) + ' kg).</span>'
    + '</div>'

    // IM-8 : reliquat annoncé en direct si la masse remise est partielle
    + '<div id="zone-reliquat-bsff"></div>'

    + '</form>';

  const actionsHtml = ''
    + '<button type="button" class="btn btn-contour" data-action="annuler">Annuler</button>'
    + '<button type="submit" form="form-bsff" class="btn btn-marine">'
    + ICONES.coche + '<span>Enregistrer la remise en filière</span></button>';

  const instance = modale({
    titre: LIBELLE_SUIVI + ' — ' + bouteille.code,
    contenuHtml,
    actionsHtml
  });

  const racine = instance.racine; // la boîte créée par CET appel (jamais un sélecteur global)
  const form = racine.querySelector('#form-bsff');
  const zoneErreur = racine.querySelector('#zone-erreur-bsff');
  const champMasse = racine.querySelector('#bsff-masse');
  const boutonAnnuler = racine.querySelector('[data-action="annuler"]');

  /** Affiche un message d'erreur dans le bandeau de la modale. */
  function afficherErreur(message) {
    zoneErreur.innerHTML = '<div class="bandeau-erreur">' + ICONES.alerte
      + '<span>' + esc(message) + '</span></div>';
  }

  /** Efface le bandeau d'erreur. */
  function effacerErreur() {
    zoneErreur.innerHTML = '';
  }

  /**
   * IM-8 : annonce en direct le reliquat qui restera en stock quand
   * la masse remise saisie est inférieure au contenu de la bouteille,
   * et explique ce qu'il devient (statut déchet, garde conservée).
   */
  const zoneReliquat = racine.querySelector('#zone-reliquat-bsff');
  function majReliquat() {
    // nombreFr : accepte la virgule décimale fr-FR (« 4,20 »)
    const masse = nombreFr(champMasse.value);
    const partielle = Number.isFinite(masse) && masse > 0
      && masse < bouteille.masseNetteKg - 1e-9;
    if (!partielle) {
      zoneReliquat.innerHTML = '';
      return;
    }
    const reliquat = Math.round((bouteille.masseNetteKg - masse) * 1000) / 1000;
    zoneReliquat.innerHTML = '<div class="bandeau-avertissement">' + ICONES.alerte
      + '<span>Remise partielle : un reliquat de <strong>'
      + esc(fmtNombre(reliquat, 2)) + ' kg</strong> restera en stock, '
      + 'toujours en statut déchet (délai de garde conservé). '
      + 'Un second BSFF sera nécessaire pour le solde.</span></div>';
  }
  champMasse.addEventListener('input', majReliquat);
  majReliquat();

  boutonAnnuler.addEventListener('click', function () {
    instance.fermer();
  });

  form.addEventListener('submit', async function (evenement) {
    evenement.preventDefault();
    effacerErreur();

    const donnees = new FormData(form);
    const numeroBsff = String(donnees.get('numeroBsff') || '').trim();
    const bordereauExterne = String(donnees.get('bordereauExterne') || '').trim();
    const transporteur = String(donnees.get('transporteur') || '').trim();
    const installationDestination = String(donnees.get('installationDestination') || '').trim();
    const masseRemiseKg = nombreFr(donnees.get('masseRemiseKg'));
    const dateRemise = String(donnees.get('dateRemise') || '').trim();

    if (!numeroBsff) {
      afficherErreur('Le numéro du suivi interne est obligatoire.');
      return;
    }
    if (!transporteur) {
      afficherErreur('Le transporteur est obligatoire.');
      return;
    }
    if (!installationDestination) {
      afficherErreur('L’installation de destination est obligatoire.');
      return;
    }
    if (!Number.isFinite(masseRemiseKg) || masseRemiseKg <= 0) {
      afficherErreur('La masse remise doit être un nombre strictement positif.');
      return;
    }
    if (masseRemiseKg > bouteille.masseNetteKg + 1e-9) {
      afficherErreur('La masse remise ne peut pas dépasser le contenu de la bouteille ('
        + fmtNombre(bouteille.masseNetteKg, 2) + ' kg).');
      return;
    }

    try {
      const utilisateur = await store.getUtilisateurCourant();
      const operateur = utilisateur.prenom + ' ' + utilisateur.nom;

      const bsff = await store.createBsff({
        bouteilleId: bouteille.id,
        numeroBsff,
        bordereauExterne,
        transporteur,
        installationDestination,
        masseRemiseKg,
        dateRemise: dateRemise || undefined,
        operateur
      });

      // IM-8 : le message dit ce qu'il advient réellement de la bouteille
      const reliquatKg = Math.round(
        (bouteille.masseNetteKg - masseRemiseKg) * 1000) / 1000;
      toast(reliquatKg > 0
        ? 'Remise en filière enregistrée — reliquat de ' + fmtNombre(reliquatKg, 2)
          + ' kg conservé en stock (statut déchet).'
        : 'Remise en filière enregistrée — bouteille sortie du stock.', 'succes');

      // Après création, propose d'attacher immédiatement le bordereau
      afficherFormPiecesJointes(bsff.id);
    } catch (erreur) {
      afficherErreur(erreur.message || 'Impossible de créer ce BSFF.');
    }
  });

  /**
   * Remplace le contenu de la modale par la zone de pièces jointes
   * du suivi fraîchement créé (catégorie BORDEREAU_BSFF).
   * @param {string} bsffId
   */
  function afficherFormPiecesJointes(bsffId) {
    const corps = racine.querySelector('.modale-corps');
    const actions = racine.querySelector('.modale-actions');
    if (!corps) return;

    corps.innerHTML = '<p class="modale-intro">'
      + 'Joignez ici le <strong>bordereau dématérialisé officiel</strong> '
      + '(PDF ou photo) : c’est lui qui fait foi, pas ce suivi interne.</p>'
      + '<div id="zone-pj-bsff"></div>';
    if (actions) {
      actions.innerHTML = '<button type="button" class="btn btn-marine btn-bloc" data-action="terminer">'
        + 'Terminer</button>';
      actions.querySelector('[data-action="terminer"]').addEventListener('click', function () {
        instance.fermer();
        if (typeof ctx.rafraichir === 'function') ctx.rafraichir();
      });
    }

    zonePiecesJointes(racine.querySelector('#zone-pj-bsff'), ctx, {
      entiteType: 'BSFF',
      entiteId: bsffId,
      categorie: 'BORDEREAU_BSFF'
    });
  }
}
