/**
 * inerWeb TP — Données de référence
 * Vérité terrain : inventaire théorique 2024 + référentiel fluides.
 * Le serveur (ou l'app locale) s'en sert pour auto-corriger les réponses élève.
 */

// ==========================================================================
// FLUIDES — PRP AR5 (règlement UE 2024/573 F-Gas)
// Utilisé pour :
//   1) Valider le fluide annoncé par l'élève (étiquette).
//   2) Calculer le tCO2eq = masse_nette × PRP / 1000 et comparer à la réponse élève.
// ==========================================================================
const FLUIDES = [
  { code: 'R134a',   nom: '1,1,1,2-Tétrafluoroéthane',           famille: 'HFC',     prp: 1430, securite: 'A1',  couleur: 'Bleu ciel',     usage: 'Climatisation auto, vitrines positives' },
  { code: 'R32',     nom: 'Difluorométhane',                      famille: 'HFC',     prp: 675,  securite: 'A2L', couleur: 'Rose saumon',   usage: 'Split résidentiel, PAC air-air' },
  { code: 'R410A',   nom: 'Mélange R32 / R125 (50/50)',           famille: 'HFC mix', prp: 2088, securite: 'A1',  couleur: 'Rose fuchsia',  usage: 'Split et VRV' },
  { code: 'R404A',   nom: 'Mélange R125/R143a/R134a',             famille: 'HFC mix', prp: 3922, securite: 'A1',  couleur: 'Orange',        usage: 'Froid commercial négatif' },
  { code: 'R407C',   nom: 'Mélange R32/R125/R134a',               famille: 'HFC mix', prp: 1774, securite: 'A1',  couleur: 'Marron clair',  usage: 'Climatisation, substitut R22' },
  { code: 'R1234yf', nom: '2,3,3,3-Tétrafluoropropène',           famille: 'HFO',     prp: 4,    securite: 'A2L', couleur: 'Blanc / gris',  usage: 'Clim auto récente' },
  { code: 'R454B',   nom: 'Mélange R32 / R1234yf',                famille: 'HFO mix', prp: 466,  securite: 'A2L', couleur: "Vert d'eau",    usage: 'Remplaçant R410A' },
  { code: 'R22',     nom: 'Chlorodifluorométhane',                famille: 'HCFC',    prp: 1810, securite: 'A1',  couleur: 'Vert clair',    usage: 'INTERDIT neuf — récupération uniquement' },
  { code: 'VIDE',    nom: 'Bouteille vide (pas de fluide)',       famille: '-',      prp: 0,    securite: '-',   couleur: '-',             usage: 'Utiliser le jeu de manomètres pour vérifier' }
];

// Helper : récupérer un fluide par code
function getFluide(code) {
  return FLUIDES.find(f => f.code.toLowerCase() === String(code).toLowerCase());
}

// ==========================================================================
// MARQUES DE BOUTEILLES (pour les menus déroulants)
// ==========================================================================
const MARQUES = [
  'GAZECHIM',
  'GAZECHIME',
  'DHEON',
  'CLIMALIFE',
  'WESTFALEN',
  'LINDE',
  'Autre'
];

// ==========================================================================
// TYPES DE BOUTEILLES
// ==========================================================================
const TYPES_BOUTEILLE = [
  { code: 'NEUF',      label: 'Neuve (pleine usine)',             couleur: '#4CAF50' },
  { code: 'TRANSFERT', label: 'Transfert (re-remplie / régénérée)', couleur: '#2196F3' },
  { code: 'RECUP',     label: 'Récupération (à vidanger)',        couleur: '#E8914A' },
  { code: 'VIDE',      label: 'Vide (prête à remplir)',            couleur: '#9E9E9E' }
];

// ==========================================================================
// CAPACITÉS USUELLES
// ==========================================================================
const CAPACITES = [
  { valeur: 5,  label: '5 L (petite)' },
  { valeur: 12, label: '12 L (standard atelier)' },
  { valeur: 27, label: '27 L (grand modèle)' },
  { valeur: 40, label: '40 L (industriel)' }
];

// ==========================================================================
// INVENTAIRE THÉORIQUE 2024 — VÉRITÉ TERRAIN
// Extrait des documents « Traçabilité des bouteilles 24.docx »
// et « Suivi des bouteilles R134A 20-21-22.docx ».
// C'est ce que le serveur va comparer à ce que l'élève SAISIT.
// ==========================================================================
const BOUTEILLES_REELLES = [
  { code: 'TP-B01', marque: 'DHEON',     numSerie: 'HHD86',   type: 'RECUP',     capacite_L: 27, fluide_etiquette: 'R134a', tare_kg: 16.0,  masse_brute_derniere_kg: 21.5, quantite_fluide_theorique_kg: 5.5,   etat_2024: 'recup' },
  { code: 'TP-B02', marque: 'GAZECHIM',  numSerie: '513822',  type: 'RECUP',     capacite_L: 27, fluide_etiquette: 'R134a', tare_kg: 13.2,  masse_brute_derniere_kg: 18.1, quantite_fluide_theorique_kg: 4.9,   etat_2024: 'recup' },
  { code: 'TP-B03', marque: 'GAZECHIME', numSerie: '5438',    type: 'NEUF',      capacite_L: 12, fluide_etiquette: 'R134a', tare_kg: 7.48,  masse_brute_derniere_kg: 7.48, quantite_fluide_theorique_kg: 0,     etat_2024: 'vide' },
  { code: 'TP-B04', marque: 'GAZECHIME', numSerie: '9496',    type: 'NEUF',      capacite_L: 12, fluide_etiquette: 'R134a', tare_kg: 8.15,  masse_brute_derniere_kg: 8.15, quantite_fluide_theorique_kg: 0,     etat_2024: 'vide' },
  { code: 'TP-B05', marque: 'GAZECHIME', numSerie: '7727',    type: 'RECUP',     capacite_L: 12, fluide_etiquette: 'R134a', tare_kg: 7.23,  masse_brute_derniere_kg: 7.23, quantite_fluide_theorique_kg: 0,     etat_2024: 'vide' },
  { code: 'TP-B06', marque: 'GAZECHIM',  numSerie: '0672',    type: 'TRANSFERT', capacite_L: 27, fluide_etiquette: 'R134a', tare_kg: 13.3,  masse_brute_derniere_kg: 13.3, quantite_fluide_theorique_kg: 0,     etat_2024: 'vide' },
  { code: 'TP-B07', marque: 'GAZECHIME', numSerie: '597508',  type: 'NEUF',      capacite_L: 27, fluide_etiquette: 'R134a', tare_kg: 13.3,  masse_brute_derniere_kg: 14.64, quantite_fluide_theorique_kg: 1.34, etat_2024: 'en_service' },
  { code: 'TP-B08', marque: 'GAZECHIM',  numSerie: '01878',   type: 'TRANSFERT', capacite_L: 27, fluide_etiquette: 'R134a', tare_kg: 13.5,  masse_brute_derniere_kg: 13.5, quantite_fluide_theorique_kg: 0,     etat_2024: 'vide' },
  { code: 'TP-B09', marque: 'GAZECHIM',  numSerie: '25916',   type: 'NEUF',      capacite_L: 12, fluide_etiquette: 'R134a', tare_kg: 9.2,   masse_brute_derniere_kg: 16.3, quantite_fluide_theorique_kg: 7.1,   etat_2024: 'en_service' },
  { code: 'TP-B10', marque: 'GAZECHIM',  numSerie: '1807',    type: 'TRANSFERT', capacite_L: 27, fluide_etiquette: 'R134a', tare_kg: 13.4,  masse_brute_derniere_kg: 13.4, quantite_fluide_theorique_kg: 0,     etat_2024: 'vide' }
];

// Helper : retrouver une bouteille par son code TP-Bxx
function getBouteille(code) {
  return BOUTEILLES_REELLES.find(b => b.code.toUpperCase() === String(code).toUpperCase());
}

// ==========================================================================
// TOLÉRANCES D'AUTO-CORRECTION
// ==========================================================================
const TOLERANCES = {
  // Identification : exact (case insensitive)
  marque:       { type: 'exact' },
  numSerie:     { type: 'contains' },                 // le n° peut avoir des variantes (ex. 597508 / 5.975.08)
  type:         { type: 'exact' },
  capacite:     { type: 'exact' },
  fluide:       { type: 'exact' },
  // Pesée
  tare_kg:           { type: 'tolerance_abs', tol: 0.10 },  // ± 100 g accepté (balance précision 10g)
  masse_brute_kg:    { type: 'tolerance_abs', tol: 0.20 },  // ± 200 g : bouteille peut avoir perdu un peu
  // Calculs élève
  masse_nette_kg:    { type: 'tolerance_abs', tol: 0.05 },  // ± 50 g : calcul simple, doit être précis
  tCO2eq:            { type: 'tolerance_rel', tol: 0.02 }   // ± 2 % : arrondi acceptable
};

// ==========================================================================
// COMPÉTENCES RÉFÉRENTIEL CAP IFCA (Installateur en Froid et Conditionnement d'Air)
// Chaque champ noté est rattaché à une compétence du référentiel.
// ==========================================================================
const COMPETENCES = {
  'C1.3': { label: 'Identifier un fluide frigorigène', axe: 'Analyser' },
  'C2.2': { label: 'Organiser une opération de pesée',  axe: 'Organiser' },
  'C3.1': { label: 'Utiliser une balance électronique', axe: 'Réaliser' },
  'C3.4': { label: 'Relever une mesure métrologique',   axe: 'Réaliser' },
  'C4.1': { label: 'Tenir l\'inventaire F-Gas',         axe: 'Maintenir' },
  'C4.2': { label: 'Calculer un équivalent CO₂',        axe: 'Maintenir' },
  'C5.2': { label: 'Saisir une donnée numérique',       axe: 'Communiquer' }
};

// ==========================================================================
// BARÈME DE NOTATION (sur 20) — avec rattachement compétence
// ==========================================================================
const BAREME = {
  marque:         { pts: 2, comp: 'C1.3', label: 'Marque'                      },
  numSerie:       { pts: 2, comp: 'C4.1', label: 'N° de série'                 },
  type:           { pts: 2, comp: 'C1.3', label: 'Type de bouteille'           },
  capacite:       { pts: 1, comp: 'C1.3', label: 'Capacité (L)'                },
  fluide:         { pts: 2, comp: 'C1.3', label: 'Fluide étiquette'            },
  tare_kg:        { pts: 2, comp: 'C3.4', label: 'Tare gravée relevée'         },
  masse_brute_kg: { pts: 2, comp: 'C3.1', label: 'Masse brute pesée'           },
  masse_nette_kg: { pts: 4, comp: 'C3.4', label: 'Calcul masse nette'          },
  tCO2eq:         { pts: 3, comp: 'C4.2', label: 'Calcul tCO2eq'               }
  //              ----
  //          TOTAL 20
};

// Expose global (navigator)
window.FLUIDES = FLUIDES;
window.MARQUES = MARQUES;
window.TYPES_BOUTEILLE = TYPES_BOUTEILLE;
window.CAPACITES = CAPACITES;
window.BOUTEILLES_REELLES = BOUTEILLES_REELLES;
window.TOLERANCES = TOLERANCES;
window.BAREME = BAREME;
window.COMPETENCES = COMPETENCES;
window.getFluide = getFluide;
window.getBouteille = getBouteille;
