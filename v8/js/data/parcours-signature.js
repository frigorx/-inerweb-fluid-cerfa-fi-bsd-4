// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — PARCOURS de double signature (module PUR)
// Lot C du plan audit-proof (condition 3), brique C4.
//
// Rôle : les DÉCISIONS de l'écran de signature, sans aucun DOM —
//  - l'état du parcours à partir des signatures relues du store
//    (technicien PUIS détenteur, tri-état ABSENTE/VALIDE/PERIMEE) ;
//  - le pré-remplissage des champs du signataire (décision Franck
//    16/07 : équipement du lycée = le professeur signe détenteur
//    PAR DÉLÉGATION de l'établissement, case pré-cochée).
// Entrées : listes/objets du contrat (getSignaturesMouvement,
// fiches personnel/client/établissement). Aucune I/O.
// Consommé par v8/js/modales/signatures-modal.js ; testé par
// v8/js/data/test-parcours-signature.mjs.
// ============================================================

/**
 * L'état du parcours de double signature d'un mouvement.
 * La signature RETENUE pour un rôle est la dernière VALIDE ; à défaut,
 * la dernière posée (périmée : la fiche a été modifiée après).
 * @param {Array<object>} signatures liste de getSignaturesMouvement
 *   (triée dateHeure puis id, chaque entrée porte `valide`)
 * @returns {{
 *   technicien: 'ABSENTE'|'VALIDE'|'PERIMEE',
 *   detenteur: 'ABSENTE'|'VALIDE'|'PERIMEE',
 *   signatureTechnicien: ?object, signatureDetenteur: ?object,
 *   roleSuivant: ?('TECHNICIEN'|'DETENTEUR'),
 *   pretPourSoumission: boolean }}
 */
export function etatParcoursSignatures(signatures) {
  const liste = Array.isArray(signatures) ? signatures : [];
  const retenue = (role) => {
    const duRole = liste.filter((s) => s && s.role === role);
    const valides = duRole.filter((s) => s.valide === true);
    if (valides.length) return valides[valides.length - 1];
    return duRole.length ? duRole[duRole.length - 1] : null;
  };
  const etat = (sig) => {
    if (!sig) return 'ABSENTE';
    return sig.valide === true ? 'VALIDE' : 'PERIMEE';
  };
  const signatureTechnicien = retenue('TECHNICIEN');
  const signatureDetenteur = retenue('DETENTEUR');
  const technicien = etat(signatureTechnicien);
  const detenteur = etat(signatureDetenteur);
  // Ordre IMPOSÉ du parcours : le technicien d'abord. Une signature
  // détenteur encore valide alors que celle du technicien est tombée
  // est impossible (même révision) — le tri-état la montrerait périmée.
  const roleSuivant = technicien !== 'VALIDE'
    ? 'TECHNICIEN'
    : (detenteur !== 'VALIDE' ? 'DETENTEUR' : null);
  return {
    technicien,
    detenteur,
    signatureTechnicien,
    signatureDetenteur,
    roleSuivant,
    pretPourSoumission: technicien === 'VALIDE' && detenteur === 'VALIDE'
  };
}

/**
 * Pré-remplissage des champs du signataire (décisions du plan lot C §2).
 * Équipement du lycée = machine SANS client détenteur (le détenteur au
 * CERFA est alors l'établissement) : la signature détenteur est celle du
 * professeur connecté, PAR DÉLÉGATION, case pré-cochée. Pour un client
 * tiers : personne physique à saisir, raison sociale pré-remplie,
 * délégation décochée (de plein droit le cas échéant).
 * @param {string} role 'TECHNICIEN' | 'DETENTEUR'
 * @param {object} faits { intervenant?, utilisateur?, client?, etablissement? }
 *   intervenant = fiche personnel de « exécuté par » ; utilisateur = la
 *   personne de la session ; client = client détenteur de la machine
 *   (null ou absent = équipement du lycée) ; etablissement = dossier opérateur.
 * @returns {{nom: string, prenom: string, qualite: string,
 *   parDelegation: boolean, organisation: ?string}}
 */
export function preremplirSignature(role, faits) {
  const f = faits || {};
  if (role === 'TECHNICIEN') {
    // Le signataire pressenti : l'intervenant déclaré sur la fiche,
    // sinon la personne connectée (même logique de qualité que le CERFA).
    const personne = f.intervenant || f.utilisateur || null;
    return {
      nom: personne?.nom ?? '',
      prenom: personne?.prenom ?? '',
      qualite: personne
        ? (personne.numAttestationAptitude
          ? 'Titulaire de l’attestation d’aptitude'
          : 'Élève en formation')
        : '',
      parDelegation: false,
      organisation: null
    };
  }
  if (role === 'DETENTEUR') {
    if (f.client) {
      // Intervention pour un tiers : son représentant signe (personne
      // physique à saisir) ; la délégation reste au choix du signataire.
      return {
        nom: '',
        prenom: '',
        qualite: 'Détenteur de l’équipement',
        parDelegation: false,
        organisation: f.client.raisonSociale ?? null
      };
    }
    // Équipement du lycée : le professeur connecté signe par délégation
    // de l'établissement (décision Franck 16/07 — plan lot C §2.1).
    const raisonSociale = f.etablissement?.raisonSociale ?? null;
    return {
      nom: f.utilisateur?.nom ?? '',
      prenom: f.utilisateur?.prenom ?? '',
      qualite: raisonSociale
        ? `Professeur, par délégation du détenteur (${raisonSociale})`
        : 'Professeur, par délégation du détenteur',
      parDelegation: true,
      organisation: raisonSociale
    };
  }
  throw new Error(`Rôle de signature inconnu : ${role} ` +
    '(attendu : TECHNICIEN, DETENTEUR).');
}
