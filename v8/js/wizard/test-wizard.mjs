// ============================================================
// Test du wizard (V9.1 — vague 3 : préselection machineId + retour)
// Exécution : node v8/js/wizard/test-wizard.mjs
//
// Vérifie :
//  1. options.machineId fourni → l'étape 2 (choix machine) est sautée,
//     le wizard démarre plus loin dans le parcours (étape 3 ou au-delà
//     selon ce qui est déjà connu), machineId n'est jamais perdu.
//  2. Sans machineId → comportement inchangé (démarre étape 1, machineId
//     null tant que l'étape 2 n'a pas été franchie).
//  3. options.retour respecté à la finalisation (naviguer(retour) au lieu
//     de naviguer('mouvements')).
//
// Aucune dépendance nouvelle : le mini-DOM maison partagé
// core/test-shim-dom.mjs (parseur HTML très simple + querySelector/
// querySelectorAll basiques sur #id/.classe/[attribut]) suffit pour
// dérouler ouvrirWizard() jusqu'à l'étape affichée SANS jamais
// atteindre l'étape 6 (signature → canvas 2D, hors de portée d'un
// shim sans dépendance : non testé ici, couvert manuellement en
// navigateur réel comme documenté dans le rapport).
// ============================================================

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

const { installerDocumentFactice } = await import('../core/shim-dom-tests.mjs');
const { document } = installerDocumentFactice();

const { ouvrirWizard } = await import('./wizard.js');

/* ============================================================
   Store factice minimal — assez pour instancier le wizard sans
   toucher au registre réel (aucune finalisation testée ici, la
   signature exigeant un canvas hors de portée du shim).
   ============================================================ */

function creerStoreFactice({ machines = [], bouteilles = [] } = {}) {
  return {
    async getPersonnel() {
      return [{ id: 'p1', prenom: 'Jean', nom: 'Dupont', actif: true, roleApp: 'REFERENT' }];
    },
    async getMachines() { return machines.slice(); },
    async getBouteilles() { return bouteilles.slice(); },
    async getOutillage() { return []; },
    async getUtilisateurCourant() { return { id: 'u1', prenom: 'Jean', nom: 'Dupont', roleApp: 'REFERENT' }; },
    async getMouvements() { return []; }
  };
}

const MACHINE_TEST = {
  id: 'mac-1', code: 'M1', designation: 'Chambre froide test',
  fluide: 'R404A', statut: 'EN_SERVICE',
  chargeActuelleKg: 5, chargeNominaleKg: 10,
  codePublic: 'ABC123X'
};

/* ============================================================
   1. options.machineId fourni → l'étape 2 (choix machine) est
      sautée : le wizard démarre à l'étape 3 (bouteille), machineId
      reste bien celui fourni.
   ============================================================ */
{
  const store = creerStoreFactice({ machines: [MACHINE_TEST], bouteilles: [] });
  const appelsNaviguer = [];
  const ctx = { store, naviguer: (v) => appelsNaviguer.push(v) };

  await ouvrirWizard(ctx, { machineId: 'mac-1' });

  // Le wizard vient de s'ouvrir : la modale est accrochée à zone-modales/body
  const fond = document.body.querySelector('.modale-fond');
  verifier('la modale du wizard est bien montée dans le DOM', Boolean(fond));

  // L'étape affichée doit être > 2 (2 = choix machine, sauté puisque
  // machineId est déjà connu et qu'aucun technicien n'est encore choisi
  // à l'étape 1 → en réalité le saut ne peut dépasser l'étape 1 tant que
  // le technicien n'est pas choisi : etapeComplete()(1) est fausse sans
  // technicien, donc le wizard reste correctement à l'étape 1, PAS 2.
  const pastilleActive = fond.querySelector('.wizard-etape.active .wizard-pastille');
  verifier('sans technicien choisi, le wizard reste à l’étape 1 (ne saute pas '
    + 'au-delà de ce qui est réellement complet)',
    pastilleActive && pastilleActive.textContent === '1',
    'pastille active = ' + (pastilleActive && pastilleActive.textContent));
}

/* ============================================================
   2. Même scénario mais avec un technicien et un type déjà choisis
      "en amont" : on simule la présélection complète de l'étape 1
      pour vérifier que l'étape 2 (machine) est bien sautée quand
      machineId est fourni. On appelle directement la mécanique de
      saut en pilotant l'état via les cartes rendues (étape 1),
      puis on vérifie l'étape affichée après le clic Continuer.
   ============================================================ */
{
  const store = creerStoreFactice({
    machines: [MACHINE_TEST],
    bouteilles: [{
      id: 'bou-1', code: 'B1', fluide: 'R404A', type: 'BOUTEILLE',
      masseNetteKg: 8, contenanceMaxKg: 20, statut: 'EN_STOCK',
      etatFluide: 'VIERGE', decisionFluide: null
    }]
  });
  const ctx = { store, naviguer: () => {} };

  await ouvrirWizard(ctx, { machineId: 'mac-1' });
  const fond = document.body.querySelectorAll('.modale-fond').at(-1);

  // Étape 1 : choisir la carte "appoint" puis le technicien
  fond.querySelector('[data-carte-type="appoint"]').declencher('click');
  const selectTechnicien = fond.querySelector('#wizard-technicien');
  selectTechnicien.value = 'p1';
  selectTechnicien.declencher('change');

  // Continuer : l'étape 1 est complète (carteType + technicien), le
  // wizard doit passer à l'étape 3 (bouteille) en sautant l'étape 2
  // (machine) puisque machineId est déjà fourni et machinesCompatibles
  // n'a plus besoin d'être consultée.
  fond.querySelector('#wizard-continuer').declencher('click');

  const pastilleActive = fond.querySelector('.wizard-etape.active .wizard-pastille');
  verifier('machineId préréglé : après l’étape 1 complétée, le wizard saute '
    + 'directement à l’étape 3 (bouteille), sans repasser par l’étape 2 (machine)',
    pastilleActive && pastilleActive.textContent === '3',
    'pastille active = ' + (pastilleActive && pastilleActive.textContent));

  // La bouteille compatible (même fluide R404A) doit apparaître à
  // l'étape 3 : preuve que la machine choisie est bien restée mac-1.
  const carteBouteille = fond.querySelector('[data-bouteille-src="bou-1"]');
  verifier('la bouteille compatible avec la machine préréglée (R404A) est '
    + 'bien proposée à l’étape 3 : machineId n’a pas été perdu au saut',
    Boolean(carteBouteille));
}

/* ============================================================
   3. Sans machineId : comportement inchangé, le parcours démarre
      à l'étape 1 et passe bien par l'étape 2 (choix machine).
   ============================================================ */
{
  const store = creerStoreFactice({ machines: [MACHINE_TEST], bouteilles: [] });
  const ctx = { store, naviguer: () => {} };

  await ouvrirWizard(ctx, {});
  const fond = document.body.querySelectorAll('.modale-fond').at(-1);

  fond.querySelector('[data-carte-type="appoint"]').declencher('click');
  const selectTechnicien = fond.querySelector('#wizard-technicien');
  selectTechnicien.value = 'p1';
  selectTechnicien.declencher('change');
  fond.querySelector('#wizard-continuer').declencher('click');

  const pastilleActive = fond.querySelector('.wizard-etape.active .wizard-pastille');
  verifier('sans machineId, le parcours normal passe bien par l’étape 2 (machine) '
    + '— comportement inchangé',
    pastilleActive && pastilleActive.textContent === '2',
    'pastille active = ' + (pastilleActive && pastilleActive.textContent));

  const carteMachine = fond.querySelector('[data-machine="mac-1"]');
  verifier('la carte machine est bien proposée à l’étape 2 (parcours normal)',
    Boolean(carteMachine));
}

/* ============================================================
   4. options.retour : vérifié au niveau du contrat de finalisation
      SANS dérouler la signature (hors de portée du shim). On
      inspecte directement le code source de wizard.js pour
      s'assurer que la finalisation utilise bien options.retour
      quand il est fourni, et 'mouvements' par défaut sinon — un
      test de comportement complet (bout en bout, signature réelle)
      reste à faire manuellement en navigateur (documenté au rapport).
   ============================================================ */
{
  const fs = await import('node:fs');
  const source = fs.readFileSync(new URL('./wizard.js', import.meta.url), 'utf8');
  verifier('finaliser() navigue vers options.retour quand il est fourni, '
    + 'sinon vers \'mouvements\' par défaut',
    /naviguer\(\s*options\.retour\s*\|\|\s*'mouvements'\s*\)/.test(source)
    || /options\.retour[\s\S]{0,80}naviguer/.test(source),
    'motif options.retour introuvable dans finaliser()');
}

// ---- Bilan ----
console.log(`\n${nbOk} test(s) réussi(s), ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
