// ============================================================
// inerWeb Fluide v8 — données de démonstration (Phase A)
// Monde fictif EXACT de la maquette validée (Claude Design, 02/07/2026).
// Toutes les dates sont en ISO (AAAA-MM-JJ). Masses en kg.
// ============================================================

export const DEMO = {

  // --------------------------------------------------------
  // Établissement (opérateur attesté) — dossier complet Phase C
  // --------------------------------------------------------
  etablissement: {
    raisonSociale: 'Lycée Professionnel Jacques Raynaud',
    siret: '191 300 456 00012',
    adresse: 'Bd Rabatau, 13010 Marseille',
    numAttestationCapacite: 'AC-13-004567',
    organisme: 'QualiFroid Cert',
    dateDelivranceCapacite: '2022-03-15',
    dateEcheanceCapacite: '2027-03-14',
    categoriesAutorisees: ['I'],
    activitesAutorisees: ['MISE_EN_SERVICE', 'MAINTENANCE', 'CONTROLE',
      'RECUPERATION', 'DEMANTELEMENT'],
    sitesCouverts: ['Lycée J. Raynaud — Atelier (Bd Rabatau, 13010 Marseille)'],
    dernierAudit: '2026-01-12',
    prochainAudit: '2027-01-12'
  },

  // --------------------------------------------------------
  // Audits de l'organisme certificateur (dossier opérateur)
  // --------------------------------------------------------
  auditsOrganisme: [
    {
      id: 'aud-1',
      date: '2026-01-12',
      organisme: 'QualiFroid Cert',
      resultat: 'Conforme avec 1 remarque',
      remarques: 'Le certificat d’étalonnage de la balance doit être ' +
        'archivé dans le dossier opérateur.'
    }
  ],

  // --------------------------------------------------------
  // Non-conformités et actions correctives
  // --------------------------------------------------------
  nonConformites: [
    {
      id: 'nc-1',
      auditId: 'aud-1',
      description: 'Certificat de la balance à archiver dans le dossier',
      actionCorrective: 'Numériser et joindre le certificat',
      echeance: '2026-09-30',
      statut: 'OUVERTE',
      dateSolde: null,
      commentaireSolde: null
    }
  ],

  // --------------------------------------------------------
  // Clients / détenteurs d'équipements
  // --------------------------------------------------------
  clients: [
    {
      id: 'cli-fournil',
      raisonSociale: 'Boulangerie Le Fournil',
      adresse: '13006 Marseille',
      siret: '824 519 002 00018',
      nbMachines: 1
    },
    {
      id: 'cli-lycee',
      raisonSociale: 'Lycée J. Raynaud — Atelier',
      adresse: '13010 Marseille',
      siret: '191 300 456 00012',
      nbMachines: 5
    }
  ],

  // --------------------------------------------------------
  // Parc machines (6 équipements)
  // --------------------------------------------------------
  machines: [
    {
      id: 'M1',
      code: 'M1',
      designation: 'Chambre froide positive — Labo',
      type: 'Chambre froide',
      marque: 'Bitzer',
      modele: 'ECOLINE',
      numSerie: 'BZ-77120',
      fluide: 'R-404A',
      chargeNominaleKg: 4.50,
      chargeActuelleKg: 4.20,
      clientId: 'cli-lycee',
      localisation: 'Atelier froid — poste 1',
      siteLabel: 'Lycée J. Raynaud — Atelier',
      statut: 'EN_SERVICE',
      detectionPermanente: false,
      dernierControle: '2026-06-29',
      prochainControle: '2027-06-29'
    },
    {
      id: 'M2',
      code: 'M2',
      designation: 'Vitrine réfrigérée pédagogique',
      type: 'Vitrine réfrigérée',
      marque: 'Costan',
      modele: 'GranVista',
      numSerie: 'CG-45012',
      fluide: 'R-134a',
      chargeNominaleKg: 1.80,
      chargeActuelleKg: 1.80,
      clientId: 'cli-lycee',
      localisation: 'Atelier froid — poste 2',
      siteLabel: 'Lycée J. Raynaud — Atelier',
      statut: 'EN_SERVICE',
      detectionPermanente: false,
      dernierControle: '2026-05-30',
      prochainControle: '2027-05-30'
    },
    {
      id: 'M3',
      code: 'M3',
      designation: 'PAC air/eau formation',
      type: 'PAC (Pompe à chaleur)',
      marque: 'Daikin',
      modele: 'Altherma 3',
      numSerie: 'DA3-88210',
      fluide: 'R-32',
      chargeNominaleKg: 2.40,
      chargeActuelleKg: 2.40,
      clientId: 'cli-lycee',
      localisation: 'Plateforme extérieure',
      siteLabel: 'Lycée J. Raynaud — Atelier',
      statut: 'EN_SERVICE',
      detectionPermanente: false,
      dernierControle: '2026-06-12',
      prochainControle: '2027-06-12'
    },
    {
      id: 'M4',
      code: 'M4',
      designation: 'Monosplit salle de classe',
      type: 'Monosplit',
      marque: 'Mitsubishi',
      modele: 'MSZ-AP',
      numSerie: 'MA-91733',
      fluide: 'R-32',
      chargeNominaleKg: 0.90,
      chargeActuelleKg: 0.90,
      clientId: 'cli-lycee',
      localisation: 'Salle B12',
      siteLabel: 'Lycée J. Raynaud — Atelier',
      statut: 'EN_SERVICE',
      detectionPermanente: false,
      dernierControle: null,
      // Charge inférieure au seuil réglementaire : pas de contrôle périodique
      prochainControle: null
    },
    {
      id: 'M5',
      code: 'M5',
      designation: 'Chambre froide — Le Fournil',
      type: 'Chambre froide',
      marque: 'Copeland',
      modele: 'ZX',
      numSerie: 'ZX-33107',
      fluide: 'R-455A',
      chargeNominaleKg: 3.20,
      chargeActuelleKg: 3.05,
      clientId: 'cli-fournil',
      localisation: 'Boulangerie Le Fournil',
      siteLabel: 'Boulangerie Le Fournil',
      statut: 'FUITE',
      detectionPermanente: true,
      dernierControle: '2026-06-18',
      // Recontrôle après réparation de fuite
      prochainControle: '2026-07-23'
    },
    {
      id: 'M6',
      code: 'M6',
      designation: 'Multisplit bureaux',
      type: 'Multisplit',
      marque: 'Toshiba',
      modele: 'RAS-M',
      numSerie: 'RM-55019',
      fluide: 'R-410A',
      chargeNominaleKg: 3.80,
      chargeActuelleKg: 3.60,
      clientId: 'cli-lycee',
      localisation: 'Bureaux administration',
      siteLabel: 'Lycée J. Raynaud — Atelier',
      statut: 'CONTROLE_DU',
      detectionPermanente: false,
      dernierControle: '2026-05-03',
      // Échéance DÉPASSÉE (contrôle dû)
      prochainControle: '2026-06-27'
    }
  ],

  // --------------------------------------------------------
  // Stock bouteilles (5 bouteilles — masses nettes : 31,0 kg au total)
  // Convention Phase A : masseNetteKg est PRÉCALCULÉ (brute − tare).
  // Phase C : masseEntreeKg = masse nette à l'ENTRÉE en stock
  // (sert au poste « achats » de la balance matière).
  // --------------------------------------------------------
  bouteilles: [
    {
      id: 'B1',
      code: 'B-01',
      numeroReel: 'CLI-32-08412',
      type: 'NEUVE',
      fluide: 'R-32',
      etatFluide: 'VIERGE',
      tareKg: 12.0,
      masseBruteKg: 19.4,
      masseNetteKg: 7.4,
      masseEntreeKg: 9.0,
      contenanceMaxKg: 10,
      proprietaire: 'Climalife',
      lot: 'LOT-32-A19',
      dateEntree: '2026-04-15',
      datePesee: '2026-06-29',
      statut: 'EN_STOCK'
    },
    {
      id: 'B2',
      code: 'B-02',
      numeroReel: 'WF-134-22087',
      type: 'NEUVE',
      fluide: 'R-134a',
      etatFluide: 'VIERGE',
      tareKg: 11.5,
      masseBruteKg: 20.6,
      masseNetteKg: 9.1,
      masseEntreeKg: 10.9,
      contenanceMaxKg: 12,
      proprietaire: 'Westfalen',
      lot: 'LOT-134-77',
      dateEntree: '2026-03-02',
      datePesee: '2026-06-23',
      statut: 'EN_STOCK'
    },
    {
      id: 'B3',
      code: 'B-03',
      numeroReel: 'CLI-404-REC02',
      type: 'RECUPERATION',
      fluide: 'R-404A',
      etatFluide: 'RECUPERE',
      tareKg: 13.2,
      masseBruteKg: 16.8,
      masseNetteKg: 3.6,
      masseEntreeKg: 3.6,
      contenanceMaxKg: 10,
      proprietaire: 'Climalife',
      lot: 'REC-404-02',
      dateEntree: '2026-05-10',
      datePesee: '2026-06-29',
      statut: 'EN_STOCK',
      // Chaîne déchets : AUCUNE décision encore prise sur ce fluide
      // récupéré (candidate à la démonstration réutilisable/déchet).
      decisionFluide: null,
      decisionPar: null,
      decisionDate: null,
      dateLimiteGarde: null,
      numBsff: null
    },
    {
      id: 'B4',
      code: 'B-04',
      numeroReel: 'CLI-455-01193',
      type: 'NEUVE',
      fluide: 'R-455A',
      etatFluide: 'VIERGE',
      tareKg: 12.4,
      masseBruteKg: 21.2,
      masseNetteKg: 8.8,
      masseEntreeKg: 8.65,
      contenanceMaxKg: 10,
      proprietaire: 'Climalife',
      lot: 'LOT-455-05',
      dateEntree: '2026-05-28',
      datePesee: '2026-06-18',
      statut: 'EN_STOCK'
    },
    {
      id: 'B5',
      code: 'B-05',
      numeroReel: 'WF-410-31554',
      type: 'NEUVE',
      fluide: 'R-410A',
      etatFluide: 'VIERGE',
      tareKg: 11.8,
      masseBruteKg: 13.9,
      // Quasi vide (2,1 kg restants sur 11 — entrée en consignation partielle)
      masseNetteKg: 2.1,
      masseEntreeKg: 2.3,
      contenanceMaxKg: 11,
      proprietaire: 'Westfalen',
      lot: 'LOT-410-31',
      dateEntree: '2026-02-11',
      datePesee: '2026-06-23',
      statut: 'EN_STOCK'
    }
  ],

  // --------------------------------------------------------
  // Mouvements de fluide (7, numérotés FI-2026-0001 → 0007)
  // quantiteKg SIGNÉ : négatif = récupération.
  // --------------------------------------------------------
  mouvements: [
    {
      id: 'mvt-0007',
      numero: 'FI-2026-0007',
      date: '2026-06-29',
      mode: 'FORMATION',
      type: 'CHARGE_APPOINT',
      machineId: 'M1',
      machineLabel: 'Chambre froide positive — Labo',
      fluide: 'R-404A',
      quantiteKg: 0.30,
      technicien: 'Julien Martin',
      statut: 'VALIDE',
      cerfaNumero: 'FI-2026-0007'
    },
    {
      id: 'mvt-0006',
      numero: 'FI-2026-0006',
      date: '2026-06-23',
      mode: 'FORMATION',
      type: 'CHARGE_APPOINT',
      machineId: 'M6',
      machineLabel: 'Multisplit bureaux',
      fluide: 'R-410A',
      quantiteKg: 0.20,
      technicien: 'Sophie Bianchi',
      statut: 'VALIDE',
      cerfaNumero: 'FI-2026-0006'
    },
    {
      id: 'mvt-0005',
      numero: 'FI-2026-0005',
      date: '2026-06-18',
      mode: 'FORMATION',
      type: 'RECUPERATION_MAINTENANCE',
      machineId: 'M5',
      machineLabel: 'Chambre froide — Le Fournil',
      fluide: 'R-455A',
      quantiteKg: -0.15,
      technicien: 'Sophie Bianchi',
      statut: 'VALIDE',
      cerfaNumero: 'FI-2026-0005'
    },
    {
      id: 'mvt-0004',
      numero: 'FI-2026-0004',
      date: '2026-06-12',
      mode: 'FORMATION',
      type: 'MISE_EN_SERVICE',
      machineId: 'M3',
      machineLabel: 'PAC air/eau formation',
      fluide: 'R-32',
      quantiteKg: 2.40,
      technicien: 'Julien Martin',
      statut: 'VALIDE',
      cerfaNumero: 'FI-2026-0004'
    },
    {
      id: 'mvt-0003',
      numero: 'FI-2026-0003',
      date: '2026-05-30',
      mode: 'FORMATION',
      type: 'MISE_EN_SERVICE',
      machineId: 'M2',
      machineLabel: 'Vitrine réfrigérée pédagogique',
      fluide: 'R-134a',
      quantiteKg: 1.80,
      technicien: 'Sophie Bianchi',
      statut: 'VALIDE',
      cerfaNumero: 'FI-2026-0003'
    },
    {
      id: 'mvt-0002',
      numero: 'FI-2026-0002',
      date: '2026-05-20',
      mode: 'FORMATION',
      type: 'MISE_EN_SERVICE',
      machineId: 'M4',
      machineLabel: 'Monosplit salle de classe',
      fluide: 'R-32',
      quantiteKg: 0.90,
      technicien: 'Sophie Bianchi',
      statut: 'VALIDE',
      cerfaNumero: 'FI-2026-0002'
    },
    {
      id: 'mvt-0001',
      numero: 'FI-2026-0001',
      date: '2026-05-12',
      mode: 'FORMATION',
      type: 'CHARGE_APPOINT',
      machineId: 'M1',
      machineLabel: 'Chambre froide positive — Labo',
      fluide: 'R-404A',
      quantiteKg: 0.25,
      technicien: 'Julien Martin',
      statut: 'VALIDE',
      cerfaNumero: 'FI-2026-0001'
    }
  ],

  // --------------------------------------------------------
  // Contrôles d'étanchéité (3)
  // --------------------------------------------------------
  controles: [
    {
      id: 'ctl-003',
      date: '2026-06-29',
      machineId: 'M1',
      machineLabel: 'Chambre froide positive — Labo',
      typeControle: 'PERIODIQUE',
      methode: 'DIRECTE',
      resultat: 'CONFORME',
      operateur: 'Frédéric Henninot',
      prochainControle: '2027-06-29',
      enRetard: false
    },
    {
      id: 'ctl-002',
      date: '2026-06-18',
      machineId: 'M5',
      machineLabel: 'Chambre froide — Le Fournil',
      typeControle: 'NON_PERIODIQUE',
      methode: 'DIRECTE',
      resultat: 'FUITE',
      operateur: 'Sophie Bianchi',
      prochainControle: '2026-07-23',
      enRetard: false
    },
    {
      id: 'ctl-001',
      date: '2026-05-03',
      machineId: 'M6',
      machineLabel: 'Multisplit bureaux',
      typeControle: 'PERIODIQUE',
      methode: 'INDIRECTE',
      resultat: 'CONFORME',
      operateur: 'Frédéric Henninot',
      prochainControle: '2026-06-27',
      enRetard: true
    }
  ],

  // --------------------------------------------------------
  // Référentiel des fluides frigorigènes (GWP AR4)
  // nbMachines : calculé par le store au chargement.
  // classeSecurite : classification NF EN 378 / ASHRAE 34
  // (A1 = non inflammable, A2L/A2/A3 = inflammable) — sert au
  // cadre 12 « Transport » du CERFA 15497*04 (Phase D).
  // --------------------------------------------------------
  fluides: [
    { code: 'R-32', famille: 'HFC', gwpAr4: 675, impact: 'MODERE', classeSecurite: 'A2L', nbMachines: 0 },
    { code: 'R-410A', famille: 'HFC', gwpAr4: 2088, impact: 'ELEVE', classeSecurite: 'A1', nbMachines: 0 },
    { code: 'R-134a', famille: 'HFC', gwpAr4: 1430, impact: 'ELEVE', classeSecurite: 'A1', nbMachines: 0 },
    { code: 'R-407C', famille: 'HFC', gwpAr4: 1774, impact: 'ELEVE', classeSecurite: 'A1', nbMachines: 0 },
    { code: 'R-404A', famille: 'HFC', gwpAr4: 3922, impact: 'TRES_ELEVE', classeSecurite: 'A1', nbMachines: 0 },
    { code: 'R-1234yf', famille: 'HFO', gwpAr4: 1, impact: 'FAIBLE', classeSecurite: 'A2L', nbMachines: 0 },
    { code: 'R-455A', famille: 'HFC/HFO', gwpAr4: 148, impact: 'FAIBLE', classeSecurite: 'A2L', nbMachines: 0 },
    { code: 'R-744', famille: 'CO2', gwpAr4: 1, impact: 'FAIBLE', classeSecurite: 'A1', nbMachines: 0 },
    { code: 'R-290', famille: 'HC', gwpAr4: 3, impact: 'FAIBLE', classeSecurite: 'A3', nbMachines: 0 }
  ],

  // --------------------------------------------------------
  // Personnel (enseignants attestés + élèves)
  // --------------------------------------------------------
  personnel: [
    {
      id: 'per-fh',
      nom: 'Henninot',
      prenom: 'Frédéric',
      typePersonne: 'ENSEIGNANT',
      roleApp: 'REFERENT',
      numAttestationAptitude: 'AAF-CAT1-2024-1547',
      organismeDelivreur: 'QualiFroid Cert',
      dateObtention: '2024-03-15',
      dateFinValidite: '2027-03-14',
      categorie2008: 'I',
      categorie2025: 'I',
      activitesAutorisees: ['MISE_EN_SERVICE', 'MAINTENANCE', 'CONTROLE',
        'RECUPERATION', 'DEMANTELEMENT'],
      actif: true,
      email: 'frederic.henninot@lycee-raynaud.fr'
    },
    {
      id: 'per-sb',
      nom: 'Bianchi',
      prenom: 'Sophie',
      typePersonne: 'ENSEIGNANT',
      roleApp: 'ENSEIGNANT',
      numAttestationAptitude: 'AAF-CAT1-2023-0912',
      organismeDelivreur: 'QualiFroid Cert',
      dateObtention: '2023-09-01',
      dateFinValidite: '2028-08-31',
      categorie2008: 'I',
      categorie2025: 'I',
      activitesAutorisees: ['MISE_EN_SERVICE', 'MAINTENANCE', 'CONTROLE',
        'RECUPERATION'],
      actif: true,
      email: 'sophie.bianchi@lycee-raynaud.fr'
    },
    {
      id: 'per-jm',
      nom: 'Martin',
      prenom: 'Julien',
      typePersonne: 'ELEVE',
      roleApp: 'ELEVE',
      numAttestationAptitude: null,
      organismeDelivreur: null,
      dateObtention: null,
      dateFinValidite: null,
      categorie2008: null,
      categorie2025: null,
      activitesAutorisees: [],
      actif: true,
      email: null
    },
    {
      id: 'per-lm',
      nom: 'Moreau',
      prenom: 'Lucas',
      typePersonne: 'ELEVE',
      roleApp: 'ELEVE',
      numAttestationAptitude: null,
      organismeDelivreur: null,
      dateObtention: null,
      dateFinValidite: null,
      categorie2008: null,
      categorie2025: null,
      activitesAutorisees: [],
      actif: true,
      email: null
    }
  ],

  // --------------------------------------------------------
  // Outillage réglementé (Phase B) : détecteurs et balance.
  // Cohérent avec les alertes du tableau de bord : les deux
  // détecteurs sont à échéance dépassée (EXPIRE).
  // --------------------------------------------------------
  outillage: [
    {
      id: 'out-1',
      typeOutil: 'DETECTEUR',
      marque: 'Testo',
      modele: '316-3',
      numSerie: 'T316-45872',
      siteAtelier: 'Atelier froid — armoire outillage',
      precision: null,
      sensibilite: '4 g/an',
      dateEtalonnage: '2025-06-02',
      dateVerification: '2025-06-02',
      prochaineEcheance: '2026-06-02',
      statut: 'EXPIRE'
    },
    {
      id: 'out-2',
      typeOutil: 'DETECTEUR',
      marque: 'Inficon',
      modele: 'D-TEK Stratus',
      numSerie: 'DTK-20991',
      siteAtelier: 'Atelier froid — armoire outillage',
      precision: null,
      sensibilite: '3 g/an',
      dateEtalonnage: '2024-11-10',
      dateVerification: '2024-11-10',
      prochaineEcheance: '2025-11-10',
      statut: 'EXPIRE'
    },
    {
      id: 'out-3',
      typeOutil: 'BALANCE',
      marque: 'Mettler',
      modele: 'PB3002',
      numSerie: 'MT-30021',
      siteAtelier: 'Atelier froid — poste de charge',
      precision: '± 1 g',
      sensibilite: null,
      dateEtalonnage: '2026-01-15',
      dateVerification: '2026-01-15',
      prochaineEcheance: '2027-01-15',
      statut: 'CONFORME'
    },
    {
      id: 'out-4',
      typeOutil: 'STATION_RECUPERATION',
      marque: 'Promax',
      modele: 'RG6',
      numSerie: 'PRG6-11842',
      siteAtelier: 'Atelier froid — chariot de récupération',
      precision: null,
      sensibilite: null,
      dateEtalonnage: '2026-02-10',
      dateVerification: '2026-02-10',
      prochaineEcheance: '2027-02-10',
      statut: 'CONFORME'
    },
    {
      id: 'out-5',
      typeOutil: 'POMPE_A_VIDE',
      marque: 'Value',
      modele: 'VE-2100',
      numSerie: 'VE21-70335',
      siteAtelier: 'Atelier froid — poste 2',
      precision: null,
      sensibilite: null,
      dateEtalonnage: '2025-07-24',
      dateVerification: '2025-07-24',
      // Échéance PROCHE (moins de 30 jours) → statut A_VERIFIER
      prochaineEcheance: '2026-07-24',
      statut: 'A_VERIFIER'
    }
  ],

  // --------------------------------------------------------
  // Stocks initiaux 2026 par fluide (balance matière, §6 SPEC).
  // CALCULÉS pour que le stock théorique de fin retombe
  // exactement sur l'état courant des bouteilles (aucun écart
  // avant inventaire) :
  //   théorique = initial (neuf + récup) + achats (masseEntreeKg
  //   des bouteilles NEUVES entrées dans l'année) + récupérations
  //   − charges − destructions.
  // --------------------------------------------------------
  stocksInitiaux: [
    { annee: 2026, fluide: 'R-32', neufKg: 1.7, recupKg: 0 },
    { annee: 2026, fluide: 'R-134a', neufKg: 0, recupKg: 0 },
    { annee: 2026, fluide: 'R-404A', neufKg: 0.55, recupKg: 3.6 },
    { annee: 2026, fluide: 'R-410A', neufKg: 0, recupKg: 0 },
    { annee: 2026, fluide: 'R-455A', neufKg: 0, recupKg: 0 }
  ],

  // --------------------------------------------------------
  // Chaîne déchets / BSFF, inventaires et pièces jointes
  // (vides au départ : alimentés par l'utilisation)
  // --------------------------------------------------------
  bsff: [],
  inventaires: [],
  justificationsEcarts: [],
  piecesJointes: [],

  // --------------------------------------------------------
  // Alertes du tableau de bord (4)
  // Conservées pour la validation d'import ; le store CALCULE
  // désormais les alertes depuis les données. Niveaux conformes
  // SPEC §7.2 : échéance DÉPASSÉE (contrôle, détecteur) = CRITIQUE.
  // --------------------------------------------------------
  alertes: [
    {
      id: 'alr-1',
      niveau: 'CRITIQUE',
      titre: 'Fuite non résolue',
      detail: 'Chambre froide — Le Fournil · recontrôle 23/07/2026'
    },
    {
      id: 'alr-2',
      niveau: 'CRITIQUE',
      titre: 'Contrôle d’étanchéité en retard',
      detail: 'Multisplit bureaux · échéance 27/06/2026'
    },
    {
      id: 'alr-3',
      niveau: 'CRITIQUE',
      titre: 'Détecteur à réétalonner',
      detail: 'Testo 316-3 · 02/06/2026'
    },
    {
      id: 'alr-4',
      niveau: 'CRITIQUE',
      titre: 'Détecteur à réétalonner',
      detail: 'Inficon D-TEK Stratus · 10/11/2025'
    }
  ]
};
