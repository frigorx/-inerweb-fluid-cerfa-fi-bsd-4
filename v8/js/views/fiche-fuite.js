// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — vue « Dossier de fuite » (brique ③)
// Vue hors sidebar, atteinte par la route paramétrée '#/f/<idControle>'
// où l'identifiant est celui du CONTRÔLE d'étanchéité au résultat FUITE
// qui ANCRE le dossier (cf. data/dossiers-fuite.js). Consultation seule :
// synthèse + chronologie décroissante reconstruites depuis les données
// déjà en base (rien n'est stocké de plus), + export ZIP scellé.
// Atteinte depuis le bloc « Fuites » de la fiche machine (fiche-machine.js).
// ============================================================

import { enteteVue, toast, ICONES } from './communs.js';
import { esc, fmtDate, fmtNombre } from '../core/utils.js';
import { construireDossierFuite, LIBELLES_STATUT_FUITE } from '../data/dossiers-fuite.js';
import { telechargerEtSceller } from '../documents/telecharger-dossier.js';
import { genererDossierFuite } from '../documents/dossier-fuite.js';

export const titre = 'Dossier de fuite';

/* ============================================================
   Styles propres à la vue (mêmes classes « fiche- »/« vie- » que
   fiche-machine.js et fiche-bouteille.js pour les blocs partagés,
   plus quelques classes « df- » propres au dossier de fuite)
   ============================================================ */

const STYLES_VUE = `
<style>
  .fiche-retour {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--texte-3);
    text-decoration: none;
  }
  .fiche-retour:hover, .fiche-retour:focus-visible { color: var(--accent); }

  .fiche-section { margin-top: 20px; }
  .fiche-section-titre {
    font-family: var(--police-titres);
    font-size: 15px;
    font-weight: 600;
    color: var(--texte);
    margin: 0 0 10px;
  }
  .fiche-actions { display: flex; flex-wrap: wrap; gap: 10px; }

  /* Bloc « Synthèse » : liste étiquette/valeur, deux colonnes */
  .df-grille {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 24px;
    padding: 16px;
  }
  @media (max-width: 640px) {
    .df-grille { grid-template-columns: 1fr; }
  }
  .fiche-detail-libelle {
    font-size: 10.5px;
    letter-spacing: .03em;
    text-transform: uppercase;
    color: var(--texte-faible);
  }
  .fiche-detail-valeur { font-size: 13.5px; color: var(--texte); margin-top: 2px; }
  .df-retard { color: var(--danger); font-weight: 600; }

  .fiche-alerte {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--bordure-2);
  }
  .fiche-alerte:last-child { border-bottom: none; padding-bottom: 2px; }
  .fiche-alerte-titre { font-size: 12.5px; font-weight: 600; color: var(--texte); }
  .fiche-alerte-detail { margin-top: 2px; font-size: 11.5px; color: var(--texte-3); }

  /* Frise « chronologie du dossier » (même patron que « la vie de la
     bouteille » de fiche-bouteille.js) */
  .vie-liste { list-style: none; margin: 0; padding: 0; }
  .vie-evenement {
    display: flex;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--bordure-2);
  }
  .vie-evenement:last-child { border-bottom: none; }
  .vie-pastille {
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-top: 5px;
    background: var(--texte-faible);
  }
  .vie-pastille.entree    { background: var(--succes); }
  .vie-pastille.sortie    { background: var(--danger-2); }
  .vie-pastille.detection { background: var(--danger); }
  .vie-pastille.reparation{ background: var(--avert-icone); }
  .vie-pastille.cloture   { background: var(--succes); }
  .vie-date {
    flex: none;
    width: 118px;
    font-family: var(--police-mono);
    font-size: 11.5px;
    color: var(--texte-3);
    padding-top: 2px;
  }
  .vie-corps { min-width: 0; flex: 1; }
  .vie-titre { font-size: 13px; font-weight: 600; color: var(--texte); }
  .vie-titre .chip { margin-left: 8px; }
  .vie-detail { margin-top: 2px; font-size: 12px; color: var(--texte-3); }
  .vie-variation { font-family: var(--police-mono); font-weight: 600; }
  .vie-variation.entree { color: var(--succes); }
  .vie-variation.sortie { color: var(--danger-2); }
  .vie-annule { opacity: .62; }
</style>`;

/* ============================================================
   Chip de statut du dossier (OUVERTE = rouge, REPAREE = ambre,
   FERMEE = vert — mêmes classes de chip que le reste de la charte,
   même idiome que CHIPS_STATUT_BOUTEILLE de fiche-bouteille.js).
   ============================================================ */

const CLASSES_STATUT_FUITE = {
  OUVERTE: 'chip-rouge',
  REPAREE: 'chip-ambre',
  FERMEE: 'chip-vert'
};

function chipStatutFuite(statut) {
  const classe = CLASSES_STATUT_FUITE[statut] || 'chip-gris';
  const libelle = LIBELLES_STATUT_FUITE[statut] || statut;
  return '<span class="chip ' + classe + '">' + esc(libelle) + '</span>';
}

/* ============================================================
   Bloc 1 — Synthèse
   ============================================================ */

/** Une paire libellé/valeur ; omise si la valeur est vide/nulle. */
function ligneDetail(libelle, valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return '';
  return '<div>'
    + '<div class="fiche-detail-libelle">' + esc(libelle) + '</div>'
    + '<div class="fiche-detail-valeur">' + esc(valeur) + '</div>'
    + '</div>';
}

function blocSynthese(dossier) {
  const detection = ligneDetail('Détection', fmtDate(dossier.dateDetection))
    + ligneDetail('Localisation', dossier.localisation || 'Non précisée')
    + ligneDetail('Méthode', dossier.methode)
    + ligneDetail('Opérateur', dossier.operateur);

  const reparation = dossier.reparation
    ? ligneDetail('Réparation', fmtDate(dossier.reparation.date))
      + ligneDetail('Nature de la réparation', dossier.reparation.nature)
      + ligneDetail('Réparateur', dossier.reparation.reparateur)
    : ligneDetail('Réparation', 'Non tracée');

  const echeanceHtml = dossier.echeanceControleSuivi
    ? '<div class="fiche-detail-valeur' + (dossier.suiviEnRetard ? ' df-retard' : '') + '">'
      + esc(fmtDate(dossier.echeanceControleSuivi))
      + (dossier.suiviEnRetard ? ' — contrôle de suivi en retard' : '')
      + '</div>'
    : '<div class="fiche-detail-valeur">—</div>';

  const cloture =
    '<div><div class="fiche-detail-libelle">Clôture</div>'
    + '<div class="fiche-detail-valeur' + (dossier.clotureEnRetard ? ' df-retard' : '') + '">'
    + (dossier.dateFermeture ? esc(fmtDate(dossier.dateFermeture)) : 'En attente')
    + (dossier.clotureEnRetard
      ? ' — clôturée en retard (' + dossier.retardClotureJours
        + ' jour' + (dossier.retardClotureJours > 1 ? 's' : '')
        + ' après l’échéance)'
      : '')
    + '</div></div>'
    + '<div><div class="fiche-detail-libelle">Échéance du contrôle de suivi</div>' + echeanceHtml + '</div>'
    + ligneDetail('Durée du dossier', dossier.dureeJours + ' jour' + (Math.abs(dossier.dureeJours) > 1 ? 's' : ''));

  return '<div class="fiche-section">'
    + '<h3 class="fiche-section-titre">Synthèse</h3>'
    + '<div class="carte"><div class="df-grille">' + detection + reparation + cloture + '</div></div>'
    + '</div>';
}

/* ============================================================
   Bloc 2 — Actions (export ZIP scellé)
   ============================================================ */

function blocActions() {
  return '<div class="fiche-section">'
    + '<div class="fiche-actions">'
    + '<button type="button" class="btn btn-primaire" data-action="export-dossier-fuite">'
    + ICONES.sauvegarde + '<span>Exporter le dossier de fuite (ZIP)</span></button>'
    + '</div>'
    + '</div>';
}

/* ============================================================
   Bloc 3 — Chronologie du dossier
   ============================================================ */

/** Classe de pastille selon le type d'événement (cf. data/dossiers-fuite.js). */
function classePastilleFuite(evt) {
  if (evt.type === 'DETECTION') return 'detection';
  if (evt.type === 'REPARATION') return 'reparation';
  if (evt.type === 'CLOTURE') return 'cloture';
  if (evt.type === 'MOUVEMENT') {
    if (evt.variationKg > 0) return 'entree';
    if (evt.variationKg < 0) return 'sortie';
  }
  return '';
}

/** Détails secondaires (ligne grise sous le titre) selon le type d'événement. */
function detailsEvenementFuite(evt) {
  const morceaux = [];
  if (evt.type === 'MOUVEMENT') {
    if (evt.variationKg != null) {
      const signe = evt.variationKg > 0 ? '+' : '';
      const sens = evt.variationKg > 0 ? 'entree' : (evt.variationKg < 0 ? 'sortie' : '');
      morceaux.push('<span class="vie-variation ' + sens + '">'
        + signe + fmtNombre(evt.variationKg, 2) + ' kg</span>');
    }
    if (evt.fluide) morceaux.push(esc(evt.fluide));
  }
  if (evt.type === 'DETECTION') {
    if (evt.localisation) morceaux.push(esc(evt.localisation));
    if (evt.methode) morceaux.push('Méthode : ' + esc(evt.methode));
    if (evt.detecteurId) morceaux.push('Détecteur ' + esc(evt.detecteurId));
    if (evt.reparationImmediate) morceaux.push('Réparation immédiate déclarée');
  }
  if (evt.type === 'CONTROLE' || evt.type === 'CLOTURE') {
    if (evt.localisation) morceaux.push(esc(evt.localisation));
    if (evt.methode) morceaux.push('Méthode : ' + esc(evt.methode));
  }
  if (evt.detail) morceaux.push(esc(evt.detail));
  if (evt.qui) morceaux.push('par ' + esc(evt.qui));
  return morceaux;
}

/** Ligne de frise pour un événement du dossier (construireDossierFuite). */
function ligneEvenementFuite(evt) {
  const sensClasse = classePastilleFuite(evt);
  const morceaux = detailsEvenementFuite(evt);

  return '<li class="vie-evenement' + (evt.annule ? ' vie-annule' : '') + '">'
    + '<span class="vie-pastille ' + sensClasse + '" aria-hidden="true"></span>'
    + '<span class="vie-date">' + esc(fmtDate(evt.date)) + '</span>'
    + '<div class="vie-corps">'
    + '<div class="vie-titre">' + esc(evt.titre)
    + (evt.numero ? ' <span style="color:var(--texte-3);font-weight:400">· '
        + esc(evt.numero) + '</span>' : '')
    + (evt.annule ? '<span class="chip">Annulée par contre-écriture</span>' : '')
    + '</div>'
    + (morceaux.length ? '<div class="vie-detail">' + morceaux.join(' · ') + '</div>' : '')
    + '</div>'
    + '</li>';
}

function blocChronologie(dossier) {
  const frise = dossier.evenements.length
    ? '<ul class="vie-liste">' + dossier.evenements.map(ligneEvenementFuite).join('') + '</ul>'
    : '<div class="etat-vide">' + ICONES.controle + '<p>Aucun événement pour ce dossier.</p></div>';

  return '<div class="fiche-section">'
    + '<h3 class="fiche-section-titre">Chronologie</h3>'
    + '<div class="carte">' + frise + '</div>'
    + '</div>';
}

/* ============================================================
   État vide : dossier introuvable
   ============================================================ */

function afficherDossierIntrouvable(conteneur, machine) {
  const lienRetour = machine
    ? '<a href="#/m/' + esc(machine.codePublic) + '" class="fiche-retour">' + ICONES.grille
      + '<span>Retour à la fiche machine</span></a>'
    : '<a href="#/machines" class="fiche-retour">' + ICONES.grille
      + '<span>Retour au parc machines</span></a>';
  conteneur.innerHTML = STYLES_VUE
    + lienRetour
    + enteteVue({ titre: 'Dossier de fuite introuvable' })
    + '<div class="carte"><div class="etat-vide">' + ICONES.controle
    + '<p>Aucun dossier de fuite ne correspond à ce contrôle. Il a peut-être '
    + 'été modifié ou le lien est incorrect.</p></div></div>';
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * Rend le dossier de fuite ancré sur un contrôle d'étanchéité au résultat
 * FUITE, retrouvé par son identifiant.
 * @param {HTMLElement} conteneur — élément vidé d'avance par app.js
 * @param {{ store: object, naviguer: (hash: string) => void, param: string }} ctx
 *   param — l'identifiant du contrôle FUITE qui ancre le dossier.
 */
export async function render(conteneur, ctx) {
  const { store, param } = ctx;
  const controleFuiteId = String(param || '').trim();

  const [machines, controles, mouvements] = await Promise.all([
    store.getMachines(),
    store.getControles(),
    store.getMouvements()
  ]);

  const controleAncre = controles.find((c) => c.id === controleFuiteId);
  const machine = controleAncre
    ? machines.find((m) => m.id === controleAncre.machineId)
    : null;
  const dossier = machine
    ? construireDossierFuite({ machine, controles, mouvements, controleFuiteId })
    : null;

  if (!controleAncre || !machine || !dossier) {
    afficherDossierIntrouvable(conteneur, machine);
    return;
  }

  conteneur.innerHTML = STYLES_VUE
    + '<a href="#/m/' + esc(machine.codePublic) + '" class="fiche-retour">' + ICONES.grille
    + '<span>Retour à la fiche machine</span></a>'
    + enteteVue({
        titre: 'Dossier de fuite — ' + machine.designation,
        sousTitre: 'Détecté le ' + fmtDate(dossier.dateDetection),
        actionsHtml: chipStatutFuite(dossier.statut)
      })
    + blocSynthese(dossier)
    + blocActions()
    + blocChronologie(dossier);

  // ---- Export ZIP scellé du dossier de fuite ----
  const boutonExport = conteneur.querySelector('[data-action="export-dossier-fuite"]');
  if (boutonExport) {
    boutonExport.addEventListener('click', async function () {
      const libelle = boutonExport.querySelector('span');
      const texteInitial = libelle ? libelle.textContent : '';
      boutonExport.disabled = true;
      if (libelle) libelle.textContent = 'Génération…';
      try {
        const genere = await genererDossierFuite(store, machine.id, controleFuiteId);
        telechargerEtSceller(genere);
      } catch (erreur) {
        toast(erreur && erreur.message ? erreur.message
          : 'Export du dossier de fuite impossible.', 'erreur');
      } finally {
        boutonExport.disabled = false;
        if (libelle) libelle.textContent = texteInitial;
      }
    });
  }
}
