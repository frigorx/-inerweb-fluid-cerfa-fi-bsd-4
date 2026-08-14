// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Licence nominative — DÉLIVRANCE d'une licence d'évaluation
// (plan docs/PLAN-LICENCE-NOMINATIVE.md).
//
// Signe une licence au nom d'un destinataire avec la clé PRIVÉE du
// propriétaire (générée par outils/generer-cles-licence.mjs, hors dépôt),
// la numérote (EVAL-AAAA-NNN, compteur lu du registre) et consigne la
// livraison au registre local :
//   ..\..\paquets\licences\registre-livraisons.csv
// Le registre est NOMINATIF : il reste chez le propriétaire, jamais au
// dépôt (public), jamais dans un paquet.
//
// Usage :
//   node outils/delivrer-licence.mjs "Prénom Nom" courriel@exemple.fr [--mois 6]
// ============================================================

import { createRequire } from 'node:module';
import { sign as signerBrut, createPrivateKey } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const licence = require('../server/licence.js');

const RACINE = path.resolve(import.meta.dirname, '..');
const DOSSIER_LICENCES = path.join(RACINE, '..', 'paquets', 'licences');
const CHEMIN_PRIVEE = path.join(DOSSIER_LICENCES, 'cle-privee-licence.pem');
const CHEMIN_REGISTRE = path.join(DOSSIER_LICENCES, 'registre-livraisons.csv');
const ENTETE_REGISTRE =
  'numero;titulaire;courriel;delivreLe;expireLe;fabriqueLe;empreinteZip';

// ------------------------------------------------------------
// Arguments
// ------------------------------------------------------------
const args = process.argv.slice(2);
const positionnels = [];
let moisValidite = 6;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--mois') {
    moisValidite = Number(args[i + 1]);
    i += 1;
  } else {
    positionnels.push(args[i]);
  }
}
const [titulaire, courriel] = positionnels;
if (!titulaire || !courriel || !courriel.includes('@')
  || !Number.isInteger(moisValidite) || moisValidite < 1 || moisValidite > 60) {
  console.error('Usage : node outils/delivrer-licence.mjs "Prénom Nom" courriel@exemple.fr [--mois 6]');
  process.exit(1);
}
if (!fs.existsSync(CHEMIN_PRIVEE)) {
  console.error(`[ERREUR] Clé privée introuvable : ${CHEMIN_PRIVEE}`);
  console.error('         Générez-la d\'abord : node outils/generer-cles-licence.mjs');
  process.exit(1);
}

// ------------------------------------------------------------
// Dates : délivrée aujourd'hui, expire dans N mois CIVILS
// (écrêtage fin de mois — le 31/08 + 6 mois donne le 28/02).
// ------------------------------------------------------------
const delivreLe = licence.dateDuJour();
function plusMoisCivils(dateIso, mois) {
  const [a, m, j] = dateIso.split('-').map(Number);
  const cible = new Date(Date.UTC(a, m - 1 + mois, 1));
  const dernierJour = new Date(Date.UTC(
    cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0)).getUTCDate();
  const jour = Math.min(j, dernierJour);
  return `${cible.getUTCFullYear()}-${String(cible.getUTCMonth() + 1).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}
const expireLe = plusMoisCivils(delivreLe, moisValidite);

// ------------------------------------------------------------
// Numérotation : EVAL-AAAA-NNN, rang max de l'année + 1, lu du registre.
// ------------------------------------------------------------
const annee = delivreLe.slice(0, 4);
let rang = 0;
if (fs.existsSync(CHEMIN_REGISTRE)) {
  for (const ligne of fs.readFileSync(CHEMIN_REGISTRE, 'utf8').split(/\r?\n/)) {
    const m = ligne.match(new RegExp(`^EVAL-${annee}-(\\d{3});`));
    if (m) rang = Math.max(rang, Number(m[1]));
  }
}
const numero = `EVAL-${annee}-${String(rang + 1).padStart(3, '0')}`;

// ------------------------------------------------------------
// Signature et écriture
// ------------------------------------------------------------
const objet = {
  produit: licence.PRODUIT_LICENCE,
  cle: 1,
  numero,
  titulaire: titulaire.trim(),
  courriel: courriel.trim(),
  delivreLe,
  expireLe,
  portee: 'EVALUATION',
};
objet.signature = signerBrut(
  null,
  Buffer.from(licence.chaineCanoniqueLicence(objet), 'utf8'),
  createPrivateKey(fs.readFileSync(CHEMIN_PRIVEE, 'utf8'))).toString('base64');

// Auto-contrôle : la licence qu'on vient de signer DOIT être acceptée par le
// vérificateur embarqué (clé publique n° 1 du module). Refus = les clés ne
// vont pas ensemble, on n'écrit rien.
const verdict = licence.verifierLicence(objet, delivreLe);
if (!verdict.ok) {
  console.error(`[ERREUR] Auto-contrôle refusé (${verdict.motif}).`);
  console.error('         La clé privée ne correspond pas à la clé publique embarquée');
  console.error('         dans server/licence.js — licence NON délivrée.');
  process.exit(1);
}

const cheminLicence = path.join(DOSSIER_LICENCES, `${numero}-licence-inerweb.json`);
fs.writeFileSync(cheminLicence, JSON.stringify(objet, null, 2) + '\n', 'utf8');

if (!fs.existsSync(CHEMIN_REGISTRE)) {
  fs.writeFileSync(CHEMIN_REGISTRE, ENTETE_REGISTRE + '\n', 'utf8');
}
fs.appendFileSync(CHEMIN_REGISTRE,
  `${numero};${objet.titulaire};${objet.courriel};${delivreLe};${expireLe};;\n`, 'utf8');

console.log('');
console.log(`  Licence ${numero} délivrée.`);
console.log(`  Titulaire : ${objet.titulaire} <${objet.courriel}>`);
console.log(`  Validité  : du ${delivreLe} au ${expireLe} (${moisValidite} mois)`);
console.log(`  Fichier   : ${cheminLicence}`);
console.log(`  Registre  : ${CHEMIN_REGISTRE}`);
console.log('');
console.log('  Étape suivante — fabriquer le paquet de ce destinataire :');
console.log(`    node outils/fabriquer-paquet.mjs --licence "${cheminLicence}" --zip`);
console.log('');
