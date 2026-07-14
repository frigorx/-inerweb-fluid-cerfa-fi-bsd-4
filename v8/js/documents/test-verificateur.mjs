// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test du vérificateur autonome de dossier scellé (brique ④).
// Exécution : node v8/js/documents/test-verificateur.mjs
//
// Le NOYAU embarqué dans 99-VERIFICATEUR.html est évalué TEL QUEL
// (new Function sur NOYAU_SOURCE) : ce qui est prouvé ici est
// exactement le code qui part dans chaque archive.
// Volets : archive saine (tout conforme, empreinte globale identique
// à celle du scellement ET à un recalcul node:crypto indépendant),
// falsifications (octet altéré, fichier manquant, fichier inattendu,
// entrée compressée illisible), manifeste, page HTML (autonomie,
// français), certificat (empreinte, échappement), et dossier RÉEL
// (dossier machine du DemoStore vérifié de bout en bout).
// Node ≥ 18, sans DOM.
// ============================================================

import { createHash } from 'node:crypto';
import {
  NOYAU_SOURCE, construireVerificateurHtml, construireCertificatHtml
} from './verificateur.js';
import { assemblerDossier } from './dossier-commun.js';
import { creerZip } from '../core/zip.js';

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

// Évaluation du noyau : exactement la source embarquée dans le HTML.
const fabriqueNoyau = new Function(
  `${NOYAU_SOURCE}
   return { analyserZip, analyserManifeste, calculerSha256Hex, verifierArchive };`);
const noyau = fabriqueNoyau();

const enOctets = async (blob) => blob instanceof Uint8Array
  ? blob : new Uint8Array(await blob.arrayBuffer());

const shaNode = (octets) =>
  createHash('sha256').update(octets).digest('hex');

// ============================================================
// A. Archive saine
// ============================================================
console.log('--- A. archive saine ---');

const ENTREES = [
  { nom: '02-SYNTHESE.csv', contenu: 'Champ;Valeur\r\nMarqueur;MARQUEUR-UNIQUE-12345\r\n' },
  { nom: '03-NOTES.txt', contenu: 'Texte accentué : contrôle d’étanchéité.\r\n' },
  { nom: 'preuves/binaire.bin', contenu: new Uint8Array([0, 1, 2, 250, 251, 252]) }
];
const dossier = await assemblerDossier({
  entreesData: ENTREES,
  titre: 'DOSSIER DE TEST — VÉRIFICATEUR',
  lignesInfos: ['Machine : TEST'],
  nomFichier: 'dossier-test.zip',
  maintenant: new Date('2026-07-13T10:00:00')
});
const octetsZip = await enOctets(dossier.blob);

verifier('assemblerDossier embarque 99-VERIFICATEUR.html (nbDocuments = 6)',
  dossier.nbDocuments === 6);
verifier('assemblerDossier rend le titre (pour le certificat)',
  dossier.titre === 'DOSSIER DE TEST — VÉRIFICATEUR');

{
  const rapport = await noyau.verifierArchive(octetsZip);
  verifier('empreinte globale du noyau = empreinte du scellement',
    rapport.empreinteGlobale === dossier.empreinte);
  verifier('empreinte globale = recalcul node:crypto indépendant',
    rapport.empreinteGlobale === shaNode(octetsZip));
  verifier('archive saine : intégrité interne confirmée',
    rapport.integriteInterne === true && rapport.manquants.length === 0);
  verifier('les 4 fichiers manifestés sont CONFORMES (sommaire + 3 données)',
    rapport.nbConformes === 4);
  const etats = Object.fromEntries(rapport.fichiers.map((f) => [f.nom, f.etat]));
  verifier('manifeste et vérificateur : scellés par l’empreinte globale',
    etats['01-EMPREINTES-SHA256.txt'] === 'SCELLE_GLOBAL'
    && etats['99-VERIFICATEUR.html'] === 'SCELLE_GLOBAL');
  verifier('le binaire du sous-dossier est vérifié aussi',
    etats['preuves/binaire.bin'] === 'CONFORME');
}

{
  const entrees = noyau.analyserZip(octetsZip);
  const verificateur = entrees.find((e) => e.nom === '99-VERIFICATEUR.html');
  const htmlEmbarque = new TextDecoder().decode(verificateur.octets);
  verifier('le HTML embarqué est EXACTEMENT construireVerificateurHtml()',
    htmlEmbarque === construireVerificateurHtml());
}

// ============================================================
// B. Falsifications
// ============================================================
console.log('--- B. falsifications ---');

{
  // Un octet altéré dans un fichier scellé → ALTERE + globale différente.
  const falsifie = new Uint8Array(octetsZip);
  const marqueur = new TextEncoder().encode('MARQUEUR-UNIQUE-12345');
  const position = Buffer.from(falsifie).indexOf(Buffer.from(marqueur));
  verifier('le marqueur est bien stocké en clair dans le ZIP (méthode stored)',
    position > 0);
  falsifie[position] ^= 0xff;
  const rapport = await noyau.verifierArchive(falsifie);
  const synthese = rapport.fichiers.find((f) => f.nom === '02-SYNTHESE.csv');
  verifier('octet altéré : le fichier touché est signalé ALTERE',
    synthese.etat === 'ALTERE' && rapport.nbAlteres === 1
    && rapport.integriteInterne === false);
  verifier('octet altéré : l’empreinte globale change',
    rapport.empreinteGlobale !== dossier.empreinte);
  verifier('octet altéré : les autres fichiers restent conformes',
    rapport.fichiers.find((f) => f.nom === '03-NOTES.txt').etat === 'CONFORME');
}

{
  // Fichier MANQUANT : zip reconstruit sans une entrée pourtant manifestée.
  const entrees = noyau.analyserZip(octetsZip);
  const sansNotes = entrees.filter((e) => e.nom !== '03-NOTES.txt')
    .map((e) => ({ nom: e.nom, contenu: e.octets }));
  const zipAmpute = creerZip(sansNotes, new Date('2026-07-13T10:00:00'));
  const rapport = await noyau.verifierArchive(await enOctets(zipAmpute));
  verifier('fichier manquant : signalé, intégrité interne rompue',
    rapport.manquants.length === 1 && rapport.manquants[0] === '03-NOTES.txt'
    && rapport.integriteInterne === false);
}

{
  // Fichier INATTENDU : ajouté après scellement, absent du manifeste.
  const entrees = noyau.analyserZip(octetsZip)
    .map((e) => ({ nom: e.nom, contenu: e.octets }));
  entrees.push({ nom: 'zz-intrus.txt', contenu: 'glissé après coup' });
  const zipGonfle = creerZip(entrees, new Date('2026-07-13T10:00:00'));
  const rapport = await noyau.verifierArchive(await enOctets(zipGonfle));
  const intrus = rapport.fichiers.find((f) => f.nom === 'zz-intrus.txt');
  verifier('fichier inattendu : signalé INATTENDU, intégrité interne rompue',
    intrus.etat === 'INATTENDU' && rapport.nbInattendus === 1
    && rapport.integriteInterne === false);
}

{
  // Entrée COMPRESSÉE (méthode ≠ 0) : ILLISIBLE, sans couler le rapport.
  // On patche la méthode (u16) dans l'en-tête LOCAL (+8) et CENTRAL (+10)
  // de 03-NOTES.txt.
  const patche = new Uint8Array(octetsZip);
  const nomCible = new TextEncoder().encode('03-NOTES.txt');
  const tampon = Buffer.from(patche);
  let corrige = 0;
  let depuis = 0;
  while (true) {
    const posNom = tampon.indexOf(Buffer.from(nomCible), depuis);
    if (posNom < 0) break;
    depuis = posNom + 1;
    const posLocale = posNom - 30;   // en-tête local : nom à +30
    const posCentrale = posNom - 46; // en-tête central : nom à +46
    if (posLocale >= 0 && tampon.readUInt32LE(posLocale) === 0x04034b50) {
      patche[posLocale + 8] = 8; patche[posLocale + 9] = 0; corrige += 1;
    }
    if (posCentrale >= 0 && tampon.readUInt32LE(posCentrale) === 0x02014b50) {
      patche[posCentrale + 10] = 8; patche[posCentrale + 11] = 0; corrige += 1;
    }
  }
  verifier('patch de méthode appliqué aux 2 en-têtes (local + central)',
    corrige === 2);
  const rapport = await noyau.verifierArchive(patche);
  const notes = rapport.fichiers.find((f) => f.nom === '03-NOTES.txt');
  verifier('entrée compressée : ILLISIBLE signalé, le reste vérifié quand même',
    notes.etat === 'ILLISIBLE' && rapport.nbIllisibles === 1
    && rapport.integriteInterne === false
    && rapport.fichiers.find((f) => f.nom === '02-SYNTHESE.csv').etat === 'CONFORME');
}

{
  // Pas un ZIP / pas un dossier scellé : erreurs françaises claires.
  let messageNonZip = '';
  try { await noyau.verifierArchive(new TextEncoder().encode('bonjour, pas un zip du tout, vraiment pas')); }
  catch (e) { messageNonZip = e.message; }
  verifier('fichier non-ZIP : erreur claire',
    messageNonZip.includes('archive ZIP'));

  const zipSansManifeste = creerZip(
    [{ nom: 'seul.txt', contenu: 'rien' }], new Date('2026-07-13T10:00:00'));
  let messageSansManifeste = '';
  try { await noyau.verifierArchive(await enOctets(zipSansManifeste)); }
  catch (e) { messageSansManifeste = e.message; }
  verifier('ZIP sans manifeste : erreur « pas un dossier scellé »',
    messageSansManifeste.includes('dossier scellé'));
}

// ============================================================
// B2. Archives FORGÉES hostiles (revue adversariale)
// ============================================================
console.log('--- B2. archives forgées hostiles ---');

/** Position de l'EOCD (signature 0x06054b50) cherchée depuis la fin. */
function trouverEocd(octets) {
  for (let i = octets.length - 22; i >= 0; i -= 1) {
    if (octets[i] === 0x50 && octets[i + 1] === 0x4b
      && octets[i + 2] === 0x05 && octets[i + 3] === 0x06) return i;
  }
  return -1;
}

{
  // Décalage du répertoire central pointant HORS du fichier.
  const forge = new Uint8Array(octetsZip);
  const eocd = trouverEocd(forge);
  verifier('EOCD localisé pour le forgeage', eocd > 0);
  forge[eocd + 16] = 0xf0; forge[eocd + 17] = 0xff;
  forge[eocd + 18] = 0xff; forge[eocd + 19] = 0x7f;
  let message = '';
  try { await noyau.verifierArchive(forge); } catch (e) { message = e.message; }
  verifier('décalage de répertoire hors bornes : rejet propre, jamais un faux « conforme »',
    message.includes('corrompu'), `message = ${message}`);
}

{
  // Nombre d'entrées menteur (60 000) : garde anti-abus AVANT tout hachage.
  const forge = new Uint8Array(octetsZip);
  const eocd = trouverEocd(forge);
  forge[eocd + 10] = 0x60; forge[eocd + 11] = 0xea; // 60000
  let message = '';
  try { await noyau.verifierArchive(forge); } catch (e) { message = e.message; }
  verifier('60 000 entrées déclarées : refus « archive anormale » (anti-gel du navigateur)',
    message.includes('anormale'), `message = ${message}`);
}

{
  // Cumul de tailles déclarées > 1 Go : refus avant hachage.
  const forge = new Uint8Array(octetsZip);
  const nomCible = new TextEncoder().encode('03-NOTES.txt');
  const tampon = Buffer.from(forge);
  let posNom = -1;
  let depuis = 0;
  while (true) {
    const p = tampon.indexOf(Buffer.from(nomCible), depuis);
    if (p < 0) break;
    depuis = p + 1;
    if (p >= 46 && tampon.readUInt32LE(p - 46) === 0x02014b50) { posNom = p; break; }
  }
  verifier('en-tête central de la cible localisé', posNom > 0);
  const posCentrale = posNom - 46;
  forge[posCentrale + 20] = 0xff; forge[posCentrale + 21] = 0xff;
  forge[posCentrale + 22] = 0xff; forge[posCentrale + 23] = 0x7f; // ~2 Go déclarés
  let message = '';
  try { await noyau.verifierArchive(forge); } catch (e) { message = e.message; }
  verifier('plus de 1 Go déclaré : refus « archive anormale »',
    message.includes('1 Go'), `message = ${message}`);
}

{
  // DOUBLON : deux entrées du même nom, l'une conforme, l'autre altérée —
  // aucune combinaison ne doit passer en « conforme ».
  const empreinteBon = await noyau.calculerSha256Hex(
    new TextEncoder().encode('bon contenu'));
  const manifeste = 'EMPREINTES SHA-256 — DOUBLON\r\n----\r\n'
    + empreinteBon + '  a.csv\r\n';
  for (const ordre of [['bon contenu', 'contenu falsifié'],
    ['contenu falsifié', 'bon contenu']]) {
    const zipDouble = creerZip([
      { nom: '01-EMPREINTES-SHA256.txt', contenu: manifeste },
      { nom: 'a.csv', contenu: ordre[0] },
      { nom: 'a.csv', contenu: ordre[1] }
    ], new Date('2026-07-13T10:00:00'));
    const rapport = await noyau.verifierArchive(await enOctets(zipDouble));
    verifier(`doublon (« ${ordre[0].slice(0, 3)}… » puis « ${ordre[1].slice(0, 3)}… ») : l'altéré est signalé, intégrité rompue`,
      rapport.fichiers.some((f) => f.nom === 'a.csv' && f.etat === 'ALTERE')
      && rapport.integriteInterne === false);
  }
}

{
  // Manifeste PRÉSENT mais compressé : message spécifique (pas « introuvable »).
  const forge = new Uint8Array(octetsZip);
  const nomCible = new TextEncoder().encode('01-EMPREINTES-SHA256.txt');
  const tampon = Buffer.from(forge);
  let depuis = 0;
  let corrige = 0;
  while (true) {
    const p = tampon.indexOf(Buffer.from(nomCible), depuis);
    if (p < 0) break;
    depuis = p + 1;
    if (p >= 30 && tampon.readUInt32LE(p - 30) === 0x04034b50) {
      forge[p - 30 + 8] = 8; forge[p - 30 + 9] = 0; corrige += 1;
    }
    if (p >= 46 && tampon.readUInt32LE(p - 46) === 0x02014b50) {
      forge[p - 46 + 10] = 8; forge[p - 46 + 11] = 0; corrige += 1;
    }
  }
  let message = '';
  try { await noyau.verifierArchive(forge); } catch (e) { message = e.message; }
  verifier('manifeste compressé : message spécifique « COMPRESSÉ », pas « introuvable »',
    corrige >= 2 && message.includes('COMPRESSÉ'), `message = ${message}`);
}

// ============================================================
// C. Manifeste, page HTML, certificat
// ============================================================
console.log('--- C. manifeste, page, certificat ---');

{
  const attendus = noyau.analyserManifeste(
    'EMPREINTES SHA-256 — TITRE\r\n====\r\n\r\nBla bla explication.\r\n----\r\n'
    + 'a'.repeat(64) + '  fichier-un.csv\r\n'
    + 'b'.repeat(64) + '  sous-dossier/fichier deux.pdf\r\n');
  verifier('analyserManifeste : 2 entrées, en-têtes ignorés, espaces dans les noms acceptés',
    attendus.length === 2 && attendus[0].nom === 'fichier-un.csv'
    && attendus[1].nom === 'sous-dossier/fichier deux.pdf'
    && attendus[1].empreinte === 'b'.repeat(64));
}

{
  const html = construireVerificateurHtml();
  verifier('page : autonome (aucune ressource externe http/https)',
    !/src\s*=\s*["']https?:|href\s*=\s*["']https?:|@import|url\(/i.test(html));
  verifier('page : française et identifiée',
    html.includes('Vérificateur de dossier scellé')
    && html.includes('lang="fr"') && html.includes('charset="utf-8"'));
  verifier('page : embarque le noyau et le câblage',
    html.includes('function verifierArchive')
    && html.includes('zone-depot') && html.includes('empreinte-reference'));
  verifier('page : les noms de fichiers passent par textContent (donnée hostile)',
    html.includes('nom.textContent = f.nom'));
  verifier('page : le verdict interne vert porte la réserve d’authenticité (revue)',
    html.includes("ne prouve PAS l'authenticité"));
}

{
  const certificat = construireCertificatHtml({
    titre: 'Dossier de fuite — Machine <XSS> & co',
    nomFichier: 'dossier-fuite-TEST-2026-06-18.zip',
    empreinte: 'c'.repeat(64),
    nbDocuments: 6,
    dateTexte: '13/07/2026 à 15:00'
  });
  verifier('certificat : porte l’empreinte, le nom et la date',
    certificat.includes('c'.repeat(64))
    && certificat.includes('dossier-fuite-TEST-2026-06-18.zip')
    && certificat.includes('13/07/2026 à 15:00'));
  verifier('certificat : titre ÉCHAPPÉ (pas de balise interprétable)',
    !certificat.includes('<XSS>')
    && certificat.includes('&lt;XSS&gt; &amp; co'));
  verifier('certificat : consignes de vérification présentes',
    certificat.includes('99-VERIFICATEUR.html')
    && certificat.includes('Get-FileHash'));
}

// ============================================================
// D. Dossier RÉEL (DemoStore) de bout en bout
// ============================================================
console.log('--- D. dossier réel (DemoStore) ---');

{
  const { creerStore } = await import('../data/datastore.js');
  const { genererDossierMachine } = await import('./dossier-machine.js');
  const store = await creerStore();
  await store.init();
  const machines = await store.getMachines();
  const reel = await genererDossierMachine(store, machines[0].id);
  const octetsReel = await enOctets(reel.blob);
  const rapport = await noyau.verifierArchive(octetsReel);
  verifier('dossier machine réel : intégrité interne confirmée par le noyau',
    rapport.integriteInterne === true);
  verifier('dossier machine réel : empreinte du noyau = empreinte du scellement',
    rapport.empreinteGlobale === reel.empreinte);
  verifier('dossier machine réel : le vérificateur est à bord',
    rapport.fichiers.some((f) => f.nom === '99-VERIFICATEUR.html'
      && f.etat === 'SCELLE_GLOBAL'));
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
