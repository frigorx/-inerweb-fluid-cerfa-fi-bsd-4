// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — vue « Fluides frigorigènes »
// Référentiel des gaz : famille, PRP réglementaire et sa source, fiche
// du cadre 7, statut réglementaire, impact, machines du parc concernées.
//
// P1-2 (23/07) : la vue n'est plus en lecture seule. Le référent
// administre son référentiel LUI-MÊME — ajout d'un gaz, correction d'un
// PRP, désactivation — sans passer par une migration, donc sans
// développeur. Les gestes d'écriture sont réservés au référent et à
// l'administrateur (D5 : un PRP pilote les tonnes équivalent CO₂, donc
// les seuils de contrôle, donc les obligations de l'établissement).
//
// Ce que l'écran ne fait PAS, et c'est voulu : toucher au passé. Le PRP
// d'une écriture validée est figé dans l'écriture elle-même (prpFige,
// dans son empreinte) — corriger le référentiel ne réécrit jamais un
// mouvement scellé ni un CERFA déjà émis.
// ============================================================

import { enteteVue, chipStatut, tableau, toast, ICONES } from './communs.js';
import { esc, fmtNombre } from '../core/utils.js';
import { ouvrirFormFluide } from '../modales/fluide-form.js';

export const titre = 'Fluides frigorigènes';

/** Rôles autorisés à administrer le référentiel (miroir ROLES_MUTATION). */
const ROLES_ADMIN_REFERENTIEL = ['REFERENT', 'ADMIN'];

const STYLES_VUE = `
<style>
  .fluides-barre {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }
  .fluides-inactifs {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    color: var(--texte-3);
    cursor: pointer;
    user-select: none;
  }
  .fluide-source {
    font-size: 11.5px;
    color: var(--texte-3);
    margin-top: 2px;
  }
  .fluide-vide { color: var(--texte-faible); }
  tr.fluide-inactif { opacity: 0.55; }
  .fluide-badge-inactif {
    display: inline-block;
    margin-left: 7px;
    font-size: 10px;
    letter-spacing: .03em;
    text-transform: uppercase;
    color: var(--texte-faible);
  }
  .fluides-note {
    margin: 0;
    padding: 11px 16px;
    border-top: 1px solid var(--bordure-2);
    font-size: 12px;
    color: var(--texte-3);
    line-height: 1.5;
  }
</style>`;

/** Chip de la catégorie du cadre 7 (ou repli explicite si non renseignée). */
function celluleCadre7(fluide) {
  if (fluide.categorieCadre7 == null || fluide.categorieCadre7 === '') {
    return '<span class="fluide-vide" title="Le moteur se replie sur le '
      + 'libellé de famille">non renseignée</span>';
  }
  const contenus = [];
  if (fluide.contientHfc) contenus.push('HFC');
  if (fluide.contientHfo) contenus.push('HFO');
  // Chip écrite à la main : chipStatut normaliserait « HFC » en « Hfc »
  // (sa règle de repli met en minuscules) — un sigle réglementaire
  // s'écrit en capitales.
  const teinte = fluide.categorieCadre7 === 'AUCUNE' ? 'chip-gris' : 'chip-bleu';
  return '<span class="chip ' + teinte + '">'
    + esc(fluide.categorieCadre7) + '</span>'
    + (contenus.length
      ? '<div class="fluide-source">contient ' + contenus.join(' + ') + '</div>'
      : '');
}

function ligneFluide(fluide, peutAdministrer) {
  const inactif = fluide.actif === false;
  const badge = inactif
    ? '<span class="fluide-badge-inactif">désactivé</span>' : '';
  // PRP : décimales ADAPTATIVES — depuis F-Gas III des PRP < 1 existent
  // (R-1234yf 0,501 · R-290 0,02) ; arrondis à 0 décimale ils affichaient
  // « 1 » et « 0 », factuellement faux (constat de revue du 16/07).
  const prp = fmtNombre(fluide.gwpAr4, fluide.gwpAr4 < 1 ? 3 : 0);

  const actions = peutAdministrer
    ? '<td class="align-droite">'
      + '<span style="display:inline-flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'
      + '<button type="button" class="btn btn-contour btn-petit" data-action="modifier" '
      + 'data-code="' + esc(fluide.code) + '">Modifier</button>'
      + '<button type="button" class="btn btn-contour btn-petit" '
      + 'data-action="' + (inactif ? 'reactiver' : 'desactiver') + '" '
      + 'data-code="' + esc(fluide.code) + '">'
      + (inactif ? 'Réactiver' : 'Désactiver') + '</button>'
      + '</span></td>'
    : '';

  return '<tr class="' + (inactif ? 'fluide-inactif' : '') + '">'
    + '<td class="cellule-mono"><strong style="color:var(--texte)">'
    + esc(fluide.code) + '</strong>' + badge + '</td>'
    + '<td>' + esc(fluide.famille) + '</td>'
    + '<td class="cellule-mono align-droite">' + esc(prp)
    + (fluide.sourcePrp
      ? '<div class="fluide-source">' + esc(fluide.sourcePrp) + '</div>'
      : '<div class="fluide-source fluide-vide">source non renseignée</div>')
    + '</td>'
    + '<td>' + celluleCadre7(fluide) + '</td>'
    + '<td>' + esc(fluide.classeSecurite || '—') + '</td>'
    + '<td>' + (fluide.impact ? chipStatut(fluide.impact)
      : '<span class="fluide-vide">—</span>') + '</td>'
    + '<td class="align-droite">' + esc(String(fluide.nbMachines ?? 0)) + '</td>'
    + actions
    + '</tr>';
}

/**
 * Rendu de la vue « Fluides frigorigènes ».
 * @param {HTMLElement} conteneur - élément vidé d'avance par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 * @param {{ avecInactifs?: boolean }} [options]
 */
export async function render(conteneur, ctx, options = {}) {
  const avecInactifs = Boolean(options.avecInactifs);
  const [tous, utilisateur] = await Promise.all([
    ctx.store.getFluides(),
    ctx.store.getUtilisateurCourant().catch(() => null)
  ]);

  // D5 : l'écriture au référentiel est réservée au référent et à
  // l'administrateur. La garde qui COMPTE est côté serveur
  // (ROLES_MUTATION) ; ici on évite seulement de proposer un geste qui
  // sera refusé. Le store de démo répond « référent » : la démo reste
  // pleinement utilisable pour préparer un référentiel.
  const peutAdministrer =
    ROLES_ADMIN_REFERENTIEL.includes(utilisateur?.roleApp);

  const visibles = avecInactifs ? tous : tous.filter((f) => f.actif !== false);
  const nbInactifs = tous.filter((f) => f.actif === false).length;
  const nbActifs = tous.length - nbInactifs;

  const colonnes = [
    { cle: 'fluide', libelle: 'Fluide' },
    { cle: 'famille', libelle: 'Famille' },
    { cle: 'gwp', libelle: 'PRP réglementaire', align: 'droite' },
    { cle: 'cadre7', libelle: 'Fiche cadre 7' },
    { cle: 'classe', libelle: 'Sécurité' },
    { cle: 'impact', libelle: 'Impact' },
    { cle: 'machines', libelle: 'Machines', align: 'droite' }
  ];
  if (peutAdministrer) colonnes.push({ cle: 'actions', libelle: '', align: 'droite' });

  const corpsVue = visibles.length
    ? tableau({
        colonnes,
        lignesHtml: visibles.map((f) => ligneFluide(f, peutAdministrer))
      })
    : '<div class="carte"><div class="etat-vide">' + ICONES.flocon
      + '<p>Aucun fluide référencé.</p></div></div>';

  const caseInactifs = nbInactifs
    ? '<label class="fluides-inactifs">'
      + '<input type="checkbox" id="fluides-voir-inactifs"'
      + (avecInactifs ? ' checked' : '') + '>'
      + 'Afficher les fluides désactivés (' + nbInactifs + ')</label>'
    : '';

  conteneur.innerHTML = STYLES_VUE
    + enteteVue({
        titre,
        sousTitre: nbActifs + ' fluide' + (nbActifs > 1 ? 's' : '')
          + ' au référentiel'
          + (nbInactifs ? ' · ' + nbInactifs + ' désactivé'
            + (nbInactifs > 1 ? 's' : '') : '')
          + ' — famille, potentiel de réchauffement et fiche du cadre 7',
        actionsHtml: peutAdministrer
          ? '<button id="fluides-ajouter" class="btn btn-marine" type="button">'
            + ICONES.plus + '<span>Ajouter un fluide</span></button>'
          : ''
      })
    + (caseInactifs ? '<div class="fluides-barre">' + caseInactifs + '</div>' : '')
    + corpsVue;

  // Note réglementaire en bas de carte. Absente si le référentiel est vide.
  const carte = conteneur.querySelector('.tableau-defilement');
  if (carte) {
    carte.insertAdjacentHTML('beforeend',
      '<p class="fluides-note">'
      + 'PRP utilisé par le moteur pour le calcul des tonnes équivalent '
      + 'CO&#8322; (réglementation F-Gas) et l’impact affiché. Le PRP d’une '
      + 'écriture déjà validée est FIGÉ dans cette écriture : modifier le '
      + 'référentiel ne retouche jamais un mouvement scellé ni un CERFA '
      + 'déjà émis.'
      + '</p>');
  }

  if (!peutAdministrer) return;

  const rafraichir = function () { render(conteneur, ctx, { avecInactifs }); };
  const parCode = new Map(tous.map((f) => [f.code, f]));

  const caseVoir = conteneur.querySelector('#fluides-voir-inactifs');
  if (caseVoir) {
    caseVoir.addEventListener('change', function () {
      render(conteneur, ctx, { avecInactifs: caseVoir.checked });
    });
  }

  const boutonAjouter = conteneur.querySelector('#fluides-ajouter');
  if (boutonAjouter) {
    boutonAjouter.addEventListener('click', async function () {
      const enregistre = await ouvrirFormFluide(ctx, null);
      if (enregistre) rafraichir();
    });
  }

  conteneur.querySelectorAll('[data-action="modifier"]').forEach(function (bouton) {
    bouton.addEventListener('click', async function () {
      const fluide = parCode.get(bouton.dataset.code);
      if (!fluide) return;
      const enregistre = await ouvrirFormFluide(ctx, fluide);
      if (enregistre) rafraichir();
    });
  });

  // Désactivation / réactivation : jamais de suppression — le code d'un
  // fluide est référencé par les machines, les bouteilles et les
  // écritures scellées.
  conteneur.querySelectorAll('[data-action="desactiver"], [data-action="reactiver"]')
    .forEach(function (bouton) {
      bouton.addEventListener('click', async function () {
        const actif = bouton.dataset.action === 'reactiver';
        try {
          await ctx.store.updateFluide(bouton.dataset.code, { actif });
          toast(actif ? 'Fluide réactivé.' : 'Fluide désactivé.', 'succes');
          rafraichir();
        } catch (erreur) {
          toast(erreur && erreur.message ? erreur.message
            : 'Erreur inattendue.', 'erreur');
        }
      });
    });
}
