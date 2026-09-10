# Préparation à l'ouverture du mode Officiel

État du 10 septembre 2026 : **verrou actif** dans les modules serveur et interface. Ce dossier organise la suite ; il n'autorise pas l'utilisation officielle et ne vaut pas certification juridique.

**Suite école :** le parcours complet a désormais été rejoué sur une copie isolée avec un véritable CERFA et les contrôles sans manipulation : 52 vérifications réussies. La suite du dépôt principal reste suspendue par son verrou. Voir [la préparation du registre réel de l'atelier](MISE-EN-SERVICE-ECOLE-2026-09-10.md) pour les preuves, les données à préparer et les blocages restants. Les mentions « non rejoué » ci-dessous décrivent l'état antérieur à cet essai isolé, pas une ouverture du logiciel principal.

| Sujet | État observé | Preuve ou travail encore nécessaire |
|---|---|---|
| Verrou global | `VERROU_LIVRAISON = true`, refus explicite dans l'interface | Décision de livraison fondée sur les points ci-dessous, puis changement contrôlé et retest |
| Identité, aptitudes et capacité | Contrôles codés et suites de tests présentes | Relecture métier des matrices à partir des attestations et des cas d'intervention réellement visés |
| Périmètre des fluides et opérations | Refus officiel des fluides hors périmètre ; support interne distinct dans les explications | Valider chaque parcours prévu, notamment maintenance, récupération, contrôles, mélanges et fluides alternatifs |
| Exemptions et seuils | Certaines exemptions hermétiques restent désactivées par prudence, limite désormais affichée | Arbitrer l'application exacte des exemptions et tester les frontières sur les catégories d'équipements concernées |
| Documents et signatures | Fonctions et tests de signature, d'intégrité et de PDF présents ; documents de formation explicitement marqués | Examiner des dossiers représentatifs de bout en bout, comparer à la notice officielle applicable et vérifier PDF/impression ; les empreintes ne prouvent pas automatiquement l'identité |
| Déchets | Suivi interne et références Trackdéchets présents | Vérifier l'articulation avec les démarches réellement effectuées dans Trackdéchets ; un export interne ne prouve pas leur accomplissement |
| Conservation des données | Nettoyage des brouillons de formation disponible ; historiques scellés, journaux et sauvegardes encore conservés | Politique documentée et évolution structurelle décrite dans le dossier de nettoyage ; test de restauration après traitement des données |
| Déploiement | Tests applicatifs passés sur bases temporaires | Installation du paquet candidat sur un poste neuf, restauration d'une archive et contrôle de l'impression sur les périphériques prévus |

La page historique `CONDITIONS-BLOCANTES-OFFICIEL.md` rassemble plusieurs étapes de décisions et de travaux. Certaines phrases anciennes décrivent des fonctions alors non livrées ou un passage volontaire en Formation pour des interventions réelles. Elles ne doivent pas être interprétées comme l'état actuel ni comme une autorisation automatique d'ouverture.

## Critère de clôture du chantier

### Suite : ordre des signatures et lien avec le PDF final

Correction du 10/09 : après import d'un tracé technicien illisible, le détenteur pouvait signer parce que le contrôle préalable vérifiait seulement le rôle et la révision. La validation officielle considérait déjà le tracé technicien comme absent, mais le parcours de signature était incohérent. Les deux stores utilisent maintenant `etatSignatureReelle` avant la signature du détenteur : le tracé doit être recevable et la révision courante. Le test commun reproduit le défaut avant correction (signature acceptée à tort, ligne supplémentaire créée), puis vérifie le refus sans nouvelle signature sur les deux stores.

**Obstacle confirmé avant ouverture : correspondance du PDF reçu et du document signé.** `verifierOctetsPdfFinal` contrôle les quatre octets `%PDF` et la taille maximale ; la chaîne de texte `%PDF texte sans structure ni signature` reçoit actuellement `{ok:true}`. Ce constat concerne ce filtre, pas une validation officielle réussie : le verrou global bloque toujours la suite. À la signature, `sha256Document` porte sur l'objet logique du mouvement ; à la validation, les octets du PDF sont fournis par le client. Le contrôle d'entrée ne compare pas ce PDF avec un document de référence présenté aux signataires. La conservation et le hash ultérieurs prouvent l'intégrité des octets conservés, pas cette correspondance initiale.

Le générateur normal exige les deux signatures valides, mais cette exigence côté génération ne remplace pas une vérification serveur. Avant ouverture, définir un document de référence figé, lier explicitement les consentements à cette version et vérifier le document final à partir de cette référence. Ajouter un test de substitution par un autre PDF parfaitement lisible : renforcer seulement l'en-tête ou la syntaxe PDF ne suffirait pas. Rejouer ensuite le parcours signé complet sur une installation de test isolée. Aucune prétention de signature qualifiée ni de conformité globale n'est déduite du tracé ou du hash.

Validation de cette suite : 139 exécutions réussies, une suspendue, aucun échec en 157,6 s. Le contrat commun vérifie la régression en démonstration et sur le serveur SQLite temporaire. Le contrôle de syntaxe et `git diff --check` passent également. Aucune base réelle ni règle de déverrouillage modifiée.

### Correction vérifiée : contrôles sans manipulation de fluide

Le moteur de simulation demandait des pesées différentes pour tous les types de fiche, alors que les parcours `CONTROLE_PERIODIQUE` et `CONTROLE_NON_PERIODIQUE` se valident déjà sans déplacement de fluide (quantité nulle). Cette contradiction est corrigée dans les deux moteurs. Ces deux types demandent désormais explicitement un résultat `CONFORME` ou `FUITE` dès la soumission simulée. Les autres types conservent l'exigence de pesées ; cette correction ne permet pas de déclarer une charge ou une récupération comme un contrôle seul.

Référence relue le 10/09/2026 : [notice officielle CERFA 15497*04, n° 52064#04](https://www.formulaires.service-public.gouv.fr/gf/getNotice.do?cerfaFormulaire=15497&cerfaNotice=2), nature de l'intervention (cadre 4), résultat du contrôle (cadre 10), quantités manipulées (cadre 11). La dispense de pesées pour ces opérations sans manipulation est une traduction fonctionnelle de cette distinction, pas une dispense générale de traçabilité.

Preuves : `server/test-blocage-officiel.mjs` couvre les deux types, les étapes soumission/validation, les résultats absents/inconnus, la parité serveur/interface et le maintien des pesées pour les autres opérations. `v8/js/data/test-contrat.mjs` vérifie également la simulation et la validation en Formation sur les deux stores, sans pesées et avec quantité nulle.

### Limite du bilan de tests corrigée

Le plan contient 140 exécutions, mais `server/test-officiel-e2e.mjs` s'arrête volontairement avec le message `SUSPENDU` et un code de sortie zéro tant que le verrou est actif. L'ancien lanceur comptait cette sortie parmi les réussites. Le nouveau lanceur affiche la suspension séparément et ne conclut plus « TOUT VERT » dans ce cas. Un bilan sans échec n'est donc pas la preuve du parcours Officiel complet.

Validation de cette passe : plan complet terminé sans échec en 131,2 s (139 réussies, une suspendue ; ce lancement avait chargé l'ancien lanceur avant sa correction). Le nouveau lanceur a ensuite été éprouvé avec un plan ciblé exécutant réellement le moteur de blocage et la suite suspendue : il annonce bien une réussite et une suspension, sans « TOUT VERT ». Le moteur pur totalise 112 vérifications réussies ; le contrat commun passe en démonstration et sur SQLite jetable. Les changements de documentation et de lanceur ont aussi passé le contrôle de syntaxe et de diff.

Le verrou reste actif sur disque, aucune base réelle n'a été modifiée par cette passe et aucune exemption réglementaire n'a été activée. Restent notamment les dossiers signés et PDF de bout en bout, les matrices d'aptitude/capacité, les exemptions, Trackdéchets et la politique de conservation. Cette passe porte sur les contrôles sans manipulation et la sincérité du bilan de tests ; elle ne clôt pas la vérification juridique globale.

Constituer un jeu de dossiers fictifs représentatifs, consigner pour chacun les entrées, décisions attendues, documents produits et références vérifiées. Les tests techniques déjà verts sont une partie de cette preuve. La vérification métier et celle des modalités d'exploitation restent nécessaires ; ne pas confondre le passage d'un test avec la reconnaissance juridique d'un document.

## Sources à confronter aux parcours retenus

- [Règlement (UE) 2024/573](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R0573).
- [Arrêté du 21 novembre 2025 relatif aux attestations d'aptitude](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000053004604/).
- [Code civil, article 1367](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042456/).
- [Trackdéchets, informations relatives aux fluides frigorigènes](https://faq.trackdechets.fr/fluides-frigorigenes/informations-generales).
- [CNIL, durées de conservation](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees).

Ce document est une liste de travaux fondée sur le code et l'audit, pas une nouvelle validation exhaustive de l'ensemble de ces textes. Le RAG local n'a pas pu être consulté lors de cette passe : moteur d'embedding indisponible.
