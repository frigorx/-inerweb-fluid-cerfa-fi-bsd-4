/**
 * inerWeb Fluide - CERFA 15497*04 Module
 * Génération pixel-perfect du formulaire officiel
 * Conforme à l'arrêté du 29 février 2016, modifié
 */

const CERFA = {

  /**
   * Génère le HTML complet du CERFA 15497*04
   * @param {Object} data - Données du mouvement/contrôle
   * @returns {string} HTML complet prêt à imprimer
   */
  generer(data = {}) {
    const d = this._prepareData(data);
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>CERFA 15497*04 — Fiche N° ${d.ficheNum}</title>
<style>
${this._getCSS()}
</style>
</head>
<body>
<div class="cerfa-page">

  ${d.isFormation ? '<div class="watermark">FORMATION</div>' : ''}

  <!-- EN-TÊTE -->
  <div class="header">
    <div class="header-left">
      <div class="rf-logo">
        <div class="rf-text">RÉPUBLIQUE<br>FRANÇAISE</div>
        <div class="rf-devise">Liberté<br>Égalité<br>Fraternité</div>
      </div>
      <div class="ministere">Ministère chargé<br>de l'Écologie</div>
    </div>
    <div class="header-center">
      <div class="titre-principal">FICHE D'INTERVENTION</div>
      <div class="titre-desc">pour les opérations nécessitant une manipulation de fluides frigorigènes fluorés effectuées sur un équipement thermodynamique, prévue à l'article R. 543-82 du code de l'environnement et pour les contrôles d'étanchéité prévus au R. 543-79 du même code</div>
    </div>
    <div class="header-right">
      <div class="cerfa-num">N° 15497*04</div>
      <div class="fiche-num">Fiche N° : <span class="val">${d.ficheNum}</span></div>
    </div>
  </div>

  <!-- CADRES 1 & 2 côte à côte -->
  <div class="row-2col">
    <div class="cadre cadre-half">
      <div class="cadre-num">1</div>
      <div class="cadre-title">OPÉRATEUR</div>
      <div class="cadre-subtitle">(Nom, adresse et SIRET)</div>
      <div class="cadre-content">
        <div class="field-block">${d.operateur.nom || ''}<br>${d.operateur.adresse || ''}<br>SIRET : ${d.operateur.siret || '____________________'}</div>
        <div class="field-line"><span class="label">N° d'attestation de capacité :</span> <span class="val">${d.operateur.attestation || '____________________'}</span></div>
      </div>
    </div>
    <div class="cadre cadre-half">
      <div class="cadre-num">2</div>
      <div class="cadre-title">DÉTENTEUR</div>
      <div class="cadre-subtitle">(Nom, adresse et SIRET)</div>
      <div class="cadre-content">
        <div class="field-block">${d.detenteur.nom || ''}<br>${d.detenteur.adresse || ''}<br>SIRET : ${d.detenteur.siret || '____________________'}</div>
      </div>
    </div>
  </div>

  <!-- CADRE 3 — Équipement -->
  <div class="cadre">
    <div class="cadre-num">3</div>
    <div class="cadre-title">ÉQUIPEMENT CONCERNÉ</div>
    <div class="cadre-content row-fields">
      <div class="field-line flex-1"><span class="label">Identification :</span> <span class="val">${d.equipement.identification || ''}</span></div>
      <div class="field-line"><span class="label">Dénomination du fluide : R-</span><span class="val">${d.equipement.fluide || '____'}</span></div>
      <div class="field-line"><span class="label">Charge totale :</span> <span class="val">${d.equipement.charge || '____'}</span> <span class="unit">kg</span></div>
      <div class="field-line"><span class="label">Tonnage éq. CO2 :</span> <span class="val">${d.equipement.eqCO2 || '____'}</span> <span class="unit">t.éq.CO2</span></div>
    </div>
  </div>

  <!-- CADRE 4 — Nature de l'intervention -->
  <div class="cadre">
    <div class="cadre-num">4</div>
    <div class="cadre-title">NATURE DE L'INTERVENTION : cocher une ou plusieurs cases</div>
    <div class="cadre-content checkbox-grid">
      <div class="cb-col">
        <label class="cb">${this._checkbox(d.nature === 'Assemblage')} Assemblage de l'équipement</label>
        <label class="cb">${this._checkbox(d.nature === 'MiseEnService')} Mise en service de l'équipement</label>
        <label class="cb">${this._checkbox(d.nature === 'Modification')} Modification de l'équipement</label>
        <label class="cb">${this._checkbox(d.nature === 'Maintenance' || d.nature === 'Appoint' || d.nature === 'Charge')} Maintenance de l'équipement</label>
      </div>
      <div class="cb-col">
        <label class="cb">${this._checkbox(d.nature === 'ControlePeriodique')} Contrôle d'étanchéité périodique</label>
        <label class="cb">${this._checkbox(d.nature === 'ControleNonPeriodique')} Contrôle d'étanchéité non périodique</label>
        <label class="cb">${this._checkbox(d.nature === 'Demantelement' || d.nature === 'Vidange')} Démantèlement</label>
        <label class="cb">${this._checkbox(d.nature === 'Autre')} Autre (préciser) : <span class="val-inline">${d.natureAutre || ''}</span></label>
      </div>
    </div>
  </div>

  <!-- CADRE 5 — Détecteur -->
  <div class="cadre cadre-inline">
    <div class="cadre-num">5</div>
    <div class="cadre-title-inline">Détecteur manuel de fuite :</div>
    <div class="field-line"><span class="label">Identification :</span> <span class="val">${d.detecteur.identification || '____________________'}</span></div>
    <div class="field-line"><span class="label">Contrôlé le :</span> <span class="val">${d.detecteur.dateControle || '__/__/____'}</span></div>
  </div>

  <!-- CADRE 6 — Détection permanente -->
  <div class="cadre cadre-inline">
    <div class="cadre-num">6</div>
    <div class="cadre-title-inline">Présence d'un système permanent de détection de fuites :</div>
    <label class="cb-inline">${this._checkbox(d.detectionPermanente === true)} OUI</label>
    <label class="cb-inline">${this._checkbox(d.detectionPermanente === false)} NON</label>
  </div>

  <!-- CADRES 7, 8, 9 — Fréquence contrôle -->
  <div class="cadre">
    <div class="cadre-num">7</div>
    <div class="cadre-title" style="text-align:center;">FRÉQUENCE MINIMALE DU CONTRÔLE PÉRIODIQUE</div>
    <table class="tbl-seuils">
      <thead>
        <tr><th></th><th>Tranche basse</th><th>Tranche moyenne</th><th>Tranche haute</th></tr>
      </thead>
      <tbody>
        <tr>
          <td class="lbl">HCFC</td>
          <td>${this._checkbox(d.seuil === 'HCFC-bas')} 2 kg ≤ Q &lt; 30 kg</td>
          <td>${this._checkbox(d.seuil === 'HCFC-moy')} 30 kg ≤ Q &lt; 300 kg</td>
          <td>${this._checkbox(d.seuil === 'HCFC-haut')} Q ≥ 300 kg</td>
        </tr>
        <tr>
          <td class="lbl">HFC / PFC</td>
          <td>${this._checkbox(d.seuil === 'HFC-bas')} 5 t ≤ téqCO2 &lt; 50 t</td>
          <td>${this._checkbox(d.seuil === 'HFC-moy')} 50 t ≤ téqCO2 &lt; 500 t</td>
          <td>${this._checkbox(d.seuil === 'HFC-haut')} téqCO2 ≥ 500 t</td>
        </tr>
        <tr>
          <td class="lbl">HFO</td>
          <td>${this._checkbox(d.seuil === 'HFO-bas')} 1 kg ≤ Q &lt; 10 kg</td>
          <td>${this._checkbox(d.seuil === 'HFO-moy')} 10 kg ≤ Q &lt; 100 kg</td>
          <td>${this._checkbox(d.seuil === 'HFO-haut')} Q ≥ 100 kg</td>
        </tr>
      </tbody>
    </table>

    <div class="row-2col freq-row">
      <div class="freq-block">
        <span class="freq-num">8</span>
        <span class="freq-title">Équip. <strong>sans</strong> système permanent :</span>
        <label class="cb-inline">${this._checkbox(d.frequence === 12 && !d.detectionPermanente)} 12 mois</label>
        <label class="cb-inline">${this._checkbox(d.frequence === 6 && !d.detectionPermanente)} 6 mois</label>
        <label class="cb-inline">${this._checkbox(d.frequence === 3 && !d.detectionPermanente)} 3 mois</label>
      </div>
      <div class="freq-block">
        <span class="freq-num">9</span>
        <span class="freq-title">Équip. <strong>avec</strong> système permanent :</span>
        <label class="cb-inline">${this._checkbox(d.frequence === 24 && d.detectionPermanente)} 24 mois</label>
        <label class="cb-inline">${this._checkbox(d.frequence === 12 && d.detectionPermanente)} 12 mois</label>
        <label class="cb-inline">${this._checkbox(d.frequence === 6 && d.detectionPermanente)} 6 mois</label>
      </div>
    </div>
  </div>

  <!-- CADRE 10 — Fuites -->
  <div class="cadre">
    <div class="cadre-num">10</div>
    <div class="cadre-title">FUITES CONSTATÉES LORS DU CONTRÔLE D'ÉTANCHÉITÉ</div>
    <div class="cadre-content">
      <div style="margin-bottom:4px;">
        <label class="cb-inline">${this._checkbox(d.fuiteConstatee === true)} OUI</label>
        <label class="cb-inline">${this._checkbox(d.fuiteConstatee === false)} NON</label>
      </div>
      <table class="tbl-fuites">
        <thead><tr><th>N°</th><th>Localisation de la fuite</th><th>Réparation</th></tr></thead>
        <tbody>
          ${[0,1,2].map(i => {
            const f = (d.fuites || [])[i] || {};
            return `<tr><td>${i+1}</td><td>${f.localisation || ''}</td><td>${this._checkbox(f.reparee)} Réalisée ${this._checkbox(!f.reparee && f.localisation)} À faire</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- CADRE 11 — Manipulation fluide -->
  <div class="cadre">
    <div class="cadre-num">11</div>
    <div class="cadre-title">MANIPULATION DU FLUIDE FRIGORIGÈNE</div>
    <div class="row-2col">
      <div class="manip-col">
        <div class="manip-header">FLUIDE CHARGÉ</div>
        <div class="field-line"><span class="label">Quantité chargée totale (A+B+C) :</span> <span class="val-num">${d.charge.total || ''}</span> <span class="unit">kg</span></div>
        <div class="field-line sub"><span class="label">A — Dont fluide vierge :</span> <span class="val-num">${d.charge.vierge || ''}</span> <span class="unit">kg</span></div>
        <div class="field-line sub"><span class="label">Dénomination si changement :</span> <span class="val">${d.charge.changementFluide || ''}</span></div>
        <div class="field-line sub"><span class="label">B — Dont fluide recyclé :</span> <span class="val-num">${d.charge.recycle || ''}</span> <span class="unit">kg</span></div>
        <div class="field-line sub"><span class="label">C — Dont fluide régénéré :</span> <span class="val-num">${d.charge.regenere || ''}</span> <span class="unit">kg</span></div>
      </div>
      <div class="manip-col">
        <div class="manip-header">FLUIDE RÉCUPÉRÉ</div>
        <div class="field-line"><span class="label">Quantité récupérée totale (D+E) :</span> <span class="val-num">${d.recup.total || ''}</span> <span class="unit">kg</span></div>
        <div class="field-line sub"><span class="label">D — Dont fluide destiné au traitement :</span> <span class="val-num">${d.recup.traitement || ''}</span> <span class="unit">kg</span></div>
        <div class="field-line sub"><span class="label">N° BSFF (Trackdéchets) :</span> <span class="val">${d.recup.bsff || ''}</span></div>
        <div class="field-line sub"><span class="label">E — Dont fluide conservé :</span> <span class="val-num">${d.recup.conserve || ''}</span> <span class="unit">kg</span></div>
        <div class="field-line sub"><span class="label">Identification contenant(s) :</span> <span class="val">${d.recup.contenant || ''}</span></div>
      </div>
    </div>
  </div>

  <!-- CADRE 12 — ADR/RID -->
  <div class="cadre">
    <div class="cadre-num">12</div>
    <div class="cadre-title">DÉNOMINATION ADR/RID</div>
    <div class="cadre-content" style="font-size:7.5pt;">
      <div class="field-line"><strong>Rubrique Déchets : 14 06 01*</strong> — CFC, HCFC, HFC, HFO — Non-inflammables</div>
      <div class="field-line">${this._checkbox(d.adr === '1078')} UN 1078, Déchet Gaz frigorifique N.S.A., 2.2 (C/E)</div>
      <div class="field-line"><strong>Rubrique Déchets : 16 05 04*</strong> — HFC, HFO — Inflammables</div>
      <div class="field-line">${this._checkbox(d.adr === '3161')} UN 3161, Déchet Gaz liquéfié inflammable N.S.A., 2.1 (B/D)</div>
    </div>
  </div>

  <!-- CADRE 13 — Destination -->
  <div class="cadre">
    <div class="cadre-num">13</div>
    <div class="cadre-title-inline">Installation prévue de destination du fluide récupéré (Nom, SIRET, adresse) :</div>
    <div class="field-block">${d.destination || ''}</div>
  </div>

  <!-- CADRE 14 — Observations -->
  <div class="cadre">
    <div class="cadre-num">14</div>
    <div class="cadre-title-inline">Observations :</div>
    <div class="field-block obs">${d.observations || ''}</div>
  </div>

  <!-- ZONE DE SIGNATURE -->
  <div class="signature-zone">
    <div class="sig-text">Je soussigné certifie que l'opération ci-dessus a été effectuée.</div>
    <div class="row-2col">
      <div class="sig-col">
        <div class="sig-header">OPÉRATEUR</div>
        <div class="field-line"><span class="label">Nom du signataire :</span> <span class="val">${d.signature.operateurNom || ''}</span></div>
        <div class="field-line"><span class="label">Qualité :</span> <span class="val">${d.signature.operateurQualite || ''}</span></div>
        <div class="field-line"><span class="label">Date et signature :</span> <span class="val">${d.signature.date || ''}</span></div>
        <div class="sig-box"></div>
      </div>
      <div class="sig-col">
        <div class="sig-header">DÉTENTEUR</div>
        <div class="field-line"><span class="label">Nom du signataire :</span> <span class="val">${d.signature.detenteurNom || ''}</span></div>
        <div class="field-line"><span class="label">Qualité :</span> <span class="val">${d.signature.detenteurQualite || ''}</span></div>
        <div class="field-line"><span class="label">Date et signature :</span> <span class="val">${d.signature.date || ''}</span></div>
        <div class="sig-box"></div>
      </div>
    </div>
  </div>

  <!-- NOTE DE BAS DE PAGE -->
  <div class="footer-note">
    Le détenteur d'un équipement dont la charge en HCFC est supérieure à 3 kg ou dont la charge en HFC est supérieure à 5 t éq. CO2 doit conserver l'original de ce document pendant au moins 5 ans (article R. 543-82 du Code de l'environnement).
  </div>

  <div class="footer-inerweb">
    Généré par inerWeb Fluide v7.1.0 ${d.isFormation ? '— MODE FORMATION' : '— MODE OFFICIEL'} — ${new Date().toLocaleDateString('fr-FR')}
  </div>

</div>
</body>
</html>`;
  },

  /**
   * Prépare les données pour le template
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

    // Déterminer le seuil F-Gas
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

    // Fréquence
    const detPerm = machine.detectionPermanente || false;
    let frequence = 0;
    if (seuil.endsWith('-haut')) frequence = detPerm ? 6 : 3;
    else if (seuil.endsWith('-moy')) frequence = detPerm ? 12 : 6;
    else if (seuil.endsWith('-bas')) frequence = detPerm ? 24 : 12;

    // Quantités
    const qty = parseFloat(data.quantite || data.masse || 0);
    const type = data.type || '';
    const isCharge = ['Charge', 'Appoint', 'MiseEnService'].includes(type);
    const isRecup = ['Recuperation', 'Vidange'].includes(type);

    // Détecteur
    const detecteur = data.detecteur ? State.detecteurs.find(d => d.code === data.detecteur || d.id === data.detecteur) : null;

    // Client/détenteur
    const client = machine.clientId ? State.getClientById(machine.clientId) : null;

    return {
      ficheNum: data.cerfa || data.id || '—',
      isFormation,
      operateur: {
        nom: config.etablissement || '',
        adresse: config.adresse || '',
        siret: config.siret || '',
        attestation: user.attestation || (isFormation ? 'Formation' : '')
      },
      detenteur: {
        nom: client?.nom || config.etablissement || '',
        adresse: client?.adresse ? (client.adresse + (client.cp ? ' ' + client.cp : '') + (client.ville ? ' ' + client.ville : '')) : (config.adresse || ''),
        siret: client?.siret || ''
      },
      equipement: {
        identification: (machine.code || '') + ' — ' + (machine.nom || machine.designation || '') + (machine.marque ? ' (' + machine.marque + (machine.modele ? ' ' + machine.modele : '') + ')' : '') + (machine.serie ? ' S/N: ' + machine.serie : ''),
        fluide: (machine.fluide || '').replace(/^R-?/, ''),
        charge: charge || '',
        eqCO2: eqCO2
      },
      nature: type,
      natureAutre: '',
      detecteur: {
        identification: detecteur ? (detecteur.code || detecteur.id) + ' — ' + (detecteur.marque || '') + ' ' + (detecteur.modele || '') : '',
        dateControle: detecteur?.etalonnage ? UI.formatDate(detecteur.etalonnage) : ''
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
        operateurNom: user.nomComplet || '',
        operateurQualite: user.role || '',
        detenteurNom: '',
        detenteurQualite: '',
        date: new Date().toLocaleDateString('fr-FR')
      }
    };
  },

  /**
   * Checkbox HTML
   */
  _checkbox(checked) {
    return checked ? '<span class="cb-box checked">☒</span>' : '<span class="cb-box">☐</span>';
  },

  /**
   * CSS pixel-perfect pour impression A4
   */
  _getCSS() {
    return `
@page {
  size: A4 portrait;
  margin: 8mm;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 8.5pt;
  line-height: 1.25;
  color: #000;
  background: #f0f0f0;
}

.cerfa-page {
  width: 210mm;
  min-height: 295mm;
  max-height: 297mm;
  margin: 0 auto;
  padding: 8mm;
  background: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 20px rgba(0,0,0,0.15);
}

/* Filigrane FORMATION */
.watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-35deg);
  font-size: 72pt;
  font-weight: 900;
  color: rgba(139, 92, 246, 0.06);
  pointer-events: none;
  white-space: nowrap;
  z-index: 0;
  letter-spacing: 12px;
}

/* EN-TÊTE */
.header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 2px solid #000;
}

.header-left {
  flex-shrink: 0;
  width: 70px;
  text-align: center;
}

.rf-logo {
  border: 1.5px solid #000;
  padding: 3px;
  margin-bottom: 2px;
  font-size: 6pt;
  line-height: 1.1;
}

.rf-text {
  font-weight: 700;
  font-size: 6.5pt;
  letter-spacing: 0.3px;
}

.rf-devise {
  font-size: 5.5pt;
  font-style: italic;
  border-top: 0.5px solid #000;
  margin-top: 1px;
  padding-top: 1px;
}

.ministere {
  font-size: 5.5pt;
  color: #333;
}

.header-center {
  flex: 1;
  text-align: center;
}

.titre-principal {
  font-size: 14pt;
  font-weight: 700;
  letter-spacing: 1px;
}

.titre-desc {
  font-size: 6.5pt;
  line-height: 1.2;
  color: #333;
  margin-top: 2px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.header-right {
  flex-shrink: 0;
  text-align: right;
  width: 90px;
}

.cerfa-num {
  font-size: 9pt;
  font-weight: 700;
  border: 1.5px solid #000;
  padding: 3px 6px;
  display: inline-block;
  margin-bottom: 4px;
}

.fiche-num {
  font-size: 8pt;
  font-weight: 600;
}

/* CADRES */
.cadre {
  border: 1.5px solid #000;
  margin-bottom: 3px;
  padding: 3px 5px;
  position: relative;
  page-break-inside: avoid;
}

.cadre-half {
  flex: 1;
  min-width: 0;
}

.cadre-num {
  position: absolute;
  top: -1px;
  left: -1px;
  background: #000;
  color: #fff;
  font-size: 7.5pt;
  font-weight: 700;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.cadre-title {
  font-weight: 700;
  font-size: 8pt;
  text-transform: uppercase;
  margin-left: 18px;
  margin-bottom: 2px;
}

.cadre-title-inline {
  font-weight: 700;
  font-size: 8pt;
  display: inline;
  margin-left: 18px;
}

.cadre-subtitle {
  font-size: 7pt;
  color: #555;
  margin-left: 18px;
  margin-bottom: 2px;
}

.cadre-content {
  padding-left: 2px;
}

.cadre-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 4px 5px;
}

/* Champs */
.field-block {
  font-size: 8pt;
  line-height: 1.3;
  min-height: 28px;
  padding: 2px 0;
}

.field-block.obs {
  min-height: 18px;
}

.field-line {
  font-size: 8pt;
  margin-bottom: 1px;
  display: flex;
  align-items: baseline;
  gap: 3px;
  flex-wrap: wrap;
}

.field-line.sub {
  padding-left: 10px;
  font-size: 7.5pt;
}

.label {
  color: #000;
  white-space: nowrap;
}

.val, .val-inline {
  font-weight: 600;
  color: #1a1a1a;
  border-bottom: 0.5px dotted #999;
  min-width: 30px;
  padding: 0 2px;
}

.val-num {
  font-weight: 700;
  font-family: 'Courier New', monospace;
  font-size: 9pt;
  min-width: 30px;
  text-align: right;
  border-bottom: 0.5px dotted #999;
  padding: 0 3px;
}

.unit {
  font-size: 7pt;
  color: #555;
}

.flex-1 { flex: 1; }

/* Layout */
.row-2col {
  display: flex;
  gap: 4px;
}

.row-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

/* Checkboxes */
.cb-box {
  font-size: 10pt;
  line-height: 1;
  vertical-align: middle;
}

.cb-box.checked {
  font-weight: 700;
}

.checkbox-grid {
  display: flex;
  gap: 12px;
}

.cb-col {
  flex: 1;
}

.cb {
  display: block;
  font-size: 7.5pt;
  margin-bottom: 1px;
  cursor: default;
}

.cb-inline {
  font-size: 8pt;
  margin-right: 8px;
  cursor: default;
}

/* Tableaux */
.tbl-seuils {
  width: 100%;
  border-collapse: collapse;
  font-size: 7pt;
  margin: 3px 0;
}

.tbl-seuils th, .tbl-seuils td {
  border: 0.5px solid #000;
  padding: 2px 4px;
  text-align: center;
}

.tbl-seuils th {
  background: #e8e8e8;
  font-weight: 700;
}

.tbl-seuils .lbl {
  font-weight: 700;
  text-align: left;
  background: #f5f5f5;
  width: 60px;
}

.tbl-fuites {
  width: 100%;
  border-collapse: collapse;
  font-size: 7.5pt;
}

.tbl-fuites th, .tbl-fuites td {
  border: 0.5px solid #000;
  padding: 2px 4px;
}

.tbl-fuites th {
  background: #e8e8e8;
  font-weight: 700;
  text-align: left;
}

/* Fréquence (cadres 8 & 9) */
.freq-row {
  margin-top: 3px;
}

.freq-block {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  font-size: 7.5pt;
  border: 0.5px solid #000;
  padding: 2px 4px;
}

.freq-num {
  background: #000;
  color: #fff;
  font-size: 7pt;
  font-weight: 700;
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.freq-title {
  font-size: 7pt;
}

/* Manipulation (cadre 11) */
.manip-col {
  flex: 1;
  min-width: 0;
}

.manip-header {
  background: #000;
  color: #fff;
  font-weight: 700;
  font-size: 7.5pt;
  text-align: center;
  padding: 2px;
  margin-bottom: 3px;
}

/* Signature */
.signature-zone {
  border: 1.5px solid #000;
  margin-top: 3px;
  padding: 4px 6px;
}

.sig-text {
  font-size: 8pt;
  font-style: italic;
  margin-bottom: 4px;
}

.sig-col {
  flex: 1;
  border: 0.5px solid #999;
  padding: 3px 5px;
}

.sig-header {
  font-weight: 700;
  font-size: 8pt;
  text-align: center;
  margin-bottom: 3px;
  text-transform: uppercase;
}

.sig-box {
  width: 100%;
  height: 25px;
  border: 0.5px dashed #999;
  margin-top: 3px;
}

/* Footer */
.footer-note {
  font-size: 6pt;
  color: #555;
  margin-top: 3px;
  line-height: 1.2;
  font-style: italic;
}

.footer-inerweb {
  font-size: 6pt;
  color: #999;
  text-align: right;
  margin-top: 2px;
}

/* IMPRESSION */
@media print {
  body { background: white; }
  .cerfa-page {
    box-shadow: none;
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: auto;
    max-height: none;
  }
  .watermark { color: rgba(139, 92, 246, 0.04); }
  .footer-inerweb { display: none; }
}

@media screen {
  body { padding: 20px; }
}
`;
  },

  /**
   * Ouvre le CERFA dans une nouvelle fenêtre
   */
  ouvrir(data = {}) {
    const html = this.generer(data);
    const win = window.open('', '_blank', 'width=900,height=1100,scrollbars=yes');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.document.title = 'CERFA 15497*04 — ' + (data.cerfa || data.id || 'Aperçu');
    }
    return win;
  },

  /**
   * Ouvre et imprime directement
   */
  imprimer(data = {}) {
    const win = this.ouvrir(data);
    if (win) {
      setTimeout(() => win.print(), 600);
    }
  }
};

// Export global
window.CERFA = CERFA;
