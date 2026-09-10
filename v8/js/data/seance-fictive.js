// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés.
// Indicateur d'URL uniquement : aucun contenu de séance dans le stockage.
export function estSeanceFictive(emplacement = globalThis.location) {
  return new URLSearchParams(emplacement?.search || '').get('seance') === 'fictive';
}

export const LIEN_SEANCE_FICTIVE = '?seance=fictive#/dashboard';
