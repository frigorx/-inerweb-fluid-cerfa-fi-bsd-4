// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés.
// Revue des anciennes écritures, sans modification ni effacement du registre.
// Repère organisationnel : fin de l'année scolaire suivante. Ce n'est pas
// une durée légale universelle ni une preuve que les données sont anonymes.
export function bilanConservationFormation(mouvements, jour) {
  const dateValide = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  if (!dateValide(jour)) throw new Error('Date de revue invalide.');
  const bilan = { total: 0, aRevoir: 0, datesManquantes: 0, tracesNominatives: 0 };
  for (const m of mouvements || []) {
    if (m.mode !== 'FORMATION') continue;
    bilan.total++;
    if (m.technicien || m.executeParId || m.encadreParId || m.signature) bilan.tracesNominatives++;
    const date = typeof m.date === 'string' ? m.date.slice(0, 10) : '';
    if (!dateValide(date)) { bilan.datesManquantes++; continue; }
    const debutAnnee = Number(date.slice(0, 4)) - (date.slice(5, 7) < '09' ? 1 : 0);
    if (jour > `${debutAnnee + 2}-08-31`) bilan.aRevoir++;
  }
  return bilan;
}
