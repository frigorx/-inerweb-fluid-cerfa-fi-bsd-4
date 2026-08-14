# docs/ — ce que chaque document est, et comment le lire

> Depuis le tri du 14/08/2026, ce dossier ne contient QUE des documents
> VIVANTS : chacun décrit l'état courant du produit. Les journaux de
> chantier, plans de lots soldés, spécifications d'origine et rapports
> d'audit ont été retirés de la version courante — ils restent lisibles dans
> l'historique git, et l'auteur en conserve l'archive complète. Si un
> commentaire du code cite un document absent d'ici, c'est un document
> d'archives : la règle qu'il fondait est décrite par le code et ses tests.

## L'architecture

| Document | Rôle |
|---|---|
| [CARTE-CODE.md](CARTE-CODE.md) | **À lire en premier** : l'architecture complète en un document — modules, flux, pièges. Se déclare « état courant » et des suites du filet gardent ses chiffres. |

## Le réglementaire vivant (consommé par le code)

| Document | Rôle |
|---|---|
| [TABLE-REGLEMENTAIRE-FLUIDES.md](TABLE-REGLEMENTAIRE-FLUIDES.md) | Les seuils et fréquences F-Gas codés dans le moteur du cadre 7. |
| [CONDITIONS-BLOCANTES-OFFICIEL.md](CONDITIONS-BLOCANTES-OFFICIEL.md) | La liste des conditions qui bloquent le mode Officiel, appliquée par `blocage-officiel.js`. |
| [CATALOGUE-FLUIDES-A-VALIDER.md](CATALOGUE-FLUIDES-A-VALIDER.md) + [catalogue-fluides-lot2.json](catalogue-fluides-lot2.json) | Le catalogue de fluides à semer par l'écran d'administration (validation ligne à ligne par le propriétaire). |

## Les dispositifs actifs (un plan par dispositif encore gouverné par lui)

| Document | Rôle |
|---|---|
| [PLAN-LICENCE-NOMINATIVE.md](PLAN-LICENCE-NOMINATIVE.md) | Le dispositif de distribution nominative : licence signée, lecture seule, outillage. |
| [PLAN-MODE-EXERCICE.md](PLAN-MODE-EXERCICE.md) | Le bac à sable pédagogique (code de déblocage, photo du registre, effacement). |
| [PLAN-LOT-G-MULTI-FLUIDES.md](PLAN-LOT-G-MULTI-FLUIDES.md) | Question OUVERTE des installations en cascade — décision du propriétaire attendue. |

## La gouvernance (écrite pour l'établissement et un contrôleur)

| Document | Rôle |
|---|---|
| [NOTE-DECISION-ETABLISSEMENT.md](NOTE-DECISION-ETABLISSEMENT.md) | Ce que l'établissement doit décider avant tout usage opposable. |
| [REGISTRE-DES-ARBITRAGES.md](REGISTRE-DES-ARBITRAGES.md) | Chaque valeur réglementaire codée : d'où elle vient, qui l'a tranchée, avec quelle certitude. |
| [POINTS-DE-FRICTION.md](POINTS-DE-FRICTION.md) | Les limites CONNUES du logiciel, dites avant qu'un auditeur les trouve. |
| [ROADMAP.md](ROADMAP.md) | La feuille de route. |
| [PUBLICATION.md](PUBLICATION.md) | La procédure de délivrance d'un paquet nominatif, de la licence à l'envoi. |

À la racine : `README.md` (présentation), `LICENSE` (licence du dépôt),
`LICENCE-EVALUATION.txt` (contrat des paquets), `LICENSES/` (licences
tierces), `INSTALLATION_SIMPLE.md`, `SAUVEGARDE.md`, `SECURITE.md`,
`RGPD.md`, `LIMITE-DE-RESPONSABILITE.md`, `CHANGELOG.md` (journal de
produit).
