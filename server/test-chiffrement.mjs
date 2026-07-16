// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — PREUVE du chiffrement E4.2 (AES-256-GCM).
// Exécution : node server/test-chiffrement.mjs
//
// « Après chiffrement, re-déchiffrer en mémoire pour prouver que la phrase
// marche avant d'annoncer OK » + « un octet modifié = rejet, pas de bouillie »
// (VISION §4.5 ; docs/E4-PLAN §E4.2).
//
// RÈGLES DE SÛRETÉ DU TEST (identiques à test-sauvegarde.mjs) :
//   - base TOUJOURS jetable, sous os.tmpdir() (JAMAIS le data/ réel) ;
//   - la base jetable vit dans <mkdtemp>/data/inerweb-fluide.db pour que
//     backups/ (frère de data/) reste sous la racine temporaire jetable ;
//   - chaque famille construit SON monde puis nettoie sa racine temp.
//
// Les 6 familles de preuve (E4-PLAN §E4.2) :
//   1. Une archive chiffrée se re-déchiffre à l'identique (ZIP bit-pour-bit).
//   2. 1 octet modifié dans le ciphertext OU le tag = rejet net (final lève).
//   3. Phrase fausse = rejet.
//   4. lireManifesteClair lit le manifeste SANS la phrase (compteurs/horodatage
//      visibles).
//   5. La re-vérification refuse d'annoncer OK si le chiffré n'est pas
//      ré-ouvrable (parade « phrase perdue = données perdues »).
//   6. BOUT EN BOUT : sauvegarder ARCHIVE chiffrée → listerSauvegardes montre
//      chiffre:true + compteurs → testerSauvegarde bonne phrase = VERT,
//      mauvaise phrase = rejet → restaurer bonne phrase = état restauré fidèle,
//      mauvaise phrase = REFUS sans toucher la base vive.
//
// Node ≥ 22 (node:sqlite, node:crypto), sans DOM.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync,
  readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const api = require('./api.js');
const sauvegarde = require('./sauvegarde.js');
const restauration = require('./restauration.js');
const chiffrement = require('./chiffrement.js');
const zip = require('./zip-node.js');

// ------------------------------------------------------------
// Outillage de vérification (conventions maison des suites v8).
// ------------------------------------------------------------
let nbOk = 0;
let nbEchecs = 0;
const echecs = [];

function verifier(libelle, condition, detail = '') {
  if (condition) {
    nbOk += 1;
    console.log(`  OK  ${libelle}`);
  } else {
    nbEchecs += 1;
    echecs.push(libelle);
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Exécute `fn` et renvoie true si elle LÈVE (message contenant extrait). */
function leve(fn, extrait = '') {
  try {
    fn();
    return { leve: false, message: null };
  } catch (erreur) {
    return {
      leve: !extrait || String(erreur.message).includes(extrait),
      message: erreur.message
    };
  }
}

const CONTEXTE = { role: 'REFERENT' };
const PHRASE = 'coffre-bureau-13010-éàç';
const MAUVAISE = 'mauvaise-phrase';

function sha256(octets) {
  return createHash('sha256').update(octets).digest('hex');
}

// ------------------------------------------------------------
// Base JETABLE peuplée par de VRAIES mutations api.js (chaîne de hash réelle).
// ------------------------------------------------------------

function ouvrirBaseJetable(prefixe = 'e42-') {
  const racine = mkdtempSync(join(tmpdir(), `inerweb-fluide-${prefixe}`));
  const dossierData = join(racine, 'data');
  require('node:fs').mkdirSync(dossierData, { recursive: true });
  const chemin = join(dossierData, 'inerweb-fluide.db');
  db.ouvrir(chemin);
  api.appeler('init', {}, CONTEXTE);
  return { racine, chemin };
}

function pngMinuscule() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk' +
    'YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
}

/** Peuple : personnel, client, machine, bouteille, 2 mvts validés, 1 PJ. */
function peupler() {
  const referent = api.appeler('createPersonne', {
    donneesPersonne: {
      nom: 'Preuve', prenom: 'Référent', typePersonne: 'ENSEIGNANT',
      roleApp: 'REFERENT'
    }
  }, CONTEXTE);
  const enseignant = api.appeler('createPersonne', {
    donneesPersonne: {
      nom: 'Preuve', prenom: 'Valideur', typePersonne: 'ENSEIGNANT',
      roleApp: 'ENSEIGNANT'
    }
  }, CONTEXTE);
  const client = api.appeler('createClient', {
    donneesClient: {
      raisonSociale: 'Atelier de preuve',
      adresse: '1 rue de la Preuve, 13010 Marseille',
      siret: '12345678900011'
    }
  }, CONTEXTE);
  const machine = api.appeler('createMachine', {
    donneesMachine: {
      designation: 'Groupe de preuve', fluide: 'R-32',
      chargeNominaleKg: 10, clientId: client.id, operateur: 'Testeur'
    }
  }, CONTEXTE);
  const bouteille = api.appeler('createBouteille', {
    donneesBouteille: {
      type: 'NEUVE', fluide: 'R-32', tareKg: 10, masseBruteKg: 30,
      contenanceMaxKg: 25
    }
  }, CONTEXTE);
  const mvt1 = api.appeler('creerMouvement', {
    donneesMouvement: {
      type: 'CHARGE_APPOINT', machineId: machine.id, bouteilleSrcId: bouteille.id,
      peseeAvantKg: 30, peseeApresKg: 28, technicien: 'Testeur',
      causeMouvement: 'Charge de preuve n°1'
    }
  }, CONTEXTE);
  api.appeler('soumettreMouvement', { id: mvt1.id }, CONTEXTE);
  api.appeler('validerMouvement',
    { id: mvt1.id, validateurId: enseignant.id }, CONTEXTE);
  const mvt2 = api.appeler('creerMouvement', {
    donneesMouvement: {
      type: 'CHARGE_APPOINT', machineId: machine.id, bouteilleSrcId: bouteille.id,
      peseeAvantKg: 28, peseeApresKg: 27, technicien: 'Testeur',
      causeMouvement: 'Charge de preuve n°2'
    }
  }, CONTEXTE);
  api.appeler('soumettreMouvement', { id: mvt2.id }, CONTEXTE);
  api.appeler('validerMouvement',
    { id: mvt2.id, validateurId: enseignant.id }, CONTEXTE);
  // Une pièce jointe (preuve) rattachée à la machine.
  api.appeler('ajouterPieceJointe', {
    donneesPj: {
      entiteType: 'MACHINE', entiteId: machine.id,
      nomFichier: 'plaque.png', mimeType: 'image/png',
      categorie: 'AUTRE', base64: pngMinuscule().toString('base64'),
      ajoutePar: referent.id
    }
  }, CONTEXTE);
  return { referent, enseignant, client, machine, bouteille, mvt1, mvt2 };
}

function nettoyer(racine) {
  try { db.fermer(); } catch { /* déjà fermée */ }
  try { rmSync(racine, { recursive: true, force: true }); } catch { /* best-effort */ }
}

/** Manifeste jouet minimal (chiffrement.actif=true) pour les tests unitaires. */
function manifesteJouet(mouvementsValides = 2) {
  return {
    format: 'inerweb-fluide-sauvegarde',
    versionManifeste: 1,
    type: 'ARCHIVE',
    horodatage: new Date().toISOString(),
    versionApp: 8,
    versionBase: 3,
    base: { nomFichier: 'inerweb-fluide.db', tailleOctets: 4096, sha256: 'a'.repeat(64) },
    integrite: { chaineRegistreOk: true, chaineJournalOk: true,
      dernierHashRegistre: null, dernierHashJournal: null },
    compteurs: { machines: 1, bouteilles: 1, mouvements: 2,
      mouvementsValides, controles: 0, personnelActif: 2, clients: 1,
      documents: 1, entreesJournal: 5 },
    documents: { nombre: 1, tailleTotaleOctets: 70, sha256Global: 'b'.repeat(64) },
    chiffrement: { actif: true, algorithme: 'AES-256-GCM', kdf: 'scrypt',
      kdfParams: { N: 32768, r: 8, p: 1, selLongueur: 16 }, indice: 'coffre bureau' }
  };
}

// ============================================================
// Famille 1 — re-déchiffrement à l'identique (ZIP bit-pour-bit).
// ============================================================
function famille1() {
  console.log('\n[1] Une archive chiffrée se re-déchiffre à l\'identique.');
  const zipSource = zip.creerZipOctets([
    { nom: 'manifeste.json', contenu: JSON.stringify(manifesteJouet()) },
    { nom: 'base/inerweb-fluide.db', contenu: Buffer.from('contenu-binaire-\x00\x01\x02-éàç') }
  ], new Date());
  const enveloppe = chiffrement.chiffrer(zipSource, PHRASE, manifesteJouet());
  verifier('enveloppe reconnue comme chiffrée (magic)',
    chiffrement.estEnveloppeChiffree(enveloppe));
  // Le ciphertext ne doit pas exposer la signature ZIP « PK\x03\x04 » du ZIP
  // source (elle serait présente en clair si rien n'était chiffré). On la
  // cherche APRÈS l'en-tête clair (magic + longueur + manifeste) : le corps
  // chiffré ne doit pas la contenir à l'octet 0 du ciphertext.
  const { ciphertext } = chiffrement.decomposer(enveloppe);
  verifier('le ciphertext ne commence pas par la signature ZIP en clair',
    !(ciphertext.length >= 4 && ciphertext[0] === 0x50 && ciphertext[1] === 0x4b
      && ciphertext[2] === 0x03 && ciphertext[3] === 0x04));
  const rendu = chiffrement.dechiffrer(enveloppe, PHRASE);
  verifier('re-déchiffrement bit-pour-bit du ZIP source',
    Buffer.isBuffer(rendu) && rendu.equals(zipSource),
    `sha source ${sha256(zipSource).slice(0, 12)} vs rendu ${sha256(rendu).slice(0, 12)}`);
  // Deux chiffrements de la même source diffèrent (sel+IV frais) mais s'ouvrent.
  const enveloppe2 = chiffrement.chiffrer(zipSource, PHRASE, manifesteJouet());
  verifier('deux chiffrements de la même source diffèrent (sel+IV frais)',
    !enveloppe.equals(enveloppe2));
  verifier('le second se re-déchiffre aussi à l\'identique',
    chiffrement.dechiffrer(enveloppe2, PHRASE).equals(zipSource));
}

// ============================================================
// Famille 2 — 1 octet modifié (ciphertext OU tag) = rejet net.
// ============================================================
function famille2() {
  console.log('\n[2] Un octet modifié (ciphertext ou tag) = rejet net (final lève).');
  const zipSource = zip.creerZipOctets([
    { nom: 'x', contenu: Buffer.from('a'.repeat(500)) }
  ], new Date());
  const enveloppe = chiffrement.chiffrer(zipSource, PHRASE, manifesteJouet());

  // Altérer le DERNIER octet (dans le ciphertext).
  const altCipher = Buffer.from(enveloppe);
  altCipher[altCipher.length - 1] ^= 0xff;
  const r1 = leve(() => chiffrement.dechiffrer(altCipher, PHRASE),
    'altérée');
  verifier('ciphertext modifié → rejet « Phrase incorrecte ou sauvegarde altérée »',
    r1.leve, r1.message ?? '');

  // Altérer un octet du TAG. Le tag suit magic+4+manifeste+sel+iv.
  const { manifesteOctets, sel, iv } = chiffrement.decomposer(enveloppe);
  const offsetTag = chiffrement.MAGIC.length + 4 + manifesteOctets.length
    + sel.length + iv.length;
  const altTag = Buffer.from(enveloppe);
  altTag[offsetTag] ^= 0x01;
  const r2 = leve(() => chiffrement.dechiffrer(altTag, PHRASE), 'altérée');
  verifier('tag GCM modifié → rejet net', r2.leve, r2.message ?? '');

  // Altérer un octet du MANIFESTE clair (AAD) : casse aussi le tag.
  const altAad = Buffer.from(enveloppe);
  altAad[chiffrement.MAGIC.length + 4 + 10] ^= 0x01; // dans le corps du manifeste
  const r3 = leve(() => chiffrement.dechiffrer(altAad, PHRASE), 'altérée');
  verifier('manifeste clair (AAD) modifié → rejet net', r3.leve, r3.message ?? '');
}

// ============================================================
// Famille 3 — phrase fausse = rejet.
// ============================================================
function famille3() {
  console.log('\n[3] Phrase fausse = rejet.');
  const zipSource = zip.creerZipOctets([
    { nom: 'y', contenu: Buffer.from('données') }
  ], new Date());
  const enveloppe = chiffrement.chiffrer(zipSource, PHRASE, manifesteJouet());
  const r = leve(() => chiffrement.dechiffrer(enveloppe, MAUVAISE),
    'Phrase incorrecte');
  verifier('phrase fausse → rejet « Phrase incorrecte ou sauvegarde altérée »',
    r.leve, r.message ?? '');
  const rVide = leve(() => chiffrement.dechiffrer(enveloppe, ''),
    'aucune phrase');
  verifier('phrase vide → rejet clair', rVide.leve, rVide.message ?? '');
  // La bonne phrase, elle, ouvre.
  verifier('la bonne phrase ouvre toujours',
    chiffrement.dechiffrer(enveloppe, PHRASE).equals(zipSource));
}

// ============================================================
// Famille 4 — lireManifesteClair lit le manifeste SANS la phrase.
// ============================================================
function famille4() {
  console.log('\n[4] lireManifesteClair lit le manifeste SANS la phrase.');
  const man = manifesteJouet(7);
  const enveloppe = chiffrement.chiffrer(
    Buffer.from('peu-importe'), PHRASE, man);
  const lu = chiffrement.lireManifesteClair(enveloppe);
  verifier('manifeste lu sans phrase : type conservé',
    lu.type === 'ARCHIVE', JSON.stringify(lu.type));
  verifier('manifeste lu sans phrase : compteurs visibles (mouvementsValides)',
    lu.compteurs.mouvementsValides === 7, String(lu.compteurs.mouvementsValides));
  verifier('manifeste lu sans phrase : horodatage visible',
    typeof lu.horodatage === 'string' && lu.horodatage === man.horodatage);
  verifier('manifeste lu sans phrase : indice non secret visible',
    lu.chiffrement.indice === 'coffre bureau');
  verifier('manifeste lu sans phrase : chiffrement.actif = true',
    lu.chiffrement.actif === true);
}

// ============================================================
// Famille 5 — la re-vérification refuse d'annoncer OK si non ré-ouvrable.
// ============================================================
function famille5() {
  console.log('\n[5] La re-vérification refuse d\'annoncer OK si non ré-ouvrable.');
  // Cas 1 : le déchiffreur de vérification rend un contenu NON conforme (bit
  // pour bit) → la comparaison de chiffrer() doit LEVER (aucun OK annoncé).
  const r1 = leve(
    () => chiffrement.chiffrer(Buffer.from('vrai-zip'), PHRASE, manifesteJouet(),
      { _reDechiffrer: () => Buffer.from('contenu-faux-non-conforme') }),
    'ne correspond pas');
  verifier('re-déchiffrement non conforme → chiffrer() LÈVE (aucun OK annoncé)',
    r1.leve, r1.message ?? '');

  // Cas 2 : le déchiffreur de vérification LÈVE (phrase du produit inutilisable)
  // → chiffrer() doit LEVER aussi (parade « phrase perdue = données perdues »).
  const r2 = leve(
    () => chiffrement.chiffrer(Buffer.from('z'), PHRASE, manifesteJouet(),
      { _reDechiffrer: () => { throw new Error('tag KO simulé'); } }),
    'ne se');
  verifier('re-déchiffrement qui échoue → chiffrer() LÈVE (parade phrase-perdue)',
    r2.leve, r2.message ?? '');

  // Contrôle POSITIF : sans sabotage, chiffrer réussit ET la re-vérification a
  // bien tourné (le rendu réel est ré-ouvrable bit-pour-bit).
  const env = chiffrement.chiffrer(Buffer.from('ok'), PHRASE, manifesteJouet());
  verifier('sans sabotage : chiffrer réussit et rend un chiffré ré-ouvrable',
    chiffrement.dechiffrer(env, PHRASE).equals(Buffer.from('ok')));
}

// ============================================================
// Famille 6 — BOUT EN BOUT (sauvegarder chiffré → lister → tester → restaurer).
// ============================================================
function famille6() {
  console.log('\n[6] Bout en bout : sauvegarder chiffré → lister → tester → restaurer.');
  const { racine, chemin } = ouvrirBaseJetable('e42-e2e-');
  try {
    peupler();

    // --- Politique audit-proof : phrase de sauvegarde ≥ 14 caractères ---
    // (13 caractères : refusé AVANT tout effet ; le seuil ne vaut qu'à la
    // création — restaurer/tester une ancienne sauvegarde n'y est pas soumis.)
    verifier('une phrase de sauvegarde de 13 caractères est refusée à la création',
      leve(() => sauvegarde.sauvegarderArchive(
        { chiffrer: true, phrase: 'treize-carac.' })).leve);
    verifier('… avec un message qui parle de longueur',
      /trop courte/.test(leve(() => sauvegarde.sauvegarderArchive(
        { chiffrer: true, phrase: 'treize-carac.' })).message));

    // --- Sauvegarder une ARCHIVE CHIFFRÉE (phrase conforme, 23 caractères) ---
    const produit = sauvegarde.sauvegarderArchive({
      chiffrer: true, phrase: PHRASE, indice: 'coffre bureau + initiales'
    });
    verifier('sauvegarde chiffrée : chemin en « .zip.chiffre »',
      produit.chemin.endsWith('.zip.chiffre'), produit.chemin);
    verifier('sauvegarde chiffrée : drapeau chiffre=true retourné',
      produit.chiffre === true);
    verifier('sauvegarde chiffrée : le fichier écrit est bien une enveloppe (magic)',
      chiffrement.estEnveloppeChiffree(readFileSync(produit.chemin)));
    verifier('sauvegarde chiffrée : le fichier n\'est PAS un ZIP clair lisible',
      leve(() => zip.lireEntree(produit.chemin, 'manifeste.json')).leve);
    verifier('sauvegarde chiffrée : manifeste porte chiffrement.actif=true',
      produit.manifeste.chiffrement.actif === true);
    verifier('sauvegarde chiffrée : indice non secret consigné',
      produit.manifeste.chiffrement.indice === 'coffre bureau + initiales');

    // --- listerSauvegardes : chiffre:true + compteurs SANS la phrase ---
    const liste = sauvegarde.listerSauvegardes();
    const entree = liste.find((e) => e.chemin === produit.chemin);
    verifier('lister : l\'archive chiffrée apparaît', !!entree);
    verifier('lister : marquée chiffre:true', entree && entree.chiffre === true);
    verifier('lister : valide=true (manifeste clair relu sans phrase)',
      entree && entree.valide === true, entree && entree.erreur);
    verifier('lister : compteurs visibles sans phrase (2 mvts validés)',
      entree && entree.compteurs.mouvementsValides === 2,
      entree && String(entree.compteurs.mouvementsValides));
    verifier('lister : horodatage visible sans phrase',
      entree && typeof entree.horodatage === 'string');

    // --- testerSauvegarde : bonne phrase = VERT ---
    const testBon = restauration.testerSauvegarde(produit.chemin, { phrase: PHRASE });
    verifier('tester (bonne phrase) : verdict VERT',
      testBon.verdict === 'VERT', testBon.motif ?? '');
    verifier('tester (bonne phrase) : type ARCHIVE',
      testBon.type === 'ARCHIVE');

    // --- testerSauvegarde : mauvaise phrase = ROUGE (rejet propre) ---
    const testMauvais = restauration.testerSauvegarde(produit.chemin, { phrase: MAUVAISE });
    verifier('tester (mauvaise phrase) : verdict ROUGE',
      testMauvais.verdict === 'ROUGE', testMauvais.motif ?? '');
    verifier('tester (mauvaise phrase) : motif « Phrase incorrecte ou … altérée »',
      /Phrase incorrecte ou sauvegarde altérée/.test(testMauvais.motif ?? ''),
      testMauvais.motif ?? '');

    // --- testerSauvegarde : SANS phrase sur un chiffré = ROUGE ---
    const testSans = restauration.testerSauvegarde(produit.chemin, {});
    verifier('tester (sans phrase) sur un chiffré : verdict ROUGE',
      testSans.verdict === 'ROUGE', testSans.motif ?? '');
    verifier('tester (sans phrase) : motif « chiffrée : une phrase est requise »',
      /chiffrée.*phrase est requise/.test(testSans.motif ?? ''),
      testSans.motif ?? '');

    // Empreinte de la base vive AVANT toute tentative de restauration.
    const shaAvant = sha256(readFileSync(chemin));

    // --- restaurer : MAUVAISE phrase = REFUS sans toucher la base vive ---
    const rMauvais = leve(
      () => restauration.restaurer(produit.chemin, { phrase: MAUVAISE }),
      'Phrase incorrecte');
    verifier('restaurer (mauvaise phrase) : LÈVE « Phrase incorrecte ou … altérée »',
      rMauvais.leve, rMauvais.message ?? '');
    verifier('restaurer (mauvaise phrase) : base vive INTACTE (sha inchangé)',
      sha256(readFileSync(chemin)) === shaAvant);
    verifier('restaurer (mauvaise phrase) : base toujours ouverte et fonctionnelle',
      db.estOuverte()
        && db.ouvrir().prepare('SELECT count(*) AS n FROM mouvements').get().n === 2);

    // --- restaurer : SANS phrase sur un chiffré = REFUS clair ---
    const rSans = leve(
      () => restauration.restaurer(produit.chemin, {}),
      'phrase est requise');
    verifier('restaurer (sans phrase) sur un chiffré : REFUS clair',
      rSans.leve, rSans.message ?? '');
    verifier('restaurer (sans phrase) : base vive toujours intacte',
      sha256(readFileSync(chemin)) === shaAvant);

    // --- Ajouter une écriture APRÈS la sauvegarde, pour prouver que restaurer
    //     ramène BIEN à l'état de l'archive (perte assumée via confirmePerte) ---
    const enseignant = api.appeler('createPersonne', {
      donneesPersonne: { nom: 'Après', prenom: 'Sauvegarde',
        typePersonne: 'ENSEIGNANT', roleApp: 'ENSEIGNANT' }
    }, CONTEXTE);
    verifier('la base vive a bien 3 personnes après ajout',
      db.ouvrir().prepare('SELECT count(*) AS n FROM personnel').get().n === 3);

    // --- restaurer : BONNE phrase = état restauré fidèle ---
    const rBon = restauration.restaurer(produit.chemin, {
      phrase: PHRASE, confirmePerte: true
    });
    verifier('restaurer (bonne phrase) : verdict VERT',
      rBon.verdict === 'VERT', rBon.motif ?? '');
    verifier('restaurer (bonne phrase) : ok=true', rBon.ok === true);
    // La base restaurée reflète l'archive : la personne ajoutée APRÈS a disparu.
    verifier('restaurer (bonne phrase) : état de l\'archive rétabli (2 personnes)',
      db.ouvrir().prepare('SELECT count(*) AS n FROM personnel').get().n === 2,
      String(db.ouvrir().prepare('SELECT count(*) AS n FROM personnel').get().n));
    verifier('restaurer (bonne phrase) : 2 mouvements validés rétablis',
      db.ouvrir().prepare(
        "SELECT count(*) AS n FROM mouvements WHERE statut IN ('VALIDE','ANNULE')")
        .get().n === 2);
    // La pièce jointe est là (documents restaurés).
    verifier('restaurer (bonne phrase) : la pièce jointe est rétablie',
      db.ouvrir().prepare('SELECT count(*) AS n FROM pieces_jointes').get().n === 1);
    // Un filet de sécurité a été créé (état AVANT restauration), en CLAIR.
    verifier('restaurer (bonne phrase) : filet de sécurité conservé',
      typeof rBon.cheminFiletSecurite === 'string'
        && existsSync(rBon.cheminFiletSecurite));

    // --- SNAPSHOT chiffré aussi (base seule) ---
    const snap = sauvegarde.sauvegarderSnapshot({ chiffrer: true, phrase: PHRASE });
    verifier('snapshot chiffré : « .zip.chiffre »',
      snap.chemin.endsWith('.zip.chiffre'), snap.chemin);
    verifier('snapshot chiffré : testerSauvegarde bonne phrase = VERT',
      restauration.testerSauvegarde(snap.chemin, { phrase: PHRASE }).verdict === 'VERT');

    // --- Contrôle de non-régression E4.1 : une sauvegarde CLAIRE marche encore ---
    const clair = sauvegarde.sauvegarderArchive({});
    verifier('sauvegarde claire (non chiffrée) : « .zip » simple',
      clair.chemin.endsWith('.zip') && !clair.chemin.endsWith('.zip.chiffre'));
    verifier('sauvegarde claire : lister la marque chiffre:false',
      sauvegarde.listerSauvegardes()
        .find((e) => e.chemin === clair.chemin)?.chiffre === false);
    verifier('sauvegarde claire : testerSauvegarde sans phrase = VERT',
      restauration.testerSauvegarde(clair.chemin, {}).verdict === 'VERT');
    verifier('sauvegarde claire : restaurer sans phrase = VERT',
      restauration.restaurer(clair.chemin, { confirmePerte: true }).verdict === 'VERT');
  } finally {
    nettoyer(racine);
  }
}

// ============================================================
// Exécution.
// ============================================================
console.log('Preuve du chiffrement E4.2 (AES-256-GCM) — base jetable, os.tmpdir.');

const familles = [famille1, famille2, famille3, famille4, famille5, famille6];
for (const f of familles) {
  try {
    f();
  } catch (erreur) {
    nbEchecs += 1;
    echecs.push(`${f.name} a levé : ${erreur.message}`);
    console.error(`ÉCHEC ${f.name} a levé une exception : ${erreur.stack}`);
  }
}

console.log('');
if (nbEchecs === 0) {
  console.log(`${nbOk} vérifications réussies, 0 échec(s).`);
  console.log('Chiffrement E4.2 : les 6 familles sont vertes.');
  process.exit(0);
} else {
  console.error(`${nbOk} réussies, ${nbEchecs} ÉCHEC(S) :`);
  for (const e of echecs) console.error(`  - ${e}`);
  process.exit(1);
}
