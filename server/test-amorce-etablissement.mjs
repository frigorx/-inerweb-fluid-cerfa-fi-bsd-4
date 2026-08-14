// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — PREUVE de l'amorçage GÉNÉRALISÉ de l'établissement
// (Séance 0, revue 10/07 : ~14 insertions posaient etablissement_id
// mais seules 5 amorçaient → échec FK possible sur base fraîche).
// Exécution : node server/test-amorce-etablissement.mjs
//
// Chaque cas tourne sur une base SQLite JETABLE NEUVE (mkdtemp) et
// écrit SANS avoir appelé init() ni updateEtablissement() : avant le
// correctif (amorce automatique dans inserer() + upserts inventaire),
// ces écritures échouaient en FOREIGN KEY sur etablissement_id.
// Node ≥ 22, sans DOM, jamais le data/ réel.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const api = require('./api.js');

import { creerLocalStore } from '../v8/js/data/local-store.js';

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

/**
 * Store local sur base jetable NEUVE, VOLONTAIREMENT sans store.init()
 * (c'est init qui amorçait l'établissement : on veut la base nue).
 */
function storeFrais() {
  if (db.estOuverte()) db.fermer();
  const dossier = mkdtempSync(join(tmpdir(), 'inerweb-fluide-amorce-'));
  db.ouvrir(join(dossier, 'test.db'));
  const contexte = { role: 'REFERENT' };
  const transport = async (methode, params) => {
    const resultat = api.appeler(
      methode, JSON.parse(JSON.stringify(params ?? {})), contexte);
    return JSON.parse(JSON.stringify({ resultat })).resultat;
  };
  return creerLocalStore(transport);
}

/** L'établissement singleton existe-t-il physiquement en base ? */
function etablissementEnBase() {
  return db.get('SELECT * FROM etablissements LIMIT 1') ?? null;
}

// ------------------------------------------------------------
// Cas 1 — createClient sur base nue (n'amorçait PAS avant).
// ------------------------------------------------------------
{
  const store = storeFrais();
  verifier('base nue : aucun établissement avant écriture',
    etablissementEnBase() === null);
  const client = await store.createClient({
    raisonSociale: 'Client base fraîche', adresse: '1 rue du Test'
  });
  verifier('createClient passe sur base nue (plus d’échec FK)',
    Boolean(client && client.id));
  const etab = etablissementEnBase();
  verifier('createClient a amorcé l’établissement singleton VIDE',
    etab !== null && etab.raison_sociale === '');
}

// ------------------------------------------------------------
// Cas 2 — createOutil sur base nue (n'amorçait PAS avant).
// ------------------------------------------------------------
{
  const store = storeFrais();
  const outil = await store.createOutil({
    typeOutil: 'DETECTEUR', marque: 'Inficon', modele: 'D-TEK',
    prochaineEcheance: '2030-01-01'
  });
  verifier('createOutil passe sur base nue', Boolean(outil && outil.id));
  verifier('createOutil a amorcé l’établissement',
    etablissementEnBase() !== null);
}

// ------------------------------------------------------------
// Cas 3 — createMachine sur base nue (n'amorçait PAS avant).
// ------------------------------------------------------------
{
  const store = storeFrais();
  const fluides = await store.getFluides();
  const machine = await store.createMachine({
    designation: 'Machine base fraîche', fluide: fluides[0].code,
    chargeNominaleKg: 5, operateur: 'Testeur Amorce'
  });
  verifier('createMachine passe sur base nue', Boolean(machine && machine.id));
  verifier('createMachine a amorcé l’établissement',
    etablissementEnBase() !== null);
}

// ------------------------------------------------------------
// Cas 4 — createBouteille sur base nue (n'amorçait PAS avant).
// ------------------------------------------------------------
{
  const store = storeFrais();
  const fluides = await store.getFluides();
  const bouteille = await store.createBouteille({
    type: 'NEUVE', fluide: fluides[0].code, tareKg: 10,
    masseBruteKg: 20, contenanceMaxKg: 12
  });
  verifier('createBouteille passe sur base nue',
    Boolean(bouteille && bouteille.id));
  verifier('createBouteille a amorcé l’établissement',
    etablissementEnBase() !== null);
}

// ------------------------------------------------------------
// Cas 5 — saisirInventaire sur base nue (SQL direct hors inserer(),
// couvert par l'amorce ajoutée dans upsertInventaire).
// ------------------------------------------------------------
{
  const store = storeFrais();
  const fluides = await store.getFluides();
  await store.saisirInventaire(2026,
    [{ fluide: fluides[0].code, stockReelKg: 0 }], 'Testeur Amorce');
  verifier('saisirInventaire passe sur base nue',
    etablissementEnBase() !== null);
}

// ------------------------------------------------------------
// Cas 6 — l'amorce reste IDEMPOTENTE : une écriture après init()
// ne crée pas de deuxième ligne ni n'écrase le dossier saisi.
// ------------------------------------------------------------
{
  const store = storeFrais();
  await store.init();
  await store.updateEtablissement({ raisonSociale: 'Lycée du Test' });
  await store.createClient({ raisonSociale: 'Après init', adresse: 'X' });
  const lignes = db.all('SELECT * FROM etablissements');
  verifier('après init + saisie : toujours UNE seule ligne établissement',
    lignes.length === 1);
  verifier('l’amorce n’écrase pas le dossier saisi',
    lignes[0].raison_sociale === 'Lycée du Test');
}

if (db.estOuverte()) db.fermer();

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
