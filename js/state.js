/**
 * inerWeb Fluide - State Module v7.1.0
 * Gestion de l'état de l'application
 */

const State = {
  // État de l'utilisateur
  user: null,
  isLoggedIn: false,
  mode: 'FORMATION', // FORMATION ou OFFICIEL

  // Fluides par défaut (fallback si le serveur ne renvoie rien)
  DEFAULT_FLUIDES: [
    { code: 'R32', nom: 'Difluorométhane', prg: 675, famille: 'HFC', securite: 'A2L' },
    { code: 'R410A', nom: 'Mélange R32/R125', prg: 2088, famille: 'HFC', securite: 'A1' },
    { code: 'R134a', nom: 'Tétrafluoroéthane', prg: 1430, famille: 'HFC', securite: 'A1' },
    { code: 'R404A', nom: 'Mélange HFC', prg: 3922, famille: 'HFC', securite: 'A1' },
    { code: 'R407C', nom: 'Mélange HFC', prg: 1774, famille: 'HFC', securite: 'A1' },
    { code: 'R407F', nom: 'Mélange HFC', prg: 1825, famille: 'HFC', securite: 'A1' },
    { code: 'R449A', nom: 'Mélange HFO/HFC', prg: 1397, famille: 'HFO', securite: 'A1' },
    { code: 'R448A', nom: 'Mélange HFO/HFC', prg: 1387, famille: 'HFO', securite: 'A1' },
    { code: 'R290', nom: 'Propane', prg: 3, famille: 'HC', securite: 'A3' },
    { code: 'R600a', nom: 'Isobutane', prg: 3, famille: 'HC', securite: 'A3' },
    { code: 'R744', nom: 'CO2', prg: 1, famille: 'Naturel', securite: 'A1' },
    { code: 'R1234yf', nom: 'Tétrafluoropropène', prg: 4, famille: 'HFO', securite: 'A2L' },
    { code: 'R1234ze', nom: 'Trans-1,3,3,3-TFP', prg: 7, famille: 'HFO', securite: 'A2L' },
    { code: 'R513A', nom: 'Mélange HFO/HFC', prg: 631, famille: 'HFO', securite: 'A1' }
  ],

  // Données
  config: null,
  machines: [],
  bouteilles: [],
  fluides: [],
  clients: [],
  detecteurs: [],
  mouvements: [],
  controles: [],
  alertes: [],
  archives: { machines: [], bouteilles: [] },
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
    this.clients = [];
    this.detecteurs = [];
    this.mouvements = [];
    this.controles = [];
    this.alertes = [];
    this.archives = { machines: [], bouteilles: [] };
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
      const [configRes, machinesRes, bouteillesRes, fluidesRes, alertesRes, clientsRes, detecteursRes] = await Promise.all([
        API.getConfig(),
        API.getMachines(),
        API.getBouteilles(),
        API.getFluides(),
        API.getAlertes(),
        API.getClients(),
        API.getDetecteurs()
      ]);

      this.config = configRes.data || configRes.config;
      this.machines = (machinesRes.data || machinesRes.machines || []).map(m => ({
        ...m, id: m.code || m.id, charge: m.chargeAct || m.chargeNom,
        chargeActuelle: m.chargeAct || m.chargeNom, prochainControle: m.prochControle
      }));
      this.bouteilles = (bouteillesRes.data || bouteillesRes.bouteilles || []).map(b => ({
        ...b, id: b.code || b.id, stockActuel: b.masseFluide || 0, capacite: b.contenance || 10
      }));
      const fluidesData = fluidesRes.data || fluidesRes.fluides || [];
      this.fluides = fluidesData.length > 0 ? fluidesData : this.DEFAULT_FLUIDES;
      this.alertes = alertesRes.data || alertesRes.alertes || [];
      this.clients = clientsRes.data || [];
      this.detecteurs = detecteursRes.data || [];
      
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
      this.mouvements = (res.data || res.mouvements || []).map(m => ({
        ...m, machineCode: m.machine, date: m.date, quantite: m.masse
      }));
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
      this.controles = (res.data || res.controles || []).map(c => ({
        ...c, machineCode: c.machine, resultat: c.resultat
      }));
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
    return this.machines.find(m => m.id === id || m.code === id);
  },

  /**
   * Trouve une bouteille par ID
   */
  getBouteilleById(id) {
    return this.bouteilles.find(b => b.id === id || b.code === id);
  },
  
  /**
   * Trouve un fluide par code
   */
  getFluidByCode(code) {
    return this.fluides.find(f => f.code === code);
  },
  
  /**
   * Trouve un client par ID
   */
  getClientById(id) {
    return this.clients.find(c => c.id === id);
  },

  /**
   * Filtre les bouteilles compatibles avec un fluide
   */
  getBouteillesCompatibles(fluideCode) {
    return this.bouteilles.filter(b => b.fluide === fluideCode);
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
