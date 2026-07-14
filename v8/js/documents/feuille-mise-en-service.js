// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — feuille de mise en service (V9.2)
// Reproduit à l'identique la feuille de mise en service papier utilisée
// par Franck (sujet d'examen CAP IFCA), adaptée au contexte réel de
// l'application : les champs connus du registre (établissement, machine,
// fluide, date) sont PRÉ-REMPLIS ; les mesures de mise en service
// (températures, pressostats, surchauffe, sous-refroidissement…) restent
// des champs VIDES à compléter à la main — l'application ne calcule pas
// ces valeurs aujourd'hui (pas de module relevés).
//
// Patron repris à l'identique de documents/plaque-fgas.js et
// documents/etiquette-machine.js : modale d'aperçu + @media print scopé
// à une classe dédiée + window.print(). QR généré via la lib vendored
// (lib/qrcode.js → obtenirQRCode()), contenu TOUJOURS un chemin relatif
// « #/m/<code_public> » (jamais d'URL absolue/domaine).
//
// CF-1 : le bouton d'ouverture n'apparaît que pour un mouvement de type
// MISE_EN_SERVICE dont le statut est VALIDE ou ANNULE (même règle que le
// bouton CERFA) — cf. peutOuvrirFeuilleMiseEnService() ci-dessous,
// exportée pour que les vues appelantes appliquent la même condition.
// ============================================================

import { modale, ICONES } from '../views/communs.js';
import { esc, fmtDate } from '../core/utils.js';
import { obtenirQRCode } from '../lib/qrcode.js';

/** Taille en pixels du QR généré (avant mise à l'échelle CSS). */
const QR_PIXELS = 160;

/** Statuts de mouvement pour lesquels le document peut être généré (CF-1). */
const STATUTS_AUTORISES = ['VALIDE', 'ANNULE'];

/**
 * CF-1 : un mouvement autorise-t-il l'ouverture de la feuille de mise en
 * service ? Il faut un mouvement de type MISE_EN_SERVICE, figé (VALIDE ou
 * ANNULE) — jamais BROUILLON/SOUMIS. Exportée pour que les vues appelantes
 * (mouvements.js, fiche-machine.js) décident d'afficher le bouton sans
 * dupliquer la règle.
 * @param {object|null|undefined} mouvement
 * @returns {boolean}
 */
export function peutOuvrirFeuilleMiseEnService(mouvement) {
  return Boolean(mouvement)
    && mouvement.type === 'MISE_EN_SERVICE'
    && STATUTS_AUTORISES.includes(mouvement.statut);
}

/**
 * Contenu du QR : chemin relatif hors-ligne vers la fiche machine,
 * jamais d'URL absolue ni de domaine codé en dur.
 * @param {string} codePublic
 * @returns {string}
 */
export function contenuQR(codePublic) {
  return '#/m/' + codePublic;
}

/**
 * Génère un QR code dans un conteneur DOM déjà monté (même mécanisme que
 * documents/etiquette-machine.js) : dataURL PNG si un <canvas> est utilisable,
 * sinon le rendu <table> de secours reste visible. Si la bibliothèque QR est
 * indisponible, un message d'erreur lisible remplace la zone.
 * @param {HTMLElement} conteneur
 * @param {string} texte
 */
function genererQRDansConteneur(conteneur, texte) {
  let QRCode;
  try {
    QRCode = obtenirQRCode();
  } catch (erreur) {
    conteneur.innerHTML = '<span class="fmes-qr-erreur">'
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
   Gabarit HTML
   ============================================================ */

/** Bandeau d'en-tête commun : logo inerWeb Fluide + 2 emplacements réservés. */
function enteteLogo() {
  return '<div class="fmes-entete">'
    + '<div class="fmes-logo-inerweb">'
    + '<span class="logo-carre">' + ICONES.flocon + '</span>'
    + '<div class="logo-textes">'
    + '<div class="fmes-logo-nom">inerWeb <span class="fmes-logo-fluide">Fluide</span></div>'
    + '<div class="fmes-logo-sous-titre">Traçabilité F-Gas</div>'
    + '</div>'
    + '</div>'
    + '<div class="fmes-logos-reserves">'
    + '<div class="fmes-logo-reserve"><div class="fmes-logo-cadre"></div>'
    + '<span class="fmes-logo-legende">Logo établissement</span></div>'
    + '<div class="fmes-logo-reserve"><div class="fmes-logo-cadre"></div>'
    + '<span class="fmes-logo-legende">Logo groupement</span></div>'
    + '</div>'
    + '</div>';
}

/** Une ligne « libellé : valeur » pré-remplie (grisée si vide). */
function lignePrerempliee(libelle, valeur) {
  return '<div class="fmes-champ">'
    + '<span class="fmes-champ-libelle">' + esc(libelle) + '</span>'
    + '<span class="fmes-champ-valeur fmes-preremplie">' + esc(valeur || '—') + '</span>'
    + '</div>';
}

/** Une ligne « libellé : ................ » à compléter à la main. */
function ligneACompleter(libelle) {
  return '<div class="fmes-champ">'
    + '<span class="fmes-champ-libelle">' + esc(libelle) + '</span>'
    + '<span class="fmes-champ-valeur fmes-vide"></span>'
    + '</div>';
}

/**
 * Construit le HTML complet de la feuille de mise en service (zone
 * imprimable), avec toutes les données pré-remplies déjà résolues par
 * l'appelant (aucun accès store depuis le gabarit).
 * @param {{ etablissement: object, machine: object, dateMouvement: string,
 *           maintenant: Date }} donnees
 * @returns {string} HTML
 */
function gabaritFeuille(donnees) {
  const { etablissement, machine, dateMouvement, maintenant } = donnees;

  const jour = String(maintenant.getDate()).padStart(2, '0');
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
  const genereLe = jour + '/' + mois + '/' + maintenant.getFullYear();

  return '<div class="fmes-feuille">'

    + enteteLogo()

    + '<h2 class="fmes-titre">Feuille de mise en service</h2>'

    + '<div class="fmes-bloc">'
    + lignePrerempliee('Nom', etablissement.raisonSociale)
    + lignePrerempliee('Adresse', etablissement.adresse)
    + lignePrerempliee('Date', fmtDate(dateMouvement))
    + '</div>'

    + '<h3 class="fmes-sous-titre">Équipement</h3>'
    + '<div class="fmes-bloc fmes-bloc-equipement">'
    + '<div class="fmes-equipement-champs">'
    + lignePrerempliee('Marque', machine.marque)
    + lignePrerempliee('Type', machine.type)
    + lignePrerempliee('Référence', machine.modele)
    + lignePrerempliee('N° série', machine.numSerie)
    + '</div>'
    + '<div class="fmes-equipement-qr">'
    + '<div class="fmes-qr-zone" id="fmes-qr"></div>'
    + '<span class="fmes-qr-code">' + esc(machine.codePublic) + '</span>'
    + '</div>'
    + '</div>'

    + '<h3 class="fmes-sous-titre">Types de fluides</h3>'
    + '<div class="fmes-bloc">'
    + lignePrerempliee('Fluide', machine.fluide)
    + '<div class="fmes-ligne-quadruple">'
    + ligneACompleter('PK')
    + ligneACompleter('tk')
    + ligneACompleter('P0')
    + ligneACompleter('t0')
    + '</div>'
    + '</div>'

    + '<h3 class="fmes-sous-titre">Relevés du compresseur</h3>'
    + '<div class="fmes-bloc">'
    + ligneACompleter('Théta de refoulement du compresseur')
    + ligneACompleter('Théta de l’aspiration du compresseur')
    + ligneACompleter('Intensité absorbée par le compresseur')
    + '</div>'

    + '<h3 class="fmes-sous-titre">Relevés côté échangeurs</h3>'
    + '<div class="fmes-bloc">'
    + ligneACompleter('Théta de sortie condenseur (t_scond)')
    + ligneACompleter('Théta de sortie de l’évaporateur (t_b)')
    + '</div>'

    + '<h3 class="fmes-sous-titre">Sens de rotation</h3>'
    + '<div class="fmes-bloc">'
    + ligneACompleter('Ventilo-condenseur')
    + ligneACompleter('Ventilo-évaporateur')
    + '</div>'

    + '<h3 class="fmes-sous-titre">Régulation et sécurités</h3>'
    + '<div class="fmes-bloc">'
    + ligneACompleter('Point de consigne de régulation')
    + '<div class="fmes-ligne-pressostats">'
    + '<div class="fmes-pressostat">'
    + '<span class="fmes-pressostat-nom">PSL</span>'
    + ligneACompleter('cut in')
    + ligneACompleter('dif')
    + '</div>'
    + '<div class="fmes-pressostat">'
    + '<span class="fmes-pressostat-nom">PZL</span>'
    + ligneACompleter('cut in')
    + ligneACompleter('dif')
    + '</div>'
    + '<div class="fmes-pressostat">'
    + '<span class="fmes-pressostat-nom">PHP sécu</span>'
    + ligneACompleter('cut of')
    + ligneACompleter('dif')
    + '</div>'
    + '</div>'
    + '</div>'

    + '<h3 class="fmes-sous-titre">Surchauffe et sous-refroidissement</h3>'
    + '<div class="fmes-bloc">'
    + ligneACompleter('Valeur de surchauffe (SCH = t_b − t0)')
    + ligneACompleter('Valeur de sous-refroidissement (SR = tk − t_scond)')
    + '</div>'

    + '<div class="fmes-pied">Généré par inerWeb Fluide le ' + esc(genereLe) + '</div>'

    + '</div>';
}

/* ============================================================
   Styles (injectés une fois, classes préfixées « fmes- »)
   ============================================================ */

const STYLE_ID = 'style-feuille-mise-en-service';

function assurerStyle() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .fmes-apercu {
      display: flex;
      justify-content: center;
      padding: 20px 16px;
      background: var(--fond-2);
      border-radius: var(--rayon-bouton);
    }

    .fmes-feuille {
      width: 100%;
      max-width: 720px;
      background: #ffffff;
      border: 1px solid var(--bordure);
      border-radius: var(--rayon-carte);
      padding: 24px 28px;
      color: var(--texte);
    }

    .fmes-entete {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 14px;
      border-bottom: 2px solid var(--bordure);
      margin-bottom: 16px;
    }
    .fmes-logo-inerweb {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .fmes-logo-nom {
      font-family: var(--police-titres);
      font-weight: 700;
      font-size: 15px;
      color: var(--texte);
    }
    .fmes-logo-fluide { color: var(--accent-fort); }
    .fmes-logo-sous-titre {
      font-size: 8.5px;
      font-weight: 600;
      letter-spacing: .14em;
      text-transform: uppercase;
      color: var(--texte-3);
      margin-top: 2px;
    }

    .fmes-logos-reserves {
      display: flex;
      gap: 12px;
    }
    .fmes-logo-reserve {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }
    .fmes-logo-cadre {
      width: 30mm;
      height: 15mm;
      max-width: 100px;
      max-height: 50px;
      border: 1px dashed var(--bordure-3);
      border-radius: 4px;
      background: var(--fond-3);
    }
    .fmes-logo-legende {
      font-size: 8px;
      color: var(--texte-faible);
    }

    .fmes-titre {
      font-family: var(--police-titres);
      font-size: 17px;
      font-weight: 700;
      text-align: center;
      margin: 0 0 16px;
      color: var(--texte);
    }
    .fmes-sous-titre {
      font-family: var(--police-titres);
      font-size: 12.5px;
      font-weight: 600;
      color: var(--accent-fort);
      margin: 16px 0 8px;
      text-transform: uppercase;
      letter-spacing: .03em;
    }

    .fmes-bloc {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .fmes-bloc-equipement {
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .fmes-equipement-champs {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .fmes-equipement-qr {
      flex: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .fmes-qr-zone {
      width: 26mm;
    }
    .fmes-qr-zone canvas,
    .fmes-qr-zone img,
    .fmes-qr-zone table {
      width: 100% !important;
      height: auto !important;
    }
    .fmes-qr-erreur {
      display: block;
      font-size: 8px;
      color: var(--danger);
      max-width: 26mm;
    }
    .fmes-qr-code {
      font-family: var(--police-mono);
      font-size: 10px;
      font-weight: 600;
      color: var(--texte-2);
    }

    .fmes-champ {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 12.5px;
    }
    .fmes-champ-libelle {
      color: var(--texte-3);
      white-space: nowrap;
    }
    .fmes-champ-libelle::after { content: ' :'; }
    .fmes-champ-valeur { flex: 1; }
    .fmes-preremplie {
      font-weight: 600;
      color: var(--texte);
    }
    .fmes-vide {
      display: inline-block;
      min-width: 60px;
      border-bottom: 1px dotted var(--bordure-3);
    }

    .fmes-ligne-quadruple {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px 14px;
    }

    .fmes-ligne-pressostats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px 16px;
      margin-top: 4px;
    }
    .fmes-pressostat {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      border: 1px solid var(--bordure-2);
      border-radius: 6px;
    }
    .fmes-pressostat-nom {
      font-size: 11px;
      font-weight: 700;
      color: var(--texte);
    }

    .fmes-pied {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid var(--bordure-2);
      font-size: 10px;
      color: var(--texte-faible);
      text-align: right;
    }

    @media (max-width: 640px) {
      .fmes-bloc-equipement { flex-direction: column; }
      .fmes-ligne-quadruple { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .fmes-ligne-pressostats { grid-template-columns: 1fr; }
      .fmes-entete { flex-direction: column; }
    }

    /* Impression : uniquement la feuille, à sa taille A4. */
    @media print {
      body * { visibility: hidden; }

      .fmes-apercu, .fmes-apercu * { visibility: visible; }

      .fmes-apercu {
        position: fixed;
        inset: 0;
        margin: auto;
        background: #ffffff;
        padding: 10mm;
      }
      .fmes-feuille {
        max-width: 100%;
        border: none;
        padding: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   Ouverture de la modale
   ============================================================ */

/**
 * Ouvre la modale d'aperçu de la feuille de mise en service d'un
 * mouvement. N'affiche/ouvre rien si le mouvement ne remplit pas les
 * conditions CF-1 (cf. peutOuvrirFeuilleMiseEnService) — appelée ici en
 * garde défensive en plus du contrôle déjà fait par les vues appelantes.
 * @param {{ store: object }} ctx
 * @param {string} mouvementId
 * @returns {Promise<void>}
 */
export async function ouvrirFeuilleMiseEnService(ctx, mouvementId) {
  const [mouvements, machines, etablissement] = await Promise.all([
    ctx.store.getMouvements(),
    ctx.store.getMachines(),
    ctx.store.getEtablissement()
  ]);

  const mouvement = mouvements.find((mv) => mv.id === mouvementId);
  if (!peutOuvrirFeuilleMiseEnService(mouvement)) return;

  const machine = machines.find((m) => m.id === mouvement.machineId);
  if (!machine) return;

  assurerStyle();

  const html = gabaritFeuille({
    etablissement,
    machine,
    dateMouvement: mouvement.date,
    maintenant: new Date()
  });

  const { fermer, racine } = modale({
    titre: 'Feuille de mise en service — ' + machine.designation,
    contenuHtml: '<div class="fmes-apercu">' + html + '</div>',
    actionsHtml:
      '<button type="button" id="fmes-fermer" class="btn btn-secondaire no-print">Fermer</button>'
      + '<button type="button" id="fmes-imprimer" class="btn btn-marine no-print">'
      + ICONES.imprimer + '<span>Imprimer</span></button>'
  });

  genererQRDansConteneur(racine.querySelector('#fmes-qr'), contenuQR(machine.codePublic));

  racine.querySelector('#fmes-fermer').addEventListener('click', function () {
    fermer();
  });
  racine.querySelector('#fmes-imprimer').addEventListener('click', function () {
    window.print();
  });
}
