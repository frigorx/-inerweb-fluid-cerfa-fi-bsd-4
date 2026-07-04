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
