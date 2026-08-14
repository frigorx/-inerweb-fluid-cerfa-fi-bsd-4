// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — PDF FINAL CONSERVÉ d'une fiche officielle
// (module PUR). Lot C du plan audit-proof (condition 4), brique C3.
//
// Rôle : la vérité PARTAGÉE de la réception du PDF final à la
// validation OFFICIELLE (plan lot C §5) —
//  - messages CANONIQUES des refus (manquant, pas un PDF, trop
//    gros, fourni hors mode Officiel) ;
//  - contrôle du contenu reçu : nombres magiques %PDF (copiés de
//    contenu-pj.js pour garder le module autonome), plafond 5 Mo
//    (même limite que les pièces jointes) ;
//  - nom de fichier de la pièce jointe SYSTÈME (catégorie
//    CERFA_FINAL) qui conserve le document, dérivé du NUMÉRO de
//    fiche — jamais reçu du client.
//
// Aucune I/O, aucune dépendance. Dupliqué en littéral CommonJS
// côté serveur (server/pdf-final.js) — parité prouvée par
// server/test-signatures-mouvement.mjs : ne jamais toucher l'un
// sans l'autre.
// ============================================================

/** Catégorie de pièce jointe SYSTÈME du PDF conservé (CHECK migration 23). */
export const CATEGORIE_PDF_FINAL = 'CERFA_FINAL';

/** Nombres magiques %PDF (copie locale de contenu-pj.js : module autonome). */
const MAGIQUES_PDF = [0x25, 0x50, 0x44, 0x46];

/** Plafond défensif : même limite que les pièces jointes (5 Mo). */
export const PDF_FINAL_TAILLE_MAX = 5 * 1024 * 1024;

/** Refus canoniques — mot pour mot des deux côtés, testés tels quels. */
export const MSG_PDF_FINAL_MANQUANT =
  'Validation officielle refusée : PDF final de la fiche manquant — le '
  + 'document présenté aux signataires doit être transmis et conservé.';
export const MSG_PDF_FINAL_INVALIDE =
  'Validation officielle refusée : le contenu transmis n’est pas un PDF '
  + '(signature binaire non conforme).';
export const MSG_PDF_FINAL_TROP_GROS =
  'PDF final trop volumineux : 5 Mo maximum.';
export const MSG_PDF_FINAL_HORS_OFFICIEL =
  'PDF final conservé : réservé à la validation d’une fiche OFFICIELLE.';
export const MSG_PDF_FINAL_TRANSFERT =
  'PDF final conservé : sans objet pour un transfert — ce mouvement '
  + 'interne ne produit jamais de CERFA (IM-12).';

/**
 * Un PDF final (CERFA) est-il ATTENDU à la validation officielle de ce
 * type de mouvement ? Arbitrage Franck du 19/07 (plan lot C, brique C5) :
 * le TRANSFERT est EXEMPTÉ — il ne produit jamais de CERFA (IM-12,
 * aucun numéro de fiche). L'écriture scelle quand même en v2, chaînée,
 * avec `hashPdfFinal` null : opposable, simplement sans pièce
 * documentaire. Un PDF fourni malgré tout est REFUSÉ (compromis
 * protecteur : aucune pièce non attendue n'entre au registre).
 * @param {string} typeMouvement
 * @returns {boolean}
 */
export function pdfFinalAttendu(typeMouvement) {
  return typeMouvement !== 'TRANSFERT';
}

/**
 * Nom de la pièce jointe système qui conserve le PDF final. Dérivé du
 * numéro de FICHE (jamais d'un nom reçu du client — aucune traversée).
 * @param {string} numero
 * @returns {string}
 */
export function nomFichierPdfFinal(numero) {
  return `CERFA-${String(numero)}.pdf`;
}

/**
 * Verdict sur les octets du PDF final reçu à la validation officielle.
 * Ordre des refus : vide/manquant, pas un PDF, trop gros.
 * @param {Uint8Array|Buffer|null} octets
 * @returns {{ ok: boolean, erreur: string|null }}
 */
export function verifierOctetsPdfFinal(octets) {
  if (!octets || octets.length === 0) {
    return { ok: false, erreur: MSG_PDF_FINAL_MANQUANT };
  }
  for (let i = 0; i < MAGIQUES_PDF.length; i += 1) {
    if (octets[i] !== MAGIQUES_PDF[i]) {
      return { ok: false, erreur: MSG_PDF_FINAL_INVALIDE };
    }
  }
  if (octets.length > PDF_FINAL_TAILLE_MAX) {
    return { ok: false, erreur: MSG_PDF_FINAL_TROP_GROS };
  }
  return { ok: true, erreur: null };
}
