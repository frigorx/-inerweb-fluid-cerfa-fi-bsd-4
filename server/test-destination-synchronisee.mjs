// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — PREUVE : le dossier de sauvegarde ne peut pas être un
// espace synchronisé sans le dire (lot 0 / B3, 4e audit externe du 27/07/2026)
// Exécution : node server/test-destination-synchronisee.mjs
//
// LE DÉFAUT TIRÉ : la base VIVE était refusée sous OneDrive/Drive/Dropbox
// (db.verifierEmplacementBase, P1-6) pendant que le réglage
// « sauvegarde_dossier_destination » acceptait le MÊME espace sans un mot —
// alors que les archives AUTOMATIQUES qui y atterrissent portent EXACTEMENT
// la même donnée, en clair et NOMINATIVE. Deux poids deux mesures.
//
// Cette suite prouve les quatre faits :
//   1. un dossier ordinaire est ACCEPTÉ (on ne casse rien) ;
//   2. un dossier sous espace synchronisé est REFUSÉ, avec un message qui dit
//      POURQUOI, et SANS que rien ne soit créé sur place ;
//   3. le refus vaut pour le CANAL API (definirReglagesSauvegarde), pas
//      seulement pour le formulaire — « une règle, pas une porte » ;
//   4. la dérogation explicite passe, et un réglage DÉJÀ enregistré n'empêche
//      pas de démarrer : il AVERTIT (le logiciel continue de sauvegarder).
//
// Base JETABLE sous os.tmpdir() — jamais le data/ réel, jamais le port 2011.
// Node ≥ 22 (node:sqlite natif).
// ============================================================

import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

/** Appelle une route et renvoie { ok:true, resultat } ou { ok:false, code }. */
function appelerRoute(routes, methode, params, contexte) {
  try {
    return { ok: true, resultat: routes.appeler(methode, params, contexte) };
  } catch (erreur) {
    return { ok: false, code: erreur.code, message: erreur.message };
  }
}

const DOSSIER = mkdtempSync(join(tmpdir(), 'inerweb-fluide-destsync-'));
const cheminDb = join(DOSSIER, 'data', 'inerweb-fluide.db');

const db = require('./db.js');
const parametres = require('./parametres.js');
const sauvegarde = require('./sauvegarde.js');
const routesSauvegarde = require('./routes-sauvegarde.js');

// La dérogation ne doit pas traîner de l'environnement de l'exécutant.
delete process.env[sauvegarde.ENV_DEROGATION_DESTINATION];

db.ouvrir(cheminDb);

// Chemins d'essai — noms de segments reconnus par db.cheminSousSynchronisation
// (aucune variable d'environnement n'est nécessaire pour les fabriquer).
const DEST_ORDINAIRE = join(DOSSIER, 'Sauvegardes-locales');
const DEST_ONEDRIVE = join(DOSSIER, 'OneDrive', 'Sauvegardes-Fluide');
const DEST_GOOGLE = join(DOSSIER, 'Mon Drive', 'Sauvegardes-Fluide');
const DEST_DROPBOX = join(DOSSIER, 'Dropbox', 'Sauvegardes-Fluide');

try {
  // --- 1. Ce qui doit continuer de marcher : un dossier ordinaire ---
  const vOrdinaire = sauvegarde.validerDossierDestination(DEST_ORDINAIRE);
  verifier('dossier ordinaire → ACCEPTÉ et créé',
    vOrdinaire.ok === true
    && resolve(vOrdinaire.resolu) === resolve(DEST_ORDINAIRE)
    && existsSync(vOrdinaire.resolu),
    JSON.stringify(vOrdinaire));
  verifier('destination vide (retour au défaut) → toujours ACCEPTÉE',
    sauvegarde.validerDossierDestination('').ok === true);

  // --- 2. Le refus : les trois familles d'espaces synchronisés ---
  const vOneDrive = sauvegarde.validerDossierDestination(DEST_ONEDRIVE);
  verifier('dossier sous OneDrive → REFUSÉ',
    vOneDrive.ok === false, JSON.stringify(vOneDrive));
  verifier('dossier sous Google Drive (« Mon Drive ») → REFUSÉ',
    sauvegarde.validerDossierDestination(DEST_GOOGLE).ok === false);
  verifier('dossier sous Dropbox → REFUSÉ',
    sauvegarde.validerDossierDestination(DEST_DROPBOX).ok === false);

  // Le message doit DIRE POURQUOI : la donnée, pas seulement la règle.
  const msg = String(vOneDrive.message || '');
  verifier('le message nomme le motif (archives automatiques EN CLAIR)',
    /en clair/i.test(msg), msg);
  verifier('le message nomme le motif (données NOMINATIVES)',
    /nominativ/i.test(msg), msg);
  verifier('le message nomme la porte de sortie assumée',
    msg.includes(sauvegarde.ENV_DEROGATION_DESTINATION), msg);
  verifier('le message cite le chemin refusé',
    msg.includes(resolve(DEST_ONEDRIVE)), msg);

  // Refus AVANT toute écriture : on ne dépose rien, pas même un dossier vide,
  // dans un espace qui part hors du poste.
  verifier('rien n’est créé dans l’espace synchronisé refusé',
    !existsSync(resolve(DEST_ONEDRIVE)));

  // --- 3. Le CANAL API, pas seulement le formulaire ---
  const rApi = appelerRoute(routesSauvegarde, 'definirReglagesSauvegarde',
    { dossierDestination: DEST_ONEDRIVE }, { role: 'ADMIN' });
  verifier('definirReglagesSauvegarde(OneDrive) en ADMIN → 400 (garde serveur)',
    rApi.ok === false && rApi.code === 400, JSON.stringify(rApi));
  verifier('le réglage n’a PAS été écrit malgré l’appel API',
    String(parametres.lire(sauvegarde.CLE_DOSSIER_DESTINATION, '') || '') === '');

  const rApiOk = appelerRoute(routesSauvegarde, 'definirReglagesSauvegarde',
    { dossierDestination: DEST_ORDINAIRE }, { role: 'ADMIN' });
  verifier('definirReglagesSauvegarde(dossier ordinaire) en ADMIN → ok',
    rApiOk.ok === true, JSON.stringify(rApiOk));
  verifier('dossierBackups suit le dossier ordinaire enregistré',
    resolve(sauvegarde.dossierBackups()) === resolve(DEST_ORDINAIRE));

  // --- 4. La dérogation EXPLICITE (patron IWF_AUTORISER_BASE_SYNCHRONISEE) ---
  verifier('sans dérogation, aucun avertissement (réglage sain)',
    sauvegarde.avertissementDestinationSynchronisee() === '');

  process.env[sauvegarde.ENV_DEROGATION_DESTINATION] = '1';
  const vDerogation = sauvegarde.validerDossierDestination(DEST_ONEDRIVE);
  verifier('avec la dérogation explicite → ACCEPTÉ',
    vDerogation.ok === true
    && resolve(vDerogation.resolu) === resolve(DEST_ONEDRIVE),
    JSON.stringify(vDerogation));
  const rApiDerog = appelerRoute(routesSauvegarde, 'definirReglagesSauvegarde',
    { dossierDestination: DEST_ONEDRIVE }, { role: 'ADMIN' });
  verifier('la dérogation vaut aussi pour le canal API',
    rApiDerog.ok === true, JSON.stringify(rApiDerog));
  delete process.env[sauvegarde.ENV_DEROGATION_DESTINATION];

  // Une valeur qui vaut « 1 » et rien d'autre : pas de dérogation par erreur.
  process.env[sauvegarde.ENV_DEROGATION_DESTINATION] = 'oui';
  verifier('une valeur autre que « 1 » ne vaut PAS dérogation',
    sauvegarde.validerDossierDestination(DEST_GOOGLE).ok === false);
  delete process.env[sauvegarde.ENV_DEROGATION_DESTINATION];

  // --- 5. Réglage DÉJÀ enregistré : avertir, jamais empêcher de démarrer ---
  // Le poste réglé avant la garde (ici : le réglage écrit sous dérogation à
  // l'étape 4) doit CONTINUER à sauvegarder ; c'est le prochain enregistrement
  // qui sera refusé. Une sauvegarde qui ne se fait plus serait pire.
  const avertissement = sauvegarde.avertissementDestinationSynchronisee();
  verifier('réglage synchronisé déjà en base → un AVERTISSEMENT est produit',
    avertissement.length > 0 && /nominativ/i.test(avertissement), avertissement);
  // REVUE : l'avertissement est la SEULE chose que voit un poste déjà réglé
  // ainsi. Lui dire « changez le réglage » sans plus, c'est laisser croire que
  // le geste répare tout : les archives DÉJÀ synchronisées, elles, sont
  // toujours dans le nuage, en clair et nominatives. Le texte doit le dire.
  verifier('l’avertissement dit que les archives DÉJÀ parties ne reviennent pas',
    /déjà synchronisées/i.test(avertissement) && /retirez-les/i.test(avertissement),
    avertissement);
  verifier('réglage synchronisé déjà en base → dossierBackups reste utilisable',
    resolve(sauvegarde.dossierBackups()) === resolve(DEST_ONEDRIVE));
  const rReecriture = appelerRoute(routesSauvegarde, 'definirReglagesSauvegarde',
    { dossierDestination: DEST_ONEDRIVE }, { role: 'ADMIN' });
  verifier('mais le RÉ-enregistrement sans dérogation est refusé',
    rReecriture.ok === false && rReecriture.code === 400,
    JSON.stringify(rReecriture));

  // Retour à un réglage sain : plus d'avertissement.
  appelerRoute(routesSauvegarde, 'definirReglagesSauvegarde',
    { dossierDestination: '' }, { role: 'ADMIN' });
  verifier('destination vidée → plus d’avertissement',
    sauvegarde.avertissementDestinationSynchronisee() === '');

} finally {
  delete process.env[sauvegarde.ENV_DEROGATION_DESTINATION];
  db.fermer();
  try { rmSync(DOSSIER, { recursive: true, force: true }); } catch { /* best effort */ }
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Destination de sauvegarde synchronisée : tout est vert.');
