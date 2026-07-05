'use strict';

/**
 * inerWeb Fluide — Fabrique de sauvegardes « coffre-fort » (V9-E4.1).
 * ===================================================================
 * LA FABRIQUE : de quoi PRODUIRE des sauvegardes VÉRIFIABLES. L'exigence
 * n°1 de Franck — ne JAMAIS perdre les données (VISION §4).
 *
 * Deux niveaux (VISION §4.2) :
 *   - SNAPSHOT : base seule. Rapide, fréquent — filet ANTI-ERREUR-HUMAINE
 *     (« j'ai validé une mauvaise pesée il y a 20 minutes »).
 *   - ARCHIVE  : base + documents (PJ) + config (établissement + paramètres,
 *     en clair) + manifeste. Filet ANTI-SINISTRE (« le disque est mort »).
 *
 * PRIMITIVE UNIQUE : `db.vacuumInto` (VACUUM INTO). JAMAIS de copie brute du
 * .db (sous WAL, une copie à chaud est amputée — VISION §4.1). Il n'existe
 * AUCUN autre chemin de sauvegarde dans ce module.
 *
 * SÉQUENCE (VISION §4.2, « écrire la nouvelle AVANT de purger l'ancienne ») :
 *   mkdir → purgerPartiels → vacuumInto(tmp/vacuum-<h>-<rnd>.db) → sha256 →
 *   manifeste → ZIP en « <nom>.zip.partiel » (base/inerweb-fluide.db +
 *   manifeste.json [+ documents/<id> + config/ si ARCHIVE, chaque PJ
 *   VÉRIFIÉE par hash AVANT ajout]) → supprimer le .db temp → renommer
 *   « .partiel » → « .zip » (cible horodatée inexistante = rename NTFS sûr) →
 *   journal SAUVEGARDE → rotation GFS.
 *
 * Un « .partiel » = sauvegarde interrompue = n'existe pas : `purgerPartiels`
 * les efface (au démarrage ET en tête de chaque sauvegarde).
 *
 * Horodatage du NOM : heure LOCALE « AAAA-MM-JJ-HHMM » (jamais « : »,
 * interdit sous NTFS) + suffixe aléatoire (deux sauvegardes dans la même
 * minute ne se marchent pas dessus). Le manifeste, lui, porte l'ISO UTC.
 *
 * Zéro dépendance externe.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const db = require('./db.js');
const zip = require('./zip-node.js');
const { construireManifeste, relireManifeste } = require('./manifeste.js');

// ------------------------------------------------------------
// Emplacements — TOUJOURS dérivés du .db ouvert (jetable en test, réel en
// prod). backups/ est frère de data/ (jamais dans le dépôt : gitignore).
// ------------------------------------------------------------

/** Racine data/ = dossier du .db ouvert. */
function dossierData() {
  return path.dirname(db.cheminOuvert());
}

/** Racine backups/ (frère de data/). */
function dossierBackups() {
  return path.join(path.dirname(dossierData()), 'backups');
}

/** Sous-dossiers de backups/. */
function dossierSnapshots() { return path.join(dossierBackups(), 'snapshots'); }
function dossierArchives() { return path.join(dossierBackups(), 'archives'); }
function dossierTmp() { return path.join(dossierBackups(), 'tmp'); }

/** Dossier des pièces jointes (à côté de la base — cf. api.js). */
function dossierDocuments() {
  return path.join(dossierData(), 'documents');
}

/** Crée toute l'arborescence backups/ (idempotent). */
function preparerArborescence() {
  for (const d of [dossierSnapshots(), dossierArchives(), dossierTmp()]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

// ------------------------------------------------------------
// Horodatage.
// ------------------------------------------------------------

/**
 * Horodatage de NOM DE FICHIER en heure LOCALE « AAAA-MM-JJ-HHMM » (jamais
 * de « : » — interdit sous NTFS). Distinct de l'ISO UTC du manifeste (tri).
 * @param {Date} date
 */
function horodatageLocal(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `-${p(date.getHours())}${p(date.getMinutes())}`;
}

/** 6 caractères hexadécimaux aléatoires (unicité intra-minute). */
function suffixeAleatoire() {
  return crypto.randomBytes(3).toString('hex');
}

// ------------------------------------------------------------
// Empreintes.
// ------------------------------------------------------------

/** SHA-256 hexadécimal d'un fichier (lu en une fois — un .db de poste tient). */
function sha256Fichier(chemin) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(chemin)).digest('hex');
}

/** SHA-256 hexadécimal d'un tampon d'octets. */
function sha256Octets(octets) {
  return crypto.createHash('sha256').update(octets).digest('hex');
}

// ------------------------------------------------------------
// Pièces jointes (ARCHIVE) — lues du disque, hash VÉRIFIÉ avant ajout.
// ------------------------------------------------------------

/**
 * Recense les pièces jointes de la base, lit chaque fichier sur disque et
 * VÉRIFIE son hash contre `pieces_jointes.hash_sha256` AVANT de l'inclure —
 * une PJ absente ou corrompue fait ÉCHOUER la sauvegarde (on ne scelle jamais
 * une archive qui ment sur son contenu). Renvoie de quoi bâtir les entrées
 * ZIP et le résumé documents du manifeste.
 * @returns {{entrees: {nom: string, contenu: Buffer}[],
 *            documents: {sha256: string, taille: number}[]}}
 */
function collecterDocuments() {
  const lignes = db.all(
    'SELECT id, chemin, hash_sha256, taille_octets, nom_fichier ' +
    'FROM pieces_jointes ORDER BY id');
  const entrees = [];
  const documents = [];
  for (const pj of lignes) {
    const chemin = pj.chemin
      ? pj.chemin
      : path.join(dossierDocuments(), pj.id);
    if (!fs.existsSync(chemin)) {
      throw new Error(
        `Sauvegarde impossible : fichier de la pièce jointe introuvable ` +
        `(${pj.nom_fichier ?? pj.id}) — l'archive serait incomplète.`);
    }
    const octets = fs.readFileSync(chemin);
    const hash = sha256Octets(octets);
    if (pj.hash_sha256 && hash !== pj.hash_sha256) {
      throw new Error(
        `Sauvegarde interrompue : la pièce jointe ${pj.nom_fichier ?? pj.id} ` +
        'a une empreinte différente de celle enregistrée (fichier altéré) — ' +
        'on ne scelle pas une preuve douteuse.');
    }
    // Nom d'entrée = documents/<id> : l'id EST le nom de fichier sur disque
    // (cf. api.js:ecrirePieceJointeSurDisque), stable et sans extension.
    entrees.push({ nom: `documents/${pj.id}`, contenu: octets });
    documents.push({ sha256: hash, taille: octets.length });
  }
  return { entrees, documents };
}

/**
 * Bloc `config/` d'une ARCHIVE (VISION §4.2 : « paramètres + établissement
 * lisibles »). En clair, humainement inspectable, SANS donnée sensible autre
 * que celle déjà présente dans la base. Deux fichiers JSON indentés.
 * @returns {{nom: string, contenu: string}[]}
 */
function collecterConfig() {
  const etablissement = db.get(
    'SELECT * FROM etablissements WHERE id = ?', ['ETB-LOCAL']) ?? {};
  const parametres = db.all('SELECT cle, valeur FROM parametres ORDER BY cle');
  return [
    {
      nom: 'config/etablissement.json',
      contenu: JSON.stringify(etablissement, null, 2)
    },
    {
      nom: 'config/parametres.json',
      contenu: JSON.stringify(parametres, null, 2)
    }
  ];
}

// ------------------------------------------------------------
// Le cœur : produire une sauvegarde (SNAPSHOT ou ARCHIVE).
// ------------------------------------------------------------

/**
 * Produit une sauvegarde et renvoie son chemin final + son manifeste.
 * @param {'SNAPSHOT'|'ARCHIVE'} type
 * @param {{indice?: string|null}} [options]
 * @returns {{chemin: string, type: string, manifeste: object}}
 */
function sauvegarder(type, options = {}) {
  const instant = new Date();
  preparerArborescence();
  purgerPartiels(); // une sauvegarde interrompue précédente n'existe pas

  const base = horodatageLocal(instant);
  const rnd = suffixeAleatoire();
  const suffixeType = type === 'ARCHIVE' ? 'archive' : 'snapshot';
  const dossierCible = type === 'ARCHIVE'
    ? dossierArchives() : dossierSnapshots();

  // 1) VACUUM INTO vers une cible TEMPORAIRE UNIQUE (sans espace, backups/tmp/).
  const cibleVacuum = path.join(dossierTmp(), `vacuum-${base}-${rnd}.db`);
  // (Ceinture : la cible ne doit pas préexister ; le nom est unique par rnd.)
  if (fs.existsSync(cibleVacuum)) fs.rmSync(cibleVacuum, { force: true });
  db.vacuumInto(cibleVacuum);

  let manifeste;
  const cheminPartiel =
    path.join(dossierCible, `${base}-${suffixeType}-${rnd}.zip.partiel`);
  const cheminFinal =
    path.join(dossierCible, `${base}-${suffixeType}-${rnd}.zip`);

  try {
    // 2) Empreinte + taille du .db issu du VACUUM (le pivot de vérification).
    const tailleBaseOctets = fs.statSync(cibleVacuum).size;
    const sha256Base = sha256Fichier(cibleVacuum);
    const contenuBase = fs.readFileSync(cibleVacuum);

    // 3) Documents + config (ARCHIVE seulement).
    let documentsEntrees = [];
    let documentsResume = null;
    let configEntrees = [];
    if (type === 'ARCHIVE') {
      const collecte = collecterDocuments();
      documentsEntrees = collecte.entrees;
      documentsResume = collecte.documents;
      configEntrees = collecterConfig();
    }

    // 4) Manifeste (compteurs + chaînes lus sur la base VIVANTE — capture
    //    cohérente avec le .db copié à l'instant du VACUUM).
    manifeste = construireManifeste(db.ouvrir(), {
      type,
      cheminBaseVacuum: cibleVacuum,
      tailleBaseOctets,
      sha256Base,
      versionBase: db.versionBase(),
      documents: documentsResume ?? undefined,
      indice: options.indice ?? null,
      horodatage: instant
    });

    // 5) Écriture du ZIP en « .partiel ». Ordre des entrées : le manifeste
    //    EN TÊTE (listerSauvegardes le lit sans dérouler), puis la base, puis
    //    documents/ et config/. Tout en « stored », CRC-32 par entrée.
    const entrees = [
      { nom: 'manifeste.json', contenu: JSON.stringify(manifeste, null, 2) },
      { nom: 'base/inerweb-fluide.db', contenu: contenuBase },
      ...documentsEntrees,
      ...configEntrees
    ];
    const octetsZip = zip.creerZipOctets(entrees, instant);
    fs.writeFileSync(cheminPartiel, octetsZip);
  } finally {
    // 6) Le .db temporaire n'a plus de raison d'exister (succès comme échec).
    try { fs.rmSync(cibleVacuum, { force: true }); } catch { /* best-effort */ }
  }

  // 7) Bascule atomique : renommer « .partiel » → « .zip ». La cible finale
  //    est horodatée + aléatoire donc INEXISTANTE → rename NTFS sûr. Un
  //    antivirus peut tenir brièvement le fichier fraîchement écrit : réessai
  //    borné, puis échec propre (le .partiel reste, purgé au prochain tour).
  renommerAvecReessai(cheminPartiel, cheminFinal);

  // 8) Journal (dans la transaction ambiante de db.journaliser) — trace la
  //    sauvegarde au registre chaîné.
  db.journaliser({
    qui: 'système',
    action: 'SAUVEGARDE',
    cible: path.basename(cheminFinal),
    details: `${type} · base sha256 ${manifeste.base.sha256.slice(0, 12)}… · ` +
      `${manifeste.compteurs.mouvementsValides} écriture(s) figée(s)`
  });

  // 9) Rotation GFS (best-effort : jamais bloquante — la nouvelle est déjà là).
  try { appliquerRotation(type); } catch { /* rotation non critique */ }

  return { chemin: cheminFinal, type, manifeste };
}

/** Renomme avec quelques réessais bornés (EPERM antivirus transitoire). */
function renommerAvecReessai(source, cible, essais = 5) {
  for (let i = 0; i < essais; i += 1) {
    try {
      fs.renameSync(source, cible);
      return;
    } catch (erreur) {
      if (i === essais - 1) {
        throw new Error(
          `Bascule de la sauvegarde impossible (${path.basename(cible)}) : ` +
          `${erreur.message}. Le fichier « .partiel » sera purgé au ` +
          'prochain démarrage.');
      }
      // Petite attente active bornée (pas de dépendance timer async ici).
      const jusqua = Date.now() + 50;
      while (Date.now() < jusqua) { /* pause courte */ }
    }
  }
}

/**
 * Sauvegarde SNAPSHOT (base seule). Filet anti-erreur-humaine.
 * @returns {{chemin, type, manifeste}}
 */
function sauvegarderSnapshot(options = {}) {
  return sauvegarder('SNAPSHOT', options);
}

/**
 * Sauvegarde ARCHIVE (base + documents + config). Filet anti-sinistre.
 * @returns {{chemin, type, manifeste}}
 */
function sauvegarderArchive(options = {}) {
  return sauvegarder('ARCHIVE', options);
}

// ------------------------------------------------------------
// Purge des restes interrompus.
// ------------------------------------------------------------

/**
 * Efface tout « .partiel » (sauvegarde interrompue) sous backups/ ET tout
 * .db orphelin de backups/tmp/ (VACUUM interrompu). À appeler au démarrage et
 * en tête de chaque sauvegarde. N'échoue jamais sur un fichier absent.
 * @returns {{partielsSupprimes: number, tempsSupprimes: number}}
 */
function purgerPartiels() {
  let partielsSupprimes = 0;
  let tempsSupprimes = 0;

  for (const dossier of [dossierSnapshots(), dossierArchives()]) {
    if (!fs.existsSync(dossier)) continue;
    for (const nom of fs.readdirSync(dossier)) {
      if (nom.endsWith('.partiel')) {
        try {
          fs.rmSync(path.join(dossier, nom), { force: true });
          partielsSupprimes += 1;
        } catch { /* best-effort */ }
      }
    }
  }

  const tmp = dossierTmp();
  if (fs.existsSync(tmp)) {
    for (const nom of fs.readdirSync(tmp)) {
      // Tout ce qui traîne dans tmp/ est un résidu (le .db du VACUUM est
      // supprimé en fin de sauvegarde ; s'il reste, la sauvegarde a été
      // coupée) — on nettoie les .db comme les éventuels .partiel.
      if (nom.endsWith('.db') || nom.endsWith('.partiel')
        || nom.endsWith('.db-wal') || nom.endsWith('.db-shm')) {
        try {
          fs.rmSync(path.join(tmp, nom), { force: true });
          tempsSupprimes += 1;
        } catch { /* best-effort */ }
      }
    }
  }
  return { partielsSupprimes, tempsSupprimes };
}

// ------------------------------------------------------------
// Inventaire — lit le manifeste EN CLAIR en tête de chaque ZIP, SANS extraire.
// ------------------------------------------------------------

/**
 * Liste les sauvegardes présentes (snapshots + archives), chacune décrite par
 * son manifeste lu EN TÊTE via `zip.lireEntree` — AUCUNE extraction. Une
 * archive dont le manifeste est illisible ou invalide est signalée (jamais
 * ignorée en silence : un fichier douteux doit se voir). Triées par
 * horodatage (ISO UTC) DÉCROISSANT (la plus récente d'abord).
 * @returns {Array<{chemin, fichier, type, horodatage, versionBase,
 *   compteurs, chaineRegistreOk, chaineJournalOk, chiffre, valide,
 *   erreur?: string}>}
 */
function listerSauvegardes() {
  const resultats = [];
  for (const dossier of [dossierArchives(), dossierSnapshots()]) {
    if (!fs.existsSync(dossier)) continue;
    for (const nom of fs.readdirSync(dossier)) {
      if (!nom.endsWith('.zip')) continue; // ignore .partiel et autres
      const chemin = path.join(dossier, nom);
      const entree = { chemin, fichier: nom };
      try {
        const octets = zip.lireEntree(chemin, 'manifeste.json');
        if (!octets) {
          throw new Error('manifeste.json absent de l\'archive.');
        }
        const manifeste = relireManifeste(JSON.parse(octets.toString('utf8')));
        entree.type = manifeste.type;
        entree.horodatage = manifeste.horodatage;
        entree.versionBase = manifeste.versionBase;
        entree.compteurs = manifeste.compteurs;
        entree.chaineRegistreOk = manifeste.integrite.chaineRegistreOk;
        entree.chaineJournalOk = manifeste.integrite.chaineJournalOk;
        entree.chiffre = manifeste.chiffrement?.actif === true;
        entree.valide = true;
      } catch (erreur) {
        entree.valide = false;
        entree.erreur = erreur.message;
      }
      resultats.push(entree);
    }
  }
  resultats.sort((a, b) => {
    const ha = a.horodatage ?? '';
    const hb = b.horodatage ?? '';
    return hb.localeCompare(ha); // ISO UTC décroissant
  });
  return resultats;
}

// ------------------------------------------------------------
// Rotation GFS (grand-père / père / fils) — VISION §4.2.
// Snapshots : fenêtre 48 h. Archives : quotidiennes ×14, hebdo ×8,
// mensuelles ×12, ANNÉE SCOLAIRE conservée indéfiniment. On ne purge JAMAIS
// avant d'avoir la nouvelle (elle est déjà écrite quand on arrive ici), et on
// ne touche jamais un « .partiel » ni « avant-restauration/ ».
// ------------------------------------------------------------

/** Parse l'horodatage ISO d'une sauvegarde (via son manifeste en tête). */
function horodatageDe(chemin) {
  try {
    const octets = zip.lireEntree(chemin, 'manifeste.json');
    if (!octets) return null;
    const m = JSON.parse(octets.toString('utf8'));
    const t = Date.parse(m.horodatage);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

/**
 * Applique la rotation pour le type donné. Best-effort, jamais bloquant.
 * @param {'SNAPSHOT'|'ARCHIVE'} type
 */
function appliquerRotation(type) {
  if (type === 'SNAPSHOT') {
    rotationSnapshots();
  } else {
    rotationArchives();
  }
}

/** Snapshots : purge ceux de plus de 48 h (filet du jour, pas du long terme). */
function rotationSnapshots() {
  const dossier = dossierSnapshots();
  if (!fs.existsSync(dossier)) return;
  const limite = Date.now() - 48 * 3600 * 1000;
  for (const nom of fs.readdirSync(dossier)) {
    if (!nom.endsWith('.zip')) continue;
    const chemin = path.join(dossier, nom);
    const t = horodatageDe(chemin);
    if (t !== null && t < limite) {
      try { fs.rmSync(chemin, { force: true }); } catch { /* best-effort */ }
    }
  }
}

/**
 * Archives : conserve la plus récente de chaque JOUR (14 derniers jours), de
 * chaque SEMAINE ISO (8 dernières), de chaque MOIS (12 derniers) et TOUTE
 * archive de fin d'année scolaire (mois de juin/juillet, conservée
 * indéfiniment). Les autres sont purgées. Conception défensive : en cas de
 * doute (horodatage illisible), on CONSERVE — on ne supprime jamais par
 * ignorance.
 */
function rotationArchives() {
  const dossier = dossierArchives();
  if (!fs.existsSync(dossier)) return;

  const fichiers = fs.readdirSync(dossier)
    .filter((n) => n.endsWith('.zip'))
    .map((n) => {
      const chemin = path.join(dossier, n);
      return { chemin, t: horodatageDe(chemin) };
    })
    .filter((f) => f.t !== null)
    .sort((a, b) => b.t - a.t); // plus récent d'abord

  const maintenant = Date.now();
  const jour = 24 * 3600 * 1000;
  const aGarder = new Set();
  const vus = { jours: new Set(), semaines: new Set(), mois: new Set() };

  for (const f of fichiers) {
    const d = new Date(f.t);
    const cleJour = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const cleSemaine = `${d.getFullYear()}-S${numeroSemaine(d)}`;
    const cleMois = `${d.getFullYear()}-${d.getMonth()}`;
    const ageJours = (maintenant - f.t) / jour;
    let garder = false;

    // Fin d'année scolaire (juin = 5, juillet = 6) : conservée indéfiniment.
    const mois = d.getMonth();
    if (mois === 5 || mois === 6) garder = true;

    if (ageJours <= 14 && !vus.jours.has(cleJour)) {
      vus.jours.add(cleJour); garder = true;
    }
    if (ageJours <= 7 * 8 && !vus.semaines.has(cleSemaine)) {
      vus.semaines.add(cleSemaine); garder = true;
    }
    if (ageJours <= 366 && !vus.mois.has(cleMois)) {
      vus.mois.add(cleMois); garder = true;
    }
    if (garder) aGarder.add(f.chemin);
  }

  for (const f of fichiers) {
    if (!aGarder.has(f.chemin)) {
      try { fs.rmSync(f.chemin, { force: true }); } catch { /* best-effort */ }
    }
  }
}

/** Numéro de semaine ISO 8601 (lundi premier jour). */
function numeroSemaine(date) {
  const d = new Date(Date.UTC(
    date.getFullYear(), date.getMonth(), date.getDate()));
  const jour = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - jour);
  const debutAnnee = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - debutAnnee) / 86400000) + 1) / 7);
}

module.exports = {
  sauvegarderSnapshot,
  sauvegarderArchive,
  purgerPartiels,
  listerSauvegardes,
  // Exposés pour le noyau restauration (E4.1 seconde moitié) et les tests.
  dossierBackups,
  dossierSnapshots,
  dossierArchives,
  dossierTmp,
  dossierDocuments
};
