/* Vérification du moteur : node controle-simulation.mjs
   Chaque câblage est soumis à la même suite de manœuvres ; on compare
   l'état du contacteur à ce qu'un frigoriste observerait sur la platine. */
import './simulation.js';
const { stabiliser } = globalThis.SIMULATION;

/* Suite de manœuvres : mise sous tension, appui marche, relâcher, appui
   arrêt, relâcher, puis coupure et réarmement de Q1 sans toucher aux boutons. */
const MANOEUVRES = [
  ['sous tension', { q: 1, s1: 0, s2: 0 }],
  ['appui Marche', { q: 1, s1: 0, s2: 1 }],
  ['relâche Marche', { q: 1, s1: 0, s2: 0 }],
  ['appui Arrêt', { q: 1, s1: 1, s2: 0 }],
  ['relâche Arrêt', { q: 1, s1: 0, s2: 0 }],
  ['appui Marche', { q: 1, s1: 0, s2: 1 }],
  ['relâche Marche', { q: 1, s1: 0, s2: 0 }],
  ['Q1 coupé', { q: 0, s1: 0, s2: 0 }],
  ['Q1 réarmé', { q: 1, s1: 0, s2: 0 }]
];

/* Attendu : 'C' collé, 'R' repos, 'B' bat. */
const ATTENDU = {
  normal:            'R C C R R C C R R',
  'sans-maintien':   'R C R R R C R R R',
  'maintien-amont':  'R C C C C C C R R',
  'arret-parallele': 'C C C C C C C R C',
  'marche-nc':       'C C C R C C C R C',
  'auxiliaire-nc':   'B C B R B C B R B',
  'bobine-hs':       'R R R R R R R R R'
};

let erreurs = 0;
for (const [cablage, attendu] of Object.entries(ATTENDU)) {
  let km = false;
  const obtenu = MANOEUVRES.map(([, e]) => {
    const r = stabiliser(cablage, { ...e, km });
    km = r.km;
    return r.bat ? 'B' : (km ? 'C' : 'R');
  }).join(' ');
  const ok = obtenu === attendu;
  if (!ok) erreurs++;
  console.log((ok ? 'ok   ' : 'FAUX ') + cablage.padEnd(18) + obtenu + (ok ? '' : '   attendu ' + attendu));
}
console.log(erreurs ? `\n${erreurs} câblage(s) en désaccord.` : '\nLes 7 câblages se comportent comme attendu.');
process.exit(erreurs ? 1 : 0);
