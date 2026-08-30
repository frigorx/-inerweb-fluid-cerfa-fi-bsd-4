# Tome 1 « interactif » — plan de chantier

> Ouvert le 29/08/2026, repris le soir même. À lire pour reprendre à froid,
> sans historique.
>
> **État : la chaîne tourne, `npm run tout` passe au vert, `dist/kdp/` est
> téléversable.** Livret **7 × 10, 308 pages**. **Référentiel : 39 codes sur 39
> traités, 0 effleuré, 0 absent.**
> **157 renvois** dans la marge : 19 stations · 76 leçons · 24 animations ·
> 19 entraînements · 19 corrections. Le 6 × 9 de 388 pages n'existe plus que dans git (commit `c026b4e`).
>
> ⚠️ **RIEN N'EST COMMITÉ.** Tout est sur disque, branche
> `claude/livret-habilitation-fluide-d5n1yt`. Éteindre l'ordinateur ne perd
> rien, mais le filet git reste à poser :
> `git add -A && git commit -F <message>` depuis `C:\git\inerweb-fluide`.

## ⚠️ PARTAGE DES CHANTIERS — 29/08, ne pas doubler

**Un autre chat travaille sur `pilote-fluides`** : les séries de questions qui
manquent (CO₂ et compagnie) et les planches pour habiller le livre.
**Cette session n'écrit plus dans `pilote-fluides`.** Elle continue sur le
livret seul.

Ce que l'autre chat doit produire, mesuré ici le 29/08 :

**Planches — 5 chapitres n'ont AUCUNE réserve pour combler leurs blancs :**
4 (les sept catégories) · 16 (tuyauterie et brasage) · 17 (substitution et
efficacité) · 18 (hydrocarbures) · 19 (CO₂ et NH₃).
Réserve mince (1 ou 2 planches) : chapitres 1, 3, 5, 8, 9, 10, 11, 12.
Une planche n'entre dans la réserve que si elle porte un `aria-label` — c'est
lui qui donne sa légende et permet de la rattacher à un chapitre.

**Séries d'entraînement — 112 questions en tout, très inégales :**
`rev-g3` 5 questions · `rev-g10` 6 · `rev-g2` 7 · `rev-g12` 7 · `rev-g7` 8 ·
`rev-g13` (CO₂ et NH₃) 9. Les autres en ont 10.
Rappel : la banque compte 269 questions dont **89 officielles `pk-*` qui ne
doivent JAMAIS entrer dans le livre** — un verrou de la chaîne le vérifie.

⚠️ Après toute écriture dans `cartes.js` : `node build/build.mjs` dans
`pilote-fluides`, sinon le site reste en arrière. Puis ici `npm run tout`.

## Ce qui est décidé

| Décision | Prise le | Ce qu'elle engage |
|---|---|---|
| **Titre et couverture** | 29/08 | « HabFluide — Habilitation à la manipulation des fluides frigorigènes » · sous-titre « Préparation à l'épreuve théorique · Catégories A1, A2, D et E · À jour de l'arrêté du 21 novembre 2025 » · bandeau « Le livre interactif relié à inerweb.fr », avec le nombre de renvois **compté** sur `qr.gen.json`, jamais écrit en dur. |
| **« Tome 1 » reste écrit** | 29/08 | Il décrit ce que le livre EST, pas ce qu'il promet. Sans lui, l'acheteur attend la pratique et la note en pâtit. Les mentions du tome 2 sont passées **au futur, sans date** (« fera l'objet d'un tome 2 ») : au présent, elles laissaient croire qu'il est en vente. **Jamais de calendrier sur une couverture.** |
| **Les marques d'IA ne sont pas citées** | 29/08 | Transparence gardée (« outils d'intelligence artificielle grand public », avant-propos + copyright + crédits), marques retirées : elles dateraient le livre, offriraient une place gratuite à quatre entreprises dans un ouvrage vendu, et « conçu avec ChatGPT » se lit comme un aveu de facilité. La déclaration IA à Amazon reste **interne au formulaire** et n'apparaît pas sur la fiche produit. |
| **Avant-propos de F. Henninot** | 29/08 | Intégré page 3, sa voix mot pour mot. Deux ajustements : les marques d'IA, et « des QCM par QR codes » → « des modules interactifs et des corrections détaillées, accessibles par 157 QR codes » — les QCM sont dans le livre, c'est la correction qui est en ligne. |
| **Format 7 × 10 pouces** (177,8 × 254 mm) | 29/08 | Les 25,4 mm gagnés paient la marge de renvois. La justification ne bouge quasi pas (120,4 → 119,8 mm) : **le gain est en hauteur**, 198,6 → 224 mm, soit +12 % de surface. En 6 × 9, la marge aurait ramené le texte à 89 mm — inacceptable. |
| **Marge de renvois, en miroir** | 29/08 | 26 mm, toujours côté tranche : à droite en page impaire, à gauche en paire, pour que le QR reste sous le pouce et hors de la pliure. |
| **Aucune page ne se termine sur du vide** | 29/08 | Règle de fabrication. Mesurée, pas jugée à l'œil. |
| **Le corrigé quitte le papier, les questions restent** | 29/08 | −37 pages. Un QR ouvre la correction interactive ; on ne lit plus la réponse à côté de la question. |

## Ce qui reste à trancher

- ~~La marge vide~~ — **tranché le 29/08 : elle respire.** Une colonne
  latérale vide se lit comme une respiration, pas comme un trou. La règle
  « pas de blanc » vaut pour la colonne de texte, celle qu'on lit.
- **Les 11 codes effleurés couverts par un module** : rapatrier 150–250 mots
  de condensé dans le livre (la matrice passerait de 62 % à ~100 % traité), ou
  renvoi seul. Recommandation : rapatrier.

## L'état des lieux, mesuré

### Ce que le web a déjà, et que le livre ignore

| Couche | Volume | Entrée par URL |
|---|---|---|
| Capsules narrées | 24 capsules, **151 écrans** | `capsules/index.html?c=g5a&e=5` |
| Modules interactifs | **73 modules**, 30 substantiels (condenseur 24 écrans, étanchéité 27, hydrocarbures 28) | `?dossier=…&ecran=7` et surtout **`?extrait=a,b,c`** |
| Séries d'entraînement | **13 séries** `rev-g1`…`rev-g13` (112 questions) + examens blancs A1/A2/D/E | `formation.html?carte=rev-g5` |
| Banque | **269 questions** dont 89 officielles `pk-*` **interdites au livre** → **180 utilisables** | — |

Chaque question porte déjà `remediation_vers`, `remed.texte`, `illustration`,
`ressources`, `code`, `chapitre`. Et `inventaire-pages.gen.json` mappe
**code du référentiel → pages du livre** : la remédiation « retourne à la page
qui l'explique » est calculable sans rien ajouter.

⚠️ **La banque est inégale** : 28 questions sur le chapitre 01, **5 sur le 03**.
Pour tenir « s'entraîner sans répit » sur 76 leçons, il faudrait passer de 180
à ~400 questions. Chantier de rédaction à part.

### Les blancs du tirage actuel

`python build/mesure-blancs.py` — sur les 388 pages :

| Étape | Pages à ≥ 35 mm | Blanc cumulé |
|---|---|---|
| 6 × 9, avant tout | 121 sur 388 (31 %) | 13,10 m |
| 7 × 10 seul | 107 sur 330 (32 %) | 12,85 m |
| + marge de renvois | 93 sur 316 (29 %) | 10,52 m |
| + comblement et notes | 43 sur 316 (14 %) | 6,52 m |
| + corrigé sorti du papier | **44 sur 306 (14 %)** | **6,62 m** |

Répartition finale : **186 pages pleines** (moins de 15 mm), 75 acceptables
(15–35 mm), 26 à combler (35–70 mm), 19 trous francs. La page 306 est la page
blanche de bourrage qu'impose le compte pair — inévitable, et normale en
édition.

Le blanc est **divisé par deux** et le nombre de pages trouées par trois. Le
changement de format seul n'y était pour rien — proportionnellement il
aggravait même les choses, la page étant plus grande. Ce sont la marge (qui
sort les blocs « À l'écran » du fil) et le comblement qui ont payé.

Cinq causes, dont quatre disparaissent avec la refonte : page vide avant une
ouverture de chapitre, dernière ligne de tableau orpheline, titre seul en haut
de page, bloc « À l'écran » seul en fin de chapitre (celui-ci part dans la
marge et cesse de fabriquer des pages à moitié vides).

**La réserve pour combler** : 62 SVG qu'aucune page n'utilise (16 animés) et
43 photos. Hiérarchie du comblement, dans cet ordre :
1. ce qui manque au lecteur à cet endroit (un « Dans ce chapitre », une
   synthèse) — du contenu, pas une image ;
2. une planche de la réserve **qui traite le sujet de la page** ;
3. jamais d'image décorative : elle serait pire que le blanc.

### Les codes effleurés

15 codes sous 150 mots. Après vérification, **11 sont déjà traités en
profondeur par un module en ligne** ; il n'en reste que **4 sans aucune
ressource** : `11.01` `11.02` `11.04` `11.05` (technologies de substitution,
conception à faible charge). La planche `illustrations/autorises-hfo-naturels.svg`,
en réserve, les amorce visuellement.

## Les étapes

1. ~~Maquette 7 × 10 à marge de renvois~~ — `build/maquette-7x10.mjs`, faite,
   en attente de validation.
2. ~~Mesure des blancs~~ — `build/mesure-blancs.py`, faite.
3. ~~**Géométrie 7 × 10**~~ — **FAITE le 29/08, fabriquée et contrôlée.**
   Le format vit désormais dans `reglages.json` (`page_l_mm`, `page_h_mm`) et
   `build/format.mjs` en dérive cotes, pouces et noms de fichiers : « 6x9 »
   n'est plus écrit en dur nulle part. `verifier-kdp.py` lit le format attendu
   au lieu de le supposer — écrit en dur, il validait un 6 × 9 pendant que la
   chaîne fabriquait autre chose. `finition.py` aligne bandeau et pied sur la
   colonne de texte, pas sur le bord.

   | | Avant (6 × 9) | Après (7 × 10) |
   |---|---|---|
   | Pages | 388 | **330** (−58) |
   | Dos | 22,19 mm | 18,88 mm |
   | Impression | 5,26 € | **4,56 €** |
   | Justification | 120,4 mm | 119,8 mm |
   | Hauteur utile | 198,6 mm | **224 mm** |

   La bande de renvois (39 mm : 26 de marge + 5 de gouttière + 8 de tranche)
   est **réservée et en miroir** — vérifié sur le PDF : page recto, contenu de
   19 mm à 38,8 mm du bord droit ; page verso, l'inverse. Elle est encore vide :
   c'est l'étape 4 qui la remplit.
4. ~~**Le modèle de renvoi**~~ — **FAIT.** `qr.mjs` produit **138 renvois** en
   quatre genres : 19 stations, 76 leçons, 24 animations, 19 entraînements.
   Les 138 sont posés dans la marge, vérifié à chaque fabrication.
   · La leçon ouvre la capsule **sur son écran** quand l'appariement est franc
     (9 cas) ; sinon à son début. On n'invente pas une ancre.
   · L'animation ne pointe que si une page la joue **vraiment** — modules et
     capsules indexés par le nom de fichier SVG qu'ils citent.
   · L'entraînement vise `formation.html?carte=rev-gN`, avec le titre et le
     nombre de questions lus dans `cartes.js`.

   ⚠️ **PIÈGE À NE PAS ROUVRIR** : un marqueur `@@QR|…@@` placé DANS un
   `<h2>` ou un `<h4>` n'est pas rendu par Chrome à l'impression — 41 renvois
   disparaissaient sans bruit. Il doit voyager dans SON PROPRE bloc poussé,
   comme les marqueurs de contexte. Un garde-fou dans `finition.py` écrit
   `renvois-perdus.json` si un renvoi du manifeste manque au PDF.

5. **Anti-orphelin** — *tenté, sans résultat, à reprendre autrement.* Deux
   pistes mesurées et **annulées** parce qu'elles dégradaient : déplacer la
   planche après le premier paragraphe (+3 pages trouées), et laisser courir
   les tableaux de plus de 12 lignes (créait une page entièrement vide).
   Les 43 pages qui résistent sont surtout des **pages de fin d'ouvrage**
   (index des QR, bilan, index des codes) : un titre seul en haut, son grand
   tableau basculé à la page suivante. Elles sont de genre `lim`, donc
   exclues du comblement.

6. ~~**Comblement**~~ — **FAIT**, par `reserve.mjs` + `combler()` dans
   `finition.py`. ⚠️ `reserve.mjs` ne figurait pas dans `tout.mjs` : la
   réserve ne se régénérait jamais. C'est réparé. Le comblement ne peut se faire qu'après pagination : avant,
   nul ne sait où sont les trous.
   · **25 planches** de réserve, rattachées à un chapitre **par le sujet**.
     L'appariement pèse les mots par leur RARETÉ, et un mot rare du nom de
     fichier désigne à lui seul — sans quoi un détendeur partait au chapitre
     du condenseur et une planche d'espace clos au chapitre du condenseur.
   · ⚠️ **Les planches ANIMÉES sortent BLANCHES** si on les rastérise telles
     quelles : elles naissent avec leurs éléments invisibles, c'est
     l'animation qui les révèle. Le livre a ainsi affiché une légende
     flottant seule au milieu du vide qu'elle devait combler. **Réglé** :
     `etatFinal()` est désormais exportée par `visuels.mjs` et utilisée par
     la réserve — une seule logique pour toute la chaîne. La réserve est
     passée de 25 à **36 planches**, et 24 pages reçoivent une vraie
     illustration au lieu de lignes de notes.
   · En dernier recours, des **lignes de notes** (40 pages) : dans un livre
     de formation, de quoi annoter vaut mieux qu'un blanc — et mieux qu'une
     image hors sujet, qui serait pire que le blanc.
7. ~~**Le corrigé en ligne**~~ — **FAIT.** `build/correction.mjs` écrit
   **19 pages** dans `redirections-pages/corriges/<slug>/`, une par chapitre :
   les **107 questions imprimées**, dans l'ordre du livre, avec les mêmes
   choix mélangés (`questions-choisies.gen.json` fait foi — sans cela « la
   réponse B » du papier ne désignerait pas la même chose en ligne).
   **92 renvoient à une page précise du livre**, 101 à une leçon en ligne.
   La section « Les réponses » a quitté le papier ; le bloc « Ma note » porte
   la mention et le QR de correction, vérifié sur les 19 chapitres.

   ⚠️ **Ces pages ne sont pas publiées** : elles attendent dans
   `redirections-pages/corriges/`, à déployer dans `pilote-fluides` avec le
   dossier `f/`. Refabriquer le livre change le tirage — il faut alors les
   redéployer, sinon la correction ne correspond plus au papier.

   ⚠️ Un marqueur de renvoi placé DEVANT un bloc tombe en fin de page
   pendant que le bloc bascule à la suivante : le code se retrouve dans la
   marge d'une autre page. Il doit être posé À L'INTÉRIEUR du bloc, qui est
   insécable.
8. **Les 4 codes orphelins** : rédaction dans `cartes.js` (la source), donc
   profitable au web ET au livre.
9. ~~**Intégrer `mesure-blancs.py` au contrôle final**~~ — **FAIT.** La chaîne
   affiche la mesure après le contrôle KDP. Elle n'arrête PAS la fabrication :
   un blanc n'est pas un défaut qu'Amazon refuse, c'est un défaut que le
   lecteur voit.

## Ce qui reste

- **Étape 5, anti-orphelin** : les 44 pages qui résistent sont surtout des
  pages de fin d'ouvrage (index des QR, bilan, index des codes), de genre
  `lim`, donc exclues du comblement. Deux pistes ont été mesurées puis
  annulées (voir étape 5).
- ~~**Étape 8, les codes effleurés**~~ — **FAIT : 39 codes sur 39 traités.**
  Deux corrections, dont une de ma part sur ce que j'avais annoncé.

  **1. Les « 4 codes orphelins » n'étaient pas absents.** `11.01` `11.02`
  `11.04` `11.05` étaient traités au chapitre 17, mot pour mot (« le CO₂ est
  performant en froid commercial, mais son efficacité baisse quand l'air
  extérieur est très chaud » = `11.04`). C'est la MESURE qui les déclarait
  effleurés.

  **2. La mesure était fausse, pas le livre.** Elle divisait le poids d'un
  chapitre entre tous ses codes : le chapitre 18 couvre 14 codes en 1 045
  mots, donc 75 mots chacun — il lui aurait fallu écrire 2 100 mots pour dire
  la même chose. Elle punissait les chapitres les plus consciencieux.
  Corrigé : le plan déclare désormais les codes **leçon par leçon**
  (`codes:` dans `plan-chapitres.mjs`, 23 leçons étiquetées) et la matrice
  **ne divise plus** — deux cents mots qui expliquent « le condenseur, et où
  il fuit » servent aux deux codes. Une colonne « portée » dit combien de
  codes porte la leçon retenue : c'est là qu'on voit une leçon surchargée.

  **Ce qui a été écrit dans la source** (`cartes.js`, donc site ET livre) :
  · `g11` — le rendement à la conception (condensation flottante, variation
    de vitesse, sous-refroidissement, désurchauffeur) et la charge par le
    choix des composants (plaques brasées, microcanaux, ligne liquide).
  · `g7b` — ce que contient un rapport d'état de condenseur, et l'efficacité
    à l'installation comme à l'entretien.
  · `g8b` — le rapport d'état d'évaporateur, et le réglage du dégivrage.
  · `g8` — le principe de l'évaporateur en détail (palier d'évaporation) et
    ses points de fuite propres.

⚠️ **LE SITE NE SERT PAS `cartes.js`** mais des paquets générés
(`pack.eleve.js`, `pack.pilote.js`, `projection.gen.js`). Après toute
écriture dans la source : `cd C:/git/pilote-fluides && node build/build.mjs`,
sinon le livre avance et le site reste en arrière. Vérifié sur pièce le
29/08 : la fiche évaporateur affichait encore 802 mots après l'écriture,
964 après le build.

## Les pièges à ne pas rouvrir

- La pagination n'était pas reproductible : réparé dans `pages.mjs`
  (fonction `cotes()`, `width`/`height` sur chaque image). Ne pas défaire.
- Les 89 questions officielles `pk-*` ne doivent **jamais** entrer dans le
  livre. Un verrou final le vérifie.
- inerweb.fr est servi par **GitHub Pages** : aucun `.htaccess` n'y redirige.
  Les alias vivent comme pages statiques dans `redirections-pages/f/<slug>/`.
- Un QR imprimé est gravé pour la vie du papier : il ne porte jamais l'adresse
  réelle, seulement l'alias `inerweb.fr/f/<slug>`.
