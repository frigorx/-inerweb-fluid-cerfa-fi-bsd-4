// Suite CONTRACTUELLE des habilitations F-Gas — Phase 1 (modèle de données).
// Doublée demo + local via outils/lancer-tests.mjs. Prouve, à l'identique sur
// les deux stores : CRUD + garde-fous, cumul 2008/2025, révocation historisée,
// champs de rôle sur les mouvements (scellés, HORS empreinte), correspondance
// (module pur), et parité par ÉCHANGE CROISÉ demo↔local.

import {
  correspondance2008Vers2025,
  CORRESPONDANCE_2008_VERS_2025
} from './habilitations.js';

const NOM_STORE = process.argv[2] ?? 'demo';
const AUTRE = NOM_STORE === 'demo' ? 'local' : 'demo';

async function fabriquerStore(nom) {
  switch (nom) {
    case 'demo': {
      const { creerStore } = await import('./datastore.js');
      return await creerStore(); // creerStore appelle init() lui-même
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

const DATE_JOUR = /^\d{4}-\d{2}-\d{2}$/;
const HASH_HEX = /^[0-9a-f]{64}$/;
const PROCHE = (a, b) => Math.abs(a - b) < 1e-9;

const store = await fabriquerStore(NOM_STORE);

console.log(`\n=== Habilitations — store « ${NOM_STORE} » ===\n`);

// --- Monde autonome -----------------------------------------------
const fluides = await store.getFluides();
const fluide = fluides.find((f) => f.code === 'R-410A')
  ?? fluides.find((f) => String(f.famille).includes('HFC'));
const FLUIDE = fluide.code;

const enseignant = await store.createPersonne({
  nom: 'Martin', prenom: 'Prof', typePersonne: 'ENSEIGNANT'
});
const eleve = await store.createPersonne({
  nom: 'Dupont', prenom: 'Élève', typePersonne: 'ELEVE'
});

// --- Création + forme canonique -----------------------------------
const h2008 = await store.createHabilitation({
  personneId: enseignant.id, regime: '2008', categorie: 'II',
  numeroAttestation: 'AA-2008-001', organismeDelivreur: 'Organisme X',
  dateFin: '2026-12-31', operateur: 'testeur'
});
verifier('création : id attribué, actif=true, dateRevocation=null',
  typeof h2008.id === 'string' && h2008.id.length > 0
  && h2008.actif === true && h2008.dateRevocation === null);
verifier('création : régime et catégorie conservés',
  h2008.regime === '2008' && h2008.categorie === 'II');

const hForceActif = await store.createHabilitation({
  personneId: eleve.id, regime: '2025', categorie: 'B', actif: false
});
verifier('création : actif TOUJOURS true (désactivation via révocation seule)',
  hForceActif.actif === true && hForceActif.dateRevocation === null);

const hMinimal = await store.createHabilitation({
  personneId: eleve.id, regime: '2025', categorie: 'A2'
});
verifier('forme canonique : champs optionnels absents → null (pas undefined)',
  hMinimal.numeroAttestation === null && hMinimal.organismeDelivreur === null
  && hMinimal.dateDebut === null && hMinimal.dateFin === null
  && hMinimal.dateRevocation === null);

// --- Garde-fous ----------------------------------------------------
await verifierRejet('création refuse une personne introuvable',
  store.createHabilitation({ personneId: 'per-fantome', regime: '2025', categorie: 'A1' }),
  'Personne introuvable');
await verifierRejet('création refuse un régime inconnu',
  store.createHabilitation({ personneId: eleve.id, regime: '2019', categorie: 'I' }),
  'Régime');
await verifierRejet('création refuse une catégorie 2025 sous le régime 2008',
  store.createHabilitation({ personneId: eleve.id, regime: '2008', categorie: 'A1' }),
  'incohérente');
await verifierRejet('création refuse une catégorie 2008 sous le régime 2025',
  store.createHabilitation({ personneId: eleve.id, regime: '2025', categorie: 'III' }),
  'incohérente');

// --- Cumul multi-régime -------------------------------------------
const h2025 = await store.createHabilitation({
  personneId: enseignant.id, regime: '2025', categorie: 'A1',
  dateFin: '2033-01-01', operateur: 'testeur'
});
{
  const toutes = await store.getHabilitations();
  const pourEnseignant = toutes.filter((h) => h.personneId === enseignant.id);
  verifier('cumul : l’enseignant a 2 habilitations (2008/II + 2025/A1)',
    pourEnseignant.length === 2);
  verifier('tri : la 2025 arrive AVANT la 2008',
    pourEnseignant[0].regime === '2025' && pourEnseignant[1].regime === '2008');
}

// --- Mise à jour : identité intouchable ----------------------------
const h2008Maj = await store.updateHabilitation(h2008.id, {
  numeroAttestation: 'AA-2008-001-bis', dateFin: '2027-06-30', operateur: 'testeur'
});
verifier('update : le n° et la date changent',
  h2008Maj.numeroAttestation === 'AA-2008-001-bis' && h2008Maj.dateFin === '2027-06-30');
verifier('update : régime et catégorie INCHANGÉS',
  h2008Maj.regime === '2008' && h2008Maj.categorie === 'II');
await verifierRejet('update refuse un id introuvable',
  store.updateHabilitation('hab-fantome', { dateFin: '2030-01-01' }),
  'introuvable');

// --- Révocation : jamais de suppression ----------------------------
const h2025Revoquee = await store.revoquerHabilitation(h2025.id, 'testeur');
verifier('révocation : actif=false + dateRevocation au format AAAA-MM-JJ',
  h2025Revoquee.actif === false && DATE_JOUR.test(h2025Revoquee.dateRevocation));
{
  const toutes = await store.getHabilitations();
  verifier('révocation : la ligne RESTE dans getHabilitations (historisée)',
    toutes.some((h) => h.id === h2025.id && h.actif === false));
  verifier('révocation : l’autre habilitation de la personne reste active',
    toutes.some((h) => h.id === h2008.id && h.actif === true));
}
await verifierRejet('révocation refuse un id introuvable',
  store.revoquerHabilitation('hab-fantome', 'testeur'), 'introuvable');
await verifierRejet('double révocation refusée (préserve la date d’origine)',
  store.revoquerHabilitation(h2025.id, 'testeur'), 'déjà révoquée');

// --- Copies indépendantes -----------------------------------------
{
  const toutes = await store.getHabilitations();
  toutes[0].categorie = 'PIRATÉ';
  const relu = await store.getHabilitations();
  verifier('getHabilitations retourne des copies (mutation sans effet)',
    !relu.some((h) => h.categorie === 'PIRATÉ'));
}

// --- Correspondance 2008 → 2025 (module pur) ----------------------
verifier('correspondance III → [D]', correspondance2008Vers2025('III').join(',') === 'D');
verifier('correspondance IV → [E]', correspondance2008Vers2025('IV').join(',') === 'E');
verifier('correspondance I ⊆ {A1,A2}',
  correspondance2008Vers2025('I').every((c) => ['A1', 'A2'].includes(c)));
verifier('correspondance V (n’existe pas en 2008) → []',
  correspondance2008Vers2025('V').length === 0);
verifier('clés de correspondance = exactement I/II/III/IV',
  Object.keys(CORRESPONDANCE_2008_VERS_2025).join(',') === 'I,II,III,IV');

// --- Rôles réels sur un mouvement ---------------------------------
const machine = await store.createMachine({
  designation: 'Groupe froid habilitations', fluide: FLUIDE,
  chargeNominaleKg: 10, operateur: 'testeur'
});
const bouteille = await store.createBouteille({
  type: 'NEUVE', fluide: FLUIDE, tareKg: 10, masseBruteKg: 20, contenanceMaxKg: 12
});

const mvtRoles = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machine.id, bouteilleSrcId: bouteille.id,
  peseeAvantKg: 20, peseeApresKg: 18, technicien: 'testeur',
  causeMouvement: 'Complément (essai habilitations)',
  executeParId: eleve.id, superviseurId: enseignant.id,
  responsableRegistreId: enseignant.id
});
verifier('mouvement : les 3 rôles sont présents au brouillon',
  mvtRoles.executeParId === eleve.id && mvtRoles.superviseurId === enseignant.id
  && mvtRoles.responsableRegistreId === enseignant.id);

const mvtSansRoles = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machine.id, bouteilleSrcId: bouteille.id,
  peseeAvantKg: 18, peseeApresKg: 17, technicien: 'testeur'
});
verifier('mouvement : rôles optionnels → null par défaut',
  mvtSansRoles.executeParId === null && mvtSansRoles.superviseurId === null
  && mvtSansRoles.responsableRegistreId === null);

const mvtRoleVide = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machine.id,
  executeParId: '', superviseurId: '', responsableRegistreId: ''
});
verifier('mouvement : un rôle en chaîne vide devient null (pas de FK crue)',
  mvtRoleVide.executeParId === null && mvtRoleVide.superviseurId === null
  && mvtRoleVide.responsableRegistreId === null);

await verifierRejet('mouvement : un rôle référençant une personne inconnue est refusé',
  store.creerMouvement({ type: 'CHARGE_APPOINT', machineId: machine.id,
    executeParId: 'per-fantome' }), 'Personne introuvable');

// Non-confusion : désigner l'élève comme exécutant NE l'autorise PAS à valider.
await store.soumettreMouvement(mvtRoles.id);
await verifierRejet('non-confusion : l’élève exécutant ne peut PAS valider',
  store.validerMouvement(mvtRoles.id, eleve.id));
const mvtValide = await store.validerMouvement(mvtRoles.id, enseignant.id);
verifier('mouvement : scellé après validation (hash 64 hex)',
  HASH_HEX.test(mvtValide.hashEcriture));
verifier('mouvement : les rôles survivent au scellement',
  mvtValide.executeParId === eleve.id && mvtValide.superviseurId === enseignant.id
  && mvtValide.responsableRegistreId === enseignant.id);
verifier('mouvement : quantité calculée des pesées (+2 kg)',
  PROCHE(mvtValide.quantiteKg, 2));

// --- Parité : ÉCHANGE CROISÉ demo ↔ local -------------------------
// Prouve que les rôles HORS empreinte ne cassent pas la chaîne d'un store
// à l'autre, et que l'export emporte bien les habilitations.
{
  const paquet = await store.exporterJSON(); // déjà une CHAÎNE JSON
  const autre = await fabriquerStore(AUTRE);
  const adopte = await autre.importerJSON(paquet);
  verifier(`échange croisé (${NOM_STORE}→${AUTRE}) : import adopté`, adopte === true);
  const chaine = await autre.verifierChaineHash();
  verifier('échange croisé : la chaîne de hash reste INTACTE (rôles hors empreinte)',
    chaine.ok === true);
  const habAutre = await autre.getHabilitations();
  verifier('échange croisé : les habilitations ont voyagé',
    habAutre.some((h) => h.regime === '2008' && h.categorie === 'II')
    && habAutre.some((h) => h.id === h2025.id && h.actif === false));
  const mvtAutre = (await autre.getMouvements()).find((m) => m.id === mvtRoles.id);
  verifier('échange croisé : les rôles du mouvement scellé ont voyagé',
    mvtAutre && mvtAutre.executeParId === eleve.id
    && mvtAutre.responsableRegistreId === enseignant.id);
}

// --- Import d'un registre FORGÉ : refusé (parité stricte) ----------
// Le DemoStore doit rejeter EXACTEMENT ce que le serveur rejette (CHECK
// composite + FK). Sinon une « source de vérité » ingère une habilitation
// que l'autre refuse.
{
  const forger = async (entree) => {
    const paquet = JSON.parse(await store.exporterJSON());
    paquet.donnees.habilitations.push({
      id: 'HAB-FORGE', personneId: enseignant.id, regime: '2008',
      categorie: 'II', numeroAttestation: null, organismeDelivreur: null,
      dateDebut: null, dateFin: null, actif: true, dateRevocation: null,
      ...entree
    });
    return JSON.stringify(paquet);
  };
  const cibleA = await fabriquerStore(NOM_STORE);
  await verifierRejet('import refusé : catégorie 2025 sous régime 2008 (incohérente)',
    cibleA.importerJSON(await forger({ regime: '2008', categorie: 'A1' })),
    'incohérente');
  const cibleB = await fabriquerStore(NOM_STORE);
  await verifierRejet('import refusé : habilitation orpheline (personne inconnue)',
    cibleB.importerJSON(await forger({ personneId: 'per-fantome' })),
    'introuvable');
  // Renforts de la revue brique 1 (les DROITS dépendent de `actif` : un champ
  // absent serait actif par défaut côté SQL, inactif côté démo).
  const cibleC = await fabriquerStore(NOM_STORE);
  await verifierRejet('import refusé : habilitation sans champ actif (droits divergents)',
    cibleC.importerJSON(await forger({ actif: undefined })),
    'actif non booléen');
  const cibleD = await fabriquerStore(NOM_STORE);
  await verifierRejet('import refusé : habilitation révoquée sans date de révocation',
    cibleD.importerJSON(await forger({ actif: false })),
    'sans date de révocation');
  const cibleE = await fabriquerStore(NOM_STORE);
  {
    const paquet = JSON.parse(await store.exporterJSON());
    const ligne = { id: 'HAB-DOUBLE', personneId: enseignant.id, regime: '2008',
      categorie: 'II', numeroAttestation: null, organismeDelivreur: null,
      dateDebut: null, dateFin: null, actif: true, dateRevocation: null };
    paquet.donnees.habilitations.push(ligne, { ...ligne });
    await verifierRejet('import refusé : deux habilitations sous le même id',
      cibleE.importerJSON(JSON.stringify(paquet)), 'id en double');
  }
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
