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

// ============================================================
// F. Revue B2 (mineur 3) — LA VUE N'ENCHAÎNE PLUS N APPELS EN SÉRIE
//
// Le rendu interrogeait le store suivi par suivi, chacun attendant le
// précédent : en LocalStore, autant d'allers-retours HTTP bout à bout à
// chaque affichage. On éprouve DEUX choses, sur le rendu RÉEL :
//   1. les suivis SANS issue attestée ne sont plus interrogés du tout ;
//   2. les appels restants partent ENSEMBLE. La preuve se tire avec une
//      BARRIÈRE : chaque appel attend que TOUS soient entrés. Du code en
//      série ne peut pas la franchir — il reste bloqué sur le premier, et
//      le garde-temps rend la suite ROUGE au lieu de la faire pendre.
// ============================================================
console.log('\n--- F. Le rendu n’enchaîne plus les appels en série ---');

{
  // Décor : quatre suivis neufs, dont DEUX à l'issue attestée. Il en faut
  // au moins deux, sinon la barrière s'ouvrirait sur le premier appel et
  // ne prouverait rien.
  const fluideSerie = (await store.getFluides())[0].code;
  for (let i = 0; i < 4; i += 1) {
    const b = await store.createBouteille({
      type: 'RECUPERATION', fluide: fluideSerie, etatFluide: 'RECUPERE',
      tareKg: 10, masseBruteKg: 14, contenanceMaxKg: 25,
      proprietaire: 'Lycée'
    });
    await store.deciderFluideRecupere(b.id, 'DECHET', 'testeur');
    const s = await store.createBsff({
      bouteilleId: b.id, transporteur: 'Collecteur agréé',
      installationDestination: 'Centre de traitement agréé',
      masseRemiseKg: 1, dateRemise: '2026-07-24', operateur: 'testeur'
    });
    if (i < 2) {
      await store.attesterIssueBsff(s.id, {
        issueTraitement: 'DESTRUCTION',
        installationTraitement: 'Centre de traitement agréé',
        certificatTraitement: null, operateur: 'testeur'
      });
    }
  }
  const suivis = await store.getBsff();
  const avecIssue = suivis.filter((s) => s.issueTraitement);
  const sansIssue = suivis.filter((s) => !s.issueTraitement);
  verifier('décor : le registre porte des suivis AVEC et SANS issue attestée',
    avecIssue.length >= 1 && sansIssue.length >= 2,
    `${avecIssue.length} avec / ${sansIssue.length} sans`);

  const attendus = avecIssue.length;
  const interroges = [];
  let entres = 0;
  let ouvrirLaBarriere = null;
  const barriere = new Promise(function (resoudre) { ouvrirLaBarriere = resoudre; });

  const storeEspion = Object.create(store);
  storeEspion.listerPiecesJointes = async function (type, id) {
    interroges.push(`${type}:${id}`);
    entres += 1;
    // Tous entrés ? on ouvre. Sinon on attend les autres : du code en
    // série n'arrivera jamais au deuxième appel.
    if (entres >= attendus) ouvrirLaBarriere();
    await barriere;
    return store.listerPiecesJointes(type, id);
  };

  // ⚠ Le minuteur n'est PAS « unref » : sans cela, du code en série ne
  // ferait pas rougir la suite, il la ferait simplement s'arrêter sur un
  // await jamais résolu (« unsettled top-level await ») — un test qui ne
  // peut pas échouer proprement est un mensonge. Il est libéré dès la fin
  // de la course.
  let minuteur = null;
  const gardeTemps = new Promise(function (_, rejeter) {
    minuteur = setTimeout(function () {
      rejeter(new Error(`barrière non franchie : ${entres}/${attendus} appels `
        + 'entrés — les appels sont enchaînés, pas lancés ensemble'));
    }, 5000);
  });

  let erreurSerie = null;
  const conteneurF = document.createElement('div');
  try {
    await Promise.race([
      render(conteneurF, { store: storeEspion, naviguer() {}, rafraichir() {} }),
      gardeTemps
    ]);
  } catch (e) {
    erreurSerie = String((e && e.message) || e);
  } finally {
    if (minuteur !== null) clearTimeout(minuteur);
  }

  verifier('les appels de pièces jointes partent ENSEMBLE (barrière franchie)',
    erreurSerie === null, String(erreurSerie));
  verifier('aucun suivi SANS issue attestée n’est interrogé',
    sansIssue.every((s) => !interroges.includes(`BSFF:${s.id}`)),
    interroges.join(', '));
  verifier('un appel par suivi AVEC issue attestée, pas un de plus',
    interroges.length === attendus, `${interroges.length} pour ${attendus}`);
}

// ============================================================
// G. Revue B2 (important 4) — LA LIMITE DU CONTRÔLE EST DITE
//
// La déclaration signale les issues attestées sur un suivi SANS pièce
// jointe. Le contrôle s'arrête à la PRÉSENCE : n'importe quel fichier
// l'éteint. La revue l'a tiré (destruction attestée sur une installation
// inventée, certificat null, photo d'un pixel jointe → anomalie levée).
// Le message d'anomalie dit ce qu'il constate ; c'est son SILENCE qui
// trompait — sans mention, l'absence d'anomalie se lit « dossier prouvé ».
// On tire donc les DEUX : l'attaque, et la présence de la mention là où
// le résultat se lit.
// ============================================================
console.log('\n--- G. La limite du contrôle des pièces est dite ---');

{
  const { MENTION_PIECE_NON_PROBANTE } =
    await import('../data/remise-filiere.js');

  // 1. L'attaque de la revue, rejouée : une PHOTO éteint l'anomalie.
  const FLUIDE_G = (await store.getFluides())[0].code;
  const bG = await store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE_G,
    etatFluide: 'RECUPERE', tareKg: 10, masseBruteKg: 18,
    contenanceMaxKg: 25, proprietaire: 'Lycée'
  });
  await store.deciderFluideRecupere(bG.id, 'DECHET', 'testeur');
  const suiviG = await store.createBsff({
    bouteilleId: bG.id, transporteur: 'Collecteur agréé',
    installationDestination: 'Installation inventée',
    masseRemiseKg: 8, dateRemise: '2026-03-02', operateur: 'testeur'
  });
  await store.attesterIssueBsff(suiviG.id, {
    issueTraitement: 'DESTRUCTION',
    installationTraitement: 'Installation inventée',
    certificatTraitement: null, operateur: 'testeur'
  });

  // D'autres sections ont pu laisser des suivis du même fluide : on suit
  // la MASSE de la ligne, pas la simple présence de l'anomalie.
  const anomalieDe = async () => {
    const decl = await store.getDeclarationAnnuelle(2026);
    return (decl.anomalies || []).find(
      (a) => a.code === 'BSFF_ISSUE_SANS_PIECE' && a.fluide === FLUIDE_G);
  };
  const avant = await anomalieDe();
  verifier('sans aucune pièce : l’anomalie « issue sans pièce » est levée, '
    + 'nos 8 kg compris',
  Boolean(avant) && avant.masseKg >= 8,
  JSON.stringify(avant ?? null).slice(0, 140));
  verifier('… et l’anomalie dit ce qu’elle CONSTATE (aucune pièce jointe), '
    + 'sans prétendre qu’une pièce prouverait l’issue',
  Boolean(avant) && avant.message.includes('AUCUNE pièce jointe')
    && avant.message.includes('reste déclarée'), String(avant?.message));

  // Une PHOTO DE PESÉE — pas un certificat — suffit à l'éteindre.
  const PNG_1PX = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmM'
    + 'IQAAAABJRU5ErkJggg==', 'base64').toString('base64');
  await store.ajouterPieceJointe({
    entiteType: 'BSFF', entiteId: suiviG.id, categorie: 'PHOTO',
    nomFichier: 'pesee.png', mimeType: 'image/png', base64: PNG_1PX
  });
  const apres = await anomalieDe();
  const masseApres = apres ? apres.masseKg : 0;
  verifier('⭐ une simple PHOTO retire nos 8 kg de l’anomalie — le logiciel '
    + 'COMPTE les pièces, il ne les lit pas (attaque de la revue, rejouée)',
  Math.abs((avant.masseKg - masseApres) - 8) < 1e-9,
  `${avant.masseKg} kg puis ${masseApres} kg`);

  // 2. Puisque le contrôle ne vaut que ça, il le DIT, là où on le lit.
  const conteneurG = document.createElement('div');
  await render(conteneurG, ctx);
  verifier('l’écran Déchets porte la mention de la limite du contrôle',
    conteneurG.innerHTML.includes('vérifie qu’une pièce est JOINTE'),
    'vue Déchets');

  const { render: renderBilan } = await import('./bilan.js');
  const conteneurBilan = document.createElement('div');
  await renderBilan(conteneurBilan, ctx);
  verifier('la légende de la déclaration annuelle la porte aussi',
    conteneurBilan.innerHTML.includes('vérifie qu’une pièce est JOINTE'),
    'vue Bilan');

  verifier('les deux écrans portent la MÊME mention canonique',
    MENTION_PIECE_NON_PROBANTE.includes('ne vaut pas dossier complet'),
    MENTION_PIECE_NON_PROBANTE);
}

// ============================================================
// H. Revue finale B2 (mineur 2) — L'ÉCRAN SE RAFRAÎCHIT PAR TOUTES
// LES PORTES.
//
// Après une attestation réussie, la modale enchaîne sur le dépôt de la
// pièce justificative — c'est voulu. Mais le rafraîchissement de l'écran
// était accroché au SEUL bouton « Terminer » injecté dans les actions :
// fermé par la croix, par le fond ou par Échap, l'écran restait sur son
// ancien rendu et l'issue attestée n'apparaissait pas tant que la vue
// n'était pas rechargée. Aucune donnée perdue — mais l'utilisateur voit
// un registre qui ment sur son propre contenu.
// On tire la sortie par la CROIX, celle qui ne passe par aucun bouton
// d'action, et le contre-tir (fermeture SANS attestation).
// ============================================================
console.log('\n--- H. Rafraîchissement par toutes les portes de sortie ---');

{
  const { ouvrirAttestationIssue } = await import('./dechets.js');

  /** Déclenche les écouteurs « click » en ATTENDANT les asynchrones. */
  async function cliquer(el) {
    for (const fn of ((el && el.ecouteurs && el.ecouteurs.click) || [])) {
      await fn({ target: el, preventDefault() {} });
    }
  }

  /** La DERNIÈRE boîte posée (les sections précédentes ont laissé les leurs). */
  function derniereModale() {
    const zone = document.getElementById('zone-modales') || document.body;
    const fonds = zone.querySelectorAll('.modale-fond');
    return fonds[fonds.length - 1] || null;
  }

  async function suiviSansIssue(masseKg) {
    const fluide = (await store.getFluides())[0].code;
    const b = await store.createBouteille({
      type: 'RECUPERATION', fluide, etatFluide: 'RECUPERE',
      tareKg: 10, masseBruteKg: 10 + masseKg, contenanceMaxKg: 25,
      proprietaire: 'Lycée'
    });
    await store.deciderFluideRecupere(b.id, 'DECHET', 'testeur');
    return await store.createBsff({
      bouteilleId: b.id, transporteur: 'Collecteur agréé',
      installationDestination: 'Centre de traitement agréé',
      masseRemiseKg: masseKg, dateRemise: '2026-07-24', operateur: 'testeur'
    });
  }

  // 1. Attestation réussie, puis sortie par la CROIX.
  {
    const suivi = await suiviSansIssue(3);
    let rafraichissements = 0;
    const ctxH = {
      store, naviguer() {}, rafraichir() { rafraichissements += 1; }
    };
    ouvrirAttestationIssue(ctxH, suivi);
    const fond = derniereModale();
    verifier('la modale d’attestation est bien posée', Boolean(fond));
    fond.querySelector('#issue-select').value = 'DESTRUCTION';
    fond.querySelector('#issue-installation').value = 'Centre de traitement agréé';
    fond.querySelector('#issue-certificat').value = '';
    await cliquer(fond.querySelector('[data-action="valider"]'));

    verifier('l’issue est bien attestée au registre',
      (await store.getBsff()).find((s) => s.id === suivi.id)
        .issueTraitement === 'DESTRUCTION');
    verifier('la modale enchaîne sur la pièce justificative (comportement gardé)',
      Boolean(fond.querySelector('#zone-pj-issue')));
    verifier('… et n’a PAS encore rafraîchi (l’utilisateur dépose sa pièce)',
      rafraichissements === 0, String(rafraichissements));

    // LA CROIX : aucun bouton d'action, c'est la porte qui sautait.
    await cliquer(fond.querySelector('.modale-fermer'));
    verifier('sortie par la CROIX : l’écran est rafraîchi',
      rafraichissements === 1, String(rafraichissements));
  }

  // 2. CONTRE-TIR : fermer SANS attester ne doit rien rafraîchir (sinon la
  //    simple consultation rechargerait la vue à chaque « Annuler »).
  {
    const suivi = await suiviSansIssue(2);
    let rafraichissements = 0;
    const ctxH = {
      store, naviguer() {}, rafraichir() { rafraichissements += 1; }
    };
    ouvrirAttestationIssue(ctxH, suivi);
    const fond = derniereModale();
    await cliquer(fond.querySelector('[data-action="annuler"]'));
    verifier('fermeture SANS attestation : aucun rafraîchissement',
      rafraichissements === 0, String(rafraichissements));
    verifier('… et le suivi est resté sans issue',
      !(await store.getBsff()).find((s) => s.id === suivi.id).issueTraitement);
  }
}

// ============================================================
// I. Revue finale B2 (observation 3) — L'ÉCRAN NE PROMET PLUS UNE
// ANOMALIE QUI NE VIENDRA PAS.
//
// Le parcours normal propose de joindre le bordereau officiel AUSSITÔT
// après la création du suivi : le suivi porte donc déjà une pièce avant
// toute attestation, et `BSFF_ISSUE_SANS_PIECE` — qui ne compte que la
// PRÉSENCE d'au moins une pièce — ne se lèvera jamais sur ce chemin.
// La modale d'attestation, elle, annonçait : « si aucune pièce
// justificative n'est jointe (certificat de l'installation, bordereau
// officiel), la déclaration signalera une anomalie ». Faux sur le chemin
// normal, et lu comme un CONTRÔLE du certificat d'issue.
// On tire les DEUX : le fait (aucune anomalie sur le chemin normal) et le
// texte (il dit ce que l'anomalie compte vraiment).
// ============================================================
console.log('\n--- I. L’écran ne promet plus une anomalie qui ne vient pas ---');

{
  const { ouvrirAttestationIssue } = await import('./dechets.js');
  const PNG_1PX_I = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR'
    + '42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const FLUIDE_I = (await store.getFluides())[0].code;

  // 1. LE FAIT : chemin normal — bordereau joint à la création, PUIS issue
  //    attestée sans le moindre certificat. Aucune anomalie ne se lève.
  const bI = await store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE_I, etatFluide: 'RECUPERE',
    tareKg: 10, masseBruteKg: 17, contenanceMaxKg: 25, proprietaire: 'Lycée'
  });
  await store.deciderFluideRecupere(bI.id, 'DECHET', 'testeur');
  const suiviI = await store.createBsff({
    bouteilleId: bI.id, transporteur: 'Collecteur agréé',
    installationDestination: 'Installation inventée II',
    masseRemiseKg: 7, dateRemise: '2026-05-04', operateur: 'testeur'
  });
  // Le parcours de création enchaîne SUR le bordereau officiel.
  await store.ajouterPieceJointe({
    entiteType: 'BSFF', entiteId: suiviI.id, categorie: 'BORDEREAU_BSFF',
    nomFichier: 'bordereau.png', mimeType: 'image/png', base64: PNG_1PX_I
  });
  const anomalieAvant = (await store.getDeclarationAnnuelle(2026)).anomalies
    .find((a) => a.code === 'BSFF_ISSUE_SANS_PIECE' && a.fluide === FLUIDE_I);
  const masseAvant = anomalieAvant ? anomalieAvant.masseKg : 0;
  await store.attesterIssueBsff(suiviI.id, {
    issueTraitement: 'DESTRUCTION',
    installationTraitement: 'Installation inventée II',
    certificatTraitement: null, operateur: 'testeur'
  });
  const anomalieApres = (await store.getDeclarationAnnuelle(2026)).anomalies
    .find((a) => a.code === 'BSFF_ISSUE_SANS_PIECE' && a.fluide === FLUIDE_I);
  const masseApres = anomalieApres ? anomalieApres.masseKg : 0;
  verifier('chemin NORMAL (bordereau joint à la création) : nos 7 kg attestés '
    + 'sans certificat ne lèvent AUCUNE anomalie',
  Math.abs(masseApres - masseAvant) < 1e-9,
  `${masseAvant} → ${masseApres}`);

  // 2. LE TEXTE : la modale ne promet plus l'anomalie, elle dit ce qui la
  //    déclenche vraiment.
  const suiviTexte = await store.createBsff({
    bouteilleId: (await (async () => {
      const b = await store.createBouteille({
        type: 'RECUPERATION', fluide: FLUIDE_I, etatFluide: 'RECUPERE',
        tareKg: 10, masseBruteKg: 13, contenanceMaxKg: 25,
        proprietaire: 'Lycée'
      });
      await store.deciderFluideRecupere(b.id, 'DECHET', 'testeur');
      return b;
    })()).id,
    transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 3, dateRemise: '2026-05-05', operateur: 'testeur'
  });
  ouvrirAttestationIssue({ store, naviguer() {}, rafraichir() {} }, suiviTexte);
  const zoneI = document.getElementById('zone-modales') || document.body;
  const fondsI = zoneI.querySelectorAll('.modale-fond');
  const htmlI = fondsI[fondsI.length - 1].innerHTML;
  verifier('la modale ne promet plus « la déclaration signalera une anomalie »',
    !htmlI.includes('signalera une anomalie'), 'promesse encore présente');
  verifier('… elle dit ce que l’anomalie compte vraiment (AUCUNE pièce jointe)',
    htmlI.includes('AUCUNE pièce jointe'));
  verifier('… et la mention permanente de la limite est toujours là',
    htmlI.includes('vérifie qu’une pièce est JOINTE'));
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
