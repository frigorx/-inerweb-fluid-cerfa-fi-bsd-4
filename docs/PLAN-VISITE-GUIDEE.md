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

---

## v2 en PROPOSITION — la voix de la démonstration (13/08 au soir)

> **Statut : PROPOSITION — en attente de validation Franck. Rien n'est codé.**
> Demande de Franck (13/08 au soir) : un vocal DE QUALITÉ dans la démo, « comme
> si quelqu'un faisait la démonstration et expliquait tout », avec un petit
> speech de présentation — « le même principe que les tutos animés du
> programme d'habilitation fluide ».

### Le principe de Pilote Fluides, mesuré sur pièce (06/08)

Relevé dans `pilote-fluides` en ligne (`moteur/voix.js` + `moteur/voix-index.js`) :

1. les narrations sont des **fichiers MP3 locaux fabriqués À LA CONSTRUCTION**
   par **Piper** (voix neuronale française `fr_FR-siwis-medium`, 22 050 Hz,
   48 kbit/s) — aucun service distant, ni à la fabrication ni au chargement ;
2. un **index généré** (« ne pas modifier à la main ») fait correspondre
   l'empreinte du texte affiché à son fichier audio ;
3. à l'exécution, un texte connu joue son fichier (la voix de qualité), un
   texte inconnu **retombe sur la voix du navigateur** : l'application ne
   dépend jamais du lot audio, un texte modifié parle quand même ;
4. **aucun son sans geste humain**.

### Transposition proposée (à l'échelle de la visite : ~25 narrations, pas 1 423)

- **Le corpus EST l'écran** : la voix dit les textes déjà affichés par le
  panneau — `titre`, `consigne`, `attendu` de chaque étape, les trois
  propositions de parcours, le mot de fin — plus le **speech de présentation**
  (projet ci-dessous, seul texte nouveau). Jamais un mot à l'oreille qui ne
  soit pas sous les yeux (la voix ne porte jamais seule une information).
- **Déroulé** : le speech part quand le visiteur clique « Commencer la
  visite » (le geste humain — les navigateurs bloquent de toute façon tout
  son non sollicité) ; ensuite chaque étape se dit à l'arrivée, chaque
  arrivée étant elle-même un geste (Suivant, clic de mission, geste réel
  détecté). Bouton « Couper la voix / Remettre la voix » toujours visible sur
  le panneau, préférence mémorisée ; « Quitter » et Échap arrêtent net la
  lecture (patron du guide).
- **Fichiers** : `v8/res/voix-visite/*.mp3` + index généré voisin ; poids
  total estimé ≈ 1 Mo (négligeable pour la démo en ligne, hors paquet
  portable si souhaité).
- **Module** : `v8/js/composants/voix-visite.js` — même principe que Pilote,
  mécanique réduite à notre échelle : appel direct depuis la visite (pas de
  détournement global de `speechSynthesis`, utile seulement pour rétrofitter
  des cours existants) ; clé d'empreinte de texte IDENTIQUE à celle de Pilote
  (outillage compatible d'un projet à l'autre) ; repli = synthèse du
  navigateur, patron « Écouter cette étape » du guide.
- **Fabrication** : `outils/generer-voix-visite.mjs` LIT le module de la
  visite (l'écran reste la seule source de vérité), écrit le corpus, appelle
  Piper + encodage MP3 **sur le poste** (patron
  `build/voix/generer-audios-piper.py` de Pilote, même voix) ; l'outil est
  hors filet, l'index généré n'est jamais édité à la main.
- **Licences** : inscrire la voix (`fr_FR-siwis-medium`, corpus SIWIS) à
  `LICENCES-TIERCES.md` après relecture RÉELLE de sa licence (doctrine du
  dépôt : licences relues fichier par fichier).
- **Preuves** : suite `test-voix-visite.mjs` — chaque texte de chaque
  parcours a sa narration attendue au corpus ; index et fichiers concordent
  (empreintes) quand le lot est présent ; le repli parle quand le lot
  manque ; aucun son sans geste (rien à l'amorçage) ; couper/remettre
  mémorisé. Vérification navigateur sur banc jetable, TOUT VERT, CHANGELOG +
  CARTE-CODE.

### Projet de speech de présentation (à corriger par Franck — c'est SA voix)

« Bienvenue dans inerWeb Fluide. Vous êtes dans la démonstration : toutes les
données sont fictives, et rien ne sort de votre navigateur. Ce logiciel tient
le registre des fluides frigorigènes d'un établissement : le parc de machines,
le stock de bouteilles, chaque mouvement de fluide, les contrôles
d'étanchéité, et les documents qui vont avec — jusqu'au CERFA rempli
automatiquement. La visite guidée vous met la main sur les gestes du
quotidien : lire le tableau de bord, enregistrer un vrai mouvement avec
l'assistant, ouvrir le document d'exercice, et voir ce que verrait un
inspecteur le jour du contrôle. Choisissez votre parcours : l'essentiel en
cinq minutes, la visite complète en quinze, ou la visite du frigoriste, la
plus poussée. À chaque étape, l'écran vous montre où cliquer, et vous pouvez
quitter quand vous voulez. Bonne visite. »

### Questions à Franck (la réalisation part de ses réponses)

1. **La voix** : Piper `fr_FR-siwis-medium` — la même que Pilote, cohérence
   de la voix « maison » d'un projet à l'autre, fabrication locale
   (recommandé) — ou une voix humaine enregistrée ?
2. **Le déroulé sonore** : l'étape se dit à l'arrivée, après le geste initial
   (recommandé : c'est « quelqu'un qui fait la démonstration ») — ou
   uniquement au clic d'un bouton « écouter » à chaque étape ?
3. **Le speech de présentation** ci-dessus : corriger directement dans le
   texte (ton, longueur, mots).
