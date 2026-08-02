# ❄ inerWeb **Édu** — Fiche de séance n° 2

**Du symbole au circuit réel**
Ordres de montage · groupe de condensation · circuit d'huile · régulateurs de pression · séquences de commande

*par F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO*

---

## Section 1 — En-tête

| | |
|---|---|
| **Classe visée** | BAC PRO MFER — 1re ou 2e année (cible principale) |
| **Adaptations prévues** | CAP IFCA 2e année · TP BE CVC (voir § 10) |
| **Prérequis de séquence** | Séance n° 1 « Le Circuit Fantôme » validée (les 8 règles de lecture) |
| **Compétences visées** | `C2 Analyser les données techniques` ; `C3 Choisir les matériels` ; `C9 Maintenance préventive` ; `C10 Maintenance corrective` |
| **Savoirs associés** | `S3 Analyse technique` ; `S5 Procédures d'installation` ; `S6 Procédures d'intervention` |
| **Niveau taxonomique** | 3 Application |
| **Durée** | 2 h d'auto-apprentissage + 1 h d'exploitation en atelier |
| **Modalité** | Individuel sur poste · binômes sur les ateliers 10 à 12 |
| **Outil** | `pedagogie/symboles-frigo/index.html`, module 2 |

---

## Section 2 — Objectifs pédagogiques

1. **J'ordonne** les six organes de la ligne liquide et **je justifie** chaque position.
2. **Je distingue** ce qui est livré sur le châssis d'un groupe de condensation de ce qui reste à monter sur site.
3. **Je décris** le circuit d'huile d'une centrale, du séparateur au carter, et **je nomme** la sécurité qui le surveille.
4. **Je classe** KVP, KVR, KVL et KVC selon la pression qu'ils surveillent, et **j'indique** où chacun se monte.
5. **Je restitue** dans l'ordre les séquences de pump down, de dégivrage électrique et de dégivrage par gaz chauds.
6. **Je diagnostique** trois pannes classiques : voyant plein de bulles, courts cycles, batterie prise en glace.

---

## Section 3 — Prérequis

L'élève coche. **Le module 1 est un prérequis dur** : sans les 8 règles de lecture, il ne pourra pas suivre les schémas.

- [ ] Je sais lire un symbole en appliquant les 8 règles (module 1, atelier 1).
- [ ] Je sais nommer les 4 organes principaux et dire l'état du fluide sur les 4 portions du circuit.
- [ ] Je sais distinguer un pressostat de sécurité d'un pressostat de régulation (Z contre S).
- [ ] Je sais qu'un trait plein transporte du fluide et qu'un trait pointillé transporte de l'information.
- [ ] Je sais ce que veut dire « surchauffe » et à quel endroit elle se mesure.

---

## Section 4 — Matériel

1. Poste informatique ou tablette **par élève** (× 1 par élève)
2. Mémo frigoriste imprimé — `memo-frigoriste.html`, 4 pages A4 (× 1 par élève)
3. Stylo bleu + surligneur orange (× 1 par élève)
4. **Pour l'heure 3, sur plateau technique** : une installation didactique complète avec sa ligne liquide accessible, ou à défaut le groupe de condensation de l'atelier
5. Jeu de photos des organes réels — déshydrateur, voyant, électrovanne, KVP, séparateur d'huile (× 1 jeu par binôme)
6. Documentation constructeur Danfoss des régulateurs présents dans l'atelier (× 1 jeu au bureau)

> **Point important sur les valeurs.** Ni l'application ni le mémo ne donnent de valeur de tarage, de seuil ou de temporisation : elles dépendent du fluide, de la puissance et du constructeur. C'est la documentation constructeur de l'atelier qui les fournit, en heure 3. Cette absence est volontaire et doit être annoncée aux élèves.

---

## Section 5 — Consignes de sécurité

Les 2 heures d'auto-apprentissage sont sans risque : mêmes points de vigilance qu'en séance 1 (pause écran toutes les 40 min, données locales, repérage du décrochage).

L'heure 3 se déroule **sur installation**. Elle change tout.

> ### ⚠ Point sécurité — installation sous pression
> Aucun démontage, aucun desserrage de raccord, aucune manœuvre de vanne pendant cette heure. **On regarde, on repère, on nomme.** L'observation ne demande aucune ouverture de circuit. Toute intervention réelle relève d'un autre TP, avec attestation d'aptitude et EPI complets.

> ### ⚠ Point sécurité — risque électrique
> Les coffrets restent fermés. L'observation des pressostats et des électrovannes se fait capot en place. Habilitation minimale pour toute ouverture : `B0` — et ce n'est pas l'objet de cette séance.

> ### ⚠ Point sécurité — EPI de l'heure 3
> Chaussures de sécurité et lunettes dès l'entrée sur le plateau, même pour observer. Gants si l'on approche des lignes de refoulement — elles sont chaudes en fonctionnement.

---

## Section 6 — Déroulement

### Principe retenu : l'ordre avant la liste

La notion centrale de cette séance tient en une phrase :

> **Sur une installation réelle, ce n'est plus le symbole qui compte. C'est sa place, et le moment où il agit.**

Un élève peut nommer les 53 symboles et être incapable de dire pourquoi le voyant est après le déshydrateur, ou ce qui se passe en premier dans un dégivrage. Le module 1 lui a donné le vocabulaire ; le module 2 lui donne la syntaxe.

D'où la mécanique retenue partout dans ce module : **l'élève construit l'ordre pas à pas**. À chaque étape, il choisit l'élément suivant, et il reçoit immédiatement la justification de la position. Construire une fois dans le bon ordre en comprenant pourquoi vaut mieux que réordonner dix fois au hasard.

---

### Minute 0 à 10 — Lancement collectif

Projeter une ligne liquide complète, dans le désordre. Question : *« Un de ces six organes n'est pas à sa place. Lequel ? »*

Laisser chercher deux minutes. Personne ne trouvera de façon sûre — c'est voulu.

Puis : *« Vous savez tous les nommer. Aucun de vous ne sait encore où ils vont. C'est exactement la différence entre un élève qui a appris son cours et un frigoriste. »*

Distribuer le mémo, **plié et non lu** : il servira à l'heure 3, pas maintenant.

---

### Minute 10 à 35 — Atelier 6 : La ligne liquide

Six organes à placer entre le condenseur et l'évaporateur, un par un, avec la justification à chaque position. Puis les quatre règles de tracé, puis trois questions de terrain.

**Le point qui fait la séance.** Le voyant **après** le déshydrateur. C'est le seul ordre qui donne au voyant une valeur de diagnostic. Si un élève ne retient qu'une chose de l'atelier 6, c'est celle-là.

**Trace écrite.** Sur le mémo, page 1 : l'élève entoure les deux positions qu'il n'avait pas trouvées du premier coup.

**Posture enseignant.** Ne rien expliquer avant que l'élève ait choisi. La justification arrive dans l'application — elle est meilleure après l'erreur qu'avant.

---

### Minute 35 à 55 — Atelier 7 : Le groupe de condensation

Vingt organes défilent. Pour chacun, une seule question : sur le châssis, ou sur site ?

C'est la question qu'on se pose réellement en préparant une commande. Un élève qui commande un détendeur « au cas où » avec un groupe de condensation a mal compris ce qu'il achetait ; un élève qui oublie l'électrovanne de ligne liquide bloquera son chantier.

**Trace écrite.** Mémo page 2 : les deux colonnes sont déjà imprimées. L'élève coche celles qu'il a ratées.

---

### Minute 55 à 60 — Pause obligatoire

---

### Minute 60 à 80 — Atelier 8 : Le circuit d'huile

Six organes, du séparateur au carter. Même mécanique.

**Le point qui fait l'atelier.** Le pressostat différentiel d'huile. Il ne mesure **ni un niveau, ni une pression absolue** : il mesure l'écart entre la pression fournie par la pompe et celle qui règne dans le carter. C'est une erreur d'élève très fréquente, et elle a des conséquences réelles en dépannage.

> **Note sur le symbole `PDZ`.** La lettre **D** (différentielle) n'apparaît pas dans le tableau des bulles de la page 86 du support. Elle prolonge la même logique de lecture, et l'application le signale explicitement à l'élève. Ce symbole fait partie des quatre ajouts « hors document » du module 2.

**Trace écrite.** Mémo page 1, bas : l'élève écrit en une phrase ce que mesure le pressostat différentiel.

---

### Minute 80 à 105 — Atelier 9 : KVP · KVR · KVL · KVC

Quatre phases : découvrir la règle de classement, trier amont/aval, dire où chacun se monte, puis reconnaître le régulateur en cause sur quatre pannes réelles.

**La règle centrale, à faire écrire au tableau :**

> Un régulateur de pression se lit par **la pression qu'il surveille**.
> S'il surveille sa pression d'**entrée**, il protège ce qui est **avant** lui.
> S'il surveille sa pression de **sortie**, il protège ce qui est **après** lui.
> Sur le symbole, le trait pointillé montre de quel côté la prise de pression est faite : **c'est écrit sur le dessin.**

Mnémotechnique retenue : **KVP et KVR regardent en arrière** (ils protègent l'amont) · **KVL et KVC regardent devant** (ils protègent l'aval).

**Trace écrite.** Mémo page 3 : le tableau est imprimé. L'élève surligne en orange la colonne « Surveille » — c'est la seule colonne à mémoriser, les trois autres s'en déduisent.

---

### Minute 105 à 145 — Ateliers 10, 11 et 12 : les séquences *(binômes autorisés)*

Trois séquences, même mécanique : l'élève choisit l'étape suivante, une par une.

| Atelier | Séquence | Étapes | Le point dur |
|---|---|---|---|
| 10 | Pump down | 10 | Le thermostat commande **l'électrovanne**, pas le compresseur |
| 11 | Dégivrage électrique | 10 | Les trois temporisations, et pourquoi chacune existe |
| 12 | Dégivrage par gaz chauds | 11 | Le condensat qui repart vers le compresseur |

**Pourquoi les binômes ici.** Une séquence se raconte. Deux élèves qui se disent « et après, il se passe quoi ? » construisent la logique bien mieux qu'un élève qui clique seul. Lever la règle de silence sur ces trois ateliers uniquement.

**Trace écrite.** Mémo page 4 : les trois séquences sont imprimées dans l'ordre. L'élève note dans la marge, pour chaque temporisation, **ce qui se passerait si on la supprimait**.

---

### Minute 145 à 150 — Synthèse collective

Trois questions, trois élèves différents, au tableau :

1. Pourquoi le voyant est-il après le déshydrateur ?
2. Un compresseur démarre et s'arrête toutes les deux minutes, chambre à température. Que cherches-tu ?
3. Pourquoi ne dégivre-t-on jamais tous les postes d'une centrale en même temps ?

Si les trois réponses tombent, la séance a fonctionné.

---

### Heure 3 — Exploitation sur plateau technique

Le mémo se déplie enfin. Par binômes, sur l'installation de l'atelier :

1. **Relever la ligne liquide réelle** (15 min) — repérer chaque organe, le photographier, noter l'ordre observé. Comparer avec l'ordre du mémo. Toute différence doit être expliquée, pas signalée.
2. **Repérer les régulateurs présents** (15 min) — identifier chaque KV\* de l'installation, dire ce qu'il surveille, puis **ouvrir la documentation constructeur** et relever la plage de réglage réelle. C'est le moment où les valeurs entrent en scène — pas avant.
3. **Reconstituer la séquence de dégivrage de l'installation** (20 min) — à partir du régulateur en place et de sa notice. Comparer avec la séquence type du mémo.
4. **Restitution orale** (10 min) — chaque binôme présente un écart entre le mémo et le réel, et l'explique.

**Ce qui est évalué ici, c'est l'écart.** Un élève qui dit « ce n'est pas comme dans le mémo » sans expliquer n'a pas compris. Un élève qui dit « ici le voyant est avant le déshydrateur, et c'est un défaut de montage » a compris.

---

## Section 7 — Évaluation

| Compétence | Indicateur observable | A (élève) | B (prof) |
|---|---|:---:|:---:|
| `C2 Analyser les données techniques` | Ordonne les 6 organes de la ligne liquide et justifie au moins 4 positions | ☐ ☐ ☐ | ☐ ☐ ☐ |
| `C3 Choisir les matériels` | Trie correctement 16 organes sur 20 entre châssis et site | ☐ ☐ ☐ | ☐ ☐ ☐ |
| `C2 Analyser les données techniques` | Classe les 4 régulateurs amont/aval sans erreur | ☐ ☐ ☐ | ☐ ☐ ☐ |
| `C9 Maintenance préventive` | Restitue la séquence de dégivrage dans l'ordre et justifie les 3 temporisations | ☐ ☐ ☐ | ☐ ☐ ☐ |
| `C10 Maintenance corrective` | Sur 3 pannes décrites, propose la piste de recherche pertinente | ☐ ☐ ☐ | ☐ ☐ ☐ |
| `C2 Analyser les données techniques` | Sur plateau, relève un écart entre l'installation et le montage type, et l'explique | ☐ ☐ ☐ | ☐ ☐ ☐ |

Trois cases : **Acquis** / **En cours** / **Non acquis**.

Le dernier indicateur est celui qui discrimine : il ne s'obtient pas par mémorisation.

---

## Section 8 — Documents à remettre

1. **Le mémo frigoriste annoté** — positions ratées entourées, colonne « Surveille » surlignée, conséquences des temporisations notées en marge.
2. **Le relevé de plateau** — ordre observé sur l'installation, plages de réglage relevées dans la documentation, écarts expliqués.
3. **Les photos des organes repérés**, légendées.

---

## Section 9 — Corrigé et éléments attendus

### La ligne liquide — l'ordre et sa justification

| | Organe | Justification attendue |
|---|---|---|
| 1 | Bouteille liquide | Reçoit tout le liquide condensé ; réserve et garde de liquide ; se remplit par gravité |
| 2 | Vanne d'isolement | Consigner la ligne sans vidanger le circuit |
| 3 | Filtre déshydrateur | Retient humidité et impuretés **avant** les organes fragiles |
| 4 | Voyant liquide | **Après** le déshydrateur : c'est ce qui lui donne sa valeur de diagnostic |
| 5 | Électrovanne | Au plus près du détendeur, pour la qualité du pump down |
| 6 | Détendeur | Au plus près de l'évaporateur ; distribution homogène |

### Le circuit d'huile

Séparateur (au refoulement) → réservoir → filtre → voyant → électrovanne → régulateur de niveau à flotteur → carter.
Sécurité : **pressostat différentiel d'huile**, qui compare la pression de la pompe à celle du carter.

### Les régulateurs

| | Surveille | Monté | Protège |
|---|---|---|---|
| **KVP** | son entrée | aspiration, sortie d'évaporateur | l'évaporateur |
| **KVR** | son entrée | ligne liquide, sortie de condenseur | la HP, donc le détendeur |
| **KVL** | sa sortie | aspiration, avant le compresseur | le moteur du compresseur |
| **KVC** | sa sortie | by-pass refoulement → aspiration | le compresseur (courts cycles) |

Le **KVR** va presque toujours avec la vanne différentielle **NRD**, qui maintient la bouteille liquide en pression pendant que le condenseur est noyé.

### Les trois diagnostics

| Symptôme | Piste attendue |
|---|---|
| Voyant plein de bulles en régime établi | Manque de charge, ou déshydrateur encrassé qui perd trop de charge |
| Courts cycles, chambre à température | Fuite à travers l'électrovanne ou le clapet de retenue : la BP remonte seule |
| Batterie prise en bloc de glace | Égouttage trop court ou absent : l'eau regèle sur la batterie à chaque cycle |

### Points de vigilance à la correction

- **Ne pas sanctionner** un ordre légèrement différent sur la vanne d'isolement : selon les montages, elle peut se trouver ailleurs. La position du **voyant après le déshydrateur**, elle, n'est pas négociable.
- **Sanctionner** un élève qui décrit le pressostat différentiel d'huile comme un contrôle de niveau : c'est une erreur de nature.
- Sur les séquences, **une inversion entre deux étapes voisines** (arrêt ventilateurs / mise sous tension des résistances) est vénielle. **Une inversion qui casse la logique** — ouvrir le gaz chaud avant d'avoir fermé la ligne liquide — ne l'est pas.
- Un élève qui restitue les trois séquences parfaitement mais ne sait dire à quoi sert aucune temporisation a mémorisé sans comprendre. Le signaler.

---

## Section 10 — Adaptations

### CAP IFCA 2e année
Conserver les ateliers **6, 7 et 10** (ligne liquide, groupe de condensation, pump down). Retirer les régulateurs KV\*, le circuit d'huile de centrale et le dégivrage par gaz chauds : hors périmètre d'une attestation catégorie II et d'installations inférieures à 5 kW. Durée ramenée à 1 h 15.

### TP BE CVC
Ajouter en prolongement le dimensionnement de la ligne liquide : calcul de la perte de charge totale, vérification du sous-refroidissement disponible, dimensionnement du diamètre. Le calcul de la colonne (Δp = ρ·g·h) devient un exercice à part entière, avec les tables du fluide. Compter 3 h supplémentaires.

### 2nde TNE
Atelier 10 seul (le pump down), présenté comme une histoire à remettre dans l'ordre. 30 minutes. Pas d'évaluation notée.

### Élèves TDAH / DYS
La mécanique « une étape à la fois, retour immédiat » leur convient particulièrement — c'est d'ailleurs pour cela qu'elle a été retenue. Deux ajustements :
- couper les ateliers 10 à 12 sur deux séances plutôt que de les enchaîner ;
- accepter que la trace écrite du mémo soit **fléchée et entourée** plutôt que rédigée.

---

## Section 11 — Ce que cette séance ne traite pas

À dire aux élèves, pour qu'ils sachent où s'arrête ce qu'ils viennent d'apprendre :

- **Aucune valeur de réglage.** Tarages, plages, seuils et temporisations sont dans la documentation constructeur. Cette séance apprend à savoir **quoi** régler et **pourquoi**, pas **à combien**.
- **Aucun dimensionnement.** Diamètres de ligne, puissances, longueurs équivalentes : c'est un autre travail.
- **Le schéma électrique de commande** n'est qu'effleuré (le câblage du thermostat sur l'électrovanne). La lecture complète d'un schéma de commande relève d'une séquence d'électrotechnique.
- **L'inversion de cycle** est seulement distinguée du dégivrage par gaz chauds. Le montage complet d'une PAC réversible mérite sa propre séance.
- **Les tracés de piquage exacts** du dégivrage par gaz chauds varient selon les constructeurs. Ce module donne le principe et l'ordre des étapes ; le schéma de l'installation fait foi.

---

*inerWeb Édu — F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO*
