// ============================================================
// inerWeb Fluide v8 — fabrique du magasin de données (Phase A)
// Phase A : toujours le magasin de démonstration (lecture seule).
// La sélection local / cloud sera introduite en Phases E/F
// (magasin local persistant, puis synchronisation cloud).
// ============================================================

import { creerDemoStore } from './demo-store.js';

/**
 * Crée et initialise le magasin de données de l'application.
 * @returns {Promise<object>} store conforme au contrat d'interfaces v8
 */
export async function creerStore() {
  const store = creerDemoStore();
  // Certains magasins futurs exposeront une initialisation asynchrone
  if (typeof store.init === 'function') {
    await store.init();
  }
  return store;
}
