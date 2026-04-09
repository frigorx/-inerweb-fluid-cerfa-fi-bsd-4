/**
 * inerWeb Fluide - CERFA 15497*04 Module (PDF officiel)
 * Remplit le vrai formulaire CERFA PDF AcroForm via pdf-lib
 * 72 champs officiels : texte + cases à cocher
 */

const CERFA = {

  /** Cache du PDF template (chargé une seule fois) */
  _pdfBytes: null,

  /**
   * Charge le PDF template officiel (une seule fois, mis en cache)
   */
  async _loadTemplate() {
    if (this._pdfBytes) return this._pdfBytes;
    const url = new URL('cerfa_15497-04_officiel.pdf', window.location.href).href;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Impossible de charger le PDF CERFA officiel');
    this._pdfBytes = await resp.arrayBuffer();
    return this._pdfBytes;
  },

  /**
   * Prépare les données depuis l'état de l'application
   * (même logique que l'ancien cerfa.js)
   */
  _prepareData(data) {
    const config = State.config || {};
    const user = State.user || {};
    const machine = data.machine ? State.getMachineById(data.machine) : (State.machines[0] || {});
    const bouteille = data.bouteille ? State.getBouteilleById(data.bouteille) : null;
    const fluide = State.getFluidByCode(machine.fluide);
    const charge = parseFloat(machine.chargeActuelle || machine.charge || 0);
    const prg = fluide ? fluide.prg : 0;
    const eqCO2 = (charge * prg / 1000).toFixed(2);
    const isFormation = (data.mode || State.mode) === 'FORMATION';

    // Seuil F-Gas
    const famille = (fluide?.famille || '').toUpperCase();
    let seuil = {};
    if (famille.includes('HFC') || famille.includes('PFC')) {
      const teq = parseFloat(eqCO2);
      if (teq >= 500) seuil = { case: 'Case_HFC_500' };
      else if (teq >= 50) seuil = { case: 'Case_HFC_50' };
      else if (teq >= 5) seuil = { case: 'Case_HFC_5' };
    } else if (famille.includes('HFO')) {
      if (charge >= 100) seuil = { case: 'Case_HFO_100' };
      else if (charge >= 10) seuil = { case: 'Case_HFO_10' };
      else if (charge >= 1) seuil = { case: 'Case_HFO_1' };
    } else if (famille.includes('HCFC')) {
      if (charge >= 300) seuil = { case: 'Case_HCFC_300' };
      else if (charge >= 30) seuil = { case: 'Case_HCFC_30' };
      else if (charge >= 2) seuil = { case: 'Case_HCFC_2' };
    }

    // Fréquence de contrôle
    const detPerm = machine.detectionPermanente || false;
    let frequenceCase = '';
    const seuilNiveau = seuil.case || '';
    if (seuilNiveau.endsWith('500') || seuilNiveau.endsWith('300') || seuilNiveau.endsWith('100')) {
      frequenceCase = detPerm ? 'Case_Avec_6m' : 'Case_Sans_3m';
    } else if (seuilNiveau.endsWith('50') || seuilNiveau.endsWith('30') || seuilNiveau.endsWith('10')) {
      frequenceCase = detPerm ? 'Case_Avec_12m' : 'Case_Sans_6m';
    } else if (seuilNiveau.endsWith('5') || seuilNiveau.endsWith('2') || seuilNiveau.endsWith('_1')) {
      frequenceCase = detPerm ? 'Case_Avec_24m' : 'Case_Sans_12m';
    }

    // Type intervention → case à cocher
    const type = data.type || '';
    const natureCases = {};
    if (['Charge', 'Appoint'].includes(type)) natureCases.Case_Maintenance = true;
    if (type === 'MiseEnService') natureCases.Case_MiseService = true;
    if (type === 'Recuperation' || type === 'Vidange') natureCases.Case_Demantel = true;
    if (type === 'Transfert') natureCases.Case_Maintenance = true;
    if (type === 'Assemblage') natureCases.Case_Assemblage = true;
    if (type === 'Modification') natureCases.Case_Modif = true;
    if (type === 'ControlePerio') natureCases.Case_CtrlPerio = true;
    if (type === 'ControleNonPerio') natureCases.Case_CtrlNonPerio = true;

    // Quantités
    const qty = parseFloat(data.quantite || data.masse || 0);
    const isCharge = ['Charge', 'Appoint', 'MiseEnService'].includes(type);
    const isRecup = ['Recuperation', 'Vidange'].includes(type);

    // Détecteur
    const detecteur = data.detecteur
      ? State.detecteurs.find(d => d.code === data.detecteur || d.id === data.detecteur)
      : null;

    // Client / détenteur
    const client = machine.clientId ? State.getClientById(machine.clientId) : null;

    // Date contrôle
    const dateCtrl = detecteur?.etalonnage ? new Date(detecteur.etalonnage) : new Date();

    // Opérateur texte multiligne
    const operateurLines = [
      config.etablissement || '',
      config.adresse || '',
      config.siret ? 'SIRET : ' + config.siret : ''
    ].filter(l => l).join('\n');

    // Détenteur texte multiligne
    const detenteurAddr = client?.adresse
      ? (client.adresse + (client.cp ? ' ' + client.cp : '') + (client.ville ? ' ' + client.ville : ''))
      : (config.adresse || '');
    const detenteurLines = [
      client?.nom || config.etablissement || '',
      detenteurAddr,
      (client?.siret || '') ? 'SIRET : ' + (client?.siret || '') : ''
    ].filter(l => l).join('\n');

    // Équipement
    const equipId = [
      machine.code || '',
      machine.nom || machine.designation || '',
      machine.marque ? '(' + machine.marque + (machine.modele ? ' ' + machine.modele : '') + ')' : '',
      machine.serie ? 'S/N: ' + machine.serie : ''
    ].filter(s => s).join(' — ');

    // Fuites
    const fuites = data.fuites || [];
    const fuiteConstatee = data.resultat === 'Fuite' ? true : (data.resultat === 'Conforme' ? false : null);

    return {
      ficheNum: data.cerfa || data.id || '',
      isFormation,
      operateurLines,
      attestation: user.attestation || (isFormation ? 'Formation' : ''),
      detenteurLines,
      equipId,
      fluideCode: (machine.fluide || '').replace(/^R-?/, ''),
      charge: charge ? charge.toFixed(2).replace('.', ',') : '',
      eqCO2: eqCO2.replace('.', ','),
      natureCases,
      detecteurId: detecteur ? (detecteur.code || detecteur.id) + ' — ' + (detecteur.marque || '') + ' ' + (detecteur.modele || '') : '',
      dateCtrl,
      detPerm,
      seuilCase: seuil.case || '',
      frequenceCase,
      fuiteConstatee,
      fuites,
      // Cadre 11 — Quantités
      qtyCharge: isCharge ? qty.toFixed(2).replace('.', ',') : '',
      qtyChargeVierge: isCharge ? qty.toFixed(2).replace('.', ',') : '',
      qtyRecupTotal: isRecup ? qty.toFixed(2).replace('.', ',') : '',
      qtyRecupTraitement: isRecup ? qty.toFixed(2).replace('.', ',') : '',
      bsff: data.bsff || '',
      contenant: bouteille ? (bouteille.code || bouteille.id) : '',
      destination: '',
      observations: data.observations || data.commentaire || '',
      // Signatures
      signOperateurNom: user.nomComplet || '',
      signOperateurQualite: user.role || '',
      signOperateurDate: new Date().toLocaleDateString('fr-FR'),
      signDetenteurNom: '',
      signDetenteurQualite: '',
      signDetenteurDate: new Date().toLocaleDateString('fr-FR')
    };
  },

  /**
   * Remplit le PDF officiel avec les données et retourne les bytes du PDF
   */
  async _remplirPDF(data) {
    const { PDFDocument } = PDFLib;
    const templateBytes = await this._loadTemplate();
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    const d = this._prepareData(data);

    // === CHAMPS TEXTE ===
    const textFields = {
      'Fiche_no': d.isFormation ? 'FORM-' + d.ficheNum : d.ficheNum,
      'Operateur': d.operateurLines,
      'Attestation_no': d.attestation,
      'Detenteur': d.detenteurLines,
      'Equipement_ID': d.equipId,
      'Equipement_Fluide': d.fluideCode,
      'Equipement_Charge': d.charge,
      'Equipement_teqCO2': d.eqCO2,
      'Detecteur_ID': d.detecteurId,
      'Controle_Jour': String(d.dateCtrl.getDate()).padStart(2, '0'),
      'Controle_Mois': String(d.dateCtrl.getMonth() + 1).padStart(2, '0'),
      'Controle_Annee': String(d.dateCtrl.getFullYear()),
      // Fuites
      'Fuite_Loca_1': d.fuites[0]?.localisation || '',
      'Fuite_Loca_2': d.fuites[1]?.localisation || '',
      'Fuite_Loca_3': d.fuites[2]?.localisation || '',
      // Cadre 11
      '11_Quantite': d.qtyCharge,
      '11_QA': d.qtyChargeVierge,
      '11_Denom': '',
      '11_QB': '',
      '11_QC': '',
      '11_QDE': d.qtyRecupTotal,
      '11_QD': d.qtyRecupTraitement,
      '11_BSFF': d.bsff,
      '11_QE': '',
      '11_Contenant_ID': d.contenant,
      // Cadre 13-14
      '13_Instal': d.destination,
      '14_Observations': d.observations + (d.isFormation ? '\n[MODE FORMATION — Document non officiel]' : ''),
      // Signatures
      'Sign_Operateur_Nom': d.signOperateurNom,
      'Sign_Operateur_Qualite': d.signOperateurQualite,
      'Sign_Operateur_Date': d.signOperateurDate,
      'Sign_Detenteur_Nom': d.signDetenteurNom,
      'Sign_Detenteur_Qualite': d.signDetenteurQualite,
      'Sign_Detenteur_Date': d.signDetenteurDate,
      // FF inflammable / non inflammable
      'Autre': '',
      'Autre-FF-NON-inflammable': '',
      'Autre-FF-inflammable': ''
    };

    for (const [fieldName, value] of Object.entries(textFields)) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value || '');
      } catch (e) {
        // Champ non trouvé — on continue silencieusement
        console.warn('CERFA champ texte non trouvé :', fieldName);
      }
    }

    // === CASES À COCHER ===
    // Nature de l'intervention
    for (const [caseName, checked] of Object.entries(d.natureCases)) {
      if (checked) {
        try { form.getCheckBox(caseName).check(); } catch (e) { console.warn('Case non trouvée :', caseName); }
      }
    }

    // Détection permanente
    if (d.detPerm) {
      try { form.getCheckBox('Bouton_Oui').check(); } catch (e) { console.warn('Bouton_Oui non trouvé'); }
    }

    // Seuil F-Gas
    if (d.seuilCase) {
      try { form.getCheckBox(d.seuilCase).check(); } catch (e) { console.warn('Case seuil non trouvée :', d.seuilCase); }
    }

    // Fréquence de contrôle
    if (d.frequenceCase) {
      try { form.getCheckBox(d.frequenceCase).check(); } catch (e) { console.warn('Case fréquence non trouvée :', d.frequenceCase); }
    }

    // Fuite constatée
    if (d.fuiteConstatee === true) {
      try { form.getCheckBox('Case_Fuite_Oui').check(); } catch (e) {}
    } else if (d.fuiteConstatee === false) {
      try { form.getCheckBox('Case_Fuite_Non').check(); } catch (e) {}
    }

    // Réparations fuites
    for (let i = 0; i < 3; i++) {
      const fuite = d.fuites[i];
      if (fuite) {
        const n = i + 1;
        try {
          if (fuite.reparee) form.getCheckBox(`Case_Rep_Fuite${n}_realisee`).check();
          else form.getCheckBox(`Case_Rep_Fuite${n}_AFaire`).check();
        } catch (e) {}
      }
    }

    // Aplatir le formulaire pour figer les valeurs (optionnel, commenté pour garder éditable)
    // form.flatten();

    return await pdfDoc.save();
  },

  /**
   * Génère le PDF rempli et l'ouvre dans un nouvel onglet
   */
  async ouvrir(data = {}) {
    try {
      const pdfBytes = await this._remplirPDF(data);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      // Libérer l'URL après un délai
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return win;
    } catch (err) {
      console.error('Erreur génération CERFA PDF :', err);
      UI.toast('Erreur génération CERFA : ' + err.message, 'error');
      return null;
    }
  },

  /**
   * Génère le PDF et lance l'impression
   */
  async imprimer(data = {}) {
    const win = await this.ouvrir(data);
    if (win) {
      setTimeout(() => {
        try { win.print(); } catch (e) { /* cross-origin, l'utilisateur imprimera manuellement */ }
      }, 1000);
    }
  },

  /**
   * Génère le PDF et le télécharge directement
   */
  async telecharger(data = {}, filename) {
    try {
      const pdfBytes = await this._remplirPDF(data);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `CERFA_15497_${data.cerfa || data.id || 'apercu'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('Erreur téléchargement CERFA :', err);
      UI.toast('Erreur téléchargement CERFA : ' + err.message, 'error');
    }
  }
};

// Export global
window.CERFA = CERFA;
