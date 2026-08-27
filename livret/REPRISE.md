# Livret « Habilitation Fluide » — compte de reprise

> Écrit pour reprendre le chantier à froid, dans une session neuve, sans relire
> l'historique. État au 27/08/2026 au soir, PR #33, CI vert sur chaque tête.

## Ce qui est fait

- **Plan éditorial** (`build/plan-chapitres.mjs`) : 19 chapitres en 6 parties,
  chaque page avec ses visuels nommés, activités, alias QR. Règle tenue : une
  page = au moins une illustration (le build échoue sinon).
- **Chaîne complète** — `npm run tout` depuis `livret/` déroule : extraction du
  contenu depuis `packs/fluides/cartes.js` du dépôt `frigorx/pilote-fluides`
  (`extraire.mjs` → `contenu.gen.json`), chapitre « catégories » rédigé par le
  référentiel lui-même (`contenu-categories.mjs`), résolution des visuels
  (`visuels.mjs`, 121 références, zéro page nue), QR (`qr.mjs`, 95 alias),
  assemblage (`build-livret.mjs` + `pages.mjs` + `build-html.mjs` : gabarit A5
  HTML paginé → PDF, `finition.py`), corrigé formateur (`build-corrige.mjs`,
  les MÊMES 113 questions que l'élève, sélection dans
  `questions-choisies.gen.json`). Titre : « inerweb.fr HabFluide ».
  Une **édition DYS** existe.
- **QR codes** : 95 alias `https://inerweb.fr/f/<slug>` (19 chapitres +
  76 leçons), PNG en niveau Q, manifeste `qr.gen.json`.
- **Redirections qui fonctionnent** : `redirections-pages/f/<slug>/index.html`
  (95 pages statiques). ⚠️ inerweb.fr est servi par **GitHub Pages** (en-tête
  `server: GitHub.com`, CNAME dans `frigorx/pilote-fluides`) : un `.htaccess`
  y est IGNORÉ — celui du dépôt n'est qu'une archive. Les pages statiques sont
  la seule forme de redirection que Pages sache servir.

## Ce qui reste (bon à tirer)

1. **Déployer `redirections-pages/f/` à la racine de `frigorx/pilote-fluides`**
   (copier le dossier `f/`, commit, Pages redéploie). Tant que ce n'est pas
   fait, les 95 QR imprimables pointent sur des 404. Vérif : boucle `curl -L`
   sur les 95 alias de `qr.gen.json` → 200 partout.
2. **Les 3 pages de lexique** — marquées « à remplir avec F. Henninot » dans
   `textes-liminaires.mjs`. Extraire les définitions déjà écrites dans les
   fiches (jamais inventer), faire valider.
3. **La planche centrale** (schéma 22 repères) : page paysage dans le gabarit
   HTML (`pages.mjs`), puis reconvertir et **recompter les pages du PDF**.
4. **Batterie du bon à tirer** : pagination réelle comptée sur le PDF ; aucun
   id `H-Gx-Qnn` (questions officielles chiffrées — interdites d'impression) ;
   aucune chaîne `⟦à valider⟧` ; anti-série des QCM (jamais 4 fois la même
   lettre) ; attribution **QElectroTech** imprimée (CC BY 3.0, mention exacte
   dans `symboles/LICENCE.md` de pilote-fluides) ; une page test photocopiée
   en noir et blanc ; QR scannés depuis une photocopie de photocopie.
5. **Licence du livret** (décision : usage vendable / organisme de formation) :
   mention propre au livret à écrire ; images `bib-*` de pilote-fluides
   toujours interdites (documents pédagogiques tiers) ; crédits des images
   générées (part de l'IA dite explicitement — déjà commencé dans les
   liminaires).

## Où vivent les choses

| Quoi | Où |
|---|---|
| Source éditoriale (44 fiches, 269 questions, capsules) | dépôt `frigorx/pilote-fluides`, `packs/fluides/` — env `PILOTE_FLUIDES` pour le chemin local |
| Référentiel officiel (136 codes, verbatim JO) | `packs/fluides/referentiel-2025.json` (identique dans `frigorx/habilitation-fluide`) |
| Modèle de forme (livret H0, A5, une illustration/page) | dépôt `frigorx/hocourant-livret` |
| Questions officielles chiffrées — NE JAMAIS IMPRIMER | `frigorx/habilitation-fluide/evaluation/data/*.enc` |
| Livrables régénérables (non commités) | `livret/dist/`, `livret/qr.gen/`, `livret/visuels.gen/` |

## Reprise en une commande

```
cd livret && npm install && PILOTE_FLUIDES=<clone de pilote-fluides> npm run tout
```
puis le filet du dépôt avant toute poussée : `node outils/lancer-tests.mjs --tout`
(TOUT VERT exigé, 140 exécutions).
