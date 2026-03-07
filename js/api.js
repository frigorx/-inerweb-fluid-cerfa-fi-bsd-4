/**
 * inerWeb Fluide - API Module v7.1.0
 * Communication avec le backend Google Apps Script
 */

const API = {
  baseUrl: '',
  apiKey: '',

  init(url) {
    this.baseUrl = url.replace(/\/$/, '');
    this.apiKey = localStorage.getItem('inerweb_apikey') || '';
  },

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('inerweb_apikey', key);
  },

  clearApiKey() {
    this.apiKey = '';
    localStorage.removeItem('inerweb_apikey');
  },

  async get(action, params = {}) {
    const url = new URL(this.baseUrl);
    url.searchParams.set('action', action);
    if (this.apiKey) {
      url.searchParams.set('apiKey', this.apiKey);
    }
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });

    try {
      const response = await fetch(url.toString());
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

  async post(action, body = {}) {
    const url = new URL(this.baseUrl);
    url.searchParams.set('action', action);
    if (this.apiKey) {
      url.searchParams.set('apiKey', this.apiKey);
    }

    try {
      // Utiliser text/plain pour éviter le preflight CORS
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
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

  async login(identifiant, password = '') {
    return this.post('login', { identifiant, password });
  },

  async getConfig() { return this.get('getConfig'); },
  async getDashboard() { return this.get('getDashboard'); },
  async getMachines(siteId = null) { return this.get('getMachines', { siteId }); },
  async getBouteilles(siteId = null) { return this.get('getBouteilles', { siteId }); },
  async getFluides() { return this.get('getFluides'); },
  async getMouvements(params = {}) { return this.get('getMouvements', params); },
  async getControles(params = {}) { return this.get('getControles', params); },
  async getAlertes() { return this.get('getAlertes'); },
  async getAlertesReglementaires() { return this.get('getAlertesReglementaires'); },
  async getStatsAvancees(params = {}) { return this.get('getStatsAvancees', params); },
  async createMouvement(data) { return this.post('createMouvement', data); },
  async validerMouvement(mouvementId, validateurId, commentaire = '') {
    return this.post('validerMouvement', { mouvementId, validateurId, commentaire });
  },
  async annulerMouvement(mouvementId, motif) {
    return this.post('annulerMouvement', { mouvementId, motif });
  },
  async createControle(data) { return this.post('createControle', data); },
  async createMachine(data) { return this.post('createMachine', data); },
  async createBouteille(data) { return this.post('createBouteille', data); },
  async genererCerfa(mouvementId) { return this.post('genererCerfa', { mouvementId }); },
  async exportPro(type, params = {}) { return this.get('exportPro', { type, ...params }); }
};

window.API = API;
