# TP — Le pump-down le plus simple du monde (CAP IFCA)

Sources HTML du TP. **La mise en page reprend celle des documents imprimables du TP
BAC PRO MFER 1re année** (`pedagogie/symboles-frigo/` : `carnet-eleve.html`,
`interrogation.html`, `memo-frigoriste.html`) : mêmes polices, mêmes corps, mêmes classes,
mêmes couleurs. Un document de ce dossier doit pouvoir être posé à côté d'un document
symboles-frigo sans qu'on voie la couture.

Calibri 14 pt (12 pt à l'impression), Trebuchet MS bold en titres, texte en `#1b3a63`,
accent `#ff6b35`, fond clair.

## Ce que fait la séance

On **découvre** le pump-down, puis on le **câble**. Rien d'autre.

1. Les deux animations inerWeb racontent l'histoire — sans sécurité, puis sécurité minimum :
   on y voit la migration du fluide. QR code sur la fiche, l'élève scanne.
2. On enchaîne sur le schéma : **identifier** les éléments, puis **compléter** le schéma du
   pump-down d'après celui de la sécurité minimum — on complète, on compare.
3. On **trace les fils sur le bornier**, stylo bleu pour le neutre, rouge pour la phase, vert
   pour la terre, comme si on les posait.
4. On **câble** pour de vrai : un bornier, un disjoncteur, et c'est fini. Le professeur contrôle,
   puis met sous tension lui-même.

**Pas de circuit de commande, pas de puissance** : ils viennent aux séances suivantes, dans cet
ordre — câblage commande, puis câblage de puissance en schéma classique.

Les plus beaux câblages sont gardés pour les projets chef-d'œuvre et les maquettes pédagogiques.

## D'où vient le contenu

Le TP **restitue le sujet d'origine** `cablage pump donwn le plussimpl.docx` (F. Henninot) — ses
six étapes, ses consignes, ses figures — remis à la charte et augmenté des QR codes inerWeb.
Les planches de bornier viennent du jeu de folios **« Schéma PUMP DOWN le plus simple du monde »**
(F. Henninot, 12 folios).

## Économie d'encre — la règle du dossier

Ces documents sont tirés en seize exemplaires, plusieurs fois par an.

Ce que la charte MFER apporte déjà : texte en `#1b3a63` plutôt qu'en noir, lignes à écrire
en **pointillé** plutôt qu'en cadre plein, en-têtes de tableau en `#eef4f9`, filets `#b9c2cc`
de 1 px. Tout cela est repris tel quel.

**Un seul écart assumé avec symboles-frigo :** là-bas le `h2` est un bandeau *plein* (fond
`#1b3a63`, texte blanc). Sur huit pages en seize exemplaires, c'est l'élément qui coûte le
plus cher. Ici il garde sa forme et son rythme, mais au trait : fond blanc, texte bleu, barre
de gauche épaisse. À dire si tu le veux plein comme dans symboles-frigo — c'est une ligne de CSS.

Les planches tirées du fonds suivent la même règle : les barrettes du bornier sont **délavées**
(`outils-planche-bornier.py` pour le vectoriel, `outils-alleger-encre.py` pour les captures).
Le code couleur reste lisible, et le stylo de l'élève ressort par-dessus le dessin.

Mesure sur la fiche élève : **2,6 % de couverture d'encre en moyenne par page**, contre 4,0 %
pour la version précédente — un tiers de moins.

## Fichiers

| Fichier | Rôle |
|---|---|
| `charte-inerweb-edu.css` | feuille de style commune |
| `tp-pump-down-eleve.html` | fiche d'activité élève, 8 pages |
| `tp-pump-down-professeur.html` | déroulé, corrigés, évaluation, 5 pages — **non versionné** |
| `construire.py` | assemble les PDF (Chromium + pymupdf) |
| `outils-planche-bornier.py` | fabrique les deux planches de bornier depuis le folio 3/12 |
| `outils-alleger-encre.py` | délave les captures couleur du sujet d'origine |
| `assets/` | figures du sujet d'origine, planches de bornier, codes QR |

### Document professeur non versionné

`tp-pump-down-professeur.html` et son PDF portent la mention **« DOCUMENT PROFESSEUR — NE PAS
DISTRIBUER »** et contiennent les corrigés. Ce dépôt étant public, ils sont exclus par le
`.gitignore` de ce dossier ; `construire.py` les prend s'ils sont présents et les ignore sinon.

## Construire les PDF

```bash
python3 construire.py
```

Produit `TP-pump-down-le-plus-simple-ELEVE.pdf` (8 pages) et, si la source professeur est
présente, `TP-pump-down-le-plus-simple-PROFESSEUR.pdf` (5 pages).

Prérequis : Python avec `pymupdf`, un Chromium en ligne de commande, et les polices **Calibri**
(ou **Carlito**, métriquement compatible) et **Trebuchet MS**.

## Les deux planches de bornier

`outils-planche-bornier.py` part du folio 3/12, où le bornier est câblé au complet, et en tire :

- `assets/bornier-a-tracer.svg` — **les fils de couleur retirés**, pour que l'élève les trace ;
- `assets/bornier-corrige.svg` — le folio tel quel, corrigé du professeur.

Le tri se fait sur la couleur du trait : un fil est un tracé dont le contour est vert, bleu ou
rouge pur. Les barrettes colorées du bornier sont des remplissages sans contour : elles restent.
Le repère **PSL**, absent du folio source, est replacé par le script.

## Point de vigilance repris du fonds

Le folio source porte **deux fois le numéro 9** sur les sorties du pressostat BP. Le bornier a
bien 8-9-10 : la seconde sortie est la **borne 10**, et c'est elle qui rejoint la borne 11
(commun du PZH). Le corrigé le dit — à confirmer sur le bornier réel avant la séance.
