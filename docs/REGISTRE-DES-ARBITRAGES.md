# Registre des arbitrages réglementaires — inerWeb Fluide v8

> **Établi le 26/07/2026.** Il recense **toutes les valeurs et règles à portée
> réglementaire codées dans le logiciel**, et pour chacune : où elle se trouve
> dans le code, sur quoi elle repose, avec quel degré de certitude, et ce qu'on
> risque si elle est fausse.
>
> **Ce document ne protège pas d'un contrôle.** Il montre qu'une décision a été
> **prise, datée et motivée** plutôt que devinée. Un lecteur qui n'est pas
> d'accord avec une conclusion doit pouvoir suivre le raisonnement quand même,
> et retrouver lui-même la ligne de code concernée.
>
> **L'obligation réglementaire pèse sur le détenteur** — l'établissement — quoi
> qu'écrive le logiciel. Rien ici ne transfère une obligation à qui que ce soit.
> Ce registre sert à deux choses, et pas à une troisième : empêcher qu'on se fie
> au logiciel au-delà de ce qu'il prouve, et permettre à l'établissement
> d'accepter les risques résiduels en connaissance de cause.
>
> Ce n'est **pas un avis juridique**. Son auteur n'est pas juriste. Une relecture
> par la direction de l'établissement est recommandée, et le cas échéant par un
> conseil.

---

## 1. Pourquoi ce registre existe

Le projet prévoyait de faire viser ses valeurs réglementaires par un organisme
agréé « fluides frigorigènes ». Le dossier était prêt : onze questions écrites,
pièces jointes, courriel type (`docs/T3-DOSSIER-RELECTURE-EXTERNE.md`, 23/07/2026).

Ce visa n'a pas été obtenu, et l'attendre plus longtemps n'aurait rien changé :
un organisme agréé délivre des **attestations**, ce n'est pas son métier de rendre
un avis écrit sur l'outil d'un tiers, et une réponse écrite l'engagerait. Il n'y a
là ni faute ni mauvaise volonté de personne — simplement une demande qui ne
correspond pas à ce que ces organismes font.

L'auteur a donc tranché le 26/07/2026 : **on se passe du visa, on fait au mieux,
et on écrit ce qu'on a fait**. Les conséquences sont assumées :

- le verrou du mode Officiel (voir famille J) **ne peut plus être conditionné à
  un visa qui n'arrivera pas** ;
- le critère de sortie devient : **décision écrite de l'établissement** +
  **fonctionnement en parallèle du registre papier sans écart constaté** +
  **risques résiduels acceptés nommément** ;
- ce registre, avec la limite de responsabilité et le dossier de décision, tient
  lieu de **transparence documentée** à la place du visa.

Ce n'est pas équivalent. C'est ce qui est possible.

---

## 2. La règle générale qui a gouverné tous les arbitrages

**Le doute retire l'ALLÈGEMENT, jamais l'OBLIGATION.**

Autrement dit : chaque fois qu'un texte pouvait se lire de deux façons, on a
retenu celle qui **déclenche plus de contrôles**, jamais celle qui en déclenche
moins. Trois exemples chiffrés, tirés de l'inventaire ci-dessous.

1. **Le R-455A reste à 148 de PRP** alors qu'un recalcul selon le règlement
   F-Gas III donne environ 145,53. À 148, le seuil de 5 tonnes équivalent CO₂ est
   atteint dès 33,8 kg de charge ; à 145,53, il faudrait 34,4 kg. On déclenche
   donc le contrôle **plus tôt**. Écart pratique : nul au lycée, mais le principe
   est posé (`server/migrations.js:267`).
2. **L'exemption des équipements hermétiquement scellés est entièrement codée,
   mais désactivée** par une constante fermée. C'est la seule règle du logiciel
   qui **retire** un contrôle. Tant qu'elle est fermée, le logiciel exige parfois
   un contrôle que le texte n'imposerait pas — sévérité assumée, jamais une
   non-conformité (`v8/js/data/equipement.js:206`).
3. **Une machine dont l'usage thermique n'est pas renseigné est traitée comme du
   froid commercial**, donc soumise à l'interdiction du fluide vierge à PRP ≥ 2500
   depuis le **01/01/2025** et non depuis le 01/01/2026 : un an de contrainte en
   plus, par défaut (`v8/js/data/equipement.js:331-336`).

Le corollaire vaut aussi : **une donnée absente ou illisible ne vaut jamais
décision favorable**. Une date de vérification de détecteur illisible ne divise
pas la fréquence de contrôle par deux ; une clé absente d'un fichier importé ne
réactive pas un fluide désactivé ; une remise à niveau au format douteux ne
prolonge pas une attestation.

⚠️ **Ce corollaire connaît une exception, et il faut la lire avant de se fier au
reste : l'import n'examine pas le PRP.** Une valeur aberrante entrée par un
fichier importé s'écrit telle quelle, et le PRP commande toutes les fréquences de
contrôle. C'est un défaut déclaré et volontairement non corrigé — il est décrit à
la fin de la famille A (§ 4) et au § 7 bis de `docs/POINTS-DE-FRICTION.md`.

---

## 3. Comment lire les tableaux

Six colonnes, pas une de plus.

| Colonne | Ce qu'elle dit |
|---|---|
| Ce qui est codé | La règle, en français |
| Valeur retenue | Le chiffre ou la date effectivement dans le code |
| Où (fichier:ligne) | Le fichier du dépôt et la ligne, vérifiables |
| Fondement | Sur quoi repose le choix |
| Degré de certitude | Voir ci-dessous — c'est la colonne qui fait la valeur du document |
| Risque si c'est faux | Ce qui arrive concrètement en cas d'erreur |

**Les trois degrés de certitude, et ce qu'ils veulent dire ici :**

- **LU VERBATIM** — la phrase du texte réglementaire est **reproduite dans le
  dépôt**, le lecteur peut la relire lui-même. Ce niveau est employé de façon
  volontairement avare : **trois entrées seulement** de tout ce registre y ont
  droit — la règle A de la famille B (§5), et deux entrées de la famille D (§7) :
  le butoir du 12/03/2029 et la condition de remise à niveau. Une lecture
  attentive du texte ne suffit pas à mériter ce degré : tant que la phrase n'est
  pas recopiée dans le dépôt, l'entrée reste DEDUIT, même si personne ne doute
  du fond.
- **DEDUIT** — la règle est une lecture raisonnée de sources officielles, de
  notices, de foires aux questions administratives ou d'analyses de tiers, sans
  que la phrase du texte soit reproduite ici. C'est le cas le plus fréquent, et
  c'est une position honnête, pas une faiblesse cachée.
- **CONSERVATOIRE** — dans le doute, on a retenu le plus contraignant. C'est une
  position de prudence, **pas une certitude** : la règle peut être plus sévère
  que le droit.

Deux avertissements qui valent pour tout le document :

- Une part importante des fondements vient d'un document reçu le 16/07/2026,
  l'« Avis de validation réglementaire », dont la **section « Validation
  formelle » n'est pas signée** (`docs/TABLE-REGLEMENTAIRE-FLUIDES.md:3-6`). C'est
  un avis technique documenté, ce n'est pas un visa.
- Une autre part vient d'analyses produites par des assistants d'intelligence
  artificielle, passées à une contre-vérification interne (24/07,
  `docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:1-11`). Cette contre-vérification a
  **corrigé deux erreurs de l'analyse d'origine** : c'est la preuve qu'elle sert,
  et aussi la preuve qu'une analyse d'assistant ne vaut pas un texte.

---

## 4. Famille A — PRP des fluides et référentiel

Le PRP (potentiel de réchauffement planétaire) commande tout le reste pour les
HFC : c'est lui qui convertit une charge en kilogrammes en tonnes équivalent CO₂,
donc lui qui décide de la fréquence de contrôle.

| Ce qui est codé | Valeur retenue | Où (fichier:ligne) | Fondement | Degré de certitude | Risque si c'est faux |
|---|---|---|---|---|---|
| PRP du R-32 | 675 | `server/migrations.js:255-256` | Source déclarée « AR4 / annexe F-Gas » | DEDUIT | Seuil de 5 t éq. CO₂ déplacé ; contrôle déclenché trop tôt ou trop tard |
| PRP du R-410A | 2088 | `server/migrations.js:257-258` | Source déclarée « AR4 » | DEDUIT | Idem |
| PRP du R-134a | 1430 | `server/migrations.js:259-260` | Source déclarée « AR4 » | DEDUIT | Idem |
| PRP du R-407C | 1774 | `server/migrations.js:261-262` | Source déclarée « AR4 » | DEDUIT | Idem |
| PRP du R-404A | 3922 | `server/migrations.js:263-264` | Source déclarée « AR4 » | DEDUIT | Idem, et fait basculer le fluide au-dessus du seuil de 2500 qui interdit le vierge |
| PRP du R-1234yf | 0,501 | `server/migrations.js:265-266`, migration 22 `server/migrations.js:286-290` | Avis du 16/07, question 6 : valeur à 100 ans de l'annexe du règl. UE 2024/573 ; la valeur 4 appartenait à l'ancien référentiel | DEDUIT | Aucun effet sur le déclenchement (les HFO purs se seuillent en kg) ; effet d'affichage et de tonnage CERFA |
| **PRP du R-455A** | **148** (et non ≈ 145,53) | `server/migrations.js:267-268`, `server/migrations.js:305-307` | Règle du **PRP le plus élevé** en cas de valeurs concurrentes ; décision Franck du 16/07 puis 23/07 (`docs/TABLE-REGLEMENTAIRE-FLUIDES.md:95-99`) | **CONSERVATOIRE** | Aucun risque de sous-contrôle : la valeur retenue déclenche plus tôt. Risque inverse : un contrôle imposé un peu tôt (33,8 kg au lieu de 34,4 kg) |
| PRP du R-744 (CO₂) | 1 | `server/migrations.js:269-270` | Valeur de définition de l'échelle du PRP | DEDUIT | Nul : le fluide est hors périmètre du contrôle d'étanchéité fluoré |
| PRP du R-290 (propane) | 0,02 | `server/migrations.js:271-272`, `server/migrations.js:291-295` | Avis du 16/07 : le propane n'étant pas un gaz fluoré, il ne figure dans aucune annexe ; source libellée « AR6 GIEC (réf. règl. UE 2024/573) » | DEDUIT | Effet d'affichage seulement (hors périmètre) |
| Règle générale : en cas de valeurs concurrentes, retenir le PRP **le plus élevé** | — | Appliquée au R-455A (148) et au R-452A du catalogue (2141) | Décision Franck du 23/07, réaffirmée le 25/07 (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:251-258`) | **CONSERVATOIRE** | Le logiciel peut exiger un contrôle que le droit n'exige pas encore. Jamais l'inverse |
| Un PRP **figé** à la validation d'un mouvement, jamais rétroactif | champ `prpFige` | Décision actée, `docs/TABLE-REGLEMENTAIRE-FLUIDES.md:145-146` ; depuis le 13/08/2026 le **document régénéré** le lit aussi (`v8/js/cerfa/generateur.js`, cadres 3 et 7) — la 4e relecture externe avait montré, en le tirant, que la protection était vraie de la donnée et fausse du document réimprimé | DEDUIT | Une écriture ANTÉRIEURE au figeage (sans `prpFige`) reste rendue au référentiel courant — dit et assumé, on n'invente pas un PRP d'époque qu'on n'a pas enregistré |
| Impact environnemental **affiché** (bornes 150 / 750 / 2500) | FAIBLE / MODÉRÉ / ÉLEVÉ / TRÈS ÉLEVÉ | `v8/js/data/reglementation-fluides.js:184-199` | Bornes du règlement F-Gas reprises comme repère d'affichage | DEDUIT | Aucun : affichage seul, aucun moteur ne le lit. Un PRP absent ou négatif rend `null`, jamais « FAIBLE » |
| Un fluide de PRP ≥ 150 ne peut pas être déclaré hors périmètre F-Gas | garde de saisie | `v8/js/data/reglementation-fluides.js:297-303` | Garde anti-manœuvre posée après une revue : déclarer le R-410A « hors périmètre » sortait tout le parc du contrôle | DEDUIT | Sans cette garde, une erreur de saisie supprimait silencieusement des obligations |

**Ce qui n'est PAS dans le logiciel, et qu'il faut savoir** : un catalogue de dix
fluides supplémentaires (R-448A, R-449A, R-452A, R-452B, R-454A/B/C, R-513A,
R-1234ze(E), R-717) a été préparé le 24/07 mais **n'est semé nulle part** — il
attend une validation ligne par ligne
(`docs/CATALOGUE-FLUIDES-A-VALIDER.md:1-30`). Un fluide absent du référentiel ne
peut pas être saisi par erreur, mais il ne peut pas non plus être tracé.

### Comment la changer si elle se révèle fausse

**Par l'écran d'administration des fluides, sans toucher au code et sans
migration.** C'est précisément la raison d'être de cet écran, livré le 23/07 :
le référent ajoute, modifie ou désactive ses gaz lui-même
(`v8/js/modales/fluide-form.js`, mutations réservées aux rôles référent et
administrateur, `server/api.js:588-589`). Le formulaire **exige la source du PRP
dès que le PRP change** (`v8/js/modales/fluide-form.js:253-258`) : une correction
laisse une trace de son motif.

Un fluide n'est jamais supprimé — il est **désactivé** (migration 31) : il est
référencé par des écritures scellées qu'on ne réécrit pas.

Les valeurs livrées d'origine, elles, viennent des migrations 21 et 22 :
**une migration est immuable**, une correction future prend un nouveau numéro.

### ⚠ La porte qui reste ouverte : l'import ne contrôle pas le PRP

Tout ce qui précède décrit la porte de la **saisie**, et elle est gardée : le
formulaire refuse un PRP absent ou négatif (`v8/js/modales/fluide-form.js:240-244`)
et exige la source du PRP dès qu'il change (`:253-258`). **La porte de l'import
n'est pas gardée.** `importerJSON` réécrit la table des fluides par un
`INSERT OR REPLACE` qui reprend la valeur du fichier telle quelle, sans jamais
l'examiner (`server/api.js:6285-6316`).

Il faut le dire ici, et pas ailleurs, parce que **ce registre invoque la doctrine
de la garde d'import pour le champ mitoyen sans dire que la porte du PRP, elle,
reste ouverte** :
« une clé absente ne vaut pas décision » a été appliquée au champ `actif`, pour
qu'un export antérieur ne ressuscite pas un fluide désactivé
(`server/api.js:6304-6312`), et le cas du PRP négatif affiché « impact FAIBLE » a
été refermé (`CHANGELOG.md:897-900`). Les deux gardes sont posées **autour** du
PRP ; le PRP lui-même n'en a aucune.

Le comportement est **déclaré et volontairement non corrigé** : « l'import accepte
toujours un PRP aberrant (comportement ANTÉRIEUR à cette brique : durcir l'import
risquerait de bloquer la restauration d'une sauvegarde légitime) »
(`CHANGELOG.md:905-907`). Le motif est réel. La conséquence l'est aussi : le PRP
commande la conversion en tonnes équivalent CO₂, donc le niveau réglementaire, donc
la fréquence de contrôle, donc les échéances et les alertes. **Une valeur fausse
entrée par un import allège tout un parc en silence** — exactement le sens d'erreur
que la règle générale du § 2 prétend interdire partout ailleurs. Détaillé au
§ 7 bis de `docs/POINTS-DE-FRICTION.md`.

---

## 5. Famille B — Seuils de charge et fréquences de contrôle d'étanchéité

Trois règles gouvernent tout le moteur ; elles sont écrites dans
`docs/TABLE-REGLEMENTAIRE-FLUIDES.md` et codées en un seul endroit par côté.

| Ce qui est codé | Valeur retenue | Où (fichier:ligne) | Fondement | Degré de certitude | Risque si c'est faux |
|---|---|---|---|---|---|
| **Règle A** — un mélange contenant du HFC se traite comme un HFC (en tonnes éq. CO₂), même s'il contient aussi du HFO | HFC testé **avant** HFO | `v8/js/data/reglementation-fluides.js:92-103` ; miroir `server/api.js:7752-7783` | Notice du CERFA 15497*04, **citée mot à mot** dans le dépôt, avec le R-455A pour exemple nommé (`docs/TABLE-REGLEMENTAIRE-FLUIDES.md:27-30`) | **LU VERBATIM** | Inversé, un R-455A à 3,2 kg se voit imposer un contrôle annuel qu'il ne doit pas (c'était le bug n° 1, corrigé) |
| **Règle B** — les HFO purs se seuillent en kilogrammes, depuis le 11/03/2024 seulement | 1 / 10 / 100 kg ; date `2024-03-11` | `v8/js/data/reglementation-fluides.js:39` et `:54-61` ; miroir `server/api.js:7717` et `:7772-7775` | Règl. UE 2024/573 art. 5, cité mais **non reproduit** ; la contre-épreuve du 24/07 note que l'article n'a pas pu être lu mot à mot (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:22`) | DEDUIT | Un HFO pur au-dessus de 1 kg échapperait au contrôle, ou serait contrôlé à tort avant mars 2024 |
| **Règle C** — la fréquence se calcule sur la charge **nominale déclarée**, jamais sur la quantité présente | `chargeNominaleKg` | `v8/js/data/reglementation-fluides.js:118-121` | Foire aux questions officielle de la DGPR, citée mot à mot dans `docs/TABLE-REGLEMENTAIRE-FLUIDES.md:50-52` — mais une FAQ est une interprétation administrative, pas le texte | DEDUIT | C'était le bug n° 2 : une machine qui a fui voyait sa fréquence **s'alléger**. Corrigé |
| Seuils HFC / PFC | 5 / 50 / 500 tonnes éq. CO₂ | `v8/js/data/reglementation-fluides.js:46-53` ; miroir `server/api.js:7767-7771` | Règl. UE 517/2014 art. 4 puis 2024/573 art. 5 ; confirmés par l'avis du 16/07 | DEDUIT | Sous-contrôle direct d'équipements réels |
| Seuils HCFC | **2** / 30 / 300 kg | `v8/js/data/reglementation-fluides.js:62-69` ; miroir `server/api.js:7776-7779` | Avis du 16/07, question 4 : arrêté du 29/02/2016, paliers 2/30/300 ; la valeur historique concurrente était 3 kg — **on a retenu la plus basse, donc la plus contraignante** | DEDUIT et **CONSERVATOIRE** | Enjeu faible (recharge HCFC interdite depuis 2015, aucun HCFC au référentiel), mais un R-22 en réforme existe réellement dans l'établissement |
| Fréquences par niveau | 12 / 6 / 3 mois, **doublées** en présence d'une détection permanente (24 / 12 / 6) | `v8/js/data/reglementation-fluides.js:74-78` ; miroir `server/api.js:7735-7742` | Même sources ; confirmées par l'avis du 16/07 | DEDUIT | Contrôles espacés du double sans droit |
| Fluides hors périmètre du contrôle d'étanchéité fluoré | R-744, R-290, R-717 : aucune fréquence | `v8/js/data/reglementation-fluides.js:94` et `:102` | Avis du 16/07, question 5, **avec limitation explicite** : hors du cadre 7, mais on n'affiche jamais « aucune obligation réglementaire » en général (norme NF EN 378, ICPE, constructeur) | DEDUIT | Un utilisateur pourrait croire ces fluides sans aucune obligation. La fiche machine affiche toujours la ligne « fréquence de contrôle », au libellé borné au cadre 7 |
| Comparaisons de seuil **inclusives** (la valeur pile déclenche) | `>= 5`, `>= 1`, `>= 2` | `v8/js/data/reglementation-fluides.js:139` ; `server/api.js:7769-7779` | Choix cohérent avec la lecture usuelle « à partir de » | DEDUIT et CONSERVATOIRE | Déclenche au seuil exact plutôt qu'au-dessus : une obligation de plus, jamais de moins |
| Une **fiche explicite par fluide** l'emporte sur la dérivation du libellé de famille | champ `categorieCadre7` | `v8/js/data/reglementation-fluides.js:92-97`, migration 21 (`server/migrations.js:1022`) | Suppression d'une source d'erreur : la dérivation par recherche de sous-chaîne donnait des résultats différents selon l'ordre des tests d'un fichier à l'autre | DEDUIT | Sans elle, trois implémentations se contredisaient — c'est exactement ce qui s'était produit |

### Comment la changer si elle se révèle fausse

Ces seuils **ne sont pas dans l'écran d'administration** : ils sont dans le code,
en **deux exemplaires miroirs** qu'il faut modifier ensemble —
`v8/js/data/reglementation-fluides.js` (côté navigateur) et `server/api.js`
(fonction `niveauCadre7`, lignes 7752-7783). La parité des deux est prouvée par
la suite `test-contrat.mjs`, jouée contre chacun : **un seul des deux modifié
rend la suite rouge**, ce qui est le comportement voulu.

La catégorie d'un fluide donné, elle, se corrige **sans code** par l'écran
d'administration (champ « catégorie du cadre 7 »).

---

## 6. Famille C — Aptitude des personnes (qui a le droit d'intervenir)

| Ce qui est codé | Valeur retenue | Où (fichier:ligne) | Fondement | Degré de certitude | Risque si c'est faux |
|---|---|---|---|---|---|
| Limite de charge des catégories limitées, régime 2025 (A2, D) | **moins de 3 kg** | `v8/js/data/habilitations.js:243`, `:312`, `:315` ; miroir `server/droit-intervention.js:35`, `:189`, `:192` | Matrice de `docs/SPEC-HABILITATIONS.md` §2, validée fonctionnellement le 14/07 ; contre-épreuve du 24/07 « solide » (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:19`). Le texte n'est pas reproduit | DEDUIT | Une personne interviendrait sur un équipement qu'elle n'a pas le droit de toucher — ou l'inverse, un refus injustifié |
| Limite élargie si l'équipement est hermétiquement scellé **ET étiqueté** | **moins de 6 kg** | `v8/js/data/habilitations.js:244`, `:426-427` ; `v8/js/data/equipement.js:286-288` | Idem. L'exigence de l'**étiquetage** en plus du scellement est un durcissement délibéré : « le texte ne reconnaît pas un hermétique qui ne se déclare pas » | DEDUIT et CONSERVATOIRE | Sans l'exigence d'étiquetage, cocher une case suffisait à doubler la charge autorisée |
| Frontières **strictes** : la valeur pile est refusée | 2,999 kg accepté ; **3,000 refusé**. 5,999 accepté ; **6,000 refusé** | `v8/js/data/habilitations.js:456` ; miroir `server/droit-intervention.js:322` | Correction du 22/07 (décision D1 de `docs/PLAN-P0-5-APTITUDE.md:26`) : les comparateurs inclusifs étaient un bug | **CONSERVATOIRE** | Si la lecture stricte est fausse, on refuse une intervention légitime à 3,000 kg pile. Gêne, jamais infraction |
| Ancienne **catégorie II** (arrêté du 13/10/2008) : toutes opérations avec accès au circuit | **moins de 2 kg**, limite propre au régime 2008 | `v8/js/data/habilitations.js:256`, `:328` ; miroir `server/droit-intervention.js:48` | Contre-épreuve du 24/07, question 2, verdict « solide, source primaire lue » (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:20`). Le verbatim **n'est pas reproduit dans le dépôt** | DEDUIT | Le code était à 3 kg, c'est-à-dire **trop permissif**. Corrigé le 24/07 |
| Catégorie II sur machine hermétique : **pas de variante à 6 kg** | 2 kg quand même | `v8/js/data/habilitations.js:426-427` (le drapeau `hermetique6` n'existe que pour A2 et D) ; `server/droit-intervention.js:186-204` | Le texte de 2008 ne prévoit aucune variante hermétique ; le 6 kg est une règle du régime 2025. Décision R1 de Franck du 25/07 (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:252-253`) | **CONSERVATOIRE** | Si le texte de 2008 prévoyait une variante, on refuse à tort entre 2 et 6 kg |
| Ancienne **catégorie III** (récupération seule) alignée sur 2 kg | 2 kg | `v8/js/data/habilitations.js:330` | **Délégation côté strict**, révocable : même logique de texte que la catégorie II, jamais confirmée sur pièce (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:87-88`) | **CONSERVATOIRE** | Refus injustifié possible entre 2 kg et la vraie limite, si elle est plus haute |
| Le **contrôle d'étanchéité** échappe à la limite de charge | sans limite, pour les catégories qui le portent | `v8/js/data/habilitations.js:454-461` | Un contrôle d'étanchéité n'ouvre pas le circuit. Le **type de mouvement** sert de preuve d'absence d'ouverture — **proxy assumé**, consigné (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:336-339`) | DEDUIT | Un contrôle qui ouvrirait le circuit en pratique serait mal classé, **et indétectable par le logiciel**. C'est la limite la plus franche de cette famille |
| Un profil dépassé **dégrade** vers « contrôle d'étanchéité, sans limite » au lieu de disparaître | — | `v8/js/data/habilitations.js:454-461` | Revue adversariale du 24/07 : la synthèse « qui peut intervenir ? » contredisait le verdict par opération | DEDUIT | Sans cela, l'écran de conseil disait « refus » quand le moteur autorisait |
| Mentions par fluide (CO₂, ammoniac, hydrocarbures) étendant le droit d'intervenir | liste fermée | `v8/js/data/habilitations.js:109` | `docs/SPEC-HABILITATIONS.md` §2 | DEDUIT | Une mention accordée à tort ouvre un droit d'intervention |

### Comment la changer si elle se révèle fausse

**Par une constante, dans deux miroirs** — et nulle part ailleurs :
`SEUIL_CHARGE_LIMITEE_KG`, `SEUIL_CHARGE_HERMETIQUE_KG`,
`SEUIL_CHARGE_2008_KG` dans `v8/js/data/habilitations.js:243-256` et
`server/droit-intervention.js:35-48`. Aucune migration : ce ne sont pas des
données, ce sont des règles.

Attention à un piège déjà payé : **changer la constante ne suffisait pas**. La
fonction calculait un seuil global puis écrasait la limite propre à chaque
catégorie ; il a fallu re-câbler la ligne qui propage la limite **par catégorie**
(`v8/js/data/habilitations.js:426-427`). Toute correction future doit vérifier ce
point, sinon elle n'a aucun effet.

---

## 7. Famille D — Transition des attestations 2008 vers le régime 2025

C'est **l'exemple qui justifie à lui seul ce registre** : une valeur avait été
codée, elle était fausse, et c'est la relecture du texte qui l'a montré.

Le logiciel appliquait un couperet : au 31/12/2026, une attestation de 2008 ne
comptait plus. La lecture mot à mot de l'arrêté du 21/11/2025 a réfuté cette
lecture. Elle aurait déclaré **non habilités, dès le 01/01/2027, des techniciens
parfaitement en règle**.

| Ce qui est codé | Valeur retenue | Où (fichier:ligne) | Fondement | Degré de certitude | Risque si c'est faux |
|---|---|---|---|---|---|
| Fin de la **délivrance** sous l'ancien régime (et non fin de validité) | **31/12/2026** | `v8/js/data/habilitations.js:165` ; miroir `server/droit-intervention.js:56` | Arrêté du 21/11/2025 (JORFTEXT000053004604), articles 7 et 11, lus mot à mot le 24/07 — mais **seule la conclusion de cette lecture est consignée dans le dépôt, pas la phrase des articles** (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:28-33`) | DEDUIT — *reclassé le 26/07 : la définition du §3 exige que la phrase soit reproduite ici, elle ne l'est pas* | La version antérieure du code confondait délivrance et validité : elle invalidait à tort tout un parc d'attestations |
| Attestation de 2008 : **aucune remise à niveau n'est exigée** jusqu'au butoir. « Sans condition » ne vaut que pour la remise à niveau : les conditions générales, elles, s'appliquent d'abord — habilitation active, date de référence au format strict, date de fin lisible et non échue (`v8/js/data/habilitations.js:203-219`) | **12/03/2029** | `v8/js/data/habilitations.js:166`, `:222` ; miroir `server/droit-intervention.js:57` | Même arrêté, phrase reproduite dans le dépôt : « En l'absence de suivi des formations de remise à niveau ponctuelles avant le 12 mars 2029, l'attestation [...] n'est plus valide. » (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:34-36`) | **LU VERBATIM** | Coder « valable jusqu'au 12/03/2029 » serait faux **dans les deux sens** : invalide les remis à niveau, et ne sait rien décider après 2029 |
| Après le butoir : reconnue **uniquement** si une remise à niveau est enregistrée avant le butoir | date + organisme, migration 33 | `v8/js/data/habilitations.js:226-229` ; migration `server/migrations.js:1651-1656` | Même arrêté : c'est une **condition**, pas une échéance sèche | **LU VERBATIM** pour la condition, DEDUIT pour sa modélisation | Une remise à niveau tardive ne répare rien — c'est ce que dit le code, et l'alerte le motive |
| Puis cycle périodique | **7 ans** | `v8/js/data/habilitations.js:167`, `:230` ; miroir `server/droit-intervention.js:58` | Même arrêté, mais la durée n'est **pas reproduite** dans le dépôt | DEDUIT | Un cycle trop long laisserait valider des fiches par un titulaire dont l'aptitude est échue |
| Défaut de **refus** : régime inconnu ou date de référence illisible = non reconnu | — | `v8/js/data/habilitations.js:202-230` | Revue adversariale du 24/07 : « 2028-99-99 » passait les comparaisons de chaînes et reconnaissait une attestation jusqu'en 2035, **dans le fait d'aptitude du mode Officiel** | **CONSERVATOIRE** | Sans cela, une date fantaisiste prolongeait une aptitude morte |
| Une remise à niveau **dans le futur** est refusée à la saisie | garde de saisie | `v8/js/data/dates.js`, gardes CRUD des deux magasins | « Une formation non faite ne s'atteste pas d'avance » (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:303-306`) | DEDUIT | Sans cela, on s'auto-délivrait une prolongation |
| Citation juridique corrigée : l'aptitude des **personnes** relève de l'arrêté du **13/10/2008** | 13/10/2008 (et non 30/06/2008) | `docs/SPEC-HABILITATIONS.md:68` | Le 30/06/2008 vise la **capacité des entreprises** (art. R. 543-99), pas l'aptitude des personnes (art. R. 543-106). Erreur présente dans une analyse tierce **et dans nos propres documents** (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:41-44`) | DEDUIT | Citer le mauvais texte dans un dossier d'audit décrédibilise tout le reste |

### Comment la changer si elle se révèle fausse

Trois constantes, dans deux miroirs :
`FIN_DELIVRANCE_2008`, `DATE_BUTOIR_REMISE_NIVEAU_2008`,
`DUREE_CYCLE_FORMATION_ANS` — `v8/js/data/habilitations.js:165-167` et
`server/droit-intervention.js:56-58`. Les **données** de remise à niveau
(date, organisme) sont en base depuis la migration 33 : elles restent valables
quelle que soit la règle qu'on leur applique ensuite.

### Pourquoi cette famille est à part

**C'est la seule valeur du logiciel dont la correction a été un ASSOUPLISSEMENT.**
Partout ailleurs, la règle du §2 a joué : le doute a retiré un allègement, et une
erreur éventuelle nous rendrait plus sévères que le droit — gênant, jamais une
infraction. Ici, c'est l'inverse. Le code appliquait un couperet au 31/12/2026 ;
la relecture l'a levé. **Si notre lecture est fausse, l'erreur joue dans le sens
permissif** : des attestations de 2008 seraient reconnues après le 01/01/2027
alors qu'elles ne devraient plus l'être, et une fiche officielle pourrait être
validée par une personne qui n'y a plus droit.

C'est donc la seule famille où le filet du « conservatoire » ne nous protège pas.
Elle était prévue pour attendre le visa externe avant de s'exercer en mode
Officiel (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:172-176`). Le visa n'arrivant
pas, **la décision de l'établissement doit reprendre ce point nommément** — pas
au titre des risques résiduels en bloc, mais comme une ligne à part.

---

## 8. Famille E — Fluide vierge à PRP élevé : dates d'interdiction par usage

| Ce qui est codé | Valeur retenue | Où (fichier:ligne) | Fondement | Degré de certitude | Risque si c'est faux |
|---|---|---|---|---|---|
| Seuil de PRP au-delà duquel le fluide **vierge** est interdit en maintenance | **2500** | `v8/js/data/blocage-officiel.js:20` ; miroir `server/blocage-officiel.js:13` | Règl. UE 2024/573 art. 13 ; avis du 16/07, question 10 | DEDUIT | Un R-404A vierge chargé en maintenance sans alerte |
| Réfrigération (froid commercial), ou **usage non renseigné** | interdit depuis le **01/01/2025** | `v8/js/data/equipement.js:323`, `:331-336` ; miroir `server/equipement.js:195` | Contre-épreuve du 24/07, question 9 : « valeurs convergentes », mais **art. 13 non lu mot à mot** (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:23`) | DEDUIT | Date fausse = blocage injustifié, ou absence de blocage dû |
| Climatisation et pompes à chaleur | interdit depuis le **01/01/2026** | `v8/js/data/equipement.js:324`, `:332-335` ; miroir `server/equipement.js:196` | Idem | DEDUIT | Idem |
| Usage thermique **non renseigné** = régime le plus strict | traité comme froid (2025) | `v8/js/data/equipement.js:331-336` ; migration 34 (`server/migrations.js:1667-1675`), colonne à `NULL` par défaut | Application directe de la règle générale (§2) | **CONSERVATOIRE** | Une machine de climatisation non renseignée se voit refuser une charge vierge un an trop tôt. Gêne, jamais infraction |
| Un mouvement **antérieur** à la date applicable ne se bloque pas | comparaison sur la date du mouvement | `v8/js/data/blocage-officiel.js:194-207` | Le passé reste au barème du jour de l'écriture (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:343-344`) | DEDUIT | Sans cela, la reprise d'un registre ancien serait impossible |
| Faits absents = comportement d'avant (blocage) | — | `v8/js/data/blocage-officiel.js:196-199` | « Une clé absente ne vaut pas décision » | **CONSERVATOIRE** | Jamais moins de contraintes qu'avant le raffinement |
| En mode Formation : **avertissement, jamais blocage** | bandeau du parcours de saisie | Décision Franck du 16/07, « jamais bloquant » (`docs/TABLE-REGLEMENTAIRE-FLUIDES.md:88`) | Choix pédagogique assumé | — | En formation, un élève peut enregistrer une opération interdite : c'est voulu, l'erreur est la matière du cours |

**Deux trous consignés, non codés** : la **mise en service** d'un équipement neuf
n'est pas couverte par la restriction, et le sursis accordé au fluide **recyclé ou
régénéré** (dates annoncées 2030 et 2032) n'est pas modélisé en dur
(`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:141-144`). Les deux devaient partir au
visa. Ils restent ouverts.

### Comment la changer si elle se révèle fausse

Deux constantes de date dans deux miroirs
(`v8/js/data/equipement.js:323-324`, `server/equipement.js:195-196`) et le seuil
de PRP dans deux autres (`v8/js/data/blocage-officiel.js:20`,
`server/blocage-officiel.js:13`). L'usage thermique de chaque machine, lui, se
saisit à l'écran (liste fermée de trois valeurs, migration 34) : aucune
intervention technique pour corriger le parc.

---

## 9. Famille F — Exemption des équipements hermétiquement scellés

**C'est la seule règle du logiciel qui retire un contrôle.** Elle est écrite,
testée, et **désactivée**.

| Ce qui est codé | Valeur retenue | Où (fichier:ligne) | Fondement | Degré de certitude | Risque si c'est faux |
|---|---|---|---|---|---|
| Drapeau d'activation de l'exemption | **fermé** (`false`) | `v8/js/data/equipement.js:206` ; miroir `server/equipement.js:120` | Décision : « un seuil mal posé serait une infraction » — l'exemption attendait le visa externe (`v8/js/data/equipement.js:196-205`) | **CONSERVATOIRE** | Tant qu'il est fermé : le logiciel exige parfois un contrôle que le texte n'impose pas. Ouvert à tort : il en supprime un qui est dû |
| Condition d'entrée : hermétiquement scellé **ET étiqueté** | les deux cases | `v8/js/data/equipement.js:236`, `:286-288` | « Le texte ne reconnaît pas un hermétique qui ne se déclare pas » | DEDUIT et CONSERVATOIRE | Une seule case cochée ne doit pas exempter |
| Seuil catégorie HFC (annexe I) | **moins de 10 tonnes éq. CO₂**, strict | `v8/js/data/equipement.js:240-247` | Tableau de la question 6 tranché par Franck le 24/07 ; contre-épreuve « solide » mais **art. 5 non lu mot à mot** (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:22`) | DEDUIT | Exemption accordée au-delà du droit |
| Seuil catégorie HFO (annexe II section 1) | **moins de 2 kg**, strict | `v8/js/data/equipement.js:249-253` | Idem | DEDUIT | Idem |
| Seuil **résidentiel** | **moins de 3 kg** de gaz fluoré, strict | `v8/js/data/equipement.js:254-258` | Idem. Décision R2 de Franck du 25/07 : on garde le **« ou »** du texte, donc cette branche peut exempter au-delà de 10 t éq. CO₂ (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:254-255`) | DEDUIT | **Le cas le plus exposé** : 2,9 kg de R-404A résidentiel = 11,37 t éq. CO₂, soit plus du double du seuil de contrôle de 5 t, et pourtant exempté. Codé fidèle au texte tel que lu, gaté |
| HCFC : **jamais** exempté | — | `v8/js/data/equipement.js:237` | Hors article 5 (relève du règl. 1005/2009) | DEDUIT | Exemption indue sur un parc résiduel |
| Charge inconnue ou nulle : **jamais** exempté | garde stricte | `v8/js/data/equipement.js:238-239` | Règle générale (§2) | **CONSERVATOIRE** | Une charge non saisie ne doit pas devenir un droit |
| Le parc réel du lycée n'a **aucune** machine déclarée résidentielle | colonne à 0 partout | Migration 32, remplissage conservateur (`server/migrations.js:1618-1628`) | Décision de remplissage : « rien d'exempté, rien de vérifié » | **CONSERVATOIRE** | La branche la plus exposée ne touche, aujourd'hui, aucune machine |

### Comment la changer si elle se révèle fausse

**Basculer une constante dans les deux miroirs — et rien d'autre ne suffit.** Le
geste d'activation est écrit d'avance, en quatre étapes, avec la **liste exacte
des huit endroits** à brancher (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:190-198` :
CERFA cadre 7, plaque F-Gas, trois points du magasin de démonstration, trois
points du magasin serveur).

C'est nécessaire parce que le calcul d'exemption **n'est branché nulle part**. Le
drapeau `EXEMPTION_HERMETIQUE_ACTIVE` (`v8/js/data/equipement.js:206`) n'a qu'un
seul appelant, `exemptionControle` (`:274-277`) ; et `exemptionControle`
elle-même n'a **aucun consommateur de production** — seulement des vérifications
(`v8/js/data/test-equipement-pur.mjs`). L'écrire ne suffisait donc pas : il faut
la brancher partout de la même façon, sans quoi une machine serait exemptée sur
un écran et contrôlée sur un autre.

Règle posée pour cette activation : **jamais exempter en silence** — le motif
d'exemption doit s'afficher sur la plaque, sur la fiche machine et sur le CERFA.

---

## 10. Famille G — Détection permanente de fuites

| Ce qui est codé | Valeur retenue | Où (fichier:ligne) | Fondement | Degré de certitude | Risque si c'est faux |
|---|---|---|---|---|---|
| L'allègement de fréquence n'est dû que si le système a été **vérifié depuis moins de 12 mois** | 12 mois civils | `v8/js/data/equipement.js:39`, `:88-94`, `:129-158` ; miroir `server/equipement.js:20` | Aucun texte reproduit ; c'est la question 5 du dossier resté sans réponse. **Retrait d'un allègement non dû**, pas un blocage | **CONSERVATOIRE** | Si le droit n'exige pas cette vérification, on impose deux fois plus de contrôles que nécessaire |
| Détection déclarée mais jamais vérifiée, ou vérification périmée, ou date illisible, ou date **dans le futur** | l'allègement tombe | `v8/js/data/equipement.js:134-157` | Revue du 25/07 : « 2030-01-01 » ou « 2028-99-99 » divisaient par deux la fréquence sans qu'aucune vérification ait eu lieu | **CONSERVATOIRE** | Sans cela, une valeur entrée par un import contourne toute la règle |
| Détection permanente **obligatoire** au-delà du seuil haut | niveau 3 du moteur (500 t éq. CO₂ / 100 kg HFO / 300 kg HCFC) | `v8/js/data/equipement.js:191-193` — **interroge le moteur, ne recopie aucun seuil** | Avis du 16/07 et audit du 20/07 | DEDUIT | Une intervention officielle actée sur un équipement qui devrait être sous détection permanente |
| En mode Formation, l'obligation absente ne bloque pas : elle **alerte** | alerte `alr-detection-obligatoire-`, gravité critique | `v8/js/data/demo-store.js:2837` ; miroir `server/api.js:1525`. *(La condition bloquante 17, elle, vit en `v8/js/data/blocage-officiel.js:165-174` — deux mécanismes distincts, ne pas les confondre.)* | Principe : on ne bloque jamais en formation | — | — |

### Comment la changer si elle se révèle fausse

Une constante dans deux miroirs (`DELAI_VERIF_DETECTION_MOIS`). Le caractère
obligatoire, lui, **ne se change pas seul** : il est défini comme « le niveau haut
du moteur », donc il suit automatiquement toute correction des seuils de la
famille B. C'est délibéré — un seuil recopié est un seuil qui divergera.

---

## 11. Famille H — Cycle d'une fuite (contrôle après réparation)

| Ce qui est codé | Valeur retenue | Où (fichier:ligne) | Fondement | Degré de certitude | Risque si c'est faux |
|---|---|---|---|---|---|
| La règle visée : contrôle après réparation **au plus tôt après 24 h de fonctionnement**, au plus tard **1 mois** | — | `docs/PLAN-P0-6-CYCLE-FUITE.md:10-12` | Audit externe du 20/07 ; texte non reproduit | DEDUIT | Toute la famille repose sur cette formulation |
| Traduction codée du « au plus tôt après 24 h » | contrôle **strictement postérieur au jour** de la réparation (J+1) | `v8/js/data/dossiers-fuite.js:99-109` | **Proxy assumé** : toutes les dates métier du logiciel sont au jour, il n'existe aucun compteur d'heures de fonctionnement (`docs/PLAN-P0-6-CYCLE-FUITE.md:31`) | **CONSERVATOIRE** | Un contrôle réellement fait après 30 h de marche mais le même jour civil ne clôture pas : l'épisode reste ouvert. Sévérité assumée |
| Exception : équipements **mobiles listés** admis au contrôle immédiat | clôture le jour même autorisée | `v8/js/data/dossiers-fuite.js:99-108` ; `v8/js/data/equipement.js:298-302` | Décision G4 de Franck du 22/07, migration 27 | DEDUIT | Exception accordée à tort = clôture prématurée |
| La liste des mobiles éligibles est **fermée** ; « autre équipement mobile » n'ouvre **aucun** droit | 5 sous-types | `v8/js/data/equipement.js:47-54` | Durcissement du 23/07 : avant, tout équipement marqué mobile en bénéficiait | **CONSERVATOIRE** | Une case « mobile » cochée à la légère raccourcissait le cycle |
| Échéance du contrôle de suivi | **1 mois civil**, écrêté en fin de mois (31/01 → 28 ou 29/02) | `v8/js/data/dossiers-fuite.js:48-55` | Décision P0-6 du 22/07, en remplacement de « +30 jours calendaires » | DEDUIT | Un ou deux jours d'écart sur l'échéance affichée |
| Un contrôle **au-delà** d'un mois ferme quand même l'épisode, mais le retard est **consigné** | `clotureEnRetard` + nombre de jours | `v8/js/data/dossiers-fuite.js:216-227` | Décision G3 : « on n'empêche jamais d'enregistrer la réalité » (`docs/PLAN-P0-6-CYCLE-FUITE.md:35`) | DEDUIT | Le registre dit la vérité, y compris quand elle est mauvaise. C'est le choix assumé |
| Un contrôle conforme **seul** ne referme jamais une fuite sans réparation tracée | garde | `v8/js/data/dossiers-fuite.js:100`, `:23-24` | Garde anti-contournement | **CONSERVATOIRE** | Sans elle, un simple « conforme » effaçait une fuite non réparée |
| Un contrôle né d'un mouvement **annulé** est exclu | fait dérivé, sans réécriture | `v8/js/data/dossiers-fuite.js` (filtrage) ; décision G5 | Une écriture scellée ne se réécrit pas : le contrôle est réputé annulé si son mouvement porteur l'est | DEDUIT | Sans cela, un contrôle « fuite » annulé laissait la machine en fuite à jamais |

### Comment la changer si elle se révèle fausse

Module pur `v8/js/data/dossiers-fuite.js`, plus les fonctions miroirs des deux
magasins. **Aucune migration** pour la règle elle-même ; la distinction
fixe/mobile et le sous-type sont des données (migrations 27 et 32), corrigibles
à l'écran.

Si un compteur d'heures de fonctionnement devenait disponible un jour, le proxy
J+1 pourrait être remplacé par la vraie règle des 24 h. C'est consigné comme
hors périmètre, pas comme impossible (`docs/PLAN-P0-6-CYCLE-FUITE.md:80`).

### ⚠ Une correction de fiche ne rejoue pas la règle : le défaut du statut figé

Cette famille a un défaut connu, et il tient précisément à ce que la
distinction fixe/mobile soit une **donnée corrigible à l'écran** pendant que le
statut de la machine est une **colonne stockée**. Le statut n'est recalculé qu'à
l'enregistrement ou à l'annulation d'un contrôle
(`recalculerEffetsMachineApresAnnulation`, `server/api.js:7051-7079`) ;
`updateMachine` (`server/api.js:3280`) écrit le type d'installation et le
sous-type **sans jamais relancer ce calcul**. Une machine mobile listée dont la
fuite a été close le jour même — l'exception de la ligne « mobiles listés »
ci-dessus — puis repassée en FIXE par une simple correction de fiche, **garde son
statut figé à `EN_SERVICE`**, alors que la règle du J+1, désormais applicable,
dirait l'épisode encore ouvert.

Déclaré et non corrigé au journal des versions, revue adversariale du lot P1-1 :
« Consigné, non corrigé (antérieur à P1-1, hors périmètre) […] limitation
d'architecture existante depuis la migration 27, à traiter avec le modèle de
statut de P0-6, pas ici » (`CHANGELOG.md:805-809`). Détaillé au § 9 ter de
`docs/POINTS-DE-FRICTION.md`. Tant qu'il n'est pas fermé, tout changement de
FIXE / MOBILE sur une machine à historique de fuite appelle une relecture du
dossier de fuite correspondant.

---

## 12. Famille I — Déclaration annuelle (11 rubriques par fluide)

| Ce qui est codé | Valeur retenue | Où (fichier:ligne) | Fondement | Degré de certitude | Risque si c'est faux |
|---|---|---|---|---|---|
| Les **11 rubriques**, par fluide et par année | acquisitions · charges neuf · charges maintenance · récupérations hors d'usage · récupérations maintenance · remises distributeur · recyclage propre · régénération · destruction · cessions · stocks au 1er janvier et au 31 décembre | `v8/js/data/declaration-annuelle.js:41-72` ; miroir `server/declaration-annuelle.js` | Arrêté du 21/11/2025, **tel que restitué par le rapport d'audit externe du 20/07** (`docs/PLAN-P0-8-DECLARATION.md:11-23`). Le texte lui-même n'a pas été relu | DEDUIT | Une rubrique manquante ou mal alimentée fausse une déclaration faite à l'autorité |
| Les rubriques 2 à 5 se distinguent par le **type de mouvement**, jamais par le signe de la quantité | quatre types distincts | `v8/js/data/declaration-annuelle.js:87-104` | Correction d'audit : l'agrégation par signe perdait la distinction neuf/maintenance | DEDUIT | Confusion entre charge d'un équipement neuf et charge de maintenance |
| Un suivi de remise en filière **n'est pas** une destruction | ventilation par **issue attestée** | `v8/js/data/declaration-annuelle.js:114-127` ; migration 28 | Un bordereau constate une **remise** de déchet, pas le procédé final. Erreur de sens relevée par l'audit du 20/07 | DEDUIT | Déclarer détruit ce qui a été seulement remis est un défaut d'audit direct |
| Recyclage « sous responsabilité propre » | **toujours 0** | `v8/js/data/declaration-annuelle.js:51` | L'établissement ne recycle pas en interne | DEDUIT | Aucun tant que c'est vrai. À revoir si l'atelier acquiert un moyen de recyclage |
| Une **pièce justificative manquante** ne fait jamais disparaître une masse | la masse reste dans sa rubrique, une anomalie est levée | `v8/js/data/declaration-annuelle.js:117-127` | ⚠ Correction d'un **bloquant de revue** : la première version sortait des rubriques 8 et 9 toute issue déclarée sans pièce — 5,5 kg réellement détruits quittaient la déclaration. **Sous-déclaration** | **CONSERVATOIRE** | Ne jamais remettre cette règle. Elle est signalée comme telle dans le code |
| Le logiciel **compte** les pièces jointes, il ne les **lit** pas | mention permanente à l'écran | `v8/js/data/remise-filiere.js` (mention « pièce non probante ») | Une photo suffit à éteindre le contrôle de présence — c'est dit à l'utilisateur plutôt que caché | DEDUIT | Une pièce présente mais sans valeur probante n'est pas détectée. C'est écrit |

### Comment la changer si elle se révèle fausse

Module pur en deux miroirs
(`v8/js/data/declaration-annuelle.js` et `server/declaration-annuelle.js`), avec
une suite de parité qui compare les deux **jusqu'au texte du résultat**. Les
données nouvelles (issue de traitement, cessions) sont arrivées par les migrations
28 à 30 ; une rubrique supplémentaire demanderait une migration, pas une retouche
des précédentes.

---

## 13. Famille J — Les 18 conditions bloquantes du mode Officiel

Le mode Officiel est le mode opposable : écritures signées, scellées par empreinte
chaînée, non modifiables, correction par contre-écriture seulement. Dix-huit
conditions y **refusent** une validation. La liste complète et commentée est dans
`docs/CONDITIONS-BLOCANTES-OFFICIEL.md`.

| Ce qui est codé | Valeur retenue | Où (fichier:ligne) | Fondement | Degré de certitude | Risque si c'est faux |
|---|---|---|---|---|---|
| Le mode Officiel est **fermé** | `VERROU_LIVRAISON = true` | `v8/js/data/blocage-officiel.js:31` ; miroir `server/blocage-officiel.js:24` — **et nulle part ailleurs**, non modifiable par l'environnement | Refermé le 20/07 après un audit externe. Devait rouvrir après le visa : le lot L6 de réouverture était placé « après visa T3 sur Q3/Q6 ». **Depuis l'abandon du visa le 26/07/2026, `docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:64` pose à la place les trois conditions de `docs/NOTE-DECISION-ETABLISSEMENT.md` §4** (décision écrite de l'établissement, pilote sans écart, risques acceptés nommément). Le motif écrit dans la liste des conditions bloquantes (`docs/CONDITIONS-BLOCANTES-OFFICIEL.md:37`, condition 13) est autre : double signature réelle et empreinte renforcée non encore livrées — depuis livrées | — | **C'est le point que la décision de l'établissement doit trancher**, le visa n'arrivant pas |
| Conditions 1 à 5 — établissement, balance conforme, détecteur conforme, balance matière sans écart, sauvegarde vérifiée récente | seuil de sauvegarde : 24 h par défaut | `v8/js/data/blocage-officiel.js:84-96` | Conditions du plan audit-proof, validées par Franck le 16/07 | DEDUIT | Une fiche officielle établie sans moyen de mesure vérifié |
| Conditions 6 et 7 — intervenant désigné, actif, titulaire d'une habilitation active et valide | — | `v8/js/data/blocage-officiel.js:137-151` | Idem | DEDUIT | Fiche signée par une personne sans titre |
| Condition 8 — complétude (machine, fluide, pesées avant/après **différentes**, cause de l'appoint) | — | `v8/js/data/blocage-officiel.js:101-135` | Idem | DEDUIT | Fiche officielle incomplète, donc inexploitable |
| Condition 9 — contrôle d'étanchéité renseigné, jamais « sans objet », si la machine y est soumise **ou** si le fluide est inflammable | classe de sécurité ≠ A1 | `v8/js/data/blocage-officiel.js:176-185` | Idem ; l'extension aux fluides inflammables est un durcissement propre au projet | DEDUIT et CONSERVATOIRE | Le durcissement peut exiger un contrôle non dû sur un A2L. Assumé |
| Condition 10 — fluide vierge à PRP ≥ 2500 | voir famille E | `v8/js/data/blocage-officiel.js:187-207` | Famille E | DEDUIT | Famille E |
| Condition 11 — signature du technicien présente, nom compris | — | `v8/js/data/blocage-officiel.js:209-220` | — | DEDUIT | — |
| Condition 12 — le validateur **est** la personne connectée | serveur, **tous modes** | `v8/js/data/blocage-officiel.js:246-250` | C'est de la sécurité, pas du métier : appliqué aussi à l'annulation par contre-écriture | DEDUIT | Sans elle, on valide sous l'identité d'un autre |
| Conditions 14 et 15 — signatures **réelles** du technicien puis du détenteur, non périmées | voir famille K | `v8/js/data/blocage-officiel.js:222-243` | Famille K | DEDUIT | Famille K |
| Condition 16 — **aptitude opposable** : l'habilitation couvre cette intervention précise | matrice catégorie × opération × famille de fluide × charge nominale | `v8/js/data/blocage-officiel.js:152-162` | Famille C. Distincte de la condition 7 : la 7 dit qu'une habilitation **existe**, la 16 qu'elle **couvre** | DEDUIT | Une personne habilitée sur le principe mais pas pour cette charge valide quand même |
| Condition 17 — détection permanente obligatoire absente | voir famille G | `v8/js/data/blocage-officiel.js:165-174` | Famille G | DEDUIT | Famille G |
| **Condition 18** — pas de fiche officielle pour un fluide **hors périmètre fluoré** (R-744, R-290, R-717) | refus | `v8/js/data/blocage-officiel.js:111-123` | Notice du CERFA 15497*04 : elle vise les fluides fluorés. Contre-épreuve du 24/07 « solide, notice lue mot à mot », mais **le verbatim n'est pas reproduit dans le dépôt** (`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md:21`). **Revirement assumé** : l'arbitrage de juillet disait l'inverse | DEDUIT | Refus d'une trace officielle qui serait admise. La traçabilité volontaire passe par le mode Formation |
| Le critère de la condition 18 suit la **classification du moteur**, pas un attribut brut | fiche explicite, puis repli famille, puis « inconnue = hors périmètre » | `v8/js/data/blocage-officiel.js:111-123` | Revue adversariale du 24/07 : le critère d'origine était **contournable** — un fluide créé sans fiche passait, et vider la fiche du R-744 levait le blocage. Prouvé en le tirant, puis fermé | **CONSERVATOIRE** | Un fluide inclassable n'obtient pas de fiche officielle |
| **Aucun mécanisme de dérogation** : quand une condition n'est pas réunie, le refus est sec | pas de contournement justifié | `v8/js/data/blocage-officiel.js:269-274` | Décision Q5 du 24/07 : le brouillon non validable existe déjà, sa justification se formule comme motif d'abandon, jamais comme contournement | DEDUIT | Si le droit attend une dérogation tracée, on est plus rigide que le droit. C'est la question 10 du dossier resté sans réponse |
| En mode **Formation**, rien ne bloque jamais | — | Principe général du logiciel | Choix pédagogique | — | Un élève peut tout faire, y compris ce qui est interdit — c'est la matière du cours. Aucun document d'apparence officielle n'en sort |

### Comment la changer si elle se révèle fausse

Un module pur `blocage-officiel.js` en deux miroirs, **une condition = une
entrée**. Ajouter, retirer ou adoucir une condition est une modification locale,
sans migration. La liste lisible reste `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` :
elle doit être tenue à jour en même temps que le code, faute de quoi le dossier
d'audit décrit un logiciel qui n'existe plus.

Le verrou lui-même (`VERROU_LIVRAISON`) se rouvre en basculant **une constante
dans deux fichiers**. Ce geste, désormais, ne dépend plus d'un visa mais de la
décision écrite de l'établissement.

---

## 14. Famille K — Double signature de toute fiche officielle

| Ce qui est codé | Valeur retenue | Où (fichier:ligne) | Fondement | Degré de certitude | Risque si c'est faux |
|---|---|---|---|---|---|
| **Deux** signatures réelles exigées pour valider toute fiche officielle : technicien **puis** détenteur | les deux, à la validation | `v8/js/data/blocage-officiel.js:222-243` | **Arbitrage délibéré du projet**, décidé le 16/07 (conditions 14 et 15 de `docs/CONDITIONS-BLOCANTES-OFFICIEL.md:38-39`) | DEDUIT | Si le droit se contente d'une signature, le logiciel est plus exigeant que nécessaire — et il **bloque** un geste qui serait valable |
| Comparaison avec le minimum de l'article R. 543-82 du code de l'environnement | **non vérifiée** | — | ⚠️ **Nous ne pouvons pas l'établir ici.** L'article est cité comme source dans un rapport d'audit du dépôt (`docs/AUDIT-INERWEB-FLUIDE-2026-07-20.md:355`) mais **son texte n'est reproduit nulle part**. Affirmer que la double signature est « plus stricte que le minimum légal » serait une affirmation non prouvée | — | Nous savons que c'est un choix ; nous ne pouvons pas chiffrer de combien il dépasse le minimum. À faire relire |
| Toute modification de la fiche après signature **périme** les signatures | état à trois valeurs : valide / absente / périmée | `v8/js/data/blocage-officiel.js:227-241` | « Recommencez les signatures », jamais ignorée | **CONSERVATOIRE** | Sans cela, on signerait une fiche puis on la modifierait |
| Au lycée, le professeur signe côté détenteur **par délégation** | pré-cochée | `v8/js/data/parcours-signature.js` | Décision Franck du 16/07 : le détenteur est l'établissement, le professeur agit pour lui | DEDUIT | La qualité du signataire doit être exacte sur le CERFA — elle est inscrite dans la déclaration signée |
| Deux signatures posées depuis la **même session** ne sont ni bloquées ni signalées | admis | Décision D1, `docs/PLAN-B3-SIGNATURE.md` | Décision de l'auteur, publiquement assumée face à l'audit du 25/07 : « exiger deux sessions bloquerait l'activité sans rien prouver de plus » (`docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md:406-412`) | — | **Risque résiduel nommé** : une seule personne peut produire les deux signatures. Compensation : le **témoin de session** est désormais affiché sur la fiche et versé au dossier scellé |
| Une signature est une **image réellement décodée**, pas un fichier de la bonne taille | décodage PNG complet, contrôle des sommes de vérification | `v8/js/data/png.js` ; `v8/js/data/signatures-mouvement.js` | Constat d'audit du 25/07 : un bloc de 2 348 octets fait de 8 octets d'en-tête et d'une phrase répétée était **accepté**, et les conditions 14 et 15 disparaissaient (`docs/PLAN-B3-SIGNATURE.md:25-40`) | DEDUIT | C'était le seul endroit où le logiciel **disait quelque chose de faux** |
| Une case de signature **rigoureusement vierge** est refusée | refus du vide absolu | `v8/js/data/signatures-mouvement.js` | Même lot | DEDUIT | Un PNG parfaitement valide mais entièrement blanc passait pour une signature |
| **Aucun seuil de quantité d'encre** | borne basse de 1 Ko **retirée** | `v8/js/data/signatures-mouvement.js` | Mesure reproductible : zone jamais touchée 3 879 octets, griffure 3 893, case blanche unie 5 506 — **les populations se chevauchent**, un seuil de taille ne sépare rien. Et aucun texte ne fixe de seuil d'encre. Décision du propriétaire : une griffure de deux pixels doit passer | DEDUIT | Un seuil aurait refusé des signatures légitimes en croyant mesurer quelque chose |
| Le logiciel ne revendique **pas** une signature avancée ou qualifiée au sens du règlement eIDAS | — | Vérifié : aucun écran, aucun document produit n'emploie ces termes (`docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md:434-440`) | Honnêteté de vocabulaire | — | Revendiquer eIDAS sans le mettre en œuvre serait la faute la plus facile à opposer |

### Comment la changer si elle se révèle fausse

Les conditions 14 et 15 sont deux entrées du moteur de blocage : les retirer est
une modification locale, dans deux miroirs. Le décodage d'image vit dans un module
pur écrit sans aucune dépendance extérieure (`v8/js/data/png.js`, miroir
`server/png.js`), lui aussi en double avec une suite de parité.

---

## 15. Famille L — Cycle de la matière (d'où vient le fluide, où il va)

Cette famille est née d'une **erreur d'un auditeur externe**, corrigée : l'audit
soutenait que réemployer du fluide récupéré était illégal. Ce n'est pas le cas.
La règle retenue est la **conservation par machine d'origine**.

| Ce qui est codé | Valeur retenue | Où (fichier:ligne) | Fondement | Degré de certitude | Risque si c'est faux |
|---|---|---|---|---|---|
| Un fluide récupéré peut être **réemployé sur sa machine d'origine** sans retraitement | avoir par machine d'origine, dérivé des mouvements | `v8/js/data/avoir-origine.js:138-147` | Décision du 20/07 après réfutation de l'audit externe ; plan refondu (`docs/PLAN-P0-3-4-CYCLE-MATIERE.md`) | DEDUIT | Si le réemploi était interdit, le logiciel autoriserait une pratique illicite. Point à faire confirmer |
| Le fluide **régénéré ou recyclé s'achète** certifié — aucune requalification interne | partition état ↔ type de bouteille | `v8/js/data/demo-store.js:135-173` ; miroir dans `server/api.js` | Une bouteille de récupération ne « devient » jamais recyclée | DEDUIT | Sans la garde, on se délivrait à soi-même un certificat de régénération |
| Bouteille **neuve** = fluide acheté (vierge, recyclé, régénéré) ; bouteille de **récupération** = fluide des machines (récupéré, mélange, déchet, douteux) | deux listes fermées | `v8/js/data/demo-store.js:141-142` | Idem | DEDUIT | Un mélange déclaré « vierge » ressort en charge d'appoint |
| Une **surcharge de réemploi** (on réintroduit plus qu'on n'a récupéré) est **signalée, jamais bloquée** — même en mode Officiel | alerte + mention portée au CERFA | Alerte `alr-reemploi-` (`v8/js/data/demo-store.js:2976`) ; mention CERFA `v8/js/cerfa/generateur.js:100` et `:286` | **Décision expresse de Franck du 22/07** : avertir, jamais bloquer ; aucune rectification imposée | DEDUIT | Un écart de matière peut être validé. Il est **écrit sur le document officiel**, ce qui est le contraire d'un silence |
| Un transfert entre contenants **propage les lots d'origine** au prorata | passe chronologique | `v8/js/data/avoir-origine.js` (lot CM-5) | Sans quoi un transfert effaçait l'origine et permettait de contourner la traçabilité | DEDUIT | Perte de traçabilité de l'origine machine |
| Une bouteille déclarée **déchet** ne se relève pas par une modification de fiche | message unique pour toutes les portes | `v8/js/data/demo-store.js:149-152` | Revue : une garde posée sur une porte et pas sur l'autre laisse un passage | **CONSERVATOIRE** | Sortie silencieuse du circuit déchet |

### Comment la changer si elle se révèle fausse

Modules purs (`avoir-origine.js`) et gardes des deux magasins, en littéral miroir.
**Aucune migration** : l'avoir par machine d'origine est **dérivé** des mouvements
scellés, il n'est stocké nulle part. C'est ce qui permet de corriger la règle sans
toucher à une seule écriture du passé.

---

## 15 bis. Ce qui sort du logiciel pendant que le verrou est fermé

Ce n'est pas un arbitrage réglementaire, et pourtant cette liste appartient à ce
registre : elle est la **conséquence directe** de la famille J. Tant que le verrou
du mode Officiel est fermé, tout ce que le logiciel produit est un document de
formation — et **un seul de ces documents le dit sur lui-même**, la fiche CERFA
(mention `v8/js/cerfa/generateur.js:93`, apposée au cadre 14 `:538`, filigrane
`:754`). Les vingt et un autres sortent sans marque.

<a id="inventaire-documents-sans-marque"></a>

> ### Inventaire des documents qui sortent sans marque distinctive
>
> *Établi le 26/07/2026. Cette liste est reprise **à l'identique** dans les quatre pièces du
> dossier — `LIMITE-DE-RESPONSABILITE.md`, `docs/POINTS-DE-FRICTION.md`, le présent registre
> et `docs/NOTE-DECISION-ETABLISSEMENT.md` — parce qu'elle porte une consigne : un document
> absent de la liste échapperait à la consigne.*
>
> **Imprimés sur papier** (aperçu à l'écran, puis bouton « Imprimer ») :
>
> 1. **Fiche d'identification machine** — feuille A4 destinée à être **posée sur ou près de
>    l'équipement**, avec une case « Date de pose » et une case « Signature technicien » à
>    remplir à la main (`v8/js/documents/fiche-identification-machine.js:157`, `:161`,
>    `:413`). C'est l'imprimé qui ressemble le plus à une pièce officielle.
> 2. **Plaque F-Gas** (`v8/js/documents/plaque-fgas.js:341`).
> 3. **Bon d'intervention** (`v8/js/documents/bon-intervention.js:476`).
> 4. **Feuille de mise en service** (`v8/js/documents/feuille-mise-en-service.js:514`).
> 5. **Impression du bilan annuel**, qui porte en toutes lettres la section « **Déclaration
>    annuelle réglementaire — 11 rubriques** » (`v8/js/views/bilan.js:276-279` pour le titre,
>    `:779` pour l'impression).
> 6. **Audit en 5 minutes** — synthèse d'une page (`v8/js/views/bilan.js:684`, `:696`).
> 7. **Balance de matière** (`v8/js/views/balance.js:576`).
> 8. **Certificat de scellement** d'une archive — il porte l'empreinte SHA-256 et il est fait
>    pour être imprimé et classé (`v8/js/documents/verificateur.js:468`, téléchargement
>    `v8/js/documents/telecharger-dossier.js:78-88`).
> 9. **Étiquette de machine** (`v8/js/documents/etiquette-machine.js:303`).
> 10. **Étiquette de bouteille** (`v8/js/documents/etiquette-bouteille.js:401`).
> 11. **Étiquette de client** (`v8/js/documents/etiquette-client.js:268`).
> 12. **Étiquette d'outil** (`v8/js/documents/etiquette-outil.js:267`).
>
> **Fichiers téléchargés** :
>
> 13. **Dossier d'audit annuel**, archive ZIP scellée (`v8/js/documents/dossier-audit.js`).
> 14. **Dossier machine**, archive ZIP scellée (`v8/js/documents/dossier-machine.js`).
> 15. **Dossier client**, archive ZIP scellée (`v8/js/documents/dossier-client.js`).
> 16. **Dossier de fuite**, archive ZIP scellée (`v8/js/documents/dossier-fuite.js`).
> 17. **Vérificateur autonome** `99-VERIFICATEUR.html`, embarqué dans chacune de ces quatre
>     archives (`v8/js/documents/verificateur.js`).
> 18. **Exports CSV des tables du registre** (`v8/js/documents/exports.js`).
> 19. **Export CSV de la déclaration annuelle** (`v8/js/views/bilan.js:282`, `:773`).
> 20. **Journal d’audit en PDF** (`v8/js/documents/exports.js:688`) — page A4
>     paginée, titrée « Journal d’audit — inerWeb Fluide » et sous-titrée de la **raison
>     sociale de l’établissement** (`:720`, `:726-731`), produite par le bouton
>     « Exporter en PDF » de l’écran d’administration (`v8/js/views/admin.js:397`).
>     C’est la sortie qui ressemble le plus à une pièce officielle.
> 21. **Export CSV du bilan annuel** (`v8/js/views/bilan.js:330`), fichier
>     `bilan-fluides-AAAA.csv` — autre générateur que l’entrée n° 18, autre contenu que
>     l’entrée n° 19.
>
> **Une précision, pour éviter un contresens.** À l'intérieur des quatre archives, les
> **fiches CERFA sont bien marquées** : elles sortent du même générateur
> (`v8/js/cerfa/generateur.js:538`, `:754`). Ce qui ne l'est pas, c'est tout le reste de
> l'archive — sommaire, fichiers CSV, chronologie, vérificateur — et le certificat qui
> l'accompagne.
>
> **Deux sorties sont hors de cette consigne**, et elles sont nommées pour que
> l’inventaire soit complet. La **notice d’information des personnes** (protection des
> données, `v8/js/views/rgpd.js:534`) : imprimable sans marque elle aussi, mais **faite pour
> être remise** aux élèves et aux familles, et nul ne peut la prendre pour une pièce du
> registre des fluides. Et l’**export des données d’une personne** au titre du droit d’accès
> (fichier JSON, `v8/js/modales/personne-form.js:634`) : lui aussi destiné à être remis à
> la personne qui le demande. Ce sont des fichiers de données, pas des documents qui
> pourraient passer pour une pièce du registre.

**Et le repère de mode ne survit pas à l'impression.** À l'écran, le seul repère
permanent du mode est le badge de l'en-tête (`v8/index.html:58`, posé par
`v8/js/app.js:628`, dans le `<header id="entete">` de `v8/index.html:50`). La
feuille de style d'impression **masque cet en-tête** :
`#entete { display: none !important; }` dans le bloc `@media print` de
`v8/css/coquille.css:392-399` ; et les imprimés produits depuis une modale
d'aperçu masquent **tout** ce qui n'est pas le document
(`body * { visibility: hidden; }`, par exemple
`v8/js/documents/fiche-identification-machine.js:348-352`). Défaut du logiciel,
non corrigé, décrit au § 1 ter de `docs/POINTS-DE-FRICTION.md`.

**Vérification par soi-même**, couvrant bien ce qui est affirmé — tout `v8/js/`,
et non le seul dossier `documents/` :

```
grep -rn "MENTION_FORMATION\|MODE FORMATION\|NON OFFICIEL\|non officiel" v8/js/ \
  | grep -v "^v8/js/cerfa/" | grep -v "regularisation"
```

Elle ne rend rien. La contre-épreuve, la même commande sans les filtres, rend
trente-trois lignes, toutes dans `v8/js/cerfa/` ou dans les deux fichiers de
`regularisation` (le module du justificatif de régularisation et sa suite de tests —
lot 1 branche A, 27/07/2026 : ce document porte SA marque dès sa naissance, il n'entre
donc pas à l'inventaire ci-dessus, qui reste à vingt et un).

**Tant que ce point n'est pas tranché, aucun des vingt et un documents énumérés
ci-dessus ne doit être remis à un tiers.** La décision appartient à
l'établissement (`docs/NOTE-DECISION-ETABLISSEMENT.md`), pas à ce registre.

---

## 16. Ce que ce registre ne couvre pas

Par honnêteté, et parce qu'un inventaire qui prétend être complet ment :

- **Les valeurs de sécurité informatique** (dureté du hachage des mots de passe,
  obligation de chiffrement sur le réseau local, refus d'installer la base vive
  dans un dossier synchronisé) ne sont pas des valeurs réglementaires F-Gas :
  elles sont documentées ailleurs (`SECURITE.md`, `docs/CARTE-CODE.md`).
- **Le volet protection des données** (registre des traitements, durées de
  conservation, coffre des identités) relève du dossier destiné au délégué à la
  protection des données, resté lui aussi sans réponse. Il n'est pas traité ici.
- **Le multi-circuits** : le modèle ne connaît qu'une charge nominale par machine,
  pas une somme de circuits. Lacune de modèle actée le 16/07, jugée sans
  conséquence sur des équipements simples d'atelier
  (`docs/TABLE-REGLEMENTAIRE-FLUIDES.md:85`). Elle en aurait sur une installation
  industrielle.
- **L'« ouverture du circuit »** n'est pas une donnée saisie : elle est déduite du
  type de mouvement. Un contrôle d'étanchéité qui ouvrirait le circuit en pratique
  serait mal classé, **et le logiciel ne peut pas le détecter**.
- **Le catalogue de dix fluides supplémentaires** existe mais n'est pas semé.

---

## 17. Les questions restées sans réponse

Ce sont les onze questions du dossier `docs/T3-DOSSIER-RELECTURE-EXTERNE.md` § 2.3.
Pour chacune : ce que le logiciel applique **en attendant**, et ce qui changerait
si la réponse était différente. **C'est la section qu'on ressort le jour où
quelqu'un répond enfin.**

*Le tableau compte douze lignes pour onze questions : le dossier source numérote
de 1 à 11 avec un « 9 bis ». La numérotation d'origine est conservée telle
quelle, pour qu'une réponse reçue se range sans traduction.*

| # | La question | Ce que le logiciel applique en attendant | Effet d'une réponse différente |
|---|---|---|---|
| 1 | Seuils d'aptitude 3 kg / 6 kg hermétique étiqueté, frontière stricte | Moins de 3 kg ; moins de 6 kg si scellé **et** étiqueté ; 3,000 et 6,000 pile refusés (`habilitations.js:243-244`, `:456`) | Seuil plus haut : on refuse aujourd'hui des interventions légitimes (gêne). Seuil plus bas : on en autorise d'illégitimes (infraction). Correction = deux constantes |
| 2 | Ancienne catégorie II à 2 kg, contrôle d'étanchéité sans limite, aucune variante hermétique ; catégorie III alignée à 2 kg | 2 kg strict pour les catégories II et III, sans variante hermétique (`habilitations.js:256`, `:328-330`) | Si une variante hermétique existait en 2008, on refuse à tort entre 2 et 6 kg. Si la catégorie III avait une autre limite, notre alignement est une invention prudente — elle est signalée comme telle |
| 3 | Transition 2008 → 2025 : 31/12/2026 pour la délivrance, 12/03/2029 pour la remise à niveau, puis cycle de 7 ans | La mécanique en trois temps est codée (`habilitations.js:165-167`, `:202-230`) | C'est le seul point où **la correction a été un assouplissement** : le code d'avant invalidait à tort. Si notre lecture est fausse, des attestations de 2008 seraient acceptées après 2027 alors qu'elles ne devraient plus l'être. **À reprendre nommément dans la décision de l'établissement** |
| 4 | Seuils et fréquences : 5/50/500 t éq. CO₂ → 12/6/3 mois, doublés avec détection ; HFO purs 1/10/100 kg ; détection obligatoire au-delà du seuil haut | Tout est codé ainsi (`reglementation-fluides.js:45-78`) | Une erreur ici est **la plus grave du logiciel** : elle touche chaque machine, chaque échéance, chaque alerte. Correction = deux miroirs, sans migration |
| 5 | Allègement pour détection permanente accordé seulement si le système est vérifié depuis moins de 12 mois | Oui, allègement retiré sinon (`equipement.js:39`, `:129-158`) | Si la vérification n'est pas exigée, on impose **deux fois trop de contrôles**. Coûteux, jamais illégal |
| 6 | Exemption des hermétiques étiquetés : moins de 10 t éq. CO₂ / moins de 2 kg / moins de 3 kg résidentiel — et la branche résidentielle peut-elle exempter au-delà du seuil en tonnes ? | **Rien n'est exempté** : le calcul est codé mais le drapeau est fermé (`equipement.js:206`) | Tant que c'est fermé, aucun risque d'infraction, seulement un excès de rigueur. L'ouvrir sans réponse ferait porter au logiciel une décision qu'il n'a pas les moyens de justifier. Le cas exposé est chiffré : 2,9 kg de R-404A résidentiel = 11,37 t éq. CO₂ exemptés |
| 7 | HCFC : seuil bas à 2 kg ou 3 kg ? | **2 kg**, le plus contraignant (`reglementation-fluides.js:67`) | Si c'est 3 kg, on contrôle un peu trop tôt. Enjeu faible mais réel : l'établissement détient une bouteille de R-22 à mettre en réforme |
| 8 | PRP : retenir la valeur la plus élevée en cas de valeurs concurrentes est-il défendable en audit ? | Oui : R-455A à 148, R-452A à 2141 au catalogue (`migrations.js:267`) | Si la valeur de référence s'impose même plus basse, nos contrôles se déclenchent trop tôt — jamais trop tard. Correction : l'écran d'administration des fluides, sans migration |
| 9 | Refus d'une fiche officielle pour le R-744, le R-290 et le R-717 | Refusé (condition 18, `blocage-officiel.js:111-123`) | Si le refus est une mauvaise lecture, on prive l'établissement d'une trace officielle qu'il pourrait produire. Le mode Formation reste disponible comme trace volontaire |
| 9 bis | Dates d'interdiction du fluide vierge à PRP ≥ 2500 : 01/01/2025 en froid, 01/01/2026 en climatisation et pompes à chaleur, recyclé admis jusqu'en 2030 ; et le sort de la mise en service | Les deux premières dates sont codées et datées par usage (`equipement.js:323-336`). Le sursis du recyclé et la mise en service **ne sont pas modélisés** | Une date fausse bloque ou laisse passer une charge. Les deux trous non modélisés sont les zones les plus fragiles de cette famille — ils sont nommés, pas cachés |
| 10 | Blocage sec sans dérogation : bon choix pour un registre opposable ? | Refus sec, aucun contournement possible (`blocage-officiel.js`) | Si une dérogation tracée est attendue, le logiciel est plus rigide que le droit : on empêche d'enregistrer une situation réelle. Le contournement resterait alors le papier — ce qui ruinerait l'idée de registre unique |
| 11 | Un obstacle à ce que ce registre tienne lieu de **registre unique**, sans papier en parallèle ? | **Aucune réponse.** Le mode Officiel est fermé (`blocage-officiel.js:31`). Le logiciel ne peut donc pas, aujourd'hui, tenir lieu de registre unique | C'est **la** question. À défaut de réponse externe, le critère de sortie devient : décision écrite de l'établissement, fonctionnement en parallèle du papier sans écart constaté, et acceptation nommée des risques résiduels ci-dessus |

---

## 18. Tenue de ce registre

- Ce document décrit l'**état courant**. Toute modification d'une valeur ou d'une
  règle réglementaire doit s'y répercuter **dans le même mouvement** que le code —
  sinon il devient un document qui décrit un logiciel qui n'existe plus, c'est-à-dire
  pire que rien.
- Chaque ligne cite un fichier et une ligne : **les numéros de ligne bougent**.
  En cas de doute, c'est le nom de la constante ou de la fonction qui fait foi,
  pas le numéro.
- Le jour où une réponse externe arrive sur l'une des onze questions, elle se
  consigne au §17 avec sa date et son auteur, et le degré de certitude de la
  famille concernée est relevé en conséquence.

*Registre établi le 26/07/2026 — dépôt `inerweb-fluide`, branche `main`. Dernier
commit modifiant le code livré : `2ca4aa0`, à revérifier par
`git log -1 --format=%h -- server v8 outils`. Le numéro du dernier commit du dépôt
n'est pas écrit ici : ce registre et les trois autres pièces du dossier sont
enregistrés **après** la version qu'ils décrivent, donc aucun numéro fixe ne
tomberait juste — il se relève à la lecture par `git log -1 --format=%h`.*
