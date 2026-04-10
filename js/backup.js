/**
 * inerWeb Fluide — Module de sauvegarde multi-support
 * Cloud (Google Drive) + USB (téléchargement ZIP) + Email + Impression batch
 */

const BACKUP = {

  /**
   * Collecte TOUTES les données de l'application
   */
  _collecterDonnees() {
    return {
      version: 'inerWeb Fluide v7.5',
      date: new Date().toISOString(),
      dateHumaine: new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR'),
      config: State.config || {},
      machines: State.machines || [],
      bouteilles: State.bouteilles || [],
      mouvements: State.mouvements || [],
      controles: State.controles || [],
      fluides: State.fluides || [],
      clients: State.clients || [],
      detecteurs: State.detecteurs || [],
      alertes: State.alertes || [],
      plaintes: State.plaintes || [],
      users: State.users || [],
      archives: State.archives || { machines: [], bouteilles: [] },
      mode: State.mode,
      user: State.user ? { id: State.user.id, nomComplet: State.user.nomComplet, role: State.user.role } : null,
      stats: {
        nbMachines: (State.machines || []).length,
        nbBouteilles: (State.bouteilles || []).length,
        nbMouvements: (State.mouvements || []).length,
        nbControles: (State.controles || []).length,
        nbPlaintes: (State.plaintes || []).length,
        nbAlertes: (State.alertes || []).length
      }
    };
  },

  // ============================================================
  //  1. SAUVEGARDE LOCALE (Téléchargement JSON — clé USB)
  // ============================================================

  async sauvegarderUSB() {
    try {
      const data = this._collecterDonnees();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const date = new Date().toISOString().slice(0, 10);
      const filename = `inerWeb_Fluide_backup_${date}.json`;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);

      UI.toast('Sauvegarde téléchargée : ' + filename, 'success');
      return filename;
    } catch (e) {
      UI.toast('Erreur sauvegarde : ' + e.message, 'error');
    }
  },

  // ============================================================
  //  2. SAUVEGARDE CLOUD (Google Drive via backend)
  // ============================================================

  async sauvegarderCloud() {
    try {
      UI.toast('Sauvegarde cloud en cours...', 'info');
      const data = this._collecterDonnees();
      const res = await API.get('backupDrive', {
        backup: JSON.stringify(data)
      });
      if (res.success) {
        UI.toast('Sauvegarde cloud réussie : ' + (res.data?.filename || 'OK'), 'success');
      } else {
        throw new Error(res.error || 'Erreur inconnue');
      }
    } catch (e) {
      // Fallback : téléchargement local si le cloud échoue
      UI.toast('Cloud indisponible — téléchargement local à la place', 'warning');
      await this.sauvegarderUSB();
    }
  },

  // ============================================================
  //  3. ENVOI PAR EMAIL
  // ============================================================

  async envoyerParEmail(email) {
    try {
      if (!email) {
        email = State.user?.email || State.config?.email || '';
        if (!email) {
          email = prompt('Adresse email pour recevoir la sauvegarde :');
          if (!email) return;
        }
      }

      UI.toast('Envoi de la sauvegarde par email...', 'info');
      const data = this._collecterDonnees();
      const res = await API.get('backupEmail', {
        email: email,
        backup: JSON.stringify(data)
      });
      if (res.success) {
        UI.toast('Sauvegarde envoyée à ' + email, 'success');
      } else {
        throw new Error(res.error || 'Erreur envoi');
      }
    } catch (e) {
      UI.toast('Erreur envoi email : ' + e.message + '. Utilisez le téléchargement local.', 'error');
      await this.sauvegarderUSB();
    }
  },

  // ============================================================
  //  4. IMPRESSION BATCH (tous les documents)
  // ============================================================

  async imprimerTout() {
    try {
      UI.toast('Préparation de l\'impression complète...', 'info');

      // Générer tous les PDF
      const pdfs = [];

      // 4a. Tous les CERFA de l'année
      // (via le bouton existant exportCerfaAnnee)

      // 4b. Fiches bouteilles
      for (const b of State.bouteilles || []) {
        try {
          const bytes = await DOCS.ficheBouteille(b.id);
          pdfs.push({ nom: 'Fiche_Bouteille_' + (b.code || b.id) + '.pdf', bytes });
        } catch (e) { console.warn('Fiche bouteille ' + b.id + ' échouée:', e.message); }
      }

      // 4c. Tableau suivi fluides
      try {
        const bytes = await DOCS.suiviFluides(new Date().getFullYear());
        pdfs.push({ nom: 'Suivi_Fluides_' + new Date().getFullYear() + '.pdf', bytes });
      } catch (e) { console.warn('Suivi fluides échoué:', e.message); }

      // 4d. Registre plaintes
      try {
        const bytes = await DOCS.registrePlaintes(State.plaintes || []);
        pdfs.push({ nom: 'Registre_Plaintes.pdf', bytes });
      } catch (e) { console.warn('Registre plaintes échoué:', e.message); }

      // Ouvrir chaque PDF dans un nouvel onglet
      for (const pdf of pdfs) {
        const blob = new Blob([pdf.bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Petit délai pour ne pas saturer le navigateur
        await new Promise(r => setTimeout(r, 500));
      }

      UI.toast(pdfs.length + ' documents générés pour impression', 'success');
    } catch (e) {
      UI.toast('Erreur impression : ' + e.message, 'error');
    }
  },

  // ============================================================
  //  5. RESTAURATION depuis un backup JSON
  // ============================================================

  async restaurer() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.version || !data.date) {
          UI.toast('Fichier de sauvegarde invalide', 'error');
          return;
        }

        // Confirmation
        const ok = confirm(
          'Restaurer la sauvegarde du ' + (data.dateHumaine || data.date) + ' ?\n\n' +
          'Contenu :\n' +
          '• ' + (data.stats?.nbMachines || 0) + ' machines\n' +
          '• ' + (data.stats?.nbBouteilles || 0) + ' bouteilles\n' +
          '• ' + (data.stats?.nbMouvements || 0) + ' mouvements\n' +
          '• ' + (data.stats?.nbControles || 0) + ' contrôles\n' +
          '• ' + (data.stats?.nbPlaintes || 0) + ' plaintes\n\n' +
          'ATTENTION : les données actuelles seront remplacées.'
        );
        if (!ok) return;

        // Restaurer les plaintes en local
        if (data.plaintes) {
          State.plaintes = data.plaintes;
          localStorage.setItem('inerweb_plaintes', JSON.stringify(data.plaintes));
          API.savePlaintes(data.plaintes).catch(() => {});
        }

        // Les autres données (machines, bouteilles, mouvements) sont gérées par le backend
        // On les envoie au backend pour restauration
        try {
          await API.get('restoreBackup', { backup: JSON.stringify(data) });
          UI.toast('Restauration complète réussie !', 'success');
          await State.loadInitialData();
          UI.showView('dashboard');
        } catch (err) {
          UI.toast('Restauration partielle : plaintes OK, backend ' + err.message, 'warning');
        }
      } catch (e) {
        UI.toast('Erreur lecture fichier : ' + e.message, 'error');
      }
    });
    input.click();
  },

  // ============================================================
  //  6. RÉSUMÉ DE SAUVEGARDE (affiche l'état des sauvegardes)
  // ============================================================

  getResume() {
    const derniere = localStorage.getItem('inerweb_derniere_sauvegarde');
    return {
      derniereSauvegarde: derniere || 'Jamais',
      nbMachines: (State.machines || []).length,
      nbBouteilles: (State.bouteilles || []).length,
      nbMouvements: (State.mouvements || []).length,
      nbPlaintes: (State.plaintes || []).length,
      tailleLocalStorage: this._getTailleLocalStorage()
    };
  },

  _getTailleLocalStorage() {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith('inerweb')) {
        total += (localStorage[key] || '').length * 2; // UTF-16
      }
    }
    if (total < 1024) return total + ' octets';
    if (total < 1024 * 1024) return (total / 1024).toFixed(1) + ' Ko';
    return (total / 1024 / 1024).toFixed(1) + ' Mo';
  },

  /**
   * Marquer la date de dernière sauvegarde
   */
  _marquerSauvegarde() {
    localStorage.setItem('inerweb_derniere_sauvegarde', new Date().toISOString());
  }
};

window.BACKUP = BACKUP;
