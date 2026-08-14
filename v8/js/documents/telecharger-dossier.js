// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — téléchargement + scellement d'un dossier ZIP (DOM)
// Companion navigateur de dossier-commun.js (qui reste pur/Node-testable) :
// déclenche le téléchargement du .zip puis affiche l'empreinte SHA-256 globale
// à conserver hors du logiciel (preuve d'inviolabilité).
// ============================================================

import { modale, toast } from '../views/communs.js';
import { esc } from '../core/utils.js';
import { construireCertificatHtml } from './verificateur.js';

/** Déclenche le téléchargement d'un blob sous un nom donné. */
function telechargerBlob(objet, nom) {
  const url = URL.createObjectURL(objet);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}

/**
 * Télécharge le dossier et présente son empreinte de scellement,
 * avec le certificat de scellement imprimable (brique ④) — conservé
 * À CÔTÉ de l'archive, jamais dedans (l'empreinte globale ne peut
 * pas vivre dans le fichier qu'elle scelle).
 * @param {{blob: Blob|Uint8Array, nomFichier: string, nbDocuments: number,
 *          empreinte: string, titre?: string}} dossier
 */
export function telechargerEtSceller(dossier) {
  const { blob, nomFichier, nbDocuments, empreinte } = dossier;

  const objet = (typeof Blob !== 'undefined' && blob instanceof Blob)
    ? blob : new Blob([blob], { type: 'application/zip' });
  telechargerBlob(objet, nomFichier);

  toast('Dossier exporté : ' + nbDocuments + ' fichier(s).', 'succes');

  const contenuHtml =
    '<p style="font-size:13px;color:var(--texte-2)">Archive <strong>'
    + esc(nomFichier) + '</strong> téléchargée. Conservez son empreinte '
    + 'SHA-256 <strong>hors du logiciel</strong> (impression, courriel, coffre) : '
    + 'recalculer l’empreinte du fichier .zip et la comparer prouve qu’il n’a '
    + 'pas été modifié.</p>'
    + '<code style="display:block;word-break:break-all;font-size:12px;'
    + 'padding:10px;margin-top:8px;background:var(--fond-2);border-radius:6px;'
    + 'font-family:var(--police-mono);">' + esc(empreinte) + '</code>'
    + '<p style="font-size:13px;color:var(--texte-2);margin-top:10px">'
    + 'L’archive embarque <strong>99-VERIFICATEUR.html</strong> : un auditeur '
    + 'peut vérifier le dossier sans le logiciel (double-clic, hors ligne). '
    + 'Le certificat ci-dessous porte l’empreinte : imprimez-le ou classez-le.</p>';

  const instance = modale({
    titre: 'Scellement du dossier',
    contenuHtml,
    actionsHtml:
      '<button type="button" class="btn btn-secondaire" data-role="certificat">Télécharger le certificat</button>'
      + '<button type="button" class="btn btn-secondaire" data-role="copier">Copier l’empreinte</button>'
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
  instance.racine.querySelector('[data-role="certificat"]')
    .addEventListener('click', () => {
      const p = (n) => String(n).padStart(2, '0');
      const d = new Date();
      const certificat = construireCertificatHtml({
        titre: dossier.titre ?? nomFichier,
        nomFichier,
        empreinte,
        nbDocuments,
        dateTexte: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
          + ` à ${p(d.getHours())}:${p(d.getMinutes())}`
      });
      telechargerBlob(
        new Blob([certificat], { type: 'text/html;charset=utf-8' }),
        nomFichier.replace(/\.zip$/i, '') + '-certificat.html');
      toast('Certificat de scellement téléchargé.', 'succes');
    });
}
