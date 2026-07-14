// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — Hachage chaîné des MOUVEMENTS, côté serveur (V9-E3).
 *
 * ⚠ CLONE EXACT de `v8/js/core/utils.js` (`CHAMPS_HASH_MOUVEMENT` +
 * `hasherEcriture`). Le registre local doit produire des empreintes
 * IDENTIQUES à celles du registre démo, sinon un export démo ne se
 * réimporte pas en local (chaîne invérifiée, « fichier forgé ») et
 * réciproquement.
 *
 * On N'utilise PAS `db.hashEcriture` pour les mouvements : il diverge sur
 * trois points (projection des champs, tri des clés, format de
 * concaténation — voir docs/E3-PLAN.md §Hash). `db.hashEcriture` reste le
 * hasseur du JOURNAL d'audit (chaîne indépendante).
 *
 * L'équivalence stricte avec le front est VERROUILLÉE par
 * `server/test-hash-mouvement.mjs` : ne jamais toucher l'un sans l'autre.
 */

const crypto = require('node:crypto');

/**
 * Champs métier d'un mouvement pris dans l'empreinte, DANS CET ORDRE.
 * Le statut est volontairement exclu (VALIDE → ANNULE sans invalider la
 * signature). Copie mot pour mot de utils.js.
 */
const CHAMPS_HASH_MOUVEMENT = [
  'id', 'numero', 'date', 'mode', 'type',
  'machineId', 'fluide', 'quantiteKg',
  'peseeAvantKg', 'peseeApresKg',
  'bouteilleSrcId', 'bouteilleDstId',
  'causeMouvement', 'controle', 'technicien',
  'validateurId', 'contreEcritureDe', 'motif'
];

/**
 * Empreinte SHA-256 hexadécimale d'une écriture de mouvement, chaînée à
 * l'empreinte de l'écriture validée précédente. Reproduit exactement
 * `utils.js:hasherEcriture` (mais en `node:crypto` synchrone, là où le
 * front utilise `crypto.subtle` asynchrone — même algorithme, même
 * encodage, donc même résultat pour une pré-image identique).
 *
 * L'objet `mouvement.controle`, s'il existe, doit porter ses clés dans le
 * MÊME ORDRE que côté front (`{ statutControle, detecteurId }` puis
 * `controleId` ajouté après CR-3) : `JSON.stringify` respecte l'ordre
 * d'insertion, c'est l'appelant qui garantit cet ordre.
 *
 * @param {object} mouvement Écriture logique (champs absents comptés null).
 * @param {string|null} hashPrecedent Empreinte précédente ('' si aucune).
 * @returns {string} Empreinte hexadécimale (64 caractères).
 */
function hasherMouvement(mouvement, hashPrecedent) {
  const champs = {};
  for (const nom of CHAMPS_HASH_MOUVEMENT) {
    champs[nom] = mouvement[nom] ?? null;
  }
  const texte = `${JSON.stringify(champs)}|${hashPrecedent ?? ''}`;
  return crypto.createHash('sha256').update(texte, 'utf8').digest('hex');
}

module.exports = { CHAMPS_HASH_MOUVEMENT, hasherMouvement };
