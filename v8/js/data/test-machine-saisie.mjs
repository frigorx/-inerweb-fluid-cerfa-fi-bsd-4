// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Test B1 — LA SAISIE D'UNE MACHINE : MÊMES BORNES AUX DEUX PORTES.
// Exécution : node v8/js/data/test-machine-saisie.mjs [demo|local]
//
// POURQUOI CETTE SUITE EXISTE.
// `updateMachine` bornait la charge actuelle depuis L2 ; `createMachine`,
// lui, coerçait en silence : 9999 kg actuels sur 10 kg nominaux passaient
// en 200, -50 kg aussi, et la chaîne « beaucoup » devenait 0 kg sans un
// mot (Number(...) || 0). Un registre qui INVENTE une valeur est pire
// qu'un registre qui refuse. Même motif sur les dates : `createControle`
// refusait déjà '2028-99-99' (doctrine L2, « une date est une date »),
// `createMachine` l'acceptait sur ses trois dates.
//
// Ce sont des refus MÉTIER : la parité DemoStore / serveur s'applique
// (mêmes refus, mêmes messages canoniques). D'où la suite DOUBLÉE.
// ÉCRIT dans le store cible — base JETABLE en local (harnais).
// ============================================================

const NOM_STORE = process.argv[2] ?? 'demo';

async function fabriquerStore(nom) {
  switch (nom) {
    case 'demo': {
      const { creerStore } = await import('./datastore.js');
      return creerStore();
    }
    case 'local': {
      const { creerStoreDeTest } =
        await import('../../../server/harnais-contrat.mjs');
      return creerStoreDeTest();
    }
    default:
      console.error(`Store inconnu : « ${nom} » (demo ou local).`);
      process.exit(2);
  }
}

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

async function messageDeRefus(promesse) {
  try { await promesse; return null; }
  catch (erreur) { return erreur.message; }
}

/** Le refus doit exister ET porter le message canonique attendu. */
async function attendreRefus(libelle, promesse, extrait) {
  const message = await messageDeRefus(promesse);
  verifier(libelle, message !== null && message.includes(extrait),
    message === null ? 'AUCUN refus' : `message « ${message} »`);
}

const store = await fabriquerStore(NOM_STORE);
if (NOM_STORE === 'demo') await store.init();

const FLUIDE = 'R-410A';
let compteur = 0;
/** Une machine de base, à compléter par le cas testé. */
function fiche(complement) {
  compteur += 1;
  return {
    designation: `Machine de saisie ${compteur}`, fluide: FLUIDE,
    chargeNominaleKg: 10, operateur: 'Testeur saisie',
    ...complement
  };
}

// ============================================================
// A. La charge actuelle : ni illisible, ni négative, ni hors machine
// ============================================================
console.log('--- A. Bornes de la charge actuelle À LA CRÉATION ---');

await attendreRefus('9999 kg actuels sur 10 kg nominaux : REFUSÉ dès la '
  + 'création', store.createMachine(fiche({ chargeActuelleKg: 9999 })),
'Charge actuelle impossible');

await attendreRefus('charge actuelle NÉGATIVE (-50 kg) : REFUSÉE',
  store.createMachine(fiche({ chargeActuelleKg: -50 })),
  'Charge actuelle invalide');

await attendreRefus('charge actuelle ILLISIBLE (« beaucoup ») : REFUSÉE, '
  + 'plus jamais coercée en 0 kg',
store.createMachine(fiche({ chargeActuelleKg: 'beaucoup' })),
'Charge actuelle invalide');

// Contre-épreuves : la saisie normale passe, la tolérance de pesée tient.
{
  const normale = await store.createMachine(
    fiche({ chargeActuelleKg: 8.4 }));
  verifier('contre-épreuve : 8,4 kg sur 10 kg nominaux s’enregistrent',
    normale.chargeActuelleKg === 8.4, `valeur = ${normale.chargeActuelleKg}`);

  const tolerance = await store.createMachine(
    fiche({ chargeActuelleKg: 10.4 }));
  verifier('contre-épreuve : 10,4 kg sur 10 kg nominaux (tolérance 5 %) '
    + 'passent', tolerance.chargeActuelleKg === 10.4,
  `valeur = ${tolerance.chargeActuelleKg}`);

  const absente = await store.createMachine(fiche({}));
  verifier('contre-épreuve : charge actuelle absente = 0 kg (donnée '
    + 'légitime, pas une invention)', absente.chargeActuelleKg === 0,
  `valeur = ${absente.chargeActuelleKg}`);

  const vide = await store.createMachine(fiche({ chargeActuelleKg: '' }));
  verifier('contre-épreuve : champ de formulaire VIDE = 0 kg',
    vide.chargeActuelleKg === 0, `valeur = ${vide.chargeActuelleKg}`);
}

console.log('--- A bis. Les mêmes bornes à la MODIFICATION (déjà L2) ---');
{
  const m = await store.createMachine(fiche({ chargeActuelleKg: 5 }));
  await attendreRefus('9999 kg par modification : REFUSÉ (l’autre porte)',
    store.updateMachine(m.id, { chargeActuelleKg: 9999 }),
    'Charge actuelle impossible');
  const corrigee = await store.updateMachine(m.id, { chargeActuelleKg: 6 });
  verifier('contre-épreuve : la correction de pesée reste possible',
    corrigee.chargeActuelleKg === 6);
}

console.log('--- A ter. Charge utile à DOUBLE violation : c’est le RANG '
  + 'qui décide du message ---');
{
  // ⭐⭐ REVUE B1, constat important n°3 — LE TROU DE COUVERTURE.
  // Le lot B1 avait remonté le refus des deux dates de contrôle AVANT les
  // bornes de charge côté SERVEUR, et l'avait laissé APRÈS côté DÉMO. Les
  // deux stores refusaient bien, mais avec des messages DIFFÉRENTS :
  //   serveur → « Les dates de contrôle d'une machine… »
  //   démo    → « Charge actuelle impossible : 9999 kg… »
  // Aucune suite ne tirait de charge utile à DOUBLE violation : l'écart
  // est passé. La parité, ce n'est pas « les deux refusent », c'est le
  // MÊME message canonique, mot pour mot — donc le même RANG d'évaluation.
  const m = await store.createMachine(fiche({ chargeActuelleKg: 5 }));
  const MSG_DATES = 'Les dates de contrôle d’une machine ne se saisissent '
    + 'pas ici';
  await attendreRefus('double violation (charge hors bornes ET date de '
    + 'contrôle) : c’est le refus des DATES qui sort',
  store.updateMachine(m.id,
    { chargeActuelleKg: 9999, dernierControle: '2026-01-05' }),
  MSG_DATES);
  await attendreRefus('… et l’ordre des clés de la charge utile n’y change '
    + 'rien (c’est le rang du code, pas celui de l’objet)',
  store.updateMachine(m.id,
    { dernierControle: '2026-01-05', chargeActuelleKg: 9999 }),
  MSG_DATES);
  await attendreRefus('… même face à une charge NOMINALE nulle, qui est '
    + 'pourtant elle aussi un refus métier',
  store.updateMachine(m.id,
    { chargeNominaleKg: 0, prochainControle: '2099-12-31' }),
  MSG_DATES);
  // Contre-épreuve : SANS la date, c'est bien le message de la charge qui
  // sort — sans quoi l'assertion ci-dessus serait vraie pour de mauvaises
  // raisons (un refus qui sortirait toujours le même message).
  await attendreRefus('contre-épreuve : sans date dans la charge utile, '
    + 'c’est bien le message de la CHARGE qui sort',
  store.updateMachine(m.id, { chargeActuelleKg: 9999 }),
  'Charge actuelle impossible');
  await attendreRefus('contre-épreuve : … et celui de la charge NOMINALE '
    + 'quand c’est elle qui cloche',
  store.updateMachine(m.id, { chargeNominaleKg: 0 }),
  'Charge nominale obligatoire');
}

// ============================================================
// B. « Une date est une date » — sur la machine aussi
// ============================================================
console.log('--- B. Dates de la machine À LA CRÉATION ---');

await attendreRefus('date de mise en service non calendaire '
  + '(« 2028-99-99 ») : REFUSÉE',
store.createMachine(fiche({ dateMiseEnService: '2028-99-99' })),
'Date de mise en service invalide');

await attendreRefus('date de mise en service au format français '
  + '(« 31/12/2020 ») : REFUSÉE',
store.createMachine(fiche({ dateMiseEnService: '31/12/2020' })),
'Date de mise en service invalide');

await attendreRefus('un 30 février (« 2026-02-30 ») : REFUSÉ (calendrier '
  + 'RÉEL, pas seulement le format)',
store.createMachine(fiche({ dateMiseEnService: '2026-02-30' })),
'Date de mise en service invalide');

await attendreRefus('échéance de contrôle non calendaire posée à la '
  + 'création (reprise de parc) : REFUSÉE',
store.createMachine(fiche({ prochainControle: '2028-99-99' })),
'Date du prochain contrôle invalide');

await attendreRefus('date du dernier contrôle non calendaire : REFUSÉE',
  store.createMachine(fiche({ dernierControle: '2028-99-99' })),
  'Date du dernier contrôle invalide');

{
  const reprise = await store.createMachine(fiche({
    dateMiseEnService: '2019-04-15', dernierControle: '2026-01-05',
    prochainControle: '2027-01-05' }));
  verifier('contre-épreuve : la reprise d’un parc existant (3 dates '
    + 'RÉELLES) reste possible à la création',
  reprise.dateMiseEnService === '2019-04-15'
    && reprise.dernierControle === '2026-01-05'
    && reprise.prochainControle === '2027-01-05');

  const sansDate = await store.createMachine(fiche({}));
  verifier('contre-épreuve : une date ABSENTE reste une donnée légitime '
    + '(« pas d’échéance »)', sansDate.dateMiseEnService === null,
  `valeur = ${sansDate.dateMiseEnService}`);
}

console.log('--- B bis. La même date à la MODIFICATION ---');
{
  const m = await store.createMachine(fiche({}));
  await attendreRefus('date de mise en service illisible par modification : '
    + 'REFUSÉE (l’autre porte)',
  store.updateMachine(m.id, { dateMiseEnService: '2028-99-99' }),
  'Date de mise en service invalide');
  const corrigee = await store.updateMachine(m.id,
    { dateMiseEnService: '2020-09-01' });
  verifier('contre-épreuve : la vraie date de mise en service s’enregistre',
    corrigee.dateMiseEnService === '2020-09-01');
}

console.log('--- C. Un type d’installation ABSENT vaut « FIXE » (revue B1, '
  + 'mineur n°5) ---');
{
  // ⭐⭐ REVUE B1, constat mineur n°5. Les deux stores écrivent déjà
  // `d.typeInstallation ?? 'FIXE'` à la CRÉATION, et côté serveur la
  // colonne est `NOT NULL DEFAULT 'FIXE'` (migration 27) : un `null`
  // explicite ne peut donc pas rester un `null`. Il valait pourtant un
  // CHANGEMENT pour le filtre de qualification (403 pour un non-changement)
  // et serait parti tel quel dans le patch de modification.
  const neuve = await store.createMachine(fiche({ typeInstallation: null }));
  verifier('à la CRÉATION : un type absent est enregistré « FIXE »',
    neuve.typeInstallation === 'FIXE', `valeur = ${neuve.typeInstallation}`);
  const modifiee = await store.updateMachine(neuve.id,
    { typeInstallation: null });
  verifier('à la MODIFICATION : le même type absent reste « FIXE » (le juge '
    + 'et le scribe lisent la même valeur)',
  modifiee.typeInstallation === 'FIXE',
  `valeur = ${modifiee.typeInstallation}`);
  // Contre-épreuve : la valeur RÉELLE, elle, s'enregistre toujours.
  const mobile = await store.updateMachine(neuve.id,
    { typeInstallation: 'MOBILE' });
  verifier('contre-épreuve : « MOBILE » s’enregistre toujours',
    mobile.typeInstallation === 'MOBILE');
}

console.log('--- C bis. « Absent » ne veut pas dire « vide » : la CHAÎNE '
  + 'VIDE est REFUSÉE en amont ---');
{
  // ⭐ VÉRIFICATION FINALE, constat n°3 — CE QUE LE CODE FAIT VRAIMENT.
  // Trois commentaires annonçaient que `typeInstallation: ''` était lu
  // comme absent, donc « FIXE » — au même titre que `null`. Ce n'est PAS
  // observable : la garde de type, jouée AVANT le filtre de qualification
  // et avant l'écriture (api.js createMachine/updateMachine, miroir
  // demo-store), refuse toute valeur hors ['FIXE','MOBILE'] dès lors
  // qu'elle n'est ni `undefined` ni `null` — et la chaîne vide n'est ni
  // l'un ni l'autre. Les branches `=== ''` en aval sont donc MORTES.
  // On l'ANCRE ici : si quelqu'un desserrait cette garde en amont en se
  // fiant à ces commentaires, ces deux vérifications tomberaient.
  const MSG_TYPE = 'Type d\'installation inconnu';
  await attendreRefus('à la CRÉATION : une chaîne VIDE n’est pas un type '
    + 'absent — REFUSÉE, elle n’est jamais convertie en « FIXE »',
  store.createMachine(fiche({ typeInstallation: '' })), MSG_TYPE);
  const m = await store.createMachine(fiche({}));
  await attendreRefus('à la MODIFICATION : même refus, même message '
    + 'canonique (l’autre porte)',
  store.updateMachine(m.id, { typeInstallation: '' }), MSG_TYPE);
  // Contre-épreuve : le refus vise bien la VALEUR, pas le geste — la même
  // machine se modifie sans encombre dès que le type est absent ou réel.
  const sansType = await store.updateMachine(m.id, { designation: 'Sans type' });
  verifier('contre-épreuve : sans le champ, la modification passe et le '
    + 'type reste « FIXE »',
  sansType.typeInstallation === 'FIXE' && sansType.designation === 'Sans type',
  `type = ${sansType.typeInstallation}`);
}

// ============================================================
console.log('');
console.log(`Saisie d’une machine (${NOM_STORE}) : `
  + `${nbOk} réussies, ${nbEchecs} en échec.`);
if (nbEchecs > 0) process.exit(1);
console.log(`Saisie d’une machine : « ${NOM_STORE} » est conforme.`);
