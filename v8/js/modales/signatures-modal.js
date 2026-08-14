// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — modale « Signatures de la fiche » (lot C, C4)
// Parcours de DOUBLE SIGNATURE réelle d'un mouvement BROUILLON :
// technicien PUIS détenteur (ordre imposé par le store), déclaration
// composée par le module partagé et AFFICHÉE au moment de signer,
// pré-remplissage (délégation pré-cochée pour un équipement du
// lycée), identité de session visible, puis SOUMISSION quand les
// deux signatures sont valides.
// Les décisions vivent dans data/parcours-signature.js (pur) ; le
// store reste seul juge (signerMouvement recompose et contrôle tout).
// Exporte aussi remplirSimulationOfficielle, partagée avec la modale
// de validation de la vue Mouvements.
// ============================================================

import { modale, toast, chipStatut, ICONES } from '../views/communs.js';
import { esc, fmtDate } from '../core/utils.js';
import { creerSignature } from '../wizard/signature.js';
import { etatParcoursSignatures, preremplirSignature }
  from '../data/parcours-signature.js';
import { declarationSignature } from '../data/signatures-mouvement.js';

/** Libellés d'affichage des deux rôles du parcours. */
const LIBELLES_ROLE = {
  TECHNICIEN: 'technicien',
  DETENTEUR: 'détenteur'
};

/** Bandeau d'erreur (même motif que la vue Mouvements). */
function bandeauErreur(message) {
  return '<div class="bandeau-erreur">' + ICONES.alerte
    + '<span>' + esc(message) + '</span></div>';
}

/**
 * Panneau d'information « contrôles du mode Officiel » d'une fiche :
 * liste ce que le mode Officiel refuserait aujourd'hui (hors verrou de
 * livraison). Wording selon le mode de LA fiche : en Formation c'est une
 * simulation (jamais bloquante), en Officiel ce sont les conditions
 * restant à lever. Purement informatif, tolérant à l'échec.
 * @param {object} store
 * @param {object} mv - le mouvement concerné
 * @param {?HTMLElement} zone - conteneur à remplir (rien si null)
 */
export async function remplirSimulationOfficielle(store, mv, zone) {
  if (!zone) return;
  try {
    const verdict = await store.simulerValidationOfficielle(mv.id);
    const visibles = verdict.blocages.filter(
      function (b) { return b.code !== 'VERROU_LIVRAISON'; });
    const officiel = mv.mode === 'OFFICIEL';
    if (!visibles.length) {
      zone.innerHTML = '<p style="font-size:13px;color:var(--texte-2)">'
        + (officiel
          ? 'Contrôles du registre officiel : aucun blocage pour cette fiche.'
          : 'Simulation mode Officiel : aucun blocage — cette fiche '
            + 'passerait les contrôles du registre officiel.')
        + '</p>';
      return;
    }
    zone.innerHTML = '<div class="bandeau-avertissement" style="display:block">'
      + '<strong>' + (officiel
        ? 'Contrôles du registre officiel'
        : 'Simulation mode Officiel') + '</strong> — '
      + (officiel
        ? 'conditions restant à lever avant la validation officielle :'
        : 'cette fiche serait refusée en Officiel (information, la '
          + 'validation en Formation reste possible) :')
      + '<ul style="margin:6px 0 0 18px;padding:0">'
      + visibles.map(function (b) {
        return '<li>' + esc(b.motif) + '</li>';
      }).join('')
      + '</ul></div>';
  } catch (erreur) {
    // Simulation indisponible (méthode absente, erreur réseau…) : on
    // n'affiche rien — le parcours n'en dépend jamais.
    zone.innerHTML = '';
  }
}

/**
 * Carte d'une signature posée et VALIDE (relecture, jamais d'édition).
 * Lot B3 (25/07) : le TÉMOIN DE SESSION y est enfin porté. Il était
 * capté et stocké depuis la brique C1, mais jamais montré — on jetait
 * une preuve qu'on possédait déjà. DÉCISION DU PROPRIÉTAIRE : que la
 * même session pose les deux signatures est NORMAL — aucun message,
 * aucun avertissement, aucune comparaison. On montre le fait, c'est tout.
 * @param {object} sig
 * @param {?string} nomSession personne de la session (fiche VIVANTE :
 *   pseudonyme si elle est au coffre), null si inconnue
 */
function carteSignatureValide(sig, nomSession) {
  const quand = sig.dateHeure
    ? fmtDate(sig.dateHeure.slice(0, 10)) : '';
  return '<div class="carte" style="padding:10px;margin-top:8px">'
    + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
    + chipStatut('VALIDE')
    + '<strong>' + esc((sig.prenom + ' ' + sig.nom).trim()) + '</strong>'
    + (sig.qualite ? '<span style="color:var(--texte-2)">— '
      + esc(sig.qualite) + '</span>' : '')
    + (quand ? '<span style="color:var(--texte-3)">le ' + esc(quand)
      + '</span>' : '')
    + '</div>'
    + '<p style="font-size:12px;font-style:italic;color:var(--texte-2);'
    + 'margin:6px 0 0">« ' + esc(sig.declaration ?? '') + ' »</p>'
    + (sig.sessionCompteId || nomSession
      ? '<p style="font-size:12px;color:var(--texte-3);margin:6px 0 0">'
        + 'Posée depuis la session '
        + (nomSession ? '<strong>' + esc(nomSession) + '</strong> ' : '')
        + '(compte ' + esc(sig.sessionCompteId || 'non enregistré') + ')'
        + '</p>'
      : '')
    + (sig.imagePng
      ? '<img alt="Tracé de la signature" style="max-height:48px;'
        + 'margin-top:6px;border:1px solid var(--bordure,#e2e8f0);'
        + 'border-radius:6px;background:#fff" src="data:image/png;base64,'
        + esc(sig.imagePng) + '">'
      : '')
    + '</div>';
}

/** Formulaire de pose d'une signature pour un rôle (HTML seul). */
function formulaireSignature(role, prefill) {
  const detenteur = role === 'DETENTEUR';
  return '<div data-formulaire-signature="' + esc(role) + '" '
    + 'style="margin-top:8px">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<div class="champ"><label>Prénom</label>'
    + '<input type="text" data-champ="prenom" value="'
    + esc(prefill.prenom ?? '') + '"></div>'
    + '<div class="champ"><label>Nom</label>'
    + '<input type="text" data-champ="nom" value="'
    + esc(prefill.nom ?? '') + '"></div>'
    + '</div>'
    + '<div class="champ"><label>Qualité</label>'
    + '<input type="text" data-champ="qualite" value="'
    + esc(prefill.qualite ?? '') + '"></div>'
    + (detenteur
      ? '<label style="display:flex;align-items:center;gap:8px;'
        + 'font-size:13px;margin:6px 0">'
        + '<input type="checkbox" data-champ="parDelegation"'
        + (prefill.parDelegation ? ' checked' : '') + '>'
        + '<span>Signature par délégation du détenteur</span></label>'
        + '<div class="champ">'
        + '<label>Raison sociale du détenteur représenté</label>'
        + '<input type="text" data-champ="organisation" value="'
        + esc(prefill.organisation ?? '') + '"></div>'
      : '')
    + '<div data-declaration style="font-size:13px;font-style:italic;'
    + 'color:var(--texte-2);border-left:3px solid var(--bordure,#e2e8f0);'
    + 'padding:6px 10px;margin:8px 0"></div>'
    + '<div data-zone-canvas></div>'
    + '<div data-zone-erreur-signature style="margin-top:8px"></div>'
    + '<div style="display:flex;justify-content:flex-end;margin-top:8px">'
    + '<button type="button" class="btn btn-primaire" data-role="signer">'
    + 'Signer (' + esc(LIBELLES_ROLE[role]) + ')</button></div>'
    + '</div>';
}

/**
 * Ouvre la modale « Signatures » d'un mouvement BROUILLON.
 * @param {{ store: object, naviguer: (vue: string) => void }} ctx
 * @param {object} mv - le mouvement (copie du store)
 * @param {{rappelHtml?: string, utilisateur?: ?object}} [options]
 */
export async function ouvrirSignaturesMouvement(ctx, mv, options = {}) {
  const store = ctx.store;
  const rappelHtml = options.rappelHtml ?? '';

  // ---- Chargements tolérants (le store reste seul juge au moment
  // de signer : ces données ne servent qu'à pré-remplir et informer) ----
  let utilisateur = options.utilisateur ?? null;
  if (!utilisateur) {
    try { utilisateur = await store.getUtilisateurCourant(); } catch {}
  }
  let etablissement = null;
  try { etablissement = await store.getEtablissement(); } catch {}
  let client = null;
  try {
    if (mv.machineId) {
      const machines = await store.getMachines();
      const machine = machines.find((m) => m.id === mv.machineId) || null;
      if (machine?.clientId) {
        const clients = await store.getClients();
        client = clients.find((c) => c.id === machine.clientId) || null;
      }
    }
  } catch {}
  // Le personnel sert au pré-remplissage ET, depuis le lot B3, à
  // nommer la session qui a posé chaque signature (fiche VIVANTE :
  // pseudonyme si la personne est au coffre).
  let personnel = [];
  try { personnel = await store.getPersonnel(); } catch {}
  const intervenant = mv.executeParId
    ? (personnel.find((p) => p.id === mv.executeParId) || null)
    : null;
  const nomDeSession = (sig) => {
    const fiche = sig && sig.sessionPersonnelId
      ? personnel.find((p) => p.id === sig.sessionPersonnelId)
      : null;
    return fiche ? `${fiche.prenom} ${fiche.nom}`.trim() : null;
  };

  const instance = modale({
    titre: 'Signatures de la fiche ' + mv.numero,
    contenuHtml: '<div data-zone-parcours></div>',
    actionsHtml: '<button type="button" class="btn btn-secondaire" '
      + 'data-role="fermer">Fermer</button>'
  });
  const racine = instance.racine;
  racine.querySelector('[data-role="fermer"]')
    .addEventListener('click', instance.fermer);
  const zoneParcours = racine.querySelector('[data-zone-parcours]');

  /** Bloc d'un rôle : signature retenue, formulaire ou attente. */
  function blocRole(role, parcours) {
    const etat = role === 'TECHNICIEN' ? parcours.technicien : parcours.detenteur;
    const retenue = role === 'TECHNICIEN'
      ? parcours.signatureTechnicien : parcours.signatureDetenteur;
    let corps = '';
    if (etat === 'VALIDE') {
      corps = carteSignatureValide(retenue, nomDeSession(retenue));
    } else {
      if (etat === 'PERIMEE') {
        corps += '<div class="bandeau-avertissement" style="display:block">'
          + 'Signature périmée : la fiche a été modifiée après la signature '
          + 'de ' + esc((retenue.prenom + ' ' + retenue.nom).trim())
          + ' — elle se recommence (l’ancienne reste tracée).</div>';
      } else if (etat === 'IMAGE_ILLISIBLE') {
        // ⭐ REVUE DU 26/07 : ce cas était annoncé « périmée », donc
        // « la fiche a été modifiée après la signature » — alors que la
        // fiche n'a pas bougé. On dit la vraie cause.
        corps += '<div class="bandeau-avertissement" style="display:block">'
          + 'Image de signature illisible : l’image enregistrée pour '
          + esc((retenue.prenom + ' ' + retenue.nom).trim())
          + ' ne peut pas être relue (zone restée vierge, fichier abîmé ou '
          + 'image remplacée). La fiche, elle, n’a pas été modifiée : c’est '
          + 'la signature qui ne vaut pas. Elle se recommence (l’ancienne '
          + 'reste tracée).</div>';
      }
      if (parcours.roleSuivant === role) {
        const prefill = preremplirSignature(role,
          { intervenant, utilisateur, client, etablissement });
        corps += formulaireSignature(role, prefill);
      } else if (etat === 'ABSENTE') {
        corps += '<p style="font-size:13px;color:var(--texte-3);'
          + 'margin-top:6px">Le technicien signe en premier.</p>';
      }
    }
    return '<div style="margin-top:14px">'
      + '<h4 style="margin:0;font-size:13px;text-transform:uppercase;'
      + 'letter-spacing:0.04em;color:var(--texte-3)">Signature du '
      + esc(LIBELLES_ROLE[role]) + '</h4>' + corps + '</div>';
  }

  /** (Re)dessine tout le parcours depuis l'état courant du store. */
  async function rendre() {
    let signatures;
    try {
      signatures = await store.getSignaturesMouvement(mv.id);
    } catch (erreur) {
      zoneParcours.innerHTML = bandeauErreur(erreur && erreur.message
        ? erreur.message : 'Signatures indisponibles.');
      return;
    }
    const parcours = etatParcoursSignatures(signatures);

    const bandeauSession = utilisateur
      ? '<div style="display:flex;align-items:center;gap:8px;'
        + 'font-size:13px;color:var(--texte-2)">Session : '
        + '<strong>' + esc((utilisateur.prenom + ' '
          + utilisateur.nom).trim()) + '</strong> '
        + chipStatut(utilisateur.roleApp) + '</div>'
      : '<p style="font-size:13px;color:var(--texte-3)">Identité de '
        + 'session indisponible.</p>';

    const blocSoumission = parcours.pretPourSoumission
      ? '<div class="carte" style="padding:10px;margin-top:14px">'
        + '<p style="font-size:13px;margin:0 0 8px">Les deux signatures '
        + 'sont valides : la fiche peut être soumise pour validation. '
        + 'Toute modification ultérieure les périmerait.</p>'
        + '<div style="display:flex;justify-content:flex-end">'
        + '<button type="button" class="btn btn-primaire" '
        + 'data-role="soumettre">Soumettre le mouvement</button></div>'
        + '<div data-zone-erreur-soumission style="margin-top:8px"></div>'
        + '</div>'
      : '';

    zoneParcours.innerHTML = rappelHtml
      + '<div style="margin-top:10px">' + bandeauSession + '</div>'
      + '<div data-zone-simulation style="margin-top:10px"></div>'
      + blocRole('TECHNICIEN', parcours)
      + blocRole('DETENTEUR', parcours)
      + blocSoumission;

    remplirSimulationOfficielle(store, mv,
      zoneParcours.querySelector('[data-zone-simulation]'));

    // ---- Câblage du formulaire actif (un seul rôle à la fois) ----
    const formulaire = zoneParcours.querySelector('[data-formulaire-signature]');
    if (formulaire) {
      const role = formulaire.dataset.formulaireSignature;
      const lire = (nom) => {
        const champ = formulaire.querySelector(`[data-champ="${nom}"]`);
        return champ ? String(champ.value).trim() : '';
      };
      const caseDelegation =
        formulaire.querySelector('[data-champ="parDelegation"]');
      const zoneDeclaration = formulaire.querySelector('[data-declaration]');

      // La déclaration signée : composée par le MODULE PARTAGÉ (le store
      // recomposera la même — jamais reçue du client), affichée en direct.
      function majDeclaration() {
        const parDelegation = Boolean(caseDelegation?.checked);
        const organisation = lire('organisation') || '…';
        zoneDeclaration.textContent = '« '
          + declarationSignature(role, parDelegation, organisation) + ' »';
      }
      majDeclaration();
      if (caseDelegation) {
        caseDelegation.addEventListener('change', majDeclaration);
      }
      const champOrganisation =
        formulaire.querySelector('[data-champ="organisation"]');
      if (champOrganisation) {
        champOrganisation.addEventListener('input', majDeclaration);
      }

      const trace = creerSignature(
        formulaire.querySelector('[data-zone-canvas]'),
        'Signature du ' + LIBELLES_ROLE[role]);

      formulaire.querySelector('[data-role="signer"]')
        .addEventListener('click', async function (evenement) {
          const bouton = evenement.currentTarget;
          const zoneErreur =
            formulaire.querySelector('[data-zone-erreur-signature]');
          zoneErreur.innerHTML = '';
          bouton.disabled = true;
          try {
            await store.signerMouvement(mv.id, {
              role,
              nom: lire('nom'),
              prenom: lire('prenom'),
              qualite: lire('qualite') || null,
              parDelegation: Boolean(caseDelegation?.checked),
              organisation: lire('organisation') || null,
              imagePng: trace.estVide() ? null : trace.dataURL()
            });
            toast('Signature du ' + LIBELLES_ROLE[role]
              + ' enregistrée.', 'succes');
            await rendre();
          } catch (erreur) {
            bouton.disabled = false;
            zoneErreur.innerHTML = bandeauErreur(erreur && erreur.message
              ? erreur.message : 'Erreur inattendue.');
          }
        });
    }

    // ---- Soumission (les deux signatures valides) ----
    const boutonSoumettre =
      zoneParcours.querySelector('[data-role="soumettre"]');
    if (boutonSoumettre) {
      boutonSoumettre.addEventListener('click', async function () {
        const zoneErreur =
          zoneParcours.querySelector('[data-zone-erreur-soumission]');
        zoneErreur.innerHTML = '';
        boutonSoumettre.disabled = true;
        try {
          await store.soumettreMouvement(mv.id);
          instance.fermer();
          toast('Mouvement ' + mv.numero
            + ' soumis pour validation.', 'succes');
          ctx.naviguer('mouvements');
        } catch (erreur) {
          boutonSoumettre.disabled = false;
          zoneErreur.innerHTML = bandeauErreur(erreur && erreur.message
            ? erreur.message : 'Erreur inattendue.');
        }
      });
    }
  }

  await rendre();
}
