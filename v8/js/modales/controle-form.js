// ============================================================
// inerWeb Fluide — modale « Nouveau contrôle d'étanchéité » (Phase B)
// Formulaire de création d'un contrôle : machine, date, type,
// méthode, résultat (Conforme / Fuite), détecteur, opérateur,
// prochain contrôle. Enregistre via store.createControle(...).
// ============================================================

import { modale, toast, ICONES } from '../views/communs.js';
import { esc } from '../core/utils.js';

// Types de contrôle proposés (libellés français)
const TYPES_CONTROLE = [
  { valeur: 'PERIODIQUE', libelle: 'Périodique' },
  { valeur: 'NON_PERIODIQUE', libelle: 'Non périodique' },
  { valeur: 'APRES_REPARATION', libelle: 'Après réparation' },
  { valeur: 'MISE_EN_SERVICE', libelle: 'Mise en service' }
];

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
 * Construit la liste des options d'un <select> depuis un tableau
 * d'objets { valeur, libelle }, avec présélection éventuelle.
 * @param {{valeur: string, libelle: string}[]} options
 * @param {string|null} valeurCourante
 * @returns {string} HTML
 */
function optionsHtml(options, valeurCourante) {
  return options.map(function (opt) {
    const selectionne = opt.valeur === valeurCourante ? ' selected' : '';
    return '<option value="' + esc(opt.valeur) + '"' + selectionne + '>'
      + esc(opt.libelle) + '</option>';
  }).join('');
}

/**
 * Ouvre la modale de création d'un contrôle d'étanchéité.
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 * @param {string|null} [machineId] — machine présélectionnée
 * @returns {Promise<void>}
 */
export async function ouvrirFormControle(ctx, machineId = null) {
  const [machines, outillage, personnel] = await Promise.all([
    ctx.store.getMachines(),
    ctx.store.getOutillage(),
    ctx.store.getPersonnel()
  ]);

  const detecteurs = outillage.filter(function (o) { return o.typeOutil === 'DETECTEUR'; });
  const operateursActifs = personnel.filter(function (p) { return p.actif; });

  const optionsMachines = machines.map(function (m) {
    const selectionne = m.id === machineId ? ' selected' : '';
    return '<option value="' + esc(m.id) + '"' + selectionne + '>'
      + esc(m.designation) + '</option>';
  }).join('');

  const optionsDetecteurs = '<option value="">— Aucun —</option>'
    + detecteurs.map(function (d) {
      const suffixe = d.statut === 'EXPIRE' ? ' (étalonnage expiré)' : '';
      return '<option value="' + esc(d.id) + '" data-statut="' + esc(d.statut) + '">'
        + esc(d.marque) + ' ' + esc(d.modele) + suffixe + '</option>';
    }).join('');

  const optionsOperateurs = operateursActifs.map(function (p) {
    return '<option value="' + esc(p.id) + '">' + esc(p.prenom) + ' ' + esc(p.nom) + '</option>';
  }).join('');

  const contenuHtml = ''
    + '<form class="formulaire" id="form-nouveau-controle" novalidate>'

    + '<div id="zone-erreur-controle"></div>'

    + '<div class="champ">'
    + '<label for="ctl-machine">Machine *</label>'
    + '<select id="ctl-machine" name="machineId" required>'
    + '<option value="">— Choisir une machine —</option>'
    + optionsMachines
    + '</select>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ">'
    + '<label for="ctl-date">Date *</label>'
    + '<input type="date" id="ctl-date" name="date" value="' + esc(aujourdHuiIso()) + '" required>'
    + '</div>'
    + '<div class="champ">'
    + '<label for="ctl-type">Type de contrôle *</label>'
    + '<select id="ctl-type" name="typeControle" required>'
    + optionsHtml(TYPES_CONTROLE, 'PERIODIQUE')
    + '</select>'
    + '</div>'
    + '</div>'

    + '<div class="champ">'
    + '<label for="ctl-methode">Méthode *</label>'
    + '<select id="ctl-methode" name="methode" required>'
    + '<option value="DIRECTE">Directe</option>'
    + '<option value="INDIRECTE">Indirecte</option>'
    + '</select>'
    + '</div>'

    + '<div class="champ">'
    + '<label>Résultat *</label>'
    + '<div class="grille-form-2">'
    + '<button type="button" class="carte-choix selectionnee" data-resultat="CONFORME">'
    + '<strong>Conforme</strong>'
    + '<span>Aucune fuite détectée</span>'
    + '</button>'
    + '<button type="button" class="carte-choix" data-resultat="FUITE">'
    + '<strong>Fuite détectée</strong>'
    + '<span>Fuite constatée sur l’équipement</span>'
    + '</button>'
    + '</div>'
    + '<input type="hidden" id="ctl-resultat" name="resultat" value="CONFORME">'
    + '</div>'

    + '<div id="zone-details-fuite" style="display:none">'
    + '<div class="grille-form-2">'
    + '<div class="champ">'
    + '<label for="ctl-localisation-fuite">Localisation de la fuite</label>'
    + '<input type="text" id="ctl-localisation-fuite" name="localisationFuite" '
    + 'placeholder="Ex. : raccord détendeur">'
    + '</div>'
    + '<div class="champ">'
    + '<label for="ctl-reparation-immediate">Réparation</label>'
    + '<label style="display:flex;align-items:center;gap:8px;font-weight:400;'
    + 'text-transform:none;letter-spacing:normal;font-size:14px;color:var(--texte)">'
    + '<input type="checkbox" id="ctl-reparation-immediate" name="reparationImmediate">'
    + 'Réparation immédiate'
    + '</label>'
    + '</div>'
    + '</div>'
    + '</div>'

    + '<div class="champ">'
    + '<label for="ctl-detecteur">Détecteur utilisé</label>'
    + '<select id="ctl-detecteur" name="detecteurId">'
    + optionsDetecteurs
    + '</select>'
    + '<div id="zone-avertissement-detecteur"></div>'
    + '</div>'

    + '<div class="champ">'
    + '<label for="ctl-operateur">Opérateur *</label>'
    + '<select id="ctl-operateur" name="operateurId" required>'
    + '<option value="">— Choisir un opérateur —</option>'
    + optionsOperateurs
    + '</select>'
    + '</div>'

    + '<div class="champ">'
    + '<label for="ctl-prochain">Prochain contrôle</label>'
    + '<input type="date" id="ctl-prochain" name="prochainControle">'
    + '<span class="champ-erreur" style="color:var(--texte-faible)">'
    + 'Aide : périodicité réglementaire selon la charge en teq CO2 (12, 6 ou 3 mois).</span>'
    + '</div>'

    + '</form>';

  const actionsHtml = ''
    + '<button type="button" class="btn btn-contour" data-action="annuler">Annuler</button>'
    + '<button type="submit" form="form-nouveau-controle" class="btn btn-marine">'
    + ICONES.coche + '<span>Enregistrer</span></button>';

  const instance = modale({
    titre: 'Nouveau contrôle d’étanchéité',
    contenuHtml,
    actionsHtml
  });

  const racine = document.getElementById('zone-modales') || document.body;
  const form = racine.querySelector('#form-nouveau-controle');
  const zoneErreur = racine.querySelector('#zone-erreur-controle');
  const zoneAvertissementDetecteur = racine.querySelector('#zone-avertissement-detecteur');
  const zoneDetailsFuite = racine.querySelector('#zone-details-fuite');
  const champResultat = racine.querySelector('#ctl-resultat');
  const selectDetecteur = racine.querySelector('#ctl-detecteur');
  const boutonAnnuler = racine.querySelector('[data-action="annuler"]');

  /**
   * Affiche un message d'erreur dans le bandeau de la modale.
   * @param {string} message
   */
  function afficherErreur(message) {
    zoneErreur.innerHTML = '<div class="bandeau-erreur">' + ICONES.alerte
      + '<span>' + esc(message) + '</span></div>';
  }

  /** Efface le bandeau d'erreur. */
  function effacerErreur() {
    zoneErreur.innerHTML = '';
  }

  /** Bascule l'affichage des champs propres à une fuite. */
  function mettreAJourAffichageFuite() {
    zoneDetailsFuite.style.display = champResultat.value === 'FUITE' ? '' : 'none';
  }

  /** Affiche un avertissement si le détecteur choisi est hors étalonnage. */
  function mettreAJourAvertissementDetecteur() {
    const optionChoisie = selectDetecteur.selectedOptions[0];
    const statut = optionChoisie ? optionChoisie.getAttribute('data-statut') : null;
    if (statut === 'EXPIRE') {
      zoneAvertissementDetecteur.innerHTML = '<div class="bandeau-avertissement">' + ICONES.alerte
        + '<span>Ce détecteur a un étalonnage expiré. Le contrôle reste enregistrable, '
        + 'mais son résultat doit être confirmé dès que possible.</span></div>';
    } else {
      zoneAvertissementDetecteur.innerHTML = '';
    }
  }

  // Sélection Conforme / Fuite : deux cartes exclusives
  racine.querySelectorAll('.carte-choix[data-resultat]').forEach(function (carte) {
    carte.addEventListener('click', function () {
      racine.querySelectorAll('.carte-choix[data-resultat]').forEach(function (autre) {
        autre.classList.remove('selectionnee');
      });
      carte.classList.add('selectionnee');
      champResultat.value = carte.getAttribute('data-resultat');
      mettreAJourAffichageFuite();
    });
  });

  selectDetecteur.addEventListener('change', mettreAJourAvertissementDetecteur);
  mettreAJourAvertissementDetecteur();

  boutonAnnuler.addEventListener('click', function () {
    instance.fermer();
  });

  form.addEventListener('submit', async function (evenement) {
    evenement.preventDefault();
    effacerErreur();

    const donnees = new FormData(form);
    const machineIdChoisie = String(donnees.get('machineId') || '');
    const operateurId = String(donnees.get('operateurId') || '');

    if (!machineIdChoisie) {
      afficherErreur('Veuillez choisir une machine.');
      return;
    }
    if (!operateurId) {
      afficherErreur('Veuillez choisir un opérateur.');
      return;
    }

    const operateurChoisi = personnel.find(function (p) { return p.id === operateurId; });
    const operateurLabel = operateurChoisi
      ? operateurChoisi.prenom + ' ' + operateurChoisi.nom
      : operateurId;

    try {
      await ctx.store.createControle({
        machineId: machineIdChoisie,
        date: String(donnees.get('date') || ''),
        typeControle: String(donnees.get('typeControle') || 'PERIODIQUE'),
        methode: String(donnees.get('methode') || 'DIRECTE'),
        resultat: String(donnees.get('resultat') || 'CONFORME'),
        localisationFuite: String(donnees.get('localisationFuite') || '') || null,
        reparationImmediate: donnees.get('reparationImmediate') === 'on',
        detecteurId: String(donnees.get('detecteurId') || '') || null,
        operateur: operateurLabel,
        operateurId: operateurId || null,
        prochainControle: String(donnees.get('prochainControle') || '') || null
      });

      toast('Contrôle d’étanchéité enregistré.', 'succes');
      instance.fermer();
      ctx.naviguer('controles');
    } catch (erreur) {
      afficherErreur(erreur.message || 'Impossible d’enregistrer ce contrôle.');
    }
  });
}
