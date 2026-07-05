// ============================================================
// inerWeb Fluide — vue « Parc machines »
// Grille de cartes machine : statut, fluide, charge, contrôles,
// fidèle à la maquette validée (composant n° 4 de la charte).
// IM-4 : cycle de vie piloté depuis la carte — arrêt, remise en
// service, démantèlement (définitif, fluide récupéré d'abord).
// ============================================================

import { enteteVue, chipStatut, barreProgression, modale, toast, ICONES } from './communs.js';
import { esc, fmtNombre, fmtKg, fmtTeq, teqCO2 } from '../core/utils.js';
import { ouvrirFormMachine } from '../modales/machine-form.js';
import { ouvrirPlaque } from '../documents/plaque-fgas.js';

export const titre = 'Parc machines';

/* ============================================================
   Styles propres à la vue (classes préfixées « machine- »)
   ============================================================ */

const STYLES_VUE = `
<style>
  /* Carte machine : pile verticale d'informations */
  .carte-machine {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Ligne 1 : désignation + chip de statut à droite */
  .machine-entete {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .machine-titre {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-weight: 600;
    font-size: 14.5px;
    color: var(--texte);
    line-height: 1.35;
  }

  /* Ligne 2 : type · marque modèle */
  .machine-sous-titre {
    margin-top: -8px;
    font-size: 12.5px;
    color: var(--texte-3);
  }

  /* Chip code fluide (mono, fond gris clair) + famille grise */
  .machine-fluide {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .machine-famille {
    font-size: 12px;
    color: var(--texte-3);
  }

  /* Ligne de charge : libellé + valeurs mono, t CO₂ à droite */
  .machine-charge {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    font-size: 12.5px;
    color: var(--texte-2);
  }

  .machine-co2 {
    font-family: var(--police-mono);
    font-variant-numeric: tabular-nums;
    color: var(--texte-3);
    white-space: nowrap;
  }

  /* Pied : localisation à gauche, détenteur à droite, filet au-dessus */
  .machine-pied {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-top: 2px;
    padding-top: 10px;
    border-top: 1px solid var(--bordure-2);
    font-size: 12px;
    color: var(--texte-3);
  }

  .machine-detenteur {
    text-align: right;
  }

  /* Pied d'actions : boutons Plaque / Modifier alignés à droite */
  .machine-actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* IM-4 : machine démantelée — carte grisée, aucune action */
  .carte-machine-demantelee {
    opacity: 0.55;
    filter: grayscale(0.4);
  }
</style>`;

/* ============================================================
   Gabarit d'une carte machine
   ============================================================ */

/**
 * IM-4 : boutons d'action selon le statut de la machine.
 * EN_SERVICE (et FUITE, CONTROLE_DU) : « Arrêter » ;
 * ARRETEE : « Remettre en service » + « Démanteler » ;
 * DEMANTELEE : aucune action (carte grisée, état définitif).
 * @param {object} machine
 * @returns {string} HTML (vide pour une machine démantelée)
 */
function actionsMachine(machine) {
  if (machine.statut === 'DEMANTELEE') return '';

  const id = esc(machine.id);
  const nom = esc(machine.designation);
  const boutons = [];

  if (machine.statut === 'ARRETEE') {
    boutons.push('<button type="button" class="btn btn-contour btn-petit" data-action="remettre-machine" '
      + 'data-id="' + id + '" aria-label="Remettre en service ' + nom + '">Remettre en service</button>');
    boutons.push('<button type="button" class="btn btn-danger-contour btn-petit" data-action="demanteler-machine" '
      + 'data-id="' + id + '" aria-label="Démanteler ' + nom + '">Démanteler</button>');
  } else {
    boutons.push('<button type="button" class="btn btn-contour btn-petit" data-action="arreter-machine" '
      + 'data-id="' + id + '" aria-label="Arrêter ' + nom + '">Arrêter</button>');
  }

  boutons.push('<button type="button" class="btn btn-contour btn-petit" data-action="plaque-machine" '
    + 'data-id="' + id + '" aria-label="Plaque F-Gas de ' + nom + '">Plaque</button>');
  boutons.push('<button type="button" class="btn btn-contour btn-petit" data-action="ouvrir-fiche" '
    + 'data-id="' + id + '" aria-label="Ouvrir la fiche de ' + nom + '">Ouvrir la fiche</button>');
  boutons.push('<button type="button" class="btn btn-contour btn-petit" data-action="modifier-machine" '
    + 'data-id="' + id + '" aria-label="Modifier ' + nom + '">Modifier</button>');

  return '<div class="machine-actions">' + boutons.join('') + '</div>';
}

/**
 * Rend la carte d'une machine.
 * @param {object} machine — machine du store (contrat v8)
 * @param {Map<string, object>} fluideParCode — code fluide → fiche fluide
 * @param {Map<string, object>} clientParId — id client → fiche client
 * @returns {string} HTML
 */
function carteMachine(machine, fluideParCode, clientParId) {
  const fluide = fluideParCode.get(machine.fluide);
  const client = clientParId.get(machine.clientId);

  // Détenteur : raison sociale du client, sinon libellé de site
  const detenteur = (client && client.raisonSociale) || machine.siteLabel || '—';

  // Taux de remplissage (borné par barreProgression), rouge en cas de fuite
  const pct = machine.chargeNominaleKg > 0
    ? (machine.chargeActuelleKg / machine.chargeNominaleKg) * 100
    : 0;
  const teinteBarre = machine.statut === 'FUITE' ? 'rouge' : 'vert';

  // Équivalent CO₂ de la charge actuelle (GWP AR4 du référentiel)
  const co2 = fluide ? fmtTeq(teqCO2(machine.chargeActuelleKg, fluide.gwpAr4)) : '—';

  // Pastille verte discrète : détection permanente de fuite
  const pastilleDetection = machine.detectionPermanente
    ? '<span class="pastille-verte" title="Détection permanente de fuite"></span>'
      + '<span class="sr-uniquement">Détection permanente de fuite</span>'
    : '';

  // IM-4 : carte grisée pour une machine démantelée (état définitif)
  const classeCarte = machine.statut === 'DEMANTELEE'
    ? 'carte carte-machine carte-machine-demantelee'
    : 'carte carte-machine';

  return '<article class="' + classeCarte + '">'

    // Ligne 1 : désignation + statut
    + '<div class="machine-entete">'
    + '<h3 class="machine-titre"><span>' + esc(machine.designation) + '</span>' + pastilleDetection + '</h3>'
    + chipStatut(machine.statut)
    + '</div>'

    // Ligne 2 : type · marque modèle
    + '<p class="machine-sous-titre">'
    + esc(machine.type) + ' · ' + esc(machine.marque) + ' ' + esc(machine.modele)
    + '</p>'

    // Fluide : chip code mono fond gris clair + famille grise
    + '<div class="machine-fluide">'
    + '<span class="chip chip-gris chip-mono">' + esc(machine.fluide) + '</span>'
    + '<span class="machine-famille">' + esc(fluide ? fluide.famille : '—') + '</span>'
    + '</div>'

    // Barre de remplissage de la charge
    + barreProgression(pct, teinteBarre)

    // Charge actuelle / nominale + équivalent CO₂ à droite
    + '<div class="machine-charge">'
    + '<span>Charge <span class="mono">' + esc(fmtNombre(machine.chargeActuelleKg, 2))
    + ' / ' + esc(fmtKg(machine.chargeNominaleKg)) + '</span></span>'
    + '<span class="machine-co2">' + esc(co2) + '</span>'
    + '</div>'

    // Pied : localisation à gauche, détenteur à droite
    + '<div class="machine-pied">'
    + '<span class="machine-localisation">' + esc(machine.localisation) + '</span>'
    + '<span class="machine-detenteur">' + esc(detenteur) + '</span>'
    + '</div>'

    // Actions selon le statut (IM-4) : cycle de vie + plaque + fiche
    + actionsMachine(machine)

    + '</article>';
}

/* ============================================================
   Actions du cycle de vie (IM-4)
   ============================================================ */

/** Nom complet de l'utilisateur courant, pour le journal du store. */
async function operateurCourant(ctx) {
  const utilisateur = await ctx.store.getUtilisateurCourant();
  return utilisateur.prenom + ' ' + utilisateur.nom;
}

/**
 * IM-4 : confirmation avant démantèlement (définitif). L'erreur du
 * store — notamment « fluide à récupérer d'abord » — part en toast.
 * @param {object} ctx
 * @param {object} machine
 * @param {() => void} surSucces — rafraîchit la vue après mutation
 */
function ouvrirConfirmationDemantelement(ctx, machine, surSucces) {
  const instance = modale({
    titre: 'Démanteler la machine',
    contenuHtml: '<p style="font-size:13px;color:var(--texte-2)">'
      + esc(machine.designation) + ' (' + esc(machine.code) + ') sortira '
      + 'définitivement du parc : plus aucun mouvement de fluide ne sera '
      + 'possible. Le fluide doit avoir été entièrement récupéré au '
      + 'préalable (mouvement « Récupération — démantèlement »).</p>',
    actionsHtml:
      '<button type="button" class="btn btn-secondaire" data-role="fermer">Annuler</button>'
      + '<button type="button" class="btn btn-danger-contour" data-role="confirmer">Démanteler</button>'
  });

  // La modale vient d'être injectée : on câble la dernière boîte ouverte
  const boites = document.querySelectorAll('.modale');
  const boite = boites[boites.length - 1];
  if (!boite) return;

  boite.querySelector('[data-role="fermer"]').addEventListener('click', instance.fermer);
  boite.querySelector('[data-role="confirmer"]').addEventListener('click', async function () {
    try {
      await ctx.store.demantelerMachine(machine.id, await operateurCourant(ctx));
      instance.fermer();
      toast('Machine ' + machine.code + ' démantelée.', 'succes');
      surSucces();
    } catch (erreur) {
      instance.fermer();
      toast(erreur && erreur.message ? erreur.message : 'Erreur inattendue.', 'erreur');
    }
  });
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * Rend la vue « Parc machines ».
 * @param {HTMLElement} conteneur — élément vidé d'avance par app.js
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const [machines, fluides, clients] = await Promise.all([
    ctx.store.getMachines(),
    ctx.store.getFluides(),
    ctx.store.getClients()
  ]);

  // Index de recherche : fluide par code, client par identifiant
  const fluideParCode = new Map(fluides.map(function (f) { return [f.code, f]; }));
  const clientParId = new Map(clients.map(function (c) { return [c.id, c]; }));

  // IM-4 : le compteur d'en-tête ne compte que les machines en service
  const enService = machines.filter(function (m) {
    return m.statut !== 'ARRETEE' && m.statut !== 'DEMANTELEE';
  }).length;
  const pluriel = enService > 1 ? 's' : '';
  const plurielSuivi = machines.length > 1 ? 's' : '';
  const sousTitre = enService + ' équipement' + pluriel + ' en service sur '
    + machines.length + ' suivi' + plurielSuivi + ' — charge, fluide, contrôles';

  const cartes = machines.length
    ? '<div class="grille-2">'
      + machines.map(function (machine) {
          return carteMachine(machine, fluideParCode, clientParId);
        }).join('')
      + '</div>'
    : '<div class="carte"><div class="etat-vide">' + ICONES.machine
      + '<p>Aucune machine dans le parc pour le moment.</p></div></div>';

  conteneur.innerHTML = STYLES_VUE
    + enteteVue({
        titre: titre,
        sousTitre: sousTitre,
        actionsHtml: '<button id="bouton-ajouter-machine" class="btn btn-marine" type="button">'
          + ICONES.plus + '<span>Ajouter</span></button>'
      })
    + cartes;

  // Ajout d'une nouvelle machine : ré-affiche la vue si l'enregistrement a réussi
  conteneur.querySelector('#bouton-ajouter-machine').addEventListener('click', async function () {
    const enregistre = await ouvrirFormMachine(ctx);
    if (enregistre) render(conteneur, ctx);
  });

  // Modification d'une machine existante, une écoute par carte
  conteneur.querySelectorAll('[data-action="modifier-machine"]').forEach(function (bouton) {
    bouton.addEventListener('click', async function () {
      const enregistre = await ouvrirFormMachine(ctx, bouton.dataset.id);
      if (enregistre) render(conteneur, ctx);
    });
  });

  // Aperçu / impression de la plaque F-Gas, une écoute par carte
  conteneur.querySelectorAll('[data-action="plaque-machine"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      ouvrirPlaque(ctx, bouton.dataset.id);
    });
  });

  // V9.1 : ouverture de la fiche machine vivante, par son code_public
  conteneur.querySelectorAll('[data-action="ouvrir-fiche"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      const machine = machines.find(function (m) { return m.id === bouton.dataset.id; });
      if (machine && machine.codePublic) ctx.naviguer('m/' + machine.codePublic);
    });
  });

  // IM-4 : cycle de vie — l'index machine par id sert aux trois actions
  const machineParId = new Map(machines.map(function (m) { return [m.id, m]; }));
  const rafraichir = function () { render(conteneur, ctx); };

  // Mise à l'arrêt (la machine sort des compteurs « en service »)
  conteneur.querySelectorAll('[data-action="arreter-machine"]').forEach(function (bouton) {
    bouton.addEventListener('click', async function () {
      try {
        const machine = await ctx.store.arreterMachine(bouton.dataset.id, await operateurCourant(ctx));
        toast('Machine ' + machine.code + ' mise à l’arrêt.', 'succes');
        rafraichir();
      } catch (erreur) {
        toast(erreur && erreur.message ? erreur.message : 'Erreur inattendue.', 'erreur');
      }
    });
  });

  // Remise en service d'une machine à l'arrêt
  conteneur.querySelectorAll('[data-action="remettre-machine"]').forEach(function (bouton) {
    bouton.addEventListener('click', async function () {
      try {
        const machine = await ctx.store.remettreEnService(bouton.dataset.id, await operateurCourant(ctx));
        toast('Machine ' + machine.code + ' remise en service.', 'succes');
        rafraichir();
      } catch (erreur) {
        toast(erreur && erreur.message ? erreur.message : 'Erreur inattendue.', 'erreur');
      }
    });
  });

  // Démantèlement : définitif, donc confirmation préalable
  conteneur.querySelectorAll('[data-action="demanteler-machine"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      const machine = machineParId.get(bouton.dataset.id);
      if (machine) ouvrirConfirmationDemantelement(ctx, machine, rafraichir);
    });
  });
}
