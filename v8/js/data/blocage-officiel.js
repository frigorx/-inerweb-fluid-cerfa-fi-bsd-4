// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — BLOCAGE DUR DU MODE OFFICIEL (module PUR)
// Condition 2 du plan audit-proof — LA liste des conditions bloquantes
// vit dans docs/CONDITIONS-BLOCANTES-OFFICIEL.md (relue par Franck) :
// une condition = une entrée ici, dans le MÊME ordre.
//
// CONTRAT : evaluerBlocagesOfficiel(cadre) → { ok, blocages:[{code,motif}] }.
// Le cadre est un objet de FAITS précalculés par le store appelant (aucune
// I/O ici) ; le moteur applique la liste, filtrée par `moment` (PASSAGE <
// SOUMISSION < VALIDATION). Dupliqué en littéral CommonJS côté serveur
// (server/blocage-officiel.js) — parité prouvée par test-blocage-officiel.
//
// ⚠️ Les conditions 1 à 4 (établissement) restent calculées par
// peutPasserEnOfficiel (SPEC §7.2) : le cadre porte leurs motifs tels
// quels (etablissementMotifs) — pas de double source de vérité.
// ============================================================

/** Seuil PRP « fluide vierge interdit en maintenance » (avis 16/07, Q10). */
export const SEUIL_PRP_VIERGE = 2500;

/**
 * VERROU DE LIVRAISON (condition n° 13 de la liste) : reste à `true` tant
 * que les lots C (double signature réelle) et D (scellement externe) ne
 * sont pas livrés — le mode Officiel est donc REFUSÉ partout. À basculer
 * ICI et dans le miroir serveur, nulle part ailleurs.
 */
export const VERROU_LIVRAISON = true;

/** Les trois moments de contrôle (ordre croissant d'exigence). */
export const MOMENTS_OFFICIEL = ['PASSAGE', 'SOUMISSION', 'VALIDATION'];

const NIVEAU_MOMENT = { PASSAGE: 1, SOUMISSION: 2, VALIDATION: 3 };

/**
 * Évalue la liste des conditions bloquantes du mode OFFICIEL.
 *
 * @param {object} cadre                Faits précalculés (aucune I/O) :
 * @param {string} cadre.moment         'PASSAGE' | 'SOUMISSION' | 'VALIDATION'
 * @param {string[]} cadre.etablissementMotifs  motifs de peutPasserEnOfficiel (conditions 1-4)
 * @param {?{recente:boolean, ageHeures:?number, seuilHeures:number}} cadre.sauvegarde
 *                                      état de la sauvegarde du poste ; null = sans objet (démo)
 * @param {?{lie:boolean, motif:?string}} cadre.validateur
 *                                      lien validateur ↔ session ; null = sans objet
 * @param {boolean} cadre.verrouLivraison  conditions 3 et 4 du plan non livrées
 * @param {?object} cadre.fiche         faits de la fiche (null = pas encore de fiche) :
 *   { type, machinePresente, fluide, peseeAvantKg, peseeApresKg, causePresente,
 *     controleStatut, controlePeriodiqueRequis, fluideInflammable,
 *     sourceVierge, prp, signaturePresente, technicienPresent,
 *     intervenant: null | { nom, actif, habilitationActive },
 *     signatureTechnicienValide, signatureDetenteurValide — lot C (C1),
 *     tri-état : true (valide) | false (absente) | 'PERIMEE' (posée puis
 *     fiche modifiée, révision divergente) }
 * @returns {{ok: boolean, blocages: Array<{code: string, motif: string}>}}
 */
export function evaluerBlocagesOfficiel(cadre) {
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

/**
 * Message CANONIQUE de refus (les 3 moments l'utilisent tel quel : les
 * tests et l'interface s'appuient sur son début stable).
 * @param {Array<{code: string, motif: string}>} blocages
 * @returns {string}
 */
export function messageRefusOfficiel(blocages) {
  const n = blocages.length;
  return `Mode Officiel refusé (${n} condition${n > 1 ? 's' : ''} ` +
    `bloquante${n > 1 ? 's' : ''}) : ` +
    blocages.map((b) => b.motif).join(' · ');
}
