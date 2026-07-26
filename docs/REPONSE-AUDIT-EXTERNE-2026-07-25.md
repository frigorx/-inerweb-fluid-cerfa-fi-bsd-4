# Réponse à l'audit externe du 25 juillet 2026

**Objet** : réponse motivée au rapport « Audit complet d'inerWeb Fluide » (25/07/2026,
verdict **NO-GO** pour le registre officiel unique).

**Version auditée** : l'archive `inerweb-fluide-PAQUET-AUDIT.zip` qui vous a été remise le
25/07/2026 — le paquet de texte concaténé, pas le dépôt. Son empreinte SHA-256 est
`cb6c248510eba68d861d160838bb0d6c217651dbbd0d598d91ce95f970fd1def` : recalculez-la sur le
fichier que vous avez reçu, c'est la seule façon de savoir que nous parlons du même objet.
Cette archive a été produite à partir du dépôt au commit `c32f8c0`.

**Version présentée aujourd'hui** : au moment où ce mémoire est écrit, le dernier commit ayant
touché le code du logiciel est **`0cdaa26`** (26/07/2026). Ce mémoire et la table des constats
qui l'accompagne lui sont postérieurs et ne modifient aucune ligne de code.

**Rédigé par** : l'assistant de développement du projet, sous la direction de l'auteur.

> **Une règle a gouverné la rédaction de ce mémoire** : n'affirmer que ce que vous pouvez
> vérifier vous-même avec ce qui vous est envoyé. Chaque chiffre porte donc la commande qui
> le produit, ou le fichier et la ligne qui le portent, ou la date du `CHANGELOG.md` qui le
> consigne. Là où nous n'avons qu'une mesure de banc, nous le disons et nous joignons le
> banc. Là où nous n'avons rien de vérifiable, nous avons retiré l'affirmation.
> L'annexe, en fin de document, dit **où** se lance chaque vérification — et nomme les rares
> lignes qui ne sont pas faisables depuis le paquet.

---

## 1. Ce que nous répondons, en une page

Le rapport a été traité **intégralement**. Aucun de ses constats n'a été écarté sans examen :
**31 constats** ont été inventoriés, y compris ceux que vos sections 5 et 11 portent hors des
listes P0/P1/P2.

**L'inventaire nominatif est joint** : `docs/TABLE-CONSTATS-AUDIT-2026-07-25.md`. Il donne, pour
chacun de vos numéros, l'intitulé abrégé, notre verdict et la section de ce mémoire où le lire.
C'est aussi la seule pièce qui raccorde notre numérotation interne `A01…A31` à la vôtre. Neuf de
ces codes seulement apparaissent ailleurs dans le dépôt — ce sont ceux qui ont donné lieu à du
code ; la table les nomme et dit **où** chacun se retrouve, fichier par fichier.

> ⚠️ **Une collision de numérotation à connaître avant de chercher vos numéros.** Ce paquet
> transporte nos documents de travail, dont
> `docs/CONSTATS-AUDIT-EXTERNE-2026-07-20.md` : il emploie lui aussi des codes `P0-1`…`P0-9` et
> `P1-1`…`P1-6`, mais ce sont ceux de l'audit **précédent** (20/07), et ils désignent tout autre
> chose. Vos numéros sont ceux de la table jointe.

Chaque constat a ensuite été soumis à la règle interne du projet :

> **Une faille se prouve en la TIRANT, pas en la lisant.**

Chaque constat **portant sur le code** a donc fait l'objet d'un script d'attaque exécuté
contre un vrai serveur, sur port jetable et base jetable. Les constats d'exploitation et de
gouvernance — visas, chiffrement du poste, protection des données — ne se tirent pas : ils
sont instruits séparément et renvoyés à l'établissement (§6). Puis chaque verdict engageant
a été confié à un second relecteur chargé de le **réfuter**. Deux verdicts ont changé à ce
stade, et ce sont exactement les deux que le corps de ce mémoire expose : la gravité annoncée
de **P0-04 B**, réfutée, et le volet « échéance à 2099 » de **P0-04 A**, réfuté lui aussi
(§4 pour les deux).

**Résultat du tri.** Nous donnons les constats par leur numéro plutôt que par un décompte,
pour que vous puissiez pointer votre propre rapport.

| Traitement | Constats de votre rapport |
|---|---|
| **Confirmés par le tir, en tout ou en partie** | P0-03 (ses deux volets), P0-04 A (un volet réfuté), P0-04 B (partiellement — la gravité est réfutée), P0-05, P1-04. **Cinq corrigés dans ce paquet** ; P1-04 assumé et consigné (§4). |
| **Désaccord de fond, mais partiel** | P0-02 (§3), le plus lourd du rapport. Nous maintenons le désaccord sur la **séparation des données**. Nous **reconnaissons en revanche le constat déplacé** : une fiche `FORM-` qui déplace du fluide réel ne franchit aujourd'hui **aucune condition bloquante** — « mouvement réel, régime nul » (§3.2). Un résidu de présentation qu'il contenait a par ailleurs été corrigé (§3.7). |
| **Exacts, corrigés dans ce paquet** hors des six trous | P1-08 (ses deux volets, et plus grave que ce qu'il disait), P2-03, un volet de P1-06. §6. |
| **Corrigé dans l'envoi lui-même**, pas dans le logiciel | P0-08 (la livraison n'était ni reproductible ni certifiable avec le paquet du 25/07). Ce paquet-ci joint une archive exécutable ; le SBOM formel et la recette sur poste cible restent à produire. §7 et annexe. |
| **Exacts mais périmés ou déjà tranchés** avant l'audit | P0-07, P1-09. §6. |
| **Exacts et délibérés** | P2-06. §6. |
| **Qualité logicielle, non traités à ce stade, assumés** | P2-01, P2-02, P2-04, P2-05, P2-07. §6. |
| **Non contestés, hors code** (visas, exploitation, gouvernance, protection des données) | P0-01, P0-06, P0-07, P1-01, P1-02, P1-03, P1-05, P1-06, P1-07, P1-10, et vos sections 5 et 11. §6. |

La table jointe nomme les 31 et dit où chacun est traité. Nous ne vous demandons pas de faire
notre inventaire : si malgré tout un numéro y manquait, ce serait notre omission, et nous y
répondrions.

**Votre rapport n'est pas dans ce paquet** : nous ne redistribuons pas un document dont nous ne
sommes pas l'auteur. Vous y trouverez en revanche celui de l'audit précédent
(`docs/AUDIT-INERWEB-FLUIDE-2026-07-20.md`), qui fait partie de l'historique que nous vous
devons. Si vous préférez que le vôtre voyage de la même façon, dites-le-nous.

**Ce que le rapport a trouvé et que personne n'avait vu** : six défauts réels, dont trois
touchaient directement la valeur probante du registre — les deux volets de la signature
(P0-03) et le suivi de remise en filière (P0-05). Ils sont corrigés, chacun avec le test qui
échoue si l'on retire le correctif. Le filet automatisé passe de **106 à 121 exécutions**
(`node outils/lancer-tests.mjs --tout` : les 121 se relisent dans l'archive exécutable jointe,
les 106 sur la version auditée, hors paquet — voir l'annexe).

**Ce que le rapport n'a pas pu voir** : son constat le plus grave — la prétendue absence de
séparation entre Formation et Officiel — découle d'une définition du mot « Formation » que
**notre propre brief lui a donnée, et qui était fausse** (§7). Corrigée, cette définition
change la conclusion : la correction exigée rendrait le registre **faux**. La démonstration
est au §3, avec un contrefactuel mesuré et le banc qui le rejoue.

**Nous ne contestons pas le verdict NO-GO.** Le mode Officiel était verrouillé avant l'audit,
il l'est toujours, et il le restera jusqu'au retour d'un organisme agréé. Ce que nous
contestons est une partie du chemin qui y mène.

---

## 2. Comment ce rapport a été traité (méthode)

Nous détaillons la méthode parce qu'elle conditionne la valeur de ce qui suit.

1. **Inventaire sans filtre.** Les 31 constats ont été numérotés, y compris ceux qui
   semblaient faux. Un constat mal formulé cache parfois un vrai problème, et cela s'est
   vérifié : P0-02, que nous contestons sur le fond, contenait un défaut d'affichage réel
   (§3.7) ; P0-04 B, dont nous réfutons la gravité, en cachait deux autres (§4).
2. **Tir.** Un script d'attaque par constat portant sur le code, exécuté. Trois verdicts
   possibles : CONFIRMÉ (avec l'effet exact observé), RÉFUTÉ (avec le message de refus
   exact), ou DÉSACCORD MÉTIER.
3. **Contre-épreuve adversariale.** Chaque verdict engageant a été confié à un second
   relecteur dont la mission était de le **faire tomber** (voir §1 pour les deux verdicts
   qui ont changé).
4. **Correction par briques.** Un correctif, son test, le filet complet vert, un commit.
   Jamais deux corrections dans un commit.
5. **Revue adversariale de chaque lot**, puis contrôle final. Chacune des trois passes a
   introduit au moins un défaut nouveau — voir §5, nous les publions.

> ⚠️ **Sur les identifiants de commit qui suivent, et pour ne pas vous faire chercher.** Ce
> mémoire désigne treize correctifs par un identifiant court (`dcd29fd`, `2544577`, `d1cad05`,
> `7b6ac98`, `7419303`, `027b546`, `f516a3d`, `58cc401`, `30d7a35`, `b0c708e`, `cc486aa`,
> `0cdaa26`, `e4be3e4`). **Ces identifiants ne sont tirables ni depuis le paquet — qui ne
> transporte pas l'historique `git` (annexe, point 4) — ni depuis le `CHANGELOG.md`, où aucun
> des treize ne figure** (`grep dcd29fd CHANGELOG.md` ne rend rien, et de même pour les douze
> autres). Ils ne valent donc **que sur le dépôt public**
> (`https://github.com/frigorx/-inerweb-fluid-cerfa-fi-bsd-4`), et ils y sont marqués comme tels
> à chaque fois. Chaque correctif est en revanche rattaché ci-après à une pièce **que vous avez
> sous la main** : une section datée du `CHANGELOG.md`, une décision de `docs/PLAN-B3-SIGNATURE.md`,
> ou la suite de tests qui le prouve. C'est cette pièce-là qui fait la preuve ; l'identifiant
> n'est qu'un repère de traçabilité. **Quatre correctifs du 26/07 — `dcd29fd` (A02),
> `cc486aa` et `0cdaa26` (A18), `e4be3e4` (A23) — ne sont pas encore consignés au `CHANGELOG.md`
> : c'est une lacune de notre journal, nous la déclarons, et pour ceux-là la seule pièce vérifiable
> depuis le paquet est la suite de tests nommée à chaque fois.** Aucune affirmation de ce mémoire
> ne repose sur la lecture d'un message de commit : là où nous en citions un, nous avons remplacé
> la citation par la pièce correspondante.

---

## 3. Le désaccord de fond : P0-02, « Formation et Officiel partagent les mêmes stocks »

C'est le constat le plus lourd du rapport et **le seul que nous ne corrigeons pas, et voici
pourquoi**. Nous demandons au prochain auditeur de traiter cette section en priorité.

### 3.1 Le fait technique est exact — nous le confirmons

Nous l'avons reproduit. Une fiche en mode Formation validée produit exactement les mêmes
effets qu'une fiche officielle : la matière bouge, la vue `bilan_matiere` enregistre la
charge, la déclaration annuelle aussi. Les références de code citées par l'auditeur sont
justes ; nous les avons relues, elles disent bien ce qu'il dit.

Deux effets s'ajoutent à ceux qu'il cite. Nous les donnons **établis par lecture du code, sans
rejeu** — le banc du §3.2 ne les monte pas : un contrôle périodique saisi en Formation déplace
l'échéance réglementaire de la machine et éteint une alerte de retard, et une fuite déclarée en
Formation met réellement la machine en statut FUITE. La preuve est structurelle : dans
`enregistrerControle` (`server/api.js`), le mode sert à **numéroter** la fiche de contrôle et à
la marquer ; le bloc qui suit — celui qui écrit `date_prochain_controle` sur la machine et
bascule son `statut` en `FUITE` — ne consulte jamais le mode.

### 3.2 Mais la conclusion est fausse, et le contrefactuel le prouve

L'auditeur en conclut qu'il faut deux univers de données. **Nous avons monté ce scénario et
l'avons mesuré.**

> **Montage.** Une bouteille de R-134a neuve — tare 10 kg, brut 20 kg, donc 10 kg nets — et
> une machine de 10 kg nominaux. Le gaz part réellement dans la machine pendant le TP
> (c'est la réalité de l'atelier) : la bouteille pèse physiquement 8 kg nets après le geste.
> Mais la fiche Formation est rendue INERTE, comme le rapport l'exige. Le professeur saisit
> ensuite l'inventaire physique réel : 8 kg.
>
> **Résultat mesuré.** Le registre porte un **stock théorique de 10 kg pour un stock réel de
> 8 kg** — `ecartKg −2`. Il déclenche une alerte **CRITIQUE**, « Écart de balance matière non
> justifié — R-134a · 2026 · écart − 2,00 kg ». C'est le dommage : **un registre qui affiche un
> stock faux, et une anomalie que rien dans le registre n'explique.** Une issue existe — le
> responsable peut justifier l'écart à la main (`justifierEcart`, réservé au responsable) — mais
> elle consiste à écrire chaque année, en toutes lettres, la justification d'un trou dont la
> cause est un mouvement réel que le registre a refusé d'enregistrer. C'est la définition du
> cahier tenu à côté. (Accessoirement, la même source produirait le jour venu
> un motif de refus du mode Officiel : « Écart de balance matière non justifié : R-134a (2026,
> − 2,00 kg). » Nous ne mettons pas cet effet en avant : le verrou de livraison étant fermé, il
> est aujourd'hui hors d'atteinte.)
>
> **Le même montage, la Formation laissée vivante** (l'état livré) : la fiche
> `FORM-2026-0001` est validée, l'inventaire physique donne `théorique 8 kg · réel 8 kg ·
> ecartKg 0`, aucune alerte.

**Rejouez-le vous-même** — le banc n'ouvre aucun port, il appelle l'API en direct sur une base
jetable, et il tient en une page que vous pouvez modifier :

```
node docs/banc-contrefactuel-P0-02.mjs inerte
node docs/banc-contrefactuel-P0-02.mjs vivant
```

Autrement dit, l'inertie réclamée produit elle-même la contamination reprochée.

> **La lecture la moins coûteuse de votre constat — et c'est la plus forte.**
> On peut lire votre exigence autrement que comme « deux bases ». On peut la lire ainsi :
> *le mouvement est OFFICIEL puisque la matière a bougé ; seul le DOCUMENT est pédagogique.*
>
> ⚠️ **Nous avions écrit ici que c'était déjà ce que fait le logiciel livré. C'était faux, et
> nous le retirons.** Vérifiez-le vous-même dans `server/api.js` : le moteur de blocage n'est
> évalué qu'à l'intérieur de `if (mouvement.mode === 'OFFICIEL')` — aux deux seuls endroits qui
> refusent quelque chose, `soumettreMouvement` (l'appel à `evaluerOfficiel('SOUMISSION', …)`) et
> `validerMouvement` (l'appel à `evaluerOfficiel('VALIDATION', …)`). Le troisième appel,
> `simulerValidationOfficielle`, est une lecture qui ne bloque jamais et le dit dans son propre
> commentaire. L'aptitude n'est calculée que dans `cadreFicheOfficiel`, consommé par ces seuls
> appels. **Conséquence exacte : une fiche `FORM-` qui déplace du fluide réel n'est opposée ni à
> la condition 16 (aptitude du signataire), ni aux conditions 14/15 (signatures), ni à la
> condition 18 (périmètre) — ces numéros sont ceux de `docs/CONDITIONS-BLOCANTES-OFFICIEL.md`,
> qui part avec ce paquet.** Notre propre brief l'écrit d'ailleurs en toutes lettres : dans son
> tableau des trois modes, ligne « Blocages », colonne **Formation**, on lit « **aucun** — on
> n'empêche jamais d'enregistrer la réalité ».
>
> Ce que le logiciel fait réellement, sous cette lecture, s'arrête au document : une fiche
> Formation validée bouge la matière — c'est le fait du §3.1 — et le CERFA qu'elle produit porte
> un filigrane diagonal « MODE FORMATION » et, au cadre 14, la mention `MODE FORMATION —
> DOCUMENT NON OFFICIEL — NE PAS UTILISER POUR UNE INTERVENTION RÉELLE`
> (`v8/js/cerfa/generateur.js` : constante `MENTION_FORMATION`, et le filigrane posé quand
> `mode === 'FORMATION'`). Le document est donc bien marqué. **Le mouvement, lui, n'est soumis à
> aucun régime opposable.** La formule juste n'est pas « mouvement officiel, document
> pédagogique » : c'est **« mouvement réel, régime nul »**, et nous l'écrivons ainsi parce que
> c'est ce que le code fait.
>
> **Ce que nous en tirons, sans le minimiser.** Aujourd'hui, verrou de livraison fermé, **aucune
> intervention n'est soumise au régime opposable — ni celles des élèves, ni les autres.** Ce
> n'est pas un défaut caché : c'est l'état **déclaré** du produit, et c'est exactement la raison
> pour laquelle le mode Officiel est verrouillé et pour laquelle la relecture par un organisme
> agréé est le chemin critique du projet. Un registre dont aucune écriture ne franchit de porte
> ne peut pas être présenté comme opposable, et nous ne le présentons pas ainsi (§1 : nous ne
> contestons pas le NO-GO).
>
> **Ce que cela implique honnêtement pour la suite, et que nous ne tranchons pas ici.** Le jour
> où le verrou s'ouvrira, il faudra décider ce qui, dans une intervention **réelle** d'atelier,
> doit franchir les conditions bloquantes : toutes les interventions, quel que soit le mode de la
> fiche ? Les seules fiches `FI-` ? Un régime intermédiaire opposant l'aptitude et les signatures
> sans exiger le CERFA officiel ? **C'est une décision de l'auteur, détenteur du registre, pas
> une décision technique.** La question lui est posée ; elle n'est pas tranchée, et nous ne la
> tranchons pas dans ce mémoire. Nous la portons ici pour que vous puissiez y répondre avant
> qu'elle ne le soit, et elle est reportée au dossier de relecture externe.
>
> Sous cette lecture, un point du constat était de surcroît exact et purement factuel : le
> **comptage affiché**, qui additionnait les fiches d'exercice au total « CERFA générés ». Nous
> l'avons corrigé (§3.7). Ce qui reste en litige, c'est l'autre lecture — celle qui rend la fiche
> inerte — et c'est elle, et elle seule, que le contrefactuel mesure.
>
> ⚠️ **Nous signalons nous-mêmes une tension dans ce libellé.** « NE PAS UTILISER POUR UNE
> INTERVENTION RÉELLE » dit plus que ce que nous soutenons ici : ce que la mention doit dire,
> c'est *ce document n'est pas un CERFA opposable*, et non *rien de réel ne s'est passé*. Nous
> ne la changeons pas dans ce paquet — sa valeur exacte est comparée caractère par caractère par
> le correcteur pédagogique de CERFA (`v8/js/cerfa/correction.js`, `MENTION_FORMATION_NORMALISEE`),
> une réécriture n'est donc pas un simple changement de texte. Nous la soumettons à votre avis.

> **La variante qu'on nous opposera.** Objection légitime : deux bases, plus une ressaisie
> par le professeur dans la base officielle. Nous y répondons sur trois points.
> ① Ce n'est plus une séparation, c'est une **double saisie** — c'est-à-dire le cahier tenu
> en parallèle que le registre unique a précisément pour objet de supprimer, avec le risque
> de divergence qui va avec. C'est la doctrine constante du projet : *un registre qui refuse
> la réalité pousse à tenir un cahier à côté* (`docs/PROMPT-REPRISE-AUDIT-EXTERNE.md` §5).
> ② Elle n'apporte aucune garantie nouvelle : aujourd'hui déjà, un élève ne peut ni valider
> une écriture ni saisir un inventaire (§3.6, tiré). La seule main qui engage le registre est
> celle de l'enseignant, dans les deux architectures.
> ③ Elle déplace le risque au lieu de le réduire : ce qui est ressaisi de mémoire, en fin de
> séance, sur un second support, est moins fidèle que ce qui est écrit au moment du geste.
> Nous restons demandeurs de votre avis si vous voyez un quatrième terme.

### 3.3 La déclaration annuelle — la version la plus solide de votre constat

Nous la traitons parce que vous la trouverez, et parce qu'elle est plus solide que le scénario
de nuisance du rapport.

**Le fait, d'abord, vérifiable en une lecture** : `server/declaration-annuelle.js` **ne connaît
pas le mode**. Le mot n'y figure nulle part, dans aucune de ses 243 lignes. Pour les rubriques de
charge et de récupération, le module retient les écritures de l'année au statut `VALIDE` ou
`ANNULE`, et rien d'autre ; les autres rubriques lisent les bouteilles, les retours fournisseur,
les suivis de remise en filière et les photos d'inventaire — aucune ne demande le mode non plus.
La déclaration faite à l'autorité agrège donc les fiches `FORM-` avec les autres.

L'objection s'écrit alors : *votre défense est que la matière est réelle mais que le document
n'est pas opposable — or une déclaration EST un document.*

**Nous l'assumons, et voici l'argument.** La déclaration annuelle ne déclare pas des documents :
elle déclare des **masses**, par fluide et par rubrique — quantités chargées, récupérées, remises
en filière, détruites, en stock. Aucune fiche n'y est reproduite, aucun numéro de fiche n'y
figure. Ce qui entre dans un total, c'est un nombre de kilogrammes qui ont réellement quitté une
bouteille. Exclure les fiches `FORM-` rendrait la déclaration **fausse de la masse exacte qui a
bougé pendant les TP** — c'est-à-dire de l'essentiel du mouvement de fluide de l'atelier. C'est
la règle que nos propres revues nous ont imposée par ailleurs (§5, cas 1) : *le doute retire
l'allègement, jamais l'obligation, et jamais une masse.*

**Ce que l'argument ne couvre pas, et qu'il faut nommer.** Répondre « on déclare des masses, pas
des documents » règle la nature de ce qui est déclaré, pas sa **qualité**. Les masses agrégées
proviennent, pour l'essentiel, d'écritures qui n'ont franchi **aucune porte** : ni l'aptitude du
signataire (condition 16), ni les signatures (conditions 14/15), ni le périmètre (condition 18) —
c'est le fait établi au §3.2, et il vaut ici de plein droit puisque la déclaration ignore le mode.
La déclaration est donc **exhaustive** en masse et **non contrôlée** en amont. Nous ne prétendons
pas que ces deux propriétés se compensent : elles ne portent pas sur la même chose. Notre position
est que l'exhaustivité est la seule des deux qui ne se rattrape pas après coup — une masse omise
est irrécupérable, une porte manquante se pose — et que refermer les portes est précisément
l'objet du chemin critique (visa, puis ouverture du verrou, puis la décision d'auteur exposée au
§3.2). **C'est un ordre de traitement, pas une réfutation de votre point**, et nous demandons
votre avis sur cet ordre.

**Ce que nous ne prétendons pas.** L'argument tient tant que l'écriture correspond à un mouvement
réel. Le cas où elle ne correspond à rien — l'exercice où aucun fluide n'a bougé — est la limite
que nous reconnaissons au §3.6, et c'est bien dans la déclaration qu'il ferait le plus de dégâts.
Il se traite aujourd'hui par l'annulation par contre-écriture, et la déclaration s'en trouve
mécaniquement rétablie : le module retient les écritures `ANNULE` justement parce que la
contre-écriture porte le même type et la quantité opposée, si bien que les deux se neutralisent.
Nous ne prétendons pas que ce soit une garantie **structurelle** — c'est une garantie de geste —
et c'est précisément le point sur lequel nous demandons votre avis.

### 3.4 Pourquoi : « Formation » n'est pas un bac à sable

L'auditeur a lu « mode Formation » comme « environnement de test ». C'est l'erreur d'origine,
et **c'est notre documentation qui la lui a donnée** (voir §7, nous l'avons corrigée).

Dans ce lycée, **les élèves interviennent sur le parc réel de l'atelier, avec du vrai fluide
dans de vraies bouteilles**. Quand un élève charge 2 kg, la bouteille perd réellement 2 kg.
L'obligation F-Gas porte sur la **matière**, pas sur le statut pédagogique de celui qui
manipule. Ne pas tracer ce mouvement, ce n'est pas de la prudence : c'est un trou dans le
registre.

Le bac à sable existe, et il porte un autre nom : c'est le **mode Démo** (magasin en mémoire,
monde fictif, aucune donnée réelle). Il y a donc trois objets distincts, pas deux.

Le détenteur du registre a par ailleurs fixé une règle d'usage, rapportée le 25/07/2026 et
consignée en tête de `docs/PROMPT-REPRISE.md`, qui part avec ce paquet :

> « par défaut, s'ils utilisent l'application c'est qu'ils ont manipulé du vrai fluide ;
> c'est moi qui valide le CERFA à la fin »

**Ce n'est pas un argument technique et nous ne le présentons pas comme tel** : c'est une
décision d'usage du détenteur du registre, qui lui revient, et que nous rapportons pour que
vous puissiez la contester en tant que telle. Elle ne prouve rien à elle seule — c'est le
contrefactuel du §3.2 qui prouve.

### 3.5 Deux conséquences que la correction demandée entraînerait

- **Le parc non fluoré deviendrait intraçable.** Une décision antérieure — condition n° 18
  `HORS_PERIMETRE_FLUORE`, tranchée le 24/07 et écrite dans
  `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` — refuse le CERFA officiel pour le R-744, le R-290
  et le R-717, « la traçabilité volontaire = le mode Formation ». Le même document écarte
  explicitement l'issue de repli qu'on pourrait nous suggérer : « aucun troisième objet ».
  Une Formation inerte supprimerait donc la seule trace existante du parc CO₂ et
  hydrocarbures de l'atelier.
- **Le registre n'enregistrerait plus rien pendant l'attente.** Le verrou de livraison étant
  fermé (`VERROU_LIVRAISON = true`, `server/blocage-officiel.js` et son miroir
  `v8/js/data/blocage-officiel.js`), la Formation est aujourd'hui le **seul mode d'écriture
  possible**. L'argument n'est pas que ce verrou est éternel — on nous répondrait « alors
  ouvrez l'Officiel ». Il est que **la période d'attente de votre avis et de celui de
  l'organisme agréé ne peut pas être une période sans registre.**

### 3.6 Ce que nous accordons au rapport

Le scénario de nuisance qu'il décrit — « un élève fait un exercice, le stock officiel bouge »
— est **inexact sur les droits**, et un élève est arrêté **deux fois**, par deux gardes
distinctes :

- **au niveau de la session**, `validerMouvement` répond **HTTP 403** : « Action
  « validerMouvement » réservée aux rôles habilités (REFERENT, ENSEIGNANT, ADMIN) — rôle
  courant : ELEVE. » (garde `garderRole`, `server/api.js`) ;
- **au niveau métier**, si l'on désigne une fiche d'élève comme validateur, `verifierValidateur`
  refuse à son tour, en **HTTP 400** : « Validation refusée : un élève ne peut pas valider une
  écriture (rôle requis : référent, enseignant ou administrateur). »

L'écart de balance exige en outre la saisie d'un inventaire, elle aussi réservée
(`saisirInventaire` → 403, même garde). Tout effet passe par un acte de l'enseignant.

Mais il reste un cas réel, **plus large que le papier** : tout exercice où **aucun fluide
fluoré n'a effectivement bougé** — un CERFA rempli à blanc, une charge simulée à l'azote, un
banc démonté. Dans ce cas, une écriture n'a aujourd'hui aucun moyen de ne pas mentir aux
stocks. L'auteur traite ce cas par l'annulation par contre-écriture, dont nous avons vérifié sur
banc — serveur et base jetables, banc non joint à ce paquet — qu'elle ramène la balance à zéro et
fait disparaître le motif de blocage. **Nous le signalons
comme une limite assumée**, et nous demandons au prochain auditeur son avis sur ce point
précis — non sur le principe de la séparation, qui est tranché.

### 3.7 Ce que le constat contenait de vrai, et que nous avons corrigé

Le mode Formation ne partitionne pas les données — mais il partitionnait mal **l'affichage**,
et sur ce point le rapport avait raison sans le dire. Le numéro de fiche étant posé dans tous
les modes, le total « CERFA générés » du tableau de bord et de l'audit en cinq minutes
additionnait les fiches d'exercice : un lecteur pressé y lisait un volume officiel qui
n'existe pas.

**Corrigé dans ce paquet**, le 26/07 : la carte distingue le total des fiches
numérotées, les CERFA officiels et les fiches d'exercice ; et la part officielle se lit au
**mode scellé de l'écriture**, jamais au préfixe du numéro. **Preuve, dans le paquet** :
`v8/js/views/test-compteur-fiches.mjs`, 19 vérifications — retirez le correctif, 14 tombent.
*(Repère de traçabilité : commit `dcd29fd` — ⚠️ dépôt public, hors paquet, et non consigné au
`CHANGELOG.md`.)*

---

## 4. Les constats confirmés par le tir, et corrigés

### P0-03 — Une seule session fabrique les deux signatures : **CONFIRMÉ**

Reproduit intégralement. Un seul compte de niveau élève, une seule session, pose les deux
signatures sous deux identités inventées ; les conditions bloquantes 14 et 15 du moteur
officiel disparaissent (`docs/CONDITIONS-BLOCANTES-OFFICIEL.md`). Plusieurs angles de
réfutation ont été tentés, tous ont échoué. Le témoin de session existait en base mais
**aucune ligne de code ne le comparait**, ni au nom saisi, ni à l'autre signature.

**Décision de l'auteur, et nous l'assumons publiquement** (décision D1,
`docs/PLAN-B3-SIGNATURE.md`) : la présence de deux signatures posées depuis une même session
**n'est ni bloquée ni signalée**. En atelier de lycée, le détenteur est l'établissement et le
signataire est le professeur lui-même ; la délégation est un geste normal, câblé depuis le
16/07. Exiger deux sessions bloquerait l'activité sans rien prouver de plus.

**Ce qui a été corrigé** : le **témoin de session est porté sur la fiche et dans le dossier
d'audit** — c'est la brique 5 du lot B3, décrite au tableau du § 5 de `docs/PLAN-B3-SIGNATURE.md`
et à la section « B3 » du `CHANGELOG.md` (25/07), toutes deux dans ce paquet *(repère :
`2544577` — ⚠️ dépôt public, hors paquet)*. Auparavant, cette information — la seule que le client ne peut
pas falsifier — était enregistrée puis jetée : ni à l'écran, ni au CERFA, ni dans l'archive.
Chaque signature valide de la modale porte désormais « Posée depuis la session <Prénom Nom>
(compte …) », et le dossier scellé reçoit un `signatures.csv` qui portait jusque-là… rien :
les signatures, pièce la plus probante du registre, n'étaient dans **aucun** fichier du
dossier.

**Ce que nous ne revendiquons pas, et qu'il serait facile de nous opposer** : le
pré-remplissage du nom du signataire n'a pas bougé. Il **existait déjà dans la version que
vous avez auditée** (`git show c32f8c0:v8/js/data/parcours-signature.js` — ⚠️ dépôt public,
hors paquet). Décrit exactement, il prend **l'intervenant déclaré sur la fiche**, et seulement
à défaut la personne connectée ; les champs restent saisissables (jamais `readonly`, jamais
`disabled`). C'est la décision D3, écrite telle quelle dans `docs/PLAN-B3-SIGNATURE.md` § 3,
que vous avez dans ce paquet. Le lot n'a fait que la mettre sous test à l'écran
(`v8/js/modales/test-signatures-modal.mjs`, section 4).

Le journal d'audit chaîné, lui, consignait déjà l'auteur réel et signalait la discordance
(`journaliser`, `server/api.js` : l'entrée est écrite au nom de l'auteur RÉEL, avec la
mention « — auteur déclaré : <nom saisi> » quand les deux diffèrent).

**Nous ne prétendons pas** que ce mécanisme constitue une signature avancée ou qualifiée au
sens d'eIDAS. Vérification faite : aucun écran de l'application, aucun document qu'elle
produit (CERFA, dossier d'audit, exports) n'emploie ces termes. La seule occurrence du dépôt
est une note de conception interne — `docs/PLAN-AUDIT-PROOF-2026.md` ligne 82 — qui range
« horodatage qualifié / signature PAdES (eIDAS) » parmi des évolutions « entreprise »
envisagées plus tard et explicitement non retenues. Nous la citons nous-mêmes pour que vous
n'ayez pas à la trouver.

### P0-03 (second volet) — Le PNG n'est pas décodé : **CONFIRMÉ**

Reproduit. Un bloc de texte de 2 348 octets précédé des 8 octets magiques PNG était accepté
comme signature, et faisait passer les faits `signatureTechnicienValide` à vrai. Des PNG
structurellement valides mais **vides** l'étaient aussi : canvas blanc, canvas du wizard
jamais dessiné.

Nous ajoutons un chiffre que le rapport n'avait pas, **et il est rejouable en une commande** :

```
node outils/test-taille-signature.mjs
```

Zone de 1 400 × 700, encodeur `node:zlib`. Zone **jamais touchée** 3 879 o · zone blanche unie
5 506 o · **griffure de deux pixels** 3 893 o (5 517 o sur fond blanc) · **un seul trait**
4 892 o (6 559 o sur fond blanc). Deux faits en sortent :

1. **la borne basse de 1 Ko n'a jamais refusé une seule case vierge** — la plus légère pèse
   déjà 3 879 octets ;
2. **les deux populations se chevauchent** : le plus **lourd** des fichiers vides (5 506 o)
   est plus lourd que le plus **léger** des fichiers signés (3 893 o). Aucune borne de taille,
   où qu'on la place, ne les sépare — seul le décodage le peut.

> **Sur ces chiffres, une mise au point que nous devons.** Le 25/07 nous avions publié
> 5 562 / 5 509 / 6 518 / 5 584 o. Ces valeurs avaient été mesurées sur fond blanc avec un
> autre réglage et **n'étaient reproductibles par rien** : nous les avons rétractées le 26/07
> (`CHANGELOG.md`, lot B3, et `docs/PLAN-B3-SIGNATURE.md` § « Honnêteté sur les chiffres »).
> Les seuls chiffres que nous publions désormais sont ceux que la suite produit, parce qu'ils
> sont les seuls qu'un tiers puisse refaire. L'encodeur d'un navigateur n'est pas `node:zlib`
> et les valeurs absolues d'un vrai `canvas.toDataURL()` diffèrent ; ce qui se transporte d'un
> encodeur à l'autre — et qui est le seul point en cause — c'est le chevauchement.
> ⚠️ Un résidu subsiste dans le code que vous recevez, et nous le nommons exactement plutôt que
> de vous le laisser trouver : le commentaire de tête de `v8/js/data/signatures-mouvement.js`
> (lignes 20-21) cite encore « canvas vierge 5 562 o, un seul trait 6 518 o ». Son miroir
> serveur, `server/signatures-mouvement.js`, ne porte pas ces valeurs : le résidu est dans le
> seul fichier du front.

**Corrigé** : l'image est **réellement décodée** — en-tête IHDR, parcours des chunks, CRC-32
de chacun, présence d'IDAT et d'IEND, rien après — puis les pixels, par une décompression
zlib/DEFLATE (RFC 1950/1951) et un dé-filtrage des cinq filtres PNG **écrits à la main**
(`v8/js/data/png.js`, miroir `server/png.js`). Une zone restée **rigoureusement vierge** est
refusée. La borne de 1 Ko est retirée ; celle de 1 Mo est conservée (protection mémoire,
contrôlée AVANT décodage), plus un plafond défensif de surface décompressée de 32 Mo contre
la bombe de décompression.

**Sur la dépendance, la formulation exacte** : le décodage n'a introduit **aucune dépendance
nouvelle** — le dépôt n'a ni `package.json` ni gestionnaire de paquets, et `png.js`
n'importe rien. Le dossier `v8/js/lib/` compte **cinq fichiers**, dont **quatre de
bibliothèques tierces minifiées issus de trois projets** : `pdf.min.mjs` et
`pdf.worker.min.mjs` (PDF.js), `pdf-lib.min.js` (pdf-lib), `qrcode-vendor.js` (qrcodejs). Ils
servent l'affichage et le remplissage du CERFA et les étiquettes QR, et **aucun n'intervient sur
le chemin qui juge une signature**.

> ⚠️ **Le cinquième fichier n'est pas tiers, et notre propre inventaire de licences se trompe.
> Nous le déclarons plutôt que de vous laisser le trouver.** `v8/js/lib/qrcode.js` est **du code
> maison** : 37 lignes (`wc -l v8/js/lib/qrcode.js`), non minifiées, en-tête de commentaire
> rédigé en français, une seule fonction exportée — `obtenirQRCode()` — qui se contente de lire
> `window.QRCode` posé par le script tiers `qrcode-vendor.js`. Ouvrez-le, c'est une page.
> Or `LICENCES-TIERCES.md`, qui part dans le même paquet, le range sous « qrcodejs, davidshimjs,
> MIT » à côté du vrai fichier vendored. **C'est une erreur de notre inventaire** : ce fichier
> relève de la licence du produit, pas de celle de qrcodejs. Nous ne corrigeons pas
> `LICENCES-TIERCES.md` dans ce mémoire — il est hors du périmètre de cette réponse et sera
> corrigé à part — mais l'erreur est ici nommée pour que vous ne partiez pas d'un inventaire
> faux. *(Même remarque pour le commentaire de tête de `outils/paquet-audit.mjs`, qui parle de
> « trois bibliothèques tierces minifiées (pdf.js, pdf-lib) » alors qu'il exclut un dossier de
> cinq fichiers : trois projets, quatre fichiers tiers, un fichier à nous.)*

**Aucun seuil d'encre n'a été posé**, et c'est délibéré (décision D2,
`docs/PLAN-B3-SIGNATURE.md`) : aucun texte n'en fixe, le signataire voit ce qu'il trace et
peut recommencer. Une griffure de deux pixels passe. Et sur un format qu'on ne sait pas
relire, la réponse est INDÉTERMINABLE : on ne conclut jamais au vide sur un doute.

**Point signalé pour le visa** : ce contrôle est rejoué **à chaque lecture**, pas seulement à
la pose — c'est ce qui referme la porte de l'import, une garde posée sur la seule pose ne
tenait pas. Conséquence vérifiée en la tirant : un registre existant contenant une case
blanche **s'importe toujours** (rien n'est refusé à l'entrée, la chaîne d'empreintes reste
verte, aucune masse ne bouge), mais cette signature retombe sur « absente » et les conditions
14/15 lui sont opposées en mode Officiel. À l'écran et dans `signatures.csv`, l'état affiché
est le quatrième état, « image illisible », qui **nomme** sans rien refuser de plus. Nous
jugeons que le sens est le bon — le doute retire l'allègement, jamais l'obligation — mais nous
le déclarons plutôt que de le laisser découvrir.

### P0-04 A — `createMachine` sans la garde de `updateMachine` : **CONFIRMÉ**

Reproduit avec une vraie session élève. La garde de qualification réglementaire existait sur
la modification et **manquait à la création**. Conséquence mesurée, non théorique, et consignée
au `CHANGELOG.md` (lot B1, brique B1-a) : sur deux machines identiques de 5 kg de R-410A créées
par le même élève, un titulaire A2/2025 (limite 3 kg) est bloqué en Officiel sur la machine
témoin et **plus du tout** sur celle déclarée hermétique et étiquetée. **Le seuil d'aptitude
passe de 3 à 6 kg par une case cochée à la création.**

Un aggravant : la qualification est un **cliquet à sens unique**. L'élève l'installe mais ne
peut plus la retirer (403 en modification).

**Un point du constat est réfuté** : l'affirmation selon laquelle une échéance à 2099 posée à
la création ferait disparaître l'alerte critique. Contre-épreuve : une machine neuve n'a
aucune échéance à effacer — le cas « champ omis » produit exactement le même silence — et le
moteur écrête la valeur dès qu'un champ de seuil bouge.

**Corrigé, et au-delà du constat** : la règle ne vit plus dans un gestionnaire mais dans **un
filtre unique qui traverse les deux portes** (`CHAMPS_QUALIFICATION_MACHINE`, treize champs, et
`garderQualificationMachine`, appelée par `createMachine` comme par `updateMachine`). Nous y
avons ajouté deux champs que notre propre critère désignait : la **détection permanente** (elle
divise par deux la fréquence des contrôles — la même machine de 60 kg passait d'une échéance au
2027-01-25 à 2027-07-25 sur la seule déclaration d'un élève) et la **charge nominale** (ramenée
de 60 kg à 1 kg, la machine sortait du périmètre F-Gas : plus d'échéance, plus d'alerte). La
charge **actuelle**, elle, reste ouverte : c'est la pesée du jour, le geste même du TP. À
signaler par honnêteté : le champ `statut` entrant dans la liste, les gestes dédiés
`arreterMachine` et `demantelerMachine` — la troisième porte du même seuil — ont été portés au
niveau du responsable ; c'est une garde de rôle, pas le filtre.

### P0-04 B — Un élève crée du personnel et des attestations : **PARTIELLEMENT CONFIRMÉ**

Le geste est réel : un élève crée des fiches portant un rôle applicatif élevé et des numéros
d'attestation inventés.

**Mais la gravité annoncée est réfutée, et nous le démontrons** : ces preuves d'aptitude sont
**décoratives**. Le moteur d'aptitude opposable ne lit que la table des habilitations, réservée
au responsable ; la création d'une habilitation répond 403 à un élève (« Action
« createHabilitation » réservée aux rôles habilités (REFERENT, ENSEIGNANT, ADMIN) — rôle
courant : ELEVE. »). Contre-épreuve tirée dans les deux sens : la personne fabriquée reste
bloquée « Aucune habilitation F-Gas active et en cours de validité pour … », et ne se débloque
que lorsqu'un responsable pose une vraie habilitation. **Aucune intervention interdite ne
devient autorisée.** Le rapport signalait lui-même, honnêtement, que le rôle de la fiche ne
donne pas un rôle de session ; nous confirmons, aucun chemin indirect n'a été trouvé.

**En revanche, deux défauts réels**, tirés et corrigés :
- la désactivation d'une personne était réservée au responsable, **mais le champ `actif`
  passait par la mise à jour ordinaire** — la porte de derrière. Exactement le motif d'un
  défaut que nous avions nous-mêmes fermé le 25/07 sur un autre couple de méthodes ;
- **déni de service** : un élève rétrogradait la fiche du professeur (`roleApp` → ELEVE) et le
  professeur ne pouvait plus valider, `verifierValidateur` lisant la fiche. Réversible, mais
  un jour d'examen, personne n'en devine la cause.

Un troisième trou est apparu pendant la revue du lot, et il n'exigeait même pas d'écrire le
rôle : tout `typePersonne` autre qu'ÉLÈVE faisait naître une fiche **ENSEIGNANT**, celle que
`verifierValidateur` lit. Un rôle ne se déduit désormais que pour qui a le droit de
l'attribuer.

**Corrigé** : la fiche du personnel est **partitionnée** — état civil ouvert (un élève inscrit
un camarade intervenant sur un TP, c'est légitime), gouvernance et preuves déclaratives
réservées, aux deux portes (`createPersonne` et `updatePersonne`).

### P0-05 — Le BSFF interne n'est pas Trackdéchets : **CONFIRMÉ**

Le rapport a raison sur toute la ligne, et la réponse de l'auteur **aggrave** le constat plutôt
que de l'atténuer :

> « Oui, le lycée émet vraiment des déchets fluorés, voire chlorés. On a encore une bouteille
> de R-22 à mettre en réforme. »

L'établissement est donc **producteur réel de déchets dangereux**. Nous avons tiré : numéro
fantaisiste accepté, doublon accepté, aucun chemin d'annulation, issue « DESTRUCTION » attestée
sans la moindre pièce et tombant directement dans une rubrique de la déclaration réglementaire.
Et surtout — c'est le cœur — **l'interface ne prononçait jamais le mot Trackdéchets** tout en
nommant l'objet exactement comme le bordereau réglementaire. La seule mise en garde vivait dans
un commentaire SQL, là où l'utilisateur ne la lira jamais.

Nous ajoutons un effet de bord découvert en tirant : la décrémentation se **ré-inflatait** par
une simple modification de la masse de la bouteille — du fluide déchet « rendu » au stock après
remise déclarée, le sens le plus dangereux.

**Corrigé** : l'objet ne porte plus, **dans aucun écran ni aucun document produit par le
logiciel**, le nom du document réglementaire ; ce que l'utilisateur lit est « Suivi interne de
remise en filière ». Le cadre 11 du CERFA — dont le libellé « n° de BSFF » appartient au
formulaire officiel et ne nous appartient pas — recevait jusqu'ici le numéro maison ; il ne
reçoit désormais **que** le numéro du bordereau officiel reporté, et reste vide à défaut. Un
champ distinct accueille ce numéro externe. Une mention permanente rappelle que ce suivi ne
remplace pas le bordereau dématérialisé — et elle est **reportée au sommaire du dossier d'audit
scellé**, parce qu'un lecteur du dossier n'a pas le logiciel sous les yeux. La ré-inflation est
signalée par une alerte chiffrée, datée et rattachée au suivi.

**Sur le numéro interne, ce qui est gardé à chaque porte, exactement** — les deux portes ne
gardent pas la même chose, et l'écrire autrement serait faux :

- **par l'API** (`createBsff`) : si aucun numéro n'est fourni, le logiciel l'attribue lui-même
  au format `SIF-AAAA-NNNN`. Si un numéro est fourni, il doit respecter **cette forme** *et*
  être **unique** (comparaison insensible à la casse et aux espaces) ; à défaut, refus.
  C'est ce que fait `verifierNumeroSuivi` (`v8/js/data/remise-filiere.js`).
- **par l'import d'un registre** : seule l'**unicité** est exigée
  (`problemeNumerosSuivi`, appelée par la garde d'invariants de l'import). **La forme n'est
  délibérément pas exigée** — un registre antérieur, numéroté autrement, doit rester reprenable.
  C'est écrit dans le `CHANGELOG.md` (brique B2-3) et nous le maintenons : refuser la forme à
  l'import reviendrait à interdire de rapatrier son propre historique.

**Déclaré d'emblée, pour que vous n'ayez pas à le trouver au `grep`** : les identifiants
techniques hérités n'ont pas été renommés — méthode d'API `createBsff`, table `bsff`, champ
`numeroBsff`. Ils ne sont **jamais affichés**, et les renommer imposerait une migration sur des
écritures scellées pour un gain nul.

**Deux nuances factuelles** : (a) l'absence de transporteur et de destination est vraie par
appel direct, **fausse par l'écran** (le formulaire les exige et les refuse en clair) — le
risque réel est l'import, pas le clic quotidien ; (b) le reproche « toute masse BSFF comptée à
tort comme détruite » était **déjà corrigé** avant l'audit : les masses non attestées sortent
en poste dédié avec une anomalie, et la déclaration est marquée incomplète.

**Non codé volontairement** : une condition bloquante supplémentaire (« pas de fiche officielle
sur une bouteille déchet sans bordereau réel joint »). Ce serait une **règle réglementaire
nouvelle**, et la règle interne du projet interdit d'en coder une sans validation. Nous la
soumettons.

> **D'où vient cette règle interne**, puisqu'elle nous conduit ici à ne pas faire ce qui nous
> est demandé. Elle a été écrite après un accident : lors d'un échange antérieur (20/07), une
> exigence a été formulée qui consistait à **bloquer la recharge d'une machine depuis du fluide
> récupéré**. La conservation par machine d'origine est pourtant un geste de maintenance
> quotidien et licite ; coder l'exigence aurait rendu le logiciel inutilisable en atelier. Le
> défaut était partagé — l'exigence était fausse, et rien dans notre documentation ne permettait
> de le voir. Nous en avons tiré une règle de prudence dans les deux sens : aucune règle
> réglementaire nouvelle n'entre dans le code sans être soumise, et toute exigence reçue est
> vérifiée avant d'être codée.

### P1-04 — Déni de service sur la connexion : **CONFIRMÉ, non corrigé, assumé**

Mesuré, pas lu — mais nous donnons ici la méthode avec le chiffre, parce que ces deux mesures
dépendent du poste et qu'aucune des deux n'est consignée dans un fichier du dépôt.

- **Le facteur de travail cryptographique** est `scrypt` N = 2¹⁷, r = 8, p = 1
  (`server/comptes.js`, constante `SCRYPT_N = 131072`), appelé par `crypto.scryptSync` — donc
  **bloquant**, sur l'unique fil d'exécution, sur une route ouverte et sans limite de débit.
  L'ordre de grandeur est de **deux dixièmes de seconde par tentative de connexion** ; sur le
  poste où nous écrivons, douze tirs donnent une médiane de 0,19 s (0,18 s à 0,20 s). Le chiffre
  exact dépend de la machine : ce qui compte, et ce qui se transporte, c'est l'ordre de grandeur.
  Voici le protocole, **qui tourne tel quel** :

  ```
  node -e "const c=require('node:crypto');const N=131072,r=8,p=1,maxmem=128*N*r*2;
  const t=[];for(let i=0;i<12;i++){const d=process.hrtime.bigint();
  c.scryptSync('phrase','sel',32,{N,r,p,maxmem});
  t.push(Number(process.hrtime.bigint()-d)/1e6);}
  t.sort((a,b)=>a-b);console.log(t.map(x=>x.toFixed(0)).join(' '));"
  ```

  ⚠️ Le paramètre `maxmem` n'est pas décoratif : sans lui, Node refuse l'appel
  (`memory limit exceeded` — le plafond par défaut est de 32 Mo, ce profil en demande environ
  268). Le code du dépôt le passe explicitement (`SCRYPT_MAXMEM`, `server/comptes.js`). Un
  protocole qui l'omettrait ne s'exécuterait pas, et nous préférons vous donner celui qui marche.

- **La latence sous flux** : mesurée sur banc, port et base jetables. Au repos, une route légère
  (`/api/ping`) répond en **moins d'une milliseconde**. Sous un flux soutenu de quelques
  connexions en parallèle sur la route de connexion, sa latence médiane passe à **plus de deux
  secondes**, en continu. Protocole : lancer le serveur avec `PORT` et `IWF_CHEMIN_BASE`
  jetables, mesurer la médiane de vingt `/api/ping`, puis relancer la même mesure pendant que
  six clients bouclent sur `/api/connexion`. Nous ne publions pas un couple de valeurs
  précis : il dépend entièrement de l'intensité du flux et de la machine, et il ne serait
  reproductible chez vous par rien.

Le verrouillage étant indexé sur le compte et non sur l'origine (colonnes `echecs_consecutifs`
et `verrouille_jusqua`, `server/routes-comptes.js`), changer d'identifiant à chaque tentative
évite tout verrou. Aucune limitation de débit n'existe : la recherche de `rate limit`,
`throttle` ou « limitation de débit » dans `server/*.js` ne rend rien.

**Non corrigé, et voici pourquoi** : par défaut le serveur n'écoute que sur la boucle locale.
`server/serveur.js` ne lit `IWF_LAN` qu'en un seul point, et sans cette variable il imprime au
démarrage « Mode : local (écoute limitée à 127.0.0.1) ». Seul quelqu'un physiquement assis au
poste peut tirer, et cette personne dispose de leviers plus simples (éteindre la machine) sans
pouvoir altérer le registre scellé.

Le risque devient réel en **mode réseau local**. Ce mode est désactivé par défaut et **rien
dans ce qui vous est livré ne l'active** : il n'existe aucun fichier `.env` dans le dépôt,
`.env.example` ne livre les variables `IWF_LAN` / `IWF_HOTE_LAN` / `IWF_TLS_*` qu'en
commentaire, et le lanceur `lancer-inerweb.bat` n'en pose aucune. **L'activation est un geste
manuel de l'exploitant sur le poste** : nous ne pouvons pas vous le prouver depuis le code, et
c'est à l'établissement de vous l'attester.

**Dette consignée avec condition de réveil explicite** : à traiter **avant** toute activation
du mode réseau local, jamais après. C'est écrit dans le document de reprise du projet.

---

## 5. Ce que nos propres correctifs ont cassé — et que nos revues ont rattrapé

Nous publions cette section volontairement. Elle nous paraît plus informative sur la qualité du
processus que la liste des corrections réussies.

**Le compte réel d'abord, et de quelle campagne il s'agit.** Ces chiffres sont ceux de la
campagne des **lots B1, B2 et B3, menée les 25 et 26 juillet 2026** en réponse à votre rapport :
une revue adversariale par lot, trois au total. Elles ont levé **1 bloquant, 15 constats
importants et 19 mineurs**, plus une passe de vérification finale qui a **rouvert** l'un des
importants et ajouté un mineur et une observation. Le détail complet est
en tête de `CHANGELOG.md`, lot par lot, avec pour chacun le correctif et sa contre-épreuve.

> ⚠️ **Ne les confondez pas avec les chiffres du brief, ce sont deux campagnes différentes et
> aucune des deux pièces ne le disait.** Le brief qui accompagne ce paquet annonce « une revue
> adversariale (5 relecteurs) : 3 bloquants et 8 constats ». Celle-là est **antérieure et porte
> sur un autre périmètre** : c'est la revue du **lot L2** (suite de sécurité négative), du
> **25 juillet 2026**, qui n'est pas une réponse à votre rapport. Elle est consignée à sa propre
> section du `CHANGELOG.md` — « L2 — SUITE DE SÉCURITÉ NÉGATIVE ET NEUF TROUS FERMÉS (25/07) »,
> paragraphe « REVUE ADVERSARIALE (5 agents, 5 axes) — 3 BLOQUANTS et 8 constats, tous
> corrigés ». Deux campagnes, deux périmètres, deux comptes : **3 bloquants + 8 constats pour
> L2 ; 1 bloquant + 15 importants + 19 mineurs pour B1/B2/B3.** Ils ne s'additionnent ni ne se
> contredisent. Le brief part avec ce paquet sans porter cette précision ; elle est ajoutée ici.
Une part de ces constats vient du code d'origine. Une autre — celle qui nous intéresse ici —
a été **fabriquée par nos propres correctifs** : chacune des trois passes en a produit au moins
un. En voici cinq, choisis pour ce qu'ils enseignent. **Aucun n'était visible au filet
automatisé, qui restait vert** ; tous ont été trouvés par des relecteurs chargés de réfuter le
travail, et corrigés avant fusion.

1. **Une sous-déclaration** — `CHANGELOG.md`, lot B2 (25/07), brique **B2-4**, dont le
   paragraphe s'ouvre sur l'avertissement « la première version de cette brique a été DÉCLARÉE
   BLOQUANTE par la revue adversariale, et REMPLACÉE » *(repères : `30d7a35` puis `b0c708e` —
   ⚠️ dépôt public, hors paquet)*. Un correctif appliquait
   « sans pièce jointe, une issue de traitement ne vaut pas preuve » **au calcul de la
   déclaration annuelle**. Sur le jeu d'essai `server/test-declaration-annuelle.mjs`, **5,5 kg
   de R-410A réellement traités** (3 kg détruits, 2 kg régénérés, 0,5 kg autre traitement) **et
   1 kg de R-32 recyclé** quittaient leurs rubriques réglementaires et n'étaient plus déclarés
   à l'autorité. *(Ces masses sont celles du jeu d'essai, pas du registre du lycée : aucune
   déclaration fausse n'a été transmise.)* La barre ainsi posée ne prouvait d'ailleurs rien —
   n'importe quelle pièce comptait, et le parcours normal en pose une avant même l'attestation.
   **Règle retirée du calcul** ; le défaut de pièce est devenu une **anomalie signalée**, sans
   qu'aucune masse ne bouge. Contre-épreuve tirée : le `continue` remis dans les deux miroirs →
   5 échecs. D'où la règle inscrite dans nos consignes : *le doute retire l'allègement, jamais
   l'obligation, et jamais une masse.*
2. **Le coffre des identités percé dans l'archive scellée** — `CHANGELOG.md`, lot B3, paragraphe
   « REVUE ADVERSARIALE PASSÉE ET SOLDÉE (25-26/07) », qui le nomme : « `signatures.csv` perçait
   le coffre des identités (régression de la brique 5) » *(repères : régression introduite par la
   brique 5 `2544577`, fermée par `d1cad05` — ⚠️ dépôt public, hors paquet)*. En portant les
   signatures au dossier d'audit, un correctif y écrivait les noms bruts : dans une même archive,
   un élève au coffre apparaissait pseudonymisé dans `personnel.csv` et `mouvements.csv`, et sous
   son vrai nom dans `signatures.csv`. Contre-épreuve tirée : correctif retiré → 2 échecs, et la
   ligne fuitée s'affiche mot pour mot. **Rejouable dans le paquet** —
   `node server/test-coffre-serveur.mjs` : la vérification s'y lit en toutes lettres, « le nom
   RÉEL de l'élève au coffre n'est PAS dans `signatures.csv` ». *(Nous écrivions auparavant que
   cette contre-épreuve était « consignée dans le message de commit » : vous ne pouvez pas le
   lire, la mention est retirée.)*
3. **Un motif d'état devenu faux** — `CHANGELOG.md`, lot B3, paragraphe « LA CORRECTION AVAIT SA
   PROPRE CAUSE FAUSSE (26/07) » *(repère : `7b6ac98` — ⚠️ dépôt public, hors paquet)*. Rendre la validité honnête a fait
   ressortir toute image illisible sous le seul état qui restait : **PÉRIMÉE**, c'est-à-dire
   « la fiche a été modifiée après la signature » — alors que la fiche n'avait pas bougé. La
   ligne se contredisait elle-même : `signatures.csv` du dossier **scellé** rendait révision
   signée 0 et révision courante 0. **L'archive opposable portait donc une cause fausse.** Un
   quatrième état, `IMAGE_ILLISIBLE`, a été ajouté ; il nomme, il ne refuse rien de plus.
4. **Une accusation écrite contre une opération légitime** — `CHANGELOG.md`, lot B2, sections
   « B2 — PASSE DE REVUE ADVERSARIALE (26/07) » puis « B2 — PASSE DE VÉRIFICATION FINALE
   (26/07) », cette seconde section existant précisément parce que la première n'avait pas fermé
   la racine *(repères : `7419303` puis `027b546` — ⚠️ dépôt public, hors paquet)*.
   Le contrôle de cohérence des remises en filière accusait un transfert entrant valide ; après
   un premier correctif, la passe de vérification finale a rouvert le constat, la racine n'étant
   pas fermée : toute écriture sortante datée du même jour que la remise — précisément le
   regroupement de déchets avant enlèvement — était encore dénoncée. **L'accusation ne restait
   pas dans un journal technique : elle remontait au feu tricolore et au guide d'audit,
   c'est-à-dire aux écrans qu'un contrôleur regarde en premier.** Le module portait même un
   commentaire affirmant l'inverse de ce que le code faisait.
5. **Un écran rendu mort** — `CHANGELOG.md`, lot B1 (25/07), brique **B1-e**, « ce que la revue
   adversariale a trouvé, et qui est soldé » : le `typeInstallation` absent y est nommé, avec le
   `NOT NULL` de la colonne *(repère : `f516a3d` — ⚠️ dépôt public, hors paquet)*.
   Le filtre de qualification introduit par le lot
   comparait la charge utile brute du formulaire au contenu de la base : un `typeInstallation`
   **absent** était lu comme un changement, et l'élève prenait un 403 pour un non-changement.
   La contre-épreuve a montré plus que le constat : la même valeur nulle serait partie dans le
   patch, où SQLite l'aurait refusée (`NOT NULL`).

Nous en ajoutons un sixième, parce qu'il est le plus embarrassant et que le taire dans la
section qui publie ses défauts serait la contredire : **le correctif vedette du paquet a
d'abord échoué exactement sur les images qu'il devait refuser.** `analyseEncre` comparait les
octets bruts et répondait « il y a de l'encre », avec assurance, sur des images visuellement
blanches — RGBA d'alpha nul partout, palette 8 bits dont toutes les entrées sont blanches. Le
mensonge que le lot prétendait fermer, retourné contre lui. Le `CHANGELOG.md` le consigne au
lot B3, paragraphe de la revue adversariale : « `analyseEncre` répondait "ENCRE" AVEC ASSURANCE
sur des images visuellement blanches (alpha nul partout, palette unie) » *(repère : `58cc401` —
⚠️ dépôt public, hors paquet)*. Trouvé par la revue, fermé : le module compare désormais des
**clés visibles**, pas des octets. Rejouable dans le paquet : `node server/test-png.mjs`.

Nous en tirons une conclusion que nous soumettons au prochain auditeur : **dans ce logiciel, le
filet vert ne prouve pas l'absence de défaut** — il prouve l'absence de régression sur ce qui
est déjà testé. C'est la revue adversariale qui trouve, pas la suite.

---

## 6. Constats exacts mais périmés, déjà tranchés, corrigés, ou assumés

- **P1-08 (documents cloud)** : **partiellement périmé, partiellement confirmé — et plus grave
  que le rapport ne le disait.**
  `INSTALLATION_CLOUD.md` porte depuis le 23/07 un bandeau « ce guide décrit une intention, pas
  le logiciel livré » avant la procédure conservée comme note de conception : **périmé**.
  `SAUVEGARDE.md` promettait en revanche une sauvegarde automatique inexistante : **exact,
  corrigé dans ce paquet** le 26/07, avec une suite de balayage qui manquait :
  `node outils/test-promesses-cloud.mjs` — c'est elle, et elle seule, qui fait la preuve depuis
  le paquet *(repère : `cc486aa` — ⚠️ dépôt public, hors paquet, et non consigné au
  `CHANGELOG.md`)*.
  Surtout, ce balayage a trouvé plus grave que ce qui nous était reproché — et ce point ferme
  aussi un volet de **P1-06** : la notice d'information RGPD **affichée dans l'application**
  (section « Où sont stockées vos données ») annonçait encore un hébergement dans l'Union
  européenne « en mode Cloud ». Ce mode n'existe pas. Un guide, on peut ne pas le lire ; une
  notice d'information est précisément le document sur lequel une personne concernée se fonde.
  Corrigé le 26/07, et la racine élargie : le balayage automatique ne lisait que les `.md` de
  la racine — il n'aurait donc pas attrapé cette occurrence — il couvre désormais aussi le code
  livré, ce que la même suite `outils/test-promesses-cloud.mjs` vérifie *(repère : `0cdaa26` —
  ⚠️ dépôt public, hors paquet, et non consigné au `CHANGELOG.md`)*.
  Vérifié par ailleurs, et cela reste vrai : **aucun de ces documents n'est servi par
  l'application** (liste blanche `server/serveur.js` : seuls `index.html`, `guide.html` et
  `manifest.json` à la racine, plus `v8/` et `img/` ; tout le reste répond 404, avec ou sans
  session — `server/test-distribution-statique.mjs` le tire) **ni embarqué dans le paquet de
  livraison** (`outils/fabriquer-paquet.mjs`). Ils sont en revanche dans le paquet d'**audit**
  que vous recevez, et c'est voulu.
- **P0-07 (visas métier et DPD), volet valeur PRP du R-455A** : **déjà tranché** le 23/07, par
  une règle générale de l'auteur — en cas de valeurs concurrentes, retenir **le PRP le plus
  élevé** (il déclenche les contrôles plus tôt). La fiche du fluide porte littéralement la
  mention `AR4 — 148 conservatoire (réserve DGPR)` : un lecteur voit que ce n'est pas une source
  officielle. L'objection de fond du rapport — un registre doit déclarer la valeur de la source
  applicable, pas une valeur prudente — est **recevable et distincte** ; elle figure au dossier
  de relecture externe (`docs/T3-DOSSIER-RELECTURE-EXTERNE.md`). Le volet principal du constat
  — les visas ne sont pas obtenus — n'est pas contesté : c'est le chemin critique du projet.
- **P1-09 (calendrier F-Gas)** : **exact et déjà consigné** avant l'audit. Le vierge à
  PRP ≥ 2500 est traité et daté par usage thermique ; la fin du sursis des fluides recyclés et
  régénérés, et le palier de 2032, ne sont pas modélisés. Aucun effet aujourd'hui. Nous ne
  coderons pas ces dates sans lecture verbatim du texte applicable et validation.
- **P2-06 (double signature plus large que le minimum)** : **exact, et délibéré**, acté le
  16/07 au titre de la doctrine « jamais moins de contrôles qu'exigé ». Le risque de blocage
  que redoute le rapport ne se matérialise pas ici : le détenteur est l'établissement, le
  signataire est le professeur, et la délégation est pré-remplie. Il pourrait se matérialiser
  chez un client tiers ; aucune occurrence à ce jour.
- **P2-03 (test non portable)** : **exact pour le test, réfuté pour la production**. Le harnais
  de `server/test-distribution-statique.mjs` convertissait l'URL du serveur en chemin par
  `pathname` puis retrait du slash de tête — correct sous Windows, chemin **relatif** sous
  Unix, donc serveur enfant qui ne démarre pas. Le code de distribution n'est pas en cause
  (liste blanche et `realpath` sains). **Corrigé dans ce paquet** le 26/07, avec un balayage
  statique du même motif dans les sources — `server/`, `outils/` et `v8/` — ajouté à la suite
  elle-même : `node server/test-distribution-statique.mjs`, section 0, « Portabilité du
  harnais ». C'est cette section qui fait la preuve depuis le paquet *(repère : `e4be3e4` —
  ⚠️ dépôt public, hors paquet, et non consigné au `CHANGELOG.md`)*.
- **P2-01, P2-02, P2-04, P2-05, P2-07** (monolithes, outillage, version du moteur,
  terminologie, accessibilité) : **non traités à ce stade, assumés**. Ils n'affectent pas la
  valeur probante du registre. La fusion des deux implémentations est explicitement différée :
  la parité entre elles est aujourd'hui notre **instrument de mesure**, et on ne jette pas
  l'instrument avant la mesure.
- **P1-10 (dépendances et licences)** : **confirmé**. Le paquet de texte que vous aviez reçu ne
  permettait ni de voir les fichiers tiers ni de les dater. L'archive exécutable jointe cette
  fois les porte réellement, avec `LICENCES-TIERCES.md`. Les licences, telles que ce fichier les
  porte — c'est lui qui fait foi, pas ce mémoire : **PDF.js sous Apache 2.0**, **pdf-lib sous
  MIT**, **tslib (© Microsoft Corporation) sous Apache 2.0** — tslib est inclus dans le fichier
  `pdf-lib.min.js`, sa notice conservée en tête —, **qrcodejs sous MIT**. *(Une version
  antérieure de ce paragraphe donnait tslib « sous MIT » : c'était faux, et
  `LICENCES-TIERCES.md`, qui voyage avec ce paquet, disait déjà le contraire. Corrigé ici.)*
  Sur le classement erroné de `v8/js/lib/qrcode.js` dans ce même inventaire, voir §4. Un SBOM
  formel et une politique de mise à jour restent à produire : nous n'en revendiquons pas la
  fermeture.
- **Les constats non contestés, hors code** — **P0-01** (le mode Officiel est volontairement
  fermé : c'est une protection, nous acceptons telles quelles vos exigences de sortie),
  **P0-06** (clôture par preuve externe de l'incident des clés du service historique — suivi
  dans `docs/P0-9-REVOCATION-CLES-V7.md` ; aucun secret n'a jamais été recopié dans le dépôt),
  **P1-01** et **P1-02** (chiffrement du poste, sauvegarde hors site, test de restauration),
  **P1-03** (preuve d'intégrité seulement locale : déjà consigné avant l'audit, la parade n'est
  pas faite), **P1-05** et votre section 5 sur le même sujet (le parcours officiel de bout en
  bout n'a jamais tourné en production ; la répétition générale
  `outils/repetition-generale-officiel.mjs` ne la remplace pas), **P1-06** (gouvernance RGPD :
  responsable de traitement, DPD, durées de conservation), **P1-07** (qualification formelle de
  l'AIPD — le logiciel ne doit pas s'auto-exempter) et votre section 11 (risques d'exploitation :
  horloge, disque plein, antivirus, migration interrompue, poste unique — votre garde
  d'exploitation est acceptée telle quelle et figurera à la procédure d'ouverture). Aucun de ces
  points ne se tire contre un serveur. Ils relèvent de l'établissement : relecture par un
  organisme agréé fluides frigorigènes (`docs/T3-DOSSIER-RELECTURE-EXTERNE.md`, 11 questions
  écrites, plus 6 au délégué à la protection des données), chiffrement du poste et sauvegarde
  hors site, dossier RGPD. **Nous n'en revendiquons aucune fermeture ici.**

---

## 7. Une erreur factuelle du rapport, et une de la nôtre

Nous les signalons pour que le prochain audit parte de bases exactes. Chacune est datée : le
paquet que vous recevez n'est plus celui qui a été audité, et un chiffre sans sa version n'a
aucun sens. Le titre est au singulier à dessein : sur les trois chiffres examinés ci-dessous,
**une seule erreur du rapport est établie** — les migrations. Sur les deux autres, le rapport a
raison et c'est nous qui nous étions trompés ; nous le disons à leur place respective.

- **« 32 migrations » (§3)** : le registre `server/migrations.js` est numéroté à partir de 2.
  Il allait jusqu'à la migration **n° 35** au moment de l'audit — soit **34 migrations**,
  numérotées de 2 à 35 — et jusqu'à la **n° 36** aujourd'hui, soit **35 migrations**. Nous
  précisons la distinction parce que ce paragraphe corrige un comptage : il doit être
  irréprochable sur le sien.
- **« environ 8 900 lignes » pour le dispatcher** : **le rapport a raison sur la version qu'il
  a auditée** — `server/api.js` y compte exactement **8 896 lignes**
  (`git show c32f8c0:server/api.js | wc -l`). Dans le paquet que vous recevez, les correctifs
  l'ont portée à **9 412**. Nous avions d'abord opposé 8 451 : c'était un artefact de comptage
  de notre part, corrigé par notre propre vérification. Nous le mentionnons parce qu'un audit
  se juge aussi à ce qu'on lui concède.
- **Les 16 échecs de tests (§5)** : **l'affirmation du rapport est exacte — mais elle porte sur
  le PAQUET, pas sur le logiciel.** Le générateur de paquet exclut par construction le dossier
  `v8/js/lib/` **entier** — cinq fichiers, dont quatre de bibliothèques tierces et un module
  maison, voir §4 —, le gabarit CERFA (présent en deux exemplaires) et, plus
  largement, **tout fichier non-code** : il ne retient que neuf extensions. L'arithmétique,
  refaite sur l'arbre audité :
  - en retirant de `c32f8c0` le dossier `v8/js/lib/` et le gabarit CERFA, on obtient **exactement
    14 échecs sur 14 suites**, nommées ci-dessous ;
  - en retirant **aussi les `.png`** — le paquet n'en transporte aucun —, une quinzième
    tombe : `server/test-distribution-statique.mjs`, sur `/img/icon-192.png` en 404. Le retrait
    des seuls `.png` suffit : c'est le seul fichier de `img/` que cette suite demande ;
  - **la seizième, nous ne la reproduisons pas, et nous ne savons pas laquelle c'est.** Nous
    avions d'abord cru pouvoir l'imputer au constat P2-03 — le harnais non portable hors
    Windows. C'est impossible : la suite en cause est `server/test-distribution-statique.mjs`,
    déjà celle qui produit la quinzième, et une suite ne peut échouer qu'une fois. Nous
    reproduisons donc **quinze échecs sur seize**, et nous préférons vous le dire ainsi plutôt
    que d'annoncer « reproduits à l'identique ». **Si vous nous nommez la seizième suite, nous
    l'instruirons.**

  Les 14, nominativement, pour que vous n'ayez pas à les redécouvrir :
  `v8/js/cerfa/test-correction.mjs`, `v8/js/cerfa/test-generateur.mjs`,
  `v8/js/data/test-lot1.mjs`, `v8/js/data/test-scenario-lot1.mjs`,
  `v8/js/documents/test-bon-intervention.mjs`, `v8/js/documents/test-dossier-audit.mjs`,
  `v8/js/documents/test-etiquette-bouteille.mjs`, `v8/js/documents/test-etiquette-machine.mjs`,
  `v8/js/documents/test-exports.mjs`, `v8/js/documents/test-feuille-mise-en-service.mjs`,
  `v8/js/documents/test-fiche-identification-machine.mjs`,
  `v8/js/modales/test-bouteille-form.mjs`, `v8/js/wizard/test-wizard.mjs`,
  `v8/test-chargement.mjs`. Toutes échouent sur un `Cannot find module` visant
  `v8/js/lib/qrcode.js` ou `v8/js/lib/pdf-lib.min.js`. Sur le dépôt complet, le filet passe
  TOUT VERT.
- **Ce que nous corrigeons à la racine (constats P0-08 et P1-10)** : le paquet du 25/07 ne
  contenait que du texte concaténé — vous ne pouviez **rien exécuter**, et vous nous l'avez
  reproché à juste titre. Ce paquet-ci joint une **archive exécutable du dépôt**, bibliothèques
  tierces et gabarit CERFA compris. Toutes les commandes de l'annexe s'y lancent, sans rien
  installer : il n'y a ni `package.json`, ni gestionnaire de paquets, ni téléchargement. Seul
  Node est requis.
- **Notre propre erreur, la plus coûteuse** : le brief remis à l'auditeur annonçait « deux
  modes, strictement séparés » et présentait les écritures Formation comme « modifiables » face
  à des écritures Officiel « scellées ». **C'est faux** : une écriture Formation validée porte
  une empreinte chaînée et refuse la suppression, exactement comme une officielle. Ce paragraphe
  est très probablement la source du malentendu du §3. Il est réécrit dans ce paquet, et il
  porte désormais l'avertissement de sa propre erreur.

---

## 8. Ce que nous demandons au prochain audit

1. **Traitez le §3 en premier.** Si vous maintenez qu'il faut deux univers de données, traitez
   le contrefactuel : le gaz part réellement dans la machine, la fiche est inerte, l'inventaire
   physique est saisi. Que devient la balance ? Le banc est joint —
   `node docs/banc-contrefactuel-P0-02.mjs inerte` — et vous pouvez le modifier : il tient en
   une page et ne touche aucune donnée réelle. Traitez aussi le §3.3 : la déclaration annuelle
   est la version la plus solide de votre constat, et c'est là que nous vous répondons le plus
   frontalement.
2. **Attaquez les correctifs, pas seulement le code d'origine.** Dans cette campagne, plusieurs
   défauts sont nés des corrections elles-mêmes, et chacune des trois passes en a produit au
   moins un (§5). Les nôtres n'ont pas de raison d'échapper à la règle.
3. **Prenez la suite de sécurité négative comme point d'entrée**
   (`node server/test-securite-negative.mjs`, **207 attaques et preuves** au dernier tir). C'est
   le répertoire des refus déjà prouvés. Si une attaque que vous jugez évidente n'y figure pas,
   dites-le-nous : c'est un manque de notre répertoire.
4. **Le métier, dites-le-nous quand il vous manque.** Ce logiciel sert un atelier de lycée
   professionnel où les élèves manipulent du fluide réel sur un parc réel. Deux audits
   successifs ont buté sur ce point : nous en concluons que c'est **notre documentation** qui
   l'exposait mal, et nous l'avons réécrite (§7). Si une exigence vous paraît évidente et que
   nous la discutons, c'est qu'elle produit peut-être en atelier un effet que nous n'avons pas
   su décrire — dites-le, nous répondrons.
5. **Les points que nous savons ouverts** : **aucune intervention n'est aujourd'hui soumise au
   régime opposable — le verrou fermé, les conditions bloquantes ne s'exercent sur rien** (§3.2),
   et le partage exact qu'il faudra faire à l'ouverture est une **décision de l'auteur non
   tranchée**, sur laquelle votre avis nous serait utile avant qu'elle ne le soit ; le témoin
   d'intégrité du journal se recalcule
   (l'algorithme est dans le code diffusé ; la parade — confrontation au témoin de scellement
   externe quotidien — n'est pas faite) ; le modèle de menace s'arrête à l'accès disque ; le
   mode Officiel n'a jamais tourné en production ; le poste est unique ; et **certaines valeurs
   réglementaires** (seuils d'aptitude, exemption hermétique, dates de la condition 10) sont
   codées de façon délibérément conservatrice en attendant la confirmation d'un organisme
   agréé — elles sont listées dans `docs/T3-DOSSIER-RELECTURE-EXTERNE.md`. Inutile de les
   chercher, elles sont là. Dites-nous plutôt s'il en manque.

---

## Annexe — comment vérifier chaque affirmation de ce mémoire

**Ce que vous avez sous la main, et ce que chaque support permet.**

1. **L'archive exécutable du dépôt**, jointe à ce paquet : un arbre réel, bibliothèques tierces
   et gabarit CERFA compris. **C'est là que se lancent les commandes.** Rien à installer : le
   projet n'a ni `package.json`, ni gestionnaire de paquets, ni dépendance à télécharger. Seul
   Node est requis. Les commandes se lancent depuis la racine de l'archive.
2. **Les volumes de texte `CODE-NN.txt`** : le code entier à la lecture, pour citer un fichier
   et une ligne sans monter l'arbre. On n'y exécute rien.
3. **Les documents `.md`**, dont ce mémoire, la table des 31 constats, le `CHANGELOG.md` et les
   plans de lot.
4. **Ce que le paquet ne contient pas : l'historique `git`.** Quelques vérifications le
   demandent — comparer le paquet d'aujourd'hui à la version que vous avez auditée. Elles sont
   **marquées ci-dessous**, et elles sont faisables sur le dépôt public du projet
   (`https://github.com/frigorx/-inerweb-fluid-cerfa-fi-bsd-4`), hors paquet. Aucune ligne de ce
   tableau n'est infaisable sans que nous le disions.

| Ce qui est affirmé | Comment le vérifier | Où |
|---|---|---|
| Le filet passe TOUT VERT, 121 exécutions | `node outils/lancer-tests.mjs --tout` | archive exécutable |
| La suite de sécurité négative compte 207 attaques et preuves | `node server/test-securite-negative.mjs` | archive exécutable |
| Aucune borne de taille ne sépare une case vierge d'une signature (3 879 / 3 893 / 4 892 o…) | `node outils/test-taille-signature.mjs` | archive exécutable |
| Le contrefactuel du §3.2 | `node docs/banc-contrefactuel-P0-02.mjs inerte` puis `… vivant` | archive exécutable |
| Le facteur de travail scrypt est de l'ordre de 0,2 s | le `node -e` du §4 (P1-04), reproduit tel quel | n'importe où, Node seul |
| `server/api.js` compte 9 412 lignes aujourd'hui | `wc -l server/api.js` | archive exécutable |
| La déclaration annuelle ne connaît pas le mode | lire `server/declaration-annuelle.js` : le mot « mode » n'y figure pas | archive ou `CODE-NN.txt` |
| Le CERFA Formation porte filigrane et mention « document non officiel » | `v8/js/cerfa/generateur.js` : `MENTION_FORMATION`, filigrane sous `if (formation)` | archive ou `CODE-NN.txt` |
| Le résidu de chiffres périmés est dans le seul fichier du front | `v8/js/data/signatures-mouvement.js` lignes 20-21, et **absence** dans `server/signatures-mouvement.js` | archive ou `CODE-NN.txt` |
| À l'import, la forme du numéro de suivi n'est pas exigée, l'unicité l'est | `problemeNumerosSuivi` vs `verifierNumeroSuivi`, `v8/js/data/remise-filiere.js` | archive ou `CODE-NN.txt` |
| Le verrou de livraison est fermé | `VERROU_LIVRAISON = true` dans `server/blocage-officiel.js` et `v8/js/data/blocage-officiel.js` | archive ou `CODE-NN.txt` |
| Le traitement des 31 constats, un par un | `docs/TABLE-CONSTATS-AUDIT-2026-07-25.md` | documents du paquet |
| Les anciens chiffres de taille sont rétractés par nous | `CHANGELOG.md`, lot B3 ; `docs/PLAN-B3-SIGNATURE.md` § « Honnêteté sur les chiffres » | documents du paquet |
| Les décisions du détenteur sur la signature (D1, D2, D3) | `docs/PLAN-B3-SIGNATURE.md` §3 | documents du paquet |
| La condition n° 18 et le refus d'un troisième objet | `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` | documents du paquet |
| Le compte des constats des trois revues, lot par lot | tête de `CHANGELOG.md` | documents du paquet |
| La forme non exigée à l'import est une décision, pas un oubli | `CHANGELOG.md`, brique B2-3 | documents du paquet |
| L'empreinte de la version que vous avez auditée | `sha256sum` sur l'archive `inerweb-fluide-PAQUET-AUDIT.zip` reçue le 25/07 | **chez vous** — nous ne pouvons pas vous la fournir |
| Le filet passait à 106 exécutions sur la version auditée | `git checkout c32f8c0` puis `node outils/lancer-tests.mjs --tout` | ⚠️ **dépôt public, hors paquet** |
| `server/api.js` comptait 8 896 lignes à l'audit | `git show c32f8c0:server/api.js \| wc -l` | ⚠️ **dépôt public, hors paquet** |
| 34 migrations (n° 2→35) à l'audit ; 35 (n° 2→36) aujourd'hui | aujourd'hui : lire `server/migrations.js` dans l'archive ; à l'audit : `git show c32f8c0:server/migrations.js` | archive **+** ⚠️ dépôt public |
| Le pré-remplissage du signataire existait avant l'audit | `git show c32f8c0:v8/js/data/parcours-signature.js` | ⚠️ **dépôt public, hors paquet** |
| Les 14 échecs du paquet, reproduits | extraire `c32f8c0`, retirer `v8/js/lib/` et les deux `cerfa_15497-04_officiel.pdf`, relancer le filet | ⚠️ **dépôt public, hors paquet** |
| Les 15 échecs, images comprises | même manipulation, en retirant aussi les `.png` (les seuls en cause : la 15ᵉ suite ne demande que `/img/icon-192.png`) | ⚠️ **dépôt public, hors paquet** |
| Les treize identifiants de commit cités dans ce mémoire | ils ne sont ni dans le paquet ni dans le `CHANGELOG.md` — voir l'avertissement du §2 : chaque correctif y est rattaché à une pièce du paquet | ⚠️ **dépôt public, hors paquet** |
| `v8/js/lib/qrcode.js` est du code maison, pas du tiers | `wc -l v8/js/lib/qrcode.js` → 37 ; ouvrir le fichier : en-tête en français, non minifié, une fonction `obtenirQRCode()` qui lit `window.QRCode` | archive exécutable |
