# Changelog — inerWeb Fluide

> Journal de PRODUIT : une entrée par évolution visible, la plus récente en
> tête. Le journal de chantier détaillé (5 400 lignes au 14/08/2026) est
> conservé par l'auteur hors de ce dépôt ; l'historique git du dépôt reste,
> lui, complet et non réécrit.

## 2026-08-29 — l'enregistreur de températures : d'un cadrage à un dossier complet

- **Un module transversal `pedagogie/enregistreur-temperature/`** : 16 heures,
  quatre modules, six sondes NTC, deux ADS1115, un ESP32-C3, du Bluetooth. Le
  dossier de cadrage du 29/08 fixait le concept ; ce lot produit ce qui
  manquait — **le schéma, les onze programmes, le site compagnon et l'outil
  d'acquisition**.
- **Le schéma tranche trois choses que le cadrage laissait ouvertes.** La NTC va
  du côté de la masse, pour que la broche du jack ne porte jamais le 3,3 V. Les
  deux voies libres de l'ADS1115 mesurent la tension d'excitation et les piles —
  mesurer l'excitation avec le même convertisseur que la sonde **annule son
  erreur de gain** et divise l'erreur de mesure par dix, sans un composant de
  plus. Et le sélecteur PILES–0–USB ne tient que la règle d'usage : c'est une
  diode Schottky qui tient l'interdit, inconditionnellement.
- **Onze programmes progressifs**, un fichier chacun, du clignotement de LED à
  la version finale avec étalonnage en mémoire flash, extrema et reprise après
  panne d'un convertisseur.
- **Un outil d'acquisition qui est une page web**, pas une application :
  Bluetooth (service NUS) ou câble, six courbes, export CSV au format français.
  Il embarque un **mode démonstration** qui rejoue un démarrage de machine
  frigorifique — de quoi préparer la séance et faire lire des courbes avant que
  les appareils existent.
- **Deux planches s'impriment à l'échelle 1:1** : le gabarit de perçage et les
  étiquettes, chacune avec son carré de contrôle de 50 mm.
- **Les chiffres sont calculés, pas recopiés** : `outils/table-ntc.mjs` produit
  le tableau R(T) du dossier, `outils/bilan-energie.mjs` l'autonomie — avec le
  statut de chaque hypothèse. Deux filets les tiennent :
  `verifier-logique.mjs` **découpe les fonctions du firmware, les compile et les
  exécute** contre le modèle ; `verifier-module.mjs` passe 70 contrôles
  (constantes partagées, trame identique aux trois endroits, liens, charte,
  analyseur de la page confronté à ce que le firmware émet).
- ⚠️ **Aucun prototype n'a été monté, aucun programme n'a tourné dans un vrai
  ESP32-C3.** Le module porte le statut `Prototype à réaliser`, et
  `pedagogie/enregistreur-temperature/POINTS-OUVERTS.md` liste ce qui bloque,
  ce qui reste à mesurer et ce qui attend une décision.

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
