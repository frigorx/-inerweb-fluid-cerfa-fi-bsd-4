// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — fabrique du magasin de données
// -----------------------------------------------------------
// SÉLECTEUR (V9-E3) : au démarrage, on sonde /api/ping.
//  - réponse OK d'un serveur local → LocalStore (fetch REST → SQLite) ;
//  - sinon (pas de serveur, ou hors navigateur) → DemoStore (monde
//    fictif en mémoire).
// Le front ne sait jamais lequel il a en face : le contrat (contrat.js)
// est la seule frontière. En Node sans serveur (suites de tests qui
// appellent creerStore), le fetch d'une URL relative échoue : on REPLIE
// sur la démo, sans laisser fuiter d'exception.
// ============================================================

import { creerDemoStore } from './demo-store.js';
import * as modeExercice from './mode-exercice.js';

/** Sonde le serveur local : true si /api/ping répond « mode local ». */
async function serveurLocalPresent() {
  // fetch peut être absent (très vieux Node) ou lever sur une URL
  // relative hors navigateur : dans tous ces cas → pas de serveur local.
  if (typeof fetch !== 'function') return false;
  try {
    const reponse = await fetch('/api/ping', { method: 'GET' });
    if (!reponse.ok) return false;
    const corps = await reponse.json();
    return Boolean(corps && corps.ok === true && corps.mode === 'local');
  } catch {
    return false;
  }
}

/**
 * Crée et initialise le magasin de données de l'application.
 * @returns {Promise<object>} store conforme au contrat DataStore
 */
export async function creerStore() {
  // MODE EXERCICE (13/08, plan docs/PLAN-MODE-EXERCICE.md) : le drapeau
  // posé force le BAC À SABLE (DemoStore) MÊME quand le serveur répond —
  // c'est toute la fonction : travailler sur la photo du réel sans jamais
  // écrire au registre. Au premier chargement, le bac est semé de la photo
  // par le canal OFFICIEL (importerJSON : invariants joués, persistance
  // localStorage) ; ensuite l'exercice vit sa vie jusqu'à l'effacement.
  if (modeExercice.estActif()) {
    const bac = creerDemoStore();
    if (typeof bac.init === 'function') await bac.init();
    if (modeExercice.doitSemer()) {
      const photo = modeExercice.photoASemer();
      if (photo) {
        try {
          const adopte = await bac.importerJSON(photo);
          if (adopte === true) modeExercice.marquerSeme();
          else console.error('Mode exercice : photo illisible, bac non semé.');
        } catch (erreur) {
          // Photo forgée/incohérente : le bac reste sur son état courant,
          // le marqueur reste posé (nouvel essai au prochain chargement).
          console.error('Mode exercice : semis refusé —', erreur.message);
        }
      }
    }
    return bac;
  }
  let store;
  if (await serveurLocalPresent()) {
    const [{ creerLocalStore }, { creerTransportHttp }] = await Promise.all([
      import('./local-store.js'),
      import('./transport-http.js')
    ]);
    store = creerLocalStore(creerTransportHttp());
  } else {
    store = creerDemoStore();
  }
  if (typeof store.init === 'function') {
    await store.init();
  }
  return store;
}
