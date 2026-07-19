// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — dossier d'audit annuel (Phase D, étape 3)
// Assemble en UN CLIC une archive ZIP complète et opposable :
//   00-SOMMAIRE.txt        — contenu du dossier, établissement, date
//   *.csv                  — les tables du registre (exports.js)
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
import {
  doitServirPdfConserve, chargerPdfConserve, resoudreMouvementConserve
} from '../cerfa/conserve.js';
import {
  versOctets, nomSur, octetsEntree, sha256Hex
} from './dossier-commun.js';

/** Statuts de mouvement inscrits au registre (donc porteurs d'un CERFA). */
const STATUTS_REGISTRE = ['VALIDE', 'ANNULE'];

/** Date ISO « AAAA-MM-JJ » → « JJ/MM/AAAA » (sans objet Date, sans fuseau). */
function fmtDateFr(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [annee, mois, jour] = iso.slice(0, 10).split('-');
  return `${jour}/${mois}/${annee}`;
}

// versOctets / nomSur / octetsEntree / sha256Hex sont désormais partagés
// (documents/dossier-commun.js) avec les dossiers machine et client — versOctets
// y accepte aussi une chaîne base64 (parité mode Local).

/**
 * Rédige le manifeste des empreintes SHA-256 (01-EMPREINTES-SHA256.txt) :
 * une ligne « <empreinte>  <fichier> » par entrée du dossier (sommaire +
 * fichiers de données), pour vérifier l'intégrité fichier par fichier. Le
 * manifeste ne peut pas contenir sa propre empreinte ; l'empreinte GLOBALE
 * du ZIP (retournée par genererDossierAudit) scelle l'ensemble, manifeste
 * compris.
 * @param {Array<{nom: string, contenu: string|Uint8Array}>} entrees
 * @param {number} annee
 * @returns {Promise<string>}
 */
async function redigerManifesteEmpreintes(entrees, annee) {
  const lignes = [
    `EMPREINTES SHA-256 — DOSSIER D'AUDIT ${annee}`,
    '='.repeat(68),
    '',
    'Chaque fichier du dossier est listé avec son empreinte SHA-256.',
    'Pour vérifier qu\'un fichier n\'a pas été modifié, recalculez son',
    'empreinte SHA-256 et comparez-la à la valeur ci-dessous.',
    'L\'empreinte GLOBALE de l\'archive .zip (à conserver hors du logiciel',
    'au moment de l\'export) scelle l\'ensemble du dossier.',
    '',
    '-'.repeat(68)
  ];
  for (const entree of entrees) {
    const hex = await sha256Hex(octetsEntree(entree.contenu));
    lignes.push(`${hex}  ${entree.nom}`);
  }
  lignes.push('');
  return lignes.join('\r\n');
}

/**
 * Rédige la pièce 02-PDF-CONSERVES.txt (brique C5) : le verdict, fiche
 * par fiche, de la restitution des PDF finaux CONSERVÉS — conservé et
 * vérifié (empreinte scellée), ou ANOMALIE dénoncée (document absent ou
 * altéré, jamais régénéré).
 * @param {string[]} verdicts - une ligne par fiche à PDF scellé
 * @param {number} annee
 * @returns {string}
 */
function redigerVerdictsConserves(verdicts, annee) {
  return [
    `PDF FINAUX CONSERVÉS — DOSSIER D'AUDIT ${annee}`,
    '='.repeat(68),
    '',
    'Les fiches OFFICIELLES scellées avec leur PDF final sont restituées',
    'depuis le document CONSERVÉ tel que présenté aux signataires (jamais',
    'régénéré), vérifié contre l\'empreinte SHA-256 scellée dans',
    'l\'écriture chaînée. Une anomalie ci-dessous signifie que le document',
    'conservé manque ou a été modifié : restaurer une sauvegarde vérifiée.',
    '',
    '-'.repeat(68),
    ...verdicts,
    ''
  ].join('\r\n');
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

  // ---- 1. Les tables CSV du registre (11 fixes + conditionnelles : photo
  // nominative, outils-intervention.csv — brique 2) — la liste `tables`
  // (exports.js/toutesLesTables) porte déjà toute la logique de conditions ;
  // ce module se contente de reprendre les entrées qu'elle a produites. ----
  for (const table of tables) {
    entrees.push({ nom: table.nom, contenu: table.contenu });
  }

  // ---- 2. CERFA : mouvements inscrits au registre. Brique C5 : une
  // fiche OFFICIELLE scellée avec son PDF final est restituée depuis le
  // document CONSERVÉ (vérifié contre l'empreinte scellée — jamais le
  // générateur, doctrine C3b) ; une anomalie est DÉNONCÉE dans
  // 02-PDF-CONSERVES.txt, jamais maquillée par une régénération. Les
  // autres fiches (Formation, historique sans PDF scellé, transferts)
  // restent remplies par le générateur, comme avant. ----
  const verdictsConserves = [];
  // Un TRANSFERT entre contenants ne donne jamais lieu à un CERFA (IM-12,
  // aucun numéro de fiche — le générateur le refuse) : il reste tracé dans
  // mouvements.csv, sans PDF. Constat de la suite e2e C5 : sans ce filtre,
  // le premier transfert au registre bloquait TOUT le dossier d'audit.
  const mouvementsRegistre = mouvements.filter((mv) =>
    STATUTS_REGISTRE.includes(mv.statut) &&
    mv.type !== 'TRANSFERT' &&
    (mv.date || '').startsWith(prefixeAnnee));
  for (const mouvement of mouvementsRegistre) {
    if (doitServirPdfConserve(mouvement)) {
      try {
        const conserve = await chargerPdfConserve(store, mouvement);
        entrees.push({
          nom: `cerfa/${nomSur(conserve.numero)}.pdf`,
          contenu: conserve.octets
        });
        verdictsConserves.push(
          `${mouvement.numero}  CONSERVÉ et vérifié `
          + `(SHA-256 ${mouvement.hashPdfFinal})`);
      } catch (erreur) {
        verdictsConserves.push(`${mouvement.numero}  ANOMALIE : ${erreur.message}`);
      }
      continue;
    }
    const { octets, numero } = await genererCerfaPdf(store, {
      source: 'mouvement', id: mouvement.id
    });
    entrees.push({ nom: `cerfa/${nomSur(numero)}.pdf`, contenu: octets });
  }

  // ---- 3. CERFA : contrôles d'étanchéité de l'année. Un contrôle LIÉ à
  // une fiche dont le PDF est conservé est la MÊME fiche (même numéro) :
  // elle est déjà restituée par la boucle des mouvements — régénérer par
  // cette porte contournerait le « jamais le générateur » (même règle que
  // le visualiseur, C3b). ----
  const controlesAnnee = controles.filter((c) =>
    (c.date || '').startsWith(prefixeAnnee));
  for (const controle of controlesAnnee) {
    const ficheConservee = await resoudreMouvementConserve(store, {
      source: 'controle', id: controle.id
    });
    if (ficheConservee) continue;
    const { octets, numero } = await genererCerfaPdf(store, {
      source: 'controle', id: controle.id
    });
    entrees.push({ nom: `cerfa/${nomSur(numero)}.pdf`, contenu: octets });
  }

  // ---- 3 bis. Verdicts des PDF conservés (pièce présente dès qu'une
  // fiche à PDF scellé est du dossier). ----
  if (verdictsConserves.length) {
    entrees.unshift({
      nom: '02-PDF-CONSERVES.txt',
      contenu: redigerVerdictsConserves(verdictsConserves, annee)
    });
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

  // ---- 5. Sommaire + manifeste d'empreintes en tête d'archive ----
  const nomsFichiers = entrees.map((e) => e.nom);
  const sommaire = redigerSommaire(
    etablissement, annee,
    ['00-SOMMAIRE.txt', '01-EMPREINTES-SHA256.txt', ...nomsFichiers], maintenant);
  const entreeSommaire = { nom: '00-SOMMAIRE.txt', contenu: sommaire };

  // Le manifeste couvre le sommaire + tous les fichiers de données (il ne
  // peut pas se hacher lui-même ; l'empreinte globale du ZIP scelle le tout).
  const manifeste = await redigerManifesteEmpreintes(
    [entreeSommaire, ...entrees], annee);
  entrees.unshift(entreeSommaire,
    { nom: '01-EMPREINTES-SHA256.txt', contenu: manifeste });

  // ---- 6. Scellement : empreinte SHA-256 de l'archive complète ----
  const blob = creerZip(entrees, maintenant);
  const octetsZip = blob instanceof Uint8Array
    ? blob
    : new Uint8Array(await blob.arrayBuffer());
  const empreinte = await sha256Hex(octetsZip);

  return {
    blob,
    nomFichier: `dossier-audit-fluides-${annee}.zip`,
    nbDocuments: entrees.length,
    empreinte
  };
}
