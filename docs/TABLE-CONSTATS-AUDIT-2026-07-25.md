# Table des 31 constats du rapport du 25/07/2026 — traitement de chacun

Annexe de `docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md`, à laquelle le §1 du mémoire renvoie.

Elle donne, pour **chaque** constat du rapport, son numéro d'origine, son intitulé abrégé, notre
verdict après vérification, et la section du mémoire où le lire.

**Le code interne A01…A31** est notre numérotation de travail. Neuf de ces codes seulement
apparaissent ailleurs dans le dépôt — **A02 à A07, A14, A18, A23** — parce que ce sont les seuls
qui ont donné lieu à un correctif ou à un désaccord écrit. Les autres n'y figurent pas, faute
d'avoir produit du code. Cette table est la **seule pièce** qui raccorde les deux numérotations :
elle existe pour cette raison.

**Où les retrouver exactement**, puisque l'affirmation doit être vérifiable depuis ce que vous
avez :

- **les neuf**, dans `docs/PROMPT-REPRISE.md`, qui voyage avec ce paquet —
  `grep -o 'A0[2-7]\|A14\|A18\|A23' docs/PROMPT-REPRISE.md` les rend tous ;
- **quatre seulement dans `CHANGELOG.md`** : **A04, A05, A06, A07**, chacun dans le paragraphe
  de la brique qui l'a traité. **A02, A03, A14, A18 et A23 n'y sont pas** — c'est une lacune de
  notre journal, nous la déclarons plutôt que de vous laisser conclure d'un `grep` vide ;
- dans les **messages de commit** également, mais ceux-là ne sont lisibles que sur le dépôt
  public : ⚠️ **hors paquet**, qui ne transporte pas l'historique `git`.

> ⚠️ **Attention à une collision de numérotation dans ce paquet.** Le document
> `docs/CONSTATS-AUDIT-EXTERNE-2026-07-20.md`, qui voyage avec le reste des documents de travail,
> emploie lui aussi des codes `P0-1` à `P0-9` et `P1-1` à `P1-6` — mais ce sont ceux de l'audit
> **précédent** (20/07/2026), et ils désignent tout autre chose. Vos numéros à vous sont ceux de
> la présente table et du mémoire, et eux seuls.

## Les constats P0 du rapport (§7)

| Rapport | Intitulé au rapport | Interne | Verdict | Où |
|---|---|---|---|---|
| **P0-01** | Le mode officiel est volontairement fermé | A01 | **Non contesté — c'est une protection, le rapport le dit lui-même.** Le verrou n'a pas bougé et ne bougera pas avant visa. Les exigences de sortie (liste de dégel versionnée, zéro P0, visas, empreinte de la version autorisée) sont acceptées telles quelles. | §1, §6 |
| **P0-02** | Formation et officiel partagent les mêmes stocks et bilans | A02 | **DÉSACCORD DE FOND, argumenté, non corrigé** sur la séparation des données. En revanche, **le constat déplacé est reconnu** : une fiche `FORM-` déplaçant du fluide réel n'est opposée à aucune condition bloquante — « mouvement réel, régime nul » (§3.2). Un résidu de présentation qu'il contenait a été corrigé (§3.7). | §3 |
| **P0-03** | Une seule session peut fabriquer les deux signatures | A03 | **CONFIRMÉ** — identité non ancrée ; le témoin de session existait et était jeté. Corrigé (témoin porté à l'écran et au dossier scellé). La double signature depuis une même session reste admise : décision de l'auteur, motivée. | §4 |
| **P0-03** *(second volet)* | Le contrôle d'image ne décode pas réellement le PNG | A04 | **CONFIRMÉ** — corrigé : image réellement décodée, zone vierge refusée, borne basse de 1 Ko retirée. | §4 |
| **P0-04 A** | Création d'une machine : garde absente de `createMachine` | A05 | **CONFIRMÉ** sur le fond (seuil d'aptitude déplacé, mesuré) ; **un volet réfuté** (l'échéance à 2099 ne masque rien). Corrigé, et étendu à deux champs que le rapport ne citait pas. | §4 |
| **P0-04 B** | Personnel et attestations modifiables par un élève | A06 | **PARTIELLEMENT CONFIRMÉ** — le geste est réel, la gravité annoncée est réfutée (les attestations de la fiche sont décoratives) ; deux défauts réels non vus par le rapport, corrigés. | §4 |
| **P0-05** | Le BSFF interne ne satisfait pas l'obligation Trackdéchets | A07 | **CONFIRMÉ sur toute la ligne**, et aggravé par la réponse de l'auteur : l'établissement est producteur réel de déchets. Corrigé (libellés, champ externe, unicité, mention permanente). Le pont Trackdéchets reste à faire. | §4 |
| **P0-06** | Incident des clés Apps Script v7 non clôturé par une preuve externe | A08 | **Non contesté — hors code.** Le service historique est à désactiver et le procès-verbal à signer par l'établissement. Aucun secret n'a été recopié dans le dépôt. Suivi : `docs/P0-9-REVOCATION-CLES-V7.md`. | §6 |
| **P0-07** | Visas métier et DPD non obtenus (dont la valeur PRP retenue) | A09 | **Non contesté — hors code, et c'est le chemin critique.** Dossier prêt (`docs/T3-DOSSIER-RELECTURE-EXTERNE.md`). Sur le R-455A : déjà tranché avant l'audit par une règle générale, mais votre objection de fond est **distincte et recevable**. | §6 |
| **P0-08** | La livraison finale n'est pas reproductible ni certifiable avec ce paquet | A10 | **CONFIRMÉ, et corrigé dans l'envoi lui-même** : ce paquet-ci joint une **archive exécutable** du dépôt, bibliothèques tierces et gabarit CERFA compris. Le SBOM formel et la recette sur poste cible restent à produire. | §1, §7, annexe |

## Les constats P1 du rapport (§8)

| Rapport | Intitulé au rapport | Interne | Verdict | Où |
|---|---|---|---|---|
| **P1-01** | Base vive et sauvegardes non chiffrées par défaut | A11 | **Non contesté — exact, et hors code.** Le chiffrement du poste et des supports relève de l'établissement. Aucune objection. | §6 |
| **P1-02** | Sauvegardes riches mais résilience opérationnelle insuffisante | A12 | **Non contesté — exact.** Stratégie 3-2-1, copie hors site chiffrée, test de restauration périodique : à la charge de l'établissement. | §6 |
| **P1-03** | Preuve d'intégrité seulement locale | A13 | **Non contesté, et déjà consigné avant l'audit** (tête du `CHANGELOG.md` : le témoin du journal se recalcule, la parade identifiée n'est pas faite). Pas d'ancrage tiers ni d'horodatage qualifié. | §6, §8 |
| **P1-04** | Déni de service sur la connexion | A14 | **CONFIRMÉ, mesuré, non corrigé, assumé** — dette avec condition de réveil : à traiter avant toute activation du mode réseau local. | §4 |
| **P1-05** | Parcours officiel de bout en bout non exécuté sur la livraison | A15 | **Non contesté, et déjà consigné.** Une répétition générale existe (`outils/repetition-generale-officiel.mjs`, verrou ouvert dans une copie, jamais en production) ; elle ne remplace pas la recette réelle exigée. | §6 |
| **P1-06** | Gouvernance RGPD incomplète | A16 | **Non contesté — hors code**, sauf **un volet corrigé** : la promesse d'hébergement « Cloud UE » subsistait dans la notice d'information **affichée dans l'application** ; elle est retirée. Le reste (responsable de traitement, DPD, durées) revient à l'établissement. | §6 |
| **P1-07** | AIPD à qualifier formellement | A17 | **Non contesté — hors code.** Le logiciel ne doit pas s'auto-exempter ; la grille et la décision motivée reviennent au responsable de traitement. | §6 |
| **P1-08** | Documents contradictoires sur le cloud | A18 | **PARTIEL** : périmé pour `INSTALLATION_CLOUD.md` (bandeau posé avant l'audit) ; **exact pour `SAUVEGARDE.md`**, corrigé, avec un balayage automatique qui interdit le retour de la promesse. | §6 |
| **P1-09** | Calendrier F-Gas à compléter | A19 | **Exact, déjà consigné, sans effet aujourd'hui.** Les dates manquantes ne seront pas codées sans lecture verbatim du texte applicable et validation. | §6 |
| **P1-10** | Dépendances et licences non maîtrisables depuis le paquet | A20 | **CONFIRMÉ.** Corrigé pour partie : l'archive exécutable jointe porte les fichiers tiers réels et `LICENCES-TIERCES.md`. ⚠️ **Deux erreurs de notre inventaire, déclarées par nous** (§4, §6) : `v8/js/lib/qrcode.js` y est rangé sous « qrcodejs » alors que c'est du code maison (quatre fichiers tiers, pas cinq), et le mémoire donnait tslib « sous MIT » là où l'inventaire dit, correctement, Apache 2.0. Le SBOM formel et la politique de mise à jour restent à produire. La question de stratégie sur la licence du produit est notée. | §4, §6, §7 |

## Les constats P2 du rapport (§9)

| Rapport | Intitulé au rapport | Interne | Verdict | Où |
|---|---|---|---|---|
| **P2-01** | Monolithes et duplication | A21 | **Exact, assumé.** La duplication est volontaire et sert d'instrument de vérification : la fusion est explicitement différée jusqu'après la simulation d'audit. | §6 |
| **P2-02** | Outillage d'ingénierie incomplet | A22 | **Exact, non traité.** Pas d'analyseur statique, pas de typage, pas d'intégration continue. N'affecte pas la valeur probante du registre. | §6 |
| **P2-03** | Test multiplateforme défectueux | A23 | **CONFIRMÉ pour le test, RÉFUTÉ pour la production.** Corrigé, avec balayage du même motif dans `server/`, `outils/` et `v8/`. | §6 |
| **P2-04** | `node:sqlite` et version du moteur | A24 | **Exact, non traité.** La version embarquée n'est pas encore figée ni documentée. | §6 |
| **P2-05** | Terminologie de preuve trop ambitieuse | A25 | **Exact pour partie.** Recensé : l'emploi est légitime en interne, discutable sur quelques libellés d'écran. Arbitrage de vocabulaire laissé à l'auteur. | §6 |
| **P2-06** | Double signature plus large que le minimum réglementaire | A26 | **Exact, et délibéré** (acté avant l'audit, doctrine « jamais moins de contrôles qu'exigé »). Le risque de blocage ne se matérialise pas dans ce contexte. | §6 |
| **P2-07** | Accessibilité et ergonomie non certifiées | A27 | **Exact, non traité.** Aucun audit visuel n'a été mené. | §6 |

## Les constats hors listes (§5, §11 du rapport — et un que nous ajoutons)

| Rapport | Intitulé | Interne | Verdict | Où |
|---|---|---|---|---|
| **§5** | 16 échecs de tests dans l'environnement d'audit | A28 | **Exact quant au PAQUET, réfuté quant au logiciel.** Nous en reproduisons **quinze** et les expliquons ; **la seizième nous échappe** et nous le disons plutôt que d'annoncer « reproduits à l'identique ». Corrigé à la racine : l'archive jointe est exécutable. | §7 |
| **§5** | Angle mort : la suite officielle ne joue pas le parcours de production | A29 | **Non contesté** — recoupe P1-05. | §6 |
| **§11** | Risques d'exploitation (horloge, disque plein, antivirus, migration interrompue, poste unique…) | A30 | **Non contesté.** La garde d'exploitation proposée par le rapport est acceptée telle quelle et figurera à la procédure d'ouverture. | §6 |
| **§3** | *(relevé par nous, pas par le rapport)* comptage inexact | A31 | **Une seule erreur établie** : le rapport annonce « 32 migrations » là où le registre allait jusqu'au **n° 35** (soit 34 migrations, numérotées de 2 à 35). En revanche il a **raison** sur le nombre de lignes du dispatcher, et c'est nous qui nous étions trompés. | §7 |

---

**Total : 31 constats. Aucun n'est écarté sans réponse.** L'inventaire est le nôtre : si un constat
de votre rapport ne s'y retrouve pas, c'est une omission de notre part, et nous y répondrons.
