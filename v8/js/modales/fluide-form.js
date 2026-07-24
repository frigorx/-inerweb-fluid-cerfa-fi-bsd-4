// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — modale « Ajouter / Modifier un fluide » (P1-2)
// Administration du référentiel des gaz par le référent lui-même :
// plus besoin d'une migration (donc d'un développeur) pour corriger un
// PRP ou déclarer un fluide.
//
// Le store reste SEUL JUGE : cette modale ne fait que de la validation
// de confort (champs obligatoires, format) et affiche le message du
// store tel quel en cas de refus. Les règles vivent dans le module pur
// reglementation-fluides.js, miroir serveur dans api.js.
//
// Deux points sensibles portés par l'écran :
//   · le CODE est figé en modification (clé étrangère de huit tables,
//     dont des écritures scellées) → champ verrouillé, explication ;
//   · dès que le PRP change, la SOURCE devient obligatoire (D4) → le
//     champ est pré-rempli « saisie locale du JJ/MM/AAAA » et signalé,
//     pour qu'une valeur ajustée ne garde jamais l'étiquette d'une
//     source officielle.
// ============================================================

import { modale, toast } from '../views/communs.js';
import { esc, fmtDate } from '../core/utils.js';
import { CLASSES_SECURITE, STATUTS_REGLEMENTAIRES, CATEGORIES_CADRE7,
  impactDepuisPrp } from '../data/reglementation-fluides.js';

/** Libellés lisibles des listes fermées. */
const LIBELLE_STATUT = {
  AUTORISE: 'Autorisé',
  RESTREINT: 'Restreint',
  INTERDIT: 'Interdit'
};
const LIBELLE_CATEGORIE = {
  // Q7/L1c (24/07) : la catégorie juridique des HFO purs est « gaz de
  // l'annexe II, section 1 » (règl. UE 2024/573) — le libellé AFFICHÉ le
  // dit ; la valeur ENREGISTRÉE reste 'HFO' (un renommage en base
  // toucherait des sauvegardes et des écritures existantes pour un gain nul).
  HFC: 'HFC — annexe I (seuils en tonnes équivalent CO₂)',
  HFO: 'Gaz annexe II, section 1 — HFO pur (seuils en kilogrammes)',
  HCFC: 'HCFC (seuils en kilogrammes)',
  AUCUNE: 'Aucune — hors périmètre du contrôle d’étanchéité'
};
const LIBELLE_IMPACT = {
  FAIBLE: 'Faible', MODERE: 'Modéré', ELEVE: 'Élevé', TRES_ELEVE: 'Très élevé'
};

/** <option> d'une liste fermée. */
function options(valeurs, choisie, libelles) {
  return valeurs.map(function (v) {
    return '<option value="' + esc(v) + '"'
      + (String(choisie) === v ? ' selected' : '') + '>'
      + esc(libelles ? (libelles[v] || v) : v) + '</option>';
  }).join('');
}

/** Construit le HTML du formulaire fluide (création ou modification). */
function gabaritFormulaire(fluide) {
  const f = fluide || {};
  const enEdition = Boolean(f.code);
  const categorie = f.categorieCadre7 == null ? '' : String(f.categorieCadre7);

  return '<form id="form-fluide" class="formulaire" novalidate>'

    + '<div id="ff-bandeau-erreur" class="bandeau-erreur" hidden></div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="code">'
    + '<label for="ff-code">Code du fluide *</label>'
    + '<input type="text" id="ff-code" name="code" maxlength="30" '
    + 'value="' + esc(f.code || '') + '" placeholder="Ex. R-449A"'
    + (enEdition ? ' readonly' : '') + '>'
    + '<span class="champ-erreur" hidden></span>'
    + (enEdition
      ? '<p class="ff-note">Le code ne se modifie pas : il est référencé par '
        + 'les machines, les bouteilles et les écritures scellées. Pour '
        + 'corriger une faute de frappe, créez le bon code puis désactivez '
        + 'celui-ci.</p>'
      : '<p class="ff-note">« R-32 », « R32 » et « r 32 » désignent le même '
        + 'gaz : un seul sera accepté.</p>')
    + '</div>'
    + '<div class="champ" data-champ="famille">'
    + '<label for="ff-famille">Famille *</label>'
    + '<input type="text" id="ff-famille" name="famille" maxlength="40" '
    + 'value="' + esc(f.famille || '') + '" placeholder="Ex. HFC, HFO, HFC/HFO, HC, CO2">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="gwpAr4">'
    + '<label for="ff-prp">PRP réglementaire *</label>'
    + '<input type="text" id="ff-prp" name="gwpAr4" maxlength="12" inputmode="decimal" '
    + 'value="' + esc(f.gwpAr4 === undefined || f.gwpAr4 === null ? '' : String(f.gwpAr4))
    + '" placeholder="Ex. 1397">'
    + '<span class="champ-erreur" hidden></span>'
    + '<p class="ff-note" id="ff-impact"></p>'
    + '</div>'
    + '<div class="champ" data-champ="classeSecurite">'
    + '<label for="ff-classe">Classe de sécurité *</label>'
    + '<select id="ff-classe" name="classeSecurite">'
    + (f.classeSecurite ? '' : '<option value="">— choisir —</option>')
    + options(CLASSES_SECURITE, f.classeSecurite)
    + '</select>'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'
    + '</div>'

    + '<div class="champ" data-champ="sourcePrp">'
    + '<label for="ff-source">Source du PRP</label>'
    + '<input type="text" id="ff-source" name="sourcePrp" maxlength="120" '
    + 'value="' + esc(f.sourcePrp || '') + '" '
    + 'placeholder="Ex. AR4, annexe règl. UE 2024/573 (F-Gas III), saisie locale">'
    + '<span class="champ-erreur" hidden></span>'
    + '<p class="ff-note" id="ff-note-source">D’où vient la valeur retenue. '
    + 'Dès que vous modifiez le PRP, cette source doit être saisie : une '
    + 'valeur ajustée localement ne garde jamais l’étiquette d’une source '
    + 'officielle.</p>'
    + '</div>'

    + '<fieldset class="ff-bloc">'
    + '<legend>Fiche réglementaire — cadre 7</legend>'
    + '<p class="ff-note">C’est elle qui commande le moteur des contrôles '
    + 'd’étanchéité. Laissée vide, le moteur se replie sur le libellé de '
    + 'famille — moins sûr.</p>'
    + '<div class="champ" data-champ="categorieCadre7">'
    + '<label for="ff-categorie">Catégorie</label>'
    + '<select id="ff-categorie" name="categorieCadre7">'
    + '<option value="">— non renseignée (repli sur la famille ; '
    + 'famille non fluorée ou illisible = pas de fiche officielle) —</option>'
    + options(CATEGORIES_CADRE7, categorie, LIBELLE_CATEGORIE)
    + '</select>'
    + '</div>'
    + '<label class="ff-case"><input type="checkbox" id="ff-hfc" name="contientHfc"'
    + (f.contientHfc ? ' checked' : '') + '> Contient du HFC</label>'
    + '<label class="ff-case"><input type="checkbox" id="ff-hfo" name="contientHfo"'
    + (f.contientHfo ? ' checked' : '') + '> Contient du HFO</label>'
    + '<p class="ff-note">Règle A : un mélange contenant du HFC relève de la '
    + 'catégorie HFC, même s’il contient aussi du HFO (cas du R-455A).</p>'
    + '</fieldset>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="statutReglementaire">'
    + '<label for="ff-statut">Statut réglementaire</label>'
    + '<select id="ff-statut" name="statutReglementaire">'
    + options(STATUTS_REGLEMENTAIRES,
      f.statutReglementaire || 'AUTORISE', LIBELLE_STATUT)
    + '</select>'
    + '</div>'
    + (enEdition
      ? '<div class="champ" data-champ="actif">'
        + '<label for="ff-actif">Disponible à la saisie</label>'
        + '<select id="ff-actif" name="actif">'
        + '<option value="oui"' + (f.actif === false ? '' : ' selected') + '>Oui</option>'
        + '<option value="non"' + (f.actif === false ? ' selected' : '') + '>Non — désactivé</option>'
        + '</select>'
        + '<p class="ff-note">Un fluide désactivé disparaît des listes de '
        + 'choix mais reste lisible partout où il est déjà enregistré.</p>'
        + '</div>'
      : '<div></div>')
    + '</div>'

    + '<div class="champ" data-champ="commentaire">'
    + '<label for="ff-commentaire">Commentaire</label>'
    + '<input type="text" id="ff-commentaire" name="commentaire" maxlength="200" '
    + 'value="' + esc(f.commentaire || '') + '" '
    + 'placeholder="Précision réglementaire éventuelle">'
    + '</div>'

    + '</form>'

    + '<style>'
    + '.ff-note{margin:5px 0 0;font-size:11.5px;color:var(--texte-3);line-height:1.45}'
    + '.ff-bloc{border:1px solid var(--bordure-2);border-radius:8px;'
    + 'padding:12px 14px;margin:0 0 14px}'
    + '.ff-bloc legend{font-size:12px;font-weight:600;color:var(--texte-2);padding:0 6px}'
    + '.ff-case{display:flex;align-items:center;gap:8px;font-size:13px;'
    + 'color:var(--texte-2);margin:6px 0}'
    + '.ff-source-requise input{border-color:var(--orange, #c47f17)}'
    + '</style>';
}

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
 * Nombre saisi à la française OU à l'anglaise (« 0,501 » = « 0.501 »).
 * @returns {number|null} null si illisible
 */
function nombreSaisi(valeur) {
  const texte = String(valeur ?? '').trim().replace(',', '.');
  if (texte === '') return null;
  const n = Number(texte);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validation de confort. Le store reste seul juge : on ne double ici que
 * les contrôles qui évitent un aller-retour inutile.
 * @returns {object|null} valeurs prêtes pour le store, ou null si invalide
 */
function validerFormulaire(racine, fluide) {
  const form = racine.querySelector('#form-fluide');
  const donnees = new FormData(form);
  const enEdition = Boolean(fluide && fluide.code);
  let valide = true;

  ['code', 'famille', 'gwpAr4', 'classeSecurite', 'sourcePrp']
    .forEach(function (nom) { effacerErreur(racine, nom); });

  const code = String(donnees.get('code') || '').trim();
  if (!code) {
    marquerErreur(racine, 'code', 'Le code du fluide est obligatoire.');
    valide = false;
  }
  const famille = String(donnees.get('famille') || '').trim();
  if (!famille) {
    marquerErreur(racine, 'famille', 'La famille est obligatoire.');
    valide = false;
  }
  const prp = nombreSaisi(donnees.get('gwpAr4'));
  if (prp === null || prp < 0) {
    marquerErreur(racine, 'gwpAr4',
      'PRP obligatoire : nombre positif ou nul (le NH₃ vaut 0).');
    valide = false;
  }
  const classe = String(donnees.get('classeSecurite') || '');
  if (!classe) {
    marquerErreur(racine, 'classeSecurite',
      'La classe de sécurité est obligatoire.');
    valide = false;
  }

  // D4 : le PRP change → la source doit être saisie.
  const source = String(donnees.get('sourcePrp') || '').trim();
  const prpChange = enEdition && prp !== null
    && prp !== Number(fluide.gwpAr4);
  if (prpChange && !source) {
    marquerErreur(racine, 'sourcePrp',
      'PRP modifié : indiquez d’où vient la nouvelle valeur.');
    valide = false;
  }

  if (!valide) return null;

  const valeurs = {
    famille: famille,
    gwpAr4: prp,
    classeSecurite: classe,
    statutReglementaire: String(donnees.get('statutReglementaire') || 'AUTORISE'),
    commentaire: String(donnees.get('commentaire') || '').trim(),
    categorieCadre7: String(donnees.get('categorieCadre7') || '').trim(),
    contientHfc: donnees.get('contientHfc') !== null,
    contientHfo: donnees.get('contientHfo') !== null,
    sourcePrp: source
  };
  if (enEdition) {
    valeurs.actif = String(donnees.get('actif') || 'oui') === 'oui';
  } else {
    valeurs.code = code;
  }
  return valeurs;
}

/**
 * Ouvre la modale d'ajout ou de modification d'un fluide du référentiel.
 * @param {{ store: object }} ctx
 * @param {object|null} fluide — fluide existant (modification) ou null
 * @returns {Promise<boolean>} résolue à la fermeture (true si enregistré)
 */
export async function ouvrirFormFluide(ctx, fluide = null) {
  const enEdition = Boolean(fluide && fluide.code);

  return new Promise(function (resoudre) {
    const { fermer, racine } = modale({
      titre: enEdition ? 'Modifier le fluide ' + fluide.code
        : 'Ajouter un fluide au référentiel',
      contenuHtml: gabaritFormulaire(fluide),
      actionsHtml:
        '<button type="button" id="ff-annuler" class="btn btn-secondaire">Annuler</button>'
        + '<button type="button" id="ff-enregistrer" class="btn btn-primaire">Enregistrer</button>'
    });
    const bandeauErreur = racine.querySelector('#ff-bandeau-erreur');
    const champPrp = racine.querySelector('#ff-prp');
    const champSource = racine.querySelector('#ff-source');
    const noteImpact = racine.querySelector('#ff-impact');
    const noteSource = racine.querySelector('#ff-note-source');
    const blocSource = racine.querySelector('[data-champ="sourcePrp"]');

    function masquerBandeau() {
      bandeauErreur.hidden = true;
      bandeauErreur.textContent = '';
    }

    function afficherBandeau(message) {
      bandeauErreur.textContent = message;
      bandeauErreur.hidden = false;
    }

    // Impact affiché en direct (dérivé du PRP, comme la vue) + rappel de
    // la source quand le PRP est modifié : le refus du store ne doit
    // jamais être une surprise.
    function rafraichirPrp() {
      const prp = nombreSaisi(champPrp.value);
      const impact = impactDepuisPrp(prp);
      noteImpact.textContent = impact
        ? 'Impact environnemental : ' + (LIBELLE_IMPACT[impact] || impact)
        : '';
      const change = enEdition && prp !== null
        && prp !== Number(fluide.gwpAr4);
      blocSource.classList.toggle('ff-source-requise', change);
      if (change && !champSource.value.trim()) {
        champSource.value = 'saisie locale du ' + fmtDate(
          new Date().toISOString().slice(0, 10));
      }
      noteSource.textContent = change
        ? 'PRP modifié : la source est obligatoire. Corrigez-la si elle ne '
          + 'décrit plus la valeur retenue.'
        : 'D’où vient la valeur retenue. Dès que vous modifiez le PRP, cette '
          + 'source doit être saisie : une valeur ajustée localement ne garde '
          + 'jamais l’étiquette d’une source officielle.';
    }
    champPrp.addEventListener('input', rafraichirPrp);
    rafraichirPrp();

    racine.querySelectorAll('input, select').forEach(function (champ) {
      champ.addEventListener('input', masquerBandeau);
      champ.addEventListener('change', masquerBandeau);
    });

    let fermeeParEnregistrement = false;

    racine.querySelector('#ff-annuler').addEventListener('click', function () {
      fermer();
    });

    racine.querySelector('#ff-enregistrer').addEventListener('click', async function () {
      const valeurs = validerFormulaire(racine, fluide);
      if (!valeurs) return;

      const bouton = racine.querySelector('#ff-enregistrer');
      bouton.disabled = true;

      try {
        if (enEdition) {
          await ctx.store.updateFluide(fluide.code, valeurs);
          toast('Fluide mis à jour.', 'succes');
        } else {
          await ctx.store.createFluide(valeurs);
          toast('Fluide ajouté au référentiel.', 'succes');
        }
        fermeeParEnregistrement = true;
        fermer();
      } catch (erreur) {
        afficherBandeau(erreur && erreur.message
          ? erreur.message : 'Enregistrement impossible.');
        bouton.disabled = false;
      }
    });

    const fondModale = racine.closest('.modale-fond');
    const observateur = new MutationObserver(function () {
      if (!document.body.contains(fondModale)) {
        observateur.disconnect();
        resoudre(fermeeParEnregistrement);
      }
    });
    observateur.observe(document.body, { childList: true, subtree: true });
  });
}
