# Relecture métier — les six points, tranchés le 20 août 2026

> Décisions de F. Henninot, appliquées le même jour. Chaque point donne le **texte du
> module**, la question posée, et ce qui a été fait.
>
> ⚠️ Ce fichier remplace la section « affirmations à contrôler » de `SOURCES-METIER.md`,
> dont les numéros d'escale étaient périmés : ils dataient d'avant la scission en deux
> branches et l'ajout de l'escale « Le point triple ». Ici les passages sont repérés par
> leur identifiant (`id`), qui ne bouge pas.

---

## 1. Le groupe de maintien à l'arrêt — ✅ confirmé, rien changé

**Où** — escale `securite`, écran `arret-securite`.

Ce que le module affirme, et qui est validé tel quel :

> À l'arrêt, la pression remonte à la pression de saturation du local, environ 57 bar à
> 20 °C. Beaucoup de centrales portent un petit groupe qui l'empêche d'atteindre le tarage
> des soupapes. En cas de coupure de courant prolongée, il s'arrête aussi : la pression
> monte. La soupape peut alors lâcher du fluide : c'est prévu, mais le local doit être
> ventilé et détecté.

La question `z-q4` qui en découle — après trois jours d'arrêt sur coupure, vérifier la
ventilation et la détection avant d'entrer — reste en place.

**Tranché** : l'enchaînement est celui du terrain. Aucune modification.

---

## 2. Les technologies de compresseur — ✅ confirmé, rien changé

**Où** — escale `compresseurs`, écran `technologies`.

> - Piston semi-hermétique : la technologie dominante en transcritique.
> - Scroll : plutôt les petites puissances et les applications subcritiques.
> - Vis : les fortes puissances, surtout en cascade et en subcritique.

Le garde-fou « le catalogue fait foi, pas une règle générale » est jugé suffisant pour
couvrir les cas particuliers. La question `k-q1` reste en place.

**Tranché** : la répartition tient. Aucune modification.

---

## 3. La vanne de gaz de détente bloquée ouverte — ✂️ diagnostic retiré

**Où** — escale `booster`, écran `bypass`.

Le symptôme affirmé était **déduit du fonctionnement, jamais observé** :

> ~~Une vanne de gaz de détente bloquée ouverte fait tourner les compresseurs moyenne
> température sans effet sur les meubles. Le défaut ne se voit pas côté meuble, mais sur
> la consommation.~~

**Tranché** : non vérifiable en l'état, donc retiré. Ont disparu :

- l'encadré « Un symptôme à connaître » ;
- la puce « Si elle reste ouverte en grand, la centrale consomme sans produire de froid » ;
- la question `b-q3` et ses trois propositions.

L'écran garde le rôle de la vanne — court-circuiter les meubles, régler la pression de la
bouteille intermédiaire — sans le diagnostic. L'escale `booster` passe de 3 à 2 questions.

---

## 4. Les plages de surchauffe et de sous-refroidissement — ✅ confirmé, rien changé

**Où** — escale `subcritique`, écrans `trace` et `familier`.

> - Sous-refroidissement : en général **4 à 8 K**.
> - Surchauffe en sortie d'évaporateur : en général **5 à 10 K**.

**Tranché** : les plages HFC se transposent au R744 subcritique. Les chiffres restent, avec
la réserve déjà présente (« le cahier des charges de la machine prime »).

---

## 5. Éjecteur de liquide et éjecteur de gaz — ➕ un écran ajouté

**Où** — escale `ejecteur`, nouvel écran `deux-types`, inséré entre `principe` et
`sur-le-cycle`. L'escale passe de 7 à 9 minutes, de 3 à 4 écrans.

Le bilan revendiquait le code 11.06 — « technologie des éjecteurs, éjecteur de liquide et
de gaz » — alors que l'escale n'expliquait que le principe commun. C'est désormais traité :

> - L'éjecteur de gaz aspire la vapeur de la bouteille flash : elle remonte à la pression
>   intermédiaire sans passer par le compresseur moyenne température.
> - L'éjecteur de liquide aspire le mélange qui sort des évaporateurs, repris au séparateur
>   basse pression.
> - Dans les deux cas, le fluide moteur est le même : le CO₂ haute pression qui sort du
>   refroidisseur de gaz.

Avec un encadré sur ce que permet l'éjecteur de liquide : faire circuler dans l'évaporateur
plus de liquide qu'il n'en évapore, sans pompe de circulation — l'échange s'améliore, et la
sortie de meuble n'est plus en vapeur surchauffée mais en mélange.

Une puce a suivi dans le bilan `e-bilan`, pour que la distinction figure dans ce qui est
retenu.

⚠️ **Ce contenu est neuf et n'a pas encore été relu.** C'est le seul point de cette liste
qui rouvre une question au lieu d'en fermer une — voir « Reste à contrôler » plus bas.

---

## 6. Le chiffre de pression — 🔀 le site s'aligne sur 120 bar

**Où** — la fiche `cl3` du pack (`packs/fluides/cartes.js`) et sa capsule
(`res/capsules/donnees/cl3.js`).

La fiche refusait délibérément tout chiffre, alors qu'elle **porte elle-même le lien** vers
l'escale `securite` de la ligne CO₂, qui annonce « jusqu'à 120 bar ». Le même stagiaire
lisait « sans aucun chiffre », cliquait, et lisait le chiffre.

**Tranché** : le chiffre devient la référence du site ; c'est `cl3` qui s'aligne, pas la
ligne CO₂ qui recule. La fiche dit maintenant :

> Pour fixer l'ordre de grandeur : côté haute pression, une centrale transcritique travaille
> couramment **jusqu'à 120 bar environ**. La valeur exacte dépend du point de fonctionnement
> et se lit sur la **plaque de l'installation** et dans la documentation du constructeur,
> jamais dans un cours — et ce chiffre ne change rien à la règle : **aucun réflexe acquis
> sur un R-134a ou un R-410A ne se transpose ici**.

Trois endroits modifiés : le paragraphe « Premier danger », la puce du bloc « Ce qu'il faut
retenir », et l'écran `danger-pression` de la capsule (texte écrit et texte dit).

La capsule ne demande aucun réenregistrement : elle est lue par la voix du navigateur, et
`res/capsules/LIRE-MOI.md` le pose comme une règle — « aucun fichier son n'est produit ».

Les illustrations `co2-risques.svg` gardent leur libellé « sans commune mesure » : elles
décrivent, elles ne refusent aucun chiffre. Rien à redessiner.

---

## Ce qui a été refait derrière

| | |
|---|---|
| Enregistrements neufs | **3** — écran `bypass` modifié, écran `deux-types`, bilan `e-bilan` |
| Enregistrements à purger | **aucun** : les textes retirés n'avaient ni entrée d'index ni fichier |
| Builds relancés | `capsules` · `relier-capsules` · `build` · `parcours` · `relecture` · `galerie` · `registre` · `chiffres` |
| Couverture référentiel | **100 %**, profondeur **94 / 94**, traçabilité **94 / 94** — inchangées |
| Le module | 13 escales · **67 écrans** (+1) · **33 questions** (−1) · 96 minutes |
| Version des scripts | `?v=20260820-5` → `?v=20260820-6` dans `index.html` |

---

## Reste à contrôler

1. **L'écran `deux-types`**, écrit pour couvrir le code 11.06 — contenu neuf, non relu par
   un frigoriste. Le point le plus sensible : « la sortie de meuble n'est plus en vapeur
   surchauffée mais en mélange », qui décrit une alimentation suralimentée.
2. **L'adossement au référentiel** (`couverture.json`) reste proposé par lecture des
   libellés, comme avant.
3. Les **53 anomalies** du registre sont **préexistantes** à ce chantier : elles n'ont pas
   été introduites ici, et n'ont pas été traitées non plus.

---

## Refaire un enregistrement après correction d'un texte

```
node packs/fluides/res/co2-r744/voix-textes.mjs --ecrire
node build/voix/collecter-narrations.mjs
python build/voix/generer-audios-piper.py --model C:/git/_venv-piper/modeles/fr_FR-siwis-medium.onnx \
  --corpus build/voix/corpus.json --output packs/fluides/res/voix/audio \
  --index moteur/voix-index.js --key <clé> [--key …]
```

Puis incrémenter `?v=` dans `index.html`. Un texte modifié dont l'enregistrement n'est pas
refait retombe sur la voix du navigateur : **un vieil enregistrement ne peut pas lire un
contenu devenu faux.**
