// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// SIGNATURES RÉELLES d'un mouvement (lot C, brique C1 — condition 3 du
// plan audit-proof) :
//   1. PARITÉ STRICTE du module pur ESM (v8/js/data/signatures-mouvement.js)
//      et de son miroir CommonJS (server/signatures-mouvement.js) —
//      déclarations figées et critères d'illisibilité identiques ;
//   2. migration 23 : colonnes, table WORM, catégorie CERFA_FINAL ;
//   3. le PARCOURS et ses ATTAQUES, TIRÉES contre l'API serveur (base
//      jetable) : signer dans le désordre, image forgée/illisible,
//      modifier la fiche après signature (révision divergente → périmée),
//      signer un soumis/figé, témoin d'identité de session ;
//   4. WORM en SQL direct : une signature ne se modifie ni ne se supprime
//      jamais (écriture figée), une écriture figée n'en acquiert plus ;
//   5. export → import : les signatures voyagent, les triggers renaissent,
//      une signature orpheline est refusée à l'entrée.
// NOTE : la validation OFFICIELLE reste fermée (VERROU_LIVRAISON) — le
// refus dur en validation réelle sera tiré à l'ouverture (brique C5) ;
// ici il est prouvé au niveau du moteur (simulation, niveau V).
// Exécution : node server/test-signatures-mouvement.mjs — base JETABLE.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as moduleEsm from '../v8/js/data/signatures-mouvement.js';
import * as pdfEsm from '../v8/js/data/pdf-final.js';

const require = createRequire(import.meta.url);
const crypto = require('node:crypto');
const db = require('./db.js');
const api = require('./api.js');
const comptes = require('./comptes.js');
const miroir = require('./signatures-mouvement.js');
const pdfCjs = require('./pdf-final.js');
const hm = require('./hash-mouvement.js');

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

/** Octets d'un PNG de test : nombres magiques + remplissage. */
function octetsPng(taille = 1200) {
  const octets = new Uint8Array(taille);
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    .forEach((o, i) => { octets[i] = o; });
  for (let i = 8; i < taille; i += 1) octets[i] = i % 251;
  return octets;
}
const imagePng = (taille = 1200) => Buffer.from(octetsPng(taille)).toString('base64');

// ============================================================
// 1. Parité stricte module pur ESM ↔ miroir CommonJS
// ============================================================
{
  verifier('constantes identiques (rôles, tailles, messages)',
    JSON.stringify(miroir.ROLES_SIGNATURE) ===
      JSON.stringify(moduleEsm.ROLES_SIGNATURE) &&
    miroir.SIGNATURE_TAILLE_MIN === moduleEsm.SIGNATURE_TAILLE_MIN &&
    miroir.SIGNATURE_TAILLE_MAX === moduleEsm.SIGNATURE_TAILLE_MAX &&
    miroir.MSG_TRACE_ABSENT === moduleEsm.MSG_TRACE_ABSENT &&
    miroir.MSG_PAS_PNG === moduleEsm.MSG_PAS_PNG &&
    miroir.MSG_TROP_PETITE === moduleEsm.MSG_TROP_PETITE &&
    miroir.MSG_TROP_GROSSE === moduleEsm.MSG_TROP_GROSSE);

  const CAS_DECLARATION = [
    ['TECHNICIEN', false, null],
    ['TECHNICIEN', true, 'Ignoré'],
    ['DETENTEUR', false, null],
    ['DETENTEUR', true, 'LP Jacques Raynaud']
  ];
  let identiques = 0;
  for (const [role, delegation, organisation] of CAS_DECLARATION) {
    const a = moduleEsm.declarationSignature(role, delegation, organisation);
    const b = miroir.declarationSignature(role, delegation, organisation);
    if (a === b) identiques += 1;
    else console.error(`  divergence de déclaration : ${role}\n  ESM=${a}\n  CJS=${b}`);
  }
  verifier(`déclarations identiques sur ${CAS_DECLARATION.length} cas discriminants`,
    identiques === CAS_DECLARATION.length);
  verifier('la déclaration du détenteur par délégation porte la mention et le point final',
    miroir.declarationSignature('DETENTEUR', true, 'LP Jacques Raynaud')
      .endsWith(', par délégation du détenteur (LP Jacques Raynaud).'));

  let erreurEsm = ''; let erreurCjs = '';
  try { moduleEsm.declarationSignature('PATRON', false, null); }
  catch (e) { erreurEsm = e.message; }
  try { miroir.declarationSignature('PATRON', false, null); }
  catch (e) { erreurCjs = e.message; }
  verifier('même Error sur rôle inconnu des deux côtés',
    erreurEsm !== '' && erreurEsm === erreurCjs);

  const CAS_IMAGE = [
    null,
    new Uint8Array(0),
    octetsPng(1024),
    octetsPng(1023),
    octetsPng(4096),
    (() => { const o = octetsPng(4096); o[0] = 0xff; o[1] = 0xd8; o[2] = 0xff; return o; })(),
    octetsPng(moduleEsm.SIGNATURE_TAILLE_MAX + 1)
  ];
  identiques = 0;
  for (const octets of CAS_IMAGE) {
    if (moduleEsm.verifierImageSignature(octets) ===
        miroir.verifierImageSignature(octets)) identiques += 1;
  }
  verifier(`critères d'illisibilité identiques sur ${CAS_IMAGE.length} images discriminantes`,
    identiques === CAS_IMAGE.length);
  verifier('les quatre refus tombent sur le bon critère',
    miroir.verifierImageSignature(new Uint8Array(0)) === miroir.MSG_TRACE_ABSENT &&
    miroir.verifierImageSignature(octetsPng(1023)) === miroir.MSG_TROP_PETITE &&
    miroir.verifierImageSignature(CAS_IMAGE[5]) === miroir.MSG_PAS_PNG &&
    miroir.verifierImageSignature(octetsPng(miroir.SIGNATURE_TAILLE_MAX + 1))
      === miroir.MSG_TROP_GROSSE &&
    miroir.verifierImageSignature(octetsPng(1024)) === null);
}

// ============================================================
// 2. Base jetable + migration 23 (schéma, triggers, CERFA_FINAL)
// ============================================================
// Base NICHÉE sous <mkdtemp>/data/ (leçon du lot D : backups/ frère de
// data/ doit rester dans le bac à sable).
const dossier = mkdtempSync(join(tmpdir(), 'inerweb-fluide-signatures-'));
mkdirSync(join(dossier, 'data'));
db.ouvrir(join(dossier, 'data', 'test.db'));

const sansSession = { role: 'REFERENT' };
api.appeler('init', {}, sansSession);

{
  const version = db.get('PRAGMA user_version').user_version;
  verifier('la base jetable est au moins en version 23', version >= 23,
    `user_version = ${version}`);
  const triggers = db.all(
    `SELECT name FROM sqlite_master
     WHERE type = 'trigger' AND tbl_name = 'signatures_mouvement'`)
    .map((l) => l.name).sort();
  verifier('les 3 triggers WORM des signatures sont posés',
    JSON.stringify(triggers) === JSON.stringify([
      'signatures_mouvement_interdire_delete',
      'signatures_mouvement_interdire_insert_fige',
      'signatures_mouvement_interdire_update']), triggers.join(', '));

  db.run(
    `INSERT INTO pieces_jointes (id, entite_type, entite_id, categorie,
       nom_fichier) VALUES ('pjcerfatest', 'MOUVEMENT', 'mvt-x',
       'CERFA_FINAL', 'FI-test.pdf')`);
  verifier('la catégorie CERFA_FINAL est admise par le CHECK (migration 23)',
    Boolean(db.get(
      "SELECT id FROM pieces_jointes WHERE id = 'pjcerfatest'")));
  db.run("DELETE FROM pieces_jointes WHERE id = 'pjcerfatest'");
  attendreRejet('une catégorie inconnue reste refusée par le CHECK',
    () => db.run(
      `INSERT INTO pieces_jointes (id, entite_type, entite_id, categorie,
         nom_fichier) VALUES ('pjpirate', 'MOUVEMENT', 'mvt-x', 'PIRATE',
         'x.pdf')`), 'CHECK');
}

// ============================================================
// 3. Parcours et attaques contre l'API (personnel, compte, machine)
// ============================================================
const referent = api.appeler('createPersonne', { donneesPersonne: {
  prenom: 'Référent', nom: 'Signature', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT' } }, sansSession);

/** Compte lié à une fiche du personnel (même hachage que routes-comptes). */
function creerCompte(login, role, personnelId) {
  const { hash, sel } = comptes.hacherMotDePasse(`motdepasse-${login}`);
  const id = db.generateId('UTI');
  db.run(
    `INSERT INTO utilisateurs_app (id, login, hash_mot_de_passe, sel, role,
       personnel_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, login, hash, sel, role, personnelId]);
  return id;
}
const session = {
  role: 'REFERENT', utilisateur: creerCompte('signataire', 'REFERENT', referent.id)
};

const machine = api.appeler('createMachine', { donneesMachine: {
  designation: 'Groupe de signature', fluide: 'R-134a', chargeNominaleKg: 10,
  operateur: 'Testeur' } }, sansSession);
const bouteille = api.appeler('createBouteille', { donneesBouteille: {
  type: 'NEUVE', fluide: 'R-134a', tareKg: 10, masseBruteKg: 30,
  contenanceMaxKg: 25 } }, sansSession);
const brouillon = api.appeler('creerMouvement', { donneesMouvement: {
  type: 'CHARGE_APPOINT', machineId: machine.id, bouteilleSrcId: bouteille.id,
  peseeAvantKg: 30, peseeApresKg: 29, technicien: 'Référent Signature',
  causeMouvement: 'Preuve des signatures' } }, sansSession);

const signatureType = (surcharges = {}) => ({
  role: 'TECHNICIEN', nom: 'Signature', prenom: 'Référent',
  imagePng: imagePng(), ...surcharges
});

{
  verifier('le brouillon neuf porte revision_brouillon 0',
    brouillon.revisionBrouillon === 0 && brouillon.versionEmpreinte === 1);

  // ATTAQUE : signer dans le désordre.
  attendreRejet('détenteur AVANT technicien : refus',
    () => api.appeler('signerMouvement', { mouvementId: brouillon.id,
      signature: signatureType({ role: 'DETENTEUR' }) }, session),
    'technicien signe en premier');

  // ATTAQUES : images forgées / illisibles (jamais ignorées).
  attendreRejet('image HTML renommée PNG : refus (nombres magiques)',
    () => api.appeler('signerMouvement', { mouvementId: brouillon.id,
      signature: signatureType({ imagePng: Buffer.from(
        '<html>signature</html>'.padEnd(2000, '.')).toString('base64') }) },
    session), 'PNG');
  attendreRejet('tracé de moins de 1 Ko : refus (pas probant)',
    () => api.appeler('signerMouvement', { mouvementId: brouillon.id,
      signature: signatureType({ imagePng: imagePng(512) }) }, session),
    'probant');
  attendreRejet('tracé absent : refus',
    () => api.appeler('signerMouvement', { mouvementId: brouillon.id,
      signature: signatureType({ imagePng: null }) }, session), 'tracé absent');
  attendreRejet('image de plus de 1 Mo : refus (plafond défensif)',
    () => api.appeler('signerMouvement', { mouvementId: brouillon.id,
      signature: signatureType({
        imagePng: imagePng(miroir.SIGNATURE_TAILLE_MAX + 1) }) }, session),
    'volumineuse');

  // Signature du technicien SOUS SESSION : témoin d'identité capté.
  const sigTech = api.appeler('signerMouvement', { mouvementId: brouillon.id,
    signature: signatureType({ qualite: 'Professeur intervenant' }) }, session);
  verifier('technicien signé : témoin de session (compte + fiche du personnel)',
    sigTech.valide === true && sigTech.versionDocument === 0 &&
    sigTech.sessionCompteId === session.utilisateur &&
    sigTech.sessionPersonnelId === referent.id &&
    /^[0-9a-f]{64}$/.test(sigTech.sha256Document));
  const ligneSig = db.get(
    'SELECT * FROM signatures_mouvement WHERE id = ?', [sigTech.id]);
  verifier('la signature est en base (déclaration figée, image conservée)',
    ligneSig && ligneSig.declaration.startsWith('Je certifie avoir réalisé') &&
    ligneSig.image_png === imagePng() && ligneSig.version_document === 0);

  // Détenteur par délégation (décision Franck : même personne autorisée).
  attendreRejet('délégation sans raison sociale représentée : refus',
    () => api.appeler('signerMouvement', { mouvementId: brouillon.id,
      signature: signatureType({ role: 'DETENTEUR', parDelegation: true }) },
    session), 'Raison sociale');
  const sigDet = api.appeler('signerMouvement', { mouvementId: brouillon.id,
    signature: signatureType({ role: 'DETENTEUR',
      qualite: 'Professeur, par délégation du détenteur', parDelegation: true,
      organisation: 'LP Jacques Raynaud' }) }, session);
  verifier('détenteur par délégation : mention dans la déclaration figée',
    sigDet.valide === true && sigDet.declaration.includes(
      'par délégation du détenteur (LP Jacques Raynaud)'));

  // ATTAQUE CENTRALE : modifier la fiche APRÈS les signatures.
  api.appeler('ajouterPieceJointe', { donneesPj: {
    entiteType: 'MOUVEMENT', entiteId: brouillon.id,
    nomFichier: 'photo-pesee.png', mimeType: 'image/png',
    categorie: 'PHOTO_PESEE', base64: imagePng(2048) } }, session);
  const apresPj = api.appeler('getSignaturesMouvement',
    { mouvementId: brouillon.id }, sansSession);
  verifier('PJ ajoutée après signature : révision 1, signatures PÉRIMÉES',
    apresPj.length === 2 && apresPj.every((sig) => sig.valide === false));
  const simulation = api.appeler('simulerValidationOfficielle',
    { mouvementId: brouillon.id }, session);
  verifier('le moteur dénonce la modification : « fiche modifiée après signature »',
    simulation.blocages.some((b) => b.code === 'SIGNATURE_TECHNICIEN' &&
      b.motif.includes('Fiche modifiée après signature')) &&
    simulation.blocages.some((b) => b.code === 'SIGNATURE_DETENTEUR'),
    JSON.stringify(simulation.blocages.map((b) => b.code)));
  attendreRejet('le détenteur ne peut plus signer sur une signature technicien périmée',
    () => api.appeler('signerMouvement', { mouvementId: brouillon.id,
      signature: signatureType({ role: 'DETENTEUR' }) }, session),
    'absente ou périmée');

  // Reprise : re-signer la révision courante, puis SOUMIS interdit.
  const reTech = api.appeler('signerMouvement', { mouvementId: brouillon.id,
    signature: signatureType() }, session);
  const reDet = api.appeler('signerMouvement', { mouvementId: brouillon.id,
    signature: signatureType({ role: 'DETENTEUR', parDelegation: true,
      organisation: 'LP Jacques Raynaud' }) }, session);
  verifier('re-signature des deux rôles sur la révision 1',
    reTech.versionDocument === 1 && reDet.versionDocument === 1);
  api.appeler('soumettreMouvement', { id: brouillon.id }, sansSession);
  attendreRejet('un mouvement SOUMIS ne se signe pas',
    () => api.appeler('signerMouvement', { mouvementId: brouillon.id,
      signature: signatureType() }, session), 'brouillon');
  verifier('la soumission ne périme PAS les signatures (parcours nominal)',
    api.appeler('getSignaturesMouvement', { mouvementId: brouillon.id },
      sansSession).filter((sig) => sig.valide).length === 2);

  // Validation (FORMATION, repli sans session) → écriture FIGÉE.
  api.appeler('validerMouvement', { id: brouillon.id,
    validateurId: referent.id }, sansSession);
  attendreRejet('une écriture figée ne se signe plus (message canonique)',
    () => api.appeler('signerMouvement', { mouvementId: brouillon.id,
      signature: signatureType() }, session),
    'correction uniquement par contre-écriture');

  // ============================================================
  // 4. WORM en SQL direct (la falsification se tire, elle se lit pas)
  // ============================================================
  attendreRejet('SQL direct : modifier une signature → trigger WORM',
    () => db.run(
      "UPDATE signatures_mouvement SET nom = 'Falsifié' WHERE id = ?",
      [sigTech.id]), 'ne peut pas être modifiée');
  attendreRejet('SQL direct : supprimer une signature d’une écriture figée → refus',
    () => db.run('DELETE FROM signatures_mouvement WHERE id = ?',
      [sigTech.id]), 'sont conservées');
  attendreRejet('SQL direct : ajouter une signature à une écriture figée → refus',
    () => db.run(
      `INSERT INTO signatures_mouvement (id, mouvement_id, role, nom, prenom,
         par_delegation, date_heure, declaration, image_png, sha256_document,
         version_document)
       VALUES ('sig-forge', ?, 'TECHNICIEN', 'Forgeur', 'Faux', 0,
         '2026-07-18T00:00:00.000Z', 'Fausse déclaration', 'AAAA', 'beef', 0)`,
      [brouillon.id]), 'ne peut plus recevoir de signature');
}

// ============================================================
// 5. Suppression d'un brouillon signé + export/import
// ============================================================
{
  const ephemere = api.appeler('creerMouvement', { donneesMouvement: {
    type: 'CHARGE_APPOINT', machineId: machine.id,
    bouteilleSrcId: bouteille.id, peseeAvantKg: 29, peseeApresKg: 28.5,
    technicien: 'Référent Signature', causeMouvement: 'Brouillon abandonné' } },
  sansSession);
  api.appeler('signerMouvement', { mouvementId: ephemere.id,
    signature: signatureType() }, session);
  api.appeler('supprimerMouvement', { id: ephemere.id }, sansSession);
  verifier('les signatures d’un brouillon supprimé partent avec lui (WORM ok)',
    !db.get('SELECT id FROM signatures_mouvement WHERE mouvement_id = ?',
      [ephemere.id]));
  verifier('la trace SIGNATURE_MOUVEMENT reste au journal chaîné',
    db.all(`SELECT id FROM journal_audit
            WHERE action = 'SIGNATURE_MOUVEMENT'`).length >= 5);

  const exporte = api.appeler('exporterJSON', {}, sansSession);
  const paquet = JSON.parse(exporte);
  verifier('l’export porte la collection signaturesMouvement (2 signatures valides + 2 périmées)',
    Array.isArray(paquet.donnees.signaturesMouvement) &&
    paquet.donnees.signaturesMouvement.length === 4);

  // Import PROPRE : les signatures voyagent, les triggers renaissent.
  const adopte = api.appeler('importerJSON', { texte: exporte }, sansSession);
  verifier('round-trip export → import adopté', adopte === true);
  const relues = api.appeler('getSignaturesMouvement',
    { mouvementId: paquet.donnees.signaturesMouvement[0].mouvementId },
    sansSession);
  verifier('les signatures réimportées gardent leur état (2 valides sur 4)',
    relues.length === 4 && relues.filter((sig) => sig.valide).length === 2);
  attendreRejet('les triggers WORM sont RECRÉÉS après import',
    () => db.run(
      "UPDATE signatures_mouvement SET nom = 'Falsifié'"),
    'ne peut pas être modifiée');

  // Import FORGÉ : signature orpheline → refus à l'entrée.
  const forge = JSON.parse(exporte);
  forge.donnees.signaturesMouvement.push({
    id: 'sig-orpheline', mouvementId: 'mvt-fantome', role: 'TECHNICIEN',
    nom: 'X', prenom: 'Y', qualite: null, organisation: null,
    parDelegation: false, dateHeure: '2026-07-18T00:00:00.000Z',
    declaration: 'Fausse', imagePng: 'AAAA', sessionCompteId: null,
    sessionPersonnelId: null, sha256Document: 'beef', versionDocument: 0 });
  attendreRejet('import refusé : signature sur mouvement introuvable',
    () => api.appeler('importerJSON',
      { texte: JSON.stringify(forge) }, sansSession), 'mouvement introuvable');
}

// ============================================================
// 6. Lot C, brique C2 — empreinte RENFORCÉE v2 (gel au scellement)
// ============================================================
{
  const scelle = api.appeler('getMouvements', {}, sansSession)
    .find((mv) => mv.id === brouillon.id);
  verifier('l’écriture scellée est v2 : champs GELÉS stockés en colonnes',
    scelle.versionEmpreinte === 2 && Array.isArray(scelle.outilsFiges) &&
    scelle.outilsFiges.length === 0 &&
    /^[0-9a-f]{64}$/.test(scelle.hashSignatures) &&
    /^[0-9a-f]{64}$/.test(scelle.hashPiecesJointes) &&
    scelle.hashPdfFinal === null,
    JSON.stringify({ v: scelle.versionEmpreinte, o: scelle.outilsFiges }));

  // Gel EXACT : hashSignatures recompté À LA MAIN depuis les signatures en
  // base (forme canonique + sha des octets de chaque image, liste triée).
  const sigs = api.appeler('getSignaturesMouvement',
    { mouvementId: brouillon.id }, sansSession);
  const canoniques = sigs.map((sig) => hm.chaineCanoniqueSignature(sig,
    crypto.createHash('sha256')
      .update(Buffer.from(sig.imagePng, 'base64')).digest('hex')));
  verifier('hashSignatures = empreinte triée des 4 signatures (recompté à la main)',
    hm.empreinteListeTriee(canoniques) === scelle.hashSignatures);
  const pjs = api.appeler('listerPiecesJointes',
    { entiteType: 'MOUVEMENT', entiteId: brouillon.id }, sansSession);
  verifier('hashPiecesJointes = empreinte triée des sha256 des PJ au scellement',
    pjs.length === 1 &&
    hm.empreinteListeTriee(pjs.map((pj) => pj.hashSha256 ?? '')) ===
      scelle.hashPiecesJointes);
  verifier('la chaîne (écriture v2) se vérifie',
    api.appeler('verifierChaineHash', {}, sansSession).ok === true);

  // LA raison d'être des champs gelés : une PJ ajoutée APRÈS le scellement
  // (asymétrie encore ouverte jusqu'à C3) ne casse PAS la chaîne.
  api.appeler('ajouterPieceJointe', { donneesPj: {
    entiteType: 'MOUVEMENT', entiteId: brouillon.id,
    nomFichier: 'apres-scellement.png', mimeType: 'image/png',
    categorie: 'PHOTO_PESEE', base64: imagePng(2048) } }, session);
  verifier('une PJ ajoutée APRÈS scellement ne casse pas la chaîne (gel)',
    api.appeler('verifierChaineHash', {}, sansSession).ok === true);

  // ATTAQUE (plan §8) : une signature RETOUCHÉE dans l'export ne colle
  // plus au hashSignatures gelé → fichier forgé. Une signature RETIRÉE
  // en douce est dénoncée pareil.
  const exporteForge = api.appeler('exporterJSON', {}, sansSession);
  const forgeRetouche = JSON.parse(exporteForge);
  const sigCible = forgeRetouche.donnees.signaturesMouvement
    .find((sig) => sig.mouvementId === brouillon.id);
  sigCible.nom = 'Falsifié';
  attendreRejet('signature RETOUCHÉE dans le JSON : « fichier forgé » (empreinte v2)',
    () => api.appeler('importerJSON',
      { texte: JSON.stringify(forgeRetouche) }, sansSession), 'fichier forgé');
  const forgeRetrait = JSON.parse(exporteForge);
  forgeRetrait.donnees.signaturesMouvement = forgeRetrait.donnees
    .signaturesMouvement.filter((sig) => sig.id !== sigCible.id);
  attendreRejet('signature RETIRÉE du JSON : « fichier forgé »',
    () => api.appeler('importerJSON',
      { texte: JSON.stringify(forgeRetrait) }, sansSession), 'fichier forgé');

  // ATTAQUE (revue adversariale C2, constat IMPORTANT fermé) :
  // RÉTROGRADER l'écriture en v1 pour désarmer le recomptage — signature
  // falsifiée conservée, champs gelés effacés, chaîne v1 re-dérivée (le
  // forgeur n'a aucun secret à casser). Refus : une écriture scellée en v1
  // ne peut pas porter de signatures.
  const forgeRetrograde = JSON.parse(exporteForge);
  forgeRetrograde.donnees.signaturesMouvement
    .find((sig) => sig.mouvementId === brouillon.id).nom = 'Falsifié';
  const mvRetrograde = forgeRetrograde.donnees.mouvements
    .find((mv) => mv.id === brouillon.id);
  mvRetrograde.versionEmpreinte = 1;
  mvRetrograde.outilsFiges = null;
  mvRetrograde.hashSignatures = null;
  mvRetrograde.hashPiecesJointes = null;
  mvRetrograde.hashPdfFinal = null;
  mvRetrograde.hashPrecedent = null;
  mvRetrograde.hashEcriture = hm.hasherMouvement(mvRetrograde, null);
  attendreRejet('RÉTROGRADATION v2→v1 avec signatures conservées : refus',
    () => api.appeler('importerJSON',
      { texte: JSON.stringify(forgeRetrograde) }, sansSession), 'scellée en v1');

  // ATTAQUE (revue adversariale C2, constat BLOQUANT fermé) : le décodage
  // du gel est STRICT des deux côtés — une imagePng polluée (caractères
  // hors alphabet, que Buffer.from ignorait en silence) ne colle plus ; un
  // préfixe data: (mêmes octets) reste toléré, à l'identique de la démo.
  const forgePollution = JSON.parse(exporteForge);
  forgePollution.donnees.signaturesMouvement
    .find((sig) => sig.mouvementId === brouillon.id).imagePng =
      `%%%%${sigCible.imagePng}`;
  attendreRejet('imagePng POLLUÉE (hors alphabet base64) : refus (décodage strict)',
    () => api.appeler('importerJSON',
      { texte: JSON.stringify(forgePollution) }, sansSession), 'fichier forgé');
  const importPrefixe = JSON.parse(exporteForge);
  for (const sig of importPrefixe.donnees.signaturesMouvement) {
    if (sig.mouvementId === brouillon.id) {
      sig.imagePng = `data:image/png;base64,${sig.imagePng}`;
    }
  }
  verifier('préfixe data: sur les images (mêmes octets) : import ADOPTÉ',
    api.appeler('importerJSON',
      { texte: JSON.stringify(importPrefixe) }, sansSession) === true);

  // Contre-écriture : scellée v2 SANS double signature (plan §9), listes
  // gelées VIDES — la chaîne reste verte.
  const contre = api.appeler('annulerParContreEcriture', {
    id: brouillon.id, motif: 'Preuve C2 : contre-écriture v2.',
    validateurId: referent.id }, sansSession);
  verifier('la contre-écriture scelle en v2, listes gelées VIDES, chaîne verte',
    contre.versionEmpreinte === 2 && Array.isArray(contre.outilsFiges) &&
    contre.outilsFiges.length === 0 &&
    contre.hashSignatures === hm.empreinteListeTriee([]) &&
    contre.hashPiecesJointes === hm.empreinteListeTriee([]) &&
    contre.hashPdfFinal === null &&
    api.appeler('verifierChaineHash', {}, sansSession).ok === true);
}

// ============================================================
// 7. Chaîne MIXTE réelle : registre v1 existant + nouvelle écriture v2
// (le cas de Franck en septembre : ses scellements d'avant C2 sont v1)
// ============================================================
{
  const exporte = api.appeler('exporterJSON', {}, sansSession);
  const paquet = JSON.parse(exporte);
  // Rétrograder l'histoire : les écritures scellées redeviennent v1
  // (hashes v1 recalculés, chaîne rejouée), signatures retirées (un
  // registre d'époque n'en avait pas).
  const figees = paquet.donnees.mouvements
    .filter((mv) => mv.statut === 'VALIDE' || mv.statut === 'ANNULE')
    .sort((a, b) => a.ordreValidation - b.ordreValidation);
  let precedent = null;
  for (const mv of figees) {
    mv.versionEmpreinte = 1;
    mv.outilsFiges = null;
    mv.hashSignatures = null;
    mv.hashPiecesJointes = null;
    mv.hashPdfFinal = null;
    mv.hashPrecedent = precedent;
    mv.hashEcriture = hm.hasherMouvement(mv, precedent);
    precedent = mv.hashEcriture;
  }
  paquet.donnees.signaturesMouvement = [];
  const adopte = api.appeler('importerJSON',
    { texte: JSON.stringify(paquet) }, sansSession);
  verifier('un registre RÉTROGRADÉ tout v1 s’importe (chaîne v1 verte)',
    adopte === true);
  verifier('les écritures importées sont bien restées v1',
    api.appeler('getMouvements', {}, sansSession)
      .filter((mv) => mv.statut === 'VALIDE' || mv.statut === 'ANNULE')
      .every((mv) => mv.versionEmpreinte === 1));

  // Nouvelle écriture PAR-DESSUS : scellée v2, la chaîne MIXTE est verte.
  const bouteilleCourante = api.appeler('getBouteilles', {}, sansSession)
    .find((b) => b.id === bouteille.id);
  const mvMixte = api.appeler('creerMouvement', { donneesMouvement: {
    type: 'CHARGE_APPOINT', machineId: machine.id,
    bouteilleSrcId: bouteille.id,
    peseeAvantKg: bouteilleCourante.masseNetteKg,
    peseeApresKg: bouteilleCourante.masseNetteKg - 0.5,
    technicien: 'Référent Signature',
    causeMouvement: 'Preuve de chaîne mixte' } }, sansSession);
  api.appeler('soumettreMouvement', { id: mvMixte.id }, sansSession);
  api.appeler('validerMouvement', { id: mvMixte.id,
    validateurId: referent.id }, sansSession);
  const chaineMixte = api.appeler('verifierChaineHash', {}, sansSession);
  verifier('chaîne MIXTE v1 → v2 VERTE sur le vrai registre',
    chaineMixte.ok === true, JSON.stringify(chaineMixte));
  verifier('la nouvelle écriture au-dessus du v1 est scellée v2',
    api.appeler('getMouvements', {}, sansSession)
      .find((mv) => mv.id === mvMixte.id).versionEmpreinte === 2);
  verifier('round-trip d’un registre MIXTE : adopté, chaîne toujours verte',
    api.appeler('importerJSON',
      { texte: api.appeler('exporterJSON', {}, sansSession) },
      sansSession) === true &&
    api.appeler('verifierChaineHash', {}, sansSession).ok === true);
}

// ============================================================
// 8. Lot C, brique C3a — PDF final conservé : réception + contrôles
// (la validation OFFICIELLE complète reste fermée par le verrou de
// livraison — les REFUS se tirent via le vrai chemin API, la MÉCANIQUE
// de conservation s'éprouve par l'aide exportée ; le parcours de bout
// en bout sera tiré à l'ouverture, brique C5.)
// ============================================================
{
  // 8.1 Parité stricte du module pur ESM ↔ miroir CommonJS.
  verifier('pdf-final : constantes et messages identiques des deux côtés',
    pdfCjs.CATEGORIE_PDF_FINAL === pdfEsm.CATEGORIE_PDF_FINAL &&
    pdfCjs.PDF_FINAL_TAILLE_MAX === pdfEsm.PDF_FINAL_TAILLE_MAX &&
    pdfCjs.MSG_PDF_FINAL_MANQUANT === pdfEsm.MSG_PDF_FINAL_MANQUANT &&
    pdfCjs.MSG_PDF_FINAL_INVALIDE === pdfEsm.MSG_PDF_FINAL_INVALIDE &&
    pdfCjs.MSG_PDF_FINAL_TROP_GROS === pdfEsm.MSG_PDF_FINAL_TROP_GROS &&
    pdfCjs.MSG_PDF_FINAL_HORS_OFFICIEL === pdfEsm.MSG_PDF_FINAL_HORS_OFFICIEL &&
    pdfCjs.nomFichierPdfFinal('FI-2026-0001') ===
      pdfEsm.nomFichierPdfFinal('FI-2026-0001'));

  const octetsPdf = Buffer.from('%PDF-1.4\nPreuve C3a du PDF conserve\n%%EOF\n');
  const octetsHtml = Buffer.from('<html><body>Faux PDF</body></html>');
  const octetsGros = Buffer.alloc(pdfCjs.PDF_FINAL_TAILLE_MAX + 1);
  octetsGros.set([0x25, 0x50, 0x44, 0x46], 0);
  const CAS_PDF = [null, Buffer.alloc(0), octetsPdf, octetsHtml, octetsGros];
  let identiques = 0;
  for (const octets of CAS_PDF) {
    const a = pdfEsm.verifierOctetsPdfFinal(octets);
    const b = pdfCjs.verifierOctetsPdfFinal(octets);
    if (a.ok === b.ok && a.erreur === b.erreur) identiques += 1;
  }
  verifier(`pdf-final : verdicts identiques sur ${CAS_PDF.length} contenus discriminants`,
    identiques === CAS_PDF.length);
  verifier('pdf-final : les trois refus tombent sur le bon critère',
    pdfCjs.verifierOctetsPdfFinal(Buffer.alloc(0)).erreur ===
      pdfCjs.MSG_PDF_FINAL_MANQUANT &&
    pdfCjs.verifierOctetsPdfFinal(octetsHtml).erreur ===
      pdfCjs.MSG_PDF_FINAL_INVALIDE &&
    pdfCjs.verifierOctetsPdfFinal(octetsGros).erreur ===
      pdfCjs.MSG_PDF_FINAL_TROP_GROS &&
    pdfCjs.verifierOctetsPdfFinal(octetsPdf).erreur === null);

  // 8.2 Les REFUS par le VRAI chemin API — sur une fiche forcée OFFICIEL
  // en SQL direct (un BROUILLON/SOUMIS n'est protégé par aucun trigger) :
  // les contrôles PDF tombent AVANT le verdict du moteur, donc AVANT le
  // verrou de livraison.
  const bCourante = api.appeler('getBouteilles', {}, sansSession)
    .find((b) => b.id === bouteille.id);
  const mvOff = api.appeler('creerMouvement', { donneesMouvement: {
    type: 'CHARGE_APPOINT', machineId: machine.id,
    bouteilleSrcId: bouteille.id,
    peseeAvantKg: bCourante.masseNetteKg,
    peseeApresKg: bCourante.masseNetteKg - 0.25,
    technicien: 'Référent Signature',
    causeMouvement: 'Preuve PDF final C3a' } }, sansSession);
  api.appeler('soumettreMouvement', { id: mvOff.id }, sansSession);
  db.run("UPDATE mouvements SET mode = 'OFFICIEL' WHERE id = ?", [mvOff.id]);

  attendreRejet('valider une fiche OFFICIELLE sans PDF → refus canonique',
    () => api.appeler('validerMouvement', { id: mvOff.id,
      validateurId: referent.id }, sansSession),
    'PDF final de la fiche manquant');
  attendreRejet('valider avec un HTML déguisé en PDF → refus canonique',
    () => api.appeler('validerMouvement', { id: mvOff.id,
      validateurId: referent.id,
      pdfFinalBase64: octetsHtml.toString('base64') }, sansSession),
    'n’est pas un PDF');
  attendreRejet('avec un VRAI PDF, le refus suivant est celui du moteur (verrou)',
    () => api.appeler('validerMouvement', { id: mvOff.id,
      validateurId: referent.id,
      pdfFinalBase64: octetsPdf.toString('base64') }, sansSession),
    'Mode Officiel refusé');
  verifier('la fiche est restée SOUMISE après les trois refus (aucun effet)',
    db.get('SELECT statut FROM mouvements WHERE id = ?', [mvOff.id])
      .statut === 'SOUMIS');
  verifier('aucune PJ CERFA_FINAL n’a été conservée sur les refus',
    !db.get(`SELECT id FROM pieces_jointes
             WHERE entite_id = ? AND categorie = 'CERFA_FINAL'`, [mvOff.id]));

  // 8.3 La MÉCANIQUE de conservation (aide exportée, appelée par
  // validerMouvement dans la transaction) : PJ système en table, fichier
  // sur disque, sha exact, AUCUN incrément de révision (les signatures
  // jugées valides doivent le rester).
  const revAvant = db.get(
    'SELECT revision_brouillon FROM mouvements WHERE id = ?',
    [mvOff.id]).revision_brouillon;
  const sha = api.conserverPdfFinal(
    { id: mvOff.id, numero: mvOff.numero }, octetsPdf, 'Référent Signature');
  verifier('conserverPdfFinal renvoie le sha256 exact des octets',
    sha === crypto.createHash('sha256').update(octetsPdf).digest('hex'));
  const pjConservee = db.get(
    `SELECT * FROM pieces_jointes
     WHERE entite_id = ? AND categorie = 'CERFA_FINAL'`, [mvOff.id]);
  verifier('la PJ système CERFA_FINAL est en table (nom dérivé du numéro)',
    Boolean(pjConservee) &&
    pjConservee.nom_fichier === `CERFA-${mvOff.numero}.pdf` &&
    pjConservee.mime_type === 'application/pdf' &&
    pjConservee.taille_octets === octetsPdf.length &&
    pjConservee.hash_sha256 === sha &&
    pjConservee.chemin === pjConservee.id);
  const surDisque = readFileSync(
    join(dossier, 'data', 'documents', pjConservee.id));
  verifier('le PDF conservé sur disque est l’ORIGINAL octet pour octet',
    surDisque.equals(octetsPdf));
  verifier('la conservation n’incrémente PAS la révision du brouillon',
    db.get('SELECT revision_brouillon FROM mouvements WHERE id = ?',
      [mvOff.id]).revision_brouillon === revAvant);
  verifier('la PJ conservée est visible par le canal contrat (lecture)',
    api.appeler('listerPiecesJointes',
      { entiteType: 'MOUVEMENT', entiteId: mvOff.id }, sansSession)
      .some((pj) => pj.categorie === 'CERFA_FINAL' && pj.hashSha256 === sha));
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Signatures réelles : parité stricte, parcours et attaques tirées, WORM prouvé, empreinte v2 gelée, PDF final contrôlé et conservé (C3a).');
