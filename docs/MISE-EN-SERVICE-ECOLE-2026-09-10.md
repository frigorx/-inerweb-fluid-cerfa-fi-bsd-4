# Préparation du registre réel de l'atelier

Demande de Franck : utilisation la semaine suivante pour de vraies bouteilles et de vraies manipulations. Il confirme que l'établissement possède une attestation de capacité et un référent avec l'attestation d'aptitude correspondante. Les documents n'ont pas été examinés : leurs catégories, opérations couvertes et dates devront être correctement renseignées.

Cadrage confirmé : produit commun adaptable aux établissements scolaires et aux professionnels du froid et de la climatisation. L'école est un premier usage réel, pas une édition limitée à ses fluides. Les règles doivent découler du référentiel du fluide, de l'opération, de l'équipement et des habilitations configurées. Une donnée inconnue doit être signalée explicitement, sans déduire une autorisation. Les scénarios d'essai doivent couvrir les différentes familles et opérations ; aucune liste de fluides propre au lycée ne doit devenir une restriction du produit.

**Décision actuelle : pas encore de feu vert pour remplacer le registre opérationnel de l'établissement.** Le mode Officiel reste verrouillé. Le mode Formation et les séances fictives ne constituent pas un repli pour enregistrer des interventions réelles. Conserver le dispositif de traçabilité déjà utilisé par l'établissement jusqu'à la mise en service validée.

## Preuves obtenues

- Parcours Officiel exécuté sur une copie temporaire du code, avec bases SQLite jetables et sans serveur réseau. Le verrou de cette copie seulement est ouvert. Les fichiers du verrou principal sont comparés par SHA-256 avant/après.
- 52 vérifications réussies : signatures, génération d'un CERFA véritable relu avec pdf-lib, conservation, contrôle d'altération, transfert, contre-écriture, dossier d'audit et export/réimport. Contrôles périodique et non périodique signés/validés sans pesées, quantité nulle, stocks et charge inchangés.
- Le générateur interrompt désormais le PDF si un tracé ne peut pas être inséré. Il ne masque plus cette erreur en produisant le document sans signature. Test de régression inclus, 125 vérifications du générateur réussies.
- La suite historique gelée avait omis la portée de capacité dans son décor et utilisait un texte commençant par `%PDF` pour son parcours nominal. Le décor et ce parcours utilisent maintenant les données et le PDF réels du scénario fictif.

Rejouer l'essai isolé depuis le dépôt : `node outils/verifier-officiel-isole.mjs`. Le journal et la copie sont conservés dans le dossier temporaire annoncé. Cette commande ne modifie aucun réglage de production et ne constitue pas une commande de déverrouillage.

## Conditions de mise en service

| Point | Situation et action nécessaire |
|---|---|
| PDF présenté, signé et conservé | Bloquant : le PDF fourni par le client n'est pas encore lié à une référence documentaire figée et contrôlée par le serveur. Prouver le refus de substitution d'un autre PDF lisible ; ne pas se contenter d'une vérification de syntaxe. |
| Périmètre produit | Moteur commun pour établissements et professionnels. Éprouver les familles réglementaires et les opérations, les entrées inconnues et les frontières des autorisations ; configuration de chaque client séparée du code métier. |
| Registre initial | Sur ce PC, la base habituelle `%LOCALAPPDATA%/inerWeb-Fluide/data/inerweb-fluide.db` a été lue sans modification : zéro mouvement, bouteille, machine et fiche du personnel au moment de cette passe. Cela ne décrit pas le poste de l'école ni d'autres copies. Préparer un inventaire réel contrôlé, sans inventer les masses initiales. |
| Compétences et responsabilités | Renseigner les attestations réelles, dates et portées, les utilisateurs habilités et le compte du référent. Éviter les identifiants fictifs du scénario de test. |
| Sauvegarde et reprise | Les tests sur bases jetables doivent passer. Effectuer aussi une sauvegarde vérifiée et une restauration sur une copie du poste candidat après inventaire, incluant les pièces, puis comparer les compteurs et l'intégrité. |
| Poste de l'école | Installer le candidat sur le poste réellement retenu ; vérifier impression, accès et reprise après redémarrage. Un test sur le PC de développement ne remplace pas cette réception. |
| Passage au réel | Consigner la version, le résultat des vérifications, le stock de départ et le responsable. Ouvrir le mode Officiel seulement après résolution des blocages. Ne pas modifier le verrou pour satisfaire le calendrier. |

Le parcours nominal réussi ne constitue ni un audit exhaustif de sécurité ni une certification juridique. Le détail des autres limites réglementaires reste dans [la préparation du mode Officiel](PREPARATION-OFFICIEL-2026-09-10.md).
