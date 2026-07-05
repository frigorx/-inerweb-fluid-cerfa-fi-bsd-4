// ============================================================
// inerWeb Fluide — mini-modales « Suivi d'audit » (Phase C)
// Enregistrer un audit organisme, déclarer une non-conformité,
// solder une non-conformité (avec commentaire de preuve).
// ============================================================

import { modale, toast } from '../views/communs.js';
import { esc } from '../core/utils.js';

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
 * Ouvre la mini-modale « Enregistrer un audit ».
 * @param {{ store: object }} ctx
 * @returns {Promise<boolean>} true si un audit a été enregistré
 */
export async function ouvrirFormAudit(ctx) {
  let utilisateur = null;
  try {
    utilisateur = await ctx.store.getUtilisateurCourant();
  } catch {
    // Aucun utilisateur courant : la modale reste utilisable en dégradé
  }

  const contenuHtml = '<form id="form-audit" class="formulaire" novalidate>'
    + '<div id="bandeau-erreur-audit" class="bandeau-erreur" hidden></div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="date">'
    + '<label for="af-date">Date de l’audit *</label>'
    + '<input type="date" id="af-date" name="date">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'
    + '<div class="champ" data-champ="organisme">'
    + '<label for="af-organisme">Organisme *</label>'
    + '<input type="text" id="af-organisme" name="organisme" maxlength="120">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'
    + '</div>'

    + '<div class="champ" data-champ="resultat">'
    + '<label for="af-resultat">Résultat *</label>'
    + '<input type="text" id="af-resultat" name="resultat" maxlength="150" '
    + 'placeholder="Ex. Conforme, Conforme avec 1 remarque…">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="champ" data-champ="remarques">'
    + '<label for="af-remarques">Remarques</label>'
    + '<textarea id="af-remarques" name="remarques" rows="3" maxlength="500"></textarea>'
    + '</div>'
    + '</form>';

  return new Promise(function (resoudre) {
    const { fermer, racine } = modale({
      titre: 'Enregistrer un audit',
      contenuHtml: contenuHtml,
      actionsHtml:
        '<button type="button" id="af-annuler" class="btn btn-secondaire">Annuler</button>'
        + '<button type="button" id="af-enregistrer" class="btn btn-primaire">Enregistrer</button>'
    });
    const bandeauErreur = racine.querySelector('#bandeau-erreur-audit');
    let fermeeParEnregistrement = false;

    racine.querySelector('#af-annuler').addEventListener('click', function () { fermer(); });

    racine.querySelector('#af-enregistrer').addEventListener('click', async function () {
      const form = racine.querySelector('#form-audit');
      const donnees = new FormData(form);
      ['date', 'organisme', 'resultat'].forEach(function (n) { effacerErreur(racine, n); });
      bandeauErreur.hidden = true;

      const date = String(donnees.get('date') || '').trim();
      const organisme = String(donnees.get('organisme') || '').trim();
      const resultat = String(donnees.get('resultat') || '').trim();
      let valide = true;
      if (!date) { marquerErreur(racine, 'date', 'La date est obligatoire.'); valide = false; }
      if (!organisme) { marquerErreur(racine, 'organisme', 'L’organisme est obligatoire.'); valide = false; }
      if (!resultat) { marquerErreur(racine, 'resultat', 'Le résultat est obligatoire.'); valide = false; }
      if (!valide) return;

      const bouton = racine.querySelector('#af-enregistrer');
      bouton.disabled = true;
      try {
        await ctx.store.createAuditOrganisme({
          date: date,
          organisme: organisme,
          resultat: resultat,
          remarques: String(donnees.get('remarques') || '').trim() || null,
          operateur: utilisateur?.id
        });
        toast('Audit enregistré.', 'succes');
        fermeeParEnregistrement = true;
        fermer();
      } catch (erreur) {
        bandeauErreur.textContent = erreur && erreur.message ? erreur.message : 'Enregistrement impossible.';
        bandeauErreur.hidden = false;
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

/**
 * Ouvre la mini-modale « Nouvelle non-conformité ».
 * @param {{ store: object }} ctx
 * @returns {Promise<boolean>} true si enregistrée
 */
export async function ouvrirFormNonConformite(ctx) {
  const audits = await ctx.store.getAuditsOrganisme();
  let utilisateur = null;
  try {
    utilisateur = await ctx.store.getUtilisateurCourant();
  } catch {
    // Aucun utilisateur courant : la modale reste utilisable en dégradé
  }

  const optionsAudits = '<option value="">— Aucun audit lié —</option>'
    + audits.map(function (a) {
        return '<option value="' + esc(a.id) + '">' + esc(a.date) + ' · ' + esc(a.organisme) + '</option>';
      }).join('');

  const contenuHtml = '<form id="form-nc" class="formulaire" novalidate>'
    + '<div id="bandeau-erreur-nc" class="bandeau-erreur" hidden></div>'

    + '<div class="champ" data-champ="description">'
    + '<label for="ncf-description">Description *</label>'
    + '<textarea id="ncf-description" name="description" rows="2" maxlength="300"></textarea>'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="champ" data-champ="actionCorrective">'
    + '<label for="ncf-action">Action corrective</label>'
    + '<textarea id="ncf-action" name="actionCorrective" rows="2" maxlength="300"></textarea>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="echeance">'
    + '<label for="ncf-echeance">Échéance</label>'
    + '<input type="date" id="ncf-echeance" name="echeance">'
    + '</div>'
    + '<div class="champ" data-champ="auditId">'
    + '<label for="ncf-audit">Audit lié</label>'
    + '<select id="ncf-audit" name="auditId">' + optionsAudits + '</select>'
    + '</div>'
    + '</div>'
    + '</form>';

  return new Promise(function (resoudre) {
    const { fermer, racine } = modale({
      titre: 'Nouvelle non-conformité',
      contenuHtml: contenuHtml,
      actionsHtml:
        '<button type="button" id="ncf-annuler" class="btn btn-secondaire">Annuler</button>'
        + '<button type="button" id="ncf-enregistrer" class="btn btn-primaire">Enregistrer</button>'
    });
    const bandeauErreur = racine.querySelector('#bandeau-erreur-nc');
    let fermeeParEnregistrement = false;

    racine.querySelector('#ncf-annuler').addEventListener('click', function () { fermer(); });

    racine.querySelector('#ncf-enregistrer').addEventListener('click', async function () {
      const form = racine.querySelector('#form-nc');
      const donnees = new FormData(form);
      effacerErreur(racine, 'description');
      bandeauErreur.hidden = true;

      const description = String(donnees.get('description') || '').trim();
      if (!description) {
        marquerErreur(racine, 'description', 'La description est obligatoire.');
        return;
      }

      const bouton = racine.querySelector('#ncf-enregistrer');
      bouton.disabled = true;
      try {
        await ctx.store.createNonConformite({
          description: description,
          actionCorrective: String(donnees.get('actionCorrective') || '').trim() || null,
          echeance: String(donnees.get('echeance') || '').trim() || null,
          auditId: String(donnees.get('auditId') || '').trim() || null,
          operateur: utilisateur?.id
        });
        toast('Non-conformité enregistrée.', 'succes');
        fermeeParEnregistrement = true;
        fermer();
      } catch (erreur) {
        bandeauErreur.textContent = erreur && erreur.message ? erreur.message : 'Enregistrement impossible.';
        bandeauErreur.hidden = false;
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

/**
 * Ouvre la mini-modale de confirmation « Solder la non-conformité ».
 * @param {{ store: object }} ctx
 * @param {string} nonConformiteId
 * @returns {Promise<boolean>} true si soldée
 */
export async function ouvrirFormSolderNonConformite(ctx, nonConformiteId) {
  const contenuHtml = '<form id="form-solder" class="formulaire" novalidate>'
    + '<div id="bandeau-erreur-solder" class="bandeau-erreur" hidden></div>'
    + '<div class="champ" data-champ="commentaire">'
    + '<label for="sc-commentaire">Commentaire de solde (preuve de l’action) *</label>'
    + '<textarea id="sc-commentaire" name="commentaire" rows="3" maxlength="300"></textarea>'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'
    + '</form>';

  return new Promise(function (resoudre) {
    const { fermer, racine } = modale({
      titre: 'Solder la non-conformité',
      contenuHtml: contenuHtml,
      actionsHtml:
        '<button type="button" id="sc-annuler" class="btn btn-secondaire">Annuler</button>'
        + '<button type="button" id="sc-confirmer" class="btn btn-primaire">Solder</button>'
    });
    const bandeauErreur = racine.querySelector('#bandeau-erreur-solder');
    let fermeeParEnregistrement = false;

    racine.querySelector('#sc-annuler').addEventListener('click', function () { fermer(); });

    racine.querySelector('#sc-confirmer').addEventListener('click', async function () {
      const commentaire = String(racine.querySelector('#sc-commentaire').value || '').trim();
      effacerErreur(racine, 'commentaire');
      bandeauErreur.hidden = true;
      if (!commentaire) {
        marquerErreur(racine, 'commentaire', 'Le commentaire est obligatoire.');
        return;
      }
      const bouton = racine.querySelector('#sc-confirmer');
      bouton.disabled = true;
      try {
        await ctx.store.solderNonConformite(nonConformiteId, commentaire);
        toast('Non-conformité soldée.', 'succes');
        fermeeParEnregistrement = true;
        fermer();
      } catch (erreur) {
        bandeauErreur.textContent = erreur && erreur.message ? erreur.message : 'Opération impossible.';
        bandeauErreur.hidden = false;
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
