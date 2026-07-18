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
 * Champs de l'empreinte RENFORCÉE v2 (lot C, brique C2) — copie mot pour
 * mot de utils.js:CHAMPS_HASH_MOUVEMENT_V2. La liste v1 ci-dessus est
 * FIGÉE À JAMAIS (les écritures existantes gardent leur empreinte v1).
 */
const CHAMPS_HASH_MOUVEMENT_V2 = [
  ...CHAMPS_HASH_MOUVEMENT,
  'prpFige', 'cerfaNumero',
  'executeParId', 'superviseurId', 'responsableRegistreId',
  'outilsFiges', 'hashSignatures', 'hashPiecesJointes', 'hashPdfFinal'
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
  // Lot C (C2) : hasseur VERSIONNÉ — la version de l'ÉCRITURE choisit sa
  // liste de champs (2 = renforcée ; 1 ou absente = historique, préimage
  // STRICTEMENT inchangée bit à bit). Clone exact de utils.js.
  const noms = (mouvement.versionEmpreinte ?? 1) >= 2
    ? CHAMPS_HASH_MOUVEMENT_V2 : CHAMPS_HASH_MOUVEMENT;
  const champs = {};
  for (const nom of noms) {
    champs[nom] = mouvement[nom] ?? null;
  }
  const texte = `${JSON.stringify(champs)}|${hashPrecedent ?? ''}`;
  return crypto.createHash('sha256').update(texte, 'utf8').digest('hex');
}

/**
 * Empreinte SHA-256 d'une LISTE de chaînes, TRIÉE puis JSON-sérialisée —
 * clone exact de utils.js:empreinteListeTriee (mais synchrone). Liste vide
 * → empreinte de « [] », jamais null.
 * @param {string[]} chaines
 * @returns {string} empreinte hexadécimale (64 caractères)
 */
function empreinteListeTriee(chaines) {
  const texte = JSON.stringify([...chaines].sort());
  return crypto.createHash('sha256').update(texte, 'utf8').digest('hex');
}

/**
 * Forme CANONIQUE d'une signature réelle pour l'empreinte v2 — clone exact
 * de utils.js:chaineCanoniqueSignature (ordre de clés FIXE, absents → null).
 */
function chaineCanoniqueSignature(signature, sha256Image) {
  return JSON.stringify({
    role: signature.role ?? null,
    nom: signature.nom ?? null,
    prenom: signature.prenom ?? null,
    qualite: signature.qualite ?? null,
    dateHeure: signature.dateHeure ?? null,
    declaration: signature.declaration ?? null,
    sha256Image: sha256Image ?? null,
    versionDocument: signature.versionDocument ?? null
  });
}

module.exports = {
  CHAMPS_HASH_MOUVEMENT,
  CHAMPS_HASH_MOUVEMENT_V2,
  hasherMouvement,
  empreinteListeTriee,
  chaineCanoniqueSignature
};
