// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// PDF final CONSERVÉ, côté service (lot C, brique C3b) :
//   1. doitServirPdfConserve — table de vérité (le conservé n'est
//      servi QUE pour une écriture OFFICIELLE figée avec empreinte
//      scellée ; tout le reste garde le générateur) ;
//   2. chargerPdfConserve — nominal (empreinte vérifiée, nom et
//      numéro rendus), pièce manquante DÉNONCÉE, contenu altéré
//      DÉNONCÉ (jamais de repli vers le générateur ici : c'est le
//      visualiseur qui décide, et il ne régénère pas).
// Magasin FACTICE conforme au contrat (listerPiecesJointes,
// obtenirPieceJointe) — aucune base, aucun DOM.
// Exécution : node v8/js/cerfa/test-conserve.mjs
// ============================================================

import { doitServirPdfConserve, chargerPdfConserve,
  resoudreMouvementConserve,
  MSG_PDF_CONSERVE_INTROUVABLE, MSG_PDF_CONSERVE_ALTERE }
  from './conserve.js';
import { CATEGORIE_PDF_FINAL } from '../data/pdf-final.js';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}
async function attendreRejet(libelle, promesse, messageExact) {
  try {
    await promesse;
    verifier(libelle, false, 'aucune erreur levée');
  } catch (erreur) {
    verifier(libelle, erreur.message === messageExact,
      `message = « ${erreur.message} »`);
  }
}

/** SHA-256 hexadécimal (même canal subtle que le module éprouvé). */
async function sha256Hex(octets) {
  const { webcrypto } = await import('node:crypto');
  const empreinte = await webcrypto.subtle.digest('SHA-256', octets);
  return [...new Uint8Array(empreinte)]
    .map((octet) => octet.toString(16).padStart(2, '0'))
    .join('');
}

const octetsPdf = new TextEncoder()
  .encode('%PDF-1.4\nPDF conserve de test C3b\n%%EOF\n');
const shaPdf = await sha256Hex(octetsPdf);

// ------------------------------------------------------------
// 1. Table de vérité de doitServirPdfConserve
// ------------------------------------------------------------
const CAS_DECISION = [
  ['OFFICIEL VALIDE avec empreinte scellée → conservé',
    { mode: 'OFFICIEL', statut: 'VALIDE', hashPdfFinal: shaPdf }, true],
  ['OFFICIEL ANNULE avec empreinte scellée → conservé (preuve intacte)',
    { mode: 'OFFICIEL', statut: 'ANNULE', hashPdfFinal: shaPdf }, true],
  ['OFFICIEL VALIDE SANS empreinte (historique pré-lot C) → générateur',
    { mode: 'OFFICIEL', statut: 'VALIDE', hashPdfFinal: null }, false],
  ['OFFICIEL SOUMIS → générateur (rien de scellé)',
    { mode: 'OFFICIEL', statut: 'SOUMIS', hashPdfFinal: null }, false],
  ['FORMATION VALIDE → générateur (jamais de PDF conservé)',
    { mode: 'FORMATION', statut: 'VALIDE', hashPdfFinal: null }, false],
  ['mouvement introuvable (undefined) → générateur',
    undefined, false]
];
for (const [libelle, mouvement, attendu] of CAS_DECISION) {
  verifier(libelle, doitServirPdfConserve(mouvement) === attendu);
}

// ------------------------------------------------------------
// 2. chargerPdfConserve sur magasin factice
// ------------------------------------------------------------
const mouvementFige = {
  id: 'MVT-TEST', numero: 'FI-2026-0007', cerfaNumero: 'FI-2026-0007',
  mode: 'OFFICIEL', statut: 'VALIDE', hashPdfFinal: shaPdf
};

/** Magasin factice : les deux seules méthodes utilisées par le module. */
function magasin(pieces, contenus) {
  return {
    async listerPiecesJointes(entiteType, entiteId) {
      return pieces.filter((pj) =>
        pj.entiteType === entiteType && pj.entiteId === entiteId);
    },
    async obtenirPieceJointe(id) {
      return { blob: contenus[id] };
    }
  };
}

const pieceConservee = {
  id: 'PJ-CERFA', entiteType: 'MOUVEMENT', entiteId: 'MVT-TEST',
  categorie: CATEGORIE_PDF_FINAL, nomFichier: 'CERFA-FI-2026-0007.pdf'
};
const pieceOrdinaire = {
  id: 'PJ-PHOTO', entiteType: 'MOUVEMENT', entiteId: 'MVT-TEST',
  categorie: 'PHOTO', nomFichier: 'photo.png'
};

{
  // Nominal : Uint8Array (repli Node du DemoStore).
  const resultat = await chargerPdfConserve(
    magasin([pieceOrdinaire, pieceConservee], { 'PJ-CERFA': octetsPdf }),
    mouvementFige);
  verifier('nominal : octets rendus, empreinte vérifiée, nom et numéro exacts',
    resultat.octets === octetsPdf &&
    resultat.nomFichier === 'CERFA-FI-2026-0007.pdf' &&
    resultat.numero === 'FI-2026-0007');
}
{
  // Nominal : Blob (navigateur et LocalStore).
  const resultat = await chargerPdfConserve(
    magasin([pieceConservee],
      { 'PJ-CERFA': new Blob([octetsPdf], { type: 'application/pdf' }) }),
    mouvementFige);
  verifier('nominal : un Blob est accepté et relu octet pour octet',
    await sha256Hex(resultat.octets) === shaPdf);
}
await attendreRejet(
  'pièce CERFA_FINAL absente → DÉNONCÉ (message canonique, pas de repli)',
  chargerPdfConserve(magasin([pieceOrdinaire], {}), mouvementFige),
  MSG_PDF_CONSERVE_INTROUVABLE);
await attendreRejet(
  'ATTAQUE : contenu remplacé (empreinte scellée divergente) → DÉNONCÉ',
  chargerPdfConserve(
    magasin([pieceConservee], {
      'PJ-CERFA': new TextEncoder().encode('%PDF-1.4\nPDF FALSIFIE\n%%EOF\n')
    }), mouvementFige),
  MSG_PDF_CONSERVE_ALTERE);
await attendreRejet(
  'ATTAQUE : métadonnées cohérentes mais mouvement scellé avec une AUTRE '
  + 'empreinte → DÉNONCÉ (la vérité est l’empreinte scellée, jamais la PJ)',
  chargerPdfConserve(
    magasin([pieceConservee], { 'PJ-CERFA': octetsPdf }),
    { ...mouvementFige, hashPdfFinal: '0'.repeat(64) }),
  MSG_PDF_CONSERVE_ALTERE);
await attendreRejet(
  'métadonnée présente mais binaire indisponible → même consigne canonique',
  chargerPdfConserve(
    {
      async listerPiecesJointes() { return [pieceConservee]; },
      async obtenirPieceJointe() {
        throw new Error('Contenu de la pièce jointe introuvable : x.');
      }
    }, mouvementFige),
  MSG_PDF_CONSERVE_INTROUVABLE);

// ------------------------------------------------------------
// 3. resoudreMouvementConserve — les DEUX portes du visualiseur
// (la porte « contrôle » contournait le conservé : constat de la
// relecture adversariale C3b, fermé et figé ici)
// ------------------------------------------------------------
{
  const mouvementFormation = {
    id: 'MVT-FORM', numero: 'FORM-2026-0001', mode: 'FORMATION',
    statut: 'VALIDE', hashPdfFinal: null
  };
  const controleLie = { id: 'CTL-LIE', mouvementId: 'MVT-TEST' };
  const controleLieFormation = { id: 'CTL-FORM', mouvementId: 'MVT-FORM' };
  const controleAutonome = { id: 'CTL-SEUL' };
  const boutique = {
    async getMouvements() { return [mouvementFige, mouvementFormation]; },
    async getControles() {
      return [controleLie, controleLieFormation, controleAutonome];
    }
  };
  verifier('porte mouvement : fiche officielle conservée résolue',
    (await resoudreMouvementConserve(boutique,
      { source: 'mouvement', id: 'MVT-TEST' }))?.id === 'MVT-TEST');
  verifier('porte contrôle LIÉ à une fiche conservée : MÊME résolution '
    + '(le contrôle est la même fiche — jamais le générateur)',
    (await resoudreMouvementConserve(boutique,
      { source: 'controle', id: 'CTL-LIE' }))?.id === 'MVT-TEST');
  verifier('porte contrôle lié à une fiche FORMATION : générateur (null)',
    await resoudreMouvementConserve(boutique,
      { source: 'controle', id: 'CTL-FORM' }) === null);
  verifier('contrôle AUTONOME : générateur (null)',
    await resoudreMouvementConserve(boutique,
      { source: 'controle', id: 'CTL-SEUL' }) === null);
  verifier('mouvement inconnu : générateur (null), aucune levée',
    await resoudreMouvementConserve(boutique,
      { source: 'mouvement', id: 'MVT-FANTOME' }) === null);
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('PDF conservé : décision, chargement vérifié et altérations dénoncées.');
