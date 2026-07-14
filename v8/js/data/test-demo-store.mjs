// ============================================================
// Mini-test du magasin de démonstration (exécution : node test-demo-store.mjs)
// Vérifie les invariants du monde fictif de la maquette validée.
// ============================================================

import { creerStore } from './datastore.js';
import { fmtKg, fmtKgSigne, fmtTeq, fmtDate, teqCO2, esc } from '../core/utils.js';

let nbOk = 0;
let nbEchecs = 0;

function verifier(libelle, condition, detail = '') {
  if (condition) {
    nbOk += 1;
    console.log(`  OK  ${libelle}`);
  } else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

const store = await creerStore();

// --- Statistiques -------------------------------------------
const stats = await store.getStats();
// Charges de démo ramenées sous la nominale (marge pour appoint) :
// M1 3,80 + M2 1,50 + M3 1,80 + M4 0,70 + M5 3,05 + M6 3,00 = 13,85 kg
verifier('chargeParcKg proche de 13,80–13,90',
  stats.chargeParcKg >= 13.80 && stats.chargeParcKg <= 13.90,
  `valeur = ${stats.chargeParcKg}`);
verifier('stockBouteillesKg === 31',
  Math.abs(stats.stockBouteillesKg - 31) < 1e-9,
  `valeur = ${stats.stockBouteillesKg}`);
verifier('teqCo2Parc entre 25,4 et 25,5',
  stats.teqCo2Parc >= 25.4 && stats.teqCo2Parc <= 25.5,
  `valeur = ${stats.teqCo2Parc}`);
verifier('nbMachines === 6', stats.nbMachines === 6);
verifier('nbBouteilles === 5', stats.nbBouteilles === 5);
verifier('nbFuites === 1', stats.nbFuites === 1);
verifier('tauxConformitePct === 67', stats.tauxConformitePct === 67,
  `valeur = ${stats.tauxConformitePct}`);
// IM-10 (Lot 2) : la fenêtre n'est plus codée en dur Févr.→Juil. —
// elle GLISSE et se termine au mois de la donnée la plus récente
// (dernier mouvement du monde de démo : 29/06/2026 → Janv.→Juin).
verifier('fluxMensuels : fenêtre glissante de 6 mois close sur Juin 2026',
  stats.fluxMensuels.length === 6 &&
  stats.fluxMensuels[0].mois === 'Janv.' &&
  stats.fluxMensuels[5].mois === 'Juin' &&
  stats.fluxMensuels[5].annee === 2026);

// --- Mouvements ---------------------------------------------
const mouvements = await store.getMouvements();
verifier('7 mouvements', mouvements.length === 7,
  `valeur = ${mouvements.length}`);
const triDesc = mouvements.every((mv, i) =>
  i === 0 || mouvements[i - 1].date >= mv.date);
verifier('mouvements triés date décroissante', triDesc);
verifier('dernier mouvement = FI-2026-0007 (+0,30 kg R-404A)',
  mouvements[0].numero === 'FI-2026-0007' &&
  Math.abs(mouvements[0].quantiteKg - 0.30) < 1e-9 &&
  mouvements[0].fluide === 'R-404A');

// --- Bilan 2026 ---------------------------------------------
const bilan = await store.getBilan(2026);
const sommeCharge = bilan.lignes.reduce((s, l) => s + l.chargeKg, 0);
const sommeRecup = bilan.lignes.reduce((s, l) => s + l.recupereKg, 0);
verifier('bilan 2026 : totaux cohérents avec les lignes',
  Math.abs(bilan.totalChargeKg - sommeCharge) < 1e-9 &&
  Math.abs(bilan.totalRecupereKg - sommeRecup) < 1e-9);
verifier('bilan 2026 : total chargé = somme des mouvements positifs (5,85 kg)',
  Math.abs(bilan.totalChargeKg - 5.85) < 1e-9,
  `valeur = ${bilan.totalChargeKg}`);
verifier('bilan 2026 : total récupéré = 0,15 kg',
  Math.abs(bilan.totalRecupereKg - 0.15) < 1e-9,
  `valeur = ${bilan.totalRecupereKg}`);
const enParcBilan = bilan.lignes.reduce((s, l) => s + l.enParcKg, 0);
verifier('bilan 2026 : en parc = charge du parc',
  Math.abs(enParcBilan - stats.chargeParcKg) < 1e-9);
const teqBilan = bilan.lignes.reduce((s, l) => s + l.teqCo2, 0);
verifier('bilan 2026 : CO₂ éq. = teq du parc',
  Math.abs(teqBilan - stats.teqCo2Parc) < 1e-9);

// --- Copies (pas de fuite de référence) ---------------------
const machinesA = await store.getMachines();
machinesA[0].chargeActuelleKg = 999;
const machinesB = await store.getMachines();
verifier('getMachines retourne des copies indépendantes',
  machinesB[0].chargeActuelleKg !== 999);

// --- Export / import ----------------------------------------
const exportJson = await store.exporterJSON();
verifier('exporterJSON → chaîne JSON', typeof exportJson === 'string' &&
  exportJson.includes('"machines"'));
verifier('importerJSON accepte son propre export',
  (await store.importerJSON(exportJson)) === true);
verifier('importerJSON rejette un texte invalide',
  (await store.importerJSON('{"pas":"valide"}')) === false);

// --- Habilitations du monde de démo (réserve B2, 14/07) ------
// Le monde fictif porte des habilitations/mentions cohérentes avec les
// fiches du personnel ; le PIÈGE documenté : les compléments d'import
// restent à VIDE (jamais le semis démo — un export ancien recevrait des
// aptitudes inventées, un registre étranger serait refusé en orphelin).
{
  const habilitations = await store.getHabilitations();
  const mentions = await store.getMentions();
  const idsPersonnel = new Set((await store.getPersonnel()).map((p) => p.id));

  verifier('monde démo : 2 habilitations semées, toutes actives',
    habilitations.length === 2 && habilitations.every((h) => h.actif === true));
  verifier('monde démo : semis cohérent avec les fiches (régime 2008, cat. I)',
    habilitations.every((h) => h.regime === '2008' && h.categorie === 'I'));
  verifier('monde démo : chaque habilitation référence une personne existante',
    habilitations.every((h) => idsPersonnel.has(h.personneId)));
  verifier('monde démo : 2 mentions semées (1 CO2 active, 1 HC révoquée datée)',
    mentions.length === 2
    && mentions.some((m) => m.fluideMention === 'CO2' && m.actif === true
      && m.dateRevocation === null)
    && mentions.some((m) => m.fluideMention === 'HC' && m.actif === false
      && /^\d{4}-\d{2}-\d{2}$/.test(m.dateRevocation)));
  verifier('monde démo : aucune alerte d’aptitude ajoutée par le semis',
    !(await store.getAlertes()).some((a) =>
      String(a.id).startsWith('alr-habilitation-')
      || String(a.id).startsWith('alr-mention-')));

  // Aller-retour : le semis passe les invariants d'import tels quels.
  const exporte = await store.exporterJSON();
  const jumeau = await creerStore();
  verifier('aller-retour : l’export du monde démo est réimportable',
    (await jumeau.importerJSON(exporte)) === true);
  verifier('aller-retour : les habilitations et mentions ont voyagé',
    (await jumeau.getHabilitations()).length === 2
    && (await jumeau.getMentions()).length === 2);

  // LE PIÈGE : un export SANS les clés B2 (antérieur au chantier) doit
  // être complété à VIDE, jamais depuis le semis du monde de démo.
  const paquet = JSON.parse(exporte);
  delete paquet.donnees.habilitations;
  delete paquet.donnees.mentionsHabilitation;
  delete paquet.donnees.mouvementOutillage;
  const cible = await creerStore();
  verifier('piège : import d’un export SANS clés B2 accepté',
    (await cible.importerJSON(JSON.stringify(paquet))) === true);
  verifier('piège : habilitations complétées à VIDE (jamais le semis démo)',
    (await cible.getHabilitations()).length === 0);
  verifier('piège : mentions complétées à VIDE (jamais le semis démo)',
    (await cible.getMentions()).length === 0);
}

// --- Utilitaires de formatage -------------------------------
// Les séparateurs fr-FR peuvent être des espaces insécables : on normalise.
const normaliser = (s) => s.replace(/ | /g, ' ');
verifier("fmtKg(4.2) → '4,20 kg'", normaliser(fmtKg(4.2)) === '4,20 kg',
  `valeur = ${fmtKg(4.2)}`);
verifier("fmtKgSigne(0.3) → '+ 0,30 kg'",
  normaliser(fmtKgSigne(0.3)) === '+ 0,30 kg');
verifier("fmtKgSigne(-0.15) → '− 0,15 kg' (U+2212)",
  normaliser(fmtKgSigne(-0.15)) === '− 0,15 kg',
  `valeur = ${fmtKgSigne(-0.15)}`);
verifier("fmtTeq(16.4724) → '16,47 t CO₂'",
  normaliser(fmtTeq(16.4724)) === '16,47 t CO₂');
verifier("fmtDate('2026-06-29') → '29/06/2026'",
  fmtDate('2026-06-29') === '29/06/2026');
verifier('teqCO2(4.2, 3922) = 16,4724',
  Math.abs(teqCO2(4.2, 3922) - 16.4724) < 1e-9);
verifier("esc('<a b=\"c\">') échappe le HTML",
  esc('<a b="c">') === '&lt;a b=&quot;c&quot;&gt;');

// --- Verdict -------------------------------------------------
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Tous les tests passent.');
