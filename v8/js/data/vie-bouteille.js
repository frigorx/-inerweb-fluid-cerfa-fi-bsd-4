// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — « la vie de la bouteille » (brique ②)
// Module PUR/Node-testable (zéro DOM) : fusionne les gisements
// existants en UNE chronologie datée pour la fiche bouteille.
//
// Sources (rien de nouveau n'est stocké) :
//  - les MOUVEMENTS validés/annulés qui la référencent (source OU
//    destination — un transfert la touche des deux côtés), datés à la
//    date MÉTIER (jour), avec la variation vue DE LA BOUTEILLE et la
//    teq CO₂ calculée au PRP FIGÉ du mouvement (repli assumé sur le
//    référentiel courant pour les écritures d'avant la migration 13) ;
//  - le JOURNAL D'AUDIT filtré sur son code (création, pesées avec
//    valeurs, modifications, décision déchet, sortie BSFF, retour
//    fournisseur), daté à l'instant de saisie (ISO complet).
//
// Ce qu'on N'ESSAIE PAS de reconstituer (honnêteté) : les masses
// passées (les pesées écrasent en place, seule la trace texte du
// journal subsiste) ni les valeurs avant/après d'une modification
// (le journal ne garde que les noms de champs).
// ============================================================

import { teqCO2 } from '../core/utils.js';

/** Libellés français des types de mouvement, vus de la bouteille. */
const LIBELLES_TYPE = {
  CHARGE_APPOINT: 'Complément de charge',
  MISE_EN_SERVICE: 'Mise en service',
  RECUPERATION_MAINTENANCE: 'Récupération (maintenance)',
  RECUPERATION_DEMANTELEMENT: 'Récupération (démantèlement)',
  TRANSFERT: 'Transfert entre contenants'
};

/** Actions du journal d'audit qui ciblent une bouteille (cible = code). */
const ACTIONS_JOURNAL = {
  CREATION_BOUTEILLE: 'Entrée au parc',
  MODIFICATION_BOUTEILLE: 'Modification de la fiche',
  PESEE_BOUTEILLE: 'Pesée',
  DECISION_FLUIDE: 'Décision sur le fluide récupéré',
  // ⚠ Lot B2 : la clé du journal reste SORTIE_BSFF (donnée figée), le
  // LIBELLÉ lu par l'utilisateur dit ce que l'objet est vraiment.
  SORTIE_BSFF: 'Sortie déchet (remise en filière)',
  ISSUE_BSFF: 'Traitement final attesté',
  RETOUR_FOURNISSEUR: 'Retour au fournisseur',
  CESSION: 'Cession à un tiers'
};

/**
 * Variation de masse VUE DE LA BOUTEILLE pour un mouvement qui la
 * référence. Dérivée de la mécanique d'appliquerEffets :
 *  - source (charge, mise en service, transfert) : elle se vide de
 *    quantiteKg (positif) → −quantiteKg ;
 *  - destination d'une RÉCUPÉRATION : quantiteKg est NÉGATIF côté
 *    machine → la bouteille reçoit −quantiteKg ;
 *  - destination d'un TRANSFERT : quantiteKg positif → +quantiteKg.
 * La formule couvre AUSSI les contre-écritures (quantité opposée,
 * bouteilles NON permutées) : le fluide fait le chemin inverse.
 * @returns {number|null} variation en kg, null si quantité inconnue
 */
export function variationPourBouteille(mouvement, bouteilleId) {
  if (mouvement.quantiteKg == null) return null;
  let variation = 0;
  if (mouvement.bouteilleSrcId === bouteilleId) {
    variation -= mouvement.quantiteKg;
  }
  if (mouvement.bouteilleDstId === bouteilleId) {
    variation += mouvement.type === 'TRANSFERT'
      ? mouvement.quantiteKg
      : -mouvement.quantiteKg;
  }
  return Math.round(variation * 1000) / 1000;
}

/** Événement de chronologie issu d'un mouvement validé/annulé. */
function evenementMouvement(mouvement, bouteille, indexNumeros, gwpCourant,
  codesBouteilles) {
  const variation = variationPourBouteille(mouvement, bouteille.id);
  const prp = mouvement.prpFige ?? null;
  const gwpRepli = gwpCourant.get(mouvement.fluide) ?? null;
  const gwpRetenu = prp ?? gwpRepli;

  let titre = LIBELLES_TYPE[mouvement.type] ?? mouvement.type;
  if (mouvement.contreEcritureDe) {
    const numeroOriginal = indexNumeros.get(mouvement.contreEcritureDe);
    titre = 'Contre-écriture' + (numeroOriginal ? ` de ${numeroOriginal}` : '');
  }

  // Contrepartie d'un TRANSFERT : l'auditeur « suit le fluide », il faut
  // dire d'où il vient / où il part (le code de l'autre bouteille).
  let contrepartie = null;
  if (mouvement.type === 'TRANSFERT') {
    if (mouvement.bouteilleSrcId === bouteille.id
        && mouvement.bouteilleDstId) {
      contrepartie = '→ ' + (codesBouteilles.get(mouvement.bouteilleDstId)
        ?? 'contenant inconnu');
    } else if (mouvement.bouteilleDstId === bouteille.id
        && mouvement.bouteilleSrcId) {
      contrepartie = '← ' + (codesBouteilles.get(mouvement.bouteilleSrcId)
        ?? 'contenant inconnu');
    }
  }

  return {
    date: mouvement.date,
    horodate: false,
    type: 'MOUVEMENT',
    sousType: mouvement.type,
    titre,
    numero: mouvement.numero,
    mouvementId: mouvement.id,
    ordreValidation: mouvement.ordreValidation ?? null,
    machineLabel: mouvement.machineLabel ?? null,
    contrepartie,
    variationKg: variation,
    fluide: mouvement.fluide ?? null,
    // teq de CE mouvement : PRP figé à la validation si présent, sinon
    // repli sur le référentiel COURANT — en le disant (prpEstFige).
    teqCo2: (variation != null && gwpRetenu != null)
      ? teqCO2(Math.abs(variation), gwpRetenu) : null,
    prpRetenu: gwpRetenu,
    prpEstFige: prp != null,
    annule: mouvement.statut === 'ANNULE',
    contreEcritureDe: mouvement.contreEcritureDe ?? null,
    qui: mouvement.technicien ?? null
  };
}

/** Événement de chronologie issu d'une entrée du journal d'audit. */
function evenementJournal(entree) {
  return {
    date: entree.date,
    horodate: true,
    type: 'JOURNAL',
    sousType: entree.action,
    titre: ACTIONS_JOURNAL[entree.action] ?? entree.action,
    detail: entree.details ?? null,
    qui: entree.qui ?? null
  };
}

/**
 * Rang de tri INTRA-JOUR d'un événement — l'ordre exact au sein d'un même
 * jour est partiellement inconnaissable (les mouvements portent une date
 * MÉTIER au jour, le journal un horodatage de SAISIE) ; on garantit au
 * moins un ordre plausible et stable :
 *   0 — l'entrée au parc (la création ouvre toujours la journée) ;
 *   1.x — les mouvements, départagés par leur rang de scellement ;
 *   2.x — le reste du journal, départagé par l'heure de saisie.
 */
function rangIntraJour(evt) {
  if (evt.sousType === 'CREATION_BOUTEILLE') return 0;
  if (evt.type === 'MOUVEMENT') {
    const ordre = Number(evt.ordreValidation) || 0;
    return 1 + Math.min(ordre / 1e9, 0.999);
  }
  const heure = String(evt.date).slice(11, 19); // « hh:mm:ss » ou ''
  const fraction = heure
    ? (Number(heure.slice(0, 2)) * 3600 + Number(heure.slice(3, 5)) * 60
       + Number(heure.slice(6, 8))) / 86400
    : 0;
  return 2 + fraction;
}

/**
 * Construit la chronologie complète d'une bouteille.
 * @param {{ bouteille: object, mouvements: Array, journal: Array,
 *           fluides: Array, bouteilles?: Array }} sources — lectures du
 *          contrat telles quelles (getBouteilles/getMouvements/
 *          getJournalAudit/getFluides ; `bouteilles` sert à nommer la
 *          contrepartie d'un transfert)
 * @returns {{ evenements: Array, mouvementsBouteille: Array,
 *             nbMouvements: number, nbPesees: number }}
 */
export function construireVieBouteille(
  { bouteille, mouvements, journal, fluides, bouteilles }) {
  const gwpCourant = new Map(
    (fluides ?? []).map((f) => [f.code, f.gwpAr4]));
  const codesBouteilles = new Map(
    (bouteilles ?? []).map((b) => [b.id, b.code]));

  // Mouvements OPPOSABLES qui la référencent (source OU destination).
  const mouvementsBouteille = (mouvements ?? []).filter((mv) =>
    (mv.statut === 'VALIDE' || mv.statut === 'ANNULE')
    && (mv.bouteilleSrcId === bouteille.id
        || mv.bouteilleDstId === bouteille.id));

  // Numéros par id (pour nommer l'originale depuis sa contre-écriture).
  const indexNumeros = new Map(
    (mouvements ?? []).map((mv) => [mv.id, mv.numero]));

  const evenements = mouvementsBouteille.map((mv) =>
    evenementMouvement(mv, bouteille, indexNumeros, gwpCourant,
      codesBouteilles));

  // Journal d'audit : les actions bouteille ciblent son CODE lisible.
  const entreesJournal = (journal ?? []).filter((e) =>
    e.cible === bouteille.code
    && Object.prototype.hasOwnProperty.call(ACTIONS_JOURNAL, e.action));
  evenements.push(...entreesJournal.map(evenementJournal));

  // Tri décroissant : jour métier d'abord, puis rang intra-jour (la
  // création au fond de sa journée, les mouvements dans l'ordre de leur
  // scellement, le journal horodaté ensuite).
  evenements.sort((a, b) => {
    const jourA = String(a.date).slice(0, 10);
    const jourB = String(b.date).slice(0, 10);
    if (jourA !== jourB) return jourB.localeCompare(jourA);
    return rangIntraJour(b) - rangIntraJour(a);
  });

  return {
    evenements,
    mouvementsBouteille,
    nbMouvements: mouvementsBouteille.length,
    nbPesees: entreesJournal
      .filter((e) => e.action === 'PESEE_BOUTEILLE').length
  };
}
