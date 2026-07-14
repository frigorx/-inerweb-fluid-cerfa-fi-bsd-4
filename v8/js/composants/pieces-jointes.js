// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — composant « Pièces jointes » (Phase C)
// Liste les pièces justificatives d'une entité (attestation,
// certificat, facture, photo de pesée…) et permet d'en ajouter
// par sélection de fichier ou par glisser-déposer.
// Contenus stockés par le store (IndexedDB, repli mémoire).
// Contrat : zonePiecesJointes(conteneur, ctx, options) → { rafraichir }
// ============================================================

import { esc, fmtDate } from '../core/utils.js';
import { ICONES } from '../views/communs.js';

/** Taille maximale acceptée côté interface : 5 Mo (comme le store). */
const TAILLE_MAX = 5 * 1024 * 1024;

/** Types de fichiers acceptés comme pièces justificatives. */
const TYPES_ACCEPTES = ['application/pdf', 'image/png', 'image/jpeg',
  'image/webp', 'image/gif'];

/** Attribut accept de l'entrée fichier (mêmes types que ci-dessus). */
const ACCEPT_FICHIERS = '.pdf,image/png,image/jpeg,image/webp,image/gif';

/** Formate une taille en octets de façon lisible : « 1,2 Mo », « 480 ko ». */
function tailleLisible(octets) {
  const n = Number(octets);
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toLocaleString('fr-FR', {
    maximumFractionDigits: 0
  })} ko`;
  return `${(n / (1024 * 1024)).toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })} Mo`;
}

/**
 * Monte la zone « Pièces jointes » d'une entité dans un conteneur.
 * @param {HTMLElement} conteneur - élément hôte (vidé puis rempli)
 * @param {object} ctx - contexte de vue ({ store, naviguer })
 * @param {object} options - { entiteType, entiteId, categorie, lectureSeule }
 * @returns {{ rafraichir: function }} poignée de rafraîchissement
 */
export function zonePiecesJointes(conteneur, ctx,
  { entiteType, entiteId, categorie = 'AUTRE', lectureSeule = false }) {

  const { store } = ctx;

  conteneur.innerHTML = `
    <div class="zone-pj">
      <div class="pj-liste"></div>
      ${lectureSeule ? '' : `
      <label class="pj-depot">
        ${ICONES.televerser}
        <span class="pj-depot-texte">
          <strong>Ajouter une pièce jointe</strong>
          <span>Cliquer ou déposer un fichier ici (PDF ou image, 5 Mo max.)</span>
        </span>
        <input type="file" accept="${ACCEPT_FICHIERS}" multiple hidden
          aria-label="Ajouter une pièce jointe (PDF ou image, 5 Mo maximum)">
      </label>`}
      <div class="pj-message" hidden></div>
    </div>`;

  const zone = conteneur.querySelector('.zone-pj');
  const liste = conteneur.querySelector('.pj-liste');
  const depot = conteneur.querySelector('.pj-depot');
  const entree = conteneur.querySelector('input[type="file"]');
  const message = conteneur.querySelector('.pj-message');

  /** Affiche un message (erreur ou information) sous la zone. */
  function afficherMessage(texte, type = 'erreur') {
    message.textContent = texte;
    message.hidden = !texte;
    message.classList.toggle('pj-message-erreur', type === 'erreur');
  }

  /** Redessine la liste des pièces jointes depuis le store. */
  async function rafraichir() {
    const pieces = await store.listerPiecesJointes(entiteType, entiteId);
    if (pieces.length === 0) {
      liste.innerHTML =
        '<p class="pj-vide">Aucune pièce jointe pour le moment.</p>';
      return;
    }
    liste.innerHTML = pieces.map((pj) => `
      <div class="pj-ligne" data-id="${esc(pj.id)}">
        <div class="pj-infos">
          <span class="pj-nom">${esc(pj.nomFichier)}</span>
          <span class="pj-meta">${esc(tailleLisible(pj.taille))} ·
            ajoutée le ${esc(fmtDate(pj.dateAjout))}</span>
        </div>
        <div class="pj-actions">
          <button type="button" class="pj-telecharger"
            title="Télécharger ${esc(pj.nomFichier)}"
            aria-label="Télécharger ${esc(pj.nomFichier)}">${ICONES.telecharger}</button>
          ${lectureSeule ? '' : `
          <button type="button" class="pj-supprimer"
            title="Supprimer ${esc(pj.nomFichier)}"
            aria-label="Supprimer ${esc(pj.nomFichier)}">${ICONES.croix}</button>`}
        </div>
      </div>`).join('');
  }

  /** Télécharge une pièce jointe via un lien temporaire. */
  async function telecharger(id) {
    try {
      const pj = await store.obtenirPieceJointe(id);
      const url = URL.createObjectURL(pj.blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = pj.nomFichier;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
    } catch (erreur) {
      afficherMessage(erreur.message);
    }
  }

  /** Contrôles côté interface, puis ajout au store. */
  async function ajouterFichiers(fichiers) {
    afficherMessage('');
    for (const fichier of fichiers) {
      if (!TYPES_ACCEPTES.includes(fichier.type)) {
        afficherMessage(
          `Type de fichier non accepté : ${fichier.name} ` +
          '(PDF ou image attendu).');
        continue;
      }
      if (fichier.size > TAILLE_MAX) {
        afficherMessage(
          `Fichier trop volumineux : ${fichier.name} ` +
          `(${tailleLisible(fichier.size)} — 5 Mo maximum).`);
        continue;
      }
      try {
        await store.ajouterPieceJointe({
          entiteType,
          entiteId,
          categorie,
          nomFichier: fichier.name,
          mimeType: fichier.type,
          blob: fichier
        });
      } catch (erreur) {
        afficherMessage(erreur.message);
      }
    }
    await rafraichir();
  }

  // ---- Écouteurs -------------------------------------------

  liste.addEventListener('click', async (evenement) => {
    const ligne = evenement.target.closest('.pj-ligne');
    if (!ligne) return;
    if (evenement.target.closest('.pj-telecharger')) {
      await telecharger(ligne.dataset.id);
    } else if (evenement.target.closest('.pj-supprimer')) {
      try {
        await store.supprimerPieceJointe(ligne.dataset.id);
        afficherMessage('');
        await rafraichir();
      } catch (erreur) {
        afficherMessage(erreur.message);
      }
    }
  });

  if (!lectureSeule && depot && entree) {
    entree.addEventListener('change', async () => {
      await ajouterFichiers([...entree.files]);
      entree.value = '';
    });
    depot.addEventListener('dragover', (evenement) => {
      evenement.preventDefault();
      depot.classList.add('pj-depot-survol');
    });
    depot.addEventListener('dragleave', () => {
      depot.classList.remove('pj-depot-survol');
    });
    depot.addEventListener('drop', async (evenement) => {
      evenement.preventDefault();
      depot.classList.remove('pj-depot-survol');
      await ajouterFichiers([...(evenement.dataTransfer?.files ?? [])]);
    });
  }

  // Premier remplissage (asynchrone, sans bloquer le montage)
  rafraichir().catch((erreur) => afficherMessage(erreur.message));

  // La zone reste accessible pour d'éventuels styles conditionnels
  zone.dataset.entite = `${entiteType}/${entiteId}`;

  return { rafraichir };
}
