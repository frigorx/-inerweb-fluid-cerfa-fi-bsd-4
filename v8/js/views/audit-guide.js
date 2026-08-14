// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — vue « Audit guidé »
// LE cheminement linéaire pour dérouler un audit complet sans se
// perdre : 9 étapes numérotées dans l'ordre de visite (établissement
// → personnel → outillage → bouteilles → mouvements → contrôles →
// déchets/BSFF → balance → export du dossier scellé). Aucun calcul
// ici — tout vient du moteur pur audit-guide.js, qui rattache les
// alertes du store par famille et lit les compteurs du contrat.
// Lecture seule ; chaque étape s'ouvre d'un clic vers sa vue.
// ============================================================

import { enteteVue, ICONES } from './communs.js';
import { esc } from '../core/utils.js';
import { collecterAuditGuide } from '../data/audit-guide.js';

export const titre = 'Audit guidé';

/* Libellés du bandeau de progression. */
const LIBELLES_GLOBAL = {
  VERT: 'Prêt pour l’audit — déroulez les étapes pour présenter le dossier',
  ORANGE: 'Presque prêt — des points à surveiller sur le parcours',
  ROUGE: 'Des non-conformités à traiter avant l’audit'
};

const STYLE_VUE = `<style>
  .vue-audit-guide .guide-bandeau {
    display: flex; align-items: center; gap: 18px;
    padding: 20px 22px; margin-bottom: 16px;
  }
  .vue-audit-guide .feu-pastille {
    flex: none; width: 44px; height: 44px; border-radius: 50%;
    border: 3px solid rgba(0, 0, 0, 0.08);
  }
  .vue-audit-guide .feu-pastille.petite {
    width: 14px; height: 14px; border-width: 2px; margin-top: 4px;
  }
  .vue-audit-guide .feu-VERT   { background: var(--succes); }
  .vue-audit-guide .feu-ORANGE { background: var(--avert-icone); }
  .vue-audit-guide .feu-ROUGE  { background: var(--danger); }
  .vue-audit-guide .feu-NEUTRE { background: var(--fond-3); }
  .vue-audit-guide .guide-titre {
    font-family: var(--police-titres); font-size: 20px; font-weight: 600;
  }
  .vue-audit-guide .guide-sous-titre { color: var(--texte-2); font-size: 13px; margin-top: 2px; }
  .vue-audit-guide .guide-etapes { display: flex; flex-direction: column; }
  .vue-audit-guide .etape { display: flex; gap: 16px; }
  .vue-audit-guide .etape-rail {
    flex: none; display: flex; flex-direction: column; align-items: center;
    width: 34px;
  }
  .vue-audit-guide .etape-numero {
    flex: none; width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 14px; color: var(--texte-2);
    background: var(--fond-2); border: 1px solid var(--bordure);
  }
  .vue-audit-guide .etape-trait {
    flex: 1; width: 2px; background: var(--bordure); min-height: 14px;
  }
  .vue-audit-guide .etape-carte { flex: 1; min-width: 0; margin-bottom: 14px; }
  .vue-audit-guide .etape-entete { display: flex; align-items: flex-start; gap: 10px; }
  .vue-audit-guide .etape-titre { font-weight: 600; }
  .vue-audit-guide .etape-detail { color: var(--texte-3); font-size: 12.5px; margin-top: 2px; }
  .vue-audit-guide .etape-faits { margin: 10px 0 0; font-size: 13px; color: var(--texte-2); }
  .vue-audit-guide .etape-faits li { padding: 1px 0; margin-left: 18px; }
  .vue-audit-guide .etape-resume { font-size: 13px; color: var(--texte-2); margin: 10px 0 0; }
  .vue-audit-guide .etape-afaire {
    margin: 10px 0 0; padding: 8px 10px; font-size: 12.5px;
    color: var(--texte-2); background: var(--fond-2);
    border-radius: var(--rayon-bouton);
  }
  .vue-audit-guide .liste-constats { list-style: none; margin: 10px 0 0; padding: 0; }
  .vue-audit-guide .liste-constats li {
    padding: 8px; border-top: 1px solid var(--bordure);
    cursor: pointer; border-radius: var(--rayon-bouton);
  }
  .vue-audit-guide .liste-constats li:hover { background: var(--fond-2); }
  .vue-audit-guide .constat-titre { font-size: 13px; font-weight: 600; display: flex; gap: 8px; }
  .vue-audit-guide .constat-detail { font-size: 12px; color: var(--texte-3); margin-left: 22px; }
  .vue-audit-guide .etape-actions { margin-top: 12px; }
  .vue-audit-guide .encart-restantes {
    padding: 12px 14px; margin-top: 2px; font-size: 13px;
    color: var(--texte-2);
  }
</style>`;

/** Pastille ronde du feu (grande ou petite). */
function pastille(etat, petite) {
  return '<span class="feu-pastille feu-' + esc(etat)
    + (petite ? ' petite' : '') + '" aria-hidden="true"></span>';
}

/** Bandeau de progression : pastille globale + « X étapes sur N au vert ». */
function bandeauProgression(r) {
  const morceaux = [`${r.nbVertes} étape${r.nbVertes > 1 ? 's' : ''} sur ${r.nbEvaluees} au vert`];
  morceaux.push('registre ' + (r.registreIntact ? 'intact' : 'ALTÉRÉ'));
  if (!r.officiel.ok) {
    morceaux.push(`${r.officiel.motifs.length} prérequis du mode Officiel manquant${r.officiel.motifs.length > 1 ? 's' : ''}`);
  }
  return '<section class="carte guide-bandeau" role="status" aria-label="'
    + esc(LIBELLES_GLOBAL[r.global]) + '">'
    + pastille(r.global, false)
    + '<div>'
    + '<div class="guide-titre">' + esc(LIBELLES_GLOBAL[r.global]) + '</div>'
    + '<div class="guide-sous-titre">' + esc(morceaux.join(' · '))
    + ' · détail complet dans la vue <a href="#/conformite">Conformité</a></div>'
    + '</div>'
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

/** Une étape du parcours : rail numéroté + carte (état, faits, constats). */
function carteEtape(etape, estDerniere) {
  const enteteEtat = etape.type === 'action'
    ? pastille('NEUTRE', true)
    : pastille(etape.etat, true);

  const faits = etape.faits.length
    ? '<ul class="etape-faits">'
      + etape.faits.map((f) => '<li>' + esc(f) + '</li>').join('') + '</ul>'
    : '';

  const resume = etape.type === 'action' ? ''
    : '<p class="etape-resume">' + esc(etape.resume) + '</p>';

  const constats = etape.alertes.length
    ? '<ul class="liste-constats">'
      + etape.alertes.map(ligneConstat).join('') + '</ul>'
    : '';

  const bouton = '<div class="etape-actions">'
    + '<button type="button" class="btn btn-secondaire btn-petit" data-vue="'
    + esc(etape.vue) + '" aria-label="Ouvrir : ' + esc(etape.vueLibelle) + '">'
    + ICONES['fleche-droite'] + '<span>Ouvrir : ' + esc(etape.vueLibelle) + '</span>'
    + '</button>'
    + '</div>';

  return '<div class="etape" aria-label="Étape ' + etape.numero + ' : '
    + esc(etape.titre) + '">'
    + '<div class="etape-rail">'
    + '<div class="etape-numero">' + etape.numero + '</div>'
    + (estDerniere ? '' : '<div class="etape-trait"></div>')
    + '</div>'
    + '<section class="carte etape-carte">'
    + '<div class="etape-entete">'
    + enteteEtat
    + '<div>'
    + '<div class="etape-titre">' + esc(etape.titre) + '</div>'
    + '<div class="etape-detail">' + esc(etape.detail) + '</div>'
    + '</div>'
    + '</div>'
    + faits
    + resume
    + constats
    + '<div class="etape-afaire">' + esc(etape.aFaire) + '</div>'
    + bouton
    + '</section>'
    + '</div>';
}

/** Encart d'honnêteté : les alertes qui ne relèvent d'aucune étape. */
function encartNonRattachees(nonRattachees) {
  if (!nonRattachees.length) return '';
  const pluriel = nonRattachees.length > 1;
  return '<section class="carte encart-restantes" data-vue="conformite" role="link" '
    + 'tabindex="0" aria-label="Ouvrir la vue Conformité">'
    + `${nonRattachees.length} alerte${pluriel ? 's' : ''} `
    + `ne relève${pluriel ? 'nt' : ''} d’aucune étape du parcours — consultez `
    + 'la vue Conformité pour le tableau exhaustif.'
    + '</section>';
}

/**
 * Rendu de la vue « Audit guidé ».
 * @param {HTMLElement} conteneur - élément vidé d'avance par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const { store, naviguer } = ctx;
  const resultat = await collecterAuditGuide(store);

  conteneur.innerHTML = STYLE_VUE
    + '<div class="vue-audit-guide">'
    + enteteVue({
      titre,
      sousTitre: 'Le chemin pas à pas pour présenter un audit complet — chaque étape s’ouvre d’un clic'
    })
    + bandeauProgression(resultat)
    + '<div class="guide-etapes">'
    + resultat.etapes.map((e, i) =>
      carteEtape(e, i === resultat.etapes.length - 1)).join('')
    + '</div>'
    + encartNonRattachees(resultat.nonRattachees)
    + '</div>';

  // Navigation : boutons d'étape et constats (clic + Entrée).
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
