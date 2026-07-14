// ============================================================
// inerWeb Fluide — vue « Fiche machine vivante » (V9.1, vague 2)
// Vue hors sidebar, atteinte par la route paramétrée '#/m/<CODE>'
// (code_public, cf. utils.js). Cinq blocs : identité rapide, actions,
// données techniques repliables, alertes machine, historique en onglets.
// ============================================================

import { enteteVue, carteKpi, chipStatut, barreProgression, tableau, toast, ICONES } from './communs.js';
import { esc, fmtKg, fmtTeq, fmtDate, fmtNombre, teqCO2 } from '../core/utils.js';
import { construireDossiersFuite, LIBELLES_STATUT_FUITE } from '../data/dossiers-fuite.js';
import { genererDossierMachine } from '../documents/dossier-machine.js';
import { telechargerEtSceller } from '../documents/telecharger-dossier.js';
import { ouvrirWizard } from '../wizard/wizard.js';
import { ouvrirFormControle } from '../modales/controle-form.js';
import { ouvrirPlaque, calculerFrequenceControle } from '../documents/plaque-fgas.js';
import { ouvrirEtiquette } from '../documents/etiquette-machine.js';
import { ouvrirBonIntervention } from '../documents/bon-intervention.js';
import { ouvrirFicheIdentification } from '../documents/fiche-identification-machine.js';
import { ouvrirFeuilleMiseEnService, peutOuvrirFeuilleMiseEnService }
  from '../documents/feuille-mise-en-service.js';
import { ouvrirCerfa } from '../cerfa/visualiseur.js';
import { ouvrirCorrectionCerfa } from '../cerfa/correcteur.js';
import { zonePiecesJointes } from '../composants/pieces-jointes.js';
import { verdictPourIntervenant, encartConseil, injecterStylesConseil,
  dateDuJour } from '../composants/conseil-intervenant.js';

export const titre = 'Fiche machine';

/* ============================================================
   Styles propres à la vue (classes préfixées « fiche- »)
   ============================================================ */

const STYLES_VUE = `
<style>
  .fiche-retour {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--texte-3);
    text-decoration: none;
  }
  .fiche-retour:hover, .fiche-retour:focus-visible {
    color: var(--accent);
  }

  .fiche-section {
    margin-top: 20px;
  }

  .fiche-section-titre {
    font-family: var(--police-titres);
    font-size: 15px;
    font-weight: 600;
    color: var(--texte);
    margin: 0 0 10px;
  }

  .fiche-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  /* Bloc « Données techniques » : liste étiquette/valeur, deux colonnes */
  .fiche-details {
    border: 1px solid var(--bordure);
    border-radius: var(--rayon-carte);
    background: var(--carte);
    overflow: hidden;
  }
  .fiche-details > summary {
    cursor: pointer;
    padding: 12px 16px;
    font-family: var(--police-titres);
    font-weight: 600;
    font-size: 14px;
    color: var(--texte);
    list-style: none;
  }
  .fiche-details > summary::-webkit-details-marker { display: none; }
  .fiche-details > summary::before {
    content: '▸';
    display: inline-block;
    margin-right: 8px;
    color: var(--texte-3);
    transition: transform .15s ease;
  }
  .fiche-details[open] > summary::before {
    transform: rotate(90deg);
  }
  .fiche-details-corps {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 24px;
    padding: 4px 16px 16px;
    border-top: 1px solid var(--bordure-2);
  }
  @media (max-width: 640px) {
    .fiche-details-corps { grid-template-columns: 1fr; }
  }
  .fiche-detail-libelle {
    font-size: 10.5px;
    letter-spacing: .03em;
    text-transform: uppercase;
    color: var(--texte-faible);
  }
  .fiche-detail-valeur {
    font-size: 13.5px;
    color: var(--texte);
    margin-top: 2px;
  }

  /* Bloc « Alertes » */
  .fiche-alerte {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--bordure-2);
  }
  .fiche-alerte:last-child { border-bottom: none; padding-bottom: 2px; }
  .fiche-alerte-titre { font-size: 12.5px; font-weight: 600; color: var(--texte); }
  .fiche-alerte-detail { margin-top: 2px; font-size: 11.5px; color: var(--texte-3); }
  .fiche-point {
    width: 9px;
    height: 9px;
    flex: none;
    border-radius: var(--rayon-chip);
    margin-top: 4px;
  }
  .fiche-point-critique  { background: var(--danger); }
  .fiche-point-important { background: var(--avert-icone); }

  /* Onglets d'historique : boutons simples, contenu masqué par [hidden] */
  .fiche-onglets-boutons {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--bordure);
    margin-bottom: 14px;
  }
  .fiche-onglet-bouton {
    padding: 9px 14px;
    border: none;
    background: none;
    font-size: 13px;
    font-weight: 600;
    color: var(--texte-3);
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }
  .fiche-onglet-bouton:hover { color: var(--texte); }
  .fiche-onglet-bouton.actif {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }
</style>`;

/* ============================================================
   Bloc 1 — Identité rapide (4 cartes KPI)
   ============================================================ */

/**
 * Carte KPI « Charge » et « Prochaine échéance » ont besoin d'un sous-texte
 * en HTML (barre de progression, chip colorée) — carteKpi() de communs.js
 * échappe systématiquement son sousTexte (texte brut partout ailleurs dans
 * la base), donc ces deux cartes reprennent son gabarit exact à la main
 * plutôt que de détourner l'API partagée.
 * @param {{ libelle: string, valeur: string, sousTexteHtml: string,
 *           icone: string, teinte: string }} options
 * @returns {string} HTML
 */
function carteKpiSousTexteHtml({ libelle, valeur, sousTexteHtml, icone, teinte }) {
  return '<div class="carte carte-kpi">'
    + '<div class="kpi-haut">'
    + '<span class="kpi-libelle">' + esc(libelle) + '</span>'
    + '<span class="kpi-pastille kpi-pastille-' + esc(teinte) + '">' + ICONES[icone] + '</span>'
    + '</div>'
    + '<div class="kpi-valeur">' + esc(valeur) + '</div>'
    + '<div class="kpi-sous-texte">' + sousTexteHtml + '</div>'
    + '</div>';
}

function blocIdentite(machine, fluide) {
  const pct = machine.chargeNominaleKg > 0
    ? (machine.chargeActuelleKg / machine.chargeNominaleKg) * 100
    : 0;
  const teinteBarre = machine.statut === 'FUITE' ? 'rouge' : 'vert';
  const co2 = fluide ? fmtTeq(teqCO2(machine.chargeActuelleKg, fluide.gwpAr4)) : '—';

  return '<div class="grille-4">'
    + carteKpi({
        libelle: 'Fluide',
        valeur: esc(machine.fluide),
        sousTexte: fluide ? esc(fluide.famille) : '—',
        icone: 'flocon',
        teinte: 'accent'
      })
    + carteKpiSousTexteHtml({
        libelle: 'Charge',
        valeur: fmtNombre(machine.chargeActuelleKg, 2) + ' / ' + fmtKg(machine.chargeNominaleKg),
        sousTexteHtml: barreProgression(pct, teinteBarre),
        icone: 'machine',
        teinte: 'vert'
      })
    + carteKpi({
        libelle: 'Équivalent CO₂',
        valeur: co2,
        icone: 'bilan',
        teinte: 'violet'
      })
    + carteKpiSousTexteHtml({
        libelle: 'Prochaine échéance',
        valeur: fmtDate(machine.prochainControle),
        sousTexteHtml: chipStatut(machine.statut),
        icone: 'controle',
        teinte: 'rose'
      })
    + '</div>';
}

/* ============================================================
   Bloc 1 bis — Charge incomplète (proposition de complément, jamais imposé)
   ============================================================ */

/** Tolérance numérique (arrondis flottants) pour la comparaison de charges. */
const EPSILON_CHARGE = 1e-9;

/**
 * La machine est-elle sous-chargée par rapport à sa charge nominale ?
 * Ignore les machines sans charge nominale connue (absente ou nulle) et
 * les machines sorties du parc suivi (démantelée ou arrêtée).
 * @param {object} machine
 * @returns {boolean}
 */
function estSousChargee(machine) {
  if (machine.statut === 'DEMANTELEE' || machine.statut === 'ARRETEE') return false;
  if (!(machine.chargeNominaleKg > 0)) return false;
  return machine.chargeActuelleKg < machine.chargeNominaleKg - EPSILON_CHARGE;
}

/**
 * Encart sobre (ambre/information, pas rouge) proposant de compléter la
 * charge d'une machine sous-chargée. Une simple proposition : l'utilisateur
 * garde la main via le bouton, rien n'est fait automatiquement.
 * @param {object} machine
 * @returns {string} HTML, ou chaîne vide si la charge est complète
 */
function blocChargeIncomplete(machine) {
  if (!estSousChargee(machine)) return '';
  return '<div class="fiche-section">'
    + '<div class="bandeau-avertissement" style="align-items:center">' + ICONES.alerte
    + '<span>Charge incomplète : '
    + esc(fmtNombre(machine.chargeActuelleKg, 2)) + ' / '
    + esc(fmtKg(machine.chargeNominaleKg)) + ' (' + esc(machine.fluide) + ').'
    + '</span>'
    + '<button type="button" class="btn btn-contour btn-petit" '
    + 'data-action="completer-charge" style="margin-left:auto;flex:none">'
    + ICONES.televerser + '<span>Compléter la charge</span></button>'
    + '</div>'
    + '</div>';
}

/* ============================================================
   Bloc 1 ter — Qui intervient ? (chantier B2, conseil jamais blocage)
   ============================================================ */

/**
 * Encart « Qui intervient ? » : identifier le technicien AVANT le geste
 * (décision Franck 14/07). Select des personnes actives + zone de verdict
 * remplie au choix — synthèse de compétence sur CETTE machine (fluide et
 * charge nominale de l'installation). Un CONSEIL : rien n'est bloqué.
 * @param {object[]} personnesActives — personnel actif, trié
 * @returns {string} HTML
 */
function blocIntervenant(personnesActives) {
  const options = ['<option value="">— Identifier l’intervenant —</option>']
    .concat(personnesActives.map(function (p) {
      return '<option value="' + esc(p.id) + '">'
        + esc(p.prenom + ' ' + p.nom) + '</option>';
    })).join('');
  return '<div class="fiche-section">'
    + '<h3 class="fiche-section-titre">Qui intervient ?</h3>'
    + '<div class="carte">'
    + '<div class="champ">'
    + '<label for="fiche-intervenant">Intervenant pressenti</label>'
    + '<select id="fiche-intervenant">' + options + '</select>'
    + '</div>'
    + '<div id="fiche-conseil-intervenant" style="margin-top:10px"></div>'
    + '</div>'
    + '</div>';
}

/* ============================================================
   Bloc 2 — Actions
   ============================================================ */

function blocActions() {
  return '<div class="fiche-section">'
    + '<div class="fiche-actions">'
    + '<button type="button" class="btn btn-primaire" data-action="nouveau-mouvement">'
    + ICONES.plus + '<span>Nouveau mouvement</span></button>'
    + '<button type="button" class="btn btn-contour" data-action="nouveau-controle">'
    + ICONES.controle + '<span>Contrôle</span></button>'
    + '<button type="button" class="btn btn-contour" data-action="plaque">'
    + ICONES.imprimer + '<span>Plaque F-Gas</span></button>'
    + '<button type="button" class="btn btn-contour" data-action="cerfa" disabled '
    + 'title="Choisissez un mouvement ou un contrôle dans l\'historique pour ouvrir son CERFA">'
    + ICONES.bilan + '<span>CERFA</span></button>'
    + '<button type="button" class="btn btn-contour" data-action="etiquette">'
    + ICONES.grille + '<span>Étiquette QR</span></button>'
    + '<button type="button" class="btn btn-contour" data-action="bon-intervention">'
    + ICONES.bilan + '<span>Bon d\'intervention</span></button>'
    + '<button type="button" class="btn btn-contour" data-action="fiche-identification">'
    + ICONES.imprimer + '<span>Fiche d\'identification (A4)</span></button>'
    + '<button type="button" class="btn btn-contour" data-action="dossier-machine">'
    + ICONES.sauvegarde + '<span>Exporter le dossier (ZIP)</span></button>'
    + '</div>'
    + '</div>';
}

/* ============================================================
   Bloc 3 — Données techniques (repliable)
   ============================================================ */

/** Une paire libellé/valeur ; omise si la valeur est vide/nulle. */
function ligneDetail(libelle, valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return '';
  return '<div>'
    + '<div class="fiche-detail-libelle">' + esc(libelle) + '</div>'
    + '<div class="fiche-detail-valeur">' + esc(valeur) + '</div>'
    + '</div>';
}

function blocDonneesTechniques(machine, fluide, client) {
  const frequence = calculerFrequenceControle(machine, fluide);
  const libelleFrequence = frequence.frequenceMois
    ? 'Tous les ' + frequence.frequenceMois + ' mois'
    : null;

  const lignes = [
    ligneDetail('Type', machine.type),
    ligneDetail('Marque', machine.marque),
    ligneDetail('Modèle', machine.modele),
    ligneDetail('Numéro de série', machine.numSerie),
    ligneDetail('Mise en service', machine.dateMiseEnService ? fmtDate(machine.dateMiseEnService) : null),
    ligneDetail('Localisation', machine.localisation),
    ligneDetail('Site', machine.siteLabel),
    ligneDetail('Client', client ? client.raisonSociale : null),
    ligneDetail('Détection permanente', machine.detectionPermanente ? 'Oui' : null),
    ligneDetail('Fréquence de contrôle', libelleFrequence)
  ].join('');

  return '<div class="fiche-section">'
    + '<details class="fiche-details">'
    + '<summary>Données techniques</summary>'
    + '<div class="fiche-details-corps">' + lignes + '</div>'
    + '</details>'
    + '</div>';
}

/* ============================================================
   Bloc 4 — Alertes machine
   ============================================================ */

function ligneAlerteMachine(alerte) {
  const classePoint = alerte.niveau === 'CRITIQUE' ? 'fiche-point-critique' : 'fiche-point-important';
  return '<div class="fiche-alerte">'
    + '<span class="fiche-point ' + classePoint + '" aria-hidden="true"></span>'
    + '<div>'
    + '<div class="fiche-alerte-titre">' + esc(alerte.titre) + '</div>'
    + '<div class="fiche-alerte-detail">' + esc(alerte.detail) + '</div>'
    + '</div>'
    + '</div>';
}

function blocAlertes(alertes) {
  const contenu = alertes.length
    ? alertes.map(ligneAlerteMachine).join('')
    : '<div class="etat-vide">' + ICONES.coche + '<p>Aucune alerte pour cette machine.</p></div>';

  return '<div class="fiche-section">'
    + '<h3 class="fiche-section-titre">Alertes</h3>'
    + '<div class="carte">' + contenu + '</div>'
    + '</div>';
}

/* ============================================================
   Bloc 4 bis — Fuites (dossiers de fuite, brique ③)
   ============================================================ */

// Mêmes classes de chip que le reste de la charte (chip-rouge/ambre/vert),
// même idiome que chipStatutFuite de fiche-fuite.js (dupliqué à dessein :
// deux vues indépendantes, pas de dépendance croisée entre fiches).
const CLASSES_STATUT_FUITE = {
  OUVERTE: 'chip-rouge',
  REPAREE: 'chip-ambre',
  FERMEE: 'chip-vert'
};

function chipStatutFuiteMachine(statut) {
  const classe = CLASSES_STATUT_FUITE[statut] || 'chip-gris';
  const libelle = LIBELLES_STATUT_FUITE[statut] || statut;
  return '<span class="chip ' + classe + '">' + esc(libelle) + '</span>';
}

function ligneDossierFuite(dossier) {
  const echeance = (dossier.statut === 'REPAREE' && dossier.echeanceControleSuivi)
    ? '<div class="fiche-alerte-detail">Contrôle de suivi attendu le '
      + esc(fmtDate(dossier.echeanceControleSuivi))
      + (dossier.suiviEnRetard ? ' — <strong style="color:var(--danger)">en retard</strong>' : '')
      + '</div>'
    : '';
  return '<div class="fiche-alerte">'
    + '<div style="flex:1;min-width:0">'
    + '<div class="fiche-alerte-titre">' + esc(fmtDate(dossier.dateDetection)) + ' — '
    + esc(dossier.localisation || 'Localisation non précisée') + ' '
    + chipStatutFuiteMachine(dossier.statut)
    + '</div>'
    + echeance
    + '</div>'
    + '<button type="button" class="btn btn-contour btn-petit" '
    + 'data-action="ouvrir-dossier-fuite" data-id="' + esc(dossier.controleFuiteId) + '">'
    + 'Ouvrir le dossier</button>'
    + '</div>';
}

/** Bloc « Fuites », affiché seulement si la machine a au moins un dossier. */
function blocFuites(dossiers) {
  if (!dossiers.length) return '';
  return '<div class="fiche-section">'
    + '<h3 class="fiche-section-titre">Fuites</h3>'
    + '<div class="carte">' + dossiers.map(ligneDossierFuite).join('') + '</div>'
    + '</div>';
}

/* ============================================================
   Bloc 5 — Historique en onglets (Mouvements / Contrôles / Documents)
   ============================================================ */

/**
 * Attribut `title` explicitant les DEUX flux d'une récupération (le
 * chiffre affiché décrit la machine qui se vide, pas la bouteille qui
 * au contraire se remplit du même montant). Chaîne vide sinon — la
 * valeur affichée n'est jamais modifiée.
 * @param {object} mv — mouvement (copie du store)
 * @returns {string} attribut ` title="…"` ou chaîne vide
 */
function titreQuantiteRecuperationFiche(mv) {
  const estRecuperation = mv.type === 'RECUPERATION_MAINTENANCE'
    || mv.type === 'RECUPERATION_DEMANTELEMENT';
  if (!estRecuperation || !Number.isFinite(mv.quantiteKg)) return '';
  const gain = fmtKg(Math.abs(mv.quantiteKg));
  return ' title="Fluide retiré de la machine ; la bouteille de récupération a gagné +'
    + esc(gain.replace(' kg', '')) + ' kg."';
}

function ligneMouvementFiche(mv) {
  // CF-1 : bouton « Feuille de mise en service » uniquement pour un
  // mouvement de type MISE_EN_SERVICE figé (VALIDE/ANNULE), même règle
  // que le bouton CERFA de la même ligne.
  const boutonFeuille = peutOuvrirFeuilleMiseEnService(mv)
    ? '<button type="button" class="btn btn-contour btn-petit" data-action="feuille-mise-en-service" '
      + 'data-id="' + esc(mv.id) + '">Feuille de mise en service</button>'
    : '';
  return '<tr>'
    + '<td>' + fmtDate(mv.date) + '</td>'
    + '<td>' + esc(mv.type) + '</td>'
    + '<td' + titreQuantiteRecuperationFiche(mv) + '>' + esc(fmtNombre(mv.quantiteKg, 2)) + ' kg</td>'
    + '<td>' + chipStatut(mv.statut) + '</td>'
    + '<td class="align-droite">'
    + '<span style="display:inline-flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'
    + '<button type="button" class="btn btn-contour btn-petit" data-action="cerfa-mouvement" '
    + 'data-id="' + esc(mv.id) + '">CERFA</button>'
    // Correction élève : seulement sur un mouvement FIGÉ hors transfert
    // (même règle que la vue Mouvements — sinon l'enseignant importait
    // un PDF avant d'apprendre que le mouvement n'était pas éligible).
    + ((mv.statut === 'VALIDE' || mv.statut === 'ANNULE')
        && mv.type !== 'TRANSFERT'
      ? '<button type="button" class="btn btn-contour btn-petit" data-action="corriger-cerfa-mouvement" '
        + 'data-id="' + esc(mv.id) + '">Correction élève</button>'
      : '')
    + boutonFeuille
    + '</span>'
    + '</td>'
    + '</tr>';
}

function ligneControleFiche(ct) {
  return '<tr>'
    + '<td>' + fmtDate(ct.date) + '</td>'
    + '<td>' + esc(ct.methode) + '</td>'
    + '<td>' + chipStatut(ct.resultat) + '</td>'
    + '<td>' + esc(ct.operateur) + '</td>'
    + '<td class="align-droite">'
    + '<button type="button" class="btn btn-contour btn-petit" data-action="cerfa-controle" '
    + 'data-id="' + esc(ct.id) + '">CERFA</button>'
    + '</td>'
    + '</tr>';
}

function blocHistorique(mouvements, controles) {
  const tableauMouvements = tableau({
    colonnes: [
      { cle: 'date', libelle: 'Date' },
      { cle: 'type', libelle: 'Type' },
      { cle: 'qte', libelle: 'Qté' },
      { cle: 'statut', libelle: 'Statut' },
      { cle: 'action', libelle: '', align: 'droite' }
    ],
    lignesHtml: mouvements.map(ligneMouvementFiche)
  });

  const tableauControles = tableau({
    colonnes: [
      { cle: 'date', libelle: 'Date' },
      { cle: 'methode', libelle: 'Méthode' },
      { cle: 'resultat', libelle: 'Résultat' },
      { cle: 'operateur', libelle: 'Opérateur' },
      { cle: 'action', libelle: '', align: 'droite' }
    ],
    lignesHtml: controles.map(ligneControleFiche)
  });

  return '<div class="fiche-section">'
    + '<h3 class="fiche-section-titre">Historique</h3>'
    + '<div class="fiche-onglets-boutons">'
    + '<button type="button" class="fiche-onglet-bouton actif" data-onglet="mouvements">Mouvements</button>'
    + '<button type="button" class="fiche-onglet-bouton" data-onglet="controles">Contrôles</button>'
    + '<button type="button" class="fiche-onglet-bouton" data-onglet="documents">Documents</button>'
    + '</div>'
    + '<div data-panneau="mouvements">' + tableauMouvements + '</div>'
    + '<div data-panneau="controles" hidden>' + tableauControles + '</div>'
    + '<div data-panneau="documents" hidden></div>'
    + '</div>';
}

/* ============================================================
   État vide : machine introuvable
   ============================================================ */

function afficherMachineIntrouvable(conteneur) {
  conteneur.innerHTML = STYLES_VUE
    + enteteVue({ titre: 'Machine introuvable' })
    + '<div class="carte"><div class="etat-vide">' + ICONES.machine
    + '<p>Aucune machine ne correspond à ce code. Elle a peut-être été '
    + 'démantelée ou le lien est incorrect.</p></div></div>';
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * Rend la fiche vivante d'une machine, retrouvée par son code_public.
 * @param {HTMLElement} conteneur — élément vidé d'avance par app.js
 * @param {{ store: object, naviguer: (hash: string) => void, param: string }} ctx
 */
export async function render(conteneur, ctx) {
  const { store, naviguer, param } = ctx;
  const codePublic = String(param || '').trim();

  const [machines, fluides, clients, alertesToutes, personnel,
    habilitations, mentions] = await Promise.all([
    store.getMachines(),
    store.getFluides(),
    store.getClients(),
    store.getAlertes(),
    store.getPersonnel(),
    store.getHabilitations(),
    store.getMentions()
  ]);

  const machine = machines.find((m) => m.codePublic === codePublic);
  if (!machine) {
    afficherMachineIntrouvable(conteneur);
    return;
  }

  const fluide = fluides.find((f) => f.code === machine.fluide);
  const client = clients.find((c) => c.id === machine.clientId);
  const alertes = alertesToutes.filter((a) =>
    a.cible && a.cible.vue === 'machines' && a.cible.id === machine.id);

  const [mouvements, controles] = await Promise.all([
    store.getMouvements(),
    store.getControles()
  ]);
  const mouvementsMachine = mouvements.filter((mv) => mv.machineId === machine.id);
  const controlesMachine = controles.filter((ct) => ct.machineId === machine.id);
  // construireDossiersFuite filtre déjà par machine.id en interne : on lui
  // passe les tableaux complets, comme pour genererDossierMachine ailleurs.
  const { dossiers: dossiersFuite } = construireDossiersFuite({ machine, controles, mouvements });

  // Personnes actives, triées comme le registre du personnel.
  const personnesActives = personnel
    .filter(function (p) { return p.actif; })
    .sort(function (a, b) {
      return (a.nom + a.prenom).localeCompare(b.nom + b.prenom, 'fr');
    });

  conteneur.innerHTML = STYLES_VUE
    + '<a href="#/machines" class="fiche-retour">' + ICONES.grille + '<span>Retour au parc</span></a>'
    + enteteVue({ titre: machine.designation, sousTitre: 'Code ' + machine.codePublic })
    + blocIdentite(machine, fluide)
    + blocChargeIncomplete(machine)
    + blocIntervenant(personnesActives)
    + blocActions()
    + blocDonneesTechniques(machine, fluide, client)
    + blocAlertes(alertes)
    + blocFuites(dossiersFuite)
    + blocHistorique(mouvementsMachine, controlesMachine);

  // ---- Bloc « Documents » : monté seulement quand l'onglet est activé
  // (zonePiecesJointes vide le conteneur passé, donc pas de montage avant) ----
  let documentsMontes = false;
  function monterDocumentsSiBesoin() {
    if (documentsMontes) return;
    documentsMontes = true;
    const panneau = conteneur.querySelector('[data-panneau="documents"]');
    zonePiecesJointes(panneau, ctx, {
      entiteType: 'MACHINE',
      entiteId: machine.id,
      lectureSeule: false
    });
  }

  // ---- Onglets d'historique ----
  conteneur.querySelectorAll('.fiche-onglet-bouton').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      const cible = bouton.dataset.onglet;
      conteneur.querySelectorAll('.fiche-onglet-bouton').forEach(function (b) {
        b.classList.toggle('actif', b === bouton);
      });
      conteneur.querySelectorAll('[data-panneau]').forEach(function (panneau) {
        panneau.hidden = panneau.dataset.panneau !== cible;
      });
      if (cible === 'documents') monterDocumentsSiBesoin();
    });
  });

  // ---- Conseil d'intervenant (chantier B2, jamais bloquant) ----
  injecterStylesConseil();
  const selectIntervenant = conteneur.querySelector('#fiche-intervenant');
  if (selectIntervenant) {
    selectIntervenant.addEventListener('change', function () {
      const zone = conteneur.querySelector('#fiche-conseil-intervenant');
      const personne = personnesActives.find(function (p) {
        return p.id === selectIntervenant.value;
      });
      if (!personne) { zone.innerHTML = ''; return; }
      const verdict = verdictPourIntervenant({
        personne, habilitations, mentions, machine, operation: null,
        dateReference: dateDuJour()
      });
      zone.innerHTML = encartConseil(personne, verdict);
    });
  }

  // ---- Actions ----
  const boutonMouvement = conteneur.querySelector('[data-action="nouveau-mouvement"]');
  if (boutonMouvement) {
    boutonMouvement.addEventListener('click', function () {
      // V9.1 : préréglage de la machine (l'étape 2 du wizard est sautée)
      // et retour sur cette même fiche à la finalisation (au lieu de la
      // vue Mouvements par défaut).
      ouvrirWizard(ctx, { machineId: machine.id, retour: '#/m/' + machine.codePublic });
    });
  }

  const boutonCompleterCharge = conteneur.querySelector('[data-action="completer-charge"]');
  if (boutonCompleterCharge) {
    boutonCompleterCharge.addEventListener('click', function () {
      // Machine + type « Complément de charge » présélectionnés, retour
      // sur cette même fiche à la finalisation (même idiome que V9.1).
      ouvrirWizard(ctx, {
        machineId: machine.id,
        typeInitial: 'appoint',
        retour: '#/m/' + machine.codePublic
      });
    });
  }

  const boutonControle = conteneur.querySelector('[data-action="nouveau-controle"]');
  if (boutonControle) {
    boutonControle.addEventListener('click', function () {
      ouvrirFormControle(ctx, machine.id);
    });
  }

  const boutonPlaque = conteneur.querySelector('[data-action="plaque"]');
  if (boutonPlaque) {
    boutonPlaque.addEventListener('click', function () {
      ouvrirPlaque(ctx, machine.id);
    });
  }

  const boutonEtiquette = conteneur.querySelector('[data-action="etiquette"]');
  if (boutonEtiquette) {
    boutonEtiquette.addEventListener('click', function () {
      ouvrirEtiquette(ctx, machine.id);
    });
  }

  const boutonBonIntervention = conteneur.querySelector('[data-action="bon-intervention"]');
  if (boutonBonIntervention) {
    boutonBonIntervention.addEventListener('click', function () {
      ouvrirBonIntervention(ctx, machine.id);
    });
  }

  const boutonFicheIdentification = conteneur.querySelector('[data-action="fiche-identification"]');
  if (boutonFicheIdentification) {
    boutonFicheIdentification.addEventListener('click', function () {
      ouvrirFicheIdentification(ctx, machine.id);
    });
  }

  // Export ZIP « dossier machine » — preuve ciblée scellée (SHA-256).
  const boutonDossierMachine = conteneur.querySelector('[data-action="dossier-machine"]');
  if (boutonDossierMachine) {
    boutonDossierMachine.addEventListener('click', async function () {
      const libelle = boutonDossierMachine.querySelector('span');
      const texteInitial = libelle ? libelle.textContent : '';
      boutonDossierMachine.disabled = true;
      if (libelle) libelle.textContent = 'Génération…';
      try {
        const dossier = await genererDossierMachine(store, machine.id);
        telechargerEtSceller(dossier);
      } catch (erreur) {
        toast(erreur && erreur.message ? erreur.message
          : 'Export du dossier machine impossible.', 'erreur');
      } finally {
        boutonDossierMachine.disabled = false;
        if (libelle) libelle.textContent = texteInitial;
      }
    });
  }

  // ---- Ouverture d'un dossier de fuite depuis le bloc « Fuites » ----
  conteneur.querySelectorAll('[data-action="ouvrir-dossier-fuite"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      naviguer('f/' + bouton.dataset.id);
    });
  });

  // ---- CERFA depuis l'historique (un mouvement ou un contrôle précis) ----
  conteneur.querySelectorAll('[data-action="cerfa-mouvement"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      ouvrirCerfa(ctx, { source: 'mouvement', id: bouton.dataset.id });
    });
  });
  conteneur.querySelectorAll('[data-action="corriger-cerfa-mouvement"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      ouvrirCorrectionCerfa(ctx, { source: 'mouvement', id: bouton.dataset.id });
    });
  });
  // ---- Feuille de mise en service depuis l'historique (CF-1) ----
  conteneur.querySelectorAll('[data-action="feuille-mise-en-service"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      ouvrirFeuilleMiseEnService(ctx, bouton.dataset.id);
    });
  });
  conteneur.querySelectorAll('[data-action="cerfa-controle"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      ouvrirCerfa(ctx, { source: 'controle', id: bouton.dataset.id });
    });
  });
}
