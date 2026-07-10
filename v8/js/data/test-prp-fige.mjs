// ============================================================
// Test du PRP FIGÉ à la validation (brique ② / B7).
// Exécution : node v8/js/data/test-prp-fige.mjs [demo|local]
//
// Prouve que :
//   1. un mouvement VALIDÉ porte prpFige = gwpAr4 du fluide DU MOUVEMENT
//      au moment de la validation (même moment que cerfaNumero) ;
//   2. la contre-écriture fige AUSSI son PRP ;
//   3. le champ est HORS empreinte : la chaîne de hash reste intacte,
//      et un export→import le restitue sans « registre altéré » ;
//   4. brouillon/soumis n'en portent pas (posé seulement au scellement).
//
// Suite DOUBLÉE au lanceur (demo puis local) : la parité est prouvée en
// exécutant les mêmes assertions contre les deux stores.
// ATTENTION : ÉCRIT dans le store cible — base JETABLE en local (harnais).
// Node ≥ 18, sans DOM.
// ============================================================

const NOM_STORE = process.argv[2] ?? 'demo';

async function fabriquerStore(nom) {
  switch (nom) {
    case 'demo': {
      const { creerStore } = await import('./datastore.js');
      return creerStore();
    }
    case 'local': {
      const { creerStoreDeTest } =
        await import('../../../server/harnais-contrat.mjs');
      return creerStoreDeTest();
    }
    default:
      console.error(`Store inconnu : « ${nom} » (demo ou local).`);
      process.exit(2);
  }
}

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

const store = await fabriquerStore(NOM_STORE);
if (NOM_STORE === 'demo') await store.init();

// ---- Monde minimal : référent, machine, bouteille pleine --------
const referent = await store.createPersonne({
  nom: 'Fige', prenom: 'Référent', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
const fluides = await store.getFluides();
const fluide = fluides[0];
verifier('le référentiel porte un gwpAr4 numérique de référence',
  typeof fluide.gwpAr4 === 'number' && fluide.gwpAr4 > 0);

const machine = await store.createMachine({
  designation: 'Machine PRP figé', fluide: fluide.code,
  chargeNominaleKg: 10, operateur: 'Testeur PRP'
});
const bouteille = await store.createBouteille({
  type: 'NEUVE', fluide: fluide.code, tareKg: 10, masseBruteKg: 25,
  contenanceMaxKg: 20
});

// ---- 1. Brouillon puis soumis : PAS de PRP figé ------------------
const brouillon = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machine.id,
  bouteilleSrcId: bouteille.id, peseeAvantKg: 15, peseeApresKg: 13,
  technicien: 'Testeur PRP', causeMouvement: 'Essai PRP figé'
});
verifier('au brouillon : aucun PRP figé',
  brouillon.prpFige == null);
const soumis = await store.soumettreMouvement(brouillon.id);
verifier('à la soumission : toujours aucun PRP figé',
  soumis.prpFige == null);

// ---- 2. Validation : PRP figé = gwpAr4 du fluide du mouvement ----
const valide = await store.validerMouvement(brouillon.id, referent.id);
verifier('à la validation : prpFige = gwpAr4 courant du fluide du mouvement',
  valide.prpFige === fluide.gwpAr4,
  `prpFige = ${valide.prpFige}, attendu ${fluide.gwpAr4}`);
verifier('le mouvement validé garde son empreinte chaînée',
  typeof valide.hashEcriture === 'string' && valide.hashEcriture.length === 64);

// Relecture depuis le store (aller-retour persistance complet).
const relu = (await store.getMouvements()).find((m) => m.id === brouillon.id);
verifier('relecture : prpFige persiste à l’identique',
  relu && relu.prpFige === fluide.gwpAr4);

// ---- 3. Hors empreinte : chaîne intacte --------------------------
const chaine = await store.verifierChaineHash();
verifier('chaîne des écritures intacte avec prpFige posé (hors empreinte)',
  chaine.ok === true, `casseA = ${chaine.casseA}`);

// ---- 4. Contre-écriture : PRP figé aussi --------------------------
const contre = await store.annulerParContreEcriture(
  brouillon.id, 'Essai contre-écriture PRP', referent.id);
verifier('la contre-écriture fige AUSSI son PRP',
  contre.prpFige === fluide.gwpAr4);
verifier('chaîne toujours intacte après la contre-écriture',
  (await store.verifierChaineHash()).ok === true);

// ---- 5. Export → import : prpFige restitué, registre sain --------
const exportJson = await store.exporterJSON();
verifier('l’export JSON transporte prpFige',
  exportJson.includes('"prpFige"') || exportJson.includes('prp_fige'));
await store.importerJSON(exportJson);
const reimporte = (await store.getMouvements())
  .find((m) => m.id === brouillon.id);
verifier('après import : prpFige restitué à l’identique',
  reimporte && reimporte.prpFige === fluide.gwpAr4);
verifier('après import : registre NON altéré (le champ est bien hors empreinte)',
  (await store.verifierChaineHash()).ok === true);

// ---- 6. Échange CROISÉ démo → local (mode local seulement) --------
// La raison d'être du « hors empreinte » : un export DÉMO portant
// prpFige doit se réimporter en LOCAL sans « registre altéré », et
// réciproquement un vieil export sans la clé doit passer.
if (NOM_STORE === 'local') {
  const { creerStore } = await import('./datastore.js');
  const demo = await creerStore();
  await demo.init();
  const refDemo = await demo.createPersonne({
    nom: 'Croise', prenom: 'Référent', typePersonne: 'ENSEIGNANT',
    roleApp: 'REFERENT'
  });
  const fluidesDemo = await demo.getFluides();
  const machineDemo = await demo.createMachine({
    designation: 'Machine croisée', fluide: fluidesDemo[0].code,
    chargeNominaleKg: 10, operateur: 'Testeur'
  });
  const bouteilleDemo = await demo.createBouteille({
    type: 'NEUVE', fluide: fluidesDemo[0].code, tareKg: 10,
    masseBruteKg: 25, contenanceMaxKg: 20
  });
  const mvtDemo = await demo.creerMouvement({
    type: 'CHARGE_APPOINT', machineId: machineDemo.id,
    bouteilleSrcId: bouteilleDemo.id, peseeAvantKg: 15, peseeApresKg: 14,
    technicien: 'Testeur'
  });
  await demo.soumettreMouvement(mvtDemo.id);
  await demo.validerMouvement(mvtDemo.id, refDemo.id);

  const exportDemo = await demo.exporterJSON();
  await store.importerJSON(exportDemo);
  const importe = (await store.getMouvements())
    .find((m) => m.id === mvtDemo.id);
  verifier('croisé démo → local : prpFige restitué',
    importe && importe.prpFige === fluidesDemo[0].gwpAr4);
  verifier('croisé démo → local : registre NON altéré',
    (await store.verifierChaineHash()).ok === true);

  // Vieil export « d'avant la brique » : on retire la clé prpFige à la
  // main (comme un fichier produit par une version antérieure).
  const enveloppe = JSON.parse(exportDemo);
  for (const mv of enveloppe.donnees.mouvements) delete mv.prpFige;
  await store.importerJSON(JSON.stringify(enveloppe));
  const ancien = (await store.getMouvements())
    .find((m) => m.id === mvtDemo.id);
  verifier('vieil export sans prpFige : import accepté, champ null',
    ancien && ancien.prpFige == null);
  verifier('vieil export sans prpFige : registre NON altéré',
    (await store.verifierChaineHash()).ok === true);
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
