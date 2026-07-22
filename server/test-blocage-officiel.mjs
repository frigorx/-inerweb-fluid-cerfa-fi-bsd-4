// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Moteur de blocage du mode OFFICIEL (lot B, condition 2 du plan) :
//   1. comportement AUX LIMITES du module pur (chaque condition de
//      docs/CONDITIONS-BLOCANTES-OFFICIEL.md déclenchée / non déclenchée,
//      filtrage par moment, formes des messages) ;
//   2. PARITÉ STRICTE entre le module ESM (v8/js/data/blocage-officiel.js)
//      et son miroir CommonJS serveur (server/blocage-officiel.js) — le
//      test DISCRIMINE : toute divergence de sortie sur l'éventail casse.
// Exécution : node server/test-blocage-officiel.mjs — Node ≥ 18, sans DOM.
// ============================================================

import { createRequire } from 'node:module';
import {
  evaluerBlocagesOfficiel, messageRefusOfficiel,
  SEUIL_PRP_VIERGE, MOMENTS_OFFICIEL, VERROU_LIVRAISON,
  MSG_CONTROLE_DIRECT_OFFICIEL
} from '../v8/js/data/blocage-officiel.js';

const require = createRequire(import.meta.url);
const miroir = require('./blocage-officiel.js');

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

/** Fiche « saine » : aucune condition de fiche déclenchée (base des cas). */
function ficheSaine(surcharges = {}) {
  return {
    type: 'CHARGE_APPOINT', machinePresente: true, fluide: 'R-410A',
    peseeAvantKg: 20, peseeApresKg: 18, causePresente: true,
    controleStatut: 'CONFORME', controlePeriodiqueRequis: true,
    fluideInflammable: false, sourceVierge: false, prp: 2088,
    signaturePresente: true, technicienPresent: true,
    // P0-5 : fait `aptitude` (aptitude opposable) — sain = couverte.
    intervenant: { nom: 'Un Enseignant', actif: true, habilitationActive: true,
      aptitude: { autorise: true, motif: 'Opération autorisée' } },
    // Lot C (C1) — conditions 14-15 : signatures réelles valides (tri-état
    // true | false | 'PERIMEE').
    signatureTechnicienValide: true, signatureDetenteurValide: true,
    ...surcharges
  };
}

const codes = (r) => r.blocages.map((b) => b.code).join(',');

// ============================================================
// 1. Comportement aux limites (module ESM)
// ============================================================

// Cadre minimal : rien ne bloque.
{
  const r = evaluerBlocagesOfficiel({ moment: 'PASSAGE' });
  verifier('cadre vide au PASSAGE : ok, aucun blocage',
    r.ok === true && r.blocages.length === 0, codes(r));
}

// Moment inconnu : Error explicite.
{
  let message = '';
  try { evaluerBlocagesOfficiel({ moment: 'AVANT' }); } catch (e) { message = e.message; }
  verifier('moment inconnu : Error listant les moments attendus',
    message.includes('AVANT') && MOMENTS_OFFICIEL.every((m) => message.includes(m)));
}

// Conditions 1-4 : motifs d'établissement repris tels quels, en tête.
{
  const motifs = ['Aucune balance conforme (vérification à jour requise).',
    'Écart de balance matière non justifié : R-32 (2026, +0,35 kg).'];
  const r = evaluerBlocagesOfficiel({ moment: 'PASSAGE',
    etablissementMotifs: motifs, verrouLivraison: true });
  verifier('motifs établissement repris mot pour mot, avant le verrou',
    r.ok === false && r.blocages.length === 3 &&
    r.blocages[0].code === 'ETABLISSEMENT' && r.blocages[0].motif === motifs[0] &&
    r.blocages[1].motif === motifs[1] &&
    r.blocages[2].code === 'VERROU_LIVRAISON', codes(r));
}

// Condition 5 : sauvegarde — null (sans objet), récente, ancienne, absente.
{
  const sans = evaluerBlocagesOfficiel({ moment: 'PASSAGE', sauvegarde: null });
  const recente = evaluerBlocagesOfficiel({ moment: 'PASSAGE',
    sauvegarde: { recente: true, ageHeures: 2, seuilHeures: 24 } });
  const vieille = evaluerBlocagesOfficiel({ moment: 'PASSAGE',
    sauvegarde: { recente: false, ageHeures: 30.4, seuilHeures: 24 } });
  const aucune = evaluerBlocagesOfficiel({ moment: 'PASSAGE',
    sauvegarde: { recente: false, ageHeures: null, seuilHeures: 24 } });
  verifier('sauvegarde : null et récente ne bloquent pas',
    sans.ok === true && recente.ok === true);
  verifier('sauvegarde trop ancienne : blocage SAUVEGARDE avec âge arrondi et seuil',
    vieille.ok === false && vieille.blocages[0].code === 'SAUVEGARDE' &&
    vieille.blocages[0].motif.includes('il y a 30 h') &&
    vieille.blocages[0].motif.includes('24 h'), vieille.blocages[0]?.motif);
  verifier('aucune archive valide : blocage SAUVEGARDE dédié',
    aucune.ok === false &&
    aucune.blocages[0].motif === 'Aucune sauvegarde vérifiée du poste (aucune archive valide).');
}

// La fiche est IGNORÉE au PASSAGE, évaluée dès la SOUMISSION.
{
  const fiche = ficheSaine({ machinePresente: false });
  const passage = evaluerBlocagesOfficiel({ moment: 'PASSAGE', fiche });
  const soumission = evaluerBlocagesOfficiel({ moment: 'SOUMISSION', fiche });
  verifier('fiche ignorée au PASSAGE, évaluée à la SOUMISSION',
    passage.ok === true && soumission.ok === false &&
    soumission.blocages[0].code === 'COMPLETUDE', codes(soumission));
}

// Condition 8 : complétude aux limites.
{
  const saine = evaluerBlocagesOfficiel({ moment: 'SOUMISSION', fiche: ficheSaine() });
  verifier('fiche saine : aucun blocage à la soumission', saine.ok === true, codes(saine));

  const transfert = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ type: 'TRANSFERT', machinePresente: false, causePresente: false }) });
  verifier('TRANSFERT : machine et cause non requises', transfert.ok === true, codes(transfert));

  const sansFluide = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ fluide: null }) });
  verifier('fluide absent : blocage COMPLETUDE',
    sansFluide.blocages.some((b) => b.code === 'COMPLETUDE' && b.motif.includes('fluide')));

  const peseesEgales = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ peseeAvantKg: 12, peseeApresKg: 12 }) });
  const peseeManquante = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ peseeApresKg: null }) });
  verifier('pesées égales ou manquantes : blocage COMPLETUDE',
    peseesEgales.blocages.some((b) => b.motif.includes('pesées')) &&
    peseeManquante.blocages.some((b) => b.motif.includes('pesées')));

  const sansCause = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ causePresente: false }) });
  const recupSansCause = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ type: 'RECUPERATION_MAINTENANCE', causePresente: false,
      controlePeriodiqueRequis: true }) });
  verifier('cause exigée pour CHARGE_APPOINT seulement',
    sansCause.blocages.some((b) => b.motif.includes('cause')) &&
    !recupSansCause.blocages.some((b) => b.motif.includes('cause')), codes(recupSansCause));
}

// Conditions 6 et 7 : intervenant absent / inactif / non habilité.
{
  const absent = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ intervenant: null }) });
  const inactif = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ intervenant: { nom: 'Un Élève', actif: false, habilitationActive: false } }) });
  verifier('intervenant absent : blocage INTERVENANT',
    absent.blocages.some((b) => b.code === 'INTERVENANT'));
  verifier('intervenant inactif ET non habilité : INTERVENANT + APTITUDE nominatifs',
    inactif.blocages.some((b) => b.code === 'INTERVENANT' && b.motif.includes('Un Élève')) &&
    inactif.blocages.some((b) => b.code === 'APTITUDE' && b.motif.includes('Un Élève')),
    codes(inactif));
}

// Condition 16 (P0-5) : aptitude opposable — l'habilitation COUVRE l'intervention.
{
  const inadaptee = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ intervenant: { nom: 'Un Contrôleur', actif: true,
      habilitationActive: true,
      aptitude: { autorise: false,
        motif: 'Contrôle d’étanchéité uniquement : pas de manipulation' } } }) });
  verifier('aptitude non couvrante : blocage APTITUDE_PORTEE nominatif, motif embarqué',
    inadaptee.blocages.some((b) => b.code === 'APTITUDE_PORTEE' &&
      b.motif.includes('Un Contrôleur') &&
      b.motif.includes('pas de manipulation')),
    codes(inadaptee));
  verifier('aptitude non couvrante : PAS de doublon APTITUDE (la 7 se tait)',
    !inadaptee.blocages.some((b) => b.code === 'APTITUDE'), codes(inadaptee));

  const sansFait = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ intervenant: { nom: 'Un Enseignant', actif: true,
      habilitationActive: true, aptitude: null } }) });
  verifier('fait aptitude null (sans objet) : aucun blocage APTITUDE_PORTEE',
    !sansFait.blocages.some((b) => b.code === 'APTITUDE_PORTEE'), codes(sansFait));

  const ancienCadre = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ intervenant: { nom: 'Un Enseignant', actif: true,
      habilitationActive: true } }) });
  verifier('fait aptitude ABSENT (cadre antérieur à P0-5) : rétro-compatible, rien',
    !ancienCadre.blocages.some((b) => b.code === 'APTITUDE_PORTEE'), codes(ancienCadre));

  const conseilSeul = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ intervenant: { nom: 'Un Enseignant', actif: true,
      habilitationActive: true,
      aptitude: { autorise: true,
        motif: 'Intervention autorisée dans la limite de 3 kg' } } }) });
  verifier('aptitude autorisée avec réserve (gravité CONSEIL) : ne bloque JAMAIS',
    !conseilSeul.blocages.some((b) => b.code === 'APTITUDE_PORTEE'), codes(conseilSeul));

  const sansHab = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ intervenant: { nom: 'Un Élève', actif: true,
      habilitationActive: false,
      aptitude: { autorise: false, motif: 'Aucune habilitation enregistrée' } } }) });
  verifier('sans habilitation : APTITUDE seule parle (jamais APTITUDE_PORTEE en plus)',
    sansHab.blocages.some((b) => b.code === 'APTITUDE') &&
    !sansHab.blocages.some((b) => b.code === 'APTITUDE_PORTEE'), codes(sansHab));

  const auPassage = evaluerBlocagesOfficiel({ moment: 'PASSAGE',
    fiche: ficheSaine({ intervenant: { nom: 'Un Contrôleur', actif: true,
      habilitationActive: true,
      aptitude: { autorise: false, motif: 'Peu importe' } } }) });
  verifier('PASSAGE : la fiche n’est pas encore jugée (condition 16 comprise)',
    auPassage.blocages.every((b) => b.code !== 'APTITUDE_PORTEE'), codes(auPassage));
}

// Condition 9 : contrôle d'étanchéité exigé.
{
  const manque = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ controleStatut: 'SANS_OBJET' }) });
  verifier('machine soumise + contrôle SANS_OBJET : blocage CONTROLE',
    manque.blocages.some((b) => b.code === 'CONTROLE'), codes(manque));

  const inflammableSeul = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ type: 'MISE_EN_SERVICE', causePresente: false,
      controlePeriodiqueRequis: false, fluideInflammable: true,
      controleStatut: 'SANS_OBJET' }) });
  verifier('fluide inflammable seul (mise en service) : contrôle exigé',
    inflammableSeul.blocages.some((b) => b.code === 'CONTROLE'), codes(inflammableSeul));

  const horsPerimetre = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ controlePeriodiqueRequis: false, controleStatut: 'SANS_OBJET' }) });
  const recuperation = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ type: 'RECUPERATION_MAINTENANCE', controleStatut: 'SANS_OBJET' }) });
  verifier('contrôle non exigé : machine non soumise, ou type hors charge/mise en service',
    !horsPerimetre.blocages.some((b) => b.code === 'CONTROLE') &&
    !recuperation.blocages.some((b) => b.code === 'CONTROLE'),
    `${codes(horsPerimetre)} / ${codes(recuperation)}`);

  const fuite = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ controleStatut: 'FUITE' }) });
  verifier('contrôle FUITE déclaré : la condition est satisfaite (jamais masquée)',
    !fuite.blocages.some((b) => b.code === 'CONTROLE'));
}

// Condition 10 : fluide vierge PRP ≥ 2500, exactement au seuil.
{
  const interdit = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ sourceVierge: true, prp: 3922 }) });
  const auSeuil = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ sourceVierge: true, prp: SEUIL_PRP_VIERGE }) });
  const sousSeuil = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ sourceVierge: true, prp: 2499.9 }) });
  const recycle = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ sourceVierge: false, prp: 3922 }) });
  const miseEnService = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ type: 'MISE_EN_SERVICE', causePresente: false,
      sourceVierge: true, prp: 3922 }) });
  verifier('vierge PRP 3922 et PRP = 2500 : blocage FLUIDE_VIERGE',
    interdit.blocages.some((b) => b.code === 'FLUIDE_VIERGE') &&
    auSeuil.blocages.some((b) => b.code === 'FLUIDE_VIERGE'));
  verifier('sous le seuil, fluide non vierge, ou mise en service : pas de blocage',
    !sousSeuil.blocages.some((b) => b.code === 'FLUIDE_VIERGE') &&
    !recycle.blocages.some((b) => b.code === 'FLUIDE_VIERGE') &&
    !miseEnService.blocages.some((b) => b.code === 'FLUIDE_VIERGE'),
    codes(miseEnService));
}

// Condition 11 : signature exigée à la VALIDATION seulement.
{
  const fiche = ficheSaine({ signaturePresente: false, technicienPresent: false });
  const soumission = evaluerBlocagesOfficiel({ moment: 'SOUMISSION', fiche });
  const validation = evaluerBlocagesOfficiel({ moment: 'VALIDATION', fiche });
  verifier('signature non exigée à la soumission, deux motifs SIGNATURE à la validation',
    !soumission.blocages.some((b) => b.code === 'SIGNATURE') &&
    validation.blocages.filter((b) => b.code === 'SIGNATURE').length === 2,
    codes(validation));
}

// Conditions 14-15 (lot C, brique C1) : signatures RÉELLES — VALIDATION
// seulement, tri-état (absente / valide / périmée), la périmée n'est
// jamais ignorée.
{
  const absentes = evaluerBlocagesOfficiel({ moment: 'VALIDATION',
    fiche: ficheSaine({ signatureTechnicienValide: false,
      signatureDetenteurValide: false }) });
  const perimees = evaluerBlocagesOfficiel({ moment: 'VALIDATION',
    fiche: ficheSaine({ signatureTechnicienValide: 'PERIMEE',
      signatureDetenteurValide: 'PERIMEE' }) });
  const soumission = evaluerBlocagesOfficiel({ moment: 'SOUMISSION',
    fiche: ficheSaine({ signatureTechnicienValide: false,
      signatureDetenteurValide: false }) });
  const valides = evaluerBlocagesOfficiel({ moment: 'VALIDATION',
    fiche: ficheSaine() });
  verifier('signatures réelles absentes : deux blocages dédiés à la VALIDATION',
    absentes.blocages.some((b) => b.code === 'SIGNATURE_TECHNICIEN' &&
      b.motif.includes('absente')) &&
    absentes.blocages.some((b) => b.code === 'SIGNATURE_DETENTEUR' &&
      b.motif.includes('absente')), codes(absentes));
  verifier('signatures périmées : « fiche modifiée après signature », jamais ignorée',
    perimees.blocages.some((b) => b.code === 'SIGNATURE_TECHNICIEN' &&
      b.motif.includes('Fiche modifiée après signature')) &&
    perimees.blocages.some((b) => b.code === 'SIGNATURE_DETENTEUR' &&
      b.motif.includes('périmée')), codes(perimees));
  verifier('signatures réelles : rien à la SOUMISSION, rien quand elles sont valides',
    !soumission.blocages.some((b) => b.code.startsWith('SIGNATURE_')) &&
    valides.ok === true, `${codes(soumission)} / ${codes(valides)}`);
}

// Condition 12 : validateur de session (VALIDATION seulement).
{
  const delie = { lie: false, motif: 'Le validateur déclaré n’est pas la personne connectée.' };
  const soumission = evaluerBlocagesOfficiel({ moment: 'SOUMISSION', validateur: delie });
  const validation = evaluerBlocagesOfficiel({ moment: 'VALIDATION', validateur: delie });
  const sansMotif = evaluerBlocagesOfficiel({ moment: 'VALIDATION',
    validateur: { lie: false, motif: null } });
  const lie = evaluerBlocagesOfficiel({ moment: 'VALIDATION', validateur: { lie: true } });
  verifier('validateur délié : ignoré à la soumission, motif transmis à la validation',
    soumission.ok === true && validation.blocages[0]?.code === 'VALIDATEUR' &&
    validation.blocages[0]?.motif === delie.motif);
  verifier('validateur délié sans motif : message par défaut ; lié : aucun blocage',
    sansMotif.blocages[0]?.motif === 'Le validateur doit être la personne connectée.' &&
    lie.ok === true);
}

// Condition 13 : verrou de livraison, à tous les moments, toujours en dernier.
{
  for (const moment of MOMENTS_OFFICIEL) {
    const r = evaluerBlocagesOfficiel({ moment, verrouLivraison: true,
      fiche: ficheSaine({ fluide: null }) });
    verifier(`verrou de livraison bloque au moment ${moment}, en dernière position`,
      r.ok === false && r.blocages[r.blocages.length - 1].code === 'VERROU_LIVRAISON',
      codes(r));
  }
}

// Message canonique de refus : singulier / pluriel, début stable.
{
  const un = messageRefusOfficiel([{ code: 'X', motif: 'Motif seul.' }]);
  const deux = messageRefusOfficiel([
    { code: 'X', motif: 'Premier motif.' }, { code: 'Y', motif: 'Second motif.' }]);
  verifier('message de refus : singulier et pluriel corrects, motifs joints',
    un === 'Mode Officiel refusé (1 condition bloquante) : Motif seul.' &&
    deux === 'Mode Officiel refusé (2 conditions bloquantes) : Premier motif. · Second motif.',
    `${un} | ${deux}`);
}

// ============================================================
// 2. Parité stricte ESM ↔ miroir CommonJS (éventail discriminant)
// ============================================================
{
  verifier('constantes identiques (seuil PRP, verrou de livraison, moments)',
    miroir.SEUIL_PRP_VIERGE === SEUIL_PRP_VIERGE &&
    miroir.VERROU_LIVRAISON === VERROU_LIVRAISON &&
    JSON.stringify(miroir.MOMENTS_OFFICIEL) === JSON.stringify(MOMENTS_OFFICIEL));

  // P7-c : refus structurel du contrôle direct officiel — mot pour mot.
  verifier('MSG_CONTROLE_DIRECT_OFFICIEL identique des deux côtés (P7-c)',
    typeof MSG_CONTROLE_DIRECT_OFFICIEL === 'string' &&
    MSG_CONTROLE_DIRECT_OFFICIEL.length > 0 &&
    miroir.MSG_CONTROLE_DIRECT_OFFICIEL === MSG_CONTROLE_DIRECT_OFFICIEL);

  const CADRES = [];
  // Toutes les combinaisons simples de conditions, aux trois moments.
  for (const moment of MOMENTS_OFFICIEL) {
    CADRES.push({ moment });
    CADRES.push({ moment, verrouLivraison: true });
    CADRES.push({ moment, etablissementMotifs: ['Motif A.', 'Motif B.'] });
    CADRES.push({ moment, sauvegarde: { recente: false, ageHeures: 47.6, seuilHeures: 24 } });
    CADRES.push({ moment, sauvegarde: { recente: false, ageHeures: null, seuilHeures: 24 } });
    CADRES.push({ moment, validateur: { lie: false, motif: null } });
    CADRES.push({ moment, fiche: ficheSaine() });
    CADRES.push({ moment, fiche: ficheSaine({ type: 'TRANSFERT', machinePresente: false }) });
    CADRES.push({ moment, fiche: ficheSaine({ fluide: null, peseeApresKg: null,
      causePresente: false, intervenant: null, controleStatut: 'SANS_OBJET',
      sourceVierge: true, prp: 3922, signaturePresente: false, technicienPresent: false }) });
    CADRES.push({ moment, fiche: ficheSaine({ intervenant: {
      nom: 'Personne Désactivée', actif: false, habilitationActive: false } }) });
    // P0-5 (condition 16) : aptitude non couvrante / fait sans objet.
    CADRES.push({ moment, fiche: ficheSaine({ intervenant: {
      nom: 'Un Contrôleur', actif: true, habilitationActive: true,
      aptitude: { autorise: false,
        motif: 'Récupération uniquement : opération non couverte' } } }) });
    CADRES.push({ moment, fiche: ficheSaine({ intervenant: {
      nom: 'Un Enseignant', actif: true, habilitationActive: true,
      aptitude: null } }) });
    // Lot C (C1) : signatures réelles — les trois états discriminés.
    CADRES.push({ moment, fiche: ficheSaine({
      signatureTechnicienValide: 'PERIMEE', signatureDetenteurValide: false }) });
    CADRES.push({ moment, fiche: ficheSaine({
      signatureTechnicienValide: true, signatureDetenteurValide: 'PERIMEE' }) });
  }
  let identiques = 0;
  for (const cadre of CADRES) {
    const a = JSON.stringify(evaluerBlocagesOfficiel(cadre));
    const b = JSON.stringify(miroir.evaluerBlocagesOfficiel(cadre));
    if (a === b) identiques += 1;
    else console.error(`  divergence sur ${JSON.stringify(cadre)}\n  ESM=${a}\n  CJS=${b}`);
  }
  verifier(`parité stricte sur ${CADRES.length} cadres discriminants`,
    identiques === CADRES.length, `${identiques}/${CADRES.length}`);

  let messageEsm = ''; let messageCjs = '';
  try { evaluerBlocagesOfficiel({ moment: 'JAMAIS' }); } catch (e) { messageEsm = e.message; }
  try { miroir.evaluerBlocagesOfficiel({ moment: 'JAMAIS' }); } catch (e) { messageCjs = e.message; }
  verifier('même Error sur moment inconnu des deux côtés',
    messageEsm !== '' && messageEsm === messageCjs);

  const blocages = [{ code: 'A', motif: 'Un.' }, { code: 'B', motif: 'Deux.' }];
  verifier('messageRefusOfficiel identique des deux côtés',
    messageRefusOfficiel(blocages) === miroir.messageRefusOfficiel(blocages));
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Moteur de blocage Officiel : limites couvertes, parité ESM ↔ serveur stricte.');
