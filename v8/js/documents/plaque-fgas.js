// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — plaque F-Gas (Phase D)
// Modale d'aperçu d'une étiquette réglementaire pour un équipement :
// identification, fluide, charge, classe de sécurité, fréquence de
// contrôle, dernier/prochain contrôle. Format ~étiquette 100×70 mm
// à l'impression (bouton Imprimer, @media print scopé à l'étiquette
// seule — le reste de la modale et de l'application sont masqués).
// ============================================================

import { modale, ICONES } from '../views/communs.js';
import { esc, fmtKg, fmtTeq, fmtDate, teqCO2 } from '../core/utils.js';
import { evaluerControle } from '../data/reglementation-fluides.js';

/* ============================================================
   Calcul de la fréquence de contrôle réglementaire (cadre 7 CERFA)
   ------------------------------------------------------------
   La logique est CENTRALISÉE dans le moteur réglementaire unique
   v8/js/data/reglementation-fluides.js (règles A/B/C validées,
   cf. docs/TABLE-REGLEMENTAIRE-FLUIDES.md). La plaque ne fait que
   présenter son résultat.
   ============================================================ */

/**
 * Seuil réglementaire et fréquence de contrôle d'un équipement, selon
 * son fluide et sa charge NOMINALE déclarée. Délègue au moteur unique
 * (un mélange contenant du HFC est traité comme un HFC — Règle A).
 * @param {{ chargeNominaleKg: number, detectionPermanente: boolean }} machine
 * @param {{ famille: string, gwpAr4: number }|undefined} fluide
 * @returns {{ niveau: 1|2|3|null, frequenceMois: number|null }}
 */
export function calculerFrequenceControle(machine, fluide) {
  const { niveau, frequenceMois } = evaluerControle(
    fluide, machine?.chargeNominaleKg, Boolean(machine?.detectionPermanente));
  return { niveau, frequenceMois };
}

/* ============================================================
   Gabarit HTML de l'étiquette
   ============================================================ */

/**
 * Formate une fréquence en mois vers un libellé court (« Tous les 12 mois »).
 * @param {number|null} mois
 * @returns {string}
 */
function libelleFrequence(mois) {
  if (!mois) return '—';
  return 'Tous les ' + mois + ' mois';
}

/**
 * Construit le HTML de l'étiquette elle-même (zone imprimable).
 * @param {object} machine
 * @param {object|undefined} fluide
 * @param {{ niveau: 1|2|3|null, frequenceMois: number|null }} frequence
 * @param {object} etablissement
 * @returns {string} HTML
 */
function gabaritEtiquette(machine, fluide, frequence, etablissement) {
  const codeFluide = machine.fluide || '—';
  const famille = fluide ? fluide.famille : '—';
  const classeSecurite = fluide && fluide.classeSecurite ? fluide.classeSecurite : '—';
  const co2 = fluide ? fmtTeq(teqCO2(machine.chargeNominaleKg, fluide.gwpAr4)) : '—';
  const detection = machine.detectionPermanente ? 'Oui' : 'Non';

  return '<div class="plaque-etiquette">'

    + '<div class="plaque-bandeau">ÉQUIPEMENT SOUMIS À LA RÉGLEMENTATION F-GAS</div>'

    + '<div class="plaque-corps">'

    + '<div class="plaque-ligne plaque-identification">'
    + '<span class="plaque-code">' + esc(machine.code || machine.id) + '</span>'
    + '<span class="plaque-designation">' + esc(machine.designation) + '</span>'
    + '</div>'

    + '<div class="plaque-ligne plaque-fluide">'
    + '<span class="plaque-fluide-code">' + esc(codeFluide) + '</span>'
    + '<span class="plaque-fluide-famille">' + esc(famille) + '</span>'
    + '<span class="plaque-classe-securite">Classe ' + esc(classeSecurite) + '</span>'
    + '</div>'

    + '<div class="plaque-grille">'
    + '<div class="plaque-cellule">'
    + '<span class="plaque-libelle">Charge nominale</span>'
    + '<span class="plaque-valeur mono">' + esc(fmtKg(machine.chargeNominaleKg)) + '</span>'
    + '</div>'
    + '<div class="plaque-cellule">'
    + '<span class="plaque-libelle">Équivalent CO₂</span>'
    + '<span class="plaque-valeur mono">' + esc(co2) + '</span>'
    + '</div>'
    + '<div class="plaque-cellule">'
    + '<span class="plaque-libelle">Détection permanente</span>'
    + '<span class="plaque-valeur">' + esc(detection) + '</span>'
    + '</div>'
    + '<div class="plaque-cellule">'
    + '<span class="plaque-libelle">Fréquence de contrôle</span>'
    + '<span class="plaque-valeur">' + esc(libelleFrequence(frequence.frequenceMois)) + '</span>'
    + '</div>'
    + '</div>'

    + '<div class="plaque-ligne plaque-controles">'
    + '<div class="plaque-cellule">'
    + '<span class="plaque-libelle">Dernier contrôle</span>'
    + '<span class="plaque-valeur mono">' + esc(fmtDate(machine.dernierControle)) + '</span>'
    + '</div>'
    + '<div class="plaque-cellule">'
    + '<span class="plaque-libelle">Prochain contrôle</span>'
    + '<span class="plaque-valeur mono">' + esc(fmtDate(machine.prochainControle)) + '</span>'
    + '</div>'
    + '</div>'

    + '</div>'

    + '<div class="plaque-pied">' + esc(etablissement && etablissement.raisonSociale || '') + '</div>'

    + '</div>';
}

/* ============================================================
   Styles propres à la plaque (injectés une fois, portée globale
   du document mais classes préfixées « plaque- » : pas de collision)
   ============================================================ */

const STYLE_PLAQUE_ID = 'style-plaque-fgas';

function assurerStylePlaque() {
  if (document.getElementById(STYLE_PLAQUE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_PLAQUE_ID;
  style.textContent = `
    .plaque-etiquette {
      width: 100%;
      max-width: 380px;
      margin: 0 auto;
      border: 1px solid var(--bordure);
      border-radius: var(--rayon-carte);
      overflow: hidden;
      background: var(--carte);
      box-shadow: var(--ombre-douce);
    }

    .plaque-bandeau {
      padding: 10px 14px;
      background: var(--marine-900);
      color: #ffffff;
      font-family: var(--police-titres);
      font-weight: 600;
      font-size: 11.5px;
      letter-spacing: .04em;
      text-align: center;
      line-height: 1.35;
    }

    .plaque-corps {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .plaque-ligne {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
    }

    .plaque-identification {
      padding-bottom: 8px;
      border-bottom: 1px solid var(--bordure-2);
    }

    .plaque-code {
      font-family: var(--police-mono);
      font-weight: 600;
      color: var(--texte);
      font-size: 13px;
    }

    .plaque-designation {
      flex: 1;
      text-align: right;
      font-size: 12.5px;
      color: var(--texte-2);
    }

    .plaque-fluide {
      align-items: center;
    }

    .plaque-fluide-code {
      font-family: var(--police-mono);
      font-weight: 600;
      font-size: 15px;
      color: var(--texte);
    }

    .plaque-fluide-famille {
      flex: 1;
      font-size: 12px;
      color: var(--texte-3);
    }

    .plaque-classe-securite {
      padding: 2px 9px;
      border-radius: var(--rayon-chip);
      background: var(--fond-2);
      color: var(--texte-2);
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }

    .plaque-grille {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      padding: 10px 0;
      border-top: 1px solid var(--bordure-2);
      border-bottom: 1px solid var(--bordure-2);
    }

    .plaque-controles {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .plaque-cellule {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .plaque-libelle {
      font-size: 10.5px;
      letter-spacing: .03em;
      text-transform: uppercase;
      color: var(--texte-faible);
    }

    .plaque-valeur {
      font-size: 13px;
      font-weight: 600;
      color: var(--texte);
    }

    .plaque-pied {
      padding: 8px 14px;
      background: var(--fond-3);
      border-top: 1px solid var(--bordure-2);
      text-align: center;
      font-size: 11px;
      color: var(--texte-3);
    }

    /* Aperçu à l'écran : fond gris pour détacher l'étiquette blanche */
    .plaque-apercu {
      padding: 24px 16px;
      background: var(--fond-2);
      border-radius: var(--rayon-bouton);
    }

    /* Impression : uniquement l'étiquette, taille proche d'une étiquette
       réelle (~100×70 mm), rien d'autre de l'application ni de la modale. */
    @media print {
      body * {
        visibility: hidden;
      }

      .plaque-etiquette,
      .plaque-etiquette * {
        visibility: visible;
      }

      .plaque-etiquette {
        position: fixed;
        inset: 0;
        margin: auto;
        max-width: 100mm;
        box-shadow: none;
        border-color: #000;
      }
    }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   Ouverture de la modale
   ============================================================ */

/**
 * Ouvre la modale d'aperçu de la plaque F-Gas d'un équipement.
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 * @param {string} machineId — identifiant de la machine
 * @returns {Promise<void>}
 */
export async function ouvrirPlaque(ctx, machineId) {
  const [machines, fluides, etablissement] = await Promise.all([
    ctx.store.getMachines(),
    ctx.store.getFluides(),
    ctx.store.getEtablissement()
  ]);

  const machine = machines.find((m) => m.id === machineId);
  if (!machine) {
    return;
  }

  const fluide = fluides.find((f) => f.code === machine.fluide);
  const frequence = calculerFrequenceControle(machine, fluide);

  assurerStylePlaque();

  const { fermer, racine } = modale({
    titre: 'Plaque F-Gas — ' + machine.designation,
    contenuHtml: '<div class="plaque-apercu">'
      + gabaritEtiquette(machine, fluide, frequence, etablissement)
      + '</div>',
    actionsHtml:
      '<button type="button" id="plaque-fermer" class="btn btn-secondaire no-print">Fermer</button>'
      + '<button type="button" id="plaque-imprimer" class="btn btn-marine no-print">'
      + ICONES.imprimer + '<span>Imprimer</span></button>'
  });

  racine.querySelector('#plaque-fermer').addEventListener('click', function () {
    fermer();
  });

  racine.querySelector('#plaque-imprimer').addEventListener('click', function () {
    window.print();
  });
}
