// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// AUCUN MOT NE PROMET PLUS QUE CE QUE LE LOGICIEL FAIT (lot B4, réserve
// R29 — revue adversariale du 27/07).
//
// POURQUOI CETTE SUITE EXISTE. Le lot B4 a corrigé une dizaine de mots
// qui promettaient trop (« inviolable », « inaltérable » sans réserve,
// « preuve opposable », « mot de passe chiffré » pour un hachage). Ces
// corrections n'étaient tenues par RIEN : la contre-épreuve du lot était
// un script hors dépôt, portant sur UN seul mot sur dix. La revue a
// d'ailleurs trouvé deux emplois que le balayage à la main du lot avait
// manqués, dans les surfaces qu'il déclarait pourtant avoir balayées
// (`server/api.js`, `v8/js/data/test-sentinelle.mjs`). C'est la leçon
// déjà payée par `outils/test-promesses-cloud.mjs` : un balayage fait à
// la main, sur une liste établie à la main, ne se rejoue pas et rate ce
// qu'il ne cherchait pas. Cette suite EST le balayage.
//
// CE QUE LA RÈGLE DIT. Dans les surfaces VIVANTES (le code livré, les
// écrans, les guides livrés à l'utilisateur), quatre familles de mots
// sont refusées, et une cinquième doit être qualifiée :
//   1. « inviolable » / « infalsifiable » / « incorruptible » : ils
//      promettent une résistance HORS du canal applicatif, alors que
//      `docs/POINTS-DE-FRICTION.md` § 9 dit l'inverse noir sur blanc
//      (qui a la main sur le fichier de base peut le remplacer).
//   2. « preuve opposable » : revendique une valeur probante forte que
//      le projet n'a jamais visée (aucun ancrage tiers, aucun horodatage
//      qualifié — `LIMITE-DE-RESPONSABILITE.md` § 2 b).
//   3. « mot de passe chiffré » : les mots de passe sont HACHÉS (scrypt,
//      `server/comptes.js`) — « chiffré » laisse croire qu'on peut les
//      relire. L'erreur symétrique existe : le coffre des identités et
//      les archives, eux, sont bien CHIFFRÉS (AES-256-GCM) — la suite ne
//      mord donc que sur « mot de passe chiffré », jamais sur le mot.
//   4. « toute altération se voit » : fausse telle quelle (le témoin de
//      tête se recalcule, § 9) ; elle doit dire par où. La règle mord sur
//      la promesse de VISIBILITÉ (« se voit », « est visible »), jamais
//      sur l'énoncé du mécanisme (« toute altération a posteriori casse
//      la chaîne » — `server/db.js:448`, `SECURITE.md:133` — qui est vrai
//      et nomme ce qu'il fait).
//   5. « inaltérable » reste LÉGAL, mais qualifié « au sein de
//      l'application » — la formule de `README.md:42`.
//
// CE QUE LA RÈGLE NE COUVRE PAS, ET POURQUOI. `docs/` (plans, comptes
// rendus d'audit datés : on ne réécrit pas l'histoire), `CHANGELOG.md`
// (journal de développement, édité par plusieurs mains à la fois) et les
// suites `test-*.mjs` (dont celle-ci, qui doit pouvoir citer les mots
// qu'elle refuse). Le jour où un de ces documents redevient une surface
// vivante, il entre ici.
//
// Aucune I/O réseau, aucune base : lecture seule du dépôt.
// Exécution : node outils/test-mots-qui-promettent.mjs
// ============================================================

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

/**
 * Met le texte à plat pour être jugé comme une PHRASE, pas comme du code :
 * - recolle les chaînes JavaScript coupées en deux (`'…' + '…'`), sans quoi
 *   « inaltérable au sein de ' + 'l'application » passerait pour non qualifié ;
 * - retire les échappements et les étoiles Markdown (`**au sein de…**`) ;
 * - retire les accents, passe en minuscules, écrase les espaces.
 */
function normaliser(texte) {
  return texte
    .replace(/['"]\s*\+\s*['"]/g, '')
    .replace(/\\(['"])/g, '$1')
    .replace(/[’´`]/g, "'")
    .replace(/\*/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Un extrait lisible autour de la position trouvée (pour le message d'échec). */
function extrait(n, index, longueur) {
  return n.slice(Math.max(0, index - 30), index + longueur + 50).trim();
}

// ------------------------------------------------------------
// Les mots REFUSÉS, et le remède à écrire à la place.
// ------------------------------------------------------------
const REFUSES = [
  { motif: /inviolable|infalsifiable|incorruptible/,
    remede: "écrire « inaltérable au sein de l'application » (POINTS-DE-FRICTION § 9)" },
  { motif: /preuve (?:d'usage )?opposable/,
    remede: 'écrire « trace consultable / consignée / journalisée » '
      + '(LIMITE-DE-RESPONSABILITE § 2 b : aucune valeur probante forte)' },
  { motif: /mots? de passe chiffres?/,
    remede: 'écrire « haché » : scrypt, jamais déchiffrable (server/comptes.js)' },
  // ⭐ REVUE DU 27/07 (lot 1 branche A). Le justificatif de régularisation
  // faisait dire à une empreinte qu'elle datait LE PAPIER : « elle prouve
  // que ce justificatif n'a pas ete f-a-b-r-i-q-u-e a-p-r-e-s c-o-u-p »
  // (phrase épelée ici pour ne pas se dénoncer elle-même). C'est faux : le
  // document est composé à la demande, à chaque ouverture ; l'empreinte
  // imprimée est une chaîne RECOPIÉE du registre. Elle soutient que
  // l'ÉCRITURE était scellée à sa création, jamais que cette feuille-ci
  // est d'époque. Même famille que « preuve opposable », que la liste
  // ci-dessus refusait déjà — et même doctrine que borne-scellement.js :
  // on ne dit jamais « le registre est intact ».
  { motif: /(?:n'a pas ete|jamais) (?:fabrique|produit|redige|etabli|imprime) apres coup/,
    remede: 'une empreinte porte sur l’ÉCRITURE, pas sur le papier : dire '
      + 'ce qu’elle permet de RECOUPER (documents/regularisation.js)' },
  // ⭐ REVUE EXTERNE DU 14/08 (relayée par le propriétaire). « Opposable »
  // affirmé d'un registre revendique une force probante que le chaînage
  // SHA-256 seul ne confère pas (art. 1367 C. civ., eIDAS : identification
  // du signataire + fiabilité du procédé). Les COLLOCATIONS affirmatives
  // sont refusées ; le mot reste libre en usage interne (commentaires,
  // « part opposable » du moteur) et dans les tournures de PRUDENCE.
  { motif: /(?:registre|trace|dossier|archive) opposable|simple et opposable/,
    remede: 'écrire « à intégrité vérifiable » / « journal chaîné permettant '
      + 'de détecter une altération » (revue du 14/08, art. 1367 C. civ.)' }
];

// Les mots LÉGAUX à condition d'être qualifiés, avec la fenêtre (en
// caractères, APRÈS le mot) dans laquelle le qualificatif doit tenir.
const A_QUALIFIER = [
  { motif: /inalterable/, qualificatif: /au sein de l'application/, fenetre: 60,
    remede: "faire suivre de « au sein de l'application » (formule de README.md:42)" },
  { motif: /toute alteration [^.;]{0,40}(?:se voit|est visible|se verra)/,
    qualificatif: /(?:par|depuis|au sein de) l'application/, fenetre: 0,
    remede: "dire par où : « toute altération passée par l'application se voit »" }
];

/** Rend la liste des infractions d'un texte (chaînes lisibles, vide si propre). */
function infractionsDuTexte(texte) {
  const n = normaliser(texte);
  const trouvees = [];
  for (const { motif, remede } of REFUSES) {
    const rx = new RegExp(motif.source, 'g');
    let m;
    while ((m = rx.exec(n)) !== null) {
      trouvees.push(`« ${extrait(n, m.index, m[0].length)} » → ${remede}`);
    }
  }
  for (const { motif, qualificatif, fenetre, remede } of A_QUALIFIER) {
    const rx = new RegExp(motif.source, 'g');
    let m;
    while ((m = rx.exec(n)) !== null) {
      const suite = n.slice(m.index + m[0].length, m.index + m[0].length + fenetre);
      if (qualificatif.test(m[0] + suite)) continue;
      trouvees.push(`« ${extrait(n, m.index, m[0].length)} » → ${remede}`);
    }
  }
  return trouvees;
}

// ------------------------------------------------------------
// 1. LE DÉTECTEUR — sa propre contre-épreuve.
//
// Chaque phrase RÉELLEMENT corrigée par le lot B4 est rejouée ici dans sa
// version d'avant : si quelqu'un la remet, le balayage du § 2 la trouve.
// Et chaque emploi LÉGITIME voisin est rejoué aussi : une suite qui mord
// sur « chiffré » ou sur « opposable » tout court ferait mentir le dépôt
// dans l'autre sens.
// ------------------------------------------------------------
console.log('\n--- Le détecteur ---');

verifier('« registre inviolable » est détecté (server/db.js, SPEC-V8 § 5.6, avant B4)',
  infractionsDuTexte('empreinte SHA-256 chaînée → registre inviolable.').length === 1);

verifier('« journal d’audit inviolable » est détecté (RGPD.md § 8, avant B4)',
  infractionsDuTexte('mots de passe hachés, journal d’audit inviolable, sauvegardes chiffrées').length === 1);

verifier('« la preuve d’usage opposable au DPD » est détectée (RGPD.md § 7, avant B4)',
  infractionsDuTexte('chaque ouverture journalisée (la preuve d’usage opposable au DPD).').length === 1);

verifier('« preuve opposable » est détectée dans un commentaire de code (contrat.js, avant B4)',
  infractionsDuTexte('// le CONSIGNE au journal d’audit (preuve opposable)').length === 1);

verifier('« mot de passe chiffré » est détecté (notice RGPD imprimée aux familles, avant B4)',
  infractionsDuTexte('Identifiants de connexion (mot de passe chiffré, jamais en clair)').length === 1);

verifier('« inaltérable » nu est détecté (index.html:243, avant B4)',
  infractionsDuTexte('<h3>Registre inaltérable</h3>').length === 1);

verifier('« Toute altération se voit. » est détectée (index.html:244, avant la revue)',
  infractionsDuTexte('une contre-écriture qui reste visible. Toute altération se voit.').length === 1);

verifier("« inaltérable au sein de l'application » reste légal (README.md:42)",
  infractionsDuTexte('empreintes chaînées (SHA-256) rendant le registre **inaltérable au sein de l\'application** (toute modification via l\'application est refusée).').length === 0);

verifier('une chaîne JavaScript coupée en deux est recollée avant jugement (v8/js/views/rgpd.js:56)',
  infractionsDuTexte("+ 'chaque ouverture est journalisée de façon inaltérable au sein de '\n    + 'l\\'application.</p>'").length === 0);

verifier('« sauvegardes chiffrées » et « coffre chiffré » restent légaux (AES-256-GCM, vrai chiffrement)',
  infractionsDuTexte("Une copie complète et chiffrée ; l'identité est chiffrée dans le coffre.").length === 0);

verifier('« conçu pour être opposable » (l’AMBITION, dite comme telle) reste légal',
  infractionsDuTexte('Le registre des mouvements de fluides est conçu pour être **opposable**.').length === 0);

verifier('« registre opposable » AFFIRMÉ est refusé depuis la revue du 14/08 '
  + '(le chaînage seul ne confère pas la force probante — art. 1367 C. civ.)',
infractionsDuTexte('Le dossier annuel sort du registre opposable.').length === 1);

verifier("« toute altération passée par l'application se voit » reste légal",
  infractionsDuTexte("Toute altération passée par l'application se voit.").length === 0);

// ------------------------------------------------------------
// 2. LE BALAYAGE RÉEL — code livré, écrans, guides de la racine.
//
// Même leçon que test-promesses-cloud : un balayage qui ne couvre que la
// documentation laisse passer l'écran, et c'est l'écran que la personne
// concernée lit. On balaye donc les DEUX.
// ------------------------------------------------------------
console.log('\n--- Les surfaces vivantes ---');

/** Fichiers servis à l'utilisateur, en descendant les dossiers. */
function fichiersLivres(dossier, acc = []) {
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    if (entree.name === 'lib' || entree.name === 'node_modules') continue;
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) fichiersLivres(chemin, acc);
    else if (/\.(js|mjs|html|css)$/i.test(entree.name)
      && !/^test-/.test(entree.name)) acc.push(chemin);
  }
  return acc;
}

const SURFACES = [
  ...fichiersLivres(join(RACINE, 'v8')),
  ...fichiersLivres(join(RACINE, 'server')),
  join(RACINE, 'index.html'),
  join(RACINE, 'guide.html'),
  ...readdirSync(RACINE)
    .filter((nom) => /\.md$/i.test(nom) && nom !== 'CHANGELOG.md')
    .map((nom) => join(RACINE, nom))
].filter((c) => existsSync(c));

verifier('les surfaces à balayer sont trouvées (dont la notice RGPD de l’application, index.html et RGPD.md)',
  SURFACES.some((c) => c.endsWith(join('views', 'rgpd.js')))
  && SURFACES.some((c) => c.endsWith('index.html'))
  && SURFACES.some((c) => c.endsWith('RGPD.md')),
  `${SURFACES.length} fichier(s)`);

const coupables = [];
for (const chemin of SURFACES) {
  const infractions = infractionsDuTexte(readFileSync(chemin, 'utf8'));
  for (const infraction of infractions) {
    coupables.push(`${relative(RACINE, chemin)} → ${infraction}`);
  }
}
verifier('aucun mot ne promet plus que ce que le logiciel fait',
  coupables.length === 0, `\n      ${coupables.join('\n      ')}`);

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
