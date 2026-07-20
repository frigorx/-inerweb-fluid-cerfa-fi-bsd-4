# Plan d'intégration — récupérer la RC ChatGPT 8.1.0-rc.1 brique par brique

**Décision Franck (20/07) :** notre **dépôt git reste la base** (tracé + 85 tests verts). La RC produite par ChatGPT est une **source de code** dans laquelle on pioche **une brique à la fois, RE-testée avant commit**. On ne bascule jamais en bloc sur la RC (non testée).

## La source de référence

- **Paquet** : `C:\Users\henni\OneDrive\Bureau\CLAUDE-ESPACE-TRAVAIL\inerWeb-Fluide-8.1.0-rc.1-portable.zip`
- **SHA-256** : `e09ea34690b49ce9e14b0f7bc05a1e406372f61443242aee1a66317e3e3f251e` (vérifié intègre le 20/07).
- **Méthode pour piocher** : ré-extraire le zip dans un dossier jetable, puis `diff` le fichier concerné contre l'archive d'audit (point de départ commun) OU contre notre dépôt. Le portable **ne contient pas les tests** (paquet de distribution) et **n'apporte aucune preuve de recette** → toute reprise doit être **re-testée chez nous**.

## État réel de la RC (vérifié, pas seulement déclaré)

Travail **substantiel et réel** de ChatGPT (mesuré contre l'archive d'audit) :

| Domaine | Dans la RC | Fichier(s) source RC | Notre P0/P1 |
|---|---|---|---|
| Cycle matière : charge only VIERGE/RECYCLE/REGENERE + preuve de traitement WORM | ✅ branché | `server/api.js` (+710), `demo-store.js` (+647), `migrations.js`, `mapping.js` | **P0-3 / P0-4** |
| Matrice d'aptitude opposable (2008/2025, charge, herméticité, type) | ✅ module branché | `server/droit-intervention.js` (nouveau, +153), appelé par `api.js` | **P0-5** |
| `createControle` mode OFFICIEL colmaté (param `contexte`) | ✅ (converge avec notre P0-2) | `server/api.js` | P0-2 (déjà fait chez nous) |
| Cycle fuite (24 h réelles + 24 h fonctionnement, 1 mois civil, dérogation mobile) | ✅ déclaré, à vérifier | `server/api.js` | **P0-6** |
| Déclaration annuelle 11 rubriques | ✅ déclaré, à vérifier | `server/api.js` + vues v8 | **P0-8** |
| LAN HTTPS obligatoire (TLS 1.2, HSTS) | ✅ | `server/serveur.js` (+64) | **P1-5** |
| Base refusée sous OneDrive/Drive/Dropbox + `%LOCALAPPDATA%` | ✅ | lanceur / serveur | **P1-6** |
| scrypt `N=2^17` + rehash à la connexion | ✅ | `server/comptes.js` (+52) | **P2-3** |
| Notice RGPD complète + durées + paquet d'accès enrichi | ✅ déclaré, à vérifier | `export-personne.js`, vues v8, `RGPD.md` | **P1-4 / P0-RGPD** |

**Réserves :** contrat monté en **v8/94 méthodes** (nous sommes en v7) → intégrer côté schéma/contrat demande de la prudence (migrations ordonnées, parité). Correction **non prouvée** (pas de tests fournis). **R-455A gardé à 148** (décision « usage interne » de Franck ; à re-trancher vers 146 pour la cible registre officiel — notre T2).

## Ordre de récupération proposé

1. **Briques AUTONOMES, faible risque, fort gain** (n'entrent pas en conflit avec notre parcours P7 en cours) :
   - **P1-5 HTTPS LAN** (`serveur.js`) · **P2-3 scrypt** (`comptes.js`) · **P1-6 anti-OneDrive** (lanceur). → intégrer + test négatif, commits séparés.
2. **Finir notre P0-7** (contrôle = mouvement : P7-c/d/e) — chantier maison déjà engagé, à ne pas mélanger.
3. **Grosses briques métier** (à reprendre de la RC en les articulant avec notre cœur, migrations ordonnées après les nôtres) :
   - **P0-3/P0-4 cycle matière** (le plus gros ; api + demo + migrations + mapping) ;
   - **P0-5 aptitude** (`droit-intervention.js` + frontières 3/6 kg) ;
   - **P0-6 cycle fuite** ; **P0-8 déclaration 11 rubriques**.
4. **RGPD** (P1-4) : notice, durées, paquet d'accès — en coordination avec le DPD.

**Règle d'or à chaque brique :** piocher le code de la RC → l'adapter à notre `api.js`/`demo-store.js` (qui ont déjà nos P0-2/P7) → **prouver par un test** (rouge sans / vert avec) → revue adversariale → commit. Jamais d'import en bloc.

## Ce que ChatGPT nous a réellement apporté

Un **périmètre plus large déjà écrit** (presque tous les P0), et une **convergence rassurante** sur les points de sécurité (il a vu et fermé la faille `createControle` comme nous). Sa RC accélère les prochaines briques — mais la **preuve** (tests + recette) et la **traçabilité** (git) restent notre responsabilité.
