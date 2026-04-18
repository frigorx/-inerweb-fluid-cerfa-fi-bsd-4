/**
 * inerWeb TP — Extension Apps Script pour les relevés TP
 * Ajoute l'action `createReleveTP` au backend existant.
 *
 * MODE D'EMPLOI :
 * 1. Ouvrir le projet Apps Script (clasp ou interface web).
 * 2. Copier le contenu de ce fichier dans un nouveau fichier `releves_tp.gs`
 *    (ou le coller à la fin de Code.gs).
 * 3. Dans doGet()/doPost(), router l'action 'createReleveTP' et 'getReleves' vers
 *    les fonctions ci-dessous (voir handleReleveTpAction).
 * 4. Redéployer l'application web (Deploy → Manage deployments → Edit → Deploy).
 *
 * STRUCTURE DE LA FEUILLE (créée automatiquement si absente) :
 * RELEVES_TP :
 *   id, timestamp, eleve, classe, bouteille_code, bouteille_reelle_id,
 *   marque, numSerie, type, capacite_L, fluide,
 *   tare_kg, masse_brute_kg, masse_nette_kg, tCO2eq,
 *   note_sur_20, pourcentage, auto_validation,
 *   detail_json
 */

var SHEET_RELEVES_TP = 'RELEVES_TP';

var HEADERS_RELEVES_TP = [
  'id', 'timestamp', 'eleve', 'classe', 'bouteille_code',
  'marque', 'num_serie', 'type', 'capacite_L', 'fluide',
  'tare_kg', 'masse_brute_kg', 'masse_nette_kg', 'tCO2eq',
  'note_sur_20', 'note_max', 'pourcentage', 'auto_validation',
  'detail_reponses_json', 'detail_competences_json'
];

/**
 * Initialise la feuille RELEVES_TP si elle n'existe pas.
 */
function ensureReleveTpSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_RELEVES_TP);
  if (!sh) {
    sh = ss.insertSheet(SHEET_RELEVES_TP);
    sh.getRange(1, 1, 1, HEADERS_RELEVES_TP.length).setValues([HEADERS_RELEVES_TP]);
    sh.getRange(1, 1, 1, HEADERS_RELEVES_TP.length)
      .setFontWeight('bold')
      .setBackground('#1b3a63')
      .setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setColumnWidths(1, HEADERS_RELEVES_TP.length, 120);
  }
  return sh;
}

/**
 * Ajoute un relevé TP dans la feuille.
 * payload (object) : { eleve, classe, ts, bouteille_code, reponses, notation, auto_validation }
 */
function createReleveTP(payload) {
  var sh = ensureReleveTpSheet_();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var id = 'TP-' + new Date().getTime() + '-' + Math.floor(Math.random() * 10000);
    var r = payload.reponses || {};
    var n = payload.notation || { noteTotal: 0, noteMax: 20, pourcentage: 0, parCompetence: {} };
    var row = [
      id,
      payload.ts || new Date().toISOString(),
      payload.eleve || '',
      payload.classe || '',
      payload.bouteille_code || '',
      r.marque || '',
      r.numSerie || '',
      r.type || '',
      r.capacite || '',
      r.fluide || '',
      r.tare_kg == null ? '' : r.tare_kg,
      r.masse_brute_kg == null ? '' : r.masse_brute_kg,
      r.masse_nette_kg == null ? '' : r.masse_nette_kg,
      r.tCO2eq == null ? '' : r.tCO2eq,
      n.noteTotal,
      n.noteMax,
      n.pourcentage,
      payload.auto_validation ? 'OUI' : 'NON',
      JSON.stringify(r),
      JSON.stringify(n.parCompetence || {})
    ];
    sh.appendRow(row);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: String(e) };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/**
 * Récupère les relevés (tout, ou filtrés par classe / élève).
 * params : { classe?, eleve?, bouteille? }
 */
function getReleves(params) {
  var sh = ensureReleveTpSheet_();
  var last = sh.getLastRow();
  if (last < 2) return { success: true, data: [] };
  var values = sh.getRange(2, 1, last - 1, HEADERS_RELEVES_TP.length).getValues();
  var out = values.map(function (row) {
    var o = {};
    HEADERS_RELEVES_TP.forEach(function (h, i) { o[h] = row[i]; });
    return o;
  });
  if (params) {
    if (params.classe) out = out.filter(function (x) { return x.classe === params.classe; });
    if (params.eleve)  out = out.filter(function (x) { return x.eleve === params.eleve; });
    if (params.bouteille) out = out.filter(function (x) { return x.bouteille_code === params.bouteille; });
  }
  return { success: true, data: out, count: out.length };
}

/**
 * Agrégat : consolide le meilleur relevé validé par bouteille en un inventaire final.
 * Utilisable pour alimenter automatiquement la feuille BOUTEILLES de inerWeb Fluide.
 */
function getInventaireConsolide() {
  var res = getReleves({});
  if (!res.success) return res;
  var meilleurs = {}; // bouteille_code → meilleur relevé auto-validé
  res.data.forEach(function (r) {
    if (r.auto_validation !== 'OUI') return;
    var ex = meilleurs[r.bouteille_code];
    if (!ex || Number(r.note_sur_20) > Number(ex.note_sur_20)) {
      meilleurs[r.bouteille_code] = r;
    }
  });
  return { success: true, data: Object.values(meilleurs) };
}

/**
 * Routeur à intégrer dans le doGet()/doPost() existant.
 * Exemple d'intégration :
 *
 *   function doGet(e) {
 *     var action = (e.parameter && e.parameter.action) || '';
 *     var r = handleReleveTpAction(action, e);
 *     if (r !== null) return ContentService.createTextOutput(JSON.stringify(r))
 *                        .setMimeType(ContentService.MimeType.JSON);
 *     // ... reste du routing existant ...
 *   }
 *
 *   function doPost(e) {
 *     var body = {};
 *     try { body = JSON.parse(e.postData.contents); } catch(_) {}
 *     var action = (e.parameter && e.parameter.action) || body.action || '';
 *     var r = handleReleveTpAction(action, e, body);
 *     if (r !== null) return ContentService.createTextOutput(JSON.stringify(r))
 *                        .setMimeType(ContentService.MimeType.JSON);
 *     // ... reste du routing existant ...
 *   }
 */
function handleReleveTpAction(action, e, body) {
  if (action === 'createReleveTP') {
    var payload = body || {};
    // Si les données viennent en query (GET), on reconstitue l'objet
    if (!payload.eleve && e && e.parameter) payload = e.parameter;
    // Les sous-objets peuvent être des chaînes JSON
    if (typeof payload.reponses === 'string') {
      try { payload.reponses = JSON.parse(payload.reponses); } catch (_) {}
    }
    if (typeof payload.notation === 'string') {
      try { payload.notation = JSON.parse(payload.notation); } catch (_) {}
    }
    return createReleveTP(payload);
  }
  if (action === 'getReleves') {
    return getReleves((e && e.parameter) || {});
  }
  if (action === 'getInventaireConsolide') {
    return getInventaireConsolide();
  }
  return null; // action non gérée ici → laisser le reste du routing s'en occuper
}
