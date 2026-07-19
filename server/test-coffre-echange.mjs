// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Coffre des identités — brique E2c (lot E2, RGPD) : l'ALLER-RETOUR
// export/import du coffre, attaques TIRÉES sur bases JETABLES :
// le test du BLOQUANT n°1 de la conception — export d'une base au coffre,
// import sur une base VIERGE, consultation avec la phrase d'origine → OK.
// Plus : grep borné (aucun nom à l'abri), enveloppe falsifiée/illisible,
// identité orpheline, coffre SIMULÉ démo rejeté en réel, refus protecteur
// (poste au coffre + fichier sans coffre), round-trip réel→démo→réel SANS
// perte, compteurs monotones transportés.
// Exécution : node server/test-coffre-echange.mjs — bases JETABLES.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creerDemoStore } from '../v8/js/data/demo-store.js';

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
function attendreRejet(libelle, fn, extrait) {
  try {
    fn();
    verifier(libelle, false, 'aucune erreur levée');
  } catch (erreur) {
    verifier(libelle, String(erreur.message).includes(extrait),
      `message = « ${erreur.message} »`);
  }
}

const referent = { role: 'REFERENT' };
const PHRASE = 'girafe pantoufle ouragan mirabelle';

// ============================================================
// BASE A : décor complet + mise à l'abri + export
// ============================================================
const dossierA = mkdtempSync(join(tmpdir(), 'inerweb-fluide-echange-a-'));
mkdirSync(join(dossierA, 'data'));
db.ouvrir(join(dossierA, 'data', 'test.db'));
api.appeler('init', {}, referent);

const eleve = api.appeler('createPersonne', { donneesPersonne: {
  prenom: 'Nora', nom: 'Valette', typePersonne: 'ELEVE', roleApp: 'ELEVE',
  email: 'nora@lycee.fr', numAttestationAptitude: 'ATT-77' } }, referent);
const octetsScan = Buffer.from('%PDF-1.4\n%scan de Nora\n%%EOF');
api.appeler('ajouterPieceJointe', { donneesPj: {
  entiteType: 'personne', entiteId: eleve.id, categorie: 'AUTRE',
  nomFichier: 'scan-nora.pdf', mimeType: 'application/pdf',
  base64: octetsScan.toString('base64') } }, referent);
api.appeler('desactiverPersonne', { id: eleve.id, par: null }, referent);
api.appeler('mettreAuCoffre',
  { personnelIds: [eleve.id], phrase: PHRASE,
    options: { annee: 2026 } }, referent);

const exportA = api.appeler('exporterJSON', {}, referent);
{
  const paquet = JSON.parse(exportA);
  verifier('export : le coffre voyage (enveloppes + configuration + compteurs)',
    paquet.donnees.coffreIdentites.length === 1
    && paquet.donnees.coffreConfig && paquet.donnees.coffreConfig.sel
    && paquet.donnees.coffreConfig.temoin
    && paquet.donnees.coffreCompteurs['2026'] === 1
    && paquet.donnees.coffreCree === true);
  // Grep BORNÉ (leçon de la revue de conception : le journal historique et
  // les champs scellés peuvent légitimement porter des noms — ici le décor
  // n'en a pas, mais on borne quand même aux collections promises).
  const bornees = JSON.stringify({
    personnel: paquet.donnees.personnel,
    piecesJointes: paquet.donnees.piecesJointes,
    coffreIdentites: paquet.donnees.coffreIdentites
  });
  verifier('export : AUCUN nom de la personne à l\'abri dans personnel/PJ/coffre',
    !bornees.includes('Valette') && !bornees.includes('Nora')
    && !bornees.includes('nora@lycee.fr'));
}

// Refus protecteur : le poste (A) a un coffre, le fichier n'en a pas.
{
  const paquet = JSON.parse(exportA);
  paquet.donnees.coffreIdentites = [];
  paquet.donnees.coffreConfig = null;
  attendreRejet('poste au coffre + fichier SANS coffre → refus protecteur',
    () => api.appeler('importerJSON',
      { texte: JSON.stringify(paquet) }, referent),
    'Restaurez-les');
}

// ============================================================
// BASE B VIERGE : le test du BLOQUANT n°1
// ============================================================
db.fermer();
const dossierB = mkdtempSync(join(tmpdir(), 'inerweb-fluide-echange-b-'));
mkdirSync(join(dossierB, 'data'));
db.ouvrir(join(dossierB, 'data', 'test.db'));
api.appeler('init', {}, referent);

verifier('base B vierge : import de l\'export A adopté',
  api.appeler('importerJSON', { texte: exportA }, referent) === true);
{
  const identite = api.appeler('consulterIdentiteCoffre',
    { personnelId: eleve.id, phrase: PHRASE,
      motif: 'preuve après sinistre' }, referent);
  verifier('LE BLOQUANT N°1 EST FERMÉ : consultation sur base NEUVE avec la ' +
    'phrase d\'origine',
    identite.nom === 'Valette' && identite.prenom === 'Nora'
    && identite.email === 'nora@lycee.fr');
  const fiche = api.appeler('restaurerIdentiteCoffre',
    { personnelId: eleve.id, phrase: PHRASE,
      motif: 'restauration après sinistre' }, referent);
  verifier('restauration COMPLÈTE après aller-retour : fiche + PJ',
    fiche.nom === 'Valette');
  const pjs = api.appeler('listerPiecesJointes',
    { entiteType: 'personne', entiteId: eleve.id }, referent);
  const contenu = pjs.length
    ? api.appeler('obtenirPieceJointe', { id: pjs[0].id }, referent) : null;
  verifier('restauration : le scan re-matérialisé octet pour octet',
    contenu && Buffer.from(contenu.blob, 'base64').equals(octetsScan));
  // Compteur transporté : une nouvelle mise à l'abri prend le numéro SUIVANT.
  api.appeler('mettreAuCoffre',
    { personnelIds: [eleve.id], phrase: PHRASE,
      options: { annee: 2026 } }, referent);
  verifier('compteur MONOTONE transporté : pseudonyme 2026-02 (jamais -01)',
    api.appeler('etatCoffre', {}, referent).identites[0]
      .pseudonyme === 'Élève 2026-02');
  api.appeler('restaurerIdentiteCoffre',
    { personnelId: eleve.id, phrase: PHRASE, motif: 'retour au décor' },
    referent);
}

// ============================================================
// ATTAQUES sur le fichier
// ============================================================
{
  // Enveloppe SANS le repère réel → rejet à l'import (illisible).
  const paquet = JSON.parse(exportA);
  paquet.donnees.coffreIdentites[0].enveloppe =
    Buffer.from('pas une enveloppe du tout').toString('base64');
  attendreRejet('enveloppe SANS repère IWF-COFFRE-1 → import refusé',
    () => api.appeler('importerJSON',
      { texte: JSON.stringify(paquet) }, referent),
    'enveloppe du coffre illisible');
}
{
  // Enveloppe au bon repère mais CORROMPUE → l'import passe (rien n'est
  // vérifiable sans la phrase), la consultation échoue PROPREMENT, le
  // registre reste sain.
  const paquet = JSON.parse(exportA);
  const octets = Buffer.from(
    paquet.donnees.coffreIdentites[0].enveloppe, 'base64');
  octets[octets.length - 1] ^= 0xff;
  paquet.donnees.coffreIdentites[0].enveloppe = octets.toString('base64');
  verifier('enveloppe corrompue (repère intact) : l\'import passe',
    api.appeler('importerJSON',
      { texte: JSON.stringify(paquet) }, referent) === true);
  attendreRejet('…mais la consultation échoue PROPREMENT (tag GCM)',
    () => api.appeler('consulterIdentiteCoffre',
      { personnelId: eleve.id, phrase: PHRASE, motif: 'essai' }, referent),
    coffre.MSG_CODE_INCORRECT);
  verifier('…et le registre importé reste SAIN (chaîne verte)',
    api.appeler('verifierChaineHash', {}, referent).ok === true);
  // Retour au monde sain pour la suite.
  api.appeler('importerJSON', { texte: exportA }, referent);
}
{
  // Identité ORPHELINE (personnelId inexistant) → rejet.
  const paquet = JSON.parse(exportA);
  paquet.donnees.coffreIdentites[0] = {
    ...paquet.donnees.coffreIdentites[0],
    personnelId: 'per-inexistant-xyz'
  };
  attendreRejet('identité du coffre ORPHELINE → import refusé',
    () => api.appeler('importerJSON',
      { texte: JSON.stringify(paquet) }, referent),
    'orpheline');
}

// ============================================================
// DÉMO : simulation rejetée en réel, transport OPAQUE sans perte
// ============================================================
{
  // Un coffre SIMULÉ démo n'entre jamais en base réelle.
  const demo = creerDemoStore();
  await demo.init();
  const personnelDemo = await demo.getPersonnel();
  const eleveDemo = personnelDemo.find((p) => p.typePersonne === 'ELEVE');
  await demo.desactiverPersonne(eleveDemo.id, null);
  await demo.mettreAuCoffre([eleveDemo.id],
    'phrase d\'exercice de la démonstration', { annee: 2026 });
  const exportDemo = await demo.exporterJSON();
  attendreRejet('coffre SIMULÉ démo → import RÉEL refusé (balise détectée)',
    () => api.appeler('importerJSON', { texte: exportDemo }, referent),
    coffre.MSG_SIMULATION_REJETEE);
}
{
  // Round-trip réel → démo → réel : la démo transporte l'OPAQUE sans perte.
  const demo = creerDemoStore();
  await demo.init();
  verifier('la démo ADOPTE un export réel au coffre (opaque conservé)',
    await demo.importerJSON(exportA) === true);
  let erreurConsultation = null;
  try {
    await demo.consulterIdentiteCoffre(eleve.id, PHRASE, 'essai');
  } catch (erreur) { erreurConsultation = erreur; }
  verifier('en démo, l\'enveloppe réelle répond par le message canonique',
    erreurConsultation
    && erreurConsultation.message === coffre.MSG_CODE_INCORRECT);
  const reExport = await demo.exporterJSON();
  verifier('ré-import RÉEL après passage en démo : rien n\'est perdu',
    api.appeler('importerJSON', { texte: reExport }, referent) === true);
  const identite = api.appeler('consulterIdentiteCoffre',
    { personnelId: eleve.id, phrase: PHRASE,
      motif: 'preuve du round-trip' }, referent);
  verifier('ROUND-TRIP COMPLET : l\'identité se rouvre avec la phrase d\'origine',
    identite.nom === 'Valette' && identite.prenom === 'Nora');
}

// ------------------------------------------------------------
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [coffre échange E2c]`);
process.exit(nbEchecs === 0 ? 0 : 1);
