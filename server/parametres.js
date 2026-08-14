// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — Réglages persistants (table `parametres`).
 * ============================================================================
 * Accès générique clé/valeur à la table `parametres` (schema.sql v1), déjà
 * incluse dans les ARCHIVES de sauvegarde (config/parametres.json) — un
 * réglage posé ici survit donc à une restauration d'archive complète.
 *
 * Les appelants garantissent que la base est ouverte (contexte de requête).
 * Zéro dépendance externe.
 */

const db = require('./db.js');

/**
 * Lit un paramètre. Renvoie `defaut` si la clé est absente.
 * @param {string} cle
 * @param {*} [defaut]
 * @returns {string|null|*}
 */
function lire(cle, defaut = null) {
  const ligne = db.get('SELECT valeur FROM parametres WHERE cle = ?', [cle]);
  return ligne ? ligne.valeur : defaut;
}

/**
 * Écrit (upsert) un paramètre. `null` est stocké tel quel (efface la valeur).
 * La date de modification est posée par la base (DEFAULT datetime local).
 * @param {string} cle
 * @param {string|number|null} valeur
 */
function ecrire(cle, valeur) {
  db.run(
    `INSERT INTO parametres (cle, valeur, date_modification)
     VALUES (?, ?, datetime('now','localtime'))
     ON CONFLICT(cle) DO UPDATE
       SET valeur = excluded.valeur,
           date_modification = excluded.date_modification`,
    [cle, valeur == null ? null : String(valeur)]);
}

module.exports = { lire, ecrire };
