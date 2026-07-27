// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
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
//     (patron `plaque-fgas.js`) ;
//   — dans le dossier d'audit scellé, une page HTML AUTONOME
//     (`regularisations/<numéro>.html`), qui se lit et s'imprime hors du
//     logiciel (patron `documents/verificateur.js`).
// ============================================================

import { modale, ICONES } from '../views/communs.js';
import { esc, fmtKg, fmtKgSigne, fmtDate } from '../core/utils.js';
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

/** Mention permanente : pourquoi il n'y a aucune case de signature. */
export const MENTION_SANS_SIGNATURE =
  'Aucune signature manuscrite n’est recueillie sur une contre-écriture : '
  + 'elle est scellée sur l’identité du validateur, nommé ci-dessus, et '
  + 'inscrite au journal chaîné du registre.';

/** Refus canonique : la cible n'est pas une écriture d'annulation. */
export const MSG_PAS_UNE_CONTRE_ECRITURE =
  'Justificatif de régularisation impossible : cette écriture n’est pas '
  + 'une contre-écriture.';

/** Refus canonique : mouvement introuvable. */
export const MSG_MOUVEMENT_INTROUVABLE =
  'Justificatif de régularisation impossible : écriture introuvable au '
  + 'registre.';

/** Ce qui remplace le CERFA d'une contre-écriture au dossier scellé. */
export const LIGNE_SOMMAIRE_REGULARISATIONS =
  'Les fichiers regularisations/*.html sont les JUSTIFICATIFS DE '
  + 'RÉGULARISATION des écritures d’annulation (contre-écritures) de '
  + 'l’année. Depuis le 27/07/2026 une contre-écriture ne donne plus lieu '
  + 'à une fiche CERFA — aucune intervention n’a eu lieu à sa date — mais '
  + 'à ce justificatif, qui nomme la fiche annulée, le motif, l’auteur et '
  + 'la masse retirée avec son signe. Le dossier reste complet : la pièce '
  + 'n’est pas retirée, elle est remplacée.';

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

/** Masse à afficher : TOUJOURS une valeur, jamais une case vide. */
function masseAffichable(valeur) {
  return Number.isFinite(Number(valeur))
    ? fmtKgSigne(valeur)
    : 'non renseignée au registre';
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
 * @param {{ mouvement: object, mouvements: object[], machines: object[],
 *   bouteilles: object[], fluides: object[], personnel: object[],
 *   etablissement: object }} sources
 * @returns {object} faits du document
 */
export function assemblerJustificatif({
  mouvement, mouvements = [], machines = [], bouteilles = [], fluides = [],
  personnel = [], etablissement = {}
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
  const masseEcriture = Number(mouvement.quantiteKg);
  const masseAnnulee = annulee ? Number(annulee.quantiteKg) : NaN;
  const somme = Number.isFinite(masseEcriture) && Number.isFinite(masseAnnulee)
    ? Math.round((masseEcriture + masseAnnulee) * 1000) / 1000
    : null;

  return {
    // L'écriture d'annulation elle-même
    numero: mouvement.numero ?? null,
    date: mouvement.date ?? null,
    mode: mouvement.mode ?? 'OFFICIEL',
    type: mouvement.type ?? null,
    auteur,
    motif: mouvement.motif ? String(mouvement.motif).trim() : null,
    // La fiche annulée
    numeroAnnule: annulee?.numero ?? null,
    dateAnnulee: annulee?.date ?? null,
    typeAnnule: annulee?.type ?? null,
    cerfaAnnule: annulee?.cerfaNumero ?? null,
    statutAnnule: annulee?.statut ?? null,
    // Les masses, signées
    masseEcriture,
    masseAnnulee,
    somme,
    // Le contexte matériel
    machineLibelle: machine
      ? `${machine.code ?? machine.id} — ${machine.designation ?? ''}`.trim()
      : (mouvement.machineLabel ?? null),
    chargeNominaleKg: machine ? machine.chargeNominaleKg : null,
    fluideCode: mouvement.fluide ?? null,
    fluideNom: fluide?.nom ?? null,
    bouteilleSrc: libelleBouteille(bouteilleSrc),
    bouteilleDst: libelleBouteille(bouteilleDst),
    // Le scellement
    empreinte: mouvement.hashEcriture ?? null,
    empreintePrecedente: mouvement.hashPrecedent ?? null,
    versionEmpreinte: mouvement.versionEmpreinte ?? null,
    // L'établissement
    etablissement: {
      raisonSociale: etablissement?.raisonSociale ?? '',
      adresse: etablissement?.adresse ?? '',
      siret: etablissement?.siret ?? ''
    }
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
  const [mouvements, machines, bouteilles, fluides, personnel, etablissement] =
    await Promise.all([
      store.getMouvements(), store.getMachines(), store.getBouteilles(),
      store.getFluides(), store.getPersonnel(), store.getEtablissement()
    ]);
  const mouvement = mouvements.find((mv) => mv.id === mouvementId) || null;
  return assemblerJustificatif({
    mouvement, mouvements, machines, bouteilles, fluides, personnel,
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

  // ⚠️ LA MENTION DE MODE, PREMIER ENFANT DU DOCUMENT. Elle est du TEXTE
  // (pas un fond coloré, pas une image) : elle s'imprime même quand le
  // navigateur refuse les couleurs d'arrière-plan, réglage par défaut de
  // la plupart des postes.
  const bandeauMode = formation
    ? '<div class="justif-mode">' + esc(MENTION_FORMATION) + '</div>'
    : '';

  const enTete = '<header class="justif-entete">'
    + '<div class="justif-titre">' + esc(TITRE_JUSTIFICATIF) + '</div>'
    + '<div class="justif-sous-titre">' + esc(SOUS_TITRE_JUSTIFICATIF)
    + '</div>'
    + (j.etablissement.raisonSociale
      ? '<div class="justif-etab">' + esc(j.etablissement.raisonSociale)
        + (j.etablissement.adresse ? ' — ' + esc(j.etablissement.adresse) : '')
        + (j.etablissement.siret
          ? ' — SIRET ' + esc(j.etablissement.siret) : '')
        + '</div>'
      : '')
    + '</header>';

  const blocAnnulee = bloc('Fiche annulée',
    ligne('Numéro d’écriture au registre', j.numeroAnnule, 'justif-fort')
    + ligne('N° de fiche CERFA annulée',
      j.cerfaAnnule ?? 'aucune (cette écriture n’en portait pas)')
    + ligne('Date de l’écriture annulée', j.dateAnnulee
      ? fmtDate(j.dateAnnulee) : null)
    + ligne('Nature de l’opération annulée', natureLisible(j.typeAnnule))
    + ligne('Statut au registre', j.statutAnnule),
    'justif-bloc-annule');

  const blocMotif = bloc('Motif de l’annulation',
    '<p class="justif-motif">'
    + esc(j.motif ?? 'Motif absent du registre.') + '</p>',
    'justif-bloc-motif');

  const blocEcriture = bloc('Écriture d’annulation',
    ligne('Numéro d’écriture INTERNE au registre', j.numero, 'justif-fort')
    + ligne('Date de l’écriture', j.date ? fmtDate(j.date) : null)
    + ligne('Enregistrée par', j.auteur)
    + ligne('Mode', j.mode === 'FORMATION'
      ? 'FORMATION (document non officiel)' : j.mode)
    // Le registre reprend la nature de l'opération annulée : c'est ce
    // qu'il porte, et le libellé le DIT — sans quoi le document laisserait
    // croire qu'une charge d'appoint a été faite ce jour-là.
    + ligne('Nature portée au registre (reprise de l’opération annulée)',
      natureLisible(j.type)));

  const blocMasses = bloc('Masses portées au registre',
    ligne('Masse de l’écriture annulée', masseAffichable(j.masseAnnulee))
    + ligne('Masse de la présente écriture d’annulation',
      masseAffichable(j.masseEcriture), 'justif-fort')
    + ligne('Somme des deux écritures', j.somme === null
      ? 'non calculable (masse absente)' : fmtKgSigne(j.somme))
    + '<p class="justif-note">Les masses sont portées avec le signe qu’elles '
    + 'ont AU REGISTRE. Aucune n’est arrondie à zéro ni retirée du '
    + 'document : ce justificatif dit ce que le registre porte.</p>');

  const blocMateriel = bloc('Équipement, fluide et contenants',
    ligne('Équipement', j.machineLibelle)
    + ligne('Charge nominale de l’équipement',
      Number.isFinite(Number(j.chargeNominaleKg))
        ? fmtKg(j.chargeNominaleKg) : null)
    + ligne('Fluide', j.fluideCode
      ? j.fluideCode + (j.fluideNom ? ` (${j.fluideNom})` : '') : null)
    + ligne('Contenant source', j.bouteilleSrc)
    + ligne('Contenant destination', j.bouteilleDst));

  const blocScellement = bloc('Scellement de l’écriture',
    ligne('Empreinte SHA-256 de l’écriture', j.empreinte, 'justif-mono')
    + ligne('Empreinte de l’écriture précédente', j.empreintePrecedente,
      'justif-mono')
    + ligne('Version d’empreinte', j.versionEmpreinte)
    + '<p class="justif-note">L’empreinte est calculée et scellée à la '
    + 'CRÉATION de l’écriture, puis chaînée à la précédente : elle prouve '
    + 'que ce justificatif n’a pas été fabriqué après coup.</p>');

  const pied = '<footer class="justif-pied">'
    + '<p>' + esc(MENTION_PAS_UNE_FICHE_CERFA) + '</p>'
    + '<p>' + esc(MENTION_SANS_SIGNATURE) + '</p>'
    + '<p class="justif-origine">Document produit par inerWeb Fluide.</p>'
    + '</footer>';

  return '<div class="justif-document" data-mode="' + esc(j.mode) + '">'
    + '<div class="justif-filigrane" aria-hidden="true">ANNULATION</div>'
    + bandeauMode
    + enTete
    + blocAnnulee
    + blocMotif
    + blocEcriture
    + blocMasses
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

.justif-entete { position: relative; margin-bottom: 14px; }

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
`;

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

  .justif-document {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    max-width: 100%;
    margin: 0;
    border-width: 2px;
  }
}
`;

const STYLE_JUSTIFICATIF_ID = 'style-justificatif-regularisation';

function assurerStyleJustificatif() {
  if (document.getElementById(STYLE_JUSTIFICATIF_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_JUSTIFICATIF_ID;
  style.textContent = CSS_JUSTIFICATIF + CSS_IMPRESSION_APERCU;
  document.head.appendChild(style);
}

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

/* ============================================================
   Ouverture de la modale d'aperçu (application)
   ============================================================ */

/**
 * Ouvre l'aperçu imprimable du justificatif de régularisation d'une
 * écriture d'annulation.
 * @param {{ store: object }} ctx
 * @param {string} mouvementId - id de la CONTRE-ÉCRITURE
 * @returns {Promise<void>}
 */
export async function ouvrirJustificatifRegularisation(ctx, mouvementId) {
  const faits = await construireJustificatif(ctx.store, mouvementId);
  assurerStyleJustificatif();

  const { fermer, racine } = modale({
    titre: 'Justificatif de régularisation — '
      + (faits.numero ?? 'écriture d’annulation'),
    contenuHtml: '<div class="justif-apercu">'
      + gabaritJustificatif(faits) + '</div>',
    actionsHtml:
      '<button type="button" id="justif-fermer" '
      + 'class="btn btn-secondaire no-print">Fermer</button>'
      + '<button type="button" id="justif-imprimer" '
      + 'class="btn btn-marine no-print">'
      + ICONES.imprimer + '<span>Imprimer</span></button>'
  });

  racine.querySelector('#justif-fermer').addEventListener('click', function () {
    fermer();
  });
  racine.querySelector('#justif-imprimer')
    .addEventListener('click', function () {
      window.print();
    });
}
