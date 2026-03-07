/**
 * inerWeb Fluide - State Module v7.1.0
 * Gestion de l'état de l'application
 */

const State = {
  // État de l'utilisateur
  user: null,
  isLoggedIn: false,
  mode: 'FORMATION', // FORMATION ou OFFICIEL
  
  // Données
  config: null,
  machines: [],
  bouteilles: [],
  fluides: [],
  mouvements: [],
  controles: [],
  alertes: [],
  stats: null,
  
  // UI
  currentView: 'dashboard',
  isLoading: false,
  
  // Wizard
  wizard: {
    active: false,
    step: 1,
    data: {}
  },
  
  /**
   * Réinitialise l'état
   */
  reset() {
    this.user = null;
    this.isLoggedIn = false;
    this.mode = 'FORMATION';
    this.config = null;
    this.machines = [];
    this.bouteilles = [];
    this.fluides = [];
    this.mouvements = [];
    this.controles = [];
    this.alertes = [];
    this.stats = null;
    this.currentView = 'dashboard';
    this.wizard = { active: false, step: 1, data: {} };
  },
  
  /**
   * Définit l'utilisateur connecté
   */
  setUser(userData) {
    this.user = userData;
    this.isLoggedIn = true;
    this.mode = userData.canUseOfficiel ? 'OFFICIEL' : 'FORMATION';
  },
  
  /**
   * Déconnexion
   */
  logout() {
    API.clearApiKey();
    this.reset();
  },
  
  /**
   * Change le mode (FORMATION/OFFICIEL)
   */
  setMode(mode) {
    if (mode === 'OFFICIEL' && !this.user?.canUseOfficiel) {
      console.warn('Mode OFFICIEL non autorisé pour cet utilisateur');
      return false;
    }
    this.mode = mode;
    return true;
  },
  
  /**
   * Vérifie si l'utilisateur a une permission
   */
  hasPermission(permission) {
    if (!this.user || !this.user.permissions) return false;
    return this.user.permissions.includes(permission);
  },
  
  /**
   * Obtient les initiales de l'utilisateur
   */
  getUserInitials() {
    if (!this.user || !this.user.nomComplet) return '--';
    const parts = this.user.nomComplet.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return this.user.nomComplet.substring(0, 2).toUpperCase();
  },
  
  /**
   * Charge les données initiales
   */
  async loadInitialData() {
    this.isLoading = true;
    
    try {
      // Charger en parallèle
      const [configRes, machinesRes, bouteillesRes, fluidesRes, alertesRes] = await Promise.all([
        API.getConfig(),
        API.getMachines(),
        API.getBouteilles(),
        API.getFluides(),
        API.getAlertes()
      ]);
      
      this.config = configRes.data || configRes.config;
      this.machines = machinesRes.data || machinesRes.machines || [];
      this.bouteilles = bouteillesRes.data || bouteillesRes.bouteilles || [];
      this.fluides = fluidesRes.data || fluidesRes.fluides || [];
      this.alertes = alertesRes.data || alertesRes.alertes || [];
      
    } catch (error) {
      console.error('Erreur chargement données:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  },
  
  /**
   * Charge les mouvements
   */
  async loadMouvements(params = {}) {
    try {
      const res = await API.getMouvements(params);
      this.mouvements = res.data || res.mouvements || [];
    } catch (error) {
      console.error('Erreur chargement mouvements:', error);
    }
  },
  
  /**
   * Charge les contrôles
   */
  async loadControles(params = {}) {
    try {
      const res = await API.getControles(params);
      this.controles = res.data || res.controles || [];
    } catch (error) {
      console.error('Erreur chargement contrôles:', error);
    }
  },
  
  /**
   * Charge les stats avancées
   */
  async loadStats(params = {}) {
    try {
      const res = await API.getStatsAvancees(params);
      this.stats = res.data || res.stats;
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  },
  
  /**
   * Rafraîchit les alertes
   */
  async refreshAlertes() {
    try {
      const res = await API.getAlertes();
      this.alertes = res.data || res.alertes || [];
    } catch (error) {
      console.error('Erreur rafraîchissement alertes:', error);
    }
  },
  
  /**
   * Trouve une machine par ID
   */
  getMachineById(id) {
    return this.machines.find(m => m.id === id);
  },
  
  /**
   * Trouve une bouteille par ID
   */
  getBouteilleById(id) {
    return this.bouteilles.find(b => b.id === id);
  },
  
  /**
   * Trouve un fluide par code
   */
  getFluidByCode(code) {
    return this.fluides.find(f => f.code === code);
  },
  
  /**
   * Filtre les bouteilles compatibles avec un fluide
   */
  getBouteillesCompatibles(fluideCode) {
    return this.bouteilles.filter(b => b.fluide === fluideCode && b.stockActuel > 0);
  },
  
  /**
   * Compte les alertes actives
   */
  getAlertesCount() {
    return this.alertes.filter(a => !a.resolved).length;
  },
  
  /**
   * Wizard: démarre
   */
  startWizard() {
    this.wizard = {
      active: true,
      step: 1,
      data: {
        type: null,
        machineId: null,
        bouteilleId: null,
        peseeAvant: null,
        peseeApres: null,
        quantite: null,
        signature: null,
        mode: this.mode
      }
    };
  },
  
  /**
   * Wizard: étape suivante
   */
  wizardNext() {
    if (this.wizard.step < 5) {
      this.wizard.step++;
    }
  },
  
  /**
   * Wizard: étape précédente
   */
  wizardPrev() {
    if (this.wizard.step > 1) {
      this.wizard.step--;
    }
  },
  
  /**
   * Wizard: annule
   */
  wizardCancel() {
    this.wizard = { active: false, step: 1, data: {} };
  },
  
  /**
   * Wizard: met à jour les données
   */
  wizardSetData(key, value) {
    this.wizard.data[key] = value;
  }
};

// Export global
window.State = State;
