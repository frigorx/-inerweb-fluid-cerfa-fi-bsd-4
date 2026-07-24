# Catalogue des fluides frigorigènes — lot 2 (mélanges HFC/HFO, HFO pur, ammoniac)

**Document établi le 24/07/2026 — pour validation par Franck Henninot, ligne par ligne.**

> ⚠️ **RIEN de ce catalogue n'est semé dans le logiciel inerWeb Fluide sans validation ligne par ligne.** Chaque fiche porte une case « Validation Franck » : tant qu'elle n'est pas cochée, la fiche n'existe pas pour le moteur.
>
> **Règle appliquée pour le PRP** : en cas de valeurs concurrentes, on retient **la plus élevée** (règle de précaution tranchée le 23/07, précédent R-455A maintenu à 148).
>
> **Résultat de la contre-vérification indépendante** : les 10 fluides ont été revérifiés par un second passage (PRP, classe de sécurité, annexe réglementaire). **Aucun litige** : les trois points sont confirmés pour chacun des 10 fluides. Les réserves restantes ne sont pas des désaccords mais des points de vigilance (cases laissées vides, coquilles de fournisseurs, textes officiels à viser sur pièce) — voir la section finale « Points d'attention ».

---

## 1. Tableau récapitulatif

| N° | Fluide | Composition abrégée (% masse) | PRP retenu | Classe | Annexe | Famille moteur | Fiabilité | Contre-vérif. |
|----|--------|-------------------------------|-----------|--------|--------|----------------|-----------|---------------|
| 1 | R-448A | R-32/125/1234yf/134a/1234ze(E) — 26/26/20/21/7 | **1387** | A1 | Annexe I | HFC (t éq. CO2) | Source primaire | ✅ |
| 2 | R-449A | R-32/125/1234yf/134a — 24,3/24,7/25,3/25,7 | **1397** | A1 | Annexe I | HFC (t éq. CO2) | Source primaire | ✅ |
| 3 | R-452A | R-32/125/1234yf — 11/59/30 | **2140** | A1 | Annexe I | HFC (t éq. CO2) | Sources secondaires convergentes | ✅ |
| 4 | R-452B | R-32/125/1234yf — 67/7/26 | **698** | A2L | Annexe I | HFC (t éq. CO2) | Source primaire | ✅ |
| 5 | R-454A | R-32/1234yf — 35/65 | **239** | A2L | Annexe I | HFC (t éq. CO2) | Sources secondaires convergentes | ✅ |
| 6 | R-454B | R-32/1234yf — 68,9/31,1 | **467** | A2L | Annexe I | HFC (t éq. CO2) | Sources secondaires convergentes | ✅ |
| 7 | R-454C | R-32/1234yf — 21,5/78,5 | **148** | A2L | Annexe I | HFC (t éq. CO2) | Source primaire | ✅ |
| 8 | R-513A | R-1234yf/134a — 56/44 (azéotrope) | **631** | A1 | Annexe I | HFC (t éq. CO2) | Sources secondaires convergentes | ✅ |
| 9 | R-1234ze(E) | Corps pur (HFO) | **7** | A2L | Annexe II section 1 | HFO pur (kg) | Source primaire | ✅ |
| 10 | R-717 (NH3) | Corps pur (ammoniac) | **0** | B2L | Hors périmètre fluoré | Naturel hors F-Gas | Sources secondaires convergentes | ✅ |

---

## 2. Fiches détaillées

---

### Fiche 1 — R-448A (Solstice N40)

**Validation Franck : ☐**

**Identité**
- **Désignation** : R-448A — mélange zéotrope (nom commercial : Honeywell Solstice N40). Contient l'isomère trans R-1234ze(E) ; la désignation ASHRAE du mélange précise bien 1234ze(E).
- **Composition** : R-32 / R-125 / R-1234yf / R-134a / R-1234ze(E) : 26,0 / 26,0 / 20,0 / 21,0 / 7,0 % en masse (ASHRAE 34, fiche officielle nov. 2022 ; corroboré Climalife et National Refrigerants).

**PRP**
- **PRP retenu : 1387** (le plus élevé des candidats — règle du projet).

| Valeur | Statut | Source |
|--------|--------|--------|
| **1387** | **RETENU** | GIEC AR4 — calcul pondéré annexe VI avec les PRP du règl. (UE) 517/2014 (R-1234yf = 4, R-1234ze = 7) : 1387,1 ; valeur affichée par Climalife (AR4 : 1387), valeur d'usage des registres actuels |
| 1386 | écarté | Règl. (UE) 2024/573, calcul annexe VI avec annexe I (R-32 = 675, R-125 = 3500, R-134a = 1430, base AR4) + annexe II section 1 (R-1234yf = 0,501, R-1234ze = 1,37) = 1385,996 |
| 1360 | écarté | Fiche ASHRAE nov. 2022, d'après le manuel ASHRAE 2021 (fondamentaux) |
| 1273 | écarté | GIEC AR5 — fiche Climalife R-448A (Solstice N40) |

**Classement réglementaire et technique**
- **Annexe réglementaire** : Annexe I.
- **Famille technique** : HFC/HFO — mélange zéotrope de 3 HFC saturés (R-32, R-125, R-134a) et 2 HFO (R-1234yf, R-1234ze(E)).
- **Famille moteur** : HFC — régime annexe I, contrôles en t éq. CO2 : le mélange contient des HFC inscrits à l'annexe I, donc il suit le régime HFC même avec 27 % de HFO ; il ne relève PAS de l'annexe II section 1 (réservée aux HFO/HCFO purs).
- **Contient HFC** : oui — **Contient HFO** : oui.
- **Classe de sécurité** : A1 (ISO 817 / ASHRAE 34 ; repris par EN 378).
- **Inflammabilité** : classe 1 — non inflammable (aucune propagation de flamme dans les conditions d'essai ISO 817/ASHRAE 34 ; pas de limite inférieure d'inflammabilité ni de point éclair — fiche Climalife).
- **Toxicité** : classe A — toxicité faible (ISO 817 / ASHRAE 34).
- **Glissement de température** : mélange zéotrope à glissement notable : ≈ 6,1 K à pression atmosphérique (point de bulle −45,9 °C / point de rosée −39,8 °C, fiche ASHRAE ; Climalife indique 6,2 K) ; ≈ 4 K en conditions d'évaporateur habituelles (valeur d'usage fournisseurs). Conséquences pratiques : charge en phase liquide obligatoire, réglages en bulle/rosée.

**Restrictions et échéances**
- PRP retenu 1387 : sous le seuil 2500, au-dessus des seuils 750 et 150.
- **Entretien** (art. 13 du règl. 2024/573) : non visé par les interdictions PRP ≥ 2500 (§3 réfrigération, §4 clim/pompes à chaleur) ; à partir du **1er janvier 2032**, interdiction du R-448A VIERGE pour l'entretien des équipements de réfrigération FIXES (hors refroidisseurs) car PRP ≥ 750 (§5) — le R-448A régénéré ou recyclé reste autorisé (recyclé : récupéré sur ce type d'équipement par la même entreprise ; régénéré : conteneurs étiquetés conformément à l'art. 12 §7).
- **Mise sur le marché d'équipements NEUFS** (annexe IV, PRP ≥ 150) : interdit dans les réfrigérateurs/congélateurs commerciaux autonomes (HFC ≥ 150 depuis le **1/1/2022**), dans tout équipement de réfrigération autonome depuis le **1/1/2025** (pt 4), dans les systèmes centralisés multipostes commerciaux ≥ 40 kW (pt 6), et dans les équipements de réfrigération hors refroidisseurs à partir du **1/1/2030** (pt 5 c) — sauf exigence de sécurité du site.
- **Contrôle d'étanchéité** (art. 5, régime annexe I en t éq. CO2, avec PRP 1387) : ≥ 5 t éq. CO2 soit 3,60 kg → tous les 12 mois (24 si système de détection) ; ≥ 50 t soit 36,0 kg → 6 mois (12 si détection) ; ≥ 500 t soit 360,5 kg → 3 mois (6 si détection). Exemption : équipements hermétiquement scellés étiquetés < 10 t éq. CO2 (< 3 kg en résidentiel).
- **Quota HFC** : compte dans la réduction progressive des quotas, en t éq. CO2.
- **Dates d'entrée en application** : règl. (UE) 2024/573 applicable depuis le 11 mars 2024. Échéances propres au R-448A : 1er janv. 2025 (annexe IV pt 4), 1er janv. 2030 (annexe IV pt 5 c), 1er janv. 2032 (art. 13 §5).

**Fiabilité et contre-vérification**
- **Fiabilité** : SOURCE PRIMAIRE (texte du règlement lu intégralement dans le navigateur).
- **Contre-vérification indépendante** : PRP ✅ · Classe ✅ · Annexe ✅. Le 1387 est confirmé comme la valeur la plus élevée du périmètre réglementaire (Climalife AR4 = 1387, Honeywell N40 AR4 = 1387, AFCE AR4 = 1387 et « PRP F-Gas 2024/573 = 1386 » — ce qui valide aussi le calcul du candidat 1386). Signalement hors périmètre : l'AFCE affiche un PRP AR6 = 1494, valeur scientifique NON réglementaire (le règl. 2024/573 conserve la base AR4 pour les HFC de l'annexe I). Classe A1 et annexe I confirmées.

**Notes**
1. PIÈGE PRINCIPAL — quatre PRP en circulation : 1387 (AR4), 1386 (calcul strict annexe VI 2024/573), 1360 (manuel ASHRAE 2021) et 1273 (AR5). Règle du projet : 1387 retenu. Aucun seuil réglementaire ne bascule entre 1387 et 1386 (écart < 0,1 % sur les kg de seuil).
2. Le R-448A n'est PAS listé nommément dans le règlement : les mélanges n'y figurent pas, leur PRP se CALCULE par l'annexe VI — d'où l'absence de « valeur officielle » unique.
3. Glissement : ne pas confondre le glissement total à 1 atm (≈ 6,1-6,2 K) et le glissement effectif en évaporateur (≈ 4 K). Pour l'enseignement : « zéotrope à fort glissement, charge liquide obligatoire ».
4. Depuis le 12 mars 2027 au plus tard, les contrôles d'étanchéité s'étendent aussi à certains équipements mobiles (art. 5 §3 et §5).
5. Usage type au lycée : remplaçant A1 du R-404A/R-507A en froid commercial existant (conversion d'installations) — mais interdit dans la plupart des équipements de réfrigération NEUFS depuis 2025 (autonomes) et à horizon 2030.

**Sources**
1. https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024R0573 — texte intégral FR du règl. (UE) 2024/573 lu dans le navigateur : annexes I, II section 1, VI ; art. 5 ; art. 13 §3-§5 ; annexe IV pts 3-6.
2. https://www.ashrae.org/file%20library/technical%20resources/bookstore/factsheet_ashrae_english_november2022.pdf — fiche ASHRAE (PDF lu en local) : composition, classe A1, bulle/rosée, PRP 1360.
3. https://www.climalife.co.uk/r448a — corroboration fournisseur : composition, A1, AR4 = 1387, AR5 = 1273, glissement 6,2 K.
4. https://nationalref.com/products/r448a/ — corroboration composition et classe A1.

---

### Fiche 2 — R-449A (Opteon XP40)

**Validation Franck : ☐**

**Identité**
- **Désignation** : R-449A — mélange zéotrope quaternaire HFC/HFO (nom commercial principal : Opteon XP40, Chemours). Aucune ambiguïté d'isomère : le composant HFO est le R-1234yf (2,3,3,3-tétrafluoropropène), à ne pas confondre avec le R-1234ze(E). Ne pas confondre le R-449A avec le R-448A (Solstice N40, mélange à 5 composants, PRP voisin).
- **Composition** : 24,3 % R-32 + 24,7 % R-125 + 25,3 % R-1234yf + 25,7 % R-134a (pourcentages massiques ; tolérances fabricant Climalife : ±0,2 à ±1 % selon composant).

**PRP**
- **PRP retenu : 1397** (le plus élevé des candidats — règle du projet).
- **Source du PRP retenu** : fiche technique Climalife R-449A (AR4 : 1397), concordante avec Chemours/Honeywell et identique au calcul pondéré AR4 avec R-1234yf = 4 (ancien règl. 517/2014).

| Valeur | Statut | Source |
|--------|--------|--------|
| **1397** | **RETENU** | GIEC AR4 (2007) — fiche technique Climalife ; équivaut au calcul pondéré AR4 avec R-1234yf = 4 |
| 1396 | écarté | Calcul annexe VI du règl. (UE) 2024/573 : 0,243×675 + 0,247×3500 + 0,253×0,501 + 0,257×1430 = 1396,2 |
| 1282 | écarté | GIEC AR5 (2013) — page produit Climalife |

**Classement réglementaire et technique**
- **Annexe réglementaire** : Annexe I.
- **Famille technique** : HFC/HFO. — **Famille moteur** : HFC.
- **Contient HFC** : oui — **Contient HFO** : oui.
- **Classe de sécurité** : A1.
- **Inflammabilité** : non inflammable — classe 1 (classement global A1, NF EN 378 / ISO 817 / ASHRAE 34, confirmé fiche Climalife et sources concordantes).
- **Toxicité** : faible toxicité — classe A. Précaution générale des frigorigènes : risque d'asphyxie par déplacement de l'oxygène en espace confiné (vapeurs plus denses que l'air). **Valeur limite d'exposition NON vérifiée sur source fiable : case laissée ouverte plutôt qu'inventée.**
- **Glissement de température** : 5,72 K à 1,013 bar (fiche Climalife). Glissement NOTABLE : charge en phase liquide obligatoire, incidence sur le réglage de surchauffe et l'interprétation bulle/rosée (le glissement effectif en évaporateur, souvent cité vers 4 K, n'est pas retenu ici faute de source primaire).

**Restrictions et échéances**
- PRP retenu 1397 → entre les seuils 750 et 2500.
- **Entretien** (art. 13, vérifié sur texte JO) : NON concerné par les interdictions PRP ≥ 2500 (réfrigération 01/01/2025, clim/PAC 01/01/2026) ; CONCERNÉ par l'art. 13 §5 : à partir du **01/01/2032**, fluide VIERGE interdit pour l'entretien des équipements de réfrigération FIXES (hors refroidisseurs, hors < −50 °C, militaire, nucléaire) ; fluide RÉGÉNÉRÉ ou RECYCLÉ autorisé sous conditions (étiquetage art. 12 §7 ; recyclé = récupéré sur le même type d'équipement, utilisé par l'entreprise récupératrice).
- **Mise sur le marché** (annexe IV, PRP ≥ 150) : systèmes centralisés multipostes commerciaux ≥ 40 kW interdits depuis le **01/01/2022** SAUF circuit primaire de cascade où PRP < 1500 autorisé (le R-449A à 1397 y reste permis) ; réfrigération autonome (hors refroidisseurs) interdite depuis le **01/01/2025** (sauf exigences de sécurité) ; autres équipements de réfrigération fixes (hors refroidisseurs) interdits au **01/01/2030**.
- **Contrôles d'étanchéité** (art. 5, régime annexe I, seuil d'entrée 5 t éq. CO2) : avec PRP 1397 → 5 t = 3,58 kg ; 50 t = 35,79 kg ; 500 t = 357,9 kg.
- **Dates d'entrée en application** : déjà en application : 01/01/2022 et 01/01/2025. À venir : 01/01/2030 et 01/01/2032.

**Fiabilité et contre-vérification**
- **Fiabilité** : SOURCE PRIMAIRE.
- **Contre-vérification indépendante** : PRP ✅ · Classe ✅ · Annexe ✅. 1397 (AR4) confirmé par recoupement indépendant (National Refrigerants, Kaltra, Linde, Gas Servei, HVAC PT Charts). Aucune source ne donne de valeur supérieure ; le calcul annexe VI donne ~1396, inférieur au retenu. Classe A1 et annexe I confirmées. Pas de confusion avec le R-448A : les sources vérifiées portent bien sur le mélange quaternaire Opteon XP40.

**Notes**
1. PIÈGE PRINCIPAL : le R-449A n'est PAS listé nommément dans le règl. 2024/573 — les mélanges se calculent par moyenne pondérée (annexe VI). Trois valeurs concurrentes : 1397 (AR4), 1396 (calcul strict 2024/573), 1282 (AR5). Règle projet → 1397. Même phénomène que le R-455A 148/146 déjà tranché (T2). L'écart 1397/1396 est sans effet pratique sur les seuils.
2. Ne pas confondre R-449A (Chemours XP40, 4 composants) et R-448A (Honeywell N40, 5 composants dont R-1234ze(E)) : quasi-jumeaux commerciaux en remplacement du R-404A/R-22 ; la fiche Climalife R-449A contient elle-même une coquille (« R-448A » dans sa section réglementation) — signe que la confusion est fréquente.
3. La fiche Climalife référence encore le règl. 517/2014 (fiche de 2022) ; le cadre applicable est bien le 2024/573, vérifié directement sur le texte JO.
4. EUR-Lex est derrière une protection anti-robot : texte obtenu via session navigateur, sans contournement. Le glissement « ~4 K en évaporateur » n'a pas été retrouvé sur source primaire.
5. **Valeurs limites d'exposition non renseignées** : à compléter depuis la fiche de données de sécurité du fabricant avant visa, plutôt que d'inscrire une valeur non vérifiée.

**Sources**
1. https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024R0573 — règl. (UE) 2024/573, texte JO intégral FR lu via navigateur.
2. https://climalife.com/wp-content/uploads/2022/09/uploadsproductmediadocumenthfc-hfo-r-449a-en.pdf — fiche technique Climalife R-449A (PDF lu en entier).
3. https://hvacptcharts.com/refrigerant/r-449a/ — corroboration secondaire.
4. Page produit Climalife R-449A (via résultats de recherche) — PRP 1397 (AR4) / 1282 (AR5).

---

### Fiche 3 — R-452A (Opteon XP44 / Solstice 452A / Forane 452A)

**Validation Franck : ☐**

**Identité**
- **Désignation** : R-452A — mélange zéotrope HFC/HFO. Composant HFO = R-1234yf (2,3,3,3-tétrafluoropropène), à ne pas confondre avec le R-1234ze(E). **Ne pas confondre R-452A (A1) avec R-452B (A2L).**
- **Composition** : R-32 (CAS 75-10-5) 11 % / R-125 (CAS 354-33-6) 59 % / R-1234yf (CAS 754-12-1) 30 % en masse. Tolérances fiche Climalife : R-125 ±1,8 % ; R-1234yf +0,1/−1,0 % ; R-32 ±1,7 %.

**PRP**
- **PRP retenu : 2140** (le plus élevé des candidats sourcés — règle du projet).
- **Source du PRP retenu** : fiches techniques Climalife FR et Gas Servei (06/2024), Climalife Royaume-Uni — cohérent avec le calcul annexe I du règl. 517/2014 (0,11×675 + 0,59×3500 + 0,30×4 = 2140,45).

| Valeur | Statut | Source |
|--------|--------|--------|
| **2140** | **RETENU** | GIEC AR4 (2007) — fiches Climalife FR, Gas Servei, Climalife Royaume-Uni |
| 2139,4 | écarté | Calcul annexe VI du règl. (UE) 2024/573 (R-32 = 675, R-125 = 3500, R-1234yf = 0,501) ; méthode confirmée par le mémento AFCE oct. 2025 |
| 1945 | écarté | GIEC AR5 (2013) — brochure Honeywell Solstice 452A, Climalife Royaume-Uni |
| 1952 | écarté | hvac-gas.eu — valeur divergente NON corroborée (probable erreur de calcul), listée pour transparence |
| 2141 | écarté | Sources commerciales secondaires (Cooling Post « autour de 2141 », distributeurs) — base de calcul non traçable, listée pour transparence — **voir Points d'attention** |

**Classement réglementaire et technique**
- **Annexe réglementaire** : Annexe I.
- **Famille technique** : HFC/HFO. — **Famille moteur** : HFC — régime HFC intégral, contrôles et seuils en t éq. CO2 (règle projet : un mélange contenant au moins un HFC suit le régime HFC, même avec 30 % de HFO). Soumis au quota HFC (réduction progressive).
- **Contient HFC** : oui — **Contient HFO** : oui.
- **Classe de sécurité** : A1 (ISO 817 / ASHRAE 34 / NF EN 378 — confirmé Climalife « A1 » et Gas Servei « A1 groupe L1 »).
- **Inflammabilité** : non inflammable (classe 1 → A1). ODP = 0.
- **Toxicité** : faible toxicité (classe A). Vapeurs plus lourdes que l'air : accumulation en point bas, risque d'asphyxie ; fortes concentrations = effets anesthésiants, trouble du rythme cardiaque possible (fiche Gas Servei).
- **Glissement de température** : 3,79 K sous 1,013 bar (fiche Climalife) ; Gas Servei indique ~3 K ; bulle −46,93 °C / rosée −43,15 °C. Glissement modéré mais non négligeable : charge en phase liquide obligatoire, attention au fractionnement en cas de fuite vapeur.

**Restrictions et échéances**
- PRP 2140 : NON concerné par les interdictions d'entretien PRP ≥ 2500 (2020/2025 froid, 2026 clim/PAC). CONCERNÉ par le seuil ≥ 750 : à partir du **01/01/2032**, interdiction du fluide VIERGE pour l'entretien des équipements de réfrigération fixes (hors refroidisseurs) — fluide recyclé/régénéré autorisé sans limite de date (PRP < 2500, art. 13, synthèse AFCE).
- Le transport frigorifique (application dominante du R-452A : camions, remorques, conteneurs) n'est PAS visé par cette interdiction d'entretien en l'état (rapport de la Commission attendu au 01/07/2027 sur les équipements mobiles).
- **Mise sur le marché** (annexe IV) : équipements fixes neufs au R-452A interdits par les seuils PRP ≥ 150 (autonomes : **01/01/2025** ; autres réfrigération fixe : **01/01/2030**, sauf applications < −50 °C et exigences de sécurité).
- **Contrôle d'étanchéité** (régime HFC en t éq. CO2, PRP 2140) : 5 t = 2,34 kg (12 mois, 24 avec détection) ; 50 t = 23,4 kg (6/12 mois) ; 500 t = 233,6 kg (mobiles 3/6 mois ; fixes : détecteur obligatoire + 6 mois) ; hermétique scellé exempté si < 10 t éq. CO2 (4,67 kg) ; hermétique résidentiel < 3 kg exempté. Contrôles étendus aux camions/remorques frigorifiques (immédiat) puis véhicules utilitaires légers/conteneurs/wagons (**12/03/2027**).
- Récupération obligatoire ; étiquetage selon règl. d'exécution 2024/2174 ; soumis au quota HFC (objectif 0 en 2050).
- **Dates d'entrée en application** : 01/01/2025 (autonomes neufs), 12/03/2027 (contrôles mobiles étendus), 01/01/2030 (réfrigération fixe neuve), 01/01/2032 (vierge interdit en entretien froid fixe).

**Fiabilité et contre-vérification**
- **Fiabilité** : SOURCES SECONDAIRES CONVERGENTES (EUR-Lex inaccessible à l'outil — pages vides ; valeurs corroborées par le mémento AFCE et des synthèses convergentes ; **à re-vérifier sur pièce EUR-Lex avant visa**).
- **Contre-vérification indépendante** : PRP ✅ · Classe ✅ · Annexe ✅. AR4 = 2140 confirmé par le fabricant (guide Chemours/Freon) et Climalife Royaume-Uni (2140/1945) ; calcul exact annexe I = 2140,45 → arrondi 2140. La méthode 2024/573 donne 2139,4, PLUS BASSE. La valeur 2141 n'est traçable à aucun rapport GIEC et échoue au test de source : aucune valeur SOURCÉE supérieure à 2140 n'existe → règle « PRP le plus élevé » respectée. Classe A1 et annexe I confirmées.

**Notes**
1. EUR-Lex inaccessible via l'outil : les valeurs d'annexe et l'article 13 sont corroborés via le mémento AFCE (oct. 2025) et des synthèses convergentes — à RE-VÉRIFIER sur pièce avant visa ; la valeur R-125 = 3500 n'apparaît pas explicitement dans l'extrait AFCE lu : **point précis à contrôler ligne à ligne**.
2. Deux PRP « réglementaires » coexistent : 2140 (AR4 pur) et 2139,4 (calcul 2024/573) ; écart sans aucun effet sur les seuils ; règle projet → 2140, même logique que le T2 R-455A.
3. Valeur 2141 trouvée uniquement dans des sources commerciales sans base de calcul traçable : listée mais non retenue — **si Franck veut l'ultra-précaution au sens littéral de la règle, c'est le seul candidat au-dessus de 2140, à trancher explicitement**.
4. AR5 : 1945 (Honeywell, Climalife Royaume-Uni) fiable ; 1952 (hvac-gas.eu) divergent, probablement erroné.
5. PIÈGE de nommage : R-452A (A1, 11/59/30) ≠ R-452B (A2L, 67/7/26) ; l'isomère du composant HFO est bien le R-1234yf, pas le R-1234ze(E).
6. Zéotrope (glissement 3,79 K) : charge en phase liquide, fractionnement possible en cas de fuite vapeur — incidence pédagogique et sur l'analyse en cas de complément de charge.
7. Application dominante = transport frigorifique : l'interdiction d'entretien 2032 ne vise que le froid FIXE ; en revanche les contrôles d'étanchéité mobiles montent en puissance — pertinent pour le registre.
8. Huile POE ; remplaçant direct du R-404A/R-507, PRP réduit d'environ 45 % par rapport au R-404A (3922).

**Sources**
1. https://climalife.com/wp-content/uploads/2022/09/uploadsproductmediadocumenthfc-hfo-r-452a-fr.pdf — fiche technique Climalife FR.
2. https://gas-servei.com/wp-content/uploads/2024/06/Technical-data-sheet-R-452A-Gas-Servei-1.pdf — fiche Gas Servei.
3. https://www.afce.asso.fr/wp-content/uploads/2025/05/Vademecum_141025.pdf — mémento AFCE oct. 2025 sur le règl. 2024/573.
4. https://www.climalife.co.uk/r452a — Climalife Royaume-Uni.
5. https://www.honeywell-refrigerants.com/europe/wp-content/uploads/2017/10/FPR-029-2017-09_Solstice_452A_A4_2892017.pdf — Honeywell Solstice 452A (AR5 1945).
6. https://www.abcclim.net/reglementation-des-gaz.html — synthèse FR (interdiction 2032).
7. https://ozone.unep.org/system/files/documents/UPDATED-Factsheet_ASHRAE_English_20180625_printer-11X17.pdf — fiche UNEP/ASHRAE.
8. https://hvac-gas.eu/r452a-energy-efficient-refrigerant/ — valeur AR5 1952 divergente, non corroborée.
9. https://www.coolingpost.com/world-news/carrier-transicold-makes-r452a-standard-refrigerant/ — valeur 2141 non traçable.
10. https://eur-lex.europa.eu/eli/reg/2024/573/oj — règlement (UE) 2024/573 (texte NON consultable par l'outil, pages vides).

---

### Fiche 4 — R-452B (Solstice L41y / Opteon XL55)

**Validation Franck : ☐**

**Identité**
- **Désignation** : R-452B — mélange zéotrope R-32/R-125/R-1234yf (noms commerciaux : Honeywell Solstice L41y, Chemours Opteon XL55, Kryon 452B). Aucune ambiguïté d'isomère : le composant HFO est le R-1234yf, un corps sans isomères E/Z. **Ne pas confondre avec R-452A ni R-454B** (voir notes).
- **Composition** : R-32 67,0 % / R-125 7,0 % / R-1234yf 26,0 % en masse — tolérances ASHRAE 34 : ±2,0 / ±1,5 / ±2,0.

**PRP**
- **PRP retenu : 698** (le plus élevé des candidats — règle du projet).
- **Source du PRP retenu** : valeur AR4 affichée par Honeywell et National Refrigerants ; quasi identique au calcul officiel annexe VI du règl. 2024/573 (697,4).

| Valeur | Statut | Source |
|--------|--------|--------|
| **698** | **RETENU** | GIEC AR4 — Honeywell (Solstice L41y) et National Refrigerants ; correspond au calcul avec R-1234yf = 4 (ex-annexe II du règl. 517/2014) |
| 697,4 | écarté | Calcul annexe VI du règl. (UE) 2024/573 : 0,67×675 + 0,07×3500 + 0,26×0,501 = 697,38 |
| 676 | écarté | GIEC AR5 — brochures Honeywell Europe |

**Classement réglementaire et technique**
- **Annexe réglementaire** : Annexe I.
- **Famille technique** : HFC/HFO. — **Famille moteur** : HFC — régime HFC intégral, contrôles en t éq. CO2 (avec PRP 698 : seuils 5/50/500 t éq. CO2 = 7,16 kg / 71,6 kg / 716 kg).
- **Contient HFC** : oui — **Contient HFO** : oui.
- **Classe de sécurité** : A2L.
- **Toxicité** : classe A (faible toxicité) selon ISO 817 / ASHRAE 34.
- **Inflammabilité** : classe 2L (légèrement inflammable, vitesse de combustion ≤ 10 cm/s) — exigences EN 378 propres aux A2L : charge maximale selon le volume du local, matériel certifié, précautions au brasage.
- **Glissement de température** : ≈ 1,2 K (mélange zéotrope à FAIBLE glissement, quasi azéotropique en pratique ; charge en phase liquide obligatoire). **Valeur issue de la littérature scientifique, à confirmer sur la fiche technique Honeywell avant visa si le logiciel affiche une décimale.**

**Restrictions et échéances**
- **Entretien** : PRP 698 < 750 et < 2500 → **AUCUNE interdiction d'entretien, ni actuelle ni programmée** (art. 13 §3-5 : ni la barre 2500 ni la barre 750 ne l'atteignent).
- **Mise sur le marché d'équipements NEUFS** (annexe IV, PRP 698 ≥ 150 mais < 750) : NON concerné par l'interdiction bi-blocs < 3 kg PRP ≥ 750 du **1/1/2025** (pt 9a — c'est précisément son créneau actuel de remplaçant du R-410A) ; interdit ensuite dans le neuf par les barres « PRP ≥ 150 » : bi-blocs air-eau ≤ 12 kW au **1/1/2027** (9b), bi-blocs air-air ≤ 12 kW au **1/1/2029** (9c), bi-blocs > 12 kW au **1/1/2033** (9f), tout bi-bloc ≤ 12 kW avec gaz fluoré au **1/1/2035** (9d) ; clim/PAC autonomes et monoblocs ≤ 12 kW et 12-50 kW au **1/1/2027** (8b/8d, dérogation sécurité → limite relevée à 750 : le R-452B reste alors possible), autres autonomes au **1/1/2030** (8e) ; refroidisseurs ≤ 12 kW PRP ≥ 150 au **1/1/2027** (7b).
- **L'entretien des parcs EXISTANTS au R-452B reste légal sans échéance.**
- Manipulation : attestation d'aptitude fluides (cat. I-IV selon activité) obligatoire.
- **Dates d'entrée en application** : règl. applicable depuis le 11 mars 2024 ; échéances neuves : 1/1/2025 (sans effet sur R-452B), 1/1/2027, 1/1/2029, 1/1/2033, 1/1/2035 ; aucune échéance d'entretien pour ce fluide.

**Fiabilité et contre-vérification**
- **Fiabilité** : SOURCE PRIMAIRE (texte officiel lu intégralement via navigateur).
- **Contre-vérification indépendante** : PRP ✅ · Classe ✅ · Annexe ✅. Composition 67/7/26 confirmée (Climalife, Chemours XL55, Honeywell L41y, National Refrigerants). Climalife donne AR4 = 698 / AR5 = 676 ; le calcul annexe VI donne 697,4. Le retenu 698 est bien la valeur sourcée la plus élevée du cadre réglementaire. Classe A2L et annexe I confirmées.

**Notes**
1. PIÈGE MAJEUR de nomenclature : R-452B ≠ R-452A (11/59/30, PRP ≈ 2140, A1) et R-452B ≠ R-454B (68,9/31,1, PRP ≈ 466, l'autre grand remplaçant A2L du R-410A) — confusion fréquente en atelier.
2. Divergence PRP assumée : 698 (AR4) contre 697,4 (calcul 2024/573) contre 676 (AR5). Règle du projet → 698. Écart sans effet pratique sur les seuils (7,16 kg pour 5 t éq. CO2 dans les deux cas).
3. Le R-452B n'est PAS inscrit en tant que tel aux annexes : mélange, PRP CALCULÉ (annexe VI) ; régime issu de ses composants HFC annexe I.
4. Considérant 8 du règlement : les HFC restent en AR4 (cohérence protocole de Montréal), les autres gaz fluorés passent en AR6 — d'où le 0,501 du R-1234yf.
5. Les dérogations « exigences de sécurité » de l'annexe IV (limite relevée à 750) peuvent maintenir le R-452B utilisable dans le neuf au-delà de 2027 pour certains monoblocs/autonomes — à trancher au cas par cas, hors moteur de contrôle.
6. Glissement 1,2 K : ordre de grandeur sûr (« faible »), mais à confirmer sur la fiche technique PDF Honeywell avant visa si affichage d'une décimale.

**Sources**
1. https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024R0573 — texte officiel lu intégralement (annexes I, II, VI ; art. 13 §3-5 ; annexe IV pts 7-9 ; considérant 8).
2. https://ozone.unep.org/system/files/documents/UPDATED-Factsheet_ASHRAE_English_20180625_printer-11X17.pdf — fiche UNEP/ASHRAE : composition et classe A2L.
3. https://www.honeywell-refrigerants.com/europe/product/solstice-l41y/ — Honeywell : PRP 698 (AR4) / 676 (AR5), A2L, T critique 77,1 °C.
4. https://nationalref.com/products/r452b/ — National Refrigerants : composition, PRP 698, A2L, huile POE.
5. https://climalife.com/product/solstice-l41y-r-452b/ — Climalife : applications (remplacement R-410A neuf).
6. https://www.sciencedirect.com/science/article/abs/pii/S0140700721004862 — revue internationale du froid : glissement 1,2 K.
7. https://www.climalife.co.uk/r452b — équivalences commerciales.

---

### Fiche 5 — R-454A (Opteon XL40)

**Validation Franck : ☐**

**Identité**
- **Désignation** : R-454A — mélange zéotrope R-32/R-1234yf (35,0/65,0 % masse), nom commercial Opteon XL40 (Chemours). Pas d'ambiguïté d'isomère : le R-1234yf est un composé unique, à ne pas confondre avec le R-1234ze(E). **Ne pas confondre avec R-454B (68,9/31,1, PRP 466) ni R-454C (21,5/78,5, PRP 148).**
- **Composition** : R-32 35,0 % ± 2,0 % + R-1234yf 65,0 % ± 2,0 % en masse (désignation ASHRAE 34, confirmée fiche UNEP/ASHRAE et fournisseurs).

**PRP**
- **PRP retenu : 239** (le plus élevé des candidats — règle de précaution du projet).
- **Source du PRP retenu** : GIEC AR4 — fiche Chemours Opteon XL40 et National Refrigerants.

| Valeur | Statut | Source |
|--------|--------|--------|
| **239** | **RETENU** | GIEC AR4 — Chemours (fiche produit) et National Refrigerants ; cohérent avec 0,35×675 + 0,65×4 = 238,85 → 239 |
| 237 | écarté | Calcul annexe VI du règl. (UE) 2024/573 (R-32 = 675, R-1234yf = 0,501) ≈ 236,6 → 237 ; valeur affichée par le distributeur TEGA |

**Classement réglementaire et technique**
- **Annexe réglementaire** : Annexe I.
- **Famille technique** : HFC/HFO (mélange zéotrope). — **Famille moteur** : HFC.
- **Contient HFC** : oui — **Contient HFO** : oui.
- **Classe de sécurité** : A2L (ASHRAE 34 / ISO 817 / EN 378).
- **Toxicité** : classe A, faible toxicité.
- **Inflammabilité** : classe 2L — légèrement inflammable, faible vitesse de flamme ; limite inférieure d'inflammabilité ≈ 8,4 % vol (fiche Chemours). Gaz liquéfié inflammable UN 3161.
- **Glissement de température** : ≈ 5 K (fiche Chemours) — glissement NON négligeable : charge en phase liquide obligatoire, incidence sur réglages de surchauffe et lecture des pressions (valeur exacte dépendante des conditions de fonctionnement ; certains documents citent jusqu'à ~6 K).

**Restrictions et échéances**
- PRP retenu 239 : sous les seuils 750 et 2500 → **PAS concerné par les interdictions d'entretien** de l'art. 13(3) (PRP ≥ 2500 au 01/01/2025 ; PRP ≥ 750 clim/PAC au 01/01/2032).
- **Contrôles d'étanchéité** (régime HFC/annexe I, en t éq. CO2) : avec PRP 239, seuils 5 t ≈ 20,9 kg · 50 t ≈ 209 kg · 500 t ≈ 2 092 kg.
- EN REVANCHE, touché par les interdictions de **mise sur le marché « PRP ≥ 150 »** de l'annexe IV : équipements de réfrigération autonomes (hors refroidisseurs) depuis le **01/01/2025** ; réfrigération fixe non autonome au **01/01/2030** (sauf exceptions, ex. applications < −50 °C).
- **L'entretien des parcs existants au R-454A reste permis sans limite de date.**
- **Dates d'entrée en application** : règl. en vigueur le 11/03/2024 ; interdictions citées : 01/01/2025 et 01/01/2030.

**Fiabilité et contre-vérification**
- **Fiabilité** : SOURCES SECONDAIRES CONVERGENTES (EUR-Lex a refusé l'accès direct — erreur 403 ; valeurs 675 / 0,501 / méthode annexe VI corroborées par plusieurs reproductions concordantes mais NON lues dans le texte officiel — **à faire vérifier sur pièce avant visa**).
- **Contre-vérification indépendante** : PRP ✅ · Classe ✅ · Annexe ✅. 239 (AR4) confirmé par 3 sources indépendantes (Chemours, National Refrigerants, Climalife). Les deux candidats retrouvés ; 239 est bien le plus élevé, aucune valeur sourcée supérieure dans le périmètre réglementaire. Classe A2L et annexe I confirmées. Nota : un PRP AR6 (~270) existerait hors périmètre réglementaire mais aucune source ne le publie pour le R-454A.

**Notes**
1. PIÈGE : une valeur « PRP 690 » circule sur au moins un agrégateur (oxmaint.com) — REJETÉE, aucun calcul de mélange ne la soutient (erreur manifeste).
2. Écart 239/237 : 239 = AR4 (règl. 517/2014, R-1234yf = 4) ; 237 = calcul annexe VI 2024/573 (R-1234yf = 0,501). Règle du projet → 239 (cohérent avec l'arbitrage T2 du 23/07).
3. Une valeur AR5 ≈ 238 est parfois citée mais n'a pas pu être vérifiée sur pièce — non inscrite en candidat.
4. EUR-Lex : accès refusé (403) — d'où la fiabilité « secondaires convergentes » et non « primaire ».
5. Usage type : substitut du R-404A/R-507A en froid commercial et industriel non hermétique ; classé A2L → exigences EN 378 de charge maximale et de conception.

**Sources**
1. https://ozone.unep.org/system/files/documents/UPDATED-Factsheet_ASHRAE_English_20180625_printer-11X17.pdf — fiche UNEP/ASHRAE : composition 35/65, classe A2L.
2. https://www.opteon.com/en/-/media/files/opteon/opteon-xl40-pib-en.pdf — Chemours : PRP 239, glissement ~5 K, LII 8,4 % vol, A2L.
3. https://nationalref.com/products/r454a/ — composition, PRP 239 (AR4), A2L.
4. https://climalife.com/product/opteon-xl40-r-454a/ — PRP 239, A2L, substitut R-404A/R-507A/R-407A/R-407F.
5. https://www.tega.de/en/r454a-opteon — PRP 237 (calcul 2024/573), UN 3161.
6. https://eur-lex.europa.eu/eli/reg/2024/573/oj/eng — règl. (UE) 2024/573 (accès automatisé refusé, 403).
7. https://climate.ec.europa.eu/eu-action/fluorinated-greenhouse-gases/climate-friendly-alternatives-f-gases/refrigeration_en — interdictions annexe IV, seuil PRP 150.

---

### Fiche 6 — R-454B (Opteon XL41 / Solstice 454B / Puron Advance)

**Validation Franck : ☐**

**Identité**
- **Désignation** : R-454B — mélange zéotrope R-32/R-1234yf. Aucune ambiguïté d'isomère : le R-1234yf est un composé unique, à ne pas confondre avec le R-1234ze(E).
- **Composition** : R-32 68,9 % + R-1234yf 31,1 % en masse (ASHRAE 34 ; Climalife ; Chemours). ⚠️ Le livre blanc JCI contient une coquille (« 69,1 % ») — la valeur normalisée est 68,9/31,1.

**PRP**
- **PRP retenu : 467** (le plus élevé des candidats — règle du projet).
- **Source du PRP retenu** : GIEC AR5 via Climalife Royaume-Uni (climalife.co.uk/r454b). La valeur strictement réglementaire (calcul annexe VI) est ≈ 465 ; l'écart est sans effet sur les seuils (10,7 kg dans les deux cas pour 5 t éq. CO2).

| Valeur | Statut | Source |
|--------|--------|--------|
| **467** | **RETENU** | GIEC AR5 — Climalifе Royaume-Uni (« AR4/AR5 : 466/467 ») |
| 466 | écarté | GIEC AR4 (Climalife Royaume-Uni ; livre blanc JCI août 2023 ; Carrier ; Wikipédia) |
| 465 | écarté | Calcul annexe VI du règl. (UE) 2024/573 : 0,689×675 + 0,311×0,501 = 465,2 — corroboré par la fiche Framacold (« 465 ») |

**Classement réglementaire et technique**
- **Annexe réglementaire** : Annexe I.
- **Famille technique** : HFC/HFO. — **Famille moteur** : HFC — mélange contenant un HFC (R-32, annexe I) : régime HFC intégral, contrôles et seuils en t éq. CO2, quotas, récupération obligatoire, attestation d'aptitude requise. Seuls les HFO/HCFO PURS relèvent de l'annexe II section 1 (kg).
- **Contient HFC** : oui — **Contient HFO** : oui.
- **Classe de sécurité** : A2L (ISO 817 / ASHRAE 34 / EN 378) — faible toxicité, légèrement inflammable.
- **Glissement de température** : faible : ≈ 1,0 à 1,5 K selon les sources (quasi-azéotrope). Climalife : bulle −50,5 °C / rosée −49,5 °C soit ≈ 1,0 K ; JCI : ≈ 1,1 K, appoint possible après fuite sans vidange ; Framacold : ≈ 1,5 K.
- **Inflammabilité** : classe 2L : vitesse de combustion < 10 cm/s, auto-inflammation 498 °C (JCI). **LII divergente selon les sources : ≈ 11,5 % vol. (littérature Chemours/JCI) contre 8,0 % v/v (fiche Framacold) — à faire trancher sur la fiche de données de sécurité du fournisseur retenu.**
- **Toxicité** : faible (classe A). **Valeurs limites d'exposition non vérifiées sur source primaire — à reprendre sur la fiche de données de sécurité avant visa.**

**Restrictions et échéances**
- PRP ≈ 465–467, donc < 750 et < 2500 : **AUCUNE interdiction d'entretien** (ni le seuil 2500 dès 2025 froid / 2026 clim-PAC, ni le seuil 750 dès le 01/01/2032 froid fixe hors refroidisseurs).
- **Mise sur le marché d'équipements neufs** (annexe IV) : non touché par le seuil 750 (ex. bi-blocs simples < 3 kg dès le **01/01/2025**) ; TOUCHÉ par les couperets PRP ≥ 150 : monoblocs ≤ 12 kW dès le **01/01/2027**, bi-blocs air-air ≤ 12 kW dès le **01/01/2029**, bi-blocs > 12 kW dès le **01/01/2033** (seuil 750 dès 2029) — sauf dérogation « exigences de sécurité ».
- **Contrôles d'étanchéité** (annexe I, t éq. CO2) : 5 / 50 / 500 t éq. CO2 ≈ 10,7 / 107 / 1 070 kg au PRP 467.
- Récupération obligatoire ; manipulation réservée au personnel attesté (cat. I à IV).
- **Dates d'entrée en application** : règl. applicable depuis le 11/03/2024 ; couperets touchant le R-454B : 01/01/2027, 01/01/2029, 01/01/2033.

**Fiabilité et contre-vérification**
- **Fiabilité** : SOURCES SECONDAIRES CONVERGENTES (EUR-Lex a bloqué la récupération automatique ; valeurs confirmées par plusieurs sources indépendantes dont le dépliant Mitsubishi qui cite explicitement la méthode AR4-annexe I / AR6-annexe II / formule annexe VI ; **visa final sur le JO de l'UE requis**).
- **Contre-vérification indépendante** : PRP ✅ · Classe ✅ · Annexe ✅. Composition 68,9/31,1 confirmée. PRP recalculé : 465,2. Valeurs sourcées : 466 (AR4 — Chemours, Carrier, JCI, Wikipédia) et 467 (AR5 — Climalife Royaume-Uni). Le retenu 467 est bien LE PLUS ÉLEVÉ du cadre réglementaire. Note (pas un défaut) : une valeur AR6 ≈ 531-532 circule mais l'AR6 n'est pas la base réglementaire des HFC annexe I (précédent R-455A confirmé). Classe A2L unanime, annexe I correcte.

**Notes**
1. EUR-Lex bloqué : valeurs d'annexe confirmées par recoupement mais visa sur le JO obligatoire.
2. Trois PRP circulent : 465 (calcul annexe VI, valeur opposable pour les calculs du registre), 466 (AR4 fournisseurs), 467 (AR5) — règle projet : 467 retenu ; écart sans effet pratique sur les seuils.
3. Pièges relevés : le livre blanc JCI contient deux coquilles (composition « 69,1 % » et PRP « 676 » dans un tableau) — ne pas s'en servir comme source de chiffres ; LII divergente entre sources ; valeurs limites d'exposition non vérifiées.
4. Ne pas confondre R-454B (68,9/31,1, PRP ≈ 466) avec R-454A (35/65, PRP ≈ 239) ni R-454C (21,5/78,5, PRP ≈ 146-148).
5. Bouteilles américaines : bande rouge, filetage à gauche (détrompage).

**Sources**
1. https://eur-lex.europa.eu/eli/reg/2024/573/oj — texte de référence (récupération automatique refusée, valeurs confirmées par recoupement).
2. https://www.climalife.co.uk/r454b — composition, A2L, PRP AR4/AR5 = 466/467, bulle/rosée.
3. https://climalife.com/product/r-454b/ — mélange HFC+HFO, huile POE, conditionnements.
4. https://www.framacold.com/upload/produits/Framacold-FT-8084-R454B-pour-PAC-et-climatisatio.pdf — fiche française : PRP 465 (AR4/F-Gas), A2L EN 378, glissement ≈ 1,5 K, T critique 78,1 °C.
5. https://us-ac.com/wp-content/uploads/r454b-jci-white-paper_august-2023.pdf — AR4 = 466, A2L, auto-inflammation 498 °C.
6. https://confort.mitsubishielectric.fr/sites/default/files/2025-03/DEPLIANT F-GAZ RESIDENTIEL.pdf — méthode AR4/AR6/annexe VI ; calendrier annexe IV.
7. https://www.adherent.com/blog/regulation-eu-2024-573-european-commission-adopts-new-f-gas-regulation/ — art. 13 : seuils 2500/750 et dates.
8. https://en.wikipedia.org/wiki/R-454B — corroboration composition, PRP 466, noms commerciaux.
9. https://www.opteon.com/en/-/media/files/opteon/opteon-xl41-product-information.pdf — fiche Chemours (référencée, accès refusé 403 lors de cette recherche).

---

### Fiche 7 — R-454C (Opteon XL20 / Solstice 454C)

**Validation Franck : ☐**

**Identité**
- **Désignation** : R-454C — mélange zéotrope R-32/R-1234yf (21,5/78,5 % en masse). Noms commerciaux : Opteon XL20 (Chemours), Solstice 454C (Honeywell). Pas d'ambiguïté d'isomère : le R-1234yf n'a pas d'isomérie E/Z, contrairement au R-1234ze. **Ne pas confondre avec R-454A ni R-454B** (mêmes composants, proportions différentes).
- **Composition** : R-32 (CH2F2) 21,5 % + R-1234yf (CF3CF=CH2) 78,5 % en masse (composition nominale ; **tolérances de fabrication ASHRAE non vérifiées sur source primaire**).

**PRP**
- **PRP retenu : 148** (le plus élevé des candidats — règle du projet, cohérent avec le précédent R-455A).
- **Source du PRP retenu** : GIEC AR4, valeur de référence historique du règl. 517/2014 reprise par les fiches Chemours/Climalife.

| Valeur | Statut | Source |
|--------|--------|--------|
| **148** | **RETENU** | GIEC AR4 — fournisseurs (Chemours Opteon XL20, Climalife) ; correspond au calcul avec R-1234yf = 4 : 0,215×675 + 0,785×4 ≈ 148,3 |
| 146 | écarté | GIEC AR5 — fiche Climalife (« 148/146 » AR4/AR5) |
| 145,5 | écarté | Calcul strict règl. (UE) 2024/573 : 0,215×675 + 0,785×0,501 = 145,52 |

**Classement réglementaire et technique**
- **Annexe réglementaire** : Annexe I.
- **Famille technique** : HFC/HFO (mélange zéotrope). — **Famille moteur** : HFC — le mélange contient un HFC d'annexe I (R-32, 21,5 %) : régime de contrôle d'étanchéité en t éq. CO2 (seuil 5 t), PAS le régime « 1 kg » de l'annexe II section 1 réservé aux HFO/HCFO purs.
- **Contient HFC** : oui — **Contient HFO** : oui.
- **Classe de sécurité** : A2L (ISO 817 / ASHRAE 34 / EN 378) — confirmé Climalife et Chemours.
- **Glissement de température** : significatif : ≈ 7,8 K à pression atmosphérique (bulle −45,6 °C / rosée −37,8 °C, fiche Climalife). Charge en phase liquide obligatoire, réglages sur températures de bulle/rosée selon le cas.
- **Inflammabilité** : classe 2L : légèrement inflammable, faible vitesse de combustion. **Valeurs LII chiffrées non vérifiées sur source primaire — se reporter à la fiche de données de sécurité avant affichage.**
- **Toxicité** : classe A (faible toxicité) — composants R-32 et R-1234yf tous deux classés A.

**Restrictions et échéances**
- **Contrôles d'étanchéité** (art. 5) dès 5 t éq. CO2, soit ≈ 33,8 kg avec PRP retenu 148 (50 t ≈ 337,8 kg ; 500 t ≈ 3 378 kg) ; fréquences 12/6/3 mois, doublées si système de détection (exemption possible : hermétiquement scellé étiqueté < 10 t éq. CO2).
- **AUCUNE interdiction d'entretien ne le vise** : PRP 148 < 2500 (interdictions 2025/2026) et < 750 (interdiction 2032).
- **PRP < 150** : passe sous la plupart des seuils d'interdiction de mise sur le marché de l'annexe IV (c'est son positionnement commercial en remplacement du R-404A/R-22).
- Obligations générales : récupération obligatoire, personnel titulaire de l'attestation d'aptitude (cat. I à IV), étiquetage art. 12.
- **Dates d'entrée en application** : règl. en vigueur depuis le 11/03/2024 ; aucune des échéances PRP (2025, 2026, 2032) ne concerne le R-454C.

**Fiabilité et contre-vérification**
- **Fiabilité** : SOURCE PRIMAIRE (EUR-Lex consulté directement le 24/07/2026).
- **Contre-vérification indépendante** : PRP ✅ · Classe ✅ · Annexe ✅. 148 vérifié (Climalife « 148/146 », Chemours 148 AR4). Calcul strict 2024/573 reconstitué et confirmé : 145,52. Aucune valeur sourcée supérieure à 148. Classe A2L et annexe I confirmées. Attention mineure : un résumé secondaire (Nissha/oxmaint) inversait AR4/AR5 (146/148) — la fiche primaire Climalife tranche : 148 = AR4, 146 = AR5.

**Notes**
- PIÈGE PRINCIPAL : trois PRP concurrents — 148 (AR4), 146 (AR5), ≈ 145,5 (calcul strict 2024/573). Règle projet : 148 retenu. **Tous les candidats restent < 150 : aucun basculement de seuil réglementaire quel que soit le choix.** Zéotrope à glissement élevé (≈ 7,8 K) : charger en liquide. La fiche PDF Chemours renvoie un 403 : composition/classe corroborées par Climalife + résultats convergents. **Non vérifié faute de source fiable : tolérances de composition ASHRAE et LII chiffrée** (à reprendre de la fiche de données de sécurité avant affichage opposable de ces deux champs).

**Sources**
1. https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R0573 — consulté directement le 24/07/2026 (annexe I HFC-32 = 675 ; annexe II section 1 HFC-1234yf = 0,501 ; annexe VI ; art. 5 ; art. 13 §3-5).
2. https://www.climalife.co.uk/454c — composition 21,5/78,5, PRP 148/146 AR4/AR5, A2L, bulle/rosée.
3. https://www.opteon.com/en/products/refrigerants/xl20 — Chemours Opteon XL20 (PDF inaccessible en 403, valeurs corroborées via résultats de recherche).
4. https://www.solstice.com/us/en/products/air-conditioning-refrigeration-and-heating/solstice-hfo-blends/solstice-454c-r-454c — Honeywell Solstice 454C.

---

### Fiche 8 — R-513A (Opteon XP10)

**Validation Franck : ☐**

**Identité**
- **Désignation** : R-513A — mélange azéotropique R-1234yf/R-134a (56,0/44,0 % en masse). Aucune ambiguïté d'isomère : le composant HFO est le R-1234yf, à ne pas confondre avec le R-1234ze(E) utilisé dans d'autres mélanges (R-515B…). Nom commercial principal : Chemours Opteon XP10.
- **Composition** : R-1234yf 56,0 % / R-134a 44,0 % (massique), tolérances ±1,0/±1,0 (ASHRAE 34). **ATTENTION : certains sites français inversent la composition (« 56 % R-134a / 44 % R-1234yf » chez Organilog) — c'est FAUX**, la désignation ASHRAE officielle est R-1234yf/134a (56,0/44,0).

**PRP**
- **PRP retenu : 631** (le plus élevé des candidats — règle du projet, précédent R-455A).
- **Source du PRP retenu** : calcul de mélange sur valeurs AR4 (R-134a = 1430 + R-1234yf = 4) ; valeur publiée par Chemours (fiche Opteon XP10) et convergente sur toutes les fiches fournisseurs.

| Valeur | Statut | Source |
|--------|--------|--------|
| **631** | **RETENU** | GIEC AR4 — calcul de mélange (0,44×1430 + 0,56×4 = 631,4) ; publié par Chemours et la plupart des fiches techniques |
| 629,5 | écarté | Calcul strict annexe VI du règl. (UE) 2024/573 : 0,44×1430 + 0,56×0,501 = 629,48 |
| 573 | écarté | GIEC AR5 — Chemours (fiche Opteon XP10), Climalife |

**Classement réglementaire et technique**
- **Annexe réglementaire** : Annexe I.
- **Famille technique** : HFC/HFO (mélange azéotropique). — **Famille moteur** : HFC — le mélange contient 44 % de R-134a (HFC annexe I) : régime HFC intégral, contrôles en t éq. CO2, malgré une majorité massique de HFO.
- **Contient HFC** : oui — **Contient HFO** : oui.
- **Classe de sécurité** : A1 (ASHRAE 34 / ISO 817 / EN 378) — non inflammable, faible toxicité.
- **Toxicité** : faible toxicité (classe A). Précautions usuelles des fluides A1 : risque d'asphyxie par déplacement d'air en cas de fuite massive en local confiné, gaz plus lourd que l'air.
- **Inflammabilité** : non inflammable (classe 1).
- **Glissement de température** : négligeable (0 K) — véritable azéotrope, d'où sa désignation dans la série R-500 ; se comporte comme un corps pur en charge et en transfert (chargeable en phase gazeuse ou liquide sans déséquilibre de composition notable).

**Restrictions et échéances**
- **Entretien** : aucune restriction — PRP 631 < 750 et < 2500, donc non concerné par les interdictions d'entretien de l'art. 13 §3 (seuil 2500 : froid dès 1/1/2025, clim/PAC dès 1/1/2026 ; seuil 750 : froid fixe hors refroidisseurs dès 1/1/2032). C'est précisément son rôle de fluide de service en remplacement du R-134a.
- **Mise sur le marché** (annexe IV, équipements NEUFS, PRP ≥ 150) : interdit dans le froid autonome neuf dès le **1/1/2025** ; interdit dans les refroidisseurs ≤ 12 kW neufs dès le **1/1/2027** (seuil 150) ; **PERMIS dans les refroidisseurs > 12 kW neufs** (seuil 750 au 1/1/2027, 631 < 750) ; interdit dans le froid fixe neuf hors refroidisseurs dès le **1/1/2030** (seuil 150).
- **Contrôles d'étanchéité** (régime HFC, t éq. CO2) : seuils 5 / 50 / 500 t éq. CO2 ≈ 7,92 kg / 79,2 kg / 792 kg au PRP 631.
- **Dates d'entrée en application** : règl. applicable depuis le 11 mars 2024. Jalons : 1/1/2025, 1/1/2027, 1/1/2030, 1/1/2032 (ce dernier non atteint par le R-513A).

**Fiabilité et contre-vérification**
- **Fiabilité** : SOURCES SECONDAIRES CONVERGENTES (accès direct au texte EUR-Lex échoué — 403/page vide ; valeurs 1430 et 0,501 recoupées par EFCTC, Chemours et la fiche ASHRAE/UNEP — **à faire viser sur le JO par le valideur** ; dates annexe IV recoupées AFCE + Daikin + Intarcon, même visa requis).
- **Contre-vérification indépendante** : PRP ✅ · Classe ✅ · Annexe ✅. 631 confirmé comme la valeur la plus élevée sourcée (Climalife « 631/573 » AR4/AR5, calcul AR4 recoupé). Le calcul strict donne 629,48, plus bas ; l'AR5 573, plus bas. Classe A1 confirmée (Climalife, Honeywell). Composition 56/44 confirmée (avec 56 % de R-134a le PRP serait ~800, valeur publiée nulle part — cohérence vérifiée). Annexe I correcte (44 % de R-134a).

**Notes**
1. Composition inversée sur au moins un site français (Organilog) — la bonne composition est R-1234yf 56 / R-134a 44 ; le PRP calculé ne change pas si on se trompe de sens, ce qui rend l'erreur sournoise à détecter.
2. Le R-513A n'est PAS listé nommément dans les annexes : son PRP se CALCULE (annexe VI). Calcul strict : 629,5 ; calcul AR4 historique : 631,4. Règle du projet : 631 — écart sans effet pratique sur les seuils (7,92 contre 7,94 kg pour 5 t éq. CO2).
3. Un calcul sur base AR6 (R-134a = 1530) donnerait ≈ 673, mais la F-Gas n'utilise PAS l'AR6 pour les HFC de l'annexe I (restée AR4) et aucune fiche fournisseur ne publie cette valeur : non retenue comme candidate, signalée pour mémoire.
4. Ne pas confondre R-1234yf et R-1234ze(E).
5. Fiabilité « secondaires convergentes » et non « primaire » : visa sur le JO requis pour les valeurs d'annexes et les dates.

**Sources**
1. https://eur-lex.europa.eu/legal-content/FR/TXT/PDF/?uri=OJ:L_202400573 — règl. (UE) 2024/573 (récupération directe refusée, valeurs confirmées par recoupement).
2. https://www.opteon.com/en/-/media/files/opteon/opteon-xp10-prodinfo.pdf — Chemours Opteon XP10 : composition 56/44, PRP AR4 631, AR5 573, A1, glissement 0 K.
3. https://www.opteon.com/en/products/refrigerants/xp10
4. https://ozone.unep.org/system/files/documents/UPDATED-Factsheet_ASHRAE_English_20180625_printer-11X17.pdf — fiche ASHRAE/UNEP : R-513A = R-1234yf/134a (56,0/44,0) ±1,0/±1,0, groupe A1.
5. https://www.fluorocarbons.org/wp-content/uploads/2025/08/Table-2_Fluorocarbon-Molecules-environmental-properties-and-main-applications-2024-draft-v2-2.pdf — EFCTC : R-134a = 1430 (annexe I), R-1234yf = 0,501 (annexe II section 1).
6. https://www.climalife.co.uk/r513a — corroboration distributeur.
7. https://www.afce.asso.fr/wp-content/uploads/2025/05/Vademecum_141025.pdf — AFCE, mémento opérateurs F-Gas, dates annexe IV.
8. https://www.daikin.eu/en_us/daikin-blog/f-gas-regulation/applied-heat-pumps-cooling-only.html — seuils refroidisseurs 1/1/2027 : 150 ≤ 12 kW, 750 > 12 kW.

---

### Fiche 9 — R-1234ze(E) (Solstice ze)

**Validation Franck : ☐**

**Identité**
- **Désignation** : R-1234ze(E) — trans-1,3,3,3-tétrafluoroprop-1-ène (HFO-1234ze(E)), CAS 29118-24-9. **L'isomère (E) doit être précisé** : l'isomère (Z) (cis, CAS 29118-25-0) est un fluide différent (point d'ébullition ≈ +9,8 °C, capacité volumétrique ~50 % plus faible). Le règlement 2024/573 le désigne « HFC-1234ze et isomères ».
- **Composition** : corps pur : CF3–CH=CHF (C3H2F4), M = 114,04 g/mol. Pureté commerciale ≥ 99,5 % masse (spécification Climalife/Honeywell Solstice ze). Point d'ébullition −18,98 °C, T critique 109,4 °C.

**PRP**
- **PRP retenu : 7** (le plus élevé publié — règle de précaution du projet, même arbitrage que R-455A 148/146).
- **Source du PRP retenu** : règl. (UE) 517/2014, annexe II (base AR4). **La valeur réglementaire EN VIGUEUR est 1,37** (règl. 2024/573, annexe II section 1, AR6). Sans incidence pratique sur les contrôles : le régime annexe II section 1 se déclenche en kg, pas en t éq. CO2.

| Valeur | Statut | Source |
|--------|--------|--------|
| **7** | **RETENU** | Règl. (UE) 517/2014, annexe II (abrogé), base AR4 — lu dans le texte officiel (CELLAR) ; repris par Climalife |
| 1,37 | écarté | Règl. (UE) 2024/573, annexe II section 1 (EN VIGUEUR), base AR6 — lu dans le texte officiel : « HFC-1234ze et isomères | CHF=CHCF3 | 1,37 » |
| 4,94 | écarté | Règl. (UE) 2024/573, annexe II section 1 — PRP sur 20 ans, « à titre purement informatif » : NE PAS utiliser comme PRP 100 ans dans le moteur |
| 1 | écarté | GIEC AR5 via brochure Honeywell Solstice ze (« 1 », ailleurs « <1 ») — corroboration seulement |

**Classement réglementaire et technique**
- **Annexe réglementaire** : **Annexe II section 1**.
- **Famille technique** : HFO (hydrofluorooléfine insaturée, corps pur). — **Famille moteur** : HFO pur — régime annexe II section 1 : seuils et fréquences de contrôle en KG (jamais en t éq. CO2). Ne contient aucun HFC d'annexe I : le régime HFC ne s'applique pas.
- **Contient HFC** : non — **Contient HFO** : oui.
- **Classe de sécurité** : A2L (ISO 817 / ASHRAE 34 ; NF EN 378 : A2L confirmé fiche Climalife).
- **Glissement de température** : 0 K — corps pur, glissement nul (Climalife).
- **Inflammabilité** : classe 2L. Particularité : **AUCUNE limite d'inflammabilité en dessous de 30 °C** (essai ASTM E681 à 21 °C : ininflammable) — classé 2L car inflammable à chaud : limites ≈ 7–12 % vol à 100 °C (ASHRAE 34), vitesse fondamentale de combustion ≈ 0 cm/s (ISO 817, pas de propagation de flamme), énergie minimale d'inflammation > 61 000 mJ à 54 °C. Ininflammable pour le stockage/transport (classification gaz comprimés) ; directive équipements sous pression : groupe 2. Les exigences EN 378 « A2L » (charge maximale selon l'emplacement, ventilation) s'appliquent néanmoins en installation.
- **Toxicité** : classe A — faible toxicité. Valeur guide fabricant : limite d'exposition professionnelle 800 ppm (moyenne 8 h, OARS WEEL). CL50 inhalation 4 h (rat) > 207 000 ppm ; pas de sensibilisation cardiaque observée jusqu'à 120 000 ppm (fiche de données de sécurité Honeywell). Gaz plus lourd que l'air : risque d'asphyxie en point bas.

**Restrictions et échéances**
- **Régime annexe II section 1 (en kg)** — art. 5 : contrôle d'étanchéité obligatoire dès **1 kg** de charge (hors mousses). Fréquences (art. 5 §6) : 1 à < 10 kg → 12 mois (24 avec détection) ; 10 à < 100 kg → 6 mois (12 avec détection) ; ≥ 100 kg → 3 mois (6 avec détection). Exemptions : équipements hermétiquement scellés étiquetés < 2 kg (< 3 kg en bâtiment résidentiel).
- Équipements mobiles art. 5 §3 b) et c) : obligations reportées au **12 mars 2027** (art. 5 §5).
- NON concerné par l'interdiction d'entretien PRP ≥ 2500 ni par le seuil 750, et sous les seuils PRP 150 des interdictions de mise sur le marché (annexe IV) : c'est un fluide de substitution.
- Récupération en fin de vie obligatoire (art. 8). Manipulation : certification/attestation d'aptitude étendue aux gaz de l'annexe II section 1 (art. 10) ; étiquetage art. 12 applicable depuis le **1er janvier 2025**. Hors quota HFC (n'est pas à l'annexe I).
- **Dates d'entrée en application** : 11 mars 2024 (entrée en vigueur, art. 38) pour les équipements fixes ; 12 mars 2027 pour les équipements mobiles ; étiquetage depuis le 1er janvier 2025.

**Fiabilité et contre-vérification**
- **Fiabilité** : SOURCE PRIMAIRE (les deux valeurs de PRP réglementaires lues directement dans les textes officiels CELLAR/EUR-Lex).
- **Contre-vérification indépendante** : PRP ✅ · Classe ✅ · Annexe ✅. Vérification sur les textes officiels : règl. 2024/573 annexe II section 1 — ligne exacte « HFC-1234ze et isomères | CHF=CHCF3 | 1,37 | 4,94 » (AR6, PRP 20 ans informatif) ; règl. 517/2014 annexe II — « HFC-1234ze trans — 7 » (AR4, « trans » = isomère (E)). 7 est la valeur la plus élevée sourcée ; aucune valeur supérieure crédible. Classe A2L confirmée (propagation de flamme à 60 °C, vitesse ≤ 10 cm/s, chaleur de combustion < 19 000 kJ/kg). Nuance utile : la désignation réglementaire « HFC-1234ze et isomères » couvre aussi le (Z) ; la distinction (E)/(Z) de la fiche est juste et importante.

**Notes**
1. DEUX PRP réglementaires concurrents — 7 (517/2014, AR4, abrogé) contre 1,37 (2024/573, AR6, en vigueur) ; règle du projet → 7 ; sans effet sur le moteur (régime en kg).
2. L'annexe II affiche aussi un PRP sur 20 ans = 4,94 « à titre purement informatif » — ne jamais le confondre avec le PRP 100 ans.
3. Le règlement écrit « HFC-1234ze » (pas « HFO ») : prévoir la correspondance de libellés dans le logiciel.
4. Ne pas confondre (E) et (Z) : fluides aux propriétés très différentes.
5. A2L malgré l'ininflammabilité sous 30 °C : les exigences EN 378 A2L s'appliquent quand même en installation.
6. Incohérence relevée dans la brochure Honeywell (p. 5) : limites supérieure 5,7 / inférieure 11,3 à 60 °C, valeurs vraisemblablement interverties — citer avec prudence.

**Sources**
1. https://eur-lex.europa.eu/eli/reg/2024/573/oj/fra — règl. (UE) 2024/573 (texte officiel récupéré via publications.europa.eu/resource/celex/32024R0573) : annexe II section 1, art. 5, art. 38.
2. https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32014R0517 — règl. (UE) 517/2014 (texte officiel) : annexe II, ligne « HFC-1234ze trans — 7 ».
3. https://prod-edam.honeywell.com/content/dam/honeywell-edam/pmt/oneam/en-us/refrigerants/documents/pmt-am-solstice-1234-ze-brochure.pdf — Honeywell Solstice ze : A2L, AR5 < 1, ininflammable < 30 °C, 800 ppm, isomères E/Z.
4. https://climalife.com/wp-content/uploads/2022/09/uploadsproductmediadocumenthfo-r-1234ze-en.pdf — fiche Climalife : A2L NF EN 378, glissement 0 K, PRP (AR4) 7, pureté ≥ 99,5 %.

---

### Fiche 10 — R-717 (ammoniac, NH3)

**Validation Franck : ☐**

**Identité**
- **Désignation** : R-717 (ammoniac, NH3) — corps pur, aucune isomérie possible.
- **Composition** : corps pur : ammoniac NH3 (100 %).

**PRP**
- **PRP retenu : 0** (aucune valeur concurrente trouvée — la règle « PRP le plus élevé » est sans effet ici).

| Valeur | Statut | Source |
|--------|--------|--------|
| **0** | **RETENU** | EN 378-1 (annexe E) / tableaux ASHRAE 34 — PRP direct nul, substance non fluorée |
| 0 | confirmation | Documentation sectorielle et fiches fournisseurs convergentes (PRP = 0, ODP = 0) |

**Classement réglementaire et technique**
- **Annexe réglementaire** : **HORS PÉRIMÈTRE FLUORÉ**.
- **Famille technique** : NH3 — fluide naturel inorganique (ni HFC, ni HFO, ni HCFO). — **Famille moteur** : NATUREL HORS F-GAS — traçabilité volontaire en kg, AUCUN contrôle d'étanchéité F-Gas (ni t éq. CO2 ni régime kg annexe II) ; aptitude suivie via « catégorie C / mention NH3 » (convention interne du projet).
- **Contient HFC** : non — **Contient HFO** : non.
- **Classe de sécurité** : **B2L** (ISO 817 / ASHRAE 34 / EN 378).
- **Glissement de température** : 0 K (corps pur).
- **Inflammabilité** : classe 2L — faible inflammabilité : LII élevée (~15 % vol., plage ~15–28 %), difficile à enflammer, vitesse de flamme faible ; **ne pas confondre « faible inflammabilité » avec « non inflammable »**.
- **Toxicité** : **classe B (toxicité supérieure)** — gaz toxique et corrosif ; odeur détectable dès < 5 ppm (auto-alarme naturelle), exposition dangereuse vers ~300 ppm, danger vital immédiat vers 500 ppm ; se référer aux valeurs limites d'exposition professionnelle françaises en vigueur (fiche toxicologique INRS ammoniac) pour les seuils opposables au travail.

**Restrictions et échéances**
- **AUCUNE restriction F-Gas** : le règlement (UE) 2024/573 ne s'applique qu'aux gaz fluorés listés à ses annexes I, II et III — l'ammoniac n'y figure pas (il y est au contraire cité comme solution de substitution). Donc : pas de contrôle d'étanchéité obligatoire, pas d'interdictions liées au PRP (seuils 2500/750 sans objet), pas de quotas, pas de déclaration F-Gas.
- En revanche, encadrement PROPRE au NH3 : EN 378 classe B2L (limites de charge selon l'occupation des locaux, salle des machines, détection) ; ICPE rubrique 4735 en France selon les quantités détenues ; **incompatibilité totale avec le cuivre et ses alliages (circuit acier obligatoire)**.
- Attestation d'aptitude F-Gas (catégories I à V) NON exigée pour intervenir sur NH3 ; le fluide entre au référentiel pour la traçabilité volontaire (en kg) et le suivi d'aptitude interne « catégorie C / mention NH3 » (convention du projet, pas une catégorie réglementaire).
- **Dates d'entrée en application** : sans objet — hors périmètre du règlement 2024/573.

**Fiabilité et contre-vérification**
- **Fiabilité** : SOURCES SECONDAIRES CONVERGENTES (EUR-Lex a refusé la récupération automatisée ; l'absence de l'ammoniac aux annexes est corroborée par plusieurs sources convergentes, mais **la vérification mot à mot sur le texte officiel reste à faire à l'écran lors du visa**).
- **Contre-vérification indépendante** : PRP ✅ · Classe ✅ · Annexe ✅. PRP 0 confirmé par la fiche technique Climalife (fiche R-717 : « PRP (AR4) : 0 ») et les sources F-Gas convergentes (hors quota, hors interdictions car non fluoré). Classe B2L confirmée (Climalife NF-EN 378, guides ASHRAE 34). Une valeur concurrente « PRP = 3 » repérée sur un seul agrégateur (hvactoolkit.org) a été ÉCARTÉE : site inaccessible, aucune corroboration réglementaire ou fournisseur, et l'AR4 du GIEC n'attribue aucun PRP à l'ammoniac (le « 3 » parfois cité est une estimation d'effet indirect, pas une valeur réglementaire).

**Notes**
1. Le GIEC (AR4/AR5) n'attribue PAS de PRP direct au NH3 ; la valeur 0 est celle des référentiels techniques (EN 378, ASHRAE) et de toute la documentation sectorielle.
2. Pièges pour le logiciel : ne pas confondre R-717 (ammoniac) et R-718 (eau) ; B2L = toxique AVANT d'être inflammable (le risque dominant est la toxicité) ; incompatibilité cuivre = jamais de raccord ou d'instrument à alliage cuivreux sur un circuit NH3.
3. « Catégorie C / mention NH3 » est une convention INTERNE du référentiel, à ne jamais présenter comme une catégorie du dispositif réglementaire F-Gas (cat. I–V) ni comme une obligation d'étanchéité.

**Sources**
1. https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=OJ%3AL_202400573 — règlement (UE) 2024/573 (récupération automatique bloquée, à ouvrir manuellement pour le visa).
2. https://www.evotrakker.com/app/library/docs/trade%20files/hvac/Ch2-Chemical_Physical_and_Environmental_Properties_of_A2L_Refrigerants_0.pdf — propriétés ASHRAE 34 / ISO 817.
3. https://refrigerantsensor.com/knowledge/ammonia/ — fiche R-717 : B2L, PRP 0, ODP 0, LII 15–28 %, seuils de toxicité, ébullition −33,34 °C.
4. https://evroprom.com/news/refrigerants-classification-properties-substitution-and-environmental-trends/ — ISO 817 B2L, « non soumis à la réglementation F-Gas ».
5. https://ealico.com/fr-fr/fiches-reglementaires/chauffage-climatisation/r%C3%A9glementation-europ%C3%A9enne-2024573-f-gaz-iii-la-r%C3%A9glementation-%C3%A9volue/ — périmètre F-Gas III (annexes I et II).
6. https://elka-france.eu/wp-content/uploads/2025/03/FAQ-_-Decoder-le-reglement-F-gaz_compressed.pdf — NH3 cité comme solution de SUBSTITUTION, pas comme gaz couvert.

---

## 3. Points d'attention

### 3.1 Litiges et incertitudes
- **Aucun litige de contre-vérification** : les 10 fluides passent les trois contrôles (PRP, classe, annexe).
- **Aucune fiche classée INCERTAIN.** En revanche, **5 fiches sur 10 sont en « sources secondaires convergentes »** (R-452A, R-454A, R-454B, R-513A, R-717) parce que EUR-Lex a bloqué la lecture automatique du texte officiel : **le visa sur pièce (JO de l'UE, à l'écran) est obligatoire avant tout semis dans le logiciel** pour ces cinq-là.
- **Un point à trancher explicitement par Franck** : pour le R-452A, une valeur 2141 circule dans des sources commerciales sans base de calcul traçable. C'est le seul candidat au-dessus du 2140 retenu. Application littérale de la règle « le plus élevé » = 2141 ; application raisonnée (valeur sourcée uniquement) = 2140. **Recommandation : rester à 2140** (aucun rapport GIEC ne soutient 2141), mais la décision revient à Franck.
- **Point ligne à ligne R-452A** : la valeur R-125 = 3500 n'apparaît pas explicitement dans l'extrait AFCE lu — à contrôler sur le texte JO.

### 3.2 Cases laissées ouvertes (volontairement non inventées)
| Fluide | Champ manquant | Où le trouver |
|--------|----------------|----------------|
| R-449A | Valeurs limites d'exposition | Fiche de données de sécurité du fabricant |
| R-454B | Valeurs limites d'exposition + LII à trancher (11,5 % vol. contre 8,0 % v/v) | Fiche de données de sécurité du fournisseur retenu |
| R-454C | Tolérances de composition ASHRAE + LII chiffrée | Fiche de données de sécurité avant affichage opposable |
| R-452B | Glissement 1,2 K (littérature scientifique) | Fiche technique PDF Honeywell si affichage d'une décimale |

### 3.3 Pièges d'isomères et de nommage
- **R-1234yf ≠ R-1234ze(E)** : deux HFO différents ; le yf n'a pas d'isomères, le ze en a deux.
- **R-1234ze(E) ≠ R-1234ze(Z)** : fluides très différents (ébullition −19 °C contre +9,8 °C). Le règlement écrit « HFC-1234ze et isomères » — prévoir la correspondance de libellés dans le logiciel.
- **R-448A ≠ R-449A** : quasi-jumeaux commerciaux (5 composants contre 4) ; la fiche Climalife R-449A contient elle-même la coquille.
- **R-452A (A1, PRP 2140) ≠ R-452B (A2L, PRP 698)** : la confusion change la classe de sécurité ET le régime d'interdictions.
- **R-454A (239) ≠ R-454B (467) ≠ R-454C (148)** : mêmes composants, proportions différentes — trois régimes réglementaires différents.
- **R-717 (ammoniac) ≠ R-718 (eau).**

### 3.4 Coquilles de fournisseurs relevées (ne pas s'en servir comme sources de chiffres)
- Livre blanc JCI R-454B : composition « 69,1 % » (au lieu de 68,9) et PRP « 676 » dans un tableau.
- Fiche Climalife R-449A : « R-448A » dans sa propre section réglementation.
- Organilog (R-513A) : composition inversée — erreur sournoise car le PRP calculé ne change pas.
- Brochure Honeywell R-1234ze(E) p. 5 : limites d'inflammabilité vraisemblablement interverties.
- oxmaint.com (R-454A) : « PRP 690 » sans aucun fondement.
- hvac-gas.eu (R-452A) : AR5 = 1952 divergent, probablement erroné.

### 3.5 Mélanges à fort glissement (charge en phase liquide OBLIGATOIRE)
| Fluide | Glissement à 1 atm | Gravité |
|--------|--------------------|---------|
| R-454C | ≈ 7,8 K | Fort |
| R-448A | ≈ 6,1–6,2 K | Fort |
| R-449A | 5,72 K | Fort |
| R-454A | ≈ 5 K | Fort |
| R-452A | 3,79 K | Modéré (fractionnement possible en fuite vapeur) |
| R-452B | ≈ 1,2 K | Faible |
| R-454B | ≈ 1,0–1,5 K | Faible (appoint possible après fuite selon JCI) |
| R-513A | 0 K (azéotrope) | Nul |
| R-1234ze(E), R-717 | 0 K (corps purs) | Nul |

### 3.6 Seuils PRP 750 et 2500 — approchés ou franchis
- **Seuil 2500 (interdictions d'entretien 2025/2026)** : aucun fluide du lot ne le franchit. Le plus proche est le **R-452A à 2140** (~85 % du seuil) — surveiller toute révision de PRP.
- **Seuil 750 FRANCHI** (interdiction du fluide vierge en entretien du froid fixe au 01/01/2032) : **R-448A (1387), R-449A (1397), R-452A (2140)**. Le régénéré/recyclé reste autorisé — cohérent avec la règle du cycle matière du projet.
- **Seuil 750 approché par en dessous** : **R-452B à 698** (à 52 points du seuil) et **R-513A à 631** — aucune interdiction d'entretien ; toute révision à la hausse du PRP les ferait basculer : à surveiller.
- **Seuil 150** : **R-454C à 148 juste sous le seuil** — tous ses candidats (145,5/146/148) restent < 150, aucun basculement possible quel que soit le choix. Le **R-454A (239)** est au-dessus de 150 : interdictions de mise sur le marché du neuf (2025 autonomes, 2030 froid fixe).

### 3.7 Rappels transversaux
- **Aucun mélange n'est listé nommément dans le règlement 2024/573** : les PRP de mélanges se CALCULENT (annexe VI) — d'où les valeurs concurrentes systématiques (AR4 fournisseurs contre calcul strict AR4-HFC/AR6-HFO). La règle « PRP le plus élevé » a été appliquée partout ; **aucun écart AR4/calcul strict ne fait basculer un seuil** dans ce lot.
- **12 mars 2027** : extension des contrôles d'étanchéité à certains équipements mobiles (véhicules utilitaires légers, conteneurs, wagons) — pertinent pour le registre, surtout pour le R-452A (transport frigorifique).
- **Régimes de contrôle différents** : annexe I = seuils en t éq. CO2 (8 fluides) ; annexe II section 1 = seuils en kg dès 1 kg (R-1234ze(E)) ; hors F-Gas = traçabilité volontaire (R-717).
- Les valeurs AR6 « scientifiques » (R-448A : 1494 ; R-454B : ~531 ; R-513A : ~673 ; R-454A : ~270) sont HORS périmètre réglementaire (les HFC de l'annexe I restent en base AR4) : signalées pour mémoire, jamais candidates.

---

*Document assemblé le 24/07/2026 — 10 fiches, 0 litige, 10 contre-vérifications positives. Aucune donnée n'est semée dans inerWeb Fluide avant le retour de ce document, validé ligne par ligne et fiche par fiche par Franck.*