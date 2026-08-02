# ❄ Le Circuit Fantôme — inerWeb **Édu**

Parcours d'auto-apprentissage en deux modules.

**Module 1 — Lire un symbole.** Les symboles normalisés des éléments thermodynamiques
(chapitre 4.1.8, pages 81 à 89 du support de référence).
2 h d'auto-apprentissage · 1 h d'interrogation · 7 jours de révision maison.

**Module 2 — Construire et lire un circuit réel.** Ordres de montage, groupe de condensation,
circuit d'huile, régulateurs de pression, séquences de commande.
2 h d'auto-apprentissage · 1 h d'exploitation sur plateau technique.

---

## Ce que c'est

Le tableau des pages 81 à 89 présente ses symboles comme autant d'objets à mémoriser. C'est ce qui le
rend indigeste. Or ces symboles obéissent à une grammaire : une forme extérieure qui dit la nature
de l'organe, un contenu qui dit la technologie, un accessoire posé dessus qui dit la commande, un
type de trait qui sépare le fluide de l'information.

Ce parcours ne donne pas cette grammaire à l'élève. **Il la lui fait trouver**, puis la met à
l'épreuve sur des symboles qu'il n'a jamais vus. À la fin du module 1, il n'a pas 53 dessins en
tête : il a **8 règles**, et il sait lire n'importe quel symbole du chapitre.

Le module 2 part de là. Sur une installation réelle, savoir nommer ne suffit plus :

> **Ce n'est plus le symbole qui compte. C'est sa place, et le moment où il agit.**

Un élève peut nommer les 53 symboles et être incapable de dire pourquoi le voyant se monte après
le déshydrateur, ou ce qui se passe en premier dans un dégivrage. Le module 1 lui donne le
vocabulaire ; le module 2 lui donne la syntaxe. Sa mécanique est la même partout : **l'élève
construit l'ordre pas à pas** et reçoit la justification de chaque position immédiatement après
son choix.

---

## Les fichiers

### Application élève

| Fichier | Rôle |
|---|---|
| `index.html` | Portail du parcours — point d'entrée unique |
| `styles.css` | Charte inerWeb Édu (Calibri, `#1b3a63`, `#ff6b35`, fond clair, aucun mode sombre) |
| `donnees-symboles.js` | **Généré** — 53 symboles, 8 règles, 12 pièges, 22 repères du schéma |
| `donnees-circuits.js` | Contenu du module 2 — chaînes, séquences, régulateurs, groupe de condensation |
| `app.js` | Routeur, progression locale, utilitaires partagés |
| `atelier-decodage.js` | Atelier 1 — découverte des 8 règles |
| `atelier-familles.js` | Atelier 2 — memory + tri par familles |
| `atelier-pieges.js` | Atelier 3 — les 12 duels |
| `atelier-circuit.js` | Atelier 4 — schéma d'installation à 22 repères |
| `atelier-blanc.js` | Atelier 5 — épreuve blanche auto-corrigée |
| `atelier-chaine.js` | Ateliers 6, 8, 10, 11, 12 — moteur commun aux chaînes et aux séquences |
| `atelier-groupe.js` | Atelier 7 — groupe de condensation |
| `atelier-regulateurs.js` | Atelier 9 — KVP · KVR · KVL · KVC |
| `maison.js` | Entraînement maison — répétition espacée (Leitner, 5 boîtes) |
| `biblio.js` | Bibliothèque de référence consultable |
| `sw.js`, `manifest.json`, `icone.svg` | Fonctionnement hors connexion et installation sur téléphone |

### Documents imprimables

| Fichier | Rôle |
|---|---|
| `FICHE-SEANCE.md` | Module 1 — déroulé minute par minute, grille d'évaluation, corrigé, adaptations |
| `FICHE-SEANCE-2.md` | Module 2 — déroulé, heure sur plateau technique, corrigé, adaptations |
| `interrogation.html` | **Généré** — sujet A4 (20 points) + corrigé et barème enseignant |
| `carnet-eleve.html` | **Généré** — carnet de bord module 1, 4 pages, recto-verso |
| `memo-frigoriste.html` | **Généré** — mémo module 2, 4 pages : ordres de montage, régulateurs, séquences |

### Outils

| Fichier | Rôle |
|---|---|
| `outils/generer-donnees.py` | Construit `donnees-symboles.js` |
| `outils/generer-documents.py` | Construit les trois documents imprimables |
| `outils/carnet.py` | Partie « carnet élève » du générateur ci-dessus |
| `outils/memo.py` | Partie « mémo frigoriste » du générateur ci-dessus |

---

## D'où viennent les symboles

**Origine du contenu — à lire avant toute réutilisation.**

- **41 symboles frigorifiques et 8 capteurs** sont repris **tels quels** de notre bibliothèque
  maison [`frigorx/inerweb-symboles`](https://github.com/frigorx/inerweb-symboles)
  (348 symboles CEI / frigo convertis depuis QElectroTech, `inerweb_symboles.json` v2.0).
  Aucune retouche.

- **Une vingtaine de symboles** absents de cette bibliothèque ont été **redessinés d'après le
  document de référence**, dans le même style graphique (trait noir, épaisseur 1, même convention
  de `viewBox`) : compresseur centrifuge, moteur, échangeurs à eau, tours de refroidissement
  ouverte et fermée, filtre à huile, filtre déshydrateur, voyants liquide et huile, vanne
  d'isolement à volant, soupape de retenue, prise Schrader, éliminateur de vibrations, bouteille
  anti-coup de liquide, réservoir d'huile, vanne 4 voies, régulateur à flotteur, les 10 bulles
  d'instruments (PZL, PZH, PSL, PSH, PZLLHH, TC, TS, TZ, TI, TSHL) et les 4 régulateurs Danfoss
  (KVR, KVP, KVC, KVL). Ce sont des **redessins**, pas des extraits de norme : les vérifier avant
  toute publication hors classe.

- **Quatre symboles ont été redessinés bien qu'ils existent dans la bibliothèque**, parce que la
  version de la bibliothèque ne correspondait pas à celle du document : filtre déshydrateur (croix
  en pointillés), vanne d'isolement (volant en H), soupape de retenue, voyant liquide (pour former
  une paire strictement identique au voyant huile — c'est le piège n° 6).

- **Quatre symboles sont hors document** (famille « Circuits réels ») : ils sont nécessaires au
  module 2 et suivent les mêmes règles de lecture. Vanne différentielle **NRD**, pressostat
  différentiel d'huile **PDZ**, résistance de dégivrage, sonde de température. La lettre **D**
  (différentielle) de `PDZ` ne figure pas au tableau des bulles de la page 86 : l'application le
  signale explicitement à l'élève.

- **Les textes de fonction** sont repris du document de référence, pages 81 à 89. Les indices,
  les règles et les commentaires de pièges sont rédigés pour ce parcours. Le contenu du module 2
  (`donnees-circuits.js`) est rédigé pour ce parcours à partir des pratiques usuelles du métier.

- **Aucune valeur de réglage n'est donnée nulle part** — ni tarage, ni seuil, ni temporisation,
  ni plage. Elles dépendent du fluide, de la puissance, du régime et du constructeur. Partout où
  un réglage est en jeu, le texte renvoie à la documentation constructeur. C'est un choix
  pédagogique autant qu'une précaution : l'heure sur plateau technique du module 2 est justement
  le moment où l'élève va les chercher lui-même dans la notice.
  La seule exception est le sous-refroidissement usuel (4 à 8 K), donné avec sa réserve.
  Les états du fluide (gaz/liquide, HP/BP) reprennent littéralement les formulations du document,
  y compris « liquide BP » en sortie de détendeur.

### Ce qui existait déjà

Le dépôt `frigorx/inerweb-symboles` contient déjà trois jeux génériques sur l'ensemble des
348 symboles : `jeu1_quiz.html` (quiz), `jeu2_memory.html` (memory), `jeu3_montage.html`
(« Le Monteur », construction de circuit à 6 niveaux). **Ils restent utiles** et couvrent un
périmètre plus large — électrotechnique comprise.

Ce module-ci ne les remplace pas. Il traite **spécifiquement** le chapitre 4.1.8, ajoute la
méthode de découverte des 8 règles, les 12 pièges du chapitre, le schéma des pages 88-89 et
l'entraînement à répétition espacée. Les élèves qui veulent aller plus loin peuvent enchaîner
sur « Le Monteur ».

---

## Utilisation

### En classe

Ouvrir `index.html` dans un navigateur. Rien à installer, aucun compte, aucun réseau requis
après la première ouverture.

La progression est enregistrée dans le `localStorage` du navigateur — **sur le poste, et nulle
part ailleurs**. Aucune donnée n'est transmise. Sur poste partagé, le bouton « Effacer ma
progression » du portail remet tout à zéro.

### À la maison

Même page, écran « Entraînement maison ». Le service worker met l'application en cache : elle
fonctionne sans connexion. Sur téléphone, « Ajouter à l'écran d'accueil » l'installe comme une
application.

### Impression

- `interrogation.html` → Ctrl+P. Le corrigé est sur une page séparée (saut de page forcé) :
  imprimer les pages du sujet uniquement pour les élèves.
- `carnet-eleve.html` → Ctrl+P, recto-verso, 4 pages.
- `memo-frigoriste.html` → Ctrl+P, recto-verso, 4 pages. C'est la fiche que l'élève garde.
- Depuis l'application : boutons « Imprimer cette fiche » (clé de décodage), « Imprimer la
  bibliothèque » et « Imprimer mon corrigé ».

---

## Régénérer les fichiers

`donnees-symboles.js`, `interrogation.html`, `carnet-eleve.html` et `memo-frigoriste.html`
sont **générés**. Ne pas les
éditer à la main : la modification serait perdue à la génération suivante.

```bash
# 1. Récupérer la bibliothèque de symboles à côté du script
git clone https://github.com/frigorx/inerweb-symboles.git outils/inerweb-symboles

# 2. Reconstruire les données
python3 outils/generer-donnees.py

# 3. Reconstruire les documents imprimables (Node est requis à cette étape :
#    il sert à lire donnees-circuits.js pour le mémo frigoriste)
python3 outils/generer-documents.py
```

Le tirage de l'interrogation est **fixe** : le sujet est identique d'une génération à l'autre,
et le corrigé lui correspond toujours. Pour changer le sujet, modifier les listes `EX1` à `EX5`
et `A_TROUVER` en tête de `outils/generer-documents.py`.

---

## Contenu pédagogique

### Les 8 règles

| | |
|---|---|
| **R1** | Un cercle, c'est une machine qui tourne |
| **R2** | Un rectangle à ailettes avec une hélice, c'est un échangeur à air |
| **R3** | Un zigzag dans un corps fermé, c'est un échange sans contact |
| **R4** | Deux triangles pointe contre pointe, c'est une vanne |
| **R5** | Un rectangle barré d'une croix, c'est un filtre |
| **R6** | Une bulle avec des lettres, c'est un instrument |
| **R7** | La forme du corps dit ce qui se passe dedans |
| **R8** | Trait plein = du fluide. Trait pointillé = de l'information |

### Les familles de symboles

Machines tournantes (6) · Échangeurs (8) · Détendeurs (3) · Filtration et contrôle visuel (6) ·
Vannes et sécurités mécaniques (6) · Réservoirs et accessoires de ligne (7) · Instruments (9) ·
Régulateurs de pression (4) · Circuits réels, hors document (4).

### Le classement des régulateurs de pression — module 2

Un régulateur de pression se lit par **la pression qu'il surveille**. S'il surveille sa pression
d'entrée, il protège ce qui est **avant** lui ; s'il surveille sa pression de sortie, il protège
ce qui est **après** lui. Sur le symbole, le trait pointillé montre de quel côté la prise de
pression est faite — c'est écrit sur le dessin.

| | Surveille | Monté | Protège |
|---|---|---|---|
| **KVP** | son entrée | aspiration, sortie d'évaporateur | l'évaporateur |
| **KVR** | son entrée | ligne liquide, sortie de condenseur | la HP, donc le détendeur |
| **KVL** | sa sortie | aspiration, avant le compresseur | le moteur du compresseur |
| **KVC** | sa sortie | by-pass refoulement → aspiration | le compresseur (courts cycles) |

*KVP et KVR regardent en arrière · KVL et KVC regardent devant.*

### Compétences visées

Module 1 — `C2 Analyser les données techniques` ; `C12 Communiquer` — savoirs
`S3 Analyse technique` ; `S5 Procédures d'installation` (BAC PRO MFER).
Correspondance CAP IFCA : `S2 Graphique` ; `C2.1 Organiser les informations`.

Module 2 — `C2 Analyser les données techniques` ; `C3 Choisir les matériels` ;
`C9 Maintenance préventive` ; `C10 Maintenance corrective` — savoirs `S3 Analyse technique` ;
`S5 Procédures d'installation` ; `S6 Procédures d'intervention`.

Détail, adaptations par diplôme et grilles de positionnement : voir `FICHE-SEANCE.md`
et `FICHE-SEANCE-2.md`.

---

## Accessibilité et charte

- Calibri, corps 18 px (≥ 14 pt à l'impression), interligne 1,55, **alignement à gauche**.
- Titres Trebuchet MS bold. Bleu `#1b3a63`, orange `#ff6b35`.
- **Aucun mode sombre**, aucun fond sombre : la feuille de style ne contient volontairement
  aucune règle `prefers-color-scheme`.
- Un seul point d'attention par écran, retour immédiat après chaque réponse, trois niveaux de
  hiérarchie visuelle au maximum — adaptations TDAH / DYS de la charte inerWeb Édu.

---

*inerWeb Édu — F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO*
