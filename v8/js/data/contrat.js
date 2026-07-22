// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — LE CONTRAT DataStore (V9-E0)
//
// Ce module FIGE l'interface que tout magasin de données doit
// respecter : le DemoStore d'aujourd'hui (navigateur, monde
// fictif) comme le LocalStore de demain (fetch REST → serveur
// Node → SQLite) et l'éventuel CloudStore. Le front ne sait
// jamais quel store il a en face : ce contrat est la seule
// frontière (VISION-V9-V10 §2).
//
// Il est vérifié mécaniquement par test-contrat.mjs, qui tourne
// contre N'IMPORTE quelle implémentation : toute divergence de
// surface OU de sémantique casse la suite (leçon du bug v7
// « wizard/générateur divergents » — plus jamais à la main).
//
// Règles transverses du contrat (vérifiées par la suite) :
//  1. Toutes les méthodes sont asynchrones (retournent une
//     Promise), SAUF surChangement (synchrone).
//  2. Toute lecture retourne des COPIES : muter la valeur reçue
//     n'a aucun effet sur l'état du store.
//  3. Toute violation métier lève Error avec un message en
//     FRANÇAIS — exception : importerJSON retourne false pour un
//     fichier illisible (et ne lève que pour un fichier forgé).
//  4. Chaque mutation réussie : journalise (append-only), puis
//     persiste, puis notifie les abonnés surChangement.
//  5. Les contrôles de faisabilité précèdent TOUT effet : jamais
//     de mutation partielle.
//  6. Une écriture VALIDE ou ANNULE est FIGÉE : toute tentative
//     de modification répond par MSG_ECRITURE_FIGEE ; la seule
//     correction est la contre-écriture.
//  7. Les dates métier sont « AAAA-MM-JJ » (locales, sans
//     fuseau) ; seuls journal d'audit, pièces jointes et
//     enveloppe d'export portent un horodatage ISO complet.
//  8. Les masses sont des nombres (jamais des chaînes),
//     arrondies au gramme.
// ============================================================

/** Version du contrat (à incrémenter à chaque évolution de surface). */
export const VERSION_CONTRAT = 8;

/**
 * Message canonique opposé à toute tentative de modification d'une
 * écriture figée (statut VALIDE ou ANNULE). Les implémentations
 * doivent le reprendre mot pour mot : l'interface s'appuie dessus.
 */
export const MSG_ECRITURE_FIGEE =
  'Écriture validée : correction uniquement par contre-écriture.';

/**
 * Enveloppe CONTRACTUELLE de l'export JSON (format d'échange entre
 * stores : un export du DemoStore doit s'importer dans le LocalStore
 * et réciproquement). La version n'évolue qu'avec le format.
 */
export const FORMAT_EXPORT = { application: 'inerWeb Fluide', version: 8 };

/** Les sept types de mouvement du registre — dont les deux contrôles
 *  d'étanchéité autonomes (P7-a, option A : le contrôle officiel réutilise
 *  le parcours signé/scellé/WORM des mouvements). */
export const TYPES_MOUVEMENT = [
  'CHARGE_APPOINT',
  'MISE_EN_SERVICE',
  'RECUPERATION_MAINTENANCE',
  'RECUPERATION_DEMANTELEMENT',
  'TRANSFERT',
  'CONTROLE_PERIODIQUE',
  'CONTROLE_NON_PERIODIQUE'
];

/**
 * Issues de traitement final d'un déchet fluoré remis (BSFF, P0-8, migration
 * 28). Un BSFF n'atteste que la REMISE ; l'issue (attestée séparément par
 * l'opérateur) dit ce qu'il en advient. Seule DESTRUCTION alimente la rubrique
 * 9 de la déclaration annuelle ; REGENERATION → rubrique 8. Duplicata figé
 * côté stores (miroir), comme TYPES_MOUVEMENT.
 */
export const ISSUES_TRAITEMENT_BSFF =
  ['RECYCLAGE', 'REGENERATION', 'DESTRUCTION', 'AUTRE'];

/**
 * Destinataires attestés d'une cession de fluide (P0-8, migration 29,
 * rubrique 10 de la déclaration annuelle). Duplicata figé côté stores.
 */
export const DESTINATAIRES_CESSION =
  ['OPERATEUR_ATTESTE', 'DISTRIBUTEUR', 'PRODUCTEUR'];

/** Machine à états stricte d'un mouvement (aucun autre chemin). */
export const STATUTS_MOUVEMENT = ['BROUILLON', 'SOUMIS', 'VALIDE', 'ANNULE'];

/** Rôles habilités à valider une écriture (jamais un élève). */
export const ROLES_VALIDEURS = ['REFERENT', 'ENSEIGNANT', 'ADMIN'];

/**
 * Propriétés (non fonctions) que tout store expose.
 * - modeLabel : étiquette du mode affichée dans l'interface
 *   (« DÉMO », « LOCAL »…), une chaîne non vide.
 * - registreAltere : état d'intégrité constaté au chargement —
 *   null si sain, sinon { ok:false, casseA } où casseA désigne le
 *   problème : numéro de la première écriture dont la chaîne est
 *   rompue, OU description de l'invariant de données violé.
 */
export const PROPRIETES_CONTRAT = ['modeLabel', 'registreAltere'];

/**
 * Les 80 méthodes du contrat, dans l'ordre du cycle de vie.
 * genre : 'abonnement' | 'initialisation' | 'lecture' | 'mutation'.
 * La sémantique fine (formes de retour, garde-fous, effets) est
 * décrite ici en une ligne et VÉRIFIÉE dans test-contrat.mjs.
 */
export const METHODES_CONTRAT = {
  // --- signal de changement et initialisation -----------------
  surChangement: { genre: 'abonnement',
    description: 'Abonne un rappel appelé après chaque mutation réussie ; retourne la fonction de désabonnement. SYNCHRONE.' },
  init: { genre: 'initialisation',
    description: 'Migrations de sauvegardes anciennes, amorçage éventuel de la chaîne, vérification d’intégrité (pose registreAltere).' },

  // --- lectures d'état ----------------------------------------
  getEtablissement: { genre: 'lecture',
    description: 'L’établissement (dossier opérateur) — copie.' },
  getUtilisateurCourant: { genre: 'lecture',
    description: 'L’utilisateur courant : l’authentifié de la session (V9-E5) ; à défaut de session (loopback en lecture, mode démo), repli sur le premier REFERENT du personnel — Error s’il n’y en a pas.' },
  getOutillage: { genre: 'lecture',
    description: 'Outillage avec statut RECALCULÉ à la lecture (CONFORME | A_VERIFIER | EXPIRE | HORS_SERVICE).' },
  getMachines: { genre: 'lecture',
    description: 'Toutes les machines, démantelées incluses (les vues filtrent).' },
  getBouteilles: { genre: 'lecture',
    description: 'Toutes les bouteilles ; invariant masseNetteKg = masseBruteKg − tareKg (au gramme).' },
  getMouvements: { genre: 'lecture',
    description: 'Tous les mouvements, triés date puis numéro décroissants.' },
  getControles: { genre: 'lecture',
    description: 'Tous les contrôles d’étanchéité, triés date décroissante.' },
  getFluides: { genre: 'lecture',
    description: 'Le référentiel des fluides, nbMachines recalculé (machines non démantelées) ; fiche réglementaire du cadre 7 (contientHfc, contientHfo, categorieCadre7 HFC|HFO|HCFC|AUCUNE, sourcePrp) — categorieCadre7 nul = pas de fiche, repli du moteur sur la dérivation de famille.' },
  getPersonnel: { genre: 'lecture',
    description: 'Tout le personnel (jamais supprimé : seulement désactivé).' },
  getClients: { genre: 'lecture',
    description: 'Les clients détenteurs, nbMachines recalculé.' },
  getAlertes: { genre: 'lecture',
    description: 'Alertes calculées à la volée { id, niveau CRITIQUE|IMPORTANT, titre, detail, cible }, CRITIQUE d’abord.' },
  getJournalAudit: { genre: 'lecture',
    description: 'Le journal d’audit append-only { date ISO complet, qui, action, cible, details } — aucune méthode de purge n’existe.' },

  // --- machines ------------------------------------------------
  createMachine: { genre: 'mutation',
    description: 'Crée une machine (code auto M{n}) ; typeInstallation FIXE|MOBILE, défaut FIXE (P0-6 — un MOBILE listé est admis au contrôle immédiat après réparation) ; Error si désignation vide, fluide inconnu, charge invalide, client introuvable, type d’installation inconnu.' },
  updateMachine: { genre: 'mutation',
    description: 'Patch partiel (id et code intouchables) ; Error si introuvable, démantelée ou type d’installation inconnu.' },
  arreterMachine: { genre: 'mutation',
    description: 'Passe EN_SERVICE → ARRETEE (reste au parc) ; Error si démantelée ou déjà arrêtée.' },
  demantelerMachine: { genre: 'mutation',
    description: 'Passe → DEMANTELEE (DÉFINITIF) ; Error si charge résiduelle > 0,05 kg.' },
  remettreEnService: { genre: 'mutation',
    description: 'Passe ARRETEE → EN_SERVICE ; Error sinon.' },

  // --- clients détenteurs ---------------------------------------
  createClient: { genre: 'mutation',
    description: 'Crée un client { raisonSociale, adresse, siret?, contact?, email?, telephone? } ; actif=vrai ; Error si raison sociale/adresse vide ou SIRET renseigné ≠ 14 chiffres (SIRET optionnel).' },
  updateClient: { genre: 'mutation',
    description: 'Patch partiel (raisonSociale, adresse, siret, contact, email, telephone, actif) ; désactivation via actif=false ; Error si introuvable ou SIRET renseigné invalide.' },

  // --- bouteilles -----------------------------------------------
  createBouteille: { genre: 'mutation',
    description: 'Crée une bouteille (code auto B-NN) ; masseEntreeKg figée à l’entrée (CR-4) ; garde-fous tare/contenance/nette.' },
  updateBouteille: { genre: 'mutation',
    description: 'Patch partiel ; masseNetteKg recalculée si brute ou tare changent (jamais patchable directement).' },
  peserBouteille: { genre: 'mutation',
    description: 'Nouvelle pesée : brute posée, nette recalculée, datePesee = aujourd’hui ; garde-fous.' },

  // --- contrôles d'étanchéité -----------------------------------
  createControle: { genre: 'mutation',
    description: 'Crée un contrôle DIRECT — FORMATION-only par nature (P7-c) : le mode OFFICIEL est refusé structurellement (MSG_CONTROLE_DIRECT_OFFICIEL), un contrôle officiel s’enregistre comme mouvement de type CONTROLE ; FUITE → machine en statut FUITE ; CONFORME → retour EN_SERVICE depuis FUITE seulement si la réparation est TRACÉE et que le contrôle date du jour de la réparation ou d’après (R4), ou depuis CONTROLE_DU sans retard.' },
  calculerProchainControle: { genre: 'lecture',
    description: 'Prochain contrôle selon charge×PRP et détection permanente (logique unique du cadre 7 CERFA) ; la date du contrôle (optionnelle, défaut aujourd’hui) fixe le régime applicable ; null si hors périmètre OU si HFO pur avant le 11/03/2024 (F-Gas III).' },
  tracerReparation: { genre: 'mutation',
    description: 'Trace a posteriori la réparation d’un contrôle FUITE (date, nature, réparateur) ; Error si contrôle introuvable, si son résultat n’est pas FUITE, ou si un champ obligatoire est vide. Ne change PAS machine.statut (R4 : le retour EN_SERVICE exige un contrôle CONFORME postérieur).' },

  // --- registre des mouvements (cœur WORM) ----------------------
  creerMouvement: { genre: 'mutation',
    description: 'Crée un BROUILLON numéroté FORM-/FI- selon le mode ; aucun effet stock ; outilsIds? = outils réglementaires déclarés (dédupliqués, existence vérifiée, lisibles via getOutilsMouvement) ; Error si type ou référence inconnus.' },
  soumettreMouvement: { genre: 'mutation',
    description: 'BROUILLON → SOUMIS (dateSoumission posée, hors empreinte) ; MSG_ECRITURE_FIGEE si déjà figé.' },
  supprimerMouvement: { genre: 'mutation',
    description: 'Supprime un BROUILLON uniquement (CR-1) ; retourne true ; MSG_ECRITURE_FIGEE si figé.' },
  rejeterMouvement: { genre: 'mutation',
    description: 'SOUMIS → BROUILLON avec motifRejet obligatoire.' },
  validerMouvement: { genre: 'mutation',
    description: 'SOUMIS → VALIDE par un rôle habilité : quantité signée calculée des pesées, effets stocks atomiques, scellement hash chaîné. Lot C (C3) : 3e paramètre pdfFinalBase64 — OBLIGATOIRE en mode OFFICIEL (le PDF final présenté aux signataires, contrôlé : nombres magiques %PDF, 5 Mo maximum), conservé en pièce jointe SYSTÈME catégorie CERFA_FINAL (nom CERFA-<numéro>.pdf, sans incrément de révision) avec son empreinte GELÉE hashPdfFinal avant scellement (v2) ; fourni hors mode OFFICIEL → refus canonique (pdf-final.js), la FORMATION reste inchangée.' },
  annulerParContreEcriture: { genre: 'mutation',
    description: 'Crée l’écriture inverse scellée (quantité opposée, pesées permutées) et passe l’original en ANNULE (hash intact).' },

  // --- signatures réelles (lot C — condition 3 du plan audit-proof) ---
  signerMouvement: { genre: 'mutation',
    description: 'Pose une signature RÉELLE sur un mouvement BROUILLON : (mouvementId, { role TECHNICIEN|DETENTEUR, nom, prenom, qualite?, organisation?, parDelegation?, imagePng base64 }). Personne physique obligatoire (nom + prénom) ; DETENTEUR seulement après une signature TECHNICIEN de la même révision ; parDelegation exige la raison sociale représentée ; la déclaration est composée par le store (signatures-mouvement.js), jamais reçue du client ; image PNG contrôlée (nombres magiques, ≥ 1 Ko, ≤ 1 Mo — une signature illisible n’est jamais ignorée) ; enregistre l’horodatage réel, l’empreinte du document et la révision signée — toute modification ultérieure du brouillon rend la signature PÉRIMÉE (par comparaison, jamais de retouche ni de suppression) ; MSG_ECRITURE_FIGEE si figé.' },
  getSignaturesMouvement: { genre: 'lecture',
    description: 'Les signatures réelles d’un mouvement (id) : [{ id, mouvementId, role, nom, prenom, qualite, organisation, parDelegation, dateHeure ISO, declaration, imagePng, sessionCompteId, sessionPersonnelId, sha256Document, versionDocument, valide }] — valide = versionDocument égale la révision courante du brouillon ; tri dateHeure puis id (comparaison de chaînes simple) ; copies indépendantes ; Error si mouvement introuvable.' },

  // --- intégrité et synthèses -----------------------------------
  verifierChaineHash: { genre: 'lecture',
    description: 'Re-parcourt la chaîne des écritures figées : { ok, casseA (numéro de la première rupture) }.' },
  getEtatRegistre: { genre: 'lecture',
    description: 'État d’intégrité constaté au chargement : { altere, casseA } — bandeau, jamais de blocage.' },
  getStats: { genre: 'lecture',
    description: 'Le tableau de bord : parc, stocks, teqCO₂, conformité, flux mensuels (fenêtre glissante 6 mois).' },
  getAnneesDisponibles: { genre: 'lecture',
    description: 'Années ayant des données, année de travail courante incluse, triées décroissantes.' },
  getBilan: { genre: 'lecture',
    description: 'Bilan annuel par fluide { annee, totalChargeKg, totalRecupereKg, lignes }.' },

  // --- dossier opérateur ----------------------------------------
  updateEtablissement: { genre: 'mutation',
    description: 'Patch partiel du dossier opérateur ; Error si catégorie ou activité inconnue.' },
  getAuditsOrganisme: { genre: 'lecture',
    description: 'Audits de l’organisme certificateur, triés date décroissante.' },
  createAuditOrganisme: { genre: 'mutation',
    description: 'Crée un audit ; met à jour etablissement.dernierAudit s’il est plus récent.' },
  getNonConformites: { genre: 'lecture',
    description: 'Non-conformités { statut OUVERTE|SOLDEE }.' },
  createNonConformite: { genre: 'mutation',
    description: 'Crée une non-conformité ; Error si description vide ou audit introuvable.' },
  solderNonConformite: { genre: 'mutation',
    description: 'Solde une NC avec commentaire obligatoire (preuve de l’action).' },

  // --- personnel -------------------------------------------------
  createPersonne: { genre: 'mutation',
    description: 'Crée une personne (roleApp défaut : ELEVE si élève, sinon ENSEIGNANT) ; garde-fous type/catégorie/activités.' },
  updatePersonne: { genre: 'mutation',
    description: 'Patch partiel ; mêmes garde-fous.' },
  desactiverPersonne: { genre: 'mutation',
    description: 'Désactive (actif=false) — le personnel n’est JAMAIS supprimé, la trace reste.' },
  exporterDonneesPersonne: { genre: 'lecture',
    description: 'Lot E ① — export RGPD des données d’UNE personne (droits d’accès et de portabilité, art. 15/20) : enveloppe { application, version, genereLe, personneId, personne, habilitations, mentions, signatures (métadonnées, SANS image), interventions et contrôles où elle apparaît, piecesJointes (métadonnées) }. AUCUN binaire (images/scans téléchargeables à part) ; le journal d’audit n’est pas repris (valeur probante du registre). Personne AU COFFRE (lot E2) : nom/prénom des signatures substitués par le pseudonyme + mention dédiée (la consultation réelle passe par le geste du coffre). Côté serveur, réservé au niveau VALIDEUR (jamais un élève). Error si la personne est introuvable.' },

  // --- coffre des identités (lot E2 — RGPD, minimisation réversible) ---
  etatCoffre: { genre: 'lecture',
    description: 'Lot E2 — état du coffre des identités : { coffreCree, nombreAuCoffre, identites:[{ personnelId, pseudonyme, dateMiseALabri }], candidats:[personnelId] (fiches élèves désactivées non encore à l’abri, via estFicheEchue du module pur) } — JAMAIS une enveloppe ni un nom réel. Côté serveur : lecture SENSIBLE niveau VALIDEUR.' },
  verifierCodeCoffre: { genre: 'lecture',
    description: 'Lot E2 — vérifie la phrase du coffre contre le TÉMOIN (enveloppe GCM du texte fixe, rien de dérivé de la phrase n’est stocké) : { ok: true } ou Error MSG_CODE_INCORRECT (message UNIQUE, anti-oracle) ; Error MSG_COFFRE_INEXISTANT si aucun coffre. Côté serveur : REFERENT/ADMIN, refusé en accès réseau (MSG_COFFRE_LAN).' },
  mettreAuCoffre: { genre: 'mutation',
    description: 'Lot E2 — met À L’ABRI un lot d’identités : (personnelIds[], phrase, options?) — crée le coffre au premier geste (phrase ≥ 14 caractères, sel + témoin posés), puis pour CHAQUE personne, EN UNE transaction : enveloppe chiffrée (fiche + identifiant de connexion + octets des PJ de la personne), fiche PSEUDONYMISÉE (« Élève AAAA-NN », compteur MONOTONE par année, identifiants effacés, actif=false, id INTACT), technicien réécrit dans ses mouvements NON figés (hors empreinte), PJ de la personne supprimées (fichiers en liste de purge rejouée au démarrage), compte renommé/désactivé. EXIGE une archive complète vérifiée récente (sinon la produit ; échec → MSG_ARCHIVE_REQUISE). Journal COFFRE_MISE_A_L_ABRI (pseudonyme + identifiant, JAMAIS le nom). Refus : fiche déjà au coffre (MSG_DEJA_AU_COFFRE), personne introuvable, phrase fausse. Côté serveur : REFERENT/ADMIN, refusé en réseau.' },
  consulterIdentiteCoffre: { genre: 'lecture',
    description: 'Lot E2 — consultation PONCTUELLE d’une identité au coffre : (personnelId, phrase, motif) → l’identité déchiffrée { nom, prenom, email, …, piecesJointes:[{nomFichier, mimeType, base64}] } — rien n’est réécrit. Motif OBLIGATOIRE (MSG_MOTIF_OBLIGATOIRE), journal COFFRE_CONSULTATION (pseudonyme + identifiant + motif). Error MSG_PAS_AU_COFFRE ou MSG_CODE_INCORRECT. Côté serveur : REFERENT/ADMIN, refusé en réseau.' },
  restaurerIdentiteCoffre: { genre: 'mutation',
    description: 'Lot E2 — restauration COMPLÈTE d’une identité : (personnelId, phrase, motif) — la fiche redevient bit à bit ce qu’elle était (actif d’origine compris), PJ re-matérialisées (hash revérifié), identifiant de connexion restauré, ligne du coffre SUPPRIMÉE (le pseudonyme n’est jamais réattribué : compteur monotone). Motif obligatoire, journal COFFRE_RESTAURATION. Côté serveur : REFERENT/ADMIN, refusé en réseau.' },
  changerPhraseCoffre: { genre: 'mutation',
    description: 'Lot E2 — change la phrase du coffre : (anciennePhrase, nouvellePhrase) — ancienne exigée (témoin), nouvelle ≥ 14 caractères, TOUTES les enveloppes re-chiffrées + nouveau sel + nouveau témoin EN UNE transaction (une enveloppe illisible = ROLLBACK global, rien ne bouge), journal COFFRE_CHANGEMENT_PHRASE. Côté serveur : REFERENT/ADMIN, refusé en réseau.' },

  // --- habilitations F-Gas (multi-régime 2008/2025) ----------------
  getHabilitations: { genre: 'lecture',
    description: 'Toutes les habilitations (jamais supprimées : seulement révoquées), triées 2025 avant 2008 puis dateFin décroissante (null en tête) ; copies indépendantes ; sans argument.' },
  createHabilitation: { genre: 'mutation',
    description: 'Crée une habilitation { personneId, regime 2008|2025, categorie, numeroAttestation?, organismeDelivreur?, dateDebut?, dateFin? } ; actif=vrai, dateRevocation=null ; cumul autorisé (2008 et 2025 coexistent, même catégorie renouvelable) ; Error si personne introuvable, régime inconnu ou catégorie incohérente avec le régime.' },
  updateHabilitation: { genre: 'mutation',
    description: 'Patch partiel (numeroAttestation, organismeDelivreur, dateDebut, dateFin) ; régime et catégorie INTOUCHABLES (correction de coquille, jamais réécriture d’identité) ; Error si introuvable.' },
  revoquerHabilitation: { genre: 'mutation',
    description: 'Retire une habilitation : actif=false + dateRevocation (AAAA-MM-JJ), consigné au journal ; JAMAIS de suppression (la ligne reste dans getHabilitations, historisée) ; Error si introuvable ou déjà révoquée.' },

  // --- mentions de formation complémentaire (par fluide) -----------
  getMentions: { genre: 'lecture',
    description: 'Toutes les mentions de formation complémentaire (jamais supprimées : seulement révoquées), triées CO2 puis NH3 puis HC, puis dateFin décroissante (null en tête) ; copies indépendantes ; sans argument.' },
  createMention: { genre: 'mutation',
    description: 'Crée une mention { personneId, fluideMention CO2|NH3|HC, numeroAttestation?, organismeDelivreur?, dateDebut?, dateFin? } ; actif=vrai, dateRevocation=null ; cumul et renouvellement autorisés ; une mention ÉTEND l’axe fluide des habilitations de la personne (jamais les opérations ni la charge) ; Error si personne introuvable ou fluide de mention inconnu.' },
  revoquerMention: { genre: 'mutation',
    description: 'Retire une mention : actif=false + dateRevocation (AAAA-MM-JJ), consigné au journal ; JAMAIS de suppression (la ligne reste dans getMentions, historisée) ; Error si introuvable ou déjà révoquée.' },

  // --- outils d'intervention (jonction mouvement ↔ outillage) ------
  getOutilsMouvement: { genre: 'lecture',
    description: 'Outils réglementaires déclarés sur un mouvement (id) : liste [{ outillageId, typeOutil, marque, modele, numSerie, statutFige, echeanceFigee }], outil résolu au présent (champs null si disparu), statutFige/echeanceFigee = état de l’outil FIGÉ à la validation du mouvement (null tant que brouillon/soumis) ; tri par typeOutil puis outillageId (comparaison de chaînes simple) ; copies indépendantes ; Error si mouvement introuvable.' },

  // --- outillage ---------------------------------------------------
  createOutil: { genre: 'mutation',
    description: 'Crée un outil ; statut calculé depuis l’échéance.' },
  updateOutil: { genre: 'mutation',
    description: 'Patch partiel ; statut TOUJOURS recalculé (non patchable), sauf HORS_SERVICE qui persiste.' },
  reformerOutil: { genre: 'mutation',
    description: 'Réforme définitive : statut HORS_SERVICE permanent.' },

  // --- pièces jointes ----------------------------------------------
  ajouterPieceJointe: { genre: 'mutation',
    description: 'Ajoute une PJ (PDF/PNG/JPEG/WebP, ≤ 5 Mo, jamais de SVG) ; contenu stocké à part, métadonnées hachées SHA-256.' },
  listerPiecesJointes: { genre: 'lecture',
    description: 'Les métadonnées des PJ d’une entité (tableau vide si aucune).' },
  obtenirPieceJointe: { genre: 'lecture',
    description: 'Métadonnées + contenu binaire ; Error si introuvable.' },
  supprimerPieceJointe: { genre: 'mutation',
    description: 'Supprime métadonnées et contenu ; Error si la PJ est liée à un mouvement figé (pièce justificative).' },

  // --- chaîne déchets et fournisseur --------------------------------
  deciderFluideRecupere: { genre: 'mutation',
    description: 'Décision sur fluide récupéré (REUTILISABLE | A_ANALYSER | DECHET) ; DECHET pose le délai de garde d’un an.' },
  createBsff: { genre: 'mutation',
    description: 'Sortie déchet (BSFF interne — ne remplace PAS Trackdéchets) ; décrémente la bouteille, remise totale → RETOURNEE.' },
  getBsff: { genre: 'lecture',
    description: 'Les BSFF émis, triés date de remise décroissante.' },
  attesterIssueBsff: { genre: 'mutation',
    description: 'Atteste l’issue de traitement final d’un BSFF (RECYCLAGE | REGENERATION | DESTRUCTION | AUTRE, + installation/certificat/date) ; corrige BSFF ≠ destruction ; installation obligatoire pour régénération/destruction.' },
  retournerFournisseur: { genre: 'mutation',
    description: 'Retourne une bouteille non-déchet au fournisseur (nette à zéro) et trace le retour (poste de la balance matière).' },
  getRetoursFournisseur: { genre: 'lecture',
    description: 'Les retours fournisseur, triés date décroissante.' },
  createCession: { genre: 'mutation',
    description: 'Cède une masse de fluide d’une bouteille à un tiers attesté (OPERATEUR_ATTESTE | DISTRIBUTEUR | PRODUCTEUR) ; décrémente la bouteille, trace figée (rubrique 10) ; un déchet part par un BSFF, pas par une cession.' },
  getCessions: { genre: 'lecture',
    description: 'Les cessions de fluide, triées date décroissante.' },

  // --- balance matière -----------------------------------------------
  getBalanceMatiere: { genre: 'lecture',
    description: 'La balance matière annuelle par fluide (stock théorique vs réel, écart, justification).' },
  getDeclarationAnnuelle: { genre: 'lecture',
    description: 'La déclaration annuelle réglementaire par fluide (11 rubriques : acquisitions, charges neuf/maintenance, récupérations hors-usage/maintenance, remises distributeur, recyclage propre, régénération, destruction, cessions, stocks neuf/déchet au 1er jan/31 déc) + anomalies + « complet ».' },
  saisirInventaire: { genre: 'mutation',
    description: 'Saisit l’inventaire physique (upsert par année et fluide) ET refige la PHOTOGRAPHIE nominative de l’année ; retourne la balance recalculée.' },
  justifierEcart: { genre: 'mutation',
    description: 'Justifie un écart constaté ; Error s’il n’y a aucun écart à justifier.' },
  getInventaireNominatif: { genre: 'lecture',
    description: 'La photographie nominative d’une année (brique ②/B7) : { annee, datePhoto|null, bouteilles[], fuitesOuvertes[], ouverture|null } — ouverture = photo de l’année N−1 (l’état au 01/01).' },

  // --- sentinelle d'alertes persistées --------------------------------
  getSentinelle: { genre: 'lecture',
    description: 'Les épisodes d’alerte persistés (actifs et archivés), récents d’abord : { id, idAlerte, niveau, titre, detail, cible, apparueLe, resolueLe|null, acquitteeLe|null, acquitteePar|null }. getAlertes reste la vérité du présent ; la sentinelle date l’apparition, la résolution et la prise de connaissance.' },
  rafraichirSentinelle: { genre: 'mutation',
    description: 'Réconcilie la table avec getAlertes() : ouvre un épisode par alerte nouvellement apparue, clôt (resolueLe) les épisodes dont l’alerte a disparu. IDEMPOTENT (aucun effet si rien n’a changé) ; ne journalise PAS au registre chaîné. Retourne la sentinelle à jour.' },
  acquitterAlerte: { genre: 'mutation',
    description: 'Marque « pris connaissance » l’épisode ouvert d’une alerte (acquitteeLe/acquitteePar) et le CONSIGNE au journal d’audit (preuve opposable) ; Error si aucune alerte active pour cet id ; idempotent si déjà acquitté. NE MASQUE RIEN : l’alerte reste active et visible.' },

  // --- mode officiel et échanges --------------------------------------
  peutPasserEnOfficiel: { genre: 'lecture',
    description: 'Les 4 vérifications bloquantes du mode OFFICIEL (SPEC §7.2) : { ok, motifs[] en français }.' },
  simulerValidationOfficielle: { genre: 'lecture',
    description: 'Simulation de validation OFFICIELLE d’un mouvement (lot B, condition 2 du plan audit-proof) : { ok, blocages:[{code, motif}] } comme si on validait la fiche en Officiel maintenant (liste docs/CONDITIONS-BLOCANTES-OFFICIEL.md, verrou de livraison compris) ; ne bloque jamais ; le serveur évalue en plus la sauvegarde du poste et le lien compte↔fiche de la session ; Error si le mouvement est introuvable.' },
  exporterJSON: { genre: 'lecture',
    description: 'Exporte l’état complet dans l’enveloppe { application, version, exporteLe, donnees }.' },
  importerJSON: { genre: 'mutation',
    description: 'Importe une sauvegarde : true si adoptée, FALSE si illisible, Error si forgée (chaîne rompue) ou incohérente.' }
};

/**
 * Toutes les propriétés publiques d'un store, prototypes compris
 * (un LocalStore écrit en classe porte ses méthodes sur le
 * prototype). Les propriétés préfixées « _ » sont privées, et
 * « constructor » est du langage : ignorées.
 */
function proprietesPubliques(store) {
  const cles = new Set();
  let objet = store;
  while (objet && objet !== Object.prototype) {
    for (const cle of Object.getOwnPropertyNames(objet)) {
      if (!cle.startsWith('_') && cle !== 'constructor') cles.add(cle);
    }
    objet = Object.getPrototypeOf(objet);
  }
  return [...cles];
}

/**
 * Vérifie la SURFACE d'un store contre le contrat : méthodes
 * manquantes, méthodes intruses (hors contrat — c'est ainsi que la
 * dérive DemoStore/LocalStore se détecte), propriétés manquantes.
 * Les prototypes sont inspectés (implémentations en classe incluses).
 * @param {object} store Une implémentation à vérifier.
 * @returns {{ ok: boolean, manques: string[], intrus: string[],
 *            proprietesManquantes: string[] }}
 */
export function verifierSurface(store) {
  const noms = Object.keys(METHODES_CONTRAT);
  const manques = noms.filter((nom) => typeof store?.[nom] !== 'function');

  const connues = new Set([...noms, ...PROPRIETES_CONTRAT]);
  const intrus = store
    ? proprietesPubliques(store).filter((cle) => !connues.has(cle))
    : [];

  const proprietesManquantes = PROPRIETES_CONTRAT
    .filter((cle) => !(cle in (store ?? {})));

  return {
    ok: manques.length === 0 && intrus.length === 0
      && proprietesManquantes.length === 0,
    manques,
    intrus,
    proprietesManquantes
  };
}
