# Installation simple — Mode Local Lycée

Ce guide s'adresse à un enseignant **non informaticien**. Il explique comment installer
**inerWeb Fluide** sur un poste du lycée, en une dizaine de minutes, sans aucune compétence
technique particulière. L'application fonctionne ensuite **entièrement en local** :
aucune donnée ne quitte le poste.

---

## 1. Ce qu'il vous faut (prérequis)

| Élément | Détail |
|---|---|
| Un ordinateur | Un PC Windows du lycée (poste d'atelier, de bureau ou portable) |
| Node.js version 22 ou plus | Le « moteur » gratuit qui fait tourner l'application |

### Installer Node.js (une seule fois par poste)

1. Ouvrez le site officiel : **<https://nodejs.org>**
2. Téléchargez la version **LTS** (c'est le gros bouton vert, « LTS » signifie version stable
   recommandée). Elle doit être **au minimum la version 22**.
3. Lancez le fichier téléchargé et cliquez sur **« Suivant »** à chaque étape,
   sans rien modifier, jusqu'à « Terminer ».

C'est tout. Vous n'aurez plus jamais à y toucher.

> 💡 Pour vérifier que Node.js est bien installé : menu Démarrer → tapez `cmd` → Entrée,
> puis tapez `node -v` et Entrée. Un numéro de version s'affiche (par exemple `v22.x.x`).

---

## 2. Installer l'application

1. **Récupérez le dossier de l'application** :
   - soit en téléchargeant le fichier ZIP depuis la page GitHub du projet
     (bouton **« Code » → « Download ZIP »**), puis en le décompressant
     (clic droit → « Extraire tout… ») ;
   - soit en le copiant depuis une **clé USB** fournie par un collègue.
2. **Déposez le dossier où vous voulez** sur le poste, par exemple :
   `D:\inerweb-fluide` (ou `C:\inerweb-fluide`, ou dans vos Documents).
   L'application est **portable** : tout tient dans ce dossier.
3. Ouvrez le dossier et **double-cliquez sur `lancer-inerweb.bat`**.
4. Une petite fenêtre noire s'ouvre (c'est le serveur local : **ne la fermez pas**
   tant que vous utilisez l'application), puis votre navigateur s'ouvre automatiquement
   sur l'adresse :

   **<http://localhost:2011>**

   Si le navigateur ne s'ouvre pas tout seul, ouvrez-le vous-même et tapez cette adresse.

> 💡 `localhost` signifie « ce poste-ci » : l'application n'est accessible que depuis
> l'ordinateur sur lequel elle tourne. Rien ne circule sur internet.

---

## 3. La première configuration (assistant guidé)

Au tout premier lancement, un **assistant de configuration** s'affiche et vous demande,
étape par étape :

1. **Votre établissement** :
   - raison sociale (le nom officiel du lycée) ;
   - numéro **SIRET** ;
   - numéro d'**attestation de capacité** de l'établissement, avec son organisme
     certificateur et ses dates de validité (l'application vous alertera avant l'échéance).
2. **Le premier compte administrateur** : votre nom, votre adresse électronique
   et un mot de passe. Ce compte permettra ensuite de créer les comptes des collègues
   (référents, enseignants) et des élèves.

Une fois l'assistant terminé, vous arrivez sur le tableau de bord : l'application est prête.

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
3. Téléchargez la nouvelle version (ZIP GitHub ou clé USB).
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
Node.js n'est pas installé (ou pas dans une version suffisante). Reprenez le point 1
de ce guide : installez la version LTS depuis <https://nodejs.org> (version 22 minimum),
puis relancez.

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
