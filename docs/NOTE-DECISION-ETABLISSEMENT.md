# Note de décision de l'établissement — mise en service d'inerWeb Fluide

> **Document à compléter et à signer par l'établissement.** Il n'est pas rempli d'avance :
> les champs de décision sont laissés vides à dessein. Aucune décision n'est prise ici à la
> place de la direction.
>
> **Ce document remplace le visa externe qui n'a pas pu être obtenu** (voir § 4). Il ne
> transfère aucune obligation réglementaire et ne protège d'aucun contrôle : il sert à ce
> que la mise en service, si elle est décidée, le soit **en connaissance de cause** et par
> écrit. À lire avec `LIMITE-DE-RESPONSABILITE.md`, qui en est le complément.

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
| État du dépôt | commit `1cd457a` du 26/07/2026 | `git log -1` |
| Empreinte de l'archive livrée | ................................ (à relever à la livraison) | `node outils/fabriquer-paquet.mjs` écrit le fichier `.sha256` à côté de l'archive |
| Filet de tests | **TOUT VERT — 121 exécutions en 98,8 s** (mesuré le 26/07/2026) | `node outils/lancer-tests.mjs --tout` |
| Suite de refus (sécurité négative) | **207 réussies, 0 en échec** (mesuré le 26/07/2026) | `node server/test-securite-negative.mjs` |
| Mode Officiel | **FERMÉ** par un verrou unique | `server/blocage-officiel.js:24` et `v8/js/data/blocage-officiel.js:31` |
| Conséquence du verrou | aucune fiche opposable n'est produite ; tout document porte « MODE FORMATION — DOCUMENT NON OFFICIEL » | `v8/js/cerfa/generateur.js:93` |
| Surface fonctionnelle | 96 méthodes de contrat (v13), 35 migrations de base (n° 2 à 36) | `v8/js/data/contrat.js`, `server/migrations.js` |

> Les deux chiffres de tests ci-dessus ont été **mesurés le 26/07/2026 sur ce commit**, pas
> repris d'un document antérieur. La suite de sécurité mêle des attaques réellement tirées
> contre un serveur et des preuves citées ; `SECURITE.md` annonce 118 attaques tirées, chiffre
> que nous n'avons pas recompté ligne à ligne.

---

## 3. Ce qui a été vérifié, et par quel moyen

- **Trois relectures externes successives**, toutes rendues avec un verdict défavorable en
  l'état, toutes traitées :
  - 15/07/2026 — relecture externe sur le code complet (`docs/PLAN-AUDIT-PROOF-2026.md`, en tête) ;
  - 20/07/2026 — deuxième relecture externe, verdict « NO GO comme registre réglementaire
    officiel unique » (`docs/AUDIT-INERWEB-FLUIDE-2026-07-20.md` § 1) ;
  - 25/07/2026 — troisième relecture externe, **31 constats**, chacun traité et raccordé
    (`docs/TABLE-CONSTATS-AUDIT-2026-07-25.md`, réponse détaillée dans
    `docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md`).
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
  lot B2 ; `docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md` § 5).
- **Un filet de tests rejoué intégralement** avant l'établissement de la présente note.
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
**remplacer le visa par de la transparence documentée** — le présent document,
`LIMITE-DE-RESPONSABILITE.md`, l'inventaire des limites connues
(`docs/POINTS-DE-FRICTION.md`) et le registre des arbitrages réglementaires
(`docs/REGISTRE-DES-ARBITRAGES.md`), qui dit valeur par valeur où elle est codée, sur quoi
elle repose et avec quel degré de certitude.

Conséquence directe, et c'est le sens de cette note : **le critère d'ouverture du mode
Officiel n'est plus un visa externe**, mais la réunion de trois choses — une décision écrite
de l'établissement, un pilote mené en parallèle sans écart, et les risques résiduels acceptés
nommément.

---

## 5. Les risques résiduels — à accepter un par un, ou pas

> **Une acceptation globale ne vaut rien.** C'est l'énumération qui fait la valeur de cette
> section : chaque ligne se coche séparément, et une ligne non cochée est un point qui devra
> être traité avant la mise en service.
>
> Chaque ligne est reprise de l'inventaire détaillé `docs/POINTS-DE-FRICTION.md`, où elle est
> expliquée, sourcée dans le code et assortie de sa condition de réveil. Le « § » entre
> parenthèses renvoie à la section de ce document. Les valeurs réglementaires visées aux
> lignes R5 à R8 sont détaillées une par une dans `docs/REGISTRE-DES-ARBITRAGES.md`.

**Ce que le logiciel ne couvre pas aujourd'hui**

- [ ] **R1 — Aucune écriture n'est aujourd'hui soumise à un régime opposable.** Le verrou étant
      fermé, une fiche de formation qui déplace du fluide **réel** n'est opposée ni à
      l'aptitude de l'intervenant, ni aux signatures, ni au périmètre du CERFA. *(§ 1)*
- [ ] **R2 — Ce qui devra franchir les conditions bloquantes le jour de l'ouverture n'est pas
      tranché** : toutes les interventions, ou les seules fiches officielles ? Décision de
      l'auteur, non prise à ce jour. *(§ 1)*
- [ ] **R3 — Le suivi interne de remise en filière ne remplace pas le bordereau de suivi de
      déchets dématérialisé**, qui reste à établir sur la plateforme nationale. *(§ 2)*
- [ ] **R4 — Le mode Officiel n'a jamais tourné en production** : le parcours complet n'a
      jamais été exécuté sur le poste réel, avec sa base, son antivirus et son horloge. *(§ 8)*

**Valeurs réglementaires**

- [ ] **R5 — Onze points réglementaires sont codés sans aucun visa externe**, de façon
      délibérément conservatrice (« jamais moins de contrôles qu'exigé ») : le sens de l'erreur
      est maîtrisé, la justesse n'est pas garantie. *(§ 7)*
- [ ] **R6 — Le potentiel de réchauffement du R-455A est retenu à 148 par précaution** alors
      que la valeur officielle discutée est 146. *(§ 7)*
- [ ] **R7 — Des dates du calendrier F-Gas ne sont pas modélisées** (fin du sursis des fluides
      recyclés et régénérés, palier de 2032) ; elles ne le seront pas sans lecture du texte
      applicable. *(§ 7)*
- [ ] **R8 — Le catalogue des fluides n'est pas validé ligne par ligne** ; tant qu'une fiche
      n'est pas validée, elle n'existe pas pour le moteur
      (`docs/CATALOGUE-FLUIDES-A-VALIDER.md`).

**Intégrité et sécurité**

- [ ] **R9 — Le modèle de menace s'arrête à l'accès au disque**, et le témoin d'intégrité du
      journal se recalcule : ni ancrage chez un tiers, ni horodatage qualifié. *(§ 9)*
- [ ] **R10 — Le poste n'est ni chiffré, ni sauvegardé hors site, et la restauration n'a
      jamais été testée.** *(§ 3)*
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

**Organisation et obligations de l'établissement**

- [ ] **R16 — Poste unique, et une seule personne qui sait pourquoi chaque garde existe.**
      Aucun correctif logiciel ne ferme ce point : il appelle une décision d'organisation.
      *(§ 4)*
- [ ] **R17 — L'ancien service Google est peut-être toujours en ligne, et ses clés sont
      publiques pour toujours** ; le geste qui ferme l'exposition appartient à l'auteur du
      compte. *(§ 5)*
- [ ] **R18 — Aucune gouvernance de protection des données n'est en place** : inscription au
      registre des activités de traitement, qualification de l'analyse d'impact, saisine du
      délégué à la protection des données. *(§ 6)*

**Qualité et reproductibilité du produit**

- [ ] **R19 — La version du moteur de base de données n'est ni figée, ni écrite dans le
      paquet livré** ; deux paquets fabriqués à deux dates peuvent différer. *(§ 11)*
- [ ] **R20 — Pas d'outillage d'ingénierie, pas d'inventaire normalisé des composants tiers,
      accessibilité jamais auditée.** *(§ 12)*
- [ ] **R21 — Un échec de test signalé par la relecture du 25/07 n'a pas pu être reproduit ni
      identifié** ; il est déclaré plutôt que passé sous silence. *(§ 12)*
- [ ] **R22 — Le filet vert ne prouve pas l'absence de défaut.** Les 121 exécutions prouvent
      l'absence de régression sur ce qui est déjà testé ; sur les trois derniers lots, six
      défauts ont été introduits par les correctifs eux-mêmes. *(§ 14)*
- [ ] **R23 — Résidus mineurs déclarés** (feuille de route interne périmée, identifiants
      techniques hérités, chiffres rétractés subsistant dans un commentaire, forme du numéro de
      suivi non exigée à l'import). *(§ 13)*

**Décision de l'établissement sur les risques résiduels**

☐ Tous les risques ci-dessus sont acceptés en l'état.
☐ Les risques suivants doivent être traités avant la mise en service : ........................
☐ La mise en service est refusée en l'état.

Observations : ....................................................................................
....................................................................................................

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
5. **Le mode Officiel reste fermé pendant tout le pilote.** Les documents produits portent la
   mention de formation. L'ouverture ne peut résulter que d'une décision écrite prise au vu du
   § 7.
6. **Conditions matérielles** : poste chiffré, base hors dossier synchronisé, sauvegardes
   sorties du poste et vérifiées — voir `LIMITE-DE-RESPONSABILITE.md` § 4.
7. **Retour arrière possible à tout moment** (§ 9).

Responsable du pilote : ......................................  Suppléant : ......................

---

## 7. Critères de sortie du pilote

Chiffrés et vérifiables. Les valeurs sont à arrêter par l'établissement ; celles entre
parenthèses sont des propositions de l'auteur, non des décisions.

| N° | Critère | Comment on le mesure | Seuil retenu |
|---|---|---|---|
| C1 | Durée réelle du pilote | calendrier | .......... semaines *(≥ 6)* |
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
4. **Les documents déjà produits** portent la mention de formation tant que le mode Officiel
   n'a pas été ouvert : ils n'ont pas à être retirés d'un dossier réglementaire, n'y ayant pas
   leur place.
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
