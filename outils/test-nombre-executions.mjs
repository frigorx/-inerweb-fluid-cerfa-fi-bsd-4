// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// LE NOMBRE D'EXÉCUTIONS ANNONCÉ EST LE NOMBRE RÉEL.
// Exécution : node outils/test-nombre-executions.mjs
//
// POURQUOI CETTE SUITE EXISTE (revue adversariale du 27/07/2026).
// Le dépôt annonce « TOUT VERT — N exécutions » dans HUIT pièces, dont
// celles remises à l'établissement, et il y ajoute « vérifiez par
// vous-même : node outils/lancer-tests.mjs --tout ». Le jour de la revue,
// ces pièces disaient 128 pendant que la branche en jouait 131 — et
// AUCUNE suite ne gardait ce nombre. Une pièce qui invite à vérifier ne
// peut pas rendre un autre chiffre que celui qu'elle annonce : c'est le
// genre d'écart qui décrédibilise tout le reste, à commencer par les
// chiffres qui, eux, sont justes.
//
// Le nombre est DÉDUIT du plan (outils/plan-tests.mjs), jamais écrit en
// dur ici : ajouter une suite ne casse pas cette suite-ci, cela casse
// seulement les ANNONCES restées en arrière — ce qui est exactement le
// but. Même mécanique que outils/test-inventaire-documents-sans-marque.
//
// ⚠ Cette suite est elle-même découverte par le lanceur : elle se compte
// dans le nombre qu'elle vérifie, et c'est cohérent.
// Node ≥ 22, zéro dépendance.
// ============================================================

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RACINE, nombreExecutions } from './plan-tests.mjs';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

console.log('\n— Le nombre d’exécutions annoncé = le nombre réel —');

const attendu = nombreExecutions();
verifier(`le plan du filet se recompte (${attendu} exécutions)`,
  Number.isInteger(attendu) && attendu > 100, `attendu = ${attendu}`);

// Les pièces qui ANNONCENT le nombre COMME ÉTAT COURANT. Toute pièce
// livrée qui écrit « N exécutions » au présent doit dire le bon N —
// même exigence que pour l'inventaire des documents sans marque.
const PIECES = [
  'docs/CARTE-CODE.md',
  'docs/NOTE-DECISION-ETABLISSEMENT.md',
  'docs/POINTS-DE-FRICTION.md',
  'docs/BRIEF-AUDITEUR-EXTERNE.md',
  'docs/PROMPT-REPRISE-AUDIT-EXTERNE.md',
  'LIMITE-DE-RESPONSABILITE.md'
];

// ⚠ EXCLUSION NOMMÉE, comme le fait outils/test-visa-abandonne.mjs.
// `docs/PROMPT-REPRISE.md` est un JOURNAL : il conserve à dessein des
// « blocs d'époque » datés (87, 95, 98, 101, 104, 106, 121 exécutions).
// Exiger d'eux le compte du jour reviendrait à RÉÉCRIRE L'HISTOIRE, ce
// que ce dépôt ne fait pas. Son repère courant (§ « Repère au … ») se
// tient donc à la main — c'est un choix, pas un oubli.
const JOURNAUX_EXCLUS = ['docs/PROMPT-REPRISE.md'];

// Une annonce est HISTORIQUE — donc hors jugement — quand sa ligne le DIT
// au passé. ⚠ Une simple date ne suffit pas à distinguer : « 132
// exécutions au 27/07/2026 » est l'état COURANT daté, « 106 exécutions au
// 25/07 » un état révolu. Seule la tournure tranche, et elle est donc
// exigée : « comptait », « bloc d'époque », « à cette date ».
const MARQUEUR_EPOQUE = /comptait|bloc d'époque|à cette date|à cette époque/i;

// « 128 exécutions », « 132 EXÉCUTIONS », au singulier comme au pluriel.
const MOTIF = /(\d+)\s+ex[ée]cutions?/gi;

let annoncesVues = 0;
for (const piece of PIECES) {
  const chemin = join(RACINE, piece);
  if (!existsSync(chemin)) { verifier(`${piece} : pièce trouvée`, false); continue; }
  const texte = readFileSync(chemin, 'utf8');
  const lignes = texte.split('\n');
  const fausses = [];
  let compte = 0;
  lignes.forEach((ligne, index) => {
    if (MARQUEUR_EPOQUE.test(ligne)) return;
    MOTIF.lastIndex = 0;
    let trouvee;
    while ((trouvee = MOTIF.exec(ligne)) !== null) {
      compte += 1;
      annoncesVues += 1;
      if (Number(trouvee[1]) !== attendu) {
        fausses.push(`« ${trouvee[0]} » (ligne ${index + 1})`);
      }
    }
  });
  verifier(`${piece} : ses ${compte} annonce(s) courante(s) disent `
    + `« ${attendu} exécutions »`,
  fausses.length === 0, fausses.join(' | '));
}

verifier('l’exclusion du journal daté est NOMMÉE, jamais un motif large',
  JOURNAUX_EXCLUS.length === 1
  && JOURNAUX_EXCLUS[0] === 'docs/PROMPT-REPRISE.md'
  && !PIECES.includes(JOURNAUX_EXCLUS[0]));

verifier('au moins une pièce annonce le nombre (le motif mord encore)',
  annoncesVues > 0, `${annoncesVues} annonce(s)`);

// Le lanceur imprime bien ce nombre-là : sans cela, la vérification
// porterait sur un compte que personne ne voit passer.
const lanceur = readFileSync(join(RACINE, 'outils/lancer-tests.mjs'), 'utf8');
verifier('le lanceur tire son compte du MÊME plan (aucun second comptage)',
  lanceur.includes("from './plan-tests.mjs'")
  && lanceur.includes('planifier(decouvrirSuites())'));
verifier('… et il l’imprime, à l’ouverture comme au bilan',
  lanceur.includes('${plan.length} exécutions'));

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
