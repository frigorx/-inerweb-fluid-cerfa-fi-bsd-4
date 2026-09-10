# Séances fictives temporaires et fin d'exercice

## Pourquoi cette étape

Le lanceur du logiciel utilise, pour une installation neuve sans chemin personnalisé, la base située dans `%LOCALAPPDATA%\inerWeb-Fluide\data`. La vérification en lecture seule du 10 septembre 2026 sur ce poste a trouvé une base de version 37, sans mouvement, fiche de personnel ni pièce jointe. Aucun historique scellé n'était donc à migrer dans cette base au moment du contrôle. Cela ne constitue pas un inventaire des anciennes copies, sauvegardes ou navigateurs.

Le travail porte sur la prévention et sur un défaut d'effacement du bac existant. Aucun contenu réel n'a été supprimé ni migré.

## Utiliser une séance temporaire

Depuis le **tableau de bord local** ou **Sauvegarde**, cliquer sur **Ouvrir une séance fictive temporaire**. Un nouvel onglet s'ouvre avec le parc fictif fourni par le logiciel. Un bandeau précise le mode et sa durée de vie.

- Les fiches, mouvements, signatures et octets des pièces jointes de cette séance restent en mémoire.
- La création de la séance ne lit ni le registre réel, ni la sauvegarde de l'ancien DemoStore, ni sa base de pièces jointes IndexedDB. Elle ne les efface pas non plus.
- Chaque instance possède ses données et sa propre réserve de pièces jointes.
- **Recommencer** ou actualiser la page repart du parc fictif initial. Quitter la séance abandonne le travail en mémoire. Une navigation de retour depuis le cache du navigateur force un rechargement.
- La navigation entre les écrans, au sein de la même séance, conserve le travail en mémoire.
- Une importation JSON explicitement choisie est chargée en mémoire sans provoquer de rechargement. Elle peut contenir des données personnelles : ne pas importer de fichier nominatif réel pour les exercices ordinaires.
- Les exports JSON et impressions sont volontaires et restent disponibles hors de la séance. Le JSON ne transporte pas les octets des pièces jointes : les conserver séparément si nécessaire.

L'absence de persistance concerne le code applicatif de cette séance, pas les mécanismes du système d'exploitation, les captures d'écran, les téléchargements ou une garantie d'effacement physique de la mémoire. Aucun nom réel n'est nécessaire pour s'exercer.

Le mode exercice historique sur photo réelle reste disponible, avec son code de déblocage et sa persistance existants. La nouvelle séance ne le remplace pas et ne nettoie pas ses données silencieusement.

## Correction de la fin d'exercice historique

Le bouton de fin effaçait les clés du bac dans localStorage, mais ne demandait pas la suppression de la base IndexedDB contenant les fichiers joints. L'interface appelle désormais `terminerExerciceComplet` : elle attend la suppression de la base des pièces, puis efface et contrôle les clés du cycle.

Si la suppression est refusée ou bloquée par un autre onglet, un message reste affiché et aucun succès n'est annoncé. Fermer les autres onglets concernés puis réessayer. Les suppressions locales et IndexedDB ne forment pas une transaction unique : après un échec, le nettoyage peut être partiel. Le résultat doit être contrôlé, sans supposer que les données ont toutes disparu.

Les textes ne promettent plus une destruction de toute trace. Les fichiers téléchargés, impressions et copies système restent hors de cet effacement. Le registre SQLite n'est jamais effacé par cette commande.

## Vérifications

- Suite complète : **140 exécutions réussies en 134,7 s** (`tests-seance-complet.log`).
- Suite du mode exercice enrichie : **20 vérifications réussies**, comprenant des assertions de zéro accès à fetch, localStorage et IndexedDB pendant la création et les mutations d'une séance, y compris les pièces jointes.
- Deux instances indépendantes : l'import des seules métadonnées dans la seconde ne permet pas de retrouver les octets détenus par la première.
- Fin d'exercice : erreurs et blocages IndexedDB simulés ; conservation des clés tant que la suppression des pièces n'est pas confirmée, puis contrôle de leur absence.
- Navigateur : modification du nom d'une machine fictive visible dans la séance, puis disparition de cette modification après **Recommencer** ; la machine initiale est retrouvée. À 360 pixels, aucun débordement horizontal de la page.
- Les bases réelles n'ont reçu aucune écriture lors de ces vérifications. Le serveur de démonstration temporaire est arrêté après les essais.

Les journaux sont conservés dans le dossier de sauvegarde du chantier, hors du dépôt. Les tests ne prouvent pas un effacement forensique des supports.

## Ce qui reste ouvert

La nouvelle séance évite de constituer un historique nominatif persistant pour les exercices courants. Elle ne purge pas un registre SQLite qui contiendrait déjà des écritures scellées, ni ses journaux et sauvegardes. L'évolution structurelle décrite dans [le dossier de nettoyage](NETTOYAGE-FORMATION-2026-09-10.md) reste nécessaire pour traiter ce cas sur une installation qui en contient.

Le mode Officiel demeure verrouillé. Son [dossier de préparation](PREPARATION-OFFICIEL-2026-09-10.md) reste applicable. Cette étape n'est pas une ouverture réglementaire ni une validation juridique globale.
