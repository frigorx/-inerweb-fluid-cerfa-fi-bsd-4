# La ligne CO₂ / R744 — treize escales, deux branches

Module hors ligne du pack fluides. Aucune dépendance, aucune requête réseau.
Ouvrir `index.html` ; une escale précise s'ouvre par `index.html?e=<identifiant>`.

## D'où ça vient

Deux parcours composés par F. Henninot sur Claude Design — « Amélioration du module
co2Animate » (9 étapes) puis « Anico2mate » (12 étapes) — livrés en `.dc.html`. Ce format
ne tourne pas seul : il lui faut le runtime Design (React, et un `new Function` qui interdit
toute politique de sécurité stricte). Le fond a donc été transposé dans le format maison :
même charte, même voix, même feuille d'impression que les modules pressostats.

**Les dessins sont ceux de la source**, nettoyés du runtime : douze SVG, dont trois animés
(la centrale booster, le cycle sur le diagramme, l'éjecteur). Un seul a été ajouté ici,
`etat-pt` — le diagramme pression-température, que le chapitre « Carte d'identité »
réclamait pour situer les trois points remarquables les uns par rapport aux autres.

## Pourquoi treize escales et pas un parcours

Le parcours d'origine durait 35 à 45 minutes d'un seul tenant. Un module long s'abandonne en
cours de route ; une escale de moins de dix minutes se termine. Chaque escale porte ses écrans,
ses questions et son bilan, et la carte du site en fait autant de stations — sans dupliquer un
octet de code. C'est le motif de la sous-station NRD, décidé le 20/08/2026.

## Deux branches, parce qu'une seule ligne était trop lourde

Décision de F. Henninot le même jour : « il y a trop de choses pour le CO₂, on va faire une
branche centrale qui expliquera les différents types de centrales ».

| branche | escales | ce qu'elle traite |
|---|---|---|
| **Le fluide** | 8 | pourquoi le CO₂, sa carte d'identité, le point critique, **le point triple et la mise en service**, les deux cycles, la HP optimale, la sécurité |
| **Les centrales** | 5 | la centrale booster, son tracé, les familles d'architecture, les compresseurs, l'éjecteur |

Le champ `branche` de chaque chapitre ne fait que grouper : un seul fichier derrière, et la
barre des escales sépare visiblement les deux ensembles.

## Les illustrations

Cinq planches du fonds inerWeb, copiées dans `illustrations/` pour que le module reste
autonome : la carte des risques du R-744 (ce que la classe A1 ne dit pas), la bouteille en
coupe et ses deux robinets, le CO₂ qui remplit un local par le bas, la chaîne de détection, et
le taux de remplissage d'une bouteille. Elles étaient déjà animées et avaient déjà réglé le
piège du mouvement réduit : leur animation PORTE le contenu, elle ne se coupe pas.

## Ce qui a été corrigé au passage

- **Le cadre réglementaire.** La source citait l'arrêté du 29 février 2016 et « catégorie I
  pour tous équipements ». C'est le régime abrogé. Le R-744 relève de la **catégorie B**,
  créée par l'arrêté du 21 novembre 2025, et du **groupe G13** (17 codes) qui n'est évalué
  que dans cette catégorie. La catégorie D ne couvre que la récupération des gaz fluorés.
- **Le quiz.** Dans la source, les six bonnes réponses étaient toutes en première position :
  cliquer la première case validait tout sans rien lire. Les propositions sont désormais
  mélangées au rendu, et la rédaction a été rééquilibrée pour que la bonne réponse ne soit
  pas non plus la plus longue. Mesure : `node controle-quiz.mjs`.
- **Le refroidissement adiabatique n'est pas une famille d'architecture.** La source le
  rangeait avec la cascade et le booster ; c'est un système ajouté qui pulvérise de l'eau en
  micro-gouttelettes dans l'air entrant, pour refroidir l'échangeur haute pression. Il ne
  touche pas au circuit. Correction de F. Henninot, 20/08.
- **Le point triple était cité, jamais expliqué.** Il a désormais son escale, avec ce qui en
  découle sur le chantier : un circuit tiré au vide est très en dessous de 5,18 bar, donc la
  charge commence en phase gazeuse et ne passe en liquide qu'une fois ce seuil dépassé.

## Les fichiers

| fichier | rôle |
|---|---|
| `index.html` | la coquille : charte, barre des escales, outils de lecture |
| `cours.js` | tout le contenu : 13 escales, 53 écrans de leçon, 34 questions, 13 bilans |
| `visuels-svg.js` | les douze dessins repris de la source, nettoyés |
| `visuels.js` | le rendu : dessins, planches, cartes, tableaux, chaînes, quiz et bilan |
| `illustrations/` | les cinq planches du fonds inerWeb reprises par le module |
| `moteur.js` | navigation, voix, quiz, bilan |
| `couverture.json` | l'adossement au référentiel, et ce que le module NE tient PAS |
| `controle-quiz.mjs` | mesure : la bonne réponse se devine-t-elle sans lire ? |
| `voix-textes.mjs` | les textes exacts que la voix prononce, pour les enregistrer |

## La voix

Le module lit ses écrans à voix haute. « Écouter » arme la lecture suivie : elle enchaîne les
écrans d'elle-même jusqu'à « Stop », lit la légende du schéma et numérote les réponses du
quiz — sans quoi un élève qui ne lit pas entendrait la question sans pouvoir choisir.

Deux niveaux de qualité, dans cet ordre :

1. **Les enregistrements Piper** (`fr_FR-siwis-medium`), servis par `moteur/voix.js` dès que
   le texte lu figure à l'index. C'est la même voix que les 1 423 narrations du pack.
2. **La voix du navigateur**, si le texte a changé depuis l'enregistrement. Le module choisit
   une voix française **installée sur la machine** ; les voix distantes (Google, dans Chrome)
   ne servent qu'en dernier recours, parce qu'elles enverraient chaque phrase lue à un tiers.

Le tableau `ORALISER` de `moteur.js` reprend les règles de prononciation de la chaîne
d'enregistrement du dépôt et y ajoute ce qui est propre au CO₂ : MT et BT deviennent
« moyenne » et « basse température », HP et BP se disent en toutes lettres, COP s'épelle.

**Refaire les enregistrements après une correction de texte :**

```
node packs/fluides/res/co2-r744/voix-textes.mjs --ecrire
node build/voix/collecter-narrations.mjs
python build/voix/generer-audios-piper.py --model <chemin>/fr_FR-siwis-medium.onnx \
  --corpus build/voix/corpus.json --output packs/fluides/res/voix/audio \
  --index moteur/voix-index.js --key <clé> [--key …]
```

Un texte modifié dont l'enregistrement n'est pas refait ne pose aucun problème : la clé ne
correspond plus, et la voix du navigateur reprend la main. **Un vieil enregistrement ne peut
donc jamais lire un contenu devenu faux.**

## Ce qui reste

- La **relecture métier** n'est pas faite. Les valeurs sont cohérentes entre elles et avec les
  tables usuelles du R744, mais aucun frigoriste ne les a contrôlées sur pièce.
- Les **codes pratiques 13.06 à 13.14** (analyse de risques, épreuve de pression, essai sous
  vide, récupération, charge, contrôle d'étanchéité, rapport) ne sont pas tenus par ce module
  et ne sont pas revendiqués : ils se travaillent sur installation.
- L'**adossement au référentiel** de `couverture.json` est proposé par lecture des libellés.
  Il attend la validation de F. Henninot.
