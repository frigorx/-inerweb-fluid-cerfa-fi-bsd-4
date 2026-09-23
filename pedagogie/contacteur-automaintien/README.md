# ❄ Le contacteur qui se souvient — inerWeb **Édu**

TP interactif sur le **circuit de commande à auto-maintien** : un disjoncteur de commande,
un bouton Arrêt (NC), un bouton Marche (NO), un contacteur et son contact auxiliaire 13-14.
CAP IFCA en cible, adaptable BAC PRO MFER et 2nde TNE.

3 h · 4 ateliers numériques · un câblage réel en binôme · une panne réelle à dépanner.

---

## D'où ça vient

D'une illustration vue sur un réseau social en septembre 2026 : une platine (disjoncteur, contacteur,
deux boutons) à côté de son schéma, sous le titre « circuit de contacteur autobloquant ». L'idée du
triptyque **platine · schéma · comportement** vient de là. **Rien d'autre n'en vient** :

- l'image d'origine n'est pas reproduite, ni retouchée, ni convertie. Elle n'a pas de licence
  connue et semble générée par IA ;
- les deux dessins du module (`schemas.js`) sont **redessinés de zéro** en SVG, avec les repères
  français (Q1, S1, S2, KM1), les bornes normalisées (1-2, 3-4, 13-14, A1-A2), le neutre sur A2 et
  un disjoncteur de commande de calibre cohérent (2 A, là où l'image montrait un C32) ;
- le comportement est calculé par un moteur (`simulation.js`), pas illustré : c'est ce qui permet
  les six câblages fautifs de l'atelier de dépannage.

Ce que l'image ne montrait pas et que le TP ajoute : le circuit de puissance en grisé, les
sécurités (thermique, HP), le second poste, le voyant, et le piège du thermostat qui relie ce TP
au module « Circuit Fantôme » (pump down).

## Ce que c'est

La notion plantée : **le contacteur ferme lui-même le contact qui le maintient alimenté.**

| Atelier | Ce que fait l'élève | Validé à |
|---|---|---|
| 1 · Observer | Manœuvre Q1, Marche, Arrêt avec le courant affiché ; les questions ne s'ouvrent qu'après trois observations faites au pupitre | 4 / 5 |
| 2 · Relier | Retrouve sur la platine les huit bornes nommées sur le schéma | 6 / 8 |
| 3 · Dépanner | Sept platines au câblage caché, courant invisible : manœuvrer, observer, diagnostiquer | 5 / 7 |
| 4 · Compléter | Place thermique, HP, second poste, voyant, thermostat sur le schéma qui grandit | 5 / 6 |

Entre l'atelier 2 et l'atelier 3, la séance passe sur **la platine réelle** : consignation, câblage
hors tension fil par fil, contrôles à l'ohmmètre, mise sous tension par l'enseignant.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Le TP interactif — point d'entrée |
| `styles.css` | Charte inerWeb Édu (Calibri, `#1b3a63`, `#ff6b35`, fond clair, aucun mode sombre) |
| `simulation.js` | Le moteur : le câblage conforme et les six fautifs, la stabilisation, le contacteur qui bat |
| `schemas.js` | Les deux dessins SVG, fonctions de l'état : schéma développé et platine |
| `app.js` | Routeur, progression locale, simulateur partagé, les quatre ateliers |
| `fiche-eleve.html`, `fiche.js` | La fiche élève, 3 pages A4 : schémas à compléter, tableau de câblage, dépannage, auto-positionnement |
| `TP-CONTACTEUR-AUTOMAINTIEN.md` | Le TP enseignant : 11 sections, déroulé minute par minute, grille par compétence, corrigé, adaptations |
| `controle-simulation.mjs` | Vérification du moteur : `node controle-simulation.mjs` |
| `outils/test-ateliers.html`, `outils/harnais.js` | Rejoue les quatre ateliers par événements DOM dans un navigateur, sans dépendance |
| `sw.js`, `manifest.json`, `icone.svg` | Fonctionnement hors connexion et installation sur téléphone |

Aucune dépendance, aucune requête réseau, aucune donnée ne sort du poste. Même politique de
sécurité du contenu que le Circuit Fantôme : aucun script en ligne dans les pages.

## Vérifier

```
node controle-simulation.mjs
```

Soumet les sept câblages à la même suite de neuf manœuvres et compare l'état du contacteur
(collé · repos · bat) à ce qu'un frigoriste observerait sur la platine.

Pour les ateliers eux-mêmes, servir le dépôt en local (`python3 -m http.server`) et ouvrir
`outils/test-ateliers.html#test` : le harnais enchaîne les quatre ateliers par événements DOM et
écrit son bilan en bas de page (49 vérifications, aucune erreur JavaScript attendue).

## Licence

Le module suit la licence du dépôt (« code visible », © 2026 Franck Henninot, voir
[`LICENSE`](../../LICENSE) à la racine) : usage libre et gratuit pour les établissements
d'enseignement, licence distincte pour tout usage commercial. Les dessins et le contenu
pédagogique de ce dossier sont des créations originales ; aucun élément tiers n'y est repris.
