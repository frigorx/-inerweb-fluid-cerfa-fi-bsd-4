// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// Suite « code machine lisible » (brique produit JR-CF-001) — doublée
// demo + local via outils/lancer-tests.mjs. Prouve : le module pur
// (familles, code site, générateur, normalisation, validation) et la
// PARITÉ des deux stores (création avec code fourni, unicité, format,
// repli compteur hérité, renommage par updateMachine).

import {
  FAMILLES_MACHINE,
  familleDuType,
  codeSite,
  normaliserCodeMachine,
  validerCodeMachine,
  genererCodeMachine
} from './code-machine.js';

const NOM_STORE = process.argv[2] ?? 'demo';

async function fabriquerStore(nom) {
  switch (nom) {
    case 'demo': {
      const { creerStore } = await import('./datastore.js');
      return await creerStore();
    }
    case 'local': {
      const { creerStoreDeTest } =
        await import('../../../server/harnais-contrat.mjs');
      return await creerStoreDeTest();
    }
    default:
      console.error(`Store inconnu : « ${nom} » (demo ou local).`);
      process.exit(2);
  }
}

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

async function attendreErreur(libelle, promesse, motif) {
  try {
    await promesse;
    verifier(libelle, false, 'aucune erreur levée');
  } catch (e) {
    verifier(libelle, motif.test(e.message), `message : ${e.message}`);
  }
}

// ------------------------------------------------------------
// 1. Module pur
// ------------------------------------------------------------
console.log('— Module pur code-machine —');

verifier('FAMILLES_MACHINE non vide', FAMILLES_MACHINE.length >= 6);
verifier('familleDuType : Chambre froide → CF', familleDuType('Chambre froide') === 'CF');
verifier('familleDuType : PAC (Pompe à chaleur) → PC', familleDuType('PAC (Pompe à chaleur)') === 'PC');
verifier('familleDuType : Vitrine réfrigérée → VR', familleDuType('Vitrine réfrigérée') === 'VR');
verifier('familleDuType : type inconnu → MA (défaut)', familleDuType('Groupe à eau glacée') === 'MA');
verifier('familleDuType : vide → MA', familleDuType('') === 'MA');

verifier('codeSite : Lycée Antoine Vidal → AV', codeSite('Lycée Antoine Vidal') === 'AV');
verifier('codeSite : mots vides ignorés (Lycée professionnel de la Mer → M + repli)',
  codeSite('Lycée professionnel de la Mer').length >= 2);
verifier('codeSite : vide → ST (repli)', codeSite('') === 'ST');
verifier('codeSite : accents dépouillés', codeSite('École Émile Zola') === 'EZ');

verifier('normaliser : minuscules/accents/espaces', normaliserCodeMachine(' jr-cf-è01 ') === 'JR-CF-E01');
verifier('valider : JR-CF-001 valide', validerCodeMachine('JR-CF-001') === null);
verifier('valider : M1 hérité valide', validerCodeMachine('M1') === null);
verifier('valider : vide refusé', validerCodeMachine('') !== null);
verifier('valider : tiret en tête refusé', validerCodeMachine('-X') !== null);
verifier('valider : 25 caractères refusés', validerCodeMachine('A'.repeat(25)) !== null);
verifier('valider : caractère hors alphabet refusé', validerCodeMachine('JR_CF') !== null);

const parc = [{ code: 'JR-CF-001' }, { code: 'jr-cf-007' }, { code: 'M3' }, { code: null }];
verifier('générer : prochain numéro pour le préfixe (008)',
  genererCodeMachine(parc, 'JR', 'CF') === 'JR-CF-008');
verifier('générer : préfixe vierge → 001',
  genererCodeMachine(parc, 'JR', 'VR') === 'JR-VR-001');
verifier('générer : parc vide → 001',
  genererCodeMachine([], 'JR', 'CF') === 'JR-CF-001');
verifier('générer : site/famille vides → replis ST/MA',
  genererCodeMachine([], '', '') === 'ST-MA-001');

// ------------------------------------------------------------
// 2. Parité des stores (création, unicité, renommage)
// ------------------------------------------------------------
console.log(`— Store ${NOM_STORE} —`);

const store = await fabriquerStore(NOM_STORE);
const fluides = await store.getFluides();
const fluide = fluides[0]?.code;
verifier('référentiel fluides disponible', Boolean(fluide));

const base = {
  designation: 'Machine test code lisible',
  type: 'Chambre froide',
  fluide,
  chargeNominaleKg: 5
};

// Création avec code fourni (normalisé au passage)
const m1 = await store.createMachine({ ...base, code: ' zz-cf-001 ' });
verifier('création avec code fourni → normalisé ZZ-CF-001', m1.code === 'ZZ-CF-001');
verifier('code_public opaque toujours généré (distinct)', Boolean(m1.codePublic)
  && m1.codePublic !== m1.code);

// Unicité (insensible à la casse)
await attendreErreur('création : code déjà utilisé refusé',
  store.createMachine({ ...base, code: 'zz-cf-001' }), /déjà utilisé/);

// Format invalide
await attendreErreur('création : code invalide refusé',
  store.createMachine({ ...base, code: '-ZZ' }), /invalide|vide/);

// Repli compteur hérité sans code
const m2 = await store.createMachine({ ...base });
verifier('création sans code → compteur hérité M{n}', /^M\d+$/.test(m2.code), m2.code);

// Renommage par updateMachine
const m3 = await store.updateMachine(m2.id, { code: 'zz-cf-002' });
verifier('updateMachine : renommage normalisé ZZ-CF-002', m3.code === 'ZZ-CF-002');

// Renommage vers un code pris → refus
await attendreErreur('updateMachine : code déjà utilisé refusé',
  store.updateMachine(m2.id, { code: 'ZZ-CF-001' }), /déjà utilisé/);

// Renommage vers soi-même → accepté sans effet
const m4 = await store.updateMachine(m2.id, { code: 'ZZ-CF-002' });
verifier('updateMachine : re-poser son propre code accepté', m4.code === 'ZZ-CF-002');

// Code invalide au renommage → refus
await attendreErreur('updateMachine : code invalide refusé',
  store.updateMachine(m2.id, { code: 'A'.repeat(30) }), /trop long/);

// Le journal a tracé le renommage (ancien → nouveau)
const journal = await store.getJournalAudit();
const traceRenommage = journal.some((e) =>
  e.action === 'MODIFICATION_MACHINE' && /code M\d+ → ZZ-CF-002/.test(e.details || ''));
verifier('journal : renommage tracé « code ancien → nouveau »', traceRenommage);

// ------------------------------------------------------------
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [store ${NOM_STORE}]`);
process.exit(nbEchecs === 0 ? 0 : 1);
