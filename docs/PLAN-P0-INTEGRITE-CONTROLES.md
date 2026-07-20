# Plan — P0-2 + P0-7 : intégrité probatoire des contrôles d'étanchéité

**Origine :** audit externe #2 (`docs/AUDIT-INERWEB-FLUIDE-2026-07-20.md`, `docs/CONSTATS-AUDIT-EXTERNE-2026-07-20.md`).
**Cible :** registre officiel unique (barème maximal).
**Discipline :** plan + décisions gatées Franck AVANT de coder le fond (comme lot C).

---

## 1. Constat prouvé (lecture du code, 20/07)

Un contrôle d'étanchéité **autonome** (hors mouvement) n'a **aucune** des garanties probatoires d'un mouvement :

| Garantie | Mouvement officiel | Contrôle autonome |
|---|---|---|
| Blocage dur des conditions (PASSAGE/SOUMISSION/VALIDATION) | ✅ | ❌ (aucun `evaluerOfficiel`) |
| Double signature réelle (technicien + détenteur) | ✅ | ❌ |
| PDF final CERFA conservé + haché | ✅ | ❌ |
| Empreinte v2 chaînée | ✅ | ❌ |
| Triggers WORM (immuabilité) | ✅ | ❌ (table `controles` « sans WORM », migration 19) |
| Correction par contre-écriture | ✅ | ❌ (ligne modifiable/supprimable) |

**Références :** `enregistrerControle` (`server/api.js:5453`) accepte `mode:'OFFICIEL'` sans blocage ; table `controles` (`server/schema.sql:418-453`) sans empreinte/prev_hash/trigger ; `numero` et `mouvementId` arbitraires (`api.js:5464,5477`) ; rôle requis `OPERATEUR` (élève inclus, `api.js:322`).

---

## 2. P0-2 — colmatage immédiat — ✅ FAIT (commit `8fdd5fb`)

Le chemin **autonome** (`createControle`) franchit désormais le même blocage dur que les mouvements (`evaluerOfficiel('PASSAGE')`), dans les deux stores. Verrou de livraison fermé (T1) ⇒ **refus total** de tout contrôle officiel forgé. Le contrôle **lié** (né d'une validation de mouvement) n'emprunte pas ce handler et reste couvert par le parcours du mouvement. Test négatif de parité dans `test-contrat`. **85 exéc. vertes.**

> Ce colmatage **ferme la faille d'exploitation** tant que le verrou est fermé. Il ne construit PAS le parcours officiel du contrôle (P0-7). Il faudra, à la réouverture, que ce refus soit remplacé par un vrai parcours — sinon aucun contrôle officiel ne serait jamais possible.

---

## 3. P0-7 — le fond : un vrai parcours officiel pour le contrôle autonome

### Option A — RECOMMANDÉE : le contrôle autonome officiel EST un mouvement de type CONTROLE

Les types `CONTROLE_PERIODIQUE` / `CONTROLE_NON_PERIODIQUE` existent déjà dans `TYPES_MOUVEMENT` (`schema.sql:277`) et savent produire un CERFA (`generateur.js:85-86,316-317`). Un contrôle autonome officiel devient donc un **mouvement** de ce type, qui emprunte **tout le parcours officiel déjà prouvé** : brouillon → double signature → validation avec PDF final → écriture scellée v2 chaînée + WORM + contre-écriture, et le **contrôle lié naît scellé** via le mécanisme CR-3 existant.

- **Avantages :** zéro duplication du mécanisme WORM ; réutilise l'agrégat déjà audité (C1→C5) ; cohérent avec CR-3 ; le handler `createControle` direct reste réservé au **mode FORMATION** (outil pédagogique).
- **À vérifier avant code :** (a) qu'un mouvement de type CONTROLE produit bien un contrôle lié scellé ; (b) que son CERFA (cadre 7) est correct ; (c) que les effets machine (statut FUITE, échéances) sont identiques à `enregistrerControle` ; (d) qu'un contrôle sans mouvement de fluide accepte des pesées/quantités nulles.

### Option B — écartée : rendre la table `controles` WORM + chaînée + signée

Ajouter empreinte, prev_hash, triggers, signatures et PDF sur `controles`. **Duplication lourde** d'un mécanisme déjà existant sur les mouvements, deux chaînes probatoires à maintenir en parité. À n'envisager que si l'option A bute sur un obstacle métier.

---

## 4. Décisions à trancher (gate Franck) avant de coder le fond

1. **Architecture** : valider l'**option A** (contrôle officiel = mouvement type CONTROLE) plutôt que B ?
2. **Handler direct** : une fois A en place, **interdire définitivement** `mode:'OFFICIEL'` sur `createControle` (le rendre FORMATION-only en dur), au lieu de le laisser dépendre du verrou ?
3. **Modèle de données** : un contrôle périodique officiel SANS mouvement de fluide — mouvement type CONTROLE à quantité nulle, pesées facultatives : acceptable ?

---

## 5. Interactions à séquencer

- **P0-6 (cycle fuite : ≥ 24 h de fonctionnement, borne 1 mois)** et **P0-5 (matrice d'aptitude opposable)** touchent le même parcours de contrôle/validation → à traiter dans la foulée de P0-7, pas avant.
- **P0-2 → P0-7** : le refus dur posé en P0-2 sera **remplacé** par le vrai parcours à la réouverture (ne pas rouvrir le verrou tant que P0-7 n'est pas livré et testé).

---

## 6. Tests d'acceptation (à ajouter avec le fond)

- contrôle officiel autonome : **aptitude + signatures + PDF final + WORM obligatoires** (le parcours mouvement les impose) ;
- un contrôle officiel validé est **immuable** (UPDATE/DELETE SQL refusés) et **corrigeable seulement par contre-écriture** ;
- son CERFA final est **conservé** (octets identiques, dans la chaîne) ;
- le contrôle **lié** (via mouvement de charge/récupération déclarant un contrôle) reste inchangé ;
- `createControle` direct en OFFICIEL : refus (P0-2, déjà vert) — à faire évoluer selon décision n° 2.

---

## 7. Séquencement proposé

1. ✅ **P0-2** colmatage (fait).
2. **Gate Franck** : décisions §4.
3. **P0-7** option A : vérifier le parcours mouvement type CONTROLE (§3 « à vérifier »), combler les manques, tests d'acceptation §6.
4. **P0-6** cycle fuite, **P0-5** matrice aptitude (parcours commun).
5. Réouverture du verrou seulement après P0-2→P0-8 livrés + testés + relecture organisme agréé/DPD.
