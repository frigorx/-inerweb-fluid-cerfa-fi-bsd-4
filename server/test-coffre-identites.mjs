// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Coffre des identités — brique E2a (lot E2, RGPD) : module PUR + primitives.
// Trois plans de preuve :
//   1. PARITÉ du module pur : miroir CJS identique à la source ESM (constantes
//      valeur à valeur, fonctions sur vecteurs) + test discriminant.
//   2. RÈGLES PURES : vecteurs FIGÉS (AAD, pseudonymes, messages), éligibilité,
//      aller-retour pseudonymisation → restauration bit à bit, libellés.
//   3. PRIMITIVES CRYPTO (server/chiffrement.js) : aller-retour, autoportance
//      (sel embarqué), attaques TIRÉES (AAD étrangère, octet altéré, phrase
//      fausse → MÊME message), repère d'enveloppe, IV jamais répété, scrypt
//      coffre renforcé, simulation Démo rejetée, zéro régression sauvegardes.
// Exécution : node server/test-coffre-identites.mjs — aucun accès disque.
// ============================================================

import { createRequire } from 'node:module';
import * as pur from '../v8/js/data/coffre-identites.js';

const require = createRequire(import.meta.url);
const miroir = require('./coffre-identites.js');
const chiffrement = require('./chiffrement.js');

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

// ============================================================
// 1. PARITÉ du module pur (ESM ↔ miroir CJS)
// ============================================================
{
  const constantes = ['VERSION_COFFRE', 'PREFIXE_SIMULATION', 'TEXTE_TEMOIN',
    'AAD_TEMOIN', 'MSG_CODE_INCORRECT', 'MSG_FICHE_AU_COFFRE', 'MSG_COFFRE_LAN',
    'MSG_ARCHIVE_REQUISE', 'MSG_SIMULATION_REJETEE', 'MSG_COFFRE_INEXISTANT',
    'MSG_DEJA_AU_COFFRE', 'MSG_PAS_AU_COFFRE', 'MSG_MOTIF_OBLIGATOIRE',
    'MSG_PHRASE_TROP_COURTE', 'LONGUEUR_MIN_PHRASE_COFFRE'];
  const divergentes = constantes.filter(
    (nom) => JSON.stringify(pur[nom]) !== JSON.stringify(miroir[nom]));
  verifier('parité : toutes les constantes identiques',
    divergentes.length === 0, `divergent : ${divergentes.join(', ')}`);

  const personne = {
    id: 'per-x1', nom: 'Martin', prenom: 'Jean', typePersonne: 'ELEVE',
    roleApp: 'ELEVE', email: 'j@x.fr', numAttestationAptitude: 'ATT-1',
    organismeDelivreur: 'Org', dateObtention: '2025-01-01',
    dateFinValidite: '2030-01-01', actif: false
  };
  const annexes = {
    identifiantConnexion: 'jmartin',
    piecesJointes: [{ nomFichier: 'att.pdf', mimeType: 'application/pdf',
      categorie: 'ATTESTATION_APTITUDE', hashSha256: 'abc', base64: 'AAAA' }]
  };
  verifier('parité : aadIdentite / libellePseudonyme / assemblerIdentite',
    pur.aadIdentite('per-1', 'Élève 2026-01')
      === miroir.aadIdentite('per-1', 'Élève 2026-01')
    && JSON.stringify(pur.libellePseudonyme(2026, 3))
      === JSON.stringify(miroir.libellePseudonyme(2026, 3))
    && JSON.stringify(pur.assemblerIdentite(personne, annexes))
      === JSON.stringify(miroir.assemblerIdentite(personne, annexes)));
  verifier('parité : pseudonymiserFiche / restaurerIdentite / estFicheEchue',
    JSON.stringify(pur.pseudonymiserFiche(2026, 1))
      === JSON.stringify(miroir.pseudonymiserFiche(2026, 1))
    && JSON.stringify(pur.restaurerIdentite({ nom: 'A', actif: true }))
      === JSON.stringify(miroir.restaurerIdentite({ nom: 'A', actif: true }))
    && pur.estFicheEchue(personne) === miroir.estFicheEchue(personne));
  // Discriminant : si la comparaison ne discriminait rien, elle ne prouve rien.
  verifier('parité : test discriminant (entrées différentes → sorties différentes)',
    pur.aadIdentite('per-1', 'A') !== miroir.aadIdentite('per-2', 'A'));
}

// ============================================================
// 2. RÈGLES PURES — vecteurs figés et aller-retour
// ============================================================
{
  verifier('vecteur figé : AAD d\'identité',
    pur.aadIdentite('PER-0007', 'Élève 2026-03')
      === 'coffre:v1:PER-0007:Élève 2026-03');
  verifier('vecteur figé : AAD du témoin et texte du témoin',
    pur.AAD_TEMOIN === 'coffre:v1:temoin'
    && pur.TEXTE_TEMOIN === 'COFFRE-TEMOIN-1');
  const pseudo = pur.libellePseudonyme(2026, 7);
  verifier('pseudonyme : « Élève 2026-07 », connexion « eleve-2026-07 »',
    pseudo.prenom === 'Élève' && pseudo.nom === '2026-07'
    && pseudo.libelle === 'Élève 2026-07'
    && pseudo.connexion === 'eleve-2026-07');
  verifier('pseudonyme : numéro à 3 chiffres accepté (promotion chargée)',
    pur.libellePseudonyme(2026, 123).nom === '2026-123');

  verifier('éligibilité : élève désactivé → candidat',
    pur.estFicheEchue({ typePersonne: 'ELEVE', actif: false }) === true);
  verifier('éligibilité : élève ACTIF → non candidat',
    pur.estFicheEchue({ typePersonne: 'ELEVE', actif: true }) === false);
  verifier('éligibilité : enseignant désactivé → non candidat',
    pur.estFicheEchue({ typePersonne: 'ENSEIGNANT', actif: false }) === false);
  verifier('éligibilité : fiche absente → non candidat',
    pur.estFicheEchue(null) === false);

  // Aller-retour : fiche → identité → pseudonymisation → restauration.
  const fiche = {
    id: 'per-ar', nom: 'Bonnet', prenom: 'Léa', typePersonne: 'ELEVE',
    roleApp: 'ELEVE', email: 'lea@x.fr', numAttestationAptitude: 'A-9',
    organismeDelivreur: 'CFC', dateObtention: '2024-09-01',
    dateFinValidite: '2029-09-01', categorie2008: null, categorie2025: 'A1',
    activitesAutorisees: ['MAINTENANCE'], actif: true
  };
  const identite = pur.assemblerIdentite(fiche, { identifiantConnexion: 'lea' });
  const apresAbri = { ...fiche, ...pur.pseudonymiserFiche(2026, 4) };
  verifier('pseudonymisation : identifiants effacés, fiche désactivée, id intact',
    apresAbri.prenom === 'Élève' && apresAbri.nom === '2026-04'
    && apresAbri.email === null && apresAbri.numAttestationAptitude === null
    && apresAbri.organismeDelivreur === null && apresAbri.dateObtention === null
    && apresAbri.dateFinValidite === null && apresAbri.actif === false
    && apresAbri.id === 'per-ar' && apresAbri.categorie2025 === 'A1');
  const restauree = { ...apresAbri, ...pur.restaurerIdentite(identite) };
  const clefs = ['nom', 'prenom', 'email', 'numAttestationAptitude',
    'organismeDelivreur', 'dateObtention', 'dateFinValidite', 'actif'];
  verifier('restauration : la fiche redevient EXACTEMENT ce qu\'elle était',
    clefs.every((c) => restauree[c] === fiche[c])
    && restauree.id === fiche.id);
  verifier('identité assemblée : version, porteur, identifiant de connexion',
    identite.version === 1 && identite.personnelId === 'per-ar'
    && identite.identifiantConnexion === 'lea'
    && Array.isArray(identite.piecesJointes));

  // Libellé d'affichage substitué.
  const index = new Map([
    ['per-coffre', { prenom: 'Élève', nom: '2026-04' }],
    ['per-libre', { prenom: 'Sophie', nom: 'Bianchi' }]
  ]);
  verifier('libellé : identifiant présent → fiche vivante (pseudonyme)',
    pur.libelleIntervenant('Léa Bonnet', 'per-coffre', index) === 'Élève 2026-04');
  verifier('libellé : identifiant présent → fiche vivante (nom réel si pas au coffre)',
    pur.libelleIntervenant('S. Bianchi', 'per-libre', index) === 'Sophie Bianchi');
  verifier('libellé : sans identifiant → champ figé tel quel (résidu)',
    pur.libelleIntervenant('Ancien Nom', null, index) === 'Ancien Nom');
  verifier('libellé : identifiant inconnu de l\'index → champ figé',
    pur.libelleIntervenant('X Y', 'per-disparu', index) === 'X Y');
}

// ============================================================
// 3. PRIMITIVES CRYPTO du coffre (server/chiffrement.js)
// ============================================================
{
  const { deriverCleCoffre, chiffrerChampCoffre, dechiffrerChampCoffre,
    dechiffrerChampCoffreAvecCle, decomposerChampCoffre, estEnveloppeCoffre,
    MAGIC_COFFRE, SCRYPT_N_COFFRE, LONGUEUR_SEL } = chiffrement;
  const crypto = require('node:crypto');

  verifier('scrypt du coffre RENFORCÉ : N = 131072 (2^17)',
    SCRYPT_N_COFFRE === 131072);

  const phrase = 'grenouille wagon libellule sirop';
  const sel = crypto.randomBytes(16);
  const debut = Date.now();
  const cle = deriverCleCoffre(phrase, sel); // LA dérivation lente (une seule)
  const duree = Date.now() - debut;
  console.log(`  (dérivation scrypt coffre : ${duree} ms)`);
  verifier('dérivation : clé de 32 octets', cle.length === 32);
  verifier('dérivation : sel de 16 octets exigé (32 caractères hexadécimaux)',
    Buffer.from(sel.toString('hex'), 'hex').length === LONGUEUR_SEL);
  attendreRejet('dérivation : sel de 8 octets refusé',
    () => deriverCleCoffre(phrase, crypto.randomBytes(8)), 'Sel de dérivation');

  const aad = pur.aadIdentite('per-c1', 'Élève 2026-01');
  const contenu = Buffer.from(JSON.stringify({ nom: 'Martin', prenom: 'Jean' }));
  const enveloppe = chiffrerChampCoffre(contenu, cle, sel, aad);

  verifier('enveloppe : repère « IWF-COFFRE-1 » en tête',
    estEnveloppeCoffre(enveloppe)
    && enveloppe.subarray(0, MAGIC_COFFRE.length).equals(MAGIC_COFFRE));
  verifier('enveloppe : le sel EMBARQUÉ est le sel global (autoportance)',
    decomposerChampCoffre(enveloppe).sel.equals(sel));
  verifier('aller-retour avec clé pré-dérivée : contenu identique',
    dechiffrerChampCoffreAvecCle(enveloppe, cle, aad).equals(contenu));
  verifier('aller-retour par la PHRASE (sel embarqué, autoportance)',
    dechiffrerChampCoffre(enveloppe, phrase, aad).equals(contenu));

  // ---- Les attaques, TIRÉES ----
  attendreRejet('attaque : phrase FAUSSE → message canonique unique',
    () => dechiffrerChampCoffre(enveloppe, 'mauvaise phrase du tout', aad),
    pur.MSG_CODE_INCORRECT);
  const alteree = Buffer.from(enveloppe);
  alteree[alteree.length - 1] ^= 0xff;
  attendreRejet('attaque : un octet ALTÉRÉ → MÊME message (anti-oracle)',
    () => dechiffrerChampCoffre(alteree, phrase, aad),
    pur.MSG_CODE_INCORRECT);
  attendreRejet('attaque : enveloppe REJOUÉE sous une autre identité → AAD refuse',
    () => dechiffrerChampCoffreAvecCle(enveloppe, cle,
      pur.aadIdentite('per-AUTRE', 'Élève 2026-02')),
    pur.MSG_CODE_INCORRECT);
  attendreRejet('attaque : balise de SIMULATION démo → jamais décomposée en réel',
    () => decomposerChampCoffre(
      Buffer.from(pur.PREFIXE_SIMULATION + 'eyJub20iOiJYIn0=', 'utf8')),
    'IWF-COFFRE-1');

  // Autoportance COMPLÈTE : une enveloppe d'un AUTRE sel global se rouvre
  // quand même par la phrase (cas d'une enveloppe importée d'un autre poste).
  const autreSel = crypto.randomBytes(16);
  const autreCle = deriverCleCoffre(phrase, autreSel);
  const enveloppeEtrangere = chiffrerChampCoffre(contenu, autreCle, autreSel, aad);
  verifier('autoportance : enveloppe d\'un autre sel rouverte par la phrase seule',
    dechiffrerChampCoffre(enveloppeEtrangere, phrase, aad).equals(contenu));

  // IV jamais répété (clé fixe, 1000 tirages — pas de scrypt, GCM seul).
  const ivVus = new Set();
  let ivRepete = false;
  for (let i = 0; i < 1000; i += 1) {
    const e = chiffrerChampCoffre(Buffer.from('x'), cle, sel, aad);
    const iv = decomposerChampCoffre(e).iv.toString('hex');
    if (ivVus.has(iv)) { ivRepete = true; break; }
    ivVus.add(iv);
  }
  verifier('IV : 1000 enveloppes, aucun IV répété', !ivRepete);

  // Témoin du coffre : chiffre le texte fixe, se vérifie, refuse une autre phrase.
  const temoin = chiffrerChampCoffre(
    Buffer.from(pur.TEXTE_TEMOIN, 'utf8'), cle, sel, pur.AAD_TEMOIN);
  verifier('témoin : la bonne phrase le rouvre sur le texte fixe',
    dechiffrerChampCoffre(temoin, phrase, pur.AAD_TEMOIN).toString('utf8')
      === pur.TEXTE_TEMOIN);
  attendreRejet('témoin : une autre phrase est refusée',
    () => dechiffrerChampCoffre(temoin, 'phrase parfaitement fausse',
      pur.AAD_TEMOIN),
    pur.MSG_CODE_INCORRECT);

  // Zéro régression : l'enveloppe de SAUVEGARDE historique répond toujours.
  const manifeste = { chiffrement: { actif: true } };
  const zip = Buffer.from('PK-faux-zip-de-test');
  const envSauvegarde = chiffrement.chiffrer(zip, phrase, manifeste);
  verifier('zéro régression : chiffrer/dechiffrer des SAUVEGARDES intacts',
    chiffrement.dechiffrer(envSauvegarde, phrase).equals(zip)
    && chiffrement.estEnveloppeChiffree(envSauvegarde)
    && !estEnveloppeCoffre(envSauvegarde));
}

// ------------------------------------------------------------
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [coffre des identités E2a]`);
process.exit(nbEchecs === 0 ? 0 : 1);
