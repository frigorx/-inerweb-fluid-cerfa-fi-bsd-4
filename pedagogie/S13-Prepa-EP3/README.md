# Séquence S13 — Prépa EP3 (CAP IFCA)

Séquence pédagogique complète construite **exactement sur le gabarit de la séquence S12**
(« Fiche d'activité élève » de F. Henninot), pour la filière Froid & Climatisation.

Positionnement dans la carte de progression : **S13 = préparation de l'épreuve certificative EP3**
(mise en service pratique). L'élève apprend à réaliser des relevés pression/température sur un banc
**R134a**, à convertir les pressions relatives en pressions absolues (Pabs = Prel + 1,013 bar), à lire
le **diagramme de Mollier** (log p–h), à établir le **bilan énergétique** du cycle (qo, w, qk, COP),
à régler les **pressostats BP/HP** et à diagnostiquer le fonctionnement (surchauffe SR,
sous-refroidissement SC).

## Contenu du dossier

| Fichier | Rôle | Format |
|---|---|---|
| `docx/S13-00-Fiche-sequence.docx` | Fiche de séquence enseignant (objectifs, compétences, planning des 4 séances) | Word éditable |
| `docx/S13-01-TP-Mollier-R134a.docx` | **TP complet** (gabarit A) : MES, relevés, conversion, lecture Mollier, bilan qo/w/qk/COP, tracé + corrigé enseignant | Word éditable |
| `docx/S13-02-Exercices-revision.docx` | **Exercices** de révision (conversion, Mollier, puissances, SR/SC, pressostats) + corrigé | Word éditable |
| `docx/S13-03-Interro.docx` | **Interro** (1 h) : SR/SC multi-fluides (8 lignes) + QCM 5 questions + corrigé | Word éditable |
| `docx/S13-04-Evaluation-EP3-blanc.docx` | **Évaluation de fin de séquence** : EP3 blanc, 6 exercices, /100, 1 h 45, + corrigé/barème | Word éditable |
| `assets/build13.py` | Générateur Python des 5 .docx (helpers réutilisés de S12) | — |
| `assets/fig/` | Figures PNG embarquées (Mollier tracé, Mollier vierge, pressostat, circuit 4 points) | — |

## Jeu de valeurs R134a (cohérent, réutilisé dans tous les documents)

Cycle R134a, évaporation ≈ 0 °C / condensation ≈ 40 °C. Conversion **Pabs = Prel + 1,013 bar**.

- BP = 2,00 bar rel → 3,01 bar abs → T0 ≈ 0 °C ; HP = 9,15 bar rel → 10,16 bar abs → Tk ≈ 40 °C.
- T aspiration = 10 °C → **SR = 10 K** ; T liquide = 35 °C → **SC = 5 K**.
- Enthalpies : **h1 = 404**, **h2 = 438**, **h3 = h4 = 249** kJ/kg.
- **qo = 155**, **w = 34**, **qk = 189** kJ/kg (contrôle qk = qo + w ✓) ; **COP ≈ 4,6**.
- qm = 0,05 kg/s → **Q0 = 7,75 kW**, **Pabs = 1,70 kW**, **Qk = 9,45 kW** (contrôle Qk = Q0 + Pabs ✓).
- Pressostat BP : cut-out = 3,0 bar, cut-in = cut-out + différentiel (0,5 bar) = 3,5 bar. Pressostat HP = sécurité (réarmement).

## Barème de l'évaluation EP3 blanc

Ex1 /10 · Ex2 /15 · Ex3 /18 · Ex4 /25 · Ex5 /20 · Ex6 /12 → **TOTAL /100** (ramené /20).

## Compétences CAP IFCA visées

**C1.1** Lire/interpréter un document technique (diagramme de Mollier) · **C4.2** Mettre en service
les équipements · **C4.5** Mesurer, comparer des grandeurs · **C4.6** Régler les valeurs de consigne
(pressostats) · **C5.1** Diagnostiquer/analyser · **C1.3** Rendre compte.

## Régénération

```
python3 assets/build13.py
```

Dépendances : `python-docx`, `Pillow`. Les figures sont lues depuis `/tmp/fig13` (ou `assets/fig`).

## Note enseignant — anti-triche IA

L'évaluation EP3 intègre une contre-mesure discrète (note grise en pied de la page de bilan).
Vérifier sa discrétion à l'impression N&B et tester une photo du sujet sur un assistant IA avant diffusion.
