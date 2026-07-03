// ============================================================
// inerWeb Fluide v8 — dossier d'audit annuel (Phase D, étape 3)
// Assemble en UN CLIC une archive ZIP complète et opposable :
//   00-SOMMAIRE.txt        — contenu du dossier, établissement, date
//   *.csv                  — les 9 tables du registre (exports.js)
//   cerfa/<numero>.pdf     — CERFA 15497*04 officiel rempli pour
//                            chaque mouvement VALIDE/ANNULE de
//                            l'année ET chaque contrôle de l'année
//   pieces-jointes/attestation-capacite/* — attestation de capacité
//                            de l'établissement si déposée
// Aucune dépendance externe nouvelle : pdf-lib est chargé
// PARESSEUSEMENT par le générateur CERFA (jamais à l'import).
// Module ES, testable sous Node (creerZip retombe sur Uint8Array
// si Blob indisponible).
// ============================================================

import { creerZip } from '../core/zip.js';
import { toutesLesTables } from './exports.js';
import { genererCerfaPdf } from '../cerfa/generateur.js';

/** Statuts de mouvement inscrits au registre (donc porteurs d'un CERFA). */
const STATUTS_REGISTRE = ['VALIDE', 'ANNULE'];

/** Date ISO « AAAA-MM-JJ » → « JJ/MM/AAAA » (sans objet Date, sans fuseau). */
function fmtDateFr(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [annee, mois, jour] = iso.slice(0, 10).split('-');
  return `${jour}/${mois}/${annee}`;
}

/**
 * Convertit un contenu de pièce jointe (Blob en navigateur, Uint8Array
 * sous Node — cf. store.obtenirPieceJointe) en Uint8Array pour le ZIP.
 * @param {Blob|Uint8Array} contenu
 * @returns {Promise<Uint8Array>}
 */
async function versOctets(contenu) {
  if (contenu instanceof Uint8Array) return contenu;
  if (typeof Blob !== 'undefined' && contenu instanceof Blob) {
    return new Uint8Array(await contenu.arrayBuffer());
  }
  throw new TypeError('Pièce jointe : contenu binaire inattendu.');
}

/** Nettoie un nom pour l'archive : pas de séparateurs de chemin parasites. */
function nomSur(nom) {
  return String(nom || 'document').replace(/[\\/]+/g, '_').trim() || 'document';
}

/**
 * Rédige le sommaire du dossier (00-SOMMAIRE.txt) : établissement,
 * date de génération, rappel d'origine et liste complète des fichiers.
 * @param {object} etablissement - fiche opérateur du store
 * @param {number} annee - année du dossier
 * @param {string[]} nomsFichiers - chemins des fichiers de l'archive
 * @param {Date} maintenant - date de génération
 * @returns {string} contenu texte du sommaire
 */
function redigerSommaire(etablissement, annee, nomsFichiers, maintenant) {
  const jour = String(maintenant.getDate()).padStart(2, '0');
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
  const heures = String(maintenant.getHours()).padStart(2, '0');
  const minutes = String(maintenant.getMinutes()).padStart(2, '0');
  const lignes = [
    `DOSSIER D'AUDIT ANNUEL ${annee} — REGISTRE DES FLUIDES FRIGORIGÈNES`,
    '='.repeat(68),
    '',
    `Établissement : ${etablissement.raisonSociale ?? ''}`,
    `Adresse       : ${etablissement.adresse ?? ''}`,
    `SIRET         : ${etablissement.siret ?? ''}`,
    `Attestation de capacité : ${etablissement.numAttestationCapacite ?? '—'}` +
      (etablissement.dateEcheanceCapacite
        ? ` (échéance ${fmtDateFr(etablissement.dateEcheanceCapacite)})`
        : ''),
    '',
    `Généré le ${jour}/${mois}/${maintenant.getFullYear()} à ${heures}:${minutes}`,
    'Documents générés par inerWeb Fluide.',
    '',
    'CONTENU DU DOSSIER',
    '-'.repeat(68),
    ...nomsFichiers.map((nom) => `  ${nom}`),
    '',
    'Les fichiers cerfa/*.pdf sont les fiches d\'intervention CERFA',
    '15497*04 officielles remplies (mouvements inscrits au registre et',
    'contrôles d\'étanchéité de l\'année). Les fichiers *.csv sont les',
    'tables du registre (séparateur « ; », encodage UTF-8).',
    ''
  ];
  return lignes.join('\r\n');
}

/**
 * Génère le dossier d'audit annuel complet sous forme d'archive ZIP.
 * @param {object} store - magasin de données v8 (contrat Phases A/B/C)
 * @param {number} annee - année de référence du dossier
 * @returns {Promise<{ blob: Blob|Uint8Array, nomFichier: string,
 *                     nbDocuments: number }>}
 *          nbDocuments = nombre de fichiers contenus dans l'archive
 */
export async function genererDossierAudit(store, annee) {
  const maintenant = new Date();
  const prefixeAnnee = `${annee}-`;

  const [etablissement, mouvements, controles, tables] = await Promise.all([
    store.getEtablissement(),
    store.getMouvements(),
    store.getControles(),
    toutesLesTables(store, annee)
  ]);

  /** @type {Array<{nom: string, contenu: string|Uint8Array}>} */
  const entrees = [];

  // ---- 1. Les 9 tables CSV du registre ----
  for (const table of tables) {
    entrees.push({ nom: table.nom, contenu: table.contenu });
  }

  // ---- 2. CERFA officiels remplis : mouvements inscrits au registre ----
  const mouvementsRegistre = mouvements.filter((mv) =>
    STATUTS_REGISTRE.includes(mv.statut) &&
    (mv.date || '').startsWith(prefixeAnnee));
  for (const mouvement of mouvementsRegistre) {
    const { octets, numero } = await genererCerfaPdf(store, {
      source: 'mouvement', id: mouvement.id
    });
    entrees.push({ nom: `cerfa/${nomSur(numero)}.pdf`, contenu: octets });
  }

  // ---- 3. CERFA officiels remplis : contrôles d'étanchéité de l'année ----
  const controlesAnnee = controles.filter((c) =>
    (c.date || '').startsWith(prefixeAnnee));
  for (const controle of controlesAnnee) {
    const { octets, numero } = await genererCerfaPdf(store, {
      source: 'controle', id: controle.id
    });
    entrees.push({ nom: `cerfa/${nomSur(numero)}.pdf`, contenu: octets });
  }

  // ---- 4. Attestation de capacité de l'établissement (si déposée) ----
  const pieces = await store.listerPiecesJointes(
    'ETABLISSEMENT', 'etablissement');
  for (const piece of pieces) {
    if (piece.categorie !== 'ATTESTATION_CAPACITE') continue;
    const complete = await store.obtenirPieceJointe(piece.id);
    entrees.push({
      nom: `pieces-jointes/attestation-capacite/${nomSur(piece.nomFichier)}`,
      contenu: await versOctets(complete.blob)
    });
  }

  // ---- 5. Sommaire en tête d'archive (liste TOUS les fichiers) ----
  const nomsFichiers = entrees.map((e) => e.nom);
  const sommaire = redigerSommaire(
    etablissement, annee, ['00-SOMMAIRE.txt', ...nomsFichiers], maintenant);
  entrees.unshift({ nom: '00-SOMMAIRE.txt', contenu: sommaire });

  return {
    blob: creerZip(entrees, maintenant),
    nomFichier: `dossier-audit-fluides-${annee}.zip`,
    nbDocuments: entrees.length
  };
}
