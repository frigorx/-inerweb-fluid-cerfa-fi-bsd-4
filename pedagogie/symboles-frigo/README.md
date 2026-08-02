# ❄ Le Circuit Fantôme — inerWeb **Édu**

Parcours d'auto-apprentissage des **symboles normalisés des éléments thermodynamiques**
(chapitre 4.1.8, pages 81 à 89 du support de référence).

**2 heures d'auto-apprentissage · 1 heure d'interrogation · 7 jours de révision maison.**

---

## Ce que c'est

Le tableau des pages 81 à 89 présente 49 symboles comme 49 objets à mémoriser. C'est ce qui le
rend indigeste. Or ces symboles obéissent à une grammaire : une forme extérieure qui dit la nature
de l'organe, un contenu qui dit la technologie, un accessoire posé dessus qui dit la commande, un
type de trait qui sépare le fluide de l'information.

Ce parcours ne donne pas cette grammaire à l'élève. **Il la lui fait trouver**, puis la met à
l'épreuve sur des symboles qu'il n'a jamais vus. À la fin, il n'a pas 49 dessins en tête : il a
**8 règles**, et il sait lire n'importe quel symbole du chapitre.

---

## Les fichiers

### Application élève

| Fichier | Rôle |
|---|---|
| `index.html` | Portail du parcours — point d'entrée unique |
| `styles.css` | Charte inerWeb Édu (Calibri, `#1b3a63`, `#ff6b35`, fond clair, aucun mode sombre) |
| `donnees-symboles.js` | **Généré** — 49 symboles, 8 règles, 12 pièges, 22 repères du schéma |
| `app.js` | Routeur, progression locale, utilitaires partagés |
| `atelier-decodage.js` | Atelier 1 — découverte des 8 règles |
| `atelier-familles.js` | Atelier 2 — memory + tri par familles |
| `atelier-pieges.js` | Atelier 3 — les 12 duels |
| `atelier-circuit.js` | Atelier 4 — schéma d'installation à 22 repères |
| `atelier-blanc.js` | Atelier 5 — épreuve blanche auto-corrigée |
| `maison.js` | Entraînement maison — répétition espacée (Leitner, 5 boîtes) |
| `biblio.js` | Bibliothèque de référence consultable |
| `sw.js`, `manifest.json`, `icone.svg` | Fonctionnement hors connexion et installation sur téléphone |

### Documents imprimables

| Fichier | Rôle |
|---|---|
| `FICHE-SEANCE.md` | Fiche de séance enseignant — déroulé minute par minute, grille d'évaluation, corrigé, adaptations |
| `interrogation.html` | **Généré** — sujet A4 (20 points) + corrigé et barème enseignant |
| `carnet-eleve.html` | **Généré** — carnet de bord 4 pages, à imprimer recto-verso |

### Outils

| Fichier | Rôle |
|---|---|
| `outils/generer-donnees.py` | Construit `donnees-symboles.js` |
| `outils/generer-documents.py` | Construit `interrogation.html` et `carnet-eleve.html` |
| `outils/carnet.py` | Partie « carnet élève » du générateur ci-dessus |

---

## D'où viennent les symboles

**Origine du contenu — à lire avant toute réutilisation.**

- **40 symboles frigorifiques et 7 capteurs** sont repris **tels quels** de notre bibliothèque
  maison [`frigorx/inerweb-symboles`](https://github.com/frigorx/inerweb-symboles)
  (348 symboles CEI / frigo convertis depuis QElectroTech, `inerweb_symboles.json` v2.0).
  Aucune retouche.

- **Une vingtaine de symboles** absents de cette bibliothèque ont été **redessinés d'après le
  document de référence**, dans le même style graphique (trait noir, épaisseur 1, même convention
  de `viewBox`) : compresseur centrifuge, moteur, échangeurs à eau, tours de refroidissement
  ouverte et fermée, filtre à huile, filtre déshydrateur, voyants liquide et huile, vanne
  d'isolement à volant, soupape de retenue, prise Schrader, éliminateur de vibrations, bouteille
  anti-coup de liquide, réservoir d'huile, vanne 4 voies, régulateur à flotteur, les 10 bulles
  d'instruments (PZL, PZH, PSL, PSH, PZLLHH, TC, TS, TZ, TI, TSHL) et les 4 régulateurs Danfoss
  (KVR, KVP, KVC, KVL). Ce sont des **redessins**, pas des extraits de norme : les vérifier avant
  toute publication hors classe.

- **Quatre symboles ont été redessinés bien qu'ils existent dans la bibliothèque**, parce que la
  version de la bibliothèque ne correspondait pas à celle du document : filtre déshydrateur (croix
  en pointillés), vanne d'isolement (volant en H), soupape de retenue, voyant liquide (pour former
  une paire strictement identique au voyant huile — c'est le piège n° 6).

- **Les textes de fonction** sont repris du document de référence, pages 81 à 89. Les indices,
  les règles et les commentaires de pièges sont rédigés pour ce parcours.

- **Aucune valeur, aucun seuil, aucun article réglementaire n'est cité** dans ce module : il ne
  traite que de lecture de symboles. Les états du fluide (gaz/liquide, HP/BP) reprennent
  littéralement les formulations du document, y compris « liquide BP » en sortie de détendeur.

### Ce qui existait déjà

Le dépôt `frigorx/inerweb-symboles` contient déjà trois jeux génériques sur l'ensemble des
348 symboles : `jeu1_quiz.html` (quiz), `jeu2_memory.html` (memory), `jeu3_montage.html`
(« Le Monteur », construction de circuit à 6 niveaux). **Ils restent utiles** et couvrent un
périmètre plus large — électrotechnique comprise.

Ce module-ci ne les remplace pas. Il traite **spécifiquement** le chapitre 4.1.8, ajoute la
méthode de découverte des 8 règles, les 12 pièges du chapitre, le schéma des pages 88-89 et
l'entraînement à répétition espacée. Les élèves qui veulent aller plus loin peuvent enchaîner
sur « Le Monteur ».

---

## Utilisation

### En classe

Ouvrir `index.html` dans un navigateur. Rien à installer, aucun compte, aucun réseau requis
après la première ouverture.

La progression est enregistrée dans le `localStorage` du navigateur — **sur le poste, et nulle
part ailleurs**. Aucune donnée n'est transmise. Sur poste partagé, le bouton « Effacer ma
progression » du portail remet tout à zéro.

### À la maison

Même page, écran « Entraînement maison ». Le service worker met l'application en cache : elle
fonctionne sans connexion. Sur téléphone, « Ajouter à l'écran d'accueil » l'installe comme une
application.

### Impression

- `interrogation.html` → Ctrl+P. Le corrigé est sur une page séparée (saut de page forcé) :
  imprimer les pages du sujet uniquement pour les élèves.
- `carnet-eleve.html` → Ctrl+P, recto-verso, 4 pages.
- Depuis l'application : boutons « Imprimer cette fiche » (clé de décodage), « Imprimer la
  bibliothèque » et « Imprimer mon corrigé ».

---

## Régénérer les fichiers

`donnees-symboles.js`, `interrogation.html` et `carnet-eleve.html` sont **générés**. Ne pas les
éditer à la main : la modification serait perdue à la génération suivante.

```bash
# 1. Récupérer la bibliothèque de symboles à côté du script
git clone https://github.com/frigorx/inerweb-symboles.git outils/inerweb-symboles

# 2. Reconstruire les données
python3 outils/generer-donnees.py

# 3. Reconstruire les documents imprimables
python3 outils/generer-documents.py
```

Le tirage de l'interrogation est **fixe** : le sujet est identique d'une génération à l'autre,
et le corrigé lui correspond toujours. Pour changer le sujet, modifier les listes `EX1` à `EX5`
et `A_TROUVER` en tête de `outils/generer-documents.py`.

---

## Contenu pédagogique

### Les 8 règles

| | |
|---|---|
| **R1** | Un cercle, c'est une machine qui tourne |
| **R2** | Un rectangle à ailettes avec une hélice, c'est un échangeur à air |
| **R3** | Un zigzag dans un corps fermé, c'est un échange sans contact |
| **R4** | Deux triangles pointe contre pointe, c'est une vanne |
| **R5** | Un rectangle barré d'une croix, c'est un filtre |
| **R6** | Une bulle avec des lettres, c'est un instrument |
| **R7** | La forme du corps dit ce qui se passe dedans |
| **R8** | Trait plein = du fluide. Trait pointillé = de l'information |

### Les 8 familles

Machines tournantes (6) · Échangeurs (8) · Détendeurs (3) · Filtration et contrôle visuel (6) ·
Vannes et sécurités mécaniques (6) · Réservoirs et accessoires de ligne (7) · Instruments (9) ·
Régulateurs de pression (4).

### Compétences visées

`C2 Analyser les données techniques` ; `C12 Communiquer` — savoirs `S3 Analyse technique` ;
`S5 Procédures d'installation` (BAC PRO MFER).
Correspondance CAP IFCA : `S2 Graphique` ; `C2.1 Organiser les informations`.

Détail, adaptations par diplôme et grille de positionnement : voir `FICHE-SEANCE.md`.

---

## Accessibilité et charte

- Calibri, corps 18 px (≥ 14 pt à l'impression), interligne 1,55, **alignement à gauche**.
- Titres Trebuchet MS bold. Bleu `#1b3a63`, orange `#ff6b35`.
- **Aucun mode sombre**, aucun fond sombre : la feuille de style ne contient volontairement
  aucune règle `prefers-color-scheme`.
- Un seul point d'attention par écran, retour immédiat après chaque réponse, trois niveaux de
  hiérarchie visuelle au maximum — adaptations TDAH / DYS de la charte inerWeb Édu.

---

*inerWeb Édu — F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO*
