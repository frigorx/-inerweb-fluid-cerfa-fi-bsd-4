# inerWeb TP — Inventaire Bouteilles Fluide

Application pédagogique mobile (PWA) pour la filière **Froid & Climatisation**
du Lycée Jacques Raynaud. Objectif : faire réaliser par les élèves l'inventaire
complet des bouteilles de gaz de l'atelier, avec auto-correction notée selon
le référentiel **CAP IFCA**.

## Flux pédagogique élève (10 min par bouteille)

1. **Login** — prénom + classe (sauvegardé localement)
2. **Scan QR** (caméra) ou saisie `TP-B01` … `TP-B10`
3. **Identification** — marque, n° série, type, capacité, fluide étiquette (menus déroulants)
4. **Manomètre** *(si bouteille sans étiquette ou doute)* — pression BP + T° → fluide déduit
5. **Pesée** — consignes balance + saisie tare gravée + masse brute
   - Écran pédagogique « 📖 Les balances » accessible à tout moment
6. **Calculs** — l'élève calcule **lui-même** :
   - Masse nette = masse brute − tare
   - tCO2eq = masse nette × PRP ÷ 1000
7. **Auto-correction /20** — barème par compétence (C1.3, C2.2, C3.1, C3.4, C4.1, C4.2, C5.2)
8. **Envoi** vers Google Sheet `RELEVES_TP` → auto-validation si score ≥ 80 %
9. **Bilan personnel** — progression 10 bouteilles + moyenne + détail par compétence

## Installation sur téléphone élève

1. Ouvrir l'URL de l'app dans Chrome/Safari : `https://<ton-domaine>/tp/`
2. Menu navigateur → **« Ajouter à l'écran d'accueil »**
3. L'app se lance comme une vraie appli native, fonctionne hors ligne

## Fichiers du projet

```
tp/
├── index.html        Application principale (mono-page)
├── app.js            Logique (navigation, scan, auto-correction, sync)
├── data.js           Vérité terrain : 10 bouteilles + fluides + barème + compétences
├── style.css         Charte inerWeb (#1B3A63 / #E8914A)
├── manifest.json     PWA installable
├── sw.js             Service worker offline
├── admin.html        Console prof (consolidation, export CSV)
├── img/balances/     Schémas balances (Refco extrait du PDF fourni)
└── README.md         Ce fichier
```

## Référentiel CAP IFCA — Compétences évaluées

| Code | Intitulé                             | Axe         | Points max |
|------|---------------------------------------|-------------|------------|
| C1.3 | Identifier un fluide frigorigène      | Analyser    | 7 pts      |
| C3.1 | Utiliser une balance électronique     | Réaliser    | 2 pts      |
| C3.4 | Relever une mesure métrologique       | Réaliser    | 6 pts      |
| C4.1 | Tenir l'inventaire F-Gas              | Maintenir   | 2 pts      |
| C4.2 | Calculer un équivalent CO₂            | Maintenir   | 3 pts      |
| C5.2 | Saisir une donnée numérique           | Communiquer | (implicite) |
| **Total** |                                  |             | **20 pts** |

## Les 10 bouteilles à peser (vérité terrain 2024)

| Code   | Marque    | N° série | Type       | Cap. | Tare (kg) | État       |
|--------|-----------|----------|------------|------|-----------|------------|
| TP-B01 | DHEON     | HHD86    | RECUP      | 27L  | 16.0      | récup 5,5 kg |
| TP-B02 | GAZECHIM  | 513822   | RECUP      | 27L  | 13.2      | récup 4,9 kg |
| TP-B03 | GAZECHIME | 5438     | NEUF       | 12L  | 7.48      | vide       |
| TP-B04 | GAZECHIME | 9496     | NEUF       | 12L  | 8.15      | vide       |
| TP-B05 | GAZECHIME | 7727     | RECUP      | 12L  | 7.23      | vide       |
| TP-B06 | GAZECHIM  | 0672     | TRANSFERT  | 27L  | 13.3      | vide       |
| TP-B07 | GAZECHIME | 597508   | NEUF       | 27L  | 13.3      | en service 1,34 kg |
| TP-B08 | GAZECHIM  | 01878    | TRANSFERT  | 27L  | 13.5      | vide       |
| TP-B09 | GAZECHIM  | 25916    | NEUF       | 12L  | 9.2       | en service 7,1 kg |
| TP-B10 | GAZECHIM  | 1807     | TRANSFERT  | 27L  | 13.4      | vide       |

Les QR codes à coller sont dans `../QRcodes_Bouteilles_TP.pdf` (prendre les
10 premiers, TP-B01 à TP-B10 ; 11-20 sont en réserve pour extension).

---

## 🚀 MISE EN SERVICE (prof — une seule fois)

### Étape 1 — Intégrer l'Apps Script

1. Ouvrir le projet Apps Script lié à la Google Sheet inerWeb (via clasp ou console.cloud.google.com).
2. Créer un nouveau fichier **`releves_tp.gs`** et y copier le contenu de
   `apps-script/releves_tp.gs` (fourni à la racine du repo).
3. Dans `Code.gs`, brancher le routeur — dans **doGet()** et **doPost()**,
   ajouter ces 3 lignes **au début** :
   ```js
   var tpAction = handleReleveTpAction(
     (e.parameter && e.parameter.action) || '',
     e,
     (function(){ try { return JSON.parse(e.postData && e.postData.contents); } catch(_){ return {}; } })()
   );
   if (tpAction !== null) return ContentService.createTextOutput(JSON.stringify(tpAction))
                            .setMimeType(ContentService.MimeType.JSON);
   ```
4. **Deploy → Manage deployments → Edit** → nouvelle version → Deploy.
5. Copier l'URL `/exec` retournée.

### Étape 2 — Configurer l'URL dans l'app

Ouvrir `https://<ton-domaine>/tp/` sur ton téléphone ou PC, ouvrir la console
dev et coller :
```js
localStorage.setItem('tp_api_url', 'https://script.google.com/macros/s/XXX/exec')
```
Ou plus simple : ouvrir `tp/admin.html`, coller l'URL, enregistrer.

### Étape 3 — Déployer sur GitHub Pages

Pousser le dossier `tp/` sur la branche `main` (déjà le cas si le repo Fluide
est sur GitHub Pages). L'URL sera `https://inerweb.github.io/fluide/tp/`
(ou selon ton repo).

### Étape 4 — Coller les QR codes

Imprimer `QRcodes_Bouteilles_TP.pdf` (page A4, 20 étiquettes). Découper les
10 premières et coller sur les bouteilles correspondantes.

### Étape 5 — Première session classe

1. Élèves lancent l'app (écran d'accueil du téléphone après install PWA).
2. Login prénom + classe.
3. Ils scannent une bouteille, font leur travail, auto-correction.
4. Après 10 bouteilles → écran **Bilan** avec note sur 20 et export texte.

### Étape 6 — Consultation prof

Ouvrir `tp/admin.html` → charger les relevés → consolider l'inventaire →
exporter CSV → coller dans la feuille **BOUTEILLES** de inerWeb Fluide.

---

## Barème détaillé par champ

| Champ                     | Compét. | Pts | Tolérance       |
|---------------------------|---------|-----|-----------------|
| Marque                    | C1.3    | 2   | exact           |
| N° série                  | C4.1    | 2   | contient        |
| Type                      | C1.3    | 2   | exact           |
| Capacité                  | C1.3    | 1   | exact           |
| Fluide étiquette          | C1.3    | 2   | exact           |
| Tare lue                  | C3.4    | 2   | ± 100 g         |
| Masse brute pesée         | C3.1    | 2   | ± 200 g         |
| **Masse nette (calcul)**  | **C3.4**| **4** | ± 50 g        |
| **tCO2eq (calcul)**       | **C4.2**| **3** | ± 2 %         |

Les 7 points sur les deux calculs à faire à la main sont là où l'élève fait
vraiment la différence. C'est l'objectif pédagogique.

## Test rapide en local

```powershell
cd C:\Users\henni\OneDrive\Bureau\inerWeb\Fluide\tp
python -m http.server 8000
# → http://localhost:8000
```

Le scan caméra ne fonctionne qu'en HTTPS ou sur `localhost` (restriction navigateur).
En attendant la mise en ligne, la saisie manuelle du code fait le job.

## Hors ligne

L'app fonctionne entièrement hors ligne une fois ouverte une première fois.
Les relevés sont stockés en localStorage et synchronisés automatiquement
dès qu'une connexion Internet est disponible.

---

*LP Jacques Raynaud — F. Henninot — Filière Froid & Climatisation*
