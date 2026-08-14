// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — vue « Fiche bouteille vivante » (brique ②)
// Vue hors sidebar, atteinte par la route paramétrée '#/b/<CODE>'
// (code_public — le hash gravé sur les étiquettes QR imprimées).
// Remplace l'ancien raccourci « QR → formulaire d'édition » par une
// vraie fiche : identité rapide, actions, détails repliables,
// alertes, et LA CHRONOLOGIE « la vie de la bouteille » (module pur
// vie-bouteille.js : mouvements opposables + journal d'audit).
// « Montrez-moi la vie de la B-04 » a désormais une réponse.
// ============================================================

import { enteteVue, carteKpi, chipStatut, barreProgression, toast, ICONES, modale }
  from './communs.js';
import { esc, fmtKg, fmtDate, fmtNombre } from '../core/utils.js';
import { construireVieBouteille } from '../data/vie-bouteille.js';
import { avoirParMachineOrigine } from '../data/avoir-origine.js';
import { ouvrirFormBouteille, ouvrirPesee } from '../modales/bouteille-form.js';
import { ouvrirEtiquette } from '../documents/etiquette-bouteille.js';
import { ouvrirCerfa } from '../cerfa/visualiseur.js';
import { ouvrirJustificatifRegularisation }
  from '../documents/regularisation-apercu.js';
import { zonePiecesJointes } from '../composants/pieces-jointes.js';

export const titre = 'Fiche bouteille';

/** Formate une date ISO complète en « jj/mm/aaaa hh:mm:ss » (affichage seul).
 *  Même helper local que views/admin.js et documents/exports.js (dette de
 *  factorisation assumée : utils.js porte le hasseur, on n'y touche pas
 *  dans la brique qui pose le PRP figé). */
function fmtDateHeure(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const heures = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const secondes = String(d.getSeconds()).padStart(2, '0');
  return fmtDate(iso) + ' ' + heures + ':' + minutes + ':' + secondes;
}

// IM-5 : chips propres aux bouteilles (même motif que views/bouteilles.js —
// le code EN_SERVICE des machines affiche « Conforme » dans communs.js,
// faux sur un écran destiné à l'auditeur).
const CHIPS_STATUT_BOUTEILLE = {
  EN_STOCK:    { libelle: 'En stock',    classe: 'chip-vert' },
  EN_SERVICE:  { libelle: 'En service',  classe: 'chip-bleu' },
  VIDE:        { libelle: 'Vide',        classe: 'chip-gris' },
  A_RETOURNER: { libelle: 'À retourner', classe: 'chip-ambre' },
  RETOURNEE:   { libelle: 'Retournée',   classe: 'chip-gris' },
  DECHET:      { libelle: 'Déchet',      classe: 'chip-gris' }
};

const LIBELLES_ETAT_FLUIDE = {
  VIERGE: 'Vierge', RECUPERE: 'Récupéré', RECYCLE: 'Recyclé',
  REGENERE: 'Régénéré', DECHET: 'Déchet', DOUTEUX: 'Douteux',
  MELANGE: 'Probablement mélangé'
};

function chipStatutBouteille(statut) {
  const connu = CHIPS_STATUT_BOUTEILLE[statut];
  if (connu) {
    return '<span class="chip ' + connu.classe + '">' + esc(connu.libelle) + '</span>';
  }
  return chipStatut(statut);
}

/** IM-5 : vrai si la bouteille a quitté le stock (mutations interdites). */
function estSortieDuStock(b) {
  return b.statut === 'RETOURNEE' || b.statut === 'DECHET';
}

/* ============================================================
   Styles propres à la vue (mêmes classes « fiche- » que la fiche
   machine pour les blocs partagés + classes « vie- » de la frise)
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

  .fiche-details {
    border: 1px solid var(--bordure);
    border-radius: var(--rayon-carte);
    background: var(--carte);
    overflow: hidden;
  }
  .fiche-details > summary {
    cursor: pointer;
    padding: 12px 16px;
    font-family: var(--police-titres);
    font-weight: 600;
    font-size: 14px;
    color: var(--texte);
    list-style: none;
  }
  .fiche-details > summary::-webkit-details-marker { display: none; }
  .fiche-details > summary::before {
    content: '▸';
    display: inline-block;
    margin-right: 8px;
    color: var(--texte-3);
    transition: transform .15s ease;
  }
  .fiche-details[open] > summary::before { transform: rotate(90deg); }
  .fiche-details-corps {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 24px;
    padding: 4px 16px 16px;
    border-top: 1px solid var(--bordure-2);
  }
  @media (max-width: 640px) {
    .fiche-details-corps { grid-template-columns: 1fr; }
  }
  .fiche-detail-libelle {
    font-size: 10.5px;
    letter-spacing: .03em;
    text-transform: uppercase;
    color: var(--texte-faible);
  }
  .fiche-detail-valeur { font-size: 13.5px; color: var(--texte); margin-top: 2px; }

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
  .fiche-point {
    width: 9px;
    height: 9px;
    flex: none;
    border-radius: var(--rayon-chip);
    margin-top: 4px;
  }
  .fiche-point-critique  { background: var(--danger); }
  .fiche-point-important { background: var(--avert-icone); }

  .fiche-onglets-boutons {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--bordure);
    margin-bottom: 14px;
  }
  .fiche-onglet-bouton {
    padding: 9px 14px;
    border: none;
    background: none;
    font-size: 13px;
    font-weight: 600;
    color: var(--texte-3);
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }
  .fiche-onglet-bouton:hover { color: var(--texte); }
  .fiche-onglet-bouton.actif {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  /* Frise « vie de la bouteille » */
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
  .vie-pastille.entree { background: var(--succes); }
  .vie-pastille.sortie { background: var(--danger-2); }
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
  .vie-actions { flex: none; align-self: center; }
  .vie-annule { opacity: .62; }
</style>`;

/* ============================================================
   Bloc 1 — Identité rapide (4 cartes KPI)
   ============================================================ */

/**
 * Même besoin (et même justification) que la fiche machine : carteKpi()
 * de communs.js échappe son sousTexte — pour une barre ou une chip il
 * faut reprendre son gabarit exact à la main.
 */
function carteKpiSousTexteHtml({ libelle, valeur, sousTexteHtml, icone, teinte }) {
  return '<div class="carte carte-kpi">'
    + '<div class="kpi-haut">'
    + '<span class="kpi-libelle">' + esc(libelle) + '</span>'
    + '<span class="kpi-pastille kpi-pastille-' + esc(teinte) + '">' + ICONES[icone] + '</span>'
    + '</div>'
    + '<div class="kpi-valeur">' + esc(valeur) + '</div>'
    + '<div class="kpi-sous-texte">' + sousTexteHtml + '</div>'
    + '</div>';
}

function blocIdentite(bouteille, fluide, nbPesees) {
  const pct = bouteille.contenanceMaxKg > 0
    ? (bouteille.masseNetteKg / bouteille.contenanceMaxKg) * 100
    : 0;
  return '<div class="grille-4">'
    + carteKpi({
        libelle: 'Fluide',
        valeur: bouteille.fluide,
        sousTexte: (LIBELLES_ETAT_FLUIDE[bouteille.etatFluide] ?? bouteille.etatFluide)
          + (fluide ? ' · ' + fluide.famille : ''),
        icone: 'flocon',
        teinte: 'accent'
      })
    + carteKpiSousTexteHtml({
        libelle: 'Masse nette',
        valeur: fmtNombre(bouteille.masseNetteKg, 2) + ' / '
          + fmtKg(bouteille.contenanceMaxKg),
        sousTexteHtml: barreProgression(pct, 'accent'),
        icone: 'bouteille',
        teinte: 'vert'
      })
    + carteKpiSousTexteHtml({
        libelle: 'Statut',
        valeur: CHIPS_STATUT_BOUTEILLE[bouteille.statut]?.libelle
          ?? String(bouteille.statut ?? '—'),
        sousTexteHtml: chipStatutBouteille(bouteille.statut),
        icone: 'controle',
        teinte: 'rose'
      })
    + carteKpi({
        libelle: 'Dernière pesée',
        valeur: fmtDate(bouteille.datePesee),
        sousTexte: nbPesees > 0
          ? nbPesees + ' pesée' + (nbPesees > 1 ? 's' : '') + ' au journal'
          : 'Aucune pesée au journal',
        icone: 'balance',
        teinte: 'violet'
      })
    + '</div>';
}

/* ============================================================
   Bloc 2 — Actions
   ============================================================ */

function blocActions(sortie) {
  // IM-5 : une bouteille sortie du stock (retournée, déchet) ne se pèse
  // ni ne se modifie plus — sa fiche reste consultable (c'est le but),
  // ses actions de mutation disparaissent (alignement sur la vue liste).
  if (sortie) {
    return '<div class="fiche-section">'
      + '<div class="carte" style="padding:12px 16px;font-size:13px;color:var(--texte-2)">'
      + 'Bouteille sortie du stock : fiche en consultation seule '
      + '(la chronologie ci-dessous reste la trace de référence, '
      + 'à intégrité vérifiable).'
      + '</div>'
      + '</div>';
  }
  return '<div class="fiche-section">'
    + '<h3 class="fiche-section-titre">Actions</h3>'
    + '<div class="fiche-actions">'
    + '<button type="button" class="btn btn-primaire" data-action="peser">'
    + ICONES.balance + '<span>Peser</span></button>'
    + '<button type="button" class="btn btn-secondaire" data-action="modifier">'
    + ICONES.engrenage + '<span>Modifier la fiche</span></button>'
    + '<button type="button" class="btn btn-contour" data-action="etiquette">'
    + ICONES.imprimer + '<span>Étiquette QR</span></button>'
    + '<button type="button" class="btn btn-contour" data-action="ceder">'
    + ICONES.telecharger + '<span>Céder à un tiers</span></button>'
    + '</div>'
    + '</div>';
}

/**
 * Modale de CESSION de fluide à un tiers attesté (P0-8, rubrique 10).
 * Décrémente la bouteille et trace la cession. Un déchet part par un BSFF
 * (le store le refuse ici).
 */
function ouvrirCession(ctx, bouteille) {
  const opts = [['OPERATEUR_ATTESTE', 'Opérateur attesté'],
    ['DISTRIBUTEUR', 'Distributeur'], ['PRODUCTEUR', 'Producteur']]
    .map(function (o) {
      return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>';
    }).join('');
  const contenuHtml =
    '<p class="modale-intro">Cession d’une masse de <strong>'
    + esc(bouteille.fluide) + '</strong> depuis la bouteille <strong>'
    + esc(bouteille.code) + '</strong> (contenu : '
    + esc(fmtNombre(bouteille.masseNetteKg, 2)) + ' kg).</p>'
    + '<label class="champ-label">Destinataire'
    + '<select id="cession-type">' + opts + '</select></label>'
    + '<label class="champ-label">Raison sociale du destinataire'
    + '<input type="text" id="cession-raison" placeholder="ex. Régé-Fluides SAS"></label>'
    + '<label class="champ-label">Masse cédée (kg)'
    + '<input type="number" id="cession-masse" min="0" step="0.001"></label>'
    + '<label class="champ-label">Observation (facultatif)'
    + '<input type="text" id="cession-observation"></label>'
    + '<div id="zone-erreur-cession"></div>';
  const actionsHtml =
    '<button type="button" class="btn btn-contour" data-action="annuler">Annuler</button>'
    + '<button type="button" class="btn btn-marine" data-action="valider">Céder</button>';
  const instance = modale({ titre: 'Céder du fluide à un tiers',
    contenuHtml, actionsHtml });
  const racine = document.getElementById('zone-modales') || document.body;
  const zoneErreur = racine.querySelector('#zone-erreur-cession');
  racine.querySelector('[data-action="annuler"]')
    .addEventListener('click', function () { instance.fermer(); });
  racine.querySelector('[data-action="valider"]')
    .addEventListener('click', async function () {
      zoneErreur.innerHTML = '';
      try {
        const u = await ctx.store.getUtilisateurCourant();
        await ctx.store.createCession({
          bouteilleId: bouteille.id,
          destinataireType: racine.querySelector('#cession-type').value,
          destinataireRaisonSociale: racine.querySelector('#cession-raison').value,
          masseKg: Number(racine.querySelector('#cession-masse').value),
          observation: racine.querySelector('#cession-observation').value || null,
          operateur: u.prenom + ' ' + u.nom
        });
        toast('Cession enregistrée.', 'succes');
        instance.fermer();
        if (typeof ctx.rafraichir === 'function') ctx.rafraichir();
      } catch (erreur) {
        zoneErreur.innerHTML = '<div class="bandeau-erreur">' + ICONES.alerte
          + '<span>' + esc(erreur.message
            || 'Impossible d’enregistrer la cession.') + '</span></div>';
      }
    });
}

/* ============================================================
   Bloc 3 — Détails repliables
   ============================================================ */

function ligneDetail(libelle, valeur) {
  if (valeur == null || valeur === '') return '';
  return '<div>'
    + '<div class="fiche-detail-libelle">' + esc(libelle) + '</div>'
    + '<div class="fiche-detail-valeur">' + esc(valeur) + '</div>'
    + '</div>';
}

/** Composition d'une bouteille MÉLANGE : versements datés par fluide. */
function detailComposition(bouteille) {
  const versements = bouteille.compositionMelange;
  if (!Array.isArray(versements) || versements.length === 0) return '';
  const lignes = versements.map((v) =>
    `${fmtDate(v.date)} : ${fmtNombre(v.quantiteKg, 2)} kg ${v.fluide}`);
  return ligneDetail('Composition du mélange (versements)', lignes.join(' · '));
}

function blocDetails(bouteille) {
  const TYPES = { NEUVE: 'Neuve (fluide vierge)', RECUPERATION: 'Récupération' };
  const corps =
    ligneDetail('Type', TYPES[bouteille.type] ?? bouteille.type)
    + ligneDetail('Numéro gravé (fabricant)', bouteille.numeroReel)
    + ligneDetail('Propriétaire / consigne', bouteille.proprietaire)
    + ligneDetail('Lot', bouteille.lot)
    + ligneDetail('Tare', fmtKg(bouteille.tareKg))
    + ligneDetail('Contenance maximale', fmtKg(bouteille.contenanceMaxKg))
    + ligneDetail('Masse nette à l’entrée (figée)', fmtKg(bouteille.masseEntreeKg))
    + ligneDetail('Date d’entrée au parc', fmtDate(bouteille.dateEntree))
    + ligneDetail('Décision sur le fluide', bouteille.decisionFluide)
    + ligneDetail('Décidée par', bouteille.decisionPar)
    + ligneDetail('Date de la décision', bouteille.decisionDate ? fmtDate(bouteille.decisionDate) : null)
    + ligneDetail('Limite de garde (déchet)', bouteille.dateLimiteGarde ? fmtDate(bouteille.dateLimiteGarde) : null)
    + ligneDetail('N° suivi interne (remise en filière)', bouteille.numBsff)
    + detailComposition(bouteille);

  return '<div class="fiche-section">'
    + '<details class="fiche-details">'
    + '<summary>Détails du contenant</summary>'
    + '<div class="fiche-details-corps">' + corps + '</div>'
    + '</details>'
    + '</div>';
}

/* ============================================================
   Bloc 3 bis — Fluide d'origine machine (CM-4c, cycle matière)
   Bouteille de RÉCUPÉRATION seulement : la règle de conservation
   ventile le contenu par machine d'origine (avoir-origine.js, dérivé
   des mouvements). Le net NÉGATIF reste AFFICHÉ tel quel : le cacher
   masquerait l'anomalie que l'alerte alr-reemploi signale déjà
   (on avertit, on ne bloque jamais — décision du 22/07).
   Exporté pour le test (fonction pure HTML).
   ============================================================ */

export function blocAvoirOrigine(bouteille, mouvements) {
  if (bouteille.type !== 'RECUPERATION') return '';
  const avoir = avoirParMachineOrigine(bouteille.id, mouvements);
  // Libellé machine sans jointure : machineLabel dénormalisé des mouvements
  // (même motif que l'alerte alr-reemploi du store).
  const labels = new Map();
  for (const mv of mouvements ?? []) {
    if (mv.machineId && mv.machineLabel && !labels.has(mv.machineId)) {
      labels.set(mv.machineId, mv.machineLabel);
    }
  }
  let corps;
  if (avoir.size === 0) {
    corps = '<div class="etat-vide">' + ICONES.bouteille
      + '<p>Aucun lot d’origine : rien n’a encore été récupéré dans cette '
      + 'bouteille.</p></div>';
  } else {
    corps = '<div class="fiche-details-corps">'
      + [...avoir.entries()].map(function ([machineId, net]) {
        const enDepassement = net < -0.01;
        const disponible = net > 0 ? net : 0;
        const valeur = enDepassement
          ? fmtNombre(net, 2) + ' kg — réintroduction au-delà du récupéré '
            + '(anomalie signalée, à rectifier par contre-écriture)'
          : fmtNombre(disponible, 2) + ' kg disponibles pour un réemploi '
            + 'sur cette machine';
        return ligneDetail(labels.get(machineId) || machineId, valeur);
      }).join('')
      + '</div>';
  }
  return '<div class="fiche-section">'
    + '<h3 class="fiche-section-titre">Fluide d’origine machine (réemploi)</h3>'
    + '<div class="carte">' + corps + '</div>'
    + '</div>';
}

/* ============================================================
   Bloc 4 — Alertes de la bouteille
   ============================================================ */

function ligneAlerteBouteille(alerte) {
  const classe = alerte.niveau === 'CRITIQUE'
    ? 'fiche-point-critique' : 'fiche-point-important';
  return '<div class="fiche-alerte">'
    + '<span class="fiche-point ' + classe + '" aria-hidden="true"></span>'
    + '<div>'
    + '<div class="fiche-alerte-titre">' + esc(alerte.titre) + '</div>'
    + (alerte.detail ? '<div class="fiche-alerte-detail">' + esc(alerte.detail) + '</div>' : '')
    + '</div>'
    + '</div>';
}

function blocAlertes(alertes) {
  const contenu = alertes.length
    ? alertes.map(ligneAlerteBouteille).join('')
    : '<div class="etat-vide">' + ICONES.coche
      + '<p>Aucune alerte pour cette bouteille.</p></div>';
  return '<div class="fiche-section">'
    + '<h3 class="fiche-section-titre">Alertes</h3>'
    + '<div class="carte">' + contenu + '</div>'
    + '</div>';
}

/* ============================================================
   Bloc 5 — « La vie de la bouteille » (chronologie + Documents)
   ============================================================ */

/** Ligne de frise pour un événement de vie-bouteille.js. */
function ligneEvenement(evt) {
  const estMouvement = evt.type === 'MOUVEMENT';
  const sens = evt.variationKg == null ? ''
    : (evt.variationKg > 0 ? 'entree' : (evt.variationKg < 0 ? 'sortie' : ''));

  const morceaux = [];
  if (evt.variationKg != null) {
    const signe = evt.variationKg > 0 ? '+' : '';
    morceaux.push('<span class="vie-variation ' + sens + '">'
      + signe + fmtNombre(evt.variationKg, 2) + ' kg</span>');
  }
  if (evt.machineLabel) morceaux.push(esc(evt.machineLabel));
  if (evt.contrepartie) morceaux.push(esc(evt.contrepartie));
  if (evt.teqCo2 != null) {
    morceaux.push('≈ ' + fmtNombre(evt.teqCo2, 2) + ' t éq. CO₂ ('
      + (evt.prpEstFige ? 'PRP figé ' : 'PRP actuel ')
      + fmtNombre(evt.prpRetenu, 0) + ')');
  }
  if (evt.detail) morceaux.push(esc(evt.detail));
  if (evt.qui) morceaux.push('par ' + esc(evt.qui));

  // CERFA aussi pour une écriture ANNULÉE : son document original reste
  // opposable (cerfaNumero posé à la validation) — même règle que la
  // fiche machine. Seul le TRANSFERT n'a pas de CERFA (IM-12).
  // Lot 1 branche A (27/07/2026) : une CONTRE-ÉCRITURE non plus — elle
  // ouvre son JUSTIFICATIF DE RÉGULARISATION. La chronologie de la
  // bouteille porte déjà `contreEcritureDe` (data/vie-bouteille.js), le
  // fait n'a pas à être redéduit ici.
  const boutonCerfa = (estMouvement && evt.contreEcritureDe)
    ? '<div class="vie-actions"><button type="button" class="btn btn-contour btn-petit" '
      + 'data-action="justificatif-regularisation" data-id="'
      + esc(evt.mouvementId) + '">Justificatif de régularisation</button></div>'
    : ((estMouvement && evt.sousType !== 'TRANSFERT')
      ? '<div class="vie-actions"><button type="button" class="btn btn-contour btn-petit" '
        + 'data-action="cerfa-mouvement" data-id="' + esc(evt.mouvementId)
        + '">CERFA</button></div>'
      : '');

  return '<li class="vie-evenement' + (evt.annule ? ' vie-annule' : '') + '">'
    + '<span class="vie-pastille ' + sens + '" aria-hidden="true"></span>'
    + '<span class="vie-date">'
    + esc(evt.horodate ? fmtDateHeure(evt.date) : fmtDate(evt.date))
    + '</span>'
    + '<div class="vie-corps">'
    + '<div class="vie-titre">' + esc(evt.titre)
    + (evt.numero ? ' <span style="color:var(--texte-3);font-weight:400">· '
        + esc(evt.numero) + '</span>' : '')
    + (evt.annule ? '<span class="chip">' + 'Annulée par contre-écriture' + '</span>' : '')
    + '</div>'
    + (morceaux.length ? '<div class="vie-detail">' + morceaux.join(' · ') + '</div>' : '')
    + '</div>'
    + boutonCerfa
    + '</li>';
}

function blocVie(vie) {
  const frise = vie.evenements.length
    ? '<ul class="vie-liste">' + vie.evenements.map(ligneEvenement).join('') + '</ul>'
    : '<div class="etat-vide">' + ICONES.bouteille
      + '<p>Aucun événement pour l’instant : les mouvements validés et les '
      + 'pesées de cette bouteille s’inscriront ici.</p></div>';

  return '<div class="fiche-section">'
    + '<h3 class="fiche-section-titre">La vie de la bouteille</h3>'
    + '<div class="fiche-onglets-boutons">'
    + '<button type="button" class="fiche-onglet-bouton actif" data-onglet="chronologie">Chronologie</button>'
    + '<button type="button" class="fiche-onglet-bouton" data-onglet="documents">Documents</button>'
    + '</div>'
    + '<div data-panneau="chronologie"><div class="carte">' + frise + '</div></div>'
    + '<div data-panneau="documents" hidden></div>'
    + '</div>';
}

/* ============================================================
   État vide : bouteille introuvable
   ============================================================ */

function afficherBouteilleIntrouvable(conteneur) {
  conteneur.innerHTML = STYLES_VUE
    + enteteVue({ titre: 'Bouteille introuvable' })
    + '<div class="carte"><div class="etat-vide">' + ICONES.bouteille
    + '<p>Aucune bouteille ne correspond à ce code. Elle a peut-être été '
    + 'retournée ou le lien est incorrect.</p></div></div>';
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * Rend la fiche vivante d'une bouteille, retrouvée par son code_public
 * (le hash '#/b/<code>' des étiquettes QR imprimées est inchangé).
 * @param {HTMLElement} conteneur — élément vidé d'avance par app.js
 * @param {{ store: object, naviguer: (hash: string) => void, param: string }} ctx
 */
export async function render(conteneur, ctx) {
  const { store, naviguer, param } = ctx;
  const codePublic = String(param || '').trim();

  const [bouteilles, fluides, alertesToutes] = await Promise.all([
    store.getBouteilles(),
    store.getFluides(),
    store.getAlertes()
  ]);

  const bouteille = bouteilles.find((b) => b.codePublic === codePublic);
  if (!bouteille) {
    afficherBouteilleIntrouvable(conteneur);
    return;
  }

  const fluide = fluides.find((f) => f.code === bouteille.fluide);
  const alertes = alertesToutes.filter((a) =>
    a.cible && a.cible.vue === 'bouteilles' && a.cible.id === bouteille.id);

  // Lot E2 : getJournalAudit est réservé au niveau VALIDEUR (le journal
  // porte des noms) — pour une session élève/technicien, la vie de la
  // bouteille se construit SANS les événements du journal (dégradation
  // douce, la fiche reste entière).
  const [mouvements, journal] = await Promise.all([
    store.getMouvements(),
    store.getJournalAudit().catch(function () { return []; })
  ]);
  const vie = construireVieBouteille(
    { bouteille, mouvements, journal, fluides, bouteilles });

  const sortie = estSortieDuStock(bouteille);
  conteneur.innerHTML = STYLES_VUE
    + '<a href="#/bouteilles" class="fiche-retour">' + ICONES.grille
    + '<span>Retour au stock</span></a>'
    + enteteVue({
        titre: 'Bouteille ' + bouteille.code,
        sousTitre: 'Code ' + bouteille.codePublic
      })
    + blocIdentite(bouteille, fluide, vie.nbPesees)
    + blocActions(sortie)
    + blocDetails(bouteille)
    + blocAvoirOrigine(bouteille, mouvements)
    + blocAlertes(alertes)
    + blocVie(vie);

  // Re-rendu de CETTE fiche après une mutation (le routeur force le
  // re-rendu quand la cible est déjà la route courante).
  const rafraichir = function () { naviguer('b/' + bouteille.codePublic); };
  const ctxModale = { store, naviguer, rafraichir };

  // ---- Onglet Documents : monté au premier clic (idiome fiche machine) ----
  let documentsMontes = false;
  function monterDocumentsSiBesoin() {
    if (documentsMontes) return;
    documentsMontes = true;
    const panneau = conteneur.querySelector('[data-panneau="documents"]');
    zonePiecesJointes(panneau, ctx, {
      entiteType: 'BOUTEILLE',
      entiteId: bouteille.id,
      lectureSeule: false
    });
  }

  conteneur.querySelectorAll('.fiche-onglet-bouton').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      const cible = bouton.dataset.onglet;
      conteneur.querySelectorAll('.fiche-onglet-bouton').forEach(function (b) {
        b.classList.toggle('actif', b === bouton);
      });
      conteneur.querySelectorAll('[data-panneau]').forEach(function (panneau) {
        panneau.hidden = panneau.dataset.panneau !== cible;
      });
      if (cible === 'documents') monterDocumentsSiBesoin();
    });
  });

  // ---- Actions ----
  const boutonPeser = conteneur.querySelector('[data-action="peser"]');
  if (boutonPeser) {
    boutonPeser.addEventListener('click', function () {
      ouvrirPesee(ctxModale, bouteille.id);
    });
  }

  const boutonModifier = conteneur.querySelector('[data-action="modifier"]');
  if (boutonModifier) {
    boutonModifier.addEventListener('click', function () {
      // La modale appelle déjà ctx.rafraichir() à l'enregistrement — ne
      // pas rappeler rafraichir ici (double re-rendu concurrent sinon).
      ouvrirFormBouteille(ctxModale, bouteille.id);
    });
  }

  const boutonCeder = conteneur.querySelector('[data-action="ceder"]');
  if (boutonCeder) {
    boutonCeder.addEventListener('click', function () {
      ouvrirCession(ctxModale, bouteille);
    });
  }

  const boutonEtiquette = conteneur.querySelector('[data-action="etiquette"]');
  if (boutonEtiquette) {
    boutonEtiquette.addEventListener('click', function () {
      ouvrirEtiquette(ctx, bouteille.id).catch(function (erreur) {
        toast('Étiquette indisponible.', 'erreur');
        console.error('Étiquette QR bouteille impossible :', erreur);
      });
    });
  }

  // ---- CERFA depuis la chronologie (mouvements figés) ----
  conteneur.querySelectorAll('[data-action="cerfa-mouvement"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      ouvrirCerfa(ctx, { source: 'mouvement', id: bouton.dataset.id });
    });
  });
  // ---- Justificatif de régularisation d'une contre-écriture (lot 1 A) ----
  conteneur.querySelectorAll('[data-action="justificatif-regularisation"]')
    .forEach(function (bouton) {
      bouton.addEventListener('click', function () {
        ouvrirJustificatifRegularisation(ctx, bouton.dataset.id)
          .catch(function (erreur) {
            toast(erreur && erreur.message ? erreur.message
              : 'Justificatif de régularisation indisponible.', 'erreur');
          });
      });
    });
}
