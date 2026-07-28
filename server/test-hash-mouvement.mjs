// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Équivalence stricte des hasseurs de mouvement front ↔ serveur (V9-E3)
// Exécution : node server/test-hash-mouvement.mjs
//
// Le registre local (serveur, node:crypto synchrone) DOIT produire les
// MÊMES empreintes que le registre démo (front, crypto.subtle asynchrone).
// Sans cette égalité, un export démo ne se réimporte pas en local (chaîne
// « forgée ») et réciproquement. Ce test compare les deux hasseurs sur un
// éventail de mouvements — toute dérive de l'un des deux le casse.
// Node ≥ 18, sans DOM.
// ============================================================

import { hasherEcriture, CHAMPS_HASH_MOUVEMENT as CHAMPS_FRONT,
  CHAMPS_HASH_MOUVEMENT_V2 as CHAMPS_FRONT_V2,
  empreinteListeTriee as empreinteListeFront,
  chaineCanoniqueSignature as canoniqueFront }
  from '../v8/js/core/utils.js';
import hm from './hash-mouvement.js';

const { hasherMouvement, CHAMPS_HASH_MOUVEMENT, CHAMPS_HASH_MOUVEMENT_V2,
  empreinteListeTriee, chaineCanoniqueSignature } = hm;

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

// Les deux listes de champs doivent être identiques, dans le même ordre :
// si le front ajoute un champ au hash, le serveur DOIT suivre (sinon dérive).
verifier('les 18 champs hachés du serveur = ceux du front, même ordre',
  JSON.stringify(CHAMPS_HASH_MOUVEMENT) === JSON.stringify(CHAMPS_FRONT),
  `serveur=${CHAMPS_HASH_MOUVEMENT.length} front=${CHAMPS_FRONT.length}`);

// Lot C (C2) : la liste v2 aussi — et elle DOIT être exactement la v1
// suivie des 9 champs renforcés (l'ordre est la préimage).
verifier('les 27 champs v2 du serveur = ceux du front, même ordre',
  JSON.stringify(CHAMPS_HASH_MOUVEMENT_V2) === JSON.stringify(CHAMPS_FRONT_V2),
  `serveur=${CHAMPS_HASH_MOUVEMENT_V2.length} front=${CHAMPS_FRONT_V2.length}`);
verifier('la liste v2 = la liste v1 + les 9 champs renforcés, v1 en tête',
  CHAMPS_HASH_MOUVEMENT_V2.length === 27 &&
  JSON.stringify(CHAMPS_HASH_MOUVEMENT_V2.slice(0, 18)) ===
    JSON.stringify(CHAMPS_HASH_MOUVEMENT) &&
  JSON.stringify(CHAMPS_HASH_MOUVEMENT_V2.slice(18)) === JSON.stringify([
    'prpFige', 'cerfaNumero', 'executeParId', 'superviseurId',
    'responsableRegistreId', 'outilsFiges', 'hashSignatures',
    'hashPiecesJointes', 'hashPdfFinal']));

// Éventail de mouvements représentatifs : nominal, champs null, controle
// imbriqué (avec et sans controleId), quantité négative, hashPrecedent null
// et non-null, contre-écriture, caractères accentués.
const MOUVEMENTS = [
  { titre: 'charge nominale',
    mvt: { id: 'mvt-a1', numero: 'FORM-2026-0001', date: '2026-07-04',
      mode: 'FORMATION', type: 'CHARGE_APPOINT', machineId: 'mac-1',
      fluide: 'R-410A', quantiteKg: 2, peseeAvantKg: 20, peseeApresKg: 18,
      bouteilleSrcId: 'bou-1', bouteilleDstId: null,
      causeMouvement: 'Complément de charge', controle: null,
      technicien: 'Frédéric Hénninot', validateurId: 'per-ref',
      contreEcritureDe: null, motif: null },
    prec: null },
  { titre: 'récupération, quantité négative, hashPrecedent non-null',
    mvt: { id: 'mvt-b2', numero: 'FI-2026-0002', date: '2026-01-31',
      mode: 'OFFICIEL', type: 'RECUPERATION_MAINTENANCE', machineId: 'mac-2',
      fluide: 'R-32', quantiteKg: -1.5, peseeAvantKg: 5, peseeApresKg: 6.5,
      bouteilleSrcId: null, bouteilleDstId: 'bou-r',
      causeMouvement: 'Maintenance', controle: null,
      technicien: 'Un technicien extérieur', validateurId: 'per-ens',
      contreEcritureDe: null, motif: null },
    prec: 'a'.repeat(64) },
  { titre: 'controle imbriqué CONFORME (avant CR-3, sans controleId)',
    mvt: { id: 'mvt-c3', numero: 'FORM-2026-0003', date: '2026-07-04',
      mode: 'FORMATION', type: 'CHARGE_APPOINT', machineId: 'mac-3',
      fluide: 'R-134a', quantiteKg: 0.3, peseeAvantKg: 10, peseeApresKg: 9.7,
      bouteilleSrcId: 'bou-2', bouteilleDstId: null, causeMouvement: null,
      controle: { statutControle: 'CONFORME', detecteurId: 'out-d' },
      technicien: 'Testeur', validateurId: 'per-ref',
      contreEcritureDe: null, motif: null },
    prec: 'b'.repeat(64) },
  { titre: 'controle imbriqué avec controleId (après CR-3, ordre des clés)',
    mvt: { id: 'mvt-d4', numero: 'FORM-2026-0004', date: '2026-07-04',
      mode: 'FORMATION', type: 'CHARGE_APPOINT', machineId: 'mac-3',
      fluide: 'R-134a', quantiteKg: 0.3, peseeAvantKg: 10, peseeApresKg: 9.7,
      bouteilleSrcId: 'bou-2', bouteilleDstId: null, causeMouvement: null,
      controle: { statutControle: 'FUITE', detecteurId: 'out-d',
        controleId: 'ctl-9' },
      technicien: 'Testeur', validateurId: 'per-ref',
      contreEcritureDe: null, motif: null },
    prec: 'c'.repeat(64) },
  { titre: 'contre-écriture (motif, pesées permutées)',
    mvt: { id: 'mvt-e5', numero: 'FI-2026-0005', date: '2026-07-04',
      mode: 'OFFICIEL', type: 'CHARGE_APPOINT', machineId: 'mac-2',
      fluide: 'R-32', quantiteKg: -2, peseeAvantKg: 18, peseeApresKg: 20,
      bouteilleSrcId: 'bou-1', bouteilleDstId: null,
      causeMouvement: 'Complément', controle: null, technicien: 'Référent',
      validateurId: 'per-ref', contreEcritureDe: 'mvt-a1',
      motif: 'Erreur de bouteille — régularisation' },
    prec: 'd'.repeat(64) },
  { titre: 'objet quasi vide (tous champs absents → null)',
    mvt: { id: 'mvt-f6' },
    prec: null },
  { titre: 'transfert (positif, deux bouteilles)',
    mvt: { id: 'mvt-g7', numero: 'FORM-2026-0006', date: '2026-12-31',
      mode: 'FORMATION', type: 'TRANSFERT', machineId: null, fluide: 'R-410A',
      quantiteKg: 2, peseeAvantKg: 11, peseeApresKg: 9,
      bouteilleSrcId: 'bou-2', bouteilleDstId: 'bou-3', causeMouvement: null,
      controle: null, technicien: 'Testeur', validateurId: 'per-ens',
      contreEcritureDe: null, motif: null },
    prec: 'e'.repeat(64) }
];

for (const { titre, mvt, prec } of MOUVEMENTS) {
  const attendu = await hasherEcriture(mvt, prec);        // front (subtle)
  const obtenu = hasherMouvement(mvt, prec);              // serveur (node)
  verifier(`hash identique front/serveur — ${titre}`,
    obtenu === attendu, `front=${attendu.slice(0, 12)}… serveur=${obtenu.slice(0, 12)}…`);
  verifier(`empreinte hexadécimale 64 — ${titre}`, /^[0-9a-f]{64}$/.test(obtenu));
}

// La chaîne : hashPrecedent null (front, rendu '') doit égaler '' (serveur).
{
  const mvt = MOUVEMENTS[0].mvt;
  verifier('hashPrecedent null et hashPrecedent "" donnent la même empreinte',
    hasherMouvement(mvt, null) === hasherMouvement(mvt, '')
    && hasherMouvement(mvt, null) === await hasherEcriture(mvt, null));
}

// Sensibilité : changer un champ haché change l'empreinte ; changer un champ
// HORS empreinte (statut) ne la change PAS.
{
  const base = MOUVEMENTS[0].mvt;
  const quantiteChangee = { ...base, quantiteKg: 2.001 };
  verifier('modifier quantiteKg (dans l’empreinte) change le hash',
    hasherMouvement(base, null) !== hasherMouvement(quantiteChangee, null));
  const statutAjoute = { ...base, statut: 'ANNULE' };
  verifier('ajouter statut (hors empreinte) ne change PAS le hash',
    hasherMouvement(base, null) === hasherMouvement(statutAjoute, null)
    && hasherMouvement(statutAjoute, null) === await hasherEcriture(statutAjoute, null));
}

// ============================================================
// Lot C (C2) — empreinte RENFORCÉE v2 : non-régression v1 BIT À BIT
// (empreintes CONNUES figées ici), parité v2, chaîne mixte, helpers.
// ============================================================

// 1. NON-RÉGRESSION v1 : ces empreintes ont été calculées et FIGÉES à la
// livraison de la brique C2 (18/07/2026). Si l'une d'elles change, le
// hasseur a dérivé et TOUTES les chaînes existantes de Franck casseraient :
// ce test est le verrou. NE JAMAIS les recalculer « parce que le test est
// rouge » — un rouge ici est une régression, pas une mise à jour.
{
  const attenduA = '482ff0ab5bd16a3cfbe7d06313a51bcd57b403117157f75c5200a5abf4ac0c46';
  const attenduB = 'e4a45502f7a3d1e794129508157c3f294e2a10cc7751b6dfd595abadc6b9724d';
  const obtenuA = hasherMouvement(MOUVEMENTS[0].mvt, null);
  const obtenuB = hasherMouvement(MOUVEMENTS[4].mvt, 'd'.repeat(64));
  verifier('empreinte v1 CONNUE (charge nominale) inchangée bit à bit',
    obtenuA === attenduA && await hasherEcriture(MOUVEMENTS[0].mvt, null) === attenduA,
    `obtenu=${obtenuA}`);
  verifier('empreinte v1 CONNUE (contre-écriture chaînée) inchangée bit à bit',
    obtenuB === attenduB, `obtenu=${obtenuB}`);
}

// 2. Vecteur v2 CONNU (figé à la livraison C2) + parité front/serveur.
const MVT_V2 = { id: 'mvt-v2', numero: 'FI-2026-0100', date: '2026-08-01',
  mode: 'OFFICIEL', type: 'CHARGE_APPOINT', machineId: 'mac-9',
  fluide: 'R-32', quantiteKg: 1.2, peseeAvantKg: 12, peseeApresKg: 10.8,
  bouteilleSrcId: 'bou-9', bouteilleDstId: null,
  causeMouvement: 'Fuite réparée',
  controle: { statutControle: 'CONFORME', detecteurId: 'out-d' },
  technicien: 'Référent Signature', validateurId: 'per-ref',
  contreEcritureDe: null, motif: null,
  versionEmpreinte: 2, prpFige: 675, cerfaNumero: 'FI-2026-0100',
  executeParId: 'per-eleve', superviseurId: 'per-prof',
  responsableRegistreId: 'per-ref',
  outilsFiges: ['out-b=CONFORME', 'out-d=EXPIRE'],
  hashSignatures: 'a'.repeat(64), hashPiecesJointes: 'b'.repeat(64),
  hashPdfFinal: null };
{
  const attendu = '634598ef17b68341605ba72cf91a2fcd317ebf4885e48810f50c5432c4891058';
  const obtenu = hasherMouvement(MVT_V2, 'a'.repeat(64));
  verifier('empreinte v2 CONNUE figée + identique front/serveur',
    obtenu === attendu &&
    await hasherEcriture(MVT_V2, 'a'.repeat(64)) === attendu,
    `obtenu=${obtenu}`);

  // v2 avec champs renforcés à null (contre-écriture typique hors listes).
  const v2Nulls = { ...MOUVEMENTS[0].mvt, versionEmpreinte: 2 };
  verifier('v2 aux champs renforcés null : identique front/serveur',
    hasherMouvement(v2Nulls, null) === await hasherEcriture(v2Nulls, null));
}

// 2 bis. Lot 1 / C2 (27/07) — LE PASSÉ NE SE RÉÉCRIT PAS. La contre-écriture
// porte désormais `executeParId` (la colonne « Exécuté par » du dossier
// scellé sortait vide). Ce champ ENTRE dans l'empreinte v2 : le verrou
// ci-dessous fige l'empreinte d'une contre-écriture ANCIENNE — celle où
// `executeParId` est resté null. Elle ne doit JAMAIS bouger : toutes les
// contre-écritures déjà scellées chez Franck la calculeraient autrement et
// leur chaîne se déclarerait cassée. Un rouge ici veut dire que quelqu'un a
// touché la préimage, ou pire, backfillé le champ sur l'existant.
const CE_ANCIENNE = { id: 'mvt-ce-ancienne', numero: 'FORM-2026-0042',
  date: '2026-07-27', mode: 'FORMATION', type: 'CHARGE_APPOINT',
  machineId: 'mac-9', fluide: 'R-32', quantiteKg: -0.5,
  peseeAvantKg: 10.8, peseeApresKg: 12,
  bouteilleSrcId: 'bou-9', bouteilleDstId: null,
  causeMouvement: 'Fuite reparee',
  controle: { statutControle: 'SANS_OBJET', detecteurId: null },
  technicien: 'Referent Alpha', validateurId: 'per-ref',
  contreEcritureDe: 'mvt-v2', motif: 'Erreur de pesee',
  versionEmpreinte: 2, prpFige: 675, cerfaNumero: 'FORM-2026-0042',
  executeParId: null, superviseurId: null, responsableRegistreId: null,
  outilsFiges: [], hashSignatures: 'c'.repeat(64),
  hashPiecesJointes: 'd'.repeat(64), hashPdfFinal: null };
{
  const attenduAncienne =
    'b6f5f5b6a27355c6607bd80911c9ca989c4c6cfbe6591329843fa0cd3f7da8fb';
  const obtenue = hasherMouvement(CE_ANCIENNE, 'e'.repeat(64));
  verifier('contre-écriture ANCIENNE (executeParId null) : empreinte CONNUE '
    + 'inchangée, front et serveur',
    obtenue === attenduAncienne &&
    await hasherEcriture(CE_ANCIENNE, 'e'.repeat(64)) === attenduAncienne,
    `obtenu=${obtenue}`);

  // Et la valeur est bel et bien SCELLÉE, pas décorative : renseigner
  // `executeParId` change l'empreinte. C'est précisément pourquoi on ne
  // backfille pas l'existant — le champ neuf n'existe que pour les
  // contre-écritures créées à partir de maintenant.
  const ceNouvelle = { ...CE_ANCIENNE, executeParId: 'per-ref' };
  const attenduNouvelle =
    '72f5d5dc90127914d4f5025d66a9b96fb3d001e65db1b66cd0f24896ef9635e7';
  const obtenueNouvelle = hasherMouvement(ceNouvelle, 'e'.repeat(64));
  verifier('contre-écriture NOUVELLE (executeParId posé) : empreinte '
    + 'DIFFÉRENTE et identique front/serveur',
    obtenueNouvelle === attenduNouvelle &&
    obtenueNouvelle !== attenduAncienne &&
    await hasherEcriture(ceNouvelle, 'e'.repeat(64)) === attenduNouvelle,
    `obtenu=${obtenueNouvelle}`);
}

// 3. VERSIONNEMENT : la version choisit la préimage — jamais de recalcul.
{
  const base = MOUVEMENTS[0].mvt;
  // Un mouvement v1 qui GAGNE des champs v2 (imports, colonnes nouvelles) :
  // empreinte STRICTEMENT inchangée (la liste blanche v1 les ignore).
  const v1AvecChampsV2 = { ...base, prpFige: 2088,
    outilsFiges: ['out-x=CONFORME'], hashSignatures: 'f'.repeat(64),
    hashPiecesJointes: 'f'.repeat(64), hashPdfFinal: null,
    versionEmpreinte: 1 };
  verifier('v1 + champs v2 parasites : empreinte v1 INCHANGÉE (liste blanche)',
    hasherMouvement(v1AvecChampsV2, null) === hasherMouvement(base, null) &&
    await hasherEcriture(v1AvecChampsV2, null) === hasherMouvement(base, null));
  // Le même contenu en v1 et en v2 donne des empreintes DIFFÉRENTES
  // (préimages distinctes) : basculer la version d'une écriture se voit.
  verifier('même contenu, version 1 vs 2 : empreintes différentes',
    hasherMouvement({ ...base, versionEmpreinte: 2 }, null) !==
    hasherMouvement(base, null));
  // Sensibilité v2 : toucher un champ GELÉ change l'empreinte.
  const geleTouche = { ...MVT_V2, hashSignatures: 'c'.repeat(64) };
  const outilTouche = { ...MVT_V2, outilsFiges: ['out-b=EXPIRE', 'out-d=EXPIRE'] };
  verifier('v2 : modifier hashSignatures ou outilsFiges change l’empreinte',
    hasherMouvement(geleTouche, 'a'.repeat(64)) !== hasherMouvement(MVT_V2, 'a'.repeat(64)) &&
    hasherMouvement(outilTouche, 'a'.repeat(64)) !== hasherMouvement(MVT_V2, 'a'.repeat(64)));
}

// 4. Chaîne MIXTE : une écriture v1 puis une v2 chaînée dessus — les deux
// hasseurs suivent la même chaîne (le hashPrecedent traverse les versions).
{
  const teteV1 = hasherMouvement(MOUVEMENTS[0].mvt, null);
  const suiteV2Serveur = hasherMouvement(MVT_V2, teteV1);
  const suiteV2Front = await hasherEcriture(MVT_V2, teteV1);
  verifier('chaîne mixte v1 → v2 : identique front/serveur',
    suiteV2Serveur === suiteV2Front && /^[0-9a-f]{64}$/.test(suiteV2Serveur));
}

// 5. Aides du scellement v2 : empreinte de liste triée + forme canonique
// d'une signature — parité stricte et insensibilité à l'ordre d'entrée.
{
  const attenduVide = '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945';
  verifier('empreinteListeTriee([]) : empreinte CONNUE de « [] », identique front/serveur',
    empreinteListeTriee([]) === attenduVide &&
    await empreinteListeFront([]) === attenduVide);
  verifier('empreinteListeTriee : insensible à l’ordre d’entrée, sensible au contenu',
    empreinteListeTriee(['b', 'a']) === empreinteListeTriee(['a', 'b']) &&
    empreinteListeTriee(['b', 'a']) === await empreinteListeFront(['a', 'b']) &&
    empreinteListeTriee(['a']) !== empreinteListeTriee(['b']));
  const signature = { role: 'DETENTEUR', nom: 'Henninot', prenom: 'Franck',
    qualite: 'Professeur, par délégation du détenteur',
    dateHeure: '2026-07-18T10:00:00.000Z',
    declaration: 'Je reconnais…, par délégation du détenteur (LP Vidal).',
    versionDocument: 1 };
  verifier('chaineCanoniqueSignature : identique front/serveur, ordre de clés figé',
    chaineCanoniqueSignature(signature, 'e'.repeat(64)) ===
      canoniqueFront(signature, 'e'.repeat(64)) &&
    chaineCanoniqueSignature(signature, 'e'.repeat(64)).startsWith('{"role":'));
  verifier('chaineCanoniqueSignature : champs absents comptés null (import ancien)',
    chaineCanoniqueSignature({ role: 'TECHNICIEN' }, null) ===
      canoniqueFront({ role: 'TECHNICIEN' }, null) &&
    chaineCanoniqueSignature({ role: 'TECHNICIEN' }, null).includes('"sha256Image":null'));
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Hasseurs de mouvement front ↔ serveur : strictement équivalents (v1 figée, v2 renforcée).');
