// ============================================================
// inerWeb Fluide v8 — vue « Mouvements de fluide »
// Historique des charges, compléments et récupérations, avec
// actions PAR STATUT (CR-1 / CR-2) :
//   BROUILLON → Reprendre (wizard préchargé) · Supprimer ;
//   SOUMIS    → Valider (modale de confirmation) · Rejeter (motif) ;
//   VALIDE    → Visualiser CERFA (sauf transfert) · Annuler
//               (contre-écriture, motif obligatoire) ;
//   ANNULE    → Visualiser CERFA (sauf transfert).
// CF-1 + IM-12 : le bouton CERFA n'apparaît QUE pour les écritures
// figées (VALIDE/ANNULE) d'un type qui produit une fiche (≠ TRANSFERT).
// ============================================================

import { enteteVue, chipStatut, chipType, tableau, modale, toast, ICONES }
  from './communs.js';
import { fmtDate, fmtKg, fmtKgSigne, esc } from '../core/utils.js';
import { ouvrirWizard } from '../wizard/wizard.js';
import { ouvrirCerfa } from '../cerfa/visualiseur.js';
import { ouvrirCorrectionCerfa } from '../cerfa/correcteur.js';
import { ouvrirFeuilleMiseEnService, peutOuvrirFeuilleMiseEnService }
  from '../documents/feuille-mise-en-service.js';

export const titre = 'Mouvements de fluide';

/** Rôles autorisés à valider une écriture (contrat Phase B). */
const ROLES_VALIDEURS = ['REFERENT', 'ENSEIGNANT', 'ADMIN'];

/* ============================================================
   Petits fragments HTML
   ============================================================ */

/** Bandeau d'erreur (rouge), même motif que le wizard. */
function bandeauErreur(message) {
  return '<div class="bandeau-erreur">' + ICONES.alerte
    + '<span>' + esc(message) + '</span></div>';
}

/** Bouton d'action d'une ligne du tableau. */
function boutonLigne(action, libelle, id, classe) {
  return '<button type="button" class="btn ' + classe + ' btn-petit"'
    + ' data-action="' + esc(action) + '" data-id="' + esc(id) + '">'
    + esc(libelle) + '</button>';
}

/**
 * Boutons de la cellule Action, selon le statut du mouvement.
 * @param {object} mv — mouvement (copie du store)
 * @returns {string} HTML
 */
function boutonsAction(mv) {
  const boutons = [];

  if (mv.statut === 'BROUILLON') {
    boutons.push(boutonLigne('reprendre', 'Reprendre', mv.id, 'btn-contour'));
    boutons.push(boutonLigne('supprimer', 'Supprimer', mv.id, 'btn-danger-contour'));

  } else if (mv.statut === 'SOUMIS') {
    boutons.push(boutonLigne('valider', 'Valider', mv.id, 'btn-contour'));
    boutons.push(boutonLigne('rejeter', 'Rejeter', mv.id, 'btn-danger-contour'));

  } else if (mv.statut === 'VALIDE' || mv.statut === 'ANNULE') {
    // CF-1 + IM-12 : CERFA seulement pour les écritures figées d'un
    // type qui produit une fiche (le transfert reste interne au registre)
    if (mv.type !== 'TRANSFERT') {
      boutons.push(boutonLigne('voir-cerfa', 'Visualiser CERFA', mv.id, 'btn-contour'));
      boutons.push(boutonLigne('corriger-cerfa', 'Correction élève', mv.id, 'btn-contour'));
    }
    // CF-1 : feuille de mise en service, uniquement pour un mouvement de
    // type MISE_EN_SERVICE figé (même règle que le bouton CERFA ci-dessus)
    if (peutOuvrirFeuilleMiseEnService(mv)) {
      boutons.push(boutonLigne('feuille-mise-en-service', 'Feuille de mise en service', mv.id, 'btn-contour'));
    }
    if (mv.statut === 'VALIDE') {
      boutons.push(boutonLigne('annuler', 'Annuler', mv.id, 'btn-danger-contour'));
    }
  }

  if (!boutons.length) return '—';
  return '<span style="display:inline-flex;gap:8px;flex-wrap:wrap;'
    + 'justify-content:flex-end">' + boutons.join('') + '</span>';
}

/* ============================================================
   Rendu d'une ligne du tableau
   ============================================================ */

/**
 * CF-7 : libellé de la colonne « Machine » pour une ligne TRANSFERT
 * (pas de machine, le mouvement est entre deux bouteilles) : résout
 * les codes source/destination via la liste des bouteilles de la vue.
 * @param {object} mouvement
 * @param {Map<string, object>} bouteillesParId
 * @returns {string} libellé, ex. « B-01 → B-04 », ou « — » si non résolu
 */
function libelleTransfert(mouvement, bouteillesParId) {
  const src = bouteillesParId.get(mouvement.bouteilleSrcId);
  const dst = bouteillesParId.get(mouvement.bouteilleDstId);
  if (!src && !dst) return '—';
  return (src ? src.code : '—') + ' → ' + (dst ? dst.code : '—');
}

/**
 * Attribut `title` explicitant les DEUX flux d'une récupération (le
 * « − X,XX kg » affiché décrit la machine qui se vide, pas la bouteille
 * qui au contraire se remplit du même montant). Chaîne vide pour tout
 * autre type de mouvement — la valeur affichée n'est jamais modifiée.
 * @param {object} mouvement — objet Mouvement du store (copie)
 * @returns {string} attribut ` title="…"` ou chaîne vide
 */
function titreQuantiteRecuperation(mouvement) {
  const estRecuperation = mouvement.type === 'RECUPERATION_MAINTENANCE'
    || mouvement.type === 'RECUPERATION_DEMANTELEMENT';
  if (!estRecuperation || !Number.isFinite(mouvement.quantiteKg)) return '';
  const gain = fmtKg(Math.abs(mouvement.quantiteKg));
  return ' title="Fluide retiré de la machine ; la bouteille de récupération a gagné +'
    + esc(gain.replace(' kg', '')) + ' kg."';
}

/**
 * Construit la ligne HTML d'un mouvement.
 * @param {object} mouvement — objet Mouvement du store (copie)
 * @param {Map<string, object>} bouteillesParId — bouteilles chargées par la vue
 * @returns {string} HTML `<tr>…</tr>`
 */
function ligneMouvement(mouvement, bouteillesParId) {
  // Quantité signée : vert si charge (positif), violet si récupération (négatif)
  const classeQuantite = mouvement.quantiteKg < 0 ? 'quantite-negative' : 'quantite-positive';

  // Un brouillon issu d'un rejet garde son motif (visible au survol)
  const infoRejet = (mouvement.statut === 'BROUILLON' && mouvement.motifRejet)
    ? ' title="Rejeté : ' + esc(mouvement.motifRejet) + '"'
    : '';

  // CF-7 : un TRANSFERT n'a pas de machine, mais deux bouteilles
  const libelleMachine = mouvement.type === 'TRANSFERT'
    ? libelleTransfert(mouvement, bouteillesParId)
    : (mouvement.machineLabel || '—');

  // Clarté d'affichage : une récupération montre « − X,XX kg » (convention
  // conservée), mais ce chiffre décrit le flux côté MACHINE, pas la
  // bouteille — celle-ci a au contraire GAGNÉ ce fluide. Le titre au
  // survol lève l'ambiguïté sans toucher à la valeur affichée.
  const titreQuantite = titreQuantiteRecuperation(mouvement);

  return '<tr>'
    // Date en mono
    + '<td class="cellule-mono">' + esc(fmtDate(mouvement.date)) + '</td>'
    // Machine en gras (ou « B-01 → B-04 » pour un transfert)
    + '<td><strong>' + esc(libelleMachine) + '</strong></td>'
    // Type de mouvement (chip colorée)
    + '<td>' + chipType(mouvement.type) + '</td>'
    // Quantité signée colorée + code fluide gris
    + '<td class="cellule-mono">'
    + '<span class="' + classeQuantite + '"' + titreQuantite + '>'
    + esc(mouvement.quantiteKg === null ? '—' : fmtKgSigne(mouvement.quantiteKg))
    + '</span>'
    + ' <span style="color:var(--texte-3);font-size:12px">' + esc(mouvement.fluide || '') + '</span>'
    + '</td>'
    // Numéro CERFA en mono turquoise
    + '<td class="cellule-mono" style="color:var(--accent-fort)">'
    + (mouvement.cerfaNumero ? esc(mouvement.cerfaNumero) : '—')
    + '</td>'
    // Statut (chip distincte par statut : gris / ambre / vert / rouge)
    + '<td' + infoRejet + '>' + chipStatut(mouvement.statut) + '</td>'
    // Actions selon le statut (CR-1 / CR-2 / CF-1)
    + '<td class="align-droite">' + boutonsAction(mouvement) + '</td>'
    + '</tr>';
}

/* ============================================================
   État vide
   ============================================================ */

/**
 * Panneau élégant affiché quand aucun mouvement n'est enregistré.
 * @returns {string} HTML
 */
function etatVide() {
  return '<div class="carte">'
    + '<div class="etat-vide">'
    + ICONES.echange
    + '<p><strong>Aucun mouvement enregistré.</strong><br>'
    + 'Les charges, compléments et récupérations de fluide apparaîtront ici.</p>'
    + '</div>'
    + '</div>';
}

/* ============================================================
   Modales d'action (suppression, validation, rejet, contre-écriture)
   ============================================================ */

/** Racine DOM de la modale la plus récente (convention .modale-fond:last-of-type). */
function derniereModale() {
  return document.querySelector('.modale-fond:last-of-type .modale');
}

/** Ligne de rappel « libellé : valeur » dans une modale. */
function ligneRappel(libelle, valeurHtml) {
  return '<div style="display:flex;justify-content:space-between;gap:12px;'
    + 'padding:6px 0;border-bottom:1px solid var(--bordure-2);font-size:13px">'
    + '<span style="color:var(--texte-3)">' + esc(libelle) + '</span>'
    + '<span style="font-weight:600;text-align:right">' + valeurHtml + '</span>'
    + '</div>';
}

/** Rappel synthétique d'un mouvement (numéro, date, type, machine, pesées). */
function rappelMouvement(mv) {
  const lignes = [
    ligneRappel('Numéro', '<span class="cellule-mono">' + esc(mv.numero) + '</span>'),
    ligneRappel('Date', esc(fmtDate(mv.date))),
    ligneRappel('Type', chipType(mv.type))
  ];
  if (mv.machineLabel) lignes.push(ligneRappel('Machine', esc(mv.machineLabel)));
  if (mv.quantiteKg !== null && Number.isFinite(mv.quantiteKg)) {
    lignes.push(ligneRappel('Quantité',
      '<span class="cellule-mono"' + titreQuantiteRecuperation(mv) + '>'
      + esc(fmtKgSigne(mv.quantiteKg)) + '</span>'));
  } else if (Number.isFinite(mv.peseeAvantKg) && Number.isFinite(mv.peseeApresKg)) {
    lignes.push(ligneRappel('Pesées',
      '<span class="cellule-mono">' + esc(fmtKg(mv.peseeAvantKg))
      + ' → ' + esc(fmtKg(mv.peseeApresKg)) + '</span>'));
  }
  if (mv.technicien) lignes.push(ligneRappel('Technicien', esc(mv.technicien)));
  return '<div style="margin-bottom:14px">' + lignes.join('') + '</div>';
}

/**
 * Câble une modale de confirmation : bouton « fermer », bouton
 * « confirmer » qui exécute `action` (les erreurs du store s'affichent
 * en bandeau dans la modale, sans la fermer).
 * @param {{ fermer: () => void }} instance — retour de modale()
 * @param {(boite: HTMLElement) => Promise<void>} action
 */
function cablerConfirmation(instance, action) {
  const boite = derniereModale();
  if (!boite) return;
  const boutonFermer = boite.querySelector('[data-role="fermer"]');
  const boutonConfirmer = boite.querySelector('[data-role="confirmer"]');
  if (boutonFermer) boutonFermer.addEventListener('click', instance.fermer);
  if (!boutonConfirmer) return;

  boutonConfirmer.addEventListener('click', async function () {
    const zoneErreur = boite.querySelector('[data-zone-erreur]');
    if (zoneErreur) zoneErreur.innerHTML = '';
    boutonConfirmer.disabled = true;
    try {
      await action(boite);
    } catch (erreur) {
      boutonConfirmer.disabled = false;
      if (zoneErreur) {
        zoneErreur.innerHTML = bandeauErreur(erreur && erreur.message
          ? erreur.message
          : 'Erreur inattendue.');
      }
    }
  });
}

/** Champ « motif » (textarea) avec libellé, pour rejet et contre-écriture. */
function champMotif(libelle) {
  return '<div class="champ">'
    + '<label for="modale-motif">' + esc(libelle) + '</label>'
    + '<textarea id="modale-motif" rows="3"></textarea>'
    + '</div>';
}

/** Lit le motif saisi dans la modale ; throw si vide (message métier). */
function lireMotif(boite, messageVide) {
  const champ = boite.querySelector('#modale-motif');
  const motif = champ ? String(champ.value).trim() : '';
  if (!motif) throw new Error(messageVide);
  return motif;
}

/** BROUILLON → confirmation puis suppression définitive. */
function ouvrirSuppression(ctx, mv) {
  const instance = modale({
    titre: 'Supprimer le brouillon',
    contenuHtml: rappelMouvement(mv)
      + '<p style="font-size:13px;color:var(--texte-2)">Ce brouillon n’a '
      + 'aucun effet sur les stocks ni sur le registre : sa suppression '
      + 'est définitive et sans conséquence.</p>'
      + '<div data-zone-erreur></div>',
    actionsHtml:
      '<button type="button" class="btn btn-secondaire" data-role="fermer">Annuler</button>'
      + '<button type="button" class="btn btn-danger-contour" data-role="confirmer">Supprimer</button>'
  });
  cablerConfirmation(instance, async function () {
    await ctx.store.supprimerMouvement(mv.id);
    instance.fermer();
    toast('Brouillon ' + mv.numero + ' supprimé.', 'succes');
    ctx.naviguer('mouvements');
  });
}

/** SOUMIS → modale de validation (validateur = utilisateur courant). */
function ouvrirValidation(ctx, mv, utilisateur) {
  const peutValider = Boolean(utilisateur
    && ROLES_VALIDEURS.includes(utilisateur.roleApp));

  const blocValidateur = peutValider
    ? ligneRappel('Validateur',
        esc(utilisateur.prenom + ' ' + utilisateur.nom) + ' '
        + chipStatut(utilisateur.roleApp))
    : bandeauErreur('Votre profil ne permet pas de valider une écriture '
        + '(rôle requis : référent, enseignant ou administrateur).');

  const instance = modale({
    titre: 'Valider le mouvement',
    contenuHtml: rappelMouvement(mv)
      + '<p style="font-size:13px;color:var(--texte-2)">La validation '
      + 'applique les effets sur les stocks et inscrit l’écriture au '
      + 'registre : elle devient définitive (correction uniquement par '
      + 'contre-écriture).</p>'
      + '<div style="margin-top:10px">' + blocValidateur + '</div>'
      + '<div data-zone-erreur style="margin-top:10px"></div>',
    actionsHtml:
      '<button type="button" class="btn btn-secondaire" data-role="fermer">Annuler</button>'
      + (peutValider
        ? '<button type="button" class="btn btn-primaire" data-role="confirmer">Valider</button>'
        : '')
  });
  cablerConfirmation(instance, async function () {
    await ctx.store.validerMouvement(mv.id, utilisateur.id);
    instance.fermer();
    toast('Mouvement ' + mv.numero + ' validé et inscrit au registre.', 'succes');
    ctx.naviguer('mouvements');
  });
}

/** SOUMIS → modale de rejet (motif obligatoire, retour en brouillon). */
function ouvrirRejet(ctx, mv) {
  const instance = modale({
    titre: 'Rejeter le mouvement',
    contenuHtml: rappelMouvement(mv)
      + '<p style="font-size:13px;color:var(--texte-2)">Le mouvement '
      + 'repasse en brouillon avec votre motif : le technicien pourra le '
      + 'reprendre ou le supprimer.</p>'
      + champMotif('Motif du rejet (obligatoire)')
      + '<div data-zone-erreur></div>',
    actionsHtml:
      '<button type="button" class="btn btn-secondaire" data-role="fermer">Annuler</button>'
      + '<button type="button" class="btn btn-danger-contour" data-role="confirmer">Rejeter</button>'
  });
  cablerConfirmation(instance, async function (boite) {
    const motif = lireMotif(boite, 'Motif de rejet obligatoire.');
    await ctx.store.rejeterMouvement(mv.id, motif);
    instance.fermer();
    toast('Mouvement ' + mv.numero + ' rejeté (retour en brouillon).', 'succes');
    ctx.naviguer('mouvements');
  });
}

/** VALIDE → modale d'annulation par contre-écriture (CR-2). */
function ouvrirContreEcriture(ctx, mv, utilisateur) {
  const peutValider = Boolean(utilisateur
    && ROLES_VALIDEURS.includes(utilisateur.roleApp));

  const instance = modale({
    titre: 'Annuler par contre-écriture',
    contenuHtml: rappelMouvement(mv)
      + '<p style="font-size:13px;color:var(--texte-2)"><strong>Le registre '
      + 'ne s’efface jamais.</strong> L’écriture validée reste au registre ; '
      + 'une écriture inverse (quantité opposée) la neutralise. Les stocks '
      + 'et charges reviennent à leur état antérieur.</p>'
      + champMotif('Motif de l’annulation (obligatoire)')
      + (peutValider ? '' : '<div style="margin-top:10px">'
        + bandeauErreur('Votre profil ne permet pas de valider une '
          + 'contre-écriture (rôle requis : référent, enseignant ou '
          + 'administrateur).') + '</div>')
      + '<div data-zone-erreur></div>',
    actionsHtml:
      '<button type="button" class="btn btn-secondaire" data-role="fermer">Annuler</button>'
      + (peutValider
        ? '<button type="button" class="btn btn-danger-contour" data-role="confirmer">'
          + 'Contre-écriture</button>'
        : '')
  });
  cablerConfirmation(instance, async function (boite) {
    const motif = lireMotif(boite, 'Motif d’annulation obligatoire.');
    const contre = await ctx.store.annulerParContreEcriture(
      mv.id, motif, utilisateur.id);
    instance.fermer();
    toast('Écriture ' + mv.numero + ' annulée par la contre-écriture '
      + contre.numero + '.', 'succes');
    ctx.naviguer('mouvements');
  });
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * Rend la vue « Mouvements de fluide ».
 * @param {HTMLElement} conteneur — élément déjà vidé par le routeur
 * @param {{ store: object, naviguer: (vue: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const mouvements = await ctx.store.getMouvements();

  // CF-7 : bouteilles chargées pour résoudre les codes des TRANSFERT
  // (un transfert n'a pas de machine, seulement bouteilleSrcId/DstId)
  const bouteilles = await ctx.store.getBouteilles();
  const bouteillesParId = new Map(bouteilles.map((b) => [b.id, b]));

  // Utilisateur courant : validateur pressenti des modales (Phase B :
  // toujours le référent ; l'authentification réelle arrive en Phase E)
  let utilisateur = null;
  try {
    utilisateur = await ctx.store.getUtilisateurCourant();
  } catch {
    // Aucun référent : les modales afficheront le refus de validation
  }

  const parId = new Map(mouvements.map((mv) => [mv.id, mv]));

  // ---- En-tête : titre, sous-titre, bouton d'action principal ----
  const entete = enteteVue({
    titre,
    sousTitre: 'Historique des charges, compléments et récupérations',
    actionsHtml: '<button type="button" class="btn btn-primaire" data-action="nouveau-mouvement">'
      + ICONES.plus + '<span>Nouveau mouvement</span></button>'
  });

  // ---- Corps : tableau des mouvements ou état vide ----
  const corps = mouvements.length
    ? tableau({
        colonnes: [
          { cle: 'date',    libelle: 'Date' },
          { cle: 'machine', libelle: 'Machine' },
          { cle: 'type',    libelle: 'Type' },
          { cle: 'qte',     libelle: 'Qté' },
          { cle: 'cerfa',   libelle: 'CERFA' },
          { cle: 'statut',  libelle: 'Statut' },
          { cle: 'action',  libelle: '', align: 'droite' }
        ],
        lignesHtml: mouvements.map((mv) => ligneMouvement(mv, bouteillesParId))
      })
    : etatVide();

  // Insertion unique dans le conteneur
  conteneur.innerHTML = entete + corps;

  // ---- Écouteurs (délégation unique : le routeur crée un conteneur neuf) ----
  conteneur.addEventListener('click', function (evenement) {
    const bouton = evenement.target.closest('[data-action]');
    if (!bouton || !conteneur.contains(bouton)) return;
    const action = bouton.dataset.action;

    // Bouton « + Nouveau mouvement » : assistant en 6 étapes. Après une
    // fin de parcours réussie, le wizard appelle ctx.naviguer('mouvements'),
    // ce qui force un NOUVEAU rendu de la vue.
    if (action === 'nouveau-mouvement') {
      ouvrirWizard(ctx);
      return;
    }

    const mv = parId.get(bouton.dataset.id);
    if (!mv) return;

    switch (action) {
      case 'voir-cerfa':
        ouvrirCerfa(ctx, { source: 'mouvement', id: mv.id });
        break;
      case 'corriger-cerfa':
        ouvrirCorrectionCerfa(ctx, { source: 'mouvement', id: mv.id });
        break;
      case 'feuille-mise-en-service':
        ouvrirFeuilleMiseEnService(ctx, mv.id);
        break;
      case 'reprendre':
        // CR-1 : rouvre le wizard préchargé avec les données du brouillon
        ouvrirWizard(ctx, { brouillonId: mv.id });
        break;
      case 'supprimer':
        ouvrirSuppression(ctx, mv);
        break;
      case 'valider':
        ouvrirValidation(ctx, mv, utilisateur);
        break;
      case 'rejeter':
        ouvrirRejet(ctx, mv);
        break;
      case 'annuler':
        ouvrirContreEcriture(ctx, mv, utilisateur);
        break;
    }
  });
}
