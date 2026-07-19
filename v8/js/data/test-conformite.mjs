// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test de conformité Phase C (exécution : node test-conformite.mjs)
// Dossier opérateur, registre du personnel, outillage recalculé,
// pièces jointes (repli mémoire), chaîne déchets/BSFF, balance
// matière + inventaire + justification d'écart, alertes
// dynamiques, blocage du mode OFFICIEL. Node ≥ 18, sans DOM.
// ============================================================

import { creerStore } from './datastore.js';

let nbOk = 0;
let nbEchecs = 0;

function verifier(libelle, condition, detail = '') {
  if (condition) {
    nbOk += 1;
    console.log(`  OK  ${libelle}`);
  } else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Vérifie qu'un appel async REJETTE avec un message contenant `extrait`. */
async function verifierRejet(libelle, promesse, extrait = '') {
  try {
    await promesse;
    verifier(libelle, false, 'aucune erreur levée');
  } catch (erreur) {
    verifier(libelle,
      !extrait || String(erreur.message).includes(extrait),
      `message = « ${erreur.message} »`);
  }
}

const PROCHE = (a, b) => Math.abs(a - b) < 1e-9;

/** Date ISO du jour décalée de `nbJours` (mêmes règles que le store). */
function decaler(nbJours) {
  const d = new Date();
  d.setDate(d.getDate() + nbJours);
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

const store = await creerStore();

// ============================================================
// 1. Alertes dynamiques : les alertes de démo RESSORTENT du calcul
// ============================================================
const alertes = await store.getAlertes();
verifier('alertes dynamiques : au moins 4 alertes calculées',
  alertes.length >= 4, `nombre = ${alertes.length}`);
verifier('alertes : fuite non résolue (M5) présente et CRITIQUE',
  alertes.some((a) => a.titre === 'Fuite non résolue' &&
    a.niveau === 'CRITIQUE'));
verifier('alertes : contrôle d’étanchéité en retard (M6) présent',
  alertes.some((a) => a.titre === 'Contrôle d’étanchéité en retard'));
const alertesDetecteurs = alertes.filter(
  (a) => a.titre === 'Détecteur à réétalonner');
verifier('alertes : les 2 détecteurs expirés ressortent, niveau CRITIQUE (SPEC §7.2)',
  alertesDetecteurs.length === 2 &&
  alertesDetecteurs.every((a) => a.niveau === 'CRITIQUE'),
  JSON.stringify(alertesDetecteurs));
verifier('alertes : les critiques d’abord',
  alertes.every((a, i) => i === 0 ||
    !(alertes[i - 1].niveau === 'IMPORTANT' && a.niveau === 'CRITIQUE')));

// ============================================================
// 2. Dossier opérateur : établissement, audits, non-conformités
// ============================================================
const etablissement = await store.getEtablissement();
verifier('getEtablissement enrichi : attestation de capacité complète',
  etablissement.numAttestationCapacite === 'AC-13-004567' &&
  etablissement.organisme === 'QualiFroid Cert' &&
  etablissement.dateDelivranceCapacite === '2022-03-15' &&
  etablissement.dateEcheanceCapacite === '2027-03-14' &&
  etablissement.categoriesAutorisees.includes('I') &&
  etablissement.activitesAutorisees.length === 5);

const etabModifie = await store.updateEtablissement({
  prochainAudit: '2027-01-15'
});
verifier('updateEtablissement : champ modifié, le reste intact',
  etabModifie.prochainAudit === '2027-01-15' &&
  etabModifie.siret === etablissement.siret);

await verifierRejet('updateEtablissement rejette une catégorie inconnue',
  store.updateEtablissement({ categoriesAutorisees: ['V'] }), 'Catégorie');

const auditsInitiaux = await store.getAuditsOrganisme();
verifier('getAuditsOrganisme : audit QualiFroid du 12/01/2026 présent',
  auditsInitiaux.length === 1 && auditsInitiaux[0].date === '2026-01-12' &&
  auditsInitiaux[0].resultat === 'Conforme avec 1 remarque');

await store.createAuditOrganisme({
  date: '2026-07-01',
  organisme: 'QualiFroid Cert',
  resultat: 'Conforme',
  remarques: null
});
const auditsApres = await store.getAuditsOrganisme();
const etabApresAudit = await store.getEtablissement();
verifier('createAuditOrganisme : 2 audits, dernierAudit mis à jour',
  auditsApres.length === 2 && etabApresAudit.dernierAudit === '2026-07-01');

const nonConformites = await store.getNonConformites();
verifier('getNonConformites : la NC balance (échéance 30/09/2026) est OUVERTE',
  nonConformites.length === 1 && nonConformites[0].statut === 'OUVERTE' &&
  nonConformites[0].echeance === '2026-09-30' &&
  nonConformites[0].auditId === 'aud-1');

const nc = await store.createNonConformite({
  auditId: 'aud-1',
  description: 'Affichage de la consigne A2L manquant dans l’atelier',
  actionCorrective: 'Imprimer et afficher la consigne au poste de charge',
  echeance: '2026-10-15'
});
verifier('createNonConformite : statut OUVERTE par défaut',
  nc.statut === 'OUVERTE' && nc.dateSolde === null);

await verifierRejet('solderNonConformite exige un commentaire',
  store.solderNonConformite(nc.id, ''), 'Commentaire');

const ncSoldee = await store.solderNonConformite(
  nc.id, 'Consigne affichée et photographiée');
verifier('solderNonConformite : SOLDEE, datée, commentée',
  ncSoldee.statut === 'SOLDEE' && ncSoldee.dateSolde === decaler(0) &&
  ncSoldee.commentaireSolde === 'Consigne affichée et photographiée');

await verifierRejet('solderNonConformite rejette une NC déjà soldée',
  store.solderNonConformite(nc.id, 'Encore'), 'déjà soldée');

// ============================================================
// 3. Registre du personnel : jamais de suppression
// ============================================================
const personne = await store.createPersonne({
  nom: 'Garnier',
  prenom: 'Paul',
  typePersonne: 'SALARIE',
  numAttestationAptitude: 'AAF-CAT2-2025-3310',
  organismeDelivreur: 'QualiFroid Cert',
  dateObtention: '2025-01-10',
  dateFinValidite: '2030-01-09',
  categorie2008: 'II',
  categorie2025: 'II',
  activitesAutorisees: ['MAINTENANCE', 'RECUPERATION'],
  email: 'paul.garnier@exemple.fr'
});
verifier('createPersonne : salarié créé, actif, catégories 2008 et 2025',
  personne.actif === true && personne.typePersonne === 'SALARIE' &&
  personne.categorie2008 === 'II' && personne.categorie2025 === 'II');

await verifierRejet('createPersonne rejette un type de personne inconnu',
  store.createPersonne({ nom: 'X', prenom: 'Y', typePersonne: 'ROBOT' }),
  'Type de personne');

await verifierRejet('createPersonne rejette une catégorie inconnue',
  store.createPersonne({
    nom: 'X', prenom: 'Y', typePersonne: 'SALARIE', categorie2025: 'V'
  }), 'Catégorie');

const personneModifiee = await store.updatePersonne(personne.id, {
  activitesAutorisees: ['MAINTENANCE', 'RECUPERATION', 'CONTROLE']
});
verifier('updatePersonne : activités mises à jour',
  personneModifiee.activitesAutorisees.length === 3);

await verifierRejet('updatePersonne rejette une activité inconnue',
  store.updatePersonne(personne.id, { activitesAutorisees: ['SOUDURE'] }),
  'Activité');

const personneDesactivee = await store.desactiverPersonne(personne.id);
const personnelApres = await store.getPersonnel();
verifier('desactiverPersonne : inactif mais TOUJOURS au registre (trace)',
  personneDesactivee.actif === false &&
  personnelApres.some((p) => p.id === personne.id) &&
  personnelApres.length === 5);

verifier('store SANS méthode de suppression du personnel',
  Object.keys(store).every(
    (cle) => !/supprimer.*personne|delete.*person/i.test(cle)));

const stats = await store.getStats();
verifier('getStats : nbOperateursActifs = personnes ACTIVES du registre (4)',
  stats.nbOperateursActifs === 4, `valeur = ${stats.nbOperateursActifs}`);

// ============================================================
// 4. Outillage : statut RECALCULÉ depuis l'échéance
// ============================================================
const outillage = await store.getOutillage();
verifier('getOutillage : 5 outils, les 2 EXPIRE sont les détecteurs',
  outillage.length === 5 &&
  outillage.filter((o) => o.statut === 'EXPIRE').length === 2 &&
  outillage.filter((o) => o.statut === 'EXPIRE')
    .every((o) => o.typeOutil === 'DETECTEUR'));
verifier('getOutillage : station Promax RG6 CONFORME',
  outillage.some((o) => o.modele === 'RG6' && o.statut === 'CONFORME'));

await verifierRejet('createOutil rejette un type d’outil inconnu',
  store.createOutil({ typeOutil: 'PERCEUSE', marque: 'X' }),
  'Type d\'outil');

const outil = await store.createOutil({
  typeOutil: 'THERMOMETRE',
  marque: 'Testo',
  modele: '925',
  numSerie: 'T925-00871',
  siteAtelier: 'Atelier froid — armoire outillage',
  dateVerification: decaler(-366),
  prochaineEcheance: decaler(-1)
});
verifier('createOutil : échéance dépassée → statut EXPIRE',
  outil.statut === 'EXPIRE');

const outilProche = await store.updateOutil(outil.id, {
  prochaineEcheance: decaler(10)
});
verifier('updateOutil : échéance à 10 jours → statut A_VERIFIER',
  outilProche.statut === 'A_VERIFIER');

const outilLoin = await store.updateOutil(outil.id, {
  prochaineEcheance: decaler(60)
});
verifier('updateOutil : échéance à 60 jours → statut CONFORME',
  outilLoin.statut === 'CONFORME');

const outilReforme = await store.reformerOutil(outil.id);
verifier('reformerOutil : statut HORS_SERVICE malgré une échéance valide',
  outilReforme.statut === 'HORS_SERVICE');
const outillageApres = await store.getOutillage();
verifier('outil réformé : reste HORS_SERVICE après recalcul des statuts',
  outillageApres.find((o) => o.id === outil.id).statut === 'HORS_SERVICE');

await verifierRejet('reformerOutil rejette un outil déjà réformé',
  store.reformerOutil(outil.id), 'déjà réformé');

// ============================================================
// 5. Pièces jointes (repli mémoire sous Node)
// ============================================================
const pieceJointe = await store.ajouterPieceJointe({
  entiteType: 'OUTIL',
  entiteId: 'out-3',
  categorie: 'CERTIFICAT',
  nomFichier: 'certificat-balance-mettler.pdf',
  mimeType: 'application/pdf',
  base64: 'JVBERg==' // « %PDF » : 4 octets, vraie signature PDF (audit-proof)
});
verifier('ajouterPieceJointe : métadonnées complètes (taille, SHA-256, date)',
  pieceJointe.taille === 4 &&
  /^[0-9a-f]{64}$/.test(pieceJointe.hashSha256) &&
  typeof pieceJointe.dateAjout === 'string');

const listePj = await store.listerPiecesJointes('OUTIL', 'out-3');
verifier('listerPiecesJointes : la pièce est listée pour son entité',
  listePj.length === 1 && listePj[0].nomFichier === 'certificat-balance-mettler.pdf');

const pjComplete = await store.obtenirPieceJointe(pieceJointe.id);
const textePj = await pjComplete.blob.text();
verifier('obtenirPieceJointe : contenu restitué intact (« %PDF »)',
  textePj === '%PDF');

await verifierRejet('ajouterPieceJointe rejette un fichier > 5 Mo',
  store.ajouterPieceJointe({
    entiteType: 'OUTIL',
    entiteId: 'out-3',
    categorie: 'CERTIFICAT',
    nomFichier: 'trop-gros.pdf',
    mimeType: 'application/pdf',
    blob: new Blob([new Uint8Array(5 * 1024 * 1024 + 1)])
  }), 'volumineux');

await store.supprimerPieceJointe(pieceJointe.id);
verifier('supprimerPieceJointe : la liste redevient vide (journalisé)',
  (await store.listerPiecesJointes('OUTIL', 'out-3')).length === 0);

// Une ÉCRITURE FIGÉE ne reçoit plus de pièce justificative (lot C, C3c :
// asymétrie fermée — le refus de SUPPRESSION sur écriture figée est
// prouvé par test-contrat, joué demo ET local).
await verifierRejet('ajouterPieceJointe refusée sur une écriture figée',
  store.ajouterPieceJointe({
    entiteType: 'MOUVEMENT',
    entiteId: 'mvt-0007', // FI-2026-0007, statut VALIDE
    categorie: 'PHOTO_PESEE',
    nomFichier: 'pesee-fi-2026-0007.png',
    mimeType: 'image/png',
    // Vraie signature PNG 1×1 (audit-proof) : le contenu doit confirmer le type.
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk'
      + 'YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  }), 'ne peut plus recevoir');

// ============================================================
// 6. Balance matière 2026 : AUCUN écart avant inventaire
// ============================================================
const balanceAvant = await store.getBalanceMatiere(2026);
verifier('balance 2026 : écart et stock réel null avant inventaire',
  balanceAvant.lignes.every(
    (l) => l.ecartKg === null && l.stockReelKg === null));

const bouteilles = await store.getBouteilles();
const stockReelParFluide = new Map();
for (const b of bouteilles) {
  if (b.statut !== 'EN_STOCK') continue;
  stockReelParFluide.set(b.fluide,
    (stockReelParFluide.get(b.fluide) || 0) + b.masseNetteKg);
}
verifier('balance 2026 : stock théorique = état réel des bouteilles (implicite)',
  balanceAvant.lignes.every((l) =>
    PROCHE(l.stockTheoriqueKg, stockReelParFluide.get(l.fluide) || 0)),
  JSON.stringify(balanceAvant.lignes.map(
    (l) => [l.fluide, l.stockTheoriqueKg, stockReelParFluide.get(l.fluide)])));

const ligneR32 = balanceAvant.lignes.find((l) => l.fluide === 'R-32');
verifier('balance 2026 R-32 : initial 1,70 + achats 9,00 − charges 3,30 = 7,40',
  PROCHE(ligneR32.stockInitialNeufKg, 1.7) &&
  PROCHE(ligneR32.achatsKg, 9.0) &&
  PROCHE(ligneR32.chargesKg, 3.3) &&
  PROCHE(ligneR32.stockTheoriqueKg, 7.4),
  JSON.stringify(ligneR32));

// ============================================================
// 7. Inventaire : écart −0,25 kg sur R-404A → alerte CRITIQUE
//    → justification → l'alerte disparaît
// ============================================================
const lignesInventaire = balanceAvant.lignes.map((l) => ({
  fluide: l.fluide,
  stockReelKg: l.fluide === 'R-404A'
    ? l.stockTheoriqueKg - 0.25
    : l.stockTheoriqueKg
}));
const balanceInventaire = await store.saisirInventaire(
  2026, lignesInventaire, 'Frédéric Henninot');
const ligneR404 = balanceInventaire.lignes.find((l) => l.fluide === 'R-404A');
verifier('saisirInventaire : écart −0,25 kg détecté sur R-404A, 0 ailleurs',
  PROCHE(ligneR404.ecartKg, -0.25) &&
  balanceInventaire.lignes.filter((l) => l.fluide !== 'R-404A')
    .every((l) => PROCHE(l.ecartKg, 0)),
  JSON.stringify(balanceInventaire.lignes.map((l) => [l.fluide, l.ecartKg])));

const alertesEcart = await store.getAlertes();
verifier('alerte CRITIQUE « écart non justifié » levée pour R-404A',
  alertesEcart.some((a) => a.niveau === 'CRITIQUE' &&
    a.titre === 'Écart de balance matière non justifié' &&
    a.detail.includes('R-404A')));

const blocage = await store.peutPasserEnOfficiel();
verifier('peutPasserEnOfficiel : false, motifs détecteurs + écart',
  blocage.ok === false &&
  blocage.motifs.some((m) => m.includes('détecteur')) &&
  blocage.motifs.some((m) => m.includes('Écart')),
  JSON.stringify(blocage.motifs));

await verifierRejet('justifierEcart exige une justification non vide',
  store.justifierEcart(2026, 'R-404A', '  '), 'obligatoire');
await verifierRejet('justifierEcart rejette une année sans inventaire',
  store.justifierEcart(2027, 'R-404A', 'Essai'), 'Aucun écart');

const balanceJustifiee = await store.justifierEcart(2026, 'R-404A',
  'Purges de flexibles cumulées sur les TP du printemps');
verifier('justifierEcart : la justification est portée sur la ligne',
  balanceJustifiee.lignes.find((l) => l.fluide === 'R-404A')
    .justification.includes('Purges'));

const alertesApresJustif = await store.getAlertes();
verifier('après justification : l’alerte d’écart DISPARAÎT',
  !alertesApresJustif.some(
    (a) => a.titre === 'Écart de balance matière non justifié'));

// ============================================================
// 8. Chaîne déchets : décision, garde 1 an, BSFF, sortie de stock
// ============================================================
await verifierRejet('deciderFluideRecupere rejette une bouteille NEUVE',
  store.deciderFluideRecupere('B1', 'DECHET', 'Frédéric Henninot'),
  'récupération');
await verifierRejet('deciderFluideRecupere rejette une décision inconnue',
  store.deciderFluideRecupere('B3', 'BRULER', 'Frédéric Henninot'),
  'Décision inconnue');

const bouteilleDechet = await store.deciderFluideRecupere(
  'B3', 'DECHET', 'Frédéric Henninot');
const gardeAttendue = (() => {
  const [annee, reste] = [decaler(0).slice(0, 4), decaler(0).slice(4)];
  return `${Number(annee) + 1}${reste}`;
})();
verifier('décision DECHET : statut DECHET + garde limitée à UN AN',
  bouteilleDechet.statut === 'DECHET' &&
  bouteilleDechet.decisionFluide === 'DECHET' &&
  bouteilleDechet.decisionDate === decaler(0) &&
  bouteilleDechet.dateLimiteGarde === gardeAttendue,
  `garde = ${bouteilleDechet.dateLimiteGarde}, attendue = ${gardeAttendue}`);

await verifierRejet('createBsff rejette une bouteille non déclarée DÉCHET',
  store.createBsff({
    bouteilleId: 'B1', numeroBsff: 'BSFF-X', masseRemiseKg: 1
  }), 'DÉCHET');

const bsff = await store.createBsff({
  bouteilleId: 'B3',
  numeroBsff: 'BSFF-2026-0001',
  transporteur: 'Chimirec Sud',
  installationDestination: 'Chimirec — Rognac (13)',
  masseRemiseKg: 3.6,
  operateur: 'Frédéric Henninot'
});
const b3Apres = (await store.getBouteilles()).find((b) => b.id === 'B3');
verifier('createBsff : bouteille RETOURNEE, masse nette 0, BSFF référencé',
  b3Apres.statut === 'RETOURNEE' && PROCHE(b3Apres.masseNetteKg, 0) &&
  b3Apres.numBsff === 'BSFF-2026-0001');

const listeBsff = await store.getBsff();
verifier('getBsff : le bordereau est listé avec sa masse remise',
  listeBsff.length === 1 && PROCHE(listeBsff[0].masseRemiseKg, 3.6) &&
  listeBsff[0].fluide === 'R-404A');

const journal = await store.getJournalAudit();
verifier('sortie BSFF tracée au journal d’audit',
  journal.some((e) => e.action === 'SORTIE_BSFF' && e.cible === 'B-03'));

const balanceApresBsff = await store.getBalanceMatiere(2026);
const r404ApresBsff = balanceApresBsff.lignes.find(
  (l) => l.fluide === 'R-404A');
verifier('balance après BSFF : destruction 3,60 kg, stock théorique 0',
  PROCHE(r404ApresBsff.destructionsKg, 3.6) &&
  PROCHE(r404ApresBsff.stockTheoriqueKg, 0),
  JSON.stringify(r404ApresBsff));

// ============================================================
// Verdict
// ============================================================
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Tous les tests de conformité Phase C passent.');
