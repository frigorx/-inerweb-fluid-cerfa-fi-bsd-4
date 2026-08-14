// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// SUITE E2E OFFICIELLE (lot C, brique C5) — le parcours du mode
// Officiel de BOUT EN BOUT, verrou de livraison OUVERT, contre la
// vraie API sur base JETABLE :
//   1. décor COMPLET des conditions bloquantes (attestation de
//      capacité, balance + détecteur conformes, intervenant habilité,
//      sauvegarde VÉRIFIÉE du poste, compte de session lié) ;
//   2. fiche OFFICIELLE : création (PASSAGE ouvert — première fois),
//      soumission, double signature réelle, validation avec PDF final
//      → scellée v2, PDF conservé + témoins (manifeste EN TRANSACTION
//      avec signataires — différé C3b couvert), chaîne verte ;
//   3. TRANSFERT OFFICIEL : exempté du PDF final (arbitrage Franck
//      19/07) — validé SANS PDF, hashPdfFinal null, refusé AVEC ;
//   4. contre-écriture d'une fiche officielle : scelle v2 SANS
//      parcours de signatures (plan lot C §9 « à confirmer à la
//      bascule » — confirmé ici) et SANS numéro de fiche CERFA
//      (lot 1 branche A, 27/07/2026) ;
//   5. WORM pieces_jointes (migration 24) tiré sur le VRAI parcours ;
//   6. dossier d'audit (LocalStore in-process) : le CERFA de la fiche
//      officielle est le PDF CONSERVÉ (octets identiques), verdict
//      02-PDF-CONSERVES.txt, pas de doublon par le contrôle lié, et le
//      justificatif de régularisation REMPLACE le CERFA de la
//      contre-écriture (lot 1 branche A) ;
//   7. export → import round-trip : registre sain, PDF toujours vert.
// Exécution : node server/test-officiel-e2e.mjs — base JETABLE.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const crypto = require('node:crypto');
const db = require('./db.js');
const api = require('./api.js');
const comptes = require('./comptes.js');
const sauvegardeAuto = require('./sauvegarde-auto.js');

import { creerLocalStore } from '../v8/js/data/local-store.js';
import { genererDossierAudit } from '../v8/js/documents/dossier-audit.js';
import { VERROU_LIVRAISON } from '../v8/js/data/blocage-officiel.js';
import { pngDeTest } from './fabrique-png-test.mjs';

// T1 (20/07/2026, audit externe #2) — SUITE GELÉE tant que le mode Officiel
// est refermé. Ce parcours e2e n'est franchissable qu'avec le verrou OUVERT ;
// il a été prouvé vert le 19/07 (brique C5). Le code est conservé INTACT et
// sera rejoué à la réouverture, après les priorités P0 (qui réécrivent le
// parcours officiel : createControle dans l'agrégat WORM, contrôle autonome
// officiel, etc.). Voir docs/CONSTATS-AUDIT-EXTERNE-2026-07-20.md.
//
// ⚠️ À LA RÉOUVERTURE (consigne P7-e, 20/07 soir) : AJOUTER au rejeu le cas
// « mouvement de type CONTROLE en mode OFFICIEL » — brouillon → double
// signature réelle → validation avec PDF final conservé → contrôle lié scellé
// (P7-a→e ont livré le parcours ; seule sa déclinaison OFFICIELLE, bloquée
// par le verrou, reste à prouver de bout en bout ici). NB : createControle
// DIRECT en OFFICIEL est désormais refusé STRUCTURELLEMENT (P7-c,
// MSG_CONTROLE_DIRECT_OFFICIEL) — le rejeu ne doit plus l'attendre ouvert.
if (VERROU_LIVRAISON) {
  console.log('SUSPENDU — suite e2e officielle gelée : mode Officiel refermé '
    + '(T1). À rejouer à la réouverture du verrou, après les P0.');
  process.exit(0);
}

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}
function attendreRejet(libelle, fn, extrait) {
  try {
    fn();
    verifier(libelle, false, 'aucune erreur levée');
  } catch (erreur) {
    verifier(libelle, String(erreur.message).includes(extrait),
      `message = « ${erreur.message} »`);
  }
}

/** AAAA-MM-JJ à n jours d'aujourd'hui. */
function dateRelative(jours) {
  const d = new Date(Date.now() + jours * 86400000);
  return d.toISOString().slice(0, 10);
}

/**
 * Octets d'un VRAI PNG de signature (lot B3, 25/07 : l'image est
 * désormais DÉCODÉE — en-tête IHDR, chunks, CRC-32, IDAT, IEND).
 */
const octetsPng = (taille = 2048) => pngDeTest(taille);
const imagePng = () => Buffer.from(octetsPng()).toString('base64');

const octetsPdf = Buffer.from(
  '%PDF-1.4\nCERFA final presente aux signataires (e2e C5)\n%%EOF\n');
const pdfBase64 = octetsPdf.toString('base64');
const shaPdf = crypto.createHash('sha256').update(octetsPdf).digest('hex');

// ============================================================
// 1. Décor : base jetable NICHÉE + TOUTES les conditions levées
// ============================================================
const dossier = mkdtempSync(join(tmpdir(), 'inerweb-fluide-e2e-'));
mkdirSync(join(dossier, 'data'));
db.ouvrir(join(dossier, 'data', 'test.db'));

const sansSession = { role: 'REFERENT' };
api.appeler('init', {}, sansSession);

// Conditions 1-4 (établissement) : attestation de capacité valide,
// balance et détecteur CONFORMES, aucun écart (base neuve).
api.appeler('updateEtablissement', { patch: {
  numAttestationCapacite: 'CAP-2026-E2E-001',
  dateEcheanceCapacite: dateRelative(365) } }, sansSession);
api.appeler('createOutil', { donneesOutil: {
  typeOutil: 'BALANCE', marque: 'Sartorius', modele: 'E2E',
  prochaineEcheance: dateRelative(120) } }, sansSession);
const detecteur = api.appeler('createOutil', { donneesOutil: {
  typeOutil: 'DETECTEUR', marque: 'Inficon', modele: 'D-TEK E2E',
  prochaineEcheance: dateRelative(120) } }, sansSession);

// Conditions 6-7 et 12 : intervenant actif HABILITÉ + compte de session lié.
const referent = api.appeler('createPersonne', { donneesPersonne: {
  prenom: 'Référent', nom: 'Officiel', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT' } }, sansSession);
api.appeler('createHabilitation', { donneesHabilitation: {
  personneId: referent.id, regime: '2008', categorie: 'I',
  numeroAttestation: 'FGAS-E2E-001', dateFin: dateRelative(365) } },
sansSession);
const { hash, sel } = comptes.hacherMotDePasse('motdepasse-e2e-officiel');
const compteId = db.generateId('UTI');
db.run(
  `INSERT INTO utilisateurs_app (id, login, hash_mot_de_passe, sel, role,
     personnel_id) VALUES (?, ?, ?, ?, ?, ?)`,
  [compteId, 'referent-e2e', hash, sel, 'REFERENT', referent.id]);
const session = { role: 'REFERENT', utilisateur: compteId };

// Le parc : une machine du LYCÉE (détenteur = l'établissement, soumise au
// contrôle périodique : R-134a × 10 kg ≈ 14,3 téqCO₂) et deux bouteilles.
const machine = api.appeler('createMachine', { donneesMachine: {
  designation: 'Groupe froid E2E', fluide: 'R-134a', chargeNominaleKg: 10,
  localisation: 'Atelier', operateur: 'Référent Officiel' } }, sansSession);
const bouteille = api.appeler('createBouteille', { donneesBouteille: {
  type: 'NEUVE', fluide: 'R-134a', tareKg: 10, masseBruteKg: 30,
  contenanceMaxKg: 25 } }, sansSession);

// Condition 5 : une sauvegarde VÉRIFIÉE du poste (archive réelle, verdict
// VERT exigé — exactement le chemin du démarrage).
{
  const bilan = sauvegardeAuto.archiveAuDemarrageSiDue();
  verifier('décor : archive automatique produite ET vérifiée (condition 5)',
    bilan.faite === true && bilan.verifiee === true, JSON.stringify(bilan));
}

const etatSauvegarde = sauvegardeAuto.etatSauvegardeRecente();
verifier('décor : la sauvegarde du poste est récente',
  etatSauvegarde.recente === true, JSON.stringify(etatSauvegarde));
const passage = api.appeler('peutPasserEnOfficiel', {}, sansSession);
verifier('décor : peutPasserEnOfficiel ne retient AUCUN motif',
  passage.ok === true, JSON.stringify(passage.motifs));

// ============================================================
// 2. LA fiche OFFICIELLE de bout en bout (première depuis l'ouverture)
// ============================================================
const signatureHistorique =
  `data:image/png;base64,${imagePng()}`;
const fiche = api.appeler('creerMouvement', { donneesMouvement: {
  type: 'CHARGE_APPOINT', mode: 'OFFICIEL',
  machineId: machine.id, bouteilleSrcId: bouteille.id,
  peseeAvantKg: 20, peseeApresKg: 19.5,
  causeMouvement: 'Appoint après réparation (e2e C5)',
  technicien: 'Référent Officiel', executeParId: referent.id,
  signatureDataUrl: signatureHistorique,
  controle: { statutControle: 'CONFORME', detecteurId: detecteur.id,
    localisationFuite: null } } }, session);
verifier('PASSAGE : une fiche OFFICIELLE se crée (verrou ouvert — brique C5)',
  fiche.mode === 'OFFICIEL' && fiche.statut === 'BROUILLON', fiche.mode);

const signatureBase = {
  nom: 'Officiel', prenom: 'Référent', imagePng: imagePng()
};

// ATTAQUES 14-15 sur une fiche JETABLE (les signatures se posent sur le
// BROUILLON : impossible de signer après soumission — le rejet motivé
// ramène en brouillon pour compléter, comme à l'écran).
{
  const jetable = api.appeler('creerMouvement', { donneesMouvement: {
    type: 'CHARGE_APPOINT', mode: 'OFFICIEL',
    machineId: machine.id, bouteilleSrcId: bouteille.id,
    peseeAvantKg: 20, peseeApresKg: 19.9,
    causeMouvement: 'Fiche jetable des attaques 14-15 (e2e C5)',
    technicien: 'Référent Officiel', executeParId: referent.id,
    signatureDataUrl: signatureHistorique,
    controle: { statutControle: 'CONFORME', detecteurId: detecteur.id,
      localisationFuite: null } } }, session);
  api.appeler('soumettreMouvement', { id: jetable.id }, session);
  attendreRejet('VALIDATION sans signatures réelles : refus motivé (condition 14)',
    () => api.appeler('validerMouvement', { id: jetable.id,
      validateurId: referent.id, pdfFinalBase64: pdfBase64 }, session),
    'Signature réelle du technicien absente');
  api.appeler('rejeterMouvement', { id: jetable.id,
    motif: 'Signatures manquantes (attaque e2e)' }, session);
  api.appeler('signerMouvement', { mouvementId: jetable.id,
    signature: { ...signatureBase, role: 'TECHNICIEN',
      qualite: 'Professeur intervenant' } }, session);
  api.appeler('soumettreMouvement', { id: jetable.id }, session);
  attendreRejet('VALIDATION avec la seule signature du technicien : refus (condition 15)',
    () => api.appeler('validerMouvement', { id: jetable.id,
      validateurId: referent.id, pdfFinalBase64: pdfBase64 }, session),
    'Signature réelle du détenteur absente');
}

// LE parcours nominal : les DEUX signatures sur le brouillon, PUIS la
// soumission (l'ordre de l'écran C4).
api.appeler('signerMouvement', { mouvementId: fiche.id,
  signature: { ...signatureBase, role: 'TECHNICIEN',
    qualite: 'Professeur intervenant' } }, session);
api.appeler('signerMouvement', { mouvementId: fiche.id,
  signature: { ...signatureBase, role: 'DETENTEUR',
    qualite: 'Professeur référent', parDelegation: true,
    organisation: 'Lycée Professionnel Antoine Vidal' } }, session);
api.appeler('soumettreMouvement', { id: fiche.id }, session);

// ATTAQUES PDF : manquant, forgé — la fiche reste SOUMISE.
attendreRejet('VALIDATION sans PDF final : refus canonique',
  () => api.appeler('validerMouvement', { id: fiche.id,
    validateurId: referent.id }, session), 'PDF final de la fiche manquant');
attendreRejet('VALIDATION avec un HTML déguisé : refus canonique',
  () => api.appeler('validerMouvement', { id: fiche.id,
    validateurId: referent.id,
    pdfFinalBase64: Buffer.from('<html>faux</html>').toString('base64') },
  session), 'n’est pas un PDF');

// LA VALIDATION OFFICIELLE — le geste que le verrou fermait depuis le lot B.
const validee = api.appeler('validerMouvement', { id: fiche.id,
  validateurId: referent.id, pdfFinalBase64: pdfBase64 }, session);
verifier('VALIDATION OFFICIELLE : la fiche est VALIDE',
  validee.statut === 'VALIDE');
verifier('l’écriture scelle en v2 avec le PDF gelé',
  validee.versionEmpreinte === 2 && validee.hashPdfFinal === shaPdf,
  JSON.stringify({ v: validee.versionEmpreinte, h: validee.hashPdfFinal }));
verifier('le contrôle lié hérite du numéro ET du mode OFFICIEL',
  Boolean(validee.controle?.controleId) &&
  api.appeler('getControles', {}, session)
    .find((c) => c.id === validee.controle.controleId)?.mode === 'OFFICIEL');

// Le PDF CONSERVÉ : pièce système, fichier disque, témoins FRÈRES écrits
// par le VRAI chemin (manifeste construit EN TRANSACTION — différé C3b).
const pjCerfa = db.get(
  `SELECT * FROM pieces_jointes
   WHERE entite_id = ? AND categorie = 'CERFA_FINAL'`, [fiche.id]);
verifier('la PJ système CERFA_FINAL est conservée (nom dérivé du numéro)',
  Boolean(pjCerfa) && pjCerfa.nom_fichier === `CERFA-${validee.numero}.pdf`);
const cheminConserve = join(dossier, 'data', 'documents', pjCerfa.id);
verifier('le PDF conservé sur disque est OCTET POUR OCTET celui transmis',
  readFileSync(cheminConserve).equals(octetsPdf));
verifier('le .sha256 frère porte l’empreinte scellée',
  readFileSync(`${cheminConserve}.sha256`, 'utf8').startsWith(shaPdf));
const manifeste = JSON.parse(
  readFileSync(`${cheminConserve}.manifeste.json`, 'utf8'));
verifier('le manifeste (écrit en transaction) porte les DEUX signataires',
  manifeste.numeroFiche === validee.numero &&
  Array.isArray(manifeste.signataires) && manifeste.signataires.length === 2,
  JSON.stringify(manifeste.signataires));
verifier('verifierPdfFinalConserve : tout concorde',
  api.verifierPdfFinalConserve(fiche.id).ok === true);
verifier('le contrôle global du démarrage ne relève aucune anomalie',
  api.verifierTousPdfFinalConserves().anomalies.length === 0);
verifier('la chaîne des écritures est INTACTE',
  api.appeler('verifierChaineHash', {}, session).ok === true);

// WORM pieces_jointes (migration 24) tiré sur l'écriture RÉELLE.
attendreRejet('WORM : modifier la PJ conservée en SQL direct → refus',
  () => db.run(
    "UPDATE pieces_jointes SET nom_fichier = 'forge.pdf' WHERE id = ?",
    [pjCerfa.id]), 'Pièce scellée');
attendreRejet('WORM : supprimer la PJ conservée en SQL direct → refus',
  () => db.run('DELETE FROM pieces_jointes WHERE id = ?', [pjCerfa.id]),
  'Pièce scellée');
attendreRejet('WORM : greffer une PJ sur l’écriture figée en SQL direct → refus',
  () => db.run(
    `INSERT INTO pieces_jointes (id, entite_type, entite_id, categorie,
       nom_fichier) VALUES ('pj-forge-e2e', 'MOUVEMENT', ?, 'AUTRE', 'x.pdf')`,
    [fiche.id]), 'figée');

// ============================================================
// 3. TRANSFERT OFFICIEL : exempté du PDF final (arbitrage C5)
// ============================================================
const bouteilleDst = api.appeler('createBouteille', { donneesBouteille: {
  type: 'NEUVE', fluide: 'R-134a', tareKg: 10, masseBruteKg: 12,
  contenanceMaxKg: 25 } }, sansSession);
const transfert = api.appeler('creerMouvement', { donneesMouvement: {
  type: 'TRANSFERT', mode: 'OFFICIEL', fluide: 'R-134a',
  bouteilleSrcId: bouteille.id, bouteilleDstId: bouteilleDst.id,
  peseeAvantKg: 19.5, peseeApresKg: 18.5,
  technicien: 'Référent Officiel', executeParId: referent.id,
  signatureDataUrl: signatureHistorique } }, session);
api.appeler('signerMouvement', { mouvementId: transfert.id,
  signature: { ...signatureBase, role: 'TECHNICIEN',
    qualite: 'Professeur intervenant' } }, session);
api.appeler('signerMouvement', { mouvementId: transfert.id,
  signature: { ...signatureBase, role: 'DETENTEUR',
    qualite: 'Professeur référent', parDelegation: true,
    organisation: 'Lycée Professionnel Antoine Vidal' } }, session);
api.appeler('soumettreMouvement', { id: transfert.id }, session);
attendreRejet('un PDF fourni sur le TRANSFERT officiel : refus canonique',
  () => api.appeler('validerMouvement', { id: transfert.id,
    validateurId: referent.id, pdfFinalBase64: pdfBase64 }, session),
  'sans objet pour un transfert');
const transfertValide = api.appeler('validerMouvement', { id: transfert.id,
  validateurId: referent.id }, session);
verifier('le TRANSFERT officiel se valide SANS PDF (exemption C5)',
  transfertValide.statut === 'VALIDE');
verifier('le transfert scelle en v2, hashPdfFinal null, sans numéro CERFA',
  transfertValide.versionEmpreinte === 2 &&
  transfertValide.hashPdfFinal == null &&
  transfertValide.cerfaNumero == null);
verifier('aucune PJ CERFA_FINAL sur le transfert',
  !db.get(`SELECT id FROM pieces_jointes
           WHERE entite_id = ? AND categorie = 'CERFA_FINAL'`,
  [transfert.id]));
verifier('la chaîne reste INTACTE après le transfert exempté',
  api.appeler('verifierChaineHash', {}, session).ok === true);

// ============================================================
// 4. Contre-écriture d'une fiche officielle (plan §9 : à confirmer)
// ============================================================
const contre = api.appeler('annulerParContreEcriture', {
  id: fiche.id, validateurId: referent.id,
  motif: 'Erreur de saisie (preuve e2e C5)' }, session);
verifier('la contre-écriture OFFICIELLE passe SANS parcours de signatures',
  contre.statut === 'VALIDE' || contre.statut === 'ANNULE',
  JSON.stringify({ statut: contre.statut }));
const contreRelue = api.appeler('getMouvements', {}, session)
  .find((m) => m.contreEcritureDe === fiche.id);
verifier('la contre-écriture scelle en v2 avec hashPdfFinal null',
  contreRelue?.versionEmpreinte === 2 && contreRelue?.hashPdfFinal == null,
  JSON.stringify({ v: contreRelue?.versionEmpreinte,
    h: contreRelue?.hashPdfFinal }));
// Lot 1 branche A (27/07/2026) : même en OFFICIEL, une contre-écriture ne
// porte AUCUN numéro de fiche CERFA — le CERFA atteste une intervention,
// et aucune n'a lieu le jour d'une annulation comptable. Ce qu'elle
// produit est un JUSTIFICATIF DE RÉGULARISATION (vérifié au § 5).
verifier('la contre-écriture OFFICIELLE ne porte aucun numéro de fiche CERFA',
  (contreRelue?.cerfaNumero ?? null) === null,
  JSON.stringify({ cerfaNumero: contreRelue?.cerfaNumero }));
verifier('la chaîne reste INTACTE après la contre-écriture',
  api.appeler('verifierChaineHash', {}, session).ok === true);
verifier('le PDF conservé de la fiche annulée est TOUJOURS vert (preuve gardée)',
  api.verifierPdfFinalConserve(fiche.id).ok === true);

// ============================================================
// 5. Dossier d'audit : le CERFA officiel est LE conservé
// ============================================================
// LocalStore sur la MÊME base via un transport in-process (patron du
// harnais de contrat : sérialisation JSON réelle aux deux extrémités).
const transport = async (methode, params) => {
  const paramsSerialises = JSON.parse(JSON.stringify(params ?? {}));
  let enveloppe;
  try {
    const resultat = api.appeler(methode, paramsSerialises, session);
    enveloppe = JSON.parse(JSON.stringify({ ok: true, resultat }));
  } catch (erreur) {
    enveloppe = { ok: false, erreur: erreur.message, code: erreur.code ?? 400 };
  }
  if (enveloppe.ok === true) return enveloppe.resultat;
  throw new Error(enveloppe.erreur);
};
const store = creerLocalStore(transport);
await store.init();

/** Relit un ZIP « stored » (même lecteur que test-dossier-audit). */
function lireZip(zip) {
  const vue = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const entrees = [];
  let position = 0;
  while (position + 4 <= zip.length &&
         vue.getUint32(position, true) === 0x04034b50) {
    const tailleContenu = vue.getUint32(position + 18, true);
    const tailleNom = vue.getUint16(position + 26, true);
    const tailleExtra = vue.getUint16(position + 28, true);
    const nom = new TextDecoder().decode(
      zip.subarray(position + 30, position + 30 + tailleNom));
    const debut = position + 30 + tailleNom + tailleExtra;
    entrees.push({ nom, octets: zip.subarray(debut, debut + tailleContenu) });
    position = debut + tailleContenu;
  }
  return entrees;
}

{
  const annee = new Date().getFullYear();
  const { blob } = await genererDossierAudit(store, annee);
  const octetsZip = blob instanceof Uint8Array
    ? blob : new Uint8Array(await blob.arrayBuffer());
  const entrees = lireZip(octetsZip);
  const noms = entrees.map((e) => e.nom);

  const nomCerfaOfficiel = `cerfa/${validee.numero}.pdf`;
  const entreesOfficielles = entrees.filter((e) => e.nom === nomCerfaOfficiel);
  verifier('dossier d’audit : le CERFA officiel apparaît UNE seule fois '
    + '(pas de doublon par le contrôle lié)',
  entreesOfficielles.length === 1, `${entreesOfficielles.length} entrée(s)`);
  verifier('dossier d’audit : le CERFA officiel est LE PDF CONSERVÉ '
    + '(octets identiques)',
  entreesOfficielles.length === 1 &&
    Buffer.from(entreesOfficielles[0].octets).equals(octetsPdf));

  const verdicts = entrees.find((e) => e.nom === '02-PDF-CONSERVES.txt');
  const texteVerdicts = verdicts
    ? new TextDecoder().decode(verdicts.octets) : '';
  verifier('dossier d’audit : 02-PDF-CONSERVES.txt présent avec le verdict vert',
    texteVerdicts.includes(`${validee.numero}  CONSERVÉ et vérifié`)
    && texteVerdicts.includes(shaPdf), texteVerdicts.slice(0, 400));
  verifier('dossier d’audit : le sommaire liste la pièce des verdicts',
    noms.includes('00-SOMMAIRE.txt') &&
    new TextDecoder().decode(
      entrees.find((e) => e.nom === '00-SOMMAIRE.txt').octets)
      .includes('02-PDF-CONSERVES.txt'));

  // Lot 1 branche A : la contre-écriture du § 4 n'a plus de CERFA dans
  // l'archive scellée — elle a son JUSTIFICATIF DE RÉGULARISATION, qui
  // porte le motif, l'auteur et la masse signée. Le dossier ne perd rien :
  // la pièce est REMPLACÉE, et le sommaire le dit.
  verifier('dossier d’audit : aucun CERFA pour la contre-écriture',
    !noms.includes(`cerfa/${contreRelue.numero}.pdf`),
    noms.filter((n) => n.startsWith('cerfa/')).join(', '));
  const nomJustificatif = `regularisations/${contreRelue.numero}.html`;
  verifier('dossier d’audit : le justificatif de régularisation la remplace',
    noms.includes(nomJustificatif),
    noms.filter((n) => n.startsWith('regularisations/')).join(', '));
  const justificatif = entrees.find((e) => e.nom === nomJustificatif);
  verifier('dossier d’audit : le justificatif porte le motif de l’annulation',
    Boolean(justificatif) && new TextDecoder().decode(justificatif.octets)
      .includes('Erreur de saisie (preuve e2e C5)'));
}

// ATTAQUE : PDF conservé ALTÉRÉ sur disque → le dossier d'audit DÉNONCE
// (jamais de régénération silencieuse).
{
  const original = readFileSync(cheminConserve);
  writeFileSync(cheminConserve,
    Buffer.from('%PDF-1.4\nPDF ALTERE sur disque\n%%EOF\n'));
  const annee = new Date().getFullYear();
  const { blob } = await genererDossierAudit(store, annee);
  const octetsZip = blob instanceof Uint8Array
    ? blob : new Uint8Array(await blob.arrayBuffer());
  const entrees = lireZip(octetsZip);
  const verdicts = entrees.find((e) => e.nom === '02-PDF-CONSERVES.txt');
  const texteVerdicts = verdicts
    ? new TextDecoder().decode(verdicts.octets) : '';
  verifier('ATTAQUE : PDF altéré → ANOMALIE dénoncée dans le dossier d’audit',
    texteVerdicts.includes(`${validee.numero}  ANOMALIE`)
    && texteVerdicts.includes('ALTÉRÉ'), texteVerdicts.slice(0, 400));
  verifier('ATTAQUE : le CERFA altéré n’est PAS embarqué (jamais régénéré)',
    !entrees.some((e) => e.nom === `cerfa/${validee.numero}.pdf`));
  writeFileSync(cheminConserve, original);
  verifier('réparé : le vérificateur repasse au vert',
    api.verifierPdfFinalConserve(fiche.id).ok === true);
}

// ============================================================
// 6. Export → import : l'état officiel voyage, tout reste vert
// ============================================================
{
  const exportJson = api.appeler('exporterJSON', {}, session);
  const adopte = api.appeler('importerJSON', { texte: exportJson }, session);
  verifier('round-trip export → import : adopté', adopte === true);
  verifier('après import : la chaîne est INTACTE (recomptage v2 compris)',
    api.appeler('verifierChaineHash', {}, session).ok === true);
  verifier('après import : le PDF conservé est TOUJOURS vert',
    api.verifierPdfFinalConserve(fiche.id).ok === true);
  const triggersPj = db.all(
    `SELECT name FROM sqlite_master
     WHERE type = 'trigger' AND tbl_name = 'pieces_jointes'`);
  verifier('après import : les 3 triggers WORM de pieces_jointes ont RENAISSU',
    triggersPj.length === 3, triggersPj.map((t) => t.name).join(', '));
}

// ------------------------------------------------------------
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Parcours officiel de bout en bout : ouvert, signé, conservé, '
  + 'chaîné, exempté (transfert), contré, audité, réimporté — tout est vert.');
