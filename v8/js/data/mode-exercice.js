// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// MODE EXERCICE — cycle de vie du bac à sable pédagogique (13/08/2026,
// plan docs/PLAN-MODE-EXERCICE.md).
// ------------------------------------------------------------
// Le bac à sable est le DemoStore du navigateur, semé d'une PHOTO du
// registre réel (délivrée par le serveur contre le code de déblocage —
// routes-exercice.js). Ce module ne tient QUE l'état local du cycle :
// drapeau actif, photo d'origine (pour réinitialiser), date, marqueur de
// semis. Il n'écrit JAMAIS rien au registre réel.
//
// Décisions du propriétaire (13/08) portées ici :
//   - l'exercice PERSISTE entre les sessions du navigateur, jusqu'à
//     l'effacement ;
//   - « Terminer » détruit TOUT d'un geste : drapeau, photo d'origine,
//     date, marqueur, et le bac lui-même (la clé de persistance du
//     DemoStore) — « toute trace a été détruite ». Limite dite : un
//     fichier d'exercice TÉLÉCHARGÉ vit sur le disque, hors de portée.
//
// Le stockage est INJECTABLE (défaut : localStorage du navigateur) : le
// module se teste sous Node avec un stockage factice, et il est SILENCIEUX
// quand aucun stockage n'existe (patron de la persistance du DemoStore).
// ============================================================

import { CLE_STOCKAGE as CLE_BAC, effacerPiecesDemo } from './demo-store.js';

export const CLE_DRAPEAU = 'inerweb-fluide-v8-exercice';
export const CLE_PHOTO = 'inerweb-fluide-v8-exercice-photo';
export const CLE_DATE = 'inerweb-fluide-v8-exercice-date';
export const CLE_A_SEMER = 'inerweb-fluide-v8-exercice-a-semer';
export { CLE_BAC };

/** Le stockage réel du navigateur, ou null (Node sans DOM). */
function stockageParDefaut() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Vrai si le poste est en mode exercice (le drapeau est posé). */
export function estActif(stockage = stockageParDefaut()) {
  if (!stockage) return false;
  return stockage.getItem(CLE_DRAPEAU) === '1';
}

/**
 * Active le mode exercice avec la photo reçue du serveur : pose la photo
 * d'origine, la date, le drapeau et le marqueur de semis, et EFFACE le bac
 * d'un éventuel exercice précédent (il sera re-semé de la photo au
 * prochain chargement, par datastore.js).
 * @param {string} photoJson - l'export JSON complet (chaîne)
 * @param {string} dateIso - date de la photo (ISO, fournie par le serveur)
 */
export function activer(photoJson, dateIso, stockage = stockageParDefaut()) {
  if (!stockage) return false;
  if (typeof photoJson !== 'string' || photoJson.length === 0) {
    throw new Error('Photo du registre absente : le mode exercice ne peut pas démarrer.');
  }
  stockage.setItem(CLE_PHOTO, photoJson);
  stockage.setItem(CLE_DATE, dateIso ?? '');
  stockage.setItem(CLE_A_SEMER, '1');
  stockage.removeItem(CLE_BAC);
  stockage.setItem(CLE_DRAPEAU, '1');
  return true;
}

/** Vrai si le bac doit être (re)semé de la photo au prochain chargement. */
export function doitSemer(stockage = stockageParDefaut()) {
  if (!stockage) return false;
  return estActif(stockage) && stockage.getItem(CLE_A_SEMER) === '1';
}

/** La photo d'origine (chaîne JSON), ou null. */
export function photoASemer(stockage = stockageParDefaut()) {
  if (!stockage) return null;
  return stockage.getItem(CLE_PHOTO);
}

/** Marque le semis fait (l'exercice vit ensuite sa vie dans le bac). */
export function marquerSeme(stockage = stockageParDefaut()) {
  if (!stockage) return;
  stockage.removeItem(CLE_A_SEMER);
}

/** Date ISO de la photo d'origine, ou null. */
export function dateExercice(stockage = stockageParDefaut()) {
  if (!stockage) return null;
  return stockage.getItem(CLE_DATE) || null;
}

/**
 * Réinitialise l'exercice : le bac est effacé et sera RE-SEMÉ de la photo
 * d'origine au prochain chargement. La photo, elle, ne bouge pas.
 */
export function reinitialiser(stockage = stockageParDefaut()) {
  if (!stockage) return false;
  if (!estActif(stockage)) return false;
  stockage.removeItem(CLE_BAC);
  stockage.setItem(CLE_A_SEMER, '1');
  return true;
}

/**
 * Efface les CLÉS du cycle : bac, photo, date, marqueur et drapeau.
 * L'interface doit utiliser terminerExerciceComplet pour attendre AUSSI
 * l'effacement d'IndexedDB. Ne garantit pas l'effacement des copies externes.
 */
export function terminerEtToutEffacer(stockage = stockageParDefaut()) {
  if (!stockage) return false;
  stockage.removeItem(CLE_BAC);
  stockage.removeItem(CLE_PHOTO);
  stockage.removeItem(CLE_DATE);
  stockage.removeItem(CLE_A_SEMER);
  stockage.removeItem(CLE_DRAPEAU);
  return true;
}

/** Geste de l'interface : attend aussi la suppression des fichiers IndexedDB.
 * Une erreur laisse un état de nettoyage incomplet, jamais un succès annoncé.
 */
export async function terminerExerciceComplet(stockage = stockageParDefaut(), base = globalThis.indexedDB) {
  if (!stockage) throw new Error('Stockage du navigateur inaccessible : effacement non confirmé.');
  await effacerPiecesDemo(base);
  terminerEtToutEffacer(stockage);
  for (const cle of [CLE_BAC, CLE_PHOTO, CLE_DATE, CLE_A_SEMER, CLE_DRAPEAU]) {
    if (stockage.getItem(cle) !== null) throw new Error('Effacement incomplet du stockage de l’exercice. Réessayez.');
  }
  return true;
}
