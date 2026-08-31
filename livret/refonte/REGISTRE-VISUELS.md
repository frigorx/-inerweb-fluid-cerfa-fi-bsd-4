# Registre des visuels — inerWeb HabFluide

> **Livrable 6** du cadrage éditorial du 31 août 2026.
> Pour chaque visuel imprimé : fichier, sujet, auteur, source, licence, modifications, preuve,
> date de vérification et crédit affiché.
>
> **Vérification faite le 31 août 2026** contre `visuels.gen.json` (manifeste de fabrication) et les
> métadonnées Dublin Core lues dans les fichiers sources.

## Ce que le livre imprime

**159 références**, pour 284 citations dans les pages.

| Type | Nombre |
|---|---:|
| Planche vectorielle dessinée | 64 |
| Illustration | 37 |
| Symbole normalisé | 24 |
| Planche de station réglementaire | 21 |
| Icône | 7 |
| Ambiance | 5 |
| Planche vectorielle (jeu v2) | 1 |

## Origine et droits

**Tout ce qui est imprimé appartient à inerWeb.** Aucun visuel tiers n'entre dans le livre :
ni image de marque, ni photographie de matériel identifiable, ni capture de document pédagogique
d'un autre auteur. Ce n'est plus une discipline, c'est un verrou : `build/visuels.mjs` refuse
désormais toute référence `bib-*`, tout chemin `res/illustrations/`, toute famille `photo`, et
les trois planches écartées à la relecture. Une référence interdite arrête la fabrication.

### Les images générées

Les familles `illu`, `amb` et `ico` sont des **images générées par un modèle d'image**, sous
direction de F. Henninot, en juillet 2026. Le manifeste de commande et les prompts sont conservés
dans le pack (`res/bibliotheque/MANIFESTE.md`). Le paquet de téléversement KDP en tient compte :
`paquet-kdp.mjs` prévoit de répondre **oui** à la question d'Amazon sur le contenu généré par IA.

**Règle éditoriale appliquée.** Ces images portent l'objet, le geste ou la mise en situation.
Elles ne portent jamais un schéma, un circuit, une courbe ou un symbole normalisé : le prompt de
génération l'interdisait explicitement, et les planches vectorielles s'en chargent.

**Contrôle du 31 août 2026.** Les 43 images ont été examinées à l'œil, avec la légende sous laquelle elles
sont imprimées. Six légendes ne décrivaient pas ce que l'image montre et ont été corrigées :

| Image | Légende avant | Ce que l'image montre | Légende après |
|---|---|---|---|
| `illu:g1a` | Les quatre organes | un manomètre et un disque perforé | Ce que le manomètre donne à lire |
| `illu:g7b` | Le régulateur de pression | une main qui peigne des ailettes | Redresser les ailettes, rétablir l'échange |
| `illu:g8b` | Les sécurités | un évaporateur givré | Le givre isole la batterie |
| `illu:p3` | Le vacuomètre, pas le manomètre | une pompe à vide | La pompe à vide et son instrument |
| `illu:g4b` | Trois instruments | deux instruments | Pression et température, deux lectures |
| `illu:g10` | Le support de tuyauterie | un brasage au chalumeau | La flamme sur l'assemblage |

Ces erreurs n'étaient pas des défauts de dessin : les images sont bonnes et cohérentes
graphiquement. C'était l'appariement qui était faux — une image choisie dans une banque
thématique sans vérifier qu'elle disait ce que la légende annonçait. Dans un livre qui prépare
une épreuve réglementaire, une légende qui nomme un instrument que l'image ne montre pas est une
erreur technique, pas une maladresse de mise en page.

### Réserve : une licence contradictoire dans les fichiers sources

**39 planches** portent dans leur code une déclaration `cc:license` **CC BY-NC-ND 4.0**,
qui interdit l'usage commercial et les œuvres dérivées, alors que leur champ `dc:rights` du même
fichier indique « © inerWeb — tous droits réservés ».

Il n'y a **pas de blocage juridique** : F. Henninot est l'auteur de ces planches et peut en
disposer. Mais la déclaration est incohérente, elle part à l'impression dans un livre vendu, et
le garde-fou de `registre-visuels.mjs` ne la voit pas — il teste le texte de `dc:rights`, jamais
l'attribut `cc:license`. **À nettoyer dans le pack avant le bon à tirer.**

Planches concernées : `svg:aptitude-capacite`, `svg:balayage-azote`, `svg:balayage-detecteur`, `svg:chaleur-sensible-latente`, `svg:charge-limite-local`, `svg:circuit-complet-manifold`, `svg:classes-securite`, `svg:co2-nh3-compare`, `svg:co2-point-bas`, `svg:co2-protection`, `svg:compresseurs`, `svg:coup-de-liquide-piston`, `svg:croix-frigoriste`, `svg:detendeur-regulation`, `svg:detendeurs-ligne`, `svg:diagramme-logph`, `svg:echangeur-air`, `svg:epreuve-azote`, `svg:familles-fluides`, `svg:givre-degivrage` — et 19 autres.

## Le registre

« Cit. » = nombre de fois où le visuel est imprimé dans le livre. ★ = planche animée à l'écran,
figée à l'impression.

| Référence | Type | Auteur | Licence | Modifications | Cit. | Source |
|---|---|---|---|---|---:|---|
| `amb:fin` | Ambiance | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/amb-fin.webp` |
| `amb:jour1` | Ambiance | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/amb-jour1.webp` |
| `amb:jour2` | Ambiance | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/amb-jour2.webp` |
| `amb:jour3` | Ambiance | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/amb-jour3.webp` |
| `amb:jour4` | Ambiance | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/amb-jour4.webp` |
| `ico:attestation` | Icône | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Découpe de planche générée | 5 | `packs/fluides/res/bibliotheque/icones/ico-attestation.png` |
| `ico:cerfa` | Icône | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Découpe de planche générée | 1 | `packs/fluides/res/bibliotheque/icones/ico-cerfa.png` |
| `ico:cles` | Icône | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Découpe de planche générée | 2 | `packs/fluides/res/bibliotheque/icones/ico-cles.png` |
| `ico:registre` | Icône | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Découpe de planche générée | 3 | `packs/fluides/res/bibliotheque/icones/ico-registre.png` |
| `ico:role-competence` | Icône | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Découpe de planche générée | 3 | `packs/fluides/res/bibliotheque/icones/role-competence.png` |
| `ico:role-juste` | Icône | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Découpe de planche générée | 1 | `packs/fluides/res/bibliotheque/icones/role-juste.png` |
| `ico:role-question` | Icône | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Découpe de planche générée | 1 | `packs/fluides/res/bibliotheque/icones/role-question.png` |
| `illu:cl2` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-cl2.webp` |
| `illu:examen` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 4 | `packs/fluides/res/bibliotheque/illu-examen.webp` |
| `illu:g0` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g0.webp` |
| `illu:g10` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 2 | `packs/fluides/res/bibliotheque/illu-g10.webp` |
| `illu:g11` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 2 | `packs/fluides/res/bibliotheque/illu-g11.webp` |
| `illu:g12` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 2 | `packs/fluides/res/bibliotheque/illu-g12.webp` |
| `illu:g12b` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g12b.webp` |
| `illu:g13` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 2 | `packs/fluides/res/bibliotheque/illu-g13.webp` |
| `illu:g1a` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g1a.webp` |
| `illu:g1b` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 2 | `packs/fluides/res/bibliotheque/illu-g1b.webp` |
| `illu:g1c` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 2 | `packs/fluides/res/bibliotheque/illu-g1c.webp` |
| `illu:g1d` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g1d.webp` |
| `illu:g1e` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 2 | `packs/fluides/res/bibliotheque/illu-g1e.webp` |
| `illu:g1s` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g1s.webp` |
| `illu:g2` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g2.webp` |
| `illu:g3` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g3.webp` |
| `illu:g4a` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 2 | `packs/fluides/res/bibliotheque/illu-g4a.webp` |
| `illu:g4b` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g4b.webp` |
| `illu:g4c` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 2 | `packs/fluides/res/bibliotheque/illu-g4c.webp` |
| `illu:g5a` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g5a.webp` |
| `illu:g5b` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g5b.webp` |
| `illu:g6` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 2 | `packs/fluides/res/bibliotheque/illu-g6.webp` |
| `illu:g6b` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g6b.webp` |
| `illu:g7` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g7.webp` |
| `illu:g7b` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 2 | `packs/fluides/res/bibliotheque/illu-g7b.webp` |
| `illu:g8` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 2 | `packs/fluides/res/bibliotheque/illu-g8.webp` |
| `illu:g8b` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g8b.webp` |
| `illu:g9` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g9.webp` |
| `illu:g9b` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-g9b.webp` |
| `illu:p1` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-p1.webp` |
| `illu:p2` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-p2.webp` |
| `illu:p3` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-p3.webp` |
| `illu:p4` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-p4.webp` |
| `illu:p5` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-p5.webp` |
| `illu:p6` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-p6.webp` |
| `illu:p7` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-p7.webp` |
| `illu:s5` | Illustration | Image générée par IA sous direction de F. Henninot | © inerWeb — tous droits réservés | Génération dirigée, prompts conservés | 1 | `packs/fluides/res/bibliotheque/illu-s5.webp` |
| `leg:aptitude-capacite/deux-papiers` | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/aptitude-capacite/svg/deux-papiers.svg` |
| `leg:dechets-responsabilites/chaine-producteur-detenteur` | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/dechets-responsabilites/svg/chaine-producteur-detenteur.svg` |
| `leg:dechets-responsabilites/registre-producteur` | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 2 | `legislation/stations/dechets-responsabilites/svg/registre-producteur.svg` |
| `leg:dechets-sept-flux/dechets-dangereux-a-part` | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/dechets-sept-flux/svg/dechets-dangereux-a-part.svg` |
| `leg:dechets-sept-flux/rangee-bennes-matiere` | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/dechets-sept-flux/svg/rangee-bennes-matiere.svg` |
| `leg:impact-ecoconception/concevoir-pour-durer` ★ | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-ecoconception/svg/concevoir-pour-durer.svg` |
| `leg:impact-ecoconception/etiquette-energie` | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-ecoconception/svg/etiquette-energie.svg` |
| `leg:impact-montreal-kigali/frise-trois-temps` ★ | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-montreal-kigali/svg/frise-trois-temps.svg` |
| `leg:impact-montreal-kigali/montreal-1987` ★ | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-montreal-kigali/svg/montreal-1987.svg` |
| `leg:impact-montreal-kigali/nouveau-probleme-prp` ★ | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-montreal-kigali/svg/nouveau-probleme-prp.svg` |
| `leg:impact-montreal-kigali/ozone-vers-climat` | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-montreal-kigali/svg/ozone-vers-climat.svg` |
| `leg:impact-prp-odp/cas-chambre-froide` ★ | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-prp-odp/svg/cas-chambre-froide.svg` |
| `leg:impact-prp-odp/deux-echelles` | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-prp-odp/svg/deux-echelles.svg` |
| `leg:impact-prp-odp/mecanisme-odp` ★ | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-prp-odp/svg/mecanisme-odp.svg` |
| `leg:impact-prp-odp/mecanisme-prp` ★ | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-prp-odp/svg/mecanisme-prp.svg` |
| `leg:impact-prp-odp/piege-odp-nul` | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-prp-odp/svg/piege-odp-nul.svg` |
| `leg:impact-prp-odp/quatre-situations` | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-prp-odp/svg/quatre-situations.svg` |
| `leg:impact-prp-odp/repere-deux-axes` ★ | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-prp-odp/svg/repere-deux-axes.svg` |
| `leg:impact-tewi/balance-tewi` ★ | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-tewi/svg/balance-tewi.svg` |
| `leg:impact-tewi/part-indirecte` ★ | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-tewi/svg/part-indirecte.svg` |
| `leg:impact-tewi/piege-machine-gourmande` ★ | Planche de station réglementaire | F. Henninot (inerWeb) | © inerWeb — tous droits réservés | Dessin original SVG | 1 | `legislation/stations/impact-tewi/svg/piege-machine-gourmande.svg` |
| `pack:co2-local-protege` | Planche vectorielle (jeu v2) | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 3 | `../../Users/henni/-inerweb-fluid-cerfa-fi-bsd-4/livret/illustrations-interieures-v2/svg/co2-local-protege.svg` |
| `svg:aptitude-capacite` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 4 | `packs/fluides/res/svg/aptitude-capacite.svg` |
| `svg:balayage-azote` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 3 | `packs/fluides/res/svg/balayage-azote.svg` |
| `svg:balayage-detecteur` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 4 | `packs/fluides/res/svg/balayage-detecteur.svg` |
| `svg:brasage-balayage-azote` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 1 | `packs/fluides/res/svg/brasage-balayage-azote.svg` |
| `svg:categories-champs` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 1 | `packs/fluides/res/svg/categories-champs.svg` |
| `svg:chaleur-sensible-latente` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 1 | `packs/fluides/res/svg/chaleur-sensible-latente.svg` |
| `svg:charge-limite-local` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 4 | `packs/fluides/res/svg/charge-limite-local.svg` |
| `svg:circuit-complet-manifold` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 2 | `packs/fluides/res/svg/circuit-complet-manifold.svg` |
| `svg:classe-lettre-chiffre` | Planche vectorielle dessinée | F. Henninot (direction métier), chaîne inerWeb (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 1 | `packs/fluides/res/svg/classe-lettre-chiffre.svg` |
| `svg:classes-securite` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 5 | `packs/fluides/res/svg/classes-securite.svg` |
| `svg:co2-nh3-compare` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 4 | `packs/fluides/res/svg/co2-nh3-compare.svg` |
| `svg:co2-nh3-deux-risques` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 1 | `packs/fluides/res/svg/co2-nh3-deux-risques.svg` |
| `svg:co2-point-bas` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 2 | `packs/fluides/res/svg/co2-point-bas.svg` |
| `svg:co2-protection` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 1 | `packs/fluides/res/svg/co2-protection.svg` |
| `svg:code-nomme-classe-previent` | Planche vectorielle dessinée | F. Henninot (direction métier), chaîne inerWeb (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 1 | `packs/fluides/res/svg/code-nomme-classe-previent.svg` |
| `svg:compresseurs` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 3 | `packs/fluides/res/svg/compresseurs.svg` |
| `svg:compresseurs-comparatif` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 2 | `packs/fluides/res/svg/compresseurs-comparatif.svg` |
| `svg:condenseur-ecart-encrassement` | Planche vectorielle dessinée | F. Henninot (direction métier), chaîne inerWeb (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 2 | `packs/fluides/res/svg/condenseur-ecart-encrassement.svg` |
| `svg:condenseur-trois-zones` | Planche vectorielle dessinée | F. Henninot (direction métier) et Claude (tracé SVG) | © inerWeb, tous droits réservés | Dessin original SVG | 2 | `packs/fluides/res/svg/condenseur-trois-zones.svg` |
| `svg:consignation-cinq-etapes` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 1 | `packs/fluides/res/svg/consignation-cinq-etapes.svg` |
| `svg:coup-de-liquide-piston` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 1 | `packs/fluides/res/svg/coup-de-liquide-piston.svg` |
| `svg:croix-frigoriste` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 5 | `packs/fluides/res/svg/croix-frigoriste.svg` |
| `svg:croix-frigoriste-etats` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 2 | `packs/fluides/res/svg/croix-frigoriste-etats.svg` |
| `svg:detendeur-regulation` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 1 | `packs/fluides/res/svg/detendeur-regulation.svg` |
| `svg:detendeurs-ligne` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 2 | `packs/fluides/res/svg/detendeurs-ligne.svg` |
| `svg:deux-etages-deux-papiers` | Planche vectorielle dessinée | F. Henninot (direction métier), chaîne inerWeb (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 2 | `packs/fluides/res/svg/deux-etages-deux-papiers.svg` |
| `svg:diagramme-logph` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 4 | `packs/fluides/res/svg/diagramme-logph.svg` |
| `svg:echangeur-air` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 1 | `packs/fluides/res/svg/echangeur-air.svg` |
| `svg:epreuve-azote` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 3 | `packs/fluides/res/svg/epreuve-azote.svg` |
| `svg:familles-fluides` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 6 | `packs/fluides/res/svg/familles-fluides.svg` |
| `svg:givre-degivrage` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 1 | `packs/fluides/res/svg/givre-degivrage.svg` |
| `svg:givre-isole-machine-force` | Planche vectorielle dessinée | F. Henninot (direction métier), chaîne inerWeb (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 2 | `packs/fluides/res/svg/givre-isole-machine-force.svg` |
| `svg:lecture-table` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 6 | `packs/fluides/res/svg/lecture-table.svg` |
| `svg:lie-domaine` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 4 | `packs/fluides/res/svg/lie-domaine.svg` |
| `svg:ligne-liquide-protection` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 1 | `packs/fluides/res/svg/ligne-liquide-protection.svg` |
| `svg:logph-lecture` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 1 | `packs/fluides/res/svg/logph-lecture.svg` |
| `svg:manifold-lecture` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 3 | `packs/fluides/res/svg/manifold-lecture.svg` |
| `svg:mesure-surchauffe` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 4 | `packs/fluides/res/svg/mesure-surchauffe.svg` |
| `svg:mesures-surchauffe-sous-refroidissement` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 3 | `packs/fluides/res/svg/mesures-surchauffe-sous-refroidissement.svg` |
| `svg:nomenclature` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 4 | `packs/fluides/res/svg/nomenclature.svg` |
| `svg:ordre-vannes` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 1 | `packs/fluides/res/svg/ordre-vannes.svg` |
| `svg:pesee-charge` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 2 | `packs/fluides/res/svg/pesee-charge.svg` |
| `svg:points-de-fuite` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 9 | `packs/fluides/res/svg/points-de-fuite.svg` |
| `svg:prepa-chantier` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 2 | `packs/fluides/res/svg/prepa-chantier.svg` |
| `svg:pression-absolue-relative` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 3 | `packs/fluides/res/svg/pression-absolue-relative.svg` |
| `svg:prp-echelle` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 6 | `packs/fluides/res/svg/prp-echelle.svg` |
| `svg:quatre-leviers-energie` | Planche vectorielle dessinée | F. Henninot (direction métier), chaîne inerWeb (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 2 | `packs/fluides/res/svg/quatre-leviers-energie.svg` |
| `svg:r290-zone-intervention` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 2 | `packs/fluides/res/svg/r290-zone-intervention.svg` |
| `svg:recherche-fuite-geste` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 1 | `packs/fluides/res/svg/recherche-fuite-geste.svg` |
| `svg:recuperation` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 5 | `packs/fluides/res/svg/recuperation.svg` |
| `svg:recuperation-securisee` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 2 | `packs/fluides/res/svg/recuperation-securisee.svg` |
| `svg:regulateurs-kv-places` | Planche vectorielle dessinée | F. Henninot (direction métier) et Claude (tracé SVG) | © inerWeb, tous droits réservés | Dessin original SVG | 1 | `packs/fluides/res/svg/regulateurs-kv-places.svg` |
| `svg:regulateurs-pression` | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 3 | `packs/fluides/res/svg/regulateurs-pression.svg` |
| `svg:secu-bouteille` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 1 | `packs/fluides/res/svg/secu-bouteille.svg` |
| `svg:secu-consignation` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 2 | `packs/fluides/res/svg/secu-consignation.svg` |
| `svg:secu-decomposition-ari` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 1 | `packs/fluides/res/svg/secu-decomposition-ari.svg` |
| `svg:secu-flamme` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 3 | `packs/fluides/res/svg/secu-flamme.svg` |
| `svg:securite-decomposition-fluide` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 1 | `packs/fluides/res/svg/securite-decomposition-fluide.svg` |
| `svg:securite-espace-clos` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 1 | `packs/fluides/res/svg/securite-espace-clos.svg` |
| `svg:securite-pression-residuelle` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 1 | `packs/fluides/res/svg/securite-pression-residuelle.svg` |
| `svg:securite-projection-fluide` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 1 | `packs/fluides/res/svg/securite-projection-fluide.svg` |
| `svg:sequence-mise-en-service` | Planche vectorielle dessinée | F. Henninot (direction métier) et OpenAI Codex (dessin SVG original) | © 2026 Franck Henninot, inerWeb. Tous droits réservés. | Dessin original SVG | 1 | `packs/fluides/res/svg/sequence-mise-en-service.svg` |
| `svg:surchauffe-utile-totale` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 2 | `packs/fluides/res/svg/surchauffe-utile-totale.svg` |
| `svg:tirage-au-vide` ★ | Planche vectorielle dessinée | inerWeb — F. Henninot | © 2026 inerWeb — F. Henninot — tous droits réservés sur l’illustration | Dessin original SVG | 3 | `packs/fluides/res/svg/tirage-au-vide.svg` |
| `sym:bouteille_liquide` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/bouteille_liquide.svg` |
| `sym:compresseur_piston` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/compresseur_piston.svg` |
| `sym:compresseur_rotatif` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/compresseur_rotatif.svg` |
| `sym:compresseur_scroll` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/compresseur_scroll.svg` |
| `sym:compresseur_vis` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/compresseur_vis.svg` |
| `sym:detendeur_electronique` | Symbole normalisé | Collection QElectroTech | Symbole issu de la collection QElectroTech, sous licence CC BY 3.0. Se | Symbole redessiné | 1 | `packs/fluides/res/symboles/detendeur_electronique.svg` |
| `sym:detendeur_thermo_ext` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/detendeur_thermo_ext.svg` |
| `sym:echangeur_a_air` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 2 | `packs/fluides/res/symboles/echangeur_a_air.svg` |
| `sym:echangeur_a_plaques` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/echangeur_a_plaques.svg` |
| `sym:electrovanne_frigo` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/electrovanne_frigo.svg` |
| `sym:filtre_deshydrateur` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/filtre_deshydrateur.svg` |
| `sym:manometres` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 5 | `packs/fluides/res/symboles/manometres.svg` |
| `sym:pompe` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/pompe.svg` |
| `sym:pressostat` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/pressostat.svg` |
| `sym:pressostat_bp` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/pressostat_bp.svg` |
| `sym:pressostat_hp` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/pressostat_hp.svg` |
| `sym:resistance_evaporation` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/resistance_evaporation.svg` |
| `sym:separateur_huile` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/separateur_huile.svg` |
| `sym:sonde_temperature` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/sonde_temperature.svg` |
| `sym:thermostat_froid` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/thermostat_froid.svg` |
| `sym:tube_capillaire` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/tube_capillaire.svg` |
| `sym:vanne_isolement` | Symbole normalisé | Collection QElectroTech | Symbole issu de la collection QElectroTech, sous licence CC BY 3.0. Se | Symbole redessiné | 1 | `packs/fluides/res/symboles/vanne_isolement.svg` |
| `sym:vanne_securite` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/vanne_securite.svg` |
| `sym:ventilateur` | Symbole normalisé | Bibliothèque inerWeb | © inerWeb — tous droits réservés | Symbole redessiné | 1 | `packs/fluides/res/symboles/ventilateur.svg` |

## Crédit affiché dans le livre

Les crédits imprimés portent la mention de propriété inerWeb et l'attribution QElectroTech
CC BY 3.0 pour la bibliothèque de symboles.

**Réserve à lever avant impression** : l'audit n'a trouvé aucun visuel provenant de la collection
QElectroTech parmi ceux que le livre imprime. Soit un symbole en dérive et il faut l'identifier,
soit la mention est orpheline. Elle **ne sera pas retirée** sans cette vérification : l'attribution
d'une licence CC BY est une obligation, pas une option, et une mention en trop est un moindre mal
qu'une attribution manquante.

---

*Registre établi le 31 août 2026. Document de travail, en attente du bon à tirer de F. Henninot.*