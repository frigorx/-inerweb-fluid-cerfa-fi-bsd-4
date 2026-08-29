# DOSSIER MAÎTRE — PROJET PÉDAGOGIQUE TRANSVERSAL  
## Enregistreur autonome de températures connecté — 6 voies

**Version de travail : 29 août 2026**  
**Format pédagogique : module transversal adaptable**  
**Durée de référence : 16 h, sous forme de 4 modules de 4 h, chacun découpable en 2 × 2 h**  
**Effectif de référence : 10 élèves**  
**Organisation privilégiée : 5 binômes**  
**Finalité : réaliser, mettre en service puis exploiter un enregistreur autonome de 6 températures, avec affichage local, USB-C, Bluetooth BLE et enregistrement des données.**

---

# 1. INTENTION GÉNÉRALE DU PROJET

Ce projet n’est pas conçu comme un TP réservé à une seule filière.  
Il est conçu comme un **module de formation transversal**, centré sur une chaîne d’acquisition de données physiques :

> **Grandeur physique → capteur → signal électrique → conversion numérique → traitement → affichage → communication → enregistrement → exploitation**

Le même support matériel peut être utilisé à différents niveaux et dans différentes filières, avec une adaptation des objectifs, des compétences visées et du niveau d’autonomie demandé.

L’objectif n’est donc pas de faire « un projet Arduino » ou « un projet électronique », mais de faire comprendre et réaliser **un système de mesure connecté, autonome et réellement exploitable dans un contexte professionnel ou scientifique**.

---

# 2. PRINCIPES DIRECTEURS

Le dossier pédagogique devra respecter les principes suivants :

- projet **clé en main** ;
- utilisable par des élèves qui n’ont jamais réalisé ce type de montage ;
- accompagnement très progressif ;
- chaque opération est expliquée ;
- aucune étape technique ne doit être considérée comme « évidente » ;
- nombreux dessins, schémas, vues de détail et animations ;
- code fourni par étapes progressives ;
- contrôles intermédiaires obligatoires ;
- approche modulaire ;
- possibilité de faire chaque module de 4 h en **2 séances de 2 h** ;
- utilisation d’un matériel économique et facilement remplaçable ;
- boîtier final réutilisable ensuite dans d’autres enseignements ;
- séparation claire entre :
  - réalisation du système ;
  - acquisition des données ;
  - exploitation métier des données.

---

# 3. ARCHITECTURE TECHNIQUE RETENUE

## 3.1 Fonctions du boîtier

Le boîtier final doit :

1. recevoir **6 sondes de température** ;
2. mesurer simultanément les 6 températures ;
3. afficher les valeurs localement ;
4. transmettre les données en USB ;
5. transmettre les données en Bluetooth BLE ;
6. fonctionner sans câble grâce à des piles internes ;
7. pouvoir être alimenté par USB lors de la programmation ou d’une acquisition filaire ;
8. enregistrer les données sur PC ou appareil Android ;
9. afficher l’état approximatif des piles ;
10. permettre une exploitation ultérieure en froid, climatisation, thermique, sciences ou technologie.

---

## 3.2 Architecture fonctionnelle

```text
SONDE NTC T1 ─┐
SONDE NTC T2 ─┤
SONDE NTC T3 ─┤
SONDE NTC T4 ─┤──> CONDITIONNEMENT / PONT DIVISEUR
SONDE NTC T5 ─┤
SONDE NTC T6 ─┘
                    │
                    ▼
            2 × ADS1115 16 bits
                    │
                 BUS I²C
                    │
                    ▼
                 ESP32-C3
              ┌─────┼─────┐
              │     │     │
              ▼     ▼     ▼
            OLED   USB   BLE
                    │     │
                    ▼     ▼
                   PC   PC / Android
```

---

## 3.3 Alimentation

Le boîtier doit pouvoir fonctionner selon deux modes.

### Mode autonome

```text
3 × piles AA
     │
porte-piles
     │
convertisseur
     │
commutateur
PILES – 0 – USB
     │
protection anti-retour
     │
ESP32 + ADS1115 + OLED
```

### Mode USB

Le boîtier est alimenté par le port USB-C lorsqu’il est relié à un ordinateur.

Le sélecteur doit comporter trois positions :

- **PILES**
- **0 / ARRÊT**
- **USB**

Les deux sources d’alimentation ne doivent jamais être reliées directement en parallèle.

Une protection anti-retour doit être prévue afin d’éviter toute injection de courant USB vers les piles.

---

# 4. CHOIX DES CAPTEURS

## Sonde retenue

**NTC 10 kΩ — B3950 — version étanche sous gaine inox**

### Raisons du choix

- prix très faible ;
- disponibilité importante ;
- format robuste ;
- longueur de câble adaptée à l’instrumentation ;
- bonne plage d’utilisation pour un projet pédagogique ;
- très facile à remplacer ;
- permet de travailler réellement :
  - résistance ;
  - pont diviseur ;
  - variation d’une grandeur physique ;
  - conversion analogique/numérique ;
  - étalonnage.

### Limite assumée

Ce boîtier n’est pas un appareil de métrologie certifié.

Il s’agit d’un **outil pédagogique et d’acquisition comparative**.  
Un étalonnage individuel des sondes pourra être réalisé pour améliorer la précision.

---

# 5. BOÎTIER MÉCANIQUE

## Format recommandé

Boîtier ABS étanche ou semi-étanche d’environ :

**120 × 90 × 60 mm**

Une variation de quelques millimètres est acceptable.

### Contraintes

Le boîtier doit pouvoir recevoir :

- 1 écran OLED sur le couvercle ;
- 6 prises jack ;
- 1 connecteur USB-C de façade ;
- 1 commutateur PILES–0–USB ;
- l’ESP32 ;
- 2 ADS1115 ;
- la plaque électronique ;
- le porte-piles 3 × AA ;
- le câblage interne.

### Implantation indicative

#### Couvercle

```text
┌─────────────────────────────┐
│                             │
│        ÉCRAN OLED           │
│                             │
│ T1 +04.8   T2 -03.2         │
│ T3 +08.7   T4 +52.1         │
│ T5 +31.4   T6 +24.8         │
│                             │
│ BLE ●          PILES 78 %   │
│                             │
│      PILES – 0 – USB        │
└─────────────────────────────┘
```

#### Côtés

- côté gauche : T1, T2, T3 ;
- côté droit : T4, T5, T6 ;
- face basse : USB-C ;
- commutateur accessible sans ouvrir le boîtier.

---

# 6. NOMENCLATURE COMPLÈTE PAR BOÎTIER

## 6.1 Matériel incorporé

| Désignation | Qté par boîtier | Fonction |
|---|---:|---|
| ESP32-C3 SuperMini USB-C BLE/Wi-Fi | 1 | Microcontrôleur, traitement, USB, Bluetooth |
| ADS1115 16 bits / 4 voies | 2 | Conversion analogique-numérique |
| OLED 1,3" 128 × 64 I²C | 1 | Affichage local |
| NTC 10 kΩ B3950 étanche | 6 | Mesure des températures |
| Résistance 10 kΩ précision 0,1 % | 6 | Ponts diviseurs |
| Jack femelle 3,5 mm de panneau | 6 | Connexion des sondes |
| Jack mâle 3,5 mm | 6 | Terminaison des sondes |
| Plaque à pastilles / PCB prototype | 1 | Support de câblage |
| Boîtier ABS env. 120 × 90 × 60 mm | 1 | Enveloppe mécanique |
| Rallonge USB-C de façade | 1 | Accès USB sans ouvrir le boîtier |
| Porte-piles 3 × AA | 1 | Alimentation autonome |
| Piles AA | 3 | Source d’énergie |
| Convertisseur DC-DC adapté | 1 | Stabilisation de l’alimentation |
| Commutateur 3 positions PILES–0–USB | 1 | Sélection de la source |
| Protection anti-retour | 1 | Séparation des alimentations |
| Résistances mesure tension piles | 2 | Mesure de niveau batterie |
| Barrettes mâles/femelles 2,54 mm | 1 lot | Cartes démontables |
| Entretoises nylon M3 | 4 à 8 | Fixation des cartes |
| Vis M3 | 4 à 8 | Fixation |
| Écrous M3 | 4 à 8 | Fixation |
| Rondelles M3 | 4 à 8 | Fixation |
| Pieds caoutchouc | 4 | Protection du boîtier |
| Fusible réarmable / protection faible courant | 1 | Protection complémentaire |
| Étiquette de façade | 1 | Repérage |
| Étiquettes T1 à T6 | 6 | Repérage des voies |
| Câble USB-C | 1 | Programmation / acquisition USB |

---

# 7. CONSOMMABLES PAR BOÎTIER

Pour des élèves débutants, prévoir une marge généreuse.

| Consommable | Quantité conseillée par boîtier |
|---|---:|
| Fil souple rouge 0,20 à 0,25 mm² | 1 m |
| Fil souple noir | 1 m |
| Fil souple bleu | 0,75 m |
| Fil souple jaune | 0,75 m |
| Fil souple vert | 0,75 m |
| Fil souple blanc | 0,75 m |
| **Total fil à prévoir** | **5 m minimum** |
| Gaine thermo Ø 2 mm | 0,50 m |
| Gaine thermo Ø 3 mm | 0,50 m |
| Gaine thermo Ø 4/5 mm | 0,50 m |
| Gaine thermo Ø 6 mm | 0,30 m |
| Étain électronique fin | env. 8 g |
| Flux électronique | env. 1 ml |
| Tresse à dessouder | env. 10 cm |
| Colliers nylon petits | 10 |
| Colle chaude | env. 1/2 bâton |
| Double-face | env. 20 cm |
| Alcool isopropylique | env. 10 ml |
| Papier abrasif fin | 1 petit morceau |
| Étiquettes temporaires | 10 |
| Essuie-tout / chiffon | selon besoin |

### Marge pédagogique

Ajouter :

- **20 % sur fil et gaine thermo** ;
- **20 % sur connectique** ;
- **10 % sur composants électroniques**.

Les erreurs font partie de l’apprentissage.

---

# 8. CHIFFRAGE DE RÉFÉRENCE PAR BOÎTIER

Le prix exact dépendra des fournisseurs et des lots achetés.

## Enveloppe retenue

| Poste | Budget cible |
|---|---:|
| Électronique principale | ~12 à 15 € |
| 6 sondes NTC | ~3 à 5 € |
| Connectique | ~5 € |
| Boîtier ABS | ~4 à 6 € |
| Alimentation autonome + sélecteur | ~4 € |
| Fixations / PCB / petits composants | ~4 € |
| Câble USB | ~1,50 € |
| Consommables de fabrication | ~5 à 6 € |
| **Coût réaliste par boîtier** | **≈ 40 à 45 €** |

### Valeur à retenir dans le dossier

> **Budget pédagogique recommandé : 45 € par appareil terminé.**

---

# 9. CONFIGURATION POUR 10 ÉLÈVES

## Organisation retenue

- 10 élèves ;
- 5 binômes ;
- 5 appareils élèves ;
- 1 appareil professeur / démonstration / secours.

## Quantités à acheter

| Matériel | Quantité classe |
|---|---:|
| ESP32-C3 | 6 + 2 de secours = 8 |
| ADS1115 | 12 + 3 de secours = 15 |
| OLED | 6 + 1 de secours = 7 |
| NTC 10 kΩ B3950 | 36 + 10 de secours = 46 |
| Résistances précision 10 kΩ | 36 + minimum 20 de secours |
| Jack femelle | 36 + 10 de secours |
| Jack mâle | 36 + 10 de secours |
| Boîtier ABS | 6 + éventuellement 1 brut de secours |
| Porte-piles 3 AA | 6 + 1 |
| Commutateurs 3 positions | 6 + 2 |
| Convertisseurs DC-DC | 6 + 2 |
| Protections anti-retour | 6 + 3 |
| Plaques à pastilles | 6 + 2 |
| Câbles USB-C | 6 |
| Jeux de piles AA | 6 jeux minimum |

---

# 10. STOCK CONSOMMABLE À ACHETER POUR LA CLASSE

| Consommable | Achat conseillé |
|---|---:|
| Fil rouge | 10 m |
| Fil noir | 10 m |
| Fil bleu | 10 m |
| Fil jaune | 10 m |
| Fil vert | 10 m |
| Fil blanc | 10 m |
| Gaine thermo Ø2 | 5 m |
| Gaine thermo Ø3 | 5 m |
| Gaine thermo Ø4/5 | 5 m |
| Gaine thermo Ø6 | 5 m |
| Étain électronique 0,5 ou 0,7 mm | 100 g minimum |
| Flux | 1 flacon ou seringue |
| Tresse à dessouder | 1 bobine |
| Colliers nylon | boîte de 100 |
| Bâtons de colle chaude | boîte de 10 |
| Alcool isopropylique | 500 ml |
| Double-face | 1 rouleau |
| Abrasif fin | quelques feuilles |
| Étiquettes | 1 lot |
| Chiffons / essuie-tout | stock atelier |

---

# 11. OUTILLAGE NÉCESSAIRE POUR 10 ÉLÈVES

## 11.1 Outillage par binôme — 5 postes

| Outil | Qté totale | Qté par binôme |
|---|---:|---:|
| Fer à souder réglable | 5 | 1 |
| Support de fer | 5 | 1 |
| Nettoyeur de panne / éponge | 5 | 1 |
| Multimètre | 5 | 1 |
| Pince coupante électronique | 5 | 1 |
| Pince à dénuder | 5 | 1 |
| Pince plate fine | 5 | 1 |
| Petit tournevis plat | 5 | 1 |
| Petit tournevis cruciforme | 5 | 1 |
| Brucelles | 5 | 1 |
| Troisième main / support PCB | 5 | 1 |
| Réglet métallique | 5 | 1 |
| Marqueur fin | 5 | 1 |

## 11.2 Outillage mutualisé

| Outil | Quantité conseillée |
|---|---:|
| Perceuse à colonne ou perceuse d’établi | 1 |
| Perceuse portative | 1 |
| Jeu de forets métal/plastique | 1 jeu |
| Foret étagé | 1 à 2 |
| Mini-scie / outil rotatif pour ouverture écran | 1 |
| Limes plates et demi-rondes | 2 à 3 |
| Ébavureur | 1 à 2 |
| Pistolet à air chaud réglable | 2 |
| Pistolet à colle chaude | 2 |
| Pompe à dessouder | 2 |
| Bobine de tresse à dessouder | 1 |
| Alimentation de laboratoire | 1 à 2 |
| Thermomètre de référence | 2 minimum |
| Pied à coulisse | 1 à 2 |
| Testeur USB / voltampèremètre USB | 1 |
| PC avec environnement de programmation | 5 idéalement |
| Téléphone Android de test | 1 à 2 |

---

# 12. EPI ET SÉCURITÉ

## EPI minimum

- lunettes lors des opérations de perçage et découpe ;
- cheveux attachés ;
- vêtements adaptés ;
- poste de soudure stable ;
- ventilation correcte du poste.

## Règles

- boîtier hors tension pour toute modification ;
- contrôle électrique obligatoire avant première alimentation ;
- interdiction de laisser un fer à souder sans support ;
- pas de manipulation des piles et de l’USB sans respecter le sélecteur d’alimentation ;
- aucune mise sous tension sans validation du contrôle lors des premières séances.

---

# 13. STRUCTURE PÉDAGOGIQUE MODULAIRE

Le projet est conçu sur **16 heures**.

## Découpage principal

| Module | Durée | Objet |
|---|---:|---|
| Module 1 | 4 h | Découvrir et comprendre la chaîne d’acquisition |
| Module 2 | 4 h | Réaliser le boîtier et le câblage |
| Module 3 | 4 h | Programmer, contrôler, étalonner et communiquer |
| Module 4 | 4 h | Utiliser le boîtier et exploiter les mesures |

Chaque module de 4 h doit être découpable en **2 × 2 h**.

---

# 14. MODULE 1 — COMPRENDRE LA CHAÎNE D’ACQUISITION

## 1A — 2 h : le capteur

### Objectifs

- découvrir une NTC ;
- mesurer une résistance ;
- comprendre que la température modifie une grandeur électrique ;
- réaliser quelques mesures simples.

### Activités

1. observer la sonde ;
2. identifier ses deux fils ;
3. mesurer sa résistance à température ambiante ;
4. chauffer la sonde avec la main ;
5. refroidir la sonde ;
6. comparer ;
7. compléter un tableau ;
8. conclure.

### Résultat attendu

L’élève doit comprendre :

> température ↑ → résistance NTC ↓

---

## 1B — 2 h : de la résistance à la donnée numérique

### Objectifs

- découvrir le pont diviseur ;
- comprendre le rôle de l’ADS1115 ;
- identifier le rôle de l’ESP32 ;
- reconstituer la chaîne fonctionnelle.

### Chaîne attendue

```text
TEMPÉRATURE
    ↓
NTC
    ↓
RÉSISTANCE
    ↓
PONT DIVISEUR
    ↓
TENSION
    ↓
ADS1115
    ↓
VALEUR NUMÉRIQUE
    ↓
ESP32
    ↓
AFFICHAGE / USB / BLUETOOTH
```

---

# 15. MODULE 2 — RÉALISER LE BOÎTIER

## 2A — 2 h : mécanique et implantation

### Activités

- lecture du plan ;
- repérage des perçages ;
- traçage ;
- pointage ;
- perçage ;
- découpe OLED ;
- ébavurage ;
- montage à blanc.

### Apprentissages associés

- prise de cote ;
- précision ;
- utilisation d’un gabarit ;
- sécurité au perçage ;
- organisation du poste.

---

## 2B — 2 h : câblage et soudure

### Activités

- apprentissage de la soudure ;
- préparation des conducteurs ;
- dénudage ;
- étamage ;
- gaine thermo ;
- soudure des jacks ;
- montage des résistances ;
- montage des modules ;
- premier contrôle de continuité.

---

# 16. MODULE 3 — PROGRAMMATION, CONTRÔLES ET COMMUNICATION

## 3A — 2 h : première mise en service

### Activités

- contrôle hors tension ;
- première alimentation ;
- connexion USB ;
- détection de l’ESP32 ;
- scanner I²C ;
- identification OLED et ADS1115 ;
- chargement d’un programme test ;
- affichage des températures.

---

## 3B — 2 h : étalonnage et Bluetooth

### Activités

- comparaison avec thermomètre de référence ;
- calcul d’un écart ;
- saisie d’un offset ;
- validation des 6 voies ;
- activation Bluetooth BLE ;
- connexion PC ou Android ;
- observation des données.

---

# 17. MODULE 4 — EXPLOITATION DES MESURES

Ce module est volontairement adaptable à la filière.

## Version froid / climatisation

Exemple d’utilisation sur installation frigorifique :

| Voie | Mesure possible |
|---|---|
| T1 | air entrée évaporateur |
| T2 | air sortie évaporateur |
| T3 | air entrée condenseur |
| T4 | air sortie condenseur |
| T5 | aspiration |
| T6 | refoulement ou ligne liquide |

### Activités

- installation des sondes ;
- acquisition pendant le démarrage ;
- observation des courbes ;
- calcul des écarts de température ;
- repérage du régime stabilisé ;
- éventuellement calcul de surchauffe et sous-refroidissement avec les pressions disponibles.

---

# 18. UTILISATION PAR LES BAC PRO MFER

Pour les Bac Pro MFER, le projet de fabrication est volontairement mis de côté.

Les élèves utilisent **les appareils terminés**.

Objectif :

- instrumentation ;
- mesures ;
- acquisition ;
- exploitation ;
- diagnostic ;
- analyse thermodynamique.

Le temps MFER doit rester centré sur le métier du froid et de la climatisation.

---

# 19. ADAPTABILITÉ À D’AUTRES FILIÈRES

Le dossier maître reste neutre.  
Une fiche annexe peut indiquer comment l’adapter.

## Filières et contextes potentiels

| Public / filière | Usage possible |
|---|---|
| Technologie collège | capteur, chaîne d’information, objet connecté |
| Physique-chimie collège/lycée | mesure, acquisition, traitement de données |
| Seconde TNE | projet transversal complet |
| CAP IFCA | outil professionnel / chef-d’œuvre possible |
| CAP Électricien | câblage, alimentation, mesures, contrôle |
| CAP Monteur en installations thermiques | mesures thermiques |
| CAP Monteur en installations sanitaires | mesures et instrumentation |
| Bac Pro MELEC | câblage, alimentation, communication |
| Bac Pro CIEL | acquisition, programmation, BLE, données |
| Bac Pro ICCER | température, régulation, énergétique |
| Bac Pro MEE | mesures énergétiques et exploitation |
| Bac Pro MFER | utilisation du boîtier fini |
| STI2D | instrumentation et objet connecté |
| BTS FED | mesures, analyse, instrumentation |
| Formations CVC | diagnostic et suivi thermique |

Cette liste est indicative.  
L’adaptation au référentiel doit être faite localement selon la spécialité et le niveau.

---

# 20. PISTE CHEF-D’ŒUVRE CAP

Le projet peut être utilisé comme base de chef-d’œuvre, en particulier pour un CAP lié au froid, à l’électricité ou aux équipements thermiques.

Le projet doit alors être présenté comme :

> **Concevoir, réaliser et valider un outil autonome de mesure et d’enregistrement de températures destiné à un usage professionnel.**

La programmation peut être fournie et guidée.  
L’élève n’a pas nécessairement à développer tout le logiciel.

Les dimensions valorisables sont :

- analyse du besoin ;
- organisation ;
- réalisation mécanique ;
- câblage ;
- contrôle ;
- mise en service ;
- métrologie ;
- utilisation professionnelle ;
- rédaction d’une notice ;
- présentation orale ;
- travail en équipe.

---

# 21. DOCUMENTS À PRODUIRE POUR LE KIT FINAL

## Dossier professeur

- présentation générale ;
- objectifs ;
- durée ;
- prérequis ;
- organisation de classe ;
- compétences possibles ;
- fiches de préparation ;
- corrigés ;
- points de vigilance ;
- procédures de contrôle ;
- pannes à provoquer ;
- grille d’évaluation ;
- auto-évaluation ;
- nomenclature ;
- budget ;
- outillage ;
- consommables.

## Dossier élève

- mise en situation ;
- objectifs ;
- fiches activité ;
- plans ;
- schémas ;
- pas-à-pas ;
- cases de validation ;
- tableaux de mesures ;
- questions ;
- conclusions ;
- fiche de dépannage.

---

# 22. ILLUSTRATIONS À CRÉER

Le dossier devra comporter un ensemble cohérent d’illustrations.

## Illustrations générales

1. vue du boîtier terminé ;
2. vue 3/4 ;
3. vue dessus ;
4. vue arrière ;
5. vue intérieure ;
6. vue éclatée ;
7. repérage T1 à T6 ;
8. implantation des cartes.

## Illustrations électroniques

9. ESP32-C3 annoté ;
10. ADS1115 annoté ;
11. OLED annoté ;
12. NTC annotée ;
13. jack mâle / femelle ;
14. porte-piles ;
15. commutateur PILES–0–USB ;
16. chaîne fonctionnelle complète ;
17. bus I²C ;
18. pont diviseur ;
19. câblage d’une voie ;
20. câblage des 6 voies.

## Illustrations gestes professionnels

21. longueur de dénudage ;
22. fil correctement étamé ;
23. fil trop étamé ;
24. bonne soudure ;
25. soudure froide ;
26. surcharge d’étain ;
27. pose de gaine thermo ;
28. chauffage correct ;
29. mauvaise gaine thermo ;
30. utilisation de la tresse à dessouder.

## Illustrations mécanique

31. gabarit de façade ;
32. position des perçages ;
33. perçage du plastique ;
34. découpe OLED ;
35. ébavurage ;
36. fixation des entretoises ;
37. maintien du porte-piles.

## Illustrations contrôle

38. mesure de continuité ;
39. recherche d’un court-circuit ;
40. contrôle alimentation ;
41. mesure d’une NTC ;
42. contrôle d’un jack.

## Illustrations exploitation

43. pose de sonde sur tube ;
44. pose de sonde air ;
45. installation sur chambre froide ;
46. acquisition sur PC ;
47. acquisition sur Android ;
48. courbes de température ;
49. exemple de CSV ;
50. lecture d’un démarrage frigorifique.

---

# 23. ANIMATIONS À PRÉVOIR

Les animations devront rester très courtes.

1. variation de résistance d’une NTC avec la température ;
2. fonctionnement d’un pont diviseur ;
3. conversion analogique-numérique ;
4. circulation de la donnée vers l’ESP32 ;
5. affichage OLED ;
6. envoi USB ;
7. envoi Bluetooth ;
8. enregistrement d’une mesure ;
9. évolution des températures au démarrage d’une machine ;
10. démarche de recherche de panne.

---

# 24. SITE WEB COMPAGNON

Le site doit permettre au professeur et à l’élève de retrouver rapidement les ressources.

## Arborescence possible

```text
/enregistreur-temperature/
│
├── accueil
├── materiel
├── montage
│   ├── 01-boitier
│   ├── 02-jacks
│   ├── 03-soudure
│   ├── 04-cartes
│   └── 05-controles
│
├── programmes
│   ├── 01-test-esp32
│   ├── 02-test-oled
│   ├── 03-scanner-i2c
│   ├── 04-lecture-1-sonde
│   ├── 05-lecture-6-sondes
│   ├── 06-affichage
│   ├── 07-bluetooth
│   └── 08-version-finale
│
├── exploitation
│   ├── pc
│   ├── android
│   ├── csv
│   └── graphiques
│
├── depannage
│
└── telechargements
```

---

# 25. PROGRESSION DES PROGRAMMES

Les élèves ne doivent pas recevoir directement le code final.

## Programme 01

Reconnaître et programmer l’ESP32.

## Programme 02

Tester l’écran OLED.

## Programme 03

Scanner le bus I²C.

## Programme 04

Lire une seule voie ADS1115.

## Programme 05

Lire une NTC.

## Programme 06

Lire les 6 sondes.

## Programme 07

Afficher les 6 températures.

## Programme 08

Mesurer le niveau des piles.

## Programme 09

Transmettre en USB.

## Programme 10

Transmettre en Bluetooth BLE.

## Programme final

- 6 températures ;
- OLED ;
- batterie ;
- USB ;
- BLE ;
- trame de données stable ;
- gestion des erreurs.

---

# 26. FORMAT DE DONNÉES PROPOSÉ

Exemple :

```text
12:31:05;T1=4.8;T2=-3.2;T3=8.7;T4=52.1;T5=31.4;T6=24.8;BAT=78
```

Objectifs :

- format simple ;
- compréhensible par un élève ;
- facilement importable dans un tableur ;
- compatible PC ;
- compatible Android ;
- exploitable sur une page web.

---

# 27. EXPLOITATION SUR ANDROID

Objectif à terme :

- connexion BLE depuis un téléphone Android ;
- lecture des 6 températures ;
- démarrage / arrêt d’un enregistrement ;
- affichage graphique ;
- export CSV.

Une interface web dédiée pourra être développée afin de limiter l’installation d’applications.

---

# 28. CONTRÔLES OBLIGATOIRES AVANT MISE SOUS TENSION

Chaque binôme doit remplir une fiche de contrôle.

| Contrôle | Résultat |
|---|---|
| absence de court-circuit + / 0 V | |
| polarité correcte | |
| continuité T1 | |
| continuité T2 | |
| continuité T3 | |
| continuité T4 | |
| continuité T5 | |
| continuité T6 | |
| SDA correct | |
| SCL correct | |
| alimentation ADS1115 | |
| alimentation OLED | |
| alimentation ESP32 | |
| sélecteur PILES–0–USB | |
| absence de liaison directe piles / USB | |
| fixation mécanique | |
| absence de fil dénudé apparent | |

---

# 29. PANNES PÉDAGOGIQUES POSSIBLES

- sonde débranchée ;
- jack mal câblé ;
- fil coupé ;
- résistance incorrecte ;
- voie inversée ;
- ADS1115 non alimenté ;
- adresse I²C incorrecte ;
- SDA coupé ;
- SCL coupé ;
- OLED débranché ;
- sélecteur mal positionné ;
- piles faibles ;
- Bluetooth désactivé ;
- câble USB défectueux.

## Méthode imposée

```text
CONSTATER
   ↓
FORMULER UNE HYPOTHÈSE
   ↓
MESURER / CONTRÔLER
   ↓
IDENTIFIER
   ↓
CORRIGER
   ↓
VALIDER
```

---

# 30. ÉVALUATION SUR 5 NIVEAUX

| Critère | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| S’informer | ne trouve pas | forte aide | partiel | autonome | vérifie et justifie |
| Organiser | désorganisé | rappels constants | acceptable | autonome | anticipe |
| Réaliser | non fonctionnel | nombreuses erreurs | aide nécessaire | conforme | très soigné |
| Contrôler | ne contrôle pas | incomplet | guidé | autonome | méthodique |
| Mettre en service | impossible | forte aide | aide ponctuelle | autonome | explique |
| Exploiter les données | aucune analyse | erronée | partielle | correcte | argumentée |
| Diagnostiquer | essais au hasard | hypothèses faibles | guidé | autonome | démarche rigoureuse |
| Communiquer | très incomplet | confus | correct | clair | professionnel |

---

# 31. AUTO-ÉVALUATION ÉLÈVE

À la fin du projet, l’élève se positionne de 1 à 5.

| Je suis capable de… | 1 | 2 | 3 | 4 | 5 |
|---|:---:|:---:|:---:|:---:|:---:|
| expliquer le rôle d’une NTC | ☐ | ☐ | ☐ | ☐ | ☐ |
| utiliser un multimètre | ☐ | ☐ | ☐ | ☐ | ☐ |
| préparer un conducteur | ☐ | ☐ | ☐ | ☐ | ☐ |
| réaliser une soudure correcte | ☐ | ☐ | ☐ | ☐ | ☐ |
| utiliser une gaine thermo | ☐ | ☐ | ☐ | ☐ | ☐ |
| suivre un schéma | ☐ | ☐ | ☐ | ☐ | ☐ |
| contrôler avant mise sous tension | ☐ | ☐ | ☐ | ☐ | ☐ |
| identifier une chaîne d’acquisition | ☐ | ☐ | ☐ | ☐ | ☐ |
| utiliser l’USB | ☐ | ☐ | ☐ | ☐ | ☐ |
| utiliser le Bluetooth | ☐ | ☐ | ☐ | ☐ | ☐ |
| enregistrer des données | ☐ | ☐ | ☐ | ☐ | ☐ |
| analyser une courbe | ☐ | ☐ | ☐ | ☐ | ☐ |
| rechercher une panne | ☐ | ☐ | ☐ | ☐ | ☐ |

---

# 32. DÉMARCHE D’ACCOMPAGNEMENT POUR DÉBUTANTS

Chaque fiche doit être construite avec la logique suivante :

1. **ce que je vais faire** ;
2. **pourquoi je le fais** ;
3. **le matériel dont j’ai besoin** ;
4. **photo ou dessin de l’état initial** ;
5. **geste n°1** ;
6. **contrôle** ;
7. **geste n°2** ;
8. **contrôle** ;
9. **résultat attendu** ;
10. **photo ou dessin du résultat correct** ;
11. **erreurs fréquentes** ;
12. **que faire si cela ne fonctionne pas ?** ;
13. **validation professeur ou auto-validation**.

---

# 33. EXEMPLE DE GUIDANCE — SOUDER UN JACK

## Étape 1

Couper le fil à la longueur indiquée.

## Étape 2

Enfiler la gaine thermorétractable **avant la soudure**.

## Étape 3

Dénuder environ 5 mm.

## Étape 4

Torsader légèrement les brins.

## Étape 5

Étamer le conducteur.

## Étape 6

Chauffer simultanément le contact du jack et le conducteur.

## Étape 7

Apporter l’étain sur la zone chauffée.

## Étape 8

Retirer l’étain.

## Étape 9

Retirer le fer.

## Étape 10

Ne pas bouger pendant le refroidissement.

## Étape 11

Contrôler visuellement la soudure.

## Étape 12

Contrôler électriquement la continuité.

## Étape 13

Positionner la gaine thermo.

## Étape 14

Rétracter la gaine.

---

# 34. RESSOURCES À PHOTOGRAPHIER / DOCUMENTER

Pour chaque composant, le dossier final devra présenter :

- nom ;
- photo ;
- référence ;
- dimensions ;
- nombre de broches ;
- brochage simplifié ;
- fonction ;
- quantité ;
- prix indicatif ;
- alternative compatible ;
- lien fournisseur ;
- point de vigilance.

Composants prioritaires :

- ESP32-C3 ;
- ADS1115 ;
- OLED ;
- NTC ;
- jacks ;
- commutateur ;
- convertisseur ;
- porte-piles ;
- boîtier ABS ;
- connecteur USB-C de façade ;
- résistances ;
- plaque à pastilles.

---

# 35. BUDGET DE LANCEMENT DE LA CLASSE

Pour 10 élèves :

- 5 boîtiers élèves ;
- 1 boîtier professeur/secours ;
- pièces de rechange ;
- consommables.

## Enveloppe de référence

| Poste | Budget |
|---|---:|
| 6 appareils terminés | ~270 € maximum |
| pièces électroniques de secours | ~20 à 30 € |
| stock initial consommables | ~50 à 70 € |
| **Budget de lancement hors outillage** | **~320 à 370 €** |

Cette valeur sera affinée après sélection des références commerciales définitives.

---

# 36. ÉVOLUTIONS POSSIBLES

Le projet peut évoluer sans modifier son principe de base.

## Extensions possibles

- sondes PT1000 ;
- pression ;
- humidité ;
- intensité électrique ;
- tension ;
- contact sec ;
- débit ;
- enregistrement sur carte SD ;
- Wi-Fi ;
- stockage distant ;
- interface InerWeb ;
- exploitation avec diagramme frigorifique ;
- calcul automatique de surchauffe ;
- calcul automatique de sous-refroidissement.

Ces évolutions ne font pas partie du projet de base.

---

# 37. PRINCIPE DE NEUTRALITÉ DU DOSSIER

Le document principal ne doit pas être écrit « pour un diplôme ».

Il doit être écrit autour du **système et des apprentissages**.

Les adaptations seront placées dans des fiches annexes :

- adaptation TNE ;
- adaptation CAP IFCA ;
- adaptation CAP Électricien ;
- adaptation technologie ;
- adaptation sciences ;
- adaptation Bac Pro ;
- adaptation BTS.

Cela évite de réécrire plusieurs fois le même projet et permet de conserver un support durable.

---

# 38. FINALITÉ DU PROJET

À la fin du parcours, l’élève doit pouvoir expliquer :

> **« J’ai réalisé, contrôlé et mis en service un système qui mesure plusieurs températures, transforme ces mesures en données numériques, les affiche, les transmet et permet de les exploiter. »**

L’objet final ne doit pas être considéré comme une simple réalisation scolaire.

Il doit devenir un **véritable outil de mesure réutilisable dans l’atelier, en sciences, en technologie, en énergétique ou dans des activités de diagnostic.**

---

# 39. PROCHAINES ÉTAPES DE PRODUCTION

1. figer les références commerciales ;
2. récupérer les photos des composants ;
3. mesurer précisément les dimensions ;
4. choisir définitivement le boîtier ABS ;
5. réaliser le schéma électrique complet ;
6. réaliser le schéma d’alimentation PILES–0–USB ;
7. réaliser le prototype n°1 ;
8. mesurer sa consommation réelle ;
9. valider l’autonomie ;
10. tester les 6 NTC ;
11. tester le Bluetooth Android ;
12. figer la trame de données ;
13. créer les gabarits de perçage ;
14. photographier toutes les étapes de montage ;
15. produire les illustrations pédagogiques ;
16. écrire les fiches élèves ;
17. écrire les corrigés professeur ;
18. produire les programmes progressifs ;
19. créer le site compagnon ;
20. tester la séquence avec un groupe d’élèves ;
21. corriger le dossier après retour terrain.

---

# 40. STATUT DU DOCUMENT

Ce fichier est le **dossier maître de cadrage**.

Il fixe :

- le concept ;
- l’architecture ;
- la modularité ;
- l’organisation matérielle ;
- les besoins en consommables ;
- l’outillage ;
- la structure des séances ;
- les publics potentiels ;
- les ressources à produire.

Il servira ensuite de base aux documents suivants :

- `01_Dossier_professeur.md`
- `02_Dossier_eleve.md`
- `03_Nomenclature_et_achats.md`
- `04_Outillage_et_consommables.md`
- `05_Plans_et_schema.md`
- `06_Programmes_et_telechargements.md`
- `07_Adaptations_par_filiere.md`
- `08_Evaluation.md`
- `09_Exploitation_froid_clim.md`
- `10_Cahier_des_illustrations.md`

