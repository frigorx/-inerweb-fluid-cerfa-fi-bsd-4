// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// Suite « témoin d'identité au journal d'audit » (Mode Local).
//
// Le registre F-Gas est DÉCLARATIF par nature : celui qui signe engage sa
// responsabilité, comme sur le CERFA papier. Le serveur ne peut donc pas
// refuser une déclaration. Mais le JOURNAL, lui, n'a pas à croire le client
// sur parole : il connaît la session. Depuis le 14/07, il consigne l'auteur
// RÉEL, et garde le nom déclaré à côté quand il diffère — SANS JUGER, car les
// deux cas sont légitimes :
//   - normal  : le professeur connecté saisit une intervention faite par un
//               élève (« auteur déclaré : Léa Martin ») ;
//   - suspect : un élève connecté signe au nom de son professeur.
// Le journal ne tranche pas, il ENREGISTRE — dans une entrée chaînée ET en
// ajout seul, donc ineffaçable. On n'empêche pas la déclaration : on la recoupe.
//
// Prouve aussi le point le plus dangereux du montage : la session ne doit pas
// « fuir » d'un appel sur le suivant (test 4).

import { createRequire } from 'node:module';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const api = require('./api.js');
const comptes = require('./comptes.js');

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
const dossier = mkdtempSync(join(tmpdir(), 'inerweb-fluide-journal-'));
db.ouvrir(join(dossier, 'test.db'));

const sansSession = { role: 'REFERENT' };
const appeler = (methode, params = {}, contexte = sansSession) =>
  api.appeler(methode, params, contexte);

appeler('init');

// Deux personnes au registre, et deux comptes qui leur correspondent.
const prof = appeler('createPersonne', {
  donneesPersonne: {
    prenom: 'Marc', nom: 'Dupont', roleApplicatif: 'REFERENT',
    typePersonne: 'ENSEIGNANT'
  }
});
const eleve = appeler('createPersonne', {
  donneesPersonne: {
    prenom: 'Léa', nom: 'Martin', roleApplicatif: 'ELEVE',
    typePersonne: 'ELEVE'
  }
});
/** Crée un compte comme le fait routes-comptes.js (même hachage, même table). */
function creerCompte(login, role, personnelId) {
  const { hash, sel } = comptes.hacherMotDePasse(`motdepasse-${login}`);
  const id = db.generateId('UTI');
  db.run(
    `INSERT INTO utilisateurs_app (id, login, hash_mot_de_passe, sel, role,
       personnel_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, login, hash, sel, role, personnelId]);
  return id;
}
const sessionProf = {
  role: 'REFERENT', utilisateur: creerCompte('mdupont', 'REFERENT', prof.id)
};
const sessionEleve = {
  role: 'ELEVE', utilisateur: creerCompte('lmartin', 'ELEVE', eleve.id)
};

/** Dernière entrée du journal (celle que l'action vient d'écrire). */
const derniereEntree = () => {
  const journal = appeler('getJournalAudit');
  return journal[journal.length - 1];
};

// ============================================================
// 1. Session concordante : le journal nomme l'auteur réel, sans bruit
// ============================================================
appeler('createMachine', {
  donneesMachine: {
    designation: 'Chambre froide', fluide: 'R-404A',
    chargeNominaleKg: 5, operateur: 'Marc Dupont'
  }
}, sessionProf);
{
  const entree = derniereEntree();
  verifier('le journal nomme l’auteur RÉEL de la session',
    entree.qui === 'Marc Dupont (mdupont)', `qui = « ${entree.qui} »`);
  verifier('aucune mention parasite quand la déclaration concorde',
    !/auteur déclaré/.test(entree.details ?? ''),
    `details = « ${entree.details}) »`);
}

// ============================================================
// 2. L'ATTAQUE : un élève déclare son professeur comme auteur
// ============================================================
// ⚠️ Revue B1 — le geste tiré ici était une CRÉATION de machine par
// l'élève. Depuis que la charge nominale est réservée au responsable (elle
// fait sortir du périmètre F-Gas), la fiche d'un équipement se crée au
// niveau du responsable. Ce que cette suite prouve n'est pas le droit de
// créer, c'est que le journal nomme l'auteur RÉEL : on le tire donc sur un
// geste de saisie courante, toujours ouvert à l'élève.
const machineEleve = appeler('createMachine', {
  donneesMachine: {
    designation: 'Vitrine', fluide: 'R-134a', chargeNominaleKg: 2
  }
}, sessionProf);
appeler('updateMachine', {
  id: machineEleve.id,
  donneesMachine: {
    localisation: 'Atelier froid — poste 2',
    operateur: 'Marc Dupont' // ← le nom du PROFESSEUR, déclaré par l'élève
  }
}, sessionEleve);
{
  const entree = derniereEntree();
  verifier('le journal nomme l’ÉLÈVE, pas le professeur qu’il a déclaré',
    entree.qui === 'Léa Martin (lmartin)', `qui = « ${entree.qui} »`);
  verifier('la DIVERGENCE est consignée (déclaration recoupée, pas effacée)',
    /auteur déclaré : Marc Dupont/.test(entree.details ?? ''),
    `details = « ${entree.details} »`);
}

// ============================================================
// 3. La trace est INEFFAÇABLE : elle vit dans la chaîne du journal
// ============================================================
{
  const chaine = db.verifierChaineJournal();
  verifier('la chaîne du journal reste intacte après ces écritures',
    chaine.ok === true, JSON.stringify(chaine));
  // Effacer la mention est IMPOSSIBLE depuis l'application : le déclencheur
  // WORM interdit toute modification du journal (ajout seul). Et si un outil
  // externe contournait les déclencheurs, `details` entre dans l'empreinte
  // (db.js:journaliser) — la chaîne casserait, donc la falsification se verrait.
  let refus = '';
  try {
    db.run("UPDATE journal_audit SET details = 'rien à voir' "
      + "WHERE details LIKE '%auteur déclaré%'");
  } catch (erreur) {
    refus = erreur.message;
  }
  verifier('effacer la mention est REFUSÉ (journal en ajout seul)',
    /ajout seul/.test(refus), `message = « ${refus} »`);
  verifier('la mention est donc toujours là, et la chaîne intacte',
    /auteur déclaré : Marc Dupont/.test(
      db.get("SELECT details FROM journal_audit WHERE details LIKE "
        + "'%auteur déclaré%'")?.details ?? '')
    && db.verifierChaineJournal().ok === true);
}

// ============================================================
// 4. Le piège du montage : la session ne doit JAMAIS fuir d'un appel à l'autre
// ============================================================
{
  // Un appel AVEC session…
  appeler('createMachine', {
    donneesMachine: {
      designation: 'A', fluide: 'R-134a', chargeNominaleKg: 1, operateur: 'X'
    }
  }, sessionProf);
  verifier('appel avec session : auteur réel',
    derniereEntree().qui === 'Marc Dupont (mdupont)');
  // …puis un appel SANS session : il ne doit RIEN hériter du précédent.
  appeler('createMachine', {
    donneesMachine: {
      designation: 'B', fluide: 'R-134a', chargeNominaleKg: 1,
      operateur: 'Technicien externe'
    }
  }, sansSession);
  const entree = derniereEntree();
  verifier('appel SANS session : aucune fuite de la session précédente',
    entree.qui === 'Technicien externe', `qui = « ${entree.qui} »`);
  verifier('appel sans session : aucune mention de divergence',
    !/auteur déclaré/.test(entree.details ?? ''));
}

// ------------------------------------------------------------
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [témoin d'identité au journal]`);
process.exit(nbEchecs === 0 ? 0 : 1);
