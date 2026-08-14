// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — PREUVE des comptes (V9-E5, vague 1 : crypto comptes)
// Exécution : node server/test-comptes.mjs
//
// Éprouve server/comptes.js (hachage scrypt+sel, vérification en temps
// constant, verrouillage 5 échecs/15 min PAR COMPTE) SANS toucher aux
// sessions (vague 2). Reprend le patron de test-migrations.mjs /
// test-chiffrement.mjs : base jetable sous os.tmpdir(), jamais data/ réel.
//
// Familles :
//   1. Hachage déterministe : même phrase + même sel → même hash (et un sel
//      différent → un hash différent, même phrase).
//   2. Vérification : bon mot de passe accepté, mauvais rejeté.
//   3. Normalisation NFC : une même phrase saisie en NFC ou en NFD vérifie
//      identiquement (même patron que chiffrement.js:deriverCle).
//   4. Comparaison en temps constant : verifierMotDePasse ne lève jamais sur
//      une entrée malformée (hex tronqué, longueur incorrecte) — renvoie
//      false proprement, jamais une exception.
//   5. Verrouillage : montée du compteur d'échecs, verrou posé au 5e échec,
//      compte détecté verrouillé, remise à zéro sur connexion réussie —
//      et depuis la 4e relecture externe (13/08) : un verrou EXPIRÉ rouvre
//      une fenêtre COMPLÈTE de 5 essais (l'échec suivant compte pour UN).
//   8. A14 : dérivations ASYNCHRONES — verdicts identiques au synchrone,
//      file bornée saine sous demandes simultanées.
//   9. Porte de secours (secours-compte.js) : déverrouillage et
//      réinitialisation locale, journalisés.
//
// Node ≥ 22 (node:sqlite, node:crypto), sans DOM.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const comptes = require('./comptes.js');

// ------------------------------------------------------------
// Outillage de vérification (conventions maison des suites v8/v9).
// ------------------------------------------------------------
let nbOk = 0;
let nbEchecs = 0;

function verifier(libelle, condition, detail = '') {
  if (condition) {
    nbOk += 1;
    console.log(`  OK  ${libelle}`);
  } else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Vérifie qu'un appel synchrone LÈVE avec un message contenant `extrait`. */
function verifierLeve(libelle, fn, extrait = '') {
  try {
    fn();
    verifier(libelle, false, 'aucune erreur levée');
  } catch (erreur) {
    verifier(libelle,
      !extrait || String(erreur.message).includes(extrait),
      `message = « ${erreur.message} »`);
  }
}

// ------------------------------------------------------------
// Base jetable (data/ sous un dossier temporaire, jamais le data/ réel).
// ------------------------------------------------------------
const DOSSIER = mkdtempSync(join(tmpdir(), 'inerweb-fluide-comptes-'));
const CHEMIN_BASE = join(DOSSIER, 'data', 'inerweb-fluide.db');
db.ouvrir(CHEMIN_BASE);

db.run(`INSERT INTO etablissements (id, raison_sociale)
        VALUES ('ETB-TEST', 'Lycée du test');`);

function creerCompte(id, login, motDePasse, role = 'REFERENT') {
  const { hash, sel } = comptes.hacherMotDePasse(motDePasse);
  db.run(
    `INSERT INTO utilisateurs_app (id, login, hash_mot_de_passe, sel, role)
     VALUES (?, ?, ?, ?, ?)`,
    [id, login, hash, sel, role]);
  return { id, login, hash, sel, role };
}

// ============================================================
// 1. Hachage déterministe (même phrase + même sel → même hash)
// ============================================================
{
  const phrase = 'Marseille-13010-Frigoriste!';
  const sel = Buffer.from('0123456789abcdef0123456789abcdef'.slice(0, 32), 'hex');
  const h1 = comptes.deriverHash(phrase, sel);
  const h2 = comptes.deriverHash(phrase, sel);
  verifier('même phrase + même sel → hash identique (déterministe)',
    h1.equals(h2));

  const selAutre = Buffer.from('fedcba9876543210fedcba9876543210'.slice(0, 32), 'hex');
  const h3 = comptes.deriverHash(phrase, selAutre);
  verifier('même phrase + sel différent → hash différent',
    !h1.equals(h3));

  const { hash: hashA, sel: selA } = comptes.hacherMotDePasse(phrase);
  const { hash: hashB, sel: selB } = comptes.hacherMotDePasse(phrase);
  verifier('hacherMotDePasse tire un sel ALÉATOIRE frais à chaque appel',
    selA !== selB && hashA !== hashB);
  verifier('le sel généré fait bien 16 octets (32 caractères hex)',
    Buffer.from(selA, 'hex').length === comptes.LONGUEUR_SEL);
}

// ============================================================
// 2. Vérification : bon mot de passe accepté, mauvais rejeté
// ============================================================
{
  const compte = creerCompte('UTI-T1', 'referent.test', 'BonMotDePasse-2026');
  verifier('bon mot de passe → vérification acceptée',
    comptes.verifierMotDePasse('BonMotDePasse-2026', compte.hash, compte.sel));
  verifier('mauvais mot de passe → vérification rejetée',
    !comptes.verifierMotDePasse('MauvaisMotDePasse', compte.hash, compte.sel));
  verifier('mot de passe vide → rejeté sans lever',
    !comptes.verifierMotDePasse('', compte.hash, compte.sel));
  verifier('mot de passe proche (casse différente) → rejeté',
    !comptes.verifierMotDePasse('bonmotdepasse-2026', compte.hash, compte.sel));
}

// ============================================================
// 3. Normalisation NFC : phrase NFC et NFD vérifient identiquement
// ============================================================
{
  // « é » composé (NFC, 1 code point) vs « e" + accent combinant (NFD, 2 code
  // points) — mêmes octets affichés, représentations Unicode différentes.
  const phraseNFC = 'coffre-référent-13010'.normalize('NFC');
  const phraseNFD = phraseNFC.normalize('NFD');
  verifier('le corpus de test porte bien deux représentations distinctes',
    phraseNFC !== phraseNFD
    && Buffer.from(phraseNFC, 'utf8').length !== Buffer.from(phraseNFD, 'utf8').length);

  const { hash, sel } = comptes.hacherMotDePasse(phraseNFC);
  verifier('phrase saisie en NFD vérifie un hash dérivé de la même phrase en NFC',
    comptes.verifierMotDePasse(phraseNFD, hash, sel));
  verifier('phrase saisie en NFC vérifie normalement (aller simple)',
    comptes.verifierMotDePasse(phraseNFC, hash, sel));
}

// ============================================================
// 4. Comparaison en temps constant : jamais de throw sur entrée malformée
// ============================================================
{
  const compte = creerCompte('UTI-T2', 'eleve.test', 'MotDePasseEleve-1');
  verifier('hex de hash tronqué → rejeté sans lever',
    !comptes.verifierMotDePasse('MotDePasseEleve-1', 'ab12', compte.sel));
  verifier('hex de sel tronqué → rejeté sans lever',
    !comptes.verifierMotDePasse('MotDePasseEleve-1', compte.hash, 'ab12'));
  verifier('hash non hexadécimal → rejeté sans lever',
    !comptes.verifierMotDePasse('MotDePasseEleve-1', 'zzzz-pas-du-hex', compte.sel));
  verifier('hash/sel undefined → rejeté sans lever',
    !comptes.verifierMotDePasse('MotDePasseEleve-1', undefined, undefined));

  // deriverHash reste strict (usage interne, appelé avec des valeurs déjà
  // validées) : lève clairement sur phrase/sel invalides.
  verifierLeve('deriverHash refuse une phrase vide',
    () => comptes.deriverHash('', Buffer.alloc(16)), 'absent');
  verifierLeve('deriverHash refuse un sel de mauvaise longueur',
    () => comptes.deriverHash('phrase', Buffer.alloc(8)), 'Sel invalide');
}

// ============================================================
// 5. Verrouillage : montée du compteur, verrou au 5e échec, remise à zéro
// ============================================================
{
  const compte = creerCompte('UTI-T3', 'admin.test', 'MotDePasseAdmin-1', 'ADMIN');
  const ligne = () => db.get(
    'SELECT echecs_consecutifs, verrouille_jusqua FROM utilisateurs_app WHERE id = ?',
    [compte.id]);

  verifier('compte neuf : non verrouillé', !comptes.estVerrouille(ligne()));

  for (let i = 1; i <= 4; i += 1) {
    comptes.enregistrerEchec(compte.id);
  }
  verifier('après 4 échecs : compteur à 4, toujours pas verrouillé',
    ligne().echecs_consecutifs === 4 && !comptes.estVerrouille(ligne()));

  comptes.enregistrerEchec(compte.id);
  verifier('au 5e échec : compteur à 5 ET verrouille_jusqua posé',
    ligne().echecs_consecutifs === 5 && ligne().verrouille_jusqua !== null);
  verifier('le compte est maintenant détecté verrouillé',
    comptes.estVerrouille(ligne()));

  const echeance = new Date(ligne().verrouille_jusqua).getTime();
  const attendu = Date.now() + comptes.DUREE_VERROU_MS;
  verifier('le verrou dure bien 15 minutes (± 2 s de marge d’exécution)',
    Math.abs(echeance - attendu) < 2000);

  // Un 6e échec (pendant que le verrou est déjà actif) continue de monter
  // le compteur — l'appelant (route) doit refuser AVANT d'appeler ceci si
  // estVerrouille est déjà vrai ; le module lui-même ne bloque pas l'appel.
  comptes.enregistrerEchec(compte.id);
  verifier('le compteur continue de monter au-delà du seuil (6e échec)',
    ligne().echecs_consecutifs === 6);

  comptes.reinitialiserEchecs(compte.id);
  verifier('connexion réussie → compteur remis à 0 ET verrou levé',
    ligne().echecs_consecutifs === 0 && ligne().verrouille_jusqua === null);
  verifier('après réinitialisation : le compte n’est plus verrouillé',
    !comptes.estVerrouille(ligne()));

  // Verrou EXPIRÉ (dans le passé) : redevient utilisable au prochain essai,
  // sans attendre une remise à zéro explicite (règle V9-E5).
  db.run(
    `UPDATE utilisateurs_app SET echecs_consecutifs = 5,
       verrouille_jusqua = ? WHERE id = ?`,
    [new Date(Date.now() - 1000).toISOString(), compte.id]);
  verifier('un verrou déjà expiré n’est plus considéré actif',
    !comptes.estVerrouille(ligne()));

  // Fenêtre NOUVELLE (4e relecture externe, corrigé 13/08) : sur un verrou
  // EXPIRÉ, l'échec suivant COMPTE POUR UN. Avant le correctif, le compteur
  // passait à 6 (≥ 5) et re-verrouillait aussitôt : le titulaire — y compris
  // le seul ADMIN du poste — n'avait plus droit qu'à UN essai par quart
  // d'heure, à perpétuité. Retirer la fenêtre d'enregistrerEchec rend les
  // deux assertions suivantes rouges (contre-épreuve tirée).
  comptes.enregistrerEchec(compte.id);
  verifier('échec sur verrou expiré : le compteur repart à 1 (fenêtre nouvelle)',
    ligne().echecs_consecutifs === 1,
    `compteur = ${ligne().echecs_consecutifs}`);
  verifier('échec sur verrou expiré : aucun re-verrou immédiat',
    ligne().verrouille_jusqua === null && !comptes.estVerrouille(ligne()));

  // La nouvelle fenêtre reste une VRAIE fenêtre : 4 échecs de plus (5 au
  // total) reposent le verrou — l'assouplissement ne désarme pas la borne.
  for (let i = 0; i < 4; i += 1) comptes.enregistrerEchec(compte.id);
  verifier('5 échecs dans la nouvelle fenêtre : le verrou se repose',
    ligne().echecs_consecutifs === 5 && comptes.estVerrouille(ligne()));
  comptes.reinitialiserEchecs(compte.id);

  verifierLeve('enregistrerEchec refuse un compte introuvable',
    () => comptes.enregistrerEchec('UTI-INEXISTANT'), 'introuvable');
}

// ============================================================
// 6. Message d'échec de connexion UNIQUE (pas de fuite d'existence de login)
// ============================================================
// Ce module ne PRODUIT PAS le message (c'est le rôle de la route de
// connexion, vague 2) — on prouve seulement que verifierMotDePasse renvoie
// EXACTEMENT le même type de verdict (false, jamais d'exception) que le
// login existe ou non, condition nécessaire à un message unique en amont.
{
  const compteInexistant = db.get(
    "SELECT hash_mot_de_passe AS hash, sel FROM utilisateurs_app WHERE login = ?",
    ['login-qui-nexiste-pas']);
  verifier('un login inexistant ne renvoie aucune ligne (l’appelant traite hash/sel absents)',
    compteInexistant === undefined);
  verifier('verifierMotDePasse(hash/sel undefined) renvoie false, comme un mauvais mot de passe',
    comptes.verifierMotDePasse('quelconque', undefined, undefined) === false);
}

// ============================================================
// 7. P2-3 (reprise RC 8.1) : profil scrypt hérité (N=2^15) reconnu,
//    re-hachage SIGNALÉ — la migration effective vit dans routes-comptes
//    (prouvée par test-routes-comptes, famille 10).
// ============================================================
{
  const phrase = 'PhraseHeritee-P23-2026';
  const { hash, sel } = comptes.hacherMotDePasse(phrase);

  const verdictCourant = comptes.verifierMotDePasseDetail(phrase, hash, sel);
  verifier('profil courant (N=2^17) : valide, AUCUN re-hachage requis',
    verdictCourant.valide === true && verdictCourant.rehashageRequis === false);

  const hashHerite = comptes.deriverHashHerite(
    phrase, Buffer.from(sel, 'hex')).toString('hex');
  verifier('les deux profils produisent des hash DIFFÉRENTS pour la même phrase',
    hashHerite !== hash);

  const verdictHerite = comptes.verifierMotDePasseDetail(phrase, hashHerite, sel);
  verifier('profil hérité (N=2^15) : valide ET re-hachage requis',
    verdictHerite.valide === true && verdictHerite.rehashageRequis === true);

  const verdictFaux = comptes.verifierMotDePasseDetail(
    'MauvaisePhrase-123', hashHerite, sel);
  verifier('mauvais mot de passe sur un hash hérité : refusé, sans re-hachage',
    verdictFaux.valide === false && verdictFaux.rehashageRequis === false);

  verifier('verifierMotDePasse (booléen, compatibilité) accepte aussi le hash hérité',
    comptes.verifierMotDePasse(phrase, hashHerite, sel) === true);
}

// ============================================================
// 8. A14 : dérivations ASYNCHRONES — mêmes verdicts que le synchrone,
//    file bornée qui sérialise sans figer la boucle d'événements.
// ============================================================
{
  const phrase = 'PariteAsync-2026!';
  const { hash, sel } = comptes.hacherMotDePasse(phrase);

  const vBon = await comptes.verifierMotDePasseDetailAsync(phrase, hash, sel);
  verifier('async : bon mot de passe accepté, sans re-hachage',
    vBon.valide === true && vBon.rehashageRequis === false);

  const vFaux = await comptes.verifierMotDePasseDetailAsync(
    'Mauvaise-999', hash, sel);
  verifier('async : mauvais mot de passe refusé',
    vFaux.valide === false && vFaux.rehashageRequis === false);

  const hashHerite = comptes.deriverHashHerite(
    phrase, Buffer.from(sel, 'hex')).toString('hex');
  const vHerite = await comptes.verifierMotDePasseDetailAsync(
    phrase, hashHerite, sel);
  verifier('async : profil hérité reconnu ET re-hachage signalé (parité stricte)',
    vHerite.valide === true && vHerite.rehashageRequis === true);

  const vMalforme = await comptes.verifierMotDePasseDetailAsync(
    phrase, 'zzzz-pas-du-hex', sel);
  verifier('async : entrée malformée → false, jamais un rejet',
    vMalforme.valide === false && vMalforme.rehashageRequis === false);

  const asynchrone = await comptes.hacherMotDePasseAsync(phrase);
  verifier('async : hacherMotDePasseAsync produit un hash vérifiable en synchrone',
    comptes.verifierMotDePasse(phrase, asynchrone.hash, asynchrone.sel));

  // La file sérialise (une dérivation à la fois) : quatre vérifications
  // lancées ENSEMBLE aboutissent toutes, chacune à SON verdict — aucun
  // mélange de résultats entre tâches, aucun gel.
  const verdicts = await Promise.all([
    comptes.verifierMotDePasseAsync(phrase, hash, sel),
    comptes.verifierMotDePasseAsync('Autre-intruse-1', hash, sel),
    comptes.verifierMotDePasseAsync(phrase, hash, sel),
    comptes.verifierMotDePasseAsync('Autre-intruse-2', hash, sel),
  ]);
  verifier('async : 4 vérifications simultanées → verdicts tous corrects (file saine)',
    verdicts[0] === true && verdicts[1] === false
    && verdicts[2] === true && verdicts[3] === false);
}

// ============================================================
// 9. Porte de secours (CLI secours-compte.js) : déverrouillage et
//    réinitialisation LOCALE — le geste prévu qui remplace l'édition
//    manuelle du fichier SQLite (4e relecture externe).
// ============================================================
{
  const secours = require('./secours-compte.js');
  const compte = creerCompte(
    'UTI-T5', 'prof.secours', 'MotDePasseProf-1', 'ENSEIGNANT');
  const ligne = () => db.get(
    'SELECT echecs_consecutifs, verrouille_jusqua FROM utilisateurs_app WHERE id = ?',
    [compte.id]);

  for (let i = 0; i < 5; i += 1) comptes.enregistrerEchec(compte.id);
  verifier('outillage : le compte de test est verrouillé',
    comptes.estVerrouille(ligne()));

  const deverrouille = secours.deverrouillerCompte('prof.secours');
  verifier('deverrouillerCompte : compteur remis à zéro, verrou levé',
    deverrouille.login === 'prof.secours'
    && ligne().echecs_consecutifs === 0
    && ligne().verrouille_jusqua === null);
  const traceDeverrouillage = db.get(
    `SELECT COUNT(*) AS n FROM journal_audit
     WHERE action = 'DEVERROUILLAGE_COMPTE'`);
  verifier('deverrouillerCompte : geste JOURNALISÉ (journal chaîné)',
    traceDeverrouillage.n === 1, `entrées : ${traceDeverrouillage.n}`);

  verifierLeve('deverrouillerCompte refuse un login inconnu',
    () => secours.deverrouillerCompte('personne.ici'), 'Aucun compte');
  verifierLeve('reinitialiserMotDePasseParLogin refuse un mot de passe trop court',
    () => secours.reinitialiserMotDePasseParLogin('prof.secours', 'court'),
    'trop court');

  secours.reinitialiserMotDePasseParLogin(
    'prof.secours', 'NouveauMotDePasse-1');
  const apres = db.get(
    'SELECT hash_mot_de_passe AS hash, sel FROM utilisateurs_app WHERE id = ?',
    [compte.id]);
  verifier('réinitialisation : l’ANCIEN mot de passe ne vérifie plus',
    !comptes.verifierMotDePasse('MotDePasseProf-1', apres.hash, apres.sel));
  verifier('réinitialisation : le NOUVEAU mot de passe vérifie',
    comptes.verifierMotDePasse('NouveauMotDePasse-1', apres.hash, apres.sel));
  const traceReinit = db.get(
    `SELECT COUNT(*) AS n FROM journal_audit
     WHERE action = 'REINIT_MOT_DE_PASSE'`);
  verifier('réinitialisation : geste JOURNALISÉ (journal chaîné)',
    traceReinit.n === 1, `entrées : ${traceReinit.n}`);
}

// ============================================================
// Verdict
// ============================================================
db.fermer();
rmSync(DOSSIER, { recursive: true, force: true });
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Comptes (crypto V9-E5, vague 1) : tout est vert.');
