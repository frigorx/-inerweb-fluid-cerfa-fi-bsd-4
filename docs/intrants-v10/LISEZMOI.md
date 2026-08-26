# Intrants V10 — matériaux fournis par Franck

Dossier d'archivage des supports qui nourriront la V10 (« l'assistant ») et
au-delà. On archive ici la copie de référence au moment de la remise ; la
source vivante reste chez son auteur.

## _GALERIE.html — la bibliothèque visuelle (à tenir À CHAQUE remise)

- **Créée le 04/08/2026 (demande Franck)** : l'archive VISUELLE — une carte par
  support remis, aperçu intégré, frise des symboles validés. Objectif affiché :
  la bibliothèque pour préparer l'habilitation fluide, à partager aux collègues
  pour récolter leurs retours.
- S'ouvre en double-clic (liens relatifs) ; une version Artefact (supports
  incorporés en base64) est publiée depuis la même page pour le partage web —
  la régénérer à chaque mise à jour (le générateur vit dans la session, le
  patron : gabarits `<script type="text/plain" id="gabarit-*">` en base64).
- **RÈGLE : chaque nouvelle remise de Franck = archivage ici + une carte
  ajoutée à la galerie + republication de l'Artefact.** Rien ne se perd.
- ⚠ Réparation d'archive du 04/08 : `frigolo-mollier.html` archivé le 04/07
  portait deux `\!==` (échappement shell parasite introduit à l'archivage)
  qui cassaient son bloc anti-copie — corrigé en `!==`, fidèle à la source
  vivante ; `testo-ble-discovery.html` sain.

## bouteille-liquide-pedagogique/ — module inerWeb Édu (14 écrans)

- **Remis par Franck le 04/08/2026** (zip), archivé après revue le jour même.
- Module autonome « Comprendre la bouteille liquide » : réservoir de liquide,
  tube plongeur, vanne de départ Rotalock (P/P1), pump-down, variations de
  niveau, dimensionnement, DESP. 14 écrans, hors ligne, zéro dépendance,
  quiz final 6 questions (seuil 5/6), version imprimable.
- **Revue du 04/08 (session inerWeb Fluide)** — verdict : module solide,
  prêt pour validation métier.
  - QA dynamique rejouée en navigateur (4 formats 1024/1366/390/360) :
    aucun débordement, activités fonctionnelles, quiz 6/6, zéro erreur
    console. Charte inerWeb Édu conforme (Calibri/Trebuchet, #1b3a63/#ff6b35,
    fond clair, jamais justifié). Croix du Frigoriste respectée sur les
    circuits. Contenu métier sans erreur relevée (DESP 2014/68/UE, PS/TS/V,
    ordre de la ligne liquide, avertissement P1 sous pression), aucune
    valeur inventée.
  - ⚠️ **`tests/qa.mjs` du zip d'origine remplacé ICI par la version
    corrigée** : la QA livrée visait une autre version du module (attendait
    15 écrans au lieu de 14, jouait un corrigé de quiz étranger
    `[1,0,2,1,0,2]` au lieu de `[1,0,2,0,0,0]`, attendait « sécurités »
    dans le message final du pump-down au lieu de « le pressostat BP arrête
    le compresseur ») — elle n'avait jamais pu passer contre ce livrable.
    Le chemin Edge du poste de Franck est conservé.
  - Seule nuance charte consignée : le texte de détail descend à 0,91 em
    (~14,5 px), compensé par le réglage A−/A+ (`lisibilite.js`) — à remonter
    si l'on veut coller strictement au « 14 pt minimum ».
- Réutilisable côté Fluide : la coupe de bouteille et les symboles validés
  (`assets/symboles/`) pour les fiches bouteilles/machines ; le mini-TP
  « relever PS, TS, V » rejoint la logique de la fiche outillage/DESP.

## frigolo-mollier.html — traceur de diagramme log(p)-h

- **Remis par Franck le 04/07/2026.**
- Source vivante : https://frigorx.github.io/inerweb-frigolo/outils/frigolo-mollier.html
  (dépôt `frigorx/inerweb-frigolo`, dossier `outils/`).
- « FRIGOLO Mollier v3 PRO » : page **entièrement autonome** (zéro dépendance,
  doctrine maison), 51 Ko.
- Contenu réutilisable pour la piste V10 « diagramme enthalpique » (vision
  §9.4, point 3) :
  - **noyau thermodynamique** : tables de saturation par fluide
    `[T °C, P bar abs, h_liq, h_vap, s_liq, s_vap]` au pas de 5 °C, point
    critique (Tc, Pc), Cp vapeur/liquide, entropie de référence —
    6 fluides : R-32, R-410A, R-134a, R-404A, R-290, R-22 ;
  - interpolation (`lerp`/`satAt`), construction du cycle depuis
    BP/HP/surchauffe/sous-refroidissement, **COP** et taux de compression ;
  - valeurs par défaut réalistes par fluide + jeux d'exercices (EXO/EXSC).
- **Pistes d'intégration V9.2+/V10** : extraire le noyau (tables +
  interpolation) en module ES `v8/js/thermo/` ; tracer le cycle MESURÉ depuis
  les relevés de la fiche machine (HP/BP/T° → surchauffe et
  sous-refroidissement réels superposés au cycle de référence) ; alimenter le
  module d'identification de problèmes (règles déterministes sur les écarts).
- ⚠ Fluides à recouper avec le référentiel `fluides` du registre (R-22 absent
  du seed v8 — fluide interdit à la charge mais présent en atelier ; R-407C,
  R-1234yf, R-455A, R-744 absents du traceur).

## testo-ble-discovery.html — reconnaissance GATT des sondes Testo

- **Remis par Franck le 04/07/2026.** Sondes visées : **549i** (pression
  HP/BP) et **115i** (température à pince) — Franck possède les sondes.
- Outil de DÉCOUVERTE (Web Bluetooth, Chrome/Edge uniquement) : se connecte
  à une sonde, énumère services et characteristics GATT, lit les valeurs en
  hexadécimal avec tentatives de décodage (uint8, int16LE, float32LE,
  uint16LE), écoute les notifications. Autonome, zéro dépendance.
- **Objectif long terme (Franck)** : relevés remplis AUTOMATIQUEMENT depuis
  les sondes — scan QR machine → la mesure entre seule dans la feuille de
  relevés (V9.2) → comparaison au modèle de référence → cycle mesuré tracé
  sur le Mollier. La chaîne complète de l'atelier connecté.
- **Prochain pas concret (côté Franck, 10 min à l'atelier)** : ouvrir cet
  outil dans Chrome, connecter chaque sonde réelle, puis relever/copier le
  journal (UUID des services propriétaires Testo + trames hexadécimales
  pendant qu'une mesure varie). C'est L'INTRANT qui permettra d'écrire le
  connecteur (le format des trames Testo est propriétaire, il se découvre
  sur le vrai matériel).
- ⚠ **Contraintes techniques à garder en tête** :
  - Web Bluetooth exige un **contexte sécurisé** : HTTPS (GitHub Pages ✔)
    ou `localhost` (mode Local sur le poste ✔) — mais PAS `http://IP-du-LAN`
    depuis une tablette : le scénario « tablette qui scanne ET lit les
    sondes » demandera HTTPS sur le LAN (à trancher avec l'écoute LAN,
    décision §16.6) ;
  - Chrome/Edge uniquement (pas Firefox/Safari) ;
  - une sonde déjà appariée à l'application smartphone Testo refuse la
    connexion — la libérer d'abord.
- Échéance : après V9.2 (relevés) — piste 5 de la vision §9.4.
