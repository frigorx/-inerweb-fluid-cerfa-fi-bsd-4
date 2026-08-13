# Plan — VISITE GUIDÉE de la démonstration (13/08/2026)

## La demande (Franck, 13/08)

Un tutoriel **intégré au mode démo en ligne** — pas une page à part (le
`guide.html` pas-à-pas existe et reste) : un parcours guidé DANS l'application
de démonstration, pour qu'un visiteur (collègue, artisan, prof) découvre les
gestes clés sans lecture préalable.

## Décisions de Franck (13/08, conception validée AVANT le code)

1. **Mécanique : les deux combinées** — pastilles-guides qui surlignent
   l'élément réel de l'écran, ET liste de mission cochable qui sert de
   récapitulatif et de table des matières (on peut sauter à une étape).
2. **Parcours : les trois, au choix du visiteur** — le choix se fait en
   cliquant la proposition au lancement de la visite :
   - « L'essentiel » (4 étapes, ~5 min) : tableau de bord → mouvement au
     wizard → CERFA → dossier d'audit ;
   - « La visite complète » (~15 min) : + créer une machine, créer une
     bouteille, balance matière. Le geste « balance + audit » est découpé en
     DEUX étapes pour que chaque étape garde UNE cible à l'écran (7 étapes) ;
   - « La visite du frigoriste » (~20 min) : la complète + contrôle
     d'étanchéité + dossier de fuite (9 étapes).
3. **Déclenchement : proposée à la première visite** (mémoire `localStorage`,
   jamais re-proposée d'office) **+ bouton permanent « Visite guidée »** dans
   le pied de la barre latérale, relançable à volonté.

## Invariants (chartes et doctrine)

- **DÉMO seulement** : `visiteDisponible(store)` = `modeLabel !== 'LOCAL'`.
  Aucun bouton, aucune proposition, aucun code actif en mode Local (le mode
  exercice est un mode Local : il n'est pas concerné par cette v1 ; le module
  est écrit pour qu'un simple élargissement du prédicat l'y ouvre plus tard).
- **L'élément visé n'est JAMAIS recouvert ni rendu incliquable** : le repère
  de surbrillance est en `pointer-events: none` (aucun voile), et le panneau
  d'étape se place dans un coin qui ne recoupe pas la cible
  (`choisirCoin`, fonction pure éprouvée par la suite de tests).
- **Jamais bloquant** : « Suivant » reste toujours disponible (une étape se
  valide au geste réel quand il est détectable — navigation, compteur du
  magasin — sinon à la main), Échap quitte à tout instant (sauf quand une
  modale est ouverte : c'est elle que la touche ferme), « Quitter » visible.
- **Le texte n'est jamais superposé au contenu visé** ; la couleur ne porte
  jamais seule une information (repère = liseré + étiquette texte ; étape
  faite = coche + libellé, pas seulement une teinte).
- Clavier complet (boutons réels, ordre logique), `aria-live="polite"` sur le
  bloc d'étape, `prefers-reduced-motion` : halo statique, aucune animation.
- Français simple, zéro anglicisme à l'écran, zéro emoji, thème clair seul.

## Architecture

- **`v8/js/composants/visite-guidee.js`** — module autonome vanille :
  données des parcours (`PARCOURS_VISITE`), prédicat `visiteDisponible`,
  géométrie pure (`choisirCoin`, `seRecoupent`), fabrique
  `creerVisiteGuidee({ store, naviguer })` (panneau, repère, détection des
  gestes via `hashchange` + `store.surChangement`, mémoire de première
  visite `CLE_MEMOIRE_VISITE`).
- **`v8/js/app.js`** — trois points de couture : création du contrôleur au
  démarrage (démo seule), bouton « Visite guidée » au pied de la barre
  latérale (démo seule), proposition à la première visite après le premier
  rendu.
- **`v8/css/composants.css`** — section dédiée en fin de fichier.
- **`v8/js/composants/test-visite-guidee.mjs`** — suite en rendu HTML réel
  (patron `test-dechets-libelles`) : données des parcours, géométrie,
  disponibilité par magasin, modale de proposition, panneau, avancement au
  geste réel (création d'une machine détectée), démontage, et vérification
  de surface du `pointer-events: none` et du branchement `app.js`.

## Hors périmètre (consigné)

- Le vocal (`speechSynthesis`) du guide : pas dans cette brique.
- Le mode exercice : réutilisation prévue par le prédicat, pas activée.
- Aucune migration, aucun contrat touché, aucun code serveur.
