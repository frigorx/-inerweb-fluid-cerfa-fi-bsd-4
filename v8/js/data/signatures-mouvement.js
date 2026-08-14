// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — SIGNATURES RÉELLES d'un mouvement (module PUR)
// Lot C du plan audit-proof (condition 3), brique C1.
//
// Rôle : la vérité PARTAGÉE du parcours de double signature —
//  - rôles admis (TECHNICIEN d'abord, DETENTEUR ensuite) ;
//  - textes EXACTS des déclarations signées (décisions Franck du
//    16/07, plan lot C §2.2) : composés ICI, affichés au moment de
//    signer, FIGÉS dans la signature, couverts par l'empreinte v2
//    (brique C2) — jamais reçus du client ;
//  - critères d'illisibilité d'un tracé (décision §2.5) : jamais
//    vide, PNG RÉELLEMENT DÉCODÉ (lot B3 du 25/07 : en-tête IHDR,
//    chaîne des chunks, CRC-32 de chacun, IDAT, IEND — avant, on
//    comparait 8 octets et une longueur, et un bloc de texte de 2 Ko
//    passait pour une signature) — et JAMAIS rigoureusement vide (une
//    case restée blanche n'est pas une signature) ; plafond défensif
//    de 1 Mo (compromis protecteur, arbitrage délégué). La borne
//    basse de 1 Ko a été RETIRÉE le 25/07 : les mesures montrent que
//    les deux populations se chevauchent (canvas vierge 5 562 o,
//    un seul trait 6 518 o), et aucun texte ne fixe de seuil d'encre.
//
// Aucune I/O ; seule dépendance : le module pur data/png.js.
// Dupliqué en littéral CommonJS côté serveur
// (server/signatures-mouvement.js) — parité prouvée par
// server/test-signatures-mouvement.mjs : ne jamais toucher l'un
// sans l'autre.
// ============================================================

import { lireImagePng } from './png.js';

/** Les deux rôles de signature, dans l'ordre IMPOSÉ du parcours. */
export const ROLES_SIGNATURE = ['TECHNICIEN', 'DETENTEUR'];

/** Au-dessus : image déraisonnable pour un tracé (plafond défensif). */
export const SIGNATURE_TAILLE_MAX = 1024 * 1024;

/** Messages canoniques d'illisibilité (repris mot pour mot des 2 côtés). */
export const MSG_TRACE_ABSENT = 'Signature illisible : tracé absent.';
export const MSG_PAS_PNG =
  'Signature illisible : l’image n’est pas un PNG valide.';
export const MSG_TROP_GROSSE =
  'Signature illisible : image trop volumineuse (1 Mo maximum).';
/** Lot B3 : la case blanche, seul cas où le logiciel mentait. */
export const MSG_ZONE_VIERGE =
  'Signature refusée : la zone est restée vierge, aucun tracé n’a été ' +
  'enregistré. Signez dans le cadre, puis recommencez.';

/** Déclaration signée par le technicien (décision Franck 16/07, figée). */
const DECLARATION_TECHNICIEN =
  'Je certifie avoir réalisé l’intervention décrite dans cette fiche et ' +
  'l’exactitude des informations qu’elle contient.';

/** Déclaration du détenteur, SANS point final (la mention de délégation
 *  s'insère avant le point — décision §2.2 : la délégation vit dans la
 *  qualité ET la déclaration, jamais dans une retouche du formulaire). */
const DECLARATION_DETENTEUR =
  'Je reconnais la réalisation de l’intervention décrite et l’exactitude ' +
  'des informations de cette fiche';

/**
 * Le texte EXACT de la déclaration signée pour un rôle donné — affiché à
 * l'écran de signature ET figé dans l'enregistrement (jamais reçu du
 * client : le signataire ne peut pas réécrire ce qu'il déclare).
 * @param {string} role 'TECHNICIEN' | 'DETENTEUR'
 * @param {boolean} parDelegation signature détenteur par délégation
 * @param {?string} organisation raison sociale du détenteur représenté
 * @returns {string}
 */
export function declarationSignature(role, parDelegation, organisation) {
  if (role === 'TECHNICIEN') return DECLARATION_TECHNICIEN;
  if (role === 'DETENTEUR') {
    return parDelegation
      ? `${DECLARATION_DETENTEUR}, par délégation du détenteur ` +
        `(${organisation}).`
      : `${DECLARATION_DETENTEUR}.`;
  }
  throw new Error(`Rôle de signature inconnu : ${role} ` +
    `(attendu : ${ROLES_SIGNATURE.join(', ')}).`);
}

/**
 * Critères d'illisibilité d'un tracé de signature (décision §2.5) : une
 * signature illisible n'est JAMAIS ignorée — elle est refusée à la pose.
 * Ne fait confiance qu'aux octets, jamais au type annoncé — et depuis le
 * lot B3, l'image est VRAIMENT DÉCODÉE : reconnaître les 8 octets
 * magiques ne prouve rien (un bloc de texte de 2 Ko préfixé de ces
 * octets était accepté, constat A04 du 25/07).
 * @param {?Uint8Array} octets contenu décodé de l'image
 * @returns {?string} message de refus, ou null si le tracé est recevable
 */
export function verifierImageSignature(octets) {
  if (!octets || octets.length === 0) return MSG_TRACE_ABSENT;
  // Plafond AVANT décodage : on ne décode pas ce qu'on refuse de tenir.
  if (octets.length > SIGNATURE_TAILLE_MAX) return MSG_TROP_GROSSE;
  // UN SEUL décodage pour les deux questions (revue du 25/07, MINEUR 6 :
  // le fichier était relu deux fois sur le chemin qui juge les
  // signatures). lireImagePng ne reçoit aucune valeur de l'appelant :
  // la structure rendue est toujours celle de CES octets-là.
  const { structure, encre } = lireImagePng(octets);
  if (!structure.ok) return MSG_PAS_PNG;
  // Le VIDE ABSOLU, et rien de plus : une image rigoureusement uniforme
  // n'a rien dessus — c'est le seul cas où le logiciel disait
  // « signature valide » sur une case blanche. AUCUN seuil de densité,
  // aucun pourcentage, aucune boîte englobante (décision du
  // propriétaire du 25/07 : c'est le signataire qui juge son tracé) —
  // une griffure de deux pixels passe. Et sur un format que l'on ne
  // sait pas relire, la réponse est INDETERMINABLE : on ne conclut
  // JAMAIS au vide sur un doute.
  if (encre === 'VIDE') return MSG_ZONE_VIERGE;
  return null;
}
