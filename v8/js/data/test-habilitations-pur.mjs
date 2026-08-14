// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// Tests UNITAIRES du module pur habilitations.js (aucun store, aucune horloge).
// Tourne une seule fois (non doublé). Lancé par outils/lancer-tests.mjs.

import {
  REGIMES,
  CATEGORIES_2008,
  CATEGORIES_2025,
  CORRESPONDANCE_2008_VERS_2025,
  correspondance2008Vers2025,
  categorieCoherente,
  comparerHabilitations
} from './habilitations.js';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

// --- Référentiels -------------------------------------------------
verifier('régimes = 2008 et 2025', REGIMES.length === 2 && REGIMES.includes('2008') && REGIMES.includes('2025'));
verifier('catégories 2008 = I/II/III/IV', CATEGORIES_2008.join(',') === 'I,II,III,IV');
verifier('catégories 2025 = A1/A2/B/C/D/E/V', CATEGORIES_2025.join(',') === 'A1,A2,B,C,D,E,V');

// --- Correspondance 2008 → 2025 -----------------------------------
verifier('III → [D]', correspondance2008Vers2025('III').join(',') === 'D');
verifier('IV → [E]', correspondance2008Vers2025('IV').join(',') === 'E');
verifier('I → A1 et A2', correspondance2008Vers2025('I').join(',') === 'A1,A2');
verifier('II → A1 et A2', correspondance2008Vers2025('II').join(',') === 'A1,A2');
verifier('catégorie inconnue → []', correspondance2008Vers2025('Z').length === 0);
verifier('une catégorie 2025 n’a pas d’antécédent 2008 (V → [])', correspondance2008Vers2025('V').length === 0);
verifier('clés de la table = exactement I/II/III/IV',
  Object.keys(CORRESPONDANCE_2008_VERS_2025).join(',') === 'I,II,III,IV');
verifier('la table de correspondance est gelée (Object.isFrozen)',
  Object.isFrozen(CORRESPONDANCE_2008_VERS_2025));

// --- Cohérence régime ↔ catégorie ---------------------------------
verifier('2008 + I cohérent', categorieCoherente('2008', 'I') === true);
verifier('2025 + A1 cohérent', categorieCoherente('2025', 'A1') === true);
verifier('2008 + A1 INCOHÉRENT', categorieCoherente('2008', 'A1') === false);
verifier('2025 + III INCOHÉRENT', categorieCoherente('2025', 'III') === false);
verifier('régime inconnu → incohérent', categorieCoherente('1999', 'I') === false);

// --- Tri : 2025 avant 2008, dateFin décroissante, null en tête ----
{
  const liste = [
    { regime: '2008', categorie: 'III', dateFin: '2026-01-01' },
    { regime: '2025', categorie: 'A1', dateFin: '2030-01-01' },
    { regime: '2025', categorie: 'B', dateFin: null },
    { regime: '2025', categorie: 'D', dateFin: '2028-01-01' }
  ];
  const trie = [...liste].sort(comparerHabilitations);
  verifier('tri : un 2025 en tête (jamais un 2008)', trie[0].regime === '2025');
  verifier('tri : dateFin null en tête des 2025', trie[0].dateFin === null && trie[0].categorie === 'B');
  verifier('tri : puis dateFin décroissante (A1 2030 avant D 2028)',
    trie[1].categorie === 'A1' && trie[2].categorie === 'D');
  verifier('tri : le 2008 en queue', trie[3].regime === '2008');
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
