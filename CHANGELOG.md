# Changelog — inerWeb Fluide

> Journal de PRODUIT : une entrée par évolution visible, la plus récente en
> tête. Le journal de chantier détaillé (5 400 lignes au 14/08/2026) est
> conservé par l'auteur hors de ce dépôt ; l'historique git du dépôt reste,
> lui, complet et non réécrit.

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
