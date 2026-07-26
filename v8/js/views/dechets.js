// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — vue « Déchets / remise en filière » (Phase C, SPEC §5.8)
// Chaîne complète : récupération → décision (réutilisable / à
// analyser / déchet) → suivi interne de remise en filière →
// enlèvement → sortie du stock.
// ⚠ Lot B2 : le suivi interne NE REMPLACE PAS le bordereau de suivi
// de déchets dématérialisé obligatoire (mention permanente ci-dessous).
// ============================================================

import { enteteVue, chipStatut, tableau, toast, modale, ICONES } from './communs.js';
import { esc, fmtNombre, fmtDate } from '../core/utils.js';
import { ouvrirFormBsff } from '../modales/bsff-form.js';
import { zonePiecesJointes } from '../composants/pieces-jointes.js';
import {
  LIBELLE_SUIVI, MENTION_BORDEREAU_OFFICIEL, LIBELLE_BORDEREAU_EXTERNE,
  MENTION_PIECE_NON_PROBANTE
} from '../data/remise-filiere.js';

export const titre = 'Déchets / remise en filière';

/* ============================================================
   Décision sur le fluide récupéré : libellés + teintes de chip
   (table propre à cette vue : ce ne sont pas des statuts machine)
   ============================================================ */

const LIBELLES_DECISION = {
  REUTILISABLE: { libelle: 'Réutilisable', classe: 'chip-vert' },
  A_ANALYSER:   { libelle: 'À analyser',   classe: 'chip-ambre' },
  DECHET:       { libelle: 'Déchet',       classe: 'chip-rouge' }
};

/**
 * Chip de décision sur le fluide récupéré. Décision absente → chip
 * grise « — » (aucune décision prise pour le moment).
 * @param {string|null|undefined} decision
 * @returns {string} HTML
 */
function chipDecision(decision) {
  const connue = LIBELLES_DECISION[decision];
  if (connue) {
    return '<span class="chip ' + connue.classe + '">' + esc(connue.libelle) + '</span>';
  }
  return '<span class="chip chip-gris">—</span>';
}

/* ============================================================
   Styles propres à la vue
   ============================================================ */

const STYLES_VUE = `
<style>
  .vue-dechets {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .carte-recup {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .recup-haut {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .recup-fluide {
    font-family: var(--police-titres);
    font-size: 22px;
    font-weight: 700;
    color: var(--texte);
  }
  .recup-masse {
    font-size: 14px;
    font-weight: 600;
    color: var(--texte-2);
  }
  .recup-detail {
    font-size: 12px;
    color: var(--texte-3);
  }
  .recup-garde {
    font-size: 12px;
    font-weight: 600;
  }
  .recup-garde-depassee {
    color: var(--danger);
  }
  .recup-garde-ok {
    color: var(--texte-3);
    font-weight: 400;
  }
  .recup-pied {
    display: flex;
    gap: 8px;
    margin-top: 4px;
    padding-top: 12px;
    border-top: 1px solid var(--bordure-2);
  }
</style>`;

/* ============================================================
   Section 1 : fluides récupérés en attente
   ============================================================ */

/**
 * Une bouteille de récupération est « en attente » tant qu'elle
 * contient du fluide (masse > 0) — qu'une décision ait déjà été
 * prise ou non.
 * @param {object[]} bouteilles
 * @returns {object[]}
 */
function bouteillesRecupPendantes(bouteilles) {
  return bouteilles.filter((b) => b.type === 'RECUPERATION' && b.masseNetteKg > 0);
}

/**
 * Carte d'une bouteille de fluide récupéré en attente de décision
 * ou de sortie de stock.
 * @param {object} b - bouteille
 * @param {string} jour - date du jour ISO, pour comparer la garde
 * @returns {string} HTML
 */
function carteRecuperation(b, jour) {
  const gardeDepassee = Boolean(b.dateLimiteGarde && b.dateLimiteGarde < jour);
  const infoGarde = b.decisionFluide === 'DECHET'
    ? '<div class="recup-garde ' + (gardeDepassee ? 'recup-garde-depassee' : 'recup-garde-ok') + '">'
      + (gardeDepassee ? ICONES.alerte : '')
      + 'Date limite de garde : ' + esc(fmtDate(b.dateLimiteGarde))
      + (gardeDepassee ? ' — dépassée' : '')
      + '</div>'
    : '';

  const boutonBsff = b.decisionFluide === 'DECHET'
    ? '<button type="button" class="btn btn-marine btn-petit" data-action="creer-bsff" data-id="' + esc(b.id) + '">'
      + 'Enregistrer la remise en filière</button>'
    : '';

  // IM-7 : la décision « déchet » est réversible (store) — le bouton
  // change de libellé pour le dire, la même modale re-décide
  const libelleDecider = b.decisionFluide === 'DECHET'
    ? 'Revenir sur la décision'
    : 'Décider';

  return '<article class="carte carte-recup">'
    + '<div class="recup-haut">'
    + '<span class="recup-fluide mono">' + esc(b.fluide) + '</span>'
    + chipDecision(b.decisionFluide)
    + '</div>'
    + '<div class="recup-masse mono">' + esc(fmtNombre(b.masseNetteKg, 2)) + ' kg</div>'
    + '<div class="recup-detail">Bouteille ' + esc(b.code)
    + (b.numeroReel ? ' · n° ' + esc(b.numeroReel) : '') + '</div>'
    + '<div class="recup-detail">Dernière entrée : ' + esc(fmtDate(b.datePesee || b.dateEntree)) + '</div>'
    + infoGarde
    + '<div class="recup-pied">'
    + '<button type="button" class="btn btn-secondaire btn-petit" data-action="decider" data-id="' + esc(b.id) + '">'
    + esc(libelleDecider) + '</button>'
    + boutonBsff
    + '</div>'
    + '</article>';
}

/* ============================================================
   Section 2 : tableau des suivis internes de remise en filière
   ============================================================ */

/**
 * Ligne de tableau pour un BSFF.
 * @param {object} bsff
 * @returns {string} HTML
 */
const LIBELLE_ISSUE = {
  RECYCLAGE: 'Recyclage', REGENERATION: 'Régénération',
  DESTRUCTION: 'Destruction', AUTRE: 'Autre'
};

function ligneBsff(bsff, aUnePiece) {
  // ⚠ Lot B2 : l'écran dit ce qu'il CONSTATE — aucune pièce jointe à ce
  // suivi. Il ne dit pas que l'issue serait fausse, et la masse reste
  // déclarée dans sa rubrique : c'est le dossier qui est incomplet.
  const issue = bsff.issueTraitement
    ? '<strong>' + esc(LIBELLE_ISSUE[bsff.issueTraitement]
        || bsff.issueTraitement) + '</strong>'
      + (bsff.installationTraitement
        ? '<br><span class="mono issue-inst">'
          + esc(bsff.installationTraitement) + '</span>' : '')
      + (aUnePiece ? ''
        : '<br><span class="issue-absente">aucune pièce jointe — '
          + 'justificatif à produire</span>')
    : '<span class="issue-absente">Non attestée</span>';
  const action = '<button type="button" class="btn btn-contour btn-petit" '
    + 'data-action="attester-issue" data-id="' + esc(bsff.id) + '">'
    + (bsff.issueTraitement ? 'Modifier l’issue' : 'Attester l’issue')
    + '</button>';
  // Lot B2 : le bordereau OFFICIEL a sa propre colonne — son absence se
  // voit (« non reporté »), elle ne se déduit pas d'un numéro interne.
  const externe = bsff.bordereauExterne
    ? '<span class="mono">' + esc(bsff.bordereauExterne) + '</span>'
    : '<span class="issue-absente">non reporté</span>';
  return '<tr>'
    + '<td class="mono">' + esc(bsff.numeroBsff) + '</td>'
    + '<td>' + externe + '</td>'
    + '<td>' + esc(fmtDate(bsff.dateRemise)) + '</td>'
    + '<td>' + esc(bsff.bouteilleCode) + '</td>'
    + '<td class="mono">' + esc(bsff.fluide) + '</td>'
    + '<td class="align-droite mono">' + esc(fmtNombre(bsff.masseRemiseKg, 2)) + ' kg</td>'
    + '<td>' + esc(bsff.transporteur || '—') + '</td>'
    + '<td>' + esc(bsff.installationDestination || '—') + '</td>'
    + '<td>' + issue + '</td>'
    + '<td class="no-print">' + action + '</td>'
    + '</tr>';
}

/**
 * Modale d'attestation de l'ISSUE de traitement final d'un BSFF (P0-8).
 * Corrige BSFF ≠ destruction : seule une issue « destruction » attestée
 * (avec installation) alimente la rubrique 9 de la déclaration.
 */
function ouvrirAttestationIssue(ctx, bsff) {
  const opts = ['RECYCLAGE', 'REGENERATION', 'DESTRUCTION', 'AUTRE']
    .map((v) => '<option value="' + v + '"'
      + (bsff.issueTraitement === v ? ' selected' : '') + '>'
      + esc(LIBELLE_ISSUE[v]) + '</option>').join('');
  const contenuHtml =
    '<p class="modale-intro">Suivi interne <strong>' + esc(bsff.numeroBsff)
    + '</strong> — ' + esc(fmtNombre(bsff.masseRemiseKg, 2)) + ' kg de '
    + esc(bsff.fluide) + '. Attestez la <strong>nature du traitement '
    + 'final</strong> tel que l’opérateur agréé la certifie.</p>'
    // ⚠ Lot B2 — l'écran dit la suite AVANT la saisie : la masse sera
    // déclarée dans sa rubrique, et l'absence de pièce sera signalée.
    + '<div class="bandeau-avertissement">' + ICONES.alerte
    + '<span>La masse sera comptée dans la rubrique correspondante de la '
    + 'déclaration annuelle. Si aucune <strong>pièce justificative</strong> '
    + 'n’est jointe à ce suivi (certificat de l’installation, bordereau '
    + 'officiel), la déclaration signalera une anomalie : le justificatif '
    + 'reste à produire en cas de contrôle. '
    // ⚠ Revue B2 (important 4) : ne JAMAIS laisser croire qu’une pièce
    // jointe prouve l’issue — le logiciel les COMPTE, il ne les lit pas.
    + esc(MENTION_PIECE_NON_PROBANTE) + '</span>'
    + '</div>'
    + '<label class="champ-label">Issue de traitement'
    + '<select id="issue-select">' + opts + '</select></label>'
    + '<label class="champ-label">Installation de traitement '
    + '(obligatoire pour régénération / destruction)'
    + '<input type="text" id="issue-installation" value="'
    + esc(bsff.installationTraitement || '') + '"></label>'
    + '<label class="champ-label">N° de certificat (facultatif)'
    + '<input type="text" id="issue-certificat" value="'
    + esc(bsff.certificatTraitement || '') + '"></label>'
    + '<div id="zone-erreur-issue"></div>';
  const actionsHtml =
    '<button type="button" class="btn btn-contour" data-action="annuler">Annuler</button>'
    + '<button type="button" class="btn btn-marine" data-action="valider">Attester</button>';
  const instance = modale({ titre: 'Attester le traitement final',
    contenuHtml, actionsHtml });
  const racine = document.getElementById('zone-modales') || document.body;
  const zoneErreur = racine.querySelector('#zone-erreur-issue');
  racine.querySelector('[data-action="annuler"]')
    .addEventListener('click', function () { instance.fermer(); });
  racine.querySelector('[data-action="valider"]')
    .addEventListener('click', async function () {
      zoneErreur.innerHTML = '';
      try {
        const u = await ctx.store.getUtilisateurCourant();
        await ctx.store.attesterIssueBsff(bsff.id, {
          issueTraitement: racine.querySelector('#issue-select').value,
          installationTraitement: racine.querySelector('#issue-installation').value,
          certificatTraitement:
            racine.querySelector('#issue-certificat').value || null,
          operateur: u.prenom + ' ' + u.nom
        });
        toast('Traitement final attesté.', 'succes');
        // ⚠ Lot B2 : on enchaîne SUR la pièce justificative — c'est elle
        // qu'un contrôle demandera. La modale ne se ferme pas sur la seule
        // affirmation. Piège historique du projet : JAMAIS de sélecteur
        // global sur « .modale » — on interroge la boîte de CET appel.
        const corps = instance.racine.querySelector('.modale-corps');
        const actions = instance.racine.querySelector('.modale-actions');
        if (corps) {
          corps.innerHTML = '<p class="modale-intro">Joignez la '
            + '<strong>pièce justificative</strong> du traitement '
            + '(certificat de l’installation, bordereau officiel). Sans '
            + 'elle, la déclaration annuelle signalera une anomalie sur '
            + 'cette masse.</p><div id="zone-pj-issue"></div>';
        }
        if (actions) {
          actions.innerHTML = '<button type="button" '
            + 'class="btn btn-marine btn-bloc" data-action="terminer">'
            + 'Terminer</button>';
          actions.querySelector('[data-action="terminer"]')
            .addEventListener('click', function () {
              instance.fermer();
              if (typeof ctx.rafraichir === 'function') ctx.rafraichir();
            });
        }
        zonePiecesJointes(instance.racine.querySelector('#zone-pj-issue'), ctx, {
          entiteType: 'BSFF', entiteId: bsff.id, categorie: 'CERTIFICAT'
        });
        return;
      } catch (erreur) {
        zoneErreur.innerHTML = '<div class="bandeau-erreur">' + ICONES.alerte
          + '<span>' + esc(erreur.message
            || 'Impossible d’attester cette issue.') + '</span></div>';
      }
    });
}

/* ============================================================
   Modale de décision sur le fluide récupéré
   ============================================================ */

/**
 * Ouvre la modale de décision (réutilisable / à analyser / déchet)
 * pour une bouteille de fluide récupéré.
 * @param {{ store: object, naviguer: function, rafraichir?: function }} ctx
 * @param {object} bouteille
 */
function ouvrirDecision(ctx, bouteille) {
  const decisionCourante = bouteille.decisionFluide || null;

  // IM-7 : revenir sur une décision « déchet » remet le fluide en
  // stock utilisable et annule le délai de garde (store réversible)
  const bandeauRetour = decisionCourante === 'DECHET'
    ? '<div class="bandeau-avertissement">'
      + '<span>Cette bouteille est déclarée déchet. Choisir « Réutilisable » '
      + 'ou « À analyser » annule l’état déchet : le fluide revient en stock '
      + 'et le délai de garde est effacé.</span></div>'
    : '';

  const contenuHtml = ''
    + '<p class="modale-intro">Bouteille <strong>' + esc(bouteille.code) + '</strong>'
    + ' · Fluide <span class="mono">' + esc(bouteille.fluide) + '</span>'
    + ' · <span class="mono">' + esc(fmtNombre(bouteille.masseNetteKg, 2)) + ' kg</span></p>'
    + bandeauRetour
    + '<div id="zone-erreur-decision"></div>'
    + '<div class="grille-form-2">'
    + '<button type="button" class="carte-choix' + (decisionCourante === 'REUTILISABLE' ? ' selectionnee' : '')
    + '" data-decision="REUTILISABLE">'
    + '<strong>Réutilisable</strong><span>Fluide propre, remis en stock utilisable</span>'
    + '</button>'
    + '<button type="button" class="carte-choix' + (decisionCourante === 'A_ANALYSER' ? ' selectionnee' : '')
    + '" data-decision="A_ANALYSER">'
    + '<strong>À analyser</strong><span>Qualité incertaine, analyse à faire avant décision</span>'
    + '</button>'
    + '<button type="button" class="carte-choix' + (decisionCourante === 'DECHET' ? ' selectionnee' : '')
    + '" data-decision="DECHET">'
    + '<strong>Déchet</strong><span>Fluide non réutilisable, direction filière déchets</span>'
    + '</button>'
    + '</div>';

  const actionsHtml = ''
    + '<button type="button" class="btn btn-contour" data-action="annuler">Annuler</button>'
    + '<button type="button" class="btn btn-marine" data-action="valider" disabled>'
    + ICONES.coche + '<span>Valider la décision</span></button>';

  const instance = modale({
    titre: 'Décider du fluide récupéré',
    contenuHtml,
    actionsHtml
  });

  const racine = document.getElementById('zone-modales') || document.body;
  const zoneErreur = racine.querySelector('#zone-erreur-decision');
  const boutonValider = racine.querySelector('[data-action="valider"]');
  const boutonAnnuler = racine.querySelector('[data-action="annuler"]');
  let decisionChoisie = decisionCourante;

  if (decisionChoisie) boutonValider.disabled = false;

  function afficherErreur(message) {
    zoneErreur.innerHTML = '<div class="bandeau-erreur">' + ICONES.alerte
      + '<span>' + esc(message) + '</span></div>';
  }

  racine.querySelectorAll('.carte-choix[data-decision]').forEach(function (carte) {
    carte.addEventListener('click', function () {
      racine.querySelectorAll('.carte-choix[data-decision]').forEach(function (autre) {
        autre.classList.remove('selectionnee');
      });
      carte.classList.add('selectionnee');
      decisionChoisie = carte.getAttribute('data-decision');
      boutonValider.disabled = false;
    });
  });

  boutonAnnuler.addEventListener('click', function () {
    instance.fermer();
  });

  boutonValider.addEventListener('click', async function () {
    if (!decisionChoisie) return;
    zoneErreur.innerHTML = '';
    try {
      const utilisateur = await ctx.store.getUtilisateurCourant();
      const operateur = utilisateur.prenom + ' ' + utilisateur.nom;
      await ctx.store.deciderFluideRecupere(bouteille.id, decisionChoisie, operateur);
      toast('Décision enregistrée.', 'succes');
      instance.fermer();
      if (typeof ctx.rafraichir === 'function') ctx.rafraichir();
    } catch (erreur) {
      afficherErreur(erreur.message || 'Impossible d’enregistrer cette décision.');
    }
  });
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * @param {HTMLElement} conteneur - élément vidé d'avance par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const [bouteilles, bsffListe] = await Promise.all([
    ctx.store.getBouteilles(),
    ctx.store.getBsff()
  ]);
  // Lot B2 : quels suivis portent une pièce justificative (métadonnées
  // seules — la liste de PJ ne descend aucun binaire).
  // ⚠ Revue B2 (mineur 3) — N+1 APPELS RÉSEAU EN SÉRIE. La boucle
  // interrogeait le store suivi par suivi, chacun attendant le précédent :
  // en mode LocalStore, autant d'allers-retours HTTP mis bout à bout à
  // CHAQUE affichage de l'écran. Deux économies, sans toucher au contrat :
  //   · on n'interroge QUE les suivis dont l'issue est attestée — pour les
  //     autres, la réponse ne change rien à l'affichage (voir ligneBsff) ;
  //   · les appels restants partent ENSEMBLE au lieu de s'enchaîner.
  // Retirer les N appels eux-mêmes demanderait une méthode de contrat
  // (listage groupé) : consigné, hors de ce lot.
  const aInterroger = bsffListe.filter((s) => s && s.issueTraitement);
  const reponses = await Promise.all(
    aInterroger.map((s) => ctx.store.listerPiecesJointes('BSFF', s.id)));
  const avecPiece = new Set();
  aInterroger.forEach(function (s, i) {
    const pieces = reponses[i];
    if (pieces && pieces.length > 0) avecPiece.add(s.id);
  });

  const jour = new Date().toISOString().slice(0, 10);
  const enAttente = bouteillesRecupPendantes(bouteilles);

  const entete = enteteVue({
    titre: 'Déchets / remise en filière',
    sousTitre: 'Fluides récupérés : décision, suivi interne de remise en '
      + 'filière et sortie du stock'
  });

  // ⚠ Lot B2 — MENTION PERMANENTE, jamais masquée, jamais repliée :
  // l'écran ne doit pas laisser croire que ce suivi tient lieu de
  // bordereau de suivi de déchets dématérialisé obligatoire.
  const mentionOfficielle = '<div class="bandeau-avertissement">' + ICONES.alerte
    + '<span>' + esc(MENTION_BORDEREAU_OFFICIEL) + '</span></div>';

  // ⚠ Revue B2 (important 4) — la colonne « Traitement final » signale les
  // suivis SANS pièce jointe. Son silence ne doit pas se lire « dossier
  // prouvé » : le logiciel compte les pièces, il ne les lit pas.
  const encartAide = '<div class="encart-aide">'
    + 'Récupération → décision (réutilisable / à analyser / déchet) → '
    + 'suivi interne de remise en filière → enlèvement → sortie du stock.'
    + '<br>' + esc(MENTION_PIECE_NON_PROBANTE)
    + '</div>';

  const sectionRecuperation = '<section class="carte">'
    + '<h3 class="carte-titre">Fluides récupérés en attente</h3>'
    + (enAttente.length > 0
      ? '<div class="grille-3">' + enAttente.map((b) => carteRecuperation(b, jour)).join('') + '</div>'
      : '<div class="etat-vide">' + ICONES.dechets
        + '<p>Aucun fluide récupéré en attente pour le moment.</p></div>')
    + '</section>';

  const sectionBsff = '<section class="carte">'
    + '<h3 class="carte-titre">' + esc(LIBELLE_SUIVI) + '</h3>'
    + tableau({
      colonnes: [
        { cle: 'numero', libelle: 'N° suivi interne' },
        { cle: 'externe', libelle: 'N° bordereau officiel' },
        { cle: 'date', libelle: 'Date remise' },
        { cle: 'bouteille', libelle: 'Bouteille' },
        { cle: 'fluide', libelle: 'Fluide' },
        { cle: 'masse', libelle: 'Masse remise', align: 'droite' },
        { cle: 'transporteur', libelle: 'Transporteur' },
        { cle: 'destination', libelle: 'Destination' },
        { cle: 'issue', libelle: 'Traitement final' },
        { cle: 'action', libelle: '', align: 'droite' }
      ],
      lignesHtml: bsffListe.map((s) => ligneBsff(s, avecPiece.has(s.id)))
    })
    + '</section>';

  conteneur.innerHTML = STYLES_VUE
    + '<div class="vue-contenu vue-dechets anim-fade">'
    + entete
    + mentionOfficielle
    + encartAide
    + sectionRecuperation
    + sectionBsff
    + '</div>';

  conteneur.addEventListener('click', function (evenement) {
    const bouton = evenement.target.closest('[data-action]');
    if (!bouton || !conteneur.contains(bouton)) return;

    const action = bouton.dataset.action;
    const id = bouton.dataset.id;
    const ctxAvecRafraichissement = Object.assign({}, ctx, {
      rafraichir: function () { ctx.naviguer('dechets'); }
    });

    if (action === 'decider') {
      const bouteille = bouteilles.find((b) => b.id === id);
      if (bouteille) ouvrirDecision(ctxAvecRafraichissement, bouteille);
    } else if (action === 'creer-bsff') {
      ouvrirFormBsff(ctxAvecRafraichissement, id);
    } else if (action === 'attester-issue') {
      const bsff = bsffListe.find((b) => b.id === id);
      if (bsff) ouvrirAttestationIssue(ctxAvecRafraichissement, bsff);
    }
  });
}
