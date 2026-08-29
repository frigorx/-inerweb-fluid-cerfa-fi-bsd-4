# L'enregistreur de températures — 6 voies, autonome, connecté

Module transversal du pack inerWeb Édu. **16 heures**, en 4 modules de 4 h,
chacun découpable en 2 × 2 h. Effectif de référence : 10 élèves, 5 binômes,
6 appareils.

Le site compagnon s'ouvre par [`site/index.html`](site/index.html), hors ligne,
sans installation. L'outil d'acquisition s'ouvre seul par
[`site/exploitation.html`](site/exploitation.html) — c'est lui qu'on projette
en classe.

## D'où ça vient

D'un dossier de cadrage écrit par F. Henninot le 29 août 2026, archivé ici tel
quel : [`00_Dossier_maitre.md`](00_Dossier_maitre.md). Il fixait le concept,
l'architecture, la modularité, le budget et la liste des documents à produire.
Il ne fixait **ni le schéma électrique, ni le code, ni les valeurs**.

Ce dossier-ci produit ce qui manquait : les dix documents annoncés au § 40 du
dossier maître, les onze programmes du § 25, le site compagnon du § 24, et le
schéma que l'étape 5 de la production réclamait.

## Ce que fait l'appareil

> Grandeur physique → capteur → signal électrique → conversion numérique →
> traitement → affichage → communication → enregistrement → exploitation

Six sondes NTC étanches, deux convertisseurs 16 bits, un ESP32-C3, un écran, une
prise USB-C, du Bluetooth BLE, trois piles AA. Il affiche, il transmet, il
s'enregistre. Ce n'est pas un appareil de métrologie certifié et le dossier ne
le prétend nulle part — c'est un **instrument d'atelier comparatif**, ce qui est
exactement ce qui manque quand on veut voir vivre une machine frigorifique.

## Les trois décisions qui commandent tout le reste

Elles ne sont pas dans le dossier maître : elles ont été prises en écrivant le
schéma, et chacune est justifiée au long dans
[`05_Plans_et_schema.md`](05_Plans_et_schema.md).

**1. La NTC est du côté de la masse, jamais du côté du 3,3 V.**
La broche de la fiche jack porte alors le point milieu du pont, et le corps de
la fiche porte la masse. Un élève qui enfonce une fiche en biais court-circuite
le point milieu à la masse : il ne se passe rien. Dans l'autre sens, il aurait
mis le 3,3 V à la masse six fois par séance.

**2. Les deux voies libres de l'ADS1115 ne sont pas perdues : elles mesurent.**
Six sondes, huit entrées. La septième mesure la tension d'excitation du pont,
la huitième mesure les piles. Mesurer l'excitation avec le même convertisseur
que la sonde fait disparaître l'erreur de gain du convertisseur dans le rapport
des deux lectures — on gagne un demi-degré sans dépenser un centime.

**3. Le sélecteur PILES–0–USB ne coupe que les piles.**
L'USB alimente quand il est branché, un point c'est tout. Une Schottky en série
avec la sortie du convertisseur garantit le seul interdit qui compte : **jamais
de courant vers les piles**. Si un élève laisse le sélecteur sur PILES et branche
l'USB, rien ne casse — c'était le cahier des charges.

## Ce qui est écrit, et ce qui ne l'est pas

| | État |
|---|---|
| Schéma électrique complet, calculs à l'appui | **écrit** |
| Schéma d'alimentation PILES–0–USB | **écrit** |
| Les 11 programmes progressifs | **écrits** — voir la réserve ci-dessous |
| Site compagnon hors ligne + outil d'acquisition | **écrit** |
| Gabarit de perçage imprimable 1:1 | **écrit** |
| Dossier professeur, dossier élève, évaluation | **écrits** |
| Prototype n°1 | **N'EXISTE PAS** |
| Consommation réelle, autonomie réelle | **NON MESURÉES** |
| Photos des composants et des étapes | **À FAIRE** |
| Références commerciales définitives | **NON FIGÉES** |

> **La réserve, et elle est sérieuse.** Aucun de ces onze programmes n'a été
> téléversé dans un ESP32-C3, parce qu'il n'y en a pas dans cette machine. Ils
> sont écrits pour compiler, la logique de mesure est vérifiée par ses tests
> (`node outils/verifier-module.mjs`), et les valeurs des tableaux sont
> calculées et non recopiées — mais **« vérifié » n'est pas « éprouvé »**. Tant
> que le prototype n°1 n'a pas tourné, le module porte le statut
> `Prototype à réaliser`. Ne pas le lancer devant une classe sans avoir monté
> l'appareil professeur d'abord : c'est ce à quoi il sert.

La liste complète de ce qui attend le fer à souder est dans
[`POINTS-OUVERTS.md`](POINTS-OUVERTS.md).

## Les documents

| Fichier | Pour qui, pour quoi |
|---|---|
| [`00_Dossier_maitre.md`](00_Dossier_maitre.md) | L'intrant du 29/08/2026, archivé sans retouche |
| [`01_Dossier_professeur.md`](01_Dossier_professeur.md) | Les 4 modules déroulés, minute par minute, avec les corrigés et les pannes à provoquer |
| [`02_Dossier_eleve.md`](02_Dossier_eleve.md) | Les 8 fiches activité, pas-à-pas, avec les cases à cocher |
| [`03_Nomenclature_et_achats.md`](03_Nomenclature_et_achats.md) | Ce qu'on commande, en quelle quantité, et les pièges d'achat |
| [`04_Outillage_et_consommables.md`](04_Outillage_et_consommables.md) | Les 5 postes, l'outillage mutualisé, le stock de départ |
| [`05_Plans_et_schema.md`](05_Plans_et_schema.md) | **Le cœur** : le schéma, les calculs, les arbitrages |
| [`06_Programmes_et_telechargements.md`](06_Programmes_et_telechargements.md) | La chaîne des 11 programmes, ce que chacun prouve |
| [`07_Adaptations_par_filiere.md`](07_Adaptations_par_filiere.md) | Une page par filière, avec les codes officiels |
| [`08_Evaluation.md`](08_Evaluation.md) | Grille sur 5 niveaux, auto-positionnement, chef-d'œuvre |
| [`09_Exploitation_froid_clim.md`](09_Exploitation_froid_clim.md) | Ce qu'on va mesurer sur une machine, et comment on le lit |
| [`10_Cahier_des_illustrations.md`](10_Cahier_des_illustrations.md) | Les 50 illustrations : faites, à photographier, à dessiner |
| [`POINTS-OUVERTS.md`](POINTS-OUVERTS.md) | Ce qui n'est pas tranché, et qui décide |

## Le code

```text
programmes/
├── 01-test-carte/        la carte répond, la LED clignote
├── 02-test-oled/         l'écran s'allume, et on sait quel contrôleur il a
├── 03-scanner-i2c/       qui est sur le bus, et à quelle adresse
├── 04-lire-une-voie/     une tension, en volts, sur la voie A0
├── 05-lire-une-ntc/      la première température — le pont diviseur en action
├── 06-lire-six-sondes/   les 6 voies, sonde absente détectée
├── 07-afficher/          les 6 valeurs à l'écran, en 2 colonnes
├── 08-niveau-piles/      la 8ᵉ voie, et le pourcentage approximatif
├── 09-trame-usb/         la trame du § 26, une ligne par seconde
├── 10-bluetooth-ble/     la même trame, en BLE, service NUS
└── 11-version-finale/    tout, plus l'étalonnage et la gestion des erreurs
```

Chaque programme tient dans **un seul fichier**, se téléverse seul, et ne
marche que si le précédent marchait. C'est la règle du § 25 du dossier maître :
l'élève ne reçoit jamais le code final d'un coup.

## Contrôle

```sh
node outils/verifier-module.mjs     # le filet du module
node outils/table-ntc.mjs           # le tableau R(T) du dossier, recalculé
node outils/bilan-energie.mjs       # l'autonomie, hypothèses affichées
```

Le filet vérifie ce qu'une machine peut vérifier : que les onze programmes sont
là et se suivent, que la trame est écrite pareil dans le firmware, dans le
dossier et dans l'outil d'acquisition, que la table NTC du dossier est bien
celle que le calcul donne, que les liens du site tombent sur des fichiers
existants, et que la charte est tenue — Calibri, fond clair, **aucune règle de
mode sombre**.

## Licence et charte

Même régime que le reste du dépôt : lire est libre, l'usage en établissement
d'enseignement est gratuit. Charte inerWeb Édu appliquée sans exception —
Calibri 14 pt minimum, titres Trebuchet MS, interligne 1,5, alignement à
gauche, bleu `#1b3a63`, orange `#ff6b35`, fond clair. **Jamais de mode sombre**,
y compris si on le demande.

*par F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO*
