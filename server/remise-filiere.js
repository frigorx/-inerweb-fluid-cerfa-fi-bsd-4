// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — REMISE EN FILIÈRE DÉCHETS (lot B2).
 *
 * MIROIR LITTÉRAL CommonJS des règles pures de
 * v8/js/data/remise-filiere.js. Parité prouvée par
 * v8/js/data/test-remise-filiere-pur.mjs : toute divergence de
 * comportement OU de message rend la suite rouge.
 *
 * Ne toucher un miroir sans l'autre est la faute la plus chère du
 * projet (deux vérités = deux registres).
 */

/** Préfixe du numéro de suivi interne (Suivi Interne de Filière). */
const PREFIXE_NUMERO_SUIVI = 'SIF';

/** Forme canonique : SIF-AAAA-NNNN (année sur 4 chiffres, rang sur 4). */
const FORME_NUMERO_SUIVI = /^SIF-\d{4}-\d{4}$/;

/** Message canonique — numéro fourni hors forme canonique. */
const MSG_NUMERO_SUIVI_FORME =
  'Numéro de suivi interne invalide : il est attribué par le logiciel, '
  + 'au format SIF-AAAA-NNNN. Le numéro du bordereau dématérialisé officiel '
  + 'se reporte dans le champ qui lui est réservé.';

/** Message canonique — numéro déjà porté par un autre suivi. */
function msgNumeroSuiviDoublon(numero) {
  return `Numéro de suivi interne déjà utilisé : ${numero}. `
    + 'Un suivi de remise en filière ne se numérote jamais deux fois.';
}

/** Clé de comparaison d'un numéro (bords, espaces internes, casse). */
function cleNumeroSuivi(numero) {
  return String(numero ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Prochain numéro libre pour l'année donnée (purement LOCAL). */
function prochainNumeroSuivi(numerosExistants, annee) {
  const an = String(annee);
  const debut = `${PREFIXE_NUMERO_SUIVI}-${an}-`;
  let rang = 0;
  for (const numero of numerosExistants ?? []) {
    const cle = cleNumeroSuivi(numero);
    if (!cle.startsWith(debut)) continue;
    const n = Number(cle.slice(debut.length));
    if (Number.isInteger(n) && n > rang) rang = n;
  }
  return debut + String(rang + 1).padStart(4, '0');
}

/** Garde de saisie du numéro de suivi interne (message ou null). */
function verifierNumeroSuivi(numero, numerosExistants) {
  const cle = cleNumeroSuivi(numero);
  if (!FORME_NUMERO_SUIVI.test(cle)) return MSG_NUMERO_SUIVI_FORME;
  for (const autre of numerosExistants ?? []) {
    if (cleNumeroSuivi(autre) === cle) return msgNumeroSuiviDoublon(cle);
  }
  return null;
}

/** Tolérance métrologique (10 g), comme le reste du projet. */
const TOLERANCE_REMISE_KG = 0.01;

/** Écart inexpliqué entre le contenu ACTUEL d'une bouteille et les repères
 *  figés lors de ses remises en filière (miroir littéral).
 *  TOUS les repères sont éprouvés — un nouveau suivi ne réécrit plus le
 *  repère sur un état gonflé : l'alerte ne s'éteint pas d'un clic. Les
 *  écritures postérieures se reconnaissent à leur DATE seule (jamais au
 *  numéro : l'ordre des tableaux diffère entre les magasins) ; à date
 *  ÉGALE, voir `contributionRetenue`. */
function ecartApresRemise(bouteille, suivis, mouvements) {
  if (!bouteille || !Number.isFinite(bouteille.masseNetteKg)) return null;
  const siennes = (suivis ?? []).filter(
    (s) => s && s.bouteilleId === bouteille.id);
  let pire = null;
  for (const repere of siennes) {
    if (!Number.isFinite(repere.masseBouteilleApresKg)) continue;
    const ecart = ecartPourRepere(bouteille, repere, siennes, mouvements);
    if (ecart === null) continue;
    if (pire === null || plusGrave(ecart, pire)) pire = ecart;
  }
  return pire;
}

/** Le plus GROS écart d'abord, à égalité le plus ANCIEN, puis le numéro :
 *  le verdict ne dépend jamais de l'ordre du tableau reçu (miroir littéral). */
function plusGrave(a, b) {
  if (a.gainKg !== b.gainKg) return a.gainKg > b.gainKg;
  if (a.dateRemise !== b.dateRemise) return a.dateRemise < b.dateRemise;
  return a.numeroSuivi < b.numeroSuivi;
}

/** LA CONVENTION DE DATE, AU MÊME RANG POUR TOUT CE QUI EXPLIQUE UN ÉCART
 *  (miroir littéral). Le repère est figé à l'INSTANT de la remise, les dates
 *  du registre sont au JOUR près : antérieure = déjà dans le repère,
 *  postérieure = comptée entière, MÊME JOUR = on ne retient que ce qui
 *  EXPLIQUE le gain, jamais ce qui l'aggrave. Le doute retire
 *  l'ACCUSATION, jamais l'obligation. */
function contributionRetenue(contribution, dateEcriture, dateRepere) {
  const quand = String(dateEcriture ?? '');
  const repere = String(dateRepere ?? '');
  if (quand < repere) return 0;
  if (quand > repere) return contribution;
  return contribution > 0 ? contribution : 0;
}

/** Écart au titre d'UN repère donné (miroir littéral). */
function ecartPourRepere(bouteille, repere, siennes, mouvements) {
  let explique = 0;

  // Les remises POSTÉRIEURES ont sorti leur masse : contribution NÉGATIVE,
  // donc écartée d'elle-même au jour du repère.
  for (const autre of siennes) {
    const m = Number(autre.masseRemiseKg);
    if (!Number.isFinite(m)) continue;
    explique += contributionRetenue(-m, autre.dateRemise, repere.dateRemise);
  }

  for (const mv of mouvements ?? []) {
    // VALIDE **et** ANNULE : l'écriture annulée et sa contre-écriture se
    // neutralisent d'elles-mêmes. Un BROUILLON n'explique rien.
    if (!mv || (mv.statut !== 'VALIDE' && mv.statut !== 'ANNULE')) continue;
    const q = Number(mv.quantiteKg);
    if (!Number.isFinite(q)) continue;
    // Le SIGNE ne dit pas le sens : récupération NÉGATIVE, transfert
    // POSITIF, et dans les deux cas le destinataire GAGNE (miroir littéral).
    let contribution = 0;
    if (mv.bouteilleDstId === bouteille.id) {
      contribution += (mv.type === 'TRANSFERT' ? q : -q);
    }
    if (mv.bouteilleSrcId === bouteille.id) contribution -= q;
    if (contribution === 0) continue;
    explique += contributionRetenue(contribution, mv.date, repere.dateRemise);
  }

  const attendu = repere.masseBouteilleApresKg + explique;
  const gain = Math.round((bouteille.masseNetteKg - attendu) * 1000) / 1000;
  if (gain <= TOLERANCE_REMISE_KG) return null;
  return {
    gainKg: gain,
    numeroSuivi: repere.numeroBsff ?? '?',
    dateRemise: repere.dateRemise ?? '?',
    masseApresKg: repere.masseBouteilleApresKg
  };
}

/** Invariant d'import : aucun numéro de suivi en double. */
function problemeNumerosSuivi(suivis) {
  const vus = new Set();
  for (const s of suivis ?? []) {
    const cle = cleNumeroSuivi(s && s.numeroBsff);
    if (!cle) continue;
    if (vus.has(cle)) {
      return `suivi de remise en filière ${cle} : numéro en double`;
    }
    vus.add(cle);
  }
  return null;
}

module.exports = {
  PREFIXE_NUMERO_SUIVI,
  FORME_NUMERO_SUIVI,
  MSG_NUMERO_SUIVI_FORME,
  msgNumeroSuiviDoublon,
  cleNumeroSuivi,
  prochainNumeroSuivi,
  verifierNumeroSuivi,
  problemeNumerosSuivi,
  TOLERANCE_REMISE_KG,
  ecartApresRemise
};
