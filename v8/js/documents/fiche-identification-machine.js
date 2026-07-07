// ============================================================
// inerWeb Fluide — fiche d'identification machine (A4) (V9.2)
// Document A4 imprimable reprenant les mêmes données que les blocs
// « identité » et « données techniques » de views/fiche-machine.js,
// présentées en tableau lisible, avec le QR EN GRAND (plus visible que
// sur la petite étiquette 50×70 de documents/etiquette-machine.js) et
// un espace « Date de pose / Signature technicien » à compléter à la
// pose de la fiche sur ou près de l'équipement.
//
// Patron repris de documents/plaque-fgas.js et documents/bon-
// intervention.js : modale d'aperçu + @media print scopé + window.print().
// En-tête = logo inerWeb Fluide + deux emplacements réservés vides
// (structure identique à bon-intervention.js, mais classes CSS
// préfixées « fim-doc- » — propres à ce module, id de style distinct,
// aucun sélecteur partagé littéralement avec bon-intervention.js).
// ============================================================

import { modale, ICONES } from '../views/communs.js';
import { esc, fmtKg, fmtTeq, fmtDate, teqCO2 } from '../core/utils.js';
import { obtenirQRCode } from '../lib/qrcode.js';
import { calculerFrequenceControle } from './plaque-fgas.js';

/** Taille en pixels du QR généré (avant mise à l'échelle CSS) — en grand. */
const QR_PIXELS = 260;

/**
 * Génère le contenu du QR pour une machine : chemin relatif hors-ligne,
 * jamais d'URL absolue ni de domaine codé en dur (même règle que
 * documents/etiquette-machine.js et documents/bon-intervention.js).
 * @param {string} codePublic
 * @returns {string}
 */
export function contenuQR(codePublic) {
  return '#/m/' + codePublic;
}

/**
 * Génère un QR code dans un conteneur DOM déjà monté. Copie exacte du
 * mécanisme de documents/etiquette-machine.js.
 * @param {HTMLElement} conteneur
 * @param {string} texte
 * @returns {void}
 */
function genererQRDansConteneur(conteneur, texte) {
  let QRCode;
  try {
    QRCode = obtenirQRCode();
  } catch (erreur) {
    conteneur.innerHTML = '<span class="fim-qr-erreur">'
      + esc(erreur.message) + '</span>';
    return;
  }
  new QRCode(conteneur, {
    text: texte,
    width: QR_PIXELS,
    height: QR_PIXELS,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
}

/* ============================================================
   En-tête commun : logo inerWeb Fluide + deux emplacements réservés
   (structure identique à documents/bon-intervention.js, classes CSS
   préfixées « fim-doc- » propres à ce module)
   ============================================================ */

function enteteDocument() {
  return '<div class="fim-doc-entete">'
    + '<div class="sidebar-logo fim-doc-entete-logo">'
    + '<span class="logo-carre">' + ICONES.flocon + '</span>'
    + '<div class="logo-textes">'
    + '<div class="logo-nom">inerWeb <span class="logo-fluide">Fluide</span></div>'
    + '<div class="logo-sous-titre">Traçabilité F-Gas</div>'
    + '</div>'
    + '</div>'
    + '<div class="fim-doc-entete-reserves">'
    + '<div class="fim-doc-reserve">'
    + '<div class="fim-doc-reserve-cadre"></div>'
    + '<span class="fim-doc-reserve-legende">Logo établissement</span>'
    + '</div>'
    + '<div class="fim-doc-reserve">'
    + '<div class="fim-doc-reserve-cadre"></div>'
    + '<span class="fim-doc-reserve-legende">Logo groupement</span>'
    + '</div>'
    + '</div>'
    + '</div>';
}

/** Une ligne libellé/valeur du tableau ; omise si la valeur est vide. */
function ligneTableau(libelle, valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return '';
  return '<tr><td class="fim-libelle">' + esc(libelle) + '</td>'
    + '<td class="fim-valeur">' + esc(valeur) + '</td></tr>';
}

/* ============================================================
   Gabarit HTML de la fiche d'identification
   ============================================================ */

/**
 * @param {object} machine
 * @param {object|undefined} fluide
 * @param {object|null} client
 * @returns {string} HTML
 */
function gabaritFiche(machine, fluide, client) {
  const dateGeneration = new Date().toLocaleDateString('fr-FR');
  const frequence = calculerFrequenceControle(machine, fluide);
  const libelleFrequence = frequence.frequenceMois
    ? 'Tous les ' + frequence.frequenceMois + ' mois'
    : '—';
  const co2 = fluide ? fmtTeq(teqCO2(machine.chargeActuelleKg, fluide.gwpAr4)) : '—';

  const lignes = [
    ligneTableau('Désignation', machine.designation),
    ligneTableau('Type', machine.type),
    ligneTableau('Marque', machine.marque),
    ligneTableau('Modèle', machine.modele),
    ligneTableau('Numéro de série', machine.numSerie),
    ligneTableau('Localisation', machine.localisation),
    ligneTableau('Site', machine.siteLabel),
    ligneTableau('Client', client ? client.raisonSociale : null),
    ligneTableau('Date de mise en service', machine.dateMiseEnService ? fmtDate(machine.dateMiseEnService) : null),
    ligneTableau('Fluide', machine.fluide),
    ligneTableau('Famille', fluide ? fluide.famille : null),
    ligneTableau('Charge nominale', fmtKg(machine.chargeNominaleKg)),
    ligneTableau('Charge actuelle', fmtKg(machine.chargeActuelleKg)),
    ligneTableau('Équivalent CO₂', co2),
    ligneTableau('Détection permanente', machine.detectionPermanente ? 'Oui' : 'Non'),
    ligneTableau('Fréquence de contrôle', libelleFrequence)
  ].join('');

  return '<div class="fim-document">'

    + enteteDocument()

    + '<h1 class="fim-doc-titre">Fiche d\'identification équipement</h1>'

    + '<div class="fim-corps">'

    + '<table class="fim-tableau">'
    + '<tbody>' + lignes + '</tbody>'
    + '</table>'

    + '<div class="fim-qr-bloc">'
    + '<div class="fim-qr-zone" id="fim-qr"></div>'
    + '<span class="fim-qr-code">Code ' + esc(machine.codePublic) + '</span>'
    + '</div>'

    + '</div>'

    + '<div class="fim-pose">'
    + '<div class="fim-pose-champ">'
    + '<span class="fim-doc-champ-libelle">Date de pose</span>'
    + '<span class="fim-pose-pointilles"></span>'
    + '</div>'
    + '<div class="fim-pose-champ">'
    + '<span class="fim-doc-champ-libelle">Signature technicien</span>'
    + '<span class="fim-pose-pointilles"></span>'
    + '</div>'
    + '</div>'

    + '<div class="fim-doc-pied">Généré par inerWeb Fluide le ' + esc(dateGeneration) + '</div>'

    + '</div>';
}

/* ============================================================
   Styles (injectés une fois, classes préfixées « fim-doc- » — propres
   à ce module, id de style distinct de bon-intervention.js, aucun
   sélecteur partagé littéralement entre les deux fichiers)
   ============================================================ */

const STYLE_ID = 'style-fiche-identification-machine';

function assurerStyle() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .fim-doc-apercu {
      display: flex;
      justify-content: center;
      padding: 24px 16px;
      background: var(--fond-2);
      border-radius: var(--rayon-bouton);
    }

    .fim-doc-entete {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 14px;
      border-bottom: 2px solid var(--marine-900);
      margin-bottom: 16px;
    }
    .fim-doc-entete-logo { flex: none; }

    /* Logo inerWeb Fluide sur fond BLANC (document imprimable) : les
       classes globales .logo-nom/.logo-fluide/.logo-sous-titre sont
       calibrées pour le fond marine sombre de la sidebar (voir
       css/coquille.css) — on les surcharge ici, scopées à l'en-tête
       du document, pour rester lisibles sur papier blanc. */
    .fim-doc-entete-logo .logo-nom { color: var(--texte); }
    .fim-doc-entete-logo .logo-nom .logo-fluide { color: var(--accent-fort); }
    .fim-doc-entete-logo .logo-sous-titre { color: var(--texte-3); }

    .fim-doc-entete-reserves {
      display: flex;
      gap: 14px;
    }
    .fim-doc-reserve {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }
    .fim-doc-reserve-cadre {
      width: 32mm;
      height: 20mm;
      max-width: 110px;
      max-height: 68px;
      border: 1px dashed var(--bordure-3);
      border-radius: 4px;
      background: var(--fond-2);
    }
    .fim-doc-reserve-legende {
      font-size: 8.5px;
      color: var(--texte-faible);
    }

    .fim-doc-titre {
      font-family: var(--police-titres);
      font-size: 20px;
      font-weight: 600;
      color: var(--texte);
      margin: 0 0 16px;
      text-align: center;
    }

    .fim-doc-champ-libelle {
      font-size: 9.5px;
      letter-spacing: .02em;
      text-transform: uppercase;
      color: var(--texte-faible);
    }

    .fim-corps {
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }

    .fim-tableau {
      flex: 1;
      border-collapse: collapse;
      width: 100%;
    }
    .fim-tableau tr { border-bottom: 1px solid var(--bordure-2); }
    .fim-tableau tr:last-child { border-bottom: none; }
    .fim-libelle, .fim-valeur {
      padding: 7px 8px;
      font-size: 12.5px;
      text-align: left;
    }
    .fim-libelle {
      width: 45%;
      color: var(--texte-faible);
      letter-spacing: .02em;
      text-transform: uppercase;
      font-size: 10px;
    }
    .fim-valeur {
      color: var(--texte);
      font-weight: 600;
    }

    .fim-qr-bloc {
      flex: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .fim-qr-zone {
      width: 45mm;
      height: 45mm;
    }
    .fim-qr-zone canvas, .fim-qr-zone img, .fim-qr-zone table {
      width: 100% !important;
      height: auto !important;
    }
    .fim-qr-erreur {
      display: block;
      font-size: 8px;
      color: var(--danger);
      text-align: center;
    }
    .fim-qr-code {
      font-family: var(--police-mono);
      font-weight: 600;
      font-size: 12px;
      color: var(--texte);
    }

    .fim-pose {
      display: flex;
      gap: 32px;
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px dashed var(--bordure-3);
    }
    .fim-pose-champ {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .fim-pose-pointilles {
      height: 18mm;
      border-bottom: 1px solid var(--bordure-3);
    }

    .fim-doc-pied {
      margin-top: 14px;
      font-size: 9.5px;
      color: var(--texte-faible);
      text-align: right;
    }

    .fim-document {
      width: 100%;
      max-width: 210mm;
      padding: 14mm;
      background: #ffffff;
      border: 1px solid var(--bordure);
      border-radius: var(--rayon-carte);
      box-shadow: var(--ombre-douce);
    }

    /* Impression : uniquement le document, à la taille A4 */
    @media print {
      body * { visibility: hidden; }

      .fim-document, .fim-document * {
        visibility: visible;
      }

      .fim-document {
        position: fixed;
        inset: 0;
        margin: 0 auto;
        width: 210mm;
        max-width: 210mm;
        box-shadow: none;
        border: none;
        border-radius: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   Ouverture de la modale
   ============================================================ */

/**
 * Ouvre la modale d'aperçu de la fiche d'identification (A4) d'une
 * machine, toujours régénérable à l'identique depuis les données
 * courantes (fluide, charges, client, fréquence de contrôle).
 * @param {{ store: object }} ctx
 * @param {string} machineId
 * @returns {Promise<void>}
 */
export async function ouvrirFicheIdentification(ctx, machineId) {
  const [machines, fluides, clients] = await Promise.all([
    ctx.store.getMachines(),
    ctx.store.getFluides(),
    ctx.store.getClients()
  ]);

  const machine = machines.find((m) => m.id === machineId);
  if (!machine) return;

  const fluide = fluides.find((f) => f.code === machine.fluide);
  const client = machine.clientId
    ? clients.find((c) => c.id === machine.clientId) || null
    : null;

  assurerStyle();

  const { fermer, racine } = modale({
    titre: 'Fiche d\'identification — ' + machine.designation,
    contenuHtml: '<div class="fim-doc-apercu">' + gabaritFiche(machine, fluide, client) + '</div>',
    actionsHtml:
      '<button type="button" id="fim-fermer" class="btn btn-secondaire no-print">Fermer</button>'
      + '<button type="button" id="fim-imprimer" class="btn btn-marine no-print">'
      + ICONES.imprimer + '<span>Imprimer</span></button>'
  });

  genererQRDansConteneur(racine.querySelector('#fim-qr'), contenuQR(machine.codePublic));

  racine.querySelector('#fim-fermer').addEventListener('click', function () {
    fermer();
  });
  racine.querySelector('#fim-imprimer').addEventListener('click', function () {
    window.print();
  });
}
