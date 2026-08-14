// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — modale « Habilitations F-Gas d'une personne »
// (Phase 2a du chantier B2 : SAISIE + AFFICHAGE uniquement)
//
// On STOCKE et on AFFICHE les habilitations d'une personne, on
// n'ÉVALUE rien : aucune règle de verdict / blocage ici (« qui a le
// droit de faire quoi » viendra en Phase 2b/3). Cette modale ne fait
// qu'appeler les méthodes de contrat déjà posées et testées :
// getHabilitations, createHabilitation, revoquerHabilitation,
// getMentions, createMention, revoquerMention.
//
// Idiomes maison respectés : helper modale() (on cible `racine`,
// jamais document.querySelector('.modale')), erreur affichée dans un
// bandeau sobre (pas de fermeture), rechargement de la liste après
// chaque mutation, esc() sur toute donnée affichée.
// ============================================================

import { modale, toast, confirmer, ICONES } from '../views/communs.js';
import { esc, fmtDate } from '../core/utils.js';
import { REGIMES, CATEGORIES_2008, CATEGORIES_2025, FLUIDES_MENTION } from '../data/habilitations.js';

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

// Libellés des fluides de mention : valeur canonique du store → libellé
// lisible du select et chip courte de la liste (teintes de la charte).
const LIBELLES_FLUIDE_MENTION = {
  CO2: { option: 'CO₂ (R-744)', chip: 'CO₂', classe: 'chip-teal' },
  NH3: { option: 'Ammoniac (R-717)', chip: 'NH₃', classe: 'chip-violet' },
  HC: { option: 'Hydrocarbures (R-290…)', chip: 'HC', classe: 'chip-ambre' }
};

/**
 * Options <option> du select fluide de mention, construites depuis
 * FLUIDES_MENTION (valeurs = jetons canoniques 'CO2' / 'NH3' / 'HC').
 * @returns {string} HTML
 */
function optionsFluideMention() {
  return FLUIDES_MENTION.map(function (f) {
    const info = LIBELLES_FLUIDE_MENTION[f];
    return '<option value="' + esc(f) + '">'
      + esc(info ? info.option : f) + '</option>';
  }).join('');
}

/**
 * Rend une ligne de mention de formation complémentaire. Même anatomie
 * que les habilitations (classes .hab-* réutilisées telles quelles) :
 * les révoquées restent affichées, grisées et datées, sans bouton.
 * @param {object} m — mention (copie renvoyée par le store)
 * @returns {string} HTML
 */
function ligneMention(m) {
  const revoquee = !m.actif;
  const classe = revoquee ? ' hab-revoquee' : '';
  const info = LIBELLES_FLUIDE_MENTION[m.fluideMention]
    || { option: m.fluideMention, chip: m.fluideMention, classe: 'chip-gris' };

  const chipFluide = '<span class="chip ' + info.classe + '">' + esc(info.chip) + '</span>';
  const chipEtat = revoquee
    ? '<span class="chip chip-gris">Révoquée</span>'
    : '<span class="chip chip-vert">Active</span>';

  const meta = [];
  if (m.numeroAttestation) {
    meta.push('N° <span class="mono">' + esc(m.numeroAttestation) + '</span>');
  }
  if (m.organismeDelivreur) {
    meta.push(esc(m.organismeDelivreur));
  }
  if (m.dateDebut || m.dateFin) {
    meta.push(esc(fmtDate(m.dateDebut)) + ' → ' + esc(fmtDate(m.dateFin)));
  }
  const metaHtml = meta.length
    ? '<div class="hab-meta">' + meta.join(' · ') + '</div>'
    : '<div class="hab-meta">Aucune précision saisie.</div>';

  const noteRevoc = revoquee
    ? '<div class="hab-revoc-note">Révoquée le ' + esc(fmtDate(m.dateRevocation)) + '</div>'
    : '';

  const actions = revoquee ? ''
    : '<div class="hab-item-actions">'
      + '<button type="button" class="btn btn-danger-contour btn-petit" '
      + 'data-action="revoquer-mention" data-id="' + esc(m.id) + '" '
      + 'aria-label="Révoquer la mention ' + esc(info.option) + '">'
      + 'Révoquer</button>'
      + '</div>';

  return '<div class="hab-item' + classe + '">'
    + '<div class="hab-item-corps">'
    + '<div class="hab-item-haut">'
    + chipFluide
    + chipEtat
    + '</div>'
    + metaHtml
    + noteRevoc
    + '</div>'
    + actions
    + '</div>';
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
  // L4/Q3 (RN-4) : la remise à niveau d'une 2008 se LIT sur la ligne — et
  // son absence se dit (c'est elle qui conditionne la reconnaissance après
  // le 12/03/2029, alerte alr-remise-niveau-).
  if (h.regime === '2008') {
    meta.push(h.remiseNiveauLe
      ? 'Remise à niveau le ' + esc(fmtDate(h.remiseNiveauLe))
        + (h.remiseNiveauOrganisme ? ' (' + esc(h.remiseNiveauOrganisme) + ')' : '')
      : 'Remise à niveau : à faire avant le 12/03/2029');
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
 * Construit le contenu de la modale : liste des habilitations (remplie
 * après ouverture) et formulaire d'ajout, puis même duo pour les
 * mentions de formation complémentaire.
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
    + 'Régime 2008 : plus de délivrance après le 31/12/2026, reconnu '
    + 'jusqu’au 12/03/2029 puis seulement avec remise à niveau · '
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

    // L4/Q3 (RN-4) — remise à niveau ponctuelle des attestations 2008 :
    // exigée au plus tard le 12/03/2029, sans quoi l'attestation cesse
    // d'être reconnue (arrêté du 21/11/2025, art. 7). Champs libres — le
    // store reste seul juge ; sans objet pour une catégorie 2025.
    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="remiseNiveauLe">'
    + '<label for="hab-remise-date">Remise à niveau (régime 2008)</label>'
    + '<input type="date" id="hab-remise-date" name="remiseNiveauLe">'
    + '</div>'
    + '<div class="champ" data-champ="remiseNiveauOrganisme">'
    + '<label for="hab-remise-organisme">Organisme de la remise à niveau</label>'
    + '<input type="text" id="hab-remise-organisme" '
    + 'name="remiseNiveauOrganisme" maxlength="120">'
    + '</div>'
    + '</div>'
    + '<p class="hab-vide">Une attestation 2008 sans remise à niveau '
    + 'enregistrée au 12/03/2029 n’est plus reconnue (examen à repasser).</p>'

    + '<div class="hab-form-actions">'
    + '<button type="button" id="hab-ajouter" class="btn btn-primaire btn-petit">'
    + ICONES.plus + '<span>Ajouter</span></button>'
    + '</div>'

    + '</form>'

    + '<div class="hab-sous-titre">Mentions de formation complémentaire</div>'

    + '<p class="hab-vide">'
    + 'Une mention étend le champ d’intervention à un fluide (CO₂, ammoniac, '
    + 'hydrocarbures) — typiquement un stage complémentaire. '
    + 'Elle reste au registre une fois révoquée.'
    + '</p>'

    + '<div id="men-liste" class="hab-liste"></div>'

    + '<div id="men-bandeau-erreur" class="bandeau-erreur" hidden></div>'

    + '<form id="men-form" class="formulaire" novalidate>'

    + '<div class="champ" data-champ="fluideMention">'
    + '<label for="men-fluide">Fluide</label>'
    + '<select id="men-fluide" name="fluideMention">' + optionsFluideMention() + '</select>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="numeroAttestation">'
    + '<label for="men-num">N° d’attestation</label>'
    + '<input type="text" id="men-num" name="numeroAttestation" maxlength="60">'
    + '</div>'
    + '<div class="champ" data-champ="organismeDelivreur">'
    + '<label for="men-organisme">Organisme délivreur</label>'
    + '<input type="text" id="men-organisme" name="organismeDelivreur" maxlength="120">'
    + '</div>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="dateDebut">'
    + '<label for="men-debut">Date de début</label>'
    + '<input type="date" id="men-debut" name="dateDebut">'
    + '</div>'
    + '<div class="champ" data-champ="dateFin">'
    + '<label for="men-fin">Date de fin</label>'
    + '<input type="date" id="men-fin" name="dateFin">'
    + '</div>'
    + '</div>'

    + '<div class="hab-form-actions">'
    + '<button type="button" id="men-ajouter" class="btn btn-primaire btn-petit">'
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
          remiseNiveauLe: String(donnees.get('remiseNiveauLe') || '').trim() || null,
          remiseNiveauOrganisme:
            String(donnees.get('remiseNiveauOrganisme') || '').trim() || null,
          operateur: operateur
        });
        auModifie = true;
        toast('Habilitation ajoutée.', 'succes');
        // Vide les champs optionnels, conserve le régime et la catégorie choisis.
        ['numeroAttestation', 'organismeDelivreur', 'dateDebut', 'dateFin',
          'remiseNiveauLe', 'remiseNiveauOrganisme'].forEach(function (nom) {
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

    // --------------------------------------------------------
    // Mentions de formation complémentaire : même trio que les
    // habilitations (liste / ajout / révocation), bandeau séparé.
    // --------------------------------------------------------
    const bandeauErreurMentions = racine.querySelector('#men-bandeau-erreur');
    const listeMentionsHtml = racine.querySelector('#men-liste');

    function masquerBandeauMentions() {
      bandeauErreurMentions.hidden = true;
      bandeauErreurMentions.textContent = '';
    }

    function afficherBandeauMentions(message) {
      bandeauErreurMentions.textContent = message;
      bandeauErreurMentions.hidden = false;
    }

    // Recharge la liste des mentions de la personne. Le store rend déjà
    // les mentions triées (CO2 → NH3 → HC puis dateFin décroissante) :
    // le filtre par personne conserve cet ordre.
    async function rafraichirListeMentions() {
      const toutes = await ctx.store.getMentions();
      const propres = toutes.filter(function (m) { return m.personneId === personneId; });
      if (propres.length === 0) {
        listeMentionsHtml.innerHTML =
          '<p class="hab-vide">Aucune mention pour cette personne.</p>';
        return;
      }
      listeMentionsHtml.innerHTML = propres.map(ligneMention).join('');
    }

    // Ajout d'une mention.
    const boutonAjouterMention = racine.querySelector('#men-ajouter');
    boutonAjouterMention.addEventListener('click', async function () {
      masquerBandeauMentions();
      const form = racine.querySelector('#men-form');
      const donnees = new FormData(form);
      const fluideChoisi = String(donnees.get('fluideMention') || '');

      // Anti-doublon CONSEIL (jamais bloquant) : une mention du même fluide
      // déjà ACTIVE pour cette personne → confirmation avant d'ajouter (le
      // renouvellement reste légitime : cumul au registre, patron
      // habilitations — rien n'est jamais supprimé ni écrasé).
      try {
        const dejaActive = (await ctx.store.getMentions()).some(function (m) {
          return m.personneId === personneId && m.actif
            && m.fluideMention === fluideChoisi;
        });
        if (dejaActive) {
          const info = LIBELLES_FLUIDE_MENTION[fluideChoisi];
          const nomFluide = info ? info.option : fluideChoisi;
          const poursuivre = await confirmer({
            titre: 'Mention déjà active',
            message: 'Une mention « ' + nomFluide + ' » active existe déjà '
              + 'pour cette personne. Ajouter quand même (renouvellement : '
              + 'les deux resteront au registre) ?',
            libelleConfirmer: 'Ajouter quand même'
          });
          if (!poursuivre) return;
        }
      } catch (erreur) {
        // La vérification de doublon est un CONSEIL : si la lecture échoue,
        // on n'empêche pas la saisie (le store reste seul juge de l'ajout).
        console.error('Vérification de doublon de mention impossible :', erreur);
      }

      boutonAjouterMention.disabled = true;
      try {
        await ctx.store.createMention({
          personneId: personneId,
          fluideMention: fluideChoisi,
          numeroAttestation: String(donnees.get('numeroAttestation') || '').trim() || null,
          organismeDelivreur: String(donnees.get('organismeDelivreur') || '').trim() || null,
          dateDebut: String(donnees.get('dateDebut') || '').trim() || null,
          dateFin: String(donnees.get('dateFin') || '').trim() || null,
          operateur: operateur
        });
        auModifie = true;
        toast('Mention ajoutée.', 'succes');
        // Vide les champs optionnels, conserve le fluide choisi.
        ['numeroAttestation', 'organismeDelivreur', 'dateDebut', 'dateFin'].forEach(function (nom) {
          const champ = form.elements[nom];
          if (champ) champ.value = '';
        });
        await rafraichirListeMentions();
      } catch (erreur) {
        afficherBandeauMentions(erreur && erreur.message ? erreur.message : 'Ajout impossible.');
      } finally {
        boutonAjouterMention.disabled = false;
      }
    });

    // Révocation d'une mention (délégation : les boutons sont recréés à
    // chaque rechargement). Confirmation maison avant de révoquer.
    listeMentionsHtml.addEventListener('click', async function (evenement) {
      const bouton = evenement.target.closest('[data-action="revoquer-mention"]');
      if (!bouton) return;
      masquerBandeauMentions();
      const confirmation = await confirmer({
        titre: 'Révoquer la mention',
        message: 'Révoquer cette mention ? Elle restera au registre (aucune '
          + 'suppression), marquée révoquée et datée.',
        libelleConfirmer: 'Révoquer',
        danger: true
      });
      if (!confirmation) return;
      try {
        await ctx.store.revoquerMention(bouton.dataset.id, operateur);
        auModifie = true;
        toast('Mention révoquée.', 'succes');
        await rafraichirListeMentions();
      } catch (erreur) {
        afficherBandeauMentions(erreur && erreur.message ? erreur.message : 'Révocation impossible.');
      }
    });

    racine.querySelector('#hab-fermer').addEventListener('click', function () {
      fermer();
    });

    // Premier remplissage des deux listes.
    rafraichirListe();
    rafraichirListeMentions();

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
