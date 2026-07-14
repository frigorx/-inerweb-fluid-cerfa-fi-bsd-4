// ============================================================
// Test du moteur « audit guidé » (parcours linéaire d'audit).
// Exécution : node v8/js/data/test-audit-guide.mjs [demo|local]
//
// Deux volets :
//   A. evaluerAuditGuide PUR (entrées forgées) : ordre des étapes,
//      couverture des familles d'alertes (⊇ feu tricolore), barème
//      hérité, registre rompu, zéro perte, faits de présence.
//   B. collecterAuditGuide contre le STORE RÉEL : structure, zéro
//      perte face à getAlertes, cohérence avec le feu tricolore.
//      Comme la collecte n'utilise que le contrat, la parité
//      Démo/Local se prouve en lançant les deux.
//
// Node ≥ 18, sans DOM.
// ============================================================

import { ETAPES, evaluerAuditGuide, faitsPourEtape, collecterAuditGuide }
  from './audit-guide.js';
import { DOMAINES } from './feu-tricolore.js';

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

const REGISTRE_SAIN = { ok: true, casseA: null };
const OFFICIEL_OK = { ok: true, motifs: [] };

// ============================================================
// A. Évaluation PURE
// ============================================================
console.log('--- A. evaluerAuditGuide (pur) ---');

// --- Ordre et forme des étapes (le parcours voulu par Franck) ------
{
  const ordre = ETAPES.map((e) => e.id).join(',');
  verifier('9 étapes dans l’ordre du parcours d’audit',
    ordre === 'etablissement,personnel,outillage,bouteilles,mouvements,'
      + 'controles,dechets,balance,export', ordre);
  verifier('8 étapes évaluées + 1 étape ACTION finale (l’export)',
    ETAPES.filter((e) => e.type === 'controle').length === 8
    && ETAPES[ETAPES.length - 1].type === 'action');
  verifier('chaque étape porte vue, libellé, consigne et description',
    ETAPES.every((e) => e.vue && e.vueLibelle && e.detail && e.aFaire));
}

// --- Couverture : rien de connu du feu tricolore n'échappe ---------
{
  const prefixesEtapes = new Set(ETAPES.flatMap((e) => e.prefixes));
  const prefixesDomaines = DOMAINES.flatMap((d) => d.prefixes);
  verifier('les préfixes du feu tricolore sont TOUS couverts par une étape',
    prefixesDomaines.every((p) => prefixesEtapes.has(p)),
    prefixesDomaines.filter((p) => !prefixesEtapes.has(p)).join(', '));
}

// --- Tout sain ------------------------------------------------------
{
  const r = evaluerAuditGuide(
    { alertes: [], registre: REGISTRE_SAIN, officiel: OFFICIEL_OK, comptes: null });
  verifier('tout sain : 8 étapes vertes sur 8, global VERT',
    r.nbVertes === 8 && r.nbEvaluees === 8 && r.global === 'VERT');
  verifier('tout sain : l’étape export n’a pas d’état (action)',
    r.etapes[8].etat === null);
  verifier('tout sain : numérotation 1 → 9',
    r.etapes.map((e) => e.numero).join(',') === '1,2,3,4,5,6,7,8,9');
  verifier('comptes absents : aucune phrase de faits (tolérant)',
    r.etapes.every((e) => e.faits.length === 0));
}

// --- Rattachement des familles d'alertes aux étapes -----------------
{
  const alertes = [
    { id: 'alr-capacite', niveau: 'CRITIQUE', titre: 'Capacité échue' },
    { id: 'alr-habilitation-h1', niveau: 'IMPORTANT', titre: 'Habilitation bientôt échue' },
    { id: 'alr-outil-o1', niveau: 'CRITIQUE', titre: 'Détecteur expiré' },
    { id: 'alr-pesee-b1', niveau: 'IMPORTANT', titre: 'Pesée ancienne' },
    { id: 'alr-soumis-m1', niveau: 'IMPORTANT', titre: 'Mouvement soumis en attente' },
    { id: 'alr-controle-m2', niveau: 'CRITIQUE', titre: 'Contrôle en retard' },
    { id: 'alr-fuite-m3', niveau: 'CRITIQUE', titre: 'Fuite non résolue' },
    { id: 'alr-garde-b2', niveau: 'IMPORTANT', titre: 'Délai de garde proche' },
    { id: 'alr-ecart-2026', niveau: 'IMPORTANT', titre: 'Écart non justifié' }
  ];
  const r = evaluerAuditGuide(
    { alertes, registre: REGISTRE_SAIN, officiel: OFFICIEL_OK, comptes: null });
  const parId = new Map(r.etapes.map((e) => [e.id, e]));
  verifier('alr-capacite → étape établissement, ROUGE (critique)',
    parId.get('etablissement').alertes.length === 1
    && parId.get('etablissement').etat === 'ROUGE');
  verifier('alr-habilitation- → étape personnel, ORANGE (important)',
    parId.get('personnel').alertes.length === 1
    && parId.get('personnel').etat === 'ORANGE');
  verifier('alr-outil- → étape outillage, ROUGE',
    parId.get('outillage').alertes.length === 1
    && parId.get('outillage').etat === 'ROUGE');
  verifier('alr-pesee- → étape bouteilles ; alr-garde- → étape déchets (séparés)',
    parId.get('bouteilles').alertes.length === 1
    && parId.get('dechets').alertes.length === 1);
  verifier('alr-soumis- → étape mouvements, ORANGE',
    parId.get('mouvements').alertes.length === 1
    && parId.get('mouvements').etat === 'ORANGE');
  verifier('alr-controle- ET alr-fuite- → étape contrôles, ROUGE',
    parId.get('controles').alertes.length === 2
    && parId.get('controles').etat === 'ROUGE');
  verifier('alr-ecart- → étape balance, ORANGE',
    parId.get('balance').alertes.length === 1
    && parId.get('balance').etat === 'ORANGE');
  verifier('global = pire des étapes (ROUGE)', r.global === 'ROUGE');
  const total = r.etapes.reduce((s, e) => s + e.alertes.length, 0)
    + r.nonRattachees.length;
  verifier('zéro perte : chaque alerte est comptée une seule fois',
    total === alertes.length, `réparties + restantes = ${total}`);
  verifier('résumé français sur une étape rouge',
    parId.get('controles').resume.includes('bloquant'));
}

// --- Alerte inconnue : signalée, jamais avalée ----------------------
{
  const r = evaluerAuditGuide({
    alertes: [{ id: 'alr-nouveaute-x', niveau: 'CRITIQUE', titre: 'Famille future' }],
    registre: REGISTRE_SAIN, officiel: OFFICIEL_OK, comptes: null
  });
  verifier('alerte d’une famille inconnue → nonRattachees (pas perdue)',
    r.nonRattachees.length === 1
    && r.etapes.every((e) => e.alertes.length === 0));
  verifier('famille inconnue CRITIQUE : le global est ROUGE (jamais « prêt »)',
    r.global === 'ROUGE');
  const r2 = evaluerAuditGuide({
    alertes: [{ id: 'alr-nouveaute-x', niveau: 'IMPORTANT', titre: 'Famille future' }],
    registre: REGISTRE_SAIN, officiel: OFFICIEL_OK, comptes: null
  });
  verifier('famille inconnue IMPORTANTE : le global est ORANGE',
    r2.global === 'ORANGE');
}

// --- Registre rompu --------------------------------------------------
{
  const r = evaluerAuditGuide({
    alertes: [], registre: { ok: false, casseA: 'FI-2026-0003' },
    officiel: OFFICIEL_OK, comptes: null
  });
  const mouvements = r.etapes.find((e) => e.id === 'mouvements');
  verifier('registre rompu : étape mouvements ROUGE avec constat dédié',
    mouvements.etat === 'ROUGE'
    && mouvements.alertes[0].titre === 'Chaîne du registre rompue'
    && mouvements.alertes[0].detail.includes('FI-2026-0003'));
  verifier('registre rompu : global ROUGE, registreIntact faux',
    r.global === 'ROUGE' && r.registreIntact === false);
}

// --- Garde-fou « jamais tout vert » ----------------------------------
{
  const r = evaluerAuditGuide({
    alertes: [], registre: REGISTRE_SAIN,
    officiel: { ok: false, motifs: ['Aucune attestation de capacité renseignée.'] },
    comptes: null
  });
  verifier('prérequis Officiel manquants sans alerte : global ORANGE',
    r.global === 'ORANGE');
  verifier('les motifs Officiel sont restitués',
    r.officiel.ok === false && r.officiel.motifs.length === 1);
}

// --- Faits de présence ------------------------------------------------
{
  const comptes = {
    attestationCapacite: true, echeanceCapacite: '2027-03-14',
    nbPersonnesActives: 4, nbPersonnesAptes: 2,
    nbOutils: 1, nbOutilsConformes: 1,
    nbBouteillesStock: 5,
    nbMouvements: 7, nbEnSouffrance: 0,
    nbMachines: 6, nbControles: 3,
    nbBsff: 0, nbBouteillesRecuperation: 1
  };
  verifier('établissement : attestation + échéance formatée en français',
    faitsPourEtape('etablissement', comptes)[0]
      === 'Attestation de capacité renseignée (échéance le 14/03/2027).');
  verifier('établissement : attestation absente DITE explicitement',
    faitsPourEtape('etablissement', { ...comptes, attestationCapacite: false })[0]
      .includes('NON renseignée'));
  verifier('personnel : compteurs actifs + attestations au registre',
    faitsPourEtape('personnel', comptes)[0]
      === '4 personnes actives au registre, dont 2 avec une attestation ou habilitation au registre.');
  verifier('personnel : registre vide DIT explicitement',
    faitsPourEtape('personnel', { ...comptes, nbPersonnesActives: 0 })[0]
      === 'Aucune personne au registre du personnel.');
  verifier('outillage : accord au singulier (1 outil)',
    faitsPourEtape('outillage', comptes)[0] === '1 outil au registre, 1 conforme.');
  verifier('contrôles : machines du parc + contrôles enregistrés',
    faitsPourEtape('controles', comptes)[0]
      === '6 machines au parc, 3 contrôles d’étanchéité enregistrés.');
  verifier('mouvements : les non validés distinguent brouillon/soumis au libellé',
    faitsPourEtape('mouvements', comptes)[0]
      === '7 mouvements au registre, 0 encore non validé (brouillon ou soumis).');
  verifier('déchets : BSFF toujours dit, bouteilles de récupération seulement si > 0',
    faitsPourEtape('dechets', comptes).length === 2
    && faitsPourEtape('dechets', comptes)[1]
      === '1 bouteille de fluide récupéré à suivre (décision, délai de garde, BSFF).'
    && faitsPourEtape('dechets', { ...comptes, nbBouteillesRecuperation: 0 }).length === 1);
  verifier('comptes null → aucune phrase', faitsPourEtape('personnel', null).length === 0);
}

// ============================================================
// B. Collecte contre le STORE RÉEL
// ============================================================
console.log(`--- B. collecterAuditGuide (store ${NOM_STORE}) ---`);

const store = await fabriquerStore(NOM_STORE);
const resultat = await collecterAuditGuide(store);
const alertesStore = await store.getAlertes();

verifier('collecte : 9 étapes, états valides',
  resultat.etapes.length === 9
  && resultat.etapes.slice(0, 8).every((e) =>
    ['VERT', 'ORANGE', 'ROUGE'].includes(e.etat)));
verifier('collecte : registre intact sur un store de test',
  resultat.registreIntact === true);
{
  const total = resultat.etapes.reduce((s, e) => s + e.alertes.length, 0)
    + resultat.nonRattachees.length;
  verifier('collecte : zéro perte face à getAlertes()',
    total === alertesStore.length,
    `réparties + restantes = ${total}, alertes = ${alertesStore.length}`);
}
verifier('collecte : toute étape portant une CRITIQUE est ROUGE',
  resultat.etapes.filter((e) => e.type === 'controle')
    .every((e) => !e.alertes.some((a) => a.niveau === 'CRITIQUE')
      || e.etat === 'ROUGE'));
verifier('collecte : chaque étape évaluée porte des faits ou un résumé',
  resultat.etapes.filter((e) => e.type === 'controle')
    .every((e) => typeof e.resume === 'string' && Array.isArray(e.faits)));

if (NOM_STORE === 'demo') {
  // Le monde de démo est connu : le câblage réel se vérifie sur pièces.
  const parId = new Map(resultat.etapes.map((e) => [e.id, e]));
  verifier('démo : établissement VERT (attestation à jour)',
    parId.get('etablissement').etat === 'VERT');
  verifier('démo : outillage ROUGE (détecteurs expirés)',
    parId.get('outillage').etat === 'ROUGE');
  verifier('démo : contrôles ROUGE (retard + fuite non résolue)',
    parId.get('controles').etat === 'ROUGE');
  verifier('démo : faits — 6 machines au parc, 3 contrôles',
    parId.get('controles').faits[0]
      === '6 machines au parc, 3 contrôles d’étanchéité enregistrés.');
  verifier('démo : faits — 5 bouteilles en stock',
    parId.get('bouteilles').faits[0] === '5 bouteilles en stock.');
  verifier('démo : faits — 4 personnes actives dont 2 attestées (semis B2)',
    parId.get('personnel').faits[0]
      === '4 personnes actives au registre, dont 2 avec une attestation ou habilitation au registre.');
  verifier('démo : faits — 1 bouteille de fluide récupéré à suivre (même définition que la vue Déchets)',
    parId.get('dechets').faits.some((f) => f.includes('à suivre')));
  verifier('démo : global ROUGE (les 4 critiques du monde fictif)',
    resultat.global === 'ROUGE');
}

// --- Verdict -------------------------------------------------
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Tous les tests passent.');
