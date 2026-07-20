# Constats de l'audit externe — suivi et plan de correction

**Date de l'audit :** 20 juillet 2026
**Auditeur :** relecture externe (IA tierce, ChatGPT), sur archive `inerweb-fluide-audit.zip`
**SHA-256 de l'archive auditée :** `DD66CFB8A407272AAC5BEC22B8B986C25C6501E1277C5E62C0CD8A28725EE61F`
**Rapport source complet :** `C:\Users\henni\OneDrive\Bureau\CLAUDE-ESPACE-TRAVAIL\AUDIT-INERWEB-FLUIDE-2026-07-20.md`
**État du dépôt au moment du constat :** commit `46a6121` (lot E complet), arbre propre.

## Cible retenue par Franck (20/07)

> **REGISTRE OFFICIEL UNIQUE** — inerWeb Fluide devient LE registre opposable, sans doublon.

C'est le barème **maximal** de l'audit. Conséquences :

- les **8 P0** de l'audit sont tous pertinents et bloquants ;
- une relecture finale par l'**organisme agréé** (attestation de capacité) et le **DPD** devient un passage obligé avant bascule ;
- deux points auparavant classés « décidés autrement » repassent à l'ordre du jour (voir Décisions transverses).

## Statut de vérification

Ce document est un **plan préliminaire** établi à partir du rapport d'audit + de l'historique du projet.
**Le code n'a pas été relu au moment de la rédaction** (choix : consigner d'abord).
Chaque item porte une colonne *Vérif* :

- ✅ **confirmé** — corroboré par nos notes de projet / décisions connues ;
- 🔶 **à confirmer** — plausible d'après le rapport, à vérifier dans le code avant correctif ;
- 💬 **décision** — arbitrage Franck attendu, pas un bug.

---

## Décisions transverses (à trancher avant d'ouvrir le chantier)

| # | Sujet | Vérif | Position |
|---|-------|-------|----------|
| T1 | **Re-fermer le mode Officiel** (`VERROU_LIVRAISON = true`) le temps des P0. Geste réversible, n'efface pas le chantier C5. | ✅ | **Recommandé.** Cohérent avec la cible « officiel unique ». |
| T2 | **R-455A : 148 → valeur exacte.** La décision « 148 DÉFINITIF » (16/07) valait pour l'*usage interne*. Cible = registre opposable → l'audit exige la valeur de référence (composition ≈ 145,53, arrondi usuel 146). | 💬 | **À re-trancher** : la cible a changé, l'argument « conservatoire » ne tient plus pour un registre opposable. |
| T3 | Prévoir dès maintenant le **créneau de relecture** organisme agréé + DPD (hors code, délai long). | 💬 | À caler au calendrier. |

---

## P0 — bloquants avant réouverture du mode Officiel

| # | Constat | Vérif | Mon avis | Geste de correction | Fichiers probables |
|---|---------|-------|----------|---------------------|--------------------|
| P0-1 | **Mode Officiel ouvert** (`VERROU_LIVRAISON=false`). | ✅ | Vrai (C5, 19/07). À refermer temporairement (T1). | Repasser à `true` en attendant P0-2→P0-8. | `server/*` (miroirs du verrou) |
| P0-2 | **`createControle` accepte un `mode` forgé** : un appel API authentifié peut créer un contrôle `OFFICIEL` en contournant blocages, signatures, WORM et PDF final. | ✅ | **Vraie faille probatoire**, la plus grave car elle troue le modèle WORM lui-même (≠ exigence réglementaire). Rejoint notre résidu connu (`createControle` acceptait un `mouvementId` arbitraire). Exploitation = compte valide requis, pas anonyme. | Forcer le contrôle autonome dans le même agrégat WORM qu'un mouvement : mêmes gardes de rôle, signatures, PDF final, contre-écriture. Refuser tout `mode=OFFICIEL` qui ne passe pas le parcours complet. | `server/api.js`, `server/signatures-mouvement.js`, `server/hash-mouvement.js`, `server/schema.sql` |
| P0-3 | **Fluide « réutilisable » rechargé sans recyclage/régénération prouvé** (contraire art. 8 F-Gas III). Le serveur n'exige même pas systématiquement la décision `REUTILISABLE`. | 🔶 | Vrai trou métier majeur pour un registre opposable. | Interdire côté serveur toute charge depuis un état ≠ `VIERGE`/`RECYCLE`/`REGENERE`. Supprimer la décision générique `REUTILISABLE` **ou** la transformer en workflow de recyclage prouvé. | `server/api.js`, `server/mapping.js`, `server/schema.sql`, `v8/js/data/contrat.js` |
| P0-4 | **Traçabilité du traitement du gaz insuffisante** (recyclé/régénéré sans installation, adresse, certificat, lot, provenance). | 🔶 | Vrai, corollaire de P0-3 : sans ces champs le registre n'est pas restituable au sens art. 7. | Ajouter champs structurés : type de traitement, date, lot, analyse/qualité, entreprise, installation, adresse, certificat, PJ, provenance de la récupération. | `server/schema.sql`, `server/mapping.js`, `v8/js/modales/*` |
| P0-5 | **Blocage officiel ne vérifie que « aptitude active »**, pas catégorie × opération × fluide × charge. + frontières `>= 3`/`>= 6 kg` au lieu de « inférieure à ». + ancienne catégorie II modélisée sans limite de charge. | 🔶 | Vrai. Les frontières 3/6 kg = **bug net et trivial** (comparateur). La matrice opposable = chantier plus lourd. | Brancher la matrice d'aptitude comme **blocage dur** : catégorie × opération × famille × charge × hermétique × date de régime. Corriger `>=` → `<`. Modéliser la limite <3 kg / <6 kg (hermétique étiqueté) de l'ancienne cat. II. | `server/blocage-officiel.js`, `v8/js/data/reglementation-fluides.js`, `server/api.js` |
| P0-6 | **Contrôle après réparation clôturable le jour même** sur équipement fixe (échéance calculée à +30 j seulement). | 🔶 | Vrai. Le texte impose : au plus tôt après **24 h de fonctionnement**, au plus tard **1 mois calendaire**, sauf équipements mobiles listés. | Corriger le cycle fuite : distinguer fixe/mobile, horodater et prouver les 24 h, borne 1 mois calendaire, exception mobile explicite. | `server/api.js`, `v8/js/data/contrat.js`, `server/schema.sql` |
| P0-7 | **Contrôle autonome créé en mode Formation par défaut**, sans parcours officiel signé/WORM. | 🔶 | Vrai — même racine que P0-2. | Créer un vrai contrôle autonome officiel : mêmes contrôles de droits, signatures, WORM, PDF final, contre-écriture que les mouvements. | `server/api.js`, `server/signatures-mouvement.js`, `server/pdf-final.js` |
| P0-8 | **Pseudo-bilan « déclaration ADEME » incomplet** ; `cessions_kg=0` ; **toute masse BSFF comptée comme détruite** (or BSFF = remise de déchet, pas procédé de traitement). | 🔶 | Vrai, double erreur de sens. Bloquant pour un registre opposable. | Remplacer par la déclaration complète du nouvel arrêté (11 rubriques par fluide, cf. §6 du rapport). Ne jamais assimiler BSFF à destruction. Retirer le libellé « déclaration ADEME » tant que non validé. | `server/api.js`, `v8/js/data/*` (bilan), `server/mapping.js` |
| P0-9 | **Révocation des clés Apps Script v7** (3 clés publiées jadis) non prouvée par l'archive. | 💬 | Vrai mais **hors code** : geste de déploiement. Critique tant que non clos. | Preuve datée : appel avec chaque ancienne clé → échec ; nouvelles clés en Script Properties ; ancien déploiement désactivé/redéployé. | `apps-script/` + console Google Apps Script |

---

## P1 — avant diffusion réelle large

| # | Constat | Vérif | Geste |
|---|---------|-------|-------|
| P1-1 | Fiche machine incapable de décrire : fixe/mobile + sous-type, hermétique **+ étiquette**, résidentiel, détection obligatoire + vérification du détecteur. | 🔶 | Étendre le modèle équipement ; bloquer la détection obligatoire ≥ 500 tCO₂e / ≥ 100 kg HFO ; suivre la vérif annuelle du détecteur. |
| P1-2 | Référentiel des fluides trop court (9 entrées) ; pas d'écran d'administration ; risque de repli PRP/famille pour un fluide hors table. | 🔶 | Table **versionnée** issue d'une source unique : composition, annexe, PRP réglementaire, classe de sécurité, dates d'effet, journal des révisions. Compléter (R-448A, R-449A, R-452A/B, R-454A/B/C, R-513A, R-1234ze, R-717…). Inclut la correction R-455A (T2). |
| P1-3 | Cessions, remise au distributeur, traitement final distinct non implémentés. | 🔶 | Workflows dédiés + colonnes de bilan correspondantes (lié à P0-8). |
| P1-4 | Notice RGPD, durées de conservation, paquet d'accès individuel, procédure de limitation incomplets. | 🔶/💬 | Voir volet RGPD ci-dessous. |
| P1-5 | **LAN en HTTP clair** (identifiants, cookies, signatures en clair ; cookie sans `Secure`). | 🔶 | Supprimer le mode LAN **ou** imposer HTTPS (certificat établissement, redirection HTTP→HTTPS, cookie `Secure`). |
| P1-6 | Poste et sauvegardes en clair ; base vive tolérée sous OneDrive (avertissement seulement). | 💬/🔶 | Imposer BitLocker ; **bloquer** le démarrage si la base vive est sous dossier synchronisé (sauf dérogation journalisée) ; chiffrer les copies hors site ; rétention des sauvegardes nominatives. |

---

## P2 — industrialisation

| # | Constat | Geste |
|---|---------|-------|
| P2-1 | `server/api.js` et `v8/js/data/demo-store.js` dupliquent des milliers de lignes de règles métier. | Extraire un **noyau de domaine partagé et versionné** : F-Gas, aptitude, cycle fuite, bilan, invariants de contenants, sérialisation canonique. |
| P2-2 | 85 tests mais pas de couverture, lint, analyse statique, tests de sécurité négatifs. | Ajouter mesure de couverture, lint/type-check, tests négatifs de sécurité. |
| P2-3 | scrypt `N=2^15` (OWASP min. équivalent `N=2^17`). | Versionner le format de hash + rehash progressif à la connexion. |
| P2-4 | Racine HTTP trop large (sert code historique, docs, `.env.example`, `.clasp.json`). | Servir uniquement un répertoire de distribution **allowlisté**, sans métadonnées de déploiement. |
| P2-5 | Docs incohérentes (§9) : README « pas encore », conditions « fermé », code ouvert ; `.env.example` propose `SUPABASE_*`/`MODE`/`SAUVEGARDE_*` non pilotés ; sécurité dit loopback alors que le LAN existe. | **Générer la doc de version depuis des constantes testées** ; supprimer les options non implémentées ; aligner README/SECURITE/RGPD/INSTALLATION. *Gain rapide, fort effet en audit.* |

---

## Volet RGPD (majoritairement hors code — Franck + DPD)

**Écrans/code à compléter :**

- Notice d'information **paramétrable** : identité **et coordonnées** du responsable, coordonnées DPD, destinataires/catégories, droit de réclamation CNIL, caractère obligatoire/facultatif + conséquence d'un refus, sources indirectes, coordonnées/garanties d'un éventuel hébergeur.
- **Retirer la promesse « Cloud UE / Supabase »** tant que l'architecture, le contrat de sous-traitance et les transferts ne sont pas maîtrisés (le serveur ne l'implémente pas).
- Export individuel : soit **paquet complet sécurisé** (inclure images de signature, scans d'attestation, événements de journal pertinents), soit procédure guidée. Requalifier « portabilité » → **droit d'accès** (art. 20 vs mission d'intérêt public).
- Interface d'effacement : distinguer clairement désactivation / limitation / archivage / pseudonymisation / effacement / anonymisation irréversible. La mise au coffre ≠ effacement.
- **Durées de conservation** : « Formation conservé sans limite » n'est pas une obligation légale. Le scellement est un choix d'architecture ; la pseudonymisation réversible reste une donnée personnelle. Définir avec le DPD : base active / archivage intermédiaire à accès restreint / durée max / sort final par catégorie. Minimum **5 ans** pour les fiches réglementaires ; toute durée supérieure doit être fondée et documentée.

**Livrables organisationnels (hors logiciel) :** inscription au registre des traitements · validation DPD (+ AIPD si nécessaire) · note d'information personnels/élèves/responsables légaux · procédure d'exercice des droits sous 1 mois · politique d'habilitation/départ/revue annuelle · procédure de violation de données · politique sauvegarde/restauration/rétention/destruction · accords de sous-traitance/hébergement.

---

## Tests d'acceptation à ajouter (repris §11 du rapport)

- catégorie E/IV + charge → refus officiel ; catégorie D/III + ≠ récupération → refus ;
- ancienne II / nouvelle A2 : 2,999 kg accepté, 3,000 refusé ; hermétique étiqueté 5,999 accepté, 6,000 refusé ;
- ancienne aptitude sans remise à niveau au 12/03/2029 → refus ; périodique 7 ans dépassée → suspension ;
- bouteille `RECUPERE`/`DOUTEUX`/`MELANGE` comme source de charge → refus **serveur** ;
- `RECYCLE`/`REGENERE` sans provenance ou certificat requis → refus ;
- PRP ≥ 2 500 recyclé → vérifier l'entreprise ayant récupéré + date limite de dérogation ;
- équipement fixe : contrôle le jour même / avant 24 h → refusé ; après 24 h → accepté ; après 1 mois → refusé ;
- équipement mobile éligible : contrôle immédiat accepté avec motif de périmètre ;
- contrôle officiel autonome : aptitude + signatures + PDF final + WORM obligatoires ;
- hermétique non étiqueté : exemption refusée ; détection obligatoire absente → blocage ; détecteur non vérifié depuis 12 mois → alerte/blocage ;
- BSFF sans attestation de traitement → ne pas compter en destruction ;
- déclaration annuelle : chaque rubrique réconciliée avec stock initial/final ;
- export d'accès : inclure ou lister explicitement signatures, scans, événements personnels ;
- démarrage LAN sans HTTPS → refus ; démarrage sous OneDrive → refus explicite ou dérogation journalisée.

---

## Ordre de bataille proposé

Séquencement pour la cible « registre officiel unique » (à valider avant de coder) :

1. **T1** re-fermer le mode Officiel (immédiat, 1 ligne, réversible).
2. **Chantier « intégrité probatoire »** : P0-2 + P0-7 (contrôle autonome dans l'agrégat WORM). Racine commune, à traiter ensemble.
3. **Chantier « cycle du fluide »** : P0-3 + P0-4 (récupéré → recyclé/régénéré prouvé + traçabilité traitement).
4. **Chantier « aptitude opposable »** : P0-5 (frontières 3/6 kg d'abord — rapide —, puis matrice dure).
5. **Chantier « cycle fuite »** : P0-6.
6. **Chantier « déclaration réglementaire »** : P0-8 (11 rubriques, cessions, BSFF ≠ destruction).
7. **P0-9** (hors code, en parallèle : preuve de révocation clés v7).
8. Puis **P1** (modèle équipement, référentiel fluides + R-455A, HTTPS/LAN, chiffrement, RGPD).
9. Puis **P2** (noyau de domaine partagé, outillage, scrypt, distribution allowlistée, docs générées).
10. **Relecture organisme agréé + DPD** avant bascule (T3).

**Règle projet rappelée :** ne jamais toucher au `data/` réel ; toute vérification sur port + base jetables ; « une faille se prouve en la tirant » ; revue adversariale avant chaque commit.

---

## Points où l'audit nous crédite / nuance

- Socle probatoire jugé **« inhabituellement sérieux »** : contre-écritures, chaîne SHA-256, journal append-only, doubles signatures réelles, PDF final conservé/haché, scellement externe, sauvegardes vérifiées, séparation Formation/Officiel. **85/85 tests verts.**
- Sécurité : aucun secret de production en clair ; loopback par défaut ; garde Host/Origin ; sessions 8 h + jetons hachés ; cookies HttpOnly/SameSite ; scrypt à sel unique ; verrou après 5 échecs ; SQL paramétré ; CSP stricte ; transactions tout-ou-rien ; triggers WORM.
- Le risque, dit l'audit, **ne vient pas du hash, des signatures ou de SQLite**, mais de la **traduction incomplète de quelques règles métier en blocages serveur**.
- R-455A = 148 reconnu **« conservatoire, change rarement une décision »** (cf. T2 : ne redevient exigible que parce que la cible est le registre opposable).
