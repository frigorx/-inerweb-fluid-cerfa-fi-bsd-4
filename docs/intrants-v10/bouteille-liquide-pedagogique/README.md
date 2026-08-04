# Bouteille liquide — parcours pédagogique inerWeb Édu

Module autonome consacré à la bouteille liquide frigorifique, à son tube plongeur et à sa vanne
de départ liquide. Il fonctionne hors ligne, sans serveur, sans CDN et sans média tiers.

## Ouvrir le module

Double-cliquer sur `index.html`.

## Parcours

Le module comporte quatorze écrans :

1. reconnaître une bouteille liquide ;
2. la placer après le condenseur ;
3. comprendre sa fonction de réserve ;
4. ouvrir le récipient et nommer ses éléments ;
5. suivre le prélèvement par le tube plongeur ;
6. distinguer l’entrée et le départ liquide ;
7. comprendre la vanne de départ liquide ;
8. distinguer les prises P et P1 de la vanne étudiée ;
9. voir le rôle de stockage pendant un pump-down ;
10. relier le niveau à la température extérieure et à l’ouverture du détendeur ;
11. comprendre le besoin de volume libre et de dimensionnement ;
12. distinguer bouteilles verticales et horizontales ;
13. lire la plaque DESP et distinguer les protections contre la surpression ;
14. vérifier les acquis avec six situations corrigées.

## Contrat du module

- une idée principale par écran ;
- écran entier dans `100dvh`, sans défilement ;
- navigation au clavier avec `←` et `→` ;
- lecture vocale facultative, jamais automatique ;
- vitesses `0,80 · 0,95 · 1,10 · 1,25`, défaut `0,95` ;
- clé locale de vitesse : `inerweb-bouteille-liquide-rate` ;
- arrêt de la voix au changement d’écran, à la sortie et lorsque la page devient cachée ;
- six questions finales, seuil pédagogique `5/6` ;
- fonctionnement complet sans voix et sans stockage ;
- version imprimable en A4 paysage.

## Images et droits

Les compositions et animations sont originales. Les organes du circuit réemploient les SVG de la
bibliothèque interne validée inerWeb ; aucun média tiers n’est intégré. Les documentations
constructeur servent uniquement de références techniques.

Le fichier `SOURCES-IMAGES.md` consigne cette situation. Le fichier `SOURCES-TECHNIQUES.md`
répertorie les faits retenus et leurs sources primaires.

## Fichiers principaux

- `index.html` : structure accessible du module ;
- `styles.css` : projection, téléphone et animations ;
- `app.js` : parcours, SVG, activités, voix et quiz ;
- `lisibilite.js` : réglage de taille du texte ;
- `impression.css` : sortie papier sobre ;
- `STORYBOARD.md` : intention détaillée des quatorze écrans ;
- `SOURCES-TECHNIQUES.md` : références métier ;
- `SOURCES-IMAGES.md` : registre des médias ;
- `tests/qa.mjs` : contrôle des quatre formats, activités, quiz et mode hors ligne.

## État

Première version du 4 août 2026. Le contenu décrit un principe générique. Il demande une
validation métier humaine avant diffusion institutionnelle et ne remplace pas la notice du
réservoir, de la vanne ni de l’installation réelle.
