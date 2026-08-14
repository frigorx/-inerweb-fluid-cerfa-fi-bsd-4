# Bibliothèques tierces embarquées dans inerWeb Fluide

inerWeb Fluide est distribué sous **licence « code visible »** (voir `LICENSE`) : le code se
lit librement, l'usage du logiciel passe par une licence nominative.
Cette licence ne couvre **pas** les bibliothèques ci-dessous : chacune reste sous **sa propre
licence**, et ces licences vous sont accordées directement par leurs auteurs.

Ce logiciel n'utilise **aucune dépendance npm** : ces quelques bibliothèques sont embarquées
telles quelles dans `v8/js/lib/`, pour que l'application fonctionne **hors ligne**, sans
installation et sans chaîne de compilation.

> **Comment ce document a été établi** (constat P1-10 de l'audit du 25/07/2026). Chaque
> ligne a été relue **contre le fichier lui-même** : en-tête de licence présent ou absent,
> chaîne de version présente ou absente, taille mesurée. Quand le fichier ne porte pas la
> preuve de ce qu'on annonce, c'est **écrit ici**. Tout se recompte en trois commandes :
>
> ```
> ls -l v8/js/lib/            # tailles
> head -c 1200 v8/js/lib/<fichier>   # en-tête de licence
> grep -o '"[0-9]\+\.[0-9]\+\.[0-9]\+"' v8/js/lib/<fichier> | sort -u   # versions
> ```

## L'inventaire, en un tableau

Le dépôt embarque **QUATRE fichiers tiers** (2 362 164 octets, soit 2,25 Mio), pour
**trois projets**. Le cinquième fichier du dossier `v8/js/lib/` est de nous.

| Fichier | Projet | Version lisible dans le fichier | Licence RÉELLE | Taille |
|---|---|---|---|---|
| `v8/js/lib/pdf.min.mjs` | PDF.js (Mozilla) | **4.10.38** (build `f9bea397f`) | **Apache 2.0** | 398 237 o (389 Kio) |
| `v8/js/lib/pdf.worker.min.mjs` | PDF.js (Mozilla) | **4.10.38** (build `f9bea397f`) | **Apache 2.0** | 1 417 586 o (1 384 Kio) |
| `v8/js/lib/pdf-lib.min.js` | pdf-lib (Hopding) | **aucune** — le fichier ne porte pas de numéro de version | **MIT** (en amont) ; contient `tslib` sous **Apache 2.0** | 525 115 o (513 Kio) |
| `v8/js/lib/qrcode-vendor.js` | qrcodejs (davidshimjs) | **aucune** | **MIT** (en amont) | 21 226 o (21 Kio) |
| `v8/js/lib/qrcode.js` | **inerWeb Fluide — code MAISON** | sans objet | Tous droits réservés (comme le reste du dépôt) | 1 947 o (38 lignes) |

**Ce qui a changé le 26/07/2026** : la version précédente de ce document rangeait
`v8/js/lib/qrcode.js` sous « qrcodejs, davidshimjs, MIT ». **C'était faux.** Ce fichier fait
38 lignes, n'est pas minifié, porte un en-tête en français et dit lui-même que la
bibliothèque vendorée n'est plus là : c'est un **adaptateur écrit par nous**, qui se contente
de lire `window.QRCode`. Le dépôt embarque donc **quatre** fichiers tiers, pas cinq.

---

## PDF.js — affichage du CERFA officiel

- Fichiers : `v8/js/lib/pdf.min.mjs`, `v8/js/lib/pdf.worker.min.mjs`
- Version : **4.10.38**, build `f9bea397f` — les deux fichiers portent la même, en clair
  (`apiVersion:"4.10.38"`).
- Auteur : **Mozilla Foundation** et les contributeurs de PDF.js
- Licence : **Apache License 2.0** — <https://www.apache.org/licenses/LICENSE-2.0>
- Source : <https://github.com/mozilla/pdf.js>
- Rôle : rendre à l'écran le PDF officiel du CERFA 15497*04 une fois rempli.

**Vérifiable dans le fichier** : chacun des deux ouvre sur un bloc `@licstart` / `@licend`
« Copyright 2024 Mozilla Foundation — Licensed under the Apache License, Version 2.0 ».
Ces notices sont conservées **dans les fichiers eux-mêmes**, comme l'exige la licence
Apache 2.0. Ne les retirez pas lors d'une mise à jour.

**Composant embarqué détectable** : les deux fichiers contiennent **core-js 3.39.0**
(© 2014-2024 Denis Pushkarev, **MIT**), inclus par la chaîne de construction de PDF.js.
Il se voit en clair : `copyright:"© 2014-2024 Denis Pushkarev (zloirock.ru)"` et
`license:"https://github.com/zloirock/core-js/blob/v3.39.0/LICENSE"`. Le bloc `@licstart`
du fichier, lui, ne mentionne qu'Apache 2.0 : la notice MIT de core-js n'y figure pas.

## pdf-lib — remplissage du formulaire CERFA

- Fichier : `v8/js/lib/pdf-lib.min.js`
- Version : **non lisible dans le fichier** — il ne contient aucune chaîne de version
  (`grep` de motif `x.y.z` : zéro résultat). Ce qu'il porte, c'est le libellé de producteur
  PDF `pdf-lib (https://github.com/Hopding/pdf-lib)`.
- Auteur : Andrew Dillon et les contributeurs de pdf-lib
- Licence : **MIT**, d'après le projet en amont (<https://github.com/Hopding/pdf-lib>).
- Rôle : écrire les 72 champs du CERFA dans le PDF officiel (AcroForm).

⚠️ **Ce que le fichier prouve, et ce qu'il ne prouve pas.** Le **seul** en-tête de licence
présent dans `pdf-lib.min.js` est celui de **`tslib`** (© Microsoft Corporation,
**Apache License 2.0**), reproduit verbatim en tête du fichier — c'est la bibliothèque
d'aide de TypeScript, embarquée par la construction. La licence **MIT de pdf-lib
lui-même n'est PAS écrite dans le fichier** : elle est celle du dépôt d'origine.
L'audit du 25/07/2026 a relevé, à juste titre, que la version précédente de ce document
présentait `tslib` sous MIT ; `tslib` est **Apache 2.0**, et le fichier le dit.

## qrcodejs — étiquettes QR hors ligne

- Fichier tiers : `v8/js/lib/qrcode-vendor.js` (copie brute, non modifiée)
- Version : **non lisible dans le fichier** (le projet en amont ne numérote pas ses
  livraisons dans le code).
- Auteur : davidshimjs
- Licence : **MIT**, d'après le projet en amont (<https://github.com/davidshimjs/qrcodejs>).
- Rôle : produire les QR codes des étiquettes de machines et de bouteilles, sans aucun appel
  réseau (aucune donnée ne sort du poste).

⚠️ **Notice absente du fichier.** `qrcode-vendor.js` ne contient **aucune notice de
copyright d'origine** : la seule mention de l'auteur est celle de **notre** en-tête en
français (« lib QR code vendored (davidshimjs/qrcodejs) »). La licence MIT demande que la
notice de copyright soit conservée à la redistribution. C'est **une dette identifiée**, non
soldée à ce jour : elle se referme en recopiant l'en-tête MIT du projet d'origine en tête du
fichier vendoré. Elle est écrite ici plutôt que passée sous silence.

## Ce qui, dans `v8/js/lib/`, est de NOUS

- Fichier : `v8/js/lib/qrcode.js` — **38 lignes, code maison**, sous la licence du dépôt.
- Rôle : un **adaptateur** d'une seule fonction (`obtenirQRCode()`) qui lit `window.QRCode`,
  posé par le `<script>` classique `qrcode-vendor.js` chargé depuis `v8/index.html`.
- Pourquoi il existe : la bibliothèque d'origine ne supporte pas d'être exécutée dans un
  module ES (contexte strict, `this` indéfini) ; son en-tête raconte l'incident.

> Ce fichier est **exclu du paquet d'audit** avec le reste du dossier `v8/js/lib/` : le
> filtre du générateur écarte le **dossier entier**, pas les seuls fichiers tiers. Un
> auditeur qui veut le lire le trouve dans le dépôt, à ce chemin.

## Node.js — moteur d'exécution (paquet portable uniquement)

- Fichier : `node/node.exe` — présent **uniquement dans le paquet portable** (jamais dans le
  dépôt : rien de ce point n'est donc vérifiable depuis les sources seules).
- Auteur : **les contributeurs de Node.js** (Node.js contributors)
- Licence : **MIT**. Le binaire embarque aussi ses propres composants (V8, libuv, OpenSSL, ICU,
  zlib, c-ares…), **chacun sous sa licence** (BSD, Apache 2.0…).
- Source : <https://github.com/nodejs/node> — version embarquée : **v24.16.0**
- Rôle : exécuter le serveur local ; c'est grâce à lui que l'utilisateur n'a **rien à installer**.
- Le texte **complet** de la licence (Node.js et l'ensemble de ses composants) accompagne le
  binaire dans le paquet portable, sous **`node/LICENSE`** — comme l'exige la licence MIT
  (conservation de la notice de copyright lors de la redistribution).

## Document officiel

- Fichier : `v8/cerfa_15497-04_officiel.pdf` — 121 094 octets.
- Il s'agit du **formulaire CERFA 15497\*04 officiel**, publié par l'administration française
  (service-public.fr). Il est reproduit tel quel, sans modification, pour être rempli par
  l'application.
- Empreintes du fichier embarqué, pour que la comparaison avec le fichier publié se fasse
  **sans nous croire sur parole** :
  - MD5 : `b2ff63fb79c50384355d9fc2a8dcad75`
  - SHA-256 : `b142035bb9646e81493de055c3469f127478ec3bc87b7b599a51817a6f1058eb`

---

**Mise à jour d'une bibliothèque** : conservez systématiquement les en-têtes de licence du
fichier d'origine, et tenez ce document à jour — **en relisant le fichier**, pas la ligne
précédente de ce tableau. C'est une obligation de la licence Apache 2.0 (conservation des
notices), et une simple honnêteté envers les auteurs pour les licences MIT.
