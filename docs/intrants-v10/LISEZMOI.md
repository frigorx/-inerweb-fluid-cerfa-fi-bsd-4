# Intrants V10 — matériaux fournis par Franck

Dossier d'archivage des supports qui nourriront la V10 (« l'assistant ») et
au-delà. On archive ici la copie de référence au moment de la remise ; la
source vivante reste chez son auteur.

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
