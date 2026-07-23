# Installation du Mode Cloud Lycée — ⚠️ MODE NON IMPLÉMENTÉ

> **⛔ Ce guide décrit une intention, pas le logiciel livré (constat P2-5, 23/07).**
>
> **Le mode Cloud n'existe pas dans le programme** : inerWeb Fluide fonctionne
> entièrement en local et ne transmet de données à aucun service distant.
> N'appliquez pas ce guide — il ne branchera rien, et il vous ferait déclarer à
> votre délégué à la protection des données un sous-traitant d'hébergement que
> vous n'avez pas.
>
> Le document est conservé comme **note de conception** (l'intention, les
> précautions envisagées, la région UE retenue), pas comme une procédure. S'il
> devait être réalisé un jour, il faudrait d'abord : le contrat de sous-traitance,
> la maîtrise des transferts, et la validation du DPD.
>
> Pour installer le logiciel, voir **`INSTALLATION_SIMPLE.md`**.

---

Ce guide décrit la mise en place du **Mode Cloud Lycée** d'inerWeb Fluide v8, fondé sur
[Supabase](https://supabase.com) (base PostgreSQL hébergée dans l'Union européenne).
Ce mode est **optionnel** : la plupart des établissements peuvent fonctionner en Mode Local
(voir le `README.md`).

> ⚠️ Ce guide est destiné au référent numérique ou à l'enseignant qui administre l'application.
> Aucune compétence de développeur n'est nécessaire : chaque étape se fait depuis un navigateur.

## 1. Cloud ou local : comment choisir ?

| Situation de l'établissement | Mode recommandé |
|---|---|
| Un seul poste dans l'atelier, un enseignant référent | **Mode Local** (plus simple, aucune inscription) |
| Plusieurs postes utilisés **en même temps** (îlots d'atelier, salle de cours + atelier) | **Mode Cloud** |
| Plusieurs enseignants qui saisissent chacun de leur côté | **Mode Cloud** |
| Consultation du registre depuis la salle des professeurs ou à distance | **Mode Cloud** |
| Pas de connexion Internet fiable dans l'atelier | **Mode Local** |

En résumé : restez en local tant qu'un seul poste suffit ; passez au cloud dès que plusieurs
personnes doivent travailler simultanément sur le même registre.

Le passage du local au cloud est possible plus tard : les données s'exportent puis se réimportent
(voir `SAUVEGARDE.md`).

## 2. Créer le projet Supabase

1. Créez un compte sur [supabase.com](https://supabase.com) — de préférence avec une adresse
   professionnelle de l'établissement (et non une adresse personnelle), pour que le projet
   survive aux changements d'équipe.
2. Cliquez sur **New project** et renseignez :
   - **Name** : par exemple `inerweb-fluide-lycee-xxx` ;
   - **Database password** : générez un mot de passe fort et conservez-le dans le coffre
     de mots de passe de l'établissement (il ne sera plus affiché) ;
   - **Region** : ⚠️ **obligatoirement une région de l'Union européenne** —
     choisissez **Europe (Frankfurt)** ou **Europe (Paris)**. C'est une exigence RGPD
     (voir `RGPD.md`) : les données ne doivent pas quitter l'UE.
3. Le **plan gratuit (Free)** suffit largement au départ (voir §8 Coûts).

## 3. Appliquer le schéma de la base

Le schéma complet de la base (tables machines, bouteilles, mouvements, contrôles, personnel,
outillage, pièces jointes, journal d'audit…) est fourni dans le dépôt : `server/schema.sql`.

1. Dans le tableau de bord Supabase, ouvrez **SQL Editor** (menu de gauche).
2. Cliquez sur **New query**.
3. Ouvrez le fichier `server/schema.sql` avec un éditeur de texte, copiez tout son contenu
   et collez-le dans l'éditeur SQL.
4. Cliquez sur **Run**. Le message de réussite confirme la création des tables.

Vérification : dans **Table Editor**, les tables du registre doivent apparaître
(`machines`, `bouteilles`, `mouvements`, `controles`, `personnel`, `outillage`,
`pieces_jointes`, `journal_audit`…).

## 4. Configurer l'authentification

Les comptes utilisateurs (référent, enseignants, élèves) sont gérés par **Supabase Auth**,
en mode courriel + mot de passe. Dans un lycée, c'est **l'administrateur qui crée les comptes** :
personne ne doit pouvoir s'inscrire librement.

1. Dans **Authentication → Sign In / Providers**, vérifiez que **Email** est activé
   et désactivez tous les autres fournisseurs.
2. ⚠️ **Désactivez les inscriptions publiques** : dans **Authentication → Sign In / Providers → Email**,
   décochez **Allow new users to sign up**. Sans cela, n'importe qui connaissant l'adresse
   du projet pourrait créer un compte.
3. Créez les comptes depuis **Authentication → Users → Add user** (adresse + mot de passe
   provisoire), ou depuis l'écran d'administration d'inerWeb Fluide une fois l'application
   configurée. Les rôles applicatifs (ADMIN / REFERENT / ENSEIGNANT / ELEVE) sont ensuite
   attribués dans l'application.

## 5. Row Level Security (cloisonnement des données)

La **Row Level Security** (RLS, « sécurité au niveau des lignes ») est le mécanisme de
PostgreSQL qui garantit que **chaque établissement ne voit que ses propres données** :
toutes les tables du registre portent une colonne `etablissement_id`, et des politiques
d'accès filtrent automatiquement chaque lecture et chaque écriture selon l'établissement
de l'utilisateur connecté. Même en cas d'erreur dans l'application, la base refuse de
servir des données d'un autre établissement.

Les politiques sont **fournies avec le schéma** : le fichier `server/schema.sql` active la RLS
sur toutes les tables et crée les politiques nécessaires. Après l'étape 3, vérifiez simplement
que tout est en place :

1. Dans **Table Editor**, sélectionnez une table (par exemple `mouvements`).
2. La mention **RLS enabled** doit être affichée. Si une table apparaît avec l'avertissement
   **RLS disabled**, rejouez le fichier `server/schema.sql` dans l'éditeur SQL.

> ⚠️ Ne désactivez jamais la RLS « pour dépanner » : c'est elle qui protège vos données.

## 6. Stockage des documents (pièces justificatives)

Les pièces justificatives (attestations, certificats d'étalonnage, photos de pesée, BSFF…)
sont stockées dans **Supabase Storage**, dans un espace **privé** :

1. Ouvrez **Storage → New bucket**.
2. Nom du bucket : `documents` (exactement, en minuscules).
3. ⚠️ Laissez le bucket en **Private** (ne cochez pas « Public bucket ») : les documents
   ne doivent être accessibles qu'aux utilisateurs authentifiés de l'établissement.
4. Les politiques d'accès au stockage sont incluses dans `server/schema.sql`.

## 7. Configuration locale de l'application

L'application lit sa configuration cloud dans un fichier `.env` placé à la racine :

1. Copiez le fichier `.env.example` fourni dans le dépôt et renommez la copie en `.env`.
2. Renseignez les deux valeurs, à récupérer dans le tableau de bord Supabase,
   **Settings → API** :
   - `SUPABASE_URL` : l'adresse du projet (« Project URL », de la forme
     `https://xxxxxxxx.supabase.co`) ;
   - `SUPABASE_ANON_KEY` : la clé publique (« anon public key »).

```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=votre-cle-anon
```

Règles impératives :

- ⚠️ **Ne commitez JAMAIS le fichier `.env`** dans un dépôt Git, et ne le copiez jamais
  dans un dossier public. Le `.gitignore` du projet l'exclut déjà — ne contournez pas
  cette protection. Seul `.env.example` (sans valeurs réelles) est versionné.
- N'utilisez que la clé **anon** dans ce fichier. La clé `service_role`, visible au même
  endroit dans Supabase, donne un accès total à la base en contournant la RLS :
  elle ne doit **jamais** être copiée dans l'application ni communiquée.

Au lancement, l'application détecte la présence du `.env` et démarre en Mode Cloud.

## 8. Sauvegardes

Deux niveaux se complètent :

- **Côté Supabase** : sauvegardes automatiques quotidiennes de la base. Sur le plan gratuit,
  elles sont conservées **7 jours** ; les plans payants allongent cette durée et ajoutent
  la restauration à un instant précis.
- **Côté établissement** : un **export local régulier** reste indispensable — les sauvegardes
  Supabase protègent contre une panne du service, pas contre une suppression de compte,
  une erreur de manipulation ancienne ou une fermeture du projet. Utilisez la fonction
  d'export complet de l'application (base + documents) et conservez l'archive selon les
  recommandations de `SAUVEGARDE.md` (disque local + clé USB + espace de l'établissement).

Rythme conseillé : un export local au minimum **une fois par mois**, et systématiquement
avant les vacances scolaires et en fin d'année civile (le registre au 31/12 sert au bilan
matière annuel).

## 9. Coûts

- **Plan gratuit (Free)** : suffisant pour un lycée qui démarre. Limites principales
  (susceptibles d'évoluer, vérifier sur [supabase.com/pricing](https://supabase.com/pricing)) :
  base de données 500 Mo, stockage de fichiers 1 Go, sauvegardes conservées 7 jours,
  **mise en pause du projet après environ une semaine sans activité** (il se réactive
  depuis le tableau de bord, sans perte de données — à savoir pendant les vacances d'été).
- **Quand envisager le plan payant (Pro, ~25 $/mois)** :
  - le volume de pièces justificatives numérisées approche 1 Go ;
  - vous voulez éviter la mise en pause automatique (registre consulté toute l'année) ;
  - vous souhaitez des sauvegardes conservées plus longtemps que 7 jours.

Pour un usage pédagogique classique (quelques centaines de mouvements et de documents par an),
le plan gratuit tient plusieurs années : l'export local régulier compense la limite des
7 jours de sauvegarde.

## 10. En cas de difficulté

- Vérifiez d'abord le fichier `.env` (adresse et clé recopiées sans espace parasite).
- Consultez `SECURITE.md` pour les règles de sécurité (secrets, comptes, journal d'audit).
- Consultez `RGPD.md` pour les obligations liées aux données personnelles.
