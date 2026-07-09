// ============================================================
// inerWeb Fluide — vue « Fiche outil vivante » (QR outillage, Phase 2)
// Vue hors sidebar, atteinte par la route paramétrée '#/o/<CODE>'
// (code_public, migration 012). État d'étalonnage/vérification, échéances,
// caractéristiques, alertes, et pièces jointes = CERTIFICATS D'ÉTALONNAGE
// (débloqués par le Lot 0 : la catégorie CERTIFICAT_ETALONNAGE passe enfin
// en Mode Local). Un scan de l'étiquette outil ouvre cette fiche.
// ============================================================

import { enteteVue, carteKpi, chipStatut, toast, confirmer, ICONES } from './communs.js';
import { LIBELLES_TYPE_OUTIL } from './outillage.js';
import { esc, fmtDate } from '../core/utils.js';
import { ouvrirFormOutil } from '../modales/outil-form.js';
import { ouvrirEtiquetteOutil } from '../documents/etiquette-outil.js';
import { zonePiecesJointes } from '../composants/pieces-jointes.js';

export const titre = 'Fiche outil';

const STYLES_VUE = `
<style>
  .fo-retour {
    display: inline-flex; align-items: center; gap: 6px; margin-bottom: 12px;
    font-size: 13px; color: var(--texte-3); text-decoration: none;
  }
  .fo-retour:hover, .fo-retour:focus-visible { color: var(--accent); }
  .fo-section { margin-top: 20px; }
  .fo-section-titre {
    font-family: var(--police-titres); font-size: 15px; font-weight: 600;
    color: var(--texte); margin: 0 0 10px;
  }
  .fo-actions { display: flex; flex-wrap: wrap; gap: 10px; }
  .fo-details {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 24px; padding: 16px;
  }
  @media (max-width: 640px) { .fo-details { grid-template-columns: 1fr; } }
  .fo-detail-libelle {
    font-size: 10.5px; letter-spacing: .03em; text-transform: uppercase;
    color: var(--texte-faible);
  }
  .fo-detail-valeur { font-size: 13.5px; color: var(--texte); margin-top: 2px; }
</style>`;

function libelleType(typeOutil) {
  return LIBELLES_TYPE_OUTIL[typeOutil] || typeOutil || '—';
}

/** Teinte de la carte KPI « État » selon le statut de l'outil. */
function teinteStatut(statut) {
  if (statut === 'EXPIRE') return 'rose';
  if (statut === 'A_VERIFIER') return 'rose';
  if (statut === 'HORS_SERVICE') return 'violet';
  return 'vert';
}

function carteKpiChip(libelle, statut, icone) {
  return '<div class="carte carte-kpi">'
    + '<div class="kpi-haut">'
    + '<span class="kpi-libelle">' + esc(libelle) + '</span>'
    + '<span class="kpi-pastille kpi-pastille-' + esc(teinteStatut(statut)) + '">'
    + ICONES[icone] + '</span>'
    + '</div>'
    + '<div class="kpi-valeur" style="font-size:20px">' + chipStatut(statut) + '</div>'
    + '</div>';
}

function blocIdentite(outil) {
  return '<div class="grille-4">'
    + carteKpi({ libelle: 'Type', valeur: libelleType(outil.typeOutil),
        icone: 'outillage', teinte: 'accent' })
    + carteKpiChip('État', outil.statut, 'coche')
    + carteKpi({ libelle: 'Prochaine échéance',
        valeur: fmtDate(outil.prochaineEcheance), icone: 'controle', teinte: 'rose' })
    + carteKpi({ libelle: 'Dernière vérification',
        valeur: fmtDate(outil.dateVerification || outil.dateEtalonnage),
        icone: 'bilan', teinte: 'violet' })
    + '</div>';
}

function ligneDetail(libelle, valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return '';
  return '<div>'
    + '<div class="fo-detail-libelle">' + esc(libelle) + '</div>'
    + '<div class="fo-detail-valeur">' + esc(valeur) + '</div>'
    + '</div>';
}

function blocDetails(outil) {
  const carac = outil.typeOutil === 'BALANCE'
    ? ligneDetail('Précision', outil.precision)
    : (outil.typeOutil === 'DETECTEUR'
        ? ligneDetail('Sensibilité', outil.sensibilite) : '');
  const lignes = [
    ligneDetail('Marque', outil.marque),
    ligneDetail('Modèle', outil.modele),
    ligneDetail('Numéro de série', outil.numSerie),
    ligneDetail('Site / atelier', outil.siteAtelier),
    carac,
    ligneDetail('Étalonnage', outil.dateEtalonnage ? fmtDate(outil.dateEtalonnage) : null),
    ligneDetail('Vérification', outil.dateVerification ? fmtDate(outil.dateVerification) : null)
  ].join('');
  return '<div class="fo-section">'
    + '<h3 class="fo-section-titre">Caractéristiques</h3>'
    + '<div class="carte"><div class="fo-details">'
    + (lignes || '<div class="fo-detail-valeur">Aucune caractéristique renseignée.</div>')
    + '</div></div>'
    + '</div>';
}

function afficherOutilIntrouvable(conteneur) {
  conteneur.innerHTML = STYLES_VUE
    + '<a href="#/outillage" class="fo-retour">' + ICONES.outillage + '<span>Retour à l’outillage</span></a>'
    + enteteVue({ titre: 'Outil introuvable' })
    + '<div class="carte"><div class="etat-vide">' + ICONES.outillage
    + '<p>Aucun outil ne correspond à ce code (il a peut-être été supprimé ou le lien est incorrect).</p>'
    + '</div></div>';
}

/**
 * Rend la fiche vivante d'un outil, retrouvé par son code_public.
 * @param {HTMLElement} conteneur — élément vidé d'avance par app.js
 * @param {{ store: object, naviguer: (hash: string) => void, param: string }} ctx
 */
export async function render(conteneur, ctx) {
  const { store, naviguer, param } = ctx;
  const code = String(param || '').trim();

  const [outillage, alertesToutes] = await Promise.all([
    store.getOutillage(),
    store.getAlertes()
  ]);

  const outil = outillage.find((o) => o.codePublic === code);
  if (!outil) {
    afficherOutilIntrouvable(conteneur);
    return;
  }

  const marqueModele = [outil.marque, outil.modele].filter(Boolean).join(' ')
    || libelleType(outil.typeOutil);
  const alertes = alertesToutes.filter((a) => a.cible && a.cible.id === outil.id);

  const boutonReformer = outil.statut !== 'HORS_SERVICE'
    ? '<button type="button" class="btn btn-danger-contour" data-action="reformer">'
      + ICONES.croix + '<span>Réformer</span></button>'
    : '';

  const blocAlertes = alertes.length
    ? '<div class="fo-section"><h3 class="fo-section-titre">Alertes</h3>'
      + '<div class="carte">' + alertes.map((a) =>
        '<div style="padding:8px 0;border-bottom:1px solid var(--bordure-2)">'
        + '<strong style="font-size:12.5px">' + esc(a.titre) + '</strong>'
        + '<div style="font-size:11.5px;color:var(--texte-3);margin-top:2px">'
        + esc(a.detail) + '</div></div>').join('') + '</div></div>'
    : '';

  conteneur.innerHTML = STYLES_VUE
    + '<a href="#/outillage" class="fo-retour">' + ICONES.outillage + '<span>Retour à l’outillage</span></a>'
    + enteteVue({ titre: marqueModele, sousTitre: 'Code ' + outil.codePublic })
    + blocIdentite(outil)
    + '<div class="fo-section"><div class="fo-actions">'
    + '<button type="button" class="btn btn-contour" data-action="etiquette">'
    + ICONES.grille + '<span>Étiquette QR</span></button>'
    + '<button type="button" class="btn btn-contour" data-action="modifier">'
    + ICONES.engrenage + '<span>Modifier</span></button>'
    + boutonReformer
    + '</div></div>'
    + blocDetails(outil)
    + blocAlertes
    + '<div class="fo-section"><h3 class="fo-section-titre">Certificats et documents</h3>'
    + '<div id="fo-pieces-jointes"></div></div>';

  // Pièces jointes : certificats d'étalonnage, rapports de vérification…
  // (la catégorie CERTIFICAT_ETALONNAGE est enfin acceptée en Mode Local
  // depuis le Lot 0 — migration 010).
  zonePiecesJointes(conteneur.querySelector('#fo-pieces-jointes'), ctx, {
    entiteType: 'OUTILLAGE',
    entiteId: outil.id,
    lectureSeule: false
  });

  const rafraichir = function () { render(conteneur, ctx); };

  conteneur.querySelector('[data-action="etiquette"]').addEventListener('click', function () {
    ouvrirEtiquetteOutil(ctx, outil.id);
  });
  conteneur.querySelector('[data-action="modifier"]').addEventListener('click', async function () {
    const enregistre = await ouvrirFormOutil(ctx, outil.id);
    if (enregistre) rafraichir();
  });
  const boutonRef = conteneur.querySelector('[data-action="reformer"]');
  if (boutonRef) {
    boutonRef.addEventListener('click', async function () {
      const confirme = await confirmer({
        titre: 'Réformer l’outil',
        message: 'Réformer « ' + marqueModele + ' » ? Il passera hors service et ne '
          + 'pourra plus être utilisé pour une vérification réglementaire.',
        libelleConfirmer: 'Réformer',
        danger: true
      });
      if (!confirme) return;
      try {
        let operateur = null;
        try { operateur = await store.getUtilisateurCourant(); } catch { /* dégradé */ }
        await store.reformerOutil(outil.id, operateur ? operateur.id : 'Système');
        toast('Outil réformé.', 'succes');
        rafraichir();
      } catch (erreur) {
        toast(erreur && erreur.message ? erreur.message : 'Réforme impossible.', 'erreur');
      }
    });
  }
}
