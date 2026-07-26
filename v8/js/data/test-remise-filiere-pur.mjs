// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test du MODULE PUR « remise en filière » (lot B2) + PARITÉ stricte
// avec son miroir CommonJS server/remise-filiere.js.
// Exécution : node v8/js/data/test-remise-filiere-pur.mjs
//
// Ce que ça prouve :
//   — la forme canonique du numéro de suivi INTERNE (SIF-AAAA-NNNN)
//     et le refus de tout autre libellé (attaque tirée : « numéro
//     fantaisiste accepté ») ;
//   — l'unicité insensible à la casse et aux espaces (sans quoi elle
//     se contourne d'une majuscule) ;
//   — la numérotation LOCALE, sans réseau, reprise là où le registre
//     importé s'était arrêté ;
//   — l'invariant d'import (doublon refusé, forme NON exigée : un
//     registre antérieur reste reprenable) ;
//   — PARITÉ ESM ↔ CommonJS sur chaque fonction et chaque message.
// ============================================================

import { createRequire } from 'node:module';
import {
  PREFIXE_NUMERO_SUIVI, FORME_NUMERO_SUIVI, MSG_NUMERO_SUIVI_FORME,
  msgNumeroSuiviDoublon, cleNumeroSuivi, prochainNumeroSuivi,
  verifierNumeroSuivi, problemeNumerosSuivi, ecartApresRemise,
  TOLERANCE_REMISE_KG
} from './remise-filiere.js';

const require = createRequire(import.meta.url);
const miroir = require('../../../server/remise-filiere.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

console.log('\n--- A. Clé de comparaison ---');
verifier('bords, espaces internes et casse sont neutralisés',
  cleNumeroSuivi('  sif-2026-0001  ') === 'SIF-2026-0001'
  && cleNumeroSuivi('SIF  2026') === 'SIF 2026');
verifier('absence → chaîne vide (jamais « null » ni « undefined »)',
  cleNumeroSuivi(null) === '' && cleNumeroSuivi(undefined) === '');

console.log('\n--- B. Forme canonique ---');
verifier('SIF-2026-0001 accepté', verifierNumeroSuivi('SIF-2026-0001', []) === null);
verifier('minuscules acceptées (normalisées)',
  verifierNumeroSuivi('sif-2026-0001', []) === null);
for (const mauvais of ['', '   ', 'BSFF-2026-0001', 'SIF-26-0001',
  'SIF-2026-1', 'SIF-2026-00011', 'FF-2026-000123', '<script>',
  'SIF-2026-0001 bis']) {
  verifier(`refusé : « ${mauvais} »`,
    verifierNumeroSuivi(mauvais, []) === MSG_NUMERO_SUIVI_FORME);
}
verifier('le message de forme renvoie l’utilisateur vers le bon champ',
  MSG_NUMERO_SUIVI_FORME.includes('bordereau dématérialisé officiel'));

console.log('\n--- C. Unicité ---');
verifier('doublon exact refusé',
  verifierNumeroSuivi('SIF-2026-0001', ['SIF-2026-0001'])
  === msgNumeroSuiviDoublon('SIF-2026-0001'));
verifier('doublon à la casse près refusé (contournement fermé)',
  verifierNumeroSuivi('sif-2026-0001', ['  SIF-2026-0001 '])
  === msgNumeroSuiviDoublon('SIF-2026-0001'));
verifier('numéro libre accepté malgré des voisins',
  verifierNumeroSuivi('SIF-2026-0002', ['SIF-2026-0001']) === null);

console.log('\n--- D. Numérotation locale ---');
verifier('registre vide → premier rang',
  prochainNumeroSuivi([], 2026) === 'SIF-2026-0001');
verifier('reprend au rang maximal + 1 (ordre indifférent)',
  prochainNumeroSuivi(['SIF-2026-0003', 'SIF-2026-0001'], 2026)
  === 'SIF-2026-0004');
verifier('les numéros d’une AUTRE année ne comptent pas',
  prochainNumeroSuivi(['SIF-2025-0042'], 2026) === 'SIF-2026-0001');
verifier('un numéro étranger au format est ignoré, jamais fatal',
  prochainNumeroSuivi(['ancien-42', null, undefined], 2026)
  === 'SIF-2026-0001');
verifier('le rang déborde proprement au-delà de 9999',
  prochainNumeroSuivi(['SIF-2026-9999'], 2026) === 'SIF-2026-10000');
verifier('préfixe et forme exportés cohérents',
  PREFIXE_NUMERO_SUIVI === 'SIF'
  && FORME_NUMERO_SUIVI.test(prochainNumeroSuivi([], 2026)));

console.log('\n--- E. Invariant d’import ---');
verifier('aucun doublon → null',
  problemeNumerosSuivi([{ numeroBsff: 'SIF-2026-0001' },
    { numeroBsff: 'SIF-2026-0002' }]) === null);
verifier('doublon (casse comprise) dénoncé',
  problemeNumerosSuivi([{ numeroBsff: 'SIF-2026-0001' },
    { numeroBsff: 'sif-2026-0001' }])
  === 'suivi de remise en filière SIF-2026-0001 : numéro en double');
verifier('une FORME ancienne reste importable (on reprend la réalité)',
  problemeNumerosSuivi([{ numeroBsff: 'BSFF-2023-17' }]) === null);
verifier('numéros absents ignorés (aucun faux doublon sur le vide)',
  problemeNumerosSuivi([{ numeroBsff: null }, { numeroBsff: '' }, {}])
  === null);

console.log('\n--- E bis. Écart après remise en filière ---');
{
  const B = { id: 'bou-1', masseNetteKg: 5 };
  const suivis = [
    { bouteilleId: 'bou-1', numeroBsff: 'SIF-2026-0001',
      dateRemise: '2026-07-24', masseBouteilleApresKg: 5 }
  ];
  verifier('bouteille au repère : aucun écart',
    ecartApresRemise(B, suivis, []) === null);
  verifier('bouteille re-gonflée sans écriture : écart chiffré',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 10 }, suivis, [])
      ?.gainKg === 5);
  verifier('le tirage cite le suivi et la date du repère',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 10 }, suivis, [])
      ?.numeroSuivi === 'SIF-2026-0001');
  verifier('une récupération VALIDE postérieure EXPLIQUE le gain (aucune alerte)',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 8 }, suivis, [
      { statut: 'VALIDE', date: '2026-07-25', bouteilleDstId: 'bou-1',
        quantiteKg: -3 }
    ]) === null);
  verifier('un BROUILLON n’explique rien (l’écart tient)',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 8 }, suivis, [
      { statut: 'BROUILLON', date: '2026-07-25', bouteilleDstId: 'bou-1',
        quantiteKg: -3 }
    ])?.gainKg === 3);
  verifier('une écriture ANTÉRIEURE à la remise n’explique rien',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 8 }, suivis, [
      { statut: 'VALIDE', date: '2026-07-01', bouteilleDstId: 'bou-1',
        quantiteKg: -3 }
    ])?.gainKg === 3);
  verifier('une écriture vers une AUTRE bouteille n’explique rien',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 8 }, suivis, [
      { statut: 'VALIDE', date: '2026-07-25', bouteilleDstId: 'bou-2',
        quantiteKg: -3 }
    ])?.gainKg === 3);
  verifier('une charge SORTANTE postérieure creuse l’écart au lieu de le combler',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 8 }, suivis, [
      { statut: 'VALIDE', date: '2026-07-25', bouteilleSrcId: 'bou-1',
        quantiteKg: 2 }
    ])?.gainKg === 5);
  // ⚠ Le SIGNE ne dit pas le sens : le TRANSFERT est enregistré POSITIF
  // (demo-store.js « mouvement.quantiteKg = quantite »), la RÉCUPÉRATION
  // NÉGATIVE. Un transfert entrant valide — regroupement de déchets avant
  // enlèvement — était accusé d'être un gain inexpliqué.
  verifier('un TRANSFERT ENTRANT valide explique le gain (aucune accusation)',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 7 }, suivis, [
      { statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-25',
        bouteilleSrcId: 'bou-2', bouteilleDstId: 'bou-1', quantiteKg: 2 }
    ]) === null);
  verifier('un transfert entrant n’explique QUE sa quantité (le reste tient)',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 9 }, suivis, [
      { statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-25',
        bouteilleSrcId: 'bou-2', bouteilleDstId: 'bou-1', quantiteKg: 2 }
    ])?.gainKg === 2);
  verifier('un TRANSFERT SORTANT creuse l’écart (la bouteille se vide)',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 5 }, suivis, [
      { statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-25',
        bouteilleSrcId: 'bou-1', bouteilleDstId: 'bou-2', quantiteKg: 2 }
    ])?.gainKg === 2);
  // Annulation : l'originale passe ANNULE, la contre-écriture (même type,
  // quantité opposée) est VALIDE. Les deux doivent se neutraliser — sinon
  // une annulation invente un écart, ou en efface un vrai.
  verifier('récupération ANNULÉE + contre-écriture : effet net nul',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 5 }, suivis, [
      { statut: 'ANNULE', type: 'RECUPERATION_MAINTENANCE',
        date: '2026-07-25', bouteilleDstId: 'bou-1', quantiteKg: -3 },
      { statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
        date: '2026-07-26', bouteilleDstId: 'bou-1', quantiteKg: 3 }
    ]) === null);
  verifier('transfert entrant ANNULÉ + contre-écriture : effet net nul',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 5 }, suivis, [
      { statut: 'ANNULE', type: 'TRANSFERT', date: '2026-07-25',
        bouteilleSrcId: 'bou-2', bouteilleDstId: 'bou-1', quantiteKg: 2 },
      { statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-26',
        bouteilleSrcId: 'bou-2', bouteilleDstId: 'bou-1', quantiteKg: -2 }
    ]) === null);
  verifier('une annulation n’efface pas un écart réel (le gonflage reste vu)',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 12 }, suivis, [
      { statut: 'ANNULE', type: 'TRANSFERT', date: '2026-07-25',
        bouteilleSrcId: 'bou-2', bouteilleDstId: 'bou-1', quantiteKg: 2 },
      { statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-26',
        bouteilleSrcId: 'bou-2', bouteilleDstId: 'bou-1', quantiteKg: -2 }
    ])?.gainKg === 7);
  verifier('suivi SANS repère (antérieur à la migration 36) : aucun soupçon',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 10 },
      [{ bouteilleId: 'bou-1', numeroBsff: 'X', dateRemise: '2026-07-24',
        masseBouteilleApresKg: null }], []) === null);
  verifier('deux remises cohérentes entre elles : aucun écart',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 2 }, [
      { bouteilleId: 'bou-1', numeroBsff: 'SIF-2026-0001', masseRemiseKg: 5,
        dateRemise: '2026-07-24', masseBouteilleApresKg: 5 },
      { bouteilleId: 'bou-1', numeroBsff: 'SIF-2026-0002', masseRemiseKg: 3,
        dateRemise: '2026-08-01', masseBouteilleApresKg: 2 }
    ], []) === null);
  verifier('l’écart se mesure aussi sur le DERNIER repère',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 4 }, [
      { bouteilleId: 'bou-1', numeroBsff: 'SIF-2026-0001', masseRemiseKg: 5,
        dateRemise: '2026-07-24', masseBouteilleApresKg: 5 },
      { bouteilleId: 'bou-1', numeroBsff: 'SIF-2026-0002', masseRemiseKg: 3,
        dateRemise: '2026-08-01', masseBouteilleApresKg: 2 }
    ], [])?.gainKg === 2);
  // ⚠ L'ALERTE NE S'ÉTEINT PAS D'UN CLIC (attaque tirée par la revue) :
  // après le gonflage (5 → 10), un nouveau suivi de 0,001 kg réécrivait le
  // repère sur l'état gonflé. Le repère ANCIEN reste opposable.
  {
    const apresBidon = ecartApresRemise({ id: 'bou-1', masseNetteKg: 9.999 }, [
      { bouteilleId: 'bou-1', numeroBsff: 'SIF-2026-0001', masseRemiseKg: 5,
        dateRemise: '2026-07-24', masseBouteilleApresKg: 5 },
      { bouteilleId: 'bou-1', numeroBsff: 'SIF-2026-0002', masseRemiseKg: 0.001,
        dateRemise: '2026-07-25', masseBouteilleApresKg: 9.999 }
    ], []);
    verifier('un suivi bidon n’efface PAS l’écart (le vieux repère tient)',
      apresBidon?.gainKg === 5, JSON.stringify(apresBidon));
    verifier('l’alerte cite le repère d’ORIGINE, pas le suivi bidon',
      apresBidon?.numeroSuivi === 'SIF-2026-0001'
      && apresBidon?.masseApresKg === 5);
  }
  verifier('même du MÊME jour, le suivi bidon n’efface pas l’écart',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 9.999 }, [
      { bouteilleId: 'bou-1', numeroBsff: 'SIF-2026-0001', masseRemiseKg: 5,
        dateRemise: '2026-07-24', masseBouteilleApresKg: 5 },
      { bouteilleId: 'bou-1', numeroBsff: 'SIF-2026-0002', masseRemiseKg: 0.001,
        dateRemise: '2026-07-24', masseBouteilleApresKg: 9.999 }
    ], [])?.gainKg === 4.999);
  // MINEUR 4 : l'ordre ne se lit plus au NUMÉRO. Un registre importé peut
  // porter des numéros antérieurs, et le serveur trie par date décroissante.
  verifier('ordre du tableau et numéros indifférents (même verdict)',
    JSON.stringify(ecartApresRemise({ id: 'bou-1', masseNetteKg: 4 }, [
      { bouteilleId: 'bou-1', numeroBsff: 'SIF-2026-0009', masseRemiseKg: 3,
        dateRemise: '2026-08-01', masseBouteilleApresKg: 2 },
      { bouteilleId: 'bou-1', numeroBsff: 'ANCIEN-42', masseRemiseKg: 5,
        dateRemise: '2026-07-24', masseBouteilleApresKg: 5 }
    ], []))
    === JSON.stringify(ecartApresRemise({ id: 'bou-1', masseNetteKg: 4 }, [
      { bouteilleId: 'bou-1', numeroBsff: 'ANCIEN-42', masseRemiseKg: 5,
        dateRemise: '2026-07-24', masseBouteilleApresKg: 5 },
      { bouteilleId: 'bou-1', numeroBsff: 'SIF-2026-0009', masseRemiseKg: 3,
        dateRemise: '2026-08-01', masseBouteilleApresKg: 2 }
    ], [])));
  // ⚠ LA DATE DU MÊME JOUR (revue finale B2). Le repère est figé à
  // l'INSTANT de la remise, les dates du registre sont au JOUR près : une
  // écriture datée du jour de la remise est déjà dans le repère. La
  // recompter comme postérieure inventait un gain dès qu'elle SORTAIT — et
  // le logiciel accusait par écrit une écriture validée qui l'explique.
  // Règle unique : à date égale, on ne retient que ce qui EXPLIQUE.
  verifier('une charge SORTANTE du MÊME JOUR n’accuse pas (déjà au repère)',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 5 }, suivis, [
      { statut: 'VALIDE', type: 'CHARGE_APPOINT', date: '2026-07-24',
        bouteilleSrcId: 'bou-1', quantiteKg: 2 }
    ]) === null);
  verifier('un TRANSFERT SORTANT du MÊME JOUR n’accuse pas non plus',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 5 }, suivis, [
      { statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-24',
        bouteilleSrcId: 'bou-1', bouteilleDstId: 'bou-2', quantiteKg: 2 }
    ]) === null);
  verifier('une ENTRÉE du même jour continue d’EXPLIQUER le gain',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 7 }, suivis, [
      { statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-24',
        bouteilleSrcId: 'bou-2', bouteilleDstId: 'bou-1', quantiteKg: 2 }
    ]) === null);
  verifier('… et n’explique QUE sa quantité (le reste du gain tient)',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 9 }, suivis, [
      { statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-24',
        bouteilleSrcId: 'bou-2', bouteilleDstId: 'bou-1', quantiteKg: 2 }
    ])?.gainKg === 2);
  verifier('CONTRE-TIR : la re-inflation SANS écriture reste dénoncée',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 10 }, suivis, [])
      ?.gainKg === 5);
  verifier('tolérance métrologique : 10 g d’arrondi ne déclenchent rien',
    ecartApresRemise({ id: 'bou-1', masseNetteKg: 5.01 }, suivis, [])
      === null);
  verifier('une bouteille SANS remise n’est jamais concernée',
    ecartApresRemise({ id: 'bou-9', masseNetteKg: 99 }, suivis, []) === null);
}

console.log('\n--- F. Parité ESM ↔ CommonJS ---');
verifier('constantes identiques',
  miroir.PREFIXE_NUMERO_SUIVI === PREFIXE_NUMERO_SUIVI
  && String(miroir.FORME_NUMERO_SUIVI) === String(FORME_NUMERO_SUIVI)
  && miroir.MSG_NUMERO_SUIVI_FORME === MSG_NUMERO_SUIVI_FORME);
{
  const numeros = ['SIF-2026-0001', 'sif-2026-0001', ' SIF-2026-0002 ',
    'BSFF-2026-0001', '', 'SIF-2025-9999', 'SIF-2026-10000', 'X'];
  let ecarts = 0;
  for (const n of numeros) {
    if (cleNumeroSuivi(n) !== miroir.cleNumeroSuivi(n)) ecarts += 1;
    if (verifierNumeroSuivi(n, numeros) !== miroir.verifierNumeroSuivi(n, numeros)) {
      ecarts += 1;
    }
    if (msgNumeroSuiviDoublon(n) !== miroir.msgNumeroSuiviDoublon(n)) ecarts += 1;
  }
  for (const an of [2024, 2025, 2026, '2026']) {
    if (prochainNumeroSuivi(numeros, an) !== miroir.prochainNumeroSuivi(numeros, an)) {
      ecarts += 1;
    }
  }
  const jeux = [[], [{ numeroBsff: 'SIF-2026-0001' }],
    [{ numeroBsff: 'SIF-2026-0001' }, { numeroBsff: 'sif-2026-0001' }],
    [{ numeroBsff: null }, {}]];
  for (const jeu of jeux) {
    if (problemeNumerosSuivi(jeu) !== miroir.problemeNumerosSuivi(jeu)) ecarts += 1;
  }
  // Écart après remise : même verdict, même chiffre, des deux côtés.
  const suivisParite = [
    { bouteilleId: 'b1', numeroBsff: 'SIF-2026-0001', dateRemise: '2026-07-24',
      masseBouteilleApresKg: 5 },
    { bouteilleId: 'b1', numeroBsff: 'SIF-2026-0002', dateRemise: '2026-08-01',
      masseBouteilleApresKg: 2 },
    { bouteilleId: 'b2', numeroBsff: 'SIF-2026-0003', dateRemise: '2026-08-02',
      masseBouteilleApresKg: null }
  ];
  const mvtsParite = [
    { statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE', date: '2026-08-02',
      bouteilleDstId: 'b1', quantiteKg: -1 },
    { statut: 'BROUILLON', type: 'RECUPERATION_MAINTENANCE', date: '2026-08-03',
      bouteilleDstId: 'b1', quantiteKg: -4 },
    { statut: 'VALIDE', type: 'CHARGE_APPOINT', date: '2026-08-04',
      bouteilleSrcId: 'b1', quantiteKg: 0.5 },
    { statut: 'VALIDE', type: 'TRANSFERT', date: '2026-08-05',
      bouteilleSrcId: 'b2', bouteilleDstId: 'b1', quantiteKg: 0.25 },
    { statut: 'ANNULE', type: 'TRANSFERT', date: '2026-08-06',
      bouteilleSrcId: 'b1', bouteilleDstId: 'b2', quantiteKg: 0.75 },
    { statut: 'VALIDE', type: 'TRANSFERT', date: '2026-08-07',
      bouteilleSrcId: 'b1', bouteilleDstId: 'b2', quantiteKg: -0.75 },
    // Écritures datées du JOUR MÊME d'un repère (b1 le 2026-07-24, b1 le
    // 2026-08-01) : la convention de date doit être la même des deux côtés.
    { statut: 'VALIDE', type: 'CHARGE_APPOINT', date: '2026-07-24',
      bouteilleSrcId: 'b1', quantiteKg: 1.5 },
    { statut: 'VALIDE', type: 'TRANSFERT', date: '2026-08-01',
      bouteilleSrcId: 'b2', bouteilleDstId: 'b1', quantiteKg: 0.4 }
  ];
  for (const masse of [0, 2, 2.5, 3, 10, NaN]) {
    for (const id of ['b1', 'b2', 'b3']) {
      const a = ecartApresRemise({ id, masseNetteKg: masse }, suivisParite, mvtsParite);
      const b = miroir.ecartApresRemise({ id, masseNetteKg: masse }, suivisParite, mvtsParite);
      if (JSON.stringify(a) !== JSON.stringify(b)) ecarts += 1;
    }
  }
  if (TOLERANCE_REMISE_KG !== miroir.TOLERANCE_REMISE_KG) ecarts += 1;
  verifier('comportements et messages identiques des deux côtés',
    ecarts === 0, `${ecarts} écart(s)`);
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
