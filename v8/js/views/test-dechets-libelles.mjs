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
const parNom2 = new Map(fichiers2.map((f) => [f.nom, f.contenu]));
const csv = parNom2.get('suivi-remise-filiere.csv') ?? '';
verifier('le CSV scellé porte les deux numéros en colonnes séparées',
  /N° suivi interne;N° bordereau officiel/.test(csv)
  && csv.includes('FF-2026-000123') && csv.includes('non reporté'));

// ============================================================
// E. LES AUTRES SURFACES DU MÊME ZIP SCELLÉ (revue B2, important 5)
// Le balayage du lot s'était fait sur « Trackdéchets », pas sur « BSFF » :
// le sommaire du dossier affirmait « ce n'est pas un bordereau » pendant
// qu'une colonne de bouteilles.csv, DANS LE MÊME ZIP, s'appelait « N° BSFF »
// en portant le numéro INTERNE.
// ============================================================
console.log('\n--- E. Les autres surfaces (CSV, fiche, modale) ---');

const csvBouteilles = parNom2.get('bouteilles.csv') ?? '';
verifier('bouteilles.csv existe et porte le numéro du suivi INTERNE',
  csvBouteilles.length > 0 && /N° suivi interne/.test(csvBouteilles),
  csvBouteilles.split('\n')[0]);
verifier('AUCUN fichier du zip scellé ne dit « N° BSFF »',
  fichiers2.every((f) => !/N° BSFF/.test(f.contenu)),
  fichiers2.filter((f) => /N° BSFF/.test(f.contenu))
    .map((f) => f.nom).join(', '));

// La FICHE BOUTEILLE : surface lue à chaque scan de QR.
const { render: renderFiche } = await import('./fiche-bouteille.js');
const bouteilleFiche = (await store.getBouteilles())
  .find((b) => b.id === dechets[0].id);
const conteneurFiche = document.createElement('div');
await renderFiche(conteneurFiche,
  { store, naviguer() {}, rafraichir() {}, param: bouteilleFiche.codePublic });
const fiche = conteneurFiche.innerHTML;
verifier('la fiche bouteille a bien été rendue (pas un écran d’erreur)',
  fiche.includes(bouteilleFiche.code));
verifier('la fiche bouteille ne dit plus « N° BSFF »',
  !fiche.includes('N° BSFF') && fiche.includes('N° suivi interne'));
verifier('la vie de la bouteille dit « remise en filière », pas « BSFF »',
  fiche.includes('Sortie déchet (remise en filière)')
  && !fiche.includes('Sortie déchet (BSFF)'));

// La MODALE de remise : le message de reliquat n'apparaît qu'en saisie
// PARTIELLE — on le déclenche pour le lire réellement.
const recup2 = (await store.getBouteilles())
  .find((b) => b.statut === 'DECHET' && b.masseNetteKg > 1);
await ouvrirFormBsff(ctx, recup2.id);
const fond2 = (document.getElementById('zone-modales') || document.body)
  .querySelector('.modale-fond');
const champMasse = fond2 ? fond2.querySelector('#bsff-masse') : null;
if (champMasse) {
  champMasse.value = '0.1';
  champMasse.declencher('input');
}
const reliquat = fond2 ? fond2.querySelector('#zone-reliquat-bsff') : null;
verifier('l’annonce du reliquat s’affiche bien en remise partielle',
  Boolean(reliquat) && reliquat.innerHTML.includes('reliquat'));
verifier('elle annonce un second SUIVI, pas un second BSFF',
  Boolean(reliquat) && reliquat.innerHTML.includes('second suivi')
  && !reliquat.innerHTML.includes('second BSFF'),
  reliquat ? reliquat.innerHTML : 'aucune');

// Le message de repli du formulaire (chemin d'erreur sans message) : il
// n'est pas atteignable par le rendu, on le lit dans le module lui-même.
const { readFile } = await import('node:fs/promises');
const sourceForm = await readFile(
  new URL('../modales/bsff-form.js', import.meta.url), 'utf8');
verifier('plus aucune phrase d’interface du formulaire ne dit « BSFF »',
  !/créer ce BSFF/.test(sourceForm) && !/second BSFF/.test(sourceForm),
  'bsff-form.js');

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
