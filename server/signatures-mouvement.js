// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — SIGNATURES RÉELLES d'un mouvement, côté serveur (lot C,
 * brique C1).
 *
 * ⚠ MIROIR LITTÉRAL de `v8/js/data/signatures-mouvement.js` (règle de la
 * maison : un module pur du front réutilisé côté serveur est recopié en
 * CommonJS). Les déclarations signées et les critères d'illisibilité
 * (PNG RÉELLEMENT décodé depuis le lot B3, et JAMAIS rigoureusement
 * vide) doivent être IDENTIQUES des deux côtés : la parité est prouvée par
 * `server/test-signatures-mouvement.mjs` — ne jamais toucher l'un sans
 * l'autre.
 */

const { verifierStructurePng, analyseEncre } = require('./png.js');

/** Les deux rôles de signature, dans l'ordre IMPOSÉ du parcours. */
const ROLES_SIGNATURE = ['TECHNICIEN', 'DETENTEUR'];

/** Au-dessus : image déraisonnable pour un tracé (plafond défensif). */
const SIGNATURE_TAILLE_MAX = 1024 * 1024;

/** Messages canoniques d'illisibilité (repris mot pour mot des 2 côtés). */
const MSG_TRACE_ABSENT = 'Signature illisible : tracé absent.';
const MSG_PAS_PNG =
  'Signature illisible : l’image n’est pas un PNG valide.';
const MSG_TROP_GROSSE =
  'Signature illisible : image trop volumineuse (1 Mo maximum).';
/** Lot B3 : la case blanche, seul cas où le logiciel mentait. */
const MSG_ZONE_VIERGE =
  'Signature refusée : la zone est restée vierge, aucun tracé n’a été ' +
  'enregistré. Signez dans le cadre, puis recommencez.';

/** Déclaration signée par le technicien (décision Franck 16/07, figée). */
const DECLARATION_TECHNICIEN =
  'Je certifie avoir réalisé l’intervention décrite dans cette fiche et ' +
  'l’exactitude des informations qu’elle contient.';

/** Déclaration du détenteur, SANS point final (la mention de délégation
 *  s'insère avant le point). */
const DECLARATION_DETENTEUR =
  'Je reconnais la réalisation de l’intervention décrite et l’exactitude ' +
  'des informations de cette fiche';

/** Le texte EXACT de la déclaration signée (clone du front). */
function declarationSignature(role, parDelegation, organisation) {
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

/** Critères d'illisibilité d'un tracé (clone du front). */
function verifierImageSignature(octets) {
  if (!octets || octets.length === 0) return MSG_TRACE_ABSENT;
  // Plafond AVANT décodage : on ne décode pas ce qu'on refuse de tenir.
  if (octets.length > SIGNATURE_TAILLE_MAX) return MSG_TROP_GROSSE;
  if (!verifierStructurePng(octets).ok) return MSG_PAS_PNG;
  // Le VIDE ABSOLU, et rien de plus : une image rigoureusement uniforme
  // n'a rien dessus — c'est le seul cas où le logiciel disait
  // « signature valide » sur une case blanche. AUCUN seuil de densité,
  // aucun pourcentage, aucune boîte englobante (décision du
  // propriétaire du 25/07 : c'est le signataire qui juge son tracé) —
  // une griffure de deux pixels passe. Et sur un format que l'on ne
  // sait pas relire, analyseEncre répond INDETERMINABLE : on ne conclut
  // JAMAIS au vide sur un doute.
  if (analyseEncre(octets) === 'VIDE') return MSG_ZONE_VIERGE;
  return null;
}

module.exports = {
  ROLES_SIGNATURE,
  SIGNATURE_TAILLE_MAX,
  MSG_TRACE_ABSENT,
  MSG_PAS_PNG,
  MSG_TROP_GROSSE,
  MSG_ZONE_VIERGE,
  declarationSignature,
  verifierImageSignature
};
