/**
 * inerWeb Fluide — Mode Démonstration
 *
 * Active un environnement entièrement fictif (DemoData) qui court-circuite
 * les appels au backend Apps Script. Idéal pour présentations, inspections,
 * essais utilisateurs et formation.
 *
 * Activation possibles :
 *   - Paramètre URL : ?demo=1
 *   - localStorage  : inerweb_demo = "1"
 *   - Bouton « Mode démonstration » sur l'écran de connexion
 */

window.DemoMode = (function () {

  const KEY = 'inerweb_demo';
  let active = false;

  function isActive() {
    return active;
  }

  function shouldAutoStart() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1') return true;
      if (localStorage.getItem(KEY) === '1') return true;
    } catch (e) {}
    return false;
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Active le mode démo : injecte les données fictives, court-circuite l'API,
   * affiche la bannière, redessine l'UI.
   */
  function start() {
    if (active) return;
    if (typeof DemoData === 'undefined') {
      console.error('DemoMode : DemoData introuvable. Vérifiez l\'inclusion de demo-data.js');
      return;
    }
    active = true;
    try { localStorage.setItem(KEY, '1'); } catch (e) {}

    // ===== Patch des appels API =====
    // On remplace toutes les méthodes de l'API par des stubs retournant DemoData
    if (typeof API !== 'undefined' && !API._originalForDemo) {
      API._originalForDemo = {};
      const stubResponse = (data) => Promise.resolve({ success: true, data: data });

      const apiOverrides = {
        login: () => stubResponse({
          user: {
            id: 'USER-DEMO-001',
            nom: 'Martin', prenom: 'Julien',
            nomComplet: 'Julien Martin',
            role: 'REFERENT',
            permissions: ['READ', 'WRITE', 'OFFICIEL'],
            canUseOfficiel: true,
            attestation: 'AAF-CAT1-2024-1547'
          },
          apiKey: 'DEMO-KEY-' + Date.now()
        }),
        getConfig: () => stubResponse(deepClone(DemoData.config)),
        getMachines: () => stubResponse(deepClone(DemoData.machines)),
        getBouteilles: () => stubResponse(deepClone(DemoData.bouteilles)),
        getFluides: () => stubResponse(deepClone(State.DEFAULT_FLUIDES || [])),
        getClients: () => stubResponse(deepClone(DemoData.clients)),
        getDetecteurs: () => stubResponse(deepClone(DemoData.detecteurs)),
        getAlertes: () => stubResponse(deepClone(DemoData.alertes)),
        getMouvements: () => stubResponse(deepClone(DemoData.mouvements)),
        getControles: () => stubResponse(deepClone(DemoData.controles)),
        getUsers: () => stubResponse(deepClone(DemoData.users)),
        getStatsAvancees: () => stubResponse({
          totalMachines: DemoData.machines.length,
          totalBouteilles: DemoData.bouteilles.length,
          totalClients: DemoData.clients.length,
          totalInterventions: DemoData.mouvements.length
        }),
        saveConfig: (cfg) => { Object.assign(DemoData.config, cfg); return stubResponse(DemoData.config); },
        createUser: (u) => { const id = 'USER-DEMO-' + (DemoData.users.length + 1); DemoData.users.push({ ...u, id }); return stubResponse({ id }); },
        createClient: (c) => { const id = 'CLI-DEMO-' + (DemoData.clients.length + 1); DemoData.clients.push({ ...c, id }); return stubResponse({ id }); },
        createMachine: (m) => { const id = 'M-DEMO-' + (DemoData.machines.length + 1); DemoData.machines.push({ ...m, id, code: id }); return stubResponse({ id }); },
        createBouteille: (b) => { const id = 'B-DEMO-' + (DemoData.bouteilles.length + 1); DemoData.bouteilles.push({ ...b, id, code: id }); return stubResponse({ id }); },
        createDetecteur: (d) => { const id = 'DET-DEMO-' + (DemoData.detecteurs.length + 1); DemoData.detecteurs.push({ ...d, id, code: id }); return stubResponse({ id }); },
        createMouvement: (m) => { const id = 'MVT-DEMO-' + (DemoData.mouvements.length + 1); DemoData.mouvements.push({ ...m, id }); return stubResponse({ id }); }
      };

      for (const [name, fn] of Object.entries(apiOverrides)) {
        if (typeof API[name] === 'function') {
          API._originalForDemo[name] = API[name];
        }
        API[name] = fn;
      }

      // get/post générique : on intercepte previewCerfa et autres routes connues
      if (typeof API.get === 'function') {
        API._originalForDemo.get = API.get;
        API.get = function (route, params) {
          if (route === 'previewCerfa') return stubResponse({ html: '<html><body><h1>CERFA Démo</h1></body></html>' });
          if (route === 'getUsers') return stubResponse(deepClone(DemoData.users));
          if (route === 'getTracabilite') return stubResponse({ machines: DemoData.machines, mouvements: DemoData.mouvements });
          return stubResponse([]);
        };
      }
    }

    afficherBanniere();
    console.log('[Démo] Mode démonstration activé. Données :', DemoData);

    if (typeof UI !== 'undefined' && UI.toast) {
      UI.toast('Mode démonstration activé — données fictives chargées', 'success');
    }
  }

  /**
   * Désactive le mode démo : restaure les méthodes API, recharge la page.
   */
  function stop() {
    active = false;
    try { localStorage.removeItem(KEY); } catch (e) {}

    if (typeof API !== 'undefined' && API._originalForDemo) {
      for (const [name, fn] of Object.entries(API._originalForDemo)) {
        API[name] = fn;
      }
      delete API._originalForDemo;
    }

    const banniere = document.getElementById('demo-banner');
    if (banniere) banniere.remove();

    // Recharger sans le paramètre demo
    const url = new URL(window.location.href);
    url.searchParams.delete('demo');
    window.location.href = url.toString();
  }

  function afficherBanniere() {
    if (document.getElementById('demo-banner')) return;

    const banniere = document.createElement('div');
    banniere.id = 'demo-banner';
    banniere.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,#ff6b35,#ff8a5b);color:#fff;padding:8px 16px;display:flex;align-items:center;gap:12px;font-family:Calibri,sans-serif;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.15);';
    banniere.innerHTML = ''
      + '<strong style="font-family:\'Trebuchet MS\',sans-serif;font-size:15px;">🎓 MODE DÉMONSTRATION</strong>'
      + '<span style="flex:1;">Données fictives — aucune donnée réelle, aucun envoi serveur. Idéal pour présenter, tester, former.</span>'
      + '<a href="demo.html" style="color:#fff;text-decoration:underline;font-weight:bold;">📘 Guide</a>'
      + '<button id="demo-banner-close" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.5);padding:5px 12px;border-radius:4px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:bold;">✖ Quitter la démo</button>';

    document.body.appendChild(banniere);

    // Décaler le contenu principal
    document.body.style.paddingTop = banniere.offsetHeight + 'px';

    document.getElementById('demo-banner-close').addEventListener('click', () => {
      if (confirm('Quitter le mode démonstration ? Les données fictives seront effacées et l\'application reviendra en mode normal.')) {
        stop();
      }
    });
  }

  /**
   * Tente une auto-activation au chargement si demandé via URL ou localStorage.
   * À appeler depuis app.js dès que le DOM est prêt, AVANT loadInitialData.
   */
  function autoStartIfNeeded() {
    if (shouldAutoStart()) {
      start();
    }
  }

  return {
    start,
    stop,
    isActive,
    autoStartIfNeeded,
    afficherBanniere
  };

})();
