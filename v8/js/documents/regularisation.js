// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — JUSTIFICATIF DE RÉGULARISATION (lot 1, branche A)
//
// DÉCISION DU PROPRIÉTAIRE, 27/07/2026 (docs/PLAN-LOT1-CONTRE-ECRITURE.md
// § 3, branche A) : une contre-écriture ne produit PLUS de fiche CERFA.
// Elle produit CE document, qui dit « la fiche n° X est annulée, voici
// pourquoi ».
//
// POURQUOI. Le CERFA 15497*04 est une fiche d'INTERVENTION sur un
// équipement. Aucune intervention n'a lieu le jour d'une contre-écriture :
// c'est un geste comptable au registre. Émettre un CERFA pour ce geste,
// c'est attester une intervention qui n'a pas eu lieu — et le 4ᵉ audit
// externe a mesuré le résultat : deux fiches officielles numérotées à la
// suite, indiscernables sur 66 champs sur 71.
//
// CE QUE CE DOCUMENT N'EST PAS. Il ne ressemble à aucun formulaire
// officiel : aucun champ AcroForm, aucune reprise de la maquette du
// CERFA, aucun numéro qui puisse passer pour une référence
// réglementaire. C'est tout le point de la décision : DEUX PIÈCES QUI NE
// SE RESSEMBLENT PAS. Le numéro qu'il porte est le numéro d'ÉCRITURE
// INTERNE du registre (celui de l'empreinte chaînée et du journal), et
// il est libellé comme tel.
//
// ⚠️ LA MENTION DE MODE EST DANS LE DOCUMENT, PAS AUTOUR. Le badge de
// mode de l'en-tête de l'application disparaît à l'impression
// (v8/css/coquille.css, bloc @media print) et une modale d'aperçu masque
// tout ce qui n'est pas le document. Une mention posée « à côté » ne
// survivrait donc pas à la feuille de papier : elle est ICI, enfant de
// `.justif-document`, et le bloc d'impression rend visible ce nœud et
// tous ses descendants. Sans cela ce document rejoindrait l'inventaire
// des pièces qui sortent SANS marque de non-officialité
// (LIMITE-DE-RESPONSABILITE.md et les trois pièces qui le reprennent).
//
// Deux sorties, un seul gabarit :
//   — dans l'application, une modale d'aperçu avec bouton Imprimer
//     (`documents/regularisation-apercu.js` — le DOM vit là, jamais ici) ;
//   — dans le dossier d'audit scellé, une page HTML AUTONOME
//     (`regularisations/<numéro>.html`), qui se lit et s'imprime hors du
//     logiciel (patron `documents/verificateur.js`).
//
// ⚠️ MODULE PUR : aucun accès au DOM, aucune importation de `views/`.
// Trois modules d'export ZIP (dossier d'audit, machine, fuite) en
// dépendent et s'annoncent « testables sous Node » ; la modale d'aperçu
// est donc dans un fichier VOISIN, comme `documents/telecharger-dossier.js`
// l'est pour `documents/dossier-commun.js` (constat de la revue du 27/07).
// ============================================================

import { esc, fmtKg, fmtKgSigne, fmtDate, fmtTeq, teqCO2 }
  from '../core/utils.js';
import { MENTION_FORMATION } from '../cerfa/generateur.js';

/* ============================================================
   LA RÈGLE, EN UN SEUL ENDROIT
   ============================================================ */

/**
 * Cette écriture est-elle une contre-écriture (écriture d'annulation) ?
 *
 * ⚠️ LE REFUS SE PORTE SUR `contreEcritureDe`, JAMAIS SUR `cerfaNumero`
 * (décision du plan § 3, branche A). Les contre-écritures DÉJÀ
 * enregistrées gardent leur `cerfaNumero` scellé — on ne réécrit pas le
 * passé, le déclencheur WORM l'interdit d'ailleurs. Mais elles cessent
 * elles aussi d'être IMPRIMÉES en CERFA, sans qu'une seule donnée soit
 * touchée. C'est cette fonction, et elle seule, qui porte la règle :
 * générateur CERFA, dossier d'audit scellé, boutons des vues et
 * compteurs de fiches numérotées l'appellent tous.
 * @param {object|null|undefined} mouvement
 * @returns {boolean}
 */
export function estContreEcriture(mouvement) {
  return Boolean(mouvement && mouvement.contreEcritureDe);
}

/* ============================================================
   Libellés canoniques (repris tels quels par les suites)
   ============================================================ */

/** Titre du document. Il ne contient PAS le mot « CERFA » ni « fiche
 *  d'intervention » : ce n'en est pas une. */
export const TITRE_JUSTIFICATIF = 'JUSTIFICATIF DE RÉGULARISATION';

/** Sous-titre : ce que le document est, en une ligne. */
export const SOUS_TITRE_JUSTIFICATIF =
  'Écriture interne d’annulation au registre des fluides frigorigènes';

/** Mention permanente : elle dit ce que le document N'EST PAS. Sans elle,
 *  un lecteur pressé pourrait le classer avec les fiches d'intervention. */
export const MENTION_PAS_UNE_FICHE_CERFA =
  'Ce document n’est pas une fiche d’intervention CERFA 15497*04 : aucune '
  + 'intervention sur un équipement n’a eu lieu à la date de cette '
  + 'écriture. Il justifie l’ANNULATION, au registre, de la fiche '
  + 'désignée ci-dessus.';

/** Mention permanente : pourquoi il n'y a aucune case de signature.
 *
 *  ⚠️ REVUE DU 27/07 : elle disait « scellée sur l'identité du validateur,
 *  NOMMÉ CI-DESSUS ». Tiré : sans `executeParId`, `validateurId` ni
 *  `technicien`, la ligne « Enregistrée par » vaut « — » et la phrase
 *  promettait un nom absent. Elle dit maintenant OÙ l'identité est
 *  scellée, sans promettre qu'elle est imprimée. */
export const MENTION_SANS_SIGNATURE =
  'Aucune signature manuscrite n’est recueillie sur une contre-écriture : '
  + 'l’identité du validateur est scellée dans l’empreinte de l’écriture '
  + 'et inscrite au journal chaîné du registre.';

/** Mention de mode POSÉE PAR DÉFAUT quand le registre ne dit pas dans quel
 *  mode l'écriture a été passée.
 *
 *  ⚠️ REVUE DU 27/07 : le repli était `mode ?? 'OFFICIEL'`, c'est-à-dire le
 *  repli le plus OUVERT — un mouvement sans mode sortait un document SANS
 *  aucune marque (tiré). Le sens du repli est maintenant celui de la
 *  maison : le doute AJOUTE la marque, il ne la retire pas. La mention ne
 *  dit pas « mode formation » (ce serait affirmer ce qu'on ne sait pas),
 *  elle dit ce qu'on sait : le mode n'est pas au registre. */
export const MENTION_MODE_INDETERMINE =
  'MODE NON RENSEIGNÉ AU REGISTRE — DOCUMENT NON OFFICIEL — '
  + 'NE PAS UTILISER POUR UNE INTERVENTION RÉELLE';

/** Refus canonique : la cible n'est pas une écriture d'annulation. */
export const MSG_PAS_UNE_CONTRE_ECRITURE =
  'Justificatif de régularisation impossible : cette écriture n’est pas '
  + 'une contre-écriture.';

/** Refus canonique : mouvement introuvable. */
export const MSG_MOUVEMENT_INTROUVABLE =
  'Justificatif de régularisation impossible : écriture introuvable au '
  + 'registre.';

/** Ce qui remplace le CERFA d'une contre-écriture au dossier scellé.
 *
 *  ⚠️ REVUE DU 27/07 : la ligne disait « la masse RETIRÉE avec son signe ».
 *  Faux deux fois sur quatre natures, tiré : l'annulation d'une
 *  RÉCUPÉRATION porte une masse AJOUTÉE (+ 1,20 kg) et celle d'un CONTRÔLE
 *  une masse nulle. Un sommaire de dossier scellé n'annonce que ce qu'il
 *  peut tenir : la masse est PORTÉE, avec le signe qu'elle a au registre. */
export const LIGNE_SOMMAIRE_REGULARISATIONS =
  'Les fichiers regularisations/*.html sont les JUSTIFICATIFS DE '
  + 'RÉGULARISATION des écritures d’annulation (contre-écritures) de '
  + 'l’année. Depuis le 27/07/2026 une contre-écriture ne donne plus lieu '
  + 'à une fiche CERFA — aucune intervention n’a eu lieu à sa date — mais '
  + 'à ce justificatif, qui nomme la fiche annulée, le motif, l’auteur et '
  + 'la masse portée au registre avec son signe. Le dossier reste complet : '
  + 'la pièce n’est pas retirée, elle est remplacée.';

/* ============================================================
   Assemblage des faits (pur — aucun accès au DOM, aucun store)
   ============================================================ */

/** Libellé d'une bouteille pour le document. */
function libelleBouteille(bouteille) {
  if (!bouteille) return null;
  const morceaux = [bouteille.code || bouteille.id];
  if (bouteille.numeroReel) morceaux.push(`n° gravé ${bouteille.numeroReel}`);
  if (bouteille.fluide) morceaux.push(bouteille.fluide);
  if (bouteille.etatFluide) morceaux.push(bouteille.etatFluide);
  return morceaux.filter(Boolean).join(' — ');
}

/**
 * Nombre RÉELLEMENT porté par le registre, ou `null`.
 *
 * ⚠️ REVUE DU 27/07, CONSTAT TIRÉ. La garde précédente était
 * `Number.isFinite(Number(valeur))` — et `Number(null) === 0`, qui est
 * fini. Une valeur ABSENTE devenait donc le nombre ZÉRO, et le document
 * imprimait « 0,00 kg » là où il n'y avait aucun équipement (contre-
 * écriture d'un TRANSFERT). C'est l'image inversée du précédent de la
 * maison : une garde avait fait DISPARAÎTRE une masse ; celle-ci en
 * FAISAIT APPARAÎTRE une. Sur une pièce de preuve, « 0,00 kg » est une
 * affirmation — et elle était fausse.
 *
 * Un zéro RÉELLEMENT écrit au registre (contrôle d'étanchéité) reste, lui,
 * un zéro : il traverse cette fonction intact. Le doute ne retire jamais
 * une masse, il refuse seulement d'en inventer une.
 * @param {*} valeur
 * @returns {number|null}
 */
function nombreOuNull(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? nombre : null;
}

/** Masse à afficher : TOUJOURS une valeur, jamais une case vide. */
function masseAffichable(valeur) {
  return valeur === null || valeur === undefined
    ? 'non renseignée au registre'
    : fmtKgSigne(valeur);
}

/** Libellés français des natures d'écriture. Le CODE du registre est
 *  conservé À CÔTÉ du libellé : un document de preuve n'a pas à choisir
 *  entre être lisible et être exact — il est les deux. */
const LIBELLES_NATURE = {
  CHARGE_APPOINT: 'Complément de charge',
  MISE_EN_SERVICE: 'Mise en service',
  RECUPERATION_MAINTENANCE: 'Récupération (maintenance)',
  RECUPERATION_DEMANTELEMENT: 'Récupération (démantèlement)',
  TRANSFERT: 'Transfert entre contenants',
  ASSEMBLAGE: 'Assemblage',
  MODIFICATION: 'Modification',
  CONTROLE_PERIODIQUE: 'Contrôle d’étanchéité périodique',
  CONTROLE_NON_PERIODIQUE: 'Contrôle d’étanchéité non périodique',
  AUTRE: 'Autre intervention'
};

/** « Complément de charge (CHARGE_APPOINT) » — jamais l'un sans l'autre. */
function natureLisible(code) {
  if (!code) return null;
  const libelle = LIBELLES_NATURE[code];
  return libelle ? `${libelle} (${code})` : String(code);
}

/**
 * Rassemble les faits du justificatif à partir des collections du store.
 * Fonction PURE : elle ne lit ni le DOM, ni le réseau — d'où sa testabilité
 * directe sous Node.
 *
 * ⚠️ L'AUTEUR EST RÉSOLU PAR LA FICHE VIVANTE, jamais par le champ figé
 * `technicien`. Constat de la revue du 27/07 : prendre le champ figé
 * re-nommerait EN CLAIR, dans le dossier scellé, une personne que le
 * COFFRE DES IDENTITÉS vient de pseudonymiser — alors que `mouvements.csv`,
 * pièce voisine du MÊME dossier, la nomme par son pseudonyme. Même ordre
 * de résolution que `csvMouvements` (`executeParId`, puis `validateurId`,
 * puis le champ figé en dernier recours seulement).
 *
 * ⚠️ LE DÉTENTEUR EST UN TIERS, ET LE DOCUMENT DOIT LE DIRE. Constat de la
 * revue du 27/07 : le seul nom d'entreprise imprimé était celui de
 * l'établissement, en tête, SANS étiquette de qualité — un lecteur pressé
 * en concluait que le matériel appartient au lycée. L'ancien CERFA, lui,
 * distinguait le cadre 1 (opérateur) du cadre 2 (détenteur). Ce document
 * reprend la MÊME résolution que `generateur.js` (client de la machine,
 * sinon l'établissement) et NOMME les deux qualités.
 *
 * @param {{ mouvement: object, mouvements: object[], machines: object[],
 *   bouteilles: object[], fluides: object[], personnel: object[],
 *   clients: object[], etablissement: object }} sources
 * @returns {object} faits du document
 */
export function assemblerJustificatif({
  mouvement, mouvements = [], machines = [], bouteilles = [], fluides = [],
  personnel = [], clients = [], etablissement = {}
}) {
  if (!mouvement) throw new Error(MSG_MOUVEMENT_INTROUVABLE);
  if (!estContreEcriture(mouvement)) {
    throw new Error(MSG_PAS_UNE_CONTRE_ECRITURE);
  }

  const annulee =
    mouvements.find((mv) => mv.id === mouvement.contreEcritureDe) || null;
  const machine = mouvement.machineId
    ? machines.find((m) => m.id === mouvement.machineId) || null
    : null;
  const client = machine?.clientId
    ? clients.find((c) => c.id === machine.clientId) || null
    : null;
  const fluide = mouvement.fluide
    ? fluides.find((f) => f.code === mouvement.fluide) || null
    : null;
  const bouteilleSrc = mouvement.bouteilleSrcId
    ? bouteilles.find((b) => b.id === mouvement.bouteilleSrcId) || null
    : null;
  const bouteilleDst = mouvement.bouteilleDstId
    ? bouteilles.find((b) => b.id === mouvement.bouteilleDstId) || null
    : null;

  const idAuteur = mouvement.executeParId ?? mouvement.validateurId ?? null;
  const ficheAuteur = idAuteur
    ? personnel.find((p) => p.id === idAuteur) || null
    : null;
  const auteur = ficheAuteur
    ? `${ficheAuteur.prenom} ${ficheAuteur.nom}`.trim()
    : (mouvement.technicien ? String(mouvement.technicien).trim() : null);

  // Les deux masses, chacune avec le signe qu'elle porte AU REGISTRE, plus
  // leur somme : trois nombres qu'un lecteur peut vérifier lui-même. On
  // n'affirme rien de plus — le doute retire un allègement, jamais une
  // masse, et jamais on ne remplace un chiffre par une promesse.
  const masseEcriture = nombreOuNull(mouvement.quantiteKg);
  const masseAnnulee = annulee ? nombreOuNull(annulee.quantiteKg) : null;
  const somme = masseEcriture !== null && masseAnnulee !== null
    ? Math.round((masseEcriture + masseAnnulee) * 1000) / 1000
    : null;

  const chargeNominaleKg = machine ? nombreOuNull(machine.chargeNominaleKg)
    : null;
  const prpFige = nombreOuNull(mouvement.prpFige);

  return {
    // L'écriture d'annulation elle-même
    numero: mouvement.numero ?? null,
    date: mouvement.date ?? null,
    // ⚠ AUCUN REPLI OUVERT : le mode est celui du registre, ou rien. Le
    // gabarit MARQUE le document quand il n'est pas explicitement OFFICIEL.
    mode: mouvement.mode ?? null,
    type: mouvement.type ?? null,
    auteur,
    motif: mouvement.motif ? String(mouvement.motif).trim() : null,
    // La fiche annulée. `annuleeTrouvee` sépare « le registre dit qu'il
    // n'y avait rien » de « nous n'avons pas retrouvé l'écriture » — sans
    // lui, le document AFFIRMAIT trois choses qu'il n'avait pas mesurées
    // (doctrine png.js : INDÉTERMINABLE, jamais une accusation).
    annuleeTrouvee: Boolean(annulee),
    numeroAnnule: annulee?.numero ?? null,
    dateAnnulee: annulee?.date ?? null,
    typeAnnule: annulee?.type ?? null,
    cerfaAnnule: annulee?.cerfaNumero ?? null,
    statutAnnule: annulee?.statut ?? null,
    causeAnnulee: annulee?.causeMouvement
      ? String(annulee.causeMouvement).trim() : null,
    // Les masses, signées
    masseEcriture,
    masseAnnulee,
    somme,
    // Le contexte matériel
    machineLibelle: machine
      ? `${machine.code ?? machine.id} — ${machine.designation ?? ''}`.trim()
      : (mouvement.machineLabel ?? null),
    machineModele: machine
      ? ([machine.marque, machine.modele].filter(Boolean).join(' ') || null)
      : null,
    machineNumSerie: machine ? (machine.numSerie ?? null) : null,
    chargeNominaleKg,
    fluideCode: mouvement.fluide ?? null,
    fluideFamille: fluide?.famille ?? null,
    prpFige,
    // Équivalent CO₂ de la charge NOMINALE, calculé par la seule fonction
    // du dépôt (`teqCO2`, core/utils.js) et à partir du PRP FIGÉ à cette
    // écriture — donc reproductible à la main par le lecteur. Absent dès
    // qu'un des deux nombres manque : on ne complète jamais par un zéro.
    teqNominale: chargeNominaleKg !== null && prpFige !== null
      ? teqCO2(chargeNominaleKg, prpFige) : null,
    bouteilleSrc: libelleBouteille(bouteilleSrc),
    bouteilleDst: libelleBouteille(bouteilleDst),
    // Le scellement
    empreinte: mouvement.hashEcriture ?? null,
    empreintePrecedente: mouvement.hashPrecedent ?? null,
    versionEmpreinte: mouvement.versionEmpreinte ?? null,
    // L'opérateur (celui qui a réalisé l'opération annulée) et le
    // DÉTENTEUR de l'équipement — deux qualités, jamais confondues.
    etablissement: {
      raisonSociale: etablissement?.raisonSociale ?? '',
      adresse: etablissement?.adresse ?? '',
      siret: etablissement?.siret ?? '',
      numAttestationCapacite: etablissement?.numAttestationCapacite ?? ''
    },
    detenteur: machine
      ? {
        raisonSociale: client
          ? (client.raisonSociale ?? '')
          : (etablissement?.raisonSociale ?? ''),
        adresse: client ? (client.adresse ?? '')
          : (etablissement?.adresse ?? ''),
        siret: client ? (client.siret ?? '') : (etablissement?.siret ?? ''),
        // Le repli sur l'établissement est celui du CERFA (cadre 2) : il
        // est REPRIS, pas inventé — mais il est DIT, pour qu'on ne prenne
        // pas une absence de client pour une propriété constatée.
        tiers: Boolean(client)
      }
      : null
  };
}

/**
 * Charge les collections nécessaires et assemble le justificatif d'une
 * écriture d'annulation.
 * @param {object} store - magasin de données v8
 * @param {string} mouvementId
 * @returns {Promise<object>} faits du document
 */
export async function construireJustificatif(store, mouvementId) {
  const [mouvements, machines, bouteilles, fluides, personnel, clients,
    etablissement] = await Promise.all([
    store.getMouvements(), store.getMachines(), store.getBouteilles(),
    store.getFluides(), store.getPersonnel(), store.getClients(),
    store.getEtablissement()
  ]);
  const mouvement = mouvements.find((mv) => mv.id === mouvementId) || null;
  return assemblerJustificatif({
    mouvement, mouvements, machines, bouteilles, fluides, personnel, clients,
    etablissement
  });
}

/* ============================================================
   Le gabarit HTML — LE document
   ============================================================ */

/** Une ligne « libellé / valeur » du document. */
function ligne(libelle, valeur, classe = '') {
  const texte = (valeur === null || valeur === undefined || valeur === '')
    ? '—' : String(valeur);
  return '<div class="justif-ligne' + (classe ? ' ' + classe : '') + '">'
    + '<span class="justif-libelle">' + esc(libelle) + '</span>'
    + '<span class="justif-valeur">' + esc(texte) + '</span>'
    + '</div>';
}

/** Bloc titré du document. */
function bloc(titre, contenuHtml, classe = '') {
  return '<section class="justif-bloc' + (classe ? ' ' + classe : '') + '">'
    + '<h2 class="justif-bloc-titre">' + esc(titre) + '</h2>'
    + contenuHtml + '</section>';
}

/**
 * Construit le HTML du document lui-même (nœud `.justif-document`).
 * C'est ce nœud, et lui seul, que le bloc d'impression laisse visible :
 * TOUT ce qui doit survivre au papier est DEDANS, la mention de mode
 * comprise.
 * @param {object} j - faits rendus par assemblerJustificatif
 * @returns {string} HTML
 */
export function gabaritJustificatif(j) {
  const formation = j.mode === 'FORMATION';
  // ⚠ Le doute AJOUTE la marque : tout mode qui n'est pas explicitement
  // OFFICIEL fait sortir le document marqué.
  const texteMode = formation ? MENTION_FORMATION
    : (j.mode === 'OFFICIEL' ? '' : MENTION_MODE_INDETERMINE);

  // ⚠️ LA MENTION DE MODE, PREMIER ENFANT DU DOCUMENT. Elle est du TEXTE
  // (pas un fond coloré, pas une image) : elle s'imprime même quand le
  // navigateur refuse les couleurs d'arrière-plan, réglage par défaut de
  // la plupart des postes.
  const bandeauMode = texteMode
    ? '<div class="justif-mode">' + esc(texteMode) + '</div>'
    : '';

  // ⚠️ UNE FEUILLE DÉTACHÉE PORTE SON IDENTITÉ. Ce bandeau ne s'affiche
  // qu'à l'IMPRESSION et se répète sur CHAQUE page (position: fixed —
  // mesuré : deux occurrences sur un document de deux pages, alors que
  // `display: table-header-group` n'en donne qu'une). Sans lui, la page 2
  // sortait sans mention de mode, sans titre et sans numéro : une feuille
  // sans marque et sans identité, exactement ce que l'inventaire des
  // documents non marqués sert à empêcher (revue du 27/07).
  const repere = '<div class="justif-repere" aria-hidden="true">'
    + '<span class="justif-repere-identite">'
    + esc(TITRE_JUSTIFICATIF + ' — écriture n° ' + (j.numero ?? '—')
      + (j.numeroAnnule ? ' — annule la fiche n° ' + j.numeroAnnule : ''))
    + '</span>'
    + (texteMode
      ? '<span class="justif-repere-mode">' + esc(texteMode) + '</span>' : '')
    + '</div>';

  const enTete = '<header class="justif-entete">'
    + '<div class="justif-titre">' + esc(TITRE_JUSTIFICATIF) + '</div>'
    + '<div class="justif-sous-titre">' + esc(SOUS_TITRE_JUSTIFICATIF)
    + '</div>'
    + (j.etablissement.raisonSociale
      ? '<div class="justif-etab">'
        + '<span class="justif-qualite">Opérateur — entreprise qui a '
        + 'réalisé l’opération annulée :</span> '
        + esc(j.etablissement.raisonSociale)
        + (j.etablissement.adresse ? ' — ' + esc(j.etablissement.adresse) : '')
        + (j.etablissement.siret
          ? ' — SIRET ' + esc(j.etablissement.siret) : '')
        + (j.etablissement.numAttestationCapacite
          ? ' — attestation de capacité n° '
            + esc(j.etablissement.numAttestationCapacite) : '')
        + '</div>'
      : '')
    + '</header>';

  // ⚠ On ne dit « cette écriture n'en portait pas » que si l'écriture
  // annulée a été RETROUVÉE. Sinon on dit qu'on ne l'a pas retrouvée : une
  // pièce de preuve ne conclut pas sur ce qu'elle n'a pas lu.
  const introuvable = 'écriture annulée non retrouvée au registre fourni';
  const blocAnnulee = bloc('Fiche annulée',
    ligne('Numéro d’écriture au registre',
      j.annuleeTrouvee ? j.numeroAnnule : introuvable, 'justif-fort')
    + ligne('N° de fiche CERFA annulée', j.annuleeTrouvee
      ? (j.cerfaAnnule ?? 'aucune (cette écriture n’en portait pas)')
      : introuvable)
    + ligne('Date de l’écriture annulée', j.dateAnnulee
      ? fmtDate(j.dateAnnulee) : (j.annuleeTrouvee ? null : introuvable))
    + ligne('Nature de l’opération annulée', j.annuleeTrouvee
      ? natureLisible(j.typeAnnule) : introuvable)
    + ligne('Statut au registre', j.annuleeTrouvee ? j.statutAnnule
      : introuvable)
    + ligne('Cause portée sur l’écriture annulée', j.annuleeTrouvee
      ? j.causeAnnulee : introuvable),
    'justif-bloc-annule');

  const blocMotif = bloc('Motif de l’annulation',
    '<p class="justif-motif">'
    + esc(j.motif ?? 'Motif absent du registre.') + '</p>',
    'justif-bloc-motif');

  const blocEcriture = bloc('Écriture d’annulation',
    ligne('Numéro d’écriture INTERNE au registre', j.numero, 'justif-fort')
    + ligne('Date de l’écriture', j.date ? fmtDate(j.date) : null)
    + ligne('Enregistrée par', j.auteur)
    + ligne('Mode', formation
      ? 'FORMATION (document non officiel)'
      : (j.mode ?? 'non renseigné au registre'))
    // Le registre reprend la nature de l'opération annulée : c'est ce
    // qu'il porte, et le libellé le DIT — sans quoi le document laisserait
    // croire qu'une charge d'appoint a été faite ce jour-là.
    + ligne('Nature portée au registre (reprise de l’opération annulée)',
      natureLisible(j.type)));

  const blocMasses = bloc('Masses portées au registre',
    ligne('Masse de l’écriture annulée', j.annuleeTrouvee
      ? masseAffichable(j.masseAnnulee) : introuvable)
    + ligne('Masse de la présente écriture d’annulation',
      masseAffichable(j.masseEcriture), 'justif-fort')
    + ligne('Somme des deux écritures', j.somme === null
      ? (j.annuleeTrouvee ? 'non calculable (masse absente du registre)'
        : 'non calculable (' + introuvable + ')')
      : fmtKgSigne(j.somme))
    + '<p class="justif-note">Les masses sont portées avec le signe qu’elles '
    + 'ont AU REGISTRE. Aucune n’est arrondie à zéro ni retirée du '
    + 'document : ce justificatif dit ce que le registre porte.</p>');

  const blocDetenteur = j.detenteur
    ? bloc('Détenteur de l’équipement',
      ligne('Détenteur', j.detenteur.raisonSociale || null, 'justif-fort')
      + ligne('Adresse', j.detenteur.adresse || null)
      + ligne('SIRET', j.detenteur.siret || null)
      + (j.detenteur.tiers ? ''
        : '<p class="justif-note">Aucun client détenteur n’est enregistré '
          + 'pour cet équipement : c’est l’établissement opérateur qui est '
          + 'porté ici, comme au cadre 2 de la fiche d’intervention.</p>'))
    : '';

  const blocMateriel = bloc('Équipement, fluide et contenants',
    ligne('Équipement', j.machineLibelle)
    + ligne('Marque et modèle', j.machineModele)
    + ligne('N° de série', j.machineNumSerie)
    + ligne('Charge nominale de l’équipement',
      j.chargeNominaleKg === null ? null : fmtKg(j.chargeNominaleKg))
    + ligne('Fluide', j.fluideCode
      ? j.fluideCode + (j.fluideFamille ? ` (${j.fluideFamille})` : '') : null)
    + ligne('PRP figé à cette écriture (AR4)', j.prpFige)
    + ligne('Équivalent CO₂ de la charge nominale',
      j.teqNominale === null ? null : fmtTeq(j.teqNominale))
    + ligne('Contenant source', j.bouteilleSrc)
    + ligne('Contenant destination', j.bouteilleDst));

  // ⚠️ CE QUE L'EMPREINTE SOUTIENT, ET RIEN DE PLUS. La première rédaction
  // faisait dire à l'empreinte qu'elle datait CE PAPIER. C'était faux : ce
  // papier est composé à la demande, à chaque ouverture — l'empreinte,
  // elle, porte sur l'ÉCRITURE au registre, pas sur la feuille. Même
  // doctrine que `borne-scellement.js` : on ne dit jamais plus que ce que
  // le mécanisme délivre. Et la note ne s'imprime QUE si l'empreinte est
  // là — sans quoi le document vantait une preuve absente (tiré).
  const blocScellement = bloc('Scellement de l’écriture',
    ligne('Empreinte SHA-256 de l’écriture', j.empreinte, 'justif-mono')
    + ligne('Empreinte de l’écriture précédente', j.empreintePrecedente,
      'justif-mono')
    + ligne('Version d’empreinte', j.versionEmpreinte)
    + (j.empreinte
      ? '<p class="justif-note">L’empreinte ci-dessus a été calculée et '
        + 'scellée à la CRÉATION de l’écriture, puis chaînée à la '
        + 'précédente : elle porte sur l’ÉCRITURE au registre. Le présent '
        + 'justificatif, lui, est composé à la demande à partir de cette '
        + 'écriture scellée ; recalculer l’empreinte de l’écriture au '
        + 'registre permet de le recouper.</p>'
      : '<p class="justif-note">Aucune empreinte n’est portée par cette '
        + 'écriture au registre : le recoupement par empreinte n’est pas '
        + 'possible ici.</p>'));

  const pied = '<footer class="justif-pied">'
    + '<p>' + esc(MENTION_PAS_UNE_FICHE_CERFA) + '</p>'
    + '<p>' + esc(MENTION_SANS_SIGNATURE) + '</p>'
    + '<p class="justif-origine">Document produit par inerWeb Fluide.</p>'
    + '</footer>';

  return '<div class="justif-document" data-mode="'
    + esc(j.mode ?? 'INDETERMINE') + '">'
    + '<div class="justif-filigrane" aria-hidden="true">ANNULATION</div>'
    + repere
    + bandeauMode
    + enTete
    + blocAnnulee
    + blocMotif
    + blocEcriture
    + blocMasses
    + blocDetenteur
    + blocMateriel
    + blocScellement
    + pied
    + '</div>';
}

/* ============================================================
   Styles
   ============================================================ */

/** Styles du document — communs à la modale et à la page autonome. */
export const CSS_JUSTIFICATIF = `
.justif-document {
  position: relative;
  overflow: hidden;
  max-width: 190mm;
  margin: 0 auto;
  padding: 18px 20px 14px;
  background: #ffffff;
  color: #14202e;
  border: 2px solid #14202e;
  font-family: system-ui, "Segoe UI", Roboto, Arial, sans-serif;
  font-size: 12.5px;
  line-height: 1.45;
}

/* Filigrane : du TEXTE, pas un fond — il s'imprime même quand le
   navigateur refuse les arrière-plans (réglage par défaut usuel). */
.justif-filigrane {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-28deg);
  font-size: 62px;
  font-weight: 800;
  letter-spacing: .08em;
  color: #a51c1c;
  opacity: .12;
  pointer-events: none;
  white-space: nowrap;
}

/* LA MENTION DE MODE. Premier enfant du document, jamais un décor de
   l'application : c'est elle qui empêche ce justificatif de rejoindre
   l'inventaire des documents sortis sans marque de non-officialité. */
.justif-mode {
  position: relative;
  margin: 0 0 12px;
  padding: 7px 10px;
  border: 2px solid #a51c1c;
  color: #a51c1c;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: .02em;
  text-align: center;
}

/* LE BANDEAU RÉPÉTÉ SUR CHAQUE PAGE. Invisible à l'écran : il n'a de sens
   que sur du papier, où une feuille peut se détacher des autres. */
.justif-repere { display: none; }

.justif-entete { position: relative; margin-bottom: 14px; }

.justif-qualite { font-weight: 700; }

.justif-titre {
  font-size: 21px;
  font-weight: 800;
  letter-spacing: .04em;
}

.justif-sous-titre { font-size: 12.5px; color: #3d4a5c; }

.justif-etab {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #14202e;
  font-size: 11.5px;
  color: #3d4a5c;
}

.justif-bloc {
  position: relative;
  margin-bottom: 11px;
  padding: 8px 10px;
  border: 1px solid #8e9aab;
}

.justif-bloc-titre {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #3d4a5c;
}

.justif-bloc-annule { border-width: 2px; border-color: #14202e; }
.justif-bloc-motif { border-width: 2px; border-color: #a51c1c; }

.justif-ligne {
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 2px 0;
  border-bottom: 1px dotted #c7cfd9;
}

.justif-ligne:last-child { border-bottom: 0; }

.justif-libelle { flex: 0 0 46%; color: #3d4a5c; }

.justif-valeur { flex: 1; font-weight: 600; overflow-wrap: anywhere; }

.justif-fort .justif-valeur { font-size: 15px; }

.justif-mono .justif-valeur {
  font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
  font-size: 10.5px;
  font-weight: 500;
}

.justif-motif {
  margin: 0;
  padding: 6px 8px;
  border-left: 4px solid #a51c1c;
  font-size: 15px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.justif-note {
  margin: 6px 0 0;
  font-size: 10.5px;
  color: #3d4a5c;
}

.justif-pied {
  position: relative;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 2px solid #14202e;
  font-size: 10.5px;
  color: #14202e;
}

.justif-pied p { margin: 0 0 4px; }

.justif-origine { color: #3d4a5c; }

/* ============================================================
   CE QUI TIENT SUR LE PAPIER — commun à la modale et à la page
   autonome (le document fait DEUX pages avec les marges par défaut).
   ============================================================ */
@media print {
  /* Place réservée EN BAS de chaque feuille pour le bandeau répété. */
  @page { margin: 10mm 8mm 20mm; }

  /* ⚠️ LE BANDEAU QUI REPARAÎT SUR CHAQUE PAGE (mesuré : deux
     occurrences sur un document de deux pages). Sans lui, la page 2
     sortait sans mention de mode, sans titre et sans numéro. */
  .justif-repere {
    display: block;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 3px 4px 0;
    border-top: 1px solid #a51c1c;
    background: #ffffff;
    color: #a51c1c;
    font-size: 9px;
    font-weight: 700;
    line-height: 1.25;
    text-align: center;
  }

  .justif-repere span { display: block; }

  /* Un libellé ne part jamais sans sa valeur, ni un bloc sans son titre :
     l'empreinte SHA-256 tombait page 2 pendant que son libellé restait
     orphelin page 1. */
  .justif-ligne,
  .justif-motif,
  .justif-note { break-inside: avoid; page-break-inside: avoid; }

  .justif-bloc-titre { break-after: avoid; page-break-after: avoid; }

  .justif-bloc-annule,
  .justif-bloc-motif,
  .justif-pied { break-inside: avoid; page-break-inside: avoid; }

  /* Le cadre du document ne doit pas rogner ce qui passe à la page
     suivante : la coupe du filigrane (overflow) sert à l'écran, elle n'a
     plus lieu d'être sur le papier. */
  .justif-document { overflow: visible; }
}
`;

/**
 * Les classes que `views/communs.js` pose entre `<body>` et le document,
 * dans cet ordre. Ce sont EXACTEMENT les ancêtres à neutraliser à
 * l'impression — et la suite vérifie que `modale()` les pose encore, sans
 * quoi la neutralisation viserait à côté et la feuille redeviendrait
 * muette sans que rien ne rougisse.
 * @type {string[]}
 */
export const ANCETRES_MODALE = [
  'modale-fond', 'modale', 'modale-corps', 'justif-apercu'
];

/** Aperçu à l'écran (modale) + IMPRESSION du seul document.
 *  EXPORTÉ pour être éprouvé : c'est ce bloc qui décide de ce qui reste
 *  sur la feuille de papier, et une règle d'impression ne se relit pas,
 *  elle se tire (`test-justificatif-regularisation.mjs`, section 3). */
export const CSS_IMPRESSION_APERCU = `
.justif-apercu {
  padding: 18px 10px;
  background: var(--fond-2);
  border-radius: var(--rayon-bouton);
}

/* ⚠️ Impression : seul le document reste visible. Le badge de mode de
   l'en-tête de l'application est de toute façon masqué par
   v8/css/coquille.css — d'où la mention de mode PORTÉE PAR LE DOCUMENT
   (.justif-mode ci-dessus), qui est un descendant de .justif-document et
   reste donc visible ici. */
@media print {
  body * { visibility: hidden; }

  .justif-document,
  .justif-document * { visibility: visible; }

  /* Rien de l'application ne PREND DE PLACE sur la feuille : la zone
     principale reste dans le flux quand elle n'est qu'invisible, et le
     document commençait alors après elle. Écrit en « body > * » plutôt
     qu'en énumérant #entete/#sidebar/… : la règle ne peut pas oublier un
     écran ajouté plus tard. Ce bloc ne vit que le temps de l'aperçu (le
     style est retiré à la fermeture de la modale). */
  body > * { display: none !important; }

  body > #zone-modales,
  body > .modale-fond { display: block !important; }

  /* Dans la modale : ni barre de titre, ni boutons — ils sont invisibles,
     mais ils occupaient le haut de la première feuille. */
  .modale-entete,
  .modale-actions { display: none !important; }

  /* ⚠️⚠️ LA BOÎTE DE LA MODALE ROGNAIT LA FEUILLE — constat TIRÉ le
     27/07 (impression réelle, Chrome et Edge) : le document sortait sur
     UNE page de 219 caractères au lieu de deux pages complètes. Il n'y
     restait que le bandeau de mode, le titre et le sous-titre ; le numéro
     de la fiche annulée, le motif, les trois masses, l'auteur et
     l'empreinte étaient ABSENTS DU PAPIER.
     Cause : .modale porte max-height: calc(100vh - 40px) et
     overflow: hidden, .modale-corps un overflow-y: auto, et
     .modale-fond un backdrop-filter — qui en fait le bloc conteneur,
     de sorte que même position: absolute ne sort pas le document de la
     boîte. Le patron recopié (documents/plaque-fgas.js) est calibré pour une
     étiquette de 100 mm qui tient sur une page : il ne pouvait pas le
     dire. Rien ici n'est décoratif — chaque ligne retire une cause de
     rognage mesurée. */
  #zone-modales,
  .modale-fond,
  .modale,
  .modale-corps,
  .justif-apercu {
    position: static;
    display: block;
    overflow: visible;
    max-height: none;
    max-width: none;
    width: auto;
    padding: 0;
    margin: 0;
    background: none;
    border: 0;
    box-shadow: none;
    backdrop-filter: none;
    transform: none;
    opacity: 1;
  }

  /* ⚠ MESURÉ, ET C'EST LE PIÈGE LE PLUS FIN DU LOT. composants.css pose
     .modale-fond.visible .modale { transform: translateY(0) } — deux
     classes, donc une spécificité qui BAT la remise à plat ci-dessus, qui
     n'en a qu'une. Or un ancêtre TRANSFORMÉ devient le bloc conteneur de
     ses descendants position: fixed : le bandeau répété cessait alors de
     se répéter (une seule occurrence sur deux feuilles, contre deux hors
     de la modale). La règle est réécrite ici à la même spécificité. */
  .modale-fond.visible .modale { transform: none; }

  /* ⚠ Le document reste DANS LE FLUX : sorti en « position: absolute », il
     ne se paginait plus de la même façon et le bandeau répété ne reparaissait
     plus qu'une fois sur trois feuilles (mesuré). Il n'a plus besoin d'en
     sortir, puisque plus rien ne le précède. */
  .justif-document {
    position: relative;
    width: auto;
    max-width: 100%;
    margin: 0;
    border-width: 2px;
  }
}
`;

/** Identifiant du nœud <style> posé par la modale d'aperçu (DOM :
 *  `documents/regularisation-apercu.js`). Nommé ici pour rester à côté du
 *  CSS qu'il transporte. */
export const STYLE_JUSTIFICATIF_ID = 'style-justificatif-regularisation';

/* ============================================================
   Page HTML AUTONOME (dossier d'audit scellé)
   ============================================================ */

/**
 * Page HTML complète et autonome du justificatif : elle se lit et
 * s'imprime hors du logiciel, depuis l'archive scellée, sans réseau et
 * sans feuille de style externe (patron `documents/verificateur.js`).
 * @param {object} j - faits rendus par assemblerJustificatif
 * @returns {string} document HTML complet
 */
export function justificatifHtmlAutonome(j) {
  const titrePage = `${TITRE_JUSTIFICATIF} — ${j.numero ?? ''}`.trim();
  return '<!DOCTYPE html>\n'
    + '<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>' + esc(titrePage) + '</title>\n'
    + '<style>\n'
    + 'body { margin: 0; padding: 18px 12px; background: #eef1f5; }\n'
    + '@media print { body { background: #ffffff; padding: 0; } }\n'
    + CSS_JUSTIFICATIF
    + '</style>\n</head>\n<body>\n'
    + gabaritJustificatif(j)
    + '\n</body>\n</html>\n';
}

