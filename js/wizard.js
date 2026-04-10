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
      <div style="margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="btn btn-primary btn-sm" id="wizard-add-machine">🏭 Créer une nouvelle machine</button>
        <button class="btn btn-sm" id="wizard-scan-machine" style="background:#1b3a63;color:white;">📷 Scanner QR code</button>
      </div>
      ${machines.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">🏭</div>
          <div class="empty-state-title">Aucune machine dans le parc</div>
          <div class="empty-state-desc">Créez votre première machine ci-dessus</div>
        </div>
      ` : `
        <div class="machines-grid" style="max-height: 350px; overflow-y: auto;">
          ${machines.map(m => {
            const isPrechargee = (m.statut || '').includes('préchargée');
            return `
            <div class="machine-card ${selected === m.id ? 'selected' : ''}" data-id="${m.id}" data-prechargee="${isPrechargee}">
              <div class="machine-header">
                <div class="machine-icon">${UI.getMachineIcon(m.type)}</div>
                ${isPrechargee ? '<span style="position:absolute;top:6px;right:6px;background:#3B82F6;color:white;font-size:10px;padding:2px 6px;border-radius:10px;">Préchargée</span>' : ''}
              </div>
              <div class="machine-code">${m.code || m.id}</div>
              <div class="machine-name">${m.nom || m.designation || '--'}</div>
              <div class="machine-specs">
                <div class="spec-item">
                  <span class="spec-label">Fluide</span>
                  <span class="spec-value refrigerant">${m.fluide || '--'}</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Charge${isPrechargee ? ' usine' : ''}</span>
                  <span class="spec-value">${m.chargeActuelle || m.charge || 0} kg</span>
                </div>
              </div>
            </div>
          `}).join('')}
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

        // Avertissement si machine préchargée + mise en service
        const isPrechargee = card.dataset.prechargee === 'true';
        const type = State.wizard.data.type;
        let msgBox = document.getElementById('wizard-prechargee-msg');
        if (!msgBox) {
          msgBox = document.createElement('div');
          msgBox.id = 'wizard-prechargee-msg';
          msgBox.style.cssText = 'margin-top:12px;padding:12px;border-radius:8px;font-size:13px;';
          card.closest('.machines-grid')?.parentNode?.appendChild(msgBox);
        }
        if (isPrechargee && type === 'MISE_EN_SERVICE') {
          msgBox.style.background = '#FEF3C7';
          msgBox.style.color = '#92400E';
          msgBox.innerHTML = '⚠️ Cette machine est <strong>préchargée en usine</strong>. La mise en service est déjà faite. Utilisez plutôt <strong>Charge / Appoint</strong> si vous devez compléter le niveau de fluide.';
          msgBox.classList.remove('hidden');
        } else if (isPrechargee) {
          msgBox.style.background = '#EFF6FF';
          msgBox.style.color = '#1E40AF';
          msgBox.innerHTML = 'ℹ️ Machine préchargée en usine — la charge initiale est déjà comptabilisée.';
          msgBox.classList.remove('hidden');
        } else {
          msgBox.classList.add('hidden');
        }
      });
    });
    // Scanner QR machine
    document.getElementById('wizard-scan-machine')?.addEventListener('click', () => {
      QRModule.openScanner((result) => {
        if (result.type === 'MACHINE' || result.type === 'INCONNU') {
          const machine = State.machines.find(m => (m.code || m.id) === result.code);
          if (machine) {
            State.wizardSetData('machineId', machine.code || machine.id);
            UI.renderWizardStep();
            UI.toast(`Machine ${result.code} sélectionnée`, 'success');
          } else {
            UI.toast(`Machine "${result.code}" non trouvée dans le parc`, 'error');
          }
        } else {
          UI.toast(`Ce QR code est une ${result.type}, pas une machine`, 'warning');
        }
      });
    });

    // Bouton créer machine depuis le wizard
    document.getElementById('wizard-add-machine')?.addEventListener('click', async () => {
      App._derniereMachineCreee = null;
      App.openModalMachine();
      // Attendre la fermeture de la modale avec polling simple
      const modal = document.getElementById('modal-machine');
      const waitClose = () => {
        return new Promise(resolve => {
          const check = setInterval(() => {
            if (modal.classList.contains('hidden')) {
              clearInterval(check);
              resolve();
            }
          }, 200);
        });
      };
      await waitClose();
      // La modale est fermée et les données sont rechargées (submitMachine fait loadInitialData avant fermeture)
      if (App._derniereMachineCreee) {
        const codeCreee = App._derniereMachineCreee;
        State.wizardSetData('machineId', codeCreee);
        App._derniereMachineCreee = null;
        State.wizardNext();
      }
      UI.renderWizardStep();
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
    
    const isPrechargee = (machine.statut || '').includes('préchargée');
    const bouteillesCompatibles = State.getBouteillesCompatibles(fluide);
    const bouteillesIncompatibles = State.bouteilles.filter(b => b.fluide !== fluide);

    return `
      <h3>Sélection de la bouteille</h3>
      <p>Machine: <strong>${machine.code}</strong> • Fluide compatible: <strong style="color: var(--refrigerant);">${fluide}</strong></p>
      ${isPrechargee ? `
        <div style="padding: 12px; background: #EFF6FF; border: 2px solid #3B82F6; border-radius: 8px; margin-bottom: 12px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #1E40AF;">ℹ️ Machine préchargée en usine</p>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #1E40AF;">Le fluide est déjà dans la machine (charge usine : ${machine.chargeActuelle || machine.charge || '?'} kg). Vous pouvez passer cette étape ou sélectionner une bouteille si vous faites un appoint.</p>
          <button class="btn btn-sm" id="wizard-skip-bouteille" style="background: #3B82F6; color: white;">Passer (pas de bouteille) →</button>
        </div>
      ` : `
        <div style="padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13px; color: #64748B;">Pas de bouteille à utiliser ?</span>
          <button class="btn btn-sm btn-secondary" id="wizard-skip-bouteille">Passer cette étape →</button>
        </div>
      `}
      <div style="margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="btn btn-primary btn-sm" id="wizard-add-bouteille">🧪 Créer une nouvelle bouteille</button>
        <button class="btn btn-sm" id="wizard-scan-bouteille" style="background:#e8914a;color:white;">📷 Scanner QR code</button>
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
    // Scanner QR bouteille
    document.getElementById('wizard-scan-bouteille')?.addEventListener('click', () => {
      QRModule.openScanner((result) => {
        if (result.type === 'BOUTEILLE' || result.type === 'INCONNU') {
          const bouteille = State.bouteilles.find(b => (b.code || b.id) === result.code);
          if (bouteille) {
            State.wizardSetData('bouteilleId', bouteille.code || bouteille.id);
            UI.renderWizardStep();
            UI.toast(`Bouteille ${result.code} sélectionnée`, 'success');
          } else {
            UI.toast(`Bouteille "${result.code}" non trouvée`, 'error');
          }
        } else {
          UI.toast(`Ce QR code est une ${result.type}, pas une bouteille`, 'warning');
        }
      });
    });

    // Bouton créer bouteille depuis le wizard
    document.getElementById('wizard-add-bouteille')?.addEventListener('click', async () => {
      App._derniereBouteilleCreee = null;
      App.openModalBouteille();
      const modal = document.getElementById('modal-bouteille');
      const waitClose = () => {
        return new Promise(resolve => {
          const check = setInterval(() => {
            if (modal.classList.contains('hidden')) {
              clearInterval(check);
              resolve();
            }
          }, 200);
        });
      };
      await waitClose();
      if (App._derniereBouteilleCreee) {
        State.wizardSetData('bouteilleId', App._derniereBouteilleCreee);
        App._derniereBouteilleCreee = null;
        State.wizardNext();
      }
      UI.renderWizardStep();
    });
    // Bouton "Passer" pour machine préchargée
    document.getElementById('wizard-skip-bouteille')?.addEventListener('click', () => {
      State.wizardSetData('bouteilleId', null);
      State.wizardNext();
      UI.renderWizardStep();
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

    // Pas de bouteille sélectionnée : pas de pesée (machine préchargée ou skip)
    if (!data.bouteilleId) {
      const machine = State.getMachineById(data.machineId);
      const isPrechargee = (machine?.statut || '').includes('préchargée');
      return `
        <h3>Quantités</h3>
        <div style="padding: 20px; background: #EFF6FF; border-radius: 8px; text-align: center;">
          <div style="font-size: 40px; margin-bottom: 12px;">${isPrechargee ? '🏭' : '✅'}</div>
          <h4 style="color: #1E40AF; margin: 0 0 8px 0;">${isPrechargee ? 'Machine préchargée en usine' : 'Pas de bouteille sélectionnée'}</h4>
          <p style="color: #1E40AF; margin: 0 0 12px 0;">${isPrechargee ? 'Pas de pesée nécessaire — le fluide est d\'origine constructeur.' : 'Aucune pesée à effectuer pour cette opération.'}</p>
          <div style="display: inline-block; background: white; padding: 12px 24px; border-radius: 8px; border: 2px solid #3B82F6;">
            <div style="font-size: 13px; color: #64748B;">Charge actuelle</div>
            <div style="font-size: 28px; font-weight: 700; color: #1E40AF;">${machine?.chargeActuelle || machine?.charge || '?'} kg</div>
            <div style="font-size: 12px; color: #64748B;">${machine?.fluide || ''}</div>
          </div>
        </div>
      `;
    }

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
    // Machine préchargée sans bouteille : pas d'inputs pesée
    if (!inputAvant || !inputApres) return;

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
      
      // Warning si pesée inversée ou quantité très grande
      const peseeInversee = (type === 'CHARGE' || type === 'MISE_EN_SERVICE') ? avant < apres :
                            (type === 'RECUPERATION') ? apres < avant : false;
      if (peseeInversee || Math.abs(quantite) > 50) {
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

    const operateurNom = State.user?.nomComplet || (State.user?.prenom + ' ' + State.user?.nom) || State.user?.id || '--';
    const aujourdhui = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return `
      <h3>Récapitulatif et certification</h3>

      <div style="background: var(--slate-50); border-radius: var(--radius); padding: 16px; margin-bottom: 20px;">
        <div style="background: #1B3A63; color: white; padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 11px; opacity: 0.7; text-transform: uppercase;">Opérateur</div>
            <div style="font-weight: 600; font-size: 16px;">${operateurNom}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; opacity: 0.7; text-transform: uppercase;">Mode</div>
            <div style="font-weight: 600; font-size: 16px; color: ${State.mode === 'OFFICIEL' ? '#4ADE80' : '#60A5FA'};">${State.mode}</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
          <div><span style="color: var(--slate-500);">Type:</span> <strong>${data.type}</strong></div>
          <div><span style="color: var(--slate-500);">Machine:</span> <strong>${machine?.code || '--'}</strong> ${machine?.nom ? '(' + machine.nom + ')' : ''}</div>
          <div><span style="color: var(--slate-500);">Fluide:</span> <strong style="color: var(--refrigerant);">${machine?.fluide || '--'}</strong></div>
          <div><span style="color: var(--slate-500);">Bouteille:</span> <strong>${bouteille?.code || (this.isMachinePrechargee() ? 'Précharge usine' : '--')}</strong></div>
          <div style="grid-column: span 2;"><span style="color: var(--slate-500);">Quantité:</span> <strong style="font-size: 18px;">${this.isMachinePrechargee() && !data.bouteilleId ? (machine?.chargeActuelle || machine?.charge || '?') + ' kg (usine)' : parseFloat(data.quantite || 0).toFixed(2) + ' kg'}</strong></div>
        </div>
      </div>

      <div style="background: white; border: 2px solid var(--slate-200); border-radius: var(--radius); padding: 20px; margin-bottom: 16px;">
        <div style="font-weight: 700; font-size: 16px; color: #1B3A63; margin-bottom: 16px;">Certification de l'opérateur</div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" for="signataire-nom" style="font-weight: 600;">Nom du signataire</label>
          <input type="text" id="signataire-nom" class="form-input" value="${operateurNom}" placeholder="Nom et prénom" style="font-size: 15px;">
        </div>

        <div style="background: #F8FAFC; border: 1px solid var(--slate-200); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: var(--slate-500); text-transform: uppercase; margin-bottom: 4px;">Date de certification</div>
          <div style="font-weight: 600; color: #1B3A63; font-size: 15px;" id="certification-date">${aujourdhui}</div>
        </div>

        <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; padding: 12px; border: 2px solid var(--slate-200); border-radius: 8px; transition: all 0.2s;" id="certification-label">
          <input type="checkbox" id="certification-checkbox" style="margin-top: 3px; width: 18px; height: 18px; accent-color: #1B3A63; flex-shrink: 0;">
          <span style="font-size: 14px; color: #334155; line-height: 1.4;">Je certifie avoir réalisé l'opération décrite ci-dessus et que les informations sont exactes.</span>
        </label>
      </div>

      <div class="form-group">
        <label class="form-label" for="commentaire">Commentaire (optionnel)</label>
        <textarea id="commentaire" class="form-input" rows="2" placeholder="Observations éventuelles..."></textarea>
      </div>
    `;
  },

  bindStepSignature() {
    const checkbox = document.getElementById('certification-checkbox');
    const label = document.getElementById('certification-label');
    const nomInput = document.getElementById('signataire-nom');

    // Mise à jour visuelle de la case à cocher
    const updateCertification = () => {
      if (checkbox.checked) {
        label.style.borderColor = '#16A34A';
        label.style.background = '#F0FDF4';
        // Stocker la certification en texte simple : "CERTIFIÉ|NomPrenom|2026-03-09T12:00:00"
        const nom = nomInput.value.trim() || '--';
        const dateISO = new Date().toISOString();
        State.wizardSetData('signature', `CERTIFIÉ|${nom}|${dateISO}`);
      } else {
        label.style.borderColor = 'var(--slate-200)';
        label.style.background = 'transparent';
        State.wizardSetData('signature', null);
      }
    };

    checkbox.addEventListener('change', updateCertification);

    // Si le nom change et que la case est cochée, mettre à jour la signature
    nomInput.addEventListener('input', () => {
      if (checkbox.checked) {
        updateCertification();
      }
    });

    // Commentaire
    document.getElementById('commentaire').addEventListener('input', (e) => {
      State.wizardSetData('commentaire', e.target.value);
    });

    // Restaurer l'état si déjà certifié (retour en arrière dans le wizard)
    if (State.wizard.data.signature && State.wizard.data.signature.startsWith('CERTIFIÉ|')) {
      checkbox.checked = true;
      updateCertification();
    }
  },
  
  // ========== VALIDATION ==========
  
  /**
   * Valide l'étape courante
   */
  /**
   * Vérifie si la machine sélectionnée est préchargée
   */
  isMachinePrechargee() {
    const machine = State.getMachineById(State.wizard.data.machineId);
    return machine && (machine.statut || '').includes('préchargée');
  },

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
        // Vérifier fluide connu dès la sélection machine
        {
          const machine2 = State.getMachineById(data.machineId);
          if (machine2?.fluide) {
            const fl = State.getFluidByCode(machine2.fluide);
            if (!fl || !fl.prg) {
              UI.toast('Le fluide "' + machine2.fluide + '" de cette machine est inconnu. Vérifiez la configuration dans Admin > Fluides.', 'error');
              return false;
            }
          }
        }
        break;

      case 3:
        // Bouteille optionnelle : l'utilisateur peut cliquer "Passer" pour continuer sans
        if (!data.bouteilleId) {
          UI.toast('Sélectionnez une bouteille ou cliquez "Passer cette étape"', 'warning');
          return false;
        }
        break;

      case 4:
        // Pas de pesée si aucune bouteille sélectionnée
        if (!data.bouteilleId) {
          break;
        }
        if (data.peseeAvant === null || data.peseeAvant === undefined || data.peseeAvant === '' ||
            data.peseeApres === null || data.peseeApres === undefined || data.peseeApres === '') {
          UI.toast('Veuillez saisir les deux pesées', 'error');
          return false;
        }
        if (!data.quantite || data.quantite <= 0) {
          UI.toast('La quantité doit être positive', 'error');
          return false;
        }
        // Vérifier stock bouteille suffisant en mode CHARGE
        if (data.bouteilleId) {
          const bType = (data.type || '').toUpperCase();
          if (bType === 'CHARGE' || bType === 'MISE_EN_SERVICE') {
            const bout = State.getBouteilleById(data.bouteilleId);
            const stock = parseFloat(bout?.stockActuel || bout?.masse || 0);
            if (stock > 0 && data.quantite > stock) {
              UI.toast('La bouteille ne contient que ' + stock.toFixed(2) + ' kg mais vous essayez d\'en charger ' + parseFloat(data.quantite).toFixed(2) + ' kg.', 'error');
              return false;
            }
          }
        }
        // B3 — Vérifier pesée inversée (warning bloquant)
        {
          const type = (data.type || '').toUpperCase();
          const avant = parseFloat(data.peseeAvant);
          const apres = parseFloat(data.peseeApres);
          const peseeInversee = (type === 'CHARGE' || type === 'MISE_EN_SERVICE') ? avant < apres :
                                (type === 'RECUPERATION' || type === 'VIDANGE') ? apres < avant : false;
          if (peseeInversee) {
            UI.toast('Pesée inversée détectée ! Vérifiez les valeurs avant/après. En charge, la bouteille s\'allège (avant > après). En récupération, elle s\'alourdit (après > avant).', 'error');
            return false;
          }
        }
        break;
        
      case 5:
        if (!data.signature || !data.signature.startsWith('CERTIFIÉ|')) {
          UI.toast('Veuillez cocher la case de certification', 'error');
          return false;
        }
        const nomSignataire = document.getElementById('signataire-nom')?.value?.trim();
        if (!nomSignataire) {
          UI.toast('Veuillez saisir le nom du signataire', 'error');
          return false;
        }
        // B11 : En mode OFFICIEL, vérifier l'attestation de capacité
        if (State.mode === 'OFFICIEL') {
          const user = State.user;
          if (!user?.attestation && !user?.hasAttestation) {
            UI.toast('Mode OFFICIEL : attestation de capacité requise. Renseignez-la dans Admin > Utilisateurs.', 'error');
            return false;
          }
        }
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

      // B4 — Vérifier que le fluide de la machine est connu
      if (machine?.fluide) {
        const fluideConnu = State.getFluidByCode(machine.fluide);
        if (!fluideConnu || !fluideConnu.prg) {
          UI.toast('Fluide "' + machine.fluide + '" inconnu ou PRG non renseigné. Vérifiez la configuration des fluides dans Admin.', 'error');
          return;
        }
      }

      // Signature = certification texte simple (CERTIFIÉ|Nom|Date)
      const signe = data.signature && data.signature.startsWith('CERTIFIÉ|') ? 'oui' : 'non';
      const sansBouteille = !data.bouteilleId;
      const isPrechargee = this.isMachinePrechargee();

      const typeMap = { 'CHARGE': 'Charge', 'RECUPERATION': 'Recuperation', 'MISE_EN_SERVICE': 'MiseEnService', 'TRANSFERT': 'Transfert' };
      const mouvementData = {
        type: (sansBouteille && isPrechargee) ? 'MiseEnService' : typeMap[data.type] || data.type,
        machine: machine?.code || data.machineId,
        bouteille: bouteille?.code || data.bouteilleId || '',
        peseeAvant: sansBouteille ? 0 : data.peseeAvant,
        peseeApres: sansBouteille ? 0 : data.peseeApres,
        operateur: State.user.id,
        mode: State.mode,
        signe: signe,
        observations: (sansBouteille && isPrechargee)
          ? (data.commentaire ? data.commentaire + ' | ' : '') + 'Précharge usine - fluide neuf origine constructeur'
          : data.commentaire
      };

      const response = await API.createMouvement(mouvementData);
      const mouvementId = response.data?.id;

      // Stocker la certification texte pour le CERFA
      if (data.signature && mouvementId) {
        try {
          localStorage.setItem('sig_' + mouvementId, data.signature);
        } catch (e) { /* quota dépassé, pas grave */ }
      }

      // B2 + B12 : Mettre à jour le stock bouteille ET charge machine localement
      const type = data.type;
      const qty = parseFloat(data.quantite || 0);

      if (bouteille && data.bouteilleId) {
        if (type === 'CHARGE' || type === 'MISE_EN_SERVICE') {
          bouteille.stockActuel = Math.max(0, parseFloat(bouteille.stockActuel || 0) - qty);
        } else if (type === 'RECUPERATION') {
          bouteille.stockActuel = parseFloat(bouteille.stockActuel || 0) + qty;
        }
        if (bouteille.categorie === 'Neuve' || bouteille.categorie === 'NEUVE') {
          bouteille.categorie = 'En service';
        }
        bouteille.statut = 'En service';
      }

      // Mise à jour charge machine locale
      if (machine) {
        const chargeActuelle = parseFloat(machine.chargeActuelle || machine.charge || 0);
        if (type === 'CHARGE' || type === 'MISE_EN_SERVICE') {
          machine.chargeActuelle = (chargeActuelle + qty).toFixed(2);
        } else if (type === 'RECUPERATION' || type === 'VIDANGE') {
          machine.chargeActuelle = Math.max(0, chargeActuelle - qty).toFixed(2);
        }
      }

      UI.hideWizard();

      // CERFA sera généré automatiquement côté backend après validation (Faille 4)
      let cerfaContenu = null;
      let cerfaId = null;
      let cerfaUrl = null;

      // Afficher le récapitulatif complet
      const operateurNom = State.user?.nomComplet || State.user?.prenom + ' ' + State.user?.nom || State.user?.id;
      const machineNom = machine ? `${machine.code} - ${machine.nom || ''}` : data.machineId;
      const qte = sansBouteille
        ? (machine?.chargeActuelle || machine?.charge || '?') + ' kg' + (isPrechargee ? ' (précharge usine)' : ' (sans bouteille)')
        : parseFloat(data.quantite || 0).toFixed(2) + ' kg';

      this.showRecapitulatif({
        mouvementId,
        cerfaId,
        cerfaContenu,
        cerfaUrl,
        operateurNom,
        machineNom,
        fluide: machine?.fluide || '--',
        type: mouvementData.type,
        quantite: qte,
        quantiteNum: data.quantite || 0,
        mode: State.mode,
        machineCode: machine?.code || data.machineId,
        bouteilleCode: bouteille?.code || data.bouteilleId || '',
        bouteille: bouteille?.code || (sansBouteille && isPrechargee ? 'Précharge usine' : '--')
      });

      // Rafraîchir les données en arrière-plan
      await State.loadInitialData();

    } catch (error) {
      UI.toast('Erreur: ' + error.message, 'error');
    }
  },

  /**
   * Affiche le récapitulatif après création du mouvement
   */
  showRecapitulatif(info) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'recap-mouvement';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;';

    overlay.innerHTML = `
      <div style="background:white;border-radius:16px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <div style="background:linear-gradient(135deg,#1B3A63,#2563EB);color:white;padding:24px;border-radius:16px 16px 0 0;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">✅</div>
          <h2 style="margin:0 0 4px 0;font-size:20px;">Mouvement enregistré</h2>
          <div style="font-size:14px;opacity:0.8;">N° ${info.mouvementId}</div>
        </div>

        <div style="padding:20px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div style="background:#F8FAFC;padding:12px;border-radius:8px;">
              <div style="font-size:11px;color:#64748B;text-transform:uppercase;">Opérateur</div>
              <div style="font-weight:600;color:#1B3A63;">${info.operateurNom}</div>
            </div>
            <div style="background:#F8FAFC;padding:12px;border-radius:8px;">
              <div style="font-size:11px;color:#64748B;text-transform:uppercase;">Mode</div>
              <div style="font-weight:600;color:${info.mode === 'OFFICIEL' ? '#16A34A' : '#2563EB'};">${info.mode}</div>
            </div>
            <div style="background:#F8FAFC;padding:12px;border-radius:8px;">
              <div style="font-size:11px;color:#64748B;text-transform:uppercase;">Machine</div>
              <div style="font-weight:600;color:#1B3A63;">${info.machineNom}</div>
            </div>
            <div style="background:#F8FAFC;padding:12px;border-radius:8px;">
              <div style="font-size:11px;color:#64748B;text-transform:uppercase;">Type</div>
              <div style="font-weight:600;color:#1B3A63;">${info.type}</div>
            </div>
            <div style="background:#F8FAFC;padding:12px;border-radius:8px;">
              <div style="font-size:11px;color:#64748B;text-transform:uppercase;">Fluide</div>
              <div style="font-weight:600;color:#E97132;">${info.fluide}</div>
            </div>
            <div style="background:#F8FAFC;padding:12px;border-radius:8px;">
              <div style="font-size:11px;color:#64748B;text-transform:uppercase;">Quantité</div>
              <div style="font-weight:600;color:#1B3A63;">${info.quantite}</div>
            </div>
            <div style="background:#F8FAFC;padding:12px;border-radius:8px;grid-column:span 2;">
              <div style="font-size:11px;color:#64748B;text-transform:uppercase;">Bouteille</div>
              <div style="font-weight:600;color:#1B3A63;">${info.bouteille}</div>
            </div>
          </div>

          ${info.cerfaId ? `
            <div style="background:#F0FDF4;border:2px solid #16A34A;border-radius:8px;padding:12px;margin-bottom:16px;text-align:center;">
              <div style="font-weight:600;color:#16A34A;margin-bottom:4px;">CERFA ${info.cerfaId} généré automatiquement</div>
              <div style="font-size:12px;color:#15803D;">Fiche d'intervention conforme au CERFA 15497*04${info.cerfaUrl ? ' — Stocké dans Google Drive' : ''}</div>
            </div>
          ` : `
            <div style="background:#FEF3C7;border:2px solid #F59E0B;border-radius:8px;padding:12px;margin-bottom:16px;text-align:center;">
              <div style="font-weight:600;color:#92400E;margin-bottom:4px;">CERFA sera généré après validation</div>
              <div style="font-size:12px;color:#92400E;">Le CERFA 15497*04 sera automatiquement créé lorsqu'un référent ou enseignant validera ce mouvement.</div>
              <button class="btn btn-primary" id="recap-apercu-cerfa" style="margin-top:8px;font-size:13px;">📄 Aperçu CERFA 15497*04</button>
            </div>
          `}

          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
            ${info.cerfaUrl ? `
              <a href="${info.cerfaUrl}" target="_blank" class="btn btn-primary" style="flex:1;min-width:140px;text-align:center;text-decoration:none;">
                📄 Ouvrir le CERFA (PDF)
              </a>
            ` : info.cerfaContenu ? `
              <button class="btn btn-primary" id="recap-voir-cerfa" style="flex:1;min-width:140px;">
                📄 Voir le CERFA
              </button>
            ` : ''}
            ${info.cerfaContenu ? `
              <button class="btn btn-secondary" id="recap-imprimer-cerfa" style="flex:1;min-width:140px;">
                🖨️ Imprimer
              </button>
            ` : ''}
            <button class="btn btn-secondary" id="recap-fermer" style="flex:1;min-width:140px;">
              Fermer
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Bindings
    document.getElementById('recap-fermer')?.addEventListener('click', async () => {
      overlay.remove();
      await State.loadMouvements();
      UI.showView('dashboard');
    });

    overlay.addEventListener('click', async (e) => {
      if (e.target === overlay) {
        overlay.remove();
        await State.loadMouvements();
        UI.showView('dashboard');
      }
    });

    // Aperçu CERFA pixel-perfect via module CERFA
    document.getElementById('recap-apercu-cerfa')?.addEventListener('click', async () => {
      await CERFA.ouvrir({
        id: info.mouvementId,
        cerfa: info.cerfaId || info.mouvementId,
        type: info.type,
        machine: info.machineCode,
        quantite: info.quantiteNum || 0,
        mode: info.mode,
        observations: '',
        bouteille: info.bouteilleCode
      });
    });

    if (info.cerfaContenu) {
      document.getElementById('recap-voir-cerfa')?.addEventListener('click', () => {
        const w = window.open('', '_blank', 'width=700,height=800');
        w.document.write(`<html><head><title>CERFA ${info.cerfaId}</title><style>
          body { font-family: 'Courier New', monospace; padding: 20px; background: #f9f9f9; }
          pre { white-space: pre-wrap; background: white; padding: 30px; border: 1px solid #ddd; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          @media print { body { background: white; } pre { border: none; box-shadow: none; padding: 0; } }
        </style></head><body><pre>${info.cerfaContenu}</pre></body></html>`);
        w.document.close();
      });

      document.getElementById('recap-imprimer-cerfa')?.addEventListener('click', () => {
        const w = window.open('', '_blank', 'width=700,height=800');
        w.document.write(`<html><head><title>CERFA ${info.cerfaId}</title><style>
          body { font-family: 'Courier New', monospace; padding: 20px; }
          pre { white-space: pre-wrap; }
        </style></head><body><pre>${info.cerfaContenu}</pre><script>window.onload=function(){window.print();}<\/script></body></html>`);
        w.document.close();
      });
    }
  }
};

// Export global
window.Wizard = Wizard;
