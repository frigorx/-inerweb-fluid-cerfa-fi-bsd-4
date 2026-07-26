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
// 1 bis. ⭐ REVUE DU 26/07 — UNE IMAGE ILLISIBLE N'EST PAS UNE
// SIGNATURE « PÉRIMÉE ».
// Depuis que `valide` intègre la recevabilité de l'image (revue du
// 25/07), tout « valide !== true » était annoncé PERIMEE — donc « la
// fiche a été modifiée après la signature ». C'est FAUX quand la fiche
// n'a pas bougé : le cas se reconnaît à ce que la RÉVISION SIGNÉE est
// égale à la révision courante. Ce motif faux allait à l'écran ET dans
// la colonne « État » de signatures.csv, au dossier SCELLÉ.
// ------------------------------------------------------------
const sigIllisible = (role, id, valide = false) =>
  ({ ...sig(role, valide, id), imageRecevable: false });

{
  const p = etatParcoursSignatures([sigIllisible('TECHNICIEN', 's1')]);
  verifier('⭐ image illisible : état IMAGE_ILLISIBLE, et JAMAIS « périmée »',
    p.technicien === 'IMAGE_ILLISIBLE', p.technicien);
  verifier('image illisible : la signature reste RETENUE (elle existe, on la nomme)',
    p.signatureTechnicien !== null && p.signatureTechnicien.id === 's1');
  verifier('image illisible : on peut re-signer, et la fiche n’est PAS prête',
    p.roleSuivant === 'TECHNICIEN' && p.pretPourSoumission === false);
}
{
  // Le cas exact du dossier scellé : révision signée = révision
  // courante, donc rien n'a bougé — « périmée » était démontrablement
  // faux. Ici « valide » est false pour la seule raison de l'image.
  const p = etatParcoursSignatures([sigIllisible('DETENTEUR', 's2')]);
  verifier('⭐ la fiche n’a pas bougé : l’état ne parle PAS de modification',
    p.detenteur === 'IMAGE_ILLISIBLE' && p.detenteur !== 'PERIMEE');
}
{
  // Non-régression : une périmée dont l'image se lit reste PERIMEE.
  const p = etatParcoursSignatures([
    { ...sig('TECHNICIEN', false, 's1'), imageRecevable: true }]);
  verifier('périmée dont l’image se lit : toujours PERIMEE (rien n’a changé)',
    p.technicien === 'PERIMEE');
}
{
  // Recevabilité NON DITE (store ancien, appel de test) : comportement
  // d'avant, mot pour mot. Ce champ nomme une cause, il n'ajoute
  // aucun refus.
  const p = etatParcoursSignatures([sig('TECHNICIEN', false, 's1')]);
  verifier('recevabilité non dite : PERIMEE comme avant (aucun refus ajouté)',
    p.technicien === 'PERIMEE');
}
{
  // Illisible puis re-signée proprement : la retenue est la VALIDE.
  const p = etatParcoursSignatures([
    sigIllisible('TECHNICIEN', 's1'), sig('TECHNICIEN', true, 's2')]);
  verifier('illisible puis re-signée : la retenue est la signature valide',
    p.technicien === 'VALIDE' && p.signatureTechnicien.id === 's2');
}
{
  // Une périmée LISIBLE et une illisible plus récente : l'état retenu
  // est PERIMEE — même choix que le moteur (etatSignatureReelle des
  // deux magasins écarte les illisibles AVANT le tri-état). L'écran ne
  // doit pas dire autre chose que le moteur.
  const p = etatParcoursSignatures([
    { ...sig('TECHNICIEN', false, 's1'), imageRecevable: true },
    sigIllisible('TECHNICIEN', 's2')]);
  verifier('périmée lisible + illisible plus récente : PERIMEE, comme le moteur',
    p.technicien === 'PERIMEE' && p.signatureTechnicien.id === 's1');
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
