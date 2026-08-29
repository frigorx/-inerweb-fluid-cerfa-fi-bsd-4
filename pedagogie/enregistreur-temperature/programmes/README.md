# Les onze programmes

Un dossier par programme, **un seul fichier `.ino` dans chacun** : c'est la
règle de l'IDE Arduino, et c'est aussi la bonne règle pédagogique — un
programme se téléverse d'un bloc, il ne s'assemble pas.

| # | Dossier | Ce qu'il prouve | Séance |
|---:|---|---|---|
| 01 | `01-test-carte` | La carte est vue, programmée, et elle parle | 3A |
| 02 | `02-test-oled` | Le bus existe, l'écran répond, le contrôleur est le bon | 3A |
| 03 | `03-scanner-i2c` | Les trois circuits sont là, chacun à son adresse | 3A |
| 04 | `04-lire-une-voie` | Le convertisseur convertit — en **volts**, pas en degrés | 3A |
| 05 | `05-lire-une-ntc` | **La première température.** Le pont diviseur en action | 3A |
| 06 | `06-lire-six-sondes` | Les six voies, sonde absente détectée | 3A |
| 07 | `07-afficher` | L'appareil se suffit à lui-même | 3B |
| 08 | `08-niveau-piles` | La huitième voie, et l'appareil sait s'il est sur piles | 3B |
| 09 | `09-trame-usb` | La trame du § 26, une ligne par seconde | 3B |
| 10 | `10-bluetooth-ble` | La même trame, sans fil | 3B |
| 11 | `11-version-finale` | **Étalonnage, extrema, gestion des pannes.** Celui qui reste | 3B / 4 |

Chaque programme ne marche que si le précédent marchait. C'est ce qui fait
qu'une panne se trouve : elle est forcément apparue entre deux programmes.

## Ce qu'il faut installer

Dans l'IDE Arduino, **Outils > Gérer les bibliothèques** :

| Bibliothèque | Auteur | Utilisée à partir du |
|---|---|---|
| **U8g2** | Oliver Kraus | programme 02 |
| **Adafruit ADS1X15** | Adafruit | programme 04 |

`Adafruit BusIO` s'installe automatiquement avec la seconde. Le Bluetooth
n'a **rien** à installer : il vient avec le support ESP32.

Support de carte : **esp32 by Espressif Systems**, version 2.0.5 minimum
(c'est celle qui apporte `Wire.setPins()`, dont tous les programmes se
servent pour imposer GPIO5 et GPIO6).

## Les réglages de l'IDE

| Réglage | Valeur | Pourquoi |
|---|---|---|
| Carte | **ESP32C3 Dev Module** | |
| USB CDC On Boot | **Enabled** | sans lui, le moniteur série reste muet |
| Schéma de partition | **Huge APP (3MB No OTA/1MB SPIFFS)** | **obligatoire à partir du 10** : le Bluetooth ne tient pas dans la partition par défaut |
| Vitesse du moniteur | **115200** | |

> Une compilation qui échoue sur « *text section exceeds available space* »
> n'est pas une faute de programme : c'est le schéma de partition.

## Contrôler la logique sans avoir de carte

```sh
node ../outils/verifier-logique.mjs
```

Le script **découpe les fonctions pures du programme 11**, les compile avec
g++, et vérifie que la température calculée par le firmware est celle du
modèle, que la trame est au format exact du § 26, que la table des piles est
monotone, et que l'analyseur de commandes accepte et refuse ce qu'il doit.

Le code testé est extrait du `.ino` à chaque exécution — jamais recopié. S'il
dérive, le contrôle tombe.

Ce que ce contrôle **ne prouve pas** : le bus, l'écran, le Bluetooth, la
consommation. Ceux-là attendent le prototype
([`../POINTS-OUVERTS.md`](../POINTS-OUVERTS.md) § B1).
