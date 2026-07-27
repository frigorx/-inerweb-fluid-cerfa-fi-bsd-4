# Prompt de reprise — traiter un audit externe au verdict NO GO

> **À coller comme PREMIER message d'un nouveau chat.** Il est autonome : contexte, état
> exact du dépôt, méthode de traitement, pièges, gates. Le rapport d'audit se colle au §7,
> à la fin.
>
> **Réglage conseillé : Opus, effort très élevé (xhigh).** Chantier probatoire et
> réglementaire, décisions opposables. Pas d'ultracode hors point critique.

---

## 1. Ce que tu reprends

**inerWeb Fluide v8** — logiciel **local** de tenue du registre réglementaire de traçabilité
des fluides frigorigènes (F-Gas / CERFA 15497\*04) pour un lycée professionnel, filière froid
et climatisation.

- **Dépôt** : `C:\git\inerweb-fluide` (branche `main`).
- **Auteur et utilisateur** : Franck Henninot, LP Jacques Raynaud, Marseille. Enseignant, pas
  développeur professionnel. **Réponds en français simple, zéro anglicisme, zéro emoji dans
  le code.**
- **Le cap, tranché et non rouvert** : *registre officiel UNIQUE*, opposable, sans registre
  papier tenu en parallèle. C'est le barème maximal, et c'est assumé.

**À lire dans cet ordre avant toute exploration** — ils remplacent 90 % des recherches :

1. `docs/PROMPT-REPRISE.md` — l'état complet et l'historique des lots.
2. `docs/CARTE-CODE.md` — l'architecture en une page.
3. `CHANGELOG.md` — le dernier incrément en tête, avec le *pourquoi* de chaque décision.
4. `git log --oneline -15` et `git status` — ⚠️ des sessions parallèles écrivent parfois sur
   ce dépôt.

---

## 2. L'état du dépôt AU JOUR OÙ CE PROMPT A ÉTÉ ÉCRIT (25/07/2026)

> ⚠️ **Chiffres d'époque, pas chiffres courants.** Ce document est un mode d'emploi, pas un
> journal d'état : avant de t'en servir, **re-mesure**. Les commandes sont citées à côté de
> chaque valeur, et c'est leur sortie du jour qui fait foi. L'état courant se lit en tête de
> `docs/PROMPT-REPRISE.md`. Repère mesuré le 26/07/2026, après traitement de l'audit :
> **121 exécutions, 207 attaques, contrat v13 (96 méthodes), dernière migration 36.**

- **`main` propre, TOUT VERT — 106 exécutions au 25/07** (`node outils/lancer-tests.mjs --tout`).
- Contrat DataStore **v12** (96 méthodes) et dernière migration **35** *à cette date*.
- Le **mode Officiel est FERMÉ** (`VERROU_LIVRAISON = true`, dans les deux miroirs,
  volontairement non configurable par l'environnement). *Toujours vrai le 26/07.*
- Dernières fusions au 25/07 : **PR #18** (lot L2 — sécurité négative), **#19** (finition),
  **#20** (paquet d'audit).

### Ce que le lot L2 vient de livrer (25/07)

Une **suite de sécurité négative** — `server/test-securite-negative.mjs` — et **neuf trous
fermés** (L2-a à L2-i), chacun après avoir été *exécuté* et prouvé : annulation forgée en SQL
direct · blanchiment du registre par import · module de dates (« une date est une date ») ·
échéance de contrôle forgée · réécriture de la matière et du passé · fichiers privés servis par
le web · réparation réécrite et qualification par un élève · purge du journal d'audit · export
complet non gaté. Le nombre d'attaques de la suite **croît à chaque lot** : on ne le cite pas
figé ici, on le lit en lançant la suite (**207 le 26/07/2026**).

Puis une **revue adversariale** (5 relecteurs chargés de réfuter) a trouvé **3 bloquants et
8 constats**, tous corrigés — dont une régression que le correctif lui-même avait introduite,
et trois tests qui *ne pouvaient pas échouer*.

**Ce qui restait consigné comme ouvert avant l'audit** (c'est écrit noir sur blanc en tête du
`CHANGELOG.md`, et le rapport le retrouvera probablement) :

1. le **témoin d'intégrité du journal d'audit se recalcule** — l'algorithme est dans le code,
   qui est diffusé ; la parade identifiée est de le confronter au témoin de scellement
   externe quotidien, qui vit hors du fichier. **Non fait.**
2. le **modèle de menace s'arrête à l'accès disque** — qui a la main sur le fichier de base
   peut le remplacer ; les défenses visent le canal applicatif.
3. le **mode Officiel n'a jamais tourné en production**.
4. certaines **valeurs réglementaires attendaient la confirmation externe** (dossier T3) —
   **ce visa a été abandonné le 26/07/2026** : elles restent lues au plus strict, sans
   confirmation extérieure à venir (§ 6).
5. le **poste unique** est un point de défaillance.

---

## 3. Ce qui vient de tomber : un audit externe, verdict NO GO

Le logiciel a été soumis à un audit externe (paquet produit par
`node outils/paquet-audit.mjs`, accompagné de `docs/BRIEF-AUDITEUR-EXTERNE.md`). **Le verdict
est NO GO, et le rapport est sévère.**

**C'est une bonne nouvelle, et il faut le dire ainsi.** Un audit qui trouve n'a pas échoué :
il a fait son travail avant qu'un inspecteur ne le fasse. Le projet a déjà encaissé deux
verdicts NO GO (15/07 et 20/07) ; chacun a rendu le logiciel nettement meilleur. Ce n'est pas
un accident de parcours, c'est le parcours.

Ta mission : **transformer ce rapport en travail**, sans en perdre une ligne et sans en
avaler une seule les yeux fermés.

---

## 4. LA MÉTHODE — c'est le cœur de ce document

### 4.1 La leçon du 22 juillet, à ne surtout pas perdre

Le deuxième audit externe (ChatGPT, 20/07) avait rendu NO GO en exigeant, entre autres, de
**bloquer la recharge d'une machine depuis du fluide récupéré** et d'imposer une table de
traitement inaltérable.

**C'était faux.** Franck, frigoriste de métier, a tranché sur la réalité de l'atelier : on a
parfaitement le droit de remettre dans une machine le fluide qu'on vient d'en tirer — c'est
la conservation par machine d'origine, un geste de maintenance quotidien. Coder l'exigence de
l'audit aurait rendu le logiciel **inutilisable et faux**. Le plan a été refondu
(`docs/PLAN-P0-3-4-CYCLE-MATIERE.md`), et c'est cette version-là qui est en production.

**Conséquence pour toi :** un auditeur externe connaît la sécurité et le droit. Il ne connaît
pas forcément le métier du froid, ni cet atelier, ni ce lycée. **Aucun constat ne se code
avant d'avoir été vérifié.**

### 4.2 Les quatre étapes, dans cet ordre

**① Accuser réception, sans filtrer.** Recense TOUS les constats du rapport, y compris ceux
qui te semblent faux ou hors sujet. Numérote-les. Ne jette rien à ce stade — un constat mal
formulé cache parfois un vrai problème.

**② TIRER chaque constat.** C'est la doctrine du projet, et elle ne souffre pas d'exception :

> **« Une faille se prouve en la TIRANT, pas en la lisant. »**

Pour chacun, écris un script d'attaque dans le dossier de travail temporaire, sur **base
jetable et port jetable**, et exécute-le. Trois verdicts possibles :

- **CONFIRMÉ** — l'attaque réussit. Note l'effet exact observé.
- **RÉFUTÉ** — la garde tient. Note le message de refus exact. *Un audit se trompe :
  c'est arrivé, ce n'est ni rare ni honteux.*
- **HORS SUJET / DÉSACCORD MÉTIER** — le constat est techniquement exact mais demande un
  comportement qui rendrait le logiciel faux ou inutilisable en atelier. **Ne code rien :
  remonte-le à Franck avec l'argument métier.** C'est exactement le cas du cycle matière.

**③ Classer, puis proposer un ordre.** Bloquant pour la mise en service / important /
mineur / désaccord. Cherche les **racines communes** : sur le lot L2, huit attaques venaient
d'une seule cause (les dates n'étaient pas validées comme dates). Un correctif bien placé en
ferme dix.

**④ Corriger, brique par brique.** Une brique = un correctif + son test qui le prouve +
`node outils/lancer-tests.mjs --tout` **TOUT VERT** + un commit. Jamais deux briques dans un
commit. Revue adversariale avant la PR.

### 4.3 Ce qu'il ne faut surtout pas faire

- **Ne pas tout réécrire.** Un verdict NO GO ne condamne pas l'architecture. Les deux
  précédents ont été soldés par des correctifs chirurgicaux, pas par une refonte.
- **Ne pas coder une valeur ou une règle réglementaire NOUVELLE sans la validation de
  Franck.** Règle absolue du projet. Si le rapport dit « le seuil est 5 kg », tu vérifies sur
  le texte primaire, tu proposes, tu attends. Sauf délégation explicite — et dans ce cas,
  trancher **« le plus réglementaire » = jamais moins de contrôles qu'exigé**.
- **Ne pas rouvrir le mode Officiel de ta propre initiative.** Le visa T3 (relecture par un
  organisme agréé) a été abandonné le 26/07/2026 : un organisme agréé ne rend pas d'avis sur
  l'outil d'un tiers. La réouverture est désormais gatée par la réunion de trois choses —
  décision écrite de l'établissement, pilote mené en parallèle sans écart, risques résiduels
  acceptés nommément (`docs/NOTE-DECISION-ETABLISSEMENT.md` §4, `docs/REGISTRE-DES-
  ARBITRAGES.md:481`). Si le rapport recommande la réouverture, cela ne réunit pas ces trois
  choses : on le consigne et on le remonte à Franck.
- **Ne pas se précipiter sur le premier constat.** L'inventaire complet d'abord : c'est lui
  qui révèle les racines communes.

---

## 5. Les règles d'or du dépôt (elles ont toutes été payées cher)

- **JAMAIS toucher au `data/` réel.** Toute vérification dynamique se fait sur un **port
  jetable** et une base jetable (`IWF_CHEMIN_BASE`), jamais le port 2011. Corps des requêtes
  API : `{ params: { ... } }`.
- **Parité STRICTE `server/api.js` ↔ `v8/js/data/demo-store.js`.** Tout correctif se pose des
  **deux** côtés, avec le **même message**. `test-contrat.mjs` casse à la moindre divergence.
  Un module pur du front réutilisé côté serveur est recopié en littéral, avec un test de
  parité dédié.
- **Migrations** : registre `server/migrations.js`, dernière = **36** au 26/07/2026 (elle
  était à 35 le jour où ces lignes ont été écrites — se relit dans le registre, jamais de
  mémoire). Une migration est
  **IMMUABLE** — jamais de retouche d'une migration existante. Triggers WORM recréés à chaque
  migration qui touche leurs tables ; `PRAGMA recursive_triggers = ON` obligatoire.
- **Empreintes** (`hash-mouvement.js`) : v1 **figée à jamais**. Jamais de recalcul rétroactif.
- **Commits multi-lignes** via `git commit -F fichier`, jamais de here-string.
- **Vérification navigateur** sur un port NEUF à chaque fois (cache des modules ES).
- **PR pour la relecture de Franck** ; tu peux fusionner toi-même avec `gh pr merge` s'il te
  l'a dit.

### Deux principes qui expliquent la plupart des arbitrages

- **On n'empêche jamais d'enregistrer la réalité.** Un retard, une clôture tardive, une
  surcharge de réemploi sont **signalés**, jamais bloqués. Un registre qui refuse la réalité
  pousse à tenir un cahier à côté — c'est précisément ce qu'on veut supprimer. *Si le rapport
  exige un blocage dur là où le logiciel signale, pose la question à Franck avant de coder.*
- **Le doute retire l'allègement, jamais l'obligation.** Une donnée illisible ou absente fait
  retomber sur le régime le plus strict.

---

## 6. Ce qui est gaté par Franck (ne pas décider à sa place)

- **Réouverture du mode Officiel** — attend la réunion des trois choses qui remplacent le
  visa T3 (abandonné le 26/07/2026, organisme agréé) : décision écrite de l'établissement,
  pilote mené en parallèle sans écart, risques résiduels acceptés nommément
  (`docs/NOTE-DECISION-ETABLISSEMENT.md` §4). Le parcours est prêt :
  `node outils/repetition-generale-officiel.mjs` le rejoue verrou ouvert dans une copie
  (41 vérifications vertes) sans jamais toucher au verrou de production.
- **T3 abandonné le 26/07/2026** — un organisme agréé délivre des attestations de capacité,
  il ne rend pas d'avis sur l'outil d'un tiers ; le dossier préparé
  (`docs/T3-DOSSIER-RELECTURE-EXTERNE.md`) ne sera pas envoyé. Voir
  `docs/NOTE-DECISION-ETABLISSEMENT.md` §4.
- **P0-9** — la v7 étant abandonnée, désactiver le déploiement Apps Script
  (`docs/P0-9-REVOCATION-CLES-V7.md` §0).
- **Catalogue de fluides lot 2** — `outils/semer-catalogue-fluides.mjs` (essai à blanc par
  défaut). ⚠️ le champ `statutReglementaire` a été **déduit, pas dicté** : à relire avant tout
  semis réel.
- **Fusion des stores (lot L7)** — seulement après la simulation d'audit de fin août : la
  parité serveur/démo est aujourd'hui l'oracle de vérification, on ne jette pas l'instrument
  de mesure avant la mesure.

---

## 7. LE RAPPORT D'AUDIT

> **Colle le rapport intégral ci-dessous, tel quel, sans le résumer.**
> S'il est long, colle-le en plusieurs messages : attends de l'avoir en entier avant de
> commencer l'inventaire du §4.2 ①.

```
[ RAPPORT D'AUDIT À COLLER ICI ]
```

---

## 8. Ce que je veux de toi, dans l'ordre

1. **L'inventaire** de tous les constats, numérotés, sans filtre ni jugement.
2. **Le tir** de chacun, en bac à sable, avec le verdict CONFIRMÉ / RÉFUTÉ / DÉSACCORD
   MÉTIER et la trace d'exécution.
3. **Une synthèse honnête** : combien de constats tiennent réellement, quelles racines
   communes, et — s'il y en a — ce que l'auditeur a manqué ou mal compris.
4. **Un plan de correction** ordonné, avec ce qui est bloquant pour septembre et ce qui ne
   l'est pas.
5. **Puis, et seulement après mon accord sur le plan** : les correctifs, brique par brique,
   filet vert à chaque fois, revue adversariale avant la PR.

Commence par lire les trois documents du §1 et vérifier que `main` est bien vert. Puis
attends le rapport.
