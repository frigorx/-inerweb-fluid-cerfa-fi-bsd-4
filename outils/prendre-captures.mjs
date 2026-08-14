// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
//
// PRENDRE LES CAPTURES DU GUIDE — outil d'emballage, jamais du produit.
//
// Pourquoi un outil et pas des captures faites à la main : le logiciel bouge,
// les captures pourrissent. Ici, une seule commande les refabrique TOUTES, à
// l'identique, en mode Démo (données fictives) — jamais une donnée réelle
// d'élève ou de client dans une image publiée.
//
// Comment : Chrome est piloté par son protocole de débogage (CDP) via un
// WebSocket. Node 24 a WebSocket en natif : zéro dépendance npm, rien à
// installer, l'outil marche sur le poste tel quel.
//
// Usage :
//   node outils/prendre-captures.mjs                  (démarre tout seul)
//   node outils/prendre-captures.mjs --garder-chrome  (laisse Chrome ouvert)
//
// Les images partent dans img/guide/ (hors paquet portable : elles ne servent
// qu'au site public).

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const RACINE = path.resolve(import.meta.dirname, '..');
const SORTIE = path.join(RACINE, 'img', 'guide');

// Ports jetables : JAMAIS le 2011 (serveur réel du poste, données réelles).
const PORT_SITE = 2778;
const PORT_CDP = 9333;

const LARGEUR = 1440;
const HAUTEUR = 900;
// 2 = capture en haute densité (texte net à l'écran comme à l'impression).
const DENSITE = 2;

const CHROMES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

/* ============================================================
   LES SCÈNES — une par capture du guide, dans l'ordre du mode d'emploi.
   `hash`   : l'écran (routeur à dièse de l'application)
   `avant`  : JavaScript joué dans la page avant la capture (clics, saisies)
   `attente`: millisecondes laissées au rendu (les vues chargent leurs données)
   `zone`   : facultatif — sélecteur CSS à cadrer (sinon : l'écran entier)
   ============================================================ */
const SCENES = [
  { nom: '01-tableau-de-bord', hash: '#/dashboard', attente: 900 },
  { nom: '02-conformite-feu-tricolore', hash: '#/conformite', attente: 900 },
  { nom: '03-audit-guide', hash: '#/audit-guide', attente: 900 },
  { nom: '04-parc-machines', hash: '#/machines', attente: 700 },
  { nom: '05-stock-bouteilles', hash: '#/bouteilles', attente: 700 },
  { nom: '06-mouvements', hash: '#/mouvements', attente: 700 },
  { nom: '07-controles-etancheite', hash: '#/controles', attente: 700 },
  { nom: '08-outillage', hash: '#/outillage', attente: 700 },
  { nom: '09-personnel-habilitations', hash: '#/personnel', attente: 700 },
  { nom: '10-clients-detenteurs', hash: '#/clients', attente: 700 },
  { nom: '11-balance-matiere', hash: '#/balance', attente: 900 },
  { nom: '12-bilan-annuel', hash: '#/bilan', attente: 900 },
  { nom: '13-dechets-bsff', hash: '#/dechets', attente: 700 },
  { nom: '14-sauvegarde', hash: '#/sauvegarde', attente: 700 },
  { nom: '15-administration', hash: '#/admin', attente: 700 },
  { nom: '16-statistiques', hash: '#/stats', attente: 900 },
  { nom: '17-fluides', hash: '#/fluides', attente: 700 },
];

/* ============================================================
   Petit client CDP (le strict nécessaire)
   ============================================================ */

function attendre(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function lireJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let corps = '';
      res.on('data', (c) => { corps += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(corps)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.numero = 0;
    this.enAttente = new Map();
    ws.addEventListener('message', (evt) => {
      const msg = JSON.parse(evt.data);
      const attendu = this.enAttente.get(msg.id);
      if (attendu) {
        this.enAttente.delete(msg.id);
        if (msg.error) attendu.rejeter(new Error(msg.error.message));
        else attendu.resoudre(msg.result);
      }
    });
  }

  envoyer(methode, params = {}) {
    const id = ++this.numero;
    this.ws.send(JSON.stringify({ id, method: methode, params }));
    return new Promise((resoudre, rejeter) => {
      this.enAttente.set(id, { resoudre, rejeter });
    });
  }

  async evaluer(expression) {
    const r = await this.envoyer('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      throw new Error('JS dans la page : ' + r.exceptionDetails.text);
    }
    return r.result.value;
  }
}

/* ============================================================
   Déroulé
   ============================================================ */

const chromeExe = CHROMES.find((p) => fs.existsSync(p));
if (!chromeExe) {
  console.error('  [ERREUR] Ni Chrome ni Edge trouvé sur ce poste.');
  process.exit(1);
}

// Le site : on sert le dépôt en statique, SANS API. Le front ne trouve pas de
// serveur, il bascule donc en mode Démo (données fictives) — ce qu'on veut.
const serveur = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/v8/';
  if (url.endsWith('/')) url += 'index.html';
  const abs = path.join(RACINE, url);
  if (!abs.startsWith(RACINE)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
    res.writeHead(404).end('introuvable : ' + url);
    return;
  }
  const types = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.pdf': 'application/pdf',
  };
  res.writeHead(200, {
    'content-type': types[path.extname(abs)] || 'application/octet-stream',
    'cache-control': 'no-store', // le cache des modules ES nous a déjà piégés
  });
  fs.createReadStream(abs).pipe(res);
});
await new Promise((r) => serveur.listen(PORT_SITE, '127.0.0.1', r));
console.log(`\n  Site de captures (mode Démo) : http://127.0.0.1:${PORT_SITE}/v8/`);

// Chrome : profil JETABLE (aucun réglage du poste touché).
const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'iwf-captures-'));
const chrome = spawn(chromeExe, [
  '--headless=new',
  `--remote-debugging-port=${PORT_CDP}`,
  `--user-data-dir=${profil}`,
  `--window-size=${LARGEUR},${HAUTEUR}`,
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--no-first-run',
  '--no-default-browser-check',
  `http://127.0.0.1:${PORT_SITE}/v8/`,
], { stdio: 'ignore' });

// Attendre que le protocole réponde (Chrome met un instant à ouvrir son port).
let cibles = null;
for (let essai = 0; essai < 40 && !cibles; essai++) {
  await attendre(250);
  try {
    const liste = await lireJson(`http://127.0.0.1:${PORT_CDP}/json/list`);
    cibles = liste.filter((c) => c.type === 'page' && c.webSocketDebuggerUrl);
    if (!cibles.length) cibles = null;
  } catch { /* pas encore prêt */ }
}
if (!cibles) {
  console.error('  [ERREUR] Chrome n\'a pas ouvert son port de débogage.');
  chrome.kill();
  process.exit(1);
}

const ws = new WebSocket(cibles[0].webSocketDebuggerUrl);
await new Promise((r, j) => {
  ws.addEventListener('open', r, { once: true });
  ws.addEventListener('error', j, { once: true });
});
const cdp = new Cdp(ws);

await cdp.envoyer('Page.enable');
await cdp.envoyer('Runtime.enable');
// Haute densité : le texte des captures reste lisible une fois la page zoomée.
await cdp.envoyer('Emulation.setDeviceMetricsOverride', {
  width: LARGEUR, height: HAUTEUR, deviceScaleFactor: DENSITE, mobile: false,
});

fs.mkdirSync(SORTIE, { recursive: true });

// Laisser l'application démarrer (chargement des modules + du monde fictif).
await attendre(2500);

// La démo PROPOSE sa visite guidée à l'arrivée (depuis le 13/08) : on
// referme cette fenêtre AVANT toute capture — la vitrine doit montrer le
// LOGICIEL, pas la proposition de visite (remarque de Franck du 14/08 :
// la capture du flyer montrait « l'écran du choix vocal »). Sans bouton
// trouvé (la proposition a pu changer ou disparaître), on ne fait rien.
await cdp.evaluer(`(() => {
  const boutons = [...document.querySelectorAll('button')];
  const plusTard = boutons.find((b) => /plus tard/i.test(b.textContent));
  if (plusTard) plusTard.click();
})()`);
await attendre(600);

let prises = 0;
for (const scene of SCENES) {
  try {
    await cdp.evaluer(`location.hash = ${JSON.stringify(scene.hash)}`);
    await attendre(scene.attente ?? 700);
    if (scene.avant) {
      await cdp.evaluer(scene.avant);
      await attendre(scene.apres ?? 700);
    }

    const params = { format: 'png', captureBeyondViewport: false };
    if (scene.zone) {
      const boite = await cdp.evaluer(`(() => {
        const el = document.querySelector(${JSON.stringify(scene.zone)});
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      })()`);
      if (boite) params.clip = { ...boite, scale: DENSITE };
    }

    const { data } = await cdp.envoyer('Page.captureScreenshot', params);
    const fichier = path.join(SORTIE, scene.nom + '.png');
    fs.writeFileSync(fichier, Buffer.from(data, 'base64'));
    const ko = Math.round(fs.statSync(fichier).size / 1024);
    console.log(`  [ok] ${scene.nom}.png (${ko} Ko)`);
    prises++;
  } catch (e) {
    console.error(`  [ECHEC] ${scene.nom} : ${e.message}`);
  }
}

console.log(`\n  ${prises}/${SCENES.length} captures écrites dans img/guide/\n`);

if (!process.argv.includes('--garder-chrome')) {
  ws.close();
  chrome.kill();
}
serveur.close();
process.exit(prises === SCENES.length ? 0 : 1);
