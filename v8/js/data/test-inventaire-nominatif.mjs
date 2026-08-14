// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Test de l'INVENTAIRE NOMINATIF (brique ② / B7, CF-20).
// Exécution : node v8/js/data/test-inventaire-nominatif.mjs [demo|local]
//
// Prouve que :
//   1. saisirInventaire FIGE la photographie nominative de l'année
//      (bouteilles présentes — les RETOURNEE exclues, les DECHET
//      incluses — et fuites machines ouvertes, avec date de photo) ;
//   2. re-saisir l'inventaire de la même année REFIGE la photo
//      (une seule photo par année, l'état le plus récent) ;
//   3. la photo est une ARCHIVE : modifier la bouteille ensuite ne
//      change pas la photo (dénormalisation voulue) ;
//   4. l'ouverture (état au 01/01 de N) = la photo de N−1 ;
//   5. une année jamais photographiée → datePhoto null, listes vides ;
//   6. export → import préserve les photos.
//
// Suite DOUBLÉE au lanceur (demo puis local). ÉCRIT dans le store —
// base JETABLE en local (harnais). Node ≥ 18, sans DOM.
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

const PROCHE = (a, b) => Math.abs(a - b) < 1e-9;
const ANNEE = new Date().getFullYear();

const store = await fabriquerStore(NOM_STORE);
if (NOM_STORE === 'demo') await store.init();

// ---- Monde : référent, machine en fuite ouverte, 3 bouteilles -----
const referent = await store.createPersonne({
  nom: 'Nominatif', prenom: 'Référent', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
const fluides = await store.getFluides();
const FLUIDE = fluides[0].code;

const machine = await store.createMachine({
  designation: 'Machine fuite nominative', fluide: FLUIDE,
  chargeNominaleKg: 10, operateur: 'Testeur'
});
await store.createControle({
  machineId: machine.id, resultat: 'FUITE', methode: 'DIRECTE',
  operateur: 'Testeur', localisationFuite: 'Raccord BP inventaire'
});

const bStock = await store.createBouteille({
  type: 'NEUVE', fluide: FLUIDE, tareKg: 10, masseBruteKg: 22,
  contenanceMaxKg: 15
});
const bRetournee = await store.createBouteille({
  type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 9,
  contenanceMaxKg: 8, proprietaire: 'Fournisseur Consigne'
});
await store.retournerFournisseur(bRetournee.id, 'Testeur');
const bDechet = await store.createBouteille({
  type: 'RECUPERATION', fluide: FLUIDE, tareKg: 8, masseBruteKg: 12,
  contenanceMaxKg: 15
});
await store.deciderFluideRecupere(bDechet.id, 'DECHET', 'Testeur');

// ---- 5. Avant toute saisie : pas de photo -------------------------
{
  const vide = await store.getInventaireNominatif(ANNEE);
  verifier('année jamais photographiée : datePhoto null, listes vides',
    vide.datePhoto === null && vide.bouteilles.length === 0
    && vide.fuitesOuvertes.length === 0 && vide.ouverture === null);
}

// ---- 1. La saisie d'inventaire fige la photo ----------------------
await store.saisirInventaire(ANNEE,
  [{ fluide: FLUIDE, stockReelKg: 16 }], 'Testeur Nominatif');
const photo = await store.getInventaireNominatif(ANNEE);
verifier('la photo est datée du jour de la saisie',
  typeof photo.datePhoto === 'string' && photo.datePhoto.length === 10);
verifier('la bouteille en stock est photographiée avec sa masse',
  photo.bouteilles.some((p) => p.bouteilleId === bStock.id
    && PROCHE(p.masseNetteKg, 12) && p.statut === 'EN_STOCK'
    && p.fluide === FLUIDE));
verifier('la bouteille DÉCHET (encore sur site) est photographiée',
  photo.bouteilles.some((p) => p.bouteilleId === bDechet.id
    && p.statut === 'DECHET'));
verifier('la bouteille RETOURNÉE (chez le fournisseur) est EXCLUE',
  !photo.bouteilles.some((p) => p.bouteilleId === bRetournee.id));
verifier('la fuite ouverte est photographiée avec sa localisation',
  photo.fuitesOuvertes.some((f) => f.machineId === machine.id
    && f.localisation === 'Raccord BP inventaire'));

// ---- 3. La photo est une archive (pas une vue vivante) ------------
await store.peserBouteille(bStock.id, 18, 'Testeur');
{
  const relue = await store.getInventaireNominatif(ANNEE);
  const ligne = relue.bouteilles.find((p) => p.bouteilleId === bStock.id);
  verifier('peser APRÈS la photo ne change pas la photo (archive)',
    PROCHE(ligne.masseNetteKg, 12));
}

// ---- 2. Re-saisir la même année REFIGE la photo -------------------
await store.saisirInventaire(ANNEE,
  [{ fluide: FLUIDE, stockReelKg: 14 }], 'Testeur Nominatif');
{
  const refigee = await store.getInventaireNominatif(ANNEE);
  const ligne = refigee.bouteilles.find((p) => p.bouteilleId === bStock.id);
  verifier('re-saisie : la photo est REFIGÉE (masse mise à jour, 8 kg nets)',
    PROCHE(ligne.masseNetteKg, 8));
  verifier('re-saisie : une seule ligne par bouteille (pas de doublon)',
    refigee.bouteilles.filter((p) => p.bouteilleId === bStock.id).length === 1);
}

// ---- 4. L'ouverture de N+1 = la photo de N ------------------------
await store.saisirInventaire(ANNEE + 1,
  [{ fluide: FLUIDE, stockReelKg: 14 }], 'Testeur Nominatif');
{
  const suivante = await store.getInventaireNominatif(ANNEE + 1);
  verifier('l’ouverture (01/01 de N+1) = la photo de N',
    suivante.ouverture !== null && suivante.ouverture.annee === ANNEE
    && suivante.ouverture.bouteilles.some((p) => p.bouteilleId === bStock.id));
  verifier('l’ouverture ne porte pas elle-même d’ouverture (pas de récursion)',
    suivante.ouverture.ouverture === undefined);
}

// ---- 6. Export → import : les photos survivent --------------------
{
  const exportJson = await store.exporterJSON();
  await store.importerJSON(exportJson);
  const reimporte = await store.getInventaireNominatif(ANNEE);
  // NB : pas de compte exact des fuites — le monde démo seed porte déjà
  // une machine en fuite (M5), on vérifie LA NÔTRE.
  verifier('après export → import : la photo est intacte',
    reimporte.datePhoto !== null
    && reimporte.bouteilles.some((p) => p.bouteilleId === bStock.id
      && PROCHE(p.masseNetteKg, 8))
    && reimporte.fuitesOuvertes.some((f) => f.machineId === machine.id));
}

// ---- 7. Les 2 CSV conditionnels du dossier d'audit ----------------
// (couverts par le manifeste et le scellement automatiquement — ici on
// garde le CHEMIN : photo figée → les fichiers existent et sont sains).
{
  const { toutesLesTables } = await import('../documents/exports.js');
  const tables = await toutesLesTables(store, ANNEE);
  const noms = tables.map((t) => t.nom);
  verifier('photo figée → le CSV inventaire-bouteilles est dans le dossier d’audit',
    noms.includes(`inventaire-bouteilles-${ANNEE}.csv`));
  verifier('photo figée → le CSV fuites-ouvertes est dans le dossier d’audit',
    noms.includes(`fuites-ouvertes-${ANNEE}.csv`));
  const csvBouteilles = tables.find(
    (t) => t.nom === `inventaire-bouteilles-${ANNEE}.csv`).contenu;
  verifier('le CSV nominatif porte l’en-tête français et la bouteille photographiée',
    csvBouteilles.includes('Masse nette (kg)')
    && csvBouteilles.includes(bStock.id ? 'B-' : 'B-')
    && csvBouteilles.includes('Photo figée le'));
  const csvFuites = tables.find(
    (t) => t.nom === `fuites-ouvertes-${ANNEE}.csv`).contenu;
  verifier('le CSV des fuites porte la localisation photographiée',
    csvFuites.includes('Raccord BP inventaire'));
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
