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
        alertes: document.getElementById('view-alertes')
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
    switch (viewName) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'machines':
        this.renderMachines();
        break;
      case 'bouteilles':
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
    
    // Alertes (max 3)
    const alertes = State.alertes.slice(0, 3);
    if (alertes.length === 0) {
      this.elements.dashboardAlertes.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <div class="empty-state-title">Aucune alerte</div>
          <div class="empty-state-desc">Tout est en ordre !</div>
        </div>
      `;
    } else {
      this.elements.dashboardAlertes.innerHTML = alertes.map(a => this.renderAlerteCard(a)).join('');
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
    
    this.elements.machinesList.innerHTML = State.machines.map(m => `
      <div class="machine-card" data-id="${m.id}">
        <div class="machine-header">
          <div class="machine-icon">${this.getMachineIcon(m.type)}</div>
          <span class="machine-status ${this.getMachineStatusClass(m)}">${this.getMachineStatusLabel(m)}</span>
        </div>
        <div class="machine-code">${m.code || m.id}</div>
        <div class="machine-name">${m.nom || m.designation || '--'}</div>
        <div class="machine-specs">
          <div class="spec-item">
            <span class="spec-label">Fluide</span>
            <span class="spec-value refrigerant">${m.fluide || '--'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Charge</span>
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
      </div>
    `).join('');
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
  },
  
  // ========== MOUVEMENTS ==========
  
  renderMouvements() {
    if (State.mouvements.length === 0) {
      this.elements.mouvementsTbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted" style="padding: 40px;">
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
        actions.push(`<button class="btn btn-sm btn-success btn-valider-mvt" data-id="${id}" title="Valider">✓</button>`);
        actions.push(`<button class="btn btn-sm btn-danger btn-annuler-mvt" data-id="${id}" title="Annuler">✕</button>`);
      }
      if (m.statut === 'valide') {
        actions.push(`<button class="btn btn-sm btn-primary btn-cerfa-mvt" data-id="${id}" title="Générer CERFA">📄</button>`);
      }
      return `
        <tr>
          <td>${this.formatDate(m.date)}</td>
          <td>${m.machineCode || m.machineId || '--'}</td>
          <td>${m.type || '--'}</td>
          <td>${parseFloat(m.quantite || 0).toFixed(2)} kg</td>
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
          // Afficher le CERFA dans une nouvelle fenêtre
          const w = window.open('', '_blank', 'width=700,height=800');
          w.document.write('<html><head><title>CERFA ' + res.data.id + '</title></head><body><pre style="font-family:monospace;white-space:pre-wrap;padding:20px;">' + res.data.contenu + '</pre></body></html>');
          w.document.close();
          this.toast('CERFA ' + res.data.id + ' généré', 'success');
        } catch (e) { this.toast('Erreur: ' + e.message, 'error'); }
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
          <td colspan="4" class="text-center text-muted" style="padding: 40px;">
            Aucun contrôle enregistré
          </td>
        </tr>
      `;
      return;
    }
    
    this.elements.controlesTbody.innerHTML = State.controles.slice(0, 50).map(c => `
      <tr>
        <td>${this.formatDate(c.date)}</td>
        <td>${c.machineCode || c.machineId || '--'}</td>
        <td><span class="badge badge-${c.resultat === 'Conforme' ? 'success' : 'danger'}">${c.resultat || '--'}</span></td>
        <td>${this.formatDate(c.prochainControle)}</td>
      </tr>
    `).join('');
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
        <div class="stat-value">${s.operateurs?.total || 0}</div>
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
    const type = alerte.niveau === 'CRITIQUE' ? 'danger' : 'warning';
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
  }
};

// Export global
window.UI = UI;
