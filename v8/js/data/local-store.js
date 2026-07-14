// ============================================================
// inerWeb Fluide v8 — LocalStore (Mode Local Lycée, V9-E3)
//
// Implémentation du CONTRAT DataStore (contrat.js) branchée sur le
// serveur Node → SQLite via un TRANSPORT injecté. Le LocalStore ne
// contient AUCUNE logique métier : chaque méthode normalise ses
// arguments en un objet nommé stable, appelle le transport, et
// remonte les Error telles quelles (messages français serveur mot
// pour mot). Le serveur (server/api.js) désassemble et applique la
// règle métier.
//
// Le transport a la signature unique :
//   transport(methode: string, params: object) => Promise<any>
// Il désenveloppe {ok,resultat} → resultat, ou lève Error(erreur).
//
// surChangement est SYNCHRONE et purement LOCAL (le serveur ne pousse
// rien : c'est le front qui, après une mutation réussie, notifie ses
// propres abonnés — comme le DemoStore).
// ============================================================

/**
 * Crée un LocalStore conforme au contrat, branché sur `transport`.
 * @param {(methode: string, params: object) => Promise<any>} transport
 * @returns {object} store
 */
export function creerLocalStore(transport) {
  if (typeof transport !== 'function') {
    throw new Error('creerLocalStore attend une fonction de transport.');
  }

  // --------------------------------------------------------
  // Signal « données modifiées » — LOCAL et SYNCHRONE, comme le
  // DemoStore. Chaque mutation réussie notifie les abonnés du front.
  // --------------------------------------------------------
  const abonnesChangement = new Set();

  function notifierChangement() {
    for (const rappel of [...abonnesChangement]) {
      try {
        rappel();
      } catch {
        // Un abonné défaillant ne doit jamais bloquer les autres
      }
    }
  }

  /** Appelle le transport puis, en cas de succès, notifie les abonnés. */
  async function muter(methode, params) {
    const resultat = await transport(methode, params);
    notifierChangement();
    return resultat;
  }

  /** Appelle le transport en LECTURE (aucune notification). */
  function lire(methode, params) {
    return transport(methode, params);
  }

  const store = {

    // Étiquette de mode affichée dans l'interface
    modeLabel: 'LOCAL',

    // État d'intégrité constaté au chargement (posé par init) :
    // null = sain, { ok: false, casseA } = registre altéré.
    registreAltere: null,

    surChangement(rappel) {
      if (typeof rappel !== 'function') {
        throw new Error('surChangement attend une fonction de rappel.');
      }
      abonnesChangement.add(rappel);
      return () => { abonnesChangement.delete(rappel); };
    },

    async init() {
      const etat = await lire('init', {});
      this.registreAltere = etat ?? null;
      return etat;
    },

    // ------------------------------------------------------
    // Lectures d'état (aucune notification)
    // ------------------------------------------------------
    getEtablissement() { return lire('getEtablissement', {}); },
    getUtilisateurCourant() { return lire('getUtilisateurCourant', {}); },
    getOutillage() { return lire('getOutillage', {}); },
    getMachines() { return lire('getMachines', {}); },
    getBouteilles() { return lire('getBouteilles', {}); },
    getMouvements() { return lire('getMouvements', {}); },
    getControles() { return lire('getControles', {}); },
    getFluides() { return lire('getFluides', {}); },
    getPersonnel() { return lire('getPersonnel', {}); },
    getClients() { return lire('getClients', {}); },
    getAlertes() { return lire('getAlertes', {}); },
    getJournalAudit() { return lire('getJournalAudit', {}); },
    verifierChaineHash() { return lire('verifierChaineHash', {}); },
    getEtatRegistre() { return lire('getEtatRegistre', {}); },
    getStats() { return lire('getStats', {}); },
    getAnneesDisponibles() { return lire('getAnneesDisponibles', {}); },
    getAuditsOrganisme() { return lire('getAuditsOrganisme', {}); },
    getNonConformites() { return lire('getNonConformites', {}); },
    getBsff() { return lire('getBsff', {}); },
    getRetoursFournisseur() { return lire('getRetoursFournisseur', {}); },
    peutPasserEnOfficiel() { return lire('peutPasserEnOfficiel', {}); },
    exporterJSON() { return lire('exporterJSON', {}); },

    getBilan(annee) { return lire('getBilan', { annee }); },
    getBalanceMatiere(annee) { return lire('getBalanceMatiere', { annee }); },
    calculerProchainControle(machineId, dateControle) {
      return lire('calculerProchainControle', { machineId, dateControle });
    },
    listerPiecesJointes(entiteType, entiteId) {
      return lire('listerPiecesJointes', { entiteType, entiteId });
    },
    obtenirPieceJointe(id) {
      return lire('obtenirPieceJointe', { id });
    },

    // ------------------------------------------------------
    // Mutations : machines
    // ------------------------------------------------------
    createMachine(donneesMachine) {
      return muter('createMachine', { donneesMachine });
    },
    updateMachine(id, donneesMachine) {
      return muter('updateMachine', { id, donneesMachine });
    },
    arreterMachine(id, par) {
      return muter('arreterMachine', { id, par });
    },
    demantelerMachine(id, par) {
      return muter('demantelerMachine', { id, par });
    },
    remettreEnService(id, par) {
      return muter('remettreEnService', { id, par });
    },

    // --- clients détenteurs -------------------------------
    createClient(donneesClient) {
      return muter('createClient', { donneesClient });
    },
    updateClient(id, donneesClient) {
      return muter('updateClient', { id, donneesClient });
    },

    // --- bouteilles ---------------------------------------
    createBouteille(donneesBouteille) {
      return muter('createBouteille', { donneesBouteille });
    },
    updateBouteille(id, donneesBouteille) {
      return muter('updateBouteille', { id, donneesBouteille });
    },
    peserBouteille(id, masseBruteKg, par) {
      return muter('peserBouteille', { id, masseBruteKg, par });
    },

    // --- contrôles d'étanchéité ---------------------------
    createControle(donneesControle) {
      return muter('createControle', { donneesControle });
    },

    tracerReparation(controleId, donneesReparation) {
      return muter('tracerReparation', { controleId, donneesReparation });
    },

    // --- registre des mouvements --------------------------
    creerMouvement(donneesMouvement) {
      return muter('creerMouvement', { donneesMouvement });
    },
    soumettreMouvement(id) {
      return muter('soumettreMouvement', { id });
    },
    supprimerMouvement(id, par) {
      return muter('supprimerMouvement', { id, par });
    },
    rejeterMouvement(id, motif) {
      return muter('rejeterMouvement', { id, motif });
    },
    validerMouvement(id, validateurId) {
      return muter('validerMouvement', { id, validateurId });
    },
    annulerParContreEcriture(id, motif, validateurId) {
      return muter('annulerParContreEcriture', { id, motif, validateurId });
    },

    // --- dossier opérateur --------------------------------
    updateEtablissement(patch) {
      return muter('updateEtablissement', { patch });
    },
    createAuditOrganisme(donneesAudit) {
      return muter('createAuditOrganisme', { donneesAudit });
    },
    createNonConformite(donneesNc) {
      return muter('createNonConformite', { donneesNc });
    },
    solderNonConformite(id, commentaire) {
      return muter('solderNonConformite', { id, commentaire });
    },

    // --- personnel ----------------------------------------
    createPersonne(donneesPersonne) {
      return muter('createPersonne', { donneesPersonne });
    },
    updatePersonne(id, donneesPersonne) {
      return muter('updatePersonne', { id, donneesPersonne });
    },
    desactiverPersonne(id, par) {
      return muter('desactiverPersonne', { id, par });
    },

    // --- habilitations F-Gas ------------------------------
    getHabilitations() {
      return lire('getHabilitations', {});
    },
    createHabilitation(donneesHabilitation) {
      return muter('createHabilitation', { donneesHabilitation });
    },
    updateHabilitation(id, donneesHabilitation) {
      return muter('updateHabilitation', { id, donneesHabilitation });
    },
    revoquerHabilitation(id, par) {
      return muter('revoquerHabilitation', { id, par });
    },

    // --- mentions de formation complémentaire -------------
    getMentions() {
      return lire('getMentions', {});
    },
    createMention(donneesMention) {
      return muter('createMention', { donneesMention });
    },
    revoquerMention(id, par) {
      return muter('revoquerMention', { id, par });
    },

    // --- outils d'intervention -----------------------------
    getOutilsMouvement(mouvementId) {
      return lire('getOutilsMouvement', { mouvementId });
    },

    // --- outillage ----------------------------------------
    createOutil(donneesOutil) {
      return muter('createOutil', { donneesOutil });
    },
    updateOutil(id, donneesOutil) {
      return muter('updateOutil', { id, donneesOutil });
    },
    reformerOutil(id, par) {
      return muter('reformerOutil', { id, par });
    },

    // --- pièces jointes -----------------------------------
    ajouterPieceJointe(donneesPj) {
      return muter('ajouterPieceJointe', { donneesPj });
    },
    supprimerPieceJointe(id, par) {
      return muter('supprimerPieceJointe', { id, par });
    },

    // --- chaîne déchets et fournisseur --------------------
    deciderFluideRecupere(id, decision, par) {
      return muter('deciderFluideRecupere', { id, decision, par });
    },
    createBsff(donneesBsff) {
      return muter('createBsff', { donneesBsff });
    },
    retournerFournisseur(id, par) {
      return muter('retournerFournisseur', { id, par });
    },

    // --- balance matière ----------------------------------
    saisirInventaire(annee, lignes, par) {
      return muter('saisirInventaire', { annee, lignes, par });
    },
    justifierEcart(annee, fluide, justification) {
      return muter('justifierEcart', { annee, fluide, justification });
    },
    getInventaireNominatif(annee) {
      return lire('getInventaireNominatif', { annee });
    },

    // --- sentinelle d'alertes persistées ------------------
    getSentinelle() {
      return lire('getSentinelle', {});
    },
    rafraichirSentinelle(par) {
      return muter('rafraichirSentinelle', { par });
    },
    acquitterAlerte(idAlerte, par) {
      return muter('acquitterAlerte', { idAlerte, par });
    },

    // --- échanges -----------------------------------------
    async importerJSON(texte) {
      const adopte = await muter('importerJSON', { texte });
      if (adopte === true) {
        // Contrat : un import propre remet l'état d'intégrité à neuf
        // (même sémantique que le DemoStore — revue E3).
        const etat = await lire('getEtatRegistre', {});
        this.registreAltere = etat && etat.altere
          ? { ok: false, casseA: etat.casseA }
          : null;
      }
      return adopte;
    }
  };

  return store;
}
