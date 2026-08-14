# Installation simple — Mode Local Lycée

Ce guide s'adresse à un enseignant **non informaticien**. Il explique comment installer
**inerWeb Fluide** sur un poste du lycée, en une dizaine de minutes, sans aucune compétence
technique particulière. L'application fonctionne ensuite **entièrement en local** :
aucune donnée ne quitte le poste.

---

## 1. Deux façons d'installer — choisissez la vôtre

| Vous avez… | Suivez… |
|---|---|
| Le **paquet portable** reçu **à votre nom** (sur demande à inerweb.fh@gmail.com) | La voie A : **rien à installer**, Node.js est déjà dedans |
| Le **dossier du projet** téléchargé depuis GitHub (« Code » → « Download ZIP ») | La voie B : réservée à la lecture du code et au développement |

> 💡 Dans le doute, regardez dans votre dossier : s'il contient un sous-dossier `node\`
> et un fichier `LISEZ-MOI.txt`, c'est le paquet portable (voie A).

### Voie A — le paquet portable (la voie normale)

Il n'y a **aucun prérequis** : le « moteur » Node.js est déjà inclus dans le dossier.
Le paquet contient aussi votre **licence nominative** (`licence-inerweb.json`), que le
logiciel vérifie au démarrage, entièrement sur le poste : ne supprimez pas ce fichier.
La licence est personnelle : un collègue intéressé demande **son** paquet (gratuit) à
inerweb.fh@gmail.com plutôt que de copier le vôtre.
Passez directement au point 2.

### Voie B — le dossier GitHub : installer Node.js (une seule fois par poste)

1. Ouvrez le site officiel : **<https://nodejs.org>**
2. Téléchargez la version **LTS** (« LTS » signifie version stable recommandée).
   Elle doit être **au minimum la version 22** (version 24 conseillée).
3. Lancez le fichier téléchargé et cliquez sur **« Suivant »** à chaque étape,
   sans rien modifier, jusqu'à « Terminer ».

C'est tout. Vous n'aurez plus jamais à y toucher.

> 💡 Pour vérifier que Node.js est bien installé : menu Démarrer → tapez `cmd` → Entrée,
> puis tapez `node -v` et Entrée. Un numéro de version s'affiche (par exemple `v24.x.x`).

---

## 2. Installer et lancer l'application

1. **Déposez le dossier où vous voulez** sur le poste, par exemple :
   `D:\inerweb-fluide` (ou `C:\inerweb-fluide`, ou dans vos Documents).
   L'application est **portable** : tout tient dans ce dossier.
   Si vous avez un ZIP, décompressez-le d'abord (clic droit → « Extraire tout… »).
2. Ouvrez le dossier et **double-cliquez sur `lancer-inerweb.bat`**.
3. Une petite fenêtre noire s'ouvre (c'est le serveur local : **ne la fermez pas**
   tant que vous utilisez l'application), puis votre navigateur s'ouvre automatiquement
   sur l'adresse :

   **<http://localhost:2011>**

   Si le navigateur ne s'ouvre pas tout seul, ouvrez-le vous-même et tapez cette adresse.

> 💡 `localhost` signifie « ce poste-ci » : l'application n'est accessible que depuis
> l'ordinateur sur lequel elle tourne. Rien ne circule sur internet.

> 💡 Windows peut afficher un avertissement « SmartScreen » au premier lancement
> (application téléchargée non signée) : cliquez sur « Informations complémentaires »
> puis « Exécuter quand même ».

---

## 3. Le premier lancement

Au tout premier lancement, l'application affiche **un seul écran** :
**« Créer le compte administrateur »**. Choisissez un identifiant et un mot de passe
(au moins 10 caractères) et validez : vous entrez directement dans l'application.
Ce compte permettra ensuite de créer les comptes des collègues (référents,
enseignants) et des élèves, depuis l'écran **Administration**.

### Complétez ensuite votre établissement (important)

Le tableau de bord vous accueille avec les premières étapes de prise en main.
La toute première : **compléter le dossier de votre établissement** (écran
**Administration**, c'est le **cadre 1 du CERFA**) :

- raison sociale (le nom officiel du lycée) et adresse ;
- numéro **SIRET** ;
- numéro d'**attestation de capacité** de l'établissement, avec son organisme
  certificateur et ses dates de validité (l'application vous alertera avant l'échéance).

Sans ce dossier, les CERFA générés seraient incomplets : prenez ces cinq minutes
avant de saisir vos premières machines et bouteilles.

---

## 4. Où sont mes données ?

Tout est rangé **dans le dossier de l'application**, à côté des fichiers du programme :

| Dossier | Contenu |
|---|---|
| `data/` | La base de données (fichier SQLite `inerweb-fluide.db`) : machines, bouteilles, mouvements, contrôles, comptes… |
| `documents/` | Les pièces justificatives (PDF, photos de pesée, attestations, certificats…) |
| `backups/` | Les sauvegardes complètes au format ZIP |

**Rien ne part sur internet.** Pas de compte en ligne, pas d'envoi de données, pas de
service tiers : vos données restent sur le poste du lycée. Pour déménager l'application
sur un autre poste, il suffit de copier tout le dossier.

⚠️ Ces trois dossiers sont **précieux** : c'est là que vit votre registre. Ne les supprimez
jamais, et lisez le guide [`SAUVEGARDE.md`](SAUVEGARDE.md) pour les protéger correctement.

---

## 5. Mettre à jour l'application

Quand une nouvelle version paraît :

1. **Faites d'abord une sauvegarde** (bouton « Sauvegarde » dans l'application —
   voir [`SAUVEGARDE.md`](SAUVEGARDE.md)).
2. Fermez l'application (fermez la fenêtre noire du serveur).
3. Demandez le paquet à jour (même adresse : inerweb.fh@gmail.com) — il arrive
   avec votre licence, par courriel ou clé USB.
4. **Remplacez uniquement les fichiers du programme** dans votre dossier
   (`index.html`, `css/`, `js/`, `server/`, `lancer-inerweb.bat`, etc.).
5. **Ne touchez surtout pas** aux dossiers `data/`, `documents/` et `backups/` :
   ce sont vos données, la nouvelle version les retrouvera telles quelles.
6. Relancez avec `lancer-inerweb.bat`.

---

## 6. Dépannage

### « Le port est déjà utilisé » (message d'erreur au lancement)
Un autre programme (ou une autre fenêtre d'inerWeb restée ouverte) occupe déjà
l'adresse 2011. Fermez toutes les fenêtres noires « serveur » ouvertes, attendez
quelques secondes, puis relancez `lancer-inerweb.bat`. Si le problème persiste,
redémarrez le poste.

### « node n'est pas reconnu… » ou la fenêtre noire se ferme aussitôt
- **Paquet portable (voie A)** : le dossier est incomplet (le sous-dossier `node\` manque).
  Recopiez le paquet en entier depuis sa source.
- **Dossier GitHub (voie B)** : Node.js n'est pas installé (ou pas dans une version
  suffisante). Reprenez le point 1 : installez la version LTS depuis <https://nodejs.org>
  (version 22 minimum), puis relancez.

### « Ce paquet exige une licence nominative… » au démarrage
Le fichier `licence-inerweb.json` manque, a été modifié, ou vient d'un autre paquet.
Recopiez votre paquet **en entier** depuis l'archive reçue ; si le message persiste,
écrivez à inerweb.fh@gmail.com (remplacement gratuit). Si la licence est simplement
**expirée**, l'application démarre quand même : vos données restent consultables et
exportables, seules les nouvelles saisies attendent le renouvellement (gratuit).

### L'antivirus bloque le lancement
Certains antivirus se méfient des fichiers `.bat`. Si un message s'affiche, choisissez
« Autoriser » ou « Exécuter quand même » (l'application est locale et n'accède pas à
internet). Sur un poste géré par l'établissement, demandez au service informatique
d'ajouter le dossier de l'application aux exceptions de l'antivirus.

### Le poste a planté, le disque est mort, quelqu'un a supprimé un dossier…
Pas de panique si vous avez suivi la politique de sauvegarde : la restauration se fait
**en un clic** depuis une sauvegarde ZIP. La procédure complète (et tout ce qu'il faut
mettre en place pour ne jamais rien perdre) est décrite dans
[`SAUVEGARDE.md`](SAUVEGARDE.md).
