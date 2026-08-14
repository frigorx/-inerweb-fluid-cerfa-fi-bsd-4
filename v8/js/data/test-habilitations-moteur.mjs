// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// Tests UNITAIRES du moteur de CONSEIL verifierDroitIntervention (module pur).
// Aucun store, aucune horloge. Tourne une seule fois (non doublé).
// Matrice §2 validée fonctionnellement par Franck (cas Bachir/Pierre).

import {
  verifierDroitIntervention as v,
  familleDuFluide,
  operationNormalisee,
  estIntervenantIdentifiable
} from './habilitations.js';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}
const grav = (e) => v(e).gravite;
const H = (regime, categorie) => ({ regime, categorie });

// --- A1 / A2 (2025) : opérations + seuils ------------------------
verifier('A1 · mise en service · HFC · 12 kg → OK',
  grav({ habilitations: [H('2025', 'A1')], operation: 'MISE_EN_SERVICE', familleFluide: 'HFC', chargeKg: 12 }) === 'OK');
verifier('A2 · appoint · HFC · 2 kg → CONSEIL (limite 3)',
  grav({ habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 2 }) === 'CONSEIL');
verifier('A2 · appoint · HFC · 5 kg → REFUS (> 3 kg)',
  grav({ habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 5 }) === 'REFUS');
verifier('A2 · hermétique scellé · 5 kg → CONSEIL (limite 6)',
  grav({ habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 5, hermetiqueScelle: true }) === 'CONSEIL');
verifier('A2 · hermétique scellé · 8 kg → REFUS (> 6 kg)',
  grav({ habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 8, hermetiqueScelle: true }) === 'REFUS');

// --- B (CO2) / C (NH3) : fluide dédié ----------------------------
verifier('B · appoint · CO2 · 40 kg → OK',
  grav({ habilitations: [H('2025', 'B')], operation: 'CHARGE_APPOINT', familleFluide: 'CO2', chargeKg: 40 }) === 'OK');
verifier('B · maintenance · HFC → REFUS (fluide hors champ)',
  grav({ habilitations: [H('2025', 'B')], operation: 'MAINTENANCE', familleFluide: 'HFC' }) === 'REFUS');
verifier('C · maintenance · NH3 → OK',
  grav({ habilitations: [H('2025', 'C')], operation: 'MAINTENANCE', familleFluide: 'NH3' }) === 'OK');
verifier('C · maintenance · CO2 → REFUS (fluide hors champ)',
  grav({ habilitations: [H('2025', 'C')], operation: 'MAINTENANCE', familleFluide: 'CO2' }) === 'REFUS');

// --- D (récupération seule) — CAS PIERRE -------------------------
verifier('D · récupération · HFC · 2 kg → CONSEIL (dans la limite)',
  grav({ habilitations: [H('2025', 'D')], operation: 'RECUPERATION_MAINTENANCE', familleFluide: 'HFC', chargeKg: 2 }) === 'CONSEIL');
{
  const pierre = v({ habilitations: [H('2025', 'D')], operation: 'RECUPERATION_DEMANTELEMENT', familleFluide: 'HFC', chargeKg: 10 });
  verifier('PIERRE : D · démantèlement · 10 kg → REFUS', pierre.gravite === 'REFUS');
  verifier('PIERRE : message exact « contient 10 kg, vous ne pouvez pas »',
    /limitée à 3 kg/.test(pierre.conseil) && /contient 10 kg, vous ne pouvez pas/.test(pierre.conseil),
    pierre.conseil);
}
verifier('D · appoint · HFC → REFUS (récupération seule)',
  grav({ habilitations: [H('2025', 'D')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC' }) === 'REFUS');

// --- E (étanchéité seule) — CAS BACHIR ---------------------------
{
  const bachir = v({ habilitations: [H('2025', 'E')], operation: null, familleFluide: 'HFC' });
  verifier('BACHIR : E · synthèse · HFC → CONSEIL', bachir.gravite === 'CONSEIL');
  verifier('BACHIR : message exact « Contrôle d’étanchéité uniquement »',
    bachir.motif === 'Contrôle d’étanchéité uniquement'
    && /pas de manipulation du circuit/.test(bachir.conseil), bachir.conseil);
}
verifier('E · contrôle d’étanchéité · HFC → OK',
  grav({ habilitations: [H('2025', 'E')], operation: 'CONTROLE_ETANCHEITE', familleFluide: 'HFC' }) === 'OK');
verifier('E · appoint · HFC → REFUS (étanchéité seule)',
  grav({ habilitations: [H('2025', 'E')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC' }) === 'REFUS');

// --- V (véhicules) ----------------------------------------------
verifier('V · mise en service · VEHICULE → OK',
  grav({ habilitations: [H('2025', 'V')], operation: 'MISE_EN_SERVICE', familleFluide: 'VEHICULE' }) === 'OK');
verifier('V · maintenance · HFC → REFUS (V ne couvre que le véhicule)',
  grav({ habilitations: [H('2025', 'V')], operation: 'MAINTENANCE', familleFluide: 'HFC' }) === 'REFUS');
verifier('A1 · mise en service · VEHICULE → REFUS (catégorie V requise)',
  grav({ habilitations: [H('2025', 'A1')], operation: 'MISE_EN_SERVICE', familleFluide: 'VEHICULE' }) === 'REFUS');

// --- Ancien régime 2008 (via correspondance) --------------------
verifier('I(2008) · mise en service · HFC · 12 kg → OK (traité A1)',
  grav({ habilitations: [H('2008', 'I')], operation: 'MISE_EN_SERVICE', familleFluide: 'HFC', chargeKg: 12 }) === 'OK');
verifier('III(2008) · récupération · HFC · 10 kg → REFUS (limite 2 kg)',
  grav({ habilitations: [H('2008', 'III')], operation: 'RECUPERATION_MAINTENANCE', familleFluide: 'HFC', chargeKg: 10 }) === 'REFUS');
verifier('III(2008) · récupération · 2 kg PILE → REFUS (frontière stricte 2008)',
  grav({ habilitations: [H('2008', 'III')], operation: 'RECUPERATION_MAINTENANCE', familleFluide: 'HFC', chargeKg: 2 }) === 'REFUS');
verifier('III(2008) · récupération · 1,9 kg → CONSEIL (sous la limite 2008)',
  grav({ habilitations: [H('2008', 'III')], operation: 'RECUPERATION_MAINTENANCE', familleFluide: 'HFC', chargeKg: 1.9 }) === 'CONSEIL');
verifier('IV(2008) · synthèse · HFC → CONSEIL (étanchéité uniquement)',
  grav({ habilitations: [H('2008', 'IV')], operation: null, familleFluide: 'HFC' }) === 'CONSEIL');

// --- MENTIONS de formation complémentaire par fluide ------------
verifier('IV(2008) + mention CO2 · contrôle · CO2 → OK (fluide étendu, étanchéité)',
  grav({ habilitations: [H('2008', 'IV')], mentions: ['CO2'], operation: 'CONTROLE', familleFluide: 'CO2' }) === 'OK');
verifier('IV(2008) + mention CO2 · appoint · CO2 → REFUS (fluide OK mais étanchéité seule)',
  grav({ habilitations: [H('2008', 'IV')], mentions: ['CO2'], operation: 'CHARGE_APPOINT', familleFluide: 'CO2' }) === 'REFUS');
verifier('I(2008) + mention CO2 · appoint · CO2 · 20 kg → OK (ops via corr. + fluide via mention)',
  grav({ habilitations: [H('2008', 'I')], mentions: ['CO2'], operation: 'CHARGE_APPOINT', familleFluide: 'CO2', chargeKg: 20 }) === 'OK');
verifier('I(2008) sans mention · maintenance · CO2 → REFUS (fluide hors champ)',
  grav({ habilitations: [H('2008', 'I')], operation: 'MAINTENANCE', familleFluide: 'CO2' }) === 'REFUS');
verifier('I(2008) sans mention · maintenance · HC → REFUS (natif 2008 = HFC/HFO seul)',
  grav({ habilitations: [H('2008', 'I')], operation: 'MAINTENANCE', familleFluide: 'HC' }) === 'REFUS');
verifier('I(2008) + mention HC · maintenance · HC → OK',
  grav({ habilitations: [H('2008', 'I')], mentions: ['HC'], operation: 'MAINTENANCE', familleFluide: 'HC' }) === 'OK');
verifier('A1(2025) sans mention · maintenance · HC → OK (HC natif en 2025)',
  grav({ habilitations: [H('2025', 'A1')], operation: 'MAINTENANCE', familleFluide: 'HC' }) === 'OK');
verifier('E(2025) + mention CO2 · synthèse · CO2 → CONSEIL (étanchéité, sur CO₂)',
  grav({ habilitations: [H('2025', 'E')], mentions: ['CO2'], operation: null, familleFluide: 'CO2' }) === 'CONSEIL');

// --- Cumul de catégories ----------------------------------------
verifier('A2 + D · récupération · HFC · 5 kg → REFUS (les deux limités à 3 kg)',
  grav({ habilitations: [H('2025', 'A2'), H('2025', 'D')], operation: 'RECUPERATION_MAINTENANCE', familleFluide: 'HFC', chargeKg: 5 }) === 'REFUS');
verifier('A1 + E · maintenance · HFC · 12 kg → OK (A1 illimité domine)',
  grav({ habilitations: [H('2025', 'A1'), H('2025', 'E')], operation: 'MAINTENANCE', familleFluide: 'HFC', chargeKg: 12 }) === 'OK');

// --- Dérivation de famille + robustesse -------------------------
verifier('B · appoint · fluide R-744 sans familleFluide → OK (dérivée CO2)',
  grav({ habilitations: [H('2025', 'B')], operation: 'CHARGE_APPOINT', fluide: 'R-744', chargeKg: 5 }) === 'OK');
verifier('aucune habilitation → REFUS « Aucune habilitation enregistrée »',
  v({ habilitations: [] }).motif === 'Aucune habilitation enregistrée');
verifier('mention seule (sans habilitation) → REFUS',
  grav({ habilitations: [], mentions: ['CO2'], operation: 'MAINTENANCE', familleFluide: 'CO2' }) === 'REFUS');
verifier('entrée vide {} → REFUS (robustesse)', grav({}) === 'REFUS');
verifier('D · TRANSFERT · HFC · 2 kg → CONSEIL (transfert = récupération)',
  grav({ habilitations: [H('2025', 'D')], operation: 'TRANSFERT', familleFluide: 'HFC', chargeKg: 2 }) === 'CONSEIL');
verifier('opération inconnue → traitée MAINTENANCE (prudent)',
  operationNormalisee('XYZ_INCONNU') === 'MAINTENANCE');

// --- Déterminisme -----------------------------------------------
{
  const e = { habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 5 };
  verifier('déterminisme : deux appels identiques → sorties identiques',
    JSON.stringify(v(e)) === JSON.stringify(v(e)));
}

// --- Synthèse AVEC charge connue (constat de revue briques 3-4) ---
// La synthèse « qui intervient ? » sur une machine dont la charge est
// connue écarte les profils au-delà de leur limite : le cas Pierre doit
// apparaître dès la FICHE machine, pas seulement au choix d'une opération.
{
  const dSur10 = v({ habilitations: [H('2025', 'D')], operation: null,
    familleFluide: 'HFC', chargeKg: 10 });
  verifier('synthèse : D (≤ 3 kg) sur une installation de 10 kg → REFUS',
    dSur10.gravite === 'REFUS' && dSur10.autorise === false);
  verifier('synthèse : le refus nomme la limite ET la charge de l’installation',
    /limitent la manipulation à 3 kg/.test(dSur10.conseil)
    && /contient 10 kg, vous ne pouvez pas/.test(dSur10.conseil),
    dSur10.conseil);
}
verifier('synthèse : D sur une installation de 2 kg → CONSEIL (dans la limite)',
  grav({ habilitations: [H('2025', 'D')], operation: null,
    familleFluide: 'HFC', chargeKg: 2 }) === 'CONSEIL');
{
  // Cumul A2 (≤ 3 kg) + E (étanchéité, sans limite : ne manipule pas) sur
  // 10 kg : la manipulation tombe, l'étanchéité SURVIT.
  const a2e = v({ habilitations: [H('2025', 'A2'), H('2025', 'E')],
    operation: null, familleFluide: 'HFC', chargeKg: 10 });
  verifier('synthèse : A2 + E sur 10 kg → il reste le contrôle d’étanchéité',
    a2e.autorise === true && /étanchéité uniquement/i.test(a2e.conseil),
    a2e.conseil);
}
verifier('synthèse sans chargeKg : comportement INCHANGÉ (pas de refus fabriqué)',
  grav({ habilitations: [H('2025', 'D')], operation: null,
    familleFluide: 'HFC' }) === 'CONSEIL');

// --- Cohérence des écrans (revue L1, 24/07) : le profil dépassé DÉGRADE ---
// Un titulaire limité sur une machine trop chargée garde son droit de
// CONTRÔLER (l'étanchéité ne manipule pas le circuit) : la synthèse de la
// fiche machine doit dire la même chose que le verdict d'opération du
// wizard — plus jamais REFUS d'un côté et « autorisé » de l'autre.
{
  const syntheseII = v({ habilitations: [H('2008', 'II')], operation: null,
    familleFluide: 'HFC', chargeKg: 10 });
  verifier('synthèse : II(2008) seul sur 10 kg → CONSEIL « étanchéité uniquement » (plus de REFUS)',
    syntheseII.autorise === true && /étanchéité uniquement/i.test(syntheseII.conseil),
    syntheseII.conseil);
  const opII = v({ habilitations: [H('2008', 'II')], operation: 'CONTROLE_PERIODIQUE',
    familleFluide: 'HFC', chargeKg: 10 });
  verifier('cohérence : le verdict d’opération CONTROLE dit la même chose (autorisé)',
    opII.autorise === true && opII.gravite === 'OK');
}
{
  const syntheseA2 = v({ habilitations: [H('2025', 'A2')], operation: null,
    familleFluide: 'HFC', chargeKg: 10 });
  verifier('synthèse : A2 seul sur 10 kg → CONSEIL « étanchéité uniquement »',
    syntheseA2.autorise === true && /étanchéité uniquement/i.test(syntheseA2.conseil),
    syntheseA2.conseil);
}
verifier('synthèse : D seul sur 10 kg → REFUS conservé (la récupération ne porte pas l’étanchéité)',
  grav({ habilitations: [H('2025', 'D')], operation: null,
    familleFluide: 'HFC', chargeKg: 10 }) === 'REFUS');
verifier('verdict d’opération : le libellé dit « charge de l’installation »',
  /charge de l'installation 2 kg/.test(
    v({ habilitations: [H('2025', 'D')], operation: 'RECUPERATION_MAINTENANCE',
      familleFluide: 'HFC', chargeKg: 2 }).conseil));

// --- Frontières STRICTES de charge (P0-5, audit 20/07 §4.3) -------
// Le texte dit charge « INFÉRIEURE À » 3 kg (6 kg hermétique scellé) :
// la valeur pile est REFUSÉE. Ces cas manquaient — le bug de comparateurs
// (`<=`/`>` au lieu de `<`/`>=`) vivait exactement hors de la couverture.
verifier('A2 · appoint · 2,999 kg → CONSEIL (strictement sous la limite)',
  grav({ habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 2.999 }) === 'CONSEIL');
verifier('A2 · appoint · 3 kg PILE → REFUS (« inférieure à 3 kg »)',
  grav({ habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 3 }) === 'REFUS');
verifier('A2 · hermétique scellé · 5,999 kg → CONSEIL',
  grav({ habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 5.999, hermetiqueScelle: true }) === 'CONSEIL');
verifier('A2 · hermétique scellé · 6 kg PILE → REFUS (« inférieure à 6 kg »)',
  grav({ habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 6, hermetiqueScelle: true }) === 'REFUS');
verifier('D · récupération · 3 kg PILE → REFUS (frontière stricte)',
  grav({ habilitations: [H('2025', 'D')], operation: 'RECUPERATION_MAINTENANCE', familleFluide: 'HFC', chargeKg: 3 }) === 'REFUS');
verifier('synthèse : D sur une installation de 3 kg PILE → REFUS (même frontière)',
  grav({ habilitations: [H('2025', 'D')], operation: null, familleFluide: 'HFC', chargeKg: 3 }) === 'REFUS');

// --- Contrôles P7 dans MAP_OPERATION (P0-5, trou corrigé) ---------
// Les types CONTROLE_PERIODIQUE / CONTROLE_NON_PERIODIQUE retombaient en
// MAINTENANCE (repli prudent) : un cat. E se voyait refuser un contrôle
// d'étanchéité — sa seule prérogative.
verifier('operationNormalisee(CONTROLE_PERIODIQUE) = ETANCHEITE',
  operationNormalisee('CONTROLE_PERIODIQUE') === 'ETANCHEITE');
verifier('operationNormalisee(CONTROLE_NON_PERIODIQUE) = ETANCHEITE',
  operationNormalisee('CONTROLE_NON_PERIODIQUE') === 'ETANCHEITE');
verifier('E · CONTROLE_PERIODIQUE · HFC → OK (le contrôleur contrôle)',
  grav({ habilitations: [H('2025', 'E')], operation: 'CONTROLE_PERIODIQUE', familleFluide: 'HFC' }) === 'OK');

// --- Ancienne catégorie II : charge LIMITÉE À 2 kg (L1a / Q2, 24/07) ------
// Historique : modélisée sans limite (relevé par l'audit du 20/07 §4.3),
// puis à 3 kg comme l'A2 (P0-5). L'arrêté du 13/10/2008 borne les opérations
// avec accès au circuit à MOINS DE 2 kg, SANS variante hermétique (le 6 kg
// est une règle du régime 2025). La I reste sans limite.
verifier('II(2008) · appoint · HFC · 1,5 kg → CONSEIL (sous la limite 2008)',
  grav({ habilitations: [H('2008', 'II')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 1.5 }) === 'CONSEIL');
verifier('II(2008) · appoint · HFC · 1,999 kg → CONSEIL (strictement sous 2)',
  grav({ habilitations: [H('2008', 'II')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 1.999 }) === 'CONSEIL');
verifier('II(2008) · appoint · 2 kg PILE → REFUS (« moins de 2 kg », strict)',
  grav({ habilitations: [H('2008', 'II')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 2 }) === 'REFUS');
{
  const ii = v({ habilitations: [H('2008', 'II')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 10 });
  verifier('II(2008) · appoint · 10 kg → REFUS, le message nomme la limite de 2 kg',
    ii.gravite === 'REFUS' && /limitée à 2 kg/.test(ii.conseil), ii.conseil);
}
verifier('II(2008) · HERMÉTIQUE scellé · 5 kg → REFUS (aucune variante 6 kg en 2008)',
  grav({ habilitations: [H('2008', 'II')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 5, hermetiqueScelle: true }) === 'REFUS');
verifier('II(2008) · HERMÉTIQUE scellé · 2 kg PILE → REFUS (l’hermétique ne change rien)',
  grav({ habilitations: [H('2008', 'II')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 2, hermetiqueScelle: true }) === 'REFUS');
verifier('II(2008) · HERMÉTIQUE scellé · 1,5 kg → CONSEIL (sous 2 kg, hermétique indifférent)',
  grav({ habilitations: [H('2008', 'II')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 1.5, hermetiqueScelle: true }) === 'CONSEIL');
verifier('II(2008) · contrôle d’étanchéité · 300 kg → OK (sans limite : pas d’ouverture du circuit)',
  grav({ habilitations: [H('2008', 'II')], operation: 'CONTROLE_ETANCHEITE', familleFluide: 'HFC', chargeKg: 300 }) === 'OK');
verifier('I(2008) · appoint · 10 kg → OK (la I reste sans limite)',
  grav({ habilitations: [H('2008', 'I')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 10 }) === 'OK');

// --- Découplage des régimes : 2008 ≠ 2025 (le piège du seuil global) ------
// Preuve que la limite est bien PAR CATÉGORIE : la même charge de 2,5 kg
// est REFUSÉE à une cat. II (2008, < 2 kg) et ACCORDÉE à une A2 (2025,
// < 3 kg) — et l'élargissement hermétique reste réservé au régime 2025.
verifier('découplage : 2,5 kg → REFUS pour II(2008)…',
  grav({ habilitations: [H('2008', 'II')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 2.5 }) === 'REFUS');
verifier('découplage : … et CONSEIL pour A2(2025) sur la même machine',
  grav({ habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 2.5 }) === 'CONSEIL');
verifier('découplage : A2 hermétique garde ses 6 kg (5 kg → CONSEIL)',
  grav({ habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 5, hermetiqueScelle: true }) === 'CONSEIL');
verifier('cumul II(2008)+A2(2025) · 2,5 kg → CONSEIL (le meilleur profil domine, limite 3)',
  grav({ habilitations: [H('2008', 'II'), H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg: 2.5 }) === 'CONSEIL');

// --- Identifiabilité (règle admin) ------------------------------
verifier('identifiable : actif + 1 habilitation active → oui',
  estIntervenantIdentifiable({ actif: true }, [H('2025', 'A1')], []) === true);
verifier('identifiable : inactif → non',
  estIntervenantIdentifiable({ actif: false }, [H('2025', 'A1')], []) === false);
verifier('identifiable : actif mais 0 habilitation / 0 mention → non',
  estIntervenantIdentifiable({ actif: true }, [], []) === false);
verifier('identifiable : actif + mention seule → oui',
  estIntervenantIdentifiable({ actif: true }, [], [{ fluideMention: 'CO2' }]) === true);

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
