# Politique de sauvegarde — inerWeb Fluide

**Exigence n° 1 du projet : aucune perte de données ne doit être possible.**
Le registre des fluides est un document réglementaire : le perdre, c'est perdre la
traçabilité de l'établissement. Ce guide explique, simplement, comment l'application
protège vos données et ce que vous devez mettre en place de votre côté.

Ce guide concerne principalement le **Mode Local Lycée**. Les modes Démo et Cloud
sont traités en fin de document.

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

Ce qui est **déjà automatique** dans cette version :

- **Avant chaque restauration**, l'application crée d'elle-même une sauvegarde de
  sécurité de l'état courant, dans `backups/` : une restauration lancée par erreur
  reste ainsi réversible.

⚠️ **Ce qui n'est PAS encore actif** (prévu pour une prochaine version) : la
sauvegarde **périodique planifiée** (à l'ouverture si la dernière date de plus de
24 heures, et à la fermeture). Tant qu'elle n'est pas en place, **créez vous-même
une sauvegarde régulièrement** (section 2), idéalement à chaque journée
d'utilisation — c'est un simple clic. C'est votre meilleure garantie de ne rien
perdre.

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
| 1 — l'originale | Le disque du poste (`backups/`) | **Manuelle, à faire à chaque journée d'utilisation** (un clic) ; la sauvegarde périodique automatique est prévue mais pas encore active |
| 2 — la clé USB | Une **clé USB dédiée**, rangée au bureau, qui ne sert qu'à ça | **Chaque semaine** : copier le dernier ZIP sur la clé |
| 3 — hors site | L'espace réseau ou le cloud de l'établissement | **Chaque mois** : y déposer le dernier ZIP (chiffré de préférence) |

Calendrier simple à retenir : **le vendredi, la clé USB ; le premier du mois, le réseau.**
Cinq minutes par semaine suffisent. Gardez au moins les trois dernières copies sur
chaque support (inutile de tout garder : les ZIP sont datés, les plus anciens peuvent
être supprimés).

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

### Mode Cloud Lycée
En mode Cloud, les **sauvegardes automatiques sont assurées côté serveur** (Supabase,
hébergement dans l'Union européenne) selon une planification régulière. Vous gardez
en plus la main : un **export local complet est possible à tout moment** depuis
l'application, pour conserver votre propre copie hors ligne — la règle 3-2-1
s'applique aussi au cloud.
