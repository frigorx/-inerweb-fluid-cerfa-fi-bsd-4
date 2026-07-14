// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// Suite PURE du composant « conseil d'intervenant » (chantier B2,
// briques 3-4). Tourne une seule fois (non doublée) : aucune donnée de
// store, aucun DOM — préparation des données, verdicts de référence
// (Bachir / Pierre / mention CO₂) et encart HTML (classes + échappement).

import {
  habilitationsActivesDe,
  mentionsActivesDe,
  verdictPourIntervenant,
  encartConseil
} from './conseil-intervenant.js';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

console.log('\n=== Conseil d’intervenant (composant pur) ===\n');

// --- Préparation des données ---------------------------------------
const HABILITATIONS = [
  { id: 'h1', personneId: 'per-bachir', regime: '2025', categorie: 'E', actif: true },
  { id: 'h2', personneId: 'per-pierre', regime: '2025', categorie: 'D', actif: true },
  { id: 'h3', personneId: 'per-pierre', regime: '2025', categorie: 'A1', actif: false },
  { id: 'h4', personneId: 'per-ancien', regime: '2008', categorie: 'I', actif: true }
];
const MENTIONS = [
  { id: 'm1', personneId: 'per-ancien', fluideMention: 'CO2', actif: true },
  { id: 'm2', personneId: 'per-ancien', fluideMention: 'NH3', actif: false },
  { id: 'm3', personneId: 'per-bachir', fluideMention: 'HC', actif: true }
];

verifier('habilitationsActivesDe : filtre par personne ET actif',
  habilitationsActivesDe('per-pierre', HABILITATIONS).length === 1
  && habilitationsActivesDe('per-pierre', HABILITATIONS)[0].categorie === 'D');
verifier('habilitationsActivesDe : robuste à une liste absente',
  habilitationsActivesDe('per-pierre', null).length === 0);
verifier('mentionsActivesDe : jetons actifs de la personne seulement',
  mentionsActivesDe('per-ancien', MENTIONS).join(',') === 'CO2');
verifier('mentionsActivesDe : robuste à une liste absente',
  mentionsActivesDe('per-ancien', undefined).length === 0);

// --- Verdicts de référence (les cas de Franck) ----------------------
const bachir = { id: 'per-bachir', prenom: 'Bachir', nom: 'Essai' };
const pierre = { id: 'per-pierre', prenom: 'Pierre', nom: 'Essai' };
const ancien = { id: 'per-ancien', prenom: 'Un', nom: 'Ancien' };

// Bachir (E) sur une machine HFC : synthèse = étanchéité uniquement.
const vBachir = verdictPourIntervenant({
  personne: bachir, habilitations: HABILITATIONS, mentions: MENTIONS,
  machine: { fluide: 'R-410A', chargeNominaleKg: 10 }, operation: null
});
verifier('Bachir (E) : synthèse « étanchéité uniquement » (conseil, autorisé)',
  vBachir.autorise === true && vBachir.gravite === 'CONSEIL'
  && vBachir.conseil === 'Contrôle d’étanchéité uniquement : pas de manipulation du circuit.');

// Pierre (D, ≤ 3 kg) : récupération sur une installation de 10 kg → refus.
const vPierre = verdictPourIntervenant({
  personne: pierre, habilitations: HABILITATIONS, mentions: MENTIONS,
  machine: { fluide: 'R-410A', chargeNominaleKg: 10 },
  operation: 'RECUPERATION_MAINTENANCE'
});
verifier('Pierre (D) sur 10 kg : REFUS au message exact',
  vPierre.autorise === false && vPierre.gravite === 'REFUS'
  && vPierre.conseil === 'Récupération limitée à 3 kg : cette installation en contient 10 kg, vous ne pouvez pas.');

// Le cas Pierre dès la FICHE machine (synthèse, sans opération choisie) :
// la charge de l'installation écarte le profil D (constat de revue).
const vPierreSynthese = verdictPourIntervenant({
  personne: pierre, habilitations: HABILITATIONS, mentions: MENTIONS,
  machine: { fluide: 'R-410A', chargeNominaleKg: 10 }, operation: null
});
verifier('Pierre (D) en SYNTHÈSE sur 10 kg : REFUS aussi (fiche machine)',
  vPierreSynthese.autorise === false && vPierreSynthese.gravite === 'REFUS');

// L'ancien I + mention CO₂ : maintenance sur une machine R-744 → autorisé.
const vAncienCo2 = verdictPourIntervenant({
  personne: ancien, habilitations: HABILITATIONS, mentions: MENTIONS,
  machine: { fluide: 'R-744', chargeNominaleKg: 8 }, operation: 'CHARGE_APPOINT'
});
verifier('I (2008) + mention CO₂ active : intervention sur R-744 autorisée',
  vAncienCo2.autorise === true);

// Le même SANS sa mention (NH₃ révoquée) sur une machine ammoniac → refus ciblé.
const vAncienNh3 = verdictPourIntervenant({
  personne: ancien, habilitations: HABILITATIONS, mentions: MENTIONS,
  machine: { fluide: 'R-717', chargeNominaleKg: 8 }, operation: 'CHARGE_APPOINT'
});
verifier('mention NH₃ révoquée : intervention sur R-717 refusée + conseil formation',
  vAncienNh3.autorise === false
  && vAncienNh3.conseil.includes('formation complémentaire ammoniac'));

// Sans machine : synthèse générale de compétence.
const vSansMachine = verdictPourIntervenant({
  personne: ancien, habilitations: HABILITATIONS, mentions: MENTIONS,
  machine: null, operation: null
});
verifier('sans machine : synthèse générale (autorisé, jamais un refus aveugle)',
  vSansMachine.autorise === true);

// Charge nominale non numérique : pas de NaN (chargeKg neutralisé).
const vChargeFolle = verdictPourIntervenant({
  personne: pierre, habilitations: HABILITATIONS, mentions: MENTIONS,
  machine: { fluide: 'R-410A', chargeNominaleKg: 'douze' },
  operation: 'RECUPERATION_MAINTENANCE'
});
verifier('chargeNominaleKg non numérique : verdict rendu sans NaN',
  typeof vChargeFolle.conseil === 'string' && !vChargeFolle.conseil.includes('NaN'));

// Charge nominale null (colonne SQL nullable) : contrôle de charge
// NEUTRALISÉ — surtout pas un faux refus « en contient 0 kg ».
const vChargeNulle = verdictPourIntervenant({
  personne: pierre, habilitations: HABILITATIONS, mentions: MENTIONS,
  machine: { fluide: 'R-410A', chargeNominaleKg: null },
  operation: 'RECUPERATION_MAINTENANCE'
});
verifier('chargeNominaleKg null : pas de faux refus (limite non contrôlable)',
  vChargeNulle.autorise === true);

// --- Validité par date de référence (échéances) ----------------------
const HABS_DATEES = [
  { id: 'hd1', personneId: 'per-date', regime: '2025', categorie: 'A1',
    actif: true, dateFin: '2025-12-31' }
];
const MENTIONS_DATEES = [
  { id: 'md1', personneId: 'per-date', fluideMention: 'CO2',
    actif: true, dateFin: '2025-12-31' }
];
const personneDate = { id: 'per-date', prenom: 'Écheu', nom: 'Essai' };
const vEchue = verdictPourIntervenant({
  personne: personneDate, habilitations: HABS_DATEES, mentions: MENTIONS_DATEES,
  machine: null, operation: null, dateReference: '2026-07-14'
});
verifier('habilitation/mention ÉCHUES à la date de référence : écartées (refus)',
  vEchue.autorise === false && vEchue.gravite === 'REFUS');
const vEncoreValide = verdictPourIntervenant({
  personne: personneDate, habilitations: HABS_DATEES, mentions: MENTIONS_DATEES,
  machine: null, operation: null, dateReference: '2025-06-01'
});
verifier('les mêmes AVANT l’échéance : prises en compte (autorisé)',
  vEncoreValide.autorise === true);
verifier('sans dateReference : comportement inchangé (pas de filtrage)',
  verdictPourIntervenant({
    personne: personneDate, habilitations: HABS_DATEES,
    mentions: MENTIONS_DATEES, machine: null, operation: null
  }).autorise === true);

// Personne sans rien : le moteur explique quoi faire.
const vPersonneVide = verdictPourIntervenant({
  personne: { id: 'per-neuf', prenom: 'Sans', nom: 'Rien' },
  habilitations: HABILITATIONS, mentions: MENTIONS,
  machine: null, operation: null
});
verifier('personne sans habilitation : REFUS + conseil vers l’administrateur',
  vPersonneVide.gravite === 'REFUS'
  && vPersonneVide.conseil.includes('administrateur'));

// --- Encart HTML -----------------------------------------------------
const encartOk = encartConseil(ancien, { gravite: 'OK', conseil: 'Tout va bien.' });
verifier('encart OK : classe conseil-intervenant-ok (vert succès)',
  encartOk.includes('conseil-intervenant-ok') && encartOk.includes('Tout va bien.'));

const encartConseilAmbre = encartConseil(bachir, vBachir);
verifier('encart CONSEIL : bandeau-avertissement + nom de la personne',
  encartConseilAmbre.includes('bandeau-avertissement')
  && encartConseilAmbre.includes('Bachir Essai'));

const encartRefus = encartConseil(pierre, vPierre);
verifier('encart REFUS : bandeau-erreur', encartRefus.includes('bandeau-erreur'));

const hostile = { id: 'x', prenom: '<script>alert(1)</script>', nom: '&"' };
const encartHostile = encartConseil(hostile,
  { gravite: 'REFUS', conseil: '<img src=x onerror=alert(2)>' });
verifier('encart : données hostiles ÉCHAPPÉES (aucune balise vivante)',
  !encartHostile.includes('<script>') && !encartHostile.includes('<img')
  && encartHostile.includes('&lt;script&gt;'));

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
