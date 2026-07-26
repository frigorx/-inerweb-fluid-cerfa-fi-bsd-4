// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// LE TÉMOIN DE SESSION EST PORTÉ SUR LA FICHE (lot B3, brique 5)
//
// Le témoin d'identité de session (compte connecté + fiche du personnel
// liée) est capté et stocké en base depuis la brique C1 — mais il
// n'était affiché NULLE PART : on jetait une preuve qu'on possédait
// déjà. Il apparaît désormais sur chaque signature valide de la modale
// « Signatures de la fiche ».
//
// DÉCISION DU PROPRIÉTAIRE (25/07) : qu'une SEULE session pose les DEUX
// signatures est NORMAL — aucun message, aucun avertissement, aucune
// comparaison de sessions. Ce test vérifie AUSSI cette absence.
//
// Et le pré-remplissage du nom du technicien depuis la session
// connectée est vérifié À L'ÉCRAN, pas seulement dans le module pur.
//
// Exécution : node v8/js/modales/test-signatures-modal.mjs
// Node ≥ 18, mini-DOM maison (shim-dom-tests).
// ============================================================

let nbOk = 0;
let nbEchecs = 0;

function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

const { installerDocumentFactice, ElementFactice } =
  await import('../core/shim-dom-tests.mjs');
const { document } = installerDocumentFactice();

// Le shim n'a ni canvas ni layout : de quoi laisser tourner
// creerSignature sans rien dessiner.
ElementFactice.prototype.getContext = function getContext() {
  return {
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {},
    stroke() {}, fillRect() {}, clearRect() {}, setLineDash() {}
  };
};
ElementFactice.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, width: 700, height: 350 };
};
ElementFactice.prototype.toDataURL = function () { return 'data:,'; };

const { ouvrirSignaturesMouvement } = await import('./signatures-modal.js');

// ------------------------------------------------------------
// Décor : un professeur connecté, un élève intervenant, un brouillon
// dont les DEUX signatures ont été posées depuis LA MÊME session.
// ------------------------------------------------------------
const PROF = { id: 'PER-prof', nom: 'Henninot', prenom: 'Franck',
  roleApp: 'REFERENT', numAttestationAptitude: 'AA-2026-1' };
const ELEVE = { id: 'PER-eleve', nom: 'Élève', prenom: 'Un',
  roleApp: 'ELEVE', numAttestationAptitude: null };
const COMPTE = 'UTI-abc123';

const MOUVEMENT = { id: 'MVT-1', numero: 'FI-2026-0042', mode: 'FORMATION',
  machineId: null, executeParId: ELEVE.id };

function signature(role, surcharges = {}) {
  return {
    id: 'SIG-' + role, mouvementId: MOUVEMENT.id, role,
    nom: role === 'TECHNICIEN' ? 'Élève' : 'Henninot',
    prenom: role === 'TECHNICIEN' ? 'Un' : 'Franck',
    qualite: role === 'TECHNICIEN' ? 'Élève en formation' : 'Professeur',
    organisation: null, parDelegation: false,
    dateHeure: '2026-07-25T09:30:00.000Z',
    declaration: 'Déclaration figée.',
    imagePng: null,
    sessionCompteId: COMPTE, sessionPersonnelId: PROF.id,
    sha256Document: 'a'.repeat(64), versionDocument: 0,
    valide: true, ...surcharges
  };
}

function storeFactice(signatures) {
  return {
    getSignaturesMouvement: async () => signatures,
    getUtilisateurCourant: async () => PROF,
    getEtablissement: async () => ({ raisonSociale: 'LP Jacques Raynaud' }),
    getMachines: async () => [],
    getClients: async () => [],
    getPersonnel: async () => [PROF, ELEVE],
    simulerValidationOfficielle: async () => ({ blocages: [] })
  };
}

/**
 * Ouvre la modale et rend le HTML du parcours.
 * (Le mini-DOM ne sérialise pas les enfants : on relit la zone que la
 * modale remplit, c'est-à-dire exactement ce qui s'affiche.)
 */
async function ouvrir(signatures, mouvement = MOUVEMENT) {
  document.body.innerHTML = '';
  await ouvrirSignaturesMouvement(
    { store: storeFactice(signatures), naviguer() {} }, mouvement);
  const zone = document.querySelector('[data-zone-parcours]');
  return zone ? zone.innerHTML : '';
}

// ------------------------------------------------------------
// 1. Le témoin de session est VISIBLE sur chaque signature valide
// ------------------------------------------------------------
{
  const html = await ouvrir([signature('TECHNICIEN'), signature('DETENTEUR')]);
  const occurrences = html.split('Posée depuis la session').length - 1;
  verifier('les DEUX signatures valides portent leur témoin de session',
    occurrences === 2, `occurrences = ${occurrences}`);
  verifier('le témoin nomme la personne de la session (fiche vivante)',
    html.includes('Franck Henninot'));
  verifier('le témoin porte l’identifiant du compte (témoin non ambigu)',
    html.includes(COMPTE));
}

// ------------------------------------------------------------
// 2. DÉCISION D1 : une seule session pour les deux signatures est
//    NORMAL — ni blocage, ni avertissement, ni message
// ------------------------------------------------------------
{
  const html = await ouvrir([signature('TECHNICIEN'), signature('DETENTEUR')]);
  verifier('même session pour les deux signatures : AUCUN bandeau d’avertissement',
    !html.includes('bandeau-avertissement'));
  verifier('même session pour les deux signatures : AUCUN bandeau d’erreur',
    !html.includes('bandeau-erreur'));
  verifier('aucun mot de suspicion à l’écran (« même session », « suspect »…)',
    !/même session|identique|suspect|douteu/i.test(html));
  verifier('la fiche est déclarée prête à être soumise',
    html.includes('Soumettre le mouvement'));
}

// ------------------------------------------------------------
// 3. Une session inconnue ne fait pas mentir l'écran
// ------------------------------------------------------------
{
  const html = await ouvrir([
    signature('TECHNICIEN', { sessionCompteId: null, sessionPersonnelId: null })
  ]);
  verifier('signature sans témoin : la carte ne prétend rien',
    !html.includes('Posée depuis la session'));
  const htmlInconnu = await ouvrir([
    signature('TECHNICIEN', { sessionPersonnelId: 'PER-disparu' })
  ]);
  // REVUE DU 25/07 (MINEUR 3) : cette vérification s'assurait que
  // « PER-disparu » n'était pas à l'écran — vrai PAR CONSTRUCTION, la
  // carte n'affiche JAMAIS sessionPersonnelId. Elle ne pouvait pas
  // échouer. Le vrai risque est ailleurs : que le témoin INVENTE un nom
  // (celui du compte connecté, par exemple) quand la fiche liée
  // n'existe plus. C'est cela qui est tiré ici — le témoin doit se
  // réduire au compte, mot pour mot, et ne nommer personne.
  // (Le nom, s'il était inventé, s'insérerait ENTRE « session » et
  // « (compte » : exiger la phrase d'un seul tenant suffit à l'exclure.)
  verifier('compte connu mais fiche introuvable : le compte est montré SEUL,'
    + ' aucun nom n’est inventé',
  htmlInconnu.includes('Posée depuis la session (compte ' + COMPTE + ')'),
  htmlInconnu.slice(htmlInconnu.indexOf('Posée depuis'), 200));
}

// ------------------------------------------------------------
// 4. Pré-remplissage du signataire depuis la session (décision D3)
// ------------------------------------------------------------
{
  // Aucun intervenant déclaré sur la fiche : c'est la SESSION qui
  // pré-remplit le nom du technicien — et le champ reste saisissable.
  const sansIntervenant = { ...MOUVEMENT, executeParId: null };
  const html = await ouvrir([], sansIntervenant);
  verifier('technicien pré-rempli depuis la session connectée (nom et prénom)',
    /data-champ="prenom" value="Franck"/.test(html)
    && /data-champ="nom" value="Henninot"/.test(html), html.slice(0, 400));
  verifier('les champs restent MODIFIABLES (input texte, jamais verrouillé)',
    /<input type="text" data-champ="nom"/.test(html)
    && !/data-champ="nom"[^>]*(readonly|disabled)/.test(html));

  // Intervenant déclaré : c'est lui le technicien pressenti (la fiche
  // dit qui a fait le geste), et la session reste affichée en tête.
  const htmlEleve = await ouvrir([]);
  verifier('intervenant déclaré : c’est lui le technicien pré-rempli',
    /data-champ="prenom" value="Un"/.test(htmlEleve));
  verifier('la session reste affichée en tête du parcours',
    htmlEleve.includes('Session :') && htmlEleve.includes('Franck Henninot'));
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [témoin de session porté sur la fiche]`);
process.exit(nbEchecs === 0 ? 0 : 1);
