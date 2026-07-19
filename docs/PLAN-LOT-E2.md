# PLAN DU LOT E2 — Coffre-fort chiffré réversible des identités d'élèves

> **Statut : EN ATTENTE DE VALIDATION FRANCK.** Aucune ligne de code tant que ce plan
> n'est pas validé (même règle que le lot C). Une fois validé : le suivre À LA LETTRE,
> une brique = un commit testé.
>
> **Provenance** : conception du 19/07/2026 — 12 agents (4 reconnaissances ciblées du
> dépôt, 2 architectures concurrentes, 1 fusion, 5 critiques adversariales). La critique
> a produit 5 constats bloquants et 17 importants : **tous les remèdes sont intégrés
> ci-dessous** — ce plan est la version corrigée, pas le premier jet.

---

## 1. Ce que ça fait (résumé pour décision)

Plutôt que d'effacer les données d'élèves partis (impossible pour ce qui est scellé,
et irréversible pour le reste), on **met leur identité à l'abri** :

- La fiche de l'élève est **pseudonymisée** : « Jean Martin » devient « Élève 2026-01 »
  partout à l'écran, dans les exports et les dossiers d'audit.
- Tout ce qui identifie (nom, prénom, courriel, n° et organisme d'attestation, dates,
  identifiant de connexion, image de signature, scans) est **chiffré** (AES-256-GCM,
  état de l'art, même mécanique que le coffre-fort de sauvegarde) dans une **enveloppe**
  rangée en base, protégée par un **code** (une phrase) que toi seul connais.
- Le code **rouvre** l'identité en cas de besoin légal : consultation ponctuelle
  (rien n'est réécrit) ou restauration complète de la fiche. Chaque réouverture est
  **journalisée de façon inaltérable** (qui, quand, pourquoi) — c'est ta preuve
  opposable au DPD.
- **Rien ne casse** : la chaîne de hash, les signatures scellées, le WORM, l'export/
  import, les sauvegardes — le coffre ne touche que la fiche, qui est hors empreinte.

**Ce qu'on dit honnêtement au DPD** (et dans RGPD.md) : le coffre RÉDUIT la surface
nominative, il ne la supprime pas. Ce qui est scellé dans le registre (nom du technicien
d'une écriture validée, signatures réelles, PDF conservés, journal historique) reste en
clair dans la base — c'est l'exigence d'intégrité du registre, et la raison d'être de ce
compromis : « identité de la fiche mise à l'abri ; écritures d'intervention conservées
sous pseudonyme à l'affichage ».

## 2. Les 5 arbitrages à valider (recommandations fermes)

| # | Question | Recommandation | Alternative écartée |
|---|---|---|---|
| 1 | **Déclencheur** | **Manuel par lot** : bouton « Mettre à l'abri » dans la vue Protection des données, fiches échues **pré-cochées** + **rappel automatique non bloquant** (bandeau quand la durée annoncée — année scolaire en cours + la suivante — est dépassée) | Automatique : impossible sans stocker la phrase, ce qui détruirait le coffre |
| 2 | **Le code** | **Phrase NEUVE dédiée au coffre** (≥ 14 caractères, conseil affiché : 4-5 mots tirés au hasard), jamais celle des sauvegardes ; séquestre PAPIER : bouton « Imprimer l'enveloppe de séquestre » (impression directe, jamais en PDF), sous pli scellé au coffre de l'établissement ; `changerPhraseCoffre` disponible | Réutiliser la phrase de sauvegarde : elle circule (restaurations, collègues), mélange des compromissions |
| 3 | **Périmètre chiffré** | Nom, prénom, courriel, identifiant de connexion, n° + organisme + dates d'attestation, image de signature, scans. Restent en clair : type, rôle applicatif, catégories, activités, habilitations/mentions (rattachées par identifiant). Pseudonyme « Élève AAAA-NN » | Périmètre réduit : laisserait des identifiants indirects retrouvables auprès de l'organisme |
| 4 | **Affichage des données figées** | Substitution **par identifiant** au rendu via la fiche vivante (`executeParId`, `operateurId`, `reparateurId`, `validateurId` pour les contre-écritures) sur TOUS les écrans quotidiens et CSV ; ce qui n'a pas d'identifiant (mouvements antérieurs à la migration 16, blocs de signatures, CERFA conservés, journal historique) = **résidu honnête consigné au DPD** | Correspondance par empreinte de nom en base : matière dérivée du nom stockée, ambiguïtés d'homonymes, inutile puisque l'identifiant existe |
| 5 | **Réversibilité** | **Tout le coffre au niveau REFERENT_ADMIN** (mise à l'abri comprise — voir §5 « aveu »), phrase à chaque geste, **motif obligatoire** pour consultation et restauration, journal WORM `COFFRE_*` avec pseudonyme + identifiant PER-…, jamais le nom | Mise à l'abri à VALIDEUR : séparation illusoire, le porteur de la phrase peut de toute façon tout déchiffrer |

## 3. Modèle de données

**Migration 25** (immuable ; patron migration 17 ; registre-commentaire complété ;
aucun trigger WORM concerné — vérifié, `declencheursWorm()` inchangé) :

```sql
CREATE TABLE IF NOT EXISTS coffre_identites (
    id                 TEXT PRIMARY KEY,
    personnel_id       TEXT UNIQUE NOT NULL REFERENCES personnel(id),
    pseudonyme         TEXT UNIQUE NOT NULL,        -- « Élève 2026-01 »
    enveloppe          BLOB NOT NULL,               -- sel(16) | iv(12) | tag(16) | chiffré
    date_mise_a_labri  TEXT NOT NULL,
    etablissement_id   TEXT NOT NULL,
    date_creation      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS coffre_purge_en_attente (
    id            TEXT PRIMARY KEY,
    chemin        TEXT NOT NULL,                    -- fichier à supprimer, rejoué au démarrage
    date_creation TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

- **Enveloppe AUTOPORTANTE** (leçon n°1 de la critique) : chaque enveloppe embarque
  SON sel — elle reste déchiffrable seule, où qu'elle voyage. Le sel est identique pour
  tout le coffre (une seule dérivation scrypt par opération) ; il vit aussi dans
  `parametres` (`coffre_sel`, **16 octets = 32 caractères hexadécimaux**) avec le témoin
  (`coffre_temoin`, enveloppe complète en **base64** chiffrant la chaîne fixe
  `COFFRE-TEMOIN-1` — vérifier la phrase sans jamais stocker de dérivé) et
  `coffre_kdf` (paramètres de dérivation consignés, version « v1 »).
- **Chiffrement** : nouvelles primitives `chiffrerOctets`/`dechiffrerOctets` extraites
  du corps de `chiffrer()` (`server/chiffrement.js`) — on ne détourne PAS l'enveloppe
  de sauvegarde. **Scrypt N=131072, r=8, p=1** pour le coffre (≈ 0,5-1 s — le format est
  neuf, rien n'impose d'hériter du N=32768 des sauvegardes ; un coffre d'identités
  mérite mieux contre la force brute hors ligne). Phrase NFC, IV neuf par enveloppe,
  **AAD = `coffre:v1:<personnelId>:<pseudonyme>`** (échanger deux enveloppes casse le
  tag). Garde-fou maison conservé : re-déchiffrement et comparaison bit à bit AVANT
  toute écriture. `cle.fill(0)` en `finally` (hygiène best-effort).
- **Contenu de l'enveloppe** (JSON par personne, version:1) : identité complète +
  `actif` d'origine + identifiant de connexion + image de signature + scans (octets
  base64 + hash).
- **Fiche après mise à l'abri** : `prenom='Élève'`, `nom='2026-01'` (tous les libellés
  `prenom + ' ' + nom` du dépôt donnent le pseudonyme sans toucher une seule vue) ;
  courriel/attestation/dates/`signature_chemin` → NULL ; **`actif=0` forcé dans la même
  transaction** (la fiche disparaît des sélecteurs du wizard — sans passer par
  `desactiverPersonne`, dont le journal graverait le nom). L'identifiant `PER-…` ne
  change JAMAIS. L'existence de la ligne `coffre_identites` EST le marqueur « au coffre ».
- **Pièces jointes PERSONNEL** (hors WORM, vérifié) : octets dans l'enveloppe, lignes
  supprimées, fichiers purgés APRÈS validation (liste de rattrapage rejouée au démarrage).
- **Compte `utilisateurs_app`** : identifiant rangé dans l'enveloppe, remplacé par
  `eleve-AAAA-NN`, compte désactivé (la session meurt), mot de passe haché conservé.
- **Pseudonyme** : « Élève AAAA-NN », compteur **MONOTONE par année** rangé dans
  `parametres` (jamais décrémenté — une restauration ne libère pas le numéro : pas
  d'ambiguïté dans les CSV et journaux déjà émis).
- **Exposition** : les deux tables dans `TABLES_NON_MAPPEES` — le front ne voit jamais
  une enveloppe ; import/export par insertion BRUTE dédiée (patron `reinsererJournal`),
  jamais par le mapping.

## 4. Flux

**(a) Mise à l'abri** (REFERENT_ADMIN, geste manuel par lot) :
liste à cocher (échues pré-cochées) → phrase (double saisie à la création du coffre,
vérifiée par le témoin ensuite) → dérivation scrypt HORS transaction → UNE transaction :
enveloppes (fiche + octets PJ) chiffrées + re-déchiffrées de contrôle, INSERT coffre,
UPDATE personnel (pseudonyme + NULL + actif=0), **réécriture de `technicien` (pseudonyme)
dans les mouvements NON figés (BROUILLON/SOUMIS) de la personne** (hors empreinte — un
brouillon d'élève parti ne garde pas son nom), DELETE PJ PERSONNEL, renommage +
désactivation du compte, inscription des chemins en purge — COMMIT → purge disque
best-effort, rattrapage au démarrage. Journal : `COFFRE_MISE_A_L_ABRI`, cible =
pseudonyme + identifiant PER-…, **JAMAIS le nom, JAMAIS d'instantané avant/après**
(piège n°1 du dépôt : `journaliser()` grave aujourd'hui `prenom + ' ' + nom` à jamais).

**⚠️ Pré-condition de sécurité (bloquant n°2 de la critique)** : la mise à l'abri
**exige une ARCHIVE complète vérifiée** (base + documents) datant de moins de 24 h —
sinon elle la déclenche d'abord (mécanique `sauvegarde-auto` existante) et refuse
proprement si l'archive échoue. Raison : après la purge des scans, restaurer un
INSTANTANÉ antérieur (base seule) laisserait une base nominative pointant des fichiers
disparus — perte définitive de pièces réglementaires. En complément : contrôle
best-effort au démarrage qui dénonce (journal + bandeau, patron `PDF_FINAL_ANOMALIE`)
toute PJ ou signature dont le fichier ne résout plus ; et SAUVEGARDE.md dit en toutes
lettres « après une mise à l'abri, restaurer une ARCHIVE, pas un instantané ».

**(b) Quotidien pseudonymisé** : tout ce qui RELIT la fiche suit automatiquement
(annuaire, CSV habilitations/mentions/mouvements par identifiants, export RGPD E1,
libellés du wizard). Substitution par identifiant au rendu pour les copies figées :
`nomAffichageMouvement` (module pur) branché sur la vue Mouvements, **le tableau de
bord (repli technicien), la vue Contrôles, la fiche machine, la fiche fuite (opérateur
ET réparateur), les dossiers de fuite, et l'index de recherche** (reconstruit sur le nom
substitué — chercher le vrai nom d'un élève au coffre ne trouve plus rien). La fiche au
coffre est **verrouillée CÔTÉ STORE, deux miroirs** (pas seulement à l'écran) :
`updatePersonne`, `ajouterPieceJointe` PERSONNEL, `desactiverPersonne` → refus canonique
unique ; seule la restauration lève le verrou.

**(c) Consultation** (REFERENT_ADMIN, phrase + motif obligatoire) : déchiffrement de la
SEULE enveloppe demandée, modale éphémère (PJ téléchargeables à la demande), rien de
réécrit, journal `COFFRE_CONSULTATION`. Phrase fausse ou enveloppe altérée = **message
unique** « Code incorrect ou coffre altéré » (anti-oracle). **L'export RGPD (E1) d'une
personne au coffre substitue nom/prénom des signatures par le pseudonyme** avec la
mention « identité au coffre — consultation par le geste dédié » (sinon l'export
contournerait le motif et le journal).

**(d) Restauration** (REFERENT_ADMIN, phrase + motif) : fiche restaurée bit à bit
(y compris `actif` d'origine), PJ re-matérialisées (hash revérifié), identifiant de
connexion restauré, DELETE de la ligne coffre, journal `COFFRE_RESTAURATION`.

**(e) Changement de phrase** (REFERENT_ADMIN) : ancienne phrase exigée, re-chiffrement
de TOUTES les enveloppes + nouveau témoin + nouveau sel en une transaction,
re-déchiffrement de contrôle de chaque enveloppe neuve avant COMMIT (une enveloppe
corrompue = ROLLBACK global, rien ne bouge), journal `COFFRE_CHANGEMENT_PHRASE`.

**Restriction réseau** : les six méthodes du coffre sont **refusées quand `IWF_LAN=1`**
(« les opérations du coffre exigent le poste local ») — le serveur est en HTTP sans
chiffrement de transport : la phrase ne traverse jamais le réseau du lycée.

## 5. Gestion du code — position honnête

- **Perte du code = contenu du coffre perdu.** Dit en toutes lettres à la création,
  avec la nuance : le registre continue de fonctionner intégralement en pseudonymes, et
  le nom d'un élève ayant validé des écritures reste de toute façon lisible dans le
  champ scellé. Parade : le séquestre PAPIER (enveloppe imprimée directement — jamais
  « imprimer en PDF » —, pli scellé au coffre de l'établissement, procédure dans RGPD.md).
- **Aveu au DPD (à écrire tel quel)** : quiconque détient la phrase peut techniquement
  déchiffrer une copie de la base HORS application ; la traçabilité (motif + journal)
  ne vaut que pour les accès PAR l'application. Sur un poste mono-professeur, c'est le
  bon compromis ; pas de passe-partout, pas de double clé (règle maison).
- **Les messages d'erreur du coffre ne contiennent JAMAIS la phrase** ni un fragment
  saisi (le patron du dépôt journalise `erreur.message` dans le journal WORM — une
  phrase interpolée y serait gravée à jamais). Vérifié par test.

## 6. Export / import / démo (les bloquants n°1 et n°3 de la critique)

- **L'export JSON transporte le coffre EXPLICITEMENT** : bloc `coffreConfig
  { sel, temoin, kdf }` + collection `coffreIdentites` (enveloppes en base64). FAIT
  ÉTABLI par la critique (4 lentilles sur 5) : la table `parametres` ne voyage PAS dans
  l'export JSON — sans ce bloc, un import sur poste neuf rendrait toutes les identités
  indéchiffrables À JAMAIS avec la bonne phrase. À l'import : remplacement atomique
  (sel + témoin + enveloppes dans la MÊME transaction — cohérence garantie, « un import
  restaure un instantané »). `coffre_purge_en_attente` ne voyage jamais (chemins propres
  au poste). Export ancien sans coffre → coffre à vide (patron établi).
- **Le mode démo transporte l'OPAQUE** : un export réel importé en démo conserve les
  enveloppes telles quelles (consultation → message canonique d'échec, bandeau
  « chiffrement simulé ») — l'aller-retour réel → démo → réel ne perd RIEN. En sens
  inverse, le coffre SIMULÉ de la démo est balisé `SIMULATION-COFFRE` et l'import
  serveur le REJETTE proprement (jamais d'enveloppe factice en base réelle).
- **Démo : jamais de dérivé de la phrase persisté** — la phrase d'exercice vit en
  mémoire de session seulement (ni `donnees`, ni localStorage) ; bandeau explicite :
  « chiffrement simulé — n'utilisez jamais ici votre vraie phrase de coffre ».

## 7. Contrat et rôles

**6 méthodes nouvelles** (contrat 81 → **87**, `VERSION_CONTRAT` 6 → 7,
`test-contrat.mjs` mis à jour) :

| Méthode | Genre | Rôle serveur |
|---|---|---|
| `etatCoffre` | lecture | VALIDEUR (`ROLES_LECTURE_SENSIBLE`) — pseudonymes, dates, candidats (`estFicheEchue` du module pur), jamais une enveloppe ni un nom |
| `verifierCodeCoffre` | lecture | REFERENT_ADMIN (`ROLES_LECTURE_SENSIBLE`) |
| `mettreAuCoffre` | mutation | REFERENT_ADMIN |
| `consulterIdentiteCoffre` | lecture | REFERENT_ADMIN (`ROLES_LECTURE_SENSIBLE`) |
| `restaurerIdentiteCoffre` | mutation | REFERENT_ADMIN |
| `changerPhraseCoffre` | mutation | REFERENT_ADMIN |

Au passage (constat RGPD de la critique, une ligne) : `getJournalAudit` rejoint
`ROLES_LECTURE_SENSIBLE` (VALIDEUR) — aujourd'hui tout élève connecté lit l'historique
nominatif complet. La modale Signatures (noms réels d'un mouvement consulté) reste :
nécessaire au parcours de signature — consignée aux résidus.

**Module pur** `v8/js/data/coffre-identites.js` + miroir littéral serveur :
`prochainPseudonyme`, `estFicheEchue(personne, dateDuJour)` (bascule d'année scolaire
testée aux 31/08-01/09), `assemblerIdentite`/`restaurerIdentite`,
`nomAffichageMouvement`, messages canoniques.

## 8. Découpage en briques (chacune : code → tests verts → revue → commit)

- **E2a — Primitives + module pur** (aucune méthode de contrat).
  `chiffrerOctets`/`dechiffrerOctets` (zéro régression sauvegarde), module pur + miroir.
  Tests : vecteurs FIGÉS (formats sel/iv/tag/base64 verrouillés), parité miroir,
  aller-retour chiffré, AAD étrangère refusée, sel 16 octets vérifié, 1000 tirages sans
  IV répété, `estFicheEchue` aux bornes.
- **E2b — Migration 25 + contrat + les deux magasins + verrous.**
  Les 6 méthodes, verrou store des fiches au coffre, réécriture des brouillons,
  pré-condition d'archive, refus LAN, rattrapage au démarrage, journal dédié.
  **Attaques à TIRER** (base + port jetables) : chaîne verte après mise à l'abri d'un
  élève à mouvements figés ; grep du journal — aucun nom réel ni fragment de phrase ;
  phrase fausse vs enveloppe altérée → message identique ; enveloppe altérée d'un octet
  → refus ; enveloppe rejouée sur un autre porteur → AAD refuse ; double mise à l'abri
  → refus ; ÉLÈVE → 403 sur les six ; **ENSEIGNANT → 403 sur les méthodes
  REFERENT_ADMIN** ; `updatePersonne`/`ajouterPieceJointe` sur fiche au coffre → refus
  canonique (démo PUIS local) ; coupure simulée entre COMMIT et purge → rattrapage ;
  sans archive fraîche → refus propre ; `IWF_LAN=1` → refus ; export RGPD E1 d'un élève
  au coffre → aucun nom réel ; mise à l'abri d'une fiche non-élève → autorisée
  (candidats pré-cochés = élèves échus seulement) ; brouillon d'un élève au coffre →
  affichage pseudonymisé ET reprise du wizard fonctionnelle. Le coffre de test est créé
  UNE fois par suite (scrypt ≈ 1 s — le filet reste sous la minute).
- **E2c — Aller-retour export/import + démo.**
  Bloc `coffreConfig` + insertion brute, remplacement atomique, opaque en démo, rejet
  du balisage simulation. Attaques : export → import sur base VIERGE → consultation
  RÉUSSIT avec la phrase d'origine ; restauration complète APRÈS aller-retour (PJ
  re-matérialisées) ; grep borné de l'export (« aucun nom des personnes à l'abri dans
  personnel/PJ/coffre, aucune entrée de journal POSTÉRIEURE au geste portant leur
  nom ») ; enveloppe falsifiée dans le JSON → consultation échoue proprement, registre
  intact ; coffre orphelin → rejet journalisé ; changement de phrase PUIS import d'un
  export antérieur → refus propre, jamais de bouillie ; démo → serveur avec coffre
  simulé → zéro ligne factice.
- **E2d — Interface + substitution d'affichage.**
  Section « Coffre des identités » dans la vue Protection des données (compteur,
  bandeau des échues, les 5 gestes), badge + verrou dans la fiche et l'annuaire,
  `nomAffichageMouvement` branché sur les SEPT points d'affichage + l'index de
  recherche. Tests DOM (shim) + **essai navigateur complet sur serveur jetable** :
  mise à l'abri → tous les écrans pseudonymisés → consultation avec motif →
  restauration → chaîne verte.
- **E2e — Documentation honnête (gate Franck/DPD).**
  RGPD.md : §5 réécrit en deux clauses (« identité de la fiche : mise à l'abri chiffrée
  après la durée ; écritures d'intervention scellées : conservées sans limite pour
  l'intégrité, sous pseudonyme à l'affichage ») ; section résidus COMPLÈTE (technicien
  scellé, signatures + modale, PDF conservés, journal, `ajoute_par`/`nom_fichier` des
  PJ figées, sauvegardes/exports antérieurs — jamais retouchés) ; procédure de séquestre.
  SAUVEGARDE.md : archives claires = locales ; **ne synchroniser QUE
  `backups/scellement/`** (aucune donnée nominative — le geste du lot D est PRÉCISÉ,
  pas annulé) ; toute copie hors poste = sauvegarde manuelle chiffrée ; « après une mise
  à l'abri : restaurer une ARCHIVE ». Notice de la vue Protection des données alignée.
  CARTE-CODE + CHANGELOG.

## 9. Ce que le lot NE fait PAS (résidu assumé, consigné au DPD)

1. Le champ `technicien` scellé des écritures figées (dont FORMATION) — l'empreinte
   l'exige. 2. Les signatures réelles scellées (nom + image) et leur modale. 3. Les PDF
   CERFA conservés. 4. Le journal d'audit historique (cibles nominatives d'avant E2).
5. `ajoute_par`/`nom_fichier` des PJ d'écritures figées (WORM). 6. Les sauvegardes et
   exports ANTÉRIEURS au geste (preuves gelées — politique de rétention documentée).
7. Le générateur CERFA (écran non quotidien, sorties scellées de toute façon).
8. L'export E1 ne rapproche plus les mouvements par nom après mise à l'abri (mention
   dans l'export).

## 10. Traçabilité de la conception

Design initial : fusion de deux architectures concurrentes (simplicité/réutilisation vs
menaces/prouvabilité), 17 divergences tranchées. Critique adversariale à 5 lentilles
(intégrité, cryptographie, RGPD, exploitation, parité/tests) : 5 bloquants, 17
importants, 10 mineurs — **tous intégrés** dans le présent plan. Bloquants fermés :
① sel/témoin absents de l'export JSON (→ §6, enveloppes autoportantes + `coffreConfig`),
② perte des scans par restauration d'instantané (→ §4a, archive exigée + contrôle au
démarrage), ③④⑤ variantes du ① trouvées indépendamment par 4 lentilles.
