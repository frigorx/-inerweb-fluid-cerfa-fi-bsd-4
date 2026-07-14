// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — dossier ZIP scellé d'UNE machine
// « Preuve ciblée en un clic » : tout l'historique d'une machine pour un audit.
//   00-SOMMAIRE.txt / 01-EMPREINTES-SHA256.txt
//   identite-machine.csv   — fiche + données techniques + détenteur
//   mouvements.csv         — mouvements de CETTE machine (tous statuts)
//   controles.csv          — contrôles d'étanchéité de CETTE machine
//   cerfa/<numero>.pdf     — CERFA 15497*04 rempli (mouvements figés + contrôles)
//   pieces-jointes/*       — pièces jointes de la machine
// Module ES, testable sous Node (n'utilise que le contrat DataStore + Web Crypto).
// ============================================================

import { genererCerfaPdf } from '../cerfa/generateur.js';
import {
  assemblerDossier, versOctets, nomSur, objetsVersCsv, paireCsv
} from './dossier-commun.js';

/** Statuts de mouvement inscrits au registre (donc porteurs d'un CERFA). */
const STATUTS_REGISTRE = ['VALIDE', 'ANNULE'];

/** Identité machine en paires « Champ / Valeur » pour le CSV vertical. */
function identiteMachinePaires(machine, client, fluide) {
  const fluideTexte = machine.fluide
    ? machine.fluide + (fluide && fluide.nom ? ` (${fluide.nom})` : '')
    : '';
  return [
    ['Code public', machine.codePublic],
    ['Identifiant interne', machine.id],
    ['Type', machine.type],
    ['Marque', machine.marque],
    ['Modèle', machine.modele],
    ['N° série', machine.numSerie],
    ['Fluide', fluideTexte],
    ['Charge nominale (kg)', machine.chargeNominaleKg],
    ['Charge actuelle (kg)', machine.chargeActuelleKg],
    ['Statut', machine.statut],
    ['Détection permanente', machine.detectionPermanente ? 'oui' : 'non'],
    ['Localisation', machine.localisation],
    ['Site', machine.siteLabel],
    ['Mise en service', machine.dateMiseEnService],
    ['Prochain contrôle', machine.prochainControle],
    ['Détenteur', client ? client.raisonSociale : ''],
    ['Détenteur — adresse', client ? client.adresse : ''],
    ['Détenteur — SIRET', client ? client.siret : '']
  ];
}

/** Ajoute le CERFA d'un mouvement/contrôle au dossier (une erreur ne coule pas l'export). */
async function ajouterCerfa(store, entrees, prefixe, source, id) {
  try {
    const { octets, numero } = await genererCerfaPdf(store, { source, id });
    entrees.push({ nom: `${prefixe}cerfa/${nomSur(numero)}.pdf`, contenu: octets });
  } catch (erreur) {
    entrees.push({
      nom: `${prefixe}cerfa/NON-GENERE-${nomSur(id)}.txt`,
      contenu: `CERFA non généré pour ${source} ${id} : `
        + (erreur && erreur.message ? erreur.message : String(erreur)) + '\r\n'
    });
  }
}

/**
 * Construit les entrées ZIP d'UNE machine (réutilisé par le dossier client,
 * avec un préfixe de dossier). mouvements/contrôles sont déjà filtrés pour
 * cette machine par l'appelant.
 * @returns {Promise<Array<{nom: string, contenu: string|Uint8Array}>>}
 */
export async function entreesMachine(
  store, machine, prefixe, client, fluide, mouvementsMachine, controlesMachine) {
  const entrees = [];
  entrees.push({
    nom: `${prefixe}identite-machine.csv`,
    contenu: paireCsv(identiteMachinePaires(machine, client, fluide))
  });
  entrees.push({
    nom: `${prefixe}mouvements.csv`, contenu: objetsVersCsv(mouvementsMachine)
  });
  entrees.push({
    nom: `${prefixe}controles.csv`, contenu: objetsVersCsv(controlesMachine)
  });

  for (const mv of mouvementsMachine.filter((m) => STATUTS_REGISTRE.includes(m.statut))) {
    await ajouterCerfa(store, entrees, prefixe, 'mouvement', mv.id);
  }
  for (const ct of controlesMachine) {
    await ajouterCerfa(store, entrees, prefixe, 'controle', ct.id);
  }

  const pieces = await store.listerPiecesJointes('MACHINE', machine.id);
  for (const piece of pieces) {
    const complete = await store.obtenirPieceJointe(piece.id);
    entrees.push({
      nom: `${prefixe}pieces-jointes/${nomSur(piece.nomFichier)}`,
      contenu: await versOctets(complete.blob)
    });
  }
  return entrees;
}

/**
 * Génère le dossier ZIP scellé d'une machine.
 * @param {object} store - magasin de données v8
 * @param {string} machineRef - id OU code public de la machine
 * @returns {Promise<{blob, nomFichier, nbDocuments, empreinte}>}
 */
export async function genererDossierMachine(store, machineRef) {
  const [machines, clients, fluides, mouvements, controles] = await Promise.all([
    store.getMachines(), store.getClients(), store.getFluides(),
    store.getMouvements(), store.getControles()
  ]);
  const machine = machines.find(
    (m) => m.id === machineRef || m.codePublic === machineRef);
  if (!machine) throw new Error('Machine introuvable pour l’export du dossier.');

  const client = clients.find((c) => c.id === machine.clientId) || null;
  const fluide = fluides.find((f) => f.code === machine.fluide) || null;
  const mouvementsMachine = mouvements.filter((mv) => mv.machineId === machine.id);
  const controlesMachine = controles.filter((ct) => ct.machineId === machine.id);

  const entreesData = await entreesMachine(
    store, machine, '', client, fluide, mouvementsMachine, controlesMachine);

  const code = machine.codePublic || machine.id;
  return assemblerDossier({
    entreesData,
    titre: `DOSSIER MACHINE ${code}`,
    lignesInfos: [
      `Machine       : ${code} — `
        + [machine.type, machine.marque, machine.modele].filter(Boolean).join(' '),
      `Fluide        : ${machine.fluide ?? ''}`,
      `Détenteur     : ${client ? client.raisonSociale : '—'}`,
      `Historique    : ${mouvementsMachine.length} mouvement(s), `
        + `${controlesMachine.length} contrôle(s)`
    ],
    nomFichier: `dossier-machine-${nomSur(code)}.zip`
  });
}
