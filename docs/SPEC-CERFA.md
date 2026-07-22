# SPEC CERFA 15497*04 — conformité totale au formulaire officiel

> Référence : `cerfa_15497-04_officiel.pdf` (racine du dépôt), **identique octet pour octet**
> au fichier officiel téléchargé sur service-public.gouv.fr (MD5 `B2FF63FB…` vérifié le 03/07/2026).
> 1 page, **72 champs AcroForm** inventoriés par lecture directe du PDF (pdf-lib).
>
> **Décision d'architecture (v8, Phase D)** : l'aperçu à l'écran est le **PDF officiel rempli,
> rendu tel quel** (PDF.js, comme v7.7) — conformité au pixel près par construction.
> Il n'y a plus de « reproduction HTML » du formulaire : ce qui s'affiche EST le document.

## Bug v7 corrigé le 03/07/2026

Le wizard envoyait `CHARGE / MISE_EN_SERVICE / RECUPERATION / TRANSFERT`, le générateur testait
`Charge / MiseEnService / Recuperation / Vidange` → **aucune case du cadre 4 cochée** et
**quantités du cadre 11 mal ventilées** (isCharge/isRecup faux) sur tous les CERFA issus du
wizard. Corrigé dans `js/cerfa.js` : tables uniques `CERFA_TYPE_NORMALISE` +
`CERFA_TYPE_VERS_CASE` en tête de module, utilisées par le remplissage PDF ET l'aperçu HTML.
Restent non remplis en v7 (à couvrir en Phase D) : cadre 12 (4 cases + 2 champs texte).

## Inventaire complet des 72 champs officiels

### En-tête
| Champ | Type | Contenu v8 |
|---|---|---|
| `Fiche_no` | texte | n° de fiche (FI-AAAA-NNNN / FORM-AAAA-NNNN en formation) |

### Cadre 1 — Opérateur
| `Operateur` | texte multiligne | raison sociale + adresse + « SIRET : … » (établissement) |
| `Attestation_no` | texte | n° attestation de **capacité** de l'établissement |

### Cadre 2 — Détenteur de l'équipement
| `Detenteur` | texte multiligne | client/détenteur : nom + adresse + SIRET |

### Cadre 3 — Équipement
| `Equipement_ID` | texte multiligne | code + désignation + marque/modèle + n° série |
| `Equipement_Fluide` | texte | dénomination du fluide (sans le préfixe « R- ») |
| `Equipement_Charge` | texte | charge nominale (kg) |
| `Equipement_teqCO2` | texte | tonnes éq. CO₂ (charge × PRP AR4 / 1000) |

### Cadre 4 — Nature de l'intervention (8 cases + 1 texte)
`Case_Assemblage` · `Case_MiseService` · `Case_Modif` · `Case_Maintenance` · `Case_CtrlPerio`
· `Case_CtrlNonPerio` · `Case_Demantel` · `Case_Autre` + `Autre` (texte).

**Table de correspondance UNIQUE (types v8 → case) :**
| Type interne v8 | Case cochée |
|---|---|
| `CHARGE_APPOINT` | `Case_Maintenance` |
| `MISE_EN_SERVICE` | `Case_MiseService` |
| `RECUPERATION_MAINTENANCE` | `Case_Maintenance` |
| `RECUPERATION_DEMANTELEMENT` | `Case_Demantel` |
| `TRANSFERT` | `Case_Maintenance` |
| `ASSEMBLAGE` | `Case_Assemblage` |
| `MODIFICATION` | `Case_Modif` |
| `CONTROLE_PERIODIQUE` | `Case_CtrlPerio` |
| `CONTROLE_NON_PERIODIQUE` | `Case_CtrlNonPerio` |
| `AUTRE` | `Case_Autre` + champ `Autre` |

### Cadre 5 — Détecteur manuel de fuite
| `Detecteur_ID` | texte | marque/modèle + n° série du détecteur |
| `Controle_Jour` / `Controle_Mois` / `Controle_Annee` | texte | date du dernier étalonnage |

### Cadre 6 — Détection permanente de fuite
| `Bouton_Oui` | radio, options `"1"`/`"2"` | `1` = Oui, `2` = Non (machine.detectionPermanente) |

### Cadre 7 — Seuil de charge et fréquence de contrôle (15 cases)
Seuils (une seule case selon famille et charge) :
- HCFC (kg) : `Case_HCFC_2` (≥ 2 kg) · `Case_HCFC_30` (≥ 30) · `Case_HCFC_300` (≥ 300)
- HFC/PFC (t éq. CO₂) : `Case_HFC_5` (≥ 5) · `Case_HFC_50` (≥ 50) · `Case_HFC_500` (≥ 500)
- HFO (kg) : `Case_HFO_1` (≥ 1) · `Case_HFO_10` (≥ 10) · `Case_HFO_100` (≥ 100)

Fréquence (une seule case, croisement seuil × détection permanente) :
| Niveau de seuil | Sans détection | Avec détection |
|---|---|---|
| bas (2 kg / 5 t / 1 kg) | `Case_Sans_12m` | `Case_Avec_24m` |
| moyen (30 kg / 50 t / 10 kg) | `Case_Sans_6m` | `Case_Avec_12m` |
| haut (300 kg / 500 t / 100 kg) | `Case_Sans_3m` | `Case_Avec_6m` |

(Logique déjà correcte en v7 — `calcProchainControle()` — à réutiliser telle quelle.)

### Cadre 10 — Résultat du contrôle d'étanchéité (8 cases + 3 textes)
| `Case_Fuite_Oui` / `Case_Fuite_Non` | résultat |
| `Fuite_Loca_1..3` | localisations des fuites (3 lignes) |
| `Case_Rep_Fuite1..3_realisee` / `Case_Rep_Fuite1..3_AFaire` | réparation faite / à faire par ligne |

Ventilation v8 (lot F-Gas R5, 07/2026) : le modèle actuel ne gère qu'UNE
fuite par contrôle (`controle.localisationFuite`, une seule valeur) → seule
`Fuite_Loca_1` est renseignée (`Fuite_Loca_2/3` restent vides). La
localisation est saisie à l'étape 5 du wizard (comme `controle-form.js`),
propagée dans `mouvement.controle.localisationFuite` jusqu'au VRAI contrôle
enregistré par CR-3 (`enregistrerControle`), puis lue par le générateur
(`assemblerContexte`, source `mouvement` ou `controle`).

R3/R4 (réparation tracée, hors CERFA à ce stade) : `Case_Rep_Fuite1_realisee`
reflète `controle.reparationImmediate` (déclaratif au moment du contrôle),
PAS `controle.dateReparation` (réparation tracée a posteriori par
`store.tracerReparation`, qui ne modifie ni ce contrôle ni le CERFA déjà
émis — un nouveau contrôle CONFORME de suivi produit son propre CERFA).

### Cadre 11 — Quantités de fluide (10 champs texte)
| `11_Denom` | dénomination du fluide |
| `11_Quantite` | charge totale de l'équipement (kg) |
| `11_QA` | quantité chargée — fluide **vierge** (kg) |
| `11_QB` | quantité chargée — fluide **recyclé** (kg) |
| `11_QC` | quantité chargée — fluide **régénéré** (kg) |
| `11_QD` | quantité **récupérée** destinée au traitement (déchet) (kg) |
| `11_QE` | quantité récupérée pour **réutilisation** (kg) |
| `11_QDE` | total récupéré (D+E) (kg) |
| `11_Contenant_ID` | identification du/des contenant(s) (n° bouteille) |
| `11_BSFF` | n° du BSFF si déchet |

Ventilation v8 : selon type de mouvement et `etatFluide` de la bouteille source
(VIERGE → QA, RECYCLE → QB, REGENERE → QC) ; RECUPERE (réutilisable) et MELANGE
en charge → QE (**jamais QA** : ce n'est pas du fluide vierge — correction R6,
07/2026) ; récupération (destination) → QD (déchet) ou QE (réutilisation) selon
la décision de la chaîne déchets (cf. SPEC-V8 §5.8), QDE = somme. Une bouteille
MELANGE (R2, `etatFluide='MELANGE'`) ne coche jamais QA, source ou destination,
et porte la mention « (mélange) » sur `11_Contenant_ID` + une ligne dédiée au
cadre 14 (observations).

### Cadre 12 — Transport (4 cases + 2 textes) — NON GÉRÉ EN v7, à couvrir en Phase D
| `Case_12_UN1078` | fluide frigorigène NON inflammable — « UN 1078, gaz frigorifique NSA, 2.2 » |
| `Case_12_Autre140601` | autre déchet non inflammable — code déchet 14 06 01 + `Autre-FF-NON-inflammable` (texte) |
| `Case_12_UN3161` | fluide inflammable (A2L/A3 : R-32, R-290, R-1234yf…) — « UN 3161, gaz liquéfié inflammable NSA, 2.1 » |
| `Case_12_Autre160504` | autre déchet inflammable — code 16 05 04 + `Autre-FF-inflammable` (texte) |

Règle v8 : cochage selon la **classe de sécurité du fluide** (référentiel fluides : A1 → UN 1078 ;
A2L/A2/A3 → UN 3161) quand le mouvement génère un transport de fluide récupéré.

### Cadre 13 — Installation de destination
| `13_Instal` | texte multiligne | installation de traitement / fournisseur repreneur |

### Cadre 14 — Observations
| `14_Observations` | texte multiligne | observations libres ; **en mode FORMATION, le filigrane
« MODE FORMATION — DOCUMENT NON OFFICIEL » est apposé en plus sur le rendu** |

Mentions SYSTÈME du cadre 14 (posées par l'application, jamais exigées de l'élève à la
correction) : la mention MODE FORMATION ci-dessus, et depuis CM-4b la mention **« Anomalie
de réemploi signalée : X kg réintroduits au-delà du fluide récupéré de cette machine — à
rectifier par contre-écriture. »** quand une charge depuis une bouteille de RÉCUPÉRATION
dépasse l'avoir d'origine de la machine (cycle matière — signalée, jamais bloquée, tous
modes ; décision du 22/07/2026).

### Signatures (6 champs)
| `Sign_Operateur_Nom` / `Sign_Operateur_Qualite` / `Sign_Operateur_Date` | opérateur (technicien) |
| `Sign_Detenteur_Nom` / `Sign_Detenteur_Qualite` / `Sign_Detenteur_Date` | détenteur (client) |

La signature manuscrite (canvas du wizard) est **apposée en image** sur la zone de signature
opérateur via pdf-lib (`drawImage`) — le PDF AcroForm n'a pas de champ signature dessinée.

## Critères d'acceptation Phase D
1. Un mouvement validé de chaque type génère un PDF où **la bonne case du cadre 4 est cochée**
   (vérifié automatiquement en relisant le PDF généré avec pdf-lib — test Node).
2. Les 72 champs sont soit remplis, soit volontairement vides (jamais ignorés par oubli) —
   test de couverture : chaque nom de champ officiel apparaît dans le module de génération v8.
3. Cadre 7 : seuil + fréquence cohérents avec `calcProchainControle` (même logique, une seule source).
4. Mode FORMATION : numérotation FORM-, filigrane visuel sur le rendu, mention au cadre 14.
5. L'affichage à l'écran est le rendu PDF.js du PDF rempli (pas d'imitation HTML).
