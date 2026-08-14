// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — vue « Administration » (Phase C, édition)
// Dossier opérateur (cadre 1 du CERFA) éditable, suivi d'audit
// organisme et non-conformités, renvoi vers le registre du
// personnel, clients/détenteurs (cadre 2, création et édition — IM-11).
// ============================================================

import { enteteVue, ICONES, toast, confirmer } from './communs.js';
import { esc, fmtDate } from '../core/utils.js';
import { ouvrirFormEtablissement } from '../modales/etablissement-form.js';
import { ouvrirFormAudit, ouvrirFormNonConformite, ouvrirFormSolderNonConformite }
  from '../modales/audit-form.js';
import { ouvrirFormClient } from '../modales/client-form.js';
import { ouvrirCreationCompte, ouvrirReinitialisationMotDePasse }
  from '../modales/compte-form.js';
import { creerTransportHttp } from '../data/transport-http.js';
import { genererJournalAuditPdf } from '../documents/exports.js';

// Transport des routes de compte (hors contrat DataStore, Mode Local seul).
// Construit une fois pour la vue ; jamais utilisé en Mode Démo (aucun serveur).
const transportComptes = creerTransportHttp();

export const titre = 'Administration';

/* ============================================================
   Styles propres à la vue (préfixés .vue-admin, retirés avec elle)
   — composants absents de composants.css : badge « CADRE n »,
   champs de formulaire désactivés, listes à lignes fines.
   ============================================================ */

const STYLE_VUE = `<style>
  .vue-admin { display: flex; flex-direction: column; gap: 16px; }

  /* En-tête de carte : badge CADRE n + titre + rappel */
  .vue-admin .carte-entete {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 12px; margin-bottom: 16px;
  }
  .vue-admin .carte-entete-titres { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
  .vue-admin .carte-entete-actions { display: flex; gap: 8px; flex: none; flex-wrap: wrap; }
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
  .vue-admin .champ-valeur.echeance-proche { color: var(--danger, #dc2626); font-weight: 600; }

  /* Listes utilisateurs, clients, audits, non-conformités : lignes fines */
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

  /* Chips de statut non-conformité */
  .vue-admin .chip-rouge { background: #fee2e2; color: #dc2626; }
  .vue-admin .chip-vert { background: #dcfce7; color: #16a34a; }

  /* Renvoi (carte Utilisateurs devenue simple lien) */
  .vue-admin .carte-renvoi { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
  .vue-admin .carte-renvoi p { font-size: 13px; color: var(--texte-2); }

  /* Intégrité du registre : résultat de vérification + aperçu du journal */
  .vue-admin .integrite-resultat {
    display: flex; align-items: center; gap: 10px;
    margin-top: 12px; padding: 10px 12px;
    border-radius: var(--rayon-bouton);
    font-size: 13px; font-weight: 600;
  }
  .vue-admin .integrite-resultat.ok {
    background: var(--succes-fond); color: var(--succes);
  }
  .vue-admin .integrite-resultat.anomalie {
    background: var(--danger-fond); color: var(--danger);
  }
  .vue-admin .integrite-resultat svg { flex: none; }
  .vue-admin .journal-apercu { margin-top: 16px; }
  .vue-admin .journal-apercu-entete {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px;
  }
  .vue-admin .liste-journal { list-style: none; margin: 0; padding: 0; }
  .vue-admin .liste-journal li {
    display: flex; flex-direction: column; gap: 2px;
    padding: 8px 2px; border-bottom: 1px solid var(--bordure-2);
    font-size: 12.5px;
  }
  .vue-admin .liste-journal li:last-child { border-bottom: none; padding-bottom: 0; }
  .vue-admin .liste-journal .journal-ligne1 {
    display: flex; align-items: baseline; gap: 8px; color: var(--texte);
  }
  .vue-admin .liste-journal .journal-date { color: var(--texte-3); font-family: var(--police-mono); }
  .vue-admin .liste-journal .journal-action { font-weight: 600; }
  .vue-admin .liste-journal .journal-detail { color: var(--texte-3); }
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

/** Vrai si l'application tourne en Mode Local (comptes réels côté serveur). */
function estModeLocal(store) {
  return Boolean(store && store.modeLabel === 'LOCAL');
}

/** Ligne d'un compte de connexion (login, rôle, état, dernière connexion, actions). */
function ligneCompte(compte) {
  const statut = compte.actif
    ? '<span class="chip chip-vert">Actif</span>'
    : '<span class="chip chip-gris">Désactivé</span>';
  const verrou = compte.verrouille ? ' · verrouillé' : '';
  const derniere = compte.derniereConnexion
    ? 'Dernière connexion ' + esc(fmtDateHeure(compte.derniereConnexion))
    : 'Jamais connecté';
  const actionActivation = compte.actif ? 'desactiver' : 'reactiver';
  const libelleActivation = compte.actif ? 'Désactiver' : 'Réactiver';
  return '<li>'
    + '<div class="liste-infos">'
    + '<span class="liste-nom">' + esc(compte.login) + '</span>'
    + '<span class="liste-detail">' + derniere + verrou + '</span>'
    + '</div>'
    + chipRole(compte.role)
    + statut
    + '<button type="button" class="btn btn-secondaire btn-petit" '
    + 'data-action="reinit-compte" data-id="' + esc(compte.id) + '">Mot de passe</button>'
    + '<button type="button" class="btn btn-secondaire btn-petit" '
    + 'data-action="' + actionActivation + '-compte" data-id="' + esc(compte.id) + '" '
    + 'data-login="' + esc(compte.login) + '">' + libelleActivation + '</button>'
    + '</li>';
}

/** Carte « Comptes de connexion » : coquille (le corps se peuple en asynchrone). */
function carteComptesCoquille(store) {
  const boutonCreer = estModeLocal(store)
    ? '<button type="button" class="btn btn-contour btn-petit" data-action="creer-compte">'
      + ICONES.plus + 'Créer un compte</button>'
    : '';
  return '<section class="carte">'
    + '<div class="carte-entete">'
    + '<div class="carte-entete-titres">'
    + '<div>'
    + '<h3 class="carte-titre">Comptes de connexion</h3>'
    + '<p class="carte-rappel">Créer, réinitialiser un mot de passe, activer ou '
    + 'désactiver un compte (Référent, Enseignant, Élève, Administrateur).</p>'
    + '</div>'
    + '</div>'
    + boutonCreer
    + '</div>'
    + '<div id="comptes-corps"><p class="carte-rappel">Chargement…</p></div>'
    + '</section>';
}

/** Libellés courts des activités réglementées. */
const LIBELLES_ACTIVITE = {
  MISE_EN_SERVICE: 'Mise en service',
  MAINTENANCE: 'Maintenance',
  CONTROLE: 'Contrôle d’étanchéité',
  RECUPERATION: 'Récupération',
  DEMANTELEMENT: 'Démantèlement'
};

/* ============================================================
   Gabarits
   ============================================================ */

/** Champ en style formulaire désactivé : libellé capitales + valeur figée. */
function champFixe(libelle, valeur, options = {}) {
  const classeAlerte = options.alerte ? ' echeance-proche' : '';
  return '<div class="champ">'
    + '<span class="champ-libelle">' + esc(libelle) + '</span>'
    + '<span class="champ-valeur' + (options.mono ? ' mono' : '') + classeAlerte + '">'
    + esc(valeur || '—') + '</span>'
    + '</div>';
}

/** Carte « Entreprise / Opérateur » (cadre 1 du CERFA), éditable. */
function carteEntreprise(etablissement) {
  const jour = new Date().toISOString().slice(0, 10);
  const horizon90 = (function () {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().slice(0, 10);
  })();
  const echeance = etablissement.dateEcheanceCapacite;
  const echeanceProche = Boolean(echeance && echeance <= horizon90);

  const categories = (etablissement.categoriesAutorisees || []).join(', ');
  const activites = (etablissement.activitesAutorisees || [])
    .map((a) => LIBELLES_ACTIVITE[a] || a).join(', ');

  return '<section class="carte">'
    + '<div class="carte-entete">'
    + '<div class="carte-entete-titres">'
    + '<span class="badge-cadre">Cadre 1</span>'
    + '<div>'
    + '<h3 class="carte-titre">Entreprise / Opérateur</h3>'
    + '<p class="carte-rappel">Ces informations apparaissent sur chaque CERFA 15497*04 généré.</p>'
    + '</div>'
    + '</div>'
    + '<button type="button" class="btn btn-secondaire btn-petit" data-action="modifier-etablissement">'
    + 'Modifier</button>'
    + '</div>'
    + '<div class="grille-2">'
    + champFixe('Raison sociale', etablissement.raisonSociale)
    + champFixe('N° SIRET', etablissement.siret, { mono: true })
    + champFixe('N° attestation de capacité', etablissement.numAttestationCapacite, { mono: true })
    + champFixe('Adresse complète', etablissement.adresse)
    + champFixe('Organisme certificateur', etablissement.organisme)
    + champFixe('Date de délivrance', fmtDate(etablissement.dateDelivranceCapacite))
    + champFixe('Échéance de l’attestation', fmtDate(echeance), { alerte: echeanceProche })
    + champFixe('Catégories autorisées', categories)
    + champFixe('Activités autorisées', activites)
    + champFixe('Dernier audit', fmtDate(etablissement.dernierAudit))
    + champFixe('Prochain audit', fmtDate(etablissement.prochainAudit))
    + '</div>'
    + '</section>';
}

/** Ligne d'un audit organisme. */
function ligneAudit(audit) {
  return '<li>'
    + '<div class="liste-infos">'
    + '<span class="liste-nom">' + esc(fmtDate(audit.date)) + ' · ' + esc(audit.organisme) + '</span>'
    + '<span class="liste-detail">' + esc(audit.resultat)
    + (audit.remarques ? ' — ' + esc(audit.remarques) : '') + '</span>'
    + '</div>'
    + '</li>';
}

/** Ligne d'une non-conformité, avec bouton Solder si ouverte. */
function ligneNonConformite(nc) {
  const chip = nc.statut === 'SOLDEE'
    ? '<span class="chip chip-vert">Soldée</span>'
    : '<span class="chip chip-rouge">Ouverte</span>';
  const detailEcheance = nc.echeance ? ' · échéance ' + esc(fmtDate(nc.echeance)) : '';
  const detailAction = nc.actionCorrective ? ' — ' + esc(nc.actionCorrective) : '';
  return '<li>'
    + '<div class="liste-infos">'
    + '<span class="liste-nom">' + esc(nc.description) + '</span>'
    + '<span class="liste-detail">' + detailAction.replace(/^ — /, '') + detailEcheance + '</span>'
    + '</div>'
    + chip
    + (nc.statut === 'SOLDEE' ? '' :
      '<button type="button" class="btn btn-secondaire btn-petit" '
      + 'data-action="solder-nc" data-id="' + esc(nc.id) + '">Solder</button>')
    + '</li>';
}

/** Carte « Suivi d'audit » : audits organisme + non-conformités. */
function carteSuiviAudit(audits, nonConformites) {
  const lignesAudits = audits.map(ligneAudit).join('');
  const lignesNc = nonConformites.map(ligneNonConformite).join('');
  return '<section class="carte">'
    + '<div class="carte-entete">'
    + '<div class="carte-entete-titres">'
    + '<div>'
    + '<h3 class="carte-titre">Suivi d’audit</h3>'
    + '<p class="carte-rappel">Audits de l’organisme certificateur et actions correctives.</p>'
    + '</div>'
    + '</div>'
    + '</div>'

    + '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">'
    + '<span class="champ-libelle">Audits</span>'
    + '<button type="button" class="btn btn-contour btn-petit" data-action="ajouter-audit">'
    + ICONES.plus + 'Enregistrer un audit</button>'
    + '</div>'
    + '<ul class="liste">'
    + (lignesAudits || '<li><span class="liste-detail">Aucun audit enregistré.</span></li>')
    + '</ul>'

    + '<div style="display:flex; align-items:center; justify-content:space-between; margin:18px 0 8px;">'
    + '<span class="champ-libelle">Non-conformités</span>'
    + '<button type="button" class="btn btn-contour btn-petit" data-action="ajouter-nc">'
    + ICONES.plus + 'Non-conformité</button>'
    + '</div>'
    + '<ul class="liste">'
    + (lignesNc || '<li><span class="liste-detail">Aucune non-conformité enregistrée.</span></li>')
    + '</ul>'
    + '</section>';
}

/** Carte « Utilisateurs / Techniciens » : simple renvoi vers le registre du personnel. */
function carteRenvoiPersonnel() {
  return '<section class="carte carte-renvoi">'
    + '<div class="carte-entete">'
    + '<div class="carte-entete-titres">'
    + '<div>'
    + '<h3 class="carte-titre">Utilisateurs / Techniciens</h3>'
    + '<p class="carte-rappel">Le registre complet du personnel a déménagé.</p>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '<p>Intervenants attestés, élèves habilités et leurs attestations d’aptitude '
    + 'se gèrent désormais dans le registre du personnel.</p>'
    + '<button type="button" class="btn btn-primaire btn-petit" data-action="ouvrir-personnel">'
    + 'Ouvrir le registre du personnel</button>'
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
    + '<button type="button" class="btn btn-secondaire btn-petit" '
    + 'data-action="modifier-client" data-id="' + esc(client.id) + '">Modifier</button>'
    + '</li>';
}

/** Formate une date ISO complète en « jj/mm/aaaa hh:mm:ss » (affichage seul). */
function fmtDateHeure(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const heures = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const secondes = String(d.getSeconds()).padStart(2, '0');
  return fmtDate(iso) + ' ' + heures + ':' + minutes + ':' + secondes;
}

/** Ligne d'aperçu du journal d'audit (append-only, lecture seule). */
function ligneJournal(entree) {
  return '<li>'
    + '<div class="journal-ligne1">'
    + '<span class="journal-date">' + esc(fmtDateHeure(entree.date)) + '</span>'
    + '<span class="journal-action">' + esc(entree.action || '—') + '</span>'
    + '<span class="journal-detail">' + esc(entree.qui || 'système') + '</span>'
    + '</div>'
    + (entree.cible || entree.details
      ? '<span class="journal-detail">'
        + esc([entree.cible, entree.details].filter(Boolean).join(' — '))
        + '</span>'
      : '')
    + '</li>';
}

/** Carte « Intégrité du registre » : vérification à la demande + aperçu du journal. */
function carteIntegriteRegistre() {
  return '<section class="carte">'
    + '<div class="carte-entete">'
    + '<div class="carte-entete-titres">'
    + '<div>'
    + '<h3 class="carte-titre">Intégrité du registre</h3>'
    + '<p class="carte-rappel">Chaîne de hash des écritures figées et journal d’audit '
    + '(append-only, sans purge possible).</p>'
    + '</div>'
    + '</div>'
    + '<div class="carte-entete-actions">'
    + '<button type="button" class="btn btn-secondaire btn-petit" data-action="verifier-integrite">'
    + 'Vérifier maintenant</button>'
    + '<button type="button" class="btn btn-contour btn-petit" data-action="exporter-journal-pdf">'
    + 'Exporter en PDF</button>'
    + '</div>'
    + '</div>'
    + '<div id="integrite-resultat"></div>'
    + '<div class="journal-apercu">'
    + '<div class="journal-apercu-entete">'
    + '<span class="champ-libelle">Journal d’audit (dernières écritures)</span>'
    + '</div>'
    + '<ul class="liste-journal" id="integrite-journal">'
    + '<li><span class="journal-detail">Chargement…</span></li>'
    + '</ul>'
    + '</div>'
    + '</section>';
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
    + '<button type="button" class="btn btn-contour btn-petit" data-action="ajouter-client">'
    + ICONES.plus + 'Ajouter</button>'
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
 * Rend la vue Administration (édition, Phase C).
 * @param {HTMLElement} conteneur — élément déjà vidé par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const { store, naviguer } = ctx;

  async function rafraichir() {
    const [etablissement, audits, nonConformites, clients] = await Promise.all([
      store.getEtablissement(),
      store.getAuditsOrganisme(),
      store.getNonConformites(),
      store.getClients()
    ]);

    conteneur.innerHTML = STYLE_VUE
      + '<div class="vue-admin anim-fade">'
      + enteteVue({
        titre: 'Administration',
        sousTitre: 'Dossier opérateur, suivi d’audit, détenteurs et intégrations'
      })
      + carteEntreprise(etablissement)
      + carteSuiviAudit(audits, nonConformites)
      + carteComptesCoquille(store)
      + carteIntegriteRegistre()
      + '<div class="grille-2">'
      + carteRenvoiPersonnel()
      + carteClients(clients)
      + '</div>'
      + '</div>';

    // ---- Écouteurs ------------------------------------------------

    const boutonModifierEtab = conteneur.querySelector('[data-action="modifier-etablissement"]');
    if (boutonModifierEtab) {
      boutonModifierEtab.addEventListener('click', async () => {
        const enregistre = await ouvrirFormEtablissement(ctx);
        if (enregistre) await rafraichir();
      });
    }

    const boutonAjouterAudit = conteneur.querySelector('[data-action="ajouter-audit"]');
    if (boutonAjouterAudit) {
      boutonAjouterAudit.addEventListener('click', async () => {
        const enregistre = await ouvrirFormAudit(ctx);
        if (enregistre) await rafraichir();
      });
    }

    const boutonAjouterNc = conteneur.querySelector('[data-action="ajouter-nc"]');
    if (boutonAjouterNc) {
      boutonAjouterNc.addEventListener('click', async () => {
        const enregistre = await ouvrirFormNonConformite(ctx);
        if (enregistre) await rafraichir();
      });
    }

    conteneur.querySelectorAll('[data-action="solder-nc"]').forEach((bouton) => {
      bouton.addEventListener('click', async () => {
        const soldee = await ouvrirFormSolderNonConformite(ctx, bouton.dataset.id);
        if (soldee) await rafraichir();
      });
    });

    const boutonPersonnel = conteneur.querySelector('[data-action="ouvrir-personnel"]');
    if (boutonPersonnel) {
      boutonPersonnel.addEventListener('click', () => {
        naviguer('personnel');
      });
    }

    // IM-11 : création / modification des clients-détenteurs.
    const boutonAjouterClient = conteneur.querySelector('[data-action="ajouter-client"]');
    if (boutonAjouterClient) {
      boutonAjouterClient.addEventListener('click', async () => {
        const enregistre = await ouvrirFormClient(ctx, null);
        if (enregistre) await rafraichir();
      });
    }

    conteneur.querySelectorAll('[data-action="modifier-client"]').forEach((bouton) => {
      bouton.addEventListener('click', async () => {
        const client = clients.find((c) => c.id === bouton.dataset.id) || null;
        const enregistre = await ouvrirFormClient(ctx, client);
        if (enregistre) await rafraichir();
      });
    });

    // CF-3 : intégrité du registre, vérification à la demande + aperçu du journal.
    const zoneJournal = conteneur.querySelector('#integrite-journal');
    if (zoneJournal) {
      store.getJournalAudit().then((journal) => {
        const dernieres = (journal || []).slice(-10).reverse();
        zoneJournal.innerHTML = dernieres.length
          ? dernieres.map(ligneJournal).join('')
          : '<li><span class="journal-detail">Aucune écriture au journal.</span></li>';
      }).catch((erreur) => {
        zoneJournal.innerHTML = '<li><span class="journal-detail">'
          + 'Journal indisponible.</span></li>';
        console.error('Lecture du journal d’audit impossible :', erreur);
      });
    }

    const boutonVerifierIntegrite = conteneur.querySelector('[data-action="verifier-integrite"]');
    if (boutonVerifierIntegrite) {
      boutonVerifierIntegrite.addEventListener('click', async () => {
        const zoneResultat = conteneur.querySelector('#integrite-resultat');
        boutonVerifierIntegrite.disabled = true;
        try {
          const resultat = await store.verifierChaineHash();
          if (zoneResultat) {
            zoneResultat.innerHTML = resultat.ok
              ? '<div class="integrite-resultat ok">' + ICONES.coche
                + '<span>Chaîne intacte : aucune rupture détectée.</span></div>'
              : '<div class="integrite-resultat anomalie">' + ICONES.alerte
                + '<span>Anomalie détectée : rupture à l’écriture '
                + esc(resultat.casseA || '?') + '.</span></div>';
          }
          toast(
            resultat.ok ? 'Chaîne intacte : aucune rupture détectée.'
              : 'Anomalie détectée à l’écriture ' + (resultat.casseA || '?') + '.',
            resultat.ok ? 'succes' : 'erreur'
          );
        } catch (erreur) {
          if (zoneResultat) {
            zoneResultat.innerHTML = '<div class="integrite-resultat anomalie">' + ICONES.alerte
              + '<span>Vérification impossible.</span></div>';
          }
          toast('Vérification du registre impossible.', 'erreur');
          console.error('Vérification de la chaîne du registre impossible :', erreur);
        } finally {
          boutonVerifierIntegrite.disabled = false;
        }
      });
    }

    // CF-22 : export PDF paginé du journal d'audit complet.
    const boutonExporterJournal = conteneur.querySelector('[data-action="exporter-journal-pdf"]');
    if (boutonExporterJournal) {
      boutonExporterJournal.addEventListener('click', async () => {
        boutonExporterJournal.disabled = true;
        const libelleInitial = boutonExporterJournal.textContent;
        boutonExporterJournal.textContent = 'Génération…';
        try {
          const { octets, nomFichier } = await genererJournalAuditPdf(store);
          const blob = new Blob([octets], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const lien = document.createElement('a');
          lien.href = url;
          lien.download = nomFichier;
          document.body.appendChild(lien);
          lien.click();
          lien.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          toast('Journal d’audit exporté en PDF.', 'succes');
        } catch (erreur) {
          toast('Export du journal impossible.', 'erreur');
          console.error('Export PDF du journal d’audit impossible :', erreur);
        } finally {
          boutonExporterJournal.disabled = false;
          boutonExporterJournal.textContent = libelleInitial;
        }
      });
    }

    // ---- Comptes de connexion (Mode Local) --------------------------
    const boutonCreerCompte = conteneur.querySelector('[data-action="creer-compte"]');
    if (boutonCreerCompte) {
      boutonCreerCompte.addEventListener('click', async () => {
        const cree = await ouvrirCreationCompte(transportComptes);
        if (cree) await rafraichirComptes();
      });
    }
    await rafraichirComptes();
  }

  /**
   * (Re)peuple la carte « Comptes de connexion ». En Mode Démo, affiche une
   * note (aucun compte à cette échelle). En Mode Local, liste les comptes via
   * le transport dédié (route ADMIN `listerComptes`) et câble les actions
   * (réinitialisation du mot de passe, activation/désactivation).
   */
  async function rafraichirComptes() {
    const corps = conteneur.querySelector('#comptes-corps');
    if (!corps) return;

    if (!estModeLocal(store)) {
      corps.innerHTML = '<p class="carte-rappel">La gestion des comptes de '
        + 'connexion est disponible en Mode Local (poste lycée). En mode '
        + 'démonstration, il n’y a pas de comptes.</p>';
      return;
    }

    corps.innerHTML = '<p class="carte-rappel">Chargement…</p>';
    let comptes;
    try {
      comptes = await transportComptes('listerComptes', {});
    } catch (erreur) {
      corps.innerHTML = '<p class="carte-rappel">Comptes indisponibles ('
        + esc(erreur && erreur.message ? erreur.message : 'erreur') + ').</p>';
      return;
    }

    corps.innerHTML = '<ul class="liste">'
      + (comptes.length
        ? comptes.map(ligneCompte).join('')
        : '<li><span class="liste-detail">Aucun compte.</span></li>')
      + '</ul>';

    corps.querySelectorAll('[data-action="reinit-compte"]').forEach((bouton) => {
      bouton.addEventListener('click', async () => {
        const compte = comptes.find((c) => c.id === bouton.dataset.id);
        if (!compte) return;
        const fait = await ouvrirReinitialisationMotDePasse(transportComptes, compte);
        if (fait) await rafraichirComptes();
      });
    });

    corps.querySelectorAll('[data-action="desactiver-compte"], [data-action="reactiver-compte"]')
      .forEach((bouton) => {
        bouton.addEventListener('click', async () => {
          const activer = bouton.dataset.action === 'reactiver-compte';
          const login = bouton.dataset.login || '';
          const ok = await confirmer({
            titre: activer ? 'Réactiver le compte' : 'Désactiver le compte',
            message: activer
              ? 'Réactiver « ' + login + ' » ? Il pourra de nouveau se connecter.'
              : 'Désactiver « ' + login + ' » ? Ses sessions ouvertes seront '
                + 'fermées et il ne pourra plus se connecter. Le compte n’est '
                + 'pas supprimé (réactivable à tout moment).',
            libelleConfirmer: activer ? 'Réactiver' : 'Désactiver',
            danger: !activer
          });
          if (!ok) return;
          try {
            await transportComptes('definirActivationCompte',
              { id: bouton.dataset.id, actif: activer });
            toast(activer ? 'Compte réactivé.' : 'Compte désactivé.', 'succes');
            await rafraichirComptes();
          } catch (erreur) {
            toast(erreur && erreur.message ? erreur.message : 'Action impossible.', 'erreur');
          }
        });
      });
  }

  await rafraichir();
}
