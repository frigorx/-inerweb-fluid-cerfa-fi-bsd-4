/**
 * inerWeb Fluide - Wizard Module v7.1.0
 * Assistant de création de mouvement de fluide
 */

const Wizard = {
  
  /**
   * Rendu de l'étape courante
   */
  renderStep(step) {
    switch (step) {
      case 1: return this.renderStepType();
      case 2: return this.renderStepMachine();
      case 3: return this.renderStepBouteille();
      case 4: return this.renderStepPesees();
      case 5: return this.renderStepSignature();
      default: return '<p>Étape inconnue</p>';
    }
  },
  
  /**
   * Bindings spécifiques à chaque étape
   */
  bindStep(step) {
    switch (step) {
      case 1: this.bindStepType(); break;
      case 2: this.bindStepMachine(); break;
      case 3: this.bindStepBouteille(); break;
      case 4: this.bindStepPesees(); break;
      case 5: this.bindStepSignature(); break;
    }
  },
  
  // ========== ÉTAPE 1: TYPE ==========
  
  renderStepType() {
    const types = [
      { id: 'CHARGE', label: 'Charge / Appoint', icon: '⬆️', desc: 'Ajout de fluide dans la machine' },
      { id: 'RECUPERATION', label: 'Récupération', icon: '⬇️', desc: 'Retrait de fluide de la machine' },
      { id: 'TRANSFERT', label: 'Transfert', icon: '↔️', desc: 'Transfert entre bouteilles' },
      { id: 'MISE_EN_SERVICE', label: 'Mise en service', icon: '🆕', desc: 'Première charge de l\'équipement' }
    ];
    
    const selected = State.wizard.data.type;
    
    return `
      <h3>Type d'opération</h3>
      <p>Sélectionnez le type de mouvement de fluide</p>
      <div class="type-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        ${types.map(t => `
          <div class="type-card ${selected === t.id ? 'selected' : ''}" data-type="${t.id}" style="
            padding: 16px;
            border: 2px solid ${selected === t.id ? 'var(--inerweb-orange)' : 'var(--slate-200)'};
            border-radius: var(--radius);
            cursor: pointer;
            text-align: center;
            background: ${selected === t.id ? '#FFF7ED' : 'white'};
            transition: all 0.2s;
          ">
            <div style="font-size: 28px; margin-bottom: 8px;">${t.icon}</div>
            <div style="font-weight: 600; color: var(--inerweb-blue);">${t.label}</div>
            <div style="font-size: 12px; color: var(--slate-500); margin-top: 4px;">${t.desc}</div>
          </div>
        `).join('')}
      </div>
    `;
  },
  
  bindStepType() {
    document.querySelectorAll('.type-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.type-card').forEach(c => {
          c.classList.remove('selected');
          c.style.borderColor = 'var(--slate-200)';
          c.style.background = 'white';
        });
        card.classList.add('selected');
        card.style.borderColor = 'var(--inerweb-orange)';
        card.style.background = '#FFF7ED';
        State.wizardSetData('type', card.dataset.type);
      });
    });
  },
  
  // ========== ÉTAPE 2: MACHINE ==========
  
  renderStepMachine() {
    const selected = State.wizard.data.machineId;
    const machines = State.machines;
    
    return `
      <h3>Sélection de la machine</h3>
      <p>Choisissez l'équipement concerné ou créez-en un nouveau</p>
      <div style="margin-bottom: 12px;">
        <button class="btn btn-primary btn-sm" id="wizard-add-machine">🏭 Créer une nouvelle machine</button>
      </div>
      ${machines.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">🏭</div>
          <div class="empty-state-title">Aucune machine dans le parc</div>
          <div class="empty-state-desc">Créez votre première machine ci-dessus</div>
        </div>
      ` : `
        <div class="machines-grid" style="max-height: 350px; overflow-y: auto;">
          ${machines.map(m => `
            <div class="machine-card ${selected === m.id ? 'selected' : ''}" data-id="${m.id}">
              <div class="machine-header">
                <div class="machine-icon">${UI.getMachineIcon(m.type)}</div>
              </div>
              <div class="machine-code">${m.code || m.id}</div>
              <div class="machine-name">${m.nom || m.designation || '--'}</div>
              <div class="machine-specs">
                <div class="spec-item">
                  <span class="spec-label">Fluide</span>
                  <span class="spec-value refrigerant">${m.fluide || '--'}</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Charge</span>
                  <span class="spec-value">${m.chargeActuelle || 0} kg</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
  },
  
  bindStepMachine() {
    document.querySelectorAll('.machine-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.machine-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        State.wizardSetData('machineId', card.dataset.id);
      });
    });
    // Bouton créer machine depuis le wizard
    document.getElementById('wizard-add-machine')?.addEventListener('click', async () => {
      App.openModalMachine();
      // Attendre la fermeture de la modale puis rafraîchir
      const observer = new MutationObserver(() => {
        if (document.getElementById('modal-machine').classList.contains('hidden')) {
          observer.disconnect();
          UI.renderWizardStep();
        }
      });
      observer.observe(document.getElementById('modal-machine'), { attributes: true });
    });
  },
  
  // ========== ÉTAPE 3: BOUTEILLE ==========
  
  renderStepBouteille() {
    const selected = State.wizard.data.bouteilleId;
    const machineId = State.wizard.data.machineId;
    const machine = State.getMachineById(machineId);
    const fluide = machine?.fluide;
    
    if (!fluide) {
      return `
        <h3>Sélection de la bouteille</h3>
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-title">Machine sans fluide défini</div>
        </div>
      `;
    }
    
    const bouteillesCompatibles = State.getBouteillesCompatibles(fluide);
    const bouteillesIncompatibles = State.bouteilles.filter(b => b.fluide !== fluide);
    
    return `
      <h3>Sélection de la bouteille</h3>
      <p>Machine: <strong>${machine.code}</strong> • Fluide compatible: <strong style="color: var(--refrigerant);">${fluide}</strong></p>
      <div style="margin-bottom: 12px;">
        <button class="btn btn-primary btn-sm" id="wizard-add-bouteille">🧪 Créer une nouvelle bouteille</button>
      </div>
      ${bouteillesCompatibles.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">🧪</div>
          <div class="empty-state-title">Aucune bouteille ${fluide} disponible</div>
          <div class="empty-state-desc">Créez une bouteille ci-dessus</div>
        </div>
      ` : `
        <div class="bouteilles-grid" style="max-height: 350px; overflow-y: auto;">
          ${bouteillesCompatibles.map(b => {
            const niveau = Math.min(100, (b.stockActuel / (b.capacite || 10)) * 100);
            return `
              <div class="bouteille-card ${selected === b.id ? 'selected' : ''}" data-id="${b.id}">
                <div class="bouteille-icon">
                  <div class="bouteille-level" style="height: ${niveau}%;"></div>
                </div>
                <span class="bouteille-category ${(b.categorie || 'neuve').toLowerCase()}">${b.categorie || 'Neuve'}</span>
                <div class="bouteille-code">${b.code || b.id}</div>
                <div class="bouteille-fluide">${b.fluide}</div>
                <div class="bouteille-masse">${parseFloat(b.stockActuel).toFixed(2)} kg</div>
              </div>
            `;
          }).join('')}
          
          ${bouteillesIncompatibles.slice(0, 2).map(b => `
            <div class="bouteille-card incompatible" title="Fluide incompatible">
              <div class="bouteille-icon">
                <div class="bouteille-level" style="height: 50%; background: linear-gradient(180deg, #EF4444 0%, #DC2626 100%);"></div>
              </div>
              <span class="bouteille-category ${(b.categorie || 'neuve').toLowerCase()}">${b.categorie || 'Neuve'}</span>
              <div class="bouteille-code">${b.code || b.id}</div>
              <div class="bouteille-fluide" style="color: var(--danger);">${b.fluide} ✕</div>
              <div class="bouteille-masse" style="opacity: 0.5;">${parseFloat(b.stockActuel || 0).toFixed(2)} kg</div>
            </div>
          `).join('')}
        </div>
      `}
    `;
  },
  
  bindStepBouteille() {
    // Bouton créer bouteille depuis le wizard
    document.getElementById('wizard-add-bouteille')?.addEventListener('click', async () => {
      App.openModalBouteille();
      const observer = new MutationObserver(() => {
        if (document.getElementById('modal-bouteille').classList.contains('hidden')) {
          observer.disconnect();
          UI.renderWizardStep();
        }
      });
      observer.observe(document.getElementById('modal-bouteille'), { attributes: true });
    });
    document.querySelectorAll('.bouteille-card:not(.incompatible)').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.bouteille-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        State.wizardSetData('bouteilleId', card.dataset.id);
      });
    });
  },
  
  // ========== ÉTAPE 4: PESÉES ==========
  
  renderStepPesees() {
    const data = State.wizard.data;
    const bouteille = State.getBouteilleById(data.bouteilleId);
    
    return `
      <h3>Pesées de la bouteille</h3>
      <p>Bouteille: <strong>${bouteille?.code || '--'}</strong> • Stock actuel: <strong>${bouteille?.stockActuel || 0} kg</strong></p>
      
      <div class="pesee-container">
        <div class="pesee-box" id="pesee-avant-box">
          <div class="pesee-label">Pesée AVANT</div>
          <input type="number" class="pesee-input" id="pesee-avant" step="0.01" min="0" placeholder="0.00" value="${data.peseeAvant || ''}">
          <div class="pesee-unit">kilogrammes</div>
        </div>
        
        <div class="pesee-arrow">→</div>
        
        <div class="pesee-box active" id="pesee-apres-box">
          <div class="pesee-label">Pesée APRÈS</div>
          <input type="number" class="pesee-input" id="pesee-apres" step="0.01" min="0" placeholder="0.00" value="${data.peseeApres || ''}">
          <div class="pesee-unit">kilogrammes</div>
        </div>
        
        <div class="pesee-arrow">=</div>
        
        <div class="pesee-result" id="pesee-result">
          <div class="pesee-result-label">Masse transférée</div>
          <div class="pesee-result-value"><span id="quantite-value">0.00</span> <span class="pesee-result-unit">kg</span></div>
        </div>
      </div>
      
      <div id="pesee-warning" class="hidden" style="margin-top: 16px; padding: 12px; background: var(--warning-light); border-radius: var(--radius); color: #92400E; font-size: 13px;">
        ⚠️ La quantité calculée semble anormale. Vérifiez vos pesées.
      </div>
    `;
  },
  
  bindStepPesees() {
    const inputAvant = document.getElementById('pesee-avant');
    const inputApres = document.getElementById('pesee-apres');
    const resultValue = document.getElementById('quantite-value');
    const warning = document.getElementById('pesee-warning');
    const type = State.wizard.data.type;
    
    const calcQuantite = () => {
      const avant = parseFloat(inputAvant.value) || 0;
      const apres = parseFloat(inputApres.value) || 0;
      
      // Selon le type d'opération
      let quantite = 0;
      if (type === 'CHARGE' || type === 'MISE_EN_SERVICE') {
        // Charge: on prend du fluide de la bouteille (avant > après)
        quantite = avant - apres;
      } else if (type === 'RECUPERATION') {
        // Récup: on met du fluide dans la bouteille (après > avant)
        quantite = apres - avant;
      } else {
        quantite = Math.abs(avant - apres);
      }
      
      // Affichage
      resultValue.textContent = Math.abs(quantite).toFixed(2);
      
      // Warning si négatif ou très grand
      if (quantite < 0 || quantite > 50) {
        warning.classList.remove('hidden');
      } else {
        warning.classList.add('hidden');
      }
      
      // Sauvegarder
      State.wizardSetData('peseeAvant', avant);
      State.wizardSetData('peseeApres', apres);
      State.wizardSetData('quantite', Math.abs(quantite));
    };
    
    inputAvant.addEventListener('input', calcQuantite);
    inputApres.addEventListener('input', calcQuantite);
    
    // Calcul initial
    calcQuantite();
  },
  
  // ========== ÉTAPE 5: SIGNATURE ==========
  
  renderStepSignature() {
    const data = State.wizard.data;
    const machine = State.getMachineById(data.machineId);
    const bouteille = State.getBouteilleById(data.bouteilleId);
    
    return `
      <h3>Récapitulatif et signature</h3>
      
      <div style="background: var(--slate-50); border-radius: var(--radius); padding: 16px; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
          <div><span style="color: var(--slate-500);">Type:</span> <strong>${data.type}</strong></div>
          <div><span style="color: var(--slate-500);">Mode:</span> <strong style="color: ${State.mode === 'OFFICIEL' ? 'var(--success)' : 'var(--mode-formation)'};">${State.mode}</strong></div>
          <div><span style="color: var(--slate-500);">Machine:</span> <strong>${machine?.code || '--'}</strong></div>
          <div><span style="color: var(--slate-500);">Fluide:</span> <strong style="color: var(--refrigerant);">${machine?.fluide || '--'}</strong></div>
          <div><span style="color: var(--slate-500);">Bouteille:</span> <strong>${bouteille?.code || '--'}</strong></div>
          <div><span style="color: var(--slate-500);">Quantité:</span> <strong>${parseFloat(data.quantite || 0).toFixed(2)} kg</strong></div>
        </div>
      </div>
      
      <div style="margin-bottom: 16px;">
        <label class="form-label">Signature de l'opérateur</label>
        <div style="background: white; border: 2px solid var(--slate-200); border-radius: var(--radius); height: 120px; display: flex; align-items: center; justify-content: center; color: var(--slate-400);">
          <canvas id="signature-canvas" width="400" height="100" style="max-width: 100%; touch-action: none;"></canvas>
        </div>
        <button type="button" class="btn btn-sm btn-ghost mt-2" id="btn-clear-signature">Effacer</button>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="commentaire">Commentaire (optionnel)</label>
        <textarea id="commentaire" class="form-input" rows="2" placeholder="Observations éventuelles..."></textarea>
      </div>
    `;
  },
  
  bindStepSignature() {
    const canvas = document.getElementById('signature-canvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    // Style du trait
    ctx.strokeStyle = '#1b3a63';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      if (e.touches) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };
    
    const startDrawing = (e) => {
      e.preventDefault();
      isDrawing = true;
      const pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
    };
    
    const draw = (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      
      lastX = pos.x;
      lastY = pos.y;
    };
    
    const stopDrawing = () => {
      isDrawing = false;
      // Sauvegarder la signature
      State.wizardSetData('signature', canvas.toDataURL());
    };
    
    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    
    // Effacer
    document.getElementById('btn-clear-signature').addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      State.wizardSetData('signature', null);
    });
    
    // Commentaire
    document.getElementById('commentaire').addEventListener('input', (e) => {
      State.wizardSetData('commentaire', e.target.value);
    });
  },
  
  // ========== VALIDATION ==========
  
  /**
   * Valide l'étape courante
   */
  validateStep(step) {
    const data = State.wizard.data;
    
    switch (step) {
      case 1:
        if (!data.type) {
          UI.toast('Veuillez sélectionner un type d\'opération', 'error');
          return false;
        }
        break;
        
      case 2:
        if (!data.machineId) {
          UI.toast('Veuillez sélectionner une machine', 'error');
          return false;
        }
        break;
        
      case 3:
        if (!data.bouteilleId) {
          UI.toast('Veuillez sélectionner une bouteille', 'error');
          return false;
        }
        break;
        
      case 4:
        if (!data.peseeAvant || !data.peseeApres) {
          UI.toast('Veuillez saisir les deux pesées', 'error');
          return false;
        }
        if (data.quantite <= 0) {
          UI.toast('La quantité doit être positive', 'error');
          return false;
        }
        break;
        
      case 5:
        // Signature optionnelle en formation
        break;
    }
    
    return true;
  },
  
  /**
   * Soumet le mouvement
   */
  async submit() {
    const data = State.wizard.data;
    
    try {
      const machine = State.getMachineById(data.machineId);
      const bouteille = State.getBouteilleById(data.bouteilleId);
      // La signature base64 est trop volumineuse pour un GET
      // On envoie juste un flag "signe" et on stocke la signature localement
      const signe = data.signature ? 'oui' : 'non';
      const response = await API.createMouvement({
        type: data.type,
        machine: machine?.code || data.machineId,
        bouteille: bouteille?.code || data.bouteilleId,
        peseeAvant: data.peseeAvant,
        peseeApres: data.peseeApres,
        operateur: State.user.id,
        mode: State.mode,
        signe: signe,
        observations: data.commentaire
      });

      // Stocker la signature localement pour le CERFA
      if (data.signature && response.data?.id) {
        try {
          localStorage.setItem('sig_' + response.data.id, data.signature);
        } catch (e) { /* quota dépassé, pas grave */ }
      }
      
      UI.toast('Mouvement créé avec succès !', 'success');
      UI.hideWizard();
      
      // Rafraîchir les données
      await State.loadInitialData();
      UI.showView('dashboard');
      
    } catch (error) {
      UI.toast('Erreur: ' + error.message, 'error');
    }
  }
};

// Export global
window.Wizard = Wizard;
