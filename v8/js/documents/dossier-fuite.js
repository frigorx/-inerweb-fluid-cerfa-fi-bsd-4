// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — dossier ZIP scellé d'UN dossier de fuite (brique ③)
// « Preuve de fermeture en un clic » : pour un contrôle FUITE donné, la
// chronologie complète (détection → mouvements → réparation → clôture),
// prête pour un auditeur.
//   00-SOMMAIRE.txt / 01-EMPREINTES-SHA256.txt
//   02-SYNTHESE.csv                    — identité, détection, statut, réparation,
//                                        clôture, échéance de suivi, durée
//   03-CHRONOLOGIE.txt                 — chronologie lisible, la plus récente en tête
//   04-CONTROLES.csv                   — détection + contrôles intermédiaires/clôture
//   05-MOUVEMENTS-PENDANT-FUITE.csv    — mouvements opposables de la fenêtre
//   cerfa/<numero>.pdf                 — CERFA 15497*04 des mouvements de la fenêtre
//   regularisations/<numero>.html      — justificatif des écritures d'annulation
//                                        de la fenêtre (lot 1 branche A)
// Le calcul du dossier lui-même vient de data/dossiers-fuite.js (module cœur,
// non modifié ici) : ce module ne fait que le mettre en forme pour l'export.
// Module ES, testable sous Node (contrat DataStore + Web Crypto).
// ============================================================

import { construireDossierFuite, LIBELLES_STATUT_FUITE } from '../data/dossiers-fuite.js';
import { genererCerfaPdf } from '../cerfa/generateur.js';
import {
  assemblerDossier, nomSur, objetsVersCsv, paireCsv
} from './dossier-commun.js';
import {
  estContreEcriture, assemblerJustificatif, justificatifHtmlAutonome
} from './regularisation.js';

/** Statuts de mouvement inscrits au registre (donc porteurs d'un CERFA). */
const STATUTS_REGISTRE = ['VALIDE', 'ANNULE'];

/**
 * Neutralise sauts de ligne et tabulations d'un champ SAISI avant de
 * l'écrire dans un fichier texte ligne à ligne : sans cela, une
 * localisation contenant « \r\n2020-01-01 — … » forgerait une fausse
 * ligne de chronologie dans la preuve scellée (les CSV, eux, sont déjà
 * protégés par champCsv).
 */
function texteSur(valeur) {
  return String(valeur).replace(/[\r\n\t]+/g, ' ').trim();
}

/** Ajoute le CERFA d'un mouvement au dossier (une erreur ne coule pas l'export). */
async function ajouterCerfa(store, entrees, source, id) {
  try {
    const { octets, numero } = await genererCerfaPdf(store, { source, id });
    entrees.push({ nom: `cerfa/${nomSur(numero)}.pdf`, contenu: octets });
  } catch (erreur) {
    entrees.push({
      nom: `cerfa/NON-GENERE-${nomSur(id)}.txt`,
      contenu: `CERFA non généré pour ${source} ${id} : `
        + (erreur && erreur.message ? erreur.message : String(erreur)) + '\r\n'
    });
  }
}

/** Synthèse en paires « Champ / Valeur » (02-SYNTHESE.csv). */
function synthesePaires(machine, fluide, dossier) {
  const fluideTexte = machine.fluide
    ? machine.fluide + (fluide && fluide.nom ? ` (${fluide.nom})` : '')
    : '';
  return [
    ['Machine — désignation', machine.designation],
    ['Machine — code', machine.id],
    ['Machine — code public', machine.codePublic],
    ['Machine — fluide', fluideTexte],
    ['Détection — date', dossier.dateDetection],
    ['Détection — localisation', dossier.localisation],
    ['Détection — méthode', dossier.methode],
    ['Détection — opérateur', dossier.operateur],
    ['Statut', LIBELLES_STATUT_FUITE[dossier.statut] ?? dossier.statut],
    ['Réparation — date', dossier.reparation ? dossier.reparation.date : 'Non tracée'],
    ['Réparation — nature', dossier.reparation ? (dossier.reparation.nature ?? '') : 'Non tracée'],
    ['Réparation — réparateur', dossier.reparation ? (dossier.reparation.reparateur ?? '') : 'Non tracée'],
    ['Contrôle de clôture — date', dossier.controleCloture ? dossier.controleCloture.date : 'Aucun'],
    ['Échéance contrôle de suivi', dossier.echeanceControleSuivi ?? '—'],
    ['Contrôle de suivi en retard', dossier.suiviEnRetard ? 'oui' : 'non'],
    ['Clôture en retard (P0-6, > 1 mois civil)', dossier.clotureEnRetard ? 'oui' : 'non'],
    ['Retard de clôture (jours)', dossier.retardClotureJours ?? '—'],
    ['Clôture immédiate admise (équipement MOBILE listé)',
      dossier.exceptionMobile ? 'oui — motif de périmètre' : 'non'],
    ['Durée du dossier (jours)', dossier.dureeJours]
  ];
}

/** Détails utiles d'un événement de chronologie, pour la ligne texte. */
function detailsEvenement(evt) {
  const parts = [];
  if (evt.type === 'MOUVEMENT') {
    if (evt.numero) parts.push(`n° ${evt.numero}`);
    if (evt.variationKg !== null && evt.variationKg !== undefined) {
      const signe = evt.variationKg > 0 ? '+' : '';
      parts.push(`${signe}${evt.variationKg} kg`);
    }
    if (evt.annule) parts.push('annulé');
  } else if (evt.type === 'DETECTION') {
    if (evt.localisation) parts.push(texteSur(evt.localisation));
    if (evt.methode) parts.push(texteSur(evt.methode));
  } else if (evt.type === 'REPARATION') {
    if (evt.detail) parts.push(texteSur(evt.detail));
  } else if (evt.type === 'CONTROLE' || evt.type === 'CLOTURE') {
    if (evt.resultat) parts.push(evt.resultat);
    if (evt.methode) parts.push(texteSur(evt.methode));
  }
  if (evt.qui) parts.push(texteSur(evt.qui));
  return parts.join(', ');
}

/** Chronologie lisible par un auditeur (03-CHRONOLOGIE.txt). */
function redigerChronologie(machine, dossier) {
  const lignes = [
    `CHRONOLOGIE — Dossier de fuite ${machine.codePublic || machine.id}`,
    '='.repeat(68),
    '',
    `Statut : ${LIBELLES_STATUT_FUITE[dossier.statut] ?? dossier.statut}`,
    '(du plus récent au plus ancien)',
    '',
    '-'.repeat(68)
  ];
  for (const evt of dossier.evenements) {
    const detail = detailsEvenement(evt);
    lignes.push(`${evt.date} — ${evt.titre}${detail ? ` — ${detail}` : ''}`);
  }
  lignes.push('');
  return lignes.join('\r\n');
}

/** Champs retenus pour un contrôle du dossier (04-CONTROLES.csv). */
function controleChamps(c) {
  return {
    id: c.id,
    date: c.date,
    resultat: c.resultat ?? null,
    methode: c.methode ?? null,
    localisationFuite: c.localisationFuite ?? null,
    dateReparation: c.dateReparation ?? null,
    natureReparation: c.natureReparation ?? null,
    reparateur: c.reparateur ?? null
  };
}

/**
 * Génère le dossier ZIP scellé d'UN dossier de fuite (identifié par le
 * contrôle FUITE qui l'ancre).
 * @param {object} store - magasin de données v8
 * @param {string} machineRef - id OU code public de la machine
 * @param {string} controleFuiteId - id du contrôle FUITE ancrant le dossier
 * @returns {Promise<{blob, nomFichier, nbDocuments, empreinte}>}
 */
export async function genererDossierFuite(store, machineRef, controleFuiteId) {
  const [machines, controles, mouvements, fluides] = await Promise.all([
    store.getMachines(), store.getControles(), store.getMouvements(),
    store.getFluides()
  ]);
  const machine = machines.find(
    (m) => m.id === machineRef || m.codePublic === machineRef);
  if (!machine) throw new Error('Machine introuvable pour l’export du dossier.');

  const dossier = construireDossierFuite({ machine, controles, mouvements, controleFuiteId });
  if (!dossier) throw new Error('Dossier de fuite introuvable pour ce contrôle.');

  const fluide = fluides.find((f) => f.code === machine.fluide) || null;

  const entreesData = [];
  entreesData.push({
    nom: '02-SYNTHESE.csv',
    contenu: paireCsv(synthesePaires(machine, fluide, dossier))
  });
  entreesData.push({
    nom: '03-CHRONOLOGIE.txt',
    contenu: redigerChronologie(machine, dossier)
  });

  // Contrôles du dossier : la détection, plus les intermédiaires et la
  // clôture référencés dans la chronologie.
  const idsControles = [dossier.controleFuiteId];
  for (const evt of dossier.evenements) {
    if ((evt.type === 'CONTROLE' || evt.type === 'CLOTURE')
      && !idsControles.includes(evt.controleId)) {
      idsControles.push(evt.controleId);
    }
  }
  const controlesDossier = idsControles
    .map((id) => controles.find((c) => c.id === id))
    .filter(Boolean)
    .map(controleChamps);
  entreesData.push({
    nom: '04-CONTROLES.csv', contenu: objetsVersCsv(controlesDossier)
  });

  entreesData.push({
    nom: '05-MOUVEMENTS-PENDANT-FUITE.csv',
    contenu: objetsVersCsv(dossier.mouvementsPendantFuite)
  });

  // ⚠ Lot 1 branche A (27/07/2026) : même règle qu'au dossier d'audit —
  // une CONTRE-ÉCRITURE ne donne pas de CERFA (aucune intervention n'a eu
  // lieu à sa date). Sans ce filtre, le générateur refusait et l'archive
  // scellée embarquait un fichier « CERFA non généré » : un refus PRÉVU
  // aurait eu l'air d'une panne. La pièce n'est pas retirée, elle est
  // REMPLACÉE par le justificatif de régularisation.
  const auRegistre = dossier.mouvementsPendantFuite.filter(
    (m) => STATUTS_REGISTRE.includes(m.statut));
  for (const mv of auRegistre.filter((m) => !estContreEcriture(m))) {
    await ajouterCerfa(store, entreesData, 'mouvement', mv.id);
  }
  const annulations = auRegistre.filter(estContreEcriture);
  if (annulations.length) {
    // `clients` : le DÉTENTEUR de l'équipement est souvent un TIERS ; sans
    // lui le document ne nommerait que le lycée, et le lecteur croirait le
    // matériel à lui.
    const [tousMouvements, bouteilles, personnel, clients, etablissement] =
      await Promise.all([
        store.getMouvements(), store.getBouteilles(), store.getPersonnel(),
        store.getClients(), store.getEtablissement()
      ]);
    for (const contre of annulations) {
      // La liste de la fenêtre de fuite est un EXTRAIT : l'écriture
      // annulée peut être hors fenêtre, d'où le registre complet ici.
      const complet = tousMouvements.find((m) => m.id === contre.id) ?? contre;
      const faits = assemblerJustificatif({
        mouvement: complet, mouvements: tousMouvements, machines: [machine],
        bouteilles, fluides, personnel, clients, etablissement
      });
      entreesData.push({
        nom: `regularisations/${nomSur(complet.numero ?? complet.id)}.html`,
        contenu: justificatifHtmlAutonome(faits)
      });
    }
  }

  const code = machine.codePublic || machine.id;
  return assemblerDossier({
    entreesData,
    titre: `Dossier de fuite — ${texteSur(machine.designation ?? '')} (${code})`,
    lignesInfos: [
      `Machine       : ${code} — ${texteSur(machine.designation ?? '')}`,
      `Détection     : ${dossier.dateDetection} — ${texteSur(dossier.localisation ?? '—')}`,
      `Statut        : ${LIBELLES_STATUT_FUITE[dossier.statut] ?? dossier.statut}`
    ],
    nomFichier: `dossier-fuite-${nomSur(code)}-${dossier.dateDetection}.zip`
  });
}
