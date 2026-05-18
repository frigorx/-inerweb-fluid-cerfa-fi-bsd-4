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
   * Charge PDF.js dynamiquement (une seule fois).
   * Embarqué localement pour fonctionner hors-ligne (PWA).
   */
  async _loadPdfJs() {
    if (window.pdfjsLib) return window.pdfjsLib;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = new URL('js/pdf.min.js', window.location.href).href;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Impossible de charger PDF.js'));
      document.head.appendChild(s);
    });
    if (!window.pdfjsLib) throw new Error('PDF.js chargé mais introuvable');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      new URL('js/pdf.worker.min.js', window.location.href).href;
    return window.pdfjsLib;
  },

  /**
   * Rendu du PDF dans des canvas via PDF.js — fonctionne sur tous
   * navigateurs (Safari iOS, Android, PC, Mac), corrige le bug
   * « l'iframe affiche une ligne de code au lieu du PDF ».
   */
  async _renderPdfInContainer(pdfBytes, container, zoom) {
    const pdfjsLib = await this._loadPdfJs();
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
    const pdf = await loadingTask.promise;
    container.innerHTML = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: zoom });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.cssText = 'display:block;margin:12px auto;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,0.4);max-width:100%;height:auto;';
      container.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    }
  },

  /**
   * Affiche le PDF dans une modale plein écran avec rendu PDF.js.
   * Garantit l'affichage du CERFA officiel sur tous les appareils.
   */
  async _showInModal(pdfBytes, pdfUrl, filename) {
    const existing = document.getElementById('cerfa-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'cerfa-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'CERFA 15497*04');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;flex-direction:column;font-family:Calibri,sans-serif;';

    modal.innerHTML = ''
      + '<div style="background:#1b3a63;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
      +   '<strong style="flex:1;min-width:180px;font-family:\'Trebuchet MS\',sans-serif;font-size:16px;">📄 CERFA 15497*04 — Document officiel</strong>'
      +   '<button id="cerfa-btn-zoom-out" title="Zoom -" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.5);padding:8px 12px;border-radius:5px;font-weight:bold;cursor:pointer;font-family:inherit;font-size:14px;">−</button>'
      +   '<span id="cerfa-zoom-label" style="color:#fff;min-width:50px;text-align:center;font-size:13px;">100%</span>'
      +   '<button id="cerfa-btn-zoom-in" title="Zoom +" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.5);padding:8px 12px;border-radius:5px;font-weight:bold;cursor:pointer;font-family:inherit;font-size:14px;">+</button>'
      +   '<button id="cerfa-btn-print" style="background:#ff6b35;color:#fff;border:1px solid #ff6b35;padding:8px 14px;border-radius:5px;font-weight:bold;cursor:pointer;font-family:inherit;font-size:14px;">🖨️ Imprimer</button>'
      +   '<button id="cerfa-btn-download" style="background:#fff;color:#1b3a63;border:1px solid #fff;padding:8px 14px;border-radius:5px;font-weight:bold;cursor:pointer;font-family:inherit;font-size:14px;">⬇️ Télécharger</button>'
      +   '<button id="cerfa-btn-newtab" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.5);padding:8px 14px;border-radius:5px;font-weight:bold;cursor:pointer;font-family:inherit;font-size:14px;">↗ Onglet</button>'
      +   '<button id="cerfa-btn-close" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.5);padding:8px 14px;border-radius:5px;font-weight:bold;cursor:pointer;font-family:inherit;font-size:14px;">✖ Fermer</button>'
      + '</div>'
      + '<div id="cerfa-pdf-container" style="flex:1;overflow:auto;background:#444;padding:12px;text-align:center;">'
      +   '<p style="color:#fff;font-family:inherit;font-size:14px;padding:40px;">Chargement du document officiel…</p>'
      + '</div>';

    document.body.appendChild(modal);

    const container = document.getElementById('cerfa-pdf-container');
    const zoomLabel = document.getElementById('cerfa-zoom-label');
    let currentZoom = 1.5;

    const render = async () => {
      try {
        await this._renderPdfInContainer(pdfBytes, container, currentZoom);
        zoomLabel.textContent = Math.round(currentZoom / 1.5 * 100) + '%';
      } catch (e) {
        container.innerHTML = '<p style="color:#fff;font-family:inherit;font-size:14px;padding:40px;">⚠️ Affichage impossible. <a href="' + pdfUrl + '" target="_blank" style="color:#ff6b35;">Ouvrir le PDF dans un onglet</a></p>';
        console.error('PDF.js render error:', e);
      }
    };

    const close = () => {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
    };
    const escHandler = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', escHandler);

    document.getElementById('cerfa-btn-close').onclick = close;
    document.getElementById('cerfa-btn-newtab').onclick = () => window.open(pdfUrl, '_blank');
    document.getElementById('cerfa-btn-zoom-in').onclick = () => {
      currentZoom = Math.min(currentZoom + 0.25, 4);
      render();
    };
    document.getElementById('cerfa-btn-zoom-out').onclick = () => {
      currentZoom = Math.max(currentZoom - 0.25, 0.5);
      render();
    };
    document.getElementById('cerfa-btn-print').onclick = () => {
      // Impression : on ouvre le blob dans un onglet (viewer natif → impression)
      const win = window.open(pdfUrl, '_blank');
      if (win) {
        setTimeout(() => { try { win.print(); } catch (e) { /* l'utilisateur imprimera depuis le viewer */ } }, 800);
      }
    };
    document.getElementById('cerfa-btn-download').onclick = () => {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = filename || 'CERFA_15497_apercu.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    render();
  },

  // =====================================================================
  // APERÇU HTML LISIBLE (rendu à l'écran)
  // Reprend la mise en page « cadres 1-14 numérotés » de l'ancien backup.
  // Utilisé par défaut pour CERFA.ouvrir() — le PDF officiel reste
  // accessible via CERFA.ouvrirPDF() / bouton « PDF officiel ».
  // =====================================================================

  _checkboxHTML(checked) {
    return checked ? '<span class="cb-box checked">☒</span>' : '<span class="cb-box">☐</span>';
  },

  /**
   * Prépare les données pour le rendu HTML (structure plate, lisible).
   */
  _prepareDataHTML(data) {
    const config = State.config || {};
    const user = State.user || {};
    const machine = data.machine ? State.getMachineById(data.machine) : (State.machines[0] || {});
    const bouteille = data.bouteille ? State.getBouteilleById(data.bouteille) : null;
    const fluide = State.getFluidByCode(machine.fluide);
    const charge = parseFloat(machine.chargeActuelle || machine.charge || 0);
    const prg = fluide ? fluide.prg : 0;
    const eqCO2 = (charge * prg / 1000).toFixed(2);
    const isFormation = (data.mode || State.mode) === 'FORMATION';

    let seuil = '';
    const famille = (fluide?.famille || '').toUpperCase();
    if (famille.includes('HFC') || famille.includes('PFC')) {
      const teq = parseFloat(eqCO2);
      if (teq >= 500) seuil = 'HFC-haut';
      else if (teq >= 50) seuil = 'HFC-moy';
      else if (teq >= 5) seuil = 'HFC-bas';
    } else if (famille.includes('HFO')) {
      if (charge >= 100) seuil = 'HFO-haut';
      else if (charge >= 10) seuil = 'HFO-moy';
      else if (charge >= 1) seuil = 'HFO-bas';
    }

    const detPerm = machine.detectionPermanente || false;
    let frequence = 0;
    if (seuil.endsWith('-haut')) frequence = detPerm ? 6 : 3;
    else if (seuil.endsWith('-moy')) frequence = detPerm ? 12 : 6;
    else if (seuil.endsWith('-bas')) frequence = detPerm ? 24 : 12;

    const qty = parseFloat(data.quantite || data.masse || 0);
    const type = data.type || '';
    const isCharge = ['Charge', 'Appoint', 'MiseEnService'].includes(type);
    const isRecup = ['Recuperation', 'Vidange'].includes(type);

    const detecteur = data.detecteur
      ? State.detecteurs.find(d => d.code === data.detecteur || d.id === data.detecteur)
      : null;
    const client = machine.clientId ? State.getClientById(machine.clientId) : null;

    return {
      ficheNum: data.cerfa || data.id || '—',
      isFormation,
      operateur: {
        nom: config.etablissement || '',
        adresse: config.adresse || '',
        siret: config.siret || '',
        attestation: config.attestation || user.attestation || (isFormation ? 'Formation' : '')
      },
      detenteur: {
        nom: client?.nom || config.etablissement || '',
        adresse: client?.adresse
          ? (client.adresse + (client.cp ? ' ' + client.cp : '') + (client.ville ? ' ' + client.ville : ''))
          : (config.adresse || ''),
        siret: client?.siret || config.siret || ''
      },
      equipement: {
        identification: (machine.code || '') + ' — ' + (machine.nom || machine.designation || '')
          + (machine.marque ? ' (' + machine.marque + (machine.modele ? ' ' + machine.modele : '') + ')' : '')
          + (machine.serie ? ' S/N: ' + machine.serie : ''),
        fluide: (machine.fluide || '').replace(/^R-?/, ''),
        charge: charge || '',
        eqCO2: eqCO2
      },
      nature: type,
      natureAutre: '',
      detecteur: {
        identification: detecteur ? (detecteur.code || detecteur.id) + ' — ' + (detecteur.marque || '') + ' ' + (detecteur.modele || '') : '',
        dateControle: detecteur?.etalonnage
          ? (typeof UI !== 'undefined' && UI.formatDate ? UI.formatDate(detecteur.etalonnage) : new Date(detecteur.etalonnage).toLocaleDateString('fr-FR'))
          : ''
      },
      detectionPermanente: detPerm,
      seuil,
      frequence,
      fuiteConstatee: data.resultat === 'Fuite' ? true : (data.resultat === 'Conforme' ? false : null),
      fuites: data.fuites || [],
      charge: {
        total: isCharge ? qty : '',
        vierge: isCharge ? qty : '',
        recycle: '',
        regenere: '',
        changementFluide: ''
      },
      recup: {
        total: isRecup ? qty : '',
        traitement: isRecup ? qty : '',
        bsff: data.bsff || '',
        conserve: '',
        contenant: bouteille ? (bouteille.code || bouteille.id) : ''
      },
      adr: '',
      destination: '',
      observations: data.observations || data.commentaire || '',
      signature: {
        operateurNom: user.nomComplet || config.intervenantParDefaut || '',
        operateurQualite: user.role || '',
        detenteurNom: '',
        detenteurQualite: '',
        date: new Date().toLocaleDateString('fr-FR')
      }
    };
  },

  _genererHTML(data) {
    const d = this._prepareDataHTML(data);
    return '<!DOCTYPE html>'
      + '<html lang="fr"><head><meta charset="UTF-8">'
      + '<title>CERFA 15497*04 — Fiche N° ' + d.ficheNum + '</title>'
      + '<style>' + this._cssHTML() + '</style></head><body>'
      + '<div class="cerfa-page">'
      + (d.isFormation ? '<div class="watermark">FORMATION</div>' : '')
      + '<div class="header">'
        + '<div class="header-left"><div class="rf-logo"><div class="rf-text">RÉPUBLIQUE<br>FRANÇAISE</div><div class="rf-devise">Liberté<br>Égalité<br>Fraternité</div></div><div class="ministere">Ministère chargé<br>de l\'Écologie</div></div>'
        + '<div class="header-center"><div class="titre-principal">FICHE D\'INTERVENTION</div><div class="titre-desc">pour les opérations nécessitant une manipulation de fluides frigorigènes fluorés effectuées sur un équipement thermodynamique, prévue à l\'article R. 543-82 du code de l\'environnement et pour les contrôles d\'étanchéité prévus au R. 543-79 du même code</div></div>'
        + '<div class="header-right"><div class="cerfa-num">N° 15497*04</div><div class="fiche-num">Fiche N° : <span class="val">' + d.ficheNum + '</span></div></div>'
      + '</div>'
      + '<div class="row-2col">'
        + '<div class="cadre cadre-half"><div class="cadre-num">1</div><div class="cadre-title">OPÉRATEUR</div><div class="cadre-subtitle">(Nom, adresse et SIRET)</div><div class="cadre-content">'
          + '<div class="field-block">' + (d.operateur.nom || '') + '<br>' + (d.operateur.adresse || '') + '<br>SIRET : ' + (d.operateur.siret || '____________________') + '</div>'
          + '<div class="field-line"><span class="label">N° d\'attestation de capacité :</span> <span class="val">' + (d.operateur.attestation || '____________________') + '</span></div>'
        + '</div></div>'
        + '<div class="cadre cadre-half"><div class="cadre-num">2</div><div class="cadre-title">DÉTENTEUR</div><div class="cadre-subtitle">(Nom, adresse et SIRET)</div><div class="cadre-content">'
          + '<div class="field-block">' + (d.detenteur.nom || '') + '<br>' + (d.detenteur.adresse || '') + '<br>SIRET : ' + (d.detenteur.siret || '____________________') + '</div>'
        + '</div></div>'
      + '</div>'
      + '<div class="cadre"><div class="cadre-num">3</div><div class="cadre-title">ÉQUIPEMENT CONCERNÉ</div><div class="cadre-content row-fields">'
        + '<div class="field-line flex-1"><span class="label">Identification :</span> <span class="val">' + (d.equipement.identification || '') + '</span></div>'
        + '<div class="field-line"><span class="label">Dénomination du fluide : R-</span><span class="val">' + (d.equipement.fluide || '____') + '</span></div>'
        + '<div class="field-line"><span class="label">Charge totale :</span> <span class="val">' + (d.equipement.charge || '____') + '</span> <span class="unit">kg</span></div>'
        + '<div class="field-line"><span class="label">Tonnage éq. CO2 :</span> <span class="val">' + (d.equipement.eqCO2 || '____') + '</span> <span class="unit">t.éq.CO2</span></div>'
      + '</div></div>'
      + '<div class="cadre"><div class="cadre-num">4</div><div class="cadre-title">NATURE DE L\'INTERVENTION : cocher une ou plusieurs cases</div><div class="cadre-content checkbox-grid">'
        + '<div class="cb-col">'
          + '<label class="cb">' + this._checkboxHTML(d.nature === 'Assemblage') + ' Assemblage de l\'équipement</label>'
          + '<label class="cb">' + this._checkboxHTML(d.nature === 'MiseEnService') + ' Mise en service de l\'équipement</label>'
          + '<label class="cb">' + this._checkboxHTML(d.nature === 'Modification') + ' Modification de l\'équipement</label>'
          + '<label class="cb">' + this._checkboxHTML(['Maintenance','Appoint','Charge'].includes(d.nature)) + ' Maintenance de l\'équipement</label>'
        + '</div>'
        + '<div class="cb-col">'
          + '<label class="cb">' + this._checkboxHTML(d.nature === 'ControlePerio' || d.nature === 'ControlePeriodique') + ' Contrôle d\'étanchéité périodique</label>'
          + '<label class="cb">' + this._checkboxHTML(d.nature === 'ControleNonPerio' || d.nature === 'ControleNonPeriodique') + ' Contrôle d\'étanchéité non périodique</label>'
          + '<label class="cb">' + this._checkboxHTML(['Demantelement','Vidange','Recuperation'].includes(d.nature)) + ' Démantèlement</label>'
          + '<label class="cb">' + this._checkboxHTML(d.nature === 'Autre') + ' Autre (préciser) : <span class="val-inline">' + (d.natureAutre || '') + '</span></label>'
        + '</div>'
      + '</div></div>'
      + '<div class="cadre cadre-inline"><div class="cadre-num">5</div><div class="cadre-title-inline">Détecteur manuel de fuite :</div>'
        + '<div class="field-line"><span class="label">Identification :</span> <span class="val">' + (d.detecteur.identification || '____________________') + '</span></div>'
        + '<div class="field-line"><span class="label">Contrôlé le :</span> <span class="val">' + (d.detecteur.dateControle || '__/__/____') + '</span></div>'
      + '</div>'
      + '<div class="cadre cadre-inline"><div class="cadre-num">6</div><div class="cadre-title-inline">Présence d\'un système permanent de détection de fuites :</div>'
        + '<label class="cb-inline">' + this._checkboxHTML(d.detectionPermanente === true) + ' OUI</label>'
        + '<label class="cb-inline">' + this._checkboxHTML(d.detectionPermanente === false) + ' NON</label>'
      + '</div>'
      + '<div class="cadre"><div class="cadre-num">7</div><div class="cadre-title" style="text-align:center;">FRÉQUENCE MINIMALE DU CONTRÔLE PÉRIODIQUE</div>'
        + '<table class="tbl-seuils">'
          + '<thead><tr><th></th><th>Tranche basse</th><th>Tranche moyenne</th><th>Tranche haute</th></tr></thead>'
          + '<tbody>'
            + '<tr><td class="lbl">HCFC</td><td>' + this._checkboxHTML(d.seuil === 'HCFC-bas') + ' 2 kg ≤ Q &lt; 30 kg</td><td>' + this._checkboxHTML(d.seuil === 'HCFC-moy') + ' 30 kg ≤ Q &lt; 300 kg</td><td>' + this._checkboxHTML(d.seuil === 'HCFC-haut') + ' Q ≥ 300 kg</td></tr>'
            + '<tr><td class="lbl">HFC / PFC</td><td>' + this._checkboxHTML(d.seuil === 'HFC-bas') + ' 5 t ≤ téqCO2 &lt; 50 t</td><td>' + this._checkboxHTML(d.seuil === 'HFC-moy') + ' 50 t ≤ téqCO2 &lt; 500 t</td><td>' + this._checkboxHTML(d.seuil === 'HFC-haut') + ' téqCO2 ≥ 500 t</td></tr>'
            + '<tr><td class="lbl">HFO</td><td>' + this._checkboxHTML(d.seuil === 'HFO-bas') + ' 1 kg ≤ Q &lt; 10 kg</td><td>' + this._checkboxHTML(d.seuil === 'HFO-moy') + ' 10 kg ≤ Q &lt; 100 kg</td><td>' + this._checkboxHTML(d.seuil === 'HFO-haut') + ' Q ≥ 100 kg</td></tr>'
          + '</tbody>'
        + '</table>'
        + '<div class="row-2col freq-row">'
          + '<div class="freq-block"><span class="freq-num">8</span><span class="freq-title">Équip. <strong>sans</strong> système permanent :</span>'
            + '<label class="cb-inline">' + this._checkboxHTML(d.frequence === 12 && !d.detectionPermanente) + ' 12 mois</label>'
            + '<label class="cb-inline">' + this._checkboxHTML(d.frequence === 6 && !d.detectionPermanente) + ' 6 mois</label>'
            + '<label class="cb-inline">' + this._checkboxHTML(d.frequence === 3 && !d.detectionPermanente) + ' 3 mois</label>'
          + '</div>'
          + '<div class="freq-block"><span class="freq-num">9</span><span class="freq-title">Équip. <strong>avec</strong> système permanent :</span>'
            + '<label class="cb-inline">' + this._checkboxHTML(d.frequence === 24 && d.detectionPermanente) + ' 24 mois</label>'
            + '<label class="cb-inline">' + this._checkboxHTML(d.frequence === 12 && d.detectionPermanente) + ' 12 mois</label>'
            + '<label class="cb-inline">' + this._checkboxHTML(d.frequence === 6 && d.detectionPermanente) + ' 6 mois</label>'
          + '</div>'
        + '</div>'
      + '</div>'
      + '<div class="cadre"><div class="cadre-num">10</div><div class="cadre-title">FUITES CONSTATÉES LORS DU CONTRÔLE D\'ÉTANCHÉITÉ</div><div class="cadre-content">'
        + '<div style="margin-bottom:4px;"><label class="cb-inline">' + this._checkboxHTML(d.fuiteConstatee === true) + ' OUI</label><label class="cb-inline">' + this._checkboxHTML(d.fuiteConstatee === false) + ' NON</label></div>'
        + '<table class="tbl-fuites"><thead><tr><th>N°</th><th>Localisation de la fuite</th><th>Réparation</th></tr></thead><tbody>'
          + [0,1,2].map((i) => { const f = (d.fuites || [])[i] || {}; return '<tr><td>' + (i + 1) + '</td><td>' + (f.localisation || '') + '</td><td>' + this._checkboxHTML(f.reparee) + ' Réalisée &nbsp; ' + this._checkboxHTML(!f.reparee && f.localisation) + ' À faire</td></tr>'; }).join('')
        + '</tbody></table>'
      + '</div></div>'
      + '<div class="cadre"><div class="cadre-num">11</div><div class="cadre-title">MANIPULATION DU FLUIDE FRIGORIGÈNE</div><div class="row-2col">'
        + '<div class="manip-col"><div class="manip-header">FLUIDE CHARGÉ</div>'
          + '<div class="field-line"><span class="label">Quantité chargée totale (A+B+C) :</span> <span class="val-num">' + (d.charge.total || '') + '</span> <span class="unit">kg</span></div>'
          + '<div class="field-line sub"><span class="label">A — Dont fluide vierge :</span> <span class="val-num">' + (d.charge.vierge || '') + '</span> <span class="unit">kg</span></div>'
          + '<div class="field-line sub"><span class="label">B — Dont fluide recyclé :</span> <span class="val-num">' + (d.charge.recycle || '') + '</span> <span class="unit">kg</span></div>'
          + '<div class="field-line sub"><span class="label">C — Dont fluide régénéré :</span> <span class="val-num">' + (d.charge.regenere || '') + '</span> <span class="unit">kg</span></div>'
        + '</div>'
        + '<div class="manip-col"><div class="manip-header">FLUIDE RÉCUPÉRÉ</div>'
          + '<div class="field-line"><span class="label">Quantité récupérée totale (D+E) :</span> <span class="val-num">' + (d.recup.total || '') + '</span> <span class="unit">kg</span></div>'
          + '<div class="field-line sub"><span class="label">D — Destiné au traitement :</span> <span class="val-num">' + (d.recup.traitement || '') + '</span> <span class="unit">kg</span></div>'
          + '<div class="field-line sub"><span class="label">N° BSFF (Trackdéchets) :</span> <span class="val">' + (d.recup.bsff || '') + '</span></div>'
          + '<div class="field-line sub"><span class="label">E — Conservé :</span> <span class="val-num">' + (d.recup.conserve || '') + '</span> <span class="unit">kg</span></div>'
          + '<div class="field-line sub"><span class="label">Identification contenant(s) :</span> <span class="val">' + (d.recup.contenant || '') + '</span></div>'
        + '</div>'
      + '</div></div>'
      + '<div class="cadre"><div class="cadre-num">12</div><div class="cadre-title">DÉNOMINATION ADR/RID</div><div class="cadre-content" style="font-size:7.5pt;">'
        + '<div class="field-line"><strong>Rubrique Déchets : 14 06 01*</strong> — CFC, HCFC, HFC, HFO — Non-inflammables</div>'
        + '<div class="field-line">' + this._checkboxHTML(d.adr === '1078') + ' UN 1078, Déchet Gaz frigorifique N.S.A., 2.2 (C/E)</div>'
        + '<div class="field-line"><strong>Rubrique Déchets : 16 05 04*</strong> — HFC, HFO — Inflammables</div>'
        + '<div class="field-line">' + this._checkboxHTML(d.adr === '3161') + ' UN 3161, Déchet Gaz liquéfié inflammable N.S.A., 2.1 (B/D)</div>'
      + '</div></div>'
      + '<div class="cadre"><div class="cadre-num">13</div><div class="cadre-title-inline">Installation prévue de destination du fluide récupéré (Nom, SIRET, adresse) :</div><div class="field-block">' + (d.destination || '') + '</div></div>'
      + '<div class="cadre"><div class="cadre-num">14</div><div class="cadre-title-inline">Observations :</div><div class="field-block obs">' + (d.observations || '') + '</div></div>'
      + '<div class="signature-zone">'
        + '<div class="sig-text">Je soussigné certifie que l\'opération ci-dessus a été effectuée.</div>'
        + '<div class="row-2col">'
          + '<div class="sig-col"><div class="sig-header">OPÉRATEUR</div>'
            + '<div class="field-line"><span class="label">Nom du signataire :</span> <span class="val">' + (d.signature.operateurNom || '') + '</span></div>'
            + '<div class="field-line"><span class="label">Qualité :</span> <span class="val">' + (d.signature.operateurQualite || '') + '</span></div>'
            + '<div class="field-line"><span class="label">Date et signature :</span> <span class="val">' + (d.signature.date || '') + '</span></div>'
            + '<div class="sig-box"></div>'
          + '</div>'
          + '<div class="sig-col"><div class="sig-header">DÉTENTEUR</div>'
            + '<div class="field-line"><span class="label">Nom du signataire :</span> <span class="val">' + (d.signature.detenteurNom || '') + '</span></div>'
            + '<div class="field-line"><span class="label">Qualité :</span> <span class="val">' + (d.signature.detenteurQualite || '') + '</span></div>'
            + '<div class="field-line"><span class="label">Date et signature :</span> <span class="val">' + (d.signature.date || '') + '</span></div>'
            + '<div class="sig-box"></div>'
          + '</div>'
        + '</div>'
      + '</div>'
      + '<div class="footer-note">Le détenteur d\'un équipement dont la charge en HCFC est supérieure à 3 kg ou dont la charge en HFC est supérieure à 5 t éq. CO2 doit conserver l\'original de ce document pendant au moins 5 ans (article R. 543-82 du Code de l\'environnement).</div>'
      + '<div class="footer-inerweb">Généré par inerWeb Fluide v7.7.0 ' + (d.isFormation ? '— MODE FORMATION' : '— MODE OFFICIEL') + ' — ' + new Date().toLocaleDateString('fr-FR') + '</div>'
      + '</div></body></html>';
  },

  _cssHTML() {
    return '@page { size: A4 portrait; margin: 8mm; }'
      + '* { box-sizing: border-box; margin: 0; padding: 0; }'
      + 'body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; line-height: 1.25; color: #000; background: #f0f0f0; padding: 20px; }'
      + '.cerfa-page { width: 210mm; min-height: 295mm; margin: 0 auto; padding: 8mm; background: white; position: relative; overflow: hidden; box-shadow: 0 2px 20px rgba(0,0,0,0.15); }'
      + '.watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-35deg); font-size: 72pt; font-weight: 900; color: rgba(139,92,246,0.06); pointer-events: none; white-space: nowrap; z-index: 0; letter-spacing: 12px; }'
      + '.header { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 2px solid #000; }'
      + '.header-left { flex-shrink: 0; width: 70px; text-align: center; }'
      + '.rf-logo { border: 1.5px solid #000; padding: 3px; margin-bottom: 2px; font-size: 6pt; line-height: 1.1; }'
      + '.rf-text { font-weight: 700; font-size: 6.5pt; letter-spacing: 0.3px; }'
      + '.rf-devise { font-size: 5.5pt; font-style: italic; border-top: 0.5px solid #000; margin-top: 1px; padding-top: 1px; }'
      + '.ministere { font-size: 5.5pt; color: #333; }'
      + '.header-center { flex: 1; text-align: center; }'
      + '.titre-principal { font-size: 14pt; font-weight: 700; letter-spacing: 1px; }'
      + '.titre-desc { font-size: 6.5pt; line-height: 1.2; color: #333; margin-top: 2px; max-width: 400px; margin-left: auto; margin-right: auto; }'
      + '.header-right { flex-shrink: 0; text-align: right; width: 90px; }'
      + '.cerfa-num { font-size: 9pt; font-weight: 700; border: 1.5px solid #000; padding: 3px 6px; display: inline-block; margin-bottom: 4px; }'
      + '.fiche-num { font-size: 8pt; font-weight: 600; }'
      + '.cadre { border: 1.5px solid #000; margin-bottom: 3px; padding: 3px 5px; position: relative; page-break-inside: avoid; }'
      + '.cadre-half { flex: 1; min-width: 0; }'
      + '.cadre-num { position: absolute; top: -1px; left: -1px; background: #000; color: #fff; font-size: 7.5pt; font-weight: 700; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; line-height: 1; }'
      + '.cadre-title { font-weight: 700; font-size: 8pt; text-transform: uppercase; margin-left: 18px; margin-bottom: 2px; }'
      + '.cadre-title-inline { font-weight: 700; font-size: 8pt; display: inline; margin-left: 18px; }'
      + '.cadre-subtitle { font-size: 7pt; color: #555; margin-left: 18px; margin-bottom: 2px; }'
      + '.cadre-content { padding-left: 2px; }'
      + '.cadre-inline { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 4px 5px; }'
      + '.field-block { font-size: 8pt; line-height: 1.3; min-height: 28px; padding: 2px 0; }'
      + '.field-block.obs { min-height: 18px; }'
      + '.field-line { font-size: 8pt; margin-bottom: 1px; display: flex; align-items: baseline; gap: 3px; flex-wrap: wrap; }'
      + '.field-line.sub { padding-left: 10px; font-size: 7.5pt; }'
      + '.label { color: #000; white-space: nowrap; }'
      + '.val, .val-inline { font-weight: 600; color: #1a1a1a; border-bottom: 0.5px dotted #999; min-width: 30px; padding: 0 2px; }'
      + '.val-num { font-weight: 700; font-family: "Courier New", monospace; font-size: 9pt; min-width: 30px; text-align: right; border-bottom: 0.5px dotted #999; padding: 0 3px; }'
      + '.unit { font-size: 7pt; color: #555; }'
      + '.flex-1 { flex: 1; }'
      + '.row-2col { display: flex; gap: 4px; }'
      + '.row-fields { display: flex; flex-wrap: wrap; gap: 4px 12px; }'
      + '.cb-box { font-size: 10pt; line-height: 1; vertical-align: middle; }'
      + '.cb-box.checked { font-weight: 700; }'
      + '.checkbox-grid { display: flex; gap: 12px; }'
      + '.cb-col { flex: 1; }'
      + '.cb { display: block; font-size: 7.5pt; margin-bottom: 1px; }'
      + '.cb-inline { font-size: 8pt; margin-right: 8px; }'
      + '.tbl-seuils { width: 100%; border-collapse: collapse; font-size: 7pt; margin: 3px 0; }'
      + '.tbl-seuils th, .tbl-seuils td { border: 0.5px solid #000; padding: 2px 4px; text-align: center; }'
      + '.tbl-seuils th { background: #e8e8e8; font-weight: 700; }'
      + '.tbl-seuils .lbl { font-weight: 700; text-align: left; background: #f5f5f5; width: 60px; }'
      + '.tbl-fuites { width: 100%; border-collapse: collapse; font-size: 7.5pt; }'
      + '.tbl-fuites th, .tbl-fuites td { border: 0.5px solid #000; padding: 2px 4px; }'
      + '.tbl-fuites th { background: #e8e8e8; font-weight: 700; text-align: left; }'
      + '.freq-row { margin-top: 3px; }'
      + '.freq-block { flex: 1; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; font-size: 7.5pt; border: 0.5px solid #000; padding: 2px 4px; }'
      + '.freq-num { background: #000; color: #fff; font-size: 7pt; font-weight: 700; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }'
      + '.freq-title { font-size: 7pt; }'
      + '.manip-col { flex: 1; min-width: 0; }'
      + '.manip-header { background: #000; color: #fff; font-weight: 700; font-size: 7.5pt; text-align: center; padding: 2px; margin-bottom: 3px; }'
      + '.signature-zone { border: 1.5px solid #000; margin-top: 3px; padding: 4px 6px; }'
      + '.sig-text { font-size: 8pt; font-style: italic; margin-bottom: 4px; }'
      + '.sig-col { flex: 1; border: 0.5px solid #999; padding: 3px 5px; }'
      + '.sig-header { font-weight: 700; font-size: 8pt; text-align: center; margin-bottom: 3px; text-transform: uppercase; }'
      + '.sig-box { width: 100%; height: 25px; border: 0.5px dashed #999; margin-top: 3px; }'
      + '.footer-note { font-size: 6pt; color: #555; margin-top: 3px; line-height: 1.2; font-style: italic; }'
      + '.footer-inerweb { font-size: 6pt; color: #999; text-align: right; margin-top: 2px; }'
      + '@media print { body { background: white; padding: 0; } .cerfa-page { box-shadow: none; margin: 0; padding: 0; width: 100%; min-height: auto; } .watermark { color: rgba(139,92,246,0.04); } .footer-inerweb { display: none; } }';
  },

  /**
   * Ouvre l'aperçu HTML lisible dans une modale + boutons « Imprimer » et « PDF officiel »
   */
  _showHTMLInModal(html, data) {
    const existing = document.getElementById('cerfa-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'cerfa-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'CERFA 15497*04 — Aperçu');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;flex-direction:column;font-family:Calibri,sans-serif;';

    modal.innerHTML = ''
      + '<div style="background:#1b3a63;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
      +   '<strong style="flex:1;min-width:180px;font-family:\'Trebuchet MS\',sans-serif;font-size:16px;">📄 CERFA 15497*04 — Aperçu lisible</strong>'
      +   '<button id="cerfa-btn-pdf" style="background:#ff6b35;color:#fff;border:1px solid #ff6b35;padding:8px 14px;border-radius:5px;font-weight:bold;cursor:pointer;font-family:inherit;font-size:14px;">📑 PDF officiel</button>'
      +   '<button id="cerfa-btn-print" style="background:#fff;color:#1b3a63;border:1px solid #fff;padding:8px 14px;border-radius:5px;font-weight:bold;cursor:pointer;font-family:inherit;font-size:14px;">🖨️ Imprimer</button>'
      +   '<button id="cerfa-btn-close" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.5);padding:8px 14px;border-radius:5px;font-weight:bold;cursor:pointer;font-family:inherit;font-size:14px;">✖ Fermer</button>'
      + '</div>'
      + '<iframe id="cerfa-iframe-html" srcdoc="" style="flex:1;width:100%;border:none;background:#f0f0f0;"></iframe>';

    document.body.appendChild(modal);

    const iframe = document.getElementById('cerfa-iframe-html');
    iframe.srcdoc = html;

    const close = () => {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    };
    const escHandler = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', escHandler);

    document.getElementById('cerfa-btn-close').onclick = close;
    document.getElementById('cerfa-btn-print').onclick = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400); }
      }
    };
    document.getElementById('cerfa-btn-pdf').onclick = () => {
      close();
      this.ouvrirPDF(data);
    };
  },

  /**
   * APERÇU HTML LISIBLE (rendu à l'écran).
   * C'est la fonction par défaut — utilisée par tous les boutons « CERFA » de l'app.
   */
  async ouvrir(data = {}) {
    try {
      const html = this._genererHTML(data);
      this._showHTMLInModal(html, data);
      return true;
    } catch (err) {
      console.error('Erreur génération CERFA HTML :', err);
      if (typeof UI !== 'undefined' && UI.toast) UI.toast('Erreur aperçu CERFA : ' + err.message, 'error');
      else alert('Erreur aperçu CERFA : ' + err.message);
      return null;
    }
  },

  /**
   * PDF OFFICIEL CERFA (rempli via pdf-lib, AcroForm).
   * Utilisé pour archivage / signature / inspection.
   */
  async ouvrirPDF(data = {}) {
    try {
      if (typeof PDFLib === 'undefined') {
        const msg = 'pdf-lib non chargé — impossible de générer le CERFA';
        if (typeof UI !== 'undefined' && UI.toast) UI.toast(msg, 'error');
        else alert(msg);
        return null;
      }
      const pdfBytes = await this._remplirPDF(data);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = 'CERFA_15497_' + (data.cerfa || data.id || 'apercu') + '.pdf';
      await this._showInModal(pdfBytes, url, filename);
      return true;
    } catch (err) {
      console.error('Erreur génération CERFA PDF :', err);
      const msg = 'Erreur génération CERFA : ' + err.message;
      if (typeof UI !== 'undefined' && UI.toast) UI.toast(msg, 'error');
      else alert(msg);
      return null;
    }
  },

  /**
   * Aperçu HTML + impression directe (raccourci).
   */
  async imprimer(data = {}) {
    await this.ouvrir(data);
    setTimeout(() => {
      try {
        document.getElementById('cerfa-iframe-html')?.contentWindow?.print();
      } catch (e) { /* l'utilisateur imprimera depuis le bouton */ }
    }, 700);
  },

  /**
   * Télécharge directement le PDF officiel (sans modale).
   */
  async telecharger(data = {}, filename) {
    try {
      const pdfBytes = await this._remplirPDF(data);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'CERFA_15497_' + (data.cerfa || data.id || 'apercu') + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('Erreur téléchargement CERFA :', err);
      if (typeof UI !== 'undefined' && UI.toast) UI.toast('Erreur téléchargement CERFA : ' + err.message, 'error');
    }
  }
};

// Export global
window.CERFA = CERFA;
