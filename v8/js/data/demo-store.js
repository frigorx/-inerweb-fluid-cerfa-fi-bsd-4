// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — magasin de données de démonstration
// Phase A : lectures + statistiques calculées.
// Phase B : registre vivant (mutations, cycle de vie des
// mouvements, chaîne d'intégrité SHA-256, journal d'audit).
// Persistance localStorage (clé 'inerweb-fluide-v8-demo'),
// optionnelle : fonctionne aussi SANS localStorage (Node).
// Toutes les méthodes sont ASYNC et retournent des COPIES.
// Toute violation de règle métier → throw Error(message français).
// ============================================================

import { DEMO } from './demo-donnees.js';
import { teqCO2, fmtDate, fmtNombre, fmtKgSigne, genId, hasherEcriture,
  genererCodePublic, empreinteListeTriee, chaineCanoniqueSignature }
  from '../core/utils.js';
// IM-1 : fréquence réglementaire des contrôles d'étanchéité —
// logique UNIQUE partagée avec le cadre 7 du CERFA (aucun doublon).
import { evaluerControle } from './reglementation-fluides.js';
// CM-2 : avoir de fluide par machine d'origine (DÉRIVÉ des mouvements) —
// signale une réintroduction au-delà du récupéré. Le serveur en tient un
// MIROIR EXACT (api.js).
import { avoirParMachineOrigine } from './avoir-origine.js';
// Sentinelle d'alertes persistées : diff pur + formatage (module partagé
// avec le test unitaire ; le serveur en tient un miroir exact).
import { normaliserCodeMachine, validerCodeMachine } from './code-machine.js';
// Lot E ① : export RGPD des données d'une personne (module pur partagé).
import { assemblerExportPersonne } from './export-personne.js';
// Lot E2 : coffre des identités — règles pures partagées. La Démo SIMULE le
// chiffrement (enveloppes balisées PREFIXE_SIMULATION, phrase d'exercice en
// mémoire de session UNIQUEMENT — jamais persistée, ni même un dérivé) :
// mêmes flux, mêmes refus, mêmes messages que le serveur réel.
import { PREFIXE_SIMULATION, MSG_CODE_INCORRECT, MSG_FICHE_AU_COFFRE,
  MSG_COFFRE_INEXISTANT, MSG_DEJA_AU_COFFRE, MSG_PAS_AU_COFFRE,
  MSG_MOTIF_OBLIGATOIRE, MSG_PHRASE_TROP_COURTE, LONGUEUR_MIN_PHRASE_COFFRE,
  estFicheEchue, libellePseudonyme, assemblerIdentite as assemblerIdentiteCoffre,
  pseudonymiserFiche, restaurerIdentite } from './coffre-identites.js';
import { calculerTransitions, formaterEpisode, comparerEpisodes, estOuvert }
  from './sentinelle.js';
// Habilitations F-Gas : référentiels + tri (module pur, miroir serveur).
// P0-5 : + moteur d'aptitude pour le fait `aptitude` du cadre Officiel
// (verifierDroitIntervention, habilitationReconnue, jetonsMentionsActives).
import { REGIMES, CATEGORIES_2008, CATEGORIES_2025, comparerHabilitations,
  categorieCoherente, FLUIDES_MENTION, comparerMentions,
  verifierDroitIntervention, habilitationReconnue, jetonsMentionsActives }
  from './habilitations.js';
// Signature binaire réelle des pièces jointes (audit-proof) : le contenu doit
// concorder avec le type déclaré, jamais le MIME annoncé seul (miroir serveur).
import { signatureConcordeAvecMime, MSG_SIGNATURE_PJ, base64VersOctets,
  versBase64 } from './contenu-pj.js';
import { ROLES_SIGNATURE, declarationSignature, verifierImageSignature,
  MSG_TRACE_ABSENT, MSG_PAS_PNG } from './signatures-mouvement.js';
// Blocage dur du mode OFFICIEL (lot B, condition 2 du plan audit-proof) :
// moteur PUR de la liste docs/CONDITIONS-BLOCANTES-OFFICIEL.md (miroir serveur).
import { evaluerBlocagesOfficiel, messageRefusOfficiel, VERROU_LIVRAISON,
  MSG_CONTROLE_DIRECT_OFFICIEL } from './blocage-officiel.js';
// PDF final conservé à la validation OFFICIELLE (lot C, brique C3) :
// contrôles et messages canoniques partagés (miroir serveur).
import { verifierOctetsPdfFinal, nomFichierPdfFinal, CATEGORIE_PDF_FINAL,
  MSG_PDF_FINAL_MANQUANT, MSG_PDF_FINAL_HORS_OFFICIEL,
  MSG_PDF_FINAL_TRANSFERT, pdfFinalAttendu } from './pdf-final.js';

const CLE_STOCKAGE = 'inerweb-fluide-v8-demo';

/** Base IndexedDB des contenus de pièces jointes (repli mémoire sous Node). */
const NOM_BASE_PJ = 'inerweb-fluide-v8-pj';

/** Taille maximale d'une pièce jointe : 5 Mo. */
const PJ_TAILLE_MAX = 5 * 1024 * 1024;

/** Seuil au-delà duquel un écart de balance matière doit être justifié. */
const SEUIL_ECART_KG = 0.01;

/** IM-4 : tolérance de charge résiduelle pour démanteler (± 0,05 kg). */
const TOLERANCE_CHARGE_RESIDUELLE_KG = 0.05;

/**
 * CF-5 : tolérance flottante pour considérer une bouteille comme vide
 * après un mouvement (même seuil que le reste du fichier, cf. BSFF).
 */
const SEUIL_BOUTEILLE_VIDE_KG = 1e-9;

/**
 * IM-19 : types MIME acceptés pour les pièces jointes — MÊME liste
 * blanche que le composant d'interface (SVG exclu : risque XSS).
 */
const PJ_TYPES_MIME = ['application/pdf', 'image/png', 'image/jpeg',
  'image/webp'];

/** Types de personnes du registre du personnel (SPEC §5.2). */
const TYPES_PERSONNE = ['ENSEIGNANT', 'ELEVE', 'SALARIE', 'SOUS_TRAITANT',
  'INTERVENANT_EXT'];

/** Types d'outillage réglementaire (SPEC §5.3). */
const TYPES_OUTIL = ['STATION_RECUPERATION', 'STATION_CHARGE', 'BALANCE',
  'DETECTEUR', 'POMPE_A_VIDE', 'MANIFOLD', 'THERMOMETRE', 'BOUTEILLE_RECUP',
  'FLEXIBLE', 'EPI', 'AUTRE'];

/** Activités réglementées (attestation de capacité et d'aptitude). */
const ACTIVITES_REGLEMENTEES = ['MISE_EN_SERVICE', 'MAINTENANCE', 'CONTROLE',
  'RECUPERATION', 'DEMANTELEMENT'];

/** Catégories d'attestation (grilles 2008 et 2025). */
const CATEGORIES_ATTESTATION = ['I', 'II', 'III', 'IV'];

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

/** Types de mouvements admis par le registre (P7-a : + contrôles autonomes). */
const TYPES_MOUVEMENT = [
  'CHARGE_APPOINT',
  'MISE_EN_SERVICE',
  'RECUPERATION_MAINTENANCE',
  'RECUPERATION_DEMANTELEMENT',
  'TRANSFERT',
  'CONTROLE_PERIODIQUE',
  'CONTROLE_NON_PERIODIQUE'
];

/** Rôles autorisés à VALIDER une écriture (jamais un élève). */
const ROLES_VALIDEURS = ['REFERENT', 'ENSEIGNANT', 'ADMIN'];

/** Message unique d'écriture figée (contrat Phase B). */
const MSG_ECRITURE_FIGEE =
  'Écriture validée : correction uniquement par contre-écriture.';

/**
 * R3c : message métier UNIQUE opposé au complément de gaz (CHARGE_APPOINT)
 * sur une machine à fuite OUVERTE (fuite déclarée sans réparation tracée
 * postérieure) — repris mot pour mot par demo-store.js et api.js.
 */
const MSG_FUITE_OUVERTE =
  'Complément de gaz impossible : cette machine a une fuite déclarée non ' +
  'réparée. Tracez la réparation (date, nature, réparateur) puis déclarez ' +
  'un nouveau contrôle d’étanchéité avant de recharger.';

/** Copie profonde (structuredClone natif, repli JSON). */
function copier(objet) {
  if (typeof structuredClone === 'function') return structuredClone(objet);
  return JSON.parse(JSON.stringify(objet));
}

/** Arrondi métier au gramme (évite la dérive des flottants). */
function arrondir(valeur) {
  return Math.round(valeur * 1000) / 1000;
}

/** Date du jour au format ISO (AAAA-MM-JJ). */
function aujourdHui() {
  const d = new Date();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/** Ajoute (ou retire) des jours à une date ISO, sans fuseau horaire. */
function ajouterJours(iso, nbJours) {
  const [annee, mois, jour] = iso.split('-').map(Number);
  const d = new Date(annee, mois - 1, jour + nbJours);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/**
 * IM-1 : ajoute des mois à une date ISO, sans fuseau horaire.
 * Un débordement de fin de mois est ramené au dernier jour du mois
 * cible (31/01 + 1 mois → 28 ou 29/02, jamais le 3 mars).
 */
function ajouterMois(iso, nbMois) {
  const [annee, mois, jour] = iso.split('-').map(Number);
  const d = new Date(annee, mois - 1 + nbMois, jour);
  if (d.getDate() !== jour) d.setDate(0);
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

/**
 * Statut d'un outil RECALCULÉ depuis sa prochaine échéance :
 * EXPIRE si dépassée, A_VERIFIER si à moins de 30 jours (ou sans
 * échéance connue), CONFORME sinon. Un outil réformé
 * (HORS_SERVICE) le reste quelle que soit son échéance.
 */
function calculerStatutOutil(outil, jour) {
  if (outil.statut === 'HORS_SERVICE') return 'HORS_SERVICE';
  if (!outil.prochaineEcheance) return 'A_VERIFIER';
  if (outil.prochaineEcheance < jour) return 'EXPIRE';
  if (outil.prochaineEcheance <= ajouterJours(jour, 30)) return 'A_VERIFIER';
  return 'CONFORME';
}

/**
 * Corrections réglementaires conditionnelles des PRP — MIROIR EXACT du
 * contenu de la migration 22 côté serveur (corrigerPrpFgas3 de
 * migrations.js, avis du 16/07/2026, FIGÉ avec elle) : appliquées à une
 * sauvegarde localStorage ANTÉRIEURE au lot et à l'import d'un export
 * ancien. N'écrase JAMAIS une valeur réellement ajustée (conditions
 * d'égalité). Modifie les objets reçus.
 */
function corrigerPrpFgas3(fluides) {
  for (const f of fluides ?? []) {
    if (f.code === 'R-1234yf' && (f.gwpAr4 === 1 || f.gwpAr4 === 4)) {
      f.gwpAr4 = 0.501;
    }
    if (f.code === 'R-290' && f.gwpAr4 === 3) f.gwpAr4 = 0.02;
    if (f.code === 'R-1234yf' && f.gwpAr4 === 0.501) {
      f.sourcePrp = 'annexe règl. UE 2024/573 (F-Gas III)';
    }
    if (f.code === 'R-290' && f.gwpAr4 === 0.02) {
      f.sourcePrp = 'AR6 GIEC (réf. règl. UE 2024/573)';
    }
    if (f.code === 'R-455A' && f.gwpAr4 === 148) {
      f.sourcePrp = 'AR4 — 148 conservatoire (réserve DGPR)';
    }
  }
}

/** Lit la sauvegarde locale si elle existe et semble valide, sinon null. */
function chargerDepuisStockage() {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (!brut) return null;
    const donnees = JSON.parse(brut);
    if (!estValide(donnees)) return null;
    // Monde persisté AVANT le lot du 16/07 : anciens PRP corrigés
    // (conditionnel — un PRP ajusté par l'utilisateur reste intact).
    corrigerPrpFgas3(donnees.fluides);
    return donnees;
  } catch {
    // localStorage absent (Node) ou JSON corrompu → repartir du monde de démo
    return null;
  }
}

/** Écrit l'état courant dans localStorage (silencieux si indisponible). */
function persister(donnees) {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(donnees));
  } catch {
    // Persistance optionnelle : rien à faire si le stockage est indisponible
  }
}

/** Validation basique d'une structure de données importée. */
function estValide(donnees) {
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
    Array.isArray(donnees.alertes)
  );
}

/**
 * Écritures figées (VALIDE/ANNULE) d'une liste de mouvements,
 * triées dans l'ordre de validation (chaîne d'intégrité).
 */
function ecrituresFigees(mouvements) {
  return mouvements
    .filter((mv) => (mv.statut === 'VALIDE' || mv.statut === 'ANNULE') &&
      Number.isFinite(mv.ordreValidation))
    .sort((a, b) => a.ordreValidation - b.ordreValidation);
}

/**
 * Vérifie la chaîne de hash SHA-256 d'une liste de mouvements
 * (CR-5 : utilisable sur les données candidates d'un import AVANT
 * de les adopter, comme sur les données en place).
 * @returns {Promise<{ok: boolean, casseA: string|null}>}
 */
async function verifierChaineMouvements(mouvements) {
  let precedent = null;
  for (const mouvement of ecrituresFigees(mouvements)) {
    if ((mouvement.hashPrecedent ?? null) !== precedent) {
      return { ok: false, casseA: mouvement.numero };
    }
    const attendu = await hasherEcriture(mouvement, precedent);
    if (attendu !== mouvement.hashEcriture) {
      return { ok: false, casseA: mouvement.numero };
    }
    precedent = mouvement.hashEcriture;
  }
  return { ok: true, casseA: null };
}

/**
 * Invariants MÉTIER d'un jeu de données candidat (import JSON ou
 * sauvegarde locale) — CR-5 : masses et charges positives et finies,
 * écritures figées porteuses de leur empreinte et de leur ordre,
 * quantités finies.
 * @returns {string|null} description du premier problème, ou null si sain
 */
function verifierInvariantsDonnees(candidat) {
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
  // Une sauvegarde antérieure à la Phase B (aucune empreinte nulle part)
  // reste acceptée : la chaîne sera amorcée. En revanche, dès qu'UNE
  // écriture porte une empreinte, TOUTES doivent en porter une valide.
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
  // Miroir EXACT du serveur (verifierInvariantsDonneesCandidat).
  for (const c of candidat.controles ?? []) {
    if (c && c.mode === 'OFFICIEL' && !c.mouvementId) {
      return `contrôle ${c.numero ?? c.id ?? '?'} : ` +
        'OFFICIEL sans mouvement lié (orphelin)';
    }
  }
  // Habilitations et mentions (chantier B2) : refuser un registre importé
  // incohérent, à l'IDENTIQUE du serveur — CHECK + FK + PRIMARY KEY que
  // SQLite applique, ET forme canonique des DROITS : un `actif` absent
  // serait actif par DÉFAUT côté SQL mais inactif côté démo (constat
  // IMPORTANT 1 de la revue : droits divergents sur le même fichier).
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
  // Outils d'intervention (brique produit n°2) : chaque lien référence un
  // mouvement ET un outil existants, jamais deux fois le même couple.
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
  // L'ENTRÉE, avant que la donnée n'existe. Règle identique côté serveur.
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

/** Libellés courts des mois pour les flux mensuels. */
const LIBELLES_MOIS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin',
  'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

// ------------------------------------------------------------
// Contenus des pièces jointes : IndexedDB (navigateur), avec
// repli en mémoire (Map) sous Node — les tests passent sans DOM.
// Les MÉTADONNÉES vivent dans les données du store ; seuls les
// octets des fichiers sont rangés ici.
// ------------------------------------------------------------

const pjContenusMemoire = new Map();

/** Ouvre (et crée au besoin) la base IndexedDB des pièces jointes. */
function ouvrirBasePj() {
  return new Promise((resoudre, rejeter) => {
    const requete = indexedDB.open(NOM_BASE_PJ, 1);
    requete.onupgradeneeded = () => {
      if (!requete.result.objectStoreNames.contains('contenus')) {
        requete.result.createObjectStore('contenus');
      }
    };
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => rejeter(requete.error);
  });
}

/** Exécute une opération sur le magasin IndexedDB des contenus. */
async function transactionPj(mode, operation) {
  const base = await ouvrirBasePj();
  return new Promise((resoudre, rejeter) => {
    const transaction = base.transaction('contenus', mode);
    const requete = operation(transaction.objectStore('contenus'));
    transaction.oncomplete = () => { base.close(); resoudre(requete?.result); };
    transaction.onerror = () => { base.close(); rejeter(transaction.error); };
  });
}

async function ecrireContenuPj(id, contenu) {
  if (typeof indexedDB === 'undefined') {
    pjContenusMemoire.set(id, contenu);
    return;
  }
  try {
    await transactionPj('readwrite', (magasin) => magasin.put(contenu, id));
  } catch {
    pjContenusMemoire.set(id, contenu);
  }
}

async function lireContenuPj(id) {
  if (typeof indexedDB !== 'undefined') {
    try {
      const contenu = await transactionPj('readonly', (magasin) => magasin.get(id));
      if (contenu !== undefined) return contenu;
    } catch {
      // IndexedDB indisponible : repli mémoire ci-dessous
    }
  }
  return pjContenusMemoire.get(id);
}

async function supprimerContenuPj(id) {
  pjContenusMemoire.delete(id);
  if (typeof indexedDB === 'undefined') return;
  try {
    await transactionPj('readwrite', (magasin) => magasin.delete(id));
  } catch {
    // Contenu déjà absent : rien d'autre à faire
  }
}

/** Convertit un contenu de pièce jointe (blob | base64) en octets. */
async function octetsDepuis(contenu) {
  if (typeof Blob !== 'undefined' && contenu instanceof Blob) {
    return new Uint8Array(await contenu.arrayBuffer());
  }
  if (contenu instanceof Uint8Array) return contenu;
  if (contenu instanceof ArrayBuffer) return new Uint8Array(contenu);
  if (typeof contenu === 'string') {
    const base64 = contenu.replace(/^data:[^;]*;base64,/, '');
    let binaire;
    try {
      binaire = atob(base64);
    } catch {
      throw new Error('Contenu base64 illisible pour la pièce jointe.');
    }
    const octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i += 1) {
      octets[i] = binaire.charCodeAt(i);
    }
    return octets;
  }
  throw new Error('Contenu de pièce jointe attendu : blob ou base64.');
}

/** Empreinte SHA-256 hexadécimale d'un contenu de fichier. */
async function hasherOctets(octets) {
  let subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    const { webcrypto } = await import('node:crypto');
    subtle = webcrypto.subtle;
  }
  const empreinte = await subtle.digest('SHA-256', octets);
  return [...new Uint8Array(empreinte)]
    .map((octet) => octet.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Lot C (C2) : forme canonique des signatures d'une LISTE (camelCase) puis
 * empreinte triée — sert au SCELLEMENT (gel de hashSignatures) ET au
 * recomptage à l'IMPORT (une signature retouchée dans le JSON = forgée).
 * L'image est réduite à l'empreinte de ses OCTETS ; une base64 illisible
 * compte comme image vide (déterministe, miroir exact du serveur).
 */
async function empreinteListeSignatures(signatures) {
  const canoniques = [];
  for (const sig of signatures ?? []) {
    let octets;
    try {
      octets = base64VersOctets(sig.imagePng ?? '');
    } catch {
      octets = new Uint8Array(0);
    }
    canoniques.push(chaineCanoniqueSignature(sig, await hasherOctets(octets)));
  }
  return empreinteListeTriee(canoniques);
}

/**
 * Crée le magasin de démonstration conforme aux contrats Phases A + B.
 * @returns {object} store
 */
export function creerDemoStore() {

  // État interne : sauvegarde locale si présente, sinon copie du monde de démo
  let donnees = chargerDepuisStockage() || copier(DEMO);

  // Lot C (C1) : collection des signatures réelles — absente du monde de
  // démo comme des sauvegardes antérieures, TOUJOURS amorcée à vide (la
  // structure de l'export doit rester identique à celle du serveur).
  if (!Array.isArray(donnees.signaturesMouvement)) {
    donnees.signaturesMouvement = [];
  }

  // Lot E2 : coffre des identités (simulation) — collection + compteurs de
  // pseudonymes MONOTONES par année (persistés : non sensibles). La phrase
  // d'exercice, elle, ne vit QU'EN MÉMOIRE de session (jamais persistée) :
  // après rechargement de page, les gestes du coffre démo répondent
  // « Code incorrect » — limitation documentée au bandeau de la vue.
  if (!Array.isArray(donnees.coffreIdentites)) {
    donnees.coffreIdentites = [];
  }
  if (!donnees.coffreCompteurs || typeof donnees.coffreCompteurs !== 'object') {
    donnees.coffreCompteurs = {};
  }
  if (typeof donnees.coffreCree !== 'boolean') {
    donnees.coffreCree = false;
  }
  // coffreConfig : configuration OPAQUE d'un coffre RÉEL de passage (import
  // d'un export serveur) — la démo la CONSERVE telle quelle et la ré-émet à
  // l'export (aller-retour réel → démo → réel SANS perte) ; null en démo pure.
  if (donnees.coffreConfig === undefined) {
    donnees.coffreConfig = null;
  }
  let phraseCoffreSession = null;

  // --------------------------------------------------------
  // IM-2 : abonnés au signal « données modifiées ». Simple liste
  // de rappels, AUCUNE dépendance DOM (fonctionne sous Node).
  // Chaque mutation réussie persiste PUIS notifie.
  // --------------------------------------------------------
  const abonnesChangement = new Set();

  function notifierChangement() {
    for (const rappel of [...abonnesChangement]) {
      try {
        rappel();
      } catch {
        // Un abonné défaillant ne doit jamais bloquer les autres
      }
    }
  }

  function persisterEtNotifier() {
    persister(donnees);
    notifierChangement();
  }

  // --------------------------------------------------------
  // Petits accès internes (références VIVES, usage interne)
  // --------------------------------------------------------

  /** Index des fluides par code → { gwpAr4, famille, impact }. */
  function indexFluides() {
    const index = new Map();
    for (const f of donnees.fluides) index.set(f.code, f);
    return index;
  }

  /**
   * Recomplète la fiche réglementaire d'un fluide SANS fiche
   * (categorieCadre7 nulle ou absente) depuis le référentiel de démo —
   * mêmes valeurs que la migration 21 côté serveur (table validée
   * docs/TABLE-REGLEMENTAIRE-FLUIDES.md, rien d'inventé). Une fiche
   * explicitement présente n'est JAMAIS écrasée ; un fluide inconnu
   * reçoit les 4 clés à null (parité stricte avec les colonnes NULL du
   * serveur — le moteur retombe alors sur la dérivation de famille).
   * Modifie l'objet reçu et le retourne.
   */
  function completerFicheReglementaire(fluide) {
    if (fluide.categorieCadre7 != null) return fluide;
    const ref = DEMO.fluides.find((r) => r.code === fluide.code);
    fluide.contientHfc = ref?.contientHfc ?? null;
    fluide.contientHfo = ref?.contientHfo ?? null;
    fluide.categorieCadre7 = ref?.categorieCadre7 ?? null;
    // La source du PRP n'est recopiée que si le PRP du fluide EST la
    // valeur réglementaire courante — pour une valeur locale, la source
    // reste honnêtement inconnue (null). Miroir de l'import serveur.
    fluide.sourcePrp = ref && Number(fluide.gwpAr4) === ref.gwpAr4
      ? ref.sourcePrp : null;
    return fluide;
  }

  /** Machines comptant dans le parc (tout sauf démantelées). */
  function machinesEnParc() {
    return donnees.machines.filter((m) => m.statut !== 'DEMANTELEE');
  }

  function trouverMachine(id) {
    const machine = donnees.machines.find((m) => m.id === id);
    if (!machine) throw new Error(`Machine introuvable : ${id}.`);
    return machine;
  }

  /** Nombre de tentatives avant d'abandonner un tirage de code public. */
  const CODE_PUBLIC_TENTATIVES_MAX = 20;

  /**
   * Tire un code public (base32 Crockford, 7 car.) UNIQUE dans la
   * `collection` donnée (donnees.machines ou donnees.bouteilles) — retire
   * (retry) en cas de collision. Collision structurellement quasi
   * impossible (32^7 combinaisons) : la boucle est un filet de sécurité,
   * jamais le mécanisme d'unicité réel.
   */
  function codePublicUnique(collection) {
    const pris = new Set(collection
      .map((m) => m.codePublic)
      .filter(Boolean));
    for (let tentative = 0; tentative < CODE_PUBLIC_TENTATIVES_MAX; tentative += 1) {
      const code = genererCodePublic();
      if (!pris.has(code)) return code;
    }
    throw new Error(
      'Impossible de générer un code public unique ' +
      `(après ${CODE_PUBLIC_TENTATIVES_MAX} tentatives).`);
  }

  function trouverBouteille(id, role = 'Bouteille') {
    const bouteille = donnees.bouteilles.find((b) => b.id === id);
    if (!bouteille) throw new Error(`${role} introuvable : ${id}.`);
    return bouteille;
  }

  function trouverMouvement(id) {
    const mouvement = donnees.mouvements.find((mv) => mv.id === id);
    if (!mouvement) throw new Error(`Mouvement introuvable : ${id}.`);
    return mouvement;
  }

  function trouverPersonne(id) {
    const personne = donnees.personnel.find((p) => p.id === id);
    if (!personne) throw new Error(`Personne introuvable : ${id}.`);
    return personne;
  }

  function trouverOutil(id) {
    const outil = donnees.outillage.find((o) => o.id === id);
    if (!outil) throw new Error(`Outil introuvable : ${id}.`);
    return outil;
  }

  /**
   * Valide une catégorie d'attestation (null accepté : non attesté).
   * P0-5 (revue) : la grille est PAR CHAMP — la 2025 (A1…V) n'est pas la
   * 2008 (I…IV) ; avant, la fiche refusait « A1 » pour la grille 2025 et
   * le message mentait.
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

  function trouverHabilitation(id) {
    const h = donnees.habilitations.find((x) => x.id === id);
    if (!h) throw new Error(`Habilitation introuvable : ${id}.`);
    return h;
  }

  /** Valide un régime d'habilitation (miroir EXACT du serveur). */
  function verifierRegime(regime) {
    if (!REGIMES.includes(regime)) {
      throw new Error(
        `Régime d'habilitation inconnu : ${regime} (attendu : 2008 ou 2025).`);
    }
    return regime;
  }

  /** Valide la cohérence régime ↔ catégorie (miroir EXACT du serveur). */
  function verifierCategorieHabilitation(regime, categorie) {
    const attendues = regime === '2008' ? CATEGORIES_2008 : CATEGORIES_2025;
    if (!attendues.includes(categorie)) {
      throw new Error(
        `Catégorie « ${categorie} » incohérente avec le régime ${regime} ` +
        `(attendu : ${attendues.join(', ')}).`);
    }
    return categorie;
  }

  function trouverMention(id) {
    const m = donnees.mentionsHabilitation.find((x) => x.id === id);
    if (!m) throw new Error(`Mention introuvable : ${id}.`);
    return m;
  }

  /** Valide un fluide de mention (miroir EXACT du serveur). */
  function verifierFluideMention(fluideMention) {
    if (!FLUIDES_MENTION.includes(fluideMention)) {
      throw new Error(
        `Fluide de mention inconnu : ${fluideMention} ` +
        `(attendu : ${FLUIDES_MENTION.join(', ')}).`);
    }
    return fluideMention;
  }

  // --------------------------------------------------------
  // Balance matière (SPEC §6) — calcul interne partagé entre
  // getBalanceMatiere, les alertes et le blocage OFFICIEL.
  // --------------------------------------------------------
  function calculerBalanceMatiere(annee) {
    const prefixe = `${annee}-`;
    const parFluide = new Map();
    const ligne = (fluide) => {
      if (!parFluide.has(fluide)) {
        parFluide.set(fluide, {
          fluide,
          stockInitialNeufKg: 0,
          stockInitialRecupKg: 0,
          achatsKg: 0,
          recuperationsKg: 0,
          chargesKg: 0,
          cessionsKg: 0,
          retoursFournisseurKg: 0,
          destructionsKg: 0
        });
      }
      return parFluide.get(fluide);
    };

    // Stocks au 1er janvier (données de démo / saisie établissement)
    for (const stock of donnees.stocksInitiaux || []) {
      if (stock.annee !== annee) continue;
      const l = ligne(stock.fluide);
      l.stockInitialNeufKg = arrondir(Number(stock.neufKg) || 0);
      l.stockInitialRecupKg = arrondir(Number(stock.recupKg) || 0);
    }

    // Achats : masse nette à l'entrée des bouteilles NEUVES de l'année
    for (const b of donnees.bouteilles) {
      if (b.type !== 'NEUVE') continue;
      if (!(b.dateEntree || '').startsWith(prefixe)) continue;
      const entree = Number.isFinite(b.masseEntreeKg)
        ? b.masseEntreeKg
        : b.masseNetteKg;
      const l = ligne(b.fluide);
      l.achatsKg = arrondir(l.achatsKg + entree);
    }

    // Charges / récupérations : écritures FIGÉES de l'année.
    // Les contre-écritures (quantité opposée) se neutralisent d'elles-mêmes.
    // Les transferts bouteille → bouteille sont internes au stock : exclus.
    for (const mv of donnees.mouvements) {
      if (!(mv.date || '').startsWith(prefixe)) continue;
      if (mv.statut !== 'VALIDE' && mv.statut !== 'ANNULE') continue;
      if (!Number.isFinite(mv.quantiteKg) || mv.type === 'TRANSFERT') continue;
      const l = ligne(mv.fluide);
      if (mv.quantiteKg >= 0) {
        l.chargesKg = arrondir(l.chargesKg + mv.quantiteKg);
      } else {
        l.recuperationsKg = arrondir(l.recuperationsKg + Math.abs(mv.quantiteKg));
      }
    }

    // Destructions / éliminations : BSFF remis dans l'année
    for (const bsff of donnees.bsff || []) {
      if (!(bsff.dateRemise || '').startsWith(prefixe)) continue;
      const l = ligne(bsff.fluide);
      l.destructionsKg = arrondir(l.destructionsKg + bsff.masseRemiseKg);
    }

    // IM-9 : retours de bouteilles consignées au fournisseur dans l'année
    for (const retour of donnees.retoursFournisseur || []) {
      if (!(retour.date || '').startsWith(prefixe)) continue;
      const l = ligne(retour.fluide);
      l.retoursFournisseurKg =
        arrondir(l.retoursFournisseurKg + retour.masseKg);
    }

    const lignes = [...parFluide.values()]
      .map((l) => {
        const stockTheoriqueKg = arrondir(
          l.stockInitialNeufKg + l.stockInitialRecupKg +
          l.achatsKg + l.recuperationsKg -
          l.chargesKg - l.cessionsKg -
          l.retoursFournisseurKg - l.destructionsKg);
        const inventaire = (donnees.inventaires || []).find(
          (i) => i.annee === annee && i.fluide === l.fluide);
        const stockReelKg = inventaire ? inventaire.stockReelKg : null;
        const ecartKg = inventaire
          ? arrondir(stockReelKg - stockTheoriqueKg)
          : null;
        const justificatif = (donnees.justificationsEcarts || []).find(
          (j) => j.annee === annee && j.fluide === l.fluide);
        return {
          ...l,
          stockTheoriqueKg,
          stockReelKg,
          ecartKg,
          justification: justificatif ? justificatif.justification : null
        };
      })
      .sort((a, b) => a.fluide.localeCompare(b.fluide));

    return { annee, lignes };
  }

  /**
   * Brique ② (B7) : FIGE la photographie nominative d'une année — une
   * ligne par bouteille PRÉSENTE (les RETOURNEE sont chez le fournisseur,
   * les DECHET encore sur site comptent) + les fuites machines OUVERTES
   * au moment de la photo (même règle que l'alerte « Fuite non résolue »).
   * Upsert PAR ANNÉE : re-saisir l'inventaire d'une année refige sa photo.
   * Dénormalisée à dessein : la photo doit rester lisible telle quelle
   * même si le parc évolue ensuite.
   */
  function figerPhotoNominative(annee) {
    donnees.inventairesBouteilles ??= [];
    donnees.inventairesFuites ??= [];
    const datePhoto = aujourdHui();
    donnees.inventairesBouteilles =
      donnees.inventairesBouteilles.filter((p) => p.annee !== annee);
    donnees.inventairesFuites =
      donnees.inventairesFuites.filter((p) => p.annee !== annee);
    for (const b of donnees.bouteilles) {
      if (b.statut === 'RETOURNEE') continue;
      // Champs recopiés en ?? null : une bouteille incomplète (vieil
      // import) est photographiée TELLE QUELLE — parité de FORME stricte
      // avec le serveur (versFront émet toujours les clés).
      donnees.inventairesBouteilles.push({
        annee,
        bouteilleId: b.id,
        code: b.code ?? null,
        numeroReel: b.numeroReel ?? null,
        type: b.type ?? null,
        fluide: b.fluide ?? null,
        etatFluide: b.etatFluide ?? null,
        statut: b.statut ?? null,
        masseNetteKg: b.masseNetteKg ?? null,
        proprietaire: b.proprietaire ?? null,
        datePhoto
      });
    }
    for (const m of donnees.machines) {
      if (m.statut !== 'FUITE') continue;
      const statutFuite = estFuiteOuverte(
        controlesActifsDeLaMachine(m.id),
        m.typeInstallation === 'MOBILE');
      // Même règle que getAlertes : « non résolue » = pas de réparation
      // tracée (une fuite réparée en attente de contrôle de suivi n'est
      // plus « ouverte » au sens de la photo).
      if (!statutFuite.ouverte && statutFuite.dateReparation) continue;
      const controleFuite = donnees.controles.find(
        (c) => c.id === statutFuite.controleFuiteId);
      donnees.inventairesFuites.push({
        annee,
        machineId: m.id,
        machineLabel: m.designation ?? null,
        dateConstat: controleFuite?.date ?? null,
        localisation: controleFuite?.localisationFuite ?? null,
        datePhoto
      });
    }
  }

  /** La photo nominative d'une année (jamais null : datePhoto le dit). */
  function lirePhotoNominative(annee) {
    const bouteillesPhoto = (donnees.inventairesBouteilles ?? [])
      .filter((p) => p.annee === annee)
      .sort((a, b) => String(a.code).localeCompare(String(b.code)));
    const fuites = (donnees.inventairesFuites ?? [])
      .filter((p) => p.annee === annee)
      .sort((a, b) => String(a.machineLabel ?? '')
        .localeCompare(String(b.machineLabel ?? '')));
    return {
      annee,
      // Photo d'un parc VIDE : datée quand même (repli sur la date de
      // saisie de l'inventaire agrégé) — « zéro bouteille au 31/12 » est
      // une information d'audit. Parité stricte avec le serveur.
      datePhoto: bouteillesPhoto[0]?.datePhoto ?? fuites[0]?.datePhoto
        ?? (donnees.inventaires ?? []).find((i) => i.annee === annee)?.dateSaisie
        ?? null,
      bouteilles: bouteillesPhoto,
      fuitesOuvertes: fuites
    };
  }

  /** La photo d'une année, ou null si elle n'a jamais été figée. */
  function lirePhotoOuNull(annee) {
    const photo = lirePhotoNominative(annee);
    return photo.datePhoto === null ? null : photo;
  }

  /** Écarts d'inventaire au-delà du seuil et SANS justification. */
  function ecartsNonJustifies() {
    const annees = [...new Set((donnees.inventaires || []).map((i) => i.annee))];
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

  /** Vérifie qu'une personne existe ET a le droit de valider. */
  function verifierValidateur(validateurId) {
    const personne = donnees.personnel.find((p) => p.id === validateurId);
    if (!personne) {
      throw new Error(`Validateur introuvable : ${validateurId}.`);
    }
    if (!ROLES_VALIDEURS.includes(personne.roleApp)) {
      throw new Error(
        'Validation refusée : un élève ne peut pas valider une écriture ' +
        '(rôle requis : référent, enseignant ou administrateur).');
    }
    return personne;
  }

  // --------------------------------------------------------
  // Blocage dur du mode OFFICIEL (lot B — condition 2 du plan)
  // --------------------------------------------------------

  /**
   * Les 4 vérifications d'établissement du mode OFFICIEL (SPEC §7.2) —
   * corps historique de peutPasserEnOfficiel, extrait pour nourrir AUSSI
   * le moteur de blocage (conditions 1-4 de la liste, motifs inchangés).
   */
  function calculerPeutPasserEnOfficiel() {
    const motifs = [];
    const jour = aujourdHui();
    const etab = donnees.etablissement;

    if (!etab.numAttestationCapacite) {
      motifs.push('Aucune attestation de capacité renseignée pour ' +
        'l’établissement.');
    } else if (etab.dateEcheanceCapacite &&
               etab.dateEcheanceCapacite < jour) {
      motifs.push('Attestation de capacité expirée depuis le ' +
        `${fmtDate(etab.dateEcheanceCapacite)}.`);
    }

    const statuts = donnees.outillage.map((o) => ({
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

  /**
   * Lot C (C1) : état d'une signature RÉELLE pour le moteur de blocage —
   * true (une signature du rôle vaut pour la révision courante) | false
   * (aucune signature du rôle) | 'PERIMEE' (posée puis fiche modifiée).
   */
  function etatSignatureReelle(mouvement, role) {
    const revision = mouvement.revisionBrouillon ?? 0;
    const duRole = (donnees.signaturesMouvement ?? []).filter((sig) =>
      sig.mouvementId === mouvement.id && sig.role === role);
    if (duRole.some((sig) => (sig.versionDocument ?? 0) === revision)) {
      return true;
    }
    return duRole.length > 0 ? 'PERIMEE' : false;
  }

  /**
   * Faits de la fiche pour le moteur de blocage OFFICIEL (conditions 6-11
   * et 14-15 de la liste) : tout est PRÉCALCULÉ ici, le moteur reste pur.
   * Un intervenant désigné mais introuvable est traité comme absent.
   */
  function cadreFicheOfficiel(mouvement) {
    const jour = aujourdHui();
    const machine = mouvement.machineId
      ? donnees.machines.find((m) => m.id === mouvement.machineId) ?? null
      : null;
    const fluideRef = mouvement.fluide
      ? donnees.fluides.find((f) => f.code === mouvement.fluide) ?? null
      : null;
    const bouteilleSrc = mouvement.bouteilleSrcId
      ? donnees.bouteilles.find((b) => b.id === mouvement.bouteilleSrcId) ?? null
      : null;
    // Contrôle périodique requis : même moteur réglementaire que le
    // cadre 7 du CERFA (fréquence non nulle = machine soumise).
    let controlePeriodiqueRequis = false;
    if (machine && fluideRef) {
      const { frequenceMois } = evaluerControle(fluideRef,
        machine.chargeNominaleKg, Boolean(machine.detectionPermanente),
        mouvement.date ?? jour);
      controlePeriodiqueRequis = Boolean(frequenceMois);
    }
    const personne = mouvement.executeParId
      ? donnees.personnel.find((p) => p.id === mouvement.executeParId) ?? null
      : null;
    // P0-5 : habilitations qui COMPTENT (actives, non échues, régime encore
    // reconnu — une 2008 ne compte plus après le 31/12/2026) + fait
    // `aptitude` = verdict du moteur sur CE mouvement (opération = type,
    // fluide du mouvement, charge NOMINALE de la machine — celle des seuils
    // réglementaires). La fiche machine ne porte pas (encore) le caractère
    // « hermétiquement scellé » (P1-1) : défaut prudent = seuil 3 kg.
    let intervenant = null;
    if (personne) {
      const reconnues = (donnees.habilitations ?? []).filter((h) =>
        h.personneId === personne.id && habilitationReconnue(h, jour));
      const nominale = machine ? machine.chargeNominaleKg : null;
      const verdict = reconnues.length === 0 ? null : verifierDroitIntervention({
        habilitations: reconnues.map((h) =>
          ({ regime: h.regime, categorie: h.categorie })),
        mentions: jetonsMentionsActives((donnees.mentionsHabilitation ?? [])
          .filter((m) => m.personneId === personne.id &&
            (!m.dateFin || m.dateFin >= jour))),
        operation: mouvement.type,
        fluide: mouvement.fluide ?? null,
        // Garde stricte : colonne nullable — un null deviendrait 0 via
        // Number() et fabriquerait un faux refus (leçon conseil-intervenant).
        chargeKg: typeof nominale === 'number' && Number.isFinite(nominale)
          && nominale > 0 ? nominale : null,
        hermetiqueScelle: false
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
      fluideInflammable: Boolean(fluideRef?.classeSecurite &&
        fluideRef.classeSecurite !== 'A1'),
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
   * Verdict OFFICIEL à un moment donné. Pas de session ni de poste en
   * démonstration : sauvegarde et validateur sont SANS OBJET (null) —
   * le serveur, lui, les évalue (parité assumée, comme les gardes de rôle).
   */
  function evaluerOfficiel(moment, fiche) {
    return evaluerBlocagesOfficiel({
      moment,
      etablissementMotifs: calculerPeutPasserEnOfficiel().motifs,
      sauvegarde: null,
      validateur: null,
      verrouLivraison: VERROU_LIVRAISON,
      fiche
    });
  }

  // --------------------------------------------------------
  // Journal d'audit (append-only : AUCUNE méthode de purge)
  // --------------------------------------------------------
  function journaliser(qui, action, cible, details) {
    donnees.journalAudit.push({
      date: new Date().toISOString(),
      qui: qui || 'système',
      action,
      cible,
      details
    });
  }

  // --------------------------------------------------------
  // Chaîne d'intégrité des écritures
  // --------------------------------------------------------

  /** Écritures figées (VALIDE/ANNULE), dans l'ordre de validation. */
  function chaineValidee() {
    return ecrituresFigees(donnees.mouvements);
  }

  /** Scelle une écriture : ordre, hash précédent, hash propre. */
  async function sceller(mouvement) {
    const chaine = chaineValidee();
    const derniere = chaine[chaine.length - 1] || null;
    mouvement.ordreValidation = (derniere?.ordreValidation ?? 0) + 1;
    mouvement.hashPrecedent = derniere?.hashEcriture ?? null;
    mouvement.hashEcriture =
      await hasherEcriture(mouvement, mouvement.hashPrecedent);
  }

  /** Prochain numéro de fiche : FORM-AAAA-NNNN ou FI-AAAA-NNNN. */
  function prochainNumero(mode) {
    const prefixe = mode === 'OFFICIEL' ? 'FI' : 'FORM';
    const motif = new RegExp(`^${prefixe}-\\d{4}-(\\d{4})$`);
    let max = 0;
    for (const mv of donnees.mouvements) {
      const trouve = motif.exec(mv.numero || '');
      if (trouve) max = Math.max(max, Number(trouve[1]));
    }
    const annee = new Date().getFullYear();
    return `${prefixe}-${annee}-${String(max + 1).padStart(4, '0')}`;
  }

  /**
   * Prochain numéro de fiche pour un contrôle AUTONOME : C-FORM-AAAA-NNNN ou
   * C-FI-AAAA-NNNN. Espace DISJOINT des mouvements (préfixe « C- ») : jamais de
   * collision avec un numéro de mouvement, numérotation des mouvements (dans
   * l'empreinte) intacte. Miroir exact de prochainNumeroControle du serveur.
   */
  function prochainNumeroControle(mode) {
    const prefixe = mode === 'OFFICIEL' ? 'C-FI' : 'C-FORM';
    const motif = new RegExp(`^${prefixe}-\\d{4}-(\\d{4})$`);
    let max = 0;
    for (const ctl of donnees.controles) {
      const trouve = motif.exec(ctl.numero || '');
      if (trouve) max = Math.max(max, Number(trouve[1]));
    }
    const annee = new Date().getFullYear();
    return `${prefixe}-${annee}-${String(max + 1).padStart(4, '0')}`;
  }

  // --------------------------------------------------------
  // Effets stocks / charges d'une écriture au moment de la
  // validation. Mutations VIVES + calcul de quantiteKg signée.
  // --------------------------------------------------------

  /**
   * CF-5 : attribution AUTOMATIQUE et cohérente des statuts VIDE /
   * A_RETOURNER après un mouvement qui fait varier la masse nette —
   * jamais touchée pour un statut hors du cycle courant (DECHET,
   * RETOURNEE : sémantique propre gérée par deciderFluideRecupere,
   * createBsff et retournerFournisseur, IM-7/IM-8/IM-9).
   *
   * - masse retombée à ~0 depuis EN_STOCK/EN_SERVICE : bouteille
   *   NEUVE consignée (proprietaire renseigné) → A_RETOURNER (elle
   *   est destinée à repartir chez le fournisseur, cf. IM-9) ;
   *   toute autre bouteille (RECUPERATION, TRANSFERT…) → VIDE.
   * - masse à nouveau positive depuis VIDE/A_RETOURNER : la bouteille
   *   redevient utilisable → retour à EN_STOCK.
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
   * R2 : recalcule l'étiquette (fluide MAJORITAIRE) d'une bouteille
   * MELANGE depuis sa composition tracée. À égalité parfaite, le premier
   * fluide versé garde l'étiquette. Mutation VIVE.
   */
  function recalculerEtiquetteMelange(bouteille) {
    const versements = Array.isArray(bouteille.compositionMelange)
      ? bouteille.compositionMelange : [];
    // Fluide majoritaire = somme des quantités groupées par fluide.
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
   * R2 : versement INITIAL de la composition tracée d'une bouteille
   * MELANGE — le contenu déjà présent au moment où elle devient MELANGE,
   * au fluide de son étiquette. Sans cette amorce, le premier versement
   * croisé, même minoritaire, ferait basculer l'étiquette (le contenu
   * initial n'entrerait pas dans le calcul du gaz majoritaire). Posée
   * même à masse nulle : elle garde la trace de l'étiquette d'origine
   * (retour d'étiquette après contre-écriture d'un versement).
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
   * nouveau versement fait basculer la majorité. Mutation VIVE.
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
   * Mutation VIVE.
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
   * que l'étiquette (comportement historique, aucun autre appelant n'est
   * concerné par le croisement). `mouvementId` : traçabilité du versement.
   * `tracer` : false pour un REVERSEMENT de contre-écriture — le fluide
   * revient, ce n'est pas un versement neuf (R2 : pas de ligne fantôme
   * dans la composition d'une bouteille MELANGE).
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

  /**
   * IM-6 : une bouteille sortie du stock (retournée, déchet…) ne peut
   * plus participer à un mouvement — ni comme source, ni comme
   * destination de récupération.
   */
  function verifierBouteilleEnStock(bouteille, role) {
    if (bouteille.statut !== 'EN_STOCK' && bouteille.statut !== 'EN_SERVICE') {
      throw new Error(
        `${role} ${bouteille.code} sortie du stock ` +
        `(statut ${bouteille.statut}) : mouvement impossible.`);
    }
  }

  /**
   * IM-6 : une bouteille source de charge doit contenir du fluide
   * UTILISABLE — jamais un fluide déclaré déchet ni en attente
   * d'analyse.
   */
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

  /** Applique les règles métier et les effets d'une écriture SOUMISE. */
  function appliquerEffets(mouvement) {
    // P7-a : un CONTRÔLE d'étanchéité est un mouvement « sec » — aucun effet
    // stock, aucune pesée. Le résultat et les effets machine viennent de CR-3
    // (contrôle lié) ; on fige seulement fluide et libellé. Parité serveur.
    if (mouvement.type === 'CONTROLE_PERIODIQUE' ||
        mouvement.type === 'CONTROLE_NON_PERIODIQUE') {
      // P7-b : un mouvement de CONTROLE DOIT porter un résultat (le contrôle
      // est l'objet de l'écriture) — sinon un « contrôle vide » se validerait
      // sans produire de contrôle lié (CR-3 se déclenche sur ce résultat).
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
      if (mouvement.type === 'CHARGE_APPOINT') {
        if (estFuiteOuverte(controlesActifsDeLaMachine(machine.id),
          machine.typeInstallation === 'MOBILE').ouverte) {
          throw new Error(MSG_FUITE_OUVERTE);
        }
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
      // IM-6 : jamais dans une bouteille qui a quitté l'établissement.
      // La place restante est contrôlée par verserDansBouteille (débordement).
      verifierBouteilleEnStock(destination, 'Bouteille de destination');
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
      // IM-6 : place restante vérifiée AVANT tout effet — sinon la
      // machine serait vidée puis le versement échouerait (mutation
      // partielle).
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
      // Convention d'affichage existante : récupération = quantité NÉGATIVE
      mouvement.quantiteKg = -quantite;

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
      // IM-6 : place restante vérifiée AVANT tout effet (voir ci-dessus)
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

    } else {
      throw new Error(`Type de mouvement inconnu : ${mouvement.type}.`);
    }
  }

  /**
   * Une contre-écriture reverse du fluide dans la bouteille d'origine —
   * mais si CETTE bouteille est RÉELLEMENT sortie du circuit ENTRE-TEMPS
   * (retournée au fournisseur, remise en filière déchets), le fluide ne
   * doit pas y « réapparaître ». Les statuts VIDE et A_RETOURNER restent
   * AUTORISÉS : ils sont posés AUTOMATIQUEMENT quand la masse retombe à
   * ~0 (CF-5), la bouteille est encore physiquement à l'atelier et le
   * reversement la remet EN_STOCK tout seul — la contre-écriture est
   * l'UNIQUE voie de correction du registre WORM, la bloquer là rendrait
   * l'écriture fausse infigeable.
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
   * AVANT la moindre mutation (machine ou bouteille) — sinon un rejet
   * laisserait une mutation PARTIELLE en place (pas de transaction pour la
   * copie en mémoire du DemoStore, contrairement au LocalStore SQL).
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
      if (source) {
        // tracer=false : le fluide REVIENT (annulation), pas un versement
        // neuf — sinon une source MELANGE gagnerait une ligne fantôme (R2).
        verserDansBouteille(source, quantite, original.fluide, original.id,
          false);
      }
    } else if (original.type === 'RECUPERATION_MAINTENANCE' ||
               original.type === 'RECUPERATION_DEMANTELEMENT') {
      const machine = trouverMachine(original.machineId);
      chargerMachine(machine, quantite);
      if (original.bouteilleDstId) {
        const destination = trouverBouteille(original.bouteilleDstId,
          'Bouteille de destination');
        retirerDeBouteille(destination, quantite);
        // R2 : le versement annulé sort de la composition tracée et
        // l'étiquette majoritaire est recalculée.
        if (destination.etatFluide === 'MELANGE') {
          retirerVersementMelange(destination, original.id);
        }
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
      }
      if (source) {
        // tracer=false : reversement d'annulation (voir CHARGE ci-dessus).
        verserDansBouteille(source, quantite, original.fluide, original.id,
          false);
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
   * P0-6 : un contrôle est réputé ANNULÉ quand le mouvement qui l'a créé
   * est ANNULE (fait DÉRIVÉ — la table des contrôles n'est jamais
   * réécrite ; un contrôle autonome, sans mouvementId, reste toujours
   * actif). Toute la logique de fuite (alertes, R3c, retour EN_SERVICE,
   * dossiers, photo nominative) ne regarde que les contrôles ACTIFS.
   */
  function controleAnnule(controle) {
    if (!controle.mouvementId) return false;
    const mv = donnees.mouvements.find((m) => m.id === controle.mouvementId);
    return Boolean(mv && mv.statut === 'ANNULE');
  }

  /** Contrôles ACTIFS d'une machine (P0-6 — les annulés sont exclus). */
  function controlesActifsDeLaMachine(machineId) {
    return donnees.controles.filter((c) =>
      c.machineId === machineId && !controleAnnule(c));
  }

  /**
   * P0-6 : recalcule les effets machine après l'annulation d'un mouvement
   * porteur d'un contrôle lié — depuis les contrôles restés actifs, le
   * contrôle annulé exclu. Règle sobre : dernierControle = plus récent
   * actif ; prochainControle = échéance du plus récent actif qui en porte
   * une, sinon LAISSÉ en l'état (l'échéance antérieure au premier contrôle
   * est inconnaissable — limite consignée au plan P0-6) ; statut recalculé
   * SEULEMENT depuis FUITE / EN_SERVICE / CONTROLE_DU (jamais une machine
   * arrêtée ou démantelée).
   */
  function recalculerEffetsMachineApresAnnulation(machineId, controleExcluId) {
    const machine = trouverMachine(machineId);
    if (machine.statut !== 'FUITE' && machine.statut !== 'EN_SERVICE' &&
        machine.statut !== 'CONTROLE_DU') {
      return;
    }
    const actifs = controlesActifsDeLaMachine(machineId)
      .filter((c) => c.id !== controleExcluId);
    const tries = actifs.slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    machine.dernierControle = tries[0]?.date ?? null;
    const porteurEcheance = tries.find((c) => c.prochainControle);
    if (porteurEcheance) {
      machine.prochainControle = porteurEcheance.prochainControle;
    }
    const statutFuite = estFuiteOuverte(actifs,
      machine.typeInstallation === 'MOBILE');
    const fuiteNonRefermee = Boolean(statutFuite.controleFuiteId &&
      (statutFuite.ouverte || statutFuite.echeanceControleSuivi !== null));
    if (fuiteNonRefermee) {
      machine.statut = 'FUITE';
    } else if (machine.prochainControle &&
               machine.prochainControle < aujourdHui()) {
      machine.statut = 'CONTROLE_DU';
    } else {
      machine.statut = 'EN_SERVICE';
    }
  }

  /**
   * R3/R4 : prédicat « fuite ouverte/réparée/en attente de suivi » d'une
   * machine, calculé depuis SES contrôles (triés date décroissante, la
   * plus récente d'abord). Fonction interne PURE, NON exposée au contrat
   * (miroir identique dans server/api.js — pattern déjà suivi pour
   * enregistrerControle) : { ouverte, controleFuiteId, dateReparation,
   * echeanceControleSuivi }.
   * - ouverte = le dernier contrôle FUITE de la machine n'a pas de
   *   réparation tracée — un CONFORME, même postérieur, ne referme JAMAIS
   *   une fuite sans réparation tracée (R4 : réparation + contrôle,
   *   jamais l'un sans l'autre — sinon un contrôle prématuré ou de
   *   complaisance contournerait le blocage R3c du complément de gaz).
   * - dateReparation posée mais aucun CONFORME de clôture : « réparée en
   *   attente de contrôle de suivi », échéance = réparation + 1 MOIS CIVIL
   *   (P0-6 — écrêté fin de mois : 31/01 → 28/02).
   * - réparation tracée + CONFORME de clôture : refermée. P0-6 (audit
   *   20/07, décision Franck 22/07) : la clôture exige un CONFORME
   *   STRICTEMENT postérieur AU JOUR de la réparation (proxy des 24 h de
   *   fonctionnement, dates au jour → J+1 minimum). Exception : équipement
   *   MOBILE listé (`machineMobile`) — le contrôle immédiat est admis, le
   *   jour même suffit (ancienne convention R4, désormais réservée à ce cas).
   */
  function estFuiteOuverte(controlesMachine, machineMobile = false) {
    const tries = controlesMachine.slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const derniereFuite = tries.find((c) => c.resultat === 'FUITE');
    if (!derniereFuite) {
      return { ouverte: false, controleFuiteId: null, dateReparation: null,
        echeanceControleSuivi: null };
    }
    if (!derniereFuite.dateReparation) {
      return { ouverte: true, controleFuiteId: derniereFuite.id,
        dateReparation: null, echeanceControleSuivi: null };
    }
    // Réparation tracée (R3a) : la machine n'est plus « ouverte » au sens
    // R3c (le complément de gaz redevient possible) — reste seulement,
    // tant qu'aucun CONFORME n'est venu après la réparation, une échéance
    // de contrôle de suivi à 1 mois civil (P0-6). Le CONFORME doit aussi être
    // au moins du jour de la FUITE (jamais un conforme antérieur).
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

  // --------------------------------------------------------
  // Contrôle d'étanchéité : logique UNIQUE partagée entre
  // createControle et la validation d'un mouvement dont le
  // wizard a déclaré un contrôle (CR-3). Mutations VIVES,
  // journalisation incluse, persistance à la charge de l'appelant.
  // --------------------------------------------------------
  function enregistrerControle(d) {
    const machine = trouverMachine(d.machineId);
    if (d.resultat !== 'CONFORME' && d.resultat !== 'FUITE') {
      throw new Error('Résultat de contrôle obligatoire : CONFORME ou FUITE.');
    }
    // P0-6 (revue I-1) : les dates métier sont AU JOUR — un horodatage
    // (« 2026-07-20T18:00 ») comparé en chaîne serait « strictement
    // postérieur » au jour même et contournerait la clôture J+1.
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
      id: genId('ctl'),
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
      prochainControle: d.prochainControle ?? null,
      enRetard: false
    };
    donnees.controles.push(controle);

    // Effets sur la machine (contrat Phase B)
    machine.dernierControle = controle.date;
    if (controle.prochainControle) {
      machine.prochainControle = controle.prochainControle;
    }
    if (controle.resultat === 'FUITE') {
      machine.statut = 'FUITE';
    } else if (machine.statut === 'FUITE') {
      // R4 + P0-6 : le retour EN_SERVICE depuis FUITE suit EXACTEMENT la
      // règle de clôture d'estFuiteOuverte, rejouée avec le contrôle qu'on
      // vient d'insérer — source de vérité UNIQUE (fuite refermée =
      // réparation tracée + CONFORME de clôture : strictement postérieur
      // au jour de la réparation, jour même admis pour un équipement
      // MOBILE listé). Plus de condition ad hoc divergente du dossier.
      const statutFuite = estFuiteOuverte(
        controlesActifsDeLaMachine(machine.id),
        machine.typeInstallation === 'MOBILE');
      if (!statutFuite.ouverte && statutFuite.dateReparation &&
          statutFuite.echeanceControleSuivi === null) {
        machine.statut = 'EN_SERVICE';
      }
    } else if (machine.statut === 'CONTROLE_DU' &&
               (!machine.prochainControle ||
                machine.prochainControle >= aujourdHui())) {
      // Conforme et pas en retard → retour en service
      machine.statut = 'EN_SERVICE';
    }

    journaliser(controle.operateur, 'CREATION_CONTROLE', machine.code,
      `${controle.typeControle} ${controle.methode} → ${controle.resultat}`);
    return controle;
  }

  // --------------------------------------------------------
  // Coffre des identités (lot E2) — aides de simulation
  // --------------------------------------------------------

  /** Vrai si la personne a une identité au coffre. */
  function estAuCoffre(personnelId) {
    return (donnees.coffreIdentites ?? [])
      .some((c) => c.personnelId === personnelId);
  }

  /** La ligne de coffre d'une personne, ou undefined. */
  function ligneCoffre(personnelId) {
    return (donnees.coffreIdentites ?? [])
      .find((c) => c.personnelId === personnelId);
  }

  /** Octets → base64 (par tranches — btoa sature sur un gros tableau). */
  function octetsVersBase64(octets) {
    let binaire = '';
    for (let i = 0; i < octets.length; i += 8192) {
      binaire += String.fromCharCode(...octets.subarray(i, i + 8192));
    }
    return btoa(binaire);
  }

  /**
   * Vérifie la phrase d'exercice du coffre SIMULÉ : le coffre doit exister
   * et la phrase de SESSION (jamais persistée) doit correspondre. Mêmes
   * messages canoniques que le serveur réel (parité des refus).
   */
  function verifierPhraseCoffreDemo(phrase) {
    if (!donnees.coffreCree) throw new Error(MSG_COFFRE_INEXISTANT);
    if (typeof phrase !== 'string' || phrase.length === 0 ||
        phraseCoffreSession === null || phrase !== phraseCoffreSession) {
      throw new Error(MSG_CODE_INCORRECT);
    }
  }

  /** Prochain numéro MONOTONE de pseudonyme pour une année (persisté). */
  function prochainNumeroCoffre(annee) {
    const cle = String(annee);
    const suivant = (donnees.coffreCompteurs[cle] ?? 0) + 1;
    donnees.coffreCompteurs[cle] = suivant;
    return suivant;
  }

  const store = {

    // Étiquette de mode affichée dans l'interface
    modeLabel: 'DÉMO',

    // État d'intégrité constaté au chargement (CR-5) :
    // null = sain, { ok: false, casseA } = registre altéré.
    registreAltere: null,

    /**
     * IM-2 : abonne un rappel au signal « données modifiées »,
     * notifié après CHAQUE mutation réussie (aucune dépendance DOM).
     * @param {Function} rappel
     * @returns {Function} fonction de désabonnement
     */
    surChangement(rappel) {
      if (typeof rappel !== 'function') {
        throw new Error('surChangement attend une fonction de rappel.');
      }
      abonnesChangement.add(rappel);
      return () => { abonnesChangement.delete(rappel); };
    },

    // ------------------------------------------------------
    // Initialisation (appelée par la fabrique creerStore)
    // ------------------------------------------------------
    async init() {
      let modifie = false;

      // Compléments Phase B pour les sauvegardes Phase A existantes
      if (!Array.isArray(donnees.outillage)) {
        donnees.outillage = copier(DEMO.outillage);
        modifie = true;
      }
      if (!Array.isArray(donnees.journalAudit)) {
        donnees.journalAudit = [];
        modifie = true;
      }

      // Compléments Phase C pour les sauvegardes A/B existantes
      for (const cle of ['auditsOrganisme', 'nonConformites', 'stocksInitiaux',
        'bsff', 'inventaires', 'justificationsEcarts', 'piecesJointes',
        'retoursFournisseur']) {
        if (!Array.isArray(donnees[cle])) {
          donnees[cle] = copier(DEMO[cle] ?? []);
          modifie = true;
        }
      }
      // ⚠️ Compléments TOUJOURS à VIDE, JAMAIS depuis DEMO : le monde de
      // démo porte désormais des habilitations/mentions fictives — les
      // recopier dans une sauvegarde qui n'en avait pas INVENTERAIT des
      // aptitudes (droits) ou des faits (outils figés, épisodes d'alerte).
      for (const cle of ['sentinelleAlertes', 'habilitations',
        'mentionsHabilitation', 'mouvementOutillage']) {
        if (!Array.isArray(donnees[cle])) {
          donnees[cle] = [];
          modifie = true;
        }
      }
      // Dossier opérateur : une sauvegarde ancienne reçoit les champs
      // enrichis du monde de démo (ses valeurs existantes priment).
      if (donnees.etablissement.numAttestationCapacite === undefined) {
        donnees.etablissement =
          { ...copier(DEMO.etablissement), ...donnees.etablissement };
        modifie = true;
      }

      // CR-4 : reprise des anciennes sauvegardes — les bouteilles sans
      // masse d'entrée figée reçoivent leur masse nette courante (la
      // meilleure approximation disponible), une fois pour toutes.
      for (const b of donnees.bouteilles) {
        if (!Number.isFinite(b.masseEntreeKg)) {
          b.masseEntreeKg = b.masseNetteKg;
          modifie = true;
        }
      }

      // V9.1 : backfill du code public — toute machine du monde de démo
      // (ou d'une sauvegarde antérieure à cet incrément) sans identifiant
      // opaque QR en reçoit un, unique et stable à vie (jamais régénéré
      // une fois posé).
      for (const m of donnees.machines) {
        if (!m.codePublic) {
          m.codePublic = codePublicUnique(donnees.machines);
          modifie = true;
        }
      }

      // Backfill équivalent (migration 009) pour les bouteilles — même
      // règle : jamais régénéré une fois posé.
      for (const b of donnees.bouteilles) {
        if (!b.codePublic) {
          b.codePublic = codePublicUnique(donnees.bouteilles);
          modifie = true;
        }
      }

      // Backfill équivalent (migration 011) pour les clients / détenteurs —
      // porte l'étiquette QR « chez le client ». Même règle : jamais régénéré.
      for (const c of donnees.clients) {
        if (!c.codePublic) {
          c.codePublic = codePublicUnique(donnees.clients);
          modifie = true;
        }
      }

      // Backfill équivalent (migration 012) pour l'outillage — étiquette QR
      // sur l'outil. Même règle : jamais régénéré une fois posé.
      for (const o of donnees.outillage) {
        if (!o.codePublic) {
          o.codePublic = codePublicUnique(donnees.outillage);
          modifie = true;
        }
      }

      // Amorçage de la chaîne d'intégrité : les écritures du monde de
      // démonstration (ou d'un import Phase A, AUCUNE empreinte nulle
      // part) reçoivent leur empreinte. Une chaîne PARTIELLE n'est
      // jamais ré-amorcée : ce serait masquer une altération (CR-5).
      const figees = donnees.mouvements.filter((mv) =>
        mv.statut === 'VALIDE' || mv.statut === 'ANNULE');
      if (figees.length > 0 && figees.every((mv) => !mv.hashEcriture)) {
        figees.sort((a, b) =>
          a.date.localeCompare(b.date) || a.numero.localeCompare(b.numero));
        let precedent = null;
        let ordre = 1;
        for (const mv of figees) {
          mv.ordreValidation = ordre;
          mv.hashPrecedent = precedent;
          mv.hashEcriture = await hasherEcriture(mv, precedent);
          precedent = mv.hashEcriture;
          ordre += 1;
        }
        modifie = true;
      }

      if (modifie) persisterEtNotifier();

      // CR-5 : vérification d'intégrité au chargement (localStorage
      // réécrit à la main, sauvegarde trafiquée…). L'application n'est
      // PAS bloquée : le drapeau est posé pour le bandeau d'interface.
      this.registreAltere = null;
      const probleme = verifierInvariantsDonnees(donnees);
      if (probleme) {
        this.registreAltere = { ok: false, casseA: probleme };
      } else {
        const chaine = await verifierChaineMouvements(donnees.mouvements);
        if (!chaine.ok) {
          this.registreAltere = { ok: false, casseA: chaine.casseA };
        }
      }
    },

    // ------------------------------------------------------
    // Lectures simples (copies)
    // ------------------------------------------------------
    async getEtablissement() {
      return copier(donnees.etablissement);
    },

    async getUtilisateurCourant() {
      // Phase B : utilisateur fixe (l'authentification arrive en Phase E)
      const referent = donnees.personnel.find((p) => p.roleApp === 'REFERENT');
      if (!referent) throw new Error('Aucun référent dans le personnel.');
      return copier(referent);
    },

    async getOutillage() {
      // Statuts RECALCULÉS depuis les échéances à chaque lecture
      const jour = aujourdHui();
      for (const outil of donnees.outillage) {
        outil.statut = calculerStatutOutil(outil, jour);
      }
      return copier(donnees.outillage);
    },

    async getMachines() {
      return copier(donnees.machines);
    },

    async getBouteilles() {
      return copier(donnees.bouteilles);
    },

    async getMouvements() {
      // Tri par date décroissante, puis numéro décroissant (stabilité)
      const liste = copier(donnees.mouvements);
      liste.sort((a, b) =>
        b.date.localeCompare(a.date) || b.numero.localeCompare(a.numero));
      return liste;
    },

    async getControles() {
      const liste = copier(donnees.controles);
      liste.sort((a, b) => b.date.localeCompare(a.date));
      return liste;
    },

    async getFluides() {
      // nbMachines recalculé depuis le parc courant.
      // classeSecurite : complétée depuis le référentiel de démo
      // pour les sauvegardes antérieures à la Phase D.
      // Fiche réglementaire : complétée au même titre (mondes démo
      // persistés AVANT la migration 21), jamais écrasée si présente.
      const parc = machinesEnParc();
      return donnees.fluides.map((f) => completerFicheReglementaire({
        ...copier(f),
        classeSecurite: f.classeSecurite ??
          DEMO.fluides.find((r) => r.code === f.code)?.classeSecurite ?? null,
        nbMachines: parc.filter((m) => m.fluide === f.code).length
      }));
    },

    async getPersonnel() {
      return copier(donnees.personnel);
    },

    async getClients() {
      // nbMachines recalculé depuis le parc courant ; actif par défaut à vrai
      // pour les clients hérités de données antérieures à ce champ.
      const parc = machinesEnParc();
      return donnees.clients.map((c) => ({
        ...copier(c),
        actif: c.actif === undefined ? true : c.actif,
        nbMachines: parc.filter((m) => m.clientId === c.id).length
      }));
    },

    async getAlertes() {
      // Phase C : alertes ENTIÈREMENT dynamiques, recalculées depuis
      // les données. Niveaux conformes à la SPEC §7.2 : ce qui est
      // ÉCHU est critique, ce qui APPROCHE (90 jours) est important.
      // IM-2 : chaque alerte porte une cible { vue, id? } pour les
      // liens cliquables du tableau de bord.
      const alertes = [];
      const jour = aujourdHui();
      const horizon = ajouterJours(jour, 90);

      // 1. Attestation de CAPACITÉ de l'établissement
      const echeanceCapacite = donnees.etablissement.dateEcheanceCapacite;
      if (echeanceCapacite && echeanceCapacite < jour) {
        alertes.push({
          id: 'alr-capacite',
          niveau: 'CRITIQUE',
          titre: 'Attestation de capacité expirée',
          detail: `${donnees.etablissement.numAttestationCapacite ?? '—'} · ` +
            `échéance ${fmtDate(echeanceCapacite)}`,
          cible: { vue: 'admin' }
        });
      } else if (echeanceCapacite && echeanceCapacite <= horizon) {
        alertes.push({
          id: 'alr-capacite',
          niveau: 'IMPORTANT',
          titre: 'Attestation de capacité à renouveler',
          detail: `${donnees.etablissement.numAttestationCapacite ?? '—'} · ` +
            `échéance ${fmtDate(echeanceCapacite)}`,
          cible: { vue: 'admin' }
        });
      }

      // 2. Attestations d'APTITUDE du personnel actif
      for (const p of donnees.personnel) {
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
      // « conseil ») : l'aptitude vit désormais AUSSI dans les tables du
      // B2 (multi-régime, échéance PAR ligne) — une ligne ACTIVE d'une
      // personne ACTIVE, échue ou sous l'horizon, alerte comme
      // l'attestation héritée de la fiche. Les révoquées ne sonnent
      // jamais (historique), les personnes désactivées non plus.
      const nomsPersonnelActif = new Map(donnees.personnel
        .filter((p) => p.actif)
        .map((p) => [p.id, `${p.prenom} ${p.nom}`]));
      for (const h of donnees.habilitations ?? []) {
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
      const LIBELLES_MENTION_ALERTE = { CO2: 'CO₂', NH3: 'NH₃', HC: 'HC' };
      for (const m of donnees.mentionsHabilitation ?? []) {
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
      for (const m of donnees.machines) {
        if (m.statut === 'FUITE') {
          // R4 : distinguer fuite OUVERTE (aucune réparation tracée,
          // CRITIQUE) de fuite RÉPARÉE en attente de contrôle de suivi
          // (IMPORTANT, échéance 1 mois civil depuis la réparation, P0-6).
          const statutFuite = estFuiteOuverte(
            controlesActifsDeLaMachine(m.id),
            m.typeInstallation === 'MOBILE');
          // R4 : l'alerte de SUIVI n'existe que si une réparation est
          // TRACÉE — sans elle, la fuite reste « non résolue » (jamais
          // de dates nulles affichées).
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
      }

      // 4. Outillage à échéance dépassée (statut recalculé)
      for (const outil of donnees.outillage) {
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
      for (const b of donnees.bouteilles) {
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
      for (const b of donnees.bouteilles) {
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
      for (const mv of donnees.mouvements) {
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
      // qui a été récupéré d'une machine — l'avoir d'origine devient
      // NÉGATIF dans une bouteille de RÉCUPÉRATION. Anomalie SIGNALÉE (non
      // bloquante en conseil), à rectifier par contre-écriture. Une charge
      // depuis une bouteille NEUVE (fluide acheté : vierge / recyclé /
      // régénéré certifié) n'est PAS un réemploi : jamais concernée.
      const labelMachineReemploi = new Map();
      for (const mv of donnees.mouvements) {
        if (mv.machineId && mv.machineLabel
            && !labelMachineReemploi.has(mv.machineId)) {
          labelMachineReemploi.set(mv.machineId, mv.machineLabel);
        }
      }
      for (const b of donnees.bouteilles) {
        if (b.type !== 'RECUPERATION') continue;
        const avoirOrigine = avoirParMachineOrigine(b.id, donnees.mouvements);
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

    async getJournalAudit() {
      return copier(donnees.journalAudit);
    },

    // ------------------------------------------------------
    // Outils d'intervention (brique produit n°2) : quels outils
    // réglementaires ont servi à quel mouvement.
    // ------------------------------------------------------
    async getOutilsMouvement(mouvementId) {
      trouverMouvement(mouvementId);
      // Outil résolu AU PRÉSENT (marque/modèle) ; statutFige/echeanceFigee
      // restent la vérité opposable (figés à la validation). Tri contractuel
      // en JS par typeOutil puis outillageId (jamais d'ORDER BY).
      return donnees.mouvementOutillage
        .filter((l) => l.mouvementId === mouvementId)
        .map((l) => {
          const outil = donnees.outillage.find((o) => o.id === l.outillageId);
          return {
            outillageId: l.outillageId,
            typeOutil: outil?.typeOutil ?? null,
            marque: outil?.marque ?? null,
            modele: outil?.modele ?? null,
            numSerie: outil?.numSerie ?? null,
            statutFige: l.statutFige ?? null,
            echeanceFigee: l.echeanceFigee ?? null
          };
        })
        .sort((a, b) => {
          const ta = a.typeOutil ?? ''; const tb = b.typeOutil ?? '';
          if (ta !== tb) return ta < tb ? -1 : 1;
          return a.outillageId < b.outillageId ? -1
            : (a.outillageId > b.outillageId ? 1 : 0);
        });
    },

    // ------------------------------------------------------
    // Mutations : machines
    // ------------------------------------------------------
    async createMachine(donneesMachine) {
      const d = donneesMachine || {};
      if (!d.designation || !String(d.designation).trim()) {
        throw new Error('Désignation de la machine obligatoire.');
      }
      if (!indexFluides().has(d.fluide)) {
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
      const client = d.clientId
        ? donnees.clients.find((c) => c.id === d.clientId)
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
        if (donnees.machines.some((m) => normaliserCodeMachine(m.code) === code)) {
          throw new Error(`Code machine déjà utilisé : ${code}.`);
        }
      } else {
        const maxCode = donnees.machines.reduce((max, m) => {
          const n = Number(String(m.code || '').replace(/^M/, ''));
          return Number.isFinite(n) ? Math.max(max, n) : max;
        }, 0);
        code = `M${maxCode + 1}`;
      }

      const machine = {
        id: genId('mac'),
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
        siteLabel: d.siteLabel ?? client?.raisonSociale ?? null,
        statut: d.statut ?? 'EN_SERVICE',
        typeInstallation: d.typeInstallation ?? 'FIXE',
        detectionPermanente: Boolean(d.detectionPermanente),
        dateMiseEnService: d.dateMiseEnService ?? null,
        dernierControle: d.dernierControle ?? null,
        prochainControle: d.prochainControle ?? null,
        // Identifiant opaque QR (V9.1) : généré une fois, jamais modifiable
        // (updateMachine ne le liste pas dans ses CHAMPS).
        codePublic: codePublicUnique(donnees.machines)
      };
      donnees.machines.push(machine);
      journaliser(d.operateur, 'CREATION_MACHINE', machine.code,
        `${machine.designation} (${machine.fluide})`);
      persisterEtNotifier();
      return copier(machine);
    },

    async updateMachine(id, donneesMachine) {
      const machine = trouverMachine(id);
      if (machine.statut === 'DEMANTELEE') {
        throw new Error('Machine démantelée : modification interdite.');
      }
      const d = donneesMachine || {};
      if (d.fluide !== undefined && !indexFluides().has(d.fluide)) {
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
      // normalisé, validé, unique. Les libellés dénormalisés des
      // écritures scellées (machineLabel) restent figés, par principe.
      let ancienCode = null;
      if (d.code !== undefined) {
        const code = normaliserCodeMachine(d.code);
        const erreur = validerCodeMachine(code);
        if (erreur) throw new Error(erreur);
        if (donnees.machines.some((m) => m.id !== machine.id
            && normaliserCodeMachine(m.code) === code)) {
          throw new Error(`Code machine déjà utilisé : ${code}.`);
        }
        if (code !== machine.code) { ancienCode = machine.code; machine.code = code; }
      }
      const CHAMPS = ['designation', 'type', 'marque', 'modele', 'numSerie',
        'fluide', 'chargeNominaleKg', 'chargeActuelleKg', 'clientId',
        'localisation', 'siteLabel', 'statut', 'typeInstallation',
        'detectionPermanente',
        'dateMiseEnService', 'dernierControle', 'prochainControle'];
      for (const champ of CHAMPS) {
        if (d[champ] !== undefined) machine[champ] = d[champ];
      }
      const champsModifies = Object.keys(d).filter((c) => CHAMPS.includes(c));
      if (ancienCode) champsModifies.unshift(`code ${ancienCode} → ${machine.code}`);
      journaliser(d.operateur, 'MODIFICATION_MACHINE', machine.code,
        `Champs : ${champsModifies.join(', ')}`);
      persisterEtNotifier();
      return copier(machine);
    },

    /**
     * IM-4 : met une machine à l'ARRÊT (elle sort des compteurs
     * « en service » mais reste au parc, fluide compris).
     */
    async arreterMachine(id, operateur) {
      const machine = trouverMachine(id);
      if (machine.statut === 'DEMANTELEE') {
        throw new Error('Machine démantelée : arrêt sans objet.');
      }
      if (machine.statut === 'ARRETEE') {
        throw new Error(`Machine ${machine.code} déjà à l’arrêt.`);
      }
      machine.statut = 'ARRETEE';
      journaliser(operateur, 'ARRET_MACHINE', machine.code,
        `${machine.designation} mise à l’arrêt`);
      persisterEtNotifier();
      return copier(machine);
    },

    /**
     * IM-4 : démantèle une machine. Exige une charge résiduelle
     * quasi nulle (± 0,05 kg) : le fluide doit d'abord être récupéré
     * (mouvement RECUPERATION_DEMANTELEMENT). Définitif.
     */
    async demantelerMachine(id, operateur) {
      const machine = trouverMachine(id);
      if (machine.statut === 'DEMANTELEE') {
        throw new Error(`Machine ${machine.code} déjà démantelée.`);
      }
      if (Math.abs(machine.chargeActuelleKg) >
          TOLERANCE_CHARGE_RESIDUELLE_KG) {
        throw new Error(
          `Démantèlement impossible : la machine ${machine.code} contient ` +
          `encore ${machine.chargeActuelleKg} kg de fluide. Récupérez ` +
          'd’abord le fluide (mouvement « Récupération — démantèlement »).');
      }
      machine.statut = 'DEMANTELEE';
      journaliser(operateur, 'DEMANTELEMENT_MACHINE', machine.code,
        `${machine.designation} démantelée (charge résiduelle ` +
        `${machine.chargeActuelleKg} kg)`);
      persisterEtNotifier();
      return copier(machine);
    },

    /** IM-4 : remet en service une machine à l'arrêt. */
    async remettreEnService(id, operateur) {
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
      machine.statut = 'EN_SERVICE';
      journaliser(operateur, 'REMISE_EN_SERVICE_MACHINE', machine.code,
        `${machine.designation} remise en service`);
      persisterEtNotifier();
      return copier(machine);
    },

    // ------------------------------------------------------
    // Mutations : clients / détenteurs (IM-11)
    // ------------------------------------------------------
    async createClient(donneesClient) {
      const d = donneesClient || {};
      const raisonSociale = String(d.raisonSociale || '').trim();
      if (!raisonSociale) {
        throw new Error('Raison sociale obligatoire.');
      }
      const adresse = String(d.adresse || '').trim();
      if (!adresse) {
        throw new Error('Adresse obligatoire.');
      }
      // SIRET OPTIONNEL : validé seulement s'il est renseigné (cf. LocalStore).
      const siret = String(d.siret || '').trim();
      if (siret && !/^\d{14}$/.test(siret.replace(/[\s.-]/g, ''))) {
        throw new Error('SIRET invalide : 14 chiffres attendus.');
      }
      const texteOuNull = (v) => (v !== undefined && String(v).trim() !== ''
        ? String(v).trim() : null);
      const client = {
        id: genId('cli'),
        raisonSociale,
        adresse,
        siret,
        contact: texteOuNull(d.contact),
        email: texteOuNull(d.email),
        telephone: texteOuNull(d.telephone),
        codePublic: codePublicUnique(donnees.clients),
        actif: true,
        nbMachines: 0
      };
      donnees.clients.push(client);
      journaliser(d.operateur, 'CREATION_CLIENT', client.raisonSociale,
        siret ? `SIRET ${siret}` : 'sans SIRET');
      persisterEtNotifier();
      return copier(client);
    },

    async updateClient(id, donneesClient) {
      const client = donnees.clients.find((c) => c.id === id);
      if (!client) {
        throw new Error(`Client / détenteur introuvable : ${id}.`);
      }
      const d = donneesClient || {};
      if (d.siret !== undefined && String(d.siret).trim() !== '' &&
          !/^\d{14}$/.test(String(d.siret).trim().replace(/[\s.-]/g, ''))) {
        throw new Error('SIRET invalide : 14 chiffres attendus.');
      }
      const CHAMPS_TEXTE = ['raisonSociale', 'adresse', 'siret', 'contact',
        'email', 'telephone'];
      const modifies = [];
      for (const champ of CHAMPS_TEXTE) {
        if (d[champ] !== undefined) {
          client[champ] = String(d[champ]).trim();
          modifies.push(champ);
        }
      }
      if (d.actif !== undefined) {
        client.actif = Boolean(d.actif);
        modifies.push('actif');
      }
      journaliser(d.operateur, 'MODIFICATION_CLIENT', client.raisonSociale,
        `Champs : ${modifies.join(', ')}`);
      persisterEtNotifier();
      return copier(client);
    },

    // ------------------------------------------------------
    // Mutations : bouteilles
    // ------------------------------------------------------
    async createBouteille(donneesBouteille) {
      const d = donneesBouteille || {};
      if (!indexFluides().has(d.fluide)) {
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

      // Code lisible : B-06, B-07… d'après le plus grand code existant
      const maxCode = donnees.bouteilles.reduce((max, b) => {
        const n = Number(String(b.code || '').replace(/^B-?/, ''));
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 0);

      const bouteille = {
        id: genId('bou'),
        code: `B-${String(maxCode + 1).padStart(2, '0')}`,
        numeroReel: d.numeroReel ?? null,
        type: d.type,
        fluide: d.fluide,
        etatFluide,
        tareKg: tare,
        masseBruteKg: arrondir(brute),
        masseNetteKg: nette,
        // CR-4 : masse nette à l'ENTRÉE en stock, FIGÉE à la création —
        // le poste « achats » de la balance matière lit cette valeur,
        // jamais la masse nette courante (qui baisse à chaque charge).
        masseEntreeKg: nette,
        contenanceMaxKg: contenance,
        proprietaire: d.proprietaire ?? null,
        lot: d.lot ?? null,
        dateEntree: d.dateEntree ?? aujourdHui(),
        datePesee: d.datePesee ?? aujourdHui(),
        statut: d.statut ?? 'EN_STOCK',
        // R2 : versements tracés d'une bouteille MELANGE ; null hors
        // MELANGE, amorcée ci-dessous sinon.
        compositionMelange: null,
        // Identifiant opaque QR (parité machines V9.1) : généré une fois,
        // jamais modifiable (updateBouteille ne le liste pas dans CHAMPS).
        codePublic: codePublicUnique(donnees.bouteilles)
      };
      // R2 : bouteille créée MELANGE → composition amorcée avec son
      // contenu initial (l'étiquette courante), sans quoi le premier
      // versement croisé, même minoritaire, volerait l'étiquette.
      if (bouteille.etatFluide === 'MELANGE') {
        amorcerCompositionMelange(bouteille, bouteille.dateEntree);
      }
      donnees.bouteilles.push(bouteille);
      journaliser(d.operateur, 'CREATION_BOUTEILLE', bouteille.code,
        `${bouteille.type} ${bouteille.fluide} (${bouteille.contenanceMaxKg} kg)`);
      persisterEtNotifier();
      return copier(bouteille);
    },

    async updateBouteille(id, donneesBouteille) {
      const bouteille = trouverBouteille(id);
      const d = donneesBouteille || {};
      if (d.fluide !== undefined && !indexFluides().has(d.fluide)) {
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
      for (const champ of CHAMPS) {
        if (d[champ] !== undefined) bouteille[champ] = d[champ];
      }
      // Cohérence : la masse nette découle toujours de brute − tare
      if (d.masseBruteKg !== undefined || d.tareKg !== undefined) {
        const nette = arrondir(bouteille.masseBruteKg - bouteille.tareKg);
        if (nette < 0) {
          throw new Error('Masse brute inférieure à la tare : pesée incohérente.');
        }
        if (nette > bouteille.contenanceMaxKg) {
          throw new Error('Masse nette supérieure à la contenance de la bouteille.');
        }
        bouteille.masseNetteKg = nette;
      }
      // R2 : bouteille DEVENUE MELANGE (ou MELANGE sans composition) →
      // amorce avec le contenu courant, comme à la création.
      if (bouteille.etatFluide === 'MELANGE') {
        amorcerCompositionMelange(bouteille);
      }
      journaliser(d.operateur, 'MODIFICATION_BOUTEILLE', bouteille.code,
        `Champs : ${Object.keys(d).filter((c) => CHAMPS.includes(c)).join(', ')}`);
      persisterEtNotifier();
      return copier(bouteille);
    },

    async peserBouteille(id, masseBruteKg, operateur) {
      const bouteille = trouverBouteille(id);
      // IM-5 durci (brique ②) : une bouteille sortie du stock ne se pèse
      // plus — une pesée postérieure à un retour fournisseur ou une sortie
      // déchet rendrait la chronologie d'audit incohérente (masse réécrite
      // après le départ physique du contenant).
      if (bouteille.statut === 'RETOURNEE' || bouteille.statut === 'DECHET') {
        throw new Error(
          'Bouteille sortie du stock (retournée ou déchet) : pesée impossible.');
      }
      const brute = Number(masseBruteKg);
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
      bouteille.masseBruteKg = arrondir(brute);
      bouteille.masseNetteKg = nette;
      bouteille.datePesee = aujourdHui();
      journaliser(operateur, 'PESEE_BOUTEILLE', bouteille.code,
        `Brute ${bouteille.masseBruteKg} kg → nette ${nette} kg`);
      persisterEtNotifier();
      return copier(bouteille);
    },

    // ------------------------------------------------------
    // Mutations : contrôles d'étanchéité
    // ------------------------------------------------------
    async createControle(donneesControle) {
      const d = donneesControle || {};
      // P7-c (option A) : le handler DIRECT est FORMATION-only PAR NATURE —
      // refus STRUCTUREL du mode OFFICIEL, qui tient verrou de livraison
      // ouvert OU fermé (remplace le colmatage conjoncturel P0-2). L'officiel
      // ne passe QUE par le parcours mouvement de type CONTROLE (P7-a/b :
      // signatures, PDF conservé, scellement, WORM). Le contrôle LIÉ (né de
      // validerMouvement via enregistrerControle) n'emprunte pas ce chemin :
      // il hérite le mode du mouvement, gardé par les 3 moments officiels.
      if (d.mode === 'OFFICIEL') {
        throw new Error(MSG_CONTROLE_DIRECT_OFFICIEL);
      }
      // P7-e : le lien contrôle ↔ mouvement naît EXCLUSIVEMENT de la
      // validation d'un mouvement (CR-3) — un mouvementId forgé par le
      // chemin direct fabriquerait un faux rattachement au registre
      // scellé (reste consigné de l'audit, fermé ici ; le serveur
      // l'insérait, la démo l'ignorait : refus UNIFIÉ des deux côtés).
      if (d.mouvementId) {
        throw new Error('Lien de mouvement refusé : le contrôle lié à une '
          + 'écriture naît de sa validation, jamais du chemin direct.');
      }
      const controle = enregistrerControle(d);
      persisterEtNotifier();
      return copier(controle);
    },

    /**
     * R3/R4 : trace a posteriori la réparation d'un contrôle FUITE
     * (date réelle, nature, réparateur). Ne touche PAS machine.statut :
     * le retour EN_SERVICE (R4) exige un contrôle CONFORME postérieur,
     * jamais la réparation seule. Ne crée PAS de nouveau contrôle.
     */
    async tracerReparation(controleId, d) {
      const donneesReparation = d || {};
      const controle = donnees.controles.find((c) => c.id === controleId);
      if (!controle) {
        throw new Error(`Contrôle introuvable : ${controleId}.`);
      }
      if (controle.resultat !== 'FUITE') {
        throw new Error(
          'Seul un contrôle FUITE peut recevoir une réparation tracée.');
      }
      const dateReparation = String(donneesReparation.dateReparation || '').trim();
      const natureReparation = String(donneesReparation.natureReparation || '').trim();
      const reparateur = String(donneesReparation.reparateur || '').trim();
      if (!dateReparation || !natureReparation || !reparateur) {
        throw new Error(
          'Réparation incomplète : date, nature et réparateur sont obligatoires.');
      }
      // P0-6 (revue I-1) : la date de réparation est la CHEVILLE de la
      // clôture stricte J+1 — sans ces gardes, une réparation antidatée
      // ou au format horaire contournait la règle des 24 h.
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
      if (controleAnnule(controle)) {
        throw new Error('Contrôle annulé (contre-écriture) : il ne peut '
          + 'plus recevoir de réparation tracée.');
      }
      controle.dateReparation = dateReparation;
      controle.natureReparation = natureReparation;
      controle.reparateur = reparateur;
      controle.reparateurId = donneesReparation.reparateurId || null;

      journaliser(reparateur, 'TRACE_REPARATION', controle.machineLabel,
        `Contrôle ${controle.id} · ${natureReparation}`);
      persisterEtNotifier();
      return copier(controle);
    },

    /**
     * IM-1 : date du PROCHAIN contrôle d'étanchéité calculée depuis
     * la fréquence réglementaire — même logique que le cadre 7 du
     * CERFA (HCFC en kg, HFC/PFC en t éq. CO₂, HFO en kg, croisée
     * avec la détection permanente).
     * @param {string} machineId
     * @param {string} [dateControleISO] date du contrôle (défaut : aujourd'hui)
     * @returns {Promise<string|null>} date ISO, ou null si la machine
     *   est hors périmètre F-Gas (aucun contrôle périodique exigé)
     */
    async calculerProchainControle(machineId, dateControleISO) {
      const machine = trouverMachine(machineId);
      const fluideRef = donnees.fluides.find(
        (f) => f.code === machine.fluide) ?? null;
      // La date du contrôle fixe le régime applicable (HFO purs contrôlés
      // seulement depuis le 11/03/2024) — miroir du serveur.
      const dateControle = dateControleISO ?? aujourdHui();
      const { frequenceMois } = evaluerControle(
        fluideRef, machine.chargeNominaleKg,
        Boolean(machine.detectionPermanente), dateControle);
      if (!frequenceMois) return null;
      return ajouterMois(dateControle, frequenceMois);
    },

    // ------------------------------------------------------
    // Mutations : cycle de vie des mouvements (registre)
    // ------------------------------------------------------
    async creerMouvement(donneesMouvement) {
      const d = donneesMouvement || {};
      if (!TYPES_MOUVEMENT.includes(d.type)) {
        throw new Error(
          `Type de mouvement obligatoire parmi : ${TYPES_MOUVEMENT.join(', ')}.`);
      }
      // Blocage dur du mode OFFICIEL (lot B) : 1er des 3 moments (PASSAGE).
      // Les conditions bloquantes (docs/CONDITIONS-BLOCANTES-OFFICIEL.md)
      // sont évaluées ; le VERROU DE LIVRAISON (lots C et D non livrés)
      // maintient le refus TOTAL — remplace le verrou du 15/07 en le
      // motivant. Parité stricte avec le serveur (api.js creerMouvement).
      if (d.mode === 'OFFICIEL') {
        const verdict = evaluerOfficiel('PASSAGE', null);
        if (!verdict.ok) {
          throw new Error(messageRefusOfficiel(verdict.blocages));
        }
      }
      const mode = d.mode === 'OFFICIEL' ? 'OFFICIEL' : 'FORMATION';
      // Références vérifiées dès le brouillon si fournies
      const machine = d.machineId ? trouverMachine(d.machineId) : null;
      if (d.bouteilleSrcId) trouverBouteille(d.bouteilleSrcId, 'Bouteille source');
      if (d.bouteilleDstId) {
        trouverBouteille(d.bouteilleDstId, 'Bouteille de destination');
      }
      // Rôles réels de l'intervention (chantier B2) : références vérifiées dès
      // le brouillon si fournies. Aucune EXIGENCE d'habilitation ici (Phase 1
      // ne bloque rien) — seulement l'existence de la personne désignée.
      if (d.executeParId) trouverPersonne(d.executeParId);
      if (d.superviseurId) trouverPersonne(d.superviseurId);
      if (d.responsableRegistreId) trouverPersonne(d.responsableRegistreId);

      // Outils réglementaires déclarés (brique produit n°2) : existence
      // vérifiée dès le brouillon, dédupliqués. Les liens sont posés APRÈS
      // le mouvement (plus bas) ; leur état sera FIGÉ à la validation.
      const outilsIds = [...new Set(
        (Array.isArray(d.outilsIds) ? d.outilsIds : []).filter(Boolean))];
      for (const idOutil of outilsIds) trouverOutil(idOutil);

      // Forme CANONIQUE du contrôle déclaré : STRICTEMENT les clés que le
      // serveur SQL restitue à la relecture (reconstituerMouvement d'api.js)
      // — localisationFuite SEULEMENT si renseignée. L'empreinte SHA-256
      // couvre l'objet controle entier et JSON.stringify est sensible à la
      // PRÉSENCE des clés : une clé à null ici casserait la chaîne au
      // premier échange démo ↔ local (faux « registre altéré »).
      const controleDeclare = {
        statutControle: d.controle?.statutControle ?? 'SANS_OBJET',
        detecteurId: d.controle?.detecteurId ?? null
      };
      if (d.controle?.localisationFuite != null) {
        controleDeclare.localisationFuite = d.controle.localisationFuite;
      }

      const mouvement = {
        id: genId('mvt'),
        numero: prochainNumero(mode),
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
        controle: controleDeclare,
        signatureDataUrl: d.signatureDataUrl ?? null,
        technicien: d.technicien ?? null,
        validateurId: null,
        // Rôles réels (chantier B2) : toujours présents (null par défaut) pour
        // que la couverture mapping les voie ; HORS empreinte de hachage.
        // `|| null` (pas `??`) : une chaîne vide (select non renseigné) devient
        // null — sinon la garde truthy la laisse passer et '' serait stocké.
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
        // Toujours présents (couverture mapping), HORS liste blanche v1 du
        // hasseur : les chaînes existantes restent intactes.
        revisionBrouillon: 0,
        versionEmpreinte: 1,
        outilsFiges: null,
        hashSignatures: null,
        hashPiecesJointes: null,
        hashPdfFinal: null
      };
      donnees.mouvements.push(mouvement);
      for (const idOutil of outilsIds) {
        donnees.mouvementOutillage.push({
          id: genId('mou'),
          mouvementId: mouvement.id,
          outillageId: idOutil,
          statutFige: null,
          echeanceFigee: null
        });
      }
      journaliser(mouvement.technicien, 'CREATION_MOUVEMENT', mouvement.numero,
        `${mouvement.type} (brouillon)`);
      persisterEtNotifier();
      return copier(mouvement);
    },

    async soumettreMouvement(id) {
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
        const verdict = evaluerOfficiel('SOUMISSION', cadreFicheOfficiel(mouvement));
        if (!verdict.ok) {
          throw new Error(messageRefusOfficiel(verdict.blocages));
        }
      }
      mouvement.statut = 'SOUMIS';
      // IM-3 : date de soumission (base de l'alerte « à valider »).
      // Champ HORS de l'empreinte : il ne fige rien.
      mouvement.dateSoumission = aujourdHui();
      journaliser(mouvement.technicien, 'SOUMISSION_MOUVEMENT',
        mouvement.numero, mouvement.type);
      persisterEtNotifier();
      return copier(mouvement);
    },

    /**
     * CR-1 : supprime un mouvement resté en BROUILLON (abandon du
     * wizard, erreur de saisie). Un brouillon n'a AUCUN effet sur les
     * stocks ni sur la chaîne d'intégrité : sa suppression est sûre.
     */
    async supprimerMouvement(id, operateur) {
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
      const indice = donnees.mouvements.findIndex((mv) => mv.id === id);
      donnees.mouvements.splice(indice, 1);
      // Les liens d'outils d'un brouillon partent avec lui (aucun effet).
      donnees.mouvementOutillage = donnees.mouvementOutillage
        .filter((l) => l.mouvementId !== id);
      // Lot C (C1) : ses signatures partent avec lui (seul cas de
      // suppression admis par le WORM — la trace reste au journal chaîné,
      // une entrée SIGNATURE_MOUVEMENT par signature posée).
      donnees.signaturesMouvement = (donnees.signaturesMouvement ?? [])
        .filter((sig) => sig.mouvementId !== id);
      journaliser(operateur ?? mouvement.technicien, 'SUPPRESSION_MOUVEMENT',
        mouvement.numero, `${mouvement.type} (brouillon supprimé)`);
      persisterEtNotifier();
      return true;
    },

    /**
     * CR-1 : rejette un mouvement SOUMIS (validateur pas d'accord) —
     * retour en BROUILLON avec le motif du rejet, pour reprise.
     */
    async rejeterMouvement(id, motif) {
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
      mouvement.statut = 'BROUILLON';
      mouvement.motifRejet = String(motif).trim();
      // Lot C (C1) : un rejet renvoie la fiche en correction — révision
      // incrémentée, les signatures posées deviennent PÉRIMÉES (comparaison).
      mouvement.revisionBrouillon = (mouvement.revisionBrouillon ?? 0) + 1;
      journaliser(null, 'REJET_MOUVEMENT', mouvement.numero,
        `${mouvement.type} · motif : ${mouvement.motifRejet}`);
      persisterEtNotifier();
      return copier(mouvement);
    },

    /**
     * Lot C (brique C1) — signature RÉELLE d'un mouvement BROUILLON :
     * TECHNICIEN d'abord, DETENTEUR ensuite (même révision — au lycée le
     * professeur signe détenteur PAR DÉLÉGATION, décision Franck 16/07).
     * La déclaration est composée ICI (signatures-mouvement.js), jamais
     * reçue du client ; l'image est un PNG contrôlé (nombres magiques,
     * ≥ 1 Ko, ≤ 1 Mo) ; la signature fige l'empreinte du document et la
     * révision signée — toute modification ultérieure du brouillon la rend
     * PÉRIMÉE (par comparaison : on ne retouche ni ne supprime JAMAIS une
     * signature posée).
     */
    async signerMouvement(mouvementId, signature) {
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
        const techValide = (donnees.signaturesMouvement ?? []).some((sig) =>
          sig.mouvementId === mouvement.id && sig.role === 'TECHNICIEN' &&
          (sig.versionDocument ?? 0) === revision);
        if (!techValide) {
          throw new Error('Signature du détenteur refusée : le technicien ' +
            'signe en premier (signature du technicien absente ou périmée).');
        }
      }
      if (!s.imagePng) throw new Error(MSG_TRACE_ABSENT);
      let octets;
      try {
        octets = base64VersOctets(s.imagePng);
      } catch {
        throw new Error(MSG_PAS_PNG);
      }
      const illisible = verifierImageSignature(octets);
      if (illisible) throw new Error(illisible);

      const enregistrement = {
        id: genId('sig'),
        mouvementId: mouvement.id,
        role: s.role,
        nom,
        prenom,
        qualite: String(s.qualite ?? '').trim() || null,
        organisation,
        parDelegation,
        dateHeure: new Date().toISOString(),
        declaration: declarationSignature(s.role, parDelegation, organisation),
        // Base64 CANONIQUE, ré-encodée des octets contrôlés (parité stricte
        // avec le serveur, quel que soit le préfixe data: d'entrée).
        imagePng: await versBase64(octets),
        // Pas de session en démonstration : témoin d'identité porté par le
        // serveur seulement (parité assumée, comme les gardes de rôle).
        sessionCompteId: null,
        sessionPersonnelId: null,
        // Empreinte de la fiche TELLE QUE PRÉSENTÉE au signataire (objet
        // logique, même projection que la chaîne, sans chaînage).
        sha256Document: await hasherEcriture(mouvement, null),
        versionDocument: revision
      };
      donnees.signaturesMouvement = donnees.signaturesMouvement ?? [];
      donnees.signaturesMouvement.push(enregistrement);
      journaliser(`${prenom} ${nom}`, 'SIGNATURE_MOUVEMENT', mouvement.numero,
        `${s.role}${parDelegation ? ` (par délégation : ${organisation})` : ''}` +
        ` · révision ${revision}` +
        ` · document ${enregistrement.sha256Document.slice(0, 12)}…`);
      persisterEtNotifier();
      return { ...copier(enregistrement), valide: true };
    },

    /** Lot C (C1) : les signatures réelles d'un mouvement, avec leur état. */
    /**
     * Lot E ① : export RGPD des données d'une personne (accès/portabilité).
     * Compose les getters existants (parité prouvée) + les signatures brutes,
     * puis délègue l'assemblage au module pur partagé.
     */
    async exporterDonneesPersonne(personneId) {
      const sources = {
        personnel: await store.getPersonnel(),
        habilitations: await store.getHabilitations(),
        mentions: await store.getMentions(),
        signaturesMouvement: (donnees.signaturesMouvement ?? []).map(copier),
        mouvements: await store.getMouvements(),
        controles: await store.getControles(),
        piecesJointes: await store.listerPiecesJointes('personne', personneId)
      };
      const exportPersonne = assemblerExportPersonne(
        personneId, sources, new Date().toISOString());
      // Lot E2 : personne AU COFFRE → noms des signatures substitués par le
      // pseudonyme + mention (miroir exact du serveur).
      if (estAuCoffre(personneId)) {
        const fiche = exportPersonne.personne;
        exportPersonne.signatures = exportPersonne.signatures.map((s) => ({
          ...s, nom: fiche.nom, prenom: fiche.prenom }));
        exportPersonne.identiteAuCoffre =
          'Identité au coffre : la consultation des données réelles passe ' +
          'par le geste dédié (Protection des données), motif et journal.';
      }
      return exportPersonne;
    },

    async getSignaturesMouvement(mouvementId) {
      const mouvement = trouverMouvement(mouvementId);
      const revision = mouvement.revisionBrouillon ?? 0;
      return (donnees.signaturesMouvement ?? [])
        .filter((sig) => sig.mouvementId === mouvement.id)
        .sort((a, b) => {
          if (a.dateHeure !== b.dateHeure) {
            return a.dateHeure < b.dateHeure ? -1 : 1;
          }
          return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
        })
        .map((sig) => ({ ...copier(sig),
          valide: (sig.versionDocument ?? 0) === revision }));
    },

    async validerMouvement(id, validateurId, pdfFinalBase64 = null) {
      const mouvement = trouverMouvement(id);
      if (mouvement.statut === 'VALIDE' || mouvement.statut === 'ANNULE') {
        throw new Error(MSG_ECRITURE_FIGEE);
      }
      if (mouvement.statut !== 'SOUMIS') {
        throw new Error('Seul un mouvement soumis peut être validé.');
      }
      const validateur = verifierValidateur(validateurId);
      // Lot C (C3) : le PDF final présenté aux signataires est REÇU à la
      // validation OFFICIELLE et contrôlé AVANT le verdict du moteur (les
      // refus PDF restent ainsi éprouvables verrou de livraison fermé —
      // même ordre que le serveur). En FORMATION, rien ne change : un PDF
      // fourni est refusé (plan lot C §2.4).
      let octetsPdfFinal = null;
      // Brique C5 : le TRANSFERT est EXEMPTÉ du PDF final (arbitrage
      // Franck 19/07 — jamais de CERFA, IM-12) ; un PDF fourni malgré
      // tout est refusé, comme hors mode Officiel.
      if (mouvement.mode === 'OFFICIEL' && pdfFinalAttendu(mouvement.type)) {
        if (!pdfFinalBase64) throw new Error(MSG_PDF_FINAL_MANQUANT);
        octetsPdfFinal = await octetsDepuis(pdfFinalBase64);
        const controlePdf = verifierOctetsPdfFinal(octetsPdfFinal);
        if (!controlePdf.ok) throw new Error(controlePdf.erreur);
      } else if (pdfFinalBase64) {
        throw new Error(mouvement.mode === 'OFFICIEL'
          ? MSG_PDF_FINAL_TRANSFERT : MSG_PDF_FINAL_HORS_OFFICIEL);
      }
      // Blocage dur OFFICIEL (lot B) : 3e moment (VALIDATION), AVANT tout
      // effet — signature comprise. La démo n'a ni session ni poste : la
      // condition « validateur = personne connectée » est portée par le
      // serveur (comme les gardes de rôle).
      if (mouvement.mode === 'OFFICIEL') {
        const verdict = evaluerOfficiel('VALIDATION', cadreFicheOfficiel(mouvement));
        if (!verdict.ok) {
          throw new Error(messageRefusOfficiel(verdict.blocages));
        }
      }

      // Règles métier + effets stocks/charges (throw si violation)
      appliquerEffets(mouvement);

      // CR-3 : le contrôle d'étanchéité déclaré à l'étape 5 du wizard
      // produit un VRAI contrôle lié (mêmes effets que createControle :
      // machine en statut FUITE si fuite, dernierControle mis à jour,
      // alerte). Référence croisée mouvement ↔ contrôle, posée AVANT
      // le scellement pour être couverte par l'empreinte.
      const declare = mouvement.controle || {};
      if (mouvement.machineId &&
          (declare.statutControle === 'CONFORME' ||
           declare.statutControle === 'FUITE')) {
        // P7-d : pour un mouvement DE TYPE CONTROLE (le contrôle est l'objet
        // de l'écriture), l'échéance suivante est CALCULÉE par la logique
        // réglementaire UNIQUE (cadre 7, même calcul que la méthode
        // calculerProchainControle du contrat) — jamais saisie librement.
        // Sans elle, la machine garderait son ancienne échéance et sonnerait
        // « en retard » après un contrôle tout frais. Le contrôle ACCESSOIRE
        // (charge/récupération) garde le comportement historique (aucune
        // mise à jour d'échéance). Parité stricte avec le serveur.
        let prochainCalcule = null;
        if (mouvement.type === 'CONTROLE_PERIODIQUE' ||
            mouvement.type === 'CONTROLE_NON_PERIODIQUE') {
          const machineDuControle = trouverMachine(mouvement.machineId);
          const fluideRef = donnees.fluides.find(
            (f) => f.code === machineDuControle.fluide) ?? null;
          const { frequenceMois } = evaluerControle(
            fluideRef, machineDuControle.chargeNominaleKg,
            Boolean(machineDuControle.detectionPermanente), mouvement.date);
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
          // Le contrôle lié EST la même fiche que le mouvement : il hérite de
          // son numéro et de son mode (CERFA identique de part et d'autre).
          numero: mouvement.numero,
          mode: mouvement.mode
        });
        controleLie.mouvementId = mouvement.id;
        mouvement.controle = { ...declare, controleId: controleLie.id };
      }

      // Brique produit n°2 : l'état des outils déclarés est FIGÉ au moment
      // où l'écriture devient opposable (« la balance était-elle étalonnée
      // CE jour-là ? ») — hors empreinte, table de liens séparée.
      const jourValidation = aujourdHui();
      const outilsFiges = [];
      for (const lien of donnees.mouvementOutillage) {
        if (lien.mouvementId !== mouvement.id) continue;
        const outil = donnees.outillage.find((o) => o.id === lien.outillageId);
        lien.statutFige = outil
          ? calculerStatutOutil(outil, jourValidation) : null;
        lien.echeanceFigee = outil?.prochaineEcheance ?? null;
        outilsFiges.push(`${lien.outillageId}=${lien.statutFige ?? 'DISPARU'}`);
      }
      outilsFiges.sort();

      mouvement.validateurId = validateurId;
      mouvement.statut = 'VALIDE';
      // IM-12 (SPEC §7.1) : un TRANSFERT entre contenants est une écriture
      // interne au registre — aucun numéro de fiche d'intervention attribué
      // (sinon la colonne CERFA et le compteur nbCerfa mentiraient).
      mouvement.cerfaNumero =
        mouvement.type === 'TRANSFERT' ? null : mouvement.numero;
      // Brique ② : PRP du fluide DU MOUVEMENT figé au moment où l'écriture
      // devient opposable (même moment que cerfaNumero, HORS empreinte —
      // le référentiel peut évoluer, l'écriture validée garde sa valeur).
      mouvement.prpFige =
        indexFluides().get(mouvement.fluide)?.gwpAr4 ?? null;
      // Lot C (C3) : le PDF final contrôlé plus haut devient une pièce
      // jointe SYSTÈME (catégorie CERFA_FINAL) — insérée DIRECTEMENT,
      // sans passer par ajouterPieceJointe : pas d'incrément de révision
      // (les signatures viennent d'être jugées valides par le moteur et
      // doivent le RESTER), pas de refus « écriture figée » à fermer en
      // C3c. Posée AVANT le calcul des champs gelés : son empreinte entre
      // dans hashPiecesJointes ET dans hashPdfFinal.
      let shaPdfFinal = null;
      if (octetsPdfFinal) {
        shaPdfFinal = await hasherOctets(octetsPdfFinal);
        const pjPdfFinal = {
          id: genId('pj'),
          entiteType: 'MOUVEMENT',
          entiteId: mouvement.id,
          categorie: CATEGORIE_PDF_FINAL,
          nomFichier: nomFichierPdfFinal(mouvement.numero),
          mimeType: 'application/pdf',
          taille: octetsPdfFinal.length,
          hashSha256: shaPdfFinal,
          dateAjout: new Date().toISOString(),
          ajoutePar: `${validateur.prenom} ${validateur.nom}`
        };
        await ecrireContenuPj(pjPdfFinal.id,
          { octets: octetsPdfFinal, mimeType: pjPdfFinal.mimeType });
        donnees.piecesJointes.push(pjPdfFinal);
      }
      // Lot C (C2) : champs GELÉS au scellement — calculés ICI, attachés à
      // l'objet AVANT sceller(), JAMAIS re-dérivés (la vérification de
      // chaîne relit les valeurs stockées ; un ajout légitime ultérieur,
      // PJ comprise, ne casse pas la chaîne). Miroir exact du serveur.
      mouvement.outilsFiges = outilsFiges;
      mouvement.hashSignatures = await empreinteListeSignatures(
        (donnees.signaturesMouvement ?? [])
          .filter((sig) => sig.mouvementId === mouvement.id));
      mouvement.hashPiecesJointes = await empreinteListeTriee(
        donnees.piecesJointes
          .filter((pj) => pj.entiteType === 'MOUVEMENT' &&
                          pj.entiteId === mouvement.id)
          .map((pj) => pj.hashSha256 ?? ''));
      mouvement.hashPdfFinal = shaPdfFinal;
      // Empreinte RENFORCÉE : toute NOUVELLE écriture scellée est v2 (les
      // écritures existantes gardent leur v1 — jamais rétroactif).
      mouvement.versionEmpreinte = 2;
      await sceller(mouvement);

      // Le PRP figé est consigné dans le journal (recoupement opposable —
      // parité stricte avec le serveur, dont le journal est chaîné).
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
      persisterEtNotifier();

      // IM-4 : une récupération-démantèlement qui VIDE la machine
      // (charge ≈ 0) invite l'interface à proposer le démantèlement —
      // proposition seulement, RIEN n'est appliqué ici.
      const resultat = copier(mouvement);
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
    },

    async annulerParContreEcriture(id, motif, validateurId) {
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

      // Effets inverses AVANT de figer quoi que ce soit (throw si impossible)
      appliquerEffetsInverses(original);

      const contreEcriture = {
        id: genId('mvt'),
        numero: prochainNumero(original.mode),
        date: aujourdHui(),
        mode: original.mode,
        type: original.type,
        machineId: original.machineId ?? null,
        machineLabel: original.machineLabel ?? null,
        fluide: original.fluide ?? null,
        // Quantité OPPOSÉE (le + 0 neutralise un éventuel « moins zéro »)
        quantiteKg: arrondir(-original.quantiteKg) + 0,
        // Pesées permutées : le fluide fait le chemin inverse
        peseeAvantKg: original.peseeApresKg ?? null,
        peseeApresKg: original.peseeAvantKg ?? null,
        bouteilleSrcId: original.bouteilleSrcId ?? null,
        bouteilleDstId: original.bouteilleDstId ?? null,
        causeMouvement: original.causeMouvement ?? null,
        controle: { statutControle: 'SANS_OBJET', detecteurId: null },
        signatureDataUrl: null,
        technicien: `${validateur.prenom} ${validateur.nom}`,
        motif: String(motif).trim(),
        validateurId,
        contreEcritureDe: original.id,
        statut: 'VALIDE',
        hashEcriture: null,
        hashPrecedent: null,
        cerfaNumero: null,
        // Lot C (C1) : mêmes clés que creerMouvement (couverture mapping).
        // Une contre-écriture se scelle SANS le parcours de double
        // signature (attestation d'identité du validateur, plan §9).
        revisionBrouillon: 0,
        versionEmpreinte: 1,
        outilsFiges: null,
        hashSignatures: null,
        hashPiecesJointes: null,
        hashPdfFinal: null
      };
      // IM-12 : même règle qu'à la validation — pas de CERFA pour un TRANSFERT
      contreEcriture.cerfaNumero =
        contreEcriture.type === 'TRANSFERT' ? null : contreEcriture.numero;
      // Brique ② : la contre-écriture fige le PRP à SA validation (même
      // fluide que l'original ; si le référentiel a bougé entre-temps, les
      // deux valeurs témoignent chacune de leur époque).
      contreEcriture.prpFige =
        indexFluides().get(contreEcriture.fluide)?.gwpAr4 ?? null;
      // Lot C (C2) : une contre-écriture se scelle en v2 SANS le parcours
      // de double signature (plan §9) — listes gelées VIDES (empreinte de
      // « [] », jamais null) et PDF final null. Miroir exact du serveur.
      contreEcriture.outilsFiges = [];
      contreEcriture.hashSignatures = await empreinteListeTriee([]);
      contreEcriture.hashPiecesJointes = await empreinteListeTriee([]);
      contreEcriture.hashPdfFinal = null;
      contreEcriture.versionEmpreinte = 2;
      await sceller(contreEcriture);
      donnees.mouvements.push(contreEcriture);

      // L'original change UNIQUEMENT de statut : ses données restent intactes
      original.statut = 'ANNULE';

      journaliser(`${validateur.prenom} ${validateur.nom}`,
        'CONTRE_ECRITURE', contreEcriture.numero,
        `Annule ${original.numero} · motif : ${contreEcriture.motif}`);
      persisterEtNotifier();
      return copier(contreEcriture);
    },

    // ------------------------------------------------------
    // Intégrité de la chaîne d'écritures
    // ------------------------------------------------------
    async verifierChaineHash() {
      return verifierChaineMouvements(donnees.mouvements);
    },

    /**
     * État d'intégrité du registre constaté au dernier chargement /
     * import (CR-5). L'application n'est JAMAIS bloquée : l'interface
     * peut afficher un bandeau « registre altéré ».
     * @returns {Promise<{altere: boolean, casseA: string|null}>}
     */
    async getEtatRegistre() {
      const etat = this.registreAltere;
      return {
        altere: Boolean(etat && etat.ok === false),
        casseA: etat?.casseA ?? null
      };
    },

    // ------------------------------------------------------
    // Statistiques CALCULÉES depuis les données
    // ------------------------------------------------------
    async getStats() {
      const fluides = indexFluides();
      const parc = machinesEnParc();

      // Charge totale du parc et équivalent CO₂ (kg × GWP / 1000)
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

      // Stock bouteilles : somme des masses nettes précalculées
      const stockBouteillesKg = donnees.bouteilles
        .reduce((somme, b) => somme + b.masseNetteKg, 0);

      // Conformité : part des contrôles conformes
      const nbControles = donnees.controles.length;
      const nbConformes = donnees.controles
        .filter((c) => c.resultat === 'CONFORME').length;
      const tauxConformitePct = nbControles
        ? Math.round((nbConformes / nbControles) * 100)
        : 100;

      // Opérateurs actifs : personnes ACTIVES du registre du personnel
      // (contrat Phase C — plus les intervenants déduits des écritures)
      const nbOperateursActifs =
        donnees.personnel.filter((p) => p.actif !== false).length;

      // Mouvements comptant dans les flux : écritures validées ou annulées
      // (les brouillons/soumis n'ont pas encore d'effet réel)
      const mouvementsEffectifs = donnees.mouvements.filter((mv) =>
        (mv.statut === 'VALIDE' || mv.statut === 'ANNULE') &&
        Number.isFinite(mv.quantiteKg));
      // Un TRANSFERT est interne au stock (bouteille → bouteille) : ni
      // charge, ni récupération dans les flux mensuels — aligné sur
      // calculerBalanceMatiere/getBilan (IM-12). nbFiches/nbMouvements
      // continuent de compter TOUS les mouvements (le transfert reste une
      // vraie écriture du registre, seul son classement en charge/récup change).
      const mouvementsFlux = mouvementsEffectifs.filter(
        (mv) => mv.type !== 'TRANSFERT');

      // IM-10 : flux mensuels sur une fenêtre GLISSANTE de 6 mois,
      // calée sur la donnée la plus récente (repli : aujourd'hui) —
      // plus aucun mois codé en dur.
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
        // IM-4 : les machines à l'arrêt ou démantelées ne comptent
        // pas « en service » (le fluide d'une machine à l'arrêt reste
        // compté dans la charge du parc : il est physiquement là).
        nbMachines: parc.filter((m) => m.statut !== 'ARRETEE').length,
        chargeParcKg,
        stockBouteillesKg,
        nbBouteilles: donnees.bouteilles.length,
        teqCo2Parc,
        nbCerfa: donnees.mouvements.filter((mv) => mv.cerfaNumero).length,
        nbFiches: donnees.mouvements.length,
        nbMouvements: donnees.mouvements.length,
        nbControles,
        tauxConformitePct,
        nbFuites: donnees.machines.filter((m) => m.statut === 'FUITE').length,
        nbOperateursActifs,
        chargeParFluide,
        fluxMensuels
      };
    },

    /**
     * IM-10 : années proposables aux vues Bilan / Balance — années
     * réellement présentes dans les données (mouvements, contrôles,
     * BSFF, retours fournisseur, inventaires) ∪ année de la dernière
     * écriture du journal ∪ 2026 (monde de démonstration).
     * @returns {Promise<number[]>} années triées décroissantes
     */
    async getAnneesDisponibles() {
      const annees = new Set([2026]);
      const ajouterAnneeDe = (iso) => {
        const annee = Number(String(iso || '').slice(0, 4));
        if (Number.isInteger(annee) && annee > 2000) annees.add(annee);
      };
      for (const mv of donnees.mouvements) ajouterAnneeDe(mv.date);
      for (const c of donnees.controles) ajouterAnneeDe(c.date);
      for (const bsff of donnees.bsff || []) ajouterAnneeDe(bsff.dateRemise);
      for (const retour of donnees.retoursFournisseur || []) {
        ajouterAnneeDe(retour.date);
      }
      for (const inventaire of donnees.inventaires || []) {
        if (Number.isInteger(inventaire.annee)) annees.add(inventaire.annee);
      }
      const derniereEcriture =
        donnees.journalAudit[donnees.journalAudit.length - 1];
      if (derniereEcriture) ajouterAnneeDe(derniereEcriture.date);
      return [...annees].sort((a, b) => b - a);
    },

    // ------------------------------------------------------
    // Bilan annuel CALCULÉ depuis les mouvements + le parc
    // ------------------------------------------------------
    async getBilan(annee) {
      const fluides = indexFluides();
      const prefixe = `${annee}-`;
      // Un TRANSFERT est un mouvement INTERNE au stock (bouteille → bouteille) :
      // ni charge, ni récupération — aligné sur calculerBalanceMatiere (IM-12).
      const mouvementsAnnee = donnees.mouvements
        .filter((mv) => mv.date.startsWith(prefixe) &&
          (mv.statut === 'VALIDE' || mv.statut === 'ANNULE') &&
          Number.isFinite(mv.quantiteKg) && mv.type !== 'TRANSFERT');

      // Cumuls chargé / récupéré par fluide sur l'année
      const parFluide = new Map();
      const ligneVide = () => ({ chargeKg: 0, recupereKg: 0, enParcKg: 0 });
      for (const mv of mouvementsAnnee) {
        if (!parFluide.has(mv.fluide)) parFluide.set(mv.fluide, ligneVide());
        const ligne = parFluide.get(mv.fluide);
        if (mv.quantiteKg >= 0) ligne.chargeKg += mv.quantiteKg;
        else ligne.recupereKg += Math.abs(mv.quantiteKg);
      }

      // Charge en parc par fluide (état courant)
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
    },

    // ------------------------------------------------------
    // Phase C : dossier opérateur (établissement, audits,
    // non-conformités)
    // ------------------------------------------------------
    async updateEtablissement(donneesEtab) {
      const d = donneesEtab || {};
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
      const champsModifies = [];
      for (const champ of CHAMPS) {
        if (d[champ] !== undefined) {
          donnees.etablissement[champ] = copier(d[champ]);
          champsModifies.push(champ);
        }
      }
      journaliser(d.operateur, 'MODIFICATION_ETABLISSEMENT',
        donnees.etablissement.raisonSociale,
        `Champs : ${champsModifies.join(', ')}`);
      persisterEtNotifier();
      return copier(donnees.etablissement);
    },

    async getAuditsOrganisme() {
      const liste = copier(donnees.auditsOrganisme);
      liste.sort((a, b) => b.date.localeCompare(a.date));
      return liste;
    },

    async createAuditOrganisme(donneesAudit) {
      const d = donneesAudit || {};
      if (!d.date) throw new Error('Date de l’audit obligatoire.');
      if (!d.organisme || !String(d.organisme).trim()) {
        throw new Error('Organisme certificateur obligatoire.');
      }
      if (!d.resultat || !String(d.resultat).trim()) {
        throw new Error('Résultat de l’audit obligatoire.');
      }
      const audit = {
        id: genId('aud'),
        date: d.date,
        organisme: String(d.organisme).trim(),
        resultat: String(d.resultat).trim(),
        remarques: d.remarques ?? null
      };
      donnees.auditsOrganisme.push(audit);
      // Le dossier opérateur suit le dernier audit connu
      if (!donnees.etablissement.dernierAudit ||
          audit.date > donnees.etablissement.dernierAudit) {
        donnees.etablissement.dernierAudit = audit.date;
      }
      journaliser(d.operateur, 'CREATION_AUDIT', audit.organisme,
        `${fmtDate(audit.date)} · ${audit.resultat}`);
      persisterEtNotifier();
      return copier(audit);
    },

    async getNonConformites() {
      return copier(donnees.nonConformites);
    },

    async createNonConformite(donneesNc) {
      const d = donneesNc || {};
      if (!d.description || !String(d.description).trim()) {
        throw new Error('Description de la non-conformité obligatoire.');
      }
      if (d.statut !== undefined && d.statut !== 'OUVERTE' &&
          d.statut !== 'SOLDEE') {
        throw new Error(
          'Statut de non-conformité inconnu : OUVERTE ou SOLDEE attendu.');
      }
      if (d.auditId &&
          !donnees.auditsOrganisme.some((a) => a.id === d.auditId)) {
        throw new Error(`Audit introuvable : ${d.auditId}.`);
      }
      const nonConformite = {
        id: genId('nc'),
        auditId: d.auditId ?? null,
        description: String(d.description).trim(),
        actionCorrective: d.actionCorrective ?? null,
        echeance: d.echeance ?? null,
        statut: d.statut ?? 'OUVERTE',
        dateSolde: null,
        commentaireSolde: null
      };
      donnees.nonConformites.push(nonConformite);
      journaliser(d.operateur, 'CREATION_NON_CONFORMITE', nonConformite.id,
        nonConformite.description);
      persisterEtNotifier();
      return copier(nonConformite);
    },

    async solderNonConformite(id, commentaire) {
      const nonConformite = donnees.nonConformites.find((nc) => nc.id === id);
      if (!nonConformite) {
        throw new Error(`Non-conformité introuvable : ${id}.`);
      }
      if (nonConformite.statut === 'SOLDEE') {
        throw new Error('Non-conformité déjà soldée.');
      }
      if (!commentaire || !String(commentaire).trim()) {
        throw new Error('Commentaire de solde obligatoire (preuve de l’action).');
      }
      nonConformite.statut = 'SOLDEE';
      nonConformite.dateSolde = aujourdHui();
      nonConformite.commentaireSolde = String(commentaire).trim();
      journaliser(null, 'SOLDE_NON_CONFORMITE', nonConformite.id,
        nonConformite.commentaireSolde);
      persisterEtNotifier();
      return copier(nonConformite);
    },

    // ------------------------------------------------------
    // Phase C : registre du personnel (JAMAIS de suppression —
    // une personne se DÉSACTIVE, sa trace reste)
    // ------------------------------------------------------
    async createPersonne(donneesPersonne) {
      const d = donneesPersonne || {};
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
        id: genId('per'),
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
      donnees.personnel.push(personne);
      journaliser(d.operateur, 'CREATION_PERSONNE',
        `${personne.prenom} ${personne.nom}`, personne.typePersonne);
      persisterEtNotifier();
      return copier(personne);
    },

    async updatePersonne(id, donneesPersonne) {
      const personne = trouverPersonne(id);
      // Lot E2 : une fiche au coffre est VERROUILLÉE côté store (l'écran
      // seul ne suffit pas — « le store reste seul juge »).
      if (estAuCoffre(id)) throw new Error(MSG_FICHE_AU_COFFRE);
      const d = donneesPersonne || {};
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
      for (const champ of CHAMPS) {
        if (d[champ] !== undefined) personne[champ] = copier(d[champ]);
      }
      journaliser(d.operateur, 'MODIFICATION_PERSONNE',
        `${personne.prenom} ${personne.nom}`,
        `Champs : ${Object.keys(d).filter((c) => CHAMPS.includes(c)).join(', ')}`);
      persisterEtNotifier();
      return copier(personne);
    },

    async desactiverPersonne(id, operateur) {
      const personne = trouverPersonne(id);
      // Lot E2 : fiche au coffre = intouchable (déjà inactive de toute façon).
      if (estAuCoffre(id)) throw new Error(MSG_FICHE_AU_COFFRE);
      if (!personne.actif) {
        throw new Error(
          `${personne.prenom} ${personne.nom} est déjà désactivé(e).`);
      }
      personne.actif = false;
      journaliser(operateur, 'DESACTIVATION_PERSONNE',
        `${personne.prenom} ${personne.nom}`,
        'Désactivation (la personne reste au registre : aucune suppression)');
      persisterEtNotifier();
      return copier(personne);
    },

    // ------------------------------------------------------
    // Coffre des identités (lot E2 — RGPD) : SIMULATION démo.
    // Mêmes flux, mêmes refus, mêmes messages que le serveur ;
    // enveloppes balisées PREFIXE_SIMULATION (jamais en base réelle),
    // phrase d'exercice en mémoire de session UNIQUEMENT.
    // ------------------------------------------------------

    async etatCoffre() {
      const identites = (donnees.coffreIdentites ?? [])
        .map((c) => ({
          personnelId: c.personnelId,
          pseudonyme: c.pseudonyme,
          dateMiseALabri: c.dateMiseALabri
        }))
        .sort((a, b) => (a.pseudonyme < b.pseudonyme ? -1 : 1));
      const candidats = donnees.personnel
        .filter((p) => estFicheEchue(p) && !estAuCoffre(p.id))
        .map((p) => p.id);
      return {
        coffreCree: donnees.coffreCree === true,
        nombreAuCoffre: identites.length,
        identites,
        candidats
      };
    },

    async verifierCodeCoffre(phrase) {
      verifierPhraseCoffreDemo(phrase);
      return { ok: true };
    },

    async mettreAuCoffre(personnelIds, phrase, options = {}) {
      const ids = Array.isArray(personnelIds) ? personnelIds : [];
      if (ids.length === 0) {
        throw new Error('Aucune identité à mettre à l\'abri.');
      }
      // MÊME ORDRE que le serveur : fiches d'abord, phrase ensuite.
      const personnes = ids.map((id) => trouverPersonne(id));
      for (const p of personnes) {
        if (estAuCoffre(p.id)) throw new Error(MSG_DEJA_AU_COFFRE);
      }
      // Création du coffre au premier geste ; ensuite la phrase du coffre
      // EXISTANT est exigée (jamais deux phrases pour un même coffre).
      if (!donnees.coffreCree) {
        if (typeof phrase !== 'string' ||
            phrase.length < LONGUEUR_MIN_PHRASE_COFFRE) {
          throw new Error(MSG_PHRASE_TROP_COURTE);
        }
      } else {
        verifierPhraseCoffreDemo(phrase);
      }
      const annee = options.annee ?? new Date().getFullYear();

      // PHASE 1 — préparation SANS mutation (les lectures asynchrones de
      // contenus PJ peuvent échouer : rien ne doit avoir bougé — atomicité
      // de fait, le reste est synchrone).
      const preparation = [];
      for (const personne of personnes) {
        const lignesPj = donnees.piecesJointes
          .filter((pj) => pj.entiteType === 'personne'
            && pj.entiteId === personne.id);
        const piecesJointes = [];
        for (const pj of lignesPj) {
          const contenu = await lireContenuPj(pj.id);
          const octets = contenu ? await octetsDepuis(contenu) : null;
          piecesJointes.push({
            nomFichier: pj.nomFichier,
            mimeType: pj.mimeType,
            categorie: pj.categorie ?? null,
            hashSha256: pj.hashSha256 ?? null,
            base64: octets ? octetsVersBase64(octets) : null
          });
        }
        preparation.push({ personne, lignesPj, piecesJointes });
      }

      // PHASE 2 — mutations (synchrones, d'un seul tenant).
      const misAuCoffre = [];
      for (const { personne, lignesPj, piecesJointes } of preparation) {
        const numero = prochainNumeroCoffre(annee);
        const pseudo = libellePseudonyme(annee, numero);
        const libelleAvant = `${personne.prenom} ${personne.nom}`.trim();
        const identite = assemblerIdentiteCoffre(personne, {
          identifiantConnexion: null, // pas de comptes en démo
          piecesJointes
        });
        // Enveloppe SIMULÉE : balise + base64 du JSON (aucune protection —
        // le bandeau de la vue le dit ; jamais importée en base réelle).
        const enveloppe = PREFIXE_SIMULATION
          + octetsVersBase64(new TextEncoder().encode(JSON.stringify(identite)));

        // Pseudonymisation de la fiche (id INTACT) + brouillons réécrits
        // (révision INCRÉMENTÉE : signatures posées PÉRIMÉES — invariant
        // C1 ; branche texte SANS porteur identifié — jamais l'homonyme).
        Object.assign(personne, pseudonymiserFiche(annee, numero));
        for (const mv of donnees.mouvements) {
          if (mv.statut !== 'BROUILLON' && mv.statut !== 'SOUMIS') continue;
          if (mv.executeParId === personne.id ||
              (!mv.executeParId && mv.technicien === libelleAvant)) {
            mv.technicien = pseudo.libelle;
            mv.revisionBrouillon = (mv.revisionBrouillon ?? 0) + 1;
          }
        }
        // Contrôles d'étanchéité : ni scellés ni WORM — opérateur réécrit
        // (ferme getControles et l'export E1), même clause anti-homonyme.
        for (const c of donnees.controles) {
          if (c.operateurId === personne.id ||
              (!c.operateurId && c.operateur === libelleAvant)) {
            c.operateur = pseudo.libelle;
          }
        }
        // Suppression des PJ de la personne (contenus compris).
        for (const pj of lignesPj) {
          const indice = donnees.piecesJointes.indexOf(pj);
          if (indice >= 0) donnees.piecesJointes.splice(indice, 1);
          await supprimerContenuPj(pj.id);
        }
        donnees.coffreIdentites.push({
          id: genId('cof'),
          personnelId: personne.id,
          pseudonyme: pseudo.libelle,
          enveloppe,
          dateMiseALabri: new Date().toISOString()
        });
        // Journal : pseudonyme + identifiant, JAMAIS le nom (piège n°1).
        journaliser(null, 'COFFRE_MISE_A_L_ABRI',
          `${pseudo.libelle} (${personne.id})`,
          'Identité mise à l\'abri (simulation démo)');
        misAuCoffre.push({ personnelId: personne.id,
          pseudonyme: pseudo.libelle });
      }
      donnees.coffreCree = true;
      phraseCoffreSession = phrase;
      persisterEtNotifier();
      return { misAuCoffre };
    },

    async consulterIdentiteCoffre(personnelId, phrase, motif) {
      if (typeof motif !== 'string' || !motif.trim()) {
        throw new Error(MSG_MOTIF_OBLIGATOIRE);
      }
      // MÊME ORDRE que le serveur : la ligne d'abord, la phrase ensuite.
      const ligne = ligneCoffre(personnelId);
      if (!ligne) throw new Error(MSG_PAS_AU_COFFRE);
      verifierPhraseCoffreDemo(phrase);
      let identite;
      try {
        const base64 = ligne.enveloppe.slice(PREFIXE_SIMULATION.length);
        identite = JSON.parse(
          new TextDecoder().decode(base64VersOctets(base64)));
      } catch {
        throw new Error(MSG_CODE_INCORRECT);
      }
      journaliser(null, 'COFFRE_CONSULTATION',
        `${ligne.pseudonyme} (${personnelId})`, `Motif : ${motif.trim()}`);
      persisterEtNotifier();
      return copier(identite);
    },

    async restaurerIdentiteCoffre(personnelId, phrase, motif) {
      if (typeof motif !== 'string' || !motif.trim()) {
        throw new Error(MSG_MOTIF_OBLIGATOIRE);
      }
      // MÊME ORDRE que le serveur : la ligne d'abord, la phrase ensuite.
      const ligne = ligneCoffre(personnelId);
      if (!ligne) throw new Error(MSG_PAS_AU_COFFRE);
      verifierPhraseCoffreDemo(phrase);
      const personne = trouverPersonne(personnelId);
      let identite;
      try {
        const base64 = ligne.enveloppe.slice(PREFIXE_SIMULATION.length);
        identite = JSON.parse(
          new TextDecoder().decode(base64VersOctets(base64)));
      } catch {
        throw new Error(MSG_CODE_INCORRECT);
      }
      // Tri des pièces AVANT toute mutation : hash revérifié quand connu —
      // une pièce altérée est SAUTÉE et signalée, jamais bloquante (parité
      // avec le serveur : l'identité n'est pas verrouillée à perpétuité).
      const piecesSaines = [];
      const piecesAlterees = [];
      for (const pj of (identite.piecesJointes ?? [])) {
        if (!pj.base64) continue;
        const octets = base64VersOctets(pj.base64);
        const hash = await hasherOctets(octets);
        if (pj.hashSha256 && hash !== pj.hashSha256) {
          piecesAlterees.push(pj.nomFichier);
        } else {
          piecesSaines.push({ pj, octets, hash });
        }
      }
      // La fiche redevient ce qu'elle était (actif d'origine compris).
      Object.assign(personne, restaurerIdentite(identite));
      for (const { pj, octets, hash } of piecesSaines) {
        const nouvelle = {
          id: genId('pj'),
          entiteType: 'personne',
          entiteId: personnelId,
          categorie: pj.categorie ?? 'AUTRE',
          nomFichier: pj.nomFichier,
          mimeType: pj.mimeType,
          taille: octets.length,
          hashSha256: hash,
          dateAjout: new Date().toISOString(),
          ajoutePar: null
        };
        await ecrireContenuPj(nouvelle.id,
          { octets, mimeType: nouvelle.mimeType });
        donnees.piecesJointes.push(nouvelle);
      }
      // La ligne du coffre disparaît ; le compteur MONOTONE, lui, ne
      // redescend jamais (le pseudonyme n'est pas réattribué).
      donnees.coffreIdentites = donnees.coffreIdentites
        .filter((c) => c.personnelId !== personnelId);
      journaliser(null, 'COFFRE_RESTAURATION',
        `${ligne.pseudonyme} (${personnelId})`,
        `Motif : ${motif.trim()}` + (piecesAlterees.length
          ? ` · ${piecesAlterees.length} pièce(s) altérée(s) non restituée(s)`
          : ''));
      persisterEtNotifier();
      const resultat = copier(personne);
      if (piecesAlterees.length > 0) {
        resultat.piecesAlterees = piecesAlterees;
      }
      return resultat;
    },

    async changerPhraseCoffre(anciennePhrase, nouvellePhrase) {
      verifierPhraseCoffreDemo(anciennePhrase);
      if (typeof nouvellePhrase !== 'string' ||
          nouvellePhrase.length < LONGUEUR_MIN_PHRASE_COFFRE) {
        throw new Error(MSG_PHRASE_TROP_COURTE);
      }
      // Simulation : les enveloppes balisées ne dépendent pas de la phrase,
      // seul le secret de session tourne (même contrat de retour qu'en réel).
      phraseCoffreSession = nouvellePhrase;
      journaliser(null, 'COFFRE_CHANGEMENT_PHRASE', 'coffre',
        `${(donnees.coffreIdentites ?? []).length} enveloppe(s) re-scellée(s) (simulation)`);
      persisterEtNotifier();
      return { ok: true,
        nombreRechiffre: (donnees.coffreIdentites ?? []).length };
    },

    // ------------------------------------------------------
    // Habilitations F-Gas (multi-régime 2008/2025) — chantier B2
    // ------------------------------------------------------
    async getHabilitations() {
      // Copies indépendantes ; tri contractuel en JS (jamais d'ORDER BY).
      return (donnees.habilitations ?? []).map(copier).sort(comparerHabilitations);
    },

    async createHabilitation(donneesHabilitation) {
      const d = donneesHabilitation || {};
      const personne = trouverPersonne(d.personneId);
      // Lot E2 : pas de NOUVEL identifiant indirect sur une fiche au
      // coffre (la révocation reste permise — geste de conformité).
      if (estAuCoffre(personne.id)) throw new Error(MSG_FICHE_AU_COFFRE);
      verifierRegime(d.regime);
      verifierCategorieHabilitation(d.regime, d.categorie);
      const habilitation = {
        id: genId('hab'),
        personneId: personne.id,
        regime: d.regime,
        categorie: d.categorie,
        numeroAttestation: d.numeroAttestation ?? null,
        organismeDelivreur: d.organismeDelivreur ?? null,
        dateDebut: d.dateDebut ?? null,
        dateFin: d.dateFin ?? null,
        // Invariant : à la création une habilitation est TOUJOURS active ; la
        // désactivation passe EXCLUSIVEMENT par revoquerHabilitation (qui pose
        // aussi la date). Interdit l'état incohérent « inactive sans date ».
        actif: true,
        dateRevocation: null
      };
      donnees.habilitations.push(habilitation);
      journaliser(d.operateur, 'CREATION_HABILITATION',
        `${personne.prenom} ${personne.nom}`, `${d.regime} ${d.categorie}`);
      persisterEtNotifier();
      return copier(habilitation);
    },

    async updateHabilitation(id, donneesHabilitation) {
      const habilitation = trouverHabilitation(id);
      // Lot E2 : fiche au coffre -> pas de retouche d'identifiant indirect.
      if (estAuCoffre(habilitation.personneId)) {
        throw new Error(MSG_FICHE_AU_COFFRE);
      }
      const d = donneesHabilitation || {};
      // Régime et catégorie INTOUCHABLES : on corrige une coquille (n°, dates,
      // organisme), on ne réécrit jamais l'identité de l'attestation.
      const CHAMPS = ['numeroAttestation', 'organismeDelivreur',
        'dateDebut', 'dateFin'];
      for (const champ of CHAMPS) {
        if (d[champ] !== undefined) habilitation[champ] = copier(d[champ]);
      }
      journaliser(d.operateur, 'MODIFICATION_HABILITATION',
        `${habilitation.regime} ${habilitation.categorie}`,
        `Champs : ${Object.keys(d).filter((c) => CHAMPS.includes(c)).join(', ')}`);
      persisterEtNotifier();
      return copier(habilitation);
    },

    async revoquerHabilitation(id, operateur) {
      const habilitation = trouverHabilitation(id);
      // Une double révocation écraserait la date de retrait d'origine (signifiante
      // sur un registre opposable) — refusée, comme desactiverPersonne.
      if (!habilitation.actif) {
        throw new Error('Habilitation déjà révoquée.');
      }
      // JAMAIS de suppression : la ligne reste dans getHabilitations, marquée
      // révoquée + datée — une intervention passée sous une aptitude ensuite
      // retirée reste auditable rétrospectivement.
      habilitation.actif = false;
      habilitation.dateRevocation = aujourdHui();
      journaliser(operateur, 'RETRAIT_HABILITATION',
        `${habilitation.regime} ${habilitation.categorie}`,
        'Révocation (l’habilitation reste au registre : aucune suppression)');
      persisterEtNotifier();
      return copier(habilitation);
    },

    // ------------------------------------------------------
    // Mentions de formation complémentaire (par fluide) — chantier B2,
    // Phase 2b brique 1. Une mention ÉTEND l'axe FLUIDE des habilitations
    // de la personne (jamais les opérations ni la charge) — Franck 14/07.
    // ------------------------------------------------------
    async getMentions() {
      // Copies indépendantes ; tri contractuel en JS (jamais d'ORDER BY).
      return (donnees.mentionsHabilitation ?? [])
        .map(copier).sort(comparerMentions);
    },

    async createMention(donneesMention) {
      const d = donneesMention || {};
      const personne = trouverPersonne(d.personneId);
      // Lot E2 : pas de nouvel identifiant indirect sur une fiche au coffre.
      if (estAuCoffre(personne.id)) throw new Error(MSG_FICHE_AU_COFFRE);
      verifierFluideMention(d.fluideMention);
      const mention = {
        id: genId('men'),
        personneId: personne.id,
        fluideMention: d.fluideMention,
        numeroAttestation: d.numeroAttestation ?? null,
        organismeDelivreur: d.organismeDelivreur ?? null,
        dateDebut: d.dateDebut ?? null,
        dateFin: d.dateFin ?? null,
        // Invariant : active à la création ; la désactivation passe
        // EXCLUSIVEMENT par revoquerMention (comme les habilitations).
        actif: true,
        dateRevocation: null
      };
      donnees.mentionsHabilitation.push(mention);
      journaliser(d.operateur, 'CREATION_MENTION',
        `${personne.prenom} ${personne.nom}`, `Mention ${d.fluideMention}`);
      persisterEtNotifier();
      return copier(mention);
    },

    async revoquerMention(id, operateur) {
      const mention = trouverMention(id);
      // Double révocation refusée (préserve la date de retrait d'origine).
      if (!mention.actif) {
        throw new Error('Mention déjà révoquée.');
      }
      // JAMAIS de suppression : la ligne reste dans getMentions, marquée
      // révoquée + datée (l'historique de compétence reste opposable).
      mention.actif = false;
      mention.dateRevocation = aujourdHui();
      journaliser(operateur, 'RETRAIT_MENTION',
        `Mention ${mention.fluideMention}`,
        'Révocation (la mention reste au registre : aucune suppression)');
      persisterEtNotifier();
      return copier(mention);
    },

    // ------------------------------------------------------
    // Phase C : outillage réglementaire (statut recalculé)
    // ------------------------------------------------------
    async createOutil(donneesOutil) {
      const d = donneesOutil || {};
      if (!TYPES_OUTIL.includes(d.typeOutil)) {
        throw new Error(
          `Type d'outil obligatoire parmi : ${TYPES_OUTIL.join(', ')}.`);
      }
      if (!d.marque || !String(d.marque).trim()) {
        throw new Error('Marque de l’outil obligatoire.');
      }
      const outil = {
        id: genId('out'),
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
        codePublic: codePublicUnique(donnees.outillage),
        statut: 'CONFORME'
      };
      outil.statut = calculerStatutOutil(outil, aujourdHui());
      donnees.outillage.push(outil);
      journaliser(d.operateur, 'CREATION_OUTIL', `${outil.marque} ${outil.modele ?? ''}`.trim(),
        `${outil.typeOutil} · échéance ${fmtDate(outil.prochaineEcheance)}`);
      persisterEtNotifier();
      return copier(outil);
    },

    async updateOutil(id, donneesOutil) {
      const outil = trouverOutil(id);
      const d = donneesOutil || {};
      if (d.typeOutil !== undefined && !TYPES_OUTIL.includes(d.typeOutil)) {
        throw new Error(
          `Type d'outil inconnu : ${d.typeOutil} ` +
          `(attendu : ${TYPES_OUTIL.join(', ')}).`);
      }
      const CHAMPS = ['typeOutil', 'marque', 'modele', 'numSerie',
        'siteAtelier', 'precision', 'sensibilite', 'dateEtalonnage',
        'dateVerification', 'prochaineEcheance'];
      for (const champ of CHAMPS) {
        if (d[champ] !== undefined) outil[champ] = d[champ];
      }
      // Le statut découle TOUJOURS de l'échéance (sauf réforme)
      outil.statut = calculerStatutOutil(outil, aujourdHui());
      journaliser(d.operateur, 'MODIFICATION_OUTIL',
        `${outil.marque} ${outil.modele ?? ''}`.trim(),
        `Champs : ${Object.keys(d).filter((c) => CHAMPS.includes(c)).join(', ')}`);
      persisterEtNotifier();
      return copier(outil);
    },

    async reformerOutil(id, operateur) {
      const outil = trouverOutil(id);
      if (outil.statut === 'HORS_SERVICE') {
        throw new Error('Outil déjà réformé (hors service).');
      }
      outil.statut = 'HORS_SERVICE';
      journaliser(operateur, 'REFORME_OUTIL',
        `${outil.marque} ${outil.modele ?? ''}`.trim(),
        'Outil réformé : hors service');
      persisterEtNotifier();
      return copier(outil);
    },

    // ------------------------------------------------------
    // Phase C : pièces jointes (métadonnées ici, contenus en
    // IndexedDB — repli mémoire sous Node)
    // ------------------------------------------------------
    async ajouterPieceJointe(donneesPj) {
      const d = donneesPj || {};
      if (!d.entiteType || !d.entiteId) {
        throw new Error(
          'Pièce jointe : entité liée obligatoire (type et identifiant).');
      }
      if (!d.nomFichier || !String(d.nomFichier).trim()) {
        throw new Error('Nom de fichier de la pièce jointe obligatoire.');
      }
      // Lot E2 : une fiche au coffre ne reçoit plus de pièce (un scan
      // nominatif neuf casserait la pseudonymisation) — verrou de store.
      if (d.entiteType === 'personne' && estAuCoffre(d.entiteId)) {
        throw new Error(MSG_FICHE_AU_COFFRE);
      }
      // Lot C (C3c) : la catégorie du PDF conservé est RÉSERVÉE au canal
      // système de validerMouvement — jamais posée par un client (sinon
      // une fausse « pièce officielle » se glisserait dans le registre).
      if ((d.categorie ?? '') === CATEGORIE_PDF_FINAL) {
        throw new Error(
          'Catégorie CERFA_FINAL réservée au système (PDF final conservé '
          + 'à la validation officielle).');
      }
      // Lot C (C3c) : ASYMÉTRIE FERMÉE — une écriture FIGÉE ne reçoit
      // plus aucune pièce justificative (ses preuves sont scellées dans
      // hashPiecesJointes, désormais RECOMPTÉ à l'import), symétrique du
      // refus de suppression. Miroir exact du serveur.
      if (d.entiteType === 'MOUVEMENT') {
        const mouvementCible = donnees.mouvements.find(
          (mv) => mv.id === d.entiteId);
        if (mouvementCible &&
            (mouvementCible.statut === 'VALIDE' ||
             mouvementCible.statut === 'ANNULE')) {
          throw new Error(
            'Écriture figée : elle ne peut plus recevoir de pièce '
            + 'justificative.');
        }
      }
      // IM-19 : liste blanche des types MIME appliquée AU STORE (le
      // composant d'interface filtre déjà, mais la garantie est ici).
      const mime = String(d.mimeType ?? '').toLowerCase();
      if (!PJ_TYPES_MIME.includes(mime)) {
        throw new Error(
          `Type de fichier refusé : ${d.mimeType || 'inconnu'}. ` +
          'Formats acceptés : PDF, PNG, JPEG, WebP.');
      }
      const contenu = d.blob ?? d.base64;
      if (!contenu) {
        throw new Error(
          'Contenu de la pièce jointe obligatoire (blob ou base64).');
      }
      const octets = await octetsDepuis(contenu);
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
        id: genId('pj'),
        entiteType: d.entiteType,
        entiteId: d.entiteId,
        categorie: d.categorie ?? 'AUTRE',
        nomFichier: String(d.nomFichier).trim(),
        mimeType: mime,
        taille: octets.length,
        hashSha256: await hasherOctets(octets),
        dateAjout: new Date().toISOString(),
        ajoutePar: d.ajoutePar ?? null
      };
      // Lot C (C1) : une PJ ajoutée à un mouvement BROUILLON/SOUMIS modifie
      // la fiche présentée aux signataires → révision incrémentée, les
      // signatures posées deviennent PÉRIMÉES (invalidation par comparaison,
      // plan lot C §4 — bump EXPLICITE : mutation par table annexe).
      if (pieceJointe.entiteType === 'MOUVEMENT') {
        const mouvement = donnees.mouvements.find(
          (mv) => mv.id === pieceJointe.entiteId);
        if (mouvement && (mouvement.statut === 'BROUILLON' ||
                          mouvement.statut === 'SOUMIS')) {
          mouvement.revisionBrouillon = (mouvement.revisionBrouillon ?? 0) + 1;
        }
      }
      await ecrireContenuPj(pieceJointe.id,
        { octets, mimeType: pieceJointe.mimeType });
      donnees.piecesJointes.push(pieceJointe);
      journaliser(pieceJointe.ajoutePar, 'AJOUT_PIECE_JOINTE',
        `${pieceJointe.entiteType}/${pieceJointe.entiteId}`,
        `${pieceJointe.nomFichier} (${pieceJointe.taille} octets)`);
      persisterEtNotifier();
      return copier(pieceJointe);
    },

    async listerPiecesJointes(entiteType, entiteId) {
      return copier(donnees.piecesJointes.filter((pj) =>
        pj.entiteType === entiteType && pj.entiteId === entiteId));
    },

    async obtenirPieceJointe(id) {
      const pieceJointe = donnees.piecesJointes.find((pj) => pj.id === id);
      if (!pieceJointe) {
        throw new Error(`Pièce jointe introuvable : ${id}.`);
      }
      const contenu = await lireContenuPj(id);
      if (!contenu) {
        throw new Error(
          `Contenu de la pièce jointe introuvable : ${pieceJointe.nomFichier}.`);
      }
      const blob = typeof Blob !== 'undefined'
        ? new Blob([contenu.octets], { type: pieceJointe.mimeType })
        : contenu.octets;
      return { ...copier(pieceJointe), blob };
    },

    async supprimerPieceJointe(id, operateur) {
      const indice = donnees.piecesJointes.findIndex((pj) => pj.id === id);
      if (indice === -1) {
        throw new Error(`Pièce jointe introuvable : ${id}.`);
      }
      const pieceJointe = donnees.piecesJointes[indice];
      // Suppression réservée : jamais sur une écriture figée
      if (pieceJointe.entiteType === 'MOUVEMENT') {
        const mouvement = donnees.mouvements.find(
          (mv) => mv.id === pieceJointe.entiteId);
        if (mouvement &&
            (mouvement.statut === 'VALIDE' || mouvement.statut === 'ANNULE')) {
          throw new Error(
            'Écriture figée : sa pièce justificative ne peut plus être ' +
            'supprimée.');
        }
      }
      // Lot C (C1) : retirer une PJ d'un mouvement BROUILLON/SOUMIS modifie
      // la fiche présentée aux signataires → révision incrémentée (le cas
      // figé est déjà refusé ci-dessus).
      if (pieceJointe.entiteType === 'MOUVEMENT') {
        const mouvement = donnees.mouvements.find(
          (mv) => mv.id === pieceJointe.entiteId);
        if (mouvement && (mouvement.statut === 'BROUILLON' ||
                          mouvement.statut === 'SOUMIS')) {
          mouvement.revisionBrouillon = (mouvement.revisionBrouillon ?? 0) + 1;
        }
      }
      donnees.piecesJointes.splice(indice, 1);
      await supprimerContenuPj(id);
      journaliser(operateur, 'SUPPRESSION_PIECE_JOINTE',
        `${pieceJointe.entiteType}/${pieceJointe.entiteId}`,
        pieceJointe.nomFichier);
      persisterEtNotifier();
      return true;
    },

    // ------------------------------------------------------
    // Phase C : chaîne déchets / BSFF (SPEC §5.8)
    // ------------------------------------------------------
    async deciderFluideRecupere(bouteilleId, decision, par) {
      const bouteille = trouverBouteille(bouteilleId);
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
      bouteille.decisionFluide = decision;
      bouteille.decisionPar = par ?? null;
      bouteille.decisionDate = aujourdHui();
      if (decision === 'DECHET') {
        bouteille.statut = 'DECHET';
        bouteille.etatFluide = 'DECHET';
        // Tolérance réglementaire : garde d'UN AN maximum
        bouteille.dateLimiteGarde = ajouterUnAn(aujourdHui());
      } else {
        // IM-7 : décision RÉVERSIBLE — re-décider REUTILISABLE (ou
        // A_ANALYSER) restaure le stock et efface l'état déchet.
        bouteille.statut = 'EN_STOCK';
        bouteille.etatFluide = 'RECUPERE';
        bouteille.dateLimiteGarde = null;
      }
      journaliser(par, 'DECISION_FLUIDE', bouteille.code,
        `${decision} (${bouteille.fluide})` +
        (etaitDechet && decision !== 'DECHET'
          ? ' · retour en stock (état déchet annulé)' : ''));
      persisterEtNotifier();
      return copier(bouteille);
    },

    async createBsff(donneesBsff) {
      const d = donneesBsff || {};
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
        id: genId('bsff'),
        bouteilleId: bouteille.id,
        bouteilleCode: bouteille.code,
        fluide: bouteille.fluide,
        numeroBsff: String(d.numeroBsff).trim(),
        transporteur: d.transporteur ?? null,
        installationDestination: d.installationDestination ?? null,
        masseRemiseKg: arrondir(masse),
        dateRemise: d.dateRemise ?? aujourdHui()
      };
      donnees.bsff.push(bsff);

      // IM-8 : la bouteille est décrémentée de la masse REMISE.
      // Remise totale → bouteille vidée et RETOURNEE (comme avant) ;
      // remise partielle → le reliquat reste en stock, statut inchangé
      // (DECHET, délai de garde conservé) : aucun kilo ne s'évapore.
      bouteille.masseNetteKg =
        arrondir(bouteille.masseNetteKg - bsff.masseRemiseKg);
      if (bouteille.masseNetteKg <= 1e-9) {
        bouteille.masseNetteKg = 0;
        bouteille.statut = 'RETOURNEE';
      }
      bouteille.masseBruteKg =
        arrondir(bouteille.tareKg + bouteille.masseNetteKg);
      bouteille.numBsff = bsff.numeroBsff;
      bouteille.datePesee = aujourdHui();

      // Mouvement de sortie tracé au journal d'audit
      journaliser(d.operateur, 'SORTIE_BSFF', bouteille.code,
        `BSFF ${bsff.numeroBsff} · ${fmtKgSigne(-bsff.masseRemiseKg)} ` +
        `${bsff.fluide} → ${bsff.installationDestination ?? 'destination non renseignée'}` +
        (bouteille.masseNetteKg > 0
          ? ` · reliquat ${bouteille.masseNetteKg} kg en stock` : ''));
      persisterEtNotifier();
      return copier(bsff);
    },

    async getBsff() {
      const liste = copier(donnees.bsff);
      liste.sort((a, b) => b.dateRemise.localeCompare(a.dateRemise));
      return liste;
    },

    /**
     * IM-9 : retour d'une bouteille consignée au fournisseur.
     * La masse nette restante alimente le poste « retours
     * fournisseur » de la balance matière (année de l'opération) ;
     * la bouteille sort du stock (RETOURNEE).
     */
    async retournerFournisseur(bouteilleId, operateur) {
      const bouteille = trouverBouteille(bouteilleId);
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
        id: genId('rf'),
        bouteilleId: bouteille.id,
        bouteilleCode: bouteille.code,
        fluide: bouteille.fluide,
        masseKg,
        date: aujourdHui(),
        operateur: operateur ?? null
      };
      donnees.retoursFournisseur.push(retour);

      bouteille.statut = 'RETOURNEE';
      bouteille.masseNetteKg = 0;
      bouteille.masseBruteKg = bouteille.tareKg;
      bouteille.datePesee = aujourdHui();

      journaliser(operateur, 'RETOUR_FOURNISSEUR', bouteille.code,
        `${fmtKgSigne(-masseKg)} ${bouteille.fluide} → fournisseur` +
        (bouteille.proprietaire ? ` ${bouteille.proprietaire}` : ''));
      persisterEtNotifier();
      return copier(bouteille);
    },

    async getRetoursFournisseur() {
      const liste = copier(donnees.retoursFournisseur);
      liste.sort((a, b) => b.date.localeCompare(a.date));
      return liste;
    },

    // ------------------------------------------------------
    // Phase C : balance matière et inventaire (SPEC §6)
    // ------------------------------------------------------
    async getBalanceMatiere(annee) {
      return copier(calculerBalanceMatiere(Number(annee)));
    },

    async saisirInventaire(annee, lignes, operateur) {
      const anneeNum = Number(annee);
      if (!Number.isInteger(anneeNum)) {
        throw new Error('Année d’inventaire obligatoire (nombre entier).');
      }
      if (!Array.isArray(lignes) || lignes.length === 0) {
        throw new Error('Inventaire vide : au moins une ligne fluide attendue.');
      }
      const fluides = indexFluides();
      for (const l of lignes) {
        if (!fluides.has(l.fluide)) {
          throw new Error(`Fluide inconnu au référentiel : ${l.fluide}.`);
        }
        const reel = Number(l.stockReelKg);
        if (!Number.isFinite(reel) || reel < 0) {
          throw new Error(
            `Stock réel invalide pour ${l.fluide} (en kg, positif ou nul).`);
        }
      }
      for (const l of lignes) {
        const existant = donnees.inventaires.find(
          (i) => i.annee === anneeNum && i.fluide === l.fluide);
        if (existant) {
          existant.stockReelKg = arrondir(Number(l.stockReelKg));
          existant.dateSaisie = aujourdHui();
          existant.operateur = operateur ?? null;
        } else {
          donnees.inventaires.push({
            annee: anneeNum,
            fluide: l.fluide,
            stockReelKg: arrondir(Number(l.stockReelKg)),
            dateSaisie: aujourdHui(),
            operateur: operateur ?? null
          });
        }
      }
      // Brique ② (B7) : la saisie d'inventaire FIGE aussi la photographie
      // NOMINATIVE de l'année (bouteille par bouteille + fuites ouvertes) —
      // le rejeu des mouvements ne sait pas reconstituer l'état passé
      // (les pesées écrasent hors registre), seule une photo fait foi.
      figerPhotoNominative(anneeNum);
      journaliser(operateur, 'SAISIE_INVENTAIRE', `inventaire ${anneeNum}`,
        `${lignes.length} fluide(s) pesé(s)`);
      persisterEtNotifier();
      return copier(calculerBalanceMatiere(anneeNum));
    },

    async getInventaireNominatif(annee) {
      const anneeNum = Number(annee);
      if (!Number.isInteger(anneeNum)) {
        throw new Error('Année d’inventaire obligatoire (nombre entier).');
      }
      const courant = lirePhotoNominative(anneeNum);
      // L'état au 01/01 de l'année N = la photo du 31/12 de N−1.
      const ouverture = lirePhotoOuNull(anneeNum - 1);
      return copier({ ...courant, ouverture });
    },

    // ------------------------------------------------------
    // Sentinelle d'alertes persistées
    // getAlertes() reste la vérité du présent ; la sentinelle
    // n'historise que le temps et l'acquittement — jamais de masquage.
    // ------------------------------------------------------
    async getSentinelle() {
      return donnees.sentinelleAlertes.map(formaterEpisode).sort(comparerEpisodes);
    },

    async rafraichirSentinelle() {
      const actives = await store.getAlertes();
      const ouverts = donnees.sentinelleAlertes.filter(estOuvert);
      const maintenant = new Date().toISOString();
      const { apparitions, escalades, resolutions } =
        calculerTransitions(actives, ouverts, maintenant);
      // Idempotent : sans transition, aucun effet (ni persistance ni notif).
      if (apparitions.length === 0 && escalades.length === 0 &&
          resolutions.length === 0) {
        return donnees.sentinelleAlertes.map(formaterEpisode).sort(comparerEpisodes);
      }
      for (const app of apparitions) {
        donnees.sentinelleAlertes.push({
          id: genId('sen'),
          ...app,
          resolueLe: null,
          acquitteeLe: null,
          acquitteePar: null
        });
      }
      // Escalade : rafraîchir le snapshot ET remettre à zéro l'acquittement
      // (l'aggravation doit être revue). L'entrée de journal de l'ancien
      // acquittement, elle, reste — le journal est append-only.
      const escaladeParId = new Map(escalades.map((x) => [x.id, x]));
      const aClore = new Set(resolutions);
      for (const e of donnees.sentinelleAlertes) {
        const esc = escaladeParId.get(e.id);
        if (esc) {
          e.niveau = esc.niveau;
          e.titre = esc.titre;
          e.detail = esc.detail;
          e.cibleVue = esc.cibleVue;
          e.cibleId = esc.cibleId;
          e.acquitteeLe = null;
          e.acquitteePar = null;
        }
        if (aClore.has(e.id)) e.resolueLe = maintenant;
      }
      // rafraichirSentinelle ne touche PAS au journal chaîné (éviter de le
      // noyer) : l'apparition/résolution vit dans cette table horodatée.
      persisterEtNotifier();
      return donnees.sentinelleAlertes.map(formaterEpisode).sort(comparerEpisodes);
    },

    async acquitterAlerte(idAlerte, par) {
      if (!idAlerte || !String(idAlerte).trim()) {
        throw new Error('Identifiant d’alerte obligatoire.');
      }
      const episode = donnees.sentinelleAlertes.find(
        (e) => e.idAlerte === idAlerte && estOuvert(e));
      if (!episode) {
        throw new Error('Aucune alerte active à acquitter pour cet identifiant.');
      }
      // Idempotent : déjà pris connaissance → aucune seconde trace.
      if (episode.acquitteeLe) return formaterEpisode(episode);
      episode.acquitteeLe = new Date().toISOString();
      episode.acquitteePar = par ?? null;
      // Preuve opposable : la prise de connaissance est consignée au journal.
      journaliser(par, 'ACQUITTEMENT_ALERTE', idAlerte, episode.titre);
      persisterEtNotifier();
      return formaterEpisode(episode);
    },

    async justifierEcart(annee, fluide, justification) {
      const anneeNum = Number(annee);
      if (!justification || !String(justification).trim()) {
        throw new Error('Justification d’écart obligatoire.');
      }
      const balance = calculerBalanceMatiere(anneeNum);
      const ligne = balance.lignes.find((l) => l.fluide === fluide);
      if (!ligne || ligne.ecartKg === null) {
        throw new Error(
          `Aucun écart d'inventaire à justifier pour ${fluide} en ${anneeNum}.`);
      }
      const existant = donnees.justificationsEcarts.find(
        (j) => j.annee === anneeNum && j.fluide === fluide);
      if (existant) {
        existant.justification = String(justification).trim();
        existant.date = aujourdHui();
      } else {
        donnees.justificationsEcarts.push({
          annee: anneeNum,
          fluide,
          justification: String(justification).trim(),
          date: aujourdHui()
        });
      }
      journaliser(null, 'JUSTIFICATION_ECART', `${fluide} ${anneeNum}`,
        String(justification).trim());
      persisterEtNotifier();
      return copier(calculerBalanceMatiere(anneeNum));
    },

    // ------------------------------------------------------
    // Phase C : blocage du mode OFFICIEL (SPEC §7.2)
    // ------------------------------------------------------
    async peutPasserEnOfficiel() {
      // Corps extrait en fonction interne (lot B) : il nourrit AUSSI le
      // moteur de blocage — conditions 1-4 de la liste, motifs inchangés.
      return calculerPeutPasserEnOfficiel();
    },

    /**
     * Lot B — simulation de validation OFFICIELLE (lecture, ne bloque
     * jamais) : la liste complète des blocages comme si on validait la
     * fiche en mode Officiel MAINTENANT (niveau VALIDATION, verrou de
     * livraison compris). Error si le mouvement est introuvable.
     */
    async simulerValidationOfficielle(mouvementId) {
      const mouvement = trouverMouvement(mouvementId);
      return copier(
        evaluerOfficiel('VALIDATION', cadreFicheOfficiel(mouvement)));
    },

    // ------------------------------------------------------
    // Sauvegarde / restauration
    // ------------------------------------------------------
    async exporterJSON() {
      return JSON.stringify({
        application: 'inerWeb Fluide',
        version: 8,
        exporteLe: new Date().toISOString(),
        donnees
      }, null, 2);
    },

    async importerJSON(texte) {
      let candidat;
      try {
        const paquet = JSON.parse(texte);
        // Accepte l'enveloppe d'export ou les données brutes
        candidat = paquet && paquet.donnees ? paquet.donnees : paquet;
      } catch {
        return false; // JSON illisible
      }
      if (!estValide(candidat)) return false;
      candidat = copier(candidat);

      // Corrections réglementaires conditionnelles (miroir de la
      // migration 22 serveur) : un export ANTÉRIEUR porte les anciens
      // PRP (1/4/3) — corrigés AVANT la complétion de fiche, jamais sur
      // une valeur réellement ajustée.
      corrigerPrpFgas3(candidat.fluides);
      // Fiche réglementaire des fluides (miroir de l'import serveur,
      // migration 21) : un export ANTÉRIEUR porte des fluides sans fiche —
      // la recompléter depuis le référentiel (table validée), jamais
      // écraser une fiche importée ; fluide inconnu → 4 clés à null.
      for (const f of candidat.fluides) completerFicheReglementaire(f);

      // Compléments Phase B pour les imports Phase A
      if (!Array.isArray(candidat.outillage)) {
        candidat.outillage = copier(DEMO.outillage);
      }
      if (!Array.isArray(candidat.journalAudit)) candidat.journalAudit = [];
      // Compléments Phase C pour les imports A/B
      for (const cle of ['auditsOrganisme', 'nonConformites', 'stocksInitiaux',
        'bsff', 'inventaires', 'justificationsEcarts', 'piecesJointes',
        'retoursFournisseur',
        // Brique ② (B7) : photos nominatives — vides sur les vieux exports.
        'inventairesBouteilles', 'inventairesFuites']) {
        if (!Array.isArray(candidat[cle])) candidat[cle] = copier(DEMO[cle] ?? []);
      }
      // ⚠️ Compléments TOUJOURS à VIDE, JAMAIS depuis DEMO : le monde de
      // démo porte désormais des habilitations/mentions fictives — les
      // recopier dans un export ancien INVENTERAIT des aptitudes, et un
      // registre étranger (sans per-fh/per-sb) serait REFUSÉ en orphelin.
      // Idem signaturesMouvement (lot C) : jamais de signature inventée.
      for (const cle of ['habilitations', 'mentionsHabilitation',
        'mouvementOutillage', 'signaturesMouvement']) {
        if (!Array.isArray(candidat[cle])) candidat[cle] = [];
      }
      if (candidat.etablissement.numAttestationCapacite === undefined) {
        candidat.etablissement =
          { ...copier(DEMO.etablissement), ...candidat.etablissement };
      }

      // CR-5 : invariants métier vérifiés AVANT d'adopter quoi que ce soit
      const probleme = verifierInvariantsDonnees(candidat);
      if (probleme) {
        throw new Error(
          `Import refusé — donnée incohérente : ${probleme}.`);
      }

      // CR-5 : chaîne de hash reconstruite/vérifiée sur les données
      // CANDIDATES. Une sauvegarde Phase A (aucune empreinte) voit sa
      // chaîne amorcée ; toute rupture est rejetée avec l'écriture en cause.
      const figees = candidat.mouvements.filter((mv) =>
        mv.statut === 'VALIDE' || mv.statut === 'ANNULE');
      if (figees.some((mv) => mv.hashEcriture)) {
        const chaine = await verifierChaineMouvements(candidat.mouvements);
        if (!chaine.ok) {
          throw new Error(
            'Import refusé — chaîne d’intégrité rompue à l’écriture ' +
            `${chaine.casseA} : fichier altéré ou forgé.`);
        }
      } else if (figees.length > 0) {
        // Sauvegarde antérieure à la Phase B : amorçage de la chaîne
        figees.sort((a, b) =>
          a.date.localeCompare(b.date) || a.numero.localeCompare(b.numero));
        let precedent = null;
        let ordre = 1;
        for (const mv of figees) {
          mv.ordreValidation = ordre;
          mv.hashPrecedent = precedent;
          mv.hashEcriture = await hasherEcriture(mv, precedent);
          precedent = mv.hashEcriture;
          ordre += 1;
        }
      }

      // (lot C, C2) : les SIGNATURES d'une écriture scellée v2 sont GELÉES
      // dans son empreinte (hashSignatures). Recomptées sur le candidat :
      // une signature retouchée, ajoutée ou retirée dans le JSON ne colle
      // plus → fichier forgé. Une écriture scellée en v1 ne peut PAS porter
      // de signatures (la table arrive avec la v2, le WORM refuse toute
      // signature sur une écriture figée) : en trouver = rétrogradation
      // forgée (revue adversariale C2). (Lot C, C3c : l'asymétrie est
      // FERMÉE — les PJ d'une écriture v2 sont figées avec elle,
      // hashPiecesJointes se RECOMPTE aussi.)
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
        const empreinte = await empreinteListeSignatures(
          (candidat.signaturesMouvement ?? [])
            .filter((sig) => sig.mouvementId === mv.id));
        if (empreinte !== mv.hashSignatures) {
          throw new Error(
            `Import refusé — signatures du mouvement ${mv.numero} altérées : ` +
            'fichier forgé.');
        }
        // Lot C (C3c) : les PJ d'une écriture v2 sont GELÉES dans son
        // empreinte (hashPiecesJointes) et l'asymétrie est fermée —
        // recomptées sur le candidat : une PJ retouchée, ajoutée ou
        // retirée dans le JSON (CERFA_FINAL truquée comprise, plan §7.4)
        // ne colle plus → fichier forgé. Miroir exact du serveur.
        const empreintePj = await empreinteListeTriee(
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

      // Lot C (C3c) : la catégorie CERFA_FINAL est réservée au canal
      // système — à l'IMPORT aussi (constat IMPORTANT de la revue C3c,
      // fermé avant commit). Une pièce CERFA_FINAL n'est légitime QUE sur
      // une écriture FIGÉE v2 dont l'empreinte du PDF est scellée
      // (hashPdfFinal) ; partout ailleurs — brouillon, autre entité,
      // écriture sans PDF scellé — c'est une fausse « pièce officielle » :
      // fichier forgé. Miroir exact du serveur.
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
              'Import refusé — pièce jointe CERFA_FINAL hors canal '
              + `système (${pj.nomFichier ?? pj.id}) : fichier forgé.`);
          }
        }
      }

      // CR-4 : reprise des bouteilles sans masse d'entrée figée
      for (const b of candidat.bouteilles) {
        if (!Number.isFinite(b.masseEntreeKg)) {
          b.masseEntreeKg = b.masseNetteKg;
        }
      }

      // Lot E2 : compléments des clés du coffre (un export antérieur au
      // coffre n'en a pas — sans eux, le premier mettreAuCoffre planterait
      // en TypeError au lieu du refus canonique).
      if (!Array.isArray(candidat.coffreIdentites)) {
        candidat.coffreIdentites = [];
      }
      if (!candidat.coffreCompteurs ||
          typeof candidat.coffreCompteurs !== 'object') {
        candidat.coffreCompteurs = {};
      }
      if (typeof candidat.coffreCree !== 'boolean') {
        candidat.coffreCree = false;
      }
      if (candidat.coffreConfig === undefined) {
        candidat.coffreConfig = null;
      }

      // Adoption : les vérifications sont passées. La phrase d'exercice de
      // session ne correspond plus forcément au coffre importé : oubliée.
      donnees = candidat;
      phraseCoffreSession = null;
      this.registreAltere = null;
      journaliser('système', 'IMPORT_DONNEES', 'sauvegarde',
        'Restauration depuis un fichier JSON (intégrité vérifiée)');
      persisterEtNotifier();
      return true;
    }
  };

  // Première persistance (silencieuse si localStorage indisponible)
  persisterEtNotifier();

  return store;
}
