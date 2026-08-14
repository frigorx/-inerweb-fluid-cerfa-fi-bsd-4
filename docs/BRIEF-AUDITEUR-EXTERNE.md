# Dossier d'audit — inerWeb Fluide v8

> **À lire avant le code.** Ce document dit ce qu'est le logiciel, ce qu'on attend de vous,
> ce qui a déjà été vérifié et par quel moyen, et ce qui reste ouvert. Il est écrit pour
> être lu aussi bien par un expert humain que par un modèle de langue à qui l'on demande
> d'incarner ce rôle.
>
> Le code source intégral suit, dans les volumes `CODE-01.txt` et suivants
> (`01-SOMMAIRE.md` dit où trouver quoi).

---

## 1. Ce qu'est ce logiciel, en cinq lignes

**inerWeb Fluide** tient le **registre réglementaire de traçabilité des fluides
frigorigènes** d'un lycée professionnel (filière froid et climatisation) : équipements,
bouteilles, interventions, contrôles d'étanchéité, personnel autorisé, bilan matière,
déclaration annuelle. Il produit les fiches **CERFA 15497\*04**.

Il tourne **entièrement en local**, sur un poste de l'établissement. Aucune donnée ne part
vers un service extérieur : ni hébergeur, ni sous-traitant, ni transfert. Zéro dépendance
de production (Node.js seul, base SQLite par `node:sqlite`).

**L'objectif visé est celui d'un registre officiel UNIQUE** — sans registre papier tenu en
parallèle. C'est le niveau d'exigence le plus élevé, et c'est la raison de cet audit.

---

## 2. Ce qu'on vous demande

Quatre lectures, dans cet ordre d'importance. Si vous n'avez le temps que d'une seule,
prenez la première.

### A. Intégrité du registre (le cœur)

Un registre opposable ne se juge pas à ce qu'il sait faire, mais à **ce qu'il refuse**.
Question centrale : **peut-on faire disparaître, modifier ou fabriquer une écriture sans
que le logiciel le voie ?**

Points d'entrée : `server/api.js` (`validerMouvement`, `annulerParContreEcriture`,
`importerJSON`, `verifierChaineMouvements`), `server/hash-mouvement.js`,
`server/migrations.js` (déclencheurs WORM), `server/db.js` (journal chaîné).

### B. Sécurité applicative

Authentification, rôles, exposition réseau, service de fichiers, sauvegarde/restauration.
Points d'entrée : `server/serveur.js`, `server/comptes.js`, `server/sessions.js`,
`server/routes-comptes.js`, `server/restauration.js`, `server/chiffrement.js`.

### C. Protection des données

Ce qui est enregistré sur des personnes (dont des **élèves mineurs**), pourquoi, combien de
temps, et comment on l'efface ou on le protège.
Points d'entrée : `RGPD.md`, `server/coffre-identites.js`, `v8/js/data/export-personne.js`.

### D. Conformité réglementaire F-Gas

Les seuils, fréquences et règles d'aptitude sont-ils les bons ?
Points d'entrée : `docs/TABLE-REGLEMENTAIRE-FLUIDES.md`,
`v8/js/data/reglementation-fluides.js`, `v8/js/data/habilitations.js`,
`docs/CONDITIONS-BLOCANTES-OFFICIEL.md`.

> ⚠️ Sur ce dernier point, une relecture par un **organisme agréé fluides frigorigènes** est
> engagée en parallèle (dossier `docs/T3-DOSSIER-RELECTURE-EXTERNE.md`, 11 questions
> écrites). Si vous n'êtes pas de ce métier, dites-le et concentrez-vous sur A, B et C —
> un avis réglementaire non qualifié serait pire qu'aucun avis.

---

## 3. Comment le logiciel est bâti

### Deux modes — séparation DOCUMENTAIRE, registre UNIQUE

⚠️ **Lisez ce paragraphe avant tout le reste : sa version précédente a induit en erreur
l'audit du 25/07/2026, qui en a tiré son constat le plus lourd.**

**Il n'y a qu'UN registre.** Le mode ne partitionne pas les données : il qualifie le
DOCUMENT. Et c'est voulu, parce que la matière est réelle.

Ici, « Formation » ne veut pas dire « bac à sable ». Les élèves interviennent sur le parc
RÉEL de l'atelier, avec du VRAI fluide dans de VRAIES bouteilles. Quand un élève charge
2 kg, la bouteille perd réellement 2 kg : l'obligation F-Gas porte sur la MATIÈRE, elle
doit donc être tracée. Une fiche Formation est une fiche **non opposable** portant sur une
intervention **réelle**. Le bac à sable, lui, existe et porte un autre nom : c'est le mode
**Démo** (store en mémoire, monde fictif, aucune donnée réelle nulle part).

| | **Démo** | **Formation** | **Officiel** |
|---|---|---|---|
| Nature | monde fictif | registre RÉEL, document non opposable | registre RÉEL, document opposable |
| Pour qui | découverte, démonstration | les élèves, sous validation enseignant | le registre de l'établissement |
| Matière | aucune | elle bouge, **et c'est le but** | elle bouge |
| Documents | aucun | filigrane, numérotation `FORM-`, jamais d'apparence officielle | fiche CERFA |
| Blocages | sans objet | **aucun** — on n'empêche jamais d'enregistrer la réalité | liste de conditions **bloquantes** |
| Écritures | volatiles | brouillons modifiables ; **validées : signées, scellées, chaînées** | idem |

**Point souvent mal lu** : une écriture Formation VALIDÉE n'est pas modifiable. Elle porte
une empreinte chaînée et sa suppression est refusée (« correction uniquement par
contre-écriture »), exactement comme une écriture officielle. Le logiciel est donc plus
strict que ce que ce tableau annonçait auparavant, jamais plus laxiste.

**Ce qui garde le mode Formation** n'est pas un cloisonnement de données, c'est la
validation : `validerMouvement` est réservé à l'enseignant, et la saisie d'un
inventaire physique l'est aussi. Un élève est arrêté **deux fois** : au niveau de la
session, en **HTTP 403** (« Action « validerMouvement » réservée aux rôles habilités
(REFERENT, ENSEIGNANT, ADMIN) — rôle courant : ELEVE. ») ; et au niveau métier, si
l'on désigne une fiche d'élève comme validateur, en **HTTP 400** (« Validation
refusée : un élève ne peut pas valider une écriture »).

Si vous jugez malgré tout que deux univers de données séparés s'imposent, **dites-le en
traitant d'abord ce cas** : le gaz part réellement dans la machine pendant le TP, la fiche
Formation est rendue inerte, le professeur saisit l'inventaire physique du mois. Que se
passe-t-il ? (Réponse mesurée sur banc : écart de balance non justifié, alerte critique, et
blocage du mode Officiel — voir `docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md` §3, constat
P0-02, et le banc joint `docs/banc-contrefactuel-P0-02.mjs`, qui rejoue la mesure.)

Le mode Officiel est **actuellement FERMÉ** par un verrou (`VERROU_LIVRAISON = true`,
`v8/js/data/blocage-officiel.js` et son miroir serveur), volontairement **non configurable
par l'environnement** : une variable d'environnement, c'est une réouverture par accident.
Il sera rouvert après avis externe.

### Le registre est en écriture unique (WORM)

Une écriture validée est **scellée** : rang de validation, empreinte SHA-256 de son contenu,
**chaînée** à l'empreinte de la précédente. Elle n'est ni modifiable ni supprimable — les
déclencheurs SQLite le refusent, `PRAGMA recursive_triggers` compris (sinon `REPLACE INTO`
contournerait tout). La seule correction possible est la **contre-écriture** : on n'efface
pas, on écrit l'inverse.

Le **journal d'audit** est chaîné selon le même principe, et lui aussi protégé par
déclencheurs.

### Deux implémentations, une seule vérité

Le logiciel existe en deux exemplaires du même contrat (`v8/js/data/contrat.js`, 96 méthodes) :
- `server/api.js` — le vrai registre, base SQLite ;
- `v8/js/data/demo-store.js` — le monde de démonstration, en mémoire, pour les élèves.

**C'est volontaire et c'est un instrument de vérification** : une suite (`test-contrat.mjs`)
joue le même scénario contre les deux et casse à la moindre divergence. Un correctif posé
d'un seul côté se voit immédiatement. Les modules de règles purs (dates, aptitudes,
équipement, réglementation) sont recopiés en littéral côté serveur, avec un test de parité
dédié pour chacun.

### Ce qui tourne sur le poste

Node.js ≥ 22, `node:sqlite`, **zéro dépendance de production**. Le dépôt embarque **quatre
fichiers tiers minifiés** (2,25 Mio), pour **trois projets** : PDF.js (afficher le CERFA),
pdf-lib (le remplir), qrcodejs (les étiquettes QR des machines et bouteilles, hors ligne).
Aucun ne touche à la base, au réseau ni aux droits. Ils sont nommés au `01-SOMMAIRE.md` et
inventoriés — version lisible, licence RÉELLE, taille, fichier par fichier — dans
`LICENCES-TIERCES.md`.

---

## 4. Ce qui a déjà été vérifié — et par quel moyen

Nous ne demandons pas qu'on nous croie sur parole. Tout ce qui suit est **exécutable**.

### Le filet de tests

```
node outils/lancer-tests.mjs --tout
```

**139 exécutions, tout vert**, en deux minutes environ, sans aucune dépendance à installer.
Chaque suite travaille sur une base jetable ; aucune ne touche les données réelles.

### La suite de sécurité négative

```
node server/test-securite-negative.mjs
```

**207 attaques et preuves.** C'est le fichier à lire en premier si vous voulez savoir ce que
le logiciel refuse : sans session, jeton forgé, requête inter-site, rôle injecté dans le
corps, SQL direct sur la base (`UPDATE`, `DELETE`, `REPLACE INTO`), import forgé, fichiers
privés demandés au serveur web. Chaque cas est **tiré**, pas décrit.

### Les audits déjà passés

> ⚠️ **Deux campagnes de relecture distinctes** figurent ci-dessous, avec des chiffres
> différents. Ce n'est pas une contradiction : ce sont **deux campagnes, à deux dates, sur
> deux lots de travail**. Elles sont donc datées et nommées, et le mémoire les cite avec les
> mêmes chiffres.

- **Trois audits techniques externes** (juillet 2026), dont celui du **25/07/2026** auquel ce
  paquet répond : voir `docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md`, qui expose constat par
  constat ce qui est corrigé, ce qui est réfuté, ce qui est assumé — et le seul point de
  désaccord de fond. La correspondance entre **les 31 numéros du rapport** et nos codes
  internes `A01…A31` est donnée par `docs/TABLE-CONSTATS-AUDIT-2026-07-25.md` : c'est la
  **seule pièce** qui raccorde les deux numérotations, à ouvrir dès qu'un numéro de constat
  vous intrigue.
- **La campagne d'attaques du lot L2** (25/07/2026) : 190 scénarios inventoriés par 8
  relecteurs, 36 candidats critiques, **26 attaques confirmées en les exécutant** par 10
  relecteurs, toutes corrigées. Ce qui a tenu d'emblée : gardes de rôle sur les mutations,
  garde anti-CSRF et anti-rebinding DNS, zip slip à la restauration, traversée de chemin
  sous toutes ses formes. (Détail : `CHANGELOG.md`, section « L2 ».)
- **La revue adversariale du lot L2** (25/07/2026, 5 relecteurs indépendants chargés de
  *réfuter* les correctifs de ce lot) : **3 bloquants et 8 constats**, tous corrigés — dont
  une régression que le correctif lui-même avait introduite, et trois tests qui **ne
  pouvaient pas échouer** (donc ne prouvaient rien).
- **Les revues adversariales des lots B1, B2 et B3** (25-26/07/2026, une revue par lot, plus
  une passe de vérification finale) : **1 bloquant, 15 constats importants et 19 mineurs** au
  total, la passe finale ayant **rouvert** l'un des importants et ajouté un mineur. Ce sont
  ces trois lots que le mémoire dissèque en **§5** — la section où nous publions ce que nos
  propres correctifs ont cassé. (Détail par lot : `CHANGELOG.md`, sections « B1 », « B2 »,
  « B3 ».)

### Quelques défenses non évidentes, si vous voulez chercher là où c'est intéressant

- Le **PRP est figé dans l'écriture** au moment de la validation : corriger le référentiel
  ensuite ne réécrit jamais le passé ni les CERFA déjà émis.
- L'empreinte d'une écriture est **versionnée** : la version 1 est figée à jamais, sur des
  valeurs connues inscrites dans les tests.
- Le PDF final officiel est **conservé** avec ses témoins (`.sha256`, manifeste) ; le dossier
  d'audit sert le PDF conservé, **jamais un PDF régénéré**.
- Une écriture passée à `ANNULE` sans contre-écriture qui la désigne est **dénoncée** : le
  statut est hors empreinte (sinon toute annulation casserait la chaîne), donc la chaîne
  seule ne suffisait pas à la voir.
- Un import qui prétend porter un historique « antérieur au scellement » est **refusé** sur
  un poste qui a déjà scellé — et la borne qui s'en souvient vit **hors de la base**, parce
  qu'une protection contre l'écrasement du registre ne peut pas vivre dans le registre.

---

## 5. Ce qui reste ouvert — dit avant que vous le trouviez

Un dossier qui ne dirait que du bien mériterait la méfiance. Voici ce que nous savons :

1. **Le témoin d'intégrité du journal d'audit se recalcule.** Il voyage avec le fichier
   d'export et l'algorithme est dans le code — qui est diffusé. Il arrête une purge faite à
   la main ; il n'arrête pas quelqu'un qui régénère le témoin. La parade identifiée est de
   confronter le journal importé au **témoin de scellement externe quotidien**, qui vit hors
   du fichier. Non fait.
2. **Le modèle de menace assumé s'arrête à l'accès disque.** Qui a la main sur le fichier de
   base peut le remplacer. Les défenses visent le canal applicatif (interface, import,
   restauration), celui qui ne laisse pas de trace visible. Un poste compromis ne l'est pas.
3. **Le mode Officiel n'a jamais tourné en production.** Il a été ouvert quelques jours en
   juillet 2026, puis refermé. Son parcours complet est rejoué régulièrement (41
   vérifications vertes, `outils/repetition-generale-officiel.mjs`), mais jamais en usage réel.
4. **Certaines valeurs réglementaires attendent une confirmation externe.** Elles sont codées
   de façon délibérément conservatrice — *jamais moins de contrôles qu'exigé* — et listées
   dans `docs/T3-DOSSIER-RELECTURE-EXTERNE.md`.
5. **Le poste unique est un point de défaillance.** La sauvegarde est automatique, chiffrable
   et vérifiée, mais la restauration reste un geste humain.

---

## 6. Deux principes qui expliquent la plupart des choix

Ils reviennent partout dans le code, et sans eux certaines décisions sembleraient molles :

- **On n'empêche jamais d'enregistrer la réalité.** Un contrôle en retard, une clôture
  tardive, une surcharge de réemploi sont **signalés**, jamais bloqués. Un registre qui
  refuse la réalité pousse à tenir un cahier à côté — et c'est précisément ce qu'on veut
  supprimer.
- **Le doute retire l'allègement, jamais l'obligation.** Une donnée illisible ou absente ne
  « passe » pas : elle fait retomber sur le régime le plus strict. Une détection permanente
  déclarée mais non vérifiée depuis un an ne divise plus la fréquence des contrôles.

---

## 7. Les questions précises que nous vous posons

**Intégrité**
1. Voyez-vous un chemin — interface, API, import, restauration, SQL direct — permettant de
   **modifier ou faire disparaître une écriture validée** sans que la vérification
   d'intégrité le signale ?
2. La **contre-écriture** est-elle un mécanisme de correction suffisant pour un registre
   opposable, ou attendriez-vous autre chose ?
3. Le **chaînage par empreintes** est-il correctement construit (contenu couvert, ordre,
   ré-amorçage) ?

**Sécurité**
4. L'**authentification** et le modèle de rôles vous paraissent-ils adaptés à un poste
   d'atelier partagé entre un enseignant et des élèves ?
5. Le **service de fichiers** (liste blanche, chemin physique résolu) laisse-t-il sortir
   quelque chose qui ne devrait pas sortir ?
6. La **sauvegarde chiffrée** et sa restauration : voyez-vous une faiblesse dans la
   dérivation de clé, le chiffrement ou la procédure de bascule ?

**Protection des données**
7. Les données enregistrées sur les **élèves** vous semblent-elles **minimisées** ?
8. Le **coffre des identités** (chiffrement de l'identité d'un élève parti, pseudonyme
   affiché, réouverture motivée et journalisée) est-il une réponse acceptable, sachant qu'une
   destruction pure détruirait la capacité de répondre à une demande légale ultérieure ?
9. Une écriture réglementaire scellée est **ineffaçable**. Comment formuleriez-vous la
   réponse à une personne exerçant son droit à l'effacement ?

**Qualité et tenue dans le temps**
10. La **double implémentation** (serveur / démonstration) vous paraît-elle un instrument de
    vérification ou une dette qui finira par diverger ?
11. Que testeriez-vous que nous ne testons pas ?

**La question d'ensemble**
12. **Voyez-vous un obstacle à ce que ce logiciel tienne lieu de registre unique**, sans
    tenue papier en parallèle ?

---

## 8. Comment lire le code sans s'y perdre

- `docs/CARTE-CODE.md` — **l'architecture en une page**. À lire en premier, elle remplace la
  plupart des explorations.
- `CHANGELOG.md` — l'historique, incrément par incrément, le plus récent en tête. Chaque
  entrée dit *pourquoi*, pas seulement *quoi*.
- `v8/js/data/contrat.js` — la surface complète du logiciel : 96 méthodes documentées.
- `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` — la liste exacte de ce qui refuse une validation
  officielle, et à quel moment.
- `docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md` — le mémoire en réponse à l'audit du 25/07, et
  `docs/TABLE-CONSTATS-AUDIT-2026-07-25.md`, son annexe : **les 31 constats du rapport**,
  chacun avec son numéro d'origine, notre code interne `A01…A31`, le verdict et la section
  du mémoire où le lire. ⚠️ Ne confondez pas ces numéros avec ceux de
  `docs/CONSTATS-AUDIT-EXTERNE-2026-07-20.md`, qui voyage aussi dans les documents de
  travail : il emploie des codes `P0-x` / `P1-x` de l'audit **précédent**, qui désignent
  tout autre chose. La table le dit et donne la correspondance.
- `LICENCES-TIERCES.md` — les quatre fichiers tiers embarqués, leur licence RÉELLE relue
  dans le fichier, et ce que le fichier ne prouve pas.

**Sur la forme.** Le code est écrit et commenté **en français**, y compris les noms de
variables : le logiciel est maintenu par un enseignant de la filière, pas par une équipe de
développeurs, et il doit rester lisible par lui dans cinq ans. Les commentaires expliquent
souvent *pourquoi* une garde existe, avec l'attaque qui l'a motivée — c'est délibéré, cette
mémoire-là est la première à se perdre.

---

## 9. Contact

Franck Henninot — enseignant froid et climatisation, LP Antoine Vidal, Nîmes.
Auteur et utilisateur du logiciel. Licence PolyForm Noncommercial (voir `LICENSE`).
