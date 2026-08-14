// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — REMISE EN FILIÈRE DÉCHETS (lot B2)
//
// Module PUR (aucune entrée/sortie, aucun store) : il porte le
// vocabulaire, la mention permanente et les règles de forme du
// SUIVI INTERNE de remise en filière.
//
// Pourquoi ce module existe (constat A07) : l'objet interne du
// logiciel s'appelait « BSFF », comme le bordereau de suivi de
// déchets dématérialisé obligatoire. Il en portait le nom, le
// libellé d'écran, l'en-tête de colonne du dossier d'audit — sans
// en être un. Un document interne qui emprunte le nom d'un document
// réglementaire finit par en tenir lieu : c'est exactement ce qu'il
// ne doit pas faire. Le logiciel dit désormais ce qu'il est.
//
// Miroir littéral CommonJS côté serveur : server/remise-filiere.js
// (parité prouvée par v8/js/data/test-remise-filiere-pur.mjs).
// ============================================================

/** Nom de l'objet interne, partout où l'utilisateur le lit. */
export const LIBELLE_SUIVI = 'Suivi interne de remise en filière';

/** Forme courte (colonnes de tableau, boutons). */
export const LIBELLE_SUIVI_COURT = 'Suivi interne';

/**
 * MENTION PERMANENTE ET NON AMBIGUË. Affichée sur l'écran des déchets,
 * dans la modale de création, et reportée au sommaire du dossier
 * d'audit scellé. Elle ne cite AUCUNE date ni référence d'arrêté : le
 * fait réglementaire précis relève du propriétaire du registre.
 */
export const MENTION_BORDEREAU_OFFICIEL =
  'Document INTERNE au registre : il ne remplace pas le bordereau de suivi '
  + 'de déchets dématérialisé obligatoire, qui s’établit sur la plateforme '
  + 'nationale prévue à cet effet. Le bordereau officiel doit être joint en '
  + 'pièce jointe et son numéro reporté sur ce suivi.';

/** Libellé du champ qui porte le numéro du bordereau RÉEL (externe). */
export const LIBELLE_BORDEREAU_EXTERNE =
  'N° du bordereau dématérialisé officiel';

/**
 * LA LIMITE DU CONTRÔLE, DITE À VOIX HAUTE (revue B2, important 4).
 *
 * La déclaration annuelle signale en anomalie les issues de traitement
 * attestées sur un suivi qui ne porte AUCUNE pièce jointe. Le contrôle
 * s'arrête là : il compte les pièces, il ne les lit pas. N'IMPORTE QUEL
 * fichier l'éteint — une photo de pesée y suffit (tiré par la revue :
 * destruction attestée sur une installation inventée, certificat null,
 * PNG d'un pixel joint, plus aucune anomalie).
 *
 * Le message d'anomalie, lui, dit exactement ce qu'il constate. Le risque
 * restant est dans son SILENCE : sans cette mention, l'absence d'anomalie
 * se lit « dossier prouvé ». Elle est donc affichée EN PERMANENCE, à côté
 * du compte des pièces, jamais seulement quand ça va mal.
 */
export const MENTION_PIECE_NON_PROBANTE =
  'Le logiciel vérifie qu’une pièce est JOINTE, jamais ce qu’elle vaut : '
  + 'aucune pièce ne prouve à elle seule l’issue déclarée, et l’absence '
  + 'd’anomalie ne vaut pas dossier complet.';

/* ============================================================
   B2-3 — FORME ET UNICITÉ DU NUMÉRO INTERNE
   Le logiciel est LOCAL par doctrine : il ne peut pas valider en
   ligne un numéro de bordereau officiel. Il numérote donc ce qui
   lui appartient — le suivi INTERNE — et lui seul. Deux suivis ne
   portent jamais le même numéro : ni par l'API, ni par l'import.
   ============================================================ */

/** Préfixe du numéro de suivi interne (Suivi Interne de Filière). */
export const PREFIXE_NUMERO_SUIVI = 'SIF';

/** Forme canonique : SIF-AAAA-NNNN (année sur 4 chiffres, rang sur 4). */
export const FORME_NUMERO_SUIVI = /^SIF-\d{4}-\d{4}$/;

/** Message canonique — numéro fourni hors forme canonique. */
export const MSG_NUMERO_SUIVI_FORME =
  'Numéro de suivi interne invalide : il est attribué par le logiciel, '
  + 'au format SIF-AAAA-NNNN. Le numéro du bordereau dématérialisé officiel '
  + 'se reporte dans le champ qui lui est réservé.';

/**
 * Message canonique — numéro déjà porté par un autre suivi.
 * @param {string} numero
 * @returns {string}
 */
export function msgNumeroSuiviDoublon(numero) {
  return `Numéro de suivi interne déjà utilisé : ${numero}. `
    + 'Un suivi de remise en filière ne se numérote jamais deux fois.';
}

/**
 * Clé de comparaison d'un numéro : espaces des bords retirés, espaces
 * internes réduits, casse ignorée. « sif-2026-0001 » et « SIF-2026-0001 »
 * sont le MÊME numéro — sans quoi l'unicité se contourne d'une majuscule.
 * @param {string|null|undefined} numero
 * @returns {string}
 */
export function cleNumeroSuivi(numero) {
  return String(numero ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Prochain numéro libre pour l'année donnée : rang maximal déjà utilisé
 * + 1, sur quatre chiffres. Purement LOCAL, aucun réseau, aucun compteur
 * persisté (les numéros existants font foi — un registre importé reprend
 * la numérotation là où elle s'était arrêtée).
 * @param {Array<string|null|undefined>} numerosExistants
 * @param {number|string} annee
 * @returns {string} « SIF-AAAA-NNNN »
 */
export function prochainNumeroSuivi(numerosExistants, annee) {
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

/**
 * Garde de saisie du numéro de suivi interne. Retourne le message
 * canonique du refus, ou null si le numéro est acceptable.
 * @param {string} numero - numéro FOURNI (jamais vide : l'absence
 *   déclenche l'attribution automatique, ce n'est pas une erreur)
 * @param {Array<string|null|undefined>} numerosExistants
 * @returns {string|null}
 */
export function verifierNumeroSuivi(numero, numerosExistants) {
  const cle = cleNumeroSuivi(numero);
  if (!FORME_NUMERO_SUIVI.test(cle)) return MSG_NUMERO_SUIVI_FORME;
  for (const autre of numerosExistants ?? []) {
    if (cleNumeroSuivi(autre) === cle) return msgNumeroSuiviDoublon(cle);
  }
  return null;
}

/* ============================================================
   B2-5 — LA BALANCE CESSE DE POUVOIR MENTIR
   Attaque tirée : deux remises en filière déclarées (5 kg partis en
   filière déchets), puis un simple `updateBouteille { masseBruteKg }`
   fait repasser la bouteille de 5 à 10 kg. HTTP 200, modification
   journalisée — mais RIEN ne rapproche les deux faits.
   Le repère est la masse nette FIGÉE juste après la remise
   (`masseBouteilleApresKg`, migration 36). Tout gain postérieur qui
   n'est PAS expliqué par une écriture du registre est SIGNALÉ — jamais
   bloqué : une correction de tare est légitime, et on n'empêche jamais
   d'enregistrer la réalité. On rend le rapprochement VISIBLE.

   Deuxième attaque (revue B2) : émettre un NOUVEAU suivi de 0,001 kg
   après le gonflage réécrivait le repère sur l'état gonflé — l'alerte
   s'éteignait d'un clic, et rien ne permet de retirer le suivi bidon.
   Tous les repères de la bouteille sont donc éprouvés, pas seulement le
   dernier : un repère ancien reste opposable.
   ============================================================ */

/** Tolérance métrologique (10 g), comme le reste du projet. */
export const TOLERANCE_REMISE_KG = 0.01;

/**
 * Écart inexpliqué entre le contenu ACTUEL d'une bouteille et les repères
 * figés lors de ses remises en filière.
 *
 * ⚠ TOUS les repères sont éprouvés, pas seulement le dernier. Attaque
 * tirée par la revue : après le gonflage, il suffisait d'émettre un
 * nouveau suivi bidon (0,001 kg) pour que le repère se réécrive sur l'état
 * gonflé — l'alerte s'éteignait d'un clic, et aucun chemin d'annulation
 * n'existe pour retirer le suivi bidon. Un repère ancien reste donc
 * opposable : la masse attendue au titre de CE repère tient compte des
 * remises POSTÉRIEURES (qui ont vidé la bouteille d'autant) et des
 * écritures du registre. L'écart retenu est le PLUS GRAND — c'est le
 * repère le plus ancien qui reste inexpliqué, donc l'origine du trou.
 *
 * Les écritures « postérieures » se reconnaissent à leur DATE seule, jamais
 * au numéro (mineur 4 de la revue : un registre importé peut porter des
 * numéros antérieurs, et l'ordre du tableau diffère entre les magasins —
 * le serveur trie par date décroissante). À date ÉGALE, voir
 * `contributionRetenue` : on ne retient que ce qui EXPLIQUE le gain.
 *
 * Le gain EXPLIQUÉ vient des écritures du registre postérieures à la
 * remise (entrées moins sorties, VALIDE et ANNULE ; un brouillon
 * n'explique rien).
 *
 * @param {object} bouteille - { id, masseNetteKg }
 * @param {object[]} suivis - suivis de remise en filière (tous)
 * @param {object[]} mouvements - mouvements du registre (tous)
 * @returns {{gainKg:number, numeroSuivi:string, dateRemise:string,
 *            masseApresKg:number}|null} null si aucun repère ou aucun écart
 */
export function ecartApresRemise(bouteille, suivis, mouvements) {
  if (!bouteille || !Number.isFinite(bouteille.masseNetteKg)) return null;
  // Les remises de CETTE bouteille (toutes, repère ou non : même sans
  // repère, une remise a bien retiré sa masse).
  const siennes = (suivis ?? []).filter(
    (s) => s && s.bouteilleId === bouteille.id);
  let pire = null;
  for (const repere of siennes) {
    // Les suivis antérieurs à la migration 36 n'ont pas de repère : on ne
    // leur invente pas de passé.
    if (!Number.isFinite(repere.masseBouteilleApresKg)) continue;
    const ecart = ecartPourRepere(bouteille, repere, siennes, mouvements);
    if (ecart === null) continue;
    if (pire === null || plusGrave(ecart, pire)) pire = ecart;
  }
  return pire;
}

/**
 * Lequel des deux écarts est le plus grave. Le plus GROS d'abord ; à
 * égalité le plus ANCIEN (l'origine du trou) ; puis le numéro, seulement
 * pour que le verdict ne dépende JAMAIS de l'ordre du tableau reçu (le
 * serveur trie par date décroissante, le magasin de démo par création).
 * @returns {boolean} vrai si `a` doit remplacer `b`
 */
function plusGrave(a, b) {
  if (a.gainKg !== b.gainKg) return a.gainKg > b.gainKg;
  if (a.dateRemise !== b.dateRemise) return a.dateRemise < b.dateRemise;
  return a.numeroSuivi < b.numeroSuivi;
}

/**
 * LA CONVENTION DE DATE, AU MÊME RANG POUR TOUT CE QUI EXPLIQUE UN ÉCART.
 *
 * Le repère (`masseBouteilleApresKg`) est figé à l'INSTANT de la remise,
 * mais les dates du registre sont au JOUR près : une écriture datée du
 * MÊME JOUR est, dans le cas ordinaire, déjà comptée dans le repère. La
 * recompter comme « postérieure » crée un gain qui n'a jamais existé dès
 * qu'elle est SORTANTE — et le logiciel écrit alors « aucune écriture du
 * registre ne l'explique » d'une écriture validée qui l'explique
 * exactement (regroupement de déchets, puis remise le jour même).
 * L'accusation remonte au feu tricolore et au guide d'audit.
 *
 * Règle unique, appliquée aux remises comme aux mouvements :
 *  - date ANTÉRIEURE au repère : déjà dans le repère, contribution nulle ;
 *  - date POSTÉRIEURE : contribution entière ;
 *  - MÊME JOUR : on ne retient que ce qui EXPLIQUE le gain (contribution
 *    positive), jamais ce qui l'aggrave — le doute retire l'ACCUSATION,
 *    jamais l'obligation. Le prix est une sous-détection du jour de la
 *    remise ; le prix inverse est une accusation écrite et fausse.
 *
 * @param {number} contribution - effet sur la masse ATTENDUE (kg)
 * @param {string|null|undefined} dateEcriture
 * @param {string|null|undefined} dateRepere
 * @returns {number}
 */
function contributionRetenue(contribution, dateEcriture, dateRepere) {
  const quand = String(dateEcriture ?? '');
  const repere = String(dateRepere ?? '');
  if (quand < repere) return 0;
  if (quand > repere) return contribution;
  return contribution > 0 ? contribution : 0;
}

/**
 * Écart au titre d'UN repère donné (fonction interne).
 * @returns {{gainKg:number, numeroSuivi:string, dateRemise:string,
 *            masseApresKg:number}|null}
 */
function ecartPourRepere(bouteille, repere, siennes, mouvements) {
  let explique = 0;

  // Les remises POSTÉRIEURES ont sorti leur masse de la bouteille : elles
  // ne sont pas un écart. Leur contribution est toujours NÉGATIVE, donc la
  // convention de date les écarte d'elle-même au jour du repère.
  for (const autre of siennes) {
    const m = Number(autre.masseRemiseKg);
    if (!Number.isFinite(m)) continue;
    explique += contributionRetenue(-m, autre.dateRemise, repere.dateRemise);
  }

  for (const mv of mouvements ?? []) {
    // VALIDE **et** ANNULE : une écriture annulée a bien eu son effet, et sa
    // contre-écriture (même type, quantité opposée, VALIDE) le reprend — les
    // deux se neutralisent d'elles-mêmes, comme dans la déclaration annuelle.
    // Un BROUILLON, lui, n'explique rien : il n'a rien déplacé.
    if (!mv || (mv.statut !== 'VALIDE' && mv.statut !== 'ANNULE')) continue;
    const q = Number(mv.quantiteKg);
    if (!Number.isFinite(q)) continue;
    // ⚠ LE SIGNE NE SUFFIT PAS À DIRE LE SENS. La convention du registre
    // n'est négative que pour la RÉCUPÉRATION (le fluide sort de la
    // machine) ; le TRANSFERT, lui, est enregistré POSITIF. Dans les deux
    // cas la bouteille DESTINATAIRE gagne du fluide. Lire le seul signe
    // faisait passer un transfert entrant — regroupement de déchets avant
    // enlèvement, opération réelle et validée — pour un gain inexpliqué :
    // le logiciel accusait par écrit une écriture parfaitement légitime.
    let contribution = 0;
    if (mv.bouteilleDstId === bouteille.id) {
      contribution += (mv.type === 'TRANSFERT' ? q : -q);
    }
    // Source : le fluide en SORT (charge, transfert sortant) — et une
    // contre-écriture, de quantité opposée, le fait revenir.
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

/**
 * Invariant d'import : deux suivis ne peuvent pas porter le même numéro.
 * La FORME n'est PAS exigée ici — un registre antérieur reste importable
 * (on n'empêche jamais de reprendre la réalité déjà enregistrée) ; le
 * DOUBLON, lui, ne peut être qu'une incohérence.
 * @param {object[]} suivis
 * @returns {string|null} description du problème, ou null
 */
export function problemeNumerosSuivi(suivis) {
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
