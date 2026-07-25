// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — SIGNATURES RÉELLES d'un mouvement, côté serveur (lot C,
 * brique C1).
 *
 * ⚠ MIROIR LITTÉRAL de `v8/js/data/signatures-mouvement.js` (règle de la
 * maison : un module pur du front réutilisé côté serveur est recopié en
 * CommonJS). Les déclarations signées et les critères d'illisibilité
 * doivent être IDENTIQUES des deux côtés : la parité est prouvée par
 * `server/test-signatures-mouvement.mjs` — ne jamais toucher l'un sans
 * l'autre.
 */

const { verifierStructurePng } = require('./png.js');

/** Les deux rôles de signature, dans l'ordre IMPOSÉ du parcours. */
const ROLES_SIGNATURE = ['TECHNICIEN', 'DETENTEUR'];

/** En dessous : tracé trop léger pour être probant (décision §2.5). */
const SIGNATURE_TAILLE_MIN = 1024;

/** Au-dessus : image déraisonnable pour un tracé (plafond défensif). */
const SIGNATURE_TAILLE_MAX = 1024 * 1024;

/** Messages canoniques d'illisibilité (repris mot pour mot des 2 côtés). */
const MSG_TRACE_ABSENT = 'Signature illisible : tracé absent.';
const MSG_PAS_PNG =
  'Signature illisible : l’image n’est pas un PNG valide.';
const MSG_TROP_PETITE =
  'Signature illisible : tracé trop léger pour être probant (moins de 1 Ko).';
const MSG_TROP_GROSSE =
  'Signature illisible : image trop volumineuse (1 Mo maximum).';

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
  if (octets.length < SIGNATURE_TAILLE_MIN) return MSG_TROP_PETITE;
  return null;
}

module.exports = {
  ROLES_SIGNATURE,
  SIGNATURE_TAILLE_MIN,
  SIGNATURE_TAILLE_MAX,
  MSG_TRACE_ABSENT,
  MSG_PAS_PNG,
  MSG_TROP_PETITE,
  MSG_TROP_GROSSE,
  declarationSignature,
  verifierImageSignature
};
