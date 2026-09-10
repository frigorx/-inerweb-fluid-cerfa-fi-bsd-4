# Préparation à l'ouverture du mode Officiel

État du 10 septembre 2026 : **verrou actif** dans les modules serveur et interface. Ce dossier organise la suite ; il n'autorise pas l'utilisation officielle et ne vaut pas certification juridique.

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

Constituer un jeu de dossiers fictifs représentatifs, consigner pour chacun les entrées, décisions attendues, documents produits et références vérifiées. Les tests techniques déjà verts sont une partie de cette preuve. La vérification métier et celle des modalités d'exploitation restent nécessaires ; ne pas confondre le passage d'un test avec la reconnaissance juridique d'un document.

## Sources à confronter aux parcours retenus

- [Règlement (UE) 2024/573](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R0573).
- [Arrêté du 21 novembre 2025 relatif aux attestations d'aptitude](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000053004604/).
- [Code civil, article 1367](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042456/).
- [Trackdéchets, informations relatives aux fluides frigorigènes](https://faq.trackdechets.fr/fluides-frigorigenes/informations-generales).
- [CNIL, durées de conservation](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees).

Ce document est une liste de travaux fondée sur le code et l'audit, pas une nouvelle validation exhaustive de l'ensemble de ces textes. Le RAG local n'a pas pu être consulté lors de cette passe : moteur d'embedding indisponible.
