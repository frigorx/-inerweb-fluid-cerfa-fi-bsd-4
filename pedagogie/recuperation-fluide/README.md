# ❄ Récupérer un fluide et le prouver — inerWeb **Édu**

TP de 4 h sur **station de récupération MINIMAX-E**, en rotation sur 3 postes,
avec passerelle vers le registre F-Gas de l'application.

Public visé : **BAC PRO MFER 1re**. Adaptation **CAP IFCA 2e année** fournie.

---

## Ce que c'est

Un élève peut faire tourner une station de récupération sans avoir compris ce
qu'il fait. Il branche, il appuie, la machine aspire, il débranche. À la fin,
il ne sait pas dire **combien** il a récupéré, ni **où c'est écrit**.

C'est le trou que ce TP vise. La notion plantée en début de séance tient en une
phrase, écrite au tableau et jamais effacée :

> **Récupérer, ce n'est pas « vider une machine ».
> C'est déplacer une masse de fluide — et prouver au gramme près où elle est passée.**

Tout le reste en découle : la balance devient un instrument de sécurité et pas un
accessoire, l'écart entre la charge de plaque et la quantité pesée devient le
sujet du TP au lieu d'être une contrariété, et le registre cesse d'être de la
paperasse ajoutée après coup.

### La séance ne commence pas par une procédure

Elle commence par **20 minutes de notice, sans outil**. Les élèves cherchent
quatre informations dans le manuel constructeur — dont la liste des fluides
admis. La question qui suit est celle qui structure la séance :

> *Peut-on récupérer du R32 avec cette machine ?*

La notice en atelier (révision 2008) ne liste que des fluides **A1** et interdit
explicitement les gaz inflammables. Or des versions plus récentes de la même
machine sont annoncées compatibles **A1 / A2 / A2L**. La bonne réponse n'est donc
pas une réponse apprise : c'est **« je lis la plaque et la notice de MA machine »**.
Un élève qui récite est en dessous d'un élève qui va vérifier.

### Les trois postes

Trois stations disponibles à l'atelier, trois trinômes, rotation toutes les 50 min.
Rôles tournants : **opérateur · sécurité/notice · scribe**. Seul le rôle
« sécurité/notice » a le droit de dire STOP — c'est un pouvoir, on le lui dit.

| Poste | Objet | Ce qu'il fait sentir |
|---|---|---|
| **A** | Récupération en phase vapeur | Le bruit du compresseur quand la vanne bleue est trop ouverte |
| **B** | Vidange de la station, gaz incondensables | L'ordre imposé vanne → arrêt → inverseur, et pourquoi le pressostat coupe sinon |
| **C** | Pesée, étiquetage, registre, CERFA | Qu'une manipulation non écrite n'existe plus une fois les flexibles rangés |

Le poste C est celui qui relie le TP au reste du dépôt : l'élève saisit son
mouvement dans **inerWeb Fluide en mode Formation** (type
`RECUPERATION_MAINTENANCE`), avec pesée avant / pesée après, photo de la pesée en
pièce jointe et validation enseignant. Il retrouve ensuite quelle case du
**cadre 4 du CERFA 15497\*04** son mouvement alimente, et pourquoi ce n'est pas
la case « Démantèlement ».

Filigrane « DÉMO / FORMATION » obligatoire : l'élève s'entraîne sur le vrai
formulaire sans jamais pouvoir produire une pièce opposable.

---

## Les fichiers

| Fichier | Rôle |
|---|---|
| `TP-RECUPERATION.md` | Le TP complet, 9 sections, **corrigé inclus** (section 9). Document de référence. |
| `FICHE-SEANCE.md` | Déroulé minute par minute, préparation de la veille, incidents prévisibles, **plan B si une seule station fonctionne** |
| `TP-recuperation-MINIMAX-E.docx` | **Généré.** Version Word imprimable du TP : sujet élève (11 pages A4) puis corrigé enseignant sur page séparée |
| `FICHE-SEANCE-recuperation.docx` | **Généré.** Version Word de la fiche de séance (5 pages A4) |
| `tp.html` | **À imprimer.** Même contenu que le `.docx`, version navigateur |
| `atelier-vannes.html` · `atelier-vannes.js` | Drill auto-corrigé : deux remises en ordre (mise en route, vidange) et dix pièges en vrai/faux. 10 min, en fin de séance ou à la maison. |
| `outils/generer-docx.js` | Construit les deux `.docx` |
| `outils/schema-raccordement.png` | Schéma inséré dans le `.docx`, rendu depuis le SVG de `tp.html` |

### Impression

**Word** — `TP-recuperation-MINIMAX-E.docx` : A4 portrait, marges 2 cm, Calibri
14 pt, interligne 1,5, en-tête inerWeb Édu et pied de page numéroté sur chaque
page. Le corrigé commence page 8, après un saut de page forcé : **imprimer les
pages 1 à 7 pour les élèves.**

**Navigateur** — `tp.html` → Ctrl+P. Même découpage : le corrigé est sur une page
séparée par un saut de page forcé.

### Régénérer les .docx

Les deux `.docx` sont **générés**. Ne pas les éditer à la main : la modification
serait perdue à la génération suivante. Le contenu de référence est
`TP-RECUPERATION.md` et `FICHE-SEANCE.md`.

```bash
npm install docx
node outils/generer-docx.js
```

### Utilisation du drill

Ouvrir `atelier-vannes.html` dans un navigateur. Rien à installer, aucun compte,
aucune connexion. Rien n'est enregistré : recharger la page remet le score à
zéro. C'est volontaire — l'atelier sert à s'entraîner, pas à évaluer.

---

## D'où vient le contenu

**Origine — à lire avant toute réutilisation.**

- **Aucun document existant de la base pédagogique n'a été restitué ici.** Cette
  session n'a pas accès au dossier indexé habituel ; la recherche a porté sur le
  dépôt, qui ne contenait rien sur la récupération de fluide. Le module est donc
  une **création**, pas une reprise. Si un TP maison sur ce sujet existe déjà
  dans la base locale, c'est lui qui prime : ce module doit alors être fusionné
  avec, pas empilé à côté.

- **Les valeurs techniques** (38,5 bar au pressostat HP · 80 % de remplissage
  maximal · refroidir la bouteille au-delà de 31,5 bar · bouteilles éprouvées à
  41 bar minimum · 2,5 kg de liquide minimum pour la méthode de refroidissement ·
  7 kg minimum pour la méthode par surpression · 17 / 50 / 240 kg/h ·
  0,3 à 0,35 bar de tolérance pour la purge des incondensables · 230 V, 380 W,
  11 kg) proviennent de la **notice constructeur MINIMAX-E**, Advanced Test
  Products Europe, révision 3 (2008), diffusée par ERM Automatismes.

  > **Point de licence.** La page de garde de ce manuel en interdit la
  > reproduction sans autorisation écrite. **Aucun passage n'en est reproduit
  > ici** : seules des données techniques sont citées, reformulées, et la source
  > est nommée. Avant toute diffusion de ce module hors de l'établissement,
  > vérifier ce point avec ERM ou ATP Europe.

- **Le déroulé, les questions, le corrigé, la grille et les pièges** sont rédigés
  pour ce parcours.

- **Les valeurs numériques de l'exercice** (charge de plaque 1,20 kg, tare 12,000 kg,
  masses brutes 13,400 et 14,550 kg) sont un **jeu de données de référence**
  construit pour que le calcul tombe juste et qu'un écart de 50 g apparaisse. Elles
  sont à remplacer par les mesures réelles de la séance.

- **La masse volumique du liquide R134a** (≈ 1 206 kg/m³ à 25 °C) est donnée
  comme **donnée d'exercice**, à confirmer sur la fiche de données de sécurité du
  fournisseur. C'est d'ailleurs ce que le TP demande à l'élève de faire.

- **Aucun niveau de vide n'est donné.** C'est un choix : la question Q6 exige une
  valeur **citée avec sa source**, et une réponse sans source est comptée « En
  cours », même juste. On ne récite pas un niveau de vide, on va le chercher dans
  la notice et dans le texte réglementaire en vigueur.

### Sources consultées

| Source | Usage |
|---|---|
| [Manuel d'utilisation MINIMAX-E](https://www.erm-automatismes.com/d000088-manuel-d-utilisation.pdf) — ATP Europe, rév. 3, 2008 | Données techniques, procédures, sécurité HP, incondensables |
| [Sommaire des modes opératoires ERM](https://www.erm-automatismes.com/d0002EA-sommaire-des-modes-operatoires.pdf) | Positionnement du TP : après les procédures n° 1, 2 et 4 ; couvre les n° 8, 9 et 10 |
| [Laboratoire Froid & Climatisation ERM](https://www.erm-automatismes.com/dl/labo/Labo-FroidClimatisation.pdf) | Configuration d'atelier de référence : station tous fluides à pressostat HP, balance de charge, pompe à vide 40 l/min, bouteilles R134A / R404A / R410A neuves et de récupération 12 L |
| NF EN 378 / ASHRAE 34 | Classes de sécurité A1 · A2L · A3 |
| Règlement (UE) 517/2014 et (UE) 2024/573 ; code de l'environnement art. R.543-75 et suiv. ; arrêté du 29 février 2016 | Interdiction de rejet, attestations d'aptitude, traçabilité |
| `docs/SPEC-V8.md` de ce dépôt | Types de mouvement, correspondance CERFA cadre 4, alertes bloquantes, mode Formation |

### Pas de photos

Aucune photographie de matériel n'est fournie : celles de la notice constructeur
et des catalogues sont soumises au droit d'auteur. Pour illustrer, photographier
les stations de l'atelier — pas de question de droits, et les élèves reconnaissent
leur propre plateau technique.

---

## Compétences visées

**BAC PRO MFER** — `C4 Organiser et sécuriser` ; `C6 Réaliser de manière
éco-responsable` ; `C9 Maintenance préventive` ; `C11 Consigner` ;
`C12 Communiquer`.
Savoirs : `S1 Environnement de travail` ; `S2 Énergie et environnement` ;
`S6 Procédures d'intervention` ; `S7 Qualité et sécurité`.

**CAP IFCA** (version allégée) — `C2.4 Sécuriser` ; `C4.2 Manipuler le fluide` ;
`C4.5 Mesurer` ; `C3.8 Déchets` ; `C1.1 Compléter et transmettre`.

**Attestation d'aptitude.** Le TP entraîne aux gestes évalués en catégorie I
(MFER) et en catégorie II, charge < 2 kg (IFCA), au sens de l'arrêté du
29 février 2016. **Il ne délivre aucune attestation.**

---

## Sécurité — ce que le module ne transige pas

- Lunettes et gants pendant toute la manipulation, **y compris pour dévisser un
  flexible qu'on croit vide**.
- Le pressostat HP ne se réarme jamais « pour voir » : une coupure est un signal,
  on cherche la cause avant de réarmer.
- 80 % de remplissage maximal en liquide, sans exception liée à la température de
  l'atelier.
- Aucun fluide A2L ou A3 sur ces postes sans validation écrite de l'enseignant,
  après lecture de la plaque et de la notice de la machine concernée.
- Rejet volontaire à l'atmosphère : **éliminatoire de séance**, avec reprise
  obligatoire et sans note punitive.

---

## Accessibilité et charte

- Calibri 14 pt minimum à l'impression, corps 18 px à l'écran, interligne 1,55,
  **alignement à gauche**.
- Titres Trebuchet MS bold. Bleu `#1b3a63`, orange `#ff6b35`.
- **Aucun mode sombre** : les feuilles de style ne contiennent volontairement
  aucune règle `prefers-color-scheme`.
- Adaptations TDAH / DYS : feuille de relevés sur une page, une ligne par mesure,
  questions posées au moment du geste et pas toutes à la fin, rôle de scribe
  tournant, une consigne affichée par poste.
- Côté technique : politique de sécurité déclarée `default-src 'none'`, aucun
  script en ligne, aucune requête sortante, aucun stockage.

---

## Licence

Ce module suit la licence du dépôt — **PolyForm Noncommercial 1.0.0**, libre et
gratuite pour tout établissement d'enseignement. Voir la réserve ci-dessus sur
les données issues de la notice constructeur avant toute diffusion externe.

---

*inerWeb Édu — F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO*
