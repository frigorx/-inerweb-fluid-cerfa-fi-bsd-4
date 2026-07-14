// ============================================================
// Test du dossier d'audit annuel (Phase D, étape 3)
// Exécution : node test-dossier-audit.mjs (depuis v8/js/documents/)
// Génère le dossier 2026 sur les données de démonstration puis
// RELIT l'archive ZIP octet par octet (en-têtes locaux + EOCD) :
// les vérifications portent sur le fichier réellement produit.
// ============================================================

import { createHash } from 'node:crypto';
import { creerStore } from '../data/datastore.js';
import { genererDossierAudit } from './dossier-audit.js';

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

/**
 * Relit un ZIP « stored » : parcourt les en-têtes locaux et retourne
 * la liste { nom, octets } de chaque entrée, plus le compte EOCD.
 * @param {Uint8Array} zip
 */
function lireZip(zip) {
  const vue = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const entrees = [];
  let position = 0;
  while (position + 4 <= zip.length &&
         vue.getUint32(position, true) === 0x04034b50) {
    const tailleContenu = vue.getUint32(position + 18, true);
    const tailleNom = vue.getUint16(position + 26, true);
    const tailleExtra = vue.getUint16(position + 28, true);
    const nom = new TextDecoder().decode(
      zip.subarray(position + 30, position + 30 + tailleNom));
    const debut = position + 30 + tailleNom + tailleExtra;
    entrees.push({ nom, octets: zip.subarray(debut, debut + tailleContenu) });
    position = debut + tailleContenu;
  }
  // EOCD : signature 0x06054b50, nombre total d'entrées à l'offset +10
  let nbEocd = -1;
  for (let i = zip.length - 22; i >= 0; i -= 1) {
    if (vue.getUint32(i, true) === 0x06054b50) {
      nbEocd = vue.getUint16(i + 10, true);
      break;
    }
  }
  return { entrees, nbEocd };
}

const store = await creerStore();
const { blob, nomFichier, nbDocuments, empreinte } = await genererDossierAudit(store, 2026);

// ---- 1. Forme du résultat ----
verifier('nomFichier = dossier-audit-fluides-2026.zip',
  nomFichier === 'dossier-audit-fluides-2026.zip', nomFichier);

const octetsZip = blob instanceof Uint8Array
  ? blob
  : new Uint8Array(await blob.arrayBuffer());
verifier('archive non vide retournée (Blob ou Uint8Array)',
  octetsZip.length > 0);

// ---- 2. Signature ZIP valide ----
verifier('signature ZIP « PK\\x03\\x04 » en tête d\'archive',
  octetsZip[0] === 0x50 && octetsZip[1] === 0x4b &&
  octetsZip[2] === 0x03 && octetsZip[3] === 0x04);

// ---- 3. Taille : les PDF sont RÉELS (formulaire officiel rempli) ----
verifier('taille de l\'archive > 100 Ko (PDF réels)',
  octetsZip.length > 100 * 1024, `${octetsZip.length} octets`);

const { entrees, nbEocd } = lireZip(octetsZip);
const noms = entrees.map((e) => e.nom);

// ---- 4. Cohérence structurelle ----
verifier('EOCD : nombre d\'entrées = entrées relues = nbDocuments',
  nbEocd === entrees.length && nbEocd === nbDocuments,
  `EOCD=${nbEocd}, relues=${entrees.length}, annoncées=${nbDocuments}`);

// ---- 5. Sommaire présent et complet ----
verifier('00-SOMMAIRE.txt présent (première entrée)',
  noms[0] === '00-SOMMAIRE.txt');

const sommaire = new TextDecoder().decode(
  entrees.find((e) => e.nom === '00-SOMMAIRE.txt')?.octets ?? new Uint8Array());
verifier('le sommaire mentionne l\'établissement',
  sommaire.includes('Lycée Professionnel Jacques Raynaud'));
verifier('le sommaire rappelle l\'origine (inerWeb Fluide) et l\'année',
  sommaire.includes('inerWeb Fluide') && sommaire.includes('2026'));
verifier('le sommaire liste chaque fichier de l\'archive',
  noms.every((nom) => sommaire.includes(nom)));

// ---- 6. Les 11 tables CSV ----
const CSV_ATTENDUS = ['personnel.csv', 'habilitations.csv',
  'mentions-habilitation.csv', 'outillage.csv', 'bouteilles.csv',
  'machines.csv', 'mouvements.csv', 'controles.csv', 'balance-matiere.csv',
  'bsff.csv', 'journal-audit.csv'];
verifier('les 9 CSV du registre sont présents',
  CSV_ATTENDUS.every((nom) => noms.includes(nom)),
  CSV_ATTENDUS.filter((nom) => !noms.includes(nom)).join(', '));
verifier('chaque CSV commence par le BOM UTF-8',
  CSV_ATTENDUS.every((nom) => {
    const o = entrees.find((e) => e.nom === nom).octets;
    return o[0] === 0xef && o[1] === 0xbb && o[2] === 0xbf;
  }));

// ---- 7. CERFA des mouvements inscrits au registre ----
const cerfas = noms.filter((nom) => nom.startsWith('cerfa/'));
const cerfasMouvements = cerfas.filter((nom) => nom.includes('FI-2026-'));
verifier('au moins 7 CERFA de mouvements (cerfa/FI-2026-*.pdf)',
  cerfasMouvements.length >= 7, `${cerfasMouvements.length} trouvés`);

// ---- 8. CERFA des contrôles de l'année ----
const controles2026 = (await store.getControles())
  .filter((c) => (c.date || '').startsWith('2026-'));
verifier('un CERFA par contrôle de 2026',
  controles2026.length > 0 && controles2026.every((c) =>
    cerfas.includes(`cerfa/${c.numero ?? c.id}.pdf`)),
  `${controles2026.length} contrôles attendus`);

// ---- 9. Chaque PDF de l'archive est un vrai PDF ----
verifier('chaque cerfa/*.pdf commence par « %PDF »',
  cerfas.length > 0 && cerfas.every((nom) => {
    const o = entrees.find((e) => e.nom === nom).octets;
    return o[0] === 0x25 && o[1] === 0x50 && o[2] === 0x44 && o[3] === 0x46;
  }));
verifier('chaque cerfa/*.pdf pèse plus de 10 Ko',
  cerfas.every((nom) =>
    entrees.find((e) => e.nom === nom).octets.length > 10 * 1024));

// ---- 10. Pas de doublon de nom dans l'archive ----
verifier('aucun doublon de nom de fichier',
  new Set(noms).size === noms.length);

// ---- 11. Scellement : manifeste d'empreintes + empreinte globale ----
verifier('01-EMPREINTES-SHA256.txt présent (2e entrée)',
  noms[1] === '01-EMPREINTES-SHA256.txt');
const manifeste = new TextDecoder().decode(
  entrees.find((e) => e.nom === '01-EMPREINTES-SHA256.txt')?.octets ?? new Uint8Array());
verifier('le manifeste liste chaque CSV avec une empreinte SHA-256 (64 hex)',
  CSV_ATTENDUS.every((nom) =>
    new RegExp('^[0-9a-f]{64}  ' + nom.replace('.', '\\.'), 'm').test(manifeste)),
  CSV_ATTENDUS.filter((nom) =>
    !new RegExp('^[0-9a-f]{64}  ' + nom.replace('.', '\\.'), 'm').test(manifeste)).join(', '));
verifier('le manifeste couvre aussi le sommaire',
  /^[0-9a-f]{64}  00-SOMMAIRE\.txt$/m.test(manifeste));
const empreinteRecalculee = createHash('sha256').update(octetsZip).digest('hex');
verifier('l\'empreinte retournée = SHA-256 de l\'archive .zip complète',
  typeof empreinte === 'string' && /^[0-9a-f]{64}$/.test(empreinte)
  && empreinte === empreinteRecalculee,
  `${empreinte} vs ${empreinteRecalculee}`);

// ---- Bilan ----
console.log(`\nVérifications : ${nbOk} réussies, ${nbEchecs} en échec.`);
if (nbEchecs > 0) {
  console.error('Dossier d\'audit : des vérifications échouent.');
  process.exit(1);
}
console.log('Dossier d\'audit annuel : tout est vert.');
