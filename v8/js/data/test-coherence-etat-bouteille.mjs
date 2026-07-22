// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test CM-3 — cohérence état↔type de la bouteille (cycle matière).
// Exécution : node v8/js/data/test-coherence-etat-bouteille.mjs [demo|local]
//
// La règle métier (plan docs/PLAN-P0-3-4-CYCLE-MATIERE.md §2) :
//   - bouteille NEUVE = fluide ACHETÉ → état VIERGE / RECYCLÉ / RÉGÉNÉRÉ ;
//   - bouteille RÉCUPÉRATION = fluide des machines → RÉCUPÉRÉ / MÉLANGE /
//     DÉCHET / DOUTEUX ;
//   - AUCUNE requalification interne : une récupération ne « devient » jamais
//     recyclée ou régénérée (le régénéré s'ACHÈTE certifié fournisseur).
// Volets : A. gardes à la création ; B. gardes à la mise à jour (pas de
// verrou de l'état d'une NEUVE, pas de promotion interne) ; C. certificat
// fournisseur en pièce jointe ; D. une NEUVE régénérée est chargeable.
//
// Suite DOUBLÉE (demo puis local) — la garde vit dans les DEUX stores.
// Node ≥ 18, sans DOM.
// ============================================================

const NOM_STORE = process.argv[2] ?? 'demo';

async function fabriquerStore(nom) {
  switch (nom) {
    case 'demo': {
      const { creerStore } = await import('./datastore.js');
      const store = await creerStore();
      await store.init();
      return store;
    }
    case 'local': {
      const { creerStoreDeTest } =
        await import('../../../server/harnais-contrat.mjs');
      return creerStoreDeTest(); // rendu DÉJÀ initialisé
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

// Attend un REFUS ; vérifie que le message porte l'extrait attendu.
async function refuse(libelle, fn, extrait) {
  try {
    await fn();
    verifier(libelle, false, 'aucune erreur levée');
  } catch (e) {
    const msg = String((e && e.message) || e);
    verifier(libelle, extrait ? msg.includes(extrait) : true,
      `message = ${msg}`);
  }
}

const store = await fabriquerStore(NOM_STORE);
const fluides = await store.getFluides();
const FLUIDE = fluides[0].code;

// Petit PDF valide (signature %PDF) pour la pièce jointe certificat.
const PDF_BASE64 = Buffer.from(
  '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n', 'latin1'
).toString('base64');

// ============================================================
// A. Gardes à la CRÉATION
// ============================================================
console.log(`--- A. création (${NOM_STORE}) ---`);

const neuveRegeneree = await store.createBouteille({
  type: 'NEUVE', fluide: FLUIDE, etatFluide: 'REGENERE',
  tareKg: 10, masseBruteKg: 22, contenanceMaxKg: 20
});
verifier('NEUVE régénérée (fluide acheté certifié) : saisie acceptée',
  neuveRegeneree.etatFluide === 'REGENERE');

const neuveRecyclee = await store.createBouteille({
  type: 'NEUVE', fluide: FLUIDE, etatFluide: 'RECYCLE',
  tareKg: 10, masseBruteKg: 20, contenanceMaxKg: 20
});
verifier('NEUVE recyclée (fluide acheté certifié) : saisie acceptée',
  neuveRecyclee.etatFluide === 'RECYCLE');

const neuveDefaut = await store.createBouteille({
  type: 'NEUVE', fluide: FLUIDE, tareKg: 10, masseBruteKg: 20,
  contenanceMaxKg: 20
});
verifier('NEUVE sans état → défaut VIERGE',
  neuveDefaut.etatFluide === 'VIERGE');

const recupDefaut = await store.createBouteille({
  type: 'RECUPERATION', fluide: FLUIDE, tareKg: 8, masseBruteKg: 8,
  contenanceMaxKg: 15
});
verifier('RÉCUPÉRATION sans état → défaut RECUPERE',
  recupDefaut.etatFluide === 'RECUPERE');

await refuse('RÉCUPÉRATION + RECYCLE refusée (pas de traitement interne)',
  () => store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE, etatFluide: 'RECYCLE',
    tareKg: 8, masseBruteKg: 8, contenanceMaxKg: 15
  }), 'requalification');

await refuse('RÉCUPÉRATION + REGENERE refusée (le régénéré s’achète)',
  () => store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE, etatFluide: 'REGENERE',
    tareKg: 8, masseBruteKg: 8, contenanceMaxKg: 15
  }), 'requalification');

await refuse('NEUVE + RECUPERE refusée (une neuve n’est pas du récupéré)',
  () => store.createBouteille({
    type: 'NEUVE', fluide: FLUIDE, etatFluide: 'RECUPERE',
    tareKg: 10, masseBruteKg: 20, contenanceMaxKg: 20
  }), 'NEUVE');

await refuse('NEUVE + MELANGE refusée (rétro-compat garde R2)',
  () => store.createBouteille({
    type: 'NEUVE', fluide: FLUIDE, etatFluide: 'MELANGE',
    tareKg: 10, masseBruteKg: 20, contenanceMaxKg: 20
  }), 'MÉLANGE');

// ============================================================
// B. Gardes à la MISE À JOUR
// ============================================================
console.log(`--- B. mise à jour (${NOM_STORE}) ---`);

// On ne verrouille PAS l'état d'une NEUVE : VIERGE → REGENERE autorisé.
const neuveEvolutive = await store.createBouteille({
  type: 'NEUVE', fluide: FLUIDE, etatFluide: 'VIERGE',
  tareKg: 10, masseBruteKg: 20, contenanceMaxKg: 20
});
const neuvePromue = await store.updateBouteille(neuveEvolutive.id,
  { etatFluide: 'REGENERE' });
verifier('NEUVE VIERGE → REGENERE : autorisé (état d’une neuve non verrouillé)',
  neuvePromue.etatFluide === 'REGENERE');

// Promotion INTERNE d'une récupération en recyclé/régénéré : refusée.
await refuse('RÉCUPÉRATION → RECYCLE via update refusée (promotion interne)',
  () => store.updateBouteille(recupDefaut.id, { etatFluide: 'RECYCLE' }),
  'requalification');

// Un patch neutre (ne touche ni type ni état) ne revalide pas l'existant.
const recupRenommee = await store.updateBouteille(recupDefaut.id,
  { numeroReel: 'BOUT-XYZ-42' });
verifier('update neutre (numéro réel) sur une récupération : accepté',
  recupRenommee.numeroReel === 'BOUT-XYZ-42'
  && recupRenommee.etatFluide === 'RECUPERE');

// ============================================================
// C. Certificat fournisseur en PIÈCE JOINTE (bouteille NEUVE régénérée)
// ============================================================
console.log(`--- C. certificat fournisseur (${NOM_STORE}) ---`);

const certif = await store.ajouterPieceJointe({
  entiteType: 'BOUTEILLE', entiteId: neuveRegeneree.id,
  categorie: 'CERTIFICAT', nomFichier: 'certificat-regeneration.pdf',
  mimeType: 'application/pdf', base64: PDF_BASE64
});
verifier('certificat fournisseur attaché à la bouteille NEUVE régénérée',
  certif != null && certif.id != null
  && certif.categorie === 'CERTIFICAT'
  && certif.entiteType === 'BOUTEILLE');

const pjBouteille = await store.listerPiecesJointes('BOUTEILLE', neuveRegeneree.id);
verifier('le certificat est bien listé sur la bouteille',
  Array.isArray(pjBouteille)
  && pjBouteille.some((p) => p.categorie === 'CERTIFICAT'));

// ============================================================
// D. Une NEUVE régénérée est CHARGEABLE (mise en service)
// ============================================================
console.log(`--- D. charge depuis la NEUVE régénérée (${NOM_STORE}) ---`);

const referent = await store.createPersonne({
  nom: 'Matière', prenom: 'Référent', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
const machine = await store.createMachine({
  designation: 'Machine charge régénérée', fluide: FLUIDE,
  chargeNominaleKg: 10, operateur: 'Testeur'
});
const brouillon = await store.creerMouvement({
  type: 'MISE_EN_SERVICE', machineId: machine.id,
  bouteilleSrcId: neuveRegeneree.id, peseeAvantKg: 12, peseeApresKg: 9,
  technicien: 'Testeur'
});
await store.soumettreMouvement(brouillon.id);
await store.validerMouvement(brouillon.id, referent.id);

const mouvements = await store.getMouvements();
const valide = mouvements.find((m) => m.id === brouillon.id);
verifier('charge (mise en service) depuis la NEUVE régénérée : VALIDE',
  valide != null && valide.statut === 'VALIDE');

const alertes = await store.getAlertes();
verifier('la charge depuis la NEUVE régénérée ne déclenche AUCUNE alerte de réemploi',
  !alertes.some((a) => String(a.id).startsWith(`alr-reemploi-${neuveRegeneree.id}`)));

// ============================================================
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
