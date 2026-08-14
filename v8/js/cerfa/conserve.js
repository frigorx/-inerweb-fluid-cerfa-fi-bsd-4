// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — PDF final CONSERVÉ : service au visualiseur
// (lot C, brique C3b). Rôle : décider quand le bouton « CERFA »
// doit servir le document CONSERVÉ (fiche OFFICIELLE figée avec
// hashPdfFinal scellé) au lieu du générateur, le charger par le
// canal pièces jointes du contrat, et VÉRIFIER son empreinte
// SHA-256 contre celle scellée dans l'écriture (empreinte v2).
// Un PDF absent ou altéré est DÉNONCÉ (Error canonique), jamais
// remplacé par une régénération (plan lot C §5 : « jamais le
// générateur »). Sans DOM — testé par test-conserve.mjs avec un
// magasin factice.
// ============================================================

import { CATEGORIE_PDF_FINAL } from '../data/pdf-final.js';

/** Refus canoniques du service du PDF conservé (affichés tels quels). */
export const MSG_PDF_CONSERVE_INTROUVABLE =
  'PDF final conservé introuvable : la fiche officielle est scellée avec '
  + 'l’empreinte d’un PDF, mais la pièce jointe CERFA_FINAL manque. '
  + 'Aucune régénération — restaurer une sauvegarde vérifiée.';
export const MSG_PDF_CONSERVE_ALTERE =
  'PDF final conservé ALTÉRÉ : son empreinte SHA-256 ne correspond plus à '
  + 'celle scellée dans l’écriture. Document non affiché — restaurer une '
  + 'sauvegarde vérifiée.';

/**
 * La fiche doit-elle être servie depuis le document CONSERVÉ ?
 * Vrai pour une écriture OFFICIELLE figée dont l'empreinte du PDF final
 * est scellée (hashPdfFinal non null). Les écritures officielles figées
 * SANS PDF conservé (historique d'avant le lot C, contre-écritures)
 * restent servies par le générateur, comme aujourd'hui.
 * @param {object|null|undefined} mouvement
 * @returns {boolean}
 */
export function doitServirPdfConserve(mouvement) {
  return Boolean(mouvement && mouvement.mode === 'OFFICIEL'
    && (mouvement.statut === 'VALIDE' || mouvement.statut === 'ANNULE')
    && mouvement.hashPdfFinal);
}

/**
 * Résout le mouvement dont le PDF CONSERVÉ doit être servi pour une cible
 * du visualiseur, ou null (→ générateur). Couvre les DEUX portes : la
 * fiche elle-même (source 'mouvement') ET son contrôle LIÉ (source
 * 'controle' — le contrôle lié « EST la même fiche » : il hérite du
 * numéro et du mode, régénérer par sa porte contournerait le « jamais le
 * générateur » ; constat de la relecture adversariale C3b, éprouvé).
 * Un contrôle AUTONOME (sans mouvementId) reste au générateur.
 * @param {object} store magasin conforme au contrat
 * @param {{ source: 'mouvement'|'controle', id: string }} cible
 * @returns {Promise<object|null>} le mouvement figé à servir, ou null
 */
export async function resoudreMouvementConserve(store, { source, id }) {
  let mouvementId = null;
  if (source === 'mouvement') {
    mouvementId = id;
  } else if (source === 'controle') {
    const controle = (await store.getControles())
      .find((c) => c.id === id);
    mouvementId = controle?.mouvementId ?? null;
  }
  if (!mouvementId) return null;
  const mouvement = (await store.getMouvements())
    .find((mv) => mv.id === mouvementId);
  return doitServirPdfConserve(mouvement) ? mouvement : null;
}

/** Empreinte SHA-256 hexadécimale d'octets (subtle, repli Node). */
async function empreinteHexOctets(octets) {
  let subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    const { webcrypto } = await import('node:crypto');
    subtle = webcrypto.subtle;
  }
  const empreinte = await subtle.digest('SHA-256', octets);
  return [...new Uint8Array(empreinte)]
    .map((octet) => octet.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Charge le PDF final CONSERVÉ d'une fiche officielle figée et vérifie
 * son empreinte contre celle scellée dans l'écriture.
 * @param {object} store magasin conforme au contrat (listerPiecesJointes,
 *   obtenirPieceJointe)
 * @param {object} mouvement l'écriture figée (id, numero, cerfaNumero,
 *   hashPdfFinal)
 * @returns {Promise<{ octets: Uint8Array, nomFichier: string,
 *   numero: string }>}
 * @throws {Error} MSG_PDF_CONSERVE_INTROUVABLE | MSG_PDF_CONSERVE_ALTERE
 */
export async function chargerPdfConserve(store, mouvement) {
  const pieces = await store.listerPiecesJointes('MOUVEMENT', mouvement.id);
  const meta = (pieces ?? []).find(
    (pj) => pj.categorie === CATEGORIE_PDF_FINAL);
  if (!meta) throw new Error(MSG_PDF_CONSERVE_INTROUVABLE);
  let piece;
  try {
    piece = await store.obtenirPieceJointe(meta.id);
  } catch {
    // Métadonnée présente mais binaire indisponible (fichier disparu,
    // base importée sans son dossier documents/) : même consigne
    // canonique — jamais de régénération.
    throw new Error(MSG_PDF_CONSERVE_INTROUVABLE);
  }
  const octets = piece.blob instanceof Uint8Array
    ? piece.blob
    : new Uint8Array(await piece.blob.arrayBuffer());
  // LA vérification : le contenu relu doit porter l'empreinte SCELLÉE
  // dans l'écriture (jamais celle des métadonnées, falsifiables).
  if (await empreinteHexOctets(octets) !== mouvement.hashPdfFinal) {
    throw new Error(MSG_PDF_CONSERVE_ALTERE);
  }
  return {
    octets,
    nomFichier: meta.nomFichier,
    numero: mouvement.cerfaNumero ?? mouvement.numero
  };
}
