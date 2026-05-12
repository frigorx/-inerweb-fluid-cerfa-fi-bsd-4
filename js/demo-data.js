/**
 * inerWeb Fluide — Jeu de données de démonstration
 * Données fictives, à usage de présentation et de formation uniquement.
 * Aucune donnée nominative réelle, aucun SIRET réel.
 */

window.DemoData = {

  config: {
    etablissement: 'Atelier Froid Démonstration',
    siret: '12345678901234',
    adresse: '12 rue de la Frigorie, 13001 Marseille',
    codeApe: '4322B',
    telephone: '04 91 00 00 00',
    email: 'contact@atelier-demo.fr',
    attestationCapacite: 'AC-2026-DEMO-001',
    certifFGas: 'I',
    validiteAttestation: '2028-12-31'
  },

  users: [
    {
      id: 'USER-DEMO-001',
      nom: 'Martin', prenom: 'Julien',
      nomComplet: 'Julien Martin',
      role: 'REFERENT',
      attestation: 'AAF-CAT1-2024-1547',
      dateAttestation: '2024-03-15',
      validiteAttestation: '2029-03-15',
      categorie2008: 'I', categorie2025: 'I',
      telephone: '06 12 34 56 78',
      email: 'jmartin@demo.fr',
      actif: true,
      canUseOfficiel: true
    },
    {
      id: 'USER-DEMO-002',
      nom: 'Dupont', prenom: 'Marie',
      nomComplet: 'Marie Dupont',
      role: 'ENSEIGNANT',
      attestation: 'AAF-CAT1-2023-0892',
      dateAttestation: '2023-09-01',
      validiteAttestation: '2028-09-01',
      categorie2008: 'I', categorie2025: 'I',
      telephone: '06 23 45 67 89',
      email: 'mdupont@demo.fr',
      actif: true,
      canUseOfficiel: true
    },
    {
      id: 'USER-DEMO-003',
      nom: 'Bernard', prenom: 'Thomas',
      nomComplet: 'Thomas Bernard',
      role: 'ENSEIGNANT',
      attestation: 'AAF-CAT2-2022-1102',
      dateAttestation: '2022-06-10',
      validiteAttestation: '2026-07-10',
      categorie2008: 'II', categorie2025: 'II',
      telephone: '06 34 56 78 90',
      email: 'tbernard@demo.fr',
      actif: true,
      canUseOfficiel: true
    },
    {
      id: 'USER-DEMO-004',
      nom: 'Garcia', prenom: 'Léa',
      nomComplet: 'Léa Garcia',
      role: 'ELEVE',
      attestation: 'Formation',
      dateAttestation: '2026-09-01',
      validiteAttestation: '',
      categorie2008: '', categorie2025: '',
      telephone: '',
      email: '',
      actif: true,
      canUseOfficiel: false
    }
  ],

  clients: [
    {
      id: 'CLI-DEMO-001',
      nom: 'Boulangerie Le Pétrin Doré',
      adresse: '24 boulevard Notre-Dame', cp: '13006', ville: 'Marseille',
      siret: '45678901234567',
      contact: 'M. Rossi',
      tel: '04 91 11 22 33',
      email: 'contact@petrindore-demo.fr',
      actif: true
    },
    {
      id: 'CLI-DEMO-002',
      nom: 'Restaurant La Calanque Bleue',
      adresse: '8 quai du Port', cp: '13002', ville: 'Marseille',
      siret: '56789012345678',
      contact: 'Mme Petit',
      tel: '04 91 22 33 44',
      email: 'gerance@calanquebleue-demo.fr',
      actif: true
    },
    {
      id: 'CLI-DEMO-003',
      nom: 'Supermarché Provence Frais',
      adresse: '120 avenue du Prado', cp: '13008', ville: 'Marseille',
      siret: '67890123456789',
      contact: 'M. Leroy (chef de site)',
      tel: '04 91 33 44 55',
      email: 'site13@provencefrais-demo.fr',
      actif: true
    },
    {
      id: 'CLI-DEMO-004',
      nom: 'Pharmacie du Vieux Port',
      adresse: '3 cours Honoré d\'Estienne d\'Orves', cp: '13001', ville: 'Marseille',
      siret: '78901234567890',
      contact: 'Dr Lemoine',
      tel: '04 91 44 55 66',
      email: 'pharma.vieuxport-demo@orange.fr',
      actif: true
    }
  ],

  machines: [
    {
      id: 'CF01', code: 'CF01', nom: 'Chambre froide positive boulangerie',
      designation: 'Chambre froide positive 8 m³',
      marque: 'Friga-Bohn', modele: 'CFP-8000', serie: 'FB-2022-1234',
      clientId: 'CLI-DEMO-001',
      fluide: 'R449A', charge: 2.4, chargeNom: 2.4, chargeActuelle: 2.4,
      detectionPermanente: false,
      dateInstall: '2022-04-15',
      prochControle: '2026-08-15', prochainControle: '2026-08-15'
    },
    {
      id: 'CF02', code: 'CF02', nom: 'Chambre froide négative restaurant',
      designation: 'Chambre froide négative 6 m³',
      marque: 'Profroid', modele: 'CFN-6000', serie: 'PF-2021-5567',
      clientId: 'CLI-DEMO-002',
      fluide: 'R449A', charge: 3.8, chargeNom: 3.8, chargeActuelle: 3.6,
      detectionPermanente: true,
      dateInstall: '2021-09-20',
      prochControle: '2026-06-20', prochainControle: '2026-06-20'
    },
    {
      id: 'CF03', code: 'CF03', nom: 'Vitrine réfrigérée supermarché',
      designation: 'Vitrine réfrigérée linéaire 4 m',
      marque: 'Costan', modele: 'VRX-4000', serie: 'CO-2023-8821',
      clientId: 'CLI-DEMO-003',
      fluide: 'R744', charge: 1.2, chargeNom: 1.2, chargeActuelle: 1.2,
      detectionPermanente: true,
      dateInstall: '2023-03-10',
      prochControle: '2026-09-10', prochainControle: '2026-09-10'
    },
    {
      id: 'CF04', code: 'CF04', nom: 'Centrale CO2 transcritique',
      designation: 'Centrale CO2 booster supermarché',
      marque: 'Carrier', modele: 'CO2-BOOSTER-30', serie: 'CR-2023-1019',
      clientId: 'CLI-DEMO-003',
      fluide: 'R744', charge: 18.5, chargeNom: 18.5, chargeActuelle: 18.0,
      detectionPermanente: true,
      dateInstall: '2023-03-10',
      prochControle: '2026-09-10', prochainControle: '2026-09-10'
    },
    {
      id: 'CLIM01', code: 'CLIM01', nom: 'Split mural pharmacie',
      designation: 'Climatisation split mural 5 kW',
      marque: 'Daikin', modele: 'FTXM50', serie: 'DK-2024-7723',
      clientId: 'CLI-DEMO-004',
      fluide: 'R32', charge: 1.1, chargeNom: 1.1, chargeActuelle: 1.1,
      detectionPermanente: false,
      dateInstall: '2024-05-22',
      prochControle: '2027-05-22', prochainControle: '2027-05-22'
    },
    {
      id: 'CLIM02', code: 'CLIM02', nom: 'PAC air/eau restaurant',
      designation: 'Pompe à chaleur air/eau 14 kW',
      marque: 'Atlantic', modele: 'Alfea Extensa', serie: 'AT-2023-3344',
      clientId: 'CLI-DEMO-002',
      fluide: 'R410A', charge: 2.8, chargeNom: 2.8, chargeActuelle: 2.65,
      detectionPermanente: false,
      dateInstall: '2023-11-12',
      prochControle: '2026-11-12', prochainControle: '2026-11-12'
    },
    {
      id: 'CLIM03', code: 'CLIM03', nom: 'Split cassette boulangerie',
      designation: 'Cassette plafonnière 7 kW',
      marque: 'Mitsubishi', modele: 'PLA-RP71', serie: 'MIT-2022-9988',
      clientId: 'CLI-DEMO-001',
      fluide: 'R32', charge: 1.5, chargeNom: 1.5, chargeActuelle: 1.4,
      detectionPermanente: false,
      dateInstall: '2022-07-08',
      prochControle: '2026-07-08', prochainControle: '2026-07-08'
    },
    {
      id: 'CF05', code: 'CF05', nom: 'Réserve froide pharmacie vaccins',
      designation: 'Chambre vaccins 2-8 °C',
      marque: 'Liebherr', modele: 'MKv5710', serie: 'LH-2024-2255',
      clientId: 'CLI-DEMO-004',
      fluide: 'R134a', charge: 0.45, chargeNom: 0.45, chargeActuelle: 0.45,
      detectionPermanente: false,
      dateInstall: '2024-01-15',
      prochControle: '2027-01-15', prochainControle: '2027-01-15'
    }
  ],

  bouteilles: [
    {
      id: 'B-R449A-001', code: 'B-R449A-001', fluide: 'R449A',
      contenance: 12, masseFluide: 8.4, stockActuel: 8.4, capacite: 12,
      numLot: '2026-AB-1547', dateAchat: '2026-02-15',
      fournisseur: 'Climalife', actif: true
    },
    {
      id: 'B-R32-001', code: 'B-R32-001', fluide: 'R32',
      contenance: 10, masseFluide: 6.2, stockActuel: 6.2, capacite: 10,
      numLot: '2026-CD-2231', dateAchat: '2026-01-20',
      fournisseur: 'Westfalen', actif: true
    },
    {
      id: 'B-R134a-001', code: 'B-R134a-001', fluide: 'R134a',
      contenance: 13.6, masseFluide: 11.8, stockActuel: 11.8, capacite: 13.6,
      numLot: '2025-EF-9908', dateAchat: '2025-11-10',
      fournisseur: 'Climalife', actif: true
    },
    {
      id: 'B-R410A-001', code: 'B-R410A-001', fluide: 'R410A',
      contenance: 11.3, masseFluide: 3.5, stockActuel: 3.5, capacite: 11.3,
      numLot: '2025-GH-4452', dateAchat: '2025-08-05',
      fournisseur: 'Air Liquide', actif: true
    },
    {
      id: 'B-R744-001', code: 'B-R744-001', fluide: 'R744',
      contenance: 24, masseFluide: 22.1, stockActuel: 22.1, capacite: 24,
      numLot: '2026-IJ-7710', dateAchat: '2026-03-01',
      fournisseur: 'Air Liquide', actif: true
    }
  ],

  detecteurs: [
    {
      id: 'DET-001', code: 'DET-001',
      marque: 'Inficon', modele: 'D-TEK Select',
      serie: 'INF-2024-5566',
      dateAchat: '2024-06-15',
      etalonnage: '2026-01-10',
      prochaineVerif: '2027-01-10',
      sensibilite: '3 g/an',
      type: 'Détecteur électronique portatif',
      actif: true
    },
    {
      id: 'DET-002', code: 'DET-002',
      marque: 'Bacharach', modele: 'PGM-IR',
      serie: 'BAC-2023-1122',
      dateAchat: '2023-04-22',
      etalonnage: '2026-02-15',
      prochaineVerif: '2027-02-15',
      sensibilite: '5 g/an',
      type: 'Détecteur infrarouge',
      actif: true
    },
    {
      id: 'DET-003', code: 'DET-003',
      marque: 'CPS', modele: 'LS3000',
      serie: 'CPS-2022-8845',
      dateAchat: '2022-09-10',
      etalonnage: '2025-09-15',
      prochaineVerif: '2026-09-15',
      sensibilite: '4 g/an',
      type: 'Détecteur électronique chauffé',
      actif: true
    }
  ],

  mouvements: [
    {
      id: 'MVT-DEMO-001', cerfa: '26R449N1',
      date: '2026-04-12', machine: 'CF02', machineCode: 'CF02',
      bouteille: 'B-R449A-001',
      type: 'Appoint', quantite: 0.2, masse: 0.2,
      operateur: 'USER-DEMO-001', operateurNom: 'Julien Martin',
      detecteur: 'DET-001',
      resultat: 'Conforme',
      observations: 'Appoint suite à légère perte sur raccord, étanchéité contrôlée OK.',
      mode: 'OFFICIEL'
    },
    {
      id: 'MVT-DEMO-002', cerfa: '26R32N1',
      date: '2026-03-28', machine: 'CLIM03', machineCode: 'CLIM03',
      bouteille: 'B-R32-001',
      type: 'Appoint', quantite: 0.1, masse: 0.1,
      operateur: 'USER-DEMO-002', operateurNom: 'Marie Dupont',
      detecteur: 'DET-002',
      resultat: 'Conforme',
      observations: 'Contrôle annuel — appoint léger sur unité intérieure.',
      mode: 'OFFICIEL'
    },
    {
      id: 'MVT-DEMO-003', cerfa: '26R410N1',
      date: '2026-02-14', machine: 'CLIM02', machineCode: 'CLIM02',
      bouteille: 'B-R410A-001',
      type: 'Appoint', quantite: 0.15, masse: 0.15,
      operateur: 'USER-DEMO-001', operateurNom: 'Julien Martin',
      detecteur: 'DET-001',
      resultat: 'Fuite',
      observations: 'Fuite repérée sur raccord flare ext. Réparation faite. Contrôle de vérification prévu sous 30 jours.',
      mode: 'OFFICIEL'
    },
    {
      id: 'MVT-DEMO-004', cerfa: '26R134N1',
      date: '2026-01-15', machine: 'CF05', machineCode: 'CF05',
      bouteille: 'B-R134a-001',
      type: 'ControlePerio', quantite: 0, masse: 0,
      operateur: 'USER-DEMO-003', operateurNom: 'Thomas Bernard',
      detecteur: 'DET-002',
      resultat: 'Conforme',
      observations: 'Contrôle d\'étanchéité périodique — RAS.',
      mode: 'OFFICIEL'
    },
    {
      id: 'MVT-DEMO-005', cerfa: 'FORM-001',
      date: '2026-05-02', machine: 'CF01', machineCode: 'CF01',
      bouteille: 'B-R449A-001',
      type: 'Appoint', quantite: 0.3, masse: 0.3,
      operateur: 'USER-DEMO-004', operateurNom: 'Léa Garcia',
      detecteur: 'DET-001',
      resultat: 'Conforme',
      observations: 'TP CAP IFCA — appoint en mode formation, supervisé par J. Martin.',
      mode: 'FORMATION'
    }
  ],

  controles: [
    {
      id: 'CTRL-DEMO-001',
      date: '2026-04-12', machine: 'CF02', machineCode: 'CF02',
      operateur: 'USER-DEMO-001',
      detecteur: 'DET-001',
      resultat: 'Conforme',
      observations: 'Contrôle d\'étanchéité OK après appoint.'
    },
    {
      id: 'CTRL-DEMO-002',
      date: '2026-02-14', machine: 'CLIM02', machineCode: 'CLIM02',
      operateur: 'USER-DEMO-001',
      detecteur: 'DET-001',
      resultat: 'Fuite',
      observations: 'Fuite détectée sur raccord flare extérieur.'
    },
    {
      id: 'CTRL-DEMO-003',
      date: '2026-01-15', machine: 'CF05', machineCode: 'CF05',
      operateur: 'USER-DEMO-003',
      detecteur: 'DET-002',
      resultat: 'Conforme',
      observations: 'Contrôle périodique annuel OK.'
    }
  ],

  alertes: [
    {
      id: 'ALERT-DEMO-001',
      type: 'controle',
      gravite: 'warning',
      message: 'Contrôle à prévoir : CF02 (Restaurant La Calanque Bleue) — échéance 20 juin 2026',
      cible: 'CF02',
      date: '2026-05-12',
      resolved: false
    },
    {
      id: 'ALERT-DEMO-002',
      type: 'attestation',
      gravite: 'info',
      message: 'Attestation de Thomas Bernard arrive à échéance le 10 juillet 2026',
      cible: 'USER-DEMO-003',
      date: '2026-05-12',
      resolved: false
    },
    {
      id: 'ALERT-DEMO-003',
      type: 'detecteur',
      gravite: 'warning',
      message: 'Détecteur DET-003 (CPS LS3000) — vérification annuelle à prévoir avant le 15/09/2026',
      cible: 'DET-003',
      date: '2026-05-12',
      resolved: false
    }
  ]
};
