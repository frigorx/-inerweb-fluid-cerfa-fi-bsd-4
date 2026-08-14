// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// PREUVE du correctif verification.js (brique ②) : la re-vérification
// d'une base/sauvegarde contenant un mouvement FUITE avec LOCALISATION
// déclarée ne doit PAS répondre « chaîne registre rompue ».
// Exécution : node server/test-verification-fuite.mjs
//
// Bug corrigé : verification.js:reconstituerMouvement omettait la clé
// controle.localisationFuite (présente dans api.js et hachée au
// scellement) — JSON.stringify étant sensible à la présence des clés,
// l'empreinte recalculée divergeait et toute sauvegarde d'une base
// avec fuite localisée était jugée corrompue À TORT.
// Base JETABLE (harnais contrat), jamais le data/ réel. Node ≥ 22.
// ============================================================

import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const verification = require('./verification.js');

import { creerStoreDeTest } from './harnais-contrat.mjs';

let nbOk = 0;
let nbEchecs = 0;

function verifier(libelle, condition, detail = '') {
  if (condition) {
    nbOk += 1;
    console.log(`  OK  ${libelle}`);
  } else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

// ---- Monde : un mouvement FUITE avec localisation, validé --------
const store = await creerStoreDeTest();
const referent = await store.createPersonne({
  nom: 'Fuite', prenom: 'Référent', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
const fluides = await store.getFluides();
const machine = await store.createMachine({
  designation: 'Machine fuite localisée', fluide: fluides[0].code,
  chargeNominaleKg: 10, operateur: 'Testeur'
});
const bouteille = await store.createBouteille({
  type: 'NEUVE', fluide: fluides[0].code, tareKg: 10, masseBruteKg: 25,
  contenanceMaxKg: 20
});
const mvt = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machine.id,
  bouteilleSrcId: bouteille.id, peseeAvantKg: 15, peseeApresKg: 14,
  technicien: 'Testeur',
  controle: { statutControle: 'FUITE', detecteurId: null,
    localisationFuite: 'Raccord HP compresseur' }
});
await store.soumettreMouvement(mvt.id);
const valide = await store.validerMouvement(mvt.id, referent.id);
verifier('le mouvement FUITE localisé est validé et scellé',
  valide.statut === 'VALIDE' && valide.controle?.localisationFuite
    === 'Raccord HP compresseur');

// La base vivante se vérifie déjà (api.js, référence : jamais cassée).
verifier('api.js : chaîne intacte sur la base vivante',
  (await store.verifierChaineHash()).ok === true);

// ---- Le chemin des SAUVEGARDES : verification.js sur l'instance ----
// (deuxième connexion lecture seule sur le même fichier — c'est ce que
// fait la vérification d'une archive extraite).
const instance = new DatabaseSync(db.cheminOuvert(), { readOnly: true });
const resultat = verification.verifierChaineMouvements(instance);
verifier('verification.js : la chaîne d’une base avec FUITE LOCALISÉE est reconnue intacte',
  resultat.ok === true, `casseA = ${resultat.casseA}`);
instance.close();

if (db.estOuverte()) db.fermer();

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
