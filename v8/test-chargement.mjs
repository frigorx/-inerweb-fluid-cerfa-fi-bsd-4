// ============================================================
// inerWeb Fluide v8 — test de chargement des modules (Node)
// Vérifie que chaque module s'importe sans toucher au DOM et
// que chaque vue exporte bien « titre » (chaîne) + « render »
// (fonction), conformément au contrat d'interfaces v8.
// Usage : node v8/test-chargement.mjs
// ============================================================

const VUES = [
  'dashboard', 'machines', 'bouteilles', 'mouvements',
  'controles', 'stats', 'bilan', 'fluides', 'admin', 'communs'
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

// ---- 3. Chaque vue se charge et respecte le contrat ----
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
