// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// REGISTRE DES PLAINTES (report v7) — CRUD + gardes, DOUBLÉ demo/local.
// Prouve à l'identique sur les deux stores : création (numéro auto, état
// par défaut), garde de format (objet/date obligatoires, état/dates
// valides), client introuvable refusé, modification partielle, tri, et
// survie à l'export → import round-trip. Base JETABLE en local (harnais).
// ============================================================

const NOM_STORE = process.argv[2] ?? 'demo';

async function fabriquerStore(nom) {
  switch (nom) {
    case 'demo': {
      const { creerStore } = await import('./datastore.js');
      return await creerStore();
    }
    case 'local': {
      const { creerStoreDeTest } =
        await import('../../../server/harnais-contrat.mjs');
      return await creerStoreDeTest();
    }
    default:
      console.error(`Store inconnu : « ${nom} » (demo ou local).`);
      process.exit(2);
  }
}

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}
async function verifierRejet(libelle, promesse, extrait) {
  try { await promesse; nbEchecs += 1; console.error(`ÉCHEC ${libelle} — aucune Error`); }
  catch (e) {
    const ok = !extrait || String(e.message).includes(extrait);
    if (ok) { nbOk += 1; console.log(`  OK  ${libelle}`); }
    else { nbEchecs += 1; console.error(`ÉCHEC ${libelle} — message : « ${e.message} »`); }
  }
}

const store = await fabriquerStore(NOM_STORE);
if (store.init) await store.init();
console.log(`\n=== Registre des plaintes — store « ${NOM_STORE} » ===\n`);

const client = await store.createClient({
  raisonSociale: 'Boulangerie Test', adresse: '1 rue du Test, 13001 Marseille'
});

// --- Création : numéro auto « PL-AAAA-NNNN », état par défaut RECUE -
// (Robuste au semis démo : on ne présume pas un registre vide — on vérifie
// le FORMAT et l'INCRÉMENT, pas une valeur absolue.)
const p1 = await store.createPlainte({
  objet: 'Température instable après intervention.',
  dateReception: '2026-07-10', clientId: client.id, operateur: 'testeur'
});
verifier('création : numéro auto « PL-2026-NNNN », état RECUE par défaut',
  /^PL-2026-\d{4}$/.test(p1.numero) && p1.etat === 'RECUE'
  && p1.clientId === client.id);
verifier('création : réponse et date de réponse à null',
  p1.reponse === null && p1.dateReponse === null);

const rang1 = Number(p1.numero.slice(-4));
const p2 = await store.createPlainte({
  objet: 'Bruit anormal signalé.', dateReception: '2026-07-12',
  clientLibelle: 'Un particulier', operateur: 'testeur'
});
verifier('2e plainte : numéro incrémenté (rang + 1, même année)',
  p2.numero === `PL-2026-${String(rang1 + 1).padStart(4, '0')}`);
verifier('plaignant hors registre : clientLibelle conservé, clientId null',
  p2.clientLibelle === 'Un particulier' && p2.clientId === null);

// --- Gardes de format ----------------------------------------------
await verifierRejet('objet vide refusé',
  store.createPlainte({ objet: '  ', dateReception: '2026-07-10' }),
  'Objet de la plainte obligatoire');
await verifierRejet('date de réception absente refusée',
  store.createPlainte({ objet: 'X' }),
  'Date de réception obligatoire');
await verifierRejet('date de réception mal formée refusée',
  store.createPlainte({ objet: 'X', dateReception: '10/07/2026' }),
  'Date de réception obligatoire');
await verifierRejet('état inconnu refusé',
  store.createPlainte({ objet: 'X', dateReception: '2026-07-10', etat: 'CLOSE' }),
  'État de plainte inconnu');
await verifierRejet('date de réponse invalide refusée',
  store.createPlainte({ objet: 'X', dateReception: '2026-07-10',
    dateReponse: 'bientôt' }), 'Date de réponse invalide');
await verifierRejet('client introuvable refusé',
  store.createPlainte({ objet: 'X', dateReception: '2026-07-10',
    clientId: 'cli-fantome' }), 'Client / détenteur introuvable');

// --- Modification partielle (clôture avec réponse) -----------------
const p1maj = await store.updatePlainte(p1.id, {
  etat: 'TRAITEE', reponse: 'Détendeur repris, contrôle conforme.',
  dateReponse: '2026-07-18', operateur: 'testeur'
});
verifier('update : état → TRAITEE, réponse et date posées',
  p1maj.etat === 'TRAITEE' && /Détendeur/.test(p1maj.reponse)
  && p1maj.dateReponse === '2026-07-18');
verifier('update : les champs non touchés sont conservés (objet, numéro, client)',
  p1maj.objet === p1.objet && p1maj.numero === p1.numero
  && p1maj.clientId === client.id);
await verifierRejet('update : état inconnu refusé',
  store.updatePlainte(p1.id, { etat: 'ARCHIVEE' }), 'État de plainte inconnu');
await verifierRejet('update : plainte introuvable refusée',
  store.updatePlainte('plt-fantome', { etat: 'TRAITEE' }), 'Plainte introuvable');

// --- Lecture : tri date de réception décroissante ------------------
{
  const liste = await store.getPlaintes();
  const mesPlaintesTest = liste.filter((p) => p.numero.startsWith('PL-2026-000'));
  verifier('getPlaintes : les deux plaintes présentes, la plus récente en tête',
    mesPlaintesTest.length >= 2
    && liste.findIndex((p) => p.id === p2.id) < liste.findIndex((p) => p.id === p1.id));
}

// --- Round-trip export → import : le registre survit ---------------
{
  const cible = await fabriquerStore(NOM_STORE);
  if (cible.init) await cible.init();
  const ok = await cible.importerJSON(await store.exporterJSON());
  verifier('import du registre exporté : accepté', ok !== false);
  const relues = await cible.getPlaintes();
  verifier('après import : les plaintes ont voyagé (numéro, état, objet)',
    relues.some((p) => p.numero === p1.numero && p.etat === 'TRAITEE'
      && p.objet === p1.objet)
    && relues.some((p) => p.numero === p2.numero
      && p.clientLibelle === 'Un particulier'));
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
