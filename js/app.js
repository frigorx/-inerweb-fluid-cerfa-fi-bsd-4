/**
 * inerWeb Fluide - App Module v7.1.0
 * Initialisation et gestion principale
 */

const App = {
  // Version
  version: '7.1.0',
  
  /**
   * Initialise l'application
   */
  async init() {
    console.log(`inerWeb Fluide v${this.version} - Initialisation...`);
    
    // Initialiser l'UI
    UI.init();
    
    // Configurer l'API
    const defaultApiUrl = 'https://script.google.com/macros/s/AKfycbxBOTSCbAW1C0aQSAJhIcEFWQKV6Eqy371LKSoWFIL2HQPq3g0enqcFWFIIYevxGc_l2g/exec';
    const apiUrl = localStorage.getItem('inerweb_api_url') || defaultApiUrl;
    localStorage.setItem('inerweb_api_url', apiUrl);
    API.init(apiUrl);
    
    // Vérifier si déjà connecté
    const savedApiKey = localStorage.getItem('inerweb_apikey');
    if (savedApiKey && apiUrl) {
      API.setApiKey(savedApiKey);
      try {
        await this.autoLogin();
      } catch (error) {
        console.log('Auto-login échoué, affichage login');
        UI.showLogin();
      }
    } else {
      UI.showLogin();
    }
    
    // Bindings
    this.bindEvents();
    
    console.log('inerWeb Fluide initialisé');
  },
  
  /**
   * Tentative de reconnexion automatique
   */
  async autoLogin() {
    const response = await API.get('getUserRole');
    if (response.success && response.data) {
      State.setUser(response.data);
      await State.loadInitialData();
      UI.showApp();
    } else {
      throw new Error('Session expirée');
    }
  },
  
  /**
   * Connexion manuelle
   */
  async login(identifiant, password) {
    try {
      UI.setLoginLoading(true);
      UI.hideLoginError();
      
      const response = await API.login(identifiant, password);
      
      if (response.success && response.data) {
        // Sauvegarder la clé API si retournée
        if (response.data.apiKey) {
          API.setApiKey(response.data.apiKey);
        }
        
        State.setUser(response.data);
        await State.loadInitialData();
        UI.showApp();
        UI.toast(`Bienvenue ${State.user.nomComplet || identifiant} !`, 'success');
      } else {
        throw new Error(response.error || 'Connexion échouée');
      }
      
    } catch (error) {
      UI.showLoginError(error.message);
    } finally {
      UI.setLoginLoading(false);
    }
  },
  
  /**
   * Déconnexion
   */
  logout() {
    State.logout();
    UI.showLogin();
    UI.toast('Déconnexion réussie', 'info');
  },
  
  /**
   * Bindings des événements
   */
  bindEvents() {
    // Login form
    UI.elements.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = UI.elements.loginId.value.trim();
      const pwd = UI.elements.loginPassword.value;
      if (id) {
        this.login(id, pwd);
      }
    });
    
    // Logout
    UI.elements.btnLogout.addEventListener('click', () => {
      if (confirm('Voulez-vous vous déconnecter ?')) {
        this.logout();
      }
    });
    
    // Navigation
    UI.elements.mainNav.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item');
      if (navItem && navItem.dataset.view) {
        UI.showView(navItem.dataset.view);
      }
    });
    
    // Boutons d'action dashboard
    document.getElementById('btn-nouveau-mouvement')?.addEventListener('click', () => {
      UI.showWizard();
    });
    
    // Wizard navigation
    UI.elements.wizardPrev.addEventListener('click', () => {
      State.wizardPrev();
      UI.renderWizardStep();
    });
    
    UI.elements.wizardNext.addEventListener('click', async () => {
      const step = State.wizard.step;
      
      // Valider l'étape courante
      if (!Wizard.validateStep(step)) {
        return;
      }
      
      if (step === 5) {
        // Dernière étape: soumettre
        await Wizard.submit();
      } else {
        // Étape suivante
        State.wizardNext();
        UI.renderWizardStep();
      }
    });
    
    UI.elements.wizardCancel.addEventListener('click', () => {
      if (confirm('Abandonner ce mouvement ?')) {
        UI.hideWizard();
      }
    });
    
    // Fermer wizard en cliquant sur l'overlay
    UI.elements.wizardOverlay.addEventListener('click', (e) => {
      if (e.target === UI.elements.wizardOverlay) {
        if (confirm('Abandonner ce mouvement ?')) {
          UI.hideWizard();
        }
      }
    });
    
    // Mode toggle (clic sur le badge)
    UI.elements.modeBadge.addEventListener('click', () => {
      if (!State.user?.canUseOfficiel) {
        UI.toast('Mode OFFICIEL non autorisé', 'warning');
        return;
      }
      
      const newMode = State.mode === 'FORMATION' ? 'OFFICIEL' : 'FORMATION';
      if (State.setMode(newMode)) {
        UI.updateHeader();
        UI.toast(`Mode ${newMode} activé`, 'info');
      }
    });
    
    // Boutons d'ajout
    document.getElementById('btn-add-machine')?.addEventListener('click', () => {
      UI.toast('Fonctionnalité à venir', 'info');
    });
    
    document.getElementById('btn-add-bouteille')?.addEventListener('click', () => {
      UI.toast('Fonctionnalité à venir', 'info');
    });
    
    document.getElementById('btn-add-mouvement')?.addEventListener('click', () => {
      UI.showWizard();
    });
    
    document.getElementById('btn-add-controle')?.addEventListener('click', () => {
      UI.toast('Fonctionnalité à venir', 'info');
    });
    
    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
      // Escape pour fermer le wizard
      if (e.key === 'Escape' && State.wizard.active) {
        UI.hideWizard();
      }
    });
    
    // Refresh périodique des alertes (toutes les 5 minutes)
    setInterval(async () => {
      if (State.isLoggedIn) {
        await State.refreshAlertes();
        UI.updateAlertesBadge();
      }
    }, 5 * 60 * 1000);
  }
};

// Démarrage au chargement
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Export global
window.App = App;
