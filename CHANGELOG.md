# Changelog inerWeb Fluide

## [8.0.0-dev] - 2026-07-02 — Ouverture du chantier v8 « Registre opposable »

### 🔒 SÉCURITÉ (correctif immédiat)
- **Clés API retirées du code** (`Code_API_v7.1.0.gs` + `apps-script/Code.gs`) : les 3 clés
  READ/WRITE/ADMIN étaient en clair dans le dépôt public. Lecture désormais exclusive depuis
  les Script Properties (`getApiKey_()`), fonction `setClesAPI_temp()` supprimée.
- ⚠️ **Révocation à faire côté Apps Script** (les anciennes clés restent valides tant que
  `genererClesAPI()` n'a pas été exécutée puis le script redéployé) : procédure dans `SECURITE.md`.

### 🔧 CERFA v7 — correctif de conformité (03/07)
- **Bug corrigé** : le wizard envoyait `CHARGE/MISE_EN_SERVICE/RECUPERATION/TRANSFERT`, le
  générateur testait `Charge/MiseEnService/Recuperation` → **aucune case du cadre 4 cochée**
  et quantités du cadre 11 mal ventilées sur les CERFA du wizard. Table de correspondance
  unique `CERFA_TYPE_NORMALISE`/`CERFA_TYPE_VERS_CASE` (PDF officiel + aperçu HTML).
- Correction métier : récupération simple = « Maintenance » (plus « Démantèlement »).
- **`docs/SPEC-CERFA.md`** : inventaire des **72 champs officiels** (extraits du PDF, MD5
  identique à service-public.gouv.fr), table types↔cases, seuils/fréquences cadre 7, ventilation
  QA→QE cadre 11, cadre 12 transport (UN 1078 / UN 3161, non géré v7 → Phase D), critères
  d'acceptation. Décision Phase D : l'aperçu à l'écran = le PDF officiel rempli (PDF.js).

### ✅ Phase B — Registre vivant (03/07)
- **Store** : mutations complètes (machines, bouteilles + pesée, contrôles, mouvements) ;
  cycle brouillon → soumis → validé ; **écritures validées figées** (correction uniquement par
  **contre-écriture** liée) ; **hash SHA-256 chaîné** + `verifierChaineHash()` ; journal d'audit
  append-only ; numérotation FORM-/FI- séparée ; règles métier (anti-croisement de fluides,
  bornes de charge/masse, un élève ne valide jamais) ; outillage (détecteurs/balance).
- **Wizard « Nouveau mouvement » 6 étapes** (Type/Technicien · Machine · Bouteille · Pesées ·
  Contrôle/Détecteur · Signature) : filtrage par compatibilité fluide, quantité calculée en
  direct, alerte détecteur expiré, signature manuscrite (canvas tactile), récapitulatif.
- **Formulaires** : création/édition machine, bouteille (+ pesée dédiée), contrôle d'étanchéité
  (fuite → localisation + réparation immédiate).
- **Qualité** : répartition Fable (cœur métier, wizard, intégration) / Sonnet (formulaires,
  signature) ; 6 corrections d'intégration (dont 1 bug bloquant de rafraîchissement) ;
  **74 vérifications automatisées vertes** (27 + 36 + chargement + scénario de bout en bout) ;
  parcours complet vérifié dans le navigateur (FORM-2026-0001 : M1 4,20→4,50 kg,
  B-03 3,6→3,3 kg, chaîne de hash intacte, audit tracé).
- Reste Phase C : conformité (personnel, outillage complet, pièces jointes, balance matière).

### ✅ Phase A — Socle v8 livré (dossier `v8/`, démo : `…/v8/`)
- **Coquille** fidèle à la maquette : sidebar marine dégradée (logo, 9 sections, badge d'alertes,
  bouton Sauvegarde + état), header (fil d'ariane, badge « DÉMO / FORMATION », avatar), routeur
  par ancre, tiroir mobile < 900 px, IBM Plex Sans / Space Grotesk / IBM Plex Mono, icônes SVG
  linéaires (zéro emoji).
- **Couche données** : contrat `DataStore` unique (prêt pour Local/Cloud en Phases E/F),
  `DemoStore` avec persistance localStorage + **export/restauration JSON fonctionnels** (modale
  Sauvegarde), monde de démonstration fidèle à la maquette (6 machines, 5 bouteilles,
  7 mouvements, 3 contrôles, 9 fluides GWP AR4, 4 alertes ; stats calculées : 16,0 kg en charge,
  31,0 kg de stock, 29,2 t éq. CO₂).
- **9 vues en lecture** : tableau de bord, parc machines, stock bouteilles, mouvements,
  contrôles, statistiques, bilan annuel (**export CSV fonctionnel** + impression), fluides,
  administration (lecture seule).
- **Qualité** : 12 agents, relecture d'intégration, `node --check` 18/18, 61 vérifications
  automatisées vertes (tests données + chargement des modules), vérification visuelle contre
  la maquette (bureau + mobile).
- Reste Phase B : wizard de mouvement, création/édition, verrouillage + contre-écritures.

### 📐 Fondations v8 (pas encore de code applicatif)
- `docs/SPEC-V8.md` : spécification consolidée — 3 modes (Démo GitHub Pages / Local Lycée
  portable Node+SQLite / Cloud Supabase), modèle de données « registre opposable » issu de
  l'audit métier du 02/07 (dossier opérateur, registre personnel, outillage réglementaire,
  bouteilles et mouvements enrichis, contre-écritures + hash chaîné, balance matière annuelle,
  chaîne BSFF, pièces jointes, dossier audit annuel en un clic), correspondance unique
  types ↔ cases CERFA, alertes bloquantes, phasage A→F.
- `design/DESIGN-TOKENS.md` : charte extraite de la maquette Claude Design validée
  (IBM Plex Sans / Space Grotesk / IBM Plex Mono, marine #0e2a47, turquoise #12b5c9,
  12 vues de référence).
- Documentation de diffusion : `README.md`, `LICENSE` (MIT), `INSTALLATION_SIMPLE.md`,
  `INSTALLATION_CLOUD.md`, `SAUVEGARDE.md`, `SECURITE.md`, `RGPD.md`.
- Socle technique : `server/schema.sql` (modèle v8 complet), `server/db.js` (node:sqlite),
  `server/serveur.js` (squelette), `lancer-inerweb.bat`, `.env.example`, `.gitignore`.

## [7.10.0] - 2026-05-18 (nuit) — P2 livré

### 🔗 Clients ↔ Machines bidirectionnel
- **Carte machine** : chip bleu cliquable « 🤝 Nom du client » qui ouvre la liste des machines de ce client
- **Admin → Clients** : nouvelle colonne « 🏭 N machine(s) » cliquable → modale détail
- **Nouvelle modale** `showClientMachines(clientId)` : liste compacte des équipements d'un client avec accès direct à la fiche détail (mouvements + contrôles + CERFAs)

### 🔇 UX silencieuse
- Bouton principal du dashboard reformulé « ➕ Nouvelle intervention → CERFA » (plus parlant, lien explicite avec le livrable réglementaire)
- Hiérarchie 3 niveaux + Calibri 14 pt + bleu/orange respectés partout

### 📊 Suivi machines (existait déjà — vérifié)
- `calcProchainControle()` + `getFrequenceControle()` calculent automatiquement la prochaine échéance F-Gas selon teqCO2/famille (HFC, HCFC, HFO)
- Carte machine : indicateur rouge si contrôle dépassé
- `openDetailModal('machine')` : historique mouvements + contrôles + CERFAs liés

## [7.9.0] - 2026-05-18 (soirée)

### 🧙 Wizard CERFA enrichi — 6 étapes au lieu de 5
Nouvelle étape **5 « Contrôle d'étanchéité + Détecteur »** insérée entre Pesées et Signature. Le wizard couvre désormais TOUS les cadres du CERFA 15497*04 :
- **Cadre 5 — Détecteur** : menu déroulant depuis Admin → Détecteurs (alerte ⚠ EXPIRÉ si étalonnage échu)
- **Cadre 6 — Détection permanente** : auto depuis la fiche machine (OUI/NON)
- **Cadre 10 — Résultat contrôle** : 3 boutons (Sans objet / Conforme / Fuite) ; si Fuite → 3 lignes localisation + cases « Réparée »
- **Cadre 13 — Destination + BSFF** : affiché uniquement si Récupération/Vidange (champ obligatoire)
- **Cadre 14 — Observations** : commentaire libre étape 6

### 📱 Étiquettes QR imprimables (module `qr-print.js`)
- Boutons orange « 📱 QR » sur chaque **carte machine**, **carte bouteille** et **ligne détecteur** (admin)
- Étiquette format **50 × 70 mm** : QR (35 mm) + code Trebuchet bold + détails Calibri
- Bouton « Imprimer les QR codes » → planche **A4 grille 3×2** (6 étiquettes par page)
- QR pointe vers URL absolue GitHub Pages avec paramètre (`?machine=...`, `?bouteille=...`, `?detecteur=...`)
- Lib **qrcodejs 1.0.0 (davidshimjs)** embarquée localement (offline OK)

### 🔧 Technique
- `state.js` : `wizardNext()` autorise 6 étapes au lieu de 5
- `ui.js` : libellé bouton « Valider » à l'étape 6
- `index.html` : 6e onglet « Contrôle » dans le bandeau wizard ; scripts `qrcode-lib.min.js` + `qr-print.js`
- `sw.js` : cache v7.9.0 incluant les nouveaux assets

## [7.8.0] - 2026-05-18

### 📄 CERFA — Aperçu HTML lisible + PDF officiel à un clic
- **Nouveau** : `CERFA.ouvrir()` affiche désormais un **aperçu HTML** lisible (cadres 1-14 numérotés, cases ☐/☒, mise en page proche du formulaire officiel imprimable) → on voit enfin le contenu à l'écran sans télécharger.
- **Bouton « 📑 PDF officiel »** dans la modale d'aperçu → bascule vers le vrai CERFA officiel ministère rempli via pdf-lib (pour archivage et signature réglementaire).
- **Préremplissage** : l'aperçu pioche dans `State.config` (établissement, SIRET, attestation, intervenant) et la machine sélectionnée. Le bouton « Aperçu CERFA » du tableau de bord passe maintenant une intervention exemple (Maintenance, 0,5 kg) pour montrer le rendu cases cochées.
- **API CERFA** :
  - `CERFA.ouvrir(data)` → aperçu HTML (nouveau défaut)
  - `CERFA.ouvrirPDF(data)` → PDF officiel directement (modale PDF.js)
  - `CERFA.imprimer(data)` → aperçu HTML + impression
  - `CERFA.telecharger(data)` → téléchargement direct du PDF officiel
- Labels boutons mis à jour : « CERFA 15497*04 (PDF officiel) » → « CERFA 15497*04 — Aperçu »

## [7.7.0] - 2026-05-18

### 📄 Visualiseur CERFA universel (PDF.js)
- **PDF.js 3.11.174** embarqué localement (`js/pdf.min.js` + worker) → fonctionne hors-ligne
- **Rendu canvas** garanti sur tous navigateurs : Safari iOS, Android, PC, Mac
- **Corrige** : sur Safari iOS / certains navigateurs mobiles, l'iframe affichait le code source du PDF au lieu du document — désormais le PDF s'ouvre dans une modale plein écran
- **Zoom −/+** (50 % → 400 %) dans la barre d'outils de la modale
- **Boutons** : 🖨️ Imprimer · ⬇️ Télécharger · ↗ Onglet · ✖ Fermer · Esc pour fermer
- **Confirmation** : le PDF `cerfa_15497-04_officiel.pdf` du repo est bien le document officiel (MD5 identique à service-public.gouv.fr) — depuis la révision *04 (juillet 2024), le CERFA tient sur 1 seule page (format compact ministère)

### 🔧 Technique
- `cerfa.js` : nouvelle méthode `_loadPdfJs()` (lazy load) + `_renderPdfInContainer()` (canvas par page)
- `_showInModal()` réécrit : reçoit les bytes du PDF en plus de l'URL pour rendu canvas
- `sw.js` : cache `pdf.min.js` et `pdf.worker.min.js`, bump `inerweb-fluide-v7.7.0`

## [7.1.0] - 2026-03-07

### 🎨 Charte graphique officielle
- **Logo inerWeb Fluide** : SVG officiel avec ❄️ + "iner" (Trebuchet bold) + "Web" (script) + cartouche orange
- **Couleurs** : `#1b3a63` (bleu marine) / `#e8914a` (orange) conformes à la charte inerWeb
- **Header** : Logo compact sur fond bleu, badge mode animé, infos utilisateur

### 📱 Responsive Design complet
- **Mobile-first** : CSS Variables, breakpoints à 640px, 1024px, 1280px
- **Grilles adaptatives** :
  - Mobile : 1 colonne
  - Tablette : 2-3 colonnes  
  - Desktop : 3-4 colonnes
- **Navigation** : Barre horizontale scrollable tactile
- **Modales** : Bottom-sheet sur mobile, centrées sur desktop
- **Touch targets** : Minimum 44px pour tous les éléments interactifs

### 🖼️ Interface utilisateur
- **Dashboard** : Cartes stats avec accent gradient, alertes stylisées
- **Machines** : Cartes avec icônes métier (❄️🌡️💨), statuts colorés
- **Bouteilles** : Niveau de remplissage visuel, catégories colorées (Neuve/Transfert/Récup)
- **Wizard mouvement** : 5 étapes avec progression visuelle, signature canvas
- **Pesées** : Interface intuitive avec calcul automatique
- **CERFA** : Aperçu vert officiel avec filigrane mode
- **Toasts** : Notifications animées

### 🔧 Architecture frontend
- **api.js** : Module de communication API avec gestion erreurs
- **state.js** : Gestion centralisée de l'état applicatif
- **ui.js** : Rendu dynamique des vues et composants
- **wizard.js** : Assistant de création mouvement complet
- **app.js** : Initialisation et bindings événements

### 📦 PWA
- **manifest.json** : Configuration PWA avec thème inerWeb
- **sw.js** : Service Worker pour support hors-ligne
- **Icons** : Placeholders 192x192 et 512x512

---

## [7.0.0] - 2026-03-07

### LOT 15 : Statistiques avancées
- `apiGetStatsAvancees_()` avec mouvements, contrôles, parc, opérateurs, tendances 12 mois
- Route GET `getStatsAvancees`

### LOT 16 : Multi-site / Multi-atelier
- Onglets SITES et ATELIERS
- Filtrage par siteId sur toutes les entités
- Routes `getSites`, `getAteliers`, `createSite`, `createAtelier`

### LOT 17 : Modèle utilisateur enrichi
- Onglet USERS (13 colonnes)
- Attestations avec catégories 2008 et 2025
- Route `createUser`

### LOT 18 : Durcissement réglementaire
- `verifierAttestation_()` avec seuils ALERTE/CRITIQUE/BLOQUANT
- Blocage mode OFFICIEL si attestation expirée
- Création automatique incident si fuite
- Route `getAlertesReglementaires`

### LOT 19 : Moteur d'export pro
- Types : registre, bilanAnnuel, conformiteReglementaire, declarationAnnuelle, historiqueComplet
- Données ADEME par fluide
- Route `exportPro`

### LOT 20 : Abstraction backend
- Interface DataStore pour préparation migration
- Toutes opérations DB via DataStore

---

## [6.3.0] - 2026-03-07

### LOT 11 : Login réel
- Vérification identifiant dans TECHNICIENS
- Génération token session
- Permissions par rôle

### LOT 12 : Audit enrichi
- Onglet AUDIT_LOG avec IP, userAgent, durée
- Rotation automatique > 10000 lignes
- Route `getAuditLog` et `getAuditStats`

### LOT 13 : CERFA normé
- Numérotation FI-YYYY-XXXXX / FORM-YYYY-XXXXX
- Onglet INDEX_CERFA
- PDF dans Drive avec nomFichier standardisé

### LOT 14 : Modes Formation/Officiel
- Filigrane "FORMATION" sur documents
- Préfixes distincts
- Validation enseignant requise en formation

---

## [6.2.1] - 2026-03-07

### LOT 9 : Optimisation I/O
- Batch reads/writes avec getRange().getValues()
- Cache configuration 6h
- Index en mémoire pour recherches

### LOT 10 : Version centralisée
- Constante VERSION unique
- Route `ping` avec version
- Headers de réponse avec version

---

## [6.2.0] - 2026-03-07

### LOT 4-8 : Sécurité et refactoring
- Validation stricte des entrées
- Gestion transactionnelle avec rollback
- Refactoring fonctions utilitaires
- Tests de non-régression

---

## [6.1.0] - 2026-03-07

### LOT 1-3 : Workflow mouvements
- Workflow BROUILLON → EN_ATTENTE → VALIDE
- Validation enseignant avec date/heure
- Mise à jour stocks machines et bouteilles
- Anti-croisement fluides

---

## [6.0.0] - 2026-03-06

### Migration architecture
- Passage de Go/SQLite à Google Sheets + Apps Script
- 15 onglets de données
- API REST complète
- PWA frontend

---

*inerWeb Fluide - Traçabilité F-Gas & CERFA 15497*04*
*Lycée Professionnel Jacques Raynaud, Marseille*
