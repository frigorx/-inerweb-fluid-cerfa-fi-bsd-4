#!/usr/bin/env node
'use strict';

/**
 * inerWeb Fluide — Bootstrap du 1er compte ADMIN (V9-E5, vague 4).
 * ============================================================================
 * SEULE façon de créer le premier ADMIN : cette commande CLI.
 *   node server/creer-admin.js [--login=xxx] [--mot-de-passe=xxx]
 *
 * Règles (arrêtées, non négociables) :
 *   - AUCUN endpoint web de bootstrap. AUCUN compte par défaut. AUCUNE
 *     inscription libre : le seul chemin pour obtenir un ADMIN est CETTE
 *     commande, exécutée sur le poste où tourne le serveur.
 *   - Refuse de créer un 2e ADMIN : si un compte de rôle ADMIN existe déjà en
 *     base, la commande s'arrête avec un message clair et NE FAIT RIEN
 *     (au-delà, /api/creerCompte — gardé ADMIN — prend le relais pour créer
 *     les comptes suivants, y compris d'autres ADMIN si un ADMIN le décide).
 *   - Longueur minimale 10 caractères (même règle que ROLES_MOT_DE_PASSE_LONG
 *     de routes-comptes.js pour ADMIN/REFERENT).
 *   - Hachage via comptes.hacherMotDePasse (scrypt + sel 16 octets, MÊME
 *     patron que toute la base de comptes — rien de spécifique ici).
 *   - Le mot de passe peut être fourni en argument (pratique pour les tests
 *     automatisés / scripts d'exploitation), ou saisi de façon INTERACTIVE
 *     avec affichage masqué (le terminal n'écrit aucun caractère à la frappe)
 *     quand la commande tourne sur un vrai terminal (TTY). Hors TTY (pipe,
 *     CI), la saisie masquée est impossible : la commande l'indique et
 *     retombe sur les arguments/variables d'environnement.
 *
 * Zéro dépendance externe (node:readline, node:crypto, ce dépôt).
 */

const db = require('./db.js');
const comptes = require('./comptes.js');

/** Longueur minimale du mot de passe ADMIN (même règle que routes-comptes.js). */
const LONGUEUR_MIN_MOT_DE_PASSE_ADMIN = 10;

/**
 * Analyse les arguments `--cle=valeur` ou `--cle valeur` de la ligne de
 * commande (argv sans les 2 premiers éléments : node, script).
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function analyserArguments(argv) {
  const resultat = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const sansPrefixe = arg.slice(2);
    const indexEgal = sansPrefixe.indexOf('=');
    if (indexEgal !== -1) {
      resultat[sansPrefixe.slice(0, indexEgal)] = sansPrefixe.slice(indexEgal + 1);
    } else {
      const suivant = argv[i + 1];
      if (suivant !== undefined && !suivant.startsWith('--')) {
        resultat[sansPrefixe] = suivant;
        i += 1;
      } else {
        resultat[sansPrefixe] = '';
      }
    }
  }
  return resultat;
}

// Codes de caractères de contrôle utiles à la saisie masquée — exprimés via
// fromCharCode plutôt qu'en littéral dans la source (évite tout caractère de
// contrôle invisible mal interprété par un éditeur/outil de traitement).
const CAR_CTRL_C = String.fromCharCode(3);
const CAR_RETOUR_ARRIERE = String.fromCharCode(8);  // BS
const CAR_SUPPR = String.fromCharCode(127);          // DEL

/**
 * Lit une ligne sur l'entrée standard SANS l'afficher (mode raw du TTY,
 * caractère par caractère, écho manuel de `*`). Fonctionne uniquement quand
 * `process.stdin.isTTY` est vrai (vrai terminal interactif) — Windows comme
 * Unix (`setRawMode` est natif Node, aucune dépendance). Gère le Retour
 * arrière et Ctrl+C (interruption propre, restaure le terminal).
 * @param {string} invite - texte affiché avant la saisie
 * @returns {Promise<string>}
 */
function lireLigneMasquee(invite) {
  return new Promise((resoudre, rejeter) => {
    const entree = process.stdin;
    process.stdout.write(invite);

    let ligne = '';
    entree.setRawMode(true);
    entree.resume();
    entree.setEncoding('utf8');

    const surDonnee = (touche) => {
      // Ctrl+C : abandon propre, restaure le terminal.
      if (touche === CAR_CTRL_C) {
        nettoyer();
        process.stdout.write('\n');
        rejeter(new Error('Saisie interrompue (Ctrl+C).'));
        return;
      }
      // Entrée (CR ou LF) : validation de la ligne.
      if (touche === '\r' || touche === '\n') {
        nettoyer();
        process.stdout.write('\n');
        resoudre(ligne);
        return;
      }
      // Retour arrière (BS ou DEL) : efface le dernier caractère masqué.
      if (touche === CAR_RETOUR_ARRIERE || touche === CAR_SUPPR) {
        if (ligne.length > 0) {
          ligne = ligne.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      ligne += touche;
      process.stdout.write('*');
    };

    function nettoyer() {
      entree.removeListener('data', surDonnee);
      entree.setRawMode(false);
      entree.pause();
    }

    entree.on('data', surDonnee);
  });
}

/**
 * Obtient le mot de passe : argument fourni tel quel, sinon saisie masquée
 * (TTY) ou message d'erreur explicite (hors TTY, aucune saisie possible).
 * @param {Record<string, string>} args
 * @returns {Promise<string>}
 */
async function obtenirMotDePasse(args) {
  if (typeof args['mot-de-passe'] === 'string' && args['mot-de-passe'].length > 0) {
    return args['mot-de-passe'];
  }
  if (!process.stdin.isTTY) {
    throw new Error(
      'Mot de passe requis : passez --mot-de-passe=XXX (entrée non ' +
      'interactive, la saisie masquée est impossible hors terminal).');
  }
  const mdp1 = await lireLigneMasquee('Mot de passe du compte ADMIN : ');
  const mdp2 = await lireLigneMasquee('Confirmez le mot de passe : ');
  if (mdp1 !== mdp2) {
    throw new Error('Les deux saisies ne correspondent pas.');
  }
  return mdp1;
}

/**
 * Obtient le login : argument fourni, sinon saisie interactive EN CLAIR
 * (un identifiant de connexion n'a pas besoin d'être masqué).
 * @param {Record<string, string>} args
 * @returns {Promise<string>}
 */
async function obtenirLogin(args) {
  if (typeof args.login === 'string' && args.login.trim().length > 0) {
    return args.login.trim();
  }
  if (!process.stdin.isTTY) {
    throw new Error(
      'Identifiant requis : passez --login=XXX (entrée non interactive).');
  }
  const readline = require('node:readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const reponse = await new Promise((resoudre) => {
    rl.question('Identifiant du compte ADMIN : ', resoudre);
  });
  rl.close();
  return reponse.trim();
}

/**
 * Cœur du bootstrap : vérifie qu'aucun ADMIN n'existe déjà, crée le compte.
 * Séparé de `main()` pour rester testable sans passer par un process enfant
 * (appelé directement par test-bootstrap.mjs sur une base jetable).
 * @param {string} login
 * @param {string} motDePasse
 * @returns {{id: string, login: string, role: string}}
 */
function creerPremierAdmin(login, motDePasse) {
  if (!login) {
    throw new Error('Identifiant obligatoire.');
  }
  if (typeof motDePasse !== 'string' || motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE_ADMIN) {
    throw new Error(
      `Mot de passe trop court : ${LONGUEUR_MIN_MOT_DE_PASSE_ADMIN} ` +
      'caractères minimum pour un compte ADMIN.');
  }

  const adminExistant = db.get(
    "SELECT id, login FROM utilisateurs_app WHERE role = 'ADMIN' LIMIT 1");
  if (adminExistant) {
    const erreur = new Error(
      `Un compte ADMIN existe déjà (identifiant : ${adminExistant.login}). ` +
      'Bootstrap refusé : pour créer un compte supplémentaire, connectez-' +
      'vous avec cet ADMIN et utilisez /api/creerCompte.');
    erreur.code = 'ADMIN_DEJA_PRESENT';
    throw erreur;
  }

  const loginExistant = db.get(
    'SELECT id FROM utilisateurs_app WHERE login = ?', [login]);
  if (loginExistant) {
    throw new Error(`Identifiant déjà utilisé : ${login}.`);
  }

  const { hash, sel } = comptes.hacherMotDePasse(motDePasse);
  const id = db.generateId('UTI');

  return db.transaction(() => {
    db.run(
      `INSERT INTO utilisateurs_app
         (id, login, hash_mot_de_passe, sel, role)
       VALUES (?, ?, ?, ?, 'ADMIN')`,
      [id, login, hash, sel]);
    db.journaliser({
      qui: null,
      action: 'BOOTSTRAP_ADMIN',
      cible: login,
      details: 'Création du 1er compte ADMIN (CLI creer-admin.js).',
    });
    const ligne = db.get(
      `SELECT id, login, role, date_creation
       FROM utilisateurs_app WHERE id = ?`, [id]);
    return { id: ligne.id, login: ligne.login, role: ligne.role,
      dateCreation: ligne.date_creation };
  });
}

/** Point d'entrée CLI (ignoré quand ce module est `require()` par un test). */
async function main() {
  const args = analyserArguments(process.argv.slice(2));
  db.ouvrir();
  try {
    const login = await obtenirLogin(args);
    const motDePasse = await obtenirMotDePasse(args);
    const cree = creerPremierAdmin(login, motDePasse);
    console.log('');
    console.log(`  Compte ADMIN créé : ${cree.login} (id ${cree.id}).`);
    console.log('  Connectez-vous depuis l\'application pour créer les');
    console.log('  comptes suivants (REFERENT, ENSEIGNANT, ELEVE).');
    console.log('');
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
  analyserArguments,
  creerPremierAdmin,
  LONGUEUR_MIN_MOT_DE_PASSE_ADMIN,
};
