// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test de la chronologie « vie de la bouteille » (brique ②).
// Exécution : node v8/js/data/test-vie-bouteille.mjs
//
// Volet A (pur, données forgées) : signes des variations vues de la
// bouteille pour chaque type de mouvement, contre-écritures (chemin
// inverse + appariement au numéro d'origine), teq au PRP figé avec
// repli assumé sur le référentiel courant, filtre du journal par code,
// tri décroissant, zéro fuite d'événements d'autres bouteilles.
// Volet B (DemoStore réel) : un parcours charge → transfert →
// contre-écriture → pesée se retrouve intégralement dans la
// chronologie construite depuis les lectures du contrat.
// Node ≥ 18, sans DOM.
// ============================================================

import { construireVieBouteille, variationPourBouteille }
  from './vie-bouteille.js';
import { creerStore } from './datastore.js';

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

const PROCHE = (a, b) => Math.abs(a - b) < 1e-9;

// ============================================================
// A. Volet PUR — signes et assemblage
// ============================================================
console.log('--- A. variations et assemblage (pur) ---');

const B1 = { id: 'bou-1', code: 'B-01' };
const FLUIDES = [{ code: 'R-32', gwpAr4: 675 }, { code: 'R-404A', gwpAr4: 3922 }];

{
  // CHARGE : la bouteille SOURCE se vide.
  const charge = { type: 'CHARGE_APPOINT', quantiteKg: 2,
    bouteilleSrcId: 'bou-1', bouteilleDstId: null };
  verifier('charge : la bouteille source se vide (−2 kg)',
    PROCHE(variationPourBouteille(charge, 'bou-1'), -2));

  // RÉCUPÉRATION : la destination se remplit (quantité négative machine).
  const recup = { type: 'RECUPERATION_MAINTENANCE', quantiteKg: -3,
    bouteilleSrcId: null, bouteilleDstId: 'bou-1' };
  verifier('récupération : la bouteille destination se remplit (+3 kg)',
    PROCHE(variationPourBouteille(recup, 'bou-1'), 3));

  // TRANSFERT : source se vide, destination se remplit.
  const transfert = { type: 'TRANSFERT', quantiteKg: 1.5,
    bouteilleSrcId: 'bou-1', bouteilleDstId: 'bou-2' };
  verifier('transfert : vu de la source, −1,5 kg',
    PROCHE(variationPourBouteille(transfert, 'bou-1'), -1.5));
  verifier('transfert : vu de la destination, +1,5 kg',
    PROCHE(variationPourBouteille(transfert, 'bou-2'), 1.5));

  // CONTRE-ÉCRITURES : quantité opposée, bouteilles NON permutées.
  const contreCharge = { type: 'CHARGE_APPOINT', quantiteKg: -2,
    bouteilleSrcId: 'bou-1', bouteilleDstId: null };
  verifier('contre-écriture d’une charge : le fluide REVIENT (+2 kg)',
    PROCHE(variationPourBouteille(contreCharge, 'bou-1'), 2));
  const contreRecup = { type: 'RECUPERATION_MAINTENANCE', quantiteKg: 3,
    bouteilleSrcId: null, bouteilleDstId: 'bou-1' };
  verifier('contre-écriture d’une récupération : le fluide RESSORT (−3 kg)',
    PROCHE(variationPourBouteille(contreRecup, 'bou-1'), -3));

  verifier('quantité inconnue (brouillon) : variation null',
    variationPourBouteille({ type: 'CHARGE_APPOINT', quantiteKg: null,
      bouteilleSrcId: 'bou-1' }, 'bou-1') === null);
}

{
  const mouvements = [
    { id: 'm1', numero: 'FORM-2026-0001', date: '2026-03-10', statut: 'ANNULE',
      type: 'CHARGE_APPOINT', fluide: 'R-32', quantiteKg: 2,
      bouteilleSrcId: 'bou-1', bouteilleDstId: null,
      machineLabel: 'Chambre froide', technicien: 'Un technicien',
      prpFige: 675 },
    { id: 'm2', numero: 'FORM-2026-0002', date: '2026-03-12', statut: 'VALIDE',
      type: 'CHARGE_APPOINT', fluide: 'R-32', quantiteKg: -2,
      bouteilleSrcId: 'bou-1', bouteilleDstId: null,
      contreEcritureDe: 'm1', technicien: 'Un référent', prpFige: 675 },
    // Écriture SANS prpFige (antérieure à la migration 13) : repli courant.
    { id: 'm3', numero: 'FORM-2026-0003', date: '2026-04-01', statut: 'VALIDE',
      type: 'RECUPERATION_MAINTENANCE', fluide: 'R-404A', quantiteKg: -4,
      bouteilleSrcId: null, bouteilleDstId: 'bou-1', prpFige: null },
    // Mouvement d'une AUTRE bouteille : ne doit pas fuiter.
    { id: 'm4', numero: 'FORM-2026-0004', date: '2026-04-02', statut: 'VALIDE',
      type: 'CHARGE_APPOINT', fluide: 'R-32', quantiteKg: 1,
      bouteilleSrcId: 'bou-2', bouteilleDstId: null },
    // BROUILLON : pas opposable, hors chronologie.
    { id: 'm5', numero: 'FORM-2026-0005', date: '2026-04-03', statut: 'BROUILLON',
      type: 'CHARGE_APPOINT', fluide: 'R-32', quantiteKg: null,
      bouteilleSrcId: 'bou-1', bouteilleDstId: null }
  ];
  const journal = [
    { date: '2026-03-01T10:00:00.000Z', qui: 'système',
      action: 'CREATION_BOUTEILLE', cible: 'B-01', details: 'NEUVE R-32 (12 kg)' },
    { date: '2026-03-15T14:30:00.000Z', qui: 'Un enseignant',
      action: 'PESEE_BOUTEILLE', cible: 'B-01', details: 'Brute 21 kg → nette 11 kg' },
    // Autre bouteille, et action non-bouteille : à ignorer.
    { date: '2026-03-16T09:00:00.000Z', qui: 'x',
      action: 'PESEE_BOUTEILLE', cible: 'B-02', details: 'Brute 5 kg → nette 1 kg' },
    { date: '2026-03-17T09:00:00.000Z', qui: 'x',
      action: 'VALIDATION_MOUVEMENT', cible: 'B-01', details: 'hors périmètre' }
  ];

  const vie = construireVieBouteille(
    { bouteille: B1, mouvements, journal, fluides: FLUIDES });

  verifier('assemblage : 3 mouvements opposables + 2 entrées journal',
    vie.nbMouvements === 3 && vie.evenements.length === 5);
  verifier('compteur de pesées : 1 (celle de B-01 seulement)',
    vie.nbPesees === 1);
  verifier('tri décroissant : le plus récent d’abord',
    vie.evenements[0].numero === 'FORM-2026-0003'
    && vie.evenements[vie.evenements.length - 1].sousType === 'CREATION_BOUTEILLE');

  const parNumero = Object.fromEntries(
    vie.evenements.filter((e) => e.numero).map((e) => [e.numero, e]));
  verifier('l’écriture annulée est marquée annule',
    parNumero['FORM-2026-0001'].annule === true);
  verifier('la contre-écriture est nommée d’après l’originale',
    parNumero['FORM-2026-0002'].titre === 'Contre-écriture de FORM-2026-0001');
  verifier('teq au PRP FIGÉ : 2 kg × 675 → 1,35 t, marquée figée',
    PROCHE(parNumero['FORM-2026-0001'].teqCo2, 1.35)
    && parNumero['FORM-2026-0001'].prpEstFige === true);
  verifier('écriture sans prpFige : repli sur le référentiel courant, marqué NON figé',
    PROCHE(parNumero['FORM-2026-0003'].teqCo2, 4 * 3922 / 1000)
    && parNumero['FORM-2026-0003'].prpEstFige === false);
  verifier('aucun événement d’une autre bouteille ne fuit',
    !vie.evenements.some((e) => e.numero === 'FORM-2026-0004')
    && !vie.evenements.some((e) => e.detail === 'Brute 5 kg → nette 1 kg'));
  verifier('le brouillon n’apparaît pas (pas opposable)',
    !vie.evenements.some((e) => e.numero === 'FORM-2026-0005'));
  verifier('l’action journal hors périmètre bouteille est ignorée',
    !vie.evenements.some((e) => e.detail === 'hors périmètre'));
}

{
  // TRI INTRA-JOUR (revue adversariale) : tout le même jour — l'entrée
  // au parc reste AU FOND de sa journée, les mouvements s'ordonnent par
  // rang de scellement, le journal horodaté vient au-dessus.
  const mouvements = [
    { id: 'j1', numero: 'FORM-2026-0011', date: '2026-07-10', statut: 'VALIDE',
      type: 'CHARGE_APPOINT', fluide: 'R-32', quantiteKg: 1,
      bouteilleSrcId: 'bou-1', ordreValidation: 5 },
    { id: 'j2', numero: 'FORM-2026-0012', date: '2026-07-10', statut: 'VALIDE',
      type: 'CHARGE_APPOINT', fluide: 'R-32', quantiteKg: 1,
      bouteilleSrcId: 'bou-1', ordreValidation: 6 }
  ];
  const journal = [
    { date: '2026-07-10T10:00:00.000Z', qui: 'x',
      action: 'CREATION_BOUTEILLE', cible: 'B-01', details: 'NEUVE R-32' },
    { date: '2026-07-10T14:30:00.000Z', qui: 'x',
      action: 'PESEE_BOUTEILLE', cible: 'B-01', details: 'Brute 20 kg → nette 10 kg' }
  ];
  const vie = construireVieBouteille(
    { bouteille: B1, mouvements, journal, fluides: FLUIDES });
  const ordreAffiche = vie.evenements.map(
    (e) => e.numero ?? e.sousType);
  verifier('tri intra-jour : pesée en tête, mouvements par rang de scellement, création au fond',
    JSON.stringify(ordreAffiche) === JSON.stringify(
      ['PESEE_BOUTEILLE', 'FORM-2026-0012', 'FORM-2026-0011', 'CREATION_BOUTEILLE']),
    `ordre = ${ordreAffiche.join(' > ')}`);
}

{
  // CONTREPARTIE d'un transfert : « suivre le fluide » exige le code de
  // l'autre contenant, dans les deux sens.
  const bouteilles = [{ id: 'bou-1', code: 'B-01' }, { id: 'bou-2', code: 'B-04' }];
  const mouvements = [
    { id: 't1', numero: 'FORM-2026-0021', date: '2026-05-01', statut: 'VALIDE',
      type: 'TRANSFERT', fluide: 'R-32', quantiteKg: 1.5,
      bouteilleSrcId: 'bou-1', bouteilleDstId: 'bou-2' }
  ];
  const vieSrc = construireVieBouteille(
    { bouteille: bouteilles[0], mouvements, journal: [], fluides: FLUIDES, bouteilles });
  verifier('transfert vu de la source : contrepartie « → B-04 »',
    vieSrc.evenements[0].contrepartie === '→ B-04');
  const vieDst = construireVieBouteille(
    { bouteille: bouteilles[1], mouvements, journal: [], fluides: FLUIDES, bouteilles });
  verifier('transfert vu de la destination : contrepartie « ← B-01 »',
    vieDst.evenements[0].contrepartie === '← B-01');
}

// ============================================================
// B. Volet DemoStore réel — parcours complet
// ============================================================
console.log('--- B. parcours réel (DemoStore) ---');

const store = await creerStore();
await store.init();

const referent = await store.createPersonne({
  nom: 'Vie', prenom: 'Référent', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
const fluides = await store.getFluides();
const machine = await store.createMachine({
  designation: 'Machine vie bouteille', fluide: fluides[0].code,
  chargeNominaleKg: 10, operateur: 'Testeur'
});
const source = await store.createBouteille({
  type: 'NEUVE', fluide: fluides[0].code, tareKg: 10, masseBruteKg: 25,
  contenanceMaxKg: 20
});
const destination = await store.createBouteille({
  type: 'RECUPERATION', fluide: fluides[0].code, tareKg: 8, masseBruteKg: 8,
  contenanceMaxKg: 15
});

// Charge (source se vide de 2 kg), puis transfert source → destination.
const mvtCharge = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machine.id, bouteilleSrcId: source.id,
  peseeAvantKg: 15, peseeApresKg: 13, technicien: 'Testeur'
});
await store.soumettreMouvement(mvtCharge.id);
await store.validerMouvement(mvtCharge.id, referent.id);

const mvtTransfert = await store.creerMouvement({
  type: 'TRANSFERT', bouteilleSrcId: source.id, bouteilleDstId: destination.id,
  peseeAvantKg: 13, peseeApresKg: 12, technicien: 'Testeur'
});
await store.soumettreMouvement(mvtTransfert.id);
await store.validerMouvement(mvtTransfert.id, referent.id);

// Contre-écriture de la charge, puis pesée manuelle.
await store.annulerParContreEcriture(
  mvtCharge.id, 'Erreur de saisie (test vie)', referent.id);
await store.peserBouteille(source.id, 24, 'Testeur');

const [bouteilles, mouvements, journal] = await Promise.all([
  store.getBouteilles(), store.getMouvements(), store.getJournalAudit()
]);
const bSource = bouteilles.find((b) => b.id === source.id);
const vie = construireVieBouteille(
  { bouteille: bSource, mouvements, journal, fluides });

verifier('parcours réel : 3 mouvements opposables pour la source (charge + transfert + contre-écriture)',
  vie.nbMouvements === 3);
verifier('parcours réel : la création et la pesée sont au journal de la chronologie',
  vie.evenements.some((e) => e.sousType === 'CREATION_BOUTEILLE')
  && vie.evenements.some((e) => e.sousType === 'PESEE_BOUTEILLE'
      && String(e.detail).includes('24')));
verifier('parcours réel : la teq des mouvements est au PRP figé',
  vie.evenements.filter((e) => e.type === 'MOUVEMENT')
    .every((e) => e.prpEstFige === true && e.teqCo2 != null));

const evtTransfert = vie.evenements.find(
  (e) => e.sousType === 'TRANSFERT');
verifier('parcours réel : le transfert vide la source de 1 kg',
  PROCHE(evtTransfert.variationKg, -1));

const vieDestination = construireVieBouteille(
  { bouteille: bouteilles.find((b) => b.id === destination.id),
    mouvements, journal, fluides });
const evtTransfertDst = vieDestination.evenements.find(
  (e) => e.sousType === 'TRANSFERT');
verifier('parcours réel : le MÊME transfert remplit la destination de 1 kg',
  PROCHE(evtTransfertDst.variationKg, 1));

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
