// ============================================================
// inerWeb Fluide v8 — vue « Administration » (Phase A, lecture seule)
// Paramètres du CERFA (cadre 1), utilisateurs/techniciens,
// clients/détenteurs (cadre 2). Toute édition renvoie vers la
// Phase C via un toast — aucune écriture dans le store.
// ============================================================

import { enteteVue, toast, ICONES } from './communs.js';
import { esc, fmtDate } from '../core/utils.js';

export const titre = 'Administration';

/* ============================================================
   Styles propres à la vue (préfixés .vue-admin, retirés avec elle)
   — composants absents de composants.css : badge « CADRE n »,
   champs de formulaire désactivés, listes à lignes fines.
   ============================================================ */

const STYLE_VUE = `<style>
  .vue-admin { display: flex; flex-direction: column; gap: 16px; }

  /* Bandeau discret « lecture seule » */
  .vue-admin .bandeau-phase {
    display: flex; align-items: center; gap: 9px;
    padding: 10px 14px;
    background: var(--info-fond); color: var(--info);
    border-radius: var(--rayon-bouton);
    font-size: 12.5px; font-weight: 500;
  }
  .vue-admin .bandeau-phase svg { width: 16px; height: 16px; flex: none; }

  /* En-tête de carte : badge CADRE n + titre + rappel */
  .vue-admin .carte-entete {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 12px; margin-bottom: 16px;
  }
  .vue-admin .carte-entete-titres { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
  .vue-admin .badge-cadre {
    flex: none; margin-top: 2px; padding: 3px 9px;
    border-radius: 6px; background: var(--marine-900); color: #ffffff;
    font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    white-space: nowrap;
  }
  .vue-admin .carte-titre { font-size: 15.5px; font-weight: 600; }
  .vue-admin .carte-rappel { margin-top: 2px; font-size: 12px; color: var(--texte-3); }

  /* Champs affichés en style formulaire désactivé */
  .vue-admin .champ { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .vue-admin .champ-libelle {
    font-size: 10.5px; font-weight: 600; letter-spacing: .1em;
    text-transform: uppercase; color: var(--texte-3);
  }
  .vue-admin .champ-valeur {
    padding: 9px 12px; min-height: 38px;
    background: var(--fond-2); border: 1px solid var(--bordure);
    border-radius: var(--rayon-bouton);
    color: var(--texte-2); font-size: 13.5px;
    overflow-wrap: anywhere;
  }
  .vue-admin .champ-valeur.mono { font-size: 13px; }

  /* Listes utilisateurs et détenteurs : lignes fines */
  .vue-admin .liste { list-style: none; margin: 0; padding: 0; }
  .vue-admin .liste li {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 2px; border-bottom: 1px solid var(--bordure-2);
  }
  .vue-admin .liste li:last-child { border-bottom: none; padding-bottom: 2px; }
  .vue-admin .liste-infos { flex: 1; min-width: 0; }
  .vue-admin .liste-nom { display: block; font-weight: 600; font-size: 13.5px; color: var(--texte); }
  .vue-admin .liste-detail { display: block; margin-top: 1px; font-size: 12px; color: var(--texte-3); }

  /* Chip « marine clair » (rôle Référent / chef d'atelier) */
  .vue-admin .chip-marine-clair { background: #e2eaf3; color: var(--marine-800); }
</style>`;

/* ============================================================
   Correspondance rôle applicatif → chip (teintes de la maquette)
   ============================================================ */

const CHIPS_ROLE = {
  ADMIN:      { libelle: 'Admin',      classe: 'chip-marine' },
  REFERENT:   { libelle: 'Référent',   classe: 'chip-marine-clair' },
  ENSEIGNANT: { libelle: 'Enseignant', classe: 'chip-teal' },
  ELEVE:      { libelle: 'Élève',      classe: 'chip-gris' }
};

/** Chip de rôle applicatif conforme à la maquette Administration. */
function chipRole(roleApp) {
  const role = CHIPS_ROLE[roleApp] || { libelle: roleApp || '—', classe: 'chip-gris' };
  return '<span class="chip ' + role.classe + '">' + esc(role.libelle) + '</span>';
}

/* ============================================================
   Gabarits
   ============================================================ */

/** Champ en style formulaire désactivé : libellé capitales + valeur figée. */
function champFixe(libelle, valeur, mono = false) {
  return '<div class="champ">'
    + '<span class="champ-libelle">' + esc(libelle) + '</span>'
    + '<span class="champ-valeur' + (mono ? ' mono' : '') + '">' + esc(valeur || '—') + '</span>'
    + '</div>';
}

/** Carte « Entreprise / Opérateur » (cadre 1 du CERFA), lecture seule. */
function carteEntreprise(etablissement) {
  return '<section class="carte">'
    + '<div class="carte-entete">'
    + '<div class="carte-entete-titres">'
    + '<span class="badge-cadre">Cadre 1</span>'
    + '<div>'
    + '<h3 class="carte-titre">Entreprise / Opérateur</h3>'
    + '<p class="carte-rappel">Ces informations apparaissent sur chaque CERFA 15497*04 généré.</p>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '<div class="grille-2">'
    + champFixe('Raison sociale', etablissement.raisonSociale)
    + champFixe('N° SIRET', etablissement.siret, true)
    + champFixe('N° attestation de capacité', etablissement.numAttestationCapacite, true)
    + champFixe('Adresse complète', etablissement.adresse)
    + champFixe('Organisme certificateur', etablissement.organisme)
    + champFixe('Échéance de l’attestation', fmtDate(etablissement.dateEcheanceCapacite))
    + '</div>'
    + '</section>';
}

/** Ligne d'un utilisateur : nom gras, attestation, chip de rôle, bouton. */
function ligneUtilisateur(personne) {
  const detail = personne.numAttestationAptitude
    ? 'Att. n° <span class="mono">' + esc(personne.numAttestationAptitude) + '</span>'
      + ' · valide jusqu’au ' + esc(fmtDate(personne.dateFinValidite))
    : 'Aucune attestation d’aptitude';

  return '<li>'
    + '<div class="liste-infos">'
    + '<span class="liste-nom">' + esc(personne.prenom + ' ' + personne.nom) + '</span>'
    + '<span class="liste-detail">' + detail + '</span>'
    + '</div>'
    + chipRole(personne.roleApp)
    + (personne.actif ? '' : '<span class="chip chip-gris">Inactif</span>')
    + '<button type="button" class="btn btn-secondaire btn-petit" data-action="modifier">Modifier</button>'
    + '</li>';
}

/** Carte « Utilisateurs / Techniciens » avec bouton d'ajout (Phase C). */
function carteUtilisateurs(personnel) {
  const lignes = personnel.map(ligneUtilisateur).join('');
  return '<section class="carte">'
    + '<div class="carte-entete">'
    + '<div class="carte-entete-titres">'
    + '<div>'
    + '<h3 class="carte-titre">Utilisateurs / Techniciens</h3>'
    + '<p class="carte-rappel">Intervenants attestés et élèves habilités à manipuler.</p>'
    + '</div>'
    + '</div>'
    + '<button type="button" class="btn btn-contour btn-petit" data-action="ajouter">'
    + ICONES.plus + 'Ajouter</button>'
    + '</div>'
    + '<ul class="liste">'
    + (lignes || '<li><span class="liste-detail">Aucun utilisateur enregistré.</span></li>')
    + '</ul>'
    + '</section>';
}

/** Ligne d'un client : raison sociale grasse, ville + SIRET, nb machines. */
function ligneClient(client) {
  const nb = Number(client.nbMachines) || 0;
  const compteur = nb + ' machine' + (nb > 1 ? 's' : '');
  return '<li>'
    + '<div class="liste-infos">'
    + '<span class="liste-nom">' + esc(client.raisonSociale) + '</span>'
    + '<span class="liste-detail">' + esc(client.adresse)
    + ' · SIRET <span class="mono">' + esc(client.siret) + '</span></span>'
    + '</div>'
    + '<span class="chip chip-gris">' + esc(compteur) + '</span>'
    + '<button type="button" class="btn btn-secondaire btn-petit" data-action="modifier">Modifier</button>'
    + '</li>';
}

/** Carte « Clients / Détenteurs » (cadre 2 du CERFA). */
function carteClients(clients) {
  const lignes = clients.map(ligneClient).join('');
  return '<section class="carte">'
    + '<div class="carte-entete">'
    + '<div class="carte-entete-titres">'
    + '<span class="badge-cadre">Cadre 2</span>'
    + '<div>'
    + '<h3 class="carte-titre">Clients / Détenteurs</h3>'
    + '<p class="carte-rappel">Détenteurs des équipements suivis dans le parc.</p>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '<ul class="liste">'
    + (lignes || '<li><span class="liste-detail">Aucun détenteur enregistré.</span></li>')
    + '</ul>'
    + '</section>';
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * Rend la vue Administration (lecture seule en Phase A).
 * @param {HTMLElement} conteneur — élément déjà vidé par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const { store } = ctx;

  // Lectures en parallèle (le store retourne des copies)
  const [etablissement, personnel, clients] = await Promise.all([
    store.getEtablissement(),
    store.getPersonnel(),
    store.getClients()
  ]);

  conteneur.innerHTML = STYLE_VUE
    + '<div class="vue-admin anim-fade">'
    + enteteVue({
      titre: 'Administration',
      sousTitre: 'Paramètres du CERFA, utilisateurs, détenteurs et intégrations'
    })
    + '<div class="bandeau-phase" role="note">' + ICONES.alerte
    + '<span>Lecture seule — l’édition sera disponible en Phase C.</span></div>'
    + carteEntreprise(etablissement)
    + '<div class="grille-2">'
    + carteUtilisateurs(personnel)
    + carteClients(clients)
    + '</div>'
    + '</div>';

  // Phase A : tous les boutons d'édition renvoient un toast explicatif
  conteneur.querySelectorAll('[data-action="ajouter"]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      toast('L’ajout sera disponible en Phase C.', 'info');
    });
  });
  conteneur.querySelectorAll('[data-action="modifier"]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      toast('L’édition sera disponible en Phase C.', 'info');
    });
  });
}
