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
      url.searchParams.set('apiKey', this.apiKey);
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
  
  /**
   * Requête POST
   */
  async post(action, body = {}) {
    const url = new URL(this.baseUrl);
    url.searchParams.set('action', action);
    if (this.apiKey) {
      url.searchParams.set('apiKey', this.apiKey);
    }
    
    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur inconnue');
      }
      
      return data;
    } catch (error) {
      console.error(`API POST ${action}:`, error);
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
    return this.post('login', { identifiant, password });
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
    return this.post('createMouvement', data);
  },
  
  /**
   * Valider un mouvement
   */
  async validerMouvement(mouvementId, validateurId, commentaire = '') {
    return this.post('validerMouvement', { mouvementId, validateurId, commentaire });
  },
  
  /**
   * Annuler un mouvement
   */
  async annulerMouvement(mouvementId, motif) {
    return this.post('annulerMouvement', { mouvementId, motif });
  },
  
  /**
   * Créer un contrôle
   */
  async createControle(data) {
    return this.post('createControle', data);
  },
  
  /**
   * Créer une machine
   */
  async createMachine(data) {
    return this.post('createMachine', data);
  },
  
  /**
   * Créer une bouteille
   */
  async createBouteille(data) {
    return this.post('createBouteille', data);
  },
  
  /**
   * Générer CERFA
   */
  async genererCerfa(mouvementId) {
    return this.post('genererCerfa', { mouvementId });
  },
  
  /**
   * Export Pro
   */
  async exportPro(type, params = {}) {
    return this.get('exportPro', { type, ...params });
  }
};

// Export global
window.API = API;
