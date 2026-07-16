# Plan « registre audit-proof » — cap rentrée septembre 2026

> Source : audit externe (ChatGPT) du 15/07/2026 sur le code source complet, repris et annoté
> (état actuel + point de gate) par l'équipe de développement. **C'EST LA feuille de route du
> chantier réglementaire.** Toute valeur ou règle réglementaire reste **gatée sur la validation de
> Franck et/ou de son référent F-Gas** (règle absolue du projet).

## L'objectif, en une phrase (à rendre techniquement vraie ET couverte par des tests)

> **Toute fiche officielle est contrôlée avant validation, signée par les bonnes personnes, figée
> avec son PDF original, chaînée aux écritures précédentes, sauvegardée hors du poste, et
> restituable avec toutes ses preuves.**

On ne promet PAS « impossible à falsifier » : aucun logiciel monoposte ne peut l'affirmer
honnêtement. On promet **démontrable**.

## Principe directeur

Ne plus ajouter de fonctionnalités visibles. Transformer le logiciel en **registre réglementaire
démontrable** : chaque information contrôlée, figée, restituable, accompagnée de sa preuve.
Il n'existe pas d'« homologation F-Gas » obligatoire du logiciel (l'application de l'État est
volontaire) ; mais lors d'un contrôle, il faut produire des fiches conformes, signées, conservées
5 ans, et démontrer leur intégrité (Code de l'environnement art. R.543-82/83 ; notice CERFA 15497*04).

---

## Les 6 conditions obligatoires avant septembre

### 1. Un moteur réglementaire UNIQUE (le fondement)
Aujourd'hui les règles sont **dupliquées** (`v8/js/documents/plaque-fgas.js`, `v8/js/cerfa/generateur.js`,
`server/api.js`). Créer **un seul module, côté serveur**, source de vérité pour :
famille réglementaire du fluide · composition (HFC/HFO/PFC/HCFC/HC) · PRP applicable **et sa source** ·
classe de sécurité (A1/A2L/A2/A3) · teqCO₂ · seuils et périodicités · obligation ou non de double
signature · règles applicables **selon la date** de l'intervention.
- **Plus de `famille.includes("HFO")`.** Chaque fluide = une **structure explicite**, ex. R-455A :
  `contientHFC:oui · contientHFO:oui · traitementCadre7:HFC · PRP:148 · sécurité:A2L`.
- **Charge réglementaire = charge TOTALE déclarée de l'équipement** (cumul des circuits), pas la
  quantité momentanément présente après une fuite/récupération.
- Batterie de tests **aux valeurs limites** : exactement sous / sur / au-dessus de chaque seuil ;
  HFC purs ; mélanges HFC/HFO ; HFO purs ; HCFC ; PFC ; CO₂/NH₃/HC (hors périmètre) ; détection
  permanente présente / absente / expirée ; équipements multi-circuits.
- **État actuel** : ❌ pas fait. Bugs connus reproduits par l'audit : R-455A (mélange HFO/HFC) seuillé
  à tort → contrôle annuel alors qu'il est < 5 tCO₂eq (la notice CERFA demande de traiter les
  mélanges HFC/HFO **comme des HFC**) ; périodicité calculée sur `chargeActuelleKg` au lieu de la
  charge totale déclarée.
- **Gate** : Franck (+ référent F-Gas) valide la **table réglementaire par fluide** avant tout code
  en dur.

### 2. Verrouiller le mode officiel CÔTÉ SERVEUR
Le serveur doit refuser toute création officielle si l'une des conditions manque : attestation de
capacité valide · aptitude du technicien valide et **correspondant au type d'intervention** ·
technicien actif · balance conforme à la date · détecteur conforme si requis · bouteille compatible
(fluide + destination) · contrôle des fluides inflammables · aucun écart matière non justifié ·
client/machine/fluide/quantités complets · signatures requises présentes · sauvegarde récente et
testée. **Contrôles à 3 moments** : passage en officiel, soumission, juste avant validation.
- **Le validateur DOIT venir de la session connectée** — l'API ne doit jamais accepter qu'un
  utilisateur déclare l'identité d'un autre validateur (le trou « qui déclaré ≠ prouvé »).
- Prévoir une **« simulation de validation »** listant tous les blocages avant de signer.
- **État actuel** : 🟡 première pierre posée (le serveur **refuse** désormais `mode:'OFFICIEL'` tant
  que le mode n'est pas prêt, commit `d597582`). Le blocage dur complet (appeler `peutPasserEnOfficiel`
  aux 3 moments + validateur de session) reste à faire — **dépend du moteur réglementaire (1)**.
- **Gate** : Franck valide la liste des conditions bloquantes.

### 3. Double signature RÉELLE
Séparer : opérateur/technicien · détenteur de l'équipement · éventuellement validateur interne.
Pour **chaque** signature conserver : nom+prénom (personne physique) · qualité · organisation ·
date+heure · **déclaration explicite** (« Je confirme l'exactitude des informations de cette
fiche ») · image de signature · identité de session · **SHA-256 du document signé** · version exacte
du document · poste utilisé (sans collecte excessive).
- **Le détenteur signe LUI-MÊME** quand la réglementation l'exige ; sa raison sociale n'est pas une
  signature.
- Parcours : Brouillon → contrôle auto → signature technicien → signature détenteur → génération du
  PDF final → SHA-256 → validation et verrouillage. **Toute modification après la 1ʳᵉ signature
  invalide les signatures et oblige à recommencer.** En officiel, une signature PNG illisible ne doit
  jamais être ignorée silencieusement.
- Évolution « entreprise » plus tard : horodatage qualifié / signature PAdES (eIDAS) — pas
  indispensable pour septembre.
- **État actuel** : ❌ seule la signature du technicien est capturée (nom du détenteur = raison
  sociale, date supposée = date d'intervention — défauts confirmés par l'audit).
- **Gate** : Franck valide le parcours et les mentions.

### 4. Sceller le PDF et TOUTES les données significatives
L'empreinte du mouvement devrait inclure : quantités et pesées · charge nominale et teqCO₂ · **PRP
figé** · numéro CERFA · technicien/détenteur/validateur · outils utilisés + statut figé · résultats
du contrôle · **hash des deux signatures** · **hash des pièces jointes** · **hash du PDF final**.
- **Conserver le PDF final tel qu'il a été signé** (une régénération après une évolution du logiciel
  pourrait différer). Chaque fiche : `FI-2026-0001.pdf` + `.sha256` + `-manifeste.json`.
- Une fiche validée n'est jamais modifiée : erreur → annulation motivée + contre-écriture numérotée +
  nouvelle fiche + lien visible entre les trois.
- **État actuel** : 🟡 l'empreinte existe (hash chaîné) mais **exclut** la signature, l'identité réelle
  de l'exécutant, le PRP figé, le n° CERFA ; le PDF final n'est pas conservé (régénéré à la demande).
- **Gate** : technique (mais change le hasseur → migration + recalcul ; à faire avec soin).

### 5. Scellement EXTÉRIEUR au poste
Une chaîne SHA-256 conservée uniquement dans la même base ne prouve pas qu'un administrateur du poste
n'a pas réécrit toute la base. Créer chaque jour un **manifeste** (dernière empreinte du registre +
du journal · nombre de fiches · intervalle de numéros · hash des PDF · version logiciel · version du
moteur réglementaire · date+heure), **copié automatiquement hors du poste** (espace réseau protégé du
lycée / stockage institutionnel versionné / coffre / envoi au DSI ou référent). But : un **témoin
daté** que le poste local ne peut pas réécrire silencieusement.
- **État actuel** : ❌ chaîne dans la base seulement.
- **Gate** : Franck + DSI du lycée (emplacement extérieur).

### 6. Sauvegardes RÉELLEMENT automatiques
Snapshot après chaque validation officielle · archive quotidienne · archive hebdo sur 2ᵉ support ·
**alerte bloquante si aucune sauvegarde récente** · chiffrement obligatoire pour toute copie qui
quitte le poste · vérification auto après création · **exercice réel de restauration avant
septembre** puis annuel · phrase de passe ≥ 14 caractères, dans le coffre du lycée, connue de deux
responsables · **BitLocker / chiffrement intégral du disque** (l'AES-256-GCM protège les sauvegardes,
pas la base active).
- **État actuel** : ✅ **FAIT côté logiciel (16/07, module `server/sauvegarde-auto.js`)** — archive
  automatique AU DÉMARRAGE si la dernière date de plus de 24 h (réglable 1-720 h), **vérifiée
  aussitôt** (testerSauvegarde) ; **snapshot après chaque écriture scellée** (validation,
  contre-écriture ; débouncé 10 min, jamais bloquant) ; échec journalisé (`SAUVEGARDE_ECHEC`) sans
  jamais gêner l'écriture ; rotation GFS et alerte d'ancienneté existantes ; réglages à l'écran
  Sauvegarde (actif par défaut). Le « 2ᵉ support » = le dossier de destination configurable
  (pointer un dossier synchronisé). Restent des GESTES de Franck : BitLocker (décision poste),
  exercice réel de restauration, phrase de passe au coffre du lycée.
- **Gate** : plus de gate logiciel — gestes humains ci-dessus seulement.

---

## Ce que doit produire le bouton « Dossier d'audit » (export annuel/période, auto)
Registre chronologique des mouvements · **toutes les fiches CERFA PDF originales** · inventaire des
équipements · registre des bouteilles · balance matière par fluide (état initial, achats, charges,
récupérations, cessions, retours, déchets) · **justification de chaque écart** · attestations de
capacité et d'aptitude · registre du personnel · certificats de balance et détecteur · BSFF +
justificatifs Trackdéchets · contrôles d'étanchéité et réparations · journal d'audit · **rapport de
vérification des chaînes** · manifeste SHA-256 · version du logiciel et des règles réglementaires.
→ **Un contrôleur doit comprendre le dossier sans ouvrir le logiciel.**
- **État actuel** : 🟡 export ZIP scellé + vérificateur autonome existent, mais le contenu ci-dessus
  n'est pas complet.

## Sécurité & RGPD à terminer avant septembre
Authentification obligatoire pour **toutes les lectures** · comptes individuels (aucun partagé) ·
verrouillage auto de l'écran · **contrôle binaire réel** des pièces jointes (magic bytes, pas le MIME
déclaré) · sauvegardes/documents accessibles seulement aux comptes Windows autorisés · **purge auto**
des données de formation selon la durée annoncée · **export individuel** des données d'un
technicien/élève · **notice RGPD affichée dans l'application** · journalisation des consultations et
exports sensibles · confirmation documentée de la révocation des anciennes clés Apps Script v7.
→ Le **DPD du lycée** relit la notice RGPD ; le **responsable F-Gas** valide les règles métier.

## Le plan temporel (proposé par l'audit)
1. **Maintenant** : gel des nouvelles fonctionnalités, correction des blocages.
2. **Ensuite** : tests réglementaires aux valeurs limites + tests d'attaque.
3. **Août** : essai complet en données fictives (signatures, sauvegarde, restauration).
4. **Fin août** : journée de simulation d'audit avec un professionnel/organisme extérieur.
5. **Septembre** : fonctionnement **en parallèle** 2 à 4 semaines avec la procédure actuelle.
6. **Après vérification** : bascule comme registre principal, en gardant un secours papier/PDF.
→ **Ne pas basculer le 1er septembre sans période parallèle.**

---

## Ordre d'attaque proposé (dépendances)
1. **Moteur réglementaire unique** (condition 1) — LE fondement : débloque le blocage dur (2), corrige
   les bugs (mélanges, charge totale), et fournit la table par fluide qui sert aussi à la feuille de
   paramétrage des gaz. **Commence par faire valider la table réglementaire par Franck.**
2. **Blocage dur officiel** (condition 2, complet) — s'appuie sur (1) + validateur de session.
3. **Double signature** (condition 3).
4. **Empreinte renforcée + PDF scellé conservé** (condition 4).
5. **Scellement externe** (condition 5) + **sauvegardes auto** (condition 6).
6. **Dossier d'audit enrichi** + sécurité/RGPD au fil de l'eau.

⚠️ Le mode Officiel reste **fermé** (le serveur refuse `OFFICIEL`) jusqu'à ce que 1→4 soient prêts et
testés — on ne rouvre l'officiel que quand une fiche officielle est réellement démontrable.
