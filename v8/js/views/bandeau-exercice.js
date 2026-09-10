// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// BANDEAU DU MODE EXERCICE (13/08/2026, plan docs/PLAN-MODE-EXERCICE.md).
// ------------------------------------------------------------
// Posé en PREMIER enfant du body quand le mode exercice est actif : il
// pousse l'application vers le bas (jamais de recouvrement) et dit sans
// ambiguïté que RIEN ne s'écrit au registre. Les trois gestes du cycle de
// vie y vivent : sauvegarder l'exercice (fichier JSON du bac),
// réinitialiser (re-semer la photo d'origine), terminer et TOUT effacer.
// À l'impression, les blocs @media print des documents masquent tout le
// body sauf le document : le bandeau ne sort jamais sur le papier.
// ============================================================

import {
  estActif, dateExercice, reinitialiser, terminerExerciceComplet
} from '../data/mode-exercice.js';
import { estSeanceFictive } from '../data/seance-fictive.js';

const STYLE_ID = 'style-bandeau-exercice';

function assurerStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .bandeau-exercice {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 10px 14px;
      background: #7c2d12;
      color: #ffffff;
      font-weight: 700;
      text-align: center;
      border-bottom: 4px solid #ea580c;
    }
    .bandeau-exercice__texte { font-size: 15px; }
    .bandeau-exercice__date { font-weight: 400; opacity: 0.9; }
    .bandeau-exercice button {
      padding: 6px 12px;
      border: 1px solid #ffffff;
      border-radius: 6px;
      background: transparent;
      color: #ffffff;
      font-weight: 600;
      cursor: pointer;
    }
    .bandeau-exercice button:hover { background: rgba(255,255,255,0.15); }
    .bandeau-exercice button.bandeau-exercice__danger {
      background: #ffffff;
      color: #7c2d12;
    }
  `;
  document.head.appendChild(style);
}

/** Date ISO → « 13/08/2026 à 15 h 04 » (repli : la chaîne telle quelle). */
function dateLisible(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const deux = (n) => String(n).padStart(2, '0');
  return `${deux(d.getDate())}/${deux(d.getMonth() + 1)}/${d.getFullYear()}`
    + ` à ${d.getHours()} h ${deux(d.getMinutes())}`;
}

/** Télécharge un texte comme fichier (patron de l'écran Sauvegarde). */
function telechargerTexte(nomFichier, texte) {
  const blob = new Blob([texte], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}

/**
 * Pose le bandeau si le mode exercice est actif. Appelé par app.js au
 * démarrage, avec le store courant (le BAC — datastore a déjà choisi).
 * @param {object} store - magasin conforme au contrat (le bac à sable)
 */
export function poserBandeauExercice(store) {
  if (estSeanceFictive()) return;
  if (!estActif()) return;
  assurerStyle();

  const bandeau = document.createElement('div');
  bandeau.className = 'bandeau-exercice';
  bandeau.setAttribute('role', 'status');
  const quand = dateLisible(dateExercice());
  bandeau.innerHTML =
    '<span class="bandeau-exercice__texte">MODE EXERCICE — bac à sable : '
    + 'rien ne s’écrit au registre'
    + (quand
      ? ' <span class="bandeau-exercice__date">(données réelles du '
        + quand + ')</span>'
      : '')
    + '</span>'
    + '<span class="bandeau-exercice__texte">Cette copie peut contenir des données personnelles. '
    + 'Terminer l’exercice efface le bac de ce navigateur, pas les fichiers téléchargés.</span>'
    + '<button type="button" data-geste="sauvegarder">Sauvegarder l’exercice</button>'
    + '<button type="button" data-geste="reinitialiser">Réinitialiser</button>'
    + '<button type="button" class="bandeau-exercice__danger" '
    + 'data-geste="terminer">Terminer et effacer le bac</button>'
    + '<span data-erreur-exercice role="alert"></span>';

  bandeau.addEventListener('click', async (evt) => {
    const geste = evt.target?.dataset?.geste;
    if (!geste) return;
    if (geste === 'sauvegarder') {
      const texte = await store.exporterJSON();
      const jour = new Date().toISOString().slice(0, 10);
      telechargerTexte(`exercice-inerweb-fluide-${jour}.json`, texte);
      return;
    }
    if (geste === 'reinitialiser') {
      const ok = window.confirm(
        'Réinitialiser l’exercice ?\n\nLe travail en cours dans le bac à '
        + 'sable sera remplacé par la photo d’origine du registre.');
      if (!ok) return;
      reinitialiser();
      window.location.reload();
      return;
    }
    if (geste === 'terminer') {
      const ok = window.confirm(
        'Terminer le mode exercice ?\n\nLes données, la photo d’origine et les pièces '
        + 'jointes du bac gérées dans ce navigateur seront supprimées. Les fichiers '
        + 'téléchargés, impressions et copies système restent en dehors de cet effacement.');
      if (!ok) return;
      const confirme = window.confirm(
        'Dernière confirmation : effacer DÉFINITIVEMENT le bac à sable et '
        + 'revenir au registre réel ?');
      if (!confirme) return;
      const boutons = [...bandeau.querySelectorAll('button')];
      const zones = [...document.body.children].filter(e => e !== bandeau)
        .map(e => [e, e.inert]);
      boutons.forEach(b => { b.disabled = true; });
      zones.forEach(([e]) => { e.inert = true; });
      try {
        await terminerExerciceComplet();
        window.location.reload();
      } catch (e) {
        bandeau.querySelector('[data-erreur-exercice]').textContent = e.message;
        boutons.forEach(b => { b.disabled = false; });
        zones.forEach(([e, ancien]) => { e.inert = ancien; });
      }
    }
  });

  document.body.insertBefore(bandeau, document.body.firstChild);
}
