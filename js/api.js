/**
 * inerWeb Fluide - API Module v7.1.0
 * Toutes les requêtes passent en GET pour éviter le preflight CORS
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

  async request(action, params = {}) {
    const url = new URL(this.baseUrl);
    url.searchParams.set('action', action);
    if (this.apiKey) {
      url.searchParams.set('apiKey', this.apiKey);
    }
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    });
    const response = await fetch(url.toString());
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Erreur');
    return data;
  },

  async login(id, pwd) { return this.request('login', { identifiant: id, password: pwd || '' }); },
  async getConfig() { return this.request('getConfig'); },
  async getDashboard() { return this.request('getDashboard'); },
  async getMachines(s) { return this.request('getMachines', { siteId: s }); },
  async getBouteilles(s) { return this.request('getBouteilles', { siteId: s }); },
  async getFluides() { return this.request('getFluides'); },
  async getMouvements(p) { return this.request('getMouvements', p); },
  async getControles(p) { return this.request('getControles', p); },
  async getAlertes() { return this.request('getAlertes'); },
  async getStatsAvancees(p) { return this.request('getStatsAvancees', p); },
  async createMouvement(d) { return this.request('createMouvement', d); },
  async createControle(d) { return this.request('createControle', d); },
  async createMachine(d) { return this.request('createMachine', d); },
  async createBouteille(d) { return this.request('createBouteille', d); },
  async validerMouvement(id, v, c) { return this.request('validerMouvement', { mouvementId: id, validateurId: v, commentaire: c }); },
  async genererCerfa(id) { return this.request('genererCerfa', { mouvementId: id }); }
};

window.API = API;
