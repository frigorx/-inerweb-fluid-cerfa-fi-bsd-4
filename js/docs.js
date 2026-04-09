/**
 * inerWeb Fluide — Générateur de documents officiels PDF
 * Tous les documents réglementaires F-Gas hors CERFA
 * Utilise pdf-lib (déjà chargé via cerfa.js)
 */

const DOCS = {

  // ============================================================
  //  1. FICHE MOUVEMENT BOUTEILLE (ex Opérateur.odt)
  //  2 pages : Page 1 = tableau opérateur / Page 2 = identité bouteille + tableau
  // ============================================================

  async ficheBouteille(bouteilleId) {
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const bouteille = State.getBouteilleById(bouteilleId);
    if (!bouteille) throw new Error('Bouteille introuvable : ' + bouteilleId);

    // Récupérer tous les mouvements liés à cette bouteille
    const mouvements = (State.mouvements || []).filter(m =>
      m.bouteille === bouteilleId || m.bouteilleCode === bouteille.code
    );

    const config = State.config || {};
    const bleu = rgb(0.106, 0.227, 0.388); // #1b3a63
    const noir = rgb(0, 0, 0);
    const gris = rgb(0.85, 0.85, 0.85);
    const blanc = rgb(1, 1, 1);

    // --- PAGE 1 : Tableau des mouvements opérateur ---
    const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page1.getSize();
    const margin = 40;
    let y = height - margin;

    // En-tête
    page1.drawText('FICHE DE MOUVEMENT DE FLUIDE — BOUTEILLE', {
      x: margin, y, size: 14, font: fontBold, color: bleu
    });
    y -= 18;

    const isFormation = State.mode === 'FORMATION';
    if (isFormation) {
      page1.drawText('MODE FORMATION — Document non officiel', {
        x: margin, y, size: 9, font, color: rgb(0.55, 0.36, 0.96)
      });
      y -= 14;
    }

    // Info établissement
    page1.drawText(config.etablissement || 'Établissement', {
      x: margin, y, size: 10, font: fontBold, color: noir
    });
    y -= 13;
    if (config.adresse) {
      page1.drawText(config.adresse, { x: margin, y, size: 8, font, color: noir });
      y -= 11;
    }
    if (config.siret) {
      page1.drawText('SIRET : ' + config.siret, { x: margin, y, size: 8, font, color: noir });
      y -= 11;
    }
    y -= 8;

    // Info bouteille résumé
    page1.drawText(`Bouteille : ${bouteille.code || bouteille.id}`, {
      x: margin, y, size: 10, font: fontBold, color: bleu
    });
    page1.drawText(`Fluide : ${bouteille.fluide || '?'}`, {
      x: 280, y, size: 10, font: fontBold, color: bleu
    });
    page1.drawText(`Catégorie : ${bouteille.categorie || '?'}`, {
      x: 420, y, size: 10, font: fontBold, color: bleu
    });
    y -= 20;

    // Tableau mouvements
    const cols1 = [
      { label: 'Opérateur', width: 80 },
      { label: 'Date\nintervention', width: 65 },
      { label: 'N° machine', width: 70 },
      { label: 'Poids initial\nbouteille (kg)', width: 70 },
      { label: 'Poids final\nbouteille (kg)', width: 70 },
      { label: 'Quantité\nintroduite (kg)', width: 70 },
      { label: 'Quantité\nretirée (kg)', width: 70 },
      { label: 'Quantité\nperdue (kg)', width: 65 }
    ];

    y = this._drawTable(page1, margin, y, cols1, mouvements.map(m => {
      const machine = m.machineCode || m.machine || '';
      const user = m.operateur || m.user || '';
      const date = m.date ? new Date(m.date).toLocaleDateString('fr-FR') : '';
      const pInit = m.peseeAvant != null ? parseFloat(m.peseeAvant).toFixed(2) : '';
      const pFin = m.peseeApres != null ? parseFloat(m.peseeApres).toFixed(2) : '';
      const qty = parseFloat(m.quantite || 0);
      const isCharge = ['Charge', 'Appoint', 'MiseEnService'].includes(m.type);
      const isRecup = ['Recuperation', 'Vidange'].includes(m.type);
      return [
        user, date, machine, pInit, pFin,
        isCharge ? qty.toFixed(2) : '',
        isRecup ? qty.toFixed(2) : '',
        '' // quantité perdue à calculer
      ];
    }), font, fontBold, 15);

    // Pied de page
    page1.drawText(`Généré par inerWeb Fluide — ${new Date().toLocaleDateString('fr-FR')}`, {
      x: margin, y: 25, size: 7, font, color: rgb(0.5, 0.5, 0.5)
    });

    // --- PAGE 2 : Identité bouteille + tableau ---
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    y = height - margin;

    page2.drawText('FEUILLE DE MOUVEMENT DE FLUIDE — BOUTEILLE', {
      x: margin, y, size: 14, font: fontBold, color: bleu
    });
    y -= 25;

    // Cadre identité bouteille
    const boxH = 120;
    page2.drawRectangle({
      x: margin, y: y - boxH, width: width - 2 * margin, height: boxH,
      borderColor: bleu, borderWidth: 1.5, color: blanc
    });

    const leftCol = margin + 10;
    const rightCol = width / 2 + 20;
    let yBox = y - 15;

    const infoLines = [
      { label: 'NUMÉRO DE BOUTEILLE', value: bouteille.code || bouteille.id || '', x: leftCol },
      { label: 'FOURNISSEUR', value: bouteille.fournisseur || bouteille.marque || '', x: leftCol },
      { label: 'TYPE', value: this._getBouteilleType(bouteille), x: leftCol },
      { label: 'FLUIDE', value: bouteille.fluide || '', x: rightCol, yOffset: 60 },
      { label: 'CAPACITÉ', value: (bouteille.contenance || bouteille.capacite || '') + ' L', x: rightCol, yOffset: 40 },
      { label: 'TARE', value: (bouteille.tare || '') + ' kg', x: rightCol, yOffset: 20 },
      { label: 'MASSE ACTUELLE', value: (bouteille.masse || bouteille.masseActuelle || '') + ' kg', x: rightCol, yOffset: 0 }
    ];

    // Colonne gauche
    let yLeft = yBox;
    for (const info of infoLines.filter(l => l.x === leftCol)) {
      page2.drawText(info.label + ' :', { x: info.x, y: yLeft, size: 8, font: fontBold, color: bleu });
      page2.drawText(String(info.value), { x: info.x + 130, y: yLeft, size: 9, font, color: noir });
      yLeft -= 16;
    }

    // Colonne droite
    for (const info of infoLines.filter(l => l.x === rightCol)) {
      const yR = yBox - (60 - (info.yOffset || 0));
      page2.drawText(info.label + ' :', { x: info.x, y: yR, size: 8, font: fontBold, color: bleu });
      page2.drawText(String(info.value), { x: info.x + 110, y: yR, size: 9, font, color: noir });
    }

    // Cases type bouteille
    y = y - boxH - 10;
    const types = ['Récup', 'Transfert', 'Neuve', 'Régénérée'];
    page2.drawText('Type :', { x: margin, y, size: 9, font: fontBold, color: noir });
    let xType = margin + 40;
    for (const t of types) {
      const checked = (bouteille.categorie || '').toLowerCase().includes(t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
      page2.drawRectangle({ x: xType, y: y - 2, width: 10, height: 10, borderColor: noir, borderWidth: 0.8, color: blanc });
      if (checked) {
        page2.drawText('X', { x: xType + 2, y: y - 1, size: 9, font: fontBold, color: noir });
      }
      page2.drawText(t, { x: xType + 14, y, size: 8, font, color: noir });
      xType += 80;
    }
    y -= 25;

    // Tableau mouvements (même structure que page 1)
    y = this._drawTable(page2, margin, y, cols1, mouvements.map(m => {
      const machine = m.machineCode || m.machine || '';
      const user = m.operateur || m.user || '';
      const date = m.date ? new Date(m.date).toLocaleDateString('fr-FR') : '';
      const pInit = m.peseeAvant != null ? parseFloat(m.peseeAvant).toFixed(2) : '';
      const pFin = m.peseeApres != null ? parseFloat(m.peseeApres).toFixed(2) : '';
      const qty = parseFloat(m.quantite || 0);
      const isCharge = ['Charge', 'Appoint', 'MiseEnService'].includes(m.type);
      const isRecup = ['Recuperation', 'Vidange'].includes(m.type);
      return [user, date, machine, pInit, pFin, isCharge ? qty.toFixed(2) : '', isRecup ? qty.toFixed(2) : '', ''];
    }), font, fontBold, 15);

    // Pied de page
    page2.drawText(`Généré par inerWeb Fluide — ${new Date().toLocaleDateString('fr-FR')}`, {
      x: margin, y: 25, size: 7, font, color: rgb(0.5, 0.5, 0.5)
    });

    return await pdfDoc.save();
  },

  _getBouteilleType(b) {
    const cat = (b.categorie || '').toLowerCase();
    if (cat.includes('neuve') || cat.includes('neuf')) return 'Neuve';
    if (cat.includes('recup')) return 'Récupération';
    if (cat.includes('transfer')) return 'Transfert';
    if (cat.includes('regen')) return 'Régénérée';
    return b.categorie || '';
  },

  // ============================================================
  //  2. TABLEAU DE SUIVI TRAÇABILITÉ FLUIDES (format ADEME)
  //  1 page par fluide : distributeurs + mouvements + stocks + cohérence
  // ============================================================

  async suiviFluides(annee, fluideCode) {
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const bleu = rgb(0.106, 0.227, 0.388);
    const noir = rgb(0, 0, 0);
    const config = State.config || {};
    annee = annee || new Date().getFullYear();

    // Filtrer les fluides à traiter
    const fluides = fluideCode
      ? [State.getFluidByCode(fluideCode)].filter(Boolean)
      : (State.fluides || []);

    for (const fluide of fluides) {
      const page = pdfDoc.addPage([841.89, 595.28]); // A4 paysage
      const { width, height } = page.getSize();
      const margin = 30;
      let y = height - margin;

      // En-tête
      page.drawText(`ANNÉE ${annee}`, { x: margin, y, size: 12, font: fontBold, color: bleu });
      page.drawText(config.etablissement || '', { x: 300, y, size: 10, font, color: noir });
      y -= 16;
      page.drawText(`FLUIDES : ${fluide.code || fluide.nom}`, { x: margin, y, size: 11, font: fontBold, color: bleu });
      if (config.siret) page.drawText('SIRET : ' + config.siret, { x: 300, y, size: 8, font, color: noir });
      y -= 20;

      // Section DISTRIBUTEURS
      page.drawText('DISTRIBUTEURS', { x: margin, y, size: 9, font: fontBold, color: bleu });
      y -= 5;

      const colsDist = [
        { label: 'Date', width: 70 },
        { label: 'Qté achetée\ndistributeur France', width: 100 },
        { label: 'Qté achetée\ndistributeur étranger', width: 100 },
        { label: 'Total achetés\ndistributeurs', width: 90 },
        { label: 'Qté remise\naux distributeurs', width: 100 }
      ];

      // Lignes vides pour distributeurs (à remplir)
      const distRows = Array(7).fill(null).map(() => ['', '', '', '', '']);
      y = this._drawTable(page, margin, y, colsDist, distRows, font, fontBold, 14);
      y -= 10;

      // Section MOUVEMENTS FLUIDES
      page.drawText('MOUVEMENTS FLUIDES', { x: margin, y, size: 9, font: fontBold, color: bleu });
      y -= 5;

      const colsMouv = [
        { label: 'N°', width: 25 },
        { label: 'N° intervention', width: 75 },
        { label: 'Date', width: 65 },
        { label: 'Type', width: 70 },
        { label: 'Qté chargée\néquipt neufs (kg)', width: 85 },
        { label: 'Qté chargée\nmaintenance (kg)', width: 85 },
        { label: 'Qté récupérée\nhors usage (kg)', width: 85 },
        { label: 'Qté récupérée\nmaintenance (kg)', width: 85 },
        { label: 'Qté recyclée\n(kg)', width: 75 }
      ];

      // Filtrer mouvements par fluide et année
      const mouvFluide = (State.mouvements || []).filter(m => {
        const machine = m.machineCode ? State.getMachineById(m.machineCode) || State.machines.find(mc => mc.code === m.machineCode) : null;
        const mFluide = machine?.fluide || m.fluide || '';
        const mDate = m.date ? new Date(m.date) : null;
        return mFluide === fluide.code && mDate && mDate.getFullYear() === annee;
      });

      const mouvRows = mouvFluide.map((m, i) => {
        const date = m.date ? new Date(m.date).toLocaleDateString('fr-FR') : '';
        const qty = parseFloat(m.quantite || 0);
        const isMES = m.type === 'MiseEnService';
        const isCharge = ['Charge', 'Appoint'].includes(m.type);
        const isRecup = ['Recuperation', 'Vidange'].includes(m.type);
        return [
          String(i + 1),
          m.cerfa || m.id || '',
          date,
          m.type || '',
          isMES ? qty.toFixed(2) : '',
          isCharge ? qty.toFixed(2) : '',
          '', // hors usage
          isRecup ? qty.toFixed(2) : '',
          '' // recyclé
        ];
      });

      // Compléter à 14 lignes minimum
      while (mouvRows.length < 14) mouvRows.push(['', '', '', '', '', '', '', '', '']);

      y = this._drawTable(page, margin, y, colsMouv, mouvRows, font, fontBold, 13);
      y -= 10;

      // Section STOCKS
      page.drawText('STOCKS', { x: margin, y, size: 9, font: fontBold, color: bleu });
      y -= 5;

      const colsStock = [
        { label: `Stock initial neufs\n01/01/${annee}`, width: 130 },
        { label: `Stock initial usagés\n01/01/${annee}`, width: 130 },
        { label: `Stock final neufs\n31/12/${annee}`, width: 130 },
        { label: `Stock final usagés\n31/12/${annee}`, width: 130 }
      ];

      y = this._drawTable(page, margin, y, colsStock, [['', '', '', '']], font, fontBold, 16);

      // Pied de page
      page.drawText(`Généré par inerWeb Fluide — ${new Date().toLocaleDateString('fr-FR')}`, {
        x: margin, y: 15, size: 7, font, color: rgb(0.5, 0.5, 0.5)
      });
    }

    return await pdfDoc.save();
  },

  // ============================================================
  //  3. REGISTRE DES PLAINTES
  // ============================================================

  async registrePlaintes(plaintes) {
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const bleu = rgb(0.106, 0.227, 0.388);
    const noir = rgb(0, 0, 0);
    const config = State.config || {};

    const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
    const { width, height } = page.getSize();
    const margin = 40;
    let y = height - margin;

    // Titre
    page.drawText('REGISTRE DES PLAINTES', { x: margin, y, size: 16, font: fontBold, color: bleu });
    y -= 16;
    page.drawText(
      'Exigé par l\'arrêté du 29 février 2016 — articles R543.105, R543.106, R543.108 du Code de l\'environnement',
      { x: margin, y, size: 7, font, color: noir }
    );
    y -= 20;

    // Cachet société
    page.drawRectangle({
      x: margin, y: y - 50, width: 200, height: 50,
      borderColor: bleu, borderWidth: 1, color: rgb(0.97, 0.97, 0.97)
    });
    page.drawText('Cachet de la Société', { x: margin + 5, y: y - 12, size: 8, font: fontBold, color: bleu });
    page.drawText(config.etablissement || '', { x: margin + 5, y: y - 25, size: 9, font, color: noir });
    if (config.siret) page.drawText('SIRET : ' + config.siret, { x: margin + 5, y: y - 37, size: 8, font, color: noir });
    y -= 65;

    // Tableau
    const cols = [
      { label: 'Date de réception\nde la plainte', width: 85 },
      { label: 'Nom du client', width: 95 },
      { label: 'Nature / détail\nde la plainte', width: 140 },
      { label: 'Date de réponse\nà la plainte', width: 85 },
      { label: 'État d\'avancement\ndu traitement', width: 110 }
    ];

    const rows = (plaintes || []).map(p => [
      p.dateReception || '',
      p.client || '',
      p.nature || '',
      p.dateReponse || '',
      p.etat || ''
    ]);

    // Compléter à 20 lignes minimum
    while (rows.length < 20) rows.push(['', '', '', '', '']);

    y = this._drawTable(page, margin, y, cols, rows, font, fontBold, 18);

    // Pied de page
    page.drawText(`Généré par inerWeb Fluide — ${new Date().toLocaleDateString('fr-FR')}`, {
      x: margin, y: 25, size: 7, font, color: rgb(0.5, 0.5, 0.5)
    });

    return await pdfDoc.save();
  },

  // ============================================================
  //  4. FICHE TRAÇABILITÉ PAR BOUTEILLE (résumé complet)
  // ============================================================

  async traceeBouteille(bouteilleId) {
    // Alias vers ficheBouteille — même document
    return this.ficheBouteille(bouteilleId);
  },

  // ============================================================
  //  UTILITAIRE : Dessiner un tableau PDF
  // ============================================================

  _drawTable(page, x, y, columns, rows, font, fontBold, rowHeight) {
    const { rgb } = PDFLib;
    const bleu = rgb(0.106, 0.227, 0.388);
    const noir = rgb(0, 0, 0);
    const grisClr = rgb(0.93, 0.93, 0.93);
    const blanc = rgb(1, 1, 1);
    rowHeight = rowHeight || 16;
    const headerHeight = rowHeight + 8;
    const fontSize = 7;
    const headerFontSize = 7;
    const totalWidth = columns.reduce((s, c) => s + c.width, 0);

    // En-tête
    page.drawRectangle({
      x, y: y - headerHeight, width: totalWidth, height: headerHeight,
      color: bleu
    });

    let cx = x;
    for (const col of columns) {
      const lines = col.label.split('\n');
      lines.forEach((line, li) => {
        page.drawText(line, {
          x: cx + 3, y: y - 10 - (li * 9),
          size: headerFontSize, font: fontBold, color: blanc
        });
      });
      // Ligne verticale
      if (cx > x) {
        page.drawLine({
          start: { x: cx, y }, end: { x: cx, y: y - headerHeight },
          thickness: 0.5, color: rgb(0.8, 0.8, 0.9)
        });
      }
      cx += col.width;
    }

    y -= headerHeight;

    // Lignes de données
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      const bgColor = ri % 2 === 0 ? blanc : grisClr;

      page.drawRectangle({
        x, y: y - rowHeight, width: totalWidth, height: rowHeight,
        color: bgColor, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.3
      });

      cx = x;
      for (let ci = 0; ci < columns.length; ci++) {
        const val = String(row[ci] || '');
        // Tronquer si trop long
        const maxChars = Math.floor(columns[ci].width / 4);
        const display = val.length > maxChars ? val.substring(0, maxChars - 1) + '…' : val;
        page.drawText(display, {
          x: cx + 3, y: y - rowHeight + 4,
          size: fontSize, font, color: noir
        });
        cx += columns[ci].width;
      }

      y -= rowHeight;

      // Nouvelle page si on déborde
      if (y < 50 && ri < rows.length - 1) {
        // On ne gère pas le multi-page dans ce helper pour l'instant
        break;
      }
    }

    // Bordure extérieure
    const tableHeight = headerHeight + rows.length * rowHeight;
    page.drawRectangle({
      x, y, width: totalWidth, height: 0,
      borderColor: bleu, borderWidth: 1
    });

    return y;
  },

  // ============================================================
  //  HELPERS : Ouvrir / Télécharger un PDF généré
  // ============================================================

  async _openPdf(pdfBytes, title) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return win;
  },

  async ouvrirFicheBouteille(bouteilleId) {
    try {
      UI.toast('Génération fiche bouteille...', 'info');
      const bytes = await this.ficheBouteille(bouteilleId);
      await this._openPdf(bytes, 'Fiche Bouteille');
      UI.toast('Fiche bouteille générée', 'success');
    } catch (e) {
      console.error(e);
      UI.toast('Erreur : ' + e.message, 'error');
    }
  },

  async ouvrirSuiviFluides(annee, fluideCode) {
    try {
      UI.toast('Génération tableau de suivi...', 'info');
      const bytes = await this.suiviFluides(annee, fluideCode);
      await this._openPdf(bytes, 'Suivi Fluides');
      UI.toast('Tableau de suivi généré', 'success');
    } catch (e) {
      console.error(e);
      UI.toast('Erreur : ' + e.message, 'error');
    }
  },

  async ouvrirRegistrePlaintes(plaintes) {
    try {
      UI.toast('Génération registre des plaintes...', 'info');
      const bytes = await this.registrePlaintes(plaintes || []);
      await this._openPdf(bytes, 'Registre Plaintes');
      UI.toast('Registre des plaintes généré', 'success');
    } catch (e) {
      console.error(e);
      UI.toast('Erreur : ' + e.message, 'error');
    }
  },

  async telecharger(type, ...args) {
    let bytes, filename;
    switch (type) {
      case 'bouteille':
        bytes = await this.ficheBouteille(args[0]);
        filename = `Fiche_Bouteille_${args[0]}.pdf`;
        break;
      case 'suivi':
        bytes = await this.suiviFluides(args[0], args[1]);
        filename = `Suivi_Fluides_${args[0] || 'annee'}.pdf`;
        break;
      case 'plaintes':
        bytes = await this.registrePlaintes(args[0]);
        filename = 'Registre_Plaintes.pdf';
        break;
      default:
        throw new Error('Type de document inconnu : ' + type);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
};

window.DOCS = DOCS;
