// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Licence d'évaluation nominative — comportement du vérificateur
// (plan docs/PLAN-LICENCE-NOMINATIVE.md). Exécution : node server/test-licence.mjs
//
// La suite signe ses licences avec une paire Ed25519 JETABLE générée ici
// même : la clé privée réelle du propriétaire ne touche jamais le filet.
// Contre-épreuve incluse : chaque champ altéré après signature doit rendre
// SIGNATURE_INVALIDE — si quelqu'un débranche la vérification, la section 3
// devient rouge.
// ============================================================

import { createRequire } from 'node:module';
import { generateKeyPairSync, sign as signerBrut } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const licence = require('./licence.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

// ------------------------------------------------------------
// Paire jetable + fabrique de licences signées
// ------------------------------------------------------------
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const CLES_TEST = { 1: publicKey.export({ type: 'spki', format: 'pem' }).toString() };
const OPTIONS = { clesPubliques: CLES_TEST };

function licenceSignee(surcharges = {}) {
  const objet = {
    produit: 'inerWeb Fluide',
    cle: 1,
    numero: 'EVAL-2026-042',
    titulaire: 'Un enseignant',
    courriel: 'testeur@exemple.fr',
    delivreLe: '2026-08-14',
    expireLe: '2027-02-14',
    portee: 'EVALUATION',
    ...surcharges,
  };
  objet.signature = signerBrut(
    null,
    Buffer.from(licence.chaineCanoniqueLicence(objet), 'utf8'),
    privateKey).toString('base64');
  return objet;
}

const AUJOURDHUI = '2026-08-20';

// ------------------------------------------------------------
console.log('--- 1. Licence bien formée et signée ---');
// ------------------------------------------------------------
{
  const verdict = licence.verifierLicence(licenceSignee(), AUJOURDHUI, OPTIONS);
  verifier('une licence signée et à échéance future est VALIDE',
    verdict.ok === true && verdict.motif === licence.MOTIF_VALIDE);
  verifier('le verdict rend les champs de la licence (sans la signature)',
    verdict.licence && verdict.licence.numero === 'EVAL-2026-042'
    && verdict.licence.signature === undefined);
  verifier('le jour même de l\'échéance, la licence est encore VALIDE',
    licence.verifierLicence(licenceSignee({ expireLe: AUJOURDHUI }),
      AUJOURDHUI, OPTIONS).ok === true);
}

// ------------------------------------------------------------
console.log('--- 2. Champs manquants ou invalides ---');
// ------------------------------------------------------------
{
  verifier('objet absent → ABSENTE',
    licence.verifierLicence(null, AUJOURDHUI, OPTIONS).motif === licence.MOTIF_ABSENTE);
  for (const champ of licence.CHAMPS_LICENCE) {
    const objet = licenceSignee();
    delete objet[champ];
    const verdict = licence.verifierLicence(objet, AUJOURDHUI, OPTIONS);
    verifier(`champ « ${champ} » manquant → CHAMP_MANQUANT`,
      verdict.ok === false && verdict.motif === licence.MOTIF_CHAMP_MANQUANT
      && verdict.detail === champ, verdict.motif);
  }
  verifier('signature manquante → CHAMP_MANQUANT',
    (() => { const o = licenceSignee(); delete o.signature;
      return licence.verifierLicence(o, AUJOURDHUI, OPTIONS); })().motif
      === licence.MOTIF_CHAMP_MANQUANT);
  verifier('produit inconnu → CHAMP_INVALIDE (même signé correctement)',
    licence.verifierLicence(licenceSignee({ produit: 'Autre logiciel' }),
      AUJOURDHUI, OPTIONS).motif === licence.MOTIF_CHAMP_INVALIDE);
  verifier('portée inconnue → CHAMP_INVALIDE',
    licence.verifierLicence(licenceSignee({ portee: 'PRODUCTION' }),
      AUJOURDHUI, OPTIONS).motif === licence.MOTIF_CHAMP_INVALIDE);
  verifier('numéro de clé inconnu → CHAMP_INVALIDE',
    licence.verifierLicence(licenceSignee({ cle: 9 }),
      AUJOURDHUI, OPTIONS).motif === licence.MOTIF_CHAMP_INVALIDE);
  // Doctrine dates.js : une date présente mais illisible ne s'interprète pas.
  verifier('échéance « 2027-99-99 » (hors calendrier) → CHAMP_INVALIDE',
    licence.verifierLicence(licenceSignee({ expireLe: '2027-99-99' }),
      AUJOURDHUI, OPTIONS).motif === licence.MOTIF_CHAMP_INVALIDE);
  verifier('échéance « 14/02/2027 » (format non ancré) → CHAMP_INVALIDE',
    licence.verifierLicence(licenceSignee({ expireLe: '14/02/2027' }),
      AUJOURDHUI, OPTIONS).motif === licence.MOTIF_CHAMP_INVALIDE);
  verifier('un « aujourd\'hui » illisible ne conclut JAMAIS à la validité',
    licence.verifierLicence(licenceSignee(), 'demain', OPTIONS).ok === false);
}

// ------------------------------------------------------------
console.log('--- 3. Signature (contre-épreuve du dispositif) ---');
// ------------------------------------------------------------
{
  // Chaque champ signé, altéré APRÈS signature, doit casser la vérification.
  const alterations = {
    numero: 'EVAL-2026-999',
    titulaire: 'Quelqu\'un d\'autre',
    courriel: 'autre@exemple.fr',
    delivreLe: '2026-01-01',
    expireLe: '2099-12-31',
  };
  for (const [champ, valeur] of Object.entries(alterations)) {
    const objet = licenceSignee();
    objet[champ] = valeur;
    verifier(`« ${champ} » modifié après signature → SIGNATURE_INVALIDE`,
      licence.verifierLicence(objet, AUJOURDHUI, OPTIONS).motif
        === licence.MOTIF_SIGNATURE_INVALIDE);
  }
  verifier('signature d\'une AUTRE clé privée → SIGNATURE_INVALIDE',
    (() => {
      const autre = generateKeyPairSync('ed25519');
      const objet = licenceSignee();
      objet.signature = signerBrut(null,
        Buffer.from(licence.chaineCanoniqueLicence(objet), 'utf8'),
        autre.privateKey).toString('base64');
      return licence.verifierLicence(objet, AUJOURDHUI, OPTIONS).motif;
    })() === licence.MOTIF_SIGNATURE_INVALIDE);
  verifier('signature illisible (base64 de bruit) → SIGNATURE_INVALIDE',
    licence.verifierLicence({ ...licenceSignee(), signature: 'cGFzIHVuZSBzaWduYXR1cmU=' },
      AUJOURDHUI, OPTIONS).motif === licence.MOTIF_SIGNATURE_INVALIDE);
}

// ------------------------------------------------------------
console.log('--- 4. Expiration (ordre des vérifications) ---');
// ------------------------------------------------------------
{
  const verdict = licence.verifierLicence(
    licenceSignee({ expireLe: '2026-08-19' }), AUJOURDHUI, OPTIONS);
  verifier('échéance dépassée d\'un jour → EXPIREE',
    verdict.ok === false && verdict.motif === licence.MOTIF_EXPIREE);
  verifier('une licence EXPIREE rend quand même son identité (lecture seule)',
    verdict.licence && verdict.licence.titulaire === 'Un enseignant');
  // Une licence expirée DONT LA SIGNATURE EST FAUSSE n'est jamais EXPIREE :
  // la falsification prime sur l'échéance.
  const falsifiee = licenceSignee({ expireLe: '2026-08-19' });
  falsifiee.titulaire = 'Faussaire';
  verifier('expirée ET falsifiée → SIGNATURE_INVALIDE, jamais EXPIREE',
    licence.verifierLicence(falsifiee, AUJOURDHUI, OPTIONS).motif
      === licence.MOTIF_SIGNATURE_INVALIDE);
}

// ------------------------------------------------------------
console.log('--- 5. Décision de démarrage (ce que serveur.js applique) ---');
// ------------------------------------------------------------
{
  const dossier = mkdtempSync(join(tmpdir(), 'iwf-licence-'));
  const ENV_REQUISE = { IWF_LICENCE_REQUISE: '1' };

  verifier('dépôt de développement (ni node.exe, ni forçage) → non requise, démarre',
    (() => {
      const d = licence.evaluerDemarrageLicence({ racine: dossier, env: {} });
      return d.requise === false && d.demarrer === true && d.lectureSeule === false;
    })());

  verifier('requise et absente → REFUS de démarrer, message avec le contact',
    (() => {
      const d = licence.evaluerDemarrageLicence({
        racine: dossier, env: ENV_REQUISE, aujourdHui: AUJOURDHUI, options: OPTIONS });
      return d.demarrer === false && d.motif === licence.MOTIF_ABSENTE
        && d.message.includes(licence.CONTACT_LICENCE);
    })());

  writeFileSync(join(dossier, licence.NOM_FICHIER_LICENCE), 'pas du JSON {', 'utf8');
  verifier('fichier illisible → REFUS de démarrer (ILLISIBLE, jamais interprété)',
    (() => {
      const d = licence.evaluerDemarrageLicence({
        racine: dossier, env: ENV_REQUISE, aujourdHui: AUJOURDHUI, options: OPTIONS });
      return d.demarrer === false && d.motif === licence.MOTIF_ILLISIBLE;
    })());

  writeFileSync(join(dossier, licence.NOM_FICHIER_LICENCE),
    JSON.stringify(licenceSignee(), null, 2), 'utf8');
  verifier('licence valide → démarre, identité rendue, jamais lecture seule',
    (() => {
      const d = licence.evaluerDemarrageLicence({
        racine: dossier, env: ENV_REQUISE, aujourdHui: AUJOURDHUI, options: OPTIONS });
      return d.demarrer === true && d.lectureSeule === false
        && d.motif === licence.MOTIF_VALIDE
        && d.licence.numero === 'EVAL-2026-042';
    })());

  writeFileSync(join(dossier, licence.NOM_FICHIER_LICENCE),
    JSON.stringify(licenceSignee({ expireLe: '2026-08-01' }), null, 2), 'utf8');
  verifier('licence expirée → démarre en LECTURE SEULE (jamais de registre en otage)',
    (() => {
      const d = licence.evaluerDemarrageLicence({
        racine: dossier, env: ENV_REQUISE, aujourdHui: AUJOURDHUI, options: OPTIONS });
      return d.demarrer === true && d.lectureSeule === true
        && d.motif === licence.MOTIF_EXPIREE
        && d.message.includes(licence.CONTACT_LICENCE);
    })());

  const falsifiee = licenceSignee();
  falsifiee.expireLe = '2099-12-31';
  writeFileSync(join(dossier, licence.NOM_FICHIER_LICENCE),
    JSON.stringify(falsifiee, null, 2), 'utf8');
  verifier('licence falsifiée (échéance réécrite) → REFUS de démarrer',
    (() => {
      const d = licence.evaluerDemarrageLicence({
        racine: dossier, env: ENV_REQUISE, aujourdHui: AUJOURDHUI, options: OPTIONS });
      return d.demarrer === false && d.motif === licence.MOTIF_SIGNATURE_INVALIDE;
    })());

  rmSync(dossier, { recursive: true, force: true });
}

// ------------------------------------------------------------
console.log('--- 6. La clé publique réellement embarquée ---');
// ------------------------------------------------------------
{
  const { createPublicKey } = await import('node:crypto');
  verifier('la clé n° 1 embarquée est une clé publique Ed25519 lisible',
    (() => {
      try {
        const cle = createPublicKey(licence.CLES_PUBLIQUES_LICENCE[1]);
        return cle.asymmetricKeyType === 'ed25519';
      } catch { return false; }
    })());
  verifier('le message de lecture seule porte l\'échéance et le contact',
    licence.messageLectureSeule({ expireLe: '2027-02-14' }).includes('2027-02-14')
    && licence.messageLectureSeule({ expireLe: '2027-02-14' })
      .includes(licence.CONTACT_LICENCE));
}

// ------------------------------------------------------------
console.log('');
if (nbEchecs > 0) {
  console.error(`ÉCHEC — ${nbEchecs} vérification(s) rouge(s) sur ${nbOk + nbEchecs}.`);
  process.exit(1);
}
console.log(`TOUT VERT — ${nbOk} vérifications (licence nominative).`);
