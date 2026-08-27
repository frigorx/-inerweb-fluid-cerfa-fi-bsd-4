# inerweb.fr HabFluide — tome 1 : la théorie · compte de reprise

> Pour reprendre le chantier à froid, dans une session neuve, sans relire aucun
> historique. État au 27/08/2026, branche `claude/livret-habilitation-fluide-d5n1yt`,
> [PR #33](https://github.com/frigorx/-inerweb-fluid-cerfa-fi-bsd-4/pull/33).

**Le livre part en autoédition Amazon KDP.** Format 6 × 9 pouces, 383 pages,
noir et blanc. Il prépare l'**épreuve théorique** de l'attestation d'aptitude
fluides frigorigènes, **catégories A1, A2, D et E**. La pratique fera le tome 2.

---

## Ce qui est fait

**La chaîne** — `cd livret && npm run tout` déroule six maillons, chacun refusant
de passer la main s'il lui manque quelque chose :

| Maillon | Ce qu'il fait |
|---|---|
| `extraire.mjs` | Va chercher le texte dans `packs/fluides/cartes.js` de `frigorx/pilote-fluides`. Ne rédige rien. Vérifie que **les 39 codes théoriques exigés pour A1/A2/D/E sont couverts** — un manque arrête la chaîne. |
| `contenu-categories.mjs` | Rédige le chapitre 4 (les sept catégories) depuis `referentiel-2025.json`. Aucune valeur saisie à la main. |
| `visuels.mjs` | Résout 121 références, refuse toute page sans illustration. Force l'**état final** des 20 planches animées (sinon elles s'impriment amputées). |
| `qr.mjs` | 95 alias `inerweb.fr/f/<slug>` + les pages de redirection statiques. |
| `build-livret.mjs` | Le Word **éditable** ; c'est lui qui choisit les 113 questions et **répartit le rang des bonnes réponses**. |
| `build-html.mjs` + `pages.mjs` + `finition.py` | Le gabarit 6 × 9 : HTML autonome (version écran) et PDF d'impression. |
| `build-corrige.mjs` | Le corrigé formateur, mêmes questions et **même ordre de choix** que l'élève. |

**Structure d'un chapitre** (décidée par F. Henninot) : ce que le référentiel
exige, code par code et **catégorie par catégorie** → les questions type examen
**avant** la lecture → les leçons → l'activité à remplir → les corrections.

**Les liens** : 95 QR (19 chapitres + 76 leçons), dont 30 vers une capsule
narrée. L'adresse est aussi imprimée en clair sous chaque code.

**Deux éditions** : standard, et `EDITION=dys npm run html` (police Lexend,
corps et interligne ouverts). Le texte n'est **jamais justifié**, dans aucune.

**La densité se règle** : `reglages.json` porte six valeurs, `curseurs.html` les
manœuvre en direct sur deux vraies pages avec l'estimation de pagination, de dos
et de coût. Régler, recopier, `npm run html`. Plancher intouchable : **14 pt**
de corps (charte), **19 mm** de reliure (KDP).

**La couverture** : `couverture-kdp.html`, format exact du téléversement, dos
calculé sur la pagination **réelle** (`kdp.gen.json`). Aussi dans Claude Design.

---

## Ce qui reste

1. **Déployer les redirections.** Copier `livret/redirections-pages/f/` à la
   racine de `frigorx/pilote-fluides`, commit, Pages redéploie. **Tant que ce
   n'est pas fait, les 95 QR imprimés mènent à une 404.**
   ⚠️ inerweb.fr est servi par GitHub Pages : un `.htaccess` y est ignoré —
   celui du dépôt n'est qu'une archive. Vérification : `curl -L` sur les 95
   alias de `qr.gen.json`, 200 partout.
2. **Relecture métier du lexique** — 61 entrées dans `build/lexique.mjs`,
   rédigées et non extraites (la source explique dans le fil du cours, elle ne
   définit pas). Aucun chiffre non autorisé par la source, mais **ça se relit**.
3. **Les 20 planches réveillées** — liste dans `reveillees.gen.json`. Forcer
   l'état final peut superposer des éléments que l'animation montrait l'un après
   l'autre. Ça se juge à l'œil, planche par planche.
4. **La planche centrale** (22 repères) : lisible mais à l'étroit. Une page
   paysage dans `pages.mjs` la servirait mieux.
5. **Décisions d'édition** : ISBN (gratuit KDP, ou acheté pour rester
   propriétaire du titre) ; prix de vente — le coût d'impression estimé est
   d'environ 5,20 € l'exemplaire.
6. **Batterie du bon à tirer** : une page test photocopiée en noir et blanc ;
   les QR scannés depuis une photocopie de photocopie ; attribution
   **QElectroTech** imprimée si des symboles en viennent (CC BY 3.0, mention
   exacte dans `symboles/LICENCE.md` de pilote-fluides).

---

## Les règles que ce livre ne peut pas enfreindre

- **Aucune question officielle chiffrée.** `banque.gen.json` en contient 89
  (ids `pk-*`) mêlées aux 180 publiques : elles sont écartées du tirage et un
  verrou vérifie qu'aucune n'a filtré.
- **Aucun document pédagogique tiers.** Les images `bib-*` de pilote-fluides
  sont écartées d'office : elles viennent de supports AFPA, de TP d'autres
  enseignants, de documentation constructeur.
- **Croix du frigoriste** : détendeur à gauche, compresseur à droite,
  condenseur en haut, évaporateur en bas.
- **Aucun texte ne chevauche un tracé.**
- **Le rang de la bonne réponse reste réparti** — vérifié à chaque fabrication,
  la chaîne échoue au-delà de 40 % sur une même lettre. (Dans la banque brute,
  la bonne réponse était en B 68 % du temps.)

---

## Où vivent les choses

| Quoi | Où |
|---|---|
| Source éditoriale (44 fiches, 269 questions, capsules) | `frigorx/pilote-fluides`, `packs/fluides/` — variable `PILOTE_FLUIDES` pour le chemin local |
| Référentiel officiel (136 codes, verbatim JO) | `packs/fluides/referentiel-2025.json` |
| Questions officielles chiffrées — NE JAMAIS IMPRIMER | `frigorx/habilitation-fluide/evaluation/data/*.enc` |
| Projet Claude Design (couverture + gabarit intérieur) | `claude.ai/design/p/cd323c8c-77ba-4f07-a98d-bf9d4e9800f4` |
| Livrables régénérables, non commités | `livret/dist/`, `qr.gen/`, `visuels.gen/`, `curseurs.html`, `gabarit-interieur.html` |

## Reprise en une commande

```bash
cd livret && npm install && PILOTE_FLUIDES=C:/git/pilote-fluides npm run tout
```

⚠️ **Une session cloud a travaillé sur cette même branche le 27/08** (commit
`d963d9f`, les redirections GitHub Pages — bonne prise, elle a corrigé un défaut
réel). Vérifier `git log origin/<branche>` avant d'écrire, et ne pas laisser
deux sessions dessus.
