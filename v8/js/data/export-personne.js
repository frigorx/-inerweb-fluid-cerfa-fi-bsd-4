// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// export-personne.js — Assemble l'export RGPD des données d'UNE personne.
//
// CONTRAT (rôle) : fonction PURE qui, à partir des collections déjà lues d'un
//   store (personnel, habilitations, mentions, signatures, mouvements,
//   contrôles, pièces jointes), reconstitue tout ce qui concerne une personne,
//   pour les droits d'ACCÈS et de PORTABILITÉ (RGPD art. 15 et 20 ; lot E ①).
// ENTRÉES : personneId (string), sources (objet de tableaux issus des getters
//   du store), genereLe (horodatage ISO fourni par l'appelant).
// SORTIE : enveloppe { application, version, genereLe, personneId, personne,
//   habilitations, mentions, signatures, interventions, controles,
//   piecesJointes, avertissement }. AUCUN binaire (images de signature et
//   scans d'attestation restent téléchargeables séparément depuis la fiche).
// DÉPENDANCES : aucune (DOM / réseau / store INTERDITS). Ce module est recopié
//   EN LITTÉRAL dans server/export-personne.js — parité prouvée par
//   test-export-personne.mjs.
// PIÈGES : ne dépend d'AUCUN ordre d'entrée pour les collections qu'il trie
//   lui-même (signatures, pièces jointes) ; le rapprochement par nom
//   (technicien déclaré, opérateur — champs texte libres) est insensible à la
//   casse et aux accents, best-effort. Le journal d'audit n'est PAS inclus
//   (conservé pour la valeur probante du registre, durée réglementaire).
// ============================================================

export const VERSION_EXPORT_PERSONNE = 1;

/** Normalise un texte pour rapprochement : minuscules, sans accent, espaces réduits. */
function normaliserNom(valeur) {
  const decompose = String(valeur ?? '').normalize('NFD');
  let sortie = '';
  for (const car of decompose) {
    const code = car.codePointAt(0);
    if (code >= 0x0300 && code <= 0x036f) continue; // marques combinantes
    sortie += car;
  }
  return sortie.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Étiquettes de nom possibles d'une personne (« prénom nom » et « nom prénom »). */
function etiquettesNom(personne) {
  const nom = normaliserNom(personne.nom);
  const prenom = normaliserNom(personne.prenom);
  const etiquettes = new Set();
  if (prenom && nom) {
    etiquettes.add(`${prenom} ${nom}`);
    etiquettes.add(`${nom} ${prenom}`);
  }
  return etiquettes;
}

/** Libellés lisibles des rôles joués sur un mouvement (document remis à la personne). */
const LIBELLE_ROLE_INTERVENTION = {
  TECHNICIEN_DECLARE: 'Technicien (nom déclaré sur la fiche)',
  VALIDATEUR: 'Validateur',
  EXECUTANT: 'Exécutant',
  SUPERVISEUR: 'Superviseur',
  RESPONSABLE_REGISTRE: 'Responsable du registre'
};

/**
 * Assemble l'export des données d'une personne.
 * @param {string} personneId
 * @param {object} sources - { personnel, habilitations, mentions,
 *   signaturesMouvement, mouvements, controles, piecesJointes }
 * @param {string} genereLe - horodatage ISO
 * @returns {object} enveloppe d'export
 * @throws {Error} si la personne est introuvable
 */
export function assemblerExportPersonne(personneId, sources, genereLe) {
  const s = sources || {};
  const personnel = s.personnel || [];
  const personne = personnel.find((p) => p && p.id === personneId);
  if (!personne) {
    throw new Error(`Personne introuvable : ${personneId}.`);
  }
  const etiquettes = etiquettesNom(personne);

  const habilitations = (s.habilitations || [])
    .filter((h) => h && h.personneId === personneId);

  const mentions = (s.mentions || [])
    .filter((m) => m && m.personneId === personneId);

  const signatures = (s.signaturesMouvement || [])
    .filter((sig) => sig && (
      sig.sessionPersonnelId === personneId ||
      (etiquettes.size > 0 && etiquettes.has(
        `${normaliserNom(sig.prenom)} ${normaliserNom(sig.nom)}`))))
    .slice()
    .sort((a, b) => {
      if (a.dateHeure !== b.dateHeure) return a.dateHeure < b.dateHeure ? -1 : 1;
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    })
    .map((sig) => ({
      id: sig.id,
      mouvementId: sig.mouvementId,
      role: sig.role,
      nom: sig.nom,
      prenom: sig.prenom,
      qualite: sig.qualite ?? null,
      organisation: sig.organisation ?? null,
      parDelegation: sig.parDelegation ?? null,
      dateHeure: sig.dateHeure,
      declaration: sig.declaration ?? null,
      versionDocument: sig.versionDocument ?? null,
      sha256Document: sig.sha256Document ?? null
    }));

  const interventions = [];
  for (const mv of (s.mouvements || [])) {
    if (!mv) continue;
    const roles = [];
    if (mv.technicien && etiquettes.has(normaliserNom(mv.technicien))) {
      roles.push('TECHNICIEN_DECLARE');
    }
    if (mv.validateurId === personneId) roles.push('VALIDATEUR');
    if (mv.executeParId === personneId) roles.push('EXECUTANT');
    if (mv.superviseurId === personneId) roles.push('SUPERVISEUR');
    if (mv.responsableRegistreId === personneId) roles.push('RESPONSABLE_REGISTRE');
    if (roles.length === 0) continue;
    interventions.push({
      numero: mv.numero,
      date: mv.date,
      type: mv.type,
      statut: mv.statut,
      mode: mv.mode,
      machineId: mv.machineId ?? null,
      fluide: mv.fluide ?? null,
      roles: roles.map((r) => LIBELLE_ROLE_INTERVENTION[r] || r)
    });
  }

  const controles = (s.controles || [])
    .filter((c) => c && (
      c.operateurId === personneId ||
      (etiquettes.size > 0 && c.operateur &&
        etiquettes.has(normaliserNom(c.operateur)))))
    .map((c) => ({
      id: c.id,
      date: c.date,
      machineId: c.machineId ?? null,
      resultat: c.resultat ?? null,
      operateur: c.operateur ?? null,
      operateurId: c.operateurId ?? null
    }));

  const piecesJointes = (s.piecesJointes || [])
    .filter((pj) => pj && pj.entiteType === 'personne' &&
      pj.entiteId === personneId)
    .slice()
    .sort((a, b) => {
      const da = a.dateAjout ?? '';
      const dbb = b.dateAjout ?? '';
      if (da !== dbb) return da < dbb ? -1 : 1;
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    })
    .map((pj) => ({
      id: pj.id,
      categorie: pj.categorie,
      nomFichier: pj.nomFichier,
      mimeType: pj.mimeType,
      taille: pj.taille,
      hashSha256: pj.hashSha256 ?? null,
      dateAjout: pj.dateAjout ?? null
    }));

  return {
    application: 'inerWeb Fluide',
    version: VERSION_EXPORT_PERSONNE,
    genereLe,
    personneId,
    personne: { ...personne },
    habilitations,
    mentions,
    signatures,
    interventions,
    controles,
    piecesJointes,
    avertissement:
      'Export des données à caractère personnel concernant cette personne ' +
      '(droits d’accès et de portabilité, RGPD art. 15 et 20). Les fichiers ' +
      'binaires (images de signature, scans d’attestation) ne sont pas inclus ' +
      'ici : ils restent téléchargeables individuellement depuis la fiche du ' +
      'personnel. Le journal d’audit du registre, conservé pour sa valeur ' +
      'probante réglementaire, n’est pas repris dans cet export.'
  };
}
