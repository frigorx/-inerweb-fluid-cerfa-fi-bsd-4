# D'où viennent les images de ce module

Cinq planches, toutes du **fonds inerWeb** — aucune image tierce, aucune image générée.

| fichier | origine dans le dépôt | où elle sert |
|---|---|---|
| `co2-risques.svg` | `packs/fluides/res/illustrations/classes-de-securite_co2-risques.svg` | escale 1 · « La contrepartie » |
| `bouteille-deux-robinets.svg` | `packs/fluides/res/illustrations/bouteille-deux-robinets.svg` | escale 4 · « Deux prises, et une seule est bonne au démarrage » |
| `co2-point-bas.svg` | `packs/fluides/res/svg/co2-point-bas.svg` | escale 8 · « Le CO₂ s'accumule en point bas » |
| `co2-protection.svg` | `packs/fluides/res/svg/co2-protection.svg` | escale 8 · « On protège d'abord le local » |
| `secu-bouteille.svg` | `packs/fluides/res/svg/secu-bouteille.svg` | escale 8 · « Les bouteilles » |

**Copiées, pas liées.** Le module doit rester autonome : il tourne hors ligne, et il doit
pouvoir être posé ailleurs — dans inerWeb Fluide, par exemple — sans traîner l'arborescence du
site derrière lui. La contrepartie est connue : si la planche d'origine est corrigée, la copie
ne l'est pas. Les cinq fichiers sont identiques à leur original au 20/08/2026.

**Elles s'animent seules.** Chacune porte son propre `<style>` et ses propres `<animate>` :
servies par une balise `<img>`, elles ne doivent rien à la page. Deux d'entre elles portent un
commentaire qui vaut d'être relu — leur animation a été **délibérément décrochée** de
`prefers-reduced-motion`, parce qu'elle porte le contenu : sur une machine dont les effets
d'animation Windows sont désactivés, couper l'animation supprimait la démonstration elle-même
(la nappe qui monte, l'alarme qui se déclenche).

## Les dessins du parcours, qui ne sont pas des fichiers

Les douze autres dessins — cloche, cycles, courbes de COP, centrale booster, diagramme,
éjecteur, trois destinations du flash gas — vivent dans `visuels-svg.js`. Ils viennent des deux
parcours composés par F. Henninot sur Claude Design (« co2Animate » puis « Anico2mate »),
nettoyés du runtime Design. Le treizième, `etat-pt` (diagramme pression-température), est
fabriqué dans `visuels.js` : il n'existait pas dans la source.

## Ce qui a été consulté et NON repris

**intarcon.com — « Réfrigération au CO₂ transcritique »** (lien fourni par F. Henninot le
20/08/2026). Schémas de centrales, diagrammes, courbes de COP, coupe d'éjecteur. Ces images
appartiennent à un site commercial : **elles ne sont pas dans le module**, et ne doivent pas y
entrer. Elles ont servi à vérifier le fond et ont apporté un point qui manquait — le maximum de
COP et le maximum de puissance frigorifique ne sont pas à la même haute pression. Détail dans
`SOURCES-METIER.md`.

C'est la règle déjà appliquée au tutoriel Coolselector, resté non diffusable à cause des
captures Danfoss. Si un schéma de ce type est voulu ici, il est à **redessiner** en SVG à la
charte.
