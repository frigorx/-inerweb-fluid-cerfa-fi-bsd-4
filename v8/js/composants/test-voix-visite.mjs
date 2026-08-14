// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// LA VOIX DE LA DÉMONSTRATION (visite guidée v2, 14/08/2026).
//
// Cette suite tire :
//   A. la recette d'empreinte de texte, GELÉE (compatibilité de
//      l'outillage audio avec Pilote Fluides — une dérive silencieuse
//      rendrait tout le lot MP3 muet sans erreur) ;
//   B. le corpus : chaque étape de chaque parcours a ses textes, et les
//      textes dits sont EXACTEMENT ceux que le panneau affiche ;
//   C. le narrateur, environnement entièrement factice : fichier du lot
//      joué quand l'empreinte est connue, voix du navigateur sinon,
//      REPLI sur erreur de fichier, RIEN à la construction (jamais un
//      son sans geste), coupure mémorisée, arrêt net ;
//   D. la couture dans la visite : l'étape se dit à l'arrivée, le speech
//      de présentation ne part tout seul QUE sur geste humain, le mot de
//      fin est dit ET affiché à l'identique, le bouton couper/remettre ;
//   E. les surfaces : la souris-enseignant est en pointer-events:none et
//      n'apparaît pas sous prefers-reduced-motion (feuille de style).
//
// Exécution : node v8/js/composants/test-voix-visite.mjs
// ============================================================

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

const attendre = (ms) => new Promise((resoudre) => setTimeout(resoudre, ms));

const { installerDocumentFactice } = await import('../core/shim-dom-tests.mjs');
const { document } = installerDocumentFactice();

// Zones techniques attendues par communs.js (modales, toasts)
const zoneModales = document.createElement('div');
zoneModales.id = 'zone-modales';
document.body.appendChild(zoneModales);
const zoneToasts = document.createElement('div');
zoneToasts.id = 'zone-toasts';
document.body.appendChild(zoneToasts);

// Mémoire locale factice (le shim n'en fournit pas)
const memoire = new Map();
globalThis.localStorage = {
  getItem(cle) { return memoire.has(cle) ? memoire.get(cle) : null; },
  setItem(cle, valeur) { memoire.set(cle, String(valeur)); },
  removeItem(cle) { memoire.delete(cle); }
};

const {
  creerNarrateur, textesNarrationEtape, empreinteTexte, normaliserTexte,
  texteADire, TEXTE_PRESENTATION, TEXTE_FIN, CLE_MEMOIRE_VOIX
} = await import('./voix-visite.js');
const { PARCOURS_VISITE, creerVisiteGuidee } = await import('./visite-guidee.js');
const { creerStore } = await import('../data/datastore.js');

const store = await creerStore();

/** Déclenche les écouteurs « click » en ATTENDANT les asynchrones. */
async function cliquer(el) {
  for (const fn of ((el && el.ecouteurs && el.ecouteurs.click) || [])) {
    await fn({ target: el, preventDefault() {} });
  }
}

/** La DERNIÈRE boîte modale posée. */
function derniereModale() {
  const fonds = zoneModales.querySelectorAll('.modale-fond');
  return fonds[fonds.length - 1] || null;
}

// ============================================================
// A. L'empreinte de texte — recette GELÉE (compatibilité Pilote)
// ============================================================
console.log('\n--- A. L\'empreinte de texte, gelée ---');

verifier('empreinte connue et FIGÉE : « Bonne visite. » → 7e7c4419-13',
  empreinteTexte('Bonne visite.') === '7e7c4419-13',
  empreinteTexte('Bonne visite.'));
verifier('l\'espace insécable ne change pas l\'empreinte (normalisation)',
  empreinteTexte('Bonne visite.') === '7e7c4419-13');
verifier('guillemets typographiques normalisés, blancs repliés',
  normaliserTexte('  l’écran  “dit” vrai  ') === 'l\'écran "dit" vrai');

// ============================================================
// B. Le corpus : l'écran est la seule source
// ============================================================
console.log('\n--- B. Le corpus des narrations ---');

let corpusComplet = true;
let detailCorpus = '';
for (const parcours of PARCOURS_VISITE) {
  for (const etape of parcours.etapes) {
    const textes = textesNarrationEtape(etape);
    if (textes.length < 3 || textes.some((t) => typeof t !== 'string' || !t.trim())) {
      corpusComplet = false;
      detailCorpus = `${parcours.id}/${etape.id} : ${textes.length} texte(s)`;
    }
  }
}
verifier('chaque étape de chaque parcours dit trois textes pleins '
  + '(titre, consigne, attendu)', corpusComplet, detailCorpus);
verifier('les textes dits sont CEUX du panneau — jamais plus : l\'attendu '
  + 'se dit SANS son chapeau rituel (Franck, 14/08 : une formatrice ne '
  + 'lit pas les petites lignes)',
(function () {
  const etape = PARCOURS_VISITE[0].etapes[0];
  const textes = textesNarrationEtape(etape);
  return textes[0] === etape.titre + '.'
      && textes[1] === etape.consigne
      && textes[2] === etape.attendu
      && !textes.some((t) => t.includes('Ce que vous devez voir'));
})());
verifier('le speech de présentation existe, simple et honnête '
  + '(démonstration, fictif, aucun superlatif hors sujet)',
TEXTE_PRESENTATION.includes('démonstration') && TEXTE_PRESENTATION.includes('fictif'));
verifier('le mot de fin renvoie au guide et reste affichable en toast',
  TEXTE_FIN.includes('guide complet') && TEXTE_FIN.length < 400);
verifier('une étape absente ne dit rien (jamais de « undefined » parlé)',
  textesNarrationEtape(null).length === 0);

// ============================================================
// C. Le narrateur — environnement entièrement factice
// ============================================================
console.log('\n--- C. Le narrateur ---');

class AudioFactice {
  constructor(src) {
    this.src = src;
    this.ecouteurs = {};
    this.enErreur = AudioFactice.prochaineEnErreur;
    AudioFactice.instances.push(this);
  }

  addEventListener(nom, fn) {
    (this.ecouteurs[nom] = this.ecouteurs[nom] || []).push(fn);
  }

  play() {
    AudioFactice.lectures.push(this.src);
    const moi = this;
    setTimeout(function () {
      (moi.ecouteurs[moi.enErreur ? 'error' : 'ended'] || []).forEach((fn) => fn());
    }, 0);
    return Promise.resolve();
  }

  pause() {
    AudioFactice.pauses.push(this.src);
    (this.ecouteurs.pause || []).forEach((fn) => fn());
  }
}
AudioFactice.instances = [];
AudioFactice.lectures = [];
AudioFactice.pauses = [];
AudioFactice.prochaineEnErreur = false;

function fabriquerSynthese() {
  const synthese = {
    dits: [],
    annulations: 0,
    speak(phrase) {
      synthese.dits.push(phrase.text);
      setTimeout(function () { if (phrase.onend) phrase.onend(); }, 0);
    },
    cancel() { synthese.annulations += 1; },
    getVoices() { return [{ lang: 'fr-FR' }]; }
  };
  return synthese;
}
class UtteranceFactice { constructor(texte) { this.text = texte; } }

function fabriquerStockage() {
  const sac = new Map();
  return {
    getItem(cle) { return sac.has(cle) ? sac.get(cle) : null; },
    setItem(cle, valeur) { sac.set(cle, String(valeur)); },
    removeItem(cle) { sac.delete(cle); },
    sac
  };
}

const CONNU = 'Texte connu.';
const INDEX_FACTICE = { entrees: {} };
INDEX_FACTICE.entrees[empreinteTexte(CONNU)] = { fichier: 'audio/connu.mp3' };

function fabriquerNarrateur(stockage) {
  const synthese = fabriquerSynthese();
  const fenetre = {
    Audio: AudioFactice,
    speechSynthesis: synthese,
    SpeechSynthesisUtterance: UtteranceFactice
  };
  const narrateur = creerNarrateur({
    fenetre,
    stockage: stockage || fabriquerStockage(),
    index: INDEX_FACTICE,
    baseAudio: 'base/'
  });
  return { narrateur, synthese };
}

AudioFactice.lectures.length = 0;
const { narrateur: n1, synthese: s1 } = fabriquerNarrateur();
verifier('RIEN ne se joue à la construction (jamais un son sans geste)',
  AudioFactice.lectures.length === 0 && s1.dits.length === 0);

await n1.direTextes([CONNU]);
verifier('un texte à l\'index joue SON fichier du lot (base + chemin)',
  AudioFactice.lectures.join(',') === 'base/audio/connu.mp3' && s1.dits.length === 0,
  AudioFactice.lectures.join(','));

await n1.direTextes(['Texte inconnu de l\'index.']);
verifier('un texte inconnu retombe sur la voix du navigateur',
  s1.dits.join(',') === 'Texte inconnu de l\'index.'
  && AudioFactice.lectures.length === 1);

AudioFactice.lectures.length = 0;
s1.dits.length = 0;
await n1.direTextes([CONNU, 'Texte inconnu de l\'index.']);
verifier('une suite de textes se dit dans l\'ordre, chacun par son canal',
  AudioFactice.lectures.length === 1 && s1.dits.length === 1);

AudioFactice.prochaineEnErreur = true;
s1.dits.length = 0;
await n1.direTextes([CONNU]);
AudioFactice.prochaineEnErreur = false;
verifier('un fichier du lot en ERREUR retombe sur la voix du navigateur '
  + '(la visite ne dépend jamais du lot)',
s1.dits.join(',') === CONNU);

const stockageCoupe = fabriquerStockage();
stockageCoupe.setItem(CLE_MEMOIRE_VOIX, 'coupee');
const { narrateur: n2, synthese: s2 } = fabriquerNarrateur(stockageCoupe);
AudioFactice.lectures.length = 0;
await n2.direTextes([CONNU]);
verifier('la coupure PERSISTÉE est lue à la création : rien ne se joue',
  n2.estCoupee() && AudioFactice.lectures.length === 0 && s2.dits.length === 0);
const remise = n2.basculer();
await n2.direTextes([CONNU]);
verifier('« Remettre la voix » efface la mémoire et rejoue',
  remise === false && !stockageCoupe.sac.has(CLE_MEMOIRE_VOIX)
  && AudioFactice.lectures.length === 1);
n2.basculer();
verifier('« Couper la voix » se mémorise et coupe net (cancel)',
  n2.estCoupee() && stockageCoupe.sac.get(CLE_MEMOIRE_VOIX) === 'coupee'
  && s2.annulations >= 1);

const avantArret = s1.annulations;
n1.arreter();
verifier('arreter() annule la synthèse en cours', s1.annulations === avantArret + 1);

verifier('jouerClic sans AudioContext ne lève JAMAIS (le visuel suffit)',
  (function () {
    try { n1.jouerClic(); return true; } catch (erreur) { return false; }
  })());

let oscillateurs = 0;
const contexteFactice = function () {
  return {
    currentTime: 0,
    createOscillator() {
      oscillateurs += 1;
      return {
        type: '', frequency: { setValueAtTime() {} },
        connect() {}, start() {}, stop() {}
      };
    },
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {}
      };
    },
    destination: {}
  };
};
const { narrateur: n3 } = (function () {
  const synthese = fabriquerSynthese();
  return {
    narrateur: creerNarrateur({
      fenetre: {
        Audio: AudioFactice, speechSynthesis: synthese,
        SpeechSynthesisUtterance: UtteranceFactice, AudioContext: contexteFactice
      },
      stockage: fabriquerStockage(), index: INDEX_FACTICE, baseAudio: 'base/'
    })
  };
})();
n3.jouerClic();
verifier('jouerClic fabrique son bip sur place (oscillateur, aucun fichier)',
  oscillateurs === 1);

verifier('sans fenêtre du tout : indisponible, et direTextes ne bloque pas',
  (function () {
    const nu = creerNarrateur({ fenetre: null, stockage: fabriquerStockage() });
    nu.direTextes(['rien']);
    return nu.disponible() === false;
  })());

// ============================================================
// D. La couture dans la visite
// ============================================================
console.log('\n--- D. La couture dans la visite guidée ---');

function fabriquerNarrateurEnregistreur() {
  const enregistreur = {
    appels: [],
    coupee: false,
    direTextes(textes) {
      enregistreur.appels.push({ geste: 'dire', textes: [].concat(textes) });
      return Promise.resolve();
    },
    arreter() { enregistreur.appels.push({ geste: 'arreter' }); },
    basculer() {
      enregistreur.coupee = !enregistreur.coupee;
      enregistreur.appels.push({ geste: 'basculer' });
      return enregistreur.coupee;
    },
    jouerClic() { enregistreur.appels.push({ geste: 'clic' }); },
    disponible() { return true; },
    estCoupee() { return enregistreur.coupee; }
  };
  return enregistreur;
}
function derniersDits(enregistreur) {
  const dits = enregistreur.appels.filter((a) => a.geste === 'dire');
  return dits.length ? dits[dits.length - 1].textes : [];
}

const enregistreur = fabriquerNarrateurEnregistreur();
const controleur = creerVisiteGuidee({
  store, naviguer() {}, narrateur: enregistreur
});

controleur.demarrer('essentiel');
await attendre(10);
const etape1 = PARCOURS_VISITE[0].etapes[0];
verifier('au départ de la visite, l\'étape 1 se DIT — exactement les '
  + 'textes du panneau',
derniersDits(enregistreur).join('|') === textesNarrationEtape(etape1).join('|'),
derniersDits(enregistreur).join('|'));

const panneau = document.getElementById('visite-guidee');
verifier('le panneau porte le bouton couper/remettre la voix (aria-pressed)',
  Boolean(panneau) && Boolean(panneau.querySelector('[data-action="voix"]'))
  && panneau.querySelector('[data-action="voix"]').getAttribute('aria-pressed') === 'false');

await cliquer(panneau.querySelector('[data-action="suivant"]'));
await attendre(10);
const etape2 = PARCOURS_VISITE[0].etapes[1];
verifier('« Suivant » (le bouton pour passer) fait dire l\'étape suivante',
  derniersDits(enregistreur).join('|') === textesNarrationEtape(etape2).join('|'));

await cliquer(panneau.querySelector('[data-action="voix"]'));
verifier('le bouton voix bascule et l\'état se REDIT à l\'écran '
  + '(aria-pressed, libellé)',
enregistreur.appels.some((a) => a.geste === 'basculer')
  && document.getElementById('visite-guidee')
    .querySelector('[data-action="voix"]').getAttribute('aria-pressed') === 'true'
  && document.getElementById('visite-guidee')
    .querySelector('[data-action="voix"]').getAttribute('aria-label') === 'Remettre la voix');
await cliquer(document.getElementById('visite-guidee').querySelector('[data-action="voix"]'));

const panneauCourant = () => document.getElementById('visite-guidee');
await cliquer(panneauCourant().querySelector('[data-action="suivant"]'));
await cliquer(panneauCourant().querySelector('[data-action="suivant"]'));
await attendre(10);
enregistreur.appels.length = 0;
await cliquer(panneauCourant().querySelector('[data-action="suivant"]'));
await attendre(10);
verifier('« Terminer » dit le mot de fin — le MÊME texte que le toast',
  derniersDits(enregistreur).join('|') === TEXTE_FIN
  && zoneToasts.querySelectorAll('.toast')
    .some((t) => t.innerHTML.includes('Visite terminée')));
verifier('à l\'arrêt, la voix est coupée net (arreter) et la '
  + 'souris-enseignant est démontée',
enregistreur.appels.some((a) => a.geste === 'arreter')
  && document.getElementById('visite-souris') === null
  && document.getElementById('visite-guidee') === null);

// --- le speech de présentation : geste humain seulement ---
enregistreur.appels.length = 0;
controleur.proposer();
const modaleAuto = derniereModale();
verifier('à l\'ouverture AUTOMATIQUE : le speech est AFFICHÉ, un bouton '
  + '« Écouter la présentation » existe, RIEN ne se joue tout seul',
Boolean(modaleAuto)
  && modaleAuto.innerHTML.includes('interface de démonstration')
  && Boolean(modaleAuto.querySelector('[data-role="ecouter-presentation"]'))
  && enregistreur.appels.filter((a) => a.geste === 'dire').length === 0);
await cliquer(modaleAuto.querySelector('[data-role="ecouter-presentation"]'));
verifier('le bouton « Écouter la présentation » dit le speech (le geste)',
  derniersDits(enregistreur).join('|') === TEXTE_PRESENTATION);
await cliquer(modaleAuto.querySelector('[data-role="plus-tard"]'));
verifier('fermer la proposition coupe la voix (surFermeture)',
  enregistreur.appels.some((a) => a.geste === 'arreter'));

enregistreur.appels.length = 0;
controleur.proposer({ gesteHumain: true });
const modaleGeste = derniereModale();
verifier('ouverte par un GESTE (bouton barre latérale) : le speech part '
  + 'tout seul',
derniersDits(enregistreur).join('|') === TEXTE_PRESENTATION);
await cliquer(modaleGeste.querySelector('[data-role="plus-tard"]'));

enregistreur.coupee = true;
enregistreur.appels.length = 0;
controleur.proposer({ gesteHumain: true });
verifier('voix coupée : même sur geste, le speech ne part pas tout seul',
  enregistreur.appels.filter((a) => a.geste === 'dire').length === 0);
const modaleCoupee = derniereModale();
const boutonEcouterCoupe = modaleCoupee.querySelector('[data-role="ecouter-presentation"]');
verifier('voix coupée : le bouton d\'écoute LE DIT (« Remettre la voix… »), '
  + 'jamais un bouton muet sans explication (défaut du 14/08)',
boutonEcouterCoupe.textContent === 'Remettre la voix et écouter la présentation');
await cliquer(boutonEcouterCoupe);
verifier('le clic « écouter » REMET la voix puis lit le speech (le geste '
  + 'explicite vaut plus que la coupure mémorisée)',
enregistreur.appels.some((a) => a.geste === 'basculer')
  && enregistreur.coupee === false
  && derniersDits(enregistreur).join('|') === TEXTE_PRESENTATION);
await cliquer(modaleCoupee.querySelector('[data-role="plus-tard"]'));
enregistreur.coupee = false;

// ============================================================
// D-ter. La diction — la ponctuation ne se lit pas (Franck, 14/08)
// ============================================================
console.log('\n--- D-ter. La diction ---');

verifier('texteADire : guillemets, parenthèses, astérisque, point médian '
  + 'ne se disent pas',
texteADire('Ouvrez « Parc machines » (CERFA 15497*04) · voilà.')
  === 'Ouvrez Parc machines CERFA 15497 04 voilà.');
verifier('texteADire : le tiret devient la pause (virgule), les points de '
  + 'suspension un point',
texteADire('Visite terminée — bonne découverte…')
  === 'Visite terminée, bonne découverte.');
verifier('texteADire : l\'apostrophe RESTE, elle porte le mot',
  texteADire('L\'essentiel de l\'audit.') === 'L\'essentiel de l\'audit.');
verifier('l\'empreinte reste celle de l\'ÉCRAN (nettoyer changerait la clé '
  + '— preuve que la diction n\'entre pas dans l\'index)',
empreinteTexte('a « b »') !== empreinteTexte(texteADire('a « b »')));

// Le repli navigateur dit le texte NETTOYÉ (capture de l'utterance).
{
  const { narrateur: nDiction, synthese: sDiction } = fabriquerNarrateur();
  await nDiction.direTextes(['Inconnu « à signes » — donc (repli)…']);
  verifier('le repli navigateur reçoit le texte nettoyé, jamais les signes',
    sDiction.dits.join('|') === 'Inconnu à signes, donc repli.');
}

verifier('texteADire : le point-virgule devient la pause, la barre et le '
  + 'dièse s\'effacent (liste blanche : un signe ne se prononce jamais)',
texteADire('PAC air/eau ; réf. #12 <ou> [15] {seize}')
  === 'PAC air eau, réf. 12 ou 15 seize');

// LA liste blanche, prouvée sur TOUT le corpus réel : aucun signe qui
// s'épelle ne survit dans ce que la voix dit — aujourd'hui et demain
// (un texte futur qui introduit un signe non traité fait rougir ce test).
{
  const corpusEntier = [TEXTE_PRESENTATION, TEXTE_FIN];
  for (const parcours of PARCOURS_VISITE) {
    for (const etape of parcours.etapes) {
      corpusEntier.push(...textesNarrationEtape(etape));
    }
  }
  const dits = corpusEntier.map(texteADire).join(' ');
  const horsListe = [...new Set(dits)]
    .filter((c) => !/[0-9a-zA-ZÀ-ÖØ-öø-ÿŒœ .,:!?'-]/.test(c));
  verifier('tout le corpus dit tient dans la liste blanche (aucun signe '
    + 'prononçable)', horsListe.length === 0, JSON.stringify(horsListe));
  verifier('le chapeau « Ce que vous devez voir » ne se dit plus nulle part',
    !dits.includes('Ce que vous devez voir'));
}

// La fabrication : Piper reçoit texteADire, la clé reste l'écran.
{
  const sourceOutil = readFileSync(join(dirname(fileURLToPath(import.meta.url)),
    '..', '..', '..', 'outils', 'generer-voix-visite.mjs'), 'utf8');
  verifier('l\'outil de fabrication donne à Piper le texte tel qu\'il se dit',
    sourceOutil.includes('input: texteADire(texte)'));
  verifier('…et la clé du fichier reste l\'empreinte du texte de l\'écran',
    sourceOutil.includes('empreinteTexte(normalise)'));
}

// ============================================================
// E. Les surfaces (feuille de style)
// ============================================================
console.log('\n--- E. Les surfaces ---');

const cheminCss = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'css', 'composants.css');
const css = readFileSync(cheminCss, 'utf8');
const blocSouris = css.slice(css.indexOf('.visite-souris {'));
verifier('la souris-enseignant est en pointer-events:none (jamais un obstacle)',
  css.includes('.visite-souris {')
  && blocSouris.slice(0, blocSouris.indexOf('}')).includes('pointer-events: none'));
verifier('sous prefers-reduced-motion, la souris n\'apparaît pas (décorative)',
  /prefers-reduced-motion:\s*reduce\)\s*\{\s*\.visite-souris\s*\{\s*display:\s*none/.test(css));
verifier('le bloc du speech de présentation a sa classe dans la feuille',
  css.includes('.visite-presentation {'));

// ============================================================
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
