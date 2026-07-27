// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// Suite CONTRACTUELLE de la sentinelle d'alertes persistées (doublée
// demo + local via outils/lancer-tests.mjs). Prouve, à l'identique sur
// les deux stores, le cycle de vie d'un épisode et les garde-fous audit.
//
// Alerte-témoin déterministe : l'échéance de capacité de l'établissement
// (updateEtablissement) — une seule mutation la fait naître/disparaître,
// indépendamment des données de départ (démo peuplée vs local vierge).
// Toutes les assertions portent sur l'id 'alr-capacite' ; on n'assume
// jamais l'absence d'AUTRES alertes de départ.

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
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}
async function verifierRejet(libelle, promesse, extrait) {
  try {
    await promesse;
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle} — aucune Error levée`);
  } catch (e) {
    const ok = !extrait || String(e.message).includes(extrait);
    if (ok) { nbOk += 1; console.log(`  OK  ${libelle}`); }
    else {
      nbEchecs += 1;
      console.error(`ÉCHEC ${libelle} — message inattendu : « ${e.message} »`);
    }
  }
}

const PASSE = '2020-01-01';
const FUTUR = '2999-12-31';
// Échéance DANS l'horizon (90 j) mais pas dépassée → alerte IMPORTANT
// (calculée depuis la date du jour pour rester juste quel que soit le jour).
function dateDansJours(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
const PROCHE = dateDansJours(30);
const ID = 'alr-capacite';

const pourAlerte = (s, id) => s.filter((e) => e.idAlerte === id);
const ouverts = (s, id) => pourAlerte(s, id).filter((e) => e.resolueLe === null);
async function compterActionJournal(store, action, cible) {
  const j = await store.getJournalAudit();
  return j.filter((e) => e.action === action && e.cible === cible).length;
}

const store = await fabriquerStore(NOM_STORE);
if (NOM_STORE === 'demo') await store.init();

console.log(`\n=== Sentinelle — store « ${NOM_STORE} » ===\n`);

// --- Point de départ : capacité VALIDE (aucune alerte-témoin) ------
await store.updateEtablissement({ dateEcheanceCapacite: FUTUR });
let sent = await store.rafraichirSentinelle();
verifier('départ : getSentinelle retourne un tableau', Array.isArray(sent));
verifier('départ : aucun épisode ouvert pour l’alerte-témoin',
  ouverts(sent, ID).length === 0);

// --- Apparition ----------------------------------------------------
await store.updateEtablissement({ dateEcheanceCapacite: PASSE });
sent = await store.rafraichirSentinelle();
const ouvertsApres = ouverts(sent, ID);
verifier('apparition : exactement 1 épisode ouvert', ouvertsApres.length === 1);
const ep = ouvertsApres[0];
verifier('apparition : niveau figé CRITIQUE', ep && ep.niveau === 'CRITIQUE');
verifier('apparition : titre parlant', ep && /capacit/i.test(ep.titre));
verifier('apparition : cible = admin', ep && ep.cible && ep.cible.vue === 'admin');
verifier('apparition : apparueLe horodaté (ISO)',
  ep && typeof ep.apparueLe === 'string' && ep.apparueLe.includes('T'));
verifier('apparition : resolueLe nul', ep && ep.resolueLe === null);
verifier('apparition : non acquittée', ep && ep.acquitteeLe === null && ep.acquitteePar === null);
verifier('apparition : id d’épisode attribué', ep && typeof ep.id === 'string' && ep.id.length > 0);
const idEpisode1 = ep.id;

// --- Idempotence ---------------------------------------------------
sent = await store.rafraichirSentinelle();
verifier('idempotence : toujours 1 seul épisode ouvert', ouverts(sent, ID).length === 1);
verifier('idempotence : même id d’épisode (pas de doublon)',
  ouverts(sent, ID)[0].id === idEpisode1);

// --- Acquittement (trace consignée au journal) ---------------------
const journalAvant = await compterActionJournal(store, 'ACQUITTEMENT_ALERTE', ID);
const retour = await store.acquitterAlerte(ID, 'testeur');
verifier('acquittement : retourne l’épisode acquitté',
  retour && retour.acquitteeLe !== null && retour.acquitteePar === 'testeur');
sent = await store.getSentinelle();
const epAcq = ouverts(sent, ID)[0];
verifier('acquittement : acquitteeLe posé', epAcq && epAcq.acquitteeLe !== null);
verifier('acquittement : acquitteePar = testeur', epAcq && epAcq.acquitteePar === 'testeur');
const journalApres = await compterActionJournal(store, 'ACQUITTEMENT_ALERTE', ID);
verifier('acquittement : 1 entrée ajoutée au journal d’audit',
  journalApres === journalAvant + 1);

// --- Idempotence de l'acquittement (pas de seconde trace) ----------
await store.acquitterAlerte(ID, 'testeur');
const journalDouble = await compterActionJournal(store, 'ACQUITTEMENT_ALERTE', ID);
verifier('acquittement idempotent : aucune seconde entrée au journal',
  journalDouble === journalApres);

// --- GARDE-FOU AUDIT : acquitter ne masque RIEN --------------------
const alertes = await store.getAlertes();
verifier('masquage impossible : l’alerte reste ACTIVE et critique après acquittement',
  alertes.some((a) => a.id === ID && a.niveau === 'CRITIQUE'));

// --- Résolution (la cause disparaît) -------------------------------
await store.updateEtablissement({ dateEcheanceCapacite: FUTUR });
verifier('résolution : l’alerte a bien quitté getAlertes()',
  !(await store.getAlertes()).some((a) => a.id === ID));
sent = await store.rafraichirSentinelle();
verifier('résolution : plus aucun épisode ouvert', ouverts(sent, ID).length === 0);
const archive = pourAlerte(sent, ID).find((e) => e.id === idEpisode1);
verifier('résolution : l’épisode est archivé (resolueLe posé)',
  archive && archive.resolueLe !== null);
verifier('résolution : l’archive garde la preuve d’acquittement',
  archive && archive.acquitteePar === 'testeur');

// --- Réapparition → NOUVEL épisode (non acquitté) ------------------
await store.updateEtablissement({ dateEcheanceCapacite: PASSE });
sent = await store.rafraichirSentinelle();
const ouvertsBis = ouverts(sent, ID);
verifier('réapparition : un épisode ouvert de nouveau', ouvertsBis.length === 1);
verifier('réapparition : c’est un NOUVEL épisode (id différent)',
  ouvertsBis[0].id !== idEpisode1);
verifier('réapparition : reparti NON acquitté',
  ouvertsBis[0].acquitteeLe === null);
verifier('réapparition : l’ancien épisode reste archivé à côté',
  pourAlerte(sent, ID).length === 2);

// --- Escalade de niveau : l'acquittement est REMIS À ZÉRO ----------
// (fidélité d'audit : prendre acte de la version douce ne vaut pas
// prise d'acte de l'aggravation — constat IMPORTANT 1 de la revue).
// État courant : alr-capacite est CRITIQUE (PASSE) et ouverte.
await store.updateEtablissement({ dateEcheanceCapacite: PROCHE }); // → IMPORTANT
sent = await store.rafraichirSentinelle();
let epEsc = ouverts(sent, ID)[0];
verifier('escalade prépa : niveau redescendu à IMPORTANT', epEsc && epEsc.niveau === 'IMPORTANT');
const idEpEscalade = epEsc.id;
await store.acquitterAlerte(ID, 'testeur');
sent = await store.getSentinelle();
verifier('escalade prépa : acquitté au niveau IMPORTANT',
  ouverts(sent, ID)[0].acquitteeLe !== null);
await store.updateEtablissement({ dateEcheanceCapacite: PASSE }); // IMPORTANT → CRITIQUE
sent = await store.rafraichirSentinelle();
epEsc = ouverts(sent, ID)[0];
verifier('escalade : MÊME épisode (continuité, apparueLe préservé)',
  epEsc && epEsc.id === idEpEscalade);
verifier('escalade : snapshot passé à CRITIQUE', epEsc && epEsc.niveau === 'CRITIQUE');
verifier('escalade : acquittement REMIS À ZÉRO (aggravation à revoir)',
  epEsc && epEsc.acquitteeLe === null && epEsc.acquitteePar === null);

// --- Garde-fous d'entrée -------------------------------------------
await verifierRejet('acquitter une alerte inexistante lève',
  store.acquitterAlerte('alr-inexistante-xyz', 'testeur'),
  'Aucune alerte active');
await verifierRejet('acquitter sans identifiant lève',
  store.acquitterAlerte('', 'testeur'),
  'obligatoire');

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
