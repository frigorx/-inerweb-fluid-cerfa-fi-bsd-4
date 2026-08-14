// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — PDF FINAL CONSERVÉ d'une fiche officielle, côté serveur
 * (lot C, brique C3).
 *
 * ⚠ MIROIR LITTÉRAL de `v8/js/data/pdf-final.js` (règle de la maison : un
 * module pur du front réutilisé côté serveur est recopié en CommonJS).
 * Les messages canoniques et le contrôle des octets doivent être
 * IDENTIQUES des deux côtés : la parité est prouvée par
 * `server/test-signatures-mouvement.mjs` — ne jamais toucher l'un sans
 * l'autre.
 */

/** Catégorie de pièce jointe SYSTÈME du PDF conservé (CHECK migration 23). */
const CATEGORIE_PDF_FINAL = 'CERFA_FINAL';

/** Nombres magiques %PDF (copie locale : module autonome). */
const MAGIQUES_PDF = [0x25, 0x50, 0x44, 0x46];

/** Plafond défensif : même limite que les pièces jointes (5 Mo). */
const PDF_FINAL_TAILLE_MAX = 5 * 1024 * 1024;

/** Refus canoniques — mot pour mot des deux côtés, testés tels quels. */
const MSG_PDF_FINAL_MANQUANT =
  'Validation officielle refusée : PDF final de la fiche manquant — le '
  + 'document présenté aux signataires doit être transmis et conservé.';
const MSG_PDF_FINAL_INVALIDE =
  'Validation officielle refusée : le contenu transmis n’est pas un PDF '
  + '(signature binaire non conforme).';
const MSG_PDF_FINAL_TROP_GROS =
  'PDF final trop volumineux : 5 Mo maximum.';
const MSG_PDF_FINAL_HORS_OFFICIEL =
  'PDF final conservé : réservé à la validation d’une fiche OFFICIELLE.';
const MSG_PDF_FINAL_TRANSFERT =
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
function pdfFinalAttendu(typeMouvement) {
  return typeMouvement !== 'TRANSFERT';
}

/**
 * Nom de la pièce jointe système qui conserve le PDF final. Dérivé du
 * numéro de FICHE (jamais d'un nom reçu du client — aucune traversée).
 * @param {string} numero
 * @returns {string}
 */
function nomFichierPdfFinal(numero) {
  return `CERFA-${String(numero)}.pdf`;
}

/**
 * Verdict sur les octets du PDF final reçu à la validation officielle.
 * Ordre des refus : vide/manquant, pas un PDF, trop gros.
 * @param {Uint8Array|Buffer|null} octets
 * @returns {{ ok: boolean, erreur: string|null }}
 */
function verifierOctetsPdfFinal(octets) {
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

module.exports = {
  CATEGORIE_PDF_FINAL,
  PDF_FINAL_TAILLE_MAX,
  MSG_PDF_FINAL_MANQUANT,
  MSG_PDF_FINAL_INVALIDE,
  MSG_PDF_FINAL_TROP_GROS,
  MSG_PDF_FINAL_HORS_OFFICIEL,
  MSG_PDF_FINAL_TRANSFERT,
  nomFichierPdfFinal,
  verifierOctetsPdfFinal,
  pdfFinalAttendu
};
