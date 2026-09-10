// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés.
// Règles de sélection uniquement : aucune durée légale n'est présumée.
export function dateRevueValide(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
}

export function preparerRevueFormation(mouvements, avant, jour, pieces = [], signatures = [], controles = []) {
  if (!dateRevueValide(avant) || !dateRevueValide(jour) || avant > jour) {
    throw new Error('Choisissez une date de coupure valide, au plus tard aujourd’hui.');
  }
  const lignes = [];
  for (const m of mouvements) {
    if (m.mode !== 'FORMATION') continue;
    // Une date métier est exactement AAAA-MM-JJ, sans suffixe illisible.
    const date = typeof m.date === 'string' ? m.date : '';
    const valide = dateRevueValide(date);
    if (valide && date >= avant) continue;
    let motif = '';
    if (!valide) motif = 'Date absente ou invalide : examen manuel.';
    else if (m.statut !== 'BROUILLON') motif = 'Écriture soumise ou scellée : traitement distinct nécessaire.';
    else if (m.hashEcriture || m.contreEcritureDe || controles.some(c => c.mouvementId === m.id)
      || mouvements.some(c => c.contreEcritureDe === m.id)) motif = 'Lien avec une trace protégée : examen manuel.';
    lignes.push({ id: m.id, numero: m.numero || m.id, date, statut: m.statut,
      supprimable: !motif, motif,
      pieces: pieces.filter(p => p.entiteType === 'MOUVEMENT' && p.entiteId === m.id).length,
      signatures: signatures.filter(s => s.mouvementId === m.id).length });
  }
  lignes.sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
  return { avant, lignes, supprimables: lignes.filter(l => l.supprimable).length,
    protegees: lignes.filter(l => !l.supprimable).length };
}

export function verifierSelectionFormation(revue, ids, confirmation, motif, copiesExternes) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 200 || new Set(ids).size !== ids.length
    || ids.some(id => typeof id !== 'string' || !revue.lignes.some(l => l.id === id && l.supprimable))) {
    throw new Error('Sélection invalide : 1 à 200 brouillons de formation admissibles, sans doublon.');
  }
  if (confirmation !== `SUPPRIMER ${ids.length}` || copiesExternes !== true
    || typeof motif !== 'string' || motif.trim().length < 10 || motif.trim().length > 500) {
    throw new Error('Confirmez le nombre, le traitement des copies restantes et un motif de 10 à 500 caractères.');
  }
}
