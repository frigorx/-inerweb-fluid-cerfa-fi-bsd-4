// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — helpers communs aux « dossiers » ZIP scellés
// (dossier d'audit annuel, dossier machine, dossier client).
//
// Module PUR (aucun accès DOM) : testable sous Node. Le téléchargement et la
// modale de scellement (DOM) vivent dans documents/telecharger-dossier.js.
//
// Réutilise core/zip.js (ZIP « stored » maison) et exports.js (échappement
// CSV). Web Crypto (globalThis.crypto.subtle) pour les empreintes SHA-256 :
// présent au navigateur ET sous Node ≥ 20.
// ============================================================

import { creerZip } from '../core/zip.js';
import { champCsv } from './exports.js';
import { construireVerificateurHtml } from './verificateur.js';

/**
 * Convertit un contenu de pièce jointe en Uint8Array pour le ZIP. Accepte :
 *  - Uint8Array (Node, ou déjà décodé) ;
 *  - Blob (navigateur, mode Démo — store.obtenirPieceJointe) ;
 *  - chaîne base64 (mode LOCAL SQLite — api.js renvoie le binaire en base64).
 * Le 3ᵉ cas est LE correctif de parité : sans lui, l'export des pièces jointes
 * casse en mode Local dès qu'une PJ existe.
 * @param {Uint8Array|Blob|string} contenu
 * @returns {Promise<Uint8Array>}
 */
export async function versOctets(contenu) {
  if (contenu instanceof Uint8Array) return contenu;
  if (typeof Blob !== 'undefined' && contenu instanceof Blob) {
    return new Uint8Array(await contenu.arrayBuffer());
  }
  if (typeof contenu === 'string') return base64EnOctets(contenu);
  throw new TypeError('Pièce jointe : contenu binaire inattendu.');
}

/** Décode une chaîne base64 en Uint8Array (navigateur via atob, Node via Buffer). */
function base64EnOctets(b64) {
  if (typeof atob === 'function') {
    const binaire = atob(b64);
    const octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i += 1) octets[i] = binaire.charCodeAt(i);
    return octets;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

/** Nettoie un nom pour l'archive : pas de séparateurs de chemin parasites. */
export function nomSur(nom) {
  return String(nom || 'document').replace(/[\\/]+/g, '_').trim() || 'document';
}

/** Contenu d'une entrée (chaîne UTF-8 ou octets) → Uint8Array, pour le hachage. */
export function octetsEntree(contenu) {
  return typeof contenu === 'string' ? new TextEncoder().encode(contenu) : contenu;
}

/**
 * Empreinte SHA-256 (hex minuscule) d'un tampon d'octets, via Web Crypto.
 * @param {Uint8Array|ArrayBuffer} octets
 * @returns {Promise<string>} 64 caractères hexadécimaux
 */
export async function sha256Hex(octets) {
  const vue = octets instanceof Uint8Array ? octets : new Uint8Array(octets);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', vue);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Manifeste des empreintes (01-EMPREINTES-SHA256.txt) : une ligne
 * « <empreinte>  <fichier> » par entrée. Ne peut pas contenir sa propre
 * empreinte ; l'empreinte GLOBALE du ZIP scelle l'ensemble.
 * @param {Array<{nom: string, contenu: string|Uint8Array}>} entrees
 * @param {string} titre - ex. « DOSSIER MACHINE 8F3K2Q7 »
 * @returns {Promise<string>}
 */
export async function redigerManifesteEmpreintes(entrees, titre) {
  const lignes = [
    `EMPREINTES SHA-256 — ${titre}`,
    '='.repeat(68),
    '',
    'Chaque fichier du dossier est listé avec son empreinte SHA-256.',
    'Pour vérifier qu\'un fichier n\'a pas été modifié, recalculez son',
    'empreinte SHA-256 et comparez-la à la valeur ci-dessous.',
    'L\'empreinte GLOBALE de l\'archive .zip (affichée à l\'export, à conserver',
    'hors du logiciel) scelle l\'ensemble du dossier.',
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
 * Sommaire du dossier (00-SOMMAIRE.txt) : titre, lignes d'identité, date de
 * génération et liste complète des fichiers.
 * @param {string} titre
 * @param {string[]} lignesInfos - lignes d'identité (déjà formatées)
 * @param {string[]} nomsFichiers - tous les fichiers de l'archive
 * @param {Date} maintenant
 * @returns {string}
 */
export function redigerSommaire(titre, lignesInfos, nomsFichiers, maintenant) {
  const p = (n) => String(n).padStart(2, '0');
  const dateFr = `${p(maintenant.getDate())}/${p(maintenant.getMonth() + 1)}/`
    + `${maintenant.getFullYear()} à ${p(maintenant.getHours())}:${p(maintenant.getMinutes())}`;
  return [
    titre,
    '='.repeat(68),
    '',
    ...lignesInfos,
    '',
    `Généré le ${dateFr}`,
    'Documents générés par inerWeb Fluide.',
    '',
    'CONTENU DU DOSSIER',
    '-'.repeat(68),
    ...nomsFichiers.map((nom) => `  ${nom}`),
    '',
    'Les fichiers cerfa/*.pdf sont les fiches d\'intervention CERFA 15497*04',
    'officielles remplies. Les fichiers *.csv sont exportés en UTF-8, séparateur « ; ».',
    ''
  ].join('\r\n');
}

/**
 * Sérialise une liste d'objets (mouvements, contrôles, machines…) en CSV : une
 * colonne par clé rencontrée (union), les objets/tableaux en JSON. Complet par
 * construction — rien n'est masqué (utile pour un dossier d'audit).
 * @param {object[]} records
 * @returns {string} CSV (séparateur « ; », CRLF, UTF-8)
 */
export function objetsVersCsv(records) {
  if (!records || records.length === 0) return '(aucune entrée)\r\n';
  // Colonnes : quelques clés utiles d'abord, puis le reste par ordre alphabétique.
  const prioritaires = ['id', 'date', 'type', 'statut', 'numero', 'numeroCerfa'];
  const toutes = new Set();
  for (const r of records) for (const k of Object.keys(r || {})) toutes.add(k);
  const entetes = [
    ...prioritaires.filter((k) => toutes.has(k)),
    ...[...toutes].filter((k) => !prioritaires.includes(k)).sort()
  ];
  const cellule = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };
  const lignes = [entetes.map(champCsv).join(';')];
  for (const r of records) {
    lignes.push(entetes.map((k) => champCsv(cellule((r || {})[k]))).join(';'));
  }
  return lignes.join('\r\n') + '\r\n';
}

/**
 * CSV vertical « Champ ; Valeur » pour l'identité d'une entité unique.
 * @param {Array<[string, *]>} paires
 * @returns {string}
 */
export function paireCsv(paires) {
  const cellule = (v) => (v === null || v === undefined) ? ''
    : (typeof v === 'object' ? JSON.stringify(v) : String(v));
  const lignes = [['Champ', 'Valeur'].map(champCsv).join(';')];
  for (const [cle, valeur] of paires) {
    lignes.push([champCsv(cle), champCsv(cellule(valeur))].join(';'));
  }
  return lignes.join('\r\n') + '\r\n';
}

/**
 * Assemble et SCELLE un dossier ZIP : préfixe 00-SOMMAIRE.txt +
 * 01-EMPREINTES-SHA256.txt aux entrées de données, crée le ZIP, calcule
 * l'empreinte SHA-256 globale (le scellé externe).
 * @param {{ entreesData: Array<{nom: string, contenu: string|Uint8Array}>,
 *   titre: string, lignesInfos: string[], nomFichier: string, maintenant?: Date }} p
 * @returns {Promise<{blob: Blob|Uint8Array, nomFichier: string,
 *   nbDocuments: number, empreinte: string}>}
 */
export async function assemblerDossier(
  { entreesData, titre, lignesInfos, nomFichier, maintenant = new Date() }) {
  const nomsData = entreesData.map((e) => e.nom);
  const sommaire = redigerSommaire(
    titre, lignesInfos,
    ['00-SOMMAIRE.txt', '01-EMPREINTES-SHA256.txt', ...nomsData,
      '99-VERIFICATEUR.html'], maintenant);
  const entreeSommaire = { nom: '00-SOMMAIRE.txt', contenu: sommaire };
  const manifeste = await redigerManifesteEmpreintes(
    [entreeSommaire, ...entreesData], titre);

  // Le vérificateur autonome (brique ④) : hors manifeste — comme le
  // manifeste lui-même, il est scellé par l'empreinte GLOBALE du .zip.
  const toutes = [
    entreeSommaire,
    { nom: '01-EMPREINTES-SHA256.txt', contenu: manifeste },
    ...entreesData,
    { nom: '99-VERIFICATEUR.html', contenu: construireVerificateurHtml() }
  ];
  const blob = creerZip(toutes, maintenant);
  const octetsZip = blob instanceof Uint8Array
    ? blob : new Uint8Array(await blob.arrayBuffer());
  const empreinte = await sha256Hex(octetsZip);

  return { blob, nomFichier, nbDocuments: toutes.length, empreinte, titre };
}
