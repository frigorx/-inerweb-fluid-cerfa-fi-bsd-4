// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — HABILITATIONS F-Gas : constantes réglementaires
// (module PUR, Phase 1 du chantier B2)
//
// Régimes de certification des PERSONNES à la manipulation des fluides :
//  - 2008 (arrêté du 13/10/2008) : catégories I / II / III / IV ;
//  - 2025 (arrêté du 21/11/2025, F-Gas III / règlement UE 2024/573) :
//    catégories A1 / A2 / B / C / D / E / V.
// Les deux régimes COEXISTENT : la DÉLIVRANCE 2008 cesse au 31/12/2026
// (régime 2025 obligatoire au 01/01/2027), mais les attestations détenues
// restent reconnues jusqu'au 12/03/2029 — puis seulement avec une remise à
// niveau enregistrée (cycle 7 ans). Voir les constantes de transition.
//
// Ce module est PUR (aucune I/O, aucune horloge). Il est dupliqué à
// l'identique côté serveur (server/api.js, CommonJS) : la parité de SORTIE
// est prouvée par les tests, pas par un import croisé (même choix que
// sentinelle.js / getAlertes).
//
// ⚠️ Le MOTEUR de verdict `verifierDroitIntervention` viendra ICI en Phase 2.
// La PHASE 1 ne pose que les constantes : on STOCKE et on AFFICHE, on ne
// REFUSE rien. La matrice « quelle catégorie autorise quoi » (§2 de
// docs/SPEC-HABILITATIONS.md) est un BROUILLON à valider par Franck sur le
// texte officiel AVANT tout blocage (Phase 3).
// ============================================================

/** Les deux régimes de certification (ancien / nouveau). */
export const REGIMES = ['2008', '2025'];

/** Catégories de l'arrêté du 13/10/2008. */
export const CATEGORIES_2008 = ['I', 'II', 'III', 'IV'];

/** Catégories de l'arrêté du 21/11/2025 (F-Gas III). */
export const CATEGORIES_2025 = ['A1', 'A2', 'B', 'C', 'D', 'E', 'V'];

/**
 * Correspondance ancien → nouveau (SPEC §2) : I & II → A1/A2 · III → D ·
 * IV → E. RENVOIE UN TABLEAU — I et II donnent ['A1','A2'] : le choix A1 vs
 * A2 dépend du seuil de charge, matérialiser un choix unique serait mentir.
 * Cette équivalence est CALCULÉE, jamais STOCKÉE dans une ligne d'habilitation.
 */
export const CORRESPONDANCE_2008_VERS_2025 = Object.freeze({
  I: ['A1', 'A2'],
  II: ['A1', 'A2'],
  III: ['D'],
  IV: ['E']
});

/** Catégories 2025 équivalentes à une catégorie 2008 (tableau, [] si inconnue). */
export function correspondance2008Vers2025(categorie2008) {
  return CORRESPONDANCE_2008_VERS_2025[categorie2008] ?? [];
}

/** Vrai si `categorie` est cohérente avec `regime` (intégrité de stockage). */
export function categorieCoherente(regime, categorie) {
  if (regime === '2008') return CATEGORIES_2008.includes(categorie);
  if (regime === '2025') return CATEGORIES_2025.includes(categorie);
  return false;
}

/**
 * Ordre d'affichage stable des habilitations : régime 2025 avant 2008, puis
 * dateFin DÉCROISSANTE (null = pas d'échéance connue, placé EN TÊTE). Tri en
 * JS des deux côtés (jamais d'ORDER BY pour un ordre contractuel : la
 * collation BINARY de SQLite diverge de localeCompare — leçon du chantier
 * inventaire). Dupliqué à l'identique côté serveur.
 */
export function comparerHabilitations(a, b) {
  if (a.regime !== b.regime) return a.regime === '2025' ? -1 : 1;
  const fa = a.dateFin ?? null;
  const fb = b.dateFin ?? null;
  if (fa === fb) return 0;
  if (fa === null) return -1;
  if (fb === null) return 1;
  return fa < fb ? 1 : -1;
}

// ============================================================
// MOTEUR DE CONSEIL (Phase 2b, chantier B2) — verifierDroitIntervention
//
// PUR et déterministe (aucune I/O, aucune horloge). Le verdict est un
// CONSEIL : gravité 'REFUS' = « vous ne pouvez pas » (conseil fort), JAMAIS
// un throw ni un blocage ICI. Depuis P0-5, le mode OFFICIEL en fait un
// blocage (fait `aptitude` de cadreFicheOfficiel → condition APTITUDE_PORTEE
// de blocage-officiel.js).
//
// ⚠ MIROIR LITTÉRAL côté serveur : `server/droit-intervention.js` (parité
// prouvée par server/test-droit-intervention.mjs) — ne jamais toucher le
// MOTEUR (seuils, matrice, messages, verdicts) sans l'autre côté.
//
// Contrat d'entrée : `habilitations` est la liste DÉJÀ ACTIVE (le store filtre
// actif=1 ; le moteur ne connaît pas la date, la péremption est Phase 3).
//
// AXES : chaque catégorie donne des OPÉRATIONS + une CHARGE max + des FAMILLES
// de fluide NATIVES. Les MENTIONS n'agissent QUE sur l'axe fluide (elles
// étendent les familles atteignables) — jamais sur les opérations ni la charge.
// Matrice §2 validée fonctionnellement par Franck (Bachir/Pierre), 14/07.
// ============================================================

/** Opérations normalisées de la matrice §2. */
export const OPERATIONS = ['ETANCHEITE', 'INSTALLATION', 'MAINTENANCE', 'RECUPERATION'];
const OPS_TOUTES = ['ETANCHEITE', 'INSTALLATION', 'MAINTENANCE', 'RECUPERATION'];

/** Familles de mention de formation complémentaire (l'admin les coche). */
export const FLUIDES_MENTION = ['CO2', 'NH3', 'HC'];

/**
 * Ordre d'affichage stable des mentions (brique 1) : par fluide dans l'ordre
 * du référentiel (CO2, NH3, HC), puis dateFin DÉCROISSANTE (null = pas
 * d'échéance connue, placé EN TÊTE), puis id (départage TOTAL : l'ordre ne
 * doit jamais dépendre de l'ordre d'insertion ni du parcours SQL). Un fluide
 * hors référentiel (impossible depuis les stores : CHECK + invariants) se
 * classerait EN TÊTE (indexOf = -1), sans erreur. Tri en JS des deux côtés
 * (jamais d'ORDER BY pour un ordre contractuel). Dupliqué côté serveur.
 */
export function comparerMentions(a, b) {
  const ia = FLUIDES_MENTION.indexOf(a.fluideMention);
  const ib = FLUIDES_MENTION.indexOf(b.fluideMention);
  if (ia !== ib) return ia - ib;
  const fa = a.dateFin ?? null;
  const fb = b.dateFin ?? null;
  if (fa !== fb) {
    if (fa === null) return -1;
    if (fb === null) return 1;
    return fa < fb ? 1 : -1;
  }
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/**
 * Jetons de mention ACTIFS d'une liste de lignes de store (getMentions) —
 * la forme attendue par verifierDroitIntervention (champ `mentions`).
 * Le filtrage par personne reste à l'appelant.
 */
export function jetonsMentionsActives(lignes) {
  return (Array.isArray(lignes) ? lignes : [])
    .filter((m) => m && m.actif)
    .map((m) => m.fluideMention);
}

/**
 * Transition du régime 2008 vers le régime 2025 (L4/Q3, 24/07/2026 —
 * arrêté du 21/11/2025 relatif aux attestations d'APTITUDE, art. 7 et 11,
 * lus verbatim sur Légifrance ; règl. UE 2024/573 art. 10) :
 *  - FIN_DELIVRANCE_2008 : après le 31/12/2026 plus AUCUNE attestation ne
 *    peut être DÉLIVRÉE sous l'ancien régime (l'arrêté du 13/10/2008 est
 *    abrogé) — mais les attestations déjà détenues ne meurent PAS à cette
 *    date (l'ancien couperet FIN_RECONNAISSANCE_2008 était une erreur :
 *    il confondait fin de délivrance et fin de validité) ;
 *  - DATE_BUTOIR_REMISE_NIVEAU_2008 : les titulaires I-IV suivent une
 *    formation de remise à niveau ponctuelle AU PLUS TARD le 12/03/2029 ;
 *    à défaut, « l'attestation n'est plus valide, le titulaire est tenu de
 *    repasser l'examen » — une remise à niveau POSTÉRIEURE au butoir ne
 *    répare donc pas (lecture stricte consignée au plan L4) ;
 *  - DUREE_CYCLE_FORMATION_ANS : après la remise à niveau, cycle périodique
 *    d'au plus 7 ans (le même que les catégories 2025).
 * Appliquées par l'ASSEMBLAGE des faits du mode Officiel (P0-5) — jamais
 * par le moteur de verdict, qui reste sans horloge.
 */
export const FIN_DELIVRANCE_2008 = '2026-12-31';
export const DATE_BUTOIR_REMISE_NIVEAU_2008 = '2029-03-12';
export const DUREE_CYCLE_FORMATION_ANS = 7;

/**
 * Date ISO + n années, même mois et jour ; un 29/02 vers une année non
 * bissextile est écrêté au 28/02 (convention du mois civil, comme
 * `ajouterUnMoisCivil`). Entrée illisible → null.
 */
export function plusAnnees(dateIso, nbAnnees) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateIso ?? ''));
  if (!m) return null;
  const annee = Number(m[1]) + nbAnnees;
  const mois = Number(m[2]);
  let jour = Number(m[3]);
  // Revue L4 — le format ne suffit pas : '2028-99-99' matche \d{2}. On
  // exige une date CALENDAIRE réelle (aller-retour UTC, sans horloge).
  const controle = new Date(Date.UTC(Number(m[1]), mois - 1, Number(m[3])));
  if (controle.getUTCMonth() !== mois - 1
      || controle.getUTCDate() !== Number(m[3])) return null;
  const bissextile = (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;
  if (mois === 2 && jour === 29 && !bissextile) jour = 28;
  // Revue L4 : l'année aussi est cadrée (une année < 1000 non paddée cassait
  // l'ordre lexicographique et RESSUSCITAIT une attestation).
  return `${String(annee).padStart(4, '0')}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}

/**
 * Une ligne d'habilitation du store COMPTE-t-elle à la date de référence
 * (AAAA-MM-JJ) ? = active, non échue par sa propre échéance, et — pour le
 * régime 2008 — dans les clous de la transition : reconnue sans condition
 * jusqu'au 12/03/2029, puis SEULEMENT si une remise à niveau ponctuelle a
 * été enregistrée au plus tard le butoir (`remiseNiveauLe`, migration 33)
 * et que le cycle de 7 ans n'est pas échu. Pur : la date vient de
 * l'appelant. Consommé par les deux `cadreFicheOfficiel` (fait
 * `habilitationActive` ET fait `aptitude`).
 */
export function habilitationReconnue(h, dateReference) {
  if (!h || !h.actif) return false;
  // Revue L4 — jamais reconnaître par accident : une date de référence
  // illisible ne compare pas, elle REFUSE ('' ou '13/03/2029' passaient
  // les comparaisons de chaînes).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateReference ?? ''))) return false;
  if (h.dateFin && h.dateFin < dateReference) return false;
  if (h.regime === '2025') return true;
  if (h.regime === '2008') {
    if (dateReference <= DATE_BUTOIR_REMISE_NIVEAU_2008) return true;
    // Revue L4 — une remise illisible (datetime ISO, format libre) ne
    // compare pas : elle ne compte pas. Le calendrier réel est contrôlé
    // par plusAnnees (défense en profondeur, le CRUD garde l'entrée).
    const remise = typeof h.remiseNiveauLe === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(h.remiseNiveauLe)
      ? h.remiseNiveauLe : null;
    if (!remise || remise > DATE_BUTOIR_REMISE_NIVEAU_2008) return false;
    const echeanceCycle = plusAnnees(remise, DUREE_CYCLE_FORMATION_ANS);
    return echeanceCycle !== null && dateReference <= echeanceCycle;
  }
  // Revue L4 — défaut-REFUS : un régime inconnu ('2008 ' avec espace, champ
  // absent, nombre) n'est pas « reconnu sans condition », il ne compte pas.
  return false;
}

/**
 * Seuils de charge du RÉGIME 2025 (§2). Le texte dit charge « INFÉRIEURE À »
 * 3 kg (6 kg si hermétiquement scellé ET étiqueté) : la limite est STRICTE —
 * 3,000 kg pile est REFUSÉ (audit du 20/07/2026, §4.3).
 */
export const SEUIL_CHARGE_LIMITEE_KG = 3;
export const SEUIL_CHARGE_HERMETIQUE_KG = 6;

/**
 * Seuil de charge du RÉGIME 2008 (arrêté du 13/10/2008) : les catégories II
 * et III sont bornées à MOINS DE 2 kg (strict, 2,000 pile refusé) pour les
 * opérations avec accès au circuit — le contrôle d'étanchéité sans ouverture
 * du circuit reste sans limite (porté par l'axe opération). Le texte 2008 ne
 * prévoit AUCUNE variante hermétique : le 6 kg est une règle du régime 2025.
 * Décision Franck 24/07/2026 (Q2) ; « hermétique = 2 kg quand même » et
 * « cat. III alignée » = délégations côté strict, consignées au
 * PLAN-LOTS-REGLEMENTAIRES-Q1-Q11 (R1), révocables.
 */
export const SEUIL_CHARGE_2008_KG = 2;

/** Type de mouvement du registre / libellé libre → opération normalisée. */
const MAP_OPERATION = {
  CHARGE: 'MAINTENANCE',
  CHARGE_APPOINT: 'MAINTENANCE',
  MISE_EN_SERVICE: 'INSTALLATION',
  RECUPERATION_MAINTENANCE: 'RECUPERATION',
  RECUPERATION_DEMANTELEMENT: 'RECUPERATION',
  TRANSFERT: 'RECUPERATION',
  CONTROLE: 'ETANCHEITE',
  CONTROLE_ETANCHEITE: 'ETANCHEITE',
  CONTROLE_PERIODIQUE: 'ETANCHEITE',
  CONTROLE_NON_PERIODIQUE: 'ETANCHEITE',
  ETANCHEITE: 'ETANCHEITE',
  INSTALLATION: 'INSTALLATION',
  MAINTENANCE: 'MAINTENANCE',
  REPARATION: 'MAINTENANCE',
  RECUPERATION: 'RECUPERATION'
};

/** Normalise une opération ; inconnue → MAINTENANCE (le plus exigeant, prudent). */
export function operationNormalisee(op) {
  if (!op) return null;
  return MAP_OPERATION[String(op).toUpperCase()] ?? 'MAINTENANCE';
}

/**
 * Déduit la famille d'un code fluide (secours si familleFluide absent). Renvoie
 * les mêmes jetons que le référentiel (`famille`) : HFC / HFO / HFC/HFO / CO2 /
 * HC / NH3. Défaut : 'HFC/HFO' (grande majorité du parc).
 */
export function familleDuFluide(code) {
  if (!code) return null;
  const c = String(code).toUpperCase().replace(/\s/g, '');
  if (c === 'R-744' || c === 'R744') return 'CO2';
  if (c === 'R-717' || c === 'R717') return 'NH3';
  if (['R-290', 'R290', 'R-600', 'R600', 'R-600A', 'R600A', 'R-1270', 'R1270'].includes(c)) return 'HC';
  if (['R-1234YF', 'R1234YF', 'R-1234ZE', 'R1234ZE'].includes(c)) return 'HFO';
  return 'HFC/HFO';
}

/**
 * Profil d'une catégorie : opérations, limite de charge (kg, null = aucune),
 * familles de fluide NATIVES. La correspondance 2008→2025 est appliquée ici
 * (I/II→A1 ; III→D ; IV→E). Familles natives 2008 = HFC/HFO SEULEMENT (HC/CO₂/
 * NH₃ passent par une mention pour un ancien). Retourne null si inconnue.
 */
function profilDeCategorie(regime, categorie) {
  const T = OPS_TOUTES;
  if (regime === '2025') {
    switch (categorie) {
      case 'A1': return { ops: T, limiteKg: null, familles: ['HFC', 'HFO', 'HFC/HFO', 'HC'] };
      // hermetique6 : seules les catégories limitées du RÉGIME 2025 voient
      // leur seuil porté à 6 kg sur un équipement hermétiquement scellé ET
      // étiqueté (L1a, 24/07/2026).
      case 'A2': return { ops: T, limiteKg: SEUIL_CHARGE_LIMITEE_KG, hermetique6: true, familles: ['HFC', 'HFO', 'HFC/HFO', 'HC'] };
      case 'B':  return { ops: T, limiteKg: null, familles: ['CO2'] };
      case 'C':  return { ops: T, limiteKg: null, familles: ['NH3'] };
      case 'D':  return { ops: ['RECUPERATION'], limiteKg: SEUIL_CHARGE_LIMITEE_KG, hermetique6: true, familles: ['HFC', 'HFO', 'HFC/HFO'] };
      case 'E':  return { ops: ['ETANCHEITE'], limiteKg: null, familles: ['HFC', 'HFO', 'HFC/HFO'] };
      case 'V':  return { ops: T, limiteKg: null, familles: ['VEHICULE'] };
      default: return null;
    }
  }
  if (regime === '2008') {
    switch (categorie) {
      case 'I':   return { ops: T, limiteKg: null, familles: ['HFC', 'HFO', 'HFC/HFO'] };
      // II = toutes opérations mais charge LIMITÉE À MOINS DE 2 kg (arrêté du
      // 13/10/2008 — décision Q2 du 24/07/2026 ; elle était d'abord modélisée
      // sans limite, puis à 3 kg comme l'A2). AUCUNE variante hermétique en
      // 2008 (hermetique6 absent) ; l'étanchéité passe par l'axe opération.
      case 'II':  return { ops: T, limiteKg: SEUIL_CHARGE_2008_KG, familles: ['HFC', 'HFO', 'HFC/HFO'] };
      // III = récupération seule, même borne de 2 kg (délégué côté strict).
      case 'III': return { ops: ['RECUPERATION'], limiteKg: SEUIL_CHARGE_2008_KG, familles: ['HFC', 'HFO', 'HFC/HFO'] };
      case 'IV':  return { ops: ['ETANCHEITE'], limiteKg: null, familles: ['HFC', 'HFO', 'HFC/HFO'] };
      default: return null;
    }
  }
  return null;
}

/** Tokens de mention libres → familles canoniques (CO2 / NH3 / HC). */
function normaliserMentions(mentions) {
  const out = [];
  for (const m of (Array.isArray(mentions) ? mentions : [])) {
    const c = String(m).toUpperCase().replace(/\s/g, '');
    if (c === 'CO2' || c === 'CO₂' || c === 'R-744' || c === 'R744') out.push('CO2');
    else if (c === 'NH3' || c === 'AMMONIAC' || c === 'R-717' || c === 'R717') out.push('NH3');
    else if (c === 'HC' || c === 'HYDROCARBURE' || c === 'HYDROCARBURES' || c === 'R-290' || c === 'R290') out.push('HC');
  }
  return out;
}

// --- aides de rédaction (français accentué, zéro emoji) --------------------
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function fmtKg(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '?';
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 3 }) + ' kg';
}
function labelOp(op) {
  return {
    ETANCHEITE: 'contrôle d’étanchéité', INSTALLATION: 'mise en service',
    MAINTENANCE: 'intervention', RECUPERATION: 'récupération'
  }[op] || 'intervention';
}
const OK_PHRASE = {
  ETANCHEITE: 'Contrôle d’étanchéité autorisé sur ce fluide.',
  INSTALLATION: 'Mise en service autorisée sur ce fluide.',
  MAINTENANCE: 'Intervention autorisée sur ce fluide.',
  RECUPERATION: 'Récupération autorisée sur ce fluide.'
};
function libelleFamille(famille, fluide) {
  return {
    CO2: 'CO₂ (R-744)', NH3: 'ammoniac (R-717)', HC: 'hydrocarbures',
    VEHICULE: 'climatisation véhicule'
  }[famille] || (fluide || 'HFC/HFO');
}
function conseilFluideManquant(famille) {
  return {
    CO2: 'Une formation complémentaire CO₂ (mention) ou une catégorie B est requise.',
    NH3: 'Une formation complémentaire ammoniac (mention) ou une catégorie C est requise.',
    HC: 'Une formation complémentaire hydrocarbures (mention) est requise.',
    VEHICULE: 'La catégorie V (climatisation véhicule) est requise.'
  }[famille] || 'Une catégorie adaptée à ce fluide est requise.';
}
function refus(motif, conseil) { return { autorise: false, gravite: 'REFUS', motif, conseil }; }

/**
 * Verdict de CONSEIL pour une intervention (jamais bloquant).
 *
 * @param {object}   p
 * @param {Array<{regime,categorie}>} p.habilitations  Habilitations ACTIVES.
 * @param {string[]} [p.mentions]        Mentions fluide (CO2 / NH3 / HC).
 * @param {string}   [p.operation]       Type de mouvement OU opération ; null = synthèse « qui intervient ? ».
 * @param {string}   [p.fluide]          Code fluide (ex. 'R-410A'), pour messages / dérivation famille.
 * @param {string}   [p.familleFluide]   Famille (HFC/HFO/HFC-HFO/CO2/HC/NH3/VEHICULE) ; prioritaire sur `fluide`.
 * @param {number}   [p.chargeKg]        Charge de l'installation (kg).
 * @param {boolean}  [p.hermetiqueScelle] Système hermétiquement scellé (seuil 6 kg).
 * @returns {{autorise:boolean, gravite:'OK'|'CONSEIL'|'REFUS', motif:string, conseil:string}}
 */
export function verifierDroitIntervention({
  habilitations = [], mentions = [], operation = null,
  fluide = null, familleFluide = null, chargeKg = null,
  hermetiqueScelle = false
} = {}) {
  const famille = familleFluide || familleDuFluide(fluide);
  const mentionsFam = normaliserMentions(mentions);
  const habs = Array.isArray(habilitations) ? habilitations : [];

  // 0. Personne sans aucune habilitation (mention seule ne suffit pas).
  if (habs.length === 0) {
    return refus('Aucune habilitation enregistrée',
      'Demandez à l’administrateur d’activer votre profil et de renseigner vos catégories.');
  }

  // 1. Profils atteignant CE fluide (familles natives ∪ mentions).
  // Limite de charge PAR CATÉGORIE (L1a, 24/07/2026) : l'élargissement
  // hermétique à 6 kg ne joue QUE pour les catégories 2025 qui le prévoient
  // (`hermetique6` — A2/D) ; les catégories 2008 gardent leur borne de 2 kg
  // en toutes circonstances. Avant ce correctif, un seuil GLOBAL (3 ou 6)
  // écrasait la limite par catégorie : découpler 2008 de 2025 était
  // impossible, et changer la constante seule n'aurait RIEN changé.
  const profils = [];
  for (const h of habs) {
    const p = profilDeCategorie(h.regime, h.categorie);
    if (!p) continue;
    const famEff = p.familles.concat(mentionsFam);
    if (!famille || famEff.includes(famille)) {
      const limite = p.limiteKg === null ? null
        : (p.hermetique6 && hermetiqueScelle ? SEUIL_CHARGE_HERMETIQUE_KG : p.limiteKg);
      profils.push({ ops: p.ops, limiteKg: limite });
    }
  }
  if (profils.length === 0) {
    return refus(`Fluide ${libelleFamille(famille, fluide)} hors de votre champ`,
      conseilFluideManquant(famille));
  }

  const op = operation ? operationNormalisee(operation) : null;

  // 2a. Synthèse « qui intervient ? » (aucune opération choisie). La CHARGE
  // de l'installation, quand elle est connue, écarte les profils dont la
  // limite est dépassée (constat de revue : sans cela, un D limité à 3 kg
  // paraissait « récupération autorisée » en synthèse sur une machine de
  // 10 kg alors que le verdict d'opération l'aurait refusé — les deux
  // écrans se contredisaient). L'étanchéité (limite null) survit toujours :
  // contrôler ne manipule pas le circuit.
  if (!op) {
    if (chargeKg === null || chargeKg === undefined) return synthese(profils);
    // Revue L1 (24/07) : un profil au-delà de sa limite ne disparaît pas en
    // bloc — sa capacité de contrôle d'étanchéité SURVIT, dégradée à
    // { ETANCHEITE, sans limite }, comme au verdict d'opération (qui saute
    // le contrôle de charge pour l'étanchéité). Sans cela, la fiche machine
    // disait REFUS à un cat. II sur 10 kg quand le wizard autorisait le
    // contrôle : contradiction entre écrans (le précédent du 14/07, en sens
    // inverse).
    const dansLaLimite = [];
    for (const pr of profils) {
      if (pr.limiteKg === null || Number(chargeKg) < pr.limiteKg) {
        dansLaLimite.push(pr);
      } else if (pr.ops.includes('ETANCHEITE')) {
        dansLaLimite.push({ ops: ['ETANCHEITE'], limiteKg: null });
      }
    }
    if (dansLaLimite.length === 0) {
      const limite = Math.max(...profils.map((pr) => pr.limiteKg));
      return {
        autorise: false, gravite: 'REFUS',
        motif: `Charge de l'installation au-delà de votre limite (${limite} kg)`,
        conseil: `Vos catégories limitent la manipulation à ${limite} kg : `
          + `cette installation en contient ${fmtKg(chargeKg)}, vous ne pouvez pas.`
      };
    }
    return synthese(dansLaLimite);
  }

  // 2b. Verdict pour une opération précise.
  const donneOp = profils.filter((pr) => pr.ops.includes(op));
  if (donneOp.length === 0) {
    return refus(motifOpInterdite(profils), conseilOpInterdite(profils));
  }

  // Contrôle de charge (jamais pour l'étanchéité : pas de manipulation).
  if (op !== 'ETANCHEITE' && chargeKg !== null && chargeKg !== undefined) {
    const sansLimite = donneOp.some((pr) => pr.limiteKg === null);
    if (!sansLimite) {
      const limite = Math.max(...donneOp.map((pr) => pr.limiteKg));
      if (Number(chargeKg) >= limite) {
        return {
          autorise: false, gravite: 'REFUS',
          motif: `${cap(labelOp(op))} limitée à ${limite} kg`,
          conseil: `${cap(labelOp(op))} limitée à ${limite} kg : cette installation en contient ${fmtKg(chargeKg)}, vous ne pouvez pas.`
        };
      }
      return {
        autorise: true, gravite: 'CONSEIL',
        motif: `${cap(labelOp(op))} autorisée dans la limite de ${limite} kg`,
        conseil: `Autorisé : ${labelOp(op)} dans la limite de ${limite} kg (charge de l'installation ${fmtKg(chargeKg)}).`
      };
    }
  }
  return { autorise: true, gravite: 'OK', motif: 'Opération autorisée', conseil: OK_PHRASE[op] };
}

/** Synthèse de compétence sur le fluide (mode « identifier le technicien »). */
function synthese(profils) {
  const opsSet = new Set();
  let illimite = false, aLimite = false, limiteMax = 0;
  for (const p of profils) {
    p.ops.forEach((o) => opsSet.add(o));
    if (p.limiteKg === null) illimite = true;
    else { aLimite = true; limiteMax = Math.max(limiteMax, p.limiteKg); }
  }
  if (opsSet.size === 1 && opsSet.has('ETANCHEITE')) {
    return {
      autorise: true, gravite: 'CONSEIL', motif: 'Contrôle d’étanchéité uniquement',
      conseil: 'Contrôle d’étanchéité uniquement : pas de manipulation du circuit.'
    };
  }
  if (opsSet.size === 1 && opsSet.has('RECUPERATION')) {
    const lim = illimite ? null : limiteMax;
    return {
      autorise: true, gravite: 'CONSEIL', motif: 'Récupération uniquement',
      conseil: lim !== null ? `Récupération uniquement, dans la limite de ${lim} kg.` : 'Récupération uniquement.'
    };
  }
  const toutes = OPS_TOUTES.every((o) => opsSet.has(o));
  if (toutes && illimite) {
    return { autorise: true, gravite: 'OK', motif: 'Toutes opérations autorisées', conseil: 'Toutes opérations autorisées sur ce fluide.' };
  }
  if (toutes && !illimite) {
    return {
      autorise: true, gravite: 'CONSEIL', motif: `Toutes opérations dans la limite de ${limiteMax} kg`,
      conseil: `Toutes opérations autorisées, dans la limite de ${limiteMax} kg.`
    };
  }
  const liste = OPS_TOUTES.filter((o) => opsSet.has(o)).map(labelOp).join(', ');
  return {
    autorise: true, gravite: 'CONSEIL', motif: `Opérations autorisées : ${liste}`,
    conseil: `Opérations autorisées sur ce fluide : ${liste}${aLimite && !illimite ? ` (limite ${limiteMax} kg)` : ''}.`
  };
}

function motifOpInterdite(profils) {
  const ops = new Set(); profils.forEach((p) => p.ops.forEach((o) => ops.add(o)));
  if (ops.size === 1 && ops.has('ETANCHEITE')) return 'Contrôle d’étanchéité uniquement : pas de manipulation';
  if (ops.size === 1 && ops.has('RECUPERATION')) return 'Récupération uniquement : opération non couverte';
  return 'Opération non couverte par vos catégories';
}
function conseilOpInterdite(profils) {
  const ops = new Set(); profils.forEach((p) => p.ops.forEach((o) => ops.add(o)));
  if (ops.size === 1 && ops.has('ETANCHEITE')) {
    return 'Vous pouvez contrôler l’étanchéité mais pas manipuler le circuit : confiez la charge à un titulaire A1/A2/B/C.';
  }
  if (ops.size === 1 && ops.has('RECUPERATION')) {
    return 'Vous pouvez récupérer le fluide mais pas charger ni mettre en service : confiez cette opération à un titulaire A1/A2/B/C.';
  }
  return 'Opération hors de votre champ : confiez-la à un titulaire habilité.';
}

/** Identifiabilité (règle admin) : personne activée ET champ de compétence renseigné. */
export function estIntervenantIdentifiable(personne, habilitationsActives, mentionsActives) {
  return !!(personne && personne.actif
    && (((habilitationsActives && habilitationsActives.length) || 0) > 0
      || ((mentionsActives && mentionsActives.length) || 0) > 0));
}
