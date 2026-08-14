# Licence et droits — module « Le Circuit Fantôme »

Ce fichier ne remplace pas la licence du dépôt : il précise ce qui s'applique
**à ce module**, où sont les obligations envers des tiers, et ce qui reste à trancher.

---

## 1. La licence du module

Le module suit la licence du dépôt : **« code visible »** (lecture libre, usage par
licence nominative, redistribution soumise à accord écrit),
© 2026 Franck Henninot — voir [`LICENSE`](../../LICENSE) à la racine.

En clair, et c'est le texte de la racine qui fait foi :

- **Les lycées, CFA, universités, administrations et associations** peuvent utiliser,
  copier, modifier et diffuser ce module **librement et gratuitement**, quelle que soit
  leur source de financement.
- Tout usage **commercial** — société de froid, bureau d'études, organisme de formation
  privé à but lucratif, éditeur de logiciel — demande une licence distincte :
  écrire à `inerweb.fh@gmail.com`.

Cela couvre le code (JS, CSS, Python) **et** le contenu pédagogique rédigé pour ce module :
les 8 règles de lecture, les 12 pièges, les définitions du trousseau, les ateliers du module 2,
les fiches de séance, l'interrogation et son barème.

---

## 2. Obligation envers QElectroTech — attribution requise

41 symboles frigorifiques et 8 capteurs viennent de
[`frigorx/inerweb-symboles`](https://github.com/frigorx/inerweb-symboles), qui les a lui-même
convertis depuis la **collection d'éléments de QElectroTech**.

> Cette collection est publiée sous **Creative Commons Attribution 3.0** (CC BY 3.0).
> Sa licence précise que l'usage des éléments **pour autre chose que la réalisation de schémas
> électriques** oblige à respecter les termes de CC BY 3.0 — donc à **créditer**.

Extraire des symboles pour en faire une application pédagogique **n'est pas** « réaliser un
schéma électrique ». **L'attribution est donc obligatoire**, et elle l'est aussi pour le dépôt
`inerweb-symboles` lui-même, qui ne porte à ce jour aucun fichier de licence.

### Attribution portée par ce module

> Symboles issus de la collection d'éléments **QElectroTech**
> (<https://qelectrotech.org/>), publiée sous
> [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/),
> convertis et adaptés par F. Henninot.
> Licence des éléments : <https://qelectrotech.org/wiki_new/doc/elements_license>

### Ce qui reste à faire, en amont

Ajouter cette même attribution dans `frigorx/inerweb-symboles` — un fichier `LICENSE`
et une mention dans le `README`. Sans cela, c'est ce dépôt-là qui est en défaut, pas celui-ci.

**Note** : la licence QElectroTech interdit par ailleurs l'usage de ces fichiers comme jeu
d'exemples pour entraîner des modèles d'apprentissage automatique.

---

## 3. Les symboles redessinés

Une vingtaine de symboles absents de la bibliothèque ont été **redessinés** pour ce module,
d'après le document de référence. Un symbole normalisé n'est pas une œuvre : c'est une
convention de représentation, et le redessiner ne pose pas de difficulté.

Ils sont couverts par la licence du dépôt (§ 1). Le détail symbole par symbole est dans le
[`README.md`](README.md).

---

## 4. Les textes — réglé

Les textes de la colonne « À quoi ça sert ? » ont d'abord été repris du document de référence,
pages 81 à 89. **Ils ont été entièrement réécrits.** Le sens technique est conservé, la rédaction
est propre au module : similarité moyenne de 57 % avec les formulations d'origine, mesurée texte
par texte.

Il ne subsiste donc **aucun texte de tiers** dans le contenu diffusé. Le module est intégralement
couvert par la licence du § 1, et peut être réutilisé dans un autre projet sans emporter de
dépendance.

Le seul emprunt restant est **graphique** : les symboles issus de QElectroTech, couverts par
l'attribution CC BY 3.0 du § 2.

Ce que le document de référence reste : **la source d'où vient le périmètre** — quels organes
traiter, dans quel ordre, avec quels repères sur le schéma des pages 88-89. Un plan de chapitre
n'est pas une œuvre protégeable, et le module ne le reproduit pas.

## 5. Ce qui ne protège rien

Pour éviter d'y perdre du temps : sur une application web servie par GitHub Pages, il n'existe
**aucun moyen technique** d'empêcher la copie du contenu.

- Minifier ou obscurcir le JavaScript ne protège rien : le navigateur doit pouvoir l'exécuter,
  donc n'importe qui peut le lire. Cela ne gêne que la maintenance.
- Bloquer le clic droit, la sélection ou `F12` se contourne en deux secondes, et pénalise
  d'abord les élèves — en particulier ceux qui utilisent un lecteur d'écran.
- Le code source est de toute façon public sur GitHub, ce qui est le but.

**Ce qui protège réellement**, ce sont trois choses non techniques :

1. **La licence** — elle est claire, elle est écrite, elle nomme l'auteur.
2. **L'historique Git** — il horodate chaque ligne et prouve l'antériorité. C'est la preuve
   la plus solide dont on dispose en cas de litige.
3. **La signature dans les fichiers** — l'en-tête de chaque page et de chaque document imprimé
   porte « inerWeb Édu — F. Henninot ».

---

## 6. Ce que le module ne collecte pas

À dire aux élèves, aux familles et à la direction si la question vient — c'est vérifiable dans
le code :

- Aucun compte, aucun identifiant, aucun mot de passe.
- La progression est écrite dans le **`localStorage` du navigateur** et **nulle part ailleurs**.
  Un bouton « Effacer ma progression » l'efface définitivement.
- **Aucune requête sortante** : ni analytique, ni police distante, ni image distante, ni
  service tiers. La politique de sécurité déclarée dans `index.html`
  (`default-src 'none'; connect-src 'self'`) l'interdit techniquement — le navigateur bloque
  toute tentative, y compris introduite par erreur.
- Aucun cookie.

Aucune donnée à caractère personnel n'est traitée : le module ne relève d'aucune formalité RGPD.

---

*inerWeb Édu — F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO*
