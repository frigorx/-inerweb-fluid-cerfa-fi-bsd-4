// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// MACARON DE CONTRÔLE (report v7 → v8, repensé par Franck 25/07/2026).
//
// La v7 imprimait un autocollant rond « CONTRÔLE CONFORME » (bleu) ou
// « FUITE DÉTECTÉE » (rouge) à coller sur la machine. Franck : plutôt que
// du papier, le technicien SCANNE le QR de la machine (→ fiche machine) et
// voit tout de suite l'état de contrôle en pastille de couleur + la date.
//
// Module PUR (aucune I/O, aucune horloge) : la date de référence vient de
// l'appelant. Consommé par la fiche machine ; à partir des mêmes données
// qu'elle charge déjà (contrôles, dossiers de fuite, fréquence, échéance).
//
// ⭐ Franck a demandé « bleu ou rouge ». On ajoute ORANGE (échéance
// dépassée / jamais contrôlé) et GRIS (hors périmètre F-Gas) : afficher un
// macaron BLEU « conforme » sur une machine dont le contrôle est échu
// serait un mensonge — jamais rassurer à tort.
// ============================================================

/** États possibles du macaron (couleur + intention). */
export const COULEURS_MACARON = ['BLEU', 'ROUGE', 'ORANGE', 'GRIS'];

/**
 * Statut de contrôle d'une machine, pour le macaron au scan du QR.
 *
 * @param {object} p
 * @param {Array<{resultat?: string, date?: string}>} p.controles
 *        contrôles de LA machine, triés date DÉCROISSANTE (getControles).
 * @param {Array<{statut?: string, dateDetection?: string}>} p.dossiersFuite
 *        dossiers de fuite de la machine, le plus récent EN TÊTE.
 * @param {?number} p.frequenceMois  fréquence de contrôle (null = hors
 *        périmètre du contrôle d'étanchéité F-Gas).
 * @param {?string} p.prochainControle  échéance calculée (AAAA-MM-JJ) ou null.
 * @param {string}  p.jour  date de référence (AAAA-MM-JJ), fournie par l'appelant.
 * @returns {{ couleur: string, libelle: string, detail: string,
 *   dateVerification: ?string }}
 */
export function statutMacaron({ controles = [], dossiersFuite = [],
  frequenceMois = null, prochainControle = null, jour } = {}) {
  const ctrls = Array.isArray(controles) ? controles : [];
  const fuites = Array.isArray(dossiersFuite) ? dossiersFuite : [];

  // 1. Fuite NON RÉSOLUE (dossier le plus récent pas encore FERMÉ) : rouge.
  //    Prime sur tout — une machine qui fuit n'est jamais « conforme ».
  const fuiteActive = fuites.find((d) => d && d.statut && d.statut !== 'FERMEE');
  if (fuiteActive) {
    return {
      couleur: 'ROUGE',
      libelle: 'Fuite détectée',
      detail: 'Fuite non résolue : intervention requise avant remise en état.',
      dateVerification: fuiteActive.dateDetection ?? null
    };
  }

  // 2. Machine hors périmètre du contrôle d'étanchéité F-Gas : gris.
  if (!frequenceMois) {
    return {
      couleur: 'GRIS',
      libelle: 'Hors contrôle d’étanchéité F-Gas',
      detail: 'Cet équipement n’est pas soumis au contrôle périodique '
        + '(d’autres obligations peuvent s’appliquer : EN 378, ICPE…).',
      dateVerification: null
    };
  }

  // Dernier contrôle CONFORME (les contrôles sont triés date décroissante).
  const dernierConforme = ctrls.find((c) => c && c.resultat === 'CONFORME');

  // 3. Soumise au contrôle mais JAMAIS contrôlée conforme : orange.
  if (!dernierConforme) {
    return {
      couleur: 'ORANGE',
      libelle: 'Contrôle à réaliser',
      detail: 'Aucun contrôle d’étanchéité conforme enregistré pour cet '
        + 'équipement soumis au contrôle périodique.',
      dateVerification: null
    };
  }

  // 4. Échéance dépassée : orange (jamais bleu — ce serait rassurer à tort).
  if (prochainControle && jour && String(prochainControle) < String(jour)) {
    return {
      couleur: 'ORANGE',
      libelle: 'Contrôle à refaire (échéance dépassée)',
      detail: 'Le contrôle périodique était dû le '
        + formatJj(prochainControle) + '.',
      dateVerification: dernierConforme.date ?? null
    };
  }

  // 5. Conforme, dans les délais : bleu.
  return {
    couleur: 'BLEU',
    libelle: 'Contrôle conforme',
    detail: prochainControle
      ? 'Prochain contrôle attendu le ' + formatJj(prochainControle) + '.'
      : 'Dernier contrôle d’étanchéité conforme.',
    dateVerification: dernierConforme.date ?? null
  };
}

/** AAAA-MM-JJ → JJ/MM/AAAA (aide d'affichage locale, sans dépendance). */
function formatJj(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso ?? '');
}
