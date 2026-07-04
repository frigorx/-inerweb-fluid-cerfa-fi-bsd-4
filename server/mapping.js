'use strict';

/**
 * inerWeb Fluide — CORRESPONDANCE unique front (camelCase) ↔ SQL (snake_case).
 * (V9-E0 — VISION-V9-V10 §11 : « le mapping dans un seul module »)
 *
 * Ce module est LA SEULE source de vérité de la traduction entre les objets
 * du contrat DataStore (v8/js/data/contrat.js, formes camelCase du front) et
 * les colonnes de server/schema.sql. Le futur LocalStore (E3) et les routes
 * serveur passent exclusivement par ici — jamais de renommage à la main dans
 * une route (leçon v7 : deux traductions divergentes = deux vérités).
 *
 * Il consigne aussi, sans les masquer, les DIVERGENCES structurelles
 * constatées entre le front réel et le schéma actuel : colonnes absentes,
 * enums désaccordés, tables manquantes. Chaque divergence pointe l'incrément
 * (E1, E2, E3, E5) qui doit la résorber. Tant qu'elle ne l'est pas, toute
 * tentative de traduction du champ concerné LÈVE une erreur explicite :
 * rien ne passe en silence.
 *
 * Vérifié mécaniquement par server/test-mapping.mjs :
 *  - aller-retour front → SQL → front fidèle pour chaque table ;
 *  - chaque colonne du schéma est couverte (mappée, réservée serveur ou
 *    documentée en divergence) ;
 *  - chaque clé des objets réels du DemoStore est couverte.
 *
 * Structure d'une définition de table :
 *  champs            clé front → colonne SQL (lecture-écriture)
 *  champsLectureSeule clé front → colonne SQL GÉNÉRÉE (jamais écrite)
 *  booleens          clés front booléennes, stockées INTEGER 0/1
 *  tableauxJson      clés front tableau, stockées TEXT JSON
 *  valeurs           traductions d'énumérations { cléFront: { FRONT: 'SQL' } }
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
    valeurs: {
      typePersonne: {
        SALARIE: 'SALARIE',
        ENSEIGNANT: 'ENSEIGNANT',
        ELEVE: 'ELEVE',
        SOUS_TRAITANT: 'SOUS_TRAITANT',
        INTERVENANT_EXT: 'INTERVENANT_EXTERIEUR'
      }
    },
    bloquees: {
      roleApp: 'enum SQL role_applicatif (VOIR/SAISIR/VALIDER/ADMINISTRER/' +
        'OFFICIEL) étranger aux rôles réels (ADMIN/REFERENT/ENSEIGNANT/' +
        'ELEVE) — CHECK à réécrire, migration E1 (vision §5.1)'
    },
    sqlSeulement: ['etablissement_id', 'role_applicatif', 'signature_chemin',
      'date_creation']
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
      dateVerification: 'date_verification',
      prochaineEcheance: 'prochaine_echeance',
      statut: 'statut'
    },
    valeurs: {
      typeOutil: {
        STATION_RECUPERATION: 'STATION_RECUPERATION',
        STATION_CHARGE: 'STATION_CHARGE',
        BALANCE: 'BALANCE',
        DETECTEUR: 'DETECTEUR_FUITE',
        POMPE_A_VIDE: 'POMPE_A_VIDE',
        MANIFOLD: 'MANIFOLD',
        THERMOMETRE: 'THERMOMETRE_SONDE',
        BOUTEILLE_RECUP: 'BOUTEILLE_RECUPERATION',
        FLEXIBLE: 'FLEXIBLE_VANNES',
        EPI: 'EPI',
        AUTRE: 'AUTRE'
      }
    },
    bloquees: {
      dateEtalonnage: 'colonne date_etalonnage absente du schéma — ' +
        'migration E1'
    },
    sqlSeulement: ['etablissement_id', 'observation', 'date_creation']
  },

  clients_detenteurs: {
    champs: {
      id: 'id',
      raisonSociale: 'raison_sociale',
      adresse: 'adresse',
      siret: 'siret'
    },
    frontSeulement: ['nbMachines'],
    sqlSeulement: ['etablissement_id', 'contact', 'email', 'telephone',
      'actif']
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
      clientId: 'client_detenteur_id',
      fluide: 'fluide',
      chargeNominaleKg: 'charge_nominale_kg',
      chargeActuelleKg: 'charge_actuelle_kg',
      dateMiseEnService: 'date_mise_en_service',
      detectionPermanente: 'detection_permanente',
      dernierControle: 'date_dernier_controle',
      prochainControle: 'date_prochain_controle',
      statut: 'statut'
    },
    booleens: ['detectionPermanente'],
    valeurs: {
      // FUITE et CONTROLE_DU n'ont AUCUNE valeur SQL : le CHECK doit être
      // élargi (migration E1). En attendant, les traduire lève une erreur.
      statut: {
        EN_SERVICE: 'EN_SERVICE',
        ARRETEE: 'ARRETE',
        DEMANTELEE: 'DEMANTELE'
      }
    },
    frontSeulement: ['siteLabel'],
    sqlSeulement: ['etablissement_id', 'justification_detection',
      'frequence_controle_mois', 'plaque_fgas_generee', 'observation',
      'date_creation']
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
      lot: 'numero_lot',
      dateEntree: 'date_entree_stock',
      datePesee: 'date_derniere_pesee',
      statut: 'statut',
      numBsff: 'numero_bsff',
      dateLimiteGarde: 'date_limite_garde'
    },
    champsLectureSeule: {
      // Colonne GENERATED ALWAYS (masse_brute_kg − tare_kg) : jamais écrite.
      masseNetteKg: 'masse_nette_kg'
    },
    bloquees: {
      proprietaire: 'texte libre côté front (« Climalife ») contre CHECK ' +
        'strict côté SQL (FOURNISSEUR/ETABLISSEMENT/CONSIGNATION) — ' +
        'normalisation à trancher, migration E1',
      decisionFluide: 'porté côté SQL par bsff.statut_fluide — ' +
        'réconciliation du modèle en E1/E3',
      decisionPar: 'porté côté SQL par bsff.decision_par — E1/E3',
      decisionDate: 'porté côté SQL par bsff.date_decision — E1/E3'
    },
    sqlSeulement: ['etablissement_id', 'qr_interne', 'proprietaire',
      'pese_par', 'numero_bl_facture', 'date_retour_fournisseur',
      'date_epreuve', 'observation', 'date_creation']
  },

  mouvements: {
    champs: {
      id: 'id',
      numero: 'numero',
      date: 'date_heure',
      mode: 'mode',
      type: 'type_operation',
      machineId: 'machine_id',
      fluide: 'fluide',
      quantiteKg: 'quantite_calculee_kg',
      peseeAvantKg: 'pesee_avant_kg',
      peseeApresKg: 'pesee_apres_kg',
      bouteilleSrcId: 'bouteille_source_id',
      bouteilleDstId: 'bouteille_destination_id',
      causeMouvement: 'cause',
      validateurId: 'validateur_id',
      hashEcriture: 'hash_ecriture',
      contreEcritureDe: 'contre_ecriture_de',
      statut: 'statut',
      cerfaNumero: 'cerfa_numero'
    },
    frontSeulement: ['machineLabel'],
    bloquees: {
      hashPrecedent: 'colonne hash_precedent absente — migration E1 ' +
        '(indispensable à la vérification de chaîne)',
      ordreValidation: 'colonne ordre_validation absente — migration E1',
      dateSoumission: 'colonne date_soumission absente — migration E1',
      motifRejet: 'colonne motif_rejet absente — migration E1',
      motif: 'colonne motif absente (contre-écritures) — migration E1',
      signatureDataUrl: 'support de la signature à trancher (colonne ou ' +
        'pièce jointe) — E1',
      technicien: 'front = nom en toutes lettres, SQL = technicien_id ' +
        '(clé étrangère personnel) — réconciliation E3',
      controle: 'objet imbriqué { statutControle, detecteurId, controleId } ' +
        'sans colonnes SQL — réconciliation E1/E3 (avec controles.mouvement_id)'
    },
    sqlSeulement: ['etablissement_id', 'machine_destination_id', 'sens',
      'quantite_chargee_kg', 'quantite_recuperee_kg', 'quantite_cedee_kg',
      'quantite_retournee_fournisseur_kg', 'quantite_detruite_regeneree_kg',
      'origine_fluide', 'destination_fluide', 'technicien_id', 'bsff_id',
      'observation', 'date_creation']
  },

  controles: {
    champs: {
      id: 'id',
      date: 'date_controle',
      typeControle: 'type_controle',
      machineId: 'machine_id',
      methode: 'methode',
      resultat: 'resultat',
      detecteurId: 'detecteur_id',
      localisationFuite: 'localisation_fuite',
      reparationImmediate: 'reparation_immediate',
      operateurId: 'operateur_id',
      prochainControle: 'date_prochain_controle'
    },
    booleens: ['reparationImmediate'],
    valeurs: {
      resultat: { CONFORME: 'CONFORME', FUITE: 'FUITE_DETECTEE' }
    },
    frontSeulement: ['machineLabel', 'enRetard'],
    bloquees: {
      operateur: 'front = nom en toutes lettres (seule identité portée ' +
        'par les contrôles réels), SQL = operateur_id — réconciliation E3 ' +
        '(même cas que mouvements.technicien)',
      mouvementId: 'colonne mouvement_id absente — migration E1 ' +
        '(croisement contrôle ↔ mouvement, CR-3)'
    },
    sqlSeulement: ['etablissement_id', 'charge_kg', 'prg_utilise', 'tco2eq',
      'methode_detail', 'partie_concernee', 'gravite',
      'date_reparation_prevue', 'controle_apres_reparation_id',
      'cerfa_numero', 'observation', 'date_creation']
  },

  bsff: {
    champs: {
      id: 'id',
      numeroBsff: 'numero_bsff',
      bouteilleId: 'bouteille_id',
      fluide: 'fluide',
      transporteur: 'transporteur_collecteur',
      installationDestination: 'installation_destination',
      masseRemiseKg: 'masse_remise_kg',
      dateRemise: 'date_remise'
    },
    frontSeulement: ['bouteilleCode'],
    sqlSeulement: ['etablissement_id', 'statut_fluide', 'decision_par',
      'date_decision', 'lien_trackdechets', 'statut', 'observation',
      'date_creation']
  },

  pieces_jointes: {
    champs: {
      id: 'id',
      entiteType: 'entite_type',
      entiteId: 'entite_id',
      categorie: 'categorie',
      nomFichier: 'nom_fichier',
      taille: 'taille_octets',
      hashSha256: 'hash_sha256',
      dateAjout: 'date_ajout',
      ajoutePar: 'ajoute_par'
    },
    bloquees: {
      mimeType: 'colonne mime_type absente — migration E1'
    },
    // En mode Local le contenu vit sur disque (colonne chemin) ; en démo il
    // vit dans IndexedDB. Le contrat n'expose que les métadonnées.
    sqlSeulement: ['etablissement_id', 'chemin']
  },

  journal_audit: {
    champs: {
      date: 'date_heure',
      qui: 'utilisateur',
      action: 'action'
    },
    bloquees: {
      cible: 'répartition entre entite_type et entite_id à trancher — E2 ' +
        '(journal chaîné)',
      details: 'colonne d’accueil à trancher (apres_json ? resultat ?) — E2'
    },
    sqlSeulement: ['id', 'entite_type', 'entite_id', 'avant_json',
      'apres_json', 'ip_poste', 'resultat']
  },

  audits_etablissement: {
    champs: {
      id: 'id',
      date: 'date_audit',
      organisme: 'organisme',
      remarques: 'observation'
    },
    bloquees: {
      resultat: 'texte libre côté front (« Conforme avec 1 remarque ») ' +
        'contre CHECK strict côté SQL (CONFORME/CONFORME_AVEC_REMARQUES/' +
        'NON_CONFORME) — normalisation à trancher, migration E1'
    },
    sqlSeulement: ['etablissement_id', 'type_audit', 'resultat']
  },

  non_conformites: {
    champs: {
      id: 'id',
      auditId: 'audit_id',
      description: 'description',
      actionCorrective: 'action_corrective',
      echeance: 'date_echeance_action',
      statut: 'statut',
      dateSolde: 'date_cloture'
    },
    valeurs: {
      statut: { OUVERTE: 'OUVERTE', SOLDEE: 'CLOTUREE' }
    },
    bloquees: {
      commentaireSolde: 'colonne commentaire_solde absente — migration E1'
    },
    sqlSeulement: ['etablissement_id', 'date_constat', 'gravite']
  }
};

/**
 * Tables du schéma volontairement NON mappées vers le contrat DataStore,
 * avec la raison. Le test de couverture exige que toute table du schéma
 * soit ou bien mappée, ou bien listée ici.
 */
const TABLES_NON_MAPPEES = {
  inventaires: 'modèle SQL (campagne + lignes neuf/récupéré) étranger au ' +
    'modèle front plat { annee, fluide, stockReelKg } — réconciliation E1',
  inventaire_lignes: 'voir inventaires — réconciliation E1',
  utilisateurs_app: 'authentification, réservée au serveur (E5) — jamais ' +
    'exposée au front',
  parametres: 'clé/valeur interne du serveur'
};

/**
 * Divergences STRUCTURELLES front ↔ schéma constatées à l'écriture du
 * contrat (E0). Chacune désigne l'incrément qui doit la résorber.
 * C'est l'intrant direct des migrations E1/E2 et du LocalStore E3.
 */
const DIVERGENCES = [
  { objet: 'mouvements', echeance: 'E1',
    constat: 'Colonnes absentes : hash_precedent, ordre_validation, ' +
      'date_soumission, motif_rejet, motif, signature. Sans hash_precedent ' +
      'ni ordre_validation, la chaîne du registre n’est pas vérifiable ' +
      'côté SQL.' },
  { objet: 'mouvements.controle / controles.mouvement_id', echeance: 'E1',
    constat: 'Le front imbrique le contrôle déclaré dans le mouvement et ' +
      'croise controleId/mouvementId ; le schéma n’a ni l’un ni ' +
      'l’autre.' },
  { objet: 'mouvements.technicien', echeance: 'E3',
    constat: 'Front : nom en toutes lettres (personne extérieure possible) ; ' +
      'SQL : technicien_id NOT NULL vers personnel. Trancher : colonne ' +
      'texte libre + clé optionnelle, ou personnel systématique. Même cas ' +
      'pour controles.operateur (seule identité des contrôles réels).' },
  { objet: 'mouvements.quantiteKg', echeance: 'E1',
    constat: 'Convention front : quantité SIGNÉE (négative = récupération), ' +
      'celle du contrat ; le schéma documente quantite_calculee_kg comme ' +
      'valeur absolue et porte le sens dans la colonne sens. Le contrat ' +
      'fait foi : corriger le commentaire SQL, statuer sur sens.' },
  { objet: 'audits_etablissement.resultat', echeance: 'E1',
    constat: 'Front : texte libre (« Conforme avec 1 remarque ») ; SQL : ' +
      'CHECK strict. Élargir/supprimer le CHECK ou normaliser le front.' },
  { objet: 'machines.statut', echeance: 'E1',
    constat: 'CHECK SQL limité à EN_SERVICE/ARRETE/DEMANTELE (au masculin) ; ' +
      'le front vit avec ARRETEE/DEMANTELEE et deux états de plus : FUITE, ' +
      'CONTROLE_DU.' },
  { objet: 'personnel.role_applicatif', echeance: 'E1',
    constat: 'Enum SQL (VOIR/SAISIR/VALIDER/ADMINISTRER/OFFICIEL) étranger ' +
      'aux rôles réels du contrat (ADMIN/REFERENT/ENSEIGNANT/ELEVE, plus ' +
      'TECHNICIEN en V9) — vision §5.1.' },
  { objet: 'retoursFournisseur', echeance: 'E1',
    constat: 'Poste à part entière de la balance matière côté front ' +
      '(IM-9) ; AUCUNE table SQL. Créer retours_fournisseur.' },
  { objet: 'stocksInitiaux', echeance: 'E1',
    constat: 'Stocks d’ouverture par fluide côté front ; aucune table ' +
      'SQL. Créer stocks_initiaux (ou lignes d’inventaire d’ouverture).' },
  { objet: 'inventaires / justificationsEcarts', echeance: 'E1',
    constat: 'Front : upsert plat par (annee, fluide) + justifications ' +
      'séparées ; SQL : campagnes + lignes neuf/récupéré + justification ' +
      'embarquée. Le contrat (front) fait foi : aligner le schéma ou faire ' +
      'traduire le LocalStore.' },
  { objet: 'pieces_jointes.mime_type', echeance: 'E1',
    constat: 'Le front porte mimeType (liste blanche IM-19) ; pas de ' +
      'colonne SQL.' },
  { objet: 'bouteilles.decision*', echeance: 'E1/E3',
    constat: 'decisionFluide/decisionPar/decisionDate vivent sur la ' +
      'bouteille côté front, sur le bsff côté SQL.' },
  { objet: 'bouteilles.proprietaire', echeance: 'E1',
    constat: 'SQL : NOT NULL DEFAULT ETABLISSEMENT avec CHECK ; front : ' +
      'texte libre (« Climalife ») ou null. Champ bloqué en attendant la ' +
      'normalisation (CHECK à revoir ou champ front à contraindre).' },
  { objet: 'outillage.date_etalonnage', echeance: 'E1',
    constat: 'Le front distingue étalonnage et vérification ; le schéma ' +
      'n’a que date_verification. (RACCORDS_SPECIFIQUES, valeur SQL sans ' +
      'équivalent front, reste inutilisée.)' },
  { objet: 'etablissements.categories', echeance: 'E1',
    constat: 'Front : categoriesAutorisees unique ; SQL : categories_2008 ' +
      'ET categories_2025. Mappé sur categories_2025 ; confirmer le sort ' +
      'de 2008.' },
  { objet: 'non_conformites', echeance: 'E1',
    constat: 'commentaire_solde absent ; statuts SQL EN_COURS/gravite/' +
      'date_constat inutilisés par le front (SOLDEE ↔ CLOTUREE traduit).' },
  { objet: 'journal_audit', echeance: 'E2',
    constat: 'Ajouter hash_precedent et hash (chaînage du journal — le ' +
      'vrai passage démo → coffre-fort) ; trancher l’accueil de cible/' +
      'details.' },
  { objet: 'mouvements.date_heure', echeance: 'E3',
    constat: 'Le front ne porte qu’une date de jour (AAAA-MM-JJ) ; la ' +
      'colonne suggère un horodatage complet. Le contrat impose la date ' +
      'de jour (§7 du contrat).' }
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
        '(divergence d’énumération à migrer — voir DIVERGENCES).');
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
        'front (divergence d’énumération — voir DIVERGENCES).');
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
