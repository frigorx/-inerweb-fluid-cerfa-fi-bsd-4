# Prompt de reprise — MISE À JOUR DE LA DÉMO EN LIGNE + TUTORIEL INTÉGRÉ (à coller dans un nouveau chat)

> ⚠️ **LES DEUX CHANTIERS SONT EXÉCUTÉS le 13/08/2026 au soir — ne rien
> refaire.** Chantier 1 : PR #26 et PR #27 (deux sessions parallèles,
> réconciliées) fusionnées en merge ordinaire ; SITE vérifié (démo, guide avec
> la partie Animations, racine, pédagogie) ; en complément : **version de semis
> du monde démo** (commit `8fd57ee` — le localStorage d'un visiteur d'avant le
> 28/07 rejouait l'identité réelle). Chantier 2 : **VISITE GUIDÉE livrée sur
> carte blanche complémentaire de Franck** (7 étapes, pastilles-guides,
> `v8/js/views/tutoriel.js`, 40 vérifications, banc navigateur complet —
> `docs/PLAN-TUTORIEL-DEMO.md` a les décisions). **TOUT VERT 138 exécutions +
> 207 attaques.** Voir CHANGELOG (tête) pour le détail et les preuves.
>
> Copier tout ce qui suit comme PREMIER message d'un nouveau chat. Il est autonome.
>
> **Réglage conseillé : opus, effort élevé** (un geste de publication vérifié + un
> chantier d'interface cadré). Pas d'ultracode.

---

Tu reprends **inerWeb Fluide** — logiciel LOCAL de traçabilité des fluides frigorigènes
(F-Gas / CERFA 15497\*04). Dépôt : `C:\git\inerweb-fluide`, branche `main`.

**À lire dans cet ordre avant toute exploration** (ils remplacent 90 % des recherches) :
1. Mémoire (`G:\Mon Drive\claude-memoire\`) : `MEMORY.md` puis `project_inerweb_fluide.md`.
2. Tête de `docs/PROMPT-REPRISE.md` (bloc d'état du 13/08) et de `CHANGELOG.md`.
3. `docs/CARTE-CODE.md` — l'architecture en une page.
4. `git log --oneline -10` + `git status` — ⚠️ des sessions parallèles écrivent parfois ici.

**État au moment où ce prompt a été écrit (13/08/2026 au soir — re-mesurer, ne pas croire)** :
TOUT VERT — **137 exécutions** (`node outils/lancer-tests.mjs --tout`), 207 attaques,
contrat v13, migration 37. `main` porte **42 commits d'avance** sur `origin/main`
(le distant s'arrête au 27/07 à 0h23 — la démo GitHub Pages aussi). Le MODE EXERCICE
(bac à sable pédagogique) a été livré le 13/08 (`docs/PLAN-MODE-EXERCICE.md`).

## Chantier 1 — mettre la démo en ligne à jour (le push)

**⭐ FEU VERT DONNÉ par Franck le 13/08** (« mise à jour des commits démo ») — c'est la
levée, AU CAS PAR CAS et pour CE dépôt seulement, du gel de diffusion du 31/07. Ne pas
l'étendre à un autre dépôt.

1. Garde de départ : `git log --oneline -5` + `git status` (sessions parallèles), puis
   `node outils/lancer-tests.mjs --tout` — on ne pousse pas du rouge.
2. `git push` de `main` vers `origin` (`frigorx/-inerweb-fluid-cerfa-fi-bsd-4` —
   ⚠️ l'UNIQUE dépôt GitHub : jamais de force-push, jamais de réécriture d'historique,
   c'est l'antériorité qui protège la paternité).
3. **Vérifier LE SITE, pas le push** (règle de Franck) :
   - la démo `https://frigorx.github.io/-inerweb-fluid-cerfa-fi-bsd-4/v8/` répond ET
     porte les nouveautés (le justificatif de régularisation du 27/07, l'identité
     fictive de l'établissement au monde de démo) ;
   - le guide `…/guide.html` répond ;
   - ⚠️ GitHub Pages met parfois quelques minutes à reconstruire — re-vérifier, ne pas
     conclure trop tôt.
4. Point de vigilance : le MODE EXERCICE est du code LOCAL (routes serveur + drapeau
   localStorage). Sur la démo publique il est inerte par construction — la carte
   « Mode exercice » de l'écran Sauvegarde ne s'affiche qu'en mode Local. Vérifier
   qu'aucun résidu n'apparaît sur la démo publique.

## Chantier 2 — TUTORIEL INTÉGRÉ au mode démo en ligne

**Demande de Franck (13/08)** : un tutoriel intégré au mode démo en ligne — pas une page
à part (le `guide.html` pas-à-pas existe déjà et reste), mais un parcours guidé DANS
l'application de démonstration, pour qu'un visiteur (collègue artisan, prof) découvre
les gestes clés sans lecture préalable.

**⚠️ MÉTHODE : proposer la CONCEPTION à Franck AVANT de coder** (sa règle : valider la
direction générale avant le rendu fin). Questions à lui poser avec une proposition
argumentée :
- **Le parcours** : quels gestes dans quel ordre ? Proposition de départ : ① lire le
  tableau de bord → ② créer une machine → ③ créer une bouteille → ④ passer un mouvement
  au wizard (charge) → ⑤ imprimer le CERFA d'exercice → ⑥ voir la balance et le dossier
  d'audit. Court (10-15 min), chaque étape = un geste réel.
- **La mécanique** : pastilles-guides (« coach marks ») posées sur l'écran réel avec
  surbrillance de l'élément visé + panneau d'étape (précédent/suivant/quitter), OU
  liste de mission cochable dans un coin. Vanilla ES modules (AUCUN framework, doctrine
  du dépôt), module dédié (ex. `v8/js/views/tutoriel.js`), déclenché par un bouton
  « Visite guidée » visible au premier chargement de la DÉMO seulement.
- **Le déclenchement** : proposé automatiquement à la première visite (localStorage),
  relançable depuis la barre latérale, jamais bloquant.

**Contraintes non négociables** (chartes et doctrine de Franck) :
- français simple, zéro anglicisme, zéro terme savant ;
- JAMAIS de thème sombre ; lisibilité d'abord ; la couleur ne porte jamais seule une
  information ;
- le tutoriel ne doit JAMAIS masquer un élément à cliquer ni recouvrir le contenu visé
  (texte jamais superposé) ;
- il vit dans la DÉMO (et, si trivial à réutiliser, en mode exercice) — jamais un
  obstacle en mode Local ;
- accessible au clavier, `prefers-reduced-motion` respecté pour les animations de
  surbrillance (une animation qui porte du contenu ne s'y conditionne jamais).

**Méthode maison (rappel)** : carte → plan court validé → modification chirurgicale →
TOUT VERT (`node outils/lancer-tests.mjs --tout`, repère 137 — s'il est inférieur, des
suites ont été perdues) → suite de tests pour le module du tutoriel (rendu HTML réel,
patron `test-dechets-libelles`) → vérification NAVIGATEUR (banc jetable, jamais le port
2011, jamais `data\` réel) → CHANGELOG + CARTE-CODE → commit (`git commit -F fichier`).
Après le chantier : pousser ce commit aussi (le feu vert démo couvre la mise à jour de
la démo), et re-vérifier le site.

## Ce qui reste par ailleurs (ne pas s'y perdre, juste le savoir)

Hors code, de Franck : note de décision d'établissement · PV clés v7 · saisine DPD ·
paquet de livraison · semis du catalogue · simulation d'audit · décision cascades
(`docs/PLAN-LOT-G-MULTI-FLUIDES.md`). Le mode Officiel reste FERMÉ (`VERROU_LIVRAISON`),
sa réouverture est une décision, pas un développement.
