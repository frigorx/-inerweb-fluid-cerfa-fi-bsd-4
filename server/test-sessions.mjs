// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — PREUVE des sessions (V9-E5, vague 2 : sessions serveur)
// Exécution : node server/test-sessions.mjs
//
// Éprouve server/sessions.js (jeton clair jamais stocké, vérification en
// temps constant, expiration à 8 h, révocation, rôle figé à l'ouverture).
// Reprend le patron de test-comptes.mjs / test-migrations.mjs : base jetable
// sous os.tmpdir(), jamais data/ réel.
//
// Familles :
//   1. Création : jeton clair renvoyé, jamais stocké en clair en base (seule
//      l'empreinte SHA-256 y figure).
//   2. Vérification : jeton valide → { utilisateur_id, role } ; jeton
//      inconnu → null.
//   3. Expiration : une session dont expire_le est dans le passé → null.
//   4. Révocation : après revoquerSession, verifierSession → null.
//   5. Rôle figé : le rôle renvoyé est celui donné à l'ouverture, même si le
//      rôle du compte change ensuite en base.
//
// Node ≥ 22 (node:sqlite, node:crypto), sans DOM.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const comptes = require('./comptes.js');
const sessions = require('./sessions.js');

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

// ------------------------------------------------------------
// Base jetable (data/ sous un dossier temporaire, jamais le data/ réel).
// ------------------------------------------------------------
const DOSSIER = mkdtempSync(join(tmpdir(), 'inerweb-fluide-sessions-'));
const CHEMIN_BASE = join(DOSSIER, 'data', 'inerweb-fluide.db');
db.ouvrir(CHEMIN_BASE);

db.run(`INSERT INTO etablissements (id, raison_sociale)
        VALUES ('ETB-TEST', 'Lycée du test');`);

function creerCompte(id, login, motDePasse, role = 'REFERENT') {
  const { hash, sel } = comptes.hacherMotDePasse(motDePasse);
  db.run(
    `INSERT INTO utilisateurs_app (id, login, hash_mot_de_passe, sel, role)
     VALUES (?, ?, ?, ?, ?)`,
    [id, login, hash, sel, role]);
  return { id, login, hash, sel, role };
}

// ============================================================
// 1. Création : jeton clair renvoyé, JAMAIS stocké en clair en base
// ============================================================
{
  const compte = creerCompte('UTI-S1', 'referent.session', 'MotDePasseRef-2026', 'REFERENT');
  const jetonClair = sessions.creerSession(compte.id, 'REFERENT', '127.0.0.1');

  verifier('creerSession renvoie une chaîne non vide (le jeton clair)',
    typeof jetonClair === 'string' && jetonClair.length > 0);

  const lignes = db.all('SELECT * FROM sessions WHERE utilisateur_id = ?', [compte.id]);
  verifier('une seule ligne de session créée', lignes.length === 1);

  const empreinteAttendue = createHash('sha256').update(jetonClair, 'utf8').digest('hex');
  verifier('la colonne jeton contient l’empreinte SHA-256, pas le jeton clair',
    lignes[0].jeton === empreinteAttendue && lignes[0].jeton !== jetonClair);
  verifier('sessions.hacherJeton produit la même empreinte que celle stockée',
    sessions.hacherJeton(jetonClair) === lignes[0].jeton);
  verifier('le rôle est bien celui fourni à l’ouverture', lignes[0].role === 'REFERENT');
  verifier('la session n’est pas révoquée à la création', lignes[0].revoque === 0);
  verifier('ip enregistrée', lignes[0].ip === '127.0.0.1');

  const creeLe = new Date(lignes[0].cree_le).getTime();
  const expireLe = new Date(lignes[0].expire_le).getTime();
  verifier('expire_le ≈ cree_le + 8 h (± 2 s de marge d’exécution)',
    Math.abs((expireLe - creeLe) - sessions.DUREE_SESSION_MS) < 2000);
}

// ============================================================
// 2. Vérification : jeton valide → { utilisateur_id, role } ; inconnu → null
// ============================================================
{
  const compte = creerCompte('UTI-S2', 'enseignant.session', 'MotDePasseEns-2026', 'ENSEIGNANT');
  const jetonClair = sessions.creerSession(compte.id, 'ENSEIGNANT');

  const verdict = sessions.verifierSession(jetonClair);
  verifier('jeton valide → verdict non nul',
    verdict !== null && typeof verdict === 'object');
  verifier('verdict.utilisateur_id correspond au compte', verdict.utilisateur_id === compte.id);
  verifier('verdict.role correspond au rôle figé à l’ouverture', verdict.role === 'ENSEIGNANT');

  verifier('jeton inconnu (jamais émis) → null',
    sessions.verifierSession('jeton-totalement-inconnu-xyz') === null);
  verifier('jeton vide → null', sessions.verifierSession('') === null);
  verifier('jeton undefined → null', sessions.verifierSession(undefined) === null);

  // Un jeton légèrement modifié (un caractère changé) doit être rejeté —
  // preuve que ce n'est pas une correspondance partielle/laxiste.
  const jetonAltere = jetonClair.slice(0, -1) + (jetonClair.at(-1) === 'A' ? 'B' : 'A');
  verifier('jeton altéré d’un caractère → null',
    sessions.verifierSession(jetonAltere) === null);
}

// ============================================================
// 3. Expiration : expire_le dans le passé → null
// ============================================================
{
  const compte = creerCompte('UTI-S3', 'eleve.session', 'MotDePasseEleve-2026', 'ELEVE');
  const jetonClair = sessions.creerSession(compte.id, 'ELEVE');
  const jetonHache = sessions.hacherJeton(jetonClair);

  // Session encore valide juste après création.
  verifier('juste après création : session valide',
    sessions.verifierSession(jetonClair) !== null);

  // On force l'échéance dans le passé directement en base (simule 8 h+).
  db.run('UPDATE sessions SET expire_le = ? WHERE jeton = ?',
    [new Date(Date.now() - 1000).toISOString(), jetonHache]);
  verifier('session expirée (expire_le passé) → null',
    sessions.verifierSession(jetonClair) === null);

  // Purge paresseuse : la ligne ne doit plus être exploitable/présente.
  const ligneApres = db.get('SELECT * FROM sessions WHERE jeton = ?', [jetonHache]);
  verifier('après vérification d’une session expirée : ligne purgée (ou au moins non valide)',
    ligneApres === undefined || sessions.verifierSession(jetonClair) === null);

  // Vérification explicite avec une date de référence fournie (pas de piège
  // d'horloge système) : à l'instant même de l'expiration, la session doit
  // déjà être considérée invalide (expire_le > maintenant, strict). Tester
  // D'ABORD juste avant (session encore vivante), la vérification d'après
  // expiration purgeant la ligne — deux jetons distincts pour ne dépendre
  // d'aucun ordre.
  const maintenant = new Date('2026-01-01T00:00:00.000Z');

  const compteAvant = creerCompte('UTI-S3B', 'eleve.session2', 'MotDePasseEleve2-2026', 'ELEVE');
  const jetonAvant = sessions.creerSession(compteAvant.id, 'ELEVE', null, maintenant);
  const justeAvantExpiration = new Date(maintenant.getTime() + sessions.DUREE_SESSION_MS - 1000);
  verifier('juste avant expiration (maintenant fourni explicitement) → valide',
    sessions.verifierSession(jetonAvant, justeAvantExpiration) !== null);

  const compteApres = creerCompte('UTI-S3C', 'eleve.session3', 'MotDePasseEleve3-2026', 'ELEVE');
  const jetonApres = sessions.creerSession(compteApres.id, 'ELEVE', null, maintenant);
  const justeApresExpiration = new Date(maintenant.getTime() + sessions.DUREE_SESSION_MS + 1);
  verifier('à expire_le + 1 ms (maintenant fourni explicitement) → null',
    sessions.verifierSession(jetonApres, justeApresExpiration) === null);
}

// ============================================================
// 4. Révocation : après revoquerSession, verifierSession → null
// ============================================================
{
  const compte = creerCompte('UTI-S4', 'admin.session', 'MotDePasseAdmin-2026', 'ADMIN');
  const jetonClair = sessions.creerSession(compte.id, 'ADMIN');

  verifier('avant révocation : session valide',
    sessions.verifierSession(jetonClair) !== null);

  sessions.revoquerSession(jetonClair);
  verifier('après révocation : verifierSession → null',
    sessions.verifierSession(jetonClair) === null);

  const jetonHache = sessions.hacherJeton(jetonClair);
  const ligne = db.get('SELECT revoque FROM sessions WHERE jeton = ?', [jetonHache]);
  verifier('la ligne existe toujours en base, marquée revoque = 1',
    ligne !== undefined && ligne.revoque === 1);

  // Révoquer un jeton inconnu ne doit jamais lever (no-op silencieux).
  let leve = false;
  try {
    sessions.revoquerSession('jeton-jamais-emis-abcdef');
  } catch {
    leve = true;
  }
  verifier('révoquer un jeton inconnu ne lève pas (no-op)', !leve);
}

// ============================================================
// 5. Rôle figé : le rôle de la session ne suit PAS un changement de rôle
//    ultérieur du compte en base (source de vérité = la session elle-même).
// ============================================================
{
  const compte = creerCompte('UTI-S5', 'referent.figé', 'MotDePasseFige-2026', 'REFERENT');
  const jetonClair = sessions.creerSession(compte.id, 'REFERENT');

  // Le compte est rétrogradé en ENSEIGNANT après l'ouverture de session.
  db.run('UPDATE utilisateurs_app SET role = ? WHERE id = ?', ['ENSEIGNANT', compte.id]);

  const verdict = sessions.verifierSession(jetonClair);
  verifier('le rôle renvoyé reste celui figé à l’ouverture (REFERENT), pas le rôle courant du compte',
    verdict !== null && verdict.role === 'REFERENT');
}

// ============================================================
// 6. Défense en profondeur : compte désactivé (actif = 0) → verifierSession
//    renvoie null IMMÉDIATEMENT, sans attendre l'expiration de la session.
// ============================================================
{
  const compte = creerCompte('UTI-S6', 'enseignant.desactive', 'MotDePasseDes-2026', 'ENSEIGNANT');
  const jetonClair = sessions.creerSession(compte.id, 'ENSEIGNANT');

  verifier('avant désactivation du compte : session valide',
    sessions.verifierSession(jetonClair) !== null);

  db.run('UPDATE utilisateurs_app SET actif = 0 WHERE id = ?', [compte.id]);

  verifier('compte désactivé (actif = 0) : verifierSession → null malgré une session non expirée/non révoquée',
    sessions.verifierSession(jetonClair) === null);

  const jetonHache = sessions.hacherJeton(jetonClair);
  const ligne = db.get('SELECT revoque, expire_le FROM sessions WHERE jeton = ?', [jetonHache]);
  verifier('la ligne de session existe toujours, ni révoquée ni expirée (le blocage vient du compte)',
    ligne !== undefined && ligne.revoque === 0 && new Date(ligne.expire_le).getTime() > Date.now());
}

// ============================================================
// 7. revoquerToutesLesSessions : révoque TOUTES les sessions d'un utilisateur
//    (plusieurs sessions ouvertes en parallèle → toutes invalidées).
// ============================================================
{
  const compte = creerCompte('UTI-S7', 'referent.multi', 'MotDePasseMulti-2026', 'REFERENT');
  const jeton1 = sessions.creerSession(compte.id, 'REFERENT', '10.0.0.1');
  const jeton2 = sessions.creerSession(compte.id, 'REFERENT', '10.0.0.2');
  const jeton3 = sessions.creerSession(compte.id, 'REFERENT', '10.0.0.3');

  verifier('les 3 sessions sont valides avant révocation groupée',
    sessions.verifierSession(jeton1) !== null
    && sessions.verifierSession(jeton2) !== null
    && sessions.verifierSession(jeton3) !== null);

  sessions.revoquerToutesLesSessions(compte.id);

  verifier('après revoquerToutesLesSessions : les 3 sessions → null',
    sessions.verifierSession(jeton1) === null
    && sessions.verifierSession(jeton2) === null
    && sessions.verifierSession(jeton3) === null);

  const lignes = db.all('SELECT revoque FROM sessions WHERE utilisateur_id = ?', [compte.id]);
  verifier('les 3 lignes en base sont bien marquées revoque = 1',
    lignes.length === 3 && lignes.every((ligne) => ligne.revoque === 1));

  // Un utilisateur sans session ouverte ne doit jamais lever (no-op silencieux).
  let leve = false;
  try {
    sessions.revoquerToutesLesSessions('UTI-JAMAIS-CREE');
  } catch {
    leve = true;
  }
  verifier('revoquerToutesLesSessions sur un utilisateur sans session ne lève pas (no-op)', !leve);
}

// ============================================================
// 8. purgerSessionsObsoletes : supprime les lignes expirées et les
//    révoquées-expirées, laisse les sessions valides (revoquées ou non,
//    tant que non expirées).
// ============================================================
{
  const maintenant = new Date('2026-02-01T00:00:00.000Z');
  const passe = new Date(maintenant.getTime() - 1000).toISOString();
  const futur = new Date(maintenant.getTime() + sessions.DUREE_SESSION_MS).toISOString();

  const compteExpiree = creerCompte('UTI-S8A', 'purge.expiree', 'MotDePassePurge1-2026', 'ELEVE');
  const jetonExpiree = sessions.creerSession(compteExpiree.id, 'ELEVE', null, maintenant);
  db.run('UPDATE sessions SET expire_le = ? WHERE jeton = ?',
    [passe, sessions.hacherJeton(jetonExpiree)]);

  const compteRevoqueeExpiree = creerCompte('UTI-S8B', 'purge.revexp', 'MotDePassePurge2-2026', 'ELEVE');
  const jetonRevoqueeExpiree = sessions.creerSession(compteRevoqueeExpiree.id, 'ELEVE', null, maintenant);
  db.run('UPDATE sessions SET expire_le = ?, revoque = 1 WHERE jeton = ?',
    [passe, sessions.hacherJeton(jetonRevoqueeExpiree)]);

  const compteRevoqueeValide = creerCompte('UTI-S8C', 'purge.revvalide', 'MotDePassePurge3-2026', 'ELEVE');
  const jetonRevoqueeValide = sessions.creerSession(compteRevoqueeValide.id, 'ELEVE', null, maintenant);
  db.run('UPDATE sessions SET expire_le = ?, revoque = 1 WHERE jeton = ?',
    [futur, sessions.hacherJeton(jetonRevoqueeValide)]);

  const compteValide = creerCompte('UTI-S8D', 'purge.valide', 'MotDePassePurge4-2026', 'ELEVE');
  const jetonValide = sessions.creerSession(compteValide.id, 'ELEVE', null, maintenant);
  db.run('UPDATE sessions SET expire_le = ? WHERE jeton = ?',
    [futur, sessions.hacherJeton(jetonValide)]);

  // Le compte du total est volontairement PAS testé ici : purgerSessionsObsoletes
  // opère sur TOUTE la table sessions, et d'autres familles de tests plus haut
  // (§3, expiration) laissent volontairement des lignes expirées de dates
  // arbitraires (2026-01-01) qui seraient légitimement comptées aussi selon
  // le `maintenant` choisi ici. On vérifie donc le SORT de CHAQUE jeton créé
  // dans cette famille, pas un total global.
  const nbSupprimees = sessions.purgerSessionsObsoletes(maintenant);
  verifier('purgerSessionsObsoletes renvoie un nombre (comptage best-effort)',
    typeof nbSupprimees === 'number' && nbSupprimees >= 2);

  verifier('la session expirée (non révoquée) a bien disparu',
    db.get('SELECT 1 FROM sessions WHERE jeton = ?', [sessions.hacherJeton(jetonExpiree)]) === undefined);
  verifier('la session révoquée-et-expirée a bien disparu',
    db.get('SELECT 1 FROM sessions WHERE jeton = ?', [sessions.hacherJeton(jetonRevoqueeExpiree)]) === undefined);
  verifier('la session révoquée mais PAS ENCORE expirée est CONSERVÉE',
    db.get('SELECT 1 FROM sessions WHERE jeton = ?', [sessions.hacherJeton(jetonRevoqueeValide)]) !== undefined);
  verifier('la session valide (ni révoquée ni expirée) est CONSERVÉE',
    db.get('SELECT 1 FROM sessions WHERE jeton = ?', [sessions.hacherJeton(jetonValide)]) !== undefined);
}

// ============================================================
// Verdict
// ============================================================
db.fermer();
rmSync(DOSSIER, { recursive: true, force: true });
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Sessions (V9-E5, vague 2) : tout est vert.');
