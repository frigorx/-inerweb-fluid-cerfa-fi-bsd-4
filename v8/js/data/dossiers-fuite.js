// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — « dossier de fuite fermé » (brique ③)
// Module PUR/Node-testable (zéro DOM) : reconstruit, pour une
// machine, les DOSSIERS DE FUITE depuis les données déjà en base.
// Rien de nouveau n'est stocké : un dossier = un ÉPISODE de fuite,
// ancré sur un contrôle d'étanchéité au résultat FUITE, enrichi par
// la réparation tracée (migration 8 : dateReparation /
// natureReparation / reparateur) et refermé par le premier
// contrôle CONFORME postérieur.
//
// REGROUPEMENT EN ÉPISODES (revue adversariale brique ③) : un
// contrôle FUITE survenu alors que l'épisode précédent n'est PAS
// encore refermé REJOINT ce dossier (même fuite qui continue,
// confirmée par un nouveau contrôle) ; un nouveau dossier ne
// s'ouvre qu'après fermeture du précédent. Ainsi le statut du
// dossier le plus récent coïncide EXACTEMENT avec estFuiteOuverte
// (demo-store.js / server/api.js), qui ne regarde que la DERNIÈRE
// fuite — et tous les dossiers antérieurs sont fermés.
//
// La règle de fermeture est LA MÊME que estFuiteOuverte, appliquée
// à la DERNIÈRE fuite de l'épisode :
//  - pas de réparation tracée → OUVERTE (un CONFORME seul ne
//    referme JAMAIS — garde anti-contournement R3c) ;
//  - réparation tracée sans CONFORME de clôture → REPAREE, avec
//    échéance de contrôle de suivi à 1 MOIS CIVIL (P0-6) ;
//  - réparation tracée + CONFORME STRICTEMENT postérieur AU JOUR de
//    la réparation (et >= jour de la fuite) → FERMEE.
//    P0-6 (audit 20/07, décision Franck 22/07) : le texte impose le
//    contrôle de suivi AU PLUS TÔT après 24 h de fonctionnement —
//    les dates métier étant au JOUR, J+1 est le proxy assumé ; la
//    clôture « le jour même » (ancienne convention R4) ne vaut plus
//    QUE pour un équipement MOBILE listé (exception réglementaire,
//    consignée au dossier).
// ============================================================

// P1-1 (E5) : « mobile LISTÉ » se vérifie enfin — le sous-type de la
// liste fermée fait foi, plus le seul drapeau FIXE/MOBILE.
import { mobileListe as mobileListeEquipement } from './equipement.js';

/**
 * Échéance du contrôle de suivi = réparation + 1 MOIS CIVIL (P0-6, au
 * lieu des +30 jours calendaires d'origine). Débordement de fin de mois
 * ramené au dernier jour du mois cible (31/01 → 28-29/02). COPIE
 * LITTÉRALE d'`ajouterMois(iso, 1)` des deux stores — même arithmétique,
 * ne jamais toucher l'un sans les autres.
 */
export function ajouterUnMoisCivil(iso) {
  const [annee, mois, jour] = iso.split('-').map(Number);
  const d = new Date(annee, mois, jour);
  if (d.getDate() !== jour) d.setDate(0);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/** Libellés français des statuts d'un dossier de fuite. */
export const LIBELLES_STATUT_FUITE = {
  OUVERTE: 'Fuite ouverte',
  REPAREE: 'Réparée — contrôle de suivi attendu',
  FERMEE: 'Fermée'
};

/** Libellés des types de mouvement, vus de la machine. */
const LIBELLES_TYPE_MOUVEMENT = {
  CHARGE_APPOINT: 'Complément de charge',
  MISE_EN_SERVICE: 'Mise en service',
  RECUPERATION_MAINTENANCE: 'Récupération (maintenance)',
  RECUPERATION_DEMANTELEMENT: 'Récupération (démantèlement)',
  TRANSFERT: 'Transfert entre contenants'
};

/** Forme attendue d'une date métier (jour). */
const DATE_JOUR = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Nombre de jours entiers entre deux dates ISO (jour) — null si
 * l'une des dates est inexploitable (donnée corrompue : le dossier
 * reste lisible, seule la durée manque).
 */
function ecartJours(debutISO, finISO) {
  const versUtc = (iso) => {
    const [a, m, j] = String(iso).slice(0, 10).split('-').map(Number);
    return Date.UTC(a, m - 1, j);
  };
  const ecart = Math.round((versUtc(finISO) - versUtc(debutISO)) / 86400000);
  return Number.isFinite(ecart) ? ecart : null;
}

/**
 * Premier contrôle CONFORME refermant une fuite donnée — même règle
 * que estFuiteOuverte : STRICTEMENT postérieur au jour de la
 * réparation tracée (P0-6, proxy des 24 h de fonctionnement — J+1
 * minimum, dates au jour) et au moins du jour de la fuite (jamais un
 * conforme antérieur). Pour un équipement MOBILE listé (`machineMobile`),
 * le contrôle immédiat est admis : le jour même suffit (exception
 * réglementaire). null si la fuite n'est pas réparée ou pas recontrôlée.
 */
function chercherCloture(fuite, controlesMachine, machineMobile = false) {
  if (!fuite.dateReparation) return null;
  const candidats = controlesMachine
    .filter((c) => c.resultat === 'CONFORME'
      && (machineMobile
        ? c.date >= fuite.dateReparation
        : c.date > fuite.dateReparation)
      && c.date >= fuite.date)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return candidats[0] ?? null;
}

/**
 * Rang de tri INTRA-JOUR d'un événement du dossier. L'ordre exact au
 * sein d'un même jour est partiellement inconnaissable (dates métier
 * au jour) ; on garantit un ordre PLAUSIBLE, STABLE et surtout
 * COHÉRENT avec les règles métier déjà codées :
 *   0 — la détection ouvre la journée de la fuite ;
 *   1.x — les récupérations (on récupère le fluide AVANT de réparer),
 *         départagées par le rang de scellement ;
 *   2 — la réparation tracée ;
 *   3.x — les autres mouvements (le complément de gaz n'est possible
 *         qu'APRÈS réparation — blocage R3c), même départage ;
 *   4 — les contrôles (à date égale, le contrôle est réputé postérieur
 *       à la réparation — convention de la règle de fermeture).
 */
function rangIntraJour(evt) {
  if (evt.type === 'DETECTION') return 0;
  if (evt.type === 'MOUVEMENT') {
    const ordre = Number(evt.ordreValidation) || 0;
    const base = String(evt.sousType).startsWith('RECUPERATION') ? 1 : 3;
    return base + Math.min(ordre / 1e9, 0.999);
  }
  if (evt.type === 'REPARATION') return 2;
  return 4; // CONTROLE et CLOTURE
}

/** Événement de chronologie issu d'un mouvement de la machine. */
function evenementMouvement(mouvement) {
  let titre = LIBELLES_TYPE_MOUVEMENT[mouvement.type] ?? mouvement.type;
  if (mouvement.contreEcritureDe) titre = 'Contre-écriture';
  return {
    date: mouvement.date,
    type: 'MOUVEMENT',
    sousType: mouvement.type,
    titre,
    numero: mouvement.numero ?? null,
    mouvementId: mouvement.id,
    ordreValidation: mouvement.ordreValidation ?? null,
    // Le flux machine est déjà SIGNÉ vu de la machine (une
    // récupération porte une quantité négative côté machine).
    variationKg: mouvement.quantiteKg ?? null,
    fluide: mouvement.fluide ?? null,
    annule: mouvement.statut === 'ANNULE',
    contreEcritureDe: mouvement.contreEcritureDe ?? null,
    qui: mouvement.technicien ?? null
  };
}

/**
 * Équipement MOBILE **LISTÉ** — exception P0-6 : contrôle de clôture admis
 * le jour même de la réparation, sans attendre 24 h de fonctionnement.
 *
 * P1-1 (E5) — DETTE P0-6 SOLDÉE : le texte réserve cette exception aux
 * équipements mobiles LISTÉS. Jusqu'ici, tout équipement marqué MOBILE en
 * profitait, faute de sous-type : l'appartenance à la liste n'était pas
 * vérifiable. Désormais il faut un sous-type de la liste fermée —
 * AUTRE_MOBILE et l'absence de sous-type n'ouvrent aucun droit.
 * **Plus strict qu'avant**, donc conforme à la doctrine : jamais moins de
 * contrôles qu'exigé. Absence de valeur = FIXE (défaut conservateur).
 */
export function estMachineMobile(machine) {
  return mobileListeEquipement(machine);
}

/** Construit UN dossier depuis un ÉPISODE (groupe de contrôles FUITE). */
function construireDossier(groupe, controlesMachine,
  mouvementsMachine, aujourdhui, machineMobile = false) {
  const detection = groupe[0];
  const derniereFuite = groupe[groupe.length - 1];

  // Réparation GOUVERNANTE = celle de la dernière fuite de l'épisode
  // (seule regardée par estFuiteOuverte). Les réparations tracées sur
  // les fuites antérieures de l'épisode restent visibles en
  // chronologie mais ne referment rien à elles seules.
  const reparation = derniereFuite.dateReparation
    ? {
      date: derniereFuite.dateReparation,
      nature: derniereFuite.natureReparation ?? null,
      reparateur: derniereFuite.reparateur ?? null
    }
    : null;

  const clotureBrute = chercherCloture(derniereFuite, controlesMachine,
    machineMobile);
  const controleCloture = clotureBrute
    ? {
      id: clotureBrute.id, date: clotureBrute.date,
      methode: clotureBrute.methode ?? null,
      operateur: clotureBrute.operateur ?? null
    }
    : null;

  const statut = !reparation ? 'OUVERTE'
    : (controleCloture ? 'FERMEE' : 'REPAREE');
  // Garde sur donnée corrompue : une date de réparation malformée ne
  // doit pas faire planter tout le dossier (l'échéance manque, c'est tout).
  const echeanceControleSuivi =
    (statut === 'REPAREE' && DATE_JOUR.test(String(reparation.date)))
      ? ajouterUnMoisCivil(reparation.date)
      : null;
  const dateFermeture = controleCloture ? controleCloture.date : null;

  // P0-6 (décision G3) : une clôture AU-DELÀ de l'échéance d'1 mois civil
  // reste acceptée (on n'empêche jamais d'enregistrer la réalité) mais le
  // RETARD est CONSIGNÉ au dossier — non-conformité tracée, visible sur la
  // fiche du dossier et dans l'export ZIP scellé.
  const echeanceTheorique =
    (reparation && DATE_JOUR.test(String(reparation.date)))
      ? ajouterUnMoisCivil(reparation.date)
      : null;
  const clotureEnRetard = Boolean(dateFermeture && echeanceTheorique
    && dateFermeture > echeanceTheorique);
  const retardClotureJours = clotureEnRetard
    ? ecartJours(echeanceTheorique, dateFermeture)
    : null;
  // P0-6 (G4) : MOTIF DE PÉRIMÈTRE consigné — la clôture du JOUR MÊME de
  // la réparation n'est admise qu'au titre de l'exception « équipement
  // mobile listé » ; le dossier le dit explicitement (fiche + ZIP scellé).
  const exceptionMobile = Boolean(machineMobile && dateFermeture
    && reparation && dateFermeture === reparation.date);

  // Fenêtre du dossier : de la détection à la fermeture (bornes
  // incluses), ou jusqu'à aujourd'hui tant que le dossier est ouvert.
  const dansFenetre = (dateISO) => dateISO >= detection.date
    && (dateFermeture ? dateISO <= dateFermeture : true);

  // Mouvements OPPOSABLES de la machine pendant la fuite.
  const mouvementsPendantFuite = mouvementsMachine.filter((mv) =>
    (mv.statut === 'VALIDE' || mv.statut === 'ANNULE')
    && dansFenetre(mv.date));

  // Contrôles INTERMÉDIAIRES dans la fenêtre : ni la détection, ni la
  // clôture — les confirmations de fuite de l'épisode y figurent,
  // ainsi qu'un CONFORME enregistré SANS réparation tracée au
  // préalable, qui ne referme rien (à montrer, honnêteté d'audit).
  const idsGroupe = new Set(groupe.map((c) => c.id));
  const controlesIntermediaires = controlesMachine.filter((c) =>
    c.id !== detection.id
    && (!controleCloture || c.id !== controleCloture.id)
    && dansFenetre(c.date));

  // ---- Chronologie ----
  const evenements = [];

  evenements.push({
    date: detection.date,
    type: 'DETECTION',
    titre: 'Fuite détectée',
    localisation: detection.localisationFuite ?? null,
    methode: detection.methode ?? null,
    typeControle: detection.typeControle ?? null,
    detecteurId: detection.detecteurId ?? null,
    reparationImmediate: Boolean(detection.reparationImmediate),
    controleId: detection.id,
    qui: detection.operateur ?? null
  });

  evenements.push(...mouvementsPendantFuite.map(evenementMouvement));

  // TOUTES les réparations tracées de l'épisode (celle de la dernière
  // fuite gouverne la fermeture, les autres documentent les tentatives).
  for (const fuite of groupe) {
    if (!fuite.dateReparation) continue;
    evenements.push({
      date: fuite.dateReparation,
      type: 'REPARATION',
      titre: 'Réparation tracée',
      detail: fuite.natureReparation ?? null,
      controleId: fuite.id,
      qui: fuite.reparateur ?? null
    });
  }

  evenements.push(...controlesIntermediaires.map((c) => ({
    date: c.date,
    type: 'CONTROLE',
    titre: c.resultat === 'CONFORME'
      ? 'Contrôle CONFORME (ne referme pas la fuite)'
      : (idsGroupe.has(c.id)
        ? 'Fuite confirmée par un nouveau contrôle'
        : 'Nouveau contrôle FUITE'),
    resultat: c.resultat,
    methode: c.methode ?? null,
    localisation: c.localisationFuite ?? null,
    controleId: c.id,
    qui: c.operateur ?? null
  })));

  if (controleCloture) {
    evenements.push({
      date: controleCloture.date,
      type: 'CLOTURE',
      titre: 'Contrôle de suivi CONFORME — fuite refermée',
      methode: controleCloture.methode,
      controleId: controleCloture.id,
      qui: controleCloture.operateur
    });
  }

  // Tri décroissant : jour d'abord, puis rang intra-jour.
  evenements.sort((a, b) => {
    const jourA = String(a.date).slice(0, 10);
    const jourB = String(b.date).slice(0, 10);
    if (jourA !== jourB) return jourB.localeCompare(jourA);
    return rangIntraJour(b) - rangIntraJour(a);
  });

  return {
    controleFuiteId: detection.id,
    controlesFuiteIds: groupe.map((c) => c.id),
    nbConfirmations: groupe.length - 1,
    machineId: detection.machineId,
    machineLabel: detection.machineLabel ?? null,
    dateDetection: detection.date,
    localisation: detection.localisationFuite ?? null,
    methode: detection.methode ?? null,
    typeControle: detection.typeControle ?? null,
    detecteurId: detection.detecteurId ?? null,
    operateur: detection.operateur ?? null,
    reparationImmediate: Boolean(detection.reparationImmediate),
    statut,
    reparation,
    controleCloture,
    echeanceControleSuivi,
    suiviEnRetard: Boolean(echeanceControleSuivi
      && aujourdhui > echeanceControleSuivi),
    clotureEnRetard,
    retardClotureJours,
    exceptionMobile,
    dateFermeture,
    dureeJours: ecartJours(detection.date, dateFermeture ?? aujourdhui),
    mouvementsPendantFuite,
    evenements
  };
}

/**
 * Construit TOUS les dossiers de fuite d'une machine, du plus récent
 * au plus ancien. Invariant garanti par le regroupement en épisodes :
 * seul le dossier LE PLUS RÉCENT peut être non fermé, et son statut
 * coïncide avec estFuiteOuverte des stores.
 * @param {{ machine: object, controles: Array, mouvements: Array,
 *           aujourdhui?: string }} sources — lectures du contrat
 *          telles quelles (getMachines/getControles/getMouvements) ;
 *          `aujourdhui` (ISO jour) sert au calcul du retard de suivi
 *          et de la durée d'un dossier encore ouvert (défaut : la
 *          date du poste).
 * @returns {{ dossiers: Array, nbOuvertes: number, nbReparees: number,
 *             nbFermees: number }}
 */
export function construireDossiersFuite(
  { machine, controles, mouvements, aujourdhui }) {
  const jour = (aujourdhui ?? new Date().toISOString().slice(0, 10))
    .slice(0, 10);

  const mobile = estMachineMobile(machine);
  // P0-6 : un contrôle né d'un mouvement ANNULÉ est réputé annulé avec
  // lui (fait dérivé — même règle que les stores) : il ne fonde ni ne
  // referme aucun dossier. Un contrôle autonome (sans mouvementId) reste
  // toujours actif. Les ZIP déjà exportés restent des instantanés valides.
  const idsMouvementsAnnules = new Set((mouvements ?? [])
    .filter((mv) => mv.statut === 'ANNULE').map((mv) => mv.id));
  const controlesMachine = (controles ?? [])
    .filter((c) => c.machineId === machine.id
      && !(c.mouvementId && idsMouvementsAnnules.has(c.mouvementId)));
  const mouvementsMachine = (mouvements ?? [])
    .filter((mv) => mv.machineId === machine.id);

  // Regroupement en ÉPISODES : parcours chronologique des contrôles
  // FUITE ; une fuite rejoint l'épisode courant tant que celui-ci
  // n'était pas refermé AVANT elle (fermeture strictement antérieure
  // à sa date — à date égale, elle ouvre un nouveau dossier).
  const fuitesAsc = controlesMachine
    .filter((c) => c.resultat === 'FUITE')
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const groupes = [];
  for (const fuite of fuitesAsc) {
    const groupe = groupes[groupes.length - 1];
    if (groupe) {
      const cloture = chercherCloture(
        groupe[groupe.length - 1], controlesMachine, mobile);
      if (!cloture || cloture.date > fuite.date) {
        groupe.push(fuite);
        continue;
      }
    }
    groupes.push([fuite]);
  }

  const dossiers = groupes
    .map((g) => construireDossier(
      g, controlesMachine, mouvementsMachine, jour, mobile))
    .sort((a, b) => (a.dateDetection < b.dateDetection ? 1
      : a.dateDetection > b.dateDetection ? -1 : 0));

  return {
    dossiers,
    nbOuvertes: dossiers.filter((d) => d.statut === 'OUVERTE').length,
    nbReparees: dossiers.filter((d) => d.statut === 'REPAREE').length,
    nbFermees: dossiers.filter((d) => d.statut === 'FERMEE').length
  };
}

/**
 * Construit LE dossier de fuite contenant un contrôle donné (l'ancre
 * du dossier ou n'importe quelle confirmation de l'épisode).
 * @returns {object|null} le dossier, ou null si le contrôle n'existe
 *          pas, n'est pas une FUITE, ou n'appartient pas à la machine.
 */
export function construireDossierFuite(
  { machine, controles, mouvements, controleFuiteId, aujourdhui }) {
  const { dossiers } = construireDossiersFuite(
    { machine, controles, mouvements, aujourdhui });
  return dossiers.find((d) =>
    d.controlesFuiteIds.includes(controleFuiteId)) ?? null;
}
