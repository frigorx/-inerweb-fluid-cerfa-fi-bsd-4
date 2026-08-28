# inerweb.fr HabFluide — tome 1 : la théorie · compte de reprise

> Pour reprendre le chantier à froid, dans une session neuve, sans relire aucun
> historique. État au 28/08/2026, branche `claude/livret-habilitation-fluide-d5n1yt`,
> [PR #33](https://github.com/frigorx/-inerweb-fluid-cerfa-fi-bsd-4/pull/33).

**Le livre part en autoédition Amazon KDP.** Format 6 × 9 pouces, **290 pages**
(pas 383 : voir l'encadré pagination), noir et blanc. Il prépare l'**épreuve
théorique** de l'attestation d'aptitude fluides frigorigènes, **catégories A1,
A2, D et E**. La pratique fera le tome 2.

**Le paquet à téléverser est prêt : `livret/dist/kdp/`** — l'intérieur, la
couverture, et la fiche `A-LIRE-AVANT-DE-TELEVERSER.md` qui donne les valeurs
à recopier écran par écran (cotes, prix, description, mots-clés). Le contrôle
`npm run verifier` passe au vert.

---

## ⚠ La pagination n'était PAS reproductible — c'est réparé, ne pas défaire

Aucune `<img>` ne déclarait ses cotes : le navigateur devait décoder 314
images (22 Mo de data-URI) pour savoir quelle hauteur leur réserver, et le
même livre sortait à 383, 272 ou 231 pages selon l'humeur du décodage. Le
« 383 pages » des reprises précédentes était un artefact.

Réparé dans `pages.mjs` (fonction `cotes()`, `width`/`height` sur chaque
image). **Trois fabrications successives : 290 pages, à l'identique.** Si un
jour la pagination bouge entre deux `npm run tout` sans changement de contenu,
c'est cette régression-là qui revient.

---

## La chaîne — `cd livret && npm run tout`

| Maillon | Ce qu'il fait |
|---|---|
| `extraire.mjs` | Texte depuis `packs/fluides/cartes.js` de `frigorx/pilote-fluides`. Vérifie les **39 codes théoriques A1/A2/D/E** — un manque arrête tout. |
| `contenu-categories.mjs` | Chapitre 4 (les sept catégories) depuis `referentiel-2025.json`. |
| `visuels.mjs` | 121 visuels à 2400 px. Force l'**état final** des planches animées en respectant où chaque animation FINIT (un libellé qui disparaît reste caché) ; une planche **en boucle** (majorité d'animations finissant éteintes) est au contraire révélée entière. |
| `qr.mjs` | 95 alias `inerweb.fr/f/<slug>` + pages de redirection statiques. |
| `build-livret.mjs` | Word éditable ; tirage des 113 questions, **rang des bonnes réponses réparti**. |
| `build-html.mjs` + `pages.mjs` + `finition.py` | Le 6 × 9 : HTML autonome + PDF. La finition pose bandeaux/pieds en **polices intégrées** (Trebuchet/Calibri du système — jamais helv/hebo, KDP les refuse), force le **compte pair**, et écrit `kdp.gen.json` sur la pagination réelle. |
| `couverture.mjs` | **La couverture est maintenant générée** depuis `kdp.gen.json` (elle était écrite à la main : dos calé sur 390 pages pour un livre de 290). 4e + dos + 1re, PDF prêt à téléverser. |
| `build-corrige.mjs` | Corrigé formateur, mêmes tirages que l'élève. |
| `paquet-kdp.mjs` | Assemble `dist/kdp/` : les DEUX fichiers pour Amazon + la fiche de téléversement. |
| `verifier-kdp.py` | Dernier mot : formats, polices embarquées, marges 6,35 mm, 300 ppp, dos cohérent. **La chaîne échoue si un critère bloquant saute.** |

Autres commandes : `npm run couverture` · `npm run verifier` ·
`EDITION=dys npm run html` (édition Lexend).

## Soin typographique (fait dans `pages.mjs`, fonction `ech`)

- 1 719 apostrophes droites → courbes ; paires de `'…'` → « chevrons » ;
  espaces **insécables** avant `; : ! ?` et dans les guillemets.
- Le ⚠ emoji (bitmap couleur, illisible en N&B) : remplacé par un **triangle
  vectoriel** dans les titres d'encadré, par « À éviter : » au fil du texte.
- La planche centrale (22 repères) est **couchée** (page paysage dans une
  page portrait, classe `.paysage`) : +72 % de surface.

## Ce qui reste

1. **Relecture métier du lexique** — 61 entrées dans `build/lexique.mjs`,
   rédigées et non extraites. **Seule main de F. Henninot.**
2. **Relecture des planches réveillées** — liste dans `reveillees.gen.json`.
   Correction faite : plus de superposition mécanique. Restent **4 planches
   dont le défaut est dans le SVG source** (`pilote-fluides`, donc visibles
   en ligne aussi) : `co2-protection` (« avant d'ouvrir » derrière un
   rectangle, texte tronqué à droite), `secu-bouteille`, `secu-projection`,
   `secu-decomposition-ari`. À corriger dans l'atelier pilote-fluides.
3. **Déployer les redirections** — copier `livret/redirections-pages/f/` à la
   racine de `frigorx/pilote-fluides`, commit, Pages redéploie. **Tant que ce
   n'est pas fait, les 95 QR imprimés mènent à une 404.** Vérif : `curl -L`
   sur les 95 alias de `qr.gen.json`, 200 partout.
4. **Décisions d'édition** (fiche `dist/kdp/A-LIRE-…` § « à décider ») :
   ISBN gratuit KDP ou acheté AFNIL ; prix (conseillé 24,90 €, coût 4,08 €).
5. **Épreuve imprimée** avant mise en vente : gris des planches, QR scannés
   (dont un depuis une photocopie), dos dans les plis. Attribution
   QElectroTech si des symboles en viennent (`symboles/LICENCE.md`).
6. 9 icônes bitmap 512 px restent sous 300 ppp (l'une à 268) — accepté par
   KDP, à re-exporter en grand un jour depuis la bibliothèque.

## Les règles que ce livre ne peut pas enfreindre

- **Aucune question officielle chiffrée** (89 `pk-*` écartées, verrou actif).
- **Aucun document pédagogique tiers** (`bib-*` écartées d'office).
- **Croix du frigoriste** : détendeur gauche, compresseur droite, condenseur
  haut, évaporateur bas.
- **Aucun texte ne chevauche un tracé.**
- **Rang des bonnes réponses réparti** — échec au-delà de 40 % sur une lettre.
  (Actuel : A 29 · B 27 · C 30 · D 27.)

## Où vivent les choses

| Quoi | Où |
|---|---|
| Source éditoriale (44 fiches, 269 questions, capsules) | `frigorx/pilote-fluides`, `packs/fluides/` — variable `PILOTE_FLUIDES` |
| Référentiel officiel (136 codes, verbatim JO) | `packs/fluides/referentiel-2025.json` |
| Questions officielles chiffrées — NE JAMAIS IMPRIMER | `frigorx/habilitation-fluide/evaluation/data/*.enc` |
| Projet Claude Design (couverture + gabarit, **synchronisé 290 p le 28/08**) | `claude.ai/design/p/cd323c8c-77ba-4f07-a98d-bf9d4e9800f4` |
| **Paquet Amazon prêt** | `livret/dist/kdp/` (2 PDF + fiche) |
| Livrables régénérables, non commités | `livret/dist/`, `qr.gen/`, `visuels.gen/`, `curseurs.html`, `couverture-kdp.html` |

## Reprise en une commande

```bash
cd livret && npm install && PILOTE_FLUIDES=C:/git/pilote-fluides npm run tout
```

(Il faut Chrome, Python + pymupdf, et les polices Windows Trebuchet/Calibri —
`finition.py` lit `C:/Windows/Fonts/`.)
