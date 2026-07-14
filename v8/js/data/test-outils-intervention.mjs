// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// Suite CONTRACTUELLE des outils d'intervention (brique produit n°2) —
// doublée demo + local via outils/lancer-tests.mjs. Prouve, à l'identique
// sur les deux stores : déclaration au brouillon (dédup, existence),
// lecture résolue getOutilsMouvement, FIGEAGE du statut/échéance à la
// validation (opposable : l'état de l'outil CE jour-là, insensible aux
// évolutions ultérieures), nettoyage à la suppression d'un brouillon,
// contre-écriture sans effet sur les liens, round-trip export/import et
// invariants d'import (lien orphelin, couple en double → refus).

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

async function attendreErreur(libelle, promesse, motif) {
  try {
    await promesse;
    verifier(libelle, false, 'aucune erreur levée');
  } catch (e) {
    verifier(libelle, motif.test(e.message), `message : ${e.message}`);
  }
}

/** Date locale AAAA-MM-JJ décalée de n jours. */
function dateRelative(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

console.log(`— Store ${NOM_STORE} —`);
const store = await fabriquerStore(NOM_STORE);

// ------------------------------------------------------------
// Fixture : validateur, machine, bouteille, deux outils
// ------------------------------------------------------------
const fluide = (await store.getFluides())[0].code;
const enseignant = await store.createPersonne({
  nom: 'Outils', prenom: 'Valideur', typePersonne: 'ENSEIGNANT'
});
const machine = await store.createMachine({
  designation: 'Machine outils multiples', fluide, chargeNominaleKg: 10
});
const bouteille = await store.createBouteille({
  type: 'NEUVE', fluide, tareKg: 10, masseBruteKg: 20, contenanceMaxKg: 12
});
const balance = await store.createOutil({
  typeOutil: 'BALANCE', marque: 'Sauter', modele: 'FK-50',
  prochaineEcheance: dateRelative(120)
});
const detecteur = await store.createOutil({
  typeOutil: 'DETECTEUR', marque: 'Inficon', modele: 'D-TEK',
  prochaineEcheance: dateRelative(-1)
});
verifier('fixture : balance CONFORME, détecteur EXPIRE',
  balance.statut === 'CONFORME' && detecteur.statut === 'EXPIRE');

// ------------------------------------------------------------
// 1. Déclaration au brouillon
// ------------------------------------------------------------
const mvt = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machine.id, bouteilleSrcId: bouteille.id,
  peseeAvantKg: 20, peseeApresKg: 18, technicien: 'Testeur Outils',
  causeMouvement: 'Essai outils multiples',
  outilsIds: [balance.id, detecteur.id, balance.id] // doublon volontaire
});
let outils = await store.getOutilsMouvement(mvt.id);
verifier('déclaration : 2 liens (doublon dédupliqué)', outils.length === 2);
verifier('déclaration : tri par typeOutil (BALANCE avant DETECTEUR)',
  outils[0].typeOutil === 'BALANCE' && outils[1].typeOutil === 'DETECTEUR');
verifier('déclaration : outil résolu (marque, modèle)',
  outils[0].marque === 'Sauter' && outils[1].modele === 'D-TEK');
verifier('déclaration : rien de figé au brouillon',
  outils.every((o) => o.statutFige === null && o.echeanceFigee === null));

await attendreErreur('creerMouvement refuse un outil introuvable',
  store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId: machine.id,
    bouteilleSrcId: bouteille.id, outilsIds: ['out-fantome']
  }), /introuvable/);

await attendreErreur('getOutilsMouvement refuse un mouvement introuvable',
  store.getOutilsMouvement('mvt-fantome'), /introuvable/);

const mvtSansOutil = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machine.id, bouteilleSrcId: bouteille.id,
  peseeAvantKg: 18, peseeApresKg: 17.5, technicien: 'Testeur Outils'
});
verifier('mouvement sans outils : liste vide',
  (await store.getOutilsMouvement(mvtSansOutil.id)).length === 0);

// ------------------------------------------------------------
// 2. Figeage à la validation (l'état de l'outil CE jour-là)
// ------------------------------------------------------------
await store.soumettreMouvement(mvt.id);
await store.validerMouvement(mvt.id, enseignant.id);
outils = await store.getOutilsMouvement(mvt.id);
const ligneBalance = outils.find((o) => o.outillageId === balance.id);
const ligneDetecteur = outils.find((o) => o.outillageId === detecteur.id);
verifier('figeage : balance CONFORME au jour de validation',
  ligneBalance.statutFige === 'CONFORME'
  && ligneBalance.echeanceFigee === dateRelative(120));
verifier('figeage : détecteur EXPIRE au jour de validation',
  ligneDetecteur.statutFige === 'EXPIRE'
  && ligneDetecteur.echeanceFigee === dateRelative(-1));

// B1 (revue) : la validation consigne les outils figés au journal CHAÎNÉ
// (recoupement opposable d'un export édité à la main — motif prpFige).
const journalValidation = (await store.getJournalAudit()).find((e) =>
  e.action === 'VALIDATION_MOUVEMENT'
  && /outils figés :/.test(e.details ?? ''));
verifier('journal chaîné : les outils figés sont consignés à la validation',
  Boolean(journalValidation)
  && journalValidation.details.includes(`${balance.id}=CONFORME`)
  && journalValidation.details.includes(`${detecteur.id}=EXPIRE`));

// L'outil évolue APRÈS la validation : la vérité figée ne bouge pas.
await store.updateOutil(balance.id, { prochaineEcheance: dateRelative(-5) });
const balanceApres = (await store.getOutillage())
  .find((o) => o.id === balance.id);
verifier('au présent, la balance est désormais EXPIRE',
  balanceApres.statut === 'EXPIRE');
const relecture = (await store.getOutilsMouvement(mvt.id))
  .find((o) => o.outillageId === balance.id);
verifier('opposabilité : le lien garde CONFORME + échéance d\'origine',
  relecture.statutFige === 'CONFORME'
  && relecture.echeanceFigee === dateRelative(120));

// ------------------------------------------------------------
// 3. Contre-écriture : les liens de l'original restent intacts
// ------------------------------------------------------------
const contre = await store.annulerParContreEcriture(
  mvt.id, 'Essai contre-écriture outils', enseignant.id);
verifier('contre-écriture : aucun lien copié sur la nouvelle écriture',
  (await store.getOutilsMouvement(contre.id)).length === 0);
verifier('contre-écriture : les liens de l\'original sont intacts',
  (await store.getOutilsMouvement(mvt.id)).length === 2);

// ------------------------------------------------------------
// 4. Suppression d'un brouillon : les liens partent avec lui
// ------------------------------------------------------------
const brouillon = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machine.id, bouteilleSrcId: bouteille.id,
  outilsIds: [detecteur.id]
});
verifier('brouillon : 1 lien posé',
  (await store.getOutilsMouvement(brouillon.id)).length === 1);
await store.supprimerMouvement(brouillon.id);
await attendreErreur('après suppression, le mouvement est introuvable',
  store.getOutilsMouvement(brouillon.id), /introuvable/);
const exportApresSuppression = JSON.parse(await store.exporterJSON());
const donneesExport = exportApresSuppression.donnees ?? exportApresSuppression;
verifier('aucun lien orphelin dans l\'export après suppression',
  (donneesExport.mouvementOutillage ?? [])
    .every((l) => l.mouvementId !== brouillon.id));

// ------------------------------------------------------------
// 5. Round-trip export → import : liens et figeage conservés
// ------------------------------------------------------------
const paquet = await store.exporterJSON();
verifier('l\'export porte la collection mouvementOutillage',
  Array.isArray(donneesExport.mouvementOutillage)
  && donneesExport.mouvementOutillage.length === 2);
const importOk = await store.importerJSON(paquet);
verifier('round-trip import accepté', importOk === true);
const apresImport = (await store.getOutilsMouvement(mvt.id))
  .find((o) => o.outillageId === balance.id);
verifier('round-trip : statut figé conservé (CONFORME + échéance d\'origine)',
  apresImport.statutFige === 'CONFORME'
  && apresImport.echeanceFigee === dateRelative(120));

// ------------------------------------------------------------
// 6. Invariants d'import : refus des liens incohérents
// ------------------------------------------------------------
async function importerForge(mutation, motif, libelle) {
  const forge = JSON.parse(paquet);
  const donneesForge = forge.donnees ?? forge;
  mutation(donneesForge);
  await attendreErreur(libelle,
    store.importerJSON(JSON.stringify(forge)), motif);
}
await importerForge((d) => {
  d.mouvementOutillage.push({
    id: 'lien-forge', mouvementId: 'mvt-fantome',
    outillageId: balance.id, statutFige: null, echeanceFigee: null
  });
}, /mouvement introuvable/, 'import refusé : lien vers un mouvement fantôme');
await importerForge((d) => {
  d.mouvementOutillage.push({
    id: 'lien-forge-2', mouvementId: mvt.id,
    outillageId: 'out-fantome', statutFige: null, echeanceFigee: null
  });
}, /outil introuvable/, 'import refusé : lien vers un outil fantôme');
await importerForge((d) => {
  d.mouvementOutillage.push({ ...d.mouvementOutillage[0], id: 'lien-forge-3' });
}, /couple mouvement\/outil en double/,
'import refusé : couple mouvement/outil en double');
await importerForge((d) => {
  d.mouvementOutillage[0].statutFige = 'BIDON';
}, /statut figé inconnu/, 'import refusé : statut figé hors énumération');
await importerForge((d) => {
  // mvtSansOutil est resté BROUILLON dans l'export de référence.
  d.mouvementOutillage.push({
    id: 'lien-forge-4', mouvementId: mvtSansOutil.id,
    outillageId: detecteur.id, statutFige: 'CONFORME',
    echeanceFigee: null
  });
}, /statut figé sur un mouvement non validé/,
'import refusé : figeage forgé sur un brouillon');

// ------------------------------------------------------------
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [store ${NOM_STORE}]`);
process.exit(nbEchecs === 0 ? 0 : 1);
