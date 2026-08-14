// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// Test UNITAIRE du macaron de contrôle (module pur). Aucun store, aucune
// horloge : la date de référence est passée. Tourne une seule fois.

import { statutMacaron, COULEURS_MACARON } from './macaron-controle.js';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

const JOUR = '2026-07-25';
const conforme = (date) => ({ resultat: 'CONFORME', date });

// 1. Fuite active → ROUGE (prime sur tout, même avec un contrôle conforme).
{
  const r = statutMacaron({
    controles: [conforme('2026-07-01')],
    dossiersFuite: [{ statut: 'OUVERTE', dateDetection: '2026-07-10' }],
    frequenceMois: 12, prochainControle: '2027-07-01', jour: JOUR
  });
  verifier('fuite OUVERTE → ROUGE « Fuite détectée », date = détection',
    r.couleur === 'ROUGE' && r.libelle === 'Fuite détectée'
    && r.dateVerification === '2026-07-10');
}
verifier('fuite REPAREE (pas encore fermée) → ROUGE',
  statutMacaron({ dossiersFuite: [{ statut: 'REPAREE', dateDetection: '2026-06-01' }],
    frequenceMois: 12, jour: JOUR }).couleur === 'ROUGE');
verifier('fuite FERMEE (le plus récent) → PAS rouge (n’est plus active)',
  statutMacaron({ controles: [conforme('2026-07-01')],
    dossiersFuite: [{ statut: 'FERMEE', dateDetection: '2026-01-01' }],
    frequenceMois: 12, prochainControle: '2027-07-01', jour: JOUR }).couleur === 'BLEU');

// 2. Hors périmètre (fréquence null) → GRIS.
{
  const r = statutMacaron({ controles: [conforme('2026-07-01')],
    frequenceMois: null, jour: JOUR });
  verifier('fréquence null → GRIS « hors contrôle F-Gas », sans date',
    r.couleur === 'GRIS' && r.dateVerification === null);
}

// 3. Soumise mais jamais contrôlée conforme → ORANGE.
verifier('aucun contrôle conforme, soumise → ORANGE « à réaliser »',
  statutMacaron({ controles: [], frequenceMois: 12,
    prochainControle: '2026-09-01', jour: JOUR }).couleur === 'ORANGE');
verifier('un contrôle NON conforme seul (sans fuite active) → ORANGE',
  statutMacaron({ controles: [{ resultat: 'FUITE', date: '2026-05-01' }],
    frequenceMois: 12, prochainControle: '2026-09-01', jour: JOUR }).couleur === 'ORANGE');

// 4. Échéance dépassée → ORANGE (jamais bleu).
{
  const r = statutMacaron({ controles: [conforme('2025-06-01')],
    frequenceMois: 12, prochainControle: '2026-06-01', jour: JOUR });
  verifier('conforme mais échéance passée → ORANGE « à refaire », garde la date du dernier',
    r.couleur === 'ORANGE' && r.dateVerification === '2025-06-01'
    && /01\/06\/2026/.test(r.detail));
}

// 5. Conforme dans les délais → BLEU.
{
  const r = statutMacaron({ controles: [conforme('2026-07-01'), conforme('2025-07-01')],
    frequenceMois: 12, prochainControle: '2027-07-01', jour: JOUR });
  verifier('conforme, échéance à venir → BLEU, date = dernier conforme (le plus récent)',
    r.couleur === 'BLEU' && r.dateVerification === '2026-07-01'
    && /01\/07\/2027/.test(r.detail));
}
verifier('échéance PILE aujourd’hui → encore BLEU (dépassée = STRICTEMENT avant)',
  statutMacaron({ controles: [conforme('2025-07-25')], frequenceMois: 12,
    prochainControle: JOUR, jour: JOUR }).couleur === 'BLEU');

// Robustesse : entrées vides / absentes.
verifier('entrée vide {} → GRIS (rien de soumis, pas de fuite) sans planter',
  statutMacaron({}).couleur === 'GRIS');
verifier('les 4 couleurs sont dans la liste blanche',
  ['ROUGE', 'GRIS', 'ORANGE', 'BLEU'].every((c) => COULEURS_MACARON.includes(c)));

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
