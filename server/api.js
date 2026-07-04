'use strict';

/**
 * inerWeb Fluide — Dispatcher de l'API DataStore (Mode Local, V9-E3).
 * =================================================================
 * SEUL point serveur qui connaît à la fois SQL (via db.js), la
 * correspondance front↔SQL (mapping.js) et le CONTRAT. Une fonction
 * par méthode du contrat ; `appeler(methode, params, contexte)`
 * orchestre : garde de rôle (403 AVANT tout effet), puis handler.
 *
 * Vérité unique = v8/js/data/test-contrat.mjs : la sémantique
 * (formes de retour, tris, messages français, signes) reprend celle
 * du DemoStore méthode par méthode. On ne réinvente rien.
 *
 * Aide `muter(fn)` : ouvre la transaction ambiante (db.transaction est
 * ré-entrant, donc journaliser() y reste inclus), exécute l'effet, et
 * ne journalise JAMAIS hors de cette transaction.
 *
 * VAGUE 1 (ossature) : dispatcher, enveloppe, ROLES_MUTATION, METHODES.
 * VAGUE 2 (lectures + amorçage) : les 12 lectures d'état + amorçage de
 * l'établissement singleton. Les mutations arrivent aux vagues suivantes
 * (elles lèvent « non implémentée » d'ici là, ce qui arrête proprement
 * le test-contrat local à la section 3, comme prévu).
 */

const db = require('./db.js');
const mapping = require('./mapping.js');
const { hasherMouvement } = require('./hash-mouvement.js');

// ------------------------------------------------------------
// Identité de l'établissement singleton (le front le traite sans id).
// ------------------------------------------------------------
const ID_ETABLISSEMENT = 'ETB-LOCAL';

// ------------------------------------------------------------
// Constantes métier (reprises EXACTES du DemoStore).
// ------------------------------------------------------------

/** Types de personnes du registre du personnel (SPEC §5.2). */
const TYPES_PERSONNE = ['ENSEIGNANT', 'ELEVE', 'SALARIE', 'SOUS_TRAITANT',
  'INTERVENANT_EXT'];

/** Activités réglementées (attestation de capacité et d'aptitude). */
const ACTIVITES_REGLEMENTEES = ['MISE_EN_SERVICE', 'MAINTENANCE', 'CONTROLE',
  'RECUPERATION', 'DEMANTELEMENT'];

/** Catégories d'attestation (grilles 2008 et 2025). */
const CATEGORIES_ATTESTATION = ['I', 'II', 'III', 'IV'];

/** IM-4 : tolérance de charge résiduelle pour démanteler (± 0,05 kg). */
const TOLERANCE_CHARGE_RESIDUELLE_KG = 0.05;

/** Types de mouvements admis par le registre (SPEC §7.1). */
const TYPES_MOUVEMENT = ['CHARGE_APPOINT', 'MISE_EN_SERVICE',
  'RECUPERATION_MAINTENANCE', 'RECUPERATION_DEMANTELEMENT', 'TRANSFERT'];

/** Rôles autorisés à VALIDER une écriture (jamais un élève). */
const ROLES_VALIDEURS = ['REFERENT', 'ENSEIGNANT', 'ADMIN'];

/** Message unique d'écriture figée (contrat Phase B) — repris MOT POUR MOT. */
const MSG_ECRITURE_FIGEE =
  'Écriture validée : correction uniquement par contre-écriture.';

/**
 * Formate un nombre en fr-FR avec un nombre fixe de décimales (« 4,20 »).
 * CLONE EXACT de v8/js/core/utils.js:fmtNombre : les messages d'erreur du
 * registre (débordement, surcharge, stock insuffisant) doivent être
 * IDENTIQUES à ceux du DemoStore, séparateur de milliers compris.
 */
function fmtNombre(n, dec = 2) {
  const valeur = Number(n);
  if (!Number.isFinite(valeur)) return '—';
  return valeur.toLocaleString('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
}

/** Valide une catégorie d'attestation (null accepté : non attesté). */
function verifierCategorie(valeur, champ) {
  if (valeur === null || valeur === undefined) return null;
  if (!CATEGORIES_ATTESTATION.includes(valeur)) {
    throw new Error(
      `Catégorie d'attestation inconnue pour ${champ} : ${valeur} ` +
      `(attendu : ${CATEGORIES_ATTESTATION.join(', ')}).`);
  }
  return valeur;
}

/** Valide une liste d'activités réglementées. */
function verifierActivites(liste) {
  const activites = liste ?? [];
  if (!Array.isArray(activites)) {
    throw new Error('Liste d’activités réglementées attendue.');
  }
  for (const activite of activites) {
    if (!ACTIVITES_REGLEMENTEES.includes(activite)) {
      throw new Error(
        `Activité réglementée inconnue : ${activite} ` +
        `(attendu : ${ACTIVITES_REGLEMENTEES.join(', ')}).`);
    }
  }
  return [...activites];
}

// ------------------------------------------------------------
// Rôles habilités par méthode de MUTATION (403 côté route, AVANT
// effet). Cohérent avec ROLES_VALIDEURS = [REFERENT, ENSEIGNANT, ADMIN]
// (jamais ELEVE). Une méthode absente de cette table est une LECTURE
// (aucune restriction en E3). Voir docs/E3-PLAN.md §Rôles.
// ------------------------------------------------------------
const VALIDEUR = ['REFERENT', 'ENSEIGNANT', 'ADMIN'];
const OPERATEUR = ['REFERENT', 'ENSEIGNANT', 'ADMIN', 'ELEVE', 'TECHNICIEN'];

const ROLES_MUTATION = {
  // Niveau VALIDEUR (fige / scelle / intégrité)
  validerMouvement: VALIDEUR,
  annulerParContreEcriture: VALIDEUR,
  importerJSON: VALIDEUR,
  updateEtablissement: VALIDEUR,
  createAuditOrganisme: VALIDEUR,
  createNonConformite: VALIDEUR,
  solderNonConformite: VALIDEUR,
  desactiverPersonne: VALIDEUR,
  reformerOutil: VALIDEUR,
  justifierEcart: VALIDEUR,
  saisirInventaire: VALIDEUR,
  createBsff: VALIDEUR,
  retournerFournisseur: VALIDEUR,
  deciderFluideRecupere: VALIDEUR,

  // Niveau OPERATEUR (saisie courante, ELEVE inclus)
  creerMouvement: OPERATEUR,
  soumettreMouvement: OPERATEUR,
  rejeterMouvement: OPERATEUR,
  supprimerMouvement: OPERATEUR,
  createMachine: OPERATEUR,
  updateMachine: OPERATEUR,
  arreterMachine: OPERATEUR,
  demantelerMachine: OPERATEUR,
  remettreEnService: OPERATEUR,
  createClient: OPERATEUR,
  updateClient: OPERATEUR,
  createBouteille: OPERATEUR,
  updateBouteille: OPERATEUR,
  peserBouteille: OPERATEUR,
  createControle: OPERATEUR,
  createPersonne: OPERATEUR,
  updatePersonne: OPERATEUR,
  createOutil: OPERATEUR,
  updateOutil: OPERATEUR,
  ajouterPieceJointe: OPERATEUR,
  supprimerPieceJointe: OPERATEUR
};

// ------------------------------------------------------------
// Aides internes
// ------------------------------------------------------------

/**
 * Ouvre la transaction ambiante et exécute l'effet + la journalisation
 * dans le MÊME tout-ou-rien (db.transaction est ré-entrant : un
 * journaliser() imbriqué rejoint la transaction au lieu de la saborder).
 * Ne JAMAIS journaliser hors de cette transaction.
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
function muter(fn) {
  return db.transaction(() => fn());
}

/** Arrondi métier au gramme (identique au DemoStore : évite la dérive). */
function arrondir(valeur) {
  return Math.round(valeur * 1000) / 1000;
}

/**
 * Date du jour au format LOCAL AAAA-MM-JJ (jamais toISOString, qui
 * décalerait d'un jour près de minuit). Identique au DemoStore.
 */
function aujourdHui() {
  const d = new Date();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/**
 * IM-1 : ajoute des mois à une date ISO, sans fuseau horaire. Un
 * débordement de fin de mois est ramené au dernier jour du mois cible
 * (31/01 + 1 mois → 28 ou 29/02, jamais le 3 mars). CLONE EXACT de
 * ajouterMois du DemoStore.
 */
function ajouterMois(iso, nbMois) {
  const [annee, mois, jour] = iso.split('-').map(Number);
  const d = new Date(annee, mois - 1 + nbMois, jour);
  if (d.getDate() !== jour) d.setDate(0);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/**
 * INSÈRE une ligne SQL (déjà en colonnes snake_case) dans `table`.
 * Les colonnes NULL sont incluses (défauts du schéma sinon appliqués).
 */
function inserer(table, ligne) {
  const colonnes = Object.keys(ligne);
  const marques = colonnes.map(() => '?').join(', ');
  db.run(
    `INSERT INTO ${table} (${colonnes.join(', ')}) VALUES (${marques})`,
    colonnes.map((c) => ligne[c]));
}

/**
 * MET À JOUR une ligne SQL par id (colonnes snake_case). Ne touche que
 * les colonnes fournies (patch partiel). N'écrit rien si `ligne` est vide.
 */
function majParId(table, id, ligne) {
  const colonnes = Object.keys(ligne);
  if (colonnes.length === 0) return;
  const affectations = colonnes.map((c) => `${c} = ?`).join(', ');
  db.run(
    `UPDATE ${table} SET ${affectations} WHERE id = ?`,
    [...colonnes.map((c) => ligne[c]), id]);
}

/** Écrit une entrée au journal d'audit (chaîné, dans la transaction ambiante). */
function journaliser(qui, action, cible, details) {
  db.journaliser({ qui: qui ?? null, action, cible, details });
}

/** Amorce l'établissement singleton VIDE s'il n'existe pas encore. */
function amorcerEtablissement() {
  const existe = db.get(
    'SELECT id FROM etablissements WHERE id = ?', [ID_ETABLISSEMENT]);
  if (existe) return;
  // Toutes les colonnes utiles restent NULL : le contrat lit un dossier
  // opérateur VIDE mais complet (toutes ses clés présentes, à null).
  // raison_sociale est NOT NULL au schéma → chaîne vide (dossier à saisir).
  db.run(
    `INSERT INTO etablissements (id, raison_sociale) VALUES (?, '')`,
    [ID_ETABLISSEMENT]);
}

// ------------------------------------------------------------
// HANDLERS — une fonction par méthode du contrat.
// Chaque handler reçoit (params, contexte) et renvoie la forme
// camelCase EXACTE du contrat (via mapping.versFront + reconstitutions).
// ------------------------------------------------------------

const HANDLERS = {

  // === initialisation =======================================
  init() {
    amorcerEtablissement();
    // Vérification d'intégrité (posée dans registreAltere côté LocalStore).
    // En V2 la chaîne des mouvements est vide → sain. La vérification fine
    // de la chaîne de hash arrivera avec le registre (vague 5).
    const journal = db.verifierChaineJournal();
    if (!journal.ok) {
      return { ok: false, casseA: journal.casseA };
    }
    return null;
  },

  // === lectures d'état (VAGUE 2) ============================

  /** Le référentiel des fluides, nbMachines recalculé (non démantelées). */
  getFluides() {
    const lignes = db.all('SELECT * FROM fluides ORDER BY code');
    return lignes.map((ligne) => {
      const fluide = mapping.versFront('fluides', ligne);
      const { n } = db.get(
        `SELECT count(*) AS n FROM machines
         WHERE fluide = ? AND statut <> 'DEMANTELEE'`, [ligne.code]);
      fluide.nbMachines = n;
      return fluide;
    });
  },

  /** L'établissement (dossier opérateur) — copie complète, amorcée si absente. */
  getEtablissement() {
    amorcerEtablissement();
    const ligne = db.get(
      'SELECT * FROM etablissements WHERE id = ?', [ID_ETABLISSEMENT]);
    return mapping.versFront('etablissements', ligne);
  },

  /** État d'intégrité constaté : { altere, casseA }. */
  getEtatRegistre() {
    const journal = db.verifierChaineJournal();
    if (!journal.ok) {
      return { altere: true, casseA: journal.casseA };
    }
    return { altere: false, casseA: null };
  },

  /** Alertes calculées à la volée, CRITIQUE d'abord (vide au départ). */
  getAlertes() {
    // VAGUE 2 : le calcul complet des alertes (aptitudes, contrôles,
    // écarts…) suit la mise en place des données. Un registre vierge
    // ne porte aucune alerte : tableau vide, conforme au contrat.
    return [];
  },

  /** Tout le personnel (jamais supprimé : seulement désactivé). */
  getPersonnel() {
    const lignes = db.all(
      'SELECT * FROM personnel ORDER BY date_creation, id');
    return lignes.map((ligne) => mapping.versFront('personnel', ligne));
  },

  /** Les clients détenteurs, nbMachines recalculé (non démantelées). */
  getClients() {
    // clients_detenteurs n'a pas de date_creation au schéma : rowid tient
    // l'ordre d'insertion (le contrat ne teste pas l'ordre, mais on reste
    // déterministe).
    const lignes = db.all(
      'SELECT * FROM clients_detenteurs ORDER BY rowid');
    return lignes.map((ligne) => {
      const client = mapping.versFront('clients_detenteurs', ligne);
      const { n } = db.get(
        `SELECT count(*) AS n FROM machines
         WHERE client_detenteur_id = ? AND statut <> 'DEMANTELEE'`,
        [ligne.id]);
      client.nbMachines = n;
      return client;
    });
  },

  /** Toutes les machines, démantelées incluses (les vues filtrent). */
  getMachines() {
    const lignes = db.all(
      'SELECT * FROM machines ORDER BY date_creation, id');
    return lignes.map((ligne) => mapping.versFront('machines', ligne));
  },

  /** Toutes les bouteilles ; masseNetteKg = brute − tare (colonne calculée). */
  getBouteilles() {
    const lignes = db.all(
      'SELECT * FROM bouteilles ORDER BY date_creation, id');
    return lignes.map((ligne) => mapping.versFront('bouteilles', ligne));
  },

  /** Tous les mouvements, triés date puis numéro décroissants. */
  getMouvements() {
    const lignes = db.all(
      `SELECT * FROM mouvements
       ORDER BY date_mouvement DESC, numero DESC`);
    return lignes.map((ligne) => reconstituerMouvement(ligne));
  },

  /** Tous les contrôles d'étanchéité, triés date décroissante. */
  getControles() {
    const lignes = db.all(
      'SELECT * FROM controles ORDER BY date_controle DESC');
    return lignes.map((ligne) => mapping.versFront('controles', ligne));
  },

  /** Outillage avec statut RECALCULÉ à la lecture. */
  getOutillage() {
    const lignes = db.all(
      'SELECT * FROM outillage ORDER BY date_creation, id');
    return lignes.map((ligne) => mapping.versFront('outillage', ligne));
  },

  /** Le journal d'audit append-only { date, qui, action, cible, details }. */
  getJournalAudit() {
    const lignes = db.all(
      `SELECT date_heure, utilisateur, action, cible, details
       FROM journal_audit ORDER BY id`);
    return lignes.map((ligne) => mapping.versFront('journal_audit', ligne));
  },

  /**
   * Utilisateur courant : premier REFERENT du personnel (l'authentification
   * arrive en E5). Error si aucun référent — identique au DemoStore.
   */
  getUtilisateurCourant() {
    const ligne = db.get(
      `SELECT * FROM personnel WHERE role_applicatif = 'REFERENT'
       ORDER BY date_creation, id LIMIT 1`);
    if (!ligne) throw new Error('Aucun référent dans le personnel.');
    return mapping.versFront('personnel', ligne);
  },

  // === personnel (VAGUE 3) ==================================

  /**
   * Crée une personne. roleApp par défaut : ELEVE si typePersonne ELEVE,
   * sinon ENSEIGNANT (le test crée un référent via roleApp explicite).
   */
  createPersonne(params) {
    const d = params.donneesPersonne || {};
    if (!d.nom || !String(d.nom).trim()) {
      throw new Error('Nom de la personne obligatoire.');
    }
    if (!d.prenom || !String(d.prenom).trim()) {
      throw new Error('Prénom de la personne obligatoire.');
    }
    if (!TYPES_PERSONNE.includes(d.typePersonne)) {
      throw new Error(
        `Type de personne obligatoire parmi : ${TYPES_PERSONNE.join(', ')}.`);
    }
    const personne = {
      id: db.generateId('PER'),
      nom: String(d.nom).trim(),
      prenom: String(d.prenom).trim(),
      typePersonne: d.typePersonne,
      roleApp: d.roleApp ??
        (d.typePersonne === 'ELEVE' ? 'ELEVE' : 'ENSEIGNANT'),
      numAttestationAptitude: d.numAttestationAptitude ?? null,
      organismeDelivreur: d.organismeDelivreur ?? null,
      dateObtention: d.dateObtention ?? null,
      dateFinValidite: d.dateFinValidite ?? null,
      categorie2008: verifierCategorie(d.categorie2008, 'la grille 2008'),
      categorie2025: verifierCategorie(d.categorie2025, 'la grille 2025'),
      activitesAutorisees: verifierActivites(d.activitesAutorisees),
      actif: d.actif !== false,
      email: d.email ?? null
    };
    return muter(() => {
      const ligne = mapping.versSql('personnel', personne);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('personnel', ligne);
      journaliser(d.operateur, 'CREATION_PERSONNE',
        `${personne.prenom} ${personne.nom}`, personne.typePersonne);
      return lirePersonne(personne.id);
    });
  },

  updatePersonne(params) {
    const { id } = params;
    const d = params.donneesPersonne || {};
    trouverPersonne(id);
    if (d.typePersonne !== undefined &&
        !TYPES_PERSONNE.includes(d.typePersonne)) {
      throw new Error(
        `Type de personne inconnu : ${d.typePersonne} ` +
        `(attendu : ${TYPES_PERSONNE.join(', ')}).`);
    }
    if (d.categorie2008 !== undefined) {
      verifierCategorie(d.categorie2008, 'la grille 2008');
    }
    if (d.categorie2025 !== undefined) {
      verifierCategorie(d.categorie2025, 'la grille 2025');
    }
    if (d.activitesAutorisees !== undefined) {
      verifierActivites(d.activitesAutorisees);
    }
    const CHAMPS = ['nom', 'prenom', 'typePersonne', 'roleApp',
      'numAttestationAptitude', 'organismeDelivreur', 'dateObtention',
      'dateFinValidite', 'categorie2008', 'categorie2025',
      'activitesAutorisees', 'actif', 'email'];
    const patch = {};
    for (const champ of CHAMPS) {
      if (d[champ] !== undefined) patch[champ] = d[champ];
    }
    return muter(() => {
      majParId('personnel', id, mapping.versSql('personnel', patch));
      const personne = lirePersonne(id);
      journaliser(d.operateur, 'MODIFICATION_PERSONNE',
        `${personne.prenom} ${personne.nom}`,
        `Champs : ${Object.keys(patch).join(', ')}`);
      return personne;
    });
  },

  desactiverPersonne(params) {
    const { id } = params;
    const personne = trouverPersonne(id);
    if (!personne.actif) {
      throw new Error(
        `${personne.prenom} ${personne.nom} est déjà désactivé(e).`);
    }
    return muter(() => {
      majParId('personnel', id, { actif: 0 });
      journaliser(params.par, 'DESACTIVATION_PERSONNE',
        `${personne.prenom} ${personne.nom}`,
        'Désactivation (la personne reste au registre : aucune suppression)');
      return lirePersonne(id);
    });
  },

  // === clients détenteurs (VAGUE 3) =========================

  createClient(params) {
    const d = params.donneesClient || {};
    const raisonSociale = String(d.raisonSociale || '').trim();
    if (!raisonSociale) {
      throw new Error('Raison sociale obligatoire.');
    }
    const adresse = String(d.adresse || '').trim();
    if (!adresse) {
      throw new Error('Adresse obligatoire.');
    }
    const siret = String(d.siret || '').trim();
    if (!/^\d{14}$/.test(siret.replace(/[\s.-]/g, ''))) {
      throw new Error('SIRET invalide : 14 chiffres attendus.');
    }
    const client = {
      id: db.generateId('CLI'),
      raisonSociale,
      adresse,
      siret
    };
    return muter(() => {
      const ligne = mapping.versSql('clients_detenteurs', client);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('clients_detenteurs', ligne);
      journaliser(d.operateur, 'CREATION_CLIENT', client.raisonSociale,
        `SIRET ${siret}`);
      return lireClient(client.id);
    });
  },

  updateClient(params) {
    const { id } = params;
    const d = params.donneesClient || {};
    trouverClient(id);
    if (d.siret !== undefined &&
        !/^\d{14}$/.test(String(d.siret).trim().replace(/[\s.-]/g, ''))) {
      throw new Error('SIRET invalide : 14 chiffres attendus.');
    }
    const CHAMPS = ['raisonSociale', 'adresse', 'siret'];
    const patch = {};
    for (const champ of CHAMPS) {
      if (d[champ] !== undefined) patch[champ] = String(d[champ]).trim();
    }
    return muter(() => {
      majParId('clients_detenteurs', id,
        mapping.versSql('clients_detenteurs', patch));
      const client = lireClient(id);
      journaliser(d.operateur, 'MODIFICATION_CLIENT', client.raisonSociale,
        `Champs : ${Object.keys(patch).join(', ')}`);
      return client;
    });
  },

  // === machines (VAGUE 4) ===================================

  createMachine(params) {
    const d = params.donneesMachine || {};
    if (!d.designation || !String(d.designation).trim()) {
      throw new Error('Désignation de la machine obligatoire.');
    }
    if (!fluideConnu(d.fluide)) {
      throw new Error(`Fluide inconnu au référentiel : ${d.fluide}.`);
    }
    const nominale = Number(d.chargeNominaleKg);
    if (!Number.isFinite(nominale) || nominale <= 0) {
      throw new Error('Charge nominale obligatoire (en kg, positive).');
    }
    const client = d.clientId
      ? db.get('SELECT id, raison_sociale FROM clients_detenteurs WHERE id = ?',
        [d.clientId])
      : null;
    if (d.clientId && !client) {
      throw new Error(`Client / détenteur introuvable : ${d.clientId}.`);
    }

    // Code lisible : M7, M8… d'après le plus grand code existant (COMPTEUR).
    const maxCode = plusGrandCode('machines', 'code_interne', /^M(\d+)$/);

    const machine = {
      id: db.generateId('MAC'),
      code: `M${maxCode + 1}`,
      designation: String(d.designation).trim(),
      type: d.type ?? null,
      marque: d.marque ?? null,
      modele: d.modele ?? null,
      numSerie: d.numSerie ?? null,
      fluide: d.fluide,
      chargeNominaleKg: nominale,
      chargeActuelleKg: Number(d.chargeActuelleKg) || 0,
      clientId: d.clientId ?? null,
      localisation: d.localisation ?? null,
      siteLabel: d.siteLabel ?? client?.raison_sociale ?? null,
      statut: d.statut ?? 'EN_SERVICE',
      detectionPermanente: Boolean(d.detectionPermanente),
      dateMiseEnService: d.dateMiseEnService ?? null,
      dernierControle: d.dernierControle ?? null,
      prochainControle: d.prochainControle ?? null
    };
    return muter(() => {
      const ligne = mapping.versSql('machines', machine);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('machines', ligne);
      journaliser(d.operateur, 'CREATION_MACHINE', machine.code,
        `${machine.designation} (${machine.fluide})`);
      return lireMachine(machine.id);
    });
  },

  updateMachine(params) {
    const { id } = params;
    const machine = trouverMachine(id);
    if (machine.statut === 'DEMANTELEE') {
      throw new Error('Machine démantelée : modification interdite.');
    }
    const d = params.donneesMachine || {};
    if (d.fluide !== undefined && !fluideConnu(d.fluide)) {
      throw new Error(`Fluide inconnu au référentiel : ${d.fluide}.`);
    }
    const CHAMPS = ['designation', 'type', 'marque', 'modele', 'numSerie',
      'fluide', 'chargeNominaleKg', 'chargeActuelleKg', 'clientId',
      'localisation', 'siteLabel', 'statut', 'detectionPermanente',
      'dateMiseEnService', 'dernierControle', 'prochainControle'];
    const patch = {};
    for (const champ of CHAMPS) {
      if (d[champ] !== undefined) patch[champ] = d[champ];
    }
    return muter(() => {
      majParId('machines', id, mapping.versSql('machines', patch));
      journaliser(d.operateur, 'MODIFICATION_MACHINE', machine.code,
        `Champs : ${Object.keys(patch).join(', ')}`);
      return lireMachine(id);
    });
  },

  arreterMachine(params) {
    const { id } = params;
    const machine = trouverMachine(id);
    if (machine.statut === 'DEMANTELEE') {
      throw new Error('Machine démantelée : arrêt sans objet.');
    }
    if (machine.statut === 'ARRETEE') {
      throw new Error(`Machine ${machine.code} déjà à l’arrêt.`);
    }
    return muter(() => {
      majParId('machines', id, { statut: 'ARRETEE' });
      journaliser(params.par, 'ARRET_MACHINE', machine.code,
        `${machine.designation} mise à l’arrêt`);
      return lireMachine(id);
    });
  },

  demantelerMachine(params) {
    const { id } = params;
    const machine = trouverMachine(id);
    if (machine.statut === 'DEMANTELEE') {
      throw new Error(`Machine ${machine.code} déjà démantelée.`);
    }
    if (Math.abs(machine.chargeActuelleKg) > TOLERANCE_CHARGE_RESIDUELLE_KG) {
      throw new Error(
        `Démantèlement impossible : la machine ${machine.code} contient ` +
        `encore ${machine.chargeActuelleKg} kg de fluide. Récupérez ` +
        'd’abord le fluide (mouvement « Récupération — démantèlement »).');
    }
    return muter(() => {
      majParId('machines', id, { statut: 'DEMANTELEE' });
      journaliser(params.par, 'DEMANTELEMENT_MACHINE', machine.code,
        `${machine.designation} démantelée (charge résiduelle ` +
        `${machine.chargeActuelleKg} kg)`);
      return lireMachine(id);
    });
  },

  remettreEnService(params) {
    const { id } = params;
    const machine = trouverMachine(id);
    if (machine.statut === 'DEMANTELEE') {
      throw new Error(
        'Machine démantelée : remise en service impossible (définitif).');
    }
    if (machine.statut !== 'ARRETEE') {
      throw new Error(
        `Seule une machine à l’arrêt se remet en service ` +
        `(statut actuel : ${machine.statut}).`);
    }
    return muter(() => {
      majParId('machines', id, { statut: 'EN_SERVICE' });
      journaliser(params.par, 'REMISE_EN_SERVICE_MACHINE', machine.code,
        `${machine.designation} remise en service`);
      return lireMachine(id);
    });
  },

  // === bouteilles (VAGUE 4) =================================

  createBouteille(params) {
    const d = params.donneesBouteille || {};
    if (!fluideConnu(d.fluide)) {
      throw new Error(`Fluide inconnu au référentiel : ${d.fluide}.`);
    }
    if (d.type !== 'NEUVE' && d.type !== 'RECUPERATION') {
      throw new Error('Type de bouteille obligatoire : NEUVE ou RECUPERATION.');
    }
    const tare = Number(d.tareKg);
    const contenance = Number(d.contenanceMaxKg);
    if (!Number.isFinite(tare) || tare < 0) {
      throw new Error('Tare obligatoire (en kg, positive ou nulle).');
    }
    if (!Number.isFinite(contenance) || contenance <= 0) {
      throw new Error('Contenance maximale obligatoire (en kg, positive).');
    }
    const brute = d.masseBruteKg !== undefined ? Number(d.masseBruteKg) : tare;
    const nette = arrondir(brute - tare);
    if (nette < 0) {
      throw new Error('Masse brute inférieure à la tare : pesée incohérente.');
    }
    if (nette > contenance) {
      throw new Error('Masse nette supérieure à la contenance de la bouteille.');
    }

    // Code lisible : B-06, B-07… d'après le plus grand code existant (COMPTEUR).
    const maxCode = plusGrandCode('bouteilles', 'code_interne', /^B-?(\d+)$/);

    const bouteille = {
      id: db.generateId('BTL'),
      code: `B-${String(maxCode + 1).padStart(2, '0')}`,
      numeroReel: d.numeroReel ?? null,
      type: d.type,
      fluide: d.fluide,
      etatFluide: d.etatFluide ??
        (d.type === 'RECUPERATION' ? 'RECUPERE' : 'VIERGE'),
      tareKg: tare,
      masseBruteKg: arrondir(brute),
      // masseNetteKg est GÉNÉRÉE (colonne calculée) : jamais écrite.
      // CR-4 : masse nette à l'ENTRÉE en stock, FIGÉE à la création.
      masseEntreeKg: nette,
      contenanceMaxKg: contenance,
      proprietaire: d.proprietaire ?? null,
      lot: d.lot ?? null,
      dateEntree: d.dateEntree ?? aujourdHui(),
      datePesee: d.datePesee ?? aujourdHui(),
      statut: d.statut ?? 'EN_STOCK'
    };
    return muter(() => {
      const ligne = mapping.versSql('bouteilles', bouteille);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('bouteilles', ligne);
      journaliser(d.operateur, 'CREATION_BOUTEILLE', bouteille.code,
        `${bouteille.type} ${bouteille.fluide} (${bouteille.contenanceMaxKg} kg)`);
      return lireBouteille(bouteille.id);
    });
  },

  updateBouteille(params) {
    const { id } = params;
    const bouteille = trouverBouteille(id);
    const d = params.donneesBouteille || {};
    if (d.fluide !== undefined && !fluideConnu(d.fluide)) {
      throw new Error(`Fluide inconnu au référentiel : ${d.fluide}.`);
    }
    const CHAMPS = ['numeroReel', 'type', 'fluide', 'etatFluide', 'tareKg',
      'masseBruteKg', 'contenanceMaxKg', 'proprietaire', 'lot',
      'dateEntree', 'datePesee', 'statut'];
    const patch = {};
    for (const champ of CHAMPS) {
      if (d[champ] !== undefined) patch[champ] = d[champ];
    }
    // Cohérence : la masse nette découle toujours de brute − tare. La
    // colonne masse_nette_kg est GÉNÉRÉE : on ne l'écrit pas, mais on
    // VALIDE l'invariant sur les nouvelles valeurs avant d'écrire.
    if (d.masseBruteKg !== undefined || d.tareKg !== undefined) {
      const brute = d.masseBruteKg !== undefined
        ? Number(d.masseBruteKg) : bouteille.masseBruteKg;
      const tare = d.tareKg !== undefined ? Number(d.tareKg) : bouteille.tareKg;
      const contenance = d.contenanceMaxKg !== undefined
        ? Number(d.contenanceMaxKg) : bouteille.contenanceMaxKg;
      const nette = arrondir(brute - tare);
      if (nette < 0) {
        throw new Error('Masse brute inférieure à la tare : pesée incohérente.');
      }
      if (nette > contenance) {
        throw new Error('Masse nette supérieure à la contenance de la bouteille.');
      }
    }
    return muter(() => {
      majParId('bouteilles', id, mapping.versSql('bouteilles', patch));
      journaliser(d.operateur, 'MODIFICATION_BOUTEILLE', bouteille.code,
        `Champs : ${Object.keys(patch).join(', ')}`);
      return lireBouteille(id);
    });
  },

  peserBouteille(params) {
    const { id } = params;
    const bouteille = trouverBouteille(id);
    const brute = Number(params.masseBruteKg);
    if (!Number.isFinite(brute) || brute < 0) {
      throw new Error('Masse brute obligatoire (en kg, positive).');
    }
    const nette = arrondir(brute - bouteille.tareKg);
    if (nette < 0) {
      throw new Error(
        `Pesée invalide : masse brute (${brute} kg) inférieure à la tare ` +
        `(${bouteille.tareKg} kg).`);
    }
    if (nette > bouteille.contenanceMaxKg) {
      throw new Error(
        `Pesée invalide : masse nette (${nette} kg) supérieure à la ` +
        `contenance (${bouteille.contenanceMaxKg} kg).`);
    }
    return muter(() => {
      // masse_nette_kg est GÉNÉRÉE : on écrit brute + date, la nette suit.
      majParId('bouteilles', id, {
        masse_brute_kg: arrondir(brute),
        date_derniere_pesee: aujourdHui()
      });
      journaliser(params.par, 'PESEE_BOUTEILLE', bouteille.code,
        `Brute ${arrondir(brute)} kg → nette ${nette} kg`);
      return lireBouteille(id);
    });
  },

  // === contrôles d'étanchéité (VAGUE 6) =====================

  /**
   * Crée un contrôle d'étanchéité (id CTL-, défauts date=aujourd'hui,
   * typeControle=PERIODIQUE, methode=DIRECTE). Garde-fous : machine
   * introuvable et resultat ∈ {CONFORME, FUITE}. Effets machine (Phase B) :
   * FUITE → statut FUITE ; CONFORME sur une machine FUITE/CONTROLE_DU non
   * en retard → retour EN_SERVICE ; dernierControle = date ; prochainControle
   * si fourni. Journal CREATION_CONTROLE. Toute la logique (validations,
   * insertion, effets, journal) vit dans enregistrerControle, partagé avec
   * CR-3 (validation d'un mouvement) — repris du DemoStore.
   */
  createControle(params) {
    return muter(() => enregistrerControle(params.donneesControle || {}));
  },

  /**
   * IM-1 : date du PROCHAIN contrôle d'étanchéité calculée depuis la
   * fréquence réglementaire (même logique que le cadre 7 du CERFA, croisée
   * avec la détection permanente). Renvoie null si la machine est hors
   * périmètre F-Gas (aucun contrôle périodique exigé), une date ISO sinon.
   * Error si la machine est introuvable. Reprend calculerProchainControle
   * du DemoStore.
   */
  calculerProchainControle(params) {
    const machine = trouverMachine(params.machineId);
    const fluideRef = lireFluide(machine.fluide);
    const frequenceMois = frequenceControleMois(
      fluideRef, machine.chargeActuelleKg,
      Boolean(machine.detectionPermanente));
    if (!frequenceMois) return null;
    return ajouterMois(params.dateControle ?? aujourdHui(), frequenceMois);
  },

  // === registre des mouvements (VAGUE 5 — le coffre-fort) ====

  /**
   * CR-1 : crée un mouvement en BROUILLON. Numéro FORM-/FI- attribué par
   * COMPTEUR global par préfixe, conservé jusqu'à la validation. Aucun
   * effet stock, aucune empreinte, quantiteKg NULL : le brouillon ne fige
   * rien. Les références (machine, bouteilles) sont vérifiées dès la saisie
   * si fournies. Reprend creerMouvement du DemoStore (msg mot pour mot).
   */
  creerMouvement(params) {
    const d = params.donneesMouvement || {};
    if (!TYPES_MOUVEMENT.includes(d.type)) {
      throw new Error(
        `Type de mouvement obligatoire parmi : ${TYPES_MOUVEMENT.join(', ')}.`);
    }
    const mode = d.mode === 'OFFICIEL' ? 'OFFICIEL' : 'FORMATION';
    // Références vérifiées dès le brouillon si fournies (msg exact).
    const machine = d.machineId ? trouverMachine(d.machineId) : null;
    if (d.bouteilleSrcId) trouverBouteille(d.bouteilleSrcId, 'Bouteille source');
    if (d.bouteilleDstId) {
      trouverBouteille(d.bouteilleDstId, 'Bouteille de destination');
    }
    return muter(() => {
      // Numéro attribué DANS la transaction (verrou implicite : Node
      // mono-fil + BEGIN IMMEDIATE) — pas de collision de compteur.
      const mouvement = {
        id: db.generateId('MVT'),
        numero: prochainNumeroMouvement(mode),
        date: d.date ?? aujourdHui(),
        mode,
        type: d.type,
        machineId: d.machineId ?? null,
        machineLabel: machine?.designation ?? null,
        fluide: d.fluide ?? machine?.fluide ?? null,
        quantiteKg: null,
        peseeAvantKg: d.peseeAvantKg ?? null,
        peseeApresKg: d.peseeApresKg ?? null,
        bouteilleSrcId: d.bouteilleSrcId ?? null,
        bouteilleDstId: d.bouteilleDstId ?? null,
        causeMouvement: d.causeMouvement ?? null,
        controle: d.controle ??
          { statutControle: 'SANS_OBJET', detecteurId: null },
        signatureDataUrl: d.signatureDataUrl ?? null,
        technicien: d.technicien ?? null,
        validateurId: null,
        hashEcriture: null,
        hashPrecedent: null,
        contreEcritureDe: null,
        statut: 'BROUILLON',
        cerfaNumero: null
      };
      insererMouvement(mouvement);
      journaliser(mouvement.technicien, 'CREATION_MOUVEMENT', mouvement.numero,
        `${mouvement.type} (brouillon)`);
      return reconstituerMouvement(lireLigneMouvement(mouvement.id));
    });
  },

  /** BROUILLON → SOUMIS + date de soumission (hors empreinte). */
  soumettreMouvement(params) {
    const { id } = params;
    const mouvement = trouverMouvement(id);
    if (mouvement.statut === 'VALIDE' || mouvement.statut === 'ANNULE') {
      throw new Error(MSG_ECRITURE_FIGEE);
    }
    if (mouvement.statut !== 'BROUILLON') {
      throw new Error('Seul un mouvement en brouillon peut être soumis.');
    }
    return muter(() => {
      majParId('mouvements', id, {
        statut: 'SOUMIS',
        date_soumission: aujourdHui()
      });
      journaliser(mouvement.technicien, 'SOUMISSION_MOUVEMENT',
        mouvement.numero, mouvement.type);
      return reconstituerMouvement(lireLigneMouvement(id));
    });
  },

  /** CR-1 : SOUMIS → BROUILLON avec motif de rejet conservé. */
  rejeterMouvement(params) {
    const { id, motif } = params;
    const mouvement = trouverMouvement(id);
    if (mouvement.statut === 'VALIDE' || mouvement.statut === 'ANNULE') {
      throw new Error(MSG_ECRITURE_FIGEE);
    }
    if (mouvement.statut !== 'SOUMIS') {
      throw new Error('Seul un mouvement soumis peut être rejeté.');
    }
    if (!motif || !String(motif).trim()) {
      throw new Error('Motif de rejet obligatoire.');
    }
    const motifRejet = String(motif).trim();
    return muter(() => {
      majParId('mouvements', id, {
        statut: 'BROUILLON',
        motif_rejet: motifRejet
      });
      journaliser(null, 'REJET_MOUVEMENT', mouvement.numero,
        `${mouvement.type} · motif : ${motifRejet}`);
      return reconstituerMouvement(lireLigneMouvement(id));
    });
  },

  /**
   * CR-1 : supprime un mouvement resté en BROUILLON (retourne true). Un
   * brouillon n'a aucun effet stock ni chaîne : sa suppression est sûre.
   */
  supprimerMouvement(params) {
    const { id } = params;
    const mouvement = trouverMouvement(id);
    if (mouvement.statut === 'VALIDE' || mouvement.statut === 'ANNULE') {
      throw new Error(MSG_ECRITURE_FIGEE);
    }
    if (mouvement.statut !== 'BROUILLON') {
      throw new Error(
        'Seul un mouvement en brouillon peut être supprimé ' +
        '(un mouvement soumis se rejette, une écriture validée ' +
        's’annule par contre-écriture).');
    }
    return muter(() => {
      db.run('DELETE FROM mouvements WHERE id = ?', [id]);
      journaliser(params.par ?? mouvement.technicien, 'SUPPRESSION_MOUVEMENT',
        mouvement.numero, `${mouvement.type} (brouillon supprimé)`);
      return true;
    });
  },

  /**
   * SOUMIS → VALIDE : applique les effets stocks/charges (atomiques),
   * CR-3 (contrôle lié si déclaré), fige la quantité SIGNÉE, puis SCELLE
   * l'écriture (hash chaîné) — le tout dans une seule transaction.
   * DOUBLE GARDE de rôle : la route lit le rôle de SESSION, ici on lit en
   * base le rôle du VALIDATEUR DÉSIGNÉ (un élève désigné est refusé, le
   * statut reste SOUMIS).
   */
  validerMouvement(params) {
    const { id, validateurId } = params;
    const mouvement = trouverMouvement(id);
    if (mouvement.statut === 'VALIDE' || mouvement.statut === 'ANNULE') {
      throw new Error(MSG_ECRITURE_FIGEE);
    }
    if (mouvement.statut !== 'SOUMIS') {
      throw new Error('Seul un mouvement soumis peut être validé.');
    }
    const validateur = verifierValidateur(validateurId);
    return muter(() => {
      // Règles métier + effets stocks/charges (throw si violation) : muter
      // fluide / machineLabel / quantiteKg sur l'objet logique.
      appliquerEffets(mouvement);

      // CR-3 : le contrôle déclaré à l'étape 5 du wizard produit un VRAI
      // contrôle lié (mêmes effets machine que createControle), croisé au
      // mouvement AVANT le scellement pour entrer dans l'empreinte.
      const declare = mouvement.controle || {};
      if (mouvement.machineId &&
          (declare.statutControle === 'CONFORME' ||
           declare.statutControle === 'FUITE')) {
        const controleLie = enregistrerControle({
          machineId: mouvement.machineId,
          date: mouvement.date,
          typeControle: 'NON_PERIODIQUE',
          methode: 'DIRECTE',
          resultat: declare.statutControle,
          detecteurId: declare.detecteurId ?? null,
          operateur: mouvement.technicien ?? null,
          mouvementId: mouvement.id
        });
        mouvement.controle = { ...declare, controleId: controleLie.id };
      }

      mouvement.validateurId = validateurId;
      mouvement.statut = 'VALIDE';
      // IM-12 : un TRANSFERT interne ne reçoit AUCUN numéro CERFA.
      mouvement.cerfaNumero =
        mouvement.type === 'TRANSFERT' ? null : mouvement.numero;
      sceller(mouvement);

      // Persistance : effets déjà écrits, ici on fige l'écriture (SOUMIS →
      // VALIDE, quantité, contrôle aplati, scellement).
      persisterMouvementValide(mouvement);

      journaliser(`${validateur.prenom} ${validateur.nom}`,
        'VALIDATION_MOUVEMENT', mouvement.numero,
        `${mouvement.type} · ${mouvement.quantiteKg} kg ${mouvement.fluide}`);

      const resultat = reconstituerMouvement(lireLigneMouvement(id));
      // IM-4 : une récupération-démantèlement qui VIDE la machine invite
      // l'interface à proposer le démantèlement (proposition éphémère, rien
      // n'est appliqué ni persisté).
      if (mouvement.type === 'RECUPERATION_DEMANTELEMENT' &&
          mouvement.machineId) {
        const machine = trouverMachine(mouvement.machineId);
        if (machine.statut !== 'DEMANTELEE' &&
            Math.abs(machine.chargeActuelleKg) <=
              TOLERANCE_CHARGE_RESIDUELLE_KG) {
          resultat.proposerDemantelement = true;
        }
      }
      return resultat;
    });
  },

  /**
   * Annule une écriture VALIDE par CONTRE-ÉCRITURE : une nouvelle écriture
   * scellée porte la quantité OPPOSÉE (pesées permutées, bouteilles NON
   * permutées) et applique les effets inverses ; l'originale passe ANNULE
   * sans qu'une seule de ses données ne bouge (empreinte intacte).
   */
  annulerParContreEcriture(params) {
    const { id, motif, validateurId } = params;
    const original = trouverMouvement(id);
    if (original.statut === 'ANNULE') {
      throw new Error('Écriture déjà annulée : contre-écriture impossible.');
    }
    if (original.statut !== 'VALIDE') {
      throw new Error(
        'Seule une écriture validée peut être annulée par contre-écriture.');
    }
    if (!motif || !String(motif).trim()) {
      throw new Error('Motif d’annulation obligatoire.');
    }
    const validateur = verifierValidateur(validateurId);
    const motifNet = String(motif).trim();
    return muter(() => {
      // Effets inverses AVANT de figer quoi que ce soit (throw si impossible).
      appliquerEffetsInverses(original);

      const contreEcriture = {
        id: db.generateId('MVT'),
        numero: prochainNumeroMouvement(original.mode),
        date: aujourdHui(),
        mode: original.mode,
        type: original.type,
        machineId: original.machineId ?? null,
        machineLabel: original.machineLabel ?? null,
        fluide: original.fluide ?? null,
        // Quantité OPPOSÉE (+ 0 neutralise un éventuel « moins zéro »).
        quantiteKg: arrondir(-original.quantiteKg) + 0,
        // Pesées permutées : le fluide fait le chemin inverse.
        peseeAvantKg: original.peseeApresKg ?? null,
        peseeApresKg: original.peseeAvantKg ?? null,
        // Bouteilles NON permutées.
        bouteilleSrcId: original.bouteilleSrcId ?? null,
        bouteilleDstId: original.bouteilleDstId ?? null,
        causeMouvement: original.causeMouvement ?? null,
        controle: { statutControle: 'SANS_OBJET', detecteurId: null },
        signatureDataUrl: null,
        technicien: `${validateur.prenom} ${validateur.nom}`,
        motif: motifNet,
        validateurId,
        contreEcritureDe: original.id,
        statut: 'VALIDE',
        hashEcriture: null,
        hashPrecedent: null,
        cerfaNumero: null
      };
      // IM-12 : pas de CERFA pour un TRANSFERT.
      contreEcriture.cerfaNumero =
        contreEcriture.type === 'TRANSFERT' ? null : contreEcriture.numero;
      sceller(contreEcriture);
      insererMouvement(contreEcriture);

      // L'original change UNIQUEMENT de statut : tout le reste identique
      // (le déclencheur WORM l'exige — voir schema.sql).
      majParId('mouvements', original.id, { statut: 'ANNULE' });

      journaliser(`${validateur.prenom} ${validateur.nom}`,
        'CONTRE_ECRITURE', contreEcriture.numero,
        `Annule ${original.numero} · motif : ${contreEcriture.motif}`);
      return reconstituerMouvement(lireLigneMouvement(contreEcriture.id));
    });
  },

  /** CR-5 : vérifie la chaîne de hash SHA-256 des écritures figées. */
  verifierChaineHash() {
    return verifierChaineMouvements();
  }
};

// ------------------------------------------------------------
// Reconstitution de l'objet `mouvement.controle` imbriqué (divergence
// E3 : aplati côté SQL vers statut_controle_declare / detecteur_declare_id
// / controle_lie_id). UN SEUL endroit (api.js), en lecture.
// Les colonnes aplaties sont réservées serveur (mapping.sqlSeulement),
// donc versFront les ignore : on les lit à la main sur la ligne SQL.
// ------------------------------------------------------------
function reconstituerMouvement(ligneSql) {
  const mouvement = mapping.versFront('mouvements', ligneSql);
  if (ligneSql.statut_controle_declare != null) {
    const controle = {
      statutControle: ligneSql.statut_controle_declare,
      detecteurId: ligneSql.detecteur_declare_id ?? null
    };
    if (ligneSql.controle_lie_id != null) {
      controle.controleId = ligneSql.controle_lie_id;
    }
    mouvement.controle = controle;
  }
  return mouvement;
}

// ------------------------------------------------------------
// Registre WORM — persistance d'un mouvement (aplatissement du
// `controle` imbriqué vers ses colonnes) + scellement chaîné.
// ------------------------------------------------------------

/** Ligne SQL brute d'un mouvement par id (colonnes serveur incluses). */
function lireLigneMouvement(id) {
  return db.get('SELECT * FROM mouvements WHERE id = ?', [id]);
}

/**
 * Aplati l'objet `controle` imbriqué d'un mouvement logique vers les
 * colonnes réservées serveur (divergence E3). UN SEUL endroit avec
 * reconstituerMouvement (lecture). Renvoie un patch de colonnes SQL.
 */
function aplatirControle(mouvement) {
  const controle = mouvement.controle ?? null;
  return {
    statut_controle_declare: controle?.statutControle ?? null,
    detecteur_declare_id: controle?.detecteurId ?? null,
    controle_lie_id: controle?.controleId ?? null
  };
}

/**
 * INSÈRE un mouvement (objet logique complet) : mapping camelCase → SQL
 * (versSql IGNORE `controle`, bloqué), + aplatissement du contrôle, +
 * l'établissement singleton. Utilisé au brouillon comme à la contre-écriture.
 */
function insererMouvement(mouvement) {
  const { controle, ...plat } = mouvement;
  const ligne = mapping.versSql('mouvements', plat);
  Object.assign(ligne, aplatirControle(mouvement));
  ligne.etablissement_id = ID_ETABLISSEMENT;
  inserer('mouvements', ligne);
}

/**
 * Fige une écriture qui passe SOUMIS → VALIDE : quantité signée, contrôle
 * (éventuel CR-3), validateur, CERFA, scellement (hash / ordre). Le
 * déclencheur WORM n'entrave PAS un SOUMIS → VALIDE (il ne surveille que
 * OLD.statut = VALIDE/ANNULE), on peut donc écrire toutes ces colonnes.
 */
function persisterMouvementValide(mouvement) {
  const patch = {
    statut: 'VALIDE',
    quantite_calculee_kg: mouvement.quantiteKg,
    fluide: mouvement.fluide ?? null,
    machine_label: mouvement.machineLabel ?? null,
    validateur_id: mouvement.validateurId ?? null,
    cerfa_numero: mouvement.cerfaNumero ?? null,
    hash_ecriture: mouvement.hashEcriture,
    hash_precedent: mouvement.hashPrecedent,
    ordre_validation: mouvement.ordreValidation,
    ...aplatirControle(mouvement)
  };
  majParId('mouvements', mouvement.id, patch);
}

/**
 * Prochain numéro de fiche : FI-AAAA-NNNN (OFFICIEL) ou FORM-AAAA-NNNN
 * (FORMATION). NNNN = max du préfixe sur TOUTES les années + 1, sur 4
 * chiffres. Compteur GLOBAL par préfixe (identique à prochainNumero du
 * DemoStore). Appelé DANS la transaction (verrou implicite).
 */
function prochainNumeroMouvement(mode) {
  const prefixe = mode === 'OFFICIEL' ? 'FI' : 'FORM';
  const motif = new RegExp(`^${prefixe}-\\d{4}-(\\d{4})$`);
  const lignes = db.all('SELECT numero FROM mouvements');
  let max = 0;
  for (const { numero } of lignes) {
    const trouve = motif.exec(numero || '');
    if (trouve) max = Math.max(max, Number(trouve[1]));
  }
  const annee = new Date().getFullYear();
  return `${prefixe}-${annee}-${String(max + 1).padStart(4, '0')}`;
}

/**
 * Objet mouvement LOGIQUE (camelCase, forme contrat) projeté sur les 18
 * champs de l'empreinte, dans l'ordre canonique — avec le `controle`
 * reconstitué { statutControle, detecteurId[, controleId] } dans CET ordre
 * d'insertion (JSON.stringify respecte l'ordre → hash identique au front).
 * hasherMouvement re-projette de toute façon, mais on garde l'ordre du
 * controle qui, lui, est un sous-objet stringifié tel quel.
 */
function objetLogiquePourHash(mouvement) {
  const objet = {
    id: mouvement.id,
    numero: mouvement.numero,
    date: mouvement.date,
    mode: mouvement.mode,
    type: mouvement.type,
    machineId: mouvement.machineId ?? null,
    fluide: mouvement.fluide ?? null,
    quantiteKg: mouvement.quantiteKg ?? null,
    peseeAvantKg: mouvement.peseeAvantKg ?? null,
    peseeApresKg: mouvement.peseeApresKg ?? null,
    bouteilleSrcId: mouvement.bouteilleSrcId ?? null,
    bouteilleDstId: mouvement.bouteilleDstId ?? null,
    causeMouvement: mouvement.causeMouvement ?? null,
    controle: mouvement.controle ?? null,
    technicien: mouvement.technicien ?? null,
    validateurId: mouvement.validateurId ?? null,
    contreEcritureDe: mouvement.contreEcritureDe ?? null,
    motif: mouvement.motif ?? null
  };
  return objet;
}

/**
 * Écritures figées (VALIDE/ANNULE, ordre_validation non NULL) de la base,
 * triées par ordre_validation — reconstituées en objets logiques (controle
 * inclus) pour être re-hashables à l'identique.
 */
function chaineValidee() {
  const lignes = db.all(
    `SELECT * FROM mouvements
     WHERE statut IN ('VALIDE','ANNULE') AND ordre_validation IS NOT NULL
     ORDER BY ordre_validation`);
  return lignes.map((ligne) => {
    const mv = reconstituerMouvement(ligne);
    mv.ordreValidation = ligne.ordre_validation;
    mv.hashEcriture = ligne.hash_ecriture;
    mv.hashPrecedent = ligne.hash_precedent;
    return mv;
  });
}

/**
 * Scelle une écriture : rang de validation, hash précédent, empreinte
 * propre (calculée DANS la transaction, sur l'objet logique). Identique à
 * sceller() du DemoStore, mais synchrone (hash-mouvement.js).
 */
function sceller(mouvement) {
  const chaine = chaineValidee();
  const derniere = chaine[chaine.length - 1] || null;
  mouvement.ordreValidation = (derniere?.ordreValidation ?? 0) + 1;
  mouvement.hashPrecedent = derniere?.hashEcriture ?? null;
  mouvement.hashEcriture = hasherMouvement(
    objetLogiquePourHash(mouvement), mouvement.hashPrecedent);
}

/**
 * CR-5 : re-parcourt la chaîne des écritures figées et recalcule chaque
 * empreinte ; casseA = numéro de la première rupture. Identique à
 * verifierChaineMouvements du DemoStore.
 * @returns {{ok: boolean, casseA: string|null}}
 */
function verifierChaineMouvements() {
  let precedent = null;
  for (const mouvement of chaineValidee()) {
    if ((mouvement.hashPrecedent ?? null) !== precedent) {
      return { ok: false, casseA: mouvement.numero };
    }
    const attendu = hasherMouvement(
      objetLogiquePourHash(mouvement), precedent);
    if (attendu !== mouvement.hashEcriture) {
      return { ok: false, casseA: mouvement.numero };
    }
    precedent = mouvement.hashEcriture;
  }
  return { ok: true, casseA: null };
}

// ------------------------------------------------------------
// Registre WORM — effets stocks/charges d'une écriture au moment de la
// validation. Mutations VIVES des copies JS lues en base, PUIS
// persistance (une seule écriture SQL par entité touchée) : la
// transaction ambiante garantit l'atomicité (throw → ROLLBACK global).
// Reprend appliquerEffets / appliquerEffetsInverses du DemoStore
// (messages MOT POUR MOT, mêmes ordres de contrôle).
// ------------------------------------------------------------

function verserDansBouteille(bouteille, quantite) {
  const nouvelleNette = arrondir(bouteille.masseNetteKg + quantite);
  if (nouvelleNette > bouteille.contenanceMaxKg) {
    throw new Error(
      `Débordement : la bouteille ${bouteille.code} contient déjà ` +
      `${fmtNombre(bouteille.masseNetteKg, 2)} kg ; y ajouter ` +
      `${fmtNombre(quantite, 2)} kg donnerait ` +
      `${fmtNombre(nouvelleNette, 2)} kg, au-delà de sa contenance de ` +
      `${fmtNombre(bouteille.contenanceMaxKg, 2)} kg.`);
  }
  bouteille.masseNetteKg = nouvelleNette;
  bouteille.masseBruteKg = arrondir(bouteille.tareKg + nouvelleNette);
  bouteille.datePesee = aujourdHui();
}

function retirerDeBouteille(bouteille, quantite) {
  const nouvelleNette = arrondir(bouteille.masseNetteKg - quantite);
  if (nouvelleNette < 0) {
    throw new Error(
      `Stock insuffisant : la bouteille ${bouteille.code} ne contient ` +
      `que ${fmtNombre(bouteille.masseNetteKg, 2)} kg, or vous prélevez ` +
      `${fmtNombre(quantite, 2)} kg.`);
  }
  bouteille.masseNetteKg = nouvelleNette;
  bouteille.masseBruteKg = arrondir(bouteille.tareKg + nouvelleNette);
  bouteille.datePesee = aujourdHui();
}

function chargerMachine(machine, quantite) {
  const nouvelleCharge = arrondir(machine.chargeActuelleKg + quantite);
  const plafond = arrondir(machine.chargeNominaleKg * 1.05);
  if (nouvelleCharge > plafond) {
    throw new Error(
      `Surcharge : la machine ${machine.code} contient déjà ` +
      `${fmtNombre(machine.chargeActuelleKg, 2)} kg ; ajouter ` +
      `${fmtNombre(quantite, 2)} kg donnerait ` +
      `${fmtNombre(nouvelleCharge, 2)} kg, au-delà de la limite de ` +
      `${fmtNombre(plafond, 2)} kg (charge nominale ` +
      `${fmtNombre(machine.chargeNominaleKg, 2)} kg + 5 % de tolérance).`);
  }
  machine.chargeActuelleKg = nouvelleCharge;
}

function viderMachine(machine, quantite) {
  const nouvelleCharge = arrondir(machine.chargeActuelleKg - quantite);
  if (nouvelleCharge < 0) {
    throw new Error(
      `Incohérence : la machine ${machine.code} ne contient que ` +
      `${machine.chargeActuelleKg} kg de fluide.`);
  }
  machine.chargeActuelleKg = nouvelleCharge;
}

/** IM-6 : bouteille utilisable dans un mouvement (EN_STOCK ou EN_SERVICE). */
function verifierBouteilleEnStock(bouteille, role) {
  if (bouteille.statut !== 'EN_STOCK' && bouteille.statut !== 'EN_SERVICE') {
    throw new Error(
      `${role} ${bouteille.code} sortie du stock ` +
      `(statut ${bouteille.statut}) : mouvement impossible.`);
  }
}

/** IM-6 : bouteille source de charge portant un fluide UTILISABLE. */
function verifierSourceDeCharge(bouteille) {
  verifierBouteilleEnStock(bouteille, 'Bouteille source');
  if (bouteille.etatFluide === 'DECHET' ||
      bouteille.decisionFluide === 'DECHET' ||
      bouteille.decisionFluide === 'A_ANALYSER') {
    throw new Error(
      `Fluide de la bouteille ${bouteille.code} déclaré ` +
      `${bouteille.decisionFluide === 'A_ANALYSER' ? 'à analyser' : 'déchet'}` +
      ' : charge interdite (une décision « réutilisable » est requise).');
  }
}

/**
 * Applique les règles métier et les effets stocks/charges d'une écriture
 * qui se valide. Mute `mouvement.fluide`, `machineLabel`, `quantiteKg`
 * (SIGNÉE), et persiste les entités touchées. Throw = ROLLBACK global.
 */
function appliquerEffets(mouvement) {
  const avant = Number(mouvement.peseeAvantKg);
  const apres = Number(mouvement.peseeApresKg);
  if (!Number.isFinite(avant) || !Number.isFinite(apres)) {
    throw new Error(
      'Pesées avant et après obligatoires pour valider le mouvement.');
  }

  if (mouvement.type === 'CHARGE_APPOINT' ||
      mouvement.type === 'MISE_EN_SERVICE') {
    const machine = trouverMachine(mouvement.machineId);
    const source = trouverBouteille(mouvement.bouteilleSrcId,
      'Bouteille source');
    verifierSourceDeCharge(source); // IM-6
    if (source.fluide !== machine.fluide) {
      throw new Error(
        `Croisement de fluides interdit : bouteille ${source.fluide} ` +
        `sur machine ${machine.fluide}.`);
    }
    const quantite = arrondir(avant - apres);
    if (quantite <= 0) {
      throw new Error(
        'Pesées incohérentes : la bouteille source doit se vider ' +
        '(pesée avant > pesée après).');
    }
    retirerDeBouteille(source, quantite);
    chargerMachine(machine, quantite);
    mouvement.fluide = machine.fluide;
    mouvement.machineLabel = machine.designation;
    mouvement.quantiteKg = quantite;
    persisterBouteille(source);
    persisterMachineCharge(machine);

  } else if (mouvement.type === 'RECUPERATION_MAINTENANCE' ||
             mouvement.type === 'RECUPERATION_DEMANTELEMENT') {
    const machine = trouverMachine(mouvement.machineId);
    const destination = trouverBouteille(mouvement.bouteilleDstId,
      'Bouteille de destination');
    if (destination.type !== 'RECUPERATION') {
      throw new Error(
        'La récupération exige une bouteille de destination de type ' +
        'RÉCUPÉRATION.');
    }
    verifierBouteilleEnStock(destination, 'Bouteille de destination'); // IM-6
    if (destination.fluide !== machine.fluide) {
      throw new Error(
        `Croisement de fluides interdit : bouteille ${destination.fluide} ` +
        `sur machine ${machine.fluide}.`);
    }
    const quantite = arrondir(apres - avant);
    if (quantite <= 0) {
      throw new Error(
        'Pesées incohérentes : la bouteille de récupération doit se ' +
        'remplir (pesée après > pesée avant).');
    }
    // IM-6 : place restante vérifiée AVANT tout effet (sinon la machine
    // serait vidée puis le versement échouerait — mutation partielle).
    if (arrondir(destination.masseNetteKg + quantite) >
        destination.contenanceMaxKg) {
      throw new Error(
        `Débordement : la bouteille ${destination.code} contient déjà ` +
        `${fmtNombre(destination.masseNetteKg, 2)} kg ; y ajouter ` +
        `${fmtNombre(quantite, 2)} kg donnerait ` +
        `${fmtNombre(arrondir(destination.masseNetteKg + quantite), 2)} kg, ` +
        `au-delà de sa contenance de ` +
        `${fmtNombre(destination.contenanceMaxKg, 2)} kg.`);
    }
    viderMachine(machine, quantite);
    verserDansBouteille(destination, quantite);
    mouvement.fluide = machine.fluide;
    mouvement.machineLabel = machine.designation;
    // Convention d'affichage : récupération = quantité NÉGATIVE.
    mouvement.quantiteKg = -quantite;
    persisterMachineCharge(machine);
    persisterBouteille(destination);

  } else if (mouvement.type === 'TRANSFERT') {
    const source = trouverBouteille(mouvement.bouteilleSrcId,
      'Bouteille source');
    const destination = trouverBouteille(mouvement.bouteilleDstId,
      'Bouteille de destination');
    verifierSourceDeCharge(source); // IM-6
    verifierBouteilleEnStock(destination, 'Bouteille de destination');
    if (source.fluide !== destination.fluide) {
      throw new Error(
        `Croisement de fluides interdit : transfert ${source.fluide} ` +
        `vers ${destination.fluide}.`);
    }
    const quantite = arrondir(avant - apres);
    if (quantite <= 0) {
      throw new Error(
        'Pesées incohérentes : la bouteille source doit se vider ' +
        '(pesée avant > pesée après).');
    }
    if (arrondir(destination.masseNetteKg + quantite) >
        destination.contenanceMaxKg) {
      throw new Error(
        `Débordement : la bouteille ${destination.code} contient déjà ` +
        `${fmtNombre(destination.masseNetteKg, 2)} kg ; y ajouter ` +
        `${fmtNombre(quantite, 2)} kg donnerait ` +
        `${fmtNombre(arrondir(destination.masseNetteKg + quantite), 2)} kg, ` +
        `au-delà de sa contenance de ` +
        `${fmtNombre(destination.contenanceMaxKg, 2)} kg.`);
    }
    retirerDeBouteille(source, quantite);
    verserDansBouteille(destination, quantite);
    mouvement.fluide = source.fluide;
    mouvement.quantiteKg = quantite;
    persisterBouteille(source);
    persisterBouteille(destination);

  } else {
    throw new Error(`Type de mouvement inconnu : ${mouvement.type}.`);
  }
}

/** Applique les effets INVERSES d'une écriture validée (contre-écriture). */
function appliquerEffetsInverses(original) {
  const quantite = Math.abs(original.quantiteKg);

  if (original.type === 'CHARGE_APPOINT' ||
      original.type === 'MISE_EN_SERVICE') {
    const machine = trouverMachine(original.machineId);
    viderMachine(machine, quantite);
    persisterMachineCharge(machine);
    if (original.bouteilleSrcId) {
      const source = trouverBouteille(original.bouteilleSrcId,
        'Bouteille source');
      verserDansBouteille(source, quantite);
      persisterBouteille(source);
    }
  } else if (original.type === 'RECUPERATION_MAINTENANCE' ||
             original.type === 'RECUPERATION_DEMANTELEMENT') {
    const machine = trouverMachine(original.machineId);
    chargerMachine(machine, quantite);
    persisterMachineCharge(machine);
    if (original.bouteilleDstId) {
      const destination = trouverBouteille(original.bouteilleDstId,
        'Bouteille de destination');
      retirerDeBouteille(destination, quantite);
      persisterBouteille(destination);
    }
  } else if (original.type === 'TRANSFERT') {
    if (original.bouteilleDstId) {
      const destination = trouverBouteille(original.bouteilleDstId,
        'Bouteille de destination');
      retirerDeBouteille(destination, quantite);
      persisterBouteille(destination);
    }
    if (original.bouteilleSrcId) {
      const source = trouverBouteille(original.bouteilleSrcId,
        'Bouteille source');
      verserDansBouteille(source, quantite);
      persisterBouteille(source);
    }
  }
}

/**
 * Persiste la charge d'une machine (copie JS mutée par les effets). La
 * masse_nette_kg des bouteilles étant GÉNÉRÉE, on écrit la brute ; pour la
 * machine, la charge est une colonne simple.
 */
function persisterMachineCharge(machine) {
  majParId('machines', machine.id,
    { charge_actuelle_kg: machine.chargeActuelleKg });
}

/**
 * Persiste une bouteille mutée par les effets : masse_brute_kg (la nette
 * GÉNÉRÉE suit) + date de pesée. On n'écrit QUE ce que les effets touchent.
 */
function persisterBouteille(bouteille) {
  majParId('bouteilles', bouteille.id, {
    masse_brute_kg: bouteille.masseBruteKg,
    date_derniere_pesee: bouteille.datePesee
  });
}

/**
 * Contrôle d'étanchéité : logique UNIQUE partagée entre createControle
 * (vague 6) et la validation d'un mouvement (CR-3). Mutations VIVES de la
 * machine + insertion du contrôle + journalisation, DANS la transaction
 * ambiante. Reprend enregistrerControle du DemoStore.
 * @returns {object} le contrôle créé (camelCase).
 */
function enregistrerControle(d) {
  const machine = trouverMachine(d.machineId);
  if (d.resultat !== 'CONFORME' && d.resultat !== 'FUITE') {
    throw new Error('Résultat de contrôle obligatoire : CONFORME ou FUITE.');
  }
  const controle = {
    id: db.generateId('CTL'),
    date: d.date ?? aujourdHui(),
    machineId: machine.id,
    machineLabel: machine.designation,
    typeControle: d.typeControle ?? 'PERIODIQUE',
    methode: d.methode ?? 'DIRECTE',
    resultat: d.resultat,
    detecteurId: d.detecteurId ?? null,
    localisationFuite: d.localisationFuite ?? null,
    reparationImmediate: Boolean(d.reparationImmediate),
    operateur: d.operateur ?? null,
    operateurId: d.operateurId ?? null,
    mouvementId: d.mouvementId ?? null,
    prochainControle: d.prochainControle ?? null
  };
  const ligne = mapping.versSql('controles', controle);
  ligne.etablissement_id = ID_ETABLISSEMENT;
  inserer('controles', ligne);

  // Effets sur la machine (contrat Phase B) — mêmes règles que le DemoStore.
  const patchMachine = { date_dernier_controle: controle.date };
  let nouveauStatut = machine.statut;
  if (controle.prochainControle) {
    patchMachine.date_prochain_controle = controle.prochainControle;
  }
  if (controle.resultat === 'FUITE') {
    nouveauStatut = 'FUITE';
  } else if ((machine.statut === 'FUITE' || machine.statut === 'CONTROLE_DU') &&
             (!controle.prochainControle ||
              controle.prochainControle >= aujourdHui())) {
    nouveauStatut = 'EN_SERVICE';
  }
  patchMachine.statut = nouveauStatut;
  majParId('machines', machine.id, patchMachine);

  journaliser(controle.operateur, 'CREATION_CONTROLE', machine.code,
    `${controle.typeControle} ${controle.methode} → ${controle.resultat}`);
  return controle;
}

// ------------------------------------------------------------
// Accès ciblés par id (relecture APRÈS mutation → copie fraîche pour
// le contrat) et finders qui lèvent le message français EXACT du
// DemoStore quand l'entité n'existe pas.
// ------------------------------------------------------------

/** Un fluide est-il au référentiel ? */
function fluideConnu(code) {
  if (code == null) return false;
  return Boolean(db.get('SELECT code FROM fluides WHERE code = ?', [code]));
}

/** Fiche complète d'un fluide (camelCase : famille, gwpAr4…) ou null. */
function lireFluide(code) {
  if (code == null) return null;
  const ligne = db.get('SELECT * FROM fluides WHERE code = ?', [code]);
  return ligne ? mapping.versFront('fluides', ligne) : null;
}

/**
 * IM-1 : fréquence réglementaire de contrôle d'étanchéité, en mois, ou
 * null si l'équipement est hors périmètre F-Gas. Reproduit FIDÈLEMENT la
 * partie fréquence du cadre 7 CERFA (calculerCadre7 de generateur.js) :
 * HFO/HCFC en kg, HFC/PFC en tonnes équivalent CO₂, seuils croisés avec la
 * détection permanente. generateur.js étant un module ES navigateur, on en
 * réimplémente ici la seule logique de fréquence (côté serveur).
 */
function frequenceControleMois(fluideRef, chargeKg, detectionPermanente) {
  const famille = String(fluideRef?.famille || '').toUpperCase();
  const charge = Number(chargeKg) || 0;
  let niveau = null; // 1 = bas, 2 = moyen, 3 = haut

  if (famille.includes('HFO')) {
    if (charge >= 100) niveau = 3;
    else if (charge >= 10) niveau = 2;
    else if (charge >= 1) niveau = 1;
  } else if (famille.includes('HCFC')) {
    if (charge >= 300) niveau = 3;
    else if (charge >= 30) niveau = 2;
    else if (charge >= 2) niveau = 1;
  } else if (famille.includes('HFC') || famille.includes('PFC')) {
    const teq = charge * (Number(fluideRef?.gwpAr4) || 0) / 1000;
    if (teq >= 500) niveau = 3;
    else if (teq >= 50) niveau = 2;
    else if (teq >= 5) niveau = 1;
  }
  // Autres familles (CO₂, HC…) : hors périmètre F-Gas, aucune fréquence.

  if (niveau === 1) return detectionPermanente ? 24 : 12;
  if (niveau === 2) return detectionPermanente ? 12 : 6;
  if (niveau === 3) return detectionPermanente ? 6 : 3;
  return null;
}

/**
 * Plus grand nombre extrait d'un code lisible (M{n}, B-NN…) par COMPTEUR,
 * sur toutes les lignes de `table`. 0 si aucun code exploitable.
 */
function plusGrandCode(table, colonne, motif) {
  const lignes = db.all(`SELECT ${colonne} AS code FROM ${table}`);
  let max = 0;
  for (const { code } of lignes) {
    const trouve = motif.exec(String(code ?? ''));
    if (trouve) {
      const n = Number(trouve[1]);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }
  return max;
}

/** Personne par id, avec ses champs camelCase (copie). */
function lirePersonne(id) {
  return mapping.versFront('personnel',
    db.get('SELECT * FROM personnel WHERE id = ?', [id]));
}

function trouverPersonne(id) {
  const ligne = db.get('SELECT * FROM personnel WHERE id = ?', [id]);
  if (!ligne) throw new Error(`Personne introuvable : ${id}.`);
  return mapping.versFront('personnel', ligne);
}

/** Client par id, nbMachines recalculé (non démantelées) — comme getClients. */
function lireClient(id) {
  const ligne = db.get('SELECT * FROM clients_detenteurs WHERE id = ?', [id]);
  const client = mapping.versFront('clients_detenteurs', ligne);
  const { n } = db.get(
    `SELECT count(*) AS n FROM machines
     WHERE client_detenteur_id = ? AND statut <> 'DEMANTELEE'`, [id]);
  client.nbMachines = n;
  return client;
}

function trouverClient(id) {
  const ligne = db.get('SELECT id FROM clients_detenteurs WHERE id = ?', [id]);
  if (!ligne) throw new Error(`Client / détenteur introuvable : ${id}.`);
}

/** Machine par id (copie camelCase). */
function lireMachine(id) {
  return mapping.versFront('machines',
    db.get('SELECT * FROM machines WHERE id = ?', [id]));
}

function trouverMachine(id) {
  const ligne = db.get('SELECT * FROM machines WHERE id = ?', [id]);
  if (!ligne) throw new Error(`Machine introuvable : ${id}.`);
  return mapping.versFront('machines', ligne);
}

/** Bouteille par id (copie camelCase, masseNetteKg = colonne générée). */
function lireBouteille(id) {
  return mapping.versFront('bouteilles',
    db.get('SELECT * FROM bouteilles WHERE id = ?', [id]));
}

function trouverBouteille(id, role = 'Bouteille') {
  const ligne = db.get('SELECT * FROM bouteilles WHERE id = ?', [id]);
  if (!ligne) throw new Error(`${role} introuvable : ${id}.`);
  return mapping.versFront('bouteilles', ligne);
}

/** Mouvement par id (copie camelCase, contrôle reconstitué). */
function trouverMouvement(id) {
  const ligne = db.get('SELECT * FROM mouvements WHERE id = ?', [id]);
  if (!ligne) throw new Error(`Mouvement introuvable : ${id}.`);
  return reconstituerMouvement(ligne);
}

/**
 * Vérifie qu'une personne existe ET a le droit de valider (garde MÉTIER de
 * la double garde : lit en base le rôle du VALIDATEUR DÉSIGNÉ). Messages
 * repris MOT POUR MOT du DemoStore (verifierValidateur).
 */
function verifierValidateur(validateurId) {
  const ligne = db.get('SELECT * FROM personnel WHERE id = ?', [validateurId]);
  if (!ligne) {
    throw new Error(`Validateur introuvable : ${validateurId}.`);
  }
  const personne = mapping.versFront('personnel', ligne);
  if (!ROLES_VALIDEURS.includes(personne.roleApp)) {
    throw new Error(
      'Validation refusée : un élève ne peut pas valider une écriture ' +
      '(rôle requis : référent, enseignant ou administrateur).');
  }
  return personne;
}

// ------------------------------------------------------------
// Dispatcher
// ------------------------------------------------------------

/** Ensemble des méthodes reconnues (celles ayant un handler). */
const METHODES = Object.freeze([...Object.keys(HANDLERS)]);

/**
 * Applique la garde de rôle d'une méthode de mutation. Lève un Error
 * marqué `.code = 403` si le rôle de session n'est pas habilité — AVANT
 * tout effet. Les lectures ne sont pas restreintes en E3.
 */
function garderRole(methode, contexte) {
  const roles = ROLES_MUTATION[methode];
  if (!roles) return; // lecture : aucune restriction
  const role = contexte?.role ?? null;
  if (!roles.includes(role)) {
    const erreur = new Error(
      `Action « ${methode} » réservée aux rôles habilités ` +
      `(${roles.join(', ')}) — rôle courant : ${role ?? 'aucun'}.`);
    erreur.code = 403;
    throw erreur;
  }
}

/**
 * Point d'entrée unique. Résout la méthode, applique la garde de rôle,
 * exécute le handler. Retourne le résultat camelCase (copie fraîche).
 * Toute violation métier / rôle lève un Error (message français) ; le
 * routeur serveur l'enveloppe en { ok:false, erreur, code }.
 * @param {string} methode
 * @param {object} params
 * @param {{role?: string, utilisateurId?: string}} [contexte]
 */
function appeler(methode, params = {}, contexte = {}) {
  const handler = HANDLERS[methode];
  if (!handler) {
    const erreur = new Error(
      `Méthode « ${methode} » non encore implémentée (chantier V9-E3).`);
    erreur.code = 501;
    throw erreur;
  }
  garderRole(methode, contexte);
  return handler(params ?? {}, contexte ?? {});
}

module.exports = {
  ID_ETABLISSEMENT,
  ROLES_MUTATION,
  METHODES,
  muter,
  appeler
};
