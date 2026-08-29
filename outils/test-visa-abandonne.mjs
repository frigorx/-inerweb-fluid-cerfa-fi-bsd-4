// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// AUCUNE CONDITION NE PEUT DÉPENDRE D'UN ÉVÉNEMENT QUI N'ARRIVERA PAS
// (brique B5 du lot 0, 4e audit externe — revue adversariale).
//
// Le « visa T3 » (relecture des valeurs réglementaires par un organisme
// agréé) a été ABANDONNÉ le 26/07/2026 : un organisme agréé délivre des
// attestations de capacité, il ne rend pas d'avis sur l'outil d'un tiers
// (docs/NOTE-DECISION-ETABLISSEMENT.md §4). Le critère d'ouverture n'est
// plus un visa mais la réunion de trois choses : décision écrite de
// l'établissement, pilote mené en parallèle sans écart, risques résiduels
// acceptés nommément.
//
// Conséquence : plus AUCUN texte vivant ne doit poser ce visa comme une
// condition à venir (« fermé jusqu'au visa », « à confirmer via T3 »,
// « tant que le visa manque »). Un lecteur — élève, auditeur, ou nous
// dans six mois — croirait qu'il suffit d'attendre. Dans un dépôt dont
// toute la valeur est la preuve citée, une condition impossible écrite au
// présent est un défaut au même titre qu'un bug.
//
// LA RÈGLE TENUE ICI : dans les fichiers ci-dessous, toute mention de
// « visa » ou de « T3 » doit être accompagnée, à portée de phrase, du
// mot « abandonné ». On n'interdit pas d'en parler — on interdit d'en
// parler comme d'une échéance.
//
// PÉRIMÈTRE, et pourquoi il s'arrête là :
//  - tout le CODE LIVRÉ (server/, v8/js/ hors lib tierce, outils/, pages
//    HTML de la racine) : c'est là que la règle vit ;
//  - docs/CARTE-CODE.md, seul document qui se déclare lui-même « état
//    COURANT, aucune valeur périmée ne doit y rester ».
// SONT HORS PÉRIMÈTRE, à dessein et nommément : le CHANGELOG (journal
// daté, jamais réécrit), les rapports d'audit et les documents qui
// EXPLIQUENT l'abandon (NOTE-DECISION, POINTS-DE-FRICTION,
// LIMITE-DE-RESPONSABILITE, REGISTRE-DES-ARBITRAGES, T3-DOSSIER), et les
// plans/prompts qui conservent des blocs d'époque explicitement archivés
// (PLAN-LOTS §L3/§L5 « énoncé d'origine », PROMPT-REPRISE). Réécrire un
// bloc daté serait faire dire à hier ce qu'on sait aujourd'hui.
//
// EST AUSSI HORS PÉRIMÈTRE, depuis le 29/08/2026 : `pedagogie/`. Ce sont
// des modules d'enseignement autonomes, sans aucun rapport avec
// l'ouverture du mode Officiel — la règle gardée ici n'y vit pas. Le
// périmètre annoncé en tête (« server/, v8/js/, outils/, pages HTML de la
// racine ») les excluait déjà en intention ; l'inventaire, lui, prenait
// tout le dépôt, parce qu'au moment où cette suite a été écrite il n'y
// avait rien d'autre à prendre. L'écart s'est vu le jour où un module a
// nommé ses six voies de température T1 à T6 : douze mentions de « T3 »
// qui ne parlent pas du visa, et un filet rouge pour un homonyme.
//
// C'est le même choix que pour `docs/` : on exclut un arbre entier quand
// ce n'est pas la surface vivante du logiciel. Ce que l'exclusion ne doit
// PAS faire, c'est se mettre à couvrir du code livré sans qu'on le voie —
// d'où les contre-épreuves du § B : les surfaces du logiciel restent
// nommément dans l'inventaire, et `pedagogie/` en est nommément absent.
//
// Exécution : node outils/test-visa-abandonne.mjs
// ============================================================

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXCLUS_PARTOUT = new Set(['.git', 'node_modules', '.claude']);
// Mêmes exclusions de racine que le lanceur (dossiers de l'utilisateur).
const EXCLUS_RACINE = new Set([
  'data', 'documents', 'backups', 'exports', 'img', 'css', 'apps-script', 'docs',
  // Les modules d'enseignement : autonomes, hors du logiciel, et sans
  // rapport avec le visa. Voir l'en-tête, § PÉRIMÈTRE.
  'pedagogie'
]);
// Les seuls fichiers du dépôt que nous n'avons pas écrits.
const DOSSIER_TIERS = 'v8/js/lib';
// Le document qui se déclare « état COURANT ».
const DOC_ETAT_COURANT = 'docs/CARTE-CODE.md';
// La suite s'exclut d'elle-même : ses échantillons SONT les tournures
// interdites, elle se déclarerait fautive au premier passage.
const MOI = 'outils/test-visa-abandonne.mjs';
// Un fichier dont on sait ce qu'il contient : il prouve que la lecture
// des fichiers fonctionne vraiment (sans quoi une suite verte ne dirait
// rien du tout).
const TEMOIN_LECTURE = 'v8/js/data/equipement.js';

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

// « visa » / « visas » et « T3 » isolés. Ni « visait », ni « visé », ni
// les identifiants de jeu d'essai (UTI-T3, MVT-T3), ni le nom du dossier
// T3-DOSSIER-RELECTURE-EXTERNE.md : un tiret collé disqualifie.
const MOTIF_MENTION = /(?<![\w-])(?:visas?|T3)(?![\w-])/gi;
const MOTIF_ABANDON = /abandonn/i;
// Portée de phrase. Volontairement courte EN ARRIÈRE : un « abandonné »
// écrit trois puces plus haut ne dit rien de la puce qu'on lit.
const AVANT = 60;
const APRES = 150;

/** Tous les fichiers de code du dépôt (hors bibliothèques tierces). */
function inventorier(dossier, fichiers) {
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    const relatif = relative(RACINE, chemin).split('\\').join('/');
    if (entree.isDirectory()) {
      if (EXCLUS_PARTOUT.has(entree.name)) continue;
      if (dossier === RACINE && EXCLUS_RACINE.has(entree.name)) continue;
      if (relatif === DOSSIER_TIERS) continue;
      inventorier(chemin, fichiers);
      continue;
    }
    if (relatif === MOI) continue;
    if (/\.(js|mjs|html)$/.test(entree.name)) fichiers.push({ relatif, chemin });
  }
}

/** Les mentions non accompagnées du mot « abandonné ». */
function mentionsOrphelines(texte, relatif) {
  const orphelines = [];
  let acceptees = 0;
  for (const trouve of texte.matchAll(MOTIF_MENTION)) {
    const i = trouve.index;
    const fenetre = texte.slice(Math.max(0, i - AVANT), i + APRES);
    if (MOTIF_ABANDON.test(fenetre)) { acceptees += 1; continue; }
    const ligne = texte.slice(0, i).split('\n').length;
    const extrait = fenetre.replace(/\s+/g, ' ').trim().slice(0, 110);
    orphelines.push(`${relatif}:${ligne} « ${extrait} »`);
  }
  return { orphelines, acceptees };
}

// ============================================================
// A. Le détecteur sait échouer (et sait se taire quand il faut)
// ============================================================
console.log('\n--- Le détecteur lui-même ---');
const ECHANTILLON_FAUTIF = 'derrière EXEMPTION_HERMETIQUE_ACTIVE = false — fermé jusqu\'au visa T3.';
const ECHANTILLON_JUSTE = 'fermé tant que les trois conditions qui remplacent le visa T3 '
  + '(abandonné le 26/07/2026) ne sont pas réunies.';
const ECHANTILLON_INNOCENT = 'la garde visait le fichier UTI-T3 cité dans '
  + 'docs/T3-DOSSIER-RELECTURE-EXTERNE.md, hors sujet.';
// Deux mentions par phrase : « visa » et « T3 » comptent chacune.
verifier('une condition posée sur le visa est REFUSÉE',
  mentionsOrphelines(ECHANTILLON_FAUTIF, 'echantillon').orphelines.length === 2);
verifier('la même phrase disant l\'abandon est ACCEPTÉE',
  mentionsOrphelines(ECHANTILLON_JUSTE, 'echantillon').orphelines.length === 0
  && mentionsOrphelines(ECHANTILLON_JUSTE, 'echantillon').acceptees === 2);
verifier('« visait », « UTI-T3 » et « T3-DOSSIER-… » ne sont PAS des mentions',
  mentionsOrphelines(ECHANTILLON_INNOCENT, 'echantillon').orphelines.length === 0
  && mentionsOrphelines(ECHANTILLON_INNOCENT, 'echantillon').acceptees === 0);

// ============================================================
// B. Le dépôt est vraiment lu
// ============================================================
const fichiers = [];
inventorier(RACINE, fichiers);
if (existsSync(join(RACINE, DOC_ETAT_COURANT))) {
  fichiers.push({ relatif: DOC_ETAT_COURANT, chemin: join(RACINE, DOC_ETAT_COURANT) });
}

console.log('\n--- Inventaire ---');
verifier('le code du dépôt a bien été parcouru',
  fichiers.length > 100, `${fichiers.length} fichiers`);
verifier(`la carte du code est dans le périmètre (${DOC_ETAT_COURANT})`,
  fichiers.some((f) => f.relatif === DOC_ETAT_COURANT));
const temoin = fichiers.find((f) => f.relatif === TEMOIN_LECTURE);
verifier('les fichiers sont réellement lus (témoin)',
  !!temoin && readFileSync(temoin.chemin, 'utf8').includes('EXEMPTION_HERMETIQUE_ACTIVE'),
  TEMOIN_LECTURE);

// Une exclusion d'arbre entier ne se contrôle pas toute seule : elle peut
// se mettre à avaler du code livré sans que personne ne le voie. Les deux
// contrôles suivants la tiennent des deux côtés.
const SURFACES_LOGICIEL = ['server/api.js', 'v8/js/app.js', 'index.html', 'outils/plan-tests.mjs'];
const manquantes = SURFACES_LOGICIEL.filter((f) => !fichiers.some((x) => x.relatif === f));
verifier('les surfaces du logiciel sont toujours dans le périmètre',
  manquantes.length === 0, manquantes.join(', '));

const dansPedagogie = fichiers.filter((f) => f.relatif.startsWith('pedagogie/'));
verifier('`pedagogie/` est bien hors périmètre',
  dansPedagogie.length === 0, dansPedagogie.slice(0, 3).map((f) => f.relatif).join(', '));

// Et l'exclusion doit encore servir à quelque chose : le jour où
// `pedagogie/` disparaîtrait, cette ligne dirait qu'elle est devenue morte
// plutôt que de la laisser rassurer pour rien.
if (existsSync(join(RACINE, 'pedagogie'))) {
  console.log('  --  `pedagogie/` existe : l\'exclusion porte sur du réel.');
} else {
  console.log('  --  `pedagogie/` a disparu : l\'exclusion est devenue morte, la retirer.');
}

// ============================================================
// C. Plus aucune condition ne pend à un visa qui ne viendra pas
// ============================================================
const orphelines = [];
let acceptees = 0;
for (const fichier of fichiers) {
  const bilan = mentionsOrphelines(readFileSync(fichier.chemin, 'utf8'), fichier.relatif);
  orphelines.push(...bilan.orphelines);
  acceptees += bilan.acceptees;
}

console.log('\n--- Mentions du visa T3 ---');
console.log(`  (${acceptees} mention(s) accompagnée(s) de l'abandon)`);
verifier('aucun texte livré ne pose le visa T3 comme une condition à venir',
  orphelines.length === 0, orphelines.join(' | '));

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
