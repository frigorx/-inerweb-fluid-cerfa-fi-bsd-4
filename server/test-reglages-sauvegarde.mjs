// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — PREUVE des réglages de sauvegarde (Phase 2)
// Exécution : node server/test-reglages-sauvegarde.mjs
//
// Couvre : le module parametres (clé/valeur), le dossier de destination
// CONFIGURABLE (dossierBackups redirigé), la validation d'un dossier candidat,
// le seuil d'alerte d'ancienneté, les deux routes /api (gardes ADMIN/REFERENT),
// et un bout-en-bout (une sauvegarde atterrit bien dans le dossier configuré).
//
// Base JETABLE sous os.tmpdir() — jamais le data/ réel, jamais le port 2011.
// Node ≥ 22 (node:sqlite natif).
// ============================================================

import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
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

const DOSSIER = mkdtempSync(join(tmpdir(), 'inerweb-fluide-reglages-'));
const cheminDb = join(DOSSIER, 'data', 'inerweb-fluide.db');

const db = require('./db.js');
const parametres = require('./parametres.js');
const sauvegarde = require('./sauvegarde.js');
const routesSauvegarde = require('./routes-sauvegarde.js');

db.ouvrir(cheminDb);

try {
  // --- 1. Module parametres : aller-retour clé/valeur ---
  verifier('parametres.lire d’une clé absente → défaut',
    parametres.lire('cle_inexistante', 'defaut') === 'defaut');
  parametres.ecrire('cle_test', 'valeur1');
  verifier('parametres.ecrire puis lire → valeur écrite',
    parametres.lire('cle_test') === 'valeur1');
  parametres.ecrire('cle_test', 'valeur2');
  verifier('parametres.ecrire écrase (upsert)',
    parametres.lire('cle_test') === 'valeur2');

  // --- 2. dossierBackups par défaut (aucune destination configurée) ---
  const backupsDefaut = resolve(join(DOSSIER, 'backups'));
  verifier('dossierBackupsParDefaut = frère de data/',
    resolve(sauvegarde.dossierBackupsParDefaut()) === backupsDefaut,
    sauvegarde.dossierBackupsParDefaut());
  verifier('dossierBackups sans config = défaut',
    resolve(sauvegarde.dossierBackups()) === backupsDefaut);

  // --- 3. Validation d'un dossier de destination candidat ---
  verifier('validerDossierDestination(vide) → ok, resolu=""',
    sauvegarde.validerDossierDestination('').ok === true
    && sauvegarde.validerDossierDestination('').resolu === '');
  verifier('validerDossierDestination(chemin relatif) → refusé',
    sauvegarde.validerDossierDestination('sous/dossier').ok === false);
  const dansData = join(DOSSIER, 'data', 'backups-interdit');
  verifier('validerDossierDestination(dans data/) → refusé',
    sauvegarde.validerDossierDestination(dansData).ok === false);
  const destValide = join(DOSSIER, 'destination-cloud');
  const vd = sauvegarde.validerDossierDestination(destValide);
  verifier('validerDossierDestination(dossier absolu inscriptible) → ok + créé',
    vd.ok === true && existsSync(vd.resolu), JSON.stringify(vd));

  // --- 4. Seuil d'alerte d'ancienneté ---
  verifier('alerteJours par défaut = 7',
    sauvegarde.alerteJours() === 7);
  parametres.ecrire(sauvegarde.CLE_ALERTE_JOURS, 14);
  verifier('alerteJours après réglage = 14',
    sauvegarde.alerteJours() === 14);
  parametres.ecrire(sauvegarde.CLE_ALERTE_JOURS, '0'); // invalide → défaut
  verifier('alerteJours(0/invalide) retombe sur le défaut 7',
    sauvegarde.alerteJours() === 7);

  // --- 5. Routes : gardes de rôle ---
  const rLireEleve = appelerRoute(routesSauvegarde, 'lireReglagesSauvegarde', {}, { role: 'ELEVE' });
  verifier('lireReglagesSauvegarde en ELEVE → 403',
    rLireEleve.ok === false && rLireEleve.code === 403, JSON.stringify(rLireEleve));

  const rLireRef = appelerRoute(routesSauvegarde, 'lireReglagesSauvegarde', {}, { role: 'REFERENT' });
  verifier('lireReglagesSauvegarde en REFERENT → ok + forme attendue',
    rLireRef.ok === true
    && typeof rLireRef.resultat.dossierEffectif === 'string'
    && typeof rLireRef.resultat.dossierParDefaut === 'string'
    && typeof rLireRef.resultat.alerteJours === 'number',
    JSON.stringify(rLireRef));

  const rDefEleve = appelerRoute(routesSauvegarde, 'definirReglagesSauvegarde',
    { alerteJours: 10 }, { role: 'ELEVE' });
  verifier('definirReglagesSauvegarde en ELEVE → 403',
    rDefEleve.ok === false && rDefEleve.code === 403, JSON.stringify(rDefEleve));

  // --- 6. Routes : validations métier ---
  const rMauvaisDossier = appelerRoute(routesSauvegarde, 'definirReglagesSauvegarde',
    { dossierDestination: 'chemin/relatif' }, { role: 'ADMIN' });
  verifier('definirReglagesSauvegarde(dossier relatif) → 400',
    rMauvaisDossier.ok === false && rMauvaisDossier.code === 400, JSON.stringify(rMauvaisDossier));

  const rMauvaisSeuil = appelerRoute(routesSauvegarde, 'definirReglagesSauvegarde',
    { alerteJours: 0 }, { role: 'ADMIN' });
  verifier('definirReglagesSauvegarde(seuil 0) → 400',
    rMauvaisSeuil.ok === false && rMauvaisSeuil.code === 400, JSON.stringify(rMauvaisSeuil));

  // --- 7. Route : configuration valide + prise en compte ---
  const rDefOk = appelerRoute(routesSauvegarde, 'definirReglagesSauvegarde',
    { dossierDestination: destValide, alerteJours: 5 }, { role: 'ADMIN', utilisateur: 'UTI-TEST' });
  verifier('definirReglagesSauvegarde(dossier valide + seuil) → ok',
    rDefOk.ok === true, JSON.stringify(rDefOk));
  verifier('les réglages renvoyés reflètent la destination et le seuil',
    rDefOk.ok && resolve(rDefOk.resultat.dossierEffectif) === resolve(destValide)
    && rDefOk.resultat.alerteJours === 5, JSON.stringify(rDefOk.resultat));
  verifier('dossierBackups pointe désormais sur la destination configurée',
    resolve(sauvegarde.dossierBackups()) === resolve(destValide));

  // --- 8. Bout-en-bout : une sauvegarde atterrit dans le dossier configuré ---
  const produit = sauvegarde.sauvegarderSnapshot({});
  verifier('la sauvegarde produite est bien SOUS le dossier configuré',
    resolve(produit.chemin).startsWith(resolve(destValide) + sep),
    produit.chemin);
  const liste = sauvegarde.listerSauvegardes();
  verifier('listerSauvegardes retrouve la sauvegarde dans la destination configurée',
    liste.length >= 1 && liste[0].valide === true
    && resolve(liste[0].chemin).startsWith(resolve(destValide) + sep),
    JSON.stringify(liste[0] ?? null));
  const fichiersDefaut = existsSync(join(backupsDefaut, 'snapshots'))
    ? readdirSync(join(backupsDefaut, 'snapshots')) : [];
  verifier('rien n’a été écrit dans le dossier backups/ par défaut',
    fichiersDefaut.filter((f) => f.endsWith('.zip')).length === 0);

  // --- 9. Retour au dossier par défaut (destination vidée) ---
  appelerRoute(routesSauvegarde, 'definirReglagesSauvegarde',
    { dossierDestination: '' }, { role: 'ADMIN' });
  verifier('destination vidée → dossierBackups revient au défaut',
    resolve(sauvegarde.dossierBackups()) === backupsDefaut);

} finally {
  db.fermer();
  try { rmSync(DOSSIER, { recursive: true, force: true }); } catch { /* best effort */ }
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Réglages de sauvegarde (Phase 2) : tout est vert.');
