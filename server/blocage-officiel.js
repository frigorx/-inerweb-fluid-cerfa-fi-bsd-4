// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
'use strict';

// ============================================================
// BLOCAGE DUR DU MODE OFFICIEL — MIROIR LITTÉRAL du module pur ESM
// v8/js/data/blocage-officiel.js (le serveur est CommonJS : littéraux
// dupliqués, parité prouvée par server/test-blocage-officiel.mjs qui
// DISCRIMINE — toute divergence de sortie casse la suite).
// Ne modifier QUE si le module ESM change, et à l'identique.
// ============================================================

/** Seuil PRP « fluide vierge interdit en maintenance » (avis 16/07, Q10). */
const SEUIL_PRP_VIERGE = 2500;

/**
 * VERROU DE LIVRAISON (condition n° 13 de la liste) : REFERMÉ le 20/07/2026
 * (T1, audit externe #2). Ouvert le 19/07 (brique C5), refermé le lendemain
 * le temps de traiter les priorités P0 (docs/CONSTATS-AUDIT-EXTERNE-2026-07-20.md,
 * cible « registre officiel unique »). La mécanique reste en place (ici et dans
 * le miroir ESM, nulle part ailleurs) : à `true` le mode Officiel est fermé
 * partout ; rebasculer à `false` le rouvre. NON configurable par l'environnement
 * (zéro flag) — volontaire pour l'audit.
 */
const VERROU_LIVRAISON = true;

/** Les trois moments de contrôle (ordre croissant d'exigence). */
const MOMENTS_OFFICIEL = ['PASSAGE', 'SOUMISSION', 'VALIDATION'];

/** Miroir EXACT de MSG_CONTROLE_DIRECT_OFFICIEL (P7-c, voir le module ESM). */
const MSG_CONTROLE_DIRECT_OFFICIEL =
  'Contrôle direct refusé en mode Officiel : un contrôle d’étanchéité '
  + 'officiel s’enregistre comme un mouvement de type CONTRÔLE '
  + '(parcours signé, scellé et conservé).';

const NIVEAU_MOMENT = { PASSAGE: 1, SOUMISSION: 2, VALIDATION: 3 };

/** Miroir EXACT de evaluerBlocagesOfficiel (voir le module ESM). */
function evaluerBlocagesOfficiel(cadre) {
  const c = cadre || {};
  const niveau = NIVEAU_MOMENT[c.moment];
  if (!niveau) {
    throw new Error(
      `Moment de contrôle inconnu : ${c.moment} ` +
      `(attendu : ${MOMENTS_OFFICIEL.join(', ')}).`);
  }
  const blocages = [];
  const poser = (code, motif) => blocages.push({ code, motif });

  // Conditions 1-4 — établissement (SPEC §7.2, motifs repris tels quels).
  for (const motif of c.etablissementMotifs ?? []) {
    poser('ETABLISSEMENT', motif);
  }

  // Condition 5 — sauvegarde vérifiée récente du poste (serveur seulement).
  if (c.sauvegarde && !c.sauvegarde.recente) {
    poser('SAUVEGARDE', c.sauvegarde.ageHeures == null
      ? 'Aucune sauvegarde vérifiée du poste (aucune archive valide).'
      : 'Sauvegarde du poste trop ancienne : dernière archive valide il y a ' +
        `${Math.round(c.sauvegarde.ageHeures)} h ` +
        `(seuil réglé : ${c.sauvegarde.seuilHeures} h).`);
  }

  // Conditions 6 à 10 — la fiche (à partir de la SOUMISSION).
  const fiche = niveau >= NIVEAU_MOMENT.SOUMISSION ? c.fiche : null;
  if (fiche) {
    // 8 — complétude (machine, fluide, pesées, cause).
    if (fiche.type !== 'TRANSFERT' && !fiche.machinePresente) {
      poser('COMPLETUDE',
        'Fiche incomplète : aucune machine désignée pour ce type ' +
        'd’intervention.');
    }
    if (!fiche.fluide) {
      poser('COMPLETUDE', 'Fiche incomplète : fluide non renseigné.');
    }
    const av = fiche.peseeAvantKg;
    const ap = fiche.peseeApresKg;
    if (!Number.isFinite(av) || !Number.isFinite(ap) || av === ap) {
      poser('COMPLETUDE',
        'Fiche incomplète : pesées avant et après obligatoires (et ' +
        'différentes) pour établir la quantité.');
    }
    if (fiche.type === 'CHARGE_APPOINT' && !fiche.causePresente) {
      poser('COMPLETUDE',
        'Fiche incomplète : cause de l’appoint obligatoire (origine de la ' +
        'perte de fluide).');
    }

    // 6 et 7 — intervenant désigné, actif, habilité.
    if (!fiche.intervenant) {
      poser('INTERVENANT',
        'Aucun intervenant désigné (« exécuté par ») sur la fiche.');
    } else {
      if (!fiche.intervenant.actif) {
        poser('INTERVENANT',
          `Intervenant ${fiche.intervenant.nom} désactivé : il ne peut pas ` +
          'figurer sur une fiche officielle.');
      }
      if (!fiche.intervenant.habilitationActive) {
        poser('APTITUDE',
          'Aucune habilitation F-Gas active et en cours de validité pour ' +
          `${fiche.intervenant.nom}.`);
      }
      // 16 — aptitude opposable (P0-5) : l'habilitation COUVRE cette
      // intervention (catégorie × opération × fluide × charge, moteur
      // d'aptitude — fait précalculé par le store, absent = sans objet).
      // Jamais en doublon de la 7 : sans habilitation, elle seule parle.
      if (fiche.intervenant.habilitationActive &&
          fiche.intervenant.aptitude &&
          fiche.intervenant.aptitude.autorise === false) {
        poser('APTITUDE_PORTEE',
          `Habilitation de ${fiche.intervenant.nom} inadaptée à cette ` +
          `intervention : ${fiche.intervenant.aptitude.motif}.`);
      }
    }

    // 17 — détection permanente OBLIGATOIRE absente (P1-1, E2). Miroir
    // EXACT du module ESM. En CONSEIL, seule l'alerte le signale.
    if (fiche.detectionObligatoireAbsente) {
      poser('DETECTION_OBLIGATOIRE',
        'Système de détection permanente de fuites obligatoire (charge ' +
        'au-delà du seuil haut) mais absent de l’équipement.');
    }

    // 9 — contrôle d'étanchéité exigé (machine soumise OU fluide inflammable).
    const controleExige =
      (fiche.type === 'CHARGE_APPOINT' || fiche.type === 'MISE_EN_SERVICE') &&
      (fiche.controlePeriodiqueRequis || fiche.fluideInflammable);
    if (controleExige && (fiche.controleStatut ?? 'SANS_OBJET') === 'SANS_OBJET') {
      poser('CONTROLE',
        'Contrôle d’étanchéité non renseigné : obligatoire pour cette ' +
        'intervention (machine soumise au contrôle périodique ou fluide ' +
        'inflammable).');
    }

    // 10 — charge d'appoint en fluide vierge PRP ≥ 2500 (avis Q10).
    if (fiche.type === 'CHARGE_APPOINT' && fiche.sourceVierge &&
        Number(fiche.prp) >= SEUIL_PRP_VIERGE) {
      poser('FLUIDE_VIERGE',
        `Charge en fluide VIERGE de PRP ${fiche.prp} (≥ ${SEUIL_PRP_VIERGE}) ` +
        'interdite en maintenance (règl. UE 2024/573).');
    }

    // 11 — signature du technicien (à la VALIDATION seulement).
    if (niveau >= NIVEAU_MOMENT.VALIDATION) {
      if (!fiche.signaturePresente) {
        poser('SIGNATURE',
          'Signature du technicien absente : une fiche officielle doit être ' +
          'signée avant validation.');
      }
      if (!fiche.technicienPresent) {
        poser('SIGNATURE',
          'Nom du technicien absent : une fiche officielle doit porter ' +
          'l’identité de son signataire.');
      }

      // 14 et 15 — signatures RÉELLES (lot C, brique C1 — condition 3 du
      // plan) : technicien PUIS détenteur, chacune valant pour la révision
      // qu'elle a signée. Tri-état : true (valide) | false (absente) |
      // 'PERIMEE' (fiche modifiée après signature) — une signature périmée
      // n'est JAMAIS ignorée, elle se recommence.
      if (fiche.signatureTechnicienValide !== true) {
        poser('SIGNATURE_TECHNICIEN',
          fiche.signatureTechnicienValide === 'PERIMEE'
            ? 'Fiche modifiée après signature : recommencez les signatures ' +
              '(signature du technicien périmée).'
            : 'Signature réelle du technicien absente : le technicien signe ' +
              'la fiche avant la validation officielle.');
      }
      if (fiche.signatureDetenteurValide !== true) {
        poser('SIGNATURE_DETENTEUR',
          fiche.signatureDetenteurValide === 'PERIMEE'
            ? 'Fiche modifiée après signature : recommencez les signatures ' +
              '(signature du détenteur périmée).'
            : 'Signature réelle du détenteur absente : le détenteur (ou son ' +
              'délégataire) signe la fiche avant la validation officielle.');
      }
    }
  }

  // Condition 12 — validateur = personne connectée (VALIDATION, serveur).
  if (niveau >= NIVEAU_MOMENT.VALIDATION && c.validateur && !c.validateur.lie) {
    poser('VALIDATEUR', c.validateur.motif ||
      'Le validateur doit être la personne connectée.');
  }

  // Condition 13 — verrou de livraison (lots C et D du plan).
  if (c.verrouLivraison) {
    poser('VERROU_LIVRAISON',
      'Le mode Officiel n’est pas encore ouvert : double signature du ' +
      'détenteur et conservation du PDF scellé (conditions 3 et 4 du plan ' +
      'audit-proof) en cours de livraison.');
  }

  return { ok: blocages.length === 0, blocages };
}

/** Miroir EXACT de messageRefusOfficiel (voir le module ESM). */
function messageRefusOfficiel(blocages) {
  const n = blocages.length;
  return `Mode Officiel refusé (${n} condition${n > 1 ? 's' : ''} ` +
    `bloquante${n > 1 ? 's' : ''}) : ` +
    blocages.map((b) => b.motif).join(' · ');
}

module.exports = {
  SEUIL_PRP_VIERGE,
  VERROU_LIVRAISON,
  MOMENTS_OFFICIEL,
  MSG_CONTROLE_DIRECT_OFFICIEL,
  evaluerBlocagesOfficiel,
  messageRefusOfficiel
};
