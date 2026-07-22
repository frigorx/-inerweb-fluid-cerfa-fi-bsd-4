// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test des « dossiers de fuite » (brique ③).
// Exécution : node v8/js/data/test-dossiers-fuite.mjs [demo|local]
//
// Volet A (pur, données forgées) : statuts OUVERTE/REPAREE/FERMEE
// alignés sur la règle de fermeture des stores (un CONFORME seul ne
// referme jamais ; à date égale le contrôle est réputé postérieur à
// la réparation), échéance de suivi à 30 jours et retard, fenêtre
// des mouvements pendant la fuite, tri intra-jour cohérent avec les
// règles R3c/R4, dossiers multiples triés du plus récent au plus
// ancien, zéro fuite d'une autre machine.
// Volet B (store réel via le contrat) : un parcours détection →
// récupération → réparation tracée → complément → contrôle de suivi
// CONFORME produit UN dossier FERMÉ dont la chronologie est complète
// et ordonnée. Joué demo PUIS local = preuve de parité.
//
// ATTENTION : le volet B ÉCRIT dans le store cible — contre un store
// persistant, base JETABLE uniquement (le harnais local s'en charge).
// Node ≥ 18, sans DOM.
// ============================================================

import {
  construireDossiersFuite, construireDossierFuite,
  ajouterUnMoisCivil, LIBELLES_STATUT_FUITE
} from './dossiers-fuite.js';

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

/** Date ISO à `n` jours d'aujourd'hui (négatif = passé). */
function dateRelative(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// A. Volet PUR — statuts, fenêtre, tri
// ============================================================
console.log('--- A. dossiers de fuite (pur) ---');

const MACHINE = { id: 'mac-1' };

{
  // Aucune fuite → aucun dossier.
  const r = construireDossiersFuite({
    machine: MACHINE,
    controles: [{ id: 'c0', machineId: 'mac-1', date: '2026-05-01',
      resultat: 'CONFORME' }],
    mouvements: [], aujourdhui: '2026-06-11'
  });
  verifier('machine sans fuite : zéro dossier',
    r.dossiers.length === 0 && r.nbOuvertes === 0 && r.nbFermees === 0);
}

{
  // Fuite SANS réparation tracée → OUVERTE, même si un CONFORME
  // postérieur existe (garde anti-contournement de la règle R3c).
  const controles = [
    { id: 'cf', machineId: 'mac-1', date: '2026-06-01', resultat: 'FUITE',
      localisationFuite: 'Raccord BP', methode: 'DIRECTE',
      operateur: 'Un technicien' },
    { id: 'cc', machineId: 'mac-1', date: '2026-06-05', resultat: 'CONFORME' }
  ];
  const r = construireDossiersFuite({
    machine: MACHINE, controles, mouvements: [], aujourdhui: '2026-06-11'
  });
  const d = r.dossiers[0];
  verifier('fuite sans réparation : dossier OUVERTE',
    r.dossiers.length === 1 && d.statut === 'OUVERTE'
    && r.nbOuvertes === 1);
  verifier('un CONFORME sans réparation tracée ne referme JAMAIS',
    d.controleCloture === null && d.dateFermeture === null);
  verifier('le CONFORME non refermant apparaît en contrôle intermédiaire',
    d.evenements.some((e) => e.type === 'CONTROLE'
      && e.controleId === 'cc'
      && e.titre.includes('ne referme pas')));
  verifier('dossier ouvert : durée comptée jusqu’à aujourd’hui (10 j)',
    d.dureeJours === 10);
  verifier('détection : localisation et méthode portées',
    d.localisation === 'Raccord BP' && d.methode === 'DIRECTE'
    && d.evenements.at(-1).type === 'DETECTION');
  verifier('pas d’échéance de suivi tant que la réparation n’est pas tracée',
    d.echeanceControleSuivi === null && d.suiviEnRetard === false);
}

{
  // Réparation tracée sans CONFORME postérieur → REPAREE + échéance 30 j.
  // (Le CONFORME du 06-05 est antérieur à la réparation du 06-07 : il ne
  // compte pas.)
  const controles = [
    { id: 'cf', machineId: 'mac-1', date: '2026-06-01', resultat: 'FUITE',
      dateReparation: '2026-06-07', natureReparation: 'Remplacement raccord',
      reparateur: 'Un réparateur' },
    { id: 'cc', machineId: 'mac-1', date: '2026-06-05', resultat: 'CONFORME' }
  ];
  const enDelai = construireDossiersFuite({
    machine: MACHINE, controles, mouvements: [], aujourdhui: '2026-07-01'
  }).dossiers[0];
  verifier('réparée sans CONFORME postérieur : statut REPAREE',
    enDelai.statut === 'REPAREE'
    && enDelai.reparation.nature === 'Remplacement raccord');
  verifier('échéance de suivi = réparation + 1 MOIS CIVIL (P0-6)',
    enDelai.echeanceControleSuivi === '2026-07-07');
  verifier('dans le délai : pas de retard', enDelai.suiviEnRetard === false);

  // P0-6 : arithmétique du mois civil — écrêtage fin de mois, bissextile.
  verifier('mois civil : 31/01 → 28/02 (année commune)',
    ajouterUnMoisCivil('2027-01-31') === '2027-02-28');
  verifier('mois civil : 31/01 → 29/02 (bissextile)',
    ajouterUnMoisCivil('2028-01-31') === '2028-02-29');
  verifier('mois civil : 31/08 → 30/09 (écrêtage simple)',
    ajouterUnMoisCivil('2026-08-31') === '2026-09-30');
  verifier('mois civil : 15/03 → 15/04 (quantième conservé)',
    ajouterUnMoisCivil('2026-03-15') === '2026-04-15');

  const enRetard = construireDossiersFuite({
    machine: MACHINE, controles, mouvements: [], aujourdhui: '2026-07-10'
  }).dossiers[0];
  verifier('échéance dépassée : suivi en retard', enRetard.suiviEnRetard === true);

  // P0-6 (G3) : la clôture TARDIVE (> 1 mois civil après la réparation)
  // reste acceptée mais le RETARD est CONSIGNÉ au dossier.
  const tardif = construireDossiersFuite({
    machine: MACHINE,
    controles: controles.concat([{ id: 'ct', machineId: 'mac-1',
      date: '2026-07-17', resultat: 'CONFORME', operateur: 'Un contrôleur' }]),
    mouvements: [], aujourdhui: '2026-08-01'
  }).dossiers[0];
  verifier('clôture tardive : le dossier FERME quand même (jamais bloqué)',
    tardif.statut === 'FERMEE' && tardif.dateFermeture === '2026-07-17');
  verifier('clôture tardive : retard CONSIGNÉ (10 j après l’échéance du 07/07)',
    tardif.clotureEnRetard === true && tardif.retardClotureJours === 10);

  const aTemps = construireDossiersFuite({
    machine: MACHINE,
    controles: controles.concat([{ id: 'cok', machineId: 'mac-1',
      date: '2026-06-17', resultat: 'CONFORME', operateur: 'Un contrôleur' }]),
    mouvements: [], aujourdhui: '2026-08-01'
  }).dossiers[0];
  verifier('clôture dans le délai : aucun retard consigné',
    aTemps.statut === 'FERMEE' && aTemps.clotureEnRetard === false
    && aTemps.retardClotureJours === null);
}

{
  // P0-6 (CF-5) : un contrôle né d'un mouvement ANNULÉ est réputé annulé
  // avec lui — il ne fonde AUCUN dossier (une fuite annulée disparaît) et
  // n'en referme aucun (une clôture annulée rouvre le dossier RÉPARÉ).
  const controles = [
    { id: 'cf', machineId: 'mac-1', date: '2026-06-01', resultat: 'FUITE',
      mouvementId: 'mv-fuite', dateReparation: '2026-06-02',
      natureReparation: 'Brasure', reparateur: 'R' },
    { id: 'cc', machineId: 'mac-1', date: '2026-06-03', resultat: 'CONFORME',
      mouvementId: 'mv-cloture' }
  ];
  const tousValides = construireDossiersFuite({
    machine: MACHINE, controles,
    mouvements: [
      { id: 'mv-fuite', machineId: 'mac-1', statut: 'VALIDE' },
      { id: 'mv-cloture', machineId: 'mac-1', statut: 'VALIDE' }
    ],
    aujourdhui: '2026-06-11'
  });
  verifier('contrôles actifs : le dossier existe et est FERMÉ',
    tousValides.dossiers.length === 1
    && tousValides.dossiers[0].statut === 'FERMEE');

  const clotureAnnulee = construireDossiersFuite({
    machine: MACHINE, controles,
    mouvements: [
      { id: 'mv-fuite', machineId: 'mac-1', statut: 'VALIDE' },
      { id: 'mv-cloture', machineId: 'mac-1', statut: 'ANNULE' }
    ],
    aujourdhui: '2026-06-11'
  });
  verifier('clôture ANNULÉE : le dossier redevient RÉPARÉ (échéance de suivi)',
    clotureAnnulee.dossiers.length === 1
    && clotureAnnulee.dossiers[0].statut === 'REPAREE'
    && clotureAnnulee.dossiers[0].echeanceControleSuivi === '2026-07-02');

  const fuiteAnnulee = construireDossiersFuite({
    machine: MACHINE, controles,
    mouvements: [
      { id: 'mv-fuite', machineId: 'mac-1', statut: 'ANNULE' },
      { id: 'mv-cloture', machineId: 'mac-1', statut: 'VALIDE' }
    ],
    aujourdhui: '2026-06-11'
  });
  verifier('fuite ANNULÉE : plus aucun dossier (le contrôle annulé ne fonde rien)',
    fuiteAnnulee.dossiers.length === 0);

  const autonome = construireDossiersFuite({
    machine: MACHINE,
    controles: [{ id: 'ca', machineId: 'mac-1', date: '2026-06-01',
      resultat: 'FUITE' }],
    mouvements: [], aujourdhui: '2026-06-11'
  });
  verifier('contrôle AUTONOME (sans mouvementId) : toujours actif',
    autonome.dossiers.length === 1 && autonome.dossiers[0].statut === 'OUVERTE');
}

{
  // P0-6 (audit 20/07, cas d'acceptation) : sur un équipement FIXE, un
  // CONFORME le MÊME JOUR que la réparation ne clôture PLUS (24 h de
  // fonctionnement requises — J+1, dates au jour). L'ancienne convention
  // « à date égale » ne vaut plus que pour un équipement MOBILE listé.
  const controles = [
    { id: 'cf', machineId: 'mac-1', date: '2026-06-01', resultat: 'FUITE',
      dateReparation: '2026-06-07', natureReparation: 'Brasure',
      reparateur: 'Un réparateur' },
    { id: 'cc', machineId: 'mac-1', date: '2026-06-07', resultat: 'CONFORME',
      operateur: 'Un contrôleur' }
  ];
  const memeJour = construireDossiersFuite({
    machine: MACHINE, controles, mouvements: [], aujourdhui: '2026-06-11'
  }).dossiers[0];
  verifier('fixe : CONFORME du jour de la réparation → PAS de clôture (RÉPARÉE)',
    memeJour.statut === 'REPAREE' && memeJour.controleCloture === null);

  const d = construireDossiersFuite({
    machine: MACHINE,
    controles: controles.concat([{ id: 'cl', machineId: 'mac-1',
      date: '2026-06-08', resultat: 'CONFORME', operateur: 'Un contrôleur' }]),
    mouvements: [], aujourdhui: '2026-06-11'
  }).dossiers[0];
  verifier('fixe : CONFORME du LENDEMAIN (J+1) : dossier FERMÉ',
    d.statut === 'FERMEE' && d.controleCloture.id === 'cl'
    && d.dateFermeture === '2026-06-08');
  verifier('durée du dossier fermé : détection → fermeture (7 j)',
    d.dureeJours === 7);
  verifier('la clôture est l’événement le plus récent de la chronologie',
    d.evenements[0].type === 'CLOTURE');

  const mobile = construireDossiersFuite({
    machine: { ...MACHINE, typeInstallation: 'MOBILE' }, controles,
    mouvements: [], aujourdhui: '2026-06-11'
  }).dossiers[0];
  verifier('MOBILE listé : le contrôle immédiat clôture (exception de périmètre)',
    mobile.statut === 'FERMEE' && mobile.controleCloture.id === 'cc');
}

{
  // Un CONFORME antérieur au jour de DÉTECTION ne referme jamais, même
  // s'il est postérieur à la date de réparation saisie (données
  // incohérentes possibles à la saisie : la règle des stores prime).
  const controles = [
    { id: 'cf', machineId: 'mac-1', date: '2026-06-01', resultat: 'FUITE',
      dateReparation: '2026-05-20', natureReparation: 'X', reparateur: 'Y' },
    { id: 'cc', machineId: 'mac-1', date: '2026-05-25', resultat: 'CONFORME' }
  ];
  const d = construireDossiersFuite({
    machine: MACHINE, controles, mouvements: [], aujourdhui: '2026-06-11'
  }).dossiers[0];
  verifier('un CONFORME antérieur à la détection ne referme pas',
    d.statut === 'REPAREE' && d.controleCloture === null);
}

{
  // Fenêtre des mouvements + deux fuites successives.
  const controles = [
    // Fuite n°1, fermée le 03-15.
    { id: 'f1', machineId: 'mac-1', date: '2026-03-01', resultat: 'FUITE',
      dateReparation: '2026-03-10', natureReparation: 'Joint',
      reparateur: 'R' },
    { id: 'k1', machineId: 'mac-1', date: '2026-03-15', resultat: 'CONFORME' },
    // Fuite n°2, encore ouverte.
    { id: 'f2', machineId: 'mac-1', date: '2026-06-01', resultat: 'FUITE' }
  ];
  const mouvements = [
    // Avant la fuite n°1 : hors de tout dossier.
    { id: 'm0', machineId: 'mac-1', date: '2026-02-20', statut: 'VALIDE',
      type: 'MISE_EN_SERVICE', quantiteKg: 5, numero: 'FORM-2026-0001' },
    // Pendant la fuite n°1 (récupération : flux machine négatif).
    { id: 'm1', machineId: 'mac-1', date: '2026-03-05', statut: 'VALIDE',
      type: 'RECUPERATION_MAINTENANCE', quantiteKg: -2,
      numero: 'FORM-2026-0002' },
    // Entre les deux fuites : hors des deux fenêtres.
    { id: 'm2', machineId: 'mac-1', date: '2026-04-10', statut: 'VALIDE',
      type: 'CHARGE_APPOINT', quantiteKg: 2, numero: 'FORM-2026-0003' },
    // Pendant la fuite n°2, mais BROUILLON : pas opposable, exclu.
    { id: 'm3', machineId: 'mac-1', date: '2026-06-03', statut: 'BROUILLON',
      type: 'CHARGE_APPOINT', quantiteKg: 1, numero: 'FORM-2026-0004' },
    // Pendant la fuite n°2, AUTRE machine : exclu.
    { id: 'm4', machineId: 'mac-2', date: '2026-06-03', statut: 'VALIDE',
      type: 'CHARGE_APPOINT', quantiteKg: 1, numero: 'FORM-2026-0005' },
    // Pendant la fuite n°2, ANNULÉ : opposable, inclus et marqué.
    { id: 'm5', machineId: 'mac-1', date: '2026-06-04', statut: 'ANNULE',
      type: 'RECUPERATION_MAINTENANCE', quantiteKg: -1,
      numero: 'FORM-2026-0006' }
  ];
  const r = construireDossiersFuite({
    machine: MACHINE, controles, mouvements, aujourdhui: '2026-06-11'
  });
  verifier('deux fuites → deux dossiers, la plus récente d’abord',
    r.dossiers.length === 2
    && r.dossiers[0].controleFuiteId === 'f2'
    && r.dossiers[1].controleFuiteId === 'f1');
  verifier('compteurs : 1 ouverte, 1 fermée',
    r.nbOuvertes === 1 && r.nbReparees === 0 && r.nbFermees === 1);
  const [ouverte, fermee] = r.dossiers;
  verifier('fenêtre fermée : seule la récupération du 03-05 est dedans',
    fermee.mouvementsPendantFuite.length === 1
    && fermee.mouvementsPendantFuite[0].id === 'm1');
  verifier('variation vue de la machine = quantité signée telle quelle (−2 kg)',
    fermee.evenements.find((e) => e.mouvementId === 'm1')
      .variationKg === -2);
  verifier('fenêtre ouverte : l’annulé est inclus et marqué, le brouillon et l’autre machine exclus',
    ouverte.mouvementsPendantFuite.length === 1
    && ouverte.mouvementsPendantFuite[0].id === 'm5'
    && ouverte.evenements.find((e) => e.mouvementId === 'm5').annule === true);
  verifier('la fuite n°2 apparaît en contrôle intermédiaire du dossier n°1 ? NON (hors fenêtre fermée au 03-15)',
    !fermee.evenements.some((e) => e.controleId === 'f2'));
}

{
  // ÉPISODE (revue adversariale, constat n°1) : une fuite JAMAIS
  // réparée suivie d'une nouvelle FUITE réparée puis refermée ne fait
  // qu'UN dossier — exactement ce que voient les stores (estFuiteOuverte
  // ne regarde que la DERNIÈRE fuite : machine refermée, R3c débloqué).
  // Le module ne doit JAMAIS afficher « ouverte » ce que les stores
  // considèrent refermé.
  const controles = [
    { id: 'fa', machineId: 'mac-1', date: '2026-01-01', resultat: 'FUITE',
      localisationFuite: 'Vanne 4 voies' },
    { id: 'fb', machineId: 'mac-1', date: '2026-03-01', resultat: 'FUITE',
      dateReparation: '2026-03-05', natureReparation: 'Remplacement vanne',
      reparateur: 'R' },
    { id: 'cc', machineId: 'mac-1', date: '2026-03-10', resultat: 'CONFORME' }
  ];
  const r = construireDossiersFuite({
    machine: MACHINE, controles, mouvements: [], aujourdhui: '2026-06-11'
  });
  const d = r.dossiers[0];
  verifier('épisode : fuite non réparée + fuite réparée refermée = UN SEUL dossier',
    r.dossiers.length === 1 && d.controlesFuiteIds.length === 2
    && d.nbConfirmations === 1);
  verifier('épisode : ancré sur la PREMIÈRE détection, localisation d’origine',
    d.controleFuiteId === 'fa' && d.localisation === 'Vanne 4 voies');
  verifier('épisode : statut FERMÉ, aligné sur estFuiteOuverte (zéro dossier ouvert)',
    d.statut === 'FERMEE' && r.nbOuvertes === 0 && r.nbFermees === 1);
  verifier('épisode : la réparation gouvernante est celle de la DERNIÈRE fuite',
    d.reparation.date === '2026-03-05' && d.controleCloture.id === 'cc');
  verifier('épisode : la 2e fuite apparaît comme confirmation dans la chronologie',
    d.evenements.some((e) => e.controleId === 'fb'
      && e.titre === 'Fuite confirmée par un nouveau contrôle'));
  verifier('épisode : construireDossierFuite retrouve le dossier par la CONFIRMATION aussi',
    construireDossierFuite({ machine: MACHINE, controles, mouvements: [],
      controleFuiteId: 'fb', aujourdhui: '2026-06-11' })
      ?.controleFuiteId === 'fa');
}

{
  // ÉPISODE, variante : première fuite RÉPARÉE mais jamais recontrôlée,
  // puis nouvelle FUITE non réparée → toujours le même épisode, statut
  // OUVERTE (la dernière fuite gouverne, comme estFuiteOuverte), la
  // réparation de la première reste visible en chronologie mais ne
  // gouverne plus rien.
  const controles = [
    { id: 'fa', machineId: 'mac-1', date: '2026-02-01', resultat: 'FUITE',
      dateReparation: '2026-02-05', natureReparation: 'Serrage', reparateur: 'R' },
    { id: 'fb', machineId: 'mac-1', date: '2026-02-20', resultat: 'FUITE' }
  ];
  const r = construireDossiersFuite({
    machine: MACHINE, controles, mouvements: [], aujourdhui: '2026-06-11'
  });
  const d = r.dossiers[0];
  verifier('épisode rouvert : un seul dossier, statut OUVERTE (dernière fuite non réparée)',
    r.dossiers.length === 1 && d.statut === 'OUVERTE' && r.nbOuvertes === 1);
  verifier('épisode rouvert : pas de réparation gouvernante ni d’échéance',
    d.reparation === null && d.echeanceControleSuivi === null);
  verifier('épisode rouvert : la réparation de la 1re fuite reste en chronologie',
    d.evenements.some((e) => e.type === 'REPARATION'
      && e.detail === 'Serrage'));
}

{
  // GARDE donnée corrompue (revue adversariale, constat n°4) : une
  // date de réparation malformée ne fait pas planter la construction —
  // l'échéance manque, le dossier reste lisible.
  const controles = [
    { id: 'cf', machineId: 'mac-1', date: '2026-06-01', resultat: 'FUITE',
      dateReparation: 'n/a', natureReparation: 'X', reparateur: 'Y' }
  ];
  let resultat = null;
  let aPlante = false;
  try {
    resultat = construireDossiersFuite({
      machine: MACHINE, controles, mouvements: [], aujourdhui: '2026-06-11'
    });
  } catch { aPlante = true; }
  verifier('date de réparation malformée : pas de plantage, échéance absente',
    !aPlante && resultat.dossiers[0].statut === 'REPAREE'
    && resultat.dossiers[0].echeanceControleSuivi === null
    && resultat.dossiers[0].suiviEnRetard === false);
}

{
  // Tri INTRA-JOUR : tout le même jour — détection, puis récupération,
  // puis réparation, puis complément (possible seulement après
  // réparation, R3c), puis contrôle de clôture. Chronologie décroissante.
  // P0-6 : le scénario « tout le même jour » n'est clôturable que sur un
  // équipement MOBILE listé (un fixe exige J+1) — la machine du cas est
  // donc MOBILE, le tri intra-jour reste couvert.
  const controles = [
    { id: 'cf', machineId: 'mac-1', date: '2026-06-01', resultat: 'FUITE',
      dateReparation: '2026-06-01', natureReparation: 'Brasure',
      reparateur: 'R' },
    { id: 'cc', machineId: 'mac-1', date: '2026-06-01', resultat: 'CONFORME' }
  ];
  const mouvements = [
    { id: 'ma', machineId: 'mac-1', date: '2026-06-01', statut: 'VALIDE',
      type: 'CHARGE_APPOINT', quantiteKg: 2, ordreValidation: 6,
      numero: 'FORM-2026-0011' },
    { id: 'mr', machineId: 'mac-1', date: '2026-06-01', statut: 'VALIDE',
      type: 'RECUPERATION_MAINTENANCE', quantiteKg: -2, ordreValidation: 5,
      numero: 'FORM-2026-0012' }
  ];
  const d = construireDossiersFuite({
    machine: { ...MACHINE, typeInstallation: 'MOBILE' }, controles,
    mouvements, aujourdhui: '2026-06-11'
  }).dossiers[0];
  const ordre = d.evenements.map((e) => e.type === 'MOUVEMENT'
    ? e.sousType : e.type);
  verifier('tri intra-jour : clôture > complément > réparation > récupération > détection',
    JSON.stringify(ordre) === JSON.stringify(['CLOTURE', 'CHARGE_APPOINT',
      'REPARATION', 'RECUPERATION_MAINTENANCE', 'DETECTION']),
    `ordre = ${ordre.join(' > ')}`);
  verifier('même jour partout (MOBILE) : le dossier est FERMÉ (exception P0-6)',
    d.statut === 'FERMEE');
}

{
  // construireDossierFuite : accès direct par l'ancre.
  const controles = [
    { id: 'cf', machineId: 'mac-1', date: '2026-06-01', resultat: 'FUITE' },
    { id: 'cc', machineId: 'mac-1', date: '2026-06-05', resultat: 'CONFORME' }
  ];
  const args = { machine: MACHINE, controles, mouvements: [],
    aujourdhui: '2026-06-11' };
  verifier('construireDossierFuite retrouve le dossier par son ancre',
    construireDossierFuite({ ...args, controleFuiteId: 'cf' })
      ?.controleFuiteId === 'cf');
  verifier('construireDossierFuite : null sur un contrôle CONFORME',
    construireDossierFuite({ ...args, controleFuiteId: 'cc' }) === null);
  verifier('construireDossierFuite : null sur un id inconnu',
    construireDossierFuite({ ...args, controleFuiteId: 'xxx' }) === null);
  verifier('les trois statuts ont un libellé français',
    ['OUVERTE', 'REPAREE', 'FERMEE']
      .every((s) => typeof LIBELLES_STATUT_FUITE[s] === 'string'
        && LIBELLES_STATUT_FUITE[s].length > 0));
}

// ============================================================
// B. Volet STORE RÉEL — parcours complet via le contrat
// ============================================================
console.log(`--- B. parcours réel (${NOM_STORE}) ---`);

const store = await fabriquerStore(NOM_STORE);
await store.init();

const referent = await store.createPersonne({
  nom: 'Fuite', prenom: 'Référent', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
const fluides = await store.getFluides();
const machine = await store.createMachine({
  designation: 'Machine dossier fuite', fluide: fluides[0].code,
  chargeNominaleKg: 10, operateur: 'Testeur'
});
const source = await store.createBouteille({
  type: 'NEUVE', fluide: fluides[0].code, tareKg: 10, masseBruteKg: 25,
  contenanceMaxKg: 20
});
const recup = await store.createBouteille({
  type: 'RECUPERATION', fluide: fluides[0].code, tareKg: 8, masseBruteKg: 8,
  contenanceMaxKg: 15
});

// J-20 : mise en service (5 kg) — AVANT la fuite, hors dossier.
const mes = await store.creerMouvement({
  type: 'MISE_EN_SERVICE', machineId: machine.id, bouteilleSrcId: source.id,
  date: dateRelative(-20), peseeAvantKg: 15, peseeApresKg: 10,
  technicien: 'Testeur'
});
await store.soumettreMouvement(mes.id);
await store.validerMouvement(mes.id, referent.id);

// J-10 : détection de la fuite (contrôle FUITE localisé).
const controleFuite = await store.createControle({
  machineId: machine.id, resultat: 'FUITE', methode: 'DIRECTE',
  date: dateRelative(-10), localisationFuite: 'Raccord HP',
  operateur: 'Testeur'
});

// J-8 : récupération de 2 kg vers la bouteille de récupération.
const mvtRecup = await store.creerMouvement({
  type: 'RECUPERATION_MAINTENANCE', machineId: machine.id,
  bouteilleDstId: recup.id, date: dateRelative(-8),
  peseeAvantKg: 8, peseeApresKg: 10, technicien: 'Testeur'
});
await store.soumettreMouvement(mvtRecup.id);
await store.validerMouvement(mvtRecup.id, referent.id);

// J-5 : réparation tracée.
await store.tracerReparation(controleFuite.id, {
  dateReparation: dateRelative(-5), natureReparation: 'Remplacement raccord HP',
  reparateur: 'Testeur'
});

// J-3 : complément de charge (possible : la réparation est tracée).
const mvtAppoint = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machine.id, bouteilleSrcId: source.id,
  date: dateRelative(-3), peseeAvantKg: 10, peseeApresKg: 8,
  technicien: 'Testeur'
});
await store.soumettreMouvement(mvtAppoint.id);
await store.validerMouvement(mvtAppoint.id, referent.id);

// J-1 : contrôle de suivi CONFORME → la fuite est refermée.
const controleSuivi = await store.createControle({
  machineId: machine.id, resultat: 'CONFORME', methode: 'DIRECTE',
  date: dateRelative(-1), operateur: 'Testeur'
});

const [controles, mouvements, machines] = await Promise.all([
  store.getControles(), store.getMouvements(), store.getMachines()
]);
const machineRelue = machines.find((m) => m.id === machine.id);
const r = construireDossiersFuite({
  machine: machineRelue, controles, mouvements
});

verifier('parcours réel : UN dossier de fuite pour la machine',
  r.dossiers.length === 1 && r.nbFermees === 1);
const dossier = r.dossiers[0];
verifier('parcours réel : dossier FERMÉ, ancré sur le contrôle FUITE',
  dossier.statut === 'FERMEE'
  && dossier.controleFuiteId === controleFuite.id);
verifier('parcours réel : localisation et réparation portées',
  dossier.localisation === 'Raccord HP'
  && dossier.reparation.nature === 'Remplacement raccord HP'
  && dossier.reparation.date === dateRelative(-5));
verifier('parcours réel : clôture par le contrôle de suivi',
  dossier.controleCloture?.id === controleSuivi.id
  && dossier.dateFermeture === dateRelative(-1));
verifier('parcours réel : la machine est revenue EN_SERVICE (R4)',
  machineRelue.statut === 'EN_SERVICE');
verifier('parcours réel : récupération ET complément dans la fenêtre, mise en service dehors',
  dossier.mouvementsPendantFuite.length === 2
  && dossier.mouvementsPendantFuite.some((mv) => mv.id === mvtRecup.id)
  && dossier.mouvementsPendantFuite.some((mv) => mv.id === mvtAppoint.id)
  && !dossier.mouvementsPendantFuite.some((mv) => mv.id === mes.id));
const types = dossier.evenements.map((e) => e.type);
verifier('parcours réel : chronologie complète et ordonnée (clôture → appoint → réparation → récupération → détection)',
  JSON.stringify(types) === JSON.stringify(
    ['CLOTURE', 'MOUVEMENT', 'REPARATION', 'MOUVEMENT', 'DETECTION']),
  `ordre = ${types.join(' > ')}`);
verifier('parcours réel : durée du dossier = 9 jours (J-10 → J-1)',
  dossier.dureeJours === 9);
verifier('parcours réel : accès direct par l’ancre du contrôle',
  construireDossierFuite({ machine: machineRelue, controles, mouvements,
    controleFuiteId: controleFuite.id })?.statut === 'FERMEE');

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
