// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés.
// Portée des indicateurs : une alerte applicative ne constitue pas un avis juridique.
import { VERROU_LIVRAISON } from './blocage-officiel.js';
import { calculerExemption, EXEMPTION_HERMETIQUE_ACTIVE } from './equipement.js';
import { categorieCadre7 } from './reglementation-fluides.js';

export const LIBELLES_SUIVI = {
  VERT: 'Aucune alerte détectée',
  ORANGE: 'Points à vérifier',
  ROUGE: 'Points prioritaires à traiter'
};

export const NOTE_PORTEE = 'Ce suivi porte sur les données saisies et les règles du logiciel. '
  + 'Il ne certifie pas la conformité de l’établissement. Une règle de prudence peut être '
  + 'plus stricte que le texte applicable ; vérifiez le fondement avant de conclure à une non-conformité.';

export function etatActivationOfficiel(configuration, verrou = VERROU_LIVRAISON) {
  const motifs = [...(configuration?.motifs || [])];
  if (verrou) motifs.unshift('Mode Officiel verrouillé dans cette version : aucune validation officielle possible.');
  return { ok: !verrou && configuration?.ok === true, motifs };
}

// Ces familles sont des rappels de workflow, pas des échéances réglementaires.
export function natureAlerte(alerte) {
  return /^alr-(brouillon|soumis|pesee)-/.test(alerte?.id || '')
    ? 'Suivi interne' : 'Fondement et situation à vérifier';
}

export function precisionControle(machine, fluide) {
  if (!fluide) return 'Fluide inconnu : vérifier le référentiel avant de conclure.';
  const categorie = categorieCadre7(fluide);
  if (!categorie) return 'Hors contrôle périodique F-Gas. Pour une intervention réelle, '
    + 'utiliser le bon d’intervention interne, à compléter, signer et archiver. '
    + 'Le mode Formation reste réservé aux exercices ; les autres obligations restent à vérifier.';
  if (!EXEMPTION_HERMETIQUE_ACTIVE && calculerExemption(categorie, fluide, machine).exempte) {
    return 'PRÉCAUTION DU LOGICIEL : l’exemption hermétique prévue par l’article 5 '
      + 'du règlement 2024/573 n’est pas appliquée au calcul affiché. Vérifier ses '
      + 'conditions avant de qualifier une échéance de non-conformité réglementaire.';
  }
  return 'Fréquence calculée à partir du référentiel et des données saisies ; '
    + 'vérifier le champ d’application, les exceptions et les justificatifs.';
}
