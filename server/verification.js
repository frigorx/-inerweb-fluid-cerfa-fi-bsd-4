'use strict';

/**
 * inerWeb Fluide — Vérification d'intégrité PARAMÉTRÉE PAR INSTANCE (V9-E4.1).
 * ==========================================================================
 * `verifierIntegrite(instance)` juge une base SQLite ARBITRAIRE (n'importe
 * quelle instance `DatabaseSync`, pas le singleton de db.js) sur QUATRE
 * plans, dans cet ordre :
 *   1. `PRAGMA integrity_check`  — cohérence physique du fichier ;
 *   2. `PRAGMA foreign_key_check`— cohérence référentielle ;
 *   3. chaîne du REGISTRE des mouvements (hash chaîné, hash-mouvement.js) ;
 *   4. chaîne du JOURNAL d'audit (hash chaîné, logique de db.js:hashEcriture).
 *
 * POURQUOI par instance : le noyau de sauvegarde doit vérifier une base
 * FRAÎCHEMENT extraite (base temporaire, jamais le data/ vivant) avant de
 * la déclarer restaurable — « une sauvegarde jamais testée n'est qu'un
 * espoir » (VISION §4.3). Le singleton db.js reste réservé à la base
 * vivante ; ici on ouvre/ferme une instance dédiée en amont et on la passe.
 *
 * ANTI-DIVERGENCE (exigence du plan E4) : la logique de chaînage n'est PAS
 * réécrite « à la main ». Le registre réutilise `hash-mouvement.js`
 * (hasherMouvement) et `mapping.js` (versFront) — exactement les briques de
 * api.js:verifierChaineMouvements. Le journal réutilise le MÊME schéma de
 * hachage que db.js:hashEcriture (sérialisation stable + SHA-256 chaîné).
 * Toute évolution de l'un de ces modules se répercute ici sans copie morte.
 * Un test croisé (server/test-sauvegarde du plan, et ce module) verrouille
 * que verifierIntegrite VERT ⇔ api.verifierChaineMouvements + journal verts.
 *
 * Ce module NE refactore PAS db.js/api.js (le plan l'interdit à ce stade) :
 * il est autonome et pourra être réutilisé par eux plus tard.
 *
 * Zéro dépendance externe (node:crypto + deux modules maison stateless).
 */

const crypto = require('node:crypto');
const mapping = require('./mapping.js');
const { hasherMouvement } = require('./hash-mouvement.js');

// ------------------------------------------------------------
// Registre des mouvements — chaîne de hash, sur l'instance passée.
// Reproduit api.js (chaineValidee + objetLogiquePourHash +
// verifierChaineMouvements) SANS toucher au singleton : les lectures se
// font sur `instance`, la reconstitution de l'objet logique passe par le
// mapping partagé et le hasseur partagé.
// ------------------------------------------------------------

/**
 * Reconstitue le `controle` imbriqué d'un mouvement depuis ses colonnes
 * aplaties — MIROIR EXACT de api.js:reconstituerMouvement (mêmes clés, même
 * ordre d'insertion { statutControle, detecteurId } puis controleId), pour
 * que le sous-objet stringifié dans l'empreinte soit identique.
 * @param {object} ligneSql - ligne brute de `mouvements`
 * @returns {object} mouvement logique (camelCase) avec `controle` reconstitué
 */
function reconstituerMouvement(ligneSql) {
  const mouvement = mapping.versFront('mouvements', ligneSql);
  if (ligneSql.statut_controle_declare != null) {
    const controle = {
      statutControle: ligneSql.statut_controle_declare,
      detecteurId: ligneSql.detecteur_declare_id ?? null
    };
    // R5 : clé ajoutée SEULEMENT si fournie, AVANT controleId — clone
    // EXACT de api.js:reconstituerMouvement. Son OMISSION ici (corrigée
    // brique ②) faisait juger « chaîne registre rompue » toute sauvegarde
    // contenant un mouvement FUITE avec localisation déclarée : la clé
    // avait été hachée au scellement mais manquait à la re-vérification
    // (JSON.stringify est sensible à la présence des clés).
    if (ligneSql.localisation_fuite_declaree != null) {
      controle.localisationFuite = ligneSql.localisation_fuite_declaree;
    }
    if (ligneSql.controle_lie_id != null) {
      controle.controleId = ligneSql.controle_lie_id;
    }
    mouvement.controle = controle;
  }
  return mouvement;
}

/**
 * Objet logique projeté sur les 18 champs de l'empreinte, dans l'ordre
 * canonique — CLONE EXACT de api.js:objetLogiquePourHash (le `controle`
 * reconstitué est repris tel quel, son ordre de clés étant déjà fixé
 * ci-dessus). hasherMouvement re-projette de toute façon, mais l'objet reste
 * fidèle bit pour bit.
 */
function objetLogiquePourHash(mouvement) {
  return {
    id: mouvement.id,
    numero: mouvement.numero,
    date: mouvement.date,
    mode: mouvement.mode,
    type: mouvement.type,
    machineId: mouvement.machineId ?? null,
    fluide: mouvement.fluide ?? null,
    quantiteKg: mouvement.quantiteKg ?? null,
    peseeAvantKg: mouvement.peseeAvantKg ?? null,
    peseeApresKg: mouvement.peseeApresKg ?? null,
    bouteilleSrcId: mouvement.bouteilleSrcId ?? null,
    bouteilleDstId: mouvement.bouteilleDstId ?? null,
    causeMouvement: mouvement.causeMouvement ?? null,
    controle: mouvement.controle ?? null,
    technicien: mouvement.technicien ?? null,
    validateurId: mouvement.validateurId ?? null,
    contreEcritureDe: mouvement.contreEcritureDe ?? null,
    motif: mouvement.motif ?? null
  };
}

/**
 * Écritures figées (VALIDE/ANNULE, ordre_validation non NULL) de l'instance,
 * triées par ordre_validation, reconstituées en objets re-hashables — comme
 * api.js:chaineValidee, mais sur l'instance fournie.
 */
function chaineValidee(instance) {
  const lignes = instance.prepare(
    `SELECT * FROM mouvements
     WHERE statut IN ('VALIDE','ANNULE') AND ordre_validation IS NOT NULL
     ORDER BY ordre_validation`).all();
  return lignes.map((ligne) => {
    const mv = reconstituerMouvement(ligne);
    mv.ordreValidation = ligne.ordre_validation;
    mv.hashEcriture = ligne.hash_ecriture;
    mv.hashPrecedent = ligne.hash_precedent;
    return mv;
  });
}

/**
 * Re-parcourt la chaîne du registre sur l'instance et recalcule chaque
 * empreinte — CLONE de api.js:verifierChaineMouvements.
 * @returns {{ok: boolean, casseA: string|null}} casseA = numéro de la
 *          première écriture en rupture.
 */
function verifierChaineMouvements(instance) {
  let precedent = null;
  for (const mouvement of chaineValidee(instance)) {
    if ((mouvement.hashPrecedent ?? null) !== precedent) {
      return { ok: false, casseA: mouvement.numero };
    }
    const attendu = hasherMouvement(
      objetLogiquePourHash(mouvement), precedent);
    if (attendu !== mouvement.hashEcriture) {
      return { ok: false, casseA: mouvement.numero };
    }
    precedent = mouvement.hashEcriture;
  }
  return { ok: true, casseA: null };
}

// ------------------------------------------------------------
// Journal d'audit — chaîne de hash, sur l'instance passée.
// Reproduit db.js (stringifierStable + hashEcriture + verifierChaineJournal)
// à l'identique. Recopié ici plutôt qu'importé car db.js:hashEcriture opère
// sur le singleton et n'est pas exporté sous forme paramétrable par instance
// (le plan interdit de refactorer db.js maintenant).
// ------------------------------------------------------------

/**
 * Sérialisation JSON STABLE (clés triées récursivement) — copie exacte de
 * db.js:stringifierStable. Le hash d'une entrée doit être identique quel que
 * soit l'ordre de construction de l'objet.
 */
function stringifierStable(valeur) {
  if (valeur === null || typeof valeur !== 'object') {
    return JSON.stringify(valeur === undefined ? null : valeur);
  }
  if (Array.isArray(valeur)) {
    return '[' + valeur.map(stringifierStable).join(',') + ']';
  }
  const cles = Object.keys(valeur).sort();
  return '{' + cles
    .map((cle) => JSON.stringify(cle) + ':' + stringifierStable(valeur[cle]))
    .join(',') + '}';
}

/**
 * Empreinte SHA-256 chaînée d'une entrée de journal — copie exacte de
 * db.js:hashEcriture (même pré-image `hashPrecedent + '\n' + stable`).
 */
function hashEntreeJournal(donnees, hashPrecedent = '') {
  return crypto
    .createHash('sha256')
    .update(hashPrecedent + '\n' + stringifierStable(donnees), 'utf8')
    .digest('hex');
}

/**
 * Recalcule la chaîne du journal sur l'instance — CLONE de
 * db.js:verifierChaineJournal (une ligne sans hash est une anomalie
 * SIGNALÉE, jamais tolérée).
 * @returns {{ok: boolean, casseA: number|null}} casseA = id de la première
 *          entrée en rupture.
 */
function verifierChaineJournal(instance) {
  const entrees = instance.prepare(
    `SELECT id, date_heure, utilisateur, action, cible, details,
            hash_precedent, hash
     FROM journal_audit ORDER BY id`).all();
  let precedent = '';
  for (const entree of entrees) {
    if (entree.hash === null) {
      return { ok: false, casseA: entree.id };
    }
    const attendu = hashEntreeJournal({
      date_heure: entree.date_heure,
      utilisateur: entree.utilisateur,
      action: entree.action,
      cible: entree.cible,
      details: entree.details
    }, precedent);
    if ((entree.hash_precedent ?? '') !== precedent
      || entree.hash !== attendu) {
      return { ok: false, casseA: entree.id };
    }
    precedent = entree.hash;
  }
  return { ok: true, casseA: null };
}

// ------------------------------------------------------------
// PRAGMA physiques.
// ------------------------------------------------------------

/**
 * `PRAGMA integrity_check` : renvoie true si la base répond « ok », sinon le
 * premier message d'anomalie. SQLite renvoie la ligne littérale « ok » quand
 * tout est sain.
 * @returns {{ok: boolean, message: string|null}}
 */
function verifierIntegritePhysique(instance) {
  const lignes = instance.prepare('PRAGMA integrity_check').all();
  const premier = lignes[0]?.integrity_check ?? null;
  if (lignes.length === 1 && premier === 'ok') {
    return { ok: true, message: null };
  }
  return { ok: false, message: premier ?? 'anomalie inconnue' };
}

/**
 * `PRAGMA foreign_key_check` : aucune ligne = intégrité référentielle saine.
 * Toute ligne signale une violation (table + rowid + table référencée).
 * @returns {{ok: boolean, violations: number, premiere: object|null}}
 */
function verifierClesEtrangeres(instance) {
  const lignes = instance.prepare('PRAGMA foreign_key_check').all();
  return {
    ok: lignes.length === 0,
    violations: lignes.length,
    premiere: lignes[0] ?? null
  };
}

// ------------------------------------------------------------
// Verdict global.
// ------------------------------------------------------------

/**
 * Vérifie l'intégrité COMPLÈTE d'une base SQLite arbitraire. Les quatre
 * contrôles sont TOUS exécutés (le rapport `details` porte l'état de chacun),
 * mais `ok` est le ET logique : une seule anomalie rend la base non fiable.
 *
 * @param {import('node:sqlite').DatabaseSync} instance - base à juger
 *        (jamais le singleton db.js : une instance dédiée, souvent ouverte
 *        en lecture seule sur une copie fraîche).
 * @returns {{ok: boolean, details: {
 *   integritePhysique: {ok: boolean, message: string|null},
 *   clesEtrangeres: {ok: boolean, violations: number, premiere: object|null},
 *   chaineRegistre: {ok: boolean, casseA: string|null},
 *   chaineJournal: {ok: boolean, casseA: number|null}
 * }}}
 */
function verifierIntegrite(instance) {
  if (!instance || typeof instance.prepare !== 'function') {
    throw new Error(
      'verifierIntegrite : une instance DatabaseSync ouverte est requise.');
  }
  const integritePhysique = verifierIntegritePhysique(instance);
  const clesEtrangeres = verifierClesEtrangeres(instance);
  const chaineRegistre = verifierChaineMouvements(instance);
  const chaineJournal = verifierChaineJournal(instance);

  const ok = integritePhysique.ok && clesEtrangeres.ok
    && chaineRegistre.ok && chaineJournal.ok;

  return {
    ok,
    details: {
      integritePhysique,
      clesEtrangeres,
      chaineRegistre,
      chaineJournal
    }
  };
}

module.exports = {
  verifierIntegrite,
  // Exposés pour réutilisation ciblée (manifeste, tests) — mêmes briques.
  verifierChaineMouvements,
  verifierChaineJournal,
  verifierIntegritePhysique,
  verifierClesEtrangeres
};
