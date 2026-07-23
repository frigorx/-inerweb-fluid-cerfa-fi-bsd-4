# T3 — Dossier de relecture externe : organisme agréé + délégué à la protection des données

> Préparé le **23/07/2026**. T3 est le **chemin critique** du projet : c'est le seul point
> dont le délai ne dépend pas de nous. Tout le reste (code, tests, documentation) peut être
> rattrapé en une session ; une relecture externe demande des semaines. Elle doit donc partir
> **avant** la simulation d'audit de fin août, pour que ses retours soient intégrés avant la
> mise en service de septembre.
>
> Ce document est **prêt à l'emploi** : les notes de saisine et les courriels sont rédigés,
> il ne reste qu'à les envoyer. Ce qui n'est pas fait, et pourquoi, est dit au §5.

---

## 1. Deux relecteurs, deux objets — ne pas les confondre

| | Volet A — relecture réglementaire | Volet B — protection des données |
|---|---|---|
| **Qui** | Organisme agréé « fluides frigorigènes » ou expert F-Gas reconnu | Délégué à la protection des données (DPD) de l'académie d'Aix-Marseille |
| **Question posée** | *Ce registre est-il opposable ? Les seuils et règles codés sont-ils les bons ?* | *Le traitement est-il conforme au RGPD, et que doit inscrire l'établissement à son registre ?* |
| **Ce qu'on attend** | Un avis écrit sur une liste de points précis | Un avis + la validation de l'inscription au registre article 30 |
| **Délai réaliste** | 3 à 6 semaines | 2 à 8 semaines (variable) |
| **Bloque quoi** | La mise en service du registre officiel unique | Le volet élèves et l'information des familles |

**Les deux partent en parallèle.** Ni l'un ni l'autre n'attend l'autre.

---

## 2. Volet A — organisme agréé (relecture réglementaire)

### 2.1 À qui s'adresser

Un **organisme agréé pour la délivrance des attestations de capacité** fluides frigorigènes,
ou un expert F-Gas reconnu. La liste officielle des organismes agréés est publiée par le
ministère chargé de l'environnement — **à vérifier sur la liste en vigueur au moment de
l'envoi**, elle évolue.

> 💡 **Raccourci disponible.** Le dossier « centre d'habilitation fluides » (devenir organisme
> évaluateur A1/A2/D/E adossé au groupe Équatio) t'a déjà mis en relation avec des
> interlocuteurs de ce milieu. Ce sont exactement les bonnes personnes pour cette relecture,
> et la démarche se présente naturellement : un futur organisme évaluateur qui fait relire
> son outil de registre avant mise en service.

### 2.2 Note de présentation (à joindre telle quelle)

> **Objet : demande d'avis technique sur un registre de traçabilité des fluides frigorigènes**
>
> inerWeb Fluide est un logiciel **local** (aucune donnée ne quitte le poste) de tenue du
> registre de traçabilité des fluides frigorigènes, développé pour un lycée professionnel de
> la filière froid et climatisation. Il produit les fiches d'intervention CERFA 15497*04 et
> tient le registre des équipements, le bilan matière et le registre du personnel autorisé.
>
> Il fonctionne en **deux modes strictement séparés** :
> - un **mode Formation**, destiné aux élèves, qui ne peut produire aucun document
>   d'apparence officielle et où rien n'est jamais bloquant ;
> - un **mode Officiel**, opposable, où les écritures sont signées, scellées par empreinte
>   chaînée et non modifiables (correction par contre-écriture uniquement), et où une liste
>   de conditions réglementaires **bloque** la validation si elles ne sont pas réunies.
>
> **L'objectif visé est celui d'un registre officiel unique**, c'est-à-dire sans registre
> papier tenu en parallèle. C'est le niveau d'exigence le plus élevé, et c'est la raison de
> la présente demande : nous souhaitons un avis externe **avant** la mise en service, prévue
> pour la rentrée de septembre 2026, avec une période de fonctionnement en parallèle du
> papier de deux à quatre semaines.
>
> Le logiciel a déjà fait l'objet de deux audits techniques externes, dont les constats
> bloquants ont tous été corrigés. Ce qui manque aujourd'hui n'est pas technique : c'est la
> **confirmation, sur le texte, d'un petit nombre de valeurs réglementaires** que nous avons
> codées de façon volontairement conservatrice (jamais moins de contrôles qu'exigé), et que
> nous refusons de considérer comme acquises sans avis qualifié.

### 2.3 Les questions posées — le cœur de la demande

Ce sont les points sur lesquels un avis écrit est demandé. Pour chacun : ce que le logiciel
fait **aujourd'hui**, et la question.

**Aptitude des intervenants**

1. **Seuils de charge.** Nous appliquons une limite de charge **strictement inférieure à
   3 kg** pour les catégories limitées, portée à **6 kg** si l'équipement est hermétiquement
   scellé **et étiqueté**. La frontière est stricte : 3,000 kg pile est refusé.
   *Ces valeurs et cette lecture stricte sont-elles exactes ?*
2. **Ancienne catégorie II (arrêté de 2008).** Nous la traitons comme autorisant toutes les
   opérations mais avec la limite de charge ci-dessus. Elle était initialement modélisée sans
   limite, comme la catégorie I. *Quelle est la bonne lecture ?*
3. **Fin de reconnaissance du régime 2008.** Nous cessons de reconnaître une attestation de
   2008 après le **31/12/2026**. *Date confirmée ?*

**Contrôles d'étanchéité**

4. **Seuils et fréquences.** HFC : **5 / 50 / 500 tonnes équivalent CO₂** → **12 / 6 / 3
   mois**, fréquences **doublées** en présence d'un système de détection permanente. HFO
   purs : **1 / 10 / 100 kg**. Détection permanente **obligatoire** au-delà du seuil haut.
   *Confirmez-vous l'ensemble ?*
5. **Allègement pour détection permanente.** Nous n'accordons le doublement des intervalles
   que si le système de détection a été **vérifié depuis moins de 12 mois** ; sinon, retour
   à la fréquence sans détection. *Cette lecture est-elle correcte ?*
6. **Exemption des équipements hermétiquement scellés.** Nous n'avons codé **aucune
   exemption** — choix conservateur assumé, faute de valeurs confirmées. Les seuils
   candidats sont : moins de 10 tonnes équivalent CO₂, moins de 2 kg, et moins de 3 kg pour
   un hermétique résidentiel. *Ces seuils sont-ils les bons, et l'exemption suppose-t-elle
   un étiquetage particulier ?*
7. **HCFC, seuil bas.** Nous appliquons **2 kg** ; la valeur historique était de 3 kg.
   L'enjeu est faible (recharge interdite depuis 2015). *Laquelle retenir ?*

**Fluides et registre**

8. **PRP en cas de valeurs concurrentes.** Notre règle est de retenir le **PRP le plus
   élevé** (principe de précaution : les contrôles se déclenchent plus tôt). *Cette approche
   est-elle défendable en audit, ou faut-il impérativement la valeur de référence même
   lorsqu'elle est plus basse ?*
9. **Fluides hors périmètre fluoré.** Une fiche CERFA officielle peut aujourd'hui être
   établie pour du R-744 (CO₂) ou du R-290 (propane), qui ne relèvent pas du contrôle
   d'étanchéité fluoré. *Faut-il l'interdire, ou est-ce acceptable comme trace volontaire ?*
10. **Blocage sans dérogation.** Lorsqu'une condition réglementaire n'est pas réunie, le mode
    officiel **refuse sèchement** la validation : il n'existe aucun mécanisme permettant de
    passer outre en justifiant. *Est-ce le bon choix pour un registre opposable ?*

**Question d'ensemble**

11. Au vu de ce qui précède et des pièces jointes, **voyez-vous un obstacle à ce que ce
    registre tienne lieu de registre unique**, sans tenue papier en parallèle ?

### 2.4 Pièces à joindre

| Pièce | Fichier | À quoi elle sert |
|---|---|---|
| Table réglementaire | `docs/TABLE-REGLEMENTAIRE-FLUIDES.md` | Les seuils et fréquences codés, avec leurs sources |
| Conditions bloquantes | `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` | La liste exacte de ce qui refuse une validation officielle |
| Aptitudes | `docs/SPEC-HABILITATIONS.md` | La matrice catégorie × opération × fluide × charge |
| Spécification | `docs/SPEC-V8.md` | Le modèle de données et les règles |
| Un dossier d'audit type | à générer depuis l'application | Ce que l'auditeur verra réellement : CERFA, registres, empreintes |

> ⚠️ **Le dossier d'audit joint doit être généré depuis le mode DÉMO** (monde fictif), jamais
> depuis la base réelle : il partirait avec des données personnelles d'élèves et de clients.

### 2.5 Courriel type

> **Objet :** demande d'avis technique — registre de traçabilité fluides frigorigènes, lycée
> professionnel Jacques Raynaud (Marseille)
>
> Madame, Monsieur,
>
> Enseignant en froid et climatisation au lycée professionnel Jacques Raynaud à Marseille,
> j'ai développé pour l'atelier un logiciel local de tenue du registre de traçabilité des
> fluides frigorigènes, produisant les fiches CERFA 15497*04.
>
> Nous envisageons de l'utiliser comme **registre unique**, sans tenue papier parallèle, à
> compter de la rentrée de septembre 2026. Avant cette mise en service, je souhaite recueillir
> un **avis technique externe** sur un ensemble limité de points réglementaires — seuils
> d'aptitude, fréquences de contrôle, exemptions — que j'ai codés de façon volontairement
> conservatrice et que je ne veux pas tenir pour acquis.
>
> Vous trouverez ci-joint une note de présentation, la liste précise des onze points sur
> lesquels votre avis est sollicité, ainsi que la documentation technique correspondante.
>
> Pourriez-vous m'indiquer si cette relecture entre dans vos prestations, le délai
> envisageable et, le cas échéant, les conditions ?
>
> Je vous remercie par avance et reste à votre disposition pour toute précision ou pour une
> démonstration du logiciel.
>
> Cordialement,
> Franck Henninot — enseignant froid et climatisation, LP Jacques Raynaud, Marseille

---

## 3. Volet B — délégué à la protection des données

### 3.1 À qui s'adresser

Le **DPD de l'académie d'Aix-Marseille** (les lycées publics ont un délégué mutualisé au
niveau académique). L'adresse de saisine figure sur le site de l'académie — **à récupérer au
moment de l'envoi**, et à faire viser par le chef d'établissement, qui est le responsable de
traitement.

> ⚠️ **Point de méthode important.** Le responsable de traitement n'est pas toi, c'est
> **l'établissement**. La saisine doit donc partir **sous couvert du chef d'établissement**,
> ou au minimum avec son accord explicite. Un dossier RGPD envoyé au DPD par un enseignant
> seul n'engage rien et se perd.

### 3.2 Note de saisine (à joindre telle quelle)

> **Objet : inscription au registre des activités de traitement — logiciel de registre
> réglementaire d'atelier**
>
> Le lycée utilise, pour la filière froid et climatisation, un logiciel de tenue du registre
> réglementaire de traçabilité des fluides frigorigènes. Ce registre est **imposé par le Code
> de l'environnement** (articles R. 543-76 et suivants) et par la réglementation européenne
> F-Gas : sa tenue est une **obligation légale**, ce qui constitue la base légale du
> traitement (article 6.1.c du RGPD). Le volet pédagogique relève de la **mission d'intérêt
> public** (article 6.1.e).
>
> **Le logiciel fonctionne entièrement en local**, sur un poste de l'établissement. Il ne
> transmet aucune donnée à un service extérieur : il n'y a **ni sous-traitant d'hébergement,
> ni transfert de données**, dans l'Union comme hors de l'Union.
>
> Les données traitées sont limitées à ce qu'exige la réglementation : identité et
> attestation d'aptitude des intervenants, identité du technicien et du validateur portée sur
> chaque fiche d'intervention, comptes applicatifs et journal d'audit. **Aucune donnée
> sensible** au sens de l'article 9 n'est traitée. S'agissant des élèves : nom, prénom, compte
> applicatif, et le cas échéant numéro d'attestation préparée en formation — **aucune note,
> aucune évaluation, aucune donnée de vie scolaire**.
>
> Le dossier de conformité complet — catégories de données, finalités, durées de conservation,
> exercice des droits, mesures de sécurité — est joint (`RGPD.md`, `SECURITE.md`).

### 3.3 Les questions posées au DPD

1. **Inscription au registre article 30.** Le dossier joint est-il suffisant pour que
   l'établissement inscrive ce traitement à son registre ? Quelle rédaction retenez-vous ?
2. **Analyse d'impact.** Le traitement relève-t-il, selon vous, d'une analyse d'impact
   (AIPD) ? *Notre lecture : non — pas de données sensibles, pas de profilage, pas de
   décision automatisée, périmètre limité à un atelier. Nous demandons confirmation.*
3. **Information des élèves et des familles.** Nous prévoyons une mention au règlement de
   l'atelier et au carnet de liaison. Est-ce suffisant, ou attendez-vous une information
   individuelle formalisée ?
4. **Conservation des écritures scellées.** Une écriture validée du registre est **non
   modifiable et non effaçable** par construction (correction par contre-écriture uniquement) :
   c'est une exigence d'intégrité du registre réglementaire. Une demande d'effacement ne peut
   donc pas la supprimer. *Confirmez-vous que l'obligation légale de conservation prime ici,
   et la formulation à donner à une personne qui exercerait ce droit ?*
5. **Le coffre des identités.** Pour les élèves partis, l'identité est **chiffrée** dans une
   enveloppe protégée par un code que seul le responsable détient ; la fiche n'affiche plus
   qu'un pseudonyme, et chaque réouverture exige un motif et est journalisée de façon
   inaltérable. *Cette pseudonymisation réversible vous paraît-elle une réponse adaptée à
   l'exigence de minimisation, sachant qu'une destruction pure détruirait la capacité de
   répondre à une demande légale ultérieure ?*
6. **Durée retenue pour l'identité d'un élève parti.** Année scolaire en cours plus l'année
   suivante au plus, puis mise à l'abri chiffrée. *Durée acceptable ?*

### 3.4 Pièces à joindre

| Pièce | Fichier |
|---|---|
| Dossier de conformité | `RGPD.md` (les 10 sections : données, finalités, base légale, durées, droits, coffre des identités) |
| Mesures de sécurité | `SECURITE.md` |
| Politique de sauvegarde | `SAUVEGARDE.md` |

### 3.5 Courriel type

> **Objet :** saisine du DPD — inscription au registre article 30 d'un traitement d'atelier
> (LP Jacques Raynaud, Marseille)
>
> Madame, Monsieur le délégué à la protection des données,
>
> Le lycée professionnel Jacques Raynaud utilise, pour sa filière froid et climatisation, un
> logiciel local de tenue du registre réglementaire de traçabilité des fluides frigorigènes —
> registre dont la tenue est imposée par le Code de l'environnement et la réglementation
> F-Gas.
>
> Le traitement est entièrement local : aucune donnée ne quitte l'établissement, il n'y a ni
> sous-traitant d'hébergement ni transfert. Les données sont limitées à ce qu'exige la
> réglementation, et aucune donnée sensible n'est traitée.
>
> Je souhaite **inscrire ce traitement au registre des activités de traitement de
> l'établissement** et recueillir votre avis sur six points précis, notamment le sort des
> écritures réglementaires non effaçables et le dispositif de pseudonymisation réversible mis
> en place pour les élèves ayant quitté l'établissement.
>
> Vous trouverez ci-joint le dossier de conformité complet ainsi que la note de saisine
> détaillant ces questions.
>
> Je vous remercie de votre attention,
>
> Franck Henninot — enseignant froid et climatisation
> Sous couvert de M./Mme le chef d'établissement, responsable de traitement

---

## 4. Suivi — à tenir à jour

| Étape | Date visée | Date réelle | État |
|---|---|---|---|
| Accord du chef d'établissement (volet B) | | | ☐ |
| Envoi volet A — organisme agréé | fin juillet 2026 | | ☐ |
| Envoi volet B — DPD académique | fin juillet 2026 | | ☐ |
| Relance volet A (si sans réponse) | +3 semaines | | ☐ |
| Relance volet B (si sans réponse) | +4 semaines | | ☐ |
| Réponse volet A reçue | | | ☐ |
| Réponse volet B reçue | | | ☐ |
| Intégration des retours au code et aux docs | avant fin août | | ☐ |
| Simulation d'audit | fin août 2026 | | ☐ |
| Mise en service en parallèle du papier | rentrée septembre 2026 | | ☐ |

---

## 5. Ce qui n'a PAS été fait ici, et pourquoi

- **Rien n'a été envoyé.** Saisir un organisme extérieur ou le DPD académique engage
  l'établissement et son chef d'établissement : c'est une démarche qui appartient à son
  auteur, pas à son assistant. Les courriels sont rédigés et prêts ; l'envoi est ton geste.
- **Aucun destinataire n'a été choisi à ta place.** La liste des organismes agréés évolue et
  l'adresse du DPD académique doit être relevée à la source au moment de l'envoi. Inventer
  une adresse ferait perdre plus de temps que d'en chercher la bonne.
- **Les onze questions du volet A recoupent volontairement celles que je t'ai posées.** Si
  l'organisme répond, il tranche du même coup Q1 à Q9. Deux conséquences pratiques : tu peux
  répondre toi-même dès maintenant sur ce que tu sais (le code avance), et garder l'avis
  externe comme **confirmation opposable** — c'est exactement ce qu'un auditeur voudra voir.
  Ne pas attendre l'un pour faire l'autre.
