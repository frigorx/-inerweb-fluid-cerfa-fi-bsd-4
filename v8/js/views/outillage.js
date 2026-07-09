// ============================================================
// inerWeb Fluide — vue « Outillage réglementaire » (Phase C)
// Grille de cartes outil : étalonnages et vérifications exigés
// par l'attestation de capacité (détecteurs, balance, stations,
// pompe à vide, EPI…). Statut recalculé depuis l'échéance.
// ============================================================

import { enteteVue, chipStatut, toast, ICONES, confirmer } from './communs.js';
import { esc, fmtDate } from '../core/utils.js';
import { ouvrirFormOutil } from '../modales/outil-form.js';
import { ouvrirEtiquetteOutil } from '../documents/etiquette-outil.js';

export const titre = 'Outillage réglementaire';

/* ============================================================
   Libellés français des types d'outillage
   ============================================================ */

export const LIBELLES_TYPE_OUTIL = {
  STATION_RECUPERATION: 'Station de récupération',
  STATION_CHARGE:       'Station de charge',
  BALANCE:              'Balance',
  DETECTEUR:            'Détecteur de fuite',
  POMPE_A_VIDE:         'Pompe à vide',
  MANIFOLD:             'Manifold',
  THERMOMETRE:          'Thermomètre',
  BOUTEILLE_RECUP:      'Bouteille de récupération',
  FLEXIBLE:             'Flexible',
  EPI:                  'Équipement de protection',
  AUTRE:                'Autre'
};

/** Libellé français d'un type d'outil (code brut si inconnu). */
function libelleType(typeOutil) {
  return LIBELLES_TYPE_OUTIL[typeOutil] || typeOutil || '—';
}

/* ============================================================
   Styles propres à la vue (classes préfixées « outil- »)
   ============================================================ */

const STYLES_VUE = `
<style>
  .carte-outil {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Ligne 1 : type en capitales espacées + chip de statut */
  .outil-entete {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .outil-type {
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--texte-3);
  }

  /* Marque + modèle en gras */
  .outil-titre {
    font-size: 14.5px;
    font-weight: 600;
    color: var(--texte);
    line-height: 1.35;
  }

  /* N° de série en mono */
  .outil-num-serie {
    font-family: var(--police-mono);
    font-size: 12.5px;
    color: var(--texte-3);
  }

  /* Site / atelier */
  .outil-site {
    font-size: 12.5px;
    color: var(--texte-2);
  }

  /* Précision / sensibilité (facultatif) */
  .outil-caracteristique {
    font-size: 12.5px;
    color: var(--texte-2);
  }

  /* Vérifié le … · Échéance … */
  .outil-echeances {
    font-size: 12.5px;
    color: var(--texte-3);
    padding-top: 10px;
    border-top: 1px solid var(--bordure-2);
  }

  .outil-echeance-ambre {
    color: var(--avert);
    font-weight: 600;
  }

  .outil-echeance-rouge {
    color: var(--danger);
    font-weight: 600;
  }

  /* Pied d'actions : Modifier + Réformer alignés à droite */
  .outil-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>`;

/* ============================================================
   Tri : EXPIRE d'abord, puis A_VERIFIER, puis CONFORME, puis
   HORS_SERVICE en dernier (peu importe le reste).
   ============================================================ */

const ORDRE_STATUT = { EXPIRE: 0, A_VERIFIER: 1, CONFORME: 2, HORS_SERVICE: 3 };

function comparerOutils(a, b) {
  const ordreA = ORDRE_STATUT[a.statut] ?? 9;
  const ordreB = ORDRE_STATUT[b.statut] ?? 9;
  if (ordreA !== ordreB) return ordreA - ordreB;
  return libelleType(a.typeOutil).localeCompare(libelleType(b.typeOutil), 'fr');
}

/* ============================================================
   Gabarit d'une carte outil
   ============================================================ */

/**
 * Rend la carte d'un outil.
 * @param {object} outil — outil du store (contrat Phase C)
 * @returns {string} HTML
 */
function carteOutil(outil) {
  const classeEcheance = outil.statut === 'EXPIRE'
    ? 'outil-echeance-rouge'
    : (outil.statut === 'A_VERIFIER' ? 'outil-echeance-ambre' : '');

  const marqueModele = [outil.marque, outil.modele].filter(Boolean).join(' ') || '—';

  const caracteristique = outil.typeOutil === 'BALANCE' && outil.precision
    ? '<p class="outil-caracteristique">Précision : ' + esc(outil.precision) + '</p>'
    : (outil.typeOutil === 'DETECTEUR' && outil.sensibilite
      ? '<p class="outil-caracteristique">Sensibilité : ' + esc(outil.sensibilite) + '</p>'
      : '');

  const dateVerif = outil.dateVerification || outil.dateEtalonnage;

  return '<article class="carte carte-outil">'

    + '<div class="outil-entete">'
    + '<span class="outil-type">' + esc(libelleType(outil.typeOutil)) + '</span>'
    + chipStatut(outil.statut)
    + '</div>'

    + '<h3 class="outil-titre">' + esc(marqueModele) + '</h3>'

    + (outil.numSerie ? '<p class="outil-num-serie">N° série ' + esc(outil.numSerie) + '</p>' : '')

    + (outil.siteAtelier ? '<p class="outil-site">' + esc(outil.siteAtelier) + '</p>' : '')

    + caracteristique

    + '<p class="outil-echeances">'
    + 'Vérifié le ' + esc(fmtDate(dateVerif))
    + ' · Échéance <span class="' + classeEcheance + '">' + esc(fmtDate(outil.prochaineEcheance)) + '</span>'
    + '</p>'

    + '<div class="outil-actions">'
    + (outil.codePublic
        ? '<button type="button" class="btn btn-contour btn-petit" data-action="ouvrir-fiche-outil" '
          + 'data-code="' + esc(outil.codePublic) + '">Ouvrir la fiche</button>'
        : '')
    + '<button type="button" class="btn btn-contour btn-petit" data-action="etiquette-outil" '
    + 'data-id="' + esc(outil.id) + '">Étiquette QR</button>'
    + '<button type="button" class="btn btn-contour btn-petit" data-action="modifier-outil" '
    + 'data-id="' + esc(outil.id) + '">Modifier</button>'
    + (outil.statut !== 'HORS_SERVICE'
      ? '<button type="button" class="btn btn-contour btn-petit" data-action="reformer-outil" '
        + 'data-id="' + esc(outil.id) + '" data-libelle="' + esc(marqueModele) + '">Réformer</button>'
      : '')
    + '</div>'

    + '</article>';
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * Rend la vue « Outillage réglementaire ».
 * @param {HTMLElement} conteneur — élément vidé d'avance par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const outillage = await ctx.store.getOutillage();

  const tries = outillage.slice().sort(comparerOutils);

  // Bandeau d'avertissement : reprend la même condition de blocage du mode
  // officiel que store.peutPasserEnOfficiel() (SPEC §7.2) pour la part
  // outillage — alerte dès qu'il MANQUE un détecteur ou une balance
  // CONFORME, pas seulement quand un outil est EXPIRE (un outil peut aussi
  // manquer, ou être A_VERIFIER/HORS_SERVICE, sans jamais être passé par
  // EXPIRE).
  const etatOfficiel = await ctx.store.peutPasserEnOfficiel();
  // Préfixes EXACTS des deux seuls motifs d'outillage (demo-store.js,
  // peutPasserEnOfficiel) — surtout pas de correspondance par sous-chaîne
  // sur « balance », qui capterait aussi « Écart de balance matière non
  // justifié : ... » (blocage inventaire, pas outillage).
  const motifsOutillage = etatOfficiel.motifs.filter(function (motif) {
    return motif.startsWith('Aucune balance conforme')
      || motif.startsWith('Aucun détecteur de fuite conforme');
  });
  const bandeau = motifsOutillage.length
    ? '<div class="bandeau-avertissement">' + ICONES.alerte
      + '<span>Le mode officiel est bloqué tant qu’un détecteur et une balance conformes '
      + 'ne sont pas disponibles.</span></div>'
    : '';

  const cartes = tries.length
    ? '<div class="grille-2">' + tries.map(carteOutil).join('') + '</div>'
    : '<div class="carte"><div class="etat-vide">' + ICONES.outillage
      + '<p>Aucun outil enregistré pour le moment.</p></div></div>';

  conteneur.innerHTML = STYLES_VUE
    + enteteVue({
        titre: titre,
        sousTitre: 'Moyens matériels exigés par l’attestation de capacité — '
          + 'étalonnages et vérifications',
        actionsHtml: '<button id="bouton-ajouter-outil" class="btn btn-marine" type="button">'
          + ICONES.plus + '<span>Ajouter</span></button>'
      })
    + bandeau
    + cartes;

  // Ajout d'un nouvel outil : ré-affiche la vue si l'enregistrement a réussi
  conteneur.querySelector('#bouton-ajouter-outil').addEventListener('click', async function () {
    const enregistre = await ouvrirFormOutil(ctx);
    if (enregistre) render(conteneur, ctx);
  });

  // Ouvrir la fiche vivante de l'outil (par son code_public)
  conteneur.querySelectorAll('[data-action="ouvrir-fiche-outil"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      ctx.naviguer('o/' + bouton.dataset.code);
    });
  });

  // Étiquette QR d'un outil (à coller dessus → sa fiche d'étalonnage)
  conteneur.querySelectorAll('[data-action="etiquette-outil"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      ouvrirEtiquetteOutil(ctx, bouton.dataset.id);
    });
  });

  // Modification d'un outil existant, une écoute par carte
  conteneur.querySelectorAll('[data-action="modifier-outil"]').forEach(function (bouton) {
    bouton.addEventListener('click', async function () {
      const enregistre = await ouvrirFormOutil(ctx, bouton.dataset.id);
      if (enregistre) render(conteneur, ctx);
    });
  });

  // Réforme d'un outil (hors service), avec confirmation
  conteneur.querySelectorAll('[data-action="reformer-outil"]').forEach(function (bouton) {
    bouton.addEventListener('click', async function () {
      const confirme = await confirmer({
        titre: 'Réformer l’outil',
        message: 'Réformer « ' + bouton.dataset.libelle + ' » ? '
          + 'L’outil passera hors service et ne pourra plus être utilisé pour une vérification.',
        libelleConfirmer: 'Réformer',
        danger: true
      });
      if (!confirme) return;
      try {
        const utilisateur = await ctx.store.getUtilisateurCourant();
        await ctx.store.reformerOutil(bouton.dataset.id, utilisateur.id);
        toast('Outil réformé.', 'succes');
        render(conteneur, ctx);
      } catch (erreur) {
        toast(erreur && erreur.message ? erreur.message : 'Réforme impossible.', 'erreur');
      }
    });
  });
}
