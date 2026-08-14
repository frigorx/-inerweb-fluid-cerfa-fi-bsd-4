// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * Sauvegarde AUTOMATIQUE — condition 6 du plan audit-proof (16/07/2026).
 * Rôle : garantir qu'une sauvegarde récente existe SANS geste humain
 * (l'exigence n°1 : ne JAMAIS perdre les données).
 *  - au DÉMARRAGE du serveur : ARCHIVE complète si la dernière archive
 *    valide date de plus de `sauvegarde_auto_heures` (défaut 24 h), puis
 *    VÉRIFICATION RÉELLE de l'archive produite (testerSauvegarde) ;
 *  - après chaque écriture SCELLÉE (validation, contre-écriture) :
 *    SNAPSHOT débouncé (au plus un par tranche de 10 minutes) — le filet
 *    anti-erreur-humaine du plan.
 * Best-effort ABSOLU : un échec s'affiche en console et se journalise en
 * ÉCHEC mais n'empêche JAMAIS ni le démarrage ni la validation.
 * Rotation GFS, manifeste et journal chaîné = ceux de sauvegarde.js
 * (aucun nouveau chemin de sauvegarde). Réglages (table parametres) :
 * `sauvegarde_auto_active` ('1' par défaut) et `sauvegarde_auto_heures`
 * (24 par défaut, borné 1..720) — exposés par routes-sauvegarde.
 */

const path = require('node:path');

const db = require('./db.js');
const parametres = require('./parametres.js');
const sauvegarde = require('./sauvegarde.js');
const restauration = require('./restauration.js');

const CLE_ACTIVE = 'sauvegarde_auto_active';
const CLE_HEURES = 'sauvegarde_auto_heures';
const HEURES_DEFAUT = 24;
const HEURES_MIN = 1;
const HEURES_MAX = 720; // 30 jours — au-delà, autant la désactiver.
const SNAPSHOT_MINUTES = 10;

/** Horodatage (ms) du dernier snapshot automatique DE CE PROCESSUS. */
let dernierSnapshotMs = 0;

/** La sauvegarde automatique est-elle active ? ('1' par défaut). */
function estActive() {
  const brut = parametres.lire(CLE_ACTIVE);
  if (brut == null || brut === '') return true;
  return brut === '1' || brut === 'true';
}

/** Intervalle minimal (heures) entre deux archives automatiques. */
function heuresIntervalle() {
  const brut = parametres.lire(CLE_HEURES);
  // Réglage absent ou effacé = défaut (piège : Number(null) vaut 0, qui
  // serait borné à 1 h — jamais ce qu'un réglage effacé veut dire).
  if (brut == null || brut === '') return HEURES_DEFAUT;
  const n = Number(brut);
  if (!Number.isFinite(n)) return HEURES_DEFAUT;
  return Math.min(HEURES_MAX, Math.max(HEURES_MIN, Math.round(n)));
}

/** Horodatage ISO de la dernière ARCHIVE valide, ou null. */
function derniereArchiveValide() {
  const archives = sauvegarde.listerSauvegardes()
    .filter((s) => s.type === 'ARCHIVE' && s.valide);
  return archives.length ? archives[0].horodatage : null;
}

/**
 * Archive automatique AU DÉMARRAGE, si due : produit une ARCHIVE complète
 * puis la VÉRIFIE réellement (testerSauvegarde — verdict VERT exigé).
 * Ne lève JAMAIS : retourne un compte-rendu pour l'affichage console.
 * @returns {{faite: boolean, verifiee?: boolean, fichier?: string,
 *   raison?: string, erreur?: string}}
 */
function archiveAuDemarrageSiDue() {
  try {
    if (!estActive()) {
      return { faite: false, raison: 'désactivée (sauvegarde_auto_active = 0)' };
    }
    const heures = heuresIntervalle();
    const derniere = derniereArchiveValide();
    if (derniere) {
      const ageHeures = (Date.now() - Date.parse(derniere)) / 3600000;
      if (Number.isFinite(ageHeures) && ageHeures < heures) {
        return {
          faite: false,
          raison: `dernière archive récente (il y a ${ageHeures.toFixed(1)} h, ` +
            `seuil ${heures} h)`
        };
      }
    }

    const produit = sauvegarde.sauvegarderArchive({ indice: 'automatique' });
    const fichier = path.basename(produit.chemin);

    // Vérification RÉELLE de l'archive produite (« vérification auto après
    // création », condition 6) : intégrité physique, clés étrangères,
    // chaînes registre + journal. La base vive n'est jamais touchée.
    const verdict = restauration.testerSauvegarde(produit.chemin);
    if (verdict.verdict !== 'VERT') {
      journaliserEchec(
        `archive automatique ${fichier} produite mais NON VÉRIFIÉE : ` +
        `${verdict.motif ?? 'verdict ' + verdict.verdict}`);
      return { faite: true, verifiee: false, fichier,
        erreur: verdict.motif ?? String(verdict.verdict) };
    }
    return { faite: true, verifiee: true, fichier };
  } catch (erreur) {
    journaliserEchec(`archive automatique impossible : ${erreur.message}`);
    return { faite: false, erreur: erreur.message };
  }
}

/**
 * SNAPSHOT automatique après une écriture SCELLÉE (validation ou
 * contre-écriture), débouncé : au plus un par tranche de SNAPSHOT_MINUTES.
 * Appelé par api.js APRÈS la transaction (jamais dedans : VACUUM INTO).
 * Ne lève JAMAIS — la validation est déjà acquise, rien ne doit la gêner.
 */
function snapshotApresEcritureScellee() {
  try {
    if (!estActive()) return;
    if (Date.now() - dernierSnapshotMs < SNAPSHOT_MINUTES * 60000) return;
    sauvegarde.sauvegarderSnapshot({ indice: 'automatique' });
    dernierSnapshotMs = Date.now();
  } catch (erreur) {
    journaliserEchec(`snapshot automatique impossible : ${erreur.message}`);
  }
}

/** Trace un échec au journal chaîné (best-effort) ET en console. */
function journaliserEchec(message) {
  console.error(`  [sauvegarde-auto] ${message}`);
  try {
    db.journaliser({
      qui: 'système',
      action: 'SAUVEGARDE_ECHEC',
      cible: 'sauvegarde automatique',
      details: message
    });
  } catch {
    // Journal indisponible : la console a déjà parlé.
  }
}

/** Remet le débounce du snapshot à zéro — TESTS UNIQUEMENT. */
function reinitialiserDebouncePourTests() {
  dernierSnapshotMs = 0;
}

/**
 * État « sauvegarde vérifiée récente » du poste — condition 5 du blocage
 * OFFICIEL (docs/CONDITIONS-BLOCANTES-OFFICIEL.md) : une ARCHIVE VALIDE
 * plus jeune que le seuil réglé. Ne lève jamais (l'échec = pas récente).
 * @returns {{recente: boolean, ageHeures: ?number, seuilHeures: number}}
 */
function etatSauvegardeRecente() {
  const seuilHeures = heuresIntervalle();
  try {
    const derniere = derniereArchiveValide();
    if (!derniere) return { recente: false, ageHeures: null, seuilHeures };
    const ageHeures = (Date.now() - Date.parse(derniere)) / 3600000;
    if (!Number.isFinite(ageHeures)) {
      return { recente: false, ageHeures: null, seuilHeures };
    }
    return { recente: ageHeures < seuilHeures, ageHeures, seuilHeures };
  } catch {
    return { recente: false, ageHeures: null, seuilHeures };
  }
}

module.exports = {
  archiveAuDemarrageSiDue,
  snapshotApresEcritureScellee,
  estActive,
  heuresIntervalle,
  etatSauvegardeRecente,
  reinitialiserDebouncePourTests,
  CLE_ACTIVE,
  CLE_HEURES,
  HEURES_DEFAUT
};
