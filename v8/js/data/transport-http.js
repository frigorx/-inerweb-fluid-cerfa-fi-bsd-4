// ============================================================
// inerWeb Fluide v8 — Transport HTTP du LocalStore (V9-E3)
//
// Transport NAVIGATEUR : chaque appel du LocalStore devient un
// POST /api/:methode (corps JSON { params }), et la réponse enveloppée
// { ok, resultat } / { ok:false, erreur, code } est désenveloppée :
//   succès → resultat (déjà une copie fraîche, sérialisée par le réseau) ;
//   échec  → throw new Error(erreur) MOT POUR MOT (le message français
//            du serveur intact — l'interface s'appuie dessus).
//
// Signature unique du contrat de transport :
//   transport(methode: string, params: object) => Promise<any>
// ============================================================

/**
 * Crée le transport HTTP du LocalStore.
 * @param {string} [base] Préfixe des routes (défaut : '/api').
 * @returns {(methode: string, params: object) => Promise<any>}
 */
export function creerTransportHttp(base = '/api') {
  return async function transport(methode, params) {
    let reponse;
    try {
      reponse = await fetch(`${base}/${methode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: params ?? {} })
      });
    } catch (erreur) {
      throw new Error(
        `Serveur local injoignable (${methode}) : ${erreur.message}`);
    }

    let enveloppe;
    try {
      enveloppe = await reponse.json();
    } catch {
      throw new Error(
        `Réponse illisible du serveur local (${methode}, HTTP ${reponse.status}).`);
    }

    if (enveloppe && enveloppe.ok === true) {
      return enveloppe.resultat;
    }
    // Échec métier ou technique : on relève le message serveur mot pour mot.
    throw new Error(
      (enveloppe && enveloppe.erreur) ||
      `Erreur du serveur local (${methode}, HTTP ${reponse.status}).`);
  };
}
