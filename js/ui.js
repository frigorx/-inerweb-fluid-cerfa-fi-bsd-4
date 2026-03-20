/**
 * inerWeb Fluide - UI Module v7.1.0
 * Rendu de l'interface utilisateur
 */

const UI = {
  // Éléments DOM cachés
  elements: {},
  
  /**
   * Initialise les références DOM
   */
  init() {
    this.elements = {
      // Screens
      screenLogin: document.getElementById('screen-login'),
      screenApp: document.getElementById('screen-app'),
      
      // Login
      loginForm: document.getElementById('login-form'),
      loginId: document.getElementById('login-id'),
      loginPassword: document.getElementById('login-password'),
      loginError: document.getElementById('login-error'),
      loginSubmit: document.getElementById('login-submit'),
      
      // Header
      modeBadge: document.getElementById('mode-badge'),
      modeLabel: document.getElementById('mode-label'),
      userAvatar: document.getElementById('user-avatar'),
      userName: document.getElementById('user-name'),
      userRole: document.getElementById('user-role'),
      btnLogout: document.getElementById('btn-logout'),
      
      // Navigation
      mainNav: document.getElementById('main-nav'),
      alertesBadge: document.getElementById('alertes-badge'),
      
      // Views
      views: {
        dashboard: document.getElementById('view-dashboard'),
        machines: document.getElementById('view-machines'),
        bouteilles: document.getElementById('view-bouteilles'),
        mouvements: document.getElementById('view-mouvements'),
        controles: document.getElementById('view-controles'),
        stats: document.getElementById('view-stats'),
        alertes: document.getElementById('view-alertes'),
        admin: document.getElementById('view-admin'),
        bilan: document.getElementById('view-bilan'),
        fluides: document.getElementById('view-fluides')
      },
      
      // Dashboard
      dashboardStats: document.getElementById('dashboard-stats'),
      dashboardAlertes: document.getElementById('dashboard-alertes'),
      
      // Listes
      machinesList: document.getElementById('machines-list'),
      bouteillesList: document.getElementById('bouteilles-list'),
      mouvementsTbody: document.getElementById('mouvements-tbody'),
      controlesTbody: document.getElementById('controles-tbody'),
      statsDetails: document.getElementById('stats-details'),
      alertesFullList: document.getElementById('alertes-full-list'),
      fluidesList: document.getElementById('fluides-list'),
      
      // Wizard
      wizardOverlay: document.getElementById('wizard-overlay'),
      wizardSteps: document.getElementById('wizard-steps'),
      wizardBody: document.getElementById('wizard-body'),
      wizardPrev: document.getElementById('wizard-prev'),
      wizardNext: document.getElementById('wizard-next'),
      wizardCancel: document.getElementById('wizard-cancel'),
      
      // Toast
      toastContainer: document.getElementById('toast-container')
    };
  },
  
  /**
   * Affiche l'écran de login
   */
  showLogin() {
    this.elements.screenLogin.classList.remove('hidden');
    this.elements.screenApp.classList.add('hidden');
    this.elements.loginId.focus();
  },
  
  /**
   * Affiche l'écran principal
   */
  showApp() {
    this.elements.screenLogin.classList.add('hidden');
    this.elements.screenApp.classList.remove('hidden');
    this.updateHeader();
    // Afficher le bouton Admin pour ENSEIGNANT, REFERENT, ADMIN
    const role = State.user?.role || '';
    const navAdmin = document.getElementById('nav-admin');
    if (navAdmin && ['ENSEIGNANT', 'REFERENT', 'ADMIN'].includes(role)) {
      navAdmin.style.display = '';
    }
    // Faille 13 : Masquer boutons si permissions insuffisantes
    const btnAddMachine = document.getElementById('btn-add-machine');
    if (btnAddMachine && !State.hasPermission('creerMachine')) {
      btnAddMachine.style.display = 'none';
    }
    const btnAddBouteille = document.getElementById('btn-add-bouteille');
    if (btnAddBouteille && !State.hasPermission('creerBouteille')) {
      btnAddBouteille.style.display = 'none';
    }
    this.showView('dashboard');
  },
  
  /**
   * Met à jour le header
   */
  updateHeader() {
    const user = State.user;
    if (!user) return;
    
    // Avatar et infos
    this.elements.userAvatar.textContent = State.getUserInitials();
    this.elements.userName.textContent = user.nomComplet || '--';
    this.elements.userRole.textContent = user.role || '--';
    
    // Mode badge
    const isOfficiel = State.mode === 'OFFICIEL';
    this.elements.modeBadge.className = `mode-badge ${isOfficiel ? 'officiel' : 'formation'}`;
    this.elements.modeLabel.textContent = isOfficiel ? 'Mode Officiel' : 'Mode Formation';
  },
  
  /**
   * Affiche une vue
   */
  showView(viewName) {
    State.currentView = viewName;
    
    // Navigation active
    this.elements.mainNav.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });
    
    // Afficher la vue
    Object.entries(this.elements.views).forEach(([name, el]) => {
      if (el) el.classList.toggle('hidden', name !== viewName);
    });
    
    // Charger les données selon la vue
    this.loadViewData(viewName);
  },
  
  /**
   * Charge les données d'une vue
   */
  async loadViewData(viewName) {
    try {
      switch (viewName) {
        case 'dashboard':
          // Rafraîchir machines, bouteilles, alertes en parallèle
          await Promise.all([
            API.getMachines().then(r => { State.machines = (r.data||[]).map(m => ({...m, id: m.code||m.id, charge: m.chargeAct||m.chargeNom, chargeActuelle: m.chargeAct||m.chargeNom, prochainControle: m.prochControle})); }),
            API.getBouteilles().then(r => { State.bouteilles = (r.data||[]).map(b => ({...b, id: b.code||b.id, stockActuel: b.masseFluide||0, capacite: b.contenance||10})); }),
            State.refreshAlertes()
          ]);
          this.renderDashboard();
          break;
        case 'machines':
          await API.getMachines().then(r => { State.machines = (r.data||[]).map(m => ({...m, id: m.code||m.id, charge: m.chargeAct||m.chargeNom, chargeActuelle: m.chargeAct||m.chargeNom, prochainControle: m.prochControle})); });
          this.renderMachines();
          break;
        case 'bouteilles':
          await API.getBouteilles().then(r => { State.bouteilles = (r.data||[]).map(b => ({...b, id: b.code||b.id, stockActuel: b.masseFluide||0, capacite: b.contenance||10})); });
          this.renderBouteilles();
          break;
        case 'mouvements':
          await State.loadMouvements();
          this.renderMouvements();
          break;
        case 'controles':
          await State.loadControles();
          this.renderControles();
          break;
        case 'stats':
          await State.loadStats();
          this.renderStats();
          break;
        case 'alertes':
          await State.refreshAlertes();
          this.renderAlertes();
          break;
        case 'fluides':
          this.renderFluides();
          break;
        case 'admin':
          this.renderAdmin();
          break;
        case 'bilan':
          this.initBilan();
          break;
      }
    } catch (err) {
      console.error('Erreur rafraîchissement vue ' + viewName + ':', err);
    }
  },
  
  /**
   * Met à jour le badge des alertes
   */
  updateAlertesBadge() {
    const count = State.getAlertesCount();
    const badge = this.elements.alertesBadge;
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  },
  
  // ========== DASHBOARD ==========
  
  renderDashboard() {
    // Stats
    const statsHtml = `
      <div class="stat-card card-accent">
        <div class="stat-icon">🏭</div>
        <div class="stat-value">${State.machines.length}</div>
        <div class="stat-label">Machines en service</div>
      </div>
      <div class="stat-card card-accent">
        <div class="stat-icon">🧪</div>
        <div class="stat-value">${State.bouteilles.length}</div>
        <div class="stat-label">Bouteilles en stock</div>
      </div>
      <div class="stat-card card-accent">
        <div class="stat-icon">❄️</div>
        <div class="stat-value">${this.calcTotalEqCO2().toFixed(2)}</div>
        <div class="stat-label">Tonnes éq. CO2</div>
      </div>
      <div class="stat-card card-accent ${State.alertes.length > 0 ? 'warning' : ''}">
        <div class="stat-icon">⚠️</div>
        <div class="stat-value">${State.alertes.length}</div>
        <div class="stat-label">Alertes actives</div>
      </div>
    `;
    this.elements.dashboardStats.innerHTML = statsHtml;
    
    // Alertes détecteurs périmés
    const detecteursPerimes = State.detecteurs.filter(d => this.isDatePassed(d.prochain));
    const alertesDetecteurs = detecteursPerimes.map(d => ({
      type: 'danger',
      niveau: 'CRITIQUE',
      titre: `Détecteur ${d.code || d.id} — étalonnage échu`,
      description: `${d.marque || ''} ${d.modele || ''} — prochain étalonnage : ${this.formatDate(d.prochain)}`
    }));

    // Alertes (max 3 alertes classiques + alertes détecteurs)
    const alertes = State.alertes.slice(0, 3);
    const toutesAlertes = [...alertes, ...alertesDetecteurs];
    if (toutesAlertes.length === 0) {
      this.elements.dashboardAlertes.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <div class="empty-state-title">Aucune alerte</div>
          <div class="empty-state-desc">Tout est en ordre !</div>
        </div>
      `;
    } else {
      this.elements.dashboardAlertes.innerHTML = toutesAlertes.map(a => this.renderAlerteCard(a)).join('');
    }
    
    // Derniers mouvements (5 max)
    const mvtDiv = document.getElementById('dashboard-derniers-mvt');
    if (mvtDiv) {
      try {
        API.getMouvements({ limit: 5 }).then(res => {
          const mvts = res.data || [];
          if (mvts.length === 0) {
            mvtDiv.innerHTML = '<p style="color:#999;text-align:center;">Aucun mouvement</p>';
          } else {
            mvtDiv.innerHTML = '<table class="table" style="width:100%;font-size:12px;"><tbody>' +
              mvts.map(m => {
                const cerfaLink = m.cerfa ? (m.cerfaUrl ? `<a href="${m.cerfaUrl}" target="_blank" style="color:#1E40AF;">${m.cerfa}</a>` : m.cerfa) : '';
                return `<tr>
                  <td>${this.formatDate(m.date)}</td>
                  <td><code>${m.machine||'--'}</code></td>
                  <td>${m.type||'--'}</td>
                  <td><strong>${parseFloat(m.masse||0).toFixed(2)} kg</strong></td>
                  <td>${cerfaLink}</td>
                  <td><span class="badge badge-${this.getStatutBadgeClass(m.statut)}">${m.statut||'--'}</span></td>
                </tr>`;
              }).join('') + '</tbody></table>';
          }
        }).catch(() => {});
      } catch (e) {}
    }

    this.updateAlertesBadge();
  },

  calcTotalEqCO2() {
    return State.machines.reduce((sum, m) => sum + (parseFloat(m.eqCO2) || 0), 0);
  },
  
  // ========== MACHINES ==========
  
  renderMachines() {
    if (State.machines.length === 0) {
      this.elements.machinesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏭</div>
          <div class="empty-state-title">Aucune machine</div>
          <div class="empty-state-desc">Ajoutez votre première machine</div>
        </div>
      `;
      return;
    }
    
    const isPrechargee = (m) => (m.statut || '').includes('préchargée');

    this.elements.machinesList.innerHTML = State.machines.map(m => `
      <div class="machine-card" data-id="${m.id}">
        <div class="machine-header">
          <div class="machine-icon">${this.getMachineIcon(m.type)}</div>
          <span class="machine-status ${this.getMachineStatusClass(m)}">${this.getMachineStatusLabel(m)}</span>
          ${isPrechargee(m) ? '<span style="position:absolute;top:6px;right:6px;background:#3B82F6;color:white;font-size:10px;padding:2px 6px;border-radius:10px;">Préchargée</span>' : ''}
        </div>
        <div class="machine-code">${m.code || m.id}</div>
        <div class="machine-name">${m.nom || m.designation || '--'}</div>
        <div class="machine-specs">
          <div class="spec-item">
            <span class="spec-label">Fluide</span>
            <span class="spec-value refrigerant">${m.fluide || '--'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Charge${isPrechargee(m) ? ' usine' : ''}</span>
            <span class="spec-value">${m.chargeActuelle || m.charge || 0} kg</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Éq. CO2</span>
            <span class="spec-value">${parseFloat(m.eqCO2 || 0).toFixed(2)} t</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Prochain ctrl</span>
            <span class="spec-value ${this.isDatePassed(m.prochainControle) ? 'danger' : ''}">${this.formatDate(m.prochainControle)}</span>
          </div>
        </div>
        ${isPrechargee(m) ? `<div style="margin-top:8px;text-align:center;"><button class="btn btn-sm btn-primary btn-cerfa-precharge" data-machine="${m.code || m.id}" title="CERFA précharge usine">📄 CERFA précharge</button></div>` : ''}
      </div>
    `).join('');

    // Binding boutons CERFA précharge
    document.querySelectorAll('.btn-cerfa-precharge').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          const res = await API.get('genererCerfaPrecharge', {
            machine: btn.dataset.machine,
            operateur: State.user.id,
            mode: State.mode
          });
          if (res.data.urlPdf) {
            window.open(res.data.urlPdf, '_blank');
          } else {
            const w = window.open('', '_blank', 'width=700,height=800');
            w.document.write('<html><head><title>CERFA Précharge ' + res.data.id + '</title></head><body><pre style="font-family:monospace;white-space:pre-wrap;padding:20px;">' + res.data.contenu + '</pre></body></html>');
            w.document.close();
          }
          this.toast('CERFA précharge ' + res.data.id + ' généré — stocké dans Drive', 'success');
        } catch (err) { this.toast('Erreur: ' + err.message, 'error'); }
      });
    });

    // Binding clic sur carte machine → fiche détaillée
    document.querySelectorAll('.machine-card').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return; // Ignorer les clics sur les boutons
        this.openDetailModal('machine', card.dataset.id);
      });
    });
  },
  
  getMachineIcon(type) {
    const icons = {
      'CF': '❄️',
      'CFP': '❄️',
      'CFN': '🌡️',
      'PAC': '💨',
      'CLIM': '🌬️',
      'CTA': '🌀'
    };
    return icons[type] || '🏭';
  },
  
  getMachineStatusClass(machine) {
    if (this.isDatePassed(machine.prochainControle)) return 'danger';
    if (this.isDateSoon(machine.prochainControle, 30)) return 'warning';
    return 'ok';
  },
  
  getMachineStatusLabel(machine) {
    if (this.isDatePassed(machine.prochainControle)) return 'Ctrl. échu';
    if (this.isDateSoon(machine.prochainControle, 30)) return 'Ctrl. proche';
    return 'En service';
  },
  
  // ========== BOUTEILLES ==========
  
  renderBouteilles() {
    if (State.bouteilles.length === 0) {
      this.elements.bouteillesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🧪</div>
          <div class="empty-state-title">Aucune bouteille</div>
          <div class="empty-state-desc">Ajoutez votre première bouteille</div>
        </div>
      `;
      return;
    }
    
    this.elements.bouteillesList.innerHTML = State.bouteilles.map(b => {
      const niveau = Math.min(100, Math.max(0, (b.stockActuel / (b.capacite || 10)) * 100));
      return `
        <div class="bouteille-card" data-id="${b.id}">
          <div class="bouteille-icon">
            <div class="bouteille-level" style="height: ${niveau}%;"></div>
          </div>
          <span class="bouteille-category ${(b.categorie || 'neuve').toLowerCase()}">${b.categorie || 'Neuve'}</span>
          <div class="bouteille-code">${b.code || b.id}</div>
          <div class="bouteille-fluide">${b.fluide || '--'}</div>
          <div class="bouteille-masse">${parseFloat(b.stockActuel || 0).toFixed(2)} kg</div>
        </div>
      `;
    }).join('');

    // Binding clic sur carte bouteille → fiche détaillée
    document.querySelectorAll('.bouteille-card').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        this.openDetailModal('bouteille', card.dataset.id);
      });
    });
  },

  // ========== FLUIDES ==========

  renderFluides() {
    if (State.fluides.length === 0) {
      this.elements.fluidesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🧊</div>
          <div class="empty-state-title">Aucun fluide</div>
          <div class="empty-state-desc">Initialisez les fluides depuis l'administration</div>
        </div>
      `;
      return;
    }

    this.elements.fluidesList.innerHTML = State.fluides.map(f => {
      const machinesFluide = State.machines.filter(m => m.fluide === f.code);
      const bouteillesFluide = State.bouteilles.filter(b => b.fluide === f.code);
      const stockTotal = bouteillesFluide.reduce((sum, b) => sum + parseFloat(b.stockActuel || 0), 0);

      return `
        <div class="machine-card fluide-card" data-code="${f.code}">
          <div class="machine-header">
            <div class="machine-icon">🧊</div>
            <span class="machine-status ${f.prg > 2000 ? 'danger' : f.prg > 500 ? 'warning' : 'ok'}">${f.famille || '--'}</span>
          </div>
          <div class="machine-code">${f.code}</div>
          <div class="machine-name">${f.nom || '--'}</div>
          <div class="machine-specs">
            <div class="spec-item">
              <span class="spec-label">PRG</span>
              <span class="spec-value ${f.prg > 2000 ? 'danger' : ''}">${f.prg || '--'}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Machines</span>
              <span class="spec-value">${machinesFluide.length}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Bouteilles</span>
              <span class="spec-value">${bouteillesFluide.length}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Stock total</span>
              <span class="spec-value">${stockTotal.toFixed(2)} kg</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Binding clic sur carte fluide → fiche détaillée
    document.querySelectorAll('.fluide-card').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        this.openDetailModal('fluide', card.dataset.code);
      });
    });
  },

  // ========== MOUVEMENTS ==========
  
  renderMouvements() {
    if (State.mouvements.length === 0) {
      this.elements.mouvementsTbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted" style="padding: 40px;">
            Aucun mouvement enregistré
          </td>
        </tr>
      `;
      return;
    }
    
    this.elements.mouvementsTbody.innerHTML = State.mouvements.slice(0, 50).map(m => {
      const id = m.id || m.code || '';
      const actions = [];
      if (m.statut === 'soumis') {
        if (State.hasPermission('validerMouvement')) {
          actions.push(`<button class="btn btn-sm btn-success btn-valider-mvt" data-id="${id}" title="Valider">✓</button>`);
        }
        if (State.hasPermission('annulerMouvement')) {
          actions.push(`<button class="btn btn-sm btn-danger btn-annuler-mvt" data-id="${id}" title="Annuler">✕</button>`);
        }
      }
      if (m.statut === 'valide' && !m.cerfa) {
        actions.push(`<button class="btn btn-sm btn-primary btn-cerfa-mvt" data-id="${id}" title="Générer CERFA">📄</button>`);
      }
      if (m.statut === 'valide' && (m.type === 'Recuperation' || m.type === 'Vidange')) {
        actions.push(`<button class="btn btn-sm btn-bsff-mvt" data-id="${id}" title="BSFF Trackdéchets (en développement)" style="background:#9CA3AF;color:white;font-size:11px;opacity:0.7;">BSFF</button>`);
      }
      // Colonne CERFA
      let cerfaCell = '<em style="color:#999;">—</em>';
      if (m.cerfa) {
        cerfaCell = m.cerfaUrl
          ? `<a href="${m.cerfaUrl}" target="_blank" style="color:#1E40AF;font-weight:bold;text-decoration:underline;" title="Ouvrir le CERFA">${m.cerfa}</a>`
          : `<strong>${m.cerfa}</strong>`;
      }
      return `
        <tr>
          <td>${this.formatDate(m.date)}</td>
          <td>${m.machineCode || m.machine || m.machineId || '--'}</td>
          <td>${m.type || '--'}</td>
          <td>${parseFloat(m.quantite || m.masse || 0).toFixed(2)} kg</td>
          <td>${cerfaCell}</td>
          <td><span class="badge badge-${this.getStatutBadgeClass(m.statut)}">${m.statut || '--'}</span></td>
          <td>${actions.join(' ')}</td>
        </tr>
      `;
    }).join('');

    // Bindings actions mouvements
    document.querySelectorAll('.btn-valider-mvt').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Valider ce mouvement ?')) return;
        try {
          await API.validerMouvement(btn.dataset.id, State.user.id);
          this.toast('Mouvement validé', 'success');
          await State.loadMouvements();
          this.renderMouvements();
        } catch (e) { this.toast('Erreur: ' + e.message, 'error'); }
      });
    });
    document.querySelectorAll('.btn-annuler-mvt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const motif = prompt('Motif d\'annulation :');
        if (!motif) return;
        try {
          await API.annulerMouvement(btn.dataset.id, motif);
          this.toast('Mouvement annulé', 'success');
          await State.loadMouvements();
          this.renderMouvements();
        } catch (e) { this.toast('Erreur: ' + e.message, 'error'); }
      });
    });
    document.querySelectorAll('.btn-cerfa-mvt').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const res = await API.genererCerfa(btn.dataset.id);
          if (res.data.urlPdf) {
            window.open(res.data.urlPdf, '_blank');
          } else {
            const w = window.open('', '_blank', 'width=700,height=800');
            w.document.write('<html><head><title>CERFA ' + res.data.id + '</title></head><body><pre style="font-family:monospace;white-space:pre-wrap;padding:20px;">' + res.data.contenu + '</pre></body></html>');
            w.document.close();
          }
          this.toast('CERFA ' + res.data.id + ' généré — stocké dans Drive', 'success');
        } catch (e) { this.toast('Erreur: ' + e.message, 'error'); }
      });
    });
    // Bouton BSFF Trackdéchets
    document.querySelectorAll('.btn-bsff-mvt').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          btn.disabled = true;
          btn.textContent = '...';
          this.toast('Création du BSFF sur Trackdéchets...', 'info');
          const res = await API.get('creerBsff', { id: btn.dataset.id });
          if (res.success) {
            this.toast('BSFF créé : ' + (res.data.bsffId || 'OK'), 'success');
            await State.loadMouvements();
            this.renderMouvements();
          } else {
            this.toast(res.error || 'Erreur BSFF', 'error');
          }
        } catch (e) {
          this.toast('Erreur BSFF: ' + e.message, 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = 'BSFF';
        }
      });
    });
  },

  getStatutBadgeClass(statut) {
    const s = (statut || '').toLowerCase();
    const classes = {
      'valide': 'success', 'soumis': 'warning', 'brouillon': 'neutral',
      'annule': 'danger', 'rejete': 'danger', 'archive': 'neutral'
    };
    return classes[s] || 'neutral';
  },
  
  // ========== CONTRÔLES ==========
  
  renderControles() {
    if (State.controles.length === 0) {
      this.elements.controlesTbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted" style="padding: 40px;">
            Aucun contrôle enregistré
          </td>
        </tr>
      `;
      return;
    }

    this.elements.controlesTbody.innerHTML = State.controles.slice(0, 50).map(c => {
      // Colonne CERFA
      let cerfaCell = '<em style="color:#999;">—</em>';
      if (c.cerfa) {
        cerfaCell = c.cerfaUrl
          ? `<a href="${c.cerfaUrl}" target="_blank" style="color:#1E40AF;font-weight:bold;text-decoration:underline;" title="Ouvrir le CERFA">${c.cerfa}</a>`
          : `<strong>${c.cerfa}</strong>`;
      }

      // Badge résultat avec gestion spécifique des fuites
      let resultatCell = '';
      const machineId = c.machineCode || c.machine || c.machineId || '';
      if (c.resultat === 'Fuite') {
        resultatCell = `
          <span class="badge badge-danger" style="background:#DC2626;color:#fff;font-weight:bold;padding:4px 10px;border-radius:4px;animation:pulse 2s infinite;">FUITE</span>
          <button class="btn btn-sm btn-primary" style="margin-left:6px;font-size:11px;padding:2px 8px;"
            onclick="UI.ouvrirControleVerification('${machineId}')"
            title="Planifier un contrôle de vérification post-réparation">
            Contrôle vérification
          </button>`;
      } else {
        resultatCell = `<span class="badge badge-${c.resultat === 'Conforme' ? 'success' : 'danger'}">${c.resultat || '--'}</span>`;
      }

      // Ligne en surbrillance rouge si fuite
      const rowStyle = c.resultat === 'Fuite' ? ' style="background:#FEF2F2;border-left:3px solid #DC2626;"' : '';

      return `
      <tr${rowStyle}>
        <td>${this.formatDate(c.date)}</td>
        <td>${machineId || '--'}</td>
        <td>${c.methode || '--'}</td>
        <td>${resultatCell}</td>
        <td>${cerfaCell}</td>
        <td>${c.operateur || '--'}</td>
        <td>${this.formatDate(c.prochainControle)}</td>
      </tr>
    `;
    }).join('');
  },

  /**
   * Ouvre le formulaire de contrôle pré-rempli pour une vérification post-fuite
   */
  async ouvrirControleVerification(machineId) {
    await App.openModalControle();
    const machineSelect = document.getElementById('controle-machine');
    if (machineSelect) {
      machineSelect.value = machineId;
    }
  },

  // ========== STATS ==========
  
  renderStats() {
    if (!State.stats) {
      this.elements.statsDetails.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📈</div>
          <div class="empty-state-title">Chargement...</div>
        </div>
      `;
      return;
    }
    
    const s = State.stats;
    this.elements.statsDetails.innerHTML = `
      <div class="stat-card card-accent">
        <div class="stat-icon">📝</div>
        <div class="stat-value">${s.mouvements?.total || 0}</div>
        <div class="stat-label">Mouvements total</div>
      </div>
      <div class="stat-card card-accent">
        <div class="stat-icon">🔍</div>
        <div class="stat-value">${s.controles?.total || 0}</div>
        <div class="stat-label">Contrôles effectués</div>
      </div>
      <div class="stat-card card-accent ${(s.controles?.tauxConformite || 100) < 80 ? 'warning' : ''}">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${s.controles?.tauxConformite || 100}%</div>
        <div class="stat-label">Taux conformité</div>
      </div>
      <div class="stat-card card-accent">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${Object.keys(s.operateurs || {}).length}</div>
        <div class="stat-label">Opérateurs actifs</div>
      </div>
    `;
  },
  
  // ========== ALERTES ==========
  
  renderAlertes() {
    if (State.alertes.length === 0) {
      this.elements.alertesFullList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <div class="empty-state-title">Aucune alerte</div>
          <div class="empty-state-desc">Tout est conforme !</div>
        </div>
      `;
      return;
    }
    
    this.elements.alertesFullList.innerHTML = State.alertes.map(a => this.renderAlerteCard(a)).join('');
  },
  
  renderAlerteCard(alerte) {
    const type = (alerte.type === 'danger' || alerte.niveau === 'CRITIQUE') ? 'danger' : 'warning';
    const icon = type === 'danger' ? '🔴' : '🟡';
    
    return `
      <div class="alerte-card ${type}">
        <span class="alerte-icon">${icon}</span>
        <div class="alerte-content">
          <div class="alerte-title">${alerte.titre || alerte.message || 'Alerte'}</div>
          <div class="alerte-desc">${alerte.description || alerte.details || ''}</div>
        </div>
        <div class="alerte-action">
          <button class="btn btn-sm ${type === 'danger' ? 'btn-primary' : 'btn-secondary'}">Voir</button>
        </div>
      </div>
    `;
  },
  
  // ========== WIZARD ==========
  
  showWizard() {
    State.startWizard();
    this.elements.wizardOverlay.classList.remove('hidden');
    this.renderWizardStep();
  },
  
  hideWizard() {
    State.wizardCancel();
    this.elements.wizardOverlay.classList.add('hidden');
  },
  
  renderWizardStep() {
    const step = State.wizard.step;
    
    // Mettre à jour les indicateurs
    this.elements.wizardSteps.querySelectorAll('.wizard-step').forEach(el => {
      const s = parseInt(el.dataset.step);
      el.classList.remove('active', 'completed');
      if (s < step) el.classList.add('completed');
      if (s === step) el.classList.add('active');
    });
    
    // Boutons
    this.elements.wizardPrev.disabled = step === 1;
    this.elements.wizardNext.textContent = step === 5 ? 'Valider ✓' : 'Continuer →';
    
    // Contenu selon l'étape
    const content = Wizard.renderStep(step);
    this.elements.wizardBody.innerHTML = content;
    
    // Bindings spécifiques à l'étape
    Wizard.bindStep(step);
  },
  
  // ========== UTILITAIRES ==========
  
  formatDate(dateStr) {
    if (!dateStr) return '--';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  },
  
  isDatePassed(dateStr) {
    if (!dateStr) return false;
    try {
      return new Date(dateStr) < new Date();
    } catch {
      return false;
    }
  },
  
  isDateSoon(dateStr, days) {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      const limit = new Date();
      limit.setDate(limit.getDate() + days);
      return d <= limit && d >= new Date();
    } catch {
      return false;
    }
  },
  
  /**
   * Affiche un toast
   */
  toast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    this.elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  
  /**
   * Affiche une erreur de login
   */
  showLoginError(message) {
    this.elements.loginError.textContent = message;
    this.elements.loginError.classList.remove('hidden');
  },
  
  /**
   * Cache l'erreur de login
   */
  hideLoginError() {
    this.elements.loginError.classList.add('hidden');
  },
  
  /**
   * Active/désactive le loading du bouton login
   */
  setLoginLoading(loading) {
    this.elements.loginSubmit.disabled = loading;
    this.elements.loginSubmit.innerHTML = loading
      ? '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span>'
      : '<span>Se connecter</span>';
  },

  /**
   * Initialise la vue bilan annuel
   */
  initBilan() {
    const selectAnnee = document.getElementById('bilan-annee');
    const selectFluide = document.getElementById('bilan-fluide');

    // Peupler les années (de l'année en cours à 2019)
    if (selectAnnee.options.length <= 1) {
      selectAnnee.innerHTML = '';
      const currentYear = new Date().getFullYear();
      for (let y = currentYear; y >= 2019; y--) {
        selectAnnee.innerHTML += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
      }
    }

    // Peupler les fluides
    if (selectFluide.options.length <= 1) {
      selectFluide.innerHTML = '<option value="">Tous les fluides</option>';
      State.fluides.forEach(f => {
        selectFluide.innerHTML += `<option value="${f.code}">${f.code} — ${f.nom || ''}</option>`;
      });
    }

    // Binding bouton charger (une seule fois)
    const btnLoad = document.getElementById('btn-load-bilan');
    if (btnLoad && !btnLoad._bound) {
      btnLoad.addEventListener('click', () => this.loadBilan());
      btnLoad._bound = true;
    }
  },

  /**
   * Charge et affiche le bilan annuel
   */
  async loadBilan() {
    const annee = document.getElementById('bilan-annee').value;
    const fluide = document.getElementById('bilan-fluide').value;
    const content = document.getElementById('bilan-content');

    content.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div><p>Chargement du bilan ' + annee + '...</p></div>';

    try {
      const res = await API.getBilanAnnuel(annee, fluide);
      const data = res.data;
      const bilans = data.bilans;
      const codes = Object.keys(bilans);

      if (codes.length === 0) {
        content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-title">Aucun mouvement en ' + annee + '</div></div>';
        return;
      }

      let html = '';

      codes.forEach(code => {
        const b = bilans[code];
        const f = b.fluide;

        html += '<div class="card" style="margin-bottom:20px;">';
        html += '<div class="card-header" style="background:#1b3a63;color:white;padding:12px 16px;border-radius:8px 8px 0 0;">';
        html += '<h3 style="margin:0;">FLUIDE : ' + f.code + (f.nom ? ' — ' + f.nom : '') + ' (PRG: ' + (f.prg || '?') + ')</h3>';
        html += '<div style="font-size:12px;opacity:0.8;">Année ' + annee + ' — ' + b.nbInterventions + ' intervention(s)</div>';
        html += '</div>';
        html += '<div class="card-body" style="padding:16px;">';

        // ===== MOUVEMENTS FLUIDES =====
        html += '<h4 style="margin:0 0 8px;color:#1E40AF;border-bottom:2px solid #3B82F6;padding-bottom:4px;">MOUVEMENTS FLUIDES</h4>';
        if (b.mouvements.length === 0) {
          html += '<p style="color:#999;">Aucun mouvement</p>';
        } else {
          html += '<div style="overflow-x:auto;">';
          html += '<table class="table" style="width:100%;font-size:11px;white-space:nowrap;">';
          html += '<thead><tr style="background:#E0E7FF;">';
          html += '<th>N°</th><th>N° intervention</th><th>N° CERFA / FI</th><th>Date</th><th>Type</th>';
          html += '<th style="background:#DBEAFE;">Chargés<br>éq. neufs (J)</th>';
          html += '<th style="background:#DBEAFE;">Chargés<br>maintenance (K)</th>';
          html += '<th style="background:#FEF3C7;">Récup.<br>hors usage (M)</th>';
          html += '<th style="background:#FEF3C7;">Récup.<br>maintenance (N)</th>';
          html += '<th style="background:#D1FAE5;">Recyclés<br>(R)</th>';
          html += '<th>Installation</th><th>Bouteille n°</th>';
          html += '</tr></thead><tbody>';

          b.mouvements.forEach((m, i) => {
            const isCharge = m.type === 'MiseEnService' || m.type === 'Charge';
            const isAppoint = m.type === 'Appoint';
            const isVidange = m.type === 'Vidange';
            const isRecup = m.type === 'Recuperation';
            const isRecycle = isRecup && m.etatFluide === 'Recyclé';

            html += '<tr>';
            html += '<td>' + (i + 1) + '</td>';
            html += '<td><code>' + m.id + '</code></td>';
            html += '<td>' + (m.cerfa ? (m.cerfaUrl ? '<a href="' + m.cerfaUrl + '" target="_blank" style="color:#1E40AF;font-weight:bold;text-decoration:underline;" title="Ouvrir le CERFA dans Drive">' + m.cerfa + '</a>' : '<strong>' + m.cerfa + '</strong>') : '<em style="color:#999;">—</em>') + '</td>';
            html += '<td>' + this.formatDate(m.date) + '</td>';
            html += '<td>' + (m.type || '--') + '</td>';
            html += '<td style="background:#EFF6FF;text-align:right;font-weight:bold;">' + (isCharge ? m.masse : '') + '</td>';
            html += '<td style="background:#EFF6FF;text-align:right;font-weight:bold;">' + (isAppoint ? m.masse : '') + '</td>';
            html += '<td style="background:#FFFBEB;text-align:right;font-weight:bold;">' + (isVidange ? m.masse : '') + '</td>';
            html += '<td style="background:#FFFBEB;text-align:right;font-weight:bold;">' + (isRecup && !isRecycle ? m.masse : '') + '</td>';
            html += '<td style="background:#ECFDF5;text-align:right;font-weight:bold;">' + (isRecycle ? m.masse : '') + '</td>';
            html += '<td>' + (m.machineNom || m.machine || '') + '</td>';
            html += '<td>' + (m.bouteille || '') + '</td>';
            html += '</tr>';
          });

          // Ligne TOTAL
          html += '<tr style="background:#1E3A5F;color:white;font-weight:bold;">';
          html += '<td colspan="5">TOTAL</td>';
          html += '<td style="text-align:right;">' + b.J_chargesNeufs + ' kg</td>';
          html += '<td style="text-align:right;">' + b.K_chargesMaintenance + ' kg</td>';
          html += '<td style="text-align:right;">' + b.M_recupHorsUsage + ' kg</td>';
          html += '<td style="text-align:right;">' + b.N_recupMaintenance + ' kg</td>';
          html += '<td style="text-align:right;">' + b.R_recycles + ' kg</td>';
          html += '<td colspan="2"></td>';
          html += '</tr>';
          html += '</tbody></table></div>';
        }

        // ===== STOCKS =====
        html += '<h4 style="margin:16px 0 8px;color:#065F46;border-bottom:2px solid #10B981;padding-bottom:4px;">STOCKS & COHÉRENCE</h4>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">';

        html += '<div style="background:#DBEAFE;padding:12px;border-radius:8px;text-align:center;">';
        html += '<div style="font-size:11px;color:#1E40AF;">Total chargés (L=J+K)</div>';
        html += '<div style="font-size:22px;font-weight:bold;color:#1E3A5F;">' + b.L_totalCharges + ' kg</div>';
        html += '</div>';

        html += '<div style="background:#FEF3C7;padding:12px;border-radius:8px;text-align:center;">';
        html += '<div style="font-size:11px;color:#92400E;">Total récupérés (O=M+N)</div>';
        html += '<div style="font-size:22px;font-weight:bold;color:#78350F;">' + b.O_totalRecup + ' kg</div>';
        html += '</div>';

        html += '<div style="background:#D1FAE5;padding:12px;border-radius:8px;text-align:center;">';
        html += '<div style="font-size:11px;color:#065F46;">Stock actuel neufs</div>';
        html += '<div style="font-size:22px;font-weight:bold;color:#064E3B;">' + b.stockActuelNeuf + ' kg</div>';
        html += '</div>';

        html += '<div style="background:#FEE2E2;padding:12px;border-radius:8px;text-align:center;">';
        html += '<div style="font-size:11px;color:#991B1B;">Stock actuel usagés</div>';
        html += '<div style="font-size:22px;font-weight:bold;color:#7F1D1D;">' + b.stockActuelUsage + ' kg</div>';
        html += '</div>';

        html += '<div style="background:#E0E7FF;padding:12px;border-radius:8px;text-align:center;">';
        html += '<div style="font-size:11px;color:#3730A3;">Recyclés (R)</div>';
        html += '<div style="font-size:22px;font-weight:bold;color:#312E81;">' + b.R_recycles + ' kg</div>';
        html += '</div>';

        html += '</div>'; // grid

        html += '</div>'; // card-body
        html += '</div>'; // card
      });

      // Résumé global
      html += '<div style="background:#F0FDF4;border:2px solid #10B981;border-radius:8px;padding:16px;margin-top:8px;">';
      html += '<h4 style="margin:0 0 8px;color:#065F46;">Résumé global ' + annee + '</h4>';
      let totalJ = 0, totalK = 0, totalM = 0, totalN = 0, totalR = 0, totalInterv = 0;
      codes.forEach(code => {
        const b = bilans[code];
        totalJ += b.J_chargesNeufs; totalK += b.K_chargesMaintenance;
        totalM += b.M_recupHorsUsage; totalN += b.N_recupMaintenance;
        totalR += b.R_recycles; totalInterv += b.nbInterventions;
      });
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;font-size:13px;">';
      html += '<div><strong>' + codes.length + '</strong> fluide(s)</div>';
      html += '<div><strong>' + totalInterv + '</strong> intervention(s)</div>';
      html += '<div>Chargés neufs: <strong>' + Math.round(totalJ * 1000) / 1000 + ' kg</strong></div>';
      html += '<div>Chargés maint.: <strong>' + Math.round(totalK * 1000) / 1000 + ' kg</strong></div>';
      html += '<div>Récup. hors usage: <strong>' + Math.round(totalM * 1000) / 1000 + ' kg</strong></div>';
      html += '<div>Récup. maint.: <strong>' + Math.round(totalN * 1000) / 1000 + ' kg</strong></div>';
      html += '<div>Recyclés: <strong>' + Math.round(totalR * 1000) / 1000 + ' kg</strong></div>';
      html += '</div></div>';

      content.innerHTML = html;
    } catch (err) {
      content.innerHTML = '<div style="text-align:center;padding:40px;color:red;"><p>Erreur : ' + err.message + '</p></div>';
    }
  },

  /**
   * Ouvre la modale de fiche détaillée avec traçabilité croisée
   */
  async openDetailModal(type, id) {
    const modal = document.getElementById('modal-detail');
    const title = document.getElementById('detail-title');
    const body = document.getElementById('detail-body');

    const typeLabels = { machine: 'Machine', bouteille: 'Bouteille', operateur: 'Opérateur', fluide: 'Fluide' };
    title.textContent = (typeLabels[type] || type) + ' — ' + id;
    body.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div><p>Chargement traçabilité...</p></div>';
    modal.classList.remove('hidden');

    try {
      const res = await API.getTracabilite(type, id);
      const data = res.data;

      let html = '';

      // Fiche entité
      if (data.entite) {
        html += '<div style="background:#F0F9FF;border:1px solid #3B82F6;border-radius:8px;padding:16px;margin-bottom:16px;">';
        html += '<h3 style="margin:0 0 8px;color:#1E40AF;">Informations</h3>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;">';
        Object.entries(data.entite).forEach(([k, v]) => {
          if (v && typeof v !== 'object') {
            const labels = { code:'Code', nom:'Nom', type:'Type', marque:'Marque', modele:'Modèle', serie:'N° série',
              fluide:'Fluide', chargeNom:'Charge nominale', chargeAct:'Charge actuelle', eqCO2:'Éq. CO2',
              localisation:'Localisation', miseEnService:'Mise en service', prochainControle:'Prochain contrôle',
              statut:'Statut', capacite:'Capacité', masseVide:'Masse vide', stockActuel:'Stock actuel',
              categorie:'Catégorie', fournisseur:'Fournisseur', prenom:'Prénom', role:'Rôle',
              attestation:'Attestation', prg:'PRG', famille:'Famille', siret:'SIRET', ville:'Ville' };
            html += '<div><strong>' + (labels[k] || k) + ' :</strong> ' + v + '</div>';
          }
        });
        if (data.entite.client) {
          html += '<div style="grid-column:1/-1;margin-top:8px;padding-top:8px;border-top:1px solid #93C5FD;">';
          html += '<strong>Détenteur :</strong> ' + data.entite.client.nom + (data.entite.client.siret ? ' (SIRET: ' + data.entite.client.siret + ')' : '') + (data.entite.client.ville ? ' — ' + data.entite.client.ville : '');
          html += '</div>';
        }
        html += '</div></div>';
      }

      // Mouvements
      html += '<div style="margin-bottom:16px;">';
      html += '<h3 style="margin:0 0 8px;border-bottom:2px solid #3B82F6;padding-bottom:4px;">Mouvements (' + data.mouvements.length + ')</h3>';
      if (data.mouvements.length === 0) {
        html += '<p style="color:#999;font-size:13px;">Aucun mouvement enregistré</p>';
      } else {
        html += '<table class="table" style="width:100%;font-size:12px;"><thead><tr><th>Date</th><th>Type</th><th>Machine</th><th>Bouteille</th><th>Masse</th><th>Opérateur</th><th>Validateur</th><th>Statut</th></tr></thead><tbody>';
        data.mouvements.forEach(m => {
          html += '<tr><td>' + this.formatDate(m.date) + '</td><td>' + (m.type||'--') + '</td><td><code>' + (m.machine||'--') + '</code></td><td><code>' + (m.bouteille||'--') + '</code></td><td>' + (m.masse||0) + ' kg</td><td>' + (m.operateur||'--') + '</td><td>' + (m.validateur||'--') + '</td><td><span class="badge badge-' + this.getStatutBadgeClass(m.statut) + '">' + (m.statut||'--') + '</span></td></tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div>';

      // Contrôles
      html += '<div style="margin-bottom:16px;">';
      html += '<h3 style="margin:0 0 8px;border-bottom:2px solid #10B981;padding-bottom:4px;">Contrôles (' + data.controles.length + ')</h3>';
      if (data.controles.length === 0) {
        html += '<p style="color:#999;font-size:13px;">Aucun contrôle enregistré</p>';
      } else {
        html += '<table class="table" style="width:100%;font-size:12px;"><thead><tr><th>Date</th><th>Machine</th><th>Fluide</th><th>Méthode</th><th>Résultat</th><th>Opérateur</th></tr></thead><tbody>';
        data.controles.forEach(c => {
          html += '<tr><td>' + this.formatDate(c.date) + '</td><td><code>' + (c.machine||'--') + '</code></td><td>' + (c.fluide||'--') + '</td><td>' + (c.methode||'--') + '</td><td><span class="badge badge-' + (c.resultat === 'Conforme' ? 'success' : 'danger') + '">' + (c.resultat||'--') + '</span></td><td>' + (c.operateur||'--') + '</td></tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div>';

      // CERFAs
      html += '<div style="margin-bottom:16px;">';
      html += '<h3 style="margin:0 0 8px;border-bottom:2px solid #F59E0B;padding-bottom:4px;">CERFAs générés (' + data.cerfas.length + ')</h3>';
      if (data.cerfas.length === 0) {
        html += '<p style="color:#999;font-size:13px;">Aucun CERFA généré</p>';
      } else {
        html += '<table class="table" style="width:100%;font-size:12px;"><thead><tr><th>N° FI</th><th>Date</th><th>Machine</th><th>Mouvement</th><th>Opérateur</th><th>Mode</th><th>PDF</th></tr></thead><tbody>';
        data.cerfas.forEach(c => {
          var lienFI = c.urlPdf ? '<a href="' + c.urlPdf + '" target="_blank" style="color:#1E40AF;font-weight:bold;text-decoration:underline;">' + c.id + '</a>' : '<strong>' + c.id + '</strong>';
          var btnPdf = c.urlPdf ? '<a href="' + c.urlPdf + '" target="_blank" class="btn btn-sm btn-primary" title="Ouvrir le PDF">📄</a>' : '<em style="color:#999;">—</em>';
          html += '<tr><td>' + lienFI + '</td><td>' + this.formatDate(c.date) + '</td><td><code>' + (c.machine||'--') + '</code></td><td><code>' + (c.mouvement||'--') + '</code></td><td>' + (c.operateur||'--') + '</td><td><span class="badge">' + (c.mode||'--') + '</span></td><td>' + btnPdf + '</td></tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div>';

      // Bouton Documents MES (uniquement pour les machines)
      if (type === 'machine') {
        html += '<div style="margin-bottom:16px;text-align:center;">';
        html += '<button class="btn btn-primary" id="btn-documents-mes" data-machine="' + id + '" style="font-size:14px;padding:10px 24px;">📋 Documents MES</button>';
        html += '</div>';
      }

      // Résumé traçabilité
      html += '<div style="background:#ECFDF5;border:1px solid #10B981;border-radius:8px;padding:12px;font-size:13px;">';
      html += '<strong>Résumé traçabilité :</strong> ';
      html += data.mouvements.length + ' mouvement(s), ';
      html += data.controles.length + ' contrôle(s), ';
      html += data.cerfas.length + ' CERFA(s) liés à cette ' + (type === 'machine' ? 'machine' : type === 'bouteille' ? 'bouteille' : type === 'operateur' ? 'cet opérateur' : 'ce fluide');
      html += '</div>';

      body.innerHTML = html;

      // Binding bouton Documents MES
      const btnMES = document.getElementById('btn-documents-mes');
      if (btnMES) {
        btnMES.addEventListener('click', () => {
          const machCode = btnMES.dataset.machine;
          modal.classList.add('hidden');
          document.getElementById('mes-machine-code').value = machCode;
          // Reset les champs du formulaire MES
          ['mes-hp','mes-bp','mes-t-condensation','mes-t-evaporation','mes-t-refoulement','mes-t-aspiration',
           'mes-t-sortie-condenseur','mes-t-sortie-evaporateur','mes-i-compresseur','mes-i-evaporateur',
           'mes-consigne','mes-cut-in','mes-cut-in-diff','mes-cut-off','mes-cut-off-diff'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
          });
          document.getElementById('modal-mes').classList.remove('hidden');
        });
      }
    } catch (err) {
      body.innerHTML = '<div style="text-align:center;padding:40px;color:red;"><p>Erreur : ' + err.message + '</p></div>';
    }

    // Close handlers (utiliser onclick pour éviter les listeners multiples)
    document.getElementById('detail-close').onclick = () => modal.classList.add('hidden');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };
  },

  /**
   * Rendu de la vue admin
   */
  async renderAdmin() {
    // Charger config entreprise
    if (State.config) {
      document.getElementById('config-etablissement').value = State.config.etablissement || '';
      document.getElementById('config-adresse').value = State.config.adresse || '';
      document.getElementById('config-siret').value = State.config.siret || '';
    }

    // Charger et afficher utilisateurs
    try {
      const usersRes = await API.getUsers();
      const users = usersRes.data || [];
      const usersList = document.getElementById('admin-users-list');
      if (users.length === 0) {
        usersList.innerHTML = '<p style="color:#999;">Aucun utilisateur enregistré.</p>';
      } else {
        usersList.innerHTML = '<table class="table" style="width:100%;font-size:13px;"><thead><tr>' +
          '<th>ID</th><th>Nom</th><th>Rôle</th><th>Attestation</th><th>Validité</th><th>Cat.</th>' +
          '</tr></thead><tbody>' +
          users.map(u => {
            const attClass = u.attestationValide === false ? 'color:red;font-weight:bold;' : (u.attestationStatus === 'ALERTE' ? 'color:orange;' : '');
            return `<tr>
              <td><code>${u.id}</code></td>
              <td><strong>${u.prenom || ''} ${u.nom || ''}</strong></td>
              <td><span class="badge">${u.role}</span></td>
              <td>${u.attestation || '<em style="color:#999;">Non renseignée</em>'}</td>
              <td style="${attClass}">${u.validiteAttestation || '--'}</td>
              <td>${u.cat2008 || u.cat2025 || '--'}</td>
            </tr>`;
          }).join('') +
          '</tbody></table>';
      }
    } catch (e) {
      document.getElementById('admin-users-list').innerHTML = '<p style="color:red;">Erreur chargement utilisateurs</p>';
    }

    // Afficher clients
    const clientsList = document.getElementById('admin-clients-list');
    if (State.clients.length === 0) {
      clientsList.innerHTML = '<p style="color:#999;">Aucun client enregistré.</p>';
    } else {
      clientsList.innerHTML = '<table class="table" style="width:100%;font-size:13px;"><thead><tr>' +
        '<th>ID</th><th>Nom</th><th>Ville</th><th>SIRET</th><th>Contact</th>' +
        '</tr></thead><tbody>' +
        State.clients.map(c => `<tr>
          <td><code>${c.id}</code></td>
          <td><strong>${c.nom}</strong></td>
          <td>${c.ville || '--'}</td>
          <td>${c.siret || '--'}</td>
          <td>${c.contact || '--'} ${c.tel ? '(' + c.tel + ')' : ''}</td>
        </tr>`).join('') +
        '</tbody></table>';
    }

    // Afficher détecteurs
    try {
      const detectRes = await API.getDetecteurs();
      const detecteurs = detectRes.data || [];
      State.detecteurs = detecteurs;
      const detectList = document.getElementById('admin-detecteurs-list');
      if (detecteurs.length === 0) {
        detectList.innerHTML = '<p style="color:#999;">Aucun détecteur enregistré.</p>';
      } else {
        detectList.innerHTML = '<table class="table" style="width:100%;font-size:13px;"><thead><tr>' +
          '<th>Code</th><th>Marque</th><th>Modèle</th><th>Étalonnage</th><th>Prochain</th><th>Statut</th>' +
          '</tr></thead><tbody>' +
          detecteurs.map(d => {
            const perime = this.isDatePassed(d.prochain);
            const statutHtml = perime
              ? '<span class="badge badge-danger" style="background:#DC2626;color:#fff;font-weight:bold;">Étalonnage échu</span>'
              : '<span class="badge badge-success" style="background:#059669;color:#fff;">Valide</span>';
            return `<tr${perime ? ' style="background:#FEF2F2;"' : ''}>
            <td><code>${d.code || d.id}</code></td>
            <td>${d.marque || '--'}</td>
            <td>${d.modele || '--'}</td>
            <td>${d.etalonnage || '--'}</td>
            <td style="${perime ? 'color:#DC2626;font-weight:bold;' : ''}">${d.prochain || '--'}</td>
            <td>${statutHtml}</td>
          </tr>`;
          }).join('') +
          '</tbody></table>';
      }
    } catch (e) {
      document.getElementById('admin-detecteurs-list').innerHTML = '<p style="color:red;">Erreur chargement détecteurs</p>';
    }

    // Afficher fluides
    const fluidesList = document.getElementById('admin-fluides-list');
    if (State.fluides.length === 0) {
      fluidesList.innerHTML = '<p style="color:#999;">Aucun fluide.</p>';
    } else {
      fluidesList.innerHTML = '<table class="table" style="width:100%;font-size:13px;"><thead><tr>' +
        '<th>Code</th><th>Nom</th><th>PRG</th><th>Famille</th><th>Sécurité</th>' +
        '</tr></thead><tbody>' +
        State.fluides.map(f => `<tr>
          <td><strong>${f.code}</strong></td>
          <td>${f.nom || '--'}</td>
          <td>${f.prg || '--'}</td>
          <td>${f.famille || '--'}</td>
          <td>${f.securite || '--'}</td>
        </tr>`).join('') +
        '</tbody></table>';
    }

    // Charger statut Trackdéchets
    try {
      const tdRes = await API.get('getTrackdechetsStatus');
      const tdStatus = document.getElementById('trackdechets-status');
      if (tdRes.success && tdRes.data) {
        const td = tdRes.data;
        const statusColor = td.ready ? '#059669' : (td.tokenConfigured ? '#D97706' : '#DC2626');
        const statusText = td.ready ? 'Connecté — ' + td.mode : (td.tokenConfigured ? 'Token configuré mais désactivé' : 'Non configuré');
        tdStatus.innerHTML = `<span style="color:${statusColor};font-weight:bold;">● ${statusText}</span>`;
        if (td.url && td.url.indexOf('sandbox') === -1) {
          document.getElementById('config-td-mode').value = 'production';
        }
      } else {
        document.getElementById('trackdechets-status').innerHTML = '<span style="color:#999;">Statut indisponible</span>';
      }
    } catch (e) {
      document.getElementById('trackdechets-status').innerHTML = '<span style="color:#999;">Erreur chargement statut</span>';
    }

    // Charger journal d'audit
    try {
      const auditRes = await API.getAuditLog({ limit: 50 });
      const logs = auditRes.data || [];
      const auditList = document.getElementById('admin-audit-list');
      if (logs.length === 0) {
        auditList.innerHTML = '<p style="color:#999;">Aucune entrée dans le journal.</p>';
      } else {
        auditList.innerHTML = '<table class="table" style="width:100%;font-size:12px;"><thead><tr>' +
          '<th>Date</th><th>Utilisateur</th><th>Catégorie</th><th>Action</th><th>Objet</th><th>Résultat</th>' +
          '</tr></thead><tbody>' +
          logs.map(l => `<tr>
            <td>${l.timestamp || '--'}</td>
            <td>${l.utilisateur || '--'}</td>
            <td><span class="badge">${l.categorie || '--'}</span></td>
            <td>${l.action || '--'}</td>
            <td><code>${l.objet || '--'}</code></td>
            <td><span class="badge badge-${l.resultat === 'success' ? 'success' : 'danger'}">${l.resultat || '--'}</span></td>
          </tr>`).join('') +
          '</tbody></table>';
      }
    } catch (e) {
      document.getElementById('admin-audit-list').innerHTML = '<p style="color:red;">Erreur chargement audit</p>';
    }

    // Binding refresh audit
    const btnRefresh = document.getElementById('btn-refresh-audit');
    if (btnRefresh) btnRefresh.onclick = () => this.renderAdmin();
  }
};

// Export global
window.UI = UI;
