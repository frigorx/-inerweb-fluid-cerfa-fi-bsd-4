// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — modale « Créer / Modifier une machine »
// Phase B : formulaire de saisie conforme charte (.formulaire /
// .champ / .grille-form-2), validation en direct, appel au store.
// ============================================================

import { modale, toast } from '../views/communs.js';
import { esc, nombreFr, fluidesProposables, fmtDate } from '../core/utils.js';
// P1-1 : la nature de l'équipement commande ses obligations (sous-type
// mobile listé, étiquette hermétique, vérification de la détection).
import { SOUS_TYPES_MOBILES, LIBELLE_SOUS_TYPE, detectionEffective,
  USAGES_THERMIQUES, LIBELLE_USAGE_THERMIQUE }
  from '../data/equipement.js';
import { familleDuType, codeSite, genererCodeMachine, normaliserCodeMachine, validerCodeMachine }
  from '../data/code-machine.js';

// Types de machine proposés au choix (libellés métier, valeurs libres en base)
const TYPES_MACHINE = [
  'Chambre froide',
  'Vitrine réfrigérée',
  'PAC (Pompe à chaleur)',
  'Monosplit',
  'Multisplit',
  'Centrale',
  'Autre'
];

/**
 * Construit les <option> d'un select à partir d'une liste de valeurs.
 * @param {string[]} valeurs
 * @param {string} valeurCourante
 * @returns {string} HTML
 */
function optionsSimples(valeurs, valeurCourante) {
  return valeurs.map(function (v) {
    const selectionne = v === valeurCourante ? ' selected' : '';
    return '<option value="' + esc(v) + '"' + selectionne + '>' + esc(v) + '</option>';
  }).join('');
}

// ------------------------------------------------------------
// ⭐ B1 (25/07) — L'ÉCRAN SUIT LA RÈGLE DU STORE.
// La garde qui COMPTE est côté serveur (garderQualificationMachine, aux
// deux portes). Ici on évite le PIÈGE ERGONOMIQUE déjà payé par la revue
// L2 : fermer l'API sans toucher à l'écran, c'est laisser l'élève remplir
// tout le bloc « Nature de l'équipement » pour prendre un 403 à la fin —
// l'écran devient MORT pour lui. Patron repris de views/fluides.js
// (gestes réservés via getUtilisateurCourant). Le store de démo répond
// « référent » : la démo reste pleinement utilisable.
// ------------------------------------------------------------
const ROLES_QUALIFICATION = ['REFERENT', 'ENSEIGNANT', 'ADMIN'];

/** L'utilisateur courant peut-il qualifier un équipement ? */
export function peutQualifierEquipement(utilisateur) {
  return ROLES_QUALIFICATION.includes(utilisateur && utilisateur.roleApp);
}

/**
 * Champs de qualification portés par CET ÉCRAN.
 * ⚠️ SOUS-ENSEMBLE ASSUMÉ de la liste serveur CHAMPS_QUALIFICATION_MACHINE
 * (server/api.js), qui en compte trois de plus : `statut` (les gestes
 * dédiés arreterMachine / demantelerMachine le portent) et les deux dates
 * `dernierControle` / `prochainControle` (elles viennent du moteur, pas de
 * ce formulaire). Ce formulaire ne les émet PAS — vérifié : aucune
 * occurrence dans ce fichier. Ne pas « aligner » cette liste sur les neuf
 * champs serveur : filtrer un champ jamais émis n'ajoute rien, et laisserait
 * croire que l'écran les porte.
 */
const CHAMPS_QUALIFICATION_ECRAN = ['typeInstallation',
  'sousTypeInstallation', 'hermetiqueScelle', 'hermetiqueEtiquete',
  'residentiel', 'usageThermique'];

/**
 * Retire de la charge utile les champs de qualification quand
 * l'utilisateur n'y a pas droit. On les OMET (undefined) : on ne renvoie
 * PAS une valeur par défaut. Un contrôle désactivé ne figure pas dans le
 * FormData — renvoyer « FIXE » sur une machine MOBILE ferait voir un
 * changement au store et vaudrait justement le 403 qu'on veut éviter.
 * @param {object} valeurs — sortie de validerFormulaire
 * @param {boolean} peutQualifier
 * @returns {object} charge utile filtrée
 */
export function filtrerQualification(valeurs, peutQualifier) {
  if (peutQualifier) return valeurs;
  const filtre = Object.assign({}, valeurs);
  CHAMPS_QUALIFICATION_ECRAN.forEach(function (champ) {
    delete filtre[champ];
  });
  return filtre;
}

/**
 * Construit le HTML du formulaire (mêmes valeurs qu'à l'ouverture ;
 * les erreurs de champ sont ajoutées/retirées dynamiquement ensuite).
 * @param {object} machine — valeurs courantes (vide en création)
 * @param {object[]} fluides — référentiel des fluides
 * @param {object[]} clients — référentiel des clients / détenteurs
 * @returns {string} HTML
 */
export function gabaritFormulaire(machine, fluides, clients,
  peutQualifier = true) {
  // ⭐ B1 — bloc « Nature de l'équipement », type d'installation et usage
  // thermique : AFFICHÉS pour tout le monde (la fiche doit rester lisible),
  // modifiables par le seul responsable.
  const verrou = peutQualifier ? '' : ' disabled';
  const noteReservee = peutQualifier ? ''
    : '<p class="mf-note mf-reservee">Caractéristiques réservées au '
      + 'responsable (référent, enseignant, administrateur) : elles '
      + 'déplacent des seuils réglementaires et se constatent sur la '
      + 'plaque de l’équipement. Elles restent affichées, elles ne sont '
      + 'pas modifiables ici.</p>';
  // P1-2 : les fluides DÉSACTIVÉS ne sont plus proposés — sauf celui déjà
  // enregistré sur cette machine (rouvrir une vieille machine au R-22 ne
  // doit pas vider son fluide en silence).
  const proposables = fluidesProposables(fluides, machine.fluide ?? null);
  const optionsFluides = '<option value="">— Sélectionner —</option>'
    + proposables.map(function (f) {
        const selectionne = f.code === machine.fluide ? ' selected' : '';
        return '<option value="' + esc(f.code) + '"' + selectionne + '>'
          + esc(f.code) + ' · ' + esc(f.famille) + '</option>';
      }).join('');

  const optionsClients = '<option value="">— Aucun —</option>'
    + clients.map(function (c) {
        const selectionne = c.id === machine.clientId ? ' selected' : '';
        return '<option value="' + esc(c.id) + '"' + selectionne + '>' + esc(c.raisonSociale) + '</option>';
      }).join('');

  return '<form id="form-machine" class="formulaire" novalidate>'

    + '<div id="bandeau-erreur-machine" class="bandeau-erreur" hidden></div>'

    + '<div class="champ" data-champ="designation">'
    + '<label for="mf-designation">Désignation *</label>'
    + '<input type="text" id="mf-designation" name="designation" maxlength="120" '
    + 'value="' + esc(machine.designation || '') + '" placeholder="Ex. Chambre froide cuisine">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="type">'
    + '<label for="mf-type">Type *</label>'
    + '<select id="mf-type" name="type">'
    + '<option value="">— Sélectionner —</option>'
    + optionsSimples(TYPES_MACHINE, machine.type || '')
    + '</select>'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="champ" data-champ="code">'
    + '<label for="mf-code">Code machine</label>'
    + '<input type="text" id="mf-code" name="code" maxlength="24" '
    + 'value="' + esc(machine.code || '') + '" placeholder="Ex. JR-CF-001">'
    + '<span class="champ-aide" style="display:block;margin-top:4px;font-size:12px;'
    + 'font-weight:400;text-transform:none;letter-spacing:normal;color:var(--texte-2);">'
    + 'Identifiant atelier lisible (site-famille-numéro). Proposé automatiquement, modifiable.'
    + '</span>'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'
    + '</div>'

    + '<div class="champ" data-champ="fluide">'
    + '<label for="mf-fluide">Fluide *</label>'
    + '<select id="mf-fluide" name="fluide">' + optionsFluides + '</select>'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="marque">'
    + '<label for="mf-marque">Marque</label>'
    + '<input type="text" id="mf-marque" name="marque" maxlength="80" value="' + esc(machine.marque || '') + '">'
    + '</div>'

    + '<div class="champ" data-champ="modele">'
    + '<label for="mf-modele">Modèle</label>'
    + '<input type="text" id="mf-modele" name="modele" maxlength="80" value="' + esc(machine.modele || '') + '">'
    + '</div>'
    + '</div>'

    + '<div class="champ" data-champ="numSerie">'
    + '<label for="mf-num-serie">N° de série</label>'
    + '<input type="text" id="mf-num-serie" name="numSerie" maxlength="80" value="' + esc(machine.numSerie || '') + '">'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ champ-unite" data-unite="kg" data-champ="chargeNominaleKg">'
    + '<label for="mf-charge-nominale">Charge nominale *</label>'
    + '<input type="number" id="mf-charge-nominale" name="chargeNominaleKg" step="0.01" min="0" '
    + 'value="' + esc(machine.chargeNominaleKg ?? '') + '">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="champ champ-unite" data-unite="kg" data-champ="chargeActuelleKg">'
    + '<label for="mf-charge-actuelle">Charge actuelle</label>'
    + '<input type="number" id="mf-charge-actuelle" name="chargeActuelleKg" step="0.01" min="0" '
    + 'value="' + esc(machine.chargeActuelleKg ?? 0) + '">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="localisation">'
    + '<label for="mf-localisation">Localisation</label>'
    + '<input type="text" id="mf-localisation" name="localisation" maxlength="120" '
    + 'value="' + esc(machine.localisation || '') + '" placeholder="Ex. Cuisine — sous-sol">'
    + '</div>'

    + '<div class="champ" data-champ="clientId">'
    + '<label for="mf-client">Détenteur</label>'
    + '<select id="mf-client" name="clientId">' + optionsClients + '</select>'
    + '</div>'
    + '</div>'

    + '<div class="champ" data-champ="typeInstallation">'
    + '<label for="mf-type-installation">Type d\u2019installation</label>'
    + '<select id="mf-type-installation" name="typeInstallation"' + verrou + '>'
    + [['FIXE', 'Fixe (contr\u00f4le de suivi apr\u00e8s 24 h de fonctionnement)'],
       ['MOBILE', 'Mobile (contr\u00f4le imm\u00e9diat si le sous-type est list\u00e9)']]
      .map(function (o) {
        const selectionne = (machine.typeInstallation || 'FIXE') === o[0]
          ? ' selected' : '';
        return '<option value="' + o[0] + '"' + selectionne + '>'
          + esc(o[1]) + '</option>';
      }).join('')
    + '</select>'
    + '</div>'

    // P1-1 (E5) : le sous-type ne concerne que les MOBILES et conditionne
    // l'exception du contrôle immédiat. Masqué pour un FIXE (voir plus bas).
    + '<div class="champ" data-champ="sousTypeInstallation" id="mf-bloc-sous-type">'
    + '<label for="mf-sous-type">Nature de l’équipement mobile</label>'
    + '<select id="mf-sous-type" name="sousTypeInstallation"' + verrou + '>'
    + '<option value="">— non précisée —</option>'
    + SOUS_TYPES_MOBILES.map(function (s) {
        const selectionne = machine.sousTypeInstallation === s ? ' selected' : '';
        return '<option value="' + s + '"' + selectionne + '>'
          + esc(LIBELLE_SOUS_TYPE[s]) + '</option>';
      }).join('')
    + '</select>'
    + '<p class="mf-note">Seuls les équipements mobiles <strong>listés</strong> '
    + 'peuvent être recontrôlés le jour même de la réparation. '
    + '« Autre » et « non précisée » n’ouvrent pas ce droit.</p>'
    + '</div>'

    + '<div class="champ" data-champ="dateMiseEnService">'
    + '<label for="mf-date-mes">Date de mise en service</label>'
    + '<input type="date" id="mf-date-mes" name="dateMiseEnService" '
    + 'value="' + esc(machine.dateMiseEnService || '') + '">'
    + '</div>'

    // P1-1 — nature de l'équipement (hermétique, étiquette, résidentiel).
    + '<fieldset class="mf-bloc">'
    + '<legend>Nature de l’équipement</legend>'
    + noteReservee
    + '<label class="mf-case"><input type="checkbox" id="mf-hermetique" '
    + 'name="hermetiqueScelle"' + (machine.hermetiqueScelle ? ' checked' : '')
    + verrou + '> Hermétiquement scellé</label>'
    + '<label class="mf-case"><input type="checkbox" id="mf-hermetique-etiq" '
    + 'name="hermetiqueEtiquete"'
    + (machine.hermetiqueEtiquete ? ' checked' : '') + verrou
    + '> Étiqueté « hermétiquement scellé »</label>'
    + '<label class="mf-case"><input type="checkbox" id="mf-residentiel" '
    + 'name="residentiel"' + (machine.residentiel ? ' checked' : '') + verrou
    + '> Usage résidentiel</label>'
    // L3/R4 (25/07) : l'usage thermique commande les DATES d'interdiction
    // du fluide vierge à PRP >= 2500 (froid 2025, clim/PAC 2026). Non
    // renseigné = régime le plus strict — la note le DIT.
    + '<div class="champ" data-champ="usageThermique">'
    + '<label for="mf-usage">Usage thermique</label>'
    + '<select id="mf-usage" name="usageThermique"' + verrou + '>'
    + '<option value="">— non renseigné (régime le plus strict : froid, '
    + 'vierge interdit depuis 2025) —</option>'
    + USAGES_THERMIQUES.map(function (u) {
      return '<option value="' + u + '"'
        + (machine.usageThermique === u ? ' selected' : '') + '>'
        + esc(LIBELLE_USAGE_THERMIQUE[u]) + '</option>';
    }).join('')
    + '</select>'
    + '</div>'
    + '<p class="mf-note">Pour un fluide à PRP ≥ 2 500 (R-404A…), la '
    + 'maintenance au fluide VIERGE est interdite depuis le 01/01/2025 en '
    + 'froid, depuis le 01/01/2026 en climatisation et pompe à chaleur.</p>'
    + '<p class="mf-note">L’étiquette compte : seul un hermétique '
    + '<strong>marqué comme tel</strong> ouvre le seuil d’aptitude '
    + 'élargi (6 kg au lieu de 3) — pour les catégories du régime 2025 '
    + 'seulement ; une ancienne catégorie II (2008) reste bornée à 2 kg '
    + 'en toutes circonstances.</p>'
    + '</fieldset>'

    // P1-1 (E1) — détection de fuites : déclaration ET vérification.
    + '<fieldset class="mf-bloc">'
    + '<legend>Détection de fuites</legend>'
    + '<label class="mf-case"><input type="checkbox" id="mf-detection" '
    + 'name="detectionPermanente"'
    + (machine.detectionPermanente ? ' checked' : '')
    + '> Système de détection permanente installé</label>'
    + '<div id="mf-bloc-detection">'
    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="detectionVerifieeLe">'
    + '<label for="mf-detection-verif">Vérifié le</label>'
    + '<input type="date" id="mf-detection-verif" name="detectionVerifieeLe" '
    + 'value="' + esc(machine.detectionVerifieeLe || '') + '">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'
    + '<div class="champ" data-champ="detectionReference">'
    + '<label for="mf-detection-ref">Référence / intervenant</label>'
    + '<input type="text" id="mf-detection-ref" name="detectionReference" '
    + 'maxlength="120" value="' + esc(machine.detectionReference || '') + '" '
    + 'placeholder="Ex. SAV Daikin — bon n° 4412">'
    + '</div>'
    + '</div>'
    + '<p class="mf-note" id="mf-note-detection"></p>'
    + '</div>'
    + '</fieldset>'

    + '</form>'

    + '<style>'
    + '.mf-note{margin:5px 0 0;font-size:11.5px;color:var(--texte-3);line-height:1.45}'
    + '.mf-reservee{margin:0 0 8px;font-weight:600;color:var(--texte-2)}'
    + '.mf-bloc{border:1px solid var(--bordure-2);border-radius:8px;'
    + 'padding:12px 14px;margin:0 0 14px}'
    + '.mf-bloc legend{font-size:12px;font-weight:600;color:var(--texte-2);padding:0 6px}'
    + '.mf-case{display:flex;align-items:center;gap:8px;font-size:13px;'
    + 'color:var(--texte-2);margin:6px 0;cursor:pointer}'
    + '.mf-case input{width:16px;height:16px}'
    + '</style>';
}

/**
 * Affiche un message d'erreur sous un champ et marque le conteneur invalide.
 * @param {HTMLElement} racine — racine du formulaire
 * @param {string} nomChamp — clé data-champ
 * @param {string} message
 */
function marquerErreur(racine, nomChamp, message) {
  const champ = racine.querySelector('[data-champ="' + nomChamp + '"]');
  if (!champ) return;
  champ.classList.add('invalide');
  const erreur = champ.querySelector('.champ-erreur');
  if (erreur) {
    erreur.textContent = message;
    erreur.hidden = false;
  }
}

/**
 * Efface l'erreur d'un champ (saisie corrigée).
 * @param {HTMLElement} racine
 * @param {string} nomChamp
 */
function effacerErreur(racine, nomChamp) {
  const champ = racine.querySelector('[data-champ="' + nomChamp + '"]');
  if (!champ) return;
  champ.classList.remove('invalide');
  const erreur = champ.querySelector('.champ-erreur');
  if (erreur) {
    erreur.textContent = '';
    erreur.hidden = true;
  }
}

/**
 * Valide le formulaire en direct. Retourne les valeurs si tout est correct,
 * sinon affiche les erreurs de champ et retourne null.
 * @param {HTMLElement} racine
 * @param {boolean} enModification — en modification, le code machine est obligatoire
 * @returns {object|null}
 */
function validerFormulaire(racine, enModification) {
  const form = racine.querySelector('#form-machine');
  const donnees = new FormData(form);
  let valide = true;

  ['designation', 'type', 'fluide', 'chargeNominaleKg', 'chargeActuelleKg', 'code'].forEach(function (nom) {
    effacerErreur(racine, nom);
  });

  const designation = String(donnees.get('designation') || '').trim();
  if (!designation) {
    marquerErreur(racine, 'designation', 'La désignation est obligatoire.');
    valide = false;
  }

  const type = String(donnees.get('type') || '').trim();
  if (!type) {
    marquerErreur(racine, 'type', 'Le type de machine est obligatoire.');
    valide = false;
  }

  const fluide = String(donnees.get('fluide') || '').trim();
  if (!fluide) {
    marquerErreur(racine, 'fluide', 'Le fluide est obligatoire.');
    valide = false;
  }

  const chargeNominaleTexte = String(donnees.get('chargeNominaleKg') || '').trim();
  // nombreFr : accepte « 2,40 » (virgule décimale fr-FR) comme « 2.40 »
  const chargeNominaleKg = nombreFr(chargeNominaleTexte);
  // Même règle que le store : charge nominale strictement positive
  if (!chargeNominaleTexte || !Number.isFinite(chargeNominaleKg) || chargeNominaleKg <= 0) {
    marquerErreur(racine, 'chargeNominaleKg', 'Indiquez une charge nominale en kg, strictement positive.');
    valide = false;
  }

  const chargeActuelleTexte = String(donnees.get('chargeActuelleKg') || '').trim();
  const chargeActuelleKg = chargeActuelleTexte === '' ? 0 : nombreFr(chargeActuelleTexte);
  if (!Number.isFinite(chargeActuelleKg) || chargeActuelleKg < 0) {
    marquerErreur(racine, 'chargeActuelleKg', 'La charge actuelle doit être un nombre positif ou nul.');
    valide = false;
  } else if (Number.isFinite(chargeNominaleKg) && chargeActuelleKg > chargeNominaleKg) {
    marquerErreur(racine, 'chargeActuelleKg', 'La charge actuelle ne peut pas dépasser la charge nominale.');
    valide = false;
  }

  // Code machine : obligatoire en modification, facultatif en création
  // (un code vide en création est complété par le store, qui hérite « M# »).
  const codeBrut = String(donnees.get('code') || '').trim();
  if (enModification && !codeBrut) {
    marquerErreur(racine, 'code', 'Le code machine est obligatoire.');
    valide = false;
  } else if (codeBrut) {
    const erreurCode = validerCodeMachine(normaliserCodeMachine(codeBrut));
    if (erreurCode) {
      marquerErreur(racine, 'code', erreurCode);
      valide = false;
    }
  }

  if (!valide) return null;

  const marque = String(donnees.get('marque') || '').trim();
  const modele = String(donnees.get('modele') || '').trim();
  const numSerie = String(donnees.get('numSerie') || '').trim();
  const localisation = String(donnees.get('localisation') || '').trim();
  const clientId = String(donnees.get('clientId') || '').trim();
  const dateMiseEnService = String(donnees.get('dateMiseEnService') || '').trim();

  return {
    designation: designation,
    type: type,
    code: codeBrut,
    marque: marque || null,
    modele: modele || null,
    numSerie: numSerie || null,
    fluide: fluide,
    chargeNominaleKg: chargeNominaleKg,
    chargeActuelleKg: chargeActuelleKg,
    clientId: clientId || null,
    localisation: localisation || null,
    dateMiseEnService: dateMiseEnService || null,
    typeInstallation: donnees.get('typeInstallation') || 'FIXE',
    detectionPermanente: donnees.get('detectionPermanente') === 'on',
    // P1-1 — modèle d'équipement. Le sous-type n'est transmis que pour un
    // MOBILE (le store refuserait un sous-type sur un FIXE) ; la date de
    // vérification n'est transmise que si un système est déclaré (même
    // motif). Chaîne vide = effacement côté store.
    sousTypeInstallation:
      (donnees.get('typeInstallation') || 'FIXE') === 'MOBILE'
        ? String(donnees.get('sousTypeInstallation') || '') : '',
    hermetiqueScelle: donnees.get('hermetiqueScelle') === 'on',
    hermetiqueEtiquete: donnees.get('hermetiqueScelle') === 'on'
      && donnees.get('hermetiqueEtiquete') === 'on',
    residentiel: donnees.get('residentiel') === 'on',
    // L3/R4 : chaîne vide = effacement (retour au régime le plus strict).
    usageThermique: String(donnees.get('usageThermique') || ''),
    detectionVerifieeLe: donnees.get('detectionPermanente') === 'on'
      ? String(donnees.get('detectionVerifieeLe') || '') : '',
    detectionReference: donnees.get('detectionPermanente') === 'on'
      ? String(donnees.get('detectionReference') || '') : ''
  };
}

/**
 * Ouvre la modale de création ou de modification d'une machine.
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 * @param {string|null} [machineId=null] — identifiant à modifier, ou null pour créer
 * @returns {Promise<string|boolean>} résolue à la fermeture :
 *   - en CRÉATION réussie : l'identifiant (string) de la machine créée ;
 *   - en MODIFICATION réussie : true ;
 *   - sinon (annulation, fermeture sans enregistrement) : false.
 *   Les appelants historiques testent la valeur comme un booléen
 *   (un id de création est truthy) : le contrat reste rétrocompatible,
 *   et le wizard récupère en plus l'id pour présélectionner la machine.
 */
export async function ouvrirFormMachine(ctx, machineId = null, preset = null) {
  const enModification = Boolean(machineId);

  // machines + établissement chargés dans tous les cas : nécessaires à la
  // proposition automatique de code machine (genererCodeMachine) en création.
  const [machines, fluides, clients, etablissement] = await Promise.all([
    ctx.store.getMachines(),
    ctx.store.getFluides(),
    ctx.store.getClients(),
    ctx.store.getEtablissement()
  ]);
  let utilisateur = null;
  try {
    utilisateur = await ctx.store.getUtilisateurCourant();
  } catch {
    // Aucun utilisateur courant : la modale reste utilisable en dégradé
  }
  // ⭐ B1 — l'utilisateur courant était déjà lu ici, et INUTILISÉ.
  const peutQualifier = peutQualifierEquipement(utilisateur);

  const machineExistante = enModification
    ? machines.find(function (m) { return m.id === machineId; })
    : null;

  if (enModification && !machineExistante) {
    toast('Machine introuvable : impossible de la modifier.', 'erreur');
    return;
  }

  // À la création, un pré-réglage optionnel { clientId } présélectionne le
  // détenteur (ouverture depuis la fiche client « Ajouter une machine »).
  const valeursInitiales = machineExistante || { ...(preset || {}) };

  // Proposition automatique de code machine, en création seulement
  // (l'utilisateur peut la modifier avant enregistrement).
  if (!enModification) {
    const site = codeSite((etablissement && etablissement.raisonSociale) || '');
    const famille = familleDuType(valeursInitiales.type || '');
    valeursInitiales.code = genererCodeMachine(machines, site, famille);
  }

  return new Promise(function (resoudre) {
    const { fermer, racine } = modale({
      titre: enModification ? 'Modifier la machine' : 'Ajouter une machine',
      contenuHtml: gabaritFormulaire(valeursInitiales, fluides, clients,
        peutQualifier),
      actionsHtml:
        '<button type="button" id="mf-annuler" class="btn btn-secondaire">Annuler</button>'
        + '<button type="button" id="mf-enregistrer" class="btn btn-primaire">Enregistrer</button>'
    });
    const bandeauErreur = racine.querySelector('#bandeau-erreur-machine');

    function masquerBandeau() {
      bandeauErreur.hidden = true;
      bandeauErreur.textContent = '';
    }

    function afficherBandeau(message) {
      bandeauErreur.textContent = message;
      bandeauErreur.hidden = false;
    }

    // Validation en direct à la saisie / au changement
    ['mf-designation', 'mf-type', 'mf-fluide', 'mf-charge-nominale', 'mf-charge-actuelle', 'mf-code'].forEach(function (id) {
      const champ = racine.querySelector('#' + id);
      if (champ) {
        champ.addEventListener('input', function () { validerFormulaire(racine, enModification); masquerBandeau(); });
        champ.addEventListener('change', function () { validerFormulaire(racine, enModification); masquerBandeau(); });
      }
    });

    // Proposition automatique du code machine (création seulement) : tant que
    // l'utilisateur n'a pas modifié le champ à la main, on le régénère à
    // chaque changement de type (la famille dépend du type de machine).
    if (!enModification) {
      const champCode = racine.querySelector('#mf-code');
      const champType = racine.querySelector('#mf-type');
      let codeTouche = false;
      if (champCode) {
        champCode.addEventListener('input', function () { codeTouche = true; });
      }
      if (champType && champCode) {
        champType.addEventListener('change', function () {
          if (codeTouche) return;
          const site = codeSite((etablissement && etablissement.raisonSociale) || '');
          const famille = familleDuType(champType.value);
          champCode.value = genererCodeMachine(machines, site, famille);
        });
      }
    }

    // P1-1 — l'écran DIT ce que la saisie déclenche, au lieu de laisser
    // découvrir un refus ou un changement de fréquence après coup :
    //  · le sous-type n'apparaît que pour un MOBILE ;
    //  · les champs de vérification n'apparaissent que si un système est
    //    déclaré ;
    //  · l'état de la détection (échéance, allègement) est écrit en clair.
    const blocSousType = racine.querySelector('#mf-bloc-sous-type');
    const blocDetection = racine.querySelector('#mf-bloc-detection');
    const noteDetection = racine.querySelector('#mf-note-detection');
    const champTypeInstall = racine.querySelector('#mf-type-installation');
    const champDetection = racine.querySelector('#mf-detection');
    const champVerif = racine.querySelector('#mf-detection-verif');
    const champHermetique = racine.querySelector('#mf-hermetique');
    const champEtiquette = racine.querySelector('#mf-hermetique-etiq');

    function rafraichirEquipement() {
      if (blocSousType) {
        blocSousType.hidden = champTypeInstall.value !== 'MOBILE';
      }
      if (blocDetection) blocDetection.hidden = !champDetection.checked;
      // L'étiquette n'a de sens que sur un hermétique (le store refuse
      // l'inverse) : on la neutralise plutôt que de laisser cocher.
      // ⭐ B1 — ne JAMAIS ré-ouvrir l'étiquette à qui ne qualifie pas : ce
      // rafraîchissement repositionne `disabled` à chaque changement.
      if (champEtiquette) {
        champEtiquette.disabled = !peutQualifier || !champHermetique.checked;
        if (!champHermetique.checked && peutQualifier) {
          champEtiquette.checked = false;
        }
      }
      if (!noteDetection) return;
      if (!champDetection.checked) {
        noteDetection.textContent = '';
        return;
      }
      const jour = new Date().toISOString().slice(0, 10);
      const etat = detectionEffective({ detectionPermanente: true,
        detectionVerifieeLe: champVerif.value || null }, jour);
      if (etat.motif === 'JAMAIS_VERIFIEE') {
        noteDetection.textContent = 'Aucune vérification enregistrée : la '
          + 'fréquence de contrôle n’est PAS allégée tant que la '
          + 'vérification n’est pas saisie.';
      } else if (etat.compte) {
        noteDetection.textContent = 'Vérification valable jusqu’au '
          + fmtDate(etat.echeance)
          + ' : la fréquence de contrôle est allégée (÷ 2) jusqu’à cette date.';
      } else {
        noteDetection.textContent = 'Vérification échue le '
          + fmtDate(etat.echeance)
          + ' : la fréquence de contrôle n’est plus allégée.';
      }
    }
    [champTypeInstall, champDetection, champVerif, champHermetique]
      .forEach(function (champ) {
        if (!champ) return;
        champ.addEventListener('change', rafraichirEquipement);
        champ.addEventListener('input', rafraichirEquipement);
      });
    rafraichirEquipement();

    let fermeeParEnregistrement = false;
    // Identifiant de la machine CRÉÉE (reste null en modification / annulation) :
    // permet au wizard de présélectionner la machine à la volée.
    let idMachineCreee = null;

    racine.querySelector('#mf-annuler').addEventListener('click', function () {
      fermer();
    });

    racine.querySelector('#mf-enregistrer').addEventListener('click', async function () {
      const brut = validerFormulaire(racine, enModification);
      if (!brut) return;
      // ⭐ B1 — ce que l'écran n'a pas le droit de changer, il ne l'envoie
      // pas : le store ne juge que ce qui CHANGE.
      const valeurs = filtrerQualification(brut, peutQualifier);

      const bouton = racine.querySelector('#mf-enregistrer');
      bouton.disabled = true;

      try {
        if (enModification) {
          await ctx.store.updateMachine(machineId, {
            ...valeurs,
            operateur: utilisateur?.id
          });
          toast('Machine modifiée.', 'succes');
        } else {
          // En création, un code vide n'est pas envoyé : le store hérite
          // alors du repli compteur (« M# ») plutôt que de recevoir une
          // chaîne vide (que le store rejetterait comme invalide).
          const donneesCreation = { ...valeurs, operateur: utilisateur?.id };
          if (!donneesCreation.code) delete donneesCreation.code;
          const creee = await ctx.store.createMachine(donneesCreation);
          idMachineCreee = creee && creee.id ? creee.id : null;
          toast('Machine ajoutée.', 'succes');
        }
        fermeeParEnregistrement = true;
        fermer();
      } catch (erreur) {
        afficherBandeau(erreur && erreur.message ? erreur.message : 'Enregistrement impossible.');
        bouton.disabled = false;
      }
    });

    // La modale se ferme aussi via la croix / le fond / Échap :
    // on résout la promesse dans tous les cas en observant la disparition du fond.
    // subtree obligatoire : le fond vit dans #zone-modales, pas directement sous body.
    const fondModale = racine.closest('.modale-fond');
    const observateur = new MutationObserver(function () {
      if (!document.body.contains(fondModale)) {
        observateur.disconnect();
        // Création réussie → id (string, truthy) ; modification réussie →
        // true ; annulation / fermeture sans enregistrement → false.
        resoudre(idMachineCreee || fermeeParEnregistrement);
      }
    });
    observateur.observe(document.body, { childList: true, subtree: true });
  });
}
