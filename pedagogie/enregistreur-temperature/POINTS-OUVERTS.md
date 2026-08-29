# Points ouverts — ce que ce dossier ne tranche pas

> Les limites CONNUES du module, dites avant qu'un collègue ou un élève les
> trouve. Même règle que `docs/POINTS-DE-FRICTION.md` pour le logiciel : un
> trou annoncé est un trou gérable.
>
> Trois statuts : **BLOQUANT** (rien ne part en classe avant), **À MESURER**
> (le chiffre existe dans le dossier mais c'est une hypothèse), **OUVERT**
> (une décision attend son propriétaire).

---

## BLOQUANT — avant toute séance avec des élèves

### B1. Le prototype n°1 n'existe pas

Rien de ce dossier n'a été monté. Les onze programmes n'ont jamais été
téléversés dans un ESP32-C3 : cette machine n'en a pas.

**Ce qui est quand même acquis** : les calculs sont refaits par
`outils/table-ntc.mjs` et non recopiés ; la logique de conversion, de détection
de sonde et de formatage de trame est isolée dans des fonctions pures et
vérifiée par `outils/verifier-module.mjs` ; le schéma est cohérent broche à
broche avec le code.

**Ce qui ne l'est pas** : le comportement réel du bus I²C avec 3 m de fil de
sonde à côté, la stabilité de la liaison BLE en atelier, la tenue du
convertisseur en pointe d'émission, la lisibilité de l'écran à 2 m.

**Qui lève** : F. Henninot, en montant l'appareil professeur. C'est l'étape 7
du § 39 du dossier maître, et elle est la première de la liste pour une raison.

### B2. Les références commerciales ne sont pas figées

`03_Nomenclature_et_achats.md` donne des **familles de composants** avec leurs
critères de choix et leurs pièges, pas des liens fournisseurs. Trois raisons :
un lien meurt en six mois ; le prix d'un module chinois varie du simple au
double selon la semaine ; et le dossier doit rester utilisable par un collègue
qui n'achète pas au même endroit.

**Ce qu'il faut décider avant d'acheter** : le modèle exact de convertisseur
abaisseur-élévateur, et le modèle exact de commutateur 3 positions (voir O1).

**Qui lève** : F. Henninot, au moment de la commande. Le § 34 du dossier maître
demande ensuite une fiche par composant, avec photo — elle n'est pas écrite
tant que le composant n'est pas sur la table.

### B3. Le boîtier ABS n'est pas mesuré

Le gabarit de perçage `illustrations/gabarit-percage.svg` est dessiné pour un
boîtier **120 × 90 × 60 mm** avec un couvercle plat et 4 vis d'angle. Il est à
l'échelle 1:1 sur A4, avec un carré de contrôle de 50 mm à vérifier au réglet
après impression.

Mais un boîtier ABS de 120 × 90 réel a des congés de moulage, des colonnettes
d'angle et parfois une gorge de joint qui mangent 4 à 6 mm de chaque côté.
**Le gabarit ne sera juste qu'après passage du pied à coulisse sur le boîtier
acheté.**

**Qui lève** : F. Henninot, boîtier en main, pied à coulisse. Étapes 3, 4 et 13
du § 39.

---

## À MESURER — les chiffres qui sont des hypothèses

### M1. La consommation et l'autonomie

`outils/bilan-energie.mjs` annonce **39 mA et 54 h** avec les sondes à 20 °C.
Chaque ligne du bilan porte son statut : deux d'entre elles, les deux plus
grosses, sont marquées « À MESURER ».

- ESP32-C3 en BLE actif : 30 mA retenus, ordre de grandeur d'après la fiche
  Espressif. Le vrai chiffre dépend de l'intervalle de connexion, de la
  puissance d'émission et de ce que fait le processeur entre deux mesures.
- Écran OLED : 8 mA retenus pour un affichage texte. Un écran plein blanc
  monte à 25 mA et plus.

**Comment on lève** : sélecteur sur USB, voltampèremètre USB en série, relevé
sur 10 minutes dans les trois régimes (écran seul / écran + BLE annoncé /
écran + BLE connecté). Puis on remplace les deux valeurs dans
`CONSOMMATEURS` et on relance le script. Étape 8 du § 39.

**En attendant** : ne pas annoncer « deux jours d'autonomie » à une classe.
Dire « le calcul donne environ deux jours, on va le vérifier » — c'est une
séance de mesure, pas un aveu de faiblesse.

### M2. La précision réelle des sondes

Le dossier annonce ce que le modèle β donne avec un composant parfait. Une NTC
10 kΩ B3950 du commerce est vendue en tolérance **± 1 %** sur R25 et **± 1 %**
sur B — souvent moins bien, et jamais garantie sur un lot bon marché.

Ordre de grandeur de l'erreur qui en découle, avant étalonnage : **± 0,5 à
± 1,5 K** selon la température, plus l'erreur du modèle β lui-même en dehors de
la plage 0–50 °C.

C'est exactement ce que la séance 3B fait tomber : un offset par sonde,
mesuré contre un thermomètre de référence. Après étalonnage à un point, il
reste l'erreur de pente — de l'ordre de quelques dixièmes sur ± 30 K autour du
point d'étalonnage.

**Comment on lève** : bain d'eau glacée fondante (0 °C, point fixe gratuit et
fiable à ± 0,1 K si la glace est en excès et l'eau agitée) et second point
autour de 40 °C au thermomètre de référence. Étape 10 du § 39.

**Ce que ça ne lèvera pas** : l'appareil ne deviendra pas un instrument
raccordé. Le § 4 du dossier maître le dit déjà, ce dossier ne le contredit pas.

### M3. Le comportement du bus I²C avec les sondes en place

Six câbles de sonde de 1 à 3 m entrent dans le boîtier et passent à quelques
millimètres du bus I²C. Le pont diviseur a une impédance de source de 5 kΩ au
point milieu — c'est élevé, et ça capte.

Deux parades sont **prévues au schéma mais non validées** : un condensateur de
100 nF du point milieu à la masse sur chaque voie (filtre passe-bas, constante
de temps 0,5 ms, sans effet sur une mesure de température), et le moyennage de
16 lectures dans le firmware.

**Comment on lève** : sonde plongée dans un bain stable, 5 minutes
d'enregistrement, écart-type de la voie. Objectif : moins de 0,1 K crête à
crête. Si ça bruite, on augmente le condensateur avant de toucher au code.

---

## OUVERT — décisions qui attendent leur propriétaire

### O1. Combien de pôles au commutateur ?

Le § 3.3 du dossier maître demande trois positions PILES–0–USB. Reste à savoir
combien de pôles.

**Un seul pôle suffit, et le schéma n'en utilise qu'un.** La seule fonction
électrique du sélecteur est de couper le pôle + du porte-piles. Le pont de
mesure des piles étant câblé **après** le sélecteur (§ 8.4 de
`05_Plans_et_schema.md`), il se coupe tout seul en position 0 et en position
USB : il n'y a rien à donner à un second pôle.

**Ce qui reste ouvert, c'est l'achat.** Un inverseur 1 pôle 3 positions
(SP3T, ON-OFF-ON) et un 2 pôles 3 positions (DP3T) se trouvent au même prix
selon les semaines. Le schéma marche avec les deux ; avec un 2 pôles, le
second pôle reste **non câblé**, et le dossier élève dit de ne pas s'en
inquiéter.

**Qui décide** : F. Henninot, selon ce que le fournisseur a en rayon. Le seul
critère qui compte est mécanique : le sélecteur doit être **accessible sans
ouvrir le boîtier** (§ 5 du dossier maître) et supporter d'être manœuvré
plusieurs fois par séance pendant des années.

### O2. Faut-il couper les ponts diviseurs entre deux mesures ?

Les 6 ponts consomment 0,9 mA en permanence à 20 °C, 1,8 mA à 80 °C — 2 à 4 %
du total. Un transistor MOSFET canal P commandé par une broche de l'ESP32
couperait l'excitation entre deux mesures et diviserait cette ligne par 20.

**Position retenue pour la version de base : NON.** Le gain est marginal devant
les 38 mA du reste, et ça ajoute un composant, une piste et un mode de panne
(« pourquoi mes six voies lisent zéro ? ») dans un montage fait par des
débutants. C'est rangé au § 36 du dossier maître, avec les évolutions.

**Réouvrable si** : M1 montre que l'ESP32 consomme beaucoup moins que prévu,
auquel cas la proportion change.

### O3. Trame BLE : notification simple ou service structuré ?

Le module transmet la trame texte du § 26 sur un service **NUS** (Nordic UART
Service), le seul qui soit lisible à la fois par une page Web Bluetooth, par
nRF Connect et par les terminaux série BLE Android courants — sans installer
quoi que ce soit.

Un vrai service GATT « Environmental Sensing » (0x181A) avec six
caractéristiques Temperature serait plus orthodoxe et lisible par des
applications génériques de mesure.

**Position retenue : NUS.** Parce que le § 27 demande une page web plutôt
qu'une application, et parce qu'une trame texte se lit à l'œil nu par un élève
qui débogue. Le service normalisé est rangé aux évolutions.

**Qui décide si on change** : personne avant que le prototype tourne.

### O4. Faut-il un fusible réarmable ?

Le § 6.1 du dossier maître en prévoit un. Le schéma le place en série avec le
porte-piles, calibre 200 mA.

Sa vraie utilité n'est pas de protéger le montage — l'ESP32 mourra bien avant
que le fusible réagisse. Elle est de protéger **les piles** en cas de
court-circuit franc dans un montage d'élève : trois AA alcalines en
court-circuit débitent plusieurs ampères et chauffent. C'est le seul risque
thermique du projet.

**Position retenue : on le garde**, à ce titre-là, et le dossier élève le dit
comme ça.

### O5. Le module RGPD

Le module ne collecte rien : les mesures sont des températures, l'outil
d'acquisition ne sort pas du navigateur, aucune requête réseau n'est émise.

**Mais** : si un jour un enseignant enregistre « les mesures du binôme
Dupont-Martin » dans un fichier nommé, on entre dans le champ. Le dossier élève
demande donc de nommer les fichiers par le **numéro de poste**, pas par le nom
de l'élève. C'est écrit une fois, et c'est suffisant à ce stade.

**À rouvrir si** : le module est branché sur le logiciel inerWeb Fluide. Le
§ 16.5 du RGPD du dépôt bloque déjà les relevés élèves à la tablette, la même
réserve s'appliquera ici.

---

## Ce qui n'est PAS un point ouvert

Pour éviter qu'on les rouvre à chaque relecture, voici trois choses tranchées,
avec leur raison :

| Question | Tranché | Pourquoi |
|---|---|---|
| NTC côté masse ou côté 3,3 V ? | **côté masse** | La broche du jack ne porte alors jamais le 3,3 V ; un court-circuit d'insertion est sans effet |
| Mesurer la tension d'excitation ? | **oui, voie A2 du second ADS1115** | Le rapport des deux lectures annule l'erreur de gain du convertisseur ; c'est gratuit, les voies étaient libres |
| Piles et USB en parallèle ? | **jamais de retour vers les piles** | Schottky en série avec la sortie du convertisseur ; l'USB peut cohabiter sans rien casser |
