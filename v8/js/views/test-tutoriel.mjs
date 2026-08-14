// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// VISITE GUIDÉE DE LA DÉMONSTRATION (13/08/2026, plan
// docs/PLAN-TUTORIEL-DEMO.md) — la suite TIRE les surfaces réelles
// (patron test-dechets-libelles) :
//   - chaque CIBLE d'étape existe dans le RENDU RÉEL de sa vue (un
//     bouton renommé fait rougir cette suite, pas échouer la visite
//     en silence chez un visiteur) ;
//   - le panneau réel : numérotation, boutons, rôle, avancement,
//     reprise après Quitter ;
//   - l'auto-défense Mode Local (rien ne se pose) ;
//   - le coin du panneau OPPOSÉ à la cible (fonction pure) ;
//   - prefers-reduced-motion : l'animation n'existe QUE sous
//     no-preference (réduit = liseré statique, jamais disparu) ;
//   - aucun anglicisme dans les textes affichés.
// Exécution : node v8/js/views/test-tutoriel.mjs
// ============================================================

import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

// Banc : DOM factice + localStorage factice AVANT tout import applicatif.
const { installerDocumentFactice } = await import('../core/shim-dom-tests.mjs');
const { document } = installerDocumentFactice();
const memoire = new Map();
globalThis.localStorage = {
  getItem: (cle) => (memoire.has(cle) ? memoire.get(cle) : null),
  setItem: (cle, valeur) => { memoire.set(cle, String(valeur)); },
  removeItem: (cle) => { memoire.delete(cle); }
};

const {
  ETAPES, CLE_VISITE, coinOppose, poserVisiteGuidee, demarrerVisite,
  quitterVisite
} = await import('./tutoriel.js');
const { creerStore } = await import('../data/datastore.js');

const store = await creerStore();
if (store.init) await store.init();

const attendre = (ms) => new Promise((r) => { setTimeout(r, ms); });

// ============================================================
// 1. Les étapes sont bien formées, leurs vues existent sur disque
// ============================================================
verifier('étapes : le parcours compte 7 étapes', ETAPES.length === 7);
verifier('étapes : titre et consigne partout',
  ETAPES.every((e) => e.titre && e.consigne && e.consigne.length > 40));

const dossierVues = dirname(fileURLToPath(import.meta.url));
for (const vue of [...new Set(ETAPES.map((e) => e.vue))]) {
  let existe = true;
  try { await access(join(dossierVues, vue + '.js')); } catch { existe = false; }
  verifier(`étapes : la vue « ${vue} » existe (views/${vue}.js)`, existe);
}

const MOTS_INTERDITS = /wizard|tutorial|step|onboarding|tour\b/i;
verifier('étapes : aucun anglicisme dans les textes affichés',
  ETAPES.every((e) => !MOTS_INTERDITS.test(e.titre + ' ' + e.consigne)));

// ============================================================
// 2. Chaque cible existe dans le RENDU RÉEL de sa vue
// ============================================================
for (const etape of ETAPES.filter((e) => e.cible)) {
  let trouvee = false;
  let detail = '';
  try {
    const module = await import('./' + etape.vue + '.js');
    const conteneur = document.createElement('div');
    document.body.appendChild(conteneur);
    await module.render(conteneur, { store, naviguer: () => {}, param: '' });
    trouvee = Boolean(conteneur.querySelector(etape.cible));
    detail = trouvee ? '' : `« ${etape.cible} » absent du rendu de ${etape.vue}`;
    conteneur.remove();
  } catch (erreur) {
    detail = `rendu de ${etape.vue} en échec : ${erreur.message}`;
  }
  verifier(`cible réelle : ${etape.cible} rendu par la vue ${etape.vue}`,
    trouvee, detail);
}

// ============================================================
// 3. Coin du panneau : toujours OPPOSÉ au quadrant de la cible
// ============================================================
const fenetre = { width: 1000, height: 800 };
verifier('coin : cible en haut-gauche → panneau bas-droite',
  coinOppose({ left: 10, top: 10, width: 50, height: 20 }, fenetre) === 'bas-droite');
verifier('coin : cible en haut-droite → panneau bas-gauche',
  coinOppose({ left: 900, top: 10, width: 50, height: 20 }, fenetre) === 'bas-gauche');
verifier('coin : cible en bas-gauche → panneau haut-droite',
  coinOppose({ left: 10, top: 700, width: 50, height: 20 }, fenetre) === 'haut-droite');
verifier('coin : cible en bas-droite → panneau haut-gauche',
  coinOppose({ left: 900, top: 700, width: 50, height: 20 }, fenetre) === 'haut-gauche');
verifier('coin : sans cible → bas-droite (défaut)',
  coinOppose(null, fenetre) === 'bas-droite');

// ============================================================
// 4. Auto-défense : en Mode Local, RIEN ne se pose
// ============================================================
document.body.innerHTML = '<div id="sidebar"><div class="sidebar-pied">'
  + '<button id="bouton-sauvegarde" type="button">Sauvegarde</button>'
  + '</div></div>';
poserVisiteGuidee({ modeLabel: 'LOCAL' }, () => {});
verifier('Mode Local : aucun bouton « Visite guidée » posé',
  !document.getElementById('bouton-visite-guidee'));
verifier('Mode Local : aucune invite posée',
  !document.getElementById('visite-invite'));
verifier('Mode Local : aucun style injecté',
  !document.getElementById('style-visite-guidee'));

// ============================================================
// 5. Pose en DÉMONSTRATION : bouton, invite, « Plus tard »
// ============================================================
poserVisiteGuidee({ modeLabel: 'DÉMO' }, () => {});
verifier('démo : bouton « Visite guidée » au pied de la barre latérale',
  Boolean(document.getElementById('bouton-visite-guidee')));
const invite = document.getElementById('visite-invite');
verifier('démo : invite discrète posée à la première visite',
  Boolean(invite) && invite.getAttribute('role') === 'dialog');

const style = document.getElementById('style-visite-guidee');
const css = style ? style.textContent : '';
const blocReduit = css.split('@media (prefers-reduced-motion: no-preference)');
verifier('mouvement réduit : l’animation vit SOUS la garde no-preference',
  blocReduit.length === 2 && blocReduit[1].includes('animation')
  && !blocReduit[0].includes('animation'));
verifier('impression : panneau, invite et étiquette masqués en @media print',
  css.includes('@media print'));

const boutonPlusTard = invite.querySelector('[data-visite="plus-tard"]');
invite.declencher('click', { target: boutonPlusTard });
verifier('démo : « Plus tard » retire l’invite et pose la clé',
  !document.getElementById('visite-invite')
  && JSON.parse(memoire.get(CLE_VISITE)).proposee === true);

document.getElementById('bouton-visite-guidee').remove();
poserVisiteGuidee({ modeLabel: 'DÉMO' }, () => {});
verifier('démo : déjà proposée → plus d’invite aux visites suivantes',
  !document.getElementById('visite-invite'));

// ============================================================
// 6. Le panneau réel : numérotation, boutons, navigation, reprise
// ============================================================
const vuesDemandees = [];
const conteneurVue = document.createElement('div');
document.body.appendChild(conteneurVue);
const naviguerFactice = (vue) => {
  vuesDemandees.push(vue);
  // Le banc joue le routeur : il rend la VRAIE vue demandée.
  import('./' + vue + '.js').then(async (module) => {
    conteneurVue.innerHTML = '';
    const c = document.createElement('div');
    conteneurVue.appendChild(c);
    await module.render(c, { store, naviguer: () => {}, param: '' });
  }).catch(() => {});
};
poserVisiteGuidee({ modeLabel: 'DÉMO' }, naviguerFactice);

demarrerVisite();
let panneau = document.getElementById('visite-panneau');
verifier('panneau : posé au démarrage, rôle dialog',
  Boolean(panneau) && panneau.getAttribute('role') === 'dialog');
verifier('panneau : « étape 1 sur 7 » annoncée',
  panneau.innerHTML.includes('étape 1 sur 7'));
verifier('panneau : la visite demande la vue de l’étape 1 (dashboard)',
  vuesDemandees[0] === 'dashboard');
const boutons = panneau.querySelectorAll('button');
verifier('panneau : trois boutons (Précédent, Suivant, Quitter)',
  boutons.length === 3);
verifier('panneau : Précédent inerte à la première étape',
  boutons[0].hasAttribute('disabled'));

panneau.declencher('click', { target: panneau.querySelector('[data-visite="suivant"]') });
await attendre(600); // la vue machines se rend, la surbrillance se pose
panneau = document.getElementById('visite-panneau');
verifier('panneau : « Suivant » passe à l’étape 2 sur 7',
  panneau.innerHTML.includes('étape 2 sur 7'));
verifier('panneau : la vue de l’étape 2 (machines) a été demandée',
  vuesDemandees[1] === 'machines');
const cible = conteneurVue.querySelector('#bouton-ajouter-machine');
verifier('surbrillance : la cible réelle porte le liseré (classe visite-cible)',
  Boolean(cible) && cible.classList.contains('visite-cible'));
const etiquette = document.getElementById('visite-etiquette');
verifier('surbrillance : l’étiquette « Ici » accompagne le liseré (jamais la couleur seule)',
  Boolean(etiquette) && etiquette.textContent === 'Ici');

quitterVisite();
verifier('quitter : panneau ET surbrillance retirés, rien ne reste',
  !document.getElementById('visite-panneau')
  && !document.getElementById('visite-etiquette')
  && !cible.classList.contains('visite-cible'));
verifier('quitter : l’avancement retient l’étape 2 (reprise possible)',
  JSON.parse(memoire.get(CLE_VISITE)).etape === 1);

demarrerVisite();
panneau = document.getElementById('visite-panneau');
verifier('reprise : la visite repart à l’étape 2 sur 7',
  panneau.innerHTML.includes('étape 2 sur 7'));
quitterVisite();

// ============================================================
// Verdict
// ============================================================
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Tous les tests de la visite guidée passent.');
