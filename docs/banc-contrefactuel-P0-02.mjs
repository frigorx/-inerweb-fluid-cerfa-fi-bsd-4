// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// BANC DU CONTREFACTUEL — constat P0-02 de l'audit externe du 25/07/2026
// (« Formation et Officiel partagent les mêmes stocks »).
//
// À QUOI ÇA SERT. Le mémoire `docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md`
// §3.2 conteste la correction demandée par l'audit — rendre la fiche
// Formation INERTE — et il l'appuie sur une mesure. Ce fichier EST cette
// mesure : il monte les deux mondes et imprime ce que chacun produit,
// pour que le lecteur du mémoire n'ait pas à nous croire sur parole.
//
// CE N'EST PAS UNE SUITE DU FILET. Le nom ne commence pas par « test- »,
// donc `outils/lancer-tests.mjs` ne le découvre pas : il ne prouve rien
// sur le logiciel, il REJOUE un scénario. Les preuves du filet sont
// ailleurs (voir plus bas).
//
// USAGE, depuis la racine du dépôt :
//     node docs/banc-contrefactuel-P0-02.mjs inerte
//     node docs/banc-contrefactuel-P0-02.mjs vivant
//
// ⚠️ UN SEUL CAS PAR PROCESSUS, et c'est délibéré : `db.ouvrir` ne remet
// pas l'état du module à zéro, et deux décors joués à la suite dans le
// même processus additionnent leurs bouteilles — le piège a été payé en
// écrivant ce banc, la première version annonçait un stock théorique faux.
//
// ISOLATION : base JETABLE sous <mkdtemp>/data/. Jamais `data/` réel,
// jamais le port 2011 (ce banc n'ouvre aucun port : il appelle l'API en
// direct, comme le font les suites `server/test-*.mjs`).
//
// LE DÉCOR, identique dans les deux cas :
//   · une bouteille de R-134a NEUVE — tare 10 kg, brut 20 kg, donc 10 kg nets ;
//   · une machine de 10 kg nominaux ;
//   · un TP où l'élève charge 2 kg dans la machine : le gaz part
//     RÉELLEMENT, la bouteille pèse physiquement 8 kg nets après le geste ;
//   · le professeur saisit ensuite l'inventaire PHYSIQUE : 8 kg.
//
// CE QUI CHANGE ENTRE LES DEUX CAS :
//   · « inerte » — la fiche Formation n'écrit rien au registre, c'est la
//     correction demandée par l'audit ;
//   · « vivant » — la fiche Formation est validée et bouge la matière,
//     c'est l'état livré.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const db = require(join(import.meta.dirname, '..', 'server', 'db.js'));
const api = require(join(import.meta.dirname, '..', 'server', 'api.js'));

const CAS = process.argv[2];
if (CAS !== 'inerte' && CAS !== 'vivant') {
  console.error('Usage : node docs/banc-contrefactuel-P0-02.mjs inerte|vivant');
  process.exit(2);
}
const INERTE = CAS === 'inerte';

const referent = { role: 'REFERENT' };
const dossier = mkdtempSync(join(tmpdir(), 'iwf-contrefactuel-'));
mkdirSync(join(dossier, 'data'));
db.ouvrir(join(dossier, 'data', 'jetable.db'));
api.appeler('init', {}, referent);

console.log(INERTE
  ? '=== A. La fiche Formation est INERTE (la correction demandée) ==='
  : '=== B. La fiche Formation bouge la matière (l’état livré) ===');

const professeur = api.appeler('createPersonne', { donneesPersonne: {
  prenom: 'Professeur', nom: 'Alpha', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT' } }, referent);
const machine = api.appeler('createMachine', { donneesMachine: {
  designation: 'Banc du contrefactuel', fluide: 'R-134a',
  chargeNominaleKg: 10, operateur: 'Professeur Alpha' } }, referent);
const bouteille = api.appeler('createBouteille', { donneesBouteille: {
  type: 'NEUVE', fluide: 'R-134a', tareKg: 10, masseBruteKg: 20,
  contenanceMaxKg: 25 } }, referent);
console.log(`  bouteille : brut ${bouteille.masseBruteKg} kg, `
  + `net ${bouteille.masseNetteKg} kg`);

if (INERTE) {
  console.log('  le TP a lieu, 2 kg partent dans la machine, '
    + 'et RIEN n’est écrit au registre');
} else {
  const mv = api.appeler('creerMouvement', { donneesMouvement: {
    type: 'CHARGE_APPOINT', machineId: machine.id,
    bouteilleSrcId: bouteille.id, peseeAvantKg: 20, peseeApresKg: 18,
    technicien: 'Élève de CAP', causeMouvement: 'TP charge d’appoint',
    mode: 'FORMATION' } }, referent);
  api.appeler('soumettreMouvement', { id: mv.id }, referent);
  const valide = api.appeler('validerMouvement',
    { id: mv.id, validateurId: professeur.id }, referent);
  console.log(`  fiche Formation validée : ${valide.cerfaNumero} `
    + `(mode ${valide.mode})`);
}

// Le professeur saisit l'inventaire PHYSIQUE réel de fin de période.
const inventaire = api.appeler('saisirInventaire', {
  annee: 2026,
  lignes: [{ fluide: 'R-134a', stockReelKg: 8 }],
  saisiPar: 'Professeur Alpha' }, referent);
const ligne = inventaire.lignes.find((l) => l.fluide === 'R-134a');
console.log(`  inventaire physique : théorique ${ligne.stockTheoriqueKg} kg `
  + `· réel ${ligne.stockReelKg} kg · ecartKg ${ligne.ecartKg}`);

let alerte = false;
for (const a of api.appeler('getAlertes', {}, referent)) {
  if (String(a.titre).includes('balance')) {
    alerte = true;
    console.log(`  ALERTE ${a.niveau} — ${a.titre} — ${a.detail}`);
  }
}
if (!alerte) console.log('  aucune alerte de balance matière');

const officiel = api.appeler('peutPasserEnOfficiel', {}, referent);
const motifs = (officiel.motifs ?? officiel.conditions ?? [])
  .map((m) => (typeof m === 'string' ? m : (m.message ?? m.libelle ?? '')))
  .filter((m) => /balance mati/i.test(m));
if (motifs.length === 0) {
  console.log('  MOTIF OFFICIEL — aucun motif d’écart de balance matière');
} else {
  for (const m of motifs) console.log(`  MOTIF OFFICIEL — ${m}`);
}

// ============================================================
// SORTIE OBSERVÉE LE 26/07/2026 (Windows 11, Node 22) :
//
//   inerte → théorique 10 kg · réel 8 kg · ecartKg -2
//            ALERTE CRITIQUE — Écart de balance matière non justifié
//                            — R-134a · 2026 · écart − 2,00 kg
//            MOTIF OFFICIEL — Écart de balance matière non justifié :
//                             R-134a (2026, − 2,00 kg).
//
//   vivant → théorique 8 kg · réel 8 kg · ecartKg 0
//            aucune alerte de balance matière
//            MOTIF OFFICIEL — aucun motif d’écart de balance matière
//
// OÙ SONT LES PREUVES DU FILET, celles qui tiennent le mécanisme :
//   · `v8/js/data/test-scenario-lot1.mjs` § 6 — inventaire au réel,
//     écart NUL, aucune justification exigée ;
//   · le motif de blocage est écrit par `ecartsNonJustifies()`
//     (`server/api.js`, miroir `v8/js/data/demo-store.js`), l'alerte
//     CRITIQUE par la même source, le seuil de déclenchement est
//     `SEUIL_ECART_KG` = 0,01 kg ;
//   · la condition bloquante correspondante est la n° 4 de
//     `docs/CONDITIONS-BLOCANTES-OFFICIEL.md`.
// ============================================================
