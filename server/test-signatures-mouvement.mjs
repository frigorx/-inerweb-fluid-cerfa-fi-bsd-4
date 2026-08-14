// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
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
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync }
  from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as moduleEsm from '../v8/js/data/signatures-mouvement.js';
import * as pdfEsm from '../v8/js/data/pdf-final.js';
import { pngDeTest, pngVierge, pngUnSeulPixel }
  from './fabrique-png-test.mjs';

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

/**
 * Octets d'un VRAI PNG de test, portant un tracé (lot B3, brique 2).
 * AVANT : ces fixtures fabriquaient 8 octets magiques + du remplissage,
 * et les faisaient ACCEPTER — le filet vert attestait le comportement
 * défaillant. Le calage à la taille demandée passe désormais par un
 * chunk auxiliaire tEXt : un fichier de la bonne taille ne prouve rien.
 */
const octetsPng = (taille = 1200) => pngDeTest(taille);
const imagePng = (taille = 1200) => Buffer.from(octetsPng(taille)).toString('base64');

/** L'ATTAQUE du constat A04 : les 8 octets magiques, puis du texte. */
function blocQuiSeFaitPasserPourPng(taille = 2348) {
  const octets = new Uint8Array(taille).fill(0x2e);
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    .forEach((o, i) => { octets[i] = o; });
  const phrase = 'signature de complaisance ';
  for (let i = 8; i < taille; i += 1) {
    octets[i] = phrase.charCodeAt((i - 8) % phrase.length);
  }
  return octets;
}

// ============================================================
// 1. Parité stricte module pur ESM ↔ miroir CommonJS
// ============================================================
{
  verifier('constantes identiques (rôles, tailles, messages)',
    JSON.stringify(miroir.ROLES_SIGNATURE) ===
      JSON.stringify(moduleEsm.ROLES_SIGNATURE) &&
    miroir.SIGNATURE_TAILLE_MAX === moduleEsm.SIGNATURE_TAILLE_MAX &&
    miroir.MSG_TRACE_ABSENT === moduleEsm.MSG_TRACE_ABSENT &&
    miroir.MSG_PAS_PNG === moduleEsm.MSG_PAS_PNG &&
    miroir.MSG_ZONE_VIERGE === moduleEsm.MSG_ZONE_VIERGE &&
    miroir.MSG_TROP_GROSSE === moduleEsm.MSG_TROP_GROSSE);
  verifier('la borne basse de 1 Ko a bien DISPARU des deux côtés',
    miroir.SIGNATURE_TAILLE_MIN === undefined &&
    moduleEsm.SIGNATURE_TAILLE_MIN === undefined &&
    miroir.MSG_TROP_PETITE === undefined &&
    moduleEsm.MSG_TROP_PETITE === undefined);

  const CAS_DECLARATION = [
    ['TECHNICIEN', false, null],
    ['TECHNICIEN', true, 'Ignoré'],
    ['DETENTEUR', false, null],
    ['DETENTEUR', true, 'LP Antoine Vidal']
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
    miroir.declarationSignature('DETENTEUR', true, 'LP Antoine Vidal')
      .endsWith(', par délégation du détenteur (LP Antoine Vidal).'));

  let erreurEsm = ''; let erreurCjs = '';
  try { moduleEsm.declarationSignature('PATRON', false, null); }
  catch (e) { erreurEsm = e.message; }
  try { miroir.declarationSignature('PATRON', false, null); }
  catch (e) { erreurCjs = e.message; }
  verifier('même Error sur rôle inconnu des deux côtés',
    erreurEsm !== '' && erreurEsm === erreurCjs);

  // Les images DISCRIMINANTES, nommées (jamais des index : une
  // insertion au milieu ferait mentir la vérification suivante).
  const jpegDeguise = (() => {
    const o = octetsPng(4096); o[0] = 0xff; o[1] = 0xd8; o[2] = 0xff; return o;
  })();
  const crcRetouche = (() => {
    const o = octetsPng(2048); o[o.length - 3] ^= 0xff; return o;
  })();
  const tronque = octetsPng(2048).slice(0, 900);
  const apresIend = (() => {
    const o = octetsPng(2048);
    const cale = new Uint8Array(o.length + 4);
    cale.set(o, 0);
    cale.set([0x41, 0x42, 0x43, 0x44], o.length);
    return cale;
  })();
  const CAS_IMAGE = [
    null,
    new Uint8Array(0),
    octetsPng(1024),
    octetsPng(1023),
    octetsPng(4096),
    jpegDeguise,
    octetsPng(moduleEsm.SIGNATURE_TAILLE_MAX + 1),
    // Lot B3 : les images qui ne SONT pas des images.
    blocQuiSeFaitPasserPourPng(),
    blocQuiSeFaitPasserPourPng(1500),
    crcRetouche,
    tronque,
    apresIend,
    // Lot B3 : les images qui SONT des images, mais vides de tout tracé.
    pngVierge(),
    pngVierge(96),
    pngVierge(4096, [0, 0, 0, 0]),
    pngDeTest(0),
    pngUnSeulPixel()
  ];
  identiques = 0;
  for (const octets of CAS_IMAGE) {
    if (moduleEsm.verifierImageSignature(octets) ===
        miroir.verifierImageSignature(octets)) identiques += 1;
  }
  verifier(`critères d'illisibilité identiques sur ${CAS_IMAGE.length} images discriminantes`,
    identiques === CAS_IMAGE.length);
  // REVUE DU 25/07 (MINEUR 4) : le libellé disait « quatre » alors que
  // la brique 3 en a ajouté un cinquième (la zone vierge), et un
  // sixième cas atteste qu'un PNG recevable n'est PAS refusé.
  verifier('les cinq refus tombent chacun sur son propre critère'
    + ' (et un PNG recevable n’en déclenche aucun)',
    miroir.verifierImageSignature(new Uint8Array(0)) === miroir.MSG_TRACE_ABSENT &&
    miroir.verifierImageSignature(pngVierge()) === miroir.MSG_ZONE_VIERGE &&
    miroir.verifierImageSignature(jpegDeguise) === miroir.MSG_PAS_PNG &&
    miroir.verifierImageSignature(octetsPng(miroir.SIGNATURE_TAILLE_MAX + 1))
      === miroir.MSG_TROP_GROSSE &&
    miroir.verifierImageSignature(octetsPng(1024)) === null);
  // Lot B3 (brique 3) — le VIDE ABSOLU, et RIEN DE PLUS.
  verifier('un PNG impeccable mais rigoureusement UNIFORME est REFUSÉ',
    miroir.verifierImageSignature(pngVierge()) === miroir.MSG_ZONE_VIERGE &&
    moduleEsm.verifierImageSignature(pngVierge()) === moduleEsm.MSG_ZONE_VIERGE &&
    miroir.verifierImageSignature(pngVierge(4096, [0, 0, 0, 0]))
      === miroir.MSG_ZONE_VIERGE);
  verifier('DÉCISION D2 : la borne de 1 Ko a disparu — un VRAI tracé de 105 o passe',
    pngDeTest(0).length < 1024 &&
    miroir.verifierImageSignature(pngDeTest(0)) === null &&
    moduleEsm.verifierImageSignature(pngDeTest(0)) === null);
  verifier('DÉCISION D2 : aucun seuil d’encre — un SEUL pixel différent suffit',
    miroir.verifierImageSignature(pngUnSeulPixel()) === null &&
    moduleEsm.verifierImageSignature(pngUnSeulPixel()) === null);
  // REVUE DU 25/07 (MINEUR 6) — UN SEUL DÉCODAGE. verifierImageSignature
  // appelait verifierStructurePng PUIS analyseEncre, qui relit le
  // fichier : le PNG était décodé deux fois sur le chemin qui juge les
  // signatures. Les deux miroirs passent désormais par lireImagePng, qui
  // pose les deux questions en un passage. Le test lit la SOURCE : c'est
  // le seul moyen de prouver le nombre de lectures sans instrumenter du
  // code de production (les verdicts, eux, sont figés juste au-dessus).
  {
    const { readFileSync } = await import('node:fs');
    let conformes = 0;
    for (const chemin of ['../v8/js/data/signatures-mouvement.js',
      './signatures-mouvement.js']) {
      const source = readFileSync(new URL(chemin, import.meta.url), 'utf8');
      const corps = source.slice(source.indexOf('function verifierImageSignature'));
      if (corps.includes('lireImagePng(octets)')
          && !corps.includes('verifierStructurePng(')
          && !corps.includes('analyseEncre(')) conformes += 1;
    }
    verifier('MINEUR 6 : les DEUX miroirs décodent le PNG UNE SEULE fois'
      + ' (lireImagePng, jamais les deux fonctions séparées)',
    conformes === 2, `${conformes} / 2`);
  }

  // Lot B3 (brique 2) : l'image est DÉCODÉE, plus reconnue à 8 octets.
  verifier('A04 : le bloc de 2 348 o aux bons octets magiques est REFUSÉ',
    miroir.verifierImageSignature(blocQuiSeFaitPasserPourPng())
      === miroir.MSG_PAS_PNG &&
    moduleEsm.verifierImageSignature(blocQuiSeFaitPasserPourPng())
      === moduleEsm.MSG_PAS_PNG);
  verifier('un PNG dont un CRC-32 a été retouché est REFUSÉ',
    miroir.verifierImageSignature(crcRetouche) === miroir.MSG_PAS_PNG);
  verifier('un PNG tronqué (IEND coupé) est REFUSÉ',
    miroir.verifierImageSignature(tronque) === miroir.MSG_PAS_PNG);
  verifier('un PNG suivi d’octets cachés après IEND est REFUSÉ',
    miroir.verifierImageSignature(apresIend) === miroir.MSG_PAS_PNG);
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
  // ATTAQUE A04, TIRÉE contre l'API : le bloc de texte préfixé des 8
  // octets magiques était ACCEPTÉ, et faisait tomber les conditions
  // bloquantes 14/15 du moteur Officiel.
  attendreRejet('A04 TIRÉ : bloc de 2 348 o aux bons octets magiques → refus',
    () => api.appeler('signerMouvement', { mouvementId: brouillon.id,
      signature: signatureType({ imagePng: Buffer.from(
        blocQuiSeFaitPasserPourPng()).toString('base64') }) }, session), 'PNG');
  attendreRejet('PNG au CRC-32 retouché : refus',
    () => api.appeler('signerMouvement', { mouvementId: brouillon.id,
      signature: signatureType({ imagePng: Buffer.from((() => {
        const o = octetsPng(2048); o[o.length - 3] ^= 0xff; return o;
      })()).toString('base64') }) }, session), 'PNG');
  attendreRejet('PNG tronqué (IEND coupé) : refus',
    () => api.appeler('signerMouvement', { mouvementId: brouillon.id,
      signature: signatureType({ imagePng: Buffer.from(
        octetsPng(2048).slice(0, 900)).toString('base64') }) }, session), 'PNG');
  attendreRejet('zone restée VIERGE (PNG impeccable, aplat uni) : refus',
    () => api.appeler('signerMouvement', { mouvementId: brouillon.id,
      signature: signatureType({ imagePng: Buffer.from(pngVierge(5562))
        .toString('base64') }) }, session), 'restée vierge');
  attendreRejet('canvas TRANSPARENT jamais dessiné : refus',
    () => api.appeler('signerMouvement', { mouvementId: brouillon.id,
      signature: signatureType({ imagePng: Buffer.from(
        pngVierge(4096, [0, 0, 0, 0])).toString('base64') }) }, session),
    'restée vierge');
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
      organisation: 'LP Antoine Vidal' }) }, session);
  verifier('détenteur par délégation : mention dans la déclaration figée',
    sigDet.valide === true && sigDet.declaration.includes(
      'par délégation du détenteur (LP Antoine Vidal)'));

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
      organisation: 'LP Antoine Vidal' }) }, session);
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

  // Lot C (C3c) : l'ASYMÉTRIE est FERMÉE — une écriture scellée ne reçoit
  // plus AUCUNE pièce justificative (le gel garde sa raison d'être : la
  // vérification de chaîne RELIT les valeurs stockées, rien n'est
  // re-dérivé ; et l'import RECOMPTE désormais hashPiecesJointes).
  attendreRejet('une PJ ne s’ajoute PLUS à une écriture scellée (asymétrie fermée)',
    () => api.appeler('ajouterPieceJointe', { donneesPj: {
      entiteType: 'MOUVEMENT', entiteId: brouillon.id,
      nomFichier: 'apres-scellement.png', mimeType: 'image/png',
      categorie: 'PHOTO_PESEE', base64: imagePng(2048) } }, session),
    'ne peut plus recevoir de pièce');
  verifier('le refus ne touche à rien : la chaîne reste verte',
    api.appeler('verifierChaineHash', {}, sansSession).ok === true);
  attendreRejet('la catégorie CERFA_FINAL est RÉSERVÉE au canal système',
    () => api.appeler('ajouterPieceJointe', { donneesPj: {
      entiteType: 'MOUVEMENT', entiteId: brouillon.id,
      nomFichier: 'fausse-officielle.pdf', mimeType: 'application/pdf',
      categorie: 'CERFA_FINAL', base64: 'JVBERi0xLjQK' } }, session),
    'réservée au système');

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

  // ATTAQUES (plan §7.4 — lot C, C3c) : les PJ d'une écriture v2 se
  // RECOMPTENT à l'import (asymétrie fermée) — la « CERFA truquée dans
  // l'export » est désormais un test PERMANENT.
  const forgePj = JSON.parse(exporteForge);
  const pjCible = forgePj.donnees.piecesJointes.find((pj) =>
    pj.entiteType === 'MOUVEMENT' && pj.entiteId === brouillon.id);
  pjCible.hashSha256 = '0'.repeat(64);
  pjCible.nomFichier = 'CERFA-truquee.pdf';
  attendreRejet('PJ RETOUCHÉE dans le JSON (hash et nom réécrits) : « fichier forgé »',
    () => api.appeler('importerJSON',
      { texte: JSON.stringify(forgePj) }, sansSession),
    'pièces jointes du mouvement');
  const forgeInjection = JSON.parse(exporteForge);
  forgeInjection.donnees.piecesJointes.push({
    id: 'pj-cerfa-forgee', entiteType: 'MOUVEMENT', entiteId: brouillon.id,
    categorie: 'CERFA_FINAL', nomFichier: 'CERFA-forgee.pdf',
    mimeType: 'application/pdf', taille: 13,
    hashSha256: 'beef'.repeat(16),
    dateAjout: '2026-07-19T00:00:00.000Z', ajoutePar: 'Forgeur' });
  attendreRejet('CERFA_FINAL INJECTÉE dans l’export : « fichier forgé »',
    () => api.appeler('importerJSON',
      { texte: JSON.stringify(forgeInjection) }, sansSession),
    'pièces jointes du mouvement');
  // Une CERFA_FINAL ÉGARÉE hors de tout mouvement figé v2 (ici : typée
  // MACHINE, donc invisible du recomptage) est refusée par la garde
  // « hors canal système » (constat IMPORTANT de la revue C3c, fermé).
  const forgeHorsCanal = JSON.parse(exporteForge);
  forgeHorsCanal.donnees.piecesJointes.push({
    id: 'pj-cerfa-machine', entiteType: 'MACHINE', entiteId: machine.id,
    categorie: 'CERFA_FINAL', nomFichier: 'CERFA-egaree.pdf',
    mimeType: 'application/pdf', taille: 13,
    hashSha256: 'dead'.repeat(16),
    dateAjout: '2026-07-19T00:00:00.000Z', ajoutePar: 'Forgeur' });
  attendreRejet('CERFA_FINAL égarée hors mouvement figé v2 : « hors canal système »',
    () => api.appeler('importerJSON',
      { texte: JSON.stringify(forgeHorsCanal) }, sansSession),
    'hors canal système');

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
    pdfCjs.MSG_PDF_FINAL_TRANSFERT === pdfEsm.MSG_PDF_FINAL_TRANSFERT &&
    pdfCjs.nomFichierPdfFinal('FI-2026-0001') ===
      pdfEsm.nomFichierPdfFinal('FI-2026-0001'));
  // Brique C5 : l'exemption TRANSFERT est la MÊME vérité des deux côtés.
  verifier('pdf-final : pdfFinalAttendu identique des deux côtés (exemption TRANSFERT)',
    pdfCjs.pdfFinalAttendu('TRANSFERT') === false &&
    pdfEsm.pdfFinalAttendu('TRANSFERT') === false &&
    pdfCjs.pdfFinalAttendu('CHARGE_APPOINT') === true &&
    pdfEsm.pdfFinalAttendu('CHARGE_APPOINT') === true &&
    pdfCjs.pdfFinalAttendu('RECUPERATION') === pdfEsm.pdfFinalAttendu('RECUPERATION'));

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

  // 8.2 bis — Brique C5 : le TRANSFERT officiel est EXEMPTÉ du PDF final
  // (arbitrage Franck 19/07 — jamais de CERFA, IM-12). Un PDF fourni est
  // refusé ; SANS PDF, le refus suivant est celui du moteur (verrou), et
  // PAS « PDF manquant » — l'exemption se prouve verrou encore fermé.
  const bDstTransfert = api.appeler('createBouteille', { donneesBouteille: {
    type: 'RECUPERATION', fluide: 'R-134a', tareKg: 10, masseBruteKg: 10,
    contenanceMaxKg: 25 } }, sansSession);
  const bSrcTransfert = api.appeler('getBouteilles', {}, sansSession)
    .find((b) => b.id === bouteille.id);
  const mvTransfertOff = api.appeler('creerMouvement', { donneesMouvement: {
    type: 'TRANSFERT', bouteilleSrcId: bouteille.id,
    bouteilleDstId: bDstTransfert.id,
    peseeAvantKg: bSrcTransfert.masseNetteKg,
    peseeApresKg: bSrcTransfert.masseNetteKg - 0.5,
    technicien: 'Référent Signature' } }, sansSession);
  api.appeler('soumettreMouvement', { id: mvTransfertOff.id }, sansSession);
  db.run("UPDATE mouvements SET mode = 'OFFICIEL' WHERE id = ?",
    [mvTransfertOff.id]);
  attendreRejet('un PDF fourni sur un TRANSFERT officiel → refus canonique',
    () => api.appeler('validerMouvement', { id: mvTransfertOff.id,
      validateurId: referent.id,
      pdfFinalBase64: octetsPdf.toString('base64') }, sansSession),
    'sans objet pour un transfert');
  attendreRejet('sans PDF, le refus du TRANSFERT officiel vient du moteur (exemption prouvée)',
    () => api.appeler('validerMouvement', { id: mvTransfertOff.id,
      validateurId: referent.id }, sansSession),
    'Mode Officiel refusé');

  // 8.3 La MÉCANIQUE de conservation (aide exportée, appelée par
  // validerMouvement dans la transaction) : PJ système en table, fichier
  // sur disque, sha exact, AUCUN incrément de révision (les signatures
  // jugées valides doivent le rester).
  const revAvant = db.get(
    'SELECT revision_brouillon FROM mouvements WHERE id = ?',
    [mvOff.id]).revision_brouillon;
  const { pjId, sha } = api.conserverPdfFinal(
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

  // ==========================================================
  // 8.4 Lot C, brique C3b — témoins (.sha256 + manifeste) et
  // vérificateur du PDF conservé, ATTAQUE « PDF altéré sur disque ».
  // ==========================================================
  // L'écriture porte l'empreinte scellée (posée en SQL : la brique se
  // teste verrou fermé, hash_pdf_final d'un SOUMIS n'est pas protégé).
  db.run('UPDATE mouvements SET hash_pdf_final = ? WHERE id = ?',
    [sha, mvOff.id]);

  const manifeste = {
    type: 'PDF_FINAL_CERFA',
    logiciel: 'inerWeb Fluide',
    versionLogiciel: '8.0.0-dev',
    numeroFiche: mvOff.numero,
    cerfaNumero: mvOff.numero,
    mouvementId: mvOff.id,
    pieceJointeId: pjId,
    nomFichier: `CERFA-${mvOff.numero}.pdf`,
    sha256Pdf: sha,
    dateValidation: '2026-07-18T00:00:00.000Z',
    validateur: 'Référent Signature',
    signataires: [],
    empreinteMouvement: 'test',
    hashPrecedent: null,
    versionEmpreinte: 2,
    hashSignatures: null,
    hashPiecesJointes: null
  };
  api.ecrireTemoinsPdfFinal(manifeste);
  const cheminPdfConserve = join(dossier, 'data', 'documents', pjId);
  verifier('le .sha256 frère est écrit au format sha256sum binaire',
    readFileSync(`${cheminPdfConserve}.sha256`, 'utf8') ===
      `${sha} *${pjId}\n`);
  const manifesteRelu = JSON.parse(
    readFileSync(`${cheminPdfConserve}.manifeste.json`, 'utf8'));
  verifier('le manifeste.json relu porte fiche, sha et empreinte scellée',
    manifesteRelu.type === 'PDF_FINAL_CERFA' &&
    manifesteRelu.numeroFiche === mvOff.numero &&
    manifesteRelu.sha256Pdf === sha &&
    manifesteRelu.pieceJointeId === pjId &&
    'empreinteMouvement' in manifesteRelu &&
    Array.isArray(manifesteRelu.signataires));

  verifier('verifierPdfFinalConserve : TOUT CONCORDE → vert',
    JSON.stringify(api.verifierPdfFinalConserve(mvOff.id)) ===
      JSON.stringify({ ok: true, sansObjet: false, motifs: [] }));
  verifier('verifierPdfFinalConserve : sans PDF scellé → sans objet',
    api.verifierPdfFinalConserve(brouillon.id).sansObjet === true);

  // ATTAQUE : altérer le PDF conservé sur disque → dénoncé.
  writeFileSync(cheminPdfConserve,
    Buffer.from('%PDF-1.4\nPDF FALSIFIE apres scellement\n%%EOF\n'));
  const verdictAltere = api.verifierPdfFinalConserve(mvOff.id);
  verifier('ATTAQUE : PDF altéré sur disque → dénoncé par le vérificateur',
    verdictAltere.ok === false &&
    verdictAltere.motifs.some((m) => m.includes('ALTÉRÉ')),
    JSON.stringify(verdictAltere));
  // Réparer (remettre l'original), puis casser le .sha256 frère seul.
  writeFileSync(cheminPdfConserve, octetsPdf);
  verifier('réparé : le vérificateur repasse au vert',
    api.verifierPdfFinalConserve(mvOff.id).ok === true);
  writeFileSync(`${cheminPdfConserve}.sha256`,
    `${'0'.repeat(64)} *${pjId}\n`);
  verifier('ATTAQUE : .sha256 frère réécrit → dénoncé (divergent)',
    api.verifierPdfFinalConserve(mvOff.id).motifs
      .some((m) => m.includes('.sha256 frère divergent')));
  rmSync(`${cheminPdfConserve}.sha256`);
  verifier('ATTAQUE : .sha256 frère supprimé → dénoncé (absent)',
    api.verifierPdfFinalConserve(mvOff.id).motifs
      .some((m) => m.includes('.sha256 frère absent')));

  // ==========================================================
  // 8.5 Lot C, brique C3b — RÉGÉNÉRATION des témoins manquants au
  // démarrage (le cas RESTAURATION d'archive : le coffre-fort ne
  // transporte pas les frères — et le cas TEMOINS_PDF_ECHEC toléré).
  // ==========================================================
  // État hérité de 8.4 : .sha256 supprimé, PDF original en place.
  rmSync(`${cheminPdfConserve}.manifeste.json`);
  const bilanRegen = api.reecrireTemoinsPdfFinalManquants();
  verifier('témoins manquants réécrits au démarrage (bilan cohérent)',
    bilanRegen.reecrits === 1 && bilanRegen.examines >= 1,
    JSON.stringify(bilanRegen));
  verifier('le .sha256 régénéré est identique bit à bit (pure dérivation)',
    readFileSync(`${cheminPdfConserve}.sha256`, 'utf8') ===
      `${sha} *${pjId}\n`);
  const manifesteRegen = JSON.parse(
    readFileSync(`${cheminPdfConserve}.manifeste.json`, 'utf8'));
  verifier('le manifeste régénéré est marqué regenere et garde le sha scellé',
    manifesteRegen.regenere === true &&
    manifesteRegen.sha256Pdf === sha &&
    manifesteRegen.numeroFiche === mvOff.numero &&
    Array.isArray(manifesteRegen.signataires));
  verifier('après régénération, le vérificateur repasse au vert',
    api.verifierPdfFinalConserve(mvOff.id).ok === true);
  // Un frère PRÉSENT n'est jamais écrasé : falsifié, il reste dénoncé.
  writeFileSync(`${cheminPdfConserve}.sha256`, `${'0'.repeat(64)} *${pjId}\n`);
  const bilanIntact = api.reecrireTemoinsPdfFinalManquants();
  verifier('un .sha256 falsifié n’est PAS écrasé par la régénération',
    bilanIntact.reecrits === 0 &&
    readFileSync(`${cheminPdfConserve}.sha256`, 'utf8')
      .startsWith('0'.repeat(64)) &&
    api.verifierPdfFinalConserve(mvOff.id).ok === false);
  // Remettre l'état sain (fin de section propre).
  writeFileSync(`${cheminPdfConserve}.sha256`, `${sha} *${pjId}\n`);

  // ==========================================================
  // 8.6 Lot C, brique C3c — PLURALITÉ de PJ CERFA_FINAL dénoncée
  // (constat différé de la revue C3b : une seule pièce par écriture,
  // toute seconde = insertion hors canal système, SQL direct compris).
  // ==========================================================
  db.run(
    `INSERT INTO pieces_jointes (id, entite_type, entite_id, categorie,
       nom_fichier, hash_sha256) VALUES ('pj-cerfa-double', 'MOUVEMENT', ?,
       'CERFA_FINAL', 'CERFA-double.pdf', ?)`, [mvOff.id, sha]);
  const verdictPluralite = api.verifierPdfFinalConserve(mvOff.id);
  verifier('ATTAQUE : deux PJ CERFA_FINAL → pluralité dénoncée',
    verdictPluralite.ok === false &&
    verdictPluralite.motifs
      .some((m) => m.includes('plusieurs pièces jointes CERFA_FINAL')),
    JSON.stringify(verdictPluralite));
  db.run("DELETE FROM pieces_jointes WHERE id = 'pj-cerfa-double'");
  verifier('pluralité retirée : le vérificateur repasse au vert',
    api.verifierPdfFinalConserve(mvOff.id).ok === true);

  // ==========================================================
  // 8.7 Brique C5 — le contrôle GLOBAL du démarrage
  // (verifierTousPdfFinalConserves, joué par serveur.js) : tous les
  // PDF scellés sont examinés, une altération remonte avec le NUMÉRO.
  // ==========================================================
  const bilanGlobalVert = api.verifierTousPdfFinalConserves();
  verifier('contrôle global : le PDF scellé du décor est examiné, zéro anomalie',
    bilanGlobalVert.examines >= 1 && bilanGlobalVert.anomalies.length === 0,
    JSON.stringify(bilanGlobalVert));
  writeFileSync(cheminPdfConserve,
    Buffer.from('%PDF-1.4\nPDF FALSIFIE pour le controle global\n%%EOF\n'));
  const bilanGlobalRouge = api.verifierTousPdfFinalConserves();
  verifier('ATTAQUE : l’altération est dénoncée par le contrôle global, numéro compris',
    bilanGlobalRouge.anomalies.some((a) => a.numero === mvOff.numero &&
      a.motifs.some((m) => m.includes('ALTÉRÉ'))),
    JSON.stringify(bilanGlobalRouge));
  writeFileSync(cheminPdfConserve, octetsPdf);
  verifier('réparé : le contrôle global repasse au vert',
    api.verifierTousPdfFinalConserves().anomalies.length === 0);
}

// ============================================================
// 9. Lot B3 (brique 5) — LE TÉMOIN DE SESSION AU DOSSIER D'AUDIT
// Le témoin est capté et stocké depuis la brique C1, mais il n'était
// porté NULLE PART : on jetait une preuve qu'on possédait déjà. Il
// entre au dossier scellé par signatures.csv. Tiré ici parce que
// c'est le seul endroit du filet où des signatures existent AVEC une
// vraie session (la Démo n'a pas de comptes).
// ============================================================
{
  // Décor propre : la section 7 a rétrogradé le registre et retiré les
  // signatures d'époque. On repose un brouillon SIGNÉ sous session.
  const bCourante = api.appeler('getBouteilles', {}, sansSession)
    .find((b) => b.id === bouteille.id);
  const mvTemoin = api.appeler('creerMouvement', { donneesMouvement: {
    type: 'CHARGE_APPOINT', machineId: machine.id, bouteilleSrcId: bouteille.id,
    peseeAvantKg: bCourante.masseNetteKg,
    peseeApresKg: bCourante.masseNetteKg - 0.2,
    technicien: 'Référent Signature',
    causeMouvement: 'Preuve du témoin de session' } }, sansSession);
  api.appeler('signerMouvement', { mouvementId: mvTemoin.id,
    signature: signatureType({ qualite: 'Professeur intervenant' }) }, session);
  api.appeler('signerMouvement', { mouvementId: mvTemoin.id,
    signature: signatureType({ role: 'DETENTEUR', parDelegation: true,
      organisation: 'LP Antoine Vidal' }) }, session);
  // Une PJ ajoutée après coup PÉRIME les deux signatures : le dossier
  // doit dire l'état de chacune, pas seulement leur existence.
  api.appeler('ajouterPieceJointe', { donneesPj: {
    entiteType: 'MOUVEMENT', entiteId: mvTemoin.id,
    nomFichier: 'apres-signature.png', mimeType: 'image/png',
    categorie: 'PHOTO_PESEE', base64: imagePng(2048) } }, session);
  api.appeler('signerMouvement', { mouvementId: mvTemoin.id,
    signature: signatureType() }, session);

  const { csvSignatures } = await import('../v8/js/documents/exports.js');
  const storeDuDossier = {
    getMouvements: async () => api.appeler('getMouvements', {}, sansSession),
    getSignaturesMouvement: async (id) => api.appeler(
      'getSignaturesMouvement', { mouvementId: id }, sansSession)
  };
  const personnel = api.appeler('getPersonnel', {}, sansSession);
  const annee = Number(new Date().toISOString().slice(0, 4));
  const csv = await csvSignatures(storeDuDossier, annee, personnel);
  verifier('signatures.csv est produit (des signatures existent cette année)',
    typeof csv === 'string' && csv.length > 0);
  const lignes = String(csv).replace(/^﻿/, '').split('\r\n')
    .filter((l) => l !== '');
  verifier('l’en-tête porte les DEUX colonnes du témoin de session',
    lignes[0].includes('Session — personne')
    && lignes[0].includes('Session — compte'), lignes[0]);
  const ligneTechnicien = lignes.find((l) =>
    l.includes(mvTemoin.numero) && l.includes('TECHNICIEN'));
  verifier('la ligne du technicien porte la PERSONNE de session (fiche vivante)',
    Boolean(ligneTechnicien) && ligneTechnicien.includes('Référent Signature'),
    ligneTechnicien);
  verifier('la ligne du technicien porte le COMPTE de session (témoin non ambigu)',
    Boolean(ligneTechnicien) && ligneTechnicien.includes(session.utilisateur),
    ligneTechnicien);
  verifier('l’état de chaque signature est dit (valide / périmée)',
    lignes.some((l) => l.includes('périmée')) &&
    lignes.some((l) => l.includes('valide')),
    lignes.slice(1, 3).join(' || '));
  // DÉCISION D1 : deux signatures de la MÊME session, c'est normal —
  // le dossier montre le fait et ne porte AUCUN verdict.
  verifier('aucun verdict, aucun mot de suspicion dans le CSV',
    !/suspect|douteu|anomalie de session|même session/i.test(String(csv)));
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Signatures réelles : parité stricte, parcours et attaques tirées, WORM prouvé, empreinte v2 gelée, PDF final contrôlé, conservé et témoigné (C3a+C3b).');
