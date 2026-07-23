// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test P1-2 — ADMINISTRATION DU RÉFÉRENTIEL DES FLUIDES.
// Exécution : node v8/js/data/test-referentiel-fluides.mjs [demo|local]
//
// Le référent administre ses gaz lui-même (createFluide / updateFluide) :
// cette suite prouve que cette liberté ne peut PAS abîmer le registre.
//
// Prouve que :
//   1. un fluide se crée, se relit, et sert immédiatement à la saisie ;
//   2. l'unicité du code tient à la casse, aux espaces et aux tirets ;
//   3. les entrées invalides sont refusées avec le MÊME message des deux
//      côtés (PRP, classe de sécurité, statut, catégorie du cadre 7) ;
//   4. la cohérence de la fiche du cadre 7 bloque les contradictions
//      manifestes, et laisse passer le R-455A (HFC + HFO, règle A) ;
//   5. le CODE d'un fluide ne se modifie jamais (clé étrangère de huit
//      tables, dont des écritures scellées) ;
//   6. ⭐ LE PASSÉ NE BOUGE PAS : modifier le PRP du référentiel ne
//      retouche NI le prpFige d'une écriture validée, NI la chaîne de
//      hash, NI le numéro CERFA — et la nouvelle valeur s'applique aux
//      écritures SUIVANTES ;
//   7. un fluide se DÉSACTIVE (jamais de suppression) : il sort des
//      listes de saisie, reste lisible, et les écritures qui le citent
//      restent intactes ;
//   8. un export → import ne réétiquette pas un PRP ajusté localement et
//      n'écrase pas une fiche actée.
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

/** Joue une promesse censée ÉCHOUER ; retourne le message d'erreur. */
async function messageDeRefus(promesse) {
  try {
    await promesse;
    return null;
  } catch (erreur) {
    return erreur.message;
  }
}

const store = await fabriquerStore(NOM_STORE);
if (NOM_STORE === 'demo') await store.init();

// ============================================================
// 1. Création : un gaz déclaré par le référent lui-même
// ============================================================
console.log('--- 1. Création ---');

const cree = await store.createFluide({
  code: 'R-449A', famille: 'HFC', gwpAr4: 1397, classeSecurite: 'A1',
  categorieCadre7: 'HFC', contientHfc: true, contientHfo: false,
  sourcePrp: 'AR4', commentaire: 'Substitut du R-404A',
  operateur: 'Testeur référentiel'
});
verifier('createFluide retourne la fiche complète',
  cree.code === 'R-449A' && cree.gwpAr4 === 1397
  && cree.classeSecurite === 'A1');
verifier('le fluide créé est ACTIF et sans machine',
  cree.actif === true && cree.nbMachines === 0);
verifier('l’impact est dérivé du PRP (1397 → ELEVE)',
  cree.impact === 'ELEVE');
verifier('le statut réglementaire vaut AUTORISE par défaut',
  cree.statutReglementaire === 'AUTORISE');

const relu = (await store.getFluides()).find((f) => f.code === 'R-449A');
verifier('relecture par getFluides : fiche identique',
  relu && relu.gwpAr4 === 1397 && relu.categorieCadre7 === 'HFC'
  && relu.contientHfc === true && relu.contientHfo === false
  && relu.sourcePrp === 'AR4' && relu.actif === true);

// Un fluide fraîchement déclaré doit servir IMMÉDIATEMENT : c'est tout
// l'objet de la brique (ne plus attendre une migration pour saisir).
const machineNeuve = await store.createMachine({
  designation: 'Chambre froide R-449A', fluide: 'R-449A',
  chargeNominaleKg: 12, operateur: 'Testeur référentiel'
});
verifier('le fluide créé est utilisable tout de suite par une machine',
  machineNeuve.fluide === 'R-449A');
verifier('nbMachines suit le parc',
  (await store.getFluides()).find((f) => f.code === 'R-449A').nbMachines === 1);

// Champs facultatifs omis : la fiche reste vide, pas inventée.
const minimal = await store.createFluide({
  code: 'R-600a', famille: 'HC', gwpAr4: 0.02, classeSecurite: 'A3',
  operateur: 'Testeur référentiel'
});
verifier('fiche cadre 7 omise : elle reste NULLE (repli du moteur assumé)',
  minimal.categorieCadre7 === null && minimal.contientHfc === null
  && minimal.contientHfo === null && minimal.sourcePrp === null);
verifier('PRP < 1 conservé au centième (0,02 ≠ 0)',
  minimal.gwpAr4 === 0.02 && minimal.impact === 'FAIBLE');

// ============================================================
// 2. Unicité du code
// ============================================================
console.log('--- 2. Unicité du code ---');

verifier('doublon exact refusé',
  (await messageDeRefus(store.createFluide({
    code: 'R-449A', famille: 'HFC', gwpAr4: 1, classeSecurite: 'A1'
  }))) === 'Code de fluide déjà utilisé : R-449A.');
verifier('doublon à la CASSE près refusé (« r-449a »)',
  (await messageDeRefus(store.createFluide({
    code: 'r-449a', famille: 'HFC', gwpAr4: 1, classeSecurite: 'A1'
  })))?.includes('déjà utilisé'));
verifier('doublon au TIRET et aux ESPACES près refusé (« R 449 A »)',
  (await messageDeRefus(store.createFluide({
    code: 'R 449 A', famille: 'HFC', gwpAr4: 1, classeSecurite: 'A1'
  })))?.includes('déjà utilisé'));
verifier('la casse SAISIE est conservée (R-1234yf ne devient pas R-1234YF)',
  (await store.getFluides()).some((f) => f.code === 'R-1234yf'));

// ============================================================
// 3. Entrées invalides — mêmes messages des deux côtés
// ============================================================
console.log('--- 3. Entrées invalides ---');

verifier('code vide refusé',
  (await messageDeRefus(store.createFluide({
    code: '   ', famille: 'HFC', gwpAr4: 1, classeSecurite: 'A1'
  }))) === 'Code du fluide obligatoire (ex. R-449A).');
verifier('famille vide refusée',
  (await messageDeRefus(store.createFluide({
    code: 'R-NEUF1', famille: '', gwpAr4: 1, classeSecurite: 'A1'
  }))) === 'Famille du fluide obligatoire (ex. HFC, HFO, HC, CO2).');
verifier('PRP négatif refusé',
  (await messageDeRefus(store.createFluide({
    code: 'R-NEUF2', famille: 'HFC', gwpAr4: -1, classeSecurite: 'A1'
  })))?.startsWith('PRP invalide'));
verifier('PRP illisible refusé',
  (await messageDeRefus(store.createFluide({
    code: 'R-NEUF3', famille: 'HFC', gwpAr4: 'beaucoup', classeSecurite: 'A1'
  })))?.startsWith('PRP invalide'));
verifier('PRP = 0 ACCEPTÉ (le NH₃ vaut 0)',
  (await store.createFluide({
    code: 'R-717', famille: 'NH3', gwpAr4: 0, classeSecurite: 'B2L',
    categorieCadre7: 'AUCUNE', contientHfc: false, contientHfo: false
  })).gwpAr4 === 0);
verifier('classe de sécurité hors liste refusée',
  (await messageDeRefus(store.createFluide({
    code: 'R-NEUF4', famille: 'HFC', gwpAr4: 1, classeSecurite: 'A4'
  })))?.startsWith('Classe de sécurité inconnue'));
verifier('statut réglementaire hors liste refusé',
  (await messageDeRefus(store.createFluide({
    code: 'R-NEUF5', famille: 'HFC', gwpAr4: 1, classeSecurite: 'A1',
    statutReglementaire: 'PEUT-ETRE'
  })))?.startsWith('Statut réglementaire inconnu'));
verifier('catégorie du cadre 7 hors liste refusée',
  (await messageDeRefus(store.createFluide({
    code: 'R-NEUF6', famille: 'HFC', gwpAr4: 1, classeSecurite: 'A1',
    categorieCadre7: 'PFC'
  })))?.startsWith('Catégorie du cadre 7 inconnue'));

// ============================================================
// 4. Cohérence de la fiche du cadre 7
// ============================================================
console.log('--- 4. Cohérence du cadre 7 ---');

verifier('catégorie HFC sans « contient du HFC » refusée',
  (await messageDeRefus(store.createFluide({
    code: 'R-NEUF7', famille: 'HFC', gwpAr4: 1, classeSecurite: 'A1',
    categorieCadre7: 'HFC', contientHfc: false, contientHfo: false
  })))?.includes('la catégorie HFC suppose'));
verifier('catégorie HFO qui contient du HFC refusée (règle A)',
  (await messageDeRefus(store.createFluide({
    code: 'R-NEUF8', famille: 'HFO', gwpAr4: 1, classeSecurite: 'A1',
    categorieCadre7: 'HFO', contientHfc: true, contientHfo: true
  })))?.includes('la catégorie HFO suppose'));
verifier('catégorie AUCUNE avec « contient du HFC » refusée',
  (await messageDeRefus(store.createFluide({
    code: 'R-NEUF9', famille: 'CO2', gwpAr4: 1, classeSecurite: 'A1',
    categorieCadre7: 'AUCUNE', contientHfc: true, contientHfo: false
  })))?.includes('la catégorie AUCUNE exclut'));
verifier('un mélange HFC + HFO classé HFC est ACCEPTÉ (cas R-455A, règle A)',
  (await store.createFluide({
    code: 'R-454B', famille: 'HFC/HFO', gwpAr4: 466, classeSecurite: 'A2L',
    categorieCadre7: 'HFC', contientHfc: true, contientHfo: true,
    sourcePrp: 'AR4'
  })).categorieCadre7 === 'HFC');

// ============================================================
// 5. Le code ne se modifie jamais
// ============================================================
console.log('--- 5. Code figé ---');

verifier('modifier le code est refusé, avec la marche à suivre',
  (await messageDeRefus(store.updateFluide('R-449A', { code: 'R-449B' })))
    ?.includes('Créez le bon code, puis désactivez celui-ci.'));
verifier('renvoyer le MÊME code dans le patch ne gêne pas',
  (await store.updateFluide('R-449A',
    { code: 'R-449A', commentaire: 'Substitut du R-404A (parc atelier)' }))
    .commentaire === 'Substitut du R-404A (parc atelier)');
verifier('fluide introuvable : message explicite',
  (await messageDeRefus(store.updateFluide('R-INEXISTANT', { famille: 'HFC' })))
    === 'Fluide introuvable au référentiel : R-INEXISTANT.');

// ============================================================
// 6. ⭐ LE PASSÉ NE BOUGE PAS
// C'est LE test de la brique : le référentiel devient modifiable, mais
// une écriture scellée garde le PRP du jour où elle a été validée.
// ============================================================
console.log('--- 6. Le passé ne bouge pas ---');

const referent = await store.createPersonne({
  nom: 'Référentiel', prenom: 'Référent', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
const bouteille = await store.createBouteille({
  type: 'NEUVE', fluide: 'R-449A', tareKg: 10, masseBruteKg: 25,
  contenanceMaxKg: 20
});
const mouvement = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machineNeuve.id,
  bouteilleSrcId: bouteille.id, peseeAvantKg: 15, peseeApresKg: 13,
  technicien: 'Testeur référentiel', causeMouvement: 'Charge de référence'
});
await store.soumettreMouvement(mouvement.id);
const valide = await store.validerMouvement(mouvement.id, referent.id);

verifier('l’écriture validée fige le PRP du référentiel du jour (1397)',
  valide.prpFige === 1397, `prpFige = ${valide.prpFige}`);
const empreinteAvant = valide.hashEcriture;
const cerfaAvant = valide.cerfaNumero;
verifier('la chaîne des écritures est intacte avant la correction',
  (await store.verifierChaineHash()).ok === true);

// Le référent corrige le PRP du référentiel APRÈS coup.
const corrige = await store.updateFluide('R-449A', {
  gwpAr4: 1282, sourcePrp: 'saisie locale — valeur fournisseur 2026',
  operateur: 'Testeur référentiel'
});
verifier('le référentiel porte bien la nouvelle valeur',
  corrige.gwpAr4 === 1282 && corrige.impact === 'ELEVE'
  && corrige.sourcePrp === 'saisie locale — valeur fournisseur 2026');

const apres = (await store.getMouvements()).find((m) => m.id === mouvement.id);
verifier('⭐ le PRP FIGÉ de l’écriture validée n’a PAS bougé (1397)',
  apres.prpFige === 1397, `prpFige = ${apres.prpFige}`);
verifier('⭐ l’empreinte de l’écriture est INCHANGÉE',
  apres.hashEcriture === empreinteAvant);
verifier('⭐ le numéro CERFA déjà émis est INCHANGÉ',
  apres.cerfaNumero === cerfaAvant);
verifier('⭐ la chaîne de hash reste intacte après correction du référentiel',
  (await store.verifierChaineHash()).ok === true);

// … et la nouvelle valeur s'applique bien aux écritures SUIVANTES.
const mouvement2 = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machineNeuve.id,
  bouteilleSrcId: bouteille.id, peseeAvantKg: 13, peseeApresKg: 12,
  technicien: 'Testeur référentiel', causeMouvement: 'Charge après correction'
});
await store.soumettreMouvement(mouvement2.id);
const valide2 = await store.validerMouvement(mouvement2.id, referent.id);
verifier('la NOUVELLE valeur s’applique aux écritures suivantes (1282)',
  valide2.prpFige === 1282, `prpFige = ${valide2.prpFige}`);

// Une source obligatoire dès que le PRP bouge (D4).
verifier('PRP modifié SANS source : refusé',
  (await messageDeRefus(store.updateFluide('R-449A', { gwpAr4: 1300 })))
    ?.startsWith('PRP modifié : la source du PRP doit être saisie'));
verifier('PRP INCHANGÉ dans le patch : la source n’est pas réclamée',
  (await store.updateFluide('R-449A',
    { gwpAr4: 1282, commentaire: 'PRP confirmé' })).gwpAr4 === 1282);

// ============================================================
// 7. Désactivation — jamais de suppression
// ============================================================
console.log('--- 7. Désactivation ---');

const desactive = await store.updateFluide('R-600a',
  { actif: false, operateur: 'Testeur référentiel' });
verifier('le fluide désactivé porte actif = false',
  desactive.actif === false);
verifier('il reste AU RÉFÉRENTIEL (aucune suppression)',
  (await store.getFluides()).some((f) => f.code === 'R-600a'));

const { fluidesProposables } = await import('../core/utils.js');
const tousLesFluides = await store.getFluides();
verifier('il sort des fluides proposables à la saisie',
  !fluidesProposables(tousLesFluides).some((f) => f.code === 'R-600a'));
verifier('il reste proposé si c’est la valeur DÉJÀ enregistrée d’une fiche',
  fluidesProposables(tousLesFluides, 'R-600a')
    .some((f) => f.code === 'R-600a'));

// Un fluide RÉFÉRENCÉ par des écritures se désactive aussi : c'est le cas
// réel du R-22 (on n'en monte plus, on en récupère encore).
await store.updateFluide('R-449A', { actif: false });
verifier('un fluide RÉFÉRENCÉ par une écriture scellée se désactive',
  (await store.getFluides()).find((f) => f.code === 'R-449A').actif === false);
verifier('l’écriture qui le cite reste intacte, chaîne comprise',
  (await store.getMouvements()).find((m) => m.id === mouvement.id)
    .prpFige === 1397
  && (await store.verifierChaineHash()).ok === true);
verifier('la machine qui le porte garde son fluide',
  (await store.getMachines()).find((m) => m.id === machineNeuve.id)
    .fluide === 'R-449A');

const reactive = await store.updateFluide('R-449A', { actif: true });
verifier('réactivation possible', reactive.actif === true);

// ============================================================
// 8. Export → import : une fiche actée n'est pas écrasée
// ============================================================
console.log('--- 8. Export → import ---');

const exportJson = await store.exporterJSON();
verifier('l’export transporte le référentiel administré',
  exportJson.includes('R-449A') && exportJson.includes('R-717'));

await store.importerJSON(exportJson);
const apresImport = await store.getFluides();
const r449Import = apresImport.find((f) => f.code === 'R-449A');
verifier('après import : le PRP ajusté localement est conservé (1282)',
  r449Import.gwpAr4 === 1282);
verifier('après import : la source locale n’est PAS réétiquetée officielle',
  r449Import.sourcePrp === 'saisie locale — valeur fournisseur 2026');
verifier('après import : la fiche cadre 7 actée est conservée',
  r449Import.categorieCadre7 === 'HFC' && r449Import.contientHfc === true);
verifier('après import : le fluide sans fiche garde ses 4 champs nuls',
  (() => { const f = apresImport.find((x) => x.code === 'R-600a');
    return f.categorieCadre7 === null && f.contientHfc === null
      && f.contientHfo === null && f.sourcePrp === null; })());
verifier('après import : registre NON altéré',
  (await store.verifierChaineHash()).ok === true);
verifier('après import : le PRP figé de l’écriture est toujours 1397',
  (await store.getMouvements()).find((m) => m.id === mouvement.id)
    .prpFige === 1397);

// ============================================================
console.log('');
console.log(`Référentiel des fluides (${NOM_STORE}) : `
  + `${nbOk} réussies, ${nbEchecs} en échec.`);
if (nbEchecs > 0) process.exit(1);
console.log(`Administration du référentiel : « ${NOM_STORE} » est conforme.`);
