// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// « Une date est une date » — comportement ET parité des deux miroirs
// (lot L2, 25/07/2026). Exécution : node server/test-dates.mjs
//
// Le module décide de choses opposables : une attestation est-elle encore
// valide, une détection a-t-elle été vérifiée depuis moins de douze mois.
// Deux exigences, donc :
//   1. le CALENDRIER RÉEL, pas seulement le format (le 30 février et le
//      « 2028-99-99 » passent la regex mais n'existent pas) ;
//   2. la PARITÉ stricte ESM ↔ CommonJS — une règle qui divergerait entre
//      le front et le serveur donnerait deux verdicts d'aptitude pour la
//      même attestation.
// ============================================================

import { createRequire } from 'node:module';
import {
  estDateCalendaire, estDateCalendaireOuVide, estDateFuture,
  messageDateInvalide
} from '../v8/js/data/dates.js';

const require = createRequire(import.meta.url);
const miroir = require('./dates.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

// ============================================================
// 1. Ce qui est une date
// ============================================================
console.log('--- 1. Dates réelles acceptées ---');
for (const bonne of ['2026-07-25', '2000-02-29', '2024-02-29', '1999-12-31',
  '2026-01-01', '2028-12-31']) {
  verifier(`accepte ${bonne}`, estDateCalendaire(bonne) === true);
}

// ============================================================
// 2. Ce qui n'en est PAS — chaque ligne est une attaque tirée le 25/07
// ============================================================
console.log('--- 2. Ce que le format seul laissait passer ---');
const MAUVAISES = [
  ['31/12/2020', 'format français : « 3 » > « 2 », donc toute comparaison '
    + 'lexicographique déclare la date FUTURE (attestation périmée = valide)'],
  ['15/06/2027', 'format français, autre sens : contournait la garde de '
    + 'délivrance 2008'],
  ['2028-99-99', '99ᵉ jour du 99ᵉ mois : passe la regex, n’existe pas'],
  ['2026-13-45', 'mois 13'],
  ['2026-02-30', '30 février — JavaScript le « rattrape » au 2 mars en '
    + 'silence si on ne fait pas l’aller-retour UTC'],
  ['2025-02-29', '29 février d’une année NON bissextile'],
  ['0000-00-00', 'zéros'],
  ['2026-7-5', 'sans zéro de tête : ne se compare pas correctement'],
  ['2026-07-25T10:00:00Z', 'horodatage complet'],
  ['2026-07-25 ', 'espace en fin (regex non ancrée = piège classique)'],
  [' 2026-07-25', 'espace en tête'],
  ['aujourd’hui', 'texte'],
  ['', 'chaîne vide'],
];
for (const [valeur, pourquoi] of MAUVAISES) {
  verifier(`refuse « ${valeur} » — ${pourquoi}`,
    estDateCalendaire(valeur) === false);
}
for (const valeur of [null, undefined, 20260725, {}, [], new Date(), true]) {
  verifier(`refuse la valeur non textuelle ${JSON.stringify(valeur) ?? 'undefined'}`,
    estDateCalendaire(valeur) === false);
}

// ============================================================
// 3. Absente ≠ illisible (doctrine « une clé absente ne vaut pas décision »)
// ============================================================
console.log('--- 3. Absente ≠ illisible ---');
verifier('null est ADMIS (pas d’échéance est une donnée légitime)',
  estDateCalendaireOuVide(null) === true);
verifier('undefined est ADMIS', estDateCalendaireOuVide(undefined) === true);
verifier('la chaîne vide est ADMISE', estDateCalendaireOuVide('') === true);
verifier('mais « 2028-99-99 » reste REFUSÉ',
  estDateCalendaireOuVide('2028-99-99') === false);
verifier('et « 31/12/2020 » reste REFUSÉ',
  estDateCalendaireOuVide('31/12/2020') === false);

// ============================================================
// 4. Le futur
// ============================================================
console.log('--- 4. Dates futures ---');
verifier('2030-01-01 est future par rapport à 2026-07-25',
  estDateFuture('2030-01-01', '2026-07-25') === true);
verifier('2020-01-01 ne l’est pas',
  estDateFuture('2020-01-01', '2026-07-25') === false);
verifier('le jour même n’est pas « futur »',
  estDateFuture('2026-07-25', '2026-07-25') === false);
verifier('une date illisible n’est jamais déclarée future',
  estDateFuture('2028-99-99', '2026-07-25') === false);

// ============================================================
// 5. PARITÉ STRICTE des deux miroirs
// ============================================================
console.log('--- 5. Parité ESM ↔ CommonJS ---');
const ECHANTILLON = [
  '2026-07-25', '2000-02-29', '2024-02-29', '2025-02-29', '2026-02-30',
  '2028-99-99', '2026-13-45', '31/12/2020', '15/06/2027', '0000-00-00',
  '2026-7-5', '2026-07-25T10:00:00Z', '2026-07-25 ', ' 2026-07-25', '',
  'aujourd’hui', '9999-12-31', '1900-02-29', '2100-02-29',
  null, undefined, 20260725, {}, [], true,
];
let divergences = 0;
for (const valeur of ECHANTILLON) {
  if (estDateCalendaire(valeur) !== miroir.estDateCalendaire(valeur)) {
    divergences += 1;
    console.error(`  divergence estDateCalendaire sur ${JSON.stringify(valeur)}`);
  }
  if (estDateCalendaireOuVide(valeur) !== miroir.estDateCalendaireOuVide(valeur)) {
    divergences += 1;
    console.error(`  divergence estDateCalendaireOuVide sur ${JSON.stringify(valeur)}`);
  }
  if (estDateFuture(valeur, '2026-07-25')
      !== miroir.estDateFuture(valeur, '2026-07-25')) {
    divergences += 1;
    console.error(`  divergence estDateFuture sur ${JSON.stringify(valeur)}`);
  }
}
verifier(`les deux miroirs rendent le MÊME verdict sur ${ECHANTILLON.length} `
  + 'valeurs', divergences === 0, `${divergences} divergence(s)`);
verifier('le message canonique est identique des deux côtés',
  messageDateInvalide('Date de fin')
  === miroir.messageDateInvalide('Date de fin'),
  `${messageDateInvalide('Date de fin')} ≠ ${miroir.messageDateInvalide('Date de fin')}`);

// ============================================================
// 6. Balayage exhaustif d'une année : le module et le calendrier
//    doivent être d'accord sur les 366 jours de 2024 (bissextile).
// ============================================================
console.log('--- 6. Balayage d’une année bissextile ---');
{
  let acceptees = 0;
  let refusees = 0;
  for (let mois = 1; mois <= 13; mois += 1) {
    for (let jour = 1; jour <= 32; jour += 1) {
      const texte = `2024-${String(mois).padStart(2, '0')}-`
        + String(jour).padStart(2, '0');
      const attendu = (() => {
        const d = new Date(Date.UTC(2024, mois - 1, jour));
        return d.getUTCFullYear() === 2024 && d.getUTCMonth() === mois - 1
          && d.getUTCDate() === jour;
      })();
      const obtenu = estDateCalendaire(texte);
      if (obtenu !== attendu) {
        console.error(`  désaccord sur ${texte} (attendu ${attendu})`);
        refusees += 1;
      } else if (obtenu) acceptees += 1;
    }
  }
  verifier('les 366 jours de 2024 sont reconnus, et eux seuls',
    acceptees === 366 && refusees === 0,
    `${acceptees} acceptées, ${refusees} désaccords`);
}

console.log('');
console.log(`Dates : ${nbOk} réussies, ${nbEchecs} en échec.`);
if (nbEchecs > 0) process.exit(1);
