# PLAN — Visite guidée intégrée à la démo en ligne

> **Statut : PROPOSITION — en attente de validation Franck.** Rien n'est codé.
> Demande d'origine (13/08/2026) : un parcours guidé DANS l'application de
> démonstration (pas une page à part — `guide.html` existe et reste), pour qu'un
> visiteur (collègue, artisan, enseignant) découvre les gestes clés sans lecture
> préalable.

## Ce que la visite fait faire (proposition : 6 étapes, 10-15 minutes)

Chaque étape = un geste réel dans la démo, jamais une lecture passive.

| # | Étape | Le geste du visiteur |
|---|-------|----------------------|
| ① | Tableau de bord | Lire les 4 compteurs, repérer les alertes réglementaires. |
| ② | Créer une machine | Parc machines → « Ajouter » → fiche remplie guidée champ à champ. |
| ③ | Créer une bouteille | Stock bouteilles → « Ajouter » → contenance et fluide. |
| ④ | Un mouvement au wizard | Nouveau mouvement → charge sur la machine créée, depuis la bouteille créée. |
| ⑤ | Imprimer le document | Ouvrir le CERFA de démonstration (filigrane FORMATION) → aperçu d'impression. |
| ⑥ | Balance et audit | Balance matière → lire l'écart nul ; ouvrir le dossier d'audit. |

Sortie possible à chaque étape (« Quitter la visite »), reprise possible à
l'étape où l'on s'était arrêté.

## Mécanique proposée (à trancher — recommandation : option A)

**Option A — pastilles-guides sur l'écran réel (recommandée).** Un petit panneau
d'étape (titre, consigne en une phrase, boutons Précédent / Suivant / Quitter,
progression « étape 2 sur 6 ») + la mise en évidence de l'élément visé :
liseré épais + étiquette texte « Cliquez ici : … » (la couleur ne porte jamais
seule l'information). Le panneau se place TOUJOURS dans le quadrant opposé à
l'élément visé : il ne recouvre jamais ce qu'il faut cliquer, aucun texte
superposé. Recommandée parce que le geste s'apprend sur le vrai écran, là où il
se fera.

**Option B — liste de mission cochable (repli sobre).** Un volet latéral liste
les 6 gestes ; chaque geste se coche quand l'application constate qu'il est
fait. Plus simple, moins fragile, mais ne montre pas OÙ cliquer.

## Déclenchement (à trancher)

- Proposé à la **première visite** : une invite discrète en coin d'écran
  (jamais un plein écran qui bloque), mémorisée par une clé localStorage dédiée.
- **Relançable** à tout moment : entrée « Visite guidée » dans la barre latérale.
- **Jamais bloquant** : Échap ferme, tout reste cliquable hors visite.

## Contraintes non négociables (reprises telles quelles)

- Français simple, zéro anglicisme, zéro terme savant.
- JAMAIS de thème sombre ; la couleur ne porte jamais seule une information.
- L'élément à cliquer n'est JAMAIS masqué ; aucun texte superposé à un tracé.
- Vit dans la DÉMO seulement (même aiguillage que l'écran Sauvegarde :
  `ctx.store.modeLabel !== 'LOCAL'`) — jamais un obstacle en mode Local.
- Accessible au clavier (panneau focusable, boutons atteignables au Tab) ;
  `prefers-reduced-motion` respecté : la mise en évidence reste alors STATIQUE
  (liseré + étiquette), elle ne disparaît pas — elle porte du contenu.

## Réalisation prévue (après validation seulement)

- Module dédié `v8/js/views/tutoriel.js`, vanilla ES module, AUCUN framework,
  AUCUNE dépendance nouvelle.
- Suite `v8/js/views/test-tutoriel.mjs` sur rendu HTML réel (patron
  `test-dechets-libelles`) : présence des 6 étapes, panneau jamais sur
  l'élément visé (géométrie mesurée), absence totale en mode Local.
- Vérification NAVIGATEUR sur banc jetable (port jetable + base jetable,
  jamais 2011, jamais `data\` réel), parcours complet joué.
- TOUT VERT → CHANGELOG + CARTE-CODE → commit → push (couvert par le feu vert
  démo) → re-vérification du SITE.

## Questions ouvertes à Franck

1. Le parcours en 6 étapes ci-dessus convient-il (ajouts, retraits, ordre) ?
2. Mécanique : option A (pastilles-guides, recommandée) ou option B (mission
   cochable) ?
3. L'invite à la première visite (discrète, en coin d'écran) convient-elle, ou
   préférez-vous que la visite ne parte QUE de la barre latérale ?
4. À trancher aussi, hors tutoriel : le monde démo des visiteurs d'AVANT le
   28/07 garde l'identité réelle de l'établissement dans LEUR localStorage
   (aucun numéro de version de semis — `chargerDepuisStockage` restaure tout
   état valide). Correctif proposé : numéro de version du monde démo, tout
   état plus ancien est jeté et re-semé (le visiteur perd ses manipulations de
   démo — acceptable ?). Petit lot, prouvable par test.
