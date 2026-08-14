// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — PREUVE du coffre-fort E4.1 (12 familles)
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
// Les 6 familles d'origine (E4-PLAN) :
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
// Les 6 familles du DURCISSEMENT (revue adversariale, correctifs 1→4) :
//   7. La restauration n'effleure JAMAIS le data/ RÉEL du dépôt (correctif 1 :
//      chemins capturés base ouverte, jamais recalculés via cheminOuvert()
//      après db.fermer()).
//   8. Rollback via zone/ancienne.db (l'original bit-pour-bit) MÊME si le
//      filet est saboté : verif post ROUGE + filet illisible → l'état d'avant
//      est quand même restauré, ZÉRO perte (correctif 2 (i)).
//   9. Filet NON SAIN à la création → ABANDON avant toute bascule, base vive
//      intacte, aucune donnée perdue (correctif 2 (ii)).
//  10. CRASH pendant le rollback (à chaque étape) → reprise au démarrage
//      rétablit la base d'avant (l'ancienne), jamais un hybride ni un socle
//      vierge (correctif 2 (iii) / 3).
//  11. Lecteur ZIP : offsets hors bornes rejetés proprement (« archive
//      corrompue »), jamais un RangeError Node brut (correctif 4 (a)).
//  12. PJ manquante + manifeste RE-SIGNÉ : détectée à la vérif pré-bascule par
//      recroisement avec le count RÉEL de pieces_jointes (correctif 4 (b)).
//  13. RECOURS au filet quand zone/ancienne.db est corrompue : la hiérarchie
//      ancienne → filet rétablit l'état d'avant (correctif 2 (b)).
//  14. Garde-fou anti socle vierge : une zone dont la seule base saine est en
//      sous-dossier (recours coupé) + base vive absente → la reprise HALTE,
//      jamais de socle vierge par-dessus une base récupérable (correctif 3).
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
const sauvegardeAuto = require('./sauvegarde-auto.js');
const parametres = require('./parametres.js');
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
          // Garde-fou : si peupler() maigrissait au point de produire un
          // fichier minuscule, la plage charcutée pourrait perdre son sens.
          if (octetsDb.length < 16384) {
            throw new Error(
              'Base d\'archive anormalement petite pour le charcutage ' +
              `(${octetsDb.length} octets) : renforcer peupler().`);
          }
          // Écraser une plage PROPORTIONNELLE au cœur du fichier (30 % → 70 %).
          // Jamais d'offsets fixes : une plage figée (ex. 400-900) peut tomber
          // dans l'espace non alloué d'une page quand le schéma évolue (vécu
          // avec la migration 21) et integrity_check l'ignore à bon droit.
          // L'archive sortant de VACUUM INTO, toutes ses pages sont utilisées :
          // écraser 40 % du milieu du fichier touche forcément des pages vives.
          const debut = Math.floor(octetsDb.length * 0.3);
          const fin = Math.floor(octetsDb.length * 0.7);
          for (let i = debut; i < fin; i += 1) {
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
// FAMILLE 7 — Correctif 1 : la restauration ne touche JAMAIS le data/ réel.
// Une restauration sur base JETABLE ne doit dériver aucun chemin depuis
// db.CHEMIN_BASE_DEFAUT (data/ du dépôt) après la fermeture de la base. Le
// témoin : le dossier documents/ du dépôt réel n'est ni créé ni modifié.
// ============================================================
function famille7() {
  console.log('\n=== Famille 7 — la restauration n’effleure jamais le data/ réel ===');
  // Empreinte AVANT : existence + éventuel horodatage du data/ réel du dépôt.
  const dataReel = dirname(db.CHEMIN_BASE_DEFAUT);
  const docsReel = join(dataReel, 'documents');
  const restaurationReel = join(dataReel, 'restauration-en-cours');
  const docsReelExistaitAvant = existsSync(docsReel);
  const restaurationReelExistaitAvant = existsSync(restaurationReel);

  const { racine } = ouvrirBaseJetable('f7-');
  try {
    const monde = peupler();
    const produit = sauvegarde.sauvegarderArchive();

    // Restauration ARCHIVE (avec documents) : c'est la bascule des documents
    // qui, dans le bug, renommait vers data/documents RÉEL du dépôt.
    const resultat = restauration.restaurer(produit.chemin);
    verifier('restaurer : verdict VERT (aller-retour ARCHIVE)',
      resultat.verdict === 'VERT' && resultat.ok);

    // Le data/ RÉEL n'a pas été créé/altéré par une restauration jetable.
    verifier('data/documents RÉEL non créé par la restauration jetable',
      existsSync(docsReel) === docsReelExistaitAvant,
      `avant=${docsReelExistaitAvant} après=${existsSync(docsReel)}`);
    verifier('data/restauration-en-cours RÉEL absent après restauration jetable',
      existsSync(restaurationReel) === restaurationReelExistaitAvant);

    // La PJ reste fidèle dans la base jetable (documents bien basculés LOCALEMENT).
    const relue = api.appeler('obtenirPieceJointe', { id: monde.pj.id }, CONTEXTE);
    const hashRelu = createHash('sha256')
      .update(Buffer.from(relue.blob, 'base64')).digest('hex');
    verifier('PJ fidèle après restauration (documents basculés localement)',
      hashRelu === monde.hashPj);
  } finally {
    nettoyer(racine);
    // Filet de sûreté du test : si le bug réapparaissait et créait un
    // documents/ ou restauration-en-cours/ VIDE dans le dépôt, on le retire
    // pour ne pas polluer le dépôt (mais on l'a déjà signalé par un échec).
    if (!docsReelExistaitAvant && existsSync(docsReel)) {
      try { rmSync(docsReel, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
    if (!restaurationReelExistaitAvant && existsSync(restaurationReel)) {
      try { rmSync(restaurationReel, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  }
}

// ============================================================
// FAMILLE 8 — Correctif 2 (i) : verif post ROUGE + filet SABOTÉ →
// l'état d'AVANT (N écritures figées) est QUAND MÊME restauré via
// zone/ancienne.db (l'original bit-pour-bit), AUCUNE perte. Le filet
// re-extractible n'est PLUS l'unique planche de salut.
// ============================================================
function famille8() {
  console.log('\n=== Famille 8 — rollback via ancienne.db même si le filet est saboté ===');
  const { racine } = ouvrirBaseJetable('f8-');
  try {
    const monde = peupler();
    // État d'AVANT = 2 écritures figées (le peuplement). On restaure une
    // archive de CE MÊME état ; la vérif post est forcée ROUGE.
    const avant = compteurs();
    verifier('préparation : 2 écritures figées', avant.mouvementsValides === 2);
    const produit = sauvegarde.sauvegarderArchive();

    // Empreinte métier d'avant (référence de fidélité après rollback).
    const mouvementsAvant = api.appeler('getMouvements', {}, CONTEXTE);

    let appelsVerdict = 0;
    const resultat = restauration.restaurer(produit.chemin, {
      // Forcer ROUGE au 1er verdict (base restaurée) ; laisser VERT ensuite
      // (le rollback via ancienne.db doit vraiment aboutir au vert).
      _forcerVerdictVif: (v) => {
        appelsVerdict += 1;
        return appelsVerdict === 1 ? { ok: false, details: v.details } : v;
      },
      // SABOTER le filet juste après sa création : il devient illisible.
      // L'ancien rollback (re-extraction du filet) échouerait ; le nouveau
      // (reposer zone/ancienne.db) doit sauver l'état d'avant.
      _saboterFiletApresCreation: (cheminFilet) => {
        writeFileSync(cheminFilet, Buffer.from('FILET SABOTE — illisible'));
      }
    });

    verifier('restaurer : verdict ROUGE (vérif post forcée)',
      resultat.verdict === 'ROUGE' && resultat.ok === false, JSON.stringify(resultat));
    verifier('restaurer : rollback signalé', resultat.rollback === true);
    verifier('restaurer : rollback via ancienne.db (pas via le filet saboté)',
      resultat.methodeRollback === 'ancienne', JSON.stringify(resultat));

    // AUCUNE perte : les 2 écritures figées d'avant sont là, base intègre.
    const apres = compteurs();
    verifier('rollback : état d’avant restauré (2 écritures figées), zéro perte',
      apres.mouvementsValides === 2, `${apres.mouvementsValides} au lieu de 2`);
    const cles = ['machines', 'bouteilles', 'mouvements', 'mouvementsValides', 'documents'];
    verifier('rollback : compteurs métier = état d’avant',
      cles.every((c) => apres[c] === avant[c]),
      `${JSON.stringify(apres)} vs ${JSON.stringify(avant)}`);
    const etat = api.appeler('getEtatRegistre', {}, CONTEXTE);
    verifier('rollback : base intègre (chaînes vertes)',
      etat.altere === false, JSON.stringify(etat));

    // Fidélité métier bit pour bit.
    verifier('rollback : mouvements identiques à l’état d’avant',
      JSON.stringify(api.appeler('getMouvements', {}, CONTEXTE)) === JSON.stringify(mouvementsAvant));
    const relue = api.appeler('obtenirPieceJointe', { id: monde.pj.id }, CONTEXTE);
    const hashRelu = createHash('sha256')
      .update(Buffer.from(relue.blob, 'base64')).digest('hex');
    verifier('rollback : PJ fidèle après retour via ancienne.db',
      hashRelu === monde.hashPj);

    // Zone nettoyée après un rollback réussi.
    verifier('rollback : zone de restauration nettoyée',
      !existsSync(restauration.dossierRestaurationEnCours()));
  } finally {
    nettoyer(racine);
  }
}

// ============================================================
// FAMILLE 9 — Correctif 2 (ii) : filet NON SAIN à la création → ABANDON
// AVANT toute bascule, base vive INTACTE. On ne bascule jamais sans un
// filet vérifié restaurable.
// ============================================================
function famille9() {
  console.log('\n=== Famille 9 — filet non sain à la création = ABANDON, base vive intacte ===');
  const { racine } = ouvrirBaseJetable('f9-');
  try {
    peupler();
    const produit = sauvegarde.sauvegarderArchive();

    // État métier AVANT (la référence de non-perte). NB : créer le filet
    // journalise légitimement une entrée SAUVEGARDE (une écriture réelle) —
    // donc « intacte » se mesure sur les DONNÉES (aucune perte, base cohérente
    // et ouverte, AUCUNE bascule), pas sur un sha256 brut du fichier.
    const avant = compteurs();
    const mouvementsAvant = api.appeler('getMouvements', {}, CONTEXTE);

    // Forcer le filet à être jugé NON SAIN à sa création : la restauration
    // doit ABANDONNER avant la moindre bascule.
    const r = leve(() => restauration.restaurer(produit.chemin, {
      _forcerFiletNonSain: true
    }), 'filet');
    verifier('restaurer ABANDONNE si le filet n’est pas sain (exception)',
      r.leve, r.message);

    // Base vive TOUJOURS ouverte, AUCUNE bascule, AUCUNE donnée perdue.
    verifier('base vive toujours ouverte après l’abandon', db.estOuverte());
    const apres = compteurs();
    const clesMetier = ['machines', 'bouteilles', 'mouvements',
      'mouvementsValides', 'documents'];
    verifier('base vive INTACTE : aucune donnée métier perdue (aucune bascule)',
      clesMetier.every((c) => apres[c] === avant[c]),
      `${JSON.stringify(apres)} vs ${JSON.stringify(avant)}`);
    verifier('base vive : mouvements identiques après l’abandon',
      JSON.stringify(api.appeler('getMouvements', {}, CONTEXTE)) === JSON.stringify(mouvementsAvant));
    const etat = api.appeler('getEtatRegistre', {}, CONTEXTE);
    verifier('base vive : intégrité intacte après l’abandon',
      etat.altere === false);

    // Zone nettoyée, pas de bascule en suspens.
    verifier('abandon : zone de restauration nettoyée',
      !existsSync(restauration.dossierRestaurationEnCours()));
  } finally {
    nettoyer(racine);
  }
}

// ============================================================
// FAMILLE 10 — Correctif 2 (iii) / Correctif 3 : CRASH PENDANT le rollback.
// La reprise au démarrage rétablit une base COHÉRENTE (l'ancienne), jamais
// un hybride ni un socle vierge.
// ============================================================
function famille10() {
  console.log('\n=== Famille 10 — crash pendant le rollback → reprise = ancienne cohérente ===');

  // On interrompt le rollback à chacune de ses étapes ; à chaque fois la
  // reprise doit rétablir la base d'avant (2 écritures figées), intègre.
  const etapesRollback = ['rejetee-sortie', 'ancienne-reposee', 'documents-restaures'];
  for (const etape of etapesRollback) {
    const { racine, chemin } = ouvrirBaseJetable('f10-');
    try {
      const monde = peupler();
      const avant = compteurs();
      const produit = sauvegarde.sauvegarderArchive();

      let appelsVerdict = 0;
      const r = leve(() => restauration.restaurer(produit.chemin, {
        _forcerVerdictVif: (v) => {
          appelsVerdict += 1;
          return appelsVerdict === 1 ? { ok: false, details: v.details } : v;
        },
        // Interrompre le rollback (via ancienne.db) APRÈS l'étape nommée.
        _interrompreRollbackApres: (nom) => {
          if (nom === etape) throw new Error(`COUPURE rollback après ${nom}`);
        }
      }));
      verifier(`[rollback:${etape}] la coupure interrompt bien le rollback`,
        r.leve, r.message);

      // Redémarrage simulé : fermer le singleton, reprendre AVANT réouverture.
      try { db.fermer(); } catch { /* peut déjà être fermée */ }
      const reprise = restauration.reprendreRestaurationInterrompue(chemin);
      verifier(`[rollback:${etape}] après reprise : la base vive existe`,
        existsSync(chemin), `action=${reprise.action}`);

      db.ouvrir(chemin);
      const etat = api.appeler('getEtatRegistre', {}, CONTEXTE);
      verifier(`[rollback:${etape}] base cohérente (jamais hybride) après reprise`,
        etat.altere === false, JSON.stringify(etat));

      // La base d'avant (2 écritures figées) est retrouvée — jamais un socle
      // vierge (qui aurait 0) ni un hybride.
      const apres = compteurs();
      verifier(`[rollback:${etape}] état d’avant retrouvé (${apres.mouvementsValides} = ${avant.mouvementsValides}), pas de socle vierge`,
        apres.mouvementsValides === avant.mouvementsValides
          && apres.mouvementsValides === 2,
        `${apres.mouvementsValides} vs ${avant.mouvementsValides}`);

      verifier(`[rollback:${etape}] zone de restauration nettoyée`,
        !existsSync(join(dirname(chemin), 'restauration-en-cours')),
        `action=${reprise.action}`);

      // PJ toujours fidèle : documents cohérents avec la base d'avant.
      const relue = api.appeler('obtenirPieceJointe', { id: monde.pj.id }, CONTEXTE);
      const hashRelu = createHash('sha256')
        .update(Buffer.from(relue.blob, 'base64')).digest('hex');
      verifier(`[rollback:${etape}] PJ fidèle après reprise (documents cohérents)`,
        hashRelu === monde.hashPj);
    } finally {
      nettoyer(racine);
    }
  }
}

// ============================================================
// FAMILLE 11 — Correctif 4 (a) : lecteur ZIP robuste aux offsets hors bornes.
// Un ZIP dont le décalage du répertoire central (ou une entrée) pointe hors
// du buffer est REJETÉ proprement (« archive corrompue »), jamais un
// RangeError Node brut.
// ============================================================
function famille11() {
  console.log('\n=== Famille 11 — lecteur ZIP : offsets hors bornes rejetés proprement ===');
  const { racine } = ouvrirBaseJetable('f11-');
  try {
    // Un ZIP valide comme base de départ.
    const octetsValides = zip.creerZipOctets(
      [{ nom: 'manifeste.json', contenu: '{"format":"x"}' }], new Date());

    // 11a. Corrompre le décalage du répertoire central dans l'EOCD (offset
    // absurde, très au-delà de la taille du buffer) → catalogue() doit lever
    // une erreur CLAIRE, pas un RangeError.
    const b1 = Buffer.from(octetsValides);
    // EOCD est en fin ; le champ "décalage du répertoire central" est à
    // offsetEocd+16. On le pousse hors bornes.
    const offsetEocd1 = trouverEocdTest(b1);
    b1.writeUInt32LE(0x7fffffff, offsetEocd1 + 16);
    const cible1 = join(racine, 'offset-repertoire-hors-borne.zip');
    writeFileSync(cible1, b1);
    const r1 = leve(() => zip.listerEntrees(cible1));
    verifier('ZIP à décalage de répertoire hors borne : rejeté proprement',
      r1.leve, r1.message);
    verifier('ZIP hors borne : message « corrompue » (pas un RangeError brut)',
      /corrompue|illisible|invalide|hors|borne/i.test(r1.message ?? '')
        && !/RangeError|out of (range|bounds)|attempt to access/i.test(r1.message ?? ''),
      r1.message ?? '');

    // 11b. Nombre d'entrées annoncé énorme + décalage répertoire valide mais
    // le curseur va vite déborder → lecture d'en-tête central hors bornes.
    const b2 = Buffer.from(octetsValides);
    const offsetEocd2 = trouverEocdTest(b2);
    // Annoncer 9999 entrées (nb total + nb sur ce disque).
    b2.writeUInt16LE(9999, offsetEocd2 + 8);
    b2.writeUInt16LE(9999, offsetEocd2 + 10);
    const cible2 = join(racine, 'nb-entrees-mensonger.zip');
    writeFileSync(cible2, b2);
    const r2 = leve(() => zip.listerEntrees(cible2));
    verifier('ZIP à nombre d’entrées mensonger : rejeté proprement',
      r2.leve, r2.message);
    verifier('ZIP nb entrées mensonger : message clair (pas un RangeError brut)',
      !/RangeError|out of (range|bounds)|attempt to access/i.test(r2.message ?? ''),
      r2.message ?? '');

    // 11c. Un vrai coffre : restaurer un tel ZIP est refusé avant tout effet.
    const cheminVif = db.cheminOuvert();
    db.fermer();
    const shaAvant = sha256Fichier(cheminVif);
    db.ouvrir(cheminVif);
    const r3 = leve(() => restauration.restaurer(cible1));
    verifier('restaurer refuse un ZIP à offset hors borne (exception)', r3.leve, r3.message);
    const cheminVif2 = db.cheminOuvert();
    db.fermer();
    verifier('base vive INTACTE après refus d’un ZIP hors borne',
      sha256Fichier(cheminVif2) === shaAvant);
    db.ouvrir(cheminVif2);
  } finally {
    nettoyer(racine);
  }
}

/** Recherche l'EOCD (miroir de zip-node.trouverEocd) pour préparer les cas. */
function trouverEocdTest(octets) {
  const TAILLE_EOCD = 22;
  const SIGNATURE_FIN = 0x06054b50;
  const min = Math.max(0, octets.length - TAILLE_EOCD - 0xffff);
  for (let i = octets.length - TAILLE_EOCD; i >= min; i -= 1) {
    if (octets.readUInt32LE(i) === SIGNATURE_FIN) return i;
  }
  throw new Error('EOCD introuvable dans le ZIP de test.');
}

// ============================================================
// FAMILLE 12 — Correctif 4 (b) : PJ MANQUANTE mais manifeste RE-SIGNÉ.
// La vérification pré-bascule recroise le nombre de documents EXTRAITS avec
// le count RÉEL en base (pieces_jointes) — pas seulement avec le manifeste
// (falsifiable). Une archive à qui il manque une PJ, dont le manifeste a été
// recalculé pour mentir, est détectée AVANT toute bascule.
// ============================================================
function famille12() {
  console.log('\n=== Famille 12 — PJ manquante + manifeste re-signé : détectée à la vérif ===');
  const { racine } = ouvrirBaseJetable('f12-');
  try {
    const monde = peupler(); // 1 PJ en base
    const produit = sauvegarde.sauvegarderArchive();

    // Empreinte base vive AVANT (témoin d'intégrité).
    const cheminVif = db.cheminOuvert();
    db.fermer();
    const shaAvant = sha256Fichier(cheminVif);
    db.ouvrir(cheminVif);

    // Fabriquer une archive TRUQUÉE : on RETIRE la PJ (documents/<id>) et on
    // RE-SIGNE le manifeste pour qu'il prétende 0 document (nombre + sha256Global
    // du vide) tout en gardant la BASE d'origine (qui, elle, compte 1 PJ). Le
    // manifeste est donc cohérent avec lui-même : seule la confrontation au
    // count RÉEL de la base restaurée démasque le mensonge.
    const cheminTruque = fabriquerArchiveSansPj(produit.chemin, racine);

    // testerSauvegarde : doit être ROUGE (recroisement base vs documents extraits).
    const verdictTest = restauration.testerSauvegarde(cheminTruque);
    verifier('testerSauvegarde : PJ manquante + manifeste menteur = ROUGE',
      verdictTest.verdict === 'ROUGE', JSON.stringify(verdictTest));
    verifier('testerSauvegarde : motif évoque les pièces jointes / documents',
      /pièce|piece|document|PJ/i.test(verdictTest.motif ?? ''), verdictTest.motif ?? '');

    // restaurer : refusé AVANT toute bascule, base vive intacte.
    const r = leve(() => restauration.restaurer(cheminTruque));
    verifier('restaurer refuse l’archive à PJ manquante (exception)', r.leve, r.message);
    verifier('base vive toujours ouverte après le refus', db.estOuverte());
    const cheminVif2 = db.cheminOuvert();
    db.fermer();
    verifier('base vive INTACTE : sha256 inchangé (PJ manquante détectée avant bascule)',
      sha256Fichier(cheminVif2) === shaAvant);
    db.ouvrir(cheminVif2);
    // La PJ d'origine est toujours là et fidèle.
    const relue = api.appeler('obtenirPieceJointe', { id: monde.pj.id }, CONTEXTE);
    const hashRelu = createHash('sha256')
      .update(Buffer.from(relue.blob, 'base64')).digest('hex');
    verifier('PJ d’origine intacte après refus', hashRelu === monde.hashPj);
  } finally {
    nettoyer(racine);
  }
}

/**
 * Fabrique une archive dérivée SANS la/les entrée(s) documents/ et avec un
 * manifeste RE-SIGNÉ prétendant 0 document (nombre + sha256Global du vide),
 * la BASE d'origine étant conservée telle quelle (elle compte pourtant 1 PJ
 * en table). Objectif : prouver que la vérification recroise avec le count
 * RÉEL de la base, pas seulement avec le manifeste. Retourne le chemin.
 */
function fabriquerArchiveSansPj(cheminZip, racine) {
  const { entrees } = zip.lireZip(readFileSync(cheminZip));
  // sha256Global du vide (SHA-256 de la chaîne vide) — schéma manifeste.js.
  const sha256GlobalVide = createHash('sha256').update('', 'utf8').digest('hex');
  const conservees = [];
  for (const e of entrees) {
    if (e.nom.startsWith('documents/')) continue; // on RETIRE toutes les PJ
    if (e.nom === 'manifeste.json') {
      const manifeste = JSON.parse(e.contenu.toString('utf8'));
      // Mentir : 0 document, sceau global du vide (cohérent avec 0 PJ).
      manifeste.documents = {
        nombre: 0, tailleTotaleOctets: 0, sha256Global: sha256GlobalVide
      };
      conservees.push({
        nom: 'manifeste.json', contenu: JSON.stringify(manifeste, null, 2)
      });
      continue;
    }
    conservees.push({ nom: e.nom, contenu: e.contenu });
  }
  const cible = join(racine, `sans-pj-${Math.random().toString(36).slice(2)}.zip`);
  writeFileSync(cible, zip.creerZipOctets(conservees));
  return cible;
}

// ============================================================
// FAMILLE 13 — Correctif 2 (b) : RECOURS au filet quand ancienne.db est
// inutilisable. verif post ROUGE + zone/ancienne.db SABOTÉE → le rollback
// bascule sur le filet (re-extraction) et rétablit l'état d'avant. Prouve la
// hiérarchie ancienne → filet.
// ============================================================
function famille13() {
  console.log('\n=== Famille 13 — recours au filet si ancienne.db est corrompue ===');
  const { racine } = ouvrirBaseJetable('f13-');
  try {
    const monde = peupler();
    const avant = compteurs();
    const produit = sauvegarde.sauvegarderArchive();

    let appelsVerdict = 0;
    const resultat = restauration.restaurer(produit.chemin, {
      _forcerVerdictVif: (v) => {
        appelsVerdict += 1;
        if (appelsVerdict === 1) {
          // Au moment du 1er verdict (base restaurée, ROUGE forcé), SABOTER
          // zone/ancienne.db : le rollback n°1 (ancienne) doit alors échouer
          // sa vérification de sanité et laisser la main au recours filet.
          const ancienne = join(restauration.dossierRestaurationEnCours(), 'ancienne.db');
          if (existsSync(ancienne)) writeFileSync(ancienne, Buffer.from('ANCIENNE CORROMPUE'));
          return { ok: false, details: v.details };
        }
        return v;
      }
    });

    verifier('restaurer : verdict ROUGE (vérif post forcée)',
      resultat.verdict === 'ROUGE' && resultat.ok === false, JSON.stringify(resultat));
    verifier('restaurer : rollback signalé', resultat.rollback === true);
    verifier('restaurer : recours au FILET (ancienne.db corrompue)',
      resultat.methodeRollback === 'filet', JSON.stringify(resultat));

    // L'état d'avant est rétabli malgré ancienne.db corrompue (le filet a sauvé).
    const apres = compteurs();
    const cles = ['machines', 'bouteilles', 'mouvements', 'mouvementsValides', 'documents'];
    verifier('recours filet : état d’avant restauré, zéro perte',
      cles.every((c) => apres[c] === avant[c]) && apres.mouvementsValides === 2,
      `${JSON.stringify(apres)} vs ${JSON.stringify(avant)}`);
    const etat = api.appeler('getEtatRegistre', {}, CONTEXTE);
    verifier('recours filet : base intègre (chaînes vertes)', etat.altere === false);
    const relue = api.appeler('obtenirPieceJointe', { id: monde.pj.id }, CONTEXTE);
    const hashRelu = createHash('sha256')
      .update(Buffer.from(relue.blob, 'base64')).digest('hex');
    verifier('recours filet : PJ fidèle', hashRelu === monde.hashPj);
    verifier('recours filet : zone nettoyée',
      !existsSync(restauration.dossierRestaurationEnCours()));
  } finally {
    nettoyer(racine);
  }
}

// ============================================================
// FAMILLE 14 — Correctif 3 (garde-fou) : la reprise NE recrée JAMAIS un socle
// vierge par-dessus une base récupérable. Une zone qui ne contient une base
// entière et saine QUE dans un sous-dossier de travail (recours filet coupé),
// base vive absente → la reprise HALTE (erreur explicite), pas de socle vierge.
// ============================================================
function famille14() {
  console.log('\n=== Famille 14 — jamais de socle vierge par-dessus une base récupérable ===');
  const { racine, chemin } = ouvrirBaseJetable('f14-');
  try {
    peupler();
    // Produire une vraie base saine (VACUUM) pour la déposer en profondeur.
    const produit = sauvegarde.sauvegarderArchive();
    const dossierBase = mkdtempSync(join(tmpdir(), 'inerweb-fluide-f14x-'));
    const ecrites = zip.extraireVers(produit.chemin, dossierBase);
    const baseSaine = ecrites.find((e) => e.nom === 'base/inerweb-fluide.db').chemin;

    // Simuler un recours filet COUPÉ : base vive absente + une base entière et
    // saine UNIQUEMENT dans un sous-dossier de travail de la zone.
    db.fermer();
    const zone = join(dirname(chemin), 'restauration-en-cours');
    const sousDossier = join(zone, 'rollback-filet');
    mkdirSync(sousDossier, { recursive: true });
    renameSync(baseSaine, join(sousDossier, 'ancienne.db'));
    // Base vive absente (on l'enlève du chemin).
    if (existsSync(chemin)) rmSync(chemin, { force: true });
    for (const suff of ['-wal', '-shm']) {
      if (existsSync(chemin + suff)) rmSync(chemin + suff, { force: true });
    }
    rmSync(dossierBase, { recursive: true, force: true });

    // La reprise doit HALTER (erreur explicite), et NE PAS recréer un socle
    // vierge par-dessus la base récupérable en profondeur.
    const r = leve(() => restauration.reprendreRestaurationInterrompue(chemin));
    verifier('reprise HALTE sur zone ambiguë (base récupérable en sous-dossier)',
      r.leve, r.message);
    verifier('reprise : message évoque l’inspection / le socle vierge évité',
      /vierge|ambig|inspect|sous-dossier/i.test(r.message ?? ''), r.message ?? '');
    // La base récupérable est CONSERVÉE (zone non détruite).
    verifier('reprise : la base récupérable est conservée (zone préservée)',
      existsSync(join(sousDossier, 'ancienne.db')));
    // Aucun socle vierge n'a été posé sur le chemin vif.
    verifier('reprise : aucun socle vierge posé sur le chemin vif',
      !existsSync(chemin));
  } finally {
    nettoyer(racine);
  }
}

// ============================================================
// Exécution.
// ============================================================
// ============================================================
// FAMILLE 15 — Sauvegarde AUTOMATIQUE (condition 6 du plan audit-proof,
// 16/07/2026) : archive au démarrage si due + VÉRIFIÉE, snapshot débouncé
// après écriture scellée (crochet réel de api.appeler), réglages bornés,
// trace au journal chaîné. Jamais bloquant.
// ============================================================
function famille15() {
  console.log('\n=== Famille 15 — sauvegarde automatique (condition 6) ===');
  const { racine } = ouvrirBaseJetable('f15-');
  try {
    // Le débounce du snapshot est PAR PROCESSUS : remis à zéro pour que
    // la première validation de peupler() (qui passe par api.appeler)
    // déclenche le filet ICI, dans la racine jetable de cette famille —
    // preuve d'INTÉGRATION du crochet appeler() → snapshot.
    sauvegardeAuto.reinitialiserDebouncePourTests();
    peupler();

    verifier('une écriture scellée via appeler() a produit un SNAPSHOT automatique',
      sauvegarde.listerSauvegardes().some((s) => s.type === 'SNAPSHOT' && s.valide));
    const nbSnapshots = sauvegarde.listerSauvegardes()
      .filter((s) => s.type === 'SNAPSHOT').length;
    verifier('le débounce tient : 2 validations dans la foulée = 1 seul snapshot',
      nbSnapshots === 1, `${nbSnapshots} snapshot(s)`);

    // Archive automatique « au démarrage » : due (aucune archive encore),
    // produite ET VÉRIFIÉE réellement (testerSauvegarde → verdict VERT).
    const premiere = sauvegardeAuto.archiveAuDemarrageSiDue();
    verifier('archive automatique due : créée et VÉRIFIÉE (verdict VERT)',
      premiere.faite === true && premiere.verifiee === true
      && typeof premiere.fichier === 'string', JSON.stringify(premiere));
    verifier('l’archive automatique est à l’inventaire (ARCHIVE valide)',
      sauvegarde.listerSauvegardes().some((s) =>
        s.type === 'ARCHIVE' && s.valide && s.fichier === premiere.fichier));

    // Rejouée aussitôt : la dernière archive est récente → rien de refait.
    const seconde = sauvegardeAuto.archiveAuDemarrageSiDue();
    verifier('rejouée aussitôt : aucune nouvelle archive (dernière récente)',
      seconde.faite === false && /récente/.test(seconde.raison ?? ''),
      JSON.stringify(seconde));

    // Désactivée par réglage : ni archive ni snapshot, raison explicite.
    parametres.ecrire(sauvegardeAuto.CLE_ACTIVE, '0');
    const desactivee = sauvegardeAuto.archiveAuDemarrageSiDue();
    verifier('sauvegarde_auto_active = 0 : archive refusée avec raison explicite',
      desactivee.faite === false && /désactivée/.test(desactivee.raison ?? ''));
    sauvegardeAuto.reinitialiserDebouncePourTests();
    sauvegardeAuto.snapshotApresEcritureScellee();
    verifier('sauvegarde_auto_active = 0 : le snapshot ne fait rien non plus',
      sauvegarde.listerSauvegardes()
        .filter((s) => s.type === 'SNAPSHOT').length === 1);
    parametres.ecrire(sauvegardeAuto.CLE_ACTIVE, '1');

    // Réglage d'intervalle : borné, et le défaut revient quand il est effacé.
    parametres.ecrire(sauvegardeAuto.CLE_HEURES, '5000');
    verifier('intervalle borné (5000 → 720 h maximum)',
      sauvegardeAuto.heuresIntervalle() === 720);
    parametres.ecrire(sauvegardeAuto.CLE_HEURES, null);
    verifier('intervalle par défaut (réglage effacé → 24 h, jamais 1 h)',
      sauvegardeAuto.heuresIntervalle() === 24);

    // La trace au journal chaîné (action SAUVEGARDE de sauvegarde.js) :
    // au moins le snapshot + l'archive automatiques de cette famille.
    const instance = db.ouvrir();
    const n = instance.prepare(
      "SELECT COUNT(*) AS n FROM journal_audit WHERE action = 'SAUVEGARDE'").get().n;
    verifier('le journal chaîné trace les sauvegardes automatiques (≥ 2)',
      n >= 2, `${n} entrée(s)`);
  } finally {
    nettoyer(racine);
  }
}

console.log('Preuve du coffre-fort E4.1 — 15 familles (base jetable, os.tmpdir).');

const familles = [famille1, famille2, famille3, famille4, famille5, famille6,
  famille7, famille8, famille9, famille10, famille11, famille12, famille13,
  famille14, famille15];
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
  console.log('Coffre-fort E4.1 : les 15 familles sont vertes.');
  process.exit(0);
} else {
  console.error(`${nbOk} réussies, ${nbEchecs} ÉCHEC(S) :`);
  for (const e of echecs) console.error(`  - ${e}`);
  process.exit(1);
}
