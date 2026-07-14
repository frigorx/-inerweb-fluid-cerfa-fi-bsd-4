// Suite « chemins des pièces jointes » (Mode Local : sécurité + portabilité).
//
// CONTEXTE (audit du 14/07, constat RECTIFIÉ par ce test même) : l'audit avait
// classé BLOQUANT le fait que `reinsererPiecesJointes` recopiait le `chemin`
// d'un fichier d'import (api.js), puisque ce chemin était ensuite lu
// (fs.readFileSync) et SUPPRIMÉ (fs.unlinkSync, rôle OPERATEUR = ÉLÈVE).
// C'ÉTAIT FAUX : `mapping.versSql` lève sur toute clé inconnue (l'« anti-dérive »)
// et il est appelé UNE LIGNE PLUS HAUT — le champ `chemin` d'un candidat était
// donc rejeté, et cette ligne était du code mort. Le test 2 verrouille cette
// garantie, qui n'était prouvée nulle part.
//
// Ce qui était RÉELLEMENT ouvert : l'`id`, lui, est une clé CONNUE du mapping.
// Un id forgé (« ../../x ») entrait donc en base, et sauvegarde.js reconstruisait
// `documents/<id>` — un fichier arbitraire du poste pouvait être lu et SCELLÉ
// dans l'archive (ou, hash différent, rendre toute sauvegarde impossible).
// Tests 3 et 4. Test 5 : la dette ROADMAP « chemin absolu » (portabilité).

import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const api = require('./api.js');
const sauvegarde = require('./sauvegarde.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

// Base JETABLE (jamais le data/ réel).
const dossier = mkdtempSync(join(tmpdir(), 'inerweb-fluide-pj-'));
db.ouvrir(join(dossier, 'test.db'));
const contexte = { role: 'REFERENT' };
const appeler = (methode, params = {}) => api.appeler(methode, params, contexte);
appeler('init');

// Le fichier d'un tiers, HORS du dossier documents/ : c'est lui que l'attaque
// visait (un document personnel, ou la base SQLite elle-même).
const FICHIER_VICTIME = join(dossier, 'DOCUMENT-PRIVE.txt');
const SECRET = 'contenu privé de l’utilisateur — ne doit ni fuir ni disparaître';
writeFileSync(FICHIER_VICTIME, SECRET, 'utf8');

/** Fabrique un paquet d'import valide dont on remplace les pièces jointes. */
function paquetAvecPj(piecesJointes) {
  const paquet = JSON.parse(appeler('exporterJSON'));
  paquet.donnees.piecesJointes = piecesJointes;
  return JSON.stringify(paquet);
}

// ============================================================
// 1. Une pièce jointe normale : écrite dans documents/, sous son id
// ============================================================
const CONTENU = Buffer.from('preuve authentique').toString('base64');
const pj = appeler('ajouterPieceJointe', {
  donneesPj: {
    entiteType: 'MACHINE', entiteId: 'M-1', categorie: 'AUTRE',
    nomFichier: 'preuve.pdf', mimeType: 'application/pdf',
    base64: CONTENU, ajoutePar: 'Testeur'
  }
});
verifier('une PJ ordinaire s’enregistre et se relit',
  appeler('obtenirPieceJointe', { id: pj.id }).blob === CONTENU);
verifier('le fichier est écrit dans documents/, sous son id',
  existsSync(join(dossier, 'documents', pj.id)));

// ============================================================
// 2. Un `chemin` glissé dans un import est REJETÉ par l'anti-dérive du
//    mapping — la garantie qui rendait le « BLOQUANT » inexploitable.
//    Elle n'était prouvée nulle part : on la verrouille ici.
// ============================================================
{
  let message = '';
  try {
    appeler('importerJSON', {
      texte: paquetAvecPj([{
        id: 'PJ-FORGEE-01', entiteType: 'MACHINE', entiteId: 'M-1',
        categorie: 'AUTRE', nomFichier: 'innocent.pdf',
        mimeType: 'application/pdf', taille: 12, hashSha256: 'a'.repeat(64),
        dateAjout: '2026-07-14T10:00:00.000Z', ajoutePar: 'Attaquant',
        chemin: FICHIER_VICTIME // ← champ forgé (absent de tout export légitime)
      }])
    });
  } catch (erreur) {
    message = erreur.message;
  }
  verifier('un champ `chemin` dans un import est refusé (anti-dérive du mapping)',
    /inconnue du mapping/.test(message), `message = « ${message} »`);
  verifier('l’état reste intact après ce refus (transaction annulée)',
    appeler('obtenirPieceJointe', { id: pj.id }).blob === CONTENU);
  verifier('le fichier privé est intact après la tentative',
    existsSync(FICHIER_VICTIME)
    && readFileSync(FICHIER_VICTIME, 'utf8') === SECRET);
}

// ============================================================
// 3. LA VRAIE BRÈCHE : un id forgé (l'id, lui, est une clé connue du mapping)
//    → refusé À L'ENTRÉE désormais, avant tout effet.
// ============================================================
{
  let message = '';
  try {
    appeler('importerJSON', {
      texte: paquetAvecPj([{
        id: '../../DOCUMENT-PRIVE.txt', entiteType: 'MACHINE', entiteId: 'M-1',
        categorie: 'AUTRE', nomFichier: 'x.pdf', mimeType: 'application/pdf',
        taille: 1, hashSha256: 'b'.repeat(64),
        dateAjout: '2026-07-14T10:00:00.000Z', ajoutePar: 'Attaquant'
      }])
    });
  } catch (erreur) {
    message = erreur.message;
  }
  verifier('un id de PJ hors alphabet est refusé à l’import (traversée fermée)',
    /identifiant invalide/.test(message), `message = « ${message} »`);
}

// ============================================================
// 4. Conséquence : la sauvegarde ne peut plus sceller un fichier du poste.
//    (Avant : chemin NULL → sauvegarde.js reconstruisait documents/<id> →
//     « documents/../../DOCUMENT-PRIVE.txt » était lu et mis dans l'archive.)
// ============================================================
{
  db.run(
    'INSERT INTO pieces_jointes (id, etablissement_id, entite_type, entite_id, '
    + 'categorie, nom_fichier, mime_type, taille_octets, hash_sha256, '
    + 'date_ajout, ajoute_par, chemin) '
    + "SELECT '../../DOCUMENT-PRIVE.txt', id, 'MACHINE', 'M-1', 'AUTRE', "
    + "'x.pdf', 'application/pdf', 1, 'c', '2026-07-14T10:00:00.000Z', 'X', "
    + "'../../DOCUMENT-PRIVE.txt' FROM etablissements LIMIT 1");
  let message = '';
  try {
    // L'ARCHIVE est la sauvegarde qui embarque les documents (base + documents
    // + config) : c'est elle qui aurait scellé le fichier du poste.
    sauvegarde.sauvegarderArchive({});
  } catch (erreur) {
    message = erreur.message;
  }
  verifier('la sauvegarde REFUSE un id de PJ invalide (fichier du poste jamais scellé)',
    /identifiant de pièce jointe invalide/.test(message),
    `message = « ${message} »`);
  db.run("DELETE FROM pieces_jointes WHERE id = '../../DOCUMENT-PRIVE.txt'");
  verifier('le fichier privé est toujours intact',
    readFileSync(FICHIER_VICTIME, 'utf8') === SECRET);
}

// ============================================================
// 5. PORTABILITÉ (dette ROADMAP « chemin absolu ») : une base restaurée sur un
//    AUTRE poste garde en colonne le chemin de la machine d'origine. Le chemin
//    étant désormais recalculé depuis l'id, les preuves restent lisibles.
// ============================================================
{
  db.run('UPDATE pieces_jointes SET chemin = ? WHERE id = ?',
    [`D:\\ancien-poste\\data\\documents\\${pj.id}`, pj.id]);
  verifier('une PJ reste lisible malgré un chemin hérité d’un autre poste',
    appeler('obtenirPieceJointe', { id: pj.id }).blob === CONTENU);
}

// ------------------------------------------------------------
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [chemins des pièces jointes]`);
process.exit(nbEchecs === 0 ? 0 : 1);
