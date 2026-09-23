# ❄ inerWeb **Édu** — TP « Le contacteur qui se souvient »

**Le circuit de commande à auto-maintien**
Observer · nommer · câbler · dépanner · compléter pour un compresseur

*par F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO*

> **Origine du document.** Aucun TP existant sur l'auto-maintien n'a été trouvé dans les modules
> pédagogiques du dépôt (`pedagogie/`). Le seul contacteur qui y apparaît est celui du compresseur,
> dans les pièges de câblage du thermostat du Circuit Fantôme. Ce TP est donc une **création**,
> née d'une illustration vue sur un réseau social (platine + schéma d'un contacteur auto-bloquant)
> et entièrement redessinée : voir `README.md` pour ce qui a été repris et ce qui ne l'a pas été.
> Il reste à confronter à la base indexée de l'enseignant avant première utilisation.

---

## Section 1 — En-tête

| | |
|---|---|
| **Classe visée** | CAP IFCA 1re année (cible principale) |
| **Adaptations prévues** | BAC PRO MFER 1re année · 2nde TNE · élèves TDAH / DYS (voir § 10) |
| **Diplôme** | CAP Installateur en Froid et Conditionnement d'Air |
| **Compétences visées** | `C2.2 Contrôler les éléments` ; `C3.6 Câbler` ; `C3.7 Contrôler` ; `C5.1 Remplacer des composants` ; `C1.3 Rendre compte` |
| **Savoirs associés** | `S2 Graphique` ; `S5 Technologie frigorifique` ; `S6 Prévention des risques` |
| **Habilitation** | Travaux hors tension sous la responsabilité de l'enseignant ; mise sous tension par l'enseignant seul. Cadre : NF C 18-510. |
| **Durée** | 3 h — séance 1 de 2 h (observer, nommer, câbler, dépanner) · séance 2 de 1 h (compléter, panne réelle, évaluation) |
| **Date** | _____ / _____ / 2026 |
| **Modalité** | Ateliers numériques en individuel · câblage et dépannage réel en binôme |
| **Outil** | `pedagogie/contacteur-automaintien/index.html` (4 ateliers) · `fiche-eleve.html` (3 pages A4) |

---

## Section 2 — Objectifs pédagogiques

1. **Je décris** ce que fait le contacteur à chaque manœuvre (Marche, Arrêt, coupure de Q1) et **je nomme** le contact qui le maintient collé.
2. **Je repère** sur la platine réelle les huit bornes nommées sur le schéma développé : A1, A2, 13, 14, 1-2, 3-4, et les sorties de Q1.
3. **Je câble** hors tension un circuit de commande à auto-maintien conforme au schéma, fils repérés, embouts sertis, sans reprise après contrôle.
4. **Je contrôle** à l'ohmmètre les contacts et la bobine avant toute mise sous tension, et **je fais valider** par l'enseignant.
5. **Je diagnostique** un câblage fautif à partir du seul comportement du contacteur, et **je dis** comment je le vérifie.
6. **Je place** les sécurités, un second poste de commande et un voyant sur le schéma, et **j'explique** pourquoi le thermostat ne va pas dans la ligne maintenue.

---

## Section 3 — Prérequis

L'élève coche. Un prérequis non coché ne bloque pas la séance mais signale à l'enseignant un rappel à faire en lancement.

- [ ] Je sais ce qu'est un circuit fermé et un circuit ouvert, et que le courant ne passe que si le chemin est complet.
- [ ] Je sais lire une tension et une résistance sur un multimètre, et je sais que l'ohmmètre s'utilise **hors tension**.
- [ ] Je sais ce qu'est un contact NO et un contact NC, au moins sur un interrupteur ou un bouton.
- [ ] Je sais qu'un contacteur est un interrupteur commandé par une bobine, et qu'il sert à alimenter un moteur ou un compresseur.
- [ ] Je connais la règle de l'atelier : on ne touche pas à un fil sans que Q1 soit coupé et cadenassé.

---

## Section 4 — Matériel

**Par élève**
1. Poste informatique ou tablette avec le TP interactif (× 1)
2. Fiche élève imprimée, 3 pages A4 recto-verso (× 1)
3. Stylo bleu + surligneur orange (× 1)

**Par binôme, pour la platine réelle**
4. Platine didactique de câblage avec rail DIN (× 1)
5. Disjoncteur bipolaire de commande, **calibre 2 A courbe C** (× 1) — pas un 32 A : une bobine consomme quelques VA
6. Contacteur tripolaire, bobine 230 V ~, avec un bloc de contacts auxiliaires portant au moins un **13-14** et un **21-22** (× 1)
7. Bouton poussoir rouge « Arrêt » avec bloc contact **NC 1-2** (× 1)
8. Bouton poussoir vert « Marche » avec bloc contact **NO 3-4** (× 1)
9. Fil souple H07V-K 1,5 mm² : rouge (commande) et bleu (neutre) — consommable, environ 3 m par binôme
10. Embouts de câblage 1,5 mm² — consommable (× 20)
11. Pince à dénuder, pince à sertir les embouts, tournevis isolés 1 000 V (× 1 jeu)
12. Multimètre avec fonction ohmmètre (× 1)
13. Vérificateur d'absence de tension (VAT) (× 1 pour deux binômes)
14. Cadenas de consignation avec étiquette (× 1)
15. Documentation constructeur du contacteur utilisé — pour la résistance de bobine et les repères des blocs auxiliaires (× 1 au bureau)

**Facultatif, séance 2** : un relais thermique F1 avec son contact 95-96, pour câbler réellement la première sécurité de l'atelier 4.

> **Point sur les valeurs.** Le TP ne donne aucune valeur de résistance de bobine : elle dépend du constructeur et de la tension de bobine. C'est la documentation du contacteur de l'atelier qui la fournit, et c'est l'élève qui la relève sur la fiche, partie C. Cette absence est volontaire.

---

## Section 5 — Consignes de sécurité

Le simulateur ne présente aucun risque. **La platine réelle, si.** C'est un circuit 230 V, et c'est souvent le premier câblage sous tension de l'élève.

> ### ⚠ Point sécurité — risque électrique
> **On câble hors tension, toujours.** Avant le premier fil : Q1 coupé, cadenas posé, étiquette au nom du binôme, absence de tension vérifiée au VAT sur les bornes aval de Q1. Personne ne retire un cadenas qui n'est pas le sien.
> **La mise sous tension est faite par l'enseignant, et par lui seul**, après contrôle visuel du câblage et lecture du tableau de contrôles à l'ohmmètre de la fiche (partie C). Un binôme qui met sous tension sans appel perd la manipulation pour la séance.
> Tournevis isolés 1 000 V, pas de bijoux aux mains, manches relevées. Après la mise sous tension, **on ne touche plus aux bornes** : les essais se font sur les boutons.

> ### ⚠ Point sécurité — EPI
> Chaussures de sécurité et lunettes dès l'entrée sur le plateau. Les lunettes protègent des brins de cuivre à la coupe et au dénudage, pas seulement des projections.

> ### ⚠ Point sécurité — moteur ou charge en puissance (si raccordé)
> Si un moteur est raccordé sur les pôles de puissance, il **démarre à l'impulsion** et reste en marche : rien ne doit être posé sur ou près de l'arbre. Un moteur qui repart seul après une coupure de Q1 est un défaut grave : c'est justement ce que l'auto-maintien empêche, et l'élève doit le vérifier.

**Conduite en cas d'incident.** Couper l'arrêt d'urgence général de l'atelier (emplacement rappelé oralement en lancement). Ne pas toucher une personne en contact avec une partie sous tension avant la coupure. Alerter l'enseignant, puis le SST de l'établissement ; en cas de brûlure ou de perte de connaissance, appeler le 15 ou le 112. Trousse de secours : à l'emplacement affiché à l'entrée du plateau.

---

## Section 6 — Déroulement

### La notion à planter : la mémoire d'un contact

Tout le TP tient dans une phrase que l'élève doit pouvoir dire à la fin :

> **Le contacteur ferme lui-même le contact qui le maintient alimenté. Tant que rien ne coupe ce chemin, il se souvient de l'ordre de marche.**

D'où l'ordre des ateliers. On ne commence pas par le schéma : on commence par **le comportement**. L'élève appuie, relâche, coupe, réarme, et constate que le contacteur garde la mémoire d'une impulsion. Ce n'est qu'après avoir vu qu'on nomme le 13-14, puis qu'on explicite pourquoi il est en parallèle de la Marche et pourquoi l'Arrêt est en série. Les questions de l'atelier 1 **ne s'ouvrent pas** avant que le simulateur ait enregistré les trois observations. C'est une contrainte volontaire.

---

### Séance 1 — 2 h

#### Minute 0 à 10 — Lancement collectif : « Comment il sait ? »

Sur la platine de démonstration, sous tension, l'enseignant appuie sur Marche, relâche : le contacteur reste collé. Question à la classe : *« Le bouton est relâché. Qui tient le contacteur ? »*

Laisser proposer. Les réponses habituelles : « le bouton reste enfoncé à l'intérieur », « c'est un aimant », « c'est électronique ». Ne rien corriger. Appuyer sur Arrêt, couper Q1 pendant la marche, réarmer : le contacteur ne repart pas. *« Et là, il a oublié. Pourquoi ? »*

Distribuer la fiche élève. Annoncer : *« Vous allez trouver la réponse vous-mêmes sur le simulateur, puis la câbler pour de vrai. »*

#### Minute 10 à 35 — Atelier 1 : Observer

Individuel, sur poste. L'élève manœuvre le pupitre avec le courant affiché en orange sur la platine et sur le schéma développé. Il remplit le tableau A de la fiche **à chaque manœuvre** — pas après.

Les trois observations que le simulateur attend :
1. je relâche Marche, le contacteur reste collé ;
2. j'appuie sur Arrêt, il retombe ;
3. je coupe Q1 pendant la marche et je réarme, il ne repart pas.

Puis cinq questions, avec la bonne réponse expliquée à chaque fois. Validation à 4 / 5.

**Le point qui fait l'atelier.** L'observation 3. Beaucoup d'élèves pensent que « le courant revient, donc le moteur revient ». Non : la mémoire est tombée avec la bobine. C'est une **sécurité**, pas un défaut, et c'est la raison d'être de ce montage sur toute machine qui ne doit pas redémarrer seule.

**Posture enseignant.** Ne pas expliquer le 13-14 avant que l'élève ait vu le courant y passer sur le dessin. La question « qui alimente la bobine quand tu relâches ? » se pose devant l'écran, en montrant le segment orange.

**Trace écrite.** Tableau A complété, et la phrase à retenir complétée : *13-14 · parallèle · auto-maintien*.

#### Minute 35 à 50 — Atelier 2 : Relier

Individuel. Huit bornes nommées sur le schéma développé, à cliquer sur la platine, une chance par borne. L'organe concerné est surligné sur le schéma.

**Le point qui fait l'atelier.** A1 en haut à gauche, A2 en bas à droite : l'élève cherche A2 à côté de A1 et ne la trouve pas. Le contacteur réel les met souvent en diagonale, et le schéma ne le dit pas. C'est précisément ce que l'atelier fait vivre.

**Trace écrite.** Partie B de la fiche : schéma développé complété (repères et bornes), puis A1, A2, 13, 14 et les bornes des boutons reportées sur la platine dessinée. L'enseignant vise la partie B avant d'autoriser le câblage.

#### Minute 50 à 60 — Pause obligatoire

#### Minute 60 à 100 — Câblage réel, en binôme

Sur la platine du binôme. Ordre imposé :

1. **Consignation** : Q1 coupé, cadenas, étiquette, VAT. Les quatre cases de la partie C cochées.
2. **Un fil, une ligne.** Chaque fil posé est inscrit dans le tableau de câblage (de · vers · couleur) **avant** de poser le suivant. Un élève tient le tableau, l'autre câble ; ils échangent à mi-parcours.
3. **Contrôles à l'ohmmètre**, hors tension, les cinq mesures de la fiche : 13-14 au repos et armature enfoncée, A1-A2, S1 au repos, S2 au repos. La résistance de bobine se compare à la documentation constructeur, relevée au bureau.
4. **Appel de l'enseignant.** Contrôle visuel, lecture du tableau, retrait du cadenas par le binôme, mise sous tension par l'enseignant.
5. **Les six manœuvres du tableau A, sur le réel.** L'élève compare avec le simulateur et note l'écart éventuel. Il n'y en a normalement aucun : c'est ce qui donne confiance dans le simulateur pour l'atelier suivant.

**Le point qui fait l'atelier.** Le fil du 13. Il doit partir de la **borne 2 de S1** — la sortie de l'Arrêt — et pas de la borne 1. Pris avant l'Arrêt, le maintien contourne l'Arrêt : le moteur démarre, et rien ne l'arrête sauf Q1. C'est la faute la plus fréquente et la plus dangereuse ; la vérification visuelle de l'enseignant porte d'abord sur ce fil.

**Différenciation.** Le binôme qui a fini et validé insère une panne sur sa propre platine, hors tension, à la demande de l'enseignant (voir § 9, table des pannes), pour le binôme voisin.

#### Minute 100 à 120 — Atelier 3 : Dépanner

Individuel, sur poste. Sept platines dans le désordre — le câblage conforme en fait partie. Le courant est invisible et le schéma ne montre pas la faute : seuls le contacteur et les boutons renseignent. L'élève manœuvre, écrit ce qu'il observe dans le tableau D, pose son diagnostic. Après réponse, le schéma révèle le câblage réel de la platine, et le retour donne la vérification à faire à l'ohmmètre ou en suivant le fil.

**Le point qui fait l'atelier.** Le contacteur qui **bat** : le maintien pris sur un 21-22 au lieu d'un 13-14. Dès qu'il colle, il se coupe lui-même. Les élèves reconnaissent le bruit dès la première fois qu'ils l'ont entendu en atelier : c'est un symptôme qu'on n'oublie pas. Validation à 5 / 7.

**Trace écrite.** Tableau D, sept lignes, la ligne « réel » réservée à la séance 2.

---

### Séance 2 — 1 h

#### Minute 0 à 20 — Atelier 4 : Compléter pour un compresseur

Individuel. Six organes à placer : relais thermique F1, pressostat HP, second Arrêt, second Marche, voyant H1, thermostat. À chaque bonne réponse, l'organe apparaît sur le schéma et l'élève peut le manœuvrer, courant affiché. Validation à 5 / 6.

**Le point qui fait l'atelier, et le TP.** Le thermostat. Placé en série dans la ligne maintenue, chaque ouverture ferait tomber le maintien : à la remontée de température, le compresseur ne repartirait jamais seul. **Un organe de régulation ne va pas dans une ligne à auto-maintien.** L'auto-maintien autorise la marche de l'installation ; la régulation est l'étage d'après, qui commande l'électrovanne (pump down, atelier 10 du Circuit Fantôme) ou un contacteur sans maintien. C'est le pont avec le module précédent, et c'est ce qui fait de ce TP un TP de frigoriste et pas seulement d'électricien.

**Règle à faire écrire au tableau :** *les arrêts et les sécurités en série · les marches en parallèle · le voyant en parallèle de la bobine · la régulation ailleurs.*

#### Minute 20 à 45 — La panne réelle, en binôme

Chaque binôme reçoit la platine d'un autre binôme, sur laquelle une panne de la table du § 9 a été insérée hors tension par l'enseignant ou par le binôme précédent. Consignation, observation sous tension (mise sous tension par l'enseignant), diagnostic, **puis vérification hors tension** à l'ohmmètre ou en suivant le fil, puis réparation, puis nouvelle validation avant remise sous tension.

Ce qui est évalué ici, c'est **la méthode** : observer avant d'ouvrir, formuler une hypothèse, la vérifier avec l'instrument, réparer, revalider. Un élève qui trouve la panne en refaisant tout le câblage n'a pas dépanné.

#### Minute 45 à 60 — Synthèse et auto-positionnement

Trois questions, trois élèves différents, au tableau :
1. Qui tient le contacteur quand le bouton Marche est relâché ?
2. Pourquoi le moteur ne repart-il pas seul après une coupure de courant ?
3. Où va le relais thermique, et où ne va pas le thermostat ?

Puis partie F de la fiche : l'élève se positionne (colonne A) avant la correction de l'enseignant (colonne B), et rédige la synthèse en cinq lignes.

---

## Section 7 — Évaluation

| Compétence | Indicateur observable | A (élève) | B (prof) |
|---|---|:---:|:---:|
| `C2.2 Contrôler les éléments` | Retrouve sur la platine 6 des 8 bornes nommées sur le schéma ; partie B complète et juste | ☐ ☐ ☐ | ☐ ☐ ☐ |
| `C3.6 Câbler` | Circuit conforme au schéma, hors tension, fils repérés, embouts sertis, tableau de câblage tenu fil par fil, sans reprise après contrôle | ☐ ☐ ☐ | ☐ ☐ ☐ |
| `C3.7 Contrôler` | Les 5 mesures à l'ohmmètre faites et cohérentes avec l'attendu **avant** l'appel ; résistance de bobine comparée à la documentation | ☐ ☐ ☐ | ☐ ☐ ☐ |
| `C5.1 Remplacer des composants` | Au moins 5 diagnostics justes sur 7 platines simulées ; sur la panne réelle, hypothèse formulée puis vérifiée à l'instrument avant réparation | ☐ ☐ ☐ | ☐ ☐ ☐ |
| `C1.3 Rendre compte` | Synthèse de 5 lignes qui nomme l'auto-maintien, le rôle du 13-14, la série pour les arrêts et les sécurités, et le cas du thermostat | ☐ ☐ ☐ | ☐ ☐ ☐ |
| `S6 Prévention des risques` | Consignation faite sans rappel : cadenas, étiquette, VAT ; aucune mise sous tension sans l'enseignant | ☐ ☐ ☐ | ☐ ☐ ☐ |

Trois cases : **Acquis** / **En cours** / **Non acquis**.

L'indicateur qui discrimine est celui de `C5.1` sur la panne réelle : il ne s'obtient ni par mémorisation, ni par le simulateur seul.

---

## Section 8 — Documents à remettre

1. **La fiche élève complète** — tableau A, schémas B complétés, tableau de câblage et contrôles C, tableau D avec la ligne « réel », partie E, auto-positionnement et synthèse F.
2. **Le relevé de la documentation constructeur** — résistance de bobine attendue, repères des blocs auxiliaires du contacteur utilisé.
3. **La platine câblée, validée**, remise en état de consignation (Q1 coupé, cadenas retiré, fils en place) pour le binôme suivant.

---

## Section 9 — Corrigé et éléments attendus

### Le schéma développé — repères et bornes

| Repère | Organe | Contact | Bornes | Position |
|---|---|---|---|---|
| Q1 | Disjoncteur de commande bipolaire, 2 A | — | 1-2 (phase), N | En tête, coupe phase **et** neutre |
| S1 | Bouton Arrêt, rouge | NC | 1-2 | **En série**, après Q1 |
| S2 | Bouton Marche, vert | NO | 3-4 | Entre le nœud A (sortie de S1) et le nœud B (A1) |
| KM1 13-14 | Contact auxiliaire du contacteur | NO | 13-14 | **En parallèle de S2**, entre A et B |
| KM1 A1-A2 | Bobine du contacteur, 230 V ~ | — | A1-A2 | A1 sur le nœud B, A2 au neutre |

Convention à faire respecter : **A1 reçoit la commande, A2 retourne au neutre.** Électriquement, l'inverse fonctionne sur une bobine alternative ; mais sur les contacteurs à bobine électronique ou à courant continu, la polarité compte, et l'habitude se prend maintenant.

### Le tableau A — ce que fait KM1

| Manœuvre | KM1 | Chemin vers A1 |
|---|---|---|
| Q1 enclenché, rien d'autre | au repos | aucun : S2 ouvert, 13-14 ouvert |
| Marche appuyé | collé | Q1 → S1 (1-2) → S2 (3-4) → A1 |
| Marche relâché | **reste collé** | Q1 → S1 (1-2) → **KM1 13-14** → A1 |
| Arrêt appuyé | au repos | aucun : S1 ouvert coupe tout |
| Arrêt relâché | au repos | aucun : 13-14 s'est ouvert avec la bobine |
| Q1 coupé puis réarmé | au repos | aucun : la mémoire est tombée avec la bobine |

### Le tableau D — les sept platines

| Câblage | Ce qu'on observe | Vérification attendue |
|---|---|---|
| Conforme | Impulsion, maintien, arrêt franc, pas de redémarrage | Rien à réparer |
| 13-14 non câblé | Ne colle que Marche tenu | Ohmmètre 13-14 armature enfoncée : 0 Ω ; suivre les deux fils |
| 13-14 pris en amont de S1 | Démarre, se maintient, **l'Arrêt ne fait rien** | Le fil du 13 doit partir de S1 borne 2, pas de la borne 1 |
| S1 en parallèle de S2 | Démarre seul à la mise sous tension, rien ne l'arrête | S1 borne 1 et S2 borne 3 ne doivent pas être sur le même fil |
| S2 sur un bloc NC | Démarre seul ; l'Arrêt tient, relâché ça repart | Ohmmètre S2 au repos : 0 Ω = mauvais bloc, il faut le 3-4 |
| Maintien sur 21-22 | **Le contacteur bat** | Lire les repères du bloc auxiliaire : il faut 13-14 |
| Bobine coupée ou A2 desserrée | Rien ne bouge | Ohmmètre A1-A2 : ∞ = bobine ; sinon serrage de A2 |

Ces sept cas sont aussi les pannes à insérer sur les platines réelles en séance 2. **Ne jamais insérer « S1 en parallèle »** sur une platine dont la puissance est raccordée à un moteur : il démarrerait à la mise sous tension.

### L'atelier 4 — où va chaque organe

| Organe | Place | Pourquoi |
|---|---|---|
| F1 thermique 95-96 | Série, ligne d'arrêt | Coupe le maintien ; après réarmement, il faut réappuyer sur Marche |
| Pressostat HP | Série, ligne d'arrêt | Une sécurité coupe le chemin unique |
| S3 second Arrêt | Série | L'un ou l'autre coupe |
| S4 second Marche | Parallèle de S2 | L'un ou l'autre lance, le 13-14 prend le relais |
| H1 voyant | Parallèle de la bobine, A1-A2 | Allumé exactement quand la bobine est alimentée ; il informe, il ne commande pas |
| Thermostat | **Pas dans cette ligne** | En série, chaque ouverture tuerait le maintien ; il commande l'électrovanne ou un contacteur sans maintien |

### Points de vigilance à la correction

- **Sanctionner** un fil du 13 pris en amont de S1, même si « ça marche » : c'est un défaut de sécurité, pas une variante.
- **Ne pas sanctionner** un A1/A2 inversé au premier câblage, mais le faire corriger et l'expliquer : la convention protège les montages à venir.
- Un élève qui écrit « le bouton reste enfoncé » dans le tableau A après l'atelier 1 n'a pas regardé le courant sur le dessin : le renvoyer au simulateur, pas au cours.
- Sur la panne réelle, **un diagnostic juste sans vérification à l'instrument est « En cours », pas « Acquis »**. La méthode est l'objet de l'évaluation.
- Un élève qui place le thermostat en série « comme le thermique » a compris la logique série mais pas la différence entre **sécurité** et **régulation**. C'est la distinction à reprendre en synthèse, pas une erreur à barrer.

---

## Section 10 — Adaptations

### BAC PRO MFER 1re année
Compétences visées : `C6 Réaliser de manière éco-responsable` ; `C8 Contrôler et régler` ; `C10 Maintenance corrective`. Ajouter au câblage réel le relais thermique F1 et un voyant H1, puis raccorder un moteur en puissance avec F1 dans la ligne. Exiger le tracé du schéma développé complet (partie E) **avant** le câblage, et un compte rendu de dépannage rédigé pour la panne réelle : symptôme, hypothèse, mesure, réparation, remise en service. Durée portée à 4 h.

### 2nde TNE
Ateliers 1 et 3 seulement, sur simulateur, en 45 minutes, présentés comme une énigme : *« le contacteur qui se souvient, et les six platines qui ont oublié »*. Pas de câblage réel, pas d'évaluation notée. L'objectif est de faire toucher la logique de commande, pas de former au câblage.

### Élèves TDAH / DYS
La mécanique « une manœuvre, un retour immédiat » du simulateur leur convient ; c'est pour cela qu'elle a été retenue. Trois ajustements :
- le tableau A peut être rempli par des flèches et les trois mots *collé · repos · bat*, pas de rédaction ;
- couper la séance 1 en deux fois une heure, le câblage réel commençant au début de la seconde ;
- sur la platine réelle, imposer le rôle « je tiens le tableau » avant le rôle « je câble » : l'écriture fil par fil structure le geste.

---

## Section 11 — Ce que ce TP ne traite pas

À dire aux élèves, pour qu'ils sachent où s'arrête ce qu'ils viennent d'apprendre :

- **Le circuit de puissance.** Il est dessiné en grisé sur le schéma pour montrer ce que KM1 commande, mais il n'est pas câblé. Sections, protection moteur, couplage étoile-triangle : c'est une autre séance.
- **Les valeurs.** Résistance de bobine, calibre exact du disjoncteur de commande, pouvoir de coupure : documentation constructeur. Le TP apprend **quoi** vérifier et **pourquoi**, pas **à combien**.
- **L'inversion de sens de rotation** et le verrouillage de deux contacteurs : c'est le TP suivant, qui réutilise exactement ce montage, deux fois.
- **La régulation du compresseur.** Le TP montre pourquoi le thermostat ne va pas dans la ligne maintenue ; le montage complet (électrovanne, pump down, pressostat BP) est celui de l'atelier 10 du Circuit Fantôme.
- **L'habilitation électrique.** Les gestes de consignation sont exigés, mais ce TP ne délivre ni ne prépare une habilitation au sens de la NF C 18-510.

---

*inerWeb Édu — F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO*
