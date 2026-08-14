// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// Tests UNITAIRES du module pur sentinelle.js (aucun store, aucune horloge).
// Tourne une seule fois (non doublé). Lancé par outils/lancer-tests.mjs.

import {
  calculerTransitions,
  formaterEpisode,
  comparerEpisodes,
  estOuvert
} from './sentinelle.js';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

const T0 = '2026-07-13T09:00:00.000Z';
const T1 = '2026-07-14T09:00:00.000Z';

const alerteA = { id: 'alr-controle-M1', niveau: 'CRITIQUE',
  titre: 'Contrôle en retard', detail: 'M1 · échéance …', cible: { vue: 'machines', id: 'M1' } };
const alerteB = { id: 'alr-capacite', niveau: 'IMPORTANT',
  titre: 'Capacité à renouveler', detail: '…', cible: { vue: 'admin' } };

// --- Apparition : base vierge, deux alertes actives ---------------
{
  const { apparitions, escalades, resolutions } =
    calculerTransitions([alerteA, alerteB], [], T0);
  verifier('apparition : 2 épisodes créés', apparitions.length === 2);
  verifier('apparition : aucune escalade', escalades.length === 0);
  verifier('apparition : aucune résolution', resolutions.length === 0);
  const a = apparitions.find((x) => x.idAlerte === 'alr-controle-M1');
  verifier('apparition : idAlerte repris', a && a.idAlerte === 'alr-controle-M1');
  verifier('apparition : niveau figé', a && a.niveau === 'CRITIQUE');
  verifier('apparition : cible mise à plat (vue+id)', a && a.cibleVue === 'machines' && a.cibleId === 'M1');
  verifier('apparition : apparueLe = maintenant injecté', a && a.apparueLe === T0);
  verifier('apparition : aucun id attribué par le module pur', a && a.id === undefined);
  const b = apparitions.find((x) => x.idAlerte === 'alr-capacite');
  verifier('apparition : cibleId nul quand la cible n’a pas d’id', b && b.cibleVue === 'admin' && b.cibleId === null);
}

// --- Idempotence : mêmes alertes, épisodes déjà ouverts -----------
{
  const ouverts = [
    { id: 'SEN-1', idAlerte: 'alr-controle-M1', niveau: 'CRITIQUE', resolueLe: null },
    { id: 'SEN-2', idAlerte: 'alr-capacite', niveau: 'IMPORTANT', resolueLe: null }
  ];
  const { apparitions, escalades, resolutions } =
    calculerTransitions([alerteA, alerteB], ouverts, T1);
  verifier('idempotence : aucune apparition', apparitions.length === 0);
  verifier('idempotence : aucune escalade (niveaux inchangés)', escalades.length === 0);
  verifier('idempotence : aucune résolution', resolutions.length === 0);
}

// --- Escalade : même id, niveau IMPORTANT → CRITIQUE --------------
{
  const ouverts = [
    { id: 'SEN-2', idAlerte: 'alr-capacite', niveau: 'IMPORTANT', resolueLe: null }
  ];
  const capaciteCritique = { id: 'alr-capacite', niveau: 'CRITIQUE',
    titre: 'Capacité expirée', detail: 'expirée', cible: { vue: 'admin' } };
  const { apparitions, escalades, resolutions } =
    calculerTransitions([capaciteCritique], ouverts, T1);
  verifier('escalade : aucune apparition (même id déjà ouvert)', apparitions.length === 0);
  verifier('escalade : aucune résolution', resolutions.length === 0);
  verifier('escalade : 1 épisode à rafraîchir', escalades.length === 1);
  verifier('escalade : cible l’épisode ouvert par son id', escalades[0].id === 'SEN-2');
  verifier('escalade : nouveau niveau CRITIQUE', escalades[0].niveau === 'CRITIQUE');
  verifier('escalade : nouveau titre repris', escalades[0].titre === 'Capacité expirée');
}

// --- Allègement : même id, niveau CRITIQUE → IMPORTANT ------------
{
  const ouverts = [
    { id: 'SEN-9', idAlerte: 'alr-fuite-M2', niveau: 'CRITIQUE', resolueLe: null }
  ];
  const fuiteReparee = { id: 'alr-fuite-M2', niveau: 'IMPORTANT',
    titre: 'Contrôle de suivi à faire', detail: 'réparée', cible: { vue: 'machines', id: 'M2' } };
  const { escalades } = calculerTransitions([fuiteReparee], ouverts, T1);
  verifier('allègement : traité comme une escalade (changement de gravité)',
    escalades.length === 1 && escalades[0].niveau === 'IMPORTANT');
}

// --- Dédup défensif : un id d'alerte dupliqué ---------------------
{
  const { apparitions } = calculerTransitions([alerteA, alerteA], [], T0);
  verifier('dédup : un id d’alerte dupliqué ne crée qu’un épisode', apparitions.length === 1);
}

// --- Résolution : une alerte disparaît ----------------------------
{
  const ouverts = [
    { id: 'SEN-1', idAlerte: 'alr-controle-M1', niveau: 'CRITIQUE', resolueLe: null },
    { id: 'SEN-2', idAlerte: 'alr-capacite', niveau: 'IMPORTANT', resolueLe: null }
  ];
  // alerteB n'est plus active
  const { apparitions, escalades, resolutions } =
    calculerTransitions([alerteA], ouverts, T1);
  verifier('résolution : aucune apparition', apparitions.length === 0);
  verifier('résolution : aucune escalade', escalades.length === 0);
  verifier('résolution : 1 épisode clos (le bon)', resolutions.length === 1 && resolutions[0] === 'SEN-2');
}

// --- Réapparition : alerte de retour → NOUVEL épisode -------------
{
  const ouverts = []; // l'ancien épisode est résolu, donc absent des ouverts
  const { apparitions, resolutions } = calculerTransitions([alerteA], ouverts, T1);
  verifier('réapparition : un nouvel épisode', apparitions.length === 1 && apparitions[0].idAlerte === 'alr-controle-M1');
  verifier('réapparition : horodaté du retour', apparitions[0].apparueLe === T1);
  verifier('réapparition : aucune résolution', resolutions.length === 0);
}

// --- Apparition + résolution simultanées --------------------------
{
  const ouverts = [{ id: 'SEN-9', idAlerte: 'alr-capacite', niveau: 'IMPORTANT', resolueLe: null }];
  const { apparitions, resolutions } = calculerTransitions([alerteA], ouverts, T1);
  verifier('mixte : A apparaît', apparitions.length === 1 && apparitions[0].idAlerte === 'alr-controle-M1');
  verifier('mixte : capacité se résout', resolutions.length === 1 && resolutions[0] === 'SEN-9');
}

// --- formaterEpisode : forme de sortie du contrat -----------------
{
  const brut = {
    id: 'SEN-1', idAlerte: 'alr-controle-M1', niveau: 'CRITIQUE',
    titre: 'Contrôle en retard', detail: 'M1 · …',
    cibleVue: 'machines', cibleId: 'M1',
    apparueLe: T0, resolueLe: null, acquitteeLe: null, acquitteePar: null
  };
  const f = formaterEpisode(brut);
  verifier('format : cible reconstruite en objet', f.cible && f.cible.vue === 'machines' && f.cible.id === 'M1');
  verifier('format : resolueLe normalisé à null', f.resolueLe === null);
  verifier('format : pas de fuite de cibleVue/cibleId', !('cibleVue' in f) && !('cibleId' in f));

  const sansId = formaterEpisode({ ...brut, cibleVue: 'admin', cibleId: undefined });
  verifier('format : cible sans id → id null', sansId.cible.vue === 'admin' && sansId.cible.id === null);

  const sansCible = formaterEpisode({ ...brut, cibleVue: null });
  verifier('format : cible absente → null', sansCible.cible === null);
}

// --- estOuvert ----------------------------------------------------
{
  verifier('estOuvert : resolueLe null → ouvert', estOuvert({ resolueLe: null }) === true);
  verifier('estOuvert : resolueLe absent → ouvert', estOuvert({}) === true);
  verifier('estOuvert : résolu → fermé', estOuvert({ resolueLe: T1 }) === false);
}

// --- comparerEpisodes : récent d'abord, départage par idAlerte ----
{
  const liste = [
    { id: 'SEN-1', idAlerte: 'alr-a', apparueLe: T0 },
    { id: 'SEN-3', idAlerte: 'alr-z', apparueLe: T1 },
    { id: 'SEN-2', idAlerte: 'alr-b', apparueLe: T1 }
  ];
  const trie = [...liste].sort(comparerEpisodes);
  verifier('tri : le plus récent en tête', trie[0].apparueLe === T1);
  verifier('tri : départage déterministe par idAlerte (alr-b avant alr-z)',
    trie[0].idAlerte === 'alr-b' && trie[1].idAlerte === 'alr-z');
  verifier('tri : le plus ancien en queue', trie[2].idAlerte === 'alr-a');
  // Départage INDÉPENDANT de l'id de stockage (parité entre stores).
  const memeIdAlerte = [
    { id: 'ZZZ', idAlerte: 'alr-b', apparueLe: T1 },
    { id: 'AAA', idAlerte: 'alr-a', apparueLe: T1 }
  ];
  const trie2 = [...memeIdAlerte].sort(comparerEpisodes);
  verifier('tri : ordre piloté par idAlerte, pas par l’id de stockage',
    trie2[0].idAlerte === 'alr-a');
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
