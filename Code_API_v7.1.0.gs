/**
 * inerWeb Fluides API v7.0.0 — CONSOLIDATION PRODUIT
 * 
 * Sprint 5:
 * - LOT 15: Tableaux de bord avancés
 * - LOT 16: Multi-site / multi-atelier  
 * - LOT 17: Modèle utilisateur enrichi
 * - LOT 18: Durcissement réglementaire
 * - LOT 19: Moteur d'export pro
 * - LOT 20: Abstraction backend
 * 
 * @version 7.0.0
 * @date 2026-03-07
 */

// ================================================================
// SECTION: CONFIG
// ================================================================

var APP_VERSION = '7.0.0';
var APP_NAME = 'inerWeb Fluides';
var APP_BUILD_DATE = '2026-03-07';

var CACHE_ = {};

var SHEETS = {
  CONFIG: 'CONFIG',
  SITES: 'SITES',
  ATELIERS: 'ATELIERS',
  USERS: 'USERS',
  TECHNICIENS: 'TECHNICIENS',
  FLUIDES: 'FLUIDES',
  DETECTEURS: 'DETECTEURS',
  BOUTEILLES: 'BOUTEILLES',
  MACHINES: 'MACHINES',
  MOUVEMENTS: 'MOUVEMENTS',
  CONTROLES: 'CONTROLES',
  INCIDENTS: 'INCIDENTS',
  INDEX_CERFA: 'INDEX_CERFA',
  AUDIT_LOG: 'AUDIT_LOG',
  STATS_CACHE: 'STATS_CACHE'
};

var ETATS_FLUIDE = ['Neuf', 'Récupéré', 'Recyclé', 'Régénéré', 'Déchet'];
var STATUTS_MOUVEMENT = ['brouillon', 'soumis', 'valide', 'rejete', 'annule', 'archive'];
var TYPES_MOUVEMENT = ['Charge', 'Appoint', 'Recuperation', 'Vidange', 'MiseEnService'];
var METHODES_CONTROLE = ['Directe', 'Indirecte', 'Pression'];
var RESULTATS_CONTROLE = ['Conforme', 'Fuite'];
var TYPES_MACHINE = ['Monosplit', 'Multisplit', 'PAC', 'Chambre froide', 'Vitrine', 'CTA', 'Autre'];

var CATEGORIES_BOUTEILLE = {
  NEUVE: { prefixe: 'N', label: 'Neuve' },
  TRANSFERT: { prefixe: 'T', label: 'Transfert' },
  RECUP: { prefixe: 'R', label: 'Récupération' }
};

var SEUILS_CONTROLE = [
  { eqCO2Min: 0, eqCO2Max: 5, freqMois: 0, label: 'Exempt' },
  { eqCO2Min: 5, eqCO2Max: 50, freqMois: 12, label: 'Annuel' },
  { eqCO2Min: 50, eqCO2Max: 500, freqMois: 6, label: 'Semestriel' },
  { eqCO2Min: 500, eqCO2Max: Infinity, freqMois: 3, label: 'Trimestriel' }
];

var SEUILS_ATTESTATION = { ALERTE_JOURS: 60, CRITIQUE_JOURS: 30, BLOQUANT_JOURS: 0 };

var MODE_RULES = {
  FORMATION: { label: 'Formation', color: '#2196F3', impactStock: true, comptabilise: false, prefixeCerfa: 'FORM' },
  OFFICIEL: { label: 'Officiel', color: '#4CAF50', impactStock: true, comptabilise: true, prefixeCerfa: 'FI' }
};

// ================================================================
// SECTION: LOT 20 - DATASTORE ABSTRACTION
// ================================================================

var DataStore = {
  _ss: null,
  
  init: function() { this._ss = SpreadsheetApp.getActiveSpreadsheet(); return this; },
  getSpreadsheet: function() { if (!this._ss) this.init(); return this._ss; },
  
  findById: function(table, id) {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(table);
    if (!sheet || !id || sheet.getLastRow() < 2) return { ok: false, error: 'Non trouvé' };
    
    var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(id)) {
        return { ok: true, row: i + 2, data: sheet.getRange(i + 2, 1, 1, sheet.getLastColumn()).getValues()[0] };
      }
    }
    return { ok: false, error: 'ID non trouvé: ' + id };
  },
  
  findAll: function(table, filters) {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(table);
    if (!sheet || sheet.getLastRow() < 2) return [];
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    if (filters && filters.col !== undefined && filters.val !== undefined) {
      data = data.filter(function(row) { return row[filters.col] === filters.val; });
    }
    return data;
  },
  
  insert: function(table, rowData) {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(table);
    if (!sheet) return { ok: false, error: 'Table introuvable' };
    var nextRow = Math.max(2, sheet.getLastRow() + 1);
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    return { ok: true, row: nextRow };
  },
  
  update: function(table, row, colStart, values) {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(table);
    if (!sheet) return { ok: false };
    sheet.getRange(row, colStart, 1, values.length).setValues([values]);
    return { ok: true };
  },
  
  updateCell: function(table, row, col, value) {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(table);
    if (sheet) sheet.getRange(row, col).setValue(value);
    return { ok: !!sheet };
  },
  
  getConfig: function(key) {
    var data = this.findAll(SHEETS.CONFIG);
    for (var i = 0; i < data.length; i++) { if (data[i][0] === key) return data[i][1]; }
    return null;
  },
  
  setConfig: function(key, value) {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(SHEETS.CONFIG);
    if (!sheet) return;
    var data = sheet.getRange(1, 1, sheet.getLastRow(), 2).getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === key) { sheet.getRange(i + 1, 2).setValue(value); return; }
    }
    sheet.appendRow([key, value]);
  },
  
  generateId: function(prefix) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      var key = 'compteur_' + prefix.toLowerCase();
      var compteur = parseInt(this.getConfig(key)) || 0;
      compteur++;
      this.setConfig(key, compteur);
      return prefix + '-' + new Date().getFullYear() + '-' + String(compteur).padStart(4, '0');
    } finally { lock.releaseLock(); }
  }
};

// ================================================================
// SECTION: UTILS
// ================================================================

function sanitize_(v, max) { return v == null ? '' : String(v).trim().replace(/[<>\"\'\\]/g, '').substring(0, max || 500); }
function validateNumber_(v, min, max) {
  var n = parseFloat(v); if (isNaN(n)) return { ok: false, error: 'Nombre invalide' };
  if (min !== undefined && n < min) return { ok: false, error: 'Min: ' + min };
  if (max !== undefined && n > max) return { ok: false, error: 'Max: ' + max };
  return { ok: true, value: n };
}
function validateEnum_(v, allowed) {
  var s = sanitize_(v, 100);
  return allowed.indexOf(s) !== -1 ? { ok: true, value: s } : { ok: false, error: 'Valeur invalide' };
}
function formatDate_(d) { if (!d) return ''; var dt = d instanceof Date ? d : new Date(d); return isNaN(dt) ? '' : Utilities.formatDate(dt, 'Europe/Paris', 'dd/MM/yyyy'); }
function formatDateTime_(d) { if (!d) return ''; var dt = d instanceof Date ? d : new Date(d); return isNaN(dt) ? '' : Utilities.formatDate(dt, 'Europe/Paris', 'dd/MM/yyyy HH:mm'); }
function formatDateISO_(d) { if (!d) return ''; var dt = d instanceof Date ? d : new Date(d); return isNaN(dt) ? '' : Utilities.formatDate(dt, 'Europe/Paris', 'yyyyMMdd'); }

function getPRGFluide_(codeFluide) {
  if (!CACHE_.fluides) {
    CACHE_.fluides = {};
    DataStore.findAll(SHEETS.FLUIDES).forEach(function(r) { if (r[0]) CACHE_.fluides[r[0]] = parseFloat(r[2]) || 0; });
  }
  return CACHE_.fluides[codeFluide] || 0;
}

function calculerEqCO2_(chargeKg, prg) { return ((parseFloat(chargeKg) || 0) * (parseFloat(prg) || 0)) / 1000; }
function calculerFrequenceControle_(eqCO2, detectionFixe) {
  var eq = parseFloat(eqCO2) || 0;
  for (var i = 0; i < SEUILS_CONTROLE.length; i++) {
    if (eq >= SEUILS_CONTROLE[i].eqCO2Min && eq < SEUILS_CONTROLE[i].eqCO2Max) {
      var freq = SEUILS_CONTROLE[i].freqMois;
      return detectionFixe && freq > 0 ? freq * 2 : freq;
    }
  }
  return 0;
}
function calculerProchainControle_(dernierControle, freqMois) {
  if (!dernierControle || !freqMois) return null;
  var d = new Date(dernierControle); d.setMonth(d.getMonth() + freqMois); return d;
}
function genererHash_(data) {
  var str = JSON.stringify(data) + new Date().toISOString();
  var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  return hash.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('').substring(0, 16);
}

function jsonResponse_(result) { return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON); }
function successResponse_(data, meta) { return { success: true, ok: true, data: data, error: null, meta: Object.assign({ version: APP_VERSION, timestamp: new Date().toISOString() }, meta || {}) }; }
function errorResponse_(msg, code) { return { success: false, ok: false, data: null, error: msg, code: code || 'ERROR', meta: { version: APP_VERSION, timestamp: new Date().toISOString() } }; }

// ================================================================
// SECTION: AUDIT
// ================================================================

function logAudit_(categorie, action, objet, ancienne, nouvelle, resultat, details) {
  try {
    var user = Session.getActiveUser().getEmail() || 'API';
    var role = getUserRole_(user);
    DataStore.insert(SHEETS.AUDIT_LOG, [new Date(), user, role, categorie, action, objet, 
      ancienne ? JSON.stringify(ancienne) : '', nouvelle ? JSON.stringify(nouvelle) : '', 
      resultat, details ? JSON.stringify(details) : '']);
  } catch(e) { Logger.log('Audit error: ' + e.message); }
}

// ================================================================
// SECTION: AUTH (LOT 17/18)
// ================================================================

var API_LEVELS = { 'READ': 0, 'WRITE': 1, 'ADMIN': 2 };
var ROLES = { ELEVE: 'ELEVE', ENSEIGNANT: 'ENSEIGNANT', REFERENT: 'REFERENT', ADMIN: 'ADMIN' };

var ROLE_PERMISSIONS = {
  'voirParc': ['ELEVE', 'ENSEIGNANT', 'REFERENT', 'ADMIN'],
  'voirHistorique': ['ENSEIGNANT', 'REFERENT', 'ADMIN'],
  'voirStats': ['ENSEIGNANT', 'REFERENT', 'ADMIN'],
  'creerMouvement': ['ELEVE', 'ENSEIGNANT', 'REFERENT', 'ADMIN'],
  'validerMouvement': ['ENSEIGNANT', 'REFERENT', 'ADMIN'],
  'annulerMouvement': ['ENSEIGNANT', 'REFERENT', 'ADMIN'],
  'creerControle': ['ELEVE', 'ENSEIGNANT', 'REFERENT', 'ADMIN'],
  'creerMachine': ['REFERENT', 'ADMIN'],
  'creerBouteille': ['REFERENT', 'ADMIN'],
  'genererCerfa': ['ENSEIGNANT', 'REFERENT', 'ADMIN'],
  'voirAuditLog': ['ADMIN'],
  'modifierConfig': ['ADMIN'],
  'gererSites': ['ADMIN'],
  'gererUsers': ['ADMIN'],
  'modeOfficiel': ['ENSEIGNANT', 'REFERENT', 'ADMIN'],
  'exportPro': ['ENSEIGNANT', 'REFERENT', 'ADMIN']
};

var ACTION_LEVELS = {
  'ping': 'PUBLIC', 'getConfig': 'READ', 'getMachines': 'READ', 'getBouteilles': 'READ',
  'getFluides': 'READ', 'getDetecteurs': 'READ', 'getMouvements': 'READ', 'getControles': 'READ',
  'getAlertes': 'READ', 'getDashboard': 'READ', 'getCerfa': 'READ', 'getUserRole': 'READ',
  'login': 'PUBLIC', 'getSites': 'READ', 'getAteliers': 'READ',
  'getStatsAvancees': 'READ', 'getTendances': 'READ',
  'getClients': 'READ', 'createClient': 'WRITE', 'createDetecteur': 'WRITE',
  'getTracabilite': 'READ', 'getBilanAnnuel': 'READ', 'previewCerfa': 'READ', 'initFluides': 'ADMIN',
  'getTrackdechetsStatus': 'READ', 'configTrackdechets': 'ADMIN', 'listBsffs': 'WRITE', 'creerBsff': 'WRITE',
  'genererCerfaPrecharge': 'WRITE',
  'getTechniciens': 'WRITE', 'getUsers': 'WRITE', 'getAuditLog': 'ADMIN', 'getAuditStats': 'ADMIN',
  'exportRegistreFluides': 'READ', 'exportHistoriqueMachine': 'READ', 'exportHistoriqueBouteille': 'READ',
  'exportControlesAVenir': 'READ', 'exportBilanAnnuel': 'WRITE', 'exportActiviteEleve': 'WRITE',
  'exportSyntheseAtelier': 'WRITE', 'exportValidationsEnseignant': 'WRITE', 'exportPro': 'WRITE',
  'createMouvement': 'WRITE', 'createControle': 'WRITE', 'createMachine': 'WRITE', 'createBouteille': 'WRITE',
  'validerMouvement': 'WRITE', 'annulerMouvement': 'WRITE', 'genererCerfa': 'WRITE', 'recalculerTout': 'WRITE',
  'createSite': 'ADMIN', 'createAtelier': 'ADMIN', 'createUser': 'ADMIN', 'saveConfig': 'ADMIN'
};

var HARDCODED_KEYS_ = {
  READ: '577a8ad29b1449448101f8ab07be49dc',
  WRITE: 'c3ddb47b3e7b4ae7b4e65337f90db458',
  ADMIN: '0465ceed0aae4dd8bad9a625c12aeacf'
};

function checkAuth_(apiKey, requiredLevel) {
  if (requiredLevel === 'PUBLIC') return { ok: true, level: 'PUBLIC' };
  if (!apiKey) return { ok: false, error: 'Clé API manquante' };
  var lvl = null;
  if (apiKey === HARDCODED_KEYS_.ADMIN) lvl = 'ADMIN';
  else if (apiKey === HARDCODED_KEYS_.WRITE) lvl = 'WRITE';
  else if (apiKey === HARDCODED_KEYS_.READ) lvl = 'READ';
  else {
    var props = PropertiesService.getScriptProperties();
    if (apiKey === props.getProperty('API_KEY_ADMIN')) lvl = 'ADMIN';
    else if (apiKey === props.getProperty('API_KEY_WRITE')) lvl = 'WRITE';
    else if (apiKey === props.getProperty('API_KEY_READ')) lvl = 'READ';
  }
  if (!lvl) return { ok: false, error: 'Clé API invalide' };
  return API_LEVELS[lvl] >= API_LEVELS[requiredLevel] ? { ok: true, level: lvl } : { ok: false, error: 'Niveau insuffisant' };
}

function apiLogin_(data) {
  var identifiant = sanitize_(data.identifiant, 100);
  if (!identifiant) return errorResponse_('Identifiant obligatoire', 'LOGIN_REQUIRED');
  
  var userData = findUser_(identifiant);
  if (!userData.ok) {
    logAudit_('AUTH', 'loginEchec', identifiant, null, null, 'blocked');
    return errorResponse_('Identifiant non reconnu', 'USER_NOT_FOUND');
  }
  
  var user = userData.user;
  var attStatus = verifierAttestation_(user.validiteAttestation);
  
  var siteInfo = null;
  if (user.siteId) {
    var siteData = DataStore.findById(SHEETS.SITES, user.siteId);
    if (siteData.ok) siteInfo = { id: siteData.data[0], nom: siteData.data[1] };
  }
  
  logAudit_('AUTH', 'login', user.id, null, { role: user.role }, 'success');

  // Déterminer la clé API à renvoyer selon le rôle
  var roleApiKey = '';
  if (user.role === 'ADMIN') {
    roleApiKey = HARDCODED_KEYS_.ADMIN;
  } else if (user.role === 'ENSEIGNANT' || user.role === 'REFERENT') {
    roleApiKey = HARDCODED_KEYS_.WRITE;
  } else {
    roleApiKey = HARDCODED_KEYS_.READ;
  }

  return successResponse_({
    id: user.id, nom: user.nom, prenom: user.prenom, nomComplet: user.prenom + ' ' + user.nom,
    email: user.email, role: user.role, site: siteInfo, atelierId: user.atelierId,
    attestation: user.attestation, attestationValide: attStatus.valide,
    attestationStatus: attStatus.status, alerteAttestation: attStatus.message,
    permissions: getPermissionsForRole_(user.role),
    canUseOfficiel: hasPermission_(user.role, 'modeOfficiel'),
    blocageOfficiel: !attStatus.valide,
    apiKey: roleApiKey
  });
}

function findUser_(identifiant) {
  var tables = [SHEETS.USERS, SHEETS.TECHNICIENS];
  for (var t = 0; t < tables.length; t++) {
    var data = DataStore.findAll(tables[t]);
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var id = row[0], nom = row[1], prenom = row[2], email = row[10] || row[9];
      var actif = row[9] !== false && row[8] !== false;
      var nomComplet = (prenom + ' ' + nom).toLowerCase();
      if (actif && (id === identifiant || email === identifiant || nomComplet === identifiant.toLowerCase())) {
        return { ok: true, user: { id: id, nom: nom, prenom: prenom, email: email, role: normaliserRole_(row[3]),
          attestation: row[4], validiteAttestation: row[6], siteId: row[11] || null, atelierId: row[12] || null } };
      }
    }
  }
  return { ok: false };
}

function verifierAttestation_(dateValidite) {
  if (!dateValidite) return { valide: true, status: 'INCONNU', message: 'Validité non renseignée' };
  var diff = Math.floor((new Date(dateValidite) - new Date()) / 86400000);
  if (diff < SEUILS_ATTESTATION.BLOQUANT_JOURS) return { valide: false, status: 'EXPIREE', message: 'Attestation expirée - Mode OFFICIEL bloqué' };
  if (diff < SEUILS_ATTESTATION.CRITIQUE_JOURS) return { valide: true, status: 'CRITIQUE', message: '⚠️ Expire dans ' + diff + 'j - Urgent' };
  if (diff < SEUILS_ATTESTATION.ALERTE_JOURS) return { valide: true, status: 'ALERTE', message: 'Expire dans ' + diff + 'j' };
  return { valide: true, status: 'OK', message: null };
}

function normaliserRole_(r) {
  var role = String(r || '').toUpperCase().trim();
  if (role === 'ADMIN' || role === 'ADMINISTRATEUR') return ROLES.ADMIN;
  if (role === 'REFERENT' || role === 'CHEF ATELIER') return ROLES.REFERENT;
  if (role === 'ENSEIGNANT' || role === 'PROFESSEUR') return ROLES.ENSEIGNANT;
  return ROLES.ELEVE;
}

function getUserRole_(userId) { var u = findUser_(userId); return u.ok ? u.user.role : ROLES.ELEVE; }
function hasPermission_(role, action) { var a = ROLE_PERMISSIONS[action]; return a && a.indexOf(role) !== -1; }
function getPermissionsForRole_(role) { var p = []; for (var a in ROLE_PERMISSIONS) { if (hasPermission_(role, a)) p.push(a); } return p; }

function genererClesAPI() {
  var props = PropertiesService.getScriptProperties();
  var g = function() { return Utilities.getUuid().replace(/-/g, '').substring(0, 32); };
  props.setProperty('API_KEY_READ', g());
  props.setProperty('API_KEY_WRITE', g());
  props.setProperty('API_KEY_ADMIN', g());
  SpreadsheetApp.getUi().alert('🔑 Clés API générées',
    'READ: ' + props.getProperty('API_KEY_READ') + '\n\nWRITE: ' + props.getProperty('API_KEY_WRITE') + '\n\nADMIN: ' + props.getProperty('API_KEY_ADMIN'),
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function setClesAPI_temp() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('API_KEY_READ', '577a8ad29b1449448101f8ab07be49dc');
  props.setProperty('API_KEY_WRITE', 'c3ddb47b3e7b4ae7b4e65337f90db458');
  props.setProperty('API_KEY_ADMIN', '0465ceed0aae4dd8bad9a625c12aeacf');
  return 'OK';
}

// ================================================================
// SECTION: LOT 15 - STATS AVANCÉES
// ================================================================

function apiGetStatsAvancees_(params) {
  var dateDebut = params.dateDebut ? new Date(params.dateDebut) : new Date(Date.now() - 365 * 86400000);
  var dateFin = params.dateFin ? new Date(params.dateFin) : new Date();
  var siteId = params.siteId || null;
  
  var mouvements = DataStore.findAll(SHEETS.MOUVEMENTS);
  var controles = DataStore.findAll(SHEETS.CONTROLES);
  var machines = DataStore.findAll(SHEETS.MACHINES);
  
  var stats = {
    periode: { debut: formatDate_(dateDebut), fin: formatDate_(dateFin) },
    mouvements: { total: 0, charges: 0, recuperations: 0, parType: {}, parFluide: {}, parMois: {} },
    controles: { total: 0, conformes: 0, fuites: 0, tauxConformite: 0 },
    parc: { machines: machines.length, eqCO2Total: 0, parType: {}, parFluide: {} },
    operateurs: {},
    tendances: { chargesMensuelles: [], recupMensuelles: [] }
  };
  
  // Mouvements
  mouvements.forEach(function(row) {
    if (!row[0]) return;
    var date = new Date(row[1]);
    if (date < dateDebut || date > dateFin) return;
    if (row[23] !== 'valide') return;
    
    var type = row[2], fluide = row[5], masse = parseFloat(row[7]) || 0;
    var mois = Utilities.formatDate(date, 'Europe/Paris', 'yyyy-MM');
    
    stats.mouvements.total++;
    stats.mouvements.parType[type] = (stats.mouvements.parType[type] || 0) + 1;
    stats.mouvements.parFluide[fluide] = (stats.mouvements.parFluide[fluide] || 0) + masse;
    stats.mouvements.parMois[mois] = (stats.mouvements.parMois[mois] || 0) + 1;
    
    if (type === 'Charge' || type === 'Appoint') stats.mouvements.charges += masse;
    else stats.mouvements.recuperations += masse;
    
    var op = row[11] || 'Inconnu';
    if (!stats.operateurs[op]) stats.operateurs[op] = { mouvements: 0, controles: 0, valides: 0 };
    stats.operateurs[op].mouvements++;
    stats.operateurs[op].valides++;
  });
  
  // Contrôles
  controles.forEach(function(row) {
    if (!row[0]) return;
    var date = new Date(row[1]);
    if (date < dateDebut || date > dateFin) return;
    
    stats.controles.total++;
    if (row[7] === 'Conforme') stats.controles.conformes++;
    else if (row[7] === 'Fuite') stats.controles.fuites++;
    
    var op = row[9] || 'Inconnu';
    if (!stats.operateurs[op]) stats.operateurs[op] = { mouvements: 0, controles: 0, valides: 0 };
    stats.operateurs[op].controles++;
  });
  
  stats.controles.tauxConformite = stats.controles.total > 0 
    ? Math.round(stats.controles.conformes / stats.controles.total * 100) : 100;
  
  // Parc
  machines.forEach(function(row) {
    if (!row[0] || row[14] === 'Hors service') return;
    var type = row[2], fluide = row[6], eqCO2 = parseFloat(row[9]) || 0;
    
    stats.parc.eqCO2Total += eqCO2;
    stats.parc.parType[type] = (stats.parc.parType[type] || 0) + 1;
    stats.parc.parFluide[fluide] = (stats.parc.parFluide[fluide] || 0) + 1;
  });
  
  stats.parc.eqCO2Total = Math.round(stats.parc.eqCO2Total * 100) / 100;
  
  // Tendances mensuelles (12 derniers mois)
  var moisList = [];
  for (var i = 11; i >= 0; i--) {
    var d = new Date();
    d.setMonth(d.getMonth() - i);
    moisList.push(Utilities.formatDate(d, 'Europe/Paris', 'yyyy-MM'));
  }
  
  stats.tendances.mois = moisList;
  stats.tendances.chargesMensuelles = moisList.map(function() { return 0; });
  stats.tendances.recupMensuelles = moisList.map(function() { return 0; });
  
  mouvements.forEach(function(row) {
    if (!row[0] || row[23] !== 'valide') return;
    var mois = Utilities.formatDate(new Date(row[1]), 'Europe/Paris', 'yyyy-MM');
    var idx = moisList.indexOf(mois);
    if (idx >= 0) {
      var masse = parseFloat(row[7]) || 0;
      if (row[2] === 'Charge' || row[2] === 'Appoint') stats.tendances.chargesMensuelles[idx] += masse;
      else stats.tendances.recupMensuelles[idx] += masse;
    }
  });
  
  return successResponse_(stats);
}

// LOT 18: Alertes réglementaires
function apiGetAlertesReglementaires_() {
  var alertes = { attestations: [], controles: [], fuites: [], stock: [] };
  var now = new Date();
  
  // Attestations
  [SHEETS.USERS, SHEETS.TECHNICIENS].forEach(function(table) {
    DataStore.findAll(table).forEach(function(row) {
      if (!row[0] || row[9] === false) return;
      var validite = row[6];
      if (validite) {
        var diff = Math.floor((new Date(validite) - now) / 86400000);
        if (diff < 0) alertes.attestations.push({ type: 'danger', user: row[0], nom: row[2] + ' ' + row[1], message: 'Attestation expirée', jours: diff });
        else if (diff < 30) alertes.attestations.push({ type: 'warning', user: row[0], nom: row[2] + ' ' + row[1], message: 'Expire dans ' + diff + 'j', jours: diff });
        else if (diff < 60) alertes.attestations.push({ type: 'info', user: row[0], nom: row[2] + ' ' + row[1], message: 'Expire dans ' + diff + 'j', jours: diff });
      }
    });
  });
  
  // Contrôles
  DataStore.findAll(SHEETS.MACHINES).forEach(function(row) {
    if (!row[0] || row[14] === 'Hors service') return;
    var prochCtrl = row[12];
    if (prochCtrl) {
      var diff = Math.floor((new Date(prochCtrl) - now) / 86400000);
      if (diff < 0) alertes.controles.push({ type: 'danger', machine: row[0], nom: row[1], message: 'Contrôle en retard (' + Math.abs(diff) + 'j)', jours: diff, eqCO2: row[9] });
      else if (diff <= 7) alertes.controles.push({ type: 'warning', machine: row[0], nom: row[1], message: 'Contrôle dans ' + diff + 'j', jours: diff, eqCO2: row[9] });
      else if (diff <= 30) alertes.controles.push({ type: 'info', machine: row[0], nom: row[1], message: 'Contrôle dans ' + diff + 'j', jours: diff, eqCO2: row[9] });
    }
  });
  
  // Fuites non résolues
  DataStore.findAll(SHEETS.CONTROLES).forEach(function(row) {
    if (row[7] === 'Fuite' && row[16] !== 'resolu') {
      alertes.fuites.push({ type: 'danger', controle: row[0], machine: row[2], date: formatDate_(row[1]), message: 'Fuite non résolue' });
    }
  });
  
  // Stock bas
  DataStore.findAll(SHEETS.BOUTEILLES).forEach(function(row) {
    if (!row[0] || row[12] === 'Vide') return;
    var masse = parseFloat(row[7]) || 0;
    if (masse <= 0.5) alertes.stock.push({ type: 'info', bouteille: row[0], fluide: row[2], masse: masse, message: 'Stock faible' });
  });
  
  return successResponse_(alertes, { 
    counts: { attestations: alertes.attestations.length, controles: alertes.controles.length, 
              fuites: alertes.fuites.length, stock: alertes.stock.length }
  });
}

// ================================================================
// SECTION: LOT 16 - MULTI-SITE
// ================================================================

function apiGetSites_() {
  var sites = [];
  DataStore.findAll(SHEETS.SITES).forEach(function(row) {
    if (row[0]) sites.push({ id: row[0], nom: row[1], adresse: row[2], siret: row[3], responsable: row[4], actif: row[5] !== false });
  });
  return successResponse_(sites);
}

function apiGetAteliers_(params) {
  var siteId = params.siteId || null;
  var ateliers = [];
  DataStore.findAll(SHEETS.ATELIERS).forEach(function(row) {
    if (!row[0]) return;
    if (siteId && row[2] !== siteId) return;
    ateliers.push({ id: row[0], nom: row[1], siteId: row[2], responsable: row[3], actif: row[4] !== false });
  });
  return successResponse_(ateliers);
}

function apiCreateSite_(data) {
  var nom = sanitize_(data.nom, 100);
  if (!nom) return errorResponse_('Nom obligatoire');
  
  var id = DataStore.generateId('SITE');
  DataStore.insert(SHEETS.SITES, [id, nom, sanitize_(data.adresse, 200), sanitize_(data.siret, 20), sanitize_(data.responsable, 100), true]);
  
  logAudit_('SITE', 'creer', id, null, { nom: nom }, 'success');
  return successResponse_({ id: id });
}

function apiCreateAtelier_(data) {
  var nom = sanitize_(data.nom, 100);
  if (!nom) return errorResponse_('Nom obligatoire');
  
  var id = DataStore.generateId('ATELIER');
  DataStore.insert(SHEETS.ATELIERS, [id, nom, data.siteId || '', sanitize_(data.responsable, 100), true]);
  
  logAudit_('ATELIER', 'creer', id, null, { nom: nom, site: data.siteId }, 'success');
  return successResponse_({ id: id });
}

// ================================================================
// SECTION: API GET
// ================================================================

function apiGetConfig_() {
  var config = { version: APP_VERSION, buildDate: APP_BUILD_DATE, roles: ROLES, modeRules: MODE_RULES, seuilsControle: SEUILS_CONTROLE, seuilsAttestation: SEUILS_ATTESTATION };
  DataStore.findAll(SHEETS.CONFIG).forEach(function(row) { if (row[0] && !String(row[0]).startsWith('compteur_')) config[row[0]] = row[1]; });
  return successResponse_(config);
}

function apiGetMachines_(params) {
  var siteId = params && params.siteId;
  var machines = [];
  DataStore.findAll(SHEETS.MACHINES).forEach(function(row) {
    if (!row[0]) return;
    if (siteId && row[15] !== siteId) return;
    var charge = parseFloat(row[8]) || parseFloat(row[7]) || 0;
    machines.push({
      code: row[0], nom: row[1], type: row[2], marque: row[3], modele: row[4], serie: row[5],
      fluide: row[6], chargeNom: row[7], chargeAct: row[8] || row[7],
      eqCO2: row[9] || calculerEqCO2_(charge, getPRGFluide_(row[6])),
      localisation: row[10], miseEnService: formatDate_(row[11]),
      prochControle: formatDate_(row[12]), freqCtrl: row[13], statut: row[14] || 'En service',
      siteId: row[15] || null
    });
  });
  return successResponse_(machines);
}

function apiGetBouteilles_(params) {
  var siteId = params && params.siteId;
  var bouteilles = [];
  DataStore.findAll(SHEETS.BOUTEILLES).forEach(function(row) {
    if (!row[0]) return;
    if (siteId && row[13] !== siteId) return;
    bouteilles.push({
      code: row[0], categorie: row[1], fluide: row[2], etatFluide: row[3], marque: row[4],
      tare: row[5], contenance: row[6], masseFluide: row[7], masseTotal: row[8],
      dateEntree: formatDate_(row[9]), fournisseur: row[10], lot: row[11], statut: row[12] || 'En stock',
      siteId: row[13] || null
    });
  });
  return successResponse_(bouteilles);
}

function apiGetTechniciens_() {
  var techniciens = [];
  [SHEETS.USERS, SHEETS.TECHNICIENS].forEach(function(table) {
    DataStore.findAll(table).forEach(function(row) {
      if (!row[0]) return;
      var attStatus = verifierAttestation_(row[6]);
      techniciens.push({
        id: row[0], nom: row[1], prenom: row[2], role: normaliserRole_(row[3]),
        attestation: row[4], validiteAttestation: formatDate_(row[6]),
        attestationStatus: attStatus.status, attestationValide: attStatus.valide,
        actif: row[9] !== false, email: row[10], siteId: row[11] || null
      });
    });
  });
  return successResponse_(techniciens);
}

function apiGetFluides_() {
  var fluides = [];
  DataStore.findAll(SHEETS.FLUIDES).forEach(function(row) {
    if (row[0]) fluides.push({ code: row[0], nom: row[1], prg: row[2], famille: row[3], securite: row[4], obsolete: row[5] === true });
  });
  return successResponse_(fluides);
}

function apiGetDetecteurs_() {
  var detecteurs = [];
  DataStore.findAll(SHEETS.DETECTEURS).forEach(function(row) {
    if (row[0]) detecteurs.push({ code: row[0], marque: row[1], modele: row[2], dateEtalonnage: formatDate_(row[3]), prochainEtalonnage: formatDate_(row[4]), statut: row[5] || 'Actif' });
  });
  return successResponse_(detecteurs);
}

function apiGetMouvements_(limit, params) {
  var maxRows = Math.min(parseInt(limit) || 50, 200);
  var siteId = params && params.siteId;
  var data = DataStore.findAll(SHEETS.MOUVEMENTS);
  var mouvements = [];
  
  for (var i = data.length - 1; i >= 0 && mouvements.length < maxRows; i--) {
    var row = data[i];
    if (!row[0]) continue;
    if (siteId && row[25] !== siteId) continue;
    mouvements.push({
      id: row[0], date: formatDateTime_(row[1]), type: row[2], machine: row[3], bouteille: row[4],
      fluide: row[5], etatFluide: row[6], masse: row[7], operateur: row[11], validateur: row[12],
      dateValidation: formatDateTime_(row[13]), mode: row[14], statut: row[23] || 'soumis',
      comptabilise: row[14] === 'OFFICIEL' && row[23] === 'valide'
    });
  }
  return successResponse_(mouvements, { count: mouvements.length });
}

function apiGetControles_(limit, params) {
  var maxRows = Math.min(parseInt(limit) || 50, 200);
  var siteId = params && params.siteId;
  var data = DataStore.findAll(SHEETS.CONTROLES);
  var controles = [];
  
  for (var i = data.length - 1; i >= 0 && controles.length < maxRows; i--) {
    var row = data[i];
    if (!row[0]) continue;
    if (siteId && row[17] !== siteId) continue;
    controles.push({
      id: row[0], date: formatDateTime_(row[1]), machine: row[2], fluide: row[3], charge: row[4],
      eqCO2: row[5], methode: row[6], resultat: row[7], operateur: row[9], mode: row[11],
      prochainControle: formatDate_(row[12]), statut: row[16] || 'valide'
    });
  }
  return successResponse_(controles, { count: controles.length });
}

function apiGetAlertes_() {
  var alertes = [];
  var now = new Date();
  
  DataStore.findAll(SHEETS.MACHINES).forEach(function(row) {
    if (!row[0] || !row[12] || row[14] === 'Hors service') return;
    var diff = Math.floor((new Date(row[12]) - now) / 86400000);
    if (diff < 0) alertes.push({ type: 'danger', categorie: 'controle', machine: row[0], message: 'Contrôle en retard (' + Math.abs(diff) + 'j)' });
    else if (diff <= 30) alertes.push({ type: 'warning', categorie: 'controle', machine: row[0], message: 'Contrôle dans ' + diff + 'j' });
  });
  
  DataStore.findAll(SHEETS.BOUTEILLES).forEach(function(row) {
    if (row[0] && (parseFloat(row[7]) || 0) <= 0.1) alertes.push({ type: 'info', categorie: 'stock', bouteille: row[0], message: 'Bouteille vide' });
  });
  
  return successResponse_(alertes, { count: alertes.length });
}

function apiGetDashboard_(params) {
  var machines = apiGetMachines_(params).data || [];
  var bouteilles = apiGetBouteilles_(params).data || [];
  var alertes = apiGetAlertes_().data || [];
  var alertesRegl = apiGetAlertesReglementaires_().data || {};
  
  var totalEqCO2 = 0;
  machines.forEach(function(m) { totalEqCO2 += parseFloat(m.eqCO2) || 0; });
  
  var stockFluide = {};
  bouteilles.forEach(function(b) { stockFluide[b.fluide] = (stockFluide[b.fluide] || 0) + (parseFloat(b.masseFluide) || 0); });
  
  return successResponse_({
    version: APP_VERSION, buildDate: APP_BUILD_DATE, modeRules: MODE_RULES,
    machines: { total: machines.length, enService: machines.filter(function(m) { return m.statut === 'En service'; }).length },
    bouteilles: { total: bouteilles.length, enStock: bouteilles.filter(function(b) { return b.statut === 'En stock'; }).length },
    eqCO2Total: Math.round(totalEqCO2 * 100) / 100, stockFluide: stockFluide,
    alertes: { danger: alertes.filter(function(a) { return a.type === 'danger'; }).length, 
               warning: alertes.filter(function(a) { return a.type === 'warning'; }).length },
    alertesReglementaires: alertesRegl
  });
}

function apiGetAuditLog_(params) {
  var limit = Math.min(parseInt(params.limit) || 100, 500);
  var categorie = params.categorie || null;
  var data = DataStore.findAll(SHEETS.AUDIT_LOG);
  var logs = [];
  
  for (var i = data.length - 1; i >= 0 && logs.length < limit; i--) {
    if (!data[i][0]) continue;
    if (categorie && data[i][3] !== categorie) continue;
    logs.push({ timestamp: formatDateTime_(data[i][0]), utilisateur: data[i][1], role: data[i][2],
      categorie: data[i][3], action: data[i][4], objet: data[i][5], resultat: data[i][8] });
  }
  return successResponse_(logs, { count: logs.length });
}

function apiGetAuditStats_(params) {
  var dateDebut = params.dateDebut ? new Date(params.dateDebut) : new Date(Date.now() - 30 * 86400000);
  var dateFin = params.dateFin ? new Date(params.dateFin) : new Date();
  var data = DataStore.findAll(SHEETS.AUDIT_LOG);
  var stats = { parCategorie: {}, parAction: {}, parResultat: {}, parUtilisateur: {}, total: 0 };
  
  data.forEach(function(row) {
    if (!row[0]) return;
    var date = new Date(row[0]);
    if (date < dateDebut || date > dateFin) return;
    stats.parCategorie[row[3] || 'AUTRE'] = (stats.parCategorie[row[3] || 'AUTRE'] || 0) + 1;
    stats.parAction[row[4] || 'autre'] = (stats.parAction[row[4] || 'autre'] || 0) + 1;
    stats.parResultat[row[8] || 'unknown'] = (stats.parResultat[row[8] || 'unknown'] || 0) + 1;
    stats.parUtilisateur[row[1] || 'anonymous'] = (stats.parUtilisateur[row[1] || 'anonymous'] || 0) + 1;
    stats.total++;
  });
  return successResponse_(stats);
}


// ================================================================
// SECTION: MOUVEMENTS (LOT 18 - Validation renforcée)
// ================================================================

function apiCreateMouvement_(data) {
  var typeOk = validateEnum_(data.type, TYPES_MOUVEMENT);
  if (!typeOk.ok) return errorResponse_('Type: ' + typeOk.error);
  
  var machOk = DataStore.findById(SHEETS.MACHINES, data.machine);
  if (!machOk.ok) return errorResponse_('Machine: ' + machOk.error);
  
  var boutOk = DataStore.findById(SHEETS.BOUTEILLES, data.bouteille);
  if (!boutOk.ok) return errorResponse_('Bouteille: ' + boutOk.error);
  
  // Anti-croisement
  var fluideMachine = machOk.data[6], fluideBouteille = boutOk.data[2];
  if (fluideMachine && fluideBouteille && fluideMachine !== fluideBouteille) {
    logAudit_('MOUVEMENT', 'croisementFluide', data.machine + '/' + data.bouteille, null, null, 'blocked');
    return errorResponse_('CROISEMENT FLUIDE: ' + fluideMachine + '/' + fluideBouteille, 'CROSSOVER');
  }
  
  var peseeAvant = validateNumber_(data.peseeAvant || 0, 0, 500);
  var peseeApres = validateNumber_(data.peseeApres || 0, 0, 500);
  if (!peseeAvant.ok || !peseeApres.ok) return errorResponse_('Pesée invalide');
  
  var operateur = sanitize_(data.operateur, 100);
  if (!operateur) return errorResponse_('Opérateur obligatoire');
  
  // LOT 18: Vérifier attestation pour mode OFFICIEL
  var mode = data.mode === 'OFFICIEL' ? 'OFFICIEL' : 'FORMATION';
  if (mode === 'OFFICIEL') {
    var userData = findUser_(operateur);
    if (userData.ok) {
      var attStatus = verifierAttestation_(userData.user.validiteAttestation);
      if (!attStatus.valide) {
        logAudit_('MOUVEMENT', 'attestationExpiree', operateur, null, null, 'blocked');
        return errorResponse_('Mode OFFICIEL bloqué: attestation expirée', 'ATTESTATION_EXPIRED');
      }
    }
    var userRole = getUserRole_(operateur);
    if (!hasPermission_(userRole, 'modeOfficiel')) {
      return errorResponse_('Mode OFFICIEL réservé aux enseignants/référents', 'MODE_DENIED');
    }
  }
  
  var masse = Math.abs(peseeAvant.value - peseeApres.value);
  var etatFluide = validateEnum_(data.etatFluide || 'Neuf', ETATS_FLUIDE);
  
  var numMvt = DataStore.generateId('MVT');
  var siteId = machOk.data[15] || boutOk.data[13] || '';
  
  var rowData = [numMvt, new Date(), typeOk.value, data.machine, data.bouteille,
    fluideBouteille || fluideMachine, etatFluide.ok ? etatFluide.value : 'Neuf',
    masse, peseeAvant.value, peseeApres.value, '', operateur, '', '', mode,
    sanitize_(data.detecteur, 50), '', '', '', '', '', sanitize_(data.observations, 500),
    '', 'soumis', data.signature || '', siteId];
  
  DataStore.insert(SHEETS.MOUVEMENTS, rowData);
  logAudit_('MOUVEMENT', 'creer', numMvt, null, { type: typeOk.value, masse: masse, mode: mode }, 'success');
  
  return successResponse_({ id: numMvt, statut: 'soumis', mode: mode });
}

function apiValiderMouvement_(data) {
  var mvtOk = DataStore.findById(SHEETS.MOUVEMENTS, data.id);
  if (!mvtOk.ok) return errorResponse_('Mouvement: ' + mvtOk.error);
  
  var statut = mvtOk.data[23] || 'soumis';
  if (statut === 'valide') return errorResponse_('Déjà validé');
  if (statut === 'annule') return errorResponse_('Mouvement annulé');
  if (statut !== 'soumis') return errorResponse_('Statut invalide: ' + statut);
  
  var validateur = sanitize_(data.validateur, 100) || Session.getActiveUser().getEmail() || 'API';
  var type = mvtOk.data[2], machine = mvtOk.data[3], bouteille = mvtOk.data[4];
  var masse = parseFloat(mvtOk.data[7]) || 0;
  var mode = mvtOk.data[14] || 'FORMATION';
  
  // LOT 18: Vérifier attestation validateur pour mode OFFICIEL
  if (mode === 'OFFICIEL') {
    var valData = findUser_(validateur);
    if (valData.ok) {
      var attStatus = verifierAttestation_(valData.user.validiteAttestation);
      if (!attStatus.valide) {
        return errorResponse_('Validation OFFICIEL bloquée: votre attestation est expirée', 'ATTESTATION_EXPIRED');
      }
    }
  }
  
  var majMachine = mettreAJourChargeMachine_(machine, masse, type);
  if (!majMachine.ok) {
    logAudit_('MOUVEMENT', 'validationEchec', data.id, { raison: 'machine' }, majMachine.error, 'error');
    return errorResponse_('Échec MAJ machine: ' + majMachine.error);
  }
  
  var majBouteille = mettreAJourStockBouteille_(bouteille, masse, type);
  if (!majBouteille.ok) {
    var typeInverse = (type === 'Charge' || type === 'Appoint') ? 'Recuperation' : 'Charge';
    mettreAJourChargeMachine_(machine, masse, typeInverse);
    logAudit_('MOUVEMENT', 'validationEchec', data.id, { raison: 'bouteille', rollback: true }, majBouteille.error, 'error');
    return errorResponse_('Échec MAJ bouteille: ' + majBouteille.error);
  }
  
  var hash = genererHash_(mvtOk.data);
  DataStore.update(SHEETS.MOUVEMENTS, mvtOk.row, 13, [validateur, new Date()]);
  DataStore.update(SHEETS.MOUVEMENTS, mvtOk.row, 23, [hash, 'valide']);
  
  var comptabilise = mode === 'OFFICIEL';
  logAudit_('MOUVEMENT', 'valider', data.id, { statut: statut }, { statut: 'valide', validateur: validateur, mode: mode, comptabilise: comptabilise }, 'success');
  
  return successResponse_({ id: data.id, hash: hash, statut: 'valide', mode: mode, comptabilise: comptabilise,
    majMachine: { ancienne: majMachine.ancienneCharge, nouvelle: majMachine.nouvelleCharge, eqCO2: majMachine.eqCO2 },
    majBouteille: { ancienne: majBouteille.ancienneMasse, nouvelle: majBouteille.nouvelleMasse } });
}

function apiAnnulerMouvement_(data) {
  var mvtOk = DataStore.findById(SHEETS.MOUVEMENTS, data.id);
  if (!mvtOk.ok) return errorResponse_('Mouvement: ' + mvtOk.error);
  
  var statut = mvtOk.data[23] || 'soumis';
  if (statut === 'annule') return errorResponse_('Déjà annulé');
  
  var motif = sanitize_(data.motif, 200) || 'Non spécifié';
  var rollback = false;
  
  if (statut === 'valide') {
    var type = mvtOk.data[2], machine = mvtOk.data[3], bouteille = mvtOk.data[4];
    var masse = parseFloat(mvtOk.data[7]) || 0;
    var typeInverse = (type === 'Charge' || type === 'Appoint') ? 'Recuperation' : 'Charge';
    mettreAJourChargeMachine_(machine, masse, typeInverse);
    mettreAJourStockBouteille_(bouteille, masse, typeInverse);
    rollback = true;
  }
  
  DataStore.updateCell(SHEETS.MOUVEMENTS, mvtOk.row, 22, (mvtOk.data[21] || '') + ' [ANNULÉ: ' + motif + ']');
  DataStore.updateCell(SHEETS.MOUVEMENTS, mvtOk.row, 24, 'annule');
  
  logAudit_('MOUVEMENT', 'annuler', data.id, { statut: statut }, { statut: 'annule', motif: motif, rollback: rollback }, 'success');
  
  return successResponse_({ id: data.id, statut: 'annule', rollback: rollback });
}

function mettreAJourChargeMachine_(code, masse, type) {
  var machOk = DataStore.findById(SHEETS.MACHINES, code);
  if (!machOk.ok) return { ok: false, error: machOk.error };
  
  var chargeAct = parseFloat(machOk.data[8]) || parseFloat(machOk.data[7]) || 0;
  var prg = getPRGFluide_(machOk.data[6]);
  
  var nouvelleCharge = chargeAct;
  if (type === 'Charge' || type === 'Appoint') nouvelleCharge += masse;
  else nouvelleCharge = Math.max(0, chargeAct - masse);
  
  var eqCO2 = calculerEqCO2_(nouvelleCharge, prg);
  var freqCtrl = calculerFrequenceControle_(eqCO2, false);
  var prochCtrl = calculerProchainControle_(new Date(), freqCtrl);
  
  DataStore.update(SHEETS.MACHINES, machOk.row, 9, [nouvelleCharge, eqCO2]);
  DataStore.update(SHEETS.MACHINES, machOk.row, 13, [prochCtrl, freqCtrl]);
  
  return { ok: true, ancienneCharge: chargeAct, nouvelleCharge: nouvelleCharge, eqCO2: eqCO2 };
}

function mettreAJourStockBouteille_(code, masse, type) {
  var boutOk = DataStore.findById(SHEETS.BOUTEILLES, code);
  if (!boutOk.ok) return { ok: false, error: boutOk.error };
  
  var masseAct = parseFloat(boutOk.data[7]) || 0;
  var tare = parseFloat(boutOk.data[5]) || 0;
  
  var nouvelleMasse = masseAct;
  if (type === 'Charge' || type === 'Appoint') nouvelleMasse = Math.max(0, masseAct - masse);
  else nouvelleMasse += masse;
  
  var statut = nouvelleMasse <= 0 ? 'Vide' : 'En stock';
  
  DataStore.update(SHEETS.BOUTEILLES, boutOk.row, 8, [nouvelleMasse, tare + nouvelleMasse]);
  DataStore.updateCell(SHEETS.BOUTEILLES, boutOk.row, 13, statut);
  
  return { ok: true, ancienneMasse: masseAct, nouvelleMasse: nouvelleMasse, statut: statut };
}

// ================================================================
// SECTION: CONTROLES (LOT 18 - Fuites)
// ================================================================

function apiCreateControle_(data) {
  var machOk = DataStore.findById(SHEETS.MACHINES, data.machine);
  if (!machOk.ok) return errorResponse_('Machine: ' + machOk.error);
  
  var methode = validateEnum_(data.methode, METHODES_CONTROLE);
  var resultat = validateEnum_(data.resultat, RESULTATS_CONTROLE);
  if (!methode.ok || !resultat.ok) return errorResponse_('Méthode/Résultat invalide');
  
  var operateur = sanitize_(data.operateur, 100);
  if (!operateur) return errorResponse_('Opérateur obligatoire');
  
  var mode = data.mode === 'OFFICIEL' ? 'OFFICIEL' : 'FORMATION';
  var fluide = machOk.data[6];
  var charge = parseFloat(machOk.data[8]) || parseFloat(machOk.data[7]) || 0;
  var prg = getPRGFluide_(fluide);
  var eqCO2 = calculerEqCO2_(charge, prg);
  var freqCtrl = calculerFrequenceControle_(eqCO2, false);
  var prochCtrl = calculerProchainControle_(new Date(), freqCtrl);
  
  var numCtrl = DataStore.generateId('CTRL');
  var siteId = machOk.data[15] || '';
  
  // LOT 18: Statut fuite = nécessite résolution
  var statutCtrl = resultat.value === 'Fuite' ? 'fuite_non_resolue' : 'valide';
  
  var rowData = [numCtrl, new Date(), data.machine, fluide, charge, eqCO2, methode.value, resultat.value,
    sanitize_(data.localisationFuite, 200), operateur, sanitize_(data.detecteur, 50), mode, prochCtrl, '', '', '', statutCtrl, siteId];
  
  DataStore.insert(SHEETS.CONTROLES, rowData);
  
  // MAJ machine
  DataStore.update(SHEETS.MACHINES, machOk.row, 13, [prochCtrl, freqCtrl]);
  
  // LOT 18: Si fuite détectée, créer incident
  if (resultat.value === 'Fuite') {
    var numIncident = DataStore.generateId('INC');
    DataStore.insert(SHEETS.INCIDENTS, [numIncident, new Date(), data.machine, 'Fuite', 
      'Fuite détectée lors du contrôle ' + numCtrl + '. Localisation: ' + (data.localisationFuite || 'Non précisée'),
      'Majeur', '', operateur, 'ouvert', '', siteId]);
    logAudit_('INCIDENT', 'creer', numIncident, null, { controle: numCtrl, machine: data.machine }, 'success');
  }
  
  logAudit_('CONTROLE', 'creer', numCtrl, null, { machine: data.machine, resultat: resultat.value, mode: mode }, 'success');
  
  return successResponse_({ id: numCtrl, prochainControle: formatDate_(prochCtrl), mode: mode, fuite: resultat.value === 'Fuite' });
}

// ================================================================
// SECTION: MACHINES & BOUTEILLES (LOT 16 - Multi-site)
// ================================================================

function apiCreateMachine_(data) {
  var nom = sanitize_(data.nom, 100);
  if (!nom) return errorResponse_('Nom obligatoire');
  
  var type = validateEnum_(data.type, TYPES_MACHINE);
  if (!type.ok) return errorResponse_('Type invalide');
  
  var fluideOk = DataStore.findById(SHEETS.FLUIDES, data.fluide);
  if (!fluideOk.ok) return errorResponse_('Fluide: ' + fluideOk.error);
  
  var charge = validateNumber_(data.chargeNom, 0, 1000);
  if (!charge.ok) return errorResponse_('Charge: ' + charge.error);
  
  var lock = LockService.getScriptLock();
  var code;
  try {
    lock.waitLock(10000);
    var compteur = parseInt(DataStore.getConfig('compteur_machine')) || 0;
    compteur++;
    DataStore.setConfig('compteur_machine', compteur);
    code = type.value.substring(0, 3).toUpperCase() + compteur;
  } finally { lock.releaseLock(); }
  
  var prg = fluideOk.data[2] || 0;
  var eqCO2 = calculerEqCO2_(charge.value, prg);
  var freqCtrl = calculerFrequenceControle_(eqCO2, false);
  
  // LOT 16: SiteId
  var siteId = data.siteId || '';
  
  var prechargee = data.prechargee === 'true' || data.prechargee === true;
  var detectionPerm = data.detectionPermanente === 'true' || data.detectionPermanente === true;
  var clientId = sanitize_(data.clientId, 50);
  var statut = prechargee ? 'En service (préchargée)' : 'En service';

  var rowData = [code, nom, type.value, sanitize_(data.marque, 50), sanitize_(data.modele, 50),
    sanitize_(data.serie, 50), data.fluide, charge.value, prechargee ? charge.value : 0, eqCO2,
    sanitize_(data.localisation, 100), new Date(), '', freqCtrl, statut, siteId, clientId, detectionPerm ? 'OUI' : ''];

  DataStore.insert(SHEETS.MACHINES, rowData);
  logAudit_('MACHINE', 'creer', code, null, { nom: nom, fluide: data.fluide, site: siteId, prechargee: prechargee }, 'success');
  CACHE_.fluides = null;
  
  return successResponse_({ code: code, eqCO2: eqCO2 });
}

function apiCreateBouteille_(data) {
  var categorie = validateEnum_(data.categorie, ['NEUVE', 'TRANSFERT', 'RECUP']);
  if (!categorie.ok) return errorResponse_('Catégorie invalide');
  
  var fluideOk = DataStore.findById(SHEETS.FLUIDES, data.fluide);
  if (!fluideOk.ok) return errorResponse_('Fluide: ' + fluideOk.error);
  
  var tare = validateNumber_(data.tare, 0, 100);
  if (!tare.ok) return errorResponse_('Tare: ' + tare.error);
  
  var etat = validateEnum_(data.etatFluide || 'Neuf', ETATS_FLUIDE);
  var contenance = validateNumber_(data.contenance || 0, 0, 100);
  var masseFluide = validateNumber_(data.masseFluide || 0, 0, 100);
  
  var lock = LockService.getScriptLock();
  var code;
  try {
    lock.waitLock(10000);
    var prefixe = CATEGORIES_BOUTEILLE[categorie.value] ? CATEGORIES_BOUTEILLE[categorie.value].prefixe : 'X';
    var compteur = parseInt(DataStore.getConfig('compteur_bout_' + prefixe.toLowerCase())) || 0;
    compteur++;
    DataStore.setConfig('compteur_bout_' + prefixe.toLowerCase(), compteur);
    code = prefixe + '-' + data.fluide + '-' + compteur;
  } finally { lock.releaseLock(); }
  
  var masseTotal = tare.value + (masseFluide.ok ? masseFluide.value : 0);
  var siteId = data.siteId || '';
  
  var rowData = [code, categorie.value, data.fluide, etat.ok ? etat.value : 'Neuf',
    sanitize_(data.marque, 50), tare.value, contenance.ok ? contenance.value : 0,
    masseFluide.ok ? masseFluide.value : 0, masseTotal, new Date(),
    sanitize_(data.fournisseur, 100), sanitize_(data.lot, 50), 'En stock', siteId];
  
  DataStore.insert(SHEETS.BOUTEILLES, rowData);
  logAudit_('BOUTEILLE', 'creer', code, null, { fluide: data.fluide, site: siteId }, 'success');
  
  return successResponse_({ code: code });
}

// LOT 17: Créer utilisateur
function apiCreateUser_(data) {
  var nom = sanitize_(data.nom, 100);
  var prenom = sanitize_(data.prenom, 100);
  if (!nom || !prenom) return errorResponse_('Nom et prénom obligatoires');
  
  var id = DataStore.generateId('USER');
  var role = normaliserRole_(data.role);
  
  var rowData = [id, nom, prenom, role, sanitize_(data.attestation, 50), data.dateAttestation || '',
    data.validiteAttestation || '', data.categorie2008 || '', data.categorie2025 || '',
    true, sanitize_(data.email, 100), data.siteId || '', data.atelierId || ''];
  
  DataStore.insert(SHEETS.USERS, rowData);
  logAudit_('USER', 'creer', id, null, { nom: nom + ' ' + prenom, role: role }, 'success');
  
  return successResponse_({ id: id });
}


// ================================================================
// SECTION: LOT 19 - EXPORTS PRO
// ================================================================

function csvLine_(values) {
  return values.map(function(v) {
    var s = String(v == null ? '' : v);
    return (s.indexOf(';') >= 0 || s.indexOf('"') >= 0) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(';');
}

// LOT 19: Export Pro configurable
function apiExportPro_(params) {
  var type = params.type || 'registre';
  var format = params.format || 'csv';
  var dateDebut = params.dateDebut ? new Date(params.dateDebut) : new Date(Date.now() - 365 * 86400000);
  var dateFin = params.dateFin ? new Date(params.dateFin) : new Date();
  var siteId = params.siteId || null;
  var mode = params.mode || null;
  
  var result = { csv: '', count: 0, filename: '', meta: {} };
  
  switch(type) {
    case 'registre':
      result = exportRegistreComplet_(dateDebut, dateFin, siteId, mode);
      break;
    case 'bilanAnnuel':
      result = exportBilanAnnuelPro_(parseInt(params.annee) || new Date().getFullYear(), siteId);
      break;
    case 'conformiteReglementaire':
      result = exportConformiteReglementaire_(siteId);
      break;
    case 'declarationAnnuelle':
      result = exportDeclarationAnnuelle_(parseInt(params.annee) || new Date().getFullYear(), siteId);
      break;
    case 'historiqueComplet':
      result = exportHistoriqueComplet_(params.machine, params.bouteille);
      break;
    default:
      return errorResponse_('Type export inconnu');
  }
  
  return successResponse_(result);
}

function exportRegistreComplet_(dateDebut, dateFin, siteId, mode) {
  var lines = [];
  lines.push('REGISTRE DES FLUIDES FRIGORIGÈNES');
  lines.push('Période: ' + formatDate_(dateDebut) + ' au ' + formatDate_(dateFin));
  lines.push('Généré le: ' + formatDateTime_(new Date()) + ' - inerWeb Fluides v' + APP_VERSION);
  lines.push('');
  lines.push(csvLine_(['N° FI', 'Date', 'Type', 'Machine', 'Bouteille', 'Fluide', 'État', 'Masse (kg)', 'Opérateur', 'Validateur', 'Mode', 'Statut', 'Comptabilisé']));
  
  var count = 0;
  DataStore.findAll(SHEETS.MOUVEMENTS).forEach(function(row) {
    if (!row[0]) return;
    var date = new Date(row[1]);
    if (date < dateDebut || date > dateFin) return;
    if (siteId && row[25] !== siteId) return;
    if (mode && row[14] !== mode) return;
    
    var comptabilise = row[14] === 'OFFICIEL' && row[23] === 'valide' ? 'Oui' : 'Non';
    lines.push(csvLine_([row[0], formatDateTime_(row[1]), row[2], row[3], row[4], row[5], row[6], row[7], row[11], row[12], row[14], row[23], comptabilise]));
    count++;
  });
  
  return { csv: lines.join('\n'), count: count, filename: 'registre_fluides_' + formatDateISO_(new Date()) + '.csv' };
}

function exportBilanAnnuelPro_(annee, siteId) {
  var stats = {
    charges: { officiel: 0, formation: 0 },
    recuperations: { officiel: 0, formation: 0 },
    parFluide: {},
    parMachine: {},
    parOperateur: {},
    controles: { total: 0, conformes: 0, fuites: 0 }
  };
  
  DataStore.findAll(SHEETS.MOUVEMENTS).forEach(function(row) {
    if (!row[0] || new Date(row[1]).getFullYear() !== annee || row[23] !== 'valide') return;
    if (siteId && row[25] !== siteId) return;
    
    var masse = parseFloat(row[7]) || 0;
    var mode = row[14] === 'OFFICIEL' ? 'officiel' : 'formation';
    var fluide = row[5], machine = row[3], operateur = row[11];
    
    if (row[2] === 'Charge' || row[2] === 'Appoint') stats.charges[mode] += masse;
    else stats.recuperations[mode] += masse;
    
    if (!stats.parFluide[fluide]) stats.parFluide[fluide] = { charges: 0, recup: 0 };
    if (row[2] === 'Charge' || row[2] === 'Appoint') stats.parFluide[fluide].charges += masse;
    else stats.parFluide[fluide].recup += masse;
    
    stats.parMachine[machine] = (stats.parMachine[machine] || 0) + 1;
    stats.parOperateur[operateur] = (stats.parOperateur[operateur] || 0) + 1;
  });
  
  DataStore.findAll(SHEETS.CONTROLES).forEach(function(row) {
    if (!row[0] || new Date(row[1]).getFullYear() !== annee) return;
    if (siteId && row[17] !== siteId) return;
    stats.controles.total++;
    if (row[7] === 'Conforme') stats.controles.conformes++;
    else if (row[7] === 'Fuite') stats.controles.fuites++;
  });
  
  var lines = [];
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('              BILAN ANNUEL ' + annee + ' - FLUIDES FRIGORIGÈNES');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('Généré le: ' + formatDateTime_(new Date()) + ' - inerWeb Fluides v' + APP_VERSION);
  lines.push('');
  lines.push('─── SYNTHÈSE DES MOUVEMENTS ────────────────────────────────────');
  lines.push('');
  lines.push('Mode;Charges (kg);Récupérations (kg);Bilan (kg)');
  lines.push('OFFICIEL;' + stats.charges.officiel.toFixed(2) + ';' + stats.recuperations.officiel.toFixed(2) + ';' + (stats.charges.officiel - stats.recuperations.officiel).toFixed(2));
  lines.push('FORMATION;' + stats.charges.formation.toFixed(2) + ';' + stats.recuperations.formation.toFixed(2) + ';' + (stats.charges.formation - stats.recuperations.formation).toFixed(2));
  lines.push('TOTAL;' + (stats.charges.officiel + stats.charges.formation).toFixed(2) + ';' + (stats.recuperations.officiel + stats.recuperations.formation).toFixed(2) + ';');
  lines.push('');
  lines.push('─── PAR FLUIDE ─────────────────────────────────────────────────');
  lines.push('');
  lines.push('Fluide;Charges (kg);Récupérations (kg)');
  for (var f in stats.parFluide) {
    lines.push(f + ';' + stats.parFluide[f].charges.toFixed(2) + ';' + stats.parFluide[f].recup.toFixed(2));
  }
  lines.push('');
  lines.push('─── CONTRÔLES D\'ÉTANCHÉITÉ ─────────────────────────────────────');
  lines.push('');
  lines.push('Total contrôles: ' + stats.controles.total);
  lines.push('Conformes: ' + stats.controles.conformes + ' (' + (stats.controles.total > 0 ? Math.round(stats.controles.conformes / stats.controles.total * 100) : 100) + '%)');
  lines.push('Fuites détectées: ' + stats.controles.fuites);
  lines.push('');
  lines.push('─── PAR OPÉRATEUR ──────────────────────────────────────────────');
  lines.push('');
  lines.push('Opérateur;Interventions');
  for (var o in stats.parOperateur) lines.push(o + ';' + stats.parOperateur[o]);
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  
  return { csv: lines.join('\n'), count: Object.keys(stats.parFluide).length, filename: 'bilan_annuel_' + annee + '.csv', stats: stats };
}

function exportConformiteReglementaire_(siteId) {
  var now = new Date();
  var lines = [];
  lines.push('RAPPORT DE CONFORMITÉ RÉGLEMENTAIRE');
  lines.push('Date: ' + formatDateTime_(now) + ' - inerWeb Fluides v' + APP_VERSION);
  lines.push('');
  
  // Attestations
  lines.push('─── ATTESTATIONS PERSONNEL ─────────────────────────────────────');
  lines.push('ID;Nom;Prénom;Attestation;Validité;Statut;Jours restants');
  
  [SHEETS.USERS, SHEETS.TECHNICIENS].forEach(function(table) {
    DataStore.findAll(table).forEach(function(row) {
      if (!row[0] || row[9] === false) return;
      if (siteId && row[11] !== siteId) return;
      
      var attStatus = verifierAttestation_(row[6]);
      var jours = row[6] ? Math.floor((new Date(row[6]) - now) / 86400000) : 'N/A';
      lines.push(csvLine_([row[0], row[1], row[2], row[4] || 'Non renseignée', formatDate_(row[6]), attStatus.status, jours]));
    });
  });
  
  lines.push('');
  lines.push('─── CONTRÔLES MACHINES ─────────────────────────────────────────');
  lines.push('Code;Nom;Fluide;Charge;Eq CO2;Fréquence;Prochain;Statut;Jours');
  
  DataStore.findAll(SHEETS.MACHINES).forEach(function(row) {
    if (!row[0] || row[14] === 'Hors service') return;
    if (siteId && row[15] !== siteId) return;
    
    var prochCtrl = row[12];
    var jours = prochCtrl ? Math.floor((new Date(prochCtrl) - now) / 86400000) : 'N/A';
    var statut = !prochCtrl ? 'À PLANIFIER' : (jours < 0 ? 'EN RETARD' : (jours <= 30 ? 'URGENT' : 'OK'));
    var freq = SEUILS_CONTROLE.find(function(s) { return row[9] >= s.eqCO2Min && row[9] < s.eqCO2Max; });
    
    lines.push(csvLine_([row[0], row[1], row[6], row[8], row[9], freq ? freq.label : '', formatDate_(prochCtrl), statut, jours]));
  });
  
  lines.push('');
  lines.push('─── FUITES NON RÉSOLUES ────────────────────────────────────────');
  lines.push('Contrôle;Date;Machine;Localisation');
  
  DataStore.findAll(SHEETS.CONTROLES).forEach(function(row) {
    if (row[7] === 'Fuite' && row[16] !== 'resolu') {
      if (siteId && row[17] !== siteId) return;
      lines.push(csvLine_([row[0], formatDate_(row[1]), row[2], row[8] || 'Non précisée']));
    }
  });
  
  return { csv: lines.join('\n'), count: 0, filename: 'conformite_reglementaire_' + formatDateISO_(now) + '.csv' };
}

function exportDeclarationAnnuelle_(annee, siteId) {
  var lines = [];
  lines.push('DÉCLARATION ANNUELLE DES FLUIDES FRIGORIGÈNES - ' + annee);
  lines.push('(Données pour déclaration ADEME)');
  lines.push('Généré le: ' + formatDateTime_(new Date()));
  lines.push('');
  
  var totaux = {};
  
  DataStore.findAll(SHEETS.MOUVEMENTS).forEach(function(row) {
    if (!row[0] || new Date(row[1]).getFullYear() !== annee) return;
    if (row[23] !== 'valide' || row[14] !== 'OFFICIEL') return;
    if (siteId && row[25] !== siteId) return;
    
    var fluide = row[5];
    if (!totaux[fluide]) totaux[fluide] = { charges: 0, recup: 0, prg: getPRGFluide_(fluide) };
    
    var masse = parseFloat(row[7]) || 0;
    if (row[2] === 'Charge' || row[2] === 'Appoint') totaux[fluide].charges += masse;
    else totaux[fluide].recup += masse;
  });
  
  lines.push('Fluide;PRG;Charges (kg);Récupérations (kg);Bilan (kg);Eq CO2 chargé (t);Eq CO2 récupéré (t)');
  
  var totalCharges = 0, totalRecup = 0, totalEqCO2Charge = 0, totalEqCO2Recup = 0;
  
  for (var f in totaux) {
    var t = totaux[f];
    var eqCO2Charge = calculerEqCO2_(t.charges, t.prg);
    var eqCO2Recup = calculerEqCO2_(t.recup, t.prg);
    lines.push(csvLine_([f, t.prg, t.charges.toFixed(2), t.recup.toFixed(2), (t.charges - t.recup).toFixed(2), eqCO2Charge.toFixed(3), eqCO2Recup.toFixed(3)]));
    totalCharges += t.charges;
    totalRecup += t.recup;
    totalEqCO2Charge += eqCO2Charge;
    totalEqCO2Recup += eqCO2Recup;
  }
  
  lines.push('');
  lines.push('TOTAUX;;' + totalCharges.toFixed(2) + ';' + totalRecup.toFixed(2) + ';' + (totalCharges - totalRecup).toFixed(2) + ';' + totalEqCO2Charge.toFixed(3) + ';' + totalEqCO2Recup.toFixed(3));
  
  return { csv: lines.join('\n'), count: Object.keys(totaux).length, filename: 'declaration_annuelle_' + annee + '.csv' };
}

function exportHistoriqueComplet_(machineCode, bouteilleCode) {
  var lines = [];
  
  if (machineCode) {
    var machOk = DataStore.findById(SHEETS.MACHINES, machineCode);
    if (!machOk.ok) return { csv: 'Machine non trouvée', count: 0, filename: 'erreur.csv' };
    
    lines.push('HISTORIQUE COMPLET MACHINE: ' + machineCode);
    lines.push('Nom: ' + machOk.data[1] + ' | Type: ' + machOk.data[2] + ' | Fluide: ' + machOk.data[6]);
    lines.push('Charge actuelle: ' + machOk.data[8] + ' kg | Eq CO2: ' + machOk.data[9] + ' t');
    lines.push('');
    lines.push('─── MOUVEMENTS ─────────────────────────────────────────────────');
    lines.push(csvLine_(['Date', 'Type', 'Bouteille', 'Masse', 'Opérateur', 'Mode', 'Statut']));
    
    DataStore.findAll(SHEETS.MOUVEMENTS).forEach(function(row) {
      if (row[3] === machineCode) {
        lines.push(csvLine_([formatDateTime_(row[1]), row[2], row[4], row[7], row[11], row[14], row[23]]));
      }
    });
    
    lines.push('');
    lines.push('─── CONTRÔLES ──────────────────────────────────────────────────');
    lines.push(csvLine_(['Date', 'Méthode', 'Résultat', 'Opérateur', 'Mode']));
    
    DataStore.findAll(SHEETS.CONTROLES).forEach(function(row) {
      if (row[2] === machineCode) {
        lines.push(csvLine_([formatDateTime_(row[1]), row[6], row[7], row[9], row[11]]));
      }
    });
  }
  
  if (bouteilleCode) {
    var boutOk = DataStore.findById(SHEETS.BOUTEILLES, bouteilleCode);
    if (!boutOk.ok) return { csv: 'Bouteille non trouvée', count: 0, filename: 'erreur.csv' };
    
    lines.push('HISTORIQUE COMPLET BOUTEILLE: ' + bouteilleCode);
    lines.push('Fluide: ' + boutOk.data[2] + ' | Catégorie: ' + boutOk.data[1] + ' | État: ' + boutOk.data[3]);
    lines.push('Masse actuelle: ' + boutOk.data[7] + ' kg');
    lines.push('');
    lines.push(csvLine_(['Date', 'Type', 'Machine', 'Masse', 'Opérateur', 'Mode', 'Statut']));
    
    DataStore.findAll(SHEETS.MOUVEMENTS).forEach(function(row) {
      if (row[4] === bouteilleCode) {
        lines.push(csvLine_([formatDateTime_(row[1]), row[2], row[3], row[7], row[11], row[14], row[23]]));
      }
    });
  }
  
  return { csv: lines.join('\n'), count: lines.length, filename: 'historique_' + (machineCode || bouteilleCode) + '.csv' };
}

// Exports standards (compat)
function apiExportRegistreFluides_(params) { return apiExportPro_({ type: 'registre', dateDebut: params.dateDebut, dateFin: params.dateFin, siteId: params.siteId, mode: params.mode }); }
function apiExportBilanAnnuel_(params) { return apiExportPro_({ type: 'bilanAnnuel', annee: params.annee, siteId: params.siteId }); }
function apiExportHistoriqueMachine_(params) { return apiExportPro_({ type: 'historiqueComplet', machine: params.machine }); }
function apiExportHistoriqueBouteille_(params) { return apiExportPro_({ type: 'historiqueComplet', bouteille: params.bouteille }); }

function apiExportControlesAVenir_() {
  var now = new Date();
  var lines = [csvLine_(['Machine', 'Fluide', 'Charge', 'Eq CO2', 'Fréquence', 'Prochain', 'Urgence', 'Jours'])];
  
  DataStore.findAll(SHEETS.MACHINES).forEach(function(row) {
    if (!row[0] || !row[12] || row[14] === 'Hors service') return;
    var diff = Math.floor((new Date(row[12]) - now) / 86400000);
    var urgence = diff < 0 ? 'ÉCHU' : (diff <= 7 ? 'URGENT' : (diff <= 30 ? 'PROCHE' : 'NORMAL'));
    var freq = SEUILS_CONTROLE.find(function(s) { return row[9] >= s.eqCO2Min && row[9] < s.eqCO2Max; });
    lines.push(csvLine_([row[0], row[6], row[8], row[9], freq ? freq.label : '', formatDate_(row[12]), urgence, diff]));
  });
  return successResponse_({ csv: lines.join('\n'), count: lines.length - 1, filename: 'controles_a_venir.csv' });
}

function apiExportActiviteEleve_(params) {
  var eleve = params.eleve || '';
  var lines = ['Activité élève: ' + eleve, csvLine_(['Type', 'Date', 'Action', 'Détail', 'Mode', 'Statut', 'Validateur'])];
  var count = 0;
  
  DataStore.findAll(SHEETS.MOUVEMENTS).forEach(function(row) {
    if ((!eleve || row[11] === eleve) && row[14] === 'FORMATION') {
      lines.push(csvLine_(['Mouvement', formatDateTime_(row[1]), row[2], row[3] + ' - ' + row[7] + 'kg', row[14], row[23], row[12]]));
      count++;
    }
  });
  return successResponse_({ csv: lines.join('\n'), count: count, filename: 'activite_eleve.csv' });
}

function apiExportSyntheseAtelier_(params) {
  var eleves = {};
  DataStore.findAll(SHEETS.MOUVEMENTS).forEach(function(row) {
    if (row[14] === 'FORMATION') {
      if (!eleves[row[11]]) eleves[row[11]] = { mouvements: 0, valides: 0 };
      eleves[row[11]].mouvements++;
      if (row[23] === 'valide') eleves[row[11]].valides++;
    }
  });
  var lines = [csvLine_(['Élève', 'Mouvements', 'Validés', 'Taux'])];
  for (var e in eleves) {
    var taux = eleves[e].mouvements > 0 ? Math.round(eleves[e].valides / eleves[e].mouvements * 100) : 0;
    lines.push(csvLine_([e, eleves[e].mouvements, eleves[e].valides, taux + '%']));
  }
  return successResponse_({ csv: lines.join('\n'), count: Object.keys(eleves).length, filename: 'synthese_atelier.csv' });
}

function apiExportValidationsEnseignant_(params) {
  var lines = [csvLine_(['ID', 'Date mouvement', 'Opérateur', 'Type', 'Mode', 'Date validation', 'Validateur'])];
  DataStore.findAll(SHEETS.MOUVEMENTS).forEach(function(row) {
    if (row[12] && row[23] === 'valide') {
      lines.push(csvLine_([row[0], formatDateTime_(row[1]), row[11], row[2], row[14], formatDateTime_(row[13]), row[12]]));
    }
  });
  return successResponse_({ csv: lines.join('\n'), count: lines.length - 1, filename: 'validations_enseignant.csv' });
}


// ================================================================
// SECTION: CERFA
// ================================================================

function apiGetCerfa_(id) {
  var cerfaOk = DataStore.findById(SHEETS.INDEX_CERFA, id);
  if (!cerfaOk.ok) return errorResponse_(cerfaOk.error);
  return successResponse_({ id: cerfaOk.data[0], dateGeneration: formatDateTime_(cerfaOk.data[1]), 
    mouvement: cerfaOk.data[2], machine: cerfaOk.data[3], operateur: cerfaOk.data[4], 
    mode: cerfaOk.data[5], urlPdf: cerfaOk.data[6], nomFichier: cerfaOk.data[7] || '' });
}

// ================================================================
// SECTION: CERFA HTML TEMPLATE ENGINE
// ================================================================

/**
 * Génère le HTML complet du CERFA 15497*04
 * @param {Object} d - Données du CERFA
 * @param {string} d.numFI - Numéro de fiche d'intervention
 * @param {string} d.mode - FORMATION ou OFFICIEL
 * @param {string} d.dateIntervention - Date de l'intervention
 * @param {Object} d.operateur - {raisonSociale, siret, adresse, attestation, validiteAttestation, nomComplet}
 * @param {Object} d.detenteur - {nom, siret, adresse}
 * @param {Object} d.circuit - {designation, nomMachine, serie, localisation, fluideCode, fluideNom, familleFluide, chargeNominale, prg, eqCO2}
 * @param {Object} d.intervention - {date, type, qteChargee, etatCharge, qteRecuperee, etatRecup, bouteille}
 * @param {Object} d.controle - {methode, resultat, detecteurMarque, detecteurModele, dateVerifDetecteur}
 * @param {string} d.detectionPermanente - Oui/Non
 * @param {string} d.observations - Texte libre
 * @param {boolean} d.estApercu - true si aperçu (champs vides)
 * @returns {string} HTML complet
 */
function genererCerfaHTML_(d) {
  var vide = '_______________';
  var v = function(val) { return (val != null && val !== '' && val !== undefined) ? String(val) : vide; };
  var ck = function(condition) { return condition ? '&#9746;' : '&#9744;'; };
  var isFormation = (d.mode === 'FORMATION');
  var isApercu = (d.estApercu === true);

  var typeIntervention = String(d.intervention && d.intervention.type || '').toLowerCase();
  var isMES = typeIntervention === 'miseenservice' || typeIntervention === 'mise en service';
  var isMaint = typeIntervention === 'maintenance' || typeIntervention === 'appoint';
  var isRepFuite = typeIntervention === 'recuperation' || typeIntervention === 'reparation fuite';
  var isModif = typeIntervention === 'modification';
  var isDemant = typeIntervention === 'vidange' || typeIntervention === 'demantelement';

  var html = '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="UTF-8">\n';
  html += '<title>CERFA 15497*04 - ' + v(d.numFI) + '</title>\n';
  html += '<style>\n';
  // Reset & page
  html += '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\n';
  html += '@page { size: A4 portrait; margin: 8mm 10mm 8mm 10mm; }\n';
  html += 'body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.35; color: #000; background: #fff; }\n';
  html += '.page { width: 190mm; min-height: 277mm; margin: 0 auto; padding: 0; position: relative; }\n';
  // En-tête
  html += '.header-cerfa { text-align: center; border: 2px solid #000; padding: 8px 10px 6px; margin-bottom: 6px; position: relative; }\n';
  html += '.header-cerfa h1 { font-size: 14px; font-weight: bold; margin-bottom: 2px; letter-spacing: 0.5px; }\n';
  html += '.header-cerfa h2 { font-size: 9px; font-weight: normal; color: #333; margin-bottom: 3px; }\n';
  html += '.header-cerfa .ref-cerfa { font-size: 9px; color: #555; }\n';
  html += '.header-cerfa .num-fi { position: absolute; right: 10px; top: 8px; font-size: 11px; font-weight: bold; color: #1b3a63; }\n';
  html += '.header-cerfa .date-gen { position: absolute; left: 10px; top: 8px; font-size: 8px; color: #666; }\n';
  // Cadres
  html += '.cadre { border: 1.5px solid #000; margin-bottom: 5px; page-break-inside: avoid; }\n';
  html += '.cadre-titre { background: #1b3a63; color: #fff; padding: 3px 8px; font-weight: bold; font-size: 10px; letter-spacing: 0.3px; }\n';
  html += '.cadre-body { padding: 5px 8px; }\n';
  // Grille
  html += '.row { display: flex; flex-wrap: wrap; gap: 0; }\n';
  html += '.col-2 { width: 50%; padding: 1px 4px 1px 0; }\n';
  html += '.col-3 { width: 33.33%; padding: 1px 4px 1px 0; }\n';
  html += '.col-1 { width: 100%; padding: 1px 0; }\n';
  // Champs
  html += '.champ { display: inline; }\n';
  html += '.champ-label { font-weight: bold; font-size: 9px; color: #333; }\n';
  html += '.champ-val { border-bottom: 1px solid #999; padding: 0 3px; min-width: 80px; display: inline-block; font-size: 10px; }\n';
  html += '.champ-val.filled { border-bottom-color: #1b3a63; font-weight: 500; }\n';
  // Cases à cocher
  html += '.check-group { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 2px 0; }\n';
  html += '.check-item { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; }\n';
  html += '.check-box { font-size: 13px; line-height: 1; }\n';
  // Signatures
  html += '.signatures { display: flex; gap: 8px; margin-top: 6px; }\n';
  html += '.sig-box { flex: 1; border: 1.5px solid #000; }\n';
  html += '.sig-box .cadre-titre { font-size: 9px; padding: 2px 8px; }\n';
  html += '.sig-box .sig-area { height: 45px; padding: 4px 8px; font-size: 8px; color: #999; }\n';
  // Footer
  html += '.footer-cerfa { text-align: center; margin-top: 4px; font-size: 8px; color: #666; border-top: 1px solid #ccc; padding-top: 3px; }\n';
  // QR placeholder
  html += '.qr-zone { position: absolute; bottom: 5px; right: 5px; width: 50px; height: 50px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 6px; color: #aaa; text-align: center; }\n';
  // Filigrane
  html += '.filigrane { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 72px; font-weight: bold; pointer-events: none; z-index: 100; user-select: none; }\n';
  html += '.filigrane.formation { color: rgba(33, 150, 243, 0.12); }\n';
  html += '.filigrane.apercu { color: rgba(139, 92, 246, 0.10); }\n';
  // Tableau intervention
  html += 'table.tbl-interv { width: 100%; border-collapse: collapse; font-size: 9px; margin: 3px 0; }\n';
  html += 'table.tbl-interv th, table.tbl-interv td { border: 1px solid #666; padding: 2px 4px; text-align: left; }\n';
  html += 'table.tbl-interv th { background: #e8ecf1; font-weight: bold; font-size: 8px; text-transform: uppercase; }\n';
  // Print
  html += '@media print {\n';
  html += '  body { margin: 0; padding: 0; }\n';
  html += '  .page { width: 100%; min-height: auto; margin: 0; }\n';
  html += '  .no-print { display: none !important; }\n';
  html += '}\n';
  html += '</style>\n</head>\n<body>\n';

  html += '<div class="page">\n';

  // Filigrane
  if (isFormation) {
    html += '<div class="filigrane formation">FORMATION</div>\n';
  } else if (isApercu) {
    html += '<div class="filigrane apercu">APERÇU</div>\n';
  }

  // QR code zone
  html += '<div class="qr-zone">' + v(d.circuit && d.circuit.designation || '') + '</div>\n';

  // En-tête
  html += '<div class="header-cerfa">\n';
  html += '  <div class="date-gen">' + v(d.dateGeneration) + '</div>\n';
  html += '  <div class="num-fi">N° ' + v(d.numFI) + '</div>\n';
  html += '  <h1>FICHE D\'INTERVENTION</h1>\n';
  html += '  <h2>en application des articles R. 543-76 à R. 543-123 du code de l\'environnement</h2>\n';
  html += '  <div class="ref-cerfa">CERFA 15497*04</div>\n';
  html += '</div>\n';

  // CADRE 1 — OPÉRATEUR
  var op = d.operateur || {};
  html += '<div class="cadre">\n';
  html += '  <div class="cadre-titre">CADRE 1 — OPÉRATEUR</div>\n';
  html += '  <div class="cadre-body">\n';
  html += '    <div class="row">\n';
  html += '      <div class="col-2"><span class="champ-label">Raison sociale : </span><span class="champ-val' + (op.raisonSociale ? ' filled' : '') + '">' + v(op.raisonSociale) + '</span></div>\n';
  html += '      <div class="col-2"><span class="champ-label">N° SIRET : </span><span class="champ-val' + (op.siret ? ' filled' : '') + '">' + v(op.siret) + '</span></div>\n';
  html += '    </div>\n';
  html += '    <div class="row">\n';
  html += '      <div class="col-1"><span class="champ-label">Adresse : </span><span class="champ-val' + (op.adresse ? ' filled' : '') + '">' + v(op.adresse) + '</span></div>\n';
  html += '    </div>\n';
  html += '    <div class="row">\n';
  html += '      <div class="col-2"><span class="champ-label">N° attestation de capacité : </span><span class="champ-val' + (op.attestation ? ' filled' : '') + '">' + v(op.attestation) + '</span></div>\n';
  html += '      <div class="col-2"><span class="champ-label">Date de validité : </span><span class="champ-val' + (op.validiteAttestation ? ' filled' : '') + '">' + v(op.validiteAttestation) + '</span></div>\n';
  html += '    </div>\n';
  html += '    <div class="row">\n';
  html += '      <div class="col-1"><span class="champ-label">Nom de l\'intervenant : </span><span class="champ-val' + (op.nomComplet ? ' filled' : '') + '">' + v(op.nomComplet) + '</span></div>\n';
  html += '    </div>\n';
  html += '  </div>\n</div>\n';

  // CADRE 2 — DÉTENTEUR
  var det = d.detenteur || {};
  html += '<div class="cadre">\n';
  html += '  <div class="cadre-titre">CADRE 2 — DÉTENTEUR DE L\'ÉQUIPEMENT</div>\n';
  html += '  <div class="cadre-body">\n';
  html += '    <div class="row">\n';
  html += '      <div class="col-2"><span class="champ-label">Nom / Raison sociale : </span><span class="champ-val' + (det.nom ? ' filled' : '') + '">' + v(det.nom) + '</span></div>\n';
  html += '      <div class="col-2"><span class="champ-label">N° SIRET : </span><span class="champ-val' + (det.siret ? ' filled' : '') + '">' + v(det.siret) + '</span></div>\n';
  html += '    </div>\n';
  html += '    <div class="row">\n';
  html += '      <div class="col-1"><span class="champ-label">Adresse : </span><span class="champ-val' + (det.adresse ? ' filled' : '') + '">' + v(det.adresse) + '</span></div>\n';
  html += '    </div>\n';
  html += '  </div>\n</div>\n';

  // CADRE 3 — CIRCUIT
  var ci = d.circuit || {};
  html += '<div class="cadre">\n';
  html += '  <div class="cadre-titre">CADRE 3 — CIRCUIT CONTENANT DES FLUIDES FRIGORIGÈNES</div>\n';
  html += '  <div class="cadre-body">\n';
  html += '    <div class="row">\n';
  html += '      <div class="col-2"><span class="champ-label">Désignation de l\'équipement : </span><span class="champ-val' + (ci.designation ? ' filled' : '') + '">' + v(ci.designation) + (ci.nomMachine ? ' — ' + ci.nomMachine : '') + '</span></div>\n';
  html += '      <div class="col-2"><span class="champ-label">N° de série : </span><span class="champ-val' + (ci.serie ? ' filled' : '') + '">' + v(ci.serie) + '</span></div>\n';
  html += '    </div>\n';
  html += '    <div class="row">\n';
  html += '      <div class="col-1"><span class="champ-label">Localisation : </span><span class="champ-val' + (ci.localisation ? ' filled' : '') + '">' + v(ci.localisation) + '</span></div>\n';
  html += '    </div>\n';
  html += '    <div class="row">\n';
  html += '      <div class="col-3"><span class="champ-label">Fluide frigorigène : </span><span class="champ-val' + (ci.fluideCode ? ' filled' : '') + '">' + v(ci.fluideCode) + (ci.fluideNom ? ' (' + ci.fluideNom + ')' : '') + '</span></div>\n';
  html += '      <div class="col-3"><span class="champ-label">Type : </span><span class="champ-val' + (ci.familleFluide ? ' filled' : '') + '">' + v(ci.familleFluide) + '</span></div>\n';
  html += '      <div class="col-3"><span class="champ-label">Charge nominale : </span><span class="champ-val' + (ci.chargeNominale ? ' filled' : '') + '">' + v(ci.chargeNominale) + ' kg</span></div>\n';
  html += '    </div>\n';
  html += '    <div class="row">\n';
  html += '      <div class="col-2"><span class="champ-label">GWP / PRG : </span><span class="champ-val' + (ci.prg ? ' filled' : '') + '">' + v(ci.prg) + '</span></div>\n';
  html += '      <div class="col-2"><span class="champ-label">Teq CO2 : </span><span class="champ-val' + (ci.eqCO2 ? ' filled' : '') + '">' + v(ci.eqCO2 != null ? (Math.round(ci.eqCO2 * 1000) / 1000) : '') + ' t</span></div>\n';
  html += '    </div>\n';
  html += '  </div>\n</div>\n';

  // CADRE 4 — NATURE DE L'INTERVENTION
  var interv = d.intervention || {};
  html += '<div class="cadre">\n';
  html += '  <div class="cadre-titre">CADRE 4 — NATURE DE L\'INTERVENTION</div>\n';
  html += '  <div class="cadre-body">\n';
  html += '    <div class="row">\n';
  html += '      <div class="col-2"><span class="champ-label">Date : </span><span class="champ-val' + (interv.date ? ' filled' : '') + '">' + v(interv.date) + '</span></div>\n';
  html += '    </div>\n';
  html += '    <div class="check-group">\n';
  html += '      <span class="check-item"><span class="check-box">' + ck(isMES) + '</span> Mise en service</span>\n';
  html += '      <span class="check-item"><span class="check-box">' + ck(isMaint) + '</span> Maintenance / Entretien</span>\n';
  html += '      <span class="check-item"><span class="check-box">' + ck(isRepFuite) + '</span> Réparation de fuite</span>\n';
  html += '      <span class="check-item"><span class="check-box">' + ck(isModif) + '</span> Modification</span>\n';
  html += '      <span class="check-item"><span class="check-box">' + ck(isDemant) + '</span> Démantèlement</span>\n';
  html += '    </div>\n';
  // Tableau charges / récupérations
  html += '    <table class="tbl-interv">\n';
  html += '      <tr><th colspan="3">Fluide frigorigène chargé</th><th colspan="3">Fluide frigorigène récupéré</th></tr>\n';
  html += '      <tr><th>Quantité (kg)</th><th>État</th><th>N° bouteille</th><th>Quantité (kg)</th><th>État</th><th>N° bouteille</th></tr>\n';
  html += '      <tr>';
  // Chargé
  var qteChargee = interv.qteChargee || '';
  var qteRecuperee = interv.qteRecuperee || '';
  var isCharge = typeIntervention === 'charge' || typeIntervention === 'appoint' || isMES;
  var isRecup = typeIntervention === 'recuperation' || typeIntervention === 'vidange';
  html += '<td>' + (isCharge ? v(qteChargee) : '') + '</td>';
  html += '<td>' + (isCharge ? v(interv.etatCharge) : '') + '</td>';
  html += '<td>' + (isCharge ? v(interv.bouteille) : '') + '</td>';
  // Récupéré
  html += '<td>' + (isRecup ? v(qteRecuperee) : '') + '</td>';
  html += '<td>' + (isRecup ? v(interv.etatRecup) : '') + '</td>';
  html += '<td>' + (isRecup ? v(interv.bouteille) : '') + '</td>';
  html += '</tr>\n';
  html += '    </table>\n';
  html += '  </div>\n</div>\n';

  // CADRE 5 — CONTRÔLE D'ÉTANCHÉITÉ
  var ctrl = d.controle || {};
  html += '<div class="cadre">\n';
  html += '  <div class="cadre-titre">CADRE 5 — CONTRÔLE D\'ÉTANCHÉITÉ</div>\n';
  html += '  <div class="cadre-body">\n';
  html += '    <div class="row">\n';
  html += '      <div class="col-1"><span class="champ-label">Méthode : </span>\n';
  html += '        <span class="check-item"><span class="check-box">' + ck(ctrl.methode === 'Directe') + '</span> Directe</span>\n';
  html += '        <span class="check-item"><span class="check-box">' + ck(ctrl.methode === 'Indirecte') + '</span> Indirecte</span>\n';
  html += '        <span class="check-item"><span class="check-box">' + ck(ctrl.methode === 'Pression') + '</span> Pression</span>\n';
  html += '      </div>\n';
  html += '    </div>\n';
  html += '    <div class="row">\n';
  html += '      <div class="col-2"><span class="champ-label">Résultat : </span>\n';
  html += '        <span class="check-item"><span class="check-box">' + ck(ctrl.resultat === 'Conforme') + '</span> Conforme</span>\n';
  html += '        <span class="check-item"><span class="check-box">' + ck(ctrl.resultat === 'Fuite') + '</span> Fuite détectée</span>\n';
  html += '      </div>\n';
  html += '    </div>\n';
  html += '    <div class="row">\n';
  html += '      <div class="col-2"><span class="champ-label">Détecteur (marque / modèle) : </span><span class="champ-val' + (ctrl.detecteurMarque ? ' filled' : '') + '">' + v(ctrl.detecteurMarque) + (ctrl.detecteurModele ? ' / ' + ctrl.detecteurModele : '') + '</span></div>\n';
  html += '      <div class="col-2"><span class="champ-label">Date dernière vérification : </span><span class="champ-val' + (ctrl.dateVerifDetecteur ? ' filled' : '') + '">' + v(ctrl.dateVerifDetecteur) + '</span></div>\n';
  html += '    </div>\n';
  html += '  </div>\n</div>\n';

  // CADRE 6 — DÉTECTION PERMANENTE
  var detPerm = d.detectionPermanente || '';
  html += '<div class="cadre">\n';
  html += '  <div class="cadre-titre">CADRE 6 — SYSTÈME DE DÉTECTION DE FUITE PERMANENT</div>\n';
  html += '  <div class="cadre-body">\n';
  html += '    <div class="check-group">\n';
  html += '      <span class="check-item"><span class="check-box">' + ck(detPerm === 'Oui' || detPerm === true) + '</span> Oui</span>\n';
  html += '      <span class="check-item"><span class="check-box">' + ck(detPerm === 'Non' || detPerm === false) + '</span> Non</span>\n';
  html += '    </div>\n';
  html += '  </div>\n</div>\n';

  // CADRE 7 — OBSERVATIONS
  html += '<div class="cadre">\n';
  html += '  <div class="cadre-titre">CADRE 7 — OBSERVATIONS</div>\n';
  html += '  <div class="cadre-body">\n';
  html += '    <div style="min-height: 35px; padding: 3px 0; font-size: 10px; white-space: pre-wrap;">' + v(d.observations) + '</div>\n';
  html += '  </div>\n</div>\n';

  // SIGNATURES
  html += '<div class="signatures">\n';
  html += '  <div class="sig-box"><div class="cadre-titre">SIGNATURE DE L\'OPÉRATEUR</div><div class="sig-area">Nom : ' + v(op.nomComplet) + '<br>Date : ' + v(d.dateIntervention) + '</div></div>\n';
  html += '  <div class="sig-box"><div class="cadre-titre">SIGNATURE DU DÉTENTEUR</div><div class="sig-area">Nom : ' + v(det.nom) + '<br>Date : ' + v(d.dateIntervention) + '</div></div>\n';
  html += '</div>\n';

  // Footer
  html += '<div class="footer-cerfa">';
  if (isFormation) {
    html += '<strong style="color: #2196F3;">DOCUMENT DE FORMATION — NON COMPTABILISÉ OFFICIELLEMENT</strong><br>';
  }
  html += 'Généré par inerWeb Fluides v' + APP_VERSION + ' le ' + v(d.dateGeneration) + ' | Mode : ' + (d.mode || 'FORMATION');
  html += '</div>\n';

  html += '</div>\n'; // fin .page
  html += '</body>\n</html>';

  return html;
}

/**
 * Construit le texte brut de compatibilité à partir des données CERFA
 */
function genererCerfaTexteBrut_(d) {
  var v = function(val) { return (val != null && val !== '') ? String(val) : '___'; };
  var op = d.operateur || {};
  var det = d.detenteur || {};
  var ci = d.circuit || {};
  var interv = d.intervention || {};

  var content = '';
  content += '════════════════════════════════════════════════════════════════\n';
  content += '           FICHE D\'INTERVENTION — CERFA 15497*04\n';
  content += '════════════════════════════════════════════════════════════════\n\n';
  if (d.mode === 'FORMATION') {
    content += '⚠️ DOCUMENT DE FORMATION — NON COMPTABILISÉ OFFICIELLEMENT\n\n';
  }
  content += 'N° FI          : ' + v(d.numFI) + '\n';
  content += 'Date           : ' + v(d.dateIntervention) + '\n';
  content += 'Mode           : ' + v(d.mode) + '\n\n';
  content += '─── CADRE 1 — OPÉRATEUR ────────────────────────────────────────\n';
  content += 'Raison sociale : ' + v(op.raisonSociale) + '\n';
  content += 'SIRET          : ' + v(op.siret) + '\n';
  content += 'Adresse        : ' + v(op.adresse) + '\n';
  content += 'Attestation    : ' + v(op.attestation) + ' (validité: ' + v(op.validiteAttestation) + ')\n';
  content += 'Intervenant    : ' + v(op.nomComplet) + '\n\n';
  content += '─── CADRE 2 — DÉTENTEUR ────────────────────────────────────────\n';
  content += 'Nom            : ' + v(det.nom) + '\n';
  content += 'SIRET          : ' + v(det.siret) + '\n';
  content += 'Adresse        : ' + v(det.adresse) + '\n\n';
  content += '─── CADRE 3 — CIRCUIT ──────────────────────────────────────────\n';
  content += 'Désignation    : ' + v(ci.designation) + '\n';
  content += 'N° série       : ' + v(ci.serie) + '\n';
  content += 'Fluide         : ' + v(ci.fluideCode) + ' (' + v(ci.familleFluide) + ')\n';
  content += 'Charge nom.    : ' + v(ci.chargeNominale) + ' kg\n';
  content += 'PRG            : ' + v(ci.prg) + '\n';
  content += 'Teq CO2        : ' + v(ci.eqCO2) + ' t\n\n';
  content += '─── CADRE 4 — INTERVENTION ─────────────────────────────────────\n';
  content += 'Type           : ' + v(interv.type) + '\n';
  content += 'Date           : ' + v(interv.date) + '\n';
  content += 'Qté chargée    : ' + v(interv.qteChargee) + ' kg (' + v(interv.etatCharge) + ')\n';
  content += 'Qté récupérée  : ' + v(interv.qteRecuperee) + ' kg (' + v(interv.etatRecup) + ')\n';
  content += 'Bouteille      : ' + v(interv.bouteille) + '\n\n';
  content += '════════════════════════════════════════════════════════════════\n';
  content += 'Généré par inerWeb Fluides v' + APP_VERSION + '\n';
  return content;
}

/**
 * Collecte les données complètes pour un mouvement (utilisé par genererCerfa et genererCerfaPrecharge)
 */
function collecterDonneesCerfa_(mvtData, machineCode, operateurId, mode) {
  // Config opérateur
  var config = {};
  DataStore.findAll(SHEETS.CONFIG).forEach(function(row) { if (row[0]) config[row[0]] = row[1]; });

  // Données machine
  var machOk = DataStore.findById(SHEETS.MACHINES, machineCode);
  var machData = machOk.ok ? machOk.data : [];
  var fluideCode = machData[6] || (mvtData ? mvtData[5] : '');
  var chargeNom = parseFloat(machData[7]) || 0;
  var chargeAct = parseFloat(machData[8]) || chargeNom;
  var serie = machData[5] || '';
  var localisation = machData[10] || '';
  var clientId = machData[16] || '';
  var detectionPerm = machData[17] || '';
  var nomMachine = machData[1] || '';

  // PRG et famille fluide
  var prg = getPRGFluide_(fluideCode);
  var eqCO2 = calculerEqCO2_(chargeAct, prg);
  var fluideInfo = DataStore.findById(SHEETS.FLUIDES, fluideCode);
  var fluideNom = fluideInfo.ok ? fluideInfo.data[1] : '';
  var familleFluide = fluideInfo.ok ? fluideInfo.data[3] : '';

  // Détenteur (client)
  var detenteur = {};
  if (clientId) {
    var cliOk = DataStore.findById('CLIENTS', clientId);
    if (cliOk.ok) {
      detenteur = {
        nom: cliOk.data[1] || '',
        adresse: ((cliOk.data[2] || '') + ' ' + (cliOk.data[3] || '') + ' ' + (cliOk.data[4] || '')).trim(),
        siret: cliOk.data[5] || ''
      };
    }
  }

  // Opérateur (utilisateur)
  var operateur = {
    raisonSociale: config.etablissement || '',
    siret: config.siret || '',
    adresse: config.adresse || '',
    attestation: '',
    validiteAttestation: '',
    nomComplet: operateurId || ''
  };
  if (operateurId) {
    var userOk = findUser_(operateurId);
    if (userOk.ok) {
      operateur.nomComplet = ((userOk.user.prenom || '') + ' ' + (userOk.user.nom || '')).trim() || operateurId;
      operateur.attestation = userOk.user.attestation || '';
      operateur.validiteAttestation = userOk.user.validiteAttestation ? formatDate_(userOk.user.validiteAttestation) : '';
    }
  }

  // Détecteur
  var detecteurInfo = {};
  if (mvtData && mvtData[15]) {
    var detOk = DataStore.findById(SHEETS.DETECTEURS, mvtData[15]);
    if (detOk.ok) {
      detecteurInfo = { marque: detOk.data[1] || '', modele: detOk.data[2] || '', dateVerif: formatDate_(detOk.data[3]) };
    }
  }

  // Déterminer type d'intervention lisible
  var typeMap = { 'Charge': 'Charge', 'Appoint': 'Maintenance / Entretien', 'Recuperation': 'Récupération', 'Vidange': 'Vidange / Démantèlement', 'MiseEnService': 'Mise en service' };
  var typeIntervention = mvtData ? (typeMap[mvtData[2]] || mvtData[2] || '') : '';

  // Quantités chargées / récupérées
  var masse = mvtData ? (parseFloat(mvtData[7]) || 0) : 0;
  var typeRaw = mvtData ? mvtData[2] : '';
  var isChargeType = (typeRaw === 'Charge' || typeRaw === 'Appoint' || typeRaw === 'MiseEnService');
  var isRecupType = (typeRaw === 'Recuperation' || typeRaw === 'Vidange');

  // Détection permanente
  var detPermVal = '';
  if (detectionPerm === true || detectionPerm === 'Oui' || detectionPerm === 'true') detPermVal = 'Oui';
  else if (detectionPerm === false || detectionPerm === 'Non' || detectionPerm === 'false' || detectionPerm === '') detPermVal = 'Non';
  else detPermVal = String(detectionPerm);

  return {
    mode: mode,
    dateGeneration: formatDateTime_(new Date()),
    dateIntervention: mvtData ? formatDateTime_(mvtData[1]) : formatDateTime_(new Date()),
    operateur: operateur,
    detenteur: detenteur,
    circuit: {
      designation: machineCode,
      nomMachine: nomMachine,
      serie: serie,
      localisation: localisation,
      fluideCode: fluideCode,
      fluideNom: fluideNom,
      familleFluide: familleFluide,
      chargeNominale: chargeNom,
      prg: prg,
      eqCO2: eqCO2
    },
    intervention: {
      date: mvtData ? formatDateTime_(mvtData[1]) : '',
      type: typeIntervention,
      qteChargee: isChargeType ? masse : '',
      etatCharge: isChargeType ? (mvtData ? mvtData[6] : '') : '',
      qteRecuperee: isRecupType ? masse : '',
      etatRecup: isRecupType ? (mvtData ? mvtData[6] : '') : '',
      bouteille: mvtData ? mvtData[4] : ''
    },
    controle: {
      methode: detecteurInfo.marque ? 'Directe' : '',
      resultat: '',
      detecteurMarque: detecteurInfo.marque || '',
      detecteurModele: detecteurInfo.modele || '',
      dateVerifDetecteur: detecteurInfo.dateVerif || ''
    },
    detectionPermanente: detPermVal,
    observations: mvtData ? (mvtData[21] || '') : ''
  };
}

function apiGenererCerfa_(data) {
  var mvtOk = DataStore.findById(SHEETS.MOUVEMENTS, data.id);
  if (!mvtOk.ok) return errorResponse_('Mouvement: ' + mvtOk.error);

  var mode = mvtOk.data[14] || 'FORMATION';
  var modeRules = MODE_RULES[mode];
  var prefixe = modeRules ? modeRules.prefixeCerfa : 'FI';

  var numFI = DataStore.generateId(prefixe);
  var machine = mvtOk.data[3];
  var dateStr = formatDateISO_(mvtOk.data[1]);
  var nomFichier = numFI + '_' + machine + '_' + dateStr;

  // Collecter les données complètes
  var donnees = collecterDonneesCerfa_(mvtOk.data, machine, mvtOk.data[11], mode);
  donnees.numFI = numFI;

  // Générer le HTML
  var htmlContent = genererCerfaHTML_(donnees);

  // Générer le texte brut pour compatibilité
  var texteBrut = genererCerfaTexteBrut_(donnees);

  // Sauvegarder en HTML sur Drive
  var file = DriveApp.getRootFolder().createFile(Utilities.newBlob(htmlContent, 'text/html', nomFichier + '.html'));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  DataStore.insert(SHEETS.INDEX_CERFA, [numFI, new Date(), data.id, machine, mvtOk.data[11], mode, file.getUrl(), nomFichier]);
  logAudit_('CERFA', 'generer', numFI, null, { mouvement: data.id, mode: mode, nomFichier: nomFichier }, 'success');

  return successResponse_({ id: numFI, html: htmlContent, contenu: texteBrut, urlPdf: file.getUrl(), url: file.getUrl(), nomFichier: nomFichier, mode: mode });
}

// ================================================================
// SECTION: INSTALL & MENU
// ================================================================

function INSTALLER_INERWEB() {
  var ui = SpreadsheetApp.getUi();
  DataStore.init();
  var ss = DataStore.getSpreadsheet();
  
  try {
    // Core
    creerOnglet_(ss, SHEETS.CONFIG, ['Clé', 'Valeur']);
    creerOnglet_(ss, SHEETS.FLUIDES, ['Code', 'Nom', 'PRG', 'Famille', 'Sécurité', 'Obsolète']);
    creerOnglet_(ss, SHEETS.DETECTEURS, ['Code', 'Marque', 'Modèle', 'Étalonnage', 'Prochain', 'Statut']);
    
    // LOT 16: Sites/Ateliers
    creerOnglet_(ss, SHEETS.SITES, ['ID', 'Nom', 'Adresse', 'SIRET', 'Responsable', 'Actif']);
    creerOnglet_(ss, SHEETS.ATELIERS, ['ID', 'Nom', 'SiteID', 'Responsable', 'Actif']);
    
    // LOT 17: Users (remplace TECHNICIENS)
    creerOnglet_(ss, SHEETS.USERS, ['ID', 'Nom', 'Prénom', 'Rôle', 'Attestation', 'DateAtt', 'ValiditéAtt', 'Cat2008', 'Cat2025', 'Actif', 'Email', 'SiteID', 'AtelierID']);
    creerOnglet_(ss, SHEETS.TECHNICIENS, ['ID', 'Nom', 'Prénom', 'Rôle', 'Attestation', 'Date', 'Validité', 'Cat2008', 'Cat2025', 'Actif', 'Email', 'SiteID', 'AtelierID']);
    
    // Parc (LOT 16: +SiteID)
    creerOnglet_(ss, SHEETS.BOUTEILLES, ['Code', 'Catégorie', 'Fluide', 'État', 'Marque', 'Tare', 'Contenance', 'MasseFluide', 'MasseTotal', 'Entrée', 'Fournisseur', 'Lot', 'Statut', 'SiteID']);
    creerOnglet_(ss, SHEETS.MACHINES, ['Code', 'Nom', 'Type', 'Marque', 'Modèle', 'Série', 'Fluide', 'ChargeNom', 'ChargeAct', 'EqCO2', 'Localisation', 'MiseEnService', 'ProchCtrl', 'FreqCtrl', 'Statut', 'SiteID', 'ClientID', 'DetectionPerm']);
    
    // Opérations (LOT 16: +SiteID)
    creerOnglet_(ss, SHEETS.MOUVEMENTS, ['ID', 'Date', 'Type', 'Machine', 'Bouteille', 'Fluide', 'EtatFluide', 'Masse', 'PeseeAvant', 'PeseeApres', 'Temp', 'Operateur', 'Validateur', 'DateValid', 'Mode', 'Detecteur', 'HP', 'BP', 'Surch', 'SousRef', 'DeltaT', 'Obs', 'Hash', 'Statut', 'Signature', 'SiteID']);
    creerOnglet_(ss, SHEETS.CONTROLES, ['ID', 'Date', 'Machine', 'Fluide', 'Charge', 'EqCO2', 'Methode', 'Resultat', 'LocFuite', 'Operateur', 'Detecteur', 'Mode', 'ProchCtrl', 'Validateur', 'DateValid', 'Obs', 'Statut', 'SiteID']);
    creerOnglet_(ss, SHEETS.INCIDENTS, ['ID', 'Date', 'Machine', 'Type', 'Description', 'Gravité', 'Actions', 'Responsable', 'Statut', 'Clôture', 'SiteID']);
    creerOnglet_(ss, 'CLIENTS', ['ID', 'Nom', 'Adresse', 'CP', 'Ville', 'SIRET', 'Contact', 'Tel', 'Email', 'Actif']);
    
    // Index & Logs
    creerOnglet_(ss, SHEETS.INDEX_CERFA, ['NumFI', 'Date', 'Mouvement', 'Machine', 'Operateur', 'Mode', 'URL', 'NomFichier']);
    creerOnglet_(ss, SHEETS.AUDIT_LOG, ['Timestamp', 'User', 'Role', 'Categorie', 'Action', 'Objet', 'Ancienne', 'Nouvelle', 'Resultat', 'Details']);
    creerOnglet_(ss, SHEETS.STATS_CACHE, ['Date', 'Type', 'Data']);
    
    // Nettoyage
    ['Feuille 1', 'Sheet1'].forEach(function(n) { try { var f = ss.getSheetByName(n); if (f && ss.getSheets().length > 1) ss.deleteSheet(f); } catch(e) {} });
    
    // Config initiale
    DataStore.setConfig('app_version', APP_VERSION);
    DataStore.setConfig('build_date', APP_BUILD_DATE);
    logAudit_('INSTALL', 'installation', 'v' + APP_VERSION, null, null, 'success');
    
    ui.alert('✅ Installation V' + APP_VERSION + ' réussie !\n\n' +
      '15 onglets créés dont:\n' +
      '- SITES / ATELIERS (multi-site)\n' +
      '- USERS (utilisateurs enrichis)\n\n' +
      'Prochaines étapes:\n' +
      '1. Générer clés API\n' +
      '2. Déployer > Application Web');
  } catch(err) { ui.alert('❌ ' + err.message); }
}

function creerOnglet_(ss, nom, entetes) {
  var sheet = ss.getSheetByName(nom);
  if (!sheet) {
    sheet = ss.insertSheet(nom);
    sheet.appendRow(entetes);
    sheet.getRange(1, 1, 1, entetes.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function recalculerTout_() {
  DataStore.init();
  var machines = DataStore.findAll(SHEETS.MACHINES);
  var count = 0;
  
  machines.forEach(function(row, idx) {
    if (!row[0]) return;
    var charge = parseFloat(row[8]) || parseFloat(row[7]) || 0;
    var prg = getPRGFluide_(row[6]);
    var eqCO2 = calculerEqCO2_(charge, prg);
    var freqCtrl = calculerFrequenceControle_(eqCO2, false);
    
    DataStore.update(SHEETS.MACHINES, idx + 2, 10, [eqCO2]);
    DataStore.update(SHEETS.MACHINES, idx + 2, 14, [freqCtrl]);
    count++;
  });
  
  CACHE_.fluides = null;
  logAudit_('SYSTEM', 'recalcul', count + ' machines', null, null, 'success');
  return successResponse_({ message: count + ' machines recalculées' });
}

function apiSaveConfig_(data) {
  if (data.etablissement) DataStore.setConfig('etablissement', sanitize_(data.etablissement, 200));
  if (data.adresse) DataStore.setConfig('adresse', sanitize_(data.adresse, 300));
  if (data.siret) DataStore.setConfig('siret', sanitize_(data.siret, 20));
  logAudit_('CONFIG', 'modifier', 'config', null, data, 'success');
  return successResponse_({ message: 'Configuration enregistrée' });
}

// ================================================================
// SECTION: CLIENTS / DÉTENTEURS (Cadre 2 CERFA)
// ================================================================

function apiGetClients_(params) {
  var clients = [];
  var data = DataStore.findAll('CLIENTS');
  data.forEach(function(row) {
    if (!row[0]) return;
    clients.push({ id: row[0], nom: row[1], adresse: row[2], cp: row[3], ville: row[4], siret: row[5], contact: row[6], tel: row[7], email: row[8], actif: row[9] !== false });
  });
  return successResponse_(clients);
}

function apiCreateClient_(data) {
  var nom = sanitize_(data.nom, 200);
  if (!nom) return errorResponse_('Nom obligatoire');
  var id = DataStore.generateId('CLI');
  DataStore.insert('CLIENTS', [id, nom, sanitize_(data.adresse, 200), sanitize_(data.cp, 5), sanitize_(data.ville, 100), sanitize_(data.siret, 14), sanitize_(data.contact, 100), sanitize_(data.tel, 20), sanitize_(data.email, 100), true]);
  logAudit_('CLIENT', 'creer', id, null, { nom: nom }, 'success');
  return successResponse_({ id: id });
}

// ================================================================
// SECTION: DÉTECTEURS CRUD
// ================================================================

function apiCreateDetecteur_(data) {
  var marque = sanitize_(data.marque, 100);
  var modele = sanitize_(data.modele, 100);
  if (!marque || !modele) return errorResponse_('Marque et modèle obligatoires');
  var id = DataStore.generateId('DET');
  DataStore.insert(SHEETS.DETECTEURS, [id, marque, modele, data.etalonnage || '', data.prochain || '', 'Actif']);
  logAudit_('DETECTEUR', 'creer', id, null, { marque: marque, modele: modele }, 'success');
  return successResponse_({ id: id });
}

// ================================================================
// SECTION: TRAÇABILITÉ CROISÉE
// ================================================================

function apiGetTracabilite_(params) {
  var type = params.type;
  var id = params.id;
  if (!type || !id) return errorResponse_('Type et ID obligatoires');

  var entite = null;
  var mouvements = [];
  var controles = [];
  var cerfas = [];

  // Récupérer l'entité
  if (type === 'machine') {
    var m = DataStore.findById(SHEETS.MACHINES, id);
    if (m.ok) {
      entite = { code: m.data[0], nom: m.data[1], type: m.data[2], marque: m.data[3], modele: m.data[4], serie: m.data[5], fluide: m.data[6], chargeNom: m.data[7], chargeAct: m.data[8], eqCO2: m.data[9], localisation: m.data[10], miseEnService: formatDate_(m.data[11]), prochainControle: formatDate_(m.data[12]), statut: m.data[14] };
      // Client lié
      if (m.data[16]) {
        var cli = DataStore.findById('CLIENTS', m.data[16]);
        if (cli.ok) entite.client = { id: cli.data[0], nom: cli.data[1], siret: cli.data[5], ville: cli.data[4] };
      }
    }
  } else if (type === 'bouteille') {
    var b = DataStore.findById(SHEETS.BOUTEILLES, id);
    if (b.ok) entite = { code: b.data[0], categorie: b.data[1], fluide: b.data[2], etatFluide: b.data[3], marque: b.data[4], tare: b.data[5], contenance: b.data[6], stockActuel: b.data[7], fournisseur: b.data[10], lot: b.data[11], statut: b.data[12] };
  } else if (type === 'fluide') {
    var f = DataStore.findById(SHEETS.FLUIDES, id);
    if (f.ok) entite = { code: f.data[0], nom: f.data[1], prg: f.data[2], famille: f.data[3], securite: f.data[4] };
  } else if (type === 'operateur') {
    var u = findUser_(id);
    if (u.ok) entite = { id: u.user.id, nom: u.user.nom, prenom: u.user.prenom, role: u.user.role, attestation: u.user.attestation };
  }

  // Mouvements liés
  DataStore.findAll(SHEETS.MOUVEMENTS).forEach(function(row) {
    if (!row[0]) return;
    var match = false;
    if (type === 'machine' && row[3] === id) match = true;
    if (type === 'bouteille' && row[4] === id) match = true;
    if (type === 'fluide' && row[5] === id) match = true;
    if (type === 'operateur' && row[11] === id) match = true;
    if (match) {
      mouvements.push({ id: row[0], date: formatDateTime_(row[1]), type: row[2], machine: row[3], bouteille: row[4], fluide: row[5], masse: row[7], operateur: row[11], validateur: row[12], mode: row[14], statut: row[23] });
    }
  });

  // Contrôles liés
  DataStore.findAll(SHEETS.CONTROLES).forEach(function(row) {
    if (!row[0]) return;
    var match = false;
    if (type === 'machine' && row[2] === id) match = true;
    if (type === 'fluide' && row[3] === id) match = true;
    if (type === 'operateur' && row[9] === id) match = true;
    if (type === 'bouteille') match = false; // pas de contrôle sur bouteille
    if (match) {
      controles.push({ id: row[0], date: formatDateTime_(row[1]), machine: row[2], fluide: row[3], methode: row[6], resultat: row[7], operateur: row[9], mode: row[11], prochainControle: formatDate_(row[12]) });
    }
  });

  // CERFAs liés
  DataStore.findAll(SHEETS.INDEX_CERFA).forEach(function(row) {
    if (!row[0]) return;
    var match = false;
    if (type === 'machine' && row[3] === id) match = true;
    if (type === 'operateur' && row[4] === id) match = true;
    // Pour bouteille/fluide, chercher via le mouvement
    if (type === 'bouteille' || type === 'fluide') {
      var mvt = mouvements.find(function(m) { return m.id === row[2]; });
      if (mvt) match = true;
    }
    if (match) {
      cerfas.push({ id: row[0], date: formatDateTime_(row[1]), mouvement: row[2], machine: row[3], operateur: row[4], mode: row[5], urlPdf: row[6] });
    }
  });

  return successResponse_({ entite: entite, mouvements: mouvements, controles: controles, cerfas: cerfas });
}

// ================================================================
// SECTION: BILAN ANNUEL (format ADEME)
// ================================================================

function apiGetBilanAnnuel_(params) {
  var annee = parseInt(params.annee) || new Date().getFullYear();
  var filtreFluide = params.fluide || null;

  var bilans = {};

  // Collecter les mouvements de l'année
  DataStore.findAll(SHEETS.MOUVEMENTS).forEach(function(row) {
    if (!row[0]) return;
    var date = new Date(row[1]);
    if (date.getFullYear() !== annee) return;
    if (row[23] !== 'valide') return;

    var fluide = row[5];
    if (filtreFluide && fluide !== filtreFluide) return;

    if (!bilans[fluide]) {
      var fInfo = DataStore.findById(SHEETS.FLUIDES, fluide);
      bilans[fluide] = {
        fluide: { code: fluide, nom: fInfo.ok ? fInfo.data[1] : '', prg: fInfo.ok ? fInfo.data[2] : 0 },
        mouvements: [], nbInterventions: 0,
        J_chargesNeufs: 0, K_chargesMaintenance: 0, M_recupHorsUsage: 0, N_recupMaintenance: 0, R_recycles: 0,
        L_totalCharges: 0, O_totalRecup: 0, stockActuelNeuf: 0, stockActuelUsage: 0
      };
    }

    var b = bilans[fluide];
    var masse = parseFloat(row[7]) || 0;
    var type = row[2];
    var etatFluide = row[6] || 'Neuf';
    var isRecycle = etatFluide === 'Recyclé';

    // Chercher le CERFA lié
    var cerfa = null, cerfaUrl = null;
    DataStore.findAll(SHEETS.INDEX_CERFA).forEach(function(c) { if (c[2] === row[0]) { cerfa = c[0]; cerfaUrl = c[6]; } });

    // Chercher le nom de la machine
    var machineNom = '';
    var machData = DataStore.findById(SHEETS.MACHINES, row[3]);
    if (machData.ok) machineNom = machData.data[1] || '';

    b.mouvements.push({ id: row[0], date: formatDateTime_(row[1]), type: type, machine: row[3], machineNom: machineNom, bouteille: row[4], fluide: fluide, etatFluide: etatFluide, masse: masse, operateur: row[11], mode: row[14], cerfa: cerfa, cerfaUrl: cerfaUrl });
    b.nbInterventions++;

    if (type === 'MiseEnService' || type === 'Charge') { b.J_chargesNeufs += masse; }
    else if (type === 'Appoint') { b.K_chargesMaintenance += masse; }
    else if (type === 'Vidange') { b.M_recupHorsUsage += masse; }
    else if (type === 'Recuperation') {
      if (isRecycle) { b.R_recycles += masse; }
      else { b.N_recupMaintenance += masse; }
    }
  });

  // Calculer totaux et stocks
  for (var code in bilans) {
    var b = bilans[code];
    b.J_chargesNeufs = Math.round(b.J_chargesNeufs * 1000) / 1000;
    b.K_chargesMaintenance = Math.round(b.K_chargesMaintenance * 1000) / 1000;
    b.M_recupHorsUsage = Math.round(b.M_recupHorsUsage * 1000) / 1000;
    b.N_recupMaintenance = Math.round(b.N_recupMaintenance * 1000) / 1000;
    b.R_recycles = Math.round(b.R_recycles * 1000) / 1000;
    b.L_totalCharges = Math.round((b.J_chargesNeufs + b.K_chargesMaintenance) * 1000) / 1000;
    b.O_totalRecup = Math.round((b.M_recupHorsUsage + b.N_recupMaintenance) * 1000) / 1000;

    // Stock actuel depuis les bouteilles
    DataStore.findAll(SHEETS.BOUTEILLES).forEach(function(row) {
      if (row[2] === code) {
        var masse = parseFloat(row[7]) || 0;
        if (row[3] === 'Neuf') b.stockActuelNeuf += masse;
        else b.stockActuelUsage += masse;
      }
    });
    b.stockActuelNeuf = Math.round(b.stockActuelNeuf * 1000) / 1000;
    b.stockActuelUsage = Math.round(b.stockActuelUsage * 1000) / 1000;
  }

  return successResponse_({ annee: annee, bilans: bilans });
}

// ================================================================
// SECTION: INIT FLUIDES PAR DÉFAUT
// ================================================================

function apiInitFluides_() {
  var fluides = [
    ['R32', 'Difluorométhane', 675, 'HFC', 'A2L', false],
    ['R410A', 'Mélange R32/R125', 2088, 'HFC', 'A1', false],
    ['R134a', 'Tétrafluoroéthane', 1430, 'HFC', 'A1', false],
    ['R404A', 'Mélange HFC', 3922, 'HFC', 'A1', false],
    ['R407C', 'Mélange HFC', 1774, 'HFC', 'A1', false],
    ['R407F', 'Mélange HFC', 1825, 'HFC', 'A1', false],
    ['R449A', 'Mélange HFO/HFC', 1397, 'HFO', 'A1', false],
    ['R448A', 'Mélange HFO/HFC', 1387, 'HFO', 'A1', false],
    ['R290', 'Propane', 3, 'HC', 'A3', false],
    ['R600a', 'Isobutane', 3, 'HC', 'A3', false],
    ['R744', 'CO2', 1, 'Naturel', 'A1', false],
    ['R1234yf', 'Tétrafluoropropène', 4, 'HFO', 'A2L', false],
    ['R1234ze', 'Trans-1,3,3,3-TFP', 7, 'HFO', 'A2L', false],
    ['R513A', 'Mélange HFO/HFC', 631, 'HFO', 'A1', false]
  ];
  var count = 0;
  fluides.forEach(function(f) {
    var existe = DataStore.findById(SHEETS.FLUIDES, f[0]);
    if (!existe.ok) { DataStore.insert(SHEETS.FLUIDES, f); count++; }
  });
  CACHE_.fluides = null;
  return successResponse_({ message: count + ' fluides ajoutés' });
}

// ================================================================
// SECTION: PREVIEW CERFA (HTML)
// ================================================================

function apiPreviewCerfa_() {
  // Récupérer la config opérateur pour pré-remplir le cadre 1
  var config = {};
  DataStore.findAll(SHEETS.CONFIG).forEach(function(row) { if (row[0]) config[row[0]] = row[1]; });

  var donnees = {
    numFI: 'APERÇU',
    mode: 'FORMATION',
    estApercu: true,
    dateGeneration: formatDateTime_(new Date()),
    dateIntervention: '',
    operateur: {
      raisonSociale: config.etablissement || '',
      siret: config.siret || '',
      adresse: config.adresse || '',
      attestation: '',
      validiteAttestation: '',
      nomComplet: ''
    },
    detenteur: {},
    circuit: {},
    intervention: {},
    controle: {},
    detectionPermanente: '',
    observations: ''
  };

  var html = genererCerfaHTML_(donnees);
  return successResponse_({ html: html });
}

// ================================================================
// SECTION: TRACKDÉCHETS (stubs)
// ================================================================

function apiGetTrackdechetsStatus_() {
  var token = DataStore.getConfig('trackdechets_token');
  var url = DataStore.getConfig('trackdechets_url') || '';
  var enabled = DataStore.getConfig('trackdechets_enabled') === 'true';
  return successResponse_({ tokenConfigured: !!token, enabled: enabled, ready: !!token && enabled, url: url, mode: url.indexOf('sandbox') >= 0 ? 'Sandbox' : 'Production' });
}

function apiConfigTrackdechets_(params) {
  if (params.token) DataStore.setConfig('trackdechets_token', sanitize_(params.token, 200));
  if (params.url) DataStore.setConfig('trackdechets_url', sanitize_(params.url, 200));
  DataStore.setConfig('trackdechets_enabled', params.enabled === 'true' ? 'true' : 'false');
  logAudit_('CONFIG', 'trackdechets', 'config', null, { enabled: params.enabled }, 'success');
  var testResult = 'Token enregistré';
  if (params.token) {
    try {
      var resp = UrlFetchApp.fetch((params.url || 'https://api.sandbox.trackdechets.beta.gouv.fr'), { method: 'post', contentType: 'application/json', headers: { 'Authorization': 'Bearer ' + params.token }, payload: JSON.stringify({ query: '{ me { id name } }' }), muteHttpExceptions: true });
      var json = JSON.parse(resp.getContentText());
      testResult = json.data && json.data.me ? 'Connecté : ' + json.data.me.name : 'Token invalide';
    } catch(e) { testResult = 'Erreur connexion : ' + e.message; }
  }
  return successResponse_({ connectionTest: testResult });
}

function apiListBsffs_() {
  var token = DataStore.getConfig('trackdechets_token');
  var url = DataStore.getConfig('trackdechets_url');
  if (!token || !url) return errorResponse_('Trackdéchets non configuré');
  try {
    var resp = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', headers: { 'Authorization': 'Bearer ' + token }, payload: JSON.stringify({ query: '{ bsffs(first: 20) { totalCount edges { node { id status waste { code } weight { value } createdAt } } } }' }), muteHttpExceptions: true });
    return successResponse_(JSON.parse(resp.getContentText()));
  } catch(e) { return errorResponse_('Erreur API Trackdéchets: ' + e.message); }
}

function apiCreerBsff_(params) {
  var token = DataStore.getConfig('trackdechets_token');
  var url = DataStore.getConfig('trackdechets_url');
  if (!token || !url) return errorResponse_('Trackdéchets non configuré');
  var mvt = DataStore.findById(SHEETS.MOUVEMENTS, params.id);
  if (!mvt.ok) return errorResponse_('Mouvement non trouvé');
  logAudit_('BSFF', 'creer', params.id, null, null, 'stub');
  return successResponse_({ bsffId: 'STUB-' + params.id, message: 'Intégration BSFF en cours de développement' });
}

function apiGenererCerfaPrecharge_(params) {
  var machine = params.machine;
  var machOk = DataStore.findById(SHEETS.MACHINES, machine);
  if (!machOk.ok) return errorResponse_('Machine non trouvée');

  var mode = params.mode === 'OFFICIEL' ? 'OFFICIEL' : 'FORMATION';
  var prefixe = mode === 'OFFICIEL' ? 'FI' : 'FORM';
  var numFI = DataStore.generateId(prefixe);
  var charge = parseFloat(machOk.data[8]) || parseFloat(machOk.data[7]) || 0;
  var nomFichier = numFI + '_' + machine + '_precharge';
  var operateurId = sanitize_(params.operateur, 100);

  // Construire un faux mvtData pour la précharge (mise en service usine)
  // On simule un mouvement MiseEnService avec la charge usine
  var fakeMvtData = [];
  fakeMvtData[1] = new Date();       // Date
  fakeMvtData[2] = 'MiseEnService';  // Type
  fakeMvtData[3] = machine;          // Machine
  fakeMvtData[4] = '';               // Bouteille (précharge = pas de bouteille)
  fakeMvtData[5] = machOk.data[6];   // Fluide
  fakeMvtData[6] = 'Neuf';           // État fluide (précharge usine = neuf)
  fakeMvtData[7] = charge;           // Masse
  fakeMvtData[11] = operateurId;     // Opérateur
  fakeMvtData[14] = mode;            // Mode
  fakeMvtData[15] = '';              // Détecteur
  fakeMvtData[21] = 'Précharge usine — fluide neuf origine constructeur'; // Observations

  var donnees = collecterDonneesCerfa_(fakeMvtData, machine, operateurId, mode);
  donnees.numFI = numFI;

  // Générer HTML et texte brut
  var htmlContent = genererCerfaHTML_(donnees);
  var texteBrut = genererCerfaTexteBrut_(donnees);

  // Sauvegarder en HTML sur Drive
  var file = DriveApp.getRootFolder().createFile(Utilities.newBlob(htmlContent, 'text/html', nomFichier + '.html'));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  DataStore.insert(SHEETS.INDEX_CERFA, [numFI, new Date(), 'PRECHARGE', machine, operateurId, mode, file.getUrl(), nomFichier]);
  logAudit_('CERFA', 'genererPrecharge', numFI, null, { machine: machine, charge: charge, mode: mode }, 'success');

  return successResponse_({ id: numFI, html: htmlContent, contenu: texteBrut, urlPdf: file.getUrl(), url: file.getUrl(), nomFichier: nomFichier, mode: mode });
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🧊 inerWeb Fluides')
    .addItem('📦 Installer V' + APP_VERSION, 'INSTALLER_INERWEB')
    .addSeparator()
    .addItem('🔑 Générer clés API', 'genererClesAPI')
    .addItem('🔄 Recalculer tout', 'recalculerToutMenu')
    .addSeparator()
    .addItem('📊 Stats avancées', 'afficherStats')
    .addItem('⚠️ Alertes réglementaires', 'afficherAlertes')
    .addSeparator()
    .addItem('ℹ️ À propos', 'afficherAPropos')
    .addToUi();
}

function afficherAPropos() {
  SpreadsheetApp.getUi().alert(APP_NAME + ' v' + APP_VERSION, 
    'Build: ' + APP_BUILD_DATE + '\n\n' +
    '🆕 Nouveautés V7:\n' +
    '• Multi-site / multi-atelier\n' +
    '• Utilisateurs enrichis\n' +
    '• Stats avancées + tendances\n' +
    '• Alertes réglementaires\n' +
    '• Exports pro\n' +
    '• Abstraction backend\n\n' +
    'CERFA 15497*04 | F-Gas UE 2024/573\n\n© 2026 inerWeb', 
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function recalculerToutMenu() {
  var result = recalculerTout_();
  SpreadsheetApp.getUi().alert(result.success ? '✅ ' + result.data.message : '❌ ' + result.error);
}

function afficherStats() {
  var stats = apiGetStatsAvancees_({}).data;
  SpreadsheetApp.getUi().alert('📊 Statistiques',
    'Mouvements: ' + stats.mouvements.total + '\n' +
    'Charges: ' + stats.mouvements.charges.toFixed(2) + ' kg\n' +
    'Récupérations: ' + stats.mouvements.recuperations.toFixed(2) + ' kg\n' +
    'Contrôles: ' + stats.controles.total + ' (' + stats.controles.tauxConformite + '% conformes)\n' +
    'Parc: ' + stats.parc.machines + ' machines, ' + stats.parc.eqCO2Total + ' t CO2',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function afficherAlertes() {
  var alertes = apiGetAlertesReglementaires_().data;
  var msg = '⚠️ ALERTES RÉGLEMENTAIRES\n\n';
  msg += 'Attestations: ' + alertes.attestations.length + '\n';
  msg += 'Contrôles: ' + alertes.controles.length + '\n';
  msg += 'Fuites non résolues: ' + alertes.fuites.length + '\n';
  msg += 'Stock bas: ' + alertes.stock.length;
  SpreadsheetApp.getUi().alert(msg);
}

// ================================================================
// SECTION: MAIN ROUTES
// ================================================================

function doGet(e) {
  try {
    DataStore.init();
    var action = e.parameter.action || 'ping';
    var auth = checkAuth_(e.parameter.key || '', ACTION_LEVELS[action] || 'READ');
    if (!auth.ok) return jsonResponse_(errorResponse_(auth.error, 'AUTH'));
    
    var result;
    switch(action) {
      case 'ping': result = successResponse_({ message: 'pong', version: APP_VERSION, buildDate: APP_BUILD_DATE }); break;
      case 'getConfig': result = apiGetConfig_(); break;
      case 'getMachines': result = apiGetMachines_(e.parameter); break;
      case 'getBouteilles': result = apiGetBouteilles_(e.parameter); break;
      case 'getTechniciens': result = apiGetTechniciens_(); break;
      case 'getUsers': result = apiGetTechniciens_(); break;
      case 'getFluides': result = apiGetFluides_(); break;
      case 'getDetecteurs': result = apiGetDetecteurs_(); break;
      case 'getMouvements': result = apiGetMouvements_(e.parameter.limit, e.parameter); break;
      case 'getControles': result = apiGetControles_(e.parameter.limit, e.parameter); break;
      case 'getAlertes': result = apiGetAlertes_(); break;
      case 'getAlertesReglementaires': result = apiGetAlertesReglementaires_(); break;
      case 'getDashboard': result = apiGetDashboard_(e.parameter); break;
      case 'getCerfa': result = apiGetCerfa_(e.parameter.id); break;
      case 'getAuditLog': result = apiGetAuditLog_(e.parameter); break;
      case 'getAuditStats': result = apiGetAuditStats_(e.parameter); break;
      case 'getStatsAvancees': result = apiGetStatsAvancees_(e.parameter); break;
      case 'getSites': result = apiGetSites_(); break;
      case 'getAteliers': result = apiGetAteliers_(e.parameter); break;
      case 'getUserRole': result = successResponse_({ role: getUserRole_(e.parameter.userId) }); break;
      case 'getClients': result = apiGetClients_(e.parameter); break;
      case 'createClient': result = apiCreateClient_(e.parameter); break;
      case 'createDetecteur': result = apiCreateDetecteur_(e.parameter); break;
      case 'getTracabilite': result = apiGetTracabilite_(e.parameter); break;
      case 'getBilanAnnuel': result = apiGetBilanAnnuel_(e.parameter); break;
      case 'previewCerfa': result = apiPreviewCerfa_(); break;
      case 'initFluides': result = apiInitFluides_(); break;
      case 'getTrackdechetsStatus': result = apiGetTrackdechetsStatus_(); break;
      case 'configTrackdechets': result = apiConfigTrackdechets_(e.parameter); break;
      case 'listBsffs': result = apiListBsffs_(); break;
      case 'creerBsff': result = apiCreerBsff_(e.parameter); break;
      case 'genererCerfaPrecharge': result = apiGenererCerfaPrecharge_(e.parameter); break;
      case 'exportRegistreFluides': result = apiExportRegistreFluides_(e.parameter); break;
      case 'exportHistoriqueMachine': result = apiExportHistoriqueMachine_(e.parameter); break;
      case 'exportHistoriqueBouteille': result = apiExportHistoriqueBouteille_(e.parameter); break;
      case 'exportControlesAVenir': result = apiExportControlesAVenir_(); break;
      case 'exportBilanAnnuel': result = apiExportBilanAnnuel_(e.parameter); break;
      case 'exportActiviteEleve': result = apiExportActiviteEleve_(e.parameter); break;
      case 'exportSyntheseAtelier': result = apiExportSyntheseAtelier_(e.parameter); break;
      case 'exportValidationsEnseignant': result = apiExportValidationsEnseignant_(e.parameter); break;
      case 'exportPro': result = apiExportPro_(e.parameter); break;
      default: result = errorResponse_('Action inconnue', 'UNKNOWN');
    }
    return jsonResponse_(result);
  } catch(err) { return jsonResponse_(errorResponse_(err.message, 'SERVER')); }
}

function doPost(e) {
  try {
    DataStore.init();
    var data = JSON.parse(e.postData.contents);
    var auth = checkAuth_(data.key || '', ACTION_LEVELS[data.action] || 'ADMIN');
    if (!auth.ok) return jsonResponse_(errorResponse_(auth.error, 'AUTH'));
    
    if (data.action === 'login') return jsonResponse_(apiLogin_(data));
    
    var userId = data.operateur || data.validateur || '';
    var role = userId ? getUserRole_(userId) : ROLES.ELEVE;
    
    var PERM_MAP = { createMachine: 'creerMachine', createBouteille: 'creerBouteille', validerMouvement: 'validerMouvement', annulerMouvement: 'annulerMouvement', genererCerfa: 'genererCerfa', createSite: 'gererSites', createAtelier: 'gererSites', createUser: 'gererUsers', saveConfig: 'modifierConfig' };
    
    if (PERM_MAP[data.action] && !hasPermission_(role, PERM_MAP[data.action])) {
      logAudit_('SECURITY', 'refus', data.action, { userId: userId, role: role }, PERM_MAP[data.action], 'blocked');
      return jsonResponse_(errorResponse_('Permission refusée: ' + PERM_MAP[data.action], 'PERM'));
    }
    
    var result;
    switch(data.action) {
      case 'createMouvement': result = apiCreateMouvement_(data); break;
      case 'createControle': result = apiCreateControle_(data); break;
      case 'createMachine': result = apiCreateMachine_(data); break;
      case 'createBouteille': result = apiCreateBouteille_(data); break;
      case 'validerMouvement': result = apiValiderMouvement_(data); break;
      case 'annulerMouvement': result = apiAnnulerMouvement_(data); break;
      case 'genererCerfa': result = apiGenererCerfa_(data); break;
      case 'recalculerTout': result = recalculerTout_(); break;
      case 'createSite': result = apiCreateSite_(data); break;
      case 'createAtelier': result = apiCreateAtelier_(data); break;
      case 'createUser': result = apiCreateUser_(data); break;
      case 'saveConfig': result = apiSaveConfig_(data); break;
      default: result = errorResponse_('Action inconnue', 'UNKNOWN');
    }
    return jsonResponse_(result);
  } catch(err) { return jsonResponse_(errorResponse_(err.message, 'SERVER')); }
}
