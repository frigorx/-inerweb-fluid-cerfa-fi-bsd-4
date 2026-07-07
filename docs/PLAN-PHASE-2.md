# inerWeb Fluide — Plan Phase 2 (consigne de reprise)

> À lire en premier au démarrage d'un chat Phase 2. Dernier commit socle : `7670042`.
> Rien n'est cassé, dépôt propre. Cette consigne complète `REPRISE.md` (état exact) et le CHANGELOG.

## Cap

**Produit fini clé en main, transposable sans friction (autres postes / autres profs, peu
d'interventions PC). La déployabilité prime ; le réglementaire s'enrichit ensuite, lot par lot.**
On ne retient pas la livraison en otage du gros chantier habilitations.

## Décisions figées (ne pas rouvrir)

- **Multiposte** = architecture *préparée* seulement (rien de construit avant septembre : ni serveur
  multi-utilisateur, ni réservation bouteille/machine).
- **Code machine** `JR-CF-001` (SITE-FAMILLE-NUMÉRO) *remplace* le code court `M1/M2`. Le
  `code_public` opaque du QR reste distinct et inchangé.
- **Rôles** : ADMIN, REFERENT, ENSEIGNANT, ELEVE. Restaurer le coffre = ADMIN + REFERENT.
- **Cloud** : jamais la base SQLite active dans un dossier synchronisé Drive/OneDrive (le cloud
  transporte des sauvegardes, il n'est pas moteur de base).
- **Sécurité de travail** : toute vérification dans une copie sandbox isolée (port ≠ 2011), jamais
  le dossier `data/` réel. Cf. incident 06/07.
- **Zéro dépendance npm nouvelle** (Node natif). Zéro emoji dans l'interface. Français accentué.

## Ordre d'exécution (un chat par lot)

**Lot 0 — débloquant (≈ 1 soirée).** Élargir la contrainte `pieces_jointes.categorie`
(`schema.sql:506-508`) : elle refuse aujourd'hui `SIGNATURE`, `ATTESTATION_APTITUDE`,
`ATTESTATION_CAPACITE`, `BORDEREAU_BSFF`, `CERTIFICAT_ETALONNAGE` → échec en Mode Local (SQLite),
marche seulement en Démo. Fil rouge de tout le CDC (bloque dossier documentaire, outillage, audit,
habilitations). Migration + tests. **C'est le premier geste.**

**Lot 1 — clé en main (cœur de la demande).**
- Paquet portable autonome : Node *embarqué* dans le dossier de l'appli, appelé par le `.bat`
  (`.\node\node.exe server\serveur.js`) → plus de « node n'est pas reconnu », double-clic sur poste
  vierge. Approche recommandée = node.exe local, PAS pkg/SEA (cohérent zéro-dépendance).
- Version « propre » du dépôt (sortir l'ancien v7 + la doc interne) pour le zip qu'on donne.
- Épreuve du feu : installation sur un poste vierge, démarrage du premier coup.

**Lot 2 — zéro perte.** Dossier de sauvegarde configurable (pointant vers un dossier déjà
synchronisé) + alerte visible si dernière sauvegarde ancienne. Bouton « Sceller le dossier annuel »
(empreinte SHA-256 du ZIP audit). Export audit embarquant toutes les preuves (pas que les CSV).

**Lot 3 — audit (le gros morceau).** Table `habilitations` séparée (rôle applicatif / attestation
capacité établissement / attestation aptitude personne, régimes 2008 et 2025 A1/A2/B/C/D/E/V
coexistants). Mode officiel réellement bloquant (habilitation, outil conforme, CERFA obligatoire
selon l'opération ; alerte en formation). Écran « état de confiance ». Historiques machine/bouteille
dédiés. **Prérequis : Franck valide le contenu réglementaire (catégories, seuils, dates) sur le
texte officiel avant de coder une règle en dur.**

**Lot 4 — métier complet.** Code machine `JR-CF-001`. Outillage : QR + étiquette + lien
intervention → outils utilisés *multi-outils* (aujourd'hui seul le détecteur est lié). Export ZIP
par machine et par client. Tableau de bord enrichi. Vérifier les seuils réglementaires exacts du
contrôle d'étanchéité (tonnes équivalent CO₂).

**Différé.** V1.5 : relevés élèves tablette (bloqué RGPD §16.5), calculette/diagramme Frigolo,
sondes Testo BLE. V2 : multiposte par contributions nominatives (fusionner des événements, pas des
états), cloud partagé, pont HAL, export inspecteur. Aucun avant que 0→4 soient verts.

## Ce qui attend Franck

- Contenu réglementaire (lot 3) : catégories 2025, seuils, bloquant vs alerte — sur texte officiel.
- RGPD élèves §16.5 : déclaration lycée + information familles avant tout module relevés (V1.5).
- Version définitive du cahier des charges Phase 2 (échanges GPT en cours).

## Méthode

Tests d'abord → code → revue adversariale du cœur → contrôle navigateur (par moi, sandbox isolé) →
CHANGELOG + commit + push + mémoire. Sonnet au maximum ; Opus réservé aux points durs (sécurité,
crypto, atomicité, archi). Le contrat doit rester vert (244/0), aucune régression avant commit.

## Déjà construit (ne pas refaire)

E5 comptes/sessions · registre écritures figées + WORM + hash chaîné · coffre-fort sauvegarde/
restauration (VACUUM INTO) · CERFA 15497*04 (72 champs) · fiche machine + QR + étiquette + fiche
identification A4 · bouteille + QR + étiquette · feuille de mise en service · bon d'intervention ·
lot métier F-Gas (pas de mélange, cycle fuite) · outillage à ~80 % (table + vue + alertes +
détecteur lié). Détails dans le CHANGELOG.
