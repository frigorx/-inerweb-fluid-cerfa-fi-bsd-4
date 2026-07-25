// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — SUITE DE SÉCURITÉ NÉGATIVE (lot L2 / constat P2-2).
// Exécution : node server/test-securite-negative.mjs
//
// POURQUOI CETTE SUITE EXISTE.
// Un registre opposable ne se juge pas à ce qu'il sait faire, mais à ce
// qu'il REFUSE de faire. Les suites du dépôt prouvent abondamment le
// premier point ; les refus, eux, étaient éparpillés dans une douzaine de
// fichiers — aucun endroit ne permettait de répondre en une commande à la
// question d'un auditeur : « montrez-moi que le logiciel résiste ».
//
// Cette suite est cet endroit. Elle tient DEUX rôles :
//
//   A. LES ATTAQUES, TIRÉES ICI. Chaque cas exécute réellement le geste
//      hostile contre un vrai serveur (port jetable, base jetable) et
//      vérifie le refus. Doctrine maison : « une faille se prouve en la
//      TIRANT, pas en la lisant ».
//
//   B. LE RÉPERTOIRE DES PREUVES EXISTANTES. Les refus déjà tirés ailleurs
//      ne sont pas re-joués (coût inutile) : ils sont RÉFÉRENCÉS, et la
//      référence est VÉRIFIÉE — la suite citée doit exister et contenir
//      encore le cas cité. Un renommage ou une suppression rend cette
//      suite ROUGE, donc l'index ne peut pas mentir avec le temps.
//
// L'attaquant modélisé n'est pas seulement un pirate : c'est aussi
// l'utilisateur pressé qui veut que le logiciel dise « conforme », et
// l'élève curieux qui a lu la console de son navigateur. Les deux passent
// par la même porte : POST /api/:methode, hors de tout écran.
//
// ISOLATION : serveur enfant sur port haut aléatoire, base JETABLE nichée
// sous <mkdtemp>/data/ (jamais data/ réel, jamais le port 2011), enfant
// tué et dossier nettoyé dans un `finally`.
// ============================================================

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';

// ------------------------------------------------------------
// Outillage de vérification (conventions maison des suites v8/v9).
// ------------------------------------------------------------
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
 * Cas d'attaque : la réponse doit être un REFUS (code HTTP attendu) et,
 * si un extrait de message est fourni, le porter. Un 200 est toujours un
 * échec de la suite — c'est le sens même d'un test négatif.
 */
function attendreRefus(libelle, reponse, codeAttendu, extraitMessage = '') {
  const codeOk = reponse.statut === codeAttendu;
  const messageOk = extraitMessage
    ? String(reponse.corps?.erreur ?? '').includes(extraitMessage)
    : true;
  verifier(libelle, codeOk && messageOk,
    `statut ${reponse.statut} (attendu ${codeAttendu})`
    + `, réponse ${reponse.brut ?? ''}`);
}

/** L'appel API doit LEVER, avec un message qui contient l'extrait attendu. */
function attendreRejetApi(libelle, fn, extrait = '') {
  try {
    fn();
    verifier(libelle, false, 'aucune erreur levée');
  } catch (erreur) {
    verifier(libelle, String(erreur.message).includes(extrait),
      `message « ${erreur.message} »`);
  }
}

const RACINE = join(import.meta.dirname, '..');

/**
 * Vérifie qu'une preuve citée existe TOUJOURS : le fichier de suite est
 * présent et contient encore le motif cité. C'est ce qui empêche le
 * répertoire de la partie B de devenir un mensonge après un renommage.
 */
function verifierPreuveCitee(libelle, cheminSuite, motif) {
  const chemin = join(RACINE, cheminSuite);
  if (!existsSync(chemin)) {
    verifier(libelle, false, `suite introuvable : ${cheminSuite}`);
    return;
  }
  const source = readFileSync(chemin, 'utf8');
  verifier(libelle, source.includes(motif),
    `motif absent de ${cheminSuite} : « ${motif} »`);
}

// ------------------------------------------------------------
// Client HTTP natif : contrôle total sur Host, Origin et Cookie —
// indispensable pour tirer les gardes anti-CSRF et anti-rebinding.
// ------------------------------------------------------------
const PORT = 24000 + Math.floor(Math.random() * 1500);
const DOSSIER = mkdtempSync(join(tmpdir(), 'iwf-secneg-'));
const CHEMIN_BASE = join(DOSSIER, 'data', 'jetable.db');

function requete(methodeApi, params, options = {}) {
  const { cookie, host, origin, methodeHttp = 'POST', corpsBrut } = options;
  return new Promise((resoudre, rejeter) => {
    const corps = corpsBrut !== undefined
      ? corpsBrut
      : JSON.stringify({ params: params ?? {} });
    const avecCorps = methodeHttp !== 'GET';
    const entetes = { Host: host ?? `127.0.0.1:${PORT}` };
    if (avecCorps) {
      // ⚠️ Annoncer un Content-Length SANS envoyer le corps (cas du GET)
      // laisse la connexion keep-alive en attente d'octets qui ne viennent
      // jamais : la requête SUIVANTE est alors lue de travers et revient
      // vide. Payé une fois à l'écriture de cette suite.
      entetes['Content-Type'] = 'application/json; charset=utf-8';
      entetes['Content-Length'] = Buffer.byteLength(corps);
    }
    if (cookie) entetes.Cookie = cookie;
    if (origin) entetes.Origin = origin;
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: `/api/${methodeApi}`,
      method: methodeHttp,
      headers: entetes,
      timeout: 15000,
    }, (rep) => {
      const morceaux = [];
      rep.on('data', (m) => morceaux.push(m));
      rep.on('end', () => {
        const brut = Buffer.concat(morceaux).toString('utf8');
        let json = null;
        try { json = JSON.parse(brut); }
        catch { /* corps vide ou non JSON (405…) */ }
        resoudre({
          statut: rep.statusCode,
          setCookie: rep.headers['set-cookie']?.[0] ?? null,
          corps: json,
          brut,
        });
      });
    });
    req.on('error', rejeter);
    req.on('timeout', () => { req.destroy(); rejeter(new Error('délai dépassé')); });
    if (avecCorps) req.write(corps);
    req.end();
  });
}

/** Extrait le jeton du cookie posé (« iwf_session=XXX; HttpOnly; … »). */
function jetonDe(setCookie) {
  if (!setCookie) return null;
  const m = /^iwf_session=([^;]*)/.exec(setCookie);
  return m ? m[1] : null;
}

/** AAAA-MM-JJ à n jours d'aujourd'hui. */
function dateRelative(jours) {
  return new Date(Date.now() + jours * 86400000).toISOString().slice(0, 10);
}

let enfant = null;
try {
  // ============================================================
  // DÉCOR : serveur jetable + trois comptes (ADMIN, REFERENT, ELEVE)
  // ============================================================
  enfant = spawn(process.execPath, [join(import.meta.dirname, 'serveur.js')], {
    env: { ...process.env, PORT: String(PORT), IWF_CHEMIN_BASE: CHEMIN_BASE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let sortie = '';
  enfant.stdout.on('data', (d) => { sortie += d.toString(); });
  enfant.stderr.on('data', (d) => { sortie += d.toString(); });

  const pret = await (async () => {
    const debut = Date.now();
    while (Date.now() - debut < 20000) {
      try {
        const r = await requete('ping', {});
        if (r.statut === 200) return true;
      } catch { /* pas encore prêt */ }
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  })();
  verifier('le serveur jetable démarre sur une base jetable', pret,
    sortie.slice(0, 400));
  if (!pret) {
    console.error(sortie);
    throw new Error('serveur de test indisponible');
  }

  // Premier ADMIN par la route d'amorçage, puis les deux autres comptes.
  const rBoot = await requete('bootstrapAdmin',
    { login: 'admin.secneg', motDePasse: 'MotDePasseAdmin-2026!' });
  verifier('amorçage du premier ADMIN', rBoot.statut === 200,
    JSON.stringify(rBoot.corps));
  const cookieAdmin = `iwf_session=${jetonDe(rBoot.setCookie)}`;

  await requete('creerCompte', {
    login: 'referent.secneg', motDePasseInitial: 'MotDePasseReferent-2026!',
    role: 'REFERENT',
  }, { cookie: cookieAdmin });
  await requete('creerCompte', {
    login: 'eleve.secneg', motDePasseInitial: 'MotDePasseEleve-2026!',
    role: 'ELEVE',
  }, { cookie: cookieAdmin });

  const rRef = await requete('connexion',
    { login: 'referent.secneg', motDePasse: 'MotDePasseReferent-2026!' });
  const cookieReferent = `iwf_session=${jetonDe(rRef.setCookie)}`;
  const rEleve = await requete('connexion',
    { login: 'eleve.secneg', motDePasse: 'MotDePasseEleve-2026!' });
  const cookieEleve = `iwf_session=${jetonDe(rEleve.setCookie)}`;
  verifier('trois sessions ouvertes (ADMIN, REFERENT, ELEVE)',
    Boolean(jetonDe(rBoot.setCookie)) && Boolean(jetonDe(rRef.setCookie))
    && Boolean(jetonDe(rEleve.setCookie)));

  // ============================================================
  // A. LES ATTAQUES — tirées ici, contre le vrai serveur
  // ============================================================
  console.log('');
  console.log('=== A1. Sans session : le mur ===');

  {
    const r = await requete('getMachines', {});
    attendreRefus('lecture sans session refusée (loopback compris)', r, 403,
      'Session requise');
  }
  {
    const r = await requete('createClient',
      { donneesClient: { raisonSociale: 'Pirate SA', adresse: 'nulle part' } });
    attendreRefus('mutation sans session refusée', r, 403);
  }
  {
    const r = await requete('getMachines', {}, { cookie: 'iwf_session=jeton-forge-au-hasard' });
    attendreRefus('jeton de session forgé refusé', r, 403, 'Session requise');
  }
  {
    // Le contexte vient de la CONNEXION, jamais du corps : un rôle glissé
    // dans l'enveloppe ne doit rien changer.
    const r = await requete('createHabilitation', {
      donneesHabilitation: { personnelId: 'X', categorie: 'I' },
      role: 'ADMIN', contexte: { role: 'ADMIN' },
    }, { cookie: cookieEleve });
    attendreRefus('rôle « ADMIN » glissé dans le corps : sans effet', r, 403,
      'réservée aux rôles habilités');
  }

  console.log('');
  console.log('=== A2. Gardes de transport (CSRF, rebinding, verbe) ===');

  {
    const r = await requete('getMachines', {}, {
      cookie: cookieReferent, origin: 'https://site-hostile.example',
    });
    attendreRefus('origine inter-site refusée (CSRF)', r, 403,
      'Origine non autorisée');
  }
  {
    const r = await requete('getMachines', {}, {
      cookie: cookieReferent, host: 'poste-du-lycee.attaquant.example',
    });
    attendreRefus('hôte étranger refusé (rebinding DNS)', r, 403,
      'Hôte non autorisé');
  }
  {
    const r = await requete('getMachines', null, {
      cookie: cookieReferent, methodeHttp: 'GET',
    });
    verifier('GET refusé sur /api (les mutations passent par POST)',
      r.statut === 405, `statut ${r.statut}`);
  }
  {
    const r = await requete('getMachines', null, {
      cookie: cookieReferent, corpsBrut: '{ceci n’est pas du JSON',
    });
    attendreRefus('corps JSON invalide refusé', r, 400, 'JSON invalide');
  }
  {
    const r = await requete('methodeQuiNExistePas', {}, { cookie: cookieReferent });
    verifier('méthode inconnue refusée (jamais 200)',
      r.statut !== 200 && r.corps?.ok !== true, `statut ${r.statut}`);
  }

  console.log('');
  console.log('=== A3. Élève connecté : le plafond de rôle ===');

  // L'élève est un utilisateur LÉGITIME : il a une session valide. Ce qui
  // suit n'est donc pas une intrusion, c'est la question réelle du lycée —
  // « jusqu'où va la main d'un élève sur un registre réglementaire ? ».
  const REFUS_ELEVE = [
    ['validerMouvement', { mouvementId: 'MVT-X' },
      'sceller une écriture (validation)'],
    ['annulerParContreEcriture', { mouvementId: 'MVT-X', motif: 'test' },
      'annuler une écriture scellée'],
    ['createHabilitation', { donneesHabilitation: { personnelId: 'P-X' } },
      's’attribuer une aptitude réglementaire'],
    ['updateHabilitation', { habilitationId: 'H-X', patch: {} },
      'modifier une habilitation'],
    ['createMention', { donneesMention: { personnelId: 'P-X' } },
      's’attribuer une mention'],
    ['createFluide', { donneesFluide: { code: 'R-999', famille: 'HFC', gwpAr4: 1 } },
      'créer un fluide au référentiel (le PRP pilote les seuils)'],
    ['updateFluide', { fluideId: 'R-134a', patch: { gwpAr4: 1 } },
      'abaisser le PRP d’un fluide (donc les obligations de contrôle)'],
    ['importerJSON', { texte: '{}' },
      'remplacer le registre entier par un import'],
    ['justifierEcart', { ecartId: 'E-X', motif: 'rien' },
      'justifier un écart de balance matière'],
    ['acquitterAlerte', { alerteId: 'alr-x' }, 'acquitter une alerte'],
    ['updateEtablissement', { patch: { numAttestationCapacite: 'FAUX' } },
      'modifier l’attestation de capacité de l’établissement'],
    ['getJournalAudit', {}, 'lire le journal nominatif (lecture sensible)'],
    // ⭐ La porte à côté : le journal était refusé en lecture directe, mais
    // sortait ENTIER par l'export complet — avec le personnel nominatif et
    // la configuration du coffre (sel + témoin). Tiré et prouvé le 25/07.
    ['exporterJSON', {}, 'aspirer TOUT le registre par l’export complet'],
    ['exporterDonneesPersonne', { personneId: 'P-X' },
      'exporter les données personnelles d’un tiers'],
    ['etatCoffre', {}, 'consulter le coffre des identités'],
  ];
  for (const [methode, params, quoi] of REFUS_ELEVE) {
    const r = await requete(methode, params, { cookie: cookieEleve });
    attendreRefus(`ÉLÈVE ne peut pas ${quoi} — ${methode}`, r, 403,
      'réservée aux rôles habilités');
  }

  // Contre-épreuve INDISPENSABLE : sans elle, une garde qui refuserait TOUT
  // le monde satisferait la section entière. L'élève doit pouvoir saisir.
  {
    const r = await requete('createClient', {
      donneesClient: { raisonSociale: 'Lycée Jacques Raynaud',
        adresse: '13012 Marseille' },
    }, { cookie: cookieEleve });
    verifier('contre-épreuve : l’élève PEUT créer un client (saisie courante)',
      r.statut === 200 && r.corps?.ok === true, `statut ${r.statut}`);
  }

  console.log('');
  console.log('=== A4. Mode Officiel forgé (verrou de livraison) ===');

  // Décor minimal pour des fiches : un fluide du référentiel de base, une
  // machine, une personne. Créés par le REFERENT (rôle suffisant).
  const rMachine = await requete('createMachine', {
    donneesMachine: {
      designation: 'Chambre froide de test', site: 'JR', famille: 'CF',
      fluide: 'R-134a', chargeNominaleKg: 8, dateMiseEnService: dateRelative(-400),
    },
  }, { cookie: cookieReferent });
  const machineId = rMachine.corps?.resultat?.id ?? null;
  verifier('décor : une machine existe', Boolean(machineId),
    JSON.stringify(rMachine.corps).slice(0, 200));

  {
    // ⭐ L'attaque centrale : contourner l'écran pour créer directement une
    // fiche OFFICIELLE alors que le mode est fermé. L'IHM ne propose pas le
    // choix ; l'API, elle, reçoit le champ.
    const r = await requete('creerMouvement', {
      donneesMouvement: {
        type: 'CHARGE_APPOINT', mode: 'OFFICIEL', machineId,
        date: dateRelative(0),
      },
    }, { cookie: cookieReferent });
    verifier('fiche OFFICIELLE forgée hors écran : REFUSÉE',
      r.statut !== 200 || r.corps?.ok !== true,
      `statut ${r.statut} — ${r.brut?.slice(0, 200)}`);
    verifier('… et le refus cite le verrou de livraison',
      String(r.corps?.erreur ?? '').toLowerCase().includes('verrou')
      || String(r.corps?.erreur ?? '').includes('Officiel'),
      `message « ${r.corps?.erreur ?? ''} »`);
  }
  {
    // Variante : le mot « OFFICIEL » dans une casse différente ne doit pas
    // ouvrir une troisième voie (ni valoir FORMATION en douce).
    const r = await requete('creerMouvement', {
      donneesMouvement: {
        type: 'CHARGE_APPOINT', mode: 'officiel', machineId, date: dateRelative(0),
      },
    }, { cookie: cookieReferent });
    const cree = r.corps?.resultat ?? null;
    verifier('« officiel » en minuscules ne crée jamais une fiche officielle',
      !cree || cree.mode === 'FORMATION',
      `mode obtenu : ${cree?.mode ?? 'refus'}`);
  }
  {
    // Contrôle d'étanchéité DIRECT en officiel : refus STRUCTUREL (P7-c) —
    // un contrôle officiel s'enregistre comme mouvement de type CONTROLE.
    const r = await requete('createControle', {
      donneesControle: {
        machineId, date: dateRelative(0), resultat: 'CONFORME', mode: 'OFFICIEL',
      },
    }, { cookie: cookieReferent });
    verifier('createControle DIRECT en OFFICIEL : refusé structurellement',
      r.statut !== 200 || r.corps?.ok !== true,
      `statut ${r.statut} — ${r.brut?.slice(0, 200)}`);
  }

} finally {
  if (enfant) {
    const fini = new Promise((resoudre) => {
      enfant.on('exit', resoudre);
      setTimeout(resoudre, 5000);
    });
    enfant.kill();
    await fini;
  }
  try {
    rmSync(DOSSIER, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch { /* dossier temporaire encore verrouillé : sans conséquence */ }
}

// ============================================================
// B. L'ATTAQUANT QUI A LA MAIN SUR LA BASE
// Le registre est un fichier SQLite posé sur un poste : celui qui veut
// « arranger » une écriture n'a pas besoin de l'application, il a besoin
// d'un éditeur SQL. C'est le scénario le plus probable au lycée comme en
// entreprise, et le seul que l'API ne peut pas garder — il faut que la
// BASE elle-même refuse. Ces cas sont donc tirés en SQL DIRECT, avec la
// même connexion que celle du logiciel (triggers WORM actifs).
// ============================================================
console.log('');
console.log('=== B. SQL direct sur la base : les triggers WORM ===');

const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const db = require('./db.js');
const api = require('./api.js');

const DOSSIER_B = mkdtempSync(join(tmpdir(), 'iwf-secneg-worm-'));
try {
  db.ouvrir(join(DOSSIER_B, 'data', 'worm.db'));
  const referent = { role: 'REFERENT' };
  api.appeler('init', {}, referent);

  // Décor : une écriture RÉELLE, scellée (le seul objet qui compte ici).
  const prof = api.appeler('createPersonne', { donneesPersonne: {
    prenom: 'Référent', nom: 'Alpha', typePersonne: 'ENSEIGNANT',
    roleApp: 'REFERENT' } }, referent);
  const machine = api.appeler('createMachine', { donneesMachine: {
    designation: 'Groupe froid WORM', fluide: 'R-134a',
    chargeNominaleKg: 10 } }, referent);
  const bouteille = api.appeler('createBouteille', { donneesBouteille: {
    type: 'NEUVE', fluide: 'R-134a', tareKg: 10, masseBruteKg: 30,
    contenanceMaxKg: 25 } }, referent);
  const mvt = api.appeler('creerMouvement', { donneesMouvement: {
    type: 'CHARGE_APPOINT', machineId: machine.id,
    bouteilleSrcId: bouteille.id, peseeAvantKg: 30, peseeApresKg: 29,
    technicien: 'Technicien', executeParId: prof.id,
    causeMouvement: 'Décor de la suite de sécurité' } }, referent);
  api.appeler('soumettreMouvement', { id: mvt.id }, referent);
  api.appeler('validerMouvement',
    { id: mvt.id, validateurId: prof.id }, referent);
  const scelle = db.get('SELECT * FROM mouvements WHERE id = ?', [mvt.id]);
  verifier('décor : une écriture est scellée (VALIDE, empreinte posée)',
    scelle?.statut === 'VALIDE' && Boolean(scelle?.hash_ecriture),
    JSON.stringify(scelle).slice(0, 200));

  /** Le geste SQL doit LEVER : sinon la base a laissé passer. */
  function attendreRefusSql(libelle, sql, params = []) {
    try {
      db.run(sql, params);
      verifier(libelle, false, 'la base a ACCEPTÉ la modification');
    } catch (erreur) {
      verifier(libelle, true);
      void erreur;
    }
  }

  attendreRefusSql('UPDATE direct d’une quantité scellée : refusé',
    'UPDATE mouvements SET quantite_kg = 99 WHERE id = ?', [mvt.id]);
  attendreRefusSql('UPDATE direct de l’empreinte : refusé',
    'UPDATE mouvements SET hash_ecriture = \'faux\' WHERE id = ?', [mvt.id]);
  // VALIDE → ANNULE est le SEUL changement admis par le déclencheur : c'est
  // le canal de la contre-écriture. Mais il n'est admis que SEUL — toute
  // retouche du contenu au passage est refusée.
  attendreRefusSql('annuler ET retoucher une quantité dans le même geste : refusé',
    'UPDATE mouvements SET statut = \'ANNULE\', quantite_calculee_kg = 0 '
    + 'WHERE id = ?', [mvt.id]);
  attendreRefusSql('DELETE direct d’une écriture scellée : refusé',
    'DELETE FROM mouvements WHERE id = ?', [mvt.id]);
  // ⭐ REPLACE INTO = DELETE + INSERT silencieux : sans
  // `PRAGMA recursive_triggers = ON`, il contourne les triggers WORM.
  // C'est LE contournement classique de SQLite, et il est fermé.
  attendreRefusSql('REPLACE INTO (le contournement classique) : refusé',
    'INSERT OR REPLACE INTO mouvements (id, numero, date, type, statut) '
    + 'VALUES (?, ?, ?, ?, ?)',
    [mvt.id, 'FORM-FAUX', '2026-01-01', 'CHARGE_APPOINT', 'BROUILLON']);
  attendreRefusSql('UPDATE d’une ligne du journal d’audit : refusé',
    'UPDATE journal_audit SET details = \'effacé\' WHERE rowid = '
    + '(SELECT max(rowid) FROM journal_audit)');
  attendreRefusSql('DELETE d’une ligne du journal d’audit : refusé',
    'DELETE FROM journal_audit WHERE rowid = '
    + '(SELECT max(rowid) FROM journal_audit)');

  // Contre-épreuve : la base n'est pas gelée pour autant — un BROUILLON
  // reste modifiable, sinon le logiciel serait inutilisable.
  {
    const brouillon = api.appeler('creerMouvement', { donneesMouvement: {
      type: 'CHARGE_APPOINT', machineId: machine.id,
      bouteilleSrcId: bouteille.id, technicien: 'Technicien',
      causeMouvement: 'Brouillon' } }, referent);
    let ok = true;
    let detail = '';
    try {
      db.run('UPDATE mouvements SET cause = ? WHERE id = ?',
        ['corrigé', brouillon.id]);
    } catch (erreur) { ok = false; detail = erreur.message; }
    verifier('contre-épreuve : un BROUILLON reste modifiable', ok, detail);
  }

  console.log('');
  console.log('=== B2. Par l’API : l’écriture figée refuse tout ===');

  attendreRejetApi('supprimer une écriture scellée : refusé',
    () => api.appeler('supprimerMouvement', { id: mvt.id }, referent));
  attendreRejetApi('re-soumettre une écriture scellée : refusé',
    () => api.appeler('soumettreMouvement', { id: mvt.id }, referent));
  attendreRejetApi('re-valider une écriture scellée : refusé',
    () => api.appeler('validerMouvement',
      { id: mvt.id, validateurId: prof.id }, referent));
  attendreRejetApi('ajouter une pièce jointe à une écriture figée : refusé',
    () => api.appeler('ajouterPieceJointe', { donneesPj: {
      entiteType: 'mouvement', entiteId: mvt.id, categorie: 'AUTRE',
      nomFichier: 'ajout-apres-coup.pdf', mimeType: 'application/pdf',
      base64: Buffer.from('%PDF-1.4\n%ajout\n%%EOF').toString('base64'),
    } }, referent));

  // ============================================================
  // B3. ⭐ L'ANNULATION FORGÉE — le trou trouvé en écrivant cette suite
  //
  // Le déclencheur WORM laisse passer VALIDE → ANNULE : c'est le canal de
  // la contre-écriture, il DOIT rester ouvert. Et le statut est hors
  // empreinte, sinon toute annulation casserait la chaîne. Résultat, avant
  // le correctif du 25/07 : `UPDATE mouvements SET statut='ANNULE'` en SQL
  // direct faisait sortir une intervention des totaux — empreinte intacte,
  // chaîne VERTE, aucune alerte, aucune ligne de journal. Pour un registre
  // opposable, c'est l'effacement parfait d'une charge d'appoint gênante.
  //
  // Le contrôle ajouté : le logiciel n'annule JAMAIS sans créer la
  // contre-écriture qui DÉSIGNE l'annulée. Une annulée que personne ne
  // désigne n'a donc pas pu naître de l'application.
  // ============================================================
  console.log('');
  console.log('=== B3. Annulation forgée hors application ===');

  {
    const avant = api.appeler('verifierChaineHash', {}, referent);
    verifier('avant l’attaque : la chaîne est verte',
      avant.ok === true && avant.motif === null, JSON.stringify(avant));

    // L'attaque : le geste que la base accepte (et doit accepter).
    db.run('UPDATE mouvements SET statut = \'ANNULE\' WHERE id = ?', [mvt.id]);
    const ligne = db.get(
      'SELECT statut, hash_ecriture FROM mouvements WHERE id = ?', [mvt.id]);
    verifier('l’écriture est bien passée à ANNULE, empreinte INTACTE',
      ligne.statut === 'ANNULE' && Boolean(ligne.hash_ecriture));

    const apres = api.appeler('verifierChaineHash', {}, referent);
    verifier('⭐ l’annulation forgée est DÉTECTÉE (chaîne non verte)',
      apres.ok === false, JSON.stringify(apres));
    verifier('… avec le motif ANNULATION_ORPHELINE et le numéro en cause',
      apres.motif === 'ANNULATION_ORPHELINE'
      && apres.casseA === scelle.numero, JSON.stringify(apres));

    const etat = api.appeler('getEtatRegistre', {}, referent);
    verifier('… et le bandeau « registre altéré » le dit à l’utilisateur',
      etat.altere === true && etat.motif === 'ANNULATION_ORPHELINE',
      JSON.stringify(etat));
  }

  // Contre-épreuve : une annulation LÉGITIME (par contre-écriture) laisse
  // la chaîne verte — sans quoi le contrôle ci-dessus condamnerait l'usage
  // normal du logiciel.
  {
    const mv2 = api.appeler('creerMouvement', { donneesMouvement: {
      type: 'CHARGE_APPOINT', machineId: machine.id,
      bouteilleSrcId: bouteille.id, peseeAvantKg: 29, peseeApresKg: 28.5,
      technicien: 'Technicien', executeParId: prof.id,
      causeMouvement: 'À annuler proprement' } }, referent);
    api.appeler('soumettreMouvement', { id: mv2.id }, referent);
    api.appeler('validerMouvement',
      { id: mv2.id, validateurId: prof.id }, referent);
    api.appeler('annulerParContreEcriture', {
      id: mv2.id, motif: 'Erreur de saisie', validateurId: prof.id }, referent);
    const apres = api.appeler('verifierChaineHash', {}, referent);
    verifier('contre-épreuve : l’annulation LÉGITIME ne déclenche PAS le '
      + 'contrôle (seule l’orpheline reste signalée)',
      apres.casseA === scelle.numero
      && apres.motif === 'ANNULATION_ORPHELINE', JSON.stringify(apres));
  }

  // ⚠️ Revue L2 (axe 4) — la contre-épreuve ci-dessus relit un registre DÉJÀ
  // signalé par l'attaque : elle resterait verte même si le contrôle
  // condamnait toutes les annulations. Elle ne prouve donc pas ce qu'elle
  // annonce. La voici rejouée sur une base NEUVE, où la seule annulation est
  // légitime — là, la chaîne DOIT être parfaitement verte.
  {
    const DOSSIER_B2 = mkdtempSync(join(tmpdir(), 'iwf-secneg-annul-'));
    try {
      db.fermer?.();
      db.ouvrir(join(DOSSIER_B2, 'data', 'annulation.db'));
      api.appeler('init', {}, referent);
      const prof2 = api.appeler('createPersonne', { donneesPersonne: {
        prenom: 'Référent', nom: 'Bêta', typePersonne: 'ENSEIGNANT',
        roleApp: 'REFERENT' } }, referent);
      const machine2 = api.appeler('createMachine', { donneesMachine: {
        designation: 'Groupe annulation', fluide: 'R-134a',
        chargeNominaleKg: 10 } }, referent);
      const bouteille2 = api.appeler('createBouteille', { donneesBouteille: {
        type: 'NEUVE', fluide: 'R-134a', tareKg: 10, masseBruteKg: 30,
        contenanceMaxKg: 25 } }, referent);
      const mv = api.appeler('creerMouvement', { donneesMouvement: {
        type: 'CHARGE_APPOINT', machineId: machine2.id,
        bouteilleSrcId: bouteille2.id, peseeAvantKg: 30, peseeApresKg: 29,
        technicien: 'T', executeParId: prof2.id,
        causeMouvement: 'à annuler proprement' } }, referent);
      api.appeler('soumettreMouvement', { id: mv.id }, referent);
      api.appeler('validerMouvement',
        { id: mv.id, validateurId: prof2.id }, referent);
      api.appeler('annulerParContreEcriture', { id: mv.id,
        motif: 'Erreur de saisie', validateurId: prof2.id }, referent);
      const verdict = api.appeler('verifierChaineHash', {}, referent);
      verifier('⭐ contre-épreuve RÉELLE : sur un registre où la seule '
        + 'annulation est légitime, la chaîne est PARFAITEMENT verte',
      verdict.ok === true && verdict.motif === null,
      JSON.stringify(verdict));
    } finally {
      try { db.fermer?.(); } catch { /* best-effort */ }
      try {
        rmSync(DOSSIER_B2, { recursive: true, force: true, maxRetries: 5,
          retryDelay: 200 });
      } catch { /* sans conséquence */ }
      db.ouvrir(join(DOSSIER_B, 'data', 'worm.db'));
    }
  }
} finally {
  try { db.fermer?.(); } catch { /* best-effort */ }
  try {
    rmSync(DOSSIER_B, { recursive: true, force: true, maxRetries: 5,
      retryDelay: 200 });
  } catch { /* dossier temporaire encore verrouillé : sans conséquence */ }
}

// ============================================================
// B4. ⭐ LE BLANCHIMENT DU REGISTRE PAR IMPORT
//
// L'import sait reprendre un historique ANTÉRIEUR au scellement : quand
// aucune écriture ne porte d'empreinte, le logiciel amorce la chaîne. Le
// critère de déclenchement était donc entre les mains de qui fabrique le
// fichier : exporter, retoucher les quantités, PUIS retirer toutes les
// empreintes — et le logiciel re-scellait des données falsifiées en
// déclarant le registre sain. Tout le passé réécrit, chaîne verte.
// ============================================================
console.log('');
console.log('=== B4. Blanchiment du registre par import ===');

const DOSSIER_C = mkdtempSync(join(tmpdir(), 'iwf-secneg-import-'));
try {
  db.ouvrir(join(DOSSIER_C, 'data', 'import.db'));
  const referent = { role: 'REFERENT' };
  api.appeler('init', {}, referent);
  const prof = api.appeler('createPersonne', { donneesPersonne: {
    prenom: 'Référent', nom: 'Alpha', typePersonne: 'ENSEIGNANT',
    roleApp: 'REFERENT' } }, referent);
  const machine = api.appeler('createMachine', { donneesMachine: {
    designation: 'Groupe froid import', fluide: 'R-134a',
    chargeNominaleKg: 10 } }, referent);
  const bouteille = api.appeler('createBouteille', { donneesBouteille: {
    type: 'NEUVE', fluide: 'R-134a', tareKg: 10, masseBruteKg: 40,
    contenanceMaxKg: 35 } }, referent);
  for (let i = 0; i < 3; i += 1) {
    const mv = api.appeler('creerMouvement', { donneesMouvement: {
      type: 'CHARGE_APPOINT', machineId: machine.id,
      bouteilleSrcId: bouteille.id, peseeAvantKg: 40 - i, peseeApresKg: 39 - i,
      technicien: 'Technicien', executeParId: prof.id,
      causeMouvement: `Écriture ${i + 1}` } }, referent);
    api.appeler('soumettreMouvement', { id: mv.id }, referent);
    api.appeler('validerMouvement', { id: mv.id, validateurId: prof.id },
      referent);
  }
  const avant = api.appeler('verifierChaineHash', {}, referent);
  verifier('décor : trois écritures scellées, chaîne verte', avant.ok === true);

  // Le fichier hostile : quantité retouchée PUIS toutes les empreintes
  // retirées, pour imiter une sauvegarde antérieure au scellement.
  const exporte = JSON.parse(api.appeler('exporterJSON', {}, referent));
  const cible = exporte.donnees.mouvements.find((mv) => mv.statut === 'VALIDE');
  cible.quantiteKg = 99.5;
  cible.causeMouvement = 'MAQUILLAGE';
  for (const mv of exporte.donnees.mouvements) {
    if (mv.statut === 'VALIDE' || mv.statut === 'ANNULE') {
      delete mv.hashEcriture;
      delete mv.hashPrecedent;
      delete mv.ordreValidation;
    }
  }
  attendreRejetApi(
    '⭐ registre blanchi (quantité retouchée + empreintes retirées) : REFUSÉ',
    () => api.appeler('importerJSON', { texte: JSON.stringify(exporte) },
      referent),
    'tient déjà un registre scellé');

  // ⭐ LE CONTOURNEMENT EN DEUX TEMPS — une garde qui ne regarderait que
  // l'état COURANT du registre serait du théâtre : il suffirait d'importer
  // d'abord un registre VIDE (plus rien de scellé en base), puis le fichier
  // forgé. La borne de scellement ne vit donc pas dans le registre mais
  // dans les réglages du poste, et elle ne redescend jamais.
  {
    const vide = JSON.parse(JSON.stringify(exporte));
    vide.donnees.mouvements = [];
    vide.donnees.signaturesMouvement = [];
    vide.donnees.piecesJointes = [];
    let temps1 = null;
    try {
      temps1 = api.appeler('importerJSON', { texte: JSON.stringify(vide) },
        referent);
    } catch { temps1 = 'refusé'; }
    // Que le registre vide passe ou non n'est pas le sujet : le sujet est
    // que le SECOND import reste refusé.
    attendreRejetApi(
      '⭐ contournement en deux temps (vider puis blanchir) : REFUSÉ AUSSI',
      () => api.appeler('importerJSON', { texte: JSON.stringify(exporte) },
        referent),
      'tient déjà un registre scellé');
    verifier('… (premier temps joué : ' + String(temps1) + ')', true);
  }

  // Et le registre en place n'a pas bougé d'un octet.
  const apres = api.appeler('verifierChaineHash', {}, referent);
  const quantites = db.all(
    'SELECT quantite_calculee_kg AS q FROM mouvements WHERE statut = \'VALIDE\'')
    .map((l) => l.q);
  verifier('… et le registre en place est intact (chaîne verte, quantités '
    + 'inchangées)',
    apres.ok === true && !quantites.includes(99.5),
    `${JSON.stringify(apres)} — quantités ${JSON.stringify(quantites)}`);
} finally {
  try { db.fermer?.(); } catch { /* best-effort */ }
  try {
    rmSync(DOSSIER_C, { recursive: true, force: true, maxRetries: 5,
      retryDelay: 200 });
  } catch { /* dossier temporaire encore verrouillé : sans conséquence */ }
}

// Contre-épreuve INDISPENSABLE : sur un poste VIERGE, reprendre un
// historique antérieur au scellement reste possible (sinon le correctif
// interdirait la migration d'un ancien registre), et le geste se VOIT au
// journal.
console.log('--- contre-épreuve : reprise d’historique sur poste vierge ---');
const DOSSIER_D = mkdtempSync(join(tmpdir(), 'iwf-secneg-reprise-'));
try {
  db.ouvrir(join(DOSSIER_D, 'data', 'reprise.db'));
  const referent = { role: 'REFERENT' };
  api.appeler('init', {}, referent);
  const prof = api.appeler('createPersonne', { donneesPersonne: {
    prenom: 'Référent', nom: 'Alpha', typePersonne: 'ENSEIGNANT',
    roleApp: 'REFERENT' } }, referent);
  const machine = api.appeler('createMachine', { donneesMachine: {
    designation: 'Groupe froid reprise', fluide: 'R-134a',
    chargeNominaleKg: 10 } }, referent);
  const bouteille = api.appeler('createBouteille', { donneesBouteille: {
    type: 'NEUVE', fluide: 'R-134a', tareKg: 10, masseBruteKg: 40,
    contenanceMaxKg: 35 } }, referent);
  const mv = api.appeler('creerMouvement', { donneesMouvement: {
    type: 'CHARGE_APPOINT', machineId: machine.id,
    bouteilleSrcId: bouteille.id, peseeAvantKg: 40, peseeApresKg: 39,
    technicien: 'Technicien', executeParId: prof.id,
    causeMouvement: 'Historique' } }, referent);
  api.appeler('soumettreMouvement', { id: mv.id }, referent);
  api.appeler('validerMouvement', { id: mv.id, validateurId: prof.id }, referent);
  const exporte = JSON.parse(api.appeler('exporterJSON', {}, referent));
  for (const m of exporte.donnees.mouvements) {
    delete m.hashEcriture; delete m.hashPrecedent; delete m.ordreValidation;
  }
  // Poste vierge : on repart d'une base neuve.
  db.fermer();
  const DOSSIER_E = mkdtempSync(join(tmpdir(), 'iwf-secneg-vierge-'));
  db.ouvrir(join(DOSSIER_E, 'data', 'vierge.db'));
  api.appeler('init', {}, referent);
  const repris = api.appeler('importerJSON',
    { texte: JSON.stringify(exporte) }, referent);
  verifier('contre-épreuve : un poste VIERGE reprend l’historique sans '
    + 'empreinte', repris === true, String(repris));
  const chaine = api.appeler('verifierChaineHash', {}, referent);
  verifier('… la chaîne est amorcée et verte', chaine.ok === true,
    JSON.stringify(chaine));
  const journal = api.appeler('getJournalAudit', {}, referent);
  const trace = (Array.isArray(journal) ? journal : journal?.lignes ?? [])
    .some((l) => String(l.action ?? '') === 'CHAINE_AMORCEE_A_L_IMPORT');
  verifier('… et l’amorçage de chaîne est TRACÉ au journal (geste rare, '
    + 'il doit se voir)', trace);
  try {
    rmSync(DOSSIER_E, { recursive: true, force: true, maxRetries: 5,
      retryDelay: 200 });
  } catch { /* sans conséquence */ }
} finally {
  try { db.fermer?.(); } catch { /* best-effort */ }
  try {
    rmSync(DOSSIER_D, { recursive: true, force: true, maxRetries: 5,
      retryDelay: 200 });
  } catch { /* dossier temporaire encore verrouillé : sans conséquence */ }
}

// ============================================================
// C. ⭐ FAIRE MENTIR LES DATES
//
// Le logiciel décide de choses opposables en comparant des chaînes de
// caractères — c'est l'astuce du format AAAA-MM-JJ, et elle est bonne…
// tant que la valeur EST une date. Trois attaques tirées le 25/07 :
//   · une attestation portant « 31/12/2020 » était déclarée VALIDE
//     (« 3 » est après « 2 » : la comparaison la voit dans le futur) ;
//   · une attestation 2008 datée « 15/06/2027 » — illégale — passait la
//     garde de délivrance pour la même raison, à l'envers ;
//   · une détection « vérifiée » le « 2028-99-99 » ou le « 2030-01-01 »
//     divisait par DEUX la fréquence des contrôles d'étanchéité.
// ============================================================
console.log('');
console.log('=== C. Faire mentir les dates ===');

const DOSSIER_F = mkdtempSync(join(tmpdir(), 'iwf-secneg-dates-'));
try {
  db.ouvrir(join(DOSSIER_F, 'data', 'dates.db'));
  const referent = { role: 'REFERENT' };
  api.appeler('init', {}, referent);
  const personne = api.appeler('createPersonne', { donneesPersonne: {
    prenom: 'Technicien', nom: 'Test', typePersonne: 'ENSEIGNANT',
    roleApp: 'ENSEIGNANT' } }, referent);

  console.log('--- C1. Habilitations ---');
  attendreRejetApi('attestation périmée déguisée en date française '
    + '(dateFin 31/12/2020) : REFUSÉE',
  () => api.appeler('createHabilitation', { donneesHabilitation: {
    personneId: personne.id, regime: '2025', categorie: 'A1',
    numeroAttestation: 'FR-2015-PERIMEE', dateDebut: '2015-01-05',
    dateFin: '31/12/2020' } }, referent), 'Date de fin invalide');

  attendreRejetApi('délivrance 2008 illégale déguisée en date française '
    + '(dateDebut 15/06/2027) : REFUSÉE',
  () => api.appeler('createHabilitation', { donneesHabilitation: {
    personneId: personne.id, regime: '2008', categorie: 'I',
    numeroAttestation: 'FR-2027-ILLEGALE', dateDebut: '15/06/2027' } },
  referent), 'Date de début invalide');

  for (const mauvaise of ['2028-99-99', '2026-02-30', '0000-00-00',
    '2026-13-45', '2026-7-5', '2026-07-25T00:00:00Z']) {
    attendreRejetApi(`date hors calendrier « ${mauvaise} » : REFUSÉE`,
      () => api.appeler('createHabilitation', { donneesHabilitation: {
        personneId: personne.id, regime: '2025', categorie: 'A1',
        dateFin: mauvaise } }, referent), 'invalide');
  }

  // La correction après coup ne rouvre pas la porte.
  {
    const bonne = api.appeler('createHabilitation', { donneesHabilitation: {
      personneId: personne.id, regime: '2025', categorie: 'A1',
      dateDebut: '2025-01-01', dateFin: '2030-01-01' } }, referent);
    attendreRejetApi('… ni par une correction après coup (updateHabilitation)',
      () => api.appeler('updateHabilitation', {
        id: bonne.id, donneesHabilitation: { dateFin: '31/12/2020' } },
      referent), 'Date de fin invalide');
  }

  // La fiche de la personne porte la même exigence : sa date de fin de
  // validité pilote l'alerte « attestation d'aptitude expirée ».
  attendreRejetApi('date de fin de validité d’une PERSONNE au format '
    + 'français : REFUSÉE',
  () => api.appeler('updatePersonne', { id: personne.id, donneesPersonne: {
    dateFinValidite: '31/12/2020' } }, referent),
  'Date de fin de validité invalide');

  console.log('--- C2. Détection de fuites (allègement de fréquence) ---');
  {
    const machine = api.appeler('createMachine', { donneesMachine: {
      designation: 'Groupe dates', fluide: 'R-410A', chargeNominaleKg: 30 } },
    referent);
    for (const mauvaise of ['2028-99-99', '2026-13-45', '2026-02-30']) {
      attendreRejetApi(`détection « vérifiée » le ${mauvaise} : REFUSÉE`,
        () => api.appeler('updateMachine', { id: machine.id, donneesMachine: {
          detectionPermanente: true, detectionVerifieeLe: mauvaise } },
        referent), 'Date de vérification de la détection invalide');
    }
    // Le futur : une vérification qui n'a pas eu lieu n'allège rien.
    const dansLeFutur = dateRelative(400);
    let poseeAuFutur = false;
    try {
      api.appeler('updateMachine', { id: machine.id, donneesMachine: {
        detectionPermanente: true, detectionVerifieeLe: dansLeFutur } },
      referent);
      poseeAuFutur = true;
    } catch { poseeAuFutur = false; }
    if (poseeAuFutur) {
      // Si la saisie passe, l'allègement, lui, ne doit PAS être accordé.
      const { detectionEffective } = require('./equipement.js');
      const etat = detectionEffective(
        { detectionPermanente: true, detectionVerifieeLe: dansLeFutur },
        new Date().toISOString().slice(0, 10));
      verifier('⭐ une vérification datée DANS LE FUTUR n’allège rien',
        etat.compte === false, JSON.stringify(etat));
    } else {
      verifier('⭐ une vérification datée DANS LE FUTUR est refusée à la '
        + 'saisie', true);
    }
    // Contre-épreuve : une vérification RÉELLE et récente allège bien.
    const { detectionEffective } = require('./equipement.js');
    const etatBon = detectionEffective(
      { detectionPermanente: true, detectionVerifieeLe: dateRelative(-30) },
      new Date().toISOString().slice(0, 10));
    verifier('contre-épreuve : une vérification récente allège toujours',
      etatBon.compte === true, JSON.stringify(etatBon));
  }

  console.log('--- C2 bis. Échéances et charges : ce que le moteur calcule '
    + 'ne se saisit pas ---');
  {
    // Machine LARGEMENT au-dessus du seuil : 30 kg de R-410A ≈ 62 t éq. CO₂,
    // donc réellement soumise au contrôle périodique.
    const machine = api.appeler('createMachine', { donneesMachine: {
      designation: 'Groupe soumis', fluide: 'R-410A', chargeNominaleKg: 30 } },
    referent);
    const eleve = { role: 'ELEVE' };

    attendreRejetApi('⭐ échéance forgée au 2099-01-01 par un ÉLÈVE : le '
      + 'moteur reprend la main',
    () => {
      api.appeler('createControle', { donneesControle: {
        machineId: machine.id, resultat: 'CONFORME',
        prochainControle: '2099-01-01' } }, eleve);
      const apres = api.appeler('getMachines', {}, referent)
        .find((m) => m.id === machine.id);
      if (apres.prochainControle === '2099-01-01') {
        throw new Error('ÉCHÉANCE FORGÉE ACCEPTÉE');
      }
      throw new Error('échéance ramenée à ' + apres.prochainControle);
    }, 'échéance ramenée à');

    attendreRejetApi('numéro de fiche usurpé (« C-FI-2026-0007 ») : REFUSÉ',
      () => api.appeler('createControle', { donneesControle: {
        machineId: machine.id, resultat: 'CONFORME',
        numero: 'C-FI-2026-0007' } }, eleve),
      'attribué par le registre');

    attendreRejetApi('contrôle daté DANS LE FUTUR : REFUSÉ',
      () => api.appeler('createControle', { donneesControle: {
        machineId: machine.id, resultat: 'CONFORME',
        date: dateRelative(400) } }, eleve), 'ne s’atteste pas d’avance');

    attendreRejetApi('contrôle daté du 30 février : REFUSÉ',
      () => api.appeler('createControle', { donneesControle: {
        machineId: machine.id, resultat: 'CONFORME',
        date: '2026-02-30' } }, eleve), 'Date de contrôle invalide');

    attendreRejetApi('⭐ échéance de la machine repoussée directement '
      + '(updateMachine) : REFUSÉE, et le refus dit où poser le geste',
    () => api.appeler('updateMachine', { id: machine.id, donneesMachine: {
      prochainControle: '2099-12-31' } }, eleve),
    'ne se saisissent pas ici');
    {
      // La revue a montré qu'ignorer ce champ EN SILENCE rendait un succès
      // trompeur : le professeur corrigeait, le logiciel disait « enregistré »,
      // et rien ne changeait.
      const apres = api.appeler('getMachines', {}, referent)
        .find((m) => m.id === machine.id);
      verifier('… et l’échéance en base n’a pas bougé',
        apres.prochainControle !== '2099-12-31',
        String(apres.prochainControle));
    }

    attendreRejetApi('⭐ charge nominale ramenée à 0 (la machine sortirait '
      + 'du périmètre) : REFUSÉ',
    () => api.appeler('updateMachine', { id: machine.id, donneesMachine: {
      chargeNominaleKg: 0 } }, eleve), 'Charge nominale obligatoire');

    for (const valeur of [-5, '', null, 'zéro']) {
      attendreRejetApi(`… idem pour ${JSON.stringify(valeur)}`,
        () => api.appeler('updateMachine', { id: machine.id, donneesMachine: {
          chargeNominaleKg: valeur } }, eleve),
        'Charge nominale obligatoire');
    }

    attendreRejetApi('⭐ charge actuelle gonflée à 9999 kg sur 30 kg '
      + 'nominaux : REFUSÉE',
    () => api.appeler('updateMachine', { id: machine.id, donneesMachine: {
      chargeActuelleKg: 9999 } }, eleve), 'Charge actuelle impossible');

    attendreRejetApi('… et une charge NÉGATIVE aussi',
      () => api.appeler('updateMachine', { id: machine.id, donneesMachine: {
        chargeActuelleKg: -3 } }, eleve), 'Charge actuelle invalide');

    // Contre-épreuve : la saisie normale passe toujours.
    {
      const ok = api.appeler('updateMachine', { id: machine.id,
        donneesMachine: { chargeActuelleKg: 29.5 } }, eleve);
      verifier('contre-épreuve : une charge plausible est acceptée',
        Number(ok.chargeActuelleKg) === 29.5, JSON.stringify(ok.chargeActuelleKg));
    }
  }

  console.log('--- C3. Les mêmes dates par IMPORT ---');
  {
    const exporte = JSON.parse(api.appeler('exporterJSON', {}, referent));
    exporte.donnees.habilitations.push({
      id: 'HAB-FORGEE', personneId: personne.id, regime: '2025',
      categorie: 'A1', numeroAttestation: 'FR-IMPORT', dateDebut: '2015-01-05',
      dateFin: '31/12/2020', actif: true });
    attendreRejetApi('⭐ la même attestation périmée par un paquet d’import : '
      + 'REFUSÉE AUSSI (les gardes du CRUD sont rejouées)',
    () => api.appeler('importerJSON', { texte: JSON.stringify(exporte) },
      referent), 'date de fin invalide');
  }
} finally {
  try { db.fermer?.(); } catch { /* best-effort */ }
  try {
    rmSync(DOSSIER_F, { recursive: true, force: true, maxRetries: 5,
      retryDelay: 200 });
  } catch { /* dossier temporaire encore verrouillé : sans conséquence */ }
}

// ============================================================
// D. ⭐ RÉÉCRIRE LA MATIÈRE ET LE PASSÉ
//
// Ici l'attaquant n'est plus un intrus : c'est l'exploitant pressé. Le
// fluide récupéré est encombrant (il faut le détruire, ou le réemployer
// sur SA machine d'origine) ; le régénéré, lui, se revend. Entre les deux,
// il n'y a qu'une étiquette — et c'est cette étiquette qu'on essaie de
// changer. Même chose pour un exercice comptable clos, ou pour un fluide
// qu'on voudrait « hors périmètre ».
// ============================================================
console.log('');
console.log('=== D. Réécrire la matière et le passé ===');

const DOSSIER_G = mkdtempSync(join(tmpdir(), 'iwf-secneg-matiere-'));
try {
  db.ouvrir(join(DOSSIER_G, 'data', 'matiere.db'));
  const referent = { role: 'REFERENT' };
  api.appeler('init', {}, referent);

  console.log('--- D1. Blanchir du fluide récupéré en régénéré ---');
  const recup = api.appeler('createBouteille', { donneesBouteille: {
    type: 'RECUPERATION', fluide: 'R-134a', etatFluide: 'RECUPERE',
    tareKg: 10, masseBruteKg: 14, contenanceMaxKg: 25 } }, referent);
  verifier('décor : une bouteille de récupération contient 4 kg de récupéré',
    Number(recup.masseNetteKg) === 4, JSON.stringify(recup.masseNetteKg));

  attendreRejetApi('requalifier l’état seul (RECUPERE → REGENERE) : refusé',
    () => api.appeler('updateBouteille', { id: recup.id, donneesBouteille: {
      etatFluide: 'REGENERE' } }, referent), 'RÉCUPÉRATION');

  attendreRejetApi('⭐ requalifier le type ET l’état dans le MÊME patch '
    + '(NEUVE + REGENERE) : REFUSÉ AUSSI',
  () => api.appeler('updateBouteille', { id: recup.id, donneesBouteille: {
    type: 'NEUVE', etatFluide: 'REGENERE' } }, referent),
  'Requalification refusée');

  attendreRejetApi('… et par un paquet d’IMPORT édité à la main : refusé',
    () => {
      const exporte = JSON.parse(api.appeler('exporterJSON', {}, referent));
      const cible = exporte.donnees.bouteilles.find((b) => b.id === recup.id);
      cible.type = 'NEUVE';
      cible.etatFluide = 'REGENERE';
      api.appeler('importerJSON', { texte: JSON.stringify(exporte) }, referent);
    }, 'bouteille');

  console.log('--- D2. Faire ressortir une bouteille du déchet ---');
  {
    const dechet = api.appeler('createBouteille', { donneesBouteille: {
      type: 'RECUPERATION', fluide: 'R-134a', etatFluide: 'RECUPERE',
      tareKg: 10, masseBruteKg: 13, contenanceMaxKg: 25 } }, referent);
    api.appeler('deciderFluideRecupere', {
      id: dechet.id, decision: 'DECHET', par: 'Référent' }, referent);
    attendreRejetApi('⭐ une bouteille déclarée DÉCHET ne revient pas au '
      + 'stock par un simple patch',
    () => api.appeler('updateBouteille', { id: dechet.id, donneesBouteille: {
      etatFluide: 'RECUPERE' } }, referent), 'déclarée déchet');
    // Contre-épreuve : la voie prévue reste ouverte.
    const releve = api.appeler('deciderFluideRecupere', {
      id: dechet.id, decision: 'REUTILISABLE', par: 'Référent' }, referent);
    verifier('contre-épreuve : la décision sur le fluide, elle, sort bien du '
      + 'déchet (geste journalisé)', releve.etatFluide === 'RECUPERE',
    JSON.stringify(releve.etatFluide));
  }

  console.log('--- D3. Sortir tout un parc du périmètre F-Gas ---');
  attendreRejetApi('⭐ requalifier le R-410A en « AUCUNE » (hors périmètre) : '
    + 'REFUSÉ — son PRP le contredit',
  () => api.appeler('updateFluide', {
    code: 'R-410A',
    donneesFluide: { categorieCadre7: 'AUCUNE', contientHfc: false,
      contientHfo: false, sourcePrp: 'x' } }, referent),
  'ne peut pas être déclaré hors périmètre');

  // La revue adversariale a montré que la première version de cette garde
  // (fondée sur le libellé de FAMILLE) se contournait en réécrivant la
  // famille dans le même patch. Le PRP, lui, ne se contourne pas ainsi.
  attendreRejetApi('… y compris en réécrivant la FAMILLE dans le même patch '
    + '(le contournement trouvé par la revue)',
  () => api.appeler('updateFluide', {
    code: 'R-410A',
    donneesFluide: { categorieCadre7: 'AUCUNE', contientHfc: false,
      contientHfo: false, famille: 'Gaz naturel', sourcePrp: 'x' } }, referent),
  'ne peut pas être déclaré hors périmètre');

  // Contre-épreuve : les VRAIS fluides hors périmètre restent enregistrables,
  // quel que soit le libellé de leur famille (« hors HFC » contient « HFC » :
  // la première version les refusait à tort).
  {
    const nh3 = api.appeler('createFluide', { donneesFluide: {
      code: 'R-717-TEST', famille: 'Ammoniac (NH3) — naturel, hors HFC',
      gwpAr4: 0, classeSecurite: 'B2L', categorieCadre7: 'AUCUNE',
      contientHfc: false, contientHfo: false } }, referent);
    verifier('contre-épreuve : l’ammoniac reste accepté hors périmètre',
      Boolean(nh3), JSON.stringify(nh3).slice(0, 120));
  }

  console.log('--- D4. Reprendre la photo d’un exercice clos ---');
  {
    const anneeClose = new Date().getFullYear() - 1;
    api.appeler('saisirInventaire', { annee: anneeClose,
      lignes: [{ fluide: 'R-134a', stockReelKg: 4 }], par: 'Référent' },
    referent);
    // ⚠️ La revue adversariale a corrigé la première version de ce cas : le
    // refus SEC rendait incorrigible la photographie du 31/12, qui se saisit
    // en janvier — donc sur un exercice déjà « révolu ». La règle retenue
    // est celle du registre : on n'empêche pas d'enregistrer la réalité, on
    // rend la reprise VISIBLE.
    api.appeler('saisirInventaire', { annee: anneeClose,
      lignes: [{ fluide: 'R-134a', stockReelKg: 0 }], par: 'Référent' },
    referent);
    {
      const journal = api.appeler('getJournalAudit', {}, referent);
      const trace = (Array.isArray(journal) ? journal : journal?.lignes ?? [])
        .some((l) => String(l.action ?? '') === 'RECTIFICATION_INVENTAIRE');
      verifier('⭐ re-photographier un exercice révolu est POSSIBLE mais '
        + 'TRACÉ (rectification journalisée)', trace);
    }
    // Contre-épreuve : l'exercice EN COURS se corrige librement.
    const enCours = new Date().getFullYear();
    api.appeler('saisirInventaire', { annee: enCours,
      lignes: [{ fluide: 'R-134a', stockReelKg: 4 }], par: 'Référent' },
    referent);
    const corrige = api.appeler('saisirInventaire', { annee: enCours,
      lignes: [{ fluide: 'R-134a', stockReelKg: 3 }], par: 'Référent' },
    referent);
    verifier('contre-épreuve : l’exercice EN COURS se re-photographie '
      + 'librement', Boolean(corrige));
  }

  console.log('--- D4 bis. Refermer un dossier de fuite après coup ---');
  {
    const machine = api.appeler('createMachine', { donneesMachine: {
      designation: 'Groupe en fuite', fluide: 'R-410A',
      chargeNominaleKg: 20 } }, referent);
    // Fuite détectée il y a 10 jours, réparation tracée hier : la
    // réécriture visée est une date INTERMÉDIAIRE (postérieure au contrôle,
    // donc acceptable pour les gardes existantes) qui refermerait le
    // dossier plus tôt.
    const fuite = api.appeler('createControle', { donneesControle: {
      machineId: machine.id, resultat: 'FUITE', date: dateRelative(-10),
      localisationFuite: 'Raccord BP' } }, referent);
    api.appeler('tracerReparation', { controleId: fuite.id,
      donneesReparation: { dateReparation: dateRelative(-1),
        natureReparation: 'Remplacement du raccord', reparateur: 'Technicien' } },
    referent);
    attendreRejetApi('⭐ réécrire la réparation pour refermer la fuite '
      + 'rétroactivement : REFUSÉ',
    () => api.appeler('tracerReparation', { controleId: fuite.id,
      donneesReparation: { dateReparation: dateRelative(-8),
        natureReparation: 'Autre version', reparateur: 'Technicien' } },
    referent), 'ne se réécrit pas');
    // Contre-épreuve : rejouer la MÊME réparation reste sans effet ni refus.
    const rejeu = api.appeler('tracerReparation', { controleId: fuite.id,
      donneesReparation: { dateReparation: dateRelative(-1),
        natureReparation: 'Remplacement du raccord', reparateur: 'Technicien' } },
    referent);
    verifier('contre-épreuve : rejouer la même réparation reste admis',
      Boolean(rejeu));
  }

  console.log('--- D4 ter. S’attribuer un régime réglementaire plus doux ---');
  {
    const machine = api.appeler('createMachine', { donneesMachine: {
      designation: 'Groupe à requalifier', fluide: 'R-410A',
      chargeNominaleKg: 5 } }, referent);
    const eleve = { role: 'ELEVE' };
    attendreRejetApi('⭐ un ÉLÈVE déclare la machine « hermétique scellée et '
      + 'étiquetée » (seuil d’aptitude 3 → 6 kg) : REFUSÉ',
    () => api.appeler('updateMachine', { id: machine.id, donneesMachine: {
      hermetiqueScelle: true, hermetiqueEtiquete: true } }, eleve),
    'réservée au responsable');
    attendreRejetApi('… et « MOBILE » (clôture de fuite le jour même) : REFUSÉ',
      () => api.appeler('updateMachine', { id: machine.id, donneesMachine: {
        typeInstallation: 'MOBILE' } }, eleve), 'réservée au responsable');
    // Contre-épreuves : la saisie courante reste ouverte à l'élève, et le
    // responsable, lui, qualifie bien l'équipement.
    const saisie = api.appeler('updateMachine', { id: machine.id,
      donneesMachine: { localisation: 'Atelier froid — poste 2' } }, eleve);
    verifier('contre-épreuve : l’élève modifie toujours la localisation',
      saisie.localisation === 'Atelier froid — poste 2');
    const qualifie = api.appeler('updateMachine', { id: machine.id,
      donneesMachine: { hermetiqueScelle: true, hermetiqueEtiquete: true } },
    referent);
    verifier('contre-épreuve : le responsable, lui, qualifie l’équipement',
      qualifie.hermetiqueScelle === true);

    // ⭐ LOT B1 — L'AUTRE PORTE. Tout ce qui précède ne tirait que
    // `updateMachine` : c'est exactement ce qui a laissé passer le trou.
    // `createMachine` est OPERATEUR (donc ÉLÈVE) et posait les MÊMES
    // colonnes en UN SEUL appel — la garde ne gardait qu'une porte sur deux.
    attendreRejetApi('⭐⭐ un ÉLÈVE CRÉE directement la machine « hermétique '
      + 'scellée et étiquetée » (l’autre porte) : REFUSÉ',
    () => api.appeler('createMachine', { donneesMachine: {
      designation: 'Groupe qualifié à la création', fluide: 'R-410A',
      chargeNominaleKg: 5, hermetiqueScelle: true, hermetiqueEtiquete: true } },
    eleve), 'réservée au responsable');
    attendreRejetApi('⭐⭐ … MOBILE + sous-type listé dès la création '
      + '(clôture de fuite le jour même) : REFUSÉ',
    () => api.appeler('createMachine', { donneesMachine: {
      designation: 'Camion à la création', fluide: 'R-410A',
      chargeNominaleKg: 5, typeInstallation: 'MOBILE',
      sousTypeInstallation: 'CAMION_FRIGORIFIQUE' } }, eleve),
    'réservée au responsable');
    attendreRejetApi('⭐⭐ … « résidentiel » et usage CLIM dès la création '
      + '(dates d’interdiction du fluide vierge) : REFUSÉ',
    () => api.appeler('createMachine', { donneesMachine: {
      designation: 'Split résidentiel', fluide: 'R-410A',
      chargeNominaleKg: 5, residentiel: true,
      usageThermique: 'CLIMATISATION' } },
    eleve), 'réservée au responsable');
    attendreRejetApi('⭐⭐ … machine créée d’emblée DEMANTELEE (elle sort de '
      + 'l’alerte de contrôle en retard) : REFUSÉ',
    () => api.appeler('createMachine', { donneesMachine: {
      designation: 'Née démantelée', fluide: 'R-410A',
      chargeNominaleKg: 5, statut: 'DEMANTELEE' } }, eleve),
    'réservée au responsable');
    attendreRejetApi('⭐⭐ … échéance de contrôle posée à la création (reprise '
      + 'de parc réservée au responsable) : REFUSÉ',
    () => api.appeler('createMachine', { donneesMachine: {
      designation: 'Reprise de parc', fluide: 'R-410A',
      chargeNominaleKg: 5, dernierControle: '2026-01-05',
      prochainControle: '2099-12-31' } }, eleve),
    'réservée au responsable');

    // Contre-épreuves : l'élève crée toujours une machine ORDINAIRE (sans
    // quoi l'écran deviendrait mort pour lui), y compris en renvoyant les
    // valeurs par DÉFAUT de tout le bloc « nature de l'équipement » — c'est
    // ce que fait le formulaire ; et le responsable qualifie dès la création.
    const ordinaire = api.appeler('createMachine', { donneesMachine: {
      designation: 'Groupe d’atelier', fluide: 'R-410A',
      chargeNominaleKg: 5, localisation: 'Atelier froid',
      hermetiqueScelle: false, hermetiqueEtiquete: false, residentiel: false,
      typeInstallation: 'FIXE', sousTypeInstallation: '', usageThermique: '',
      detectionPermanente: false } }, eleve);
    verifier('contre-épreuve : l’élève crée toujours une machine ordinaire '
      + '(défauts renvoyés tels quels)', Boolean(ordinaire?.id));
    const qualifieeDesLaCreation = api.appeler('createMachine', {
      donneesMachine: { designation: 'Monobloc scellé', fluide: 'R-410A',
        chargeNominaleKg: 5, hermetiqueScelle: true,
        hermetiqueEtiquete: true } }, referent);
    verifier('contre-épreuve : le responsable qualifie dès la création',
      qualifieeDesLaCreation.hermetiqueScelle === true
      && qualifieeDesLaCreation.hermetiqueEtiquete === true);
  }

  console.log('--- D4 sexies. La fiche du personnel : gouvernance, '
    + 'preuves et état civil ---');
  {
    const eleve = { role: 'ELEVE' };
    const prof = api.appeler('createPersonne', { donneesPersonne: {
      prenom: 'Professeur', nom: 'Titulaire', typePersonne: 'ENSEIGNANT',
      roleApp: 'ENSEIGNANT', numAttestationAptitude: 'ATT-2025-0001',
      organismeDelivreur: 'Organisme réel', categorie2025: 'A2' } },
    referent);

    // ⭐ Trou (a) : desactiverPersonne est gardé VALIDEUR, mais `actif`
    // figurait dans la liste blanche d'updatePersonne — même motif que
    // L2-i (une porte gardée, l'autre non).
    attendreRejetApi('⭐⭐ un ÉLÈVE désactive le professeur par la PORTE DE '
      + 'DERRIÈRE (updatePersonne { actif:false }) : REFUSÉ',
    () => api.appeler('updatePersonne', { id: prof.id,
      donneesPersonne: { actif: false } }, eleve),
    'réservées au responsable');
    verifier('… et la fiche est restée ACTIVE (aucun effet avant la garde)',
      api.appeler('getPersonnel', {}, referent)
        .find((p) => p.id === prof.id)?.actif !== false);
    attendreRejetApi('contre-épreuve du même trou : la porte de DEVANT '
      + '(desactiverPersonne) était déjà fermée',
    () => api.appeler('desactiverPersonne', { id: prof.id }, eleve),
    'réservée aux rôles habilités');

    // ⭐ Trou (b) : le DÉNI DE SERVICE. verifierValidateur lit la FICHE.
    attendreRejetApi('⭐⭐ un ÉLÈVE rétrograde la fiche du professeur '
      + '(roleApp → ELEVE), qui ne pourrait plus valider : REFUSÉ',
    () => api.appeler('updatePersonne', { id: prof.id,
      donneesPersonne: { roleApp: 'ELEVE' } }, eleve),
    'réservées au responsable');
    verifier('… et le professeur a gardé son rôle applicatif',
      api.appeler('getPersonnel', {}, referent)
        .find((p) => p.id === prof.id)?.roleApp === 'ENSEIGNANT');

    // La PREUVE DÉCLARATIVE : décorative pour le moteur d'aptitude (qui ne
    // lit que la table habilitations, gardée VALIDEUR), mais lue par un
    // auditeur. Un numéro et un organisme inventés n'entrent pas en saisie
    // courante.
    attendreRejetApi('⭐⭐ un ÉLÈVE inscrit une attestation INVENTÉE sur la '
      + 'fiche du professeur : REFUSÉ',
    () => api.appeler('updatePersonne', { id: prof.id, donneesPersonne: {
      numAttestationAptitude: 'ATT-INVENTEE', organismeDelivreur: 'Chez moi',
      categorie2025: 'A1' } }, eleve), 'réservées au responsable');
    attendreRejetApi('⭐⭐ … et se fabrique une fiche ADMIN de toutes pièces '
      + '(l’AUTRE porte : createPersonne) : REFUSÉ',
    () => api.appeler('createPersonne', { donneesPersonne: {
      prenom: 'Faux', nom: 'Administrateur', typePersonne: 'SALARIE',
      roleApp: 'ADMIN' } }, eleve), 'réservées au responsable');
    attendreRejetApi('⭐⭐ … avec attestation, organisme et catégories dès la '
      + 'création : REFUSÉ',
    () => api.appeler('createPersonne', { donneesPersonne: {
      prenom: 'Faux', nom: 'Titulaire', typePersonne: 'SOUS_TRAITANT',
      numAttestationAptitude: 'ATT-9999', organismeDelivreur: 'Nulle part',
      categorie2008: 'I', activitesAutorisees: ['MAINTENANCE'] } }, eleve),
    'réservées au responsable');

    // ⚠️ CONTRE-ÉPREUVES — l'écran ne doit pas devenir mort pour l'élève :
    // l'état civil est de la saisie COURANTE et le reste.
    const camarade = api.appeler('createPersonne', { donneesPersonne: {
      prenom: 'Un', nom: 'Élève', typePersonne: 'ELEVE',
      email: 'eleve@exemple.fr' } }, eleve);
    verifier('contre-épreuve : l’élève inscrit toujours un camarade '
      + '(état civil seul)', Boolean(camarade?.id));
    const camaradeBis = api.appeler('createPersonne', { donneesPersonne: {
      prenom: 'Deux', nom: 'Élève', typePersonne: 'ELEVE', roleApp: 'ELEVE',
      numAttestationAptitude: null, organismeDelivreur: null,
      categorie2008: null, categorie2025: null,
      activitesAutorisees: [] } }, eleve);
    verifier('contre-épreuve : … même en renvoyant TOUTE la fiche du '
      + 'formulaire (valeurs par défaut)', Boolean(camaradeBis?.id));
    const corrige = api.appeler('updatePersonne', { id: prof.id,
      donneesPersonne: { prenom: 'Professeur', nom: 'Titulaire-Marié',
        email: 'prof@exemple.fr', roleApp: 'ENSEIGNANT',
        numAttestationAptitude: 'ATT-2025-0001',
        organismeDelivreur: 'Organisme réel', categorie2025: 'A2' } }, eleve);
    verifier('contre-épreuve : l’élève corrige l’état civil en renvoyant la '
      + 'fiche entière (preuves INCHANGÉES)',
    corrige.nom === 'Titulaire-Marié'
      && corrige.numAttestationAptitude === 'ATT-2025-0001');
    const requalifie = api.appeler('updatePersonne', { id: prof.id,
      donneesPersonne: { categorie2025: 'A1' } }, referent);
    verifier('contre-épreuve : le responsable, lui, tient les preuves',
      requalifie.categorie2025 === 'A1');
    const desactive = api.appeler('updatePersonne', { id: camarade.id,
      donneesPersonne: { actif: false } }, referent);
    verifier('contre-épreuve : le responsable désactive toujours par la '
      + 'fiche', desactive.actif === false);
  }

  console.log('--- D4 quater. Purger le journal d’audit ---');
  {
    const exporte = JSON.parse(api.appeler('exporterJSON', {}, referent));
    const avant = exporte.donnees.journalAudit.length;
    verifier('décor : le fichier d’export porte le témoin de tête du journal',
      Boolean(exporte.donnees.journalAuditChaine)
      && exporte.donnees.journalAuditChaine.nombre === avant,
      JSON.stringify(exporte.donnees.journalAuditChaine));

    // L'attaque : retirer les lignes gênantes à la main.
    const purge = JSON.parse(JSON.stringify(exporte));
    purge.donnees.journalAudit = purge.donnees.journalAudit
      .filter((l) => String(l.action ?? '') !== 'CREATION_MACHINE');
    verifier('… et l’attaquant en a bien retiré au moins une',
      purge.donnees.journalAudit.length < avant,
      `${purge.donnees.journalAudit.length} / ${avant}`);
    attendreRejetApi('⭐ journal d’audit purgé par aller-retour export → '
      + 'import : REFUSÉ',
    () => api.appeler('importerJSON', { texte: JSON.stringify(purge) },
      referent), 'journal');

    // Variante plus fine : garder le compte, changer une ligne.
    const retouche = JSON.parse(JSON.stringify(exporte));
    if (retouche.donnees.journalAudit.length > 0) {
      retouche.donnees.journalAudit[0].details = 'ligne réécrite';
      attendreRejetApi('⭐ … et une simple LIGNE réécrite (le compte est '
        + 'pourtant juste) : REFUSÉ AUSSI',
      () => api.appeler('importerJSON', { texte: JSON.stringify(retouche) },
        referent), 'journal d’audit altéré');
    }

    // Contre-épreuve : le fichier INTACT s'importe toujours.
    verifier('contre-épreuve : le fichier intact s’importe normalement',
      api.appeler('importerJSON', { texte: JSON.stringify(exporte) },
        referent) === true);
  }

  console.log('--- D4 quinquies. Les chemins trouvés par la REVUE ---');
  {
    // ⭐ Chemin n° 1 : fabriquer la contre-écriture qui « couvre »
    // l'annulation forgée. Aucun déclencheur ne garde un BROUILLON (c'est
    // normal, il n'est pas encore un fait) : on y pose `contre_ecriture_de`
    // en SQL, on le fait valider par le logiciel — qui scelle et calcule
    // lui-même une empreinte juste — puis on passe la victime à ANNULE. Le
    // contrôle d'appariement voyait alors un désignant parfaitement scellé.
    const prof2 = api.appeler('createPersonne', { donneesPersonne: {
      prenom: 'Valideur', nom: 'Test', typePersonne: 'ENSEIGNANT',
      roleApp: 'REFERENT' } }, referent);
    const machine2 = api.appeler('createMachine', { donneesMachine: {
      designation: 'Machine contre-écriture', fluide: 'R-134a',
      chargeNominaleKg: 10 } }, referent);
    const bouteille2 = api.appeler('createBouteille', { donneesBouteille: {
      type: 'NEUVE', fluide: 'R-134a', tareKg: 10, masseBruteKg: 30,
      contenanceMaxKg: 25 } }, referent);
    // La VICTIME : une charge bien réelle, qu'on veut faire disparaître.
    const victime = api.appeler('creerMouvement', { donneesMouvement: {
      type: 'CHARGE_APPOINT', machineId: machine2.id,
      bouteilleSrcId: bouteille2.id, peseeAvantKg: 30, peseeApresKg: 27,
      technicien: 'T', executeParId: prof2.id,
      causeMouvement: 'charge à faire disparaître' } }, referent);
    api.appeler('soumettreMouvement', { id: victime.id }, referent);
    api.appeler('validerMouvement',
      { id: victime.id, validateurId: prof2.id }, referent);
    const leurre = api.appeler('creerMouvement', { donneesMouvement: {
      type: 'CONTROLE_PERIODIQUE', machineId: machine2.id,
      technicien: 'T', executeParId: prof2.id,
      causeMouvement: 'leurre' } }, referent);
    db.run('UPDATE mouvements SET contre_ecriture_de = ? WHERE id = ?',
      [victime.id, leurre.id]);
    api.appeler('soumettreMouvement', { id: leurre.id }, referent);
    attendreRejetApi('⭐ valider une écriture qui se PRÉTEND contre-écriture '
      + '(le chemin de la revue) : REFUSÉ',
    () => api.appeler('validerMouvement',
      { id: leurre.id, validateurId: prof2.id }, referent),
    'ne se saisit pas');
  }
  {
    // ⭐ Chemin n° 2 : déplacer une réparation par la porte de l'import.
    const machine3 = api.appeler('createMachine', { donneesMachine: {
      designation: 'Machine fuite import', fluide: 'R-410A',
      chargeNominaleKg: 20 } }, referent);
    const ctl = api.appeler('createControle', { donneesControle: {
      machineId: machine3.id, resultat: 'FUITE', date: dateRelative(-10),
      localisationFuite: 'Raccord' } }, referent);
    api.appeler('tracerReparation', { controleId: ctl.id,
      donneesReparation: { dateReparation: dateRelative(-2),
        natureReparation: 'Remplacement', reparateur: 'T' } }, referent);
    const paquet = JSON.parse(api.appeler('exporterJSON', {}, referent));
    const cible = paquet.donnees.controles.find((c) => c.id === ctl.id);
    cible.dateReparation = dateRelative(-9);
    attendreRejetApi('⭐ déplacer la réparation par IMPORT (la garde du CRUD '
      + 'tenait, la porte de derrière était ouverte) : REFUSÉ',
    () => api.appeler('importerJSON', { texte: JSON.stringify(paquet) },
      referent), 'ne se réécrit pas');
  }
  {
    // ⭐ Chemin n° 3 : sortir du périmètre, poser l'échéance, revenir.
    const machine4 = api.appeler('createMachine', { donneesMachine: {
      designation: 'Machine seuil', fluide: 'R-410A',
      chargeNominaleKg: 10 } }, referent);
    const eleve2 = { role: 'ELEVE' };
    api.appeler('updateMachine', { id: machine4.id,
      donneesMachine: { chargeNominaleKg: 0.001 } }, eleve2);
    api.appeler('createControle', { donneesControle: {
      machineId: machine4.id, resultat: 'CONFORME',
      prochainControle: '2099-12-31' } }, eleve2);
    api.appeler('updateMachine', { id: machine4.id,
      donneesMachine: { chargeNominaleKg: 10 } }, eleve2);
    const finale = api.appeler('getMachines', {}, referent)
      .find((m) => m.id === machine4.id);
    verifier('⭐ charge abaissée → échéance 2099 → charge remise : l’échéance '
      + 'est RECALCULÉE quand le seuil revient',
    finale.prochainControle !== '2099-12-31',
    `échéance finale : ${finale.prochainControle}`);
  }
  {
    // ⭐ Chemin n° 4 : blanchir en renommant l'identifiant. L'import reste
    // accepté (c'est une restauration, geste légitime), mais la disparition
    // de la bouteille qui portait du récupéré est ÉCRITE au journal.
    const recup2 = api.appeler('createBouteille', { donneesBouteille: {
      type: 'RECUPERATION', fluide: 'R-134a', etatFluide: 'RECUPERE',
      tareKg: 10, masseBruteKg: 15, contenanceMaxKg: 25 } }, referent);
    const paquet = JSON.parse(api.appeler('exporterJSON', {}, referent));
    const cible = paquet.donnees.bouteilles.find((b) => b.id === recup2.id);
    cible.id = 'BOU-RENOMMEE-0001';
    cible.type = 'NEUVE';
    cible.etatFluide = 'REGENERE';
    api.appeler('importerJSON', { texte: JSON.stringify(paquet) }, referent);
    const journal = api.appeler('getJournalAudit', {}, referent);
    const trace = (Array.isArray(journal) ? journal : journal?.lignes ?? [])
      .find((l) => String(l.action ?? '') === 'BOUTEILLE_ABSENTE_DE_L_IMPORT');
    verifier('⭐ blanchiment par renommage d’identifiant : la DISPARITION de '
      + 'la bouteille est journalisée, et le fluide récupéré signalé',
    Boolean(trace) && String(trace.details ?? '').includes('RÉCUPÉRÉ'),
    JSON.stringify(trace ?? null).slice(0, 160));
  }

  console.log('--- D5. Fabriquer une fiche OFFICIELLE par import ---');
  {
    const exporte = JSON.parse(api.appeler('exporterJSON', {}, referent));
    exporte.donnees.mouvements.push({
      id: 'MVT-FORGE-OFFICIEL', numero: 'FI-2026-0001', mode: 'OFFICIEL',
      statut: 'BROUILLON', type: 'CHARGE_APPOINT', date: dateRelative(-1),
      quantiteKg: 1 });
    attendreRejetApi('⭐ mouvement en mode OFFICIEL introduit par import '
      + 'alors que le verrou est fermé : REFUSÉ',
    () => api.appeler('importerJSON', { texte: JSON.stringify(exporte) },
      referent), 'mode Officiel n’est pas ouvert');
  }
} finally {
  try { db.fermer?.(); } catch { /* best-effort */ }
  try {
    rmSync(DOSSIER_G, { recursive: true, force: true, maxRetries: 5,
      retryDelay: 200 });
  } catch { /* dossier temporaire encore verrouillé : sans conséquence */ }
}

// ============================================================
// E. ⭐ FAIRE SORTIR UN FICHIER PRIVÉ PAR LE SERVEUR WEB
//
// La distribution est en liste BLANCHE depuis P2-4 : seuls `v8/` et `img/`
// sont servis. Mais la liste blanche juge le chemin DEMANDÉ, pas le fichier
// RÉEL. Deux attaques tirées le 25/07 :
//   · une base vive rangée sous `v8/data/` (configuration possible, et le
//     dossier de sauvegarde de même) devenait téléchargeable par un simple
//     GET, sans session : tout le registre, données nominatives comprises ;
//   · une jonction Windows (`mklink /J`, AUCUN privilège requis) posée dans
//     `v8/` et pointant vers `server/` faisait servir le code source
//     complet en 200.
// Le serveur est lancé depuis une COPIE jetable : le dépôt n'est jamais
// touché.
// ============================================================
console.log('');
console.log('=== E. Faire sortir un fichier privé par le serveur web ===');

const DOSSIER_H = mkdtempSync(join(tmpdir(), 'iwf-secneg-statique-'));
let enfantE = null;
try {
  const { cpSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');

  // Copie minimale : le serveur, une application factice, un dossier privé.
  cpSync(import.meta.dirname, join(DOSSIER_H, 'server'), { recursive: true });
  mkdirSync(join(DOSSIER_H, 'v8', 'data'), { recursive: true });
  mkdirSync(join(DOSSIER_H, 'prive'), { recursive: true });
  writeFileSync(join(DOSSIER_H, 'v8', 'index.html'),
    '<!doctype html><title>copie de test</title>');
  // La base vive est CRÉÉE PAR LE SERVEUR à cet emplacement : c'est une
  // configuration réellement possible (IWF_CHEMIN_BASE sous un dossier
  // servi), et c'est exactement ce qui la rendait téléchargeable.
  writeFileSync(join(DOSSIER_H, 'prive', 'secret.txt'),
    'contenu privé qui ne doit jamais sortir');
  // ⚠️ Revue L2 (axe 4) : ces fichiers étaient demandés au serveur sans
  // exister — le 404 venait de leur absence, pas de la garde. Ils existent
  // désormais pour de bon, et c'est bien la garde qui les retient.
  writeFileSync(join(DOSSIER_H, 'v8', 'data', 'archive.zip'),
    'PK faux paquet de sauvegarde');
  writeFileSync(join(DOSSIER_H, 'v8', 'data', '.env'),
    'IWF_SECRET=valeur-qui-ne-doit-pas-sortir');
  writeFileSync(join(DOSSIER_H, 'v8', 'data', 'base.db-wal'), 'journal WAL');
  writeFileSync(join(DOSSIER_H, 'v8', 'data', 'base.db-shm'), 'mémoire SHM');

  // La jonction : c'est ELLE qui trompait la liste blanche.
  let jonctionPosee = false;
  try {
    execFileSync('cmd', ['/c', 'mklink', '/J',
      join(DOSSIER_H, 'v8', 'lien_prive'), join(DOSSIER_H, 'prive')],
    { stdio: 'ignore' });
    jonctionPosee = true;
  } catch { jonctionPosee = false; }

  const PORT_E = 25500 + Math.floor(Math.random() * 400);
  enfantE = spawn(process.execPath, [join(DOSSIER_H, 'server', 'serveur.js')], {
    cwd: DOSSIER_H,
    env: { ...process.env, PORT: String(PORT_E),
      IWF_CHEMIN_BASE: join(DOSSIER_H, 'v8', 'data', 'base.db') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let sortieE = '';
  enfantE.stdout.on('data', (d) => { sortieE += d.toString(); });
  enfantE.stderr.on('data', (d) => { sortieE += d.toString(); });

  /** GET brut : rend { statut, corps }. */
  const obtenir = (chemin) => new Promise((resoudre) => {
    const req = http.get({ host: '127.0.0.1', port: PORT_E, path: chemin,
      timeout: 8000, headers: { Host: `127.0.0.1:${PORT_E}` } }, (rep) => {
      const morceaux = [];
      rep.on('data', (m) => morceaux.push(m));
      rep.on('end', () => resoudre({ statut: rep.statusCode,
        corps: Buffer.concat(morceaux).toString('utf8').slice(0, 120) }));
    });
    req.on('error', () => resoudre({ statut: 0, corps: '' }));
    req.on('timeout', () => { req.destroy(); resoudre({ statut: 0, corps: '' }); });
  });

  const pretE = await (async () => {
    const debut = Date.now();
    while (Date.now() - debut < 20000) {
      const r = await obtenir('/v8/index.html');
      if (r.statut === 200) return true;
      await new Promise((r2) => setTimeout(r2, 150));
    }
    return false;
  })();
  verifier('décor : un serveur tourne sur une COPIE jetable du dépôt', pretE,
    sortieE.slice(0, 300));

  if (pretE) {
    {
      const r = await obtenir('/v8/data/base.db');
      verifier('⭐ la base vive rangée sous un dossier servi ne sort PAS',
        r.statut === 404, `statut ${r.statut} — ${r.corps}`);
    }
    for (const nom of ['base.db-wal', 'base.db-shm', 'archive.zip', '.env']) {
      const r = await obtenir(`/v8/data/${nom}`);
      verifier(`… ni ${nom}`, r.statut === 404, `statut ${r.statut}`);
    }
    if (jonctionPosee) {
      const r = await obtenir('/v8/lien_prive/secret.txt');
      verifier('⭐ une jonction posée dans v8/ ne fait plus sortir un dossier '
        + 'privé', r.statut === 404, `statut ${r.statut} — ${r.corps}`);
    } else {
      verifier('(jonction Windows non créée sur ce poste — cas non joué)',
        true);
    }
    // Contre-épreuve : l'application reste servie.
    const r = await obtenir('/v8/index.html');
    verifier('contre-épreuve : l’application est toujours servie',
      r.statut === 200, `statut ${r.statut}`);
  }
} finally {
  if (enfantE) {
    const fini = new Promise((resoudre) => {
      enfantE.on('exit', resoudre);
      setTimeout(resoudre, 5000);
    });
    enfantE.kill();
    await fini;
  }
  try {
    rmSync(DOSSIER_H, { recursive: true, force: true, maxRetries: 5,
      retryDelay: 200 });
  } catch { /* jonction ou fichier verrouillé : sans conséquence */ }
}

// ============================================================
// F. LE RÉPERTOIRE DES PREUVES DÉJÀ TIRÉES AILLEURS
//
// Beaucoup de refus étaient déjà prouvés avant ce lot, dans les suites qui
// ont accompagné chaque brique. Les rejouer ici coûterait du temps sans
// rien apporter — mais les passer sous silence laisserait croire que cette
// suite est la seule preuve, et un auditeur n'aurait aucun moyen de
// retrouver les autres.
//
// D'où ce répertoire : chaque refus est RÉFÉRENCÉ (suite + intitulé exact
// du cas), et la référence est VÉRIFIÉE — la suite doit exister et
// contenir encore ce cas. Un renommage ou une suppression rend cette
// suite-ci ROUGE. L'index ne peut donc pas devenir un mensonge avec le
// temps, ce qui est le sort habituel des tableaux de correspondance.
// ============================================================
console.log('');
console.log('=== F. Répertoire des preuves déjà tirées ailleurs ===');

const REPERTOIRE = [
  ['tout handler qui écrit a une garde de rôle, et aucune garde ne pointe '
    + 'dans le vide', 'server/test-roles-mutations.mjs',
  'aucune entrée de ROLES_MUTATION ne pointe dans le vide'],
  ['… et un rôle autorisé franchit bien la garde (la garde ne refuse pas '
    + 'tout le monde)', 'server/test-roles-mutations.mjs',
  'un rôle AUTORISÉ franchit la garde (aucun 403 à tort)'],
  ['lecture anonyme refusée à travers le VRAI transport HTTP',
    'server/test-transport-http.mjs',
    'lecture anonyme (getFluides) refusée à travers le vrai transport'],
  ['le mode LAN sans certificat : le serveur REFUSE de démarrer',
    'server/test-lan-https.mjs',
    'IWF_LAN=1 sans certificat : le serveur refuse de démarrer'],
  ['base vive refusée sous un dossier synchronisé (OneDrive & co.)',
    'server/test-emplacement-base.mjs',
    'segment « OneDrive » détecté (casse indifférente)'],
  ['distribution en liste blanche : l’application est servie, rien d’autre',
    'server/test-distribution-statique.mjs',
    'Distribution allowlistée : l’application est servie, rien d’autre.'],
  ['export RGPD d’une personne refusé (403) à un ÉLÈVE',
    'server/test-export-personne.mjs', '403) une session ELEVE'],
  ['journal d’audit nominatif gaté (403 pour un ÉLÈVE)',
    'server/test-coffre-serveur.mjs',
    'getJournalAudit est désormais gaté (403 pour un ELEVE)'],
  ['le validateur doit être la personne CONNECTÉE (aucun effet avant la garde)',
    'server/test-validateur-session.mjs',
    'le mouvement est resté SOUMIS (aucun effet avant la garde)'],
  ['pièces jointes : le fichier est écrit sous son id, jamais ailleurs',
    'server/test-pieces-jointes-chemin.mjs',
    'le fichier est écrit dans documents/, sous son id'],
  ['empreintes de mouvement figées sur des valeurs CONNUES (v1 intouchable)',
    'server/test-hash-mouvement.mjs', 'v1'],
  ['périmètre du CERFA : pas de fiche officielle pour R-744 / R-290 / R-717',
    'v8/js/data/test-perimetre-cerfa.mjs', 'HORS_PERIMETRE_FLUORE'],
  ['cohérence état ↔ type d’une bouteille (aucune requalification interne)',
    'v8/js/data/test-coherence-etat-bouteille.mjs', 'REGENERE'],
  ['conditions bloquantes du mode Officiel, verrou compris',
    'server/test-blocage-officiel.mjs', 'VERROU_LIVRAISON'],
];

for (const [quoi, suite, motif] of REPERTOIRE) {
  verifierPreuveCitee(`preuve citée — ${quoi}`, suite, motif);
}

console.log('');
console.log(`Sécurité négative : ${nbOk} réussies, ${nbEchecs} en échec.`);
if (nbEchecs > 0) process.exit(1);
