// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// AUCUNE PROMESSE DE MODE CLOUD DANS LES DOCUMENTS LIVRÉS (constat A18).
//
// Le nettoyage P2-4/P2-5 (23/07) a retiré la promesse « Cloud UE /
// Supabase » de README, SECURITE et RGPD — mais PAS de SAUVEGARDE.md,
// dont la section 8 promettait des « sauvegardes automatiques côté
// serveur » qui n'existent pas. Une promesse de sauvegarde inexistante
// est la pire des promesses : l'utilisateur croit ses données copiées
// et ne fait rien d'autre. La cause racine : le nettoyage a traité une
// liste de fichiers établie à la main, sans balayage de contrôle final.
// Cette suite EST ce balayage.
//
// Règle : dans les guides livrés à l'utilisateur (les .md de la racine
// du dépôt, CHANGELOG exclu — c'est le journal de développement), toute
// mention de Supabase, de « mode Cloud » ou d'un hébergement distant
// doit être accompagnée, DANS LE MÊME PARAGRAPHE, d'une marque de
// non-implémentation ou de retrait. La suite mord sur la PROMESSE,
// jamais sur le mot : une mention historique ou explicitement marquée
// « non implémenté » reste légale, tout comme « le cloud de
// l'établissement » (l'espace de stockage du lycée pour les copies de
// sauvegarde, qui n'a rien à voir avec un mode du logiciel).
//
// Cas particulier : INSTALLATION_CLOUD.md est conservé comme NOTE DE
// CONCEPTION (choix assumé du 23/07). Il est couvert par son bandeau :
// il doit dire « NON IMPLÉMENTÉ » et « n'appliquez pas ce guide » dans
// ses 20 premières lignes, faute de quoi la suite refuse le fichier.
//
// Exécution : node outils/test-promesses-cloud.mjs
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

/** Minuscules, accents retirés, apostrophes typographiques normalisées. */
function normaliser(texte) {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’´`]/g, "'").toLowerCase();
}

// Ce qui rend un paragraphe SUSPECT (sur texte normalisé). Volontairement
// étroit : « cloud » seul est un mot légitime (le cloud de l'établissement).
const MOTIFS_SUSPECTS = [
  /supabase/,
  /mode cloud/,
  /cloud lycee/,
  /hebergement distant/
];

// Ce qui INNOCENTE le paragraphe : la mention dit elle-même que le mode
// n'existe pas, ou qu'il a été retiré.
const MOTIFS_MARQUE = [
  /non implemente/,
  /pas implemente/,
  /jamais implemente/,
  /n'existe pas/,
  /aucun service distant/,
  /note de conception/,
  /retiree?/,
  /abandonnee?/
];

/**
 * Découpe un Markdown en paragraphes (blocs séparés par une ligne vide).
 * Un bloc fait UNIQUEMENT de titres se rattache au bloc suivant : un
 * titre « Mode Cloud » isolé doit être jugé avec le texte qu'il annonce.
 */
function decouperEnParagraphes(texte) {
  const bruts = texte.split(/\r?\n[ \t]*\r?\n/);
  const blocs = [];
  let titreEnAttente = '';
  for (const brut of bruts) {
    const lignes = brut.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lignes.length === 0) continue;
    const titreSeul = lignes.every((l) => /^#{1,6}\s/.test(l.trim()));
    if (titreSeul) {
      titreEnAttente = `${titreEnAttente}${titreEnAttente ? '\n' : ''}${brut}`;
      continue;
    }
    blocs.push(`${titreEnAttente}${titreEnAttente ? '\n' : ''}${brut}`);
    titreEnAttente = '';
  }
  if (titreEnAttente) blocs.push(titreEnAttente);
  return blocs;
}

/** Retourne la première ligne de chaque paragraphe en infraction. */
function promessesDuTexte(texte) {
  const infractions = [];
  for (const bloc of decouperEnParagraphes(texte)) {
    const n = normaliser(bloc);
    if (!MOTIFS_SUSPECTS.some((motif) => motif.test(n))) continue;
    if (MOTIFS_MARQUE.some((motif) => motif.test(n))) continue;
    infractions.push(bloc.trim().split(/\r?\n/)[0].trim());
  }
  return infractions;
}

// ------------------------------------------------------------
// 1. Le détecteur lui-même : il mord sur la promesse, pas sur le mot.
// ------------------------------------------------------------
console.log('\n--- Le détecteur ---');

// La phrase EXACTE retirée de SAUVEGARDE.md (constat A18). Si quelqu'un
// la remet, le balayage ci-dessous doit la trouver : on le prouve ici.
const PHRASE_LITIGIEUSE = '### Mode Cloud Lycée\n'
  + 'En mode Cloud, les **sauvegardes automatiques sont assurées côté serveur** (Supabase,\n'
  + "hébergement dans l'Union européenne) selon une planification régulière.";
verifier('la promesse retirée de SAUVEGARDE.md serait détectée (constat A18)',
  promessesDuTexte(PHRASE_LITIGIEUSE).length === 1);

verifier('une mention marquée « non implémenté » reste légale',
  promessesDuTexte("Le « mode Cloud » n'existe pas dans le programme : non implémenté.").length === 0);

verifier("« le cloud de l'établissement » (copie de sauvegarde du lycée) reste légal",
  promessesDuTexte("Chaque mois, déposez le dernier ZIP sur le cloud de l'établissement.").length === 0);

verifier('un titre isolé est jugé avec le paragraphe qu\'il annonce',
  promessesDuTexte('### Mode Cloud\n\nCe mode est non implémenté à ce jour.').length === 0);

verifier('une promesse Supabase sans marque est détectée même sans le mot « cloud »',
  promessesDuTexte('Vos données sont répliquées chaque nuit vers Supabase.').length === 1);

// ------------------------------------------------------------
// 2. Le balayage réel : les guides livrés à l'utilisateur.
// ------------------------------------------------------------
console.log('\n--- Les guides livrés ---');

// CHANGELOG.md est le journal de développement, pas un guide livré : il
// raconte l'histoire (« promesse retirée le 23/07 ») et trois agents
// peuvent l'éditer en parallèle — on ne le juge pas.
const GUIDES = readdirSync(RACINE)
  .filter((nom) => /\.md$/i.test(nom) && nom !== 'CHANGELOG.md')
  .sort();

// Tri du 14/08/2026 : INSTALLATION_CLOUD.md (la note de conception
// Supabase, jamais appliquée) a quitté la version courante — s'il
// REVENAIT, il serait jugé comme n'importe quel guide, bandeau compris.
verifier('les guides à balayer sont bien trouvés (dont SAUVEGARDE.md)',
  GUIDES.includes('SAUVEGARDE.md'), GUIDES.join(', '));

for (const nom of GUIDES) {
  const texte = readFileSync(join(RACINE, nom), 'utf8');

  if (nom === 'INSTALLATION_CLOUD.md') {
    // Revenant d'archives : son bandeau doit couvrir tout le fichier.
    const entete = normaliser(texte.split(/\r?\n/).slice(0, 20).join('\n'));
    verifier("INSTALLATION_CLOUD.md porte son bandeau « NON IMPLÉMENTÉ — n'appliquez pas ce guide » en tête",
      /non implemente/.test(entete) && /n'appliquez pas ce guide/.test(entete));
    continue;
  }

  const infractions = promessesDuTexte(texte);
  verifier(`${nom} : aucune promesse opérationnelle de mode Cloud / Supabase / hébergement distant`,
    infractions.length === 0,
    `paragraphe(s) : ${infractions.join(' | ')}`);
}

// ------------------------------------------------------------
// 3. LE CODE LIVRÉ — la surface que l'utilisateur LIT À L'ÉCRAN.
//
// POURQUOI CE VOLET EXISTE. La première rédaction de cette suite ne
// balayait que les .md de la racine. Elle n'aurait donc PAS attrapé
// l'occurrence trouvée juste après, et c'était la pire de toutes :
// la notice d'information RGPD affichée DANS l'application
// (v8/js/views/rgpd.js, section « Où sont stockées vos données »)
// annonçait « ou, en mode Cloud, dans un hébergement situé dans
// l'Union européenne ». Un guide, on peut ne pas le lire ; une notice
// d'information est précisément le document sur lequel une personne
// concernée fonde son consentement.
//
// Leçon générale, et c'est celle du chantier entier : une garde posée
// sur une seule porte n'est pas une garde. Un balayage qui ne couvre
// que la documentation laisse passer l'écran.
// ------------------------------------------------------------
console.log('\n--- Le code livré (ce que l\'utilisateur lit à l\'écran) ---');

/** Tous les fichiers servis à l'utilisateur, en descendant les dossiers. */
function fichiersLivres(dossier, acc = []) {
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    if (entree.name === 'lib') continue;            // bibliothèques tierces minifiées
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) fichiersLivres(chemin, acc);
    else if (/\.(js|mjs|html|css)$/i.test(entree.name)
      && !/^test-/.test(entree.name)) acc.push(chemin);
  }
  return acc;
}

const CODE_LIVRE = [
  ...fichiersLivres(join(RACINE, 'v8')),
  ...fichiersLivres(join(RACINE, 'server')),
  join(RACINE, 'index.html'),
  join(RACINE, 'guide.html'),
].filter((c) => existsSync(c));

verifier('le code livré à balayer est bien trouvé (dont la notice RGPD de l\'application)',
  CODE_LIVRE.some((c) => c.endsWith(join('views', 'rgpd.js'))),
  `${CODE_LIVRE.length} fichier(s)`);

const coupables = [];
for (const chemin of CODE_LIVRE) {
  const infractions = promessesDuTexte(readFileSync(chemin, 'utf8'));
  if (infractions.length) {
    coupables.push(`${relative(RACINE, chemin)} → ${infractions.join(' | ')}`);
  }
}
verifier('aucun fichier du code livré ne promet un mode Cloud / Supabase / hébergement distant',
  coupables.length === 0, coupables.join('\n      '));

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
