// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// PÉRIMÈTRE DU CERFA (Q4 / L1b, décision Franck 24/07/2026) — de bout en
// bout contre le VRAI store : le fait `fluideHorsPerimetreFluore` est
// précalculé par cadreFicheOfficiel sur la fiche réglementaire EXPLICITE
// (categorieCadre7 = 'AUCUNE') et la condition 18 HORS_PERIMETRE_FLUORE
// refuse la fiche OFFICIELLE d'un fluide non fluoré (R-744, R-290) — la
// trace volontaire passe par le mode Formation.
//
// La preuve passe par simulerValidationOfficielle : elle évalue le cadre
// complet MÊME verrou fermé (le blocage VERROU_LIVRAISON coexiste — on
// vérifie la PRÉSENCE de la condition 18, jamais l'absence des autres).
//
// Suite DOUBLÉE au lanceur (demo puis local) : parité prouvée en jouant
// les mêmes assertions contre les deux stores.
// ÉCRIT dans le store cible — base JETABLE en local (harnais).
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
if (store.init) await store.init();
console.log(`\n— Périmètre CERFA (condition 18) contre le store « ${NOM_STORE} » —`);

// Décor : un opérateur (les blocages d'intervenant coexistent sans gêner).
const operateur = await store.createPersonne({
  nom: 'Périmètre', prenom: 'Testeur', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});

/** Codes de blocage à la VALIDATION simulée d'un brouillon sur ce fluide. */
async function codesPour(fluide, designation) {
  const machine = await store.createMachine({
    designation, fluide, chargeNominaleKg: 2,
    operateur: 'Testeur Périmètre'
  });
  const brouillon = await store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId: machine.id,
    executeParId: operateur.id, technicien: 'Testeur Périmètre', fluide
  });
  const cadre = await store.simulerValidationOfficielle(brouillon.id);
  await store.supprimerMouvement(brouillon.id);
  return cadre.blocages.map((b) => b.code);
}

{
  const codes = await codesPour('R-744', 'Chambre froide CO2 (test périmètre)');
  verifier('R-744 (CO2, fiche AUCUNE) : la condition 18 HORS_PERIMETRE_FLUORE est posée',
    codes.includes('HORS_PERIMETRE_FLUORE'), codes.join(','));
}
{
  const codes = await codesPour('R-290', 'Vitrine propane (test périmètre)');
  verifier('R-290 (HC, fiche AUCUNE) : la condition 18 est posée',
    codes.includes('HORS_PERIMETRE_FLUORE'), codes.join(','));
}
{
  const codes = await codesPour('R-410A', 'Split R-410A (test périmètre)');
  verifier('R-410A (HFC, dans le périmètre) : AUCUNE condition 18',
    !codes.includes('HORS_PERIMETRE_FLUORE'), codes.join(','));
}
{
  // Le mélange contenant du HFC reste dans le périmètre (régime HFC) même
  // s'il contient une part majoritaire de HFO — la fiche explicite prime.
  const codes = await codesPour('R-455A', 'Meuble R-455A (test périmètre)');
  verifier('R-455A (mélange HFC/HFO, fiche HFC) : AUCUNE condition 18',
    !codes.includes('HORS_PERIMETRE_FLUORE'), codes.join(','));
}

// ============================================================
// Contournements FERMÉS par la revue adversariale du lot (24/07) : le fait
// suit la CLASSIFICATION MOTEUR (repli famille compris), plus l'attribut
// brut « AUCUNE » seul — un non-fluoré créé SANS fiche ne passe plus.
// ============================================================
{
  // Un ammoniac créé sans fiche explicite (le choix PAR DÉFAUT du
  // formulaire) : le repli famille NH3 → hors périmètre → condition posée.
  await store.createFluide({
    code: 'R-717', famille: 'NH3', gwpAr4: 0, classeSecurite: 'B2L',
    operateur: 'Testeur Périmètre'
  });
  const codes = await codesPour('R-717', 'Groupe ammoniac (test périmètre)');
  verifier('R-717 créé SANS fiche explicite : condition 18 posée (repli famille NH3)',
    codes.includes('HORS_PERIMETRE_FLUORE'), codes.join(','));
}
{
  // Vider la fiche du R-744 ne lève PLUS le blocage : le repli famille CO2
  // classe toujours hors périmètre.
  await store.updateFluide('R-744', {
    categorieCadre7: null, operateur: 'Testeur Périmètre'
  });
  const codes = await codesPour('R-744', 'Chambre CO2 fiche vidée (test périmètre)');
  verifier('R-744 dont la fiche est VIDÉE : condition 18 toujours posée (repli famille CO2)',
    codes.includes('HORS_PERIMETRE_FLUORE'), codes.join(','));
}
{
  // Contre-témoin : un gaz fluoré créé sans fiche (famille HFC) reste DANS
  // le périmètre par le repli — pas de faux blocage. Code hors du semis.
  await store.createFluide({
    code: 'R-470A', famille: 'HFC', gwpAr4: 909, classeSecurite: 'A1',
    operateur: 'Testeur Périmètre'
  });
  const codes = await codesPour('R-470A', 'Split R-470A (test périmètre)');
  verifier('R-470A créé sans fiche (famille HFC) : AUCUNE condition 18 (repli famille)',
    !codes.includes('HORS_PERIMETRE_FLUORE'), codes.join(','));
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
