// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// MODE EXERCICE — preuve du cycle de vie (13/08/2026, plan
// docs/PLAN-MODE-EXERCICE.md).
//
// Deux plans de preuve :
//   1. Le CYCLE local (stockage factice injecté) : activation → semis →
//      réinitialisation → effacement TOTAL — « toute trace a été
//      détruite » se mesure : le stockage est VIDE.
//   2. L'ÉTANCHÉITÉ de bout en bout (le tir de faisabilité du 13/08,
//      devenu suite) : un registre RÉEL jetable → photo → bac à sable
//      DemoStore → le parc y est, la chaîne est verte, le travail du bac
//      n'atteint JAMAIS le registre réel.
// Exécution : node v8/js/data/test-mode-exercice.mjs — bases jetables.
// ============================================================

import {
  estActif, activer, doitSemer, photoASemer, marquerSeme, dateExercice,
  reinitialiser, terminerEtToutEffacer,
  CLE_BAC, CLE_DRAPEAU, CLE_PHOTO, CLE_DATE, CLE_A_SEMER
} from './mode-exercice.js';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Stockage factice : l'API localStorage sur une Map (injecté partout). */
function stockageFactice() {
  const carte = new Map();
  return {
    getItem: (cle) => (carte.has(cle) ? carte.get(cle) : null),
    setItem: (cle, valeur) => carte.set(cle, String(valeur)),
    removeItem: (cle) => carte.delete(cle),
    get taille() { return carte.size; }
  };
}

// ============================================================
// 1. Le cycle local, sur stockage factice
// ============================================================
{
  const stock = stockageFactice();
  verifier('à froid : le mode exercice est INACTIF', !estActif(stock));
  verifier('à froid : rien à semer', !doitSemer(stock));

  stock.setItem(CLE_BAC, '{"exercice":"précédent"}');
  activer('{"photo":"du réel"}', '2026-08-13T15:00:00.000Z', stock);
  verifier('activation : le drapeau est posé', estActif(stock));
  verifier('activation : la photo et sa date sont conservées',
    photoASemer(stock) === '{"photo":"du réel"}'
    && dateExercice(stock) === '2026-08-13T15:00:00.000Z');
  verifier('activation : le bac d’un exercice PRÉCÉDENT est effacé',
    stock.getItem(CLE_BAC) === null);
  verifier('activation : le semis est demandé', doitSemer(stock));

  marquerSeme(stock);
  verifier('semis fait : plus rien à semer (l’exercice vit sa vie)',
    !doitSemer(stock));

  stock.setItem(CLE_BAC, '{"travail":"en cours"}');
  reinitialiser(stock);
  verifier('réinitialisation : le bac est effacé, le semis re-demandé, '
    + 'la photo d’origine INTACTE',
  stock.getItem(CLE_BAC) === null && doitSemer(stock)
    && photoASemer(stock) === '{"photo":"du réel"}');

  stock.setItem(CLE_BAC, '{"travail":"repris"}');
  terminerEtToutEffacer(stock);
  verifier('⭐ TERMINER : toute trace est détruite (stockage VIDE)',
    stock.taille === 0,
    `clés restantes : ${stock.taille}`);
  verifier('après effacement : le mode est inactif, rien à semer',
    !estActif(stock) && !doitSemer(stock) && photoASemer(stock) === null);

  verifier('activer sans photo REFUSE (le mode ne démarre pas à vide)',
    (() => {
      try { activer('', '2026-08-13', stock); return false; }
      catch { return true; }
    })());
  verifier('les clés du cycle sont toutes distinctes',
    new Set([CLE_BAC, CLE_DRAPEAU, CLE_PHOTO, CLE_DATE, CLE_A_SEMER])
      .size === 5);
}

// ============================================================
// 2. Étanchéité de bout en bout : registre réel → photo → bac à sable
//    (le tir de faisabilité du 13/08, devenu filet permanent)
// ============================================================
{
  const { creerStoreDeTest } =
    await import('../../../server/harnais-contrat.mjs');
  const reel = await creerStoreDeTest();
  await reel.updateEtablissement({
    raisonSociale: 'Atelier d’essai exercice',
    numAttestationCapacite: 'AC-EXO',
    categoriesAutorisees: ['I'],
    activitesAutorisees: ['MISE_EN_SERVICE', 'MAINTENANCE', 'CONTROLE',
      'RECUPERATION']
  });
  const valideur = await reel.createPersonne({
    nom: 'Formateur', prenom: 'Exo', typePersonne: 'ENSEIGNANT',
    roleApp: 'REFERENT'
  });
  const machine = await reel.createMachine({
    designation: 'Chambre froide REELLE (exo)', fluide: 'R-410A',
    chargeNominaleKg: 12, chargeActuelleKg: 8, operateur: 'Formateur'
  });
  const bouteille = await reel.createBouteille({
    type: 'NEUVE', fluide: 'R-410A', etatFluide: 'VIERGE',
    tareKg: 10, masseBruteKg: 40, contenanceMaxKg: 50, proprietaire: 'Atelier'
  });
  const brouillon = await reel.creerMouvement({
    mode: 'FORMATION', type: 'CHARGE_APPOINT', date: '2026-08-13',
    machineId: machine.id, bouteilleSrcId: bouteille.id, fluide: 'R-410A',
    peseeAvantKg: 40, peseeApresKg: 38, causeMouvement: 'Essai exercice',
    technicien: 'Formateur'
  });
  await reel.soumettreMouvement(brouillon.id);
  await reel.validerMouvement(brouillon.id, valideur.id);

  const photo = await reel.exporterJSON();

  const { creerDemoStore } = await import('./demo-store.js');
  const bac = creerDemoStore();
  if (bac.init) await bac.init();
  const adopte = await bac.importerJSON(photo);
  verifier('la photo du registre réel est ADOPTÉE par le bac à sable',
    adopte === true);
  verifier('le parc réel est visible au bac (machine, écriture scellée)',
    (await bac.getMachines())
      .some((m) => m.designation === 'Chambre froide REELLE (exo)')
    && (await bac.getMouvements()).some((mv) => mv.statut === 'VALIDE'));
  const chaine = await bac.verifierChaineHash();
  verifier('la chaîne d’empreintes de la photo reste VERTE au bac',
    chaine.ok === true, JSON.stringify(chaine));

  // Le travail d'exercice au bac n'atteint JAMAIS le registre réel.
  await bac.createMachine({
    designation: 'Machine EXERCICE (jetable)', fluide: 'R-410A',
    chargeNominaleKg: 5, chargeActuelleKg: 5, operateur: 'Stagiaire'
  });
  verifier('⭐ ÉTANCHÉITÉ : le registre réel ignore le travail du bac',
    !(await reel.getMachines())
      .some((m) => m.designation.includes('EXERCICE')));
  verifier('… et le bac, lui, le porte (les deux mondes vivent)',
    (await bac.getMachines())
      .some((m) => m.designation.includes('EXERCICE')));
}

// ============================================================
// Verdict
// ============================================================
console.log('');
console.log(`${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Mode exercice (cycle et étanchéité) : tout est vert.');
