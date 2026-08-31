# inerweb.fr HabFluide — partie théorique · compte de reprise

> Pour reprendre le chantier à froid, dans une session neuve, sans relire
> aucun historique. **État au 31/08/2026.** Branche
> `claude/livret-habilitation-fluide-d5n1yt`
> ([PR #33](https://github.com/frigorx/-inerweb-fluid-cerfa-fi-bsd-4/pull/33),
> verte, prête à fusionner) ; côté site, branche `claude/relecture-bat` de
> `frigorx/pilote-fluides`
> ([PR #5](https://github.com/frigorx/pilote-fluides/pull/5), idem).

**Le livre part en autoédition Amazon KDP.** Format **7 × 10 pouces**
(177,8 × 254 mm), **326 pages**, dos 18,65 mm, noir et blanc, corps 12 pt
(`reglages.json`). Il prépare l'**épreuve théorique** de l'attestation
d'aptitude fluides frigorigènes, **catégories A1, A2, D et E**. La pratique
fera l'objet du prochain livre.

**Le paquet à téléverser est prêt : `livret/dist/kdp/`** — l'intérieur, la
couverture à plat (les DEUX fichiers séparés, exigence Amazon), et
`A-LIRE-AVANT-DE-TELEVERSER.md`. `npm run verifier` est le contrôle BLOQUANT
et passe au vert. Un PDF de LECTURE assemblé (1re + intérieur + 4e en un seul
fichier) se fabrique avec pymupdf (voir l'historique de la PR) — c'est la
version que Franck lit et annote, jamais celle qu'on téléverse.

**Philosophie du projet (F. Henninot)** : le livre et inerWeb ne font qu'un —
on entre dans inerWeb PAR le livre. Chaque planche, chaque QCM, chaque leçon
a son QR `inerweb.fr/f/<slug>` ; le papier reste autonome sans Internet ;
UNIQUEMENT les animations et illustrations des deux projets ; partout où
« inerWeb » s'écrit, c'est le LOGO de la charte, jamais le mot en typo
courante.

---

## Interdits absolus (aucune exception, aucune reformulation)

- Les **89 questions officielles chiffrées** (ids `pk-*`) : jamais dans le
  livre, jamais dans les pages `/f/`. Seules les questions d'entraînement
  publiques servent (verrous en dur dans `extraire.mjs` et `qr.mjs`).
- Les images **`bib-*`** et toute image de marque tierce (intarcon, ABC CLIM,
  Danfoss, photos de matériel de marque) : jamais dans le livre ni les
  vignettes `/f/`. Planches du pack uniquement.
- L'attribution **QElectroTech CC BY 3.0** reste imprimée (crédits).
- Jamais « tome 1 / tome 2 » dans les textes lisibles (les noms de fichiers
  `Tome1` sont un renommage différé, ne pas s'en occuper sans demande).
- Jamais de nom de modèle d'IA dans quoi que ce soit de poussé.
- Trois planches du pack sont bannies pour défauts constatés :
  `intro-securite`, `s1-double-accident`, `coup-de-liquide-principe`.

---

## La chaîne — `cd livret && npm run tout` (env : `PILOTE_FLUIDES`, `CHROME`)

`PILOTE_FLUIDES` pointe le clone de `frigorx/pilote-fluides` ;
`CHROME` un Chrome/Chromium (sur Linux, un wrapper `--no-sandbox`).

| Maillon | Ce qu'il fait |
|---|---|
| `extraire.mjs` | Texte depuis `packs/fluides/cartes.js`. Vérifie les 39 codes théoriques — un manque arrête tout. |
| `contenu-categories.mjs` | Chapitre 4 généré du `referentiel-2025.json`. |
| `visuels.mjs` | Visuels à 2400 px, état FINAL des planches animées. |
| `qr.mjs` | **192 alias** `/f/` + pages statiques (redirections, visionneuses, 19 QCM, examen blanc, positionnement, mes-resultats) + PNG des QR + manifeste `qr.gen.json`. |
| `build-livret.mjs` | Word éditable ; choix des questions imprimées (`questions-choisies.gen.json`) et réserve. |
| `build-html.mjs` | LE livre : HTML → Chrome pagine → `finition.py` (bandeaux, pieds+logo, numéros, marge de renvois, inventaires) ; génère aussi `dist/logo-pied.pdf`. |
| `couverture.mjs` | Couverture à plat, dos calculé sur la pagination réelle, compteur de QR lu du manifeste. |
| `paquet-kdp.mjs` → `verifier-kdp.py` | Le paquet, puis le contrôle bloquant (marges 6,35 mm, polices embarquées, couche texte propre, dos juste). |

### Le CYCLE COMBLEMENT (2 passes — obligatoire dès que la pagination bouge)

```
rm livret/comblement.gen.json
node build/qr.mjs && node build/visuels.mjs && node build/build-html.mjs   # passe nue
node build/combler.mjs                                                     # pose 19 planches v2 dans les blancs
node build/qr.mjs && node build/visuels.mjs && node build/build-html.mjs   # passe finale
node build/couverture.mjs && node build/paquet-kdp.mjs && npm run verifier
```

La passe finale regrave les pages `/f/` avec `chapitres-pages.gen.json` et
`inventaire-pages.gen.json` frais (la remédiation de l'examen blanc cite des
pages réelles). Contrôler à la fin que les plages embarquées dans
`f/examen-blanc/index.html` == les `.gen.json` finaux.

---

## Les mécanismes qu'il ne faut pas casser

- **Marqueurs invisibles `@@…@@`** (spans `.marq` 1 pt blanc) : `@@QR|slug|type@@`
  (renvois de marge), `@@A-F|num;codes@@` (bandeaux/pieds/inventaires),
  `@@P|ch-n@@` (ancres de comblement), `@@NUE@@/@@LIM@@/@@SOM|n@@`.
  La pose ET l'effacement tolèrent la césure (slug coupé au tiret, tiret
  parfois PERDU à l'extraction — rapprochement par forme sans tirets, à
  correspondance unique). L'effacement va par MOTIF ENTIER, jamais par
  paires. `verifier-kdp` REFUSE tout `@@` résiduel.
- **La garde des titres** : `meta garde: true` (pages.mjs) → build-html
  enveloppe les blocs gardés avec le bloc suivant dans `.groupe-garde`
  (`break-inside:avoid`). Blink IGNORE `break-after:avoid` — ne pas y revenir.
  Un titre n'est JAMAIS seul en bas de page ; c'est ce qui a fait passer le
  livre de 312 à 326 pages, c'est voulu.
- **La marque** (`build/marque.mjs`) : logo SVG unique (charte § 3.4) + fontes
  candidates par machine — C:/Windows/Fonts (exact chez Franck) →
  `livret/fontes-locales/` (Trebuchet corefonts extrait localement, JAMAIS
  commité, .gitignore ; se réextrait de `trebuc32.exe` sourceforge avec
  cabextract) → `livret/fontes/` (Dancing Script OFL commise). Les @font-face
  déclarent les NOMS de charte (« Trebuchet MS », « Segoe Script »). Le logo
  s'imprime : pied de CHAQUE page (via `dist/logo-pied.pdf`, fallback texte),
  couverture 1re + 4e, en-têtes des 192 pages `/f/`.
- **Le comblement** : réserve = UNIQUEMENT les 19 planches v2 (une par
  chapitre) dans `combler.mjs` ; seuil 32 mm, plafond 75 mm. Une planche
  défectueuse est pire qu'un blanc.
- **`apos()`** vit dans `plan-chapitres.mjs` (le plan écrit ses chaînes sans
  apostrophes) : tout titre AFFICHÉ ou IMPRIMÉ la traverse. Pas de U+2060.
- **Édition DYS** : `EDITION=dys npm run html` (Lexend) — hors chaîne standard.

## Les pages /f/ (le pont papier→numérique)

192 alias générés par `qr.mjs`, à COPIER dans `frigorx/pilote-fluides`
(dossier `f/` racine) à chaque changement — GitHub Pages les sert.
Gabarits dans `qr.mjs` : redirections, visionneuses (SVG inliné, SMIL),
19 QCM `q-*` (les questions du papier, corrigées), `examen-blanc`
(40 questions tirées d'un pool embarqué de 186, remédiation par chapitre +
codes + pages du livre + liens séries), `positionnement` (20 questions,
sortie = parcours), `mes-resultats`. Chaque question à l'écran porte une
vignette-planche du pack (table SUJETS_PLANCHES : sujet de l'énoncé → code →
chapitre), cliquable vers sa visionneuse. Chaque réponse d'examen alimente
`pilote_comp_fluides-habilitation` (même forme que `noterComp` du moteur).
Rien ne quitte jamais l'appareil.

## État des deux PR et du site (au 31/08)

- **PR #33** (ce dépôt) et **PR #5** (pilote-fluides) : OUVERTES, vertes,
  marquées prêtes. **La mise en ligne des 192 pages `/f/` attend la fusion
  de la #5** (le site ne sert aujourd'hui que les 95 premiers alias —
  vérifié : les nouvelles URL sont en 404 tant que la #5 n'est pas fusionnée).
- `main` de pilote-fluides bouge souvent (chantier ElectroRezo). Conflit =
  recette : merge, `--theirs` sur les sorties de build (21 html racine +
  sw.js), `cartes.js` à la main si touché, régénérer `build/build.mjs` +
  `build/planches.mjs`, pousser.
- La CI du livret (« filet ») : `node outils/lancer-tests.mjs --tout` à la
  racine — DÉPLACER `livret/dist` hors du dépôt le temps des tests (140
  exécutions attendues au vert).
- La surveillance de session (subscriptions PR + check-ins) a été désarmée à
  la clôture du 31/08 : la réarmer au besoin.

## En attente de F. Henninot

1. **Relecture annotée** du PDF LIVRE-COMPLET (méthode convenue : PDF annoté,
   toute forme d'annotation ; une annotation = un point).
2. **Refonte de la maquette** : un document de remise en forme (préparé avec
   un autre outil) arrive — c'est le cahier des charges de la FORME ; les
   interdits et mécanismes ci-dessus restent au-dessus.
3. **Niveau du pool de questions** : 129 N1 / 57 N2 (69 % restitution).
   Leviers proposés, EN ATTENTE d'accord : tirage de l'examen blanc pondéré
   vers N2 ; puis étoffer la banque en questions niveau examen (chantier
   éditorial, jamais depuis les 89 officielles) ; enfin `examen.niveau: 2`
   sur les séries du site.
4. Fusion des PR, ISBN/prix KDP, épreuve papier.

## Méthode de travail demandée

- **Sous-agents** : déléguer recherches, exploration et vérifications
  parallèles à des agents ; garder le contexte principal pour décisions et
  édits.
- **Économie de tokens** : lectures ciblées, une fabrication par LOT de
  corrections (jamais une fab par retouche — une fab ≈ 4 min de Chrome),
  contrôles sur captures ciblées de pages précises.
- Chaque lot livré : cycle comblement complet, `npm run verifier`, filet,
  push des DEUX dépôts (copie `f/`), PDF LIVRE-COMPLET envoyé à Franck.
