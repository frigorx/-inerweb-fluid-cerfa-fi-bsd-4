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
    const defaultApiUrl = 'https://script.google.com/macros/s/AKfycbwv-G63lIYYJ4fJOF6LpaUJjws1eLUfgXa_zypkgP7VXOnLQB5IuVbiozL-BUmg6hpr/exec';

    // Nettoyage automatique du localStorage
    this.cleanupLocalStorage(defaultApiUrl);

    // Forcer la mise à jour vers la dernière version déployée
    localStorage.setItem('inerweb_api_url', defaultApiUrl);
    API.init(defaultApiUrl);

    // Bindings (avant tout, pour que le bouton démo soit actif même si on reste sur login)
    this.bindEvents();

    // ===== Mode démo demandé via URL ?demo=1 ou localStorage =====
    // Bascule directement dans l'app, sans login.
    if (window.DemoMode && this._isDemoRequested()) {
      try {
        await this.startDemoSession();
        console.log('inerWeb Fluide initialisé (mode démo)');
        return;
      } catch (err) {
        console.error('Échec démarrage démo, retour login :', err);
      }
    }

    // Vérifier si déjà connecté
    const savedApiKey = localStorage.getItem('inerweb_apikey');
    if (savedApiKey && defaultApiUrl) {
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

    console.log('inerWeb Fluide initialisé');
  },

  /**
   * Détecte si le mode démo est demandé (URL ou localStorage).
   */
  _isDemoRequested() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1') return true;
      if (localStorage.getItem('inerweb_demo') === '1') return true;
    } catch (e) {}
    return false;
  },

  /**
   * Démarre une session démo complète : patche API, injecte user fictif,
   * charge les données démo, affiche l'app. Aucune saisie utilisateur requise.
   */
  async startDemoSession() {
    DemoMode.start();
    State.setUser({
      id: 'USER-DEMO-001',
      nom: 'Martin', prenom: 'Julien',
      nomComplet: 'Julien Martin',
      role: 'REFERENT',
      permissions: ['READ', 'WRITE', 'OFFICIEL'],
      canUseOfficiel: true,
      attestation: 'AAF-CAT1-2024-1547'
    });
    await State.loadInitialData();
    try {
      const usersRes = await API.getUsers();
      State.users = usersRes.data || [];
    } catch (_) {}
    UI.showApp();
    setTimeout(() => { if (window.AIDE) AIDE.injecterBoutons(); }, 500);
    UI.toast('Mode démonstration — Julien Martin (Référent)', 'success');
  },
  
  /**
   * Nettoyage automatique du localStorage au démarrage
   */
  cleanupLocalStorage(defaultApiUrl) {
    const savedUrl = localStorage.getItem('inerweb_api_url');
    if (savedUrl && savedUrl !== defaultApiUrl) {
      localStorage.setItem('inerweb_api_url', defaultApiUrl);
      console.log('[Cleanup] URL API corrigée');
    }
  },

  /**
   * Tentative de reconnexion automatique
   */
  async autoLogin() {
    const savedUser = localStorage.getItem('inerweb_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        if (userData && userData.id) {
          const response = await API.login(userData.id, '');
          if (response.success && response.data) {
            State.setUser(response.data);
            await State.loadInitialData();
            UI.showApp();
            setTimeout(() => AIDE.injecterBoutons(), 500);
            return;
          }
        }
      } catch (e) { /* JSON parse error, continue */ }
    }
    throw new Error('Session expirée');
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
        localStorage.setItem('inerweb_user', JSON.stringify({ id: response.data.id, nomComplet: response.data.nomComplet }));
        await State.loadInitialData();
        UI.showApp();
        // Injecter les boutons d'aide contextuelle
        setTimeout(() => AIDE.injecterBoutons(), 500);
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
    localStorage.removeItem('inerweb_user');
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

    // Bouton « Lancer la démo » sur l'écran de connexion :
    // bascule directement dans l'app, sans demander d'identifiant.
    document.getElementById('btn-launch-demo')?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!window.DemoMode) return;
      try {
        if (UI.hideLoginError) UI.hideLoginError();
        await this.startDemoSession();
      } catch (err) {
        console.error('Erreur démarrage démo :', err);
        UI.toast('Erreur démarrage démo : ' + err.message, 'error');
      }
    });

    // Tuiles de navigation admin — scroll fluide vers la cible + halo orange
    document.querySelectorAll('.admin-tile').forEach(tile => {
      tile.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = tile.dataset.target;
        const target = document.getElementById(targetId);
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Halo orange temporaire sur la carte ciblée
        const header = target.querySelector('.card-header');
        if (header) {
          const original = header.style.boxShadow;
          header.style.boxShadow = '0 0 0 4px rgba(255, 107, 53, 0.5)';
          header.style.transition = 'box-shadow 0.3s';
          setTimeout(() => { header.style.boxShadow = original; }, 1800);
        }
      });
    });
    
    // Logout
    UI.elements.btnLogout.addEventListener('click', () => {
      if (confirm('Voulez-vous vous déconnecter ?')) {
        this.logout();
      }
    });
    
    // Navigation
    const hamburger = document.getElementById('hamburger-btn');
    const nav = UI.elements.mainNav;

    hamburger?.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      nav.classList.toggle('open');
    });

    nav.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item');
      if (navItem && navItem.dataset.view) {
        UI.showView(navItem.dataset.view);
        // Fermer le menu mobile après clic
        hamburger?.classList.remove('open');
        nav.classList.remove('open');
      }
    });
    
    // Boutons d'action dashboard
    document.getElementById('btn-nouveau-mouvement')?.addEventListener('click', () => {
      UI.showWizard();
    });

    // Impression QR Codes
    document.getElementById('btn-print-qrcodes')?.addEventListener('click', () => {
      if (State.machines.length === 0 && State.bouteilles.length === 0) {
        UI.toast('Aucune machine ni bouteille pour générer des QR codes', 'warning');
        return;
      }
      try {
        if (typeof QRModule !== 'undefined' && QRModule.printQRCodes) {
          QRModule.printQRCodes({ machines: true, bouteilles: true });
        } else {
          // Fallback : générer la page QR manuellement
          const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
          let html = '<html><head><title>QR Codes — inerWeb Fluide</title><style>body{font-family:sans-serif;padding:20px;} .qr-item{display:inline-block;text-align:center;margin:16px;padding:12px;border:1px solid #ddd;border-radius:8px;} .qr-item img{width:150px;height:150px;}</style></head><body><h1>QR Codes — Machines & Bouteilles</h1>';
          State.machines.forEach(m => {
            const code = m.code || m.id;
            const data = 'INERWEB:MACHINE:' + code;
            const url = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(data);
            html += '<div class="qr-item"><img src="' + url + '"><br><strong>' + code + '</strong><br><small>' + (m.nom || '') + ' — ' + (m.fluide || '') + '</small></div>';
          });
          State.bouteilles.forEach(b => {
            const code = b.code || b.id;
            const data = 'INERWEB:BOUTEILLE:' + code;
            const url = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(data);
            html += '<div class="qr-item"><img src="' + url + '"><br><strong>' + code + '</strong><br><small>' + (b.fluide || '') + '</small></div>';
          });
          html += '</body></html>';
          win.document.write(html);
          win.document.close();
          win.document.title = 'QR Codes — inerWeb Fluide';
          UI.toast('QR codes générés — ' + State.machines.length + ' machines, ' + State.bouteilles.length + ' bouteilles', 'success');
        }
      } catch (err) {
        UI.toast('Erreur QR codes : ' + err.message, 'error');
      }
    });

    // Prévisualisation CERFA — affiche directement le PDF officiel 15497*04
    // rempli via pdf-lib, dans une modale iframe (aucun appel backend, aucun popup).
    document.getElementById('btn-preview-cerfa')?.addEventListener('click', async () => {
      try {
        UI.toast('Génération du CERFA officiel...', 'info');
        await CERFA.ouvrir({});
      } catch (err) {
        console.error('Erreur ouverture CERFA :', err);
        UI.toast('Erreur ouverture CERFA : ' + err.message, 'error');
      }
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
      // B5 — Vérification attestation côté client (double sécurité)
      if (State.user) {
        const validite = State.user.validiteAttestation || State.user.attestationValidite;
        if (validite) {
          const dateExp = new Date(validite);
          if (!isNaN(dateExp.getTime()) && dateExp < new Date()) {
            UI.toast('Mode OFFICIEL bloqué : votre attestation de capacité a expiré le ' + dateExp.toLocaleDateString('fr-FR') + '. Renouvelez-la.', 'error');
            return;
          }
        }
      }

      if (!State.user?.canUseOfficiel) {
        if (State.user?.blocageOfficiel) {
          UI.toast('Mode OFFICIEL bloqué : votre attestation de capacité est expirée. Renouvelez-la auprès de votre organisme.', 'error');
        } else {
          UI.toast('Mode OFFICIEL non autorisé pour votre profil', 'warning');
        }
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

    // Sauver config entreprise (champs étendus : APE/NAF, tél, e-mail, attestation, F-Gas, logo)
    document.getElementById('btn-save-config')?.addEventListener('click', async () => {
      const cfg = {
        etablissement: document.getElementById('config-etablissement').value.trim(),
        adresse: document.getElementById('config-adresse').value.trim(),
        siret: document.getElementById('config-siret').value.trim(),
        codeApe: document.getElementById('config-ape')?.value.trim() || '',
        telephone: document.getElementById('config-tel')?.value.trim() || '',
        email: document.getElementById('config-email')?.value.trim() || '',
        attestationCapacite: document.getElementById('config-attestation')?.value.trim() || '',
        certifFGas: document.getElementById('config-categorie-fgas')?.value || '',
        validiteAttestation: document.getElementById('config-validite-att')?.value || '',
        logo: (State.config && State.config.logo) || ''
      };
      try {
        await API.saveConfig(cfg);
        UI.toast('Configuration entreprise enregistrée', 'success');
        State.config = Object.assign(State.config || {}, cfg);
      } catch (error) {
        UI.toast('Erreur : ' + error.message, 'error');
      }
    });

    // Upload logo (converti en base64 et stocké dans State.config.logo)
    document.getElementById('config-logo-input')?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 500 * 1024) {
        UI.toast('Logo trop volumineux (max 500 Ko)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        State.config = State.config || {};
        State.config.logo = dataUrl;
        const preview = document.getElementById('config-logo-preview');
        preview.innerHTML = '<img src="' + dataUrl + '" style="max-width:100%;max-height:100%;object-fit:contain;">';
        document.getElementById('btn-remove-logo').style.display = 'inline-block';
      };
      reader.readAsDataURL(file);
    });
    document.getElementById('btn-remove-logo')?.addEventListener('click', () => {
      if (State.config) State.config.logo = '';
      document.getElementById('config-logo-preview').innerHTML = 'Aucun logo';
      document.getElementById('config-logo-input').value = '';
      document.getElementById('btn-remove-logo').style.display = 'none';
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

    // Trackdéchets - Enregistrer config
    document.getElementById('btn-save-trackdechets')?.addEventListener('click', async () => {
      const token = document.getElementById('config-td-token').value.trim();
      const mode = document.getElementById('config-td-mode').value;
      const url = mode === 'production'
        ? 'https://api.trackdechets.beta.gouv.fr'
        : 'https://api.sandbox.trackdechets.beta.gouv.fr';
      try {
        document.getElementById('btn-save-trackdechets').disabled = true;
        const res = await API.get('configTrackdechets', { token, enabled: 'true', url });
        if (res.success && res.data) {
          UI.toast('Trackdéchets configuré — ' + (res.data.connectionTest || ''), 'success');
          document.getElementById('config-td-token').value = '';
          UI.renderAdmin();
        } else {
          UI.toast(res.error || 'Erreur configuration', 'error');
        }
      } catch (e) {
        UI.toast('Erreur : ' + e.message, 'error');
      } finally {
        document.getElementById('btn-save-trackdechets').disabled = false;
      }
    });

    // Trackdéchets - Lister les BSFF
    document.getElementById('btn-list-bsffs')?.addEventListener('click', async () => {
      try {
        document.getElementById('btn-list-bsffs').disabled = true;
        const res = await API.get('listBsffs');
        const container = document.getElementById('trackdechets-bsffs');
        if (res.success && res.data && res.data.data) {
          const bsffs = res.data.data.bsffs;
          const edges = bsffs ? bsffs.edges || [] : [];
          if (edges.length === 0) {
            container.innerHTML = '<p style="color:#999;">Aucun BSFF trouvé.</p>';
          } else {
            container.innerHTML = '<table class="table" style="width:100%;font-size:12px;"><thead><tr>' +
              '<th>ID</th><th>Statut</th><th>Déchet</th><th>Masse (kg)</th><th>Date</th>' +
              '</tr></thead><tbody>' +
              edges.map(e => {
                const n = e.node;
                return `<tr>
                  <td><code>${(n.id || '').substring(0, 12)}...</code></td>
                  <td><span class="badge">${n.status || '--'}</span></td>
                  <td>${n.waste ? n.waste.code : '--'}</td>
                  <td>${n.weight ? n.weight.value : '--'}</td>
                  <td>${n.createdAt ? n.createdAt.substring(0, 10) : '--'}</td>
                </tr>`;
              }).join('') +
              '</tbody></table>' +
              '<p style="font-size:11px;color:#666;">Total : ' + (bsffs.totalCount || edges.length) + ' BSFF</p>';
          }
          container.style.display = 'block';
        } else {
          container.innerHTML = '<p style="color:red;">' + (res.error || 'Erreur') + '</p>';
          container.style.display = 'block';
        }
      } catch (e) {
        UI.toast('Erreur : ' + e.message, 'error');
      } finally {
        document.getElementById('btn-list-bsffs').disabled = false;
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

    // Bilan - Export CSV
    document.getElementById('btn-export-bilan')?.addEventListener('click', () => {
      this.exportBilanCSV();
    });

    // Bilan - Export ADEME (Excel/CSV structuré)
    document.getElementById('btn-export-ademe')?.addEventListener('click', () => {
      this.exportBilanADEME();
    });

    // Bilan - Imprimer
    document.getElementById('btn-print-bilan')?.addEventListener('click', () => {
      window.print();
    });

    // P7 — Impression en lot des CERFA de l'année
    document.getElementById('btn-export-cerfa-lot')?.addEventListener('click', async () => {
      const annee = document.getElementById('bilan-annee')?.value || new Date().getFullYear();
      try {
        UI.toast('Chargement des CERFA ' + annee + '...', 'info');
        const res = await API.get('exportCerfaAnnee', { annee });
        if (res.success && res.data) {
          if (res.data.count === 0) {
            UI.toast('Aucun CERFA trouvé pour ' + annee, 'warning');
            return;
          }
          const win = window.open('', '_blank', 'width=900,height=1100,scrollbars=yes');
          win.document.write(res.data.html);
          win.document.close();
          win.document.title = 'CERFA ' + annee + ' — ' + res.data.count + ' fiches';
          setTimeout(() => { win.print(); }, 800);
          UI.toast(res.data.count + ' CERFA chargés pour impression', 'success');
        } else {
          UI.toast('Erreur lors du chargement', 'error');
        }
      } catch (err) {
        UI.toast('Erreur : ' + err.message, 'error');
      }
    });

    // Documents PDF officiels — Suivi fluides
    document.getElementById('btn-suivi-fluides-pdf')?.addEventListener('click', () => {
      const annee = parseInt(document.getElementById('bilan-annee')?.value) || new Date().getFullYear();
      const fluide = document.getElementById('bilan-fluide')?.value || null;
      DOCS.ouvrirSuiviFluides(annee, fluide === 'all' ? null : fluide);
    });

    // Documents PDF officiels — Registre des plaintes
    document.getElementById('btn-registre-plaintes-pdf')?.addEventListener('click', () => {
      // Charger les plaintes depuis le state ou générer vide
      DOCS.ouvrirRegistrePlaintes(State.plaintes || []);
    });

    // P8 — Documents MES : fermeture modale
    document.getElementById('modal-mes-close')?.addEventListener('click', () => {
      document.getElementById('modal-mes').classList.add('hidden');
    });
    document.getElementById('modal-mes-cancel')?.addEventListener('click', () => {
      document.getElementById('modal-mes').classList.add('hidden');
    });
    document.getElementById('modal-mes')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.add('hidden');
      }
    });

    // P8 — Documents MES : soumission
    document.getElementById('modal-mes-submit')?.addEventListener('click', async () => {
      const machineCode = document.getElementById('mes-machine-code').value;
      if (!machineCode) {
        UI.toast('Code machine manquant', 'error');
        return;
      }

      const params = {
        machine: machineCode,
        operateur: State.user?.id || '',
        hp: document.getElementById('mes-hp').value,
        bp: document.getElementById('mes-bp').value,
        tCondensation: document.getElementById('mes-t-condensation').value,
        tEvaporation: document.getElementById('mes-t-evaporation').value,
        tRefoulement: document.getElementById('mes-t-refoulement').value,
        tAspiration: document.getElementById('mes-t-aspiration').value,
        tSortieCondenseur: document.getElementById('mes-t-sortie-condenseur').value,
        tSortieEvaporateur: document.getElementById('mes-t-sortie-evaporateur').value,
        iCompresseur: document.getElementById('mes-i-compresseur').value,
        iEvaporateur: document.getElementById('mes-i-evaporateur').value,
        consigne: document.getElementById('mes-consigne').value,
        cutIn: document.getElementById('mes-cut-in').value,
        cutInDiff: document.getElementById('mes-cut-in-diff').value,
        cutOff: document.getElementById('mes-cut-off').value,
        cutOffDiff: document.getElementById('mes-cut-off-diff').value
      };

      try {
        document.getElementById('modal-mes-submit').disabled = true;
        UI.toast('Génération des documents MES...', 'info');
        const res = await API.get('genererDocumentsMES', params);
        if (res.success && res.data) {
          document.getElementById('modal-mes').classList.add('hidden');

          // Ouvrir les 3 documents dans des fenêtres séparées
          const docs = [
            { html: res.data.ficheMES_html, titre: 'Fiche MES — ' + machineCode },
            { html: res.data.plaque_html, titre: 'Plaque F-Gas — ' + machineCode },
            { html: res.data.macaron_html, titre: 'Macaron — ' + machineCode }
          ];

          docs.forEach((doc, i) => {
            setTimeout(() => {
              const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
              win.document.write(doc.html);
              win.document.close();
              win.document.title = doc.titre;
            }, i * 300);
          });

          UI.toast('3 documents MES générés pour ' + machineCode, 'success');
        } else {
          UI.toast(res.error || 'Erreur de génération', 'error');
        }
      } catch (err) {
        UI.toast('Erreur : ' + err.message, 'error');
      } finally {
        document.getElementById('modal-mes-submit').disabled = false;
      }
    });

    /**
     * B5 — Affiche un aperçu CERFA pixel-perfect via le module CERFA
     */
    this._showDemoCerfa = async () => {
      UI.toast('Génération du CERFA PDF officiel...', 'info');
      await CERFA.ouvrir({});
      UI.toast('CERFA 15497*04 officiel généré', 'success');
    };

    // ===== GESTION DES PLAINTES =====
    // B1 — Charger plaintes depuis backend, fallback localStorage
    try {
      const res = await API.getPlaintes();
      State.plaintes = res.data || [];
      localStorage.setItem('inerweb_plaintes', JSON.stringify(State.plaintes));
    } catch (e) {
      State.plaintes = JSON.parse(localStorage.getItem('inerweb_plaintes') || '[]');
    }

    document.getElementById('btn-add-plainte')?.addEventListener('click', () => {
      document.getElementById('plainte-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('plainte-client').value = '';
      document.getElementById('plainte-nature').value = '';
      document.getElementById('plainte-reponse').value = '';
      document.getElementById('plainte-etat').value = 'En cours';
      document.getElementById('modal-plainte').classList.remove('hidden');
    });

    document.getElementById('modal-plainte-close')?.addEventListener('click', () => {
      document.getElementById('modal-plainte').classList.add('hidden');
    });
    document.getElementById('modal-plainte-cancel')?.addEventListener('click', () => {
      document.getElementById('modal-plainte').classList.add('hidden');
    });

    document.getElementById('modal-plainte-submit')?.addEventListener('click', () => {
      const plainte = {
        id: 'PL-' + new Date().getFullYear() + '-' + String(State.plaintes.length + 1).padStart(3, '0'),
        numero: State.plaintes.length + 1,
        dateReception: document.getElementById('plainte-date').value,
        client: document.getElementById('plainte-client').value,
        nature: document.getElementById('plainte-nature').value,
        dateReponse: document.getElementById('plainte-reponse').value,
        etat: document.getElementById('plainte-etat').value
      };
      if (!plainte.dateReception || !plainte.client || !plainte.nature) {
        UI.toast('Remplir au minimum : date, client, nature', 'warning');
        return;
      }
      State.plaintes.push(plainte);
      localStorage.setItem('inerweb_plaintes', JSON.stringify(State.plaintes));
      // B1 — Sync backend
      API.savePlaintes(State.plaintes).catch(e => console.warn('Sync plaintes backend échouée:', e.message));
      document.getElementById('modal-plainte').classList.add('hidden');
      UI.renderPlaintes();
      UI.toast('Plainte enregistrée', 'success');
    });

    document.getElementById('btn-print-plaintes')?.addEventListener('click', () => {
      DOCS.ouvrirRegistrePlaintes(State.plaintes || []);
    });

    // ===== NETTOYAGE & PURGE =====

    // Rendre le panneau de purge
    this._renderPurgePanel = () => {
      const machList = document.getElementById('purge-machines-list');
      const boutList = document.getElementById('purge-bouteilles-list');
      const machCount = document.getElementById('purge-machines-count');
      const boutCount = document.getElementById('purge-bouteilles-count');
      if (!machList || !boutList) return;

      const mouvements = State.mouvements || [];

      // Machines avec compteur de mouvements
      machCount.textContent = '(' + (State.machines || []).length + ')';
      machList.innerHTML = (State.machines || []).map(m => {
        const code = m.code || m.id;
        const nbMouv = mouvements.filter(mv => mv.machine === code || mv.machineCode === code).length;
        const orphelin = nbMouv === 0;
        return `<label style="display:flex;align-items:center;gap:6px;padding:4px;border-bottom:1px solid #F3F4F6;font-size:12px;cursor:pointer;">
          <input type="checkbox" class="purge-machine-cb" data-code="${code}" ${orphelin ? 'checked' : ''}>
          <span style="flex:1;">${code} — ${m.nom || m.designation || '?'} (${m.fluide || '?'})</span>
          <span style="font-size:11px;${orphelin ? 'color:#10B981;' : 'color:#F59E0B;'}">${nbMouv} mouv.</span>
        </label>`;
      }).join('') || '<p style="color:#999;font-size:12px;">Aucune machine</p>';

      // Bouteilles avec compteur de mouvements
      boutCount.textContent = '(' + (State.bouteilles || []).length + ')';
      boutList.innerHTML = (State.bouteilles || []).map(b => {
        const code = b.code || b.id;
        const nbMouv = mouvements.filter(mv => mv.bouteille === code || mv.bouteilleCode === code).length;
        const orphelin = nbMouv === 0;
        return `<label style="display:flex;align-items:center;gap:6px;padding:4px;border-bottom:1px solid #F3F4F6;font-size:12px;cursor:pointer;">
          <input type="checkbox" class="purge-bouteille-cb" data-code="${code}" ${orphelin ? 'checked' : ''}>
          <span style="flex:1;">${code} — ${b.fluide || '?'} (${b.categorie || '?'})</span>
          <span style="font-size:11px;${orphelin ? 'color:#10B981;' : 'color:#F59E0B;'}">${nbMouv} mouv.</span>
        </label>`;
      }).join('') || '<p style="color:#999;font-size:12px;">Aucune bouteille</p>';

      // Afficher le bouton supprimer si des cases sont cochées
      const btnPurge = document.getElementById('btn-purge-selection');
      const updateBtn = () => {
        const nbChecked = document.querySelectorAll('.purge-machine-cb:checked, .purge-bouteille-cb:checked').length;
        btnPurge.style.display = nbChecked > 0 ? 'inline-block' : 'none';
        btnPurge.textContent = 'Supprimer ' + nbChecked + ' élément(s) sélectionné(s)';
      };
      machList.addEventListener('change', updateBtn);
      boutList.addEventListener('change', updateBtn);
      updateBtn();
    };

    // Purge orphelins (sans mouvement)
    document.getElementById('btn-purge-orphelins')?.addEventListener('click', async () => {
      const mouvements = State.mouvements || [];
      const machOrph = (State.machines || []).filter(m => {
        const code = m.code || m.id;
        return mouvements.filter(mv => mv.machine === code || mv.machineCode === code).length === 0;
      });
      const boutOrph = (State.bouteilles || []).filter(b => {
        const code = b.code || b.id;
        return mouvements.filter(mv => mv.bouteille === code || mv.bouteilleCode === code).length === 0;
      });

      if (machOrph.length === 0 && boutOrph.length === 0) {
        UI.toast('Aucun orphelin à purger — toutes les machines et bouteilles ont des mouvements', 'info');
        return;
      }

      const ok = confirm('Supprimer ' + machOrph.length + ' machine(s) et ' + boutOrph.length + ' bouteille(s) sans mouvement ?\n\nCes éléments seront supprimés SANS TRACE.');
      if (!ok) return;

      for (const m of machOrph) {
        try { await API.supprimerMachine(m.code || m.id); } catch (e) {}
      }
      for (const b of boutOrph) {
        try { await API.supprimerBouteille(b.code || b.id); } catch (e) {}
      }

      await State.loadInitialData();
      UI.showView('admin');
      UI.toast(machOrph.length + ' machines + ' + boutOrph.length + ' bouteilles orphelines supprimées', 'success');
    });

    // Purge sélective
    document.getElementById('btn-purge-selection')?.addEventListener('click', async () => {
      const machCodes = [...document.querySelectorAll('.purge-machine-cb:checked')].map(cb => cb.dataset.code);
      const boutCodes = [...document.querySelectorAll('.purge-bouteille-cb:checked')].map(cb => cb.dataset.code);

      if (machCodes.length === 0 && boutCodes.length === 0) return;

      // Vérifier si certains ont des mouvements
      const mouvements = State.mouvements || [];
      const machAvecMouv = machCodes.filter(code => mouvements.some(mv => mv.machine === code || mv.machineCode === code));
      const boutAvecMouv = boutCodes.filter(code => mouvements.some(mv => mv.bouteille === code || mv.bouteilleCode === code));

      let msg = 'Supprimer ' + machCodes.length + ' machine(s) et ' + boutCodes.length + ' bouteille(s) ?';
      if (machAvecMouv.length > 0 || boutAvecMouv.length > 0) {
        msg += '\n\nATTENTION : ' + (machAvecMouv.length + boutAvecMouv.length) + ' élément(s) ont des mouvements liés. Les mouvements et CERFAs associés seront aussi supprimés.';
      }
      msg += '\n\nCette action est IRRÉVERSIBLE.';

      if (!confirm(msg)) return;

      UI.toast('Suppression en cours...', 'info');
      for (const code of machCodes) {
        try { await API.supprimerMachine(code); } catch (e) {}
      }
      for (const code of boutCodes) {
        try { await API.supprimerBouteille(code); } catch (e) {}
      }

      await State.loadInitialData();
      UI.showView('admin');
      UI.toast(machCodes.length + ' machines + ' + boutCodes.length + ' bouteilles supprimées', 'success');
    });

    // Reset total
    document.getElementById('btn-reset-total')?.addEventListener('click', async () => {
      const code = prompt(
        'RÉINITIALISATION COMPLÈTE\n\n' +
        'TOUTES les données seront effacées :\n' +
        '• ' + (State.machines || []).length + ' machines\n' +
        '• ' + (State.bouteilles || []).length + ' bouteilles\n' +
        '• ' + (State.mouvements || []).length + ' mouvements\n' +
        '• ' + (State.controles || []).length + ' contrôles\n' +
        '• ' + (State.plaintes || []).length + ' plaintes\n\n' +
        'Tapez REINITIALISER pour confirmer :'
      );
      if (code !== 'REINITIALISER') {
        UI.toast('Réinitialisation annulée', 'info');
        return;
      }

      // Sauvegarder d'abord
      UI.toast('Sauvegarde avant réinitialisation...', 'info');
      await BACKUP.sauvegarderUSB();

      // Supprimer tout
      UI.toast('Réinitialisation en cours...', 'info');
      try {
        await API.get('resetAll', { confirm: 'REINITIALISER' });
        // Vider localStorage
        State.plaintes = [];
        localStorage.setItem('inerweb_plaintes', '[]');
        await State.loadInitialData();
        UI.showView('dashboard');
        UI.toast('Réinitialisation complète. L\'ancienne sauvegarde a été téléchargée.', 'success');
      } catch (e) {
        UI.toast('Erreur réinitialisation : ' + e.message, 'error');
      }
    });

    // ===== SAUVEGARDE & RESTAURATION =====
    document.getElementById('btn-backup-usb')?.addEventListener('click', () => BACKUP.sauvegarderUSB());
    document.getElementById('btn-backup-cloud')?.addEventListener('click', () => BACKUP.sauvegarderCloud());
    document.getElementById('btn-backup-email')?.addEventListener('click', () => BACKUP.envoyerParEmail());
    document.getElementById('btn-backup-print')?.addEventListener('click', () => BACKUP.imprimerTout());
    document.getElementById('btn-backup-restore')?.addEventListener('click', () => BACKUP.restaurer());

    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Fermer les modales ouvertes
        const modals = ['modal-mes', 'modal-detail', 'modal-machine', 'modal-bouteille', 'modal-controle', 'modal-client', 'modal-user', 'modal-detecteur', 'modal-plainte'];
        for (const id of modals) {
          const m = document.getElementById(id);
          if (m && !m.classList.contains('hidden')) { m.classList.add('hidden'); return; }
        }
        // Wizard en dernier (avec confirmation)
        if (State.wizard.active) {
          if (confirm('Abandonner ce mouvement ?')) { UI.hideWizard(); }
        }
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
    const detectionPermanente = document.getElementById('machine-detection-permanente').checked;
    const clientId = document.getElementById('machine-client').value;

    if (!nom || !fluide || !chargeNom) {
      UI.toast('Veuillez remplir : nom, fluide et charge nominale', 'error');
      return;
    }

    try {
      document.getElementById('modal-machine-submit').disabled = true;
      const response = await API.get('createMachine', {
        nom, type, fluide, chargeNom, marque, modele, serie, localisation,
        prechargee, detectionPermanente, clientId, operateur: State.user.id
      });
      const codeCreee = response.data.code;
      UI.toast(`Machine ${codeCreee} créée !`, 'success');
      // Stocker le code pour le wizard
      App._derniereMachineCreee = codeCreee;
      // Recharger les données AVANT de fermer la modale (le MutationObserver du wizard attend la fermeture)
      await State.loadInitialData();
      document.getElementById('modal-machine').classList.add('hidden');
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
      // Recharger les données AVANT de fermer la modale (le MutationObserver du wizard attend la fermeture)
      await State.loadInitialData();
      document.getElementById('modal-bouteille').classList.add('hidden');
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

  async openModalControle() {
    const select = document.getElementById('controle-machine');
    select.innerHTML = '<option value="">-- Sélectionner --</option>';
    State.machines.forEach(m => {
      select.innerHTML += `<option value="${m.code || m.id}">${m.code || m.id} - ${m.nom || m.designation || ''} (${m.fluide || '?'})</option>`;
    });
    // Peupler la liste des détecteurs
    const detectSelect = document.getElementById('controle-detecteur');
    detectSelect.innerHTML = '<option value="">-- Sélectionner --</option>';
    let detecteursData = State.detecteurs;
    if (detecteursData.length === 0) {
      try {
        const res = await API.getDetecteurs();
        detecteursData = res.data || [];
        State.detecteurs = detecteursData;
      } catch (e) { /* pas grave si ça échoue */ }
    }
    detecteursData.forEach(d => {
      const perime = UI.isDatePassed(d.prochain);
      detectSelect.innerHTML += `<option value="${d.code || d.id}" data-prochain="${d.prochain || ''}">${d.code || d.id} - ${d.marque || ''} ${d.modele || ''}${perime ? ' ⚠️ ÉCHU' : ''}</option>`;
    });

    // Supprimer un éventuel ancien warning
    const oldWarning = document.getElementById('detecteur-warning');
    if (oldWarning) oldWarning.remove();

    // Warning dynamique au changement de détecteur
    detectSelect.addEventListener('change', function() {
      const existing = document.getElementById('detecteur-warning');
      if (existing) existing.remove();
      const selectedOpt = this.options[this.selectedIndex];
      const prochainDate = selectedOpt?.dataset?.prochain;
      if (prochainDate && UI.isDatePassed(prochainDate)) {
        const warn = document.createElement('div');
        warn.id = 'detecteur-warning';
        warn.style.cssText = 'margin-top:6px;padding:8px 12px;background:#FFF7ED;border:2px solid #F59E0B;border-radius:6px;color:#92400E;font-size:13px;font-weight:600;';
        warn.textContent = '⚠️ Ce détecteur a un étalonnage échu (' + UI.formatDate(prochainDate) + '). Utilisez un détecteur à jour.';
        this.parentNode.appendChild(warn);
      }
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

  /**
   * Exporte le bilan annuel affiché en CSV
   */
  exportBilanCSV() {
    const content = document.getElementById('bilan-content');
    if (!content || !content.querySelector('table')) {
      UI.toast('Chargez d\'abord un bilan avant d\'exporter', 'warning');
      return;
    }

    const annee = document.getElementById('bilan-annee').value;
    const tables = content.querySelectorAll('table');
    let csv = '\uFEFF'; // BOM UTF-8

    tables.forEach((table, idx) => {
      // Titre du fluide (extraire du header de la card parente)
      const card = table.closest('.card');
      const header = card?.querySelector('.card-header h3');
      if (header) {
        csv += '"' + header.textContent.replace(/"/g, '""') + '"\n';
      }

      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const values = [];
        cells.forEach(cell => {
          let val = cell.textContent.trim().replace(/"/g, '""');
          values.push('"' + val + '"');
        });
        csv += values.join(';') + '\n';
      });
      csv += '\n';
    });

    // Télécharger
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bilan_tracabilite_${annee}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    UI.toast('Export CSV téléchargé', 'success');
  },

  /**
   * Export ADEME — tableau de traçabilité officiel (CSV structuré via API)
   */
  async exportBilanADEME() {
    const annee = document.getElementById('bilan-annee').value;
    if (!annee) {
      UI.toast('Sélectionnez une année avant d\'exporter', 'warning');
      return;
    }

    const fluide = document.getElementById('bilan-fluide').value || '';

    try {
      UI.toast('Génération du tableau ADEME en cours...', 'info');

      const params = { annee };
      if (fluide) params.fluide = fluide;

      const response = await API.get('exportBilanExcel', params);

      if (!response.success) {
        UI.toast('Erreur : ' + (response.error || 'Export impossible'), 'error');
        return;
      }

      const { csv, filename, count } = response.data;

      if (count === 0) {
        UI.toast('Aucun mouvement trouvé pour ' + annee, 'warning');
        return;
      }

      // Télécharger le CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      UI.toast('Export ADEME téléchargé (' + count + ' fluide' + (count > 1 ? 's' : '') + ')', 'success');
    } catch (err) {
      console.error('Erreur export ADEME:', err);
      UI.toast('Erreur lors de l\'export ADEME', 'error');
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

    // B8 — Vérifier étalonnage détecteur
    if (detecteur) {
      const det = State.detecteurs.find(d => (d.code || d.id) === detecteur);
      if (det?.prochain) {
        const dateProchain = new Date(det.prochain);
        if (!isNaN(dateProchain.getTime()) && dateProchain < new Date()) {
          UI.toast('Le détecteur ' + detecteur + ' a un étalonnage échu (périmé le ' + dateProchain.toLocaleDateString('fr-FR') + '). Faites-le étalonner avant de l\'utiliser.', 'error');
          return;
        }
      }
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
