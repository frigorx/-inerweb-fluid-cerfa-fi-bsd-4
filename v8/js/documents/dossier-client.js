// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — dossier ZIP scellé d'UN client / détenteur
// Regroupe l'identité du client, son parc, et le dossier complet de CHACUNE
// de ses machines (réutilise entreesMachine).
//   00-SOMMAIRE.txt / 01-EMPREINTES-SHA256.txt
//   identite-client.csv
//   machines.csv                          — parc du client
//   machines/<code>/…                     — un dossier machine par équipement
//   pieces-jointes-client/*               — PJ du client (si présentes)
// Module ES, testable sous Node (contrat DataStore + Web Crypto).
// ============================================================

import { entreesMachine } from './dossier-machine.js';
import {
  assemblerDossier, versOctets, nomSur, objetsVersCsv, paireCsv
} from './dossier-commun.js';

/** Identité client en paires « Champ / Valeur ». */
function identiteClientPaires(client) {
  return [
    ['Raison sociale', client.raisonSociale],
    ['Code public', client.codePublic],
    ['Identifiant interne', client.id],
    ['Adresse', client.adresse],
    ['SIRET', client.siret],
    ['Contact', client.contact],
    ['Téléphone', client.telephone],
    ['Courriel', client.email],
    ['Actif', client.actif === false ? 'non' : 'oui']
  ];
}

/**
 * Génère le dossier ZIP scellé d'un client (identité + parc + dossier de
 * chaque machine).
 * @param {object} store - magasin de données v8
 * @param {string} clientRef - id OU code public du client
 * @returns {Promise<{blob, nomFichier, nbDocuments, empreinte}>}
 */
export async function genererDossierClient(store, clientRef) {
  const [clients, machines, fluides, mouvements, controles] = await Promise.all([
    store.getClients(), store.getMachines(), store.getFluides(),
    store.getMouvements(), store.getControles()
  ]);
  const client = clients.find(
    (c) => c.id === clientRef || c.codePublic === clientRef);
  if (!client) throw new Error('Client introuvable pour l’export du dossier.');

  const machinesClient = machines.filter((m) => m.clientId === client.id);

  const entreesData = [];
  entreesData.push({
    nom: 'identite-client.csv', contenu: paireCsv(identiteClientPaires(client))
  });
  entreesData.push({ nom: 'machines.csv', contenu: objetsVersCsv(machinesClient) });

  for (const machine of machinesClient) {
    const fluide = fluides.find((f) => f.code === machine.fluide) || null;
    const mvM = mouvements.filter((mv) => mv.machineId === machine.id);
    const ctM = controles.filter((ct) => ct.machineId === machine.id);
    const code = nomSur(machine.codePublic || machine.id);
    const sous = await entreesMachine(
      store, machine, `machines/${code}/`, client, fluide, mvM, ctM);
    entreesData.push(...sous);
  }

  // Pièces jointes du client (aucune UI d'ajout aujourd'hui — tableau vide) ;
  // tolérant si le store refuse l'entité CLIENT.
  let piecesClient = [];
  try {
    piecesClient = await store.listerPiecesJointes('CLIENT', client.id);
  } catch { piecesClient = []; }
  for (const piece of piecesClient) {
    const complete = await store.obtenirPieceJointe(piece.id);
    entreesData.push({
      nom: `pieces-jointes-client/${nomSur(piece.nomFichier)}`,
      contenu: await versOctets(complete.blob)
    });
  }

  const cle = client.codePublic || client.raisonSociale || client.id;
  return assemblerDossier({
    entreesData,
    titre: `DOSSIER CLIENT ${client.raisonSociale || client.id}`,
    lignesInfos: [
      `Client        : ${client.raisonSociale ?? ''}`,
      `Adresse       : ${client.adresse ?? ''}`,
      `SIRET         : ${client.siret ?? ''}`,
      `Parc          : ${machinesClient.length} machine(s)`
    ],
    nomFichier: `dossier-client-${nomSur(cle)}.zip`
  });
}
