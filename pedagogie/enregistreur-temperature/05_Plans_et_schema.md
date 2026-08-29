# 05 — Plans et schéma

**Le document technique de référence.** Tout le reste du dossier en découle : la
nomenclature, les programmes, les contrôles avant mise sous tension, les pannes
à provoquer.

Le dossier maître fixait l'architecture (§ 3). Il ne fixait ni les valeurs, ni
les broches, ni l'affectation des voies. C'est ce que ce document tranche, avec
les calculs à l'appui. **Aucune valeur n'est recopiée d'ailleurs** : celles qui
se calculent sont produites par `outils/table-ntc.mjs` et
`outils/bilan-energie.mjs`, celles qui se mesurent portent la mention
« À MESURER ».

---

## 1. Ce que le schéma doit tenir

Reprise du § 3.1 du dossier maître, en dix lignes contraignantes :

1. six sondes de température, mesurées simultanément ;
2. affichage local ;
3. transmission USB ;
4. transmission Bluetooth BLE ;
5. fonctionnement sur piles internes ;
6. alimentation par USB en programmation et en acquisition filaire ;
7. enregistrement sur PC ou Android ;
8. état approximatif des piles ;
9. sélecteur **PILES – 0 – USB** à trois positions ;
10. **aucune liaison directe piles / USB**, protection anti-retour obligatoire.

Deux contraintes s'ajoutent, qui viennent du public et non du cahier des
charges : le montage est fait par des **débutants au fer à souder**, et il doit
rester **réparable au multimètre**, sans oscilloscope.

---

## 2. Vue d'ensemble

Schéma dessiné : [`illustrations/schema-general.svg`](illustrations/schema-general.svg).

```text
     ┌── T1 ──┐                         BUS I²C (SDA/SCL)
     ├── T2 ──┤   ┌──────────────┐    ┌──────────────────────────────┐
     ├── T3 ──┼──▶│  A2 ADS1115  │◀───┤                              │
     └── T4 ──┘   │     0x48     │    │                              │
                  └──────────────┘    │                              │
     ┌── T5 ──┐   ┌──────────────┐    │       A1  ESP32-C3           │
     ├── T6 ──┤   │  A3 ADS1115  │◀───┤       SuperMini              │
     ├─ Vexc ─┼──▶│     0x49     │    │                              │
     └─ Piles─┘   └──────────────┘    │   ┌────────┬────────┐        │
                                      └───┤        │        │────────┘
                                          ▼        ▼        ▼
                                     A4 OLED     USB-C     BLE
                                    (0x3C)     (natif)   (NUS)
```

Trois circuits sur un seul bus I²C, trois adresses distinctes, aucune
collision. C'est ce qui permet de tout câbler avec **deux fils de signal**
(plus l'alimentation) — et c'est le premier fait qu'un élève doit comprendre
en séance 3A.

---

## 3. Le pont diviseur — la décision qui commande le reste

### 3.1 La NTC va du côté de la masse

```text
        3,3 V (V_exc)
           │
          ┌┴┐
          │ │  R1 … R6   10 kΩ  ±0,1 %
          └┬┘
           ├──────────── point milieu ─────▶ entrée ADS1115
           │                    │
          ┌┴┐                  ─┴─  C3 … C8  100 nF
          │ │  NTC (via J1)    ─┬─
          └┬┘                   │
           │                    │
          ─┴─ masse ────────────┴─
```

**Pourquoi la NTC en bas et pas en haut.** Les deux montages donnent une
tension exploitable ; un seul est raisonnable dans un boîtier d'élève.

| | NTC en bas (retenu) | NTC en haut (écarté) |
|---|---|---|
| Ce que porte la **broche** du jack | le point milieu, 0 à 3,3 V, 165 µA max | le point milieu, idem |
| Ce que porte le **corps** du jack | **la masse** | **le 3,3 V** |
| Enfoncement de biais, corps qui frotte la broche | point milieu à la masse : 330 µA dans R, rien ne bouge | **3,3 V à la masse** : le rail s'effondre, six fois par séance |
| Sonde débranchée | V = V_exc → détectée « ouverte » | V = 0 → confondue avec un court-circuit |

Les six corps de jack sont donc tous réunis à la masse, sur **un seul fil de
masse commun** qui fait le tour des six embases. Un fil au lieu de six : c'est
aussi ce qui rend le câblage tenable en 2 heures.

### 3.2 Pourquoi 10 kΩ, et pourquoi 0,1 %

**La valeur.** La sensibilité d'un pont NTC est maximale quand la résistance
fixe vaut la résistance de la sonde. En choisissant R = R25 = 10 kΩ, on place
le maximum de sensibilité à 25 °C — au milieu de la plage d'atelier.
Le tableau du § 3.4 le montre : 37,4 mV/K à 20 °C, encore 30,1 mV/K à 40 °C,
et 30,9 mV/K à 0 °C.

**La tolérance.** C'est le seul composant dont l'erreur se transforme
directement en erreur de température, sans qu'aucun étalonnage à un point ne
la rattrape complètement. Une résistance à 1 % donne, à 25 °C, une erreur de
1 % sur R_ntc calculée, soit :

```text
ΔT = (ΔR/R) × T² / B = 0,01 × 298,15² / 3950 ≈ 0,22 K
```

À 0,1 %, on tombe à **0,02 K** — négligeable devant tout le reste. La
résistance de précision coûte quelques centimes de plus et supprime un terme
d'erreur. C'est le meilleur rapport qualité-prix du montage.

### 3.3 Le condensateur de 100 nF : deux fonctions, pas une

Il est facile de le prendre pour un simple « anti-parasites ». Il en fait
deux choses :

1. **Filtre passe-bas.** L'impédance de source au point milieu vaut au maximum
   R ∥ R_ntc = **5 kΩ** (à 25 °C, quand les deux résistances sont égales).
   Avec 100 nF : τ = 0,5 ms, coupure à 320 Hz. Une température ne bouge pas à
   320 Hz ; le 50 Hz du réseau et les parasites du câble de sonde, si.
2. **Réservoir de charge pour l'ADS1115.** L'entrée du convertisseur est un
   étage à capacités commutées : à chaque conversion, il vient prendre une
   petite charge à la source. Avec 5 kΩ de source, c'est à la limite du
   raisonnable ; le condensateur fournit cette charge instantanément et la
   source n'a plus qu'à le recharger doucement.

Sans lui, la mesure serait juste **en moyenne** mais bruitée. Avec lui, elle
est stable. Le programme 06 moyenne quand même 4 lectures — filtrage
matériel *et* logiciel, ceinture et bretelles.

### 3.4 Le tableau de référence

Produit par `node outils/table-ntc.mjs`. Hypothèses : NTC 10 kΩ B3950,
R_ref 10 kΩ 0,1 %, V_exc 3,30 V, ADS1115 en calibre ±4,096 V (1 pas = 125,0 µV).

| °C | R_NTC | V mesurée | code ADS | sensibilité | °C par pas |
|---:|---:|---:|---:|---:|---:|
| -30 | 200,20 kΩ | 3,143 V | 25 144 | 10,0 mV/K | 0,0125 |
| -20 | 105,38 kΩ | 3,014 V | 24 112 | 16,1 mV/K | 0,0078 |
| -10 | 58,25 kΩ | 2,816 V | 22 532 | 23,5 mV/K | 0,0053 |
| -5 | 44,03 kΩ | 2,689 V | 21 513 | 27,3 mV/K | 0,0046 |
| 0 | 33,62 kΩ | 2,543 V | 20 348 | 30,9 mV/K | 0,0040 |
| +5 | 25,92 kΩ | 2,381 V | 19 051 | 33,8 mV/K | 0,0037 |
| +10 | 20,17 kΩ | 2,206 V | 17 651 | 36,0 mV/K | 0,0035 |
| +15 | 15,84 kΩ | 2,023 V | 16 182 | 37,2 mV/K | 0,0034 |
| +20 | 12,54 kΩ | 1,836 V | 14 685 | 37,4 mV/K | 0,0033 |
| +25 | 10,00 kΩ | 1,650 V | 13 200 | 36,7 mV/K | 0,0034 |
| +30 | 8,04 kΩ | 1,470 V | 11 764 | 35,0 mV/K | 0,0036 |
| +40 | 5,30 kΩ | 1,143 V | 9 147 | 30,1 mV/K | 0,0042 |
| +50 | 3,59 kΩ | 0,871 V | 6 971 | 24,3 mV/K | 0,0052 |
| +60 | 2,49 kΩ | 0,657 V | 5 257 | 18,7 mV/K | 0,0067 |
| +80 | 1,27 kΩ | 0,372 V | 2 976 | 10,5 mV/K | 0,0120 |
| +100 | 698 Ω | 0,215 V | 1 721 | 5,7 mV/K | 0,0219 |

> **La colonne qui frappe les élèves, c'est la dernière.** Le convertisseur
> découpe le degré en environ **300 morceaux** autour de la température
> ambiante. La résolution n'est jamais ce qui limite cet appareil : c'est la
> sonde, le modèle, et l'endroit où on la pose. Le dire tôt évite le mirage
> du « 16 bits donc précis ».

### 3.5 L'auto-échauffement : le piège qu'on ne voit pas

La sonde est traversée par un courant. Ce courant la chauffe. Elle mesure donc
sa propre chaleur en plus de celle du milieu.

| Point de mesure | Puissance dissipée dans la NTC | Échauffement (δ = 2,5 mW/K) |
|---|---:|---:|
| −20 °C | 0,086 mW | **0,03 K** |
| +25 °C | 0,272 mW | **0,11 K** |
| +80 °C | 0,109 mW | **0,04 K** |

δ est la **constante de dissipation** de la sonde, donnée par le fabricant
(2 à 5 mW/K pour une sonde à gaine inox en air calme, davantage dans un
liquide). La valeur de 2,5 mW/K retenue ici est **pessimiste en air calme**.

Conclusion : l'auto-échauffement plafonne à **un dixième de degré**, dans le
cas le moins favorable, et disparaît complètement dans l'étalonnage à un point
puisqu'il est presque constant. On ne fait rien de plus.

C'est aussi la réponse à la question « pourquoi ne pas mettre 1 kΩ au lieu de
10 kΩ pour avoir plus de signal ? » : dix fois plus de courant, cent fois plus
de puissance, **11 K d'auto-échauffement**. La sonde mesurerait son propre
fer à souder.

### 3.6 Sonde absente, sonde en court-circuit

Le pont donne un diagnostic gratuit, sans un composant de plus :

| État | Tension lue | Rapport V/V_exc | Ce que l'appareil affiche |
|---|---|---|---|
| Sonde branchée, normale | 0,2 à 3,1 V | 0,06 à 0,95 | la température |
| **Sonde absente / fil coupé** | ≈ V_exc | **> 0,97** | `---` et le voyant « sonde ? » |
| **Court-circuit / fiche en biais** | ≈ 0 V | **< 0,01** | `CC` |

Les deux seuils ont été choisis, pas subis :

- **0,97** correspond à R > 323 kΩ, soit **−37,0 °C**. Toute température
  au-dessus de −37 °C est donc mesurable, ce qui couvre largement le négatif
  d'une chambre froide. Un seuil plus permissif (0,99 → −55 °C) ferait
  afficher « −50 °C » pour une sonde débranchée : inacceptable devant une
  classe.
- **0,01** correspond à R < 101 Ω, soit **+183,3 °C**. Hors de portée de la
  sonde comme de son câble.

**Fenêtre de mesure retenue : −37 °C à +183 °C.** La vraie limite haute n'est
pas électronique : c'est le **câble** de la sonde (PVC, typiquement 105 °C).
Le dossier élève le dit, et c'est un point de vigilance à l'oral.

---

## 4. Les deux convertisseurs et le plan des huit voies

### 4.1 Adressage

| Repère | Broche ADDR reliée à | Adresse I²C |
|---|---|---|
| **A2** — ADS1115 n°1 | **GND** | `0x48` |
| **A3** — ADS1115 n°2 | **VDD** | `0x49` |

L'ADS1115 offre quatre adresses (ADDR sur GND, VDD, SDA, SCL). On n'en utilise
que deux, les deux les plus simples à câbler et à contrôler au multimètre :
**ADDR à 0 V** ou **ADDR à 3,3 V**. C'est une panne à provoquer idéale
(§ 29 du dossier maître) : intervertir les deux fils ADDR, et voir le scanner
I²C ne trouver qu'un seul circuit à `0x48`… ou deux fois la même adresse et
un bus muet.

### 4.2 Affectation des voies — **six sondes, huit entrées, zéro voie perdue**

| Circuit | Voie | Mesure | Câblage |
|---|---|---|---|
| A2 `0x48` | A0 | **T1** | point milieu du pont 1 |
| A2 `0x48` | A1 | **T2** | point milieu du pont 2 |
| A2 `0x48` | A2 | **T3** | point milieu du pont 3 |
| A2 `0x48` | A3 | **T4** | point milieu du pont 4 |
| A3 `0x49` | A0 | **T5** | point milieu du pont 5 |
| A3 `0x49` | A1 | **T6** | point milieu du pont 6 |
| A3 `0x49` | A2 | **V_exc / 2** | R7-R8, deux 10 kΩ 0,1 % |
| A3 `0x49` | A3 | **V_piles / 2** | R9-R10, deux 100 kΩ 1 % |

### 4.3 Pourquoi mesurer sa propre tension d'excitation

C'est le point le plus intéressant du montage, et il ne coûte rien.

Le pont donne : `V = V_exc × R_ntc / (R_ntc + R_ref)`.
Pour remonter à R_ntc, il faut **connaître V_exc**.

- Si on la suppose égale à 3,300 V alors qu'elle vaut 3,25 V (régulateur à
  1,5 % près, chute variable dans la diode, piles qui faiblissent), l'erreur
  sur le rapport est de 1,5 %, l'erreur sur R_ntc d'environ 3 %, soit
  **0,7 K** — le double de tout le reste du budget d'erreur.
- Si on la mesure **avec le même convertisseur**, l'erreur de gain de ce
  convertisseur disparaît. Démonstration en une ligne, en notant `g` le gain
  réel inconnu :

```text
R_ntc = R_ref × m_ntc / (2·m_exc − m_ntc)
      = R_ref × (g·V) / (g·V_exc − g·V)
      = R_ref × V / (V_exc − V)          ← g s'en va
```

Il ne reste que l'erreur du **rapport** R7/R8. Avec deux résistances 0,1 %
prises dans le même sachet que celles des ponts, elle vaut au pire 0,2 %, soit
**0,06 K**. On a divisé l'erreur par dix, avec deux résistances qu'on avait
déjà.

> **Pourquoi diviser par deux au lieu de mesurer V_exc directement ?**
> L'entrée de l'ADS1115 doit rester dans ses rails d'alimentation. Mesurer
> 3,30 V sur un circuit alimenté en 3,30 V, c'est travailler exactement à la
> limite. Un diviseur par deux ramène la lecture à 1,65 V, au milieu de la
> plage, et le calcul ci-dessus montre que le rapport se retrouve intact.

### 4.4 Calibre, cadence et moyenne

| Réglage | Valeur retenue | Pourquoi |
|---|---|---|
| Calibre (PGA) | **±4,096 V** | La plus petite plage qui contient les 3,3 V du pont. ±6,144 V gaspillerait un bit ; ±2,048 V écrêterait tout ce qui est sous 5 °C. |
| Cadence | **128 éch./s** | Valeur par défaut, la plus filtrée du circuit. Une conversion prend ≈ 8 ms. |
| Moyenne logicielle | **4 lectures par voie** | 8 voies × 4 × 8,5 ms ≈ **272 ms** par balayage complet. Il reste les trois quarts de la seconde pour afficher et émettre. |

Une seconde par relevé, c'est déjà bien plus rapide que le phénomène observé :
la constante de temps d'une sonde à gaine inox dans l'air est de **plusieurs
dizaines de secondes**. Le dire aux élèves évite qu'ils courent après le
dixième de degré.

---

## 5. Le bus I²C — et le piège des broches de démarrage

### 5.1 Les broches retenues

| Signal | Broche ESP32-C3 |
|---|---|
| **SDA** | **GPIO5** |
| **SCL** | **GPIO6** |

> ### ⚠ Point de vigilance — ne PAS utiliser GPIO8 et GPIO9
> C'est pourtant ce que font la plupart des exemples trouvés en ligne, parce
> que ce sont les broches I²C par défaut de l'ESP32-C3 sous Arduino.
>
> **GPIO9 est la broche de mode de démarrage** : maintenue au niveau bas au
> moment de la mise sous tension, la carte part en mode téléversement au lieu
> de démarrer le programme. **GPIO8 est également une broche de démarrage**, et
> porte de surcroît la LED de la carte sur la plupart des exemplaires.
>
> Un module I²C défectueux qui tient SDA au niveau bas rend alors la carte
> **impossible à démarrer** — et le symptôme (« ma carte ne fait plus rien »)
> n'a aucun rapport visible avec la cause. On déplace donc le bus sur GPIO5 et
> GPIO6, qui ne commandent rien au démarrage.
>
> Conséquence dans le code : il faut nommer les broches explicitement, avec
> `Wire.setPins(5, 6)` **avant** `Wire.begin()`. C'est fait dans tous les
> programmes à partir du n°02.

### 5.2 Résistances de tirage

Aucune à ajouter. Les trois modules (deux ADS1115, un OLED) portent chacun
leurs résistances de tirage de 10 kΩ ; en parallèle, cela donne environ
3,3 kΩ, ce qui est correct à 3,3 V et à 100–400 kHz.

**Si le scanner I²C ne trouve rien** : contrôler d'abord l'alimentation des
modules, ensuite la continuité SDA/SCL, et seulement en dernier envisager de
retirer les tirages d'un module. C'est l'ordre imposé par le § 29 du dossier
maître (constater → hypothèse → mesurer → identifier → corriger → valider).

### 5.3 Longueur et cheminement

Le bus reste **à l'intérieur du boîtier**, quelques centimètres. Les six
câbles de sonde, eux, font 1 à 3 m et rentrent par les côtés.

**Règle de câblage** : les fils SDA/SCL passent **au plus court**, contre le
fond du boîtier, et **ne longent jamais** un câble de sonde sur plus de 2 cm.
C'est ce qu'on vérifie au montage à blanc de la séance 2A, avant de souder
quoi que ce soit.

---

## 6. L'ESP32-C3 SuperMini — brochage retenu

| Broche | Usage dans le montage | Note |
|---|---|---|
| `3V3` | **Entrée** du rail 3,3 V | alimente la carte quand on est sur piles |
| `GND` | masse commune | |
| `5V` | **non connectée** | reliée au VBUS de l'USB, on n'y touche pas |
| `GPIO5` | SDA | |
| `GPIO6` | SCL | |
| `GPIO8` | LED de la carte (à vérifier) | le programme 01 sert à ça |
| `GPIO0..4, 7, 10, 20, 21` | libres | réservées aux évolutions du § 36 |

### 6.1 Alimenter la carte par sa broche 3V3

C'est un usage prévu et courant : la broche `3V3` est la sortie du régulateur
de la carte, et elle accepte d'être pilotée de l'extérieur.

**Ce qui se passe quand l'USB n'est pas branché** : le régulateur de la carte
se retrouve avec sa sortie à 3,3 V et son entrée en l'air. Elle remonte à
environ 3 V par la diode parasite du régulateur, et le VBUS du connecteur USB
se retrouve à ce potentiel. **Sans effet** : rien n'y est branché. Aucune diode
supplémentaire n'est nécessaire de ce côté.

### 6.2 Téléversement

L'ESP32-C3 possède un port USB natif : le téléversement se fait sans adaptateur
et sans manipulation dans le cas normal. Si la carte ne se présente pas :
maintenir le bouton **BOOT** enfoncé, brancher l'USB, relâcher.

**Le sélecteur doit être sur USB pendant le téléversement.** Pas parce que ça
ne marcherait pas autrement, mais parce que c'est la règle qu'on enseigne, et
qu'une règle simple vaut mieux qu'une explication exacte que l'élève oubliera.

---

## 7. L'écran — le piège du 1,3 pouce

> ### ⚠ Point de vigilance — SSD1306 ou SH1106 ?
> Les écrans OLED I²C 128 × 64 se vendent en deux tailles, et **la taille
> détermine presque toujours le contrôleur** :
>
> | Taille | Contrôleur habituel | Particularité |
> |---|---|---|
> | 0,96" | **SSD1306** | mémoire 128 colonnes, alignée sur l'écran |
> | **1,3"** (retenu) | **SH1106** | mémoire **132** colonnes : l'image apparaît **décalée de 2 pixels** si on la pilote en SSD1306 |
>
> Symptôme d'une erreur de contrôleur : l'écran s'allume, affiche quelque
> chose, mais **décalé de deux pixels** avec une colonne parasite sur un bord.
> Ce n'est pas une panne de câblage. C'est une ligne à changer dans le
> programme.
>
> Les programmes livrés utilisent la bibliothèque **U8g2**, qui gère les deux :
> une seule ligne à commenter/décommenter en tête de fichier. Le programme 02
> existe pour trancher cette question **avant** que la classe s'y perde.

Adresse I²C : `0x3C` dans l'immense majorité des cas, `0x3D` sur certains
modules (pontet à souder au dos). Le scanner du programme 03 le dit.

---

## 8. L'alimentation — PILES – 0 – USB

Schéma dessiné : [`illustrations/alimentation.svg`](illustrations/alimentation.svg).

```text
   B1  porte-piles        F1  PPTC 200 mA      S1  sélecteur 3 positions
  ┌───────────────┐                          ┌────────────────────────┐
  │  3 × AA     + ├──────────[═════]─────────┤ ●  PILES               │
  │             − ├──┐                       │ ○  0 / ARRÊT   (repos) │
  └───────────────┘  │                       │ ○  USB   (non relié)   │
                     │                       └───────────┬────────────┘
                     │                                   │
                     │                     nœud « pack commuté »
                     │                        ┌──────────┴──────────┐
                     │                        │                     │
                     │                       ┌┴┐ R9 100 kΩ   ┌──────▼──────────┐
                     │                       └┬┘             │ U1  abaisseur-  │
                     │        ──▶ A3 voie A3 ─┤              │     élévateur   │
                     │                       ┌┴┐ R10 100 kΩ  │     3,55 V      │
                     │                       └┬┘             └──────┬──────────┘
                     │                        │                     │
                     │                        │              D1 ──▶├─ Schottky
                     │                        │                     │  ANTI-RETOUR
                     │                        │                     │
   USB-C façade ─▶ ESP32-C3 ─▶ régulateur de carte ────────────┐    │
                     │                        │                │    │
                     │                        │        ┌───────┴────┴───────┐
                     │                        │        │  RAIL 3,3 V (V_exc) │──▶ A2, A3, A4
                     │                        │        └──────────┬──────────┘    + les 6 ponts
                     │                        │                   │
                     │                        │            C1 100 µF ═╪═ C2 100 nF
                     │                        │                   │
                     └────────────────────────┴───────────────────┴──── MASSE COMMUNE
```

### 8.1 Ce que fait chaque position

| Position | Piles | USB branché ? | Rail alimenté par |
|---|---|---|---|
| **PILES** | connectées | non | le convertisseur, à travers D1 |
| **PILES** | connectées | *oui, par mégarde* | les deux, charge partagée — **rien ne casse** |
| **0** | coupées | non | rien : appareil éteint |
| **0** | coupées | oui | l'USB (l'appareil s'allume — c'est normal) |
| **USB** | coupées | oui | l'USB, par le régulateur de l'ESP32 |
| **USB** | coupées | non | rien : appareil éteint |

### 8.2 L'interdit, et comment il est tenu

Le cahier des charges dit : *« éviter toute injection de courant USB vers les
piles »*. Ce n'est pas une précaution de style — trois piles alcalines
rechargées de force chauffent, gonflent et coulent.

**D1, diode Schottky en série avec la sortie du convertisseur, tient cet
interdit à elle seule et de façon inconditionnelle.** Le courant ne peut
traverser une diode que dans un sens. Quelle que soit la position du sélecteur,
quel que soit l'ordre des branchements, quelle que soit l'erreur de l'élève,
**aucun électron ne peut remonter vers les piles.**

Le sélecteur, lui, ne tient pas cet interdit : il tient la règle d'usage. Les
deux sont nécessaires, ils ne servent pas à la même chose. C'est exactement ce
que la fiche de contrôle du § 28 vérifie en deux lignes distinctes.

> **Le cas « les deux à la fois » est toléré, pas recommandé.** Le rail se
> retrouve alimenté par deux sources voisines de 3,3 V, chacune limitée en
> courant ; elles se partagent la charge sans se battre. Un montage
> irréprochable emploierait un transistor MOSFET canal P en diode idéale — c'est
> rangé aux évolutions (§ 36), parce qu'un composant de plus dans un montage de
> débutant coûte plus cher en pannes qu'il ne rapporte.

### 8.3 Le réglage du convertisseur — une activité, pas un réglage d'usine

La chute dans D1 vaut **0,20 à 0,30 V** selon le courant. On règle donc la
sortie du convertisseur **plus haut** que 3,3 V, et on vérifie le rail.

**Procédure (séance 3A, 10 minutes) :**

1. Sélecteur sur **0**. Piles en place.
2. Multimètre entre la sortie du convertisseur et la masse.
3. Sélecteur sur **PILES**, appareil en fonctionnement normal (écran allumé).
4. Tourner le potentiomètre du convertisseur jusqu'à lire **3,55 V** en sortie.
5. Déplacer le multimètre sur le **rail** (broche 3V3 de l'ESP32) : on doit
   lire **3,25 à 3,35 V**.
6. Vérifier à l'écran : l'appareil affiche V_exc, il doit annoncer la **même
   valeur** que le multimètre, à 0,02 V près.

L'étape 6 est celle qui compte : **l'appareil mesure sa propre alimentation**,
et un élève vient de vérifier un instrument avec un autre instrument. C'est de
la métrologie, en cinq minutes, sans en prononcer le mot.

### 8.4 La mesure des piles

R9-R10 (deux 100 kΩ) sont câblées **après le sélecteur**, sur l'entrée du
convertisseur. Trois conséquences, toutes voulues :

- en position **0** ou **USB**, le diviseur lit **0 V** : l'appareil sait qu'il
  n'est pas sur piles et affiche `USB` au lieu d'un pourcentage ;
- il ne consomme **rien** quand l'appareil est éteint ;
- les 24 µA qu'il consomme en marche sont négligeables (0,06 % du total).

Tension lue : la moitié de la tension du pack, soit **2,40 V** pour trois piles
neuves (4,80 V) et **1,35 V** en fin de vie (2,70 V) — les deux dans les rails
du convertisseur.

**Le pourcentage est approximatif, et le dossier ne prétend pas autre chose.**
La courbe de décharge d'une alcaline n'est pas une droite. La table utilisée
par le programme 08 est une interpolation en quatre points, donnée en clair
dans le code, avec le commentaire qui va avec.

### 8.5 Le fusible F1

Un PPTC réarmable **200 mA** en série avec le pôle + du porte-piles.

Il ne protège pas l'électronique : l'ESP32 aura rendu l'âme bien avant qu'il
réagisse. **Il protège les piles.** Trois AA alcalines en court-circuit franc
débitent plusieurs ampères et chauffent vite. Dans un montage réalisé par des
débutants, c'est le seul risque thermique du projet — et il coûte trente
centimes à supprimer.

### 8.6 Le bilan d'énergie

Produit par `node outils/bilan-energie.mjs`, sondes à 20 °C :

| Consommateur | Courant | Statut du chiffre |
|---|---:|---|
| ESP32-C3 — BLE actif, écran rafraîchi 1 fois/s | 30,00 mA | **À MESURER** — ordre de grandeur (fiche Espressif) |
| Écran OLED 128 × 64 — texte, ~25 % de pixels | 8,00 mA | **À MESURER** — dépend des pixels allumés |
| 2 × ADS1115 — conversion continue | 0,30 mA | fiche Texas Instruments, 150 µA par circuit |
| 6 ponts diviseurs NTC | 0,88 mA | calculé |
| Pont de mesure des piles | 0,02 mA | calculé |
| **Total** | **39,2 mA** | |

Énergie embarquée 8,3 Wh, rendement retenu 85 %, puissance appelée 0,13 W :
**autonomie calculée ≈ 54 h, soit un peu plus de deux jours.**

> ⚠ **Ce n'est pas une mesure.** Les deux plus grosses lignes sont des
> hypothèses. L'étape 8 du § 39 du dossier maître demande de mesurer la
> consommation réelle — tant que ce n'est pas fait, on annonce en classe
> « le calcul donne deux jours, nous allons le vérifier ». Voir
> [`POINTS-OUVERTS.md`](POINTS-OUVERTS.md) § M1.

---

## 9. Nomenclature électrique — repères du schéma

| Repère | Désignation | Valeur / référence | Qté |
|---|---|---|---:|
| **A1** | Microcontrôleur | ESP32-C3 SuperMini USB-C | 1 |
| **A2** | Convertisseur A/N n°1 | ADS1115, ADDR → GND, `0x48` | 1 |
| **A3** | Convertisseur A/N n°2 | ADS1115, ADDR → VDD, `0x49` | 1 |
| **A4** | Afficheur | OLED 1,3" 128×64 I²C, `0x3C` | 1 |
| **B1** | Porte-piles | 3 × AA, avec fils | 1 |
| **C1** | Réservoir du rail | 100 µF / 10 V, électrochimique | 1 |
| **C2** | Découplage du rail | 100 nF céramique | 1 |
| **C3…C8** | Filtre des points milieux | 100 nF céramique | 6 |
| **D1** | **Anti-retour** | Schottky 1N5819 ou SS14 | 1 |
| **F1** | Protection des piles | PPTC réarmable 200 mA | 1 |
| **J1…J6** | Embases de sonde | jack 3,5 mm mono, de panneau | 6 |
| **R1…R6** | Ponts diviseurs | 10 kΩ **±0,1 %**, 1/4 W | 6 |
| **R7, R8** | Diviseur de mesure V_exc | 10 kΩ **±0,1 %**, 1/4 W | 2 |
| **R9, R10** | Diviseur de mesure des piles | 100 kΩ ±1 %, 1/4 W | 2 |
| **S1** | Sélecteur | inverseur 3 positions ON-OFF-ON | 1 |
| **U1** | Convertisseur d'alimentation | abaisseur-élévateur réglable, 3,55 V | 1 |
| **X1** | Rallonge USB-C de façade | mâle → femelle, court | 1 |

> **Écart assumé avec le dossier maître.** Le § 6.1 prévoyait **6** résistances
> de précision. Le schéma en demande **8** : les deux de plus forment le
> diviseur de mesure de V_exc, dont le § 4.3 montre qu'il divise l'erreur de
> mesure par dix. Elles se vendent par dix, elles étaient déjà dans le sachet.
> Il prévoyait aussi 6 condensateurs de moins — ils sont ajoutés au § 3.3, pour
> 12 centimes.

---

## 10. Câblage d'une voie, de la fiche à l'entrée

Schéma dessiné : [`illustrations/cablage-une-voie.svg`](illustrations/cablage-une-voie.svg).

```text
   SONDE NTC                 EMBASE J1              PLAQUE À PASTILLES
  ┌─────────┐             (jack 3,5 mm)
  │  gaine  │            ┌──────────────┐
  │  inox   │══════════▶ │   ● broche   │──── fil jaune ────┬──── R1 ──── 3,3 V
  │         │  câble 2   │              │                   │
  │  ~~~~   │  conducteurs│  ● corps    │──── fil noir ─────┼──── masse
  └─────────┘            └──────────────┘                   │
                                                      point milieu
                                                            │
                                                        C3 100 nF
                                                            │
                                                    ───▶ A2 / voie A0
                                                           masse
```

**Code couleur imposé** (§ 7 du dossier maître, précisé ici) :

| Fil | Couleur | Va de… | à… |
|---|---|---|---|
| Point milieu T1…T4 | **jaune** | broche du jack | plaque, entrée du convertisseur |
| Point milieu T5, T6 | **blanc** | broche du jack | plaque, entrée du convertisseur |
| Masse commune des jacks | **noir** | corps de jack en chaîne | plaque, masse |
| Rail 3,3 V | **rouge** | plaque | modules |
| Masse générale | **noir** | plaque | modules |
| SDA | **vert** | plaque | modules |
| SCL | **bleu** | plaque | modules |

Deux couleurs pour les points milieux, parce que **six fils jaunes identiques
dans un boîtier de 120 mm ne se dépannent pas**. Quatre jaunes numérotés et
deux blancs numérotés se retrouvent en dix secondes.

---

## 11. Les contrôles avant la première mise sous tension

Le § 28 du dossier maître donne la liste. La voici **avec les valeurs
attendues** — sans valeur attendue, un contrôle n'en est pas un.

Appareil **hors tension**, sélecteur sur **0**, piles **retirées**.

| # | Contrôle | Comment | Valeur attendue |
|---:|---|---|---|
| 1 | Court-circuit rail / masse | ohmmètre entre 3V3 et GND | **> 1 kΩ** (jamais 0 Ω) |
| 2 | Polarité du porte-piles | voltmètre aux fils du porte-piles | **+4,5 à +4,8 V**, rouge au + |
| 3 | Continuité T1 | ohmmètre entre broche J1 et pastille voie A0 | **< 2 Ω** |
| 4 | Continuité T2 à T6 | idem, voies A1, A2, A3, puis A0, A1 de A3 | **< 2 Ω** chacune |
| 5 | Masse des 6 jacks | ohmmètre entre corps J1 et corps J6 | **< 2 Ω** |
| 6 | Ponts en place | ohmmètre entre 3V3 et point milieu T1 | **10,0 kΩ ± 0,1** |
| 7 | Pas de pont oublié | idem pour T2 à T6 | **10,0 kΩ** chacun |
| 8 | SDA | continuité GPIO5 → SDA des 3 modules | **< 2 Ω** |
| 9 | SCL | continuité GPIO6 → SCL des 3 modules | **< 2 Ω** |
| 10 | SDA / SCL non croisés | ohmmètre entre SDA et SCL | **> 1 kΩ** |
| 11 | Alimentation A2 | continuité rail → VDD de A2 | **< 2 Ω** |
| 12 | Alimentation A3 | continuité rail → VDD de A3 | **< 2 Ω** |
| 13 | Alimentation A4 | continuité rail → VCC de l'écran | **< 2 Ω** |
| 14 | Adresses ADS différentes | ADDR de A2 → masse, ADDR de A3 → rail | **< 2 Ω** vers la bonne cible |
| 15 | Sens de D1 | ohmmètre en diode, sortie U1 → rail | **0,2–0,4 V** dans un sens, **infini** dans l'autre |
| 16 | Sélecteur | ohmmètre, position par position | continuité en **PILES** seulement |
| 17 | Aucune liaison piles ↔ USB | ohmmètre entre + du porte-piles et broche 5V | **infini**, dans les 3 positions |
| 18 | Fixation mécanique | à la main | rien ne bouge |
| 19 | Aucun fil dénudé apparent | à l'œil, boîtier ouvert | aucun cuivre visible |

**Le contrôle n°17 est celui qui autorise la mise sous tension.** Aucune
alimentation avant qu'un enseignant l'ait visé. C'est la règle de sécurité du
§ 12 du dossier maître, et elle ne se négocie pas.

---

## 12. Registre des arbitrages du schéma

Une ligne par décision qui n'était pas dans le dossier maître, avec ce qui la
justifie et ce qu'il faudrait pour la changer.

| # | Décision | Pourquoi | Ce qui la rouvrirait |
|---|---|---|---|
| A1 | NTC côté masse | La broche du jack ne porte jamais le 3,3 V ; le corps porte la masse ; un court-circuit d'insertion est sans effet | rien |
| A2 | R = 10 kΩ | Sensibilité maximale à 25 °C, milieu de la plage d'atelier | une plage de travail décalée (four, cryogénie) |
| A3 | Tolérance 0,1 % | Le seul terme d'erreur qu'aucun étalonnage à un point ne rattrape ; 0,02 K au lieu de 0,22 K | rupture d'approvisionnement |
| A4 | 100 nF sur chaque point milieu | Filtre 320 Hz **et** réservoir de charge pour l'entrée à capacités commutées | rien |
| A5 | Voie A2 de A3 = V_exc/2 | Annule l'erreur de gain du convertisseur ; divise l'erreur de mesure par dix ; les voies étaient libres | une 7ᵉ ou 8ᵉ sonde (mais alors on perd la précision) |
| A6 | Calibre ±4,096 V | La plus petite plage qui contient 3,3 V | changement de tension d'excitation |
| A7 | I²C sur GPIO5/GPIO6 | GPIO8 et GPIO9 commandent le démarrage ; un module bloqué rendrait la carte immortellement muette | rien |
| A8 | U8g2 plutôt qu'une bibliothèque dédiée | Gère SSD1306 **et** SH1106 : une ligne à changer, pas une bibliothèque | rien |
| A9 | Diode Schottky et non MOSFET | Un composant, un sens, contrôlable au multimètre en mode diode par un élève de CAP | la version « atelier avancé » du § 36 |
| A10 | Mesure des piles **après** le sélecteur | Consommation nulle à l'arrêt, et l'appareil sait tout seul qu'il est sur USB | rien |
| A11 | Seuil « sonde absente » à 0,97 | Plancher de mesure à −37 °C ; un seuil plus haut ferait afficher −50 °C pour une sonde débranchée | une application en surgélation profonde |
| A12 | Fusible 200 mA | Protège **les piles**, pas l'électronique | rien |

---

## 13. Ce que ce schéma ne dit pas

- **Le tracé du circuit imprimé.** Le montage est sur plaque à pastilles, câblé
  au fil. C'est plus lent qu'un circuit imprimé et beaucoup plus formateur :
  chaque liaison du schéma devient un geste.
- **Le comportement réel du bus** avec six câbles de sonde à côté. Prévu,
  filtré, non mesuré — voir [`POINTS-OUVERTS.md`](POINTS-OUVERTS.md) § M3.
- **Les cotes du boîtier acheté.** Le gabarit est dessiné pour 120 × 90 × 60 mm
  nominal ; il se vérifie au pied à coulisse avant le premier perçage.
