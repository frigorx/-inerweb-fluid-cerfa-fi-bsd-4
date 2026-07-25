// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// LOT B2 — « LE SUIVI DIT CE QU'IL EST » (constat A07).
//
// L'objet interne du logiciel portait le nom du document réglementaire
// qu'il n'est pas : écran « Déchets / BSFF », bouton « Créer le BSFF »,
// modale « Créer le BSFF », colonne « N° BSFF », en-tête du CSV du
// dossier d'audit scellé. Aucune de ces surfaces ne disait que ce
// document ne remplace pas le bordereau de suivi de déchets
// dématérialisé obligatoire.
//
// Cette suite TIRE les surfaces réelles (rendu HTML de la vue, HTML de
// la modale, fichiers CSV réellement produits) — pas le code source.
// Exécution : node v8/js/views/test-dechets-libelles.mjs
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
const { render } = await import('./dechets.js');
const { ouvrirFormBsff } = await import('../modales/bsff-form.js');
const { toutesLesTables } = await import('../documents/exports.js');
const {
  MENTION_BORDEREAU_OFFICIEL, LIBELLE_SUIVI
} = await import('../data/remise-filiere.js');

const store = await creerStore();
if (store.init) await store.init();

// Une bouteille de récupération déclarée DÉCHET : c'est la seule
// situation qui fait apparaître le bouton de remise en filière.
const bouteilles = await store.getBouteilles();
const recup = bouteilles.find((b) => b.type === 'RECUPERATION' && b.masseNetteKg > 0);
if (!recup) {
  console.error('ÉCHEC amorçage — aucune bouteille de récupération en démo.');
  process.exit(1);
}
await store.deciderFluideRecupere(recup.id, 'DECHET', 'testeur');

const ctx = { store, naviguer() {}, rafraichir() {} };

// ============================================================
// A. La VUE — mention permanente, plus aucun libellé trompeur
// ============================================================
console.log('\n--- A. Vue « Déchets / remise en filière » ---');

const conteneur = document.createElement('div');
await render(conteneur, ctx);
const vue = conteneur.innerHTML;

verifier('la vue porte la mention permanente du bordereau obligatoire',
  vue.includes('ne remplace pas le bordereau de suivi')
  && vue.includes('joint en pièce jointe'));
verifier('la vue titre le tableau « Suivi interne de remise en filière »',
  vue.includes(LIBELLE_SUIVI));
verifier('la colonne du numéro interne se dit « N° suivi interne »',
  vue.includes('N° suivi interne'));
verifier('le bouton d’action ne promet plus un BSFF',
  vue.includes('Enregistrer la remise en filière')
  && !vue.includes('Créer le BSFF'));
verifier('plus aucun titre « Déchets / BSFF » ni « Bordereaux BSFF »',
  !vue.includes('Déchets / BSFF') && !vue.includes('Bordereaux BSFF'));

// ============================================================
// B. La MODALE de création
// ============================================================
console.log('\n--- B. Modale de remise en filière ---');

await ouvrirFormBsff(ctx, recup.id);
// La modale s'ajoute au document : on relit la boîte réellement posée
// (titre compris), pas le code source qui l'a fabriquée.
const zoneModales = document.getElementById('zone-modales') || document.body;
const fond = zoneModales.querySelector('.modale-fond');
const modaleHtml = fond ? fond.innerHTML : '';

verifier('la modale porte la mention permanente',
  modaleHtml.includes(MENTION_BORDEREAU_OFFICIEL.slice(0, 60)));
verifier('le titre et le bouton parlent de remise en filière',
  modaleHtml.includes(LIBELLE_SUIVI)
  && modaleHtml.includes('Enregistrer la remise en filière'));
verifier('le champ du numéro interne ne s’appelle plus « N° BSFF »',
  modaleHtml.includes('N° du suivi interne')
  && !modaleHtml.includes('N° BSFF'));

// ============================================================
// C. Le DOSSIER D'AUDIT — en-tête du CSV scellé
// ============================================================
console.log('\n--- C. CSV du dossier d’audit ---');

const fichiers = await toutesLesTables(store, 2026);
const parNom = new Map(fichiers.map((f) => [f.nom, f.contenu]));

verifier('le fichier s’appelle suivi-remise-filiere.csv (plus de bsff.csv)',
  parNom.has('suivi-remise-filiere.csv') && !parNom.has('bsff.csv'),
  fichiers.map((f) => f.nom).join(', '));
verifier('son en-tête dit « N° suivi interne », plus « N° BSFF »',
  /N° suivi interne/.test(parNom.get('suivi-remise-filiere.csv') ?? '')
  && !/N° BSFF/.test(parNom.get('suivi-remise-filiere.csv') ?? ''));

// ============================================================
// D. Le numéro du bordereau OFFICIEL a sa colonne (B2-2)
// ============================================================
console.log('\n--- D. Colonne du bordereau officiel ---');

const dechets = (await store.getBouteilles())
  .filter((b) => b.statut === 'DECHET' && b.masseNetteKg > 1);
await store.createBsff({
  bouteilleId: dechets[0].id, numeroBsff: 'SIF-2026-0001',
  bordereauExterne: 'FF-2026-000123', transporteur: 'Collecteur agréé',
  installationDestination: 'Centre de traitement agréé',
  masseRemiseKg: 0.5, dateRemise: '2026-07-24', operateur: 'testeur'
});
await store.createBsff({
  bouteilleId: dechets[0].id, numeroBsff: 'SIF-2026-0002',
  transporteur: 'Collecteur agréé',
  installationDestination: 'Centre de traitement agréé',
  masseRemiseKg: 0.5, dateRemise: '2026-07-24', operateur: 'testeur'
});

const conteneur2 = document.createElement('div');
await render(conteneur2, ctx);
const vue2 = conteneur2.innerHTML;
verifier('la vue a une colonne « N° bordereau officiel » distincte',
  vue2.includes('N° bordereau officiel') && vue2.includes('N° suivi interne'));
verifier('le bordereau reporté s’affiche, son absence se dit « non reporté »',
  vue2.includes('FF-2026-000123') && vue2.includes('non reporté'));

const fichiers2 = await toutesLesTables(store, 2026);
const csv = new Map(fichiers2.map((f) => [f.nom, f.contenu]))
  .get('suivi-remise-filiere.csv') ?? '';
verifier('le CSV scellé porte les deux numéros en colonnes séparées',
  /N° suivi interne;N° bordereau officiel/.test(csv)
  && csv.includes('FF-2026-000123') && csv.includes('non reporté'));

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
