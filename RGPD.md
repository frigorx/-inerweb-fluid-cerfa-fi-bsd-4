# RGPD — Registre de conformité d'inerWeb Fluide v8

Ce document décrit le traitement de données personnelles réalisé par le logiciel
**inerWeb Fluide v8** (traçabilité des fluides frigorigènes en lycée professionnel).
Il aide chaque établissement utilisateur à alimenter son propre registre des activités
de traitement (article 30 du RGPD) et à informer les personnes concernées.

## 1. Responsable de traitement

**inerWeb Fluide est un outil, pas un service** : il ne collecte rien pour le compte de son
auteur et ne transmet aucune donnée à des tiers.

Le **responsable de traitement est l'établissement utilisateur** (le lycée, ou l'entreprise
en usage professionnel) : c'est lui qui décide des finalités et des moyens, qui crée les
comptes, qui saisit les données et qui les héberge (sur son poste en Mode Local, dans son
projet Supabase en Mode Cloud). Chaque établissement doit :

- inscrire ce traitement à son registre des activités de traitement ;
- en informer son délégué à la protection des données (DPD, généralement mutualisé au
  niveau académique pour les lycées publics).

## 2. Données traitées

| Catégorie | Données | Personnes concernées |
|---|---|---|
| Registre du personnel | Nom, prénom, adresse électronique, type de personne (salarié, enseignant, élève, sous-traitant, intervenant extérieur), rôle applicatif, n° d'attestation d'aptitude, organisme délivreur, dates d'obtention et d'échéance, scan de l'attestation, signature (image), statut actif/inactif | Enseignants, techniciens, élèves, intervenants |
| Clients / détenteurs d'équipements | Raison sociale, SIRET, adresse, coordonnées de contact | Détenteurs (personnes morales ; données de contact éventuellement personnelles) |
| Interventions et registre | Fiches d'intervention (CERFA), mouvements de fluides, contrôles d'étanchéité, avec identité du technicien et du validateur | Personnel intervenant |
| Comptes et journal | Identifiants de connexion (mot de passe haché, jamais en clair), journal d'audit (qui, quoi, quand, poste) | Utilisateurs de l'application |

**Aucune donnée sensible** au sens de l'article 9 du RGPD (santé, opinions, biométrie…)
n'est traitée. Les données sont limitées à ce qu'exige la réglementation F-Gas et au
fonctionnement de l'application (principe de minimisation).

## 3. Finalités

1. **Tenue du registre réglementaire de traçabilité des fluides frigorigènes** : fiches
   d'intervention, registre des équipements, bilan matière, registre du personnel autorisé
   à intervenir — obligations issues du Code de l'environnement (articles R. 543-76 à
   R. 543-82) et de la réglementation européenne F-Gas.
2. **Formation professionnelle** : apprentissage de la traçabilité par les élèves des
   filières froid et climatisation, en mode formation strictement séparé du mode officiel.

## 4. Base légale

- **Obligation légale** (article 6.1.c du RGPD) pour la tenue du registre de traçabilité
  et du registre du personnel : ces enregistrements sont imposés par le Code de
  l'environnement et la réglementation F-Gas.
- **Mission d'intérêt public** (article 6.1.e du RGPD) pour le volet formation, au titre
  de la mission d'enseignement de l'établissement.

## 5. Durées de conservation

| Données | Durée | Fondement |
|---|---|---|
| Fiches d'intervention (CERFA) et registre des mouvements | **5 ans minimum** à compter de leur établissement | Obligation F-Gas (Code de l'environnement) |
| Registre du personnel, attestations d'aptitude | Durée d'activité de la personne + durée de conservation du registre auquel elles se rattachent | Justification des interventions passées |
| Comptes utilisateurs | **Désactivés** dès le départ de la personne (l'historique reste attribué), puis **purgés** lorsque plus aucun enregistrement conservé ne s'y réfère | Minimisation |
| Journal d'audit | Conservé avec le registre (même durée), non modifiable depuis l'application | Intégrité et valeur probante du registre |
| Identité de la fiche d'un élève parti | Année scolaire en cours + l'année suivante au plus, puis **mise à l'abri chiffrée** (pseudonymisation réversible — voir §7 bis) | Pas d'obligation réglementaire ; minimisation sans destruction de la capacité de réponse à une demande légale |
| Écritures d'intervention du mode formation | Conservées **sans limite** avec le registre (elles partagent sa chaîne d'intégrité), sous **pseudonyme à l'affichage** | Intégrité du registre : une écriture scellée n'est ni modifiable ni effaçable |

> ⚠️ Les écritures validées du registre officiel ne sont ni modifiables ni effaçables
> (contre-écritures uniquement, cf. `docs/SPEC-V8.md`) : c'est une exigence d'intégrité
> du registre réglementaire, compatible avec le RGPD au titre de l'obligation légale.

## 6. Hébergement et localisation selon le mode

| Mode | Localisation des données |
|---|---|
| **Mode Local Lycée** | Uniquement sur le poste de l'établissement (base SQLite et documents dans le dossier de l'application). Rien ne sort de l'établissement. |
| **Mode Cloud Lycée** | Projet Supabase créé par l'établissement dans une **région de l'Union européenne** (Francfort ou Paris — voir `INSTALLATION_CLOUD.md`). **Aucun transfert hors UE.** Supabase agit comme sous-traitant d'hébergement de l'établissement. |
| **Mode Démo** | **Données fictives uniquement**, stockées dans le navigateur. Aucune donnée réelle ne doit y être saisie ; le filigrane « DÉMO / FORMATION » le rappelle en permanence. |

## 7. Droits des personnes

Les personnes concernées (personnel, élèves, contacts des détenteurs) disposent des droits
d'accès, de rectification, d'effacement (dans les limites des obligations légales de
conservation), de limitation et d'opposition. Elles les exercent auprès de l'établissement
(chef d'établissement ou DPD académique).

Dans l'application, l'administrateur ou le référent dispose des outils nécessaires :

- **Accès / portabilité** : export des données d'une personne (fiche du registre du
  personnel, liste de ses interventions) via les fonctions d'export ;
- **Rectification** : modification de la fiche personnelle (nom, adresse électronique,
  attestations…) depuis l'écran Personnel ; les écritures validées du registre sont
  corrigées par contre-écriture ;
- **Effacement / limitation** : désactivation du compte (la personne n'apparaît plus dans
  les écrans courants), puis **mise à l'abri chiffrée de l'identité** lorsque la durée
  annoncée est échue (coffre des identités, §7 bis) — pseudonymisation réversible,
  compatible avec les obligations légales de conservation du registre.

## 7 bis. Le coffre des identités (minimisation réversible)

Depuis juillet 2026, l'application porte un **coffre des identités** : l'identité
d'un élève parti (nom, prénom, courriel, attestation d'aptitude, scans, image de
signature, identifiant de connexion) est **chiffrée** (AES-256-GCM, dérivation
scrypt renforcée) dans une enveloppe protégée par un **code** que seul le
responsable connaît. La fiche n'affiche plus qu'un **pseudonyme** (« Élève
2026-01 ») — écrans, exports et dossiers d'audit suivent. Le code **rouvre**
l'identité en cas de besoin légal : consultation ponctuelle ou restauration
complète, **motif obligatoire**, chaque ouverture **journalisée de façon
inaltérable** (la preuve d'usage opposable au DPD).

- **Le geste est manuel** (bouton « Mettre à l'abri », fiches échues
  pré-cochées, rappel automatique non bloquant) : un automatisme exigerait de
  stocker le code, ce qui détruirait la protection.
- **Code perdu = contenu du coffre définitivement illisible** (le registre,
  lui, continue de fonctionner sous pseudonymes). Parade : le code est noté
  sur papier, sous pli scellé, au coffre de l'établissement (imprimer
  directement — ne jamais enregistrer le code dans un fichier).
- **Aveu de périmètre** : quiconque détient le code peut techniquement
  déchiffrer une copie de la base hors application ; la traçabilité (motif +
  journal) ne vaut que pour les accès par l'application. Les gestes du coffre
  sont refusés en accès réseau : le code ne traverse jamais le réseau du
  lycée.

**Résidus assumés** (ce que le coffre NE couvre PAS, conservé pour
l'intégrité du registre et consigné ici en toute transparence) :

1. le nom du technicien **scellé** dans les écritures validées (formation
   comprise) — il entre dans l'empreinte chaînée du registre ;
2. les **signatures réelles scellées** (nom + image) et leur affichage dans
   la modale Signatures d'un mouvement consulté ;
3. les **PDF CERFA conservés** (documents figés à la validation officielle) ;
4. le **journal d'audit** antérieur à la mise à l'abri (événements historiques
   pouvant citer un nom) — append-only, sa lecture est réservée aux valideurs ;
5. les métadonnées des pièces jointes d'écritures figées (« ajouté par »,
   nom de fichier), verrouillées par le registre ;
6. les **sauvegardes et exports antérieurs** au geste (preuves gelées, jamais
   retouchées) — politique de rétention : voir `SAUVEGARDE.md` ;
7. les numéros d'attestation des **habilitations historiques** (rattachées à
   la fiche par identifiant), conservés pour prouver l'aptitude de
   l'intervenant lors d'un audit ;
8. l'export RGPD individuel d'une personne à l'abri est **substitué**
   (pseudonyme) et cesse de rapprocher les écritures par nom.

## 8. Mesures de sécurité

Les mesures techniques et organisationnelles (mots de passe hachés, cloisonnement par
établissement, journal d'audit inviolable, sauvegardes chiffrées, absence de secret dans
le dépôt public…) sont détaillées dans **`SECURITE.md`**, qui fait partie intégrante de
ce dossier de conformité.

## 9. Cas particulier des élèves

- Les élèves n'utilisent que le **mode formation** : ils ne peuvent jamais produire de
  document d'apparence officielle, et toute écriture est validée par un enseignant.
- Les données d'élèves enregistrées sont **minimales** : nom, prénom, compte applicatif,
  et le cas échéant n° d'attestation d'aptitude préparée en formation. Aucune note,
  aucune évaluation, aucune donnée de vie scolaire.
- **L'information des familles est recommandée** (mention dans le carnet de liaison ou le
  règlement de l'atelier) : l'usage du logiciel s'inscrit dans les activités pédagogiques
  normales de la formation, mais une information claire des élèves et de leurs responsables
  légaux relève des bonnes pratiques et des recommandations de la CNIL en milieu scolaire.

## 10. Documents liés

- `docs/SPEC-V8.md` — spécification (modèle de données, modes, règles réglementaires) ;
- `SECURITE.md` — mesures de sécurité ;
- `SAUVEGARDE.md` — sauvegardes et restauration ;
- `INSTALLATION_CLOUD.md` — mise en place du Mode Cloud (hébergement UE).
