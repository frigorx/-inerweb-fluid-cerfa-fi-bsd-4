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
comptes, qui saisit les données et qui les héberge — **sur son propre poste : le
programme fonctionne entièrement en local et ne transmet aucune donnée à un
service distant** (l'hébergement mutualisé annoncé dans les versions antérieures
de ce document n'est pas implémenté ; mention retirée le 23/07, P2-5). Chaque
établissement doit :

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

Le logiciel n'a pas vocation à recevoir des données sensibles au sens de l'article 9
du RGPD (santé, opinions…). Ne pas en saisir dans les champs libres ou les pièces
jointes. L'établissement limite les données au nécessaire pour la finalité déclarée.

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
| Fiches d'intervention et registres réglementaires réels concernés | **5 ans minimum** à compter de leur établissement | Obligation F-Gas (Code de l'environnement) |
| Registre du personnel, attestations d'aptitude | Durée d'activité de la personne + durée de conservation du registre auquel elles se rattachent | Justification des interventions passées |
| Comptes utilisateurs | **Désactivés** dès le départ de la personne (l'historique reste attribué), puis **purgés** lorsque plus aucun enregistrement conservé ne s'y réfère | Minimisation |
| Journal d'audit | Conservé avec le registre (même durée), non modifiable depuis l'application | Intégrité et valeur probante du registre |
| Identité de la fiche d'un élève parti | Durée à formaliser ; repère de revue : fin de l'année scolaire suivante. La mise au coffre protège sans effacer | La pseudonymisation réversible reste soumise au RGPD ; prévoir une issue à la conservation |
| Écritures d'intervention du mode formation | Durée limitée à définir par l'établissement ; repère de revue : fin de l'année scolaire suivante. Pas de purge automatique actuelle des écritures scellées. | La chaîne d'intégrité ne justifie pas une conservation illimitée ; le coffre ne constitue pas un effacement |

> ⚠️ Les écritures validées du registre officiel ne sont ni modifiables ni effaçables
> (contre-écritures uniquement, cf. `docs/SPEC-V8.md`) : c'est une exigence d'intégrité
> technique du logiciel. Elle ne dispense pas d'organiser les durées de conservation et le sort final des données avec le DPD et, le cas échéant, le service des archives.


### Limite technique et action requise — revue du 10 septembre 2026

Le bouton **Examiner et nettoyer les anciens brouillons** permet au référent ou à
l'administrateur, sur le poste local, de choisir une date et des brouillons de formation
à supprimer. Aucune ligne n'est précochée. L'aperçu compte les pièces et signatures
associées et distingue les traces protégées. La confirmation exige un motif et un nombre.
Le serveur refuse un aperçu périmé et supprime le lot en transaction ; les fichiers
sont retirés après validation de cette transaction, avec reprise au démarrage si nécessaire.
Le résultat indique les fichiers encore en attente. Cette fonction ne constitue pas un
effacement global : journaux, coffre, fiches personnelles, sauvegardes et exports restent
à examiner. Les sauvegardes gérées sont inventoriées sans être détruites ; une restauration
peut réintroduire les données. Aucun effacement forensique du support n'est promis.
Voir [le mode d'emploi et les limites](docs/NETTOYAGE-FORMATION-2026-09-10.md).

Les écritures de formation scellées **ne sont pas purgées automatiquement**. Des noms,
liens vers le personnel, signatures et pièces jointes peuvent y subsister, y compris
après mise au coffre. La pseudonymisation réversible reste un traitement de données
personnelles. Le logiciel ne prétend donc pas résoudre leur effacement.

L'écran Protection des données fournit un repérage des écritures de formation à
revoir après la fin de l'année scolaire suivante. Ce délai est un **repère de revue**,
pas une durée légale universelle. Une date manquante n'est jamais présumée récente.
La liste des candidats au coffre se fonde sur le statut désactivé de l'élève : aucune
date de départ n'est enregistrée et cette liste ne prouve pas une échéance dépassée.

Avant de saisir de nouvelles données nominatives de formation, l'établissement doit
formaliser avec son DPD une durée, les accès, le sort final et une procédure pour les
traces déjà scellées. Privilégier les données fictives pour les exercices. Une copie
du registre réel dans le mode Exercice **n'est pas anonyme** ; elle contient les
informations exportées et peut persister dans le navigateur. La suppression du bac
n'efface ni les exports téléchargés ni les archives du poste.

Sources consultées : [CNIL, durées de conservation](https://www.cnil.fr/fr/cnil-direct/question/dois-je-fixer-une-duree-de-conservation-des-donnees-dans-mon-fichier),
[CNIL, information des personnes](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence).

## 6. Hébergement et localisation selon le mode

| Mode | Localisation des données |
|---|---|
| **Mode Local Lycée** | Uniquement sur le poste de l'établissement (base SQLite et documents dans le dossier de l'application). Rien ne sort de l'établissement. |
| **Hébergement distant** | **Aucun.** Le programme ne transmet de données à aucun service extérieur : il n'y a ni sous-traitant d'hébergement, ni transfert — hors UE comme dans l'UE. Un « mode Cloud » figurait dans les versions antérieures de ce document ; il n'est pas implémenté, la mention est retirée (23/07). |
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
  qui ne constitue pas un effacement et n'autorise aucune conservation illimitée.

## 7 bis. Le coffre des identités (minimisation réversible)

Depuis juillet 2026, l'application porte un **coffre des identités** : l'identité
d'un élève parti (nom, prénom, courriel, attestation d'aptitude, scans, image de
signature, identifiant de connexion) est **chiffrée** (AES-256-GCM, dérivation
scrypt renforcée) dans une enveloppe protégée par un **code** que seul le
responsable connaît. La fiche n'affiche plus qu'un **pseudonyme** (« Élève
2026-01 ») — écrans, exports et dossiers d'audit suivent. Le code **rouvre**
l'identité en cas de besoin légal : consultation ponctuelle ou restauration
complète, **motif obligatoire**, chaque ouverture **journalisée de façon
inaltérable au sein de l'application** (une trace consultable par le DPD,
sans valeur probante forte — voir `LIMITE-DE-RESPONSABILITE.md` § 2 b).

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
établissement, journal d'audit non modifiable depuis l'application, sauvegardes chiffrées, absence de secret dans
le dépôt public…) sont détaillées dans **`SECURITE.md`**, qui fait partie intégrante de
ce dossier de conformité.

## 9. Cas particulier des élèves

- Les élèves n'utilisent que le **mode formation** : les CERFA de formation sont marqués comme non officiels, et toute écriture est validée par un enseignant.
- Les données d'élèves enregistrées sont **minimales** : nom, prénom, compte applicatif,
  et le cas échéant n° d'attestation d'aptitude préparée en formation. Aucune note,
  aucune évaluation, aucune donnée de vie scolaire.
- **L'information des personnes concernées est obligatoire** (articles 12 à 14 du RGPD). L'établissement remet une notice claire, accessible aux élèves, et organise l'information des responsables légaux selon le cadre applicable. Cette information doit préciser le responsable, les finalités, bases légales, destinataires, durées, droits et contact du DPD. Elle ne se confond pas avec une demande de consentement.

## 10. Documents liés

- [Séances temporaires et effacement du bac](docs/SEANCES-TEMPORAIRES-2026-09-10.md) :
  alternative de formation sur données fictives, sans persistance applicative des
  données et pièces. Une importation ou une saisie volontaire peut toutefois contenir
  des données personnelles : utiliser des identités fictives. Les exports et impressions
  restent hors de la mémoire de la séance. La fin de l'ancien mode exercice attend
  désormais la confirmation de suppression de sa base de pièces jointes IndexedDB.

- `docs/SPEC-V8.md` — spécification (modèle de données, modes, règles réglementaires) ;
- `SECURITE.md` — mesures de sécurité ;
- `SAUVEGARDE.md` — sauvegardes et restauration.
