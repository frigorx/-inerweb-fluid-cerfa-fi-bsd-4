// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Coffre des identités — LECTURE du contrat côté DÉMO (lot C carte
// blanche, 13/08) : la 3e porte tirée par la 4e relecture externe.
//
// Le champ TEXTE `technicien` d'un mouvement FIGÉ dont le porteur est AU
// COFFRE sortait BRUT de getMouvements : la substitution ne vivait que
// dans la vue, un appel direct du contrat rendait le nom réel. Ici on
// prouve, sur le DemoStore (le serveur est prouvé par
// server/test-coffre-serveur.mjs — même règle, miroir strict) :
//   1. la LECTURE du contrat rend le PSEUDONYME (fiche vivante) ;
//   2. l'export JSON reste BRUT (le transport doit pouvoir rejouer les
//      empreintes) ;
//   3. la chaîne de hash reste INTACTE (la donnée n'a pas bougé) ;
//   4. un mouvement dont le porteur n'est PAS au coffre est inchangé.
// Exécution : node v8/js/data/test-coffre-lecture.mjs — store démo en
// mémoire, aucun accès disque.
// ============================================================

import { creerStore } from './datastore.js';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

const store = await creerStore();

// ---- Décor : un validateur, une élève, un mouvement FIGÉ porté par elle ----
const validateur = await store.createPersonne({
  nom: 'Valideur', prenom: 'LotC', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
const eleve = await store.createPersonne({
  nom: 'Bonnet', prenom: 'Léa', typePersonne: 'ELEVE', roleApp: 'ELEVE'
});
const machine = await store.createMachine({
  designation: 'Vitrine lot C (coffre)', fluide: 'R-410A',
  chargeNominaleKg: 8, chargeActuelleKg: 0, operateur: 'Testeur lot C'
});
const bouteille = await store.createBouteille({
  type: 'NEUVE', fluide: 'R-410A', etatFluide: 'VIERGE',
  tareKg: 10, masseBruteKg: 40, contenanceMaxKg: 50, proprietaire: 'Lycée'
});
const brouillon = await store.creerMouvement({
  mode: 'FORMATION', type: 'CHARGE_APPOINT', date: '2026-08-13',
  machineId: machine.id, bouteilleSrcId: bouteille.id,
  fluide: 'R-410A', peseeAvantKg: 40, peseeApresKg: 39,
  causeMouvement: 'Appoint (preuve lot C)', technicien: 'Léa Bonnet',
  executeParId: eleve.id,
  controle: { statutControle: 'SANS_OBJET', detecteurId: null }
});
await store.soumettreMouvement(brouillon.id);
await store.validerMouvement(brouillon.id, validateur.id);

// Un mouvement du SEMIS, étranger au coffre, sert de témoin d'inchangé.
const temoin = (await store.getMouvements())
  .find((mv) => mv.id !== brouillon.id && mv.technicien);

// ---- Mise au coffre (simulation Démo assumée, mêmes règles) ----
await store.desactiverPersonne(eleve.id, 'Testeur lot C');
const resultat = await store.mettreAuCoffre(
  [eleve.id], 'Phrase-Exercice-Coffre-2026!', { annee: 2026 });
const pseudonyme = resultat.misAuCoffre[0].pseudonyme;
verifier('décor : la mise à l\'abri attribue un pseudonyme',
  typeof pseudonyme === 'string' && pseudonyme.length > 0);

// ---- 1. La LECTURE du contrat rend le pseudonyme (3e porte fermée) ----
const fige = (await store.getMouvements())
  .find((mv) => mv.id === brouillon.id);
verifier('mouvement FIGÉ : getMouvements rend le PSEUDONYME, plus le nom réel',
  fige.technicien === pseudonyme,
  `technicien = ${fige.technicien}, attendu ${pseudonyme}`);

// ---- 2. L'export JSON reste BRUT (transport, empreintes rejouables) ----
const exportBrut = JSON.parse(await store.exporterJSON());
const mvExporte = exportBrut.donnees.mouvements
  .find((mv) => mv.id === brouillon.id);
verifier('exporterJSON : le transport reste BRUT (« Léa Bonnet » au bit près)',
  mvExporte.technicien === 'Léa Bonnet',
  `exporté = ${mvExporte.technicien}`);

// ---- 3. La chaîne de hash n'a pas bougé ----
const chaine = await store.verifierChaineHash();
verifier('chaîne de hash INTACTE (la substitution est un fait de lecture)',
  chaine.ok === true, JSON.stringify(chaine));

// ---- 4. Un porteur HORS coffre est inchangé ----
const temoinApres = (await store.getMouvements())
  .find((mv) => mv.id === temoin.id);
verifier('mouvement d\'un porteur HORS coffre : champ technicien inchangé',
  temoinApres.technicien === temoin.technicien,
  `${temoinApres.technicien} vs ${temoin.technicien}`);

// ============================================================
// Verdict
// ============================================================
console.log('');
console.log(`${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Coffre — lecture du contrat (lot C) : tout est vert.');
