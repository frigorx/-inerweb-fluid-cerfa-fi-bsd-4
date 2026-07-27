# Politique de sauvegarde — inerWeb Fluide

**Exigence n° 1 du projet : aucune perte de données ne doit être possible.**
Le registre des fluides est un document réglementaire : le perdre, c'est perdre la
traçabilité de l'établissement. Ce guide explique, simplement, comment l'application
protège vos données et ce que vous devez mettre en place de votre côté.

Ce guide concerne principalement le **Mode Local Lycée**. Le mode Démo est
traité en fin de document, ainsi que le cas du « mode Cloud » (non implémenté).

---

## 1. Le principe 3-2-1, expliqué simplement

C'est la règle d'or de toute sauvegarde, utilisée par les professionnels :

- **3 copies** de vos données : l'originale + deux sauvegardes ;
- sur **2 supports différents** : par exemple le disque du poste **et** une clé USB
  (si le disque meurt, la clé survit) ;
- dont **1 copie hors site** : une copie qui n'est pas dans la même salle
  (espace réseau du lycée, cloud de l'établissement…). Si l'atelier subit un dégât
  des eaux ou un vol, cette copie-là est à l'abri.

Un incendie, un vol, un disque qui lâche, une mauvaise manipulation : aucun de ces
événements, pris isolément, ne doit pouvoir détruire votre registre.

---

## 2. La sauvegarde en un clic

Dans la barre latérale de l'application, le bouton **« Sauvegarde »** est visible en
permanence. Un clic crée une **sauvegarde complète** :

- la **base de données** (machines, bouteilles, mouvements, contrôles, personnel,
  outillage, comptes…) ;
- tous les **documents** (pièces justificatives, attestations, certificats, photos de pesée…) ;
- la **configuration** de l'établissement.

Le tout est rassemblé dans **un seul fichier ZIP**, nommé automatiquement :

```
inerweb-sauvegarde-AAAA-MM-JJ-HHMM.zip
```

(par exemple `inerweb-sauvegarde-2026-09-07-1730.zip` pour une sauvegarde faite
le 7 septembre 2026 à 17 h 30), et rangé dans le dossier **`backups/`** de l'application.

Ce fichier ZIP se suffit à lui-même : il contient tout ce qu'il faut pour reconstruire
l'application à l'identique sur n'importe quel poste.

---

## 3. Les sauvegardes automatiques

Ce qui est **automatique** dans cette version (actif par défaut) :

- **Au démarrage de l'application** : si la dernière archive date de plus de
  **24 heures** (réglable de 1 à 720 heures), une **archive complète** est créée
  d'elle-même, puis **vérifiée aussitôt** (intégrité de la base, clés étrangères,
  chaînes du registre et du journal). Le résultat s'affiche dans la fenêtre de
  démarrage et l'archive apparaît dans la liste de l'écran Sauvegarde.
- **Après chaque écriture validée** (mouvement validé ou contre-écriture) : un
  **instantané** de la base est créé (au plus un par tranche de 10 minutes) —
  le filet anti-erreur-humaine.
- **Avant chaque restauration**, l'application crée d'elle-même une sauvegarde de
  sécurité de l'état courant : une restauration lancée par erreur reste réversible.

Un échec de sauvegarde automatique **n'empêche jamais** ni le démarrage ni la
validation : il s'affiche en console et se journalise (action `SAUVEGARDE_ECHEC`).
La rotation habituelle (jour/semaine/mois) s'applique aux sauvegardes automatiques
comme aux manuelles. L'interrupteur et l'intervalle se règlent dans l'écran
Sauvegarde, section « Réglages de sauvegarde ».

**Le témoin quotidien de scellement** (automatique lui aussi, toujours actif) :
chaque jour, un petit fichier `scellement/temoin-AAAA-MM-JJ.json` est écrit dans
le dossier de sauvegarde, et rafraîchi après chaque écriture validée. Il constate
les **têtes des chaînes** du registre et du journal, les compteurs, l'intervalle
des numéros et les versions ; chaque témoin embarque l'empreinte de celui de la
veille et sa propre empreinte (recette de vérification incluse dans le fichier).
Si le dossier de sauvegarde pointe vers un espace synchronisé, ce témoin **quitte
le poste chaque jour** : c'est la preuve datée qu'on ne peut pas réécrire
l'historique du registre en silence. Les témoins ne sont jamais supprimés
(environ 1 Ko par jour). Un échec s'affiche et se journalise (`SCELLEMENT_ECHEC`)
sans jamais rien bloquer.

La sauvegarde **manuelle** (section 2) reste utile avant une opération
inhabituelle (import, restauration, fin d'année) — c'est un simple clic.

---

## 4. Chiffrement optionnel de la sauvegarde

Si le ZIP doit circuler (clé USB, espace réseau, messagerie), vous pouvez le **chiffrer** :
la sauvegarde est alors protégée par une **phrase de passe** avec un chiffrement fort
(AES-256-GCM, le standard actuel). Sans la phrase, le fichier est illisible pour quiconque.

⚠️ **Avertissement important** : ce chiffrement n'a **aucune porte dérobée**.
Si la phrase de passe est perdue, la sauvegarde est **définitivement illisible** —
personne, pas même l'auteur du logiciel, ne peut la récupérer.
**Écrivez la phrase de passe noir sur blanc** (par exemple dans le cahier du bureau
ou le coffre de l'établissement) et assurez-vous qu'au moins deux personnes savent
où elle se trouve.

---

## 5. La restauration en un clic

Restaurer, c'est repartir d'une sauvegarde. C'est utile après un plantage, un changement
de poste, ou une mauvaise manipulation.

1. Ouvrez l'écran de restauration : soit depuis **l'écran de connexion**
   (lien « Restaurer une sauvegarde »), soit depuis la **fenêtre Sauvegarde**
   dans l'application.
2. **Choisissez le fichier ZIP** à restaurer (dans `backups/`, sur une clé USB,
   ou n'importe où ailleurs). Si le ZIP est chiffré, la phrase de passe vous est demandée.
3. Une **confirmation explicite** vous est demandée, car :

   ⚠️ **la restauration REMPLACE toutes les données actuelles** par celles de la
   sauvegarde choisie. Tout ce qui a été saisi après la date de cette sauvegarde disparaît.

4. Par précaution, l'application crée **automatiquement une sauvegarde de sécurité
   des données actuelles avant de restaurer** : même une restauration faite par erreur
   est donc réversible.
5. Après restauration, l'application redémarre sur les données restaurées.

---

## 6. Redondance recommandée pour un lycée

Le dossier `backups/` est sur le même disque que l'application : si le disque meurt,
tout part ensemble. Il faut donc **copier régulièrement les ZIP ailleurs**.
Organisation recommandée (qui applique le principe 3-2-1) :

| Copie | Support | Fréquence conseillée |
|---|---|---|
| 1 — l'originale | Le disque du poste (`backups/`) | **Automatique** : archive au démarrage (si la dernière a plus de 24 h, vérifiée aussitôt) + instantané après chaque écriture validée |
| 2 — la clé USB | Une **clé USB dédiée**, rangée au bureau, qui ne sert qu'à ça | **Chaque semaine** : copier le dernier ZIP sur la clé |
| 3 — hors site | L'espace réseau ou le cloud de l'établissement | **Chaque mois** : y déposer le dernier ZIP (chiffré de préférence) |

Calendrier simple à retenir : **le vendredi, la clé USB ; le premier du mois, le réseau.**
Cinq minutes par semaine suffisent. Gardez au moins les trois dernières copies sur
chaque support (inutile de tout garder : les ZIP sont datés, les plus anciens peuvent
être supprimés).

### ⚠️ Données personnelles et synchronisation (coffre des identités, lot E2)

- **Les archives automatiques sont EN CLAIR** (elles portent le registre
  complet, noms compris) et doivent **rester sur le poste**. Toute copie hors
  du poste (clé USB, réseau, nuage) doit passer par une **sauvegarde manuelle
  CHIFFRÉE** (section 4).
- **Le logiciel l'applique désormais lui-même** (lot 0 / B3, 27/07/2026) : le
  réglage « Dossier de destination des sauvegardes » **refuse** un dossier
  situé sous OneDrive, Google Drive ou Dropbox, et le dit — même règle que
  pour la base vive, qui y était déjà interdite (`IWF_CHEMIN_BASE`). Le refus
  vit dans le serveur : il vaut pour l'écran **comme pour l'API**. Porte de
  sortie assumée, réservée à un usage documenté :
  `IWF_AUTORISER_SAUVEGARDE_SYNCHRONISEE=1`.
  Un poste déjà réglé ainsi **continue de sauvegarder** : au démarrage, le
  serveur affiche un avertissement, il ne bloque pas (une sauvegarde qui ne se
  fait plus serait pire). Corrigez le réglage à la première occasion.
- Si vous synchronisez un dossier vers un espace en ligne (geste recommandé
  du témoin de scellement), **ne synchronisez QUE le sous-dossier
  `backups/scellement/`** : les témoins quotidiens ne contiennent que des
  empreintes et des compteurs — aucune donnée nominative. Jamais la racine
  `backups/` entière.
- **Après une mise à l'abri d'identités** (coffre, écran Protection des
  données) : pour revenir en arrière, restaurez une **ARCHIVE** (base +
  documents), jamais un simple instantané — les scans mis à l'abri ont été
  retirés du disque et un instantané (base seule) restaurerait une base qui
  pointe des fichiers disparus. La mise à l'abri produit d'ailleurs
  elle-même une archive vérifiée avant d'agir.
- Les sauvegardes et exports **antérieurs** à une mise à l'abri contiennent
  les identités en clair : appliquez-leur la même durée de rétention que le
  registre et supprimez les copies claires devenues inutiles.

---

## 7. Vérifier que ça marche : le test de rentrée

Une sauvegarde qui n'a jamais été testée n'est qu'un espoir. **Une fois par an,
en début d'année scolaire**, testez une restauration complète :

1. Cliquez sur **« Sauvegarde »** pour créer un ZIP frais du jour.
2. Copiez ce ZIP sur une clé USB.
3. Sur un **autre poste** (ou dans un dossier d'essai séparé), installez l'application
   comme décrit dans [`INSTALLATION_SIMPLE.md`](INSTALLATION_SIMPLE.md).
4. Depuis l'écran de connexion de cette installation d'essai, choisissez
   **« Restaurer une sauvegarde »** et sélectionnez le ZIP de la clé.
5. Connectez-vous et vérifiez que tout est là : les machines, les bouteilles,
   les derniers mouvements, une pièce justificative ouverte au hasard.
6. Si tout est conforme : votre chaîne de sauvegarde fonctionne. Supprimez
   l'installation d'essai. Sinon, cherchez la cause **maintenant**, pas le jour
   où vous en aurez vraiment besoin.

Notez la date du test dans le cahier du bureau : l'année prochaine, recommencez.

---

## 8. Et dans les autres modes ?

### Mode Démo (site public)
Les données du mode Démo vivent **uniquement dans votre navigateur** : elles ne sont
enregistrées nulle part ailleurs et peuvent disparaître si vous videz les données du
navigateur. C'est voulu : le mode Démo est un bac à sable de formation, pas un registre.
Un **export au format `.json`** est toutefois possible pour conserver ou transmettre
un exercice.

### Mode Cloud Lycée — NON IMPLÉMENTÉ
Ce mode n'existe pas dans le programme livré : inerWeb Fluide fonctionne
entièrement en local et ne transmet vos données à aucun service distant.
**Aucune sauvegarde n'est donc assurée « côté serveur »** : les sauvegardes
reposent ENTIÈREMENT sur l'établissement, exactement comme en Mode Local —
appliquez les sections 2 à 7 de ce guide (bouton Sauvegarde, sauvegardes
automatiques du poste, redondance 3-2-1, test de rentrée). Le fichier
`INSTALLATION_CLOUD.md` est conservé comme note de conception d'une
intention non réalisée : ne l'appliquez pas.
