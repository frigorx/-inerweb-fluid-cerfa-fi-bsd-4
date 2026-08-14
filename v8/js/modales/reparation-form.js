// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — modale « Tracer une réparation » (R3/R4)
// Trace a posteriori la réparation d'un contrôle FUITE : date
// réelle, nature, réparateur. N'affecte PAS le statut de la
// machine (le retour EN_SERVICE exige un contrôle CONFORME
// postérieur, saisi séparément). Enregistre via
// store.tracerReparation(controleId, ...).
// ============================================================

import { modale, toast, ICONES } from '../views/communs.js';
import { esc } from '../core/utils.js';

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
 * Ouvre la modale de traçage d'une réparation sur un contrôle FUITE.
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 * @param {object} controle — le contrôle FUITE concerné (déjà chargé)
 * @returns {Promise<void>}
 */
export async function ouvrirFormReparation(ctx, controle) {
  const personnel = await ctx.store.getPersonnel();
  const operateursActifs = personnel.filter(function (p) { return p.actif; });

  const optionsReparateurs = ['<option value="">— Choisir un réparateur —</option>']
    .concat(operateursActifs.map(function (p) {
      return '<option value="' + esc(p.id) + '">' + esc(p.prenom) + ' ' + esc(p.nom) + '</option>';
    })).join('');

  const contenuHtml = ''
    + '<form class="formulaire" id="form-reparation" novalidate>'

    + '<div id="zone-erreur-reparation"></div>'

    + '<p class="wizard-sens">Machine : <strong>' + esc(controle.machineLabel) + '</strong>'
    + (controle.localisationFuite
      ? ' · fuite localisée : ' + esc(controle.localisationFuite) : '')
    + '</p>'

    + '<div class="grille-form-2">'
    + '<div class="champ">'
    + '<label for="rep-date">Date de la réparation *</label>'
    + '<input type="date" id="rep-date" name="dateReparation" '
    + 'value="' + esc(aujourdHuiIso()) + '" required>'
    + '</div>'
    + '<div class="champ">'
    + '<label for="rep-reparateur">Réparateur *</label>'
    + '<select id="rep-reparateur" name="reparateurId" required>'
    + optionsReparateurs
    + '</select>'
    + '</div>'
    + '</div>'

    + '<div class="champ">'
    + '<label for="rep-nature">Nature de la réparation *</label>'
    + '<input type="text" id="rep-nature" name="natureReparation" required '
    + 'placeholder="Ex. : remplacement raccord détendeur">'
    + '</div>'

    + '<div class="wizard-bloc">'
    + '<span class="choix-detail">Cette réparation ne remet PAS automatiquement '
    + 'la machine en service : un nouveau contrôle d’étanchéité CONFORME reste '
    + 'nécessaire.</span>'
    + '</div>'

    + '</form>';

  const actionsHtml = ''
    + '<button type="button" class="btn btn-contour" data-action="annuler">Annuler</button>'
    + '<button type="submit" form="form-reparation" class="btn btn-marine">'
    + ICONES.coche + '<span>Enregistrer la réparation</span></button>';

  const instance = modale({
    titre: 'Tracer une réparation',
    contenuHtml,
    actionsHtml
  });

  const racine = instance.racine;
  const form = racine.querySelector('#form-reparation');
  const zoneErreur = racine.querySelector('#zone-erreur-reparation');
  const boutonAnnuler = racine.querySelector('[data-action="annuler"]');

  function afficherErreur(message) {
    zoneErreur.innerHTML = '<div class="bandeau-erreur">' + ICONES.alerte
      + '<span>' + esc(message) + '</span></div>';
  }

  boutonAnnuler.addEventListener('click', function () {
    instance.fermer();
  });

  form.addEventListener('submit', async function (evenement) {
    evenement.preventDefault();
    zoneErreur.innerHTML = '';

    const donnees = new FormData(form);
    const reparateurId = String(donnees.get('reparateurId') || '');
    if (!reparateurId) {
      afficherErreur('Veuillez choisir un réparateur.');
      return;
    }
    const reparateurChoisi = personnel.find(function (p) { return p.id === reparateurId; });
    const reparateurLabel = reparateurChoisi
      ? reparateurChoisi.prenom + ' ' + reparateurChoisi.nom
      : reparateurId;

    try {
      await ctx.store.tracerReparation(controle.id, {
        dateReparation: String(donnees.get('dateReparation') || ''),
        natureReparation: String(donnees.get('natureReparation') || ''),
        reparateur: reparateurLabel,
        reparateurId: reparateurId || null
      });

      toast('Réparation tracée. Un contrôle de suivi (conforme) reste '
        + 'nécessaire pour remettre la machine en service.', 'succes');
      instance.fermer();
      ctx.naviguer('controles');
    } catch (erreur) {
      afficherErreur(erreur.message || 'Impossible d’enregistrer cette réparation.');
    }
  });
}
