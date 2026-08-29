# ❄ inerWeb **Édu** — Dossier professeur

**Enregistreur autonome de températures connecté — 6 voies**
Module transversal · 16 heures · 4 modules de 4 h, chacun sécable en 2 × 2 h

*par F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO*

---

## Section 1 — En-tête

| | |
|---|---|
| **Public de référence** | 10 élèves, 5 binômes, 6 appareils (5 élèves + 1 professeur) |
| **Filières visées** | volontairement neutre — adaptations en [`07_Adaptations_par_filiere.md`](07_Adaptations_par_filiere.md) |
| **Durée** | 16 h : 4 modules de 4 h, chacun sécable en 2 séances de 2 h |
| **Modalité** | binôme pour la fabrication, individuel pour l'exploitation |
| **Prérequis enseignant** | avoir monté l'appareil professeur soi-même — voir l'avertissement ci-dessous |
| **Support** | [`site/index.html`](site/index.html) hors ligne · [`site/exploitation.html`](site/exploitation.html) |
| **Budget** | ≈ 45 € par appareil terminé · ≈ 320 à 370 € de lancement pour la classe |

> ### ⚠ Avertissement à lire avant de programmer ce module
> **Aucun prototype n'a encore été monté, et aucun de ces onze programmes n'a
> été téléversé dans un vrai ESP32-C3.** Les calculs sont vérifiés, la logique
> du firmware est exécutée et contrôlée par `node outils/verifier-logique.mjs`,
> le schéma est cohérent broche à broche avec le code — mais **« vérifié »
> n'est pas « éprouvé »**.
>
> Montez l'appareil professeur **avant** la première séance. Comptez deux
> soirées. C'est exactement à cela qu'il sert, et c'est ce qui fera tomber les
> trois points bloquants de [`POINTS-OUVERTS.md`](POINTS-OUVERTS.md).

---

## Section 2 — Objectifs pédagogiques

Formulés du point de vue de l'élève, avec des verbes observables. Les cinq sont
évalués (grille en [`08_Evaluation.md`](08_Evaluation.md)).

1. **Je mesure** la résistance d'une NTC à trois températures et j'**énonce** le
   sens de variation, sans support.
2. **Je réalise** six ponts diviseurs conformes au schéma et je les **contrôle**
   à l'ohmmètre avant toute mise sous tension.
3. **J'identifie** les trois circuits du bus I²C par leur adresse, et je
   **diagnostique** l'absence de l'un d'eux.
4. **J'étalonne** une voie contre un point fixe et je **justifie** l'écart trouvé.
5. **J'exploite** un enregistrement de démarrage de machine : je **relève** les
   écarts de température et je **conclus** sur le régime atteint.

---

## Section 3 — Prérequis

**Élève** — cochés en début de module 1. Trois cases vides = accompagnement
renforcé, pas exclusion.

- [ ] Je sais me servir d'un multimètre en position ohmmètre.
- [ ] Je sais lire une valeur avec une unité et un préfixe (kΩ, mV).
- [ ] Je sais qu'un circuit électrique se ferme.
- [ ] Je sais utiliser un navigateur.

**Enseignant** — non négociables :

- [ ] J'ai monté l'appareil professeur en entier.
- [ ] J'ai téléversé les onze programmes au moins une fois.
- [ ] J'ai relevé la consommation réelle et corrigé `outils/bilan-energie.mjs`.
- [ ] J'ai percé un boîtier avec le gabarit et corrigé les cotes.
- [ ] J'ai préparé les six sachets de composants, un par binôme, étiquetés.

---

## Section 4 — Matériel du professeur

1. Appareil professeur **terminé et fonctionnel** (× 1) — sert de référence, de
   démonstrateur et de pièce de rechange
2. Six sachets de composants préparés, un par binôme (× 6)
3. Vidéoprojecteur + poste avec `site/index.html` ouvert (× 1)
4. Thermomètre de référence (× 2 minimum)
5. Vase Dewar ou simple bol isotherme + glace pilée (consommable, chaque séance 3B)
6. Voltampèremètre USB (× 1)
7. Alimentation de laboratoire (× 1) — pour les dépannages
8. Jeu de pièces de rechange : 2 ESP32-C3, 3 ADS1115, 1 écran, 10 NTC, 20 résistances

Le détail complet est en [`04_Outillage_et_consommables.md`](04_Outillage_et_consommables.md).

---

## Section 5 — Consignes de sécurité

Ce projet n'emploie ni fluide, ni pression, ni tension dangereuse : **3,3 V et
40 mA**. Les risques réels sont ailleurs, et ils sont réels.

> ### ⚠ Point sécurité — le perçage (module 2A)
> C'est le seul moment vraiment dangereux du module.
> **Lunettes obligatoires pour tout le poste, pas seulement pour celui qui
> perce.** La pièce est **bridée**, jamais tenue à la main : un boîtier ABS qui
> accroche le foret part en toupie et coupe. Cheveux attachés, manches serrées,
> pas de gants sur une perceuse à colonne (un gant s'enroule, une main non).

> ### ⚠ Point sécurité — le fer à souder (module 2B)
> 350 °C. Le fer **retourne à son support à chaque pose**, sans exception : un
> fer posé sur l'établi est une brûlure en attente. Ventilation du poste.
> **Les vapeurs de flux ne se respirent pas** — poste dégagé, fenêtre ouverte.
> Lavage des mains avant la pause : l'étain contient du plomb sur les alliages
> anciens du magasin.

> ### ⚠ Point sécurité — les piles (module 3A)
> Trois piles alcalines en court-circuit débitent plusieurs ampères et
> chauffent. C'est le **seul risque thermique** du projet, et c'est pourquoi le
> fusible F1 existe (§ 8.5 de [`05_Plans_et_schema.md`](05_Plans_et_schema.md)).
> **Aucune pile dans le porte-piles avant que la fiche de contrôle soit visée.**

> ### ⚠ Point sécurité — la mise en service (module 3A)
> **Aucune mise sous tension sans le visa de l'enseignant sur les 19 contrôles.**
> Le contrôle n° 17 (aucune liaison piles ↔ broche 5V) est celui qui autorise
> tout le reste. Il ne se délègue pas.

**Conduite en cas d'incident** : brûlure → eau froide 15 minutes, puis
infirmerie. Projection dans l'œil → rinçage 15 minutes au lave-œil, puis
infirmerie **systématiquement**. Trousse de secours : à localiser et à montrer
au premier cours.

---

## Section 6 — Déroulement des quatre modules

### Le principe qui commande tout : planter la notion avant de la nommer

La notion centrale du module n'est pas « un enregistreur de température ».
C'est :

> **Aucun capteur ne mesure une température. Il traduit.**

Une NTC ne « connaît » pas les degrés : sa résistance change. Le convertisseur
ne connaît pas les volts : il compte des pas. Les degrés n'apparaissent qu'à la
toute fin, dans un calcul. Tant qu'un élève n'a pas vu ça, il croit que le
capteur « donne » la température — et il ne comprendra jamais pourquoi il faut
étalonner.

C'est pour cette raison que la séance 1A commence **sans électronique**, avec
un ohmmètre et une main.

---

### MODULE 1 — Comprendre la chaîne d'acquisition (4 h)

#### 1A — 2 h : le capteur

| Temps | Ce qui se passe | Posture enseignant |
|---:|---|---|
| 0–10 | Mise en situation : on projette une courbe de démarrage de chambre froide (mode démonstration de `exploitation.html`). « Qui a fait ça ? » | on ne répond pas |
| 10–20 | Distribution d'une NTC par binôme. **Aucune consigne** : « décrivez ce que vous avez » | on circule, on ne dit rien |
| 20–40 | Mesure de la résistance à l'ambiante. Report au tableau des 5 valeurs | on fait constater la dispersion entre binômes |
| 40–60 | La sonde dans la main, la sonde dans l'eau froide. Tableau de mesures | **la question** : « ça monte ou ça descend ? » |
| 60–70 | **Pause obligatoire** | |
| 70–90 | Formalisation : le mot NTC, le coefficient négatif. Tracé point par point de R en fonction de T sur papier millimétré | on impose le tracé à la main |
| 90–110 | Le tableau du § 3.4 des plans est distribué. Comparaison mesure / modèle | on fait dire l'écart, on ne le justifie pas encore |
| 110–120 | Conclusion écrite par l'élève dans son carnet | |

**Résultat attendu, écrit par l'élève lui-même** : *température ↑ → résistance
NTC ↓, et ce n'est pas une droite.*

**Ce qui rate d'habitude** : les élèves annoncent 10 kΩ tout rond et arrêtent de
lire. Faire relever **trois décimales** dès le départ ; c'est ce qui rend la
variation visible quand la main chauffe la sonde.

#### 1B — 2 h : de la résistance à la donnée numérique

| Temps | Ce qui se passe |
|---:|---|
| 0–25 | Le problème posé nu : « un microcontrôleur ne sait pas mesurer une résistance. Il sait mesurer une **tension**. » Comment fait-on ? |
| 25–55 | Montage du pont diviseur **sur platine d'essai**, pas dans le boîtier. Deux résistances, un voltmètre. On fait varier avec la main |
| 55–65 | Pause |
| 65–85 | La planche [`illustrations/pont-diviseur.svg`](illustrations/pont-diviseur.svg) : les trois cas, froid / 25 °C / chaud |
| 85–105 | Le rôle de l'ADS1115 et de l'ESP32, sur la planche de la chaîne. **Reconstitution de la chaîne dans le désordre** (9 étiquettes à remettre en ordre) |
| 105–120 | Trace écrite : la chaîne complète, recopiée |

**L'exercice qui fait la séance** : donner les neuf étiquettes mélangées
(TEMPÉRATURE, NTC, RÉSISTANCE, PONT DIVISEUR, TENSION, ADS1115, VALEUR
NUMÉRIQUE, ESP32, AFFICHAGE) et faire remettre en ordre **sans le support**.
Les erreurs typiques — mettre l'ESP32 avant l'ADS1115, ou faire de la tension la
première étape — disent exactement ce qui n'est pas compris.

---

### MODULE 2 — Réaliser le boîtier (4 h)

#### 2A — 2 h : mécanique et implantation

Détail des huit étapes dans l'onglet **Montage** du site et au § 5 du dossier
élève.

**Le point qui coûte une séance si on le rate** : l'impression du gabarit.
Imprimé avec « Ajuster à la page », il est faux de 3 à 5 %, soit 4 mm sur
120 — et six embases ne rentrent plus. **Vérifier le carré de 50 mm au réglet,
sur chaque exemplaire imprimé**, devant la classe.

**Organisation** : une seule perceuse pour cinq binômes. Le perçage se fait
**en rotation, par binôme, sous surveillance directe**, pendant que les autres
préparent leur traçage. Compter 8 minutes par boîtier.

#### 2B — 2 h : câblage et soudure

| Temps | Ce qui se passe |
|---:|---|
| 0–25 | **Démonstration au vidéoprojecteur** : une soudure faite lentement, commentée geste par geste. Puis une soudure froide, volontaire, pour montrer la différence |
| 25–45 | Chaque élève fait **trois soudures d'entraînement** sur une chute de plaque. Aucune soudure sur le montage avant validation de ces trois-là |
| 45–55 | Pause |
| 55–100 | Câblage des six embases : masse commune en chaîne, puis un fil par broche. Étiquetage immédiat |
| 100–115 | Contrôle de continuité, embase par embase, **par l'autre membre du binôme** |
| 115–120 | Rangement, comptage de l'outillage |

**Le geste qui n'est jamais acquis du premier coup** : chauffer la pastille
*et* le fil en même temps, puis amener l'étain **sur la zone chauffée** et non
sur la panne. Neuf élèves sur dix font fondre l'étain sur le fer et le
« déposent ». Ça donne une bille brillante qui ne tient à rien.

**Le contrôle croisé est obligatoire** : c'est l'autre du binôme qui vérifie.
On ne trouve pas ses propres soudures froides.

---

### MODULE 3 — Programmation, contrôles et communication (4 h)

#### 3A — 2 h : première mise en service

| Temps | Ce qui se passe | Programme |
|---:|---|---|
| 0–20 | Les 19 contrôles hors tension, fiche à remplir. **Visa enseignant obligatoire** | — |
| 20–30 | Première alimentation par USB, sélecteur sur USB | — |
| 30–45 | La carte répond, la LED clignote, le nom de l'appareil s'affiche. **On le note sur l'étiquette de façade** | 01 |
| 45–55 | L'écran s'allume. On tranche SH1106 / SSD1306 | 02 |
| 55–65 | Pause |
| 65–80 | Le scanner : trois adresses attendues, `0x3C`, `0x48`, `0x49` | 03 |
| 80–95 | Une tension en volts, vérifiée au multimètre sur le point milieu | 04 |
| 95–115 | **La première température.** Sonde dans la main, sonde dans l'eau glacée | 05 |
| 115–120 | Les six voies, sonde déplacée de T1 à T6 | 06 |

**Le moment de la séance** : le programme 04. On lit une tension à l'écran, on
mesure la même au multimètre sur le point milieu, et **elles coïncident à 5 mV
près**. C'est là qu'un élève comprend que l'appareil ne raconte pas d'histoire.

**Le réglage du convertisseur** (§ 8.3 des plans) se fait pendant ce module,
avec l'appareil en marche : on ajuste U1 jusqu'à lire 3,55 V en sortie, et on
vérifie que l'appareil annonce la même V_exc que le multimètre. Un élève vient
de vérifier un instrument avec un autre instrument.

#### 3B — 2 h : étalonnage et Bluetooth

| Temps | Ce qui se passe | Programme |
|---:|---|---|
| 0–15 | Affichage des six voies, colonnes stables, mise en page lisible à 2 m | 07 |
| 15–30 | Le niveau des piles. On bascule le sélecteur et on regarde l'écran dire « USB » | 08 |
| 30–45 | La trame sur l'USB. **Lecture de la trame à l'œil nu**, champ par champ | 09 |
| 45–55 | Pause |
| 55–75 | **L'étalonnage.** Bain d'eau glacée fondante, une minute de stabilisation, `ZC1=0.0`. Les six voies | 11 |
| 75–95 | Le Bluetooth. Connexion depuis `exploitation.html`, six courbes en direct | 10 puis 11 |
| 95–115 | Enregistrement d'une minute, export CSV, ouverture dans le tableur | — |
| 115–120 | Bilan écrit : « mon appareil est étalonné, voici les six écarts trouvés » | — |

**Le bain d'eau glacée est le cœur de la séance.** De la glace **en excès**, de
l'eau, on remue : ce bain vaut 0,0 °C à un dixième près, gratuitement, et c'est
le seul point fixe qu'un lycée possède sans rien acheter. À dire explicitement :
*ce n'est pas « à peu près zéro », c'est zéro, par construction physique.*

**Corrigé — ordres de grandeur des écarts attendus** : ± 0,3 à ± 1,2 K selon la
sonde. Un écart supérieur à **2 K** n'est pas un défaut de sonde : c'est une
résistance de pont hors valeur ou une soudure froide. On refait le contrôle
n° 6 avant d'étalonner.

---

### MODULE 4 — Exploitation des mesures (4 h)

Ce module est **volontairement adaptable à la filière**. La version froid /
climatisation est détaillée dans
[`09_Exploitation_froid_clim.md`](09_Exploitation_froid_clim.md).

Structure commune, quelle que soit la filière :

| Temps | Ce qui se passe |
|---:|---|
| 0–30 | Pose des sondes sur l'installation. **C'est le geste métier de la séance** : contact, collier, isolant |
| 30–45 | Repérage : quelle voie mesure quoi ? Report sur le schéma de l'installation |
| 45–60 | Démarrage de l'installation, acquisition en cours. **On ne touche à rien pendant 15 minutes** |
| 60–70 | Pause — l'acquisition, elle, continue |
| 70–95 | Lecture des courbes : ce qui monte, ce qui descend, ce qui ne bouge pas, et **quand le régime s'établit** |
| 95–110 | Calculs d'écarts. Export CSV, ouverture au tableur |
| 110–120 | Conclusion argumentée, à l'écrit |

**Le piège de ce module** : les élèves veulent la valeur exacte. Le sujet n'est
pas là. Le sujet est **l'écart** et **la forme de la courbe**. Un appareil
comparatif répond très bien à « de combien » et « quand », mal à « exactement
combien ».

---

## Section 7 — Évaluation

Grille complète en [`08_Evaluation.md`](08_Evaluation.md) : huit critères, cinq
niveaux, auto-positionnement élève avant la correction enseignant.

Les quatre moments notés :

| Quand | Ce qui est évalué | Support |
|---|---|---|
| Fin 2B | La fiche des 19 contrôles, remplie et exacte | fiche élève |
| Fin 3A | La mise en service : l'appareil affiche six températures | l'appareil |
| Fin 3B | L'étalonnage : six écarts relevés et justifiés | carnet |
| Fin 4 | L'exploitation : un enregistrement lu et conclu | rapport court |

---

## Section 8 — Documents à remettre par l'élève

1. Fiches activité du [`02_Dossier_eleve.md`](02_Dossier_eleve.md), complétées
2. Fiche des 19 contrôles, visée
3. Tableau des six écarts d'étalonnage
4. Un export CSV d'au moins 10 minutes, nommé par **numéro de poste**
5. Rapport court : 10 à 15 lignes sur ce que l'enregistrement montre
6. L'appareil, en état de marche

---

## Section 9 — Corrigés et pannes à provoquer

### 9.1 Les huit pannes à provoquer, et ce qu'elles enseignent

Toutes réversibles en trente secondes, toutes sans risque. À introduire en fin
de module 3, **appareil éteint, élève sorti de la salle**.

| Panne | Symptôme visible | Ce qu'elle fait travailler | Temps de recherche visé |
|---|---|---|---:|
| Sonde débranchée | une voie affiche `----` | lire un message plutôt qu'une valeur | 1 min |
| Fils ADDR intervertis | le scanner ne voit qu'un ADS1115 | l'adressage I²C | 8 min |
| SDA débranché | plus rien sur le bus | la différence bus / alimentation | 6 min |
| Résistance de pont 4,7 kΩ | une voie lit ~10 K trop chaud | le pont diviseur, pour de vrai | 12 min |
| Sélecteur sur 0 | l'appareil s'éteint hors USB | lire le sélecteur | 2 min |
| Mauvais contrôleur d'écran | image décalée de 2 pixels | ce n'est pas toujours le câblage | 10 min |
| Piles usées | pourcentage bas, arrêts | la mesure de la source | 5 min |
| Câble USB « charge seulement » | la carte n'apparaît pas | la panne la plus fréquente du monde réel | 4 min |

**Méthode imposée, affichée au mur** :

```text
CONSTATER → FORMULER UNE HYPOTHÈSE → MESURER → IDENTIFIER → CORRIGER → VALIDER
```

Un élève qui change une pièce avant d'avoir mesuré **ne dépanne pas** : il
dépense. Le dire comme ça, une fois, en début de module 3.

### 9.2 Corrigé — les valeurs attendues

| Mesure | Valeur attendue | Tolérance |
|---|---|---|
| R de la NTC à 20 °C | 12,54 kΩ | ± 5 % (tolérance du composant) |
| R de la NTC à 0 °C (bain de glace) | 33,62 kΩ | ± 5 % |
| Tension du point milieu à 20 °C | 1,836 V | ± 30 mV |
| V_exc affichée par l'appareil | 3,25 à 3,35 V | doit coïncider au multimètre à 20 mV |
| Résistance de pont R1 à R6 | 10,00 kΩ | ± 0,1 % — c'est du 0,1 % |
| Écart d'étalonnage par voie | ± 0,3 à ± 1,2 K | au-delà de 2 K, chercher un défaut |
| Écart entre 6 voies, même bain | < 0,3 K après étalonnage | |
| Consommation totale | **à mesurer** | le calcul annonce 39 mA |

### 9.3 Points de vigilance, dans l'ordre où ils tombent

1. **Le gabarit imprimé à la mauvaise échelle.** Vérifier le carré de 50 mm.
2. **L'écran 1,3" est un SH1106, pas un SSD1306.** Le programme 02 tranche.
3. **Le câble USB « charge seulement ».** Avoir deux câbles connus bons au bureau.
4. **« USB CDC On Boot » désactivé** : le moniteur série reste muet.
5. **Le schéma de partition** : le Bluetooth ne tient pas dans le schéma par
   défaut. « Huge APP », sinon la compilation échoue à partir du programme 10.
6. **Les broches I²C.** Tout tutoriel en ligne dira GPIO8 / GPIO9. Ce sont les
   broches de démarrage de l'ESP32-C3. Le module utilise GPIO5 / GPIO6, et les
   programmes le posent avec `Wire.setPins()`.
7. **Six fils jaunes identiques.** Étiqueter avant de lâcher le fil.
8. **La sonde a de l'inertie.** Une minute pour se stabiliser dans un bain. Ce
   n'est pas une panne, c'est de la physique — et ça se chronomètre.

---

## Section 10 — Ce que ce dossier ne couvre pas

- **Les photos.** Le § 22 du dossier maître demande 50 illustrations. Sept sont
  dessinées ; les 43 autres sont des photographies, à prendre pendant le montage
  du prototype. La liste est en
  [`10_Cahier_des_illustrations.md`](10_Cahier_des_illustrations.md).
- **Les références commerciales.** Familles de composants et critères de choix
  oui, liens fournisseurs non — voir
  [`03_Nomenclature_et_achats.md`](03_Nomenclature_et_achats.md).
- **L'adossement aux référentiels.** Il est **proposé**, pas validé :
  [`07_Adaptations_par_filiere.md`](07_Adaptations_par_filiere.md) le dit
  ligne par ligne.
