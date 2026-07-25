// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — REMISE EN FILIÈRE DÉCHETS (lot B2)
//
// Module PUR (aucune entrée/sortie, aucun store) : il porte le
// vocabulaire, la mention permanente et les règles de forme du
// SUIVI INTERNE de remise en filière.
//
// Pourquoi ce module existe (constat A07) : l'objet interne du
// logiciel s'appelait « BSFF », comme le bordereau de suivi de
// déchets dématérialisé obligatoire. Il en portait le nom, le
// libellé d'écran, l'en-tête de colonne du dossier d'audit — sans
// en être un. Un document interne qui emprunte le nom d'un document
// réglementaire finit par en tenir lieu : c'est exactement ce qu'il
// ne doit pas faire. Le logiciel dit désormais ce qu'il est.
//
// Miroir littéral CommonJS côté serveur : server/remise-filiere.js
// (parité prouvée par server/test-remise-filiere-parite.mjs).
// ============================================================

/** Nom de l'objet interne, partout où l'utilisateur le lit. */
export const LIBELLE_SUIVI = 'Suivi interne de remise en filière';

/** Forme courte (colonnes de tableau, boutons). */
export const LIBELLE_SUIVI_COURT = 'Suivi interne';

/**
 * MENTION PERMANENTE ET NON AMBIGUË. Affichée sur l'écran des déchets,
 * dans la modale de création, et reportée au sommaire du dossier
 * d'audit scellé. Elle ne cite AUCUNE date ni référence d'arrêté : le
 * fait réglementaire précis relève du propriétaire du registre.
 */
export const MENTION_BORDEREAU_OFFICIEL =
  'Document INTERNE au registre : il ne remplace pas le bordereau de suivi '
  + 'de déchets dématérialisé obligatoire, qui s’établit sur la plateforme '
  + 'nationale prévue à cet effet. Le bordereau officiel doit être joint en '
  + 'pièce jointe et son numéro reporté sur ce suivi.';

/** Libellé du champ qui porte le numéro du bordereau RÉEL (externe). */
export const LIBELLE_BORDEREAU_EXTERNE =
  'N° du bordereau dématérialisé officiel';
