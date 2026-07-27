// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// LOT 1 BRANCHE A — LES ÉCRANS N'OFFRENT PLUS DE CERFA SUR UNE
// CONTRE-ÉCRITURE (décision du propriétaire, 27/07/2026).
//
// POURQUOI CETTE SUITE EXISTE. Le refus vit dans le générateur
// (`v8/js/cerfa/generateur.js`, MSG_CERFA_CONTRE_ECRITURE) : un bouton
// « Visualiser CERFA » laissé sur une écriture d'annulation ne mentirait
// plus, mais il PLANTERAIT — l'utilisateur cliquerait pour recevoir une
// erreur. Et « Correction élève » y serait pire encore : l'enseignant
// importerait la copie d'un élève avant d'apprendre que le sujet n'existe
// pas. Les trois surfaces qui portaient ces boutons doivent donc offrir
// la pièce qui existe : le JUSTIFICATIF DE RÉGULARISATION.
//
// Cette suite TIRE le rendu RÉEL des vues (HTML produit), pas le code
// source — une condition peut être juste dans le fichier et fausse à
// l'écran. Le store est un ESPION : le monde de démonstration ne contient
// aucune contre-écriture, et en fabriquer une exigerait une session de
// validateur. On y met les DEUX formes : la NEUVE (sans `cerfaNumero`)
// et l'ANCIENNE (numéro scellé d'avant le lot), parce que c'est
// `contreEcritureDe` — jamais `cerfaNumero` — qui porte la règle.
//
// Exécution : node v8/js/views/test-boutons-contre-ecriture.mjs
// ============================================================

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

const { installerDocumentFactice } = await import('../core/shim-dom-tests.mjs');
const { document } = installerDocumentFactice();

const { creerStore } = await import('../data/datastore.js');
const { render: renderMouvements } = await import('./mouvements.js');
const { render: renderFicheMachine } = await import('./fiche-machine.js');
const { render: renderFicheBouteille } = await import('./fiche-bouteille.js');

const store = await creerStore();
if (store.init) await store.init();

// ------------------------------------------------------------
// Décor : on s'accroche à une machine et à une bouteille réelles du
// monde de démonstration, pour que les fiches sachent les afficher.
// ------------------------------------------------------------
const mouvementsReels = await store.getMouvements();
const patron = mouvementsReels.find(
  (mv) => mv.statut === 'VALIDE' && mv.machineId);
verifier('décor : une écriture VALIDE du monde de démo sert de patron',
  Boolean(patron), 'aucun mouvement VALIDE rattaché à une machine');

const machines = await store.getMachines();
const bouteilles = await store.getBouteilles();
const machine = machines.find((m) => m.id === patron.machineId);
const bouteille = bouteilles.find((b) => b.type === 'NEUVE') ?? bouteilles[0];
verifier('décor : une machine et une bouteille réelles servent d’ancrage',
  Boolean(machine) && Boolean(bouteille));

/** Une écriture fabriquée, rattachée à la MÊME machine et à la MÊME
 *  bouteille : elle apparaît donc dans les trois vues à la fois. */
function ecritureFabriquee(id, numero, patch) {
  return {
    ...patron,
    id,
    numero,
    cerfaNumero: numero,
    statut: 'VALIDE',
    machineId: machine.id,
    bouteilleSrcId: bouteille.id,
    bouteilleDstId: null,
    contreEcritureDe: null,
    quantiteKg: 0.5,
    ...patch
  };
}

// L'écriture ORDINAIRE de référence : c'est elle qui doit garder ses
// boutons (l'usage quotidien). Elle est fabriquée elle aussi, pour que
// les trois vues la montrent au même endroit que les deux annulations.
const ORDINAIRE = ecritureFabriquee('mvt-ordinaire-test', 'FI-2026-0096', {});
// ⚠ LE POINT : la NEUVE naît sans numéro de fiche ; l'ANCIENNE garde le
// sien, scellé avant le lot. C'est `contreEcritureDe` qui porte la règle.
const NEUVE = ecritureFabriquee('mvt-contre-neuve', 'FI-2026-0097', {
  cerfaNumero: null, contreEcritureDe: ORDINAIRE.id, quantiteKg: -0.5,
  motif: 'Erreur de saisie (décor de test)'
});
const ANCIENNE = ecritureFabriquee('mvt-contre-ancienne', 'FI-2026-0098', {
  contreEcritureDe: ORDINAIRE.id, quantiteKg: -0.5,
  motif: 'Erreur de saisie (décor de test)'
});
const modele = ORDINAIRE;

const storeEspion = Object.create(store);
storeEspion.getMouvements = async function () {
  return [NEUVE, ANCIENNE, ORDINAIRE, ...(await store.getMouvements())];
};

const ctx = (param) => ({
  store: storeEspion, naviguer() {}, rafraichir() {}, param
});

/** Les boutons offerts pour un identifiant donné, dans un HTML rendu. */
function actionsPour(html, id) {
  const actions = [];
  const motif = new RegExp(
    '<button[^>]*data-action="([^"]+)"[^>]*data-id="' + id + '"[^>]*>([^<]*)<',
    'g');
  for (const t of html.matchAll(motif)) actions.push(t[1]);
  // fiche-machine met data-action AVANT data-id, fiche-bouteille aussi ;
  // la vue Mouvements aussi. Un second motif couvre l'ordre inverse.
  const motifInverse = new RegExp(
    '<button[^>]*data-id="' + id + '"[^>]*data-action="([^"]+)"', 'g');
  for (const t of html.matchAll(motifInverse)) actions.push(t[1]);
  return actions;
}

// ============================================================
// 1. VUE MOUVEMENTS
// ============================================================
console.log('\n--- 1. Vue « Mouvements de fluide » ---');

const conteneurMvt = document.createElement('div');
await renderMouvements(conteneurMvt, ctx());
const htmlMvt = conteneurMvt.innerHTML;

for (const [libelle, contre] of [['NEUVE', NEUVE], ['ANCIENNE', ANCIENNE]]) {
  const actions = actionsPour(htmlMvt, contre.id);
  verifier(`contre-écriture ${libelle} : aucun « Visualiser CERFA »`,
    !actions.includes('voir-cerfa'), actions.join(', '));
  verifier(`contre-écriture ${libelle} : aucune « Correction élève »`,
    !actions.includes('corriger-cerfa'), actions.join(', '));
  verifier(`contre-écriture ${libelle} : « Justificatif de régularisation » offert`,
    actions.includes('justificatif-regularisation'), actions.join(', '));
}
verifier('le libellé du bouton est écrit en toutes lettres à l’écran',
  htmlMvt.includes('>Justificatif de régularisation<'));

// NON-RÉGRESSION : l'écriture ordinaire garde ses deux boutons.
{
  const actions = actionsPour(htmlMvt, modele.id);
  verifier('⭐ une écriture ORDINAIRE garde « Visualiser CERFA »',
    actions.includes('voir-cerfa'), actions.join(', '));
  verifier('⭐ … et garde « Correction élève » (l’usage quotidien)',
    actions.includes('corriger-cerfa'), actions.join(', '));
  verifier('… et ne se voit PAS offrir de justificatif',
    !actions.includes('justificatif-regularisation'), actions.join(', '));
}

// ============================================================
// 2. FICHE MACHINE
// ============================================================
console.log('\n--- 2. Fiche machine ---');

const conteneurMachine = document.createElement('div');
await renderFicheMachine(conteneurMachine, ctx(machine.codePublic));
const htmlMachine = conteneurMachine.innerHTML;

for (const [libelle, contre] of [['NEUVE', NEUVE], ['ANCIENNE', ANCIENNE]]) {
  const actions = actionsPour(htmlMachine, contre.id);
  verifier(`fiche machine — contre-écriture ${libelle} : aucun bouton CERFA`,
    !actions.includes('cerfa-mouvement'), actions.join(', '));
  verifier(`fiche machine — contre-écriture ${libelle} : aucune correction élève`,
    !actions.includes('corriger-cerfa-mouvement'), actions.join(', '));
  verifier(`fiche machine — contre-écriture ${libelle} : justificatif offert`,
    actions.includes('justificatif-regularisation'), actions.join(', '));
}
{
  const actions = actionsPour(htmlMachine, modele.id);
  verifier('⭐ fiche machine — l’écriture ORDINAIRE garde son bouton CERFA',
    actions.includes('cerfa-mouvement'), actions.join(', '));
}

// ============================================================
// 3. FICHE BOUTEILLE
// ============================================================
console.log('\n--- 3. Fiche bouteille ---');

const conteneurBouteille = document.createElement('div');
await renderFicheBouteille(conteneurBouteille, ctx(bouteille.codePublic));
const htmlBouteille = conteneurBouteille.innerHTML;

for (const [libelle, contre] of [['NEUVE', NEUVE], ['ANCIENNE', ANCIENNE]]) {
  const actions = actionsPour(htmlBouteille, contre.id);
  verifier(`fiche bouteille — contre-écriture ${libelle} : aucun bouton CERFA`,
    !actions.includes('cerfa-mouvement'), actions.join(', '));
  verifier(`fiche bouteille — contre-écriture ${libelle} : justificatif offert`,
    actions.includes('justificatif-regularisation'), actions.join(', '));
}
{
  const actions = actionsPour(htmlBouteille, modele.id);
  verifier('⭐ fiche bouteille — l’écriture ORDINAIRE garde son bouton CERFA',
    actions.includes('cerfa-mouvement'), actions.join(', '));
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
