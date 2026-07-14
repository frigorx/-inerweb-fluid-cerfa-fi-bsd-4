'use strict';

/**
 * inerWeb Fluide — CORRESPONDANCE unique front (camelCase) ↔ SQL (snake_case).
 * (V9-E0, mise à jour V9-E1 : schéma v1 aligné sur le contrat)
 *
 * Ce module est LA SEULE source de vérité de la traduction entre les objets
 * du contrat DataStore (v8/js/data/contrat.js, formes camelCase du front) et
 * les colonnes de server/schema.sql. Le futur LocalStore (E3) et les routes
 * serveur passent exclusivement par ici — jamais de renommage à la main dans
 * une route (leçon v7 : deux traductions divergentes = deux vérités).
 *
 * Historique : l'inventaire E0 avait relevé 18 divergences structurelles
 * front↔SQL. Le schéma v1 (V9-E1) les a résorbées à la création — colonnes
 * de chaîne ajoutées, enums alignés sur le contrat, tables manquantes créées
 * (retours_fournisseur, stocks_initiaux, inventaires à plat, justifications).
 * Ne RESTENT que les divergences listées dans DIVERGENCES, chacune datée de
 * son incrément. Tant qu'elle n'est pas résorbée, toute tentative de
 * traduction du champ concerné LÈVE une erreur explicite : rien ne passe en
 * silence.
 *
 * Vérifié mécaniquement par server/test-mapping.mjs :
 *  - aller-retour front → SQL → front fidèle pour chaque table ;
 *  - chaque colonne de la base RÉELLE (créée par db.js, migrations incluses)
 *    est couverte (mappée, réservée serveur ou table documentée non mappée) ;
 *  - chaque clé des objets réels du DemoStore est couverte ;
 *  - les CHECK du schéma contiennent bien les énumérations du contrat.
 *
 * Structure d'une définition de table :
 *  champs            clé front → colonne SQL (lecture-écriture)
 *  champsLectureSeule clé front → colonne SQL GÉNÉRÉE (jamais écrite)
 *  booleens          clés front booléennes, stockées INTEGER 0/1
 *  tableauxJson      clés front tableau, stockées TEXT JSON
 *  valeurs           traductions d'énumérations { cléFront: { FRONT: 'SQL' } }
 *                    (vide depuis E1 : les enums SQL = ceux du contrat ;
 *                    le mécanisme reste pour d'éventuels besoins futurs)
 *  frontSeulement    clés front calculées/dénormalisées, jamais persistées
 *  bloquees          clés front SANS transposition possible aujourd'hui
 *                    (divergence à migrer) — versSql lève une erreur
 *  sqlSeulement      colonnes SQL sans équivalent front (réservées serveur)
 */

const TABLES = {

  fluides: {
    champs: {
      code: 'code',
      famille: 'famille',
      gwpAr4: 'gwp_ar4',
      classeSecurite: 'classe_securite'
    },
    frontSeulement: ['impact', 'nbMachines'],
    sqlSeulement: ['statut_reglementaire', 'commentaire']
  },

  etablissements: {
    champs: {
      raisonSociale: 'raison_sociale',
      siret: 'siret',
      adresse: 'adresse',
      numAttestationCapacite: 'numero_attestation_capacite',
      organisme: 'organisme_certificateur',
      dateDelivranceCapacite: 'date_delivrance',
      dateEcheanceCapacite: 'date_echeance',
      categoriesAutorisees: 'categories_2025',
      activitesAutorisees: 'activites_autorisees',
      sitesCouverts: 'sites_couverts',
      dernierAudit: 'date_dernier_audit',
      prochainAudit: 'date_prochain_audit'
    },
    tableauxJson: ['categoriesAutorisees', 'activitesAutorisees',
      'sitesCouverts'],
    // Le front traite l'établissement comme un singleton sans identifiant.
    sqlSeulement: ['id', 'categories_2008', 'date_creation']
  },

  personnel: {
    champs: {
      id: 'id',
      nom: 'nom',
      prenom: 'prenom',
      typePersonne: 'type_personne',
      roleApp: 'role_applicatif',
      numAttestationAptitude: 'numero_attestation_aptitude',
      organismeDelivreur: 'organisme_delivreur',
      dateObtention: 'date_obtention',
      dateFinValidite: 'date_limite_aptitude',
      categorie2008: 'categorie_2008',
      categorie2025: 'categorie_2025',
      activitesAutorisees: 'activites_autorisees',
      actif: 'actif',
      email: 'email'
    },
    booleens: ['actif'],
    tableauxJson: ['activitesAutorisees'],
    sqlSeulement: ['etablissement_id', 'signature_chemin', 'date_creation']
  },

  outillage: {
    champs: {
      id: 'id',
      typeOutil: 'type',
      marque: 'marque',
      modele: 'modele',
      numSerie: 'numero_serie',
      siteAtelier: 'site_atelier',
      precision: 'precision_balance',
      sensibilite: 'sensibilite_detecteur',
      dateEtalonnage: 'date_etalonnage',
      dateVerification: 'date_verification',
      prochaineEcheance: 'prochaine_echeance',
      statut: 'statut',
      // code_public (migration 012) : identifiant opaque QR de l'outil,
      // généré à la création (createOutil), immuable. Étiquette QR sur l'outil
      // → sa fiche d'édition (état d'étalonnage/vérification).
      codePublic: 'code_public'
    },
    sqlSeulement: ['etablissement_id', 'observation', 'date_creation']
  },

  clients_detenteurs: {
    champs: {
      id: 'id',
      raisonSociale: 'raison_sociale',
      adresse: 'adresse',
      siret: 'siret',
      // Coordonnées (Phase 2 « référence client ») : présentes en base
      // depuis le socle v1, désormais exposées au contrat (annuaire client).
      contact: 'contact',
      email: 'email',
      telephone: 'telephone',
      // actif : un client n'est jamais supprimé (machines rattachées), il est
      // DÉSACTIVÉ (masqué de l'annuaire actif) — même logique que personnel.
      actif: 'actif',
      // code_public (migration 011) : identifiant opaque QR du client, généré
      // à la création (createClient), immuable — jamais dans le patch
      // updateClient. Permet une étiquette QR « chez le client » → ses machines.
      codePublic: 'code_public'
    },
    booleens: ['actif'],
    frontSeulement: ['nbMachines'],
    sqlSeulement: ['etablissement_id']
  },

  machines: {
    champs: {
      id: 'id',
      code: 'code_interne',
      designation: 'designation',
      type: 'type',
      marque: 'marque',
      modele: 'modele',
      numSerie: 'numero_serie',
      localisation: 'localisation',
      siteLabel: 'site_label',
      clientId: 'client_detenteur_id',
      fluide: 'fluide',
      chargeNominaleKg: 'charge_nominale_kg',
      chargeActuelleKg: 'charge_actuelle_kg',
      dateMiseEnService: 'date_mise_en_service',
      detectionPermanente: 'detection_permanente',
      dernierControle: 'date_dernier_controle',
      prochainControle: 'date_prochain_controle',
      statut: 'statut',
      // code_public (migration 003 + backfill 006, V9.1) : généré à la
      // création (createMachine), jamais dans la liste CHAMPS d'updateMachine
      // — intouchable en pratique, comme code_interne.
      codePublic: 'code_public'
    },
    booleens: ['detectionPermanente'],
    // site_id (migration 002) sera exposé au contrat par une prochaine vague
    // (multi-sites) — réservé serveur d'ici là.
    sqlSeulement: ['etablissement_id', 'justification_detection',
      'frequence_controle_mois', 'plaque_fgas_generee', 'observation',
      'date_creation', 'site_id']
  },

  bouteilles: {
    champs: {
      id: 'id',
      code: 'code_interne',
      numeroReel: 'numero_bouteille',
      type: 'type',
      fluide: 'fluide',
      etatFluide: 'etat_fluide',
      tareKg: 'tare_kg',
      masseBruteKg: 'masse_brute_kg',
      masseEntreeKg: 'masse_nette_entree_kg',
      contenanceMaxKg: 'contenance_max_kg',
      proprietaire: 'proprietaire',
      lot: 'numero_lot',
      dateEntree: 'date_entree_stock',
      datePesee: 'date_derniere_pesee',
      statut: 'statut',
      decisionFluide: 'decision_fluide',
      decisionPar: 'decision_par',
      decisionDate: 'date_decision',
      numBsff: 'numero_bsff',
      dateLimiteGarde: 'date_limite_garde',
      // R2 (migration 7) : versements croisés dans une bouteille MELANGE —
      // [{ fluide, quantiteKg, date, mouvementId }, …], JSON nullable.
      compositionMelange: 'composition_melange',
      // code_public (migration 003 + backfill 009) : généré à la création
      // (createBouteille), jamais dans la liste CHAMPS d'updateBouteille —
      // intouchable en pratique, comme code_interne (parité machines V9.1).
      codePublic: 'code_public'
    },
    champsLectureSeule: {
      // Colonne GENERATED ALWAYS (masse_brute_kg − tare_kg) : jamais écrite.
      masseNetteKg: 'masse_nette_kg'
    },
    tableauxJson: ['compositionMelange'],
    sqlSeulement: ['etablissement_id', 'qr_interne', 'pese_par',
      'numero_bl_facture', 'date_retour_fournisseur', 'date_epreuve',
      'observation', 'date_creation']
  },

  mouvements: {
    champs: {
      id: 'id',
      numero: 'numero',
      date: 'date_mouvement',
      mode: 'mode',
      type: 'type_operation',
      causeMouvement: 'cause',
      machineId: 'machine_id',
      machineLabel: 'machine_label',
      fluide: 'fluide',
      quantiteKg: 'quantite_calculee_kg',
      peseeAvantKg: 'pesee_avant_kg',
      peseeApresKg: 'pesee_apres_kg',
      bouteilleSrcId: 'bouteille_source_id',
      bouteilleDstId: 'bouteille_destination_id',
      technicien: 'technicien',
      validateurId: 'validateur_id',
      signatureDataUrl: 'signature_data_url',
      cerfaNumero: 'cerfa_numero',
      statut: 'statut',
      dateSoumission: 'date_soumission',
      motifRejet: 'motif_rejet',
      motif: 'motif',
      hashEcriture: 'hash_ecriture',
      hashPrecedent: 'hash_precedent',
      ordreValidation: 'ordre_validation',
      contreEcritureDe: 'contre_ecriture_de',
      // PRP (gwp_ar4) FIGÉ à la validation — colonne posée par la
      // migration 13, HORS empreinte chaînée (liste blanche du hasseur).
      // NULL sur les écritures antérieures (backfill interdit par le WORM).
      prpFige: 'prg_fige',
      // Rôles réels d'une intervention (migration 16, chantier B2) : qui
      // exécute (élève), qui supervise (enseignant), qui répond du registre
      // (référent). Nullable, HORS empreinte de hachage, figés par le WORM.
      executeParId: 'execute_par_id',
      superviseurId: 'superviseur_id',
      responsableRegistreId: 'responsable_registre_id'
    },
    // proposerDemantelement : champ ÉPHÉMÈRE posé sur la COPIE retournée
    // par validerMouvement quand la récupération vide la machine — jamais
    // persisté, jamais relu.
    frontSeulement: ['proposerDemantelement'],
    bloquees: {
      controle: 'objet imbriqué { statutControle, detecteurId, controleId } : ' +
        'aplati par le LocalStore (E3) vers statut_controle_declare / ' +
        'detecteur_declare_id / controle_lie_id (colonnes posées en E1) — ' +
        'hors de portée d\'une correspondance plate'
    },
    sqlSeulement: ['etablissement_id', 'machine_destination_id', 'sens',
      'quantite_chargee_kg', 'quantite_recuperee_kg', 'quantite_cedee_kg',
      'quantite_retournee_fournisseur_kg', 'quantite_detruite_regeneree_kg',
      'origine_fluide', 'destination_fluide', 'technicien_id',
      'statut_controle_declare', 'detecteur_declare_id',
      'localisation_fuite_declaree', 'controle_lie_id',
      'bsff_id', 'observation', 'date_creation']
  },

  controles: {
    champs: {
      id: 'id',
      date: 'date_controle',
      typeControle: 'type_controle',
      machineId: 'machine_id',
      machineLabel: 'machine_label',
      methode: 'methode',
      resultat: 'resultat',
      detecteurId: 'detecteur_id',
      localisationFuite: 'localisation_fuite',
      reparationImmediate: 'reparation_immediate',
      // R4 : échéance ANNONCÉE au moment de la fuite (posée par
      // enregistrerControle) — lisible côté front pour calculer/afficher
      // le délai de 30 jours du contrôle de suivi après réparation tracée.
      dateReparationPrevue: 'date_reparation_prevue',
      // R3/R4 (migration 8) : réparation TRACÉE a posteriori (tracerReparation),
      // distincte de dateReparationPrevue ci-dessus (échéance annoncée).
      dateReparation: 'date_reparation',
      natureReparation: 'nature_reparation',
      reparateur: 'reparateur',
      reparateurId: 'reparateur_id',
      operateur: 'operateur',
      operateurId: 'operateur_id',
      mouvementId: 'mouvement_id',
      prochainControle: 'date_prochain_controle'
    },
    booleens: ['reparationImmediate'],
    frontSeulement: ['enRetard'],
    sqlSeulement: ['etablissement_id', 'charge_kg', 'prg_utilise', 'tco2eq',
      'methode_detail', 'partie_concernee', 'gravite',
      'controle_apres_reparation_id',
      'cerfa_numero', 'observation', 'date_creation']
  },

  bsff: {
    champs: {
      id: 'id',
      numeroBsff: 'numero_bsff',
      bouteilleId: 'bouteille_id',
      bouteilleCode: 'bouteille_code',
      fluide: 'fluide',
      transporteur: 'transporteur_collecteur',
      installationDestination: 'installation_destination',
      masseRemiseKg: 'masse_remise_kg',
      dateRemise: 'date_remise'
    },
    sqlSeulement: ['etablissement_id', 'statut_fluide', 'decision_par',
      'date_decision', 'lien_trackdechets', 'statut', 'observation',
      'date_creation']
  },

  retours_fournisseur: {
    champs: {
      id: 'id',
      bouteilleId: 'bouteille_id',
      bouteilleCode: 'bouteille_code',
      fluide: 'fluide',
      masseKg: 'masse_kg',
      date: 'date_retour',
      operateur: 'operateur'
    },
    sqlSeulement: ['etablissement_id']
  },

  stocks_initiaux: {
    champs: {
      annee: 'annee',
      fluide: 'fluide',
      neufKg: 'stock_neuf_kg',
      recupKg: 'stock_recupere_kg'
    },
    sqlSeulement: ['etablissement_id']
  },

  inventaires: {
    champs: {
      annee: 'annee',
      fluide: 'fluide',
      stockReelKg: 'stock_reel_kg',
      dateSaisie: 'date_saisie',
      operateur: 'operateur'
    },
    sqlSeulement: ['etablissement_id']
  },

  // Photographie annuelle NOMINATIVE (brique ② / B7, migration 14) :
  // une ligne par bouteille présente à la saisie de l'inventaire.
  inventaires_bouteilles: {
    champs: {
      annee: 'annee',
      bouteilleId: 'bouteille_id',
      code: 'code_interne',
      numeroReel: 'numero_bouteille',
      type: 'type',
      fluide: 'fluide',
      etatFluide: 'etat_fluide',
      statut: 'statut',
      masseNetteKg: 'masse_nette_kg',
      proprietaire: 'proprietaire',
      datePhoto: 'date_photo'
    },
    sqlSeulement: ['etablissement_id']
  },

  // Fuites machines OUVERTES au moment de la photo (même migration).
  inventaires_fuites: {
    champs: {
      annee: 'annee',
      machineId: 'machine_id',
      machineLabel: 'machine_label',
      dateConstat: 'date_constat',
      localisation: 'localisation',
      datePhoto: 'date_photo'
    },
    sqlSeulement: ['etablissement_id']
  },

  justifications_ecarts: {
    champs: {
      annee: 'annee',
      fluide: 'fluide',
      justification: 'justification',
      date: 'date_justification'
    },
    sqlSeulement: ['etablissement_id']
  },

  pieces_jointes: {
    champs: {
      id: 'id',
      entiteType: 'entite_type',
      entiteId: 'entite_id',
      categorie: 'categorie',
      nomFichier: 'nom_fichier',
      mimeType: 'mime_type',
      taille: 'taille_octets',
      hashSha256: 'hash_sha256',
      dateAjout: 'date_ajout',
      ajoutePar: 'ajoute_par'
    },
    // En mode Local le contenu vit sur disque (colonne chemin, posée par le
    // serveur) ; en démo il vit dans IndexedDB. Le contrat n'expose que les
    // métadonnées.
    sqlSeulement: ['etablissement_id', 'chemin']
  },

  journal_audit: {
    champs: {
      date: 'date_heure',
      qui: 'utilisateur',
      action: 'action',
      cible: 'cible',
      details: 'details'
    },
    // hash/hash_precedent (chaînage E2, posés par db.js:journaliser) et les
    // champs structurés restent réservés au serveur — le contrat n'expose
    // que { date, qui, action, cible, details }.
    sqlSeulement: ['id', 'entite_type', 'entite_id', 'avant_json',
      'apres_json', 'ip_poste', 'resultat', 'hash_precedent', 'hash']
  },

  sentinelle_alertes: {
    // Forme STOCKÉE à plat (cibleVue/cibleId) ; le handler getSentinelle
    // reconstruit ensuite l'objet cible { vue, id } de la forme de sortie.
    champs: {
      id: 'id',
      idAlerte: 'id_alerte',
      niveau: 'niveau',
      titre: 'titre',
      detail: 'detail',
      cibleVue: 'cible_vue',
      cibleId: 'cible_id',
      apparueLe: 'apparue_le',
      resolueLe: 'resolue_le',
      acquitteeLe: 'acquittee_le',
      acquitteePar: 'acquittee_par'
    },
    sqlSeulement: ['etablissement_id']
  },

  habilitations: {
    // Habilitations F-Gas multi-régime (migration 16, chantier B2).
    champs: {
      id: 'id',
      personneId: 'personne_id',
      regime: 'regime',
      categorie: 'categorie',
      numeroAttestation: 'numero_attestation',
      organismeDelivreur: 'organisme_delivreur',
      dateDebut: 'date_debut',
      dateFin: 'date_fin',
      actif: 'actif',
      dateRevocation: 'date_revocation'
    },
    booleens: ['actif'],
    sqlSeulement: ['etablissement_id', 'date_creation']
  },

  mentions_habilitation: {
    // Mentions de formation complémentaire par fluide (migration 17,
    // chantier B2 brique 1) : même patron que habilitations.
    champs: {
      id: 'id',
      personneId: 'personne_id',
      fluideMention: 'fluide',
      numeroAttestation: 'numero_attestation',
      organismeDelivreur: 'organisme_delivreur',
      dateDebut: 'date_debut',
      dateFin: 'date_fin',
      actif: 'actif',
      dateRevocation: 'date_revocation'
    },
    booleens: ['actif'],
    sqlSeulement: ['etablissement_id', 'date_creation']
  },

  mouvement_outillage: {
    // Jonction mouvement ↔ outillage (migration 18, brique produit n°2) :
    // quels outils réglementaires ont servi à quel mouvement. statut_fige /
    // echeance_figee = état de l'outil figé à la VALIDATION du mouvement
    // (hors empreinte : table séparée, le hash des mouvements ne bouge pas).
    champs: {
      id: 'id',
      mouvementId: 'mouvement_id',
      outillageId: 'outillage_id',
      statutFige: 'statut_fige',
      echeanceFigee: 'echeance_figee'
    },
    sqlSeulement: ['etablissement_id', 'date_creation']
  },

  audits_etablissement: {
    champs: {
      id: 'id',
      date: 'date_audit',
      organisme: 'organisme',
      resultat: 'resultat',
      remarques: 'observation'
    },
    sqlSeulement: ['etablissement_id', 'type_audit']
  },

  non_conformites: {
    champs: {
      id: 'id',
      auditId: 'audit_id',
      description: 'description',
      actionCorrective: 'action_corrective',
      echeance: 'date_echeance_action',
      statut: 'statut',
      dateSolde: 'date_cloture',
      commentaireSolde: 'commentaire_solde'
    },
    sqlSeulement: ['etablissement_id', 'date_constat', 'gravite']
  }
};

/**
 * Tables de la base volontairement NON mappées vers le contrat DataStore,
 * avec la raison. Le test de couverture exige que toute table de la base
 * réelle soit ou bien mappée, ou bien listée ici.
 */
const TABLES_NON_MAPPEES = {
  sites: 'posée par la migration 002 pour V9.1 (fiche machine) — pas encore ' +
    'd\'objet dans le contrat',
  utilisateurs_app: 'authentification, réservée au serveur (E5) — jamais ' +
    'exposée au front',
  sessions: 'jetons de session (E5, migration 005) — réservée au serveur, ' +
    'jamais exposée au front',
  parametres: 'clé/valeur interne du serveur'
};

/**
 * Divergences front ↔ schéma RESTANTES après les alignements E1 et E2,
 * chacune datée de l'incrément qui doit la résorber. (Les 18 divergences
 * relevées en E0 ont été résorbées par le schéma v1 ; le journal chaîné —
 * migration 004 + db.js:journaliser — a résorbé celle du journal.)
 */
const DIVERGENCES = [
  { objet: 'mouvements.controle', echeance: 'E3',
    constat: 'Objet imbriqué côté contrat ; colonnes aplaties côté SQL ' +
      '(statut_controle_declare, detecteur_declare_id, controle_lie_id). ' +
      'Le LocalStore fera l\'aplatissement et la reconstitution.' },
  { objet: 'etablissements.categories_2008', echeance: 'E3',
    constat: 'Le contrat ne porte qu\'une liste de catégories (mappée sur ' +
      'categories_2025) ; le sort de la grille 2008 (transition jusqu\'au ' +
      '31/12/2026) reste à confirmer avec Franck.' },
  { objet: 'vue bilan_matiere', echeance: 'E3',
    constat: 'La vue SQL reproduit le calcul du contrat (écritures figées ' +
      'signées, TRANSFERT exclu, stocks initiaux, inventaire à plat) mais ' +
      'sa conformité ne sera PROUVÉE que par test-contrat contre le ' +
      'LocalStore (getBalanceMatiere).' },
  { objet: 'inventaire nominatif', echeance: 'V9.4',
    constat: 'L\'inventaire est à plat par (année, fluide) comme le ' +
      'contrat ; l\'inventaire nominatif bouteille par bouteille (CF-20) ' +
      'et l\'inventaire d\'ouverture au 01/01 sont une évolution prévue.' }
];

// ------------------------------------------------------------
// Traduction
// ------------------------------------------------------------

function definition(nomTable) {
  const def = TABLES[nomTable];
  if (!def) {
    throw new Error(`Table inconnue du mapping : ${nomTable}.`);
  }
  return def;
}

/** colonne SQL → clé front (champs + champs générés), calculé une fois. */
const INVERSES = new Map();
function inverses(nomTable) {
  if (!INVERSES.has(nomTable)) {
    const def = definition(nomTable);
    const table = {};
    for (const [cle, colonne] of Object.entries(def.champs)) {
      table[colonne] = cle;
    }
    for (const [cle, colonne] of Object.entries(def.champsLectureSeule ?? {})) {
      table[colonne] = cle;
    }
    INVERSES.set(nomTable, table);
  }
  return INVERSES.get(nomTable);
}

function traduireValeurVersSql(def, cle, valeur) {
  if (valeur === undefined || valeur === null) return null;
  if ((def.booleens ?? []).includes(cle)) return valeur ? 1 : 0;
  if ((def.tableauxJson ?? []).includes(cle)) return JSON.stringify(valeur);
  const enumeration = def.valeurs?.[cle];
  if (enumeration) {
    // Object.hasOwn : jamais la chaîne de prototypes (une valeur
    // « constructor » doit être refusée, pas traduite en fonction).
    if (!Object.hasOwn(enumeration, valeur)) {
      throw new Error(`Valeur « ${valeur} » de ${cle} sans équivalent SQL ` +
        '(divergence d\'énumération à migrer — voir DIVERGENCES).');
    }
    return enumeration[valeur];
  }
  return valeur;
}

function traduireValeurVersFront(def, cle, valeur) {
  if (valeur === undefined || valeur === null) return null;
  if ((def.booleens ?? []).includes(cle)) return Boolean(valeur);
  if ((def.tableauxJson ?? []).includes(cle)) {
    return typeof valeur === 'string' ? JSON.parse(valeur) : valeur;
  }
  const enumeration = def.valeurs?.[cle];
  if (enumeration) {
    const front = Object.keys(enumeration)
      .find((f) => enumeration[f] === valeur);
    if (front === undefined) {
      throw new Error(`Valeur SQL « ${valeur} » de ${cle} sans équivalent ` +
        'front (divergence d\'énumération — voir DIVERGENCES).');
    }
    return front;
  }
  return valeur;
}

/**
 * Traduit un objet du contrat (camelCase) en ligne SQL (snake_case).
 * - Les clés calculées (frontSeulement) et générées (champsLectureSeule)
 *   sont ignorées : elles ne s'écrivent jamais.
 * - Une clé « bloquée » (divergence non migrée) LÈVE une erreur explicite.
 * - Une clé inconnue LÈVE une erreur : c'est l'anti-dérive.
 */
function versSql(nomTable, objetFront) {
  const def = definition(nomTable);
  const ligne = {};
  for (const [cle, valeur] of Object.entries(objetFront ?? {})) {
    if ((def.frontSeulement ?? []).includes(cle)) continue;
    if (Object.hasOwn(def.champsLectureSeule ?? {}, cle)) continue;
    if (def.bloquees && Object.hasOwn(def.bloquees, cle)) {
      throw new Error(
        `${nomTable}.${cle} : non transposable en SQL — ${def.bloquees[cle]}.`);
    }
    const colonne = Object.hasOwn(def.champs, cle) ? def.champs[cle] : null;
    if (!colonne) {
      throw new Error(`Clé front inconnue du mapping ${nomTable} : ${cle}.`);
    }
    ligne[colonne] = traduireValeurVersSql(def, cle, valeur);
  }
  return ligne;
}

/**
 * Traduit une ligne SQL (snake_case) en objet du contrat (camelCase).
 * - Les colonnes réservées serveur (sqlSeulement) sont ignorées.
 * - Une colonne inconnue LÈVE une erreur : une migration qui ajoute une
 *   colonne doit la déclarer ici, sinon le build casse.
 */
function versFront(nomTable, ligneSql) {
  const def = definition(nomTable);
  const table = inverses(nomTable);
  const objet = {};
  for (const [colonne, valeur] of Object.entries(ligneSql ?? {})) {
    if ((def.sqlSeulement ?? []).includes(colonne)) continue;
    const cle = Object.hasOwn(table, colonne) ? table[colonne] : null;
    if (!cle) {
      throw new Error(
        `Colonne inconnue du mapping ${nomTable} : ${colonne}.`);
    }
    objet[cle] = traduireValeurVersFront(def, cle, valeur);
  }
  return objet;
}

module.exports = {
  TABLES,
  TABLES_NON_MAPPEES,
  DIVERGENCES,
  versSql,
  versFront
};
