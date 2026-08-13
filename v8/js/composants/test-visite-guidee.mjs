// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// VISITE GUIDÉE DE LA DÉMONSTRATION (13/08/2026)
// docs/PLAN-VISITE-GUIDEE.md — décisions du propriétaire : pastilles +
// liste de mission combinées · les TROIS parcours au choix du visiteur ·
// proposée à la première visite + bouton permanent.
//
// Cette suite TIRE les surfaces réelles (modale de proposition posée,
// panneau rendu, avancement au GESTE réel via le magasin de démo) — pas
// le code source — sauf pour les invariants qui ne se rendent pas :
// le pointer-events:none du repère (feuille de style) et le branchement
// de app.js (bouton gaté démo seule).
// Exécution : node v8/js/composants/test-visite-guidee.mjs
// ============================================================

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
  PARCOURS_VISITE, visiteDisponible, choisirCoin, seRecoupent,
  creerVisiteGuidee, CLE_MEMOIRE_VISITE
} = await import('./visite-guidee.js');
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

/** Le texte de tous les toasts posés (le shim ne sérialise pas appendChild). */
function textesToasts() {
  return zoneToasts.querySelectorAll('.toast')
    .map((t) => t.innerHTML).join(' | ');
}

// ============================================================
// A. Les parcours — données bien formées
// ============================================================
console.log('\n--- A. Les trois parcours ---');

const VUES_CONNUES = new Set(['dashboard', 'conformite', 'audit-guide',
  'machines', 'bouteilles', 'mouvements', 'controles', 'dechets', 'outillage',
  'personnel', 'clients', 'plaintes', 'stats', 'bilan', 'balance', 'fluides',
  'admin', 'sauvegarde', 'rgpd']);
const METHODES_COMPTEUR = new Set(['getMachines', 'getBouteilles', 'getMouvements']);

verifier('trois parcours, aux identifiants attendus',
  PARCOURS_VISITE.length === 3
  && PARCOURS_VISITE.map((p) => p.id).join(',') === 'essentiel,complete,frigoriste');
verifier('l\'essentiel fait 4 étapes, la complète 7, le frigoriste 9',
  PARCOURS_VISITE[0].etapes.length === 4
  && PARCOURS_VISITE[1].etapes.length === 7
  && PARCOURS_VISITE[2].etapes.length === 9,
  PARCOURS_VISITE.map((p) => p.etapes.length).join('/'));
verifier('le parcours frigoriste PROLONGE la visite complète (préfixe exact)',
  PARCOURS_VISITE[1].etapes.every(
    (e, i) => PARCOURS_VISITE[2].etapes[i] === e));

let etapesValides = true;
let detailEtape = '';
for (const parcours of PARCOURS_VISITE) {
  for (const etape of parcours.etapes) {
    const bonFait = etape.fait === null
      || (etape.fait.type === 'navigation')
      || (etape.fait.type === 'compteur' && METHODES_COMPTEUR.has(etape.fait.methode));
    if (!(etape.id && etape.titre && etape.consigne && etape.attendu
      && VUES_CONNUES.has(etape.vue)
      && Array.isArray(etape.cibles) && etape.cibles.length > 0
      && etape.cibles.every((c) => typeof c === 'string' && c.trim() !== '')
      && bonFait)) {
      etapesValides = false;
      detailEtape = `${parcours.id}/${etape.id}`;
    }
  }
}
verifier('chaque étape est complète : titre, consigne, attendu, vue connue, '
  + 'cibles, détection légitime', etapesValides, detailEtape);
verifier('chaque parcours annonce durée et description',
  PARCOURS_VISITE.every((p) => p.titre && p.duree && p.description));

// ============================================================
// B. Disponibilité — DÉMO seule, jamais un obstacle en Local
// ============================================================
console.log('\n--- B. Disponibilité par magasin ---');

verifier('magasin de démonstration : visite disponible',
  visiteDisponible({ modeLabel: 'DÉMO' }) === true);
verifier('magasin Local : visite INDISPONIBLE (donc mode exercice aussi)',
  visiteDisponible({ modeLabel: 'LOCAL' }) === false);
verifier('sans magasin : indisponible', visiteDisponible(null) === false);

// ============================================================
// C. Géométrie pure — le panneau ne recouvre jamais la cible
// ============================================================
console.log('\n--- C. Le coin choisi ne recoupe pas la cible ---');

const FENETRE = { largeur: 1280, hauteur: 800 };
const PANNEAU = { largeur: 340, hauteur: 420 };

verifier('deux rectangles disjoints ne se recoupent pas',
  seRecoupent({ gauche: 0, haut: 0, droite: 10, bas: 10 },
    { gauche: 20, haut: 20, droite: 30, bas: 30 }) === false);
verifier('deux rectangles imbriqués se recoupent',
  seRecoupent({ gauche: 0, haut: 0, droite: 100, bas: 100 },
    { gauche: 40, haut: 40, droite: 60, bas: 60 }) === true);

const cibleBasDroite = { gauche: 1000, haut: 500, droite: 1260, bas: 780 };
verifier('cible en bas à droite : le panneau part en bas à GAUCHE',
  choisirCoin(cibleBasDroite, FENETRE, PANNEAU) === 'bas-gauche',
  choisirCoin(cibleBasDroite, FENETRE, PANNEAU));
const cibleBasGauche = { gauche: 20, haut: 500, droite: 300, bas: 780 };
verifier('cible en bas à gauche : le coin par défaut (bas droite) convient',
  choisirCoin(cibleBasGauche, FENETRE, PANNEAU) === 'bas-droite');
verifier('sans cible : coin par défaut',
  choisirCoin(null, FENETRE, PANNEAU) === 'bas-droite');
const cibleGeante = { gauche: 0, haut: 0, droite: 1280, bas: 800 };
verifier('cible géante (tout l\'écran) : repli assumé sur le coin par défaut',
  choisirCoin(cibleGeante, FENETRE, PANNEAU) === 'bas-droite');

// ============================================================
// D. Proposition à la PREMIÈRE visite — et jamais deux fois d'office
// ============================================================
console.log('\n--- D. Première visite : proposée une seule fois ---');

const visite = creerVisiteGuidee({ store, naviguer() {} });

verifier('aucune mémoire au départ',
  localStorage.getItem(CLE_MEMOIRE_VISITE) === null);
visite.proposerAuPremierChargement();
const fondProposition = derniereModale();
verifier('la proposition est posée à la première visite',
  Boolean(fondProposition));
const htmlProposition = fondProposition ? fondProposition.innerHTML : '';
verifier('elle présente les TROIS parcours (titres et durées)',
  htmlProposition.includes('essentiel')
  && htmlProposition.includes('visite complète')
  && htmlProposition.includes('frigoriste')
  && htmlProposition.includes('étapes'));
verifier('elle annonce que rien n\'est bloquant et que l\'on peut quitter',
  htmlProposition.includes('rien n\'est bloquant')
  || htmlProposition.includes('rien n&#39;est bloquant'));
verifier('un bouton « Plus tard » permet de refuser',
  Boolean(fondProposition.querySelector('[data-role="plus-tard"]')));
verifier('la mémoire est posée dès la proposition',
  localStorage.getItem(CLE_MEMOIRE_VISITE) !== null);

await cliquer(fondProposition.querySelector('[data-role="plus-tard"]'));
await attendre(250); // la fermeture retire la boîte après sa transition
const nbApresRefus = zoneModales.querySelectorAll('.modale-fond').length;
visite.proposerAuPremierChargement();
verifier('« Plus tard » : la proposition ne revient PAS d\'office',
  zoneModales.querySelectorAll('.modale-fond').length === nbApresRefus);

// ============================================================
// E. Le panneau — mission, étape, boutons, sauts
// ============================================================
console.log('\n--- E. Panneau : liste de mission + étape courante ---');

visite.proposer();
const fondChoix = derniereModale();
const carteComplete = fondChoix.querySelector('[data-parcours="complete"]');
verifier('la carte du parcours « complète » est cliquable', Boolean(carteComplete));
await cliquer(carteComplete);
await attendre(30);

const panneau = document.getElementById('visite-guidee');
verifier('le panneau de visite est posé', Boolean(panneau));
verifier('il se déclare complémentaire, jamais bloquant (role, aria-label)',
  panneau.getAttribute('role') === 'complementary'
  && panneau.getAttribute('aria-label') === 'Visite guidée');
verifier('la liste de mission porte les 7 étapes',
  panneau.querySelectorAll('.visite-mission').length === 7);
verifier('le bloc d\'étape est annoncé au lecteur d\'écran (aria-live)',
  Boolean(panneau.querySelector('.visite-etape[aria-live="polite"]')));
verifier('l\'étape 1 sur 7 est affichée',
  panneau.innerHTML.includes('Étape 1 sur 7'));
verifier('les trois boutons sont là : Précédent, Suivant, Quitter',
  Boolean(panneau.querySelector('[data-action="precedent"]'))
  && Boolean(panneau.querySelector('[data-action="suivant"]'))
  && Boolean(panneau.querySelector('[data-action="quitter"]')));
verifier('Précédent est désactivé sur la première étape',
  panneau.querySelector('[data-action="precedent"]').disabled === true);
verifier('l\'étape « tableau de bord », déjà à l\'écran, est reconnue FAITE '
  + '(le geste de navigation est détecté)',
panneau.innerHTML.includes('Étape 1 sur 7 — faite')
  && Boolean(panneau.querySelector('.visite-mission--faite')));

await cliquer(panneau.querySelector('[data-action="suivant"]'));
verifier('« Suivant » passe à l\'étape 2 (créer une machine)',
  panneau.innerHTML.includes('Étape 2 sur 7')
  && panneau.innerHTML.includes('Créer une machine'));

const missions = panneau.querySelectorAll('.visite-mission');
await cliquer(missions[4]);
verifier('la liste de mission est une table des matières : sauter à la 5e étape',
  panneau.innerHTML.includes('Étape 5 sur 7'));

await cliquer(panneau.querySelector('[data-action="precedent"]'));
verifier('« Précédent » revient à la 4e étape',
  panneau.innerHTML.includes('Étape 4 sur 7'));

// ============================================================
// F. L'avancement au GESTE RÉEL — créer une machine coche l'étape
// ============================================================
console.log('\n--- F. Le geste réel est détecté (compteur du magasin) ---');

const missionsF = document.getElementById('visite-guidee').querySelectorAll('.visite-mission');
await cliquer(missionsF[1]); // étape « Créer une machine »
await attendre(40); // le décompte de départ se pose (lecture du magasin)

const fluides = await store.getFluides();
await store.createMachine({
  designation: 'Vitrine de la visite guidée', fluide: fluides[0].code,
  chargeNominaleKg: 4, operateur: 'Visiteur'
});
await attendre(80); // le rappel du magasin relit le compteur

const panneauF = document.getElementById('visite-guidee');
verifier('créer une machine (le geste, pas le bouton) marque l\'étape FAITE',
  panneauF.innerHTML.includes('Étape 2 sur 7 — faite'),
  panneauF.innerHTML.slice(0, 200));
verifier('le bouton Suivant se met en avant quand l\'étape est faite',
  Boolean(panneauF.querySelector('.visite-suivant--pret')));
verifier('la réussite est annoncée par un toast',
  textesToasts().includes('Étape réussie'));

// ============================================================
// G. Arrêt propre + invariants de surface
// ============================================================
console.log('\n--- G. Arrêt, et les invariants qui ne se rendent pas ---');

visite.arreter();
verifier('quitter retire le panneau et le repère, la visite est inactive',
  document.getElementById('visite-guidee') === null
  && document.getElementById('visite-repere') === null
  && visite.estActive() === false);
verifier('le départ est annoncé, avec le chemin de relance',
  textesToasts().includes('Visite quittée')
  && textesToasts().includes('Visite guidée'));

const { readFile } = await import('node:fs/promises');
const feuille = await readFile(new URL('../../css/composants.css', import.meta.url), 'utf8');
const blocRepere = feuille.split('.visite-repere {')[1] || '';
verifier('le repère est TRANSPARENT AUX CLICS (pointer-events: none posé '
  + 'dans son bloc de style)',
blocRepere.slice(0, 400).includes('pointer-events: none'));
verifier('le halo animé est réservé à prefers-reduced-motion: no-preference',
  feuille.includes('prefers-reduced-motion: no-preference')
  && feuille.split('prefers-reduced-motion: no-preference')[1]
    .slice(0, 200).includes('visite-halo'));

const sourceApp = await readFile(new URL('../app.js', import.meta.url), 'utf8');
verifier('app.js gate le bouton de la barre latérale par visiteDisponible '
  + '(démo seule)',
sourceApp.includes('visiteDisponible(store)')
  && sourceApp.includes('bouton-visite-guidee'));
verifier('app.js propose la visite à la première visite après le premier rendu',
  sourceApp.includes('proposerAuPremierChargement'));

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
