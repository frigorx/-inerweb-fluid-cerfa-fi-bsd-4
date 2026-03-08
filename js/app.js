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
      this.openModalMachine();
    });

    document.getElementById('btn-add-bouteille')?.addEventListener('click', () => {
      this.openModalBouteille();
    });

    document.getElementById('btn-add-mouvement')?.addEventListener('click', () => {
      UI.showWizard();
    });

    document.getElementById('btn-add-controle')?.addEventListener('click', () => {
      this.openModalControle();
    });

    // Modales - Fermeture
    document.getElementById('modal-machine-cancel')?.addEventListener('click', () => {
      document.getElementById('modal-machine').classList.add('hidden');
    });
    document.getElementById('modal-bouteille-cancel')?.addEventListener('click', () => {
      document.getElementById('modal-bouteille').classList.add('hidden');
    });
    document.getElementById('modal-controle-cancel')?.addEventListener('click', () => {
      document.getElementById('modal-controle').classList.add('hidden');
    });

    // Fermer modales en cliquant sur l'overlay
    ['modal-machine', 'modal-bouteille', 'modal-controle'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
          e.target.classList.add('hidden');
        }
      });
    });

    // Modales - Soumission
    document.getElementById('modal-machine-submit')?.addEventListener('click', () => {
      this.submitMachine();
    });
    document.getElementById('modal-bouteille-submit')?.addEventListener('click', () => {
      this.submitBouteille();
    });
    document.getElementById('modal-controle-submit')?.addEventListener('click', () => {
      this.submitControle();
    });

    // Afficher/masquer info machine préchargée
    document.getElementById('machine-prechargee')?.addEventListener('change', (e) => {
      const infoBox = document.getElementById('machine-prechargee-info');
      if (e.target.checked) {
        infoBox.classList.remove('hidden');
      } else {
        infoBox.classList.add('hidden');
      }
    });

    // Afficher/masquer localisation fuite selon résultat contrôle
    document.getElementById('controle-resultat')?.addEventListener('change', (e) => {
      const fuiteGroup = document.getElementById('controle-fuite-group');
      if (e.target.value === 'Fuite') {
        fuiteGroup.classList.remove('hidden');
      } else {
        fuiteGroup.classList.add('hidden');
      }
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
  },

  // ========== MODALE MACHINE ==========

  openModalMachine() {
    // Remplir la liste des fluides
    const select = document.getElementById('machine-fluide');
    select.innerHTML = '<option value="">-- Sélectionner --</option>';
    State.fluides.forEach(f => {
      select.innerHTML += `<option value="${f.code}">${f.code} - ${f.nom || ''} (PRG: ${f.prg || '?'})</option>`;
    });
    document.getElementById('form-machine').reset();
    document.getElementById('modal-machine').classList.remove('hidden');
  },

  async submitMachine() {
    const nom = document.getElementById('machine-nom').value.trim();
    const type = document.getElementById('machine-type').value;
    const fluide = document.getElementById('machine-fluide').value;
    const chargeNom = parseFloat(document.getElementById('machine-charge').value);
    const marque = document.getElementById('machine-marque').value.trim();
    const modele = document.getElementById('machine-modele').value.trim();
    const serie = document.getElementById('machine-serie').value.trim();
    const localisation = document.getElementById('machine-localisation').value.trim();
    const prechargee = document.getElementById('machine-prechargee').checked;

    if (!fluide || !chargeNom) {
      UI.toast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    try {
      document.getElementById('modal-machine-submit').disabled = true;
      const response = await API.get('createMachine', {
        nom, type, fluide, chargeNom, marque, modele, serie, localisation,
        prechargee, operateur: State.user.id
      });
      UI.toast(`Machine ${response.data.code} créée !`, 'success');
      document.getElementById('modal-machine').classList.add('hidden');
      await State.loadInitialData();
      UI.showView('machines');
    } catch (error) {
      UI.toast('Erreur : ' + error.message, 'error');
    } finally {
      document.getElementById('modal-machine-submit').disabled = false;
    }
  },

  // ========== MODALE BOUTEILLE ==========

  openModalBouteille() {
    const select = document.getElementById('bouteille-fluide');
    select.innerHTML = '<option value="">-- Sélectionner --</option>';
    State.fluides.forEach(f => {
      select.innerHTML += `<option value="${f.code}">${f.code} - ${f.nom || ''}</option>`;
    });
    document.getElementById('form-bouteille').reset();
    document.getElementById('modal-bouteille').classList.remove('hidden');
  },

  async submitBouteille() {
    const categorie = document.getElementById('bouteille-categorie').value;
    const fluide = document.getElementById('bouteille-fluide').value;
    const tare = parseFloat(document.getElementById('bouteille-tare').value);
    const etatFluide = document.getElementById('bouteille-etat').value;
    const contenance = parseFloat(document.getElementById('bouteille-contenance').value) || 0;
    const masseFluide = parseFloat(document.getElementById('bouteille-masse').value) || 0;
    const marque = document.getElementById('bouteille-marque').value.trim();
    const fournisseur = document.getElementById('bouteille-fournisseur').value.trim();
    const lot = document.getElementById('bouteille-lot').value.trim();

    if (!fluide || !tare) {
      UI.toast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    try {
      document.getElementById('modal-bouteille-submit').disabled = true;
      const response = await API.get('createBouteille', {
        categorie, fluide, tare, etatFluide, contenance, masseFluide,
        marque, fournisseur, lot, operateur: State.user.id
      });
      UI.toast(`Bouteille ${response.data.code} créée !`, 'success');
      document.getElementById('modal-bouteille').classList.add('hidden');
      await State.loadInitialData();
      UI.showView('bouteilles');
    } catch (error) {
      UI.toast('Erreur : ' + error.message, 'error');
    } finally {
      document.getElementById('modal-bouteille-submit').disabled = false;
    }
  },

  // ========== MODALE CONTRÔLE ==========

  openModalControle() {
    const select = document.getElementById('controle-machine');
    select.innerHTML = '<option value="">-- Sélectionner --</option>';
    State.machines.forEach(m => {
      select.innerHTML += `<option value="${m.code || m.id}">${m.code || m.id} - ${m.nom || m.designation || ''} (${m.fluide || '?'})</option>`;
    });
    document.getElementById('form-controle').reset();
    document.getElementById('controle-fuite-group').classList.add('hidden');
    document.getElementById('modal-controle').classList.remove('hidden');
  },

  async submitControle() {
    const machine = document.getElementById('controle-machine').value;
    const methode = document.getElementById('controle-methode').value;
    const resultat = document.getElementById('controle-resultat').value;
    const localisationFuite = document.getElementById('controle-localisation').value.trim();
    const detecteur = document.getElementById('controle-detecteur').value.trim();

    if (!machine || !methode || !resultat) {
      UI.toast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    try {
      document.getElementById('modal-controle-submit').disabled = true;
      const response = await API.get('createControle', {
        machine, methode, resultat, localisationFuite, detecteur,
        operateur: State.user.id, mode: State.mode
      });
      const msg = response.data.fuite
        ? `Contrôle enregistré - FUITE détectée ! Prochain contrôle : ${response.data.prochainControle}`
        : `Contrôle conforme enregistré. Prochain contrôle : ${response.data.prochainControle}`;
      UI.toast(msg, response.data.fuite ? 'warning' : 'success');
      document.getElementById('modal-controle').classList.add('hidden');
      await State.loadInitialData();
      UI.showView('controles');
    } catch (error) {
      UI.toast('Erreur : ' + error.message, 'error');
    } finally {
      document.getElementById('modal-controle-submit').disabled = false;
    }
  }
};

// Démarrage au chargement
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Export global
window.App = App;
