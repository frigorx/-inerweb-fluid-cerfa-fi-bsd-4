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

/** Marque d'ordre des octets UTF-8 (BOM) : Excel FR l'exige pour les accents. */
const BOM = '﻿';

/** Fin de ligne CSV imposée par le contrat. */
const CRLF = '\r\n';

/** Séparateur CSV imposé par le contrat (virgule réservée aux décimales). */
const SEPARATEUR = ';';

/**
 * Échappe une valeur pour une cellule CSV : entourée de guillemets dès
 * qu'elle contient le séparateur, un guillemet ou un saut de ligne ;
 * les guillemets internes sont doublés (règle CSV standard).
 * @param {*} valeur
 * @returns {string}
 */
function champCsv(valeur) {
  if (valeur === null || valeur === undefined) return '';
  const texte = String(valeur);
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

/** Formate un nombre en cellule CSV : virgule décimale, vide si absent. */
function nb(valeur, dec = 2) {
  if (valeur === null || valeur === undefined || !Number.isFinite(Number(valeur))) {
    return '';
  }
  return fmtNombre(valeur, dec);
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

/** Mouvements de l'année (toutes fiches, quel que soit le statut). */
function csvMouvements(mouvements, annee) {
  const entetes = ['Numéro', 'Date', 'Mode', 'Type', 'Machine', 'Fluide',
    'Quantité (kg)', 'Pesée avant (kg)', 'Pesée après (kg)', 'Technicien',
    'Statut', 'N° CERFA', 'Contre-écriture de', 'Motif'];
  const prefixe = `${annee}-`;
  const lignes = mouvements
    .filter((mv) => (mv.date || '').startsWith(prefixe))
    .map((mv) => [
      mv.numero, fmtDate(mv.date), mv.mode, mv.type, mv.machineLabel,
      mv.fluide, nb(mv.quantiteKg), nb(mv.peseeAvantKg), nb(mv.peseeApresKg),
      mv.technicien, mv.statut, mv.cerfaNumero, mv.contreEcritureDe, mv.motif
    ]);
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
    'Transporteur', 'Installation de destination', 'Date de remise'];
  const lignes = bsff.map((b) => [
    b.numeroBsff, b.bouteilleCode, b.fluide, nb(b.masseRemiseKg),
    b.transporteur, b.installationDestination, fmtDate(b.dateRemise)
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
 * Construit les 9 fichiers CSV du registre pour l'année donnée.
 * @param {object} store - magasin de données v8 (contrat Phases A/B/C)
 * @param {number} annee - année de référence (mouvements, contrôles, balance)
 * @returns {Promise<Array<{ nom: string, contenu: string }>>}
 */
export async function toutesLesTables(store, annee) {
  const [personnel, outillage, bouteilles, machines, clients, mouvements,
    controles, balance, bsff, journalAudit] = await Promise.all([
    store.getPersonnel(),
    store.getOutillage(),
    store.getBouteilles(),
    store.getMachines(),
    store.getClients(),
    store.getMouvements(),
    store.getControles(),
    store.getBalanceMatiere(annee),
    store.getBsff(),
    store.getJournalAudit()
  ]);

  return [
    { nom: 'personnel.csv', contenu: csvPersonnel(personnel) },
    { nom: 'outillage.csv', contenu: csvOutillage(outillage) },
    { nom: 'bouteilles.csv', contenu: csvBouteilles(bouteilles) },
    { nom: 'machines.csv', contenu: csvMachines(machines, clients) },
    { nom: 'mouvements.csv', contenu: csvMouvements(mouvements, annee) },
    { nom: 'controles.csv', contenu: csvControles(controles, annee) },
    { nom: 'balance-matiere.csv', contenu: csvBalance(balance) },
    { nom: 'bsff.csv', contenu: csvBsff(bsff) },
    { nom: 'journal-audit.csv', contenu: csvJournalAudit(journalAudit) }
  ];
}
