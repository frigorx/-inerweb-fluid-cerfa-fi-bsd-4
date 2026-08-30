# inerweb.fr HabFluide — partie théorique · compte de reprise

> Pour reprendre le chantier à froid, dans une session neuve, sans relire aucun
> historique. État au 30/08/2026 (relecture métier intégrée, encadrés recousus), branche `claude/livret-habilitation-fluide-d5n1yt`,
> [PR #33](https://github.com/frigorx/-inerweb-fluid-cerfa-fi-bsd-4/pull/33).

**Le livre part en autoédition Amazon KDP.** Format 6 × 9 pouces, **390 pages**, noir et blanc. Il prépare l'**épreuve
théorique** de l'attestation d'aptitude fluides frigorigènes, **catégories A1,
A2, D et E**. La pratique fera l'objet du second livre.

**Le paquet à téléverser est prêt : `livret/dist/kdp/`** — l'intérieur, la
couverture, et la fiche `A-LIRE-AVANT-DE-TELEVERSER.md` qui donne les valeurs
à recopier écran par écran (cotes, prix, description, mots-clés). Le contrôle
`npm run verifier` passe au vert.

---

## ⚠ La pagination n'était PAS reproductible — c'est réparé, ne pas défaire

Aucune `<img>` ne déclarait ses cotes : le navigateur devait décoder 314
images (22 Mo de data-URI) pour savoir quelle hauteur leur réserver, et le
même livre sortait à 383, 272 ou 231 pages selon l'humeur du décodage. Le
« 383 pages » des reprises précédentes était un artefact.

Réparé dans `pages.mjs` (fonction `cotes()`, `width`/`height` sur chaque
image). **La pagination est stable d'une fabrication à l'autre (390 pages au dernier tirage — elle ne bouge plus qu'avec le contenu).** Si un
jour la pagination bouge entre deux `npm run tout` sans changement de contenu,
c'est cette régression-là qui revient.

---

## La chaîne — `cd livret && npm run tout`

| Maillon | Ce qu'il fait |
|---|---|
| `extraire.mjs` | Texte depuis `packs/fluides/cartes.js` de `frigorx/pilote-fluides`. Vérifie les **39 codes théoriques A1/A2/D/E** — un manque arrête tout. |
| `contenu-categories.mjs` | Chapitre 4 (les sept catégories) depuis `referentiel-2025.json`. |
| `visuels.mjs` | 121 visuels à 2400 px. Force l'**état final** des planches animées en respectant où chaque animation FINIT (un libellé qui disparaît reste caché) ; une planche **en boucle** (majorité d'animations finissant éteintes) est au contraire révélée entière. |
| `qr.mjs` | 95 alias `inerweb.fr/f/<slug>` + pages de redirection statiques. |
| `build-livret.mjs` | Word éditable ; tirage des questions (95 uniques après déduplication), **rang des bonnes réponses réparti**. |
| `build-html.mjs` + `pages.mjs` + `finition.py` | Le 6 × 9 : HTML autonome + PDF. La finition pose bandeaux/pieds en **polices intégrées** (Trebuchet/Calibri du système — jamais helv/hebo, KDP les refuse), force le **compte pair**, et écrit `kdp.gen.json` sur la pagination réelle. |
| `couverture.mjs` | **La couverture est maintenant générée** depuis `kdp.gen.json` (elle était écrite à la main : dos calé sur 390 pages pour un livre de 290). 4e + dos + 1re, PDF prêt à téléverser. |
| `build-corrige.mjs` | Corrigé formateur, mêmes tirages que l'élève. |
| `paquet-kdp.mjs` | Assemble `dist/kdp/` : les DEUX fichiers pour Amazon + la fiche de téléversement. |
| `verifier-kdp.py` | Dernier mot : formats, polices embarquées, marges 6,35 mm, 300 ppp, dos cohérent. **La chaîne échoue si un critère bloquant saute.** |

Autres commandes : `npm run couverture` · `npm run verifier` ·
`EDITION=dys npm run html` (édition Lexend).

## Soin typographique (fait dans `pages.mjs`, fonction `ech`)

- 1 719 apostrophes droites → courbes ; paires de `'…'` → « chevrons » ;
  espaces **insécables** avant `; : ! ?` et dans les guillemets.
- Le ⚠ emoji (bitmap couleur, illisible en N&B) : remplacé par un **triangle
  vectoriel** dans les titres d'encadré, par « À éviter : » au fil du texte.
- La planche centrale (22 repères) est **couchée** (page paysage dans une
  page portrait, classe `.paysage`) : +72 % de surface.

## Le référentiel est tracé page par page

Chaque page du livre porte en pied, à côté du numéro, les **codes de
l'arrêté qu'elle travaille** : « Référentiel : 12.02 · 12.13 ». Le rattachement n'est pas deviné : il vient du champ
`dc` des cartes source, écrit par l'auteur du cours (« G8 · codes 8.01 ·
8.05 », intervalles « 5.05 → 5.09 » développés à l'extraction).

De là découlent trois choses, toutes régénérées à chaque fabrication :

| Pièce | Ce qu'elle dit |
|---|---|
| pied de page | les compétences travaillées **sur cette page** |
| « Index des codes », en fin de livre | pour un code, **les chapitres** où le retrouver |
| `dist/kdp/audit-referentiel.md` (`npm run audit`) | l'inventaire exhaustif : combien de pages par code, du plus vu au moins vu, et **ce qui manque** |

**Audit au 28/08 : 39 codes théoriques sur 39 vus, aucun sur une seule
page, aucun absent.** Fréquence de 4 à 39 pages par code, médiane 12 — le
déséquilibre se lit dans le tableau et se corrige en ajoutant ou en
allégeant une leçon. `audit-referentiel.mjs` **fait échouer la chaîne** si
un code théorique disparaît ou si un code inconnu du référentiel est marqué.

Le périmètre reste la THÉORIE : les 55 codes évalués en atelier sont
comptés à part, leur absence n'est pas une faute.

## Ce qui reste

1. **Relecture métier du lexique** — 61 entrées dans `build/lexique.mjs`,
   rédigées et non extraites. **Seule main de F. Henninot.**
2. ~~Relecture des planches réveillées~~ — **FAIT le 30/08** : les 4 planches
   dont le défaut était dans le SVG source (`co2-protection`,
   `secu-bouteille`, `secu-projection`, `secu-decomposition-ari`) sont
   corrigées à la source et vérifiées au rendu — géométrie seule, aucun mot
   changé. [PR pilote-fluides #5](https://github.com/frigorx/pilote-fluides/pull/5)
   (avec la relecture métier), en attente de fusion ; revérifier en ligne
   après le déploiement Pages.
3. ~~Déployer les redirections~~ — **FAIT le 29/08** : `f/` est sur `main` de
   `frigorx/pilote-fluides`, et la boucle `curl -L` sur les 95 alias de
   `qr.gen.json` donne **200 partout** (cible déployée = table courante,
   contrôlé sur pièce). La PR pilote-fluides #4, devenue sans objet, est
   fermée. Si une cible change un jour : rééditer le `index.html` de l'alias
   dans `pilote-fluides/f/`, jamais le livret.
4. **Décisions d'édition** (fiche `dist/kdp/A-LIRE-…` § « à décider ») :
   ISBN gratuit KDP ou acheté AFNIL ; prix (coût d'impression **5,28 €**, plancher Amazon 8,80 €, conseillé 24,90 €).
5. **Épreuve imprimée** avant mise en vente : gris des planches, QR scannés
   (dont un depuis une photocopie), dos dans les plis. (L'attribution
   QElectroTech est TRANCHÉE : 2 symboles en viennent, le crédit est imprimé
   et vérifié par le registre.)
6. 9 icônes bitmap 512 px restent sous 300 ppp (l'une à 268) — accepté par
   KDP, à re-exporter en grand un jour depuis la bibliothèque.


## Densification du 28/08 — le livre couvre enfin son référentiel

Une **matrice de couverture** (`npm run matrice`, sortie dans `dist/kdp/`)
croise les 136 codes de l'arrêté avec ce que le livre imprime, et compte les
MOTS consacrés à chacun. Elle a montré le vrai défaut : sur les 39 codes
théoriques du périmètre A1/A2/D/E, **18 seulement étaient traités** et 21
expédiés en moins de 150 mots — les organes à 66-98 mots.

Quatre leviers, dans cet ordre :

1. **Les filtres de paragraphes levés.** Le plan ne retenait que 51 % du texte
   des cartes source (`paras: [0,2,5]`). Toutes les leçons prennent désormais
   `paras: 'tous'` : 213 → 500 paragraphes. **+30 pages, sans une ligne neuve.**
2. **La technologie écrite dans la SOURCE** (`pilote-fluides`, commit `2bac781`,
   donc en ligne aussi) : pose du bulbe, égalisation interne/externe,
   électrovanne et pump down ; les régulateurs **enfin nommés — KVP, KVL, KVR,
   KVC** — leur règle de réglage, la bouteille anti-coup, le pressostat
   différentiel d'huile ; les trois familles et les trois zones du condenseur ;
   le contenu du registre ; l'étiquetage des inflammables.
3. **La banque de révision** en fin d'ouvrage : les 75 questions que les
   chapitres n'avaient pas prises (la source en porte 252, un chapitre en pose
   six), entrelacées entre chapitres comme le fait l'épreuve, chacune marquée
   de son chapitre d'origine, avec son corrigé. **168 questions corrigées** en
   tout, contre 95.
4. **Les symboles en vignette** (`.symbole`, 46 % de largeur) : un pictogramme
   normalisé prenait 40 % d'une page pour rien.

**Résultat mesuré : 39 codes théoriques sur 39 traités, zéro effleuré.**
**388 pages** (288 le matin du 28/08).

### Deux défauts de fond corrigés au passage

**81 encadrés sur 109 s'imprimaient réduits à leur titre.** La source
n'enveloppe pas toujours son texte dans un `<p>`, et le rendu ne cherchait
que ceux-là : 3 639 mots n'arrivaient jamais au papier, dont « le piège des
manomètres ». Réparé dans `encadre()` (`pages.mjs`).

**27 questions sur 93 étaient hors des codes de leur chapitre.** Le chapitre
« Lire une classe de sécurité » ouvrait sur six questions de nomenclature.
La répartition se fait maintenant en passes (`repartirLesQuestions`,
`build-livret.mjs`) : l'ordre des `groupesQ` du plan fait foi, et les
chapitres se servent **du plus pauvre au plus riche** — la source ne porte
que 180 énoncés distincts pour 252 questions, et cinq chapitres n'en ont
aucun en propre. En dernier recours un chapitre trop pauvre reprend un
énoncé posé ailleurs, jusqu'à quatre, **et la chaîne l'annonce**.

### L'instant le plus riche

Le rendu des planches animées ne fige plus « la fin » mais **le moment où le
plus d'éléments sont visibles ensemble** (`etatFinal`, `visuels.mjs`). C'est ce
qui règle d'un coup les deux cas contraires : la planche en boucle est saisie
pleine, le libellé remplacé est saisi seul. Ne pas revenir en arrière : figer
la fin vidait les boucles, tout révéler empilait les libellés.

## Relecture éditoriale du 28/08 — intégrée

Verdict reçu : « excellent brouillon, pas prêt à vendre tel quel ». Tout le
bloquant est corrigé, dans la source (`pilote-fluides`, commit `dc0ea59`) et
dans le livret :

- **Formulations absolues** : détection CO₂ « dès que la norme l'impose » ;
  « A1 : fluides FLUORÉS, jamais CO₂/NH₃ » (coup d'œil + lexique) ;
  attestation rattachée aux opérations réglementées ; surchauffe/sous-refr.
  en repères d'apprentissage (« plage indicative », garde du ch. 7).
- **Promesse prudente** : « support de révision indépendant » en sous-titre
  KDP, description Amazon et page copyright.
- **Page juridique refaite** : la revente de l'exemplaire papier n'est plus
  « interdite » (épuisement du droit, CPI L122-3-1) ; reste protégée la
  reproduction/diffusion numérique/modification.
- **Droits d'images prouvés** : `registre-visuels.mjs` génère
  `dist/kdp/registre-visuels.md` depuis les métadonnées Dublin Core des
  fichiers. 2 symboles QElectroTech (CC BY 3.0) → attribution imprimée en
  crédits, la fabrication ÉCHOUE si elle disparaît.
- **Déclaration IA KDP** : section dédiée dans la fiche (« Oui » texte et
  images, justification écrite).
- **37 doublons d'énoncé supprimés** (le R410A était posé 7 fois) : le tirage
  n'imprime plus jamais deux fois le même énoncé (dédup globale dans
  `build-livret.mjs`). 288 pages au lieu de 290.

**Resterait à trancher par F. Henninot** : la « banque finale de révision »
proposée par le relecteur (déplacer les questions de nomenclature répétables
en fin d'ouvrage) — restructuration éditoriale, non lancée.


## Passe de finition du 29/08 — les huit points d'une relecture externe

Une relecture a listé huit blocages avant Amazon. Tous traités ; **deux
étaient des régressions de la densification de la veille**, ne pas les
refaire :

1. **HTML imprimé sur 18 pages** (`<br>`, `<iframe>` de réglette, `<img>`).
   Nettoyé à l'extraction (`pourLePapier`) ET au rendu (`ech`) : défense en
   profondeur, aucune balise ne peut atteindre le papier.
2. **⚠ RÉGRESSION — sept paires de pages jumelles.** En donnant à chaque
   leçon « tous » les paragraphes, plusieurs leçons d'un même chapitre
   partageant une carte réimprimaient le même texte. La carte se **répartit**
   entre ses leçons en tranches consécutives (`extraire.mjs`, `tranche`).
3. **Chapitre 4 hors sujet** : il interrogeait sur la nomenclature des
   fluides. Ses questions se **génèrent** maintenant depuis le référentiel
   (`questionsCategories`) : périmètres, charges limites, correspondances
   2008, durées d'épreuve.
4. **Codes CO₂/NH₃ mal étiquetés** « épreuve pratique — tome 2 » alors
   qu'ils sont THÉORIQUES en catégorie B ou C → « hors périmètre —
   catégorie B ».
5. **L'audit surestimait** : un code déclaré par une leçon marque toutes
   ses pages. Il compte désormais les **leçons** et les **mots**, classe sur
   les mots, et le dit explicitement.
6. **⚠ RÉGLAGE QUI MENTAIT — le corps mesurait 10,7 pt pour un réglage de 14.**
   Chrome rend la page dans son repère de pixels (96 ppp) puis la met à
   l'échelle du PDF (72) : les **mm passent intacts, les pt ressortent au
   trois quarts**. `cssImprimable()` (dans `build-html.mjs`) rétablit
   l'échelle une fois pour toutes. **Ne pas la retirer** : sans elle tout le
   livre rapetisse d'un quart sans prévenir. Corps **12,4 pt réels**,
   bandeau 8, pied 7,6. Monter à 14 est possible (`reglages.json`) mais
   pousse le livre vers 440 pages.
7. **Sommaire sans numéros, PDF sans signets** : la finition écrit les deux
   (elle seule connaît la pagination). 19 signets, 19 numéros, traits de
   conduite.
8. **Marqueurs internes `@@D|11;8.01@@` dans la couche texte** sur 336 pages :
   1 224 effacés par rédaction après lecture. Titre et auteur du PDF posés.

Marge basse portée à 15 mm : à 13, un accent orphelin descendait à 5,98 mm
du bord et le contrôle KDP bloquait (limite 6,35).

## Les règles que ce livre ne peut pas enfreindre

- **Aucune question officielle chiffrée** (89 `pk-*` écartées, verrou actif).
- **Aucun document pédagogique tiers** (`bib-*` écartées d'office).
- **Croix du frigoriste** : détendeur gauche, compresseur droite, condenseur
  haut, évaporateur bas.
- **Aucun texte ne chevauche un tracé.**
- **Rang des bonnes réponses réparti** — échec au-delà de 40 % sur une lettre.
  (Actuel : A 28 · B 23 · C 28 · D 28.)

## Relecture métier du 30/08 — intégrée

Six corrections de F. Henninot sur épreuve PDF, **appliquées à la source**
(`pilote-fluides` : `cartes.js`, banque, table `CORRECTIONS` de `convert.mjs`
— [PR #5](https://github.com/frigorx/pilote-fluides/pull/5)) puis reprises
ici par refabrication : registre lié au contrôle d'étanchéité · mode de
charge = procédure constructeur, zéotrope soutiré liquide · glissement
d'ampleur variable · rectangle du log p-h = cycle idéal · diagnostic en
hypothèse à départager · NH₃/CO₂/GWP nuancés. Trois raccourcis propres au
livret corrigés dans `plan-chapitres.mjs` (voix haute du ch. 7, légende
« Premier indice d'un manque de charge », activité « fait soupçonner »).

**Et un bug de fabrication trouvé en vérifiant** : 14 encadrés sur 109
perdaient leur premier ET leur dernier alinéa à l'impression (`<br>` devenus
`</p><p>` sans clôture — l'enveloppe est posée dans `extraire.mjs`, ne pas
défaire). C'est ce qui cachait « aucune de ces lectures ne conclut seule »,
pourtant à la source. 386 → 390 pages, dos 22,31 mm.

**Signalé, à la main de F. Henninot** : corps du texte ≈ 12,4 pt, sous le
minimum 14 pt de la charte lisibilité inerWeb (FLE/DYS) — à juger sur
l'épreuve imprimée ; passer à 14 pt = repagination massive.

## Où vivent les choses

| Quoi | Où |
|---|---|
| Source éditoriale (44 fiches, 269 questions, capsules) | `frigorx/pilote-fluides`, `packs/fluides/` — variable `PILOTE_FLUIDES` |
| Référentiel officiel (136 codes, verbatim JO) | `packs/fluides/referentiel-2025.json` |
| Questions officielles chiffrées — NE JAMAIS IMPRIMER | `frigorx/habilitation-fluide/evaluation/data/*.enc` |
| Projet Claude Design (couverture + gabarit, **synchronisé le 28/08** (recaler si le dos bouge encore)) | `claude.ai/design/p/cd323c8c-77ba-4f07-a98d-bf9d4e9800f4` |
| **Paquet Amazon prêt** | `livret/dist/kdp/` (2 PDF + fiche) |
| Livrables régénérables, non commités | `livret/dist/`, `qr.gen/`, `visuels.gen/`, `curseurs.html`, `couverture-kdp.html` |

## Reprise en une commande

```bash
cd livret && npm install && PILOTE_FLUIDES=C:/git/pilote-fluides npm run tout
```

(Il faut Chrome — variable `CHROME` vers le binaire —, Python + pymupdf, et
des polices : `finition.py` essaie `C:/Windows/Fonts/` puis retombe sur
Carlito, métriquement compatible — `apt-get install fonts-crosextra-carlito`
sur Linux.)
