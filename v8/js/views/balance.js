// ============================================================
// inerWeb Fluide — vue « Balance matière » (Phase C)
// Cœur de l'audit F-Gas : bilan matière annuel par fluide.
// Stock début + achats + récupérations − charges − cessions
// − retours fournisseur − destructions = stock théorique fin,
// comparé au stock réel pesé au 31/12 (inventaire physique).
// Écarts : verts si nuls, rouges si non justifiés, ambre sinon.
// Données : store.getBalanceMatiere / saisirInventaire / justifierEcart.
// ============================================================

import { enteteVue, tableau, toast, modale, ICONES } from './communs.js';
import { esc, fmtNombre } from '../core/utils.js';

export const titre = 'Balance matière';

// Années proposées dans le sélecteur (monde de démo : 2026 uniquement)
const ANNEES = [2026];
const ANNEE_PAR_DEFAUT = 2026;

// Tolérance de pesée : au-delà, l'écart doit être justifié (SPEC §6)
const SEUIL_ECART_KG = 0.01;

// Colonnes numériques sommées dans la ligne de pied (hors réel/écart)
const COLONNES_SOMMEES = [
  'stockInitialNeufKg', 'stockInitialRecupKg', 'achatsKg', 'recuperationsKg',
  'chargesKg', 'cessionsKg', 'retoursFournisseurKg', 'destructionsKg',
  'stockTheoriqueKg'
];

/* ============================================================
   Styles propres à la vue — préfixés .vue-balance.
   ============================================================ */

const STYLES_VUE = `
<style>
  .vue-balance .encart-aide { margin-bottom: 18px; }

  /* Sélecteur d'année dans les actions d'entête (même gabarit que le bilan) */
  .vue-balance .selecteur-annee {
    padding: 8px 12px;
    border: 1px solid var(--bordure);
    border-radius: var(--rayon-bouton);
    background: var(--carte);
    color: var(--texte-2);
    font-size: 13.5px;
    font-weight: 600;
    box-shadow: var(--ombre-douce);
    cursor: pointer;
  }

  /* Code fluide : mono gras */
  .vue-balance .balance-fluide {
    font-family: var(--police-mono);
    font-weight: 600;
    color: var(--texte);
  }

  /* Stock théorique mis en avant */
  .vue-balance .balance-theorique { font-weight: 700; }

  /* Ligne de pied : totaux tous fluides */
  .vue-balance .ligne-totaux td {
    border-top: 2px solid var(--bordure);
    background: var(--fond-2);
    font-weight: 700;
  }
</style>`;

/* ============================================================
   Aides de mise en forme
   ============================================================ */

/**
 * Nombre à 2 décimales, ou « — » si la valeur est absente (null).
 * @param {number|null} n
 * @returns {string}
 */
function nombreOuTiret(n) {
  return (n === null || n === undefined) ? '—' : fmtNombre(n, 2);
}

/**
 * Écart signé à 2 décimales : « +0,30 », « −0,15 », « 0,00 ».
 * @param {number} n
 * @returns {string}
 */
function fmtEcart(n) {
  const signe = n > 0 ? '+' : (n < 0 ? '−' : '');
  return signe + fmtNombre(Math.abs(n), 2);
}

/**
 * Classe CSS de la cellule d'écart selon la situation :
 * nul (tolérance) → vert ; justifié → ambre ; sinon → rouge gras.
 * @param {{ ecartKg: number|null, justification: string|null }} ligne
 * @returns {string} '' si l'inventaire n'est pas saisi
 */
function classeEcart(ligne) {
  if (ligne.ecartKg === null) return '';
  if (Math.abs(ligne.ecartKg) <= SEUIL_ECART_KG) return 'ecart-nul';
  return ligne.justification ? 'ecart-justifie' : 'ecart-non-justifie';
}

/**
 * Une ligne a-t-elle une activité à afficher ? (mouvement, stock,
 * achat, destruction ou inventaire saisi sur l'année)
 * @param {object} ligne
 * @returns {boolean}
 */
function ligneActive(ligne) {
  return COLONNES_SOMMEES.some((cle) => Number(ligne[cle]) !== 0)
    || ligne.stockReelKg !== null;
}

/* ============================================================
   Gabarits HTML
   ============================================================ */

/** Actions d'entête : année, saisie d'inventaire (marine), impression. */
function actionsEntete(annee) {
  const options = ANNEES.map((a) =>
    `<option value="${a}"${a === annee ? ' selected' : ''}>${a}</option>`
  ).join('');

  return `<select id="selecteur-annee" class="selecteur-annee no-print" aria-label="Année de la balance">${options}</select>`
    + `<button type="button" id="btn-inventaire" class="btn btn-marine no-print">${ICONES.coche}<span>Saisir l’inventaire au 31/12</span></button>`
    + `<button type="button" id="btn-imprimer" class="btn btn-secondaire no-print">${ICONES.imprimer}Imprimer</button>`;
}

/** Encart pédagogique : la formule de la balance matière. */
function encartFormule() {
  return '<div class="encart-aide">'
    + '<strong>La formule de la balance matière :</strong> '
    + 'Stock début + achats + récupérations − charges − cessions '
    + '− retours fournisseur − destructions/régénérations = stock théorique fin, '
    + 'comparé au stock réel pesé au 31/12.'
    + '</div>';
}

/** Cellule numérique alignée à droite (mono). */
function cellule(valeurHtml, classes = '') {
  return `<td class="nombre align-droite${classes ? ' ' + classes : ''}">${valeurHtml}</td>`;
}

/** Tableau de la balance : une ligne par fluide avec activité + totaux. */
function tableauBalance(balance) {
  const colonnes = [
    { cle: 'fluide',       libelle: 'Fluide' },
    { cle: 'initNeuf',     libelle: 'Stock initial neuf',   align: 'droite' },
    { cle: 'initRecup',    libelle: 'Stock initial récup',  align: 'droite' },
    { cle: 'achats',       libelle: 'Achats',               align: 'droite' },
    { cle: 'recupere',     libelle: 'Récupéré',             align: 'droite' },
    { cle: 'charge',       libelle: 'Chargé',               align: 'droite' },
    { cle: 'cessions',     libelle: 'Cessions',             align: 'droite' },
    { cle: 'retours',      libelle: 'Retours',              align: 'droite' },
    { cle: 'detruit',      libelle: 'Détruit-régénéré',     align: 'droite' },
    { cle: 'theorique',    libelle: 'Stock théorique',      align: 'droite' },
    { cle: 'reel',         libelle: 'Stock réel',           align: 'droite' },
    { cle: 'ecart',        libelle: 'Écart',                align: 'droite' }
  ];

  const lignes = balance.lignes.filter(ligneActive);

  const lignesHtml = lignes.map((l) => {
    const classe = classeEcart(l);
    const infobulle = (classe === 'ecart-justifie' && l.justification)
      ? ` title="${esc(l.justification)}"` : '';
    const ecartHtml = l.ecartKg === null ? '—' : esc(fmtEcart(l.ecartKg));
    return '<tr>'
      + `<td class="balance-fluide">${esc(l.fluide)}</td>`
      + cellule(esc(fmtNombre(l.stockInitialNeufKg, 2)))
      + cellule(esc(fmtNombre(l.stockInitialRecupKg, 2)))
      + cellule(esc(fmtNombre(l.achatsKg, 2)))
      + cellule(esc(fmtNombre(l.recuperationsKg, 2)))
      + cellule(esc(fmtNombre(l.chargesKg, 2)))
      + cellule(esc(fmtNombre(l.cessionsKg, 2)))
      + cellule(esc(fmtNombre(l.retoursFournisseurKg, 2)))
      + cellule(esc(fmtNombre(l.destructionsKg, 2)))
      + cellule(esc(fmtNombre(l.stockTheoriqueKg, 2)), 'balance-theorique')
      + cellule(esc(nombreOuTiret(l.stockReelKg)))
      + `<td class="nombre align-droite ${classe}"${infobulle}>${ecartHtml}</td>`
      + '</tr>';
  });

  // Ligne de pied : totaux tous fluides (kg). Réel et écart ne sont
  // sommés que sur les lignes dont l'inventaire est saisi.
  if (lignes.length) {
    const totaux = {};
    for (const cle of COLONNES_SOMMEES) {
      totaux[cle] = lignes.reduce((somme, l) => somme + Number(l[cle] || 0), 0);
    }
    const lignesInventoriees = lignes.filter((l) => l.stockReelKg !== null);
    const totalReel = lignesInventoriees.length
      ? lignesInventoriees.reduce((somme, l) => somme + l.stockReelKg, 0)
      : null;
    const totalEcart = lignesInventoriees.length
      ? lignesInventoriees.reduce((somme, l) => somme + l.ecartKg, 0)
      : null;

    lignesHtml.push('<tr class="ligne-totaux">'
      + '<td>Total (kg)</td>'
      + COLONNES_SOMMEES.map((cle) => cellule(esc(fmtNombre(totaux[cle], 2)),
        cle === 'stockTheoriqueKg' ? 'balance-theorique' : '')).join('')
      + cellule(esc(nombreOuTiret(totalReel)))
      + cellule(totalEcart === null ? '—' : esc(fmtEcart(totalEcart)))
      + '</tr>');
  }

  return '<div class="tableau-balance">' + tableau({ colonnes, lignesHtml }) + '</div>';
}

/** Page complète de la vue pour une balance donnée. */
function construireHtml(balance) {
  return '<div class="vue-balance anim-fade">'
    + STYLES_VUE
    + enteteVue({
      titre: 'Balance matière annuelle',
      sousTitre: 'Bilan matière par fluide — stock théorique, inventaire physique et écarts',
      actionsHtml: actionsEntete(balance.annee)
    })
    + encartFormule()
    + tableauBalance(balance)
    + '</div>';
}

/* ============================================================
   Modale « Saisir l'inventaire au 31/12 »
   ============================================================ */

/**
 * Ouvre la modale de saisie de l'inventaire physique : un champ kg
 * par fluide (prérempli avec le stock théorique) + opérateur.
 * Après enregistrement, enchaîne sur la justification des écarts.
 * @param {{ store: object }} ctx
 * @param {object} balance - balance courante (lignes actives incluses)
 * @param {() => Promise<void>} rafraichir - re-rendu de la vue
 */
async function ouvrirModaleInventaire(ctx, balance, rafraichir) {
  const lignes = balance.lignes.filter(ligneActive);
  if (!lignes.length) {
    toast('Aucun fluide avec activité : rien à inventorier.', 'erreur');
    return;
  }

  const personnel = await ctx.store.getPersonnel();
  const operateursActifs = personnel.filter((p) => p.actif);

  const optionsOperateurs = operateursActifs.map((p) =>
    '<option value="' + esc(p.id) + '">' + esc(p.prenom) + ' ' + esc(p.nom) + '</option>'
  ).join('');

  const champsFluides = lignes.map((l, i) =>
    '<div class="champ">'
    + '<label for="inv-fluide-' + i + '">' + esc(l.fluide)
    + ' <span style="font-weight:400;text-transform:none;letter-spacing:normal">'
    + '(théorique : ' + esc(fmtNombre(l.stockTheoriqueKg, 2)) + ' kg)</span></label>'
    + '<div class="champ-unite" data-unite="kg">'
    + '<input type="number" id="inv-fluide-' + i + '" data-fluide="' + esc(l.fluide) + '"'
    + ' min="0" step="0.01" inputmode="decimal" required'
    + ' value="' + esc(String(l.stockTheoriqueKg)) + '">'
    + '</div>'
    + '</div>'
  ).join('');

  const contenuHtml = ''
    + '<form class="formulaire" id="form-inventaire" novalidate>'
    + '<div id="zone-erreur-inventaire"></div>'
    + '<p style="font-size:13px;color:var(--texte-2);margin:0 0 4px">'
    + 'Pesez chaque stock au 31/12 (bouteilles neuves et de récupération '
    + 'confondues) et reportez les masses ci-dessous.</p>'
    + '<div class="grille-form-2">' + champsFluides + '</div>'
    + '<div class="champ">'
    + '<label for="inv-operateur">Opérateur *</label>'
    + '<select id="inv-operateur" required>'
    + '<option value="">— Choisir un opérateur —</option>'
    + optionsOperateurs
    + '</select>'
    + '</div>'
    + '</form>';

  const actionsHtml = ''
    + '<button type="button" class="btn btn-contour" data-action="annuler">Annuler</button>'
    + '<button type="submit" form="form-inventaire" class="btn btn-marine">'
    + ICONES.coche + '<span>Enregistrer l’inventaire</span></button>';

  const instance = modale({
    titre: 'Saisir l’inventaire au 31/12',
    contenuHtml,
    actionsHtml
  });

  const racine = document.getElementById('zone-modales') || document.body;
  const form = racine.querySelector('#form-inventaire');
  const zoneErreur = racine.querySelector('#zone-erreur-inventaire');

  function afficherErreur(message) {
    zoneErreur.innerHTML = '<div class="bandeau-erreur">' + ICONES.alerte
      + '<span>' + esc(message) + '</span></div>';
  }

  racine.querySelector('[data-action="annuler"]').addEventListener('click', () => {
    instance.fermer();
  });

  form.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    zoneErreur.innerHTML = '';

    const selectOperateur = form.querySelector('#inv-operateur');
    const operateurId = selectOperateur.value;
    if (!operateurId) {
      afficherErreur('Veuillez choisir un opérateur.');
      return;
    }
    const operateurChoisi = operateursActifs.find((p) => p.id === operateurId);
    const operateur = operateurChoisi
      ? operateurChoisi.prenom + ' ' + operateurChoisi.nom
      : operateurId;

    // Lecture des masses pesées, une par fluide
    const saisies = [];
    for (const champ of form.querySelectorAll('input[data-fluide]')) {
      const valeur = Number(champ.value);
      if (!Number.isFinite(valeur) || valeur < 0) {
        afficherErreur('Stock réel invalide pour '
          + champ.getAttribute('data-fluide') + ' (en kg, positif ou nul).');
        return;
      }
      saisies.push({ fluide: champ.getAttribute('data-fluide'), stockReelKg: valeur });
    }

    try {
      const nouvelleBalance = await ctx.store.saisirInventaire(
        balance.annee, saisies, operateur);
      toast('Inventaire ' + balance.annee + ' enregistré ('
        + saisies.length + ' fluide(s) pesé(s)).', 'succes');
      instance.fermer();
      await rafraichir();

      // Écarts au-delà de la tolérance et non justifiés → justification
      const enEcart = nouvelleBalance.lignes.filter((l) =>
        l.ecartKg !== null && Math.abs(l.ecartKg) > SEUIL_ECART_KG && !l.justification);
      if (enEcart.length) {
        ouvrirModaleJustification(ctx, nouvelleBalance.annee, enEcart, rafraichir);
      }
    } catch (erreur) {
      afficherErreur(erreur.message || 'Impossible d’enregistrer cet inventaire.');
    }
  });
}

/* ============================================================
   Modale « Justification des écarts »
   ============================================================ */

/**
 * Ouvre la modale de justification : un champ texte OBLIGATOIRE
 * par fluide en écart. Un écart non justifié = alerte critique.
 * @param {{ store: object }} ctx
 * @param {number} annee
 * @param {object[]} lignesEnEcart - lignes de balance en écart non justifié
 * @param {() => Promise<void>} rafraichir - re-rendu de la vue
 */
function ouvrirModaleJustification(ctx, annee, lignesEnEcart, rafraichir) {
  const champs = lignesEnEcart.map((l, i) =>
    '<div class="champ">'
    + '<label for="just-fluide-' + i + '">' + esc(l.fluide)
    + ' <span style="font-weight:400;text-transform:none;letter-spacing:normal">'
    + '(écart : ' + esc(fmtEcart(l.ecartKg)) + ' kg)</span></label>'
    + '<input type="text" id="just-fluide-' + i + '" data-fluide="' + esc(l.fluide) + '"'
    + ' required placeholder="Ex. : fuite constatée sur le banc n° 2, purge accidentelle…">'
    + '</div>'
  ).join('');

  const contenuHtml = ''
    + '<form class="formulaire" id="form-justification" novalidate>'
    + '<div id="zone-erreur-justification"></div>'
    + '<div class="bandeau-avertissement">' + ICONES.alerte
    + '<span>Des écarts dépassent la tolérance de '
    + esc(fmtNombre(SEUIL_ECART_KG, 2)) + ' kg. Chaque écart doit être justifié : '
    + 'un écart non justifié déclenche une alerte critique et bloque le mode officiel.</span>'
    + '</div>'
    + champs
    + '</form>';

  const actionsHtml = ''
    + '<button type="button" class="btn btn-contour" data-action="plus-tard">Plus tard</button>'
    + '<button type="submit" form="form-justification" class="btn btn-marine">'
    + ICONES.coche + '<span>Justifier les écarts</span></button>';

  const instance = modale({
    titre: 'Justification des écarts',
    contenuHtml,
    actionsHtml
  });

  const racine = document.getElementById('zone-modales') || document.body;
  const form = racine.querySelector('#form-justification');
  const zoneErreur = racine.querySelector('#zone-erreur-justification');

  function afficherErreur(message) {
    zoneErreur.innerHTML = '<div class="bandeau-erreur">' + ICONES.alerte
      + '<span>' + esc(message) + '</span></div>';
  }

  racine.querySelector('[data-action="plus-tard"]').addEventListener('click', () => {
    instance.fermer();
    toast('Écarts non justifiés : une alerte critique reste active.', 'info');
  });

  form.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    zoneErreur.innerHTML = '';

    // Toutes les justifications sont obligatoires avant l'envoi
    const saisies = [];
    for (const champ of form.querySelectorAll('input[data-fluide]')) {
      const texte = champ.value.trim();
      if (!texte) {
        afficherErreur('Justification obligatoire pour '
          + champ.getAttribute('data-fluide') + '.');
        champ.focus();
        return;
      }
      saisies.push({ fluide: champ.getAttribute('data-fluide'), texte });
    }

    try {
      for (const s of saisies) {
        await ctx.store.justifierEcart(annee, s.fluide, s.texte);
      }
      toast(saisies.length + ' écart(s) justifié(s) pour ' + annee + '.', 'succes');
      instance.fermer();
      await rafraichir();
    } catch (erreur) {
      afficherErreur(erreur.message || 'Impossible d’enregistrer ces justifications.');
    }
  });
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * Rendu de la vue « Balance matière ».
 * @param {HTMLElement} conteneur - élément déjà vidé par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  let balanceCourante = null;

  /** Charge la balance de l'année demandée, rend la page, branche tout. */
  async function chargerEtAfficher(annee) {
    balanceCourante = await ctx.store.getBalanceMatiere(annee);
    conteneur.innerHTML = construireHtml(balanceCourante);
    attacherEcouteurs();
  }

  /** Branche sélecteur d'année, saisie d'inventaire et impression. */
  function attacherEcouteurs() {
    const selecteur = conteneur.querySelector('#selecteur-annee');
    const boutonInventaire = conteneur.querySelector('#btn-inventaire');
    const boutonImprimer = conteneur.querySelector('#btn-imprimer');

    selecteur.addEventListener('change', () => {
      chargerEtAfficher(Number(selecteur.value));
    });

    boutonInventaire.addEventListener('click', () => {
      ouvrirModaleInventaire(ctx, balanceCourante,
        () => chargerEtAfficher(balanceCourante.annee));
    });

    boutonImprimer.addEventListener('click', () => {
      window.print();
    });
  }

  await chargerEtAfficher(ANNEE_PAR_DEFAUT);
}
