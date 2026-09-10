# Nettoyage des brouillons de formation — 10 septembre 2026

Cette fonction est disponible dans **Protection des données → Examiner et nettoyer les anciens brouillons**. Elle complète la première revue du même jour. Elle ne supprime ni une personne dans son ensemble ni les écritures scellées du registre.

## Utilisation

1. Se connecter avec un compte référent ou administrateur sur le poste local.
2. Choisir la date retenue par l'établissement, puis afficher l'aperçu. La date est exclusive : une fiche datée exactement du jour choisi reste conservée. Aucune durée légale n'est présumée par ce choix.
3. Examiner les références, dates, statuts, nombres de pièces jointes et de signatures. Les traces soumises, scellées, liées à une contre-écriture ou à un contrôle, ainsi que les dates invalides sont exclues de la sélection. Le mode Officiel est exclu.
4. Cocher de 1 à 200 brouillons. Aucun choix n'est précoché. Lire l'inventaire des sauvegardes gérées et les limites sur les copies restantes.
5. Donner un motif de décision sans nom d'élève, reconnaître la prise en compte des copies et obligations, puis saisir `SUPPRIMER N`, avec le nombre sélectionné.
6. Lire le résultat. Si un fichier est encore verrouillé, son retrait reste en attente et sera repris au démarrage. Ne pas considérer alors l'effacement du fichier comme accompli.

En démonstration, seul l'aperçu est disponible. Le téléchargement produit un **aperçu**, pas un certificat d'effacement. Ses références peuvent permettre un rapprochement avec des personnes : il doit rester à accès contrôlé.

## Garanties testées

Le serveur vérifie les droits, la restriction au poste local, la sélection et la confirmation. Une empreinte relie l'aperçu aux fiches et à leurs dépendances : une modification depuis l'aperçu impose de recommencer. La vérification et les suppressions SQL sont dans une même transaction. Une panne au milieu du lot annule toutes les suppressions SQL.

Les signatures, liens d'outillage et métadonnées de pièces des brouillons sélectionnés partent avec eux. Le retrait des fichiers intervient après le commit, via une liste persistante de reprise. Les chemins de fichiers proviennent des identifiants internes, jamais d'un chemin fourni par le client. Les liens symboliques détectés entraînent un refus.

Une nouvelle entrée de journal conserve le compte ayant agi, les quantités, la date de coupure et le motif. Elle ne recopie pas les noms ni les contenus des fiches supprimées. Les anciens journaux restent inchangés.

## Ce que cette fonction ne résout pas

- Les noms et données qui restent dans les écritures scellées, journaux, fiches du personnel, comptes et coffre réversible.
- Les pièces liées à d'autres objets : machines, personnes, contrôles, clients, etc.
- Les archives et snapshots, leurs copies manuelles, les fichiers téléchargés, les impressions et les stockages externes. L'inventaire porte seulement sur les dossiers de sauvegarde configurés ; un inventaire indisponible n'est jamais présenté comme vide.
- La réintroduction de données par une restauration ancienne.
- L'effacement physique garanti des fragments sur disque, dans les pages SQLite, le journal WAL ou les sauvegardes du système.

Il n'y a pas de sauvegarde nominative supplémentaire créée spécialement avant ce nettoyage. Les sauvegardes automatiques habituelles restent susceptibles de contenir les données : leur durée et leur traitement doivent être prévus dans la décision de conservation.

## Vérifications réalisées

- Suite complète : **140 exécutions réussies**, en 131,5 s (`tests-nettoyage-complet.log`).
- Suite RGPD enrichie : 26 vérifications réussies, dont des assertions sur la parité des règles, les dates, les rôles, l'accès réseau, les sélections interdites, un aperçu périmé, le rollback SQL et une panne disque après commit. Dernière reprise ciblée après durcissement des dates : `tests-nettoyage-cible-final.log`.
- Parcours navigateur avec compte administrateur et base SQLite jetables : deux brouillons fictifs dans l'aperçu, aucune case cochée au départ ; suppression explicite d'un seul brouillon et de sa pièce jointe ; résultat affiché. Aucun nettoyage de données réelles.
- Démonstration : les sept traces fictives scellées sont protégées et aucune suppression n'est proposée.
- À 360 pixels, la page et la boîte de dialogue ne débordent pas horizontalement.

Les journaux de test et la sauvegarde source vérifiée `avant-nettoyage-formation.zip` se trouvent dans `C:\git\inerweb-fluide-sauvegardes\avant-corrections-2026-09-10`.

## Décisions encore nécessaires pour les traces scellées

La chaîne actuelle contient des informations personnelles et des liens avec le stock. Retirer une ancienne écriture ou remplacer son nom casserait ses empreintes et celles des contrôles de cohérence. Le présent chantier ne désactive aucun de ces contrôles.

La prochaine évolution structurelle doit prévoir des registres de formation séparables par période, le sort des identités et pièces nominatives, les dépendances du stock, la rotation des sauvegardes et le comportement à la restauration. Elle doit inclure une migration testée sur copies, une preuve de cohérence avant/après et une procédure d'archives adaptée à l'établissement. Une simple modification de durée dans l'interface ne suffirait pas.

Les finalités, les durées et les éventuelles obligations d'archives doivent être documentées par le responsable avec le DPD. La [CNIL explique les phases de conservation et d'archivage](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees) ; une durée de revue choisie dans le logiciel n'est pas, à elle seule, un fondement juridique de destruction.

## Mode Officiel et statut de diffusion

Le mode Officiel demeure verrouillé. Le [dossier de préparation à son ouverture](PREPARATION-OFFICIEL-2026-09-10.md) précise les points restant à établir. La consultation du RAG local a été retentée et a échoué (Ollama/embedding indisponible) ; aucune indexation n'a été réalisée. Cette livraison technique n'est pas un bon à tirer réglementaire.
