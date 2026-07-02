# SPEC inerWeb Fluide v8 — « Registre opposable »

> Source de vérité du chantier v8. Consolidé le 02/07/2026 à partir de :
> 1. la maquette Claude Design validée par Franck (voir `design/DESIGN-TOKENS.md`) ;
> 2. l'audit métier/conformité d'un expert F-Gas (note actuelle 6,5/10, potentiel 9/10) ;
> 3. le cadrage « 3 modes » de Franck (02/07/2026).

## 1. Vision

Passer de « je fais des mouvements et je génère des CERFA » à :
**« je tiens un registre réglementaire complet, traçable, justifiable, vérifiable,
exportable, avec pièces justificatives et balance matière »**.

- Publics : enseignants/référents (pilotage), élèves (mode formation), professionnels (usage réel).
- Diffusion gratuite aux lycées professionnels froid/clim — vitrine pour le lycée Jacques Raynaud (Marseille).
- Phrase-objectif côté audit : *« En un clic, je sors le dossier annuel complet de traçabilité fluides. »*
- Échéance réglementaire structurante : arrêté du 21/11/2025, obligatoire au 01/01/2027
  (nouvelle grille de catégories, vérification outillages, registre du personnel, fiches d'intervention,
  gestion des fluides récupérés). L'arrêté du 30/06/2008 est abrogé au 31/12/2026.

## 2. Les trois modes d'utilisation

Un seul code, une couche données à adaptateurs. Le mode est déterminé au démarrage.

### 2.1 Mode Démo (GitHub Pages)
- Données fictives uniquement (jeu de démo embarqué), persistance navigateur (localStorage/IndexedDB).
- Aucun secret, aucun serveur, aucun mode officiel réel.
- Filigrane permanent « DÉMO / FORMATION » (bannière + filigrane sur tous les documents générés).
- Sert de vitrine et de bac à sable pédagogique immédiat.

### 2.2 Mode Local Lycée (recommandé pour un établissement)
- Application **portable** : dossier à copier, lancement par double-clic `lancer-inerweb.bat`.
- Serveur Node.js local (localhost uniquement), zéro dépendance native :
  SQLite via le module intégré `node:sqlite` (Node ≥ 22).
- Arborescence de données à côté de l'app :
  - `data/` : base SQLite (`inerweb-fluide.db`) ;
  - `documents/` : pièces justificatives (PDF, photos), nommage horodaté ;
  - `backups/` : sauvegardes ZIP complètes (base + documents + config).
- Assistant de première configuration (établissement, attestation de capacité, comptes).
- Comptes utilisateurs et rôles (ADMIN / REFERENT / ENSEIGNANT / ELEVE), mot de passe haché (scrypt).
- Modes FORMATION et OFFICIEL strictement séparés (cf. §7.4).
- Sauvegarde complète en un clic, restauration en un clic (cf. `SAUVEGARDE.md`).

### 2.3 Mode Cloud Lycée (optionnel)
- PostgreSQL/Supabase (projet UE), authentification Supabase Auth, RLS par établissement.
- Stockage documents séparé (Supabase Storage, bucket privé).
- Sauvegarde automatique planifiée + export local possible à tout moment.
- Multi-utilisateurs simultanés (multi-postes atelier).
- Configuration par `.env` (jamais commité ; `.env.example` fourni).

## 3. Architecture technique

- **Front unique** : HTML/CSS/JS natif (modules ES), sans framework ni bundler — même philosophie
  que la v7/HAL, maintenable par un enseignant. PWA (offline en démo/local).
- **Couche données** : interface `DataStore` unique (contrat commun), 3 adaptateurs :
  `DemoStore` (mémoire + localStorage), `LocalStore` (API REST du serveur local → SQLite),
  `CloudStore` (Supabase JS). Le front ne connaît que le contrat.
- **Serveur local** (mode 2) : Node.js pur (http natif), API JSON REST, servie sur `http://localhost:2011`,
  écoute 127.0.0.1 uniquement. Sert aussi les fichiers statiques du front.
- **Génération CERFA** : pdf-lib (déjà éprouvé en v7) pour remplir le **PDF officiel**
  `cerfa_15497-04_officiel.pdf` (MD5 identique à service-public.gouv.fr) + **aperçu HTML fidèle**
  au formulaire (cadres 1-14, cases ☐/☒) pour l'écran. L'aperçu écran reproduit le document officiel ;
  l'impression/archivage passe par le PDF officiel rempli — c'est lui la référence « au pixel près ».
- **Arborescence cible du dépôt** :

```
/                     ← v8 (racine = ce qui est servi par GitHub Pages en mode démo)
  index.html
  css/                ← tokens + styles (design maquette)
  js/
    core/             ← state, router, utils, règles métier (balance, échéances, mapping CERFA)
    data/             ← datastore.js (contrat) + demo-store.js + local-store.js + cloud-store.js
    views/            ← une vue = un module (dashboard, machines, bouteilles, mouvements,
                        controles, stats, bilan, fluides, personnel, outillage, dechets, admin, audit)
    cerfa/            ← aperçu HTML fidèle + remplissage pdf-lib
  server/             ← serveur local Node (mode 2) : api.js, db.js, schema.sql, backup.js
  lancer-inerweb.bat
  .env.example
  docs/               ← SPEC-V8.md (ce fichier), guides
  design/             ← DESIGN-TOKENS.md, captures maquette
  legacy-v7/          ← ancienne app v7 (référence, gelée)  [déplacement à faire]
```

- **Règle d'or** : brancher le neuf avant de retirer l'ancien. La v7 reste fonctionnelle
  (GitHub Pages actuel) tant que la v8 n'est pas validée.

## 4. Design (maquette validée)

Voir `design/DESIGN-TOKENS.md` (palette exacte, polices, dégradés, composants).
Points structurants :
- Sidebar sombre marine `#0e2a47` (dégradé `#163c61 → #0e2a47`), logo « inerWeb Fluide — TRAÇABILITÉ F-GAS ».
- Accent turquoise `#12b5c9` (dégradé boutons `#19c3d6 → #0e93a3`).
- Polices : **IBM Plex Sans** (corps), **Space Grotesk** (titres/chiffres KPI), **IBM Plex Mono** (valeurs kg, codes).
- Fini les emojis d'interface → icônes SVG (traits, style linéaire).
- Statuts par pastilles : Conforme (vert `#16a34a`/`#dcfce7`), Fuite (rouge `#dc2626`/`#fee2e2`),
  Contrôle dû (ambre `#b45309`/`#fef3c7`), Récupération (violet `#7c3aed`/`#f3e8ff`).
- Bouton « Sauvegarde » + indicateur « Enregistré à l'instant » en permanence dans la sidebar.
- Badge de mode visible en permanence : « Mode Formation » (ambre) / « Mode Officiel » (vert) / « DÉMO ».
- Français **accentué partout** (l'écran d'accueil v7 sans accents est un défaut identifié).
- Responsive : sidebar → barre repliable < 900 px ; grilles 1 colonne sur mobile.

## 5. Modèle de données v8 (issu de l'audit)

Conventions : `id` texte préfixé (MAC-, BTL-, MVT-, CTL-, PER-, OUT-, BSFF-, PJ-), horodatage ISO,
`etablissement_id` partout (multi-site prêt). Champs ⚿ = requis pour l'audit.

### 5.1 Dossier opérateur / établissement (NOUVEAU)
⚿ raison sociale, SIRET, adresse, **n° attestation de CAPACITÉ** (établissement),
organisme certificateur (Socotec, Bureau Veritas, SGS, Qualiclimafroid…), date délivrance,
date d'échéance (alerte auto), catégories autorisées (grilles 2008 ET 2025), activités autorisées
(mise en service, maintenance, contrôle, récupération, démantèlement), sites couverts,
PDF de l'attestation (pièce jointe), dernier audit, prochain audit, non-conformités, actions correctives.
> Séparation stricte : attestation de **capacité** = établissement ; attestation d'**aptitude** = personne.

### 5.2 Registre du personnel (ENRICHI)
⚿ nom, prénom, type de personne (salarié / enseignant / élève / sous-traitant / intervenant extérieur),
rôle applicatif (voir / saisir / valider / administrer / officiel), n° attestation d'APTITUDE individuelle,
organisme délivreur, date obtention, date limite / remise à niveau, catégorie 2008, catégorie 2025,
activités autorisées, scan PDF de l'attestation, statut actif/inactif, signature (image), email.
> Un élève = mode formation uniquement, jamais officiel autonome.
> Terminologie : ne plus dire « opérateurs habilités » → « personnes autorisées à intervenir dans
> l'application : techniciens titulaires d'une attestation d'aptitude, enseignants référents,
> élèves en mode formation ».

### 5.3 Outillage réglementaire (NOUVEAU — remplace « détecteurs » seuls)
Types : station de récupération, station de charge, balance, détecteur de fuite, pompe à vide,
manifold/manos, thermomètre/sonde, bouteille de récupération, flexible avec vannes,
raccords spécifiques (A2L/CO₂/HC), EPI, autre.
⚿ type, marque, modèle, n° série, site/atelier, précision (balance), sensibilité (détecteur),
date vérification/étalonnage, prochaine échéance, certificat PDF (pièce jointe),
statut (conforme / à vérifier / expiré / hors service).
> Blocage du mode officiel si balance ou détecteur requis est expiré.

### 5.4 Machines / équipements (ENRICHI)
⚿ code interne, désignation, type, marque, modèle, n° série, localisation, détenteur/propriétaire (client),
fluide, charge nominale kg, charge actuelle kg, PRG/GWP, tCO₂eq calculée, date mise en service,
détection permanente O/N (avec justification si fréquence doublée), fréquence contrôle calculée,
dernier contrôle, prochain contrôle, plaque F-Gas générée, photo plaque signalétique (PJ),
statut (en service / arrêté / démantelé), historique complet des interventions.

### 5.5 Bouteilles (ENRICHI)
⚿ code interne, **n° bouteille réel**, QR interne, type (neuve / récupération / transfert / déchet),
fluide, état du fluide (vierge / récupéré / recyclé / régénéré / déchet / douteux / mélange),
tare, masse brute actuelle, **masse nette calculée**, contenance max, propriétaire
(fournisseur / établissement / consignation), n° lot, date d'entrée en stock, date dernière pesée,
utilisateur ayant pesé, statut (en stock / en service / vide / à retourner / retournée / déchet / bloquée),
n° BL / facture (PJ), bon de reprise (PJ), n° BSFF si déchet, date retour fournisseur,
date épreuve/réépreuve (bouteilles de récupération), **date limite de garde du fluide récupéré**
(tolérance : 1 an après la dernière intervention pour les fluides non réutilisables).

### 5.6 Mouvements (ENRICHI + VERROUILLÉ)
⚿ n° unique, date/heure, mode (FORMATION/OFFICIEL), **type réglementaire normalisé** (cf. §7.1),
cause (fuite, maintenance, remplacement compresseur, mise au rebut, exercice pédagogique…),
machine concernée (source ET destination si transfert), bouteille source, bouteille destination,
fluide, pesée avant, pesée après, quantité calculée, sens du mouvement,
quantités séparées : chargée / récupérée / cédée / retournée fournisseur / détruite-régénérée-recyclée,
origine fluide (bouteille neuve / bouteille récupérée / autre équipement),
destination fluide (machine / bouteille récup / fournisseur / déchet),
technicien, **validateur** (référent — obligatoire en lycée), CERFA lié, BSFF lié,
pièce justificative (PDF/photo pesée), observation,
statut : **brouillon → soumis → validé → (annulé par contre-écriture)**,
**hash d'écriture** (empreinte SHA-256 chaînée au hash précédent → registre inviolable).
> **Une écriture validée n'est JAMAIS modifiée ni effacée.** Toute correction passe par une
> **contre-écriture** de régularisation qui référence l'écriture d'origine.

### 5.7 Contrôles d'étanchéité (ENRICHI)
⚿ type de contrôle (périodique / non périodique / après réparation / mise en service),
machine, date, charge en kg au moment du contrôle, PRG utilisé, tCO₂eq calculée (déclenche la fréquence),
méthode (directe / indirecte, détaillée), détecteur utilisé (lien outillage, n° série),
validité étalonnage détecteur (blocage si expiré), résultat, localisation précise de la fuite,
gravité / partie concernée (raccord, vanne, brasure, échangeur), réparation immédiate O/N,
date réparation prévue, contrôle après réparation (lié), prochain contrôle calculé, opérateur, CERFA lié.

### 5.8 Déchets / BSFF (NOUVELLE CHAÎNE COMPLÈTE)
Chaîne : récupération → stockage bouteille récup → décision (réutilisable / à analyser / déchet)
→ si déchet : BSFF → enlèvement / retour fournisseur → masse réellement remise → justificatif → sortie du stock.
⚿ statut fluide récupéré, décision prise par qui + date, n° BSFF (lié au stock, pas seulement au CERFA),
transporteur/collecteur, installation destination, masse remise, date remise, preuve PDF / lien Trackdéchets.

### 5.9 Pièces jointes (NOUVEAU — généralisé)
Table unique `pieces_jointes` : id, entité liée (type + id), catégorie (attestation, certificat,
facture, BL, bon de reprise, BSFF, photo pesée, plaque signalétique, rapport, autre), nom fichier,
chemin/stockage, taille, hash SHA-256, date d'ajout, ajouté par.
> Tout objet important doit pouvoir porter des preuves. Sans pièces jointes on reste dans le déclaratif.

### 5.10 Journal d'audit (RENFORCÉ)
Append-only : qui, quoi, quand, avant/après (JSON), IP/poste, résultat.
Non modifiable et non supprimable depuis l'application (aucune route de purge).
Export CSV/PDF pour le dossier annuel.

## 6. Bilan matière annuel par fluide (LE cœur audit — NOUVEAU)

Écran + export, pour chaque fluide et chaque année :

```
Stock début (neuf + récupéré)
+ achats
+ récupérations
- charges
- cessions
- retours fournisseur
- destructions / régénérations
= stock théorique fin
```

Comparé au **stock réel pesé au 31/12** (module d'inventaire physique).
`Écart = stock réel - stock théorique` → si écart ≠ 0, **justification obligatoire** (saisie bloquante).
Colonnes : fluide, stock initial neuf, stock initial récupéré, achats, récupéré, chargé, cédé,
retourné fournisseur, détruit/régénéré, stock théorique, stock réel, écart.

## 7. Règles métier réglementaires

### 7.1 Table de correspondance UNIQUE types ↔ cases CERFA
Un seul module `js/core/cerfa-mapping.js`, utilisé PAR le wizard ET PAR le générateur
(le bug v7 identifié : wizard envoie `CHARGE/RECUPERATION/TRANSFERT/MISE_EN_SERVICE`,
générateur attend `Charge/Appoint/MiseEnService/Recuperation/Vidange` → cases non cochées).

| Type interne v8            | Case CERFA cadre 4                  |
|----------------------------|-------------------------------------|
| MISE_EN_SERVICE            | Mise en service                     |
| CHARGE_APPOINT             | Entretien/réparation (appoint)      |
| RECUPERATION_MAINTENANCE   | Entretien/réparation (récupération) |
| RECUPERATION_DEMANTELEMENT | Démantèlement                       |
| CONTROLE_PERIODIQUE        | Contrôle d'étanchéité périodique    |
| CONTROLE_NON_PERIODIQUE    | Contrôle d'étanchéité non périodique|
| ASSEMBLAGE                 | Assemblage                          |
| MODIFICATION               | Modification / transformation       |
| TRANSFERT                  | (pas de CERFA machine — registre)   |

Fuite : champs détaillés réparée / non réparée (cadre 10) avec localisations.

### 7.2 Alertes critiques (bloquantes visuellement)
Critiques : attestation capacité expirée · attestation aptitude technicien expirée ·
détecteur étalonnage expiré · balance sans contrôle valide · contrôle d'étanchéité dépassé ·
fluide récupéré stocké > délai de garde · écart de stock non justifié.
Importantes : bouteille sans pesée récente · CERFA non signé · mouvement non validé.
> Les critiques bloquent le mode OFFICIEL pour l'opération concernée.

### 7.3 Aide catégories 2008/2025
Encart d'aide : « Catégorie 2008 : utilisée jusqu'au 31/12/2026. Catégorie 2025 : nouvelle grille
obligatoire à partir du 01/01/2027. » Les deux champs coexistent sur la période transitoire.

### 7.4 Mode Formation blindé
- Filigrane visuel énorme sur PDF ET aperçu :
  « MODE FORMATION — DOCUMENT NON OFFICIEL — NE PAS UTILISER POUR UNE INTERVENTION RÉELLE ».
- Numérotation distincte (FORM-YYYY-XXXXX vs FI-YYYY-XXXXX).
- Un élève ne peut jamais produire un document d'apparence officielle.
- Validation enseignant requise pour tout mouvement en formation.

### 7.5 Export « Dossier audit annuel » (un clic)
ZIP contenant : attestation capacité (PDF) · registre personnel + attestations aptitude (PDF/Excel) ·
registre outillage + certificats (PDF/Excel) · inventaire bouteilles au 01/01 et au 31/12 (Excel) ·
mouvements de l'année (Excel) · CERFA de l'année (PDF groupé) · contrôles d'étanchéité (Excel/PDF) ·
BSFF / bons de reprise (PDF) · balance matière par fluide (Excel/PDF) · écarts et justifications (PDF) ·
journal d'audit logiciel (CSV/PDF).
+ Vue « audit en 5 minutes » : tout ce que l'auditeur demande, sur une page.

## 8. Sécurité

- **Incident clés API v7 (02/07/2026)** : 3 clés (READ/WRITE/ADMIN) en clair dans le dépôt public
  (`Code_API_v7.1.0.gs` + `apps-script/Code.gs` + historique git). Patch appliqué localement
  (suppression des clés en dur). **Révocation côté Apps Script indispensable** : voir `SECURITE.md`.
- Aucune clé/secret dans le dépôt. `.env` ignoré, `.env.example` fourni. `.gitignore` couvre
  `data/`, `documents/`, `backups/`, `.env*` (sauf example).
- Aucune donnée réelle dans GitHub (le mode démo n'utilise que le jeu fictif).
- Mode officiel avec données réelles interdit sur l'hébergement public de démo.
- Mots de passe : hachage scrypt (node:crypto), jamais en clair.
- Journalisation des connexions et actions admin (journal d'audit).
- Sauvegardes : ZIP complet (base + documents + config), chiffrement AES-256-GCM optionnel
  par phrase de passe, redondance recommandée (disque local + clé USB + cloud établissement).
- RGPD : voir `RGPD.md` (données minimales, UE si cloud, droits, durées de conservation).

## 9. Phasage

- **Phase A — Socle** : arborescence v8, tokens CSS, coquille (sidebar/header/router),
  DataStore + DemoStore + jeu de démo, dashboard. Legacy v7 déplacée dans `legacy-v7/`.
- **Phase B — Registre** : machines, bouteilles, mouvements (verrouillage + contre-écritures + hash),
  wizard, contrôles, fluides.
- **Phase C — Conformité** : dossier opérateur, personnel, outillage, pièces jointes,
  déchets/BSFF, balance matière + inventaire 31/12, alertes bloquantes.
- **Phase D — Documents** : CERFA (aperçu fidèle + PDF officiel), plaque F-Gas, exports,
  dossier audit annuel.
- **Phase E — Mode Local** : serveur Node + SQLite, comptes, sauvegardes ZIP un clic,
  assistant première configuration, `lancer-inerweb.bat`.
- **Phase F — Mode Cloud** : adaptateur Supabase, auth, storage, RLS, sauvegarde auto.
- Chaque phase : tests + vérification visuelle + entrée CHANGELOG.

## 10. Décisions ouvertes / à confirmer par Franck

1. Nom/emplacement du dépôt final (l'actuel s'appelle `-inerweb-fluid-cerfa-fi-bsd-4` — un dépôt
   propre `inerweb-fluide` serait plus crédible pour la diffusion ; l'URL de démo changerait).
2. Licence : MIT proposée par défaut (diffusion libre la plus simple) — à confirmer.
3. Mode Cloud : création du projet Supabase (compte de l'établissement ou personnel).
4. Migration des données réelles v7 (Google Sheets) : à planifier en fin de Phase E.
