# TP — Récupérer un fluide frigorigène et le prouver

**Station de récupération MINIMAX-E · rotation sur 3 postes · passerelle registre**

> Version enseignant — contient le corrigé (section 9). Le sujet élève imprimable
> est `tp.html`.

---

## Section 1 — En-tête

> ❄ **inerWeb** `Édu` — *par F. Henninot*

| | |
|---|---|
| **Établissement** | LP Privé Jacques Raynaud — Campus ÉQUATIO |
| **Classe** | BAC PRO MFER — 1re *(adaptation CAP IFCA 2e année : voir § 6.6)* |
| **Diplôme** | BAC PRO Métiers du Froid et des Énergies Renouvelables |
| **Durée** | 4 h — 1 séance |
| **Modalité** | 3 trinômes en rotation sur 3 postes (3 stations MINIMAX-E disponibles) |
| **Date** | ................................ |
| **Support technique** | Station de récupération MINIMAX-E (ATP Europe / ERM Automatismes), groupe froid positif au R134a (A1), bouteille de récupération 12 L |

**Compétences visées — BAC PRO MFER**

`C4 Organiser et sécuriser` ; `C6 Réaliser de manière éco-responsable` ;
`C9 Maintenance préventive` ; `C11 Consigner` ; `C12 Communiquer`

**Savoirs mobilisés** : `S1 Environnement de travail` ; `S2 Énergie et environnement` ;
`S6 Procédures d'intervention` ; `S7 Qualité et sécurité`

**Correspondance CAP IFCA** (si le TP est joué en version allégée) :
`C2.4 Sécuriser` ; `C4.2 Manipuler le fluide` ; `C4.5 Mesurer` ;
`C3.8 Déchets` ; `C1.1 Compléter et transmettre`

**Lien attestation d'aptitude** : ce TP prépare aux gestes évalués en catégorie I
(BAC PRO MFER) et en catégorie II, charge < 2 kg (CAP IFCA), au sens de
l'arrêté du 29 février 2016. Il ne délivre aucune attestation : il entraîne.

---

## Section 2 — Objectifs pédagogiques

À la fin de cette séance :

1. **Je serai capable de vérifier**, avant tout raccordement, que la station de
   récupération est **compatible avec le fluide de l'installation**, en lisant la
   plaque de la machine et sa notice — et non de mémoire.
2. **Je serai capable de raccorder** la station, l'installation et la bouteille de
   récupération selon le schéma phase liquide + phase vapeur, en respectant
   l'ordre d'ouverture des vannes.
3. **Je serai capable de conduire** une récupération complète, puis d'exécuter la
   **procédure de vidange de la station**, dans l'ordre imposé par le constructeur.
4. **Je serai capable de calculer** la masse de fluide récupérée par pesée, et de
   vérifier que la bouteille ne dépasse pas son **taux de remplissage maximal**.
5. **Je serai capable de renseigner** le mouvement de récupération dans le registre
   (application inerWeb Fluide, mode Formation) et d'expliquer **quelle case du
   CERFA 15497\*04** il alimente.

---

## Section 3 — Prérequis

Je coche ce que je sais déjà faire. Si trois cases ou plus restent vides, ce TP
n'est pas encore pour moi : je le signale à l'enseignant avant de commencer.

- ☐ Je sais nommer les quatre organes du cycle frigorifique et les repérer sur un groupe réel.
- ☐ Je sais poser et déposer un bipasse de service (manifold) sans dégazer.
- ☐ Je sais lire un manomètre BP et un manomètre HP, en bar relatif.
- ☐ Je sais lire une table pression / température pour un fluide donné.
- ☐ Je sais utiliser une balance électronique de charge : tare, masse brute, masse nette.
- ☐ Je sais ce qu'est une classe de sécurité A1 / A2L / A3 (NF EN 378).
- ☐ Je sais qu'il est **interdit** de rejeter volontairement un fluide frigorigène à l'atmosphère.

**Séances antérieures mobilisées** : lecture de schéma frigorifique ;
procédures ERM n° 1 et 2 (pose et dépose du bipasse de service) ;
procédure n° 4 (tirage au vide).

---

## Section 4 — Matériel

**Par poste (× 3 postes)**

1. Station de récupération **MINIMAX-E** (× 1) — 230 V / 50 Hz, 380 W, 11 kg
2. Notice constructeur de la station, en version papier, **posée sur le poste** (× 1)
3. Groupe froid positif au **R134a** chargé, avec vannes de service liquide et vapeur (× 1)
4. Bouteille de récupération **12 L**, repérée R134a, éprouvée et dans sa validité (× 1)
5. Balance électronique de charge, portée ≥ 50 kg, résolution 5 g (× 1)
6. Manifold 4 voies avec flexibles 1/4" SAE (× 1)
7. Flexible **3/8" SAE, longueur 90 cm** pour l'aspiration de la station (× 1)
8. Filtre d'entrée de station, repéré R134a (× 1) — **consommable**
9. Outil démonte-obus Schrader + tournevis à obus (× 1)
10. Vacuomètre électronique (× 1)
11. Thermomètre d'ambiance (× 1)
12. Détecteur de fuite électronique, étalonnage en cours de validité (× 1)

**Commun à l'atelier**

13. Poste informatique avec l'application **inerWeb Fluide**, mode Formation (× 1)
14. Registre du personnel et registre de l'outillage, imprimés (× 1 jeu)
15. Étiquettes de bouteille vierges (× 6) — **consommable**
16. Chiffons, bouchons de vanne neufs (**consommables**)

**EPI par élève**

17. Lunettes de protection (× 1)
18. Gants adaptés au froid et au fluide (× 1 paire)
19. Chaussures de sécurité (× 1 paire)

---

## Section 5 — Consignes de sécurité

> ### 🟧 Point sécurité n° 1 — Brûlure par le froid
> Le fluide qui se détend à l'air libre descend très en dessous de 0 °C. Une
> projection sur la peau nue ou dans l'œil provoque une brûlure immédiate.
> **Lunettes et gants pendant toute la manipulation**, y compris pour dévisser
> un flexible que l'on croit vide.

> ### 🟧 Point sécurité n° 2 — Pression
> La station est protégée par un **pressostat haute pression à réarmement
> manuel, taré à 38,5 bar**. Une coupure HP en cours de remplissage est un
> **signal de danger** : elle indique le plus souvent que la bouteille est
> sur-remplie. On arrête, on cherche la cause, on ne réarme jamais « pour voir ».
> Les bouteilles de récupération sont conçues pour une pression d'utilisation
> d'au moins 41 bar : ce n'est pas une raison pour les y amener.

> ### 🟧 Point sécurité n° 3 — Remplissage de la bouteille
> Une bouteille remplie à 100 % de liquide n'a plus de volume d'expansion. Une
> hausse de température suffit alors à la faire éclater. **Maximum 80 % en
> liquide.** Les 20 % restants ne sont pas une marge de confort : ce sont les
> 20 % qui évitent l'accident. La balance n'est pas un accessoire, c'est
> l'instrument de sécurité de l'opération.

> ### 🟧 Point sécurité n° 4 — Fluide et machine
> La notice de la station en atelier (révision 2008) liste des fluides **A1**
> uniquement et interdit explicitement l'emploi avec des gaz inflammables ou
> ammoniacaux. Des versions plus récentes de la même machine sont annoncées
> compatibles A2L. **On ne suppose pas : on lit la plaque et la notice de SA
> machine.** Aucun R32, R454B, R1234yf ou R290 sur ce poste sans validation
> écrite de l'enseignant.

> ### 🟧 Point sécurité n° 5 — Électricité et ambiance
> 230 V. Pas de rallonge longue ou sous-dimensionnée. Local ventilé.
> Aucun stockage de produit inflammable à proximité. Coupure de l'alimentation
> avant toute intervention sur la partie électrique.

**Conduite en cas d'incident**

- Projection dans l'œil → rinçage immédiat 15 min au lave-œil, alerte enseignant, appel du **15**.
- Fuite importante → arrêt de la station, évacuation, ventilation, alerte enseignant.
- Coupure HP → arrêt immédiat, aucune manipulation seul, appel de l'enseignant.
- Trousse de secours : mur nord de l'atelier, à côté du tableau électrique.
- Lave-œil : paillasse d'entrée.

**Réglementaire** : le rejet volontaire de fluide frigorigène à l'atmosphère est
interdit (code de l'environnement, articles R.543-75 et suivants). Toute
intervention sur le circuit exige une attestation d'aptitude en cours de
validité ; en atelier, l'élève intervient **sous couvert de l'enseignant référent**,
en mode Formation.

---

## Section 6 — Déroulement

### 6.0 — Observation d'abord (20 min, en classe entière)

*Aucun outil, aucun raccordement. On regarde.*

Les trois stations sont posées sur les paillasses, hors tension, sans flexible.
Chaque trinôme dispose de la notice.

**Question d'entrée** — sans ouvrir la notice, chacun écrit une phrase :
> « Pour moi, récupérer un fluide, c'est … »

Puis on ouvre la notice et on cherche **quatre** choses :

| À trouver | Où | Ce que j'écris |
|---|---|---|
| La liste des fluides admis | Spécifications techniques | |
| Le tarage du pressostat HP | Sécurité HP | |
| Le taux de remplissage maximal d'une bouteille | Récupération et bouteilles | |
| Ce qu'il faut faire **avant** de basculer l'inverseur noir | Procédures | |

**Mise en commun.** L'enseignant écrit au tableau la phrase qui structure toute
la séance :

> ### La notion de la séance
> **Récupérer, ce n'est pas « vider une machine ».**
> **C'est déplacer une masse de fluide d'un contenant vers un autre — et être
> capable de prouver, au gramme près, où elle est passée.**

Une récupération non pesée et non écrite n'est pas une récupération : c'est une
perte. Le reste du TP découle de cette phrase.

### 6.1 — Rotation sur 3 postes (3 × 50 min)

Trois trinômes, trois postes, rotation toutes les 50 min. Chaque trinôme passe
par les trois. Rôles tournants à l'intérieur du trinôme : **opérateur ·
sécurité/notice · scribe**. Le scribe ne touche pas la machine ; il tient la
feuille de relevés. On change de rôle à chaque poste.

---

#### POSTE A — Récupération en phase vapeur

*Objectif : conduire la récupération et sentir ce que la machine fait.*

| # | Action | Durée |
|---|---|---|
| A1 | Contrôle visuel de la station : carrosserie, flexibles, **filtre d'entrée en place et repéré R134a**. Sans filtre, on ne démarre pas. | 5 min |
| A2 | Retirer les obus Schrader des raccords de service. Monter le flexible 3/8" le plus court possible à l'aspiration. **Noter pourquoi** (question Q3). | 8 min |
| A3 | Poser la bouteille de récupération **sur la balance**. Relever la tare, puis la masse brute avant opération. Calculer la masse nette. | 5 min |
| A4 | Vérifier que l'inverseur **noir** est sur **RÉCUPÉRATION**. Vanne d'entrée **bleue** fermée. Vanne de sortie **rouge** fermée. | 3 min |
| A5 | Ouvrir les vannes de l'installation, puis la vanne liquide de la bouteille, puis la vanne rouge de sortie. **Lentement**, en écoutant. | 5 min |
| A6 | Mettre sous tension (le ventilateur tourne), appuyer 1 s sur **Démarrage**. Ouvrir progressivement la vanne bleue d'entrée. | 5 min |
| A7 | **Écouter le compresseur.** Si le bruit change, refermer un peu la vanne bleue jusqu'au retour d'un bruit normal. Noter ce que l'on a entendu (Q5). | 10 min |
| A8 | Suivre la descente de la BP et la montée de la masse sur la balance. Relever un point toutes les 2 min. | 9 min |

> **Agir → noter → réfléchir.** Après A7, le trinôme s'arrête et répond à Q5
> avant de reprendre. Personne ne passe à A8 sans avoir écrit.

---

#### POSTE B — Fin de récupération, vidange de la station, gaz incondensables

*Objectif : finir proprement. C'est là que se jouent les fautes de métier.*

| # | Action | Durée |
|---|---|---|
| B1 | Poursuivre jusqu'au niveau de vide exigé. **Relever dans la notice et dans la réglementation la valeur à atteindre** — ne pas l'inventer (Q6). | 10 min |
| B2 | **Procédure de vidange, dans l'ordre imposé** : fermer les vannes de l'installation → fermer la vanne bleue (CLOSED) → **arrêter la machine** → basculer l'inverseur noir sur VIDANGE → redémarrer. | 10 min |
| B3 | Expliquer par écrit **pourquoi** on arrête la machine avant de basculer l'inverseur (Q7). | 5 min |
| B4 | Descendre au vide voulu, fermer les vannes de la bouteille, arrêter la station, fermer la vanne rouge, remettre l'inverseur sur RÉCUPÉRATION. | 8 min |
| B5 | Déposer les flexibles, remettre des bouchons **neufs** sur les vannes de la bouteille. Ranger. | 5 min |
| B6 | **Étude — gaz incondensables.** À partir d'une bouteille au repos depuis 24 h : relever la pression, relever la température ambiante, comparer à la table P/T du fluide, conclure (Q8). | 12 min |

> **Point de vigilance enseignant.** B2 est le geste qui distingue l'élève du
> bricoleur. Basculer l'inverseur machine en marche envoie la HP sur le
> pressostat de sécurité. On le fait constater une fois, à vide, pas en charge.

---

#### POSTE C — Pesée, étiquetage, registre, CERFA

*Objectif : transformer une manipulation en preuve.*

| # | Action | Durée |
|---|---|---|
| C1 | Pesée finale de la bouteille. Masse brute après, masse nette après, **quantité récupérée** (Q9). | 8 min |
| C2 | Calculer le **taux de remplissage** de la bouteille et le comparer aux 80 % réglementaires (Q10). | 10 min |
| C3 | Renseigner l'**étiquette de bouteille** : fluide, état du fluide (récupéré), masse nette, date, opérateur, n° de bouteille. | 7 min |
| C4 | Saisir le mouvement dans **inerWeb Fluide**, mode Formation : type `RECUPERATION_MAINTENANCE`, machine source, bouteille destination, pesée avant, pesée après, technicien, validateur enseignant, photo de la pesée en pièce jointe. | 15 min |
| C5 | Retrouver dans l'application **quelle case du cadre 4 du CERFA 15497\*04** ce mouvement alimente, et pourquoi ce n'est pas la case « Démantèlement » (Q11). | 5 min |
| C6 | Comparer la quantité récupérée à la **charge nominale de plaque**. Écart ? Justifier (Q12). | 5 min |

> **Ce que le poste C plante.** Le registre n'est pas de la paperasse ajoutée
> après coup. C'est le seul endroit où la masse déplacée existe encore une fois
> que les flexibles sont rangés. En mode Formation, le document porte le
> filigrane « NON OFFICIEL » : l'élève s'entraîne sur le vrai formulaire sans
> jamais pouvoir produire une pièce opposable.

### 6.2 — Synthèse (30 min, classe entière)

Chaque trinôme présente **en 3 minutes** :
- la quantité récupérée à son poste,
- l'écart avec la charge de plaque, et son explication,
- **une** erreur qu'il a failli commettre.

L'enseignant conclut en reprenant les trois chiffres de la séance : **80 %**
(remplissage max), **38,5 bar** (pressostat HP), **0 g** (quantité qu'on a le
droit de rejeter à l'atmosphère).

### 6.3 — Questions de l'élève (à répondre au fil de l'eau)

- **Q1.** Quels fluides la notice de VOTRE station admet-elle ? Recopier la liste.
- **Q2.** Peut-on récupérer du R32 avec cette station ? Justifier avec la classe de sécurité du R32 et ce qu'écrit la notice.
- **Q3.** Pourquoi retire-t-on les obus Schrader et pourquoi un flexible court et gros à l'aspiration ?
- **Q4.** Pourquoi un filtre à l'entrée de la station, et pourquoi un filtre par fluide ?
- **Q5.** Qu'avez-vous entendu quand la vanne bleue était trop ouverte ? Qu'est-ce que cela signifie physiquement ?
- **Q6.** Quel niveau de vide faut-il atteindre ? Où avez-vous trouvé la réponse ? (Citer la source.)
- **Q7.** Pourquoi arrêter la machine avant de basculer l'inverseur noir sur VIDANGE ?
- **Q8.** La pression lue dans la bouteille est-elle cohérente avec la table P/T à la température ambiante ? Que conclure ?
- **Q9.** Quelle masse de fluide avez-vous récupérée ? Détailler le calcul.
- **Q10.** Quel est le taux de remplissage de la bouteille ? Est-il acceptable ?
- **Q11.** Quelle case du cadre 4 du CERFA 15497\*04 ce mouvement alimente-t-il ?
- **Q12.** Écart entre la quantité récupérée et la charge de plaque : combien, et pourquoi ?

### 6.4 — Aller plus loin (si le groupe est en avance)

- Mettre en œuvre la **méthode de refroidissement de la bouteille** : elle exige
  au moins 2,5 kg de liquide dans la bouteille, et un écart d'au moins 7 bar
  entre HP et BP, sans jamais dépasser 31,5 bar. Expliquer pourquoi la bouteille
  joue ici le rôle d'évaporateur.
- Expliquer pourquoi la **méthode par surpression** (*push-pull*) est annoncée à
  240 kg/h contre 17 kg/h en phase vapeur, et pourquoi elle est inutilisable sur
  une installation de moins de 7 kg — donc sur tous les groupes de l'atelier.

### 6.5 — Drill numérique

`atelier-vannes.html` — remise en ordre des opérations et repérage des pièges de
sécurité, auto-corrigé. À faire en fin de séance ou à la maison. 10 min.

### 6.6 — Adaptation CAP IFCA 2e année

- Un seul poste par trinôme sur la séance (pas de rotation) : **poste A + poste C**.
- Poste B remplacé par une démonstration enseignant commentée.
- Questions Q6, Q8 et l'extension 6.4 retirées.
- Q9 et Q10 fournies avec un cadre de calcul pré-rempli (opérations posées, valeurs à compléter).
- Vocabulaire : « masse nette » explicité à chaque occurrence par « ce qu'il y a
  vraiment de fluide dedans ».
- La charge des groupes de l'atelier reste **inférieure à 2 kg**, cohérente avec
  la catégorie II.

### 6.7 — Adaptation TDAH / DYS

- La feuille de relevés tient sur **une page**, une ligne par mesure, aucune
  rédaction longue avant la synthèse.
- Le rôle de scribe tourne : personne ne reste 50 min sur de l'écrit.
- Chaque poste tient en **une** consigne affichée au mur, en gros caractères.
- Les questions sont posées **au moment du geste**, pas toutes à la fin.

---

## Section 7 — Évaluation

Positionnement par compétence. Auto-positionnement élève **avant** la correction.

| Compétence | Indicateur observable | Élève | Prof |
|---|---|---|---|
| `C4 Organiser et sécuriser` | EPI portés du début à la fin, sans rappel | ☐ A ☐ EC ☐ NA | ☐ A ☐ EC ☐ NA |
| `C4 Organiser et sécuriser` | Compatibilité fluide/machine vérifiée **dans la notice** avant raccordement | ☐ A ☐ EC ☐ NA | ☐ A ☐ EC ☐ NA |
| `C6 Réaliser de manière éco-responsable` | Aucun rejet à l'atmosphère observé, y compris à la dépose des flexibles | ☐ A ☐ EC ☐ NA | ☐ A ☐ EC ☐ NA |
| `C6 Réaliser de manière éco-responsable` | Filtre d'entrée présent et repéré au bon fluide | ☐ A ☐ EC ☐ NA | ☐ A ☐ EC ☐ NA |
| `C9 Maintenance préventive` | Ordre d'ouverture des vannes respecté, ouverture progressive | ☐ A ☐ EC ☐ NA | ☐ A ☐ EC ☐ NA |
| `C9 Maintenance préventive` | Procédure de vidange exécutée dans l'ordre imposé (vanne → arrêt → inverseur) | ☐ A ☐ EC ☐ NA | ☐ A ☐ EC ☐ NA |
| `C9 Maintenance préventive` | Taux de remplissage calculé et comparé aux 80 % | ☐ A ☐ EC ☐ NA | ☐ A ☐ EC ☐ NA |
| `C11 Consigner` | Mouvement saisi dans le registre, complet, avec pièce jointe | ☐ A ☐ EC ☐ NA | ☐ A ☐ EC ☐ NA |
| `C11 Consigner` | Case CERFA correctement identifiée et justifiée | ☐ A ☐ EC ☐ NA | ☐ A ☐ EC ☐ NA |
| `C12 Communiquer` | Écart quantité / charge de plaque annoncé et expliqué en synthèse | ☐ A ☐ EC ☐ NA | ☐ A ☐ EC ☐ NA |

**A** = Acquis · **EC** = En cours · **NA** = Non acquis

**Éliminatoire de séance** (reprise obligatoire, sans note punitive) : rejet
volontaire de fluide à l'atmosphère ; réarmement du pressostat HP sans recherche
de cause ; bouteille laissée sur la balance au-delà de 80 %.

---

## Section 8 — Documents à remettre

Un dossier par trinôme, en fin de séance :

1. La **feuille de relevés** complétée (`tp.html`, page 2) — masses, pressions, températures, horaires.
2. Les **réponses Q1 à Q12**, rédigées.
3. La **fiche de mouvement** imprimée depuis inerWeb Fluide, mode Formation, avec son filigrane.
4. L'**étiquette de bouteille** renseignée (photo ou double).
5. Une **synthèse de 5 à 10 lignes** répondant à : *« Si l'enseignant vous demandait
   demain de prouver où sont passés les 1,15 kg récupérés aujourd'hui, que
   montreriez-vous ? »*

---

## Section 9 — Corrigé et éléments attendus

*Version enseignant. Les valeurs numériques ci-dessous correspondent au jeu de
données de référence du poste A (groupe froid positif R134a, charge de plaque
1,20 kg, bouteille de récupération 12 L). Elles sont à ajuster au matériel réel
de la séance.*

**Q1.** La notice en atelier (révision 2008) liste des fluides **A1** : R11, R12,
R22, R13B1, R123, R134a, R141b, R401A/B, R402A/B, R404A, R407A/B/C, R408A,
R409A, R410A, R500, R502, R503, R507. Attendu : la liste recopiée **de la notice
posée sur le poste**, pas d'une autre source. Accepter une recopie partielle si
l'élève cite l'emplacement.

**Q2.** Non. Le R32 est **A2L**, donc faiblement inflammable ; la notice interdit
explicitement l'usage avec des gaz inflammables et le R32 ne figure pas dans la
liste. Point de vigilance de correction : certains catalogues annoncent des
versions récentes de cette machine compatibles A1/A2/A2L. La bonne réponse
n'est donc pas « cette machine ne fait jamais de A2L » mais **« la machine de ce
poste, telle que sa notice la décrit, ne le fait pas »**. Valoriser l'élève qui
va vérifier la plaque plutôt que celui qui récite.

**Q3.** L'obus Schrader et un flexible long et fin créent une **perte de charge**
qui effondre le débit d'aspiration. La notice recommande du 3/8" ou plus gros,
le plus court possible, environ 90 cm. Conséquence concrète : une récupération
de quelques minutes peut passer à plusieurs heures. Accepter toute formulation
équivalente parlant de restriction, de frottement ou de débit.

**Q4.** Le filtre protège le compresseur de la station des corps étrangers
(limaille, oxydes, résidus). L'absence de filtre annule la garantie. Un filtre
par fluide, repéré, évite le **mélange de fluides** — un mélange rend le fluide
inexploitable et non identifiable. En cas de compresseur grillé : deux filtres
antiacide en série à l'entrée, puis rinçage et tirage au vide de la station après
l'opération.

**Q5.** Un bruit métallique, plus dur, ou un changement net de régime = **entrée
de liquide en excès** dans le compresseur de la station (coup de liquide), ou
pression en bouteille inférieure à la pression d'entrée. Geste attendu : refermer
lentement la vanne bleue jusqu'au retour d'un bruit normal. Ne jamais ouvrir la
vanne d'entrée à fond en phase liquide.

**Q6.** Réponse attendue : **une valeur citée avec sa source** (notice
constructeur et/ou texte réglementaire en vigueur consulté en séance). Toute
réponse donnée sans source est comptée « En cours », même si le chiffre est
juste. C'est l'objet de la question : on ne récite pas un niveau de vide, on va
le chercher. Le critère pratique de terrain — descendre jusqu'à stabilisation de
la BP, puis vérifier au vacuomètre — est accepté **en complément**, pas à la place.

**Q7.** Parce que basculer l'inverseur pendant que la machine tourne met
brutalement la HP en communication avec le circuit et provoque une **coupure du
pressostat de sécurité 38,5 bar**. L'ordre imposé est : fermer la vanne bleue →
arrêter la machine → basculer l'inverseur → redémarrer. Réponse « pour ne pas
casser la machine » : En cours. Réponse citant la sécurité HP : Acquis.

**Q8.** Méthode attendue : bouteille au repos 24 h (les incondensables montent en
partie haute) → lecture de la pression → mesure de la température ambiante →
comparaison à la table P/T du fluide. **Si la pression lue est nettement
supérieure à la pression de la table, il y a des incondensables.** Purge très
lente par la vanne vapeur jusqu'à la valeur de la table majorée de 0,3 à 0,35 bar,
puis repos 10 min et nouvelle mesure, à répéter si besoin. À faire verbaliser :
cette purge n'est pas un dégazage de fluide, et elle ne doit jamais servir de
prétexte à en faire un.

**Q9.** Calcul attendu, posé :

```
Tare bouteille .............................. 12,000 kg
Masse brute AVANT ........................... 13,400 kg
Masse nette AVANT ....... 13,400 − 12,000 =    1,400 kg

Masse brute APRÈS ........................... 14,550 kg
Masse nette APRÈS ....... 14,550 − 12,000 =    2,550 kg

Quantité récupérée ...... 2,550 − 1,400  =    1,150 kg
```

Erreur fréquente : oublier la masse nette **avant** et annoncer 2,55 kg récupérés.
La sanctionner comme une erreur de registre, pas comme une erreur de calcul —
c'est exactement ce qui fausse une balance matière annuelle.

**Q10.** Donnée fournie à l'élève : masse volumique du liquide R134a à 25 °C
≈ 1 206 kg/m³ *(valeur à confirmer sur la fiche de données de sécurité du
fournisseur)*.

```
Volume utile à 80 % ..... 12 L × 0,80        =  9,6 L
Masse maximale admise ... 9,6 × 1,206        ≈ 11,6 kg
Taux de remplissage ..... 2,550 / 11,6       ≈ 22 %
```

Conclusion attendue : **très en dessous de la limite, la bouteille peut recevoir
d'autres récupérations de R134a**. À faire ressortir : le taux se calcule sur la
masse admissible, pas sur le volume de la bouteille — et la limite des 80 %
existe parce que le liquide se dilate avec la température. Le tableau de la
notice le montre : une bouteille remplie à 80 % à 16 °C est à 94 % à 66 °C ; une
bouteille remplie à 90 % à 16 °C atteint **100 % dès 54 °C**.

**Q11.** Cadre 4 du CERFA 15497\*04, case **« Entretien / réparation
(récupération) »** — type interne `RECUPERATION_MAINTENANCE` dans inerWeb Fluide.
Ce n'est **pas** « Démantèlement » : l'équipement reste en service et sera
rechargé. La case « Démantèlement » (`RECUPERATION_DEMANTELEMENT`) correspond à
une machine retirée définitivement du service.

**Q12.** Écart attendu : 1,200 − 1,150 = **0,050 kg, soit 50 g**. Explications
recevables, au moins deux attendues :
- fluide dissous dans l'**huile** du compresseur, non récupérable par aspiration ;
- fluide resté dans les **flexibles et le manifold** à la dépose ;
- niveau de vide final non atteint : il reste de la vapeur dans le circuit ;
- charge réelle différente de la charge de plaque (appoints antérieurs non tracés).

Explication **non recevable** : « la balance est fausse ». Si la balance est
suspectée, la réponse professionnelle est de vérifier sa date d'étalonnage dans
le registre de l'outillage — ce que l'application signale par une alerte
bloquante quand la vérification est expirée.

**Synthèse (section 8, item 5).** Réponse attendue : la fiche de mouvement du
registre, l'étiquette de la bouteille, la photo de pesée en pièce jointe, et le
fait que l'écriture est validée par l'enseignant référent et scellée par
empreinte. L'élève qui répond « la bouteille » a la moitié de la réponse : la
bouteille prouve qu'il y a du fluide, pas d'où il vient.

---

## Sources

- **Notice constructeur** — *Manuel d'utilisation MINIMAX-E*, Advanced Test
  Products Europe, révision 3 (2008), diffusée par
  [ERM Automatismes](https://www.erm-automatismes.com/d000088-manuel-d-utilisation.pdf).
  Les valeurs techniques citées dans ce TP (38,5 bar · 80 % · 31,5 bar · 41 bar ·
  2,5 kg · 7 kg · 17 / 50 / 240 kg/h · 0,3 à 0,35 bar) en sont extraites comme
  **données techniques**. Aucun passage du manuel n'est reproduit : sa page de
  garde en interdit la reproduction sans autorisation écrite.
- **Sommaire des procédures ERM** — procédures n° 8 (récupération en phase
  vapeur), n° 9 (phase liquide), n° 10 (récupération, général) :
  [d0002EA](https://www.erm-automatismes.com/d0002EA-sommaire-des-modes-operatoires.pdf).
  Le présent TP se place **après** les procédures n° 1, 2 et 4.
- **Laboratoire Froid & Climatisation ERM** — configuration d'atelier de
  référence : station de récupération tous fluides avec protection par pressostat
  HP, balance électronique de charge, pompe à vide 40 l/min, bouteilles R134A /
  R404A / R410A neuves et de récupération 12 L :
  [Labo-FroidClimatisation.pdf](https://www.erm-automatismes.com/dl/labo/Labo-FroidClimatisation.pdf).
- **Classification de sécurité** : NF EN 378 / ASHRAE 34.
- **Réglementaire** : règlement (UE) 517/2014 et (UE) 2024/573 ; code de
  l'environnement, art. R.543-75 et suivants ; arrêté du 29 février 2016
  (attestations d'aptitude) ; CERFA 15497\*04.

---

*inerWeb Édu — F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO*
