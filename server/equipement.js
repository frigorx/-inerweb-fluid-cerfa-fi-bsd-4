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
  const declaree = Boolean(machine && machine.detectionPermanente);
  if (!declaree) {
    return { compte: false, declaree: false, echeance: null, motif: 'ABSENTE' };
  }
  const echeance = echeanceVerificationDetection(
    machine ? machine.detectionVerifieeLe : null);
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

/** ⭐ E3 — AUCUNE exemption codée à ce jour (choix conservateur assumé). */
function exemptionControle(_fluideRef, _machine) {
  return { exempte: false, motif: null };
}

/** ⭐ E4 — seuil d'aptitude élargi : hermétique ET étiqueté. */
function hermetiqueOpposable(machine) {
  return Boolean(machine && machine.hermetiqueScelle)
    && Boolean(machine && machine.hermetiqueEtiquete);
}

/** ⭐ E5 — mobile LISTÉ, admis au contrôle immédiat après réparation. */
function mobileListe(machine) {
  if (String((machine && machine.typeInstallation) || '') !== 'MOBILE') {
    return false;
  }
  return SOUS_TYPES_MOBILES_ELIGIBLES.includes(
    String((machine && machine.sousTypeInstallation) || ''));
}

/** Garde de saisie — messages canoniques identiques au module ESM. */
function verifierModeleEquipement(machine) {
  const m = machine || {};
  const sousType = m.sousTypeInstallation;
  if (sousType != null && String(sousType) !== ''
      && !SOUS_TYPES_MOBILES.includes(String(sousType))) {
    throw new Error('Sous-type d’installation inconnu : '
      + `${SOUS_TYPES_MOBILES.join(', ')}.`);
  }
  if (sousType != null && String(sousType) !== ''
      && String(m.typeInstallation != null ? m.typeInstallation : 'FIXE') !== 'MOBILE') {
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
  ajouterMoisEquipement,
  echeanceVerificationDetection,
  detectionEffective,
  detectionObligatoireDepuisNiveau,
  exemptionControle,
  hermetiqueOpposable,
  mobileListe,
  verifierModeleEquipement
};
