# Changelog inerWeb Fluide

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
