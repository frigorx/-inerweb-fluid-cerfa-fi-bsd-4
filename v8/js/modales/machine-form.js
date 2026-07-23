// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — modale « Créer / Modifier une machine »
// Phase B : formulaire de saisie conforme charte (.formulaire /
// .champ / .grille-form-2), validation en direct, appel au store.
// ============================================================

import { modale, toast } from '../views/communs.js';
import { esc, nombreFr, fluidesProposables } from '../core/utils.js';
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

/**
 * Construit le HTML du formulaire (mêmes valeurs qu'à l'ouverture ;
 * les erreurs de champ sont ajoutées/retirées dynamiquement ensuite).
 * @param {object} machine — valeurs courantes (vide en création)
 * @param {object[]} fluides — référentiel des fluides
 * @param {object[]} clients — référentiel des clients / détenteurs
 * @returns {string} HTML
 */
function gabaritFormulaire(machine, fluides, clients) {
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
    + '<select id="mf-type-installation" name="typeInstallation">'
    + [['FIXE', 'Fixe (contr\u00f4le de suivi apr\u00e8s 24 h de fonctionnement)'],
       ['MOBILE', 'Mobile list\u00e9 (contr\u00f4le imm\u00e9diat admis)']]
      .map(function (o) {
        const selectionne = (machine.typeInstallation || 'FIXE') === o[0]
          ? ' selected' : '';
        return '<option value="' + o[0] + '"' + selectionne + '>'
          + esc(o[1]) + '</option>';
      }).join('')
    + '</select>'
    + '</div>'

    + '<div class="champ" data-champ="dateMiseEnService">'
    + '<label for="mf-date-mes">Date de mise en service</label>'
    + '<input type="date" id="mf-date-mes" name="dateMiseEnService" '
    + 'value="' + esc(machine.dateMiseEnService || '') + '">'
    + '</div>'

    + '<div class="champ">'
    + '<label for="mf-detection" style="flex-direction:row;align-items:center;gap:8px;text-transform:none;'
    + 'letter-spacing:normal;font-weight:500;font-size:13.5px;color:var(--texte-2);cursor:pointer;">'
    + '<input type="checkbox" id="mf-detection" name="detectionPermanente" style="width:16px;height:16px;"'
    + (machine.detectionPermanente ? ' checked' : '') + '>'
    + '<span>Détection permanente de fuite</span>'
    + '</label>'
    + '</div>'

    + '</form>';
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
    detectionPermanente: donnees.get('detectionPermanente') === 'on'
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
      contenuHtml: gabaritFormulaire(valeursInitiales, fluides, clients),
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

    let fermeeParEnregistrement = false;
    // Identifiant de la machine CRÉÉE (reste null en modification / annulation) :
    // permet au wizard de présélectionner la machine à la volée.
    let idMachineCreee = null;

    racine.querySelector('#mf-annuler').addEventListener('click', function () {
      fermer();
    });

    racine.querySelector('#mf-enregistrer').addEventListener('click', async function () {
      const valeurs = validerFormulaire(racine, enModification);
      if (!valeurs) return;

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
