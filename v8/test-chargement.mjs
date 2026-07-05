// ============================================================
// inerWeb Fluide v8 — test de chargement des modules (Node)
// Vérifie que chaque module s'importe sans toucher au DOM et
// que chaque vue exporte bien « titre » (chaîne) + « render »
// (fonction), conformément au contrat d'interfaces v8.
// Usage : node v8/test-chargement.mjs
// ============================================================

const VUES = [
  'dashboard', 'machines', 'bouteilles', 'mouvements',
  'controles', 'dechets', 'outillage', 'personnel',
  'stats', 'bilan', 'balance', 'fluides', 'admin', 'sauvegarde', 'communs'
];

let echecs = 0;

/** Affiche le résultat d'une vérification et comptabilise les échecs. */
function verifier(condition, libelle) {
  if (condition) {
    console.log('  OK  ' + libelle);
  } else {
    echecs += 1;
    console.error('ÉCHEC ' + libelle);
  }
}

// ---- 1. Le magasin de données se charge et se crée sous Node ----
try {
  const { creerStore } = await import('./js/data/datastore.js');
  verifier(typeof creerStore === 'function', 'datastore.js exporte creerStore');
  const store = await creerStore();
  verifier(store && store.modeLabel === 'DÉMO', 'store créé, modeLabel = « DÉMO »');
  const stats = await store.getStats();
  verifier(stats && typeof stats.nbMachines === 'number', 'store.getStats() répond sous Node');
} catch (erreur) {
  echecs += 1;
  console.error('ÉCHEC chargement du datastore : ' + erreur.message);
}

// ---- 2. Les modules du cœur se chargent ----
for (const nom of ['routeur', 'icones', 'utils']) {
  try {
    await import('./js/core/' + nom + '.js');
    verifier(true, 'core/' + nom + '.js se charge sans DOM');
  } catch (erreur) {
    echecs += 1;
    console.error('ÉCHEC core/' + nom + '.js : ' + erreur.message);
  }
}

// ---- 3. Les modules Phase B (wizard, modales) se chargent sans DOM ----
try {
  const wizard = await import('./js/wizard/wizard.js');
  verifier(typeof wizard.ouvrirWizard === 'function',
    'wizard/wizard.js se charge sans DOM et exporte ouvrirWizard');
} catch (erreur) {
  echecs += 1;
  console.error('ÉCHEC wizard/wizard.js : ' + erreur.message);
}

try {
  const signature = await import('./js/wizard/signature.js');
  verifier(typeof signature.creerSignature === 'function',
    'wizard/signature.js se charge sans DOM et exporte creerSignature');
} catch (erreur) {
  echecs += 1;
  console.error('ÉCHEC wizard/signature.js : ' + erreur.message);
}

const MODALES = [
  { fichier: 'machine-form', exports: ['ouvrirFormMachine'] },
  { fichier: 'bouteille-form', exports: ['ouvrirFormBouteille', 'ouvrirPesee'] },
  { fichier: 'controle-form', exports: ['ouvrirFormControle'] },
  { fichier: 'audit-form', exports: ['ouvrirFormAudit', 'ouvrirFormNonConformite', 'ouvrirFormSolderNonConformite'] },
  { fichier: 'bsff-form', exports: ['ouvrirFormBsff'] },
  { fichier: 'etablissement-form', exports: ['ouvrirFormEtablissement'] },
  { fichier: 'outil-form', exports: ['ouvrirFormOutil'] },
  { fichier: 'personne-form', exports: ['ouvrirFormPersonne'] }
];
for (const { fichier, exports } of MODALES) {
  try {
    const module = await import('./js/modales/' + fichier + '.js');
    verifier(exports.every((nom) => typeof module[nom] === 'function'),
      'modales/' + fichier + '.js se charge sans DOM et exporte '
      + exports.join(' + '));
  } catch (erreur) {
    echecs += 1;
    console.error('ÉCHEC modales/' + fichier + '.js : ' + erreur.message);
  }
}

// ---- 3 bis. Le composant pièces jointes se charge sans DOM ----
try {
  const pj = await import('./js/composants/pieces-jointes.js');
  verifier(typeof pj.zonePiecesJointes === 'function',
    'composants/pieces-jointes.js se charge sans DOM et exporte zonePiecesJointes');
} catch (erreur) {
  echecs += 1;
  console.error('ÉCHEC composants/pieces-jointes.js : ' + erreur.message);
}

// ---- 3 ter. Les modules Phase D se chargent sans DOM et SANS charger
// les bibliothèques UMD (pdf-lib / PDF.js restent paresseuses) ----
const MODULES_PHASE_D = [
  { chemin: './js/core/zip.js', exports: ['creerZip', 'creerZipOctets', 'crc32'] },
  { chemin: './js/cerfa/generateur.js', exports: ['genererCerfaPdf', 'chargerPdfLib', 'calculerCadre7'] },
  { chemin: './js/cerfa/visualiseur.js', exports: ['ouvrirCerfa'] },
  { chemin: './js/documents/exports.js', exports: ['toutesLesTables'] },
  { chemin: './js/documents/plaque-fgas.js', exports: ['ouvrirPlaque'] },
  { chemin: './js/documents/dossier-audit.js', exports: ['genererDossierAudit'] }
];
for (const { chemin, exports } of MODULES_PHASE_D) {
  try {
    const module = await import(chemin);
    verifier(exports.every((nom) => typeof module[nom] === 'function'),
      chemin.replace('./js/', '') + ' se charge sans DOM et exporte '
      + exports.join(' + '));
  } catch (erreur) {
    echecs += 1;
    console.error('ÉCHEC ' + chemin + ' : ' + erreur.message);
  }
}
// Preuve que le chargement reste paresseux : aucun global UMD posé
verifier(typeof globalThis.PDFLib === 'undefined'
  && typeof globalThis.pdfjsLib === 'undefined',
  'pdf-lib et PDF.js ne sont PAS chargés au simple import (paresseux)');

// ---- 4. Chaque vue se charge et respecte le contrat ----
for (const id of VUES) {
  try {
    const module = await import('./js/views/' + id + '.js');
    verifier(true, 'views/' + id + '.js se charge sans DOM');
    if (id !== 'communs') {
      verifier(typeof module.titre === 'string' && module.titre.length > 0,
        'views/' + id + '.js exporte « titre » (chaîne non vide)');
      verifier(typeof module.render === 'function',
        'views/' + id + '.js exporte « render » (fonction)');
    }
  } catch (erreur) {
    echecs += 1;
    console.error('ÉCHEC views/' + id + '.js : ' + erreur.message);
  }
}

// ---- Bilan ----
if (echecs > 0) {
  console.error('\n' + echecs + ' échec(s) : voir ci-dessus.');
  process.exit(1);
}
console.log('\nTous les modules se chargent et respectent le contrat.');
