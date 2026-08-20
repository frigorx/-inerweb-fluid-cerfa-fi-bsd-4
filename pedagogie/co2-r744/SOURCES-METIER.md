# Ce que le module affirme, et d'où ça vient

> À lire avant la relecture métier. Chaque valeur citée dans les douze escales figure ici avec
> son statut. **Rien n'a été contrôlé par un frigoriste à ce jour.**

## Les valeurs du fluide — cohérentes avec les tables usuelles du R744

| valeur affichée | où | statut |
|---|---|---|
| Point critique **31,0 °C / 73,8 bar** | escales 2, 3, 5 | valeur de référence du R744 (30,98 °C, 73,77 bar) |
| Point triple **−56,6 °C / 5,18 bar** | escales 2, 3, 12 | valeur de référence |
| Sublimation à 1,013 bar : **−78,5 °C** | escales 2, 3, 12 | valeur de référence |
| Pression à l'arrêt **≈ 57 bar à 20 °C** | escales 2, 12 | saturation à 20 °C ≈ 57,3 bar |
| Condensation 25 °C → **64,3 bar** | escale 4 | saturation à 25 °C |
| Évaporation −10 °C → **≈ 26 bar** | escale 4 | saturation à −10 °C ≈ 26,5 bar |
| PRP **1** / ODP **0** | escales 1, 2 | le CO₂ est la référence du PRP |
| Classe **A1** (NF EN 378) | escales 1, 2, 12 | classification de sécurité |
| R290 **A3**, R32 **A2L**, R404A **3 922**, R410A **2 088**, R32 **675** | escales 1, 2 | tables réglementaires ; le piège R290 = A3 est délibérément rappelé |

## Les ordres de grandeur — annoncés comme tels dans le module

| affirmation | où | ce que le module en dit |
|---|---|---|
| « jusqu'à **120 bar** côté haute pression » | escales 1, 12 | présenté comme un ordre de grandeur, avec renvoi à la plaque de l'installation et à la documentation du constructeur |
| Pressions **5 à 6 fois** celles d'un R404A | escale 4 | comparaison à températures égales, tableau d'illustration |
| Sous-refroidissement **4 à 8 K**, surchauffe **5 à 10 K** | escale 4 | donnés comme plages d'usage courant, le cahier des charges de la machine prime |
| Titre de vapeur **> 0,40** au point B | escales 5, 8 | sur l'exemple tracé seulement ; le calcul se refait sur diagramme officiel |
| Point de fonctionnement de l'exercice : BT −32 °C (13,4 bar), MT −8 °C (28,2 bar), intermédiaire 38 bar, HP 90 bar, sortie 35 °C | escale 8 | valeurs d'illustration reprises de la source |

⚠️ **Les tracés sont schématiques.** Le module le répète à chaque diagramme : pour relever une
valeur, on utilise un diagramme R744 publié ou un logiciel de propriétés du fluide.

## Le cadre réglementaire — la correction principale apportée à la source

| affirmation | source |
|---|---|
| Le R-744 relève de la **catégorie B** | arrêté du 21 novembre 2025, annexe II — transcrit dans `packs/fluides/referentiel-2025.json`, périmètre « toutes les activités de l'article 4, pour le dioxyde de carbone (R-744/CO2) » |
| Le **groupe G13** (17 codes) n'est évalué qu'en catégorie B | même source, colonne `cat` du référentiel |
| La **catégorie D** ne couvre que la récupération des gaz fluorés | même source, « article 4 point d uniquement — récupération des gaz à effet de serre fluorés » |
| Le R744 n'est pas un gaz fluoré : hors quota | règlement (UE) 2024/573, champ d'application |
| Les règles de sécurité **NF EN 378** s'appliquent pleinement | conservé de la source |

**Ce que la source disait et qui a été retiré** : « Attestation d'aptitude exigée (arrêté du
29 février 2016). Catégorie I pour tous équipements et toutes charges. » Ce régime est abrogé
et ne connaissait pas de catégorie CO₂.

## Les sources d'illustration consultées, et ce qui en a été fait

**intarcon.com — « Réfrigération au CO₂ transcritique »**, lien fourni par F. Henninot le
20/08/2026 : <https://www.intarcon.com/fr/refrigeration-au-co2-transcritique/>

Consultée pour vérifier le fond, PAS pour en reprendre les images : ce sont des illustrations
d'un site commercial, elles ne peuvent pas entrer dans un module diffusé sous licence inerWeb. C'est la règle déjà appliquée au tutoriel Coolselector, resté non diffusable
à cause des captures Danfoss.

Ce que la consultation a apporté :
- **le point ajouté à l'escale « La HP optimale »** : sur les courbes publiées (évaporation
  −10 °C, surchauffe 10 K, sortie de refroidisseur de gaz 35 °C), le maximum de COP et le
  maximum de puissance frigorifique ne sont pas à la même haute pression — la puissance
  continue de monter un peu après le sommet du COP ;
- confirmation de l'architecture booster décrite à l'escale 8 (bouteille flash, compresseurs
  MT et BT, deux niveaux de température) ;
- confirmation du vocabulaire de l'éjecteur (buse, gorge, chambre de mélange, diffuseur) et
  de l'allure de pression le long du parcours ;
- l'existence d'architectures à **sous-refroidissement externe** (par un petit circuit au
  propane) que le module ne traite pas — piste d'escale, à décider.

⚠️ **Si des schémas de ce type sont voulus dans le module, ils sont à REDESSINER** en SVG à
la charte, pas à copier.

## Les affirmations métier à faire contrôler en priorité

**Cette liste a été traitée le 20 août 2026 : voir `RELECTURE-METIER.md`**, qui porte les six
points, la décision prise sur chacun et ce qui a été modifié. Deux confirmés sans changement,
un diagnostic retiré, un écran ajouté, et l'alignement du site sur les 120 bar.

Ne pas se fier aux numéros d'escale qui figuraient ici : ils dataient d'avant la scission en
deux branches et l'ajout de l'escale « Le point triple ». `RELECTURE-METIER.md` repère les
passages par leur identifiant, qui ne bouge pas.

## Ce que le module ne prétend pas enseigner

Les gestes de la catégorie B (codes 13.06 à 13.14) : analyse de risques sur site, préparation
de la zone, épreuve de pression, essai sous vide, récupération, charge en phase gazeuse,
contrôle d'étanchéité par méthode directe, rapport d'intervention, contrôle des mesures de
santé et de sécurité. Ils sont cités dans le bilan de l'escale 12 comme relevant de la
pratique, pas de l'écran.
