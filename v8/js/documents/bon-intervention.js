// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — bon d'intervention (V9.2)
// Document A4 imprimable, très majoritairement MANUSCRIT : imprimé EN
// AMONT d'une intervention, complété et signé SUR PLACE, puis scanné et
// archivé en pièce jointe (catégorie BON_INTERVENTION) sur la fiche
// machine. Indépendant d'un mouvement précis — toujours régénérable à
// l'identique depuis les données courantes de la machine.
//
// Patron repris de documents/plaque-fgas.js et documents/etiquette-
// machine.js : modale d'aperçu + @media print scopé à une classe
// dédiée + window.print(). En-tête = logo inerWeb Fluide (pictogramme
// flocon dans un carré arrondi turquoise, patron de app.js) + deux
// emplacements réservés vides (« Logo établissement », « Logo
// groupement »). QR en petit format encodant « #/m/<code_public> »
// pour rattacher un document très majoritairement manuscrit à sa
// machine (mêmes lib QR vendored + garde d'erreur que etiquette-
// machine.js — jamais d'échec silencieux).
// ============================================================

import { modale, ICONES } from '../views/communs.js';
import { esc } from '../core/utils.js';
import { obtenirQRCode } from '../lib/qrcode.js';

/** Taille en pixels du QR généré (avant mise à l'échelle CSS). */
const QR_PIXELS = 120;

/**
 * Génère le contenu du QR pour une machine : chemin relatif hors-ligne,
 * jamais d'URL absolue ni de domaine codé en dur (même règle que
 * documents/etiquette-machine.js).
 * @param {string} codePublic
 * @returns {string}
 */
export function contenuQR(codePublic) {
  return '#/m/' + codePublic;
}

/**
 * Génère un QR code dans un conteneur DOM déjà monté. Copie exacte du
 * mécanisme de documents/etiquette-machine.js (mêmes garanties :
 * message d'erreur visible si la lib QR vendored est absente, jamais
 * d'exception qui remonte).
 * @param {HTMLElement} conteneur
 * @param {string} texte
 * @returns {void}
 */
function genererQRDansConteneur(conteneur, texte) {
  let QRCode;
  try {
    QRCode = obtenirQRCode();
  } catch (erreur) {
    conteneur.innerHTML = '<span class="bi-qr-erreur">'
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
   ============================================================ */

/**
 * Bandeau d'en-tête du document : logo inerWeb Fluide (patron exact de
 * app.js, classes CSS déjà existantes) + deux cadres discrets réservés
 * aux logos établissement/groupement (vides, légende minuscule).
 * @returns {string} HTML
 */
function enteteDocument() {
  return '<div class="bi-doc-entete">'
    + '<div class="sidebar-logo bi-doc-entete-logo">'
    + '<span class="logo-carre">' + ICONES.flocon + '</span>'
    + '<div class="logo-textes">'
    + '<div class="logo-nom">inerWeb <span class="logo-fluide">Fluide</span></div>'
    + '<div class="logo-sous-titre">Traçabilité F-Gas</div>'
    + '</div>'
    + '</div>'
    + '<div class="bi-doc-entete-reserves">'
    + '<div class="bi-doc-reserve">'
    + '<div class="bi-doc-reserve-cadre"></div>'
    + '<span class="bi-doc-reserve-legende">Logo établissement</span>'
    + '</div>'
    + '<div class="bi-doc-reserve">'
    + '<div class="bi-doc-reserve-cadre"></div>'
    + '<span class="bi-doc-reserve-legende">Logo groupement</span>'
    + '</div>'
    + '</div>'
    + '</div>';
}

/* ============================================================
   Gabarit HTML du bon d'intervention
   ============================================================ */

/**
 * @param {object} machine
 * @param {object|null} client
 * @returns {string} HTML
 */
function gabaritBonIntervention(machine, client) {
  const dateGeneration = new Date().toLocaleDateString('fr-FR');

  return '<div class="bi-document">'

    + enteteDocument()

    + '<h1 class="bi-doc-titre">Bon d\'intervention</h1>'

    // ---- Client ----
    + '<div class="bi-doc-bloc">'
    + '<div class="bi-doc-bloc-titre">Client</div>'
    + '<div class="bi-doc-grille-2">'
    + '<div class="bi-doc-champ">'
    + '<span class="bi-doc-champ-libelle">Client</span>'
    + '<span class="bi-doc-champ-valeur">' + esc(client ? client.raisonSociale : '') + '</span>'
    + '</div>'
    + '<div class="bi-doc-champ">'
    + '<span class="bi-doc-champ-libelle">Adresse</span>'
    + '<span class="bi-doc-champ-valeur">' + esc(client ? client.adresse : '') + '</span>'
    + '</div>'
    + '</div>'
    + '</div>'

    // ---- Type d'intervention ----
    + '<div class="bi-doc-bloc">'
    + '<div class="bi-doc-bloc-titre">Type d\'intervention</div>'
    + '<div class="bi-cases">'
    + '<span class="bi-case"><span class="bi-case-carre"></span>Dépannage</span>'
    + '<span class="bi-case"><span class="bi-case-carre"></span>Entretien</span>'
    + '<span class="bi-case"><span class="bi-case-carre"></span>Mise en service</span>'
    + '</div>'
    + '</div>'

    // ---- Technicien(s) ----
    + '<div class="bi-doc-bloc">'
    + '<div class="bi-doc-bloc-titre">Technicien(s)</div>'
    + '<div class="bi-doc-grille-2">'
    + '<div class="bi-doc-champ bi-doc-champ-vide"><span class="bi-doc-champ-libelle">Nom</span></div>'
    + '<div class="bi-doc-champ bi-doc-champ-vide"><span class="bi-doc-champ-libelle">Prénom(s)</span></div>'
    + '<div class="bi-doc-champ bi-doc-champ-vide"><span class="bi-doc-champ-libelle">Date</span></div>'
    + '<div class="bi-doc-champ bi-doc-champ-vide"><span class="bi-doc-champ-libelle">Heure d\'arrivée</span></div>'
    + '<div class="bi-doc-champ bi-doc-champ-vide"><span class="bi-doc-champ-libelle">Heure de départ</span></div>'
    + '<div class="bi-doc-champ bi-doc-champ-vide"><span class="bi-doc-champ-libelle">Temps passé</span></div>'
    + '</div>'
    + '</div>'

    // ---- Descriptif de la mission ----
    + '<div class="bi-doc-bloc">'
    + '<div class="bi-doc-bloc-titre">Descriptif de la mission</div>'
    + '<div class="bi-zone-lignes bi-zone-grande"></div>'
    + '</div>'

    // ---- Commentaire / observations / réglages ----
    + '<div class="bi-doc-bloc">'
    + '<div class="bi-doc-bloc-titre">Commentaire / observations / valeur de réglages</div>'
    + '<div class="bi-zone-lignes bi-zone-grande"></div>'
    + '</div>'

    // ---- Bas de page 2 colonnes ----
    + '<div class="bi-doc-bloc bi-bas">'
    + '<div class="bi-bas-colonne">'
    + '<div class="bi-doc-champ bi-doc-champ-vide"><span class="bi-doc-champ-libelle">Fait à</span></div>'
    + '<div class="bi-doc-champ bi-doc-champ-vide"><span class="bi-doc-champ-libelle">Le</span></div>'
    + '<div class="bi-signature">Signature du Technicien(s)</div>'
    + '</div>'
    + '<div class="bi-bas-colonne">'
    + '<div class="bi-doc-champ-libelle">Remarques client</div>'
    + '<div class="bi-zone-lignes"></div>'
    + '<div class="bi-doc-champ bi-doc-champ-vide"><span class="bi-doc-champ-libelle">Nom</span></div>'
    + '<div class="bi-doc-champ bi-doc-champ-vide"><span class="bi-doc-champ-libelle">Le</span></div>'
    + '<div class="bi-signature">Signature client</div>'
    + '</div>'
    + '</div>'

    // ---- Machine concernée (traçabilité, en marge) ----
    + '<div class="bi-machine-marge">'
    + '<div class="bi-machine-qr" id="bi-machine-qr"></div>'
    + '<div class="bi-machine-texte">'
    + '<span class="bi-machine-designation">' + esc(machine.designation) + '</span>'
    + '<span class="bi-machine-code">Code ' + esc(machine.codePublic) + '</span>'
    + '</div>'
    + '</div>'

    + '<div class="bi-doc-pied">Généré par inerWeb Fluide le ' + esc(dateGeneration) + '</div>'

    + '</div>';
}

/* ============================================================
   Styles (injectés une fois, classes préfixées « bi-doc- » — propres
   à ce module, ne fuient pas sur fiche-identification-machine.js qui
   utilise son propre préfixe « fim-doc- »)
   ============================================================ */

const STYLE_ID = 'style-bon-intervention';

/**
 * Bloc d'impression du bon d'intervention — EXPORTÉ pour être éprouvé
 * (`test-bon-intervention.mjs`) : une règle d'impression ne se relit pas,
 * elle se tire. Lot D carte blanche (13/08) : l'ancien bloc posait
 * `position: fixed; inset: 0` sur `.bi-document` — un document CLOUÉ à la
 * première feuille, mesuré au lot 1 : **138 caractères sur le papier, fin
 * du document ABSENTE**. Remède = le patron ÉPROUVÉ du justificatif de
 * régularisation (documents/regularisation.js, lot 1) : remise à plat des
 * ancêtres de la modale, transform réécrit à la même spécificité que
 * composants.css, document laissé DANS LE FLUX pour se paginer.
 */
export const CSS_IMPRESSION_BON = `
    @media print {
      body * { visibility: hidden; }

      .bi-document,
      .bi-document * { visibility: visible; }

      /* Rien de l'application ne PREND DE PLACE sur la feuille. */
      body > * { display: none !important; }

      body > #zone-modales,
      body > .modale-fond { display: block !important; }

      .modale-entete,
      .modale-actions { display: none !important; }

      /* Les boîtes qui rognaient la feuille (max-height + overflow +
         backdrop-filter — la modale est une boîte d'UNE page) sont
         remises à plat. */
      #zone-modales,
      .modale-fond,
      .modale,
      .modale-corps,
      .bi-doc-apercu {
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

      /* composants.css pose .modale-fond.visible .modale { transform } à
         DEUX classes — un ancêtre transformé devient le bloc conteneur
         des descendants fixes : réécrit ici à la même spécificité. */
      .modale-fond.visible .modale { transform: none; }

      /* Le document reste DANS LE FLUX : c'est le position: fixed qui le
         clouait à la première feuille. */
      .bi-document {
        position: relative;
        width: auto;
        max-width: 210mm;
        margin: 0 auto;
        padding: 0;
        box-shadow: none;
        border: none;
        border-radius: 0;
      }

      /* Un champ de saisie manuscrite ne se coupe pas entre deux pages,
         un titre de bloc ne part jamais sans son bloc. */
      .bi-doc-champ,
      .bi-doc-reserve { break-inside: avoid; page-break-inside: avoid; }

      .bi-doc-bloc-titre { break-after: avoid; page-break-after: avoid; }
    }
`;

function assurerStyle() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .bi-doc-apercu {
      display: flex;
      justify-content: center;
      padding: 24px 16px;
      background: var(--fond-2);
      border-radius: var(--rayon-bouton);
    }

    .bi-doc-entete {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 14px;
      border-bottom: 2px solid var(--marine-900);
      margin-bottom: 16px;
    }
    .bi-doc-entete-logo { flex: none; }

    /* Logo inerWeb Fluide sur fond BLANC (document imprimable) : les
       classes globales .logo-nom/.logo-fluide/.logo-sous-titre sont
       calibrées pour le fond marine sombre de la sidebar (voir
       css/coquille.css) — on les surcharge ici, scopées à l'en-tête
       du document, pour rester lisibles sur papier blanc. */
    .bi-doc-entete-logo .logo-nom { color: var(--texte); }
    .bi-doc-entete-logo .logo-nom .logo-fluide { color: var(--accent-fort); }
    .bi-doc-entete-logo .logo-sous-titre { color: var(--texte-3); }

    .bi-doc-entete-reserves {
      display: flex;
      gap: 14px;
    }
    .bi-doc-reserve {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }
    .bi-doc-reserve-cadre {
      width: 32mm;
      height: 20mm;
      max-width: 110px;
      max-height: 68px;
      border: 1px dashed var(--bordure-3);
      border-radius: 4px;
      background: var(--fond-2);
    }
    .bi-doc-reserve-legende {
      font-size: 8.5px;
      color: var(--texte-faible);
    }

    .bi-doc-titre {
      font-family: var(--police-titres);
      font-size: 20px;
      font-weight: 600;
      color: var(--texte);
      margin: 0 0 14px;
      text-align: center;
    }

    .bi-doc-bloc {
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--bordure-2);
    }
    .bi-doc-bloc:last-of-type { border-bottom: none; }

    .bi-doc-bloc-titre {
      font-family: var(--police-titres);
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: .02em;
      text-transform: uppercase;
      color: var(--marine-900);
      margin-bottom: 8px;
    }

    .bi-doc-grille-2 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px 16px;
    }

    .bi-doc-champ {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .bi-doc-champ-libelle {
      font-size: 9.5px;
      letter-spacing: .02em;
      text-transform: uppercase;
      color: var(--texte-faible);
    }
    .bi-doc-champ-valeur {
      font-size: 12.5px;
      color: var(--texte);
      min-height: 14px;
    }
    .bi-doc-champ-vide {
      border-bottom: 1px solid var(--bordure-3);
      padding-bottom: 14px;
    }

    .bi-cases {
      display: flex;
      gap: 22px;
      flex-wrap: wrap;
    }
    .bi-case {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 12.5px;
      color: var(--texte);
    }
    .bi-case-carre {
      width: 12px;
      height: 12px;
      border: 1px solid var(--texte-3);
      border-radius: 2px;
      background: #ffffff;
    }

    .bi-zone-lignes {
      height: 20mm;
      background-image: repeating-linear-gradient(
        to bottom,
        transparent, transparent 6.5mm,
        var(--bordure-3) 6.5mm, var(--bordure-3) calc(6.5mm + 1px)
      );
    }
    .bi-zone-grande { height: 28mm; }

    .bi-bas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      border-bottom: none;
    }
    .bi-bas-colonne {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .bi-signature {
      margin-top: 6px;
      padding-top: 22mm;
      border-top: 1px solid var(--bordure-3);
      font-size: 10px;
      color: var(--texte-faible);
      text-align: center;
    }

    .bi-machine-marge {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px dashed var(--bordure-3);
    }
    .bi-machine-qr { width: 16mm; height: 16mm; flex: none; }
    .bi-machine-qr canvas, .bi-machine-qr img, .bi-machine-qr table {
      width: 100% !important;
      height: auto !important;
    }
    .bi-qr-erreur {
      display: block;
      font-size: 6px;
      color: var(--danger);
    }
    .bi-machine-texte {
      display: flex;
      flex-direction: column;
      font-size: 9.5px;
      color: var(--texte-3);
    }
    .bi-machine-designation { font-weight: 600; color: var(--texte-2); }
    .bi-machine-code { font-family: var(--police-mono); }

    .bi-doc-pied {
      margin-top: 14px;
      font-size: 9.5px;
      color: var(--texte-faible);
      text-align: right;
    }

    .bi-document {
      width: 100%;
      max-width: 210mm;
      padding: 14mm;
      background: #ffffff;
      border: 1px solid var(--bordure);
      border-radius: var(--rayon-carte);
      box-shadow: var(--ombre-douce);
    }

    /* Impression : uniquement le document — bloc exporté et éprouvé. */
    ${CSS_IMPRESSION_BON}
  `;
  document.head.appendChild(style);
}

/* ============================================================
   Ouverture de la modale
   ============================================================ */

/**
 * Ouvre la modale d'aperçu du bon d'intervention d'une machine.
 * Document indépendant d'un mouvement précis : toujours disponible,
 * pré-rempli avec ce que l'appli connaît (client), le reste étant
 * laissé vide pour complétion manuscrite sur place.
 * @param {{ store: object }} ctx
 * @param {string} machineId
 * @returns {Promise<void>}
 */
export async function ouvrirBonIntervention(ctx, machineId) {
  const [machines, clients] = await Promise.all([
    ctx.store.getMachines(),
    ctx.store.getClients()
  ]);

  const machine = machines.find((m) => m.id === machineId);
  if (!machine) return;

  const client = machine.clientId
    ? clients.find((c) => c.id === machine.clientId) || null
    : null;

  assurerStyle();

  const { fermer, racine } = modale({
    titre: 'Bon d\'intervention — ' + machine.designation,
    contenuHtml: '<div class="bi-doc-apercu">' + gabaritBonIntervention(machine, client) + '</div>',
    actionsHtml:
      '<button type="button" id="bi-fermer" class="btn btn-secondaire no-print">Fermer</button>'
      + '<button type="button" id="bi-imprimer" class="btn btn-marine no-print">'
      + ICONES.imprimer + '<span>Imprimer</span></button>'
  });

  genererQRDansConteneur(racine.querySelector('#bi-machine-qr'), contenuQR(machine.codePublic));

  racine.querySelector('#bi-fermer').addEventListener('click', function () {
    fermer();
  });
  racine.querySelector('#bi-imprimer').addEventListener('click', function () {
    window.print();
  });
}
