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
 * ⭐ E3 — exemption de contrôle des équipements hermétiquement scellés.
 *
 * **AUCUNE exemption n'est codée à ce jour** : les trois valeurs citées par
 * la table réglementaire (< 10 tCO₂eq, < 2 kg, < 3 kg en résidentiel) n'ont
 * pas été confirmées sur pièce, et c'est le seul mécanisme de tout le
 * chantier qui pourrait faire MANQUER un contrôle obligatoire. Le choix
 * conservateur — celui que la table elle-même retenait — est donc maintenu :
 * on exige parfois un contrôle que le texte n'imposerait pas, ce qui est une
 * sévérité assumée, jamais une non-conformité.
 *
 * La fonction existe, elle est appelée, elle est testée : activer l'exemption
 * quand les seuils seront confirmés sera une DÉCISION, pas une réécriture.
 * Elle exigera alors l'ÉTIQUETAGE (le texte ne reconnaît que l'hermétique
 * marqué comme tel) — d'où le champ déjà posé.
 *
 * @param {object|null} _fluideRef
 * @param {object} _machine
 * @returns {{ exempte: boolean, motif: string|null }}
 */
export function exemptionControle(_fluideRef, _machine) {
  return { exempte: false, motif: null };
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
 * Garde de saisie du modèle d'équipement — LÈVE au premier défaut, message
 * canonique identique des deux côtés. Appliquée sur la fiche FUSIONNÉE
 * (existant + patch), comme pour le référentiel des fluides.
 * @param {object} machine fiche complète
 * @throws {Error}
 */
export function verifierModeleEquipement(machine) {
  const m = machine || {};
  const sousType = m.sousTypeInstallation;
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
  if (verifiee != null && String(verifiee) !== ''
      && !/^\d{4}-\d{2}-\d{2}/.test(String(verifiee))) {
    throw new Error('Date de vérification de la détection invalide '
      + '(AAAA-MM-JJ attendu).');
  }
  if (verifiee != null && String(verifiee) !== '' && !m.detectionPermanente) {
    throw new Error('Vérification de détection renseignée alors qu’aucun '
      + 'système de détection permanente n’est déclaré sur cet équipement.');
  }
}
