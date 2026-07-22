// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test du moteur « feu tricolore » (brique ① conformité).
// Exécution : node v8/js/data/test-feu-tricolore.mjs [demo|local]
//
// Deux volets :
//   A. evaluerConformite PUR (entrées forgées) : barème des feux,
//      filet des alertes inconnues, registre rompu, garde-fou
//      « jamais vert si prérequis Officiel manquants », zéro perte.
//   B. collecterConformite contre le STORE RÉEL (monde construit via
//      les mutations du contrat, comme test-contrat) : cohérence avec
//      getAlertes/peutPasserEnOfficiel, rattachement des familles
//      d'alertes aux bons domaines. Comme la collecte n'utilise que
//      le contrat, la parité Démo/Local se prouve en lançant les deux.
//
// ATTENTION : le volet B ÉCRIT dans le store cible — contre un store
// persistant, base JETABLE uniquement (le harnais local s'en charge).
// Node ≥ 18, sans DOM.
// ============================================================

import { DOMAINES, evaluerConformite, collecterConformite }
  from './feu-tricolore.js';

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

/** Date ISO à `n` jours d'aujourd'hui (négatif = passé). */
function dateRelative(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const REGISTRE_SAIN = { ok: true, casseA: null };
const OFFICIEL_OK = { ok: true, motifs: [] };

// ============================================================
// A. Évaluation PURE
// ============================================================
console.log('--- A. evaluerConformite (pur) ---');

{
  const r = evaluerConformite(
    { alertes: [], registre: REGISTRE_SAIN, officiel: OFFICIEL_OK });
  verifier('tout sain : feu global VERT', r.global === 'VERT');
  verifier('tout sain : les 7 domaines prévus, tous VERT',
    r.domaines.length === DOMAINES.length
    && r.domaines.every((d) => d.etat === 'VERT'));
  verifier('tout sain : registre intact, zéro alerte comptée',
    r.registreIntact === true && r.nbCritiques === 0 && r.nbImportantes === 0);
}

{
  const r = evaluerConformite({
    alertes: [], registre: REGISTRE_SAIN,
    officiel: { ok: false, motifs: ['Aucune attestation de capacité renseignée pour l’établissement.'] }
  });
  verifier('prérequis Officiel manquants sans alerte : global ORANGE (jamais vert)',
    r.global === 'ORANGE');
  verifier('les motifs Officiel sont restitués tels quels',
    r.officiel.ok === false && r.officiel.motifs.length === 1);
}

{
  const r = evaluerConformite({
    alertes: [
      { id: 'alr-capacite', niveau: 'CRITIQUE', titre: 'Attestation de capacité expirée' },
      { id: 'alr-aptitude-PER-1', niveau: 'IMPORTANT', titre: 'Aptitude à renouveler' },
      { id: 'alr-fuite-M-1', niveau: 'CRITIQUE', titre: 'Fuite non résolue' },
      { id: 'alr-pesee-B-1', niveau: 'IMPORTANT', titre: 'Bouteille sans pesée récente' }
    ],
    registre: REGISTRE_SAIN, officiel: OFFICIEL_OK
  });
  const parId = Object.fromEntries(r.domaines.map((d) => [d.id, d]));
  verifier('alr-capacite → domaine établissement ROUGE',
    parId.etablissement.etat === 'ROUGE');
  verifier('alr-aptitude-* → domaine personnel ORANGE',
    parId.personnel.etat === 'ORANGE');
  // Chantier B2 : les échéances d'habilitations et de mentions relèvent
  // du domaine personnel (jamais du filet « autres »).
  const rB2 = evaluerConformite({
    alertes: [
      { id: 'alr-habilitation-HAB-1', niveau: 'CRITIQUE', titre: 'Habilitation F-Gas expirée' },
      { id: 'alr-mention-MEN-1', niveau: 'IMPORTANT', titre: 'Mention CO₂ à renouveler' }
    ],
    registre: REGISTRE_SAIN, officiel: OFFICIEL_OK
  });
  const parIdB2 = Object.fromEntries(rB2.domaines.map((d) => [d.id, d]));
  verifier('alr-habilitation-* et alr-mention-* → domaine personnel ROUGE',
    parIdB2.personnel.etat === 'ROUGE'
    && parIdB2.personnel.alertes.length === 2
    && !rB2.domaines.some((d) => d.id === 'autres'));
  verifier('alr-fuite-* → domaine contrôles ROUGE',
    parId.controles.etat === 'ROUGE');
  verifier('alr-pesee-* → domaine bouteilles ORANGE',
    parId.bouteilles.etat === 'ORANGE');
  verifier('global = pire des domaines (ROUGE)', r.global === 'ROUGE');
  verifier('compteurs : 2 critiques, 2 importantes',
    r.nbCritiques === 2 && r.nbImportantes === 2);
  verifier('résumé du domaine rouge en français',
    parId.etablissement.resume.includes('bloquant'));
}

{
  // Filet : une famille d'alertes inconnue ne disparaît JAMAIS.
  const r = evaluerConformite({
    alertes: [{ id: 'alr-famille-future-1', niveau: 'CRITIQUE', titre: 'Nouveauté' }],
    registre: REGISTRE_SAIN, officiel: OFFICIEL_OK
  });
  const autres = r.domaines.find((d) => d.id === 'autres');
  verifier('alerte à préfixe inconnu → domaine « autres » présent',
    Boolean(autres) && autres.alertes.length === 1);
  verifier('le domaine « autres » pèse sur le global (ROUGE)',
    r.global === 'ROUGE');
}

{
  // Zéro perte : chaque alerte atterrit dans EXACTEMENT un domaine.
  const alertes = [
    { id: 'alr-capacite', niveau: 'IMPORTANT', titre: 'a' },
    { id: 'alr-aptitude-1', niveau: 'IMPORTANT', titre: 'b' },
    { id: 'alr-controle-1', niveau: 'CRITIQUE', titre: 'c' },
    { id: 'alr-fuite-1', niveau: 'CRITIQUE', titre: 'd' },
    { id: 'alr-outil-1', niveau: 'CRITIQUE', titre: 'e' },
    { id: 'alr-ecart-2026-R-32', niveau: 'CRITIQUE', titre: 'f' },
    { id: 'alr-garde-1', niveau: 'CRITIQUE', titre: 'g' },
    { id: 'alr-pesee-1', niveau: 'IMPORTANT', titre: 'h' },
    { id: 'alr-soumis-1', niveau: 'IMPORTANT', titre: 'i' },
    { id: 'alr-brouillon-1', niveau: 'IMPORTANT', titre: 'j' },
    { id: 'alr-inconnu-1', niveau: 'IMPORTANT', titre: 'k' }
  ];
  const r = evaluerConformite(
    { alertes, registre: REGISTRE_SAIN, officiel: OFFICIEL_OK });
  const total = r.domaines.reduce((n, d) => n + d.alertes.length, 0);
  verifier('zéro perte : somme des alertes des domaines = alertes en entrée',
    total === alertes.length);
  verifier('compteurs cohérents avec l’entrée',
    r.nbCritiques === 5 && r.nbImportantes === 6);
}

{
  const r = evaluerConformite({
    alertes: [], registre: { ok: false, casseA: 12 }, officiel: OFFICIEL_OK
  });
  const dRegistre = r.domaines.find((d) => d.id === 'registre');
  verifier('chaîne rompue : domaine registre ROUGE', dRegistre.etat === 'ROUGE');
  verifier('chaîne rompue : constat synthétique avec le numéro de rupture',
    dRegistre.alertes.some((a) => a.id === 'alr-chaine-registre'
      && a.detail.includes('12')));
  verifier('chaîne rompue : global ROUGE, registreIntact faux',
    r.global === 'ROUGE' && r.registreIntact === false);
}

// ============================================================
// B. Collecte contre le STORE RÉEL
// ============================================================
console.log(`--- B. collecterConformite (store ${NOM_STORE}) ---`);

const store = await fabriquerStore(NOM_STORE);
if (NOM_STORE === 'demo') await store.init();

{
  const r = await collecterConformite(store);
  verifier('collecte : objet bien formé (global + domaines + officiel)',
    ['VERT', 'ORANGE', 'ROUGE'].includes(r.global)
    && Array.isArray(r.domaines) && typeof r.officiel.ok === 'boolean');
  const officiel = await store.peutPasserEnOfficiel();
  verifier('collecte : verdict Officiel identique à peutPasserEnOfficiel',
    r.officiel.ok === officiel.ok
    && r.officiel.motifs.length === officiel.motifs.length);
  const alertes = await store.getAlertes();
  const total = r.domaines.reduce((n, d) => n + d.alertes.length, 0);
  verifier('collecte : toutes les alertes du store rattachées à un domaine',
    total === alertes.length,
    `${total} rattachées pour ${alertes.length} alertes`);
  verifier('collecte : registre du monde de test intact',
    r.registreIntact === true);
}

{
  // Attestation de capacité EXPIRÉE → domaine établissement ROUGE.
  await store.updateEtablissement({
    raisonSociale: 'Lycée du Feu Tricolore',
    numAttestationCapacite: 'CAP-TEST-001',
    dateEcheanceCapacite: dateRelative(-10)
  });
  const r = await collecterConformite(store);
  const dEtab = r.domaines.find((d) => d.id === 'etablissement');
  verifier('attestation expirée : domaine établissement ROUGE',
    dEtab.etat === 'ROUGE');
  verifier('attestation expirée : global ROUGE', r.global === 'ROUGE');
}

{
  // Attestation redevenue VALIDE : le domaine repasse VERT (le global,
  // lui, reste au moins ORANGE tant que balance/détecteur manquent).
  await store.updateEtablissement({ dateEcheanceCapacite: dateRelative(400) });
  const r = await collecterConformite(store);
  const dEtab = r.domaines.find((d) => d.id === 'etablissement');
  verifier('attestation valide (>90 j) : domaine établissement VERT',
    dEtab.etat === 'VERT');
  // 22/07 : le monde DÉMO a désormais tous ses prérequis outillage —
  // l'assertion vérifie la COHÉRENCE (jamais VERT si prérequis
  // incomplets), valable pour les deux variantes ; le forçage ORANGE
  // est déjà prouvé par le volet A pur.
  verifier('cohérence : jamais VERT si les prérequis Officiel sont incomplets',
    r.officiel.ok === true || r.global !== 'VERT');
}

{
  // Aptitude qui expire dans 30 jours → domaine personnel ORANGE.
  await store.createPersonne({
    nom: 'Tricolore', prenom: 'Opérateur', typePersonne: 'ENSEIGNANT',
    dateFinValidite: dateRelative(30)
  });
  const r = await collecterConformite(store);
  const dPersonnel = r.domaines.find((d) => d.id === 'personnel');
  verifier('aptitude à échéance 30 j : domaine personnel ORANGE',
    dPersonnel.etat === 'ORANGE');
}

{
  // Détecteur EXPIRÉ → domaine outillage ROUGE (critique, SPEC §7.2).
  await store.createOutil({
    typeOutil: 'DETECTEUR', marque: 'Inficon', modele: 'D-TEK',
    prochaineEcheance: dateRelative(-5)
  });
  const r = await collecterConformite(store);
  const dOutillage = r.domaines.find((d) => d.id === 'outillage');
  verifier('détecteur expiré : domaine outillage ROUGE',
    dOutillage.etat === 'ROUGE');
  verifier('détecteur expiré : global ROUGE', r.global === 'ROUGE');
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
