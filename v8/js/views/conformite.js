// ============================================================
// inerWeb Fluide — vue « Conformité » (brique ① feu tricolore)
// LE tableau de bord pour l'inspecteur : l'état réglementaire
// complet en un écran vert / orange / rouge. Aucun calcul ici —
// tout vient du moteur pur feu-tricolore.js, qui consolide
// getAlertes + peutPasserEnOfficiel + verifierChaineHash
// (la conformité était éclatée sur 5 vues, examen du 10/07).
// Lecture seule ; chaque constat est cliquable vers sa vue.
// ============================================================

import { enteteVue, ICONES } from './communs.js';
import { esc, fmtDate } from '../core/utils.js';
import { collecterConformite } from '../data/feu-tricolore.js';

export const titre = 'Conformité';

/* Libellés du feu global. */
const LIBELLES_GLOBAL = {
  VERT: 'Conforme — prêt pour un audit',
  ORANGE: 'Points à surveiller avant un audit',
  ROUGE: 'Non-conformités à traiter'
};

const STYLE_VUE = `<style>
  .vue-conformite .feu-bandeau {
    display: flex; align-items: center; gap: 18px;
    padding: 20px 22px; margin-bottom: 16px;
  }
  .vue-conformite .feu-pastille {
    flex: none; width: 44px; height: 44px; border-radius: 50%;
    border: 3px solid rgba(0, 0, 0, 0.08);
  }
  .vue-conformite .feu-pastille.petite {
    width: 14px; height: 14px; border-width: 2px; margin-top: 3px;
  }
  .vue-conformite .feu-VERT   { background: var(--succes); }
  .vue-conformite .feu-ORANGE { background: var(--avert-icone); }
  .vue-conformite .feu-ROUGE  { background: var(--danger); }
  .vue-conformite .feu-titre {
    font-family: var(--police-titres); font-size: 20px; font-weight: 600;
  }
  .vue-conformite .feu-sous-titre { color: var(--texte-2); font-size: 13px; margin-top: 2px; }
  .vue-conformite .grille-domaines {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }
  .vue-conformite .domaine-entete {
    display: flex; align-items: flex-start; gap: 10px;
    cursor: pointer; border-radius: var(--rayon-bouton);
    margin: -6px; padding: 6px;
  }
  .vue-conformite .domaine-entete:hover { background: var(--fond-2); }
  .vue-conformite .domaine-titre { font-weight: 600; }
  .vue-conformite .domaine-detail { color: var(--texte-3); font-size: 12px; margin-top: 1px; }
  .vue-conformite .domaine-resume { font-size: 13px; color: var(--texte-2); margin: 10px 0 0; }
  .vue-conformite .liste-constats { list-style: none; margin: 10px 0 0; padding: 0; }
  .vue-conformite .liste-constats li {
    padding: 8px; border-top: 1px solid var(--bordure);
    cursor: pointer; border-radius: var(--rayon-bouton);
  }
  .vue-conformite .liste-constats li:hover { background: var(--fond-2); }
  .vue-conformite .constat-titre { font-size: 13px; font-weight: 600; display: flex; gap: 8px; }
  .vue-conformite .constat-detail { font-size: 12px; color: var(--texte-3); margin-left: 22px; }
  .vue-conformite .officiel-motifs { margin: 10px 0 0; padding-left: 18px; }
  .vue-conformite .officiel-motifs li { font-size: 13px; color: var(--texte-2); padding: 2px 0; }
  .vue-conformite .officiel-ok {
    display: flex; align-items: center; gap: 8px;
    color: var(--succes); font-weight: 600; font-size: 14px; margin-top: 10px;
  }
</style>`;

/** Pastille ronde du feu (grande ou petite). */
function pastille(etat, petite) {
  return '<span class="feu-pastille feu-' + esc(etat)
    + (petite ? ' petite' : '') + '" aria-hidden="true"></span>';
}

/** Bandeau du feu global. */
function bandeauGlobal(r, jour) {
  const compteurs = [];
  if (r.nbCritiques) compteurs.push(`${r.nbCritiques} point${r.nbCritiques > 1 ? 's' : ''} bloquant${r.nbCritiques > 1 ? 's' : ''}`);
  if (r.nbImportantes) compteurs.push(`${r.nbImportantes} à surveiller`);
  const sousTitre = (compteurs.length ? compteurs.join(', ') : 'Aucune alerte ouverte')
    + ' · registre ' + (r.registreIntact ? 'intact' : 'ALTÉRÉ')
    + ' · état du ' + fmtDate(jour);
  return '<section class="carte feu-bandeau" role="status" aria-label="'
    + esc(LIBELLES_GLOBAL[r.global]) + '">'
    + pastille(r.global, false)
    + '<div>'
    + '<div class="feu-titre">' + esc(LIBELLES_GLOBAL[r.global]) + '</div>'
    + '<div class="feu-sous-titre">' + esc(sousTitre) + '</div>'
    + '</div>'
    + '</section>';
}

/** Carte « Mode Officiel » : les prérequis bloquants de la SPEC §7.2. */
function carteOfficiel(officiel) {
  const contenu = officiel.ok
    ? '<p class="officiel-ok">' + ICONES.coche
      + '<span>Tous les prérequis du mode Officiel sont réunis.</span></p>'
    : '<ul class="officiel-motifs">'
      + officiel.motifs.map((m) => '<li>' + esc(m) + '</li>').join('')
      + '</ul>';
  return '<section class="carte">'
    + '<div class="domaine-entete" style="cursor:default">'
    + pastille(officiel.ok ? 'VERT' : 'ORANGE', true)
    + '<div>'
    + '<div class="domaine-titre">Prérequis du mode Officiel</div>'
    + '<div class="domaine-detail">Les vérifications bloquantes avant tout passage en réel (SPEC §7.2).</div>'
    + '</div>'
    + '</div>'
    + contenu
    + '</section>';
}

/** Un constat (alerte) cliquable vers sa cible. */
function ligneConstat(alerte) {
  const cible = alerte.cible || {};
  return '<li role="link" tabindex="0" data-vue="' + esc(cible.vue || '') + '" '
    + 'aria-label="' + esc(alerte.titre) + '">'
    + '<div class="constat-titre">' + pastille(alerte.niveau === 'CRITIQUE' ? 'ROUGE' : 'ORANGE', true)
    + '<span>' + esc(alerte.titre) + '</span></div>'
    + (alerte.detail ? '<div class="constat-detail">' + esc(alerte.detail) + '</div>' : '')
    + '</li>';
}

/** Carte d'un domaine : feu, titre, résumé, constats cliquables. */
function carteDomaine(domaine) {
  const constats = domaine.alertes.length
    ? '<ul class="liste-constats">'
      + domaine.alertes.map(ligneConstat).join('') + '</ul>'
    : '';
  return '<section class="carte" aria-label="' + esc(domaine.titre) + ' : '
    + esc(domaine.etat) + '">'
    + '<div class="domaine-entete" role="link" tabindex="0" data-vue="'
    + esc(domaine.vue) + '" aria-label="Ouvrir : ' + esc(domaine.titre) + '">'
    + pastille(domaine.etat, true)
    + '<div>'
    + '<div class="domaine-titre">' + esc(domaine.titre) + '</div>'
    + '<div class="domaine-detail">' + esc(domaine.detail) + '</div>'
    + '</div>'
    + '</div>'
    + '<p class="domaine-resume">' + esc(domaine.resume) + '</p>'
    + constats
    + '</section>';
}

/**
 * Rendu de la vue « Conformité ».
 * @param {HTMLElement} conteneur - élément vidé d'avance par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const { store, naviguer } = ctx;
  const resultat = await collecterConformite(store);
  const jour = new Date().toISOString().slice(0, 10);

  conteneur.innerHTML = STYLE_VUE
    + '<div class="vue-conformite">'
    + enteteVue({
      titre,
      sousTitre: 'L’état réglementaire complet en un écran — ce qu’un auditeur vérifierait'
    })
    + bandeauGlobal(resultat, jour)
    + carteOfficiel(resultat.officiel)
    + '<div class="grille-domaines">'
    + resultat.domaines.map(carteDomaine).join('')
    + '</div>'
    + '</div>';

  // Navigation : en-têtes de domaine et constats (clic + Entrée).
  conteneur.querySelectorAll('[data-vue]').forEach((element) => {
    const vueCible = element.dataset.vue;
    if (!vueCible) return;
    const aller = () => naviguer(vueCible);
    element.addEventListener('click', aller);
    element.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); aller(); }
    });
  });
}
