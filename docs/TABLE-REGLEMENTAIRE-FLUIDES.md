# Table réglementaire des fluides — PROPOSITION à valider

> **Statut : PROPOSITION. Rien de ce document n'est codé en dur.**
> C'est le premier pas de la **condition 1** du plan (`docs/PLAN-AUDIT-PROOF-2026.md`) : le
> **moteur réglementaire unique**. La règle absolue du projet s'applique : **aucune valeur ou règle
> réglementaire n'entre dans le code sans la validation de Franck + du référent F-Gas.**
> Ce fichier est fait pour être **annoté** (colonne « Décision référent ») puis servir de source
> unique une fois validé.
>
> Établi le 15/07/2026 par extraction croisée des 3 implémentations actuelles du code + recherche
> sur sources officielles (eur-lex, Légifrance, service-public, FAQ DGPR), avec vérification
> adversariale des 3 points-clés.

---

## 1. Les 3 règles réglementaires (vérifiées sur sources officielles)

### Règle A — Un mélange HFC/HFO se traite comme un **HFC** (seuils en tonnes éq. CO₂)
La **notice officielle** du CERFA 15497*04 (N°52064#04) le dit explicitement, avec R-455A pour
exemple nominal :

> « Lorsqu'un fluide frigorigène est composé d'un mélange de HFC et de HFO (exemple : R455A composé
> de 75,5 % de R1234yf, 21,5 % de R32 et 3 % de R744), le fluide doit être considéré comme relevant
> de la catégorie des HFC [...] soumis en conséquence à l'établissement d'une fiche d'intervention. »

Conséquence : sa quantité de référence est le **tonnage équivalent CO₂** (PRP × charge / 1000), et
les seuils de contrôle sont ceux des HFC (5 / 50 / 500 tCO₂eq), **pas** les seuils HFO en kg.
- Sources : Notice CERFA 15497*04 (service-public) ; Code de l'environnement art. R. 543-75
  (« HFC à l'exception des HFO ») ; Règl. UE 517/2014 art. 4.

### Règle B — Les HFO **purs** ont bien des seuils en **kilogrammes** (nouveauté F-Gas III)
Le règlement **UE 2024/573 (F-Gas III), art. 5**, en vigueur depuis le 11/03/2024, soumet les gaz
fluorés insaturés (HFO, annexe II section 1, PRP ≈ 1) au contrôle d'étanchéité **à partir de 1 kg**,
avec paliers 10 kg et 100 kg. Un seuil en tCO₂eq ne serait jamais atteint avec un PRP proche de 1.
- ≥ 1 kg et < 10 kg : 12 mois (24 avec détection permanente)
- ≥ 10 kg et < 100 kg : 6 mois (12 avec détection)
- ≥ 100 kg : 3 mois (6 avec détection)
- **Ces valeurs 1/10/100 kg sont exactement celles du code.** Sous l'ancien 517/2014, les HFO purs
  n'étaient PAS contrôlés du tout → **la règle dépend de la date d'intervention** (à partir du
  11/03/2024 pour les HFO purs).
- Sources : Règl. UE 2024/573 art. 5 §1 et §6 ; notice CERFA (quantité en kg pour HCFC **et** HFO).

### Règle C — La périodicité se calcule sur la **charge totale déclarée** de l'équipement
Pas sur la quantité momentanément présente (qui varie avec les fuites, appoints, récupérations).
- FAQ officielle DGPR : « le contrôle d'étanchéité périodique s'applique aux équipements et non aux
  circuits [...] la fréquence est à déterminer en **sommant la capacité en charge** de fluides
  frigorigènes de chacun des circuits de l'équipement. »
- La charge de référence est une **valeur nominale fixe** (marquée à demeure sur la plaque
  signalétique, imposée par le marquage indélébile du 2024/573). Une fuite ou une récupération ne
  change pas la classification de l'équipement.
- Sources : FAQ DGPR fluides fluorés ; Règl. UE 517/2014 art. 4 / UE 2024/573 art. 5 ; Code de
  l'environnement R. 543-76 ; Arrêté du 29/02/2016 art. 4.

### Seuils et fréquences de référence (récapitulatif)

| Catégorie | Grandeur de référence | Seuil bas | Seuil moyen | Seuil haut | Fréquences (sans / avec détection permanente) |
|---|---|---|---|---|---|
| **HFC / PFC** (et mélanges contenant du HFC) | tonnes éq. CO₂ | 5 tCO₂eq | 50 tCO₂eq | 500 tCO₂eq | bas 12/24 · moyen 6/12 · haut 3/6 mois |
| **HFO purs** (F-Gas III, depuis 11/03/2024) | kg bruts | 1 kg | 10 kg | 100 kg | bas 12/24 · moyen 6/12 · haut 3/6 mois |
| **HCFC** (parc résiduel, recharge interdite depuis 2015) | kg bruts | *2 kg (code) / 3 kg (historique) — à trancher* | 30 kg | 300 kg | bas 12/24 · moyen 6/12 · haut 3/6 mois |
| **CO₂ (R-744), HC (R-290), NH₃** | — | hors périmètre du contrôle d'étanchéité fluoré | | | aucune fréquence imposée |

---

## 2. Table réglementaire par fluide (proposée)

Le principe du **moteur unique** : chaque fluide devient une fiche explicite (plus de
`famille.includes("HFO")` dont l'ordre change le résultat d'un fichier à l'autre).

| Code | Composition (familles) | contient HFC | contient HFO | Catégorie **cadre 7** | PRP (AR4) | Source PRP | Classe sécu. (NF EN 378) | Seuil déclencheur (charge nominale) |
|---|---|---|---|---|---|---|---|---|
| **R-32** | HFC pur | oui | non | **HFC** (tCO₂eq) | 675 | AR4 / annexe F-Gas | A2L | ≈ 7,41 kg (= 5 tCO₂eq) |
| **R-410A** | mélange HFC (R-32/R-125) | oui | non | **HFC** (tCO₂eq) | 2088 | AR4 | A1 | ≈ 2,39 kg |
| **R-134a** | HFC pur | oui | non | **HFC** (tCO₂eq) | 1430 | AR4 | A1 | ≈ 3,50 kg |
| **R-407C** | mélange HFC (R-32/125/134a) | oui | non | **HFC** (tCO₂eq) | 1774 | AR4 | A1 | ≈ 2,82 kg |
| **R-404A** | mélange HFC (R-125/143a/134a) | oui | non | **HFC** (tCO₂eq) | 3922 | AR4 | A1 | ≈ 1,27 kg — *statut RESTREINT (PRP > 2500)* |
| **R-1234yf** | **HFO pur** | non | oui | **HFO** (kg) *depuis 11/03/2024* | 4 | annexe F-Gas | A2L | 1 kg |
| **R-455A** | **mélange HFC/HFO** (3 %·R744 + 21,5 %·R32 + 75,5 %·R1234yf) | oui | oui | **HFC** (tCO₂eq) — *Règle A* | 148 | moyenne pondérée massique (AR4) | A2L | ≈ 33,8 kg |
| **R-744** | CO₂ (inorganique) | non | non | **hors périmètre** | 1 | définition | A1 | aucun |
| **R-290** | HC (propane) | non | non | **hors périmètre** | 3 | AR4 | **A3** | aucun |

Notes :
- **R-455A** : le point sensible. Traité **HFC → tCO₂eq** (Règle A). À 3,2 kg (machine démo M5) :
  3,2 × 148 / 1000 = **0,47 tCO₂eq**, très en dessous de 5 → **aucun contrôle périodique obligatoire**.
  Le code du CERFA et des alertes le classe aujourd'hui en HFO/kg et lui impose à tort un contrôle
  annuel (voir §3).
- **R-1234yf** : PRP **4** = valeur réglementaire (annexe F-Gas). Certaines sources scientifiques
  citent < 1 ; on garde **4** (valeur opposable). À confirmer référent.
- **PRP figé** : à la validation d'un mouvement, le PRP du fluide est figé (`prpFige`) et **non
  rétroactif** — décision actée, protège l'historique. Inchangé.

---

## 3. Divergences constatées dans le code actuel (les règles sont dupliquées 3 fois)

La même logique « cadre 7 » existe en **trois exemplaires non partagés**, et ils se contredisent :

| Où | Ordre familles | Champ de charge | Verdict |
|---|---|---|---|
| `v8/js/documents/plaque-fgas.js` (étiquette) | **HFC avant HFO** → R-455A en HFC | `chargeNominaleKg` | **CORRECT sur les 2 axes** |
| `v8/js/cerfa/generateur.js` (`calculerCadre7`, le PDF CERFA officiel) | HFO avant HFC → R-455A en HFO | `chargeActuelleKg` | faux sur les 2 axes |
| `server/api.js` (`frequenceControleMois`, échéances/alertes serveur) | HFO avant HFC → R-455A en HFO | `chargeActuelleKg` | faux sur les 2 axes |
| `v8/js/data/demo-store.js` (échéances/alertes démo) | via `calculerCadre7` | `chargeActuelleKg` | faux sur l'axe charge |

Ironie utile pour l'audit : le seul module **correct** (`plaque-fgas.js`) est une simple étiquette
imprimée ; les deux qui portent un **effet réglementaire réel** (le CERFA généré + l'alerte de
contrôle en retard) appliquent la mauvaise règle.

### Bug n°1 — mélange HFC/HFO classé en HFO
`generateur.js:133` et `api.js:4392` testent `includes('HFO')` **avant** `includes('HFC')`. Un
libellé « HFC/HFO » (ou « Mélange HFO/HFC ») tombe dans la branche HFO (seuils kg) au lieu de HFC
(tCO₂eq). **Contredit la Règle A.** Effet : R-455A sous 5 tCO₂eq se voit imposer un contrôle
périodique qui n'a pas lieu d'être, et le CERFA officiel coche la mauvaise case de seuil.

### Bug n°2 — périodicité calculée sur la charge présente
`calculerCadre7` / `frequenceControleMois` sont appelées avec `machine.chargeActuelleKg`
(`generateur.js:375`, `api.js:2144`, `demo-store.js:2490`). **Contredit la Règle C** (il faut la
charge **nominale/totale déclarée**). Effet pervers : une machine qui a fui et perdu du fluide voit
sa fréquence de contrôle **s'alléger** — l'inverse du bon sens et du droit.

### Points cosmétiques / cohérence
- Libellé famille R-455A : `demo-donnees.js` = « HFC/HFO » vs `schema.sql` = « Mélange HFO/HFC ».
  Sans effet fonctionnel (recherche par sous-chaîne) mais à harmoniser vers un libellé canonique.
- `generateur.js` recalcule `teqCO₂` en ligne (`:145`) au lieu d'appeler `utils.teqCO2()` — même
  formule, duplication à supprimer lors de l'unification.

---

## 4. Questions ouvertes — à trancher par Franck + référent F-Gas (GATE)

Aucune de ces réponses n'est codée avant validation.

1. **Mélange HFC/HFO = catégorie HFC** (Règle A) : **on confirme** qu'un mélange contenant du HFC se
   traite en tCO₂eq (seuils 5/50/500), conformément à la notice CERFA ? (Le règlement UE 2024/573
   art. 5 §1 prévoit aussi un double-seuil annexe I *et* annexe II ; la **notice nationale simplifie**
   en « catégorie HFC ». On suit la notice — à confirmer.)
2. **HFO purs = seuils kg depuis le 11/03/2024** (Règle B) : on applique bien les paliers 1/10/100 kg
   au R-1234yf pur (régime F-Gas III) ? Faut-il gérer la **date d'intervention** (avant/après
   11/03/2024) dans le moteur, ou considérer que tout est postérieur ?
3. **Charge de référence = charge nominale déclarée** (Règle C) : on corrige `chargeActuelleKg` →
   `chargeNominaleKg` partout (CERFA + alertes) ?
4. **HCFC seuil bas** : on garde **2 kg** (valeur actuelle du code) ou on aligne sur les **3 kg**
   historiques (Règl. 842/2006) ? Enjeu faible (HCFC interdits à la recharge depuis 2015, aucun
   HCFC dans le référentiel actuel).
5. **CO₂ (R-744), HC (R-290)** : confirmés **hors périmètre** du contrôle d'étanchéité fluoré
   (comportement actuel : aucune fréquence) ? (NH₃ également hors CERFA — déjà acté.)
6. **PRP R-1234yf = 4** : valeur réglementaire à conserver (vs < 1 des sources scientifiques) ?
7. **Multi-circuits** : le modèle de données n'a **qu'une** `chargeNominaleKg` par machine, pas de
   somme de circuits. Suffisant pour l'atelier du lycée (équipements simples) ou faut-il un champ de
   charge totale distinct ? (Lacune de modèle à acter, pas bloquante.)
8. **Équipements hermétiquement scellés** (exemption < 10 tCO₂eq / < 3 kg résidentiel, F-Gas III) :
   à gérer ou hors périmètre lycée ?
9. **Régime applicable / version du CERFA** : à la date du 15/07/2026 c'est le **2024/573 (F-Gas III)**
   qui s'applique (517/2014 abrogé le 31/12/2024). Le formulaire **15497*04** est antérieur : le
   référent confirme-t-il qu'il reste le bon support, ou existe-t-il une révision plus récente ?
   (Enjeu direct sur la mention « mode CONSEIL, ma lecture de l'arrêté ».)
10. **R-404A statut RESTREINT** (PRP > 2500, maintenance au fluide vierge interdite) : reste-t-il
    purement déclaratif, ou faut-il une règle codée qui alerte/bloque l'appoint en fluide vierge ?

---

## 5. Conséquences côté code (APRÈS validation — non codé à ce stade)

Une fois la table validée, condition 1 du plan :
1. **Un seul module serveur** = source de vérité, exposant la table ci-dessus (fiche explicite par
   fluide : `contientHFC`, `contientHFO`, `categorieCadre7`, `prp` + `sourcePrp`, `classeSecurite`,
   seuils, unité) + une fonction unique `frequenceControle(fluide, chargeNominale, detection, date)`.
2. Le front consomme ce module (fin des 3 copies : `plaque-fgas.js`, `generateur.js`, `api.js`).
3. **Corrige bug n°1** (mélange → HFC) et **bug n°2** (`chargeNominaleKg`) au même endroit.
4. **Batterie de tests aux valeurs limites** : exactement sous / égal / au-dessus de chaque seuil ;
   HFC purs ; mélanges HFC/HFO ; HFO purs ; HCFC ; CO₂/HC (hors périmètre) ; détection
   présente/absente ; le cas R-455A à 3,2 kg (doit donner **aucun contrôle**).
5. Parité DemoStore/LocalStore prouvée (`test-contrat.mjs` demo + local), `lancer-tests.mjs` tout vert.

Ce n'est **pas** engagé tant que le §4 n'est pas tranché.
