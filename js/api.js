/**
 * inerWeb Fluide - API Module v7.1.0
 * Communication avec le backend Google Apps Script
 */

const API = {
  // URL du script déployé (à configurer)
  baseUrl: '',
  apiKey: '',
  
  /**
   * Configure l'API avec l'URL du backend
   */
  init(url) {
    this.baseUrl = url.replace(/\/$/, '');
    this.apiKey = localStorage.getItem('inerweb_apikey') || '';
  },
  
  /**
   * Définit la clé API
   */
  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('inerweb_apikey', key);
  },
  
  /**
   * Efface la clé API
   */
  clearApiKey() {
    this.apiKey = '';
    localStorage.removeItem('inerweb_apikey');
  },
  
  /**
   * Requête GET
   */
  async get(action, params = {}) {
    const url = new URL(this.baseUrl);
    url.searchParams.set('action', action);
    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey);
    }
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
    
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur inconnue');
      }
      
      return data;
    } catch (error) {
      console.error(`API GET ${action}:`, error);
      throw error;
    }
  },
  
  // ========== ACTIONS SPÉCIFIQUES ==========
  
  /**
   * Ping - Test de connexion
   */
  async ping() {
    return this.get('ping');
  },
  
  /**
   * Login
   */
  async login(identifiant, password = '') {
    return this.get('login', { identifiant, password });
  },
  
  /**
   * Configuration
   */
  async getConfig() {
    return this.get('getConfig');
  },
  
  /**
   * Dashboard
   */
  async getDashboard() {
    return this.get('getDashboard');
  },
  
  /**
   * Machines
   */
  async getMachines(siteId = null) {
    return this.get('getMachines', { siteId });
  },
  
  /**
   * Bouteilles
   */
  async getBouteilles(siteId = null) {
    return this.get('getBouteilles', { siteId });
  },
  
  /**
   * Fluides
   */
  async getFluides() {
    return this.get('getFluides');
  },
  
  /**
   * Mouvements
   */
  async getMouvements(params = {}) {
    return this.get('getMouvements', params);
  },
  
  /**
   * Contrôles
   */
  async getControles(params = {}) {
    return this.get('getControles', params);
  },
  
  /**
   * Alertes
   */
  async getAlertes() {
    return this.get('getAlertes');
  },
  
  /**
   * Alertes réglementaires
   */
  async getAlertesReglementaires() {
    return this.get('getAlertesReglementaires');
  },
  
  /**
   * Stats avancées
   */
  async getStatsAvancees(params = {}) {
    return this.get('getStatsAvancees', params);
  },
  
  /**
   * Créer un mouvement
   */
  async createMouvement(data) {
    return this.get('createMouvement', data);
  },

  /**
   * Valider un mouvement
   */
  async validerMouvement(mouvementId, validateurId, commentaire = '') {
    return this.get('validerMouvement', { mouvementId, validateurId, commentaire });
  },

  /**
   * Annuler un mouvement
   */
  async annulerMouvement(mouvementId, motif) {
    return this.get('annulerMouvement', { mouvementId, motif });
  },

  /**
   * Créer un contrôle
   */
  async createControle(data) {
    return this.get('createControle', data);
  },

  /**
   * Créer une machine
   */
  async createMachine(data) {
    return this.get('createMachine', data);
  },

  /**
   * Créer une bouteille
   */
  async createBouteille(data) {
    return this.get('createBouteille', data);
  },

  /**
   * Générer CERFA
   */
  async genererCerfa(mouvementId) {
    return this.get('genererCerfa', { id: mouvementId });
  },
  
  /**
   * Clients / Détenteurs
   */
  async getClients(siteId = null) {
    return this.get('getClients', { siteId });
  },

  async createClient(data) {
    return this.get('createClient', data);
  },

  async createUser(data) {
    return this.get('createUser', data);
  },

  async createDetecteur(data) {
    return this.get('createDetecteur', data);
  },

  async saveConfig(data) {
    return this.get('saveConfig', data);
  },

  async getDetecteurs() {
    return this.get('getDetecteurs');
  },

  async getUsers() {
    return this.get('getUsers');
  },

  /**
   * Export Pro
   */
  async exportPro(type, params = {}) {
    return this.get('exportPro', { type, ...params });
  },

  async getBilanAnnuel(annee, fluide = null) {
    return this.get('getBilanAnnuel', { annee, fluide });
  },

  async getTracabilite(type, id) {
    return this.get('getTracabilite', { type, id });
  },

  async getAuditLog(params = {}) {
    return this.get('getAuditLog', params);
  },

  async getCerfa(id) {
    return this.get('getCerfa', { id });
  }
};

// Export global
window.API = API;
