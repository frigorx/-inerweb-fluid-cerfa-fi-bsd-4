// ============================================================
// inerWeb Fluide v8 — visualiseur CERFA (Phase D)
// Modale PLEIN ÉCRAN fidèle à la maquette (composant n° 11 de
// design/DESIGN-TOKENS.md) : fond sombre, bandeau marine
// « CERFA 15497*04 · <numéro> », boutons « Imprimer / PDF »
// (turquoise), « Télécharger » et « Fermer » (+ Échap).
// Le corps affiche LE PDF OFFICIEL REMPLI retourné par
// genererCerfaPdf, rendu par PDF.js sur canvas (feuille A4
// blanche centrée, netteté ×2, largeur adaptée à l'écran).
// ============================================================

import { genererCerfaPdf } from './generateur.js';
import { ICONES } from '../core/icones.js';

/** Facteur de sur-échantillonnage du rendu canvas (netteté). */
const ECHELLE_NETTETE = 2;

/** Largeur maximale de la feuille A4 à l'écran (px CSS). */
const LARGEUR_FEUILLE_MAX = 900;

/** Cache de la bibliothèque PDF.js (une seule initialisation). */
let promessePdfJs = null;

/**
 * Charge PDF.js paresseusement : injection unique d'une balise
 * <script> (UMD → window.pdfjsLib), puis réglage du workerSrc.
 * @returns {Promise<object>} l'espace de noms pdfjsLib
 */
async function chargerPdfJs() {
  if (!window.pdfjsLib) {
    if (!promessePdfJs) {
      promessePdfJs = new Promise(function (resoudre, rejeter) {
        const balise = document.createElement('script');
        balise.src = new URL('../lib/pdf.min.js', import.meta.url).href;
        balise.onload = resoudre;
        balise.onerror = function () {
          rejeter(new Error('Impossible de charger PDF.js.'));
        };
        document.head.appendChild(balise);
      });
    }
    await promessePdfJs;
    if (!window.pdfjsLib) {
      throw new Error('PDF.js chargé mais introuvable (window.pdfjsLib).');
    }
  }
  // Worker dédié au rendu (chemin v8 autonome), réglé une seule fois
  if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      new URL('../lib/pdf.worker.min.js', import.meta.url).href;
  }
  return window.pdfjsLib;
}

/* ============================================================
   Styles propres au visualiseur (injectés une seule fois),
   préfixe « cerfa-visu- » pour éviter toute collision.
   ============================================================ */

const ID_STYLES = 'styles-cerfa-visu';

const STYLES = `
  .cerfa-visu {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: flex;
    flex-direction: column;
    background: rgba(10, 24, 40, .94);
    opacity: 0;
    transition: opacity .2s ease;
  }
  .cerfa-visu.visible { opacity: 1; }

  .cerfa-visu-bandeau {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    background: var(--marine-900);
    color: #ffffff;
    box-shadow: 0 1px 0 rgba(255, 255, 255, .08);
  }
  .cerfa-visu-titre {
    flex: 1 1 auto;
    min-width: 0;
    font-family: var(--police-titres);
    font-size: 16px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cerfa-visu-numero {
    font-family: var(--police-mono);
    font-weight: 500;
    color: var(--accent-clair);
  }
  .cerfa-visu-bandeau .btn svg { width: 16px; height: 16px; }
  .cerfa-visu-btn-clair {
    background: transparent;
    color: #e6edf5;
    border: 1px solid rgba(255, 255, 255, .35);
  }
  .cerfa-visu-btn-clair:hover:not(:disabled) {
    background: rgba(255, 255, 255, .12);
    color: #ffffff;
  }

  .cerfa-visu-erreur {
    flex: none;
    display: none;
    align-items: center;
    gap: 10px;
    padding: 11px 20px;
    background: var(--danger-fond);
    border-bottom: 1px solid var(--danger-bordure);
    color: var(--danger);
    font-size: 13px;
    font-weight: 500;
  }
  .cerfa-visu-erreur.visible { display: flex; }
  .cerfa-visu-erreur svg { flex: none; width: 18px; height: 18px; }

  .cerfa-visu-corps {
    flex: 1 1 auto;
    overflow: auto;
    padding: 28px 16px 44px;
  }
  .cerfa-visu-pages {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 22px;
  }
  .cerfa-visu-page {
    display: block;
    max-width: 100%;
    height: auto;
    background: #ffffff;
    border-radius: 2px;
    box-shadow: 0 10px 34px rgba(0, 0, 0, .5);
  }

  .cerfa-visu-attente {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding-top: 84px;
    color: #cbd5e1;
    font-size: 14px;
  }
  .cerfa-visu-spinner {
    width: 34px;
    height: 34px;
    border: 3px solid rgba(255, 255, 255, .22);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: cerfaVisuRotation .9s linear infinite;
  }
  @keyframes cerfaVisuRotation { to { transform: rotate(360deg); } }

  @media print {
    .cerfa-visu { display: none; }
  }
`;

/** Injecte la feuille de styles du visualiseur (une seule fois). */
function injecterStyles() {
  if (document.getElementById(ID_STYLES)) return;
  const style = document.createElement('style');
  style.id = ID_STYLES;
  style.textContent = STYLES;
  document.head.appendChild(style);
}

/* ============================================================
   Rendu PDF.js : chaque page sur un canvas net (feuille A4)
   ============================================================ */

/**
 * Rend toutes les pages du PDF dans le conteneur fourni.
 * Netteté ×2 : le canvas est sur-échantillonné puis affiché
 * à la largeur CSS cible (adaptée à l'écran).
 * @param {object} pdfjs — espace de noms pdfjsLib
 * @param {Uint8Array} octets — PDF rempli (copie transférable)
 * @param {HTMLElement} conteneurPages — zone .cerfa-visu-pages
 */
async function rendrePages(pdfjs, octets, conteneurPages) {
  const document_ = await pdfjs.getDocument({ data: octets }).promise;
  const largeurDisponible = Math.max(
    280, conteneurPages.clientWidth || window.innerWidth - 32);
  const largeurCible = Math.min(largeurDisponible, LARGEUR_FEUILLE_MAX);

  for (let numero = 1; numero <= document_.numPages; numero += 1) {
    const page = await document_.getPage(numero);
    const reference = page.getViewport({ scale: 1 });
    const echelle = (largeurCible / reference.width) * ECHELLE_NETTETE;
    const fenetre = page.getViewport({ scale: echelle });

    const canvas = document.createElement('canvas');
    canvas.className = 'cerfa-visu-page';
    canvas.width = Math.floor(fenetre.width);
    canvas.height = Math.floor(fenetre.height);
    canvas.style.width = largeurCible + 'px';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Page ' + numero + ' du CERFA rempli');
    conteneurPages.appendChild(canvas);

    // intent 'print' : rendu d'un seul bloc (la cadence requestAnimationFrame
    // du mode affichage est gelée dans les onglets en arrière-plan) et
    // apparences finales des champs — on affiche une feuille remplie,
    // pas un formulaire interactif.
    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport: fenetre,
      intent: 'print'
    }).promise;
  }
}

/* ============================================================
   Visualiseur plein écran
   ============================================================ */

/**
 * Ouvre le visualiseur CERFA plein écran pour un mouvement ou un
 * contrôle : génère le PDF officiel rempli, l'affiche (PDF.js),
 * et propose Imprimer / Télécharger / Fermer (+ Échap).
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 * @param {{ source: 'mouvement'|'controle', id: string }} cible
 * @returns {Promise<{ fermer: () => void }>}
 */
export async function ouvrirCerfa(ctx, { source, id }) {
  injecterStyles();
  const zone = document.getElementById('zone-modales') || document.body;

  const fond = document.createElement('div');
  fond.className = 'cerfa-visu';
  fond.setAttribute('role', 'dialog');
  fond.setAttribute('aria-modal', 'true');
  fond.setAttribute('aria-label', 'Visualiseur CERFA 15497*04');
  fond.innerHTML = '<div class="cerfa-visu-bandeau">'
    + '<div class="cerfa-visu-titre">CERFA 15497*04'
    + '<span class="cerfa-visu-numero"></span></div>'
    + '<button type="button" class="btn btn-primaire btn-petit" '
    + 'data-action="imprimer" disabled>'
    + ICONES.imprimer + '<span>Imprimer / PDF</span></button>'
    + '<button type="button" class="btn btn-petit cerfa-visu-btn-clair" '
    + 'data-action="telecharger" disabled>'
    + ICONES.telecharger + '<span>Télécharger</span></button>'
    + '<button type="button" class="btn btn-petit cerfa-visu-btn-clair" '
    + 'data-action="fermer">'
    + ICONES.croix + '<span>Fermer</span></button>'
    + '</div>'
    + '<div class="cerfa-visu-erreur" role="alert">' + ICONES.alerte
    + '<span class="cerfa-visu-erreur-texte"></span></div>'
    + '<div class="cerfa-visu-corps">'
    + '<div class="cerfa-visu-attente">'
    + '<span class="cerfa-visu-spinner" aria-hidden="true"></span>'
    + '<span>Génération du CERFA officiel…</span>'
    + '</div>'
    + '<div class="cerfa-visu-pages"></div>'
    + '</div>';

  const boutonImprimer = fond.querySelector('[data-action="imprimer"]');
  const boutonTelecharger = fond.querySelector('[data-action="telecharger"]');
  const boutonFermer = fond.querySelector('[data-action="fermer"]');
  const zoneAttente = fond.querySelector('.cerfa-visu-attente');
  const zonePages = fond.querySelector('.cerfa-visu-pages');

  // État local du visualiseur
  let fermee = false;
  let urlBlob = null;          // URL du blob PDF (téléchargement/impression)
  let nomFichierPdf = null;    // nom proposé au téléchargement
  let iframeImpression = null; // iframe cachée d'impression

  function fermer() {
    if (fermee) return;
    fermee = true;
    document.removeEventListener('keydown', surTouche);
    if (iframeImpression) { iframeImpression.remove(); iframeImpression = null; }
    if (urlBlob) { URL.revokeObjectURL(urlBlob); urlBlob = null; }
    fond.classList.remove('visible');
    setTimeout(function () { fond.remove(); }, 220);
  }

  function surTouche(evenement) {
    if (evenement.key === 'Escape') fermer();
  }

  /** Affiche un message d'erreur en bandeau (sous le bandeau marine). */
  function afficherErreur(message) {
    zoneAttente.style.display = 'none';
    const bandeau = fond.querySelector('.cerfa-visu-erreur');
    bandeau.querySelector('.cerfa-visu-erreur-texte').textContent = message;
    bandeau.classList.add('visible');
  }

  // Imprimer : iframe cachée alimentée par le blob PDF, puis print()
  function imprimer() {
    if (!urlBlob) return;
    if (iframeImpression) iframeImpression.remove();
    iframeImpression = document.createElement('iframe');
    iframeImpression.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    iframeImpression.src = urlBlob;
    iframeImpression.addEventListener('load', function () {
      try {
        iframeImpression.contentWindow.focus();
        iframeImpression.contentWindow.print();
      } catch {
        // Visionneuse PDF du navigateur inaccessible : nouvel onglet
        window.open(urlBlob, '_blank');
      }
    });
    document.body.appendChild(iframeImpression);
  }

  // Télécharger : lien <a download> vers le blob PDF
  function telecharger() {
    if (!urlBlob) return;
    const lien = document.createElement('a');
    lien.href = urlBlob;
    lien.download = nomFichierPdf || 'cerfa-15497-04.pdf';
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
  }

  boutonFermer.addEventListener('click', fermer);
  boutonImprimer.addEventListener('click', imprimer);
  boutonTelecharger.addEventListener('click', telecharger);
  document.addEventListener('keydown', surTouche);
  fond.addEventListener('click', function (evenement) {
    if (evenement.target === fond) fermer();
  });

  zone.appendChild(fond);
  requestAnimationFrame(function () { fond.classList.add('visible'); });
  boutonFermer.focus();

  // ---- Génération puis rendu du PDF officiel rempli ----
  try {
    const { octets, nomFichier, numero } =
      await genererCerfaPdf(ctx.store, { source, id });
    if (fermee) return { fermer };

    fond.querySelector('.cerfa-visu-numero').textContent =
      numero ? ' · ' + numero : '';
    fond.setAttribute('aria-label',
      'Visualiseur CERFA 15497*04' + (numero ? ' — ' + numero : ''));
    nomFichierPdf = nomFichier;
    // Le blob copie les octets ; PDF.js reçoit SA PROPRE copie car
    // getDocument transfère le tampon vers son worker (détachement).
    urlBlob = URL.createObjectURL(
      new Blob([octets], { type: 'application/pdf' }));

    const pdfjs = await chargerPdfJs();
    await rendrePages(pdfjs, octets.slice(), zonePages);
    if (fermee) return { fermer };

    zoneAttente.style.display = 'none';
    boutonImprimer.disabled = false;
    boutonTelecharger.disabled = false;
  } catch (erreur) {
    afficherErreur(erreur && erreur.message
      ? erreur.message
      : 'Impossible de générer le CERFA.');
  }

  return { fermer };
}
