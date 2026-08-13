// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Lot F carte blanche (13/08/2026) — LA PORTÉE DE CAPACITÉ DE
// L'ÉTABLISSEMENT EST LUE (4e relecture externe, blocage n° 1, tiré).
//
// Avant ce lot : `categoriesAutorisees` / `activitesAutorisees` étaient
// saisies, validées en forme, stockées, affichées — et lues par AUCUNE
// règle. Une récupération de 8 kg sur une machine de 50 kg devenait une
// fiche OFFICIELLE scellée sur un établissement déclaré « catégorie II,
// contrôle d'étanchéité seul » (`simulerValidationOfficielle` répondait
// {"ok":true,"blocages":[]}, verrou désarmé en bac à sable).
//
// Ce que cette suite prouve (condition 19, DOUBLÉE demo/local) :
//   1. activité non déclarée → blocage CAPACITE_ETABLISSEMENT motivé ;
//   2. catégorie qui ne couvre pas la charge (matrice d'aptitude, la
//      MÊME grille que la personne) → blocage motivé ;
//   3. portée VIDE → blocage (« le doute retire l'allègement ») ;
//   4. portée couvrante → AUCUN sur-blocage ;
//   5. la grille de saisie accepte les DEUX régimes (A1 passe, IX non) ;
//   6. l'import JSON REFUSE une portée forgée (troisième porte fermée).
// Exécution : node v8/js/data/test-capacite-etablissement.mjs [demo|local]
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
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

const store = await fabriquerStore(NOM_STORE);
if (store.init) await store.init();
console.log(`\n— Capacité de l'établissement, store « ${NOM_STORE} » —`);

// ---- Décor : un brouillon CHARGE_APPOINT sur une machine de 50 kg ----
const validateur = await store.createPersonne({
  nom: 'Valideur', prenom: 'LotF', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
const machine = await store.createMachine({
  designation: 'Groupe lot F (50 kg)', fluide: 'R-410A',
  chargeNominaleKg: 50, chargeActuelleKg: 42, operateur: 'Testeur lot F'
});
const bouteille = await store.createBouteille({
  type: 'NEUVE', fluide: 'R-410A', etatFluide: 'VIERGE',
  tareKg: 10, masseBruteKg: 40, contenanceMaxKg: 50, proprietaire: 'Lycée'
});
const brouillon = await store.creerMouvement({
  mode: 'FORMATION', type: 'CHARGE_APPOINT', date: '2026-08-13',
  machineId: machine.id, bouteilleSrcId: bouteille.id,
  fluide: 'R-410A', peseeAvantKg: 40, peseeApresKg: 38,
  causeMouvement: 'Appoint (preuve lot F)', technicien: 'Testeur lot F',
  executeParId: validateur.id,
  controle: { statutControle: 'SANS_OBJET', detecteurId: null }
});

const blocagesCapacite = async () => {
  const simu = await store.simulerValidationOfficielle(brouillon.id);
  return (simu.blocages ?? [])
    .filter((b) => b.code === 'CAPACITE_ETABLISSEMENT');
};

// ---- 1. Activité non déclarée : le scénario EXACT du constat ----
await store.updateEtablissement({
  raisonSociale: 'Lycée d’essai lot F',
  numAttestationCapacite: 'AC-13-TEST-19',
  categoriesAutorisees: ['II'],
  activitesAutorisees: ['CONTROLE']
});
{
  const blocages = await blocagesCapacite();
  verifier('⭐ « catégorie II, contrôle seul » : la CHARGE D’APPOINT est bloquée',
    blocages.length === 1, JSON.stringify(blocages));
  verifier('… le motif nomme l’activité manquante',
    blocages[0]?.motif.includes('MAINTENANCE'),
    blocages[0]?.motif);
}

// ---- 2. Activité déclarée mais catégorie qui ne couvre pas 50 kg ----
await store.updateEtablissement({
  categoriesAutorisees: ['II'],
  activitesAutorisees: ['MAINTENANCE', 'CONTROLE']
});
{
  const blocages = await blocagesCapacite();
  verifier('⭐ catégorie II sur 50 kg : bloquée par la MÊME matrice que l’aptitude',
    blocages.length === 1, JSON.stringify(blocages));
}

// ---- 3. Portée VIDE : rien n'est autorisé ----
await store.updateEtablissement({
  categoriesAutorisees: [], activitesAutorisees: []
});
{
  const blocages = await blocagesCapacite();
  verifier('⭐ portée VIDE (attestation déclarée) : bloquée — le doute '
    + 'retire l’allègement, jamais l’obligation',
  blocages.length === 1
    && blocages[0].motif.includes('aucune catégorie'),
  JSON.stringify(blocages));
}

// ---- 4. Portée couvrante : AUCUN sur-blocage ----
await store.updateEtablissement({
  categoriesAutorisees: ['I'],
  activitesAutorisees: ['MISE_EN_SERVICE', 'MAINTENANCE', 'CONTROLE',
    'RECUPERATION', 'DEMANTELEMENT']
});
{
  const blocages = await blocagesCapacite();
  verifier('portée couvrante (catégorie I, toutes activités) : aucun blocage '
    + 'de capacité (pas de sur-blocage)',
  blocages.length === 0, JSON.stringify(blocages));
}

// ---- 5. La grille de saisie accepte les DEUX régimes ----
{
  const etab2025 = await store.updateEtablissement(
    { categoriesAutorisees: ['A1'] });
  verifier('régime 2025 (A1) désormais ENREGISTRABLE pour l’établissement',
    (etab2025.categoriesAutorisees ?? []).includes('A1'));
  let rejet = null;
  try {
    await store.updateEtablissement({ categoriesAutorisees: ['IX'] });
  } catch (erreur) { rejet = erreur; }
  verifier('catégorie réellement inconnue (IX) toujours refusée',
    rejet !== null && String(rejet.message).includes('inconnue'),
    rejet ? rejet.message : 'aucune erreur levée');
  await store.updateEtablissement({ categoriesAutorisees: ['I'] });
}

// ---- 6. L'import JSON refuse une portée forgée (troisième porte) ----
{
  const paquet = JSON.parse(await store.exporterJSON());
  paquet.donnees.etablissement.categoriesAutorisees = ['IX'];
  let refuse = false;
  try {
    const adopte = await store.importerJSON(JSON.stringify(paquet));
    refuse = adopte === false;
  } catch { refuse = true; }
  verifier('⭐ import d’une portée FORGÉE (catégorie IX) : REFUSÉ',
    refuse);
  const etabApres = await store.getEtablissement();
  verifier('… et la portée en place n’a pas bougé',
    (etabApres.categoriesAutorisees ?? []).includes('I')
    && !(etabApres.categoriesAutorisees ?? []).includes('IX'),
    JSON.stringify(etabApres.categoriesAutorisees));
}

// ============================================================
// Verdict
// ============================================================
console.log('');
console.log(`${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log(`Capacité de l'établissement (« ${NOM_STORE} ») : tout est vert.`);
