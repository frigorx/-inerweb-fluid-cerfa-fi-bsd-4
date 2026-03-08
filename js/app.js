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
    const defaultApiUrl = 'https://script.google.com/macros/s/AKfycbwmATwbOuLyyK7Xz4SBe4UFleTmJd_8VctsLk4FSQiZ20aDDJHgVEenO9xdvtc9oRGm-g/exec';
    // Forcer la mise à jour si l'utilisateur a une ancienne URL en cache
    const savedUrl = localStorage.getItem('inerweb_api_url');
    const apiUrl = (!savedUrl || savedUrl.includes('AKfycbxBOT') || savedUrl.includes('AKfycbz6M')) ? defaultApiUrl : savedUrl;
    localStorage.setItem('inerweb_api_url', defaultApiUrl);
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
    document.getElementById('modal-client-cancel')?.addEventListener('click', () => {
      document.getElementById('modal-client').classList.add('hidden');
    });

    // Fermer modales en cliquant sur l'overlay
    ['modal-machine', 'modal-bouteille', 'modal-controle', 'modal-client'].forEach(id => {
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
    document.getElementById('modal-client-submit')?.addEventListener('click', () => {
      this.submitClient();
    });

    // Bouton + Client dans la modale machine
    document.getElementById('btn-add-client-inline')?.addEventListener('click', () => {
      this.openModalClient();
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
    
    // ===== ADMIN BINDINGS =====

    // Sauver config entreprise
    document.getElementById('btn-save-config')?.addEventListener('click', async () => {
      const etablissement = document.getElementById('config-etablissement').value.trim();
      const adresse = document.getElementById('config-adresse').value.trim();
      const siret = document.getElementById('config-siret').value.trim();
      try {
        await API.saveConfig({ etablissement, adresse, siret });
        UI.toast('Configuration entreprise enregistrée', 'success');
        // Mettre à jour le state local
        if (State.config) {
          State.config.etablissement = etablissement;
          State.config.adresse = adresse;
          State.config.siret = siret;
        }
      } catch (error) {
        UI.toast('Erreur : ' + error.message, 'error');
      }
    });

    // Ajouter utilisateur
    document.getElementById('btn-add-user')?.addEventListener('click', () => {
      document.getElementById('form-user').reset();
      document.getElementById('modal-user').classList.remove('hidden');
    });
    document.getElementById('modal-user-cancel')?.addEventListener('click', () => {
      document.getElementById('modal-user').classList.add('hidden');
    });
    document.getElementById('modal-user-submit')?.addEventListener('click', async () => {
      const nom = document.getElementById('user-nom').value.trim();
      const prenom = document.getElementById('user-prenom').value.trim();
      const role = document.getElementById('user-role-select').value;
      const email = document.getElementById('user-email').value.trim();
      const attestation = document.getElementById('user-attestation').value.trim();
      const dateAttestation = document.getElementById('user-date-att').value;
      const validiteAttestation = document.getElementById('user-validite-att').value;
      const categorie2008 = document.getElementById('user-cat2008').value;
      const categorie2025 = document.getElementById('user-cat2025').value;

      if (!nom || !prenom) {
        UI.toast('Nom et prénom obligatoires', 'error');
        return;
      }

      try {
        document.getElementById('modal-user-submit').disabled = true;
        const response = await API.createUser({
          nom, prenom, role, email, attestation,
          dateAttestation, validiteAttestation,
          categorie2008, categorie2025
        });
        UI.toast(`Utilisateur ${prenom} ${nom} créé (${response.data.id})`, 'success');
        document.getElementById('modal-user').classList.add('hidden');
        UI.renderAdmin();
      } catch (error) {
        UI.toast('Erreur : ' + error.message, 'error');
      } finally {
        document.getElementById('modal-user-submit').disabled = false;
      }
    });

    // Ajouter client depuis admin
    document.getElementById('btn-add-client-admin')?.addEventListener('click', () => {
      this.openModalClient();
    });

    // Ajouter détecteur
    document.getElementById('btn-add-detecteur')?.addEventListener('click', () => {
      document.getElementById('form-detecteur').reset();
      document.getElementById('modal-detecteur').classList.remove('hidden');
    });
    document.getElementById('modal-detecteur-cancel')?.addEventListener('click', () => {
      document.getElementById('modal-detecteur').classList.add('hidden');
    });
    document.getElementById('modal-detecteur-submit')?.addEventListener('click', async () => {
      const marque = document.getElementById('detecteur-marque').value.trim();
      const modele = document.getElementById('detecteur-modele').value.trim();
      const etalonnage = document.getElementById('detecteur-etalonnage').value;
      const prochain = document.getElementById('detecteur-prochain').value;

      if (!marque || !modele) {
        UI.toast('Marque et modèle obligatoires', 'error');
        return;
      }

      try {
        document.getElementById('modal-detecteur-submit').disabled = true;
        const response = await API.createDetecteur({ marque, modele, etalonnage, prochain });
        UI.toast(`Détecteur ${marque} ${modele} créé (${response.data.id})`, 'success');
        document.getElementById('modal-detecteur').classList.add('hidden');
        UI.renderAdmin();
      } catch (error) {
        UI.toast('Erreur : ' + error.message, 'error');
      } finally {
        document.getElementById('modal-detecteur-submit').disabled = false;
      }
    });

    // Initialiser fluides
    document.getElementById('btn-init-fluides')?.addEventListener('click', async () => {
      try {
        await API.get('initFluides');
        UI.toast('Fluides initialisés', 'success');
        await State.loadInitialData();
        UI.renderAdmin();
      } catch (error) {
        UI.toast('Erreur : ' + error.message, 'error');
      }
    });

    // Fermer modales admin overlay
    ['modal-user', 'modal-detecteur'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
          e.target.classList.add('hidden');
        }
      });
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
    // Remplir la liste des clients
    const clientSelect = document.getElementById('machine-client');
    clientSelect.innerHTML = '<option value="">-- Aucun (à renseigner plus tard) --</option>';
    State.clients.forEach(c => {
      clientSelect.innerHTML += `<option value="${c.id}">${c.nom}${c.ville ? ' (' + c.ville + ')' : ''}</option>`;
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
    const clientId = document.getElementById('machine-client').value;

    if (!fluide || !chargeNom) {
      UI.toast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    try {
      document.getElementById('modal-machine-submit').disabled = true;
      const response = await API.get('createMachine', {
        nom, type, fluide, chargeNom, marque, modele, serie, localisation,
        prechargee, clientId, operateur: State.user.id
      });
      const codeCreee = response.data.code;
      UI.toast(`Machine ${codeCreee} créée !`, 'success');
      // Stocker le code pour le wizard
      App._derniereMachineCreee = codeCreee;
      document.getElementById('modal-machine').classList.add('hidden');
      await State.loadInitialData();
      // Si le wizard est actif, ne pas changer de vue
      if (!State.wizard.active) {
        UI.showView('machines');
      }
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
      const codeCreee = response.data.code;
      UI.toast(`Bouteille ${codeCreee} créée !`, 'success');
      App._derniereBouteilleCreee = codeCreee;
      document.getElementById('modal-bouteille').classList.add('hidden');
      await State.loadInitialData();
      if (!State.wizard.active) {
        UI.showView('bouteilles');
      }
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

  // ========== MODALE CLIENT / DÉTENTEUR ==========

  openModalClient() {
    document.getElementById('form-client').reset();
    document.getElementById('modal-client').classList.remove('hidden');
  },

  async submitClient() {
    const nom = document.getElementById('client-nom').value.trim();
    const adresse = document.getElementById('client-adresse').value.trim();
    const cp = document.getElementById('client-cp').value.trim();
    const ville = document.getElementById('client-ville').value.trim();
    const siret = document.getElementById('client-siret').value.trim();
    const contact = document.getElementById('client-contact').value.trim();
    const tel = document.getElementById('client-tel').value.trim();
    const email = document.getElementById('client-email').value.trim();

    if (!nom) {
      UI.toast('Le nom du client est obligatoire', 'error');
      return;
    }

    try {
      document.getElementById('modal-client-submit').disabled = true;
      const response = await API.createClient({ nom, adresse, cp, ville, siret, contact, tel, email });
      const clientId = response.data.id;
      UI.toast(`Client "${nom}" créé !`, 'success');
      document.getElementById('modal-client').classList.add('hidden');
      await State.loadInitialData();

      // Si la modale machine est ouverte, mettre à jour le sélecteur client et sélectionner le nouveau
      const clientSelect = document.getElementById('machine-client');
      if (clientSelect && !document.getElementById('modal-machine').classList.contains('hidden')) {
        clientSelect.innerHTML = '<option value="">-- Aucun --</option>';
        State.clients.forEach(c => {
          clientSelect.innerHTML += `<option value="${c.id}"${c.id === clientId ? ' selected' : ''}>${c.nom}${c.ville ? ' (' + c.ville + ')' : ''}</option>`;
        });
      }
    } catch (error) {
      UI.toast('Erreur : ' + error.message, 'error');
    } finally {
      document.getElementById('modal-client-submit').disabled = false;
    }
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
