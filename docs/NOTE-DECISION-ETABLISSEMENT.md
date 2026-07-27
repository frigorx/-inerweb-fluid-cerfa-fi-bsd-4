# Note de décision de l'établissement — mise en service d'inerWeb Fluide

> **Document à compléter et à signer par l'établissement.** Il n'est pas rempli d'avance :
> les champs de décision sont laissés vides à dessein. Aucune décision n'est prise ici à la
> place de la direction.
>
> **Ce document supplée, à défaut, le visa externe qui n'a pas pu être obtenu** (voir § 4).
> Il ne le remplace pas : rien ne remplace un visa, et ce n'est pas équivalent — c'est ce
> qui est possible. Il ne transfère aucune obligation réglementaire et ne protège d'aucun
> contrôle : il sert à ce que la mise en service, si elle est décidée, le soit **en
> connaissance de cause** et par écrit. À lire avec `LIMITE-DE-RESPONSABILITE.md`, qui en
> est le complément.

| | |
|---|---|
| **Établissement** | ................................................................ |
| **Responsable de traitement / détenteur** | ................................................................ |
| **Note établie le** | 26/07/2026 |
| **Décision prise le** | ...... / ...... / .............. |
| **Référence interne** | ................................................ |

---

## 1. Objet

Il est demandé à l'établissement de se prononcer sur la **mise en service d'inerWeb Fluide
comme registre de traçabilité des fluides frigorigènes** de l'atelier froid et climatisation,
selon les modalités décrites aux § 6 et 7 (fonctionnement en parallèle du registre existant,
puis décision d'ouverture ou d'abandon).

La présente note ne demande **pas** d'ouvrir le registre officiel unique. Elle demande
d'autoriser un **pilote**, d'acter les risques résiduels, et de fixer les critères qui
permettront de décider ensuite.

---

## 2. État du logiciel à la date de la décision

| Élément | Valeur | Comment la revérifier |
|---|---|---|
| Version | 8.0.0-dev | `CHANGELOG.md`, en tête |
| Dernier commit modifiant le **code livré** | `2ca4aa0` du 26/07/2026 | `git log -1 --format=%h -- server v8 outils` |
| Dernier commit du dépôt (**documentation comprise**) | à relever à la signature — la présente note et ses annexes sont commitées **après** la version qu'elles décrivent, aucun numéro fixe ne peut donc être écrit ici | `git log -1 --format=%h` |
| Empreinte de l'archive livrée | ................................ (à relever à la livraison) | `node outils/fabriquer-paquet.mjs` écrit le fichier `.sha256` à côté de l'archive |
| Filet de tests | **TOUT VERT — 128 exécutions** ; durée de l'ordre de **100 secondes** (mesuré le 27/07/2026) | `node outils/lancer-tests.mjs --tout` |
| Suite de refus (sécurité négative) | **207 réussies, 0 en échec** (mesuré le 27/07/2026) | `node server/test-securite-negative.mjs` |
| Mode Officiel | **FERMÉ** par un verrou unique | `server/blocage-officiel.js:24` et `v8/js/data/blocage-officiel.js:31` |
| Conséquence du verrou | aucune fiche opposable n'est produite ; **le CERFA et le justificatif de régularisation** portent « MODE FORMATION — DOCUMENT NON OFFICIEL » (cadre 14 et filigrane pour le premier ; bandeau intérieur, visible à l'impression, pour le second). **Vingt et un autres documents produits ne portent aucune marque** — ils sont énumérés un par un à l'[inventaire du § 5.3](#inventaire-documents-sans-marque) *(lignes R26 et R34)* | `v8/js/cerfa/generateur.js:93`, `:538`, `:754` ; `v8/js/documents/regularisation.js` ; inventaire et commande de vérification au § 5.3 |
| Surface fonctionnelle | 96 méthodes de contrat (v13), 35 migrations de base (n° 2 à 36) | `v8/js/data/contrat.js`, `server/migrations.js` |

> Les deux chiffres de tests ci-dessus ont été **mesurés le 27/07/2026 sur cette version**,
> pas repris d'un document antérieur. La **durée** du filet est écrite comme un ordre de
> grandeur, et c'est volontaire : elle varie d'une exécution à l'autre — 103,0 s à la mesure
> du 27/07, et 96,8 s, 97,9 s et 98,8 s à trois mesures de la veille sur la version qui
> comptait 121 exécutions. Une mesure qui bouge ne se publie
> pas au centième ; ce qui compte est le nombre d'exécutions, le verdict, et la commande qui
> les refait. La suite de sécurité, elle, mêle des attaques réellement tirées contre un
> serveur et des preuves citées ; `SECURITE.md` annonce 118 attaques tirées, chiffre que nous
> n'avons pas recompté ligne à ligne.

---

## 3. Ce qui a été vérifié, et par quel moyen

- **Quatre relectures externes successives.** Les trois premières sont traitées ; **la
  quatrième ne l'est que pour partie, et son verdict est défavorable** (voir le détail plus
  bas et le § 5.1). **Trois verdicts défavorables en l'état sont établis dans le dépôt ;
  pour la première relecture, aucun verdict n'y est enregistré.** Le détail, tel qu'il est
  prouvable :
  - **15/07/2026** — relecture externe sur le code complet. **Aucun verdict n'est consigné.**
    Le dépôt n'en garde que le produit : elle a servi de source à la feuille de route du
    chantier réglementaire (`docs/PLAN-AUDIT-PROOF-2026.md`, en tête). Écrire qu'elle a été
    « rendue défavorable » serait une affirmation que rien ne soutient.
    *(À ne pas confondre avec `docs/AUDIT-COMPLET-2026-07-15.md`, de même date : c'est un
    audit **interne**, mené par le projet sur lui-même, et son verdict est nuancé — socle de
    sécurité jugé solide, mais « pas encore » pour un usage comme registre réglementaire
    principal.)*
  - **20/07/2026** — deuxième relecture externe, verdict « NO GO comme registre réglementaire
    officiel unique » (`docs/AUDIT-INERWEB-FLUIDE-2026-07-20.md` § 1).
  - **25/07/2026** — troisième relecture externe, **31 constats**, chacun traité et raccordé
    (`docs/TABLE-CONSTATS-AUDIT-2026-07-25.md`, réponse détaillée dans
    `docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md`).
  - **27/07/2026** — quatrième relecture externe, sur le paquet du 26/07. Verdict :
    **« NO-GO comme registre officiel unique ; GO conditionnel pour la démonstration et la
    formation locale »**, 16 constats. **Traitement en cours, et il n'est pas achevé.** Les
    seize constats ont été instruits un par un et **tirés en bac à sable**, pas seulement
    relus ; six corrections courtes sont livrées (le « lot 0 », `CHANGELOG.md` du
    27/07/2026). **Restent ouverts, et ils comptent** : la portée de l'attestation de
    capacité de l'établissement n'est confrontée à aucune intervention (le blocage n° 1 de
    cette relecture, sans effet aujourd'hui puisque le mode Officiel est fermé, mais
    bloquant avant toute réouverture) ; le CERFA produit pour une contre-écriture imprime la
    quantité au signe inverse et des blocs de signature pré-remplis, **dès aujourd'hui, en
    mode Formation** ; le verrouillage du compte après cinq essais est perpétuel et sans
    porte de secours ; un équipement à plusieurs circuits ou à plusieurs fluides peut faire
    disparaître une obligation de contrôle. Ces quatre points ne sont pas des risques à
    accepter : ce sont des travaux à faire, et la présente note ne doit pas être signée en
    laissant croire qu'ils sont réglés.
  **Attention : ces relectures ne sont pas des audits d'organisme agréé.** Le dépôt attribue
  les deux premières à un modèle de langue tiers (ChatGPT). Elles ont de la valeur — elles ont
  trouvé des défauts réels, dont plusieurs graves — mais elles **n'ont aucune portée
  réglementaire**.
- **Une suite de refus exécutable** : `node server/test-securite-negative.mjs` — 207
  vérifications, 0 en échec. Chaque ligne correspond à un geste refusé (écrire sans session,
  modifier une écriture scellée en SQL direct, réécrire le passé par un import, purger le
  journal, faire mentir une date, télécharger la base par le serveur web…). **Plusieurs de ces
  attaques ont réellement fonctionné avant d'être corrigées** : elles ont été trouvées en
  tirant, pas en relisant (`SECURITE.md` § 5).
- **Des revues adversariales internes après chaque lot de développement**, qui ont trouvé des
  défauts **dans les correctifs eux-mêmes** — y compris un bloquant qui faisait disparaître
  5,5 kg de fluide détruit de la déclaration annuelle, corrigé avant livraison (`CHANGELOG.md`,
  lot B2 ; `docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md` § 5). **Ces 5,5 kg sont des masses du
  jeu d'essai, pas du registre du lycée : aucune déclaration fausse n'a été transmise à
  l'autorité.** Le défaut a été trouvé et refermé avant toute livraison.
- **Un filet de tests rejoué intégralement** le 27/07/2026, après le lot 0 :
  `node outils/lancer-tests.mjs --tout` → « TOUT VERT — 128 exécutions »,
  durée de l'ordre de 100 secondes. **Ce que cela prouve est borné** : l'absence de
  régression sur ce qui est déjà testé, rien de plus (voir la ligne R22 du § 5).
- **Un inventaire écrit des limites connues** : `docs/POINTS-DE-FRICTION.md` (établi le
  26/07/2026), qui décrit chaque limite, la source dans le code, son état et la condition dans
  laquelle il faudra la rouvrir. C'est de lui qu'est repris le § 5 ci-dessous.

Ce qui **n'a pas** été vérifié est dit au § 4 et énuméré au § 5.

---

## 4. Pourquoi il n'y a pas de visa d'organisme agréé

Un dossier de relecture externe a été préparé le 23/07/2026
(`docs/T3-DOSSIER-RELECTURE-EXTERNE.md`) : onze questions écrites, précises, sur les seules
valeurs réglementaires dont la lecture n'est pas certaine — seuils d'aptitude, fréquences de
contrôle, exemptions, dates d'interdiction, règle du plus fort potentiel de réchauffement.
Les courriels et les notes de présentation étaient prêts.

**Ce visa ne sera pas obtenu.** Un organisme agréé délivre des attestations de capacité ; il
ne rend pas d'avis sur l'outil d'un tiers, et une réponse écrite l'engagerait. L'auteur a donc
tranché le 26/07/2026 : ne pas conditionner le projet à une réponse qui ne viendra pas, et
**suppléer le visa, à défaut, par de la transparence documentée** — ce n'est pas
équivalent, c'est ce qui est possible. Cette transparence, ce sont quatre pièces : le
présent document,
`LIMITE-DE-RESPONSABILITE.md`, l'inventaire des limites connues
(`docs/POINTS-DE-FRICTION.md`) et le registre des arbitrages réglementaires
(`docs/REGISTRE-DES-ARBITRAGES.md`), qui dit valeur par valeur où elle est codée, sur quoi
elle repose et avec quel degré de certitude.

Conséquence directe, et c'est le sens de cette note : **le critère d'ouverture du mode
Officiel n'est plus un visa externe**, mais la réunion de trois choses — une décision écrite
de l'établissement, un pilote mené en parallèle sans écart, et les risques résiduels acceptés
nommément.

---

## 5. Ce qui doit être traité avant la mise en service, puis les risques résiduels

> **Deux listes, et elles ne sont pas du même ordre.** Le § 5.1 énumère trois points qu'on
> **ne peut pas accepter** : les cocher reviendrait à acter le maintien d'une exposition
> active. Ils se traitent, ils ne s'acceptent pas. Le § 5.2 énumère les risques résiduels,
> qui peuvent être acceptés — un par un. Le § 5.3 n'est pas une troisième liste de risques :
> c'est **l'inventaire nominatif** que portent les lignes R26 et R34, et sur lequel repose la
> consigne « ces documents ne doivent pas être remis à un tiers ».
>
> Chaque ligne est reprise de l'inventaire détaillé `docs/POINTS-DE-FRICTION.md`, où elle est
> expliquée, sourcée dans le code et assortie de sa condition de réveil. **Le « § » entre
> parenthèses renvoie à une section de cet inventaire**, pas de la présente note ; les
> sections ajoutées après sa première rédaction y portent un numéro *bis* ou *ter*. Les
> valeurs réglementaires visées aux lignes R5 à R8, R27 et R31 sont détaillées une par une
> dans `docs/REGISTRE-DES-ARBITRAGES.md`.

### 5.1 À traiter avant la mise en service — ces trois points ne se cochent pas

> Ces trois points ne figurent pas dans la liste des risques acceptables, et c'est
> volontaire. Les laisser au même rang qu'un écart de potentiel de réchauffement sans effet
> donnerait à croire qu'ils sont du même ordre. Ils portent sur des données d'élèves
> **mineurs**, sur une exposition qui est peut-être **active en ce moment**, et sur
> l'absence complète du cadre légal du traitement. Aucun chef d'établissement ne peut les
> accepter en connaissance de cause : il ne peut que demander qu'ils soient traités.

| N° | Point | Ce qu'il faut avoir fait | Fait le | Par qui | Preuve jointe |
|---|---|---|---|---|---|
| **T1** | **Le poste n'est ni chiffré, ni sauvegardé hors site, et la restauration n'a jamais été testée** — sur un registre qui contient des **données d'élèves mineurs** *(§ 3)* | disque et supports chiffrés ; une copie déposée hors site ; **une restauration réellement effectuée**, datée et chronométrée | ...... / ...... / ...... | .................... | ☐ |
| **T2** | **L'ancien service Google est peut-être toujours en ligne** ; ses trois clés ont été publiées dans un dépôt public pendant 116 jours et **y sont encore** — retirer une valeur du code ne la retire pas de l'historique *(§ 5)* | **désactivation du déploiement Apps Script** (voie retenue, § 0 de `docs/P0-9-REVOCATION-CLES-V7.md`), constatée par écrit ; tant que le procès-verbal du § 4 n'est pas daté et signé, l'exposition est réputée **active** | ...... / ...... / ...... | .................... | ☐ |
| **T3** | **Aucune gouvernance de protection des données n'est en place** *(§ 6)* | inscription au registre des activités de traitement (article 30) ; **saisine du délégué à la protection des données de l'académie**, sous le couvert du chef d'établissement — une saisine envoyée par un enseignant seul n'engage rien ; décision motivée sur l'analyse d'impact ; information des élèves et des familles | ...... / ...... / ...... | .................... | ☐ |

Observations sur le § 5.1 : ..........................................................................
....................................................................................................

### 5.2 Les risques résiduels — à accepter un par un, ou pas

> **Une acceptation globale ne vaut rien.** C'est l'énumération qui fait la valeur de cette
> section : chaque ligne se coche séparément, et une ligne non cochée est un point qui devra
> être traité avant la mise en service. Il n'est volontairement proposé **aucune case
> d'acceptation globale** : ce serait le chemin que prendrait tout signataire pressé, et il
> annulerait l'énumération.

**Ce que le logiciel ne couvre pas aujourd'hui**

- [ ] **R1 — Aucune écriture n'est aujourd'hui soumise à un régime opposable.** Le verrou étant
      fermé, une fiche de formation qui déplace du fluide **réel** n'est opposée ni à
      l'aptitude de l'intervenant, ni aux signatures, ni au périmètre du CERFA. *(§ 1)*
- [ ] **R24 — L'exercice où aucun fluide n'a réellement bougé fait quand même bouger les
      stocks, et entre dans la déclaration annuelle faite à l'autorité.** C'est le cas
      **quotidien** de l'atelier : la charge simulée à l'azote est une séance du programme de
      l'établissement, au même titre qu'un CERFA rempli à blanc ou un banc démonté. Le calcul
      de la déclaration annuelle **ne connaît pas la notion de mode** : une écriture de
      formation y compte comme une autre. Le seul remède est l'annulation par
      contre-écriture — une **garantie de geste**, que rien dans le logiciel n'impose ni ne
      rappelle. *(§ 1 bis)*
- [ ] **R25 — Une surcharge de réemploi est signalée, jamais bloquée — mode Officiel
      compris.** C'est une décision expresse de l'auteur, du 22/07/2026 : avertir plutôt que
      forcer une rectification. Conséquence à accepter nommément : **un écart de matière peut
      être validé sur une fiche opposable**. Il est écrit sur le document, pas empêché.
      *(§ 2 bis)*
- [ ] **R26 — En dehors du CERFA, aucun document produit ne porte de marque de
      non-officialité — et il y en a vingt et un.** Rien ne les distingue à l'œil de leurs
      équivalents réglementaires, alors que la mention de formation est aujourd'hui la
      **seule** chose qui fait cette distinction. Les plus exposés : la **fiche
      d'identification machine**, feuille A4 faite pour être posée sur l'équipement avec une
      case « Date de pose / Signature technicien » ; l'**impression du bilan annuel**, qui
      porte le titre « Déclaration annuelle réglementaire — 11 rubriques » ; le **certificat
      de scellement** portant une empreinte SHA-256 ; la **plaque F-Gas**. **La liste
      complète est à l'[inventaire du § 5.3](#inventaire-documents-sans-marque), et c'est
      elle qui porte la consigne d'attente.** *(§ 1 ter)*
- [ ] **R34 — Le seul repère de mode visible à l'écran disparaît sur tout document
      imprimé.** Le badge « DÉMO / FORMATION » ou « LOCAL / FORMATION » de l'en-tête
      (`v8/index.html:58`, posé par `v8/js/app.js:628`) vit dans le `<header id="entete">`,
      et la feuille de style d'impression masque cet en-tête
      (`#entete { display: none !important; }`, `v8/css/coquille.css:392-399`) ; les imprimés
      ouverts en aperçu masquent même **tout** ce qui n'est pas le document. Autrement dit,
      le repère existe à l'écran et **ne s'imprime jamais**. C'est un **défaut du logiciel**,
      pas une imprécision de rédaction : il aggrave R26 et il appelle une décision
      distincte — marquer le papier, ou encadrer sa sortie par consigne écrite. *(§ 1 ter)*
- [ ] **R2 — Ce qui devra franchir les conditions bloquantes le jour de l'ouverture n'est pas
      tranché** : toutes les interventions, ou les seules fiches officielles ? Décision de
      l'auteur, non prise à ce jour. *(§ 1)*
- [ ] **R3 — Le suivi interne de remise en filière ne remplace pas le bordereau de suivi de
      déchets dématérialisé**, qui reste à établir sur la plateforme nationale. *(§ 2)*
- [ ] **R4 — Le mode Officiel n'a jamais tourné en production** : le parcours complet n'a
      jamais été exécuté sur le poste réel, avec sa base, son antivirus et son horloge. *(§ 8)*
- [ ] **R32 — Rétrograder un équipement mobile en fixe laisse un dossier de fuite réputé
      clos.** Un mobile listé peut être recontrôlé le jour même de la réparation ; un fixe
      non. Le statut de la machine est une colonne **stockée**, jamais recalculée sur une
      simple correction de fiche : la machine reste « en service » alors que la règle
      désormais applicable dirait l'épisode ouvert. Défaut déclaré au journal des versions,
      non corrigé, rattaché à un chantier ultérieur. *(§ 9 ter)*

**Valeurs réglementaires**

- [ ] **R5 — Onze points réglementaires sont codés sans aucun visa externe**, de façon
      délibérément conservatrice (« jamais moins de contrôles qu'exigé ») : le sens de l'erreur
      est maîtrisé, la justesse n'est pas garantie. *(§ 7)*
- [ ] **R27 — La transition des attestations de 2008 vers le régime de 2025 est le seul point
      où la correction a été un ASSOUPLISSEMENT**, donc le seul dont une erreur jouerait dans
      le sens permissif. Le code d'avant invalidait ces attestations à tort ; la mécanique
      retenue est délivrance jusqu'au 31/12/2026, remise à niveau jusqu'au 12/03/2029, puis
      cycle de sept ans. **Si cette lecture est fausse, des attestations de 2008 seraient
      acceptées alors qu'elles ne devraient plus l'être** — partout ailleurs, une erreur
      déclencherait des contrôles trop tôt, ici elle en déclencherait trop tard.
      *(`docs/REGISTRE-DES-ARBITRAGES.md`, ligne « Transition 2008 → 2025 » de son tableau de
      synthèse, qui demande expressément que ce point soit repris nommément dans la présente
      décision ; codé dans `v8/js/data/habilitations.js:165-167` et `:202-230`)*
- [ ] **R6 — Le potentiel de réchauffement du R-455A est retenu à 148 par précaution** alors
      que la valeur officielle discutée est 146. *(§ 7)*
- [ ] **R7 — Des dates du calendrier F-Gas ne sont pas modélisées** (fin du sursis des fluides
      recyclés et régénérés, palier de 2032) ; elles ne le seront pas sans lecture du texte
      applicable. *(§ 7)*
- [ ] **R8 — Le catalogue des fluides n'est pas validé ligne par ligne** ; tant qu'une fiche
      n'est pas validée, elle n'existe pas pour le moteur
      (`docs/CATALOGUE-FLUIDES-A-VALIDER.md`).
- [ ] **R31 — L'import accepte un PRP aberrant, et le PRP commande toutes les fréquences de
      contrôle.** La saisie refuse un PRP absent ou négatif ; **l'import ne le regarde pas**
      et l'écrit tel quel. Or le PRP convertit une charge en tonnes équivalent CO₂ : il
      décide du niveau réglementaire, de la fréquence, des échéances et des alertes. Une
      valeur fausse entrée par un import **allège tout un parc en silence** — le sens
      d'erreur que la doctrine du projet (« jamais moins de contrôles qu'exigé ») interdit
      partout ailleurs. Défaut **déclaré et volontairement non corrigé** : durcir l'import
      risquerait de bloquer la restauration d'une sauvegarde légitime. *(§ 7 bis)*

**Intégrité et sécurité**

- [ ] **R9 — Le modèle de menace s'arrête à l'accès au disque**, et le témoin d'intégrité du
      journal se recalcule : ni ancrage chez un tiers, ni horodatage qualifié. *(§ 9)*
- [ ] **R28 — Le rapprochement de matière sous-détecte le jour même d'une remise en
      filière.** À date égale au repère, seules les contributions positives sont retenues :
      une écriture sortante datée du jour de la remise n'est pas retranchée, et si la
      bouteille est regonflée d'autant sans écriture, **aucune alerte ne se déclenche**. Le
      choix est délibéré — l'autre réglage accusait par écrit des opérations valides — mais
      c'est un trou dans le rapprochement, borné à une journée par remise. *(§ 9 bis)*
- [x] **R29 — Le mot « inaltérable » était employé sans réserve à trois endroits de la
      documentation et des écrans** (`index.html`, `RGPD.md`, la notice affichée dans
      l'application), alors qu'il ne signifie jamais que « inaltérable **par
      l'application** » : qui a la main sur le fichier de base peut le remplacer. C'est le
      mot qui, seul, peut faire prendre le registre pour ce qu'il n'est pas. **Corrigé
      (lot B4, 27/07) : les trois emplois portent désormais la même précision que
      README.md.** Le balayage étendu à la famille entière (le premier inventaire ne
      traquait que ce seul mot et a laissé passer « inviolable ») a trouvé et corrigé
      deux autres emplois d'« inviolable » (`docs/SPEC-V8.md:168`, `server/db.js:21`) et
      plusieurs emplois de « preuve opposable » qui revendiquaient une valeur probante
      forte non tenue (`RGPD.md:107`, `v8/js/views/conformite.js:213`,
      `v8/js/data/contrat.js:345`, `MSG_MOTIF_OBLIGATOIRE` du coffre des identités
      serveur+front), ainsi qu'un « mot de passe chiffré » qui devait dire « haché »
      (`v8/js/views/rgpd.js:427` — le mot de passe est haché par scrypt, jamais
      déchiffrable). **La revue adversariale du même jour a trouvé deux emplois que ce
      balayage à la main déclarait pourtant avoir couverts** (`server/api.js:6409`
      « le registre redevient inviolable », et `index.html:244` « Toute altération se
      voit. », deux lignes sous le titre qui venait d'être qualifié) : corrigés à leur
      tour, et la règle est désormais tenue par une suite qui balaye les surfaces
      vivantes à chaque build (`outils/test-mots-qui-promettent.mjs`), plus par une
      relecture. Détail : `docs/POINTS-DE-FRICTION.md` § 9. *(§ 9)*
- [ ] **R11 — Un déni de service sur l'écran de connexion est confirmé, mesuré et non
      corrigé** ; à traiter avant toute activation de l'accès par le réseau local. *(§ 10)*
- [ ] **R12 — Les signatures ne sont pas des signatures électroniques avancées ou qualifiées**
      au sens européen : ce sont des tracés manuscrits associés à un contexte et scellés.
      *(`LIMITE-DE-RESPONSABILITE.md` § 2 e)*
- [ ] **R13 — Le témoin de la session qui a posé une signature n'entre pas dans l'empreinte
      scellée** ; il est capté, affiché et exporté, mais non protégé par le chaînage. *(§ 13)*
- [ ] **R14 — Le fichier des signatures du dossier scellé peut porter le nom figé d'une
      personne mise au coffre des identités** ; la fermeture honnête suppose une migration qui
      ne remplirait pas le passé. *(§ 13)*
- [ ] **R15 — Certains formats d'image de signature ne sont pas jugés** (réponse
      « indéterminable » : le doute profite au signataire). *(§ 13)*
- [ ] **R33 — Le bouton « Exporter une sauvegarde » reste offert à l'écran à des rôles qui
      n'y ont plus droit.** **Sans effet probant** : le serveur refuse en 403, rien ne fuit,
      le refus tient. C'est un bouton mort, déclaré au journal des versions et non corrigé.
      Il est nommé ici parce qu'il se trouve **trois lignes sous la référence exacte** vers
      laquelle `LIMITE-DE-RESPONSABILITE.md` § 2 b) envoie déjà le lecteur : qui suit ce
      renvoi le trouvera. *(§ 13)*

**Organisation et obligations de l'établissement**

- [ ] **R16 — Poste unique, et une seule personne qui sait pourquoi chaque garde existe.**
      Aucun correctif logiciel ne ferme ce point : il appelle une décision d'organisation.
      *(§ 4)*
- [ ] **R30 — Les autres risques d'exploitation du poste** : horloge fausse (les échéances
      réglementaires se calculent dessus), disque plein, antivirus mettant un fichier en
      quarantaine, et surtout **migration interrompue** — les migrations de base sont jouées
      au démarrage une par une, sans copie de sauvegarde préalable ; une coupure entre deux
      migrations laisse un registre **à moitié converti**, dont le seul retour arrière est la
      restauration d'une sauvegarde. *(§ 4)*

> Les trois points auparavant listés ici — poste non chiffré et sans restauration testée,
> service Google historique, gouvernance de protection des données — ont été **sortis de
> cette liste** : ils ne s'acceptent pas, ils se traitent. Voir le § 5.1.

**Qualité et reproductibilité du produit**

- [ ] **R19 — La version du moteur de base de données n'est ni figée, ni écrite dans le
      paquet livré** ; deux paquets fabriqués à deux dates peuvent différer. *(§ 11)*
- [ ] **R20 — Pas d'outillage d'ingénierie, pas d'inventaire normalisé des composants tiers,
      accessibilité jamais auditée.** *(§ 12)*
- [ ] **R21 — Un échec de test signalé par la relecture du 25/07 n'a pas pu être reproduit ni
      identifié** ; il est déclaré plutôt que passé sous silence. *(§ 12)*
- [ ] **R22 — Le filet vert ne prouve pas l'absence de défaut.** Les 128 exécutions prouvent
      l'absence de régression sur ce qui est déjà testé ; sur les trois derniers lots, six
      défauts ont été introduits par les correctifs eux-mêmes. *(§ 14)*
- [ ] **R23 — Résidus mineurs déclarés** (feuille de route interne périmée, identifiants
      techniques hérités, chiffres rétractés subsistant dans un commentaire, forme du numéro de
      suivi non exigée à l'import). *(§ 13)*

**Décision de l'établissement sur les risques résiduels**

> Il n'y a **pas** de case « tous les risques sont acceptés en l'état », et c'est délibéré :
> une acceptation globale ne vaut rien, et elle annulerait l'énumération qui fait la valeur
> de cette section. L'acceptation se marque **ligne par ligne**, dans les cases R1 à R34
> ci-dessus.

Nombre de lignes cochées : ........ sur 31 *(R1 à R34, hors R10, R17 et R18 devenus T1, T2, T3)*

☐ Les lignes non cochées ci-dessus doivent être traitées avant la mise en service. Ce sont, à
la date de la décision : ...........................................................................
....................................................................................................

☐ Les points T1, T2 et T3 du § 5.1 doivent être traités et leur preuve jointe avant la mise en
service.

☐ La mise en service est refusée en l'état.

Observations : ....................................................................................
....................................................................................................

### 5.3 L'inventaire que portent les lignes R26 et R34

> Cette liste est reprise **à l'identique** dans les quatre pièces du dossier
> (`LIMITE-DE-RESPONSABILITE.md`, `docs/POINTS-DE-FRICTION.md`,
> `docs/REGISTRE-DES-ARBITRAGES.md`, la présente note). Elle est ici parce qu'elle **porte
> une consigne**, et qu'une consigne ne vaut que par sa liste : un document absent de la
> liste échapperait à la consigne.

<a id="inventaire-documents-sans-marque"></a>

**Inventaire des documents qui sortent sans marque distinctive** — établi le 26/07/2026.

**Imprimés sur papier** (aperçu à l'écran, puis bouton « Imprimer ») :

1. **Fiche d'identification machine** — feuille A4 destinée à être **posée sur ou près de
   l'équipement**, avec une case « Date de pose » et une case « Signature technicien » à
   remplir à la main (`v8/js/documents/fiche-identification-machine.js:157`, `:161`,
   `:413`). C'est l'imprimé qui ressemble le plus à une pièce officielle.
2. **Plaque F-Gas** (`v8/js/documents/plaque-fgas.js:341`).
3. **Bon d'intervention** (`v8/js/documents/bon-intervention.js:476`).
4. **Feuille de mise en service** (`v8/js/documents/feuille-mise-en-service.js:514`).
5. **Impression du bilan annuel**, qui porte en toutes lettres la section « **Déclaration
   annuelle réglementaire — 11 rubriques** » (`v8/js/views/bilan.js:276-279` pour le titre,
   `:779` pour l'impression).
6. **Audit en 5 minutes** — synthèse d'une page (`v8/js/views/bilan.js:684`, `:696`).
7. **Balance de matière** (`v8/js/views/balance.js:576`).
8. **Certificat de scellement** d'une archive — il porte l'empreinte SHA-256 et il est fait
   pour être imprimé et classé (`v8/js/documents/verificateur.js:468`, téléchargement
   `v8/js/documents/telecharger-dossier.js:78-88`).
9. **Étiquette de machine** (`v8/js/documents/etiquette-machine.js:303`).
10. **Étiquette de bouteille** (`v8/js/documents/etiquette-bouteille.js:401`).
11. **Étiquette de client** (`v8/js/documents/etiquette-client.js:268`).
12. **Étiquette d'outil** (`v8/js/documents/etiquette-outil.js:267`).

**Fichiers téléchargés** :

13. **Dossier d'audit annuel**, archive ZIP scellée (`v8/js/documents/dossier-audit.js`).
14. **Dossier machine**, archive ZIP scellée (`v8/js/documents/dossier-machine.js`).
15. **Dossier client**, archive ZIP scellée (`v8/js/documents/dossier-client.js`).
16. **Dossier de fuite**, archive ZIP scellée (`v8/js/documents/dossier-fuite.js`).
17. **Vérificateur autonome** `99-VERIFICATEUR.html`, embarqué dans chacune de ces quatre
    archives (`v8/js/documents/verificateur.js`).
18. **Exports CSV des tables du registre** (`v8/js/documents/exports.js`).
19. **Export CSV de la déclaration annuelle** (`v8/js/views/bilan.js:282`, `:773`).
20. **Journal d’audit en PDF** (`v8/js/documents/exports.js:688`) — page A4
    paginée, titrée « Journal d’audit — inerWeb Fluide » et sous-titrée de la **raison
    sociale de l’établissement** (`:720`, `:726-731`), produite par le bouton
    « Exporter en PDF » de l’écran d’administration (`v8/js/views/admin.js:397`).
    C’est la sortie qui ressemble le plus à une pièce officielle.
21. **Export CSV du bilan annuel** (`v8/js/views/bilan.js:330`), fichier
    `bilan-fluides-AAAA.csv` — autre générateur que l’entrée n° 18, autre contenu que
    l’entrée n° 19.

**Une précision, pour éviter un contresens.** À l'intérieur des quatre archives, les
**fiches CERFA sont bien marquées** : elles sortent du même générateur
(`v8/js/cerfa/generateur.js:538`, `:754`). Depuis le 27/07/2026, les **justificatifs de
régularisation** (`regularisations/*.html`, la pièce qui remplace le CERFA d'une écriture
d'annulation) le sont aussi, et par le même texte
(`v8/js/documents/regularisation.js`). Ce qui ne l'est pas, c'est tout le reste de
l'archive — sommaire, fichiers CSV, chronologie, vérificateur — et le certificat qui
l'accompagne.

**Deux sorties sont hors de cette consigne**, et elles sont nommées pour que
l’inventaire soit complet. La **notice d’information des personnes** (protection des
données, `v8/js/views/rgpd.js:534`) : imprimable sans marque elle aussi, mais **faite pour
être remise** aux élèves et aux familles, et nul ne peut la prendre pour une pièce du
registre des fluides. Et l’**export des données d’une personne** au titre du droit d’accès
(fichier JSON, `v8/js/modales/personne-form.js:634`) : lui aussi destiné à être remis à
la personne qui le demande. Ce sont des fichiers de données, pas des documents qui
pourraient passer pour une pièce du registre.

**Vérification par soi-même**, couvrant bien ce qui est affirmé — tout `v8/js/`, et non le
seul dossier `documents/`. Les documents MARQUÉS — le CERFA et le justificatif de
régularisation — sont écartés du filtre, et eux seuls :

```
grep -rn "MENTION_FORMATION\|MODE FORMATION\|NON OFFICIEL\|non officiel" v8/js/ \
  | grep -v "^v8/js/cerfa/" | grep -v "regularisation"
```

Elle ne rend **rien**. La contre-épreuve est la même commande sans les filtres : elle rend
trente-trois lignes, toutes dans `v8/js/cerfa/` ou dans les deux fichiers de
`regularisation` (le module du justificatif et sa suite de tests).

> **Consigne d'attente.** Tant que le point n'est pas tranché par l'établissement, **aucun
> des vingt et un documents ci-dessus ne doit être remis à un tiers**, et l'ajout de la ligne
> R34 dit pourquoi la consigne ne peut pas se contenter d'un repère à l'écran : ce repère ne
> s'imprime pas.

---

## 6. Conditions de la mise en service

Ces conditions sont proposées ; l'établissement les arrête.

1. **Pilote en parallèle du registre actuel.** Le registre existant **reste la référence**
   pendant toute la durée du pilote. Toute intervention est portée aux deux endroits.
2. **Durée du pilote** : .......... semaines *(proposition de l'auteur : au moins six semaines
   couvrant une période d'activité normale de l'atelier)*.
3. **Comparaison périodique** : rapprochement des deux registres tous les .......... *(proposition :
   toutes les semaines)*, portant sur le nombre d'interventions, les masses de fluide, les dates
   de contrôle et les fiches produites.
4. **Journal des écarts** : tout écart constaté est consigné (date, nature, cause, suite
   donnée), qu'il vienne du logiciel ou de la saisie. Un écart non expliqué est un écart
   bloquant.
5. **Le mode Officiel reste fermé pendant tout le pilote.** L'ouverture ne peut résulter que
   d'une décision écrite prise au vu du § 7. **Attention : seuls le CERFA et le justificatif
   de régularisation portent la mention de
   formation** (ligne R26) ; **vingt et un autres documents n'en portent aucune** — la liste est
   à l'[inventaire du § 5.3](#inventaire-documents-sans-marque) — et **le repère de mode
   affiché à l'écran ne s'imprime pas** (ligne R34). Tant que ce point n'est pas corrigé, une
   consigne d'atelier doit dire où sont rangés les documents produits en séance, et que rien
   de ce qui sort du logiciel ne va au classeur réglementaire.
6. **Conditions matérielles** : poste chiffré, base hors dossier synchronisé, sauvegardes
   sorties du poste et vérifiées — voir `LIMITE-DE-RESPONSABILITE.md` § 4. **C'est le point
   T1 du § 5.1 : il est préalable au pilote, pas concomitant.**
7. **Sauvegarde prise avant toute mise à jour du logiciel**, parce qu'une migration de base
   interrompue laisse un registre à moitié converti (ligne R30).
8. **Séances sans fluide** : consigne écrite d'atelier disant quand contre-écrire une
   écriture d'exercice, et qui le vérifie (ligne R24). Sans elle, la balance et la
   déclaration annuelle portent des masses qui n'ont jamais bougé.
9. **Retour arrière possible à tout moment** (§ 9 de la présente note).

Responsable du pilote : ......................................  Suppléant : ......................

---

## 7. Critères de sortie du pilote

Chiffrés et vérifiables. Les valeurs sont à arrêter par l'établissement ; celles entre
parenthèses sont des propositions de l'auteur, non des décisions.

| N° | Critère | Comment on le mesure | Seuil retenu |
|---|---|---|---|
| C1 | Durée réelle du pilote | calendrier | .......... semaines *(≥ 6 ; le dossier de relecture externe évoquait deux à quatre semaines — la proposition est ici plus longue, la direction tranche)* |
| C2 | Interventions réellement saisies dans les deux registres | comptage | .......... *(≥ 20)* |
| C3 | Écarts **non expliqués** entre les deux registres | journal des écarts | .......... *(0 exigé)* |
| C4 | Écarts expliqués et corrigés | journal des écarts | tous tracés |
| C5 | Fiches CERFA produites pendant le pilote, relues champ par champ | relecture datée | .......... % *(100 %)* |
| C6 | Restauration complète d'une sauvegarde, réussie sur un poste distinct | procès-verbal daté et chronométré | .......... *(≥ 1)* |
| C7 | Sauvegardes vérifiées sur la période, dont au moins une hors du poste | listing des archives | .......... *(≥ 4)* |
| C8 | Filet de tests sur la version exacte mise en service | `node outils/lancer-tests.mjs --tout` | « TOUT VERT » exigé |
| C9 | Suite de refus sur la même version | `node server/test-securite-negative.mjs` | « 0 en échec » exigé |
| C10 | Empreinte SHA-256 de la version mise en service, relevée et consignée | fichier `.sha256` de l'archive | relevée |
| C11 | Alertes rouges non traitées au tableau de conformité en fin de pilote | écran « feu tricolore » | .......... *(0)* |
| C12 | Risques résiduels du § 5 relus en fin de pilote | présente note, datée et re-signée | fait |
| C13 | Parcours officiel complet exécuté **sur le poste cible** (passage en officiel, soumission, signatures, validation, CERFA, scellement) avant toute exploitation en mode Officiel | compte rendu daté, fiche d'essai conservée | fait *(la répétition générale en environnement de test ne suffit pas — voir `docs/POINTS-DE-FRICTION.md` § 8)* |

**Décision d'ouverture du mode Officiel** *(à ne prendre qu'au vu des résultats ci-dessus)* :

☐ Ouverture autorisée à compter du ...... / ...... / ..............
☐ Pilote prolongé jusqu'au ...... / ...... / .............., motif : ...............................
☐ Ouverture refusée, motif : ......................................................................

---

## 8. Réévaluation

La présente note est réévaluée :

- à la fin du pilote ;
- **au plus tard le** ...... / ...... / .............. *(proposition : douze mois après la
  décision)* ;
- à chaque évolution réglementaire touchant les valeurs listées au § 5 ;
- à chaque livraison d'une nouvelle version du logiciel changeant les chiffres du § 2.

---

## 9. Procédure de retour arrière

Elle est simple parce que le registre existant n'a jamais cessé d'être tenu pendant le pilote.

1. **Décision d'arrêt** consignée par écrit, avec sa date et son motif.
2. **Le registre de référence redevient l'unique registre** — il l'est resté de droit pendant
   tout le pilote.
3. **La base et ses sauvegardes sont conservées, jamais détruites** : les écritures scellées
   sont, par construction, non modifiables et non effaçables. Une archive chiffrée est faite et
   rangée avec la présente note.
4. **Les documents déjà produits** n'ont pas à être retirés d'un dossier réglementaire :
   produits verrou fermé, ils n'y ont pas leur place. **Mais seuls le CERFA et le
   justificatif de régularisation le disent sur
   eux-mêmes** (ligne R26) : les **vingt et un autres** documents, énumérés à
   l'[inventaire du § 5.3](#inventaire-documents-sans-marque), ne portent aucune marque — et
   même leur impression ne conserve pas le repère de mode affiché à l'écran (ligne R34).
   Leur retrait éventuel suppose donc de savoir où ils sont allés, et c'est le seul moyen de
   le savoir.
5. Si le mode Officiel avait été ouvert, la reprise au registre de référence des écritures
   officielles produites entre l'ouverture et l'arrêt est faite et datée avant clôture.

---

## 10. Ce que cette note ne fait pas

- Elle **ne rend pas l'établissement conforme** ; elle ne remplace ni un visa d'organisme
  agréé, ni un avis juridique.
- Elle **ne transfère aucune obligation réglementaire à l'auteur du logiciel** : l'obligation
  pèse sur le détenteur, c'est-à-dire l'établissement.
- Elle **ne protège d'aucun contrôle.** Elle établit seulement que la décision a été prise en
  connaissance des limites de l'outil.

---

## Signatures

| | Chef d'établissement | Auteur et exploitant du logiciel |
|---|---|---|
| **Nom** | .............................................. | Franck Henninot |
| **Qualité** | Responsable de traitement / détenteur | Enseignant froid et climatisation |
| **Date** | ...... / ...... / .............. | ...... / ...... / .............. |
| **Signature** | | |

*Pièces jointes recommandées : `LIMITE-DE-RESPONSABILITE.md`, `docs/POINTS-DE-FRICTION.md`,
`docs/REGISTRE-DES-ARBITRAGES.md`, `SECURITE.md`, `RGPD.md`, `SAUVEGARDE.md`,
`docs/T3-DOSSIER-RELECTURE-EXTERNE.md`, `docs/TABLE-CONSTATS-AUDIT-2026-07-25.md`.*
