// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — Routes d'authentification (V9-E5, vague 3 « le cœur »).
 * ==========================================================================
 * REMPLACE le raccourci provisoire « loopback = REFERENT » : ce module
 * matérialise la connexion, la déconnexion et la création de compte (ADMIN
 * uniquement). Câblé dans serveur.js AVANT l'aiguillage api.appeler, avec les
 * MÊMES gardes réseau (CSRF / DNS-rebinding) déjà posées par traiterApi.
 * Patron repris de routes-sauvegarde.js (aiguillage, enveloppe, gardes).
 *
 *   POST /api/connexion      { login, motDePasse }
 *   POST /api/deconnexion    {}
 *   POST /api/creerCompte    { login, motDePasseInitial, role, personnelId? }
 *                            — GARDÉE ADMIN uniquement.
 *   POST /api/etatInitial    {}  — lecture ouverte : { initialise: bool }.
 *   POST /api/bootstrapAdmin { login, motDePasse }  — 1er ADMIN au premier
 *                            lancement, GARDÉE « aucun compte + loopback strict ».
 *   POST /api/listerComptes  {}  — GARDÉE ADMIN : liste des comptes (sans hash).
 *   POST /api/reinitialiserMotDePasse { id, nouveauMotDePasse } — GARDÉE ADMIN.
 *   POST /api/definirActivationCompte { id, actif } — GARDÉE ADMIN (soft-delete).
 *
 * Ces routes NE SONT PAS gardées par garderRole du contrat DataStore (elles
 * n'en font pas partie) : /api/connexion et /api/deconnexion sont ouvertes à
 * quiconque peut atteindre le serveur (c'est justement leur rôle — poser ou
 * lever une session). /api/creerCompte porte SA PROPRE garde de rôle
 * (ADMIN), appliquée AVANT tout effet, exactement comme routes-sauvegarde.
 *
 * Sécurité (règles V9-E5 non négociables) :
 *   - Le rôle vient TOUJOURS de la session serveur, jamais du corps de la
 *     requête (creerCompte lit contexte.role, jamais params.role appelant).
 *   - Message d'échec de connexion UNIQUE, que le login existe ou non —
 *     VERROU COMPRIS depuis la 4e relecture externe (27/07/2026, corrigé le
 *     13/08) : l'ancien « Compte verrouillé. » ne sortait que pour un login
 *     EXISTANT — cinq requêtes suffisaient à énumérer les identifiants
 *     malgré le message unique. L'état de verrou reste visible de l'ADMIN
 *     (listerComptes) ; le CLI server/secours-compte.js déverrouille depuis
 *     le poste.
 *   - Verrouillage : un compte verrouillé refuse même le bon mot de passe
 *     (décision V9-E5 maintenue) ; le coût d'un scrypt est payé sur TOUS
 *     les chemins de refus, verrou compris (aucune asymétrie de temps).
 *   - A14 (13/08) : la vérification du mot de passe est ASYNCHRONE
 *     (comptes.verifierMotDePasseDetailAsync — crypto.scrypt dans le pool
 *     de threads, file bornée) : un déluge de connexions ne fige plus la
 *     boucle d'événements du serveur ; la file pleine répond 503, jamais
 *     un gel.
 *   - Écritures multi-tables (échecs/déverrouillage/dernière connexion +
 *     création de session) dans db.transaction() (ré-entrante).
 *   - Poser/lever le cookie iwf_session est laissé à serveur.js (qui connaît
 *     seul le contexte HTTPS/HTTP de la réponse) : ce module renvoie un
 *     jeton clair (connexion) ou rien (déconnexion), jamais l'en-tête brut.
 *
 * Zéro dépendance externe.
 */

const crypto = require('node:crypto');
const db = require('./db.js');
const comptes = require('./comptes.js');
const sessions = require('./sessions.js');
const { creerPremierAdmin } = require('./creer-admin.js');

/**
 * Message d'échec de connexion UNIQUE (règle non négociable V9-E5),
 * rendu sur TOUS les refus : login inexistant, compte désactivé, mot de
 * passe faux, compte verrouillé. Il n'AFFIRME aucune cause (en désigner
 * une serait fausse dans les autres cas — motif faux, doctrine maison) et
 * les énonce toutes : rien à apprendre en comparant les réponses.
 */
const MSG_ECHEC_CONNEXION =
  'Connexion refusée : vérifiez l\'identifiant et le mot de passe. Après ' +
  'plusieurs échecs, le compte est temporairement verrouillé (15 minutes).';

/**
 * Couple hash+sel LEURRE, dérivé une seule fois au chargement du module. Sert
 * à faire payer un scrypt COMPLET même sur la branche « login inexistant ou
 * inactif », afin que le coût de vérification soit INDÉPENDANT de l'existence
 * du login : sans cela, un login absent répondrait quasi instantanément (une
 * lecture SQL) tandis qu'un login présent + mauvais mot de passe subirait le
 * délai d'un scrypt (~64 Mio), ce qui ouvrirait un oracle de temps permettant
 * d'énumérer les identifiants valides malgré le message d'échec unique. Le
 * mot de passe leurre n'est jamais valide (le hash provient d'un secret
 * aléatoire), on ignore donc le verdict : seul le COÛT compte.
 */
const SEL_LEURRE = crypto.randomBytes(comptes.LONGUEUR_SEL).toString('hex');
const HASH_LEURRE = comptes
  .deriverHash(crypto.randomBytes(32).toString('hex'), Buffer.from(SEL_LEURRE, 'hex'))
  .toString('hex');

/** Rôles admis à la création d'un compte (les 4 seuls rôles V9). */
const ROLES_COMPTE = ['ADMIN', 'REFERENT', 'ENSEIGNANT', 'ELEVE'];

/** Rôles exigeant un mot de passe long (habilitations sensibles). */
const ROLES_MOT_DE_PASSE_LONG = ['ADMIN', 'REFERENT'];

/** Longueur minimale du mot de passe pour ADMIN/REFERENT. */
const LONGUEUR_MIN_MOT_DE_PASSE_HABILITE = 10;

/** Longueur minimale du mot de passe pour ENSEIGNANT/ELEVE. */
const LONGUEUR_MIN_MOT_DE_PASSE_STANDARD = 8;

/**
 * Méthodes servies par ce routeur (préfixe /api/ retiré).
 *   - connexion / deconnexion : ouvertes (poser/lever une session).
 *   - creerCompte             : gardée ADMIN.
 *   - etatInitial             : lecture ouverte (l'app a-t-elle un compte ?),
 *                               interrogée AVANT toute connexion pour décider
 *                               d'afficher l'écran de premier lancement.
 *   - bootstrapAdmin          : création web du 1er ADMIN, gardée par
 *                               « aucun compte + loopback strict » (cf. handler).
 */
const METHODES = Object.freeze([
  'connexion', 'deconnexion', 'creerCompte', 'etatInitial', 'bootstrapAdmin',
  'listerComptes', 'reinitialiserMotDePasse', 'definirActivationCompte']);

/** Méthodes de ce routeur réservées au rôle ADMIN (gardées dans appeler()). */
const METHODES_ADMIN = new Set([
  'creerCompte', 'listerComptes', 'reinitialiserMotDePasse',
  'definirActivationCompte']);

/** Vrai si `methode` relève de ce routeur (sert d'aiguillage à serveur.js). */
function gereMethode(methode) {
  return METHODES.includes(methode);
}

/**
 * Applique la garde de rôle ADMIN (création de compte). Lève un Error
 * `.code = 403` AVANT tout effet si le rôle de session n'est pas ADMIN.
 */
function garderRoleAdmin(contexte) {
  const role = contexte?.role ?? null;
  if (role !== 'ADMIN') {
    const erreur = new Error(
      `Gestion des comptes réservée au rôle ADMIN — rôle courant : ` +
      `${role ?? 'aucun'}.`);
    erreur.code = 403;
    throw erreur;
  }
}

// ------------------------------------------------------------
// Handlers — un par méthode. Chacun renvoie un résultat sérialisable JSON ;
// les erreurs (Error avec .code) sont enveloppées par appeler().
// ------------------------------------------------------------

const HANDLERS = {
  /**
   * Connexion : vérifie login + mot de passe, gère le verrouillage, ouvre
   * une session en cas de succès. Renvoie { jetonClair, role, utilisateur }
   * — c'est serveur.js qui pose le cookie iwf_session à partir de
   * jetonClair (ce module ne connaît pas la réponse HTTP).
   */
  async connexion(params, contexte) {
    const login = typeof params?.login === 'string' ? params.login.trim() : '';
    const motDePasse = typeof params?.motDePasse === 'string'
      ? params.motDePasse : '';

    if (!login || !motDePasse) {
      const erreur = new Error(MSG_ECHEC_CONNEXION);
      erreur.code = 400;
      throw erreur;
    }

    const compte = db.get(
      `SELECT id, login, hash_mot_de_passe, sel, role, actif,
              echecs_consecutifs, verrouille_jusqua
       FROM utilisateurs_app WHERE login = ?`, [login]);

    // Coût de vérification INDÉPENDANT de l'existence du login : les deux
    // chemins (login présent / absent ou inactif) paient EXACTEMENT un scrypt.
    // Sur un login inexistant ou désactivé, on vérifie contre un couple
    // hash+sel LEURRE constant (dérivé au chargement du module) : le verdict
    // est ignoré, seul le délai identique importe. Sans cela, le temps de
    // réponse trahirait l'existence d'un identifiant (oracle de timing), alors
    // même que le message d'échec textuel est unique.
    if (!compte || !compte.actif) {
      await comptes.verifierMotDePasseAsync(motDePasse, HASH_LEURRE, SEL_LEURRE);
      const erreur = new Error(MSG_ECHEC_CONNEXION);
      erreur.code = 400;
      throw erreur;
    }

    // Le mot de passe est vérifié AVANT de trancher le verrou, pour que le coût
    // (un scrypt) soit payé sur TOUS les chemins d'un login existant et ne
    // réintroduise pas d'asymétrie de branche entre « verrouillé » et « pas
    // encore verrouillé ». Le verdict de la vérification n'est utilisé qu'après.
    const verdictMotDePasse = await comptes.verifierMotDePasseDetailAsync(
      motDePasse, compte.hash_mot_de_passe, compte.sel);
    const motDePasseValide = verdictMotDePasse.valide;

    // Un compte verrouillé refuse la tentative même avec le bon mot de passe
    // (décision V9-E5 maintenue) — mais avec le MÊME message et le MÊME code
    // que tout autre refus : l'ancien « Compte verrouillé. » (403) ne sortait
    // que pour un login EXISTANT, et confirmait donc l'identifiant en cinq
    // requêtes (4e relecture externe, tiré). L'échec n'est PAS enregistré
    // pendant le verrou : marteler un compte verrouillé ne prolonge rien.
    if (comptes.estVerrouille(compte)) {
      const erreur = new Error(MSG_ECHEC_CONNEXION);
      erreur.code = 400;
      throw erreur;
    }

    if (!motDePasseValide) {
      comptes.enregistrerEchec(compte.id);
      const erreur = new Error(MSG_ECHEC_CONNEXION);
      erreur.code = 400;
      throw erreur;
    }

    // P2-3 : un compte encore haché à l'ancien profil scrypt (N=2^15) est
    // re-haché au seul moment où le mot de passe en clair est disponible ET
    // prouvé. La DÉRIVATION (coûteuse) se fait ici, HORS transaction ;
    // l'ÉCRITURE reste dans la transaction ci-dessous.
    const renforce = verdictMotDePasse.rehashageRequis
      ? await comptes.hacherMotDePasseAsync(motDePasse)
      : null;

    // Succès : remise à zéro des échecs, dernière connexion, ouverture de
    // session — le tout dans une même transaction (ré-entrante : creerSession
    // ouvre déjà la sienne, elle rejoint celle-ci).
    const ip = contexte?.ip ?? null;
    const jetonClair = db.transaction(() => {
      if (renforce) {
        db.run(
          `UPDATE utilisateurs_app
           SET hash_mot_de_passe = ?, sel = ?
           WHERE id = ?`,
          [renforce.hash, renforce.sel, compte.id]);
        db.journaliser({
          qui: compte.login,
          action: 'RENFORCEMENT_HASH_MOT_DE_PASSE',
          cible: compte.id,
          details: `Migration transparente vers scrypt N=${comptes.SCRYPT_N}`,
        });
      }
      comptes.reinitialiserEchecs(compte.id);
      db.run(
        `UPDATE utilisateurs_app SET derniere_connexion = ? WHERE id = ?`,
        [new Date().toISOString(), compte.id]);
      return sessions.creerSession(compte.id, compte.role, ip);
    });

    return {
      jetonClair,
      role: compte.role,
      utilisateur: { id: compte.id, login: compte.login, role: compte.role }
    };
  },

  /**
   * Déconnexion : révoque la session portée par le jeton clair du cookie
   * (jamais du corps — le cookie est HttpOnly, un client JS ne le lit pas
   * de toute façon ; serveur.js extrait le jeton du cookie ENTRANT et le
   * pose dans contexte.jetonClair avant d'appeler ce handler). No-op
   * silencieux si le jeton est absent ou déjà inconnu (idempotent, cf.
   * sessions.revoquerSession) — serveur.js efface le cookie ensuite.
   */
  deconnexion(params, contexte) {
    const jetonClair = contexte?.jetonClair;
    if (typeof jetonClair === 'string' && jetonClair.length > 0) {
      sessions.revoquerSession(jetonClair);
    }
    return { deconnecte: true };
  },

  /**
   * État d'initialisation de l'installation : y a-t-il DÉJÀ au moins un compte ?
   * Lecture ouverte (aucune donnée sensible : uniquement un booléen), consultée
   * par le front au démarrage du Mode Local pour décider s'il faut afficher
   * l'écran de premier lancement (« Créer le compte administrateur ») plutôt
   * que l'écran de connexion.
   */
  etatInitial() {
    const compte = db.get('SELECT id FROM utilisateurs_app LIMIT 1');
    return { initialise: Boolean(compte) };
  },

  /**
   * Premier lancement — création WEB du 1er compte ADMIN, puis connexion
   * immédiate. Remplace la fenêtre CLI (creer-admin.js) sur le chemin nominal
   * du paquet portable : plus de fenêtre noire, plus d'impasse « base créée
   * sans admin ».
   *
   * Gardes (l'esprit E5 « pas d'inscription libre » est PRÉSERVÉ) :
   *   - LOOPBACK STRICT : uniquement depuis le poste où tourne le serveur,
   *     JAMAIS via le LAN (même IWF_LAN=1 : le bootstrap n'est pas une opération
   *     de réseau). contexte.loopback est déterminé côté serveur (adresse de la
   *     socket), jamais depuis le corps de la requête.
   *   - FENÊTRE UNIQUE : refusé dès qu'un compte — quel qu'il soit — existe.
   *     La création réelle (creerPremierAdmin) re-vérifie de son côté qu'aucun
   *     ADMIN n'existe et journalise BOOTSTRAP_ADMIN dans une transaction ;
   *     Node étant mono-fil et DatabaseSync synchrone, deux requêtes de
   *     bootstrap ne peuvent pas s'entrelacer (la seconde voit le compte créé
   *     par la première et tombe en 403).
   */
  bootstrapAdmin(params, contexte) {
    if (!contexte || contexte.loopback !== true) {
      const erreur = new Error(
        'Création du compte administrateur possible uniquement depuis le ' +
        'poste où tourne inerWeb Fluide (pas à distance).');
      erreur.code = 403;
      throw erreur;
    }
    const dejaUnCompte = db.get('SELECT id FROM utilisateurs_app LIMIT 1');
    if (dejaUnCompte) {
      const erreur = new Error(
        'inerWeb Fluide est déjà initialisé : un compte existe. ' +
        'Connectez-vous.');
      erreur.code = 403;
      throw erreur;
    }

    const login = typeof params?.login === 'string' ? params.login.trim() : '';
    const motDePasse = typeof params?.motDePasse === 'string'
      ? params.motDePasse : '';

    // creerPremierAdmin (creer-admin.js, déjà couvert par test-bootstrap.mjs)
    // porte les règles métier : identifiant obligatoire, mot de passe ≥ 10
    // caractères, unicité du login, refus d'un 2e ADMIN, insertion + journal
    // BOOTSTRAP_ADMIN dans une transaction. Ses Error portent un message
    // français ; on les laisse remonter telles quelles (code 400 par défaut).
    const admin = creerPremierAdmin(login, motDePasse);

    // Connexion immédiate : on ouvre une session comme /api/connexion, pour que
    // l'utilisateur entre directement dans l'application après création.
    const ip = contexte?.ip ?? null;
    const jetonClair = sessions.creerSession(admin.id, admin.role, ip);
    return {
      jetonClair,
      role: admin.role,
      utilisateur: { id: admin.id, login: admin.login, role: admin.role },
    };
  },

  /**
   * Création d'un compte — GARDÉE ADMIN (garderRoleAdmin, appliquée dans
   * appeler() avant ce handler). Unicité du login, rôle parmi les 4 admis,
   * longueur minimale selon le rôle, hachage scrypt, insertion, journal.
   */
  creerCompte(params) {
    const login = typeof params?.login === 'string' ? params.login.trim() : '';
    const motDePasseInitial = typeof params?.motDePasseInitial === 'string'
      ? params.motDePasseInitial : '';
    const role = params?.role;
    const personnelId = params?.personnelId ?? null;

    if (!login) {
      const erreur = new Error('Identifiant de connexion obligatoire.');
      erreur.code = 400;
      throw erreur;
    }
    if (!ROLES_COMPTE.includes(role)) {
      const erreur = new Error(
        `Rôle obligatoire parmi : ${ROLES_COMPTE.join(', ')}.`);
      erreur.code = 400;
      throw erreur;
    }
    const longueurMin = ROLES_MOT_DE_PASSE_LONG.includes(role)
      ? LONGUEUR_MIN_MOT_DE_PASSE_HABILITE
      : LONGUEUR_MIN_MOT_DE_PASSE_STANDARD;
    if (motDePasseInitial.length < longueurMin) {
      const erreur = new Error(
        `Mot de passe trop court : ${longueurMin} caractères minimum pour ` +
        `le rôle ${role}.`);
      erreur.code = 400;
      throw erreur;
    }

    const existant = db.get(
      'SELECT id FROM utilisateurs_app WHERE login = ?', [login]);
    if (existant) {
      const erreur = new Error(`Identifiant déjà utilisé : ${login}.`);
      erreur.code = 400;
      throw erreur;
    }

    if (personnelId) {
      const personne = db.get(
        'SELECT id FROM personnel WHERE id = ?', [personnelId]);
      if (!personne) {
        const erreur = new Error(`Personne introuvable : ${personnelId}.`);
        erreur.code = 400;
        throw erreur;
      }
    }

    const { hash, sel } = comptes.hacherMotDePasse(motDePasseInitial);
    const id = db.generateId('UTI');

    return db.transaction(() => {
      db.run(
        `INSERT INTO utilisateurs_app
           (id, login, hash_mot_de_passe, sel, role, personnel_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, login, hash, sel, role, personnelId]);
      db.journaliser({
        qui: null,
        action: 'CREATION_COMPTE',
        cible: login,
        details: `role=${role}`,
      });
      const ligne = db.get(
        `SELECT id, login, role, personnel_id, actif, date_creation
         FROM utilisateurs_app WHERE id = ?`, [id]);
      return {
        id: ligne.id,
        login: ligne.login,
        role: ligne.role,
        personnelId: ligne.personnel_id,
        actif: ligne.actif === 1,
        dateCreation: ligne.date_creation
      };
    });
  },

  /**
   * Liste des comptes de connexion — GARDÉE ADMIN. Ne renvoie JAMAIS le hash
   * ni le sel : seulement l'identité, le rôle, l'état d'activation, les dates
   * et l'état de verrouillage courant (pour l'écran de gestion des comptes).
   */
  listerComptes() {
    const lignes = db.all(
      `SELECT id, login, role, actif, personnel_id,
              date_creation, derniere_connexion, verrouille_jusqua
       FROM utilisateurs_app
       ORDER BY role, login`);
    const maintenant = Date.now();
    return lignes.map((l) => ({
      id: l.id,
      login: l.login,
      role: l.role,
      actif: l.actif === 1,
      personnelId: l.personnel_id,
      dateCreation: l.date_creation,
      derniereConnexion: l.derniere_connexion,
      verrouille: Boolean(l.verrouille_jusqua
        && new Date(l.verrouille_jusqua).getTime() > maintenant),
    }));
  },

  /**
   * Réinitialise le mot de passe d'un compte — GARDÉE ADMIN. Re-hache
   * (scrypt + sel frais), **lève le verrou** et remet le compteur d'échecs à
   * zéro (un compte bloqué est ainsi déverrouillé par le changement), puis
   * **révoque toutes les sessions ouvertes** de ce compte (le nouveau mot de
   * passe implique une reconnexion). Longueur minimale selon le rôle.
   */
  reinitialiserMotDePasse(params, contexte) {
    const id = typeof params?.id === 'string' ? params.id : '';
    const nouveauMotDePasse = typeof params?.nouveauMotDePasse === 'string'
      ? params.nouveauMotDePasse : '';
    if (!id) {
      const erreur = new Error('Compte cible obligatoire.');
      erreur.code = 400;
      throw erreur;
    }
    const compte = db.get(
      'SELECT id, login, role FROM utilisateurs_app WHERE id = ?', [id]);
    if (!compte) {
      const erreur = new Error('Compte introuvable.');
      erreur.code = 400;
      throw erreur;
    }
    const longueurMin = ROLES_MOT_DE_PASSE_LONG.includes(compte.role)
      ? LONGUEUR_MIN_MOT_DE_PASSE_HABILITE
      : LONGUEUR_MIN_MOT_DE_PASSE_STANDARD;
    if (nouveauMotDePasse.length < longueurMin) {
      const erreur = new Error(
        `Mot de passe trop court : ${longueurMin} caractères minimum pour ` +
        `le rôle ${compte.role}.`);
      erreur.code = 400;
      throw erreur;
    }

    const { hash, sel } = comptes.hacherMotDePasse(nouveauMotDePasse);
    return db.transaction(() => {
      db.run(
        `UPDATE utilisateurs_app
         SET hash_mot_de_passe = ?, sel = ?, echecs_consecutifs = 0,
             verrouille_jusqua = NULL
         WHERE id = ?`,
        [hash, sel, id]);
      sessions.revoquerToutesLesSessions(id);
      db.journaliser({
        qui: contexte?.utilisateur ?? null,
        action: 'REINIT_MOT_DE_PASSE',
        cible: compte.login,
        details: `role=${compte.role}`,
      });
      return { id: compte.id, login: compte.login, role: compte.role };
    });
  },

  /**
   * Active ou désactive un compte — GARDÉE ADMIN. La désactivation est la
   * « suppression douce » : le compte n'est jamais effacé (traçabilité), mais
   * il ne peut plus se connecter et ses sessions ouvertes sont **révoquées
   * immédiatement** (sans attendre l'expiration de 8 h ; `verifierSession`
   * refuse déjà `actif=0`, on ajoute la révocation pour couper net).
   *
   * Garde-fous anti-verrouillage total (sinon l'ADMIN pourrait s'enfermer
   * dehors) : on ne peut ni **désactiver son propre compte**, ni **désactiver
   * le dernier ADMIN actif**.
   */
  definirActivationCompte(params, contexte) {
    const id = typeof params?.id === 'string' ? params.id : '';
    const actif = params?.actif === true;
    if (!id) {
      const erreur = new Error('Compte cible obligatoire.');
      erreur.code = 400;
      throw erreur;
    }
    const compte = db.get(
      'SELECT id, login, role, actif FROM utilisateurs_app WHERE id = ?', [id]);
    if (!compte) {
      const erreur = new Error('Compte introuvable.');
      erreur.code = 400;
      throw erreur;
    }

    if (!actif) {
      if (contexte?.utilisateur && contexte.utilisateur === id) {
        const erreur = new Error(
          'Vous ne pouvez pas désactiver votre propre compte.');
        erreur.code = 400;
        throw erreur;
      }
      if (compte.role === 'ADMIN') {
        const autres = db.get(
          `SELECT COUNT(*) AS n FROM utilisateurs_app
           WHERE role = 'ADMIN' AND actif = 1 AND id <> ?`, [id]);
        if (!autres || autres.n === 0) {
          const erreur = new Error(
            'Impossible de désactiver le dernier administrateur actif.');
          erreur.code = 400;
          throw erreur;
        }
      }
    }

    return db.transaction(() => {
      db.run('UPDATE utilisateurs_app SET actif = ? WHERE id = ?',
        [actif ? 1 : 0, id]);
      if (!actif) sessions.revoquerToutesLesSessions(id);
      db.journaliser({
        qui: contexte?.utilisateur ?? null,
        action: actif ? 'REACTIVATION_COMPTE' : 'DESACTIVATION_COMPTE',
        cible: compte.login,
        details: `role=${compte.role}`,
      });
      return {
        id: compte.id, login: compte.login, role: compte.role, actif,
      };
    });
  }
};

/**
 * Point d'entrée du routeur. Applique la garde ADMIN pour creerCompte
 * (connexion/deconnexion restent ouvertes — c'est leur rôle), puis le
 * handler. Renvoie le RÉSULTAT nu ; l'enveloppe { ok, resultat } est posée
 * par serveur.js (identique à traiterApi / routes-sauvegarde).
 * ASYNCHRONE depuis A14 (13/08) : `connexion` attend ses scrypt hors de la
 * boucle d'événements ; les autres handlers, synchrones, sont simplement
 * enveloppés dans la promesse.
 * @param {string} methode - sans le préfixe /api/
 * @param {object} params
 * @param {{role?: string, ip?: string}} contexte
 * @returns {Promise<object>} résultat sérialisable
 */
async function appeler(methode, params, contexte) {
  const handler = HANDLERS[methode];
  if (!handler) {
    const erreur = new Error(`Route de compte inconnue : ${methode}.`);
    erreur.code = 501;
    throw erreur;
  }
  if (METHODES_ADMIN.has(methode)) {
    garderRoleAdmin(contexte);
  }
  return handler(params ?? {}, contexte ?? {});
}

module.exports = {
  ROLES_COMPTE,
  METHODES,
  MSG_ECHEC_CONNEXION,
  gereMethode,
  appeler
};
