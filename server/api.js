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
// Accès ciblés par id (relecture APRÈS mutation → copie fraîche pour
// le contrat) et finders qui lèvent le message français EXACT du
// DemoStore quand l'entité n'existe pas.
// ------------------------------------------------------------

/** Un fluide est-il au référentiel ? */
function fluideConnu(code) {
  if (code == null) return false;
  return Boolean(db.get('SELECT code FROM fluides WHERE code = ?', [code]));
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

function trouverBouteille(id) {
  const ligne = db.get('SELECT * FROM bouteilles WHERE id = ?', [id]);
  if (!ligne) throw new Error(`Bouteille introuvable : ${id}.`);
  return mapping.versFront('bouteilles', ligne);
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
