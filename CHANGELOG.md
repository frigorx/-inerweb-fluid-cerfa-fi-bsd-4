# Changelog — inerWeb Fluide

> Journal de PRODUIT : une entrée par évolution visible, la plus récente en
> tête. Le journal de chantier détaillé (5 400 lignes au 14/08/2026) est
> conservé par l'auteur hors de ce dépôt ; l'historique git du dépôt reste,
> lui, complet et non réécrit.

## 2026-09-20 — séance CAP IFCA « le pump-down simple »

### Nouveau dossier pédagogique `pedagogie/pump-down-cap-ifca/`

- Sources HTML de la séance 2CAP26-S39-02 du 21/09/2026, à la charte inerWeb Édu : fiche de cours n° 01 (5 pages) et TP-02-B élève avec sa ressource bornier (9 pages).
- Le cours s'arrête au **pump-down simple** : commande directe, sécurité minimum, pump-down. Le pump-down unique est annoncé aux élèves et reporté au cours suivant ; le cours passe de 1 h 20 à 1 h et le câblage retrouve ses 2 h.
- Schéma de commande repris en vectoriel depuis le folio 1/12 du fonds établissement, lisible à l'impression, et codes QR vers les animations inerweb.fr du pack Fluides.
- `python3 construire.py` régénère le PDF. Les documents professeur (corrigés, mention « ne pas distribuer ») restent hors dépôt.

## 2026-09-10 — portée des alertes et documents, transparence RGPD

### Préparation de l'utilisation réelle à l'école

- Un échec d'insertion d'une signature interrompt la génération du CERFA au lieu de produire silencieusement un PDF sans tracé.
- Scénario Officiel actualisé : véritable CERFA et contrôles périodique/non périodique sans effet de stock. 52 vérifications réussies dans une copie isolée ; commande reproductible `node outils/verifier-officiel-isole.mjs`.
- Verrou principal maintenu ; [conditions de mise en service](docs/MISE-EN-SERVICE-ECOLE-2026-09-10.md), notamment la liaison entre PDF et document signé encore à sécuriser.

### Suite : contrôle de la signature préalable après import

- Le détenteur ne peut plus signer après une signature technicien importée dont l'image est illisible, même si sa révision est courante. Contrôle identique en démonstration et sur le serveur.
- Le défaut est reproduit dans le contrat de tests avant correction ; le refus doit laisser le nombre de signatures inchangé.
- Le dossier de préparation explicite un obstacle restant : la correspondance entre PDF transmis et document signé n'est pas prouvée par le contrôle d'en-tête et de taille. Le mode Officiel reste verrouillé.

### Suite : simulation des contrôles et bilan des tests

- Les contrôles seuls ne demandent plus de pesées fictives dans le moteur Officiel ; leur résultat reste obligatoire. Charge, mise en service, récupération et transfert gardent leurs contrôles de pesées.
- Le lanceur distingue maintenant la suite Officiel suspendue des tests réussis. Les précédents chiffres de 140 réussites incluaient cette suspension.
- Le verrou reste actif. [Preuves, référence CERFA et limites](docs/PREPARATION-OFFICIEL-2026-09-10.md).

- Statuts explicites sur huit familles de documents imprimables et leurs planches ; portée des alertes et verrou du mode Officiel rendus visibles.
- Notices RGPD corrigées et bilan de conservation en lecture seule ; aucune purge automatique des historiques.
- Lisibilité et adaptation mobile améliorées. Les 140 exécutions de tests passent.
- [Bilan, sauvegarde et limites restantes](docs/REVUE-2026-09-10.md).

### Suite : nettoyage contrôlé des brouillons de formation

- Aperçu par date, sélection explicite, pièces et signatures comptées ; suppression locale réservée au référent/administrateur, avec refus des états périmés et reprise des fichiers verrouillés.
- Les traces scellées, journaux et sauvegardes restent à traiter séparément. Aucun effacement global n'est annoncé.
- Contrat DataStore v14 (98 méthodes). Suite complète : 140 exécutions réussies ; parcours local testé sur données fictives.
- [Utilisation et limites](docs/NETTOYAGE-FORMATION-2026-09-10.md) ; [préparation du mode Officiel](docs/PREPARATION-OFFICIEL-2026-09-10.md).

### Suite : séances fictives temporaires et pièces jointes du bac

- Nouvelle séance en mémoire depuis le tableau de bord local ou Sauvegarde : ni copie du registre, ni lecture de l'ancien bac, ni écriture des pièces dans IndexedDB. Recommencer retrouve le parc fictif fourni.
- La fin du mode exercice historique attend aussi l'effacement de ses pièces jointes ; un blocage par un autre onglet est signalé.
- 140 exécutions réussies (134,7 s), dont tests d'isolement et de fin d'exercice. [Fonctionnement et limites](docs/SEANCES-TEMPORAIRES-2026-09-10.md).

## 2026-08-30 — le livre HabFluide quitte ce dépôt

- **Le livre vit désormais dans `C:\git\livre-habfluide`**, dépôt autonome, avec
  ses 29 commits d'historique. Ce dépôt-ci ne contient plus `livret/`.
- **Pourquoi** : deux produits partageaient une racine — l'application fluide et
  un livre de 388 pages. Le livre travaillait de surcroît sur une branche
  d'agent (`claude/livret-habilitation-fluide-d5n1yt`) que `main` ne voyait pas :
  ouvert sur `main`, ce dépôt donnait à croire que le livre n'existait pas.
- **Avant le retrait** : les 28 commits de la branche ont été fusionnés dans
  `main`, et la fabrication complète a été rejouée depuis le nouveau dépôt
  (livret élève 7×10, couverture, corrigé formateur, paquet KDP).
- Les 17 branches d'agents de ce dépôt ont été refermées : leur travail était
  déjà dans `main` ou poussé sur `origin`.

## 2026-08-20 — la ligne CO₂ / R744 dans le logiciel, et sa relecture métier

- **Un module CO₂ / R744 embarqué et autonome** (`pedagogie/co2-r744/`) : treize
  escales, 67 écrans, 33 questions, **171 narrations enregistrées** — la voix
  Piper du site, pas la synthèse du navigateur. Chaque escale s'ouvre seule par
  `index.html?e=<identifiant>`. Le module tourne hors ligne, polices et sons
  compris.
- **Le fait qui commande ce module** : le R-744 relève de la **catégorie B**
  créée par l'arrêté du 21 novembre 2025, pas de la catégorie D qui ne couvre
  que la récupération des gaz fluorés.
- **Relecture métier passée** : six affirmations soumises à F. Henninot, chacune
  sur son texte. Le diagnostic de la vanne de gaz de détente bloquée ouverte a
  été **retiré** (déduit du fonctionnement, jamais observé sur machine) ; un
  écran distinguant l'**éjecteur de gaz de l'éjecteur de liquide** a été ajouté
  pour couvrir réellement le code 11.06. Le détail vit dans
  `pedagogie/co2-r744/RELECTURE-METIER.md`.
- ⚠️ Le nouvel écran sur les deux types d'éjecteur **n'a pas encore été relu par
  un frigoriste** ; le module porte toujours `status: "Relecture métier à faire"`.

## 2026-08-14 — version candidate, bêta Formation nominative

- **Distribution nominative** : le paquet portable ne se délivre plus qu'au
  nom d'un destinataire, avec une licence signée (Ed25519) vérifiée au
  démarrage, entièrement hors ligne. Licence expirée = consultation, exports
  et sauvegardes ouverts sans limite ; nouvelles saisies fermées.
- **Licence du dépôt** : « code visible » — lecture libre, usage sur licence
  nominative (gratuite pour l'enseignement), redistribution soumise à accord
  écrit. Les versions distribuées avant le 14/08/2026 restent régies par
  leur licence d'époque.
- **Revue externe de sécurité** passée et traitée le jour même : verrou de
  lecture seule remonté en amont de toutes les routes, Node embarqué porté
  en 24.19.0 (empreinte vérifiée), rotation de la clé de signature, textes
  complets des licences tierces embarqués (`LICENSES/`).
- **Contrôle continu** : le filet complet (140 exécutions) est joué par
  GitHub Actions sur chaque poussée.
- **Documentation triée** : le dépôt ne raconte plus le chantier ; il
  documente le produit (voir `docs/INDEX.md`).
- **Le logo de la charte inerWeb** (référence figée) remplace l'ancienne
  marque simplifiée : vitrine, guide, application et documents imprimés
  portent le même SVG (`v8/js/core/logo.js`, copie dans `img/`).
- **Premier démarrage tenu par la main** : chaque paquet embarque
  `PREMIER-DEMARRAGE.html` (une page illustrée : extraction, avertissement
  Windows, premier compte), un script optionnel de raccourci Bureau, et le
  lanceur explique lui-même l'erreur du « double-clic dans le ZIP non
  extrait ».

## Avant le 14/08/2026

Le développement (juillet–août 2026 : registre scellé à empreintes chaînées,
mode Formation/Officiel, coffre des identités, mode exercice, visite guidée
narrée, 4 audits externes traités) est retracé dans l'historique git de ce
dépôt et dans le journal de chantier de l'auteur.
