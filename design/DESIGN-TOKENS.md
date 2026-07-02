# Design tokens — maquette « inerWeb Fluide » (Claude Design, validée 02/07/2026)

Source : maquette Claude Design de Franck
(https://claude.ai/design/p/b7fe4fff-9d5f-441b-95bc-9f18b5178418, fichier `inerWeb Fluide.dc.html`).
Palette et polices extraites du fichier réel. Les captures d'écran des 12 vues font foi
pour la composition ; en cas de doute, Franck peut télécharger le fichier de la maquette
dans ce dossier depuis l'interface Claude Design (menu « ⋯ » du fichier).

## Polices

| Usage | Police |
|---|---|
| Corps de texte, libellés, tableaux | **IBM Plex Sans**, system-ui, sans-serif |
| Titres de page, chiffres KPI (« 31,0 kg », « 29,2 t ») | **Space Grotesk**, sans-serif |
| Valeurs mesurées, codes fluides, n° CERFA (`+ 0,30 kg`, `R-404A`, `FI-2026-0007`) | **IBM Plex Mono**, monospace |
| Formulaire CERFA (aperçu fidèle) | Arial, Helvetica, sans-serif (comme l'officiel) |
| Signature manuscrite (canvas) | 'Segoe Script', 'Brush Script MT', cursive |

Chargement : Google Fonts (IBM Plex Sans 400/500/600/700, Space Grotesk 500/600/700,
IBM Plex Mono 400/500/600) — à héberger en local pour le mode hors-ligne.

## Palette

### Structure
| Token | Hex | Usage |
|---|---|---|
| `--marine-900` | `#0e2a47` | Sidebar (fond), texte fort sur clair |
| `--marine-800` | `#163c61` | Dégradé sidebar (haut), survols sidebar |
| `--marine-700` | `#1a3a63` | Variantes marine |
| `--fond` | `#f5f8fb` | Fond général de l'app |
| `--fond-2` | `#eef2f6` | Fonds secondaires, rayures tableaux |
| `--fond-3` | `#fafbfd` | Cartes secondaires |
| `--carte` | `#ffffff` | Cartes, panneaux |
| `--bordure` | `#e2e8f0` | Bordures par défaut |
| `--bordure-2` | `#e9eef4`, `#dbe1e8` | Bordures fines / séparateurs |

### Texte (échelle slate)
| Token | Hex |
|---|---|
| `--texte` | `#1e293b` |
| `--texte-2` | `#475569` |
| `--texte-3` | `#64748b` |
| `--texte-faible` | `#94a3b8` |

### Accent (turquoise)
| Token | Hex | Usage |
|---|---|---|
| `--accent` | `#12b5c9` | Liens, actifs, icônes |
| `--accent-fort` | `#0e93a3` | Texte accent, hover |
| `--accent-clair` | `#19c3d6` | Dégradés |
| `--accent-fond` | `#e0f7fa`, `#f0fcfe`, `#a5e9f1` | Fonds de chips, halos |

Dégradé bouton principal : `linear-gradient(150deg, #19c3d6, #0e93a3)`
Dégradé sidebar : `linear-gradient(150deg, #163c61, #0e2a47)`

### Sémantique
| État | Texte | Fond |
|---|---|---|
| Succès / Conforme / Signé | `#16a34a` | `#dcfce7` |
| Danger / Fuite / échéance dépassée | `#dc2626` (var. `#e11d48`) | `#fee2e2` (bordure `#fecaca`) |
| Avertissement / Contrôle dû | `#b45309` (icône `#f59e0b`) | `#fef3c7` |
| Récupération (type de mouvement) | `#7c3aed` | `#f3e8ff` |
| Info / Charge | `#2563eb` | `#e0f2fe` / `#e0efff` |

### CERFA (aperçu fidèle)
Noir `#111` / gris `#333`, en-têtes de cadres gris clair, bandeau de la modale marine `#0e2a47`,
police Arial — reproduit le formulaire officiel (cadres numérotés, cases ☐/☒).

## Composants observés (captures de référence)

1. **Sidebar** : logo flocon dans carré arrondi turquoise, « inerWeb **Fluide** » (Fluide en turquoise),
   sous-titre « TRAÇABILITÉ F-GAS » en petites capitales espacées. Navigation à icônes SVG linéaires :
   Tableau de bord, Parc machines, Stock bouteilles, Mouvements, Contrôles d'étanchéité (badge rouge
   de compteur), Statistiques, Bilan annuel, Fluides, Administration. Item actif : fond turquoise
   translucide + texte turquoise clair. En bas : bouton « ⬇ Sauvegarde » (bordure claire) +
   pastille verte « Enregistré à l'instant / il y a N min ».
2. **Header de page** : fil d'ariane discret (« inerWeb Fluide / Tableau de bord »), titre Space
   Grotesk, badge de mode à droite (« ● Mode Formation » ambre) + avatar rond marine initiales.
3. **Cartes KPI** : libellé en capitales espacées gris, icône dans pastille colorée en haut à droite,
   valeur énorme Space Grotesk (« 31,0 kg »), sous-texte gris. Coins très arrondis (~14 px),
   ombre douce, bordure fine.
4. **Cartes machine** : titre + chip statut à droite, sous-titre type · marque modèle,
   chip code fluide mono (`R-404A`) + famille, barre de progression charge (vert), ligne
   « Charge 4,20 / 4,50 kg » (valeurs mono) + « 16,47 t CO₂ » à droite, pied : localisation + détenteur.
5. **Cartes bouteille** : chip catégorie (Neuve teal clair / Récupération violet) + code fluide mono
   à droite, grosse valeur « 7,4 / 10 kg », barre de niveau (turquoise ; rouge si quasi vide),
   « État : Neuf · Tare 12,0 kg », fournisseur · lot, boutons Modifier / Suppr. (rouge outline).
6. **Tableaux** (Mouvements, Contrôles, Bilan, Fluides) : en-têtes capitales espacées gris,
   lignes blanches séparées par filets fins, chips de type colorées, quantités mono signées
   (`+ 0,30 kg` vert / `− 0,15 kg` violet), n° CERFA mono turquoise, statut chip vert « Signé »,
   bouton « Visualiser CERFA » outline turquoise. Échéance dépassée en rouge gras.
7. **Statistiques** : barres horizontales « Charge par fluide » (dégradé turquoise), histogramme
   « Flux mensuels (6 mois) » (Charge turquoise / Récupération violette), 3 grosses tuiles KPI
   (67 % vert, 3 marine, 1 rouge).
8. **Bilan annuel** : 2 grandes cartes dégradées (turquoise « Total chargé », violette « Total
   récupéré ») avec valeur géante, tableau par fluide (FLUIDE / FAMILLE / GWP / CHARGÉ / RÉCUPÉRÉ /
   EN PARC / CO₂ ÉQ), sélecteur d'année, boutons « Export CSV » (vert) / « Imprimer ».
9. **Administration** : sections en cartes avec badge « CADRE n » (lien direct avec le CERFA),
   formulaires en 2 colonnes, listes Utilisateurs/Techniciens et Clients/Détenteurs avec
   chips de rôle et boutons Modifier.
10. **Wizard « Nouveau mouvement »** : modale, étapes numérotées (pastilles 1-5 : Type, Machine,
    Bouteille, Pesées, Signature), 4 grandes cartes de type cliquables, « Continuer » désactivé
    tant que rien n'est choisi. (v8 : ajouter l'étape Contrôle/Détecteur → 6 étapes comme v7.)
11. **Visualiseur CERFA** : plein écran fond sombre, bandeau marine « CERFA 15497*04 · FI-2026-0007 »,
    boutons « 🖨 Imprimer / PDF » (turquoise) et « Fermer », feuille A4 blanche fidèle à l'officiel.
12. **Modale Sauvegarde** : « Vos données sont enregistrées automatiquement sur cet appareil. »,
    2 grandes options (Exporter une sauvegarde .json / Restaurer), bouton Fermer marine pleine largeur.

## Variante mobile (observée sur la maquette, < 900 px)
- La sidebar disparaît → **bouton hamburger** (carré arrondi, bordure fine) à gauche du header.
- Header mobile : hamburger · fil d'ariane + titre · badge mode · avatar.
- Cartes KPI empilées en 1 colonne, pleine largeur ; bouton « + Nouveau mouvement » conservé
  en haut à droite du titre de page.
- Grilles de cartes (machines, bouteilles) → 1 colonne.

## Divers
- Rayon des cartes ≈ 14 px ; chips ≈ 999 px ; boutons ≈ 10 px.
- Ombres douces (`0 1px 3px rgba(15,23,42,.06)` env.), pas d'ombres dures.
- Animations discrètes : apparition translateY(7px) fondu (`ifFade`), pulse sur pastilles (`ifPulse`).
- Impression : masquer `.no-print`, feuille CERFA sans ombre (`@media print`).
- Scrollbars fines personnalisées (`#cbd5e1`, survol `#94a3b8`).
