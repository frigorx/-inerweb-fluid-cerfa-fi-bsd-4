// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — exports CSV des tables (Phase D)
// Produit les fichiers CSV du registre pour une année donnée :
// personnel, outillage, bouteilles, machines, mouvements,
// contrôles, balance matière, BSFF, journal d'audit.
// Séparateur « ; », BOM UTF-8, fin de ligne CRLF, en-têtes en
// français, dates fr (JJ/MM/AAAA), nombres en virgule décimale.
// Aucune dépendance externe. Module ES, testable sous Node.
// ============================================================

import { fmtDate, fmtNombre } from '../core/utils.js';
import { chargerPdfLib } from '../cerfa/generateur.js';

/** Marque d'ordre des octets UTF-8 (BOM) : Excel FR l'exige pour les accents. */
const BOM = '﻿';

/** Fin de ligne CSV imposée par le contrat. */
const CRLF = '\r\n';

/** Séparateur CSV imposé par le contrat (virgule réservée aux décimales). */
const SEPARATEUR = ';';

/**
 * Motif de déclenchement d'une formule dans un tableur (Excel, LibreOffice,
 * Google Sheets) : un champ dont le TEXTE commence par l'un de ces
 * caractères — ou par une tabulation les précédant, amorce d'injection CSV
 * connue (OWASP) — est interprété comme une formule à l'ouverture (CF-12).
 */
const MOTIF_FORMULE = /^[\t=+\-@]/;

/**
 * Marqueur posé par nb() : une valeur déjà formatée en nombre fr (virgule
 * décimale, signe moins ASCII éventuel) ne doit JAMAIS être neutralisée
 * comme une formule — un nombre négatif réel (ex. écart d'inventaire)
 * commence légitimement par « - » et n'est pas une injection.
 */
const MARQUEUR_NOMBRE = Symbol('nombreCsv');

/**
 * Échappe une valeur pour une cellule CSV : entourée de guillemets dès
 * qu'elle contient le séparateur, un guillemet ou un saut de ligne ;
 * les guillemets internes sont doublés (règle CSV standard).
 *
 * Neutralisation d'injection de formule (CF-12) : un champ TEXTE (donc
 * jamais une valeur passée par nb(), reconnaissable à son marqueur) dont
 * le contenu commence par « = », « + », « - » ou « @ » est préfixé d'une
 * apostrophe. Ce préfixe est la convention standard (tableurs l'affichent
 * comme texte littéral, apostrophe non imprimée) pour désamorcer une
 * formule sans altérer la valeur légitime affichée.
 * @param {*} valeur
 * @returns {string}
 */
export function champCsv(valeur) {
  if (valeur === null || valeur === undefined) return '';
  const estNombre = typeof valeur === 'object' && valeur !== null &&
    valeur[MARQUEUR_NOMBRE] === true;
  let texte = estNombre ? valeur.texte : String(valeur);
  if (!estNombre && MOTIF_FORMULE.test(texte)) {
    texte = `'${texte}`;
  }
  if (/["\n\r]/.test(texte) || texte.includes(SEPARATEUR)) {
    return `"${texte.replace(/"/g, '""')}"`;
  }
  return texte;
}

/** Assemble une ligne de cellules déjà brutes (échappement appliqué ici). */
function ligneCsv(cellules) {
  return cellules.map(champCsv).join(SEPARATEUR);
}

/**
 * Construit un contenu CSV complet (BOM + en-tête + lignes + CRLF final)
 * à partir d'en-têtes et de tableaux de valeurs BRUTES (non échappées).
 * @param {string[]} entetes
 * @param {Array<Array<*>>} lignes
 * @returns {string}
 */
function construireCsv(entetes, lignes) {
  const corps = [entetes, ...lignes].map(ligneCsv).join(CRLF);
  return BOM + corps + CRLF;
}

/**
 * Formate un nombre en cellule CSV : virgule décimale, vide si absent.
 * Le résultat est marqué « valeur numérique » (MARQUEUR_NOMBRE) pour que
 * champCsv() ne lui applique JAMAIS la neutralisation d'injection de
 * formule (CF-12) : un écart négatif réel (« -3,50 ») n'est pas une
 * formule, seuls les champs texte libres le sont.
 */
function nb(valeur, dec = 2) {
  if (valeur === null || valeur === undefined || !Number.isFinite(Number(valeur))) {
    return { [MARQUEUR_NOMBRE]: true, texte: '' };
  }
  return { [MARQUEUR_NOMBRE]: true, texte: fmtNombre(valeur, dec) };
}

/** Formate un booléen en « Oui » / « Non ». */
function ouiNon(valeur) {
  return valeur ? 'Oui' : 'Non';
}

/** Formate une liste (activités, sites…) en texte lisible « a, b, c ». */
function liste(valeurs) {
  return Array.isArray(valeurs) ? valeurs.join(', ') : '';
}

// ------------------------------------------------------------
// Tables individuelles
// ------------------------------------------------------------

function csvPersonnel(personnel) {
  const entetes = ['Nom', 'Prénom', 'Type', 'Rôle application',
    'N° attestation aptitude', 'Organisme délivreur', 'Date obtention',
    'Fin de validité', 'Catégorie 2008', 'Catégorie 2025',
    'Activités autorisées', 'Actif', 'E-mail'];
  const lignes = personnel.map((p) => [
    p.nom, p.prenom, p.typePersonne, p.roleApp,
    p.numAttestationAptitude, p.organismeDelivreur, fmtDate(p.dateObtention),
    fmtDate(p.dateFinValidite), p.categorie2008, p.categorie2025,
    liste(p.activitesAutorisees), ouiNon(p.actif !== false), p.email
  ]);
  return construireCsv(entetes, lignes);
}

/**
 * Habilitations F-Gas (chantier B2) : l'aptitude de CHAQUE personne, régimes
 * 2008 et 2025, révoquées comprises (l'historique est opposable en audit).
 * Le nom est résolu depuis le registre du personnel (jamais un id brut).
 */
function csvHabilitations(habilitations, personnel) {
  const nomDe = (id) => {
    const p = personnel.find((x) => x.id === id);
    return p ? p.prenom + ' ' + p.nom : id;
  };
  const entetes = ['Personne', 'Régime', 'Catégorie', 'N° attestation',
    'Organisme délivreur', 'Début de validité', 'Fin de validité',
    'Statut', 'Date de révocation'];
  const lignes = habilitations.map((h) => [
    nomDe(h.personneId), h.regime, h.categorie, h.numeroAttestation,
    h.organismeDelivreur, fmtDate(h.dateDebut), fmtDate(h.dateFin),
    h.actif ? 'Active' : 'Révoquée', fmtDate(h.dateRevocation)
  ]);
  return construireCsv(entetes, lignes);
}

/** Mentions de formation complémentaire par fluide (chantier B2, brique 1). */
function csvMentions(mentions, personnel) {
  const nomDe = (id) => {
    const p = personnel.find((x) => x.id === id);
    return p ? p.prenom + ' ' + p.nom : id;
  };
  const LIBELLES_FLUIDE = {
    CO2: 'CO₂ (R-744)', NH3: 'Ammoniac (R-717)', HC: 'Hydrocarbures'
  };
  const entetes = ['Personne', 'Fluide', 'N° attestation',
    'Organisme délivreur', 'Début de validité', 'Fin de validité',
    'Statut', 'Date de révocation'];
  const lignes = mentions.map((m) => [
    nomDe(m.personneId), LIBELLES_FLUIDE[m.fluideMention] || m.fluideMention,
    m.numeroAttestation, m.organismeDelivreur, fmtDate(m.dateDebut),
    fmtDate(m.dateFin), m.actif ? 'Active' : 'Révoquée',
    fmtDate(m.dateRevocation)
  ]);
  return construireCsv(entetes, lignes);
}

function csvOutillage(outillage) {
  const entetes = ['Type d’outil', 'Marque', 'Modèle', 'N° série',
    'Site / atelier', 'Précision', 'Sensibilité', 'Dernier étalonnage',
    'Dernière vérification', 'Prochaine échéance', 'Statut'];
  const lignes = outillage.map((o) => [
    o.typeOutil, o.marque, o.modele, o.numSerie, o.siteAtelier,
    o.precision, o.sensibilite, fmtDate(o.dateEtalonnage),
    fmtDate(o.dateVerification), fmtDate(o.prochaineEcheance), o.statut
  ]);
  return construireCsv(entetes, lignes);
}

function csvBouteilles(bouteilles) {
  const entetes = ['Code', 'N° réel', 'Type', 'Fluide', 'État du fluide',
    'Tare (kg)', 'Masse brute (kg)', 'Masse nette (kg)',
    'Masse à l’entrée (kg)', 'Contenance max (kg)', 'Propriétaire', 'Lot',
    'Date d’entrée', 'Date de pesée', 'Statut', 'Décision fluide',
    'Décidé par', 'Date de décision', 'Limite de garde', 'N° BSFF'];
  const lignes = bouteilles.map((b) => [
    b.code, b.numeroReel, b.type, b.fluide, b.etatFluide,
    nb(b.tareKg), nb(b.masseBruteKg), nb(b.masseNetteKg),
    nb(b.masseEntreeKg), nb(b.contenanceMaxKg), b.proprietaire, b.lot,
    fmtDate(b.dateEntree), fmtDate(b.datePesee), b.statut, b.decisionFluide,
    b.decisionPar, fmtDate(b.decisionDate), fmtDate(b.dateLimiteGarde),
    b.numBsff
  ]);
  return construireCsv(entetes, lignes);
}

function csvMachines(machines, clients) {
  const entetes = ['Code', 'Désignation', 'Type', 'Marque', 'Modèle',
    'N° série', 'Fluide', 'Charge nominale (kg)', 'Charge actuelle (kg)',
    'Client / détenteur', 'Localisation', 'Site', 'Statut',
    'Détection permanente', 'Mise en service', 'Dernier contrôle',
    'Prochain contrôle'];
  const indexClients = new Map(clients.map((c) => [c.id, c.raisonSociale]));
  const lignes = machines.map((m) => [
    m.code, m.designation, m.type, m.marque, m.modele, m.numSerie,
    m.fluide, nb(m.chargeNominaleKg), nb(m.chargeActuelleKg),
    indexClients.get(m.clientId) ?? m.clientId, m.localisation, m.siteLabel,
    m.statut, ouiNon(m.detectionPermanente), fmtDate(m.dateMiseEnService),
    fmtDate(m.dernierControle), fmtDate(m.prochainControle)
  ]);
  return construireCsv(entetes, lignes);
}

/**
 * Mouvements de l'année (toutes fiches, quel que soit le statut).
 * Brique 3 (rôles réels) : trois colonnes finales résolvent
 * executeParId/superviseurId/responsableRegistreId en « Prénom Nom »
 * (chaîne vide si le champ n'est pas renseigné), jamais un id brut.
 * @param {Array<object>} mouvements
 * @param {number} annee
 * @param {Array<object>} personnel - retour de store.getPersonnel()
 */
function csvMouvements(mouvements, annee, personnel) {
  const nomDe = (id) => {
    if (!id) return '';
    const p = personnel.find((x) => x.id === id);
    return p ? p.prenom + ' ' + p.nom : id;
  };
  const entetes = ['Numéro', 'Date', 'Mode', 'Type', 'Machine', 'Fluide',
    'Quantité (kg)', 'Pesée avant (kg)', 'Pesée après (kg)', 'Technicien',
    'Statut', 'N° CERFA', 'Contre-écriture de', 'Motif',
    'Exécuté par', 'Superviseur', 'Responsable registre'];
  const prefixe = `${annee}-`;
  // Lot E2 : le technicien du CSV passe par l'IDENTIFIANT quand il existe
  // (fiche vivante = pseudonyme si la personne est au coffre) ; sans
  // identifiant, le champ figé tel quel (résidu consigné au plan E2 §9).
  const technicienDe = (mv) => {
    const idPorteur = mv.executeParId
      ?? (mv.contreEcritureDe ? mv.validateurId : null);
    if (idPorteur) {
      const p = personnel.find((x) => x.id === idPorteur);
      if (p) return p.prenom + ' ' + p.nom;
    }
    return mv.technicien;
  };
  const lignes = mouvements
    .filter((mv) => (mv.date || '').startsWith(prefixe))
    .map((mv) => [
      mv.numero, fmtDate(mv.date), mv.mode, mv.type, mv.machineLabel,
      mv.fluide, nb(mv.quantiteKg), nb(mv.peseeAvantKg), nb(mv.peseeApresKg),
      technicienDe(mv), mv.statut, mv.cerfaNumero, mv.contreEcritureDe, mv.motif,
      nomDe(mv.executeParId), nomDe(mv.superviseurId), nomDe(mv.responsableRegistreId)
    ]);
  return construireCsv(entetes, lignes);
}

/**
 * Brique 2 (outils multiples) : une ligne par outil lié à un mouvement de
 * l'année, tous statuts confondus (même filtre par année que csvMouvements,
 * ci-dessus). Contrairement aux autres csv*, prend le STORE directement
 * (et non un tableau déjà chargé) : chaque mouvement exige son propre
 * aller-retour store.getOutilsMouvement(). Les mouvements sans outil sont
 * sautés. Retourne null si l'année ne compte AUCUNE ligne — le fichier est
 * alors omis du dossier (CONDITIONNEL, comme la photo nominative, mais la
 * condition ne peut être évaluée qu'après avoir parcouru les mouvements).
 * @param {object} store
 * @param {number} annee
 * @returns {Promise<string|null>}
 */
export async function csvOutilsIntervention(store, annee) {
  const mouvements = await store.getMouvements();
  const prefixe = `${annee}-`;
  const entetes = ['Numéro mouvement', 'Date', 'Type mouvement', 'Outil',
    'Marque', 'Modèle', 'N° série', 'Statut figé', 'Échéance figée'];
  const lignes = [];
  for (const mv of mouvements) {
    if (!(mv.date || '').startsWith(prefixe)) continue;
    const outils = await store.getOutilsMouvement(mv.id);
    if (!outils.length) continue;
    for (const o of outils) {
      lignes.push([
        mv.numero, fmtDate(mv.date), mv.type, o.typeOutil, o.marque,
        o.modele, o.numSerie, o.statutFige, fmtDate(o.echeanceFigee)
      ]);
    }
  }
  if (!lignes.length) return null;
  return construireCsv(entetes, lignes);
}

/** Contrôles d'étanchéité de l'année. */
function csvControles(controles, annee) {
  const entetes = ['Date', 'Machine', 'Type de contrôle', 'Méthode',
    'Résultat', 'Localisation de la fuite', 'Réparation immédiate',
    'Opérateur', 'Prochain contrôle'];
  const prefixe = `${annee}-`;
  const lignes = controles
    .filter((c) => (c.date || '').startsWith(prefixe))
    .map((c) => [
      fmtDate(c.date), c.machineLabel, c.typeControle, c.methode,
      c.resultat, c.localisationFuite, ouiNon(c.reparationImmediate),
      c.operateur, fmtDate(c.prochainControle)
    ]);
  return construireCsv(entetes, lignes);
}

/** Balance matière de l'année, écarts d'inventaire et justifications. */
function csvBalance(balance) {
  const entetes = ['Fluide', 'Stock initial neuf (kg)',
    'Stock initial récupéré (kg)', 'Achats (kg)', 'Récupérations (kg)',
    'Charges (kg)', 'Cessions (kg)', 'Retours fournisseur (kg)',
    'Destructions (kg)', 'Stock théorique (kg)', 'Stock réel (kg)',
    'Écart (kg)', 'Justification'];
  const lignes = balance.lignes.map((l) => [
    l.fluide, nb(l.stockInitialNeufKg), nb(l.stockInitialRecupKg),
    nb(l.achatsKg), nb(l.recuperationsKg), nb(l.chargesKg),
    nb(l.cessionsKg), nb(l.retoursFournisseurKg), nb(l.destructionsKg),
    nb(l.stockTheoriqueKg), nb(l.stockReelKg), nb(l.ecartKg), l.justification
  ]);
  return construireCsv(entetes, lignes);
}

function csvBsff(bsff) {
  const entetes = ['N° BSFF', 'Bouteille', 'Fluide', 'Masse remise (kg)',
    'Transporteur', 'Installation de destination', 'Date de remise',
    // P0-8 : issue de traitement final attestée (BSFF ≠ destruction).
    'Traitement final', 'Installation de traitement', 'Certificat',
    'Date de traitement'];
  const lignes = bsff.map((b) => [
    b.numeroBsff, b.bouteilleCode, b.fluide, nb(b.masseRemiseKg),
    b.transporteur, b.installationDestination, fmtDate(b.dateRemise),
    b.issueTraitement || 'non attesté', b.installationTraitement || '',
    b.certificatTraitement || '',
    b.dateTraitement ? fmtDate(b.dateTraitement) : ''
  ]);
  return construireCsv(entetes, lignes);
}

/** Cessions de fluide à un tiers attesté (rubrique 10 de la déclaration). */
function csvCessions(cessions) {
  const entetes = ['Date', 'Bouteille', 'Fluide', 'Masse cédée (kg)',
    'Type de destinataire', 'Destinataire (raison sociale)', 'Opérateur'];
  const lignes = cessions.map((c) => [
    fmtDate(c.date), c.bouteilleCode, c.fluide, nb(c.masseKg),
    c.destinataireType, c.destinataireRaisonSociale, c.operateur
  ]);
  return construireCsv(entetes, lignes);
}

/**
 * Référentiel des fluides TEL QU'IL EST au moment du dossier (P1-2).
 * Depuis que le référent l'administre lui-même, un auditeur doit pouvoir
 * constater QUEL référentiel produisait les tonnes équivalent CO₂ et les
 * seuils de contrôle : la source de chaque PRP, la fiche du cadre 7 et
 * les fluides désactivés en font partie. Les écritures, elles, portent
 * chacune le PRP figé du jour de leur validation.
 */
function csvReferentielFluides(fluides) {
  const entetes = ['Code', 'Famille', 'PRP réglementaire', 'Source du PRP',
    'Classe de sécurité', 'Statut réglementaire', 'Catégorie cadre 7',
    'Contient du HFC', 'Contient du HFO', 'Machines au parc',
    'Disponible à la saisie', 'Commentaire'];
  const lignes = fluides.map((f) => [
    f.code, f.famille, nb(f.gwpAr4), f.sourcePrp || 'non renseignée',
    f.classeSecurite || '', f.statutReglementaire || '',
    f.categorieCadre7 || 'non renseignée',
    f.contientHfc === null || f.contientHfc === undefined
      ? '' : (f.contientHfc ? 'oui' : 'non'),
    f.contientHfo === null || f.contientHfo === undefined
      ? '' : (f.contientHfo ? 'oui' : 'non'),
    String(f.nbMachines ?? 0),
    f.actif === false ? 'non — désactivé' : 'oui',
    f.commentaire || ''
  ]);
  return construireCsv(entetes, lignes);
}

/** Déclaration annuelle réglementaire (11 rubriques par fluide, P0-8). */
function csvDeclaration(declaration) {
  const entetes = ['Fluide', 'Acquisitions (kg)', 'Charges équip. neufs (kg)',
    'Charges maintenance (kg)', 'Récupérations hors usage (kg)',
    'Récupérations maintenance (kg)', 'Remises distributeur (kg)',
    'Recyclage responsabilité propre (kg)', 'Régénération (kg)',
    'Installations régénération', 'Destruction (kg)',
    'Installations destruction', 'Cessions (kg)',
    'Stock 1/1 neuf (kg)', 'Stock 1/1 récupéré (kg)', 'Stock 1/1 déchet (kg)',
    'Stock 31/12 neuf (kg)', 'Stock 31/12 récupéré (kg)',
    'Stock 31/12 déchet (kg)'];
  const lignes = declaration.lignes.map((l) => [
    l.fluide, nb(l.acquisitionsKg), nb(l.chargesNeufKg),
    nb(l.chargesMaintenanceKg), nb(l.recupHorsUsageKg),
    nb(l.recupMaintenanceKg), nb(l.remisesDistributeurKg),
    nb(l.recyclagePropreKg), nb(l.regenerationKg),
    l.regenerationInstallations.join(' | '), nb(l.destructionKg),
    l.destructionInstallations.join(' | '), nb(l.cessionsKg),
    nb(l.stockDebutNeufKg), nb(l.stockDebutRecupKg), nb(l.stockDebutDechetKg),
    nb(l.stockFinNeufKg), nb(l.stockFinRecupKg), nb(l.stockFinDechetKg)
  ]);
  return construireCsv(entetes, lignes);
}

function csvJournalAudit(journal) {
  const entetes = ['Date', 'Qui', 'Action', 'Cible', 'Détails'];
  const lignes = journal.map((j) => [
    fmtDateHeure(j.date), j.qui, j.action, j.cible, j.details
  ]);
  return construireCsv(entetes, lignes);
}

/** Date-heure ISO (journal d'audit) → « JJ/MM/AAAA HH:MM:SS » fr. */
function fmtDateHeure(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const heures = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const secondes = String(d.getSeconds()).padStart(2, '0');
  return `${fmtDate(iso)} ${heures}:${minutes}:${secondes}`;
}

// ------------------------------------------------------------
// API publique
// ------------------------------------------------------------

/**
 * Construit les fichiers CSV du registre (11 fixes + jusqu'à 3 conditionnels :
 * photo nominative ×2, outils-intervention.csv — brique 2) pour l'année donnée.
 * @param {object} store - magasin de données v8 (contrat Phases A/B/C)
 * @param {number} annee - année de référence (mouvements, contrôles, balance)
 * @returns {Promise<Array<{ nom: string, contenu: string }>>}
 */
export async function toutesLesTables(store, annee) {
  const [personnel, outillage, bouteilles, machines, clients, mouvements,
    controles, balance, bsff, journalAudit, nominatif,
    habilitations, mentions, cessions, declaration, fluides] = await Promise.all([
    store.getPersonnel(),
    store.getOutillage(),
    store.getBouteilles(),
    store.getMachines(),
    store.getClients(),
    store.getMouvements(),
    store.getControles(),
    store.getBalanceMatiere(annee),
    store.getBsff(),
    store.getJournalAudit(),
    store.getInventaireNominatif(annee),
    store.getHabilitations(),
    store.getMentions(),
    store.getCessions(),
    store.getDeclarationAnnuelle(annee),
    store.getFluides()
  ]);

  const tables = [
    // P1-2 : le référentiel des fluides est désormais administré par le
    // référent — il entre au dossier scellé, sans quoi un auditeur ne
    // pourrait pas savoir quel PRP a servi aux calculs de l'année.
    { nom: 'referentiel-fluides.csv', contenu: csvReferentielFluides(fluides) },
    { nom: 'personnel.csv', contenu: csvPersonnel(personnel) },
    // Chantier B2 : l'aptitude réglementaire au dossier d'audit — TOUJOURS
    // présentes, même vides (un auditeur voit « aucune ligne » plutôt
    // qu'une absence ambiguë). Révoquées comprises (historique opposable).
    { nom: 'habilitations.csv', contenu: csvHabilitations(habilitations, personnel) },
    { nom: 'mentions-habilitation.csv', contenu: csvMentions(mentions, personnel) },
    { nom: 'outillage.csv', contenu: csvOutillage(outillage) },
    { nom: 'bouteilles.csv', contenu: csvBouteilles(bouteilles) },
    { nom: 'machines.csv', contenu: csvMachines(machines, clients) },
    { nom: 'mouvements.csv', contenu: csvMouvements(mouvements, annee, personnel) },
    { nom: 'controles.csv', contenu: csvControles(controles, annee) },
    { nom: 'balance-matiere.csv', contenu: csvBalance(balance) },
    { nom: 'bsff.csv', contenu: csvBsff(bsff) },
    { nom: 'cessions.csv', contenu: csvCessions(cessions) },
    // P0-8 : la déclaration annuelle réglementaire au dossier scellé.
    { nom: `declaration-annuelle-${annee}.csv`,
      contenu: csvDeclaration(declaration) },
    { nom: 'journal-audit.csv', contenu: csvJournalAudit(journalAudit) }
  ];
  // Brique ② (B7) : la photographie nominative de l'année, si elle a été
  // figée (saisie d'inventaire) — couverte automatiquement par le
  // manifeste d'empreintes et le scellement du dossier d'audit.
  if (nominatif.datePhoto !== null) {
    tables.push({
      nom: `inventaire-bouteilles-${annee}.csv`,
      contenu: csvInventaireNominatif(nominatif)
    });
    tables.push({
      nom: `fuites-ouvertes-${annee}.csv`,
      contenu: csvFuitesPhoto(nominatif)
    });
  }
  // Brique 2 (outils multiples) : outils-intervention.csv, seulement s'il
  // existe au moins une ligne (contenu null sinon) — un mouvement sans
  // outil déclaré ne doit pas produire un fichier vide au dossier.
  const csvOutils = await csvOutilsIntervention(store, annee);
  if (csvOutils !== null) {
    tables.push({ nom: 'outils-intervention.csv', contenu: csvOutils });
  }
  return tables;
}

/** Photographie nominative : une ligne par bouteille présente à la photo. */
function csvInventaireNominatif(nominatif) {
  const entetes = ['Bouteille', 'N° gravé', 'Type', 'Fluide', 'État du fluide',
    'Statut', 'Masse nette (kg)', 'Propriétaire', 'Photo figée le'];
  const lignes = nominatif.bouteilles.map((p) => [
    p.code, p.numeroReel, p.type, p.fluide, p.etatFluide, p.statut,
    nb(p.masseNetteKg), p.proprietaire, fmtDate(p.datePhoto)
  ]);
  return construireCsv(entetes, lignes);
}

/** Fuites machines ouvertes au moment de la photo nominative. */
function csvFuitesPhoto(nominatif) {
  const entetes = ['Machine', 'Localisation de la fuite', 'Constatée le',
    'Photo figée le'];
  const lignes = nominatif.fuitesOuvertes.map((f) => [
    f.machineLabel ?? f.machineId, f.localisation, fmtDate(f.dateConstat),
    fmtDate(f.datePhoto)
  ]);
  return construireCsv(entetes, lignes);
}

// ------------------------------------------------------------
// Export PDF du journal d'audit (CF-22)
// ------------------------------------------------------------
// Patron pdf-lib repris de cerfa/generateur.js : même chargement
// paresseux (chargerPdfLib, navigateur ↔ Node), mêmes primitives
// (PDFDocument, StandardFonts, drawText). Ici le PDF est construit
// de toutes pièces (PDFDocument.create), pas rempli depuis un modèle
// officiel : il n'y a pas de CERFA du journal d'audit.

/** Format de page A4 portrait, en points PDF (72 pt/pouce). */
const PAGE_A4 = { largeur: 595.28, hauteur: 841.89 };

/** Marges de page, en points. */
const MARGE = { haut: 56, bas: 48, gauche: 40, droite: 40 };

/** Tailles de police du tableau du journal. */
const TAILLE_TITRE = 16;
const TAILLE_SOUS_TITRE = 10;
const TAILLE_ENTETE = 9;
const TAILLE_LIGNE = 8.5;
const HAUTEUR_LIGNE = 14;

/** Largeurs de colonnes (points), dans l'ordre Date/Qui/Action/Cible/Détails. */
const LARGEURS_COLONNES = [92, 90, 90, 90, 173];

/** Coupe un texte pour qu'il tienne dans `largeurMax` points à `taille` donnée. */
function tronquerPourLargeur(police, texte, taille, largeurMax) {
  const chaine = String(texte ?? '');
  if (police.widthOfTextAtSize(chaine, taille) <= largeurMax) return chaine;
  const suffixe = '…';
  let resultat = chaine;
  while (resultat.length > 0 &&
    police.widthOfTextAtSize(resultat + suffixe, taille) > largeurMax) {
    resultat = resultat.slice(0, -1);
  }
  return resultat + suffixe;
}

/**
 * Génère un PDF paginé du journal d'audit : titre, sous-titre (établissement
 * + date de génération), tableau lisible des lignes (Date, Qui, Action,
 * Cible, Détails) avec en-têtes répétés à chaque page.
 * @param {object} store - magasin de données v8 (contrat Phases A/B/C)
 * @returns {Promise<{ octets: Uint8Array, nomFichier: string }>}
 */
export async function genererJournalAuditPdf(store) {
  const [etablissement, journal] = await Promise.all([
    store.getEtablissement(),
    store.getJournalAudit()
  ]);

  const PDFLib = await chargerPdfLib();
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  const doc = await PDFDocument.create();
  const policeTitre = await doc.embedFont(StandardFonts.HelveticaBold);
  const police = await doc.embedFont(StandardFonts.Helvetica);

  const largeurUtile = PAGE_A4.largeur - MARGE.gauche - MARGE.droite;
  const entetes = ['Date', 'Qui', 'Action', 'Cible', 'Détails'];
  const maintenant = new Date();

  let page = null;
  let y = 0;

  /** Abscisse de départ de chaque colonne (cumul des largeurs précédentes). */
  function abscisseColonne(indice) {
    let x = MARGE.gauche;
    for (let i = 0; i < indice; i += 1) x += LARGEURS_COLONNES[i];
    return x;
  }

  /** Ajoute une page vierge et redessine titre + en-tête de tableau. */
  function nouvellePage() {
    page = doc.addPage([PAGE_A4.largeur, PAGE_A4.hauteur]);
    y = PAGE_A4.hauteur - MARGE.haut;

    page.drawText('Journal d’audit — inerWeb Fluide', {
      x: MARGE.gauche, y, size: TAILLE_TITRE, font: policeTitre,
      color: rgb(0.1, 0.14, 0.22)
    });
    y -= TAILLE_TITRE + 6;

    const sousTitre = [
      etablissement?.raisonSociale,
      `généré le ${fmtDate(maintenant.toISOString())}`
    ].filter(Boolean).join(' — ');
    page.drawText(sousTitre, {
      x: MARGE.gauche, y, size: TAILLE_SOUS_TITRE, font: police,
      color: rgb(0.35, 0.38, 0.45)
    });
    y -= TAILLE_SOUS_TITRE + 14;

    entetes.forEach((texte, i) => {
      page.drawText(texte, {
        x: abscisseColonne(i), y, size: TAILLE_ENTETE, font: policeTitre,
        color: rgb(0.1, 0.14, 0.22)
      });
    });
    y -= 4;
    page.drawLine({
      start: { x: MARGE.gauche, y },
      end: { x: PAGE_A4.largeur - MARGE.droite, y },
      thickness: 0.75, color: rgb(0.6, 0.62, 0.68)
    });
    y -= HAUTEUR_LIGNE;
  }

  nouvellePage();

  for (const j of journal) {
    if (y < MARGE.bas + HAUTEUR_LIGNE) nouvellePage();

    const cellules = [
      fmtDateHeure(j.date), j.qui, j.action, j.cible, j.details
    ];
    cellules.forEach((valeur, i) => {
      const largeurMax = LARGEURS_COLONNES[i] - 6;
      const texte = tronquerPourLargeur(
        police, valeur ?? '', TAILLE_LIGNE, largeurMax);
      page.drawText(texte, {
        x: abscisseColonne(i), y, size: TAILLE_LIGNE, font: police,
        color: rgb(0.15, 0.15, 0.18)
      });
    });
    y -= HAUTEUR_LIGNE;
  }

  if (journal.length === 0) {
    page.drawText('Aucune écriture au journal d’audit.', {
      x: MARGE.gauche, y, size: TAILLE_LIGNE, font: police,
      color: rgb(0.4, 0.42, 0.48)
    });
  }

  // Pagination « Page X / N » en pied de chaque page.
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Page ${i + 1} / ${pages.length}`, {
      x: PAGE_A4.largeur - MARGE.droite - 60,
      y: MARGE.bas - 20,
      size: 8, font: police, color: rgb(0.45, 0.47, 0.52)
    });
  });

  const octets = await doc.save({ objectsPerTick: Infinity });
  return { octets, nomFichier: 'journal-audit.pdf' };
}
