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
  verifierNumeroSuivi, problemeNumerosSuivi
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
  verifier('comportements et messages identiques des deux côtés',
    ecarts === 0, `${ecarts} écart(s)`);
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
