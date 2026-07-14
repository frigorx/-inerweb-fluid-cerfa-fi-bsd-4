// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// Suite CONTRACTUELLE des mentions de formation complémentaire — chantier B2,
// Phase 2b brique 1. Doublée demo + local via outils/lancer-tests.mjs. Prouve,
// à l'identique sur les deux stores : CRUD + garde-fous, cumul/renouvellement,
// tri contractuel, révocation historisée, BRANCHEMENT du moteur de conseil
// (getMentions → jetonsMentionsActives → verifierDroitIntervention), et
// parité par ÉCHANGE CROISÉ demo↔local.

import {
  FLUIDES_MENTION,
  jetonsMentionsActives,
  verifierDroitIntervention,
  estIntervenantIdentifiable
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

const store = await fabriquerStore(NOM_STORE);

console.log(`\n=== Mentions de formation complémentaire — store « ${NOM_STORE} » ===\n`);

// --- Monde autonome -----------------------------------------------
// L'enseignant est un « ancien » I (2008) : le cas nominal de Franck —
// un stage CO₂ (mention) étend son champ au CO₂. L'élève, I sans mention,
// sert de témoin.
const enseignant = await store.createPersonne({
  nom: 'Martin', prenom: 'Prof', typePersonne: 'ENSEIGNANT'
});
const eleve = await store.createPersonne({
  nom: 'Dupont', prenom: 'Élève', typePersonne: 'ELEVE'
});
await store.createHabilitation({
  personneId: enseignant.id, regime: '2008', categorie: 'I',
  operateur: 'testeur'
});
await store.createHabilitation({
  personneId: eleve.id, regime: '2008', categorie: 'I', operateur: 'testeur'
});

// --- Création + forme canonique -----------------------------------
const mCo2 = await store.createMention({
  personneId: enseignant.id, fluideMention: 'CO2',
  numeroAttestation: 'MEN-CO2-001', organismeDelivreur: 'Organisme Y',
  dateFin: '2028-06-30', operateur: 'testeur'
});
verifier('création : id attribué, actif=true, dateRevocation=null',
  typeof mCo2.id === 'string' && mCo2.id.length > 0
  && mCo2.actif === true && mCo2.dateRevocation === null);
verifier('création : personne et fluide conservés',
  mCo2.personneId === enseignant.id && mCo2.fluideMention === 'CO2');

const mForceActif = await store.createMention({
  personneId: enseignant.id, fluideMention: 'NH3', actif: false
});
verifier('création : actif TOUJOURS true (désactivation via révocation seule)',
  mForceActif.actif === true && mForceActif.dateRevocation === null);

const mMinimal = await store.createMention({
  personneId: eleve.id, fluideMention: 'HC'
});
verifier('forme canonique : champs optionnels absents → null (pas undefined)',
  mMinimal.numeroAttestation === null && mMinimal.organismeDelivreur === null
  && mMinimal.dateDebut === null && mMinimal.dateFin === null
  && mMinimal.dateRevocation === null);

// --- Garde-fous ----------------------------------------------------
await verifierRejet('création refuse une personne introuvable',
  store.createMention({ personneId: 'per-fantome', fluideMention: 'CO2' }),
  'Personne introuvable');
await verifierRejet('création refuse un fluide hors référentiel (code fluide ≠ mention)',
  store.createMention({ personneId: eleve.id, fluideMention: 'R-744' }),
  'Fluide de mention inconnu');
await verifierRejet('création refuse un fluide de mention absent',
  store.createMention({ personneId: eleve.id }),
  'Fluide de mention inconnu');

// --- Cumul + renouvellement ----------------------------------------
// L'ordre de CRÉATION (2028, puis 2030, puis sans échéance) est VOLONTAIREMENT
// l'inverse de l'ordre de tri attendu (null, 2030, 2028) : un comparateur qui
// laisserait faire le tri stable (ordre d'insertion) ferait rougir la suite —
// constat IMPORTANT 1 de la revue (test tautologique).
const mCo2Renouvelee = await store.createMention({
  personneId: enseignant.id, fluideMention: 'CO2', dateFin: '2030-12-31',
  operateur: 'testeur'
});
const mCo2SansFin = await store.createMention({
  personneId: enseignant.id, fluideMention: 'CO2', operateur: 'testeur'
});
{
  const toutes = await store.getMentions();
  const pourEnseignant = toutes.filter((m) => m.personneId === enseignant.id);
  verifier('cumul : l’enseignant a 4 mentions (3 × CO2 renouvelée + NH3)',
    pourEnseignant.length === 4);
}

// --- Tri contractuel ------------------------------------------------
{
  const toutes = await store.getMentions();
  const fluidesTries = toutes.map((m) => m.fluideMention);
  const attendu = [...fluidesTries]
    .sort((a, b) => FLUIDES_MENTION.indexOf(a) - FLUIDES_MENTION.indexOf(b));
  verifier('tri : CO2 avant NH3 avant HC (ordre du référentiel)',
    fluidesTries.join(',') === attendu.join(','));
  // Filtré par la personne du test : le monde de démo sème désormais ses
  // propres mentions (réserve B2, 14/07) — le tri étant TOTAL, l'ordre
  // relatif des mentions de l'enseignant reste contractuel.
  const co2 = toutes.filter((m) =>
    m.fluideMention === 'CO2' && m.personneId === enseignant.id);
  verifier('tri : à fluide égal, sans échéance EN TÊTE puis dateFin décroissante',
    co2.length === 3 && co2[0].dateFin === null
    && co2[0].id === mCo2SansFin.id
    && co2[1].dateFin === '2030-12-31' && co2[1].id === mCo2Renouvelee.id
    && co2[2].dateFin === '2028-06-30' && co2[2].id === mCo2.id);
}

// --- Branchement du MOTEUR de conseil (le but de la brique) ---------
// Le cas nominal de Franck : un ancien I + stage CO₂ peut intervenir sur
// une machine au R-744 ; sans la mention, le moteur refuse et conseille
// la formation complémentaire.
{
  const habilitations = (await store.getHabilitations())
    .filter((h) => h.personneId === enseignant.id && h.actif);
  const mentions = jetonsMentionsActives((await store.getMentions())
    .filter((m) => m.personneId === enseignant.id));
  verifier('jetonsMentionsActives : les jetons sont des chaînes canoniques',
    mentions.every((j) => FLUIDES_MENTION.includes(j)) && mentions.includes('CO2'));

  const verdictAvec = verifierDroitIntervention({
    habilitations, mentions, operation: 'MAINTENANCE', familleFluide: 'CO2'
  });
  verifier('moteur : I(2008) + mention CO2 → intervention sur CO₂ AUTORISÉE',
    verdictAvec.autorise === true);

  const verdictNh3 = verifierDroitIntervention({
    habilitations, mentions, operation: 'MAINTENANCE', familleFluide: 'NH3'
  });
  verifier('moteur : I(2008) + mention NH3 → intervention sur NH₃ AUTORISÉE',
    verdictNh3.autorise === true);

  const habilitationsEleve = (await store.getHabilitations())
    .filter((h) => h.personneId === eleve.id && h.actif);
  const mentionsEleve = jetonsMentionsActives((await store.getMentions())
    .filter((m) => m.personneId === eleve.id));
  const verdictHc = verifierDroitIntervention({
    habilitations: habilitationsEleve, mentions: mentionsEleve,
    operation: 'MAINTENANCE', familleFluide: 'HC'
  });
  verifier('moteur : I(2008) + mention HC → intervention sur HC AUTORISÉE',
    verdictHc.autorise === true);
  // La mention HC n'étend PAS au CO₂ : le refus reste ciblé par fluide.
  const verdictSans = verifierDroitIntervention({
    habilitations: habilitationsEleve, mentions: mentionsEleve,
    operation: 'MAINTENANCE', familleFluide: 'CO2'
  });
  verifier('moteur : I(2008) sans mention CO2 → intervention sur CO₂ REFUSÉE',
    verdictSans.autorise === false && verdictSans.gravite === 'REFUS');
  verifier('moteur : le conseil nomme la formation complémentaire CO₂',
    String(verdictSans.conseil).includes('formation complémentaire CO₂'));

  verifier('identifiabilité : personne active + mention seule → identifiable',
    estIntervenantIdentifiable({ actif: true }, [],
      (await store.getMentions()).filter((m) =>
        m.personneId === enseignant.id && m.actif)) === true);
}

// --- Révocation : jamais de suppression ----------------------------
const mNh3Revoquee = await store.revoquerMention(mForceActif.id, 'testeur');
verifier('révocation : actif=false + dateRevocation au format AAAA-MM-JJ',
  mNh3Revoquee.actif === false && DATE_JOUR.test(mNh3Revoquee.dateRevocation));
{
  const toutes = await store.getMentions();
  verifier('révocation : la ligne RESTE dans getMentions (historisée)',
    toutes.some((m) => m.id === mForceActif.id && m.actif === false));
  verifier('révocation : les autres mentions de la personne restent actives',
    toutes.some((m) => m.id === mCo2.id && m.actif === true));
}
await verifierRejet('révocation refuse un id introuvable',
  store.revoquerMention('men-fantome', 'testeur'), 'introuvable');
await verifierRejet('double révocation refusée (préserve la date d’origine)',
  store.revoquerMention(mForceActif.id, 'testeur'), 'déjà révoquée');

// Une mention révoquée ne donne PLUS le droit (jetons actifs seulement).
{
  const jetons = jetonsMentionsActives((await store.getMentions())
    .filter((m) => m.personneId === enseignant.id));
  verifier('révocation : le jeton NH3 révoqué disparaît des mentions actives',
    !jetons.includes('NH3') && jetons.includes('CO2'));
}

// --- Copies indépendantes -----------------------------------------
{
  const toutes = await store.getMentions();
  toutes[0].fluideMention = 'PIRATÉ';
  const relu = await store.getMentions();
  verifier('getMentions retourne des copies (mutation sans effet)',
    !relu.some((m) => m.fluideMention === 'PIRATÉ'));
}

// --- Parité : ÉCHANGE CROISÉ demo ↔ local -------------------------
{
  const paquet = await store.exporterJSON(); // déjà une CHAÎNE JSON
  const autre = await fabriquerStore(AUTRE);
  const adopte = await autre.importerJSON(paquet);
  verifier(`échange croisé (${NOM_STORE}→${AUTRE}) : import adopté`, adopte === true);
  const mentionsAutre = await autre.getMentions();
  verifier('échange croisé : les mentions actives ont voyagé',
    mentionsAutre.some((m) => m.id === mCo2.id && m.actif === true
      && m.fluideMention === 'CO2' && m.numeroAttestation === 'MEN-CO2-001'));
  verifier('échange croisé : la mention RÉVOQUÉE a voyagé (historique complet)',
    mentionsAutre.some((m) => m.id === mForceActif.id && m.actif === false
      && DATE_JOUR.test(m.dateRevocation)));
}

// --- Import d'un registre FORGÉ : refusé (parité stricte) ----------
// Le DemoStore doit rejeter EXACTEMENT ce que le serveur rejette (CHECK
// fluide + FK personne).
{
  const forger = async (entree) => {
    const paquet = JSON.parse(await store.exporterJSON());
    paquet.donnees.mentionsHabilitation.push({
      id: 'MEN-FORGE', personneId: enseignant.id, fluideMention: 'CO2',
      numeroAttestation: null, organismeDelivreur: null,
      dateDebut: null, dateFin: null, actif: true, dateRevocation: null,
      ...entree
    });
    return JSON.stringify(paquet);
  };
  const cibleA = await fabriquerStore(NOM_STORE);
  await verifierRejet('import refusé : fluide de mention hors référentiel',
    cibleA.importerJSON(await forger({ fluideMention: 'R-32' })),
    'inconnu');
  const cibleB = await fabriquerStore(NOM_STORE);
  await verifierRejet('import refusé : mention orpheline (personne inconnue)',
    cibleB.importerJSON(await forger({ personneId: 'per-fantome' })),
    'introuvable');
  // Constat IMPORTANT 1 de la revue : `actif` absent serait actif par
  // DÉFAUT côté SQL mais inactif côté démo → droits divergents. Refusé.
  const cibleC = await fabriquerStore(NOM_STORE);
  await verifierRejet('import refusé : mention sans champ actif (droits divergents)',
    cibleC.importerJSON(await forger({ actif: undefined })),
    'actif non booléen');
  const cibleD = await fabriquerStore(NOM_STORE);
  await verifierRejet('import refusé : mention révoquée sans date de révocation',
    cibleD.importerJSON(await forger({ actif: false })),
    'sans date de révocation');
  // Constat IMPORTANT 2 : la PRIMARY KEY doit être refusée AVANT SQLite
  // (sinon la démo adopte ce que le serveur rejette en anglais brut).
  const cibleE = await fabriquerStore(NOM_STORE);
  {
    const paquet = JSON.parse(await store.exporterJSON());
    const ligne = { id: 'MEN-DOUBLE', personneId: enseignant.id,
      fluideMention: 'CO2', numeroAttestation: null, organismeDelivreur: null,
      dateDebut: null, dateFin: null, actif: true, dateRevocation: null };
    paquet.donnees.mentionsHabilitation.push(ligne, { ...ligne });
    await verifierRejet('import refusé : deux mentions sous le même id',
      cibleE.importerJSON(JSON.stringify(paquet)), 'id en double');
  }
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
