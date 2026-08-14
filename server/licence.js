// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Licence d'évaluation nominative (plan docs/PLAN-LICENCE-NOMINATIVE.md).
//
// Chaque paquet portable est délivré à une personne NOMMÉE : un fichier
// licence-inerweb.json, signé Ed25519 avec la clé privée du propriétaire,
// accompagne le paquet. Ce module vérifie la signature avec la clé PUBLIQUE
// embarquée ci-dessous — entièrement en local, AUCUN appel réseau (la
// promesse « rien ne part sur internet » tient, test-promesses-cloud fait foi).
//
// Ce que la vérification établit, et rien de plus : le fichier de licence
// est bien celui que le propriétaire a signé (modifier un champ rend la
// signature invalide). Elle ne rend PAS la copie techniquement impossible :
// le code s'exécute chez l'utilisateur, donc se lit (doctrine du 14/07/2026,
// jamais d'obfuscation). Le dispositif rend le partage NOMINATIF et
// TRAÇABLE ; le reste est du droit (LICENCE-EVALUATION.txt).
//
// QUAND la licence est-elle exigée ? Un paquet portable se reconnaît à
// node\node.exe posé à côté du serveur (c'est sa signature de fabrication,
// outils/fabriquer-paquet.mjs). Le dépôt de développement n'a pas ce
// dossier : le filet de test, le poste du propriétaire (qui tourne depuis
// le dépôt) et la démo GitHub Pages (aucun serveur) sont donc hors champ.
// IWF_LICENCE_REQUISE=1 force l'exigence, pour la tirer en test.
//
// COMPORTEMENTS (jamais de registre en otage) :
//   licence valide   → démarre, identité affichée en console ;
//   absente/invalide → refus de démarrer, message + contact ;
//   expirée          → démarre en LECTURE SEULE : consultations, exports et
//                      sauvegardes restent ouverts À VIE, seules les
//                      méthodes de mutation du contrat sont fermées.
// Limite CONNUE, assumée : reculer l'horloge du poste repousse l'expiration.
// ============================================================
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dates = require('./dates.js');

const PRODUIT_LICENCE = 'inerWeb Fluide';
const NOM_FICHIER_LICENCE = 'licence-inerweb.json';
const CONTACT_LICENCE = 'inerweb.fh@gmail.com';
const PORTEES_CONNUES = ['EVALUATION'];

// Clé publique n° 1 (Ed25519, SPKI) — générée le 14/08/2026 par
// outils/generer-cles-licence.mjs. La clé privée correspondante vit chez le
// propriétaire, hors dépôt. Le champ « cle » de la licence désigne cette
// entrée : une rotation future AJOUTE une clé, elle n'en remplace jamais une
// (les licences déjà émises doivent rester vérifiables).
// ⚠️ ROTATION FINALE du 14/08/2026 (après le 2e passage de la revue
// externe, sur son GO technique) : les deux clés précédentes du jour ont
// existé PENDANT des audits ayant accès au poste — détruites l'une après
// l'autre. Celle-ci est née APRÈS le dernier passage de l'auditeur ; règle
// opérationnelle : le dossier des clés ne croise plus JAMAIS un outil
// d'analyse. Aucune licence des clés détruites n'a circulé
// (seul EVAL-2026-001, réémis à chaque rotation).
const CLES_PUBLIQUES_LICENCE = {
  1: '-----BEGIN PUBLIC KEY-----\n'
    + 'MCowBQYDK2VwAyEAgAzY6Q3ujzsJsSPNwPG+rpG/pcmI63RNGyuM0LqJ7jU=\n'
    + '-----END PUBLIC KEY-----\n',
};

// Clé n° 0 « D'ESSAI » — son unique usage : permettre au filet de test de
// jouer un serveur RÉEL en mode licence sans toucher à la clé privée du
// propriétaire (la paire d'essai est PUBLIQUE, committée dans la suite).
// Pourquoi c'est SANS DANGER : elle n'est honorée que lorsque l'exigence de
// licence vient de l'ENVIRONNEMENT (IWF_LICENCE_REQUISE=1) ET qu'aucun
// node\node.exe n'est à côté du serveur — c'est-à-dire uniquement hors
// paquet, là où AUCUNE licence n'est exigée de toute façon. Dans un paquet
// distribué (node\node.exe présent), elle n'ouvre RIEN.
const CLE_PUBLIQUE_ESSAI = '-----BEGIN PUBLIC KEY-----\n'
  + 'MCowBQYDK2VwAyEAHohP5tjidxrRGz/VK+IiD5ltF7qnB6rFG2Bm4S3ISVw=\n'
  + '-----END PUBLIC KEY-----\n';

// L'ordre des champs est FIGÉ : c'est lui qui définit la chaîne signée
// (patron chaineCanoniqueSignature de hash-mouvement.js). En changer
// invaliderait toute licence déjà émise.
const CHAMPS_LICENCE = ['produit', 'cle', 'numero', 'titulaire', 'courriel',
  'delivreLe', 'expireLe', 'portee'];

// Motifs canoniques (patron des messages canoniques du contrat).
const MOTIF_ABSENTE = 'ABSENTE';
const MOTIF_ILLISIBLE = 'ILLISIBLE';
const MOTIF_CHAMP_MANQUANT = 'CHAMP_MANQUANT';
const MOTIF_CHAMP_INVALIDE = 'CHAMP_INVALIDE';
const MOTIF_SIGNATURE_INVALIDE = 'SIGNATURE_INVALIDE';
const MOTIF_EXPIREE = 'EXPIREE';
const MOTIF_VALIDE = 'VALIDE';
const MOTIF_NON_REQUISE = 'NON_REQUISE';

/** Chaîne canonique signée : champs dans l'ordre FIGÉ, un par ligne. */
function chaineCanoniqueLicence(objet) {
  return CHAMPS_LICENCE
    .map((champ) => `${champ}=${String(objet[champ] ?? '')}`)
    .join('\n');
}

/** Date locale du poste au format AAAA-MM-JJ. */
function dateDuJour() {
  const d = new Date();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/**
 * Vérifie un objet licence : champs, signature, puis échéance — dans cet
 * ordre (une licence expirée à signature fausse est SIGNATURE_INVALIDE,
 * jamais EXPIREE). Rend { ok, motif, detail?, licence? } ; `licence` (les
 * champs, sans la signature) est rendue pour VALIDE **et** EXPIREE : la
 * lecture seule doit pouvoir dire à qui la licence appartenait.
 * options.clesPubliques : injection d'une table de clés jetables (tests) —
 * la clé privée réelle ne touche jamais le filet.
 */
function verifierLicence(objet, aujourdHui, options = {}) {
  if (!objet || typeof objet !== 'object') {
    return { ok: false, motif: MOTIF_ABSENTE };
  }
  for (const champ of CHAMPS_LICENCE) {
    const valeur = objet[champ];
    if (valeur === undefined || valeur === null || String(valeur).trim() === '') {
      return { ok: false, motif: MOTIF_CHAMP_MANQUANT, detail: champ };
    }
  }
  if (typeof objet.signature !== 'string' || objet.signature.trim() === '') {
    return { ok: false, motif: MOTIF_CHAMP_MANQUANT, detail: 'signature' };
  }
  if (objet.produit !== PRODUIT_LICENCE) {
    return { ok: false, motif: MOTIF_CHAMP_INVALIDE, detail: 'produit' };
  }
  if (!PORTEES_CONNUES.includes(objet.portee)) {
    return { ok: false, motif: MOTIF_CHAMP_INVALIDE, detail: 'portee' };
  }
  // Défaut-refus des dates (doctrine dates.js) : une date présente mais
  // illisible n'est JAMAIS interprétée.
  if (!dates.estDateCalendaire(objet.delivreLe)) {
    return { ok: false, motif: MOTIF_CHAMP_INVALIDE, detail: 'delivreLe' };
  }
  if (!dates.estDateCalendaire(objet.expireLe)) {
    return { ok: false, motif: MOTIF_CHAMP_INVALIDE, detail: 'expireLe' };
  }

  const clesPubliques = options.clesPubliques ?? CLES_PUBLIQUES_LICENCE;
  const pemPublique = clesPubliques[objet.cle];
  if (!pemPublique) {
    return { ok: false, motif: MOTIF_CHAMP_INVALIDE, detail: 'cle' };
  }
  let signatureBonne = false;
  try {
    signatureBonne = crypto.verify(
      null,
      Buffer.from(chaineCanoniqueLicence(objet), 'utf8'),
      crypto.createPublicKey(pemPublique),
      Buffer.from(objet.signature, 'base64'));
  } catch {
    signatureBonne = false;
  }
  if (!signatureBonne) {
    return { ok: false, motif: MOTIF_SIGNATURE_INVALIDE };
  }

  const licence = {};
  for (const champ of CHAMPS_LICENCE) licence[champ] = objet[champ];

  const jour = aujourdHui ?? dateDuJour();
  if (!dates.estDateCalendaire(jour)) {
    // Un « aujourd'hui » illisible ne s'interprète pas : on refuse de
    // conclure à la validité (défaut-refus, jamais l'inverse).
    return { ok: false, motif: MOTIF_CHAMP_INVALIDE, detail: 'aujourdHui' };
  }
  // Format AAAA-MM-JJ : la comparaison de chaînes EST la comparaison de dates.
  if (objet.expireLe < jour) {
    return { ok: false, motif: MOTIF_EXPIREE, licence };
  }
  return { ok: true, motif: MOTIF_VALIDE, licence };
}

/** Lit un fichier de licence à un chemin COMPLET. Absent ≠ illisible. */
function chargerLicenceDepuis(chemin) {
  if (!fs.existsSync(chemin)) return { present: false };
  try {
    return { present: true, objet: JSON.parse(fs.readFileSync(chemin, 'utf8')) };
  } catch {
    return { present: true, illisible: true };
  }
}

/** Lit le fichier de licence d'un dossier. Absent ≠ illisible. */
function chargerLicence(dossier) {
  return chargerLicenceDepuis(path.join(dossier, NOM_FICHIER_LICENCE));
}

/** Le poste est-il un PAQUET portable ? (node\node.exe = signature de fabrication) */
function estPaquet(racine) {
  return fs.existsSync(path.join(racine, 'node', 'node.exe'));
}

/** La licence est-elle exigée sur CE poste ? (paquet portable, ou forçage test) */
function licenceRequise(racine, env) {
  if (env && env.IWF_LICENCE_REQUISE === '1') return true;
  return estPaquet(racine);
}

/**
 * Table des clés honorées sur CE poste : la clé d'essai n° 0 ne s'ajoute que
 * HORS paquet (voir son commentaire) — dans un paquet distribué, seules les
 * clés réelles comptent.
 */
function clesPourPoste(racine, env) {
  if (!estPaquet(racine) && env && env.IWF_LICENCE_REQUISE === '1') {
    return { ...CLES_PUBLIQUES_LICENCE, 0: CLE_PUBLIQUE_ESSAI };
  }
  return CLES_PUBLIQUES_LICENCE;
}

// ------------------------------------------------------------
// LECTURE SEULE — classification COMPLÈTE des routes hors contrat.
// La revue externe du 14/08 a tiré le trou : la garde vivait APRÈS les
// routeurs spécialisés, donc bootstrapAdmin et definirCodeExercice
// écrivaient encore en mode expiré (motif L2-i « une règle, pas une
// porte », énième occurrence). La règle vit désormais ICI, en une liste
// FERMÉE et une liste OUVERTE dont l'union est prouvée ÉGALE aux méthodes
// des trois routeurs par test-licence : une route nouvelle non classée
// rend le filet rouge.
// ------------------------------------------------------------
const ROUTES_FERMEES_LECTURE_SEULE = Object.freeze([
  // Créer des comptes, c'est écrire dans la base — fermé. Conséquence
  // assumée : une installation VIERGE à licence expirée ne peut pas créer
  // son premier ADMIN (le message renvoie au contact, il n'y a de toute
  // façon rien à consulter dans une base vierge).
  'bootstrapAdmin', 'creerCompte',
  // Le réglage du code d'exercice écrit dans les paramètres du poste.
  'definirCodeExercice',
]);
const ROUTES_OUVERTES_LECTURE_SEULE = Object.freeze([
  // Consulter EXIGE une session : la porte d'entrée reste ouverte.
  'connexion', 'deconnexion', 'etatInitial',
  // La GOUVERNANCE D'ACCÈS reste ouverte : un mot de passe oublié ne doit
  // pas priver quelqu'un de SES données (promesse du contrat), et révoquer
  // l'accès d'un compte est un geste de sécurité qu'on ne suspend pas.
  // Seule la CRÉATION d'identités nouvelles est fermée (ci-dessus).
  'listerComptes', 'reinitialiserMotDePasse', 'definirActivationCompte',
  // Le bac à sable d'exercice LIT (photo du registre) et vit côté client.
  'etatExercice', 'demarrerExercice',
  // Le coffre-fort reste ENTIER : la promesse du contrat d'évaluation est
  // « vos données restent à vous » — sauvegarder, restaurer, tester et
  // régler la destination servent cette promesse, pas le registre.
  'sauvegarder', 'listerSauvegardes', 'restaurer', 'testerSauvegarde',
  'lireReglagesSauvegarde', 'definirReglagesSauvegarde',
]);

/** Une route HORS contrat est-elle fermée en lecture seule ? */
function routeFermeeEnLectureSeule(methode) {
  return ROUTES_FERMEES_LECTURE_SEULE.includes(methode);
}

/** Message canonique du refus des écritures en lecture seule. */
function messageLectureSeule(licence) {
  const echeance = licence && licence.expireLe ? licence.expireLe : 'inconnue';
  return `Licence d'évaluation expirée (échéance : ${echeance}). `
    + 'Consultations, exports et sauvegardes restent ouverts ; les écritures '
    + `sont fermées. Pour renouveler : ${CONTACT_LICENCE}.`;
}

/** Message canonique du refus de démarrer. */
function messageRefus(motif, detail) {
  const causes = {
    [MOTIF_ABSENTE]: `le fichier ${NOM_FICHIER_LICENCE} est introuvable à côté du programme`,
    [MOTIF_ILLISIBLE]: `le fichier ${NOM_FICHIER_LICENCE} n'est pas lisible (JSON attendu)`,
    [MOTIF_CHAMP_MANQUANT]: `la licence est incomplète (champ « ${detail ?? '?'} »)`,
    [MOTIF_CHAMP_INVALIDE]: `la licence porte une valeur invalide (champ « ${detail ?? '?'} »)`,
    [MOTIF_SIGNATURE_INVALIDE]: 'la signature de la licence ne correspond pas à son contenu '
      + '(fichier modifié, ou licence d\'un autre paquet)',
  };
  return `Ce paquet exige une licence nominative : ${causes[motif] ?? motif}. `
    + `Pour obtenir ou remplacer une licence (gratuite pour l'évaluation) : ${CONTACT_LICENCE}.`;
}

/**
 * Décision de démarrage, PURE et testable : c'est ELLE que la suite tire,
 * serveur.js ne fait que l'appliquer.
 * Rend { requise, demarrer, lectureSeule, motif, licence?, message? }.
 */
function evaluerDemarrageLicence({ racine, env, aujourdHui, options } = {}) {
  if (!licenceRequise(racine, env ?? {})) {
    return { requise: false, demarrer: true, lectureSeule: false, motif: MOTIF_NON_REQUISE };
  }
  // Clés honorées sur ce poste (clé d'essai hors paquet seulement) — une
  // table injectée par les tests unitaires prime.
  const optionsEffectives = options && options.clesPubliques
    ? options
    : { ...options, clesPubliques: clesPourPoste(racine, env ?? {}) };
  // IWF_LICENCE_FICHIER : chemin de fichier alternatif (bancs et filet).
  // Sans danger : le fichier pointé doit toujours porter une signature
  // valide d'une clé honorée — l'emplacement ne donne aucun droit.
  const cheminFichier = (env && env.IWF_LICENCE_FICHIER)
    ? env.IWF_LICENCE_FICHIER
    : path.join(racine, NOM_FICHIER_LICENCE);
  const charge = chargerLicenceDepuis(cheminFichier);
  if (!charge.present) {
    return {
      requise: true, demarrer: false, lectureSeule: false,
      motif: MOTIF_ABSENTE, message: messageRefus(MOTIF_ABSENTE),
    };
  }
  if (charge.illisible) {
    return {
      requise: true, demarrer: false, lectureSeule: false,
      motif: MOTIF_ILLISIBLE, message: messageRefus(MOTIF_ILLISIBLE),
    };
  }
  const verdict = verifierLicence(charge.objet, aujourdHui, optionsEffectives);
  if (verdict.motif === MOTIF_EXPIREE) {
    return {
      requise: true, demarrer: true, lectureSeule: true,
      motif: MOTIF_EXPIREE, licence: verdict.licence,
      message: messageLectureSeule(verdict.licence),
    };
  }
  if (!verdict.ok) {
    return {
      requise: true, demarrer: false, lectureSeule: false,
      motif: verdict.motif, message: messageRefus(verdict.motif, verdict.detail),
    };
  }
  return {
    requise: true, demarrer: true, lectureSeule: false,
    motif: MOTIF_VALIDE, licence: verdict.licence,
  };
}

module.exports = {
  PRODUIT_LICENCE,
  NOM_FICHIER_LICENCE,
  CONTACT_LICENCE,
  PORTEES_CONNUES,
  CHAMPS_LICENCE,
  CLES_PUBLIQUES_LICENCE,
  MOTIF_ABSENTE,
  MOTIF_ILLISIBLE,
  MOTIF_CHAMP_MANQUANT,
  MOTIF_CHAMP_INVALIDE,
  MOTIF_SIGNATURE_INVALIDE,
  MOTIF_EXPIREE,
  MOTIF_VALIDE,
  MOTIF_NON_REQUISE,
  CLE_PUBLIQUE_ESSAI,
  ROUTES_FERMEES_LECTURE_SEULE,
  ROUTES_OUVERTES_LECTURE_SEULE,
  chaineCanoniqueLicence,
  dateDuJour,
  verifierLicence,
  chargerLicence,
  chargerLicenceDepuis,
  estPaquet,
  licenceRequise,
  clesPourPoste,
  routeFermeeEnLectureSeule,
  messageLectureSeule,
  messageRefus,
  evaluerDemarrageLicence,
};
