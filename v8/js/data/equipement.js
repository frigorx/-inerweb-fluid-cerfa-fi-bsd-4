// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// MODÈLE D'ÉQUIPEMENT (P1-1) — ce que l'équipement EST, et ce que cela
// change pour ses obligations de contrôle d'étanchéité.
//
// Module PUR : aucune entrée/sortie, aucun store. Recopié en littéral
// (CommonJS) dans server/api.js, parité prouvée par test-equipement.mjs
// joué demo ET local. Ne jamais toucher un miroir sans l'autre.
//
// ⚠️ Ce module ne DÉFINIT aucun seuil réglementaire : les seuils vivent
// dans reglementation-fluides.js (source de vérité unique du cadre 7).
// Il COMPOSE — il interroge le moteur et en tire des conséquences.
//
// Décisions arbitrées le 23/07 (déléguées par Franck, « le plus
// réglementaire possible » = jamais moins de contrôles qu'exigé) :
//   E1 — l'allègement de fréquence (÷ 2 avec détection permanente) n'est
//        dû que si la détection a été VÉRIFIÉE depuis moins de 12 mois.
//        Une case cochée ne retire pas la moitié des contrôles sans preuve.
//   E2 — au niveau HAUT du moteur (500 tCO₂eq HFC · 100 kg HFO ·
//        300 kg HCFC), la détection est OBLIGATOIRE. Ces seuils sont déjà
//        ceux du moteur : on les interroge, on ne les recopie pas.
//   E3 — AUCUNE exemption des hermétiquement scellés n'est codée à ce jour
//        (les 3 valeurs de la table réglementaire ne sont pas confirmées
//        sur pièce). `exemptionControle` existe et rend TOUJOURS
//        « non exempté » : l'activer plus tard sera une décision, pas une
//        réécriture. C'est le seul point qui RETIRERAIT des contrôles.
//   E4 — le seuil d'aptitude élargi (6 kg au lieu de 3) suppose un
//        hermétique ÉTIQUETÉ comme tel, jamais seulement scellé.
//   E5 — l'exception du contrôle immédiat après réparation suppose un
//        sous-type mobile LISTÉ.
// ============================================================

// L2 (25/07) : « une date est une date » — format ancré ET calendrier réel.
import { estDateCalendaire } from './dates.js';

import { evaluerControle } from './reglementation-fluides.js';

/** Délai réglementaire de vérification d'un système de détection (mois). */
export const DELAI_VERIF_DETECTION_MOIS = 12;

/**
 * Sous-types d'équipements MOBILES admis à l'exception du contrôle
 * immédiat après réparation (E5). Liste FERMÉE : ce qui n'y est pas
 * n'en bénéficie pas — y compris AUTRE_MOBILE, présent pour décrire
 * honnêtement un équipement sans lui ouvrir de droit.
 */
export const SOUS_TYPES_MOBILES = ['CAMION_FRIGORIFIQUE',
  'REMORQUE_FRIGORIFIQUE', 'FOURGON_FRIGORIFIQUE', 'CONTENEUR_FRIGORIFIQUE',
  'WAGON_FRIGORIFIQUE', 'AUTRE_MOBILE'];

/** Sous-types qui ouvrent DROIT à l'exception (AUTRE_MOBILE exclu). */
export const SOUS_TYPES_MOBILES_ELIGIBLES = ['CAMION_FRIGORIFIQUE',
  'REMORQUE_FRIGORIFIQUE', 'FOURGON_FRIGORIFIQUE', 'CONTENEUR_FRIGORIFIQUE',
  'WAGON_FRIGORIFIQUE'];

/** Libellés lisibles des sous-types (écrans et exports). */
export const LIBELLE_SOUS_TYPE = {
  CAMION_FRIGORIFIQUE: 'Camion frigorifique',
  REMORQUE_FRIGORIFIQUE: 'Remorque frigorifique',
  FOURGON_FRIGORIFIQUE: 'Fourgon frigorifique',
  CONTENEUR_FRIGORIFIQUE: 'Conteneur frigorifique',
  WAGON_FRIGORIFIQUE: 'Wagon frigorifique',
  AUTRE_MOBILE: 'Autre équipement mobile'
};

/**
 * Ajoute des mois à une date ISO, écrêtage fin de mois — copie LITTÉRALE
 * d'`ajouterMois` des deux stores (31/01 + 1 mois → 28 ou 29/02).
 * @param {string} iso AAAA-MM-JJ
 * @param {number} nbMois
 * @returns {string} AAAA-MM-JJ
 */
export function ajouterMoisEquipement(iso, nbMois) {
  const [annee, mois, jour] = String(iso).split('-').map(Number);
  const d = new Date(annee, mois - 1 + nbMois, jour);
  if (d.getDate() !== jour) d.setDate(0);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/**
 * Échéance de vérification d'un système de détection : 12 mois civils
 * après la dernière vérification. null si jamais vérifié.
 * @param {string|null|undefined} verifieeLe date ISO
 * @returns {string|null} date ISO
 */
export function echeanceVerificationDetection(verifieeLe) {
  if (!verifieeLe || !/^\d{4}-\d{2}-\d{2}/.test(String(verifieeLe))) {
    return null;
  }
  return ajouterMoisEquipement(String(verifieeLe).slice(0, 10),
    DELAI_VERIF_DETECTION_MOIS);
}

/**
 * ⭐ Revue L2 — NORMALISER AVANT DE JUGER, sinon on verrouille l'existant.
 * La version livrée acceptait un horodatage complet (« 2026-04-26 08:30:00 »,
 * « 2026-04-26T08:30:00.000Z ») : des fiches en base en portent. Refuser sec
 * rendait ces machines INMODIFIABLES — toute correction de leur fiche était
 * rejetée sur un champ qu'on ne touchait même pas. On coupe donc au JOUR
 * (c'est déjà ce que fait le calcul d'échéance), et on ne refuse que ce qui
 * n'est pas une date : « 2028-99-99 » reste refusé, « 2026-04-26 08:30 »
 * devient « 2026-04-26 ».
 * @param {unknown} valeur
 * @returns {string|null} la date au jour, ou null si absente
 */
export function normaliserDateVerification(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  const texte = String(valeur).trim();
  const dixPremiers = texte.slice(0, 10);
  return estDateCalendaire(dixPremiers) ? dixPremiers : texte;
}

/**
 * ⭐ E1 — la détection permanente COMPTE-T-ELLE pour alléger la fréquence
 * de contrôle ?
 *
 * Elle ne compte que si elle est déclarée ET vérifiée depuis moins de
 * 12 mois. Sinon on retombe sur la fréquence SANS détection : plus de
 * contrôles, jamais moins. Ce n'est pas un blocage — on n'empêche jamais
 * d'enregistrer la réalité —, c'est le retrait d'un allègement non dû.
 *
 * @param {{detectionPermanente?: boolean, detectionVerifieeLe?: string|null}} machine
 * @param {string} jour date ISO du jour (AAAA-MM-JJ)
 * @returns {{ compte: boolean, declaree: boolean, echeance: string|null,
 *   motif: 'ABSENTE'|'JAMAIS_VERIFIEE'|'VERIFICATION_PERIMEE'|'A_JOUR' }}
 */
export function detectionEffective(machine, jour) {
  const declaree = Boolean(machine?.detectionPermanente);
  if (!declaree) {
    return { compte: false, declaree: false, echeance: null, motif: 'ABSENTE' };
  }
  const verifiee = machine?.detectionVerifieeLe ?? null;
  // ⭐ L2 (25/07) — DÉFENSE EN PROFONDEUR (la garde de saisie est dans
  // verifierModeleEquipement, mais un import ou une base retouchée entre
  // par-derrière) : une date de vérification illisible OU dans le futur ne
  // vaut PAS vérification. Sinon « 2030-01-01 » ou « 2028-99-99 » divisait
  // par deux la fréquence de contrôle sans qu'aucune vérification ait eu
  // lieu. Le doute retire l'allègement : jamais moins de contrôles.
  const verifieeJour = normaliserDateVerification(verifiee);
  if (verifieeJour !== null
      && (!estDateCalendaire(verifieeJour)
        || verifieeJour > String(jour).slice(0, 10))) {
    return { compte: false, declaree: true, echeance: null,
      motif: 'JAMAIS_VERIFIEE' };
  }
  const echeance = echeanceVerificationDetection(machine?.detectionVerifieeLe);
  if (echeance === null) {
    return { compte: false, declaree: true, echeance: null,
      motif: 'JAMAIS_VERIFIEE' };
  }
  // Échéance ATTEINTE = encore valable le jour dit (l'échéance est le
  // dernier jour couvert) ; le lendemain, l'allègement tombe.
  const aJour = String(jour).slice(0, 10) <= echeance;
  return { compte: aJour, declaree: true, echeance,
    motif: aJour ? 'A_JOUR' : 'VERIFICATION_PERIMEE' };
}

/**
 * ⭐ E2 — un système de détection est-il OBLIGATOIRE sur cet équipement ?
 *
 * Oui au niveau HAUT du moteur réglementaire (niveau 3) : 500 tCO₂eq pour
 * les HFC, 100 kg pour les HFO purs, 300 kg pour les HCFC. On INTERROGE le
 * moteur (`evaluerControle`), on ne recopie aucun seuil : une évolution des
 * seuils se propage ici toute seule.
 *
 * La détection est évaluée SANS allègement (3ᵉ argument false) : l'obligation
 * porte sur la charge, pas sur ce qui est déjà installé.
 *
 * @param {object|null} fluideRef fiche du fluide (référentiel)
 * @param {{chargeNominaleKg?: number}} machine
 * @param {string} [dateIntervention] régime applicable (HFO purs)
 * @returns {boolean}
 */
export function detectionObligatoire(fluideRef, machine, dateIntervention) {
  const charge = Number(machine?.chargeNominaleKg);
  if (!Number.isFinite(charge) || charge <= 0) return false;
  const verdict = evaluerControle(fluideRef, charge, false, dateIntervention);
  return detectionObligatoireDepuisNiveau(verdict.niveau);
}

/**
 * Même règle, à partir du NIVEAU déjà calculé par le moteur — c'est cette
 * forme que le serveur reprend en littéral (son moteur, `frequenceControleMois`
 * d'api.js, porte les seuils en CommonJS et expose son niveau). Garde la
 * règle « obligatoire = niveau haut » en UN SEUL endroit de chaque côté.
 * @param {1|2|3|null} niveau
 * @returns {boolean}
 */
export function detectionObligatoireDepuisNiveau(niveau) {
  return niveau === 3;
}

/**
 * ⭐ E3(b) / L5/Q6 (24/07/2026) — DRAPEAU d'activation de l'exemption des
 * équipements hermétiquement scellés ÉTIQUETÉS (règl. UE 2024/573, art. 5).
 * FERMÉ tant que le visa de l'organisme agréé (T3) n'est pas posé :
 * l'exemption est la SEULE règle du logiciel qui RETIRE un contrôle — un
 * seuil mal posé serait une infraction. L'activation = basculer CETTE
 * constante (ici et dans le miroir serveur, nulle part ailleurs) PUIS jouer
 * le lot d'activation : brancher les consommateurs de fréquence (liste
 * exacte au PLAN-LOTS-REGLEMENTAIRES §L5) et vérifier au navigateur.
 * NON configurable par l'environnement — même doctrine que VERROU_LIVRAISON.
 */
export const EXEMPTION_HERMETIQUE_ACTIVE = false;

/** Tonnes éq. CO₂ en français, 2 décimales au plus (littéral, sans Intl). */
function fmtTonnesEqCo2(t) {
  return String(Math.round(t * 100) / 100).replace('.', ',');
}

/**
 * ⭐ L5/Q6 — le CALCUL de l'exemption, qui calcule TOUJOURS (testable
 * indépendamment du drapeau). Décision Franck 24/07 (tableau Q6) :
 * hermétiquement scellé ET étiqueté (hermetiqueOpposable), PUIS l'un des
 * seuils STRICTS (la valeur pile n'exempte pas) :
 *  - catégorie HFC (annexe I) : charge × PRP < 10 t éq. CO₂ ;
 *  - catégorie HFO (annexe II, section 1) : charge < 2 kg ;
 *  - usage RÉSIDENTIEL déclaré : charge < 3 kg de gaz fluoré — le « ou »
 *    du texte : cette branche peut exempter AU-DELÀ de 10 t éq. CO₂
 *    (2,9 kg de R-404A = 11,4 t) ; cas R2 consigné au plan, gaté Franck,
 *    parc du lycée à residentiel=0 (backfill migration 32).
 * HCFC : JAMAIS exempté (hors art. 5 — règl. 1005/2009). Hors périmètre :
 * sans objet. Charge inconnue ou nulle : jamais exempté (garde stricte).
 * La CATÉGORIE du cadre 7 vient de l'appelant — même patron que
 * detectionObligatoireDepuisNiveau : aucun seuil du moteur recopié ici.
 *
 * @param {'HFC'|'HFO'|'HCFC'|null} categorie  catégorie cadre 7 du fluide
 * @param {object|null} fluideRef              fiche du fluide (gwpAr4)
 * @param {object} machine                     fiche machine
 * @returns {{ exempte: boolean, motif: string|null }}
 */
export function calculerExemption(categorie, fluideRef, machine) {
  const aucune = { exempte: false, motif: null };
  if (!hermetiqueOpposable(machine)) return aucune;
  if (categorie !== 'HFC' && categorie !== 'HFO') return aucune;
  const charge = Number(machine?.chargeNominaleKg);
  if (!Number.isFinite(charge) || charge <= 0) return aucune;
  if (categorie === 'HFC') {
    const prp = Number(fluideRef?.gwpAr4);
    if (Number.isFinite(prp) && prp > 0 && (charge * prp) / 1000 < 10) {
      return { exempte: true, motif: 'Exempté du contrôle d’étanchéité : '
        + 'hermétiquement scellé étiqueté, '
        + fmtTonnesEqCo2((charge * prp) / 1000)
        + ' t éq. CO₂ (moins de 10 — règl. UE 2024/573, art. 5).' };
    }
  }
  if (categorie === 'HFO' && charge < 2) {
    return { exempte: true, motif: 'Exempté du contrôle d’étanchéité : '
      + 'hermétiquement scellé étiqueté, moins de 2 kg de gaz de '
      + 'l’annexe II, section 1 (règl. UE 2024/573, art. 5).' };
  }
  if (Boolean(machine?.residentiel) && charge < 3) {
    return { exempte: true, motif: 'Exempté du contrôle d’étanchéité : '
      + 'hermétiquement scellé étiqueté en usage résidentiel, moins de '
      + '3 kg de gaz fluoré (règl. UE 2024/573, art. 5).' };
  }
  return aucune;
}

/**
 * ⭐ E3 — exemption de contrôle OPPOSABLE : le calcul ci-dessus, derrière le
 * drapeau. Tant que `EXEMPTION_HERMETIQUE_ACTIVE` est faux, TOUJOURS
 * « non exempté » — le choix conservateur historique (on exige parfois un
 * contrôle que le texte n'imposerait pas : sévérité assumée, jamais une
 * non-conformité). Signature alignée sur le calcul (catégorie en tête).
 *
 * @param {'HFC'|'HFO'|'HCFC'|null} categorie
 * @param {object|null} fluideRef
 * @param {object} machine
 * @returns {{ exempte: boolean, motif: string|null }}
 */
export function exemptionControle(categorie, fluideRef, machine) {
  if (!EXEMPTION_HERMETIQUE_ACTIVE) return { exempte: false, motif: null };
  return calculerExemption(categorie, fluideRef, machine);
}

/**
 * ⭐ E4 — l'équipement bénéficie-t-il du seuil d'aptitude ÉLARGI (6 kg au
 * lieu de 3) ? Seulement s'il est hermétiquement scellé ET ÉTIQUETÉ comme
 * tel : le texte ne reconnaît pas un hermétique qui ne se déclare pas.
 * @param {{hermetiqueScelle?: boolean, hermetiqueEtiquete?: boolean}} machine
 * @returns {boolean}
 */
export function hermetiqueOpposable(machine) {
  return Boolean(machine?.hermetiqueScelle) && Boolean(machine?.hermetiqueEtiquete);
}

/**
 * ⭐ E5 — l'équipement est-il un MOBILE LISTÉ, admis au contrôle immédiat
 * après réparation ? Un MOBILE sans sous-type, ou de sous-type
 * AUTRE_MOBILE, ne l'est PAS (plus strict qu'avant P1-1, où tout MOBILE en
 * bénéficiait).
 * @param {{typeInstallation?: string, sousTypeInstallation?: string|null}} machine
 * @returns {boolean}
 */
export function mobileListe(machine) {
  if (String(machine?.typeInstallation ?? '') !== 'MOBILE') return false;
  return SOUS_TYPES_MOBILES_ELIGIBLES.includes(
    String(machine?.sousTypeInstallation ?? ''));
}

/**
 * L3/R4 (25/07/2026, décision Franck) — USAGE THERMIQUE de l'équipement
 * (migration 34) : il commande les DATES d'interdiction du fluide VIERGE à
 * PRP >= 2500 (règl. UE 2024/573, art. 13) — réfrigération depuis le
 * 01/01/2025, climatisation et pompes à chaleur depuis le 01/01/2026.
 * NULL = usage non renseigné → régime le plus STRICT (froid, 2025) :
 * jamais moins de contrôles qu'exigé.
 */
export const USAGES_THERMIQUES = ['FROID_COMMERCIAL', 'CLIMATISATION',
  'POMPE_A_CHALEUR'];

/** Libellés lisibles des usages thermiques. */
export const LIBELLE_USAGE_THERMIQUE = {
  FROID_COMMERCIAL: 'Froid commercial',
  CLIMATISATION: 'Climatisation',
  POMPE_A_CHALEUR: 'Pompe à chaleur'
};

/** Débuts d'interdiction du fluide VIERGE à PRP >= 2500 (art. 13). */
export const DEBUT_INTERDICTION_VIERGE_FROID = '2025-01-01';
export const DEBUT_INTERDICTION_VIERGE_CLIM_PAC = '2026-01-01';

/**
 * ⭐ L3/R4 — date de début d'interdiction du fluide VIERGE applicable à CET
 * usage. CLIMATISATION et POMPE_A_CHALEUR → 01/01/2026 ; FROID_COMMERCIAL,
 * usage absent ou inconnu → 01/01/2025 (le plus strict).
 */
export function debutInterdictionVierge(usageThermique) {
  return usageThermique === 'CLIMATISATION'
    || usageThermique === 'POMPE_A_CHALEUR'
    ? DEBUT_INTERDICTION_VIERGE_CLIM_PAC
    : DEBUT_INTERDICTION_VIERGE_FROID;
}

/**
 * Garde de saisie du modèle d'équipement — LÈVE au premier défaut, message
 * canonique identique des deux côtés. Appliquée sur la fiche FUSIONNÉE
 * (existant + patch), comme pour le référentiel des fluides.
 * @param {object} machine fiche complète
 * @throws {Error}
 */
export function verifierModeleEquipement(machine) {
  const m = machine || {};
  const sousType = m.sousTypeInstallation;
  // L3/R4 : usage thermique — liste FERMÉE, null admis (= régime strict).
  const usage = m.usageThermique;
  if (usage != null && String(usage) !== ''
      && !USAGES_THERMIQUES.includes(String(usage))) {
    throw new Error('Usage thermique inconnu : '
      + `${USAGES_THERMIQUES.join(', ')}.`);
  }
  if (sousType != null && String(sousType) !== ''
      && !SOUS_TYPES_MOBILES.includes(String(sousType))) {
    throw new Error('Sous-type d’installation inconnu : '
      + `${SOUS_TYPES_MOBILES.join(', ')}.`);
  }
  if (sousType != null && String(sousType) !== ''
      && String(m.typeInstallation ?? 'FIXE') !== 'MOBILE') {
    throw new Error('Un sous-type d’installation ne se renseigne que sur un '
      + 'équipement MOBILE.');
  }
  if (m.hermetiqueEtiquete && !m.hermetiqueScelle) {
    throw new Error('Un équipement ne peut être étiqueté « hermétiquement '
      + 'scellé » sans être hermétiquement scellé.');
  }
  const verifiee = m.detectionVerifieeLe;
  // ⭐ L2 (25/07) — DEUX trous fermés ici, tirés et prouvés :
  //  ① la regex n'était PAS ancrée en fin (/^\d{4}-\d{2}-\d{2}/) et ne
  //    contrôlait pas le calendrier : « 2026-13-45 », « 2028-99-99 » ou
  //    « 2026-07-25 blabla » passaient — et une détection « vérifiée » au
  //    99ᵉ jour du 99ᵉ mois DIVISE PAR DEUX la fréquence de contrôle ;
  //  ② une date FUTURE passait aussi (« 2030-01-01 ») : une vérification
  //    qui n'a pas eu lieu allégeait les obligations. Une vérification ne
  //    s'atteste pas d'avance — même règle que la remise à niveau (L4).
  if (normaliserDateVerification(verifiee) !== null
      && !estDateCalendaire(normaliserDateVerification(verifiee))) {
    throw new Error('Date de vérification de la détection invalide '
      + '(AAAA-MM-JJ attendu).');
  }
  if (verifiee != null && String(verifiee) !== '' && !m.detectionPermanente) {
    throw new Error('Vérification de détection renseignée alors qu’aucun '
      + 'système de détection permanente n’est déclaré sur cet équipement.');
  }
}
