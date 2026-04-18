# inerWeb TP v1.0 — Kit de déploiement

Contenu du ZIP :

```
inerWeb_TP_v1.0/
├── INSTALL.md                    Ce fichier
├── tp/                           Application PWA à pousser sur GitHub Pages
│   ├── index.html                App élève
│   ├── app.js                    Logique + auto-correction
│   ├── data.js                   Vérité terrain 10 bouteilles + barème CAP IFCA
│   ├── style.css                 Charte inerWeb
│   ├── manifest.json             PWA installable
│   ├── sw.js                     Service worker offline
│   ├── admin.html                Console prof
│   ├── README.md                 Doc complète
│   └── img/balances/             Schéma Refco (extrait PDF)
├── apps-script/
│   └── releves_tp.gs             À copier dans ton projet Apps Script
└── QRcodes_Bouteilles_TP.pdf     Planche A4 de 20 QR codes à imprimer
```

---

## 🚀 DÉPLOIEMENT EN 3 ÉTAPES

### 1. GitHub Pages (l'app élève)

Le dossier `tp/` est à poser tel quel dans ton repo **inerweb/fluide**
(sous-dossier `tp/`). Après push :
- L'app sera à : `https://inerweb.github.io/fluide/tp/`
- Elle marche immédiatement en mode local (données en localStorage)
- Installation sur téléphone : ouvrir l'URL sur Chrome/Safari →
  menu → « Ajouter à l'écran d'accueil »

### 2. Apps Script (le backend Google Sheet)

1. Ouvrir ton projet Apps Script lié à la Google Sheet inerWeb.
2. Créer un nouveau fichier `releves_tp.gs` (bouton + en haut à gauche).
3. Copier **tout** le contenu de `apps-script/releves_tp.gs` dedans.
4. Dans `Code.gs` existant, au tout début de **doGet(e)** (et aussi
   **doPost(e)** si tu en as un), ajouter :

   ```js
   var tpAction = handleReleveTpAction(
     (e.parameter && e.parameter.action) || '',
     e,
     (function(){ try { return JSON.parse(e.postData && e.postData.contents); } catch(_){ return {}; } })()
   );
   if (tpAction !== null) return ContentService.createTextOutput(JSON.stringify(tpAction))
                            .setMimeType(ContentService.MimeType.JSON);
   ```

5. **Deploy → Manage deployments → Edit (crayon)** → nouvelle version → Deploy.
6. Copier l'URL `https://script.google.com/macros/s/XXX/exec`.

La feuille `RELEVES_TP` sera créée **automatiquement** au premier relevé.

### 3. QR codes sur les bouteilles

Imprimer `QRcodes_Bouteilles_TP.pdf` (A4, 20 étiquettes). Découper les
**10 premiers** (TP-B01 à TP-B10) et coller sur les bouteilles correspondantes.

Mapping bouteille → QR (déjà configuré dans data.js) :
- TP-B01 → DHEON HHD86
- TP-B02 → GAZECHIM 513822
- TP-B03 → GAZECHIME 5438
- TP-B04 → GAZECHIME 9496
- TP-B05 → GAZECHIME 7727
- TP-B06 → GAZECHIM 0672
- TP-B07 → GAZECHIME 597508
- TP-B08 → GAZECHIM 01878
- TP-B09 → GAZECHIM 25916
- TP-B10 → GAZECHIM 1807

Si ton URL finale est différente de `https://inerweb.github.io/tp-fluide/`,
régénère les QR : modifier `BASE_URL` dans le script `make_qrcodes.py` et
relancer. L'app lit `?b=TP-B01` donc tant que ce paramètre est préservé,
ça fonctionne.

---

## 🎓 CONFIGURER L'URL DU BACKEND DANS L'APP

Une fois l'Apps Script déployé, configurer l'URL dans l'app :

**Option A — Via la console prof (recommandé)** :
Ouvrir `https://<ton-domaine>/fluide/tp/admin.html`, coller l'URL, cliquer
Enregistrer. (Elle est mémorisée en localStorage sur ce navigateur.)

**Option B — Pour tous les élèves** : il faut qu'ils saisissent l'URL eux-mêmes
via la console navigateur (`localStorage.setItem('tp_api_url', '...')`),
OU modifier en dur dans `app.js` ligne 17 :
```js
apiUrl: localStorage.getItem('tp_api_url') || 'https://script.google.com/macros/s/XXX/exec'
```

---

## 🔄 RÉFÉRENTIEL CAP IFCA

| Code | Compétence                           | Points |
|------|--------------------------------------|--------|
| C1.3 | Identifier un fluide frigorigène     | 7      |
| C3.1 | Utiliser une balance électronique    | 2      |
| C3.4 | Relever une mesure métrologique      | 6      |
| C4.1 | Tenir l'inventaire F-Gas             | 2      |
| C4.2 | Calculer un équivalent CO₂           | 3      |
| **Total** |                                |**20** |

---

## 📞 SUPPORT

Documentation complète : `tp/README.md`
Auteur : F. Henninot — LP Jacques Raynaud, Marseille
