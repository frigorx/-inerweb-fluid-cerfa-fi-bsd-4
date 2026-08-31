# Matrice des 39 codes théoriques — inerWeb HabFluide

> **Livrable 1** du cadrage éditorial du 31 août 2026. Preuve de couverture ET de profondeur.
> Établie contre `referentiel-2025.json`, transcription verbatim de l'annexe II de l'arrêté du
> 21 novembre 2025 (NOR TECP2532494A, JORF du 10 décembre 2025).
>
> **Statut : proposition soumise à validation de F. Henninot. Aucune rédaction n'a commencé.**

## Ce que la matrice établit

Les **39 codes** exigés au titre théorique (`T`) pour l'union des catégories **A1, A2, D et E**.
Ils ne sont écrits en dur nulle part : ils sont obtenus par filtrage du référentiel, ce qui est
sain — un changement d'arrêté les recalcule.

**Treize sont nouveaux en 2025** : 1.00, 1.07, 1.08, 5.09, 6.08, 7.10, 8.11, 9.10, 11.05, 12.01,
12.02, 12.13, 12.14. Un tiers du référentiel. C'est là que le livre est le plus faible, et c'est
logique : il a été écrit sur le régime précédent.

### Les trois défauts de méthode que cette matrice corrige

**1. La couverture était déclarative.** Le contrôle actuel (`extraire.mjs:259`) vérifie qu'un code
figure dans le tableau `codes:` écrit à la main dans le plan. Un chapitre peut annoncer un code
sans qu'une seule ligne ne le traite : la chaîne passe au vert. C'est ce que le cadrage refuse.

**2. La profondeur n'était pas mesurée.** Elle l'est ici, en mots de leçon. Réserve honnête :
l'attribution se fait par leçon, pas par phrase — une leçon qui déclare quatre codes voit ses mots
comptés quatre fois. **Les chiffres ci-dessous sont des plafonds, pas des mesures.** Un code
annoncé à 600 mots en vaut souvent 200 réels.

**3. Aucune question n'est rattachée à un code.** Les questions portent un *groupe* (`G1`, `G2`…),
jamais un code. La colonne « au moins une question d'entraînement pertinente » exigée par le
cadrage est donc **impossible à remplir en l'état**. Il faut créer ce rattachement.

## Verdict de profondeur

| Verdict | Codes | Sens |
|---|---:|---|
| **À ÉCRIRE** | 12 | moins de 500 mots — matière insuffisante, à produire |
| **À ÉTOFFER** | 22 | 500 à 1 000 mots — amorce présente, à approfondir |
| **À REPRENDRE** | 5 | plus de 1 000 mots — matière réutilisable, à réorganiser |

## La matrice

Le chapitre **porteur** enseigne le code ; les **rappels** le remobilisent sans le porter.
« Aujourd'hui » donne les chapitres du livre actuel et le nombre de pages où le code est inventorié.

### G1 — Législation et thermodynamique élémentaire

| Code | Cat. | Chapitre porteur | Rappels | Aujourd'hui | Mots | Verdict |
|---|---|---|---|---|---:|---|
| **1.00** ✦ | A1/A2/D/E | T1-4 · Qui fait quoi : aptitude, capacité, responsabilités | T1-1, T1-5 | ch. 3 · 4 p | 348 | À ÉCRIRE |
| **1.01** | A1/A2/D/E | T1-10 · Thermodynamique utile | — | ch. 5 · 4 p | 474 | À ÉCRIRE |
| **1.02** | A1/A2/D | T1-10 · Thermodynamique utile | T1-12 | ch. 5,7 · 24 p | 1797 | À REPRENDRE |
| **1.03** | A1/A2/E | T1-11 · Lire un diagramme log p-h et une table de saturation | T2-9 | ch. 6 · 10 p | 757 | À ÉTOFFER |
| **1.04** | A1/A2/D | T1-10 · Thermodynamique utile | T2-1 | ch. 5 · 4 p | 474 | À ÉCRIRE |
| **1.05** | A1/A2 | T2-6 · Les organes annexes et la prévention des fuites | — | ch. 8 · 4 p | 213 | À ÉCRIRE |
| **1.06** | A1/A2/D/E | T1-8 · Familles, nomenclature et propriétés | — | ch. 8 · 4 p | 472 | À ÉCRIRE |
| **1.07** ✦ | A1/A2/D/E | T1-8 · Familles, nomenclature et propriétés | T2-15 | ch. 8 · 4 p | 472 | À ÉCRIRE |
| **1.08** ✦ | A1/A2/D/E | T1-6 · Lire une classe de sécurité | — | ch. 2,17 · 20 p | 1589 | À REPRENDRE |

### G2 — Incidence sur l'environnement des réfrigérants et réglementations pertinentes en matière d'environnement

| Code | Cat. | Chapitre porteur | Rappels | Aujourd'hui | Mots | Verdict |
|---|---|---|---|---|---:|---|
| **2.01** | A1/A2/D/E | T1-3 · De Montréal à F-Gas III | T1-1 | ch. 3 · 16 p | 476 | À ÉCRIRE |
| **2.02** | A1/A2/D/E | T1-2 · Ozone, effet de serre, ODP et PRP/GWP | T1-3 | ch. 3 · 14 p | 228 | À ÉCRIRE |

### G3 — Contrôles à effectuer préalablement à la mise en service d'un équipement, après une longue période d'interruption, après un entretien ou une réparation, ou contrôles durant le fonctionnement

| Code | Cat. | Chapitre porteur | Rappels | Aujourd'hui | Mots | Verdict |
|---|---|---|---|---|---:|---|
| **3.05** | A1/A2 | T2-7 · Préparer une mise en service | T2-12 | ch. 13 · 10 p | 418 | À ÉCRIRE |

### G4 — Contrôles d'étanchéité

| Code | Cat. | Chapitre porteur | Rappels | Aujourd'hui | Mots | Verdict |
|---|---|---|---|---|---:|---|
| **4.01** | A1/A2/E | T2-8 · Rechercher une fuite | T2-6 | ch. 14 · 4 p | 434 | À ÉCRIRE |
| **4.02** | A1/A2/E | T2-8 · Rechercher une fuite | — | ch. 14 · 4 p | 434 | À ÉCRIRE |
| **4.09** | A1/A2/E | T2-8 · Rechercher une fuite | — | ch. 14 · 9 p | 284 | À ÉCRIRE |

### G5 — Gestion écologique du système et du réfrigérant lors de l'installation, de la maintenance, de l'entretien ou de la récupération

| Code | Cat. | Chapitre porteur | Rappels | Aujourd'hui | Mots | Verdict |
|---|---|---|---|---|---:|---|
| **5.07** | A1/A2/D | T2-10 · Récupérer, peser, stocker et tracer | T2-12 | ch. 15 · 9 p | 590 | À ÉTOFFER |
| **5.08** | A1/A2/D | T2-10 · Récupérer, peser, stocker et tracer | — | ch. 15 · 9 p | 590 | À ÉTOFFER |
| **5.09** ✦ | A1/A2/D | T2-10 · Récupérer, peser, stocker et tracer | — | ch. 15 · 9 p | 590 | À ÉTOFFER |

### G6 — Composant : installation, mise en service et maintenance de compresseurs à piston alternatif, à vis et à spirales, à un ou deux étages

| Code | Cat. | Chapitre porteur | Rappels | Aujourd'hui | Mots | Verdict |
|---|---|---|---|---|---:|---|
| **6.01** | A1/A2 | T2-2 · Le compresseur et la lubrification | — | ch. 9 · 5 p | 590 | À ÉTOFFER |
| **6.07** | A1/A2 | T2-2 · Le compresseur et la lubrification | T2-9 | ch. 9 · 5 p | 590 | À ÉTOFFER |
| **6.08** ✦ | A1/A2 | T2-2 · Le compresseur et la lubrification | T2-13 | ch. 9 · 11 p | 613 | À ÉTOFFER |

### G7 — Composant : installation, mise en service et maintenance de condenseurs à air froid et à eau froide

| Code | Cat. | Chapitre porteur | Rappels | Aujourd'hui | Mots | Verdict |
|---|---|---|---|---|---:|---|
| **7.01** | A1/A2 | T2-3 · Le condenseur | — | ch. 10 · 4 p | 542 | À ÉTOFFER |
| **7.09** | A1/A2 | T2-3 · Le condenseur | T2-9 | ch. 10 · 13 p | 805 | À ÉTOFFER |
| **7.10** ✦ | A1/A2 | T2-3 · Le condenseur | T2-13 | ch. 10 · 13 p | 805 | À ÉTOFFER |

### G8 — Composant : installation, mise en service et maintenance d'évaporateurs à refroidissement par air et à refroidissement par liquide

| Code | Cat. | Chapitre porteur | Rappels | Aujourd'hui | Mots | Verdict |
|---|---|---|---|---|---:|---|
| **8.01** | A1/A2 | T2-4 · L'évaporateur et le dégivrage | — | ch. 11 · 4 p | 588 | À ÉTOFFER |
| **8.10** | A1/A2 | T2-4 · L'évaporateur et le dégivrage | T2-9 | ch. 11 · 12 p | 833 | À ÉTOFFER |
| **8.11** ✦ | A1/A2 | T2-4 · L'évaporateur et le dégivrage | T2-13 | ch. 11 · 12 p | 833 | À ÉTOFFER |

### G9 — Composant : installation, mise en service et entretien des détendeurs thermostatiques et autres composants

| Code | Cat. | Chapitre porteur | Rappels | Aujourd'hui | Mots | Verdict |
|---|---|---|---|---|---:|---|
| **9.01** | A1/A2 | T2-5 · Les détendeurs | — | ch. 12 · 4 p | 587 | À ÉTOFFER |
| **9.09** | A1/A2 | T2-5 · Les détendeurs | T2-9 | ch. 12 · 9 p | 965 | À ÉTOFFER |
| **9.10** ✦ | A1/A2 | T2-5 · Les détendeurs | T2-13 | ch. 12 · 9 p | 965 | À ÉTOFFER |

### G11 — Informations sur les technologies pertinentes permettant de remplacer les gaz à effet de serre fluorés ou d'en réduire l'utilisation, et sur leur manipulation sans danger

| Code | Cat. | Chapitre porteur | Rappels | Aujourd'hui | Mots | Verdict |
|---|---|---|---|---|---:|---|
| **11.01** | A1/A2/D/E | T1-9 · Choisir un fluide de substitution | — | ch. 17 · 15 p | 932 | À ÉTOFFER |
| **11.02** | A1/A2 | T2-13 · Maintenir l'efficacité énergétique | T1-9 | ch. 17 · 15 p | 932 | À ÉTOFFER |
| **11.03** | A1/A2 | T1-7 · Se protéger avant de toucher | T1-6, T2-15 | ch. 1,2,17 · 39 p | 3565 | À REPRENDRE |
| **11.04** | A1/A2 | T1-9 · Choisir un fluide de substitution | T2-13 | ch. 17 · 15 p | 932 | À ÉTOFFER |
| **11.05** ✦ | A1/A2/D | T1-9 · Choisir un fluide de substitution | T2-14 | ch. 17 · 15 p | 932 | À ÉTOFFER |

### G12 — Installation et bonne pratique d'entretien des équipements et des systèmes tributaires des hydrocarbures

| Code | Cat. | Chapitre porteur | Rappels | Aujourd'hui | Mots | Verdict |
|---|---|---|---|---|---:|---|
| **12.01** ✦ | A1/A2 | T2-14 · Hydrocarbures : le spécifique A1 et A2 | — | ch. 18 · 6 p | 855 | À ÉTOFFER |
| **12.02** ✦ | A1/A2 | T1-7 · Se protéger avant de toucher | T2-14 | ch. 1,2,18 · 22 p | 3486 | À REPRENDRE |
| **12.13** ✦ | A1/A2 | T1-7 · Se protéger avant de toucher | T2-14 | ch. 1,18 · 9 p | 1347 | À REPRENDRE |
| **12.14** ✦ | A1/A2 | T2-14 · Hydrocarbures : le spécifique A1 et A2 | T2-13 | ch. 18 · 6 p | 855 | À ÉTOFFER |

✦ = code nouveau en 2025.

## Les libellés officiels

Verbatim de l'annexe II. Ils font foi : aucune reformulation n'est admise là où le code est cité.

- **1.00** — Connaissance élémentaire de la législation de l'Union européenne et nationale applicable, notamment celle relative aux gaz à effet de serre fluoré, aux DEEE et à l'écoconception
- **1.01** — Connaître les unités normalisées ISO pour la température, la pression, la masse, la densité et l'énergie
- **1.02** — Comprendre la théorie élémentaire des systèmes de réfrigération : thermodynamique élémentaire (terminologie, paramètres et processus essentiels tels que « surchauffe », « côté haute pression », « chaleur de compression », « enthalpie », « effet de réfrigération », « côté basse pression », « sous-refroidissement »), propriétés et transformations thermodynamiques des réfrigérants, y compris l'identification des mélanges zéotropiques et des états des fluides
- **1.03** — Utiliser les tableaux et graphiques correspondants et les interpréter dans le cadre de contrôles d'étanchéité indirects (y compris le contrôle du bon fonctionnement du système) : diagramme log p/h, tables de saturation d'un réfrigérant, diagramme d'un cycle frigorifique simple à compression
- **1.04** — Décrire la fonction des principales composantes du système (compresseur, évaporateur, condenseur, détendeurs thermostatiques) et les transformations thermodynamiques du réfrigérant
- **1.05** — Connaître le fonctionnement élémentaire des composantes suivantes utilisées dans un système de réfrigération ainsi que leur rôle et leur importance dans la prévention et la détection des fuites de réfrigérant : a) valves (robinets à boule, diaphragmes, robinets à soupape) ; b) contrôles de la température et de la pression ; c) repères transparents et indicateurs d'humidité ; d) contrôles du dégivrage ; e) protecteurs du système ; f) instruments de mesure tels que les thermomètres ; g) systèmes de contrôle de l'huile ; h) réservoirs ; i) séparateurs de liquides et d'huile, en tenant compte des spécificités du fonctionnement comportant des réfrigérants hautement inflammables ou toxiques (hydrocarbures ou NH3) et des réfrigérants fonctionnant à haute pression (CO2)
- **1.06** — Connaître le comportement spécifique, les paramètres physiques, les systèmes, les solutions, les déviances de tous les réfrigérants de substitution dans le cycle de réfrigération et les composants pour leur utilisation
- **1.07** — Connaître les caractéristiques des hydrocarbures, du CO2, et du NH3 et des autres réfrigérants non fluorés par rapport aux réfrigérants à gaz à effet de serre fluorés
- **1.08** — Connaître la combustibilité, la propagation des flammes, les restrictions relatives à la capacité de charge, les limites d'occupation pour les HFC, H(C)FO et hydrocarbures
- **2.01** — Avoir une connaissance élémentaire de la politique de l'UE et internationale en matière de changement climatique, y compris la convention-cadre des Nations unies sur les changements climatiques (CCNUCC) et le Protocole de Montréal relatif à des substances qui appauvrissent la couche d'ozone
- **2.02** — Avoir une connaissance élémentaire du concept de « potentiel de réchauffement planétaire » (PRP), de l'utilisation des gaz à effet de serre fluorés et d'autres substances en tant que fluides frigorigènes, de l'incidence des émissions de gaz à effet de serre fluorés sur le climat (ordre de grandeur de leur PRP) ainsi que des dispositions correspondantes du règlement (UE) n° 2024/573 et des actes d'exécution pertinents, de même que des menaces éventuelles pour l'environnement, y compris celles issues des produits de décomposition de certaines substances fluorées (PFAS) tels que les HFC, HFO et HCFO
- **3.05** — Consigner les données dans le registre de l'équipement et rédiger un rapport portant sur un ou plusieurs des essais et des contrôles effectués durant l'examen
- **4.01** — Connaître les points de fuite potentiels des équipements de réfrigération, de climatisation et de pompes à chaleur
- **4.02** — Consulter le registre de l'équipement avant tout contrôle d'étanchéité et relever les informations pertinentes concernant des problèmes récurrents ou des parties problématiques du système nécessitant une attention particulière
- **4.09** — Consigner les données dans le registre de l'équipement
- **5.07** — Consigner dans le registre de l'équipement toutes les informations pertinentes concernant le réfrigérant récupéré ou ajouté
- **5.08** — Connaître les prescriptions et les procédures de gestion, de réutilisation, de récupération, de stockage et de transport des réfrigérants et huiles fluorés, y compris lorsqu'ils sont contaminés
- **5.09** — Connaître les prescriptions et les procédures de gestion, de remplissage, de récupération, de stockage et de transport des hydrocarbures et des huiles, y compris lorsqu'ils sont contaminés, ainsi que d'installation d'équipements et de systèmes tributaires des hydrocarbures
- **6.01** — Expliquer le principe de fonctionnement d'un compresseur (y compris le réglage de la puissance et le circuit de lubrification) et les risques de fuite ou d'émission de réfrigérant qui y sont liés
- **6.07** — Rédiger un rapport sur l'état du compresseur en indiquant tout problème de fonctionnement susceptible d'endommager le système et d'entraîner à terme, faute de mesure, des fuites ou des émissions de réfrigérant
- **6.08** — Connaître les mesures d'amélioration ou de maintien de l'efficacité énergétique des équipements lors de l'installation ou de la maintenance des compresseurs
- **7.01** — Expliquer le principe de fonctionnement d'un condenseur et les risques de fuite qui y sont associés
- **7.09** — Rédiger un rapport sur l'état du condenseur en indiquant tout problème de fonctionnement susceptible d'endommager le système et d'entraîner à terme, faute de mesure, des fuites ou des émissions de réfrigérant
- **7.10** — Connaître les mesures d'amélioration ou de maintien de l'efficacité énergétique des équipements lors de l'installation ou de la maintenance des condenseurs
- **8.01** — Expliquer le principe de fonctionnement d'un évaporateur (y compris le système de dégivrage) et les risques de fuite qui y sont associés
- **8.10** — Rédiger un rapport sur l'état de l'évaporateur en indiquant tout problème de fonctionnement susceptible d'endommager le système et d'entraîner à terme, faute de mesure, des fuites ou des émissions de réfrigérant
- **8.11** — Connaître les mesures pour améliorer ou maintenir l'efficacité énergétique de l'équipement pendant l'installation ou la maintenance des évaporateurs
- **9.01** — Expliquer le principe de fonctionnement de différents types de vannes d'expansion (détendeurs thermostatiques, tubes capillaires) et les risques de fuite qui y sont liés
- **9.09** — Rédiger un rapport sur l'état de ces composants en indiquant tout problème de fonctionnement susceptible d'endommager le système et d'entraîner à terme, faute de mesure, des fuites ou des émissions de réfrigérant
- **9.10** — Connaître les mesures pour améliorer ou maintenir l'efficacité énergétique de l'équipement pendant l'installation ou la maintenance des détendeurs thermostatiques et d'autres composants
- **11.01** — Connaître les technologies de substitution pertinentes permettant de remplacer les gaz à effet de serre fluorés ou d'en réduire l'utilisation, et savoir les manipuler sans danger
- **11.02** — Connaître les systèmes de conception pertinents afin de réduire la charge des gaz à effet de serre fluorés et d'augmenter l'efficacité énergétique
- **11.03** — Connaître les réglementations et les normes de sécurité applicables pour l'utilisation, le stockage et le transport des réfrigérants inflammables ou toxiques ou des réfrigérants nécessitant une pression de fonctionnement plus élevée. Comprendre les conditions spécifiques liées au site dans lesquelles il est permis d'utiliser des équipements ne satisfaisant pas aux exigences énoncées à l'annexe IV du règlement (UE) 2024/573 en raison d'impératifs de sécurité
- **11.04** — Comprendre les avantages et inconvénients respectifs, notamment en ce qui concerne l'efficacité énergétique, des réfrigérants de substitution en fonction de leur application prévue et des conditions climatiques des différentes régions
- **11.05** — Connaître les différences de conception des composants et des systèmes pour les équipements et les systèmes tributaires des hydrocarbures
- **12.01** — Connaître les règles d'étiquetage et les prescriptions spéciales pour les réfrigérants inflammables dans les équipements, systèmes et cylindres de refroidissement ainsi que les prescriptions spéciales relatives au raccordement des bombonnes
- **12.02** — Connaître les prescriptions en matière de sécurité pour les outils d'entretien et les équipements, tels que la détection de gaz, la détection des fuites, la ventilation, les équipements de protection individuelle, les pompes à vide, les unités de récupération ; les prescriptions relatives à l'élimination des gaz récupérés
- **12.13** — Vérifier que les mesures de santé et de sécurité conformes aux règles applicables sont appliquées à l'emplacement du système (par exemple, panneaux de signalisation, issues de secours, capteurs de gaz, alarmes au gaz, etc.)
- **12.14** — Connaître les mesures d'amélioration ou de maintien de l'efficacité énergétique des équipements lors de l'installation ou de la maintenance avec des réfrigérants inflammables

## Les trous à combler, par ordre de gravité

### 1. L'efficacité énergétique — sept codes, une phrase dans le livre

Les codes **6.08, 7.10, 8.11, 9.10, 12.14** (tous nouveaux en 2025) et **11.02, 11.04** exigent de
connaître les mesures d'amélioration ou de maintien de l'efficacité énergétique, composant par
composant. Le livre définit le COP en une phrase et n'écrit jamais « coefficient de performance »
en toutes lettres. **Sept codes sur trente-neuf reposent sur une notion traitée en une ligne.**
C'est le trou le plus grave.

### 2. Les comptes rendus et le registre — sept codes de restitution écrite

**3.05, 4.09, 5.07** (consigner au registre) et **6.07, 7.09, 8.10, 9.09** (rédiger un rapport
d'état). Ce sont des compétences d'écriture professionnelle, évaluables, et le livre les traite en
annexe. Le chapitre T2-9 « Raisonner sans diagnostiquer trop vite » devient leur lieu de synthèse :
distinguer le fait, l'hypothèse et la conclusion, c'est exactement ce que ces sept codes demandent.

### 3. Le code 1.00 — législation, DEEE et écoconception

Exigé pour **les quatre catégories**, nouveau en 2025, et parmi les plus faibles du livre :
l'écoconception y tient en 27 mots. Le dépôt `pilote-fluides` contient pourtant huit planches
dédiées à l'écoconception et quarante sur les déchets, toutes inutilisées.

### 4. Le rattachement question / code

186 questions rattachées à 11 groupes. À plat, cela ferait de 2,5 questions par code (G12) à 10
(G3) — mais ce sont des moyennes, pas des rattachements. **Aucun code ne peut prouver qu'il a sa
question.** Deux chantiers : rattacher l'existant code par code, puis compléter les découverts.

## Ce qui reste à décider

- **Le découpage en volumes.** L'affectation suit l'architecture du cadrage (12 + 15 chapitres).
  Le nombre de volumes se déduira du budget de pages, pas l'inverse.
- **T2-11 (brasage) ne porte aucun code théorique.** C'est normal, le brasage s'évalue en pratique.
  Le chapitre reste utile mais ne compte pas dans la preuve de couverture.
- **Les catégories B et C.** Les neuf codes du groupe G1 sont aussi exigés en B et C. Le livre les
  traite au seul titre de A1/A2/D/E ; la frontière doit rester explicite pour le lecteur.

---

*Établi contre `referentiel-2025.json` et `contenu.gen.json`. Brouillon soumis à validation.*