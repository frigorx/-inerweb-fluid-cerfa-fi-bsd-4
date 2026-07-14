// ============================================================
// inerWeb Fluide v8 — modale « Habilitations F-Gas d'une personne »
// (Phase 2a du chantier B2 : SAISIE + AFFICHAGE uniquement)
//
// On STOCKE et on AFFICHE les habilitations d'une personne, on
// n'ÉVALUE rien : aucune règle de verdict / blocage ici (« qui a le
// droit de faire quoi » viendra en Phase 2b/3). Cette modale ne fait
// qu'appeler les méthodes de contrat déjà posées et testées :
// getHabilitations, createHabilitation, revoquerHabilitation.
//
// Idiomes maison respectés : helper modale() (on cible `racine`,
// jamais document.querySelector('.modale')), erreur affichée dans un
// bandeau sobre (pas de fermeture), rechargement de la liste après
// chaque mutation, esc() sur toute donnée affichée.
// ============================================================

import { modale, toast, confirmer, ICONES } from '../views/communs.js';
import { esc, fmtDate } from '../core/utils.js';
import { REGIMES, CATEGORIES_2008, CATEGORIES_2025 } from '../data/habilitations.js';

// Libellés lisibles des deux régimes de certification.
const LIBELLES_REGIME = {
  '2008': 'Régime 2008',
  '2025': 'Régime 2025 (F-Gas III)'
};

// Régime sélectionné par défaut à l'ouverture du formulaire d'ajout
// (le régime en vigueur pour l'avenir).
const REGIME_DEFAUT = '2025';

/**
 * Options <option> du select régime, construites depuis REGIMES.
 * @returns {string} HTML
 */
function optionsRegime() {
  return REGIMES.map(function (r) {
    const selectionne = r === REGIME_DEFAUT ? ' selected' : '';
    return '<option value="' + esc(r) + '"' + selectionne + '>'
      + esc(LIBELLES_REGIME[r] || ('Régime ' + r)) + '</option>';
  }).join('');
}

/**
 * Options <option> du select catégorie selon le régime choisi
 * (CATEGORIES_2008 pour 2008, CATEGORIES_2025 sinon).
 * @param {string} regime — '2008' ou '2025'
 * @returns {string} HTML
 */
function optionsCategoriePourRegime(regime) {
  const categories = regime === '2008' ? CATEGORIES_2008 : CATEGORIES_2025;
  return categories.map(function (c) {
    return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
  }).join('');
}

/**
 * Rend une ligne d'habilitation. Les révoquées restent affichées,
 * grisées et datées (jamais supprimées) et n'ont pas de bouton.
 * @param {object} h — habilitation (copie renvoyée par le store)
 * @returns {string} HTML
 */
function ligneHabilitation(h) {
  const revoquee = !h.actif;
  const classe = revoquee ? ' hab-revoquee' : '';

  const chipRegime = '<span class="chip ' + (h.regime === '2025' ? 'chip-teal' : 'chip-gris') + '">'
    + esc(LIBELLES_REGIME[h.regime] || ('Régime ' + h.regime)) + '</span>';
  const chipEtat = revoquee
    ? '<span class="chip chip-gris">Révoquée</span>'
    : '<span class="chip chip-vert">Active</span>';

  const meta = [];
  if (h.numeroAttestation) {
    meta.push('N° <span class="mono">' + esc(h.numeroAttestation) + '</span>');
  }
  if (h.organismeDelivreur) {
    meta.push(esc(h.organismeDelivreur));
  }
  if (h.dateDebut || h.dateFin) {
    meta.push(esc(fmtDate(h.dateDebut)) + ' → ' + esc(fmtDate(h.dateFin)));
  }
  const metaHtml = meta.length
    ? '<div class="hab-meta">' + meta.join(' · ') + '</div>'
    : '<div class="hab-meta">Aucune précision saisie.</div>';

  const noteRevoc = revoquee
    ? '<div class="hab-revoc-note">Révoquée le ' + esc(fmtDate(h.dateRevocation)) + '</div>'
    : '';

  const actions = revoquee ? ''
    : '<div class="hab-item-actions">'
      + '<button type="button" class="btn btn-danger-contour btn-petit" '
      + 'data-action="revoquer" data-id="' + esc(h.id) + '" '
      + 'aria-label="Révoquer l’habilitation ' + esc(h.regime) + ' ' + esc(h.categorie) + '">'
      + 'Révoquer</button>'
      + '</div>';

  return '<div class="hab-item' + classe + '">'
    + '<div class="hab-item-corps">'
    + '<div class="hab-item-haut">'
    + chipRegime
    + '<span class="hab-cat">Catégorie ' + esc(h.categorie) + '</span>'
    + chipEtat
    + '</div>'
    + metaHtml
    + noteRevoc
    + '</div>'
    + actions
    + '</div>';
}

/**
 * Construit le contenu de la modale : liste (remplie après ouverture)
 * puis formulaire d'ajout.
 * @returns {string} HTML
 */
function gabaritContenu() {
  return '<style>'
    + '.hab-liste { display:flex; flex-direction:column; gap:8px; margin:2px 0 4px; }'
    + '.hab-vide { font-size:13px; color:var(--texte-3); padding:6px 0; }'
    + '.hab-item { display:flex; justify-content:space-between; align-items:flex-start; '
    + 'gap:12px; padding:10px 12px; border:1px solid var(--bordure); '
    + 'border-radius:var(--rayon-bouton); background:var(--carte); }'
    + '.hab-item.hab-revoquee { opacity:.6; background:var(--fond-3); }'
    + '.hab-item-haut { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }'
    + '.hab-cat { font-weight:600; color:var(--texte); }'
    + '.hab-meta { margin-top:5px; font-size:12.5px; color:var(--texte-3); }'
    + '.hab-meta .mono { font-size:12.5px; }'
    + '.hab-revoc-note { margin-top:3px; font-size:12px; color:var(--danger); }'
    + '.hab-item-actions { flex:none; }'
    + '.hab-sous-titre { font-size:12px; font-weight:600; text-transform:uppercase; '
    + 'letter-spacing:.05em; color:var(--texte-3); margin:14px 0 8px; }'
    + '.hab-form-actions { margin-top:6px; }'
    + '</style>'

    + '<div class="encart-aide">'
    + 'Régime 2008 : valable jusqu’au 31/12/2026 · '
    + 'Régime 2025 (F-Gas III) : obligatoire à partir du 01/01/2027. '
    + 'Les deux peuvent coexister ; une habilitation révoquée reste au registre.'
    + '</div>'

    + '<div id="hab-liste" class="hab-liste"></div>'

    + '<div class="hab-sous-titre">Ajouter une habilitation</div>'

    + '<div id="hab-bandeau-erreur" class="bandeau-erreur" hidden></div>'

    + '<form id="hab-form" class="formulaire" novalidate>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="regime">'
    + '<label for="hab-regime">Régime</label>'
    + '<select id="hab-regime" name="regime">' + optionsRegime() + '</select>'
    + '</div>'
    + '<div class="champ" data-champ="categorie">'
    + '<label for="hab-categorie">Catégorie</label>'
    + '<select id="hab-categorie" name="categorie">'
    + optionsCategoriePourRegime(REGIME_DEFAUT)
    + '</select>'
    + '</div>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="numeroAttestation">'
    + '<label for="hab-num">N° d’attestation</label>'
    + '<input type="text" id="hab-num" name="numeroAttestation" maxlength="60">'
    + '</div>'
    + '<div class="champ" data-champ="organismeDelivreur">'
    + '<label for="hab-organisme">Organisme délivreur</label>'
    + '<input type="text" id="hab-organisme" name="organismeDelivreur" maxlength="120">'
    + '</div>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="dateDebut">'
    + '<label for="hab-debut">Date de début</label>'
    + '<input type="date" id="hab-debut" name="dateDebut">'
    + '</div>'
    + '<div class="champ" data-champ="dateFin">'
    + '<label for="hab-fin">Date de fin</label>'
    + '<input type="date" id="hab-fin" name="dateFin">'
    + '</div>'
    + '</div>'

    + '<div class="hab-form-actions">'
    + '<button type="button" id="hab-ajouter" class="btn btn-primaire btn-petit">'
    + ICONES.plus + '<span>Ajouter</span></button>'
    + '</div>'

    + '</form>';
}

/**
 * Ouvre la modale des habilitations F-Gas d'une personne.
 * @param {{ store: object }} ctx
 * @param {string} personneId — identifiant de la personne concernée
 * @returns {Promise<boolean>} true si au moins une modification a eu lieu
 *   (ajout ou révocation), pour que la vue appelante se rafraîchisse.
 */
export async function ouvrirHabilitations(ctx, personneId) {
  const personnel = await ctx.store.getPersonnel();
  const personne = personnel.find(function (p) { return p.id === personneId; });

  if (!personne) {
    toast('Personne introuvable : habilitations indisponibles.', 'erreur');
    return false;
  }

  // Opérateur consigné au journal (nom lisible ou null en mode dégradé).
  const utilisateur = await ctx.store.getUtilisateurCourant().catch(function () { return null; });
  const operateur = utilisateur ? (utilisateur.prenom + ' ' + utilisateur.nom) : null;

  return new Promise(function (resoudre) {
    let auModifie = false;

    const { fermer, racine } = modale({
      titre: 'Habilitations — ' + personne.prenom + ' ' + personne.nom,
      contenuHtml: gabaritContenu(),
      actionsHtml: '<button type="button" id="hab-fermer" class="btn btn-secondaire">Fermer</button>'
    });

    const bandeauErreur = racine.querySelector('#hab-bandeau-erreur');
    const selectRegime = racine.querySelector('#hab-regime');
    const selectCategorie = racine.querySelector('#hab-categorie');
    const listeHtml = racine.querySelector('#hab-liste');

    function masquerBandeau() {
      bandeauErreur.hidden = true;
      bandeauErreur.textContent = '';
    }

    function afficherBandeau(message) {
      bandeauErreur.textContent = message;
      bandeauErreur.hidden = false;
    }

    // Recharge la liste des habilitations de la personne dans la modale.
    // Le store rend déjà les habilitations triées (2025 avant 2008, dateFin
    // décroissante) : le filtre par personne conserve cet ordre.
    async function rafraichirListe() {
      const toutes = await ctx.store.getHabilitations();
      const propres = toutes.filter(function (h) { return h.personneId === personneId; });
      if (propres.length === 0) {
        listeHtml.innerHTML =
          '<p class="hab-vide">Aucune habilitation enregistrée pour cette personne.</p>';
        return;
      }
      listeHtml.innerHTML = propres.map(ligneHabilitation).join('');
    }

    // La liste des catégories dépend du régime choisi.
    selectRegime.addEventListener('change', function () {
      selectCategorie.innerHTML = optionsCategoriePourRegime(selectRegime.value);
    });

    // Ajout d'une habilitation.
    const boutonAjouter = racine.querySelector('#hab-ajouter');
    boutonAjouter.addEventListener('click', async function () {
      masquerBandeau();
      const form = racine.querySelector('#hab-form');
      const donnees = new FormData(form);
      boutonAjouter.disabled = true;
      try {
        await ctx.store.createHabilitation({
          personneId: personneId,
          regime: String(donnees.get('regime') || ''),
          categorie: String(donnees.get('categorie') || ''),
          numeroAttestation: String(donnees.get('numeroAttestation') || '').trim() || null,
          organismeDelivreur: String(donnees.get('organismeDelivreur') || '').trim() || null,
          dateDebut: String(donnees.get('dateDebut') || '').trim() || null,
          dateFin: String(donnees.get('dateFin') || '').trim() || null,
          operateur: operateur
        });
        auModifie = true;
        toast('Habilitation ajoutée.', 'succes');
        // Vide les champs optionnels, conserve le régime et la catégorie choisis.
        ['numeroAttestation', 'organismeDelivreur', 'dateDebut', 'dateFin'].forEach(function (nom) {
          const champ = form.elements[nom];
          if (champ) champ.value = '';
        });
        await rafraichirListe();
      } catch (erreur) {
        afficherBandeau(erreur && erreur.message ? erreur.message : 'Ajout impossible.');
      } finally {
        boutonAjouter.disabled = false;
      }
    });

    // Révocation (délégation sur la liste : les boutons sont recréés à chaque
    // rechargement). Confirmation via la modale maison avant de révoquer.
    listeHtml.addEventListener('click', async function (evenement) {
      const bouton = evenement.target.closest('[data-action="revoquer"]');
      if (!bouton) return;
      masquerBandeau();
      const confirmation = await confirmer({
        titre: 'Révoquer l’habilitation',
        message: 'Révoquer cette habilitation ? Elle restera au registre (aucune '
          + 'suppression), marquée révoquée et datée.',
        libelleConfirmer: 'Révoquer',
        danger: true
      });
      if (!confirmation) return;
      try {
        await ctx.store.revoquerHabilitation(bouton.dataset.id, operateur);
        auModifie = true;
        toast('Habilitation révoquée.', 'succes');
        await rafraichirListe();
      } catch (erreur) {
        afficherBandeau(erreur && erreur.message ? erreur.message : 'Révocation impossible.');
      }
    });

    racine.querySelector('#hab-fermer').addEventListener('click', function () {
      fermer();
    });

    // Premier remplissage de la liste.
    rafraichirListe();

    // La modale se ferme aussi via la croix / le fond / Échap : on résout la
    // promesse dans tous les cas en observant la disparition du fond.
    const fondModale = racine.closest('.modale-fond');
    const observateur = new MutationObserver(function () {
      if (!document.body.contains(fondModale)) {
        observateur.disconnect();
        resoudre(auModifie);
      }
    });
    observateur.observe(document.body, { childList: true, subtree: true });
  });
}
