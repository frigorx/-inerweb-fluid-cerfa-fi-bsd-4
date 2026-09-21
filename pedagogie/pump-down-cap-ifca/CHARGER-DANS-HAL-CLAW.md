# Charger le TP E2 dans HAL Claw

## Ce que je peux faire, et ce que je ne peux pas

Je tourne dans un conteneur isolé, dans le cloud. Je ne vois que le dépôt GitHub
`frigorx/-inerweb-fluid-cerfa-fi-bsd-4`. **HAL Claw écoute sur `localhost:2006` de ta
machine : je ne peux pas l'atteindre, même quand il est démarré.** Le lancer ne change rien
de mon côté.

Ce que j'ai fait à la place : produire les fichiers **au format exact que HAL Claw ingère**,
vérifié clé par clé contre ta `Grille-CAP-IFCA-20260914.json`. Il n'y a plus qu'à les poser
et à recharger.

## Les quatre fichiers

| Fichier | Quoi |
|---|---|
| `Grille-CAP-IFCA-20260921.json` | La grille HAL du premier groupe |
| `Grille-CAP-IFCA-20260921.md` | La même, lisible, pour le classeur |
| `Grille-CAP-IFCA-20260928.json` | Le jumeau du second groupe, seule la date change |
| `Grille-CAP-IFCA-20260928.md` | Idem en lisible |

Deux dates parce qu'un TP se joue deux lundis avec permutation : chaque élève ne le vit
qu'une fois, et n'est donc évalué que sur **une** des deux grilles.

## Le geste

1. Poser les quatre fichiers **à côté de `Grille-CAP-IFCA-20260914.json`**, dans le même
   dossier que celui où la séance du 14/09 les avait déposés.
2. Reconstruire le corpus de la formation `cap2` :
   `node application-v4/scripts/raccorder-cap2.mjs`
3. **Redémarrer le serveur du port 2006.** Tant qu'il tourne avec l'ancien état, rien de ce
   qui a été écrit n'est actif — c'est le piège déjà rencontré le 15/09 au moment de
   raccorder `cap2`.

Classe `2CAP-IFCA`, formation `cap2`, `formationId` `CAP_IFCA` — les trois repères sont
ceux déjà en place, rien de nouveau à déclarer dans `clawFormations.js`, `claw.html` ou
`mur-dossiers-claw.js`.

**Un point que je ne connais pas d'ici** : le chemin disque exact où le 14/09 a déposé sa
grille. Sur le Drive elle est dans `…/02-APRES-MIDI-CAP-IFCA/Professeur/`. Si l'arborescence
locale diffère, c'est le seul endroit où il faut adapter.

## Ce que la grille contient

Deux compétences et le savoir-être, neuf critères observables, quatre niveaux.

| | Critères |
|---|---|
| **C3.6** câbler, repérer, connecter | repérer les bornes · tracer et expliquer avant de poser un fil · câbler conforme au tracé visé |
| **C3.7** contrôler la mise en œuvre | contrôles hors tension · consigner et interpréter |
| **Savoir-être** | régime et validations · EPI et poste · étape 0 et méthode · démonter et ranger |

`NA` = 1 · `EC` = 2 · `M` = 3 · `PM` = 4 · `NE` exclu du calcul, jamais zéro.
Le champ `reussite` reprend mot pour mot le libellé `M`, comme dans la grille du 14/09.

## Trois règles écrites dans le bloc `comportement`

Elles évitent de sanctionner ce qui n'est pas une faute :

- **Câbler sans visa du tracé** → le critère « réaliser » est `NE`, pas `NA`. L'élève n'a
  pas échoué, il est sorti du cadre : ça se traite au savoir-être.
- **Mise sous tension** → faite par le professeur seul, élèves non habilités. Ce que l'élève
  n'a pas le droit de faire ne peut pas lui être compté en manque de compétence : `NE`.
- **La coquille du folio 3/12** (deux fois le repère 9, la seconde sortie du pressostat BP
  est la borne 10) → un élève qui suit le folio à la lettre n'est pas en faute.

## Après la séance

`MAJ-CARTE-2A-semaine-04.md` porte sept questions à remplir à chaud. Ce sont elles qui
feront la carte de l'an prochain.
