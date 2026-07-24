# Politique de sécurité — inerWeb Fluide

> Ce document décrit la politique de sécurité du projet inerWeb Fluide (v8) et la procédure
> de traitement de l'incident du 02/07/2026 concernant les clés API du backend v7.
> Il complète la spécification `docs/SPEC-V8.md` (§8 Sécurité).

---

## ⚠️ Incident clés API v7 — procédure de révocation (à faire immédiatement)

> **État au 23/07/2026 — INCIDENT TOUJOURS OUVERT.** Un contrôle technique complet
> (constat P0-9) a établi, commandes `git` à l'appui, que **le dépôt est toujours PUBLIC**
> et que les trois clés restent **lisibles dans l'historique**. La correction du 02/07 n'a
> retiré les clés que du code courant. **Tant qu'elles n'ont pas été régénérées côté Google,
> l'exposition est active**, pas historique.
>
> → Constat daté, empreintes des trois clés, procédure et **procès-verbal à signer** :
> **`docs/P0-9-REVOCATION-CLES-V7.md`**.
>
> **Mise à jour 25/07/2026 — la v7 est ABANDONNÉE.** Franck a tranché : on ne
> repart pas sur le backend Google Sheets (v7), entièrement digéré par la v8
> locale (audit de parité fait — seuls le macaron et le registre des plaintes
> restaient, désormais reportés en v8). Le code source v7 (`apps-script/`,
> `Code_API_v7.1.0.gs`) est **retiré du dépôt** (l'historique git le conserve).
> Côté Google, le geste qui clôt l'exposition n'est plus « régénérer les clés »
> mais **mettre le service hors ligne** : archiver le classeur puis
> **désactiver le déploiement Apps Script** — sans déploiement actif, les clés
> publiées ne commandent plus rien. Geste de Franck (compte Google).

### Ce qui s'est passé

Le 02/07/2026, les **trois clés API du backend Apps Script v7** (lecture, écriture,
administration) ont été découvertes **en clair** dans ce dépôt GitHub public :

- fichiers `Code_API_v7.1.0.gs` et `apps-script/Code.gs` ;
- ainsi que dans **tout l'historique git** (chaque version antérieure des fichiers) —
  **`CHANGELOG.md` compris**, ce qu'une purge d'historique oublie systématiquement.

**Chronologie établie le 23/07/2026** : clés introduites par le commit `f36d727` du
**08/03/2026**, retirées du code courant par `77b9640` le **02/07/2026** — soit
**116 jours d'exposition publique**, et une exposition qui se poursuit dans l'historique.

Le code local a été corrigé : les clés en dur ont été supprimées, le script lit désormais
les clés **uniquement** depuis les propriétés du script (Script Properties), et la fonction
temporaire d'installation des clés a été retirée.

### Pourquoi c'est grave

Une clé API publiée dans un dépôt public doit être considérée comme **compromise** :
n'importe qui ayant consulté le dépôt (ou l'un de ses clones) peut, tant que les anciennes
clés restent valides :

- **lire** l'intégralité des données du classeur Google Sheets (clé lecture) ;
- **écrire ou modifier** des données (clé écriture) ;
- **purger ou administrer** le classeur (clé administration).

**Corriger le code ne suffit pas** : tant que les clés ne sont pas régénérées côté
Apps Script, les anciennes clés publiées restent acceptées par le serveur.

### Procédure de révocation (étape par étape)

1. **Ouvrir le classeur** Google Sheets du projet (le classeur qui sert de base de données v7).
2. Menu **Extensions → Apps Script** : l'éditeur de script s'ouvre.
3. Vérifier que le code affiché est bien la **version corrigée** (sans clés en dur,
   lecture depuis les Script Properties).
4. Dans la barre d'outils de l'éditeur, sélectionner la fonction **`genererClesAPI`**
   dans la liste déroulante, puis cliquer sur **Exécuter**.
5. Les **trois nouvelles clés** s'affichent (journal d'exécution). Les **noter en lieu sûr**
   (gestionnaire de mots de passe ou document privé) — **jamais dans le dépôt**, ni dans un
   fichier suivi par git, ni dans une capture d'écran publiée.
6. Menu **Déployer → Gérer les déploiements** : modifier le déploiement existant en
   sélectionnant une **nouvelle version** intégrant le code corrigé, puis valider.
   (Sans nouvelle version, l'ancien code — avec les anciennes clés — reste servi.)
7. Mettre à jour les clés côté application (configuration locale, jamais commitée),
   puis **tester la connexion** depuis l'application : lecture et écriture doivent fonctionner
   avec les nouvelles clés.

### Pourquoi réécrire l'historique git ne suffit pas

Réécrire l'historique du dépôt (suppression des fichiers, `git filter-repo`, etc.) donne
une fausse impression de sécurité :

- des **clones** du dépôt existent peut-être déjà sur d'autres machines ;
- GitHub conserve des **caches** et des références accessibles un certain temps ;
- des **forks** ou des copies automatisées (robots qui balayent GitHub à la recherche
  de secrets) ont pu enregistrer les clés quelques minutes après leur publication.

Une clé publiée doit être considérée comme définitivement compromise.
**La révocation (régénération des clés) est la seule vraie parade.** Le nettoyage de
l'historique reste souhaitable ensuite, par propreté, mais il ne protège rien à lui seul.

### Vérification finale

Après régénération et redéploiement, appeler l'API avec une **ancienne** clé :
la réponse doit être **« Clé API invalide »**. Tant que l'ancienne clé fonctionne encore,
la révocation n'est pas terminée (déploiement non mis à jour ou clés non régénérées).

---

## 1. Gestion des secrets

Règles applicables à tout le projet, sans exception :

- **Aucun secret dans le dépôt** : ni clé API, ni mot de passe, ni jeton, ni URL privée,
  ni donnée réelle — ni dans le code, ni dans la documentation, ni dans les captures d'écran.
- Le fichier **`.env` est ignoré par git** (`.gitignore`). Seul **`.env.example`** est commité,
  et il ne contient **que des noms de variables avec des valeurs factices**.
- Les secrets vivent **côté serveur uniquement** :
  - backend Apps Script (v7) : **Script Properties** ;
  - mode Local (v8) : configuration locale dans le dossier de données, hors dépôt.
- Avant chaque commit, relire le diff : un secret qui part sur GitHub public doit être
  considéré comme compromis et **révoqué immédiatement** (cf. incident ci-dessus).

## 2. Authentification et rôles (v8)

- Quatre rôles applicatifs : **ADMIN**, **REFERENT**, **ENSEIGNANT**, **ELEVE**,
  avec des droits strictement croissants (voir / saisir / valider / administrer).
- Les mots de passe sont **hachés avec scrypt** (`node:crypto`) : jamais stockés en clair,
  jamais journalisés, jamais transmis en dehors de l'authentification.
- **Un élève ne peut jamais passer en mode officiel** : le rôle ELEVE est cantonné au mode
  FORMATION, ses documents portent le filigrane et la numérotation de formation, et toute
  écriture d'un élève requiert la validation d'un enseignant ou d'un référent.
- Les connexions et les actions d'administration sont journalisées (journal d'audit).

## 3. Intégrité du registre

Le registre des mouvements de fluides est conçu pour être **opposable** :

- une écriture **validée** est **verrouillée** : elle n'est jamais modifiée ni effacée ;
- toute correction passe par une **contre-écriture** de régularisation qui référence
  l'écriture d'origine (traçabilité complète des erreurs et de leur correction) ;
- chaque écriture porte une **empreinte SHA-256 chaînée** à l'empreinte précédente :
  toute altération a posteriori de la chaîne devient détectable ;
- le **journal d'audit** (qui, quoi, quand, avant/après) est en **ajout seul**
  (append-only) : l'application n'expose **aucune route de suppression ni de purge** ;
- les pièces justificatives portent leur propre empreinte SHA-256.

### Limites du mode Démo — l'inviolabilité réelle relève du mode Local

En mode Démo, les données vivent dans le navigateur (`localStorage`) : quiconque a accès
au poste peut les réécrire. Les protections v8 sont donc **détectives**, pas préventives :

- **à l'import d'une sauvegarde JSON**, les invariants métier (masses et charges positives
  et finies, quantités finies) et la **chaîne de hash complète** sont revérifiés — un fichier
  forgé ou altéré est **refusé** en désignant l'écriture en cause ;
- **au chargement**, les mêmes vérifications s'exécutent : en cas de rupture, l'application
  n'est pas bloquée mais signale un **registre altéré** (drapeau `getEtatRegistre()`, bandeau
  d'interface).

Ces contrôles détectent une altération, ils ne peuvent pas l'empêcher : un attaquant maîtrisant
le poste peut régénérer une chaîne cohérente. **L'inviolabilité réelle du registre relèvera du
mode Local** (base SQLite côté serveur, triggers d'interdiction de `UPDATE`/`DELETE` déjà
prêts dans `server/schema.sql`), où l'utilisateur du navigateur n'a plus la main sur le stockage.

## 4. Sécurité par mode d'utilisation

### Mode Démo (GitHub Pages)
- **Aucune donnée réelle autorisée** : jeu de démonstration fictif uniquement,
  persistance limitée au navigateur.
- Aucun secret, aucun serveur, aucun mode officiel réel.
- **Filigrane permanent** « DÉMO / FORMATION » sur l'interface et sur tous les documents générés.

### Mode Local Lycée
- Serveur Node.js à l'écoute de **127.0.0.1 par défaut** (localhost) : l'application
  n'est pas exposée sur le réseau, et ce comportement ne change JAMAIS tout seul.
- **Écoute réseau local (LAN) — sur configuration explicite, et en HTTPS
  obligatoire.** Pour qu'une tablette de l'établissement atteigne l'application, il
  faut renseigner `IWF_LAN=1`, l'adresse du poste et un certificat
  (`IWF_TLS_CERT` / `IWF_TLS_KEY`). Une écoute LAN transporte des identités, des
  signatures et des justificatifs réglementaires : **HTTP en clair y est refusé**.
  Sans certificat, le serveur refuse de démarrer — il n'existe aucun repli
  silencieux vers le clair. TLS 1.2 minimum, en-tête HSTS, origine `https://`
  seule acceptée.
- **Le serveur ne distribue que l'application.** Seuls `v8/`, `img/` et trois
  fichiers de page d'accueil sortent par HTTP ; le code serveur, les données, les
  sauvegardes, la documentation interne et les fichiers de configuration ne sont
  jamais servis (liste blanche, et non liste noire — un fichier ajouté au dossier
  n'est donc pas exposé par accident).
- Toutes les données restent **dans le dossier de l'application** (base SQLite, documents,
  sauvegardes) : rien ne sort de l'établissement.
- Sauvegardes ZIP complètes, **chiffrables en AES-256-GCM** par phrase de passe,
  avec redondance recommandée (disque local + clé USB + espace de l'établissement).

### Mode Cloud — NON IMPLÉMENTÉ à ce jour
Ce document annonçait un hébergement mutualisé (base partagée dans l'Union
européenne, cloisonnement par établissement, documents en espace privé).
**Ce mode n'existe pas dans le programme** : le serveur ne parle à aucun
service distant, et aucune donnée ne quitte le poste.

L'annonce est retirée (P2-5, 23/07) plutôt que maintenue au conditionnel :
promettre une architecture d'hébergement — donc un sous-traitant, un lieu de
stockage et des transferts — engage l'établissement responsable de traitement
au sens du RGPD. Tant que le contrat de sous-traitance et les transferts ne
sont pas maîtrisés, la seule affirmation exacte est celle-ci : **inerWeb Fluide
fonctionne entièrement en local.**

## 5. Signaler une faille de sécurité

Si vous découvrez une vulnérabilité dans inerWeb Fluide :

- **Ne pas ouvrir d'issue publique** décrivant la faille (cela la révélerait à tous
  avant qu'elle soit corrigée).
- Contacter directement l'auteur : **inerweb.fh@gmail.com** (objet : « Sécurité inerWeb Fluide »).
  Merci de signaler la faille en privé et de laisser un délai raisonnable de correction avant toute
  divulgation publique.
- Décrire la faille, les étapes pour la reproduire et, si possible, l'impact estimé.
- Un accusé de réception sera envoyé et la correction sera priorisée ; la faille pourra
  être documentée publiquement **après** correction.

Merci de contribuer à la sécurité d'un outil destiné aux lycées professionnels.
