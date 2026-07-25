// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Coffre des identités — brique E2b (lot E2, RGPD) : les GESTES RÉELS du
// serveur, attaques TIRÉES sur base JETABLE (jamais le data/ réel) :
// mise à l'abri complète (enveloppe, pseudonymisation, brouillons réécrits,
// PJ purgées, compte renommé), chaîne de hash INTACTE, journal sans nom,
// gardes de rôle (ELEVE/ENSEIGNANT → 403), verrous de fiche, refus LAN,
// consultation/restauration/changement de phrase, rollback global,
// compteur monotone, rattrapage de purge, export RGPD substitué.
// Exécution : node server/test-coffre-serveur.mjs — base JETABLE.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pngDeTest } from './fabrique-png-test.mjs';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const api = require('./api.js');
const coffre = require('./coffre-identites.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}
function attendreRejet(libelle, fn, extrait, codeAttendu = null) {
  try {
    fn();
    verifier(libelle, false, 'aucune erreur levée');
  } catch (erreur) {
    verifier(libelle,
      String(erreur.message).includes(extrait) &&
      (codeAttendu === null || erreur.code === codeAttendu),
      `message = « ${erreur.message} », code = ${erreur.code}`);
  }
}

// Base JETABLE nichée sous <mkdtemp>/data/ (backups/ reste dans le bac à
// sable — l'archive de sécurité du coffre y sera produite).
const dossier = mkdtempSync(join(tmpdir(), 'inerweb-fluide-coffre-'));
mkdirSync(join(dossier, 'data'));
db.ouvrir(join(dossier, 'data', 'test.db'));

const referent = { role: 'REFERENT' };
api.appeler('init', {}, referent);

// ---- Décor : un élève complet (fiche + compte + PJ + brouillon + figé) ----
const eleve = api.appeler('createPersonne', { donneesPersonne: {
  prenom: 'Léa', nom: 'Bonnet', typePersonne: 'ELEVE', roleApp: 'ELEVE',
  email: 'lea@lycee.fr', numAttestationAptitude: 'ATT-2026-9',
  organismeDelivreur: 'Organisme certificateur', dateObtention: '2025-01-15',
  dateFinValidite: '2030-01-15' } }, referent);
const prof = api.appeler('createPersonne', { donneesPersonne: {
  prenom: 'Référent', nom: 'Alpha', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT' } }, referent);

// Compte applicatif lié à l'élève (login nominatif).
const comptes = require('./comptes.js');
const { hash, sel } = comptes.hacherMotDePasse('motdepasse-lea-2026');
db.run(
  `INSERT INTO utilisateurs_app (id, login, hash_mot_de_passe, sel, role,
     personnel_id) VALUES (?, ?, ?, ?, ?, ?)`,
  [db.generateId('UTI'), 'lbonnet', hash, sel, 'ELEVE', eleve.id]);

// PJ de la personne (scan d'attestation) — un vrai PDF minimal.
const octetsScan = Buffer.from('%PDF-1.4\n%scan attestation Lea\n%%EOF');
const pjScan = api.appeler('ajouterPieceJointe', { donneesPj: {
  entiteType: 'personne', entiteId: eleve.id,
  categorie: 'ATTESTATION_APTITUDE', nomFichier: 'attestation-lea.pdf',
  mimeType: 'application/pdf',
  base64: octetsScan.toString('base64') } }, referent);

// Un mouvement FIGÉ où l'élève est technicien déclaré + exécutant.
const machine = api.appeler('createMachine', { donneesMachine: {
  designation: 'Banc coffre', fluide: 'R-134a', chargeNominaleKg: 10,
  operateur: 'Testeur' } }, referent);
const bouteille = api.appeler('createBouteille', { donneesBouteille: {
  type: 'NEUVE', fluide: 'R-134a', tareKg: 10, masseBruteKg: 30,
  contenanceMaxKg: 25 } }, referent);
const mvFige = api.appeler('creerMouvement', { donneesMouvement: {
  type: 'CHARGE_APPOINT', machineId: machine.id,
  bouteilleSrcId: bouteille.id, peseeAvantKg: 30, peseeApresKg: 29,
  technicien: 'Léa Bonnet', executeParId: eleve.id,
  causeMouvement: 'Exercice coffre' } }, referent);
api.appeler('soumettreMouvement', { id: mvFige.id }, referent);
api.appeler('validerMouvement',
  { id: mvFige.id, validateurId: prof.id }, referent);

// Un BROUILLON de l'élève (sera réécrit par la mise à l'abri) — SIGNÉ :
// la revue exige que la signature devienne PÉRIMÉE après réécriture.
const mvBrouillon = api.appeler('creerMouvement', { donneesMouvement: {
  type: 'CHARGE_APPOINT', machineId: machine.id,
  bouteilleSrcId: bouteille.id, technicien: 'Léa Bonnet',
  executeParId: eleve.id, causeMouvement: 'Brouillon en cours' } }, referent);
// Lot B3 (25/07) : un VRAI PNG — l'image de signature est décodée.
const pngFactice = Buffer.from(pngDeTest(1200));
api.appeler('signerMouvement', { mouvementId: mvBrouillon.id, signature: {
  role: 'TECHNICIEN', nom: 'Bonnet', prenom: 'Léa',
  imagePng: pngFactice.toString('base64') } }, referent);

// Un CONTRÔLE d'étanchéité porté par l'élève (fuite prouvée par la revue :
// controles.operateur doit être réécrit à la mise à l'abri).
const controleEleve = api.appeler('createControle', { donneesControle: {
  machineId: machine.id, typeControle: 'PERIODIQUE', methode: 'DIRECTE',
  resultat: 'CONFORME', operateur: 'Léa Bonnet',
  operateurId: eleve.id } }, referent);

// Un HOMONYME actif avec son propre brouillon : il ne doit JAMAIS être
// touché par la mise à l'abri de l'autre « Léa Bonnet ».
const homonyme = api.appeler('createPersonne', { donneesPersonne: {
  prenom: 'Léa', nom: 'Bonnet', typePersonne: 'ELEVE',
  roleApp: 'ELEVE' } }, referent);
const mvHomonyme = api.appeler('creerMouvement', { donneesMouvement: {
  type: 'CHARGE_APPOINT', machineId: machine.id,
  bouteilleSrcId: bouteille.id, technicien: 'Léa Bonnet',
  executeParId: homonyme.id, causeMouvement: 'Brouillon homonyme' } }, referent);

// Une SECONDE PJ dont le fichier disque est ALTÉRÉ après l'ajout (hash gelé
// ≠ octets) : la restauration doit la SIGNALER sans jamais se bloquer.
const octetsAltere = Buffer.from('%PDF-1.4\n%document qui sera altere\n%%EOF');
const pjAlteree = api.appeler('ajouterPieceJointe', { donneesPj: {
  entiteType: 'personne', entiteId: eleve.id, categorie: 'AUTRE',
  nomFichier: 'altere.pdf', mimeType: 'application/pdf',
  base64: octetsAltere.toString('base64') } }, referent);
{
  // L'ARCHIVE de sécurité est produite AVANT l'altération : une PJ altérée
  // ferait (à juste titre) échouer la production d'archive — ici on veut
  // éprouver le chemin « pièce altérée DANS l'enveloppe » à la restauration.
  const sauvegarde = require('./sauvegarde.js');
  sauvegarde.sauvegarderArchive({ indice: 'décor du test coffre' });
  const cheminAltere = join(dossier, 'data', 'documents', pjAlteree.id);
  require('node:fs').writeFileSync(cheminAltere,
    Buffer.from('%PDF-1.4\n%OCTETS MODIFIES APRES COUP\n%%EOF'));
}

const PHRASE = 'grenouille wagon libellule sirop';
const eleveAvantAbri = api.appeler('getPersonnel', {}, referent)
  .find((p) => p.id === eleve.id);

// ============================================================
// 1. GARDES : rôles et poste local — AVANT tout coffre
// ============================================================
attendreRejet('etatCoffre refuse (403) une session ELEVE',
  () => api.appeler('etatCoffre', {}, { role: 'ELEVE' }),
  'réservée aux rôles habilités', 403);
attendreRejet('mettreAuCoffre refuse (403) un ENSEIGNANT (REFERENT/ADMIN requis)',
  () => api.appeler('mettreAuCoffre',
    { personnelIds: [eleve.id], phrase: PHRASE }, { role: 'ENSEIGNANT' }),
  'réservée aux rôles habilités', 403);
attendreRejet('consulterIdentiteCoffre refuse (403) un ENSEIGNANT',
  () => api.appeler('consulterIdentiteCoffre',
    { personnelId: eleve.id, phrase: PHRASE, motif: 'x' },
    { role: 'ENSEIGNANT' }),
  'réservée aux rôles habilités', 403);
attendreRejet('restaurerIdentiteCoffre refuse (403) un ENSEIGNANT',
  () => api.appeler('restaurerIdentiteCoffre',
    { personnelId: eleve.id, phrase: PHRASE, motif: 'x' },
    { role: 'ENSEIGNANT' }),
  'réservée aux rôles habilités', 403);
attendreRejet('changerPhraseCoffre refuse (403) un ENSEIGNANT',
  () => api.appeler('changerPhraseCoffre',
    { anciennePhrase: PHRASE, nouvellePhrase: PHRASE },
    { role: 'ENSEIGNANT' }),
  'réservée aux rôles habilités', 403);
attendreRejet('getJournalAudit est désormais gaté (403 pour un ELEVE)',
  () => api.appeler('getJournalAudit', {}, { role: 'ELEVE' }),
  'réservée aux rôles habilités', 403);

{
  process.env.IWF_LAN = '1';
  try {
    attendreRejet('accès RÉSEAU (IWF_LAN=1) : les gestes du coffre refusent',
      () => api.appeler('mettreAuCoffre',
        { personnelIds: [eleve.id], phrase: PHRASE }, referent),
      coffre.MSG_COFFRE_LAN);
  } finally {
    delete process.env.IWF_LAN;
  }
}

attendreRejet('verifierCodeCoffre sans coffre → MSG_COFFRE_INEXISTANT',
  () => api.appeler('verifierCodeCoffre', { phrase: PHRASE }, referent),
  coffre.MSG_COFFRE_INEXISTANT);
attendreRejet('mettreAuCoffre : phrase trop courte au premier geste → refus',
  () => api.appeler('mettreAuCoffre',
    { personnelIds: [eleve.id], phrase: 'court' }, referent),
  coffre.MSG_PHRASE_TROP_COURTE);

// ============================================================
// 2. LA MISE À L'ABRI (création du coffre + geste complet)
// ============================================================
{
  const etatAvant = api.appeler('etatCoffre', {}, referent);
  verifier('candidats : l\'élève ACTIF n\'y est pas encore (règle v1)',
    !etatAvant.candidats.includes(eleve.id));
  api.appeler('desactiverPersonne', { id: eleve.id, par: null }, referent);
  const etatApres = api.appeler('etatCoffre', {}, referent);
  verifier('candidats : l\'élève DÉSACTIVÉ est pré-coché',
    etatApres.candidats.includes(eleve.id));

  const resultat = api.appeler('mettreAuCoffre',
    { personnelIds: [eleve.id], phrase: PHRASE,
      options: { annee: 2026 } }, referent);
  verifier('mise à l\'abri : pseudonyme « Élève 2026-01 » attribué',
    resultat.misAuCoffre.length === 1
    && resultat.misAuCoffre[0].pseudonyme === 'Élève 2026-01');

  const fiche = api.appeler('getPersonnel', {}, referent)
    .find((p) => p.id === eleve.id);
  verifier('fiche : pseudonymisée, identifiants effacés, id INTACT',
    fiche.prenom === 'Élève' && fiche.nom === '2026-01'
    && fiche.email === null && fiche.numAttestationAptitude === null
    && fiche.organismeDelivreur === null && fiche.actif === false
    && fiche.id === eleve.id);

  const chaine = api.appeler('verifierChaineHash', {}, referent);
  verifier('CHAÎNE DE HASH INTACTE après la mise à l\'abri (le cœur du plan)',
    chaine.ok === true, JSON.stringify(chaine));

  const brouillon = api.appeler('getMouvements', {}, referent)
    .find((m) => m.id === mvBrouillon.id);
  verifier('brouillon de l\'élève : technicien RÉÉCRIT en pseudonyme',
    brouillon.technicien === 'Élève 2026-01');
  const fige = api.appeler('getMouvements', {}, referent)
    .find((m) => m.id === mvFige.id);
  verifier('mouvement FIGÉ : technicien scellé INCHANGÉ (résidu assumé)',
    fige.technicien === 'Léa Bonnet');
  const brouillonHomonyme = api.appeler('getMouvements', {}, referent)
    .find((m) => m.id === mvHomonyme.id);
  verifier('HOMONYME : son brouillon (porteur identifié) n\'est PAS touché',
    brouillonHomonyme.technicien === 'Léa Bonnet');
  const signatures = api.appeler('getSignaturesMouvement',
    { mouvementId: mvBrouillon.id }, referent);
  verifier('brouillon signé : la signature est PÉRIMÉE (révision incrémentée)',
    signatures.length === 1 && signatures[0].valide === false);
  const controleApres = api.appeler('getControles', {}, referent)
    .find((c) => c.id === controleEleve.id);
  verifier('contrôle de l\'élève : opérateur RÉÉCRIT en pseudonyme (fuite fermée)',
    controleApres.operateur === 'Élève 2026-01');

  const pjs = api.appeler('listerPiecesJointes',
    { entiteType: 'personne', entiteId: eleve.id }, referent);
  verifier('PJ de la personne : lignes supprimées', pjs.length === 0);
  verifier('PJ de la personne : fichier PURGÉ du disque',
    !existsSync(join(dossier, 'data', 'documents', pjScan.id)));

  const compte = db.get(
    'SELECT login, actif FROM utilisateurs_app WHERE personnel_id = ?',
    [eleve.id]);
  verifier('compte : login remplacé par le pseudonyme, compte désactivé',
    compte.login === 'eleve-2026-01' && compte.actif === 0);

  // Journal : événement dédié, JAMAIS le nom réel ni la phrase.
  const journal = api.appeler('getJournalAudit', {}, referent);
  const evenement = journal.find((e) => e.action === 'COFFRE_MISE_A_L_ABRI');
  verifier('journal : événement COFFRE_MISE_A_L_ABRI, cible = pseudonyme + id',
    evenement && evenement.cible === `Élève 2026-01 (${eleve.id})`);
  const texteJournal = JSON.stringify(
    journal.filter((e) => String(e.action).startsWith('COFFRE_')));
  verifier('journal : AUCUN nom réel dans les événements du coffre',
    !texteJournal.includes('Bonnet') && !texteJournal.includes('Léa'));
  verifier('journal : AUCUN fragment de la phrase',
    !texteJournal.includes('grenouille'));

  const etat = api.appeler('etatCoffre', {}, referent);
  verifier('etatCoffre : coffre créé, 1 identité, jamais d\'enveloppe ni de nom',
    etat.coffreCree === true && etat.nombreAuCoffre === 1
    && !JSON.stringify(etat).includes('Bonnet')
    && !JSON.stringify(etat).includes('enveloppe'));
}

// ============================================================
// 3. VERROUS de la fiche au coffre (store seul juge)
// ============================================================
attendreRejet('updatePersonne sur fiche au coffre → refus canonique',
  () => api.appeler('updatePersonne',
    { id: eleve.id, donneesPersonne: { nom: 'Pirate' } }, referent),
  coffre.MSG_FICHE_AU_COFFRE);
attendreRejet('ajouterPieceJointe sur fiche au coffre → refus canonique',
  () => api.appeler('ajouterPieceJointe', { donneesPj: {
    entiteType: 'personne', entiteId: eleve.id, categorie: 'AUTRE',
    nomFichier: 'scan.pdf', mimeType: 'application/pdf',
    contenuBase64: octetsScan.toString('base64') } }, referent),
  coffre.MSG_FICHE_AU_COFFRE);
attendreRejet('desactiverPersonne sur fiche au coffre → refus canonique',
  () => api.appeler('desactiverPersonne', { id: eleve.id }, referent),
  coffre.MSG_FICHE_AU_COFFRE);
attendreRejet('double mise à l\'abri → MSG_DEJA_AU_COFFRE',
  () => api.appeler('mettreAuCoffre',
    { personnelIds: [eleve.id], phrase: PHRASE }, referent),
  coffre.MSG_DEJA_AU_COFFRE);
attendreRejet('createHabilitation sur fiche au coffre → refus canonique',
  () => api.appeler('createHabilitation', { donneesHabilitation: {
    personneId: eleve.id, regime: '2025', categorie: 'A1' } }, referent),
  coffre.MSG_FICHE_AU_COFFRE);
attendreRejet('createMention sur fiche au coffre → refus canonique',
  () => api.appeler('createMention', { donneesMention: {
    personneId: eleve.id, fluideMention: 'CO2' } }, referent),
  coffre.MSG_FICHE_AU_COFFRE);
// E2c : l'export du poste PORTE désormais le coffre — le ré-import d'un
// export sain du même poste est ACCEPTÉ et le coffre survit intact.
{
  const reImport = api.appeler('importerJSON',
    { texte: api.appeler('exporterJSON', {}, referent) }, referent);
  verifier('ré-import d\'un export au coffre : ACCEPTÉ, coffre intact (E2c)',
    reImport === true
    && api.appeler('etatCoffre', {}, referent).nombreAuCoffre === 1);
}

// ============================================================
// 4. CONSULTATION (anti-oracle, motif, journal)
// ============================================================
attendreRejet('consultation SANS motif → MSG_MOTIF_OBLIGATOIRE',
  () => api.appeler('consulterIdentiteCoffre',
    { personnelId: eleve.id, phrase: PHRASE, motif: '  ' }, referent),
  coffre.MSG_MOTIF_OBLIGATOIRE);
attendreRejet('consultation : phrase FAUSSE → message canonique unique',
  () => api.appeler('consulterIdentiteCoffre',
    { personnelId: eleve.id, phrase: 'phrase parfaitement fausse',
      motif: 'essai' }, referent),
  coffre.MSG_CODE_INCORRECT);
attendreRejet('consultation d\'une personne PAS au coffre → MSG_PAS_AU_COFFRE',
  () => api.appeler('consulterIdentiteCoffre',
    { personnelId: prof.id, phrase: PHRASE, motif: 'essai' }, referent),
  coffre.MSG_PAS_AU_COFFRE);
{
  const identite = api.appeler('consulterIdentiteCoffre',
    { personnelId: eleve.id, phrase: PHRASE,
      motif: 'Demande RGPD de la famille' }, referent);
  const scanConsulte = identite.piecesJointes
    .find((pj) => pj.nomFichier === 'attestation-lea.pdf');
  verifier('consultation : identité COMPLÈTE restituée (rien de réécrit)',
    identite.nom === 'Bonnet' && identite.prenom === 'Léa'
    && identite.email === 'lea@lycee.fr'
    && identite.identifiantConnexion === 'lbonnet'
    && identite.piecesJointes.length === 2
    && scanConsulte && scanConsulte.base64 === octetsScan.toString('base64'));
  const fiche = api.appeler('getPersonnel', {}, referent)
    .find((p) => p.id === eleve.id);
  verifier('consultation : la fiche RESTE pseudonymisée',
    fiche.nom === '2026-01');
  const journal = api.appeler('getJournalAudit', {}, referent);
  const evenement = journal.find((e) => e.action === 'COFFRE_CONSULTATION');
  verifier('consultation : journalisée avec pseudonyme + motif, sans nom',
    evenement && evenement.cible.includes('Élève 2026-01')
    && String(evenement.details).includes('Demande RGPD')
    && !evenement.cible.includes('Bonnet'));
}

// ============================================================
// 5. ATTAQUE : enveloppe altérée en base (contournement de l'application)
// ============================================================
{
  const ligne = db.get(
    'SELECT id, enveloppe FROM coffre_identites WHERE personnel_id = ?',
    [eleve.id]);
  const origine = Buffer.from(ligne.enveloppe);
  const alteree = Buffer.from(origine);
  alteree[alteree.length - 1] ^= 0xff;
  db.run('UPDATE coffre_identites SET enveloppe = ? WHERE id = ?',
    [alteree, ligne.id]);
  attendreRejet('enveloppe ALTÉRÉE d\'un octet → même message (anti-oracle)',
    () => api.appeler('consulterIdentiteCoffre',
      { personnelId: eleve.id, phrase: PHRASE, motif: 'essai' }, referent),
    coffre.MSG_CODE_INCORRECT);

  // 5 bis. Changement de phrase avec UNE enveloppe corrompue → ROLLBACK
  // global : rien re-chiffré, ancien témoin intact.
  attendreRejet('changerPhraseCoffre avec enveloppe corrompue → LÈVE (rollback)',
    () => api.appeler('changerPhraseCoffre',
      { anciennePhrase: PHRASE,
        nouvellePhrase: 'toute nouvelle phrase du coffre' }, referent),
    coffre.MSG_CODE_INCORRECT);
  verifier('rollback : l\'ANCIENNE phrase vérifie toujours (témoin intact)',
    api.appeler('verifierCodeCoffre', { phrase: PHRASE }, referent).ok === true);

  db.run('UPDATE coffre_identites SET enveloppe = ? WHERE id = ?',
    [origine, ligne.id]);
  verifier('enveloppe d\'origine reposée : la consultation repasse',
    api.appeler('consulterIdentiteCoffre',
      { personnelId: eleve.id, phrase: PHRASE, motif: 'contrôle' },
      referent).nom === 'Bonnet');

  // 5 ter. Témoin/sel du coffre corrompus EN BASE : message canonique,
  // jamais une erreur brute de Node (contrat anti-oracle).
  const parametresServeur = require('./parametres.js');
  const temoinSauve = parametresServeur.lire('coffre_temoin');
  const selSauve = parametresServeur.lire('coffre_sel');
  parametresServeur.ecrire('coffre_temoin', 'cGFzLXVuLXZyYWktdGVtb2lu');
  attendreRejet('témoin REMPLACÉ en base → message canonique (vraie phrase refusée)',
    () => api.appeler('verifierCodeCoffre', { phrase: PHRASE }, referent),
    coffre.MSG_CODE_INCORRECT);
  parametresServeur.ecrire('coffre_temoin', temoinSauve);
  parametresServeur.ecrire('coffre_sel', 'abcd');
  attendreRejet('sel CORROMPU en base → message canonique (pas d\'erreur brute)',
    () => api.appeler('verifierCodeCoffre', { phrase: PHRASE }, referent),
    coffre.MSG_CODE_INCORRECT);
  parametresServeur.ecrire('coffre_sel', selSauve);
  verifier('témoin et sel reposés : la vérification repasse',
    api.appeler('verifierCodeCoffre', { phrase: PHRASE }, referent).ok === true);
}

// ============================================================
// 6. EXPORT RGPD (E1) d'une personne au coffre : substitué
// ============================================================
{
  const exp = api.appeler('exporterDonneesPersonne',
    { personneId: eleve.id }, referent);
  const texte = JSON.stringify(exp);
  verifier('export E1 au coffre : mention dédiée + AUCUN nom réel',
    typeof exp.identiteAuCoffre === 'string'
    && !texte.includes('Bonnet') && !texte.includes('Léa'),
    texte.includes('Bonnet') ? 'nom réel présent' : '');
}

// ============================================================
// 7. CHANGEMENT DE PHRASE (nominal) puis RESTAURATION complète
// ============================================================
{
  attendreRejet('changerPhraseCoffre : ancienne phrase FAUSSE → refus',
    () => api.appeler('changerPhraseCoffre',
      { anciennePhrase: 'pas la bonne phrase du tout',
        nouvellePhrase: 'toute nouvelle phrase du coffre' }, referent),
    coffre.MSG_CODE_INCORRECT);
  const bilan = api.appeler('changerPhraseCoffre',
    { anciennePhrase: PHRASE,
      nouvellePhrase: 'toute nouvelle phrase du coffre' }, referent);
  verifier('changement de phrase : 1 enveloppe re-scellée',
    bilan.ok === true && bilan.nombreRechiffre === 1);
  attendreRejet('l\'ANCIENNE phrase ne vérifie plus',
    () => api.appeler('verifierCodeCoffre', { phrase: PHRASE }, referent),
    coffre.MSG_CODE_INCORRECT);
  verifier('la NOUVELLE phrase vérifie et rouvre l\'identité',
    api.appeler('consulterIdentiteCoffre',
      { personnelId: eleve.id, phrase: 'toute nouvelle phrase du coffre',
        motif: 'contrôle après rotation' }, referent).nom === 'Bonnet');
}
{
  const fiche = api.appeler('restaurerIdentiteCoffre',
    { personnelId: eleve.id, phrase: 'toute nouvelle phrase du coffre',
      motif: 'Retour de l\'élève au lycée' }, referent);
  const clefs = ['nom', 'prenom', 'email', 'numAttestationAptitude',
    'organismeDelivreur', 'dateObtention', 'dateFinValidite'];
  verifier('restauration : la fiche redevient BIT À BIT ce qu\'elle était',
    clefs.every((c) => fiche[c] === eleveAvantAbri[c]));
  // L'« origine » restaurée = l'état AU MOMENT de la mise à l'abri : la
  // fiche avait été DÉSACTIVÉE (candidate) avant le geste — elle le reste.
  verifier('restauration : l\'état actif AU MOMENT du geste est repris (désactivé)',
    fiche.actif === false);
  // La pièce ALTÉRÉE (fichier modifié après l'ajout : hash gelé ≠ octets)
  // est SIGNALÉE et sautée — la restauration n'est JAMAIS bloquée et le
  // scan sain, lui, est restitué.
  verifier('restauration : la pièce ALTÉRÉE est signalée (jamais bloquante)',
    Array.isArray(fiche.piecesAlterees)
    && fiche.piecesAlterees.includes('altere.pdf'));
  const pjs = api.appeler('listerPiecesJointes',
    { entiteType: 'personne', entiteId: eleve.id }, referent);
  verifier('restauration : la PJ SAINE re-matérialisée, l\'altérée absente',
    pjs.length === 1 && pjs[0].nomFichier === 'attestation-lea.pdf');
  const contenu = api.appeler('obtenirPieceJointe',
    { id: pjs[0].id }, referent);
  verifier('restauration : octets du scan identiques (hash revérifié)',
    Buffer.from(contenu.blob, 'base64').equals(octetsScan));
  const compte = db.get(
    'SELECT login, actif FROM utilisateurs_app WHERE personnel_id = ?',
    [eleve.id]);
  verifier('restauration : login restauré, compte RESTE désactivé (prudence)',
    compte.login === 'lbonnet' && compte.actif === 0);
  verifier('restauration : plus au coffre, chaîne toujours verte',
    api.appeler('etatCoffre', {}, referent).nombreAuCoffre === 0
    && api.appeler('verifierChaineHash', {}, referent).ok === true);
}

// ============================================================
// 7 bis. IMPORT d'un fichier portant un coffre SIMULÉ (démo) → rejet
// ============================================================
{
  const forge = JSON.parse(api.appeler('exporterJSON', {}, referent));
  forge.donnees.coffreIdentites = [{ id: 'cof-x', personnelId: 'per-x',
    pseudonyme: 'Élève 2099-01', enveloppe: 'SIMULATION-COFFRE:eyJ4IjoxfQ==',
    dateMiseALabri: '2026-01-01T00:00:00Z' }];
  attendreRejet('import d\'un coffre de SIMULATION → rejet net (E2c)',
    () => api.appeler('importerJSON',
      { texte: JSON.stringify(forge) }, referent),
    coffre.MSG_SIMULATION_REJETEE);
}

// ============================================================
// 8. COMPTEUR MONOTONE : le pseudonyme n'est jamais réattribué
// ============================================================
{
  // La fiche restaurée est restée désactivée : déjà candidate.
  verifier('après restauration : la fiche reste candidate (désactivée)',
    api.appeler('etatCoffre', {}, referent).candidats.includes(eleve.id));
  const resultat = api.appeler('mettreAuCoffre',
    { personnelIds: [eleve.id], phrase: 'toute nouvelle phrase du coffre',
      options: { annee: 2026 } }, referent);
  verifier('nouvelle mise à l\'abri : pseudonyme SUIVANT (2026-02, jamais -01)',
    resultat.misAuCoffre[0].pseudonyme === 'Élève 2026-02');
}

// ============================================================
// 9. RATTRAPAGE DE PURGE (plantage simulé entre COMMIT et purge)
// ============================================================
{
  const fantome = join(dossier, 'data', 'documents', 'PJ-FANTOME-TEST');
  mkdirSync(join(dossier, 'data', 'documents'), { recursive: true });
  require('node:fs').writeFileSync(fantome, 'contenu en clair');
  db.run(
    'INSERT INTO coffre_purge_en_attente (id, chemin) VALUES (?, ?)',
    [db.generateId('PRG'), fantome]);
  const bilan = api.rejouerPurgeCoffre();
  verifier('rattrapage : fichier orphelin PURGÉ au démarrage',
    bilan.purges >= 1 && !existsSync(fantome));
  verifier('rattrapage : liste de purge vidée',
    db.all('SELECT * FROM coffre_purge_en_attente').length === 0);
}

// ============================================================
// 10. FICHE NON-ÉLÈVE : autorisée (candidats = élèves seulement)
// ============================================================
{
  const intervenant = api.appeler('createPersonne', { donneesPersonne: {
    prenom: 'Marc', nom: 'Ancien', typePersonne: 'INTERVENANT_EXT',
    roleApp: 'TECHNICIEN' } }, referent);
  const resultat = api.appeler('mettreAuCoffre',
    { personnelIds: [intervenant.id],
      phrase: 'toute nouvelle phrase du coffre',
      options: { annee: 2026 } }, referent);
  verifier('fiche non-élève : mise à l\'abri AUTORISÉE (pseudonyme suivant)',
    resultat.misAuCoffre[0].pseudonyme === 'Élève 2026-03');
  verifier('fiche non-élève : jamais dans les candidats pré-cochés',
    !api.appeler('etatCoffre', {}, referent).candidats
      .includes(intervenant.id));
}

// ------------------------------------------------------------
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [coffre serveur E2b]`);
process.exit(nbEchecs === 0 ? 0 : 1);
