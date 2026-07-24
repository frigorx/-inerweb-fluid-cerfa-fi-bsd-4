// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — vue « Registre du personnel » (Phase C)
// Attestations d'aptitude, catégories 2008/2025 et activités
// autorisées de chaque personne. Registre exigé pour l'audit
// (SPEC-V8 §5.2). Distinct de l'attestation de CAPACITÉ, qui
// concerne l'établissement (voir Administration).
// ============================================================

import { enteteVue, chipStatut, tableau, ICONES } from './communs.js';
import { esc, fmtDate } from '../core/utils.js';
import { ouvrirFormPersonne } from '../modales/personne-form.js';
import { ouvrirHabilitations } from '../modales/habilitations-modal.js';

export const titre = 'Registre du personnel';

/* ============================================================
   Styles propres à la vue (préfixés .vue-personnel)
   ============================================================ */

const STYLES_VUE = `
<style>
  .vue-personnel .ligne-inactive { opacity: .55; }

  .personnel-nom {
    font-weight: 600;
    color: var(--texte);
  }

  .personnel-nom-secondaire {
    font-weight: 400;
  }

  .personnel-cat-echue {
    color: var(--danger);
    font-weight: 700;
  }

  .personnel-cat-proche {
    color: var(--avert);
    font-weight: 600;
  }

  .pastille-actif,
  .pastille-inactif {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex: none;
  }

  .pastille-actif { background: var(--succes); }
  .pastille-inactif { background: var(--texte-faible); }

  /* Chip « marine clair » (Salarié) — même teinte que la vue Administration */
  .vue-personnel .chip-marine-clair { background: #e2eaf3; color: var(--marine-800); }

  /* Cellule d'actions : boutons alignés à droite, compteur d'habilitations */
  .vue-personnel .personnel-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }

  .vue-personnel .personnel-hab-compteur,
  .vue-personnel .personnel-men-compteur {
    min-width: 18px;
    text-align: center;
  }
</style>`;

/* ============================================================
   Chips de statut (type de personne) — teintes de la charte
   ============================================================ */

const CHIPS_TYPE_PERSONNE = {
  ENSEIGNANT:      { libelle: 'Enseignant',      classe: 'chip-teal' },
  ELEVE:           { libelle: 'Élève',           classe: 'chip-gris' },
  SALARIE:         { libelle: 'Salarié',         classe: 'chip-marine-clair' },
  SOUS_TRAITANT:   { libelle: 'Sous-traitant',   classe: 'chip-ambre' },
  INTERVENANT_EXT: { libelle: 'Intervenant ext.', classe: 'chip-ambre' }
};

function chipTypePersonne(typePersonne) {
  const info = CHIPS_TYPE_PERSONNE[typePersonne] || { libelle: typePersonne || '—', classe: 'chip-gris' };
  return '<span class="chip ' + info.classe + '">' + esc(info.libelle) + '</span>';
}

/** Nombre de jours entre aujourd'hui et une date ISO (négatif si passée). */
function joursRestants(iso) {
  if (!iso) return null;
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  const cible = new Date(iso);
  if (Number.isNaN(cible.getTime())) return null;
  cible.setHours(0, 0, 0, 0);
  return Math.round((cible - auj) / (1000 * 60 * 60 * 24));
}

/** Cellule de validité : rouge gras si échue, ambre si à moins de 90 jours. */
function celluleValidite(dateFinValidite) {
  if (!dateFinValidite) return '<td class="align-centre">—</td>';
  const jours = joursRestants(dateFinValidite);
  const texte = esc(fmtDate(dateFinValidite));
  if (jours !== null && jours < 0) {
    return '<td class="align-centre personnel-cat-echue">' + texte + '</td>';
  }
  if (jours !== null && jours < 90) {
    return '<td class="align-centre personnel-cat-proche">' + texte + '</td>';
  }
  return '<td class="align-centre">' + texte + '</td>';
}

/** Cellule catégorie (2008 ou 2025) : « — » si absente. */
function celluleCategorie(valeur) {
  return '<td class="align-centre">' + (valeur ? esc(valeur) : '—') + '</td>';
}

/**
 * Chip « Rôle appli » : chipStatut (communs.js) fait retomber la clé
 * ELEVE sur l'entrée GWP « Élevé » (collision de clés) ; on couvre donc
 * localement les rôles applicatifs, et on délègue le reste tel quel.
 */
function chipRoleApp(roleApp) {
  if (roleApp === 'ELEVE') return '<span class="chip chip-orange">Élève</span>';
  if (roleApp === 'TECHNICIEN') return '<span class="chip chip-violet">Technicien</span>';
  return chipStatut(roleApp);
}

/** Ligne de tableau pour une personne du registre. */
function lignePersonne(personne, nbHabilitationsActives, nbMentionsActives,
  auCoffre = false) {
  const estEleve = personne.typePersonne === 'ELEVE';
  // Lot E2 : badge « au coffre » — la fiche vivante porte déjà le pseudonyme.
  const badgeCoffre = auCoffre
    ? ' <span class="chip chip-violet" title="Identité au coffre (Protection des données)">au coffre</span>'
    : '';
  const nomComplet = esc(personne.prenom) + ' <span class="personnel-nom-secondaire">'
    + esc(personne.nom) + '</span>' + badgeCoffre;
  const numAptitude = (!estEleve && personne.numAttestationAptitude)
    ? '<span class="mono">' + esc(personne.numAttestationAptitude) + '</span>'
    : '—';

  const classeLigne = personne.actif ? '' : ' class="ligne-inactive"';
  const pastille = personne.actif
    ? '<span class="pastille-actif" title="Actif"></span><span class="sr-uniquement">Actif</span>'
    : '<span class="pastille-inactif" title="Inactif"></span><span class="sr-uniquement">Inactif</span>';

  // Compteur d'habilitations F-Gas actives (chip discrète, masquée si aucune)
  const compteurHab = nbHabilitationsActives > 0
    ? '<span class="chip chip-teal personnel-hab-compteur" '
      + 'title="Habilitations F-Gas actives">' + esc(nbHabilitationsActives) + '</span>'
    : '';

  // Compteur de mentions de formation complémentaire actives (même logique)
  const compteurMentions = nbMentionsActives > 0
    ? '<span class="chip chip-bleu personnel-men-compteur" '
      + 'title="Mentions de formation complémentaire actives">' + esc(nbMentionsActives) + '</span>'
    : '';

  return '<tr' + classeLigne + '>'
    + '<td><span class="personnel-nom">' + nomComplet + '</span></td>'
    + '<td>' + chipTypePersonne(personne.typePersonne) + '</td>'
    + '<td>' + chipRoleApp(personne.roleApp) + '</td>'
    + '<td>' + numAptitude + '</td>'
    + celluleCategorie(personne.categorie2008)
    + celluleCategorie(personne.categorie2025)
    + (estEleve ? '<td class="align-centre">—</td>' : celluleValidite(personne.dateFinValidite))
    + '<td class="align-centre">' + pastille + '</td>'
    + '<td class="align-droite">'
    + '<div class="personnel-actions">'
    + compteurHab
    + compteurMentions
    + '<button type="button" class="btn btn-contour btn-petit" data-action="habilitations-personne" '
    + 'data-id="' + esc(personne.id) + '" aria-label="Habilitations de ' + esc(personne.prenom) + ' ' + esc(personne.nom) + '">'
    + 'Habilitations</button>'
    + '<button type="button" class="btn btn-contour btn-petit" data-action="modifier-personne" '
    + 'data-id="' + esc(personne.id) + '" aria-label="Modifier ' + esc(personne.prenom) + ' ' + esc(personne.nom) + '">'
    + 'Modifier</button>'
    + '</div>'
    + '</td>'
    + '</tr>';
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * Rend la vue « Registre du personnel ».
 * @param {HTMLElement} conteneur — élément vidé d'avance par app.js
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const personnel = await ctx.store.getPersonnel();

  // Nombre d'habilitations F-Gas ACTIVES par personne (lues une seule fois).
  const habilitations = await ctx.store.getHabilitations();
  const nbHabActivesParPersonne = new Map();
  habilitations.forEach((h) => {
    if (!h.actif) return;
    nbHabActivesParPersonne.set(h.personneId, (nbHabActivesParPersonne.get(h.personneId) || 0) + 1);
  });

  // Même mécanique pour les mentions de formation complémentaire ACTIVES.
  const mentions = await ctx.store.getMentions();
  const nbMentionsActivesParPersonne = new Map();
  mentions.forEach((m) => {
    if (!m.actif) return;
    nbMentionsActivesParPersonne.set(m.personneId, (nbMentionsActivesParPersonne.get(m.personneId) || 0) + 1);
  });

  // Lot E2 : identités au coffre (badge) — état inaccessible (rôle) toléré.
  let idsAuCoffre = new Set();
  if (typeof ctx.store.etatCoffre === 'function') {
    try {
      const etatCoffre = await ctx.store.etatCoffre();
      idsAuCoffre = new Set(etatCoffre.identites.map((i) => i.personnelId));
    } catch {
      // Rôle insuffisant : pas de badge, la vue reste entière.
    }
  }

  // Actifs d'abord (ordre alphabétique), inactifs grisés en fin de liste
  const tries = [...personnel].sort((a, b) => {
    if (a.actif !== b.actif) return a.actif ? -1 : 1;
    return (a.nom + a.prenom).localeCompare(b.nom + b.prenom, 'fr');
  });

  const sousTitre = "Attestations d'aptitude, catégories et activités autorisées"
    + ' — registre exigé pour l’audit';

  const lignesHtml = tries.map((personne) =>
    lignePersonne(
      personne,
      nbHabActivesParPersonne.get(personne.id) || 0,
      nbMentionsActivesParPersonne.get(personne.id) || 0,
      idsAuCoffre.has(personne.id)));

  const contenuTableau = tableau({
    colonnes: [
      { cle: 'nom', libelle: 'Nom' },
      { cle: 'statut', libelle: 'Statut' },
      { cle: 'roleApp', libelle: 'Rôle appli' },
      { cle: 'numAptitude', libelle: 'N° aptitude' },
      { cle: 'cat2008', libelle: 'Cat. 2008', align: 'centre' },
      { cle: 'cat2025', libelle: 'Cat. 2025', align: 'centre' },
      { cle: 'validite', libelle: 'Validité', align: 'centre' },
      { cle: 'actif', libelle: 'Actif', align: 'centre' },
      { cle: 'actions', libelle: '', align: 'droite' }
    ],
    lignesHtml
  });

  conteneur.innerHTML = STYLES_VUE
    + '<div class="vue-personnel anim-fade">'
    + enteteVue({
      titre: titre,
      sousTitre: sousTitre,
      actionsHtml: '<button id="bouton-ajouter-personne" class="btn btn-marine" type="button">'
        + ICONES.plus + '<span>Ajouter</span></button>'
    })
    + '<div class="encart-aide">'
    + '<strong>Attestation de CAPACITÉ</strong> = l’établissement (voir Administration). '
    + '<strong>Attestation d’APTITUDE</strong> = la personne. '
    + 'Catégorie 2008 : plus de délivrance après le 31/12/2026, reconnue '
    + 'jusqu’au 12/03/2029 puis seulement avec remise à niveau · '
    + 'Catégorie 2025 : obligatoire à partir du 01/01/2027.'
    + '</div>'
    + contenuTableau
    + '</div>';

  conteneur.querySelector('#bouton-ajouter-personne').addEventListener('click', async () => {
    const enregistre = await ouvrirFormPersonne(ctx);
    if (enregistre) render(conteneur, ctx);
  });

  conteneur.querySelectorAll('[data-action="modifier-personne"]').forEach((bouton) => {
    bouton.addEventListener('click', async () => {
      const enregistre = await ouvrirFormPersonne(ctx, bouton.dataset.id);
      if (enregistre) render(conteneur, ctx);
    });
  });

  conteneur.querySelectorAll('[data-action="habilitations-personne"]').forEach((bouton) => {
    bouton.addEventListener('click', async () => {
      const modifie = await ouvrirHabilitations(ctx, bouton.dataset.id);
      if (modifie) render(conteneur, ctx);
    });
  });
}
