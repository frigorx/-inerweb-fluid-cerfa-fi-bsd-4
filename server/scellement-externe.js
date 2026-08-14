// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * Scellement EXTERNE simple — lot D du plan audit-proof (condition 5).
 * Rôle : un TÉMOIN QUOTIDIEN daté, hors de la base, que le poste ne peut
 * pas réécrire silencieusement. Une chaîne SHA-256 conservée dans la même
 * base ne prouve pas qu'un administrateur du poste n'a pas réécrit toute
 * la base (limite documentée de db.js:verifierChaineJournal) : le témoin
 * enregistre chaque jour les TÊTES des deux chaînes (registre + journal),
 * les compteurs et l'intervalle des numéros — écrit dans le DOSSIER DE
 * SAUVEGARDE configurable (pointé vers un espace synchronisé, la copie
 * quitte le poste sans DSI).
 *  - un fichier PAR JOUR (`scellement/temoin-AAAA-MM-JJ.json`), réécrit au
 *    fil des écritures scellées du jour, JAMAIS purgé (~1 Ko/jour) ;
 *  - chaque témoin embarque l'empreinte du témoin PRÉCÉDENT (mini-chaîne
 *    entre les jours) et sa propre empreinte (auto-vérifiable) ;
 *  - AUCUNE vérification de chaîne ici (elle vit à l'écran Conformité et
 *    au dossier d'audit) : le témoin CONSTATE, il ne juge pas.
 * Best-effort ABSOLU : un échec s'affiche et se journalise (SCELLEMENT_ECHEC)
 * mais n'empêche JAMAIS ni le démarrage ni la validation.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const db = require('./db.js');
const sauvegarde = require('./sauvegarde.js');
const { FICHE_REGLEMENTAIRE_FLUIDES } = require('./migrations.js');

/** Tenir alignée avec serveur.js:VERSION (qui ne peut pas être requis). */
const VERSION_LOGICIEL = '8.0.0-dev';

const PREFIXE_TEMOIN = 'temoin-';
const MOTIF_TEMOIN = /^temoin-(\d{4}-\d{2}-\d{2})\.json$/;

/** Sous-dossier des témoins, DANS la racine des sauvegardes (dérivation
 *  unique : suit le dossier de destination configuré, donc la synchro). */
function dossierScellement() {
  return path.join(sauvegarde.dossierBackups(), 'scellement');
}

/** Date locale AAAA-MM-JJ (même convention que les dates métier). */
function jourLocal(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-` +
    String(d.getDate()).padStart(2, '0');
}

function sha256(texte) {
  return crypto.createHash('sha256').update(texte, 'utf8').digest('hex');
}

/** Tête + compteurs du registre des mouvements (constat, pas de verdict). */
function etatDuRegistre() {
  const tete = db.get(
    `SELECT hash_ecriture, numero FROM mouvements
     WHERE statut IN ('VALIDE','ANNULE') AND ordre_validation IS NOT NULL
     ORDER BY ordre_validation DESC LIMIT 1`);
  const scellees = db.get(
    'SELECT COUNT(*) AS n FROM mouvements WHERE hash_ecriture IS NOT NULL');
  const total = db.get('SELECT COUNT(*) AS n FROM mouvements');
  const intervalles = db.all(
    `SELECT mode, COUNT(*) AS nombre, MIN(numero) AS premier,
            MAX(numero) AS dernier
     FROM mouvements GROUP BY mode ORDER BY mode`);
  return {
    teteChaine: tete?.hash_ecriture ?? null,
    derniereEcriture: tete?.numero ?? null,
    ecrituresScellees: scellees?.n ?? 0,
    mouvementsTotal: total?.n ?? 0,
    numeros: intervalles.map((l) => ({
      mode: l.mode, nombre: l.nombre, premier: l.premier, dernier: l.dernier
    }))
  };
}

/** Tête + compteur du journal d'audit chaîné. */
function etatDuJournal() {
  const tete = db.get(
    'SELECT id, hash FROM journal_audit ORDER BY id DESC LIMIT 1');
  const total = db.get('SELECT COUNT(*) AS n FROM journal_audit');
  return {
    teteChaine: tete?.hash ?? null,
    derniereEntree: tete?.id ?? null,
    entrees: total?.n ?? 0
  };
}

/**
 * Témoin le plus récent STRICTEMENT antérieur à `jour` : { date, empreinte }
 * (empreinte = SHA-256 du fichier tel quel) ou null (premier témoin, ou
 * dossier illisible — best-effort, jamais d'erreur).
 */
function temoinPrecedent(jour) {
  try {
    const dossier = dossierScellement();
    if (!fs.existsSync(dossier)) return null;
    const dates = fs.readdirSync(dossier)
      .map((nom) => MOTIF_TEMOIN.exec(nom)?.[1])
      .filter((date) => date && date < jour)
      .sort();
    if (!dates.length) return null;
    const date = dates[dates.length - 1];
    const contenu = fs.readFileSync(
      path.join(dossier, `${PREFIXE_TEMOIN}${date}.json`), 'utf8');
    return { date, empreinte: sha256(contenu) };
  } catch {
    return null;
  }
}

/**
 * Écrit (ou réécrit) le témoin du JOUR. Ne lève jamais.
 * L'empreinte du témoin = SHA-256 (hex) du JSON COMPACT du document sans
 * son champ « empreinte » (recette rappelée dans le témoin lui-même : un
 * contrôleur la rejoue sans le logiciel). Écriture atomique (tmp + rename).
 * @returns {{fait: boolean, fichier?: string, erreur?: string}}
 */
function ecrireTemoinQuotidien() {
  try {
    const jour = jourLocal();
    const dossier = dossierScellement();
    fs.mkdirSync(dossier, { recursive: true });
    const corps = {
      application: 'inerWeb Fluide',
      role: 'Témoin quotidien de scellement externe (registre F-Gas) : ' +
        'têtes des chaînes et compteurs constatés à cet instant. Conservez ' +
        'ce fichier hors du poste : il date l’état du registre.',
      versionLogiciel: VERSION_LOGICIEL,
      versionBase: db.versionBase(),
      empreinteMoteurReglementaire:
        sha256(JSON.stringify(FICHE_REGLEMENTAIRE_FLUIDES)),
      date: jour,
      horodatage: new Date().toISOString(),
      registre: etatDuRegistre(),
      journal: etatDuJournal(),
      temoinPrecedent: temoinPrecedent(jour),
      verification: 'empreinte = SHA-256 (hexadécimal) du JSON compact ' +
        '(JSON.stringify sans espaces) de ce document privé de son champ ' +
        '« empreinte »'
    };
    corps.empreinte = sha256(JSON.stringify(corps));
    const chemin = path.join(dossier, `${PREFIXE_TEMOIN}${jour}.json`);
    const partiel = `${chemin}.partiel`;
    fs.writeFileSync(partiel, JSON.stringify(corps, null, 2));
    fs.renameSync(partiel, chemin);
    return { fait: true, fichier: chemin };
  } catch (erreur) {
    return { fait: false, erreur: erreur.message };
  }
}

/**
 * Crochet d'api.appeler() APRÈS une écriture scellée : rafraîchit le témoin
 * du jour, best-effort ABSOLU (échec affiché + journalisé, jamais bloquant).
 */
function temoinApresEcritureScellee() {
  const temoin = ecrireTemoinQuotidien();
  if (!temoin.fait) {
    journaliserEchec(`témoin quotidien impossible : ${temoin.erreur}`);
  }
}

/** Trace un échec au journal chaîné (best-effort) ET en console. */
function journaliserEchec(message) {
  console.error(`  [scellement] ${message}`);
  try {
    db.journaliser({
      qui: 'système',
      action: 'SCELLEMENT_ECHEC',
      cible: 'témoin quotidien',
      details: message
    });
  } catch {
    // Journal indisponible : la console a déjà parlé.
  }
}

module.exports = {
  ecrireTemoinQuotidien,
  temoinApresEcritureScellee,
  dossierScellement,
  PREFIXE_TEMOIN
};
