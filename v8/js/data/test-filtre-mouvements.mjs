// ============================================================
// Test du filtrage de la vue « Mouvements » (module pur).
// Exécution : node v8/js/data/test-filtre-mouvements.mjs
// Sans store ni DOM : indexation, correspondance (casse/accents,
// multi-mots ET, groupes de type), options disponibles.
// ============================================================

import { normaliserTexte, indexerMouvement, correspond,
  optionsDisponibles, TYPES_FILTRE, STATUTS_FILTRE }
  from './filtre-mouvements.js';

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

// --- Normalisation ---------------------------------------------------
verifier('normaliser : accents dépouillés + minuscules',
  normaliserTexte('Récupération ÉTÉ') === 'recuperation ete');
verifier('normaliser : espaces réduits et bords rognés',
  normaliserTexte('  Chambre   froide ') === 'chambre froide');
verifier('normaliser : null/undefined → chaîne vide',
  normaliserTexte(null) === '' && normaliserTexte(undefined) === '');

// --- Indexation -------------------------------------------------------
const MV_CHARGE = {
  id: 'mvt-1', numero: 'FI-2026-0001', date: '2026-05-12',
  type: 'CHARGE_APPOINT', machineId: 'M1',
  machineLabel: 'Chambre froide positive — Labo', fluide: 'R-404A',
  quantiteKg: 0.25, technicien: 'Julien Martin', statut: 'VALIDE',
  cerfaNumero: 'FI-2026-0001'
};
const MV_RECUP = {
  id: 'mvt-2', numero: 'FI-2026-0002', date: '2025-11-03',
  type: 'RECUPERATION_DEMANTELEMENT', machineLabel: 'Multisplit bureaux',
  fluide: 'R-410A', quantiteKg: -1.2, technicien: 'Sophie Bianchi',
  statut: 'BROUILLON', motifRejet: 'Pesée illisible', cerfaNumero: null
};
const MV_TRANSFERT = {
  id: 'mvt-3', numero: 'FI-2026-0003', date: '2026-01-20',
  type: 'TRANSFERT', machineLabel: null, fluide: 'R-32',
  bouteilleSrcId: 'B1', bouteilleDstId: 'B4',
  quantiteKg: null, statut: 'VALIDE'
};
const BOUTEILLES = new Map([
  ['B1', { id: 'B1', code: 'B-01' }],
  ['B4', { id: 'B4', code: 'B-04' }]
]);

{
  const i = indexerMouvement(MV_CHARGE);
  verifier('indexe : clés exactes (statut, groupe, fluide, année)',
    i.statut === 'VALIDE' && i.groupeType === 'CHARGE_APPOINT'
    && i.fluide === 'R-404A' && i.annee === '2026');
  verifier('indexe : le texte porte numéro, machine, fluide, technicien',
    i.texte.includes('fi-2026-0001') && i.texte.includes('chambre froide')
    && i.texte.includes('r-404a') && i.texte.includes('julien martin'));
}
{
  const i = indexerMouvement(MV_RECUP);
  verifier('indexe : les deux récupérations rejoignent le groupe RECUPERATION',
    i.groupeType === 'RECUPERATION'
    && indexerMouvement({ type: 'RECUPERATION_MAINTENANCE' }).groupeType === 'RECUPERATION');
  verifier('indexe : le motif de rejet d’un brouillon est cherchable',
    i.texte.includes('pesee illisible'));
}
{
  const i = indexerMouvement(MV_TRANSFERT, BOUTEILLES);
  verifier('indexe : un transfert est cherchable par ses codes bouteilles',
    i.texte.includes('b-01') && i.texte.includes('b-04'));
  verifier('indexe : transfert sans Map → pas de plantage, codes absents',
    !indexerMouvement(MV_TRANSFERT).texte.includes('b-01'));
}
verifier('indexe : type inconnu filtrable par sa valeur brute (filet)',
  indexerMouvement({ type: 'TYPE_FUTUR' }).groupeType === 'TYPE_FUTUR');
verifier('indexe : date absente → année vide',
  indexerMouvement({ type: 'TRANSFERT' }).annee === '');

// --- Correspondance ---------------------------------------------------
const I_CHARGE = indexerMouvement(MV_CHARGE);
const I_RECUP = indexerMouvement(MV_RECUP);

verifier('critères vides : tout passe',
  correspond(I_CHARGE, {}) && correspond(I_RECUP, { texte: '', statut: '' }));
verifier('texte : insensible casse ET accents (« pesee » trouve « Pesée »)',
  correspond(I_RECUP, { texte: 'PESEE' }));
verifier('texte : multi-mots = ET (tous exigés)',
  correspond(I_CHARGE, { texte: 'chambre julien' })
  && !correspond(I_CHARGE, { texte: 'chambre sophie' }));
verifier('statut : VALIDE ne matche pas BROUILLON',
  correspond(I_CHARGE, { statut: 'VALIDE' })
  && !correspond(I_RECUP, { statut: 'VALIDE' }));
verifier('type : le groupe RECUPERATION attrape le démantèlement',
  correspond(I_RECUP, { type: 'RECUPERATION' })
  && !correspond(I_CHARGE, { type: 'RECUPERATION' }));
verifier('fluide et année : correspondances exactes',
  correspond(I_CHARGE, { fluide: 'R-404A', annee: '2026' })
  && !correspond(I_CHARGE, { annee: '2025' }));
verifier('combinaison : tous les critères doivent passer ensemble',
  correspond(I_CHARGE, { texte: 'labo', statut: 'VALIDE', type: 'CHARGE_APPOINT',
    fluide: 'R-404A', annee: '2026' })
  && !correspond(I_CHARGE, { texte: 'labo', statut: 'VALIDE', fluide: 'R-32' }));

// --- Options disponibles ----------------------------------------------
{
  const o = optionsDisponibles([MV_CHARGE, MV_RECUP, MV_TRANSFERT,
    { type: 'RECUPERATION_MAINTENANCE', fluide: 'R-404A', date: '2026-03-01' }]);
  verifier('options : groupes présents dans l’ordre canonique, dédoublonnés',
    o.types.map((t) => t.valeur).join(',')
      === 'CHARGE_APPOINT,RECUPERATION,TRANSFERT');
  verifier('options : chaque groupe porte son libellé français',
    o.types.every((t) => TYPES_FILTRE.some(
      (g) => g.valeur === t.valeur && g.libelle === t.libelle)));
  verifier('options : fluides triés, dédoublonnés',
    o.fluides.join(',') === 'R-32,R-404A,R-410A');
  verifier('options : années récentes en tête',
    o.annees.join(',') === '2026,2025');
}
verifier('options : registre vide → listes vides, pas de plantage',
  (() => { const o = optionsDisponibles([]);
    return o.types.length === 0 && o.fluides.length === 0
      && o.annees.length === 0; })());
verifier('options : type hors référentiel proposé en valeur brute (filet)',
  optionsDisponibles([{ type: 'TYPE_FUTUR' }])
    .types.some((t) => t.valeur === 'TYPE_FUTUR'));

// --- Référentiels du filtre --------------------------------------------
verifier('statuts du filtre : les 4 statuts du contrat',
  STATUTS_FILTRE.map((s) => s.valeur).join(',')
    === 'BROUILLON,SOUMIS,VALIDE,ANNULE');

// --- Verdict -------------------------------------------------
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Tous les tests passent.');
