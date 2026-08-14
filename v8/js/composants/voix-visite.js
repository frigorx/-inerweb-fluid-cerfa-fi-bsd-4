// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// LA VOIX DE LA DÉMONSTRATION (visite guidée v2, 14/08/2026).
// ------------------------------------------------------------
// Le même principe que les tutos animés de Pilote Fluides, relevé sur
// pièce le 13/08 : les narrations sont des fichiers MP3 locaux fabriqués
// À LA CONSTRUCTION (Piper, voix française `fr_FR-siwis-medium`), un
// index généré relie l'empreinte d'un texte à son fichier, et tout texte
// inconnu de l'index RETOMBE sur la voix du navigateur — la visite ne
// dépend jamais du lot audio, un texte modifié parle quand même.
//
// Règles tenues ici :
// - JAMAIS un son sans geste humain : rien ne se joue à la construction,
//   une lecture ne part que d'un appel fait après un clic ;
// - le corpus EST l'écran : la voix ne dit que des textes affichés (la
//   voix ne porte jamais seule une information) ;
// - l'empreinte de texte est LA MÊME que celle de Pilote (FNV-1a sur le
//   texte normalisé + longueur) : l'outillage audio reste compatible
//   d'un projet à l'autre.
// ============================================================

import { INDEX_VOIX_VISITE } from '../../res/voix-visite/index.js';

/** Clé localStorage de la préférence « voix coupée » (persistante). */
export const CLE_MEMOIRE_VOIX = 'inerweb-fluide-v8-visite-voix';

/* ============================================================
   Les textes qui n'existent qu'à la voix ET à l'écran de la modale
   (projet du 14/08 — à corriger par Franck, puis lot audio régénéré)
   ============================================================ */

export const TEXTE_PRESENTATION =
  'Bonjour, et bienvenue dans l’interface de démonstration d’inerWeb '
  + 'Fluide. Ce logiciel transforme les obligations réglementaires des '
  + 'fluides frigorigènes en gestes guidés, et évite les oublis avant '
  + 'l’audit : le parc de machines, le stock de bouteilles, chaque '
  + 'mouvement de fluide, les contrôles d’étanchéité — et les documents '
  + 'obligatoires, comme le CERFA, remplis automatiquement. Ici, tout est '
  + 'fictif : essayez librement, rien ne sort de votre navigateur. '
  + 'Choisissez votre parcours : l’essentiel, en cinq minutes ; la visite '
  + 'complète, en un quart d’heure ; ou la visite du frigoriste, la plus '
  + 'poussée. À chaque étape, je vous explique le geste, et l’écran vous '
  + 'montre où cliquer. C’est parti.';

/** Vrai si le lot audio fabriqué (Piper) est embarqué — sinon la démo
 *  parle avec la voix du navigateur, et l'écran le dit. */
export function lotAudioPresent() {
  return Boolean(INDEX_VOIX_VISITE && INDEX_VOIX_VISITE.entrees
    && Object.keys(INDEX_VOIX_VISITE.entrees).length > 0);
}

export const TEXTE_FIN =
  'Visite terminée — bonne découverte ! Tout ce que vous venez de faire, un '
  + 'professionnel le fait à l’identique dans le vrai logiciel : mêmes '
  + 'écrans, mêmes règles, mêmes documents. Le guide complet reste '
  + 'disponible depuis la page d’accueil.';

/**
 * Les textes qu'une étape fait dire — ceux que le panneau affiche
 * (titre, consigne, attendu), JAMAIS PLUS que l'écran. Depuis le 14/08
 * (demande de Franck : une formatrice ne lit pas les petites lignes),
 * la voix dit MOINS : l'attendu se dit SANS son chapeau rituel « Ce que
 * vous devez voir : » — répété à chaque étape, il n'apprend rien à
 * l'oreille ; l'ÉCRAN, lui, le garde. Consommé par le narrateur ET par
 * l'outil de fabrication du lot audio : une seule source de vérité.
 * @param {{titre?: string, consigne?: string, attendu?: string}|null} etape
 * @returns {string[]}
 */
export function textesNarrationEtape(etape) {
  if (!etape) return [];
  const textes = [];
  if (etape.titre) {
    textes.push(/[.!?…]$/.test(etape.titre) ? etape.titre : etape.titre + '.');
  }
  if (etape.consigne) textes.push(etape.consigne);
  if (etape.attendu) textes.push(etape.attendu);
  return textes;
}

/* ============================================================
   Empreinte de texte — recette de Pilote, à L'IDENTIQUE
   ============================================================ */

/** Normalisation avant empreinte (espaces insécables, guillemets, blancs). */
export function normaliserTexte(valeur) {
  return String(valeur == null ? '' : valeur)
    .replace(/[  ]/g, ' ')
    .replace(/[‘’]/g, '\'')
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Le texte tel qu'il se DIT : la ponctuation décorative ne se lit pas
 * (constat de Franck, 14/08 — le repli navigateur épelait des signes).
 * Guillemets, parenthèses, astérisque, point médian s'effacent ; les
 * tirets deviennent une virgule (la pause) ; les points de suspension
 * un point. L'APOSTROPHE reste : elle porte le mot (« l'essentiel »).
 * L'EMPREINTE, elle, se calcule TOUJOURS sur le texte de l'écran :
 * les clés du lot audio ne bougent pas quand la diction s'affine.
 */
export function texteADire(valeur) {
  return normaliserTexte(valeur)
    .replace(/[«»"()*·]/g, ' ')
    .replace(/[—–;]/g, ', ')
    .replace(/…/g, '.')
    // Filet final — LISTE BLANCHE de ce qui a le droit de se dire :
    // lettres (accents et ligatures compris), chiffres, espace, et la
    // ponctuation de pause. TOUT autre signe s'efface (barre, dièse,
    // chevrons… même ceux qu'un texte futur inventera) : une voix de
    // formatrice ne prononce jamais un signe.
    .replace(/[^0-9a-zA-ZÀ-ÖØ-öø-ÿŒœ .,:!?'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?:;])/g, '$1')
    .replace(/,(\s*,)+/g, ',')
    .trim();
}

/** Empreinte FNV-1a (hex sur 8) + longueur — la clé de l'index audio. */
export function empreinteTexte(valeur) {
  const texte = normaliserTexte(valeur);
  let empreinte = 0x811c9dc5;
  for (let i = 0; i < texte.length; i += 1) {
    empreinte ^= texte.charCodeAt(i);
    empreinte = Math.imul(empreinte, 0x01000193);
  }
  return (empreinte >>> 0).toString(16).padStart(8, '0') + '-' + texte.length;
}

/* ============================================================
   Le narrateur
   ============================================================ */

function stockageParDefaut() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch (erreur) { /* stockage interdit : préférence non persistée */ }
  return null;
}

/**
 * Crée le narrateur de la visite. Tout l'environnement est injectable
 * (fenêtre, stockage, index, base des fichiers) : la suite de tests le
 * joue sans navigateur, sans réseau et sans haut-parleur.
 * @param {object} [options]
 * @returns {object} { direTextes, arreter, basculer, estCoupee, disponible, jouerClic }
 */
export function creerNarrateur(options = {}) {
  const fenetre = options.fenetre !== undefined
    ? options.fenetre
    : (typeof window !== 'undefined' ? window : null);
  const stockage = options.stockage !== undefined ? options.stockage : stockageParDefaut();
  const index = options.index !== undefined ? options.index : INDEX_VOIX_VISITE;
  const baseAudio = options.baseAudio !== undefined
    ? options.baseAudio
    : new URL('../../res/voix-visite/', import.meta.url).href;

  let generation = 0;      // toute lecture appartient à une génération ;
  let audioEnCours = null; // arreter() change de génération, la chaîne s'éteint
  let contexteClic = null;

  let coupee = false;
  try {
    coupee = Boolean(stockage && stockage.getItem
      && stockage.getItem(CLE_MEMOIRE_VOIX) === 'coupee');
  } catch (erreur) { coupee = false; }

  function synthese() {
    return (fenetre && fenetre.speechSynthesis) || null;
  }

  /** Vrai si au moins un chemin de lecture existe (fichier ou synthèse). */
  function disponible() {
    return Boolean((fenetre && typeof fenetre.Audio === 'function') || synthese());
  }

  function arreter() {
    generation += 1;
    if (audioEnCours) {
      try { audioEnCours.pause(); } catch (erreur) { /* déjà arrêté */ }
      audioEnCours = null;
    }
    const synth = synthese();
    if (synth && typeof synth.cancel === 'function') {
      try { synth.cancel(); } catch (erreur) { /* rien à arrêter */ }
    }
  }

  /** Lecture d'un fichier du lot ; toute impasse retombe sur la synthèse. */
  function direFichier(entree, texte, mienne) {
    return new Promise(function (fin) {
      const ClasseAudio = fenetre && fenetre.Audio;
      if (typeof ClasseAudio !== 'function') {
        direSynthese(texte, mienne).then(fin);
        return;
      }
      let clos = false;
      function clore(repli) {
        if (clos) return;
        clos = true;
        if (audioEnCours === lecteur) audioEnCours = null;
        if (repli && generation === mienne) direSynthese(texte, mienne).then(fin);
        else fin();
      }
      let lecteur;
      try {
        lecteur = new ClasseAudio(baseAudio + entree.fichier);
      } catch (erreur) {
        direSynthese(texte, mienne).then(fin);
        return;
      }
      audioEnCours = lecteur;
      if (typeof lecteur.addEventListener === 'function') {
        lecteur.addEventListener('ended', function () { clore(false); });
        lecteur.addEventListener('error', function () { clore(true); });
        lecteur.addEventListener('pause', function () {
          // pause = arreter() (ou fin naturelle déjà close) : jamais de repli.
          clore(false);
        });
      }
      let lancement = null;
      try { lancement = lecteur.play(); } catch (erreur) { clore(true); return; }
      if (lancement && typeof lancement.catch === 'function') {
        lancement.catch(function () { clore(true); });
      }
    });
  }

  /** Voix du navigateur (repli) — patron « Écouter cette étape » du guide. */
  function direSynthese(texte, mienne) {
    return new Promise(function (fin) {
      const synth = synthese();
      const ClasseUtterance = fenetre && fenetre.SpeechSynthesisUtterance;
      if (!synth || typeof synth.speak !== 'function'
        || typeof ClasseUtterance !== 'function' || generation !== mienne) {
        fin();
        return;
      }
      let phrase;
      // La synthèse reçoit le texte tel qu'il se DIT, jamais les signes.
      try { phrase = new ClasseUtterance(texteADire(texte)); } catch (erreur) { fin(); return; }
      phrase.lang = 'fr-FR';
      try {
        const voix = (typeof synth.getVoices === 'function' && synth.getVoices()) || [];
        const francaise = voix.find(function (v) { return /fr(-|_)?/i.test(v.lang); });
        if (francaise) phrase.voice = francaise;
      } catch (erreur) { /* voix par défaut */ }
      phrase.onend = function () { fin(); };
      phrase.onerror = function () { fin(); };
      try { synth.speak(phrase); } catch (erreur) { fin(); }
    });
  }

  /**
   * Dit une suite de textes, dans l'ordre. Coupe toute lecture en cours
   * (une seule voix à la fois). Ne joue RIEN si la voix est coupée.
   * Résout toujours — jamais un blocage de la visite pour une histoire de son.
   * @param {string[]|string} textes
   */
  async function direTextes(textes) {
    arreter();
    if (coupee) return;
    const mienne = generation;
    const liste = [].concat(textes || []).filter(Boolean);
    for (const texte of liste) {
      if (generation !== mienne || coupee) return;
      const entree = index && index.entrees && index.entrees[empreinteTexte(texte)];
      if (entree && entree.fichier) await direFichier(entree, texte, mienne);
      else await direSynthese(texte, mienne);
    }
  }

  /** Le « clic » du geste montré — bip bref fabriqué sur place (aucun fichier). */
  function jouerClic() {
    if (coupee) return;
    const ClasseContexte = fenetre && (fenetre.AudioContext || fenetre.webkitAudioContext);
    if (typeof ClasseContexte !== 'function') return;
    try {
      if (!contexteClic) contexteClic = new ClasseContexte();
      const quand = contexteClic.currentTime;
      const oscillateur = contexteClic.createOscillator();
      const volume = contexteClic.createGain();
      oscillateur.type = 'square';
      oscillateur.frequency.setValueAtTime(1800, quand);
      volume.gain.setValueAtTime(0.12, quand);
      volume.gain.exponentialRampToValueAtTime(0.0001, quand + 0.06);
      oscillateur.connect(volume);
      volume.connect(contexteClic.destination);
      oscillateur.start(quand);
      oscillateur.stop(quand + 0.07);
    } catch (erreur) { /* pas de son : le visuel suffit */ }
  }

  /** Coupe ou remet la voix ; la préférence est mémorisée. */
  function basculer() {
    coupee = !coupee;
    if (coupee) arreter();
    try {
      if (stockage && stockage.setItem && stockage.removeItem) {
        if (coupee) stockage.setItem(CLE_MEMOIRE_VOIX, 'coupee');
        else stockage.removeItem(CLE_MEMOIRE_VOIX);
      }
    } catch (erreur) { /* préférence non persistée, sans suite */ }
    return coupee;
  }

  return {
    direTextes,
    arreter,
    basculer,
    jouerClic,
    disponible,
    estCoupee: function () { return coupee; }
  };
}
