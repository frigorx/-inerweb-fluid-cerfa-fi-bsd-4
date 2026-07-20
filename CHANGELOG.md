# Changelog inerWeb Fluide

## [8.0.0-dev] - 2026-07-02 — Ouverture du chantier v8 « Registre opposable »

### 🧱 CM-1 (cycle matière) — module pur « avoir de fluide par machine d'origine » (20/07)
- **Chantier cycle matière REFONDU après correction métier de Franck** (frigoriste) :
  le fondement de l'audit externe (« interdire la charge depuis récupéré + table de
  traitement WORM comme passage obligé ») était **FAUX** pour le réemploi en maintenance.
  Règle réelle = **conservation par machine d'origine** — on réintroduit dans une machine
  M au plus le fluide récupéré DE M ; tout complément est du fluide **acheté** (vierge,
  ou recyclé/régénéré certifié fournisseur — le régénéré s'INTÈGRE, jamais produit en
  interne). Surcharge = anomalie SIGNALÉE, forçable, CERFA « forcé manuellement » + erreur
  à rectifier. Plan refondu = `docs/PLAN-P0-3-4-CYCLE-MATIERE.md`.
- **Nouveau module PUR `v8/js/data/avoir-origine.js`** (patron `vie-bouteille.js`) :
  `avoirParMachineOrigine` / `avoirOrigineDisponible` **DÉRIVENT** l'avoir de fluide par
  machine d'origine dans une bouteille depuis les mouvements opposables (VALIDE, hors
  contre-écritures) — **aucune migration, aucune colonne, rien de nouveau stocké** (la
  vérité opposable reste les mouvements déjà scellés ; leçon « élaguer plutôt qu'empiler »).
  Transfert ignoré en V1 (brouille l'origine), net négatif borné à 0.
- **Suite `test-avoir-origine.mjs`** (13 vérifs : volet pur — crédit/débit, multi-origines,
  contre-écritures et brouillons exclus, transfert, net négatif — + parcours DemoStore réel
  mise en service → récupération → réemploi). **TOUT VERT — 88 exécutions.**

### 🔒 P1-6 — base vive REFUSÉE sous OneDrive/Drive/Dropbox (reprise RC 8.1) (20/07 soir)
- **3ᵉ brique piochée dans la RC ChatGPT 8.1.0-rc.1** — LES 3 BRIQUES
  AUTONOMES DE LA RC SONT REPRISES (P1-5, P2-3, P1-6). L'ancien comportement
  se contentait d'un avertissement console ; une base SQLite en WAL sous un
  dossier synchronisé, c'est la corruption silencieuse (piège Windows n°5).
- **`db.js`** : `cheminSousSynchronisation` (détection par SEGMENT de chemin —
  onedrive/Mon Drive/My Drive/Google Drive/Dropbox, casse indifférente — ET
  par RACINE d'environnement OneDrive/Dropbox/...) + `verifierEmplacementBase`
  qui REFUSE avec un message actionnable (« Définissez IWF_CHEMIN_BASE vers un
  dossier local hors cloud ») ; branché dans `db.ouvrir` ET au démarrage
  serveur AVANT la reprise de restauration. Dérogation explicite
  `IWF_AUTORISER_BASE_SYNCHRONISEE=1` (migration contrôlée) — l'avertissement
  du démarrage reste alors (« Dérogation active »).
- **`lancer-inerweb.bat`** : lecture d'un `.env` simple (NOM=VALEUR), URL
  d'ouverture dérivée (LAN HTTPS compris — P1-5), et base vive des
  installations NEUVES placée sous `%LOCALAPPDATA%\inerWeb-Fluide` (hors
  cloud, hors dossier du programme). **⚠️ Adaptation PROTECTRICE vs la RC**
  (arbitrage délégué « compromis protecteur ») : la RC redirigeait TOUT le
  monde vers LOCALAPPDATA, ce qui aurait ORPHELINÉ en silence la base d'une
  installation existante — chez nous, une installation avec `data\` déjà à
  côté du programme GARDE sa base (et si elle est sous OneDrive, le serveur
  refuse et explique — jamais de perte silencieuse).
- **Nouvelle suite `server/test-emplacement-base.mjs` (20 vérifs, tout
  TIRÉ)** : détections par segment et par racine d'environnement (+ faux
  positifs écartés), refus actionnable, chemin sain absolu, dérogation,
  `db.ouvrir` refusé puis base saine acceptée (aucun état résiduel), VRAI
  serveur : exit 1 sur base sous faux OneDrive puis démarrage AVEC dérogation
  et avertissement à la console. **TOUT VERT — 87 exécutions.**
- **Revue adversariale (1 agent) sur les 3 briques P1-5/P2-3/P1-6 : AUCUN
  bloquant, AUCUN important.** Le point délicat — l'asymétrie de coût du
  double scrypt — est PROUVÉ inexploitable pour énumérer les logins (leurre
  re-dérivé lui aussi au profil hérité : écart mesuré login absent/présent =
  0,1 ms). 3 observations MINEURES consignées : ① HSTS inerte quand l'accès
  LAN se fait par IP littérale (RFC 6797 — utile seulement si un jour nom
  DNS + certificat valide) ; ② pour une installation NEUVE, `backups/` suit
  la base sous LOCALAPPDATA → plus jamais synchronisé PAR ACCIDENT : inviter
  à configurer le dossier de destination des sauvegardes à l'onboarding
  (sinon le témoin du lot D reste sur le poste) ; ③ parseur `.env` du
  lanceur : valeurs avec `#`/`%`/`"`/BOM non supportées (sans impact sur
  PORT/IWF_*, à documenter dans un `.env` d'exemple).

### 🔒 P2-3 — scrypt N=2^17 + re-hachage transparent à la connexion (reprise RC 8.1) (20/07 soir)
- **2ᵉ brique piochée dans la RC ChatGPT 8.1.0-rc.1**, adaptée puis prouvée
  chez nous. `comptes.js` : profil courant **N=2^17** (minimum scrypt OWASP,
  ≈ 128 Mio), profil hérité N=2^15 conservé UNIQUEMENT pour reconnaître un
  ancien compte (`verifierMotDePasseDetail` → `{valide, rehashageRequis}`,
  `verifierMotDePasse` booléen inchangé pour les appelants existants).
  ⚠️ `chiffrement.js` (archives du coffre-fort) garde N=2^15 : les archives
  chiffrées existantes en dépendent — divergence désormais assumée et
  documentée.
- **`routes-comptes.js`** : à la connexion réussie d'un compte encore haché
  à l'ancien profil, le hash est REMPLACÉ (sel frais, profil courant) dans la
  MÊME transaction que l'ouverture de session — seul moment où le mot de
  passe en clair est disponible ET prouvé — et tracé au journal chaîné
  (`RENFORCEMENT_HASH_MOT_DE_PASSE`, jamais le mot de passe).
- **Preuves** : test-comptes famille 7 (5 vérifs unitaires : les 2 profils
  divergent, verdicts croisés bon/mauvais mot de passe, compatibilité
  booléenne) ; test-routes-comptes famille 10 (8 vérifs de bout en bout sur
  le VRAI serveur : hash rétrogradé d'autorité en SQL direct → connexion 200
  → hash renforcé constaté en base → 1 entrée au journal → connexion
  suivante sans re-hachage superflu). **TOUT VERT — 86 exécutions.**

### 🔒 P1-5 — le mode LAN exige HTTPS (reprise RC 8.1, re-testée) (20/07 soir)
- **1ʳᵉ brique piochée dans la RC ChatGPT 8.1.0-rc.1** (plan
  `docs/PLAN-INTEGRATION-RC-CHATGPT.md`) : code repris de `server/serveur.js`
  de la RC, ADAPTÉ (pas de bump de version, partie anti-OneDrive laissée à la
  brique P1-6) puis PROUVÉ chez nous — la RC n'apportait aucune recette.
- **`IWF_LAN=1` exige désormais `IWF_TLS_CERT` + `IWF_TLS_KEY`** : sans
  certificat le serveur REFUSE de démarrer (code 1, message explicite),
  AUCUN repli HTTP en clair n'est jamais ouvert sur le réseau. TLS ≥ 1.2,
  en-tête `Strict-Transport-Security` servi en mode LAN. Le loopback (sans
  `IWF_LAN`) reste en HTTP, strictement inchangé.
- **Garde d'origine durcie côté LAN** : l'origine `https://<hôte LAN>` est la
  SEULE acceptée pour l'hôte réseau — un `Origin` `http://<hôte LAN>` (page
  servie en clair) est refusé 403 ; les origines loopback restent en http.
- **Nouvelle suite `server/test-lan-https.mjs` (11 vérifs, tout TIRÉ)** :
  refus sans certificat + aucune écoute en clair ; HTTPS réel sur « IP LAN »
  127.0.0.2 (bouclage — jamais le vrai réseau ni le pare-feu) avec TLS
  vérifié sur le socket + HSTS + bannière ; requête HTTP en clair coupée à la
  poignée de main ; les 3 verdicts d'origine. Certificat auto-signé de test
  embarqué en littéral (clé sans aucune valeur, 100 ans).
  **TOUT VERT — 86 exécutions.**

### 🏁 P7-e (option A) — acceptation : LE CHANTIER P0-7 EST COMPLET (20/07 soir)
- **Garde `createControle` direct** (2 stores, message mot pour mot) : un
  `mouvementId` forgé est REFUSÉ — le lien contrôle ↔ mouvement naît
  EXCLUSIVEMENT de la validation (CR-3). Fermait le « reste consigné » de
  l'audit : le serveur insérait la valeur arbitraire, la démo l'ignorait
  en silence (divergence unifiée en refus explicite).
- **Garde d'import** (invariants des deux stores, miroirs exacts) : un
  contrôle OFFICIEL orphelin (sans `mouvementId`) est refusé — dans la
  cible option A, tout contrôle officiel naît d'un mouvement ; un
  orphelin ne peut être que forgé ou issu d'un contournement.
- **Tests d'acceptation (contrat, parité demo/local)** : mouvement
  CONTROLE validé → suppression/revalidation refusées
  (MSG_ECRITURE_FIGEE) ; contre-écriture = SEULE correction (scellée v2,
  type conservé, quantité 0, aucun effet stock fantôme —
  `appliquerEffetsInverses` ignore les types CONTROLE par construction) ;
  le contrôle lié SURVIT à l'annulation et la machine n'est PAS retouchée
  (comportements CONSIGNÉS au plan, alignés sur le contrôle accessoire) ;
  import orphelin refusé.
- **Part OFFICIELLE** (aptitude + signatures + PDF conservé sur le
  parcours contrôle) : bloquée par le verrou → consigne de réouverture
  ajoutée en tête de la suite e2e GELÉE (`server/test-officiel-e2e.mjs`,
  commentaire seul, code intact) : ajouter le cas « mouvement CONTROLE
  officiel » au rejeu ; `createControle` direct ne rouvrira JAMAIS (P7-c).
  **TOUT VERT — 85 exécutions. P0-7 (P7-a→e) : COMPLET.**

### 🧱 P7-d2 (option A) — la carte « Contrôle d'étanchéité » du wizard (20/07)
- **Étape 1** : 6ᵉ carte « Contrôle d'étanchéité » (icône loupe) +
  interrupteur « non périodique » (même idiome que première charge /
  démantèlement) ; `typeMouvement()` → CONTROLE_PERIODIQUE par défaut.
  Reprise CR-1 : les deux types CONTROLE reprennent la carte et
  l'interrupteur.
- **Parcours « sec »** : Bouteille (3) et Pesées (4) affichées « Sans
  objet » au bandeau et SAUTÉES dans les deux sens (aller ET retour,
  même idiome que le saut machine préréglée) ; à l'étape 5 la carte
  « Sans objet » disparaît (le contrôle est l'objet de l'écriture,
  garde P7-b reflétée à l'écran, bandeau explicatif) ; récap sans
  pesées ni quantité ; finalisation avec pesées null EXPLICITES
  (`nombreFr('')` vaut NaN, jamais stocké).
- **Vues** : `chipType` (communs.js) apprend les 2 types CONTROLE (même
  trou que le dashboard, corrigé en P7-b) ; vue Mouvements : quantité
  « — » pour un contrôle (« +0,00 kg » était trompeur), tableau ET
  rappel de fiche ; `TYPES_FILTRE` (module pur) : groupe « Contrôle
  d'étanchéité » — l'option apparaît dès qu'un contrôle existe.
- **Tests** : test-wizard +7 vérifications (carte proposée, étape 2
  conservée, saut 2→5, « Sans objet » absent, étape 5 complète avec
  résultat+détecteur, retour 5→2) — l'étape 6 (canvas) reste hors shim.
  **Vérif NAVIGATEUR réelle sur port statique jetable (mode démo)** :
  parcours complet carte→machine→contrôle→signature→validation, fiche
  FORM- « Contrôle périodique » Signée, quantité « — », filtre
  opérationnel (1 sur 8), contrôle lié né avec échéance réglementaire
  +12 mois (P7-d1 à l'écran), CERFA du mouvement rendu au visualiseur,
  zéro erreur console. **TOUT VERT — 85 exécutions.**
  **LE PARCOURS CONTRÔLE EST COMPLET (P7-a→d2) ; reste P7-e
  (acceptation immuabilité/WORM + garde d'import orphelin).**

### 🧱 P7-d1 (option A) — effets machine + CERFA du mouvement CONTROLE (20/07)
- **CR-3 enrichi (2 stores, parité stricte)** : le contrôle lié porte
  désormais `operateurId` (= `executeParId` du mouvement, lien fiche
  personnel B2 — perdu jusqu'ici sur le chemin mouvement) ; et pour un
  mouvement DE TYPE CONTROLE, l'échéance suivante est **CALCULÉE** par la
  logique réglementaire UNIQUE (cadre 7 — même résultat que
  `calculerProchainControle`) et portée à `machine.prochainControle`.
  Sans elle, les alertes (qui lisent l'échéance STOCKÉE) sonnaient
  « en retard » après un contrôle tout frais. Jamais de saisie libre par
  ce chemin ; le contrôle ACCESSOIRE (charge/récupération) garde le
  comportement historique (aucune mise à jour d'échéance — écart consigné
  au plan, à trancher). FUITE aussi datée : l'horloge périodique repart du
  dernier contrôle, le suivi de fuite reste une échéance distincte.
- **Garde métier** : machine DEMANTELEE (sortie du parc, fluide récupéré)
  → contrôle d'étanchéité SANS OBJET, refusé à la validation — même
  profil que la garde des charges ; ARRETEE reste contrôlable.
- **Tests contrat (parité demo/local)** : FUITE → statut machine +
  localisation + `operateurId` + `dernierControle` ; réparation tracée +
  CONTROLE CONFORME → retour EN_SERVICE (R4) ; échéance machine = calcul
  du contrat ; refus sur machine démantelée.
- **Tests CERFA (PDF relu)** : mouvement CONTROLE validé — Case_CtrlPerio
  seule cochée, cadre 5 (détecteur du contrôle lié), cadre 7
  (seuil 5-50 t + 12 mois), cadre 10 (CONFORME → Case_Fuite_Non),
  cadre 11 TOUT vide (contrôle « sec »), cadre 12 vide, mention FORMATION.
  Aucune retouche du générateur : il savait déjà (preuve par test).
  **TOUT VERT — 85 exécutions.** Reste P7-d2 : la carte « Contrôle » du
  wizard (parcours de création à l'écran).

### 🧱 P7-c (option A) — `createControle` direct FORMATION-only PAR NATURE (20/07)
- Le refus du contrôle AUTONOME en mode OFFICIEL n'est plus l'effet du verrou
  de livraison (colmatage conjoncturel P0-2) : c'est un **refus STRUCTUREL**
  qui tiendra verrou OUVERT — l'officiel ne passe QUE par le parcours
  mouvement de type CONTROLE (P7-a/b : signatures, PDF conservé, scellement,
  WORM). Message canonique **`MSG_CONTROLE_DIRECT_OFFICIEL`** posé dans les
  DEUX miroirs `blocage-officiel.js` (parité mot pour mot ajoutée à
  `test-blocage-officiel.mjs`).
- Handlers `createControle` des deux stores (demo + serveur) : le passage par
  `evaluerOfficiel('PASSAGE')` est remplacé par le refus dur, AVANT tout effet.
  Le contrôle **LIÉ** (CR-3, `enregistrerControle` appelé hors handler par la
  validation d'un mouvement) est **préservé** : il hérite le mode du mouvement,
  gardé par les 3 moments officiels.
- Test contrat durci : égalité **STRICTE** du message (prouve que c'est le
  refus structurel qui parle, plus le verrou), machineId inexistant (refus
  avant la vérification machine), parité demo/local. Description de
  `createControle` mise à jour dans `contrat.js` (vérité de surface).
- Revue adversariale : pas de contournement par casse (`enregistrerControle`
  normalise tout mode ≠ 'OFFICIEL' en FORMATION) ; constat consigné pour
  P7-e — l'import JSON pourrait introduire un contrôle OFFICIEL orphelin
  (sans `mouvementId`), garde d'import à poser (plan §7).
  **TOUT VERT — 85 exécutions.**

### 🔒 T1 (audit externe #2) — VERROU DE LIVRAISON REFERMÉ : le mode Officiel est de nouveau fermé (20/07)
- Suite au 2ᵉ audit externe (`docs/AUDIT-INERWEB-FLUIDE-2026-07-20.md`) et au
  choix de cible **« registre officiel unique »** (Franck, 20/07), le mode
  Officiel est **refermé** le temps de traiter les priorités P0
  (`docs/CONSTATS-AUDIT-EXTERNE-2026-07-20.md`, décision transverse T1).
- **`VERROU_LIVRAISON = true`** dans les DEUX miroirs (`server/blocage-officiel.js`
  + `v8/js/data/blocage-officiel.js`, nulle part ailleurs), **NON configurable
  par l'environnement** (zéro flag — volontaire pour l'audit). Rebasculer à
  `false` rouvre partout. Geste RÉVERSIBLE : la mécanique C1→C5 (signatures
  réelles, empreinte v2, PDF final conservé, parcours UI) reste intacte.
- Filet ajusté sans régression fonctionnelle : les 3 assertions écrites
  « verrou ouvert » redeviennent « verrou fermé » (test-contrat : message de
  refus + simulation ; test-validateur-session : simulation) ; la suite
  `server/test-officiel-e2e.mjs` (parcours officiel de bout en bout, prouvée
  verte le 19/07) est **gelée** par une garde en tête tant que le verrou est
  fermé — code conservé INTACT, à rejouer à la réouverture après les P0.
  **TOUT VERT — 85 exécutions.**
- Effet de bord vertueux : README (« Mode Officiel : pas encore ») et
  `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` (« fermé ») redeviennent exacts —
  une des incohérences du §9 de l'audit se résorbe d'elle-même.

### 📜 LOT E RGPD — brique E2e : LA DOCUMENTATION HONNÊTE — LE LOT E2 EST COMPLET (19/07 soir)
- **`RGPD.md`** : durées réécrites en DEUX clauses honnêtes (« identité de la
  fiche : mise à l'abri chiffrée après la durée » / « écritures d'intervention :
  conservées sans limite avec le registre, sous pseudonyme à l'affichage ») ;
  nouvelle section **§7 bis « Le coffre des identités »** — fonctionnement,
  geste manuel motivé, séquestre papier, AVEU de périmètre (porteur du code,
  accès hors application) et la liste COMPLÈTE des 8 résidus assumés
  (technicien scellé, signatures + modale, PDF conservés, journal historique,
  métadonnées de PJ figées, sauvegardes/exports antérieurs, habilitations
  historiques, export E1 substitué) — le dossier que le DPD relira (gate E④).
- **`SAUVEGARDE.md`** : les archives automatiques (claires) restent sur le
  poste ; synchroniser UNIQUEMENT `backups/scellement/` (aucune donnée
  nominative) ; après une mise à l'abri, restaurer une ARCHIVE, jamais un
  instantané ; rétention des copies claires antérieures au geste.
- **Notice de l'application** (vue Protection des données) alignée mot pour
  mot sur les mêmes clauses. **TOUT VERT — 85 exécutions.**
- **BILAN DU LOT E2** (plan `docs/PLAN-LOT-E2.md` suivi brique à brique) :
  E2a primitives + module pur (36 vérifs) · E2b gestes réels + revue
  adversariale 1 bloquant/6 importants fermés (65 vérifs) · E2c le coffre
  voyage, bloquant n°1 prouvé fermé (18 vérifs) · E2d interface + essai
  navigateur complet · E2e documentation. Conception : 12 agents (2
  architectures, fusion, 5 critiques — 5 bloquants intégrés au plan AVANT le
  code). Reste HORS code : relecture DPD (E④) et relecture Franck.

### 🖥️ LOT E RGPD — brique E2d : L'INTERFACE DU COFFRE + SUBSTITUTION D'AFFICHAGE (19/07 soir)
- **Section « Coffre des identités » dans la vue Protection des données**
  (`rgpd.js`) : compteur, bandeau des fiches d'élèves désactivées en attente,
  et les 5 gestes en modales — Mettre à l'abri (liste à cocher, candidats
  PRÉ-COCHÉS, double saisie de la phrase au premier geste + avertissement
  « code perdu = identités illisibles » + consigne de séquestre papier),
  Vérifier mon code, Consulter (phrase + motif, modale éphémère avec pièces
  téléchargeables), Restaurer (pièces altérées signalées), Changer la phrase.
  Bandeau démo explicite (« chiffrement simulé — jamais votre vraie phrase »).
  État inaccessible (rôle) → encart informatif, jamais d'écran cassé.
- **Badge « au coffre »** dans l'annuaire du personnel + **verrou d'écran** de
  la fiche (l'édition renvoie vers le geste dédié — le store refusait déjà).
- **Substitution d'affichage par IDENTIFIANT** (fiche vivante = pseudonyme) :
  modale de détail des mouvements, CSV du dossier d'audit (technicien via
  executeParId, validateurId pour les contre-écritures), et l'INDEX DE
  RECHERCHE de la vue Mouvements (chercher le vrai nom d'un élève à l'abri ne
  trouve plus rien, chercher son pseudonyme trouve). Le tableau de bord et
  tous les affichages de contrôles suivaient déjà (identifiant → fiche
  vivante ; opérateur réécrit en base depuis E2b).
- **ESSAI NAVIGATEUR COMPLET** (mode démo, mêmes écrans que le réel) : mise à
  l'abri par la modale réelle (candidat pré-coché, double saisie exigée,
  avertissement affiché) → annuaire pseudonymisé (« Élève 2026-01 » + badge,
  AUCUN nom réel) → verrou d'écran → consultation avec motif (identité réelle
  restituée) → restauration (« Identité restaurée », badge parti, nom de
  retour). **TOUT VERT — 85 exécutions.** Reste : E2e (documentation).

### 🚚 LOT E RGPD — brique E2c : LE COFFRE VOYAGE DANS L'EXPORT/IMPORT (19/07 soir)
Le BLOQUANT n°1 de la conception est FERMÉ ET PROUVÉ : sans transport explicite,
un import sur poste neuf rendait toutes les identités indéchiffrables à jamais.
- **L'export JSON emporte le coffre** : `coffreIdentites` (enveloppes base64),
  `coffreConfig` (sel + témoin + kdf), `coffreCompteurs` (MONOTONES — jamais de
  pseudonyme réattribué après sinistre), `coffreCree`. L'import les REMPLACE
  atomiquement dans la même transaction (cohérence sel ↔ enveloppes garantie).
  Les gardes temporaires d'E2b sont levées.
- **Validations à l'import** : enveloppes au repère réel exigé (illisible →
  refus), identité ORPHELINE → refus, coffre de SIMULATION démo → rejet net
  (jamais en base réelle), fichier SANS coffre sur un poste AU coffre → refus
  PROTECTEUR (un import ne détruit pas des identités chiffrées par accident ;
  deux coffres → remplacement, « un import restaure un instantané »).
- **La démo transporte l'OPAQUE** : un export réel importé en démo conserve les
  enveloppes telles quelles (consultation → message canonique), et les ré-émet
  à l'export — le round-trip réel → démo → réel ne perd RIEN (prouvé).
- **Preuves : suite `test-coffre-echange.mjs` 18 vérifs** — dont LE test du
  bloquant (export → import sur base VIERGE → consultation avec la phrase
  d'origine RÉUSSIT), restauration complète après aller-retour (scan octet pour
  octet), enveloppe corrompue (l'import passe, la consultation échoue
  proprement, le registre reste sain), compteur transporté. 2 tirs E2b mis à
  la nouvelle vérité (ré-import du poste ACCEPTÉ, simulation rejetée).
  **TOUT VERT — 85 exécutions.** Reste : E2d (interface), E2e (documentation).

### 🔐 LOT E RGPD — briques E2a + E2b : LE COFFRE DES IDENTITÉS (19/07 soir)
Cœur du lot E2 (plan `docs/PLAN-LOT-E2.md`, validé par Franck) : minimisation
RÉVERSIBLE des données d'élèves — les identités partent dans un coffre chiffré,
l'application n'affiche plus que des pseudonymes, le code rouvre en cas de
besoin légal. **Chaîne de hash, WORM, signatures scellées : rien ne bouge.**
- **E2a (`8bba64c`) — primitives + module pur.** `server/chiffrement.js` :
  enveloppes de CHAMP autoportantes (`IWF-COFFRE-1`, sel embarqué, AAD
  `coffre:v1:<id>:<pseudo>`, scrypt RENFORCÉ N=131072, re-déchiffrement de
  contrôle, message anti-oracle unique) — zéro régression sauvegardes.
  `coffre-identites.js` (pur, 2 miroirs) : messages canoniques, pseudonymes
  « Élève AAAA-NN », éligibilité (élève désactivé), pseudonymisation/
  restauration bit à bit, libellé substitué par identifiant. 36 vérifs.
- **E2b — les gestes réels.** Migration **25** (tables `coffre_identites` —
  enveloppe BLOB, pseudonyme UNIQUE — et `coffre_purge_en_attente`, rejouée au
  démarrage par serveur.js) ; migration **26** : entités de PJ élargies
  (`personne`, `OUTIL`) — **bug PRÉEXISTANT corrigé** : en Mode Local, le CHECK
  du socle refusait silencieusement les scans de fiche personnel (même mal que
  la migration 10 pour les catégories) ; triggers WORM de la 24 recréés.
  **6 méthodes de contrat** (81 → **87**, `VERSION_CONTRAT` 7) : `etatCoffre`
  (VALIDEUR), `verifierCodeCoffre`, `mettreAuCoffre`, `consulterIdentiteCoffre`,
  `restaurerIdentiteCoffre`, `changerPhraseCoffre` (REFERENT/ADMIN — le porteur
  de la phrase peut tout déchiffrer, une séparation plus fine serait illusoire).
  Tous les gestes REFUSÉS en accès réseau (`IWF_LAN=1` : la phrase ne traverse
  jamais le réseau du lycée). Mise à l'abri : **archive complète vérifiée
  EXIGÉE avant toute purge** (sinon produite sur-le-champ), enveloppe (fiche +
  scans + identifiant de connexion), fiche pseudonymisée (`actif=0`, id intact),
  brouillons ET contrôles d'étanchéité réécrits (clause anti-homonyme, révision
  incrémentée → signatures posées PÉRIMÉES), compte renommé/désactivé, journal
  `COFFRE_*` (pseudonyme + identifiant, JAMAIS le nom). Témoin GCM (rien de
  dérivé de la phrase seule en base), compteur de pseudonymes MONOTONE,
  démo = simulation balisée (phrase d'exercice en mémoire de session SEULEMENT).
- **Revue adversariale AVANT commit (3 lentilles) — 1 BLOQUANT + 6 IMPORTANTS
  fermés** : ① fuite PROUVÉE du nom par `controles[].operateur` (export E1 +
  `getControles`) → l'opérateur des contrôles est RÉÉCRIT à la mise à l'abri
  (table ni scellée ni WORM) ; ② restauration : hash vérifiés AVANT toute
  écriture, pièce altérée SIGNALÉE et sautée (jamais d'identité verrouillée à
  perpétuité), fichiers nettoyés si la transaction échoue ; ③ signatures d'un
  brouillon réécrit rendues PÉRIMÉES (invariant C1) ; ④ garde TEMPORAIRE
  d'import (un coffre actif ou un fichier porteur d'un coffre → refus clair,
  levée en E2c) ; ⑤ `getJournalAudit` gaté VALIDEUR avec dégradation douce de
  la fiche bouteille (session élève) ; ⑥ anti-oracle complet (sel/témoin
  corrompus en base → message canonique) ; + verrous étendus (habilitations/
  mentions sur fiche au coffre), clause anti-homonyme, parité démo alignée
  (ordre des refus, hash, préparation avant mutation, compléments d'import).
- **Preuves : suite `test-coffre-serveur.mjs` 65 vérifs** (dont chaîne VERTE
  après mise à l'abri d'un élève à écritures figées, grep du journal sans nom
  ni phrase, 403 élève/enseignant, rollback global, rattrapage de purge,
  pièce altérée, homonyme intouché, imports refusés) + `test-coffre-identites.mjs`
  36 vérifs. **TOUT VERT — 84 exécutions.** Reste : E2c (export/import du
  coffre), E2d (interface + substitution d'affichage), E2e (documentation).

### 🛡️ LOT E RGPD — brique E3 : NOTICE D'INFORMATION AFFICHÉE DANS L'APPLICATION (19/07)
Information des personnes concernées (RGPD art. 13/14) désormais accessible
depuis l'application, plus seulement dans `RGPD.md`.
- **Nouvelle vue** `v8/js/views/rgpd.js` (« Protection des données ») + entrée de
  menu (icône `verrou`, après « Sauvegarde »). Contenu dérivé de `RGPD.md`
  (source de vérité) mais reformulé POUR les personnes concernées (personnel,
  élèves, contacts) : qui est responsable, quelles données, pourquoi, base
  légale, durées de conservation, où, VOS DROITS + comment les exercer, cas
  particulier des élèves. Bouton « Imprimer ». Le nom du responsable de
  traitement est repris de l'établissement quand il est renseigné
  (`getEtablissement`, repli générique sinon).
- **Vue STATIQUE** (aucune écriture) ; réutilise les styles partagés `.tableau`
  et `.encart-aide` + un bloc CSS compact `.rgpd-*` (`composants.css`).
- Vérifié AU NAVIGATEUR (mode démo) : entrée de menu, 8 sections, 2 tableaux,
  bouton imprimer, responsable renseigné. Filet inchangé : **TOUT VERT, 82
  exécutions**. La relecture par le DPD reste un geste HORS code (gate E④).

### 🛡️ LOT E RGPD — brique E1 : EXPORT INDIVIDUEL DES DONNÉES D'UNE PERSONNE (19/07)
Première brique du lot E (droits d'ACCÈS et de PORTABILITÉ, RGPD art. 15/20). Le
`RGPD.md` §7 promettait « l'export des données d'une personne via les fonctions
d'export » : c'est désormais réel dans l'application.
- **Module pur partagé** `v8/js/data/export-personne.js` (`assemblerExportPersonne`),
  recopié EN LITTÉRAL dans `server/export-personne.js` — parité prouvée par
  `test-export-personne.mjs`. À partir des collections déjà lues (personnel,
  habilitations, mentions, signatures, mouvements, contrôles, pièces jointes), il
  reconstitue tout ce qui concerne UNE personne : sa fiche, ses habilitations et
  mentions, ses signatures réelles (métadonnées, SANS l'image), les interventions
  et contrôles où elle apparaît (rapprochement par identifiant OU par nom
  insensible casse/accents), les métadonnées de ses pièces jointes. Enveloppe
  `{ application, version, genereLe, personneId, personne, … , avertissement }`.
- **AUCUN binaire** dans l'export (images de signature, scans d'attestation restent
  téléchargeables à part depuis la fiche) ; **le journal d'audit n'est pas repris**
  (conservé pour sa valeur probante réglementaire — minimisation assumée, à faire
  relire par le DPD, gate E④).
- **Nouvelle méthode de contrat** `exporterDonneesPersonne(personneId)` (lecture,
  81 méthodes désormais) : câblée DemoStore + LocalStore + serveur, composant les
  getters existants (parité héritée). **Lecture SENSIBLE gatée VALIDEUR** côté
  serveur : nouvelle table `ROLES_LECTURE_SENSIBLE` consultée par `garderRole`
  (un élève est refusé — 403 — comme pour la gestion du personnel). L'attaque est
  TIRÉE dans le test (ELEVE → 403, sans rôle → 403, REFERENT → export).
- **UI** : bouton « Exporter (RGPD) » dans la fiche du personnel (modale
  `personne-form.js`) → télécharge `export-rgpd-<prénom-nom>-<date>.json`. Vérifié
  AU NAVIGATEUR en mode démo (bouton présent, téléchargement déclenché, toast).
- **Preuves — TOUT VERT, 82 exécutions** (`node outils/lancer-tests.mjs`) :
  nouvelle suite `test-export-personne.mjs` (22 vérifs : parité ESM/CJS + test
  discriminant, filtrage par identité, absence de binaire, personne introuvable →
  Error, garde de rôle 403/OK sur base jetable, composition serveur réelle).

### 🔓 LOT C audit-proof — brique C5 : BASCULE DU VERROU — LE MODE OFFICIEL EST OUVERT (19/07 soir) — LOT C COMPLET
Dernière brique du lot C (plan §7.6). **`VERROU_LIVRAISON = false` dans les DEUX miroirs**
(`v8/js/data/blocage-officiel.js` + `server/blocage-officiel.js`, nulle part ailleurs — la
mécanique reste en place, rebasculer à `true` referme le mode partout). Le mode Officiel est
désormais gouverné par les SEULES conditions réelles 1-12 + 14-15.
- **Exemption TRANSFERT du PDF final (arbitrage Franck 19/07, gate ①)** : un transfert ne
  produit jamais de CERFA (IM-12) → `pdfFinalAttendu(type)` + `MSG_PDF_FINAL_TRANSFERT` dans
  le module pur `pdf-final.js` (2 miroirs, parité prouvée), branchés dans `validerMouvement`
  des 2 stores (un PDF fourni sur un transfert est REFUSÉ — aucune pièce non attendue
  n'entre au registre) et dans la vue (pas de génération CERFA pour un transfert officiel).
  L'écriture scelle en v2, chaînée, `hashPdfFinal` null.
- **Migration 24 — WORM des pièces jointes d'une écriture figée** (différé C3c) : 3 triggers
  sur `pieces_jointes` (INSERT/UPDATE/DELETE refusés quand la pièce appartient à un MOUVEMENT
  VALIDE/ANNULE, reparentage compris ; les autres entités restent libres). Le canal système
  `conserverPdfFinal` insère pendant que la ligne est SOUMIS : il passe. `declencheursWorm()`
  étendu — l'import total retire puis recrée ces triggers (prouvé). ⚠️ toute future migration
  qui recrée `pieces_jointes` devra recréer ces triggers.
- **`verifierPdfFinalConserve` branché** (différé C3b) : ① au DÉMARRAGE serveur,
  `verifierTousPdfFinalConserves()` contrôle TOUS les PDF conservés (pièce, disque, `.sha256`
  contre l'empreinte scellée) — anomalie affichée ET journalisée (`PDF_FINAL_ANOMALIE`),
  best-effort par écriture, jamais bloquant ; ② au DOSSIER D'AUDIT : une fiche officielle
  scellée est restituée depuis le document CONSERVÉ (porte de `conserve.js`, jamais le
  générateur), verdict par fiche dans `02-PDF-CONSERVES.txt` (couvert par le manifeste
  d'empreintes), anomalie DÉNONCÉE (le CERFA altéré n'est jamais embarqué ni régénéré),
  contrôle lié d'une fiche conservée SAUTÉ (pas de doublon). Au passage, bug préexistant
  corrigé : un TRANSFERT au registre bloquait TOUTE la génération du dossier d'audit (le
  générateur refuse les transferts) — désormais exclu de la boucle CERFA, tracé au CSV.
- **Wizard : choix du mode à l'étape 6** (le chemin d'écran qui manquait — `mode:'FORMATION'`
  était codé en dur) : Formation par défaut (zéro friction), Officiel proposé seulement si
  `peutPasserEnOfficiel().ok` (mode réel uniquement, la Démo reste Formation). En OFFICIEL,
  l'assistant s'arrête au BROUILLON (les signatures se posent sur le brouillon — modale
  « Signatures » C4 — puis soumission, puis validation avec CERFA conservé) ; la reprise
  d'un brouillon conserve son mode (rétrogradation SIGNALÉE si l'éligibilité est perdue).
- **Revue adversariale avant commit — 4 constats fermés** : ① le mode d'une écriture déjà
  créée est FIGÉ (basculer le select après un échec de validation ne ment plus) ; ② reprendre
  un brouillon SIGNÉ demande confirmation (les signatures réelles seraient détruites) ;
  ③ rétrogradation Officiel→Formation à la reprise jamais silencieuse (bandeau) ; ④ contrôle
  du démarrage tolérant par fichier (un PDF illisible n'avorte plus les autres). Resté
  ouvert (préexistant, consigné) : `createControle` accepte un `mouvementId` arbitraire —
  un contrôle forgé lié à une fiche d'une autre année échapperait au dossier d'audit annuel.
- **Preuves — TOUT VERT, 81 exécutions** : nouvelle suite `test-officiel-e2e.mjs` (41 vérifs :
  décor complet des conditions, parcours officiel de bout en bout par la vraie API — création
  ouverte, refus 14-15 tirés, double signature, validation avec PDF conservé + témoins +
  manifeste EN TRANSACTION avec signataires [différé C3b], WORM migration 24 tiré sur
  l'écriture réelle, TRANSFERT officiel validé SANS PDF et refusé AVEC, contre-écriture
  officielle v2 sans parcours de signatures [« à confirmer à la bascule », plan §9 —
  CONFIRMÉ], dossier d'audit servant le CONSERVÉ octet pour octet + attaque altération
  dénoncée, round-trip export/import vert, triggers renaissants). **ESSAI COMPLET AU
  NAVIGATEUR sur serveur réel jetable** (base + port jetables, compte admin CLI, compte
  référent lié) : wizard → mode Officiel choisi → brouillon → panneau des contrôles guidant
  (cause d'appoint manquante détectée) → reprise (mode conservé) → double signature à
  l'écran (délégation lycée PRÉ-COCHÉE, déclarations complètes) → soumission → validation
  (« aucun blocage ») → bouton CERFA affichant « original conservé » ; écriture vérifiée en
  base : VALIDE/OFFICIEL/v2, sha disque = empreinte scellée, témoins frères présents.
  Tests adaptés à la nouvelle vérité (le verrou ne doit PLUS apparaître) :
  `test-contrat` (×2), `test-validateur-session`.

### 🔐 LOT C audit-proof — brique C4 : PARCOURS UI OFFICIEL (conditions 3-4, 19/07)
Avant-dernière brique du lot C (plan §7.5). Reste C5 (bascule du verrou). AUCUN fichier
serveur ni store touché : la brique est 100 % côté interface + générateur CERFA.
- **Écrans de signature** (nouvelle modale `v8/js/modales/signatures-modal.js` + module
  PUR `v8/js/data/parcours-signature.js`) : bouton « Signatures » sur tout mouvement
  BROUILLON — requis en Officiel (conditions 14-15), facultatif en Formation
  (entraînement ; AUCUNE friction : rien d'exigé du parcours actuel). Technicien PUIS
  détenteur (ordre du store respecté à l'écran), déclaration composée par le module
  partagé `signatures-mouvement.js` et AFFICHÉE en direct (jamais envoyée au store, qui
  la recompose), pré-remplissage (technicien = l'intervenant déclaré ; détenteur d'un
  équipement du LYCÉE = le professeur connecté PAR DÉLÉGATION, case PRÉ-COCHÉE, raison
  sociale de l'établissement — décision Franck 16/07 ; client tiers = personne physique
  à saisir), identité de SESSION visible, canvas réutilisé (`wizard/signature.js` gagne
  un libellé paramétrable, défaut inchangé), signature périmée AFFICHÉE avec re-signature
  proposée (l'ancienne reste tracée), et SOUMISSION proposée quand les deux signatures
  sont valides. Panneau des contrôles Officiel partagé (`remplirSimulationOfficielle`,
  wording adapté au mode de la fiche) — les conditions 14-15 s'affichent puis se lèvent
  au fil des signatures.
- **Validation OFFICIELLE** (`views/mouvements.js`) : à la confirmation, le CERFA FINAL
  est généré CÔTÉ CLIENT (`genererPdfFinalBase64`) et transmis en 3e paramètre de
  `validerMouvement` (canal C3) ; en FORMATION, null — strictement équivalent à l'appel
  historique (clé omise du JSON, prouvé). Le générateur inscrit les signatures RÉELLES :
  personne PHYSIQUE (jamais la raison sociale seule — défaut de l'audit corrigé, plan
  §2.1), qualité signée (délégation comprise), DATE RÉELLE de signature, tracés PNG
  dessinés dans les deux zones du formulaire. Option `accepterSoumis` RÉSERVÉE à ce
  canal (la fiche est SOUMISE au moment de générer) — tout autre appel garde le refus
  historique, confiné prouvé par grep et test.
- **Revue adversariale AVANT commit — 2 constats IMPORTANTS fermés** : ① la correction
  élève compare TOUJOURS les blocs de signature HISTORIQUES (`sansSignaturesReelles`
  posée par `corrigerCerfaEleve`) — une fiche Formation signée via le parcours ne change
  plus les valeurs attendues de l'élève (défaut prouvé : 100 % → 77 % sur la même copie) ;
  ② le canal du PDF FINAL est SANS TOLÉRANCE : un raté de lecture des signatures REMONTE
  à l'écran (jamais de conservation silencieuse des blocs historiques) et les DEUX
  signatures valides sont EXIGÉES avant génération (mêmes exigences que les conditions
  14-15). L'état « signature retenue » est partagé (`etatParcoursSignatures`), plus de
  logique dupliquée.
- **Différé C3c soldé SANS CODE** : le masquage du bouton d'ajout de PJ sur écriture
  figée est SANS OBJET — vérifié : AUCUNE vue ne monte de zone de pièces jointes sur un
  MOUVEMENT (les montages existants : machine, bouteille, outil, personne, établissement,
  BSFF). Le refus canonique du store reste le filet si un canal apparaît un jour.
- **⚠️ CONSTAT pour C5 (revue adversariale, à trancher AVANT la bascule)** : impasse
  TRANSFERT OFFICIEL — les deux stores exigent un PDF final pour TOUT mouvement Officiel,
  mais un TRANSFERT ne produit jamais de CERFA (IM-12) → sa validation officielle
  échouerait pour toujours. Non atteignable aujourd'hui (verrou au PASSAGE) ; arbitrage
  à la bascule : exemption TRANSFERT dans les DEUX miroirs, ou autre pièce finale.
- **Preuves** (TOUT VERT — 80 exécutions ; nouvelle suite `test-parcours-signature`
  12 vérifs, `test-generateur` 98 → 110) : PDF final relu avec pdf-lib (personne physique,
  délégation, dates réelles, technicien périmé IGNORÉ), fiche SOUMISE refusée hors canal,
  refus sans détenteur valide, panne de lecture propagée, correction élève inchangée
  malgré le parcours, blocs historiques sans signatures. **Vérifié au NAVIGATEUR sur
  serveur RÉEL jetable (port 2299, base jetable, sessions réelles)** : parcours complet
  brouillon → 2 signatures → soumission → validation Formation, péremption affichée après
  ajout d'une PJ, refus « tracé trop léger » TIRÉ en vrai HTTP, CERFA visualisé sans
  erreur, refus « compte non lié au personnel » proprement affiché puis levé via un
  compte lié.

### 🔐 LOT C audit-proof — brique C3c : asymétrie des PJ FERMÉE + recomptage à l'import (condition 4, 19/07) — C3 COMPLÈTE
Troisième et dernière sous-brique de C3 (plan §5 + §7.4 enrichi). **La condition 4 est
entièrement livrée** ; restent C4 (écrans) et C5 (bascule du verrou).
- **Asymétrie FERMÉE** : `ajouterPieceJointe` (les 2 stores, ordre et messages miroir mot
  pour mot) refuse désormais ① toute pièce sur une écriture FIGÉE (« Écriture figée : elle
  ne peut plus recevoir de pièce justificative. » — symétrique du refus de suppression) et
  ② la catégorie `CERFA_FINAL` posée par un client (« réservée au système ») — la
  catégorie parle AVANT le figé, des deux côtés. Le canal SYSTÈME `conserverPdfFinal`
  reste intact (insertion directe pendant que la ligne est encore SOUMIS en base).
- **Recomptage à l'import** : pour chaque écriture figée v2 du candidat,
  `hashPiecesJointes` est RECOMPTÉ (liste triée des sha256 des PJ du mouvement dans le
  JSON) et comparé au champ GELÉ — PJ retouchée, ajoutée, retirée, déplacée ou re-typée →
  « fichier forgé ». Les écritures v1 ne sont pas recomptées (PJ légitimement ajoutées
  jadis). **L'attaque « CERFA truquée dans l'export » (plan §7.4) est un test PERMANENT.**
- **Garde « hors canal système »** (constat IMPORTANT de la revue C3c, FERMÉ avant
  commit, tiré) : une PJ `CERFA_FINAL` n'est légitime à l'import QUE sur une écriture
  figée v2 dont `hashPdfFinal` est scellé — sur un brouillon, une machine ou une écriture
  sans PDF scellé : « fichier forgé ». Ferme aussi le résidu « CERFA_FINAL typée MACHINE
  inerte » relevé par l'angle import.
- **Pluralité dénoncée** : `verifierPdfFinalConserve` passe à `db.all` + tri JS — deux
  pièces `CERFA_FINAL` sur la même écriture = « insertion hors canal système » (attaque
  SQL directe en test permanent).
- **Le test C2 « une PJ ajoutée après scellement ne casse pas la chaîne » BASCULE** : le
  refus devient la preuve (le gel garde sa raison d'être — la vérification RELIT les
  valeurs stockées) ; `test-contrat` attache désormais la preuve de mvt2 AU BROUILLON.
- **Preuves** (TOUT VERT — 79 exécutions) : PJ retouchée/injectée/égarée refusées via
  vrai API, catégorie réservée refusée au canal API, pluralité SQL dénoncée, refus d'ajout
  sur figé joué demo ET local, round-trip avec PJ gelée vert des deux côtés. Revue
  adversariale AVANT commit (workflow, 2 rapports complets — le 3e relecteur est tombé
  sur une erreur d'authentification, son périmètre étant couvert par la suite et les deux
  autres) : tout éprouvé dynamiquement, parité stricte confirmée. **DIFFÉRÉS ACTÉS** :
  trigger WORM sur `pieces_jointes` → à poser en C5 avec `declencheursWorm` (valeur
  anti-bidouille interne ; l'export d'une base trafiquée en SQL est déjà refusé à l'import
  et l'insertion SQL ne laisse aucune trace au journal chaîné = recoupement opposable) ;
  masquage du bouton d'ajout de PJ sur écriture figée → C4 (le composant capte déjà le
  refus proprement). ⚠️ Diagnostic à connaître : une écriture v2 scellée entre C2
  (`17f9e6c`, 18/07) et ce commit qui aurait reçu une PJ légitime APRÈS scellement
  (l'API l'acceptait encore) verrait son export refusé « fichier forgé » — fenêtre d'un
  jour, aucun registre réel concerné.

### 🔐 LOT C audit-proof — brique C3b : témoins du PDF conservé + bouton CERFA qui SERT le conservé (condition 4, 18/07)
Deuxième sous-brique de C3 (plan §5). Reste C3c (asymétrie PJ + recomptage import + attaque
permanente).
- **Témoins à côté du PDF dans `documents/`** : `<id>.sha256` (format sha256sum binaire,
  vérifiable tel quel) + `<id>.manifeste.json` (fiche, signataires de la révision scellée,
  empreinte scellée du mouvement, version du logiciel — même esprit que le témoin du lot D).
  Construits DANS la transaction de `validerMouvement` (état scellé), écrits APRÈS elle :
  best-effort ABSOLU, échec journalisé `TEMOINS_PDF_ECHEC` (`db.journaliser` direct,
  entrée « système »), jamais bloquant. Rollback → zéro témoin (éprouvé en le tirant).
- **`verifierPdfFinalConserve`** (serveur) : PJ CERFA_FINAL + fichier disque + `.sha256`
  frère, tous contre l'empreinte SCELLÉE `hash_pdf_final` — sans objet si l'écriture n'a
  pas de PDF scellé. Sera branché au dossier d'audit en C5.
- **RÉGÉNÉRATION au démarrage** (`reecrireTemoinsPdfFinalManquants`, crochet serveur.js) :
  les témoins se RE-DÉRIVENT des colonnes scellées — une RESTAURATION d'archive (le
  coffre-fort ne transporte que les fichiers listés en table, la bascule remplace
  `documents/` en bloc : constat IMPORTANT de la revue, éprouvé) ou un échec toléré les
  laissent manquants → réécrits au prochain démarrage (`.sha256` identique bit à bit,
  manifeste marqué `regenere` avec la date d'origine relue du journal chaîné). Un frère
  PRÉSENT n'est JAMAIS écrasé : falsifié, il reste dénoncé.
- **Bouton CERFA = le document CONSERVÉ, jamais le générateur** : nouveau module
  `v8/js/cerfa/conserve.js` (`doitServirPdfConserve` + `resoudreMouvementConserve` +
  `chargerPdfConserve`) branché dans `ouvrirCerfa` — l'empreinte du contenu relu est
  vérifiée contre `hashPdfFinal` scellé (jamais les métadonnées) ; absent, binaire
  indisponible ou altéré → message canonique, AUCUN repli vers le générateur ; bandeau
  « original conservé ». ⚠️ **Constat de la revue FERMÉ AVANT commit** : la porte
  « contrôle » (bouton CERFA d'un contrôle LIÉ, qui hérite du numéro et du mode de la
  fiche) régénérait un document divergent au même numéro — les DEUX portes passent
  désormais par `resoudreMouvementConserve` (contrôle autonome et FORMATION inchangés).
  L'historique officiel d'avant le lot C (hashPdfFinal null) reste au générateur.
- **Preuves** (TOUT VERT — 79 exécutions, nouvelle suite `test-conserve` auto-découverte) :
  attaques tirées — PDF altéré sur disque DÉNONCÉ, `.sha256` réécrit/supprimé DÉNONCÉ,
  contenu remplacé ou empreinte scellée divergente DÉNONCÉS côté front, falsifié jamais
  écrasé par la régénération ; les deux portes du visualiseur figées par le test. Revue
  adversariale AVANT commit (4 angles, workflow) : 2 constats IMPORTANTS corrigés (porte
  contrôle, témoins perdus à la restauration) + 3 durcissements (message canonique sur
  binaire manquant, journal direct, départage du tri) ; DIFFÉRÉS documentés : pluralité de
  PJ CERFA_FINAL forgées (→ C3c, le recomptage la rendra impossible à l'import ; ajouter
  la dénonciation de pluralité au vérificateur), couverture du bloc manifeste en
  transaction (→ C5, verrou), PDF orphelin sur rollback (préexistant, inoffensif).

### 🔐 LOT C audit-proof — brique C3a : PDF final REÇU, contrôlé et conservé (condition 4, 18/07)
Première des trois sous-briques de C3 (découpage Franck : C3a réception · C3b `.sha256` +
manifeste + bouton CERFA servant le conservé · C3c fermeture de l'asymétrie PJ + recomptage
à l'import + attaque permanente). Plan lot C §5 suivi à la lettre.
- **Module pur en miroir `v8/js/data/pdf-final.js` ↔ `server/pdf-final.js`** : messages
  canoniques (manquant · pas un PDF · trop gros · hors mode Officiel), contrôle des octets
  (nombres magiques `%PDF`, plafond 5 Mo — même limite que les PJ), nom de la pièce
  conservée `CERFA-<numéro>.pdf` dérivé du numéro SERVEUR (jamais reçu du client).
- **`validerMouvement` gagne un 3e paramètre `pdfFinalBase64`** (contrat v5 → v6, surface
  inchangée à 80 méthodes) : OBLIGATOIRE en mode OFFICIEL, REFUSÉ en FORMATION (rien ne
  change pour les élèves). Les contrôles PDF tombent AVANT le verdict du moteur de blocage :
  les refus restent éprouvables verrou de livraison fermé — et c'est l'ordre des deux stores
  (parité stricte, messages mot pour mot).
- **Conservation = pièce jointe SYSTÈME catégorie `CERFA_FINAL`** (canal existant : disque
  `documents/`, hash SHA-256, sauvegardes, dossier d'audit), insérée DIRECTEMENT — sans
  `ajouterPieceJointe`, donc SANS incrément de `revision_brouillon` : les signatures que le
  moteur vient de juger valides le RESTENT. Posée AVANT le calcul des champs gelés : son
  empreinte entre dans `hashPiecesJointes` ET dans `hashPdfFinal` (gelés, scellés v2).
  L'empreinte du PDF est aussi consignée dans la ligne VALIDATION_MOUVEMENT du journal
  chaîné (point de recoupement opposable).
- **Aide serveur `conserverPdfFinal`** exportée pour le filet de test SEULEMENT (absente de
  `HANDLERS` → 501 en HTTP, vérifié par la relecture adversariale).
- **Preuves** (TOUT VERT — 78 exécutions) : parité stricte du module pur (constantes +
  5 contenus discriminants), refus TIRÉS par le vrai chemin API sur une fiche forcée
  OFFICIEL en SQL (sans PDF · HTML déguisé · vrai PDF → le refus suivant est bien celui du
  verrou, fiche restée SOUMISE, aucune PJ conservée), mécanique de conservation éprouvée
  (PJ en table, fichier disque octet pour octet, sha exact, révision NON incrémentée),
  FORMATION inchangée (refus canonique + `hashPdfFinal` null + aucune PJ CERFA_FINAL,
  joué demo ET local). Relecture adversariale AVANT commit (6 angles, dont transport :
  corps HTTP 20 Mo > 6,7 Mo de base64 — le parcours réel de C5 passera) : COMMIT OK,
  zéro correctif. La validation OFFICIELLE de bout en bout sera tirée à l'ouverture (C5).

### 🔐 LOT C audit-proof — brique C2 : empreinte RENFORCÉE v2 (condition 4, 18/07)
Le point délicat du lot (plan §6, suivi à la lettre) : **VERSIONNER, jamais recalculer**.
Les écritures existantes gardent leur empreinte v1 pour toujours ; toute NOUVELLE écriture
scellée est v2 et couvre désormais tout ce qui est significatif.
- **Hasseurs versionnés** (`v8/js/core/utils.js` + miroir `server/hash-mouvement.js`,
  évoluant ENSEMBLE) : `CHAMPS_HASH_MOUVEMENT` v1 (18 champs) **FIGÉE À JAMAIS** ;
  `CHAMPS_HASH_MOUVEMENT_V2` = v1 + 9 champs (`prpFige`, `cerfaNumero`, les 3 rôles réels,
  `outilsFiges`, `hashSignatures`, `hashPiecesJointes`, `hashPdfFinal`). La version de
  l'ÉCRITURE choisit sa préimage ; basculer la version d'un export se détecte (empreintes
  différentes). Nouvelles aides miroirs : `empreinteListeTriee` (liste triée + JSON,
  vide → empreinte de « [] », jamais null) et `chaineCanoniqueSignature` (ordre de clés
  fixe, image réduite au sha de ses octets).
- **Champs GELÉS au scellement, jamais re-dérivés** (constat de la relecture adversariale
  du plan) : calculés dans `validerMouvement`, attachés à l'objet AVANT `sceller()`,
  stockés en colonnes (liste blanche WORM de la migration 23) — la vérification de chaîne
  RELIT les valeurs stockées : un ajout légitime ultérieur (PJ sur mouvement figé, possible
  jusqu'à C3) ne casse pas la chaîne (prouvé). Au serveur, le figeage des outils est
  DÉPLACÉ AVANT le scellement (la démo figeait déjà avant — parité d'ordre rétablie) et
  `objetLogiquePourHash` passe les champs v2 au travers (le 2e point serveur du plan).
  Contre-écritures : scellées v2 SANS double signature (plan §9), listes gelées VIDES.
- **QUATRE vérificateurs versionnés — le plan n'en comptait que trois** :
  `verifierChaineMouvements` (serveur) · son miroir démo · `verifierChaineMouvementsCandidat`
  (import) · **`server/verification.js`** (vérification des ARCHIVES du coffre-fort, oublié
  du plan : sans lui, la première écriture v2 aurait rendu toute sauvegarde « invalide »
  — donc plus de condition 5 ni d'archives vérifiées). Le vérificateur autonome des ZIP
  n'est pas concerné (il hache des fichiers, confirmé).
- **La dette « prpFige falsifiable via export JSON » est SOLDÉE** pour les écritures v2
  (le PRP figé est dans l'empreinte) ; l'import RECOMPTE en plus les SIGNATURES gelées de
  chaque écriture v2 (forme canonique + sha des images) : une signature retouchée, ajoutée
  ou retirée dans le JSON → « fichier forgé » (les PJ, elles, peuvent évoluer légitimement
  après scellement tant que C3 n'a pas fermé l'asymétrie : pas de recomptage, documenté).
- **Chaîne MIXTE prouvée de bout en bout** (le cas de Franck en septembre) : registre
  rétrogradé tout v1 importé → nouvelle écriture scellée v2 par-dessus → chaîne verte,
  round-trip export/import vert. Un export ANCIEN (sans `versionEmpreinte`) = tout v1.
- **Preuves** : `test-hash-mouvement` 20 → 32 vérifs (**empreintes v1 et v2 CONNUES,
  FIGÉES en dur** — un rouge ici est une régression, jamais une « mise à jour » —,
  v1 + champs v2 parasites = empreinte inchangée, parité v2, chaîne mixte, aides) ;
  `test-signatures-mouvement` 37 → 50 (gel recompté à la main, PJ après scellement,
  2 attaques de forge d'export, contre-écriture v2, chaîne mixte réelle + round-trip) ;
  `test-contrat` (écriture scellée v2, demo ET local) ; `test-prp-fige` : la simulation
  « vieil export » recrée désormais un VRAI fichier d'époque (v1 recalculée — retirer des
  champs en gardant des empreintes v2 fabriquait un fichier qui n'existe pas).
- **Revue adversariale multi-agents AVANT commit** (3 angles — intégrité/non-régression,
  parité, forge — chaque constat contre-vérifié PAR EXÉCUTION sur bases jetables) :
  5 constats confirmés, 4 réfutés. **Corrigés dans la foulée** :
  ① 🔴 BLOQUANT — le gel serveur décodait l'imagePng avec `Buffer.from` (tolérant : préfixe
  `data:` non retiré, caractères hors alphabet IGNORÉS — le piège que l'audit du 14/07
  avait déjà payé) quand la démo décodait strict → le MÊME fichier hostile recevait deux
  verdicts d'import OPPOSÉS, et le garbage adopté PERSISTAIT dans la table WORM. Décodage
  STRICT unifié (`decoderBase64Pj`, illisible → octets vides) : pollué REFUSÉ des deux
  côtés, préfixe `data:` (mêmes octets) toléré des deux côtés. Corrigé avant tout
  scellement réel — les hash gelés en base en dépendaient.
  ② 🟠 IMPORTANT — RÉTROGRADER une écriture v2 en v1 dans un export (champs gelés effacés,
  chaîne v1 re-dérivée) désarmait le recomptage des signatures : la signature falsifiée
  était adoptée. Fermé : une écriture scellée en v1 ne peut PAS porter de signatures (la
  table naît avec la v2, le WORM refuse toute signature sur figé) → « fichier forgé ».
  ③ 🟡 MINEUR — ordre des contrôles d'import aligné sur la démo (chaîne PUIS signatures) :
  mêmes messages, dans le même ordre, sur un fichier à double faute.
  Le constat « PJ CERFA_FINAL truquée dans un export adoptée sans casser la chaîne »
  (réel, tiré) est ACTÉ au périmètre C3 (plan §7.4 enrichi : fermer l'asymétrie PUIS
  recompter hashPiecesJointes à l'import). Les 3 attaques corrigées sont devenues des
  tests permanents. Réfutés notables : « recomptage cosmétique car tout est re-dérivable
  hors ligne » = la limite CONNUE et documentée (aucun secret embarqué — c'est le témoin
  quotidien du lot D et le journal chaîné qui couvrent la réécriture totale).
  **Comptes finaux : test-signatures-mouvement 53 vérifs · test-contrat 308 ×2 ·
  test-hash-mouvement 32. TOUT VERT — 78 exécutions.**

### ✍️ LOT C audit-proof — brique C1 : signatures RÉELLES (condition 3, 18/07)
Première brique du lot C (`docs/PLAN-LOT-C.md`, suivi à la lettre — C0 validée par Franck
le 16/07). Le parcours de double signature existe, s'invalide à la moindre modification,
et se prouve ; l'empreinte v2 (C2), le PDF conservé (C3), l'interface (C4) et la bascule
du verrou (C5) suivent. Le mode Officiel reste FERMÉ (`VERROU_LIVRAISON`).
- **Migration 23 (COMPLÈTE pour tout le lot C — une migration est immuable)** :
  `mouvements.version_empreinte` (DÉFAUT 1) · `revision_brouillon` (DÉFAUT 0) · 4 colonnes
  de champs GELÉS au scellement (`outils_figes`, `hash_signatures`, `hash_pieces_jointes`,
  `hash_pdf_final` — consommées par C2-C3) ; **table `signatures_mouvement` WORM**
  (3 triggers : jamais d'UPDATE, DELETE réservé aux signatures d'un BROUILLON, INSERT
  refusé sur écriture figée) ; `pieces_jointes` recréée (procédure migration 10) pour la
  catégorie `CERFA_FINAL` ; trigger WORM des mouvements recréé (liste blanche + 6 colonnes).
  Tout est HORS liste blanche v1 du hasseur : **chaînes existantes intactes, bit à bit**.
- **Module PUR `v8/js/data/signatures-mouvement.js`** (+ miroir littéral CommonJS
  `server/signatures-mouvement.js`) : déclarations signées EXACTES (décision §2.2 — la
  mention « , par délégation du détenteur (raison sociale) » s'insère avant le point
  final), critères d'illisibilité (décision §2.5 : jamais vide, PNG réel par nombres
  magiques, ≥ 1 Ko — plus un plafond défensif de 1 Mo, arbitrage délégué protecteur).
  La déclaration est composée par le STORE, jamais reçue du client.
- **Contrat 78 → 80 (`VERSION_CONTRAT` 5)** : `signerMouvement(mouvementId, { role,
  nom, prenom, qualite?, organisation?, parDelegation?, imagePng })` (BROUILLON seulement,
  TECHNICIEN puis DETENTEUR sur la MÊME révision, personne physique obligatoire, image
  contrôlée, empreinte du document + révision signée + identité de session en témoin —
  côté serveur) et `getSignaturesMouvement(id)` (tri JS, copies, `valide` calculé =
  versionDocument ↔ révision courante). Implémenté des DEUX côtés (parité test-contrat),
  garde de rôle OPERATEUR (l'élève-technicien signe son travail ; couverture automatique
  de test-gardes-roles).
- **Invalidation par révision (plan §4)** : `rejeterMouvement`, `ajouterPieceJointe` et
  `supprimerPieceJointe` (sur mouvement BROUILLON/SOUMIS) incrémentent
  `revision_brouillon` — bump EXPLICITE pour les tables annexes ; la soumission, elle,
  ne périme RIEN (parcours nominal signé → soumis → validé). Les signatures périmées
  restent en table (trace) ; `supprimerMouvement` emporte celles d'un brouillon (seul
  cas admis par le WORM, trace conservée au journal chaîné).
- **Moteur `blocage-officiel` (2 miroirs) — conditions 14 et 15** (niveau V, annoncées
  dans la liste validée) : faits tri-état `signatureTechnicienValide` /
  `signatureDetenteurValide` (true | false | 'PERIMEE') ; une signature périmée n'est
  JAMAIS ignorée — motif « Fiche modifiée après signature : recommencez les signatures ».
  Visible dès maintenant dans `simulerValidationOfficielle` (panneau de la modale).
- **Export/import** : collection `signaturesMouvement` portée par l'export des deux
  stores, réimportée sous triggers retirés/recréés, complétée À VIDE sur les vieux
  exports, invariants d'entrée (id unique, mouvement existant, rôle connu, révision
  finie — signature orpheline refusée). La falsification FINE d'une signature sera
  dénoncée par l'empreinte v2 (C2).
- **Preuves** : `server/test-signatures-mouvement.mjs` (37 vérifs : parité stricte
  ESM ↔ CJS des déclarations et critères, migration 23, attaques TIRÉES — désordre,
  HTML déguisé en PNG, tracé < 1 Ko, > 1 Mo, PJ après signature → périmées + refus
  détenteur, SOUMIS/figé, falsification SQL directe → 3 refus WORM, round-trip
  export/import, orpheline refusée) + bloc signatures de `test-contrat` (demo ET local)
  + `test-blocage-officiel` étendu (34 vérifs, parité sur 36 cadres).
  **TOUT VERT — 78 exécutions.** Le refus dur en validation officielle réelle sera
  re-tiré via HTTP à l'ouverture du verrou (brique C5, essai complet).

### 🏷️ LOT D audit-proof — scellement externe simple (condition 5, 16/07 soir)
Le témoin daté HORS du poste, sans DSI — ferme la limite documentée de la chaîne interne
(« une réécriture complète cohérente, disque en main, reste indétectable sans scellé conservé
hors système », db.js). Non gaté, livré dans la foulée du lot B.
- **Nouveau module `server/scellement-externe.js`** : un TÉMOIN QUOTIDIEN
  (`scellement/temoin-AAAA-MM-JJ.json`, ~1 Ko, jamais purgé) écrit dans le **dossier de
  sauvegarde configurable** (pointé vers un espace synchronisé → il quitte le poste tout seul).
  Contenu : têtes des chaînes registre + journal, compteurs, intervalle des numéros par mode,
  versions (logiciel, base/migration, empreinte SHA-256 de la table réglementaire). Chaque
  témoin embarque l'empreinte du témoin PRÉCÉDENT (mini-chaîne entre jours) et sa propre
  empreinte **auto-vérifiable par la recette embarquée dans le fichier** (un contrôleur la
  rejoue sans le logiciel). Le témoin CONSTATE (pas de verdict) ; écriture atomique.
- **Deux crochets** : au démarrage du serveur (à côté de l'archive automatique) et après
  chaque écriture scellée (même règle que le snapshot : hors transaction, best-effort ABSOLU,
  échec journalisé `SCELLEMENT_ECHEC` sans jamais bloquer). Toujours actif (pas de réglage :
  coût nul, le désactiver affaiblirait le registre). `SAUVEGARDE.md` §3 à jour.
- **Preuves** : `server/test-scellement-externe.mjs` (13 vérifs : contenu exact contre le SQL,
  empreinte recalculée par la recette, crochet RÉEL via api.appeler, chaîne entre jours,
  falsification de la veille DÉTECTÉE, dossier saboté → l'écriture scellée aboutit quand même
  et l'échec est journalisé) + vrai serveur HTTP jetable : témoin au démarrage vérifié, puis
  rafraîchi par une validation HTTP (0 → 1 écriture scellée, tête posée).
- 🔥 **Piège d'isolation attrapé et fermé** : une base jetable posée à la RACINE de mkdtemp
  faisait dériver `backups/` sur `Temp\backups`, PARTAGÉ entre les suites (les crochets
  snapshot/témoin y écrivaient depuis la condition 6). Les nouvelles suites ET
  `harnais-contrat.mjs` nichent désormais la base sous `<mkdtemp>/data/` (patron de
  test-sauvegarde). **TOUT VERT — 77 exécutions.**

### 🚧 LOT B audit-proof — blocage dur du mode Officiel (condition 2 du plan, 16/07 soir)
Deuxième lot du CAP « registre réel en septembre ». Le mode Officiel reste FERMÉ (verrou de
livraison jusqu'aux lots C-D), mais toute sa mécanique de blocage est posée, testée et TIRÉE
en conditions réelles. **⏳ GATE : la liste des conditions bloquantes attend la RELECTURE de
Franck** (`docs/CONDITIONS-BLOCANTES-OFFICIEL.md` — 13 conditions, 1 ligne chacune ; chaque
ligne = une entrée du moteur, retouche triviale).
- **Moteur PUR `v8/js/data/blocage-officiel.js`** (+ miroir littéral CommonJS
  `server/blocage-officiel.js`) : `evaluerBlocagesOfficiel(cadre)` → `{ ok, blocages:[{code,
  motif}] }`, filtré par moment (PASSAGE < SOUMISSION < VALIDATION). Les conditions 1-4
  restent portées par `peutPasserEnOfficiel` (SPEC §7.2, motifs inchangés — zéro régression) ;
  le verrou de livraison est UNE constante (`VERROU_LIVRAISON`) à basculer au lot C-D.
  Parité prouvée par `server/test-blocage-officiel.mjs` (31 vérifs : limites de chaque
  condition + parité stricte ESM ↔ CJS sur 30 cadres discriminants).
- **Les 3 moments branchés des DEUX côtés** (demo-store et api.js) : `creerMouvement` (mode
  OFFICIEL demandé → refus motivé listant les blocages — remplace le refus sec du 15/07),
  `soumettreMouvement` et `validerMouvement` (fiche OFFICIEL → mêmes refus, AVANT tout effet).
  En FORMATION rien ne change : on ne bloque jamais (règle Franck).
- **VALIDATEUR DE SESSION (serveur, TOUS modes)** — le trou « qui déclaré ≠ prouvé » de
  l'audit du 15/07 est FERMÉ : `validerMouvement` et `annulerParContreEcriture` refusent
  (403, avant tout effet) un validateur qui n'est pas la personne connectée, ou un compte
  sans fiche du personnel. Sans session (harnais in-process) : repli historique, comme
  `getUtilisateurCourant` (parité du contrat). Preuves : `server/test-validateur-session.mjs`
  (12 vérifs, attaques tirées avec comptes et sessions réels).
- **Contrat 77 → 78 (`VERSION_CONTRAT` 4)** : `simulerValidationOfficielle(mouvementId)`
  (lecture, ne bloque jamais) — la liste complète des blocages comme si on validait la fiche
  en Officiel MAINTENANT. Le serveur évalue en plus la sauvegarde du poste (condition 5,
  satisfaite par l'archive automatique du démarrage — condition 6 en action) et le lien
  compte ↔ fiche de la session. Affichée dans la MODALE DE VALIDATION (panneau « Simulation
  mode Officiel », informatif, hors verrou de livraison) — prépare le parallèle de septembre.
- **Preuve en conditions réelles** (serveur jetable, vrai HTTP, cookies) : validateur forgé
  → 403 · compte sans fiche → 403 · OFFICIEL forgé → refus motivé · simulation sous session
  OK et 403 anonyme (lot A tient) · cas légitime → VALIDE. 8/8.
- **Réglage** : Opus, effort maximum (réglementaire gaté, comme convenu).
  **TOUT VERT — 76 exécutions** (74 + 2 nouvelles suites).

### 🔒 LOT A audit-proof — lectures sous session + trois durcissements (16/07 soir)
Premier lot du CAP « registre réel en septembre » (voir `docs/PROMPT-REPRISE.md`). Objectif :
fermer le blocage n°1 de l'audit externe du 15/07 (lecture anonyme en loopback) et poser trois
durcissements ciblés. **Toutes les modifs ont été TIRÉES, pas seulement lues** : chaque nouvelle
assertion échouerait contre le code d'avant le lot A.
- **Lectures sous session (le cœur)** : `serveur.js` exigeait déjà une session pour les lectures sur
  une origine LAN mais laissait le **loopback** ouvert (« confort mono-poste »). Supprimé : TOUTE
  lecture `get*` exige désormais une session, loopback compris. Seules restent atteignables sans
  session, par construction (aiguillées AVANT la garde) : `/api/ping`, et les routes d'amorçage/
  connexion de `routes-comptes` (`etatInitial`, `bootstrapAdmin`, `connexion`). Les mutations
  restaient bloquées par `garderRole`. Effet de bord voulu : une méthode INCONNUE sans session
  renvoie 403 « Session requise » (pas 501) — aucun oracle d'existence de méthode pour un anonyme.
  Preuves : `test-routes-comptes` (socket brut, famille 6 retournée), `test-transport-http` (vrai
  transport navigateur), `test-utilisateur-courant` (familles 1 et 5). Le repli historique de
  `getUtilisateurCourant` reste couvert côté démo (parité DemoStore).
- **Régression front corrigée** : `creerStore()` appelait `LocalStore.init()` (lecture désormais
  gatée) AVANT connexion → écran d'erreur au démarrage. `init()` tolère maintenant « Session
  requise » (intégrité différée) ; l'intégrité du registre est **re-vérifiée après connexion**
  (`reprendreDemarrageApresConnexion`) — sinon le bandeau audit-proof ne s'afficherait plus jamais
  en mono-poste. Vérifié en direct (base + port jetables) : base fraîche → écran « Premier
  lancement », console propre.
- **Durcissement 1 — signature binaire réelle des pièces jointes** : le store ne se fie plus au
  seul MIME déclaré. Nouvelle fonction pure `signatureConcordeAvecMime` (`contenu-pj.js`, miroir
  littéral dans `api.js`) qui contrôle les nombres magiques (PDF `%PDF`, PNG, JPEG, WebP RIFF/WEBP).
  Un HTML/exécutable déguisé en `.png` est refusé des DEUX côtés du contrat. Fixtures de test
  corrigées (vrais octets PNG/PDF au lieu de texte).
- **Durcissement 2 — CSP en en-tête HTTP** : `serveur.js` sert `Content-Security-Policy` sur toutes
  les réponses statiques, avec `frame-ancestors 'none'` (que la balise `<meta>` ne peut pas
  exprimer). La meta-CSP de `index.html` reste en place (indispensable au Mode Démo sur Pages).
- **Durcissement 3 — phrase de sauvegarde ≥ 14 caractères** : `sauvegarde.sauvegarder()` refuse à la
  CRÉATION une phrase chiffrée trop courte (le seuil ne touche jamais la restauration d'anciennes
  sauvegardes, ni la sauvegarde auto qui ne chiffre pas). Validation front alignée (`views/sauvegarde.js`).
- **Réglage** : Opus, effort élevé (incrément cadré non gaté). **TOUT VERT — 74 exécutions.**

### 💾 SAUVEGARDES RÉELLEMENT AUTOMATIQUES — condition 6 SOLDÉE (16/07 soir)
Décisions Franck : **R-455A = 148 DÉFINITIF** (logiciel à usage interne — pas de question DGPR ni
de signature formelle, la table réglementaire est **CLOSE**) et « **finir le logiciel** ». Sur les
trois axes du cadrage (législation ✓ ce matin, ergonomie ✓), le trou restant était l'axe
**SAUVEGARDE** : la sauvegarde automatique était promise mais absente. Fermé :
- **Nouveau module `server/sauvegarde-auto.js`** (aucun nouveau chemin de sauvegarde : il orchestre
  le coffre-fort existant — VACUUM INTO, manifeste, rotation GFS, journal chaîné).
- **Au démarrage du serveur** : ARCHIVE complète si la dernière archive valide date de plus du
  seuil réglé (24 h par défaut, borné 1-720 h), puis **VÉRIFIÉE aussitôt** (testerSauvegarde :
  intégrité physique, clés étrangères, chaînes registre + journal). Compte-rendu en console.
- **Après chaque écriture SCELLÉE** (validation de mouvement, contre-écriture) : **SNAPSHOT**
  débouncé (au plus un par 10 minutes) — le filet anti-erreur-humaine du plan. Crochet posé dans
  `api.appeler()` APRÈS la transaction, **jamais bloquant** : un échec de sauvegarde s'affiche et
  se journalise (`SAUVEGARDE_ECHEC`) mais ne gêne jamais ni le démarrage ni la validation.
- **Réglages** : actif par défaut (l'exigence n°1 : jamais de perte), interrupteur + intervalle à
  l'écran Sauvegarde (routes `lireReglagesSauvegarde`/`definirReglagesSauvegarde` étendues).
- **`SAUVEGARDE.md` enfin honnête dans l'autre sens** : la sauvegarde périodique n'est plus
  « prévue », elle est LÀ (doc alignée, stratégie 3-2-1 mise à jour).
- **Preuves** : famille 15 de `test-sauvegarde` (archive due créée ET vérifiée · rejouée aussitôt =
  rien · désactivation par réglage · bornes d'intervalle · débounce · trace au journal · crochet
  d'intégration RÉEL via api.appeler) ; et le VRAI serveur démarré sur base jetable : « Archive
  automatique créée et VÉRIFIÉE » + fichier présent. ⚠️ Piège attrapé avant livraison :
  `Number(null) = 0` aurait réduit un intervalle EFFACÉ à 1 h au lieu du défaut 24 h.
  **TOUT VERT — 74 exécutions.**

### ⚖️ AVIS RÉGLEMENTAIRE DU 16/07 APPLIQUÉ — PRP F-Gas III + garde-fous protecteurs (16/07 après-midi)
Un « Avis de validation réglementaire » (16/07/2026, reçu de Franck — avis technique documenté,
validation formelle NON signée à ce stade) répond aux 10 questions du questionnaire. Arbitrage
Franck : « au mieux du point de vue F-Gas, compromis le plus protecteur, jamais bloquant ».
- **CONFIRMÉ sans changement** (le code était déjà conforme) : règles A/B/C, seuils dont HCFC
  **2 kg**, date HFO **11/03/2024** + moteur versionné par date, CERFA 15497*04 = version
  officielle actuelle. Deux affirmations fausses de nos documents corrigées (le 2024/573 est
  directement applicable depuis le 11/03/2024 ; le CERFA *04 est postérieur et INTÈGRE F-Gas III).
- **Migration 22 `prp_fgas3`** : PRP **R-1234yf 4 → 0,501** et **R-290 3 → 0,02** (annexes du
  règl. UE 2024/573) — **conditionnels** (jamais d'écrasement d'une valeur ajustée localement,
  motif migration 20), sources PRP alignées. **R-455A garde 148** = choix conservatoire (déclenche
  le contrôle plus tôt), réserve écrite à lever auprès de la DGPR (148 vs ≈ 145,53 — texte prêt
  au §8 de l'avis). Sans effet sur le déclenchement des contrôles (HFO/HC en kg ou hors périmètre)
  ni sur le PRP FIGÉ des mouvements validés (non rétroactif, acté).
- **Q10 R-404A — « blocage contrôlé » rendu en version CONSEIL** : bandeau d'avertissement NON
  bloquant à l'étape bouteille du wizard quand une MAINTENANCE (CHARGE_APPOINT, pas la mise en
  service d'un équipement neuf) porte sur un fluide à **PRP ≥ 2 500** — le fluide VIERGE est
  interdit (réfrigération depuis le 01/01/2025, clim/PAC depuis le 01/01/2026), le
  recyclé/régénéré reste autorisé sous conditions, le motif se consigne dans la cause. Chargement
  du référentiel TOLÉRANT (sans lui : pas de bandeau, wizard intact).
- **Q5 — wording « hors périmètre »** : la fiche machine affiche désormais TOUJOURS la ligne
  « Fréquence de contrôle » — « Tous les X mois », « Aucun contrôle périodique F-Gas à cette
  charge (sous le seuil) » ou « Hors contrôle d'étanchéité F-Gas — d'autres obligations peuvent
  s'appliquer (EN 378, ICPE, constructeur) ». On ne laisse plus croire « aucune obligation ».
- **Différés en choix CONSERVATEUR documenté** (`docs/TABLE-REGLEMENTAIRE-FLUIDES.md` §1 bis) :
  exemptions hermétiques (Q8 — ne pas les coder = jamais MOINS de contrôles qu'exigé),
  multi-circuits (Q7 — équipements simples au lycée), versionnage du modèle CERFA (ira avec la
  condition 4 du plan).
- **Relecture adversariale (1 agent) : 4 constats corrigés avant commit.** ① La migration 21
  fige désormais SES littéraux (une migration est IMMUABLE — la constante partagée, elle, évolue
  avec l'import) ; ② l'import JSON et la persistance démo REJOUENT la correction des PRP
  (`corrigerPrpFgas3`, contenu de la migration 22 partagé serveur/démo) — sans quoi un export ou
  un monde localStorage antérieurs réintroduisaient 4/3 pour toujours ; la source d'un PRP ajusté
  localement n'est plus étiquetée F-Gas III (cohérence gwp/source, source inconnue = null) ;
  ③ affichage : décimales ADAPTATIVES (0,501 s'affichait « 1 », 0,02 s'affichait « 0 » dans la vue
  fluides, le bilan et son CSV) + en-têtes « GWP (AR4) » → « PRP réglementaire » ; ④ R-290 :
  source correctement libellée « AR6 GIEC (réf. règl. UE 2024/573) » (le propane n'est pas dans
  une annexe F-Gas ; valeur 0,02 = table §5 de l'avis, statut VALIDÉ).
- Tests : migration 22 aux quatre chemins (conversion 4→0,501 ; commentaire seed corrigé ; valeur
  ajustée JAMAIS écrasée NI réétiquetée ; fluide local intact) + parité PRP demo/local et
  recorrection à l'import d'un export ancien (test-contrat) + bandeau PRP automatisé (test-wizard :
  présent sur appoint PRP 3922, absent sur PRP 675, jamais bloquant). Vérifié navigateur (fiche
  machine M1/M5, bandeau présent sur R-404A, absent sur R-32, zéro erreur console).
  **TOUT VERT — 74 exécutions.**

### ⚖️ CONDITION 1 SOLDÉE — fiche explicite par fluide + portée temporelle HFO + filet renforcé (16/07)
Suite et fin du lot « moteur réglementaire unique » (plan `docs/PLAN-AUDIT-PROOF-2026.md`,
condition 1). Aucune décision réglementaire nouvelle : tout vient de la table validée
`docs/TABLE-REGLEMENTAIRE-FLUIDES.md`.
- **Fiche réglementaire EXPLICITE par fluide (migration 21)** : colonnes `contient_hfc`,
  `contient_hfo`, `categorie_cadre7` (HFC/HFO/HCFC/**AUCUNE** = hors périmètre acté) et
  `source_prp` sur la table `fluides` (hors WORM, hors chaîne de hash), remplies **par code**
  pour les 9 fluides du référentiel depuis la constante partagée `FICHE_REGLEMENTAIRE_FLUIDES`
  (exportée par `migrations.js`). Le moteur (`categorieCadre7`) lit la fiche **en priorité** ;
  la dérivation du libellé de famille (`includes`) n'est plus qu'un **repli** pour un fluide
  ajouté localement sans fiche (colonnes NULL). Fini la dépendance à un libellé ambigu
  (« HFC/HFO » vs « Mélange HFO/HFC »). Miroir serveur strict (`categorieCadre7Fluide`),
  mapping + données démo + doc du contrat alignés.
- **Portée temporelle de la Règle B** : `evaluerControle`/`frequenceControleMois` acceptent une
  `dateIntervention` optionnelle — les **HFO purs ne sont soumis au contrôle d'étanchéité que
  depuis le 11/03/2024** (règl. UE 2024/573, art. 5) ; avant cette date : aucun niveau ni
  fréquence. Date absente ou non ISO = régime courant (on ne désactive jamais un contrôle sur
  une date illisible). Appelants câblés : `calculerProchainControle` (demo + serveur, la date du
  contrôle fixe le régime) et le **cadre 7 du CERFA** (date d'intervention du mouvement — une
  fiche HFO antérieure au 11/03/2024 ne coche plus aucune case de seuil). HFC/HCFC et mélanges
  insensibles à la date (prouvé aux valeurs limites). ⏳ Question ouverte pour le référent
  (rattachée au §4 Q2 de la table) : quelle échéance suggérer pour un contrôle HFO **ressaisi**
  d'avant 2024 (aujourd'hui : aucune) — rien n'est codé sans validation.
- **L'import ne détruit plus la fiche actée** (constat IMPORTANT de la revue adversariale,
  prouvé par exécution) : un export ANTÉRIEUR au lot (fluides sans fiche) passait par
  `INSERT OR REPLACE` → colonnes remises à NULL et divergence demo/local. L'import recomplète
  désormais la fiche depuis la table validée, **des deux côtés** ; une fiche explicitement
  importée n'est **jamais** écrasée ; un fluide inconnu reste sans fiche (4 clés à null —
  repli du moteur). Au passage, PROUVÉ que le NULL traverse le mapping intact dans les deux
  sens (le contre-diagnostic « versSql null→0 » du relecteur était faux, commentaire du
  mapping corrigé en conséquence) — 🔥 une faille se prouve en la TIRANT, pas en la lisant.
- **Filet renforcé (audit-qualité, lot 1)** : `server/test-gardes-roles.mjs` — les 25 méthodes
  de `ROLES_MUTATION` mises en défaut **dynamiquement** (sans rôle + rôle insuffisant choisi
  automatiquement, refus AVANT le handler, toute future méthode couverte d'office) ;
  `server/test-transport-http.mjs` — le **vrai** client HTTP (`transport-http.js`) contre le
  **vrai** serveur spawné (port jetable) : lecture dépliée, erreur du serveur propagée mot pour
  mot, Origin étranger → 403 (loopback légitime accepté), corps sans enveloppe `{params}` →
  erreur propre et le serveur survit. `test-sauvegarde` : le charcutage passe d'offsets figés
  (400-900, tombés dans l'espace **non alloué** de la page 1 après la migration 21 —
  `integrity_check` l'ignorait à bon droit) à une plage **proportionnelle 30-70 %** du fichier
  (archive VACUUM INTO = toutes pages utilisées) + garde-fou de taille minimale.
- **Parité prouvée** (`test-contrat` demo + local) : fiche identique des deux côtés (R-455A,
  R-744, R-1234yf), y compris **après import d'un export ancien**, et règle de date honorée par
  le miroir serveur (machine R-1234yf 12 kg : contrôle du 10/03/2024 → null ; du 11/03/2024 →
  2024-09-11). **TOUT VERT — 74 exécutions.**
- Méthode : Fable + ultracode (3 sous-agents Sonnet en parallèle sur fichiers disjoints, puis
  2 relecteurs adversariaux — 0 bloquant, 1 IMPORTANT corrigé, 3 mineurs traités). Le mode
  Officiel reste **fermé** (CONSEIL) ; prochaine étape = condition 2, **gatée** sur la liste
  des conditions bloquantes à valider par Franck.

### ⚖️ MOTEUR RÉGLEMENTAIRE UNIQUE — condition 1, 2 bugs du cadre 7 corrigés (15/07 soir)
Première brique du chantier « registre audit-proof » (`docs/PLAN-AUDIT-PROOF-2026.md`, condition 1).
La règle du « cadre 7 » (seuils + fréquence de contrôle d'étanchéité) était **dupliquée en trois
exemplaires qui se contredisaient** (`plaque-fgas.js`, `cerfa/generateur.js`, `server/api.js`). Table
réglementaire par fluide **préparée sur sources officielles et validée par Franck** :
`docs/TABLE-REGLEMENTAIRE-FLUIDES.md` (règles A/B/C, à annoter par le référent F-Gas).
- **Module unique** `v8/js/data/reglementation-fluides.js` (`categorieCadre7` + `evaluerControle`) =
  source de vérité ; plaque-fgas, generateur et demo-store le consomment, `api.js` en garde une copie
  littérale (CommonJS) dont la parité est prouvée par `test-contrat` (demo + local).
- **Bug n°1 corrigé — mélanges HFC/HFO** : R-455A (famille « HFC/HFO ») était classé HFO (seuils en
  kg) alors que la **notice CERFA 15497*04 le cite nommément** comme relevant de la **catégorie HFC**
  (seuils en tonnes éq. CO₂). On teste désormais HFC/PFC **avant** HFO. Effet : R-455A à 3,2 kg =
  0,47 t éq. CO₂ < 5 → **plus de contrôle périodique indu** (le CERFA cochait `Case_HFO_1` à tort).
- **Bug n°2 corrigé — charge de référence** : seuil/fréquence calculés sur la charge **NOMINALE
  déclarée** (Règle C, FAQ DGPR : cumul des circuits, valeur fixe), non plus sur `chargeActuelleKg` —
  qui faisait *s'alléger* le contrôle d'une machine ayant fui.
- **HFO purs** (R-1234yf) : seuils en kg (1/10/100) **confirmés** = règlement UE 2024/573 (F-Gas III)
  art. 5, pas une invention.
- **Batterie de tests aux valeurs limites** : `test-reglementation-fluides.mjs` (sous / à / au-dessus
  de chaque seuil ; mélange R-455A ; HFO purs ; HCFC ; hors périmètre CO₂/HC). Tests qui codifiaient
  le bug **corrigés** (`test-lot2` M5 → null ; `test-contrat` hors-périmètre = fluide non fluoré ;
  `test-generateur` cadre 7 de M5 → aucune case). **TOUT VERT — 72 exécutions.**
- Le **mode Officiel reste fermé** (le serveur refuse OFFICIEL) : on est en mode CONSEIL. Suite de la
  condition 1 plus tard (fiche explicite par fluide en base, prise en compte de la date
  d'intervention) ; questions secondaires gatées au §4 du doc pour le référent F-Gas.

### 🔒 RETOUR AUDIT EXTERNE — verrou mode Officiel + honnêteté doc (15/07, « paquet A »)
Un tiers (ChatGPT) a audité le **code source complet** (archive `git archive`, SHA `2DA4…E885`) : SHA
vérifié, 71 tests verts, requêtes hostiles jouées. Correctifs nets sans arbitrage réglementaire :
- **Verrou du mode Officiel côté serveur** (défaut reproduit par l'auditeur) : l'API acceptait
  `mode:'OFFICIEL'` sans aucun contrôle → `creerMouvement` (serveur **et** DemoStore, parité) **refuse**
  désormais toute demande OFFICIEL tant que le mode n'est pas prêt (il manque le blocage dur et la
  signature du détenteur). Test de rejet ajouté (`test-contrat`). Le mode Officiel complet
  (`peutPasserEnOfficiel` appelé + double signature) viendra pour la distribution entreprise.
- **Wording** : « inviolable » → « **inaltérable au sein de l'application** » (README) — juste : une
  manipulation directe du fichier de base relève du chiffrement disque, pas du logiciel.
- **Honnêteté doc sauvegarde** (`SAUVEGARDE.md`) : la sauvegarde périodique automatique était **promise
  mais absente** (aucun planificateur) → doc alignée sur la réalité (manuelle + sécurité avant
  restauration) ; la vraie sauvegarde auto au démarrage reste à implémenter.
- **README** : ligne « Mode Officiel · local · Oui » → « pas encore, version formation ».
- **`SECURITE.md`** : adresse de signalement des vulnérabilités complétée (`inerweb.fh@gmail.com`).
- **TOUT VERT — 71 exécutions.**

### 🩹 CERFA DE CONTRÔLE — numéro de fiche + mode (défaut majeur de l'audit, 15/07)
Le CERFA généré depuis un **contrôle** (pas un mouvement) affichait l'identifiant technique
`ctl-…` au lieu d'un numéro de fiche, et restait **toujours en mode OFFICIEL** → un contrôle fait
**en formation** ressortait **sans filigrane**, d'apparence officielle. Cause : `enregistrerControle`
ne posait ni `numero` ni `mode`. Correctif : chaque contrôle porte désormais un numéro + un mode.
- **Migration 19** : `ADD COLUMN numero/mode` sur `controles` (table **hors WORM**, hors chaîne de
  hash des mouvements → aucun risque) + backfill des bases existantes.
- **Contrôle LIÉ à un mouvement** (CR-3) : **hérite** du numéro et du mode du mouvement (une seule
  identité de fiche pour une même intervention).
- **Contrôle AUTONOME** : numéro **dédié `C-FORM-AAAA-NNNN` / `C-FI-…`**, espace **disjoint** des
  mouvements → **aucune collision** possible, et **la numérotation des mouvements (qui entre dans
  l'empreinte) reste intacte**. Mode FORMATION par défaut (outil pédagogique) → le filigrane
  FORMATION s'applique enfin aux CERFA de contrôle.
- Parité DemoStore/LocalStore stricte (`prochainNumeroControle` miroir), `mapping.controles` complété
  (sinon `getControles` casse). Prouvé : migration + backfill (lié hérite, autonome numéroté, zéro
  collision) en Mode Local ; test-generateur (numéro + mention FORMATION) en Démo ; nouvelles
  assertions dans `test-contrat` (parité) et `test-migrations`. **TOUT VERT — 71 exécutions.**
- ⏳ **Non embarqué dans une release** pour l'instant : sera groupé avec les correctifs réglementaires
  en attente de validation de Franck (R-1234yf, mélanges HFC/HFO, `cessions_kg`) → futur paquet v1.0.2.

### 🔎 AUDIT COMPLET + CORRECTIFS → paquet v1.0.1 (15/07)
Audit technique, réglementaire et RGPD mené sur le code complet, **en conditions réelles** (serveur
sur base jetable, failles **tirées** et non lues). **Socle de sécurité sain** : registre WORM
inviolable même par SQL direct (DELETE/UPDATE/`INSERT OR REPLACE` refusés), rôles verrouillés (élève
ne peut valider), injection SQL bloquée, verrou anti-force-brute, chiffrement AES-256-GCM **réel**
(altération d'un octet détectée). Aucune faille exploitable. Rapport détaillé : `docs/AUDIT-COMPLET-2026-07-15.md`
(**interne, exclu du dépôt** — il reproduit des tests d'intrusion). Trois correctifs appliqués :
- **Licence de Node.js embarquée** (obligation MIT non remplie jusqu'ici) : le paquet portable
  distribuait `node.exe` sans sa notice. `NODE-LICENSE.txt` = LICENSE officiel de Node v24.16.0
  (Node.js + tous ses composants), copié dans le paquet sous `node/LICENSE` ; `fabriquer-paquet.mjs`
  **refuse de produire** un paquet sans elle ; `LICENCES-TIERCES.md` crédite Node.js.
- **Wording de licence** (`LISEZ-MOI.txt` + vitrine) : décision Franck 15/07 = **gratuit pour
  l'enseignement, usage professionnel sur simple demande** (licence nominative offerte par le lycée).
  Le `LISEZ-MOI` disait « gratuite » tout court (faux + décourageant). PolyForm Noncommercial conservée
  (Franck garde la main pour d'éventuelles licences payantes futures).
- **`X-Frame-Options: SAMEORIGIN`** posé sur les réponses statiques (anti-clickjacking — la meta-CSP
  ne peut pas poser `frame-ancestors`). Prouvé au serveur.
- **TOUT VERT — 71 exécutions.** Paquet refabriqué (35,4 Mo), extraction + démarrage prouvés,
  nouvelle empreinte `ad27b1e7…0f00`, Release **v1.0.1**.
- ⏳ **Restent, non traités ici** (choix Franck) : CERFA issu d'un contrôle (n° technique + mode
  toujours OFFICIEL), points réglementaires (R-1234yf, mélanges HFC/HFO, `cessions_kg`), confort RGPD
  (export par personne, effacement). Détail et priorités dans le rapport d'audit interne.

### 📖 GUIDE ILLUSTRÉ + LECTURE VOCALE (15/07)
`guide.html` : le mode d'emploi complet qui prend le collègue par la main, écran par écran.
- **Sommaire à tiroirs** (les grandes lignes → installer/démarrer → renseigner/utiliser → quand ça
  bloque), avec surlignage de la section courante. **Dix étapes** dans l'ordre d'usage : installer,
  créer l'administrateur, établissement/personnel, machines/bouteilles/clients, intervention+CERFA,
  contrôles/fuites, balance/inventaire, dossier d'audit, sauvegarde, rôles prof/élève.
- **Les points de blocage sont EXPLIQUÉS, pas contournés** : écriture validée non modifiable
  (→ contre-écriture), fuite ouverte qui interdit le complément de gaz, élève qui ne peut pas valider,
  mode Officiel indisponible, mouvement incohérent sur bouteille. Encadrés dédiés + récapitulatif final.
- **17 captures d'écran faites en mode DÉMO** (données fictives, RGPD), dont 13 intégrées au guide.
  **Aucune capture inventée** : les flux sans capture obtenue (installation système, écran de création
  d'administrateur, assistant 6 étapes) sont décrits par le texte, pas illustrés par une fausse image.
- **Lecture vocale (`speechSynthesis`)** : un bouton « Écouter cette étape » par section, voix
  française, **native, gratuite, hors ligne, zéro dépendance**. Repli propre : si aucune voix n'est
  disponible, les boutons se masquent.
- **`outils/prendre-captures.mjs`** (nouvel outil d'emballage) refabrique les 17 captures d'un coup en
  pilotant Chrome/Edge en headless via CDP (WebSocket natif de Node, aucune dépendance). Quand le
  logiciel bouge, les captures se régénèrent — elles ne pourrissent pas.
- Vérifié par le navigateur : **13 images chargées**, 12 sections, 12 boutons vocaux câblés,
  **0 erreur console**, tous les liens du sommaire justes. Charte identique à la vitrine, page autonome.
- ⚠️ **Réserve outillage** : la capture des pages HTML autonomes (vitrine/guide) n'a pas pu être
  automatisée sur ce poste aujourd'hui (aperçu intégré en panne + Chrome headless instable après
  plusieurs lancements). La vérification **structurelle** (contenu, liens, images, scripts) est faite ;
  le **coup d'œil esthétique final** revient à Franck.

### 🏠 VITRINE — la page d'accueil publique (15/07)
`index.html` à la racine n'est plus une simple redirection : c'est la **vitrine** du logiciel.
- Ce qu'il fait, pour qui, et **ce qui le distingue** (registre inaltérable à hash chaîné, dossier
  d'audit scellé + vérificateur autonome, dossiers de fuite fermés, pensé pour la classe, 100 % local,
  gratuit pour l'enseignement). Bouton **Télécharger** (→ Release v1.0.0), lien **démo** (`v8/`),
  lien **guide** (`guide.html`), empreinte SHA-256 affichée avec sa commande de vérification.
- Charte de l'application reprise à l'identique (marine `#0e2a47`, turquoise `#12b5c9`, IBM Plex Sans,
  flocon officiel, **zéro emoji**). Page **autonome** : aucune police web, aucun script distant.
- Sans risque pour l'usage local : le serveur redirige `/` → `/v8/` **dans son code**, et le paquet
  portable ne contient pas cet `index.html` — la vitrine ne vit que sur le site public.
- **Formule honnête** reprise telle quelle : « implémente la lecture de la réglementation F-Gas par
  son auteur, **en mode conseil** ». Aucune promesse de blocage dur « Officiel ».
- ⚠️ **Le texte reste à faire valider par Franck** — c'est sa vitrine.

### 🚀 DIFFUSION — Release publique v1.0.0 (15/07)
Le paquet portable devient **téléchargeable** par n'importe quel collègue, sans compte ni outil.
- **Release GitHub `v1.0.0`** (publique, pas une pré-version) : elle porte
  `inerWeb-Fluide-portable.zip` (35,4 Mo) **et** son empreinte `inerWeb-Fluide-portable.zip.sha256`.
  Notes de version en français : télécharger, **débloquer** (Windows marque les fichiers d'Internet),
  décompresser, double-cliquer ; commande `certutil` pour vérifier l'empreinte ; licence PolyForm.
- **Intégrité prouvée de bout en bout** : le ZIP a d'abord été **extrait sur un dossier vierge et
  démarré** (serveur du paquet répond, page servie) ; puis **re-téléchargé depuis la Release** et son
  SHA-256 recalculé — **identique** à l'original (`b5efa7da…5f06`). GitHub ne l'a pas altéré.
- Le bouton « Télécharger » de la vitrine pointe sur l'asset de cette release.

### 📦 PAQUET COMPRESSÉ — 92,6 Mo → 35,4 Mo (14/07)
Le paquet portable est un fichier de **téléchargement** : sur la connexion d'un lycée, 92 Mo contre
35 Mo, c'est la différence entre dix minutes et trois.
- **La compression est écrite dans l'OUTIL, pas dans le produit.** `server/zip-node.js` écrit du
  « stored » (non compressé) et il est le **miroir exact** de `v8/js/core/zip.js`, dont dépendent
  les **dossiers d'audit scellés** et leur **vérificateur autonome hors ligne**. Y ajouter une
  option de compression aurait touché au cœur du coffre-fort pour un simple confort de
  téléchargement. `outils/fabriquer-paquet.mjs` écrit donc son propre ZIP **deflate** (`node:zlib`,
  natif, zéro dépendance) : en-têtes locaux, répertoire central, CRC-32, noms UTF-8.
  **`zip-node.js` et `zip.js` n'ont pas une ligne de modifiée** (vérifié : aucun diff).
- Résultat : **35,4 Mo, soit 62 % de moins**. **Éprouvé pour de vrai** : extraction par le lecteur
  ZIP **natif de Windows** (`Expand-Archive`) sans erreur, 128 fichiers restitués, et le
  **`node.exe` extrait DÉMARRE** (`v24.16.0`) — un binaire de 88 Mo mal compressé ne s'exécuterait
  pas. C'est la preuve que l'archive est correcte, pas seulement plus petite.
- **TOUT VERT — 71 exécutions.**

### 🛡️ PROTECTION DU LOGICIEL — ce qui marche, et ce qui n'existe pas (14/07)
Franck demandait s'il fallait « chiffrer le code pour éviter le piratage ». **Réponse donnée, et
assumée : c'est impossible, et il ne faut pas le vouloir.** Le code s'exécute chez l'utilisateur —
donc il doit être lisible par la machine qui l'exécute, donc par un humain (c'est la règle d'or que
Franck s'est lui-même donnée pour inerWeb Pilote : « aucun secret dans le navigateur élève »).
L'obfuscation freine un curieux vingt minutes, casse le débogage, et interdit à un collègue de
lire un logiciel qu'on veut lui **donner**. La vraie protection est **juridique** (la licence) et
**probatoire** (l'historique git public horodaté = preuve d'antériorité).
En revanche, la menace RÉELLE — qu'un tiers distribue un faux « inerWeb Fluide » vérolé sous le nom
de l'auteur — se traite, et se traite ici :
- **`outils/fabriquer-paquet.mjs`** calcule désormais l'**empreinte SHA-256** de l'archive et écrit
  un fichier `.zip.sha256` (format standard `sha256sum -c`). Il affiche l'empreinte à publier à
  côté du lien de téléchargement, et la commande de vérification pour l'utilisateur : Windows
  (`certutil -hashfile … SHA256`, natif, rien à installer) ou Linux/Mac (`sha256sum`).
  **Contrôle croisé fait** : l'empreinte annoncée et celle calculée par `certutil` sont identiques.
  C'est le même principe que le scellement des dossiers d'audit — appliqué au logiciel lui-même.
- **Ligne de licence en tête de 168 fichiers source** (`v8/`, `server/`, `outils/`, `index.html`) :
  « inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh ».
  Qui ouvre un fichier sait immédiatement à qui il appartient et à quelles conditions.
  ⚠️ **`v8/js/lib/` est INTOUCHÉ** (PDF.js, pdf-lib, qrcodejs : bibliothèques tierces, leurs
  notices leur appartiennent). Pièges traités : le shebang de `creer-admin.js` reste en ligne 1,
  `'use strict'` reste la première *instruction* (un commentaire au-dessus est légal), et le
  commentaire HTML est posé **après** le doctype (avant, il basculerait les vieux navigateurs en
  mode « quirks »). **TOUT VERT — 71 exécutions.**
- ⚠️ **À traiter à la publication** : l'archive est en format « stored » (**non compressée**),
  d'où 92 Mo. Un vrai ZIP compressé tomberait vers 35-40 Mo. À arbitrer au chantier de diffusion.

### ⚖️ LICENCE — gratuit pour l'enseignement, payant pour le commerce (14/07)
Décision de Franck avant la diffusion : **gratuit pour les lycées, payant pour les entreprises**.
Une licence « maison » aurait été un piège juridique — on prend une licence **prête, rédigée par
des juristes**, qui dit exactement cela.
- **`LICENSE`** : passage de MIT à **PolyForm Noncommercial 1.0.0** (texte officiel intégral, tiré
  de polyformproject.org). Sa section « Noncommercial Organizations » vise **explicitement** les
  institutions éducatives et gouvernementales, *quelle que soit leur source de financement* : un
  lycée, un CFA, une université sont donc gratuits **de droit**. L'usage commercial (société de
  froid, bureau d'études, organisme de formation privé, éditeur) exige une licence distincte.
  Préambule en français en tête du fichier, pour que ce soit lisible sans juriste.
- ⚠️ **Le passé reste MIT** : le dépôt est PUBLIC depuis des mois et une licence MIT accordée est
  **irrévocable**. Les versions publiées avant ce jour restent utilisables sous MIT par qui les a
  récupérées. Le changement vaut **pour la suite** — c'est dit noir sur blanc dans le README.
- **`LICENCES-TIERCES.md` (nouveau, obligation légale non remplie jusqu'ici)** : le dépôt embarque
  **PDF.js (Mozilla, Apache 2.0)**, pdf-lib (MIT, + `tslib` © Microsoft, Apache 2.0) et qrcodejs
  (MIT). La licence Apache 2.0 **exige** que ses notices accompagnent toute redistribution. Le
  fichier crédite chaque bibliothèque, son auteur, sa licence et son rôle.
- **`outils/fabriquer-paquet.mjs`** embarque désormais `LICENCES-TIERCES.md` dans le paquet
  portable : sans lui, chaque copie distribuée aurait été en infraction.
- Paquet portable vérifié : **92,6 Mo** (dont 88 Mo de `node.exe` embarqué) — rien à installer.

### 🔐 VERROUS D'AUTORISATION — le filet avant la diffusion (14/07, Lot 1 de l'audit)
Décision de Franck : le logiciel va être diffusé à d'autres établissements → **il y aura de vrais
élèves connectés ailleurs**. On verrouille donc les autorisations par des tests AVANT de partir.
Le trou : la garde de rôle est une **liste blanche** — toute méthode absente de `ROLES_MUTATION`
est traitée comme une lecture, donc exécutée **sans aucune restriction** (`garderRole` :
« if (!roles) return; »). L'invariant tenait par la seule vigilance : **aucun test ne le
vérifiait**. Une brique future qui ajouterait un handler mutant en oubliant sa ligne de rôle
ouvrirait la mutation à tout le monde, silencieusement, sans un seul test au rouge.
- **`server/test-roles-mutations.mjs` 11/0** — lit le SOURCE de `api.js`, découpe l'objet
  `HANDLERS`, et prouve : ① les **42 handlers qui appellent `muter()`** ont tous une entrée de
  rôle ; ② aucune entrée de `ROLES_MUTATION` ne pointe dans le vide ; ③ **les 43 méthodes gardées
  refusent toutes un rôle insuffisant (403)** — y compris « aucune session » pour celles ouvertes
  à tous les rôles ; ④ contre-épreuve : un rôle autorisé franchit la garde (sinon le test ③ serait
  satisfait par une garde qui refuse tout le monde) ; ⑤ nommément, **un ÉLÈVE ne peut ni valider un
  mouvement, ni créer ou révoquer une habilitation, ni désactiver une personne, ni importer un
  registre**.
- `init` est **figé comme la SEULE écriture tolérée hors garde** (amorçage idempotent appelé au
  tout premier démarrage, avant qu'aucun compte n'existe — sans lui, impossible de créer le 1er
  ADMIN). Ce n'est plus un oubli, c'est un choix que le test protège.
- **TOUT VERT — 71 exécutions.**

### 🧹 MÉNAGE — la v7 quitte la racine (14/07)
Constat de l'audit (MORT-1/MORT-2) : **13 274 lignes de v7 dormaient à la racine**, servies par le
serveur (`CHEMINS_INTERDITS` ne les excluait pas) et jamais testées — dont
`js/cerfa_html_backup.js` (869 l.), **zéro référence dans tout le dépôt**. Pire : `index.html` à la
racine était **l'ancienne démo v7 elle-même**, donc un visiteur du dépôt GitHub Pages tombait sur
la version périmée au lieu de l'application.
- **Supprimés** : `js/` (18 fichiers), `css/style.css`, `demo.html`.
- **`index.html`** devient une **page de redirection** vers `/v8/` (meta refresh + `location.replace`,
  aux couleurs du produit) : la démo publique ouvre enfin la BONNE application.
- Rien d'autre n'est touché : le PDF CERFA officiel utilisé par la v8 vit déjà dans `v8/`, et
  `sw.js` est déjà le service worker de « sabordage » (il purge le cache v7 et se désenregistre).
- Vérifié navigateur (origine neuve 2089) : `/` redirige vers `/v8/`, l'application se charge
  (17 entrées de menu), **zéro erreur console**. **TOUT VERT — 70 exécutions.**

### 🕵️ TÉMOIN D'IDENTITÉ au journal d'audit (14/07) — « on n'empêche pas la déclaration, on la recoupe »
Réponse à la réserve la plus profonde de l'audit : **le « qui » du registre était déclaré par le
client, jamais prouvé par la session** (aucun des 43 handlers mutants ne lisait `contexte` ;
`validerMouvement` scellait au nom du `validateurId` reçu dans le CORPS de la requête). Décision
de Franck, partagée : le registre F-Gas est **déclaratif par nature** — celui qui signe engage sa
responsabilité, comme sur le CERFA papier, et le logiciel n'a pas à refuser une déclaration. Ce
qui est opposable, c'est l'INALTÉRABILITÉ, et elle est acquise. On ne refond donc pas les
43 handlers : **on recoupe**.
- **`server/api.js`** : `appeler()` pose la session de l'appel en cours (et la remet à null dans un
  `finally` — sans quoi une session « fuirait » sur l'appel suivant, y compris un appel sans
  session : c'est le vrai piège du montage, il est testé). `journaliser()` consigne désormais
  l'auteur **RÉEL** (`Prénom Nom (login)` du compte de session), et garde le nom déclaré à côté
  quand il diffère : « auteur déclaré : X ».
- **Libellé volontairement NEUTRE**, car les deux cas sont légitimes : le professeur connecté qui
  saisit une intervention faite par un élève (usage courant), et l'élève qui signerait au nom de
  son professeur (usage suspect). **Le journal ne tranche pas, il enregistre.**
- **La trace est ineffaçable** : le journal est en AJOUT SEUL (le déclencheur WORM refuse tout
  `UPDATE` — vérifié), et `details` entre dans l'empreinte chaînée (un outil externe qui
  contournerait les déclencheurs casserait la chaîne).
- **Parité intacte** : sans session (loopback en lecture, harnais de test, CLI), le comportement
  reste STRICTEMENT celui d'avant — donc identique au DemoStore. `test-contrat` inchangé.
- Tests : **`server/test-journal-identite.mjs` 10/0** (auteur réel ; élève déclarant son
  professeur → journal nomme l'élève + consigne la divergence ; effacement REFUSÉ par le WORM ;
  chaîne intacte ; **aucune fuite de session d'un appel à l'autre**). **TOUT VERT — 70 exécutions.**

### 🙈 AUDIT QUALITÉ — Lot 0, brique 3 : l'attribut `hidden` ne masquait RIEN (14/07)
Une ligne de CSS, un défaut présent dans toute l'application. Le navigateur ne donne à `hidden`
qu'un `display: none` de sa feuille utilisateur-agent — que **n'importe quelle règle d'auteur
posant un `display` écrase** (une règle de l'auteur bat celle du navigateur, quelle que soit la
spécificité). Or `.btn` (`composants.css:11`), `.badge-rouge` (:302), `.pied-session` (:1193) et
`.chip` en déclarent tous un. Résultat : le code avait beau faire `element.hidden = true`, **le
bouton « Réinitialiser » des filtres, le badge d'alertes et le pied de session restaient
AFFICHÉS**. La passe de vérification de la veille avait même cru voir « l'apparition du bouton » :
il n'apparaissait pas, il était là depuis le début.
- **`v8/css/tokens.css`** (au reset) : `[hidden] { display: none !important; }`.
- Vérifié navigateur (origine neuve 2088, mode Démo) : sans filtre le bouton est `display: none` ;
  dès qu'un critère est actif il apparaît ; après réinitialisation il **se re-masque**, la
  recherche est vidée, les 4 listes reviennent à « Tous », le compteur repasse à « 7 mouvements »
  et les 7 lignes réapparaissent. Témoins anti-régression : les 4 classes masquent correctement
  quand `hidden`, et gardent leur `display` normal sinon. ⚠️ Le navigateur intégré a de nouveau
  cessé de délivrer les événements souris en cours de passe (`elementFromPoint` confirme pourtant
  la bonne cible, et le screenshot expire) : le dernier clic a été déclenché par `bouton.click()`
  — même gestionnaire, même chemin, seul `isTrusted` diffère. Le clic SOURIS réel de
  « Réinitialiser », lui, avait été prouvé plus tôt dans la journée (origine 2087).
- **TOUT VERT — 69 exécutions.**

### 🔒 AUDIT QUALITÉ — Lot 0, brique 2 : chemins des pièces jointes (14/07)
**L'audit s'était TROMPÉ, et c'est le test écrit pour le prouver qui l'a démenti.** Le rapport
classait BLOQUANT le fait qu'un `chemin` forgé dans un fichier d'import soit réinjecté
(`api.js`), puis lu (`fs.readFileSync`, sans rôle) et SUPPRIMÉ (`fs.unlinkSync`, rôle OPERATEUR
= ÉLÈVE). **Faux** : `mapping.versSql` lève sur toute clé inconnue (« anti-dérive »,
`mapping.js:659`) et il est appelé UNE LIGNE PLUS HAUT — l'import portant un `chemin` échouait
net, la ligne incriminée était du **code mort**. Deux agents, leur contre-vérificateur et
moi-même avions raisonné la chaîne d'appels sans l'exécuter. **Leçon : une faille se prouve en la
tirant, pas en la lisant.** Rapport rectifié (`docs/AUDIT-QUALITE-2026-07.md`).
- **Ce qui était RÉELLEMENT ouvert** : l'`id`, lui, EST une clé connue du mapping. Un identifiant
  forgé (`../../DOCUMENT-PRIVE.txt`) entrait en base, et `sauvegarde.js:261` reconstruisait
  `path.join(dossierDocuments(), pj.id)` sans validation → **un fichier arbitraire du poste
  pouvait être lu, haché et SCELLÉ dans l'archive** (ou, empreinte différente, rendre TOUTE
  sauvegarde impossible — déni de service sur l'exigence n°1). Étroit (il faut un fichier
  délibérément modifié, importé par un REFERENT), mais réel.
- **`server/api.js`** : nouvelle fonction `cheminPieceJointe(id)` — le chemin disque d'une PJ est
  désormais TOUJOURS recalculé depuis son id (jamais lu de la donnée), et l'id est validé
  (`/^[A-Za-z0-9_-]+$/`, aucune traversée possible). `ajouterPieceJointe` stocke un chemin
  RELATIF (= l'id), comme `schema.sql:520` le promettait depuis le début ; `obtenirPieceJointe`,
  `supprimerPieceJointe` et `reinsererPiecesJointes` passent tous par elle.
- **Invariants d'import, des DEUX côtés** (`api.js` + `demo-store.js`, mot pour mot) : un id de
  pièce jointe hors alphabet est refusé À L'ENTRÉE (« pièce jointe X : identifiant invalide »),
  avant tout effet.
- **`server/sauvegarde.js`** : chemin recalculé depuis l'id (jamais la colonne `chemin`) + garde
  sur l'id. **Correction d'un bug latent au passage** : une PJ importée SANS contenu (trace seule,
  cas documenté) faisait échouer toute sauvegarde (« fichier introuvable — l'archive serait
  incomplète ») ; elle est maintenant simplement sautée. On distingue désormais « contenu jamais
  reçu » (on saute) et « preuve disparue » (on refuse de sceller).
- **Dette ROADMAP « `pieces_jointes.chemin` absolu » SOLDÉE** : le chemin étant recalculé, une base
  restaurée sur un AUTRE poste retrouve ses pièces justificatives (elles étaient jusqu'ici
  physiquement présentes mais introuvables).
- Tests : **`server/test-pieces-jointes-chemin.mjs` 9/0** — la PJ ordinaire, l'anti-dérive du
  mapping (garantie qui n'était prouvée NULLE PART), l'id forgé refusé à l'import, la sauvegarde
  qui refuse un id invalide (le fichier privé du poste reste intact et jamais scellé), et la
  portabilité (chemin hérité d'un autre poste). **TOUT VERT — 69 exécutions.**

### 🔴 AUDIT QUALITÉ — Lot 0, brique 1 : les pièces jointes étaient DÉTRUITES en Mode Local (14/07)
Défaut BLOQUANT trouvé par l'audit qualité (`docs/AUDIT-QUALITE-2026-07.md`) et prouvé de bout
en bout. **Aucune donnée perdue chez Franck** (vérifié : `data/documents/` n'existait pas — aucune
pièce jointe n'avait encore été enregistrée en Mode Local ; le défaut aurait frappé à la première).
- **Le défaut** : l'interface envoie le fichier comme objet (`composants/pieces-jointes.js:145`
  passe le `File` du formulaire, `modales/personne-form.js:448` la signature manuscrite). Or JSON
  ne sait pas porter un `Blob` : `JSON.stringify` le réduit à `{}`. Côté serveur,
  `api.js` faisait `d.base64 ?? d.blob` — `{}` est *truthy*, le garde-fou laissait passer — puis
  `String({})` = « [object Object] », que **`Buffer.from(…, 'base64')` décode SANS lever** en
  **9 octets de déchet** (`a1b8de72d39b8de72d`), écrits sur disque, hachés en SHA-256 et
  journalisés comme pièce probante. Le `try/catch` censé protéger était du code mort.
  La Démo, elle, refusait proprement (`demo-store.js:464`) : **les deux implémentations
  divergeaient en silence**, et `test-contrat.mjs` ne l'a pas vu parce qu'il n'exerçait que le
  chemin `base64` — jamais le chemin `blob`, le seul que l'interface emprunte.
- **Module pur `v8/js/data/contenu-pj.js`** (nouveau) : `versBase64` (Blob/File/Uint8Array/
  ArrayBuffer/base64 → base64 pure, encodage PAR TRANCHES — `String.fromCharCode(...5 Mo)`
  déborde la pile), `versBlob` (base64 → Blob : le « contenu binaire » que le contrat promet),
  `base64VersOctets`, `estBase64`. Messages repris MOT POUR MOT du DemoStore.
- **`local-store.js`** : convertit le contenu en base64 AVANT le transport, et **reconstruit un
  Blob au retour** — car `obtenirPieceJointe` rendait une chaîne base64 en Local et un Blob en
  Démo : `URL.createObjectURL(pj.blob)` (`pieces-jointes.js:109`) **cassait donc aussi le
  téléchargement d'une PJ en Mode Local**. Second défaut réparé par la même brique.
- **`server/api.js`** : `decoderBase64Pj` REFUSE désormais tout contenu non textuel et toute
  base64 hors alphabet (validation explicite, le try/catch ne servait à rien).
- Tests : **`test-contenu-pj.mjs` 20/0** (aller-retour fidèle sur les 256 valeurs d'octet, 5 Mo
  sans débordement de pile, et la SENTINELLE : le `{}` que JSON fabrique à partir d'un Blob est
  refusé) + **4 cas ajoutés à `test-contrat.mjs`, joués contre les DEUX stores** : un `Blob` est
  accepté et enregistré à sa VRAIE taille, son contenu est restitué à l'identique, un contenu non
  textuel est refusé, une base64 illisible est refusée. **TOUT VERT — 68 exécutions, 22 s.**
- Vérifié navigateur en **Mode Local réel** (vrai serveur, base JETABLE hors `data/`, port neuf
  2097, session ADMIN) : un `File` de 358 octets ajouté par le store → **358 octets enregistrés,
  358 octets sur le disque**, contenu relu à l'identique, `URL.createObjectURL` de nouveau
  possible. Avant le correctif : 9 octets. ⚠️ Réserve d'honnêteté : la soumission du formulaire
  de connexion a dû être déclenchée par `requestSubmit()` — le navigateur intégré n'envoie plus
  les événements souris/clavier aux boutons (panne récurrente, cf. 14/07) ; le code exécuté et le
  chemin réseau sont les mêmes, seule la source de l'événement diffère.

### 🔍 Filtres de la vue Mouvements (14/07)
Trou relevé à l'examen du 10/07 (« Mouvements sans filtre ») : le registre grossit à
chaque intervention et restait un long tableau sans recherche.
- **Module pur `v8/js/data/filtre-mouvements.js`** (toute la logique, zéro DOM) :
  `indexerMouvement` (clés exactes statut/groupe de type/fluide/année + texte agrégé
  cherchable : numéro, CERFA, machine ou codes bouteilles d'un transfert, fluide,
  technicien, motif de rejet), `correspond` (recherche libre insensible à la casse ET
  aux accents — « pesee » trouve « Pesée » —, multi-mots en ET, critères exacts),
  `optionsDisponibles` (les listes ne proposent que des valeurs PRÉSENTES au registre ;
  les deux types de récupération forment UNE entrée, fidèle aux chips ; un type hors
  référentiel reste filtrable par sa valeur brute — filet).
- **Vue Mouvements** : barre de filtres au-dessus du tableau (recherche libre + selects
  Statut/Type/Fluide/Année + compteur « X sur Y » + bouton Réinitialiser affiché
  seulement si un critère est actif) ; masquage de lignes par `data-id` (patron
  machines.js — la délégation d'événements et les modales d'action sont INTOUCHÉES) ;
  message « Aucun mouvement ne correspond aux filtres » ; l'appel initial couvre la
  restauration de formulaire du navigateur au rechargement (vérifié : selects restaurés
  → affichage cohérent d'emblée).
- Tests : **`test-filtre-mouvements.mjs` 25/0** (normalisation, indexation transfert/
  motif de rejet/type futur, correspondance casse/accents/ET/combinaisons, options
  triées dédoublonnées, registre vide) — **TOUT VERT, 67 exécutions**.
- Vérifié navigateur (origine neuve 8331) : barre et options exactes du monde démo,
  « fournil » → 1 sur 7, « pedagogique » sans accent → la Vitrine, type Récupération →
  1 ligne, statut Brouillon → 0 sur 7 + message vide, compteur, zéro erreur console.
- **Réserve LEVÉE (14/07, origine neuve 2087)** : le CLIC souris réel sur « Réinitialiser »
  est prouvé — recherche « fournil » (1 sur 7) → clic → champ vidé, les 4 listes revenues à
  « Tous/Toutes », compteur « 7 mouvements », 7 lignes réaffichées. Le filtre est complet.
- ⚠️ **Mais la vérification a démenti un point de la passe précédente** : le bouton
  Réinitialiser n'« apparaît » pas — il est affiché EN PERMANENCE. Le code pose bien
  `bouton.hidden = true`, mais `composants.css:11` déclare `.btn { display: inline-flex }`,
  et une règle d'auteur bat toujours le `[hidden] { display: none }` de la feuille du
  navigateur. Défaut GÉNÉRIQUE, prouvé en direct sur `.btn`, `.badge-rouge`, `.pied-session`
  et `.chip` (donc aussi le badge d'alertes et le pied de session, qui ne peuvent pas se
  cacher). Correctif = une ligne (`[hidden] { display: none !important }`) — porté à l'audit
  qualité en cours, pas corrigé ici (phase de lecture seule).

### 🧭 Parcours « audit guidé » — le dernier trou produit non gaté (14/07)
Priorité 3 de l'audit croisé GPT : un NON-développeur déroule un audit complet sans se
perdre. Nouvelle vue `#/audit-guide` (sidebar, sous « Conformité ») : 9 étapes numérotées
dans l'ordre de visite voulu — établissement → personnel → outillage → bouteilles →
mouvements → contrôles → déchets/BSFF → balance → export du dossier scellé.
- **Module pur `v8/js/data/audit-guide.js`** (doctrine feu-tricolore : AUCUNE règle métier
  nouvelle) : chaque étape rattache les alertes de `getAlertes()` par PRÉFIXE d'id et
  hérite du barème ROUGE/ORANGE/VERT ; registre rompu → étape mouvements ROUGE (constat
  dédié) ; prérequis Officiel manquants → jamais « tout vert ». **Zéro perte prouvée** :
  toute alerte finit dans une étape ou dans `nonRattachees` (encart renvoyant vers
  Conformité), et l'union des préfixes des étapes COUVRE ceux du feu tricolore (testé
  contre `DOMAINES`). Les familles pesée/garde sont séparées (étapes bouteilles/déchets).
- **Faits de présence** lus du contrat, jamais recalculés : « 6 machines au parc,
  3 contrôles », « 4 personnes actives dont 2 avec une aptitude », « 1 fluide récupéré en
  attente de décision »… Un registre vide est DIT (« Aucune personne au registre ») — pas
  d'écran vide qui passe pour un écran en règle.
- **Vue `v8/js/views/audit-guide.js`** : stepper vertical numéroté (rail + pastilles),
  bandeau de progression (« X étapes sur 8 au vert · registre intact · N prérequis
  Officiel manquants »), par étape : ce que l'auditeur regarde, faits, constats cliquables
  (clic + Entrée), consigne « à faire », bouton « Ouvrir : <vue> ». Étape 9 = ACTION
  (export) sans état. `esc()` sur toute donnée. Icône `parcours` ajoutée à la bibliothèque.
- **Revue adversariale (0 bloquant, 3 IMPORTANT, 6 mineurs — tous les importants
  soldés)** : ① le feu GLOBAL intègre désormais la sévérité des alertes non rattachées
  (une critique d'une famille future ne peut plus laisser le bandeau dire « prêt pour
  l'audit » — le filet du feu tricolore est hérité jusqu'au bout, testé CRITIQUE→ROUGE
  et IMPORTANT→ORANGE) ; ② « machines au parc » exclut les DÉMANTELÉES (définition du
  contrat : getMachines rend tout, les vues filtrent) ; ③ le compteur déchets reprend la
  définition EXACTE de la vue Déchets cible (récupération portant du fluide, tout statut)
  au lieu d'une sémantique maison, libellé « à suivre » (aucune promesse de décision).
  Mineurs : personnes actives alignées sur getAlertes (champ absent = inactive), libellés
  « encore non validé (brouillon ou soumis) » et « attestation au registre » (présence,
  pas validité), accord « relèvent », classe `.feu-NEUTRE` (fin du style en dur). Restent
  hérités du patron conformite (assumés) : `role="link"` sur les `<li>` de constats.
- Tests : **`test-audit-guide.mjs` 47/0 demo + 39/0 local** (suite DOUBLÉE : ordre,
  couverture ⊇ feu tricolore, rattachement par famille, zéro perte pur ET contre le store
  réel, registre rompu, familles inconnues dans le global, garde-fou Officiel, accords
  français des faits, monde démo sur pièces) — **TOUT VERT, 66 exécutions**.
- Vérifié navigateur (origines neuves 8323 puis 8329 après revue) : sidebar, 9 étapes,
  bandeau « 6 étapes sur 8 au vert », étapes outillage/contrôles ROUGES avec les vrais
  constats, navigation bouton d'étape → Outillage, constat → vue cible, étape 9 → Bilan
  annuel, zéro erreur console.

### 🎫 Réserves B2 soldées — semis démo + anti-doublon de mention (14/07)
Les deux réserves notées à la fin du chantier habilitations sont soldées.
- **Habilitations semées dans le monde de démo** (`demo-donnees.js`) : 2 habilitations
  actives cohérentes avec les fiches du personnel (Marc et Sophie, régime 2008 cat. I,
  mêmes numéros/échéances que leurs fiches — les deux registres coexistent) + 2 mentions
  (CO₂ ACTIVE sur Marc = le cas nominal du moteur de conseil ; HC RÉVOQUÉE datée sur
  Sophie = la ligne grisée d'historique). Échéances au-delà de l'horizon de 90 j :
  le semis n'ajoute AUCUNE alerte (compteurs du tableau de bord inchangés).
- **⚠️ LE PIÈGE, verrouillé dans le code ET testé** : les compléments de collections
  absentes (`init()` ET `importerJSON`) passent TOUJOURS à VIDE pour `habilitations`,
  `mentionsHabilitation`, `mouvementOutillage` (+ `sentinelleAlertes` à l'init) — jamais
  depuis DEMO. Sinon un export ancien recevrait des aptitudes INVENTÉES, et un registre
  étranger (sans per-fh/per-sb) serait REFUSÉ en orphelin à l'import. Testé dans
  `test-demo-store.mjs` : import d'un export sans clés B2 → collections vides.
- **Anti-doublon CONSEIL sur les mentions** (`habilitations-modal.js`) : ajouter une
  mention d'un fluide déjà ACTIF pour la personne demande confirmation (« renouvellement :
  les deux resteront au registre ») — jamais bloquant, le store reste seul juge ; si la
  lecture de vérification échoue, la saisie n'est pas empêchée (conseil, pas verrou).
- **Suites adaptées au semis** (intention inchangée) : `test-mentions` filtre le tri CO₂
  par la personne du test (le tri TOTAL préserve l'ordre relatif) ; `test-exports`
  vérifie désormais que les CSV portent les lignes semées avec NOM RÉSOLU (au lieu de
  « présents et vides »). +11 vérifications dans `test-demo-store`.
- **TOUT VERT : 64 exécutions.** Vérifié navigateur (origine neuve 8317) : badges du
  registre du personnel, modales Marc/Sophie (semis + révoquée grisée datée), anti-doublon
  (Annuler = rien ; « Ajouter quand même » = 2 mentions CO₂ au registre), zéro erreur
  console.

### 📊 Tableau de bord enrichi + rôles réels enfin VISIBLES (14/07)
Brique produit n°3 post-B2 : les trois rôles réels du chantier B2 (exécutant,
superviseur, responsable du registre — stockés depuis la migration 016 mais
invisibles) arrivent à l'écran et au dossier d'audit.
- **Modale détail d'un mouvement** : lignes « Exécuté par / Superviseur /
  Responsable du registre » (noms résolus du registre du personnel, « (fiche
  supprimée) » si l'id ne résout plus), seulement quand le rôle est renseigné.
- **`mouvements.csv` du dossier d'audit** : 3 colonnes finales « Exécuté
  par;Superviseur;Responsable registre » (noms résolus, motif habilitations).
- **Tableau de bord — carte « Conformité »** (mini feu tricolore) : pastille
  globale Conforme/À surveiller/Non conforme + compteurs critiques/importantes
  + une puce colorée par domaine (infobulle = résumé) + lien vers la vue
  Conformité — consolidation `collecterConformite` (module pur existant),
  AUCUNE règle recalculée à la main, couleurs de la charte réutilisées.
- **Derniers mouvements du tableau de bord** : le nom de l'exécutant réel
  (repli : champ libre technicien) apparaît sur chaque ligne.
- Tests : exports **34/0** (nom résolu dans le CSV, jamais l'id brut) —
  **TOUT VERT, 64 exécutions**.

### 🔧 Lien intervention → outils MULTIPLES, état figé opposable (14/07)
Brique produit n°2 post-B2 — « le vrai plus audit » : quels outils réglementaires ont
servi à quel mouvement (jusqu'ici, seul le détecteur du contrôle était lié), avec la
réponse à LA question d'audit : « la balance était-elle étalonnée CE jour-là ? »
- **Migration 018 `mouvement_outillage`** : table de jonction (couple mouvement/outil
  UNIQUE), liens posés au BROUILLON (déclaratif), `statut_fige` + `echeance_figee`
  posés à la VALIDATION dans la même transaction. **4 triggers dédiés** : liens d'un
  mouvement figé (VALIDE/ANNULE) intouchables (ajout/modification/suppression), et
  JAMAIS de re-parentage (mouvement_id/outillage_id immuables — la forge « déplacer un
  lien de brouillon vers une écriture validée » est fermée, prouvée par test SQL brut).
  Trigger WORM des mouvements INCHANGÉ ; hors empreinte (table séparée).
- **Recoupement opposable (constat BLOQUANT de la revue, soldé)** : la table étant hors
  empreinte, un export édité à la main pouvait forger « CONFORME ce jour-là » — la
  validation consigne désormais les outils figés dans la ligne de **journal CHAÎNÉ**
  (« … · outils figés : OUT-x=CONFORME, OUT-y=EXPIRE » — motif prpFige, tri stable).
- **Contrat 76 → 77 (`VERSION_CONTRAT` 3)** : `getOutilsMouvement(mouvementId)` (outil
  résolu au présent + vérité figée, tri contractuel en JS) ; `creerMouvement` accepte
  `outilsIds` (dédupliqués, existence vérifiée dès le brouillon) ; suppression d'un
  brouillon emporte ses liens ; la contre-écriture n'en copie aucun, ceux de l'original
  restent intacts. Miroir demo/serveur + mapping + export/import complet.
- **Invariants d'import** (miroir demo/serveur, messages français) : lien orphelin
  (mouvement ou outil fantôme), couple en double, `statutFige` hors énumération,
  figeage forgé sur un mouvement non validé → **Import refusé**.
- **Wizard étape contrôle** : cases à cocher « Outils utilisés pour l'intervention »
  (tri type puis marque), avertissement CONSEIL si un outil coché est expiré/hors
  service (jamais de blocage), reprise de brouillon re-coche, récapitulatif synthétique.
- **Modale détail mouvement** : section « Outils utilisés » (Conforme le … / Expiré
  le … / À vérifier, « déclaré » au brouillon).
- **Dossier d'audit annuel** : `outils-intervention.csv` CONDITIONNEL (12ᵉ table,
  seulement si des liens existent), une ligne par outil et par mouvement de l'année.
- Tests : **`test-outils-intervention.mjs` 26/0 demo + local** (suite doublée : figeage,
  opposabilité après évolution de l'outil, journal chaîné, 5 imports forgés refusés),
  migrations **138/0** (triggers éprouvés en SQL brut), wizard 36/0, exports 33/0,
  dossier-audit 21/0 — **TOUT VERT, 64 exécutions**.
- Revue adversariale (angle intégrité/opposabilité) : 1 BLOQUANT + 1 IMPORTANT +
  1 MINEUR — tous soldés (journal chaîné, trigger re-parentage, invariants d'enum).

### 🏷️ Code machine lisible structuré SITE-FAMILLE-NUMÉRO (14/07)
Brique produit n°1 de la série post-B2 (décision Franck 07/07) : un identifiant humain
« JR-CF-001 » remplace les compteurs « M1/M2 » à la création — le `code_public` opaque
des QR reste DISTINCT et inchangé.
- **Module pur `v8/js/data/code-machine.js`** : `familleDuType` (Chambre froide → CF,
  Vitrine → VR, PAC → PC, Monosplit → MS, Multisplit → MM, Centrale → CE, défaut MA),
  `codeSite` (initiales des mots significatifs de la raison sociale — « Lycée Jacques
  Raynaud » → JR, mots vides scolaires ignorés, replis sûrs), `genererCodeMachine`
  (prochain numéro libre PAR préfixe, 3 chiffres), `normaliserCodeMachine` (majuscules,
  accents dépouillés, espaces retirés) et `validerCodeMachine` (1-24 caractères,
  lettres/chiffres/tirets — les codes hérités « M1 » restent valides). Miroir partiel
  CommonJS dans `server/api.js` (motif habilitations/sentinelle).
- **`createMachine` accepte un `code` fourni** (normalisé + unicité insensible à la
  casse + format, erreurs françaises), repli compteur hérité `M{n}` sans code — AUCUNE
  machine existante n'est renommée d'office.
- **`updateMachine` permet de renommer** (mêmes gardes, unicité hors soi-même) ; le
  renommage est JOURNALISÉ « code ancien → nouveau ». Les libellés dénormalisés des
  écritures scellées (`machineLabel`) restent figés, par principe d'opposabilité.
- **Formulaire machine** : champ « Code machine » proposé automatiquement en création
  (site déduit de l'établissement + famille du type choisi), modifiable, validé en
  direct ; pré-rempli en modification. **Fiche machine** : le code lisible passe en
  tête du sous-titre, le code QR opaque reste visible en second.
- Tests : **`test-code-machine.mjs` 32/0 demo + local** (module pur, parité création/
  unicité/format/repli/renommage/journal), suite DOUBLÉE au lanceur — **TOUT VERT,
  62 exécutions**.

### 🎫 Habilitations F-Gas · Phase 3 « conseil » — alertes d'échéance d'aptitude (14/07)
**LE CHANTIER B2 EST SOLDÉ** (Phases 1, 2a, 2b briques 1-4, dossier d'audit, Phase 3
en mode CONSEIL — le blocage dur du mode Officiel reste un choix ultérieur de Franck).
- **`getAlertes()` couvre les tables du B2** (miroir exact demo/serveur) : une
  habilitation ou une mention ACTIVE d'une personne ACTIVE, échue (CRITIQUE) ou sous
  l'horizon de 90 jours (IMPORTANT), alerte — ids `alr-habilitation-`/`alr-mention-`,
  cible cliquable vers le registre du personnel. Les révoquées ne sonnent JAMAIS
  (historique), les personnes désactivées non plus. L'alerte héritée sur la fiche
  (`dateFinValidite`) reste : les deux registres coexistent réellement.
- **Sentinelle** : historisation AUTOMATIQUE (elle diffe getAlertes) — vérifié au
  navigateur (« Active depuis le … » + « J'ai pris connaissance » dès l'apparition).
- **Feu tricolore** : les deux préfixes rejoignent le domaine « Personnel (aptitudes) »
  (jamais le filet « autres ») — vérifié au navigateur (« 1 point bloquant »).
- Tests : habilitations 41 → **48/0 demo+local** (échue/proche/mention/révocation
  éteint/désactivation éteint), feu-tricolore **31/0 ×2** — **TOUT VERT, 60 exécutions**,
  vérifié navigateur (origine neuve 8233, saisie par la modale réelle, zéro erreur console).

### 🎫 Habilitations F-Gas · Phase 2b (briques 3-4) — écran « qui intervient ? » (14/07)
« La PREMIÈRE chose avant toute intervention = identifier le technicien » (Franck 14/07).
Le moteur de conseil arrive À L'ÉCRAN — conseil, jamais blocage :
- **Composant pur `v8/js/composants/conseil-intervenant.js`** (+ suite dédiée 20/0) :
  `verdictPourIntervenant` (habilitations + jetons de mention ACTIFS et NON ÉCHUS de la
  personne → `verifierDroitIntervention`, fluide/charge NOMINALE de la machine —
  la charge de l'installation, celle des seuils réglementaires), `encartConseil`
  (vert OK / ambre CONSEIL / rouge REFUS, esc() partout, testé contre données hostiles),
  `dateDuJour` (date LOCALE ; le moteur reste sans horloge, la date vient de l'appelant).
- **Fiche machine — bloc « Qui intervient ? »** : select des personnes actives → synthèse
  de compétence sur CETTE machine (les cas de Franck à l'écran : E → « Contrôle
  d'étanchéité uniquement » ; I + mention CO₂ → vert sur une machine R-744 ; sans
  habilitation → renvoi vers l'administrateur).
- **Wizard étape 1 — panneau de conseil** sous le select technicien (patron du bandeau
  élève) : verdict d'OPÉRATION si la machine est connue (wizard ouvert depuis une fiche),
  synthèse générale sinon ; recalculé au changement de technicien/carte ET au basculement
  des interrupteurs (mise à jour ciblée sans re-rendu). **`executeParId` écrit au
  `creerMouvement`** (l'id de la fiche personnel, en plus du nom libre hérité) — prouvé
  au navigateur jusqu'à la signature réelle (mouvement scellé portant l'id).
- **Modale habilitations — section « Mentions de formation complémentaire »** : liste
  (chips CO₂/NH₃/HC, révoquées grisées datées), ajout par fluide + n°/organisme/dates,
  révocation confirmée — mêmes patrons que les habilitations. **Pastille mentions** dans
  le registre du personnel (chip bleue, actives seules).
- **Corrigé au passage** : le rôle applicatif d'un élève s'affichait « Élevé » (collision
  de clés avec le niveau GWP dans les chips communes) → « Élève » (fonction locale).
- **Revue adversariale (2 angles, 0 bloquant) — 4 IMPORTANT corrigés** : ① la synthèse
  ignorait la CHARGE (un D « ≤ 3 kg » paraissait autorisé en synthèse sur 10 kg quand le
  verdict d'opération refusait — les deux écrans se contredisaient) → la synthèse écarte
  les profils au-delà de leur limite, l'étanchéité survit (elle ne manipule pas) ; ② le
  wizard SANS machine rendait un verdict d'opération faussement VERT (ni fluide ni
  charge) → synthèse générale ; ③ habilitations/mentions ÉCHUES comptaient comme
  valides → `dateReference` écarte les échues (les vues passent la date du jour) ;
  ④ la reprise de brouillon ré-attribuait l'intervenant par NOM (homonymes ambigus)
  → `executeParId` du brouillon prioritaire, le nom reste le repli des vieux brouillons.
  Mineurs : libellé du moteur « charge actuelle » → « charge de l'installation » (on lui
  passe la nominale), garde `chargeNominaleKg` null (colonne SQL nullable — un null
  devenait 0 et fabriquait un faux refus), dégradé du wizard = panneau masqué (pas un
  faux « aucune habilitation »).
- **Vérifié navigateur (origines neuves 8229 puis 8231, zéro erreur console)** : parcours
  complet fiche machine + wizard (signature réelle, mouvement `FORM-2026-0001` scellé avec
  `executeParId`), saisie/révocation de mentions par l'UI, machine R-744 créée en direct
  (Marc I + mention CO₂ → vert ; Sophie E → « formation complémentaire CO₂ requise »),
  cas Pierre dès la fiche (D sur 4,5 kg → refus chiffré), synthèse ambre sans machine.
  Clic-à-travers de la Phase 2a CONFIRMÉ (réserve levée). Tests : moteur 44 → **50/0**,
  composant **20/0**, wizard 16 → **23/0** — **TOUT VERT, 60 exécutions**.
- ⚠️ Notés pour la suite : le dossier d'audit CSV n'exporte ni habilitations ni mentions ;
  le renouvellement d'une mention active est silencieux (légitime, patron habilitations) ;
  semer des habilitations dans le monde de démo (avec précaution : les compléments
  d'import doivent rester à vide, jamais les données démo).

### 🎫 Habilitations F-Gas · Phase 2b (brique 1) — mentions de formation complémentaire (14/07)
La saisie des mentions par fluide (décision Franck 14/07) : l'admin coche CO₂ / NH₃ / HC
sur une personne, la mention **ÉTEND l'axe fluide** de ses habilitations — jamais les
opérations ni la charge (un ancien I-IV + stage CO₂ peut intervenir sur le CO₂).
- **Migration 017** : table `mentions_habilitation` calquée sur `habilitations` (cumul +
  renouvellement sans UNIQUE, jamais supprimée : actif=0 + date_revocation, CHECK fluide
  CO2/NH3/HC, index personne/échéance). Table neuve : AUCUNE colonne sur `mouvements`,
  **trigger WORM strictement inchangé** (prouvé octet à octet par test-migrations).
- **3 méthodes de contrat (surface 73 → 76, `VERSION_CONTRAT` 1 → 2)** : `getMentions`
  (lecture triée CO2/NH3/HC, puis dateFin décroissante null en tête, puis id — départage
  TOTAL, l'ordre ne dépend jamais de l'insertion), `createMention` / `revoquerMention`
  (réservées VALIDEUR côté serveur, actif forcé vrai à la création, double révocation
  refusée). Miroir exact DemoStore/serveur, mapping, export/import étendus (les vieux
  exports sans mentions restent importables, complétés à vide).
- **Branchement du moteur de conseil** : `jetonsMentionsActives()` (module pur) transforme
  les lignes de `getMentions` en jetons pour `verifierDroitIntervention` — cas nominal
  prouvé bout en bout sur le VRAI store : I(2008) + mention CO₂ → autorisé sur le R-744 ;
  sans mention → refus + conseil « formation complémentaire CO₂ » ; mention révoquée →
  droit retiré. NH₃ et HC prouvés de même.
- **Revue adversariale (3 angles, 0 bloquant) — 2 IMPORTANT corrigés SUR LES DEUX TABLES**
  (dette héritée de la Phase 1 soldée au passage) : ① un `actif` absent ou non booléen à
  l'import donnait des DROITS divergents (actif par défaut côté SQL, inactif côté démo,
  sur le même fichier) → invariants d'import renforcés des deux côtés (booléen exigé,
  révoquée sans date refusée, active datée refusée) ; ② un doublon d'id passait côté démo
  (registre ambigu) et cassait côté serveur en anglais brut → unicité d'id vérifiée AVANT
  adoption, message français identique ; ③ test de tri tautologique (ordre d'insertion =
  ordre attendu) → ordre de création inversé + branche « null en tête » exercée.
- Tests : **`test-mentions.mjs` 32/0 demo+local** (nouvelle suite doublée du lanceur),
  habilitations 38 → **41/0** (forgeries de renfort), contrat 255/0 ×2, migrations 129/0,
  mapping 166/0 — **TOUT VERT, 59 exécutions**.
- ⚠️ Notés pour la suite (revue, hors périmètre brique) : le dossier d'audit CSV n'exporte
  ni habilitations ni mentions (à câbler avec l'écran « qui intervient ? ») ; une dateFin
  passée n'invalide pas un jeton (l'échéance relève de la sentinelle / du feu tricolore,
  Phase 3) ; l'export démo n'est pas trié quand celui du serveur l'est (cosmétique).

### 🎫 Habilitations F-Gas · Phase 2b (brique 2) — moteur de CONSEIL (14/07)
Le cœur fonctionnel voulu par Franck : `verifierDroitIntervention` — dit, pour un intervenant
et une machine, ce qu'il peut / ne peut pas faire et **pourquoi**. **Conseil, jamais blocage**
(`gravite: 'REFUS'` = « vous ne pouvez pas », un conseil fort, pas un verrou ; le blocage dur =
Phase 3). Conçu par workflow (3 angles + synthèse), matrice §2 validée fonctionnellement par
Franck via deux cas concrets.
- **Module pur `v8/js/data/habilitations.js`** (fonction `verifierDroitIntervention` + helpers
  `familleDuFluide`, `operationNormalisee`, `estIntervenantIdentifiable`, constantes
  `FLUIDES_MENTION`/seuils). Déterministe, sans horloge (reçoit les habilitations DÉJÀ actives).
- **Matrice encodée** : A1 = tout · A2 = tout < 3 kg (6 si hermétique scellé) · B = CO₂ · C = NH₃ ·
  D = récupération seule < 3 kg · E = étanchéité seule · V = véhicules. Correspondance ancien→nouveau
  (I/II→A1, III→D, IV→E). **Mentions de formation complémentaire** par fluide (CO₂/NH₃/HC) qui
  étendent l'axe fluide (un ancien I-IV + stage CO₂ peut intervenir sur CO₂, dans les limites de sa
  catégorie). 2008 natif = HFC/HFO seul.
- **Cas de référence reproduits au message exact** : Bachir (E) → « Contrôle d'étanchéité uniquement :
  pas de manipulation du circuit » ; Pierre (D, récup ≤ 3 kg) sur 10 kg → « Récupération limitée à
  3 kg : cette installation en contient 10 kg, vous ne pouvez pas ».
- Tests : `test-habilitations-moteur.mjs` **44/0** (toutes catégories, seuils, hermétique, mentions,
  correspondance 2008, cumul, dérivation de famille, robustesse entrée vide, déterminisme,
  identifiabilité). **57 exécutions TOUT VERT.** Pure fonction (pas de méthode de contrat) : zéro
  impact parité, zéro migration.
- **Reste de la Phase 2b** (design complet en réserve) : brique 1 = table `mentions_habilitation`
  (saisie des mentions) ; briques 3-4 = écran « qui intervient ? » (encart fiche machine + panneau
  wizard) — reportées le temps que l'outillage navigateur (en panne) permette le contrôle à l'écran.

### 🎫 Habilitations F-Gas · Phase 2a — saisie & affichage (14/07)
Interface de gestion des habilitations d'une personne, par-dessus le modèle de données de
la Phase 1. **Saisie et affichage UNIQUEMENT — aucun verdict, aucun blocage** (le moteur
« qui a le droit de faire quoi » = Phase 2b, gaté sur la validation de la matrice par Franck).
- **Nouvelle modale `v8/js/modales/habilitations-modal.js`** (`ouvrirHabilitations(ctx, personneId)`) :
  liste des habilitations de la personne (chip régime, catégorie, n°/organisme/validité, statut) —
  les révoquées restent affichées, grisées et datées ; formulaire d'ajout (le choix du régime
  recalcule la liste des catégories : I-IV pour 2008, A1-V pour 2025) ; bouton « Révoquer » avec
  confirmation. Erreurs du store en bandeau sobre, rechargement après chaque mutation.
- **`v8/js/views/personnel.js`** : bouton « Habilitations » par ligne + pastille du nombre d'actives.
- Idiomes maison respectés (`modale()`/`confirmer()`/`toast`, `esc()` partout, français accentué,
  zéro emoji, zéro dépendance). Construit via sous-agent (ultracode), relu et intégré.
- Vérifié : `node --check` OK, la vue rend les boutons, **zéro erreur console** au chargement,
  couche de données testée 38/0. ⚠️ Le clic-à-travers ajout/révocation en direct reste à
  confirmer (panne temporaire de l'outillage navigateur au moment du contrôle) — risque faible
  (réutilisation du patron de modale existant, méthodes de store exhaustivement testées).

### 🎫 Habilitations F-Gas · Phase 1 — modèle de données (14/07)
Premier pallier du **cœur audit-proof (B2)**. Périmètre STRICT : on **stocke et on
affiche, on ne refuse RIEN**. Le moteur de verdict (Phase 2) et le blocage en mode
Officiel (Phase 3, gaté sur validation réglementaire de Franck) viennent après.
- **Recherche réglementaire faite (sources officielles)** : les DEUX arrêtés du
  21/11/2025 (aptitude art. R.543-106 + capacité art. R.543-99), F-Gas III (règlement
  UE 2024/573), bascule 01/01/2027, coexistence 2008 (I-IV) jusqu'au 31/12/2026.
  Nouvelles catégories **A1/A2/B/C/D/E/V**. Cadrage = `docs/SPEC-HABILITATIONS.md`.
  ⚠️ La **matrice** (ce que chaque catégorie autorise) reste un BROUILLON à valider
  ligne à ligne par Franck AVANT tout blocage.
- **Module pur `v8/js/data/habilitations.js`** : référentiels (REGIMES, CATEGORIES_2008,
  CATEGORIES_2025), correspondance 2008→2025 (I&II→A1/A2 · III→D · IV→E, renvoyée en
  TABLEAU — jamais matérialisée dans une ligne), `categorieCoherente`,
  `comparerHabilitations` (tri contractuel en JS, jamais d'ORDER BY). Miroir exact serveur.
- **Migration 016** : table `habilitations` MULTI-RÉGIME (une personne cumule 2008 ET
  2025, catégories multiples, renouvellement possible — aucun UNIQUE sur le triplet),
  **jamais supprimée** (actif=0 + date_revocation), **CHECK composite** régime↔catégorie.
  + 3 colonnes de rôle sur `mouvements` — `execute_par_id` (qui exécute, ex. l'élève) /
  `superviseur_id` (l'enseignant) / `responsable_registre_id` (le référent) — **nullable,
  sans backfill** (dériver un rôle de `technicien` = mensonge d'audit), **HORS empreinte
  SHA-256**, **trigger WORM recréé** pour les couvrir (patron `prg_fige` migration 13).
- **4 méthodes de contrat (surface 69 → 73)** : `getHabilitations` (lecture, triée,
  copies indépendantes), `createHabilitation` / `updateHabilitation` (régime et catégorie
  INTOUCHABLES) / `revoquerHabilitation` (actif=false + date, jamais de DELETE) — toutes
  réservées **VALIDEUR** (un élève ne s'auto-attribue pas une aptitude). Parité stricte
  démo ↔ serveur. Export/import étendu (la collection voyage dans les deux sens).
- **Revue adversariale (workflow 3 angles : parité / WORM-migration / fidélité-régression,
  0 bloquant)** — 5 constats corrigés : rôle en **chaîne vide → null** (garde truthy vs
  stockage nullish, évitait un FK cru côté SQLite) ; **validation d'import symétrique**
  (le DemoStore refuse désormais EXACTEMENT ce que le CHECK/FK serveur refuse — habilitation
  incohérente ou orpheline) ; **double révocation refusée** (préserve la date d'origine) ;
  **actif TOUJOURS true à la création** ; garde défensive `getHabilitations`.
- Tests : `test-habilitations-pur.mjs` **16/0** (référentiels, correspondance, tri),
  `test-habilitations.mjs` **38/0 demo+local** (CRUD, garde-fous, cumul, révocation
  historisée, rôles scellés hors empreinte, non-confusion élève-exécutant≠validateur,
  correspondance, échange croisé, import forgé refusé), `test-migrations` v15→v16 (CHECK
  composite + WORM recréé + écriture scellée intacte). **56 exécutions TOUT VERT**, contrat
  255/0 démo+local, mapping 161/0. Vérifié navigateur (module chargé, CRUD front, 0 erreur).

### 🔔 Brique ⑥ · Sentinelle d'alertes PERSISTÉES (13/07)
Jusqu'ici les 8 familles d'alertes étaient **recalculées à la volée** à chaque
lecture (rien n'existait entre deux consultations). La sentinelle pose par-dessus
`getAlertes()` — qui reste la SEULE vérité du présent — une couche **temporelle et
opposable** : depuis quand une alerte est active, quand elle a cessé, et la **preuve
qu'un responsable en a pris connaissance**. Sans jamais inventer ni **masquer** une
alerte.
- **Modèle « épisode »** (`v8/js/data/sentinelle.js`, module pur — diff/format/tri,
  dupliqué en miroir exact côté serveur comme `getAlertes`) : un épisode = une
  occurrence continue d'une alerte (id stable `alr-…`). Une alerte qui disparaît puis
  revient ouvre un **nouvel** épisode (l'ancien reste archivé, résolu) — même logique
  que les dossiers de fuite.
- **Migration 015** — table `sentinelle_alertes` (`apparue_le` / `resolue_le` /
  `acquittee_le` / `acquittee_par` + snapshot niveau/titre/detail/cible) + **index
  UNIQUE partiel** `WHERE resolue_le IS NULL` = invariant « au plus **un** épisode
  ouvert par alerte » (tout en laissant cohabiter résolu + ouvert à la réapparition).
  Rejouable de zéro, aucun DROP, aucun re-hash.
- **3 méthodes de contrat** (surface **66 → 69**, parité demo/local stricte) :
  - `rafraichirSentinelle()` — réconcilie la table avec les alertes du moment (ouvre
    les apparitions, clôt les résolutions). **IDEMPOTENTE** (aucun effet, aucune
    transaction si rien n'a changé) ; ne touche **pas** au journal chaîné (pour ne pas
    le noyer) — l'horodatage vit dans la table.
  - `acquitterAlerte(idAlerte, par)` — « j'ai pris connaissance », horodaté +
    **consigné au journal d'audit chaîné** (LA preuve opposable) ; Error si aucune
    alerte active, idempotent si déjà acquitté.
  - `getSentinelle()` — les épisodes (actifs + archivés), récents d'abord.
- **GARDE-FOU AUDIT — aucun masquage** : il n'existe AUCUNE méthode de snooze /
  suppression / dé-acquittement. Acquitter ne fait jamais disparaître : une alerte
  critique acquittée reste active, visible, et le **feu tricolore reste au rouge**
  (il consomme `getAlertes`, inchangé).
- **Rôles** : `rafraichirSentinelle` = OPERATEUR (tout utilisateur connecté déclenche
  le rafraîchissement en consultant, best-effort) ; `acquitterAlerte` = **VALIDEUR**
  (la prise d'acte d'une non-conformité réglementaire engage le responsable, jamais
  un élève). Rôle gardé côté serveur AVANT effet, lu du contexte de session.
- **Interface** :
  - Tableau de bord — chaque alerte gagne « **Active depuis le …** » et, pour un
    valideur, le bouton « **J'ai pris connaissance** » (→ badge « Pris connaissance
    le … · nom » après clic, l'alerte restant affichée). Rafraîchissement best-effort
    au chargement (échec silencieux si non habilité).
  - Conformité — carte « **Historique des alertes** » : la timeline opposable
    (période active/résolue + trace d'acquittement) qu'un auditeur consulterait.
- **Escalade de niveau tracée (constat IMPORTANT 1 de la revue adversariale)** : si
  une alerte change de gravité sous le même id (capacité « à renouveler » IMPORTANT →
  « expirée » CRITIQUE), l'épisode ouvert voit son snapshot rafraîchi ET son
  **acquittement remis à zéro** — prendre acte de la version douce ne vaut pas prise
  d'acte de l'aggravation. L'entrée de journal de l'ancien acquittement reste
  (append-only). Vérifié en navigateur : l'alerte redevenue critique réaffiche le
  bouton, sans badge « pris connaissance ».
- **Tri déterministe et COMMUN aux deux stores** (constat IMPORTANT 2) : départage par
  `idAlerte`, jamais par l'id de stockage (aléatoire, divergent d'un store à l'autre) —
  la parité du tri est garantie. **Dédup défensif** des apparitions par `idAlerte`
  (aligne demo/serveur, évite un rollback total si un id d'alerte était un jour dupliqué).
- **Revue adversariale (1 agent, lecture seule) : 0 bloquant** ; les 2 constats
  IMPORTANT ci-dessus corrigés. Mineurs notés hors périmètre v1 : le « qui »
  auto-déclaré (transversal à tout le code, pas propre à la brique) ; `apparueLe` =
  1re consultation, pas naissance de la condition (design sans backfill).
- Tests : `test-sentinelle-pur.mjs` **40/0** (diff/escalade/allègement/dédup/format/
  tri), `test-sentinelle.mjs` **33/0 demo+local** (cycle complet apparition →
  acquittement + journal → résolution → réapparition, escalade + remise à zéro,
  idempotence, garde-fous), `test-migrations` v14→v15 (index partiel prouvé), contrat
  **255/0** sur les deux stores, mapping 156/0. **53 exécutions TOUT VERT.** Vérifié
  navigateur (ports neufs 8191/8207, origines vierges) : datation, acquittement +
  toast + journal, historique Conformité, masquage impossible, escalade.

### 🎓 Brique ⑤ · Correction AUTOMATIQUE du CERFA rempli par l'élève (13/07)
Le pont pédagogique : l'élève remplit le CERFA 15497*04 officiel vierge À L'ORDINATEUR,
le professeur importe le PDF, l'appli compare champ par champ aux valeurs attendues du
mouvement et rend le rapport de correction. **v1 assumée : PDF numériques uniquement**
(un scan n'a plus de champs — dit partout à l'écran).
- **Refactor préalable du générateur** (`v8/js/cerfa/generateur.js`) : le calcul des
  72 champs séparé de l'écriture PDF — `calculerChampsCerfa(store, {source,id})` →
  `{texte, cases, radio, numero, mode}` ; `genererCerfaPdf` la consomme. **Une seule
  vérité de calcul** : la correction attend exactement ce que le générateur écrit.
  Comportement prouvé identique (test-generateur 97/0 inchangé, numéro de fiche stable
  entre deux appels — vérifié en revue). `fmtVirgule`/`fmtDateFr`/`sansPrefixeR`/
  `MENTION_FORMATION` exportés.
- **`v8/js/cerfa/correction.js`** (nouveau, cœur) : lecture des champs AcroForm du PDF
  élève (pdf-lib ; ⚠️ bundle MINIFIÉ → types testés par `instanceof`, jamais
  `constructor.name` — bug réel attrapé par les tests), garde « c'est bien le CERFA
  officiel » (72 champs, sinon message clair scan/mauvais fichier), garde anti-gel
  (> 15 Mo refusé avant parsing), comparateur PUR `comparerChamps` → lignes
  {champ, cadre, libellé français, attendu, saisi, statut Juste/Faux/Oublié/Rempli à
  tort/Vide} + regroupement par cadre + pourcentage.
- **Comparaison ÉQUITABLE (revue adversariale Opus, 0 bloquant — c'était LE sujet)** :
  bienveillante sur la forme, stricte sur le fond, PAR NATURE DE CHAMP :
  quantités « 3,20 » ≡ « 3.2 » (quasi exact) ; **teqCO₂ calculée par l'élève : tolérance
  d'arrondi ±1 % ou ±0,05 t** (« 15,4 » vaut « 15,39 », « 14 » reste faux) ;
  dates « 1/7/2026 » ≡ « 01/07/2026 » ; jour d'étalonnage « 7 » ≡ « 07 » ;
  **identifiants STRICTS** (« 007 » ≠ « 7 » sur attestation/BSFF — la bienveillance
  numérique ne vaut que pour les quantités) ; **pavés multi-lignes (opérateur,
  détenteur, équipement) comparés ligne à ligne SANS ordre imposé**, « SIRET » avec ou
  sans deux-points, numéro avec ou sans espaces ; **la mention « MODE FORMATION » du
  cadre 14 (posée par l'appli) n'est JAMAIS exigée de l'élève**. Remplir un champ qui
  devait rester vide est une erreur évaluée (l'élève doit savoir ce qui ne le
  concerne pas).
- **Interface** (`v8/js/cerfa/correcteur.js`) : modale « Correction du CERFA élève »
  (nom de l'élève optionnel, dépôt/choix du PDF, erreurs en bandeau sobre, champs
  inconnus du PDF signalés — jamais en silence) ; rapport à l'écran (pourcentage,
  compteurs, tableaux par cadre, lignes actives seulement) ; **rapport HTML autonome
  imprimable téléchargeable** (patron certificat, échappement complet — le PDF élève
  est une donnée non fiable, tout passe par esc/textContent, zéro XSS vérifié en
  revue). Boutons « Correction élève » : vue Mouvements + historique de la fiche
  machine (mouvements FIGÉS hors transfert uniquement).
- Tests : `test-correction.mjs` **30/0** (normalisations, équité multi-lignes/SIRET/
  mention formation/teqCO₂/identifiants, PDF élève RÉELS fabriqués avec pdf-lib —
  parfait 100 %, maladroit-mais-juste 100 %, fautif classé ligne à ligne, vierge,
  hors sujet, non-PDF, 16 Mo, champ inconnu, cohérence générateur↔lecteur) ;
  **50 exécutions TOUT VERT**.
- **Vérifié navigateur** (ports neufs 8191/8195) : modale depuis la vue Mouvements,
  élève parfait → 100 % (23 justes), élève fautif → 88 % avec les 3 fautes nommées
  (« Démantèlement → Rempli à tort », « Quantité A → Faux », « Signature opérateur →
  Oublié »), élève équitable (lignes inversées + SIRET souple + mention omise) →
  100 %, rapport téléchargé, boutons présents sur les lignes validées. Zéro erreur
  console.

### 🔏 Brique ④ · Certificat de scellement + vérificateur HTML AUTONOME (13/07)
La preuve devient auto-vérifiable : un auditeur peut contrôler un dossier scellé
**sans le logiciel, hors ligne** — meilleur rapport impact/effort de l'examen du 10/07.
- **`v8/js/documents/verificateur.js`** (nouveau) : `NOYAU_SOURCE` = analyseur ZIP
  « stored » écrit en JS pur (EOCD → répertoire central → en-têtes locaux) + lecture du
  manifeste + SHA-256 Web Crypto. **La MÊME source est évaluée par les tests Node et
  embarquée dans la page** : ce qui est prouvé en test est exactement ce qui part en
  archive.
- **`99-VERIFICATEUR.html` embarqué dans CHAQUE dossier scellé** (audit annuel, machine,
  client, fuite — un seul point d'intégration : `assemblerDossier`) : page autonome
  française, zéro ressource externe, ouverte d'un double-clic depuis le disque
  (`file://` = contexte sécurisé, Web Crypto disponible). Déposer le .zip → empreinte
  globale + comparaison à l'empreinte de référence collée (IDENTIQUE/DIFFÉRENTE) +
  tableau fichier par fichier contre le manifeste (CONFORME / ALTÉRÉ / MANQUANT /
  INATTENDU / ILLISIBLE).
- **Certificat de scellement imprimable** : bouton « Télécharger le certificat » dans la
  modale de scellement — document HTML autonome portant titre, archive, nombre de
  documents, date et empreinte SHA-256, avec les consignes (conserver HORS du dossier,
  vérifier via 99-VERIFICATEUR.html ou `Get-FileHash`). L'empreinte globale ne peut pas
  vivre DANS le fichier qu'elle scelle : le certificat voyage à côté.
- **Sécurité (revue adversariale Opus, 0 bloquant)** : un ZIP déposé est une donnée
  HOSTILE — noms de fichiers et messages affichés via `textContent` uniquement (zéro
  innerHTML) ; analyseur éprouvé contre offsets hors bornes, nombre d'entrées menteur,
  ZIP64, EOCD injecté, **doublons d'entrées** (un doublon altéré ne passe jamais
  « conforme ») ; gardes anti-gel (10 000 entrées / 1 Go déclarés max) ; **le verdict
  interne vert porte la réserve d'honnêteté** (« ne prouve PAS l'authenticité — seule
  l'empreinte de référence externe le prouve », le manifeste vivant dans l'archive) ;
  manifeste compressé ≠ manifeste absent. Aucune évaluation dynamique dans l'appli
  (CSP intacte).
- Tests : `test-verificateur.mjs` **39/0** (archive saine + recalcul node:crypto
  indépendant + falsifications octet/manquant/inattendu/compressé + archives forgées
  hostiles + page + certificat échappé + dossier machine réel de bout en bout) ;
  **49 exécutions TOUT VERT** (les 4 suites dossiers absorbent la nouvelle entrée).
- **Vérifié navigateur** (pages servies depuis un bac à sable, ports neufs 8183/8187) :
  dossier machine réel vérifié dans la page autonome (empreinte identique au scellement,
  7 fichiers conformes, réserve d'authenticité affichée), empreinte de référence
  IDENTIQUE puis DIFFÉRENTE, octet falsifié → « identite-machine.csv ALTÉRÉ » ;
  modale de l'appli : bouton certificat opérationnel. Zéro erreur console.

### 🧯 Brique ③ · Dossier de fuite fermé MATÉRIALISÉ (13/07)
Le différenciateur n°1 (aucun concurrent ne le documente) : la règle d'or était déjà
codée (R3c/R4 — retour EN_SERVICE impossible sans réparation tracée + contrôle CONFORME
postérieur), il manquait l'ÉCRAN et la PREUVE. Zéro migration, zéro écriture nouvelle :
lecture pure des données déjà en base. Méthode habituelle : carto (1 agent) → cœur +
tests d'abord → 2 agents Sonnet en parallèle (export / interface) → 2 revues
adversariales Opus → correctifs → navigateur.
- **`v8/js/data/dossiers-fuite.js`** (nouveau, PUR/Node-testable) : reconstruit les
  dossiers de fuite d'une machine depuis les contrôles (ancre = contrôle FUITE,
  réparation migration 8, clôture = premier CONFORME postérieur — MÊME règle que
  `estFuiteOuverte`, convention date égale comprise). Statuts OUVERTE / REPAREE
  (échéance de suivi +30 j, retard) / FERMEE ; fenêtre des mouvements « pendant la
  fuite » ; chronologie triée avec rang intra-jour COHÉRENT avec R3c/R4 (détection →
  récupérations → réparation → compléments → contrôles).
- **⚠️ REGROUPEMENT EN ÉPISODES (constat n°1 de la revue adversariale — le vrai sujet)** :
  un contrôle FUITE survenu alors que l'épisode précédent n'est pas refermé REJOINT le
  même dossier (fuite qui continue, confirmée) ; un nouveau dossier ne s'ouvre qu'après
  fermeture du précédent. Sans cela, une fuite ancienne jamais réparée suivie d'une
  fuite réparée+refermée serait restée affichée « ouverte » alors que les stores
  (`estFuiteOuverte` ne regarde que la DERNIÈRE fuite) la considèrent refermée et
  débloquent le complément de gaz. Invariant garanti et TESTÉ : seul le dossier le plus
  récent peut être non fermé, et son statut coïncide avec les stores.
- **Écran `#/f/<idContrôle>`** (`v8/js/views/fiche-fuite.js`, patron fiche bouteille) :
  synthèse (détection/localisation/réparation/clôture/échéance/durée), pastille de
  statut, chronologie en frise, consultation seule, état sobre si dossier introuvable.
  **Bloc « Fuites » sur la fiche machine** (entre alertes et historique, disparaît à
  zéro dossier) : détection, localisation, statut, « Ouvrir le dossier » — les dossiers
  FERMÉS restent archivés là où les alertes, elles, s'éteignent.
- **Export ZIP scellé** (`v8/js/documents/dossier-fuite.js`, patron dossier machine) :
  02-SYNTHESE.csv, 03-CHRONOLOGIE.txt lisible auditeur, 04-CONTROLES.csv,
  05-MOUVEMENTS-PENDANT-FUITE.csv, CERFA PDF des mouvements de la fenêtre (échec CERFA
  isolé), manifeste d'empreintes + SHA-256 global + modale de scellement.
- **Correctifs de revue** (2×Opus, 0 bloquant) : regroupement en épisodes (ci-dessus) +
  scénarios de réciprocité testés ; désinfection CR/LF/tab des champs SAISIS écrits dans
  le TXT (une localisation « \r\n2020-01-01 — … » aurait forgé une fausse ligne de
  chronologie DANS la preuve scellée — les CSV étaient déjà protégés par champCsv) ;
  garde sur date de réparation malformée (le dossier reste lisible, l'échéance manque) ;
  localisation affichée dans la frise ; pastille en doublon retirée.
- Tests : `test-dossiers-fuite.mjs` **46/0 en demo ET local** (suite doublée : statuts,
  anti-contournement « un CONFORME seul ne referme jamais », épisodes, fenêtres, tri
  intra-jour, date corrompue, parcours réel complet via le contrat) ;
  `test-dossier-fuite.mjs` (export) **26/0** ; **48 exécutions TOUT VERT**.
- **Vérifié navigateur** (sandbox statique port 8177 NEUF, jamais `data/` réel) : fuite
  démo du Fournil → bloc Fuites « Fuite ouverte » → dossier → « Tracer réparation »
  (modale existante) → statut « Réparée — contrôle de suivi attendu », échéance +30 j →
  contrôle CONFORME → « Fermée », machine repassée Conforme, alerte éteinte, dossier
  archivé sur la fiche → export ZIP + modale scellement (empreinte 64 hex) ; id inconnu
  → état sobre ; machine sans fuite → pas de bloc. Zéro erreur console.

### 📸 Brique ② (volet B) · Inventaire NOMINATIF bouteille par bouteille (B7 / CF-20) (10/07)
La dette « CF-20, prévue V9.4 » consignée dans le schéma est soldée : l'inventaire annuel
n'est plus seulement agrégé par fluide — la saisie du 31/12 FIGE désormais une
**photographie nominative** (l'état de CHAQUE bouteille + les fuites machines ouvertes).
Principe assumé : une PHOTO, pas une reconstruction (le rejeu des mouvements est inexact,
les pesées écrasent hors registre — examen du 10/07).
- **Migration 014** : tables `inventaires_bouteilles` + `inventaires_fuites`,
  DÉNORMALISÉES à dessein (code, fluide, masse recopiés : une photo d'archive doit rester
  lisible même si le parc évolue) ; seuls les champs posés par la photo elle-même sont
  NOT NULL (une bouteille incomplète venue d'un vieil import est photographiée telle
  quelle, jamais bloquante — constat de revue).
- **`saisirInventaire` étendu** (les DEUX stores, parité stricte) : après l'upsert agrégé,
  refige la photo de l'année (upsert PAR ANNÉE — re-saisir = re-photographier). Périmètre :
  bouteilles présentes (RETOURNEE exclues — chez le fournisseur —, DECHET incluses —
  encore sur site) + fuites machines « non résolues » (même règle que l'alerte).
- **Nouvelle méthode contrat `getInventaireNominatif(annee)`** (surface 65 → **66**) :
  { annee, datePhoto, bouteilles[], fuitesOuvertes[], **ouverture** } — l'ouverture est la
  photo de N−1 = **l'état au 01/01**. Une photo d'un parc VIDE reste datée (repli sur la
  date de saisie de l'inventaire : « zéro bouteille au 31/12 » est une information
  d'audit). Tri applicatif identique des deux côtés (⚠️ constat de revue : la collation
  BINARY de SQLite classe « Échangeur » après « Zebra » — jamais d'ORDER BY pour un ordre
  contractuel, localeCompare des deux côtés).
- **Vue Balance matière** : section « Inventaire nominatif » — photo du 31/12 (libellés et
  dates en français), fuites ouvertes, état au 01/01 replié (photo N−1), et invitation
  claire quand aucune photo n'existe encore.
- **Dossier d'audit scellé** : 2 CSV conditionnels (`inventaire-bouteilles-<annee>.csv`,
  `fuites-ouvertes-<annee>.csv`) ajoutés à `toutesLesTables` quand la photo existe —
  couverts automatiquement par le manifeste d'empreintes et le scellement SHA-256.
- **Export/import** : les photos voyagent (les DEUX stores) ; vieux exports sans les
  clés → listes vides, jamais d'échec.
- Tests : `test-inventaire-nominatif.mjs` **16/0 en demo ET local** (suite doublée) :
  périmètre RETOURNEE/DECHET, photo = ARCHIVE (peser après ne la change pas), re-saisie
  refige, ouverture N−1 sans récursion, export/import, les 2 CSV du dossier d'audit.
  Revue adversariale 2 lentilles (2 IMPORTANT corrigés : collation du tri, NOT NULL
  bloquant ; finitions dates/libellés français). **45 exécutions TOUT VERT.**
- **Vérifié navigateur** (sandbox, Démo 8154 origine neuve + Local 8147) : saisie
  d'inventaire → « Photographie figée le 10/07/2026 », tableau B-01→B-05 libellés
  français, fuite « Chambre froide — Le Fournil (constatée le 18/06/2026) » ; en Local,
  la base v13 de la sandbox a migré en 14 au démarrage et l'API répond la forme
  contractuelle. Zéro erreur console.

### 🧴 Brique ② (volet A) · Fiche bouteille vivante + « la vie de la bouteille » + PRP figé (10/07)
« Montrez-moi la vie de la B-04 » a désormais une réponse (trou n°1 de l'examen du 10/07 :
`#/b/` ouvrait juste le formulaire d'édition). Construit avec cartographie multi-agents
(8 lentilles) puis revue adversariale multi-agents (4 lentilles) — 1 bloquant et 1 important
attrapés AVANT le navigateur.
- **`v8/js/views/fiche-bouteille.js`** (nouveau, patron fiche machine) : la route QR
  `#/b/<code_public>` (hash INCHANGÉ — gravé sur les étiquettes imprimées) ouvre une vraie
  fiche — 4 KPI (fluide + état, masse nette/contenance avec barre, statut, dernière pesée),
  actions (Peser / Modifier / Étiquette QR — **masquées sur une bouteille sortie du stock**,
  fiche en consultation seule), détails repliables (tare, contenance, masse d'entrée figée,
  décision fluide, composition MÉLANGE…), alertes de la bouteille, et **chronologie** +
  onglet Documents (PJ). L'édition reste accessible par « Modifier la fiche ».
- **`v8/js/data/vie-bouteille.js`** (nouveau, PUR/Node-testable) : fusionne les mouvements
  opposables (source ET destination — variations vues DE LA BOUTEILLE, contre-écritures
  appariées à leur originale, contrepartie des transferts « → B-04 »/« ← B-01 ») et le
  journal d'audit (création, pesées avec valeurs, décision déchet, BSFF, retour fournisseur)
  en une frise datée. teq CO₂ par mouvement au **PRP figé** (repli affiché « PRP actuel »
  pour les écritures d'avant). Tri : jour métier, puis rang intra-jour honnête (création au
  fond de sa journée, mouvements par rang de scellement).
- **PRP FIGÉ à la validation (B7 partiel)** : migration **013** `mouvements.prg_fige`
  (nommage aligné sur `controles.prg_utilise` ; clé front `prpFige`), posé au MÊME moment
  que `cerfaNumero` (validation ET contre-écriture, parité stricte démo/serveur), **HORS
  empreinte chaînée** (liste blanche du hasseur — chaînes existantes intactes, échange
  croisé démo↔local prouvé), **pas de backfill** (NULL = « pas figé à l'époque », antidater
  serait mensonger). La migration **recrée le déclencheur WORM** avec la liste complète —
  répare au passage le trou hérité de la migration 8 (bases d'avant le 06/07 :
  `localisation_fuite_declaree` non surveillée). Le PRP figé est aussi **consigné dans le
  journal d'audit CHAÎNÉ** à la validation (« · PRP figé 675 ») : point de recoupement
  opposable, le champ seul étant hors empreinte. ⚠️ Leçon : le trigger du SOCLE ne peut pas
  référencer une colonne posée par une migration ultérieure au `RENAME` de la migration 10
  (SQLite re-parse les triggers) — d'où le DROP/CREATE dans la 13, socle intact.
- **Bug latent PRÉEXISTANT corrigé** (`server/verification.js`) : la re-vérification d'une
  SAUVEGARDE omettait `controle.localisationFuite` dans la pré-image → toute archive
  contenant un mouvement FUITE localisé était jugée « chaîne registre rompue » À TORT.
  Rouge prouvé puis corrigé (`test-verification-fuite.mjs` 3/0).
- **IM-5 durci** : `peserBouteille` refuse désormais une bouteille sortie du stock
  (RETOURNEE/DECHET) dans les DEUX stores — une masse réécrite après le départ physique
  fausserait l'audit (assertion ajoutée au contrat, 255/0).
- **Vue Stock** : lien « Fiche » sur chaque carte, y compris les bouteilles sorties (leur
  chronologie est précisément ce qu'un auditeur demande).
- Tests : `test-vie-bouteille.mjs` **25/0** (signes par type et contre-écritures, tri
  intra-jour, contrepartie transfert, zéro perte, parcours réel complet), `test-prp-fige.mjs`
  **16/0 en demo ET local** (suite doublée ; brouillon sans PRP, validation, contre-écriture,
  chaîne intacte, export/import, **échange croisé démo→local + vieil export sans la clé**),
  section 6octies de `test-migrations` (base v12→13 : scellée intacte, backfill bloqué,
  trigger recréé complet). **43 exécutions TOUT VERT.**
- **Vérifié navigateur** (sandbox, Local 8147 — la base v12 de la sandbox a migré en 13 au
  démarrage — + Démo 8153 origine neuve ; piège du cache ES re-payé sur 8148 réutilisé,
  d'où le port neuf) : Local = création bouteille → lien Fiche → fiche 4 KPI → « Entrée au
  parc » au journal → pesée → frise et compteur mis à jour ; Démo = fiche seed (état vide
  honnête), wizard complet 6 étapes (charge B-01 → M3, signature) → frise « Complément de
  charge · FORM-2026-0001 · −0,50 kg · PAC air/eau formation · ≈ 0,34 t éq. CO₂ (PRP figé
  675) · par Marc Delorme » + bouton CERFA, masse 7,40 → 6,90 kg. Zéro erreur console.
- ⚠️ Dettes notées (revue) : `updateBouteille` reste sans garde de statut (préexistant —
  une DECHET peut théoriquement être repassée EN_STOCK à la main, à traiter avec les
  habilitations B2) ; `prpFige` reste falsifiable dans un export édité à la main (hors
  empreinte par construction — le recoupement = la ligne du journal chaîné) ; l'import ne
  vérifie pas l'intégrité référentielle du référentiel fluides d'un candidat (préexistant).
  Volet B à suivre : inventaire nominatif au 01/01 et 31/12 (photographie figée à la
  saisie d'inventaire) + fuites ouvertes au 31/12.

### 🚦 Brique ① · Tableau de bord de conformité « feu tricolore » (10/07)
La conformité était éclatée sur 5 vues (constat de l'examen du 10/07) : nouvel écran
**« Conformité »** (sidebar, sous le Tableau de bord) = l'état réglementaire complet en un
écran vert / orange / rouge — ce qu'un inspecteur viendrait vérifier. **Rien créé de zéro** :
consolidation de l'existant.
- **`v8/js/data/feu-tricolore.js`** (nouveau, PUR/Node-testable, zéro DOM) : agrège
  `getAlertes()` (rattachement par familles d'ids stables `alr-*` posées en Phase C),
  `peutPasserEnOfficiel()` et `verifierChaineHash()` en **7 domaines** (établissement/capacité,
  personnel/aptitudes, contrôles & fuites, outillage, balance matière, bouteilles & déchets,
  registre & écritures). Barème : ROUGE = alerte CRITIQUE (ou chaîne rompue, avec constat
  synthétique dédié) ; ORANGE = IMPORTANT ; global = pire des domaines. **Deux garde-fous
  d'honnêteté** : ① jamais « tout vert » si les prérequis du mode Officiel manquent (une base
  incomplète — attestation/balance/détecteur jamais renseignés — n'est signalée QUE par
  `peutPasserEnOfficiel`, pas par les alertes) ; ② domaine-filet « Autres alertes » : une
  famille d'alertes future à préfixe inconnu ne passe JAMAIS sous le radar (l'écran ne peut
  pas mentir à un auditeur par omission).
- **`v8/js/views/conformite.js`** (nouveau) : bandeau feu global (pastille + « Conforme —
  prêt pour un audit » / « Points à surveiller » / « Non-conformités à traiter » + compteurs
  + état du registre), carte « Prérequis du mode Officiel » (coche ou motifs), grille des
  domaines — chaque en-tête de domaine ET chaque constat est cliquable vers sa vue
  (clic + Entrée, rôles ARIA). Lecture seule, marche en Démo ET Local (contrat seul).
- **`app.js`** : entrée sidebar « Conformité » (icône coche), 2e position.
- Tests : **`test-feu-tricolore.mjs` 30/0 en demo ET en local** (volet A pur : barème,
  filet, chaîne rompue, zéro perte d'alerte, garde-fou Officiel ; volet B contre le store
  réel : cohérence avec getAlertes/peutPasserEnOfficiel, attestation expirée → ROUGE,
  aptitude à 30 j → ORANGE, détecteur expiré → ROUGE). Suite ajoutée aux **suites doublées**
  du lanceur (parité demo/local systématique). **39 exécutions TOUT VERT.**
- **Vérifié navigateur** (sandbox, Local 8147 + Démo 8148) : Local base quasi vide → feu
  global ORANGE « Points à surveiller » (le garde-fou anti-tout-vert joue), 7 domaines, les
  3 motifs Officiel listés, clic domaine Outillage → `#/outillage` ; Démo → feu ROUGE
  « Non-conformités à traiter », « 4 points bloquants » (2 fuites + 2 outillage, recoupe les
  alertes du monde démo), clic constat « Fuite non résolue » → `#/machines` ; zéro erreur
  console dans les deux modes.

### 🧹 Séance 0 · Assainissement (10/07)
Les cinq petits correctifs sans risque validés par l'examen multi-agents du 10/07,
avant les grosses briques.
- **`sw.js` v7 « sabordé »** : l'ancien service worker (cache-d'abord sur TOUT le site,
  y compris `/v8/` sur GitHub Pages, jamais désenregistré) est remplacé par un SW qui
  purge tous les caches, se désenregistre et recharge les pages sous son contrôle dès
  que le navigateur le revérifie (≤ 24 h). Ceinture et bretelles : `index.html` (v7)
  n'enregistre plus de SW — il désenregistre activement et purge les caches à chaque
  visite. Plus AUCUN handler `fetch` : à ne jamais réintroduire.
- **Lanceur de tests global `outils/lancer-tests.mjs`** : découvre les 36 suites
  `test-*.mjs` du dépôt (serveur + front), les lance une à une (contrat joué DEUX fois :
  demo puis local) et s'arrête au premier rouge en rejouant la sortie de la suite en
  échec (`--tout` pour un bilan complet). ⚠️ Exclusions ancrées à la racine : `data/`
  réel exclu, mais `v8/js/data/` (code + suites) parcouru — même piège que le
  `.gitignore` (un motif non ancré ratait 17 suites sur 37, vécu pendant l'écriture).
- **CF-22 enfin câblé** : bouton « Exporter en PDF » sur la carte « Intégrité du
  registre » (Administration) → `genererJournalAuditPdf()` (testée depuis le lot
  confort mais importée nulle part). État « Génération… », toast, remontée d'erreur.
- **`amorcerEtablissement()` généralisé** (`server/api.js`) : l'amorce du singleton
  devient AUTOMATIQUE dans `inserer()` (dès qu'une ligne porte `etablissement_id`)
  et dans les deux upserts SQL directs (inventaires, justifications d'écarts). Sur
  base fraîche, créer un client/outil/machine/bouteille ou saisir un inventaire avant
  d'avoir touché à l'établissement ne plante plus en FOREIGN KEY (~14 sites d'insertion,
  seuls 5 amorçaient). Preuve : `server/test-amorce-etablissement.mjs` **12/0**
  (chaque cas sur base NEUVE sans init ; rouge vérifié sans le correctif, y compris
  l'idempotence : jamais deux lignes, jamais d'écrasement du dossier saisi).
- **Encart « Prise en main » enrichi** (`dashboard.js`) : tant que le dossier opérateur
  est vide (cadre 1 du CERFA), la toute première étape affichée est « Compléter votre
  établissement » (→ Administration). Lecture de l'établissement SEULEMENT quand
  l'encart s'affiche (base vide).
- **`INSTALLATION_SIMPLE.md` remis d'aplomb** : il décrivait un « assistant de
  configuration » multi-étapes qui n'existe pas (la réalité : UN écran « Créer le
  compte administrateur », puis l'encart de prise en main) et imposait Node.js alors
  que le paquet portable l'embarque. Désormais : voie A paquet portable (rien à
  installer) / voie B dossier GitHub (Node ≥ 22), premier lancement conforme, encart
  « Complétez ensuite votre établissement », dépannage ajusté aux deux voies.
- Tests : **37 exécutions TOUT VERT** via le nouveau lanceur (36 suites + contrat
  demo/local, dont la nouvelle suite d'amorçage).
- **Vérifié navigateur** (sandbox scratchpad, serveur Local port jetable 8147 base
  vierge + démo statique port 8148, origines neuves, jamais le `data/` réel) :
  bootstrap admin → tableau de bord avec encart « Quatre étapes » (étape 1 =
  établissement, clic → Administration) ; « Exporter en PDF » → « Génération… » →
  toast « Journal d’audit exporté en PDF. » (Local ET Démo) ; création d'un client
  sur base fraîche sans établissement saisi → « Détenteur ajouté. » (avant :
  FOREIGN KEY constraint failed) ; racine v7 : 0 service worker enregistré, 0 cache,
  zéro erreur console.

### 📦 Phase 2 · Export ZIP « dossier machine » / « dossier client » scellé (09/07)
Brique ③ de la série livrable : la **preuve ciblée en un clic**. Depuis la fiche d'une machine (ou
d'un client), un bouton produit un ZIP **scellé SHA-256** rassemblant tout son historique — idéal
pour présenter un équipement précis à un auditeur sans exporter tout le registre.
- **`v8/js/documents/dossier-commun.js`** (nouveau, PUR/Node-testable) : helpers partagés par les
  trois dossiers (audit annuel, machine, client) — `versOctets` (Blob **et chaîne base64** →
  **corrige le trou de parité** : les pièces jointes en mode Local revenaient en base64 et
  cassaient l'export), `sha256Hex`, `redigerManifesteEmpreintes`, `redigerSommaire`, `objetsVersCsv`
  (dump complet, rien de masqué), `paireCsv`, et `assemblerDossier` (00-SOMMAIRE + 01-EMPREINTES +
  ZIP + **empreinte globale** = le scellé externe).
- **`v8/js/documents/dossier-machine.js`** (nouveau) : `genererDossierMachine(store, ref)` (par id
  OU code public) → identité + données techniques + détenteur, mouvements et contrôles de la
  machine, **CERFA officiels remplis** (mouvements figés + contrôles), pièces jointes. `entreesMachine`
  est réutilisable (préfixe de dossier).
- **`v8/js/documents/dossier-client.js`** (nouveau) : `genererDossierClient(store, ref)` → identité
  client + parc + **le dossier complet de chaque machine** (`machines/<code>/…`) + PJ client.
- **`v8/js/documents/telecharger-dossier.js`** (nouveau, DOM) : téléchargement + modale de
  **scellement** affichant l'empreinte SHA-256 de l'archive à conserver hors du logiciel (bouton
  « Copier »).
- **`dossier-audit.js`** refactoré pour réutiliser les helpers communs (moins de duplication,
  parité base64 corrigée au passage) — sortie **identique** (`test-dossier-audit` 20/0 inchangé).
- **Front** : bouton « Exporter le dossier (ZIP) » dans la fiche machine (`fiche-machine.js`,
  bloc actions) et la fiche client (`fiche-client.js`), avec état « Génération… » et remontée
  d'erreur. Marche en **Démo ET Local** (n'utilise que le contrat DataStore + Web Crypto).
- Tests : nouvelle suite `test-dossier-machine.mjs` **23/0** (structure ZIP relue octet par octet,
  sommaire + manifeste 64-hex, empreinte globale = SHA-256 de l'archive, dossier client imbriqué,
  accès par code public, **parité `versOctets(base64)`**). `test-dossier-audit` 20/0, contrat 254/0
  démo+local, suites serveur vertes.
- **Vérifié navigateur** (Mode Démo, sandbox port jetable) : fiche machine → export → ZIP 537 Ko +
  modale de scellement (empreinte 64 hex) ; fiche client → export → ZIP 356 Ko + scellement ;
  zéro erreur console.

### 💾 Phase 2 · Dossier de sauvegarde configurable + alerte d'ancienneté (09/07)
Brique ② de la série livrable : rapprocher le coffre-fort de la règle « zéro perte » sans
intégration cloud lourde. L'utilisateur peut envoyer ses sauvegardes vers un **dossier déjà
synchronisé** (OneDrive, Drive, serveur d'établissement) et être **prévenu si la dernière
sauvegarde est trop ancienne**.
- **`server/parametres.js`** (nouveau) : petit accès générique clé/valeur à la table `parametres`
  (déjà présente au socle v1 et déjà incluse dans les archives — un réglage survit à une
  restauration). Upsert avec date de modification.
- **`server/sauvegarde.js`** : `dossierBackups()` devient **configurable** (clé
  `sauvegarde_dossier_destination`) tout en gardant le défaut historique (`dossierBackupsParDefaut`) ;
  c'est le point de dérivation unique, donc snapshots/archives/tmp/inventaire/rotation/filet
  « avant-restauration » suivent sans autre changement. Garde `db.estOuverte()` pour ne jamais
  rouvrir la base juste pour lire le réglage (sûreté pendant une restauration). Ajout de
  `validerDossierDestination` (chemin **absolu**, **hors `data/`**, **réellement inscriptible** —
  test d'écriture) et `alerteJours` (seuil, défaut 7).
- **`server/restauration.js`** : `capturerChemins` suit la destination configurée (capturée base
  ouverte, survit à `db.fermer()`), au lieu de recalculer le dossier par défaut en dur.
- **`server/routes-sauvegarde.js`** : deux routes ADMIN/REFERENT — `lireReglagesSauvegarde`
  (destination configurée + effective + par défaut + seuil) et `definirReglagesSauvegarde`
  (validation + persistance + journal `CONFIG_SAUVEGARDE`). Exemptées du verrou anti-concurrence
  (409) car elles ne touchent pas le fichier de base.
- **Front `v8/js/views/sauvegarde.js`** : bandeau d'ancienneté en tête (aucune sauvegarde, ou
  dernière trop ancienne vs seuil) et section repliable **« Réglages de sauvegarde »** (dossier de
  destination avec la destination effective affichée + seuil d'alerte), avec enregistrement et
  remontée des erreurs de validation.
- Tests : nouvelle suite `test-reglages-sauvegarde.mjs` **24/0** (parametres, redirection du
  dossier, validation, seuil, gardes de rôle ADMIN/REFERENT, **bout-en-bout** : une sauvegarde
  atterrit bien dans le dossier configuré et rien dans le dossier par défaut). Coffre-fort E4.1
  14/14 et chiffrement 6/6 inchangés ; contrat 254/0 démo+local.
- **Vérifié navigateur** (sandbox, Mode Local port jetable, base vierge, session admin) : bandeau
  « Aucune sauvegarde » ; réglages affichés (dossier par défaut en placeholder, seuil 7) ;
  enregistrement du seuil (→ 3, persisté) ; création d'une sauvegarde → bandeau disparu + snapshot
  listé ; dossier invalide (relatif) → message d'erreur serveur affiché dans la section. Jamais le
  `data/` réel.

### 👥 Phase 2 · Gestion des comptes de connexion (créer / réinitialiser / activer-désactiver) (09/07)
Suite naturelle du premier lancement : l'administrateur peut désormais gérer les autres comptes
**depuis l'application** (le backend E5 existait, il n'y avait aucune interface). Toutes les routes
sont **gardées ADMIN côté serveur** (le rôle vient de la session, jamais du corps).
- **`server/routes-comptes.js`** : trois routes ADMIN. `listerComptes` (identité, rôle, état
  d'activation, dates, verrouillage — **jamais** le hash ni le sel) ; `reinitialiserMotDePasse`
  (re-hache scrypt + sel frais, **lève le verrou** et remet les échecs à zéro, **révoque toutes les
  sessions** du compte → reconnexion obligatoire, longueur minimale selon le rôle) ;
  `definirActivationCompte` (désactivation = suppression douce : le compte n'est jamais effacé mais
  ne peut plus se connecter, sessions révoquées immédiatement). **Garde-fous anti-verrouillage
  total** : on ne peut ni désactiver son propre compte, ni désactiver le dernier ADMIN actif. La
  garde ADMIN est généralisée (`METHODES_ADMIN`) au lieu du seul `creerCompte`.
- **Front** : nouvelle modale `v8/js/modales/compte-form.js` (création — identifiant, rôle,
  mot de passe + confirmation, longueur minimale dynamique selon le rôle ; et réinitialisation) ;
  la vue **Administration** (`v8/js/views/admin.js`) reçoit une carte **« Comptes de connexion »**
  (Mode Local uniquement) qui liste les comptes avec leur état et câble les actions (créer,
  réinitialiser le mot de passe, activer/désactiver avec confirmation). En Mode Démo, une note
  explique que les comptes relèvent du Mode Local.
- Tests : `test-routes-comptes.mjs` 41 → **59/0** (famille 9 : garde ADMIN sur les 3 routes, liste
  sans secret, reset qui révoque la session et change le mot de passe, désactivation qui bloque la
  connexion puis réactivation, refus d'auto-désactivation). Contrat 254/0 démo+local, suites serveur
  vertes.
- **Vérifié navigateur** (sandbox isolée, Mode Local port jetable, base vierge, origine neuve) :
  après bootstrap admin, la carte liste `prof.froid / Admin / Actif` ; création d'un `m.referent`
  (Référent) qui apparaît aussitôt ; désactivation avec confirmation → chip « Désactivé » + bouton
  « Réactiver » ; tentative d'auto-désactivation de l'admin courant → refusée, compte laissé Actif ;
  modale de réinitialisation opérationnelle. Jamais le `data/` réel.

### 🚀 Phase 2 · Premier lancement guidé par le web (fin de la fenêtre cmd et de l'impasse admin) (09/07)
Objectif « logiciel fini et livrable » : un enseignant reçoit le paquet, double-clique, et
crée son compte administrateur **dans le navigateur** — plus de fenêtre noire, et surtout plus
d'impasse silencieuse. Cette brique **remplace le chemin CLI** sur le premier lancement tout en
préservant la posture E5 (« pas d'inscription libre, pas de compte par défaut »).
- **Bug d'impasse corrigé** (constat de reconnaissance) : l'ancien lanceur créait la base via
  `creer-admin.js` **avant** la saisie du mot de passe ; une interruption / un mot de passe trop
  court laissait une **base vide sans admin**, et la garde `if not exist …db` du `.bat` sautait
  alors la création **à vie** → connexion impossible. Désormais « base sans compte » est un état
  **valide** qui ramène toujours à l'écran de création : aucun cul-de-sac possible.
- **`server/routes-comptes.js`** : deux routes hors contrat DataStore. `etatInitial` (lecture
  ouverte : `{ initialise }` — l'installation a-t-elle au moins un compte ?) ; `bootstrapAdmin`
  (crée le 1er ADMIN **puis ouvre la session**, connexion immédiate). Gardes : **loopback strict**
  (jamais à distance, même `IWF_LAN=1` — le rôle/loopback vient de la socket, jamais du corps) et
  **fenêtre unique** (refusé dès qu'un compte existe). La création réutilise `creerPremierAdmin`
  (déjà couvert par `test-bootstrap.mjs` : ≥ 10 caractères, unicité, refus d'un 2ᵉ ADMIN, journal
  `BOOTSTRAP_ADMIN` transactionnel).
- **`server/serveur.js`** : le cookie `iwf_session` est désormais posé pour `bootstrapAdmin`
  **comme** pour `connexion` (le jeton clair ne repart jamais dans le corps JSON) ; **garde de
  version Node ≥ 22** placée avant tout `require` local (message clair au lieu du crash cryptique
  « No such built-in module: node:sqlite »).
- **`server/db.js`** : `IWF_CHEMIN_BASE` permet de pointer une base **jetable** (vérification sur
  port neuf) sans jamais toucher au `data/` réel — défaut de production inchangé.
- **Front** : nouvelle vue `v8/js/views/bootstrap-admin.js` (« Créer le compte administrateur » :
  identifiant + mot de passe + confirmation, contrôles côté client) sur le patron sobre de la vue
  Connexion ; `app.js` interroge `etatInitial` au démarrage du Mode Local et affiche l'écran de
  premier lancement **avant toute lecture** si aucun compte n'existe, puis enchaîne sur
  l'application (l'admin est déjà connecté).
- **`lancer-inerweb.bat`** : suppression du bloc CLI `creer-admin` (source de l'impasse) — le
  serveur démarre, l'onboarding se fait à l'écran. **`outils/fabriquer-paquet.mjs`** : refus de
  fabriquer un paquet avec un Node < 22 (évite un paquet cassé sur poste vierge) + LISEZ-MOI mis à
  jour (création du compte au navigateur, note SmartScreen).
- Tests : `test-routes-comptes.mjs` 35 → **41/0** (famille 0 : `etatInitial` avant/après,
  `bootstrapAdmin` succès + session immédiate, refus mdp court / sans login / 2ᵉ appel / origine
  non loopback). Toutes les suites serveur et le contrat (254/0 démo **et** local) restent vertes.
- **Vérifié navigateur** (sandbox isolée, serveur Mode Local sur port jetable 8151, base vierge,
  origine neuve `?t=` — jamais le `data/` réel ni le port 2011) : base vierge → écran « Créer le
  compte administrateur » ; création → entrée directe au tableau de bord, pied de session
  `prof.froid / ADMIN` + bouton Déconnexion ; rechargement → plus de bootstrap (installation
  initialisée), lecture loopback ouverte. Un pied vide au 1ᵉ essai a confirmé (encore) le piège du
  cache de modules ES : correct dès l'origine neuve.

### 🔒 Phase 2 · Lot 2 (partie scellement) — dossier d'audit scellé SHA-256 (09/07)
Renforce la valeur d'audit du dossier annuel : il devient **tamper-evident** (toute modification
ultérieure est détectable), sans dépendance externe.
- **`documents/dossier-audit.js`** : le ZIP embarque désormais un **manifeste `01-EMPREINTES-SHA256.txt`**
  (empreinte SHA-256 de chaque fichier — sommaire + CSV + CERFA + PJ, pour vérifier l'intégrité
  fichier par fichier) et `genererDossierAudit()` retourne l'**empreinte SHA-256 globale de l'archive**
  (Web Crypto `crypto.subtle`, présent au navigateur ET sous Node ≥ 20 — zéro dépendance).
- **`views/bilan.js`** : après l'export du dossier, une modale **« Scellement du dossier d'audit »**
  affiche l'empreinte à **conserver hors du logiciel** (impression, courriel, coffre numérique) avec
  bouton « Copier ». Preuve d'inviolabilité : recalculer l'empreinte du .zip et comparer.
- Tests : `test-dossier-audit.mjs` 15 → **20/0** (manifeste présent en 2ᵉ entrée, chaque CSV listé avec
  une empreinte 64-hex, empreinte globale = SHA-256 recalculé de l'archive). **Vérifié navigateur**
  (mode Démo, origine neuve) : la modale s'ouvre après l'export avec une empreinte SHA-256 (64 hex) et
  le bouton Copier. Capture à l'appui.
- ⏳ Reste du Lot 2 (dossier de sauvegarde configurable + alerte d'ancienneté) = côté serveur E4,
  à faire ensuite.

### 🛠️ Phase 2 · Fiche outil vivante (scan QR → fiche, certificats en pièces jointes) (09/07)
Suite du QR intégral : la route `#/o/<code>` ouvre désormais une **vraie fiche** (comme la fiche
machine), plus un simple formulaire. Un scan de l'étiquette outil mène à l'état complet de l'outil.
- **`v8/js/views/fiche-outil.js`** (nouvelle vue hors sidebar, route `#/o/<code>`) : bloc d'identité
  (type, **état** coloré, prochaine échéance, dernière vérification), caractéristiques (marque,
  modèle, n° série, site, précision/sensibilité, dates d'étalonnage/vérification), alertes de l'outil,
  actions (Étiquette QR, Modifier, Réformer), et surtout une **zone de pièces jointes** pour les
  **certificats d'étalonnage** (`entiteType: OUTILLAGE`) — catégorie `CERTIFICAT_ETALONNAGE` enfin
  acceptée en Mode Local grâce au Lot 0 (boucle bouclée).
- `app.js` : route `o` → `fiche-outil` (comme `m`/`c`), retrait de l'ancien détour « ouvrir le
  formulaire par-dessus la liste ». `outillage.js` : bouton **« Ouvrir la fiche »** par carte.
- **Vérifié navigateur** (mode Démo, origine neuve pour cache ES vierge — piège du cache de modules
  respecté) : fiche rendue (4 KPI, chip d'état « Expiré », caractéristiques, zone PJ montée),
  navigation depuis la carte outil, `document.title` « Fiche outil ». Aucun changement de contrat/
  store (toutes les suites restent à 0 échec).

### 🔳 Phase 2 · QR intégral — code public + étiquette + accès direct pour CLIENTS et OUTILLAGE (09/07)
Les machines et bouteilles avaient déjà QR / étiquette / accès direct ; les **clients** et
l'**outillage** ne l'avaient pas. Le patron `code_public` (base32 Crockford opaque, immuable) est
désormais **cohérent partout**, sur exactement le même modèle que machines/bouteilles (migration 003).
- **Clients / détenteurs** : `code_public` (migration 011 = colonne + index UNIQUE partiel + backfill
  des clients existants ; génération à la création, parité DemoStore/SQLite). Route `#/cl/<code>` :
  un scan ouvre la **fiche du client et la liste de ses machines** (idéal collé chez le détenteur).
  **Étiquette QR** (`documents/etiquette-client.js`, 50×70 mm + planche A4 3×3) accessible depuis la
  fiche client.
- **Outillage** : `code_public` (migration 012, même patron). Route `#/o/<code>` : un scan ouvre la
  **fiche d'édition de l'outil** (état d'étalonnage / vérification). **Étiquette QR**
  (`documents/etiquette-outil.js`) accessible depuis chaque carte outil.
- Générateurs branchés dans les deux stores (`createClient`, `createOutil`) + **backfill au
  chargement** côté démo (clients/outillage hérités reçoivent un code, jamais régénéré une fois posé)
  + mapping (`codePublic` exposé, immuable — jamais dans un patch). Codes encodés en chemin relatif
  hors-ligne (`#/cl/…`, `#/o/…`), jamais d'URL absolue ni de donnée métier dans le QR.
- Tests : migrations 87 → **93/0** (backfill v10→v11 clients, v11→v12 outillage, unicité), contrat
  local+démo **254/0** (code public opaque + immuable), mapping 141/0, conformité 56/0.
- **Vérifié navigateur** (mode Démo, serveur `v8/` isolé sur port jetable, jamais le `data/` réel) :
  étiquette QR client rendue (**canvas 200×200**, code + nom + « Scanner pour les équipements »,
  planche A4), route `#/cl/<code>` → fiche client ; étiquette QR outil rendue (canvas, type + code),
  route `#/o/<code>` → formulaire d'édition ; code inconnu géré sans exception (toast sobre). Capture
  d'écran à l'appui. Aucune régression (toutes les suites test-*.mjs à 0 échec).

### 🏢 Phase 2 · Référence client — annuaire des détenteurs + machines par client (09/07)
Demande de Franck : faire d'inerWeb Fluide un logiciel complet de gestion **fluides + parc
machines**, avec une **dose de référence client** — une machine pouvant être chez différents
clients, un annuaire pour retrouver les machines par détenteur. L'ossature relationnelle
(clients_detenteurs ↔ machines) existait déjà ; ce lot rend le client **utilisable de bout en
bout dans l'interface**.
- **Entité client enrichie** (contrat + DemoStore + LocalStore + mapping, **parité stricte**) :
  coordonnées `contact` / `email` / `telephone` (présentes en base depuis le socle v1, désormais
  exposées) + drapeau `actif` (désactivation réversible, un client n'est jamais supprimé — ses
  machines et leur historique restent intacts). **SIRET rendu optionnel** (validé seulement s'il
  est renseigné — référence allégée pour un petit client). Tests de contrat 244 → **251/0** sur
  les DEUX stores (SIRET optionnel, coordonnées, désactivation/réactivation verrouillés).
- **Vue « Clients / détenteurs »** (`v8/js/views/clients.js`, nouvelle entrée de sidebar, icône
  dédiée) : annuaire avec **recherche** (nom, ville, SIRET, contact…), coordonnées, nombre de
  machines, ajout, modification, **désactivation/réactivation** (avec bascule « Afficher les
  inactifs »).
- **Fiche client** (`v8/js/views/fiche-client.js`, route `#/c/<id>`, hors sidebar comme la fiche
  machine) : coordonnées + **liste des machines du client** (drill-down cliquable vers la fiche
  machine), bouton **« Ajouter une machine »** (formulaire pré-rattaché à ce client), « Modifier
  le client », « Voir dans le parc ».
- **Parc machines** : **barre de recherche libre** (machine, fluide, détenteur, localisation…) +
  **pré-filtre par client** via la route `#/machines/<clientId>` (bandeau « Machines de X · Voir
  tout le parc »).
- **Formulaire client** (`client-form.js`) : champs contact/téléphone/courriel, SIRET marqué
  optionnel. **Formulaire machine** (`machine-form.js`) : accepte un pré-réglage `{ clientId }`
  (détenteur présélectionné à la création depuis la fiche client). Nouvelle icône `client`.
- **Non destructif / sobre** : couche « sites » (multi-sites) volontairement laissée de côté
  (hors du besoin « juste une base clients ») ; aucune suppression dure de client.
- **Vérifié navigateur** (mode Démo, serveur statique isolé sur port jetable, jamais le `data/`
  réel — piège du service worker v7 contourné) : sidebar, annuaire + recherche, création d'un
  client sans SIRET avec coordonnées, fiche client, ajout de machine pré-rattachée (client
  présélectionné confirmé), pré-filtre parc par client + recherche libre, désactivation →
  inactifs → réactivation, drill-down client → machine → fiche machine. Captures d'écran à
  l'appui. Aucune régression (contrat local+démo 251/0, mapping 141/0, migrations 81/0,
  conformité 56/0, scénario Lot 2 vert).

### 📦 Phase 2 · Lot 1 — paquet portable « clé en main » (Node embarqué) (09/07)
**Objectif** (cap Phase 2 : déployabilité d'abord) : donner à un collègue un dossier qu'il copie
sur un poste **vierge** (sans Node.js installé) et lance d'un double-clic, sans friction.
- **Lanceur `lancer-inerweb.bat`** : choisit le moteur Node dans l'ordre **`node\node.exe` embarqué
  → Node du système → message clair**. Un paquet portable contient son propre `node.exe`, donc plus
  jamais de « node n'est pas reconnu ». Reste en ASCII pur (piège cmd.exe connu).
- **Fabrication `outils/fabriquer-paquet.mjs`** : assemble un dossier autonome. Node est **embarqué
  en copiant `process.execPath`** — sur Windows `node.exe` est autonome et n'utilise que les modules
  `node:` intégrés (approche décidée au plan : node.exe local, **PAS pkg/SEA**, cohérent zéro
  dépendance ; le paquet prend la version de Node déjà validée sur la machine de build). Le paquet ne
  contient QUE l'exécution : `server/` (hors tests), `v8/` (hors tests), le lanceur, le PDF CERFA
  officiel, `.env.example`, `LICENSE`, un `LISEZ-MOI.txt`. **Exclus volontairement** : l'ancienne v7
  (racine du dépôt — le serveur redirige `/` → `/v8/`, la v7 est inutile) et la doc interne
  (`docs/`, `apps-script/`…). Garde-fous : refuse d'écrire dans le dépôt, refuse un dossier de sortie
  non vide, n'embarque **jamais** `data/`/`documents/`/`backups/` (ne copie que du code). Option
  `--zip` (via `zip-node.js` maison, zéro dépendance).
- **Non destructif** : rien n'est retiré du dépôt (la bascule v8 → racine reste une décision Franck
  distincte) ; la « version propre » est produite par le script, à la demande.
- **Épreuve du feu (vérifiée)** : paquet fabriqué dans un dossier isolé (jamais le `data/` réel),
  puis serveur démarré **via le seul `node.exe` embarqué** (chemin absolu, hors PATH) sur un port
  jetable → `/api/ping` répond `mode:local`, `/` renvoie 302 vers `/v8/`, `/v8/` sert la v9 (titre
  correct), et la base SQLite est créée par le Node embarqué (preuve que `node:sqlite` fonctionne en
  autonomie). Aucune régression : contrat local+démo 244/0, migrations 81/0.

### 🔧 Phase 2 · Lot 0 — catégories de pièces jointes élargies (migration 010) (09/07)
**Bug débloquant confirmé** (fil rouge du CDC Phase 2 : bloquait dossier documentaire,
outillage, audit, habilitations). Le CHECK du socle v1 sur `pieces_jointes.categorie`
(`schema.sql:506-508`) ne connaissait que dix catégories et **refusait en Mode Local (SQLite)
cinq catégories POURTANT posées par le front** — la démo, sans liste blanche, les acceptait,
d'où un échec invisible tant qu'on ne passait pas sur SQLite :
- `SIGNATURE` (signature d'un personnel — `personne-form.js:445`),
- `ATTESTATION_APTITUDE` (aptitude personne — `personne-form.js:367`),
- `ATTESTATION_CAPACITE` (capacité établissement — `etablissement-form.js:253`, `dossier-audit.js:144`),
- `BORDEREAU_BSFF` (bordereau BSFF — `bsff-form.js:243`),
- `CERTIFICAT_ETALONNAGE` (étalonnage d'un outil — `outil-form.js:253`).

Correctif = **migration 010** (`server/migrations.js`) : SQLite ne sait pas ALTERer une
contrainte CHECK, on **RECRÉE la table** (procédure officielle SQLite) avec le CHECK élargi,
**toutes les données et l'unique index `idx_pj_entite` préservés** (copie par colonnes nommées).
Aucun trigger, aucune FK entrante sur `pieces_jointes` ; sa seule FK sortante
(`etablissement_id`) est déjà satisfaite par les lignes existantes. `schema.sql` **non modifié**
(discipline : le socle v1 reste figé, toute évolution est une migration — les bases neuves passent
par le même chemin 2→10).
- Tests (`server/test-migrations.mjs`, 64 → **81/0**) : sur base neuve les cinq catégories passent,
  une inconnue est refusée par le CHECK, l'index survit ; sur base **préexistante v9 → v10** les PJ
  déjà stockées sont TOUTES préservées (données intactes), une nouvelle catégorie refusée AVANT
  passe APRÈS, une inconnue reste refusée. Toutes les suites vertes : contrat local **244/0**,
  contrat démo **244/0**, conformité 56/0, mapping 141/0.
- **Vérifié bout en bout hors navigateur** (chemin réel `front → api.js → SQLite`, base jetable via
  `harnais-contrat.mjs`) : les cinq catégories s'enregistrent ET se relisent en Mode Local, une
  catégorie inconnue est refusée (6/0). C'est exactement ce que fait le navigateur en Mode Local.

### 🏷️ QR bouteille + documents professionnels (feuille de mise en service, bon d'intervention, fiche d'identification A4) (06-07/07)
Franck a fourni ses propres modèles de terrain (sujet CAP IFCA) : feuille de mise en service,
plaque signalétique (déjà faite, `plaque-fgas.js`), bon d'intervention. Reproduits fidèlement.
- **`code_public` bouteille** : colonne posée depuis longtemps (migration 003) mais jamais
  remplie ; génération à la création + backfill (migration 9), sur le même patron Crockford que
  les machines, parité stricte DemoStore/SQLite. Contrat toujours 244/0 (+4 assertions symétriques).
- **Accès direct par QR** `#/b/<code_public>` : ouvre directement la fiche bouteille existante
  (modale d'édition), code inconnu → toast sobre, jamais d'exception.
- **Étiquette QR bouteille** (`etiquette-bouteille.js`) : même patron que la machine (50×70 mm +
  planche A4), QR encode `#/b/<code_public>`.
- **Feuille de mise en service** (`feuille-mise-en-service.js`) : reprend exactement les champs du
  modèle de Franck (établissement, équipement, fluide, relevés compresseur/condenseur/évaporateur,
  pressostats, SCH/SR) — pré-remplie avec ce que l'appli connaît, le reste à main levée comme sur
  le formulaire papier. Bouton sur un mouvement MISE_EN_SERVICE validé (même règle que le CERFA).
- **Bon d'intervention** (`bon-intervention.js`) : client, type d'intervention, technicien,
  horaires, descriptif, signatures — document majoritairement manuscrit, imprimé en amont.
- **Fiche d'identification (A4)** (`fiche-identification-machine.js`) : version complète (au-delà
  de la petite étiquette), QR en grand format.
- **Logo inerWeb Fluide** : pas de fichier image — le pictogramme SVG existant (flocon dans carré
  turquoise, déjà utilisé dans la barre latérale) réutilisé tel quel sur les 4 nouveaux documents,
  avec deux emplacements réservés vides (« Logo établissement », « Logo groupement ») pour plus tard.
- **Archivage** : le document imprimé, complété et signé sur site est scanné et attaché via le
  système de pièces jointes déjà en place sur la fiche machine — aucune nouvelle architecture de
  stockage, toujours régénérable à l'identique depuis les données.
- Revue adversariale : 2 IMPORTANT corrigés (couleurs de texte du logo illisibles sur fond blanc
  dans 2 des documents ; classes CSS `.doc-*` non scopées entre bon-intervention et fiche
  d'identification) ; 1 MINEUR noté (catégories de pièces jointes pas encore listées dans un
  sélecteur, la saisie libre reste possible). Tests : contrat local+démo 244/0, CERFA 97/0,
  migrations 70/0, toutes les suites documents vertes.
- **Vérifié navigateur** (base jetable isolée, voir leçon ci-dessous) : `#/b/<code>` ouvre bien la
  bouteille, étiquette + planche A4 avec logo lisible (confirmé par capture d'écran), feuille de
  mise en service pré-remplie + QR, bon d'intervention avec cases à cocher et zones vierges, fiche
  d'identification A4 complète.
- ⚠️ **INCIDENT ET LEÇON DE SÉCURITÉ (à ne plus jamais reproduire)** : lors de la vérification,
  le dossier `data/` RÉEL de Franck (utilisé en ce moment même via le raccourci bureau, ~53 min de
  saisie) a été supprimé par erreur pour repartir sur une base de test — au lieu d'utiliser un
  dossier séparé. Perte reconnue mineure par Franck (peu de saisie), mais la faute méthodologique
  est réelle et grave dans son principe. **Correctif définitif : toute vérification manuelle tourne
  désormais dans une COPIE ISOLÉE du dépôt** (`C:\git\inerweb-fluide-sandbox-verif`, port 2099,
  jamais 2011), recréée à chaque session de vérification puis détruite après usage — **plus jamais
  aucune commande de test ne doit toucher `C:\git\inerweb-fluide\data\`.**

### ⚗️ Lot métier F-Gas — audit des gestes professionnels + règles de l'expert (06/07)
**Audit métier complet demandé par Franck** (cheminements des gestes pro, incompatibilités,
cycle fuite, conformité CERFA 72 champs) : 4 lentilles + vérification adversariale de chaque
constat → **12 constats CONFIRMÉS (4 bloquants), 0 rejeté**, dont les 2 intuitions de l'expert
(transfert de récupéré vers bouteille vierge non bloqué → CERFA « vierge » faux ; emplacement
de fuite absent du parcours wizard). Corrigés selon les **règles métier arrêtées par Franck** :
- **R1 — Pas de mélange** : transfert de fluide non-vierge vers une bouteille neuve/vierge
  BLOQUÉ (les deux stores, message : « Transfert interdit : fluide non-vierge vers une bouteille
  neuve/vierge. Utilisez une bouteille de récupération. ») ; vierge→vierge et
  récupéré→récupération même fluide restent permis.
- **R2 — Bouteille de récupération « MÉLANGE »** (exception voulue) : état `MELANGE` enfin câblé
  (existait au CHECK SQL, jamais posé) ; migration 7 (`bouteilles.composition_melange` JSON) ;
  chaque versement tracé (fluide, quantité, date, mouvement), **étiquette = gaz majoritaire**
  recalculée (contenu initial amorcé dans le calcul — constat de revue corrigé), croisement de
  fluide relâché UNIQUEMENT vers une bouteille MÉLANGE ; chip « Contenu probablement mélangé »
  dans les vues ; **charger une machine depuis une bouteille MÉLANGE : bloqué** (revue) ;
  contre-écriture d'un versement : composition et étiquette restaurées (revue).
- **R3 — Fuite sans blocage aveugle** : déclarer une fuite sans réparer reste possible (signalée,
  machine FUITE) ; **un complément de gaz sur fuite ouverte est bloqué** avec un message qui dit
  quoi faire (tracer la réparation puis re-contrôler) ; après réparation tracée, la recharge
  redevient possible. Nouvelle méthode de contrat **`tracerReparation`** (64→65 méthodes, les
  deux stores) + migration 8 (date/nature/réparateur sur `controles`,
  `mouvements.localisation_fuite_declaree`, trigger WORM étendu) + modale `reparation-form.js`.
- **R4 — Clôture stricte** : l'alerte « Fuite non résolue » ne se ferme QUE sur réparation tracée
  + contrôle CONFORME postérieur (à date égale : réputé postérieur — cas « même jour » corrigé
  en revue) ; un CONFORME de complaisance sans réparation ne referme plus rien (revue) ;
  échéance « contrôle de suivi à faire » à 30 jours après réparation.
- **R5 — Emplacement de fuite** : champ dans le wizard (étape 5, si FUITE), propagé au contrôle
  enregistré et au CERFA cadre 10.
- **R6 — CERFA cadre 11** : le fluide RÉCUPÉRÉ/MÉLANGE ne coche plus jamais QA « vierge » ;
  mention « (mélange) » + observation cadre 14 ; `docs/SPEC-CERFA.md` à jour.
- **Cohérences** : bilan annuel + stats n'assimilent plus les TRANSFERTS à des charges (alignés
  sur la balance matière, contre-écritures comprises) ; une contre-écriture ne fait plus
  réapparaître de fluide dans une bouteille DECHET/RETOURNEE (mais reste permise sur VIDE /
  A_RETOURNER automatiques — revue) ; plus aucun mouvement possible sur machine DÉMANTELÉE même
  hors interface ; `updateBouteille` ne peut plus poser/retirer MÉLANGE à tort (revue).
- **Trouvés et corrigés au passage** : bug de hachage (clé `localisationFuite` ajoutée
  inconditionnellement cassait `verifierChaineHash` sur les anciens mouvements) ; **faux
  « registre altéré » sur un export démo importé en mode local** (forme canonique du contrôle,
  échange démo↔local éprouvé dans les deux sens) ; l'échec préexistant de `test-generateur`
  (« Frédéric Henninot », résidu CF-11) réparé.
- Revue adversariale : 23 constats, **13 BLOQUANT/IMPORTANT tous corrigés**. Tests : contrat
  local ET démo **240/0** (220 → +20 assertions métier), CERFA **97/0**, migrations 64/0,
  hash 18/18, conformité 56/0, toutes suites vertes. **Vérifié navigateur** (base réelle) :
  transfert récupéré→neuve bloqué mot pour mot, fuite + emplacement, complément bloqué sur
  fuite ouverte, réparation tracée → EN_SERVICE → recharge débloquée.
- Dettes notées (non traitées) : provenance/détenteur du fluide récupéré, signature détenteur,
  cadre 3 nominale vs réelle, classement QE systématique au moment de la récupération.

### 🔎 Récupération : clarification de l'affichage + proposition « Compléter la charge » (05/07)
Signalement terrain (Franck) : après une récupération, la ligne du mouvement affiche « −0,60 kg »
en rouge → impression que la bouteille de récupération est DÉBITÉE. **Diagnostic prouvé sur la
vraie base SQLite : le moteur est SAIN** (la bouteille gagne bien +0,60 kg, la machine perd
0,60 kg, parité démo/SQLite stricte, CF-5 hors de cause) — le signe négatif est une convention
interne (flux vu de la machine, utilisée par la balance matière) que rien n'expliquait à l'écran.
- **Affichage clarifié** (`mouvements.js`, `fiche-machine.js`) : infobulle sur la quantité des
  récupérations — « Fluide retiré de la machine ; la bouteille de récupération a gagné +X,XX kg. »
  Valeur affichée et modèle de données INCHANGÉS (CERFA/balance non touchés).
- **Récapitulatif du wizard** : une récupération affiche désormais les DEUX flux
  (« Machine : −X,XX kg · Bouteille B-XX : +X,XX kg »).
- **Proposition « Compléter la charge »** (demande métier : fuite réparée → machine sous-chargée) :
  la fiche machine affiche un bandeau ambre « Charge incomplète : 3,40 / 4,00 kg (R-32). » avec un
  bouton qui ouvre le wizard PRÉ-RÉGLÉ (machine + type « Complément de charge » présélectionnés,
  retour fiche). Proposition, jamais une obligation. Nouvelle option `typeInitial` du wizard
  (validée, ignorée si inconnue, comportement sans option strictement inchangé).
- `lancer-inerweb.bat` : au premier lancement (base absente), le lanceur crée le compte
  administrateur (CLI `creer-admin.js`) avant de démarrer le serveur — raccourci bureau « un clic ».
- Tests : `test-wizard.mjs` 16/0 (préselection + saut d'étape + comportement inchangé sans option),
  contrat local + démo 187/0, chargement OK. **Vérifié navigateur** (base jetable, récupération
  réelle validée) : encart, bouton, présélection « Complément de charge », saut à l'étape Bouteille,
  infobulle exacte.

### 🛋️ Lot confort — 18 points CF de l'audit traités (05/07)
Traitement du lot confort de l'audit du 03/07 (`docs/AUDIT-2026-07-03.md`), 22 points CF au
total. Triage préalable : **CF-1, CF-9, CF-10, CF-13 déjà faits** (Lot 2 / E5), non retouchés
dans cet incrément.
- **CF-2** : encart « Prise en main » (3 étapes machine → bouteille → mouvement) sur le tableau
  de bord quand la base est vide (`v8/js/views/dashboard.js`).
- **CF-3** : section « Intégrité du registre » dans l'Admin (`v8/js/views/admin.js`) — bouton
  « Vérifier maintenant » appelant `store.verifierChaineHash()` + aperçu des dernières écritures
  du journal (`getJournalAudit`), sans recalcul de hash côté client.
- **CF-4** : le bandeau outillage (`v8/js/views/outillage.js`) s'aligne sur `peutPasserEnOfficiel()`
  (alerte aussi quand un détecteur/balance CONFORME manque, pas seulement EXPIRÉ) ; filtre par
  préfixe exact pour ne pas capter à tort le motif « Écart de balance matière ».
- **CF-5** : attribution AUTOMATIQUE des statuts bouteille VIDE / A_RETOURNER (masse retombée à
  ~0) et retour EN_STOCK au re-remplissage — répliquée à l'IDENTIQUE dans le DemoStore
  (`v8/js/data/demo-store.js`) ET le LocalStore SQLite (`server/api.js`) pour parité stricte ;
  statuts DECHET/RETOURNEE jamais touchés.
- **CF-7** : colonne Machine des mouvements TRANSFERT affiche « B-01 → B-04 » (bouteilles
  source/destination) au lieu de vide (`v8/js/views/mouvements.js`).
- **CF-8** : le formulaire de contrôle (`v8/js/modales/controle-form.js`) exclut les machines
  ARRÊTÉE/DÉMANTELÉE.
- **CF-11** : nom du personnel démo « Frédéric Henninot » (quasi-homonyme de l'auteur) remplacé
  par un nom fictif neutre « Marc Delorme » (`v8/js/data/demo-donnees.js`, e-mail dérivé,
  `test-registre.mjs` adapté).
- **CF-12** : neutralisation de l'injection de formule CSV (`v8/js/documents/exports.js`) —
  préfixe apostrophe si un champ TEXTE commence par `= + - @` ou une tabulation ; les nombres
  réels (dont négatifs) restent intacts (marqueur interne). Fonction `champCsv` désormais
  exportée pour le test unitaire du correctif.
- **CF-15** : modale du wizard passée en `aria-labelledby` (accessibilité, `v8/js/wizard/wizard.js`).
- **CF-16** : état vide dédié pour la vue Fluides (`v8/js/views/fluides.js`).
- **CF-18** : les 4 `window.confirm()` natifs (`app.js`, `modales/personne-form.js`,
  `views/outillage.js`, `wizard/wizard.js`) remplacés par une modale interne chartée ; nouveau
  helper générique `confirmer(...)` (Promise<boolean>) dans `v8/js/views/communs.js`.
- **CF-19** : pièces jointes branchées sur les bouteilles en édition
  (`v8/js/modales/bouteille-form.js`, `zonePiecesJointes` entiteType BOUTEILLE).
- **CF-21** : signature de référence du personnel (`v8/js/modales/personne-form.js`) via PJ
  catégorie SIGNATURE (réutilise `wizard/signature.js`) — avec zone d'affichage dédiée et
  remplacement (pas d'accumulation de doublons).
- **CF-22** : fonction `genererJournalAuditPdf()` (PDF paginé du journal d'audit, patron pdf-lib
  du CERFA) ajoutée dans `v8/js/documents/exports.js` — exportée, non encore câblée à un bouton
  dédié (le journal reste dans le ZIP du dossier d'audit).
- **Revue adversariale (2 lentilles : métier/données, sécurité/robustesse)** : 2 constats
  IMPORTANT corrigés — (a) CF-5 divergence démo/local silencieuse → résorbée à la source dans
  `server/api.js` (parité stricte avec le DemoStore) ; (b) CF-18 l'annulation par croix/clic-fond/
  Échap ne résolvait pas la promesse → corrigé dans `communs.js` (option `surFermeture`). 3
  constats MINEUR corrigés aussi : CF-4 faux positif « balance matière » (préfixes exacts), CF-12
  tabulation en tête de champ, CF-21 signature invisible après enregistrement + doublons à la
  ré-édition.
- **Écartés** (justification consignée dans `docs/REPRISE.md`) : **CF-6** (superseded par E5 : le
  parcours élève passe désormais par de vrais comptes en Mode Local, plus par un sélecteur
  démo) ; **CF-14** (harmonisation des sélecteurs de modale — refactor à risque, pile le piège
  modale déjà source d'un bug passé) ; **CF-17** (progression fine du ZIP — surface large) ;
  **CF-20** (inventaire nominatif bouteille-par-bouteille — vraie fonctionnalité déjà notée V9.4,
  pas du confort).
- Tests (tous verts) : **`test-contrat.mjs` local ET demo = 187/0** ; `test-chargement.mjs` OK ;
  `test-exports.mjs` 26/0 ; `test-wizard.mjs` 9/0 ; `test-registre.mjs` 36/0 ; `test-mapping.mjs`
  141/0 ; `test-routes-comptes.mjs` 30/0 ; suites bouteille/scénario (lot1/lot2/scenario-b/c,
  conformité) vertes.
- **Vérifié navigateur** (Mode Local port 2011, base jetable) : CF-2 encart d'accueil visible sur
  base vide (3 étapes) ; CF-3 « Vérifier maintenant » → « Chaîne intacte : aucune rupture
  détectée. ».

### 🔑 Finition E5 — `getUtilisateurCourant()` câblé sur la session (05/07)
Le point ouvert laissé par V9.1 est corrigé : `getUtilisateurCourant()` renvoie désormais
l'utilisateur RÉELLEMENT authentifié, plus le stub « premier REFERENT du personnel ».
- **`server/api.js`** : le handler reçoit `(_params, contexte)` et lit `contexte.utilisateur`
  (id du compte `utilisateurs_app` posé par `serveur.js:contexteDeLaConnexion` via
  `sessions.verifierSession`). Nouveaux helpers `utilisateurDeSession()` /
  `utilisateurMinimalDeCompte()` : une fiche personnel liée (`personnel_id`) fournit l'identité
  riche (id PER-…, prénom, nom, attestations) ; à défaut (compte ADMIN amorcé en CLI, personnel
  encore vide) un objet minimal de MÊME forme (nom = login, prénom vide, attestations nulles) —
  **c'est ce qui débloque le wizard « Nouveau mouvement » sur une base fraîche**.
- **Le rôle fait toujours autorité depuis la SESSION**, jamais depuis la fiche : `roleApp` du
  retour = rôle figé de la session (`contexte.role`). Un compte REFERENT rattaché à une fiche
  ELEVE remonte `roleApp = 'REFERENT'` — le front (`wizard.js:peutValider`) et le serveur
  (`garderRole`) raisonnent ainsi sur le même rôle.
- **Repli conservé** quand aucune session n'est ouverte (loopback en lecture, ou harnais de
  test qui ne pose qu'un rôle) : premier REFERENT du personnel, Error s'il n'y en a pas —
  comportement d'avant E5, identique au **DemoStore** (mode démo sans auth, inchangé).
- **`contrat.js`** : description de `getUtilisateurCourant` actualisée (session E5 + repli).
- **Tests** : nouveau `server/test-utilisateur-courant.mjs` (14 vérifs, vrai serveur HTTP
  jetable) — repli base vide, session ADMIN sans fiche (bug corrigé), fiche liée, divergence
  rôle fiche/session, retour au repli. Non-régression : **`test-contrat.mjs` local ET demo =
  187/0**, `test-mapping` 141/0, `test-routes-comptes` 30/0, `test-sessions` 37/0,
  `test-comptes` 29/0, `test-migrations` 64/0, `test-bootstrap` 19/0, `test-registre` (demo) 36/0.
- **Durcissement front (null-safety)** : au cas où `getUtilisateurCourant()` renvoie/​lève sans
  utilisateur (base fraîche, aucune session), `wizard.js` (appel sorti du `Promise.all`, `try/catch`
  façon `mouvements.js`, `peutValider = Boolean(utilisateur && …)`), `machines.js` (`operateurCourant`)
  et 5 modales (personne / machine / outil / établissement / audit) tolèrent désormais l'absence
  d'utilisateur sans planter. Le parcours normal (utilisateur présent) est strictement inchangé.
  `test-wizard.mjs` 9/0 (nouveau cas : un utilisateur en échec n'empêche pas l'ouverture du wizard).
- **Correctif au passage** : `createPersonne` (`server/api.js`) insérait dans `personnel` sans appeler
  `amorcerEtablissement()` → `FOREIGN KEY constraint failed` (`etablissement_id`) sur une base jamais
  initialisée ; corrigé (symétrique à `updateEtablissement` / `createAuditOrganisme` / `createNonConformite`).
  ⚠️ Dette notée : ~14 handlers d'insertion posent `etablissement_id` mais seuls 5 amorcent — audit des
  autres (machines, mouvements, bouteilles…) à faire dans un incrément séparé.
- ⚠️ **Hors périmètre (noté)** : un compte ADMIN SANS fiche personnel a `id = UTI-…` ; s'il
  tente de VALIDER un mouvement, `verifierValidateur` cherchera cet id dans `personnel` et
  lèvera « Validateur introuvable » — attendu tant que l'admin n'a pas de fiche personnel (base
  non encore configurée). L'ouverture du wizard, elle, n'est plus bloquée.

### 🏷️ V9.1 — Fiche machine vivante : accès par code, étiquette QR, mouvement pré-réglé (05/07)
Accéder à une machine par son identifiant public, avec une fiche complète, une étiquette QR
imprimable et un mouvement pré-rempli depuis cette fiche.
- **Décisions (arrêtées)** : `code_public` opaque base32 Crockford 7 caractères (sans I/L/O/U),
  généré à la création, JAMAIS modifiable ; recherche par filtrage `getMachines()` côté vue
  (AUCUNE méthode ajoutée au contrat, toujours **64 méthodes / 187 vérifications**) ; le QR
  encode un chemin relatif `#/m/<code_public>` (jamais d'URL absolue, indépendant de l'IP —
  l'URL LAN absolue attendra §16.6) ; scan caméra tablette DIFFÉRÉ (dépend du matériel, non
  testable ici).
- **`code_public`** généré sur les deux stores : `demo-store.js` et `server/api.js:createMachine`
  (via `codePublicUnique`, retry sur collision, index UNIQUE) ; immuable (`updateMachine` ne le
  liste pas) ; backfill des lignes existantes (migration 6 `backfill_code_public_machines` côté
  SQLite + normalisation à l'init du DemoStore) ; générateurs base32 dans
  `v8/js/core/utils.js`, `server/db.js`, `server/migrations.js` (3 implémentations séparées
  assumées, comme `genId`/`generateId`) ; `mapping.js` expose `codePublic`.
- **Route paramétrée** : `v8/js/core/routeur.js` (`lireHash()` renvoie `{id, param}`, compat
  totale des routes existantes) ; `v8/js/app.js` aiguille `id==='m'` vers
  `v8/js/views/fiche-machine.js` (hors sidebar, aucune entrée de navigation) ; bouton
  « Ouvrir la fiche » ajouté aux cartes du Parc (`machines.js`).
- **Fiche 5 blocs** (`fiche-machine.js`) : (1) identité 4 indicateurs (fluide, charge + barre,
  tCO₂ via `teqCO2`, prochaine échéance + statut), (2) actions (nouveau mouvement pré-réglé,
  contrôle, plaque F-Gas, CERFA, étiquette QR), (3) données techniques repliables `<details>`
  (valeurs nulles masquées), (4) alertes de la machine, (5) historique en onglets
  (mouvements / contrôles / documents via `zonePiecesJointes`) ; état vide « Machine
  introuvable » pour un code inexistant.
- **Wizard pré-réglé** (`wizard.js`) : `ouvrirWizard(ctx, {machineId, retour})` saute l'étape 2
  (choix machine) quand `machineId` est fourni (hors transfert) et revient sur
  `#/m/<code>` après finalisation ; parcours normal (sans `machineId`) inchangé.
- **Étiquette QR hors ligne** : lib davidshimjs/qrcodejs vendored copiée en
  `v8/js/lib/qrcode-vendor.js`, chargée par un `<script>` classique dans `v8/index.html`
  (autorisé par la CSP `script-src 'self'`) ; `v8/js/lib/qrcode.js` expose `obtenirQRCode()` =
  `window.QRCode` ; `v8/js/documents/etiquette-machine.js` : modale d'aperçu 50×70 mm (code
  M{n} + `code_public` + QR encodant `#/m/<code_public>`) + bascule planche A4 (3×3),
  impression navigateur.
- **Revue adversariale** (2 lentilles : `code_public` / routeur+fiche) : 0 constat.
- **Bug trouvé au navigateur ET corrigé dans le même incrément** : l'étiquette QR ne se rendait
  pas — l'emballage « paresseux » de la lib QR en module ES cassait son exécution
  (`Cannot read properties of undefined (reading '_android')`, la lib exige un contexte
  global) ; les tests le masquaient via un repli `<table>`. Corrigé par chargement en
  `<script>` classique (la lib tourne dans son contexte global d'origine) ; test de
  l'étiquette durci (ne s'appuie plus sur le repli). C'est précisément ce que le contrôle
  navigateur devait attraper.
- Tests (tous verts) : **`test-contrat.mjs` local ET demo = 187/0** (183 + 4 nouveaux : format
  Crockford, unicité, immutabilité, lot de 15) ; `test-routeur.mjs` 12/0 ; `test-wizard.mjs`
  7/0 ; `test-etiquette-machine.mjs` 15/0 ; `test-migrations.mjs` 64/0 ; `test-mapping.mjs`
  141/0 ; `test-chargement.mjs` OK (fiche-machine incluse) ; régression E5
  `test-routes-comptes` 30/0 ; toutes les autres suites du dépôt vertes.
- **Vérifié navigateur** (serveur réel Mode Local port 2011, base jetable) : machine créée en
  SQLite → `code_public` « TE9WHYH » (7 caractères Crockford) ; fiche `#/m/TE9WHYH` affiche
  les 5 blocs, charge « 2,50 / 2,50 kg », données techniques complètes, ZÉRO emoji ; étiquette
  QR rend un vrai `<canvas>`+`<img>` non vide, planche A4 = 9 QR ; « Nouveau mouvement » depuis
  la fiche saute l'étape 2 (Machine) et atterrit sur l'étape 3 (Bouteille) avec le fluide R-32
  déjà connu.
- ✅ **Point ouvert résolu** (voir « Finition E5 » ci-dessus, même journée) :
  `getUtilisateurCourant()` est désormais câblé sur la session E5 — le wizard s'ouvre sur une
  base fraîche (admin CLI, personnel vide).

### 🔒 SÉCURITÉ (correctif immédiat)
- **Clés API retirées du code** (`Code_API_v7.1.0.gs` + `apps-script/Code.gs`) : les 3 clés
  READ/WRITE/ADMIN étaient en clair dans le dépôt public. Lecture désormais exclusive depuis
  les Script Properties (`getApiKey_()`), fonction `setClesAPI_temp()` supprimée.
- ⚠️ **Révocation à faire côté Apps Script** (les anciennes clés restent valides tant que
  `genererClesAPI()` n'a pas été exécutée puis le script redéployé) : procédure dans `SECURITE.md`.

### 🔑 V9-E5 — Comptes, rôles, sessions : fin du raccourci loopback=REFERENT (05/07)
Le raccourci provisoire d'E3 (loopback = REFERENT) est remplacé par un vrai contrôle d'accès.
- **Décisions (Franck)** : 4 rôles ADMIN/REFERENT/ENSEIGNANT/ELEVE (TECHNICIEN reporté V10) ;
  restauration du coffre = ADMIN + REFERENT (les 4 routes coffre inchangées) ; bootstrap par
  commande CLI uniquement (aucun endpoint web, aucun compte par défaut, aucune inscription
  libre) ; lectures ouvertes en loopback sans session (confort mono-poste), toute MUTATION
  exige une session, et sur le LAN une session est exigée même en lecture.
- **Migration 5** (`server/migrations.js`) : `echecs_consecutifs`/`verrouille_jusqua` sur
  `utilisateurs_app` + table `sessions` (jeton = empreinte SHA-256, `utilisateur_id`, `role`
  figé, `cree_le`, `expire_le`, `ip`, `revoque`, index sur `utilisateur_id`). `mapping.js` :
  `sessions` déclarée non mappée au contrat.
- **`server/comptes.js`** : hachage scrypt + sel 16 o + NFC (mêmes paramètres N=32768/r=8/p=1
  que `chiffrement.js`), vérification en `crypto.timingSafeEqual`, verrouillage par compte
  (verrou 15 min au 5ᵉ échec, remise à zéro sur succès).
- **`server/sessions.js`** : `creerSession` (jeton clair `randomBytes(32)` base64url, seule
  l'empreinte SHA-256 va en base, expire +8 h), `verifierSession` (timing-safe, expiration
  vérifiée à chaque appel, purge paresseuse, REFUSE si le compte est `actif=0`),
  `revoquerSession`, `revoquerToutesLesSessions(utilisateurId)`, `purgerSessionsObsoletes()`
  (branchée au démarrage).
- **`server/routes-comptes.js`** : `POST /api/connexion` (message d'échec UNIQUE, verrou avant
  vérification du mot de passe, cookie `iwf_session` HttpOnly ; SameSite=Strict ; Path=/ ;
  Max-Age=28800 ; Secure si TLS ; jeton clair jamais renvoyé dans le corps),
  `POST /api/deconnexion` (révoque la session du cookie entrant, idempotente),
  `POST /api/creerCompte` (GARDÉE ADMIN, unicité du login, longueur minimale du mot de passe
  selon le rôle, journalise CREATION_COMPTE).
- **`server/serveur.js`** : `contexteDeLaConnexion` lit le cookie `iwf_session` →
  `sessions.verifierSession` (le rôle vient TOUJOURS de la session serveur, jamais du corps) ;
  garde « lecture hors loopback sans session refusée » ; garde CSRF/anti-rebinding
  (`refusReseau`, Host+Origin) conservée ; écoute LAN conditionnée (`IWF_LAN=1` +
  `IWF_HOTE_LAN=<ip>`) avec extension des hôtes/origines autorisés à `<ip>:<port>`.
  **`server/api.js`** : `importerJSON` passe de VALIDEUR à REFERENT+ADMIN (les autres méthodes
  VALIDEUR inchangées). **`server/creer-admin.js`** : CLI de bootstrap du 1er ADMIN (saisie
  masquée si TTY, refuse un 2e ADMIN, journalise BOOTSTRAP_ADMIN).
- **Front** : `v8/js/views/connexion.js` (écran sobre, charte claire, zéro emoji),
  `v8/js/app.js` (montage hors routeur, pied de session identité+rôle+Déconnexion en Mode
  Local), `v8/js/data/transport-http.js` (`credentials:'same-origin'` + évènement
  `iwf:session-requise` sur 403 sans rôle), `v8/js/core/icones.js`, `v8/css/composants.css`.
- **Revue adversariale du cœur (3 lentilles : forgeage de rôle / crypto-timing /
  CSRF-atomicité)** : 1 constat IMPORTANT corrigé — oracle de timing scrypt à la connexion (un
  login inexistant renvoyait sans passer par scrypt) → vérification LEURRE constante ajoutée,
  les deux chemins paient désormais exactement un scrypt (vérification du mot de passe déplacée
  avant le test de verrou pour éviter toute asymétrie de branche). 2 constats MINEURS fermés :
  (a) une session survivait jusqu'à 8 h à la désactivation d'un compte → `verifierSession`
  refuse un compte `actif=0` + `revoquerToutesLesSessions` ; (b) sessions obsolètes jamais
  purgées → `purgerSessionsObsoletes` au démarrage.
- Tests (tous verts) : `test-comptes` 29/0, `test-sessions` 37/0, `test-routes-comptes` 30/0
  (dont le test anti-oracle de timing), `test-bootstrap` 19/0, `test-migrations` 58/0,
  `test-mapping` 141/0 ; suites existantes intactes ; **contrat `test-contrat.mjs local` ET
  `demo` = 183/0** (aucune adaptation du harnais).
- **Vérifié navigateur (serveur réel port 2011, base jetable)** : flux complet same-origin —
  mutation sans session refusée 403 « rôle courant : aucun » ; mauvais mot de passe = message
  unique ; connexion correcte = 200 + cookie `iwf_session` HttpOnly (invisible en JS) ; mutation
  ensuite = garde ouverte ; écran de connexion monté via `iwf:session-requise` ; pied de session
  « login + rôle » ; déconnexion = session révoquée, retour à l'écran de connexion, mutation de
  nouveau 403. Lectures ouvertes en loopback confirmées (tableau de bord sans connexion).
- ⚠️ **Observation hors périmètre (non corrigée)** : `serveur.js` sert la RACINE du dépôt ;
  `http://localhost:2011/` affiche l'ancienne démo v7 (sans E5), la v9 est sous `/v8/`. Piège
  d'entrée en Mode Local à trancher ultérieurement avec Franck (faut-il servir `v8/` comme
  racine ?).
- **Reste à valider par Franck** : écoute LAN + scan tablette RÉEL (2e appareil, vraie IP LAN) —
  non testable dans le bac à sable (validé seulement par câblage avec `IWF_HOTE_LAN=127.0.0.1`) ;
  saisie masquée interactive du CLI (validée seulement via arguments).

### 🔐 V9-E4 — Le coffre-fort : sauvegarde, restauration, chiffrement (05/07)
L'exigence n°1 (ne JAMAIS perdre les données) tenue de bout en bout, plan `docs/E4-PLAN.md`.
- **E4.1 noyau** : `VACUUM INTO` seule primitive (jamais copier le `.db` à chaud) ; snapshots
  (base seule, filet anti-erreur) + archives complètes (base+documents, filet anti-sinistre) ;
  **manifeste-preuve** (empreinte, chaîne OK, compteurs) ; **restauration atomique** Windows
  (sortir l'ancienne du chemin, poser la nouvelle sur le chemin libre, purge du WAL orphelin) ;
  sauvegarde de sécurité auto non désactivable ; **rollback via l'original intact** (`ancienne.db`,
  pas une archive faillible) ; bouton « Tester une sauvegarde » (base temporaire, jamais la base
  vive) ; reprise au démarrage. `server/` : zip-node, verification, manifeste, sauvegarde,
  restauration, routes-sauvegarde. **14 familles de test (158 vérif.)** dont la coupure simulée à
  chaque étape (jamais d'hybride), le filet saboté, le crash pendant rollback, la PJ manquante.
- **E4.2 chiffrement** : AES-256-GCM + scrypt, `.zip.chiffre` (manifeste EN CLAIR en tête pour
  inventorier sans la phrase, sert d'AAD GCM), **re-déchiffrement de vérification** (refuse
  d'annoncer OK si l'archive n'est pas ré-ouvrable — parade au « phrase perdue »), **phrase
  normalisée NFC** (une phrase accentuée saisie autrement ne rend plus la sauvegarde
  irrécupérable). 6 familles de test.
- **E4.3 écran** (`v8/js/views/sauvegarde.js`) : liste, Sauvegarder (snapshot/archive/chiffrer),
  Tester, Restaurer avec écran de comparaison + confirmation de perte ; en démo, encart + repli
  JSON. Vérifié navigateur (serveur réel) : snapshot chiffré créé, testé « restaurable ».
- Deux revues adversariales : la 1re a trouvé un **scénario de perte de données** (rollback si le
  filet échoue) et un bug de chemins — corrigés et prouvés ; la 2de (crypto) a fait ajouter la
  normalisation NFC. Rôles ADMIN/REFERENT sur les 4 routes, verrou anti-concurrence, détection
  OneDrive. Sécurité restante ASSUMÉE : tamper-evidence (§4.6), pas d'authentification du manifeste
  contre un falsificateur disque-en-main (comme tout registre local).
- Commits : `8f292d8` noyau · `0d232e4` durcissement · `73132de` chiffrement · `237b63c` écran+NFC.

### 🔌 V9-E3 — Le mode Local branché : le contrat passe 183/0 sur SQLite (04-05/07)
Le plus gros incrément de la V9 : les 64 méthodes du contrat DataStore réimplémentées côté
serveur, éprouvées par LES MÊMES 183 assertions que le mode démo. L'objectif d'E0 est atteint —
le branchement est prouvé fidèle, pas espéré.
- **Ossature** (`server/api.js` dispatcher + `muter()`, `v8/js/data/local-store.js`,
  `transport-http.js`, `server/harnais-contrat.mjs`, `serveur.js` routage `POST /api/:methode`,
  `datastore.js` sélecteur ping→local sinon demo) : le front ne sait jamais quel store il a.
- **Hash verrouillé AVANT tout** (`server/hash-mouvement.js`) : `db.hashEcriture` diverge du
  hasseur front sur 3 points — un clone exact + un test d'équivalence (18 vérifs) garantissent
  que le registre local est IMPORTABLE dans le registre démo et réciproquement (prouvé croisé).
- **Registre WORM** : quantité signée, effets stocks atomiques, contre-écriture, scellement,
  double garde de rôle (validateur élève → refus). **Balance matière** via la vue SQL (fidélité
  au calcul du front enfin prouvée). Déchets, outillage, dossier, pièces jointes (base64→disque),
  **8 familles d'alertes** à l'identique, export/import (remplacement total sous WORM : verrous
  retirés puis recréés dans la transaction, FK différées).
- **Vérifié EN VRAI (navigateur + serveur Node)** : bascule LOCAL automatique, création machine
  via HTTP, persistance SQLite après rechargement, badge « LOCAL / SQLite ».
- **Revue adversariale (fidélité + sécurité), constats corrigés** : trou de rôle forgeable dans
  le corps (→ contexte déterminé côté serveur), **CSRF / DNS-rebinding** (→ garde Host + Origin,
  éprouvé HTTP : hostile 403, légitime OK), CR-5 amputé (→ intégrité du registre ET du journal au
  chargement), `getAlertes` stub, statut d'outillage figé, machine libérée à tort, `registreAltere`
  non rafraîchi après import, masse nette générée non arrondie, compteurs de codes, tris, journaux.
- Sécurité restante ASSUMÉE (documentée) : les vraies sessions/comptes arrivent en E5 ; le rôle
  REFERENT accordé au loopback est un raccourci E3 explicite, jamais élargi au LAN sans E5.
- Commits : socle `e05c4ff` · fondations `3a81ada` · registre `9c92880` · métier `5fe0f69` ·
  export `c8c7a50` · navigateur `cc844e7` · revue fidélité `06386f1` · clôture `f62d367`.

### 🔗 V9-E2 — Le journal d'audit chaîné (04/07)
« Le vrai passage démo → coffre-fort » (vision §3) : sans chaîne, on pouvait exciser une ligne
du journal sans trace ; désormais toute excision est détectable.
- **Migration 004** : `journal_audit` gagne `cible`/`details` (les deux champs du contrat qui
  n'avaient pas de colonne) et `hash_precedent`/`hash` (le chaînage).
- **`db.js:journaliser()`** : écrit chaque entrée avec une empreinte SHA-256 qui intègre celle de
  la précédente, en transaction `BEGIN IMMEDIATE` (pas de fourche). **Ré-entrant** : appelé dans
  une transaction ouverte, il la REJOINT — mutation métier + journal dans le même tout-ou-rien
  (le piège « rollback saboteur » découvert en revue est neutralisé et prouvé dans les deux sens :
  commit atomique, rollback atomique).
- **`db.js:verifierChaineJournal()`** : recalcule la chaîne sur la table ENTIÈRE — une ligne sans
  hash est une anomalie SIGNALÉE, jamais tolérée (2ᵉ trou de revue : une entrée forgée hash NULL
  passait au vert). Limites honnêtes documentées (vision §4.6) : troncature de fin et ré-écriture
  totale cohérente restent l'affaire des scellés hors système (E4).
- Tests (58 vérifications au total) : chaîne tissée de proche en proche, excision au milieu
  détectée à la ligne près, altération du seul `hash_precedent` détectée, forgerie signalée,
  ré-entrance et rollback atomique prouvés. `mapping.js` : journal débloqué (cible/details),
  plus que 4 divergences. Intégration : **17 suites vertes, 794 vérifications**.

### 🗄️ V9-E1 — La base versionnée, alignée sur le contrat (04/07)
Le socle SQLite devient réel — et le contrat fait foi :
- **`server/schema.sql` v1 ALIGNÉ** : les 18 divergences front↔SQL relevées en E0 sont résorbées
  à la source (aucune base réelle n'existait — pas de migrations de reconstruction pour des
  tables vides). Colonnes de chaîne (`hash_precedent`, `ordre_validation` UNIQUE), statuts et
  enums du contrat (`ARRETEE`/`DEMANTELEE`/`FUITE`/`CONTROLE_DU`, rôles réels, `DETECTEUR`…),
  date de jour `date_mouvement`, quantité SIGNÉE, `technicien`/`operateur` en toutes lettres,
  tables `retours_fournisseur` + `stocks_initiaux` + `inventaires` à plat + `justifications_ecarts`,
  `pieces_jointes.mime_type`, décision déchet sur la bouteille. Déclencheur WORM étendu à
  **toutes** les colonnes de contenu. Vue `bilan_matiere` réécrite en miroir exact du contrat
  (écritures figées VALIDE **et** ANNULE, TRANSFERT exclu, repli masse d'entrée → nette courante,
  pas de ligne fantôme sur inventaire seul).
- **`server/migrations.js`** : boucle `user_version` transactionnelle (tout ou rien, registre
  troué refusé, jamais de DROP ni de re-hash), migrations **002 sites** (le chaînon
  client↔machine de la vision §3) et **003 codes publics QR** (identifiants opaques UNIQUE).
  Chemin unique : les bases neuves passent par les mêmes migrations — éprouvées à chaque création.
- **`server/db.js`** : PRAGMA coffre-fort (`synchronous=FULL`, `busy_timeout`, WAL,
  `wal_autocheckpoint`), création v1 ATOMIQUE (schéma + estampille en une transaction), refus
  motivé des bases non versionnées, migrations au fil de l'ouverture.
- 🛡️ **Trou WORM découvert par la revue adversariale et BOUCHÉ : `PRAGMA recursive_triggers=ON`.**
  Sans lui, le DELETE implicite d'un `INSERT OR REPLACE` / `UPDATE OR REPLACE` ne déclenche pas
  les `BEFORE DELETE` : une écriture scellée était **remplaçable en silence** (reproduit, puis
  prouvé bloqué). La suite éprouve désormais les trois assauts + la transition ANNULE-avec-retouche,
  et un garde anti-migration vérifie que le déclencheur couvre TOUTES les colonnes du registre.
- **`server/test-migrations.mjs`** (45 vérifications) + `test-mapping.mjs` refondu
  (**140 vérifications** : couverture par introspection de la base RÉELLE créée par db.js,
  CHECK confrontés aux énumérations du contrat, branches CR-3 et « vidage » provoquées).
  `mapping.js` v2 : champs débloqués, 4 nouvelles tables mappées, DIVERGENCES réduites à 5
  (contrôle imbriqué E3, journal E2, categories_2008, vue à éprouver en E3, inventaire nominatif V9.4).
- Intégration : **17 suites toutes vertes** (777 vérifications au passage de revue, 368 sur le
  périmètre serveur+contrat après correctifs).
- 🎁 **Intrant V10 reçu de Franck : le traceur « FRIGOLO Mollier v3 PRO »** (log(p)-h, noyau
  thermodynamique 6 fluides, COP), archivé dans `docs/intrants-v10/` avec sa fiche d'analyse ;
  vision enrichie d'un §9.4 (outil universel : relevés comparés, assistant de mise en service,
  diagramme enthalpique, identification de pannes).

### 🧩 V9-E0 — Le contrat DataStore est figé (04/07)
Ouverture du chantier V9 « coffre-fort » (plan `docs/VISION-V9-V10.md` §11) :
- **`v8/js/data/contrat.js`** : les 64 méthodes du magasin de données figées noir sur blanc,
  plus les 2 propriétés (`modeLabel`, `registreAltere`), les constantes canoniques
  (`MSG_ECRITURE_FIGEE`, `TYPES_MOUVEMENT`, `ROLES_VALIDEURS`, `FORMAT_EXPORT`) et
  `verifierSurface()` — qui inspecte aussi les prototypes (implémentations en classe) et
  signale méthodes manquantes ET intruses (l'anti-dérive du bug v7).
- **`v8/js/data/test-contrat.mjs`** : la suite de conformité (**183 vérifications**) qui tourne
  contre N'IMPORTE quelle implémentation (`node v8/js/data/test-contrat.mjs [demo]`). Règle
  d'or : elle construit son propre monde par les mutations du contrat, sans rien devoir aux
  données de démonstration — le LocalStore SQLite (E3) devra la passer TELLE QUELLE. Couvre les
  5 types de mouvement (dont TRANSFERT sans CERFA et RECUPERATION_DEMANTELEMENT avec
  proposition de démantèlement), la contre-écriture, la chaîne de hash, les copies sur toutes
  les collections, les messages canoniques, l'import forgé rejeté. Rejouable sur base
  persistante (identifiants uniques par passage).
- **`server/mapping.js`** : LA correspondance unique front (camelCase) ↔ SQL (snake_case), et
  le registre de **18 divergences structurelles** consignées avec leur échéance — colonnes
  `hash_precedent`/`ordre_validation`/`date_soumission` absentes du schéma, table
  `retours_fournisseur` inexistante, enums désaccordés (`ARRETEE`/`ARRETE`, `FUITE` sans valeur
  SQL, rôles applicatifs étrangers, types d'outils), quantité signée vs valeur absolue,
  `sitesCouverts` tableau… Tout champ non migré LÈVE une erreur explicite : rien ne passe en
  silence. C'est l'intrant direct des migrations E1/E2.
- **`server/test-mapping.mjs`** (**111 vérifications**) : aller-retour fidèle par table,
  couverture exhaustive du schéma (une migration qui ajoute une colonne sans la déclarer casse
  le test), couverture des objets RÉELS du DemoStore (cycle de mutation complet provoqué :
  soumission, rejet, validation, contre-écriture, pièce jointe), énumérations confrontées aux
  valeurs des CHECK du schéma.
- Méthode : cartographie multi-agents (64 méthodes inventoriées) → rédaction → revue
  adversariale (2 relecteurs ; constats corrigés : suite auto-suffisante en référent, fluide
  choisi par critère et non par position, surface via prototypes, `sitesCouverts` tableau,
  `controles.operateur` non jeté en silence) → intégration **16 suites toutes vertes**
  (~700 vérifications dont 294 nouvelles) → contrôle navigateur (surface conforme vérifiée
  dans le navigateur, zéro erreur console, tableau de bord intact).

### 🛠️ Retours terrain n° 1 — pesées, virgule, création à la volée, modales empilées (04/07)
Premiers retours d'utilisateurs réels sur la démo :
- **« Aucune bouteille compatible » ne bloque plus et ne gronde plus** : encart ambre guidant
  (« Vous avez besoin d'une bouteille de récupération R-134a… Créez-la en un clic ci-dessous »)
  + la carte « + Nouvelle bouteille » reste toujours proposée.
- **Création de machine ET de bouteille à la volée depuis l'assistant** (sans le quitter) :
  la fiche créée est présélectionnée, on continue le mouvement directement.
- **Bug grave corrigé — modales empilées** : les formulaires ciblaient « la première `.modale`
  du document » ; ouverts par-dessus l'assistant (lui-même une `.modale`), leur câblage plantait
  et le bouton Ajouter déclenchait un envoi natif → **rechargement de page, travail perdu**.
  Le helper `modale()` retourne désormais sa propre racine, les 12 fichiers appelants normalisés.
- **Messages de refus avec l'arithmétique** : « la machine contient déjà X kg ; ajouter Y kg
  donnerait Z kg, au-delà de la limite L (nominale + 5 %) » — le refus de surcharge signalé par
  Franck était mathématiquement juste mais illisible.
- **Virgule décimale blindée** : helper `nombreFr()` (« 13,9 » = « 13.9 »), plus de NaN silencieux.
- **Machines de démo avec marge réaliste** (elles étaient toutes à charge nominale → aucun
  appoint démontrable) : M1 3,80/4,50 · M2 1,50/1,80 · M3 1,80/2,40 · M4 0,70/0,90 · M6 3,00/3,80.
- Vérifié : 11 suites de tests vertes + parcours navigateur complet (impasse → création →
  présélection → pesées 0,90 kg sans erreur) + modales contrôle/outillage/audit.

### 🛠️ Lot 2 — les 23 constats importants de l'audit corrigés (03/07)
- **Cycle de vie complet des objets** : machines Arrêter / Remettre en service / Démanteler
  (proposition automatique quand une récupération-démantèlement vide la machine ; démantelées
  grisées et exclues des compteurs) ; bouteilles avec chip de statut, section « Sorties du
  stock », bouton **Retour fournisseur** (alimente la balance) ; décision déchet **réversible** ;
  **BSFF partiel** (reliquat exact en stock) ; filtres du wizard alignés sur les règles du
  registre (plus de bouteilles interdites proposées).
- **Alertes** : 3 familles ajoutées (bouteille sans pesée récente, mouvement à valider,
  brouillon ancien), chaque alerte **cliquable** (navigue vers l'objet), badge rafraîchi après
  toute mutation (abonnement au store) ; « prochain contrôle » calculable automatiquement.
- **Pérennité** : années dynamiques partout (fini le 2026 figé), flux mensuels glissants.
- **CERFA** : cadre 12 complété (codes déchets 14 06 01 / 16 05 04 selon classe), cause du
  mouvement saisie au wizard et reportée au cadre 14, types Assemblage/Modification accessibles.
- **Sécurité/durcissement** : **PDF.js 4.10.38** (CVE-2024-4367 corrigée, modules .mjs,
  isEvalSupported désactivé), **polices auto-hébergées** (10 woff2, hors-ligne complet,
  plus aucun appel à Google), **CSP stricte** dans index.html, MIME des pièces jointes validé
  côté registre, e-mails de démo en domaine réservé.
- **Accessibilité** : piégeage du focus dans les modales, contrastes corrigés, aria sur les
  pièces jointes.
- **Administration** : formulaire clients/détenteurs complet (SIRET validé) ; **vue « Audit en
  5 minutes »** imprimable (tout ce que l'auditeur demande, sur une page, depuis le Bilan).
- Qualité : 8 agents, **14 suites — ≈ 420 vérifications vertes** ; vérification navigateur
  (visualiseur PDF.js 4 sous CSP : rendu 0,3 s ; polices locales ; alertes cliquables ;
  création de détenteur).

### 🛠️ Lot 1 — les 6 critiques de l'audit corrigés (03/07)
Suite à l'audit complet (`docs/AUDIT-2026-07-03.md`, note 7/10) :
- **CR-1** : plus d'impasse — actions par statut sur les mouvements (Brouillon : reprendre dans
  le wizard / supprimer ; À valider : valider / rejeter avec motif) + purge du brouillon à
  l'abandon du wizard ; chips de statut distinctes (dont « Annulé »).
- **CR-2** : la **contre-écriture a son bouton** (« Annuler » sur les écritures validées,
  modale avec rappel de l'écriture + motif obligatoire).
- **CR-3** : la fuite déclarée dans le wizard **crée le contrôle lié** à la validation
  (machine → FUITE, alerte, contrôle NON_PERIODIQUE référencé).
- **CR-4** : balance matière juste pour les bouteilles créées dans l'application
  (`masseEntreeKg` figé à la création + reprise des anciennes sauvegardes).
- **CR-5** : intégrité vérifiée à l'import ET au chargement (invariants + chaîne de hash,
  rejet motivé des fichiers forgés, bandeau rouge « registre altéré » si rupture).
- **CR-6** : bandeau « Mode Officiel indisponible : {motifs} » au tableau de bord,
  branché sur `peutPasserEnOfficiel()`.
- **IM-12 + CF-1** : plus de CERFA pour les transferts (ni numéro, ni compteur, ni bouton) ;
  bouton CERFA seulement sur Validé/Annulé.
- ⚠️ **Découverte d'intégration : le `.gitignore` (motifs non ancrés `data/`, `documents/`)
  excluait `v8/js/data/` et `v8/js/documents/` — le store, le jeu de démo, les exports et
  9 fichiers de tests n'avaient JAMAIS été commis : la démo GitHub Pages `/v8/` était cassée
  en ligne.** Corrigé (motifs ancrés `/data/`…) : ce commit pousse enfin l'application complète.
- Qualité : 12 suites, **336+ vérifications vertes** (dont test-lot1 32 + scénario Lot 1 24) ;
  vérification navigateur (bandeau officiel, contre-écriture de bout en bout).

### ✅ Phase D — Documents officiels (03/07)
- **CERFA 15497*04 = le PDF officiel rempli, affiché tel quel** (exigence « au pixel près ») :
  moteur `v8/js/cerfa/generateur.js` couvrant les **72 champs officiels** de `docs/SPEC-CERFA.md`
  (cadre 4 via la table unique, cadre 7 seuils HCFC kg / HFC teq / HFO kg × détection permanente,
  cadre 10 fuites + réparations, cadre 11 ventilation vierge/recyclé/régénéré/déchet/réemploi,
  **cadre 12 transport UN 1078 / UN 3161 selon la classe de sécurité du fluide — première fois
  géré**, cadre 13 destination BSFF, signatures + image de la signature manuscrite) ;
  filigrane diagonal + mention cadre 14 en mode FORMATION ; classes de sécurité ajoutées au
  référentiel fluides (A1/A2L/A3).
- **Visualiseur plein écran** (PDF.js, fidèle à la maquette) : rendu canvas du PDF rempli,
  Imprimer / Télécharger / Fermer, branché partout (mouvements, tableau de bord, contrôles).
- **Plaque F-Gas** imprimable par machine (fluide, charge, teqCO₂, détection, fréquence).
- **Dossier audit annuel en un clic** (vue Bilan) : ZIP autonome — sommaire, 9 tableaux CSV,
  le CERFA PDF de chaque mouvement et contrôle de l'année, attestation de capacité jointe.
  Écriture ZIP maison sans dépendance (`v8/js/core/zip.js`), archive validée par l'extracteur
  Windows (20 documents, ~1,8 Mo).
- **2 correctifs de robustesse navigateur** (trouvés en vérification live) : `doc.save()` pdf-lib
  et `page.render()` PDF.js gelaient dans les onglets en arrière-plan (minuteries/rAF bridés) →
  sauvegarde en un bloc (`objectsPerTick: Infinity`) + rendu en intention `print` (qui donne
  aussi les apparences finales des champs).
- **Qualité : 280 vérifications automatisées vertes** (10 jeux de tests, dont 78 sur le PDF
  officiel relu case par case) + vérification navigateur (CERFA rendu, dossier ZIP généré).
- Reste : bascule v8 → racine (après validation Franck), puis Phase E (mode local Node+SQLite).

### ✅ Phase C — Conformité audit (03/07)
- **Balance matière annuelle** (le cœur de l'audit) : vue dédiée par fluide (stock initial neuf/
  récupéré, achats, récupérations, charges, cessions, retours, destructions → stock théorique),
  **inventaire physique au 31/12** (saisie par fluide, opérateur obligatoire) et **justification
  obligatoire des écarts** (écart non justifié = alerte critique + blocage du mode officiel).
- **Registre du personnel** : vue + formulaire complets (type de personne, attestation d'APTITUDE
  individuelle, organisme, catégories 2008 ET 2025 avec encart d'aide réglementaire, activités
  autorisées, désactivation — jamais de suppression). Séparation stricte capacité/aptitude.
- **Outillage réglementaire** : tous types (stations, balance, détecteurs, pompe, manifold…),
  statut recalculé depuis l'échéance (conforme / à vérifier / expiré), réforme tracée,
  bandeau de blocage officiel si détecteur ou balance expiré.
- **Pièces jointes généralisées** : composant réutilisable (dépôt, liste, téléchargement,
  5 Mo max), binaires dans IndexedDB + métadonnées et hash SHA-256 dans le registre — branché
  sur personnel (attestations), outillage (certificats), établissement (attestation capacité),
  BSFF (bordereaux).
- **Chaîne déchets/BSFF** : décision (réutilisable / à analyser / déchet + garde 1 an),
  bordereau BSFF, sortie de stock tracée au journal.
- **Dossier opérateur** : administration éditable (attestation de capacité complète, catégories,
  activités, sites) + suivi d'audit organisme (audits, non-conformités, actions correctives).
- **Alertes dynamiques** : recalculées depuis les données réelles (7 familles, niveaux SPEC §7.2),
  badge sidebar rafraîchi à chaque navigation ; `peutPasserEnOfficiel()` avec motifs.
- Navigation : 13 vues. **Qualité : 148 vérifications automatisées vertes** (6 jeux de tests dont
  scénario audit de bout en bout) + vérification navigateur (balance avec écart justifié,
  pièce jointe IndexedDB relue octet pour octet). Répartition Fable/Sonnet reconduite.
- Reste Phase D : CERFA (PDF officiel rempli affiché), plaque F-Gas, dossier audit annuel en un clic.

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
