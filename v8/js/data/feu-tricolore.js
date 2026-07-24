// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — moteur du tableau de bord de conformité
// « feu tricolore » (brique ①, PUR/Node-testable, zéro DOM).
//
// NE CRÉE AUCUNE RÈGLE MÉTIER NOUVELLE : consolide en un verdict
// unique ce que le store calcule déjà — getAlertes() (familles
// d'ids stables), peutPasserEnOfficiel() (les vérifications
// bloquantes du mode Officiel, SPEC §7.2) et verifierChaineHash()
// (intégrité du registre). La parité Démo/Local est donc héritée
// du contrat, pas re-prouvée ici.
//
// Barème :
//   ROUGE  = au moins une alerte CRITIQUE dans le domaine
//            (ou rupture de la chaîne du registre) ;
//   ORANGE = au moins une alerte IMPORTANT (sans critique) ;
//   VERT   = rien à signaler.
// Feu GLOBAL = pire des domaines ; jamais VERT si les prérequis du
// mode Officiel manquent (une base incomplète — attestation, balance
// ou détecteur jamais renseignés — n'est signalée QUE par
// peutPasserEnOfficiel, pas par les alertes : sans ce garde-fou,
// l'écran afficherait « tout vert » à un inspecteur sur dossier vide).
// ============================================================

/** Ordre de sévérité des feux (pour le « pire des domaines »). */
const SEVERITE = { VERT: 0, ORANGE: 1, ROUGE: 2 };

/**
 * Les domaines de l'écran, dans l'ordre d'affichage. Chaque alerte du
 * store est rattachée par le PRÉFIXE de son id (ids stables posés en
 * Phase C — cf. demo-store.js getAlertes). `vue` = cible de navigation.
 */
export const DOMAINES = [
  { id: 'etablissement', titre: 'Établissement (capacité)',
    detail: 'Attestation de capacité et dossier opérateur (cadre 1 du CERFA).',
    vue: 'admin', prefixes: ['alr-capacite'] },
  { id: 'personnel', titre: 'Personnel (aptitudes)',
    detail: 'Attestations d’aptitude des opérateurs.',
    vue: 'personnel',
    // Chantier B2 : les échéances des habilitations F-Gas et des mentions
    // de formation complémentaire relèvent du même domaine.
    prefixes: ['alr-aptitude-', 'alr-habilitation-', 'alr-mention-',
      'alr-remise-niveau-'] },
  { id: 'controles', titre: 'Contrôles d’étanchéité et fuites',
    detail: 'Échéances de contrôle des machines, fuites non résolues, '
      + 'systèmes de détection permanente.',
    // P1-1 : le système de détection de l'équipement relève du même
    // domaine que les contrôles — il commande leur fréquence (et il est
    // obligatoire au-delà du seuil haut). À ne pas confondre avec le
    // détecteur PORTABLE de l'atelier, qui reste dans « Outillage ».
    vue: 'controles',
    prefixes: ['alr-controle-', 'alr-fuite-', 'alr-detection-'] },
  { id: 'outillage', titre: 'Outillage réglementaire',
    detail: 'Balance, détecteur, station : vérifications et étalonnages.',
    vue: 'outillage', prefixes: ['alr-outil-'] },
  { id: 'balance', titre: 'Balance matière',
    detail: 'Écarts théorique/réel de l’inventaire annuel.',
    vue: 'balance', prefixes: ['alr-ecart-'] },
  { id: 'bouteilles', titre: 'Bouteilles et déchets',
    detail: 'Pesées récentes, délais de garde des fluides déchets.',
    vue: 'bouteilles', prefixes: ['alr-garde-', 'alr-pesee-', 'alr-reemploi-'] },
  { id: 'registre', titre: 'Registre et écritures',
    detail: 'Intégrité de la chaîne, mouvements en souffrance.',
    vue: 'mouvements', prefixes: ['alr-soumis-', 'alr-brouillon-'] }
];

/**
 * Domaine « filet » : toute alerte dont l'id ne correspond à aucun
 * préfixe connu y atterrit — une famille d'alertes ajoutée demain ne
 * passe JAMAIS sous le radar du feu tricolore (l'écran ne doit pas
 * pouvoir mentir à un auditeur par omission).
 */
export const DOMAINE_AUTRES = {
  id: 'autres', titre: 'Autres alertes',
  detail: 'Alertes ne relevant d’aucun domaine ci-dessus.',
  vue: 'dashboard', prefixes: []
};

/** Feu d'une liste d'alertes : ROUGE si critique, ORANGE si important. */
function feuDesAlertes(alertes) {
  if (alertes.some((a) => a.niveau === 'CRITIQUE')) return 'ROUGE';
  if (alertes.length > 0) return 'ORANGE';
  return 'VERT';
}

/** Résumé en français d'un domaine selon ses alertes. */
function resumeDomaine(alertes) {
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

/**
 * ÉVALUATION PURE : agrège alertes + intégrité + verdict Officiel en un
 * état tricolore par domaine et un feu global. Aucune lecture, aucune
 * date calculée ici — tout vient des arguments.
 *
 * @param {{ alertes: Array<{id: string, niveau: string, titre: string,
 *           detail?: string, cible?: {vue: string, id?: string}}>,
 *           registre: { ok: boolean, casseA?: string|number|null },
 *           officiel: { ok: boolean, motifs: string[] } }} entree
 * @returns {{ global: 'VERT'|'ORANGE'|'ROUGE',
 *             officiel: { ok: boolean, motifs: string[] },
 *             registreIntact: boolean,
 *             nbCritiques: number, nbImportantes: number,
 *             domaines: Array<{ id, titre, detail, vue, etat, resume,
 *                               alertes: Array }> }}
 */
export function evaluerConformite({ alertes, registre, officiel }) {
  const restantes = [...(alertes ?? [])];

  const domaines = DOMAINES.map((definition) => {
    const duDomaine = [];
    for (let i = restantes.length - 1; i >= 0; i -= 1) {
      const alerte = restantes[i];
      if (definition.prefixes.some((p) => String(alerte.id).startsWith(p))) {
        duDomaine.unshift(alerte);
        restantes.splice(i, 1);
      }
    }
    return { ...definition, alertes: duDomaine };
  });

  // Filet : les alertes restées orphelines comptent, elles aussi.
  if (restantes.length > 0) {
    domaines.push({ ...DOMAINE_AUTRES, alertes: restantes });
  }

  for (const domaine of domaines) {
    domaine.etat = feuDesAlertes(domaine.alertes);
    domaine.resume = resumeDomaine(domaine.alertes);
  }

  // Le registre altéré est une non-conformité majeure : domaine
  // « registre » forcé ROUGE avec un constat synthétique dédié.
  const registreIntact = Boolean(registre?.ok);
  if (!registreIntact) {
    const dRegistre = domaines.find((d) => d.id === 'registre');
    dRegistre.etat = 'ROUGE';
    dRegistre.resume = 'Rupture de la chaîne des écritures détectée.';
    dRegistre.alertes = [{
      id: 'alr-chaine-registre', niveau: 'CRITIQUE',
      titre: 'Chaîne du registre rompue',
      detail: registre?.casseA != null
        ? `Première rupture à l’écriture ${registre.casseA}.`
        : 'Rupture détectée.',
      cible: { vue: 'admin' }
    }, ...dRegistre.alertes];
  }

  let global = domaines.reduce(
    (pire, d) => (SEVERITE[d.etat] > SEVERITE[pire] ? d.etat : pire), 'VERT');

  // Prérequis du mode Officiel manquants (dossier incomplet) : jamais
  // « tout vert » — au minimum ORANGE (une expiration, elle, est déjà
  // ROUGE via les alertes).
  const officielOk = Boolean(officiel?.ok);
  if (!officielOk && global === 'VERT') global = 'ORANGE';

  const toutes = domaines.flatMap((d) => d.alertes);
  return {
    global,
    officiel: { ok: officielOk, motifs: officiel?.motifs ?? [] },
    registreIntact,
    nbCritiques: toutes.filter((a) => a.niveau === 'CRITIQUE').length,
    nbImportantes: toutes.filter((a) => a.niveau !== 'CRITIQUE').length,
    domaines
  };
}

/**
 * COLLECTE : lit le nécessaire sur le store (contrat DataStore
 * uniquement — marche en Démo comme en Local) puis évalue.
 * @param {object} store — magasin conforme au contrat v8
 */
export async function collecterConformite(store) {
  const [alertes, registre, officiel] = await Promise.all([
    store.getAlertes(),
    store.verifierChaineHash(),
    store.peutPasserEnOfficiel()
  ]);
  return evaluerConformite({ alertes, registre, officiel });
}
