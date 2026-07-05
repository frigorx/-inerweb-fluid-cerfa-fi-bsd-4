// ============================================================
// inerWeb Fluide — PREUVE du coffre-fort E4.1 (6 familles)
// Exécution : node server/test-sauvegarde.mjs
//
// « server/test-sauvegarde.mjs prouve la non-perte ET la réversibilité sur
// base JETABLE avant tout commit » (docs/E4-PLAN §Stratégie de test).
//
// RÈGLES DE SÛRETÉ DU TEST :
//   - base TOUJOURS jetable, sous os.tmpdir() (JAMAIS le data/ réel) ;
//   - la base jetable vit dans <mkdtemp>/data/inerweb-fluide.db pour que
//     backups/ (frère de data/) reste sous la racine temporaire jetable ;
//   - chaque famille construit SON monde puis nettoie sa racine temp.
//
// Les 6 familles (E4-PLAN) :
//   1. Aller-retour identique (compteurs concordent, chaînes vertes, sha256
//      base restaurée === manifeste, chaque PJ relue par son hash).
//   2. Archive corrompue refusée AVANT écrasement (base courante INTACTE).
//   3. Coupure = base cohérente : exception injectée à CHAQUE étape → reprise
//      → base finale = ancienne ENTIÈRE ou nouvelle ENTIÈRE, jamais hybride.
//   4. Sauvegarde de sécurité + rollback : vérif post forcée au rouge → l'état
//      d'avant est restauré (le filet existe et est rejoué).
//   5. Les 3 vérifications détectent (integrity / foreign_key / chaîne) →
//      testerSauvegarde ROUGE avec le bon motif, base courante intacte.
//   6. .partiel purgés : un .partiel + un tmp/*.db orphelins → purgerPartiels.
//
// Node ≥ 22 (node:sqlite), sans DOM.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync,
  readdirSync, statSync, mkdirSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const api = require('./api.js');
const sauvegarde = require('./sauvegarde.js');
const restauration = require('./restauration.js');
const zip = require('./zip-node.js');
const { verifierIntegrite } = require('./verification.js');

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

/** Exécute `fn` et renvoie true si elle LÈVE (avec message contenant extrait). */
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

// ------------------------------------------------------------
// Construction d'une base JETABLE peuplée par de VRAIES mutations api.js
// (le vrai chemin serveur : chaîne de hash réelle, effets stocks réels).
// Retourne { racine, chemin } ; la base est OUVERTE (singleton) au retour.
// ------------------------------------------------------------

/** Ouvre une base jetable neuve sous <mkdtemp>/data/ et renvoie ses chemins. */
function ouvrirBaseJetable(prefixe = 'e4-') {
  const racine = mkdtempSync(join(tmpdir(), `inerweb-fluide-${prefixe}`));
  const dossierData = join(racine, 'data');
  mkdirSync(dossierData, { recursive: true });
  const chemin = join(dossierData, 'inerweb-fluide.db');
  db.ouvrir(chemin);
  api.appeler('init', {}, CONTEXTE);
  return { racine, chemin };
}

/** 1×1 pixel PNG (contenu binaire réaliste pour une pièce jointe). */
function pngMinuscule() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk' +
    'YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
}

/**
 * Peuple la base ouverte : personnel (référent + valideur), client, machine,
 * bouteille, DEUX mouvements validés (chaîne de hash non triviale) et UNE
 * pièce jointe. Renvoie de quoi vérifier ensuite (compteurs attendus).
 */
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

  // Mouvement 1 : charge d'appoint (2 kg), validé → scellé.
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

  // Mouvement 2 : seconde charge d'appoint (1 kg), validé → chaîne à 2 maillons.
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
  const octetsPj = pngMinuscule();
  const pj = api.appeler('ajouterPieceJointe', {
    donneesPj: {
      entiteType: 'MACHINE', entiteId: machine.id,
      nomFichier: 'plaque.png', mimeType: 'image/png',
      categorie: 'AUTRE', base64: octetsPj.toString('base64'),
      ajoutePar: referent.id
    }
  }, CONTEXTE);

  return {
    referent, enseignant, client, machine, bouteille, mvt1, mvt2, pj,
    hashPj: createHash('sha256').update(octetsPj).digest('hex')
  };
}

/** Compteurs bruts de la base ouverte (pour comparaison directe). */
function compteurs() {
  const instance = db.ouvrir();
  const un = (sql) => instance.prepare(sql).get().n;
  return {
    machines: un('SELECT count(*) AS n FROM machines'),
    bouteilles: un('SELECT count(*) AS n FROM bouteilles'),
    mouvements: un('SELECT count(*) AS n FROM mouvements'),
    mouvementsValides: un(
      "SELECT count(*) AS n FROM mouvements WHERE statut IN ('VALIDE','ANNULE')"),
    documents: un('SELECT count(*) AS n FROM pieces_jointes'),
    entreesJournal: un('SELECT count(*) AS n FROM journal_audit')
  };
}

/** sha256 hexadécimal d'un fichier. */
function sha256Fichier(chemin) {
  return createHash('sha256').update(readFileSync(chemin)).digest('hex');
}

/** Ferme la base et efface toute la racine temp d'une famille. */
function nettoyer(racine) {
  try { db.fermer(); } catch { /* déjà fermée */ }
  try { rmSync(racine, { recursive: true, force: true }); } catch { /* best-effort */ }
}

// ============================================================
// FAMILLE 1 — Aller-retour identique.
// ============================================================
function famille1() {
  console.log('\n=== Famille 1 — aller-retour identique ===');
  const { racine } = ouvrirBaseJetable('f1-');
  try {
    const monde = peupler();
    const avant = compteurs();
    verifier('préparation : 2 mouvements validés + 1 PJ',
      avant.mouvementsValides === 2 && avant.documents === 1);

    // Instantané métier AVANT (le référentiel de fidélité).
    const mouvementsAvant = api.appeler('getMouvements', {}, CONTEXTE);
    const machinesAvant = api.appeler('getMachines', {}, CONTEXTE);
    const bouteillesAvant = api.appeler('getBouteilles', {}, CONTEXTE);

    // Produire une ARCHIVE (base + documents + config + manifeste).
    const produit = sauvegarde.sauvegarderArchive();
    verifier('sauvegarderArchive : fichier .zip créé',
      existsSync(produit.chemin) && produit.chemin.endsWith('.zip'));
    verifier('manifeste : compteurs figés cohérents avec la base',
      produit.manifeste.compteurs.mouvementsValides === 2
      && produit.manifeste.compteurs.documents === 1);
    verifier('manifeste : type ARCHIVE, chaînes vertes',
      produit.manifeste.type === 'ARCHIVE'
      && produit.manifeste.integrite.chaineRegistreOk === true
      && produit.manifeste.integrite.chaineJournalOk === true);

    // Le PIVOT sha256 : la base DANS l'archive a bien l'empreinte annoncée
    // par son manifeste (c'est cette empreinte que la restauration revérifie
    // AVANT tout écrasement). On l'extrait et on la hache.
    const dossierExtrait = mkdtempSync(join(tmpdir(), 'inerweb-fluide-f1x-'));
    try {
      const ecrites = zip.extraireVers(produit.chemin, dossierExtrait);
      const baseArchive = ecrites.find(
        (e) => e.nom === 'base/inerweb-fluide.db').chemin;
      verifier('sha256 de la base archivée === manifeste (pivot pré-écrasement)',
        sha256Fichier(baseArchive) === produit.manifeste.base.sha256);
    } finally {
      rmSync(dossierExtrait, { recursive: true, force: true });
    }

    // testerSauvegarde confirme le même pivot + les 3 vérifs, sans toucher
    // la base courante (contrôle croisé de la fidélité de l'archive).
    const test = restauration.testerSauvegarde(produit.chemin);
    verifier('testerSauvegarde : archive de l’aller = VERT',
      test.verdict === 'VERT', JSON.stringify(test));

    // Restaurer par-dessus la MÊME base (aller-retour). Pas de régression
    // (mêmes compteurs) → confirmePerte inutile.
    const resultat = restauration.restaurer(produit.chemin);
    verifier('restaurer : verdict VERT', resultat.verdict === 'VERT' && resultat.ok);
    verifier('restaurer : filet de sécurité créé et conservé',
      existsSync(resultat.cheminFiletSecurite));

    // Compteurs MÉTIER identiques après aller-retour (le journal gagne UNE
    // entrée RESTAURATION — traçabilité voulue par E4-PLAN étape 6 : la
    // chaîne reste verte, aucune donnée métier n'est perdue).
    const apres = compteurs();
    const clesMetier = ['machines', 'bouteilles', 'mouvements',
      'mouvementsValides', 'documents'];
    verifier('compteurs métier identiques après aller-retour',
      clesMetier.every((c) => apres[c] === avant[c]),
      `${JSON.stringify(apres)} vs ${JSON.stringify(avant)}`);
    verifier('journal : +1 entrée RESTAURATION (traçabilité, rien de perdu)',
      apres.entreesJournal === avant.entreesJournal + 1,
      `${apres.entreesJournal} vs ${avant.entreesJournal}`);
    const derniere = api.appeler('getJournalAudit', {}, CONTEXTE).at(-1);
    verifier('journal : la dernière entrée est bien RESTAURATION',
      derniere.action === 'RESTAURATION', JSON.stringify(derniere));

    // Fidélité métier : les mouvements/machines/bouteilles sont identiques.
    const mouvementsApres = api.appeler('getMouvements', {}, CONTEXTE);
    verifier('mouvements identiques après restauration',
      JSON.stringify(mouvementsApres) === JSON.stringify(mouvementsAvant));
    verifier('machines identiques après restauration',
      JSON.stringify(api.appeler('getMachines', {}, CONTEXTE))
        === JSON.stringify(machinesAvant));
    verifier('bouteilles identiques après restauration',
      JSON.stringify(api.appeler('getBouteilles', {}, CONTEXTE))
        === JSON.stringify(bouteillesAvant));

    // Chaînes vertes sur la base vive restaurée.
    const etat = api.appeler('getEtatRegistre', {}, CONTEXTE);
    verifier('base restaurée : registre + journal NON altérés',
      etat.altere === false, JSON.stringify(etat));

    // Chaque PJ relue par son hash (contenu identique bit pour bit).
    const relue = api.appeler('obtenirPieceJointe', { id: monde.pj.id }, CONTEXTE);
    const hashRelu = createHash('sha256')
      .update(Buffer.from(relue.blob, 'base64')).digest('hex');
    verifier('PJ relue après restauration : hash identique',
      hashRelu === monde.hashPj);
  } finally {
    nettoyer(racine);
  }
}

// ============================================================
// FAMILLE 2 — Archive corrompue refusée AVANT écrasement.
// ============================================================
function famille2() {
  console.log('\n=== Famille 2 — archive corrompue refusée AVANT écrasement ===');
  const { racine } = ouvrirBaseJetable('f2-');
  try {
    peupler();
    const produit = sauvegarde.sauvegarderArchive();

    // Empreinte de la base VIVE AVANT toute tentative (le témoin d'intégrité).
    const cheminVif = db.cheminOuvert();
    db.fermer();
    const shaAvant = sha256Fichier(cheminVif);
    db.ouvrir(cheminVif);

    // Corrompre 1 octet du CONTENU de la base DANS l'archive (au-delà des
    // en-têtes ZIP, dans la charge utile de base/inerweb-fluide.db).
    const cheminCorrompu = join(racine, 'archive-corrompue.zip');
    const octets = readFileSync(produit.chemin);
    // Cibler un octet vers le milieu du fichier (charge utile de la base).
    const cible = Math.floor(octets.length / 2);
    octets[cible] = octets[cible] ^ 0xff;
    writeFileSync(cheminCorrompu, octets);

    // La restauration DOIT échouer (CRC-32 ou sha256), base vive INTACTE.
    const r = leve(() => restauration.restaurer(cheminCorrompu));
    verifier('restaurer refuse une archive corrompue (exception)', r.leve, r.message);

    // Base vive INCHANGÉE : même sha256 qu'avant la tentative.
    const cheminVif2 = db.cheminOuvert();
    verifier('base vive toujours ouverte après le refus', db.estOuverte());
    db.fermer();
    verifier('base vive INTACTE : sha256 inchangé avant/après tentative',
      sha256Fichier(cheminVif2) === shaAvant);
    db.ouvrir(cheminVif2);

    // Les chaînes de la base vive restent vertes.
    const etat = api.appeler('getEtatRegistre', {}, CONTEXTE);
    verifier('base vive : intégrité intacte après refus',
      etat.altere === false);

    // Variante : un ZIP sans manifeste est aussi refusé avant tout effet.
    const cheminSansManifeste = join(racine, 'sans-manifeste.zip');
    writeFileSync(cheminSansManifeste,
      zip.creerZipOctets([{ nom: 'autre.txt', contenu: 'rien' }]));
    const r2 = leve(() => restauration.restaurer(cheminSansManifeste),
      'manifeste');
    verifier('restaurer refuse un ZIP sans manifeste', r2.leve, r2.message);
  } finally {
    nettoyer(racine);
  }
}

// ============================================================
// FAMILLE 3 — Coupure = base cohérente (jamais hybride), reprise OK.
// ============================================================
function famille3() {
  console.log('\n=== Famille 3 — coupure à chaque étape = base cohérente ===');

  // Les étapes d'injection couvrent AVANT et PENDANT la bascule.
  const etapes = [
    'extraction-verifiee', // avant filet : base vive intacte, ancienne reste
    'filet-cree',          // filet écrit, bascule pas commencée
    'fermeture',           // base fermée, rien basculé
    'purge-wal',           // wal purgé, rien basculé
    'ancienne-sortie',     // ancienne sortie du chemin (état "rien")
    'nouvelle-posee',      // nouvelle posée, documents pas encore
    'documents-bascules',  // tout basculé, avant réouverture/vérif
    'reouverture'          // base rouverte, avant vérif finale
  ];

  for (const etape of etapes) {
    const { racine, chemin } = ouvrirBaseJetable('f3-');
    let mvValidesAvant = 0;
    try {
      const monde = peupler();
      mvValidesAvant = compteurs().mouvementsValides;
      const produit = sauvegarde.sauvegarderArchive();

      // Injecter une exception APRÈS l'étape nommée.
      const r = leve(() => restauration.restaurer(produit.chemin, {
        _interrompreApres: (nom) => {
          if (nom === etape) {
            throw new Error(`COUPURE simulée après ${nom}`);
          }
        }
      }));
      verifier(`[${etape}] la coupure interrompt bien la restauration`,
        r.leve, r.message);

      // SIMULER un redémarrage : fermer le singleton (comme un process qui
      // meurt), puis lancer la reprise au démarrage sur le MÊME chemin,
      // AVANT toute réouverture.
      try { db.fermer(); } catch { /* peut déjà être fermée */ }
      // Purge défensive d'un -wal résiduel de la base d'origine (le vrai
      // démarrage le fait aussi via effacerWalShm dans la reprise).
      const reprise = restauration.reprendreRestaurationInterrompue(chemin);

      // Après reprise : la base doit exister et être ENTIÈRE + saine.
      verifier(`[${etape}] après reprise : la base vive existe`,
        existsSync(chemin), `action=${reprise.action}`);

      db.ouvrir(chemin);
      const etat = api.appeler('getEtatRegistre', {}, CONTEXTE);
      verifier(`[${etape}] base cohérente (jamais hybride) après reprise`,
        etat.altere === false, JSON.stringify(etat));

      // La base finale = ancienne ENTIÈRE ou nouvelle ENTIÈRE : dans cet
      // aller-retour les deux ont les MÊMES 2 mouvements validés. On vérifie
      // qu'aucune écriture n'a été perdue ni dupliquée.
      const apres = compteurs().mouvementsValides;
      verifier(`[${etape}] aucune écriture perdue (${apres} = ${mvValidesAvant})`,
        apres === mvValidesAvant);

      // Aucune trace résiduelle de bascule (zone nettoyée par la reprise, sauf
      // cas inexploitable — jamais ici puisque la base est saine).
      verifier(`[${etape}] zone de restauration nettoyée`,
        !existsSync(join(dirname(chemin), 'restauration-en-cours')),
        `action=${reprise.action}`);

      // La PIÈCE JOINTE doit rester relisible et fidèle après reprise : c'est
      // la preuve que les documents restent COHÉRENTS avec la base (y compris
      // dans la fenêtre "base posée, documents pas encore basculés").
      const relue = api.appeler('obtenirPieceJointe', { id: monde.pj.id }, CONTEXTE);
      const hashRelu = createHash('sha256')
        .update(Buffer.from(relue.blob, 'base64')).digest('hex');
      verifier(`[${etape}] PJ relisible et fidèle après reprise (documents cohérents)`,
        hashRelu === monde.hashPj);
    } finally {
      nettoyer(racine);
    }
  }
}

// ============================================================
// FAMILLE 4 — Sauvegarde de sécurité + rollback.
// ============================================================
function famille4() {
  console.log('\n=== Famille 4 — sauvegarde de sécurité + rollback ===');
  const { racine } = ouvrirBaseJetable('f4-');
  try {
    const monde = peupler();

    // Une archive SAINE de l'état courant.
    const produit = sauvegarde.sauvegarderArchive();

    // Ajouter APRÈS coup un 3e mouvement validé : la base vive a maintenant
    // PLUS d'écritures que l'archive (restaurer = régression volontaire).
    const mvt3 = api.appeler('creerMouvement', {
      donneesMouvement: {
        type: 'CHARGE_APPOINT', machineId: monde.machine.id,
        bouteilleSrcId: monde.bouteille.id,
        peseeAvantKg: 27, peseeApresKg: 26.5, technicien: 'Testeur',
        causeMouvement: 'Charge de preuve n°3 (après archive)'
      }
    }, CONTEXTE);
    api.appeler('soumettreMouvement', { id: mvt3.id }, CONTEXTE);
    api.appeler('validerMouvement',
      { id: mvt3.id, validateurId: monde.enseignant.id }, CONTEXTE);
    // État d'AVANT restauration (la référence à retrouver après rollback).
    const avantRestauration = compteurs();
    verifier('préparation : base vive à 3 écritures figées',
      avantRestauration.mouvementsValides === 3);

    // Restaurer l'archive à 2 écritures FORCE un verdict ROUGE post-bascule :
    // le rollback doit rejouer le filet et rétablir l'état d'AVANT le rollback
    // (donc les 3 écritures). confirmePerte requis (régression 3 → 2).
    let appelsVerdict = 0;
    const resultat = restauration.restaurer(produit.chemin, {
      confirmePerte: true,
      _forcerVerdictVif: (v) => {
        appelsVerdict += 1;
        // Forcer ROUGE UNIQUEMENT au premier appel (la base restaurée), pas
        // pendant le rollback (2e appel = le filet, qui doit rester VERT).
        if (appelsVerdict === 1) {
          return { ok: false, details: v.details };
        }
        return v;
      }
    });

    verifier('restaurer : verdict ROUGE (vérif post forcée)',
      resultat.verdict === 'ROUGE' && resultat.ok === false);
    verifier('restaurer : rollback signalé',
      resultat.rollback === true);
    verifier('restaurer : filet de sécurité existe',
      existsSync(resultat.cheminFiletSecurite));

    // Après rollback : l'état d'AVANT restauration est restauré = les 3
    // écritures figées (le filet a capturé l'état à 3, avant la bascule).
    const apres = compteurs();
    verifier('rollback : état d’avant restauré (3 écritures figées)',
      apres.mouvementsValides === 3,
      `${apres.mouvementsValides} au lieu de 3`);
    // Comparaison DÉTERMINISTE hors journal (le journal gagne des entrées
    // SAUVEGARDE/RESTAURATION pendant le processus : volatil, jamais perdu).
    const cles = ['machines', 'bouteilles', 'mouvements',
      'mouvementsValides', 'documents'];
    const identiquesHorsJournal = cles.every(
      (c) => apres[c] === avantRestauration[c]);
    verifier('rollback : compteurs (hors journal) = état d’avant restauration',
      identiquesHorsJournal,
      `${JSON.stringify(apres)} vs ${JSON.stringify(avantRestauration)}`);
    verifier('rollback : le journal n’a rien PERDU (append-only)',
      apres.entreesJournal >= avantRestauration.entreesJournal);

    // Intégrité verte après rollback.
    const etat = api.appeler('getEtatRegistre', {}, CONTEXTE);
    verifier('rollback : base intègre (chaînes vertes)',
      etat.altere === false, JSON.stringify(etat));

    // Zone de restauration nettoyée.
    verifier('rollback : zone de restauration nettoyée',
      !existsSync(restauration.dossierRestaurationEnCours()));
  } finally {
    nettoyer(racine);
  }
}

// ============================================================
// FAMILLE 5 — Les 3 vérifications détectent une base corrompue.
// ============================================================
function famille5() {
  console.log('\n=== Famille 5 — les 3 vérifications détectent une base corrompue ===');

  // 5a. integrity_check KO — fichier .db physiquement charcuté dans l'archive.
  {
    const { racine } = ouvrirBaseJetable('f5a-');
    try {
      peupler();
      const produit = sauvegarde.sauvegarderArchive();
      const shaAvant = shaBaseVive();

      // testerSauvegarde sur une archive dont la base est charcutée en
      // profondeur : integrity_check doit tomber (ou la garde sha256, qui
      // protège tout autant — le test accepte les deux motifs, la base vive
      // n'est de toute façon jamais touchée).
      const cheminKo = fabriquerArchiveBaseModifiee(produit.chemin, racine,
        (octetsDb) => {
          // Écraser une large plage au cœur du fichier (pages SQLite).
          for (let i = 400; i < 900 && i < octetsDb.length; i += 1) {
            octetsDb[i] = 0x00;
          }
          return octetsDb;
        });
      const verdict = restauration.testerSauvegarde(cheminKo);
      verifier('testerSauvegarde : archive à base charcutée = ROUGE',
        verdict.verdict === 'ROUGE', JSON.stringify(verdict));
      verifier('testerSauvegarde : motif renseigné', !!verdict.motif);
      verifier('testerSauvegarde : base courante INTACTE',
        shaBaseVive() === shaAvant);
    } finally {
      nettoyer(racine);
    }
  }

  // 5b. Chaîne du registre KO — on casse une empreinte dans la base extraite.
  {
    const { racine } = ouvrirBaseJetable('f5b-');
    try {
      peupler();
      const produit = sauvegarde.sauvegarderArchive();
      const shaAvant = shaBaseVive();

      // Reconstruire une archive dont la base a une empreinte de mouvement
      // altérée (chaîne rompue) — via une base extraite modifiée par SQL.
      const cheminKo = fabriquerArchiveBaseSql(produit.chemin, racine,
        (instance) => {
          // Sur la COPIE jetable, retirer les gardes WORM (elles protègent la
          // base VIVE ; ici on FORGE volontairement une corruption pour
          // prouver que les 3 vérifications la détectent). Un attaquant réel
          // ferait de même hors application : c'est exactement le cas à couvrir.
          instance.exec(
            'DROP TRIGGER IF EXISTS mouvements_interdire_modification_validee');
          instance.exec(
            'DROP TRIGGER IF EXISTS mouvements_interdire_modification_annulee');
          // Altérer le hash_ecriture du dernier mouvement validé.
          instance.exec(
            "UPDATE mouvements SET hash_ecriture = " +
            "'0000000000000000000000000000000000000000000000000000000000000000' " +
            "WHERE ordre_validation = (SELECT max(ordre_validation) FROM mouvements)");
        });
      const verdict = restauration.testerSauvegarde(cheminKo);
      verifier('testerSauvegarde : chaîne registre rompue = ROUGE',
        verdict.verdict === 'ROUGE', JSON.stringify(verdict));
      verifier('testerSauvegarde : motif mentionne le registre',
        /registre/i.test(verdict.motif ?? ''), verdict.motif ?? '');
      verifier('testerSauvegarde : base courante INTACTE',
        shaBaseVive() === shaAvant);
    } finally {
      nettoyer(racine);
    }
  }

  // 5c. foreign_key_check KO — insérer une ligne orpheline dans la base extraite.
  {
    const { racine } = ouvrirBaseJetable('f5c-');
    try {
      peupler();
      const produit = sauvegarde.sauvegarderArchive();
      const shaAvant = shaBaseVive();

      const cheminKo = fabriquerArchiveBaseSql(produit.chemin, racine,
        (instance) => {
          // Insérer un audit rattaché à un établissement inexistant :
          // foreign_key_check le détecte (clé étrangère orpheline).
          instance.exec('PRAGMA foreign_keys = OFF');
          instance.exec(
            "INSERT INTO audits_etablissement (id, etablissement_id, date_audit, " +
            "organisme, resultat) VALUES ('AUD-ORPHELIN', 'ETB-FANTOME', " +
            "'2026-01-01', 'X', 'CONFORME')");
        });
      const verdict = restauration.testerSauvegarde(cheminKo);
      verifier('testerSauvegarde : clé étrangère orpheline = ROUGE',
        verdict.verdict === 'ROUGE', JSON.stringify(verdict));
      verifier('testerSauvegarde : motif mentionne les clés étrangères',
        /clés? étrangèr/i.test(verdict.motif ?? ''), verdict.motif ?? '');
      verifier('testerSauvegarde : base courante INTACTE',
        shaBaseVive() === shaAvant);
    } finally {
      nettoyer(racine);
    }
  }

  // 5d. Une archive SAINE passe au VERT (contrôle positif) + date inscrite.
  {
    const { racine } = ouvrirBaseJetable('f5d-');
    try {
      peupler();
      const produit = sauvegarde.sauvegarderArchive();
      const verdict = restauration.testerSauvegarde(produit.chemin);
      verifier('testerSauvegarde : archive saine = VERT',
        verdict.verdict === 'VERT', JSON.stringify(verdict));
      const temoin = db.get(
        "SELECT valeur FROM parametres WHERE cle = 'dernier_test_sauvegarde_ok'");
      verifier('testerSauvegarde VERT : date du dernier test OK inscrite',
        !!temoin && /^\d{4}-\d{2}-\d{2}T/.test(temoin.valeur), JSON.stringify(temoin));
    } finally {
      nettoyer(racine);
    }
  }
}

/** sha256 de la base vive (ferme, hache, rouvre — neutre hors écriture). */
function shaBaseVive() {
  const chemin = db.cheminOuvert();
  db.fermer();
  const sha = sha256Fichier(chemin);
  db.ouvrir(chemin);
  return sha;
}

/**
 * Fabrique une archive dérivée en MODIFIANT les octets bruts de la base
 * (base/inerweb-fluide.db) puis en réécrivant un ZIP autour. Le manifeste
 * d'origine est CONSERVÉ tel quel (donc son sha256 ne colle plus : la garde
 * sha256 OU l'intégrité tombera — les deux protègent). Retourne le chemin.
 */
function fabriquerArchiveBaseModifiee(cheminZip, racine, transformer) {
  const { entrees } = zip.lireZip(readFileSync(cheminZip));
  const modifiees = entrees.map((e) => {
    if (e.nom === 'base/inerweb-fluide.db') {
      return { nom: e.nom, contenu: transformer(Buffer.from(e.contenu)) };
    }
    return { nom: e.nom, contenu: e.contenu };
  });
  const cible = join(racine, `derivee-${Math.random().toString(36).slice(2)}.zip`);
  writeFileSync(cible, zip.creerZipOctets(modifiees));
  return cible;
}

/**
 * Fabrique une archive dérivée en ouvrant la base extraite avec une instance
 * DÉDIÉE, en lui appliquant `muterSql` (corruption logique : chaîne, FK…),
 * PUIS en RECALCULANT le manifeste.base.sha256 pour qu'il colle à la base
 * modifiée — ainsi la garde sha256 passe et ce sont bien les 3 VÉRIFICATIONS
 * qui doivent détecter le problème (le cœur de la famille 5).
 */
function fabriquerArchiveBaseSql(cheminZip, racine, muterSql) {
  const dossier = mkdtempSync(join(tmpdir(), 'inerweb-fluide-f5-'));
  try {
    const ecrites = zip.extraireVers(cheminZip, dossier);
    const cheminDb = ecrites.find(
      (e) => e.nom === 'base/inerweb-fluide.db').chemin;

    // Appliquer la corruption logique via une instance dédiée (jamais le
    // singleton). On rouvre en écriture ; la base issue du VACUUM n'a pas de
    // WAL, l'écriture reste locale à ce fichier jetable.
    const instance = new DatabaseSync(cheminDb);
    try {
      instance.exec('PRAGMA foreign_keys = OFF');
      muterSql(instance);
    } finally {
      instance.close();
    }

    // Recalculer le manifeste avec le nouveau sha256 (pour isoler les 3
    // vérifications). On relit le manifeste d'origine et on remplace juste
    // base.sha256 + base.tailleOctets.
    const manifesteOctets = zip.lireEntree(cheminZip, 'manifeste.json');
    const manifeste = JSON.parse(manifesteOctets.toString('utf8'));
    manifeste.base.sha256 = sha256Fichier(cheminDb);
    manifeste.base.tailleOctets = statSync(cheminDb).size;

    // Réassembler le ZIP : manifeste recalculé + base modifiée + le reste.
    const entrees = [
      { nom: 'manifeste.json', contenu: JSON.stringify(manifeste, null, 2) }
    ];
    // Base modifiée.
    entrees.push({
      nom: 'base/inerweb-fluide.db', contenu: readFileSync(cheminDb)
    });
    // Documents + config d'origine (inchangés).
    for (const e of zip.lireZip(readFileSync(cheminZip)).entrees) {
      if (e.nom === 'manifeste.json' || e.nom === 'base/inerweb-fluide.db') {
        continue;
      }
      entrees.push({ nom: e.nom, contenu: e.contenu });
    }
    const cible = join(racine, `sql-${Math.random().toString(36).slice(2)}.zip`);
    writeFileSync(cible, zip.creerZipOctets(entrees));
    return cible;
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

// ============================================================
// FAMILLE 6 — .partiel purgés.
// ============================================================
function famille6() {
  console.log('\n=== Famille 6 — .partiel et tmp orphelins purgés ===');
  const { racine } = ouvrirBaseJetable('f6-');
  try {
    // Une VRAIE sauvegarde d'abord (crée l'arborescence backups/ ET sert de
    // témoin de non-purge). On la fait AVANT de semer les restes : toute
    // sauvegarde purge les .partiel en tête (sauvegarde.js), donc semer
    // APRÈS elle garantit que c'est bien purgerPartiels() qu'on éprouve.
    const bonne = sauvegarde.sauvegarderArchive();

    // Semer des restes d'interruptions : un .partiel dans archives/ et un
    // .db orphelin dans tmp/ (VACUUM coupé), + un .partiel dans snapshots/.
    const archives = sauvegarde.dossierArchives();
    const snapshots = sauvegarde.dossierSnapshots();
    const tmp = sauvegarde.dossierTmp();
    mkdirSync(archives, { recursive: true });
    mkdirSync(snapshots, { recursive: true });
    mkdirSync(tmp, { recursive: true });

    const partielArchive = join(archives, '2026-01-01-1200-archive-abcdef.zip.partiel');
    const partielSnapshot = join(snapshots, '2026-01-01-1200-snapshot-abcdef.zip.partiel');
    const tmpDb = join(tmp, 'vacuum-2026-01-01-1200-abcdef.db');
    const tmpWal = join(tmp, 'vacuum-2026-01-01-1200-abcdef.db-wal');
    writeFileSync(partielArchive, 'partiel');
    writeFileSync(partielSnapshot, 'partiel');
    writeFileSync(tmpDb, 'db-orphelin');
    writeFileSync(tmpWal, 'wal-orphelin');

    const purge = sauvegarde.purgerPartiels();
    verifier('purgerPartiels : compte les .partiel supprimés',
      purge.partielsSupprimes >= 2, JSON.stringify(purge));
    verifier('purgerPartiels : compte les temporaires supprimés',
      purge.tempsSupprimes >= 2, JSON.stringify(purge));
    verifier('purge : .partiel (archive) effacé', !existsSync(partielArchive));
    verifier('purge : .partiel (snapshot) effacé', !existsSync(partielSnapshot));
    verifier('purge : .db orphelin de tmp/ effacé', !existsSync(tmpDb));
    verifier('purge : -wal orphelin de tmp/ effacé', !existsSync(tmpWal));
    verifier('purge : la vraie sauvegarde est CONSERVÉE',
      existsSync(bonne.chemin));

    // listerSauvegardes ignore les .partiel et lit le manifeste en tête.
    const liste = sauvegarde.listerSauvegardes();
    verifier('listerSauvegardes : ne liste que des .zip valides',
      liste.every((s) => s.fichier.endsWith('.zip') && s.valide),
      JSON.stringify(liste.map((s) => s.fichier)));
  } finally {
    nettoyer(racine);
  }
}

// ============================================================
// Exécution.
// ============================================================
console.log('Preuve du coffre-fort E4.1 — 6 familles (base jetable, os.tmpdir).');

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
  console.log('Coffre-fort E4.1 : les 6 familles sont vertes.');
  process.exit(0);
} else {
  console.error(`${nbOk} réussies, ${nbEchecs} ÉCHEC(S) :`);
  for (const e of echecs) console.error(`  - ${e}`);
  process.exit(1);
}
