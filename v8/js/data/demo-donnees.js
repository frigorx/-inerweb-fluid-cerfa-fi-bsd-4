// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — données de démonstration (Phase A)
// Monde fictif EXACT de la maquette validée (Claude Design, 02/07/2026).
// Toutes les dates sont en ISO (AAAA-MM-JJ). Masses en kg.
//
// Dates PÉRISSABLES (étalonnages, attestation de capacité) : RELATIVES
// au jour de chargement (demande Franck 22/07 — les dates figées
// pourrissaient : les deux détecteurs avaient fini par expirer et plus
// aucun parcours ne se déroulait « proprement » en démo). Le monde
// fictif garde VOLONTAIREMENT un détecteur expiré et une pompe à
// échéance proche (pédagogie des alertes), mais chaque famille d'outil
// a toujours AU MOINS un exemplaire conforme pour aller au bout de
// tous les parcours, quelle que soit la date du jour.
// ============================================================

/** Date ISO à `delta` jours d'aujourd'hui (donnée de démo, pas une règle). */
function jourDemo(delta) {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export const DEMO = {

  // --------------------------------------------------------
  // Établissement (opérateur attesté) — dossier complet Phase C
  // --------------------------------------------------------
  etablissement: {
    raisonSociale: 'Lycée Professionnel Antoine Vidal',
    siret: '482 917 356 00028',
    adresse: 'Avenue Jean-Jaurès, 30000 Nîmes',
    numAttestationCapacite: 'AC-13-004567',
    organisme: 'QualiFroid Cert',
    dateDelivranceCapacite: '2022-03-15',
    // Relative : une attestation VALIDE quelle que soit la date du jour.
    dateEcheanceCapacite: jourDemo(600),
    categoriesAutorisees: ['I'],
    activitesAutorisees: ['MISE_EN_SERVICE', 'MAINTENANCE', 'CONTROLE',
      'RECUPERATION', 'DEMANTELEMENT'],
    sitesCouverts: ['Lycée A. Vidal — Atelier (Avenue Jean-Jaurès, 30000 Nîmes)'],
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
      adresse: '30900 Nîmes',
      siret: '824 519 002 00018',
      nbMachines: 1
    },
    {
      id: 'cli-lycee',
      raisonSociale: 'Lycée A. Vidal — Atelier',
      adresse: 'Avenue Jean-Jaurès, 30000 Nîmes',
      siret: '482 917 356 00028',
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
      // Charge inférieure à la nominale (fluide perdu) : marge pour appoint
      chargeActuelleKg: 3.80,
      clientId: 'cli-lycee',
      localisation: 'Atelier froid — poste 1',
      siteLabel: 'Lycée A. Vidal — Atelier',
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
      // Charge inférieure à la nominale (fluide perdu) : marge pour appoint
      chargeActuelleKg: 1.50,
      clientId: 'cli-lycee',
      localisation: 'Atelier froid — poste 2',
      siteLabel: 'Lycée A. Vidal — Atelier',
      statut: 'EN_SERVICE',
      // P1-1 (E1) — le cas d'école inverse de M5 : une détection permanente
      // DÉCLARÉE mais dont la vérification a expiré (il y a 13 mois).
      // L'allègement tombe : la machine repasse à la fréquence SANS
      // détection, et une alerte le dit. C'est exactement la situation que
      // le logiciel laissait passer avant P1-1.
      detectionPermanente: true,
      detectionVerifieeLe: jourDemo(-395),
      detectionReference: 'Vérification annuelle — à renouveler',
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
      // Charge inférieure à la nominale (fluide perdu) : marge pour appoint
      chargeActuelleKg: 1.80,
      clientId: 'cli-lycee',
      localisation: 'Plateforme extérieure',
      siteLabel: 'Lycée A. Vidal — Atelier',
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
      // Charge inférieure à la nominale (fluide perdu) : marge pour appoint
      chargeActuelleKg: 0.70,
      clientId: 'cli-lycee',
      localisation: 'Salle B12',
      siteLabel: 'Lycée A. Vidal — Atelier',
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
      // P1-1 (E1) : détection VÉRIFIÉE il y a 3 mois — elle allège donc
      // bien la fréquence. Date RELATIVE : le monde de démo doit rester
      // vrai quelle que soit la date à laquelle on l'ouvre.
      detectionVerifieeLe: jourDemo(-90),
      detectionReference: 'Vérification annuelle — SAV Copeland',
      dernierControle: '2026-06-18',
      // Sous le seuil de contrôle périodique (R-455A traité HFC : 3,20 kg =
      // 0,47 t éq. CO₂ < 5) → AUCUNE échéance périodique. La fuite reste
      // suivie via l'alerte CRITIQUE « réparation à tracer » jusqu'à réparation.
      prochainControle: null
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
      // Charge inférieure à la nominale (fluide perdu) : marge pour appoint
      chargeActuelleKg: 3.00,
      clientId: 'cli-lycee',
      localisation: 'Bureaux administration',
      siteLabel: 'Lycée A. Vidal — Atelier',
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
      numero: 'C-FORM-2026-0003',
      mode: 'FORMATION',
      date: '2026-06-29',
      machineId: 'M1',
      machineLabel: 'Chambre froide positive — Labo',
      typeControle: 'PERIODIQUE',
      methode: 'DIRECTE',
      resultat: 'CONFORME',
      operateur: 'Marc Delorme',
      prochainControle: '2027-06-29',
      enRetard: false
    },
    {
      id: 'ctl-002',
      numero: 'C-FORM-2026-0002',
      mode: 'FORMATION',
      date: '2026-06-18',
      machineId: 'M5',
      machineLabel: 'Chambre froide — Le Fournil',
      typeControle: 'NON_PERIODIQUE',
      methode: 'DIRECTE',
      resultat: 'FUITE',
      operateur: 'Sophie Bianchi',
      // Machine sous le seuil de contrôle périodique : pas d'échéance
      // périodique posée ; la fuite est suivie via l'alerte « réparation à
      // tracer » jusqu'à réparation.
      prochainControle: null,
      enRetard: false
    },
    {
      id: 'ctl-001',
      numero: 'C-FORM-2026-0001',
      mode: 'FORMATION',
      date: '2026-05-03',
      machineId: 'M6',
      machineLabel: 'Multisplit bureaux',
      typeControle: 'PERIODIQUE',
      methode: 'INDIRECTE',
      resultat: 'CONFORME',
      operateur: 'Marc Delorme',
      prochainControle: '2026-06-27',
      enRetard: true
    }
  ],

  // --------------------------------------------------------
  // Référentiel des fluides frigorigènes (PRP réglementaire utilisé par
  // le moteur — AR4 ou annexe F-Gas III selon le fluide, cf. sourcePrp ;
  // avis réglementaire du 16/07/2026, miroir de la migration 022).
  // nbMachines : calculé par le store au chargement.
  // classeSecurite : classification NF EN 378 / ASHRAE 34
  // (A1 = non inflammable, A2L/A2/A3 = inflammable) — sert au
  // cadre 12 « Transport » du CERFA 15497*04 (Phase D).
  // contientHfc/contientHfo/categorieCadre7/sourcePrp : fiche réglementaire
  // explicite du cadre 7 (docs/TABLE-REGLEMENTAIRE-FLUIDES.md), LUE EN
  // PRIORITÉ par reglementation-fluides.js (categorieCadre7()) — parité
  // EXACTE avec le remplissage de la migration 021 côté serveur (prouvée
  // par test-contrat).
  // --------------------------------------------------------
  fluides: [
    { code: 'R-32', famille: 'HFC', gwpAr4: 675, classeSecurite: 'A2L', nbMachines: 0,
      contientHfc: true, contientHfo: false, categorieCadre7: 'HFC', sourcePrp: 'AR4 / annexe F-Gas' },
    { code: 'R-410A', famille: 'HFC', gwpAr4: 2088, classeSecurite: 'A1', nbMachines: 0,
      contientHfc: true, contientHfo: false, categorieCadre7: 'HFC', sourcePrp: 'AR4' },
    { code: 'R-134a', famille: 'HFC', gwpAr4: 1430, classeSecurite: 'A1', nbMachines: 0,
      contientHfc: true, contientHfo: false, categorieCadre7: 'HFC', sourcePrp: 'AR4' },
    { code: 'R-407C', famille: 'HFC', gwpAr4: 1774, classeSecurite: 'A1', nbMachines: 0,
      contientHfc: true, contientHfo: false, categorieCadre7: 'HFC', sourcePrp: 'AR4' },
    { code: 'R-404A', famille: 'HFC', gwpAr4: 3922, classeSecurite: 'A1', nbMachines: 0,
      contientHfc: true, contientHfo: false, categorieCadre7: 'HFC', sourcePrp: 'AR4' },
    { code: 'R-1234yf', famille: 'HFO', gwpAr4: 0.501, classeSecurite: 'A2L', nbMachines: 0,
      contientHfc: false, contientHfo: true, categorieCadre7: 'HFO', sourcePrp: 'annexe règl. UE 2024/573 (F-Gas III)' },
    { code: 'R-455A', famille: 'HFC/HFO', gwpAr4: 148, classeSecurite: 'A2L', nbMachines: 0,
      contientHfc: true, contientHfo: true, categorieCadre7: 'HFC', sourcePrp: 'AR4 — 148 conservatoire (réserve DGPR)' },
    { code: 'R-744', famille: 'CO2', gwpAr4: 1, classeSecurite: 'A1', nbMachines: 0,
      contientHfc: false, contientHfo: false, categorieCadre7: 'AUCUNE', sourcePrp: 'définition' },
    { code: 'R-290', famille: 'HC', gwpAr4: 0.02, classeSecurite: 'A3', nbMachines: 0,
      contientHfc: false, contientHfo: false, categorieCadre7: 'AUCUNE', sourcePrp: 'AR6 GIEC (réf. règl. UE 2024/573)' }
  ],

  // --------------------------------------------------------
  // Personnel (enseignants attestés + élèves)
  // --------------------------------------------------------
  personnel: [
    {
      id: 'per-fh',
      nom: 'Delorme',
      prenom: 'Marc',
      typePersonne: 'ENSEIGNANT',
      roleApp: 'REFERENT',
      numAttestationAptitude: 'AAF-CAT1-2024-1547',
      organismeDelivreur: 'QualiFroid Cert',
      dateObtention: '2024-03-15',
      dateFinValidite: '2027-03-14',
      categorie2008: 'I',
      categorie2025: 'A1',
      activitesAutorisees: ['MISE_EN_SERVICE', 'MAINTENANCE', 'CONTROLE',
        'RECUPERATION', 'DEMANTELEMENT'],
      actif: true,
      email: 'marc.delorme@exemple.fr'
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
      categorie2025: null,
      activitesAutorisees: ['MISE_EN_SERVICE', 'MAINTENANCE', 'CONTROLE',
        'RECUPERATION'],
      actif: true,
      email: 'sophie.bianchi@exemple.fr'
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
  // Habilitations F-Gas (chantier B2) — registre des aptitudes du
  // monde fictif, cohérent avec les fiches du personnel ci-dessus
  // (les DEUX registres coexistent jusqu'à ~2029). Échéances au-delà
  // de l'horizon d'alerte (90 j) : le semis n'ajoute AUCUNE alerte.
  // ⚠️ Ces données ne servent QUE le monde de démonstration : les
  // compléments d'init/import restent à VIDE (cf. demo-store.js —
  // recopier ce semis dans une sauvegarde étrangère inventerait des
  // aptitudes, et une base sans ces personnes serait refusée en
  // orphelin à l'import).
  // --------------------------------------------------------
  habilitations: [
    {
      id: 'hab-demo-fh',
      personneId: 'per-fh',
      regime: '2008',
      categorie: 'I',
      numeroAttestation: 'AAF-CAT1-2024-1547',
      organismeDelivreur: 'QualiFroid Cert',
      dateDebut: '2024-03-15',
      dateFin: '2027-03-14',
      // L4 (revue) : le professeur « conforme » a FAIT sa remise à niveau
      // (date relative passée — leçon « dates démo qui pourrissent ») : sa
      // ligne 2008 montre le champ rempli et ne porte aucune alerte.
      // Sophie Bianchi, elle, reste SANS remise : le cas pédagogique de la
      // transition, avec l'alerte IMPORTANT vivante dans la démo.
      remiseNiveauLe: jourDemo(-60),
      remiseNiveauOrganisme: 'QualiFroid Cert',
      actif: true,
      dateRevocation: null
    },
    {
      // P0-5 : le professeur est passé au régime 2025 (A1) — une 2008 sans
      // remise à niveau cesse d'être reconnue après le 12/03/2029 (L4) et
      // la démo doit rester praticable en Officiel simulé quelle que soit
      // la date. Même principe que les étalonnages : TOUJOURS un
      // exemplaire reconnu, échéance RELATIVE (jourDemo). Sophie Bianchi
      // garde son ancienne cat. I seule : cas pédagogique de la transition.
      id: 'hab-demo-fh-2025',
      personneId: 'per-fh',
      regime: '2025',
      categorie: 'A1',
      numeroAttestation: 'AAF-A1-2026-0208',
      organismeDelivreur: 'QualiFroid Cert',
      dateDebut: jourDemo(-45),
      dateFin: jourDemo(1780),
      actif: true,
      dateRevocation: null
    },
    {
      id: 'hab-demo-sb',
      personneId: 'per-sb',
      regime: '2008',
      categorie: 'I',
      numeroAttestation: 'AAF-CAT1-2023-0912',
      organismeDelivreur: 'QualiFroid Cert',
      dateDebut: '2023-09-01',
      dateFin: '2028-08-31',
      actif: true,
      dateRevocation: null
    }
  ],
  mentionsHabilitation: [
    {
      // Le cas nominal du moteur de conseil : ancien I + stage CO₂
      // → vert sur une machine au R-744 (visible fiche machine + wizard).
      id: 'men-demo-fh-co2',
      personneId: 'per-fh',
      fluideMention: 'CO2',
      numeroAttestation: 'MEN-CO2-2025-0311',
      organismeDelivreur: 'QualiFroid Cert',
      dateDebut: '2025-03-11',
      dateFin: '2030-03-10',
      actif: true,
      dateRevocation: null
    },
    {
      // Mention révoquée : montre la ligne grisée + datée de la modale
      // (l'historique reste au registre). Muette pour les alertes.
      id: 'men-demo-sb-hc',
      personneId: 'per-sb',
      fluideMention: 'HC',
      numeroAttestation: 'MEN-HC-2024-0108',
      organismeDelivreur: 'QualiFroid Cert',
      dateDebut: '2024-01-08',
      dateFin: '2026-01-07',
      actif: false,
      dateRevocation: '2026-01-08'
    }
  ],

  // --------------------------------------------------------
  // Outillage réglementé (Phase B) : détecteurs et balance.
  // Dates RELATIVES au jour de chargement (22/07) : un détecteur
  // EXPIRÉ (Testo) et une pompe à échéance PROCHE nourrissent les
  // alertes du tableau de bord ; le reste est CONFORME pour que
  // TOUS les parcours aillent au bout, quelle que soit la date.
  // Les statuts figés ici ne sont qu'indicatifs : les lectures les
  // RECALCULENT depuis prochaineEcheance (calculerStatutOutil).
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
      // EXPIRÉ VOLONTAIREMENT (pédagogie : alertes, feu tricolore).
      dateEtalonnage: jourDemo(-425),
      dateVerification: jourDemo(-425),
      prochaineEcheance: jourDemo(-60),
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
      // CONFORME : le détecteur qui permet d'aller au bout du parcours.
      dateEtalonnage: jourDemo(-90),
      dateVerification: jourDemo(-90),
      prochaineEcheance: jourDemo(275),
      statut: 'CONFORME'
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
      dateEtalonnage: jourDemo(-180),
      dateVerification: jourDemo(-180),
      prochaineEcheance: jourDemo(185),
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
      dateEtalonnage: jourDemo(-150),
      dateVerification: jourDemo(-150),
      prochaineEcheance: jourDemo(215),
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
      dateEtalonnage: jourDemo(-350),
      dateVerification: jourDemo(-350),
      // Échéance PROCHE (moins de 30 jours) → statut A_VERIFIER
      prochaineEcheance: jourDemo(15),
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
  // IM-9 : retours de bouteilles consignées au fournisseur
  // (alimente le poste « retours fournisseur » de la balance matière)
  retoursFournisseur: [],
  // P0-8 : cessions de fluide à un tiers attesté (rubrique 10 de la
  // déclaration annuelle ; vides au départ, alimentées par l'utilisation)
  cessions: [],
  // Report v7 : registre des plaintes / réclamations clients. Deux exemples
  // pour la démo — un traité, un en cours — liés à un client du semis.
  plaintes: [
    {
      id: 'plt-demo-1', numero: 'PL-2026-0001', clientId: 'cli-fournil',
      clientLibelle: null, dateReception: jourDemo(-40),
      objet: 'Température de la chambre positive instable après intervention.',
      reponse: 'Réglage du détendeur repris, contrôle de suivi conforme.',
      dateReponse: jourDemo(-33), etat: 'TRAITEE'
    },
    {
      id: 'plt-demo-2', numero: 'PL-2026-0002', clientId: 'cli-fournil',
      clientLibelle: null, dateReception: jourDemo(-6),
      objet: 'Bruit anormal du compresseur signalé par le boulanger.',
      reponse: null, dateReponse: null, etat: 'EN_COURS'
    }
  ],

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
      detail: 'Chambre froide — Le Fournil · réparation à tracer'
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
