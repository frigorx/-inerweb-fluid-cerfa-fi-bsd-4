// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Test CM-4c — surfaces du cycle matière :
//   A. optionsEtatPour (bouteille-form) : partition état↔type miroir
//      du garde-fou store CM-3 (NEUVE = fluide acheté ; RÉCUPÉRATION =
//      fluide des machines) + préservation des états de décision.
//   B. zonePiecesJointes categorieSeule : une zone dédiée n'affiche
//      QUE sa catégorie (certificat fournisseur).
//   C. blocAvoirOrigine (fiche-bouteille) : l'avoir par machine
//      d'origine est affiché pour une RÉCUPÉRATION, net négatif
//      MONTRÉ (jamais masqué), rien pour une NEUVE.
// Exécution : node v8/js/modales/test-bouteille-form.mjs
// Node ≥ 18, mini-DOM maison (shim-dom-tests).
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

const { optionsEtatPour } = await import('./bouteille-form.js');
const { zonePiecesJointes } = await import('../composants/pieces-jointes.js');
const { blocAvoirOrigine } = await import('../views/fiche-bouteille.js');

// ============================================================
// A. optionsEtatPour — partition état↔type
// ============================================================
console.log('--- A. optionsEtatPour (partition) ---');

{
  const neuve = optionsEtatPour('NEUVE', 'VIERGE');
  verifier('NEUVE : propose VIERGE, RECYCLE (acheté) et REGENERE (acheté)',
    neuve.includes('value="VIERGE"') && neuve.includes('value="RECYCLE"')
    && neuve.includes('value="REGENERE"') && neuve.includes('acheté certifié'));
  verifier('NEUVE : ne propose JAMAIS RECUPERE ni MELANGE',
    !neuve.includes('value="RECUPERE"') && !neuve.includes('value="MELANGE"'));

  const recup = optionsEtatPour('RECUPERATION', 'RECUPERE');
  verifier('RÉCUPÉRATION : propose RECUPERE et MELANGE',
    recup.includes('value="RECUPERE"') && recup.includes('value="MELANGE"'));
  verifier('RÉCUPÉRATION : ne propose JAMAIS le recyclé/régénéré (pas de traitement interne)',
    !recup.includes('value="RECYCLE"') && !recup.includes('value="REGENERE"')
    && !recup.includes('value="VIERGE"'));

  // Bascule de type : le reliquat de l'autre partition retombe au défaut.
  const bascule = optionsEtatPour('RECUPERATION', 'VIERGE');
  verifier('bascule NEUVE → RÉCUPÉRATION avec « Vierge » : repli sur RECUPERE',
    !bascule.includes('value="VIERGE"')
    && bascule.includes('value="RECUPERE" selected'));
  const basculeInverse = optionsEtatPour('NEUVE', 'MELANGE');
  verifier('bascule RÉCUPÉRATION → NEUVE avec « Mélange » : repli sur VIERGE',
    !basculeInverse.includes('value="MELANGE"')
    && basculeInverse.includes('value="VIERGE" selected'));

  // États posés par une DÉCISION : préservés en édition (l'écran ne ment pas).
  const dechet = optionsEtatPour('RECUPERATION', 'DECHET');
  verifier('fiche RÉCUPÉRATION à l’état DECHET : état préservé et sélectionné',
    dechet.includes('value="DECHET" selected'));
  verifier('mais DECHET jamais proposé sur une fiche saine',
    !optionsEtatPour('RECUPERATION', 'RECUPERE').includes('value="DECHET"'));

  // Revue adversariale 22/07 (BLOQUANT corrigé) : une fiche HÉRITÉE
  // incohérente (NEUVE+RECUPERE, créable avant CM-3) doit être AFFICHÉE
  // telle quelle au rendu initial — jamais silencieusement basculée sur
  // VIERGE (sinon enregistrer un champ sans rapport réécrirait l'état
  // réel sans trace). Le store, lui, refusera tant que non résolue.
  const heritee = optionsEtatPour('NEUVE', 'RECUPERE', true);
  verifier('fiche héritée NEUVE+RECUPERE : état enregistré PRÉSERVÉ au rendu initial',
    heritee.includes('value="RECUPERE" selected'), heritee);
  verifier('… et jamais de substitution silencieuse par VIERGE',
    !heritee.includes('value="VIERGE" selected'));
  verifier('la bascule VOLONTAIRE de type garde son repli (pas de préservation)',
    !optionsEtatPour('NEUVE', 'RECUPERE').includes('value="RECUPERE"'));
}

// ============================================================
// B. zonePiecesJointes — categorieSeule (zone certificat dédiée)
// ============================================================
console.log('--- B. zone PJ dédiée à une catégorie ---');

{
  const PIECES = [
    { id: 'pj-1', categorie: 'CERTIFICAT', nomFichier: 'certificat-regen.pdf',
      taille: 1000, dateAjout: '2026-07-22' },
    { id: 'pj-2', categorie: 'PHOTO_PESEE', nomFichier: 'pesee.png',
      taille: 2000, dateAjout: '2026-07-22' }
  ];
  const storeFactice = {
    async listerPiecesJointes() { return PIECES.slice(); }
  };
  const hote = document.createElement('div');

  // NB : le mini-DOM ne re-sérialise pas les enfants dans l'innerHTML du
  // parent — on lit directement la sous-zone .pj-liste.
  const zoneCertif = zonePiecesJointes(hote, { store: storeFactice }, {
    entiteType: 'BOUTEILLE', entiteId: 'bou-1',
    categorie: 'CERTIFICAT', categorieSeule: true
  });
  await zoneCertif.rafraichir();
  const listeCertif = hote.querySelector('.pj-liste').innerHTML;
  verifier('categorieSeule : la zone certificat liste le certificat',
    listeCertif.includes('certificat-regen.pdf'), listeCertif);
  verifier('categorieSeule : la zone certificat ne liste PAS la photo de pesée',
    !listeCertif.includes('pesee.png'));

  const hoteTout = document.createElement('div');
  const zoneTout = zonePiecesJointes(hoteTout, { store: storeFactice }, {
    entiteType: 'BOUTEILLE', entiteId: 'bou-1'
  });
  await zoneTout.rafraichir();
  const listeTout = hoteTout.querySelector('.pj-liste').innerHTML;
  verifier('sans categorieSeule : comportement historique, tout est listé',
    listeTout.includes('certificat-regen.pdf')
    && listeTout.includes('pesee.png'), listeTout);
}

// ============================================================
// C. blocAvoirOrigine — fiche bouteille
// ============================================================
console.log('--- C. bloc « fluide d’origine machine » ---');

{
  const MOUVEMENTS = [
    { id: 'r1', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      machineId: 'mac-1', machineLabel: 'M1 — Chambre froide',
      bouteilleDstId: 'bou-r', quantiteKg: -2 },
    { id: 'r2', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      machineId: 'mac-2', machineLabel: 'M2 — Vitrine',
      bouteilleDstId: 'bou-r', quantiteKg: -1 },
    // Réemploi de 3 kg sur M2 pour 1 kg récupéré → net M2 = −2 (anomalie)
    { id: 'c1', statut: 'VALIDE', type: 'CHARGE_APPOINT',
      machineId: 'mac-2', machineLabel: 'M2 — Vitrine',
      bouteilleSrcId: 'bou-r', quantiteKg: 3 }
  ];
  const recup = { id: 'bou-r', type: 'RECUPERATION' };

  const html = blocAvoirOrigine(recup, MOUVEMENTS);
  verifier('RÉCUPÉRATION : le bloc affiche le disponible par machine (M1 = 2 kg)',
    html.includes('M1 — Chambre froide') && html.includes('2,00')
    && html.includes('disponibles pour un réemploi'));
  verifier('le net NÉGATIF est MONTRÉ, jamais masqué (M2 = −2, anomalie)',
    html.includes('M2 — Vitrine') && html.includes('-2,00')
    && html.includes('au-delà du récupéré'));

  verifier('bouteille NEUVE : aucun bloc (le fluide acheté n’a pas d’origine machine)',
    blocAvoirOrigine({ id: 'bou-n', type: 'NEUVE' }, MOUVEMENTS) === '');

  const htmlVide = blocAvoirOrigine({ id: 'bou-x', type: 'RECUPERATION' }, []);
  verifier('RÉCUPÉRATION sans récupération : état vide explicite',
    htmlVide.includes('Aucun lot d’origine'));
}

// ============================================================
// D. P1-2 (AF-6) — fluidesProposables : un fluide DÉSACTIVÉ sort des
// listes de saisie, mais la valeur DÉJÀ ENREGISTRÉE est préservée (même
// principe que la préservation des états hors liste ci-dessus : jamais
// de substitution silencieuse d'une donnée réelle).
// ============================================================
console.log('--- D. fluidesProposables (fluides désactivés) ---');

{
  const { fluidesProposables } = await import('../core/utils.js');
  const REFERENTIEL = [
    { code: 'R-32', actif: true },
    { code: 'R-22', actif: false },
    { code: 'R-410A' } // fiche antérieure à la migration 31 : pas de champ
  ];
  const codes = (liste) => liste.map((f) => f.code).join(',');

  verifier('un fluide désactivé n’est pas proposé à la saisie',
    codes(fluidesProposables(REFERENTIEL)) === 'R-32,R-410A');
  verifier('le fluide DÉJÀ ENREGISTRÉ sur la fiche reste proposé même désactivé',
    codes(fluidesProposables(REFERENTIEL, 'R-22')) === 'R-32,R-22,R-410A');
  verifier('l’ordre du référentiel est conservé',
    codes(fluidesProposables(REFERENTIEL, 'R-22')).startsWith('R-32,R-22'));
  verifier('un fluide sans champ actif (base antérieure) reste proposé',
    fluidesProposables(REFERENTIEL).some((f) => f.code === 'R-410A'));
  verifier('un code retenu inconnu du référentiel n’invente rien',
    codes(fluidesProposables(REFERENTIEL, 'R-999')) === 'R-32,R-410A');
  verifier('liste absente : aucun plantage, tableau vide',
    fluidesProposables(null).length === 0
    && fluidesProposables(undefined, 'R-22').length === 0);
}

// ============================================================
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
