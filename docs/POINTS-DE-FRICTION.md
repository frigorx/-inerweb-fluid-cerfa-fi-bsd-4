# Points de friction — inventaire des limites connues d'inerWeb Fluide

> **Établi le 26/07/2026** sur le dépôt `C:\git\inerweb-fluide`, branche `main`.
> **Dernier commit modifiant le code livré** : `2ca4aa0` (à revérifier par
> `git log -1 --format=%h -- server v8 outils`). Le numéro du dernier commit du dépôt
> **n'est pas écrit ici** : ce document et les trois autres pièces du dossier sont
> enregistrés **après** la version qu'ils décrivent, donc aucun numéro fixe ne tomberait
> juste. Il se relève à la lecture par `git log -1 --format=%h`. Chaque affirmation de
> ce document a été vérifiée dans le fichier qui la porte, et le fichier est cité avec sa
> ligne. Ce qui n'a pas pu être vérifié est écrit comme tel, à la place où on l'attendrait.
>
> **Complété le 26/07/2026** après relecture. Les points ajoutés portent un numéro
> **bis** ou **ter**, à la place que leur donne leur gravité : les numéros déjà cités
> ailleurs ne bougent pas.

---

## Pourquoi ce document existe, et ce qu'il ne fait pas

Le projet devait faire viser ses valeurs réglementaires par un organisme agréé
(dossier `docs/T3-DOSSIER-RELECTURE-EXTERNE.md`, onze questions écrites). L'auteur a
tranché le 26/07/2026 : cet avis n'arrivera pas, un organisme agréé délivre des
attestations et ne rend pas d'avis engageant. Le visa est donc remplacé par de la
**transparence documentée** : on écrit ce qu'on sait de ses propres limites, et on
demande à l'établissement d'accepter les risques qui restent, nommément.

**Ce document sert à deux choses, et pas à une troisième.**

1. Empêcher qu'on se fie au logiciel au-delà de ce qu'il prouve.
2. Obliger l'établissement à accepter les risques résiduels en connaissance de cause.

⚠️ **Il ne protège d'aucun contrôle.** Une limite de responsabilité protège l'auteur
du logiciel ; elle ne transfère **aucune** obligation réglementaire. L'obligation
F-Gas pèse sur le **détenteur** — l'établissement — quoi qu'écrive le logiciel et quoi
qu'écrive ce document. Écrire un défaut ne le corrige pas et ne le rend pas licite.

**Ce document n'est pas un avis juridique.** Son auteur n'est pas juriste. Il doit être
relu par la direction de l'établissement, et le cas échéant par un conseil.

**Une règle de lecture, valable pour tout ce qui suit.** Un point de friction qu'on
découvre après avoir lu ce document détruit la crédibilité de l'ensemble ; un point
qu'on y trouve déjà écrit rassure. Si un défaut réel manque à cette liste, c'est une
omission, pas une dissimulation : elle sera ajoutée.

**Avertissement particulier sur le filet de tests.** Le dépôt affiche « tout vert,
121 exécutions ». Cette phrase ne veut pas dire ce qu'elle a l'air de dire, et la
section 14 explique pourquoi : sur les trois derniers lots, **six défauts ont été
introduits par les correctifs eux-mêmes**, aucun n'était visible au filet. Lisez la
section 14 avant de tirer une conclusion d'un voyant vert.

**Classement.** Les points sont classés par **gravité réelle pour l'exploitation du
lycée**, pas par section d'audit ni par ordre alphabétique. Ce qui peut blesser en
premier est écrit en premier.

---

## 1. Aucune écriture n'est aujourd'hui soumise à un régime opposable

**Ce que c'est.** Le mode Officiel est verrouillé (`VERROU_LIVRAISON = true`,
`server/blocage-officiel.js:24` et son miroir `v8/js/data/blocage-officiel.js:31`).
Le seul mode d'écriture possible est donc le mode Formation. Or les dix-huit
conditions bloquantes de `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` ne sont évaluées
qu'à l'intérieur de `if (mouvement.mode === 'OFFICIEL')` : `server/api.js:4092`
(soumission) et `server/api.js:4394` (validation). L'aptitude de l'intervenant n'est
calculée qu'en un seul endroit, `verifierDroitIntervention` à `server/api.js:8793`,
dans `cadreFicheOfficiel` (`server/api.js:8747`), consommé par ces deux appels et par
la simulation `simulerValidationOfficielle` (`server/api.js:5309`), qui ne bloque rien.

**L'effet réel.** Une fiche `FORM-` qui déplace du fluide **réel** — c'est le cas
courant de l'atelier — n'est opposée ni à l'aptitude du signataire (condition 16), ni
aux signatures (conditions 14 et 15), ni au périmètre du CERFA (condition 18). Le
formule du relecteur externe est exacte : ce n'est pas « mouvement officiel, document
pédagogique », c'est **« mouvement réel, régime nul »**. La matière bouge, la
déclaration annuelle agrège ces masses (`server/declaration-annuelle.js` ne connaît
pas le mode), et aucune porte n'a été franchie.

**État.** Non corrigé. C'est l'état **déclaré** du produit, et c'est la raison même du
verrou. Établi par l'audit externe du 25/07 (constat interne A02,
`docs/TABLE-CONSTATS-AUDIT-2026-07-25.md`), reconnu et détaillé au § 3.2 de
`docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md`.

**Condition de réveil.** Le jour où le verrou s'ouvre. Il faudra alors décider ce qui,
dans une intervention réelle d'atelier, doit franchir les conditions bloquantes :
toutes les interventions quel que soit le mode de la fiche ? les seules fiches `FI-` ?
un régime intermédiaire qui oppose l'aptitude et les signatures sans exiger le CERFA
officiel ? **Cette décision appartient à l'auteur, détenteur du registre. Elle n'est
pas tranchée, et ce document ne la tranche pas.**

---

## 1 bis. L'exercice où aucun fluide n'a réellement bougé fait quand même bouger les stocks

**Ce que c'est.** Le registre n'a qu'une seule comptabilité de matière. Une écriture y
déplace des masses, quelle que soit la réalité de l'atelier. Or une part du travail
pédagogique consiste justement à faire les gestes **sans fluide** : un CERFA rempli à
blanc, une charge **simulée à l'azote**, un banc démonté. Dans ces cas, l'écriture n'a
aujourd'hui **aucun moyen de ne pas mentir aux stocks**. Le projet l'écrit lui-même au
§ 3.6 de `docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md` (lignes 370 à 377).

**L'effet réel, et il n'est pas théorique.** La charge simulée à l'azote est **une séance
du programme de cet établissement**, pas un cas d'école : c'est donc la situation
quotidienne de l'atelier, pas l'exception. Et l'effet ne s'arrête pas au registre
interne. **Ces masses entrent dans la déclaration annuelle faite à l'autorité** :
`server/declaration-annuelle.js` retient toute écriture `VALIDE` ou `ANNULE` de l'année
(ligne 78) et **ne connaît pas la notion de mode** — le mot « mode » n'apparaît nulle part
dans ce fichier. Une écriture de formation compte donc comme une autre.

**Le seul remède existant, et ce qu'il vaut.** L'annulation par contre-écriture ramène la
balance à zéro : les deux écritures se neutralisent, y compris dans la déclaration
annuelle. Mais le projet le dit lui-même — « nous ne prétendons pas que ce soit une
garantie **structurelle** — c'est une garantie de geste »
(`docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md:310`) : elle suppose que quelqu'un pense à la
faire, à chaque fois. Rien dans le logiciel ne l'impose ni ne la rappelle. Une
contre-écriture oubliée est une masse fausse qui reste.

**État.** Non corrigé, déclaré comme limite assumée dans la réponse au relecteur du 25/07,
qui demandait précisément l'avis d'un prochain auditeur sur ce point.

**Condition de réveil.** Immédiate et permanente, dès la première séance sans fluide. Elle
appelle une consigne écrite d'atelier — quand contre-écrire, qui le vérifie — et, à terme,
une décision de fond : soit le registre distingue enfin l'écriture qui déplace de la
matière de celle qui n'en déplace pas, soit toute séance sans fluide reste hors du
registre. **Cette décision n'est pas prise.**

---

## 1 ter. En dehors du CERFA, aucun document produit ne porte de marque de non-officialité

**Ce que c'est.** La mention « MODE FORMATION — DOCUMENT NON OFFICIEL — NE PAS UTILISER
POUR UNE INTERVENTION RÉELLE » existe (`v8/js/cerfa/generateur.js:93`), mais elle n'est
apposée **que sur le CERFA** : au cadre 14 des observations (`:538`) et en filigrane
diagonal sur la page (`:754`). **Dix-neuf autres documents sortent sans aucune marque.**

<a id="inventaire-documents-sans-marque"></a>

> ### Inventaire des documents qui sortent sans marque distinctive
>
> *Établi le 26/07/2026. Cette liste est reprise **à l'identique** dans les quatre pièces du
> dossier — `LIMITE-DE-RESPONSABILITE.md`, le présent inventaire,
> `docs/REGISTRE-DES-ARBITRAGES.md` et `docs/NOTE-DECISION-ETABLISSEMENT.md` — parce qu'elle
> porte une consigne : un document absent de la liste échapperait à la consigne.*
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

**Vérification par soi-même.** La commande ci-dessous couvre bien ce qui est affirmé — tout
`v8/js/`, et non le seul dossier `documents/` :

```
grep -rn "MENTION_FORMATION\|MODE FORMATION\|NON OFFICIEL\|non officiel" v8/js/ | grep -v "^v8/js/cerfa/"
```

Elle ne rend **rien**. La contre-épreuve est la même commande sans le filtre : elle rend
vingt lignes, toutes dans `v8/js/cerfa/`. Pour retrouver les imprimables eux-mêmes :
`grep -rn "window.print()" v8/js/ | grep -v "test-"` rend quinze lignes, dont trois sont des
commentaires — donc **douze** déclencheurs d'impression réels. Ce sont les onze premiers
imprimés de l'inventaire (n° 1 à 7 et 9 à 12), plus la notice de protection des personnes.
Le **certificat de scellement** (n° 8), n'y figure pas : c'est une
page HTML téléchargée, puis imprimée depuis le navigateur. *(Une version antérieure de ces
documents proposait `grep -r FORMATION v8/js/documents/` : trop étroite, des imprimables
vivent aussi dans `v8/js/views/`.)*

**Ce qui aggrave, et qui n'était écrit nulle part : le repère de mode disparaît justement à
l'impression.** À l'écran, le seul repère permanent du mode est le badge de l'en-tête, rempli
à « DÉMO / FORMATION » ou « LOCAL / FORMATION » (`v8/index.html:58`, posé par
`v8/js/app.js:628`, à l'intérieur du `<header id="entete">` de `v8/index.html:50`). Or la
feuille de style d'impression **masque cet en-tête** : `#entete { display: none !important; }`
dans le bloc `@media print` de `v8/css/coquille.css:392-399`. Les imprimés produits depuis
une modale d'aperçu vont plus loin encore : ils masquent **tout** ce qui n'est pas le
document lui-même (`body * { visibility: hidden; }`, par exemple
`v8/js/documents/fiche-identification-machine.js:348-352` ou `v8/js/views/bilan.js:498-500`).
**Le repère de mode existe à l'écran et disparaît sur le papier.** C'est un défaut du
logiciel, pas une imprécision de rédaction, et il n'est pas corrigé.

**L'effet réel.** Tant que le verrou est fermé, la mention du CERFA est **la seule chose qui
distingue à l'œil un document du logiciel d'un document réglementaire**. Un dossier
machine, une plaque F-Gas, une fiche d'identification posée sur une machine, une impression
portant le titre « Déclaration annuelle réglementaire — 11 rubriques » sont donc
indiscernables de leurs équivalents opposables, et rien n'empêche qu'ils se retrouvent dans
un classeur. Et l'unique repère qui aurait pu les trahir ne s'imprime pas.

**État.** Non corrigé. Aucun constat de `docs/TABLE-CONSTATS-AUDIT-2026-07-25.md` ne porte
ce point : il est ajouté ici parce qu'il a été trouvé, pas parce qu'on nous l'a signalé.

**Condition de réveil.** Avant toute séance produisant des documents destinés à sortir de
l'atelier. La fermeture est simple dans son principe — porter la même mention à tous les
documents produits hors mode Officiel, **et faire en sorte qu'elle survive à l'impression** —
mais elle n'est pas faite.

---

## 2. Le suivi interne de remise en filière ne remplace pas le bordereau de suivi de déchets

**Ce que c'est.** Le logiciel tient un « suivi interne de remise en filière » avec son
propre numéro (`SIF-AAAA-NNNN`). Ce n'est pas un bordereau de suivi des déchets
dématérialisé (Trackdéchets). Le commentaire du schéma le dit depuis l'origine :
`server/schema.sql:458-459`, « il ne remplace PAS Trackdéchets ». Aucun pont
Trackdéchets n'existe ; il est différé en version 2 dans `docs/ROADMAP.md`.

**L'effet réel.** L'établissement est **producteur réel de déchets fluorés, voire
chlorés** — l'auteur a confirmé la présence d'une bouteille de R-22 à mettre en
réforme. L'obligation du bordereau dématérialisé pèse donc réellement, et le logiciel
ne la remplit pas. Ce n'est pas un cas d'école : c'est une obligation extérieure au
logiciel qui reste entière.

**État.** Non corrigé, et non corrigeable par ce logiciel dans son périmètre actuel.
Ce qui a été fait en juillet 2026 (lot B2) est de **cesser de laisser croire le
contraire** : plus aucun écran ni document produit ne porte le nom du document
réglementaire, une mention permanente le rappelle, elle voyage jusque dans le sommaire
du dossier d'audit scellé, et le cadre 11 du CERFA ne reçoit plus que le numéro d'un
bordereau officiel réellement reporté.

**Condition de réveil.** Immédiate, et hors logiciel : la démarche Trackdéchets se fait
en dehors d'inerWeb Fluide, dès qu'un déchet part. Le champ « bordereau externe » du
logiciel sert à y reporter le numéro officiel une fois obtenu.

---

## 2 bis. La surcharge de réemploi est signalée, jamais bloquée — mode Officiel compris

**Ce que c'est.** Le fluide récupéré sur une machine peut être réemployé sur **cette
machine**, sans retraitement. Le logiciel tient donc un avoir par machine d'origine. Quand
on réintroduit **plus** qu'on n'avait récupéré, il y a surcharge de réemploi : de la
matière apparaît sans origine. Le logiciel la **signale** — une alerte `alr-reemploi-…`
(`server/api.js:1668`, miroir `v8/js/data/demo-store.js:2976`) et une mention portée au
cadre 14 du CERFA (`v8/js/cerfa/generateur.js:286`) — mais il **ne bloque rien**.

**Ce n'est pas un défaut, c'est une décision.** Elle est expresse, datée du 22/07/2026, et
écrite dans le code lui-même : « La surcharge est SIGNALÉE, jamais bloquée (décision
Franck 22/07, tous modes — Officiel compris) » (`v8/js/cerfa/generateur.js:96-100`). Le
motif est d'atelier : un blocage obligerait à rectifier une réalité constatée, alors qu'un
signalement l'écrit. Elle est consignée au registre des arbitrages
(`docs/REGISTRE-DES-ARBITRAGES.md`, ligne « surcharge de réemploi »).

**L'effet réel.** Un **écart de matière peut être validé** sur une fiche opposable le jour
où le verrou s'ouvrira. Il est écrit sur le document, ce qui est le contraire d'un
silence — mais il est écrit, pas empêché. L'établissement doit donc accepter nommément que
son registre puisse porter une fiche valide comportant un écart de matière assumé.

**État.** Délibéré, non contesté, non refermé — et il n'est pas prévu de le refermer.

**Condition de réveil.** À la première surcharge réellement constatée, et de toute façon à
l'ouverture du mode Officiel : c'est le moment où la mention passe d'un document
pédagogique à une pièce opposable.

---

## 3. Le poste n'est ni chiffré, ni sauvegardé hors site, et la restauration n'a jamais été testée

**Ce que c'est.** Trois gestes qui relèvent de l'établissement et qu'aucune ligne de
code ne peut faire à sa place : chiffrer le disque du poste et les supports de
sauvegarde, déposer une copie hors site, et vérifier une fois par an qu'une
restauration fonctionne réellement.

**L'effet réel.** Un poste volé ou un disque mort emporte le registre réglementaire et
les données personnelles qu'il contient — y compris celles d'élèves mineurs. Le
logiciel sait chiffrer une archive de sauvegarde par phrase de passe (AES-256-GCM,
`SECURITE.md:181`) et `SAUVEGARDE.md` décrit la règle des trois copies ainsi que le
test annuel de restauration (`SAUVEGARDE.md:138` et `:171`) — mais **rien ne prouve
que ces gestes soient faits**, et le logiciel ne peut pas le prouver.

**État.** Hors code. Non contesté par le projet (constats internes A11 et A12).

**Condition de réveil.** Avant toute mise en service réelle, et à re-vérifier chaque
rentrée. Le test de restauration doit être fait **une fois au moins** avant de se
reposer sur le dispositif : une sauvegarde qu'on n'a jamais restaurée n'est pas une
sauvegarde, c'est une hypothèse.

---

## 4. Un seul poste, et une seule personne qui sait pourquoi chaque garde existe

**Ce que c'est.** Le registre vit sur un poste unique. Et — c'est le vrai risque —
l'architecture, les arbitrages et la raison d'être de chaque garde ne sont connus que
d'une seule personne. Sur 421 enregistrements de l'historique du dépôt, 408 portent le
nom de l'auteur (`git log --format='%an' | sort | uniq -c`).

**L'effet réel.** Le point de défaillance matériel est réel mais se traite par la
sauvegarde. Le point de défaillance **humain** ne se traite par aucun correctif :
en cas d'absence prolongée de l'auteur, plus personne ne sait pourquoi une règle est
écrite comme elle l'est, ni ce qu'une modification casserait. Le dépôt contient
beaucoup de documentation — `docs/CARTE-CODE.md`, les plans de lot, un `CHANGELOG.md`
très détaillé — mais lire n'est pas savoir.

**État.** Non corrigé, et aucun correctif logiciel ne le fermera.

**Les autres risques d'exploitation du même constat, qui ne se réduisent pas au poste
unique.** Le constat interne A30 est libellé « horloge, disque plein, antivirus,
**migration interrompue**, poste unique » (`docs/TABLE-CONSTATS-AUDIT-2026-07-25.md`,
ligne 79) et il est accepté tel quel, la garde d'exploitation devant figurer à la
procédure d'ouverture. Ce document ne retenait au départ que le poste unique ; les autres
sont écrits ici, et la migration interrompue mérite d'être détaillée :

- **Migration interrompue.** Les migrations de base sont jouées au démarrage, **une par
  une, chacune dans sa propre transaction** (`server/migrations.js:1738-1769`), et
  `server/db.js:159` les lance **sans copie de sauvegarde préalable**. Une migration qui
  échoue est bien annulée seule, sans dégât. Mais une coupure de courant, un disque plein
  ou un arrêt forcé **entre deux migrations** laisse la base à une version intermédiaire :
  un registre **à moitié converti**, cohérent au sens de la base mais pas au sens du
  contrat. Le seul retour arrière est la restauration d'une sauvegarde — c'est-à-dire le
  point 3, celui qui n'a jamais été testé.
- **Horloge du poste.** Les dates et les échéances réglementaires sont calculées sur
  l'horloge de la machine. Une horloge fausse produit des échéances fausses, sans alerte.
- **Disque plein.** Il frappe l'écriture de la base, les sauvegardes et le témoin de
  scellement quotidien au même moment.
- **Antivirus.** Un antivirus d'établissement peut mettre en quarantaine un exécutable ou
  un fichier de base : le logiciel ne démarre plus, ou démarre sur une base incomplète.

**Condition de réveil.** Permanente. Elle appelle une décision d'organisation, pas de
code : au minimum une seconde personne de l'établissement capable de restaurer une
sauvegarde et de produire un dossier d'audit, une consigne écrite de ce qu'il ne faut pas
modifier, et **une sauvegarde prise avant toute mise à jour du logiciel**.

---

## 5. L'ancien service Google est peut-être toujours en ligne, et ses clés sont publiques pour toujours

**Ce que c'est.** La version 7 du logiciel s'appuyait sur un classeur Google Sheets et
un déploiement Apps Script. Trois clés d'accès ont été publiées dans un dépôt **public**
du 08/03/2026 au 02/07/2026, soit 116 jours, et **elles y sont encore aujourd'hui** :
retirer une valeur du code courant ne la retire pas de l'historique.
Établi commande par commande dans `docs/P0-9-REVOCATION-CLES-V7.md` § 1.

**L'effet réel.** Tant que le déploiement Apps Script reste actif, ces clés commandent
un accès réel à des données réelles. La v7 est abandonnée depuis le 25/07/2026, mais
l'abandon du code n'éteint pas le service.

**État.** Hors code, non clos. La voie retenue n'est plus de régénérer les clés mais de
**désactiver le déploiement** — geste plus simple et définitif, décrit au § 0 du même
document. Il n'est pas fait, ou du moins rien dans le dépôt ne prouve qu'il l'est : ce
geste se passe sur le compte Google de l'auteur, où un assistant ne se connecte pas.

**Condition de réveil.** Immédiate. Tant que le procès-verbal du § 4 de
`docs/P0-9-REVOCATION-CLES-V7.md` n'est pas daté et signé, il faut considérer
l'exposition comme active.

---

## 6. Aucune gouvernance de protection des données n'est en place

**Ce que c'est.** Le logiciel traite des données personnelles, dont celles d'élèves
mineurs. Le responsable de traitement est l'établissement, pas l'auteur
(`RGPD.md:13`). Quatre choses manquent : la saisine du délégué à la protection des
données de l'académie, l'inscription au registre des activités de traitement
(article 30), la décision motivée sur l'analyse d'impact, et l'information formelle
des élèves et des familles.

**L'effet réel.** Le dossier documentaire existe et il est prêt : `RGPD.md`,
`SECURITE.md`, et une note de saisine rédigée mot pour mot au § 3 de
`docs/T3-DOSSIER-RELECTURE-EXTERNE.md` avec six questions au délégué. **Il n'a pas été
envoyé.** Un dossier prêt n'est pas un dossier déposé, et une saisine envoyée par un
enseignant seul, sans le couvert du chef d'établissement, n'engage rien.

**État.** Hors code. Non contesté (constats internes A16 et A17). Un seul volet a été
corrigé côté logiciel : la notice affichée dans l'application promettait un hébergement
« Cloud UE » qui n'existe pas ; la promesse est retirée, et une suite automatique
(`outils/test-promesses-cloud.mjs`) interdit son retour.

**Condition de réveil.** Avant toute utilisation avec des élèves réels. Le logiciel ne
doit pas s'auto-exempter d'analyse d'impact : la lecture du projet (« pas de données
sensibles, pas de profilage, périmètre limité à un atelier ») est une **proposition
soumise au délégué**, jamais une décision.

---

## 7. Les valeurs réglementaires codées n'ont reçu aucun visa externe

**Ce que c'est.** Onze points réglementaires sont codés de façon délibérément
conservatrice, en attendant une confirmation qui n'est jamais venue. Ils sont listés
un par un au § 2.3 de `docs/T3-DOSSIER-RELECTURE-EXTERNE.md` : seuils d'aptitude
3 kg / 6 kg à frontière stricte, lecture de l'ancienne catégorie II de l'arrêté du
13/10/2008, mécanique de transition vers le régime de l'arrêté du 21/11/2025, seuils
et fréquences de contrôle d'étanchéité, condition de l'allègement pour détection
permanente, seuils d'exemption des équipements hermétiques, seuil bas HCFC (2 kg ou
3 kg), règle du potentiel de réchauffement le plus élevé en cas de valeurs
concurrentes, refus du CERFA officiel pour les fluides non fluorés, absence de
mécanisme de dérogation, et la question d'ensemble.

**L'effet réel.** Le sens de l'erreur est maîtrisé — la doctrine du projet est « jamais
moins de contrôles qu'exigé », donc une valeur fausse déclenche des contrôles trop tôt
plutôt que trop tard. Mais **cela ne garantit pas la justesse**, et cela ne dit rien
d'une valeur qui serait fausse dans l'autre sens sans qu'on l'ait vu. Aucun tiers n'a
relu ces lectures de texte.

**État.** Non corrigé, et désormais non corrigeable par la voie prévue : la demande de
visa est abandonnée. Une valeur particulière reste explicitement rouverte par le
projet lui-même : le potentiel de réchauffement du R-455A, retenu à 148 par précaution
alors que la valeur officielle discutée est 146 (fiche du fluide portant la mention
« AR4 — 148 conservatoire (réserve DGPR) »).

**Condition de réveil.** À chaque évolution réglementaire, et à la première occasion
où un interlocuteur qualifié serait disponible — le dossier des onze questions reste
prêt à l'emploi. Aucune date manquante du calendrier F-Gas (fin du sursis des fluides
recyclés et régénérés, palier de 2032) ne sera codée sans lecture du texte applicable.

---

## 7 bis. L'import accepte un PRP aberrant, et le PRP commande toutes les fréquences de contrôle

**Ce que c'est.** Le potentiel de réchauffement (PRP) est la valeur qui convertit une
charge en kilogrammes en tonnes équivalent CO₂ ; c'est donc **lui qui décide de la
fréquence du contrôle d'étanchéité** de chaque machine (voir le § 4 de
`docs/REGISTRE-DES-ARBITRAGES.md`). À la saisie, le formulaire des fluides refuse un PRP
absent ou négatif : « PRP obligatoire : nombre positif ou nul »
(`v8/js/modales/fluide-form.js:240-244`). **L'import d'un registre ne passe pas par cette
garde** : `importerJSON` réécrit la table des fluides par un `INSERT OR REPLACE` qui reprend
la valeur du fichier telle quelle, sans jamais l'examiner (`server/api.js:6285-6316`). Un
R-404A importé à 39 au lieu de 3922 entre dans la base et sort du seuil de contrôle.

**Ce n'est pas une découverte : c'est déclaré.** Le journal des versions l'écrit noir sur
blanc à la fin du lot P1-2 : « l'import accepte toujours un PRP aberrant (comportement
ANTÉRIEUR à cette brique : durcir l'import risquerait de bloquer la restauration d'une
sauvegarde légitime) » (`CHANGELOG.md:905-907`). Le motif est réel — une garde trop raide
empêcherait de rapatrier son propre historique — mais il ne referme pas la porte.

**L'effet réel, et il est le plus large de tout ce document.** Le PRP ne se contente pas de
s'afficher : il commande la conversion en tonnes équivalent CO₂, donc le niveau
réglementaire, donc la fréquence (12 / 6 / 3 mois), donc les échéances, donc les alertes, et
donc l'obligation de détection permanente au seuil haut. Une seule valeur fausse entrée par
un import **allège silencieusement tout un parc**. C'est exactement le sens d'erreur que la
règle générale du projet — « le doute retire l'allègement, jamais l'obligation » — prétend
interdire partout ailleurs.

**Ce qui a été refermé à côté, et qui montre que la porte-ci reste ouverte.** Le même lot a
corrigé le cas voisin : un PRP négatif ressortait « impact FAIBLE », rassurant à tort ;
`impactDepuisPrp` rend désormais `null` (`CHANGELOG.md:897-900`). Et la doctrine « une clé
absente ne vaut pas décision » a été appliquée au champ mitoyen `actif`, pour qu'un export
antérieur ne ressuscite pas un fluide désactivé (`server/api.js:6304-6312`). Les deux gardes
sont posées **autour** du PRP ; le PRP lui-même n'en a aucune.

**État.** Défaut déclaré, **volontairement non corrigé**. Aucun correctif n'est prévu à ce
jour.

**Condition de réveil.** À la première restauration d'une sauvegarde ou à la première reprise
d'un registre antérieur, c'est-à-dire au geste même que la porte ouverte sert à ne pas
gêner. La fermeture honnête n'est pas un refus sec — ce serait empêcher une restauration
légitime — mais un **signalement** : comparer chaque PRP importé à la valeur du référentiel
validé et lever une anomalie à l'écart. Elle n'est pas faite.

---

## 8. Le mode Officiel n'a jamais tourné en production

**Ce que c'est.** Le parcours officiel de bout en bout — passage en officiel,
soumission, signatures, validation, CERFA, scellement — n'a jamais été exécuté sur la
version livrée, dans les conditions réelles du poste.

**L'effet réel.** Il existe une répétition générale
(`outils/repetition-generale-officiel.mjs`), qui ouvre le verrou dans une copie et
n'est jamais jouée en production. Elle prouve que le chemin fonctionne dans un
environnement de test ; elle ne prouve pas qu'il fonctionne sur le poste du lycée, avec
sa base réelle, son antivirus, son horloge et son disque.

**État.** Non corrigé, non contesté (constats internes A15 et A29).

**Condition de réveil.** Au moment de l'ouverture du verrou, et **avant** de se reposer
sur le registre : une recette réelle sur le poste cible, plus un fonctionnement en
parallèle du papier de deux à quatre semaines sans écart constaté. C'est le critère de
sortie que le projet s'impose à la place du visa.

---

## 9. Le témoin d'intégrité se recalcule, et le modèle de menace s'arrête à l'accès disque

**Ce que c'est.** Trois limites qui vont ensemble et qu'aucun correctif ne fermera.

- **Le témoin de tête du journal se recalcule.** L'algorithme est dans le code, et le
  code est diffusé. Le témoin arrête une purge faite à la main ; il n'arrête pas
  quelqu'un qui régénère le témoin après coup. Consigné dans `CHANGELOG.md:575-578`
  avant même l'audit externe.
- **La parade identifiée n'est pas faite.** Elle consiste à confronter le journal au
  témoin de scellement externe quotidien, qui vit hors du fichier de base. Le témoin
  **est écrit** (`server/scellement-externe.js`), mais rien ne le confronte à quoi que
  ce soit : le module le dit lui-même, « AUCUNE vérification de chaîne ici […] le
  témoin CONSTATE, il ne juge pas » (`server/scellement-externe.js:18-19`).
- **Pas d'ancrage tiers ni d'horodatage qualifié.** Par défaut, le témoin quotidien
  est écrit dans un dossier voisin de la base, sur la même machine
  (`server/scellement-externe.js:41` renvoyant vers `server/sauvegarde.js:71-73`). Il
  peut être redirigé vers un espace synchronisé, ce qui le fait sortir du poste — mais
  cela reste un réglage, pas une garantie, et ce n'est pas un ancrage chez un tiers.

**L'effet réel.** Qui a la main sur le fichier de base peut le remplacer, avec ses
témoins et ses sauvegardes. Les défenses du logiciel visent le **canal applicatif** :
elles empêchent d'écrire une fausseté par l'application. Elles n'empêchent pas de
réécrire l'ensemble depuis le disque. Le modèle de menace du logiciel s'arrête là, et
il faut le savoir avant de présenter le registre comme inaltérable.

**État.** Non corrigé, consigné avant l'audit externe et confirmé par lui (constat
interne A13). Le mot « inaltérable » est employé dans la documentation du projet : il
signifie « inaltérable par l'application », jamais « inaltérable par un administrateur
du poste ». **Et il n'est pas toujours qualifié.** `README.md:42` le borne correctement
(« inaltérable **au sein de l'application** », avec le renvoi au chiffrement du disque) ;
mais `index.html:243` porte le titre nu « Registre inaltérable », et `RGPD.md:107` comme
`v8/js/views/rgpd.js:56` emploient le mot sans réserve. Ces trois emplois-là peuvent faire
prendre le registre pour ce qu'il n'est pas.

**Condition de réveil.** Le jour où le registre doit résister à une contestation
sérieuse, ou dès qu'un tiers accède au poste. La fermeture demande un lot dédié
(confrontation au témoin externe) puis, pour un vrai ancrage, un service
d'horodatage tiers — hors périmètre du projet à ce jour. Les trois emplois non qualifiés
du mot « inaltérable », eux, se corrigent à la relecture des écrans et des notices.

---

## 9 bis. Le rapprochement de matière sous-détecte le jour même d'une remise en filière

**Ce que c'est.** Quand une bouteille part en filière déchets, le logiciel fige un repère
de masse et compare ensuite la masse réelle de la bouteille à ce que le registre explique.
Les dates du registre sont **au jour près**, le repère est figé **à l'instant** de la
remise. À date **égale** au repère, le logiciel ne retient donc que les contributions
**positives** — celles qui expliquent un gain — et écarte les négatives :
`contributionRetenue`, `v8/js/data/remise-filiere.js:251-257`, dont la dernière ligne est
`return contribution > 0 ? contribution : 0;`.

**Pourquoi c'est écrit ainsi.** Le choix est délibéré et documenté au même endroit
(lignes 226 à 250), ainsi que dans le `CHANGELOG.md` — passe de vérification finale du lot
B2, 26/07/2026 : « **le prix est une sous-détection du jour de la remise** ; le prix
inverse est une accusation écrite et fausse ». Le
comportement d'avant recomptait ces écritures et inventait un gain : le logiciel écrivait
« aucune écriture du registre ne l'explique » d'une opération valide — un regroupement de
déchets suivi de la remise le jour même — et l'accusation remontait au feu tricolore et au
guide d'audit. La doctrine retenue est « le doute retire l'accusation, jamais
l'obligation ».

**L'effet réel, qui n'est pas nul.** Une écriture sortante datée du jour de la remise
n'est pas retranchée de la masse attendue. Si, le même jour, la bouteille est **regonflée
d'autant sans écriture**, l'écart se compense et **aucune alerte ne se déclenche**. Le
contre-tir est vérifié et vrai — une re-inflation seule, sans écriture sortante du même
jour, reste dénoncée — mais la combinaison, elle, passe. C'est un trou dans le
rapprochement de matière, c'est-à-dire dans la fonction même d'un registre de traçabilité.
Sa portée est bornée à **une seule journée par remise**, celle du repère.

**État.** Délibéré et assumé, écrit dans le code et au journal des versions. Aucun des
deux réglages possibles n'est sans prix : celui-ci sous-détecte, l'autre accuse à tort.

**Condition de réveil.** Le jour où le registre doit servir de preuve dans une
contestation portant sur des masses. La fermeture propre suppose des dates **horodatées**
et non plus au jour près, ce qui touche au format des écritures scellées : hors périmètre
d'un correctif.

---

## 9 ter. Rétrograder un équipement mobile en fixe laisse un dossier de fuite réputé clos

**Ce que c'est.** Le cycle d'une fuite impose de recontrôler **après** la réparation : le
logiciel exige un contrôle conforme strictement postérieur au jour de la réparation
(`v8/js/data/dossiers-fuite.js:99-109`). Une exception vise les équipements **mobiles
listés**, admis au contrôle le jour même (`v8/js/data/equipement.js:298-302`, liste fermée
de cinq sous-types). Or le statut de la machine est une colonne **stockée**, recalculée
seulement à l'enregistrement ou à l'annulation d'un contrôle
(`recalculerEffetsMachineApresAnnulation`, `server/api.js:7051-7079`). `updateMachine`
(`server/api.js:3280`) écrit le type d'installation et le sous-type **sans jamais relancer
ce calcul**. Une machine mobile listée dont la fuite a été close le jour même, puis
repassée en FIXE par une simple correction de fiche, garde donc son statut figé à
`EN_SERVICE` — alors que la règle applicable à un équipement fixe dirait l'épisode encore
ouvert.

**Ce n'est pas une découverte : c'est déclaré.** Le journal des versions le consigne à la
revue adversariale du lot P1-1 : « **Consigné, non corrigé (antérieur à P1-1, hors
périmètre)** : rétrograder un MOBILE listé en FIXE *après* une clôture immédiate laisse
`machine.statut` figé à EN_SERVICE […] limitation d'architecture existante depuis la
migration 27, à traiter avec le modèle de statut de P0-6, pas ici »
(`CHANGELOG.md:805-809`).

**L'effet réel.** Il est borné mais il touche une fonction réglementaire : le suivi d'une
fuite. Une machine peut apparaître « en service » au tableau de conformité alors que la
règle qui lui est désormais applicable n'a pas été satisfaite. Il faut une correction de
fiche après coup pour l'obtenir, ce qui n'est ni fréquent ni impossible — une case de type
d'installation cochée à la légère puis rectifiée suffit.

**État.** Déclaré, non corrigé, rattaché à un chantier ultérieur (modèle de statut).

**Condition de réveil.** À la première rectification du type d'installation d'une machine
ayant connu une fuite. En attendant, le contrôle se fait à l'œil : un changement de
FIXE / MOBILE sur une machine à historique de fuite mérite une relecture du dossier de
fuite correspondant.

---

## 10. Déni de service sur la connexion

**Ce que c'est.** Le calcul de vérification du mot de passe est volontairement coûteux
(`scrypt`, N = 131072, `server/comptes.js:43`) et il est **synchrone** : il occupe le
seul fil d'exécution du serveur. La route de connexion n'a **aucune limitation de
débit** — la recherche des motifs correspondants dans `server/*.js` ne rend rien. Le
verrouillage existe mais porte sur le compte, pas sur l'origine : changer d'identifiant
à chaque tentative l'évite.

**L'effet réel.** Mesuré, pas supposé : de l'ordre de deux dixièmes de seconde par
tentative, et sous un flux soutenu de quelques connexions en parallèle, une route
légère qui répondait en moins d'une milliseconde passe à plus de deux secondes en
continu. Protocole de mesure reproductible au § 4 de
`docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md`.

**État.** Confirmé, mesuré, **non corrigé, assumé**. Le serveur n'écoute que sur la
boucle locale par défaut (`server/serveur.js:66`, `LAN_ACTIF` faux sans la variable
`IWF_LAN=1`), ce qui limite aujourd'hui l'attaque à quelqu'un physiquement assis au
poste — lequel dispose de leviers plus simples.

**Condition de réveil.** Nette et non négociable : **avant** toute activation du mode
réseau local, jamais après. Le jour où le logiciel écoute sur le réseau du lycée, ce
défaut devient exploitable par n'importe quel poste de l'établissement.

---

## 11. Le paquet livré ne dit pas quelle version du moteur de base de données il embarque

**Ce que c'est.** Le logiciel s'appuie sur `node:sqlite`, module intégré à Node. Un
plancher est contrôlé au démarrage (Node 22 ou plus récent, `server/serveur.js:29-33`)
mais aucune version n'est figée. Le générateur de paquet embarque le `node.exe` de la
machine de fabrication et se contente d'**afficher** sa version à la console
(`outils/fabriquer-paquet.mjs:105`) : elle n'est écrite dans aucun fichier du paquet.

**L'effet réel.** Deux paquets fabriqués à deux dates portent potentiellement deux
moteurs SQLite différents, et rien dans le paquet ne permet de savoir lequel. Pour un
registre dont la valeur repose sur la reproductibilité, c'est un maillon non tracé.

**État.** Exact, non traité (constat interne A24).

**Condition de réveil.** À la première livraison destinée à être conservée comme
référence — livraison au lycée, ou envoi à un contrôleur. Il faudra alors figer la
version et l'écrire dans le paquet, à côté de l'empreinte SHA-256 déjà produite.

---

## 12. Ce que le dernier audit a laissé ouvert et qui n'a pas été traité

Repris de `docs/TABLE-CONSTATS-AUDIT-2026-07-25.md`, lignes « non traité », « assumé »
et « hors code ». Aucun de ces points n'a d'**effet connu** sur la valeur probante du
registre — c'est le motif écrit pour lequel ils ont été laissés — mais ils sont réels.

⚠️ **« Connu » n'est pas « nul », et la dernière ligne du tableau le montre.** L'un de ces
points est un échec de test que **nous ne savons pas identifier**. On ne peut pas affirmer
d'un défaut inconnu qu'il est sans effet : tant qu'il n'est pas nommé, sa portée est
inconnue, pas nulle.

| Point | Ce que c'est | État | Condition de réveil |
|---|---|---|---|
| **Outillage d'ingénierie absent** (A22) | Aucun analyseur statique, aucun typage, aucune intégration continue. Vérifié : ni `package.json`, ni fichier de configuration d'analyseur, ni dossier `.github` à la racine du dépôt. | Exact, non traité | À l'arrivée d'un second contributeur, ou dès que le filet cesse d'être joué à la main avant chaque fusion |
| **Inventaire des composants tiers non formalisé** (A20) | Aucun inventaire normalisé des composants et de leurs versions, aucune politique de mise à jour. Vérifié : aucun fichier d'inventaire normalisé dans le dépôt. `LICENCES-TIERCES.md` existe et a été corrigé, mais ce n'est pas un inventaire technique versionné. | Confirmé, partiellement corrigé | Avant diffusion à d'autres établissements, ou à la première alerte de sécurité sur une bibliothèque embarquée |
| **Accessibilité non auditée** (A27) | Aucun audit d'accessibilité ni d'ergonomie n'a été mené. Le public comprend des élèves, dont certains en difficulté de lecture. | Exact, non traité | Avant tout usage imposé à des élèves, et de toute façon au titre des obligations d'accessibilité d'un établissement public |
| **Duplication volontaire des deux implémentations** (A21) | Le même contrat est écrit deux fois (serveur et navigateur). La fusion est **délibérément différée** : la parité entre les deux sert aujourd'hui d'instrument de vérification. | Exact, assumé | Après la simulation d'audit. On ne jette pas l'instrument avant la mesure |
| **Vocabulaire de preuve trop ambitieux** (A25) | L'emploi de termes de preuve est légitime en interne, discutable sur quelques libellés d'écran. | Exact pour partie, arbitrage laissé à l'auteur | À la relecture des écrans avant mise en service |
| **Double signature plus large que le minimum réglementaire** (A26) | Le logiciel exige deux signatures là où le texte n'en demande peut-être qu'une. | Exact et **délibéré** (doctrine « jamais moins de contrôles qu'exigé ») | Ne se matérialise pas au lycée, où le professeur signe par délégation. Se matérialiserait chez un tiers |
| **Un échec de test non reproduit** (A28) | L'auditeur a constaté seize échecs sur le paquet qu'il avait reçu. Quinze ont été reproduits et expliqués. **La seizième nous échappe, et nous ne savons pas laquelle c'est.** | Déclaré, non résolu | Si l'auditeur nomme la suite, elle sera instruite |

---

## 13. Résidus déclarés — petits, mais nommés plutôt que laissés à trouver

- **Le coffre des identités n'a pas de seconde barrière dans `signatures.csv`.** Ce
  fichier du dossier d'audit scellé est le seul où entre un nom de signataire, et le
  nom figé y sort tel quel pour toute signature détenteur, ainsi que pour une signature
  technicien sur une fiche sans intervenant déclaré. Ce n'est **pas** fermable à peu de
  frais : au moment de produire le dossier, le vrai nom d'une personne mise au coffre
  n'existe plus en clair, donc rien ne permet de reconnaître qu'un nom figé lui
  appartient. Les trois contournements envisagés ont été écartés — se rabattre sur la
  session inventerait un nom, masquer au moindre doute retirerait une preuve. La seule
  fermeture honnête est une migration reliant chaque signature à une fiche du
  personnel, et elle ne remplirait pas le passé. Consigné au § 8 de
  `docs/PLAN-B3-SIGNATURE.md`, résidu 1. **Décision en attente de l'auteur.**
- **Le témoin de session n'entre pas dans l'empreinte scellée.** L'identité de la
  session qui a posé une signature est captée, affichée et exportée au dossier
  d'audit — c'est la seule information qu'un utilisateur ne peut pas saisir lui-même —
  mais elle **n'est pas protégée par le chaînage d'empreintes**. L'y intégrer exigerait
  une troisième version du calcul d'empreinte, ce que la règle du dépôt interdit.
  Consigné au § 8 de `docs/PLAN-B3-SIGNATURE.md`, résidu 2. **Décision en attente de
  l'auteur.**
- **Un refus nouveau s'applique aussi aux registres déjà écrits.** Depuis le lot B3,
  une zone de signature restée rigoureusement vierge est refusée, et ce contrôle est
  rejoué **à chaque lecture**, pas seulement à la pose — c'est ce qui ferme la porte de
  l'import. Conséquence vérifiée : un registre existant contenant une case blanche
  s'importe toujours (rien n'est refusé à l'entrée, la chaîne d'empreintes reste
  valide, aucune masse ne bouge), mais **cette signature retombe sur « absente »** et
  les conditions 14 et 15 lui seraient opposées en mode Officiel. Ce refus est
  explicitement identifié comme demandant un visa avant d'être considéré comme acquis
  (§ 6 de `docs/PLAN-B3-SIGNATURE.md`).
- **Certains formats d'image ne sont pas jugés.** Un fichier PNG entrelacé, ou de
  profondeur inférieure à huit bits, n'est pas évalué : la réponse est
  « indéterminable », et le doute profite au signataire. Un dessin fait dans
  l'application n'en produit jamais ; un fichier importé, si. Consigné au § 8 de
  `docs/PLAN-B3-SIGNATURE.md`, résidu 3, sans action proposée.
- **Des chiffres rétractés survivent dans un commentaire.**
  `v8/js/data/signatures-mouvement.js`, lignes 20-21, cite encore « canvas vierge
  5 562 o, un seul trait 6 518 o ». Ces valeurs ont été rétractées le 26/07 : elles
  n'étaient reproductibles par rien. Les chiffres publiés aujourd'hui sont ceux que
  produit `node outils/test-taille-signature.mjs`. Le miroir serveur
  (`server/signatures-mouvement.js`) ne porte pas ces valeurs : le résidu est dans le
  seul fichier du navigateur.
- **La feuille de route interne est périmée.** `docs/ROADMAP.md` porte encore « État
  (13/07/2026) » (ligne 20) et range parmi les briques « à ne pas coder avant
  validation » le mode Officiel bloquant et les habilitations, qui sont codés depuis.
  Un lecteur qui s'y fierait se tromperait de treize jours et de plusieurs lots. La
  source de vérité est `CHANGELOG.md`, dernier incrément en tête.
- **Des identifiants techniques hérités portent encore l'ancien nom.** Méthode
  `createBsff`, table `bsff`, champ `numeroBsff`. Ils ne sont **jamais affichés** ; les
  renommer imposerait une migration sur des écritures scellées pour un gain nul.
  Déclaré d'emblée pour qu'une recherche dans le code ne donne pas l'impression d'une
  dissimulation.
- **Une exigence de forme n'est volontairement pas appliquée à l'import.** Le numéro de
  suivi interne doit respecter la forme `SIF-AAAA-NNNN` quand il passe par
  l'application, mais **seule l'unicité** est exigée à l'import d'un registre
  antérieur. C'est une décision, pas un oubli : refuser la forme à l'import
  interdirait de rapatrier son propre historique.
  *(Le troisième résidu d'import, lui, n'est pas mineur : l'import accepte un **PRP
  aberrant**. Il a sa propre section, le § 7 bis.)*
- **Le bouton « Exporter une sauvegarde » reste offert à l'écran à des rôles qui n'y ont
  plus droit.** La modale de sauvegarde affiche l'action sans aucun contrôle de rôle
  (`v8/js/app.js:502-506`, ouverte depuis `v8/js/app.js:121`) ; côté serveur, `exporterJSON`
  est réservé aux rôles référent, enseignant et administrateur (`server/api.js:691`, liste
  `server/api.js:567`), et refuse en 403 tout autre rôle. **Il n'y a donc aucun effet
  probant** : rien ne fuit, le refus tient. C'est un bouton mort, pas un trou. Il est
  déclaré ici pour une raison précise : il est écrit au journal des versions
  (`CHANGELOG.md:581-582`, « l'écran devrait le masquer ») **trois lignes sous la référence
  `CHANGELOG.md:575-578` vers laquelle `LIMITE-DE-RESPONSABILITE.md` § 2 b) envoie déjà le
  lecteur**. Qui suit ce renvoi le trouvera ; mieux vaut qu'il l'ait lu ici d'abord.

---

## 14. La leçon de méthode : le filet vert ne prouve pas l'absence de défaut

Cette section est écrite noir sur blanc parce qu'elle est vraie, et parce qu'elle
change la façon de lire tout le reste.

Le dépôt affiche « tout vert, 121 exécutions » (chiffre de `docs/CARTE-CODE.md:35`).
**Ce chiffre a été rejoué le 26/07/2026 pour la rédaction de ce document**, par
`node outils/lancer-tests.mjs --tout` : résultat « TOUT VERT — 121 exécutions ».
La **durée** est de l'ordre de **100 secondes** — 96,8 s, 97,9 s et 98,8 s à trois mesures
du même jour sur la même version. C'est un ordre de grandeur, pas une mesure : une durée
qui varie d'une exécution à l'autre ne se publie pas au centième. Ce qui compte est le
nombre d'exécutions et le verdict, et la commande qui les refait.
**Cela prouve l'absence de régression sur ce qui est déjà testé. Cela ne prouve pas
l'absence de défaut.**

Sur les trois derniers lots (B1, B2 et B3, menés les 25 et 26 juillet 2026), les
revues adversariales ont levé **1 défaut bloquant, 15 constats importants et
19 mineurs** — compte recoupé lot par lot en tête de `CHANGELOG.md`. Une part venait du
code d'origine. Une autre a été **fabriquée par les correctifs eux-mêmes** : chacune des
trois passes en a produit au moins un. **Aucun de ces six n'était visible au filet
automatisé, qui restait vert.** Ce sont des relecteurs chargés de réfuter le travail
qui les ont trouvés.

Les six, vérifiés dans `CHANGELOG.md` avant d'être cités ici :

1. **Une sous-déclaration.** Lot B2, brique B2-4, dont le paragraphe s'ouvre sur
   l'avertissement de sa propre mise à mort. Un correctif appliquait « sans pièce
   jointe, une issue de traitement ne vaut pas preuve » au calcul de la **déclaration
   annuelle faite à l'autorité**. Sur le jeu d'essai, **5,5 kg de R-410A réellement
   traités et 1 kg de R-32 recyclé quittaient leurs rubriques réglementaires et
   n'étaient plus déclarés**. *(Masses du jeu d'essai, pas du registre du lycée :
   aucune déclaration fausse n'a été transmise.)* Règle retirée du calcul ; le défaut de
   pièce est devenu une anomalie signalée, sans qu'aucune masse ne bouge. D'où la règle
   inscrite depuis : **le doute retire l'allègement, jamais l'obligation, et jamais une
   masse.**
2. **Le coffre des identités percé dans l'archive scellée.** Lot B3 : en portant les
   signatures au dossier d'audit, un correctif y écrivait les noms bruts. Dans une même
   archive, un élève mis au coffre apparaissait pseudonymisé dans `personnel.csv` et
   sous son vrai nom dans `signatures.csv`. Régression introduite par la brique 5 du
   lot, fermée dans le même lot.
3. **Un motif d'état devenu faux.** Lot B3 : rendre la validité des signatures honnête
   a fait ressortir toute image illisible sous le seul état restant, « périmée »,
   c'est-à-dire « la fiche a été modifiée après la signature » — alors que la fiche
   n'avait pas bougé. La ligne se contredisait elle-même dans le dossier **scellé** :
   révision signée 0, révision courante 0. **L'archive opposable portait donc une cause
   fausse.** Un quatrième état a été ajouté.
4. **Une accusation écrite contre une opération légitime.** Lot B2 : le contrôle de
   cohérence des remises en filière dénonçait par écrit un regroupement de déchets
   parfaitement valide. Un premier correctif a fermé le déclencheur, pas la racine ; il
   a fallu une passe de vérification supplémentaire. L'accusation ne restait pas dans un
   journal technique : **elle remontait au feu tricolore et au guide d'audit**,
   c'est-à-dire aux écrans qu'un contrôleur regarde en premier. Le module portait même
   un commentaire affirmant l'inverse de ce que le code faisait.
5. **Un écran rendu mort.** Lot B1 : le filtre de qualification introduit par le lot
   comparait la charge du formulaire au contenu de la base ; un champ **absent** était
   lu comme un changement, et l'élève prenait un refus pour un non-changement.
6. **Le correctif vedette a d'abord échoué sur les images qu'il devait refuser.** Lot
   B3 : la fonction chargée de dire s'il y a de l'encre comparait des octets bruts et
   répondait « il y a de l'encre », avec assurance, sur des images **visuellement
   blanches**. Le mensonge que le lot prétendait fermer, retourné contre lui.

**Ce qu'il faut en retenir pour la suite.** Dans ce logiciel, c'est la relecture
adversariale qui trouve, pas la suite de tests. Un correctif n'est pas un progrès tant
qu'il n'a pas été attaqué. Et un voyant vert n'autorise à conclure qu'une chose : rien
de ce qui était déjà surveillé n'a bougé.

**Et parfois le voyant n'a même rien tiré (constat P2-1, audit externe #4 du
27/07/2026).** Ce constat porte sur le **banc d'essai** `server/test-lan-https.mjs`,
**jamais sur le produit** : le serveur, lui, n'a pas changé et refuse toujours le clair
sur le port LAN. Le banc parlait à l'adresse de bouclage 127.0.0.2 par l'agent HTTP
**global** de Node — détourné par `NODE_USE_ENV_PROXY`, alors que le `NO_PROXY` d'un
poste ne couvre en général que 127.0.0.1. L'auditeur y a rencontré un **faux rouge**
(la suite échouait sous mandataire complet). En le tirant, on a trouvé pire : un **faux
vert**. Avec `HTTP_PROXY` renseigné et `HTTPS_PROXY` absent — un établissement qui ne
filtre que le trafic en clair —, la suite affichait **11 OK / 0 échec** alors que les
deux vérifications portant toute la propriété « aucun repli HTTP en clair sur le port
LAN » étaient parties au mandataire et **n'avaient jamais interrogé le serveur**. Un
faux rouge se voit ; un faux vert, non : c'est lui le danger. Fermé par des agents
dédiés dans le code du test (jamais par un `NO_PROXY` élargi, qui dépendrait du poste)
**et** par une cinquième famille de vérifications qui rend la suite rouge si ces agents
disparaissent.

---

## Ce que ce document ne couvre pas

Par honnêteté, les limites de l'inventaire lui-même.

- Il recense les défauts **connus** au 26/07/2026. Il ne dit rien de ceux que personne
  n'a encore trouvés, et la section 14 donne toutes les raisons de penser qu'il en
  reste.
- Le filet de tests **a été rejoué** le 26/07/2026 pour la rédaction de ce document
  (`node outils/lancer-tests.mjs --tout` → « TOUT VERT — 121 exécutions », durée de l'ordre
  de 100 secondes), et ce résultat concorde avec `docs/CARTE-CODE.md:35`. Mais **cela ne
  vaut que ce que dit la
  section 14** : un filet vert ne prouve rien d'autre que l'absence de régression sur ce
  qui est déjà testé. Les comptes de défauts par lot, eux, ne sont pas rejouables : ils
  viennent du `CHANGELOG.md`.
- Deux affirmations reposent sur des gestes qui se passent hors du dépôt et qu'aucune
  lecture de code ne peut vérifier : la désactivation du déploiement Google (point 5)
  et l'état réel des sauvegardes et du chiffrement du poste (point 3). Pour ces deux
  points, **seule une attestation de l'établissement fait foi**.
- Le classement par gravité est un jugement, pas une mesure. Il est discutable, et
  quelqu'un qui le discuterait aurait peut-être raison.
