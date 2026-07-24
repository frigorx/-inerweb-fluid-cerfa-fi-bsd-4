// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — Dispatcher de l'API DataStore (Mode Local, V9-E3).
 * =================================================================
 * SEUL point serveur qui connaît à la fois SQL (via db.js), la
 * correspondance front↔SQL (mapping.js) et le CONTRAT. Une fonction
 * par méthode du contrat ; `appeler(methode, params, contexte)`
 * orchestre : garde de rôle (403 AVANT tout effet), puis handler.
 *
 * Vérité unique = v8/js/data/test-contrat.mjs : la sémantique
 * (formes de retour, tris, messages français, signes) reprend celle
 * du DemoStore méthode par méthode. On ne réinvente rien.
 *
 * Aide `muter(fn)` : ouvre la transaction ambiante (db.transaction est
 * ré-entrant, donc journaliser() y reste inclus), exécute l'effet, et
 * ne journalise JAMAIS hors de cette transaction.
 *
 * VAGUE 1 (ossature) : dispatcher, enveloppe, ROLES_MUTATION, METHODES.
 * VAGUE 2 (lectures + amorçage) : les 12 lectures d'état + amorçage de
 * l'établissement singleton. Les mutations arrivent aux vagues suivantes
 * (elles lèvent « non implémentée » d'ici là, ce qui arrête proprement
 * le test-contrat local à la section 3, comme prévu).
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const db = require('./db.js');
const mapping = require('./mapping.js');
const { hasherMouvement, empreinteListeTriee, chaineCanoniqueSignature } =
  require('./hash-mouvement.js');
const { FICHE_REGLEMENTAIRE_FLUIDES, corrigerPrpFgas3 } = require('./migrations.js');
const sauvegardeAuto = require('./sauvegarde-auto.js');
// Scellement externe simple (lot D) : témoin quotidien dans le dossier de
// sauvegarde, rafraîchi après chaque écriture scellée (jamais bloquant).
const scellementExterne = require('./scellement-externe.js');
// Blocage dur du mode OFFICIEL (lot B, condition 2 du plan audit-proof) :
// moteur PUR de la liste docs/CONDITIONS-BLOCANTES-OFFICIEL.md (miroir du
// module ESM du front, parité prouvée par test-blocage-officiel.mjs).
const { evaluerBlocagesOfficiel, messageRefusOfficiel, VERROU_LIVRAISON,
  MSG_CONTROLE_DIRECT_OFFICIEL } = require('./blocage-officiel.js');
// Moteur d'aptitude F-Gas (P0-5, aptitude opposable) : verdict de la matrice
// catégorie × opération × fluide × charge pour le fait `aptitude` du cadre
// Officiel (miroir du MOTEUR de v8/js/data/habilitations.js, parité prouvée
// par test-droit-intervention.mjs).
const { verifierDroitIntervention, habilitationReconnue,
  jetonsMentionsActives, FIN_DELIVRANCE_2008,
  DATE_BUTOIR_REMISE_NIVEAU_2008, DUREE_CYCLE_FORMATION_ANS,
  plusAnnees } = require('./droit-intervention.js');
// Déclaration annuelle 11 rubriques (P0-8, miroir littéral du module ESM du
// front, parité prouvée par test-declaration-annuelle.mjs).
const { calculerDeclarationAnnuelle } = require('./declaration-annuelle.js');
// P1-1 — modèle d'équipement : miroir littéral de v8/js/data/equipement.js
// (détection effective, détection obligatoire, hermétique opposable, mobile
// listé, garde de saisie). Parité prouvée par test-equipement.mjs.
const equipement = require('./equipement.js');
// Signatures réelles (lot C, brique C1) : déclarations figées + critères
// d'illisibilité (miroir du module ESM du front, parité prouvée par
// test-signatures-mouvement.mjs).
const { ROLES_SIGNATURE, declarationSignature, verifierImageSignature,
  MSG_TRACE_ABSENT, MSG_PAS_PNG } = require('./signatures-mouvement.js');
// PDF final conservé à la validation OFFICIELLE (lot C, brique C3) :
// contrôles et messages canoniques (miroir du module ESM du front, parité
// prouvée par test-signatures-mouvement.mjs).
const { verifierOctetsPdfFinal, nomFichierPdfFinal, CATEGORIE_PDF_FINAL,
  MSG_PDF_FINAL_MANQUANT, MSG_PDF_FINAL_HORS_OFFICIEL,
  MSG_PDF_FINAL_TRANSFERT, pdfFinalAttendu } =
  require('./pdf-final.js');
// Export RGPD des données d'une personne (lot E ①) : assemblage PUR (miroir
// du module ESM du front, parité prouvée par test-export-personne.mjs).
const { assemblerExportPersonne } = require('./export-personne.js');
// Coffre des identités (lot E2) : règles pures (miroir du module ESM du
// front, parité prouvée par test-coffre-identites.mjs) + primitives crypto
// (enveloppes de champ autoportantes) + archive de sécurité avant le geste.
const coffre = require('./coffre-identites.js');
const chiffrementCoffre = require('./chiffrement.js');
const parametres = require('./parametres.js');
const sauvegardeCoffre = require('./sauvegarde.js');
const restaurationCoffre = require('./restauration.js');

// ------------------------------------------------------------
// Identité de l'établissement singleton (le front le traite sans id).
// ------------------------------------------------------------
const ID_ETABLISSEMENT = 'ETB-LOCAL';

/** Tenir alignée avec serveur.js:VERSION (qui ne peut pas être requis). */
const VERSION_LOGICIEL = '8.0.0-dev';

// ------------------------------------------------------------
// Constantes métier (reprises EXACTES du DemoStore).
// ------------------------------------------------------------

/** Types de personnes du registre du personnel (SPEC §5.2). */
const TYPES_PERSONNE = ['ENSEIGNANT', 'ELEVE', 'SALARIE', 'SOUS_TRAITANT',
  'INTERVENANT_EXT'];

/** Activités réglementées (attestation de capacité et d'aptitude). */
const ACTIVITES_REGLEMENTEES = ['MISE_EN_SERVICE', 'MAINTENANCE', 'CONTROLE',
  'RECUPERATION', 'DEMANTELEMENT'];

/** Catégories d'attestation (grilles 2008 et 2025). */
const CATEGORIES_ATTESTATION = ['I', 'II', 'III', 'IV'];

// Habilitations F-Gas (chantier B2) — MIROIR EXACT du module pur ESM
// v8/js/data/habilitations.js (le serveur est CommonJS : littéraux dupliqués,
// parité de SORTIE prouvée par les tests, comme getAlertes/sentinelle).
const REGIMES = ['2008', '2025'];
const CATEGORIES_2008 = ['I', 'II', 'III', 'IV'];
const CATEGORIES_2025 = ['A1', 'A2', 'B', 'C', 'D', 'E', 'V'];
const FLUIDES_MENTION = ['CO2', 'NH3', 'HC'];

/** IM-4 : tolérance de charge résiduelle pour démanteler (± 0,05 kg). */
const TOLERANCE_CHARGE_RESIDUELLE_KG = 0.05;

/** Types de mouvements admis par le registre (SPEC §7.1 + P7-a : contrôles). */
const TYPES_MOUVEMENT = ['CHARGE_APPOINT', 'MISE_EN_SERVICE',
  'RECUPERATION_MAINTENANCE', 'RECUPERATION_DEMANTELEMENT', 'TRANSFERT',
  'CONTROLE_PERIODIQUE', 'CONTROLE_NON_PERIODIQUE'];
// P0-8 — miroirs des grilles du contrat (issue BSFF, destinataires cession).
const ISSUES_TRAITEMENT_BSFF =
  ['RECYCLAGE', 'REGENERATION', 'DESTRUCTION', 'AUTRE'];
const DESTINATAIRES_CESSION =
  ['OPERATEUR_ATTESTE', 'DISTRIBUTEUR', 'PRODUCTEUR'];

/** Rôles autorisés à VALIDER une écriture (jamais un élève). */
const ROLES_VALIDEURS = ['REFERENT', 'ENSEIGNANT', 'ADMIN'];

/** Décisions possibles sur un fluide récupéré (SPEC §5.8). */
const DECISIONS_FLUIDE = ['REUTILISABLE', 'A_ANALYSER', 'DECHET'];

/** CM-3 — Partition état↔type de la bouteille. Le fluide ACHETÉ (vierge,
 *  recyclé ou régénéré certifié) est porté par une bouteille NEUVE ; le
 *  fluide des machines (récupéré, mélangé, déchet, douteux) par une
 *  bouteille de RÉCUPÉRATION. AUCUNE requalification interne : une bouteille
 *  de récupération ne « devient » jamais recyclée ou régénérée — le régénéré
 *  s’ACHÈTE certifié fournisseur. Généralise la garde MÉLANGE (R2). */
const ETATS_FLUIDE_ACHAT = ['VIERGE', 'RECYCLE', 'REGENERE'];
const ETATS_FLUIDE_RECUPERATION = ['RECUPERE', 'MELANGE', 'DECHET', 'DOUTEUX'];

function verifierCoherenceEtatBouteille(type, etatFluide) {
  // Garde MÉLANGE historique (R2) — message spécifique conservé.
  if (etatFluide === 'MELANGE' && type !== 'RECUPERATION') {
    throw new Error(
      'L’état MÉLANGE est réservé aux bouteilles de type RÉCUPÉRATION.');
  }
  if (type === 'NEUVE' && !ETATS_FLUIDE_ACHAT.includes(etatFluide)) {
    throw new Error(
      'Une bouteille NEUVE porte du fluide acheté : état VIERGE, RECYCLÉ ou '
      + 'RÉGÉNÉRÉ uniquement.');
  }
  if (type === 'RECUPERATION'
      && !ETATS_FLUIDE_RECUPERATION.includes(etatFluide)) {
    throw new Error(
      'Une bouteille de RÉCUPÉRATION porte du fluide récupéré (RÉCUPÉRÉ, '
      + 'MÉLANGE, DÉCHET ou DOUTEUX). Le fluide RECYCLÉ ou RÉGÉNÉRÉ s’ACHÈTE '
      + 'certifié fournisseur (bouteille NEUVE) : pas de requalification '
      + 'interne.');
  }
}

/** Types d'outillage réglementaire (SPEC §5.3). */
const TYPES_OUTIL = ['STATION_RECUPERATION', 'STATION_CHARGE', 'BALANCE',
  'DETECTEUR', 'POMPE_A_VIDE', 'MANIFOLD', 'THERMOMETRE', 'BOUTEILLE_RECUP',
  'FLEXIBLE', 'EPI', 'AUTRE'];

/**
 * IM-19 : types MIME acceptés pour les pièces jointes — MÊME liste
 * blanche que le DemoStore (SVG exclu : risque XSS).
 */
const PJ_TYPES_MIME = ['application/pdf', 'image/png', 'image/jpeg',
  'image/webp'];

/** Taille maximale d'une pièce jointe : 5 Mo. */
const PJ_TAILLE_MAX = 5 * 1024 * 1024;

/** Seuil d'écart d'inventaire au-delà duquel une justification est exigée. */
const SEUIL_ECART_KG = 0.01;

/** Seuil en deçà duquel une bouteille est considérée vide (repris EXACT du DemoStore). */
const SEUIL_BOUTEILLE_VIDE_KG = 1e-9;

/** Libellés courts des mois (flux mensuels des statistiques). */
const LIBELLES_MOIS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin',
  'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

/** Message unique d'écriture figée (contrat Phase B) — repris MOT POUR MOT. */
const MSG_ECRITURE_FIGEE =
  'Écriture validée : correction uniquement par contre-écriture.';

/**
 * R3c : message métier UNIQUE opposé au complément de gaz (CHARGE_APPOINT)
 * sur une machine à fuite OUVERTE — repris MOT POUR MOT du DemoStore.
 */
const MSG_FUITE_OUVERTE =
  'Complément de gaz impossible : cette machine a une fuite déclarée non ' +
  'réparée. Tracez la réparation (date, nature, réparateur) puis déclarez ' +
  'un nouveau contrôle d’étanchéité avant de recharger.';

/**
 * Formate un nombre en fr-FR avec un nombre fixe de décimales (« 4,20 »).
 * CLONE EXACT de v8/js/core/utils.js:fmtNombre : les messages d'erreur du
 * registre (débordement, surcharge, stock insuffisant) doivent être
 * IDENTIQUES à ceux du DemoStore, séparateur de milliers compris.
 */
function fmtNombre(n, dec = 2) {
  const valeur = Number(n);
  if (!Number.isFinite(valeur)) return '—';
  return valeur.toLocaleString('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
}

/**
 * Valide une catégorie d'attestation (null accepté : non attesté).
 * P0-5 (revue) : la grille est PAR CHAMP — la 2025 (A1…V) n'est pas la
 * 2008 (I…IV) ; avant, la fiche refusait « A1 » pour la grille 2025 et
 * le message mentait. Miroir EXACT du DemoStore.
 */
function verifierCategorie(valeur, champ, grille = CATEGORIES_ATTESTATION) {
  if (valeur === null || valeur === undefined) return null;
  if (!grille.includes(valeur)) {
    throw new Error(
      `Catégorie d'attestation inconnue pour ${champ} : ${valeur} ` +
      `(attendu : ${grille.join(', ')}).`);
  }
  return valeur;
}

/** Valide un régime d'habilitation (miroir EXACT du DemoStore). */
function verifierRegime(regime) {
  if (!REGIMES.includes(regime)) {
    throw new Error(
      `Régime d'habilitation inconnu : ${regime} (attendu : 2008 ou 2025).`);
  }
  return regime;
}

/** Vrai si `categorie` est cohérente avec `regime` (miroir du module pur). */
function categorieCoherente(regime, categorie) {
  if (regime === '2008') return CATEGORIES_2008.includes(categorie);
  if (regime === '2025') return CATEGORIES_2025.includes(categorie);
  return false;
}

/** Valide la cohérence régime ↔ catégorie (miroir EXACT du DemoStore). */
function verifierCategorieHabilitation(regime, categorie) {
  const attendues = regime === '2008' ? CATEGORIES_2008 : CATEGORIES_2025;
  if (!attendues.includes(categorie)) {
    throw new Error(
      `Catégorie « ${categorie} » incohérente avec le régime ${regime} ` +
      `(attendu : ${attendues.join(', ')}).`);
  }
  return categorie;
}

/**
 * L4/Q3 (RN-2) — garde de DÉLIVRANCE (miroir EXACT du DemoStore) : après le
 * 31/12/2026 plus aucune attestation ne peut être délivrée sous l'ancien
 * régime (arrêté du 21/11/2025, art. 11). On enregistre l'HISTORIQUE
 * librement (dateDebut absente = date de délivrance inconnue, admise) ;
 * on refuse d'ACTER une délivrance 2008 postérieure — elle serait illégale.
 */
function verifierDelivrance2008(regime, dateDebut) {
  if (regime === '2008' && dateDebut && dateDebut > FIN_DELIVRANCE_2008) {
    throw new Error(
      'Une attestation du régime 2008 ne peut plus être délivrée après le ' +
      '31/12/2026 (arrêté du 21/11/2025, art. 11) : enregistrez une ' +
      'catégorie du régime 2025.');
  }
}

/**
 * Revue L4 — garde de SAISIE de la remise à niveau (miroir EXACT du
 * DemoStore) : format ancré AAAA-MM-JJ + date calendaire RÉELLE (un
 * « 2028-99-99 » passait les comparaisons de chaînes et RECONNAISSAIT
 * l'attestation jusqu'en 2035) + jamais dans le futur (une formation non
 * faite ne s'atteste pas d'avance). Une remise POSTÉRIEURE au butoir
 * reste enregistrable après coup : c'est un FAIT, le moteur la juge non
 * réparatrice et l'alerte le dit.
 */
function verifierRemiseNiveau(remiseNiveauLe) {
  if (remiseNiveauLe == null || remiseNiveauLe === '') return;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(remiseNiveauLe));
  const controle = m && new Date(Date.UTC(
    Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (!m || controle.getUTCMonth() !== Number(m[2]) - 1
      || controle.getUTCDate() !== Number(m[3])) {
    throw new Error(
      'Date de remise à niveau invalide (AAAA-MM-JJ attendu).');
  }
  if (remiseNiveauLe > aujourdHui()) {
    throw new Error('Une remise à niveau ne s’atteste pas d’avance : ' +
      'la date ne peut pas être dans le futur.');
  }
}

/** Ordre stable des habilitations (miroir EXACT du module pur, tri JS). */
function comparerHabilitations(a, b) {
  if (a.regime !== b.regime) return a.regime === '2025' ? -1 : 1;
  const fa = a.dateFin ?? null;
  const fb = b.dateFin ?? null;
  if (fa === fb) return 0;
  if (fa === null) return -1;
  if (fb === null) return 1;
  return fa < fb ? 1 : -1;
}

/** Valide un fluide de mention (miroir EXACT du DemoStore). */
function verifierFluideMention(fluideMention) {
  if (!FLUIDES_MENTION.includes(fluideMention)) {
    throw new Error(
      `Fluide de mention inconnu : ${fluideMention} ` +
      `(attendu : ${FLUIDES_MENTION.join(', ')}).`);
  }
  return fluideMention;
}

/** Ordre stable des mentions (miroir EXACT du module pur, tri JS). */
function comparerMentions(a, b) {
  const ia = FLUIDES_MENTION.indexOf(a.fluideMention);
  const ib = FLUIDES_MENTION.indexOf(b.fluideMention);
  if (ia !== ib) return ia - ib;
  const fa = a.dateFin ?? null;
  const fb = b.dateFin ?? null;
  if (fa !== fb) {
    if (fa === null) return -1;
    if (fb === null) return 1;
    return fa < fb ? 1 : -1;
  }
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/** Valide une liste d'activités réglementées. */
function verifierActivites(liste) {
  const activites = liste ?? [];
  if (!Array.isArray(activites)) {
    throw new Error('Liste d’activités réglementées attendue.');
  }
  for (const activite of activites) {
    if (!ACTIVITES_REGLEMENTEES.includes(activite)) {
      throw new Error(
        `Activité réglementée inconnue : ${activite} ` +
        `(attendu : ${ACTIVITES_REGLEMENTEES.join(', ')}).`);
    }
  }
  return [...activites];
}

// ------------------------------------------------------------
// Rôles habilités par méthode de MUTATION (403 côté route, AVANT
// effet). Cohérent avec ROLES_VALIDEURS = [REFERENT, ENSEIGNANT, ADMIN]
// (jamais ELEVE). Une méthode absente de cette table est une LECTURE
// (aucune restriction en E3). Voir docs/E3-PLAN.md §Rôles.
// ------------------------------------------------------------
const VALIDEUR = ['REFERENT', 'ENSEIGNANT', 'ADMIN'];
const OPERATEUR = ['REFERENT', 'ENSEIGNANT', 'ADMIN', 'ELEVE', 'TECHNICIEN'];

/**
 * V9-E5 : importerJSON REMPLACE tout le registre — bascule de VALIDEUR à
 * REFERENT+ADMIN uniquement (un ENSEIGNANT valide des écritures, mais ne
 * doit plus pouvoir écraser la base entière). Décision arrêtée, non
 * négociable. L'export (lecture) n'est pas concerné.
 */
const REFERENT_ADMIN = ['REFERENT', 'ADMIN'];

const ROLES_MUTATION = {
  // Niveau VALIDEUR (fige / scelle / intégrité)
  validerMouvement: VALIDEUR,
  annulerParContreEcriture: VALIDEUR,
  importerJSON: REFERENT_ADMIN,
  // P1-2 (D5) : le référentiel des fluides est REFERENT+ADMIN, comme
  // l'import qui réécrit déjà cette table. Un PRP pilote les tonnes
  // équivalent CO₂, donc les seuils de contrôle, donc les obligations
  // réglementaires de l'établissement : ce n'est pas de la saisie
  // courante, et un élève n'y touche dans aucun scénario.
  createFluide: REFERENT_ADMIN,
  updateFluide: REFERENT_ADMIN,
  updateEtablissement: VALIDEUR,
  createAuditOrganisme: VALIDEUR,
  createNonConformite: VALIDEUR,
  solderNonConformite: VALIDEUR,
  desactiverPersonne: VALIDEUR,
  // Une habilitation = une aptitude réglementaire : sa gestion relève du
  // responsable (jamais d'un élève, qui s'auto-attribuerait une aptitude).
  createHabilitation: VALIDEUR,
  updateHabilitation: VALIDEUR,
  revoquerHabilitation: VALIDEUR,
  // Une mention = une extension d'aptitude : même niveau que les
  // habilitations (jamais un élève).
  createMention: VALIDEUR,
  revoquerMention: VALIDEUR,
  reformerOutil: VALIDEUR,
  justifierEcart: VALIDEUR,
  saisirInventaire: VALIDEUR,
  acquitterAlerte: VALIDEUR,
  createBsff: VALIDEUR,
  attesterIssueBsff: VALIDEUR,
  createCession: VALIDEUR,
  retournerFournisseur: VALIDEUR,
  deciderFluideRecupere: VALIDEUR,

  // Niveau OPERATEUR (saisie courante, ELEVE inclus)
  creerMouvement: OPERATEUR,
  soumettreMouvement: OPERATEUR,
  rejeterMouvement: OPERATEUR,
  supprimerMouvement: OPERATEUR,
  // Lot C (C1) : l'élève-technicien signe son travail ; au lycée le
  // professeur signe détenteur PAR DÉLÉGATION sous sa propre session
  // (décision Franck 16/07) — l'identité de session est captée en témoin.
  signerMouvement: OPERATEUR,
  createMachine: OPERATEUR,
  updateMachine: OPERATEUR,
  arreterMachine: OPERATEUR,
  demantelerMachine: OPERATEUR,
  remettreEnService: OPERATEUR,
  createClient: OPERATEUR,
  updateClient: OPERATEUR,
  createBouteille: OPERATEUR,
  updateBouteille: OPERATEUR,
  peserBouteille: OPERATEUR,
  createControle: OPERATEUR,
  tracerReparation: OPERATEUR,
  createPersonne: OPERATEUR,
  updatePersonne: OPERATEUR,
  createOutil: OPERATEUR,
  updateOutil: OPERATEUR,
  ajouterPieceJointe: OPERATEUR,
  supprimerPieceJointe: OPERATEUR,
  // Rafraîchir la sentinelle est déclenché en consultant le tableau de bord :
  // tout utilisateur connecté peut l'appeler (best-effort, sans effet si rien
  // n'a changé). Acquitter, en revanche, engage le responsable → VALIDEUR.
  rafraichirSentinelle: OPERATEUR,

  // Coffre des identités (lot E2) : gestes réservés REFERENT/ADMIN — la
  // mise à l'abri comprise (le porteur de la phrase peut de toute façon
  // tout déchiffrer : une séparation plus fine serait illusoire, cf.
  // docs/PLAN-LOT-E2.md §5). Les gestes exigent AUSSI le poste local
  // (verifierPosteLocalCoffre, dans les handlers).
  mettreAuCoffre: REFERENT_ADMIN,
  restaurerIdentiteCoffre: REFERENT_ADMIN,
  changerPhraseCoffre: REFERENT_ADMIN
};

// ------------------------------------------------------------
// Lectures SENSIBLES gatées par rôle (lot E ①). La règle générale reste
// « une lecture n'est pas restreinte », MAIS l'export des données à caractère
// personnel d'une personne ne doit pas être accessible à un élève : il est
// réservé au niveau VALIDEUR (REFERENT / ENSEIGNANT / ADMIN), comme la gestion
// du personnel. garderRole consulte cette table APRÈS ROLES_MUTATION.
// ------------------------------------------------------------
const ROLES_LECTURE_SENSIBLE = {
  exporterDonneesPersonne: VALIDEUR,
  // Lot E2 : l'état du coffre (pseudonymes, candidats) relève du niveau
  // VALIDEUR ; la vérification du code et la CONSULTATION d'une identité
  // déchiffrée, du seul niveau REFERENT/ADMIN.
  etatCoffre: VALIDEUR,
  verifierCodeCoffre: REFERENT_ADMIN,
  consulterIdentiteCoffre: REFERENT_ADMIN,
  // Lot E2 (constat RGPD de la revue) : le journal d'audit porte des noms
  // (« qui » = libellé réel de session) — sa lecture n'est plus ouverte à
  // tout connecté, un élève n'a pas à lire l'historique nominatif complet.
  getJournalAudit: VALIDEUR
};

// ------------------------------------------------------------
// Aides internes
// ------------------------------------------------------------

/**
 * Ouvre la transaction ambiante et exécute l'effet + la journalisation
 * dans le MÊME tout-ou-rien (db.transaction est ré-entrant : un
 * journaliser() imbriqué rejoint la transaction au lieu de la saborder).
 * Ne JAMAIS journaliser hors de cette transaction.
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
function muter(fn) {
  return db.transaction(() => fn());
}

/** Arrondi métier au gramme (identique au DemoStore : évite la dérive). */
function arrondir(valeur) {
  return Math.round(valeur * 1000) / 1000;
}

/**
 * Date du jour au format LOCAL AAAA-MM-JJ (jamais toISOString, qui
 * décalerait d'un jour près de minuit). Identique au DemoStore.
 */
function aujourdHui() {
  const d = new Date();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/**
 * IM-1 : ajoute des mois à une date ISO, sans fuseau horaire. Un
 * débordement de fin de mois est ramené au dernier jour du mois cible
 * (31/01 + 1 mois → 28 ou 29/02, jamais le 3 mars). CLONE EXACT de
 * ajouterMois du DemoStore.
 */
function ajouterMois(iso, nbMois) {
  const [annee, mois, jour] = iso.split('-').map(Number);
  const d = new Date(annee, mois - 1 + nbMois, jour);
  if (d.getDate() !== jour) d.setDate(0);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/**
 * P1-1 : texte non vide, sinon null (champs facultatifs du modèle
 * d'équipement). Miroir du DemoStore.
 */
function texteOuNullEquip(valeur) {
  return valeur !== undefined && valeur !== null && String(valeur).trim() !== ''
    ? String(valeur).trim() : null;
}

/** Ajoute (ou retire) des jours à une date ISO, sans fuseau horaire. */
function ajouterJours(iso, nbJours) {
  const [annee, mois, jour] = iso.split('-').map(Number);
  const d = new Date(annee, mois - 1, jour + nbJours);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/** Ajoute un an à une date ISO (délai de garde des fluides déchets). */
function ajouterUnAn(iso) {
  const [annee, mois, jour] = iso.split('-').map(Number);
  const d = new Date(annee + 1, mois - 1, jour);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/** Équivalent CO₂ en tonnes : kg × GWP / 1000 (clone de utils.js:teqCO2). */
function teqCO2(kg, gwp) {
  return (Number(kg) * Number(gwp)) / 1000;
}

/**
 * Masse signée formatée « + 2,00 kg » / « − 0,50 kg » (clone de
 * utils.js:fmtKgSigne — libellés du journal identiques au DemoStore).
 */
function fmtKgSigne(n) {
  const valeur = Number(n);
  if (!Number.isFinite(valeur)) return '—';
  const signe = valeur < 0 ? '−' : '+';
  return `${signe} ${fmtNombre(Math.abs(valeur), 2)} kg`;
}

/** Date « JJ/MM/AAAA » (clone de utils.js:fmtDate — messages identiques). */
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const jour = String(d.getDate()).padStart(2, '0');
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  return `${jour}/${mois}/${d.getFullYear()}`;
}

/**
 * Statut d'un outil RECALCULÉ depuis sa prochaine échéance : EXPIRE si
 * dépassée, A_VERIFIER si à moins de 30 jours (ou sans échéance connue),
 * CONFORME sinon. Un outil réformé (HORS_SERVICE) le reste. Clone du
 * calculerStatutOutil du DemoStore.
 */
function calculerStatutOutil(outil, jour) {
  if (outil.statut === 'HORS_SERVICE') return 'HORS_SERVICE';
  if (!outil.prochaineEcheance) return 'A_VERIFIER';
  if (outil.prochaineEcheance < jour) return 'EXPIRE';
  if (outil.prochaineEcheance <= ajouterJours(jour, 30)) return 'A_VERIFIER';
  return 'CONFORME';
}

/**
 * INSÈRE une ligne SQL (déjà en colonnes snake_case) dans `table`.
 * Les colonnes NULL sont incluses (défauts du schéma sinon appliqués).
 * Toute ligne rattachée à l'établissement singleton l'AMORCE d'abord
 * (idempotent) : sur base fraîche, un handler qui écrit avant init() ou
 * updateEtablissement() n'échoue plus sur la FK etablissement_id
 * (revue 10/07 : ~14 sites d'insertion, seuls 5 amorçaient).
 */
function inserer(table, ligne) {
  if (ligne.etablissement_id === ID_ETABLISSEMENT) amorcerEtablissement();
  const colonnes = Object.keys(ligne);
  const marques = colonnes.map(() => '?').join(', ');
  db.run(
    `INSERT INTO ${table} (${colonnes.join(', ')}) VALUES (${marques})`,
    colonnes.map((c) => ligne[c]));
}

/**
 * MET À JOUR une ligne SQL par id (colonnes snake_case). Ne touche que
 * les colonnes fournies (patch partiel). N'écrit rien si `ligne` est vide.
 */
function majParId(table, id, ligne) {
  const colonnes = Object.keys(ligne);
  if (colonnes.length === 0) return;
  const affectations = colonnes.map((c) => `${c} = ?`).join(', ');
  db.run(
    `UPDATE ${table} SET ${affectations} WHERE id = ?`,
    [...colonnes.map((c) => ligne[c]), id]);
}

/**
 * Session de l'appel EN COURS, posée par appeler() et remise à null dans son
 * `finally`. Elle ne sert QU'AU journal (témoin d'identité) : les gardes de
 * rôle, elles, lisent le contexte reçu en argument. Node est mono-thread et
 * les handlers sont synchrones : aucun entrelacement possible.
 */
let sessionCourante = null;

/** Écrit une entrée au journal d'audit (chaîné, dans la transaction ambiante). */
function journaliser(qui, action, cible, details) {
  // `qui || null` (pas ??) : une chaîne vide devient « système » comme au
  // DemoStore (`qui || 'système'`) — db.journaliser traduit null → système.
  const declare = qui || null;
  const reel = auteurDeLaSession();

  // Aucune session (loopback en lecture, harnais de test, CLI) : comportement
  // d'origine, strictement identique au DemoStore — la parité est préservée.
  if (!reel) {
    db.journaliser({ qui: declare, action, cible, details });
    return;
  }

  // TÉMOIN D'IDENTITÉ (14/07). Le registre F-Gas est déclaratif par nature —
  // celui qui signe engage sa responsabilité, comme sur le CERFA papier, et le
  // logiciel n'a pas à refuser une déclaration. Mais le JOURNAL, lui, n'a pas à
  // croire le client sur parole : il consigne l'auteur RÉEL, celui de la
  // session, que le serveur connaît déjà. Le nom déclaré est conservé à côté
  // quand il diffère — SANS JUGER, car les deux cas sont légitimes :
  //   - normal   : le professeur connecté saisit une intervention faite par un
  //                élève (« auteur déclaré : Léa Martin ») ;
  //   - suspect  : un élève connecté signe au nom de son professeur.
  // Le journal ne tranche pas, il ENREGISTRE — dans une entrée chaînée et en
  // ajout seul, donc ineffaçable. On n'empêche pas la déclaration : on la recoupe.
  const concordant = !declare
    || reel.libelle.includes(declare)
    || (reel.personnelId !== null && declare === reel.personnelId);
  const detailsFinal = concordant
    ? details
    : `${details ? `${details} — ` : ''}auteur déclaré : ${declare}`;
  db.journaliser({ qui: reel.libelle, action, cible, details: detailsFinal });
}

/**
 * L'auteur RÉEL de l'appel en cours : le compte de la session, jamais ce que
 * le client déclare. `null` s'il n'y a pas de session (loopback en lecture,
 * harnais de test, amorçage) — le journal retombe alors sur le nom déclaré,
 * exactement comme le DemoStore (parité du contrat).
 * @returns {{libelle: string, login: string, personnelId: string|null}|null}
 */
function auteurDeLaSession() {
  const idCompte = sessionCourante?.utilisateur ?? null;
  if (!idCompte) return null;
  const compte = db.get(
    'SELECT id, login, personnel_id FROM utilisateurs_app WHERE id = ?',
    [idCompte]);
  if (!compte) return null;
  let libelle = compte.login;
  if (compte.personnel_id) {
    const fiche = db.get(
      'SELECT prenom, nom FROM personnel WHERE id = ?', [compte.personnel_id]);
    if (fiche) libelle = `${fiche.prenom} ${fiche.nom} (${compte.login})`;
  }
  return {
    libelle,
    login: compte.login,
    personnelId: compte.personnel_id ?? null
  };
}

/**
 * Amorce l'établissement singleton VIDE s'il n'existe pas encore.
 * ÉCRITURE : n'est appelée que par des mutations — init, updateEtablissement,
 * et automatiquement par inserer() / les upserts d'inventaire dès qu'une
 * ligne porte etablissement_id — jamais par une lecture (revue E3 : une
 * lecture ne mute jamais).
 * raison_sociale est NOT NULL au schéma → chaîne vide (dossier à saisir).
 */
function amorcerEtablissement() {
  const existe = db.get(
    'SELECT id FROM etablissements WHERE id = ?', [ID_ETABLISSEMENT]);
  if (existe) return;
  db.run(
    `INSERT INTO etablissements (id, raison_sociale) VALUES (?, '')`,
    [ID_ETABLISSEMENT]);
}

/**
 * L'établissement singleton en forme SQL, ou un dossier VIDE reconstitué
 * (toutes les colonnes à NULL) s'il n'a pas encore été amorcé — SANS écrire.
 * Le contrat lit toujours un dossier complet (toutes ses clés présentes).
 */
function etablissementCourant() {
  return db.get('SELECT * FROM etablissements WHERE id = ?',
    [ID_ETABLISSEMENT]) ?? { id: ID_ETABLISSEMENT, raison_sociale: '' };
}

// ------------------------------------------------------------
// Sentinelle d'alertes persistées — MIROIR EXACT du module pur
// v8/js/data/sentinelle.js (le serveur est CommonJS, le front ESM :
// la parité de sortie est garantie par test-contrat, pas par le
// partage de code — même choix que getAlertes).
// ------------------------------------------------------------

/** Diff pur alertes actives ↔ épisodes ouverts (cf. sentinelle.js). */
function calculerTransitionsSentinelle(alertesActives, episodesOuverts, maintenantIso) {
  const idsActifs = new Set(alertesActives.map((a) => a.id));
  const ouvertParIdAlerte = new Map();
  for (const e of episodesOuverts) ouvertParIdAlerte.set(e.idAlerte, e);
  const apparitions = [];
  const escalades = [];
  const vus = new Set();
  for (const a of alertesActives) {
    if (vus.has(a.id)) continue;
    vus.add(a.id);
    const ouvert = ouvertParIdAlerte.get(a.id);
    if (!ouvert) {
      apparitions.push({
        idAlerte: a.id,
        niveau: a.niveau,
        titre: a.titre,
        detail: a.detail ?? null,
        cibleVue: a.cible?.vue ?? null,
        cibleId: a.cible?.id ?? null,
        apparueLe: maintenantIso
      });
    } else if (ouvert.niveau !== a.niveau) {
      escalades.push({
        id: ouvert.id,
        niveau: a.niveau,
        titre: a.titre,
        detail: a.detail ?? null,
        cibleVue: a.cible?.vue ?? null,
        cibleId: a.cible?.id ?? null
      });
    }
  }
  const resolutions = episodesOuverts
    .filter((e) => !idsActifs.has(e.idAlerte))
    .map((e) => e.id);
  return { apparitions, escalades, resolutions };
}

/** Épisode STOCKÉ (forme à plat) → forme de sortie du contrat (cf. sentinelle.js). */
function formaterEpisodeSentinelle(e) {
  return {
    id: e.id,
    idAlerte: e.idAlerte,
    niveau: e.niveau,
    titre: e.titre,
    detail: e.detail ?? null,
    cible: e.cibleVue ? { vue: e.cibleVue, id: e.cibleId ?? null } : null,
    apparueLe: e.apparueLe,
    resolueLe: e.resolueLe ?? null,
    acquitteeLe: e.acquitteeLe ?? null,
    acquitteePar: e.acquitteePar ?? null
  };
}

/** Ordre stable : plus récent d'abord, départage par idAlerte (cf. sentinelle.js). */
function comparerEpisodesSentinelle(a, b) {
  if (a.apparueLe !== b.apparueLe) return a.apparueLe < b.apparueLe ? 1 : -1;
  if (a.idAlerte === b.idAlerte) return 0;
  return a.idAlerte < b.idAlerte ? -1 : 1;
}

/** La sentinelle complète, en forme de sortie triée (lecture SANS écriture). */
function lireSentinelleTriee() {
  const lignes = db.all(
    `SELECT id, id_alerte, niveau, titre, detail, cible_vue, cible_id,
            apparue_le, resolue_le, acquittee_le, acquittee_par
     FROM sentinelle_alertes WHERE etablissement_id = ?`,
    [ID_ETABLISSEMENT]);
  return lignes
    .map((l) => mapping.versFront('sentinelle_alertes', l))
    .map(formaterEpisodeSentinelle)
    .sort(comparerEpisodesSentinelle);
}

// ------------------------------------------------------------
// HANDLERS — une fonction par méthode du contrat.
// Chaque handler reçoit (params, contexte) et renvoie la forme
// camelCase EXACTE du contrat (via mapping.versFront + reconstitutions).
// ------------------------------------------------------------

const HANDLERS = {

  // === initialisation =======================================
  init() {
    db.transaction(() => amorcerEtablissement());
    // CR-5 : l'état d'intégrité constaté au chargement juge le REGISTRE
    // des mouvements (chaîne de hash recalculée) ET le journal d'audit —
    // une base altérée hors application ne démarre jamais « saine »
    // (revue E3). Bandeau seulement, jamais de blocage (contrat).
    const registre = verifierChaineMouvements();
    if (!registre.ok) {
      return { ok: false, casseA: registre.casseA };
    }
    const journal = db.verifierChaineJournal();
    if (!journal.ok) {
      return { ok: false, casseA: `journal n° ${journal.casseA}` };
    }
    return null;
  },

  // === lectures d'état (VAGUE 2) ============================

  /** Le référentiel des fluides, nbMachines recalculé (non démantelées). */
  getFluides() {
    const lignes = db.all('SELECT * FROM fluides ORDER BY code');
    return lignes.map((ligne) => {
      const fluide = mapping.versFront('fluides', ligne);
      const { n } = db.get(
        `SELECT count(*) AS n FROM machines
         WHERE fluide = ? AND statut <> 'DEMANTELEE'`, [ligne.code]);
      fluide.nbMachines = n;
      // impact : DÉRIVÉ du PRP (P1-2, D3). Il n'existait auparavant que
      // dans le monde démo — la colonne de la vue restait donc vide en
      // mode serveur. Parité stricte avec le DemoStore.
      fluide.impact = impactDepuisPrp(fluide.gwpAr4);
      return fluide;
    });
  },

  /** L'établissement (dossier opérateur) — copie complète, jamais d'écriture. */
  getEtablissement() {
    return mapping.versFront('etablissements', etablissementCourant());
  },

  /** État d'intégrité constaté : { altere, casseA } (registre ET journal). */
  getEtatRegistre() {
    const registre = verifierChaineMouvements();
    if (!registre.ok) {
      return { altere: true, casseA: registre.casseA };
    }
    const journal = db.verifierChaineJournal();
    if (!journal.ok) {
      return { altere: true, casseA: `journal n° ${journal.casseA}` };
    }
    return { altere: false, casseA: null };
  },

  /**
   * Alertes ENTIÈREMENT dynamiques, recalculées depuis la base à chaque
   * lecture — MIROIR EXACT du getAlertes du DemoStore (SPEC §7.2 : ce qui
   * est ÉCHU est critique, ce qui APPROCHE — 90 jours — est important).
   * IM-2 : chaque alerte porte une cible { vue, id? } pour les liens
   * cliquables du tableau de bord. Les lectures suivent l'ordre rowid
   * (= ordre d'insertion du DemoStore) pour un tri stable identique.
   */
  getAlertes() {
    const alertes = [];
    const jour = aujourdHui();
    const horizon = ajouterJours(jour, 90);

    // 1. Attestation de CAPACITÉ de l'établissement
    const etablissement = HANDLERS.getEtablissement();
    const echeanceCapacite = etablissement.dateEcheanceCapacite;
    if (echeanceCapacite && echeanceCapacite < jour) {
      alertes.push({
        id: 'alr-capacite',
        niveau: 'CRITIQUE',
        titre: 'Attestation de capacité expirée',
        detail: `${etablissement.numAttestationCapacite ?? '—'} · ` +
          `échéance ${fmtDate(echeanceCapacite)}`,
        cible: { vue: 'admin' }
      });
    } else if (echeanceCapacite && echeanceCapacite <= horizon) {
      alertes.push({
        id: 'alr-capacite',
        niveau: 'IMPORTANT',
        titre: 'Attestation de capacité à renouveler',
        detail: `${etablissement.numAttestationCapacite ?? '—'} · ` +
          `échéance ${fmtDate(echeanceCapacite)}`,
        cible: { vue: 'admin' }
      });
    }

    // 2. Attestations d'APTITUDE du personnel actif
    const personnel = db.all('SELECT * FROM personnel ORDER BY rowid')
      .map((ligne) => mapping.versFront('personnel', ligne));
    for (const p of personnel) {
      if (!p.actif || !p.dateFinValidite) continue;
      if (p.dateFinValidite < jour) {
        alertes.push({
          id: `alr-aptitude-${p.id}`,
          niveau: 'CRITIQUE',
          titre: 'Attestation d’aptitude expirée',
          detail: `${p.prenom} ${p.nom} · échéance ${fmtDate(p.dateFinValidite)}`,
          cible: { vue: 'personnel', id: p.id }
        });
      } else if (p.dateFinValidite <= horizon) {
        alertes.push({
          id: `alr-aptitude-${p.id}`,
          niveau: 'IMPORTANT',
          titre: 'Attestation d’aptitude à renouveler',
          detail: `${p.prenom} ${p.nom} · échéance ${fmtDate(p.dateFinValidite)}`,
          cible: { vue: 'personnel', id: p.id }
        });
      }
    }

    // 2 bis. Habilitations F-Gas et mentions (chantier B2, Phase 3
    // « conseil ») — MIROIR EXACT du DemoStore : une ligne ACTIVE d'une
    // personne ACTIVE, échue ou sous l'horizon, alerte. Les révoquées ne
    // sonnent jamais, les personnes désactivées non plus.
    const nomsPersonnelActif = new Map(personnel
      .filter((p) => p.actif)
      .map((p) => [p.id, `${p.prenom} ${p.nom}`]));
    const habilitationsAlertes =
      db.all('SELECT * FROM habilitations ORDER BY rowid')
        .map((ligne) => mapping.versFront('habilitations', ligne));
    for (const h of habilitationsAlertes) {
      if (!h.actif || !h.dateFin || !nomsPersonnelActif.has(h.personneId)) continue;
      const qui = nomsPersonnelActif.get(h.personneId);
      if (h.dateFin < jour) {
        alertes.push({
          id: `alr-habilitation-${h.id}`,
          niveau: 'CRITIQUE',
          titre: 'Habilitation F-Gas expirée',
          detail: `${qui} · ${h.regime} ${h.categorie} · échéance ${fmtDate(h.dateFin)}`,
          cible: { vue: 'personnel', id: h.personneId }
        });
      } else if (h.dateFin <= horizon) {
        alertes.push({
          id: `alr-habilitation-${h.id}`,
          niveau: 'IMPORTANT',
          titre: 'Habilitation F-Gas à renouveler',
          detail: `${qui} · ${h.regime} ${h.categorie} · échéance ${fmtDate(h.dateFin)}`,
          cible: { vue: 'personnel', id: h.personneId }
        });
      }
    }

    // L4/Q3 (RN-3, refondue par la revue du lot) — remise à niveau des
    // attestations 2008 (arrêté du 21/11/2025, art. 7) — MIROIR EXACT du
    // DemoStore. L'alerte est fondée sur l'ÉTAT RÉEL du moteur
    // (habilitationReconnue), plus sur la seule présence du champ : une
    // remise TARDIVE (postérieure au butoir) ou un cycle de 7 ans ÉCHU
    // rendaient l'attestation morte SANS aucune alerte.
    // CRITIQUE = non reconnue (motif dit lequel) ; IMPORTANT = reconnue
    // en sursis (pas de remise réparatrice enregistrée). Une ligne échue
    // par sa propre date se tait ici (alr-habilitation- la porte).
    for (const h of habilitationsAlertes) {
      if (!h.actif || h.regime !== '2008') continue;
      if (!nomsPersonnelActif.has(h.personneId)) continue;
      if (h.dateFin && h.dateFin < jour) continue;
      const qui = nomsPersonnelActif.get(h.personneId);
      const remise = h.remiseNiveauLe ?? null;
      const remiseReparatrice = Boolean(remise
        && remise <= DATE_BUTOIR_REMISE_NIVEAU_2008);
      if (!habilitationReconnue(h, jour)) {
        const motif = !remise
          ? 'sans remise à niveau enregistrée au 12/03/2029 : examen à repasser'
          : !remiseReparatrice
            ? `remise à niveau du ${fmtDate(remise)} postérieure au butoir ` +
              'du 12/03/2029 : examen à repasser'
            : 'cycle de formation de 7 ans échu depuis le ' +
              `${fmtDate(plusAnnees(remise, DUREE_CYCLE_FORMATION_ANS))} : ` +
              'remise à niveau à refaire';
        alertes.push({
          id: `alr-remise-niveau-${h.id}`,
          niveau: 'CRITIQUE',
          titre: 'Attestation 2008 non reconnue',
          detail: `${qui} · 2008 ${h.categorie} · ${motif}`,
          cible: { vue: 'personnel', id: h.personneId }
        });
      } else if (!remiseReparatrice) {
        // L'échéance AFFICHÉE est la plus proche : la propre date de fin
        // de la ligne si elle tombe avant le butoir (faire la remise
        // après serait sans objet pour cette attestation).
        const echeance = h.dateFin && h.dateFin < DATE_BUTOIR_REMISE_NIVEAU_2008
          ? h.dateFin : DATE_BUTOIR_REMISE_NIVEAU_2008;
        alertes.push({
          id: `alr-remise-niveau-${h.id}`,
          niveau: 'IMPORTANT',
          titre: 'Remise à niveau à faire avant le 12/03/2029',
          detail: `${qui} · 2008 ${h.categorie} · formation de remise à ` +
            `niveau ponctuelle exigée avant le ${fmtDate(echeance)} ` +
            '(arrêté du 21/11/2025)',
          cible: { vue: 'personnel', id: h.personneId }
        });
      }
    }
    const LIBELLES_MENTION_ALERTE = { CO2: 'CO₂', NH3: 'NH₃', HC: 'HC' };
    const mentionsAlertes =
      db.all('SELECT * FROM mentions_habilitation ORDER BY rowid')
        .map((ligne) => mapping.versFront('mentions_habilitation', ligne));
    for (const m of mentionsAlertes) {
      if (!m.actif || !m.dateFin || !nomsPersonnelActif.has(m.personneId)) continue;
      const qui = nomsPersonnelActif.get(m.personneId);
      const fluideMention =
        LIBELLES_MENTION_ALERTE[m.fluideMention] || m.fluideMention;
      if (m.dateFin < jour) {
        alertes.push({
          id: `alr-mention-${m.id}`,
          niveau: 'CRITIQUE',
          titre: `Mention ${fluideMention} expirée`,
          detail: `${qui} · échéance ${fmtDate(m.dateFin)}`,
          cible: { vue: 'personnel', id: m.personneId }
        });
      } else if (m.dateFin <= horizon) {
        alertes.push({
          id: `alr-mention-${m.id}`,
          niveau: 'IMPORTANT',
          titre: `Mention ${fluideMention} à renouveler`,
          detail: `${qui} · échéance ${fmtDate(m.dateFin)}`,
          cible: { vue: 'personnel', id: m.personneId }
        });
      }
    }

    // 3. Machines : fuites non résolues, contrôles dépassés.
    // IM-4 : une machine à l'arrêt ou démantelée n'exige plus de
    // contrôle périodique.
    const machines = db.all('SELECT * FROM machines ORDER BY rowid')
      .map((ligne) => mapping.versFront('machines', ligne));
    for (const m of machines) {
      if (m.statut === 'FUITE') {
        // R4 : distinguer fuite OUVERTE (CRITIQUE) de fuite RÉPARÉE en
        // attente de contrôle de suivi (IMPORTANT, échéance 1 mois civil, P0-6).
        const statutFuite = estFuiteOuverte(controlesDeLaMachine(m.id),
          equipement.mobileListe(m));
        // R4 : l'alerte de SUIVI n'existe que si une réparation est
        // TRACÉE — sans elle, la fuite reste « non résolue » (jamais de
        // dates nulles affichées).
        if (statutFuite.ouverte || !statutFuite.dateReparation) {
          alertes.push({
            id: `alr-fuite-${m.id}`,
            niveau: 'CRITIQUE',
            titre: 'Fuite non résolue',
            detail: `${m.designation} · réparation à tracer`,
            cible: { vue: 'machines', id: m.id }
          });
        } else {
          alertes.push({
            id: `alr-fuite-${m.id}`,
            niveau: 'IMPORTANT',
            titre: 'Contrôle de suivi à faire',
            detail: `${m.designation} · réparée le ` +
              `${fmtDate(statutFuite.dateReparation)} · à recontrôler avant ` +
              `${fmtDate(statutFuite.echeanceControleSuivi)}`,
            cible: { vue: 'machines', id: m.id }
          });
        }
      } else if (m.statut !== 'DEMANTELEE' && m.statut !== 'ARRETEE' &&
                 m.prochainControle && m.prochainControle < jour) {
        alertes.push({
          id: `alr-controle-${m.id}`,
          niveau: 'CRITIQUE',
          titre: 'Contrôle d’étanchéité en retard',
          detail: `${m.designation} · échéance ${fmtDate(m.prochainControle)}`,
          cible: { vue: 'machines', id: m.id }
        });
      }

      // P1-1 — SYSTÈME DE DÉTECTION de l'équipement (≠ détecteur portable
      // de l'atelier, alerte « alr-outil- »). Miroir EXACT du DemoStore.
      if (m.statut !== 'DEMANTELEE' && m.statut !== 'ARRETEE') {
        const fluideRefM = lireFluide(m.fluide);
        const detection = equipement.detectionEffective(m, jour);
        // E2 — détection obligatoire au niveau haut et absente.
        const niveauM = niveauCadre7(fluideRefM, m.chargeNominaleKg, jour);
        if (equipement.detectionObligatoireDepuisNiveau(niveauM)
            && !detection.declaree) {
          alertes.push({
            id: `alr-detection-obligatoire-${m.id}`,
            niveau: 'CRITIQUE',
            titre: 'Système de détection de fuites obligatoire absent',
            detail: `${m.designation} · au-delà du seuil haut, un système `
              + 'de détection permanente est exigé',
            cible: { vue: 'machines', id: m.id }
          });
        }
        // E1 — détection déclarée mais non vérifiée : l'allègement tombe.
        if (detection.declaree && !detection.compte) {
          alertes.push({
            id: `alr-detection-verif-${m.id}`,
            niveau: 'IMPORTANT',
            titre: 'Détection de fuites à faire vérifier',
            detail: `${m.designation} · `
              + (detection.motif === 'JAMAIS_VERIFIEE'
                ? 'aucune vérification enregistrée'
                : `vérification échue le ${fmtDate(detection.echeance)}`)
              + ' · la fréquence de contrôle n’est plus allégée',
            cible: { vue: 'machines', id: m.id }
          });
        }
      }
    }

    // 4. Outillage à échéance dépassée (statut recalculé)
    const outillage = db.all('SELECT * FROM outillage ORDER BY rowid')
      .map((ligne) => mapping.versFront('outillage', ligne));
    for (const outil of outillage) {
      if (calculerStatutOutil(outil, jour) !== 'EXPIRE') continue;
      const titre =
        outil.typeOutil === 'BALANCE' ? 'Balance à revérifier' :
        outil.typeOutil === 'STATION_RECUPERATION'
          ? 'Station de récupération à contrôler'
          : outil.typeOutil === 'DETECTEUR'
            ? 'Détecteur à réétalonner'
            : 'Outillage à vérifier';
      alertes.push({
        id: `alr-outil-${outil.id}`,
        // SPEC §7.2 : détecteur ou balance expiré = CRITIQUE
        // (blocage du mode officiel), le reste = IMPORTANT.
        niveau: (outil.typeOutil === 'DETECTEUR' ||
                 outil.typeOutil === 'BALANCE') ? 'CRITIQUE' : 'IMPORTANT',
        titre,
        detail: `${outil.marque} ${outil.modele} · ${fmtDate(outil.prochaineEcheance)}`,
        cible: { vue: 'outillage', id: outil.id }
      });
    }

    // 5. Fluides déchets gardés au-delà du délai (1 an)
    const bouteilles = db.all('SELECT * FROM bouteilles ORDER BY rowid')
      .map((ligne) => mapping.versFront('bouteilles', ligne));
    for (const b of bouteilles) {
      if (b.statut !== 'DECHET' || !b.dateLimiteGarde) continue;
      if (b.dateLimiteGarde < jour) {
        alertes.push({
          id: `alr-garde-${b.id}`,
          niveau: 'CRITIQUE',
          titre: 'Fluide déchet au-delà du délai de garde',
          detail: `${b.code} (${b.fluide}) · limite ${fmtDate(b.dateLimiteGarde)}`,
          cible: { vue: 'bouteilles', id: b.id }
        });
      }
    }

    // 6. Écarts de balance matière non justifiés
    for (const ecart of ecartsNonJustifies()) {
      alertes.push({
        id: `alr-ecart-${ecart.annee}-${ecart.fluide}`,
        niveau: 'CRITIQUE',
        titre: 'Écart de balance matière non justifié',
        detail: `${ecart.fluide} · ${ecart.annee} · ` +
          `écart ${fmtKgSigne(ecart.ecartKg)}`,
        cible: { vue: 'balance' }
      });
    }

    // 7. IM-3 : bouteille active sans pesée récente (> 90 jours)
    const limitePesee = ajouterJours(jour, -90);
    for (const b of bouteilles) {
      if (b.statut !== 'EN_STOCK' && b.statut !== 'EN_SERVICE') continue;
      if (!b.datePesee || b.datePesee < limitePesee) {
        alertes.push({
          id: `alr-pesee-${b.id}`,
          niveau: 'IMPORTANT',
          titre: 'Bouteille sans pesée récente',
          detail: `${b.code} (${b.fluide}) · dernière pesée ` +
            `${fmtDate(b.datePesee)}`,
          cible: { vue: 'bouteilles', id: b.id }
        });
      }
    }

    // 8. IM-3 : mouvements en souffrance — soumis depuis plus de
    // 7 jours (à valider) ou brouillon depuis plus de 30 jours.
    // Repli sur la date du mouvement pour les données antérieures
    // au champ dateSoumission.
    const limiteSoumis = ajouterJours(jour, -7);
    const limiteBrouillon = ajouterJours(jour, -30);
    const mouvements = db.all('SELECT * FROM mouvements ORDER BY rowid')
      .map((ligne) => reconstituerMouvement(ligne));
    for (const mv of mouvements) {
      if (mv.statut === 'SOUMIS' &&
          (mv.dateSoumission ?? mv.date) < limiteSoumis) {
        alertes.push({
          id: `alr-soumis-${mv.id}`,
          niveau: 'IMPORTANT',
          titre: 'Mouvement soumis à valider',
          detail: `${mv.numero} · ${mv.type} · soumis le ` +
            `${fmtDate(mv.dateSoumission ?? mv.date)}`,
          cible: { vue: 'mouvements', id: mv.id }
        });
      } else if (mv.statut === 'BROUILLON' && mv.date < limiteBrouillon) {
        alertes.push({
          id: `alr-brouillon-${mv.id}`,
          niveau: 'IMPORTANT',
          titre: 'Brouillon de mouvement à reprendre',
          detail: `${mv.numero} · ${mv.type} · créé le ${fmtDate(mv.date)}`,
          cible: { vue: 'mouvements', id: mv.id }
        });
      }
    }

    // 9. Cycle matière (CM-2) : réintroduction de fluide au-delà de ce
    // qui a été récupéré d'une machine — l'avoir d'origine devient NÉGATIF
    // dans une bouteille de RÉCUPÉRATION. Anomalie SIGNALÉE (non bloquante
    // en conseil), à rectifier par contre-écriture. Une charge depuis une
    // bouteille NEUVE (fluide acheté) n'est PAS un réemploi : jamais
    // concernée. MIROIR EXACT du DemoStore.
    const labelMachineReemploi = new Map();
    for (const mv of mouvements) {
      if (mv.machineId && mv.machineLabel
          && !labelMachineReemploi.has(mv.machineId)) {
        labelMachineReemploi.set(mv.machineId, mv.machineLabel);
      }
    }
    for (const b of bouteilles) {
      if (b.type !== 'RECUPERATION') continue;
      const avoirOrigine = avoirParMachineOrigine(b.id, mouvements);
      for (const [machineId, net] of avoirOrigine) {
        if (net < -0.01) { // tolérance métrologique (10 g) contre les arrondis
          const surplus = Math.round(-net * 1000) / 1000;
          alertes.push({
            id: `alr-reemploi-${b.id}-${machineId}`,
            niveau: 'IMPORTANT',
            titre: 'Réintroduction au-delà du fluide récupéré',
            detail: `${b.code} · ${fmtNombre(surplus, 3)} kg réintroduits ` +
              `sur ${labelMachineReemploi.get(machineId) ?? machineId} ` +
              'au-delà du fluide récupéré de cette machine — ' +
              'à rectifier (contre-écriture).',
            cible: { vue: 'bouteilles', id: b.id }
          });
        }
      }
    }

    // Les alertes critiques d'abord (tri stable)
    alertes.sort((a, b) =>
      (a.niveau === b.niveau) ? 0 : (a.niveau === 'CRITIQUE' ? -1 : 1));
    return alertes;
  },

  /** Tout le personnel (jamais supprimé : seulement désactivé). */
  getPersonnel() {
    const lignes = db.all(
      'SELECT * FROM personnel ORDER BY rowid');
    return lignes.map((ligne) => mapping.versFront('personnel', ligne));
  },

  /** Les clients détenteurs, nbMachines recalculé (non démantelées). */
  getClients() {
    // clients_detenteurs n'a pas de date_creation au schéma : rowid tient
    // l'ordre d'insertion (le contrat ne teste pas l'ordre, mais on reste
    // déterministe).
    const lignes = db.all(
      'SELECT * FROM clients_detenteurs ORDER BY rowid');
    return lignes.map((ligne) => {
      const client = mapping.versFront('clients_detenteurs', ligne);
      const { n } = db.get(
        `SELECT count(*) AS n FROM machines
         WHERE client_detenteur_id = ? AND statut <> 'DEMANTELEE'`,
        [ligne.id]);
      client.nbMachines = n;
      return client;
    });
  },

  /** Toutes les machines, démantelées incluses (les vues filtrent). */
  getMachines() {
    const lignes = db.all(
      'SELECT * FROM machines ORDER BY rowid');
    return lignes.map((ligne) => mapping.versFront('machines', ligne));
  },

  /** Toutes les bouteilles ; masseNetteKg = brute − tare (colonne calculée). */
  getBouteilles() {
    const lignes = db.all(
      'SELECT * FROM bouteilles ORDER BY rowid');
    return lignes.map((ligne) => mapping.versFront('bouteilles', ligne));
  },

  /** Tous les mouvements, triés date puis numéro décroissants. */
  getMouvements() {
    const lignes = db.all(
      `SELECT * FROM mouvements
       ORDER BY date_mouvement DESC, numero DESC`);
    return lignes.map((ligne) => reconstituerMouvement(ligne));
  },

  /** Tous les contrôles d'étanchéité, triés date décroissante. */
  getControles() {
    const lignes = db.all(
      'SELECT * FROM controles ORDER BY date_controle DESC');
    return lignes.map((ligne) => {
      const controle = mapping.versFront('controles', ligne);
      // Clé contractuelle posée par le DemoStore à la création (jamais
      // persistée côté SQL — frontSeulement) : restituée à la lecture.
      controle.enRetard = false;
      return controle;
    });
  },

  /**
   * Outillage avec statut RECALCULÉ à la lecture (jamais un statut figé —
   * un outil CONFORME dont l'échéance passe devient EXPIRE tout seul,
   * comme au DemoStore ; HORS_SERVICE reste permanent).
   */
  getOutillage() {
    const lignes = db.all(
      'SELECT * FROM outillage ORDER BY rowid');
    return lignes.map((ligne) => {
      const outil = mapping.versFront('outillage', ligne);
      outil.statut = calculerStatutOutil(outil, aujourdHui());
      return outil;
    });
  },

  /** Le journal d'audit append-only { date, qui, action, cible, details }. */
  getJournalAudit() {
    const lignes = db.all(
      `SELECT date_heure, utilisateur, action, cible, details
       FROM journal_audit ORDER BY id`);
    return lignes.map((ligne) => mapping.versFront('journal_audit', ligne));
  },

  /**
   * Utilisateur courant (V9-E5) : l'utilisateur RÉELLEMENT authentifié, lu
   * depuis la SESSION (contexte.utilisateur = id du compte utilisateurs_app,
   * posé par serveur.js:contexteDeLaConnexion via sessions.verifierSession) —
   * PLUS le stub « premier REFERENT du personnel » d'avant E5.
   *
   *  - Session ouverte (contexte.utilisateur présent) : on résout le compte.
   *    S'il porte une fiche personnel (personnel_id), on renvoie cette fiche
   *    (id PER-…, prénom, nom, attestations) ; sinon (compte ADMIN amorcé en
   *    CLI, personnel encore vide) un objet minimal de MÊME forme — c'est ce
   *    qui débloque le wizard sur une base fraîche. Dans les deux cas,
   *    roleApp = le rôle de la SESSION (jamais celui de la fiche) : c'est ce
   *    rôle qui gouverne les gardes serveur (garderRole), le front
   *    (peutValider) doit raisonner sur le même.
   *  - Contexte sans session utilisateur mais avec un rôle (harnais de contrat,
   *    ou DemoStore qui n'a aucune notion de session) : repli HISTORIQUE =
   *    premier REFERENT du personnel, Error s'il n'y en a pas — comportement
   *    d'avant E5, préservé pour la PARITÉ avec le DemoStore. NB : depuis le
   *    lot A, ce repli n'est plus atteignable par une lecture HTTP anonyme
   *    (traiterApi exige une session pour tout get*) ; seuls les appels
   *    in-process (harnais-contrat) l'empruntent encore.
   */
  getUtilisateurCourant(_params, contexte) {
    const idCompte = contexte?.utilisateur ?? null;
    if (idCompte) {
      return utilisateurDeSession(idCompte, contexte.role ?? null);
    }
    const ligne = db.get(
      `SELECT * FROM personnel WHERE role_applicatif = 'REFERENT'
       ORDER BY rowid LIMIT 1`);
    if (!ligne) throw new Error('Aucun référent dans le personnel.');
    return mapping.versFront('personnel', ligne);
  },

  // === personnel (VAGUE 3) ==================================

  /**
   * Crée une personne. roleApp par défaut : ELEVE si typePersonne ELEVE,
   * sinon ENSEIGNANT (le test crée un référent via roleApp explicite).
   */
  createPersonne(params) {
    const d = params.donneesPersonne || {};
    if (!d.nom || !String(d.nom).trim()) {
      throw new Error('Nom de la personne obligatoire.');
    }
    if (!d.prenom || !String(d.prenom).trim()) {
      throw new Error('Prénom de la personne obligatoire.');
    }
    if (!TYPES_PERSONNE.includes(d.typePersonne)) {
      throw new Error(
        `Type de personne obligatoire parmi : ${TYPES_PERSONNE.join(', ')}.`);
    }
    const personne = {
      id: db.generateId('PER'),
      nom: String(d.nom).trim(),
      prenom: String(d.prenom).trim(),
      typePersonne: d.typePersonne,
      roleApp: d.roleApp ??
        (d.typePersonne === 'ELEVE' ? 'ELEVE' : 'ENSEIGNANT'),
      numAttestationAptitude: d.numAttestationAptitude ?? null,
      organismeDelivreur: d.organismeDelivreur ?? null,
      dateObtention: d.dateObtention ?? null,
      dateFinValidite: d.dateFinValidite ?? null,
      categorie2008: verifierCategorie(d.categorie2008, 'la grille 2008'),
      categorie2025: verifierCategorie(d.categorie2025, 'la grille 2025',
        CATEGORIES_2025),
      activitesAutorisees: verifierActivites(d.activitesAutorisees),
      actif: d.actif !== false,
      email: d.email ?? null
    };
    return muter(() => {
      amorcerEtablissement();
      const ligne = mapping.versSql('personnel', personne);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('personnel', ligne);
      journaliser(d.operateur, 'CREATION_PERSONNE',
        `${personne.prenom} ${personne.nom}`, personne.typePersonne);
      return lirePersonne(personne.id);
    });
  },

  updatePersonne(params) {
    const { id } = params;
    const d = params.donneesPersonne || {};
    trouverPersonne(id);
    // Lot E2 : une fiche au coffre est VERROUILLÉE côté store (l'écran
    // seul ne suffit pas — « le store reste seul juge »).
    if (estAuCoffreServeur(id)) throw new Error(coffre.MSG_FICHE_AU_COFFRE);
    if (d.typePersonne !== undefined &&
        !TYPES_PERSONNE.includes(d.typePersonne)) {
      throw new Error(
        `Type de personne inconnu : ${d.typePersonne} ` +
        `(attendu : ${TYPES_PERSONNE.join(', ')}).`);
    }
    if (d.categorie2008 !== undefined) {
      verifierCategorie(d.categorie2008, 'la grille 2008');
    }
    if (d.categorie2025 !== undefined) {
      verifierCategorie(d.categorie2025, 'la grille 2025', CATEGORIES_2025);
    }
    if (d.activitesAutorisees !== undefined) {
      verifierActivites(d.activitesAutorisees);
    }
    const CHAMPS = ['nom', 'prenom', 'typePersonne', 'roleApp',
      'numAttestationAptitude', 'organismeDelivreur', 'dateObtention',
      'dateFinValidite', 'categorie2008', 'categorie2025',
      'activitesAutorisees', 'actif', 'email'];
    const patch = {};
    for (const champ of CHAMPS) {
      if (d[champ] !== undefined) patch[champ] = d[champ];
    }
    return muter(() => {
      majParId('personnel', id, mapping.versSql('personnel', patch));
      const personne = lirePersonne(id);
      // Champs dans l'ordre de SAISIE de l'appelant (comme le DemoStore :
      // Object.keys(d) filtré), pas l'ordre canonique de la liste blanche.
      journaliser(d.operateur, 'MODIFICATION_PERSONNE',
        `${personne.prenom} ${personne.nom}`,
        `Champs : ${Object.keys(d).filter((c) => CHAMPS.includes(c)).join(', ')}`);
      return personne;
    });
  },

  desactiverPersonne(params) {
    const { id } = params;
    const personne = trouverPersonne(id);
    // Lot E2 : fiche au coffre = intouchable (déjà inactive de toute façon).
    if (estAuCoffreServeur(id)) throw new Error(coffre.MSG_FICHE_AU_COFFRE);
    if (!personne.actif) {
      throw new Error(
        `${personne.prenom} ${personne.nom} est déjà désactivé(e).`);
    }
    return muter(() => {
      majParId('personnel', id, { actif: 0 });
      journaliser(params.par, 'DESACTIVATION_PERSONNE',
        `${personne.prenom} ${personne.nom}`,
        'Désactivation (la personne reste au registre : aucune suppression)');
      return lirePersonne(id);
    });
  },

  // === coffre des identités (lot E2 — RGPD, minimisation réversible) ===
  // Tous les gestes (sauf l'état) exigent le POSTE LOCAL (la phrase ne
  // traverse jamais le réseau du lycée — HTTP sans chiffrement de
  // transport) et le niveau REFERENT/ADMIN. Aides : bloc « coffre des
  // identités » en bas de ce fichier.

  etatCoffre() {
    const lignes = db.all(
      `SELECT personnel_id, pseudonyme, date_mise_a_labri
       FROM coffre_identites`);
    const identites = lignes
      .map((l) => ({
        personnelId: l.personnel_id,
        pseudonyme: l.pseudonyme,
        dateMiseALabri: l.date_mise_a_labri
      }))
      .sort((a, b) => (a.pseudonyme < b.pseudonyme ? -1 : 1));
    const auCoffre = new Set(identites.map((i) => i.personnelId));
    const candidats = HANDLERS.getPersonnel()
      .filter((p) => coffre.estFicheEchue(p) && !auCoffre.has(p.id))
      .map((p) => p.id);
    return {
      coffreCree: parametres.lire('coffre_temoin') !== null,
      nombreAuCoffre: identites.length,
      identites,
      candidats
    };
  },

  verifierCodeCoffre(params) {
    verifierPosteLocalCoffre();
    const cle = verifierPhraseCoffreServeur(params.phrase);
    cle.fill(0);
    return { ok: true };
  },

  mettreAuCoffre(params) {
    verifierPosteLocalCoffre();
    const ids = Array.isArray(params.personnelIds) ? params.personnelIds : [];
    if (ids.length === 0) {
      throw new Error('Aucune identité à mettre à l\'abri.');
    }
    const options = params.options || {};
    const phrase = params.phrase;

    // Vérifications AVANT tout effet : fiches existantes, aucune au coffre.
    const personnes = ids.map((id) => trouverPersonne(id));
    for (const p of personnes) {
      if (estAuCoffreServeur(p.id)) {
        throw new Error(coffre.MSG_DEJA_AU_COFFRE);
      }
    }

    // BLOQUANT n°2 de la revue de conception : une ARCHIVE complète
    // vérifiée AVANT toute purge disque — sans elle, restaurer un
    // instantané (base seule) laisserait une base nominative pointant des
    // scans disparus à jamais.
    assurerArchiveFraichePourCoffre();

    // Coffre : créé au premier geste (sel + témoin), vérifié ensuite.
    // La dérivation scrypt (~1 s) se fait ICI, HORS transaction.
    let sel;
    let cle;
    if (parametres.lire('coffre_temoin') === null) {
      if (typeof phrase !== 'string' ||
          phrase.length < coffre.LONGUEUR_MIN_PHRASE_COFFRE) {
        throw new Error(coffre.MSG_PHRASE_TROP_COURTE);
      }
      sel = crypto.randomBytes(16);
      cle = chiffrementCoffre.deriverCleCoffre(phrase, sel);
    } else {
      cle = verifierPhraseCoffreServeur(phrase);
      sel = Buffer.from(parametres.lire('coffre_sel'), 'hex');
    }

    const annee = options.annee ?? new Date().getFullYear();
    const misAuCoffre = [];
    const cheminsAPurger = [];
    try {
      muter(() => {
        // Création du coffre (premier geste) : sel + témoin + paramètres
        // de dérivation consignés — DANS la transaction (tout ou rien).
        if (parametres.lire('coffre_temoin') === null) {
          parametres.ecrire('coffre_sel', sel.toString('hex'));
          parametres.ecrire('coffre_kdf',
            `scrypt-N${chiffrementCoffre.SCRYPT_N_COFFRE}-r8-p1`);
          const temoin = chiffrementCoffre.chiffrerChampCoffre(
            Buffer.from(coffre.TEXTE_TEMOIN, 'utf8'), cle, sel,
            coffre.AAD_TEMOIN);
          parametres.ecrire('coffre_temoin', temoin.toString('base64'));
        }

        for (const personne of personnes) {
          const numero = prochainNumeroCoffreServeur(annee);
          const pseudo = coffre.libellePseudonyme(annee, numero);
          const libelleAvant = `${personne.prenom} ${personne.nom}`.trim();

          // Octets des PJ de la personne (disque), embarqués chiffrés.
          const lignesPj = db.all(
            `SELECT * FROM pieces_jointes
             WHERE entite_type = 'personne' AND entite_id = ?`,
            [personne.id]);
          const piecesJointes = lignesPj.map((l) => {
            const pj = mapping.versFront('pieces_jointes', l);
            let base64 = null;
            try {
              base64 = fs
                .readFileSync(cheminPieceJointe(l.id)).toString('base64');
            } catch {
              base64 = null; // contenu disparu : métadonnées seules
            }
            return {
              nomFichier: pj.nomFichier,
              mimeType: pj.mimeType,
              categorie: pj.categorie ?? null,
              hashSha256: pj.hashSha256 ?? null,
              base64
            };
          });

          // Identifiant de connexion du compte lié (rangé dans l'enveloppe).
          const compte = db.get(
            'SELECT id, login FROM utilisateurs_app WHERE personnel_id = ?',
            [personne.id]);

          const identite = coffre.assemblerIdentite(personne, {
            identifiantConnexion: compte ? compte.login : null,
            piecesJointes
          });
          const enveloppe = chiffrementCoffre.chiffrerChampCoffre(
            Buffer.from(JSON.stringify(identite), 'utf8'), cle, sel,
            coffre.aadIdentite(personne.id, pseudo.libelle));

          db.run(
            `INSERT INTO coffre_identites (id, personnel_id, pseudonyme,
               enveloppe, date_mise_a_labri, etablissement_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [db.generateId('COF'), personne.id, pseudo.libelle, enveloppe,
              new Date().toISOString(), ID_ETABLISSEMENT]);

          // Pseudonymisation de la fiche (id INTACT, actif=0 — la fiche
          // sort des sélecteurs du wizard) — AVANT tout événement
          // journalisé : plus aucun nom réel n'entre au journal.
          majParId('personnel', personne.id, mapping.versSql('personnel',
            coffre.pseudonymiserFiche(annee, numero)));
          db.run(
            'UPDATE personnel SET signature_chemin = NULL WHERE id = ?',
            [personne.id]);

          // Brouillons/soumis de la personne : le nom en clair est HORS
          // empreinte tant que l'écriture n'est pas figée — réécrit. La
          // branche par TEXTE ne vaut que sans porteur identifié (jamais
          // le brouillon d'un homonyme) ; la révision est INCRÉMENTÉE :
          // les signatures posées deviennent honnêtement PÉRIMÉES (le
          // document présenté aux signataires a changé — invariant C1).
          db.run(
            `UPDATE mouvements SET technicien = ?,
               revision_brouillon = COALESCE(revision_brouillon, 0) + 1
             WHERE statut IN ('BROUILLON','SOUMIS')
               AND (execute_par_id = ?
                    OR (execute_par_id IS NULL AND technicien = ?))`,
            [pseudo.libelle, personne.id, libelleAvant]);

          // Contrôles d'étanchéité : la table n'est NI scellée NI WORM —
          // l'opérateur en clair est réécrit (ferme AUSSI getControles et
          // l'export E1 : fuite prouvée par la revue adversariale). Même
          // clause anti-homonyme.
          db.run(
            `UPDATE controles SET operateur = ?
             WHERE operateur_id = ?
                OR (operateur_id IS NULL AND operateur = ?)`,
            [pseudo.libelle, personne.id, libelleAvant]);

          // PJ de la personne : lignes supprimées, fichiers en liste de
          // purge (rejouée au démarrage — jamais de scan en clair orphelin).
          for (const l of lignesPj) {
            db.run('DELETE FROM pieces_jointes WHERE id = ?', [l.id]);
            const chemin = cheminPieceJointe(l.id);
            db.run(
              `INSERT INTO coffre_purge_en_attente (id, chemin)
               VALUES (?, ?)`,
              [db.generateId('PRG'), chemin]);
            cheminsAPurger.push(chemin);
          }

          // Compte lié : identifiant remplacé par le pseudonyme, compte
          // désactivé (la session meurt — mécanique existante).
          if (compte) {
            db.run(
              'UPDATE utilisateurs_app SET login = ?, actif = 0 WHERE id = ?',
              [pseudo.connexion, compte.id]);
          }

          // Journal : pseudonyme + identifiant, JAMAIS le nom (piège n°1 —
          // le journal est append-only à jamais).
          journaliser(null, 'COFFRE_MISE_A_L_ABRI',
            `${pseudo.libelle} (${personne.id})`,
            'Identité mise à l\'abri (coffre chiffré)');
          misAuCoffre.push({ personnelId: personne.id,
            pseudonyme: pseudo.libelle });
        }
      });
    } finally {
      cle.fill(0);
    }

    // APRÈS COMMIT : purge disque best-effort ; tout raté est rattrapé au
    // prochain démarrage (rejouerPurgeCoffre).
    purgerFichiersCoffre(cheminsAPurger);
    return { misAuCoffre };
  },

  consulterIdentiteCoffre(params) {
    verifierPosteLocalCoffre();
    const { personnelId, phrase, motif } = params;
    if (typeof motif !== 'string' || !motif.trim()) {
      throw new Error(coffre.MSG_MOTIF_OBLIGATOIRE);
    }
    const ligne = db.get(
      'SELECT * FROM coffre_identites WHERE personnel_id = ?', [personnelId]);
    if (!ligne) throw new Error(coffre.MSG_PAS_AU_COFFRE);
    const identite = dechiffrerIdentiteCoffre(ligne, phrase);
    journaliser(null, 'COFFRE_CONSULTATION',
      `${ligne.pseudonyme} (${personnelId})`, `Motif : ${motif.trim()}`);
    return identite;
  },

  restaurerIdentiteCoffre(params) {
    verifierPosteLocalCoffre();
    const { personnelId, phrase, motif } = params;
    if (typeof motif !== 'string' || !motif.trim()) {
      throw new Error(coffre.MSG_MOTIF_OBLIGATOIRE);
    }
    const ligne = db.get(
      'SELECT * FROM coffre_identites WHERE personnel_id = ?', [personnelId]);
    if (!ligne) throw new Error(coffre.MSG_PAS_AU_COFFRE);
    const identite = dechiffrerIdentiteCoffre(ligne, phrase);

    // Tri des pièces AVANT toute écriture : hash revérifié quand connu.
    // Une pièce ALTÉRÉE n'empêche JAMAIS la restauration (sinon l'identité
    // resterait verrouillée à perpétuité sous un message de code trompeur) :
    // elle est SAUTÉE, signalée dans le retour et au journal.
    const piecesSaines = [];
    const piecesAlterees = [];
    for (const pj of (identite.piecesJointes ?? [])) {
      if (!pj.base64) continue;
      const octets = Buffer.from(pj.base64, 'base64');
      const hash = crypto.createHash('sha256').update(octets).digest('hex');
      if (pj.hashSha256 && hash !== pj.hashSha256) {
        piecesAlterees.push(pj.nomFichier);
      } else {
        piecesSaines.push({ pj, octets, hash });
      }
    }

    // Le disque n'est pas transactionnel : les fichiers écrits sont
    // COLLECTÉS et, si la transaction échoue, SUPPRIMÉS avant de relancer
    // (jamais un scan en clair orphelin — symétrique de la mise à l'abri).
    const fichiersEcrits = [];
    let resultat;
    try {
      resultat = muter(() => {
        // La fiche redevient ce qu'elle était (actif d'origine compris).
        majParId('personnel', personnelId, mapping.versSql('personnel',
          coffre.restaurerIdentite(identite)));

        for (const { pj, octets, hash } of piecesSaines) {
          const pjId = db.generateId('PJ');
          ecrirePieceJointeSurDisque(pjId, octets);
          fichiersEcrits.push(cheminPieceJointe(pjId));
          db.run(
            `INSERT INTO pieces_jointes (id, entite_type, entite_id,
               categorie, nom_fichier, mime_type, taille_octets, hash_sha256,
               date_ajout, ajoute_par, chemin, etablissement_id)
             VALUES (?, 'personne', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
            [pjId, personnelId, pj.categorie ?? 'AUTRE', pj.nomFichier,
              pj.mimeType, octets.length, hash, new Date().toISOString(),
              pjId, ID_ETABLISSEMENT]);
        }

        // Identifiant de connexion restauré — le compte RESTE désactivé (la
        // restauration d'identité n'est pas une réactivation d'accès).
        if (identite.identifiantConnexion) {
          const compte = db.get(
            'SELECT id FROM utilisateurs_app WHERE personnel_id = ?',
            [personnelId]);
          if (compte) {
            db.run('UPDATE utilisateurs_app SET login = ? WHERE id = ?',
              [identite.identifiantConnexion, compte.id]);
          }
        }

        // La ligne du coffre disparaît ; le compteur MONOTONE ne redescend
        // jamais (le pseudonyme n'est pas réattribué).
        db.run('DELETE FROM coffre_identites WHERE personnel_id = ?',
          [personnelId]);
        journaliser(null, 'COFFRE_RESTAURATION',
          `${ligne.pseudonyme} (${personnelId})`,
          `Motif : ${motif.trim()}` + (piecesAlterees.length
            ? ` · ${piecesAlterees.length} pièce(s) altérée(s) non restituée(s)`
            : ''));
        return lirePersonne(personnelId);
      });
    } catch (erreur) {
      for (const chemin of fichiersEcrits) {
        try { fs.rmSync(chemin, { force: true }); } catch { /* best-effort */ }
      }
      throw erreur;
    }
    if (piecesAlterees.length > 0) {
      resultat.piecesAlterees = piecesAlterees;
    }
    return resultat;
  },

  changerPhraseCoffre(params) {
    verifierPosteLocalCoffre();
    const { anciennePhrase, nouvellePhrase } = params;
    const ancienneCle = verifierPhraseCoffreServeur(anciennePhrase);
    if (typeof nouvellePhrase !== 'string' ||
        nouvellePhrase.length < coffre.LONGUEUR_MIN_PHRASE_COFFRE) {
      ancienneCle.fill(0);
      throw new Error(coffre.MSG_PHRASE_TROP_COURTE);
    }
    const ancienSel = Buffer.from(parametres.lire('coffre_sel'), 'hex');
    const nouveauSel = crypto.randomBytes(16);
    let nouvelleCle = null;
    try {
      nouvelleCle = chiffrementCoffre.deriverCleCoffre(
        nouvellePhrase, nouveauSel);
      return muter(() => {
        const lignes = db.all('SELECT * FROM coffre_identites');
        for (const ligne of lignes) {
          // Déchiffrer (autoportance : le sel de l'enveloppe fait foi) puis
          // re-sceller sous la nouvelle clé. Une enveloppe illisible LÈVE :
          // ROLLBACK global, rien ne bouge, ancien témoin intact.
          const aad = coffre.aadIdentite(ligne.personnel_id, ligne.pseudonyme);
          const enveloppe = Buffer.from(ligne.enveloppe);
          const selEnveloppe =
            chiffrementCoffre.decomposerChampCoffre(enveloppe).sel;
          const octets = selEnveloppe.equals(ancienSel)
            ? chiffrementCoffre.dechiffrerChampCoffreAvecCle(
              enveloppe, ancienneCle, aad)
            : chiffrementCoffre.dechiffrerChampCoffre(
              enveloppe, anciennePhrase, aad);
          const neuve = chiffrementCoffre.chiffrerChampCoffre(
            octets, nouvelleCle, nouveauSel, aad);
          db.run('UPDATE coffre_identites SET enveloppe = ? WHERE id = ?',
            [neuve, ligne.id]);
        }
        parametres.ecrire('coffre_sel', nouveauSel.toString('hex'));
        const temoin = chiffrementCoffre.chiffrerChampCoffre(
          Buffer.from(coffre.TEXTE_TEMOIN, 'utf8'), nouvelleCle, nouveauSel,
          coffre.AAD_TEMOIN);
        parametres.ecrire('coffre_temoin', temoin.toString('base64'));
        journaliser(null, 'COFFRE_CHANGEMENT_PHRASE', 'coffre',
          `${lignes.length} enveloppe(s) re-scellée(s)`);
        return { ok: true, nombreRechiffre: lignes.length };
      });
    } finally {
      ancienneCle.fill(0);
      if (nouvelleCle) nouvelleCle.fill(0);
    }
  },

  // === habilitations F-Gas (multi-régime 2008/2025) — chantier B2 ===

  getHabilitations() {
    const lignes = db.all(
      'SELECT * FROM habilitations WHERE etablissement_id = ?',
      [ID_ETABLISSEMENT]);
    return lignes
      .map((l) => mapping.versFront('habilitations', l))
      .sort(comparerHabilitations);
  },

  createHabilitation(params) {
    const d = params.donneesHabilitation || {};
    const personne = trouverPersonne(d.personneId);
    // Lot E2 : pas de NOUVEL identifiant indirect (n° d'attestation +
    // organisme) sur une fiche au coffre ; la révocation, elle, reste
    // permise (geste de conformité, aucune donnée nouvelle).
    if (estAuCoffreServeur(personne.id)) {
      throw new Error(coffre.MSG_FICHE_AU_COFFRE);
    }
    verifierRegime(d.regime);
    verifierCategorieHabilitation(d.regime, d.categorie);
    verifierDelivrance2008(d.regime, d.dateDebut);
    verifierRemiseNiveau(d.remiseNiveauLe);
    const habilitation = {
      id: db.generateId('HAB'),
      personneId: personne.id,
      regime: d.regime,
      categorie: d.categorie,
      numeroAttestation: d.numeroAttestation ?? null,
      organismeDelivreur: d.organismeDelivreur ?? null,
      dateDebut: d.dateDebut ?? null,
      dateFin: d.dateFin ?? null,
      // L4/Q3 (RN-2) : remise à niveau ponctuelle (arrêté du 21/11/2025
      // art. 7) — enregistrable dès la création (saisie d'historique).
      remiseNiveauLe: d.remiseNiveauLe ?? null,
      remiseNiveauOrganisme: d.remiseNiveauOrganisme ?? null,
      // Invariant : active à la création (désactivation via revoquerHabilitation).
      actif: true,
      dateRevocation: null
    };
    return muter(() => {
      const ligne = mapping.versSql('habilitations', habilitation);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('habilitations', ligne);
      journaliser(d.operateur, 'CREATION_HABILITATION',
        `${personne.prenom} ${personne.nom}`, `${d.regime} ${d.categorie}`);
      return trouverHabilitation(habilitation.id);
    });
  },

  updateHabilitation(params) {
    const { id } = params;
    const d = params.donneesHabilitation || {};
    const habilitation = trouverHabilitation(id);
    // Lot E2 : fiche au coffre → pas de retouche d'identifiant indirect.
    if (estAuCoffreServeur(habilitation.personneId)) {
      throw new Error(coffre.MSG_FICHE_AU_COFFRE);
    }
    // Régime et catégorie INTOUCHABLES (correction de coquille, pas d'identité).
    // L4/Q3 : la remise à niveau se corrige aussi (même statut qu'une date).
    // Revue L4 — les gardes de création valent AUSSI en correction : le
    // contournement « créer légal puis patcher illégal » est fermé.
    if (d.dateDebut !== undefined) {
      verifierDelivrance2008(habilitation.regime, d.dateDebut);
    }
    if (d.remiseNiveauLe !== undefined) {
      verifierRemiseNiveau(d.remiseNiveauLe);
    }
    const CHAMPS = ['numeroAttestation', 'organismeDelivreur',
      'dateDebut', 'dateFin', 'remiseNiveauLe', 'remiseNiveauOrganisme'];
    const patch = {};
    for (const champ of CHAMPS) {
      if (d[champ] !== undefined) patch[champ] = d[champ];
    }
    return muter(() => {
      majParId('habilitations', id, mapping.versSql('habilitations', patch));
      const habilitation = trouverHabilitation(id);
      journaliser(d.operateur, 'MODIFICATION_HABILITATION',
        `${habilitation.regime} ${habilitation.categorie}`,
        `Champs : ${Object.keys(d).filter((c) => CHAMPS.includes(c)).join(', ')}`);
      return habilitation;
    });
  },

  revoquerHabilitation(params) {
    const { id } = params;
    const habilitation = trouverHabilitation(id);
    // Double révocation refusée (préserve la date de retrait d'origine).
    if (!habilitation.actif) {
      throw new Error('Habilitation déjà révoquée.');
    }
    return muter(() => {
      majParId('habilitations', id,
        { actif: 0, date_revocation: aujourdHui() });
      journaliser(params.par, 'RETRAIT_HABILITATION',
        `${habilitation.regime} ${habilitation.categorie}`,
        'Révocation (l’habilitation reste au registre : aucune suppression)');
      return trouverHabilitation(id);
    });
  },

  // === mentions de formation complémentaire (par fluide) — brique 1 ===

  getMentions() {
    const lignes = db.all(
      'SELECT * FROM mentions_habilitation WHERE etablissement_id = ?',
      [ID_ETABLISSEMENT]);
    return lignes
      .map((l) => mapping.versFront('mentions_habilitation', l))
      .sort(comparerMentions);
  },

  createMention(params) {
    const d = params.donneesMention || {};
    const personne = trouverPersonne(d.personneId);
    // Lot E2 : fiche au coffre → pas de nouvel identifiant indirect.
    if (estAuCoffreServeur(personne.id)) {
      throw new Error(coffre.MSG_FICHE_AU_COFFRE);
    }
    verifierFluideMention(d.fluideMention);
    const mention = {
      id: db.generateId('MEN'),
      personneId: personne.id,
      fluideMention: d.fluideMention,
      numeroAttestation: d.numeroAttestation ?? null,
      organismeDelivreur: d.organismeDelivreur ?? null,
      dateDebut: d.dateDebut ?? null,
      dateFin: d.dateFin ?? null,
      // Invariant : active à la création (désactivation via revoquerMention).
      actif: true,
      dateRevocation: null
    };
    return muter(() => {
      const ligne = mapping.versSql('mentions_habilitation', mention);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('mentions_habilitation', ligne);
      journaliser(d.operateur, 'CREATION_MENTION',
        `${personne.prenom} ${personne.nom}`, `Mention ${d.fluideMention}`);
      return trouverMention(mention.id);
    });
  },

  revoquerMention(params) {
    const { id } = params;
    const mention = trouverMention(id);
    // Double révocation refusée (préserve la date de retrait d'origine).
    if (!mention.actif) {
      throw new Error('Mention déjà révoquée.');
    }
    return muter(() => {
      majParId('mentions_habilitation', id,
        { actif: 0, date_revocation: aujourdHui() });
      journaliser(params.par, 'RETRAIT_MENTION',
        `Mention ${mention.fluideMention}`,
        'Révocation (la mention reste au registre : aucune suppression)');
      return trouverMention(id);
    });
  },

  // === référentiel des fluides (P1-2) =======================
  // Le référent administre ses gaz LUI-MÊME : plus besoin d'une migration
  // (donc d'un développeur) pour corriger un PRP ou déclarer un fluide.
  // Sémantique = copie EXACTE du DemoStore (createFluide).

  createFluide(params) {
    const d = params.donneesFluide || {};
    const code = String(d.code ?? '').trim();
    const texteOuNull = (v) => (v !== undefined && v !== null
      && String(v).trim() !== '' ? String(v).trim() : null);
    const boolOuNull = (v) => (v === undefined || v === null
      ? null : Boolean(v));
    const fiche = {
      code,
      famille: String(d.famille ?? '').trim(),
      gwpAr4: d.gwpAr4,
      classeSecurite: String(d.classeSecurite ?? '').trim(),
      statutReglementaire: texteOuNull(d.statutReglementaire) ?? 'AUTORISE',
      commentaire: texteOuNull(d.commentaire),
      contientHfc: boolOuNull(d.contientHfc),
      contientHfo: boolOuNull(d.contientHfo),
      categorieCadre7: texteOuNull(d.categorieCadre7),
      sourcePrp: texteOuNull(d.sourcePrp)
    };
    verifierFicheFluide(fiche);
    // Unicité du CODE : comparaison insensible aux espaces, tirets et
    // casse (« R-32 » et « R32 » sont le même gaz), mais la casse saisie
    // est conservée telle quelle (R-1234yf). Le PRIMARY KEY seul ne
    // suffirait pas : il laisserait passer « R32 » à côté de « R-32 ».
    const normalise = codeFluideNormalise(code);
    const doublon = db.all('SELECT code FROM fluides')
      .some((l) => codeFluideNormalise(l.code) === normalise);
    if (doublon) {
      throw new Error(`Code de fluide déjà utilisé : ${code}.`);
    }
    const fluide = { ...fiche, gwpAr4: Number(d.gwpAr4), actif: true };
    return muter(() => {
      inserer('fluides', mapping.versSql('fluides', fluide));
      journaliser(d.operateur, 'CREATION_FLUIDE', fluide.code,
        `PRP ${fluide.gwpAr4} · ${fluide.famille} · ${fluide.classeSecurite}`
        + (fluide.sourcePrp ? ` · source ${fluide.sourcePrp}` : ''));
      return ficheFluideComplete(fluide.code);
    });
  },

  updateFluide(params) {
    const code = params.code;
    const fluide = lireFluide(code);
    if (!fluide) {
      throw new Error(`Fluide introuvable au référentiel : ${code}.`);
    }
    const d = params.donneesFluide || {};
    // Le CODE est FIGÉ : il est la clé étrangère de huit tables, dont des
    // écritures scellées. Le renommer les briserait. Corriger une faute de
    // frappe = créer le bon code puis désactiver le mauvais.
    if (d.code !== undefined && String(d.code).trim() !== code) {
      throw new Error('Le code d’un fluide ne se modifie pas : il est '
        + 'référencé par les machines, les bouteilles et les écritures '
        + 'scellées. Créez le bon code, puis désactivez celui-ci.');
    }
    // D4 — dès que le PRP change, la SOURCE doit être saisie explicitement
    // (miroir du DemoStore) : une valeur ajustée localement ne garde jamais
    // l'étiquette officielle de l'ancienne.
    const prpChange = d.gwpAr4 !== undefined
      && Number(d.gwpAr4) !== Number(fluide.gwpAr4);
    if (prpChange && (d.sourcePrp === undefined
        || String(d.sourcePrp ?? '').trim() === '')) {
      throw new Error('PRP modifié : la source du PRP doit être saisie '
        + '(elle décrit la valeur retenue — une valeur ajustée localement '
        + 'ne garde jamais l’étiquette d’une source officielle).');
    }
    const texteOuNull = (v) => (v !== undefined && v !== null
      && String(v).trim() !== '' ? String(v).trim() : null);
    const CHAMPS_TEXTE = ['famille', 'classeSecurite', 'statutReglementaire',
      'commentaire', 'categorieCadre7', 'sourcePrp'];
    const patch = {};
    for (const champ of CHAMPS_TEXTE) {
      if (d[champ] !== undefined) patch[champ] = texteOuNull(d[champ]);
    }
    if (d.gwpAr4 !== undefined) patch.gwpAr4 = Number(d.gwpAr4);
    for (const champ of ['contientHfc', 'contientHfo']) {
      if (d[champ] !== undefined) {
        patch[champ] = d[champ] === null ? null : Boolean(d[champ]);
      }
    }
    if (d.actif !== undefined) patch.actif = Boolean(d.actif);
    // La fiche est vérifiée APRÈS fusion : une modification partielle ne
    // doit pas pouvoir rendre l'ensemble incohérent.
    verifierFicheFluide({ ...fluide, ...patch });
    const modifies = Object.keys(patch);
    return muter(() => {
      if (modifies.length > 0) {
        const ligne = mapping.versSql('fluides', patch);
        const colonnes = Object.keys(ligne);
        db.run(
          `UPDATE fluides SET ${colonnes.map((c) => `${c} = ?`).join(', ')} `
          + 'WHERE code = ?',
          [...colonnes.map((c) => ligne[c]), code]);
      }
      const relu = ficheFluideComplete(code);
      journaliser(d.operateur, 'MODIFICATION_FLUIDE', code,
        `Champs : ${modifies.join(', ')}`
        + (prpChange ? ` · PRP ${relu.gwpAr4} (source : ${relu.sourcePrp})`
          : ''));
      return relu;
    });
  },

  // === clients détenteurs (VAGUE 3) =========================

  createClient(params) {
    const d = params.donneesClient || {};
    const raisonSociale = String(d.raisonSociale || '').trim();
    if (!raisonSociale) {
      throw new Error('Raison sociale obligatoire.');
    }
    const adresse = String(d.adresse || '').trim();
    if (!adresse) {
      throw new Error('Adresse obligatoire.');
    }
    // SIRET OPTIONNEL (référence client allégée) : validé SEULEMENT s'il est
    // renseigné — un petit client ou un particulier n'en a pas forcément.
    const siret = String(d.siret || '').trim();
    if (siret && !/^\d{14}$/.test(siret.replace(/[\s.-]/g, ''))) {
      throw new Error('SIRET invalide : 14 chiffres attendus.');
    }
    const texteOuNull = (v) => (v !== undefined && String(v).trim() !== ''
      ? String(v).trim() : null);
    const client = {
      id: db.generateId('CLI'),
      raisonSociale,
      adresse,
      siret,
      contact: texteOuNull(d.contact),
      email: texteOuNull(d.email),
      telephone: texteOuNull(d.telephone),
      codePublic: codePublicUnique('clients_detenteurs')
    };
    return muter(() => {
      const ligne = mapping.versSql('clients_detenteurs', client);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('clients_detenteurs', ligne);
      journaliser(d.operateur, 'CREATION_CLIENT', client.raisonSociale,
        siret ? `SIRET ${siret}` : 'sans SIRET');
      return lireClient(client.id);
    });
  },

  updateClient(params) {
    const { id } = params;
    const d = params.donneesClient || {};
    trouverClient(id);
    if (d.siret !== undefined && String(d.siret).trim() !== '' &&
        !/^\d{14}$/.test(String(d.siret).trim().replace(/[\s.-]/g, ''))) {
      throw new Error('SIRET invalide : 14 chiffres attendus.');
    }
    const CHAMPS_TEXTE = ['raisonSociale', 'adresse', 'siret', 'contact',
      'email', 'telephone'];
    const patch = {};
    for (const champ of CHAMPS_TEXTE) {
      if (d[champ] !== undefined) patch[champ] = String(d[champ]).trim();
    }
    // actif : booléen (désactivation/réactivation), jamais stringifié.
    if (d.actif !== undefined) patch.actif = Boolean(d.actif);
    return muter(() => {
      if (Object.keys(patch).length > 0) {
        majParId('clients_detenteurs', id,
          mapping.versSql('clients_detenteurs', patch));
      }
      const client = lireClient(id);
      journaliser(d.operateur, 'MODIFICATION_CLIENT', client.raisonSociale,
        `Champs : ${Object.keys(patch).join(', ')}`);
      return client;
    });
  },

  // === dossier opérateur (VAGUE 9) ==========================

  /**
   * Patch de l'établissement singleton (12 champs). Error si une catégorie
   * ou une activité déclarée est inconnue. Reprend updateEtablissement du
   * DemoStore (validations, journal, forme exacts).
   */
  updateEtablissement(params) {
    const d = params.patch || {};
    if (d.categoriesAutorisees !== undefined) {
      for (const categorie of d.categoriesAutorisees ?? []) {
        verifierCategorie(categorie, 'l’établissement');
      }
    }
    if (d.activitesAutorisees !== undefined) {
      verifierActivites(d.activitesAutorisees);
    }
    const CHAMPS = ['raisonSociale', 'siret', 'adresse',
      'numAttestationCapacite', 'organisme', 'dateDelivranceCapacite',
      'dateEcheanceCapacite', 'categoriesAutorisees', 'activitesAutorisees',
      'sitesCouverts', 'dernierAudit', 'prochainAudit'];
    const patch = {};
    for (const champ of CHAMPS) {
      if (d[champ] !== undefined) patch[champ] = d[champ];
    }
    return muter(() => {
      amorcerEtablissement();
      majParId('etablissements', ID_ETABLISSEMENT,
        mapping.versSql('etablissements', patch));
      const etablissement = HANDLERS.getEtablissement();
      // Ici (et SEULEMENT ici) le DemoStore journalise dans l'ordre de la
      // liste blanche (champsModifies construit en itérant CHAMPS) : les
      // clés de `patch` suivent déjà exactement cet ordre.
      journaliser(d.operateur, 'MODIFICATION_ETABLISSEMENT',
        etablissement.raisonSociale,
        `Champs : ${Object.keys(patch).join(', ')}`);
      return etablissement;
    });
  },

  /** Audits de l'organisme certificateur, triés date décroissante. */
  getAuditsOrganisme() {
    const lignes = db.all(
      'SELECT * FROM audits_etablissement ORDER BY date_audit DESC');
    return lignes.map((ligne) => mapping.versFront('audits_etablissement', ligne));
  },

  /**
   * Crée un audit ; met à jour le DERNIER audit connu de l'établissement
   * si celui-ci est plus récent (ou absent). Reprend createAuditOrganisme
   * du DemoStore (garde-fous, journal, forme exacts).
   */
  createAuditOrganisme(params) {
    const d = params.donneesAudit || {};
    if (!d.date) throw new Error('Date de l’audit obligatoire.');
    if (!d.organisme || !String(d.organisme).trim()) {
      throw new Error('Organisme certificateur obligatoire.');
    }
    if (!d.resultat || !String(d.resultat).trim()) {
      throw new Error('Résultat de l’audit obligatoire.');
    }
    const audit = {
      id: db.generateId('AUD'),
      date: d.date,
      organisme: String(d.organisme).trim(),
      resultat: String(d.resultat).trim(),
      remarques: d.remarques ?? null
    };
    return muter(() => {
      amorcerEtablissement();
      const ligne = mapping.versSql('audits_etablissement', audit);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('audits_etablissement', ligne);

      const etablissement = HANDLERS.getEtablissement();
      if (!etablissement.dernierAudit ||
          audit.date > etablissement.dernierAudit) {
        majParId('etablissements', ID_ETABLISSEMENT,
          { date_dernier_audit: audit.date });
      }
      journaliser(d.operateur, 'CREATION_AUDIT', audit.organisme,
        `${fmtDate(audit.date)} · ${audit.resultat}`);
      return mapping.versFront('audits_etablissement',
        db.get('SELECT * FROM audits_etablissement WHERE id = ?', [audit.id]));
    });
  },

  /** Toutes les non-conformités (aucun tri contractuel imposé). */
  getNonConformites() {
    const lignes = db.all(
      'SELECT * FROM non_conformites ORDER BY date_constat, id');
    return lignes.map((ligne) => mapping.versFront('non_conformites', ligne));
  },

  /**
   * Crée une non-conformité, OUVERTE par défaut, rattachée à un audit
   * existant si fourni. Reprend createNonConformite du DemoStore.
   */
  createNonConformite(params) {
    const d = params.donneesNc || {};
    if (!d.description || !String(d.description).trim()) {
      throw new Error('Description de la non-conformité obligatoire.');
    }
    if (d.statut !== undefined && d.statut !== 'OUVERTE' &&
        d.statut !== 'SOLDEE') {
      throw new Error(
        'Statut de non-conformité inconnu : OUVERTE ou SOLDEE attendu.');
    }
    if (d.auditId) {
      const audit = db.get(
        'SELECT id FROM audits_etablissement WHERE id = ?', [d.auditId]);
      if (!audit) throw new Error(`Audit introuvable : ${d.auditId}.`);
    }
    const nonConformite = {
      id: db.generateId('NC'),
      auditId: d.auditId ?? null,
      description: String(d.description).trim(),
      actionCorrective: d.actionCorrective ?? null,
      echeance: d.echeance ?? null,
      statut: d.statut ?? 'OUVERTE',
      dateSolde: null,
      commentaireSolde: null
    };
    return muter(() => {
      amorcerEtablissement();
      const ligne = mapping.versSql('non_conformites', nonConformite);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('non_conformites', ligne);
      journaliser(d.operateur, 'CREATION_NON_CONFORMITE', nonConformite.id,
        nonConformite.description);
      return lireNonConformite(nonConformite.id);
    });
  },

  /** OUVERTE → SOLDEE, commentaire de preuve obligatoire. */
  solderNonConformite(params) {
    const { id, commentaire } = params;
    const nonConformite = lireNonConformite(id, true);
    if (nonConformite.statut === 'SOLDEE') {
      throw new Error('Non-conformité déjà soldée.');
    }
    if (!commentaire || !String(commentaire).trim()) {
      throw new Error('Commentaire de solde obligatoire (preuve de l’action).');
    }
    const commentaireNet = String(commentaire).trim();
    return muter(() => {
      majParId('non_conformites', id, {
        statut: 'SOLDEE',
        date_cloture: aujourdHui(),
        commentaire_solde: commentaireNet
      });
      journaliser(null, 'SOLDE_NON_CONFORMITE', nonConformite.id,
        commentaireNet);
      return lireNonConformite(id);
    });
  },

  // === outillage réglementaire (VAGUE 9) ====================

  /**
   * Crée un outil, statut RECALCULÉ à la création (aujourd'hui). Reprend
   * createOutil du DemoStore (garde-fous, défauts croisés étalonnage/
   * vérification, journal exacts).
   */
  createOutil(params) {
    const d = params.donneesOutil || {};
    if (!TYPES_OUTIL.includes(d.typeOutil)) {
      throw new Error(
        `Type d'outil obligatoire parmi : ${TYPES_OUTIL.join(', ')}.`);
    }
    if (!d.marque || !String(d.marque).trim()) {
      throw new Error('Marque de l’outil obligatoire.');
    }
    const outil = {
      id: db.generateId('OUT'),
      typeOutil: d.typeOutil,
      marque: String(d.marque).trim(),
      modele: d.modele ?? null,
      numSerie: d.numSerie ?? null,
      siteAtelier: d.siteAtelier ?? null,
      precision: d.precision ?? null,
      sensibilite: d.sensibilite ?? null,
      dateEtalonnage: d.dateEtalonnage ?? d.dateVerification ?? null,
      dateVerification: d.dateVerification ?? d.dateEtalonnage ?? null,
      prochaineEcheance: d.prochaineEcheance ?? null,
      codePublic: codePublicUnique('outillage'),
      statut: 'CONFORME'
    };
    outil.statut = calculerStatutOutil(outil, aujourdHui());
    return muter(() => {
      const ligne = mapping.versSql('outillage', outil);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('outillage', ligne);
      journaliser(d.operateur, 'CREATION_OUTIL',
        `${outil.marque} ${outil.modele ?? ''}`.trim(),
        `${outil.typeOutil} · échéance ${fmtDate(outil.prochaineEcheance)}`);
      return lireOutil(outil.id);
    });
  },

  /**
   * Patch un outil ; le statut découle TOUJOURS de l'échéance recalculée,
   * SAUF un outil déjà HORS_SERVICE (réforme définitive, jamais relevée).
   * Reprend updateOutil du DemoStore.
   */
  updateOutil(params) {
    const { id } = params;
    const outil = trouverOutil(id);
    const d = params.donneesOutil || {};
    if (d.typeOutil !== undefined && !TYPES_OUTIL.includes(d.typeOutil)) {
      throw new Error(
        `Type d'outil inconnu : ${d.typeOutil} ` +
        `(attendu : ${TYPES_OUTIL.join(', ')}).`);
    }
    const CHAMPS = ['typeOutil', 'marque', 'modele', 'numSerie',
      'siteAtelier', 'precision', 'sensibilite', 'dateEtalonnage',
      'dateVerification', 'prochaineEcheance'];
    const patch = {};
    for (const champ of CHAMPS) {
      if (d[champ] !== undefined) patch[champ] = d[champ];
    }
    return muter(() => {
      majParId('outillage', id, mapping.versSql('outillage', patch));
      // Le statut découle TOUJOURS de l'échéance (sauf réforme, HORS_SERVICE
      // permanent — calculerStatutOutil le renvoie tel quel dans ce cas).
      const outilMaj = { ...outil, ...patch };
      const nouveauStatut = calculerStatutOutil(outilMaj, aujourdHui());
      majParId('outillage', id, { statut: nouveauStatut });
      // Ordre de saisie de l'appelant, comme le DemoStore.
      journaliser(d.operateur, 'MODIFICATION_OUTIL',
        `${outilMaj.marque} ${outilMaj.modele ?? ''}`.trim(),
        `Champs : ${Object.keys(d).filter((c) => CHAMPS.includes(c)).join(', ')}`);
      return lireOutil(id);
    });
  },

  /** Réforme définitive d'un outil (HORS_SERVICE, jamais relevé). */
  reformerOutil(params) {
    const { id } = params;
    const outil = trouverOutil(id);
    if (outil.statut === 'HORS_SERVICE') {
      throw new Error('Outil déjà réformé (hors service).');
    }
    return muter(() => {
      majParId('outillage', id, { statut: 'HORS_SERVICE' });
      journaliser(params.par, 'REFORME_OUTIL',
        `${outil.marque} ${outil.modele ?? ''}`.trim(),
        'Outil réformé : hors service');
      return lireOutil(id);
    });
  },

  // === pièces jointes (VAGUE 10) =============================

  /**
   * Ajoute une pièce jointe : liste blanche MIME (IM-19), taille ≤ 5 Mo,
   * contenu décodé du base64 et ÉCRIT SUR DISQUE (dossier documents/ à côté
   * de la base), hash SHA-256 du contenu, métadonnées en table. Reprend
   * ajouterPieceJointe du DemoStore (garde-fous, journal exacts).
   */
  ajouterPieceJointe(params) {
    const d = params.donneesPj || {};
    if (!d.entiteType || !d.entiteId) {
      throw new Error(
        'Pièce jointe : entité liée obligatoire (type et identifiant).');
    }
    if (!d.nomFichier || !String(d.nomFichier).trim()) {
      throw new Error('Nom de fichier de la pièce jointe obligatoire.');
    }
    // Lot E2 : une fiche au coffre ne reçoit plus de pièce (un scan
    // nominatif neuf casserait la pseudonymisation) — verrou de store.
    if (d.entiteType === 'personne' && estAuCoffreServeur(d.entiteId)) {
      throw new Error(coffre.MSG_FICHE_AU_COFFRE);
    }
    // Lot C (C3c) : la catégorie du PDF conservé est RÉSERVÉE au canal
    // système de validerMouvement — jamais posée par un client (sinon une
    // fausse « pièce officielle » se glisserait dans le registre).
    if ((d.categorie ?? '') === CATEGORIE_PDF_FINAL) {
      throw new Error(
        'Catégorie CERFA_FINAL réservée au système (PDF final conservé '
        + 'à la validation officielle).');
    }
    // Lot C (C3c) : ASYMÉTRIE FERMÉE — une écriture FIGÉE ne reçoit plus
    // aucune pièce justificative (ses preuves sont scellées dans
    // hash_pieces_jointes, désormais RECOMPTÉ à l'import), symétrique du
    // refus de suppression. Miroir exact du DemoStore.
    if (d.entiteType === 'MOUVEMENT') {
      const mouvementCible = db.get(
        'SELECT statut FROM mouvements WHERE id = ?', [d.entiteId]);
      if (mouvementCible &&
          (mouvementCible.statut === 'VALIDE' ||
           mouvementCible.statut === 'ANNULE')) {
        throw new Error(
          'Écriture figée : elle ne peut plus recevoir de pièce '
          + 'justificative.');
      }
    }
    const mime = String(d.mimeType ?? '').toLowerCase();
    if (!PJ_TYPES_MIME.includes(mime)) {
      throw new Error(
        `Type de fichier refusé : ${d.mimeType || 'inconnu'}. ` +
        'Formats acceptés : PDF, PNG, JPEG, WebP.');
    }
    const contenuBase64 = d.base64 ?? d.blob;
    if (!contenuBase64) {
      throw new Error(
        'Contenu de la pièce jointe obligatoire (blob ou base64).');
    }
    const octets = decoderBase64Pj(contenuBase64);
    if (octets.length > PJ_TAILLE_MAX) {
      throw new Error(
        'Fichier trop volumineux : 5 Mo maximum par pièce jointe.');
    }
    // Audit-proof : la signature binaire réelle doit confirmer le type
    // déclaré (pas de HTML/exécutable déguisé en PDF ou image).
    if (!signatureConcordeAvecMime(octets, mime)) {
      throw new Error(MSG_SIGNATURE_PJ);
    }
    const pieceJointe = {
      id: db.generateId('PJ'),
      entiteType: d.entiteType,
      entiteId: d.entiteId,
      categorie: d.categorie ?? 'AUTRE',
      nomFichier: String(d.nomFichier).trim(),
      mimeType: mime,
      taille: octets.length,
      hashSha256: crypto.createHash('sha256').update(octets).digest('hex'),
      dateAjout: new Date().toISOString(),
      ajoutePar: d.ajoutePar ?? null
    };
    return muter(() => {
      // Lot C (C1) : une PJ ajoutée à un mouvement BROUILLON/SOUMIS modifie
      // la fiche présentée aux signataires → révision incrémentée, les
      // signatures posées deviennent PÉRIMÉES (invalidation par comparaison,
      // plan lot C §4 — bump EXPLICITE : mutation par table annexe).
      if (pieceJointe.entiteType === 'MOUVEMENT') {
        const mv = db.get(
          'SELECT statut, revision_brouillon FROM mouvements WHERE id = ?',
          [pieceJointe.entiteId]);
        if (mv && (mv.statut === 'BROUILLON' || mv.statut === 'SOUMIS')) {
          db.run('UPDATE mouvements SET revision_brouillon = ? WHERE id = ?',
            [(mv.revision_brouillon ?? 0) + 1, pieceJointe.entiteId]);
        }
      }
      ecrirePieceJointeSurDisque(pieceJointe.id, octets);
      const ligne = mapping.versSql('pieces_jointes', pieceJointe);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      // `chemin` = nom RELATIF dans documents/ (= l'id), comme le promet
      // schema.sql. Il ne sert QU'À dire « le contenu est présent » : le chemin
      // réel est toujours recalculé par cheminPieceJointe() — jamais lu d'ici.
      ligne.chemin = pieceJointe.id;
      inserer('pieces_jointes', ligne);
      journaliser(pieceJointe.ajoutePar, 'AJOUT_PIECE_JOINTE',
        `${pieceJointe.entiteType}/${pieceJointe.entiteId}`,
        `${pieceJointe.nomFichier} (${pieceJointe.taille} octets)`);
      return lirePieceJointe(pieceJointe.id);
    });
  },

  /** Métadonnées seules des pièces jointes d'une entité (contenu exclu). */
  listerPiecesJointes(params) {
    const { entiteType, entiteId } = params;
    const lignes = db.all(
      `SELECT * FROM pieces_jointes
       WHERE entite_type = ? AND entite_id = ? ORDER BY date_ajout`,
      [entiteType, entiteId]);
    return lignes.map((ligne) => mapping.versFront('pieces_jointes', ligne));
  },

  /** Métadonnées + contenu (base64 relu du disque) d'une pièce jointe. */
  obtenirPieceJointe(params) {
    const { id } = params;
    const ligne = db.get('SELECT * FROM pieces_jointes WHERE id = ?', [id]);
    if (!ligne) throw new Error(`Pièce jointe introuvable : ${id}.`);
    // `chemin` non nul = le contenu a été enregistré ; le chemin RÉEL est
    // recalculé (jamais celui de la donnée — cf. cheminPieceJointe).
    const chemin = ligne.chemin ? cheminPieceJointe(ligne.id) : null;
    if (!chemin || !fs.existsSync(chemin)) {
      throw new Error(
        `Contenu de la pièce jointe introuvable : ${ligne.nom_fichier}.`);
    }
    const octets = fs.readFileSync(chemin);
    const pieceJointe = mapping.versFront('pieces_jointes', ligne);
    pieceJointe.blob = octets.toString('base64');
    return pieceJointe;
  },

  /**
   * Supprime une pièce jointe : refusée si liée à un MOUVEMENT figé
   * (VALIDE/ANNULE — les preuves d'une écriture scellée sont intouchables).
   * Supprime la métadonnée ET le fichier. Reprend supprimerPieceJointe du
   * DemoStore.
   */
  supprimerPieceJointe(params) {
    const { id } = params;
    const ligne = db.get('SELECT * FROM pieces_jointes WHERE id = ?', [id]);
    if (!ligne) throw new Error(`Pièce jointe introuvable : ${id}.`);
    if (ligne.entite_type === 'MOUVEMENT') {
      const mouvement = db.get(
        'SELECT statut FROM mouvements WHERE id = ?', [ligne.entite_id]);
      if (mouvement &&
          (mouvement.statut === 'VALIDE' || mouvement.statut === 'ANNULE')) {
        throw new Error(
          'Écriture figée : sa pièce justificative ne peut plus être ' +
          'supprimée.');
      }
    }
    return muter(() => {
      // Lot C (C1) : retirer une PJ d'un mouvement BROUILLON/SOUMIS modifie
      // la fiche présentée aux signataires → révision incrémentée (le cas
      // figé est déjà refusé ci-dessus, parité démo).
      if (ligne.entite_type === 'MOUVEMENT') {
        const mv = db.get(
          'SELECT statut, revision_brouillon FROM mouvements WHERE id = ?',
          [ligne.entite_id]);
        if (mv && (mv.statut === 'BROUILLON' || mv.statut === 'SOUMIS')) {
          db.run('UPDATE mouvements SET revision_brouillon = ? WHERE id = ?',
            [(mv.revision_brouillon ?? 0) + 1, ligne.entite_id]);
        }
      }
      db.run('DELETE FROM pieces_jointes WHERE id = ?', [id]);
      // On ne supprime QUE dans documents/, jamais un chemin venu des données :
      // supprimerPieceJointe est ouvert au rôle OPERATEUR (donc à un ÉLÈVE).
      const chemin = ligne.chemin ? cheminPieceJointe(ligne.id) : null;
      if (chemin && fs.existsSync(chemin)) {
        fs.unlinkSync(chemin);
      }
      journaliser(params.par, 'SUPPRESSION_PIECE_JOINTE',
        `${ligne.entite_type}/${ligne.entite_id}`, ligne.nom_fichier);
      return true;
    });
  },

  // === machines (VAGUE 4) ===================================

  createMachine(params) {
    const d = params.donneesMachine || {};
    if (!d.designation || !String(d.designation).trim()) {
      throw new Error('Désignation de la machine obligatoire.');
    }
    if (!fluideConnu(d.fluide)) {
      throw new Error(`Fluide inconnu au référentiel : ${d.fluide}.`);
    }
    const nominale = Number(d.chargeNominaleKg);
    if (!Number.isFinite(nominale) || nominale <= 0) {
      throw new Error('Charge nominale obligatoire (en kg, positive).');
    }
    // P0-6 : FIXE/MOBILE — un mobile listé est admis au contrôle
    // immédiat après réparation. Absent = FIXE (défaut conservateur).
    if (d.typeInstallation !== undefined && d.typeInstallation !== null
        && !['FIXE', 'MOBILE'].includes(d.typeInstallation)) {
      throw new Error(`Type d'installation inconnu : ${d.typeInstallation} `
        + '(attendu : FIXE, MOBILE).');
    }
    // P1-1 : garde du modèle d'équipement — miroir du DemoStore.
    equipement.verifierModeleEquipement({
      typeInstallation: d.typeInstallation ?? 'FIXE',
      sousTypeInstallation: d.sousTypeInstallation ?? null,
      hermetiqueScelle: Boolean(d.hermetiqueScelle),
      hermetiqueEtiquete: Boolean(d.hermetiqueEtiquete),
      detectionPermanente: Boolean(d.detectionPermanente),
      detectionVerifieeLe: d.detectionVerifieeLe ?? null
    });
    const client = d.clientId
      ? db.get('SELECT id, raison_sociale FROM clients_detenteurs WHERE id = ?',
        [d.clientId])
      : null;
    if (d.clientId && !client) {
      throw new Error(`Client / détenteur introuvable : ${d.clientId}.`);
    }

    // Code lisible : fourni par l'appelant (structuré « JR-CF-001 »,
    // normalisé + unicité), sinon repli compteur hérité M7, M8…
    let code;
    if (d.code !== undefined && d.code !== null && String(d.code).trim() !== '') {
      code = normaliserCodeMachine(d.code);
      const erreur = validerCodeMachine(code);
      if (erreur) throw new Error(erreur);
      if (codeMachineDejaPris(code, null)) {
        throw new Error(`Code machine déjà utilisé : ${code}.`);
      }
    } else {
      code = `M${plusGrandCode('machines', 'code_interne', /^M/) + 1}`;
    }

    const machine = {
      id: db.generateId('MAC'),
      code,
      designation: String(d.designation).trim(),
      type: d.type ?? null,
      marque: d.marque ?? null,
      modele: d.modele ?? null,
      numSerie: d.numSerie ?? null,
      fluide: d.fluide,
      chargeNominaleKg: nominale,
      chargeActuelleKg: Number(d.chargeActuelleKg) || 0,
      clientId: d.clientId ?? null,
      localisation: d.localisation ?? null,
      siteLabel: d.siteLabel ?? client?.raison_sociale ?? null,
      statut: d.statut ?? 'EN_SERVICE',
      typeInstallation: d.typeInstallation ?? 'FIXE',
      detectionPermanente: Boolean(d.detectionPermanente),
      // P1-1 — modèle d'équipement. Défauts CONSERVATEURS ; l'échéance de
      // vérification est CALCULÉE (12 mois civils), jamais saisie.
      // Miroir du DemoStore.
      hermetiqueScelle: Boolean(d.hermetiqueScelle),
      hermetiqueEtiquete: Boolean(d.hermetiqueEtiquete),
      residentiel: Boolean(d.residentiel),
      sousTypeInstallation: texteOuNullEquip(d.sousTypeInstallation),
      detectionVerifieeLe: texteOuNullEquip(d.detectionVerifieeLe),
      detectionProchaineVerif: equipement.echeanceVerificationDetection(
        texteOuNullEquip(d.detectionVerifieeLe)),
      detectionReference: texteOuNullEquip(d.detectionReference),
      dateMiseEnService: d.dateMiseEnService ?? null,
      dernierControle: d.dernierControle ?? null,
      prochainControle: d.prochainControle ?? null,
      // Identifiant opaque QR (V9.1) : généré une fois, jamais modifiable
      // (updateMachine ne le liste pas dans ses CHAMPS). Retry sur collision
      // avec l'index UNIQUE partiel de la migration 003.
      codePublic: codePublicUnique('machines')
    };
    return muter(() => {
      const ligne = mapping.versSql('machines', machine);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('machines', ligne);
      journaliser(d.operateur, 'CREATION_MACHINE', machine.code,
        `${machine.designation} (${machine.fluide})`);
      return lireMachine(machine.id);
    });
  },

  updateMachine(params) {
    const { id } = params;
    const machine = trouverMachine(id);
    if (machine.statut === 'DEMANTELEE') {
      throw new Error('Machine démantelée : modification interdite.');
    }
    const d = params.donneesMachine || {};
    if (d.fluide !== undefined && !fluideConnu(d.fluide)) {
      throw new Error(`Fluide inconnu au référentiel : ${d.fluide}.`);
    }
    // P0-6 : FIXE/MOBILE — un mobile listé est admis au contrôle
    // immédiat après réparation. Absent = FIXE (défaut conservateur).
    if (d.typeInstallation !== undefined && d.typeInstallation !== null
        && !['FIXE', 'MOBILE'].includes(d.typeInstallation)) {
      throw new Error(`Type d'installation inconnu : ${d.typeInstallation} `
        + '(attendu : FIXE, MOBILE).');
    }
    // Code lisible modifiable (renommer « M1 » en « JR-CF-001 ») :
    // normalisé, validé, unique. Les libellés dénormalisés des écritures
    // scellées (machine_label) restent figés, par principe.
    let ancienCode = null;
    let nouveauCode = machine.code;
    if (d.code !== undefined) {
      const code = normaliserCodeMachine(d.code);
      const erreur = validerCodeMachine(code);
      if (erreur) throw new Error(erreur);
      if (codeMachineDejaPris(code, id)) {
        throw new Error(`Code machine déjà utilisé : ${code}.`);
      }
      if (code !== machine.code) { ancienCode = machine.code; nouveauCode = code; }
    }
    // P1-1 : garde du modèle d'équipement sur la fiche FUSIONNÉE (existant
    // + patch) — miroir du DemoStore.
    const CHAMPS_EQUIPEMENT = ['hermetiqueScelle', 'hermetiqueEtiquete',
      'residentiel', 'sousTypeInstallation', 'detectionVerifieeLe',
      'detectionReference'];
    const fusion = { ...machine };
    for (const champ of [...CHAMPS_EQUIPEMENT, 'typeInstallation',
      'detectionPermanente']) {
      if (d[champ] !== undefined) fusion[champ] = d[champ];
    }
    equipement.verifierModeleEquipement(fusion);

    const CHAMPS = ['designation', 'type', 'marque', 'modele', 'numSerie',
      'fluide', 'chargeNominaleKg', 'chargeActuelleKg', 'clientId',
      'localisation', 'siteLabel', 'statut', 'typeInstallation',
      'detectionPermanente', ...CHAMPS_EQUIPEMENT,
      'dateMiseEnService', 'dernierControle', 'prochainControle'];
    const patch = {};
    for (const champ of CHAMPS) {
      if (d[champ] !== undefined) patch[champ] = d[champ];
    }
    // Booléens du modèle d'équipement : jamais stockés en chaîne.
    for (const champ of ['hermetiqueScelle', 'hermetiqueEtiquete',
      'residentiel']) {
      if (d[champ] !== undefined) patch[champ] = Boolean(d[champ]);
    }
    // Champs texte facultatifs : chaîne vide = effacement (null).
    for (const champ of ['sousTypeInstallation', 'detectionVerifieeLe',
      'detectionReference']) {
      if (d[champ] !== undefined) patch[champ] = texteOuNullEquip(d[champ]);
    }
    // L'échéance de vérification est CALCULÉE, jamais saisie.
    if (d.detectionVerifieeLe !== undefined) {
      patch.detectionProchaineVerif =
        equipement.echeanceVerificationDetection(patch.detectionVerifieeLe);
    }
    if (ancienCode) patch.code = nouveauCode;
    return muter(() => {
      majParId('machines', id, mapping.versSql('machines', patch));
      // Ordre de saisie de l'appelant, comme le DemoStore.
      const champsModifies = Object.keys(d).filter((c) => CHAMPS.includes(c));
      if (ancienCode) champsModifies.unshift(`code ${ancienCode} → ${nouveauCode}`);
      journaliser(d.operateur, 'MODIFICATION_MACHINE', nouveauCode,
        `Champs : ${champsModifies.join(', ')}`);
      return lireMachine(id);
    });
  },

  arreterMachine(params) {
    const { id } = params;
    const machine = trouverMachine(id);
    if (machine.statut === 'DEMANTELEE') {
      throw new Error('Machine démantelée : arrêt sans objet.');
    }
    if (machine.statut === 'ARRETEE') {
      throw new Error(`Machine ${machine.code} déjà à l’arrêt.`);
    }
    return muter(() => {
      majParId('machines', id, { statut: 'ARRETEE' });
      journaliser(params.par, 'ARRET_MACHINE', machine.code,
        `${machine.designation} mise à l’arrêt`);
      return lireMachine(id);
    });
  },

  demantelerMachine(params) {
    const { id } = params;
    const machine = trouverMachine(id);
    if (machine.statut === 'DEMANTELEE') {
      throw new Error(`Machine ${machine.code} déjà démantelée.`);
    }
    if (Math.abs(machine.chargeActuelleKg) > TOLERANCE_CHARGE_RESIDUELLE_KG) {
      throw new Error(
        `Démantèlement impossible : la machine ${machine.code} contient ` +
        `encore ${machine.chargeActuelleKg} kg de fluide. Récupérez ` +
        'd’abord le fluide (mouvement « Récupération — démantèlement »).');
    }
    return muter(() => {
      majParId('machines', id, { statut: 'DEMANTELEE' });
      journaliser(params.par, 'DEMANTELEMENT_MACHINE', machine.code,
        `${machine.designation} démantelée (charge résiduelle ` +
        `${machine.chargeActuelleKg} kg)`);
      return lireMachine(id);
    });
  },

  remettreEnService(params) {
    const { id } = params;
    const machine = trouverMachine(id);
    if (machine.statut === 'DEMANTELEE') {
      throw new Error(
        'Machine démantelée : remise en service impossible (définitif).');
    }
    if (machine.statut !== 'ARRETEE') {
      throw new Error(
        `Seule une machine à l’arrêt se remet en service ` +
        `(statut actuel : ${machine.statut}).`);
    }
    return muter(() => {
      majParId('machines', id, { statut: 'EN_SERVICE' });
      journaliser(params.par, 'REMISE_EN_SERVICE_MACHINE', machine.code,
        `${machine.designation} remise en service`);
      return lireMachine(id);
    });
  },

  // === bouteilles (VAGUE 4) =================================

  createBouteille(params) {
    const d = params.donneesBouteille || {};
    if (!fluideConnu(d.fluide)) {
      throw new Error(`Fluide inconnu au référentiel : ${d.fluide}.`);
    }
    if (d.type !== 'NEUVE' && d.type !== 'RECUPERATION') {
      throw new Error('Type de bouteille obligatoire : NEUVE ou RECUPERATION.');
    }
    // CM-3 : cohérence état↔type (généralise la garde MÉLANGE — R2). On
    // valide l'état EFFECTIF (défaut appliqué), pas la seule valeur brute.
    const etatFluide = d.etatFluide
      ?? (d.type === 'RECUPERATION' ? 'RECUPERE' : 'VIERGE');
    verifierCoherenceEtatBouteille(d.type, etatFluide);
    const tare = Number(d.tareKg);
    const contenance = Number(d.contenanceMaxKg);
    if (!Number.isFinite(tare) || tare < 0) {
      throw new Error('Tare obligatoire (en kg, positive ou nulle).');
    }
    if (!Number.isFinite(contenance) || contenance <= 0) {
      throw new Error('Contenance maximale obligatoire (en kg, positive).');
    }
    const brute = d.masseBruteKg !== undefined ? Number(d.masseBruteKg) : tare;
    const nette = arrondir(brute - tare);
    if (nette < 0) {
      throw new Error('Masse brute inférieure à la tare : pesée incohérente.');
    }
    if (nette > contenance) {
      throw new Error('Masse nette supérieure à la contenance de la bouteille.');
    }

    // Code lisible : B-06, B-07… d'après le plus grand code existant (COMPTEUR).
    const maxCode = plusGrandCode('bouteilles', 'code_interne', /^B-?/);

    const bouteille = {
      id: db.generateId('BTL'),
      code: `B-${String(maxCode + 1).padStart(2, '0')}`,
      numeroReel: d.numeroReel ?? null,
      type: d.type,
      fluide: d.fluide,
      etatFluide,
      tareKg: tare,
      masseBruteKg: arrondir(brute),
      // masseNetteKg est GÉNÉRÉE (colonne calculée) : jamais écrite.
      // CR-4 : masse nette à l'ENTRÉE en stock, FIGÉE à la création.
      masseEntreeKg: nette,
      contenanceMaxKg: contenance,
      proprietaire: d.proprietaire ?? null,
      lot: d.lot ?? null,
      dateEntree: d.dateEntree ?? aujourdHui(),
      datePesee: d.datePesee ?? aujourdHui(),
      statut: d.statut ?? 'EN_STOCK',
      // Identifiant opaque QR (parité machines V9.1) : généré une fois,
      // jamais modifiable (updateBouteille ne le liste pas dans CHAMPS).
      codePublic: codePublicUnique('bouteilles')
    };
    // R2 : bouteille créée MELANGE → composition amorcée avec son contenu
    // initial (l'étiquette courante), sans quoi le premier versement
    // croisé, même minoritaire, volerait l'étiquette. La masse nette
    // n'étant pas encore en base (colonne GÉNÉRÉE), on l'amorce avec la
    // nette calculée ci-dessus — parité DemoStore.
    if (bouteille.etatFluide === 'MELANGE') {
      bouteille.masseNetteKg = nette;
      amorcerCompositionMelange(bouteille, bouteille.dateEntree);
      delete bouteille.masseNetteKg; // colonne générée : jamais écrite
    }
    return muter(() => {
      const ligne = mapping.versSql('bouteilles', bouteille);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('bouteilles', ligne);
      journaliser(d.operateur, 'CREATION_BOUTEILLE', bouteille.code,
        `${bouteille.type} ${bouteille.fluide} (${bouteille.contenanceMaxKg} kg)`);
      return lireBouteille(bouteille.id);
    });
  },

  updateBouteille(params) {
    const { id } = params;
    const bouteille = trouverBouteille(id);
    const d = params.donneesBouteille || {};
    if (d.fluide !== undefined && !fluideConnu(d.fluide)) {
      throw new Error(`Fluide inconnu au référentiel : ${d.fluide}.`);
    }
    // CM-3 : si le patch touche le type OU l'état, valider la cohérence du
    // couple (type, état) APRÈS patch — jamais de requalification interne
    // d'un récupéré en recyclé/régénéré. Un patch qui ne touche ni l'un ni
    // l'autre ne revalide pas l'existant (pas de rejet rétroactif).
    if (d.type !== undefined || d.etatFluide !== undefined) {
      verifierCoherenceEtatBouteille(
        d.type !== undefined ? d.type : bouteille.type,
        d.etatFluide !== undefined ? d.etatFluide : bouteille.etatFluide);
    }
    const CHAMPS = ['numeroReel', 'type', 'fluide', 'etatFluide', 'tareKg',
      'masseBruteKg', 'contenanceMaxKg', 'proprietaire', 'lot',
      'dateEntree', 'datePesee', 'statut'];
    const patch = {};
    for (const champ of CHAMPS) {
      if (d[champ] !== undefined) patch[champ] = d[champ];
    }
    // Cohérence : la masse nette découle toujours de brute − tare. La
    // colonne masse_nette_kg est GÉNÉRÉE : on ne l'écrit pas, mais on
    // VALIDE l'invariant sur les nouvelles valeurs avant d'écrire.
    if (d.masseBruteKg !== undefined || d.tareKg !== undefined) {
      const brute = d.masseBruteKg !== undefined
        ? Number(d.masseBruteKg) : bouteille.masseBruteKg;
      const tare = d.tareKg !== undefined ? Number(d.tareKg) : bouteille.tareKg;
      const contenance = d.contenanceMaxKg !== undefined
        ? Number(d.contenanceMaxKg) : bouteille.contenanceMaxKg;
      const nette = arrondir(brute - tare);
      if (nette < 0) {
        throw new Error('Masse brute inférieure à la tare : pesée incohérente.');
      }
      if (nette > contenance) {
        throw new Error('Masse nette supérieure à la contenance de la bouteille.');
      }
    }
    // R2 : bouteille DEVENUE MELANGE (ou MELANGE sans composition) →
    // amorce avec le contenu courant (valeurs APRÈS patch), comme à la
    // création — parité DemoStore.
    const etatApres = d.etatFluide !== undefined
      ? d.etatFluide : bouteille.etatFluide;
    if (etatApres === 'MELANGE' &&
        !(Array.isArray(bouteille.compositionMelange) &&
          bouteille.compositionMelange.length > 0)) {
      const bruteApres = d.masseBruteKg !== undefined
        ? Number(d.masseBruteKg) : bouteille.masseBruteKg;
      const tareApres = d.tareKg !== undefined
        ? Number(d.tareKg) : bouteille.tareKg;
      patch.compositionMelange = [{
        fluide: d.fluide !== undefined ? d.fluide : bouteille.fluide,
        quantiteKg: arrondir(bruteApres - tareApres),
        date: aujourdHui(),
        mouvementId: null
      }];
    }
    return muter(() => {
      majParId('bouteilles', id, mapping.versSql('bouteilles', patch));
      // Ordre de saisie de l'appelant, comme le DemoStore.
      journaliser(d.operateur, 'MODIFICATION_BOUTEILLE', bouteille.code,
        `Champs : ${Object.keys(d).filter((c) => CHAMPS.includes(c)).join(', ')}`);
      return lireBouteille(id);
    });
  },

  peserBouteille(params) {
    const { id } = params;
    const bouteille = trouverBouteille(id);
    // IM-5 durci (brique ②) : une bouteille sortie du stock ne se pèse
    // plus — parité stricte avec le DemoStore (message identique).
    if (bouteille.statut === 'RETOURNEE' || bouteille.statut === 'DECHET') {
      throw new Error(
        'Bouteille sortie du stock (retournée ou déchet) : pesée impossible.');
    }
    const brute = Number(params.masseBruteKg);
    if (!Number.isFinite(brute) || brute < 0) {
      throw new Error('Masse brute obligatoire (en kg, positive).');
    }
    const nette = arrondir(brute - bouteille.tareKg);
    if (nette < 0) {
      throw new Error(
        `Pesée invalide : masse brute (${brute} kg) inférieure à la tare ` +
        `(${bouteille.tareKg} kg).`);
    }
    if (nette > bouteille.contenanceMaxKg) {
      throw new Error(
        `Pesée invalide : masse nette (${nette} kg) supérieure à la ` +
        `contenance (${bouteille.contenanceMaxKg} kg).`);
    }
    return muter(() => {
      // masse_nette_kg est GÉNÉRÉE : on écrit brute + date, la nette suit.
      majParId('bouteilles', id, {
        masse_brute_kg: arrondir(brute),
        date_derniere_pesee: aujourdHui()
      });
      journaliser(params.par, 'PESEE_BOUTEILLE', bouteille.code,
        `Brute ${arrondir(brute)} kg → nette ${nette} kg`);
      return lireBouteille(id);
    });
  },

  // === contrôles d'étanchéité (VAGUE 6) =====================

  /**
   * Crée un contrôle d'étanchéité (id CTL-, défauts date=aujourd'hui,
   * typeControle=PERIODIQUE, methode=DIRECTE). Garde-fous : machine
   * introuvable et resultat ∈ {CONFORME, FUITE}. Effets machine (Phase B) :
   * FUITE → statut FUITE ; CONFORME sur une machine FUITE/CONTROLE_DU non
   * en retard → retour EN_SERVICE ; dernierControle = date ; prochainControle
   * si fourni. Journal CREATION_CONTROLE. Toute la logique (validations,
   * insertion, effets, journal) vit dans enregistrerControle, partagé avec
   * CR-3 (validation d'un mouvement) — repris du DemoStore.
   */
  createControle(params, contexte) {
    const d = params.donneesControle || {};
    // P7-c (option A) : le handler DIRECT est FORMATION-only PAR NATURE —
    // refus STRUCTUREL du mode OFFICIEL, qui tient verrou de livraison
    // ouvert OU fermé (remplace le colmatage conjoncturel P0-2). L'officiel
    // ne passe QUE par le parcours mouvement de type CONTROLE (P7-a/b :
    // signatures, PDF conservé, scellement, WORM). Le contrôle LIÉ (né de
    // validerMouvement via enregistrerControle) n'emprunte pas ce handler :
    // il hérite le mode du mouvement, gardé par les 3 moments officiels.
    // Parité stricte avec le DemoStore (createControle).
    if (d.mode === 'OFFICIEL') {
      throw new Error(MSG_CONTROLE_DIRECT_OFFICIEL);
    }
    // P7-e : le lien contrôle ↔ mouvement naît EXCLUSIVEMENT de la
    // validation d'un mouvement (CR-3) — un mouvementId forgé par le
    // chemin direct fabriquerait un faux rattachement au registre scellé
    // (reste consigné de l'audit, fermé ici). Parité stricte DemoStore.
    if (d.mouvementId) {
      throw new Error('Lien de mouvement refusé : le contrôle lié à une '
        + 'écriture naît de sa validation, jamais du chemin direct.');
    }
    return muter(() => enregistrerControle(d));
  },

  /**
   * R3/R4 : trace a posteriori la réparation d'un contrôle FUITE (date
   * réelle, nature, réparateur). Ne touche PAS machine.statut : le retour
   * EN_SERVICE (R4) exige un contrôle CONFORME postérieur, jamais la
   * réparation seule. Ne crée PAS de nouveau contrôle. Reprend
   * tracerReparation du DemoStore.
   */
  tracerReparation(params) {
    const { controleId } = params;
    const d = params.donneesReparation || {};
    return muter(() => {
      const ligne = db.get('SELECT * FROM controles WHERE id = ?', [controleId]);
      if (!ligne) {
        throw new Error(`Contrôle introuvable : ${controleId}.`);
      }
      const controle = mapping.versFront('controles', ligne);
      if (controle.resultat !== 'FUITE') {
        throw new Error(
          'Seul un contrôle FUITE peut recevoir une réparation tracée.');
      }
      const dateReparation = String(d.dateReparation || '').trim();
      const natureReparation = String(d.natureReparation || '').trim();
      const reparateur = String(d.reparateur || '').trim();
      if (!dateReparation || !natureReparation || !reparateur) {
        throw new Error(
          'Réparation incomplète : date, nature et réparateur sont obligatoires.');
      }
      // P0-6 (revue I-1) : la date de réparation est la CHEVILLE de la
      // clôture stricte J+1 — sans ces gardes, une réparation antidatée
      // ou au format horaire contournait la règle des 24 h. MIROIR demo.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateReparation)) {
        throw new Error('Date de réparation invalide : format attendu '
          + 'AAAA-MM-JJ (date au jour).');
      }
      if (controle.date && dateReparation < controle.date) {
        throw new Error('Date de réparation antérieure au contrôle FUITE '
          + `(${controle.date}) : une fuite se répare après sa détection.`);
      }
      if (dateReparation > aujourdHui()) {
        throw new Error('Date de réparation dans le futur : on trace une '
          + 'réparation FAITE, jamais prévue.');
      }
      if (controle.mouvementId && db.get(
        "SELECT id FROM mouvements WHERE id = ? AND statut = 'ANNULE'",
        [controle.mouvementId])) {
        throw new Error('Contrôle annulé (contre-écriture) : il ne peut '
          + 'plus recevoir de réparation tracée.');
      }
      majParId('controles', controleId, {
        date_reparation: dateReparation,
        nature_reparation: natureReparation,
        reparateur,
        reparateur_id: d.reparateurId || null
      });
      journaliser(reparateur, 'TRACE_REPARATION', controle.machineLabel,
        `Contrôle ${controleId} · ${natureReparation}`);
      return {
        ...controle,
        dateReparation,
        natureReparation,
        reparateur,
        reparateurId: d.reparateurId || null
      };
    });
  },

  /**
   * IM-1 : date du PROCHAIN contrôle d'étanchéité calculée depuis la
   * fréquence réglementaire (même logique que le cadre 7 du CERFA, croisée
   * avec la détection permanente). Renvoie null si la machine est hors
   * périmètre F-Gas (aucun contrôle périodique exigé), une date ISO sinon.
   * Error si la machine est introuvable. Reprend calculerProchainControle
   * du DemoStore.
   */
  calculerProchainControle(params) {
    const machine = trouverMachine(params.machineId);
    const fluideRef = lireFluide(machine.fluide);
    // La date du contrôle fixe le régime applicable (HFO purs contrôlés
    // seulement depuis le 11/03/2024) — miroir du DemoStore.
    const dateControle = params.dateControle ?? aujourdHui();
    // P1-1 (E1) : la détection est évaluée À LA DATE DU CONTRÔLE — non
    // vérifiée depuis 12 mois → fréquence SANS détection (plus de
    // contrôles, jamais moins). Miroir du DemoStore.
    const frequenceMois = frequenceControleMois(
      fluideRef, machine.chargeNominaleKg,
      equipement.detectionEffective(machine, dateControle).compte,
      dateControle);
    if (!frequenceMois) return null;
    return ajouterMois(dateControle, frequenceMois);
  },

  // === registre des mouvements (VAGUE 5 — le coffre-fort) ====

  /**
   * CR-1 : crée un mouvement en BROUILLON. Numéro FORM-/FI- attribué par
   * COMPTEUR global par préfixe, conservé jusqu'à la validation. Aucun
   * effet stock, aucune empreinte, quantiteKg NULL : le brouillon ne fige
   * rien. Les références (machine, bouteilles) sont vérifiées dès la saisie
   * si fournies. Reprend creerMouvement du DemoStore (msg mot pour mot).
   */
  creerMouvement(params, contexte) {
    const d = params.donneesMouvement || {};
    if (!TYPES_MOUVEMENT.includes(d.type)) {
      throw new Error(
        `Type de mouvement obligatoire parmi : ${TYPES_MOUVEMENT.join(', ')}.`);
    }
    // Blocage dur du mode OFFICIEL (lot B) : 1er des 3 moments (PASSAGE).
    // Les conditions bloquantes (docs/CONDITIONS-BLOCANTES-OFFICIEL.md)
    // sont évaluées ; le VERROU DE LIVRAISON (lots C et D non livrés)
    // maintient le refus TOTAL — remplace le verrou du 15/07 en le
    // motivant. Parité stricte avec le DemoStore (creerMouvement).
    if (d.mode === 'OFFICIEL') {
      const verdict = evaluerOfficiel('PASSAGE', null, contexte);
      if (!verdict.ok) {
        throw new Error(messageRefusOfficiel(verdict.blocages));
      }
    }
    const mode = d.mode === 'OFFICIEL' ? 'OFFICIEL' : 'FORMATION';
    // Références vérifiées dès le brouillon si fournies (msg exact).
    const machine = d.machineId ? trouverMachine(d.machineId) : null;
    if (d.bouteilleSrcId) trouverBouteille(d.bouteilleSrcId, 'Bouteille source');
    if (d.bouteilleDstId) {
      trouverBouteille(d.bouteilleDstId, 'Bouteille de destination');
    }
    // Rôles réels de l'intervention (chantier B2) : références vérifiées dès
    // le brouillon. Aucune EXIGENCE d'habilitation (Phase 1 ne bloque rien).
    if (d.executeParId) trouverPersonne(d.executeParId);
    if (d.superviseurId) trouverPersonne(d.superviseurId);
    if (d.responsableRegistreId) trouverPersonne(d.responsableRegistreId);
    // Outils réglementaires déclarés (brique produit n°2) : existence
    // vérifiée dès le brouillon, dédupliqués (parité DemoStore).
    const outilsIds = [...new Set(
      (Array.isArray(d.outilsIds) ? d.outilsIds : []).filter(Boolean))];
    for (const idOutil of outilsIds) trouverOutil(idOutil);
    return muter(() => {
      // Numéro attribué DANS la transaction (verrou implicite : Node
      // mono-fil + BEGIN IMMEDIATE) — pas de collision de compteur.
      const mouvement = {
        id: db.generateId('MVT'),
        numero: prochainNumeroMouvement(mode),
        date: d.date ?? aujourdHui(),
        mode,
        type: d.type,
        machineId: d.machineId ?? null,
        machineLabel: machine?.designation ?? null,
        fluide: d.fluide ?? machine?.fluide ?? null,
        quantiteKg: null,
        peseeAvantKg: d.peseeAvantKg ?? null,
        peseeApresKg: d.peseeApresKg ?? null,
        bouteilleSrcId: d.bouteilleSrcId ?? null,
        bouteilleDstId: d.bouteilleDstId ?? null,
        causeMouvement: d.causeMouvement ?? null,
        controle: d.controle ??
          { statutControle: 'SANS_OBJET', detecteurId: null },
        signatureDataUrl: d.signatureDataUrl ?? null,
        technicien: d.technicien ?? null,
        validateurId: null,
        // Rôles réels (chantier B2) : toujours présents (null par défaut),
        // HORS empreinte de hachage, figés par le trigger WORM. `|| null`
        // (pas `??`) : une chaîne vide devient null (parité DemoStore, évite
        // un FOREIGN KEY cru sur execute_par_id = '').
        executeParId: d.executeParId || null,
        superviseurId: d.superviseurId || null,
        responsableRegistreId: d.responsableRegistreId || null,
        hashEcriture: null,
        hashPrecedent: null,
        contreEcritureDe: null,
        statut: 'BROUILLON',
        cerfaNumero: null,
        // Lot C (C1, migration 23) : révision du brouillon (invalidation des
        // signatures par comparaison), version d'empreinte (1 tant que C2
        // n'est pas livrée) et champs dérivés GELÉS au scellement (C2-C3).
        // Toujours présents (parité DemoStore), HORS liste blanche v1 du
        // hasseur : les chaînes existantes restent intactes.
        revisionBrouillon: 0,
        versionEmpreinte: 1,
        outilsFiges: null,
        hashSignatures: null,
        hashPiecesJointes: null,
        hashPdfFinal: null
      };
      insererMouvement(mouvement);
      for (const idOutil of outilsIds) {
        inserer('mouvement_outillage', {
          id: db.generateId('MOU'),
          etablissement_id: ID_ETABLISSEMENT,
          mouvement_id: mouvement.id,
          outillage_id: idOutil,
          statut_fige: null,
          echeance_figee: null
        });
      }
      journaliser(mouvement.technicien, 'CREATION_MOUVEMENT', mouvement.numero,
        `${mouvement.type} (brouillon)`);
      return reconstituerMouvement(lireLigneMouvement(mouvement.id));
    });
  },

  /**
   * Outils réglementaires déclarés sur un mouvement (brique produit n°2) :
   * outil résolu au présent, statut/échéance FIGÉS à la validation.
   * Même forme, même tri (JS) que le DemoStore.
   */
  getOutilsMouvement(params) {
    const { mouvementId } = params;
    trouverMouvement(mouvementId);
    return db.all(
      'SELECT * FROM mouvement_outillage WHERE mouvement_id = ?',
      [mouvementId])
      .map((ligne) => {
        const lien = mapping.versFront('mouvement_outillage', ligne);
        const ligneOutil = db.get(
          'SELECT * FROM outillage WHERE id = ?', [lien.outillageId]);
        const outil = ligneOutil
          ? mapping.versFront('outillage', ligneOutil) : null;
        return {
          outillageId: lien.outillageId,
          typeOutil: outil?.typeOutil ?? null,
          marque: outil?.marque ?? null,
          modele: outil?.modele ?? null,
          numSerie: outil?.numSerie ?? null,
          statutFige: lien.statutFige ?? null,
          echeanceFigee: lien.echeanceFigee ?? null
        };
      })
      .sort((a, b) => {
        const ta = a.typeOutil ?? ''; const tb = b.typeOutil ?? '';
        if (ta !== tb) return ta < tb ? -1 : 1;
        return a.outillageId < b.outillageId ? -1
          : (a.outillageId > b.outillageId ? 1 : 0);
      });
  },

  /** BROUILLON → SOUMIS + date de soumission (hors empreinte). */
  soumettreMouvement(params, contexte) {
    const { id } = params;
    const mouvement = trouverMouvement(id);
    if (mouvement.statut === 'VALIDE' || mouvement.statut === 'ANNULE') {
      throw new Error(MSG_ECRITURE_FIGEE);
    }
    if (mouvement.statut !== 'BROUILLON') {
      throw new Error('Seul un mouvement en brouillon peut être soumis.');
    }
    // Blocage dur OFFICIEL (lot B) : 2e moment (SOUMISSION) — la fiche
    // doit être complète et réglementairement recevable AVANT tout effet.
    if (mouvement.mode === 'OFFICIEL') {
      const verdict = evaluerOfficiel('SOUMISSION',
        cadreFicheOfficiel(mouvement), contexte);
      if (!verdict.ok) {
        throw new Error(messageRefusOfficiel(verdict.blocages));
      }
    }
    return muter(() => {
      majParId('mouvements', id, {
        statut: 'SOUMIS',
        date_soumission: aujourdHui()
      });
      journaliser(mouvement.technicien, 'SOUMISSION_MOUVEMENT',
        mouvement.numero, mouvement.type);
      return reconstituerMouvement(lireLigneMouvement(id));
    });
  },

  /** CR-1 : SOUMIS → BROUILLON avec motif de rejet conservé. */
  rejeterMouvement(params) {
    const { id, motif } = params;
    const mouvement = trouverMouvement(id);
    if (mouvement.statut === 'VALIDE' || mouvement.statut === 'ANNULE') {
      throw new Error(MSG_ECRITURE_FIGEE);
    }
    if (mouvement.statut !== 'SOUMIS') {
      throw new Error('Seul un mouvement soumis peut être rejeté.');
    }
    if (!motif || !String(motif).trim()) {
      throw new Error('Motif de rejet obligatoire.');
    }
    const motifRejet = String(motif).trim();
    return muter(() => {
      majParId('mouvements', id, {
        statut: 'BROUILLON',
        motif_rejet: motifRejet,
        // Lot C (C1) : un rejet renvoie la fiche en correction — révision
        // incrémentée, les signatures posées deviennent PÉRIMÉES (parité démo).
        revision_brouillon: (mouvement.revisionBrouillon ?? 0) + 1
      });
      journaliser(null, 'REJET_MOUVEMENT', mouvement.numero,
        `${mouvement.type} · motif : ${motifRejet}`);
      return reconstituerMouvement(lireLigneMouvement(id));
    });
  },

  /**
   * CR-1 : supprime un mouvement resté en BROUILLON (retourne true). Un
   * brouillon n'a aucun effet stock ni chaîne : sa suppression est sûre.
   */
  supprimerMouvement(params) {
    const { id } = params;
    const mouvement = trouverMouvement(id);
    if (mouvement.statut === 'VALIDE' || mouvement.statut === 'ANNULE') {
      throw new Error(MSG_ECRITURE_FIGEE);
    }
    if (mouvement.statut !== 'BROUILLON') {
      throw new Error(
        'Seul un mouvement en brouillon peut être supprimé ' +
        '(un mouvement soumis se rejette, une écriture validée ' +
        's’annule par contre-écriture).');
    }
    return muter(() => {
      // Les liens d'outils d'un brouillon partent avec lui (FK d'abord).
      db.run('DELETE FROM mouvement_outillage WHERE mouvement_id = ?', [id]);
      // Lot C (C1) : ses signatures partent avec lui — seul cas de
      // suppression admis par le trigger WORM (le mouvement est encore un
      // BROUILLON) ; la trace reste au journal chaîné.
      db.run('DELETE FROM signatures_mouvement WHERE mouvement_id = ?', [id]);
      db.run('DELETE FROM mouvements WHERE id = ?', [id]);
      journaliser(params.par ?? mouvement.technicien, 'SUPPRESSION_MOUVEMENT',
        mouvement.numero, `${mouvement.type} (brouillon supprimé)`);
      return true;
    });
  },

  /**
   * Lot C (brique C1) — signature RÉELLE d'un mouvement BROUILLON. Reprend
   * signerMouvement du DemoStore (gardes et messages MOT POUR MOT) ; en
   * plus, capte l'identité de SESSION (compte + fiche du personnel liée)
   * au moment de signer — témoin opposable, sans objet en démonstration.
   */
  signerMouvement(params, contexte) {
    const { mouvementId, signature } = params;
    const s = signature || {};
    const mouvement = trouverMouvement(mouvementId);
    if (mouvement.statut === 'VALIDE' || mouvement.statut === 'ANNULE') {
      throw new Error(MSG_ECRITURE_FIGEE);
    }
    if (mouvement.statut !== 'BROUILLON') {
      throw new Error('Seul un mouvement en brouillon peut être signé ' +
        '(les signatures précèdent la soumission).');
    }
    if (!ROLES_SIGNATURE.includes(s.role)) {
      throw new Error(`Rôle de signature inconnu : ${s.role} ` +
        `(attendu : ${ROLES_SIGNATURE.join(', ')}).`);
    }
    const nom = String(s.nom ?? '').trim();
    const prenom = String(s.prenom ?? '').trim();
    if (!nom || !prenom) {
      throw new Error('Nom et prénom du signataire obligatoires ' +
        '(personne physique, jamais la raison sociale seule).');
    }
    const parDelegation = Boolean(s.parDelegation);
    const organisation = String(s.organisation ?? '').trim() || null;
    if (parDelegation && !organisation) {
      throw new Error('Raison sociale du détenteur représenté obligatoire ' +
        'pour une signature par délégation.');
    }
    const revision = mouvement.revisionBrouillon ?? 0;
    if (s.role === 'DETENTEUR') {
      const techValide = db.get(
        `SELECT id FROM signatures_mouvement
         WHERE mouvement_id = ? AND role = 'TECHNICIEN'
           AND version_document = ?`,
        [mouvement.id, revision]);
      if (!techValide) {
        throw new Error('Signature du détenteur refusée : le technicien ' +
          'signe en premier (signature du technicien absente ou périmée).');
      }
    }
    if (!s.imagePng) throw new Error(MSG_TRACE_ABSENT);
    let octets;
    try {
      octets = decoderBase64Pj(s.imagePng);
    } catch {
      throw new Error(MSG_PAS_PNG);
    }
    const illisible = verifierImageSignature(octets);
    if (illisible) throw new Error(illisible);

    // Identité de session au moment de signer (témoin) : le compte, et la
    // fiche du personnel qui lui est liée s'il y en a une. Sans session
    // (harnais in-process) : null, comme la démo.
    const idCompte = contexte?.utilisateur ?? null;
    const compte = idCompte
      ? db.get('SELECT personnel_id FROM utilisateurs_app WHERE id = ?',
        [idCompte])
      : null;

    const enregistrement = {
      id: db.generateId('SIG'),
      mouvementId: mouvement.id,
      role: s.role,
      nom,
      prenom,
      qualite: String(s.qualite ?? '').trim() || null,
      organisation,
      parDelegation,
      dateHeure: new Date().toISOString(),
      declaration: declarationSignature(s.role, parDelegation, organisation),
      // Base64 CANONIQUE, ré-encodée des octets contrôlés (parité démo).
      imagePng: Buffer.from(octets).toString('base64'),
      sessionCompteId: idCompte,
      sessionPersonnelId: compte?.personnel_id ?? null,
      // Empreinte de la fiche TELLE QUE PRÉSENTÉE au signataire (objet
      // logique, même projection que la chaîne, sans chaînage).
      sha256Document: hasherMouvement(objetLogiquePourHash(mouvement), null),
      versionDocument: revision
    };
    return muter(() => {
      const ligne = mapping.versSql('signatures_mouvement', enregistrement);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('signatures_mouvement', ligne);
      journaliser(`${prenom} ${nom}`, 'SIGNATURE_MOUVEMENT', mouvement.numero,
        `${s.role}${parDelegation ? ` (par délégation : ${organisation})` : ''}` +
        ` · révision ${revision}` +
        ` · document ${enregistrement.sha256Document.slice(0, 12)}…`);
      return { ...enregistrement, valide: true };
    });
  },

  /** Lot C (C1) : les signatures réelles d'un mouvement, avec leur état. */
  getSignaturesMouvement(params) {
    const { mouvementId } = params;
    const mouvement = trouverMouvement(mouvementId);
    const revision = mouvement.revisionBrouillon ?? 0;
    return db.all(
      'SELECT * FROM signatures_mouvement WHERE mouvement_id = ?',
      [mouvementId])
      .map((ligne) => mapping.versFront('signatures_mouvement', ligne))
      .sort((a, b) => {
        if (a.dateHeure !== b.dateHeure) {
          return a.dateHeure < b.dateHeure ? -1 : 1;
        }
        return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
      })
      .map((sig) => ({ ...sig,
        valide: (sig.versionDocument ?? 0) === revision }));
  },

  /**
   * Lot E ① : export RGPD des données d'une personne (accès/portabilité).
   * Compose les lectures existantes (parité prouvée) + les signatures brutes
   * mappées comme getSignaturesMouvement, puis délègue au module pur partagé.
   * Lecture SENSIBLE : gatée VALIDEUR par garderRole (jamais un élève).
   */
  exporterDonneesPersonne(params) {
    const { personneId } = params;
    const signaturesMouvement = db
      .all('SELECT * FROM signatures_mouvement')
      .map((ligne) => mapping.versFront('signatures_mouvement', ligne));
    const sources = {
      personnel: HANDLERS.getPersonnel(),
      habilitations: HANDLERS.getHabilitations(),
      mentions: HANDLERS.getMentions(),
      signaturesMouvement,
      mouvements: HANDLERS.getMouvements(),
      controles: HANDLERS.getControles(),
      piecesJointes: HANDLERS.listerPiecesJointes(
        { entiteType: 'personne', entiteId: personneId })
    };
    const exportPersonne = assemblerExportPersonne(
      personneId, sources, new Date().toISOString());
    // Lot E2 : personne AU COFFRE → les noms réels des signatures scellées
    // ne sortent pas par ce canal (il contournerait le motif + le journal
    // de la consultation) — substitués par le pseudonyme (= la fiche
    // vivante), avec mention dédiée.
    if (estAuCoffreServeur(personneId)) {
      const fiche = exportPersonne.personne;
      exportPersonne.signatures = exportPersonne.signatures.map((s) => ({
        ...s, nom: fiche.nom, prenom: fiche.prenom }));
      exportPersonne.identiteAuCoffre =
        'Identité au coffre : la consultation des données réelles passe ' +
        'par le geste dédié (Protection des données), motif et journal.';
    }
    return exportPersonne;
  },

  /**
   * SOUMIS → VALIDE : applique les effets stocks/charges (atomiques),
   * CR-3 (contrôle lié si déclaré), fige la quantité SIGNÉE, puis SCELLE
   * l'écriture (hash chaîné) — le tout dans une seule transaction.
   * DOUBLE GARDE de rôle : la route lit le rôle de SESSION, ici on lit en
   * base le rôle du VALIDATEUR DÉSIGNÉ (un élève désigné est refusé, le
   * statut reste SOUMIS).
   */
  validerMouvement(params, contexte) {
    const { id, validateurId, pdfFinalBase64 } = params;
    const mouvement = trouverMouvement(id);
    if (mouvement.statut === 'VALIDE' || mouvement.statut === 'ANNULE') {
      throw new Error(MSG_ECRITURE_FIGEE);
    }
    if (mouvement.statut !== 'SOUMIS') {
      throw new Error('Seul un mouvement soumis peut être validé.');
    }
    const validateur = verifierValidateur(validateurId);
    // Lot B (condition n° 12) : le validateur DOIT être la personne
    // connectée — TOUS les modes, 403 AVANT tout effet (sécurité : le
    // journal recoupait déjà, désormais l'API refuse). Sans session
    // (harnais in-process), repli historique comme getUtilisateurCourant.
    exigerValidateurDeSession(validateurId, contexte);
    // Lot C (C3) : le PDF final présenté aux signataires est REÇU à la
    // validation OFFICIELLE et contrôlé AVANT le verdict du moteur (les
    // refus PDF restent ainsi éprouvables verrou de livraison fermé —
    // même ordre que la démo). En FORMATION, rien ne change : un PDF
    // fourni est refusé (plan lot C §2.4).
    let octetsPdfFinal = null;
    // Brique C5 : le TRANSFERT est EXEMPTÉ du PDF final (arbitrage
    // Franck 19/07 — jamais de CERFA, IM-12) ; un PDF fourni malgré
    // tout est refusé, comme hors mode Officiel.
    if (mouvement.mode === 'OFFICIEL' && pdfFinalAttendu(mouvement.type)) {
      if (!pdfFinalBase64) throw new Error(MSG_PDF_FINAL_MANQUANT);
      octetsPdfFinal = decoderBase64Pj(pdfFinalBase64);
      const controlePdf = verifierOctetsPdfFinal(octetsPdfFinal);
      if (!controlePdf.ok) throw new Error(controlePdf.erreur);
    } else if (pdfFinalBase64) {
      throw new Error(mouvement.mode === 'OFFICIEL'
        ? MSG_PDF_FINAL_TRANSFERT : MSG_PDF_FINAL_HORS_OFFICIEL);
    }
    // Blocage dur OFFICIEL (lot B) : 3e moment (VALIDATION), AVANT tout
    // effet — signature comprise.
    if (mouvement.mode === 'OFFICIEL') {
      const verdict = evaluerOfficiel('VALIDATION',
        cadreFicheOfficiel(mouvement), contexte, validateurId);
      if (!verdict.ok) {
        throw new Error(messageRefusOfficiel(verdict.blocages));
      }
    }
    // Lot C (C3b) : manifeste du PDF conservé, construit DANS la
    // transaction (état scellé), écrit APRÈS elle (best-effort).
    let temoinPdfFinal = null;
    const resultatValidation = muter(() => {
      // Règles métier + effets stocks/charges (throw si violation) : muter
      // fluide / machineLabel / quantiteKg sur l'objet logique.
      appliquerEffets(mouvement);

      // CR-3 : le contrôle déclaré à l'étape 5 du wizard produit un VRAI
      // contrôle lié (mêmes effets machine que createControle), croisé au
      // mouvement AVANT le scellement pour entrer dans l'empreinte.
      const declare = mouvement.controle || {};
      if (mouvement.machineId &&
          (declare.statutControle === 'CONFORME' ||
           declare.statutControle === 'FUITE')) {
        // P7-d : pour un mouvement DE TYPE CONTROLE (le contrôle est l'objet
        // de l'écriture), l'échéance suivante est CALCULÉE par la logique
        // réglementaire UNIQUE (cadre 7, même calcul que le handler
        // calculerProchainControle) — jamais saisie librement. Sans elle, la
        // machine garderait son ancienne échéance et sonnerait « en retard »
        // après un contrôle tout frais. Le contrôle ACCESSOIRE
        // (charge/récupération) garde le comportement historique (aucune
        // mise à jour d'échéance). Parité stricte avec le DemoStore.
        let prochainCalcule = null;
        if (mouvement.type === 'CONTROLE_PERIODIQUE' ||
            mouvement.type === 'CONTROLE_NON_PERIODIQUE') {
          const machineDuControle = trouverMachine(mouvement.machineId);
          const fluideRef = lireFluide(machineDuControle.fluide);
          // P1-1 (E1) : détection EFFECTIVE à la date du mouvement.
          const frequenceMois = frequenceControleMois(
            fluideRef, machineDuControle.chargeNominaleKg,
            equipement.detectionEffective(machineDuControle,
              mouvement.date).compte,
            mouvement.date);
          if (frequenceMois) {
            prochainCalcule = ajouterMois(mouvement.date, frequenceMois);
          }
        }
        const controleLie = enregistrerControle({
          machineId: mouvement.machineId,
          date: mouvement.date,
          // P7-a : un mouvement de type CONTROLE_PERIODIQUE produit un
          // contrôle PÉRIODIQUE ; le contrôle accessoire à une charge ou une
          // récupération reste NON_PERIODIQUE (cas historique préservé).
          typeControle: mouvement.type === 'CONTROLE_PERIODIQUE'
            ? 'PERIODIQUE' : 'NON_PERIODIQUE',
          methode: 'DIRECTE',
          resultat: declare.statutControle,
          detecteurId: declare.detecteurId ?? null,
          // R5 : localisation de la fuite saisie à l'étape 5 du wizard,
          // propagée jusqu'au contrôle enregistré (puis au CERFA cadre 10).
          localisationFuite: declare.localisationFuite ?? null,
          operateur: mouvement.technicien ?? null,
          // P7-d : effets STRICTEMENT identiques à createControle direct —
          // le lien à la fiche personnel (B2) et l'échéance RÉGLEMENTAIRE
          // passent aussi par le chemin mouvement (le contrôle lié ne perd rien).
          operateurId: mouvement.executeParId ?? null,
          prochainControle: prochainCalcule,
          mouvementId: mouvement.id,
          // Le contrôle lié EST la même fiche que le mouvement : il hérite de
          // son numéro et de son mode (le CERFA généré depuis l'un ou l'autre
          // affiche le même numéro et le même filigrane).
          numero: mouvement.numero,
          mode: mouvement.mode
        });
        mouvement.controle = { ...declare, controleId: controleLie.id };
      }

      mouvement.validateurId = validateurId;
      mouvement.statut = 'VALIDE';
      // IM-12 : un TRANSFERT interne ne reçoit AUCUN numéro CERFA.
      mouvement.cerfaNumero =
        mouvement.type === 'TRANSFERT' ? null : mouvement.numero;
      // Brique ② : PRP du fluide DU MOUVEMENT figé au moment où l'écriture
      // devient opposable (même moment que cerfaNumero, HORS empreinte —
      // le référentiel peut évoluer, l'écriture validée garde sa valeur).
      mouvement.prpFige = lireFluide(mouvement.fluide)?.gwpAr4 ?? null;

      // Brique produit n°2 : l'état des outils déclarés est FIGÉ au moment
      // où l'écriture devient opposable — AVANT le passage en VALIDE en
      // base (les triggers de la migration 18 interdisent toute retouche
      // des liens d'un mouvement figé). Lot C (C2) : déplacé AVANT le
      // scellement (comme le DemoStore, qui figeait déjà avant) — la liste
      // triée entre désormais dans l'empreinte v2 (champ gelé outilsFiges).
      const jourValidation = aujourdHui();
      const liensOutils = db.all(
        'SELECT id, outillage_id FROM mouvement_outillage WHERE mouvement_id = ?',
        [mouvement.id]);
      const outilsFiges = [];
      for (const lien of liensOutils) {
        const ligneOutil = db.get(
          'SELECT * FROM outillage WHERE id = ?', [lien.outillage_id]);
        const outil = ligneOutil
          ? mapping.versFront('outillage', ligneOutil) : null;
        const statutFige = outil
          ? calculerStatutOutil(outil, jourValidation) : null;
        db.run(
          'UPDATE mouvement_outillage SET statut_fige = ?, echeance_figee = ? '
          + 'WHERE id = ?',
          [statutFige, outil?.prochaineEcheance ?? null, lien.id]);
        outilsFiges.push(`${lien.outillage_id}=${statutFige ?? 'DISPARU'}`);
      }
      outilsFiges.sort();

      // Lot C (C3) : le PDF final contrôlé plus haut devient une pièce
      // jointe SYSTÈME (catégorie CERFA_FINAL), conservée AVANT le calcul
      // des champs gelés : son empreinte entre dans hashPiecesJointes ET
      // dans hashPdfFinal.
      let shaPdfFinal = null;
      let pjIdPdfFinal = null;
      if (octetsPdfFinal) {
        const conserve = conserverPdfFinal(mouvement, octetsPdfFinal,
          `${validateur.prenom} ${validateur.nom}`);
        shaPdfFinal = conserve.sha;
        pjIdPdfFinal = conserve.pjId;
      }
      // Lot C (C2) : champs GELÉS au scellement — calculés ICI, attachés à
      // l'objet AVANT sceller(), stockés en colonnes, JAMAIS re-dérivés (la
      // vérification de chaîne relit les valeurs stockées ; un ajout
      // légitime ultérieur, PJ comprise, ne casse pas la chaîne).
      mouvement.outilsFiges = outilsFiges;
      mouvement.hashSignatures = empreinteSignaturesMouvement(mouvement.id);
      mouvement.hashPiecesJointes =
        empreintePiecesJointesMouvement(mouvement.id);
      mouvement.hashPdfFinal = shaPdfFinal;
      // Empreinte RENFORCÉE : toute NOUVELLE écriture scellée est v2 (les
      // écritures existantes gardent leur v1 — jamais rétroactif).
      mouvement.versionEmpreinte = 2;
      sceller(mouvement);

      // Persistance : effets déjà écrits, ici on fige l'écriture (SOUMIS →
      // VALIDE, quantité, contrôle aplati, champs gelés, scellement).
      persisterMouvementValide(mouvement);

      // Lot C (C3b) : le manifeste du PDF conservé se construit ICI
      // (l'empreinte scellée du mouvement existe désormais) ; il sera
      // écrit sur disque APRÈS la transaction. Signataires = ceux de la
      // révision scellée, tri en JS (règle maison, jamais d'ORDER BY).
      if (pjIdPdfFinal) {
        const signataires = db.all(
          `SELECT id, role, nom, prenom, qualite, par_delegation, date_heure
           FROM signatures_mouvement
           WHERE mouvement_id = ? AND version_document = ?`,
          [mouvement.id, mouvement.revisionBrouillon ?? 0])
          .sort((a, b) => (a.date_heure < b.date_heure ? -1
            : a.date_heure > b.date_heure ? 1
              : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
          .map((ligne) => ({
            role: ligne.role,
            nom: ligne.nom,
            prenom: ligne.prenom,
            qualite: ligne.qualite ?? null,
            parDelegation: Boolean(ligne.par_delegation),
            dateHeure: ligne.date_heure
          }));
        temoinPdfFinal = {
          type: 'PDF_FINAL_CERFA',
          logiciel: 'inerWeb Fluide',
          versionLogiciel: VERSION_LOGICIEL,
          numeroFiche: mouvement.numero,
          cerfaNumero: mouvement.cerfaNumero ?? null,
          mouvementId: mouvement.id,
          pieceJointeId: pjIdPdfFinal,
          nomFichier: nomFichierPdfFinal(mouvement.numero),
          sha256Pdf: shaPdfFinal,
          dateValidation: new Date().toISOString(),
          validateur: `${validateur.prenom} ${validateur.nom}`,
          signataires,
          empreinteMouvement: mouvement.hashEcriture,
          hashPrecedent: mouvement.hashPrecedent ?? null,
          versionEmpreinte: mouvement.versionEmpreinte,
          hashSignatures: mouvement.hashSignatures,
          hashPiecesJointes: mouvement.hashPiecesJointes
        };
      }

      // Le PRP figé est consigné dans le journal CHAÎNÉ : prg_fige est hors
      // empreinte (falsifiable dans un export édité à la main), cette ligne
      // de journal donne le point de recoupement opposable.
      // Les outils figés sont consignés AUSSI au journal chaîné (motif
      // prpFige) : la table de liens est hors empreinte — cette ligne de
      // journal est le point de recoupement opposable d'un export forgé.
      journaliser(`${validateur.prenom} ${validateur.nom}`,
        'VALIDATION_MOUVEMENT', mouvement.numero,
        `${mouvement.type} · ${mouvement.quantiteKg} kg ${mouvement.fluide}`
        + (mouvement.prpFige != null ? ` · PRP figé ${mouvement.prpFige}` : '')
        + (outilsFiges.length ? ` · outils figés : ${outilsFiges.join(', ')}` : '')
        // Lot C (C3) : l'empreinte du PDF conservé au journal chaîné —
        // point de recoupement opposable du document figé.
        + (shaPdfFinal ? ` · PDF final conservé (sha256 ${shaPdfFinal})` : ''));

      const resultat = reconstituerMouvement(lireLigneMouvement(id));
      // IM-4 : une récupération-démantèlement qui VIDE la machine invite
      // l'interface à proposer le démantèlement (proposition éphémère, rien
      // n'est appliqué ni persisté).
      if (mouvement.type === 'RECUPERATION_DEMANTELEMENT' &&
          mouvement.machineId) {
        const machine = trouverMachine(mouvement.machineId);
        if (machine.statut !== 'DEMANTELEE' &&
            Math.abs(machine.chargeActuelleKg) <=
              TOLERANCE_CHARGE_RESIDUELLE_KG) {
          resultat.proposerDemantelement = true;
        }
      }
      return resultat;
    });
    // Lot C (C3b) : témoins du PDF conservé (.sha256 + manifeste.json)
    // écrits HORS transaction — l'écriture scellée est acquise, un échec
    // est journalisé, jamais bloquant (même esprit que le lot D).
    if (temoinPdfFinal) ecrireTemoinsPdfFinal(temoinPdfFinal);
    return resultatValidation;
  },

  /**
   * Annule une écriture VALIDE par CONTRE-ÉCRITURE : une nouvelle écriture
   * scellée porte la quantité OPPOSÉE (pesées permutées, bouteilles NON
   * permutées) et applique les effets inverses ; l'originale passe ANNULE
   * sans qu'une seule de ses données ne bouge (empreinte intacte).
   */
  annulerParContreEcriture(params, contexte) {
    const { id, motif, validateurId } = params;
    const original = trouverMouvement(id);
    if (original.statut === 'ANNULE') {
      throw new Error('Écriture déjà annulée : contre-écriture impossible.');
    }
    if (original.statut !== 'VALIDE') {
      throw new Error(
        'Seule une écriture validée peut être annulée par contre-écriture.');
    }
    if (!motif || !String(motif).trim()) {
      throw new Error('Motif d’annulation obligatoire.');
    }
    const validateur = verifierValidateur(validateurId);
    // Lot B (condition n° 12) : une contre-écriture est une écriture
    // scellée — même exigence que la validation (session = validateur).
    exigerValidateurDeSession(validateurId, contexte);
    const motifNet = String(motif).trim();
    return muter(() => {
      // Effets inverses AVANT de figer quoi que ce soit (throw si impossible).
      appliquerEffetsInverses(original);

      const contreEcriture = {
        id: db.generateId('MVT'),
        numero: prochainNumeroMouvement(original.mode),
        date: aujourdHui(),
        mode: original.mode,
        type: original.type,
        machineId: original.machineId ?? null,
        machineLabel: original.machineLabel ?? null,
        fluide: original.fluide ?? null,
        // Quantité OPPOSÉE (+ 0 neutralise un éventuel « moins zéro »).
        quantiteKg: arrondir(-original.quantiteKg) + 0,
        // Pesées permutées : le fluide fait le chemin inverse.
        peseeAvantKg: original.peseeApresKg ?? null,
        peseeApresKg: original.peseeAvantKg ?? null,
        // Bouteilles NON permutées.
        bouteilleSrcId: original.bouteilleSrcId ?? null,
        bouteilleDstId: original.bouteilleDstId ?? null,
        causeMouvement: original.causeMouvement ?? null,
        controle: { statutControle: 'SANS_OBJET', detecteurId: null },
        signatureDataUrl: null,
        technicien: `${validateur.prenom} ${validateur.nom}`,
        motif: motifNet,
        validateurId,
        contreEcritureDe: original.id,
        statut: 'VALIDE',
        hashEcriture: null,
        hashPrecedent: null,
        cerfaNumero: null,
        // Lot C (C1) : mêmes clés que creerMouvement (parité démo). Une
        // contre-écriture se scelle SANS le parcours de double signature
        // (attestation d'identité du validateur, plan §9).
        revisionBrouillon: 0,
        versionEmpreinte: 1,
        outilsFiges: null,
        hashSignatures: null,
        hashPiecesJointes: null,
        hashPdfFinal: null
      };
      // IM-12 : pas de CERFA pour un TRANSFERT.
      contreEcriture.cerfaNumero =
        contreEcriture.type === 'TRANSFERT' ? null : contreEcriture.numero;
      // Brique ② : la contre-écriture fige le PRP à SA validation (même
      // fluide que l'original ; si le référentiel a bougé entre-temps, les
      // deux valeurs témoignent chacune de leur époque).
      contreEcriture.prpFige =
        lireFluide(contreEcriture.fluide)?.gwpAr4 ?? null;
      // Lot C (C2) : une contre-écriture se scelle en v2 SANS le parcours
      // de double signature (attestation d'identité du validateur, plan
      // §9) — listes gelées VIDES (empreinte de « [] », jamais null) et
      // PDF final null. Aucune signature ni PJ ne peut exister sur cet id
      // fraîchement créé.
      contreEcriture.outilsFiges = [];
      contreEcriture.hashSignatures = empreinteListeTriee([]);
      contreEcriture.hashPiecesJointes = empreinteListeTriee([]);
      contreEcriture.hashPdfFinal = null;
      contreEcriture.versionEmpreinte = 2;
      sceller(contreEcriture);
      insererMouvement(contreEcriture);

      // L'original change UNIQUEMENT de statut : tout le reste identique
      // (le déclencheur WORM l'exige — voir schema.sql).
      majParId('mouvements', original.id, { statut: 'ANNULE' });

      journaliser(`${validateur.prenom} ${validateur.nom}`,
        'CONTRE_ECRITURE', contreEcriture.numero,
        `Annule ${original.numero} · motif : ${contreEcriture.motif}`);
      return reconstituerMouvement(lireLigneMouvement(contreEcriture.id));
    });
  },

  /** CR-5 : vérifie la chaîne de hash SHA-256 des écritures figées. */
  verifierChaineHash() {
    return verifierChaineMouvements();
  },

  // === chaîne déchets / BSFF (VAGUE 7 — SPEC §5.8) ==========

  /**
   * IM-7 : décision sur le fluide d'une bouteille de RÉCUPÉRATION. DECHET
   * fige la bouteille (statut/état DECHET, délai de garde d'un an) ; une
   * décision réutilisable/à analyser est RÉVERSIBLE (restaure EN_STOCK /
   * RECUPERE, efface le délai). Reprend deciderFluideRecupere du DemoStore
   * (messages, effets, journal mot pour mot).
   */
  deciderFluideRecupere(params) {
    const { id, decision, par } = params;
    const bouteille = trouverBouteille(id);
    if (!DECISIONS_FLUIDE.includes(decision)) {
      throw new Error(
        `Décision inconnue : ${decision} ` +
        `(attendu : ${DECISIONS_FLUIDE.join(', ')}).`);
    }
    if (bouteille.type !== 'RECUPERATION') {
      throw new Error(
        'La décision sur le fluide ne concerne que les bouteilles de ' +
        'récupération.');
    }
    if (bouteille.statut === 'RETOURNEE') {
      throw new Error(
        `Bouteille ${bouteille.code} sortie de l’établissement : ` +
        'décision sans objet.');
    }
    const etaitDechet = bouteille.statut === 'DECHET';
    const patch = {
      decision_fluide: decision,
      decision_par: par ?? null,
      date_decision: aujourdHui()
    };
    if (decision === 'DECHET') {
      patch.statut = 'DECHET';
      patch.etat_fluide = 'DECHET';
      patch.date_limite_garde = ajouterUnAn(aujourdHui());
    } else {
      // IM-7 : décision RÉVERSIBLE — restaure le stock, efface l'état déchet.
      patch.statut = 'EN_STOCK';
      patch.etat_fluide = 'RECUPERE';
      patch.date_limite_garde = null;
    }
    return muter(() => {
      majParId('bouteilles', bouteille.id, patch);
      journaliser(par, 'DECISION_FLUIDE', bouteille.code,
        `${decision} (${bouteille.fluide})` +
        (etaitDechet && decision !== 'DECHET'
          ? ' · retour en stock (état déchet annulé)' : ''));
      return lireBouteille(bouteille.id);
    });
  },

  /**
   * IM-8 : sortie BSFF d'une bouteille DÉCHET. Décrémente la masse remise ;
   * remise totale → bouteille vidée et RETOURNEE, remise partielle → reliquat
   * en stock (statut DECHET conservé). Numéro de BSFF reporté sur la bouteille.
   * Reprend createBsff du DemoStore (garde-fous, décrément, journal exacts).
   */
  createBsff(params) {
    const d = params.donneesBsff || params || {};
    const bouteille = trouverBouteille(d.bouteilleId);
    if (bouteille.statut !== 'DECHET') {
      throw new Error(
        'Sortie BSFF impossible : la bouteille doit d’abord être ' +
        'déclarée DÉCHET (décision sur le fluide récupéré).');
    }
    if (!d.numeroBsff || !String(d.numeroBsff).trim()) {
      throw new Error('Numéro de BSFF obligatoire.');
    }
    const masse = Number(d.masseRemiseKg);
    if (!Number.isFinite(masse) || masse <= 0) {
      throw new Error('Masse remise obligatoire (en kg, positive).');
    }
    if (masse > bouteille.masseNetteKg + 1e-9) {
      throw new Error(
        `Masse remise (${masse} kg) supérieure au contenu de la ` +
        `bouteille ${bouteille.code} (${bouteille.masseNetteKg} kg).`);
    }
    const bsff = {
      id: db.generateId('BSFF'),
      bouteilleId: bouteille.id,
      bouteilleCode: bouteille.code,
      fluide: bouteille.fluide,
      numeroBsff: String(d.numeroBsff).trim(),
      transporteur: d.transporteur ?? null,
      installationDestination: d.installationDestination ?? null,
      masseRemiseKg: arrondir(masse),
      dateRemise: d.dateRemise ?? aujourdHui()
    };
    return muter(() => {
      const ligne = mapping.versSql('bsff', bsff);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('bsff', ligne);

      // IM-8 : la bouteille est décrémentée de la masse REMISE.
      let nette = arrondir(bouteille.masseNetteKg - bsff.masseRemiseKg);
      const patch = { numero_bsff: bsff.numeroBsff, date_derniere_pesee: aujourdHui() };
      if (nette <= 1e-9) {
        nette = 0;
        patch.statut = 'RETOURNEE';
      }
      patch.masse_brute_kg = arrondir(bouteille.tareKg + nette);
      majParId('bouteilles', bouteille.id, patch);

      journaliser(d.operateur, 'SORTIE_BSFF', bouteille.code,
        `BSFF ${bsff.numeroBsff} · ${fmtKgSigne(-bsff.masseRemiseKg)} ` +
        `${bsff.fluide} → ${bsff.installationDestination ?? 'destination non renseignée'}` +
        (nette > 0 ? ` · reliquat ${nette} kg en stock` : ''));
      return lireBsff(bsff.id);
    });
  },

  /** Tous les BSFF, triés date de remise décroissante. */
  getBsff() {
    const lignes = db.all('SELECT * FROM bsff ORDER BY date_remise DESC');
    return lignes.map((ligne) => mapping.versFront('bsff', ligne));
  },

  /**
   * P0-8 (DA-2) : atteste l'ISSUE de traitement final d'un BSFF émis.
   * Miroir EXACT du DemoStore (grille, gardes, journal). Corrige BSFF ≠
   * destruction : seule une issue DESTRUCTION alimentera la rubrique 9.
   */
  attesterIssueBsff(params) {
    const { bsffId } = params;
    const a = params.attestation || {};
    const existe = db.get('SELECT id FROM bsff WHERE id = ?', [bsffId]);
    if (!existe) throw new Error(`BSFF introuvable : ${bsffId}.`);
    if (!ISSUES_TRAITEMENT_BSFF.includes(a.issueTraitement)) {
      throw new Error(
        `Issue de traitement inconnue : ${a.issueTraitement} ` +
        `(attendu : ${ISSUES_TRAITEMENT_BSFF.join(', ')}).`);
    }
    const installation = String(a.installationTraitement ?? '').trim();
    if ((a.issueTraitement === 'REGENERATION' ||
         a.issueTraitement === 'DESTRUCTION') && !installation) {
      throw new Error(
        'Installation de traitement obligatoire pour une régénération ou ' +
        'une destruction (coordonnées de l’installation exigées).');
    }
    return muter(() => {
      const bsff = lireBsff(bsffId);
      majParId('bsff', bsffId, {
        issue_traitement: a.issueTraitement,
        installation_traitement: installation || null,
        certificat_traitement: a.certificatTraitement ?? null,
        date_traitement: a.dateTraitement ?? aujourdHui()
      });
      journaliser(a.operateur, 'ISSUE_BSFF', bsff.bouteilleCode,
        `BSFF ${bsff.numeroBsff} · traitement final : ${a.issueTraitement}` +
        (installation ? ` (${installation})` : ''));
      return lireBsff(bsffId);
    });
  },

  /**
   * IM-9 : retour d'une bouteille consignée au fournisseur. La masse nette
   * restante alimente le poste « retours fournisseur » de la balance ; la
   * bouteille sort du stock (RETOURNEE). Reprend retournerFournisseur du
   * DemoStore (garde-fous, trace, journal exacts).
   */
  retournerFournisseur(params) {
    const { id, par } = params;
    const operateur = par ?? null;
    const bouteille = trouverBouteille(id);
    if (bouteille.statut === 'RETOURNEE') {
      throw new Error(`Bouteille ${bouteille.code} déjà retournée.`);
    }
    if (bouteille.statut === 'DECHET') {
      throw new Error(
        `Bouteille ${bouteille.code} déclarée déchet : la sortie passe ` +
        'par un BSFF, pas par un retour fournisseur.');
    }
    const masseKg = bouteille.masseNetteKg;
    const retour = {
      id: db.generateId('RF'),
      bouteilleId: bouteille.id,
      bouteilleCode: bouteille.code,
      fluide: bouteille.fluide,
      masseKg,
      date: aujourdHui(),
      operateur: operateur ?? null
    };
    return muter(() => {
      const ligne = mapping.versSql('retours_fournisseur', retour);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('retours_fournisseur', ligne);

      // La bouteille sort du stock : nette à 0, brute = tare.
      majParId('bouteilles', bouteille.id, {
        statut: 'RETOURNEE',
        masse_brute_kg: arrondir(bouteille.tareKg),
        date_derniere_pesee: aujourdHui()
      });

      journaliser(operateur, 'RETOUR_FOURNISSEUR', bouteille.code,
        `${fmtKgSigne(-masseKg)} ${bouteille.fluide} → fournisseur` +
        (bouteille.proprietaire ? ` ${bouteille.proprietaire}` : ''));
      return lireBouteille(bouteille.id);
    });
  },

  /** Tous les retours fournisseur, triés date décroissante. */
  getRetoursFournisseur() {
    const lignes = db.all(
      'SELECT * FROM retours_fournisseur ORDER BY date_retour DESC');
    return lignes.map((ligne) =>
      mapping.versFront('retours_fournisseur', ligne));
  },

  /**
   * P0-8 (DA-3) : CESSION de fluide à un tiers attesté (rubrique 10).
   * Miroir EXACT du DemoStore (gardes, décrément, journal). Trace figée.
   */
  createCession(params) {
    const d = params.donneesCession || params || {};
    const bouteille = trouverBouteille(d.bouteilleId);
    if (bouteille.statut === 'RETOURNEE') {
      throw new Error(`Bouteille ${bouteille.code} déjà sortie du stock.`);
    }
    if (bouteille.statut === 'DECHET') {
      throw new Error(
        `Bouteille ${bouteille.code} déclarée déchet : la sortie passe par ` +
        'un BSFF, pas par une cession.');
    }
    if (!DESTINATAIRES_CESSION.includes(d.destinataireType)) {
      throw new Error(
        `Type de destinataire inconnu : ${d.destinataireType} ` +
        `(attendu : ${DESTINATAIRES_CESSION.join(', ')}).`);
    }
    const raison = String(d.destinataireRaisonSociale ?? '').trim();
    if (!raison) {
      throw new Error('Raison sociale du destinataire obligatoire.');
    }
    const masse = Number(d.masseKg);
    if (!Number.isFinite(masse) || masse <= 0) {
      throw new Error('Masse cédée obligatoire (en kg, positive).');
    }
    if (masse > bouteille.masseNetteKg + 1e-9) {
      throw new Error(
        `Masse cédée (${masse} kg) supérieure au contenu de la bouteille ` +
        `${bouteille.code} (${bouteille.masseNetteKg} kg).`);
    }
    const cession = {
      id: db.generateId('CESSION'),
      bouteilleId: bouteille.id,
      bouteilleCode: bouteille.code,
      fluide: bouteille.fluide,
      destinataireType: d.destinataireType,
      destinataireRaisonSociale: raison,
      masseKg: arrondir(masse),
      date: d.date ?? aujourdHui(),
      operateur: d.operateur ?? null,
      observation: d.observation ?? null
    };
    return muter(() => {
      const ligne = mapping.versSql('cessions', cession);
      ligne.etablissement_id = ID_ETABLISSEMENT;
      inserer('cessions', ligne);

      // La bouteille est décrémentée de la masse cédée (comme un BSFF partiel).
      let nette = arrondir(bouteille.masseNetteKg - cession.masseKg);
      const patch = { date_derniere_pesee: aujourdHui() };
      if (nette <= 1e-9) {
        nette = 0;
        patch.statut = 'RETOURNEE';
      }
      patch.masse_brute_kg = arrondir(bouteille.tareKg + nette);
      majParId('bouteilles', bouteille.id, patch);

      journaliser(cession.operateur, 'CESSION', bouteille.code,
        `Cession ${fmtKgSigne(-cession.masseKg)} ${cession.fluide} → ` +
        `${raison} (${cession.destinataireType})`);
      return mapping.versFront('cessions',
        db.get('SELECT * FROM cessions WHERE id = ?', [cession.id]));
    });
  },

  /** Toutes les cessions, triées date décroissante. */
  getCessions() {
    const lignes = db.all('SELECT * FROM cessions ORDER BY date_cession DESC');
    return lignes.map((ligne) => mapping.versFront('cessions', ligne));
  },

  // === balance matière + synthèses (VAGUE 8 — SPEC §6/§7) ===

  /** Balance matière annuelle par fluide (via la VUE bilan_matiere). */
  getBalanceMatiere(params) {
    return calculerBalanceMatiere(Number(params.annee));
  },

  /**
   * P0-8 : déclaration annuelle réglementaire (11 rubriques par fluide).
   * Lit les collections et délègue au module pur (miroir du front, parité
   * prouvée). La présence d'une photo se déduit de photosBouteilles.
   */
  getDeclarationAnnuelle(params) {
    const lire = (table) => db.all(`SELECT * FROM ${table}`)
      .map((l) => mapping.versFront(table, l));
    return calculerDeclarationAnnuelle(Number(params.annee), {
      mouvements: lire('mouvements'),
      bouteilles: lire('bouteilles'),
      bsff: lire('bsff'),
      cessions: lire('cessions'),
      retoursFournisseur: lire('retours_fournisseur'),
      stocksInitiaux: lire('stocks_initiaux'),
      photosBouteilles: lire('inventaires_bouteilles')
    });
  },

  /**
   * Inventaire physique : upsert (année, fluide) du stock réel pesé, puis
   * balance recalculée. Reprend saisirInventaire du DemoStore (validations,
   * journal exacts).
   */
  saisirInventaire(params) {
    const anneeNum = Number(params.annee);
    const lignes = params.lignes;
    const operateur = params.par ?? params.operateur ?? null;
    if (!Number.isInteger(anneeNum)) {
      throw new Error('Année d’inventaire obligatoire (nombre entier).');
    }
    if (!Array.isArray(lignes) || lignes.length === 0) {
      throw new Error('Inventaire vide : au moins une ligne fluide attendue.');
    }
    for (const l of lignes) {
      if (!fluideConnu(l.fluide)) {
        throw new Error(`Fluide inconnu au référentiel : ${l.fluide}.`);
      }
      const reel = Number(l.stockReelKg);
      if (!Number.isFinite(reel) || reel < 0) {
        throw new Error(
          `Stock réel invalide pour ${l.fluide} (en kg, positif ou nul).`);
      }
    }
    return muter(() => {
      for (const l of lignes) {
        upsertInventaire(anneeNum, l.fluide, arrondir(Number(l.stockReelKg)),
          operateur);
      }
      // Brique ② (B7) : la saisie FIGE aussi la photographie nominative
      // de l'année — parité stricte avec le DemoStore.
      figerPhotoNominative(anneeNum);
      journaliser(operateur, 'SAISIE_INVENTAIRE', `inventaire ${anneeNum}`,
        `${lignes.length} fluide(s) pesé(s)`);
      return calculerBalanceMatiere(anneeNum);
    });
  },

  /**
   * Photographie nominative d'une année (brique ② / B7) : bouteilles
   * présentes + fuites ouvertes figées à la saisie de l'inventaire,
   * plus l'ouverture (photo N−1 = l'état au 01/01). Forme EXACTE du
   * DemoStore.
   */
  getInventaireNominatif(params) {
    const anneeNum = Number(params.annee);
    if (!Number.isInteger(anneeNum)) {
      throw new Error('Année d’inventaire obligatoire (nombre entier).');
    }
    const courant = lirePhotoNominative(anneeNum);
    const ouverture = lirePhotoOuNull(anneeNum - 1);
    return { ...courant, ouverture };
  },

  // ----------------------------------------------------------
  // Sentinelle d'alertes persistées (miroir du DemoStore)
  // ----------------------------------------------------------

  /** Les épisodes persistés, récents d'abord (lecture pure). */
  getSentinelle() {
    return lireSentinelleTriee();
  },

  /**
   * Réconcilie la table avec getAlertes() : ouvre/clôt des épisodes.
   * IDEMPOTENT (aucun effet ni transaction si rien n'a changé) ; ne
   * journalise PAS au registre chaîné. Reprend rafraichirSentinelle
   * du DemoStore.
   */
  rafraichirSentinelle() {
    const actives = HANDLERS.getAlertes();
    const maintenant = new Date().toISOString();
    const ouverts = db.all(
      `SELECT id, id_alerte AS idAlerte, niveau FROM sentinelle_alertes
       WHERE etablissement_id = ? AND resolue_le IS NULL`,
      [ID_ETABLISSEMENT]);
    const { apparitions, escalades, resolutions } =
      calculerTransitionsSentinelle(actives, ouverts, maintenant);
    if (apparitions.length === 0 && escalades.length === 0 &&
        resolutions.length === 0) {
      return lireSentinelleTriee();
    }
    return muter(() => {
      for (const app of apparitions) {
        inserer('sentinelle_alertes', {
          id: db.generateId('SEN'),
          etablissement_id: ID_ETABLISSEMENT,
          id_alerte: app.idAlerte,
          niveau: app.niveau,
          titre: app.titre,
          detail: app.detail,
          cible_vue: app.cibleVue,
          cible_id: app.cibleId,
          apparue_le: app.apparueLe,
          resolue_le: null,
          acquittee_le: null,
          acquittee_par: null
        });
      }
      // Escalade : rafraîchir le snapshot ET remettre à zéro l'acquittement
      // (l'aggravation doit être revue ; l'entrée de journal de l'ancien
      // acquittement reste, le journal est append-only).
      for (const esc of escalades) {
        db.run(
          `UPDATE sentinelle_alertes SET niveau = ?, titre = ?, detail = ?,
             cible_vue = ?, cible_id = ?, acquittee_le = NULL, acquittee_par = NULL
           WHERE id = ?`,
          [esc.niveau, esc.titre, esc.detail, esc.cibleVue, esc.cibleId, esc.id]);
      }
      for (const id of resolutions) {
        db.run('UPDATE sentinelle_alertes SET resolue_le = ? WHERE id = ?',
          [maintenant, id]);
      }
      return lireSentinelleTriee();
    });
  },

  /**
   * Marque « pris connaissance » l'épisode ouvert d'une alerte + CONSIGNE
   * au journal chaîné. Error si aucune alerte active ; idempotent si déjà
   * acquitté. NE MASQUE RIEN. Reprend acquitterAlerte du DemoStore.
   */
  acquitterAlerte(params) {
    const idAlerte = params.idAlerte;
    const par = params.par;
    if (!idAlerte || !String(idAlerte).trim()) {
      throw new Error('Identifiant d’alerte obligatoire.');
    }
    const episode = db.get(
      `SELECT * FROM sentinelle_alertes
       WHERE etablissement_id = ? AND id_alerte = ? AND resolue_le IS NULL`,
      [ID_ETABLISSEMENT, idAlerte]);
    if (!episode) {
      throw new Error('Aucune alerte active à acquitter pour cet identifiant.');
    }
    if (episode.acquittee_le) {
      return formaterEpisodeSentinelle(
        mapping.versFront('sentinelle_alertes', episode));
    }
    const maintenant = new Date().toISOString();
    return muter(() => {
      db.run(
        `UPDATE sentinelle_alertes SET acquittee_le = ?, acquittee_par = ?
         WHERE id = ?`,
        [maintenant, par ?? null, episode.id]);
      journaliser(par, 'ACQUITTEMENT_ALERTE', idAlerte, episode.titre);
      const relu = db.get('SELECT * FROM sentinelle_alertes WHERE id = ?',
        [episode.id]);
      return formaterEpisodeSentinelle(
        mapping.versFront('sentinelle_alertes', relu));
    });
  },

  /**
   * Justifie un écart d'inventaire (upsert année/fluide). Error s'il n'y a
   * aucun écart à justifier. Reprend justifierEcart du DemoStore.
   */
  justifierEcart(params) {
    const anneeNum = Number(params.annee);
    const { fluide, justification } = params;
    if (!justification || !String(justification).trim()) {
      throw new Error('Justification d’écart obligatoire.');
    }
    const balance = calculerBalanceMatiere(anneeNum);
    const ligne = balance.lignes.find((l) => l.fluide === fluide);
    if (!ligne || ligne.ecartKg === null) {
      throw new Error(
        `Aucun écart d'inventaire à justifier pour ${fluide} en ${anneeNum}.`);
    }
    const texte = String(justification).trim();
    return muter(() => {
      upsertJustification(anneeNum, fluide, texte);
      journaliser(null, 'JUSTIFICATION_ECART', `${fluide} ${anneeNum}`, texte);
      return calculerBalanceMatiere(anneeNum);
    });
  },

  /** Tableau de bord : forme EXACTE du DemoStore (getStats). */
  getStats() {
    return calculerStats();
  },

  /** Années proposables aux vues Bilan / Balance (∪ année courante), DESC. */
  getAnneesDisponibles() {
    return anneesDisponibles();
  },

  /** Bilan annuel calculé depuis les mouvements figés + le parc. */
  getBilan(params) {
    return calculerBilan(Number(params.annee));
  },

  /** CR : 4 vérifs bloquantes avant le passage en mode OFFICIEL. */
  peutPasserEnOfficiel() {
    return calculerPeutPasserEnOfficiel();
  },

  /**
   * Lot B — simulation de validation OFFICIELLE (lecture, ne bloque
   * jamais) : la liste complète des blocages comme si on validait la
   * fiche en mode Officiel MAINTENANT (niveau VALIDATION, verrou de
   * livraison compris). Le serveur évalue AUSSI la sauvegarde du poste
   * et le lien compte ↔ fiche du personnel de la session (validateurId
   * null : « ce compte pourra-t-il valider sous sa propre identité ? »).
   * Error si le mouvement est introuvable.
   */
  simulerValidationOfficielle(params, contexte) {
    const mouvement = trouverMouvement(params.mouvementId);
    return evaluerOfficiel('VALIDATION', cadreFicheOfficiel(mouvement),
      contexte, null);
  },

  // === export / import (VAGUE 11 — format d'échange entre stores) ====

  /**
   * Exporte l'état COMPLET dans l'enveloppe contractuelle FORMAT_EXPORT
   * { application, version, exporteLe, donnees }, JSON indenté 2 espaces.
   * `donnees` reprend la MÊME structure camelCase que le DemoStore (mêmes
   * clés, chaque collection à la forme du contrat) : un export local doit
   * pouvoir se réimporter dans le DemoStore et réciproquement. Les
   * reconstitutions déjà éprouvées (getMouvements avec hash/ordre/controle,
   * getBouteilles avec masse nette générée…) sont réutilisées telles quelles.
   */
  exporterJSON() {
    return JSON.stringify({
      application: 'inerWeb Fluide',
      version: 8,
      exporteLe: new Date().toISOString(),
      donnees: construireDonneesExport()
    }, null, 2);
  },

  /**
   * Importe une sauvegarde : true si adoptée, FALSE si illisible/structure
   * étrangère (sans lever), Error si forgée (chaîne rompue) ou incohérente.
   *
   * Ordre STRICT (les contrôles précèdent TOUT effet — jamais de mutation
   * partielle, l'état courant reste intact après un refus) :
   *  (1) JSON.parse → false si illisible ;
   *  (2) structure attendue présente → false sinon ;
   *  (3) invariants métier → THROW « Import refusé — donnée incohérente : … » ;
   *  (4) chaîne de hash des mouvements figés recalculée sur le CANDIDAT →
   *      THROW « Import refusé — chaîne d'intégrité rompue à l'écriture
   *      {numero} : fichier altéré ou forgé. » si divergence ;
   *  (5) remplacement TOTAL de l'état SQL en UNE transaction, journal
   *      IMPORT_DONNEES, return true. registreAltere est remis à null côté
   *      LocalStore (le harnais ne le retouche pas : l'état importé est sain).
   */
  importerJSON(params) {
    const texte = params?.texte;

    // (1) Illisible → false (le transport rend false sans lever).
    let paquet;
    try {
      paquet = JSON.parse(texte);
    } catch {
      return false;
    }
    // Accepte l'enveloppe d'export OU les données brutes (comme le DemoStore).
    let candidat = paquet && paquet.donnees ? paquet.donnees : paquet;

    // (2) Structure étrangère → false.
    if (!estStructureValide(candidat)) return false;

    // Compléments de reprise (imports d'anciennes phases) — mêmes clés que
    // le DemoStore, pour qu'une sauvegarde partielle reste importable.
    candidat = completerCandidat(candidat);

    // Lot E2 (brique E2c) : validation du COFFRE porté par le candidat.
    // ① Des enveloppes SIMULÉES (mode Démo) n'entrent JAMAIS en base réelle.
    if (candidat.coffreIdentites.some((c) =>
      String(c?.enveloppe ?? '').startsWith(coffre.PREFIXE_SIMULATION))) {
      throw new Error(coffre.MSG_SIMULATION_REJETEE);
    }
    // ② Refus PROTECTEUR : écraser un coffre local par un monde SANS coffre
    // détruirait des identités chiffrées d'élèves par un simple import.
    // (Deux coffres → remplacement : « un import restaure un instantané ».)
    const coffreLocal =
      (db.get('SELECT count(*) AS n FROM coffre_identites') ?? { n: 0 }).n;
    if (coffreLocal > 0 && candidat.coffreIdentites.length === 0) {
      throw new Error(
        'Import refusé : ce fichier ne porte aucun coffre des identités ' +
        'alors que des identités sont à l\'abri sur ce poste. Restaurez-les ' +
        'd\'abord (Protection des données), ou importez un fichier qui ' +
        'porte le coffre.');
    }
    // ③ Un coffre porté exige sa configuration (sel + témoin — sans eux les
    // enveloppes seraient indéchiffrables à jamais), des enveloppes au
    // format réel, et AUCUN orphelin (chaque identité pointe une fiche).
    if (candidat.coffreIdentites.length > 0) {
      if (!candidat.coffreConfig || !candidat.coffreConfig.sel ||
          !candidat.coffreConfig.temoin) {
        throw new Error(
          'Import refusé — coffre sans configuration (sel/témoin) : les ' +
          'identités seraient indéchiffrables à jamais. Fichier incomplet.');
      }
      const idsPersonnel = new Set(
        (candidat.personnel ?? []).map((p) => p && p.id));
      for (const c of candidat.coffreIdentites) {
        let octets = null;
        try {
          octets = Buffer.from(String(c.enveloppe ?? ''), 'base64');
        } catch { octets = null; }
        if (!octets || !chiffrementCoffre.estEnveloppeCoffre(octets)) {
          throw new Error(
            'Import refusé — enveloppe du coffre illisible ' +
            `(${c?.pseudonyme ?? '?'}) : fichier altéré ou forgé.`);
        }
        if (!idsPersonnel.has(c.personnelId)) {
          throw new Error(
            'Import refusé — identité du coffre orpheline ' +
            `(${c.pseudonyme ?? c.personnelId}) : aucune fiche du ` +
            'personnel correspondante. Fichier incohérent.');
        }
      }
    }

    // (3) Invariants métier AVANT d'adopter quoi que ce soit.
    const probleme = verifierInvariantsDonneesCandidat(candidat);
    if (probleme) {
      throw new Error(`Import refusé — donnée incohérente : ${probleme}.`);
    }

    // (4) Chaîne de hash des écritures figées, recalculée sur le CANDIDAT,
    // AVANT de toucher la base (le test forge une quantité → le hash ne
    // colle plus). Une sauvegarde antérieure à la chaîne (aucune empreinte)
    // voit sa chaîne amorcée. Chaîne MIXTE admise (lot C, C2) : le hasseur
    // est versionné par écriture, un export ancien sans versionEmpreinte
    // est tout v1.
    const figees = candidat.mouvements.filter((mv) =>
      mv.statut === 'VALIDE' || mv.statut === 'ANNULE');
    if (figees.some((mv) => mv.hashEcriture)) {
      const chaine = verifierChaineMouvementsCandidat(candidat.mouvements);
      if (!chaine.ok) {
        throw new Error(
          'Import refusé — chaîne d’intégrité rompue à l’écriture ' +
          `${chaine.casseA} : fichier altéré ou forgé.`);
      }
    } else if (figees.length > 0) {
      amorcerChaineCandidat(figees);
    }

    // (4 bis — lot C, C2, APRÈS la chaîne comme le DemoStore : mêmes
    // messages dans le même ordre sur un fichier à double faute — constat
    // de la revue adversariale C2) : les SIGNATURES d'une écriture scellée
    // v2 sont GELÉES dans son empreinte (hash_signatures). Recomptées sur
    // le candidat : une signature retouchée, ajoutée ou retirée dans le
    // JSON ne colle plus → fichier forgé. Une écriture scellée en v1 ne
    // peut PAS porter de signatures (la table arrive avec la v2 et le WORM
    // refuse toute signature sur une écriture figée) : en trouver dans le
    // candidat = rétrogradation forgée (basculer versionEmpreinte à 1
    // désarmait le recomptage — constat IMPORTANT de la revue, fermé ici).
    // (Lot C, C3c : l'asymétrie est FERMÉE — les PJ d'une écriture v2
    // sont figées avec elle, hash_pieces_jointes se RECOMPTE aussi.)
    for (const mv of figees) {
      if ((mv.versionEmpreinte ?? 1) < 2) {
        if ((candidat.signaturesMouvement ?? [])
          .some((sig) => sig.mouvementId === mv.id)) {
          throw new Error(
            `Import refusé — signatures sur l'écriture ${mv.numero} scellée ` +
            'en v1 (antérieure à la double signature) : fichier forgé.');
        }
        continue;
      }
      const empreinte = empreinteListeSignatures(
        (candidat.signaturesMouvement ?? [])
          .filter((sig) => sig.mouvementId === mv.id));
      if (empreinte !== mv.hashSignatures) {
        throw new Error(
          `Import refusé — signatures du mouvement ${mv.numero} altérées : ` +
          'fichier forgé.');
      }
      // Lot C (C3c) : les PJ d'une écriture v2 sont GELÉES dans son
      // empreinte (hash_pieces_jointes) et l'asymétrie est fermée —
      // recomptées sur le candidat : une PJ retouchée, ajoutée ou retirée
      // dans le JSON (CERFA_FINAL truquée comprise, plan §7.4) ne colle
      // plus → fichier forgé. Miroir exact du DemoStore.
      const empreintePj = empreinteListeTriee(
        (candidat.piecesJointes ?? [])
          .filter((pj) => pj.entiteType === 'MOUVEMENT' &&
                          pj.entiteId === mv.id)
          .map((pj) => pj.hashSha256 ?? ''));
      if (empreintePj !== mv.hashPiecesJointes) {
        throw new Error(
          `Import refusé — pièces jointes du mouvement ${mv.numero} ` +
          'altérées : fichier forgé.');
      }
    }

    // Lot C (C3c) : la catégorie CERFA_FINAL est réservée au canal système
    // — à l'IMPORT aussi (constat IMPORTANT de la revue C3c, fermé avant
    // commit). Une pièce CERFA_FINAL n'est légitime QUE sur une écriture
    // FIGÉE v2 dont l'empreinte du PDF est scellée (hashPdfFinal) ;
    // partout ailleurs — brouillon, autre entité, écriture sans PDF
    // scellé — c'est une fausse « pièce officielle » : fichier forgé.
    // Miroir exact du DemoStore.
    {
      const mouvementsParId = new Map(
        candidat.mouvements.map((mv) => [mv.id, mv]));
      for (const pj of candidat.piecesJointes ?? []) {
        if ((pj.categorie ?? '') !== CATEGORIE_PDF_FINAL) continue;
        const proprietaire = pj.entiteType === 'MOUVEMENT'
          ? mouvementsParId.get(pj.entiteId) : null;
        if (!proprietaire ||
            !(proprietaire.statut === 'VALIDE' ||
              proprietaire.statut === 'ANNULE') ||
            (proprietaire.versionEmpreinte ?? 1) < 2 ||
            !proprietaire.hashPdfFinal) {
          throw new Error(
            'Import refusé — pièce jointe CERFA_FINAL hors canal système ' +
            `(${pj.nomFichier ?? pj.id}) : fichier forgé.`);
        }
      }
    }

    // CR-4 : reprise des bouteilles sans masse d'entrée figée.
    for (const b of candidat.bouteilles) {
      if (!Number.isFinite(b.masseEntreeKg)) {
        b.masseEntreeKg = b.masseNetteKg;
      }
    }

    // (5) Remplacement TOTAL, atomique (throw → ROLLBACK complet, y compris
    // les déclencheurs WORM recréés). La vérification de chaîne est déjà
    // passée : on ne touche la base qu'ici.
    remplacerToutLEtat(candidat);
    return true;
  }
};

// ------------------------------------------------------------
// Export / import (VAGUE 11) — FORMAT D'ÉCHANGE entre stores.
// L'objet `donnees` reprend EXACTEMENT la structure du DemoStore
// (mêmes clés camelCase, chaque collection à la forme du contrat),
// pour qu'un export local se réimporte en démo et réciproquement.
// Reprend exporterJSON / importerJSON du DemoStore (sémantique triple,
// invariants CR-5, vérification de chaîne AVANT adoption, messages EXACTS).
// ------------------------------------------------------------

/**
 * Tables PLATES (clé composite, sans getter dédié) lues telles quelles pour
 * l'export : le mapping camelCase suffit (aucune reconstitution).
 */
function lireTablePlate(nomTable, sqlTable, tri) {
  const lignes = db.all(`SELECT * FROM ${sqlTable}${tri ? ` ORDER BY ${tri}` : ''}`);
  return lignes.map((ligne) => mapping.versFront(nomTable, ligne));
}

/**
 * Construit l'objet `donnees` COMPLET dans la structure du DemoStore. Chaque
 * collection réutilise la reconstitution déjà éprouvée (getMouvements,
 * getBouteilles…) : formes camelCase strictement identiques au contrat.
 */
function construireDonneesExport() {
  return {
    etablissement: HANDLERS.getEtablissement(),
    auditsOrganisme: HANDLERS.getAuditsOrganisme(),
    nonConformites: HANDLERS.getNonConformites(),
    clients: HANDLERS.getClients(),
    machines: HANDLERS.getMachines(),
    bouteilles: HANDLERS.getBouteilles(),
    mouvements: HANDLERS.getMouvements(),
    controles: HANDLERS.getControles(),
    fluides: HANDLERS.getFluides(),
    personnel: HANDLERS.getPersonnel(),
    habilitations: HANDLERS.getHabilitations(),
    mentionsHabilitation: HANDLERS.getMentions(),
    outillage: HANDLERS.getOutillage(),
    mouvementOutillage: lireTablePlate('mouvement_outillage',
      'mouvement_outillage', 'rowid'),
    // Signatures réelles (lot C, C1) : tri stable par pose (ISO + id ASCII,
    // la collation SQL octet à octet équivaut ici au tri JS du contrat).
    signaturesMouvement: lireTablePlate('signatures_mouvement',
      'signatures_mouvement', 'date_heure, id'),
    stocksInitiaux: lireTablePlate('stocks_initiaux', 'stocks_initiaux',
      'annee, fluide'),
    bsff: HANDLERS.getBsff(),
    inventaires: lireTablePlate('inventaires', 'inventaires', 'annee, fluide'),
    inventairesBouteilles: lireTablePlate('inventaires_bouteilles',
      'inventaires_bouteilles', 'annee, code_interne'),
    inventairesFuites: lireTablePlate('inventaires_fuites',
      'inventaires_fuites', 'annee, machine_label'),
    justificationsEcarts: lireTablePlate('justifications_ecarts',
      'justifications_ecarts', 'annee, fluide'),
    piecesJointes: lireTablePlate('pieces_jointes', 'pieces_jointes',
      'date_ajout, id'),
    retoursFournisseur: HANDLERS.getRetoursFournisseur(),
    // P0-8 : les cessions voyagent dans l'export (sinon perdues au round-trip
    // alors que la bouteille est déjà décrémentée → écart fantôme à l'import).
    cessions: HANDLERS.getCessions(),
    alertes: HANDLERS.getAlertes(),
    journalAudit: HANDLERS.getJournalAudit(),
    // Lot E2 (brique E2c) : le COFFRE voyage dans l'export — enveloppes en
    // base64 + configuration (sel/témoin/kdf) + compteurs MONOTONES. FAIT
    // ÉTABLI par la revue de conception : la table parametres ne voyage PAS
    // dans l'export JSON — sans ce bloc, un import sur poste neuf rendrait
    // toutes les identités indéchiffrables à jamais avec la bonne phrase.
    coffreIdentites: db.all(
      'SELECT * FROM coffre_identites ORDER BY pseudonyme')
      .map((l) => ({
        id: l.id,
        personnelId: l.personnel_id,
        pseudonyme: l.pseudonyme,
        enveloppe: Buffer.from(l.enveloppe).toString('base64'),
        dateMiseALabri: l.date_mise_a_labri
      })),
    coffreConfig: parametres.lire('coffre_temoin') === null ? null : {
      sel: parametres.lire('coffre_sel'),
      temoin: parametres.lire('coffre_temoin'),
      kdf: parametres.lire('coffre_kdf')
    },
    coffreCompteurs: Object.fromEntries(
      db.all(`SELECT cle, valeur FROM parametres
              WHERE cle LIKE 'coffre_compteur_%'`)
        .map((l) => [l.cle.replace('coffre_compteur_', ''),
          Number(l.valeur)])),
    coffreCree: parametres.lire('coffre_temoin') !== null
  };
}

/**
 * Validation de STRUCTURE d'un candidat d'import (mêmes exigences que
 * estValide du DemoStore) : l'établissement + les collections attendues.
 * Retour booléen (le handler rend false, jamais d'Error, pour l'illisible).
 */
function estStructureValide(donnees) {
  return Boolean(
    donnees &&
    typeof donnees === 'object' &&
    donnees.etablissement &&
    Array.isArray(donnees.machines) &&
    Array.isArray(donnees.bouteilles) &&
    Array.isArray(donnees.mouvements) &&
    Array.isArray(donnees.controles) &&
    Array.isArray(donnees.fluides) &&
    Array.isArray(donnees.personnel) &&
    Array.isArray(donnees.clients) &&
    Array.isArray(donnees.alertes));
}

/**
 * Complète un candidat des collections optionnelles absentes (import d'une
 * sauvegarde d'une phase antérieure) : tableaux vides, jamais undefined.
 * Reprend l'esprit des compléments A/B/C du DemoStore.
 */
function completerCandidat(donnees) {
  const candidat = { ...donnees };
  for (const cle of ['auditsOrganisme', 'nonConformites', 'outillage',
    'stocksInitiaux', 'bsff', 'inventaires', 'justificationsEcarts',
    'piecesJointes', 'retoursFournisseur', 'cessions', 'journalAudit',
    'habilitations', 'mentionsHabilitation', 'mouvementOutillage',
    'signaturesMouvement', 'coffreIdentites']) {
    if (!Array.isArray(candidat[cle])) candidat[cle] = [];
  }
  // Lot E2 (E2c) : clés du coffre — un export antérieur n'en a pas.
  if (candidat.coffreConfig === undefined) candidat.coffreConfig = null;
  if (!candidat.coffreCompteurs ||
      typeof candidat.coffreCompteurs !== 'object') {
    candidat.coffreCompteurs = {};
  }
  if (typeof candidat.coffreCree !== 'boolean') candidat.coffreCree = false;
  return candidat;
}

/**
 * Écritures figées (VALIDE/ANNULE, ordreValidation fini) d'une liste de
 * mouvements CANDIDATS, triées par ordre de validation. Miroir de
 * ecrituresFigees du DemoStore.
 */
function ecrituresFigeesCandidat(mouvements) {
  return mouvements
    .filter((mv) => (mv.statut === 'VALIDE' || mv.statut === 'ANNULE') &&
      Number.isFinite(mv.ordreValidation))
    .sort((a, b) => a.ordreValidation - b.ordreValidation);
}

/**
 * CR-5 : re-parcourt la chaîne des écritures figées d'un CANDIDAT d'import et
 * recalcule chaque empreinte (hasherMouvement, clone du front). casseA =
 * numéro de la première rupture. Identique à verifierChaineMouvements du
 * DemoStore, mais sur l'objet logique du candidat (déjà en camelCase).
 * @returns {{ok: boolean, casseA: string|null}}
 */
function verifierChaineMouvementsCandidat(mouvements) {
  let precedent = null;
  for (const mouvement of ecrituresFigeesCandidat(mouvements)) {
    if ((mouvement.hashPrecedent ?? null) !== precedent) {
      return { ok: false, casseA: mouvement.numero };
    }
    const attendu = hasherMouvement(
      objetLogiquePourHash(mouvement), precedent);
    if (attendu !== mouvement.hashEcriture) {
      return { ok: false, casseA: mouvement.numero };
    }
    precedent = mouvement.hashEcriture;
  }
  return { ok: true, casseA: null };
}

/**
 * Amorce la chaîne d'un candidat SANS aucune empreinte (sauvegarde antérieure
 * au scellement) : rang de validation, hash précédent, empreinte, dans
 * l'ordre date puis numéro. Mute les mouvements figés en place. Miroir de
 * l'amorçage du DemoStore.
 */
function amorcerChaineCandidat(figees) {
  figees.sort((a, b) =>
    String(a.date).localeCompare(String(b.date)) ||
    String(a.numero).localeCompare(String(b.numero)));
  let precedent = null;
  let ordre = 1;
  for (const mv of figees) {
    mv.ordreValidation = ordre;
    mv.hashPrecedent = precedent;
    mv.hashEcriture = hasherMouvement(objetLogiquePourHash(mv), precedent);
    precedent = mv.hashEcriture;
    ordre += 1;
  }
}

/**
 * Invariants MÉTIER d'un candidat d'import (CR-5) : masses et charges finies
 * et positives, écritures figées porteuses de leur empreinte et de leur
 * ordre dès que la chaîne est amorcée, quantités finies. CLONE EXACT de
 * verifierInvariantsDonnees du DemoStore (mêmes messages, mêmes seuils).
 * @returns {string|null} description du premier problème, ou null si sain.
 */
function verifierInvariantsDonneesCandidat(candidat) {
  for (const b of candidat.bouteilles) {
    const ref = b.code ?? b.id ?? '?';
    for (const champ of ['tareKg', 'masseBruteKg', 'masseNetteKg']) {
      if (!Number.isFinite(b[champ]) || b[champ] < 0) {
        return `bouteille ${ref} : ${champ} invalide (${b[champ]})`;
      }
    }
    if (!Number.isFinite(b.contenanceMaxKg) || b.contenanceMaxKg <= 0) {
      return `bouteille ${ref} : contenanceMaxKg invalide (${b.contenanceMaxKg})`;
    }
    if (b.masseEntreeKg !== undefined && b.masseEntreeKg !== null &&
        (!Number.isFinite(b.masseEntreeKg) || b.masseEntreeKg < 0)) {
      return `bouteille ${ref} : masseEntreeKg invalide (${b.masseEntreeKg})`;
    }
  }
  for (const m of candidat.machines) {
    const ref = m.code ?? m.id ?? '?';
    if (!Number.isFinite(m.chargeActuelleKg) || m.chargeActuelleKg < 0) {
      return `machine ${ref} : chargeActuelleKg invalide (${m.chargeActuelleKg})`;
    }
    // P0-6 (revue I-2) : type d'installation hors grille refusé À L'IMPORT
    // des deux côtés (sans cet invariant, la démo acceptait « CAMION » en
    // silence et le serveur levait un CHECK SQL brut — divergence).
    if (m.typeInstallation !== undefined && m.typeInstallation !== null
        && !['FIXE', 'MOBILE'].includes(m.typeInstallation)) {
      return `machine ${ref} : type d'installation invalide `
        + `(${m.typeInstallation} — attendu : FIXE, MOBILE)`;
    }
    if (!Number.isFinite(m.chargeNominaleKg) || m.chargeNominaleKg <= 0) {
      return `machine ${ref} : chargeNominaleKg invalide (${m.chargeNominaleKg})`;
    }
  }
  const figees = candidat.mouvements.filter((mv) =>
    mv.statut === 'VALIDE' || mv.statut === 'ANNULE');
  // Une sauvegarde antérieure au scellement (aucune empreinte) reste
  // acceptée : la chaîne sera amorcée. Dès qu'UNE écriture porte une
  // empreinte, TOUTES doivent en porter une valide.
  const chaineAmorcee = figees.some((mv) => mv.hashEcriture);
  for (const mv of figees) {
    const ref = mv.numero ?? mv.id ?? '?';
    if (!Number.isFinite(mv.quantiteKg)) {
      return `mouvement ${ref} : quantité non finie (${mv.quantiteKg})`;
    }
    if (chaineAmorcee) {
      if (typeof mv.hashEcriture !== 'string' ||
          !/^[0-9a-f]{64}$/.test(mv.hashEcriture)) {
        return `mouvement ${ref} : empreinte d'écriture absente ou invalide`;
      }
      if (!Number.isFinite(mv.ordreValidation)) {
        return `mouvement ${ref} : ordre de validation absent`;
      }
    }
  }
  // P7-e (option A) : un contrôle OFFICIEL naît TOUJOURS d'un mouvement
  // (CR-3, parcours signé/scellé/WORM) — un contrôle officiel ORPHELIN
  // (sans mouvementId) ne peut être que forgé ou issu d'un contournement.
  // Miroir EXACT du DemoStore (verifierInvariantsDonnees).
  for (const c of candidat.controles ?? []) {
    if (c && c.mode === 'OFFICIEL' && !c.mouvementId) {
      return `contrôle ${c.numero ?? c.id ?? '?'} : ` +
        'OFFICIEL sans mouvement lié (orphelin)';
    }
  }
  // Habilitations et mentions (chantier B2) : miroir EXACT du DemoStore —
  // refuser un registre incohérent AVANT toute écriture (le CHECK/FK/PK
  // SQLite le ferait sinon avec un message cru, et la démo l'accepterait
  // en silence), ET forme canonique des DROITS : un `actif` absent serait
  // actif par DÉFAUT côté SQL mais inactif côté démo (constat IMPORTANT 1
  // de la revue : droits divergents sur le même fichier).
  const idsPersonnel = new Set((candidat.personnel ?? []).map((p) => p.id));
  const DATE_REVOC = /^\d{4}-\d{2}-\d{2}$/;
  function problemeAptitude(nom, ligne, idsVus) {
    const ref = ligne.id ?? '?';
    if (idsVus.has(ligne.id)) return `${nom} ${ref} : id en double`;
    idsVus.add(ligne.id);
    if (!idsPersonnel.has(ligne.personneId)) {
      return `${nom} ${ref} : personne introuvable (${ligne.personneId})`;
    }
    if (typeof ligne.actif !== 'boolean') {
      return `${nom} ${ref} : champ actif non booléen (les droits en dépendent)`;
    }
    if (ligne.actif === false && !DATE_REVOC.test(ligne.dateRevocation ?? '')) {
      return `${nom} ${ref} : révoquée sans date de révocation`;
    }
    if (ligne.actif === true && (ligne.dateRevocation ?? null) !== null) {
      return `${nom} ${ref} : active avec une date de révocation`;
    }
    return null;
  }
  const idsHabilitations = new Set();
  for (const h of candidat.habilitations ?? []) {
    const ref = h.id ?? '?';
    if (!categorieCoherente(h.regime, h.categorie)) {
      return `habilitation ${ref} : catégorie « ${h.categorie} » ` +
        `incohérente avec le régime ${h.regime}`;
    }
    const probleme = problemeAptitude('habilitation', h, idsHabilitations);
    if (probleme) return probleme;
    // Revue L4 (suivi) : les gardes de création valent aussi à l'IMPORT —
    // l'asymétrie « refusé à la saisie, avalé par un paquet forgé » est
    // fermée. Une délivrance 2008 postérieure au 31/12/2026 est illégale
    // (arrêté du 21/11/2025, art. 11) ; une remise à niveau au format ou au
    // calendrier impossible fausserait l'affichage (le moteur, lui, la
    // neutralise déjà — défense en profondeur). Le contrôle « pas dans le
    // futur » reste une règle de SAISIE : un export ancien rejoué plus tard
    // porte des faits, pas des saisies.
    if (h.regime === '2008' && h.dateDebut
        && h.dateDebut > FIN_DELIVRANCE_2008) {
      return `habilitation ${ref} : délivrance 2008 datée après le ` +
        '31/12/2026 (arrêté du 21/11/2025, art. 11)';
    }
    const remiseImport = h.remiseNiveauLe ?? null;
    if (remiseImport !== null) {
      const mR = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(remiseImport));
      const controleR = mR && new Date(Date.UTC(
        Number(mR[1]), Number(mR[2]) - 1, Number(mR[3])));
      if (!mR || controleR.getUTCMonth() !== Number(mR[2]) - 1
          || controleR.getUTCDate() !== Number(mR[3])) {
        return `habilitation ${ref} : date de remise à niveau invalide ` +
          '(AAAA-MM-JJ attendu)';
      }
    }
  }
  const idsMentions = new Set();
  for (const m of candidat.mentionsHabilitation ?? []) {
    const ref = m.id ?? '?';
    if (!FLUIDES_MENTION.includes(m.fluideMention)) {
      return `mention ${ref} : fluide « ${m.fluideMention} » inconnu`;
    }
    const probleme = problemeAptitude('mention', m, idsMentions);
    if (probleme) return probleme;
  }
  // Outils d'intervention (brique produit n°2) : miroir EXACT du DemoStore.
  const statutParMouvement = new Map(
    candidat.mouvements.map((mv) => [mv.id, mv.statut]));
  const idsOutillage = new Set((candidat.outillage ?? []).map((o) => o.id));
  const STATUTS_FIGE = [null, 'CONFORME', 'A_VERIFIER', 'EXPIRE', 'HORS_SERVICE'];
  const idsLiens = new Set();
  const couplesLiens = new Set();
  for (const l of candidat.mouvementOutillage ?? []) {
    const ref = l.id ?? '?';
    if (idsLiens.has(l.id)) return `lien d'outil ${ref} : id en double`;
    idsLiens.add(l.id);
    if (!statutParMouvement.has(l.mouvementId)) {
      return `lien d'outil ${ref} : mouvement introuvable (${l.mouvementId})`;
    }
    if (!idsOutillage.has(l.outillageId)) {
      return `lien d'outil ${ref} : outil introuvable (${l.outillageId})`;
    }
    const couple = `${l.mouvementId}|${l.outillageId}`;
    if (couplesLiens.has(couple)) {
      return `lien d'outil ${ref} : couple mouvement/outil en double`;
    }
    couplesLiens.add(couple);
    if (!STATUTS_FIGE.includes(l.statutFige ?? null)) {
      return `lien d'outil ${ref} : statut figé inconnu (${l.statutFige})`;
    }
    const statutMouvement = statutParMouvement.get(l.mouvementId);
    if ((l.statutFige ?? null) !== null
        && statutMouvement !== 'VALIDE' && statutMouvement !== 'ANNULE') {
      return `lien d'outil ${ref} : statut figé sur un mouvement non validé`;
    }
  }

  // Signatures réelles (lot C, C1) : chaque signature référence un mouvement
  // existant, un rôle connu, une révision signée finie — id jamais en double.
  // (La falsification d'une signature sera dénoncée par l'empreinte v2, C2.)
  const idsSignatures = new Set();
  for (const sig of candidat.signaturesMouvement ?? []) {
    const ref = sig.id ?? '?';
    if (idsSignatures.has(sig.id)) return `signature ${ref} : id en double`;
    idsSignatures.add(sig.id);
    if (!statutParMouvement.has(sig.mouvementId)) {
      return `signature ${ref} : mouvement introuvable (${sig.mouvementId})`;
    }
    if (!ROLES_SIGNATURE.includes(sig.role)) {
      return `signature ${ref} : rôle inconnu (${sig.role})`;
    }
    if (!Number.isFinite(sig.versionDocument)) {
      return `signature ${ref} : révision signée absente`;
    }
  }

  // Pièces jointes : l'id EST le nom du fichier sur disque (Mode Local). Un id
  // hors alphabet (« ../.. ») ouvrirait une traversée de chemin — refusé À
  // L'ENTRÉE, avant que la donnée n'existe. Règle identique côté DemoStore.
  const idsPj = new Set();
  for (const pj of candidat.piecesJointes ?? []) {
    const ref = pj.id ?? '?';
    if (!/^[A-Za-z0-9_-]+$/.test(String(pj.id ?? ''))) {
      return `pièce jointe ${ref} : identifiant invalide`;
    }
    if (idsPj.has(pj.id)) return `pièce jointe ${ref} : id en double`;
    idsPj.add(pj.id);
  }
  return null;
}

/**
 * Les 5 déclencheurs WORM (mouvements + journal_audit) interdisent DELETE/
 * UPDATE sur les écritures figées et sur le journal. Pour un remplacement
 * TOTAL (opération admin légitime, pas une mutation applicative), on les
 * retire le temps du remplacement puis on les RECRÉE — le tout dans la même
 * transaction (un ROLLBACK restaure DDL et données). On capture leur SQL
 * EXACT depuis sqlite_master (aucune dérive possible vis-à-vis du schéma).
 */
function declencheursWorm() {
  return db.all(
    `SELECT name, sql FROM sqlite_master
     WHERE type = 'trigger'
       AND tbl_name IN ('mouvements', 'journal_audit', 'mouvement_outillage',
                        'signatures_mouvement', 'pieces_jointes')`);
}

/**
 * Tables métier vidées puis réinsérées à l'import, DANS l'ordre où les
 * réinsertions respectent les getters/mappings. L'ordre de suppression est
 * neutralisé par PRAGMA defer_foreign_keys (contrôle des FK reporté au
 * COMMIT), l'ordre d'insertion l'est de même : on garde une liste unique.
 * Les colonnes GÉNÉRÉES (masse_nette_kg, tco2eq) ne sont jamais écrites
 * (mapping.versSql les ignore).
 */

/** Insère la collection `items` (objets camelCase) dans `sqlTable` via versSql. */
function reinsererCollection(nomTable, sqlTable, items) {
  for (const item of items ?? []) {
    const ligne = mapping.versSql(nomTable, item);
    ligne.etablissement_id = ID_ETABLISSEMENT;
    inserer(sqlTable, ligne);
  }
}

/** Insère les mouvements (aplatissement du `controle` imbriqué + versSql). */
function reinsererMouvements(mouvements) {
  for (const mv of mouvements ?? []) {
    // insererMouvement fait déjà : versSql (ignore `controle`, frontSeulement)
    // + aplatirControle + etablissement_id. On lui passe l'objet logique tel
    // quel — proposerDemantelement (frontSeulement) est ignoré par versSql.
    insererMouvement(mv);
  }
}

/**
 * Réinsère le journal d'audit à l'IDENTIQUE (append-only) : le contrat
 * n'expose que { date, qui, action, cible, details }, mais l'import doit
 * préserver la trace. On réamorce le CHAÎNAGE du journal (hash_precedent /
 * hash via db.hashEcriture) pour que verifierChaineJournal reste au vert
 * après import — l'ordre d'origine est conservé.
 */
function reinsererJournal(entrees) {
  let precedent = '';
  for (const entree of entrees ?? []) {
    const contenu = {
      date_heure: entree.date ?? new Date().toISOString(),
      utilisateur: entree.qui ?? 'système',
      action: String(entree.action ?? 'IMPORT'),
      cible: entree.cible ?? null,
      details: entree.details ?? null
    };
    const hash = db.hashEcriture(contenu, precedent);
    db.run(
      `INSERT INTO journal_audit
         (date_heure, utilisateur, action, cible, details,
          hash_precedent, hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [contenu.date_heure, contenu.utilisateur, contenu.action,
        contenu.cible, contenu.details, precedent || null, hash]);
    precedent = hash;
  }
}

/**
 * Remplace TOUT l'état SQL par le candidat, atomiquement. Retire les
 * déclencheurs WORM le temps du remplacement, vide toutes les tables métier,
 * réinsère chaque collection, RECRÉE les déclencheurs, puis journalise
 * l'import (chaîné à la nouvelle chaîne de journal). PRAGMA
 * defer_foreign_keys reporte le contrôle des clés étrangères au COMMIT :
 * l'ordre de vidage/insertion n'a plus d'importance et une incohérence
 * référentielle fait échouer proprement (ROLLBACK global).
 */
function remplacerToutLEtat(candidat) {
  muter(() => {
    // Reporte le contrôle des FK au COMMIT (autorisé DANS une transaction ;
    // se réinitialise en fin de transaction). Sans lui, l'ordre de
    // suppression/insertion des tables à références croisées coincerait.
    db.run('PRAGMA defer_foreign_keys = ON');

    const worm = declencheursWorm();
    for (const t of worm) db.run(`DROP TRIGGER IF EXISTS ${t.name}`);

    // Vidage TOTAL des tables métier (journal inclus : remplacement complet).
    // Lot E2 (E2c) : coffre_identites AVANT personnel (FK personnel_id) ;
    // coffre_purge_en_attente vidée aussi (chemins propres au poste, jamais
    // transportés).
    const TABLES_A_VIDER = ['coffre_identites', 'coffre_purge_en_attente',
      'pieces_jointes', 'retours_fournisseur', 'cessions', 'bsff',
      'controles', 'signatures_mouvement', 'mouvement_outillage', 'mouvements',
      'justifications_ecarts', 'inventaires',
      'inventaires_bouteilles', 'inventaires_fuites',
      'stocks_initiaux', 'bouteilles', 'machines', 'clients_detenteurs',
      'outillage', 'non_conformites', 'audits_etablissement', 'habilitations',
      'mentions_habilitation', 'personnel', 'journal_audit', 'etablissements'];
    for (const table of TABLES_A_VIDER) db.run(`DELETE FROM ${table}`);

    // Établissement singleton : le candidat porte un dossier sans id (le
    // front le traite comme un singleton). On réamorce l'id local.
    const etab = mapping.versSql('etablissements', candidat.etablissement);
    etab.id = ID_ETABLISSEMENT;
    inserer('etablissements', etab);

    // Référentiel des fluides : upsert (INSERT OR IGNORE au socle, mais un
    // candidat peut porter un référentiel complété). On réécrit ce qui est
    // fourni sans casser les fluides déjà semés (INSERT OR REPLACE).
    // Fiche réglementaire (migration 21) : un export ANTÉRIEUR porte des
    // fluides SANS fiche — l'INSERT OR REPLACE l'effacerait (colonnes
    // absentes → NULL, constat de revue du 16/07, prouvé). On la recomplète
    // depuis la table VALIDÉE (mêmes valeurs que la migration, rien
    // d'inventé) ; une fiche explicitement importée (categorieCadre7
    // renseignée) n'est JAMAIS écrasée ; un fluide inconnu reste sans fiche
    // (4 champs NULL → repli famille du moteur). Miroir : importerJSON du
    // DemoStore fait strictement pareil (parité prouvée par test-contrat).
    for (const f of candidat.fluides ?? []) {
      const fluide = { ...f };
      if (fluide.categorieCadre7 == null) {
        const fiche = FICHE_REGLEMENTAIRE_FLUIDES[fluide.code] ?? null;
        fluide.contientHfc = fiche ? fiche.contientHfc : null;
        fluide.contientHfo = fiche ? fiche.contientHfo : null;
        fluide.categorieCadre7 = fiche ? fiche.categorieCadre7 : null;
        // La source du PRP n'est recopiée que si le PRP importé EST la
        // valeur réglementaire courante — pour une valeur locale, la
        // source reste honnêtement inconnue (null).
        fluide.sourcePrp = fiche && Number(fluide.gwpAr4) === fiche.prp
          ? fiche.sourcePrp : null;
      }
      // P1-2 : la DISPONIBILITÉ À LA SAISIE d'un export ANTÉRIEUR est
      // inconnue (la clé n'existait pas) — une clé absente ne vaut pas
      // décision. INSERT OR REPLACE remplace la LIGNE ENTIÈRE : sans
      // cette reprise, la colonne absente repartirait au DEFAULT 1 et
      // ferait ressusciter un fluide que le référent avait retiré de la
      // saisie, en silence (constat TIRÉ à la revue du 23/07, prouvé).
      // Un fluide inconnu du poste reste actif. Miroir du DemoStore.
      if (fluide.actif === undefined || fluide.actif === null) {
        const enPlace = db.get(
          'SELECT actif FROM fluides WHERE code = ?', [fluide.code]);
        fluide.actif = enPlace ? enPlace.actif === 1 : true;
      }
      const ligne = mapping.versSql('fluides', fluide);
      const colonnes = Object.keys(ligne);
      const marques = colonnes.map(() => '?').join(', ');
      db.run(
        `INSERT OR REPLACE INTO fluides (${colonnes.join(', ')}) ` +
        `VALUES (${marques})`, colonnes.map((c) => ligne[c]));
    }
    // Corrections réglementaires conditionnelles (contenu de la migration
    // 22) : un export ANTÉRIEUR réintroduirait les anciens PRP (1/4/3)
    // par l'INSERT OR REPLACE ci-dessus, et la base étant déjà en version
    // 22, la migration ne rejouerait jamais. On rejoue la correction —
    // qui n'écrase jamais une valeur réellement ajustée. Miroir :
    // importerJSON et chargerDepuisStockage du DemoStore.
    corrigerPrpFgas3((sql) => db.run(sql));

    reinsererCollection('personnel', 'personnel', candidat.personnel);

    // Lot E2 (E2c) : le COFFRE — insertion BRUTE (tables non mappées, patron
    // reinsererJournal), configuration + compteurs REMPLACÉS atomiquement
    // dans la MÊME transaction (cohérence sel ↔ enveloppes garantie : tout
    // vient du même instantané). Un candidat SANS coffre efface les clés
    // locales (un import restaure un instantané).
    db.run(`DELETE FROM parametres WHERE cle LIKE 'coffre_%'`);
    for (const c of candidat.coffreIdentites ?? []) {
      db.run(
        `INSERT INTO coffre_identites (id, personnel_id, pseudonyme,
           enveloppe, date_mise_a_labri, etablissement_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [c.id ?? db.generateId('COF'), c.personnelId, c.pseudonyme,
          Buffer.from(String(c.enveloppe), 'base64'),
          c.dateMiseALabri ?? new Date().toISOString(), ID_ETABLISSEMENT]);
    }
    if (candidat.coffreConfig && candidat.coffreConfig.sel &&
        candidat.coffreConfig.temoin) {
      parametres.ecrire('coffre_sel', candidat.coffreConfig.sel);
      parametres.ecrire('coffre_temoin', candidat.coffreConfig.temoin);
      if (candidat.coffreConfig.kdf) {
        parametres.ecrire('coffre_kdf', candidat.coffreConfig.kdf);
      }
    }
    for (const [annee, n] of Object.entries(candidat.coffreCompteurs ?? {})) {
      if (Number.isFinite(Number(n))) {
        parametres.ecrire(`coffre_compteur_${annee}`, String(Number(n)));
      }
    }

    // Habilitations F-Gas (chantier B2) : APRÈS le personnel (FK personne_id ;
    // defer_foreign_keys est ON mais l'ordre reste logique). Absentes des
    // vieux exports → reinsererCollection tolère undefined.
    reinsererCollection('habilitations', 'habilitations',
      candidat.habilitations);
    // Mentions de formation complémentaire (brique 1) : même logique (FK
    // personne_id, absentes des vieux exports → undefined toléré).
    reinsererCollection('mentions_habilitation', 'mentions_habilitation',
      candidat.mentionsHabilitation);
    reinsererCollection('audits_etablissement', 'audits_etablissement',
      candidat.auditsOrganisme);
    reinsererCollection('non_conformites', 'non_conformites',
      candidat.nonConformites);
    reinsererCollection('outillage', 'outillage', candidat.outillage);
    reinsererCollection('clients_detenteurs', 'clients_detenteurs',
      candidat.clients);
    reinsererCollection('machines', 'machines', candidat.machines);
    reinsererCollection('bouteilles', 'bouteilles', candidat.bouteilles);
    reinsererMouvements(candidat.mouvements);
    // Liens d'outils APRÈS les mouvements (FK mouvement_id ; les triggers
    // de figeage sont retirés avec les WORM le temps de l'import).
    reinsererCollection('mouvement_outillage', 'mouvement_outillage',
      candidat.mouvementOutillage);
    // Signatures réelles (lot C, C1) : APRÈS les mouvements (FK) — leurs
    // triggers WORM sont retirés avec les autres le temps de l'import.
    // Absentes des vieux exports → undefined toléré.
    reinsererCollection('signatures_mouvement', 'signatures_mouvement',
      candidat.signaturesMouvement);
    reinsererCollection('controles', 'controles', candidat.controles);
    reinsererCollection('bsff', 'bsff', candidat.bsff);
    reinsererCollection('retours_fournisseur', 'retours_fournisseur',
      candidat.retoursFournisseur);
    // P0-8 : cessions — FK bouteilles, réinsérées comme les retours fournisseur.
    reinsererCollection('cessions', 'cessions', candidat.cessions);
    reinsererCollection('stocks_initiaux', 'stocks_initiaux',
      candidat.stocksInitiaux);
    reinsererCollection('inventaires', 'inventaires', candidat.inventaires);
    // Brique ② (B7) : photos nominatives — absentes des vieux exports
    // (reinsererCollection tolère undefined).
    reinsererCollection('inventaires_bouteilles', 'inventaires_bouteilles',
      candidat.inventairesBouteilles);
    reinsererCollection('inventaires_fuites', 'inventaires_fuites',
      candidat.inventairesFuites);
    reinsererCollection('justifications_ecarts', 'justifications_ecarts',
      candidat.justificationsEcarts);
    reinsererPiecesJointes(candidat.piecesJointes);

    // Journal d'audit : trace d'origine préservée, chaîne réamorcée.
    reinsererJournal(candidat.journalAudit);

    // Recréation des déclencheurs WORM (SQL exact de sqlite_master) : le
    // registre redevient inviolable dans la même transaction.
    for (const t of worm) db.run(t.sql);

    // Journalise l'import LUI-MÊME (chaîné à la chaîne de journal réamorcée).
    journaliser('système', 'IMPORT_DONNEES', 'sauvegarde',
      'Restauration depuis un fichier JSON (intégrité vérifiée)');
  });
}

/**
 * Réinsère les métadonnées des pièces jointes (le contenu binaire vit sur
 * disque, colonne chemin — non exposée au contrat). Un import venu d'un autre
 * store (démo) n'apporte pas le fichier : la métadonnée est conservée, chemin
 * à null (le contenu sera indisponible, mais la trace reste). versSql ignore
 * `chemin` (sqlSeulement) : on le pose à la main s'il existe déjà en local.
 */
function reinsererPiecesJointes(items) {
  for (const pj of items ?? []) {
    const ligne = mapping.versSql('pieces_jointes', pj);
    ligne.etablissement_id = ID_ETABLISSEMENT;
    // ⚠ Le `chemin` du candidat n'est JAMAIS repris (il ferait lire, puis
    // supprimer, n'importe quel fichier du poste — BLOQUANT de l'audit du
    // 14/07). On regarde seulement si le contenu est là, chez nous, sous l'id.
    ligne.chemin = null;
    try {
      if (fs.existsSync(cheminPieceJointe(pj.id))) ligne.chemin = pj.id;
    } catch {
      // id hors alphabet (donc forgé) : la métadonnée entre sans contenu.
    }
    inserer('pieces_jointes', ligne);
  }
}

// ------------------------------------------------------------
// Reconstitution de l'objet `mouvement.controle` imbriqué (divergence
// E3 : aplati côté SQL vers statut_controle_declare / detecteur_declare_id
// / controle_lie_id). UN SEUL endroit (api.js), en lecture.
// Les colonnes aplaties sont réservées serveur (mapping.sqlSeulement),
// donc versFront les ignore : on les lit à la main sur la ligne SQL.
// ------------------------------------------------------------
function reconstituerMouvement(ligneSql) {
  const mouvement = mapping.versFront('mouvements', ligneSql);
  if (ligneSql.statut_controle_declare != null) {
    const controle = {
      statutControle: ligneSql.statut_controle_declare,
      detecteurId: ligneSql.detecteur_declare_id ?? null
    };
    // R5 : localisation de la fuite déclarée (étape 5 du wizard) — clé
    // ajoutée SEULEMENT si elle a été fournie à la création (comme
    // controleId ci-dessous), pour reproduire EXACTEMENT la forme hachée
    // au scellement (JSON.stringify est sensible à la présence des clés,
    // pas seulement à leur valeur — sinon la chaîne de hash divergerait
    // entre l'écriture et sa relecture après passage par SQL).
    if (ligneSql.localisation_fuite_declaree != null) {
      controle.localisationFuite = ligneSql.localisation_fuite_declaree;
    }
    if (ligneSql.controle_lie_id != null) {
      controle.controleId = ligneSql.controle_lie_id;
    }
    mouvement.controle = controle;
  }
  return mouvement;
}

// ------------------------------------------------------------
// Registre WORM — persistance d'un mouvement (aplatissement du
// `controle` imbriqué vers ses colonnes) + scellement chaîné.
// ------------------------------------------------------------

/** Ligne SQL brute d'un mouvement par id (colonnes serveur incluses). */
function lireLigneMouvement(id) {
  return db.get('SELECT * FROM mouvements WHERE id = ?', [id]);
}

/**
 * Aplati l'objet `controle` imbriqué d'un mouvement logique vers les
 * colonnes réservées serveur (divergence E3). UN SEUL endroit avec
 * reconstituerMouvement (lecture). Renvoie un patch de colonnes SQL.
 */
function aplatirControle(mouvement) {
  const controle = mouvement.controle ?? null;
  return {
    statut_controle_declare: controle?.statutControle ?? null,
    detecteur_declare_id: controle?.detecteurId ?? null,
    // R5 : localisation de la fuite déclarée (étape 5 du wizard).
    localisation_fuite_declaree: controle?.localisationFuite ?? null,
    controle_lie_id: controle?.controleId ?? null
  };
}

/**
 * INSÈRE un mouvement (objet logique complet) : mapping camelCase → SQL
 * (versSql IGNORE `controle`, bloqué), + aplatissement du contrôle, +
 * l'établissement singleton. Utilisé au brouillon comme à la contre-écriture.
 */
function insererMouvement(mouvement) {
  const { controle, ...plat } = mouvement;
  const ligne = mapping.versSql('mouvements', plat);
  Object.assign(ligne, aplatirControle(mouvement));
  ligne.etablissement_id = ID_ETABLISSEMENT;
  inserer('mouvements', ligne);
}

/**
 * Fige une écriture qui passe SOUMIS → VALIDE : quantité signée, contrôle
 * (éventuel CR-3), validateur, CERFA, scellement (hash / ordre). Le
 * déclencheur WORM n'entrave PAS un SOUMIS → VALIDE (il ne surveille que
 * OLD.statut = VALIDE/ANNULE), on peut donc écrire toutes ces colonnes.
 */
function persisterMouvementValide(mouvement) {
  const patch = {
    statut: 'VALIDE',
    quantite_calculee_kg: mouvement.quantiteKg,
    fluide: mouvement.fluide ?? null,
    machine_label: mouvement.machineLabel ?? null,
    validateur_id: mouvement.validateurId ?? null,
    cerfa_numero: mouvement.cerfaNumero ?? null,
    prg_fige: mouvement.prpFige ?? null,
    hash_ecriture: mouvement.hashEcriture,
    hash_precedent: mouvement.hashPrecedent,
    ordre_validation: mouvement.ordreValidation,
    // Lot C (C2) : version d'empreinte + champs GELÉS au scellement
    // (outils_figes en JSON, comme le mapping tableauxJson le relit).
    version_empreinte: mouvement.versionEmpreinte ?? 1,
    outils_figes: mouvement.outilsFiges != null
      ? JSON.stringify(mouvement.outilsFiges) : null,
    hash_signatures: mouvement.hashSignatures ?? null,
    hash_pieces_jointes: mouvement.hashPiecesJointes ?? null,
    hash_pdf_final: mouvement.hashPdfFinal ?? null,
    ...aplatirControle(mouvement)
  };
  majParId('mouvements', mouvement.id, patch);
}

/**
 * Prochain numéro de fiche : FI-AAAA-NNNN (OFFICIEL) ou FORM-AAAA-NNNN
 * (FORMATION). NNNN = max du préfixe sur TOUTES les années + 1, sur 4
 * chiffres. Compteur GLOBAL par préfixe (identique à prochainNumero du
 * DemoStore). Appelé DANS la transaction (verrou implicite).
 */
function prochainNumeroMouvement(mode) {
  const prefixe = mode === 'OFFICIEL' ? 'FI' : 'FORM';
  const motif = new RegExp(`^${prefixe}-\\d{4}-(\\d{4})$`);
  const lignes = db.all('SELECT numero FROM mouvements');
  let max = 0;
  for (const { numero } of lignes) {
    const trouve = motif.exec(numero || '');
    if (trouve) max = Math.max(max, Number(trouve[1]));
  }
  const annee = new Date().getFullYear();
  return `${prefixe}-${annee}-${String(max + 1).padStart(4, '0')}`;
}

/**
 * Prochain numéro de fiche pour un contrôle AUTONOME : « C-FORM-AAAA-NNNN »
 * (FORMATION) ou « C-FI-AAAA-NNNN » (OFFICIEL). Espace DISJOINT des mouvements
 * (préfixe « C- ») : un contrôle ne réutilise jamais un numéro de mouvement, et
 * la numérotation des mouvements (qui entre dans l'empreinte) reste INTACTE. Un
 * contrôle LIÉ à un mouvement n'appelle pas ceci — il hérite du numéro du
 * mouvement. Miroir exact de prochainNumeroControle du DemoStore.
 */
function prochainNumeroControle(mode) {
  const prefixe = mode === 'OFFICIEL' ? 'C-FI' : 'C-FORM';
  const motif = new RegExp(`^${prefixe}-\\d{4}-(\\d{4})$`);
  const lignes = db.all('SELECT numero FROM controles');
  let max = 0;
  for (const { numero } of lignes) {
    const trouve = motif.exec(numero || '');
    if (trouve) max = Math.max(max, Number(trouve[1]));
  }
  const annee = new Date().getFullYear();
  return `${prefixe}-${annee}-${String(max + 1).padStart(4, '0')}`;
}

/**
 * Objet mouvement LOGIQUE (camelCase, forme contrat) projeté sur les 18
 * champs de l'empreinte, dans l'ordre canonique — avec le `controle`
 * reconstitué { statutControle, detecteurId[, controleId] } dans CET ordre
 * d'insertion (JSON.stringify respecte l'ordre → hash identique au front).
 * hasherMouvement re-projette de toute façon, mais on garde l'ordre du
 * controle qui, lui, est un sous-objet stringifié tel quel.
 */
function objetLogiquePourHash(mouvement) {
  const objet = {
    id: mouvement.id,
    numero: mouvement.numero,
    date: mouvement.date,
    mode: mouvement.mode,
    type: mouvement.type,
    machineId: mouvement.machineId ?? null,
    fluide: mouvement.fluide ?? null,
    quantiteKg: mouvement.quantiteKg ?? null,
    peseeAvantKg: mouvement.peseeAvantKg ?? null,
    peseeApresKg: mouvement.peseeApresKg ?? null,
    bouteilleSrcId: mouvement.bouteilleSrcId ?? null,
    bouteilleDstId: mouvement.bouteilleDstId ?? null,
    causeMouvement: mouvement.causeMouvement ?? null,
    controle: mouvement.controle ?? null,
    technicien: mouvement.technicien ?? null,
    validateurId: mouvement.validateurId ?? null,
    contreEcritureDe: mouvement.contreEcritureDe ?? null,
    motif: mouvement.motif ?? null,
    // Lot C (C2) : version + champs v2 PASSÉS AU TRAVERS — le hasseur
    // versionné choisit sa liste ; sur une écriture v1 ces clés sont
    // ignorées par la projection (préimage v1 inchangée bit à bit).
    // C'était LE piège relevé par la relecture adversariale du plan :
    // cette liste blanche droppe silencieusement tout champ non déclaré.
    versionEmpreinte: mouvement.versionEmpreinte ?? null,
    prpFige: mouvement.prpFige ?? null,
    cerfaNumero: mouvement.cerfaNumero ?? null,
    executeParId: mouvement.executeParId ?? null,
    superviseurId: mouvement.superviseurId ?? null,
    responsableRegistreId: mouvement.responsableRegistreId ?? null,
    outilsFiges: mouvement.outilsFiges ?? null,
    hashSignatures: mouvement.hashSignatures ?? null,
    hashPiecesJointes: mouvement.hashPiecesJointes ?? null,
    hashPdfFinal: mouvement.hashPdfFinal ?? null
  };
  return objet;
}

/**
 * Lot C (C2) : forme canonique des signatures d'une LISTE (camelCase) puis
 * empreinte triée — sert au SCELLEMENT (gel de hash_signatures) ET au
 * recomptage à l'IMPORT (une signature retouchée dans le JSON = forgée).
 * L'image est réduite à l'empreinte de ses OCTETS ; une base64 illisible
 * compte comme image vide (déterministe, miroir du DemoStore).
 */
function empreinteListeSignatures(signatures) {
  const canoniques = (signatures ?? []).map((sig) => {
    // Décodage STRICT, même discipline que la démo (base64VersOctets) :
    // préfixe data: retiré, alphabet contrôlé, illisible → octets VIDES.
    // JAMAIS Buffer.from direct : il ne lève jamais et IGNORE les
    // caractères hors alphabet — le même fichier hostile recevait deux
    // verdicts d'import OPPOSÉS démo/serveur (constat BLOQUANT de la
    // revue adversariale C2, tiré sur base jetable, corrigé AVANT tout
    // scellement réel : les hash gelés en base en dépendent).
    let octets;
    try {
      octets = decoderBase64Pj(sig.imagePng ?? '');
    } catch {
      octets = Buffer.alloc(0);
    }
    const sha = crypto.createHash('sha256').update(octets).digest('hex');
    return chaineCanoniqueSignature(sig, sha);
  });
  return empreinteListeTriee(canoniques);
}

/** Lot C (C2) : empreinte gelée des signatures d'un mouvement (en base). */
function empreinteSignaturesMouvement(mouvementId) {
  const lignes = db.all(
    'SELECT * FROM signatures_mouvement WHERE mouvement_id = ?', [mouvementId]);
  return empreinteListeSignatures(
    lignes.map((ligne) => mapping.versFront('signatures_mouvement', ligne)));
}

/** Lot C (C2) : empreinte gelée des sha256 des PJ d'un mouvement (en base). */
function empreintePiecesJointesMouvement(mouvementId) {
  const lignes = db.all(
    `SELECT hash_sha256 FROM pieces_jointes
     WHERE entite_type = 'MOUVEMENT' AND entite_id = ?`, [mouvementId]);
  return empreinteListeTriee(lignes.map((l) => l.hash_sha256 ?? ''));
}

/**
 * Écritures figées (VALIDE/ANNULE, ordre_validation non NULL) de la base,
 * triées par ordre_validation — reconstituées en objets logiques (controle
 * inclus) pour être re-hashables à l'identique.
 */
function chaineValidee() {
  const lignes = db.all(
    `SELECT * FROM mouvements
     WHERE statut IN ('VALIDE','ANNULE') AND ordre_validation IS NOT NULL
     ORDER BY ordre_validation`);
  return lignes.map((ligne) => {
    const mv = reconstituerMouvement(ligne);
    mv.ordreValidation = ligne.ordre_validation;
    mv.hashEcriture = ligne.hash_ecriture;
    mv.hashPrecedent = ligne.hash_precedent;
    return mv;
  });
}

/**
 * Scelle une écriture : rang de validation, hash précédent, empreinte
 * propre (calculée DANS la transaction, sur l'objet logique). Identique à
 * sceller() du DemoStore, mais synchrone (hash-mouvement.js).
 */
function sceller(mouvement) {
  const chaine = chaineValidee();
  const derniere = chaine[chaine.length - 1] || null;
  mouvement.ordreValidation = (derniere?.ordreValidation ?? 0) + 1;
  mouvement.hashPrecedent = derniere?.hashEcriture ?? null;
  mouvement.hashEcriture = hasherMouvement(
    objetLogiquePourHash(mouvement), mouvement.hashPrecedent);
}

/**
 * CR-5 : re-parcourt la chaîne des écritures figées et recalcule chaque
 * empreinte ; casseA = numéro de la première rupture. Identique à
 * verifierChaineMouvements du DemoStore.
 * @returns {{ok: boolean, casseA: string|null}}
 */
function verifierChaineMouvements() {
  let precedent = null;
  for (const mouvement of chaineValidee()) {
    if ((mouvement.hashPrecedent ?? null) !== precedent) {
      return { ok: false, casseA: mouvement.numero };
    }
    const attendu = hasherMouvement(
      objetLogiquePourHash(mouvement), precedent);
    if (attendu !== mouvement.hashEcriture) {
      return { ok: false, casseA: mouvement.numero };
    }
    precedent = mouvement.hashEcriture;
  }
  return { ok: true, casseA: null };
}

// ------------------------------------------------------------
// Registre WORM — effets stocks/charges d'une écriture au moment de la
// validation. Mutations VIVES des copies JS lues en base, PUIS
// persistance (une seule écriture SQL par entité touchée) : la
// transaction ambiante garantit l'atomicité (throw → ROLLBACK global).
// Reprend appliquerEffets / appliquerEffetsInverses du DemoStore
// (messages MOT POUR MOT, mêmes ordres de contrôle).
// ------------------------------------------------------------

/**
 * Attribution automatique du statut d'une bouteille après variation de sa
 * masse nette — parité STRICTE avec le DemoStore (CF-5) :
 * - masse retombée à ~0 depuis EN_STOCK/EN_SERVICE : bouteille NEUVE
 *   consignée (proprietaire renseigné) → A_RETOURNER (destinée au
 *   fournisseur, IM-9) ; toute autre → VIDE ;
 * - masse à nouveau positive depuis VIDE/A_RETOURNER : retour EN_STOCK.
 * Les statuts hors cycle courant (DECHET, RETOURNEE) ne sont jamais touchés.
 */
function mettreAJourStatutApresVariation(bouteille) {
  const vide = bouteille.masseNetteKg <= SEUIL_BOUTEILLE_VIDE_KG;
  if (vide) {
    if (bouteille.statut === 'EN_STOCK' || bouteille.statut === 'EN_SERVICE') {
      bouteille.statut = (bouteille.type === 'NEUVE' && bouteille.proprietaire)
        ? 'A_RETOURNER'
        : 'VIDE';
    }
  } else if (bouteille.statut === 'VIDE' || bouteille.statut === 'A_RETOURNER') {
    bouteille.statut = 'EN_STOCK';
  }
}

/**
 * R2 : recalcule l'étiquette (fluide MAJORITAIRE) d'une bouteille MELANGE
 * depuis sa composition tracée. À égalité parfaite, le premier fluide
 * versé garde l'étiquette. Mutation VIVE — parité STRICTE avec le
 * DemoStore (recalculerEtiquetteMelange).
 */
function recalculerEtiquetteMelange(bouteille) {
  const versements = Array.isArray(bouteille.compositionMelange)
    ? bouteille.compositionMelange : [];
  const totaux = new Map();
  for (const v of versements) {
    totaux.set(v.fluide, arrondir((totaux.get(v.fluide) ?? 0) + v.quantiteKg));
  }
  let majoritaire = bouteille.fluide;
  let max = -Infinity;
  for (const [fluide, total] of totaux) {
    if (total > max) { max = total; majoritaire = fluide; }
  }
  if (majoritaire !== bouteille.fluide) bouteille.fluide = majoritaire;
}

/**
 * R2 : versement INITIAL de la composition tracée d'une bouteille MELANGE
 * — le contenu déjà présent au moment où elle devient MELANGE, au fluide
 * de son étiquette. Posée même à masse nulle (trace de l'étiquette
 * d'origine). Parité STRICTE avec le DemoStore (amorcerCompositionMelange).
 */
function amorcerCompositionMelange(bouteille, dateAmorce) {
  if (Array.isArray(bouteille.compositionMelange) &&
      bouteille.compositionMelange.length > 0) {
    return; // déjà tracée : jamais de double amorce
  }
  bouteille.compositionMelange = [{
    fluide: bouteille.fluide,
    quantiteKg: bouteille.masseNetteKg,
    date: dateAmorce ?? aujourdHui(),
    mouvementId: null
  }];
}

/**
 * R2 : ajoute un versement à la composition tracée d'une bouteille
 * MELANGE, puis met à jour l'étiquette (fluide majoritaire) si le
 * nouveau versement fait basculer la majorité. Mutation VIVE — parité
 * STRICTE avec le DemoStore (tracerVersementMelange).
 */
function tracerVersementMelange(bouteille, fluideVerse, quantite, mouvementId) {
  const versements = Array.isArray(bouteille.compositionMelange)
    ? bouteille.compositionMelange.slice()
    : [];
  versements.push({
    fluide: fluideVerse,
    quantiteKg: quantite,
    date: aujourdHui(),
    mouvementId: mouvementId ?? null
  });
  bouteille.compositionMelange = versements;
  recalculerEtiquetteMelange(bouteille);
}

/**
 * R2 : retire de la composition tracée le versement issu du mouvement
 * ANNULÉ par contre-écriture, puis recalcule l'étiquette majoritaire —
 * le versement initial (mouvementId null) n'est jamais retiré.
 * Mutation VIVE — parité STRICTE avec le DemoStore.
 */
function retirerVersementMelange(bouteille, mouvementId) {
  if (!Array.isArray(bouteille.compositionMelange) || mouvementId == null) {
    return;
  }
  bouteille.compositionMelange = bouteille.compositionMelange
    .filter((v) => v.mouvementId !== mouvementId);
  recalculerEtiquetteMelange(bouteille);
}

/**
 * Verse `quantite` dans une bouteille. `fluideVerse` : fluide RÉELLEMENT
 * versé — n'est requis que pour tracer un versement croisé dans une
 * bouteille MELANGE (R2) ; omis, le versement est supposé du même fluide
 * que l'étiquette. `mouvementId` : traçabilité du versement. `tracer` :
 * false pour un REVERSEMENT de contre-écriture — le fluide revient, ce
 * n'est pas un versement neuf (R2 : pas de ligne fantôme dans la
 * composition d'une bouteille MELANGE). Parité STRICTE avec le DemoStore.
 */
function verserDansBouteille(bouteille, quantite, fluideVerse, mouvementId,
  tracer = true) {
  const nouvelleNette = arrondir(bouteille.masseNetteKg + quantite);
  if (nouvelleNette > bouteille.contenanceMaxKg) {
    throw new Error(
      `Débordement : la bouteille ${bouteille.code} contient déjà ` +
      `${fmtNombre(bouteille.masseNetteKg, 2)} kg ; y ajouter ` +
      `${fmtNombre(quantite, 2)} kg donnerait ` +
      `${fmtNombre(nouvelleNette, 2)} kg, au-delà de sa contenance de ` +
      `${fmtNombre(bouteille.contenanceMaxKg, 2)} kg.`);
  }
  bouteille.masseNetteKg = nouvelleNette;
  bouteille.masseBruteKg = arrondir(bouteille.tareKg + nouvelleNette);
  bouteille.datePesee = aujourdHui();
  if (bouteille.etatFluide === 'MELANGE' && tracer) {
    tracerVersementMelange(bouteille, fluideVerse ?? bouteille.fluide,
      quantite, mouvementId);
  }
  mettreAJourStatutApresVariation(bouteille);
}

function retirerDeBouteille(bouteille, quantite) {
  const nouvelleNette = arrondir(bouteille.masseNetteKg - quantite);
  if (nouvelleNette < 0) {
    throw new Error(
      `Stock insuffisant : la bouteille ${bouteille.code} ne contient ` +
      `que ${fmtNombre(bouteille.masseNetteKg, 2)} kg, or vous prélevez ` +
      `${fmtNombre(quantite, 2)} kg.`);
  }
  bouteille.masseNetteKg = nouvelleNette;
  bouteille.masseBruteKg = arrondir(bouteille.tareKg + nouvelleNette);
  bouteille.datePesee = aujourdHui();
  mettreAJourStatutApresVariation(bouteille);
}

function chargerMachine(machine, quantite) {
  const nouvelleCharge = arrondir(machine.chargeActuelleKg + quantite);
  const plafond = arrondir(machine.chargeNominaleKg * 1.05);
  if (nouvelleCharge > plafond) {
    throw new Error(
      `Surcharge : la machine ${machine.code} contient déjà ` +
      `${fmtNombre(machine.chargeActuelleKg, 2)} kg ; ajouter ` +
      `${fmtNombre(quantite, 2)} kg donnerait ` +
      `${fmtNombre(nouvelleCharge, 2)} kg, au-delà de la limite de ` +
      `${fmtNombre(plafond, 2)} kg (charge nominale ` +
      `${fmtNombre(machine.chargeNominaleKg, 2)} kg + 5 % de tolérance).`);
  }
  machine.chargeActuelleKg = nouvelleCharge;
}

function viderMachine(machine, quantite) {
  const nouvelleCharge = arrondir(machine.chargeActuelleKg - quantite);
  if (nouvelleCharge < 0) {
    throw new Error(
      `Incohérence : la machine ${machine.code} ne contient que ` +
      `${machine.chargeActuelleKg} kg de fluide.`);
  }
  machine.chargeActuelleKg = nouvelleCharge;
}

/** IM-6 : bouteille utilisable dans un mouvement (EN_STOCK ou EN_SERVICE). */
function verifierBouteilleEnStock(bouteille, role) {
  if (bouteille.statut !== 'EN_STOCK' && bouteille.statut !== 'EN_SERVICE') {
    throw new Error(
      `${role} ${bouteille.code} sortie du stock ` +
      `(statut ${bouteille.statut}) : mouvement impossible.`);
  }
}

/** IM-6 : bouteille source de charge portant un fluide UTILISABLE. */
function verifierSourceDeCharge(bouteille) {
  verifierBouteilleEnStock(bouteille, 'Bouteille source');
  if (bouteille.etatFluide === 'DECHET' ||
      bouteille.decisionFluide === 'DECHET' ||
      bouteille.decisionFluide === 'A_ANALYSER') {
    throw new Error(
      `Fluide de la bouteille ${bouteille.code} déclaré ` +
      `${bouteille.decisionFluide === 'A_ANALYSER' ? 'à analyser' : 'déchet'}` +
      ' : charge interdite (une décision « réutilisable » est requise).');
  }
}

/** Contrôles d'une machine (camelCase), triés date décroissante. */
/**
 * Contrôles ACTIFS d'une machine (P0-6) : un contrôle est réputé ANNULÉ
 * quand le mouvement qui l'a créé est ANNULE (fait DÉRIVÉ — la table des
 * contrôles n'est jamais réécrite ; un contrôle autonome, sans
 * mouvement_id, reste toujours actif). Toute la logique de fuite
 * (alertes, R3c, retour EN_SERVICE, photo nominative) ne regarde que les
 * contrôles actifs — MIROIR de controlesActifsDeLaMachine du DemoStore.
 */
function controlesDeLaMachine(machineId) {
  return db.all(
    `SELECT c.* FROM controles c
       LEFT JOIN mouvements m ON m.id = c.mouvement_id
     WHERE c.machine_id = ? AND (m.id IS NULL OR m.statut <> 'ANNULE')
     ORDER BY c.date_controle DESC`,
    [machineId]
  ).map((ligne) => mapping.versFront('controles', ligne));
}

/**
 * P0-6 : recalcule les effets machine après l'annulation d'un mouvement
 * porteur d'un contrôle lié — depuis les contrôles restés actifs, le
 * contrôle annulé exclu. Règle sobre : dernierControle = plus récent
 * actif ; prochainControle = échéance du plus récent actif qui en porte
 * une, sinon LAISSÉ en l'état (l'échéance antérieure au premier contrôle
 * est inconnaissable — limite consignée au plan P0-6) ; statut recalculé
 * SEULEMENT depuis FUITE / EN_SERVICE / CONTROLE_DU (jamais une machine
 * arrêtée ou démantelée). MIROIR EXACT du DemoStore.
 */
function recalculerEffetsMachineApresAnnulation(machineId, controleExcluId) {
  const machine = trouverMachine(machineId);
  if (machine.statut !== 'FUITE' && machine.statut !== 'EN_SERVICE' &&
      machine.statut !== 'CONTROLE_DU') {
    return;
  }
  const actifs = controlesDeLaMachine(machineId)
    .filter((c) => c.id !== controleExcluId);
  const tries = actifs.slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const patch = { date_dernier_controle: tries[0]?.date ?? null };
  let prochain = machine.prochainControle;
  const porteurEcheance = tries.find((c) => c.prochainControle);
  if (porteurEcheance) {
    prochain = porteurEcheance.prochainControle;
    patch.date_prochain_controle = prochain;
  }
  const statutFuite = estFuiteOuverte(actifs,
    equipement.mobileListe(machine));
  const fuiteNonRefermee = Boolean(statutFuite.controleFuiteId &&
    (statutFuite.ouverte || statutFuite.echeanceControleSuivi !== null));
  if (fuiteNonRefermee) {
    patch.statut = 'FUITE';
  } else if (prochain && prochain < aujourdHui()) {
    patch.statut = 'CONTROLE_DU';
  } else {
    patch.statut = 'EN_SERVICE';
  }
  majParId('machines', machine.id, patch);
}

/**
 * R3/R4 : prédicat « fuite ouverte/réparée/en attente de suivi » d'une
 * machine, calculé depuis SES contrôles. MIROIR EXACT de la fonction du
 * même nom dans v8/js/data/demo-store.js (pattern déjà suivi pour
 * enregistrerControle) : { ouverte, controleFuiteId, dateReparation,
 * echeanceControleSuivi }.
 */
function estFuiteOuverte(controlesMachine, machineMobile = false) {
  const tries = controlesMachine.slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const derniereFuite = tries.find((c) => c.resultat === 'FUITE');
  if (!derniereFuite) {
    return { ouverte: false, controleFuiteId: null, dateReparation: null,
      echeanceControleSuivi: null };
  }
  // R3c/R4 : SANS réparation tracée, la fuite reste OUVERTE — un contrôle
  // CONFORME, même postérieur, ne la referme JAMAIS seul (sinon un
  // contrôle prématuré ou de complaisance contournerait le blocage du
  // complément de gaz). P0-6 (audit 20/07, décision Franck 22/07) : la
  // clôture exige un CONFORME STRICTEMENT postérieur AU JOUR de la
  // réparation (proxy des 24 h de fonctionnement, dates au jour → J+1
  // minimum). Exception : équipement MOBILE listé (`machineMobile`) — le
  // contrôle immédiat est admis, le jour même suffit (ancienne convention
  // R4, désormais réservée à ce cas).
  if (!derniereFuite.dateReparation) {
    return { ouverte: true, controleFuiteId: derniereFuite.id,
      dateReparation: null, echeanceControleSuivi: null };
  }
  const conformePostReparation = tries.some((c) =>
    c.resultat === 'CONFORME' &&
    (machineMobile
      ? c.date >= derniereFuite.dateReparation
      : c.date > derniereFuite.dateReparation) &&
    c.date >= derniereFuite.date);
  return {
    ouverte: false,
    controleFuiteId: derniereFuite.id,
    dateReparation: derniereFuite.dateReparation,
    echeanceControleSuivi: conformePostReparation
      ? null
      : ajouterMois(derniereFuite.dateReparation, 1)
  };
}

/**
 * Applique les règles métier et les effets stocks/charges d'une écriture
 * qui se valide. Mute `mouvement.fluide`, `machineLabel`, `quantiteKg`
 * (SIGNÉE), et persiste les entités touchées. Throw = ROLLBACK global.
 */
function appliquerEffets(mouvement) {
  // P7-a : un CONTRÔLE d'étanchéité est un mouvement « sec » — aucun effet
  // stock, aucune pesée. Le résultat du contrôle et les effets machine sont
  // produits par CR-3 (contrôle lié) à la validation ; on fige seulement le
  // fluide et le libellé de la machine (CERFA). Parité stricte DemoStore.
  if (mouvement.type === 'CONTROLE_PERIODIQUE' ||
      mouvement.type === 'CONTROLE_NON_PERIODIQUE') {
    // P7-b : un mouvement de CONTROLE DOIT porter un résultat (le contrôle est
    // l'objet de l'écriture) — sinon on validerait un « contrôle vide » qui ne
    // produirait aucun contrôle lié (CR-3 se déclenche sur ce résultat).
    const resultatControle = (mouvement.controle || {}).statutControle;
    if (resultatControle !== 'CONFORME' && resultatControle !== 'FUITE') {
      throw new Error(
        'Un contrôle d’étanchéité exige un résultat : CONFORME ou FUITE.');
    }
    const machineControle = trouverMachine(mouvement.machineId);
    // P7-d : une machine DÉMANTELÉE est sortie du parc (fluide récupéré) —
    // un contrôle d'étanchéité dessus n'a plus d'objet (même garde que les
    // charges ; ARRÊTÉE reste contrôlable, elle peut revenir en service).
    if (machineControle.statut === 'DEMANTELEE') {
      throw new Error('Machine démantelée : contrôle d’étanchéité sans '
        + `objet sur ${machineControle.code}.`);
    }
    mouvement.fluide = machineControle.fluide;
    mouvement.machineLabel = machineControle.designation;
    mouvement.quantiteKg = 0;
    return;
  }
  const avant = Number(mouvement.peseeAvantKg);
  const apres = Number(mouvement.peseeApresKg);
  if (!Number.isFinite(avant) || !Number.isFinite(apres)) {
    throw new Error(
      'Pesées avant et après obligatoires pour valider le mouvement.');
  }

  if (mouvement.type === 'CHARGE_APPOINT' ||
      mouvement.type === 'MISE_EN_SERVICE') {
    const machine = trouverMachine(mouvement.machineId);
    // Une machine DÉMANTELÉE est définitivement sortie du parc : aucun
    // mouvement n'est plus possible dessus (blocage dur, ARRÊTÉE reste
    // autorisée — droit de recharger avant remise en service).
    if (machine.statut === 'DEMANTELEE') {
      throw new Error(
        `Machine démantelée : mouvement impossible sur ${machine.code}.`);
    }
    // R3c : un CHARGE_APPOINT sur une machine à fuite OUVERTE (fuite
    // déclarée sans réparation tracée postérieure) exige d'abord de
    // tracer la réparation puis de déclarer un nouveau contrôle.
    if (mouvement.type === 'CHARGE_APPOINT' &&
        estFuiteOuverte(controlesDeLaMachine(machine.id),
          equipement.mobileListe(machine)).ouverte) {
      throw new Error(MSG_FUITE_OUVERTE);
    }
    const source = trouverBouteille(mouvement.bouteilleSrcId,
      'Bouteille source');
    verifierSourceDeCharge(source); // IM-6
    // R2 : une bouteille MELANGE (contenu incertain) ne recharge JAMAIS
    // une installation — son fluide est destiné au regroupement puis à
    // la filière déchets. Bloqué ICI et pas dans verifierSourceDeCharge :
    // le TRANSFERT mélange → bouteille MÉLANGE doit rester permis.
    if (source.etatFluide === 'MELANGE') {
      throw new Error(
        `Charge interdite : le contenu de la bouteille ${source.code} ` +
        'est probablement mélangé — orientez ce fluide vers la filière ' +
        'déchets, jamais vers une installation.');
    }
    if (source.fluide !== machine.fluide) {
      throw new Error(
        `Croisement de fluides interdit : bouteille ${source.fluide} ` +
        `sur machine ${machine.fluide}.`);
    }
    const quantite = arrondir(avant - apres);
    if (quantite <= 0) {
      throw new Error(
        'Pesées incohérentes : la bouteille source doit se vider ' +
        '(pesée avant > pesée après).');
    }
    retirerDeBouteille(source, quantite);
    chargerMachine(machine, quantite);
    mouvement.fluide = machine.fluide;
    mouvement.machineLabel = machine.designation;
    mouvement.quantiteKg = quantite;
    persisterBouteille(source);
    persisterMachineCharge(machine);

  } else if (mouvement.type === 'RECUPERATION_MAINTENANCE' ||
             mouvement.type === 'RECUPERATION_DEMANTELEMENT') {
    const machine = trouverMachine(mouvement.machineId);
    // Une machine DÉMANTELÉE est définitivement sortie du parc : elle n'a
    // déjà plus de fluide résiduel (le démantèlement l'exige) — aucun
    // mouvement n'est plus possible dessus.
    if (machine.statut === 'DEMANTELEE') {
      throw new Error(
        `Machine démantelée : mouvement impossible sur ${machine.code}.`);
    }
    const destination = trouverBouteille(mouvement.bouteilleDstId,
      'Bouteille de destination');
    if (destination.type !== 'RECUPERATION') {
      throw new Error(
        'La récupération exige une bouteille de destination de type ' +
        'RÉCUPÉRATION.');
    }
    verifierBouteilleEnStock(destination, 'Bouteille de destination'); // IM-6
    // R2 : une bouteille MELANGE accepte un fluide différent de son
    // étiquette (on n'est pas sûr du contenu) — le croisement de fluide
    // reste interdit vers TOUTE AUTRE bouteille de récupération.
    if (destination.fluide !== machine.fluide &&
        destination.etatFluide !== 'MELANGE') {
      throw new Error(
        `Croisement de fluides interdit : bouteille ${destination.fluide} ` +
        `sur machine ${machine.fluide}.`);
    }
    const quantite = arrondir(apres - avant);
    if (quantite <= 0) {
      throw new Error(
        'Pesées incohérentes : la bouteille de récupération doit se ' +
        'remplir (pesée après > pesée avant).');
    }
    // IM-6 : place restante vérifiée AVANT tout effet (sinon la machine
    // serait vidée puis le versement échouerait — mutation partielle).
    if (arrondir(destination.masseNetteKg + quantite) >
        destination.contenanceMaxKg) {
      throw new Error(
        `Débordement : la bouteille ${destination.code} contient déjà ` +
        `${fmtNombre(destination.masseNetteKg, 2)} kg ; y ajouter ` +
        `${fmtNombre(quantite, 2)} kg donnerait ` +
        `${fmtNombre(arrondir(destination.masseNetteKg + quantite), 2)} kg, ` +
        `au-delà de sa contenance de ` +
        `${fmtNombre(destination.contenanceMaxKg, 2)} kg.`);
    }
    viderMachine(machine, quantite);
    verserDansBouteille(destination, quantite, machine.fluide, mouvement.id);
    mouvement.fluide = machine.fluide;
    mouvement.machineLabel = machine.designation;
    // Convention d'affichage : récupération = quantité NÉGATIVE.
    mouvement.quantiteKg = -quantite;
    persisterMachineCharge(machine);
    persisterBouteille(destination);

  } else if (mouvement.type === 'TRANSFERT') {
    const source = trouverBouteille(mouvement.bouteilleSrcId,
      'Bouteille source');
    const destination = trouverBouteille(mouvement.bouteilleDstId,
      'Bouteille de destination');
    verifierSourceDeCharge(source); // IM-6
    verifierBouteilleEnStock(destination, 'Bouteille de destination');
    // R1 : le fluide non-vierge (récupéré/recyclé/régénéré/douteux/
    // mélangé) ne va JAMAIS dans une bouteille NEUVE / VIERGE — le type
    // NEUVE compte même si son état déclaré n'est pas VIERGE (bouteille
    // fournisseur de fluide certifié recyclé/régénéré : la consigne
    // repart vide, on n'y reverse rien).
    if (source.etatFluide !== 'VIERGE' &&
        (destination.etatFluide === 'VIERGE' ||
         destination.type === 'NEUVE')) {
      throw new Error(
        'Transfert interdit : fluide non-vierge vers une bouteille ' +
        'neuve/vierge. Utilisez une bouteille de récupération.');
    }
    // R2 : le mélange reste CONFINÉ — le contenu incertain d'une
    // bouteille MELANGE ne se transfère que vers une autre bouteille
    // MELANGE (regroupement), sinon le caractère « probablement
    // mélangé » disparaîtrait du registre ; sa sortie normale est la
    // filière déchets (BSFF).
    if (source.etatFluide === 'MELANGE' &&
        destination.etatFluide !== 'MELANGE') {
      throw new Error(
        `Transfert interdit : le contenu de la bouteille ${source.code} ` +
        'est probablement mélangé — il ne se transfère que vers une ' +
        'autre bouteille de récupération MÉLANGE, ou part en filière ' +
        'déchets.');
    }
    // R2 : croisement de fluide relâché UNIQUEMENT vers une bouteille
    // de récupération MELANGE — sinon le croisement reste interdit.
    if (source.fluide !== destination.fluide &&
        !(destination.type === 'RECUPERATION' &&
          destination.etatFluide === 'MELANGE')) {
      throw new Error(
        `Croisement de fluides interdit : transfert ${source.fluide} ` +
        `vers ${destination.fluide}.`);
    }
    const quantite = arrondir(avant - apres);
    if (quantite <= 0) {
      throw new Error(
        'Pesées incohérentes : la bouteille source doit se vider ' +
        '(pesée avant > pesée après).');
    }
    if (arrondir(destination.masseNetteKg + quantite) >
        destination.contenanceMaxKg) {
      throw new Error(
        `Débordement : la bouteille ${destination.code} contient déjà ` +
        `${fmtNombre(destination.masseNetteKg, 2)} kg ; y ajouter ` +
        `${fmtNombre(quantite, 2)} kg donnerait ` +
        `${fmtNombre(arrondir(destination.masseNetteKg + quantite), 2)} kg, ` +
        `au-delà de sa contenance de ` +
        `${fmtNombre(destination.contenanceMaxKg, 2)} kg.`);
    }
    retirerDeBouteille(source, quantite);
    verserDansBouteille(destination, quantite, source.fluide, mouvement.id);
    mouvement.fluide = source.fluide;
    mouvement.quantiteKg = quantite;
    persisterBouteille(source);
    persisterBouteille(destination);

  } else {
    throw new Error(`Type de mouvement inconnu : ${mouvement.type}.`);
  }
}

/**
 * Une contre-écriture reverse du fluide dans la bouteille d'origine — mais
 * si CETTE bouteille est RÉELLEMENT sortie du circuit ENTRE-TEMPS (retournée
 * au fournisseur, remise en filière déchets), le fluide ne doit pas y
 * « réapparaître ». Les statuts VIDE et A_RETOURNER restent AUTORISÉS :
 * posés AUTOMATIQUEMENT quand la masse retombe à ~0 (CF-5), la bouteille
 * est encore physiquement à l'atelier et le reversement la remet EN_STOCK
 * tout seul — la contre-écriture est l'UNIQUE voie de correction du
 * registre WORM. Parité STRICTE avec le DemoStore.
 */
function verifierBouteillePourContreEcriture(bouteille) {
  if (bouteille.statut === 'DECHET' || bouteille.statut === 'RETOURNEE') {
    throw new Error(
      `Contre-écriture impossible : la bouteille ${bouteille.code} est ` +
      `sortie du stock (statut ${bouteille.statut}) depuis l’écriture ` +
      'd’origine ; le fluide ne peut pas y être reversé.');
  }
}

/**
 * Applique les effets INVERSES d'une écriture validée (contre-écriture).
 * IMPORTANT : toute vérification qui peut lever une Error doit se faire
 * AVANT la moindre mutation — la transaction SQL (muter/db.transaction)
 * annule déjà tout en cas de throw, mais l'ordre est aligné sur le
 * DemoStore (qui n'a pas de transaction en mémoire) par cohérence et
 * défense en profondeur.
 */
function appliquerEffetsInverses(original) {
  const quantite = Math.abs(original.quantiteKg);

  if (original.type === 'CHARGE_APPOINT' ||
      original.type === 'MISE_EN_SERVICE') {
    const machine = trouverMachine(original.machineId);
    const source = original.bouteilleSrcId
      ? trouverBouteille(original.bouteilleSrcId, 'Bouteille source')
      : null;
    if (source) verifierBouteillePourContreEcriture(source); // AVANT mutation
    viderMachine(machine, quantite);
    persisterMachineCharge(machine);
    if (source) {
      // tracer=false : le fluide REVIENT (annulation), pas un versement
      // neuf — sinon une source MELANGE gagnerait une ligne fantôme (R2).
      verserDansBouteille(source, quantite, original.fluide, original.id,
        false);
      persisterBouteille(source);
    }
  } else if (original.type === 'RECUPERATION_MAINTENANCE' ||
             original.type === 'RECUPERATION_DEMANTELEMENT') {
    const machine = trouverMachine(original.machineId);
    chargerMachine(machine, quantite);
    persisterMachineCharge(machine);
    if (original.bouteilleDstId) {
      const destination = trouverBouteille(original.bouteilleDstId,
        'Bouteille de destination');
      retirerDeBouteille(destination, quantite);
      // R2 : le versement annulé sort de la composition tracée et
      // l'étiquette majoritaire est recalculée.
      if (destination.etatFluide === 'MELANGE') {
        retirerVersementMelange(destination, original.id);
      }
      persisterBouteille(destination);
    }
  } else if (original.type === 'TRANSFERT') {
    const source = original.bouteilleSrcId
      ? trouverBouteille(original.bouteilleSrcId, 'Bouteille source')
      : null;
    if (source) verifierBouteillePourContreEcriture(source); // AVANT mutation
    if (original.bouteilleDstId) {
      const destination = trouverBouteille(original.bouteilleDstId,
        'Bouteille de destination');
      retirerDeBouteille(destination, quantite);
      // R2 : même règle que la récupération annulée (voir ci-dessus).
      if (destination.etatFluide === 'MELANGE') {
        retirerVersementMelange(destination, original.id);
      }
      persisterBouteille(destination);
    }
    if (source) {
      // tracer=false : reversement d'annulation (voir CHARGE ci-dessus).
      verserDansBouteille(source, quantite, original.fluide, original.id,
        false);
      persisterBouteille(source);
    }
  }

  // P0-6 (écart P0-7 §7(a) soldé) : un mouvement porteur d'un contrôle
  // lié qui s'annule retire les effets machine de CE contrôle — statut,
  // dernierControle et prochainControle sont RECALCULÉS depuis les
  // contrôles restés actifs. Le contrôle lié est réputé annulé AVEC son
  // mouvement (fait dérivé, aucune écriture sur controles) ; il est
  // exclu explicitement car la bascule ANNULE n'est posée qu'après.
  const controleLieId = original.controle?.controleId ?? null;
  if (controleLieId && original.machineId) {
    recalculerEffetsMachineApresAnnulation(original.machineId,
      controleLieId);
  }
}

/**
 * Persiste la charge d'une machine (copie JS mutée par les effets). La
 * masse_nette_kg des bouteilles étant GÉNÉRÉE, on écrit la brute ; pour la
 * machine, la charge est une colonne simple.
 */
function persisterMachineCharge(machine) {
  majParId('machines', machine.id,
    { charge_actuelle_kg: machine.chargeActuelleKg });
}

/**
 * Persiste une bouteille mutée par les effets : masse_brute_kg (la nette
 * GÉNÉRÉE suit), date de pesée et statut. On n'écrit QUE ce que les effets
 * touchent ; le statut est inclus car mettreAJourStatutApresVariation peut
 * le faire basculer (VIDE / A_RETOURNER / EN_STOCK) — parité DemoStore (CF-5).
 * fluide et composition_melange : verserDansBouteille (R2) peut faire
 * basculer l'étiquette d'une bouteille MELANGE et tracer le versement —
 * écrits systématiquement (no-op si la bouteille n'est pas MELANGE, le
 * champ reste alors tel quel/null).
 */
function persisterBouteille(bouteille) {
  majParId('bouteilles', bouteille.id, {
    masse_brute_kg: bouteille.masseBruteKg,
    date_derniere_pesee: bouteille.datePesee,
    statut: bouteille.statut,
    fluide: bouteille.fluide,
    composition_melange: bouteille.compositionMelange
      ? JSON.stringify(bouteille.compositionMelange) : null
  });
}

/**
 * Contrôle d'étanchéité : logique UNIQUE partagée entre createControle
 * (vague 6) et la validation d'un mouvement (CR-3). Mutations VIVES de la
 * machine + insertion du contrôle + journalisation, DANS la transaction
 * ambiante. Reprend enregistrerControle du DemoStore.
 * @returns {object} le contrôle créé (camelCase).
 */
function enregistrerControle(d) {
  const machine = trouverMachine(d.machineId);
  if (d.resultat !== 'CONFORME' && d.resultat !== 'FUITE') {
    throw new Error('Résultat de contrôle obligatoire : CONFORME ou FUITE.');
  }
  // P0-6 (revue I-1) : les dates métier sont AU JOUR — un horodatage
  // (« 2026-07-20T18:00 ») comparé en chaîne serait « strictement
  // postérieur » au jour même et contournerait la clôture J+1. MIROIR demo.
  if (d.date !== undefined && d.date !== null
      && !/^\d{4}-\d{2}-\d{2}$/.test(String(d.date))) {
    throw new Error('Date de contrôle invalide : format attendu '
      + 'AAAA-MM-JJ (date au jour).');
  }
  // Mode + numéro de fiche du contrôle (CERFA). Un contrôle LIÉ hérite ceux
  // du mouvement (passés dans d) ; un contrôle AUTONOME prend un numéro dédié
  // « C-FORM-/C-FI- » et le mode FORMATION par défaut (outil pédagogique).
  const mode = d.mode === 'OFFICIEL' ? 'OFFICIEL' : 'FORMATION';
  const controle = {
    id: db.generateId('CTL'),
    numero: d.numero ?? prochainNumeroControle(mode),
    mode,
    date: d.date ?? aujourdHui(),
    machineId: machine.id,
    machineLabel: machine.designation,
    typeControle: d.typeControle ?? 'PERIODIQUE',
    methode: d.methode ?? 'DIRECTE',
    resultat: d.resultat,
    detecteurId: d.detecteurId ?? null,
    localisationFuite: d.localisationFuite ?? null,
    reparationImmediate: Boolean(d.reparationImmediate),
    operateur: d.operateur ?? null,
    operateurId: d.operateurId ?? null,
    mouvementId: d.mouvementId ?? null,
    prochainControle: d.prochainControle ?? null
  };
  const ligne = mapping.versSql('controles', controle);
  ligne.etablissement_id = ID_ETABLISSEMENT;
  inserer('controles', ligne);

  // Effets sur la machine (contrat Phase B) — mêmes règles que le DemoStore :
  // le retour EN_SERVICE se juge sur l'échéance DE LA MACHINE une fois mise
  // à jour (l'ancienne si le contrôle n'en fournit pas), jamais sur le seul
  // champ du contrôle — sinon une machine en retard serait libérée à tort
  // par un contrôle conforme sans nouvelle échéance (revue E3).
  const patchMachine = { date_dernier_controle: controle.date };
  let nouveauStatut = machine.statut;
  if (controle.prochainControle) {
    patchMachine.date_prochain_controle = controle.prochainControle;
  }
  const echeanceMachine = controle.prochainControle ?? machine.prochainControle;
  if (controle.resultat === 'FUITE') {
    nouveauStatut = 'FUITE';
  } else if (machine.statut === 'FUITE') {
    // R4 + P0-6 : le retour EN_SERVICE depuis FUITE suit EXACTEMENT la
    // règle de clôture d'estFuiteOuverte, rejouée avec le contrôle déjà
    // inséré ci-dessus — source de vérité UNIQUE (fuite refermée =
    // réparation tracée + CONFORME de clôture : strictement postérieur
    // au jour de la réparation, jour même admis pour un équipement
    // MOBILE listé). Plus de condition ad hoc divergente du dossier.
    const statutFuite = estFuiteOuverte(controlesDeLaMachine(machine.id),
      equipement.mobileListe(machine));
    if (!statutFuite.ouverte && statutFuite.dateReparation &&
        statutFuite.echeanceControleSuivi === null) {
      nouveauStatut = 'EN_SERVICE';
    }
  } else if (machine.statut === 'CONTROLE_DU' &&
             (!echeanceMachine || echeanceMachine >= aujourdHui())) {
    nouveauStatut = 'EN_SERVICE';
  }
  patchMachine.statut = nouveauStatut;
  majParId('machines', machine.id, patchMachine);

  journaliser(controle.operateur, 'CREATION_CONTROLE', machine.code,
    `${controle.typeControle} ${controle.methode} → ${controle.resultat}`);
  return controle;
}

// ------------------------------------------------------------
// Accès ciblés par id (relecture APRÈS mutation → copie fraîche pour
// le contrat) et finders qui lèvent le message français EXACT du
// DemoStore quand l'entité n'existe pas.
// ------------------------------------------------------------

/** Un fluide est-il au référentiel ? */
function fluideConnu(code) {
  if (code == null) return false;
  return Boolean(db.get('SELECT code FROM fluides WHERE code = ?', [code]));
}

/** Fiche complète d'un fluide (camelCase : famille, gwpAr4…) ou null. */
function lireFluide(code) {
  if (code == null) return null;
  const ligne = db.get('SELECT * FROM fluides WHERE code = ?', [code]);
  return ligne ? mapping.versFront('fluides', ligne) : null;
}

/**
 * P1-2 : fiche d'un fluide telle que la RETOURNE getFluides — avec les
 * deux champs dérivés (nbMachines du parc courant, impact déduit du PRP).
 * C'est ce que rendent createFluide et updateFluide, pour que l'appelant
 * relise exactement la même forme d'objet des deux côtés.
 */
function ficheFluideComplete(code) {
  const fluide = lireFluide(code);
  if (!fluide) return null;
  const { n } = db.get(
    `SELECT count(*) AS n FROM machines
     WHERE fluide = ? AND statut <> 'DEMANTELEE'`, [code]);
  fluide.nbMachines = n;
  fluide.impact = impactDepuisPrp(fluide.gwpAr4);
  return fluide;
}

// ============================================================
// CM-2/CM-5 — avoir de fluide par machine d'origine : MIROIR EXACT du
// module front v8/js/data/avoir-origine.js (DÉRIVÉ des mouvements, aucun
// stock nouveau). Le fluide récupéré d'une machine M ne se réemploie que
// sur M, à concurrence du récupéré ; un avoir NÉGATIF = réintroduction
// au-delà, signalée par getAlertes (alr-reemploi-…). CM-5 : les TRANSFERTS
// propagent les lots d'origine au prorata des soldes positifs de la source
// (passe chronologique, clé date puis numero croissants — celle de la
// chaîne de scellement). Signes : récupération quantiteKg négatif, charge
// positif, transfert positif (src → dst).
// ============================================================
const TYPES_RECUP_AVOIR = ['RECUPERATION_MAINTENANCE', 'RECUPERATION_DEMANTELEMENT'];
const TYPES_CHARGE_AVOIR = ['CHARGE_APPOINT', 'MISE_EN_SERVICE'];

function arrondirGrammeAvoir(kg) {
  return Math.round(kg * 1000) / 1000;
}

function mouvementsActifsChronologiquesAvoir(mouvements) {
  return (mouvements ?? [])
    .filter((mv) => mv.statut === 'VALIDE' && !mv.contreEcritureDe)
    .slice()
    .sort((a, b) =>
      String(a.date ?? '').localeCompare(String(b.date ?? ''))
      || String(a.numero ?? '').localeCompare(String(b.numero ?? '')));
}

function lotsParBouteilleAvoir(mouvements) {
  const lots = new Map();
  const carte = (bouteilleId) => {
    let m = lots.get(bouteilleId);
    if (!m) { m = new Map(); lots.set(bouteilleId, m); }
    return m;
  };
  for (const mv of mouvementsActifsChronologiquesAvoir(mouvements)) {
    if (mv.quantiteKg == null) continue;
    if (TYPES_RECUP_AVOIR.includes(mv.type)
        && mv.machineId != null && mv.bouteilleDstId != null) {
      const avoir = carte(mv.bouteilleDstId);
      const gain = -mv.quantiteKg; // quantiteKg négatif → gain positif
      avoir.set(mv.machineId,
        arrondirGrammeAvoir((avoir.get(mv.machineId) ?? 0) + gain));
    } else if (TYPES_CHARGE_AVOIR.includes(mv.type)
        && mv.machineId != null && mv.bouteilleSrcId != null) {
      const avoir = carte(mv.bouteilleSrcId);
      const perte = mv.quantiteKg; // positif
      avoir.set(mv.machineId,
        arrondirGrammeAvoir((avoir.get(mv.machineId) ?? 0) - perte));
    } else if (mv.type === 'TRANSFERT'
        && mv.bouteilleSrcId != null && mv.bouteilleDstId != null
        && mv.quantiteKg > 0) {
      // CM-5 : les lots suivent le fluide, au prorata des soldes POSITIFS.
      // Auto-transfert (source = destination) : rien ne se déplace — garde
      // EXPLICITE (revue du 22/07 : l'annulation algébrique ne doit pas
      // rester accidentelle).
      if (mv.bouteilleSrcId === mv.bouteilleDstId) continue;
      const source = lots.get(mv.bouteilleSrcId);
      if (!source) continue; // rien d'attribué → rien à propager
      let totalPositif = 0;
      for (const solde of source.values()) {
        if (solde > 0) totalPositif += solde;
      }
      if (totalPositif <= 0) continue;
      const part = Math.min(1, mv.quantiteKg / totalPositif);
      // Plafond GLOBAL (revue du 22/07) : la somme des lots déplacés ne
      // dépasse JAMAIS la quantité transférée — sans lui, l'arrondi au
      // gramme par lot CRÉAIT de la matière tracée sur des micro-transferts
      // répétés multi-origines. Le lot le plus ancien absorbe l'arrondi.
      let resteAPropager = part === 1
        ? totalPositif : arrondirGrammeAvoir(mv.quantiteKg);
      const destination = carte(mv.bouteilleDstId);
      for (const [machineId, solde] of source) {
        if (solde <= 0) continue; // une surcharge signalée ne voyage pas
        if (resteAPropager <= 0) break;
        const brut = part === 1 ? solde : arrondirGrammeAvoir(solde * part);
        const deplace = Math.min(brut, solde, resteAPropager);
        if (deplace <= 0) continue;
        resteAPropager = arrondirGrammeAvoir(resteAPropager - deplace);
        source.set(machineId, arrondirGrammeAvoir(solde - deplace));
        destination.set(machineId,
          arrondirGrammeAvoir((destination.get(machineId) ?? 0) + deplace));
      }
      // Si quantiteKg > totalPositif : l'excédent transféré n'a pas
      // d'origine machine — il reste sans lot, comme avant CM-5.
    }
  }
  return lots;
}

function avoirParMachineOrigine(bouteilleId, mouvements) {
  return lotsParBouteilleAvoir(mouvements).get(bouteilleId) ?? new Map();
}

/**
 * Catégorie cadre 7 d'un fluide — MIROIR EXACT de categorieCadre7 du
 * moteur réglementaire unique (v8/js/data/reglementation-fluides.js).
 * 1. Fiche EXPLICITE d'abord : le champ categorieCadre7 (colonne
 *    categorie_cadre7, migration 21 — HFC/HFO/HCFC/AUCUNE, 'AUCUNE' =
 *    hors périmètre acté) fait foi ; valeur inconnue ignorée (repli).
 * 2. REPLI : dérivation du libellé de famille, Règle A (HFC/PFC AVANT HFO).
 */
function categorieCadre7Fluide(fluideRef) {
  const explicite = String(fluideRef?.categorieCadre7 || '').toUpperCase();
  if (explicite === 'AUCUNE') return null;
  if (explicite === 'HFC' || explicite === 'HFO' || explicite === 'HCFC') {
    return explicite;
  }
  const f = String(fluideRef?.famille || '').toUpperCase();
  if (f.includes('HFC') || f.includes('PFC')) return 'HFC';
  if (f.includes('HFO')) return 'HFO';
  if (f.includes('HCFC')) return 'HCFC';
  return null;
}

/**
 * Entrée en vigueur du contrôle d'étanchéité des HFO purs (règl. UE
 * 2024/573, F-Gas III, art. 5) — miroir de DEBUT_CONTROLE_HFO du front.
 */
const DEBUT_CONTROLE_HFO = '2024-03-11';

/**
 * IM-1 : fréquence réglementaire de contrôle d'étanchéité, en mois, ou
 * null si l'équipement est hors périmètre F-Gas. MIROIR EXACT du moteur
 * réglementaire unique du front (evaluerControle de
 * v8/js/data/reglementation-fluides.js, règles A/B/C validées, cf.
 * docs/TABLE-REGLEMENTAIRE-FLUIDES.md) : fiche explicite par fluide
 * prioritaire (categorieCadre7Fluide ci-dessus) ; Règle A = un mélange
 * contenant du HFC est traité comme un HFC (HFC/PFC testés AVANT HFO) ;
 * HFO purs et HCFC en kg ; charge NOMINALE déclarée (Règle C) ; HFO purs
 * soumis au contrôle seulement depuis le 11/03/2024 (dateIntervention
 * optionnelle, omise ou non ISO = régime courant). api.js étant du
 * CommonJS, on réimplémente ici la logique ; la parité demo/serveur,
 * Y COMPRIS la reclassification des mélanges HFC/HFO en HFC (Règle A),
 * la fiche explicite et la règle de date HFO, est prouvée par
 * test-contrat.mjs (joué demo ET local).
 */
function frequenceControleMois(fluideRef, chargeNominaleKg,
  detectionPermanente, dateIntervention) {
  const niveau = niveauCadre7(fluideRef, chargeNominaleKg, dateIntervention);
  if (niveau === 1) return detectionPermanente ? 24 : 12;
  if (niveau === 2) return detectionPermanente ? 12 : 6;
  if (niveau === 3) return detectionPermanente ? 6 : 3;
  return null;
}

/**
 * NIVEAU réglementaire du cadre 7 (1 = bas, 2 = moyen, 3 = haut, null =
 * hors périmètre) — extrait de frequenceControleMois SANS changement de
 * comportement (P1-1) : les seuils restent écrits ICI et nulle part
 * ailleurs côté serveur. Le niveau HAUT est aussi celui qui rend la
 * détection permanente OBLIGATOIRE (E2, server/equipement.js) : on
 * l'interroge au lieu de recopier 500 / 100 / 300 une fois de plus.
 */
function niveauCadre7(fluideRef, chargeNominaleKg, dateIntervention) {
  const categorie = categorieCadre7Fluide(fluideRef);
  const charge = Number(chargeNominaleKg) || 0;

  // Portée temporelle de la Règle B : HFO pur + intervention datée AVANT
  // le 11/03/2024 → pas encore de contrôle exigé. Une date non ISO est
  // ignorée (on ne désactive jamais un contrôle sur une date illisible).
  const date = typeof dateIntervention === 'string'
    && /^\d{4}-\d{2}-\d{2}/.test(dateIntervention)
    ? dateIntervention.slice(0, 10) : null;
  if (categorie === 'HFO' && date !== null && date < DEBUT_CONTROLE_HFO) {
    return null;
  }

  let niveau = null; // 1 = bas, 2 = moyen, 3 = haut
  if (categorie === 'HFC') {
    const teq = charge * (Number(fluideRef?.gwpAr4) || 0) / 1000;
    if (teq >= 500) niveau = 3;
    else if (teq >= 50) niveau = 2;
    else if (teq >= 5) niveau = 1;
  } else if (categorie === 'HFO') {
    if (charge >= 100) niveau = 3;
    else if (charge >= 10) niveau = 2;
    else if (charge >= 1) niveau = 1;
  } else if (categorie === 'HCFC') {
    if (charge >= 300) niveau = 3;
    else if (charge >= 30) niveau = 2;
    else if (charge >= 2) niveau = 1;
  }
  // Hors périmètre (CO₂, HC… ou 'AUCUNE' explicite) : aucun niveau.
  return niveau;
}

// ============================================================
// P1-2 — ADMINISTRATION DU RÉFÉRENTIEL DES FLUIDES.
// MIROIR LITTÉRAL des règles pures de v8/js/data/reglementation-fluides.js
// (CLASSES_SECURITE, STATUTS_REGLEMENTAIRES, CATEGORIES_CADRE7,
// impactDepuisPrp, codeFluideNormalise, verifierFicheFluide). api.js étant
// du CommonJS, la logique est réimplémentée ici À L'IDENTIQUE ; la parité,
// verdicts ET messages, est prouvée par test-referentiel-fluides.mjs (joué
// demo ET local). Ne jamais toucher un miroir sans l'autre.
// ============================================================

const CLASSES_SECURITE =
  ['A1', 'A2L', 'A2', 'A3', 'B1', 'B2L', 'B2', 'B3'];
const STATUTS_REGLEMENTAIRES = ['AUTORISE', 'RESTREINT', 'INTERDIT'];
const CATEGORIES_CADRE7 = ['HFC', 'HFO', 'HCFC', 'AUCUNE'];

/** Impact AFFICHÉ dérivé du PRP (D3) — bornes F-Gas 150/750/2500. */
function impactDepuisPrp(prp) {
  // ⚠️ Number(null) et Number('') valent 0 : un PRP ABSENT serait classé
  // « FAIBLE », c'est-à-dire rassurant à tort. On les écarte d'abord.
  if (prp === null || prp === undefined || prp === '') return null;
  const valeur = Number(prp);
  if (!Number.isFinite(valeur)) return null;
  // Un PRP NÉGATIF est aberrant : il ne doit pas ressortir « FAIBLE »,
  // rassurant à tort (l'import ne passe pas par la garde de saisie).
  if (valeur < 0) return null;
  if (valeur < 150) return 'FAIBLE';
  if (valeur < 750) return 'MODERE';
  if (valeur < 2500) return 'ELEVE';
  return 'TRES_ELEVE';
}

/** Code normalisé pour la COMPARAISON d'unicité (la casse saisie reste). */
function codeFluideNormalise(code) {
  return String(code ?? '').replace(/[\s.-]/g, '').toUpperCase();
}

/** Garde de saisie d'une fiche fluide COMPLÈTE — messages canoniques. */
function verifierFicheFluide(fiche) {
  const f = fiche || {};

  if (!String(f.code ?? '').trim()) {
    throw new Error('Code du fluide obligatoire (ex. R-449A).');
  }
  if (!String(f.famille ?? '').trim()) {
    throw new Error('Famille du fluide obligatoire (ex. HFC, HFO, HC, CO2).');
  }
  const prp = Number(f.gwpAr4);
  if (!Number.isFinite(prp) || prp < 0) {
    throw new Error('PRP invalide : nombre positif ou nul attendu '
      + '(le NH₃ vaut 0, le R-290 vaut 0,02).');
  }
  if (!CLASSES_SECURITE.includes(String(f.classeSecurite ?? ''))) {
    throw new Error('Classe de sécurité inconnue : '
      + `${CLASSES_SECURITE.join(', ')}.`);
  }
  const statut = f.statutReglementaire;
  if (statut != null && String(statut) !== ''
      && !STATUTS_REGLEMENTAIRES.includes(String(statut))) {
    throw new Error('Statut réglementaire inconnu : '
      + `${STATUTS_REGLEMENTAIRES.join(', ')}.`);
  }
  const categorie = f.categorieCadre7;
  if (categorie == null || String(categorie) === '') return;
  if (!CATEGORIES_CADRE7.includes(String(categorie))) {
    throw new Error('Catégorie du cadre 7 inconnue : '
      + `${CATEGORIES_CADRE7.join(', ')}.`);
  }
  const hfc = Boolean(f.contientHfc);
  const hfo = Boolean(f.contientHfo);
  if (categorie === 'HFC' && !hfc) {
    throw new Error('Fiche incohérente : la catégorie HFC suppose un fluide '
      + 'qui contient du HFC.');
  }
  if (categorie === 'HFO' && (!hfo || hfc)) {
    throw new Error('Fiche incohérente : la catégorie HFO suppose un fluide '
      + 'qui contient du HFO et pas de HFC — un mélange contenant du HFC '
      + 'relève de la catégorie HFC (règle A).');
  }
  if ((categorie === 'HCFC' || categorie === 'AUCUNE') && (hfc || hfo)) {
    throw new Error(`Fiche incohérente : la catégorie ${categorie} exclut `
      + 'un fluide contenant du HFC ou du HFO.');
  }
}

/**
 * Plus grand nombre extrait d'un code lisible (M{n}, B-NN…) par COMPTEUR,
 * sur toutes les lignes de `table`. 0 si aucun code exploitable.
 */
function plusGrandCode(table, colonne, prefixe) {
  const lignes = db.all(`SELECT ${colonne} AS code FROM ${table}`);
  let max = 0;
  for (const { code } of lignes) {
    // Même tolérance que le DemoStore : on retire le préfixe et on garde
    // tout code résiduel numérique (un code importé « 12 » compte pour 12) —
    // sinon les compteurs divergeraient après un import (revue E3).
    const n = Number(String(code ?? '').replace(prefixe, ''));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

/**
 * Code machine lisible — MIROIR EXACT de v8/js/data/code-machine.js
 * (le serveur est CommonJS, le front ESM : littéraux dupliqués, motif
 * habilitations/sentinelle). Toute évolution se fait DES DEUX CÔTÉS.
 */
function normaliserCodeMachine(code) {
  return String(code || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '');
}

function validerCodeMachine(code) {
  if (!code) return 'Code machine vide.';
  if (code.length > 24) return 'Code machine trop long (24 caractères maximum).';
  if (!/^[A-Z0-9][A-Z0-9-]*$/.test(code)) {
    return 'Code machine invalide : lettres, chiffres et tirets seulement.';
  }
  return null;
}

/** Vrai si un code machine normalisé est déjà porté par une AUTRE machine. */
function codeMachineDejaPris(code, idExclu) {
  const lignes = db.all('SELECT id, code_interne FROM machines');
  return lignes.some((l) => l.id !== idExclu
    && normaliserCodeMachine(l.code_interne) === code);
}

/** Nombre de tentatives avant d'abandonner un tirage de code public. */
const CODE_PUBLIC_TENTATIVES_MAX = 20;

/**
 * Tire un code public (base32 Crockford, 7 car.) UNIQUE dans la `table`
 * donnée ('machines' ou 'bouteilles') — retire (retry) en cas de collision
 * avec le parc déjà en base. La collision est structurellement quasi
 * impossible (32^7 ≈ 34 milliards de combinaisons) : la boucle est un
 * filet de sécurité, pas le mécanisme d'unicité réel (celui-ci est l'index
 * UNIQUE partiel de la migration 003, posé sur les deux tables).
 */
function codePublicUnique(table) {
  for (let tentative = 0; tentative < CODE_PUBLIC_TENTATIVES_MAX; tentative += 1) {
    const code = db.genererCodePublic();
    const collision = db.get(
      `SELECT 1 AS x FROM ${table} WHERE code_public = ?`, [code]);
    if (!collision) return code;
  }
  throw new Error(
    'Impossible de générer un code public unique pour la ' +
    `${table === 'bouteilles' ? 'bouteille' : 'machine'} ` +
    `(après ${CODE_PUBLIC_TENTATIVES_MAX} tentatives).`);
}

/** Personne par id, avec ses champs camelCase (copie). */
function lirePersonne(id) {
  return mapping.versFront('personnel',
    db.get('SELECT * FROM personnel WHERE id = ?', [id]));
}

/**
 * Résout l'utilisateur d'une SESSION E5 : mappe le compte `utilisateurs_app`
 * de la session vers l'objet attendu par le front ({ id, nom, prenom,
 * roleApp, … }). Une fiche personnel liée (personnel_id) fournit l'identité
 * riche ; à défaut (compte ADMIN amorcé en CLI, personnel encore vide) on
 * synthétise un objet minimal de même forme. Le rôle est TOUJOURS celui de la
 * session (autorité), jamais celui de la fiche personnel.
 * @param {string} idCompte      id du compte (contexte.utilisateur)
 * @param {string|null} roleSession  rôle figé de la session
 */
function utilisateurDeSession(idCompte, roleSession) {
  const compte = db.get(
    `SELECT id, login, role, personnel_id FROM utilisateurs_app WHERE id = ?`,
    [idCompte]);
  if (!compte) {
    // verifierSession a normalement déjà garanti l'existence + actif=1 ;
    // défense en profondeur si la session survivait à la disparition du compte.
    throw new Error('Compte de session introuvable.');
  }
  const role = roleSession ?? compte.role;
  if (compte.personnel_id) {
    const fiche = db.get(
      'SELECT * FROM personnel WHERE id = ?', [compte.personnel_id]);
    if (fiche) {
      const personne = mapping.versFront('personnel', fiche);
      personne.roleApp = role; // le rôle vient de la session, jamais de la fiche
      return personne;
    }
  }
  return utilisateurMinimalDeCompte(compte, role);
}

/**
 * Objet « utilisateur courant » minimal pour un compte SANS fiche personnel
 * (ADMIN amorcé en CLI avant toute saisie du personnel). Même forme qu'une
 * fiche personnel mappée (mapping.js:personnel) pour que le front n'ait aucun
 * cas particulier : identité réduite au login, aucune attestation.
 */
function utilisateurMinimalDeCompte(compte, role) {
  return {
    id: compte.id,
    nom: compte.login,
    prenom: '',
    typePersonne: null,
    roleApp: role,
    numAttestationAptitude: null,
    organismeDelivreur: null,
    dateObtention: null,
    dateFinValidite: null,
    categorie2008: null,
    categorie2025: null,
    activitesAutorisees: [],
    actif: true,
    email: null,
  };
}

function trouverPersonne(id) {
  const ligne = db.get('SELECT * FROM personnel WHERE id = ?', [id]);
  if (!ligne) throw new Error(`Personne introuvable : ${id}.`);
  return mapping.versFront('personnel', ligne);
}

function trouverHabilitation(id) {
  const ligne = db.get('SELECT * FROM habilitations WHERE id = ?', [id]);
  if (!ligne) throw new Error(`Habilitation introuvable : ${id}.`);
  return mapping.versFront('habilitations', ligne);
}

function trouverMention(id) {
  const ligne = db.get(
    'SELECT * FROM mentions_habilitation WHERE id = ?', [id]);
  if (!ligne) throw new Error(`Mention introuvable : ${id}.`);
  return mapping.versFront('mentions_habilitation', ligne);
}

/** Client par id, nbMachines recalculé (non démantelées) — comme getClients. */
function lireClient(id) {
  const ligne = db.get('SELECT * FROM clients_detenteurs WHERE id = ?', [id]);
  const client = mapping.versFront('clients_detenteurs', ligne);
  const { n } = db.get(
    `SELECT count(*) AS n FROM machines
     WHERE client_detenteur_id = ? AND statut <> 'DEMANTELEE'`, [id]);
  client.nbMachines = n;
  return client;
}

function trouverClient(id) {
  const ligne = db.get('SELECT id FROM clients_detenteurs WHERE id = ?', [id]);
  if (!ligne) throw new Error(`Client / détenteur introuvable : ${id}.`);
}

/** Non-conformité par id (copie camelCase). Error si introuvable et exigee. */
function lireNonConformite(id, exigee = false) {
  const ligne = db.get('SELECT * FROM non_conformites WHERE id = ?', [id]);
  if (!ligne) {
    if (exigee) throw new Error(`Non-conformité introuvable : ${id}.`);
    return null;
  }
  return mapping.versFront('non_conformites', ligne);
}

/** Outil par id (copie camelCase). */
function lireOutil(id) {
  return mapping.versFront('outillage',
    db.get('SELECT * FROM outillage WHERE id = ?', [id]));
}

function trouverOutil(id) {
  const ligne = db.get('SELECT * FROM outillage WHERE id = ?', [id]);
  if (!ligne) throw new Error(`Outil introuvable : ${id}.`);
  return mapping.versFront('outillage', ligne);
}

/** Pièce jointe par id (métadonnées seules, copie camelCase). */
function lirePieceJointe(id) {
  return mapping.versFront('pieces_jointes',
    db.get('SELECT * FROM pieces_jointes WHERE id = ?', [id]));
}

/**
 * Décode le contenu (data URL ou base64 brut) d'une pièce jointe en octets.
 * MIROIR de v8/js/data/contenu-pj.js — mêmes messages, même alphabet.
 *
 * ⚠ PIÈGE PAYÉ (audit du 14/07) : `Buffer.from(x, 'base64')` NE LÈVE JAMAIS.
 * Il ignore les caractères hors alphabet et rend du déchet — un Blob réduit
 * à `{}` par JSON donnait `String({})` = « [object Object] » → 9 octets
 * écrits sur disque, hachés en SHA-256 et journalisés comme pièce probante.
 * Le try/catch d'origine était donc du code mort. La validation ci-dessous
 * est EXPLICITE : c'est elle qui protège la preuve.
 * @returns {Buffer}
 */
function decoderBase64Pj(contenu) {
  if (typeof contenu !== 'string') {
    throw new Error('Contenu de pièce jointe attendu : blob ou base64.');
  }
  const base64 = contenu.replace(/^data:[^;]*;base64,/, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error('Contenu base64 illisible pour la pièce jointe.');
  }
  return Buffer.from(base64, 'base64');
}

/** Message levé quand le CONTENU d'une PJ dément le type déclaré (miroir front). */
const MSG_SIGNATURE_PJ =
  'Contenu du fichier incohérent avec le type déclaré ' +
  '(signature binaire non conforme).';

/**
 * Signatures binaires des SEULS types de PJ acceptés — MIROIR EXACT de
 * v8/js/data/contenu-pj.js (SIGNATURES_PJ). Ne jamais faire diverger.
 */
const SIGNATURES_PJ = {
  'application/pdf': [{ pos: 0, octets: [0x25, 0x50, 0x44, 0x46] }],
  'image/png': [{ pos: 0, octets: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/jpeg': [{ pos: 0, octets: [0xff, 0xd8, 0xff] }],
  'image/webp': [
    { pos: 0, octets: [0x52, 0x49, 0x46, 0x46] },
    { pos: 8, octets: [0x57, 0x45, 0x42, 0x50] },
  ],
};

/**
 * La signature binaire réelle des `octets` concorde-t-elle avec le `mimeType`
 * déclaré ? MIROIR EXACT de contenu-pj.js signatureConcordeAvecMime.
 * @param {Buffer|Uint8Array} octets
 * @param {string} mimeType
 * @returns {boolean}
 */
function signatureConcordeAvecMime(octets, mimeType) {
  const motifs = SIGNATURES_PJ[mimeType];
  if (!motifs || !octets) return false;
  for (const { pos, octets: attendus } of motifs) {
    for (let i = 0; i < attendus.length; i += 1) {
      if (octets[pos + i] !== attendus[i]) return false;
    }
  }
  return true;
}

/** Dossier documents/ des pièces jointes, TOUJOURS à côté de la base. */
function dossierDocuments() {
  const dossier = path.join(path.dirname(db.cheminOuvert()), 'documents');
  fs.mkdirSync(dossier, { recursive: true });
  return dossier;
}

/**
 * Chemin disque d'une pièce jointe — TOUJOURS RECALCULÉ depuis son id, JAMAIS
 * lu des données (l'id EST le nom du fichier, cf. ecrirePieceJointeSurDisque).
 *
 * ⚠ SÉCURITÉ (BLOQUANT trouvé à l'audit du 14/07) : la colonne `chemin` était
 * réinjectée telle quelle depuis un JSON importé, puis relue (fs.readFileSync,
 * classée « lecture » donc SANS aucun rôle) et SUPPRIMÉE (fs.unlinkSync, classée
 * OPERATEUR — rôle qui inclut ELEVE). Un chemin forgé dans un fichier d'import
 * faisait donc lire, puis détruire, n'importe quel fichier du poste (la base
 * elle-même, un document personnel…). On ne fait plus JAMAIS confiance à la
 * donnée : le chemin est reconstruit, et l'id est validé (aucune traversée).
 *
 * Effet de bord bienvenu : les pièces jointes redeviennent PORTABLES — une base
 * restaurée sur un autre poste retrouve ses fichiers (dette ROADMAP « chemin
 * absolu », le schéma promettait d'ailleurs un chemin relatif depuis le début).
 * @param {string} id
 * @returns {string} chemin absolu, toujours à l'intérieur de documents/
 */
function cheminPieceJointe(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error(`Identifiant de pièce jointe invalide : ${id}.`);
  }
  return path.join(dossierDocuments(), id);
}

// ------------------------------------------------------------
// Coffre des identités (lot E2) — aides serveur.
// ------------------------------------------------------------

/** Vrai si la personne a une identité au coffre. */
function estAuCoffreServeur(personnelId) {
  return Boolean(db.get(
    'SELECT 1 AS un FROM coffre_identites WHERE personnel_id = ?',
    [personnelId]));
}

/**
 * Les gestes du coffre exigent le POSTE LOCAL : en LAN (IWF_LAN=1), la
 * phrase traverserait le réseau du lycée en clair (HTTP sans chiffrement
 * de transport) — refus net, message canonique.
 */
function verifierPosteLocalCoffre() {
  if (process.env.IWF_LAN === '1') {
    throw new Error(coffre.MSG_COFFRE_LAN);
  }
}

/**
 * Vérifie la phrase du coffre contre le TÉMOIN (enveloppe GCM du texte
 * fixe — rien de dérivé de la phrase seule n'est stocké) et renvoie la clé
 * DÉRIVÉE (l'appelant la réutilise pour l'opération puis fait cle.fill(0)).
 * Message UNIQUE en échec (anti-oracle).
 * @param {string} phrase
 * @returns {Buffer} clé de 32 octets
 */
function verifierPhraseCoffreServeur(phrase) {
  const temoinBase64 = parametres.lire('coffre_temoin');
  if (temoinBase64 === null) {
    throw new Error(coffre.MSG_COFFRE_INEXISTANT);
  }
  if (typeof phrase !== 'string' || phrase.length === 0) {
    throw new Error(coffre.MSG_CODE_INCORRECT);
  }
  // TOUT le chemin (lecture du sel, dérivation, déchiffrement du témoin)
  // sous le MÊME message : un sel absent/corrompu en base ne doit pas
  // faire fuiter une erreur brute de Node (contrat anti-oracle).
  let cle = null;
  try {
    const sel = Buffer.from(String(parametres.lire('coffre_sel')), 'hex');
    cle = chiffrementCoffre.deriverCleCoffre(phrase, sel);
    const texte = chiffrementCoffre.dechiffrerChampCoffreAvecCle(
      Buffer.from(temoinBase64, 'base64'), cle, coffre.AAD_TEMOIN);
    if (texte.toString('utf8') !== coffre.TEXTE_TEMOIN) {
      throw new Error(coffre.MSG_CODE_INCORRECT);
    }
  } catch {
    if (cle) cle.fill(0);
    throw new Error(coffre.MSG_CODE_INCORRECT);
  }
  return cle;
}

/**
 * Déchiffre l'enveloppe d'une ligne du coffre (autoportance : si le sel
 * embarqué n'est pas le sel global — enveloppe importée d'un autre poste —
 * la dérivation se fait sur SON sel). Erreurs : message canonique unique.
 * @param {object} ligne - ligne SQL de coffre_identites
 * @param {string} phrase
 * @returns {object} identité (JSON)
 */
function dechiffrerIdentiteCoffre(ligne, phrase) {
  const cle = verifierPhraseCoffreServeur(phrase);
  try {
    const aad = coffre.aadIdentite(ligne.personnel_id, ligne.pseudonyme);
    const enveloppe = Buffer.from(ligne.enveloppe);
    const selGlobal = Buffer.from(parametres.lire('coffre_sel'), 'hex');
    const selEnveloppe =
      chiffrementCoffre.decomposerChampCoffre(enveloppe).sel;
    const octets = selEnveloppe.equals(selGlobal)
      ? chiffrementCoffre.dechiffrerChampCoffreAvecCle(enveloppe, cle, aad)
      : chiffrementCoffre.dechiffrerChampCoffre(enveloppe, phrase, aad);
    try {
      return JSON.parse(octets.toString('utf8'));
    } catch {
      throw new Error(coffre.MSG_CODE_INCORRECT);
    }
  } finally {
    cle.fill(0);
  }
}

/** Prochain numéro MONOTONE de pseudonyme pour une année (parametres). */
function prochainNumeroCoffreServeur(annee) {
  const cle = `coffre_compteur_${annee}`;
  const suivant = Number(parametres.lire(cle, '0')) + 1;
  parametres.ecrire(cle, String(suivant));
  return suivant;
}

/**
 * Une ARCHIVE complète VÉRIFIÉE récente est le préalable de toute mise à
 * l'abri (bloquant n°2 de la revue de conception : après la purge des
 * scans, restaurer un INSTANTANÉ base-seule laisserait une base nominative
 * pointant des fichiers disparus). Si aucune archive fraîche : on la
 * PRODUIT et on la VÉRIFIE ici même ; tout échec = refus canonique.
 */
function assurerArchiveFraichePourCoffre() {
  try {
    const etat = sauvegardeAuto.etatSauvegardeRecente();
    if (etat.recente) return;
    const produit = sauvegardeCoffre.sauvegarderArchive(
      { indice: 'avant mise à l\'abri (coffre des identités)' });
    const verdict = restaurationCoffre.testerSauvegarde(produit.chemin);
    if (verdict.verdict !== 'VERT') {
      throw new Error('archive produite mais non vérifiée');
    }
  } catch {
    throw new Error(coffre.MSG_ARCHIVE_REQUISE);
  }
}

/** Purge disque best-effort d'une liste de chemins (après COMMIT). */
function purgerFichiersCoffre(chemins) {
  for (const chemin of chemins) {
    try {
      fs.rmSync(chemin, { force: true });
      db.run('DELETE FROM coffre_purge_en_attente WHERE chemin = ?',
        [chemin]);
    } catch {
      // Raté : la ligne reste, rejouée au prochain démarrage.
    }
  }
}

/**
 * Rejoue la liste de rattrapage des fichiers à purger (appelé au DÉMARRAGE
 * par serveur.js — un plantage entre COMMIT et purge disque ne laisse
 * jamais un scan en clair orphelin). Best-effort ABSOLU : ne lève jamais.
 * @returns {{purges: number, restants: number}}
 */
function rejouerPurgeCoffre() {
  let purges = 0;
  let restants = 0;
  try {
    const lignes = db.all('SELECT * FROM coffre_purge_en_attente');
    for (const ligne of lignes) {
      try {
        fs.rmSync(ligne.chemin, { force: true });
        db.run('DELETE FROM coffre_purge_en_attente WHERE id = ?',
          [ligne.id]);
        purges += 1;
      } catch {
        restants += 1;
      }
    }
  } catch {
    // Table absente (base antérieure à la migration 25) : rien à faire.
  }
  return { purges, restants };
}

/** Écrit le contenu d'une pièce jointe sur disque, renvoie le chemin. */
function ecrirePieceJointeSurDisque(id, octets) {
  const chemin = cheminPieceJointe(id);
  fs.writeFileSync(chemin, octets);
  return chemin;
}

/**
 * Lot C (C3) : conserve le PDF FINAL d'une fiche officielle en pièce
 * jointe SYSTÈME (catégorie CERFA_FINAL) — insertion DIRECTE, sans passer
 * par ajouterPieceJointe : pas d'incrément de révision (les signatures
 * viennent d'être jugées valides par le moteur et doivent le RESTER), pas
 * de refus « écriture figée » à fermer en C3c. Appelée par
 * validerMouvement DANS la transaction, AVANT le calcul des champs gelés
 * (l'empreinte du PDF entre dans hashPiecesJointes ET hashPdfFinal).
 * Exportée pour le filet de test (mécanique éprouvée verrou de livraison
 * fermé) — JAMAIS exposée comme méthode du contrat.
 * @param {object} mouvement objet logique (id, numero)
 * @param {Buffer} octets contenu PDF déjà contrôlé (%PDF, taille)
 * @param {string} ajoutePar « Prénom Nom » du validateur
 * @returns {{ pjId: string, sha: string }} identifiant de la pièce
 *   jointe système et sha256 hexadécimal du PDF conservé
 */
function conserverPdfFinal(mouvement, octets, ajoutePar) {
  const pieceJointe = {
    id: db.generateId('PJ'),
    entiteType: 'MOUVEMENT',
    entiteId: mouvement.id,
    categorie: CATEGORIE_PDF_FINAL,
    nomFichier: nomFichierPdfFinal(mouvement.numero),
    mimeType: 'application/pdf',
    taille: octets.length,
    hashSha256: crypto.createHash('sha256').update(octets).digest('hex'),
    dateAjout: new Date().toISOString(),
    ajoutePar: ajoutePar ?? null
  };
  ecrirePieceJointeSurDisque(pieceJointe.id, octets);
  const ligne = mapping.versSql('pieces_jointes', pieceJointe);
  ligne.etablissement_id = ID_ETABLISSEMENT;
  // `chemin` = nom RELATIF dans documents/ (= l'id), comme ajouterPieceJointe.
  ligne.chemin = pieceJointe.id;
  inserer('pieces_jointes', ligne);
  return { pjId: pieceJointe.id, sha: pieceJointe.hashSha256 };
}

/**
 * Lot C (C3b) : écrit les TÉMOINS du PDF final conservé à côté du fichier
 * dans documents/ — un `.sha256` frère (format sha256sum binaire,
 * vérifiable tel quel : « sha256sum -c <id>.sha256 ») et un
 * `.manifeste.json` (fiche, signataires, empreinte scellée du mouvement,
 * version du logiciel — même esprit que le témoin quotidien du lot D).
 * Appelée HORS transaction, APRÈS le scellement : best-effort ABSOLU —
 * l'écriture scellée est acquise, un échec est JOURNALISÉ, jamais
 * bloquant. Exportée pour le filet de test.
 * @param {object} manifeste l'objet complet à écrire (contient
 *   pieceJointeId et sha256Pdf)
 */
function ecrireTemoinsPdfFinal(manifeste) {
  try {
    const cheminPdf = cheminPieceJointe(manifeste.pieceJointeId);
    fs.writeFileSync(`${cheminPdf}.sha256`,
      `${manifeste.sha256Pdf} *${manifeste.pieceJointeId}\n`);
    fs.writeFileSync(`${cheminPdf}.manifeste.json`,
      JSON.stringify(manifeste, null, 2));
  } catch (erreur) {
    try {
      // db.journaliser DIRECT (comme le lot D) : l'entrée reste attribuée
      // à « système », sans réattribution par le témoin d'identité de la
      // session courante.
      db.journaliser({
        qui: 'système',
        action: 'TEMOINS_PDF_ECHEC',
        cible: manifeste?.numeroFiche ?? '',
        details: String(erreur?.message ?? erreur)
      });
    } catch {
      // Jamais bloquant : l'écriture scellée est déjà acquise.
    }
  }
}

/**
 * Lot C (C3b) : (ré)écrit les témoins MANQUANTS de tous les PDF conservés
 * — appelée au DÉMARRAGE du serveur (best-effort, patron du lot D). Deux
 * cas légitimes laissent des témoins absents : une RESTAURATION d'archive
 * (le coffre-fort ne transporte que les fichiers listés en table, la
 * bascule remplace documents/ en bloc) et un échec d'écriture toléré
 * (TEMOINS_PDF_ECHEC). Tout se RE-DÉRIVE des colonnes scellées : le
 * `.sha256` régénéré est identique bit à bit ; le manifeste régénéré est
 * marqué `regenere: true` (la date de validation d'origine est relue du
 * journal chaîné). Un témoin PRÉSENT n'est JAMAIS écrasé : un frère
 * falsifié reste en place, dénoncé par verifierPdfFinalConserve.
 * @returns {{ examines: number, reecrits: number }}
 */
function reecrireTemoinsPdfFinalManquants() {
  const scelles = db.all(
    `SELECT id, numero, cerfa_numero, hash_pdf_final, hash_ecriture,
            hash_precedent, version_empreinte, hash_signatures,
            hash_pieces_jointes, revision_brouillon, validateur_id
     FROM mouvements WHERE hash_pdf_final IS NOT NULL`);
  let reecrits = 0;
  for (const mv of scelles) {
    try {
      const pj = db.get(
        `SELECT id, nom_fichier FROM pieces_jointes
         WHERE entite_type = 'MOUVEMENT' AND entite_id = ?
           AND categorie = ?`, [mv.id, CATEGORIE_PDF_FINAL]);
      if (!pj) continue;
      const cheminPdf = cheminPieceJointe(pj.id);
      const shaManque = !fs.existsSync(`${cheminPdf}.sha256`);
      const manifesteManque = !fs.existsSync(`${cheminPdf}.manifeste.json`);
      if (!shaManque && !manifesteManque) continue;
      if (shaManque) {
        fs.writeFileSync(`${cheminPdf}.sha256`,
          `${mv.hash_pdf_final} *${pj.id}\n`);
      }
      if (manifesteManque) {
        const signataires = db.all(
          `SELECT id, role, nom, prenom, qualite, par_delegation, date_heure
           FROM signatures_mouvement
           WHERE mouvement_id = ? AND version_document = ?`,
          [mv.id, mv.revision_brouillon ?? 0])
          .sort((a, b) => (a.date_heure < b.date_heure ? -1
            : a.date_heure > b.date_heure ? 1
              : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
          .map((ligne) => ({
            role: ligne.role,
            nom: ligne.nom,
            prenom: ligne.prenom,
            qualite: ligne.qualite ?? null,
            parDelegation: Boolean(ligne.par_delegation),
            dateHeure: ligne.date_heure
          }));
        // La date de validation d'origine, relue du journal CHAÎNÉ.
        const entreeJournal = db.get(
          `SELECT date_heure FROM journal_audit
           WHERE action = 'VALIDATION_MOUVEMENT' AND cible = ?`,
          [mv.numero]);
        fs.writeFileSync(`${cheminPdf}.manifeste.json`, JSON.stringify({
          type: 'PDF_FINAL_CERFA',
          logiciel: 'inerWeb Fluide',
          versionLogiciel: VERSION_LOGICIEL,
          numeroFiche: mv.numero,
          cerfaNumero: mv.cerfa_numero ?? null,
          mouvementId: mv.id,
          pieceJointeId: pj.id,
          nomFichier: pj.nom_fichier,
          sha256Pdf: mv.hash_pdf_final,
          dateValidation: entreeJournal?.date_heure ?? null,
          validateur: mv.validateur_id ?? null,
          signataires,
          empreinteMouvement: mv.hash_ecriture,
          hashPrecedent: mv.hash_precedent ?? null,
          versionEmpreinte: mv.version_empreinte,
          hashSignatures: mv.hash_signatures,
          hashPiecesJointes: mv.hash_pieces_jointes,
          regenere: true,
          dateRegeneration: new Date().toISOString()
        }, null, 2));
      }
      reecrits += 1;
    } catch {
      // Best-effort ABSOLU : on passe au suivant, le démarrage continue.
    }
  }
  return { examines: scelles.length, reecrits };
}

/**
 * Lot C (C3b) : vérifie le PDF final CONSERVÉ d'une écriture — la pièce
 * jointe CERFA_FINAL, le fichier sur disque et le `.sha256` frère doivent
 * tous porter l'empreinte SCELLÉE dans l'écriture (hash_pdf_final, gelé
 * dans l'empreinte v2). Sans objet si l'écriture n'a pas de PDF scellé.
 * Exportée pour le filet de test ; sera branchée au dossier d'audit à
 * l'ouverture du mode Officiel (brique C5).
 * @param {string} mouvementId
 * @returns {{ ok: boolean, sansObjet: boolean, motifs: string[] }}
 */
function verifierPdfFinalConserve(mouvementId) {
  const mv = db.get(
    'SELECT numero, hash_pdf_final FROM mouvements WHERE id = ?',
    [mouvementId]);
  if (!mv) throw new Error(`Mouvement introuvable : ${mouvementId}.`);
  if (!mv.hash_pdf_final) return { ok: true, sansObjet: true, motifs: [] };
  const motifs = [];
  // Lot C (C3c) : la PLURALITÉ est dénoncée (constat de la revue C3b) —
  // une seule pièce CERFA_FINAL peut exister par écriture (canal système
  // unique, catégorie réservée, import recompté) ; en trouver plusieurs
  // = insertion hors canal. Tri en JS (règle maison, jamais d'ORDER BY).
  const pjsCerfa = db.all(
    `SELECT * FROM pieces_jointes
     WHERE entite_type = 'MOUVEMENT' AND entite_id = ? AND categorie = ?`,
    [mouvementId, CATEGORIE_PDF_FINAL])
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (pjsCerfa.length > 1) {
    motifs.push(
      `plusieurs pièces jointes CERFA_FINAL (${pjsCerfa.length}) pour la `
      + 'même écriture : insertion hors canal système');
  }
  const pj = pjsCerfa[0] ?? null;
  if (!pj) {
    motifs.push('pièce jointe CERFA_FINAL introuvable en base');
  } else {
    if (pj.hash_sha256 !== mv.hash_pdf_final) {
      motifs.push('empreinte de la pièce jointe ≠ empreinte scellée');
    }
    const chemin = pj.chemin ? cheminPieceJointe(pj.id) : null;
    if (!chemin || !fs.existsSync(chemin)) {
      motifs.push('fichier du PDF conservé absent du disque');
    } else {
      const shaDisque = crypto.createHash('sha256')
        .update(fs.readFileSync(chemin)).digest('hex');
      if (shaDisque !== mv.hash_pdf_final) {
        motifs.push('PDF conservé sur disque ALTÉRÉ (sha divergent)');
      }
      const cheminSha = `${chemin}.sha256`;
      if (!fs.existsSync(cheminSha)) {
        motifs.push('fichier .sha256 frère absent');
      } else {
        const premierMot = String(fs.readFileSync(cheminSha, 'utf8'))
          .trim().split(/\s+/)[0];
        if (premierMot !== mv.hash_pdf_final) {
          motifs.push('fichier .sha256 frère divergent de l’empreinte scellée');
        }
      }
    }
  }
  return { ok: motifs.length === 0, sansObjet: false, motifs };
}

/**
 * Brique C5 : joue verifierPdfFinalConserve sur TOUTES les écritures
 * scellées avec un PDF final — le contrôle du démarrage (serveur.js),
 * même patron que la réécriture des témoins C3b : best-effort, jamais
 * bloquant. Les anomalies remontent à l'appelant, qui les affiche et
 * les journalise.
 * @returns {{ examines: number,
 *   anomalies: Array<{numero: string, motifs: string[]}> }}
 */
function verifierTousPdfFinalConserves() {
  const scelles = db.all(
    'SELECT id, numero FROM mouvements WHERE hash_pdf_final IS NOT NULL')
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const anomalies = [];
  for (const mv of scelles) {
    // Best-effort PAR écriture (revue adversariale) : un fichier
    // illisible (verrou antivirus, disque) devient SON anomalie — il
    // n'avorte jamais le contrôle des autres PDF conservés.
    let verdict;
    try {
      verdict = verifierPdfFinalConserve(mv.id);
    } catch (erreur) {
      verdict = { ok: false, sansObjet: false,
        motifs: [`vérification impossible : ${erreur.message}`] };
    }
    if (!verdict.ok) {
      anomalies.push({ numero: mv.numero, motifs: verdict.motifs });
    }
  }
  return { examines: scelles.length, anomalies };
}

/** Machine par id (copie camelCase). */
function lireMachine(id) {
  return mapping.versFront('machines',
    db.get('SELECT * FROM machines WHERE id = ?', [id]));
}

function trouverMachine(id) {
  const ligne = db.get('SELECT * FROM machines WHERE id = ?', [id]);
  if (!ligne) throw new Error(`Machine introuvable : ${id}.`);
  return mapping.versFront('machines', ligne);
}

/** Bouteille par id (copie camelCase, masseNetteKg = colonne générée). */
function lireBouteille(id) {
  return mapping.versFront('bouteilles',
    db.get('SELECT * FROM bouteilles WHERE id = ?', [id]));
}

function trouverBouteille(id, role = 'Bouteille') {
  const ligne = db.get('SELECT * FROM bouteilles WHERE id = ?', [id]);
  if (!ligne) throw new Error(`${role} introuvable : ${id}.`);
  return mapping.versFront('bouteilles', ligne);
}

/** Mouvement par id (copie camelCase, contrôle reconstitué). */
function trouverMouvement(id) {
  const ligne = db.get('SELECT * FROM mouvements WHERE id = ?', [id]);
  if (!ligne) throw new Error(`Mouvement introuvable : ${id}.`);
  return reconstituerMouvement(ligne);
}

/**
 * Vérifie qu'une personne existe ET a le droit de valider (garde MÉTIER de
 * la double garde : lit en base le rôle du VALIDATEUR DÉSIGNÉ). Messages
 * repris MOT POUR MOT du DemoStore (verifierValidateur).
 */
function verifierValidateur(validateurId) {
  const ligne = db.get('SELECT * FROM personnel WHERE id = ?', [validateurId]);
  if (!ligne) {
    throw new Error(`Validateur introuvable : ${validateurId}.`);
  }
  const personne = mapping.versFront('personnel', ligne);
  if (!ROLES_VALIDEURS.includes(personne.roleApp)) {
    throw new Error(
      'Validation refusée : un élève ne peut pas valider une écriture ' +
      '(rôle requis : référent, enseignant ou administrateur).');
  }
  return personne;
}

// ------------------------------------------------------------
// Blocage dur du mode OFFICIEL (lot B — condition 2 du plan).
// Le validateur DE SESSION est appliqué dans TOUS les modes (sécurité,
// pas métier) ; le reste ne s'applique qu'aux fiches OFFICIEL.
// ------------------------------------------------------------

/**
 * Lien validateur ↔ session — condition n° 12 de la liste : l'API
 * n'accepte JAMAIS qu'un utilisateur déclare l'identité d'un autre
 * validateur (le trou « qui déclaré ≠ prouvé » de l'audit du 15/07).
 *  - null : pas de session (harnais in-process) → sans objet, repli
 *    historique — même logique que getUtilisateurCourant (parité).
 *  - validateurId null : « le compte pourra-t-il valider sous sa propre
 *    identité ? » (simulation).
 * @returns {?{lie: boolean, motif: ?string}}
 */
function lienValidateurSession(validateurId, contexte) {
  const idCompte = contexte?.utilisateur ?? null;
  if (!idCompte) return null;
  const compte = db.get(
    'SELECT personnel_id FROM utilisateurs_app WHERE id = ?', [idCompte]);
  const personnelId = compte?.personnel_id ?? null;
  if (!personnelId) {
    return { lie: false, motif:
      'Validation refusée : votre compte n’est lié à aucune fiche du ' +
      'personnel — le validateur doit être la personne connectée ' +
      '(demandez à l’administrateur de lier votre compte).' };
  }
  if (validateurId != null && validateurId !== personnelId) {
    return { lie: false, motif:
      'Validation refusée : le validateur déclaré n’est pas la personne ' +
      'connectée — l’identité de session fait foi.' };
  }
  return { lie: true, motif: null };
}

/** Refuse (403, AVANT tout effet) un validateur qui n'est pas la session. */
function exigerValidateurDeSession(validateurId, contexte) {
  const lien = lienValidateurSession(validateurId, contexte);
  if (lien && !lien.lie) {
    const erreur = new Error(lien.motif);
    erreur.code = 403;
    throw erreur;
  }
}

/**
 * Lot C (C1) : état d'une signature RÉELLE pour le moteur de blocage —
 * true (une signature du rôle vaut pour la révision courante) | false
 * (aucune signature du rôle) | 'PERIMEE' (posée puis fiche modifiée).
 * Miroir exact de etatSignatureReelle du DemoStore.
 */
function etatSignatureReelle(mouvement, role) {
  const revision = mouvement.revisionBrouillon ?? 0;
  const duRole = db.all(
    `SELECT version_document FROM signatures_mouvement
     WHERE mouvement_id = ? AND role = ?`,
    [mouvement.id, role]);
  if (duRole.some((l) => (l.version_document ?? 0) === revision)) {
    return true;
  }
  return duRole.length > 0 ? 'PERIMEE' : false;
}

/**
 * Faits de la fiche pour le moteur de blocage OFFICIEL (conditions 6-11
 * et 14-15 de la liste) — MIROIR du cadreFicheOfficiel du DemoStore : tout
 * est précalculé ici, le moteur reste pur. Un intervenant désigné mais
 * introuvable est traité comme absent.
 */
function cadreFicheOfficiel(mouvement) {
  const jour = aujourdHui();
  const ligneMachine = mouvement.machineId
    ? db.get('SELECT * FROM machines WHERE id = ?', [mouvement.machineId])
    : null;
  const machine = ligneMachine
    ? mapping.versFront('machines', ligneMachine) : null;
  const fluideRef = lireFluide(mouvement.fluide ?? null);
  const ligneBouteille = mouvement.bouteilleSrcId
    ? db.get('SELECT * FROM bouteilles WHERE id = ?', [mouvement.bouteilleSrcId])
    : null;
  const bouteilleSrc = ligneBouteille
    ? mapping.versFront('bouteilles', ligneBouteille) : null;
  // Contrôle périodique requis : même moteur réglementaire que le
  // cadre 7 du CERFA (fréquence non nulle = machine soumise).
  let controlePeriodiqueRequis = false;
  if (machine && fluideRef) {
    // P1-1 (E1) : détection EFFECTIVE — sans effet sur ce booléen (les
    // deux fréquences sont non nulles), mais on lit la détection d'UNE
    // seule façon dans tout le logiciel. Miroir du DemoStore.
    controlePeriodiqueRequis = Boolean(frequenceControleMois(fluideRef,
      machine.chargeNominaleKg,
      equipement.detectionEffective(machine, mouvement.date ?? jour).compte,
      mouvement.date ?? jour));
  }
  const lignePersonne = mouvement.executeParId
    ? db.get('SELECT * FROM personnel WHERE id = ?', [mouvement.executeParId])
    : null;
  const personne = lignePersonne
    ? mapping.versFront('personnel', lignePersonne) : null;
  // P0-5 : habilitations qui COMPTENT (actives, non échues, régime encore
  // reconnu — transition 2008 : butoir de remise à niveau 12/03/2029) + fait
  // `aptitude` = verdict du moteur sur CE mouvement (opération = type,
  // fluide du mouvement, charge NOMINALE de la machine — celle des seuils
  // réglementaires). La fiche machine ne porte pas (encore) le caractère
  // « hermétiquement scellé » (P1-1) : défaut prudent = seuil 3 kg.
  // Filtres de date/régime en JS (habilitationReconnue), pas en SQL :
  // parité au caractère près avec le DemoStore.
  let intervenant = null;
  if (personne) {
    const reconnues = db.all(
      'SELECT * FROM habilitations WHERE personne_id = ? AND actif = 1',
      [personne.id])
      .map((l) => mapping.versFront('habilitations', l))
      .filter((h) => habilitationReconnue(h, jour));
    const nominale = machine ? machine.chargeNominaleKg : null;
    const verdict = reconnues.length === 0 ? null : verifierDroitIntervention({
      habilitations: reconnues.map((h) =>
        ({ regime: h.regime, categorie: h.categorie })),
      mentions: jetonsMentionsActives(db.all(
        'SELECT * FROM mentions_habilitation WHERE personne_id = ? AND actif = 1',
        [personne.id])
        .map((l) => mapping.versFront('mentions_habilitation', l))
        .filter((m) => !m.dateFin || m.dateFin >= jour)),
      operation: mouvement.type,
      fluide: mouvement.fluide ?? null,
      // Garde stricte : colonne nullable — un null deviendrait 0 via
      // Number() et fabriquerait un faux refus (leçon conseil-intervenant).
      chargeKg: typeof nominale === 'number' && Number.isFinite(nominale)
        && nominale > 0 ? nominale : null,
      // P1-1 (E4) — DETTE P0-5 SOLDÉE : la valeur était écrite en dur à
      // false faute de champ. Elle vient de la machine, et n'ouvre le
      // seuil élargi (6 kg) que si l'équipement est hermétiquement scellé
      // ET ÉTIQUETÉ. Miroir du DemoStore.
      hermetiqueScelle: machine ? equipement.hermetiqueOpposable(machine) : false
    });
    intervenant = {
      nom: `${personne.prenom} ${personne.nom}`,
      actif: personne.actif !== false,
      habilitationActive: reconnues.length > 0,
      aptitude: verdict
        ? { autorise: verdict.autorise, motif: verdict.motif }
        : null
    };
  }
  return {
    type: mouvement.type,
    machinePresente: Boolean(machine),
    fluide: mouvement.fluide ?? null,
    peseeAvantKg: mouvement.peseeAvantKg ?? null,
    peseeApresKg: mouvement.peseeApresKg ?? null,
    causePresente: Boolean(mouvement.causeMouvement &&
      String(mouvement.causeMouvement).trim()),
    controleStatut: mouvement.controle?.statutControle ?? 'SANS_OBJET',
    controlePeriodiqueRequis,
    // P1-1 (E2) — détection obligatoire (niveau haut) et non déclarée.
    // Miroir du DemoStore ; le serveur interroge son propre moteur.
    detectionObligatoireAbsente: Boolean(machine && fluideRef
      && equipement.detectionObligatoireDepuisNiveau(
        niveauCadre7(fluideRef, machine.chargeNominaleKg,
          mouvement.date ?? jour))
      && !equipement.detectionEffective(machine,
        mouvement.date ?? jour).declaree),
    fluideInflammable: Boolean(fluideRef?.classeSecurite &&
      fluideRef.classeSecurite !== 'A1'),
    // Q4 (L1b, 24/07 — corrigé par la revue adversariale du lot) — fait :
    // fluide HORS du périmètre fluoré selon la CLASSIFICATION MOTEUR
    // (fiche explicite prioritaire, repli sur la famille, inconnue = hors
    // périmètre). L'attribut brut « AUCUNE » seul était contournable : un
    // fluide CRÉÉ sans fiche (famille CO2/HC/NH3) passait, et vider la
    // fiche du R-744 levait le blocage. Miroir du DemoStore.
    fluideHorsPerimetreFluore: Boolean(fluideRef) &&
      categorieCadre7Fluide(fluideRef) === null,
    sourceVierge: bouteilleSrc?.etatFluide === 'VIERGE',
    prp: fluideRef?.gwpAr4 ?? null,
    signaturePresente: Boolean(mouvement.signatureDataUrl),
    technicienPresent: Boolean(mouvement.technicien &&
      String(mouvement.technicien).trim()),
    intervenant,
    // Lot C (C1) — conditions 14-15 : signatures réelles, tri-état.
    signatureTechnicienValide: etatSignatureReelle(mouvement, 'TECHNICIEN'),
    signatureDetenteurValide: etatSignatureReelle(mouvement, 'DETENTEUR')
  };
}

/**
 * Verdict OFFICIEL à un moment donné — le serveur évalue AUSSI les
 * conditions de poste (sauvegarde vérifiée récente) et de session
 * (validateur), que la démo répute sans objet (parité assumée, comme
 * les gardes de rôle).
 */
function evaluerOfficiel(moment, fiche, contexte, validateurId = null) {
  return evaluerBlocagesOfficiel({
    moment,
    etablissementMotifs: calculerPeutPasserEnOfficiel().motifs,
    sauvegarde: sauvegardeAuto.etatSauvegardeRecente(),
    validateur: lienValidateurSession(validateurId, contexte),
    verrouLivraison: VERROU_LIVRAISON,
    fiche
  });
}

/** BSFF par id (copie camelCase). */
function lireBsff(id) {
  return mapping.versFront('bsff',
    db.get('SELECT * FROM bsff WHERE id = ?', [id]));
}

// ------------------------------------------------------------
// Balance matière + inventaire (VAGUE 8). La VUE bilan_matiere reproduit
// le calcul du DemoStore (calculerBalanceMatiere) ; on la lit filtrée
// (établissement + année) et on MAPPE ses colonnes snake_case vers la forme
// contrat camelCase. Les valeurs sont ré-arrondies au gramme comme le
// DemoStore (la vue fait l'arithmétique brute, susceptible de dérive float).
// ------------------------------------------------------------

/** Upsert d'une ligne d'inventaire (année, fluide) — clé composite. */
function upsertInventaire(annee, fluide, stockReelKg, operateur) {
  amorcerEtablissement(); // SQL direct : ne passe pas par inserer()
  db.run(
    `INSERT INTO inventaires
       (etablissement_id, annee, fluide, stock_reel_kg, date_saisie, operateur)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(etablissement_id, annee, fluide) DO UPDATE SET
       stock_reel_kg = excluded.stock_reel_kg,
       date_saisie   = excluded.date_saisie,
       operateur     = excluded.operateur`,
    [ID_ETABLISSEMENT, annee, fluide, stockReelKg, aujourdHui(),
      operateur ?? null]);
}

/**
 * Brique ② (B7) : FIGE la photographie nominative d'une année — miroir
 * EXACT du DemoStore (mêmes règles : bouteilles présentes hors RETOURNEE,
 * fuites machines « non résolues » au sens de l'alerte). Upsert PAR ANNÉE
 * (DELETE + INSERT dans la transaction ambiante de muter()).
 */
function figerPhotoNominative(annee) {
  amorcerEtablissement();
  const datePhoto = aujourdHui();
  db.run('DELETE FROM inventaires_bouteilles WHERE etablissement_id = ? AND annee = ?',
    [ID_ETABLISSEMENT, annee]);
  db.run('DELETE FROM inventaires_fuites WHERE etablissement_id = ? AND annee = ?',
    [ID_ETABLISSEMENT, annee]);

  const bouteilles = HANDLERS.getBouteilles();
  for (const b of bouteilles) {
    if (b.statut === 'RETOURNEE') continue;
    // Champs recopiés en ?? null : une bouteille incomplète (vieil import)
    // est photographiée TELLE QUELLE, jamais bloquante — parité démo.
    inserer('inventaires_bouteilles', {
      etablissement_id: ID_ETABLISSEMENT,
      annee,
      bouteille_id: b.id,
      code_interne: b.code ?? null,
      numero_bouteille: b.numeroReel ?? null,
      type: b.type ?? null,
      fluide: b.fluide ?? null,
      etat_fluide: b.etatFluide ?? null,
      statut: b.statut ?? null,
      masse_nette_kg: b.masseNetteKg ?? null,
      proprietaire: b.proprietaire ?? null,
      date_photo: datePhoto
    });
  }

  // P1-1 (E5) : le sous-type est INDISPENSABLE ici — `mobileListe` exige un
  // sous-type de la liste fermée. Le sélectionner à part serait un piège
  // (colonne absente ⇒ jamais mobile) : on prend la ligne entière et on la
  // passe par le mapping, comme partout ailleurs.
  const machines = db.all(
    "SELECT * FROM machines WHERE statut = 'FUITE'")
    .map((l) => mapping.versFront('machines', l));
  for (const m of machines) {
    const statutFuite = estFuiteOuverte(controlesDeLaMachine(m.id),
      equipement.mobileListe(m));
    if (!statutFuite.ouverte && statutFuite.dateReparation) continue;
    const controleFuite = statutFuite.controleFuiteId
      ? controlesDeLaMachine(m.id)
        .find((c) => c.id === statutFuite.controleFuiteId)
      : null;
    inserer('inventaires_fuites', {
      etablissement_id: ID_ETABLISSEMENT,
      annee,
      machine_id: m.id,
      machine_label: m.designation ?? null,
      date_constat: controleFuite?.date ?? null,
      localisation: controleFuite?.localisationFuite ?? null,
      date_photo: datePhoto
    });
  }
}

/** La photo nominative d'une année (datePhoto null = jamais figée). */
function lirePhotoNominative(annee) {
  // Tri APPLICATIF (localeCompare) et non ORDER BY : la collation BINARY
  // de SQLite classe « Échangeur » après « Zebra » — la parité d'ordre
  // avec le DemoStore exige le même comparateur des deux côtés.
  const bouteilles = db.all(
    `SELECT * FROM inventaires_bouteilles
     WHERE etablissement_id = ? AND annee = ?`,
    [ID_ETABLISSEMENT, annee])
    .map((l) => mapping.versFront('inventaires_bouteilles', l))
    .sort((a, b) => String(a.code).localeCompare(String(b.code)));
  const fuites = db.all(
    `SELECT * FROM inventaires_fuites
     WHERE etablissement_id = ? AND annee = ?`,
    [ID_ETABLISSEMENT, annee])
    .map((l) => mapping.versFront('inventaires_fuites', l))
    .sort((a, b) => String(a.machineLabel ?? '')
      .localeCompare(String(b.machineLabel ?? '')));
  return {
    annee,
    // Une photo d'un parc VIDE reste datée (repli sur la date de saisie
    // de l'inventaire agrégé) : « zéro bouteille au 31/12 » est une
    // information d'audit, pas une absence de photo.
    datePhoto: bouteilles[0]?.datePhoto ?? fuites[0]?.datePhoto
      ?? db.get(
        `SELECT date_saisie AS d FROM inventaires
         WHERE etablissement_id = ? AND annee = ? LIMIT 1`,
        [ID_ETABLISSEMENT, annee])?.d
      ?? null,
    bouteilles,
    fuitesOuvertes: fuites
  };
}

/** La photo d'une année, ou null si elle n'a jamais été figée. */
function lirePhotoOuNull(annee) {
  const photo = lirePhotoNominative(annee);
  return photo.datePhoto === null ? null : photo;
}

/** Upsert d'une justification d'écart (année, fluide) — clé composite. */
function upsertJustification(annee, fluide, justification) {
  amorcerEtablissement(); // SQL direct : ne passe pas par inserer()
  db.run(
    `INSERT INTO justifications_ecarts
       (etablissement_id, annee, fluide, justification, date_justification)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(etablissement_id, annee, fluide) DO UPDATE SET
       justification      = excluded.justification,
       date_justification = excluded.date_justification`,
    [ID_ETABLISSEMENT, annee, fluide, justification, aujourdHui()]);
}

/**
 * Balance matière annuelle : lit la VUE bilan_matiere (filtrée établissement
 * + année), mappe vers la forme contrat camelCase, ré-arrondit, trie par
 * fluide. Miroir exact de calculerBalanceMatiere du DemoStore.
 */
function calculerBalanceMatiere(annee) {
  const lignesSql = db.all(
    `SELECT * FROM bilan_matiere
     WHERE etablissement_id = ? AND annee = ?`,
    [ID_ETABLISSEMENT, annee]);
  const lignes = lignesSql.map((r) => {
    const stockReelKg = r.stock_reel_kg == null ? null
      : arrondir(Number(r.stock_reel_kg));
    const ecartKg = r.ecart_kg == null ? null : arrondir(Number(r.ecart_kg));
    return {
      fluide: r.fluide,
      stockInitialNeufKg: arrondir(Number(r.stock_initial_neuf_kg) || 0),
      stockInitialRecupKg: arrondir(Number(r.stock_initial_recupere_kg) || 0),
      achatsKg: arrondir(Number(r.achats_kg) || 0),
      recuperationsKg: arrondir(Number(r.recuperations_kg) || 0),
      chargesKg: arrondir(Number(r.charges_kg) || 0),
      cessionsKg: arrondir(Number(r.cessions_kg) || 0),
      retoursFournisseurKg: arrondir(Number(r.retours_fournisseur_kg) || 0),
      destructionsKg: arrondir(Number(r.destructions_kg) || 0),
      stockTheoriqueKg: arrondir(Number(r.stock_theorique_kg) || 0),
      stockReelKg,
      ecartKg,
      justification: r.justification ?? null
    };
  }).sort((a, b) => a.fluide.localeCompare(b.fluide));
  return { annee, lignes };
}

/**
 * Écarts d'inventaire au-delà du seuil et NON justifiés, sur toutes les
 * années inventoriées. Reprend ecartsNonJustifies du DemoStore.
 */
function ecartsNonJustifies() {
  // Années dans l'ordre de PREMIÈRE saisie d'inventaire (rowid), comme le
  // DemoStore ([...new Set(inventaires.map(annee))]) — jamais DISTINCT,
  // dont l'ordre n'est pas garanti.
  const annees = [...new Set(db.all(
    `SELECT annee FROM inventaires WHERE etablissement_id = ?
     ORDER BY rowid`,
    [ID_ETABLISSEMENT]).map((r) => r.annee))];
  const resultat = [];
  for (const annee of annees) {
    for (const l of calculerBalanceMatiere(annee).lignes) {
      if (l.ecartKg !== null && Math.abs(l.ecartKg) > SEUIL_ECART_KG &&
          !l.justification) {
        resultat.push({ annee, fluide: l.fluide, ecartKg: l.ecartKg });
      }
    }
  }
  return resultat;
}

// ------------------------------------------------------------
// Synthèses (VAGUE 8) — stats, années, bilan, mode officiel.
// Reprennent getStats / getAnneesDisponibles / getBilan /
// peutPasserEnOfficiel du DemoStore (formes et calculs exacts).
// ------------------------------------------------------------

/** Machines comptant dans le parc (tout sauf démantelées) — camelCase. */
function machinesEnParc() {
  return db.all(`SELECT * FROM machines WHERE statut <> 'DEMANTELEE'`)
    .map((ligne) => mapping.versFront('machines', ligne));
}

/** Index des fluides du référentiel par code → objet camelCase. */
function indexFluides() {
  const index = new Map();
  for (const ligne of db.all('SELECT * FROM fluides')) {
    index.set(ligne.code, mapping.versFront('fluides', ligne));
  }
  return index;
}

/** Tableau de bord : forme EXACTE du DemoStore (getStats). */
function calculerStats() {
  const fluides = indexFluides();
  const parc = machinesEnParc();

  let chargeParcKg = 0;
  let teqCo2Parc = 0;
  const parFluide = new Map();
  for (const m of parc) {
    chargeParcKg += m.chargeActuelleKg;
    const gwp = fluides.get(m.fluide)?.gwpAr4 ?? 0;
    teqCo2Parc += teqCO2(m.chargeActuelleKg, gwp);
    const cumul = parFluide.get(m.fluide) || 0;
    parFluide.set(m.fluide, cumul + m.chargeActuelleKg);
  }
  const chargeParFluide = [...parFluide.entries()]
    .map(([fluide, kgEnParc]) => ({
      fluide,
      kgEnParc,
      teqCo2: teqCO2(kgEnParc, fluides.get(fluide)?.gwpAr4 ?? 0)
    }))
    .sort((a, b) => b.kgEnParc - a.kgEnParc);

  const bouteilles = db.all('SELECT * FROM bouteilles')
    .map((ligne) => mapping.versFront('bouteilles', ligne));
  const stockBouteillesKg = bouteilles
    .reduce((somme, b) => somme + b.masseNetteKg, 0);

  const controles = db.all('SELECT resultat FROM controles');
  const nbControles = controles.length;
  const nbConformes = controles
    .filter((c) => c.resultat === 'CONFORME').length;
  const tauxConformitePct = nbControles
    ? Math.round((nbConformes / nbControles) * 100)
    : 100;

  const nbOperateursActifs = db.get(
    `SELECT count(*) AS n FROM personnel WHERE actif = 1`).n;

  const mouvements = db.all('SELECT * FROM mouvements')
    .map((ligne) => reconstituerMouvement(ligne));
  const mouvementsEffectifs = mouvements.filter((mv) =>
    (mv.statut === 'VALIDE' || mv.statut === 'ANNULE') &&
    Number.isFinite(mv.quantiteKg));
  // Un TRANSFERT est interne au stock : ni charge, ni récupération dans les
  // flux mensuels — aligné sur calculerBalanceMatiere/calculerBilan (IM-12).
  // nbFiches/nbMouvements comptent TOUS les mouvements (transfert inclus).
  const mouvementsFlux = mouvementsEffectifs.filter(
    (mv) => mv.type !== 'TRANSFERT');

  // IM-10 : flux mensuels sur une fenêtre GLISSANTE de 6 mois.
  let dateMax = '';
  for (const mv of mouvementsEffectifs) {
    if (mv.date > dateMax) dateMax = mv.date;
  }
  if (!dateMax) dateMax = aujourdHui();
  const [anneeFin, moisFin] = dateMax.split('-').map(Number);
  const fluxMensuels = [];
  for (let recul = 5; recul >= 0; recul -= 1) {
    const total = anneeFin * 12 + (moisFin - 1) - recul;
    const annee = Math.floor(total / 12);
    const mois = (total % 12) + 1;
    const prefixe = `${annee}-${String(mois).padStart(2, '0')}`;
    let chargeKg = 0;
    let recupKg = 0;
    for (const mv of mouvementsFlux) {
      if (!mv.date.startsWith(prefixe)) continue;
      if (mv.quantiteKg >= 0) chargeKg += mv.quantiteKg;
      else recupKg += Math.abs(mv.quantiteKg);
    }
    fluxMensuels.push(
      { mois: LIBELLES_MOIS[mois - 1], annee, chargeKg, recupKg });
  }

  return {
    nbMachines: parc.filter((m) => m.statut !== 'ARRETEE').length,
    chargeParcKg,
    stockBouteillesKg,
    nbBouteilles: bouteilles.length,
    teqCo2Parc,
    nbCerfa: mouvements.filter((mv) => mv.cerfaNumero).length,
    nbFiches: mouvements.length,
    nbMouvements: mouvements.length,
    nbControles,
    tauxConformitePct,
    nbFuites: db.get(
      `SELECT count(*) AS n FROM machines WHERE statut = 'FUITE'`).n,
    nbOperateursActifs,
    chargeParFluide,
    fluxMensuels
  };
}

/**
 * Années proposables : années présentes dans les données (mouvements,
 * contrôles, BSFF, retours, inventaires) ∪ dernière écriture du journal ∪
 * année courante, triées décroissantes. Reprend getAnneesDisponibles du
 * DemoStore (2026 remplacé par l'année courante : monde local non figé).
 */
function anneesDisponibles() {
  const annees = new Set([new Date().getFullYear()]);
  const ajouterAnneeDe = (iso) => {
    const annee = Number(String(iso || '').slice(0, 4));
    if (Number.isInteger(annee) && annee > 2000) annees.add(annee);
  };
  for (const r of db.all('SELECT date_mouvement AS d FROM mouvements')) {
    ajouterAnneeDe(r.d);
  }
  for (const r of db.all('SELECT date_controle AS d FROM controles')) {
    ajouterAnneeDe(r.d);
  }
  for (const r of db.all('SELECT date_remise AS d FROM bsff')) {
    ajouterAnneeDe(r.d);
  }
  for (const r of db.all('SELECT date_retour AS d FROM retours_fournisseur')) {
    ajouterAnneeDe(r.d);
  }
  for (const r of db.all('SELECT DISTINCT annee FROM inventaires')) {
    if (Number.isInteger(r.annee)) annees.add(r.annee);
  }
  const derniere = db.get(
    'SELECT date_heure AS d FROM journal_audit ORDER BY id DESC LIMIT 1');
  if (derniere) ajouterAnneeDe(derniere.d);
  return [...annees].sort((a, b) => b - a);
}

/** Bilan annuel calculé depuis les mouvements figés + le parc courant. */
function calculerBilan(annee) {
  const fluides = indexFluides();
  const prefixe = `${annee}-`;
  const mouvements = db.all('SELECT * FROM mouvements')
    .map((ligne) => reconstituerMouvement(ligne));
  // Un TRANSFERT est un mouvement INTERNE au stock (bouteille → bouteille) :
  // ni charge, ni récupération — aligné sur calculerBalanceMatiere (IM-12).
  const mouvementsAnnee = mouvements.filter((mv) =>
    (mv.date || '').startsWith(prefixe) &&
    (mv.statut === 'VALIDE' || mv.statut === 'ANNULE') &&
    Number.isFinite(mv.quantiteKg) && mv.type !== 'TRANSFERT');

  const parFluide = new Map();
  const ligneVide = () => ({ chargeKg: 0, recupereKg: 0, enParcKg: 0 });
  for (const mv of mouvementsAnnee) {
    if (!parFluide.has(mv.fluide)) parFluide.set(mv.fluide, ligneVide());
    const ligne = parFluide.get(mv.fluide);
    if (mv.quantiteKg >= 0) ligne.chargeKg += mv.quantiteKg;
    else ligne.recupereKg += Math.abs(mv.quantiteKg);
  }

  for (const m of machinesEnParc()) {
    if (!parFluide.has(m.fluide)) parFluide.set(m.fluide, ligneVide());
    parFluide.get(m.fluide).enParcKg += m.chargeActuelleKg;
  }

  const lignes = [...parFluide.entries()]
    .map(([fluide, cumuls]) => {
      const ref = fluides.get(fluide);
      const gwpAr4 = ref?.gwpAr4 ?? 0;
      return {
        fluide,
        famille: ref?.famille ?? '—',
        gwpAr4,
        chargeKg: cumuls.chargeKg,
        recupereKg: cumuls.recupereKg,
        enParcKg: cumuls.enParcKg,
        teqCo2: teqCO2(cumuls.enParcKg, gwpAr4)
      };
    })
    .sort((a, b) => b.enParcKg - a.enParcKg);

  return {
    annee,
    totalChargeKg: lignes.reduce((s, l) => s + l.chargeKg, 0),
    totalRecupereKg: lignes.reduce((s, l) => s + l.recupereKg, 0),
    lignes
  };
}

/**
 * 4 vérifs bloquantes avant le mode OFFICIEL : capacité non expirée, ≥ 1
 * balance conforme, ≥ 1 détecteur conforme, aucun écart de balance non
 * justifié. Reprend peutPasserEnOfficiel du DemoStore (motifs mot pour mot).
 */
function calculerPeutPasserEnOfficiel() {
  const motifs = [];
  const jour = aujourdHui();
  const etab = HANDLERS.getEtablissement();

  if (!etab.numAttestationCapacite) {
    motifs.push('Aucune attestation de capacité renseignée pour ' +
      'l’établissement.');
  } else if (etab.dateEcheanceCapacite &&
             etab.dateEcheanceCapacite < jour) {
    motifs.push('Attestation de capacité expirée depuis le ' +
      `${fmtDate(etab.dateEcheanceCapacite)}.`);
  }

  const outillage = db.all('SELECT * FROM outillage')
    .map((ligne) => mapping.versFront('outillage', ligne));
  const statuts = outillage.map((o) => ({
    typeOutil: o.typeOutil,
    statut: calculerStatutOutil(o, jour)
  }));
  if (!statuts.some((o) => o.typeOutil === 'BALANCE' &&
                           o.statut === 'CONFORME')) {
    motifs.push('Aucune balance conforme (vérification à jour requise).');
  }
  if (!statuts.some((o) => o.typeOutil === 'DETECTEUR' &&
                           o.statut === 'CONFORME')) {
    motifs.push('Aucun détecteur de fuite conforme (étalonnage à jour ' +
      'requis).');
  }

  for (const ecart of ecartsNonJustifies()) {
    motifs.push(`Écart de balance matière non justifié : ${ecart.fluide} ` +
      `(${ecart.annee}, ${fmtKgSigne(ecart.ecartKg)}).`);
  }

  return { ok: motifs.length === 0, motifs };
}

// ------------------------------------------------------------
// Dispatcher
// ------------------------------------------------------------

/** Ensemble des méthodes reconnues (celles ayant un handler). */
const METHODES = Object.freeze([...Object.keys(HANDLERS)]);

/**
 * Applique la garde de rôle d'une méthode de mutation. Lève un Error
 * marqué `.code = 403` si le rôle de session n'est pas habilité — AVANT
 * tout effet. Les lectures ne sont pas restreintes en E3.
 */
function garderRole(methode, contexte) {
  // Mutations d'abord, puis lectures SENSIBLES (lot E ① : export RGPD).
  const roles = ROLES_MUTATION[methode] || ROLES_LECTURE_SENSIBLE[methode];
  if (!roles) return; // lecture ordinaire : aucune restriction
  const role = contexte?.role ?? null;
  if (!roles.includes(role)) {
    const erreur = new Error(
      `Action « ${methode} » réservée aux rôles habilités ` +
      `(${roles.join(', ')}) — rôle courant : ${role ?? 'aucun'}.`);
    erreur.code = 403;
    throw erreur;
  }
}

/**
 * Point d'entrée unique. Résout la méthode, applique la garde de rôle,
 * exécute le handler. Retourne le résultat camelCase (copie fraîche).
 * Toute violation métier / rôle lève un Error (message français) ; le
 * routeur serveur l'enveloppe en { ok:false, erreur, code }.
 * @param {string} methode
 * @param {object} params
 * @param {{role?: string, utilisateurId?: string}} [contexte]
 */
function appeler(methode, params = {}, contexte = {}) {
  const handler = HANDLERS[methode];
  if (!handler) {
    const erreur = new Error(
      `Méthode « ${methode} » non encore implémentée (chantier V9-E3).`);
    erreur.code = 501;
    throw erreur;
  }
  garderRole(methode, contexte);
  // La session de CET appel, pour le journal chaîné (cf. journaliser).
  // Remise à null dans tous les cas : sans ce `finally`, une session
  // « fuirait » sur l'appel suivant — y compris un appel sans session.
  sessionCourante = contexte ?? null;
  try {
    const resultat = handler(params ?? {}, contexte ?? {});
    // Condition 6 (sauvegardes automatiques) : après une écriture SCELLÉE
    // réussie, un SNAPSHOT débouncé — filet anti-erreur-humaine. Placé ICI
    // (hors transaction : muter() est déjà retombé) et JAMAIS bloquant
    // (best-effort dans le module) : l'écriture est acquise quoi qu'il
    // arrive à la sauvegarde.
    if (methode === 'validerMouvement'
      || methode === 'annulerParContreEcriture') {
      sauvegardeAuto.snapshotApresEcritureScellee();
      // Lot D (scellement externe) : le témoin quotidien suit chaque
      // écriture scellée — mêmes règles (hors transaction, jamais bloquant).
      scellementExterne.temoinApresEcritureScellee();
    }
    return resultat;
  } finally {
    sessionCourante = null;
  }
}

module.exports = {
  ID_ETABLISSEMENT,
  ROLES_MUTATION,
  METHODES,
  muter,
  appeler,
  // Lot C (C3) : exportés pour le filet de test SEULEMENT (la validation
  // officielle réelle reste fermée par le verrou de livraison jusqu'à C5).
  conserverPdfFinal,
  ecrireTemoinsPdfFinal,
  verifierPdfFinalConserve,
  verifierTousPdfFinalConserves,
  // Lot C (C3b) : appelée au démarrage par serveur.js (et par le test).
  reecrireTemoinsPdfFinalManquants,
  // Lot E2 : rattrapage de la purge disque du coffre (démarrage serveur.js).
  rejouerPurgeCoffre
};
