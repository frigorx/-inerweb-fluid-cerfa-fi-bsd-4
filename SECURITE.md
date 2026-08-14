# Politique de sécurité — inerWeb Fluide

> Ce document décrit la politique de sécurité du projet inerWeb Fluide (v8) et la procédure
> de traitement de l'incident du 02/07/2026 concernant les clés API du backend v7.
>
> **Où en est-on (14/08/2026)** : la v7 est **abandonnée et retirée du dépôt** depuis le
> 25/07/2026 — l'incident historique ci-dessous est donc consigné pour mémoire, et il n'en
> reste qu'UN geste, hors code : couper le déploiement Apps Script de la v7 (constat P0-9).
> Tant que ce geste n'est pas fait, l'incident ne se déclare pas clos.

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

## 5. Ce que le logiciel REFUSE — et comment le vérifier soi-même

Un registre digne de confiance ne se juge pas à ce qu'il sait faire, mais à ce qu'il refuse. Ces
refus ne sont pas décrits ici pour être crus sur parole : ils sont **exécutés** par une
suite dédiée, que quiconque peut relancer.

```
node server/test-securite-negative.mjs
```

**118 attaques y sont TIRÉES** contre un vrai serveur (port et base jetables), contre la
base en SQL direct, et contre une copie du dépôt portant une vraie jonction Windows.
Elles couvrent notamment :

| Ce qui est refusé | Comment c'est prouvé |
|---|---|
| Lire ou écrire sans session, avec un jeton forgé, depuis une origine tierce (CSRF) ou un hôte étranger (rebinding DNS) | requêtes HTTP réelles |
| Un rôle « ADMIN » glissé dans le corps de la requête | le contexte vient de la connexion, jamais du client |
| Ce qu'un ÉLÈVE ne peut pas faire : sceller, annuler, s'attribuer une aptitude, modifier un PRP, importer, lire le journal nominatif, exporter le registre | 15 gestes refusés, **plus une contre-épreuve** qui prouve que la saisie courante reste ouverte |
| Modifier ou supprimer une écriture scellée, en SQL direct (`UPDATE`, `DELETE`, `REPLACE INTO`), y compris le journal d'audit | déclencheurs WORM, `PRAGMA recursive_triggers` |
| **Faire disparaître une écriture** en la passant à ANNULE hors application | contrôle d'appariement des annulations (toute annulée est désignée par sa contre-écriture) |
| **Réécrire le passé par un import** : quantités retouchées puis empreintes retirées | refus + borne monotone hors registre |
| **Purger le journal d'audit** par aller-retour export → import | témoin de tête (nombre + empreinte) vérifié |
| Faire mentir une date : `31/12/2020` pour une attestation périmée, `2028-99-99` pour une détection « vérifiée », une vérification datée dans le futur | module `dates.js` : format ancré **et** calendrier réel |
| Forger une échéance de contrôle (`2099-01-01`), un numéro de fiche, une charge nominale à zéro | l'échéance vient du moteur réglementaire, le numéro du registre |
| Blanchir du fluide récupéré en régénéré, sortir une bouteille du déchet, requalifier un HFC « hors périmètre », reprendre la photo d'un exercice clos | gardes de transition, la famille du fluide fait foi |
| Fabriquer une fiche officielle par import alors que le mode Officiel est fermé | le verrou garde les deux portes |
| Télécharger la base ou du code privé par le serveur web (y compris via une jonction Windows) | extensions jamais servies + chemin physique résolu |

Chaque ligne du tableau correspond à une attaque qui **a réellement fonctionné** avant
d'être corrigée : elles ont été trouvées en tirant, pas en relisant le code. Le détail de
chacune, avec sa cause et son correctif, est en tête de `CHANGELOG.md` (lot L2).

Deux principes guident ces refus, et méritent d'être connus des utilisateurs :

- **on n'empêche jamais d'enregistrer la réalité** — un retard, une clôture tardive, une
  surcharge de réemploi sont *signalés*, jamais bloqués ;
- **le doute retire l'allègement, jamais l'obligation** — une donnée illisible ne « passe »
  pas, elle fait retomber sur le régime le plus strict.

## 6. Signaler une faille de sécurité

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
