// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// LOT B2 — REMISE EN FILIÈRE DÉCHETS, DOUBLÉE demo/local.
//
// B2-2 « LE NUMÉRO RÉEL A SA PLACE » : le numéro du bordereau
// dématérialisé OFFICIEL est un champ à part (`bordereauExterne`,
// porté par la colonne lien_trackdechets du socle v1 — aucune
// migration), jamais confondu avec le numéro du SUIVI INTERNE.
// Il survit à l'export/import et n'entre au cadre 11 du CERFA que
// s'il a été réellement reporté (jamais le numéro interne).
//
// Exécution : node v8/js/data/test-remise-filiere.mjs [demo|local]
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

const store = await fabriquerStore(NOM_STORE);
if (store.init) await store.init();
console.log(`\n=== Remise en filière déchets — store « ${NOM_STORE} » ===\n`);

/** Prépare une bouteille de récupération déclarée DÉCHET. */
async function bouteilleDechet(masseKg) {
  const b = await store.createBouteille({
    type: 'RECUPERATION', fluide: 'R-410A', etatFluide: 'RECUPERE',
    tareKg: 10, masseBruteKg: 10 + masseKg, contenanceMaxKg: 50,
    proprietaire: 'Lycée'
  });
  await store.deciderFluideRecupere(b.id, 'DECHET', 'testeur');
  return (await store.getBouteilles()).find((x) => x.id === b.id);
}

// ============================================================
// A. Le numéro du bordereau OFFICIEL est enregistré à part
// ============================================================
{
  const b = await bouteilleDechet(6);
  const suivi = await store.createBsff({
    bouteilleId: b.id, numeroBsff: 'SI-B2-001',
    bordereauExterne: '  FF-2026-000123  ',
    transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 6, dateRemise: '2026-07-24', operateur: 'testeur'
  });
  verifier('le numéro du bordereau officiel est conservé, espaces retirés',
    suivi.bordereauExterne === 'FF-2026-000123', String(suivi.bordereauExterne));
  verifier('il ne se confond pas avec le numéro du suivi interne',
    suivi.numeroBsff === 'SI-B2-001'
    && suivi.numeroBsff !== suivi.bordereauExterne);

  const relu = (await store.getBsff()).find((x) => x.id === suivi.id);
  verifier('relu depuis le magasin : les deux numéros sont là',
    relu.numeroBsff === 'SI-B2-001'
    && relu.bordereauExterne === 'FF-2026-000123');
}

// ============================================================
// B. Bordereau non encore établi : absence ENREGISTRÉE, pas devinée
// ============================================================
{
  const b = await bouteilleDechet(4);
  const suivi = await store.createBsff({
    bouteilleId: b.id, numeroBsff: 'SI-B2-002',
    transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 4, dateRemise: '2026-07-24', operateur: 'testeur'
  });
  verifier('bordereau non reporté → null (jamais le numéro interne recopié)',
    suivi.bordereauExterne === null, String(suivi.bordereauExterne));
  const vide = await store.createBsff({
    bouteilleId: (await bouteilleDechet(2)).id, numeroBsff: 'SI-B2-003',
    bordereauExterne: '   ', transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 2, dateRemise: '2026-07-24', operateur: 'testeur'
  });
  verifier('chaîne d’espaces → null (une saisie vide ne vaut pas un numéro)',
    vide.bordereauExterne === null, String(vide.bordereauExterne));
}

// ============================================================
// C. Le numéro officiel survit à l'export → import
// ============================================================
{
  const cible = await fabriquerStore(NOM_STORE);
  if (cible.init) await cible.init();
  const ok = await cible.importerJSON(await store.exporterJSON());
  verifier('import du registre exporté : accepté', ok !== false);
  const relus = await cible.getBsff();
  verifier('après import : le numéro du bordereau officiel a voyagé',
    relus.some((x) => x.numeroBsff === 'SI-B2-001'
      && x.bordereauExterne === 'FF-2026-000123'),
    JSON.stringify(relus.map((x) => [x.numeroBsff, x.bordereauExterne])));
}

// ============================================================
// D. Le CERFA officiel (cadre 11) ne reçoit QUE le bordereau réel
// ============================================================
{
  const { calculerChampsCerfa } = await import('../cerfa/generateur.js');
  const referent = await store.createPersonne({
    nom: 'Filiere', prenom: 'Référent', typePersonne: 'ENSEIGNANT',
    roleApp: 'REFERENT'
  });
  const machine = await store.createMachine({
    designation: 'Vitrine B2', fluide: 'R-410A', chargeNominaleKg: 10,
    chargeActuelleKg: 10, operateur: 'testeur'
  });
  const bidon = await store.createBouteille({
    type: 'RECUPERATION', fluide: 'R-410A', etatFluide: 'RECUPERE',
    tareKg: 10, masseBruteKg: 10, contenanceMaxKg: 50
  });
  const mvt = await store.creerMouvement({
    type: 'RECUPERATION_MAINTENANCE', machineId: machine.id,
    bouteilleDstId: bidon.id, peseeAvantKg: 10, peseeApresKg: 13,
    technicien: 'Testeur B2', causeMouvement: 'Essai remise en filière'
  });
  await store.soumettreMouvement(mvt.id);
  await store.validerMouvement(mvt.id, referent.id);
  await store.deciderFluideRecupere(bidon.id, 'DECHET', 'testeur');

  const sans = await calculerChampsCerfa(store,
    { source: 'mouvement', id: mvt.id });
  verifier('cadre 11 vide tant qu’aucun bordereau officiel n’existe',
    sans.texte['11_BSFF'] === '', String(sans.texte['11_BSFF']));

  await store.createBsff({
    bouteilleId: bidon.id, numeroBsff: 'SI-B2-CERFA',
    transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 1, dateRemise: '2026-07-24', operateur: 'testeur'
  });
  const interne = await calculerChampsCerfa(store,
    { source: 'mouvement', id: mvt.id });
  verifier('un suivi INTERNE seul ne remplit PAS le cadre 11 du CERFA',
    interne.texte['11_BSFF'] === '', String(interne.texte['11_BSFF']));

  await store.createBsff({
    bouteilleId: bidon.id, numeroBsff: 'SI-B2-CERFA-2',
    bordereauExterne: 'FF-2026-000999',
    transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 1, dateRemise: '2026-07-25', operateur: 'testeur'
  });
  const avec = await calculerChampsCerfa(store,
    { source: 'mouvement', id: mvt.id });
  verifier('le cadre 11 porte le numéro du bordereau OFFICIEL reporté',
    avec.texte['11_BSFF'] === 'FF-2026-000999', String(avec.texte['11_BSFF']));
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
