# Photos des organes

Dépose ici une photo par organe, nommée avec l'identifiant du symbole :

```
photos/filtre_deshydrateur.jpg
photos/separateur_huile.jpg
photos/regulateur_kvp.jpg
```

Puis déclare-la dans `outils/definitions.py`, sur l'organe concerné :

```python
'filtre_deshydrateur': dict(
    objet="…",
    probleme="…",
    ou="…",
    photo="photos/filtre_deshydrateur.jpg"),
```

Enfin : `python3 outils/generer-donnees.py`

La photo apparaît alors à trois endroits, sans autre modification :
la fiche du trousseau, l'aperçu « C'est quoi, au juste ? » ouvert depuis
un atelier, et le trousseau imprimable.

Le champ est **facultatif** : un organe sans photo s'affiche exactement
comme aujourd'hui, avec son seul symbole.

## Quelles photos

**Photographie le matériel de l'atelier.** C'est la voie la plus simple —
aucune question de droits, et les élèves reconnaissent leur propre plateau
technique, ce qui vaut mieux qu'une photo de catalogue.

Les photos du document de référence et celles des sites techniques
(ABC CLIM et autres) sont **sous droit d'auteur** : elles ne peuvent pas
être reprises ici. Les visuels de catalogues constructeurs demandent
l'autorisation de leur éditeur.

## Conseils de prise de vue

- Fond neutre, l'organe seul, pris de trois quarts.
- Format paysage, largeur utile autour de 800 px : au-delà, le trousseau
  imprimé devient lourd pour rien.
- Nomme le fichier avec l'identifiant exact du symbole — c'est ce qui fait
  le lien.
