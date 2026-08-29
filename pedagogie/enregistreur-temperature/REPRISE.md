# Reprise — passer de Claude Code cloud à votre PC

*Écrit le 29/08/2026, en fin de session cloud, pour que rien ne se perde.*

---

## 1. En une ligne

Le dossier de cadrage du 29/08 est devenu un **module complet et poussé** :
schéma, onze programmes, site compagnon, outil d'acquisition, dix documents,
deux filets de contrôle. **Il ne manque qu'une chose, et elle n'est pas du
logiciel : le prototype.**

| | |
|---|---|
| Branche | `claude/project-development-s7svyc` |
| Dernier commit | `8dc56f9` |
| Pull request | [#34](https://github.com/frigorx/-inerweb-fluid-cerfa-fi-bsd-4/pull/34), **brouillon**, verte, sans conflit |
| Statut du module | `Prototype à réaliser` |

---

## 2. Récupérer le travail sur le PC

Ouvrir un terminal sur le Lenovo et coller ceci.

**Si vous n'avez pas encore le dépôt :**

```sh
git clone https://github.com/frigorx/-inerweb-fluid-cerfa-fi-bsd-4.git
cd -inerweb-fluid-cerfa-fi-bsd-4
git checkout claude/project-development-s7svyc
```

**Si vous l'avez déjà :**

```sh
cd <votre dossier du dépôt>
git fetch origin
git checkout claude/project-development-s7svyc
git pull origin claude/project-development-s7svyc
```

**Vérifier qu'on est bien au bon endroit :**

```sh
git log --oneline -1
# doit afficher : 8dc56f9 Le filet du visa ne confond plus le jalon T3 avec la voie T3
```

**Puis, dans le dossier du dépôt :**

```sh
claude
```

et lui donner, en premier message : *« Lis
`pedagogie/enregistreur-temperature/REPRISE.md`, on reprend là. »*

---

## 3. Ce qu'il y a dans le module

Tout est sous `pedagogie/enregistreur-temperature/`.

| Où | Quoi |
|---|---|
| `README.md` | la porte d'entrée : ce qui est fait, ce qui ne l'est pas |
| `POINTS-OUVERTS.md` | **à lire en second** : ce qui bloque, ce qui reste à mesurer, ce qui attend une décision |
| `05_Plans_et_schema.md` | le cœur technique : schéma, calculs, 19 contrôles, 12 arbitrages |
| `00` à `10_*.md` | l'intrant archivé + les dix documents annoncés au § 40 du cadrage |
| `programmes/01` à `11` | les onze programmes, un fichier chacun |
| `site/index.html` | le site compagnon, hors ligne — **double-clic, ça s'ouvre** |
| `site/exploitation.html` | l'outil d'acquisition — **bouton « Démonstration » pour le voir tourner sans appareil** |
| `illustrations/` | sept planches, dont deux à imprimer **à l'échelle 1:1** |
| `outils/` | les quatre scripts qui calculent et contrôlent |

### Les deux choses à ouvrir en premier sur le PC

```
site/index.html          → double-clic, le site s'ouvre dans le navigateur
site/exploitation.html   → double-clic, puis bouton « Démonstration »
```

Le second rejoue un démarrage de machine frigorifique en accéléré. C'est ce
qu'il faut projeter pour préparer la séance, et ça marche **sans aucun
appareil**.

> **Une réserve sur Chrome et les fichiers locaux** : ouvert en `file://`,
> Chrome peut refuser le Bluetooth web. Si les boutons restent gris, servir le
> dossier en local :
> ```sh
> npx http-server pedagogie/enregistreur-temperature/site -p 8080
> ```
> puis ouvrir `http://localhost:8080`. La page le dit elle-même à l'écran.

---

## 4. Les trois décisions à ne pas re-litiger

Elles sont tranchées, justifiées au long dans `05_Plans_et_schema.md` § 12, et
elles commandent tout le reste. Les rouvrir, c'est refaire le schéma.

1. **La NTC va du côté de la masse.** La broche du jack porte le point milieu,
   le corps porte la masse. Une fiche de biais court-circuite le point milieu à
   la masse : rien ne se passe.
2. **Les deux voies libres de l'ADS1115 mesurent** la tension d'excitation et
   les piles. Mesurer l'excitation avec le même convertisseur que la sonde
   annule son erreur de gain.
3. **Le sélecteur ne tient que la règle d'usage.** C'est la diode Schottky D1
   qui tient l'interdit « aucun courant vers les piles ».

---

## 5. La suite, dans l'ordre

### Étape 1 — le prototype professeur (deux soirées)

**C'est le seul vrai verrou.** Rien d'autre ne peut avancer utilement avant.

Commander **un exemplaire de chaque** (pas six), monter, et noter ce qu'on
trouve. `03_Nomenclature_et_achats.md` § 5 explique pourquoi en deux commandes
et pas une.

### Étape 2 — ce que le prototype fait tomber, et où le reporter

Une fois l'appareil monté, **quatre fichiers à corriger**, et le dossier passe
de « vérifié » à « éprouvé » :

| Ce qu'on mesure | Où le reporter | Ce que ça débloque |
|---|---|---|
| Consommation réelle (voltampèremètre USB, 3 régimes) | `outils/bilan-energie.mjs`, tableau `CONSOMMATEURS` — remplacer les deux lignes marquées **« À MESURER »** puis relancer le script | POINTS-OUVERTS § M1 |
| Cotes réelles du boîtier (pied à coulisse) | `illustrations/gabarit-percage.svg` — le script Python qui l'a produit est dans l'historique du commit `7b5cac4` | POINTS-OUVERTS § B3 |
| Contrôleur de l'écran acheté (SH1106 ou SSD1306) | la ligne en tête des programmes 02, 07 à 11 | le piège n° 1 de `03_Nomenclature` |
| Diamètre réel du filetage des embases | `illustrations/gabarit-percage.svg` + `05_Plans` § 9 | le piège n° 5 |
| Écart-type d'une voie sur 5 min (bruit du bus) | `POINTS-OUVERTS.md` § M3 | § M3 |

Puis **retirer le statut `Prototype à réaliser`** de `manifest.json`, du
`README.md` et de l'avertissement en tête de `01_Dossier_professeur.md`.

> **Ne pas retirer l'avertissement avant d'avoir monté l'appareil.** C'est la
> seule chose qui empêche un collègue de lancer le module en croyant qu'il a
> été éprouvé.

### Étape 3 — une classe test

C'est le retour terrain qui fait la différence entre un tutoriel et un livre.
Les étapes 20 et 21 du § 39 du cadrage disaient déjà ça.

### Étape 4 — les photos

`10_Cahier_des_illustrations.md` liste les **33 vues** à prendre, dans l'ordre
où elles se prennent pendant le montage, avec ce qu'il faut voir sur chacune.
Le § 5 de ce document explique comment s'installer (appareil sur pied, fond
neutre, réglet dans le cadre) : une demi-journée suffit.

**Les trois contre-exemples (fil trop étamé, soudure froide, surcharge d'étain)
se prennent en ratant exprès pendant le montage du prototype.** Y revenir plus
tard coûte une heure.

---

## 6. Les commandes de contrôle

Depuis la racine du dépôt :

```sh
# Le filet du module — 70 contrôles
node pedagogie/enregistreur-temperature/outils/verifier-module.mjs

# La logique du firmware, compilée et exécutée contre le modèle
# (demande g++ ; sous Windows, WSL ou MinGW)
node pedagogie/enregistreur-temperature/outils/verifier-logique.mjs

# Le tableau R(T) du dossier, recalculé
node pedagogie/enregistreur-temperature/outils/table-ntc.mjs

# L'autonomie, avec le statut de chaque hypothèse
node pedagogie/enregistreur-temperature/outils/bilan-energie.mjs

# Le filet du LOGICIEL (rien à voir avec le module, mais il doit rester vert)
node outils/lancer-tests.mjs --tout
```

**Attendu au 29/08 :** module 70/70, logique TOUT VERT, logiciel
**TOUT VERT — 140 exécutions** (≈ 175 s).

---

## 7. Ce qui n'est PAS tranché

Cinq questions ouvertes, détaillées dans `POINTS-OUVERTS.md`. Aucune ne bloque
le prototype ; toutes attendent une décision.

| # | Question | Qui décide |
|---|---|---|
| O1 | Combien de pôles au commutateur ? (un seul suffit) | selon le rayon du fournisseur |
| O2 | Couper les ponts diviseurs entre deux mesures ? (**non**, pour l'instant) | réouvrable si M1 change la donne |
| O3 | Trame BLE : service NUS ou GATT normalisé ? (**NUS**) | personne avant le prototype |
| O4 | Garder le fusible ? (**oui** — il protège les piles, pas l'électronique) | tranché |
| O5 | RGPD si le module est branché sur inerWeb Fluide | à rouvrir le jour où |

---

## 8. La question du livre

Position de fin de session, à reprendre telle quelle :

- **Ce qui a de la valeur ici n'est pas le boîtier**, c'est la chaîne démontée,
  chiffrée, contrôlée à chaque étape et branchée sur du froid réel. Des
  tutoriels de thermomètre connecté, il en existe cent.
- **L'ordre ne se négocie pas** : prototype → classe test → livre. Vendre un
  dossier de fabrication que personne n'a monté, c'est livrer des acheteurs à
  une panne qu'on n'a pas vue.
- **Le modèle de licence est déjà celui du dépôt** : lire est libre, l'usage en
  enseignement est gratuit, le commercial sur accord écrit. Rien à renégocier.
- **Ce qui se vend, c'est le kit, pas le PDF.** Le PDF sera piraté, tant mieux :
  c'est lui qui vend le kit — références figées, cartes pré-flashées, gabarit
  imprimé, livret. Un collègue paiera pour ne pas passer trois soirées à trier
  des écrans SH1106 et des câbles USB « charge seulement ».

---

## 9. L'état de la session cloud à sa fermeture

- Branche poussée, PR #34 **verte et sans conflit**, en brouillon.
- La surveillance automatique de la PR est **arrêtée** : plus aucune
  notification n'arrivera de ce côté.
- Rien n'est resté en local non poussé.
