# Packaging illustrations intérieures HabFluide v2

Pack local au livre, sans modification de la couverture ni du dépôt pilote-fluides.

## Contenu

- 18 planches SVG originales dans `svg/`.
- `manifest.json` : inventaire et destinations.
- `SOURCES-IMAGES.md` : provenance et droits.
- `build-pack.mjs` : générateur reproductible.
- `qa-pack.mjs` : contrôle des SVG et aperçu global.
- `qa-pdf-integration.py` : contrôle des planches réellement embarquées dans le PDF intérieur.

## Refaire et contrôler le pack

`node illustrations-interieures-v2/build-pack.mjs`

`node illustrations-interieures-v2/qa-pack.mjs`

Après reconstruction du PDF intérieur :

`python illustrations-interieures-v2/qa-pdf-integration.py`

Commandes à lancer depuis `livret/`.

## Statut

BROUILLON. Une QA technique ne remplace pas la validation métier ni le BAT papier.
