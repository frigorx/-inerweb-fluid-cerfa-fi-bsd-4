// ============================================================
// inerWeb Fluide — modales/bouteille-form.js (Phase B)
// Formulaire de création/édition d'une bouteille + petite modale
// de pesée. Toute la logique de validation MÉTIER (fluide connu,
// masse nette ≤ contenance, etc.) reste dans le store : ce module
// ne fait que la validation de saisie (champs requis, nombres ≥ 0)
// et affiche les erreurs du store si elles surviennent.
// ============================================================

import { modale, toast, ICONES } from '../views/communs.js';
import { esc, fmtNombre, nombreFr } from '../core/utils.js';
import { zonePiecesJointes } from '../composants/pieces-jointes.js';

// Libellés français des états de fluide (mêmes clés que bouteilles.js)
const LIBELLES_ETAT_FLUIDE = {
  VIERGE:   'Vierge',
  RECUPERE: 'Récupéré',
  RECYCLE:  'Recyclé',
  REGENERE: 'Régénéré',
  // R2 : bouteille de récupération au contenu probablement mélangé
  // (croisement de fluides autorisé uniquement vers elle).
  MELANGE:  'Mélange (contenu incertain)'
};

/* ============================================================
   Utilitaires de rendu de formulaire
   ============================================================ */

/**
 * Construit les options d'un <select> à partir d'une liste de
 * { valeur, libelle }, en présélectionnant la valeur courante.
 * @param {{valeur: string, libelle: string}[]} options
 * @param {string} courante
 * @returns {string} HTML
 */
function optionsSelect(options, courante) {
  return options.map(function (o) {
    const selectionnee = o.valeur === courante ? ' selected' : '';
    return '<option value="' + esc(o.valeur) + '"' + selectionnee + '>' + esc(o.libelle) + '</option>';
  }).join('');
}

/**
 * Affiche (ou masque) le bandeau d'erreur en tête de formulaire.
 * @param {HTMLElement} racine - élément racine du formulaire
 * @param {string} message - message à afficher ; chaîne vide pour masquer
 */
function afficherBandeauErreur(racine, message) {
  const bandeau = racine.querySelector('.bandeau-erreur');
  if (!bandeau) return;
  if (!message) {
    bandeau.hidden = true;
    bandeau.textContent = '';
    return;
  }
  bandeau.hidden = false;
  bandeau.innerHTML = ICONES.alerte + '<span>' + esc(message) + '</span>';
}

/* ============================================================
   Formulaire création / édition d'une bouteille
   ============================================================ */

/**
 * Ouvre la modale de création ou de modification d'une bouteille.
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 * @param {string|null} [bouteilleId] - id de la bouteille à éditer ; null = création
 * @returns {Promise<string|boolean>} résolue à la fermeture :
 *   - en CRÉATION réussie : l'identifiant (string) de la bouteille créée ;
 *   - en MODIFICATION réussie : true ;
 *   - sinon (annulation, fermeture sans enregistrement) : false.
 *   Rétrocompatible : les appelants existants ignorent la valeur de retour.
 *   Le wizard s'en sert pour présélectionner la bouteille créée.
 */
export async function ouvrirFormBouteille(ctx, bouteilleId = null) {
  const [fluides, bouteilles] = await Promise.all([
    ctx.store.getFluides(),
    ctx.store.getBouteilles()
  ]);

  const enEdition = Boolean(bouteilleId);
  const bouteille = enEdition
    ? bouteilles.find(function (b) { return b.id === bouteilleId; })
    : null;

  if (enEdition && !bouteille) {
    toast('Bouteille introuvable.', 'erreur');
    return;
  }

  // Types admis par le store (contrat Phase B) : NEUVE ou RECUPERATION
  const optionsType = optionsSelect([
    { valeur: 'NEUVE', libelle: 'Neuve' },
    { valeur: 'RECUPERATION', libelle: 'Récupération' }
  ], bouteille ? bouteille.type : 'NEUVE');

  const optionsFluide = optionsSelect(
    fluides.map(function (f) { return { valeur: f.code, libelle: f.code }; }),
    bouteille ? bouteille.fluide : (fluides[0] ? fluides[0].code : '')
  );

  // R2 : MELANGE réservé aux bouteilles de type RÉCUPÉRATION (garde-fou
  // store, cf. createBouteille) — l'option n'apparaît que pour ce type,
  // et le select est reconstruit au changement de type (voir plus bas).
  function optionsEtatPour(type, courant) {
    const options = [
      { valeur: 'VIERGE', libelle: 'Vierge' },
      { valeur: 'RECUPERE', libelle: 'Récupéré' },
      { valeur: 'RECYCLE', libelle: 'Recyclé' },
      { valeur: 'REGENERE', libelle: 'Régénéré' }
    ];
    if (type === 'RECUPERATION') {
      options.push({ valeur: 'MELANGE', libelle: LIBELLES_ETAT_FLUIDE.MELANGE });
    }
    return optionsSelect(options, courant);
  }
  const typeInitial = bouteille ? bouteille.type : 'NEUVE';
  const optionsEtat = optionsEtatPour(typeInitial,
    bouteille ? bouteille.etatFluide : 'VIERGE');

  const contenuHtml = '<form id="form-bouteille" class="formulaire" novalidate>'
    + '<div class="bandeau-erreur" hidden></div>'

    + '<div class="grille-form-2">'
    + '<div class="champ">'
    + '<label for="bf-numero">N° bouteille réel</label>'
    + '<input id="bf-numero" name="numeroReel" type="text" required'
    + ' value="' + esc(bouteille ? bouteille.numeroReel : '') + '">'
    + '</div>'
    + '<div class="champ">'
    + '<label for="bf-type">Type</label>'
    + '<select id="bf-type" name="type" required>' + optionsType + '</select>'
    + '</div>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ">'
    + '<label for="bf-fluide">Fluide</label>'
    + '<select id="bf-fluide" name="fluide" required>' + optionsFluide + '</select>'
    + '</div>'
    + '<div class="champ">'
    + '<label for="bf-etat">État du fluide</label>'
    + '<select id="bf-etat" name="etatFluide">' + optionsEtat + '</select>'
    + '</div>'
    + '</div>'

    + '<div class="chip chip-ambre" id="bf-mention-melange"'
    + (typeInitial === 'RECUPERATION' && bouteille && bouteille.etatFluide === 'MELANGE'
      ? '' : ' hidden')
    + '>Contenu probablement mélangé : le fluide déclaré est le gaz'
    + ' majoritaire, des versements d’autres fluides sont tracés sur la fiche.</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ">'
    + '<label for="bf-tare">Tare</label>'
    + '<div class="champ-unite" data-unite="kg">'
    + '<input id="bf-tare" name="tareKg" type="number" min="0" step="0.1" required'
    + ' value="' + esc(bouteille ? fmtNombre(bouteille.tareKg, 1).replace(',', '.') : '') + '">'
    + '</div>'
    + '</div>'
    + '<div class="champ">'
    + '<label for="bf-nette">Masse nette actuelle</label>'
    + '<div class="champ-unite" data-unite="kg">'
    + '<input id="bf-nette" name="masseNetteKg" type="number" min="0" step="0.1" required'
    + ' value="' + esc(bouteille ? fmtNombre(bouteille.masseNetteKg, 1).replace(',', '.') : '') + '">'
    + '</div>'
    + '</div>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ">'
    + '<label for="bf-contenance">Contenance max</label>'
    + '<div class="champ-unite" data-unite="kg">'
    + '<input id="bf-contenance" name="contenanceMaxKg" type="number" min="0" step="0.1" required'
    + ' value="' + esc(bouteille ? fmtNombre(bouteille.contenanceMaxKg, 1).replace(',', '.') : '') + '">'
    + '</div>'
    + '</div>'
    + '<div class="champ">'
    + '<label for="bf-date-entree">Date d’entrée</label>'
    + '<input id="bf-date-entree" name="dateEntree" type="date"'
    + ' value="' + esc(bouteille ? bouteille.dateEntree : '') + '">'
    + '</div>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ">'
    + '<label for="bf-proprietaire">Propriétaire / fournisseur</label>'
    + '<input id="bf-proprietaire" name="proprietaire" type="text"'
    + ' value="' + esc(bouteille ? bouteille.proprietaire : '') + '">'
    + '</div>'
    + '<div class="champ">'
    + '<label for="bf-lot">N° lot</label>'
    + '<input id="bf-lot" name="lot" type="text"'
    + ' value="' + esc(bouteille ? bouteille.lot : '') + '">'
    + '</div>'
    + '</div>'

    + '<div class="champ" id="bf-zone-pieces-jointes"></div>'

    + '</form>';

  const actionsHtml = '<button type="button" class="btn btn-secondaire" data-role="annuler">Annuler</button>'
    + '<button type="submit" form="form-bouteille" class="btn btn-marine">'
    + (enEdition ? 'Enregistrer' : 'Ajouter') + '</button>';

  const { fermer, racine } = modale({
    titre: enEdition ? 'Modifier la bouteille ' + (bouteille.code || '') : 'Ajouter une bouteille',
    contenuHtml: contenuHtml,
    actionsHtml: actionsHtml
  });

  const formulaire = racine.querySelector('#form-bouteille');
  const selectType = racine.querySelector('#bf-type');
  const selectEtat = racine.querySelector('#bf-etat');
  const mentionMelange = racine.querySelector('#bf-mention-melange');

  // R2 : le select « État du fluide » se reconstruit au changement de
  // type (l'option MELANGE n'existe que pour RÉCUPÉRATION) ; la mention
  // ambre suit l'état sélectionné, quel que soit le déclencheur.
  function synchroniserMentionMelange() {
    mentionMelange.hidden = selectEtat.value !== 'MELANGE';
  }
  selectType.addEventListener('change', function () {
    const courant = selectEtat.value;
    selectEtat.innerHTML = optionsEtatPour(selectType.value,
      selectType.value === 'RECUPERATION' ? courant : 'VIERGE');
    synchroniserMentionMelange();
  });
  selectEtat.addEventListener('change', synchroniserMentionMelange);

  // Pièces jointes (ex. photo de pesée, certificat) : uniquement en
  // édition, la bouteille existant déjà avec un identifiant.
  if (enEdition) {
    zonePiecesJointes(racine.querySelector('#bf-zone-pieces-jointes'), ctx, {
      entiteType: 'BOUTEILLE',
      entiteId: bouteilleId,
      categorie: 'PHOTO_PESEE'
    });
  } else {
    racine.querySelector('#bf-zone-pieces-jointes').hidden = true;
  }

  racine.querySelector('[data-role="annuler"]').addEventListener('click', fermer);

  // Création réussie → id (string) ; modification réussie → true ;
  // sinon (annulation, fermeture) → false. Permet au wizard de
  // présélectionner la bouteille créée à la volée.
  let idBouteilleCreee = null;
  let enregistree = false;

  formulaire.addEventListener('submit', async function (evenement) {
    evenement.preventDefault();
    afficherBandeauErreur(racine, '');

    const donnees = new FormData(formulaire);
    const numeroReel = String(donnees.get('numeroReel') || '').trim();
    const type = donnees.get('type');
    const fluide = donnees.get('fluide');
    const etatFluide = donnees.get('etatFluide');
    // nombreFr : accepte la virgule décimale fr-FR (« 4,20 »), sinon
    // Number('4,20') vaudrait NaN → refus silencieux à la saisie.
    const tareKg = nombreFr(donnees.get('tareKg'));
    const masseNetteKg = nombreFr(donnees.get('masseNetteKg'));
    const contenanceMaxKg = nombreFr(donnees.get('contenanceMaxKg'));
    const proprietaire = String(donnees.get('proprietaire') || '').trim();
    const lot = String(donnees.get('lot') || '').trim();
    const dateEntree = String(donnees.get('dateEntree') || '').trim();

    // Validation de saisie (avant d'interroger le store)
    if (!numeroReel) {
      afficherBandeauErreur(racine, 'Le n° de bouteille réel est obligatoire.');
      return;
    }
    if (!Number.isFinite(tareKg) || tareKg < 0) {
      afficherBandeauErreur(racine, 'La tare doit être un nombre positif ou nul.');
      return;
    }
    if (!Number.isFinite(masseNetteKg) || masseNetteKg < 0) {
      afficherBandeauErreur(racine, 'La masse nette doit être un nombre positif ou nul.');
      return;
    }
    if (!Number.isFinite(contenanceMaxKg) || contenanceMaxKg <= 0) {
      afficherBandeauErreur(racine, 'La contenance maximale doit être un nombre strictement positif.');
      return;
    }
    if (masseNetteKg > contenanceMaxKg) {
      afficherBandeauErreur(racine, 'La masse nette ne peut pas dépasser la contenance maximale.');
      return;
    }

    const chargeUtile = {
      numeroReel: numeroReel,
      type: type,
      fluide: fluide,
      etatFluide: etatFluide,
      tareKg: tareKg,
      // La masse nette saisie détermine la masse brute (brute = nette + tare)
      masseBruteKg: tareKg + masseNetteKg,
      contenanceMaxKg: contenanceMaxKg,
      proprietaire: proprietaire || null,
      lot: lot || null,
      dateEntree: dateEntree || undefined
    };

    try {
      const utilisateur = await ctx.store.getUtilisateurCourant();
      chargeUtile.operateur = utilisateur.prenom + ' ' + utilisateur.nom;

      if (enEdition) {
        await ctx.store.updateBouteille(bouteilleId, chargeUtile);
        enregistree = true;
        toast('Bouteille modifiée.', 'succes');
      } else {
        const creee = await ctx.store.createBouteille(chargeUtile);
        idBouteilleCreee = creee && creee.id ? creee.id : null;
        enregistree = true;
        toast('Bouteille ajoutée.', 'succes');
      }
      fermer();
      if (typeof ctx.rafraichir === 'function') ctx.rafraichir();
    } catch (erreur) {
      afficherBandeauErreur(racine, erreur.message || 'Une erreur est survenue.');
    }
  });

  // Résolution à la fermeture (annuler, croix, fond, Échap, ou
  // enregistrement) : le fond vit dans #zone-modales, d'où subtree.
  return new Promise(function (resoudre) {
    const fondModale = racine.closest('.modale-fond');
    const observateur = new MutationObserver(function () {
      if (!document.body.contains(fondModale)) {
        observateur.disconnect();
        resoudre(idBouteilleCreee || enregistree);
      }
    });
    observateur.observe(document.body, { childList: true, subtree: true });
  });
}

/* ============================================================
   Petite modale de pesée
   ============================================================ */

/**
 * Ouvre la modale « Peser la bouteille ».
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 * @param {string} bouteilleId - id de la bouteille à peser
 */
export async function ouvrirPesee(ctx, bouteilleId) {
  const bouteilles = await ctx.store.getBouteilles();
  const bouteille = bouteilles.find(function (b) { return b.id === bouteilleId; });

  if (!bouteille) {
    toast('Bouteille introuvable.', 'erreur');
    return;
  }

  const etat = LIBELLES_ETAT_FLUIDE[bouteille.etatFluide] || bouteille.etatFluide;

  const contenuHtml = '<form id="form-pesee" class="formulaire" novalidate>'
    + '<div class="bandeau-erreur" hidden></div>'

    + '<p class="modale-intro">Bouteille <strong>' + esc(bouteille.code) + '</strong>'
    + (bouteille.numeroReel ? ' · n° ' + esc(bouteille.numeroReel) : '') + '<br>'
    + 'Tare : <span class="mono">' + esc(fmtNombre(bouteille.tareKg, 1)) + ' kg</span>'
    + ' · Fluide : <span class="mono">' + esc(bouteille.fluide) + '</span> (' + esc(etat) + ')<br>'
    + 'Dernière pesée : <span class="mono">' + esc(fmtNombre(bouteille.masseNetteKg, 1)) + ' kg</span> nette'
    + ' le ' + esc(bouteille.datePesee || '—') + '</p>'

    + '<div class="champ">'
    + '<label for="pz-brute">Masse brute mesurée</label>'
    + '<div class="champ-unite" data-unite="kg">'
    + '<input id="pz-brute" name="masseBruteKg" type="number" min="0" step="0.1" required'
    + ' value="' + esc(fmtNombre(bouteille.masseBruteKg, 1).replace(',', '.')) + '">'
    + '</div>'
    + '</div>'

    + '<p class="modale-intro" id="pz-apercu">Masse nette : <strong class="mono">'
    + esc(fmtNombre(bouteille.masseNetteKg, 1)) + ' kg</strong></p>'

    + '</form>';

  const actionsHtml = '<button type="button" class="btn btn-secondaire" data-role="annuler">Annuler</button>'
    + '<button type="submit" form="form-pesee" class="btn btn-marine">Enregistrer la pesée</button>';

  const { fermer, racine } = modale({
    titre: 'Peser la bouteille',
    contenuHtml: contenuHtml,
    actionsHtml: actionsHtml
  });

  const formulaire = racine.querySelector('#form-pesee');
  const champBrute = racine.querySelector('#pz-brute');
  const apercu = racine.querySelector('#pz-apercu');

  // Aperçu en direct de la masse nette pendant la saisie
  champBrute.addEventListener('input', function () {
    // nombreFr : « 13,0 » (virgule décimale) accepté comme « 13.0 »
    const brute = nombreFr(champBrute.value);
    const nette = Number.isFinite(brute) ? brute - bouteille.tareKg : NaN;
    apercu.innerHTML = 'Masse nette : <strong class="mono">'
      + esc(Number.isFinite(nette) ? fmtNombre(nette, 1) : '—') + ' kg</strong>';
  });

  racine.querySelector('[data-role="annuler"]').addEventListener('click', fermer);

  formulaire.addEventListener('submit', async function (evenement) {
    evenement.preventDefault();
    afficherBandeauErreur(racine, '');

    const brute = nombreFr(champBrute.value);
    if (!Number.isFinite(brute) || brute < 0) {
      afficherBandeauErreur(racine, 'La masse brute doit être un nombre positif ou nul.');
      return;
    }

    try {
      const utilisateur = await ctx.store.getUtilisateurCourant();
      const operateur = utilisateur.prenom + ' ' + utilisateur.nom;
      await ctx.store.peserBouteille(bouteilleId, brute, operateur);
      toast('Pesée enregistrée.', 'succes');
      fermer();
      if (typeof ctx.rafraichir === 'function') ctx.rafraichir();
    } catch (erreur) {
      afficherBandeauErreur(racine, erreur.message || 'Une erreur est survenue.');
    }
  });
}
