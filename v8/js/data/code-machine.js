// ============================================================
// inerWeb Fluide — code machine lisible structuré (brique produit)
// ------------------------------------------------------------
// RÔLE : proposer et valider un identifiant humain SITE-FAMILLE-NUMÉRO
// (ex. « JR-CF-001 ») qui remplace les codes compteurs « M1/M2 » à la
// création. Module PUR (zéro DOM, zéro store) : le formulaire machine
// s'en sert pour proposer, les stores pour normaliser/valider.
// ⚠️ Le `code_public` opaque des QR reste DISTINCT et inchangé.
// ⚠️ Miroir partiel serveur : normaliserCodeMachine/validerCodeMachine
// sont dupliqués dans server/api.js (serveur CommonJS) — toute
// évolution se fait DES DEUX CÔTÉS.
// ============================================================

/**
 * Familles de machines : correspondance type (libellé libre du
 * formulaire) → code famille à 2 lettres. Premier motif qui matche.
 * Défaut : « MA » (machine, générique).
 */
export const FAMILLES_MACHINE = [
  { motif: /chambre\s*froide/i, code: 'CF', libelle: 'Chambre froide' },
  { motif: /vitrine/i, code: 'VR', libelle: 'Vitrine réfrigérée' },
  { motif: /pac|pompe\s*à\s*chaleur/i, code: 'PC', libelle: 'Pompe à chaleur' },
  { motif: /monosplit/i, code: 'MS', libelle: 'Monosplit' },
  { motif: /multisplit/i, code: 'MM', libelle: 'Multisplit' },
  { motif: /centrale/i, code: 'CE', libelle: 'Centrale' }
];

/**
 * Code famille (2 lettres) d'un type de machine.
 * @param {string} type — libellé du type (ex. « Chambre froide »)
 * @returns {string} code famille, « MA » par défaut
 */
export function familleDuType(type) {
  const t = String(type || '');
  for (const f of FAMILLES_MACHINE) {
    if (f.motif.test(t)) return f.code;
  }
  return 'MA';
}

/** Mots vides ignorés dans le nom d'établissement pour bâtir le code site. */
const MOTS_VIDES = new Set([
  'lycee', 'lp', 'lpo', 'cfa', 'college', 'ecole', 'cite', 'scolaire',
  'professionnel', 'professionnelle', 'polyvalent', 'polyvalente',
  'general', 'generale', 'technique', 'technologique', 'prive', 'privee',
  'public', 'publique', 'etablissement', 'centre', 'formation',
  'de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'en', 'sur', 'sous'
]);

/** Retire les accents et met en majuscules (A-Z 0-9 seulement en sortie). */
function depouiller(texte) {
  return String(texte || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase();
}

/**
 * Code site proposé d'après la raison sociale de l'établissement :
 * initiales des mots significatifs (2 à 3 lettres).
 * « Lycée Jacques Raynaud » → « JR ». Repli : deux premières lettres
 * du nom dépouillé, sinon « ST ».
 * @param {string} raisonSociale
 * @returns {string}
 */
export function codeSite(raisonSociale) {
  const mots = depouiller(raisonSociale)
    .split(/[^A-Z0-9]+/)
    .filter((m) => m && !MOTS_VIDES.has(m.toLowerCase()));
  const initiales = mots.slice(0, 3).map((m) => m[0]).join('');
  if (initiales.length >= 2) return initiales;
  const brut = depouiller(raisonSociale).replace(/[^A-Z0-9]/g, '');
  return brut.slice(0, 2) || 'ST';
}

/**
 * Normalise un code machine saisi : espaces retirés, accents dépouillés,
 * majuscules. Ne VALIDE pas (voir validerCodeMachine).
 * @param {string} code
 * @returns {string}
 */
export function normaliserCodeMachine(code) {
  return depouiller(code).replace(/\s+/g, '');
}

/**
 * Valide un code machine NORMALISÉ. Format libre mais sain : 1 à 24
 * caractères parmi lettres, chiffres et tirets (les codes hérités
 * « M1 » restent valides).
 * @param {string} code — code déjà normalisé
 * @returns {string|null} message d'erreur français, ou null si valide
 */
export function validerCodeMachine(code) {
  if (!code) return 'Code machine vide.';
  if (code.length > 24) return 'Code machine trop long (24 caractères maximum).';
  if (!/^[A-Z0-9][A-Z0-9-]*$/.test(code)) {
    return 'Code machine invalide : lettres, chiffres et tirets seulement.';
  }
  return null;
}

/**
 * Propose le prochain code structuré SITE-FAMILLE-NUMÉRO libre.
 * Le numéro est le plus grand existant + 1 pour CE préfixe (les codes
 * d'autres formes sont ignorés), sur 3 chiffres minimum.
 * @param {Array<{code?: string}>} machines — parc existant
 * @param {string} site — code site (ex. « JR »)
 * @param {string} famille — code famille (ex. « CF »)
 * @returns {string} ex. « JR-CF-001 »
 */
export function genererCodeMachine(machines, site, famille) {
  const prefixe = `${normaliserCodeMachine(site) || 'ST'}-${normaliserCodeMachine(famille) || 'MA'}-`;
  const motif = new RegExp(
    `^${prefixe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`
  );
  let max = 0;
  for (const m of machines || []) {
    const res = motif.exec(normaliserCodeMachine(m?.code));
    if (res) max = Math.max(max, Number(res[1]));
  }
  return `${prefixe}${String(max + 1).padStart(3, '0')}`;
}
