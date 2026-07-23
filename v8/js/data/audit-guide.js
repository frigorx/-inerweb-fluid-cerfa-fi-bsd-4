// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — moteur du parcours « audit guidé »
// (PUR/Node-testable, zéro DOM).
//
// LE cheminement linéaire pour dérouler un audit complet sans se
// perdre (ordre voulu par Franck) : établissement → personnel →
// outillage → bouteilles → mouvements → contrôles → déchets/BSFF
// → balance → export du dossier.
//
// NE CRÉE AUCUNE RÈGLE MÉTIER NOUVELLE (doctrine feu-tricolore) :
// chaque étape rattache les alertes du store par PRÉFIXE d'id,
// hérite du barème ROUGE/ORANGE/VERT, et ajoute seulement des FAITS
// de présence (compteurs lus du contrat, jamais recalculés). Les
// alertes qui ne relèvent d'aucune étape sont COMPTÉES à part
// (`nonRattachees`) — le parcours ne peut pas mentir par omission.
// Couverture prouvée par test : l'union des préfixes des étapes
// contient ceux des domaines du feu tricolore.
// ============================================================

import { fmtDate } from '../core/utils.js';

/** Ordre de sévérité des feux (pour le « pire des étapes »). */
const SEVERITE = { VERT: 0, ORANGE: 1, ROUGE: 2 };

/**
 * Les 9 étapes du parcours, dans l'ordre de visite. `type` distingue
 * les étapes ÉVALUÉES (rattachées aux alertes) de l'étape ACTION
 * finale (l'export, qui n'a pas d'état : c'est un geste à faire).
 */
export const ETAPES = [
  {
    id: 'etablissement', type: 'controle',
    titre: 'Établissement (capacité)',
    vue: 'admin', vueLibelle: 'Administration',
    detail: 'L’auditeur vérifie d’abord QUI détient les fluides : '
      + 'attestation de capacité, organisme, échéance (cadre 1 du CERFA).',
    aFaire: 'Contrôlez le dossier opérateur : raison sociale, SIRET, '
      + 'attestation de capacité et son échéance.',
    prefixes: ['alr-capacite']
  },
  {
    id: 'personnel', type: 'controle',
    titre: 'Personnel (aptitudes)',
    vue: 'personnel', vueLibelle: 'Personnel',
    detail: 'Qui a le droit d’intervenir : attestations d’aptitude, '
      + 'habilitations F-Gas (2008 et 2025) et mentions par fluide.',
    aFaire: 'Vérifiez que chaque intervenant a une aptitude à jour '
      + '(bouton « Habilitations » de chaque ligne).',
    prefixes: ['alr-aptitude-', 'alr-habilitation-', 'alr-mention-']
  },
  {
    id: 'outillage', type: 'controle',
    titre: 'Outillage réglementaire',
    vue: 'outillage', vueLibelle: 'Outillage',
    detail: 'Balance, détecteurs, station de récupération : étalonnages '
      + 'et vérifications à jour — l’auditeur demande les certificats.',
    aFaire: 'Contrôlez les échéances d’étalonnage et joignez les '
      + 'certificats en pièces jointes sur chaque fiche outil.',
    prefixes: ['alr-outil-']
  },
  {
    id: 'bouteilles', type: 'controle',
    titre: 'Stock de bouteilles',
    vue: 'bouteilles', vueLibelle: 'Stock bouteilles',
    detail: 'Chaque bouteille est identifiée, pesée récemment, et son '
      + 'contenu tracé (fiche vivante, chronologie des pesées).',
    aFaire: 'Vérifiez les pesées récentes ; ouvrez la fiche d’une '
      + 'bouteille pour montrer sa chronologie.',
    prefixes: ['alr-pesee-']
  },
  {
    id: 'mouvements', type: 'controle',
    titre: 'Registre des mouvements',
    vue: 'mouvements', vueLibelle: 'Mouvements',
    detail: 'LE registre opposable : chaque intervention scellée '
      + '(hash chaîné), CERFA généré, rôles réels consignés.',
    aFaire: 'Soldez les brouillons et mouvements soumis en attente ; '
      + 'l’intégrité de la chaîne doit être intacte.',
    prefixes: ['alr-soumis-', 'alr-brouillon-']
  },
  {
    id: 'controles', type: 'controle',
    titre: 'Contrôles d’étanchéité et fuites',
    vue: 'controles', vueLibelle: 'Contrôles d’étanchéité',
    detail: 'Échéances de contrôle par machine et dossiers de fuite : '
      + 'toute fuite doit être suivie jusqu’au recontrôle (dossier fermé).',
    aFaire: 'Traitez les contrôles en retard ; vérifiez que chaque '
      + 'fuite a son dossier (bloc « Fuites » de la fiche machine) ; '
      + 'faites vérifier les systèmes de détection permanente (leur '
      + 'vérification vaut 12 mois — au-delà, la fréquence de contrôle '
      + 'n’est plus allégée).',
    prefixes: ['alr-controle-', 'alr-fuite-', 'alr-detection-']
  },
  {
    id: 'dechets', type: 'controle',
    titre: 'Déchets et BSFF',
    vue: 'dechets', vueLibelle: 'Déchets / BSFF',
    detail: 'Le fluide récupéré est décidé (réutilisable ou déchet), '
      + 'les délais de garde respectés, les BSFF émis et suivis.',
    aFaire: 'Prenez les décisions en attente sur les fluides récupérés, '
      + 'vérifiez les délais de garde et rectifiez toute réintroduction '
      + 'au-delà du fluide récupéré d’une machine.',
    prefixes: ['alr-garde-', 'alr-reemploi-']
  },
  {
    id: 'balance', type: 'controle',
    titre: 'Balance matière',
    vue: 'balance', vueLibelle: 'Balance matière',
    detail: 'Le stock théorique retombe sur le stock réel : inventaire '
      + 'annuel, écarts justifiés, photographie nominative des bouteilles.',
    aFaire: 'Saisissez l’inventaire annuel et justifiez chaque écart '
      + 'théorique/réel.',
    prefixes: ['alr-ecart-']
  },
  {
    id: 'export', type: 'action',
    titre: 'Exporter le dossier d’audit',
    vue: 'bilan', vueLibelle: 'Bilan annuel',
    detail: 'Le dossier d’audit annuel : ZIP scellé SHA-256 (sommaire, '
      + 'CSV de toutes les tables, CERFA, pièces jointes), certificat de '
      + 'scellement imprimable et vérificateur autonome embarqué.',
    aFaire: 'Téléchargez le dossier d’audit depuis le bilan annuel et '
      + 'imprimez le certificat de scellement — il voyage À CÔTÉ du ZIP.',
    prefixes: []
  }
];

/** Feu d'une liste d'alertes : ROUGE si critique, ORANGE si important. */
function feuDesAlertes(alertes) {
  if (alertes.some((a) => a.niveau === 'CRITIQUE')) return 'ROUGE';
  if (alertes.length > 0) return 'ORANGE';
  return 'VERT';
}

/** Résumé en français d'une étape selon ses alertes (patron feu-tricolore). */
function resumeEtape(alertes) {
  if (alertes.length === 0) return 'Rien à signaler.';
  const nbCritiques = alertes.filter((a) => a.niveau === 'CRITIQUE').length;
  const nbImportantes = alertes.length - nbCritiques;
  const morceaux = [];
  if (nbCritiques) {
    morceaux.push(`${nbCritiques} point${nbCritiques > 1 ? 's' : ''} bloquant${nbCritiques > 1 ? 's' : ''}`);
  }
  if (nbImportantes) {
    morceaux.push(`${nbImportantes} point${nbImportantes > 1 ? 's' : ''} à surveiller`);
  }
  return morceaux.join(' et ') + '.';
}

/** « 3 outils », « 1 outil » — accord simple en nombre. */
function accorder(n, singulier, pluriel) {
  return `${n} ${n > 1 ? pluriel : singulier}`;
}

/**
 * FAITS de présence d'une étape : des phrases françaises construites
 * depuis les compteurs lus du contrat (jamais recalculés ici). Un
 * registre vide est DIT (« aucun … ») — le parcours ne laisse pas un
 * écran vide passer pour un écran en règle.
 * @param {string} id — identifiant d'étape
 * @param {object} comptes — compteurs de collecterAuditGuide
 * @returns {string[]} phrases (vide si les compteurs manquent)
 */
export function faitsPourEtape(id, comptes) {
  if (!comptes) return [];
  const faits = [];
  switch (id) {
    case 'etablissement':
      faits.push(comptes.attestationCapacite
        ? 'Attestation de capacité renseignée'
          + (comptes.echeanceCapacite
            ? ` (échéance le ${fmtDate(comptes.echeanceCapacite)}).` : '.')
        : 'Attestation de capacité NON renseignée — à compléter avant l’audit.');
      break;
    case 'personnel':
      // « au registre » : la PRÉSENCE d'une attestation/habilitation, pas
      // sa validité — les échéances relèvent des alertes de l'étape.
      faits.push(comptes.nbPersonnesActives > 0
        ? `${accorder(comptes.nbPersonnesActives, 'personne active', 'personnes actives')} au registre, `
          + `dont ${comptes.nbPersonnesAptes} avec une attestation ou habilitation au registre.`
        : 'Aucune personne au registre du personnel.');
      break;
    case 'outillage':
      faits.push(comptes.nbOutils > 0
        ? `${accorder(comptes.nbOutils, 'outil', 'outils')} au registre, `
          + `${comptes.nbOutilsConformes} conforme${comptes.nbOutilsConformes > 1 ? 's' : ''}.`
        : 'Aucun outil au registre.');
      break;
    case 'bouteilles':
      faits.push(comptes.nbBouteillesStock > 0
        ? `${accorder(comptes.nbBouteillesStock, 'bouteille', 'bouteilles')} en stock.`
        : 'Aucune bouteille en stock.');
      break;
    case 'mouvements':
      faits.push(comptes.nbMouvements > 0
        ? `${accorder(comptes.nbMouvements, 'mouvement', 'mouvements')} au registre, `
          + `${comptes.nbEnSouffrance} encore non validé${comptes.nbEnSouffrance > 1 ? 's' : ''} `
          + '(brouillon ou soumis).'
        : 'Aucun mouvement au registre.');
      break;
    case 'controles':
      faits.push(`${accorder(comptes.nbMachines, 'machine', 'machines')} au parc, `
        + `${accorder(comptes.nbControles, 'contrôle d’étanchéité enregistré', 'contrôles d’étanchéité enregistrés')}.`);
      break;
    case 'dechets':
      faits.push(`${accorder(comptes.nbBsff, 'bordereau BSFF', 'bordereaux BSFF')} au registre.`);
      if (comptes.nbBouteillesRecuperation > 0) {
        faits.push(`${accorder(comptes.nbBouteillesRecuperation,
          'bouteille de fluide récupéré', 'bouteilles de fluide récupéré')} `
          + 'à suivre (décision, délai de garde, BSFF).');
      }
      break;
    default:
      break;
  }
  return faits;
}

/**
 * ÉVALUATION PURE du parcours : rattache chaque alerte du store à son
 * étape (par préfixe d'id), hérite du barème tricolore, ajoute les
 * faits de présence. Aucune lecture, aucune date calculée ici.
 *
 * @param {{ alertes: Array<{id: string, niveau: string, titre: string,
 *           detail?: string, cible?: {vue: string, id?: string}}>,
 *           registre: { ok: boolean, casseA?: string|number|null },
 *           officiel: { ok: boolean, motifs: string[] },
 *           comptes: object|null }} entree
 * @returns {{ etapes: Array, nbVertes: number, nbEvaluees: number,
 *             global: 'VERT'|'ORANGE'|'ROUGE', registreIntact: boolean,
 *             officiel: { ok: boolean, motifs: string[] },
 *             nonRattachees: Array }}
 */
export function evaluerAuditGuide({ alertes, registre, officiel, comptes }) {
  const restantes = [...(alertes ?? [])];

  const etapes = ETAPES.map((definition, index) => {
    const duEtape = [];
    for (let i = restantes.length - 1; i >= 0; i -= 1) {
      const alerte = restantes[i];
      if (definition.prefixes.some((p) => String(alerte.id).startsWith(p))) {
        duEtape.unshift(alerte);
        restantes.splice(i, 1);
      }
    }
    return {
      ...definition,
      numero: index + 1,
      alertes: duEtape,
      faits: faitsPourEtape(definition.id, comptes)
    };
  });

  for (const etape of etapes) {
    if (etape.type === 'action') {
      etape.etat = null;
      etape.resume = '';
    } else {
      etape.etat = feuDesAlertes(etape.alertes);
      etape.resume = resumeEtape(etape.alertes);
    }
  }

  // Le registre altéré est une non-conformité majeure : étape
  // « mouvements » forcée ROUGE avec un constat dédié (patron
  // feu-tricolore — même vérité, même sévérité).
  const registreIntact = Boolean(registre?.ok);
  if (!registreIntact) {
    const eMouvements = etapes.find((e) => e.id === 'mouvements');
    eMouvements.etat = 'ROUGE';
    eMouvements.resume = 'Rupture de la chaîne des écritures détectée.';
    eMouvements.alertes = [{
      id: 'alr-chaine-registre', niveau: 'CRITIQUE',
      titre: 'Chaîne du registre rompue',
      detail: registre?.casseA != null
        ? `Première rupture à l’écriture ${registre.casseA}.`
        : 'Rupture détectée.',
      cible: { vue: 'admin' }
    }, ...eMouvements.alertes];
  }

  const evaluees = etapes.filter((e) => e.type === 'controle');
  let global = evaluees.reduce(
    (pire, e) => (SEVERITE[e.etat] > SEVERITE[pire] ? e.etat : pire), 'VERT');

  // Les alertes NON rattachées comptent dans le feu global (filet du
  // feu tricolore hérité jusqu'au bout) : une critique d'une famille
  // future ne doit JAMAIS laisser le bandeau afficher « prêt pour
  // l'audit » — constat IMPORTANT 1 de la revue adversariale.
  const feuRestantes = feuDesAlertes(restantes);
  if (SEVERITE[feuRestantes] > SEVERITE[global]) global = feuRestantes;

  // Prérequis du mode Officiel manquants : jamais « tout vert »
  // (même garde-fou anti-mensonge que le feu tricolore).
  const officielOk = Boolean(officiel?.ok);
  if (!officielOk && global === 'VERT') global = 'ORANGE';

  return {
    etapes,
    nbVertes: evaluees.filter((e) => e.etat === 'VERT').length,
    nbEvaluees: evaluees.length,
    global,
    registreIntact,
    officiel: { ok: officielOk, motifs: officiel?.motifs ?? [] },
    nonRattachees: restantes
  };
}

/**
 * COLLECTE : lit le nécessaire sur le store (contrat DataStore
 * uniquement — marche en Démo comme en Local) puis évalue. Les
 * compteurs sont de simples longueurs de listes du contrat.
 * @param {object} store — magasin conforme au contrat v8
 */
export async function collecterAuditGuide(store) {
  const [alertes, registre, officiel, etablissement, personnel,
    habilitations, outillage, bouteilles, mouvements, machines,
    controles, bsff] = await Promise.all([
    store.getAlertes(),
    store.verifierChaineHash(),
    store.peutPasserEnOfficiel(),
    store.getEtablissement(),
    store.getPersonnel(),
    store.getHabilitations(),
    store.getOutillage(),
    store.getBouteilles(),
    store.getMouvements(),
    store.getMachines(),
    store.getControles(),
    store.getBsff()
  ]);

  // Même sémantique que getAlertes (`!p.actif` = inactive) : un champ
  // absent ne compte pas actif — le fait et les alertes ne divergent pas.
  const actives = personnel.filter((p) => Boolean(p.actif));
  const idsAvecHabilitation = new Set(
    habilitations.filter((h) => h.actif).map((h) => h.personneId));
  const enStock = bouteilles.filter((b) => b.statut === 'EN_STOCK');

  const comptes = {
    attestationCapacite: Boolean(etablissement?.numAttestationCapacite),
    echeanceCapacite: etablissement?.dateEcheanceCapacite ?? null,
    nbPersonnesActives: actives.length,
    nbPersonnesAptes: actives.filter((p) =>
      p.numAttestationAptitude || idsAvecHabilitation.has(p.id)).length,
    nbOutils: outillage.length,
    nbOutilsConformes: outillage.filter((o) => o.statut === 'CONFORME').length,
    nbBouteillesStock: enStock.length,
    nbMouvements: mouvements.length,
    nbEnSouffrance: mouvements.filter((m) =>
      m.statut === 'BROUILLON' || m.statut === 'SOUMIS').length,
    // « Au parc » = non démantelées (définition du contrat : getMachines
    // rend TOUT, les vues filtrent — constat IMPORTANT 2 de la revue).
    nbMachines: machines.filter((m) => m.statut !== 'DEMANTELEE').length,
    nbControles: controles.length,
    nbBsff: bsff.length,
    // MÊME définition que la vue Déchets vers laquelle l'étape pointe
    // (bouteille de récupération portant du fluide, quel que soit son
    // statut) : aucune sémantique inédite — constat IMPORTANT 3.
    nbBouteillesRecuperation: bouteilles.filter((b) =>
      b.type === 'RECUPERATION' && b.masseNetteKg > 0).length
  };

  return evaluerAuditGuide({ alertes, registre, officiel, comptes });
}
