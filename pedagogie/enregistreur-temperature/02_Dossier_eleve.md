# ❄ inerWeb **Édu** — Dossier élève

**Je fabrique, je contrôle et j'utilise un enregistreur de six températures**

*par F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO*

---

## Mise en situation

Une chambre froide met du temps à descendre. Une machine qui vient de démarrer
n'est pas dans son régime normal. Un condenseur encrassé chauffe plus qu'il ne
devrait. **On voit tout ça avec des températures — à condition de pouvoir en
mesurer plusieurs à la fois, et de les enregistrer.**

Un appareil qui fait ça coûte plusieurs centaines d'euros. Tu vas en fabriquer
un pour 45 €. Et à la fin, tu sauras **pourquoi** il donne le bon chiffre — ce
qui est plus utile que de savoir l'acheter.

**Ce que tu vas faire :** percer, souder, câbler, contrôler, programmer,
étalonner, mesurer, lire des courbes, chercher une panne.

---

## Mes objectifs — je coche quand j'y suis

- [ ] Je sais expliquer pourquoi une **résistance** sert à mesurer une température.
- [ ] Je réalise **six ponts diviseurs** conformes au schéma, et je les contrôle.
- [ ] Je nomme les **trois circuits** du bus et leur adresse.
- [ ] J'**étalonne** une voie contre un point fixe, et je justifie l'écart.
- [ ] Je **lis** un enregistrement de démarrage de machine et j'en conclus quelque chose.

---

## Mes prérequis — je coche AVANT de commencer

- [ ] Je sais me servir d'un multimètre en ohmmètre.
- [ ] Je sais lire une valeur avec son unité (kΩ, mV, °C).
- [ ] Je sais qu'un circuit électrique doit être **fermé** pour qu'un courant passe.
- [ ] Je sais ouvrir une page dans un navigateur et revenir en arrière.

> **Trois cases vides ?** Ce n'est pas grave, mais dis-le. On fait un rappel de
> quinze minutes avant, plutôt qu'un blocage de deux heures après.

---

# FICHE 1 — La sonde (séance 1A, 2 h)

## Ce que je vais faire
Découvrir ce qu'est une NTC, en mesurant.

## Pourquoi je le fais
Parce que tout l'appareil repose sur un seul fait, et c'est celui-là.

## Matériel
1. Une sonde NTC 10 kΩ B3950 (× 1 par binôme)
2. Un multimètre (× 1)
3. Un bol d'eau froide + glaçons (× 1 par poste)
4. Un thermomètre de référence (× 1 pour deux postes)
5. Papier millimétré (× 1 par élève)

## Geste n° 1 — j'observe
Je décris la sonde **sans la brancher**. Combien de fils ? De quelle matière est
le corps ? Quelle longueur fait le câble ?

```
_____________________________________________________________________
_____________________________________________________________________
```

## Geste n° 2 — je mesure à l'air ambiant
Multimètre en **ohmmètre**, calibre automatique ou 200 kΩ.

| | Valeur |
|---|---|
| Température de la salle (thermomètre de référence) | ________ °C |
| Résistance de ma sonde | ________ Ω |

### ✔ Contrôle
Ma valeur est-elle proche de **12 500 Ω** (si la salle est à 20 °C) ?
☐ oui ☐ non — si non, j'appelle.

## Geste n° 3 — je chauffe
Je serre la sonde dans ma main, fort, pendant **une minute complète**.
Je relève **toutes les 15 secondes** :

| Temps | 0 s | 15 s | 30 s | 45 s | 60 s |
|---|---|---|---|---|---|
| Résistance (Ω) | | | | | |

### ✔ Contrôle
La résistance a-t-elle **monté** ou **descendu** ? ______________

## Geste n° 4 — je refroidis
Sonde dans l'eau glacée. Même relevé, toutes les 15 secondes.

| Temps | 0 s | 15 s | 30 s | 45 s | 60 s |
|---|---|---|---|---|---|
| Résistance (Ω) | | | | | |

## Geste n° 5 — je trace
Sur le papier millimétré : la **résistance** en ordonnée, la **température** en
abscisse. Trois points suffisent : eau glacée, salle, main.

## Résultat attendu
Je complète, avec mes mots :

> Quand la température monte, la résistance de la NTC ____________.
> Et la courbe que j'ai tracée est ☐ une droite ☐ une courbe.

## Erreurs fréquentes
- **Je note « 10 kΩ » et j'arrête de lire.** Il faut relever la valeur complète,
  chiffre par chiffre : c'est là que la variation se voit.
- **Je lis trop tôt.** La sonde a de l'inertie : sa gaine inox met du temps à
  prendre la température du milieu. Une minute, chronométrée.
- **Je tiens les deux fils nus dans mes doigts.** Ma peau conduit un peu et
  fausse la mesure. Je tiens par l'isolant.

## Si ça ne marche pas
| Ce que je vois | Ce que je fais |
|---|---|
| L'ohmmètre affiche `1` ou `OL` | Circuit ouvert : mauvais calibre, ou une pointe qui ne touche pas |
| L'ohmmètre affiche 0 | Les deux pointes se touchent, ou la sonde est en court-circuit |
| La valeur saute sans arrêt | Je tiens les fils nus. Je tiens par l'isolant |

## ✔ Validation — professeur : ______

---

# FICHE 2 — Du pont diviseur à la donnée (séance 1B, 2 h)

## Ce que je vais faire
Transformer une **résistance** en **tension**, avec deux résistances.

## Pourquoi je le fais
Parce qu'un microcontrôleur ne sait pas mesurer une résistance.
**Il ne sait mesurer qu'une tension.**

## Matériel
1. Platine d'essai (× 1 par binôme)
2. Résistance 10 kΩ (× 1)
3. Sonde NTC (× 1)
4. Alimentation 3,3 V ou pile (× 1)
5. Multimètre en voltmètre (× 1)

## Geste n° 1 — je monte le pont
```
        3,3 V
          │
        [ 10 kΩ ]        ← la résistance FIXE
          │
          ├──────► ici je mesure la tension
          │
        [ NTC ]          ← la résistance qui BOUGE
          │
        masse
```

> **La NTC est en BAS, du côté de la masse. Toujours.**
> Tu comprendras pourquoi en fiche 4, quand tu câbleras les fiches jack.

## Geste n° 2 — je mesure

| Situation | Tension mesurée | Ce que je prévois |
|---|---|---|
| Sonde à l'air de la salle | ________ V | |
| Sonde dans la main | ________ V | ☐ ça monte ☐ ça descend |
| Sonde dans l'eau glacée | ________ V | ☐ ça monte ☐ ça descend |

### ✔ Contrôle
À 25 °C, la NTC vaut 10 kΩ, exactement comme la résistance fixe.
Que vaut alors la tension du point milieu ? ________ V
(Indice : deux résistances **égales** partagent la tension en deux.)

## Geste n° 3 — je débranche la sonde
Je retire la sonde du montage, et je mesure encore.

Tension = ________ V

### ✔ Contrôle
Pourquoi cette valeur-là ? ______________________________________
*(C'est exactement comme ça que l'appareil saura qu'une sonde est débranchée.)*

## Résultat attendu
> Plus il fait chaud, plus la tension ____________.
> C'est l'inverse de l'intuition, et c'est parce que la NTC est ____________.

## Geste n° 4 — je remets la chaîne dans l'ordre
Neuf étiquettes, mélangées. Je les numérote de 1 à 9.

☐ ESP32   ☐ TENSION   ☐ NTC   ☐ AFFICHAGE   ☐ PONT DIVISEUR
☐ TEMPÉRATURE   ☐ VALEUR NUMÉRIQUE   ☐ RÉSISTANCE   ☐ ADS1115

## ✔ Validation — professeur : ______

---

# FICHE 3 — Le boîtier (séance 2A, 2 h)

## ⚠ Point sécurité — perçage
**Lunettes pour tout le poste**, pas seulement pour celui qui perce.
**Pièce bridée, jamais tenue à la main.** Cheveux attachés, manches serrées.
**Pas de gants sur la perceuse** : un gant s'enroule autour du foret, une main
non.

## Matériel
1. Boîtier ABS 120 × 90 × 60 mm (× 1)
2. Gabarit `illustrations/gabarit-percage.svg` **imprimé à 100 %** (× 1)
3. Réglet métallique, pied à coulisse, pointeau, marqueur fin
4. Ruban de masquage
5. Perceuse + forets Ø3 et Ø6, foret étagé
6. Outil rotatif, limes, ébavureur

## Étapes

1. **J'imprime le gabarit à 100 %** — « Taille réelle », jamais « Ajuster à la page ».
2. ✔ **Je mesure le carré de contrôle au réglet.**
   Il fait ________ mm. **Il doit faire 50,0 mm.**
   Sinon → je réimprime. Tout le reste serait faux.
3. Je mesure mon boîtier réel au pied à coulisse :
   longueur ______ mm · largeur ______ mm · profondeur ______ mm
4. Je compare au gabarit. Écart : ______ mm. Si > 2 mm, j'appelle.
5. Je colle le gabarit au ruban de masquage.
6. Je **pointe** chaque perçage au pointeau. Un coup sec, pas trois.
7. Je perce **en montant en diamètre** : Ø3 d'abord, puis Ø6.
8. Je découpe la fenêtre de l'écran **en restant à l'intérieur du trait**.
   *On peut toujours limer. On ne peut jamais rajouter.*
9. J'ébavure toutes les ouvertures.
10. ✔ **Montage à blanc** : je place tout sans rien souder.

### ✔ Contrôle de fin de fiche
- [ ] Les six embases entrent et leur écrou se serre.
- [ ] Le sélecteur entre.
- [ ] L'écran est visible entièrement par la fenêtre.
- [ ] Le couvercle ferme.
- [ ] Rien ne force.

> **Aucune soudure tant que ces cinq cases ne sont pas cochées.**

## Erreurs fréquentes
- Percer Ø6 directement : le foret accroche et le trou devient ovale.
- Découper la fenêtre trop grande : l'écran a du jeu et l'étiquette ne cache plus.
- Oublier d'ébavurer : le fil s'use sur l'arête et fera un court-circuit dans six mois.

## ✔ Validation — professeur : ______

---

# FICHE 4 — Le câblage (séance 2B, 2 h)

## ⚠ Point sécurité — fer à souder
350 °C. **Le fer retourne à son support à chaque pose.** Ventilation. Les
vapeurs de flux ne se respirent pas. Lavage des mains avant la pause.

## Avant de souder sur le montage : trois soudures d'entraînement
Sur une chute de plaque. Validées par le professeur.
☐ n° 1 ☐ n° 2 ☐ n° 3 — ✔ professeur : ______

## Souder un fil sur une embase — les 14 gestes

1. Couper le fil à la longueur.
2. **Enfiler la gaine thermo AVANT de souder.** Oubliée = tout dessouder.
3. Dénuder 5 mm.
4. Torsader légèrement les brins.
5. Étamer le conducteur : l'étain doit **mouiller** les brins, pas faire une boule.
6. Chauffer **en même temps** le contact et le fil. Deux secondes.
7. Amener l'étain **sur la zone chauffée** — jamais sur la panne du fer.
8. Retirer l'étain.
9. Retirer le fer.
10. **Ne plus bouger** pendant le refroidissement. Trois secondes.
11. Contrôler à l'œil : brillante, en petit cône = bonne. Terne et bombée =
    soudure froide, à refaire.
12. Contrôler à l'ohmmètre : **< 2 Ω**.
13. Positionner la gaine.
14. Rétracter au pistolet à air chaud.

## Le code des couleurs — je le respecte, sinon je ne me dépannerai pas

| Fil | Couleur | De … | à … |
|---|---|---|---|
| Point milieu T1 à T4 | **jaune** | broche du jack | plaque |
| Point milieu T5, T6 | **blanc** | broche du jack | plaque |
| Masse des six jacks | **noir** | corps en chaîne | plaque |
| Rail 3,3 V | **rouge** | plaque | modules |
| SDA | **vert** | plaque | modules |
| SCL | **bleu** | plaque | modules |

> **Pourquoi deux couleurs pour six fils ?** Six fils jaunes identiques dans un
> boîtier de 12 cm, personne ne les retrouve. Quatre jaunes numérotés et deux
> blancs numérotés, si. **J'étiquette chaque fil AVANT de le lâcher.**

## Mon tableau de câblage — je le remplis au fur et à mesure

| Voie | Couleur | Étiquette posée ? | Continuité < 2 Ω ? | Vérifié par |
|---|---|---|---|---|
| T1 | jaune | ☐ | ☐ | |
| T2 | jaune | ☐ | ☐ | |
| T3 | jaune | ☐ | ☐ | |
| T4 | jaune | ☐ | ☐ | |
| T5 | blanc | ☐ | ☐ | |
| T6 | blanc | ☐ | ☐ | |

> **La colonne « vérifié par » se remplit par l'AUTRE du binôme.**
> On ne trouve pas ses propres soudures froides.

## ✔ Validation — professeur : ______

---

# FICHE 5 — Les 19 contrôles avant la première mise sous tension

**Appareil hors tension. Sélecteur sur 0. Piles RETIRÉES.**

> Cette fiche est la plus importante du dossier. Sans elle, une erreur de
> câblage détruit une carte, et parfois fait chauffer trois piles.

| # | Contrôle | Attendu | Mesuré | ✔ |
|---:|---|---|---|---|
| 1 | Court-circuit rail / masse | > 1 kΩ | | ☐ |
| 2 | Polarité du porte-piles | +4,5 à +4,8 V | | ☐ |
| 3 | Continuité T1 | < 2 Ω | | ☐ |
| 4 | Continuité T2 | < 2 Ω | | ☐ |
| 5 | Continuité T3 | < 2 Ω | | ☐ |
| 6 | Continuité T4 | < 2 Ω | | ☐ |
| 7 | Continuité T5 | < 2 Ω | | ☐ |
| 8 | Continuité T6 | < 2 Ω | | ☐ |
| 9 | Masse commune des 6 jacks | < 2 Ω | | ☐ |
| 10 | Pont T1 : rail → point milieu | 10,0 kΩ | | ☐ |
| 11 | Ponts T2 à T6 | 10,0 kΩ chacun | | ☐ |
| 12 | SDA vers les 3 modules | < 2 Ω | | ☐ |
| 13 | SCL vers les 3 modules | < 2 Ω | | ☐ |
| 14 | SDA et SCL **pas croisés** (entre eux) | > 1 kΩ | | ☐ |
| 15 | Alimentation de A2, A3, écran | < 2 Ω vers le rail | | ☐ |
| 16 | ADDR de A2 → masse, ADDR de A3 → rail | < 2 Ω vers la bonne cible | | ☐ |
| 17 | Sens de D1 (multimètre en mode diode) | 0,2–0,4 V dans un sens, ∞ dans l'autre | | ☐ |
| 18 | Sélecteur : continuité en PILES seulement | | | ☐ |
| 19 | **Aucune liaison piles ↔ broche 5V** | **∞ dans les 3 positions** | | ☐ |

> ### ⚠ Le contrôle n° 19 est celui qui autorise tout le reste.
> Il garantit qu'on ne rechargera jamais trois piles alcalines par l'USB.
> **Aucune mise sous tension avant le visa.**

## ✔ VISA PROFESSEUR — mise sous tension autorisée : ______

---

# FICHE 6 — La mise en service (séance 3A, 2 h)

## Les six programmes, dans l'ordre

Chaque programme prouve **une chose**. On ne passe au suivant que si le
précédent a marché.

| # | Ce que je dois voir | ✔ |
|---:|---|---|
| 01 | La LED clignote. Le nom de l'appareil s'affiche : `ENR-T6-________` | ☐ |
| 02 | L'écran s'allume. Le cadre est **net**, sans décalage | ☐ |
| 03 | Trois adresses : `0x3C`, `0x48`, `0x49` | ☐ |
| 04 | Une tension en volts, et **le multimètre dit la même** | ☐ |
| 05 | **Ma première température.** Elle monte quand je serre la sonde | ☐ |
| 06 | Les six voies. Les voies vides disent « sonde absente » | ☐ |

> **Le nom de mon appareil est `ENR-T6-________`.**
> Je l'écris tout de suite sur l'étiquette de façade, au marqueur indélébile.
> Six appareils identiques dans une salle, sans nom, c'est ingérable.

## Le contrôle qui compte — programme 04

| | Valeur |
|---|---|
| Tension affichée par l'appareil | ________ V |
| Tension mesurée au multimètre sur le même point | ________ V |
| Écart | ________ mV |

### ✔ Contrôle
L'écart doit être inférieur à **5 mV**.
Si oui : **l'appareil ne raconte pas d'histoire.** C'est vérifié, pas cru.

## Le réglage du convertisseur

1. Sélecteur sur **0**, piles en place.
2. Multimètre entre la sortie de U1 et la masse.
3. Sélecteur sur **PILES**, écran allumé.
4. Je tourne le potentiomètre de U1 jusqu'à lire **3,55 V** : ________ V
5. Je mesure le rail (broche 3V3) : ________ V — attendu **3,25 à 3,35 V**
6. L'appareil affiche V_exc = ________ V — **il doit dire la même chose**

### ✔ Contrôle
Écart entre l'appareil et mon multimètre : ________ V (attendu < 0,02 V)

> Tu viens de vérifier un instrument avec un autre instrument. Ça s'appelle de
> la métrologie, et tu l'as fait en cinq minutes.

## ✔ Validation — professeur : ______

---

# FICHE 7 — L'étalonnage et le Bluetooth (séance 3B, 2 h)

## Le point fixe qui ne coûte rien

De la glace pilée **en excès**, de l'eau, on remue.
Ce bain vaut **0,0 °C**, à un dixième près. Pas « à peu près zéro » :
**zéro, par construction physique**. Tant qu'il reste de la glace **et** de
l'eau ensemble et qu'on remue, la température ne peut pas être autre chose.

## Étalonner une voie — cinq gestes

1. Je plonge la sonde dans le bain, **la gaine entière**, pas juste le bout.
2. J'attends **une minute complète**, chronométrée. La valeur descend, puis
   se stabilise.
3. Je note ce que l'appareil affiche : ________ °C
4. J'envoie la commande `ZC1=0.0` (pour la voie 1).
5. L'appareil répond `#OK;voie 1 etalonnee…` et retient l'écart **même
   débranché**.

## Mon tableau d'étalonnage

| Voie | Ce que je lisais dans la glace | Écart corrigé (Z) | Commande envoyée |
|---|---|---|---|
| T1 | ________ °C | ________ K | `ZC1=0.0` ☐ |
| T2 | ________ °C | ________ K | `ZC2=0.0` ☐ |
| T3 | ________ °C | ________ K | `ZC3=0.0` ☐ |
| T4 | ________ °C | ________ K | `ZC4=0.0` ☐ |
| T5 | ________ °C | ________ K | `ZC5=0.0` ☐ |
| T6 | ________ °C | ________ K | `ZC6=0.0` ☐ |

### ✔ Contrôle
- Écarts attendus : entre **± 0,3 et ± 1,2 K**.
- Un écart **supérieur à 2 K** n'est pas normal : ce n'est pas la sonde, c'est
  une résistance de pont hors valeur ou une soudure froide. Je refais le
  contrôle n° 10 avant d'étalonner.
- **Après étalonnage**, mes six voies dans le même bain doivent afficher la
  même chose à **0,3 K** près.
  Écart max relevé : ________ K

## Le Bluetooth

1. J'ouvre `site/exploitation.html` sur Chrome ou Edge.
2. Je clique **Se connecter en Bluetooth**.
3. Je choisis **mon** appareil dans la liste : `ENR-T6-________`
4. Les six valeurs apparaissent. Six courbes se tracent.

### ✔ Contrôle
- [ ] Les valeurs de l'écran de l'appareil et celles de la page sont **les mêmes**.
- [ ] Je débranche une sonde : la page affiche « sonde ? » et **la courbe
      s'interrompt** au lieu de descendre à zéro.

> **Pourquoi la courbe s'interrompt au lieu de tomber à zéro** : relier deux
> points de part et d'autre d'une mesure manquante, ce serait **inventer** la
> mesure manquante. L'appareil ne le fait pas, et la page non plus.

## L'enregistrement

1. **Démarrer l'enregistrement**, une minute.
2. **Exporter en CSV**.
3. J'ouvre le fichier dans le tableur. Séparateur `;`, décimale `,`.
4. Je nomme mon fichier par **numéro de poste**, pas par mon nom.

## ✔ Validation — professeur : ______

---

# FICHE 8 — L'exploitation (module 4, 4 h)

Cette fiche est adaptée à la filière. La version froid / climatisation est
détaillée dans [`09_Exploitation_froid_clim.md`](09_Exploitation_froid_clim.md).

## Le geste métier de la séance : poser une sonde

> **Une sonde posée sur un tube ne mesure rien** si elle n'est pas *plaquée* et
> *isolée*. Contact métal contre métal, collier serré, puis un morceau
> d'isolant par-dessus. Sans isolant, la sonde mesure la moyenne entre le tube
> et l'air de la salle — et l'écart peut dépasser **5 K**.

## Mon plan de sondes

| Voie | Où je la pose | Pourquoi |
|---|---|---|
| T1 | | |
| T2 | | |
| T3 | | |
| T4 | | |
| T5 | | |
| T6 | | |

## Ce que je relève

| | Au démarrage | Après 15 min | Régime établi ? |
|---|---|---|---|
| T1 | ______ °C | ______ °C | ☐ |
| T2 | ______ °C | ______ °C | ☐ |
| T3 | ______ °C | ______ °C | ☐ |
| T4 | ______ °C | ______ °C | ☐ |
| T5 | ______ °C | ______ °C | ☐ |
| T6 | ______ °C | ______ °C | ☐ |

## Mes conclusions — 10 à 15 lignes

- Quelle courbe descend le plus vite ? Pourquoi ?
- Quelle courbe ne bouge pas ? Qu'est-ce que ça dit ?
- À quel moment le régime s'établit-il ? À quoi le vois-tu **sur la courbe** ?
- Quel écart de température as-tu calculé, et qu'est-ce qu'il vaut d'habitude ?

```
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________
```

## ✔ Validation — professeur : ______

---

# FICHE DE DÉPANNAGE — à garder ouverte

## La méthode. On ne s'en écarte pas.

```text
CONSTATER → HYPOTHÈSE → MESURER → IDENTIFIER → CORRIGER → VALIDER
```

**Changer une pièce avant d'avoir mesuré, ce n'est pas dépanner : c'est dépenser.**

## Le tableau

| Ce que je constate | Mes hypothèses, dans l'ordre | Ce que je mesure |
|---|---|---|
| La carte n'apparaît pas sur le PC | 1. câble « charge seulement » · 2. sélecteur pas sur USB | **je change de câble d'abord** |
| Le moniteur reste vide | « USB CDC On Boot » désactivé · mauvaise vitesse | 115200 bauds |
| La compilation échoue sur « text section » | schéma de partition | passer en « Huge APP » |
| Le scanner ne trouve **rien** | SDA/SCL croisés · modules non alimentés | contrôles 12, 13, 14, 15 |
| Le scanner trouve **un seul** ADS1115 | les deux ADDR au même potentiel | contrôle 16 |
| Image décalée de 2 pixels | mauvais contrôleur dans le programme | commuter SH1106 ↔ SSD1306 |
| Une voie affiche `----` | fil coupé · soudure froide · fiche mal enfoncée | ohmmètre aux bornes de la fiche : ≈ 10 kΩ |
| Une voie affiche `-CC` | fiche mal enfoncée · brins qui se touchent | ohmmètre : 0 Ω = confirmé |
| **Toutes** les voies affichent `----` | la tension d'excitation est fausse | page « système » : V_exc entre 3,25 et 3,35 V |
| Une voie lit 2 à 5 K à côté | résistance de pont hors valeur | contrôle n° 10 |
| Les valeurs sautent | condensateur oublié · fil de sonde le long du bus | contrôle visuel |
| S'éteint sur PILES | piles usées · D1 à l'envers · U1 mal réglé | contrôle 17, puis sortie de U1 = 3,55 V |
| Affiche « USB » alors qu'on est sur piles | R9-R10 pas relié après le sélecteur | ≈ 2,4 V au point milieu |
| N'apparaît pas en Bluetooth | programme 09 encore chargé · déjà connecté ailleurs | l'écran doit afficher `ENR-T6-…` |

---

## Auto-évaluation — je me positionne de 1 à 5

| Je suis capable de… | 1 | 2 | 3 | 4 | 5 |
|---|:-:|:-:|:-:|:-:|:-:|
| expliquer le rôle d'une NTC | ☐ | ☐ | ☐ | ☐ | ☐ |
| expliquer à quoi sert un pont diviseur | ☐ | ☐ | ☐ | ☐ | ☐ |
| utiliser un multimètre en ohmmètre et en voltmètre | ☐ | ☐ | ☐ | ☐ | ☐ |
| préparer et étamer un conducteur | ☐ | ☐ | ☐ | ☐ | ☐ |
| réaliser une soudure correcte | ☐ | ☐ | ☐ | ☐ | ☐ |
| reconnaître une soudure froide | ☐ | ☐ | ☐ | ☐ | ☐ |
| poser une gaine thermorétractable | ☐ | ☐ | ☐ | ☐ | ☐ |
| suivre un schéma | ☐ | ☐ | ☐ | ☐ | ☐ |
| contrôler un montage avant mise sous tension | ☐ | ☐ | ☐ | ☐ | ☐ |
| nommer les trois circuits du bus et leur adresse | ☐ | ☐ | ☐ | ☐ | ☐ |
| étalonner une voie sur un point fixe | ☐ | ☐ | ☐ | ☐ | ☐ |
| enregistrer des données et les exporter | ☐ | ☐ | ☐ | ☐ | ☐ |
| lire une courbe de température | ☐ | ☐ | ☐ | ☐ | ☐ |
| chercher une panne avec une méthode | ☐ | ☐ | ☐ | ☐ | ☐ |

---

## Ce que je dois pouvoir dire à la fin

> « J'ai réalisé, contrôlé et mis en service un système qui mesure plusieurs
> températures, transforme ces mesures en données numériques, les affiche, les
> transmet et permet de les exploiter. »

Et surtout : **je sais pourquoi il donne le bon chiffre.**
