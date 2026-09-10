// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés.
import { esc } from '../core/utils.js';

/** Le statut voyage DANS le document : il survit à l'impression et au PDF.
 * Un support sans mouvement en local est une fiche interne, jamais un CERFA validé.
 * Contexte inconnu = formation (aucune supposition d'usage réel).
 */
export function libelleStatutDocument(store, mouvement = null) {
  if (store?.modeLabel !== 'LOCAL' || (mouvement && mouvement.mode !== 'OFFICIEL')) {
    return 'FORMATION — DOCUMENT NON OFFICIEL';
  }
  return 'DOCUMENT INTERNE — À VÉRIFIER ET COMPLÉTER';
}

export function mentionStatutDocument(store, mouvement = null) {
  return '<div class="statut-document" style="color:#000;background:#fff;'
    + 'border:1px dashed #000;padding:3px 5px;font:700 10px Arial,sans-serif;'
    + 'text-align:left;white-space:normal;overflow-wrap:anywhere;">'
    + esc(libelleStatutDocument(store, mouvement)) + '</div>';
}
