// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — interface de correction du CERFA élève (brique ⑤)
//
// Modale PLEIN ÉCRAN sœur de cerfa/visualiseur.js (même construction :
// fond sombre, bandeau marine, fermeture croix/fond/Échap). Le cœur de
// correction (comparaison attendu ↔ saisi) est ENTIÈREMENT dans
// correction.js — ce module ne fait QUE l'habillage :
//   1. dépôt du PDF élève (rappel PDF officiel vierge à l'ordinateur,
//      nom d'élève optionnel, bouton stylé + zone de dépôt) ;
//   2. rapport lisible (pourcentage, compteurs, PAR CADRE un tableau
//      des lignes ACTIVES — les lignes VIDE et les cadres sans ligne
//      active n'apparaissent pas, pour ne pas noyer l'essentiel) ;
//   3. téléchargement d'un rapport HTML autonome imprimable.
//
// ⚠️ Le PDF importé est une DONNÉE HOSTILE (rempli par un élève) :
// toute valeur affichée (attendu/saisi/nom d'élève) passe par esc().
// ============================================================

import { corrigerCerfaEleve, STATUTS_CORRECTION } from './correction.js';
import { ICONES, tableau, toast } from '../views/communs.js';
import { esc } from '../core/utils.js';
import { nomSur } from '../documents/dossier-commun.js';

/** Classe de chip par statut de correction (VIDE n'est jamais affiché). */
const CLASSES_STATUT = {
  OK: 'chip-vert',
  ERREUR: 'chip-rouge',
  MANQUANT: 'chip-rouge',
  A_TORT: 'chip-ambre'
};

/* ============================================================
   Styles propres à la modale (injectés une seule fois),
   préfixe « cerfa-cor- » pour éviter toute collision.
   ============================================================ */

const ID_STYLES = 'styles-cerfa-correcteur';

const STYLES = `
  .cerfa-cor {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: flex;
    flex-direction: column;
    background: rgba(10, 24, 40, .94);
    opacity: 0;
    transition: opacity .2s ease;
  }
  .cerfa-cor.visible { opacity: 1; }

  .cerfa-cor-bandeau {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    background: var(--marine-900);
    color: #ffffff;
    box-shadow: 0 1px 0 rgba(255, 255, 255, .08);
  }
  .cerfa-cor-titre {
    flex: 1 1 auto;
    min-width: 0;
    font-family: var(--police-titres);
    font-size: 16px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cerfa-cor-numero {
    font-family: var(--police-mono);
    font-weight: 500;
    color: var(--accent-clair);
  }
  .cerfa-cor-bandeau .btn svg { width: 16px; height: 16px; }
  .cerfa-cor-btn-clair {
    background: transparent;
    color: #e6edf5;
    border: 1px solid rgba(255, 255, 255, .35);
  }
  .cerfa-cor-btn-clair:hover:not(:disabled) {
    background: rgba(255, 255, 255, .12);
    color: #ffffff;
  }

  .cerfa-cor-corps {
    flex: 1 1 auto;
    overflow: auto;
    padding: 28px 16px 44px;
    display: flex;
    justify-content: center;
  }
  .cerfa-cor-panneau {
    width: 100%;
    max-width: 760px;
    align-self: flex-start;
    background: var(--carte);
    border-radius: var(--rayon-carte);
    box-shadow: 0 10px 34px rgba(0, 0, 0, .5);
    padding: 26px 28px 34px;
  }

  .cerfa-cor-depot-etape {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .cerfa-cor-zone-depot {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px;
    border: 2px dashed var(--bordure-3);
    border-radius: var(--rayon-carte);
    background: var(--fond-3);
    color: var(--texte-2);
    cursor: pointer;
    transition: border-color .15s, background .15s;
  }
  .cerfa-cor-zone-depot:hover,
  .cerfa-cor-zone-depot.survol {
    border-color: var(--accent);
    background: var(--accent-fond-2);
  }
  .cerfa-cor-zone-depot svg {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    color: var(--accent-fort);
  }
  .cerfa-cor-zone-depot-texte {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
  }
  .cerfa-cor-zone-depot-texte span {
    font-size: 12px;
    color: var(--texte-3);
  }

  .cerfa-cor-etat {
    font-size: 13px;
    color: var(--texte-3);
  }

  .cerfa-cor-entete-rapport {
    margin-bottom: 22px;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--bordure-2);
  }
  .cerfa-cor-pourcentage {
    font-family: var(--police-titres);
    font-size: 40px;
    font-weight: 700;
    color: var(--texte);
  }
  .cerfa-cor-compteurs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
  .cerfa-cor-meta {
    margin-top: 10px;
    font-size: 13px;
    color: var(--texte-2);
  }
  .cerfa-cor-mention-formation {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    padding: 9px 12px;
    background: var(--avert-fond);
    color: var(--avert);
    border-radius: var(--rayon-bouton);
    font-size: 12.5px;
    font-weight: 600;
  }
  .cerfa-cor-mention-formation svg {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }

  .cerfa-cor-cadres {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .cerfa-cor-cadre-entete {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .cerfa-cor-cadre-titre {
    font-family: var(--police-titres);
    font-size: 14px;
    font-weight: 600;
    color: var(--texte);
  }
  .cerfa-cor-cadre-score {
    font-family: var(--police-mono);
    font-size: 12.5px;
    color: var(--texte-3);
  }

  @media print {
    .cerfa-cor { display: none; }
  }
`;

/** Injecte la feuille de styles de la modale (une seule fois). */
function injecterStyles() {
  if (document.getElementById(ID_STYLES)) return;
  const style = document.createElement('style');
  style.id = ID_STYLES;
  style.textContent = STYLES;
  document.head.appendChild(style);
}

/* ============================================================
   Petits fragments partagés (modale ET rapport HTML téléchargé)
   ============================================================ */

/** Valeur affichée, ou tiret cadratin si vide (jamais une chaîne vide nue). */
function valeurOuTiret(v) {
  const texte = String(v ?? '').trim();
  return texte === '' ? '—' : String(v);
}

/** Chip colorée d'un statut de correction (VIDE n'atteint jamais cette fonction). */
function chipStatutCorrection(statut) {
  const classe = CLASSES_STATUT[statut] || 'chip-gris';
  return '<span class="chip ' + classe + '">'
    + esc(STATUTS_CORRECTION[statut] || statut) + '</span>';
}

/**
 * Bloc d'un cadre du rapport (titre + « x/y » + tableau des lignes
 * ACTIVES). Chaîne vide si le cadre n'a aucune ligne active — il ne
 * doit pas apparaître (bruit).
 * @param {object} cadre - un élément de rapport.parCadre
 * @returns {string} HTML, ou chaîne vide
 */
function construireBlocCadre(cadre) {
  const actives = cadre.lignes.filter((l) => l.statut !== 'VIDE');
  if (!actives.length) return '';

  const lignesHtml = actives.map((l) => (
    '<tr>'
    + '<td>' + esc(l.libelle) + '</td>'
    + '<td>' + esc(valeurOuTiret(l.attendu)) + '</td>'
    + '<td>' + esc(valeurOuTiret(l.saisi)) + '</td>'
    + '<td>' + chipStatutCorrection(l.statut) + '</td>'
    + '</tr>'
  ));

  return '<div class="cerfa-cor-cadre">'
    + '<div class="cerfa-cor-cadre-entete">'
    + '<span class="cerfa-cor-cadre-titre">' + esc(cadre.titre) + '</span>'
    + '<span class="cerfa-cor-cadre-score">' + esc(cadre.nbOk) + '/' + esc(cadre.nbActifs) + '</span>'
    + '</div>'
    + tableau({
        colonnes: [
          { cle: 'libelle', libelle: 'Champ' },
          { cle: 'attendu', libelle: 'Attendu' },
          { cle: 'saisi', libelle: 'Saisi' },
          { cle: 'statut', libelle: 'Statut' }
        ],
        lignesHtml
      })
    + '</div>';
}

/** En-tête du rapport : pourcentage, compteurs, fiche de référence, mode. */
function construireEnteteRapport(resultat) {
  const { rapport, numero, mode, formulaire } = resultat;
  const compteur = (teinte, n, libelle) =>
    '<span class="chip chip-' + teinte + '">' + esc(n) + ' ' + esc(libelle) + '</span>';
  const mentionFormation = mode === 'FORMATION'
    ? '<div class="cerfa-cor-mention-formation">' + ICONES.alerte
      + '<span>Mode FORMATION : document non officiel.</span></div>'
    : '';
  // Champs présents dans le PDF mais inconnus du CERFA : tolérés (le
  // formulaire officiel est complet), mais SIGNALÉS — jamais en silence.
  const mentionInconnus = formulaire && formulaire.inconnus.length > 0
    ? '<div class="cerfa-cor-mention-formation">' + ICONES.alerte
      + '<span>' + esc(formulaire.inconnus.length)
      + ' champ(s) non reconnu(s) dans le PDF, ignoré(s) '
      + 'par la correction.</span></div>'
    : '';

  return '<div class="cerfa-cor-entete-rapport">'
    + '<div class="cerfa-cor-pourcentage">' + esc(rapport.pourcentage) + ' %</div>'
    + '<div class="cerfa-cor-compteurs">'
    + compteur('vert', rapport.nbOk, rapport.nbOk > 1 ? 'Justes' : 'Juste')
    + compteur('rouge', rapport.nbErreurs, 'Faux')
    + compteur('rouge', rapport.nbManquants, rapport.nbManquants > 1 ? 'Oubliés' : 'Oublié')
    + compteur('ambre', rapport.nbATort, 'Rempli' + (rapport.nbATort > 1 ? 's' : '') + ' à tort')
    + '</div>'
    + '<div class="cerfa-cor-meta">Fiche de référence : '
    + '<strong class="cellule-mono">' + esc(numero) + '</strong></div>'
    + mentionFormation
    + mentionInconnus
    + '</div>';
}

/** HTML de l'étape 1 (dépôt du PDF élève). */
function construireDepotHtml() {
  return '<div class="cerfa-cor-depot-etape">'
    + '<div class="bandeau-avertissement">' + ICONES.alerte
    + '<span>L’élève doit remplir le PDF officiel vierge <strong>à l’ordinateur</strong> '
    + '— un scan n’a plus de champs.</span></div>'
    + '<div class="champ">'
    + '<label for="cerfa-cor-nom-eleve">Nom de l’élève (optionnel)</label>'
    + '<input type="text" id="cerfa-cor-nom-eleve" placeholder="Ex. : un élève" autocomplete="off">'
    + '</div>'
    + '<label class="cerfa-cor-zone-depot">'
    + ICONES.televerser
    + '<span class="cerfa-cor-zone-depot-texte">'
    + '<strong>Choisir le PDF rempli par l’élève</strong>'
    + '<span>Cliquer ou déposer le fichier ici</span>'
    + '</span>'
    + '<input type="file" accept="application/pdf,.pdf" hidden>'
    + '</label>'
    + '<div class="cerfa-cor-etat" hidden></div>'
    + '<div class="bandeau-erreur" hidden><span></span></div>'
    + '</div>';
}

/* ============================================================
   Rapport HTML autonome imprimable (téléchargé À CÔTÉ, patron
   documents/verificateur.js::construireCertificatHtml)
   ============================================================ */

/**
 * Nom de fichier proposé : `correction-cerfa-<numero>[-<nom-eleve>].html`
 * (nomSur nettoie les séparateurs de chemin parasites).
 * @param {{numero: string}} resultat
 * @param {string} nomEleve - saisie brute (peut être vide)
 * @returns {string}
 */
function nomFichierRapport(resultat, nomEleve) {
  const base = 'correction-cerfa-' + nomSur(resultat.numero || 'sans-numero');
  const eleve = nomEleve && nomEleve.trim() ? '-' + nomSur(nomEleve.trim()) : '';
  return base + eleve + '.html';
}

/**
 * Document HTML AUTONOME imprimable du rapport de correction :
 * styles inline, zéro ressource externe, échappement complet (le PDF
 * élève est une donnée hostile).
 * @param {{rapport: object, numero: string, mode: string}} resultat
 * @param {string} nomEleve - saisie brute (peut être vide)
 * @returns {string} document HTML complet
 */
function construireRapportImprimableHtml(resultat, nomEleve) {
  const { rapport, numero, mode } = resultat;
  const p = (n) => String(n).padStart(2, '0');
  const d = new Date();
  const dateTexte = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  const nomAffiche = nomEleve && nomEleve.trim() ? nomEleve.trim() : 'Non renseigné';
  const mentionFormation = mode === 'FORMATION'
    ? '<p class="mention-formation"><strong>Mode FORMATION</strong> — document non officiel, '
      + 'à ne pas utiliser pour une intervention réelle.</p>'
    : '';

  const cadresHtml = rapport.parCadre.map((cadre) => {
    const actives = cadre.lignes.filter((l) => l.statut !== 'VIDE');
    if (!actives.length) return '';
    const lignes = actives.map((l) => (
      '<tr>'
      + '<td>' + esc(l.libelle) + '</td>'
      + '<td>' + esc(valeurOuTiret(l.attendu)) + '</td>'
      + '<td>' + esc(valeurOuTiret(l.saisi)) + '</td>'
      + '<td class="etat-' + esc(l.statut.toLowerCase()) + '">'
      + esc(STATUTS_CORRECTION[l.statut] || l.statut) + '</td>'
      + '</tr>'
    )).join('');
    return '<h2>' + esc(cadre.titre)
      + ' <span class="score">(' + esc(cadre.nbOk) + '/' + esc(cadre.nbActifs) + ')</span></h2>'
      + '<table><thead><tr><th>Champ</th><th>Attendu</th><th>Saisi</th><th>Statut</th></tr></thead>'
      + '<tbody>' + lignes + '</tbody></table>';
  }).filter(Boolean).join('');

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Rapport de correction — CERFA 15497*04</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #16283c; margin: 0; }
  main { max-width: 860px; margin: 0 auto; padding: 32px 20px 60px; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #0e2a47; }
  .sous-titre { color: #51637a; font-size: 13px; margin: 0 0 20px; }
  .identite { font-size: 13px; line-height: 1.6; margin: 0 0 18px; }
  .identite strong { color: #0e2a47; }
  .mention-formation { color: #b45309; font-weight: 600; font-size: 13px; }
  .score-global { display: flex; align-items: baseline; gap: 16px;
    margin-bottom: 20px; flex-wrap: wrap; }
  .pourcentage { font-size: 38px; font-weight: 700; color: #0e2a47; }
  .compteurs span { display: inline-block; margin: 2px 8px 2px 0;
    padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .c-vert { background: #dcfce7; color: #16a34a; }
  .c-rouge { background: #fee2e2; color: #dc2626; }
  .c-ambre { background: #fef3c7; color: #b45309; }
  h2 { font-size: 14px; margin: 22px 0 8px; color: #0e2a47; }
  .score { color: #51637a; font-weight: 400; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 6px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e4eaf0; }
  th { color: #51637a; font-size: 10.5px; text-transform: uppercase; letter-spacing: .03em; }
  .etat-ok { color: #16a34a; font-weight: 600; }
  .etat-erreur, .etat-manquant { color: #dc2626; font-weight: 700; }
  .etat-a_tort { color: #b45309; font-weight: 600; }
  footer { color: #7b8b9d; font-size: 11px; margin-top: 24px; }
  @media print { footer { display: none; } }
</style>
</head>
<body>
<main>
  <h1>Rapport de correction — CERFA 15497*04</h1>
  <p class="sous-titre">inerWeb Fluide — correction automatique du CERFA élève</p>
  <p class="identite">
    Élève : <strong>${esc(nomAffiche)}</strong><br>
    Fiche de référence : <strong>${esc(numero)}</strong><br>
    Corrigé le : <strong>${esc(dateTexte)}</strong>
  </p>
  ${mentionFormation}
  <div class="score-global">
    <div class="pourcentage">${esc(rapport.pourcentage)} %</div>
    <div class="compteurs">
      <span class="c-vert">${esc(rapport.nbOk)} juste(s)</span>
      <span class="c-rouge">${esc(rapport.nbErreurs)} faux</span>
      <span class="c-rouge">${esc(rapport.nbManquants)} oublié(s)</span>
      <span class="c-ambre">${esc(rapport.nbATort)} rempli(s) à tort</span>
    </div>
  </div>
  ${cadresHtml}
  <footer>Rapport généré par inerWeb Fluide — correction automatique,
  vérification humaine recommandée.</footer>
</main>
</body>
</html>
`;
}

/* ============================================================
   Modale plein écran
   ============================================================ */

/**
 * Ouvre la modale de correction du CERFA élève pour un mouvement ou
 * un contrôle : dépôt d'un PDF rempli par l'élève, comparaison aux
 * valeurs attendues (correction.js), rapport par cadre, téléchargement
 * du rapport en HTML autonome.
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 * @param {{ source: 'mouvement'|'controle', id: string }} cible
 * @returns {Promise<{ fermer: () => void }>}
 */
export async function ouvrirCorrectionCerfa(ctx, { source, id }) {
  injecterStyles();
  const zone = document.getElementById('zone-modales') || document.body;

  const fond = document.createElement('div');
  fond.className = 'cerfa-cor';
  fond.setAttribute('role', 'dialog');
  fond.setAttribute('aria-modal', 'true');
  fond.setAttribute('aria-label', 'Correction du CERFA élève');
  fond.innerHTML = '<div class="cerfa-cor-bandeau">'
    + '<div class="cerfa-cor-titre">Correction du CERFA élève'
    + '<span class="cerfa-cor-numero"></span></div>'
    + '<button type="button" class="btn btn-primaire btn-petit" '
    + 'data-action="telecharger" disabled>'
    + ICONES.telecharger + '<span>Télécharger le rapport (HTML)</span></button>'
    + '<button type="button" class="btn btn-petit cerfa-cor-btn-clair" '
    + 'data-action="reinitialiser" hidden>'
    + '<span>Corriger un autre PDF</span></button>'
    + '<button type="button" class="btn btn-petit cerfa-cor-btn-clair" '
    + 'data-action="fermer">'
    + ICONES.croix + '<span>Fermer</span></button>'
    + '</div>'
    + '<div class="cerfa-cor-corps">'
    + '<div class="cerfa-cor-panneau">'
    + '<div data-zone="depot">' + construireDepotHtml() + '</div>'
    + '<div data-zone="rapport" hidden></div>'
    + '</div>'
    + '</div>';

  const boutonTelecharger = fond.querySelector('[data-action="telecharger"]');
  const boutonReinitialiser = fond.querySelector('[data-action="reinitialiser"]');
  const boutonFermer = fond.querySelector('[data-action="fermer"]');
  const numeroBandeau = fond.querySelector('.cerfa-cor-numero');
  const zoneDepot = fond.querySelector('[data-zone="depot"]');
  const zoneRapport = fond.querySelector('[data-zone="rapport"]');

  let fermee = false;
  let dernierResultat = null;

  function fermer() {
    if (fermee) return;
    fermee = true;
    document.removeEventListener('keydown', surTouche);
    fond.classList.remove('visible');
    setTimeout(function () { fond.remove(); }, 220);
  }

  function surTouche(evenement) {
    if (evenement.key === 'Escape') fermer();
  }

  boutonFermer.addEventListener('click', fermer);
  document.addEventListener('keydown', surTouche);
  fond.addEventListener('click', function (evenement) {
    if (evenement.target === fond) fermer();
  });

  /** Champ « nom de l'élève » de l'étape 1 (persiste tant que non réinitialisé). */
  function champNomEleve() {
    return zoneDepot.querySelector('#cerfa-cor-nom-eleve');
  }

  /** Message d'état sobre (« Vérification… ») sous la zone de dépôt. */
  function afficherEtat(texte) {
    const etat = zoneDepot.querySelector('.cerfa-cor-etat');
    etat.textContent = texte;
    etat.hidden = !texte;
  }

  /** Message d'erreur (bandeau rouge) : PDF illisible ou pas le CERFA officiel. */
  function afficherErreurDepot(message) {
    const bandeau = zoneDepot.querySelector('.bandeau-erreur');
    bandeau.querySelector('span').textContent = message;
    bandeau.hidden = !message;
  }

  /** Affiche le rapport de correction et bascule l'affichage. */
  function afficherRapport(resultat) {
    zoneRapport.innerHTML = construireEnteteRapport(resultat)
      + '<div class="cerfa-cor-cadres">'
      + resultat.rapport.parCadre.map(construireBlocCadre).join('')
      + '</div>';
    zoneDepot.hidden = true;
    zoneRapport.hidden = false;
    numeroBandeau.textContent = resultat.numero ? ' · ' + resultat.numero : '';
    boutonTelecharger.disabled = false;
    boutonReinitialiser.hidden = false;
  }

  /** Corrige le PDF choisi par le professeur contre les valeurs attendues. */
  async function traiterFichier(fichier) {
    afficherErreurDepot('');
    afficherEtat('Vérification du PDF…');
    const entree = zoneDepot.querySelector('input[type="file"]');
    if (entree) entree.disabled = true;
    try {
      const octets = new Uint8Array(await fichier.arrayBuffer());
      const resultat = await corrigerCerfaEleve(ctx.store, { source, id }, octets);
      dernierResultat = resultat;
      afficherEtat('');
      afficherRapport(resultat);
    } catch (erreur) {
      afficherEtat('');
      afficherErreurDepot(erreur && erreur.message
        ? erreur.message
        : 'Impossible de corriger ce PDF.');
    } finally {
      if (entree) entree.disabled = false;
    }
  }

  /** Câble le choix de fichier + le glisser-déposer de l'étape 1. */
  function cablerZoneDepot() {
    const entree = zoneDepot.querySelector('input[type="file"]');
    const label = zoneDepot.querySelector('.cerfa-cor-zone-depot');
    entree.addEventListener('change', function () {
      if (entree.files && entree.files[0]) traiterFichier(entree.files[0]);
      entree.value = '';
    });
    label.addEventListener('dragover', function (evenement) {
      evenement.preventDefault();
      label.classList.add('survol');
    });
    label.addEventListener('dragleave', function () {
      label.classList.remove('survol');
    });
    label.addEventListener('drop', function (evenement) {
      evenement.preventDefault();
      label.classList.remove('survol');
      const fichier = evenement.dataTransfer && evenement.dataTransfer.files
        && evenement.dataTransfer.files[0];
      if (fichier) traiterFichier(fichier);
    });
  }

  /** « Corriger un autre PDF » : repart d'une étape 1 vierge. */
  function reinitialiser() {
    dernierResultat = null;
    zoneRapport.hidden = true;
    zoneRapport.innerHTML = '';
    zoneDepot.innerHTML = construireDepotHtml();
    zoneDepot.hidden = false;
    numeroBandeau.textContent = '';
    boutonTelecharger.disabled = true;
    boutonReinitialiser.hidden = true;
    cablerZoneDepot();
  }

  boutonReinitialiser.addEventListener('click', reinitialiser);
  boutonTelecharger.addEventListener('click', function () {
    if (!dernierResultat) return;
    const champ = champNomEleve();
    const nomEleve = champ ? champ.value : '';
    const html = construireRapportImprimableHtml(dernierResultat, nomEleve);
    const nomFichier = nomFichierRapport(dernierResultat, nomEleve);
    const url = URL.createObjectURL(
      new Blob([html], { type: 'text/html;charset=utf-8' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    URL.revokeObjectURL(url);
    toast('Rapport de correction téléchargé.', 'succes');
  });

  cablerZoneDepot();

  zone.appendChild(fond);
  requestAnimationFrame(function () { fond.classList.add('visible'); });
  boutonFermer.focus();

  return { fermer };
}
