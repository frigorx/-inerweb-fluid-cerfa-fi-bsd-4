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

## 4. Décisions — ✅ TRANCHÉES par Franck (20/07)

1. **Architecture = OPTION A** (contrôle officiel = mouvement type CONTROLE). Franck : « fais ce qu'il y a de mieux » → A **seule**, pas A+B (deux chaînes probatoires pour la même garantie = double travail + double surface de bug + parité à maintenir ; le mieux probatoire est UNE chaîne, la plus éprouvée).
2. **`createControle` direct = FORMATION-only** (défaut retenu) : à terme, refus dur du mode OFFICIEL sur ce handler, l'officiel ne passant que par le parcours mouvement.
3. **Contrôle sans fluide = mouvement type CONTROLE à quantité nulle**, pesées facultatives (défaut retenu).

### Écart identifié (investigation 20/07)

Aujourd'hui, un contrôle n'existe que comme **sous-produit** d'un mouvement déclarant un `statutControle` accessoire (CR-3, `api.js:3128`, `demo-store.js:3217`). Le type `CONTROLE_PERIODIQUE`/`NON_PERIODIQUE` existe (`TYPES_MOUVEMENT`, `generateur.js:85`) mais le parcours où **le contrôle EST l'objet principal** (sans mouvement de fluide) n'est pas éprouvé. À combler : validations de pesées/bouteilles tolérant un mouvement CONTROLE « sec », création du contrôle lié depuis un mouvement de type CONTROLE, CERFA cadre 7, effets machine.

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

## 7. Séquencement — P0-7 découpé en briques (style lot C : 1 brique = code + tests verts + commit)

1. ✅ **P0-2** colmatage (fait, `8fdd5fb`).
2. ✅ **Gate archi** : option A tranchée (§4).
3. **P0-7, en briques, Opus effort xhigh, petites étapes :**
   - **P7-a** — ✅ **FAIT** (`abe0003`, 85 exéc.) : `TYPES_MOUVEMENT` étendu (contrat + 2 stores ; le CHECK SQL les acceptait déjà), `appliquerEffets` traite un mouvement CONTROLE comme « sec » (aucune pesée, aucun effet stock), CR-3 dérive le `typeControle` du type du mouvement, test de parcours créer→soumettre→valider (parité demo/local). **RESTE découvert → à traiter en P7-d :** `dashboard.js` a son propre mapping de libellés SANS les types CONTROLE (trou d'affichage) ; le wizard ne propose pas encore la création d'un mouvement CONTROLE.
   - **P7-b** — ✅ **FAIT** (`ffbf29a`, 85 exéc.) : garde métier (un mouvement CONTROLE exige un résultat CONFORME/FUITE, sinon refus à la validation — pas de « contrôle vide ») + libellés dashboard (icône loupe) pour les 2 types CONTROLE. Le contrôle lié naissait déjà d'un mouvement CONTROLE (CR-3, fait en P7-a).
   - **P7-c** — ✅ **FAIT** (85 exéc.) : `createControle` direct FORMATION-only PAR NATURE — le refus « par verrou » (P0-2) est devenu un refus STRUCTUREL du mode OFFICIEL (`MSG_CONTROLE_DIRECT_OFFICIEL`, posé dans les 2 miroirs `blocage-officiel.js`, parité mot pour mot testée), qui tiendra verrou OUVERT. Test contrat : égalité STRICTE du message (prouve que ce n'est plus le verrou qui parle), refus avant tout effet, parité demo/local. Contrôle LIÉ préservé (CR-3 appelle `enregistrerControle` hors handler). Doc contrat mise à jour. **Constat de revue consigné pour P7-e :** l'import JSON pourrait introduire un contrôle « OFFICIEL » orphelin (sans `mouvementId`) — dans la cible option A, un contrôle officiel naît TOUJOURS d'un mouvement (CR-3) ; ajouter en P7-e une garde d'import (refus ou déclassement d'un contrôle OFFICIEL sans mouvement lié).
   - **P7-d1** — ✅ **FAIT** (85 exéc.) : effets machine et CERFA du mouvement CONTROLE prouvés/complétés. (1) CR-3 transmet `operateurId` (lien fiche personnel B2, tout contrôle lié) ; (2) pour un mouvement DE TYPE CONTROLE, l'échéance suivante est **CALCULÉE** par la logique réglementaire unique (cadre 7, même résultat que `calculerProchainControle`) et portée à la machine — jamais de saisie libre par ce chemin ; sans elle la machine sonnait « en retard » après un contrôle frais (alertes lisent `machine.prochainControle` stocké). Le contrôle ACCESSOIRE (charge/récup) garde le comportement historique. FUITE aussi datée (l'horloge périodique repart du dernier contrôle ; le suivi de fuite est une échéance distincte). (3) Garde métier : machine DEMANTELEE → contrôle sans objet, refus à la validation (ARRETEE reste contrôlable). (4) Tests contrat : FUITE→statut+localisation+operateurId+dernierControle, réparation+CONFORME→EN_SERVICE (R4), échéance = calcul du contrat, refus démantelée. (5) Tests CERFA : mouvement CONTROLE validé relu au PDF — Case_CtrlPerio seule, cadre 5 détecteur, cadre 7 seuil+fréquence, cadre 10, cadre 11 TOUT vide (sec), cadre 12 vide, mention FORMATION. **Constat consigné :** l'échéance du contrôle accessoire (charge+contrôle déclaré) n'est toujours pas mise à jour (comportement historique conservé) — à trancher avec Franck si on l'aligne.
   - **P7-d2** — ✅ **FAIT** (85 exéc. + vérif navigateur port jetable) : carte « Contrôle d'étanchéité » à l'étape 1 (+ interrupteur non périodique), parcours « sec » (étapes 3-4 « Sans objet » sautées aller/retour, « Sans objet » retiré de l'étape 5, récap épuré, pesées null explicites), reprise CR-1, chipType + quantité « — » + groupe de filtre CONTROLE dans les vues. Parcours complet prouvé en navigateur réel (mode démo) : validation, contrôle lié + échéance réglementaire, filtre, CERFA rendu, zéro erreur console.
   - **P7-e** — ✅ **FAIT** (85 exéc.) : (1) **garde `createControle` direct** : `mouvementId` forgé REFUSÉ (le lien naît de CR-3 seulement — fermait le « reste consigné » de l'audit : le serveur l'insérait, la démo l'ignorait en silence) ; (2) **garde d'import** : contrôle OFFICIEL orphelin (sans `mouvementId`) refusé dans les invariants des deux stores (miroirs exacts) ; (3) **acceptation contrat (parité demo/local)** : mouvement CONTROLE validé refuse suppression/revalidation (MSG_ECRITURE_FIGEE), contre-écriture = seule correction (scellée v2, type conservé, quantité 0, aucun effet stock fantôme — `appliquerEffetsInverses` ignore les types CONTROLE par construction), le contrôle lié SURVIT à l'annulation et la machine n'est PAS retouchée (comportements CONSIGNÉS, alignés sur le contrôle accessoire). **La part OFFICIELLE (aptitude+signatures+PDF sur le parcours contrôle) va dans la suite e2e GELÉE** — consigne de réouverture ajoutée en tête de `server/test-officiel-e2e.mjs`. Le trigger WORM SQL, indépendant du type, reste discriminé par test-migrations.
   - **Écarts consignés** : (a) ✅ **SOLDÉ par P0-6 / CF-5 (22/07, décision G5)** — l'annulation d'un mouvement porteur d'un contrôle lié RECALCULE désormais les effets machine depuis les contrôles restés actifs (contrôle annulé = fait dérivé du statut ANNULE du mouvement, aucune écriture sur `controles` ; limite consignée : l'échéance antérieure au premier contrôle est inconnaissable, laissée en l'état) ; (b) l'échéance du contrôle ACCESSOIRE (charge+contrôle déclaré) n'est pas mise à jour (historique, cf. P7-d1) — RESTE consigné.
4. ~~**P0-6** cycle fuite (24 h/1 mois)~~ ✅ **TERMINÉ 22/07** (CF-1→CF-6, `docs/PLAN-P0-6-CYCLE-FUITE.md`), ~~**P0-5** matrice aptitude~~ ✅ **TERMINÉ 22/07** (AP-1→AP-5, `docs/PLAN-P0-5-APTITUDE.md`).
5. Réouverture du verrou seulement après P0-2→P0-8 livrés + testés + relecture organisme agréé/DPD.
