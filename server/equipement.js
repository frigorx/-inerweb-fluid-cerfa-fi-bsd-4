// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// MIROIR LITTÉRAL CommonJS de v8/js/data/equipement.js (P1-1).
// Parité prouvée par v8/js/data/test-equipement.mjs (joué demo ET local)
// — verdicts ET messages. Ne jamais toucher un miroir sans l'autre.
//
// Seule différence assumée avec le module ESM : `detectionObligatoire`
// (qui compose le moteur du cadre 7) n'est pas repris ici. Le serveur
// porte son propre moteur en littéral dans api.js (frequenceControleMois
// et son niveau) : il appelle `detectionObligatoireDepuisNiveau` avec le
// niveau qu'il a déjà calculé. La règle « obligatoire = niveau haut »
// reste ainsi en UN SEUL endroit de chaque côté, et aucun seuil n'est
// dupliqué une fois de plus.
// ============================================================

/** Délai réglementaire de vérification d'un système de détection (mois). */
const DELAI_VERIF_DETECTION_MOIS = 12;

/** Sous-types d'équipements MOBILES connus (liste FERMÉE). */
const SOUS_TYPES_MOBILES = ['CAMION_FRIGORIFIQUE',
  'REMORQUE_FRIGORIFIQUE', 'FOURGON_FRIGORIFIQUE', 'CONTENEUR_FRIGORIFIQUE',
  'WAGON_FRIGORIFIQUE', 'AUTRE_MOBILE'];

/** Sous-types qui ouvrent DROIT au contrôle immédiat (AUTRE_MOBILE exclu). */
const SOUS_TYPES_MOBILES_ELIGIBLES = ['CAMION_FRIGORIFIQUE',
  'REMORQUE_FRIGORIFIQUE', 'FOURGON_FRIGORIFIQUE', 'CONTENEUR_FRIGORIFIQUE',
  'WAGON_FRIGORIFIQUE'];

/** Libellés lisibles des sous-types (exports serveur). */
const LIBELLE_SOUS_TYPE = {
  CAMION_FRIGORIFIQUE: 'Camion frigorifique',
  REMORQUE_FRIGORIFIQUE: 'Remorque frigorifique',
  FOURGON_FRIGORIFIQUE: 'Fourgon frigorifique',
  CONTENEUR_FRIGORIFIQUE: 'Conteneur frigorifique',
  WAGON_FRIGORIFIQUE: 'Wagon frigorifique',
  AUTRE_MOBILE: 'Autre équipement mobile'
};

/** Ajoute des mois à une date ISO, écrêtage fin de mois (copie littérale). */
function ajouterMoisEquipement(iso, nbMois) {
  const [annee, mois, jour] = String(iso).split('-').map(Number);
  const d = new Date(annee, mois - 1 + nbMois, jour);
  if (d.getDate() !== jour) d.setDate(0);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

/** Échéance de vérification : 12 mois civils après la dernière. */
function echeanceVerificationDetection(verifieeLe) {
  if (!verifieeLe || !/^\d{4}-\d{2}-\d{2}/.test(String(verifieeLe))) {
    return null;
  }
  return ajouterMoisEquipement(String(verifieeLe).slice(0, 10),
    DELAI_VERIF_DETECTION_MOIS);
}

/** ⭐ E1 — la détection compte-t-elle pour alléger la fréquence ? */
function detectionEffective(machine, jour) {
  const declaree = Boolean(machine?.detectionPermanente);
  if (!declaree) {
    return { compte: false, declaree: false, echeance: null, motif: 'ABSENTE' };
  }
  const echeance = echeanceVerificationDetection(machine?.detectionVerifieeLe);
  if (echeance === null) {
    return { compte: false, declaree: true, echeance: null,
      motif: 'JAMAIS_VERIFIEE' };
  }
  const aJour = String(jour).slice(0, 10) <= echeance;
  return { compte: aJour, declaree: true, echeance,
    motif: aJour ? 'A_JOUR' : 'VERIFICATION_PERIMEE' };
}

/** ⭐ E2 — détection obligatoire au niveau HAUT du moteur. */
function detectionObligatoireDepuisNiveau(niveau) {
  return niveau === 3;
}

/**
 * ⭐ E3(b) / L5/Q6 — DRAPEAU d'activation de l'exemption des hermétiquement
 * scellés étiquetés. MIROIR LITTÉRAL de l'ESM — voir le commentaire complet
 * dans v8/js/data/equipement.js. FERMÉ jusqu'au visa T3.
 */
const EXEMPTION_HERMETIQUE_ACTIVE = false;

/** Tonnes éq. CO₂ en français, 2 décimales au plus (littéral, sans Intl). */
function fmtTonnesEqCo2(t) {
  return String(Math.round(t * 100) / 100).replace('.', ',');
}

/** ⭐ L5/Q6 — le CALCUL de l'exemption (miroir littéral, catégorie fournie
 * par l'appelant — même patron que detectionObligatoireDepuisNiveau). */
function calculerExemption(categorie, fluideRef, machine) {
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

/** ⭐ E3 — l'exemption OPPOSABLE : le calcul derrière le drapeau (fermé =
 * toujours « non exempté », le choix conservateur historique). */
function exemptionControle(categorie, fluideRef, machine) {
  if (!EXEMPTION_HERMETIQUE_ACTIVE) return { exempte: false, motif: null };
  return calculerExemption(categorie, fluideRef, machine);
}

/** ⭐ E4 — seuil d'aptitude élargi : hermétique ET étiqueté. */
function hermetiqueOpposable(machine) {
  return Boolean(machine?.hermetiqueScelle) && Boolean(machine?.hermetiqueEtiquete);
}

/** ⭐ E5 — mobile LISTÉ, admis au contrôle immédiat après réparation. */
function mobileListe(machine) {
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
 * jamais moins de contrôles qu'exigé. MIROIR LITTÉRAL de l'ESM.
 */
const USAGES_THERMIQUES = ['FROID_COMMERCIAL', 'CLIMATISATION',
  'POMPE_A_CHALEUR'];

/** Libellés lisibles des usages thermiques. */
const LIBELLE_USAGE_THERMIQUE = {
  FROID_COMMERCIAL: 'Froid commercial',
  CLIMATISATION: 'Climatisation',
  POMPE_A_CHALEUR: 'Pompe à chaleur'
};

/** Débuts d'interdiction du fluide VIERGE à PRP >= 2500 (art. 13). */
const DEBUT_INTERDICTION_VIERGE_FROID = '2025-01-01';
const DEBUT_INTERDICTION_VIERGE_CLIM_PAC = '2026-01-01';

/**
 * ⭐ L3/R4 — date de début d'interdiction du fluide VIERGE applicable à CET
 * usage. CLIMATISATION et POMPE_A_CHALEUR → 01/01/2026 ; FROID_COMMERCIAL,
 * usage absent ou inconnu → 01/01/2025 (le plus strict).
 */
function debutInterdictionVierge(usageThermique) {
  return usageThermique === 'CLIMATISATION'
    || usageThermique === 'POMPE_A_CHALEUR'
    ? DEBUT_INTERDICTION_VIERGE_CLIM_PAC
    : DEBUT_INTERDICTION_VIERGE_FROID;
}

/** Garde de saisie — messages canoniques identiques au module ESM. */
function verifierModeleEquipement(machine) {
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

module.exports = {
  DELAI_VERIF_DETECTION_MOIS,
  SOUS_TYPES_MOBILES,
  SOUS_TYPES_MOBILES_ELIGIBLES,
  LIBELLE_SOUS_TYPE,
  USAGES_THERMIQUES,
  LIBELLE_USAGE_THERMIQUE,
  DEBUT_INTERDICTION_VIERGE_FROID,
  DEBUT_INTERDICTION_VIERGE_CLIM_PAC,
  debutInterdictionVierge,
  EXEMPTION_HERMETIQUE_ACTIVE,
  ajouterMoisEquipement,
  echeanceVerificationDetection,
  detectionEffective,
  detectionObligatoireDepuisNiveau,
  calculerExemption,
  exemptionControle,
  hermetiqueOpposable,
  mobileListe,
  verifierModeleEquipement
};
