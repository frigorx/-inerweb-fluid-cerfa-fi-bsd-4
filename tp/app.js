/**
 * inerWeb TP — Application mini-PWA
 * Mode « exercice d'inventaire » pour filière Froid & Climatisation.
 *
 * Flux :
 *   1. Login élève (prénom + classe)
 *   2. Scan QR ou saisie manuelle → charge la bouteille
 *   3. Identification (marque, n°, type, capacité, fluide étiquette)
 *   4. Consigne balance (démarrer / peser / arrêter)
 *   5. Saisie tare + masse brute
 *   6. Calcul élève masse nette
 *   7. Calcul élève tCO2eq
 *   8. Auto-correction + note /20
 *   9. Envoi vers RELEVES_TP (Apps Script) — stub localStorage pour l'instant
 */

// ==========================================================================
// ÉTAT GLOBAL
// ==========================================================================
const state = {
  user: null,              // { prenom, classe }
  bouteille: null,         // objet BOUTEILLES_REELLES courant
  reponses: {},            // réponses de l'élève
  notation: null,          // résultat auto-correction
  apiUrl: localStorage.getItem('tp_api_url') || '' // URL Apps Script
};

// ==========================================================================
// NAVIGATION
// ==========================================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const scr = document.getElementById(id);
  if (scr) {
    scr.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ==========================================================================
// LOGIN
// ==========================================================================
function handleLogin(e) {
  e.preventDefault();
  const prenom = document.getElementById('prenom').value.trim();
  const classe = document.getElementById('classe').value.trim();
  if (!prenom || !classe) return;
  state.user = { prenom, classe, timestamp: new Date().toISOString() };
  localStorage.setItem('tp_user', JSON.stringify(state.user));
  document.getElementById('user-info').textContent = `${prenom} — ${classe}`;
  showScreen('screen-scan');
}

// Restaurer user si déjà connecté
function restoreUser() {
  const saved = localStorage.getItem('tp_user');
  if (saved) {
    try {
      state.user = JSON.parse(saved);
      document.getElementById('user-info').textContent = `${state.user.prenom} — ${state.user.classe}`;
      return true;
    } catch (e) { return false; }
  }
  return false;
}

function handleLogout() {
  localStorage.removeItem('tp_user');
  state.user = null;
  showScreen('screen-login');
}

// ==========================================================================
// SCAN QR / SAISIE MANUELLE
// ==========================================================================
function handleManualCode() {
  const code = document.getElementById('code-manuel').value.trim().toUpperCase();
  if (!code) return alert('Saisis le code TP-Bxx de la bouteille.');
  loadBouteille(code);
}

function loadBouteille(code) {
  const b = getBouteille(code);
  if (!b) {
    alert(`Code "${code}" inconnu. Vérifie l'étiquette QR ou demande au professeur.`);
    return;
  }
  state.bouteille = b;
  state.reponses = { tp_code: code, ts: new Date().toISOString() };
  renderIdentification();
  showScreen('screen-identification');
}

// QR camera : utilise l'API BarcodeDetector (natif navigateur, pas de lib externe)
let qrStream = null;
async function startQRScan() {
  if (!('BarcodeDetector' in window)) {
    alert("Ton navigateur ne supporte pas le scan natif. Utilise la saisie manuelle.");
    return;
  }
  showScreen('screen-qr');
  const detector = new BarcodeDetector({ formats: ['qr_code'] });
  const video = document.getElementById('qr-video');
  try {
    qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = qrStream;
    await video.play();

    const tick = async () => {
      if (!qrStream) return;
      try {
        const codes = await detector.detect(video);
        if (codes.length > 0) {
          const url = codes[0].rawValue;
          // Extraire le param ?b=TP-Bxx
          const m = url.match(/[?&]b=([A-Za-z0-9-]+)/);
          if (m) {
            stopQRScan();
            loadBouteille(m[1].toUpperCase());
            return;
          }
          // Fallback : juste un code
          if (/^TP-B\d+$/i.test(url)) {
            stopQRScan();
            loadBouteille(url.toUpperCase());
            return;
          }
        }
      } catch (e) { /* ignore */ }
      requestAnimationFrame(tick);
    };
    tick();
  } catch (e) {
    alert('Impossible d\'accéder à la caméra : ' + e.message);
  }
}
function stopQRScan() {
  if (qrStream) {
    qrStream.getTracks().forEach(t => t.stop());
    qrStream = null;
  }
}

// ==========================================================================
// ÉTAPE 1 : IDENTIFICATION
// ==========================================================================
function renderIdentification() {
  document.getElementById('ident-bouteille').textContent = state.bouteille.code;

  // Marque
  const selMarque = document.getElementById('f-marque');
  selMarque.innerHTML = '<option value="">-- Choisis --</option>' +
    MARQUES.map(m => `<option value="${m}">${m}</option>`).join('');

  // Type
  const selType = document.getElementById('f-type');
  selType.innerHTML = '<option value="">-- Choisis --</option>' +
    TYPES_BOUTEILLE.map(t => `<option value="${t.code}">${t.label}</option>`).join('');

  // Capacité
  const selCap = document.getElementById('f-capacite');
  selCap.innerHTML = '<option value="">-- Choisis --</option>' +
    CAPACITES.map(c => `<option value="${c.valeur}">${c.label}</option>`).join('');

  // Fluide étiquette
  const selFluide = document.getElementById('f-fluide-etq');
  selFluide.innerHTML = '<option value="">-- Choisis --</option>' +
    FLUIDES.map(f => `<option value="${f.code}">${f.code} — ${f.nom}</option>`).join('');

  // Reset inputs
  document.getElementById('f-numserie').value = '';
}

function submitIdentification(e) {
  e.preventDefault();
  state.reponses.marque   = document.getElementById('f-marque').value;
  state.reponses.numSerie = document.getElementById('f-numserie').value.trim();
  state.reponses.type     = document.getElementById('f-type').value;
  state.reponses.capacite = parseInt(document.getElementById('f-capacite').value, 10);
  state.reponses.fluide   = document.getElementById('f-fluide-etq').value;

  // Rappel : si pas d'étiquette lisible → manomètre
  if (!state.reponses.fluide || state.reponses.fluide === 'VIDE') {
    showScreen('screen-manometre');
  } else {
    showScreen('screen-balance');
  }
}

// ==========================================================================
// ÉTAPE 2 (optionnelle) : MANOMÈTRE si pas d'étiquette
// ==========================================================================
function submitManometre(e) {
  e.preventDefault();
  state.reponses.pression_bar = parseFloat(document.getElementById('f-pression').value);
  state.reponses.temperature_c = parseFloat(document.getElementById('f-temp').value);
  state.reponses.fluide_deduit = document.getElementById('f-fluide-deduit').value;

  // On remonte le fluide déduit comme fluide de travail
  if (state.reponses.fluide_deduit) {
    state.reponses.fluide = state.reponses.fluide_deduit;
  }
  showScreen('screen-balance');
}

function renderManometre() {
  const sel = document.getElementById('f-fluide-deduit');
  sel.innerHTML = '<option value="">-- À déduire de la relation P/T --</option>' +
    FLUIDES.filter(f => f.code !== 'VIDE').map(f => `<option value="${f.code}">${f.code}</option>`).join('');
}

// ==========================================================================
// ÉTAPE 3 : BALANCE — CONSIGNE + SAISIE
// ==========================================================================
function submitBalance(e) {
  e.preventDefault();
  const tare = parseFloat(document.getElementById('f-tare').value);
  const brute = parseFloat(document.getElementById('f-brute').value);
  if (isNaN(tare) || isNaN(brute)) return alert('Saisis les deux masses.');
  state.reponses.tare_kg = tare;
  state.reponses.masse_brute_kg = brute;
  showScreen('screen-calculs');
  renderCalculs();
}

// ==========================================================================
// ÉTAPE 4 : CALCULS ÉLÈVE
// ==========================================================================
function renderCalculs() {
  // Rappel valeurs pesées
  document.getElementById('recap-tare').textContent = state.reponses.tare_kg.toFixed(3) + ' kg';
  document.getElementById('recap-brute').textContent = state.reponses.masse_brute_kg.toFixed(3) + ' kg';
  // Fluide retenu (étiquette ou déduit)
  const f = getFluide(state.reponses.fluide);
  if (f) {
    document.getElementById('recap-fluide').textContent = f.code;
    document.getElementById('recap-prp').textContent = f.prp;
  } else {
    document.getElementById('recap-fluide').textContent = '—';
    document.getElementById('recap-prp').textContent = '—';
  }
  document.getElementById('f-masse-nette').value = '';
  document.getElementById('f-tco2eq').value = '';
}

function submitCalculs(e) {
  e.preventDefault();
  state.reponses.masse_nette_kg = parseFloat(document.getElementById('f-masse-nette').value);
  state.reponses.tCO2eq = parseFloat(document.getElementById('f-tco2eq').value);
  if (isNaN(state.reponses.masse_nette_kg) || isNaN(state.reponses.tCO2eq)) {
    return alert("Fais les deux calculs avant de valider.");
  }
  corrigerEtAfficher();
}

// ==========================================================================
// AUTO-CORRECTION
// ==========================================================================
function corriger(reponses, verite) {
  const results = [];
  let noteTotal = 0, noteMax = 0;

  function check(champ, valEleve, valVerite, comment = '') {
    const rule = TOLERANCES[champ] || { type: 'exact' };
    const bar = BAREME[champ] || { pts: 0, comp: '', label: champ };
    const points = bar.pts;
    const label = bar.label;
    const comp = bar.comp;
    noteMax += points;
    let ok = false;

    if (valEleve === undefined || valEleve === null || valEleve === '') {
      ok = false;
    } else if (rule.type === 'exact') {
      ok = String(valEleve).trim().toUpperCase() === String(valVerite).trim().toUpperCase();
    } else if (rule.type === 'contains') {
      const v = String(valEleve).trim().toUpperCase();
      const w = String(valVerite).trim().toUpperCase();
      ok = v.includes(w) || w.includes(v);
    } else if (rule.type === 'tolerance_abs') {
      ok = Math.abs(parseFloat(valEleve) - parseFloat(valVerite)) <= rule.tol;
    } else if (rule.type === 'tolerance_rel') {
      const vt = parseFloat(valVerite);
      if (vt === 0) ok = parseFloat(valEleve) === 0;
      else ok = Math.abs((parseFloat(valEleve) - vt) / vt) <= rule.tol;
    }

    const ptsObtenus = ok ? points : 0;
    noteTotal += ptsObtenus;
    results.push({ champ, label, comp, valEleve, valVerite, ok, points, ptsObtenus, comment });
  }

  // Identification
  check('marque',   reponses.marque,   verite.marque);
  check('numSerie', reponses.numSerie, verite.numSerie);
  check('type',     reponses.type,     verite.type);
  check('capacite', reponses.capacite, verite.capacite_L);
  check('fluide',   reponses.fluide,   verite.fluide_etiquette);

  // Pesée
  check('tare_kg',        reponses.tare_kg,        verite.tare_kg);
  check('masse_brute_kg', reponses.masse_brute_kg, verite.masse_brute_derniere_kg,
        '(tolérance élargie : la bouteille peut avoir évolué depuis l\'inventaire)');

  // Calculs élève (vérité = ce qu'on recalcule côté système)
  const trueNette = Math.max(0, verite.masse_brute_derniere_kg - verite.tare_kg);
  const fluide = getFluide(verite.fluide_etiquette);
  const truePRP = fluide ? fluide.prp : 0;
  const trueTeq = trueNette * truePRP / 1000;

  check('masse_nette_kg', reponses.masse_nette_kg, trueNette);
  check('tCO2eq',         reponses.tCO2eq,         trueTeq);

  // Détail par compétence
  const parComp = {};
  results.forEach(r => {
    if (!parComp[r.comp]) parComp[r.comp] = { pts: 0, max: 0 };
    parComp[r.comp].pts += r.ptsObtenus;
    parComp[r.comp].max += r.points;
  });

  return {
    results,
    noteTotal,
    noteMax,
    pourcentage: Math.round(100 * noteTotal / noteMax),
    parCompetence: parComp
  };
}

function corrigerEtAfficher() {
  const notation = corriger(state.reponses, state.bouteille);
  state.notation = notation;
  renderResultat(notation);
  showScreen('screen-resultat');
  // Envoi (stub local pour l'instant)
  envoyerReleve();
}

function renderResultat(notation) {
  document.getElementById('note-finale').textContent = `${notation.noteTotal} / ${notation.noteMax}`;
  document.getElementById('note-pct').textContent = notation.pourcentage + ' %';

  const box = document.getElementById('resultat-details');
  box.innerHTML = notation.results.map(r => {
    const icon = r.ok ? '✅' : '❌';
    const cls = r.ok ? 'ok-inline' : 'ko-inline';
    const affVerite = (typeof r.valVerite === 'number') ? r.valVerite.toFixed(3) : r.valVerite;
    const affEleve = (r.valEleve === undefined || r.valEleve === '') ? '—'
                    : (typeof r.valEleve === 'number' ? parseFloat(r.valEleve).toFixed(3) : r.valEleve);
    const compBadge = r.comp ? `<span class="comp-badge">${r.comp}</span>` : '';
    return `<div class="detail-line">
      <div>${icon} <strong>${r.label}</strong> ${compBadge}<br>
        <small style="color:#666">Ta réponse : <b>${affEleve}</b> · Attendu : <b>${affVerite}</b>${r.comment ? ' · ' + r.comment : ''}</small>
      </div>
      <div class="${cls}">${r.ptsObtenus}/${r.points}</div>
    </div>`;
  }).join('');

  // Détail par compétence
  const compBox = document.getElementById('resultat-competences');
  compBox.innerHTML = '<h4 style="margin:14px 0 6px;color:#1B3A63;font-size:13px">Détail par compétence (réf. CAP IFCA)</h4>' +
    Object.entries(notation.parCompetence).map(([code, d]) => {
      const pct = Math.round(100 * d.pts / d.max);
      const color = pct >= 80 ? '#4CAF50' : pct >= 50 ? '#FF9800' : '#E53935';
      const info = COMPETENCES[code] || { label: code, axe: '' };
      return `<div class="comp-line">
        <div style="flex:1">
          <span class="comp-badge">${code}</span> <b>${info.label}</b>
          <small style="color:#888;display:block;font-size:10px">${info.axe}</small>
        </div>
        <div style="min-width:60px;text-align:right">
          <b>${d.pts}/${d.max}</b>
          <div class="comp-bar"><div class="comp-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        </div>
      </div>`;
    }).join('');

  // Bandeau succès / échec
  const bandeau = document.getElementById('resultat-bandeau');
  bandeau.className = 'result ' + (notation.pourcentage >= 60 ? 'ok' : 'ko');

  // Progression globale (bouteilles faites)
  updateProgression();
}

function updateProgression() {
  const histo = JSON.parse(localStorage.getItem('tp_histo') || '[]');
  // Dédupliquer par bouteille_code : on garde la MEILLEURE note pour chaque bouteille
  const parBout = {};
  histo.forEach(h => {
    if (h.bouteille_code && state.user && h.eleve === state.user.prenom && h.classe === state.user.classe) {
      const existing = parBout[h.bouteille_code];
      if (!existing || (h.notation && h.notation.noteTotal > existing.notation.noteTotal)) {
        parBout[h.bouteille_code] = h;
      }
    }
  });
  const n = Object.keys(parBout).length;
  const badge = document.getElementById('progression-badge');
  if (badge) {
    badge.textContent = `${n} / 10 bouteilles pesées`;
    if (n >= 10) badge.style.background = '#4CAF50';
  }
  // Afficher bouton bilan si 10 bouteilles
  const btnBilan = document.getElementById('btn-voir-bilan');
  if (btnBilan) btnBilan.style.display = (n >= 1) ? 'block' : 'none';
}

// ==========================================================================
// ENVOI VERS GOOGLE SHEET (Apps Script) — stub localStorage
// ==========================================================================
async function envoyerReleve() {
  const payload = {
    action: 'createReleveTP',
    eleve: state.user.prenom,
    classe: state.user.classe,
    ts: new Date().toISOString(),
    bouteille_code: state.bouteille.code,
    reponses: state.reponses,
    notation: state.notation,
    auto_validation: state.notation.pourcentage >= 80  // auto-validé si >= 80 %
  };

  // 1. Sauvegarde locale (toujours)
  const histo = JSON.parse(localStorage.getItem('tp_histo') || '[]');
  histo.push(payload);
  localStorage.setItem('tp_histo', JSON.stringify(histo));

  // 2. Envoi serveur si configuré
  if (state.apiUrl) {
    try {
      const res = await fetch(state.apiUrl + '?action=createReleveTP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erreur API');
      document.getElementById('status-envoi').innerHTML = '✅ Relevé envoyé à la feuille inerWeb';
    } catch (e) {
      document.getElementById('status-envoi').innerHTML = '⚠ Envoi serveur échoué — sauvegarde locale OK — <a href="#" onclick="retryEnvoi();return false;">réessayer</a>';
    }
  } else {
    document.getElementById('status-envoi').innerHTML = 'ℹ Sauvegarde locale uniquement (API non configurée)';
  }
}
window.retryEnvoi = () => envoyerReleve();

// ==========================================================================
// FIN : RETOUR ACCUEIL / NOUVELLE BOUTEILLE
// ==========================================================================
function nouvelleBouteille() {
  state.bouteille = null;
  state.reponses = {};
  state.notation = null;
  document.getElementById('code-manuel').value = '';
  showScreen('screen-scan');
}

// ==========================================================================
// BILAN ÉLÈVE (toutes bouteilles confondues)
// ==========================================================================
function afficherBilan() {
  const histo = JSON.parse(localStorage.getItem('tp_histo') || '[]');
  // Meilleure note par bouteille, user courant uniquement
  const parBout = {};
  histo.forEach(h => {
    if (h.eleve === state.user.prenom && h.classe === state.user.classe && h.bouteille_code) {
      const ex = parBout[h.bouteille_code];
      if (!ex || h.notation.noteTotal > ex.notation.noteTotal) parBout[h.bouteille_code] = h;
    }
  });
  const entries = Object.values(parBout).sort((a,b) => a.bouteille_code.localeCompare(b.bouteille_code));

  document.getElementById('bilan-nom').textContent = `${state.user.prenom} — ${state.user.classe}`;
  document.getElementById('bilan-progression').textContent = `${entries.length} / 10`;

  // Moyenne
  let totalPts = 0, totalMax = 0;
  entries.forEach(e => { totalPts += e.notation.noteTotal; totalMax += e.notation.noteMax; });
  const moy20 = totalMax > 0 ? (totalPts / totalMax * 20).toFixed(1) : '—';
  document.getElementById('bilan-moyenne').textContent = moy20 + ' / 20';
  document.getElementById('bilan-pct').textContent = (totalMax > 0 ? Math.round(100*totalPts/totalMax) : 0) + ' %';

  // Liste des bouteilles
  const list = document.getElementById('bilan-liste');
  if (entries.length === 0) {
    list.innerHTML = '<p style="color:#888;font-size:13px;text-align:center">Aucune bouteille pesée pour l\'instant.</p>';
  } else {
    list.innerHTML = entries.map(e => {
      const n = e.notation;
      const color = n.pourcentage >= 80 ? '#4CAF50' : n.pourcentage >= 50 ? '#FF9800' : '#E53935';
      const valid = e.auto_validation ? '✅' : '⏳';
      return `<div class="bilan-row">
        <div style="flex:1">
          <b>${e.bouteille_code}</b> ${valid}
          <small style="color:#888;display:block;font-size:11px">${new Date(e.ts).toLocaleString('fr-FR')}</small>
        </div>
        <div style="text-align:right">
          <b style="color:${color}">${n.noteTotal}/${n.noteMax}</b>
          <div style="font-size:11px;color:#888">${n.pourcentage}%</div>
        </div>
      </div>`;
    }).join('');
  }

  // Agrégat compétences
  const comps = {};
  entries.forEach(e => {
    Object.entries(e.notation.parCompetence || {}).forEach(([c, d]) => {
      if (!comps[c]) comps[c] = { pts: 0, max: 0 };
      comps[c].pts += d.pts; comps[c].max += d.max;
    });
  });
  const compEl = document.getElementById('bilan-competences');
  compEl.innerHTML = Object.entries(comps).map(([code, d]) => {
    const pct = d.max > 0 ? Math.round(100 * d.pts / d.max) : 0;
    const color = pct >= 80 ? '#4CAF50' : pct >= 50 ? '#FF9800' : '#E53935';
    const info = COMPETENCES[code] || { label: code, axe: '' };
    return `<div class="comp-line">
      <div style="flex:1">
        <span class="comp-badge">${code}</span> <b>${info.label}</b>
        <small style="color:#888;display:block;font-size:10px">${info.axe}</small>
      </div>
      <div style="min-width:60px;text-align:right">
        <b>${d.pts}/${d.max}</b>
        <div class="comp-bar"><div class="comp-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>
    </div>`;
  }).join('');

  showScreen('screen-bilan');
}

function exporterBilanTxt() {
  const histo = JSON.parse(localStorage.getItem('tp_histo') || '[]');
  const parBout = {};
  histo.forEach(h => {
    if (h.eleve === state.user.prenom && h.classe === state.user.classe && h.bouteille_code) {
      const ex = parBout[h.bouteille_code];
      if (!ex || h.notation.noteTotal > ex.notation.noteTotal) parBout[h.bouteille_code] = h;
    }
  });
  const entries = Object.values(parBout).sort((a,b) => a.bouteille_code.localeCompare(b.bouteille_code));
  let totalPts = 0, totalMax = 0;
  entries.forEach(e => { totalPts += e.notation.noteTotal; totalMax += e.notation.noteMax; });
  const moy = totalMax > 0 ? (totalPts/totalMax*20).toFixed(2) : '0';

  let txt = `TP INVENTAIRE BOUTEILLES — LP Jacques Raynaud\n`;
  txt += `Élève : ${state.user.prenom}\nClasse : ${state.user.classe}\n`;
  txt += `Date : ${new Date().toLocaleDateString('fr-FR')}\n\n`;
  txt += `Bouteilles pesées : ${entries.length} / 10\n`;
  txt += `NOTE FINALE : ${moy} / 20  (${totalPts}/${totalMax} points bruts)\n\n`;
  txt += `--- Détail par bouteille ---\n`;
  entries.forEach(e => {
    txt += `${e.bouteille_code}  ${e.notation.noteTotal}/${e.notation.noteMax}  (${e.notation.pourcentage}%)  ${e.auto_validation ? 'VALIDE' : 'À revoir'}\n`;
  });
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TP_${state.user.prenom}_${state.user.classe.replace(/\s+/g,'_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==========================================================================
// DÉMARRAGE
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('form-login').addEventListener('submit', handleLogin);
  document.getElementById('btn-logout').addEventListener('click', handleLogout);
  document.getElementById('btn-scan').addEventListener('click', startQRScan);
  document.getElementById('btn-stop-scan').addEventListener('click', () => { stopQRScan(); showScreen('screen-scan'); });
  document.getElementById('btn-manual').addEventListener('click', handleManualCode);
  document.getElementById('form-identification').addEventListener('submit', submitIdentification);
  document.getElementById('form-manometre').addEventListener('submit', submitManometre);
  document.getElementById('form-balance').addEventListener('submit', submitBalance);
  document.getElementById('form-calculs').addEventListener('submit', submitCalculs);
  document.getElementById('btn-nouvelle').addEventListener('click', nouvelleBouteille);
  document.getElementById('btn-info-balance').addEventListener('click', () => showScreen('screen-info-balance'));
  document.getElementById('btn-close-info-balance').addEventListener('click', () => showScreen('screen-balance'));
  document.getElementById('btn-voir-bilan').addEventListener('click', afficherBilan);
  document.getElementById('btn-bilan-retour').addEventListener('click', () => showScreen('screen-scan'));
  document.getElementById('btn-bilan-export').addEventListener('click', exporterBilanTxt);
  // mettre à jour le compteur de progression sur screen-scan
  updateProgression();

  // Auto-login si déjà enregistré
  if (restoreUser()) {
    showScreen('screen-scan');
  } else {
    showScreen('screen-login');
  }

  // Auto-charger la bouteille via URL ?b=TP-Bxx (scan QR depuis caméra téléphone)
  const params = new URLSearchParams(window.location.search);
  const codeFromQR = params.get('b');
  if (codeFromQR && state.user) {
    loadBouteille(codeFromQR.toUpperCase());
  }

  // Préparer le screen manomètre
  renderManometre();

  // Enregistrer le service worker (PWA offline + installable)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err =>
      console.warn('SW registration failed:', err)
    );
  }
});
