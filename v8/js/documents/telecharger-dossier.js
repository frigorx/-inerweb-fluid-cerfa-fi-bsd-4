// ============================================================
// inerWeb Fluide v8 — téléchargement + scellement d'un dossier ZIP (DOM)
// Companion navigateur de dossier-commun.js (qui reste pur/Node-testable) :
// déclenche le téléchargement du .zip puis affiche l'empreinte SHA-256 globale
// à conserver hors du logiciel (preuve d'inviolabilité).
// ============================================================

import { modale, toast } from '../views/communs.js';
import { esc } from '../core/utils.js';

/**
 * Télécharge le dossier et présente son empreinte de scellement.
 * @param {{blob: Blob|Uint8Array, nomFichier: string, nbDocuments: number,
 *          empreinte: string}} dossier
 */
export function telechargerEtSceller(dossier) {
  const { blob, nomFichier, nbDocuments, empreinte } = dossier;

  const objet = (typeof Blob !== 'undefined' && blob instanceof Blob)
    ? blob : new Blob([blob], { type: 'application/zip' });
  const url = URL.createObjectURL(objet);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);

  toast('Dossier exporté : ' + nbDocuments + ' fichier(s).', 'succes');

  const contenuHtml =
    '<p style="font-size:13px;color:var(--texte-2)">Archive <strong>'
    + esc(nomFichier) + '</strong> téléchargée. Conservez son empreinte '
    + 'SHA-256 <strong>hors du logiciel</strong> (impression, courriel, coffre) : '
    + 'recalculer l’empreinte du fichier .zip et la comparer prouve qu’il n’a '
    + 'pas été modifié.</p>'
    + '<code style="display:block;word-break:break-all;font-size:12px;'
    + 'padding:10px;margin-top:8px;background:var(--fond-2);border-radius:6px;'
    + 'font-family:var(--police-mono);">' + esc(empreinte) + '</code>';

  const instance = modale({
    titre: 'Scellement du dossier',
    contenuHtml,
    actionsHtml:
      '<button type="button" class="btn btn-secondaire" data-role="copier">Copier l’empreinte</button>'
      + '<button type="button" class="btn btn-primaire" data-role="fermer">Fermer</button>'
  });
  instance.racine.querySelector('[data-role="fermer"]')
    .addEventListener('click', instance.fermer);
  instance.racine.querySelector('[data-role="copier"]')
    .addEventListener('click', () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(empreinte)
          .then(() => toast('Empreinte copiée.', 'info'))
          .catch(() => toast('Copie impossible.', 'erreur'));
      }
    });
}
