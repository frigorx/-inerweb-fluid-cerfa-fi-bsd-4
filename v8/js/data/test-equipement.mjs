// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test P1-1 — LE MODÈLE D'ÉQUIPEMENT, DE BOUT EN BOUT (via un store).
// Exécution : node v8/js/data/test-equipement.mjs [demo|local]
//
// Le module pur est déjà couvert (test-equipement-pur). Ici on prouve le
// COMPORTEMENT métier réel, contre un vrai store :
//   E1 — une détection non vérifiée n'allège PAS la fréquence, une
//        vérification récente si (valeurs limites au jour près), et le
//        passé figé ne bouge pas quand la vérification expire ;
//   E2 — au niveau haut sans détection : alerte critique + fait de
//        blocage (condition 17) ;
//   E4 — le seuil d'aptitude passe de 3 à 6 kg avec l'étiquette (via le
//        fait `aptitude` du cadre officiel) ;
//   E5 — un MOBILE sans sous-type listé n'est PAS clôturable le jour même.
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

async function messageDeRefus(promesse) {
  try { await promesse; return null; }
  catch (erreur) { return erreur.message; }
}

/** JJ mois AAAA relatif à aujourd'hui, en ISO. */
function jourDecale(nbJours) {
  const d = new Date();
  d.setDate(d.getDate() + nbJours);
  return d.toISOString().slice(0, 10);
}

const store = await fabriquerStore(NOM_STORE);
if (NOM_STORE === 'demo') await store.init();

// Un HFC à fort PRP pour atteindre facilement les seuils (R-410A, 2088).
const FLUIDE = 'R-410A';

// ============================================================
// E1 — la détection ne compte que si elle est vérifiée
// ============================================================
console.log('--- E1 : détection vérifiée ---');

// Machine à 30 kg de R-410A = 62,6 tCO₂eq → niveau MOYEN (6 mois sans
// détection, 12 avec). Charge choisie pour rester SOUS le seuil haut
// (500), donc sans obligation de détection : on isole l'effet E1.
const mDetection = await store.createMachine({
  designation: 'Groupe froid détection', fluide: FLUIDE,
  chargeNominaleKg: 30, detectionPermanente: true,
  operateur: 'Testeur équipement'
});
const echeanceSans = await store.calculerProchainControle(
  mDetection.id, '2026-06-01');
verifier('détection déclarée mais JAMAIS vérifiée : fréquence NON allégée '
  + '(6 mois → échéance à décembre)',
  echeanceSans === '2026-12-01', `échéance = ${echeanceSans}`);

// Vérifiée l'avant-veille du contrôle : allégée (12 mois → juin suivant).
await store.updateMachine(mDetection.id,
  { detectionVerifieeLe: '2026-05-30' });
const echeanceAvec = await store.calculerProchainControle(
  mDetection.id, '2026-06-01');
verifier('détection vérifiée récemment : fréquence allégée (12 mois)',
  echeanceAvec === '2027-06-01', `échéance = ${echeanceAvec}`);

// Le contrôle est daté APRÈS l'expiration de la vérification (13 mois plus
// tard) : l'allègement est tombé, retour à 6 mois.
const echeancePerimee = await store.calculerProchainControle(
  mDetection.id, '2027-07-01');
verifier('vérification expirée à la date du contrôle : allègement TOMBÉ '
  + '(retour à 6 mois)',
  echeancePerimee === '2028-01-01', `échéance = ${echeancePerimee}`);

// ============================================================
// E2 — détection obligatoire au niveau haut
// ============================================================
console.log('--- E2 : détection obligatoire ---');

// 250 kg de R-410A = 522 tCO₂eq → au-delà de 500 : détection OBLIGATOIRE.
const mObligatoire = await store.createMachine({
  designation: 'Grosse centrale sans détection', fluide: FLUIDE,
  chargeNominaleKg: 250, detectionPermanente: false,
  operateur: 'Testeur équipement'
});
{
  const alertes = await store.getAlertes();
  verifier('niveau haut SANS détection : alerte CRITIQUE '
    + 'alr-detection-obligatoire-',
    alertes.some((a) => a.id === `alr-detection-obligatoire-${mObligatoire.id}`
      && a.niveau === 'CRITIQUE'),
    alertes.map((a) => a.id).join(','));
}
// La même machine AVEC détection déclarée : plus d'alerte d'obligation.
await store.updateMachine(mObligatoire.id, { detectionPermanente: true,
  detectionVerifieeLe: jourDecale(-30) });
{
  const alertes = await store.getAlertes();
  verifier('détection ajoutée : l’alerte d’obligation disparaît',
    !alertes.some((a) =>
      a.id === `alr-detection-obligatoire-${mObligatoire.id}`));
}

// ============================================================
// E4 — le seuil d'aptitude passe de 3 à 6 kg avec l'étiquette
// (via le fait `aptitude` du cadre officiel — P0-5 branché sur P1-1).
// ============================================================
console.log('--- E4 : hermétique étiqueté → seuil 6 kg ---');

// Un opérateur de catégorie A2 (limite 3 kg) ; une machine de 5 kg.
const operateur = await store.createPersonne({
  nom: 'Équip', prenom: 'Testeur', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
await store.createHabilitation({
  personneId: operateur.id, regime: '2025', categorie: 'A2',
  numeroAttestation: 'A2-EQ-2026', organismeDelivreur: 'QualiFroid',
  dateDebut: '2026-01-01', dateFin: '2030-01-01'
});

async function aptitudeSur(machineId) {
  const brouillon = await store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId, executeParId: operateur.id,
    technicien: 'Testeur Équip', fluide: FLUIDE
  });
  const cadre = await store.simulerValidationOfficielle(brouillon.id);
  await store.supprimerMouvement(brouillon.id);
  return cadre.blocages.some((b) => b.code === 'APTITUDE_PORTEE');
}

const m5kgNu = await store.createMachine({
  designation: 'PAC 5 kg non étiquetée', fluide: FLUIDE,
  chargeNominaleKg: 5, operateur: 'Testeur équipement'
});
verifier('A2 (limite 3 kg) sur 5 kg NON hermétique : aptitude dépassée '
  + '(blocage en Officiel)',
  await aptitudeSur(m5kgNu.id));

const m5kgEtiquete = await store.createMachine({
  designation: 'PAC 5 kg hermétique étiquetée', fluide: FLUIDE,
  chargeNominaleKg: 5, hermetiqueScelle: true, hermetiqueEtiquete: true,
  operateur: 'Testeur équipement'
});
verifier('⭐ A2 sur 5 kg HERMÉTIQUE ÉTIQUETÉ : seuil élargi à 6 kg, '
  + 'aptitude OK (plus de blocage)',
  !(await aptitudeSur(m5kgEtiquete.id)));

const m5kgScelleNu = await store.createMachine({
  designation: 'PAC 5 kg scellée non étiquetée', fluide: FLUIDE,
  chargeNominaleKg: 5, hermetiqueScelle: true, hermetiqueEtiquete: false,
  operateur: 'Testeur équipement'
});
verifier('scellé mais NON étiqueté : pas de seuil élargi, aptitude dépassée',
  await aptitudeSur(m5kgScelleNu.id));

// ============================================================
// E5 — un MOBILE non listé n'est pas clôturable le jour même
// ============================================================
console.log('--- E5 : mobile listé seulement ---');

async function clotureLeJourMeme(machineId) {
  // Fuite, réparation et CONFORME le même jour → la machine revient-elle
  // EN_SERVICE (clôture) ou reste-t-elle en FUITE (pas d'exception) ?
  const jour = '2026-06-15';
  const ctlFuite = await store.createControle({
    machineId, resultat: 'FUITE', methode: 'DIRECTE', date: jour,
    operateur: 'Testeur équipement' });
  await store.tracerReparation(ctlFuite.id, { dateReparation: jour,
    natureReparation: 'Remplacement joint', reparateur: 'Testeur' });
  await store.createControle({
    machineId, resultat: 'CONFORME', methode: 'DIRECTE', date: jour,
    operateur: 'Testeur équipement' });
  const m = (await store.getMachines()).find((x) => x.id === machineId);
  return m.statut === 'EN_SERVICE';
}

const mobileListe = await store.createMachine({
  designation: 'Camion frigo listé', fluide: FLUIDE, chargeNominaleKg: 4,
  typeInstallation: 'MOBILE', sousTypeInstallation: 'CAMION_FRIGORIFIQUE',
  operateur: 'Testeur équipement'
});
verifier('⭐ MOBILE listé : clôture le jour même admise (EN_SERVICE)',
  await clotureLeJourMeme(mobileListe.id));

const mobileNonListe = await store.createMachine({
  designation: 'Engin mobile non listé', fluide: FLUIDE, chargeNominaleKg: 4,
  typeInstallation: 'MOBILE', sousTypeInstallation: 'AUTRE_MOBILE',
  operateur: 'Testeur équipement'
});
verifier('⭐ MOBILE de sous-type AUTRE_MOBILE : PAS de clôture immédiate '
  + '(reste en FUITE)',
  !(await clotureLeJourMeme(mobileNonListe.id)));

const mobileSansSousType = await store.createMachine({
  designation: 'Mobile sans sous-type', fluide: FLUIDE, chargeNominaleKg: 4,
  typeInstallation: 'MOBILE', operateur: 'Testeur équipement'
});
verifier('MOBILE sans sous-type : PAS de clôture immédiate (reste en FUITE)',
  !(await clotureLeJourMeme(mobileSansSousType.id)));

// ============================================================
// Garde de saisie de bout en bout (le store refuse, pas seulement le module)
// ============================================================
console.log('--- Garde de saisie via le store ---');

verifier('sous-type sur un FIXE refusé par le store',
  (await messageDeRefus(store.createMachine({
    designation: 'X', fluide: FLUIDE, chargeNominaleKg: 1,
    sousTypeInstallation: 'CAMION_FRIGORIFIQUE'
  })))?.includes('que sur un équipement MOBILE'));
verifier('étiqueté sans scellement refusé par le store',
  (await messageDeRefus(store.createMachine({
    designation: 'X', fluide: FLUIDE, chargeNominaleKg: 1,
    hermetiqueEtiquete: true
  })))?.includes('sans être hermétiquement scellé'));

// ============================================================
// L3/R4 (25/07) — l'USAGE THERMIQUE de bout en bout : CRUD, garde, et la
// condition 10 DATÉE (via simulerValidationOfficielle, verrou fermé —
// on vérifie la PRÉSENCE/ABSENCE de FLUIDE_VIERGE, jamais le reste).
// ============================================================
console.log('--- L3/R4 : usage thermique et condition 10 datée ---');

verifier('usage thermique inconnu refusé par le store',
  (await messageDeRefus(store.createMachine({
    designation: 'X', fluide: FLUIDE, chargeNominaleKg: 1,
    usageThermique: 'CHAUDIERE'
  })))?.includes('Usage thermique inconnu'));

const mClim = await store.createMachine({
  designation: 'Split R-404A (test usage)', fluide: 'R-404A',
  chargeNominaleKg: 2, usageThermique: 'CLIMATISATION',
  operateur: 'Testeur usage'
});
verifier('createMachine porte l’usage thermique (relu du store)',
  mClim.usageThermique === 'CLIMATISATION');
const mFroid = await store.createMachine({
  designation: 'Chambre R-404A (test usage)', fluide: 'R-404A',
  chargeNominaleKg: 2, operateur: 'Testeur usage'
});
verifier('sans usage : null (régime le plus strict)',
  mFroid.usageThermique === null);
{
  const efface = await store.updateMachine(mClim.id,
    { usageThermique: '', operateur: 'Testeur usage' });
  verifier('update : chaîne vide efface l’usage (retour au plus strict)',
    efface.usageThermique === null);
  await store.updateMachine(mClim.id,
    { usageThermique: 'CLIMATISATION', operateur: 'Testeur usage' });
}

// Décor : une bouteille NEUVE VIERGE de R-404A (PRP 3922 ≥ 2500).
const bVierge = await store.createBouteille({
  type: 'NEUVE', fluide: 'R-404A', etatFluide: 'VIERGE',
  tareKg: 10, masseBruteKg: 20, contenanceMaxKg: 20
});

/** FLUIDE_VIERGE présent à la validation simulée d'un brouillon daté ? */
async function fluideViergePose(machineId, dateMouvement) {
  const brouillon = await store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId, bouteilleSrcId: bVierge.id,
    executeParId: operateur.id, technicien: 'Testeur usage',
    fluide: 'R-404A', date: dateMouvement
  });
  const cadre = await store.simulerValidationOfficielle(brouillon.id);
  await store.supprimerMouvement(brouillon.id);
  return cadre.blocages.some((b) => b.code === 'FLUIDE_VIERGE');
}

verifier('machine CLIM : mouvement daté 2025 (avant le 01/01/2026) → pas de FLUIDE_VIERGE',
  (await fluideViergePose(mClim.id, '2025-06-01')) === false);
verifier('machine CLIM : mouvement de 2026 → FLUIDE_VIERGE posé',
  (await fluideViergePose(mClim.id, '2026-02-01')) === true);
verifier('machine SANS usage : mouvement daté 2025 → FLUIDE_VIERGE posé (régime strict froid)',
  (await fluideViergePose(mFroid.id, '2025-06-01')) === true);
verifier('machine SANS usage : mouvement de 2024 (avant toute interdiction) → pas de blocage',
  (await fluideViergePose(mFroid.id, '2024-06-01')) === false);

// ============================================================
console.log('');
console.log(`Modèle d’équipement de bout en bout (${NOM_STORE}) : `
  + `${nbOk} réussies, ${nbEchecs} en échec.`);
if (nbEchecs > 0) process.exit(1);
console.log(`Modèle d’équipement : « ${NOM_STORE} » est conforme.`);
