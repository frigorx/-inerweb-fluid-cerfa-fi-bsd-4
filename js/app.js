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
    const defaultApiUrl = 'https://script.google.com/macros/s/AKfycbyCrNJ3L5b-mEjua4i-5B8-p9_cs1GeKu9aEbpTgA9lPq9XGjEh6RhvkNVtZ-_VYQx6/exec';

    // Nettoyage automatique du localStorage
    this.cleanupLocalStorage(defaultApiUrl);

    // Forcer la mise à jour vers la dernière version déployée
    localStorage.setItem('inerweb_api_url', defaultApiUrl);
    API.init(defaultApiUrl);

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
    
    // Bindings
    this.bindEvents();
    
    console.log('inerWeb Fluide initialisé');
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

    // Impression QR Codes
    document.getElementById('btn-print-qrcodes')?.addEventListener('click', () => {
      QRModule.printQRCodes({ machines: true, bouteilles: true });
    });

    // Prévisualisation CERFA
    document.getElementById('btn-preview-cerfa')?.addEventListener('click', async () => {
      try {
        UI.toast('Génération de l\'aperçu CERFA...', 'info');
        const res = await API.get('previewCerfa');
        if (res.success && res.data && res.data.html) {
          const win = window.open('', '_blank', 'width=900,height=1100,scrollbars=yes');
          win.document.write(res.data.html);
          win.document.close();
          win.document.title = 'CERFA 15497*04 — Aperçu';
        } else {
          UI.toast('Erreur lors de la génération', 'error');
        }
      } catch (err) {
        UI.toast('Erreur : ' + err.message, 'error');
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

    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Fermer les modales ouvertes
        const modals = ['modal-mes', 'modal-detail', 'modal-machine', 'modal-bouteille', 'modal-controle', 'modal-client', 'modal-user', 'modal-detecteur'];
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

    if (!fluide || !chargeNom) {
      UI.toast('Veuillez remplir tous les champs obligatoires', 'error');
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
