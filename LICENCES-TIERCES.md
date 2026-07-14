# Bibliothèques tierces embarquées dans inerWeb Fluide

inerWeb Fluide est distribué sous **PolyForm Noncommercial License 1.0.0** (voir `LICENSE`).
Cette licence ne couvre **pas** les bibliothèques ci-dessous : chacune reste sous **sa propre
licence**, et ces licences vous sont accordées directement par leurs auteurs.

Ce logiciel n'utilise **aucune dépendance npm** : ces quelques bibliothèques sont embarquées
telles quelles dans `v8/js/lib/`, pour que l'application fonctionne **hors ligne**, sans
installation et sans chaîne de compilation.

## PDF.js — affichage du CERFA officiel

- Fichiers : `v8/js/lib/pdf.min.mjs`, `v8/js/lib/pdf.worker.min.mjs`
- Auteur : **Mozilla Foundation** et les contributeurs de PDF.js
- Licence : **Apache License 2.0** — <https://www.apache.org/licenses/LICENSE-2.0>
- Source : <https://github.com/mozilla/pdf.js>
- Rôle : rendre à l'écran le PDF officiel du CERFA 15497*04 une fois rempli.

Les notices de licence sont conservées **dans les fichiers eux-mêmes** (blocs `@licstart` /
`@licend`), comme l'exige la licence Apache 2.0. Ne les retirez pas lors d'une mise à jour.

## pdf-lib — remplissage du formulaire CERFA

- Fichier : `v8/js/lib/pdf-lib.min.js`
- Auteur : Andrew Dillon et les contributeurs de pdf-lib
- Licence : **MIT**
- Source : <https://github.com/Hopding/pdf-lib>
- Rôle : écrire les 72 champs du CERFA dans le PDF officiel (AcroForm).
- Ce fichier inclut également `tslib` (© Microsoft Corporation, **Apache License 2.0**), dont la
  notice est conservée en tête du fichier.

## qrcodejs — étiquettes QR hors ligne

- Fichiers : `v8/js/lib/qrcode-vendor.js`, `v8/js/lib/qrcode.js`
- Auteur : davidshimjs
- Licence : **MIT**
- Source : <https://github.com/davidshimjs/qrcodejs>
- Rôle : produire les QR codes des étiquettes de machines et de bouteilles, sans aucun appel
  réseau (aucune donnée ne sort du poste).

## Document officiel

- Fichier : `v8/cerfa_15497-04_officiel.pdf`
- Il s'agit du **formulaire CERFA 15497\*04 officiel**, publié par l'administration française
  (service-public.fr). Il est reproduit tel quel, sans modification, pour être rempli par
  l'application. Son empreinte MD5 a été vérifiée identique à celle du fichier publié.

---

**Mise à jour d'une bibliothèque** : conservez systématiquement les en-têtes de licence du
fichier d'origine, et tenez ce document à jour. C'est une obligation de la licence Apache 2.0
(conservation des notices), et une simple honnêteté envers les auteurs pour les licences MIT.
