// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Équivalence stricte des hasseurs de mouvement front ↔ serveur (V9-E3)
// Exécution : node server/test-hash-mouvement.mjs
//
// Le registre local (serveur, node:crypto synchrone) DOIT produire les
// MÊMES empreintes que le registre démo (front, crypto.subtle asynchrone).
// Sans cette égalité, un export démo ne se réimporte pas en local (chaîne
// « forgée ») et réciproquement. Ce test compare les deux hasseurs sur un
// éventail de mouvements — toute dérive de l'un des deux le casse.
// Node ≥ 18, sans DOM.
// ============================================================

import { hasherEcriture, CHAMPS_HASH_MOUVEMENT as CHAMPS_FRONT }
  from '../v8/js/core/utils.js';
import hm from './hash-mouvement.js';

const { hasherMouvement, CHAMPS_HASH_MOUVEMENT } = hm;

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

// Les deux listes de champs doivent être identiques, dans le même ordre :
// si le front ajoute un champ au hash, le serveur DOIT suivre (sinon dérive).
verifier('les 18 champs hachés du serveur = ceux du front, même ordre',
  JSON.stringify(CHAMPS_HASH_MOUVEMENT) === JSON.stringify(CHAMPS_FRONT),
  `serveur=${CHAMPS_HASH_MOUVEMENT.length} front=${CHAMPS_FRONT.length}`);

// Éventail de mouvements représentatifs : nominal, champs null, controle
// imbriqué (avec et sans controleId), quantité négative, hashPrecedent null
// et non-null, contre-écriture, caractères accentués.
const MOUVEMENTS = [
  { titre: 'charge nominale',
    mvt: { id: 'mvt-a1', numero: 'FORM-2026-0001', date: '2026-07-04',
      mode: 'FORMATION', type: 'CHARGE_APPOINT', machineId: 'mac-1',
      fluide: 'R-410A', quantiteKg: 2, peseeAvantKg: 20, peseeApresKg: 18,
      bouteilleSrcId: 'bou-1', bouteilleDstId: null,
      causeMouvement: 'Complément de charge', controle: null,
      technicien: 'Frédéric Hénninot', validateurId: 'per-ref',
      contreEcritureDe: null, motif: null },
    prec: null },
  { titre: 'récupération, quantité négative, hashPrecedent non-null',
    mvt: { id: 'mvt-b2', numero: 'FI-2026-0002', date: '2026-01-31',
      mode: 'OFFICIEL', type: 'RECUPERATION_MAINTENANCE', machineId: 'mac-2',
      fluide: 'R-32', quantiteKg: -1.5, peseeAvantKg: 5, peseeApresKg: 6.5,
      bouteilleSrcId: null, bouteilleDstId: 'bou-r',
      causeMouvement: 'Maintenance', controle: null,
      technicien: 'Un technicien extérieur', validateurId: 'per-ens',
      contreEcritureDe: null, motif: null },
    prec: 'a'.repeat(64) },
  { titre: 'controle imbriqué CONFORME (avant CR-3, sans controleId)',
    mvt: { id: 'mvt-c3', numero: 'FORM-2026-0003', date: '2026-07-04',
      mode: 'FORMATION', type: 'CHARGE_APPOINT', machineId: 'mac-3',
      fluide: 'R-134a', quantiteKg: 0.3, peseeAvantKg: 10, peseeApresKg: 9.7,
      bouteilleSrcId: 'bou-2', bouteilleDstId: null, causeMouvement: null,
      controle: { statutControle: 'CONFORME', detecteurId: 'out-d' },
      technicien: 'Testeur', validateurId: 'per-ref',
      contreEcritureDe: null, motif: null },
    prec: 'b'.repeat(64) },
  { titre: 'controle imbriqué avec controleId (après CR-3, ordre des clés)',
    mvt: { id: 'mvt-d4', numero: 'FORM-2026-0004', date: '2026-07-04',
      mode: 'FORMATION', type: 'CHARGE_APPOINT', machineId: 'mac-3',
      fluide: 'R-134a', quantiteKg: 0.3, peseeAvantKg: 10, peseeApresKg: 9.7,
      bouteilleSrcId: 'bou-2', bouteilleDstId: null, causeMouvement: null,
      controle: { statutControle: 'FUITE', detecteurId: 'out-d',
        controleId: 'ctl-9' },
      technicien: 'Testeur', validateurId: 'per-ref',
      contreEcritureDe: null, motif: null },
    prec: 'c'.repeat(64) },
  { titre: 'contre-écriture (motif, pesées permutées)',
    mvt: { id: 'mvt-e5', numero: 'FI-2026-0005', date: '2026-07-04',
      mode: 'OFFICIEL', type: 'CHARGE_APPOINT', machineId: 'mac-2',
      fluide: 'R-32', quantiteKg: -2, peseeAvantKg: 18, peseeApresKg: 20,
      bouteilleSrcId: 'bou-1', bouteilleDstId: null,
      causeMouvement: 'Complément', controle: null, technicien: 'Référent',
      validateurId: 'per-ref', contreEcritureDe: 'mvt-a1',
      motif: 'Erreur de bouteille — régularisation' },
    prec: 'd'.repeat(64) },
  { titre: 'objet quasi vide (tous champs absents → null)',
    mvt: { id: 'mvt-f6' },
    prec: null },
  { titre: 'transfert (positif, deux bouteilles)',
    mvt: { id: 'mvt-g7', numero: 'FORM-2026-0006', date: '2026-12-31',
      mode: 'FORMATION', type: 'TRANSFERT', machineId: null, fluide: 'R-410A',
      quantiteKg: 2, peseeAvantKg: 11, peseeApresKg: 9,
      bouteilleSrcId: 'bou-2', bouteilleDstId: 'bou-3', causeMouvement: null,
      controle: null, technicien: 'Testeur', validateurId: 'per-ens',
      contreEcritureDe: null, motif: null },
    prec: 'e'.repeat(64) }
];

for (const { titre, mvt, prec } of MOUVEMENTS) {
  const attendu = await hasherEcriture(mvt, prec);        // front (subtle)
  const obtenu = hasherMouvement(mvt, prec);              // serveur (node)
  verifier(`hash identique front/serveur — ${titre}`,
    obtenu === attendu, `front=${attendu.slice(0, 12)}… serveur=${obtenu.slice(0, 12)}…`);
  verifier(`empreinte hexadécimale 64 — ${titre}`, /^[0-9a-f]{64}$/.test(obtenu));
}

// La chaîne : hashPrecedent null (front, rendu '') doit égaler '' (serveur).
{
  const mvt = MOUVEMENTS[0].mvt;
  verifier('hashPrecedent null et hashPrecedent "" donnent la même empreinte',
    hasherMouvement(mvt, null) === hasherMouvement(mvt, '')
    && hasherMouvement(mvt, null) === await hasherEcriture(mvt, null));
}

// Sensibilité : changer un champ haché change l'empreinte ; changer un champ
// HORS empreinte (statut) ne la change PAS.
{
  const base = MOUVEMENTS[0].mvt;
  const quantiteChangee = { ...base, quantiteKg: 2.001 };
  verifier('modifier quantiteKg (dans l’empreinte) change le hash',
    hasherMouvement(base, null) !== hasherMouvement(quantiteChangee, null));
  const statutAjoute = { ...base, statut: 'ANNULE' };
  verifier('ajouter statut (hors empreinte) ne change PAS le hash',
    hasherMouvement(base, null) === hasherMouvement(statutAjoute, null)
    && hasherMouvement(statutAjoute, null) === await hasherEcriture(statutAjoute, null));
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Hasseurs de mouvement front ↔ serveur : strictement équivalents.');
