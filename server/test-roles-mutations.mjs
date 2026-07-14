// Suite « verrous d'autorisation » (Lot 1 de l'audit du 14/07).
//
// POURQUOI. La garde de rôle du serveur est une LISTE BLANCHE : toute méthode
// ABSENTE de ROLES_MUTATION est traitée comme une lecture, donc exécutée SANS
// AUCUNE restriction (api.js:garderRole — « if (!roles) return; »). L'invariant
// « tout handler qui écrit a une entrée de rôle » tenait uniquement par la
// vigilance : aucun test ne le vérifiait. La brique qui ajouterait demain un
// handler mutant en oubliant sa ligne de rôle ouvrirait la mutation à tout le
// monde — silencieusement, sans un seul test au rouge.
//
// Cette suite ferme ce trou, AVANT que le logiciel ne parte dans d'autres
// établissements (où il y aura de vrais élèves connectés) :
//   1. tout handler qui appelle muter() a bien une entrée dans ROLES_MUTATION ;
//   2. toute entrée de ROLES_MUTATION désigne bien un handler existant ;
//   3. CHACUNE des 43 méthodes gardées REFUSE (403) un rôle insuffisant —
//      y compris « pas de session du tout » ;
//   4. contre-épreuve : avec un rôle autorisé, la garde laisse passer (sinon le
//      test 3 serait satisfait par une garde qui refuse tout le monde).

import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const api = require('./api.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

// Base JETABLE (jamais le data/ réel) : la garde de rôle agit AVANT le handler,
// mais les appels autorisés de la contre-épreuve touchent bien la base.
db.ouvrir(join(mkdtempSync(join(tmpdir(), 'inerweb-fluide-roles-')), 'test.db'));

// ------------------------------------------------------------
// Lecture du SOURCE : quels handlers écrivent réellement ?
// ------------------------------------------------------------
const source = readFileSync(join(import.meta.dirname, 'api.js'), 'utf8');
const debut = source.indexOf('const HANDLERS = {');
const fin = source.indexOf('\n};', debut);
const blocHandlers = source.slice(debut, fin);

/** Découpe le bloc HANDLERS en { nom → corps } (méthodes de premier niveau). */
function decouperHandlers(bloc) {
  const debuts = [];
  const motif = /^ {2}([a-zA-Z_$][\w$]*)\(/gm;
  let trouve;
  while ((trouve = motif.exec(bloc)) !== null) {
    debuts.push({ nom: trouve[1], index: trouve.index });
  }
  const corps = {};
  for (let i = 0; i < debuts.length; i += 1) {
    const finCorps = i + 1 < debuts.length ? debuts[i + 1].index : bloc.length;
    corps[debuts[i].nom] = bloc.slice(debuts[i].index, finCorps);
  }
  return corps;
}

const handlers = decouperHandlers(blocHandlers);
const nomsHandlers = Object.keys(handlers);
const mutants = nomsHandlers.filter((nom) => /\bmuter\(/.test(handlers[nom]));
const gardes = Object.keys(api.ROLES_MUTATION);

verifier('le source est bien découpé (au moins 70 handlers trouvés)',
  nomsHandlers.length >= 70, `${nomsHandlers.length} handlers`);

// ============================================================
// 1. Tout handler qui ÉCRIT a une entrée de rôle
// ============================================================
{
  const sansGarde = mutants.filter((nom) => !gardes.includes(nom));
  verifier(
    `les ${mutants.length} handlers qui appellent muter() ont TOUS une entrée `
    + 'dans ROLES_MUTATION',
    sansGarde.length === 0,
    sansGarde.length ? `SANS GARDE : ${sansGarde.join(', ')}` : '');
}

// `init` écrit (db.transaction → amorcerEtablissement) sans passer par muter()
// et reste VOLONTAIREMENT hors garde : il est appelé au tout premier démarrage,
// AVANT qu'un compte n'existe (sans lui, impossible de créer le 1er ADMIN).
// L'écriture est idempotente (amorcerEtablissement sort si la ligne existe).
// On fige cette exception ici pour qu'elle reste un CHOIX, pas un oubli.
verifier('init est la SEULE écriture tolérée hors garde (amorçage idempotent)',
  !gardes.includes('init') && /db\.transaction\(/.test(handlers.init ?? ''));

// ============================================================
// 2. Toute entrée de rôle désigne un handler existant
// ============================================================
{
  const orphelines = gardes.filter((nom) => !nomsHandlers.includes(nom));
  verifier('aucune entrée de ROLES_MUTATION ne pointe dans le vide',
    orphelines.length === 0,
    orphelines.length ? `ORPHELINES : ${orphelines.join(', ')}` : '');
}

// ============================================================
// 3. Chaque méthode gardée REFUSE un rôle insuffisant (403)
// ============================================================
const TOUS_ROLES = ['ELEVE', 'TECHNICIEN', 'ENSEIGNANT', 'REFERENT', 'ADMIN'];

/** Un rôle qui NE DOIT PAS passer ; `null` = aucune session (cas des OPERATEUR,
 *  ouverts à tous les rôles connus : c'est le visiteur non connecté qu'on teste). */
function roleInsuffisant(roles) {
  return TOUS_ROLES.find((role) => !roles.includes(role)) ?? null;
}

const refusees = [];
const passees = [];
for (const methode of gardes) {
  const roles = api.ROLES_MUTATION[methode];
  const role = roleInsuffisant(roles);
  try {
    // La garde s'applique AVANT le handler : des params vides suffisent, et
    // aucune écriture ne peut avoir lieu si le refus fonctionne.
    api.appeler(methode, {}, { role });
    passees.push(`${methode} (rôle ${role ?? 'aucun'} A ÉTÉ ACCEPTÉ)`);
  } catch (erreur) {
    if (erreur.code === 403) refusees.push(methode);
    else passees.push(`${methode} → ${erreur.code ?? '?'} : ${erreur.message}`);
  }
}
verifier(
  `les ${gardes.length} méthodes gardées refusent TOUTES un rôle insuffisant (403)`,
  refusees.length === gardes.length,
  passees.length ? `NON REFUSÉES : ${passees.join(' | ')}` : '');

// ============================================================
// 4. Contre-épreuve : la garde n'est pas un « refuse tout »
// ============================================================
{
  const bloqueesATort = [];
  for (const methode of gardes) {
    const roleAutorise = api.ROLES_MUTATION[methode][0];
    try {
      api.appeler(methode, {}, { role: roleAutorise });
    } catch (erreur) {
      // Une erreur MÉTIER est normale (params vides) ; un 403, non.
      if (erreur.code === 403) bloqueesATort.push(`${methode} (${roleAutorise})`);
    }
  }
  verifier('un rôle AUTORISÉ franchit la garde (aucun 403 à tort)',
    bloqueesATort.length === 0,
    bloqueesATort.length ? `BLOQUÉES À TORT : ${bloqueesATort.join(', ')}` : '');
}

// ============================================================
// 5. Les habilitations et la validation restent hors de portée d'un ÉLÈVE
//    (les deux cas qui, dans un lycée, feraient le plus de dégâts)
// ============================================================
for (const methode of ['validerMouvement', 'createHabilitation',
  'revoquerHabilitation', 'desactiverPersonne', 'importerJSON']) {
  let code = null;
  try {
    api.appeler(methode, {}, { role: 'ELEVE' });
  } catch (erreur) {
    code = erreur.code ?? null;
  }
  verifier(`un ÉLÈVE ne peut pas « ${methode} »`, code === 403,
    `code = ${code}`);
}

// ------------------------------------------------------------
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [verrous d'autorisation]`);
process.exit(nbEchecs === 0 ? 0 : 1);
