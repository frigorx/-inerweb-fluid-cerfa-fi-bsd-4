#!/usr/bin/env node
// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — Porte de secours des comptes (4e relecture externe, 13/08).
 * ============================================================================
 * Un compte verrouillé — y compris le SEUL ADMIN du poste — se déverrouillait
 * jusqu'ici en éditant le fichier SQLite à la main : ce CLI est le geste
 * prévu qui remplace ce geste destructeur.
 *   node server/secours-compte.js --login=xxx                 → déverrouille
 *   node server/secours-compte.js --login=xxx --reinitialiser → déverrouille
 *       ET remplace le mot de passe (saisie masquée sur un vrai terminal,
 *       ou --nouveau-mot-de-passe=yyy hors TTY).
 *
 * Autorité : la MÊME que creer-admin.js — être devant le poste où vit la
 * base. Le modèle de menace du dépôt s'arrête à l'accès disque (qui a le
 * fichier peut tout) : ce CLI n'ouvre aucune porte réseau, il rend au
 * titulaire du poste un geste qu'il pouvait déjà faire salement. Chaque
 * geste est JOURNALISÉ dans le journal chaîné (jamais le mot de passe).
 *
 * Zéro dépendance externe.
 */

const db = require('./db.js');
const comptes = require('./comptes.js');
const sessions = require('./sessions.js');
const { analyserArguments, lireLigneMasquee } = require('./creer-admin.js');

/** Longueurs minimales par rôle (mêmes règles que routes-comptes.js). */
const LONGUEUR_MIN_MOT_DE_PASSE_HABILITE = 10; // ADMIN / REFERENT
const LONGUEUR_MIN_MOT_DE_PASSE_STANDARD = 8;  // ENSEIGNANT / ELEVE
const ROLES_MOT_DE_PASSE_LONG = ['ADMIN', 'REFERENT'];

/**
 * Déverrouille un compte par son login : compteur d'échecs remis à zéro,
 * verrou levé. Ne touche ni au mot de passe ni aux sessions.
 * @param {string} login
 * @returns {{id: string, login: string, role: string}}
 */
function deverrouillerCompte(login) {
  const compte = chercherCompte(login);
  return db.transaction(() => {
    db.run(
      `UPDATE utilisateurs_app
       SET echecs_consecutifs = 0, verrouille_jusqua = NULL
       WHERE id = ?`,
      [compte.id]);
    db.journaliser({
      qui: null,
      action: 'DEVERROUILLAGE_COMPTE',
      cible: compte.login,
      details: `role=${compte.role} (CLI secours-compte.js, poste local)`,
    });
    return { id: compte.id, login: compte.login, role: compte.role };
  });
}

/**
 * Remplace le mot de passe d'un compte par son login : re-hachage (sel
 * frais), verrou levé, compteur remis à zéro, TOUTES les sessions ouvertes
 * révoquées (même conséquence que /api/reinitialiserMotDePasse).
 * @param {string} login
 * @param {string} nouveauMotDePasse
 * @returns {{id: string, login: string, role: string}}
 */
function reinitialiserMotDePasseParLogin(login, nouveauMotDePasse) {
  const compte = chercherCompte(login);
  const longueurMin = ROLES_MOT_DE_PASSE_LONG.includes(compte.role)
    ? LONGUEUR_MIN_MOT_DE_PASSE_HABILITE
    : LONGUEUR_MIN_MOT_DE_PASSE_STANDARD;
  if (typeof nouveauMotDePasse !== 'string'
      || nouveauMotDePasse.length < longueurMin) {
    throw new Error(
      `Mot de passe trop court : ${longueurMin} caractères minimum pour ` +
      `le rôle ${compte.role}.`);
  }
  const { hash, sel } = comptes.hacherMotDePasse(nouveauMotDePasse);
  return db.transaction(() => {
    db.run(
      `UPDATE utilisateurs_app
       SET hash_mot_de_passe = ?, sel = ?, echecs_consecutifs = 0,
           verrouille_jusqua = NULL
       WHERE id = ?`,
      [hash, sel, compte.id]);
    sessions.revoquerToutesLesSessions(compte.id);
    db.journaliser({
      qui: null,
      action: 'REINIT_MOT_DE_PASSE',
      cible: compte.login,
      details: `role=${compte.role} (CLI secours-compte.js, poste local)`,
    });
    return { id: compte.id, login: compte.login, role: compte.role };
  });
}

/** Charge la ligne du compte, message clair si le login est inconnu. */
function chercherCompte(login) {
  const propre = typeof login === 'string' ? login.trim() : '';
  if (!propre) {
    throw new Error('Identifiant obligatoire (--login=xxx).');
  }
  const compte = db.get(
    `SELECT id, login, role, actif, echecs_consecutifs, verrouille_jusqua
     FROM utilisateurs_app WHERE login = ?`, [propre]);
  if (!compte) {
    throw new Error(`Aucun compte au login « ${propre} ».`);
  }
  return compte;
}

/** Point d'entrée CLI (ignoré quand ce module est `require()` par un test). */
async function main() {
  const args = analyserArguments(process.argv.slice(2));
  db.ouvrir();
  try {
    const login = args.login;
    const reinitialiser = 'reinitialiser' in args
      || typeof args['nouveau-mot-de-passe'] === 'string';

    if (!reinitialiser) {
      const fait = deverrouillerCompte(login);
      console.log('');
      console.log(`  Compte déverrouillé : ${fait.login} (${fait.role}).`);
      console.log('  Le compteur d\'échecs est remis à zéro ; le mot de');
      console.log('  passe n\'a pas changé.');
      console.log('');
    } else {
      let motDePasse = args['nouveau-mot-de-passe'];
      if (!motDePasse) {
        if (!process.stdin.isTTY) {
          throw new Error(
            'Nouveau mot de passe requis : passez ' +
            '--nouveau-mot-de-passe=XXX (entrée non interactive).');
        }
        const mdp1 = await lireLigneMasquee('Nouveau mot de passe : ');
        const mdp2 = await lireLigneMasquee('Confirmez le mot de passe : ');
        if (mdp1 !== mdp2) {
          throw new Error('Les deux saisies ne correspondent pas.');
        }
        motDePasse = mdp1;
      }
      const fait = reinitialiserMotDePasseParLogin(login, motDePasse);
      console.log('');
      console.log(`  Mot de passe remplacé : ${fait.login} (${fait.role}).`);
      console.log('  Compte déverrouillé, sessions ouvertes révoquées :');
      console.log('  la prochaine connexion utilise le nouveau mot de passe.');
      console.log('');
    }
    process.exitCode = 0;
  } catch (erreur) {
    console.error('');
    console.error(`  [ERREUR] ${erreur.message}`);
    console.error('');
    process.exitCode = 1;
  } finally {
    db.fermer();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  deverrouillerCompte,
  reinitialiserMotDePasseParLogin,
};
