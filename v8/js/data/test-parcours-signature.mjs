// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Module PUR parcours-signature.js (lot C, brique C4) :
//   1. etatParcoursSignatures — tri-état par rôle, signature RETENUE
//      (dernière valide sinon dernière), ordre du parcours, prêt
//      pour soumission ;
//   2. preremplirSignature — décisions du plan lot C §2 : équipement
//      du lycée = professeur PAR DÉLÉGATION pré-cochée, client tiers
//      = personne physique à saisir, technicien = intervenant déclaré.
// Aucune I/O, aucun DOM. Exécution : node test-parcours-signature.mjs
// ============================================================

import { etatParcoursSignatures, preremplirSignature }
  from './parcours-signature.js';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

// ------------------------------------------------------------
// 1. etatParcoursSignatures
// ------------------------------------------------------------
const sig = (role, valide, id) =>
  ({ id, role, valide, nom: 'N', prenom: 'P', dateHeure: '2026-07-19T10:00:00Z' });

{
  const p = etatParcoursSignatures([]);
  verifier('aucune signature : tout ABSENTE, le technicien signe en premier',
    p.technicien === 'ABSENTE' && p.detenteur === 'ABSENTE'
    && p.roleSuivant === 'TECHNICIEN' && p.pretPourSoumission === false
    && p.signatureTechnicien === null && p.signatureDetenteur === null);
}
{
  const p = etatParcoursSignatures(null);
  verifier('liste absente (store partiel) : même état qu’une liste vide',
    p.technicien === 'ABSENTE' && p.roleSuivant === 'TECHNICIEN');
}
{
  const p = etatParcoursSignatures([sig('TECHNICIEN', true, 's1')]);
  verifier('technicien valide seul : au tour du détenteur',
    p.technicien === 'VALIDE' && p.detenteur === 'ABSENTE'
    && p.roleSuivant === 'DETENTEUR' && p.pretPourSoumission === false);
}
{
  const p = etatParcoursSignatures([
    sig('TECHNICIEN', true, 's1'), sig('DETENTEUR', true, 's2')]);
  verifier('les deux valides : prêt pour soumission, aucun rôle suivant',
    p.pretPourSoumission === true && p.roleSuivant === null);
}
{
  // Fiche modifiée après signatures : les deux sont périmées, on
  // recommence par le technicien.
  const p = etatParcoursSignatures([
    sig('TECHNICIEN', false, 's1'), sig('DETENTEUR', false, 's2')]);
  verifier('les deux périmées : PERIMEE des deux côtés, technicien d’abord',
    p.technicien === 'PERIMEE' && p.detenteur === 'PERIMEE'
    && p.roleSuivant === 'TECHNICIEN' && p.pretPourSoumission === false);
}
{
  // Re-signature après péremption : la RETENUE est la dernière VALIDE,
  // l'ancienne périmée reste en table sans peser sur l'état.
  const p = etatParcoursSignatures([
    sig('TECHNICIEN', false, 's1'), sig('TECHNICIEN', true, 's3')]);
  verifier('périmée puis re-signée : la retenue est la signature valide',
    p.technicien === 'VALIDE' && p.signatureTechnicien.id === 's3');
}

// ------------------------------------------------------------
// 2. preremplirSignature
// ------------------------------------------------------------
const utilisateur = { nom: 'Henninot', prenom: 'Franck', roleApp: 'REFERENT' };
const etablissement = { raisonSociale: 'LP Jacques Raynaud' };

{
  const p = preremplirSignature('TECHNICIEN', {
    intervenant: { nom: 'Eleve', prenom: 'Un', numAttestationAptitude: null },
    utilisateur, etablissement
  });
  verifier('technicien : l’intervenant déclaré, élève en formation',
    p.nom === 'Eleve' && p.prenom === 'Un'
    && p.qualite === 'Élève en formation' && p.parDelegation === false);
}
{
  const p = preremplirSignature('TECHNICIEN', {
    intervenant: { nom: 'Apte', prenom: 'Tech', numAttestationAptitude: 'A-1' },
    utilisateur
  });
  verifier('technicien titulaire : qualité « attestation d’aptitude »',
    p.qualite === 'Titulaire de l’attestation d’aptitude');
}
{
  const p = preremplirSignature('TECHNICIEN', { utilisateur });
  verifier('technicien sans intervenant déclaré : repli sur la session',
    p.nom === 'Henninot' && p.prenom === 'Franck');
}
{
  // Équipement du lycée (pas de client détenteur) : le professeur
  // connecté signe PAR DÉLÉGATION de l'établissement, case pré-cochée.
  const p = preremplirSignature('DETENTEUR', { utilisateur, etablissement });
  verifier('détenteur lycée : délégation PRÉ-COCHÉE, professeur pré-rempli',
    p.parDelegation === true && p.nom === 'Henninot'
    && p.organisation === 'LP Jacques Raynaud'
    && p.qualite ===
      'Professeur, par délégation du détenteur (LP Jacques Raynaud)');
}
{
  // Client tiers : personne physique à saisir, raison sociale
  // pré-remplie, délégation au choix du signataire (décochée).
  const p = preremplirSignature('DETENTEUR', {
    utilisateur, etablissement,
    client: { raisonSociale: 'Boulangerie Le Fournil' }
  });
  verifier('détenteur tiers : champs vides, raison sociale du client',
    p.parDelegation === false && p.nom === '' && p.prenom === ''
    && p.organisation === 'Boulangerie Le Fournil'
    && p.qualite === 'Détenteur de l’équipement');
}
{
  let leve = false;
  try { preremplirSignature('PATRON', {}); } catch { leve = true; }
  verifier('rôle inconnu : refus', leve);
}

// ------------------------------------------------------------
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [module pur parcours-signature]`);
process.exit(nbEchecs === 0 ? 0 : 1);
