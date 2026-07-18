// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
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
//    vide, PNG réel (nombres magiques), ≥ 1 Ko — plus un plafond
//    défensif de 1 Mo (compromis protecteur, arbitrage délégué).
//
// Aucune I/O, aucune dépendance (les nombres magiques PNG sont
// recopiés de contenu-pj.js pour garder le module autonome).
// Dupliqué en littéral CommonJS côté serveur
// (server/signatures-mouvement.js) — parité prouvée par
// server/test-signatures-mouvement.mjs : ne jamais toucher l'un
// sans l'autre.
// ============================================================

/** Les deux rôles de signature, dans l'ordre IMPOSÉ du parcours. */
export const ROLES_SIGNATURE = ['TECHNICIEN', 'DETENTEUR'];

/** Nombres magiques PNG (copie locale de contenu-pj.js : module autonome). */
const MAGIQUES_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** En dessous : tracé trop léger pour être probant (décision §2.5). */
export const SIGNATURE_TAILLE_MIN = 1024;

/** Au-dessus : image déraisonnable pour un tracé (plafond défensif). */
export const SIGNATURE_TAILLE_MAX = 1024 * 1024;

/** Messages canoniques d'illisibilité (repris mot pour mot des 2 côtés). */
export const MSG_TRACE_ABSENT = 'Signature illisible : tracé absent.';
export const MSG_PAS_PNG =
  'Signature illisible : l’image n’est pas un PNG valide.';
export const MSG_TROP_PETITE =
  'Signature illisible : tracé trop léger pour être probant (moins de 1 Ko).';
export const MSG_TROP_GROSSE =
  'Signature illisible : image trop volumineuse (1 Mo maximum).';

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
 * Ne fait confiance qu'aux octets, jamais au type annoncé.
 * @param {?Uint8Array} octets contenu décodé de l'image
 * @returns {?string} message de refus, ou null si le tracé est recevable
 */
export function verifierImageSignature(octets) {
  if (!octets || octets.length === 0) return MSG_TRACE_ABSENT;
  if (octets.length > SIGNATURE_TAILLE_MAX) return MSG_TROP_GROSSE;
  for (let i = 0; i < MAGIQUES_PNG.length; i += 1) {
    if (octets[i] !== MAGIQUES_PNG[i]) return MSG_PAS_PNG;
  }
  if (octets.length < SIGNATURE_TAILLE_MIN) return MSG_TROP_PETITE;
  return null;
}
