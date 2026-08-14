// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Licence nominative — génération de la paire de clés de signature
// (plan docs/PLAN-LICENCE-NOMINATIVE.md).
//
// À N'EXÉCUTER QU'UNE FOIS. La clé PRIVÉE signe les licences délivrées ;
// elle vit chez le propriétaire, HORS du dépôt (le dépôt est public), par
// défaut dans ..\..\paquets\licences\ à côté du registre des livraisons.
// La clé PUBLIQUE, elle, est EMBARQUÉE dans server/licence.js : c'est elle
// qui vérifie les licences sur chaque poste, sans aucun appel réseau.
//
// Perdre la clé privée = ne plus pouvoir délivrer de nouvelles licences
// (celles déjà émises restent valides). La sauvegarder HORS LIGNE (clé USB,
// impression papier) dès la génération.
//
// Usage : node outils/generer-cles-licence.mjs [dossierSortie]
// ============================================================

import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.resolve(import.meta.dirname, '..');
const DOSSIER = path.resolve(
  process.argv[2] ?? path.join(RACINE, '..', 'paquets', 'licences'));

const CHEMIN_PRIVEE = path.join(DOSSIER, 'cle-privee-licence.pem');
const CHEMIN_PUBLIQUE = path.join(DOSSIER, 'cle-publique-licence.pem');

// Garde anti-écrasement : régénérer une paire invaliderait la clé publique
// embarquée dans tous les paquets déjà distribués.
if (fs.existsSync(CHEMIN_PRIVEE)) {
  console.error('[ERREUR] Une clé privée existe déjà :');
  console.error(`         ${CHEMIN_PRIVEE}`);
  console.error('         La régénérer invaliderait les paquets déjà distribués.');
  console.error('         Supprimez-la à la main si c\'est vraiment voulu.');
  process.exit(1);
}

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const pemPrivee = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pemPublique = publicKey.export({ type: 'spki', format: 'pem' });

fs.mkdirSync(DOSSIER, { recursive: true });
fs.writeFileSync(CHEMIN_PRIVEE, pemPrivee, 'utf8');
fs.writeFileSync(CHEMIN_PUBLIQUE, pemPublique, 'utf8');

console.log('');
console.log('  Paire de clés Ed25519 générée.');
console.log(`  Clé privée  : ${CHEMIN_PRIVEE}`);
console.log('                (à sauvegarder HORS LIGNE, ne JAMAIS la mettre au dépôt)');
console.log(`  Clé publique: ${CHEMIN_PUBLIQUE}`);
console.log('');
console.log('  Clé publique à embarquer dans server/licence.js (CLE_PUBLIQUE_LICENCE) :');
console.log('');
console.log(pemPublique);
