// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// coffre-identites.js — Règles PURES du coffre des identités (lot E2, RGPD).
//
// CONTRAT (rôle) : messages canoniques, formats (AAD, pseudonymes, balise de
//   simulation, témoin) et règles pures du coffre-fort chiffré réversible :
//   éligibilité d'une fiche, pseudonymisation/restauration de la fiche,
//   assemblage de l'identité à chiffrer, libellé d'affichage substitué.
// ENTRÉES/SORTIES : objets « personne » du contrat (champs exacts de la fiche),
//   patchs de fiche, chaînes. AUCUN chiffrement ici (les primitives crypto
//   vivent dans server/chiffrement.js ; la Démo simule).
// DÉPENDANCES : aucune. ⚠ CLONE EN LITTÉRAL de v8/js/data/coffre-identites.js
//   (source de vérité) — parité prouvée par
//   test-coffre-identites.mjs.
// PIÈGES : le pseudonyme est PORTÉ par la fiche (prenom='Élève', nom='AAAA-NN')
//   pour que tous les libellés « prenom + nom » du dépôt suivent sans toucher
//   une seule vue ; le compteur de pseudonymes est MONOTONE par année (géré par
//   l'appelant — jamais recalculé des lignes présentes : une restauration ne
//   libère pas un numéro). estFicheEchue v1 = élève DÉSACTIVÉ (aucune date de
//   départ n'existe en donnée — pas de fausse précision temporelle).
// ============================================================

const VERSION_COFFRE = 1;

/** Préfixe des enveloppes SIMULÉES du mode Démo (jamais en base réelle). */
const PREFIXE_SIMULATION = 'SIMULATION-COFFRE:';

/** Texte fixe chiffré dans le témoin (vérifier la phrase sans rien stocker). */
const TEXTE_TEMOIN = 'COFFRE-TEMOIN-1';

/** Contexte AAD du témoin. */
const AAD_TEMOIN = 'coffre:v1:temoin';

// --- Messages canoniques (identiques dans les deux magasins) ---------------
const MSG_CODE_INCORRECT = 'Code incorrect ou coffre altéré.';
const MSG_FICHE_AU_COFFRE =
  'Cette fiche est au coffre des identités : modification refusée. ' +
  'Restaurez d\'abord l\'identité (Protection des données).';
const MSG_COFFRE_LAN =
  'Les opérations du coffre des identités exigent le poste local ' +
  '(refusées en accès réseau).';
const MSG_ARCHIVE_REQUISE =
  'Mise à l\'abri refusée : aucune archive complète vérifiée de moins de ' +
  '24 heures. Produisez une archive (écran Sauvegarde) puis recommencez.';
const MSG_SIMULATION_REJETEE =
  'Ce fichier contient un coffre de DÉMONSTRATION (chiffrement simulé) : ' +
  'il n\'entre jamais dans un registre réel.';
const MSG_COFFRE_INEXISTANT =
  'Aucun coffre des identités sur ce poste : créez-le en mettant une ' +
  'première identité à l\'abri.';
const MSG_DEJA_AU_COFFRE = 'Cette identité est déjà au coffre.';
const MSG_PAS_AU_COFFRE = 'Cette identité n\'est pas au coffre.';
const MSG_MOTIF_OBLIGATOIRE =
  'Motif obligatoire : chaque ouverture du coffre est journalisée avec sa ' +
  'raison (trace journalisée).';
const MSG_PHRASE_TROP_COURTE =
  'Phrase du coffre trop courte : 14 caractères minimum. Conseil : 4 ou 5 ' +
  'mots choisis au hasard.';

/** Longueur minimale de la phrase du coffre (même règle que les sauvegardes). */
const LONGUEUR_MIN_PHRASE_COFFRE = 14;

// --- Formats ---------------------------------------------------------------

/**
 * Contexte AAD d'une enveloppe d'identité : lie l'enveloppe à son porteur ET
 * à son pseudonyme (rejouer l'enveloppe ailleurs casse le tag GCM).
 * @param {string} personnelId
 * @param {string} pseudonyme
 * @returns {string}
 */
function aadIdentite(personnelId, pseudonyme) {
  return `coffre:v${VERSION_COFFRE}:${personnelId}:${pseudonyme}`;
}

/**
 * Libellé du pseudonyme : « Élève AAAA-NN » (NN sur 2 chiffres minimum).
 * @param {number|string} annee - année scolaire de la promotion (AAAA)
 * @param {number} numero - compteur MONOTONE par année (≥ 1)
 * @returns {{prenom: string, nom: string, libelle: string, connexion: string}}
 */
function libellePseudonyme(annee, numero) {
  const nn = String(numero).padStart(2, '0');
  const nom = `${annee}-${nn}`;
  return {
    prenom: 'Élève',
    nom,
    libelle: `Élève ${nom}`,
    connexion: `eleve-${annee}-${nn}`
  };
}

// --- Règles pures ----------------------------------------------------------

/**
 * Éligibilité d'une fiche à la mise à l'abri (candidats PRÉ-COCHÉS de la vue).
 * Règle v1 : un ÉLÈVE DÉSACTIVÉ (parti). La date de départ n'existe pas en
 * donnée — aucune règle temporelle inventée ; `dateDuJour` est accepté pour
 * une évolution future sans changer la signature.
 * @param {object} personne - fiche du personnel
 * @param {string} [dateDuJour] - AAAA-MM-JJ (réservé)
 * @returns {boolean}
 */
function estFicheEchue(personne, dateDuJour) { // eslint-disable-line no-unused-vars
  if (!personne) return false;
  return personne.typePersonne === 'ELEVE' && personne.actif === false;
}

/**
 * L'identité COMPLÈTE à chiffrer (contenu de l'enveloppe), assemblée depuis la
 * fiche et les éléments annexes fournis par le magasin.
 * @param {object} personne - fiche AVANT pseudonymisation
 * @param {object} annexes - { identifiantConnexion?: string|null,
 *   piecesJointes?: [{nomFichier, mimeType, categorie, hashSha256, base64}] }
 * @returns {object} identité (JSON sérialisable)
 */
function assemblerIdentite(personne, annexes) {
  const a = annexes || {};
  return {
    version: VERSION_COFFRE,
    personnelId: personne.id,
    nom: personne.nom ?? null,
    prenom: personne.prenom ?? null,
    email: personne.email ?? null,
    numAttestationAptitude: personne.numAttestationAptitude ?? null,
    organismeDelivreur: personne.organismeDelivreur ?? null,
    dateObtention: personne.dateObtention ?? null,
    dateFinValidite: personne.dateFinValidite ?? null,
    actif: personne.actif === undefined ? true : personne.actif,
    identifiantConnexion: a.identifiantConnexion ?? null,
    piecesJointes: (a.piecesJointes || []).map((pj) => ({
      nomFichier: pj.nomFichier,
      mimeType: pj.mimeType,
      categorie: pj.categorie ?? null,
      hashSha256: pj.hashSha256 ?? null,
      base64: pj.base64
    }))
  };
}

/**
 * Le patch de PSEUDONYMISATION de la fiche : le pseudonyme est porté par
 * prenom/nom (tous les libellés du dépôt suivent), l'identifiant chiffrable
 * est effacé, la fiche est désactivée (elle sort des sélecteurs du wizard).
 * @param {number|string} annee
 * @param {number} numero
 * @returns {object} patch à appliquer à la fiche
 */
function pseudonymiserFiche(annee, numero) {
  const pseudo = libellePseudonyme(annee, numero);
  return {
    prenom: pseudo.prenom,
    nom: pseudo.nom,
    email: null,
    numAttestationAptitude: null,
    organismeDelivreur: null,
    dateObtention: null,
    dateFinValidite: null,
    actif: false
  };
}

/**
 * Le patch de RESTAURATION de la fiche depuis une identité déchiffrée —
 * l'inverse exact de pseudonymiserFiche + assemblerIdentite (bit à bit).
 * @param {object} identite - contenu déchiffré de l'enveloppe
 * @returns {object} patch à appliquer à la fiche
 */
function restaurerIdentite(identite) {
  return {
    prenom: identite.prenom ?? null,
    nom: identite.nom ?? null,
    email: identite.email ?? null,
    numAttestationAptitude: identite.numAttestationAptitude ?? null,
    organismeDelivreur: identite.organismeDelivreur ?? null,
    dateObtention: identite.dateObtention ?? null,
    dateFinValidite: identite.dateFinValidite ?? null,
    actif: identite.actif === undefined ? true : identite.actif
  };
}

/**
 * Libellé d'affichage d'un intervenant : substitue le champ TEXTE FIGÉ par le
 * libellé de la fiche VIVANTE quand un identifiant existe (si la personne est
 * au coffre, la fiche vivante EST le pseudonyme — aucune connaissance du
 * coffre n'est nécessaire côté vue). Sans identifiant : le champ figé tel
 * quel (résidu documenté — mouvements antérieurs à la migration 16).
 * @param {string|null} champFige - ex. mouvement.technicien, controle.operateur
 * @param {string|null} personneId - ex. executeParId, operateurId, validateurId
 * @param {Map<string, object>} indexPersonnel - id → fiche vivante
 * @returns {string|null}
 */
function libelleIntervenant(champFige, personneId, indexPersonnel) {
  if (personneId && indexPersonnel && indexPersonnel.has(personneId)) {
    const fiche = indexPersonnel.get(personneId);
    const libelle = `${fiche.prenom ?? ''} ${fiche.nom ?? ''}`.trim();
    if (libelle) return libelle;
  }
  return champFige ?? null;
}

module.exports = {
  VERSION_COFFRE,
  PREFIXE_SIMULATION,
  TEXTE_TEMOIN,
  AAD_TEMOIN,
  MSG_CODE_INCORRECT,
  MSG_FICHE_AU_COFFRE,
  MSG_COFFRE_LAN,
  MSG_ARCHIVE_REQUISE,
  MSG_SIMULATION_REJETEE,
  MSG_COFFRE_INEXISTANT,
  MSG_DEJA_AU_COFFRE,
  MSG_PAS_AU_COFFRE,
  MSG_MOTIF_OBLIGATOIRE,
  MSG_PHRASE_TROP_COURTE,
  LONGUEUR_MIN_PHRASE_COFFRE,
  aadIdentite,
  libellePseudonyme,
  estFicheEchue,
  assemblerIdentite,
  pseudonymiserFiche,
  restaurerIdentite,
  libelleIntervenant
};
