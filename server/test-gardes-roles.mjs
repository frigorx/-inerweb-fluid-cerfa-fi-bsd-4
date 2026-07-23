// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// Suite « le filet ne met jamais en défaut les gardes de rôle » (constat lot 1
// de docs/AUDIT-QUALITE-2026-07.md, brique 5 : I3 — « 40 des 43 gardes de
// rôle ne sont jamais mises en défaut par un test »).
//
// RÔLE. Prouve, en ITÉRANT dynamiquement sur les clés exportées de
// ROLES_MUTATION (toute future méthode mutante est donc couverte d'office,
// sans qu'il faille penser à revenir modifier cette suite) :
//   a) sans rôle du tout ({}) — chaque méthode gardée est REFUSÉE, avec le
//      message canonique exact et le code 403 ;
//   b) avec un rôle INSUFFISANT choisi dynamiquement (le premier rôle de la
//      liste globale des rôles qui n'appartient PAS à la liste autorisée de
//      la méthode) — même refus ;
//   c) le refus a lieu AVANT le handler : appeler avec params {} produit
//      TOUJOURS l'erreur de rôle (403), jamais une erreur de validation
//      métier ni « méthode non encore implémentée » (501) ;
//   d) une LECTURE (méthode hors ROLES_MUTATION, ex. getFluides) passe SANS
//      rôle — c'est le comportement actuel (aucune restriction de lecture),
//      on le fige pour qu'une régression future soit visible.
//
// ENTRÉES/SORTIES. Aucune entrée : script autonome. Sortie = compte rendu
// console + code de sortie 1 si un ÉCHEC. Base SQLite JETABLE (mkdtemp),
// jamais data/ réel.
//
// PIÈGE évité : la liste des rôles existants n'est PAS recopiée en dur ici
// à part la liste de référence ROLES_COMPTE (routes-comptes.js) — c'est la
// même source que le reste du dépôt (server/test-roles-mutations.mjs).
// Le rôle « TECHNICIEN » apparaît dans ROLES_MUTATION (OPERATEUR) mais pas
// dans ROLES_COMPTE : on l'ajoute donc à la liste globale de test, sans quoi
// aucun rôle insuffisant ne pourrait jamais être trouvé pour un handler
// OPERATEUR (OPERATEUR = tous les rôles de ROLES_COMPTE, ELEVE inclus).

import { createRequire } from 'node:module';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const api = require('./api.js');
const { ROLES_COMPTE } = require('./routes-comptes.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(label, condition, detail = '') {
  if (condition) {
    nbOk += 1;
    console.log(`  OK  ${label}`);
  } else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

// Base JETABLE (jamais le data/ réel) : la variable d'environnement de
// chemin n'est pas utilisée ici, db.ouvrir prend directement le chemin —
// même motif que server/test-roles-mutations.mjs.
db.ouvrir(join(mkdtempSync(join(tmpdir(), 'inerweb-fluide-gardes-')), 'test.db'));

const gardes = Object.keys(api.ROLES_MUTATION);
verifier('ROLES_MUTATION expose au moins une méthode gardée',
  gardes.length > 0, `${gardes.length} méthode(s)`);

// Liste globale des rôles existants : ROLES_COMPTE (comptes réellement
// créables) complétée de TECHNICIEN, qui figure dans OPERATEUR (api.js)
// sans être un rôle de compte au sens routes-comptes.js.
const TOUS_ROLES = [...new Set([...ROLES_COMPTE, 'TECHNICIEN'])];
verifier('la liste globale des rôles couvre bien tous les rôles cités par ROLES_MUTATION',
  gardes.every((methode) => api.ROLES_MUTATION[methode]
    .every((role) => TOUS_ROLES.includes(role))),
  TOUS_ROLES.join(', '));

/** Construit le message canonique attendu pour une garde donnée (miroir
 *  EXACT de garderRole dans api.js — le texte compte, pas seulement le code). */
function messageAttendu(methode, roles, roleCourant) {
  return `Action « ${methode} » réservée aux rôles habilités ` +
    `(${roles.join(', ')}) — rôle courant : ${roleCourant ?? 'aucun'}.`;
}

// ============================================================
// a) et c) — contexte SANS rôle du tout : refus AVANT le handler
// ============================================================
for (const methode of gardes) {
  const roles = api.ROLES_MUTATION[methode];
  let erreur = null;
  try {
    api.appeler(methode, {}, {});
  } catch (e) {
    erreur = e;
  }
  verifier(`« ${methode} » sans rôle (contexte {}) est refusée`,
    erreur !== null && erreur.code === 403,
    erreur ? `code = ${erreur.code}, message = ${erreur.message}` : 'aucune erreur levée');
  if (erreur) {
    verifier(`« ${methode} » sans rôle porte le message canonique exact`,
      erreur.message === messageAttendu(methode, roles, null),
      `obtenu : ${erreur.message}`);
  }
}

// ============================================================
// b) — rôle INSUFFISANT choisi dynamiquement, par méthode
// ============================================================
// Cas particulier : les méthodes de niveau OPERATEUR autorisent DÉJÀ tous
// les rôles connus (aucun élève ne peut être « en trop ») — il n'existe
// alors aucun rôle insuffisant à opposer autre que « pas de rôle du tout »,
// déjà prouvé au bloc a). On le constate explicitement (ce n'est PAS un
// échec de couverture) plutôt que de le traiter en échec de recherche.
for (const methode of gardes) {
  const roles = api.ROLES_MUTATION[methode];
  const roleInsuffisant = TOUS_ROLES.find((role) => !roles.includes(role));
  if (roleInsuffisant === undefined) {
    verifier(
      `« ${methode} » autorise déjà TOUS les rôles connus (pas de rôle `
      + 'insuffisant à opposer hors « pas de rôle », couvert en a)',
      TOUS_ROLES.every((role) => roles.includes(role)),
      `roles autorisés : ${roles.join(', ')}`);
    continue;
  }

  let erreur = null;
  try {
    api.appeler(methode, {}, { role: roleInsuffisant });
  } catch (e) {
    erreur = e;
  }
  verifier(`« ${methode} » avec le rôle insuffisant « ${roleInsuffisant} » est refusée`,
    erreur !== null && erreur.code === 403,
    erreur ? `code = ${erreur.code}, message = ${erreur.message}` : 'aucune erreur levée');
  if (erreur) {
    verifier(`« ${methode} » (rôle insuffisant) porte le message canonique exact`,
      erreur.message === messageAttendu(methode, roles, roleInsuffisant),
      `obtenu : ${erreur.message}`);
  }
}

// ============================================================
// c) contre-épreuve explicite : le refus n'est JAMAIS une erreur métier
// ni un « non implémentée » (501) — c'est bien 403, systématiquement,
// avant tout accès aux params.
// ============================================================
{
  const codesInattendus = [];
  for (const methode of gardes) {
    try {
      api.appeler(methode, {}, {});
      codesInattendus.push(`${methode} (aucune erreur)`);
    } catch (e) {
      if (e.code !== 403) codesInattendus.push(`${methode} → code ${e.code}`);
    }
  }
  verifier(
    'aucune méthode gardée ne laisse passer une erreur métier/501 avant le rôle',
    codesInattendus.length === 0,
    codesInattendus.length ? codesInattendus.join(' | ') : '');
}

// ============================================================
// d) une LECTURE (hors ROLES_MUTATION) passe SANS rôle — comportement
// actuel figé (aucune restriction de lecture).
// ============================================================
{
  verifier('getFluides est bien HORS ROLES_MUTATION (c\'est une lecture)',
    !gardes.includes('getFluides'));
  let erreur = null;
  let resultat = null;
  try {
    resultat = api.appeler('getFluides', {}, {});
  } catch (e) {
    erreur = e;
  }
  verifier('getFluides répond SANS rôle (aucune restriction de lecture)',
    erreur === null && resultat !== undefined,
    erreur ? `erreur inattendue : code ${erreur.code}, ${erreur.message}` : '');
}

// ============================================================
// e) P1-2 (D5) — ADMINISTRER le référentiel des fluides est réservé au
// RÉFÉRENT et à l'ADMIN. Un PRP pilote les tonnes équivalent CO₂, donc
// les seuils de contrôle, donc les obligations de l'établissement : ni
// un élève, ni même un enseignant valideur n'y touche. Décision figée
// ici explicitement (la boucle générale ci-dessus ne dit pas QUELS
// rôles sont attendus).
// ============================================================
{
  for (const methode of ['createFluide', 'updateFluide']) {
    const roles = api.ROLES_MUTATION[methode];
    verifier(`« ${methode} » est réservée à REFERENT et ADMIN`,
      Array.isArray(roles) && roles.length === 2
      && roles.includes('REFERENT') && roles.includes('ADMIN'),
      `rôles = ${Array.isArray(roles) ? roles.join(', ') : 'aucun'}`);
    for (const roleRefuse of ['ELEVE', 'ENSEIGNANT', 'TECHNICIEN']) {
      let refus = null;
      try {
        api.appeler(methode, {}, { role: roleRefuse });
      } catch (e) {
        refus = e;
      }
      verifier(`« ${methode} » est refusée au rôle « ${roleRefuse} »`,
        refus !== null && refus.code === 403,
        refus ? `code = ${refus.code}` : 'aucune erreur levée');
    }
  }
}

// ------------------------------------------------------------
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [gardes de rôle]`);
process.exit(nbEchecs === 0 ? 0 : 1);
