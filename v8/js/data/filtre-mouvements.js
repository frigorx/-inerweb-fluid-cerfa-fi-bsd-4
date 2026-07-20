// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — filtrage de la vue « Mouvements »
// (PUR/Node-testable, zéro DOM).
//
// Trou produit relevé à l'examen du 10/07 : le registre grossit à
// chaque intervention et la vue n'offrait ni recherche ni filtre.
// Ce module porte TOUTE la logique (indexation d'un mouvement,
// correspondance aux critères, options disponibles) ; la vue ne
// fait que le câblage DOM (masquage de lignes, patron machines.js).
// La recherche libre est insensible à la casse ET aux accents
// (« recuperation » trouve « Récupération »).
// ============================================================

/**
 * Groupes de types proposés au filtre — alignés sur les LIBELLÉS des
 * chips de communs.js : les deux types de récupération affichent la
 * même chip « Récupération », ils forment donc UNE entrée de filtre.
 */
export const TYPES_FILTRE = [
  { valeur: 'MISE_EN_SERVICE', libelle: 'Charge / Mise en service',
    types: ['MISE_EN_SERVICE'] },
  { valeur: 'CHARGE_APPOINT', libelle: 'Complément de charge',
    types: ['CHARGE_APPOINT'] },
  { valeur: 'RECUPERATION', libelle: 'Récupération',
    types: ['RECUPERATION_MAINTENANCE', 'RECUPERATION_DEMANTELEMENT'] },
  { valeur: 'TRANSFERT', libelle: 'Transfert',
    types: ['TRANSFERT'] },
  // P7-d2 : les deux types CONTROLE regroupés (comme les récupérations).
  { valeur: 'CONTROLE', libelle: 'Contrôle d’étanchéité',
    types: ['CONTROLE_PERIODIQUE', 'CONTROLE_NON_PERIODIQUE'] }
];

/** Statuts proposés au filtre (libellés des chips de communs.js). */
export const STATUTS_FILTRE = [
  { valeur: 'BROUILLON', libelle: 'Brouillon' },
  { valeur: 'SOUMIS', libelle: 'Soumis' },
  { valeur: 'VALIDE', libelle: 'Validé' },
  { valeur: 'ANNULE', libelle: 'Annulé' }
];

/** Groupe de filtre d'un type brut ('RECUPERATION_…' → 'RECUPERATION'). */
function groupeDuType(type) {
  const groupe = TYPES_FILTRE.find((g) => g.types.includes(type));
  // Type inconnu : il reste filtrable par sa valeur brute (filet —
  // un type ajouté demain ne devient pas invisible au filtre).
  return groupe ? groupe.valeur : String(type ?? '');
}

/**
 * Normalise un texte pour la recherche libre : minuscules, accents
 * dépouillés (décomposition NFD puis retrait des diacritiques),
 * espaces réduits.
 * @param {string} texte
 * @returns {string}
 */
export function normaliserTexte(texte) {
  return String(texte ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Index de filtrage d'un mouvement : les clés exactes (statut, groupe
 * de type, fluide, année) et le texte agrégé de la recherche libre
 * (numéro, CERFA, machine ou « B-01 → B-04 » pour un transfert,
 * fluide, technicien, motif de rejet).
 * @param {object} mv — mouvement (copie du store)
 * @param {Map<string, object>} [bouteillesParId] — pour résoudre les
 *   codes des transferts (même Map que la vue, CF-7)
 * @param {Map<string, string>} [personnelParId] — id → « Prénom Nom »
 *   VIVANT (lot E2 : le texte cherchable porte le libellé de la fiche —
 *   pseudonyme si la personne est au coffre — jamais le nom figé quand un
 *   identifiant existe : chercher le vrai nom d'un élève à l'abri ne
 *   trouve rien, chercher son pseudonyme trouve)
 * @returns {{ statut: string, groupeType: string, fluide: string,
 *             annee: string, texte: string }}
 */
export function indexerMouvement(mv, bouteillesParId = new Map(),
  personnelParId = new Map()) {
  let libelleMachine = mv.machineLabel || '';
  if (mv.type === 'TRANSFERT') {
    const src = bouteillesParId.get(mv.bouteilleSrcId);
    const dst = bouteillesParId.get(mv.bouteilleDstId);
    libelleMachine = [src ? src.code : '', dst ? dst.code : '']
      .filter(Boolean).join(' ');
  }
  // Lot E2 : le libellé du technicien passe par l'identifiant quand il
  // existe (contre-écriture : le technicien est le validateur).
  const idPorteur = mv.executeParId
    ?? (mv.contreEcritureDe ? mv.validateurId : null);
  const technicienCherchable = idPorteur && personnelParId.has(idPorteur)
    ? personnelParId.get(idPorteur) : mv.technicien;
  return {
    statut: String(mv.statut ?? ''),
    groupeType: groupeDuType(mv.type),
    fluide: String(mv.fluide ?? ''),
    annee: mv.date ? String(mv.date).slice(0, 4) : '',
    texte: normaliserTexte([mv.numero, mv.cerfaNumero, libelleMachine,
      mv.fluide, technicienCherchable, mv.motifRejet]
      .filter(Boolean).join(' '))
  };
}

/**
 * Un mouvement indexé correspond-il aux critères ? Un critère vide
 * ('') ne filtre pas. La recherche libre exige TOUS ses mots (ET),
 * chacun insensible à la casse et aux accents.
 * @param {ReturnType<typeof indexerMouvement>} indexe
 * @param {{ texte?: string, statut?: string, type?: string,
 *           fluide?: string, annee?: string }} criteres
 * @returns {boolean}
 */
export function correspond(indexe, criteres = {}) {
  if (criteres.statut && indexe.statut !== criteres.statut) return false;
  if (criteres.type && indexe.groupeType !== criteres.type) return false;
  if (criteres.fluide && indexe.fluide !== criteres.fluide) return false;
  if (criteres.annee && indexe.annee !== criteres.annee) return false;
  const mots = normaliserTexte(criteres.texte ?? '').split(' ').filter(Boolean);
  return mots.every((mot) => indexe.texte.includes(mot));
}

/**
 * Options réellement PRÉSENTES dans le registre, pour peupler les
 * listes du filtre (un select ne propose jamais un choix sans
 * résultat) : groupes de type dans l'ordre canonique de TYPES_FILTRE,
 * fluides triés en français, années les plus récentes en tête.
 * @param {Array<object>} mouvements
 * @returns {{ types: Array<{valeur: string, libelle: string}>,
 *             fluides: string[], annees: string[] }}
 */
export function optionsDisponibles(mouvements) {
  const groupes = new Set();
  const fluides = new Set();
  const annees = new Set();
  for (const mv of mouvements ?? []) {
    groupes.add(groupeDuType(mv.type));
    if (mv.fluide) fluides.add(mv.fluide);
    if (mv.date) annees.add(String(mv.date).slice(0, 4));
  }
  const connus = TYPES_FILTRE.filter((g) => groupes.has(g.valeur));
  // Filet : un type hors référentiel apparaît quand même (valeur brute).
  const inconnus = [...groupes]
    .filter((v) => !TYPES_FILTRE.some((g) => g.valeur === v))
    .sort((a, b) => a.localeCompare(b, 'fr'))
    .map((v) => ({ valeur: v, libelle: v }));
  return {
    types: [...connus, ...inconnus],
    fluides: [...fluides].sort((a, b) => a.localeCompare(b, 'fr')),
    annees: [...annees].sort().reverse()
  };
}
