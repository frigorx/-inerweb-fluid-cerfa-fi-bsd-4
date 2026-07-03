// ============================================================
// inerWeb Fluide v8 — assistant « Nouveau mouvement de fluide »
// Modale large en 6 étapes : Type · Machine · Bouteille ·
// Pesées · Contrôle · Signature. Les règles métier du store
// sont MIROITÉES en direct (pesées, croisements, dépassements)
// pour guider l'utilisateur avant la validation réelle.
// Aucun accès DOM à l'import du module.
// ============================================================

import { toast, chipStatut, chipType, ICONES } from '../views/communs.js';
import { esc, fmtNombre, fmtKg, fmtKgSigne, fmtDate } from '../core/utils.js';
import { creerSignature } from './signature.js';

/** Rôles autorisés à valider une écriture (contrat Phase B). */
const ROLES_VALIDEURS = ['REFERENT', 'ENSEIGNANT', 'ADMIN'];

/** Libellés courts des rôles applicatifs pour le select technicien. */
const LIBELLES_ROLES = {
  ADMIN: 'Admin',
  REFERENT: 'Référent',
  ENSEIGNANT: 'Enseignant',
  ELEVE: 'Élève'
};

/** Les 4 grandes cartes de l'étape 1. */
const CARTES_TYPE = [
  {
    id: 'charge',
    icone: 'televerser',
    titre: 'Charge / Mise en service',
    detail: 'Première charge d’un équipement neuf ou recharge après intervention.'
  },
  {
    id: 'appoint',
    icone: 'televerser',
    titre: 'Complément de charge',
    detail: 'Appoint de fluide sur un équipement déjà en service.'
  },
  {
    id: 'recuperation',
    icone: 'telecharger',
    titre: 'Récupération',
    detail: 'Vidange partielle ou totale vers une bouteille de récupération.'
  },
  {
    id: 'transfert',
    icone: 'echange',
    titre: 'Transfert',
    detail: 'Transfert de fluide entre deux bouteilles de même fluide.'
  }
];

/** Les 3 cartes de l'étape Contrôle d'étanchéité. */
const CARTES_CONTROLE = [
  {
    id: 'SANS_OBJET',
    icone: 'croix',
    titre: 'Sans objet',
    detail: 'Aucun contrôle d’étanchéité lié à ce mouvement.'
  },
  {
    id: 'CONFORME',
    icone: 'coche',
    titre: 'Conforme',
    detail: 'Contrôle réalisé, aucune fuite détectée.'
  },
  {
    id: 'FUITE',
    icone: 'alerte',
    titre: 'Fuite détectée',
    detail: 'Contrôle réalisé, une fuite a été constatée.'
  }
];

/** Arrondi métier au gramme (même règle que le store). */
function arrondir(valeur) {
  return Math.round(valeur * 1000) / 1000;
}

/* ============================================================
   Styles propres au wizard (injectés une seule fois à l'ouverture,
   préfixe « wizard- » pour éviter toute collision)
   ============================================================ */

const STYLES_WIZARD = `
  .modale-wizard { max-width: 800px; }
  .modale-wizard .wizard-etapes { padding: 14px 20px; }
  .modale-wizard .wizard-corps { padding: 0; min-height: 0; }

  .wizard-grille-choix {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .wizard-grille-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

  .carte-choix .choix-ligne {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  .carte-choix .choix-titre {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--texte);
  }
  .carte-choix .choix-titre svg {
    width: 18px;
    height: 18px;
    flex: none;
    color: var(--accent-fort);
  }
  .carte-choix .choix-detail {
    font-size: 12px;
    color: var(--texte-3);
    line-height: 1.45;
  }
  .carte-choix .choix-mono {
    font-family: var(--police-mono);
    font-size: 12px;
    color: var(--texte-2);
  }

  .wizard-interrupteur {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
    padding: 12px 14px;
    background: var(--fond-3);
    border: 1px solid var(--bordure);
    border-radius: var(--rayon-bouton);
    font-size: 13px;
    font-weight: 500;
    color: var(--texte-2);
    cursor: pointer;
  }
  .wizard-interrupteur input {
    width: 16px;
    height: 16px;
    flex: none;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .wizard-bloc { margin-top: 16px; }

  .wizard-encart {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-top: 16px;
    padding: 14px 16px;
    background: var(--accent-fond-2);
    border: 1px solid var(--accent);
    border-radius: var(--rayon-carte);
  }
  .wizard-encart-libelle {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--accent-fort);
  }
  .wizard-encart-valeur {
    font-family: var(--police-mono);
    font-size: 22px;
    font-weight: 600;
    color: var(--accent-fort);
    font-variant-numeric: tabular-nums;
  }

  .wizard-sens {
    margin-top: 10px;
    font-size: 12.5px;
    color: var(--texte-3);
    line-height: 1.5;
  }

  .wizard-recap {
    display: flex;
    flex-direction: column;
    margin-bottom: 16px;
    border: 1px solid var(--bordure);
    border-radius: var(--rayon-carte);
    overflow: hidden;
  }
  .wizard-recap-ligne {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 14px;
    border-bottom: 1px solid var(--bordure-2);
    font-size: 13px;
  }
  .wizard-recap-ligne:last-child { border-bottom: none; }
  .wizard-recap-libelle {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--texte-3);
    flex: none;
  }
  .wizard-recap-valeur {
    font-weight: 600;
    color: var(--texte);
    text-align: right;
  }
  .wizard-recap-valeur .cellule-mono {
    font-family: var(--police-mono);
    font-variant-numeric: tabular-nums;
  }

  .wizard-pied-actions { justify-content: flex-start; }
  .wizard-pied-actions > :last-child { margin-left: auto; }

  @media (max-width: 639px) {
    .wizard-grille-choix,
    .wizard-grille-3 { grid-template-columns: 1fr; }
    .modale-wizard {
      max-height: 100vh;
      height: 100%;
      border-radius: 0;
    }
  }
`;

/** Injecte la feuille de style du wizard une seule fois. */
function injecterStyles() {
  if (document.getElementById('styles-wizard')) return;
  const style = document.createElement('style');
  style.id = 'styles-wizard';
  style.textContent = STYLES_WIZARD;
  document.head.appendChild(style);
}

/* ============================================================
   Petits fragments HTML réutilisés
   ============================================================ */

/** Bandeau d'avertissement (ambre). */
function bandeauAvertissement(message) {
  return '<div class="bandeau-avertissement">' + ICONES.alerte
    + '<span>' + esc(message) + '</span></div>';
}

/** Bandeau d'erreur (rouge). */
function bandeauErreur(message) {
  return '<div class="bandeau-erreur">' + ICONES.alerte
    + '<span>' + esc(message) + '</span></div>';
}

/* ============================================================
   Ouverture du wizard
   ============================================================ */

/**
 * Ouvre l'assistant « Nouveau mouvement de fluide » (modale 6 étapes).
 * À la fin (validation ou soumission réussie) : toast de succès,
 * fermeture, puis ctx.naviguer('mouvements').
 * @param {{ store: object, naviguer: (vue: string) => void }} ctx
 * @param {{ machineId?: string, brouillonId?: string }} [options]
 *   machineId — préciblage d'une machine ;
 *   brouillonId — CR-1 : reprise d'un mouvement resté en BROUILLON
 *   (l'assistant est préchargé avec ses données ; à la validation,
 *   une écriture neuve remplace l'ancien brouillon, jamais de doublon).
 * @returns {Promise<void>}
 */
export async function ouvrirWizard(ctx, options = {}) {
  const { store } = ctx;

  // ---- Instantané des données (le store rend des copies) ----
  const [personnel, machines, bouteilles, outillage, utilisateur] =
    await Promise.all([
      store.getPersonnel(),
      store.getMachines(),
      store.getBouteilles(),
      store.getOutillage(),
      store.getUtilisateurCourant()
    ]);

  const techniciens = personnel.filter((p) => p.actif);
  const detecteurs = outillage.filter((o) => o.typeOutil === 'DETECTEUR');
  const peutValider = ROLES_VALIDEURS.includes(utilisateur.roleApp);

  // ---- État du wizard ----
  const etat = {
    etape: 1,
    carteType: null,        // 'charge' | 'appoint' | 'recuperation' | 'transfert'
    premiereCharge: false,  // interrupteur de la carte Charge / Mise en service
    demantelement: false,   // interrupteur de la carte Récupération
    technicienId: null,
    machineId: options.machineId || null,
    bouteilleSrcId: null,
    bouteilleDstId: null,
    peseeAvant: '',         // chaînes brutes des champs (kg)
    peseeApres: '',
    statutControle: null,   // 'SANS_OBJET' | 'CONFORME' | 'FUITE'
    detecteurId: null
  };

  // Écriture déjà créée/soumise dont la validation a échoué (nouvel essai
  // sans doublon tant que l'utilisateur ne revient pas en arrière).
  let idMouvementCree = null;
  let numeroMouvementCree = null;
  let mouvementSoumis = false;
  let finalisationEnCours = false;

  // Instance du canvas de signature (recréée à chaque rendu de l'étape 6)
  let signature = null;

  // ---- CR-1 : reprise d'un brouillon existant (options.brouillonId) ----
  // Le store n'expose aucune modification de brouillon : la reprise
  // PRÉCHARGE l'assistant avec les données du brouillon, et la
  // finalisation crée une écriture NEUVE puis supprime l'ancien
  // brouillon (choix documenté : pas de doublon, numéro rafraîchi).
  let idBrouillonRepris = null;
  let numeroBrouillonRepris = null;
  if (options.brouillonId) {
    const brouillon = (await store.getMouvements()).find((mv) =>
      mv.id === options.brouillonId && mv.statut === 'BROUILLON');
    if (brouillon) {
      idBrouillonRepris = brouillon.id;
      numeroBrouillonRepris = brouillon.numero;
      const CARTE_PAR_TYPE = {
        MISE_EN_SERVICE: 'charge',
        CHARGE_APPOINT: 'appoint',
        RECUPERATION_MAINTENANCE: 'recuperation',
        RECUPERATION_DEMANTELEMENT: 'recuperation',
        TRANSFERT: 'transfert'
      };
      etat.carteType = CARTE_PAR_TYPE[brouillon.type] || null;
      etat.premiereCharge = brouillon.type === 'MISE_EN_SERVICE';
      etat.demantelement = brouillon.type === 'RECUPERATION_DEMANTELEMENT';
      etat.machineId = brouillon.machineId || null;
      etat.bouteilleSrcId = brouillon.bouteilleSrcId || null;
      etat.bouteilleDstId = brouillon.bouteilleDstId || null;
      etat.peseeAvant = Number.isFinite(brouillon.peseeAvantKg)
        ? String(brouillon.peseeAvantKg) : '';
      etat.peseeApres = Number.isFinite(brouillon.peseeApresKg)
        ? String(brouillon.peseeApresKg) : '';
      etat.statutControle = brouillon.controle?.statutControle ?? null;
      etat.detecteurId = brouillon.controle?.detecteurId ?? null;
      // Le brouillon stocke le NOM du technicien : retrouvé par
      // correspondance exacte, sinon l'étape 1 redemande le choix
      const technicienRepris = techniciens.find((p) =>
        p.prenom + ' ' + p.nom === brouillon.technicien);
      etat.technicienId = technicienRepris ? technicienRepris.id : null;
      // Reprise à la première étape incomplète (la signature n'est
      // jamais conservée : elle se refait toujours à l'étape 6)
      while (etat.etape < 6 && etapeComplete()) etat.etape += 1;
    } else {
      toast('Brouillon introuvable ou déjà traité : nouveau mouvement.', 'info');
    }
  }

  /* ----------------------------------------------------------
     Accès dérivés à l'état
     ---------------------------------------------------------- */

  /** Type de mouvement du contrat déduit des choix de l'étape 1. */
  function typeMouvement() {
    if (etat.carteType === 'charge') {
      return etat.premiereCharge ? 'MISE_EN_SERVICE' : 'CHARGE_APPOINT';
    }
    if (etat.carteType === 'appoint') return 'CHARGE_APPOINT';
    if (etat.carteType === 'recuperation') {
      return etat.demantelement
        ? 'RECUPERATION_DEMANTELEMENT'
        : 'RECUPERATION_MAINTENANCE';
    }
    if (etat.carteType === 'transfert') return 'TRANSFERT';
    return null;
  }

  function estTransfert() { return etat.carteType === 'transfert'; }
  function estRecuperation() { return etat.carteType === 'recuperation'; }
  function estCharge() {
    return etat.carteType === 'charge' || etat.carteType === 'appoint';
  }

  function machineChoisie() {
    return machines.find((m) => m.id === etat.machineId) || null;
  }
  function bouteilleSrc() {
    return bouteilles.find((b) => b.id === etat.bouteilleSrcId) || null;
  }
  function bouteilleDst() {
    return bouteilles.find((b) => b.id === etat.bouteilleDstId) || null;
  }
  function technicienChoisi() {
    return techniciens.find((p) => p.id === etat.technicienId) || null;
  }

  /** Bouteille réellement posée sur la balance à l'étape Pesées. */
  function bouteillePesee() {
    return estRecuperation() ? bouteilleDst() : bouteilleSrc();
  }

  /** Libellés des pastilles d'étapes (adaptés au transfert). */
  function libellesEtapes() {
    return [
      'Type',
      estTransfert() ? 'Source' : 'Machine',
      estTransfert() ? 'Destination' : 'Bouteille',
      'Pesées',
      'Contrôle',
      'Signature'
    ];
  }

  /* ----------------------------------------------------------
     Filtres de compatibilité (miroir des règles du store)
     ---------------------------------------------------------- */

  /** Machines proposées à l'étape 2 selon le type de mouvement. */
  function machinesCompatibles() {
    return machines.filter((m) => {
      if (m.statut === 'DEMANTELEE') return false;
      // Une récupération suppose du fluide à extraire
      if (estRecuperation() && m.chargeActuelleKg <= 0) return false;
      return true;
    });
  }

  /** Bouteilles sources possibles pour un transfert (étape 2). */
  function bouteillesSourcesTransfert() {
    return bouteilles.filter((b) => b.masseNetteKg > 0);
  }

  /** Bouteilles proposées à l'étape 3 selon le contexte. */
  function bouteillesEtape3() {
    if (estCharge()) {
      const machine = machineChoisie();
      if (!machine) return [];
      return bouteilles.filter((b) =>
        b.fluide === machine.fluide && b.masseNetteKg > 0);
    }
    if (estRecuperation()) {
      const machine = machineChoisie();
      if (!machine) return [];
      return bouteilles.filter((b) =>
        b.type === 'RECUPERATION' && b.fluide === machine.fluide);
    }
    // Transfert : destination de même fluide, différente de la source,
    // avec de la place restante
    const source = bouteilleSrc();
    if (!source) return [];
    return bouteilles.filter((b) =>
      b.id !== source.id &&
      b.fluide === source.fluide &&
      arrondir(b.contenanceMaxKg - b.masseNetteKg) > 0);
  }

  /* ----------------------------------------------------------
     Validation en direct des pesées (mêmes règles que le store)
     ---------------------------------------------------------- */

  /**
   * Vérifie les pesées saisies.
   * @returns {{ ok: boolean, quantite: number|null, erreurs: string[] }}
   */
  function verifierPesees() {
    const avant = Number(etat.peseeAvant);
    const apres = Number(etat.peseeApres);
    const saisies = etat.peseeAvant !== '' && etat.peseeApres !== ''
      && Number.isFinite(avant) && Number.isFinite(apres);
    if (!saisies) return { ok: false, quantite: null, erreurs: [] };

    const erreurs = [];
    const machine = machineChoisie();

    if (estRecuperation()) {
      // La bouteille de récupération se remplit : après > avant
      const quantite = arrondir(apres - avant);
      const destination = bouteilleDst();
      if (quantite <= 0) {
        erreurs.push('Pesées incohérentes : la bouteille de récupération '
          + 'doit se remplir (pesée après > pesée avant).');
        return { ok: false, quantite: null, erreurs };
      }
      if (machine && quantite > machine.chargeActuelleKg) {
        erreurs.push(`Incohérence : la machine ${machine.code} ne contient `
          + `que ${fmtNombre(machine.chargeActuelleKg, 2)} kg de fluide.`);
      }
      if (destination &&
          arrondir(destination.masseNetteKg + quantite) > destination.contenanceMaxKg) {
        erreurs.push(`Débordement : la bouteille ${destination.code} `
          + `dépasserait sa contenance (${fmtNombre(destination.contenanceMaxKg, 2)} kg).`);
      }
      return { ok: erreurs.length === 0, quantite, erreurs };
    }

    // Charge, complément ou transfert : la bouteille source se vide
    const quantite = arrondir(avant - apres);
    const source = bouteilleSrc();
    if (quantite <= 0) {
      erreurs.push('Pesées incohérentes : la bouteille source doit se vider '
        + '(pesée avant > pesée après).');
      return { ok: false, quantite: null, erreurs };
    }
    if (source && quantite > source.masseNetteKg) {
      erreurs.push(`Stock insuffisant : la bouteille ${source.code} ne `
        + `contient que ${fmtNombre(source.masseNetteKg, 2)} kg.`);
    }
    if (estCharge() && machine) {
      const plafond = arrondir(machine.chargeNominaleKg * 1.05);
      if (arrondir(machine.chargeActuelleKg + quantite) > plafond) {
        erreurs.push(`Surcharge : la machine ${machine.code} dépasserait sa `
          + `charge nominale de ${fmtNombre(machine.chargeNominaleKg, 2)} kg `
          + '(tolérance 5 %).');
      }
    }
    if (estTransfert()) {
      const destination = bouteilleDst();
      if (destination &&
          arrondir(destination.masseNetteKg + quantite) > destination.contenanceMaxKg) {
        erreurs.push(`Débordement : la bouteille ${destination.code} `
          + `dépasserait sa contenance (${fmtNombre(destination.contenanceMaxKg, 2)} kg).`);
      }
    }
    return { ok: erreurs.length === 0, quantite, erreurs };
  }

  /** L'étape courante est-elle complète (Continuer actif) ? */
  function etapeComplete() {
    switch (etat.etape) {
      case 1:
        return Boolean(etat.carteType && etat.technicienId);
      case 2:
        return estTransfert()
          ? Boolean(etat.bouteilleSrcId)
          : Boolean(etat.machineId);
      case 3:
        return estCharge()
          ? Boolean(etat.bouteilleSrcId)
          : Boolean(etat.bouteilleDstId);
      case 4:
        return verifierPesees().ok;
      case 5:
        return etat.statutControle === 'SANS_OBJET'
          || Boolean(etat.statutControle && etat.detecteurId);
      case 6:
        return !finalisationEnCours;
      default:
        return false;
    }
  }

  /** Des données ont-elles été saisies (confirmation avant abandon) ? */
  function donneesSaisies() {
    return Boolean(etat.carteType || etat.technicienId
      || etat.bouteilleSrcId || etat.bouteilleDstId
      || etat.peseeAvant !== '' || etat.peseeApres !== ''
      || etat.statutControle
      || (etat.machineId && etat.machineId !== (options.machineId || null)));
  }

  /* ----------------------------------------------------------
     Construction de la modale
     ---------------------------------------------------------- */

  injecterStyles();

  const zone = document.getElementById('zone-modales') || document.body;
  const titreWizard = idBrouillonRepris
    ? 'Reprise du mouvement ' + numeroBrouillonRepris
    : 'Nouveau mouvement de fluide';
  const fond = document.createElement('div');
  fond.className = 'modale-fond';
  fond.innerHTML =
    '<div class="modale modale-wizard" role="dialog" aria-modal="true"'
    + ' aria-label="' + esc(titreWizard) + '">'
    + '<div class="modale-entete">'
    + '<h3 class="modale-titre">' + esc(titreWizard) + '</h3>'
    + '<button class="modale-fermer" type="button" aria-label="Fermer">'
    + ICONES.croix + '</button>'
    + '</div>'
    + '<div class="wizard-etapes" id="wizard-etapes"></div>'
    + '<div class="modale-corps"><div class="wizard-corps" id="wizard-corps"></div></div>'
    + '<div class="modale-actions wizard-pied-actions">'
    + '<button type="button" class="btn btn-secondaire" id="wizard-retour">Retour</button>'
    + '<button type="button" class="btn btn-secondaire" id="wizard-annuler">Annuler</button>'
    + '<button type="button" class="btn btn-primaire" id="wizard-continuer">Continuer</button>'
    + '</div>'
    + '</div>';

  const corpsEl = fond.querySelector('#wizard-corps');
  const etapesEl = fond.querySelector('#wizard-etapes');
  const boutonRetour = fond.querySelector('#wizard-retour');
  const boutonAnnuler = fond.querySelector('#wizard-annuler');
  const boutonContinuer = fond.querySelector('#wizard-continuer');

  let fermee = false;

  /** Ferme la modale sans confirmation (fin de parcours ou abandon acté). */
  function fermer() {
    if (fermee) return;
    fermee = true;
    document.removeEventListener('keydown', surTouche);
    fond.classList.remove('visible');
    setTimeout(function () { fond.remove(); }, 220);
  }

  /**
   * CR-1 : purge silencieuse de l'écriture créée par une finalisation
   * en échec (abandon du wizard, retour en arrière) — aucun orphelin
   * BROUILLON/SOUMIS ne doit survivre à l'assistant. Un mouvement
   * resté SOUMIS est d'abord rejeté (retour brouillon) puis supprimé.
   * Le brouillon REPRIS (idBrouillonRepris) n'est jamais purgé ici :
   * abandonner une reprise le laisse intact dans la vue Mouvements.
   */
  async function purgerEcritureEnCours() {
    if (!idMouvementCree) return;
    const id = idMouvementCree;
    const soumis = mouvementSoumis;
    idMouvementCree = null;
    numeroMouvementCree = null;
    mouvementSoumis = false;
    try {
      if (soumis) {
        await store.rejeterMouvement(id, 'Abandon de la saisie dans l’assistant.');
      }
      await store.supprimerMouvement(id);
    } catch {
      // Silencieux : au pire, l'écriture reste actionnable dans la vue
    }
  }

  /** Demande confirmation avant d'abandonner si des données sont saisies. */
  function demanderFermeture() {
    if (finalisationEnCours) return;
    if (!donneesSaisies()
        || window.confirm('Abandonner ce mouvement ? '
          + 'Les informations saisies seront perdues.')) {
      purgerEcritureEnCours();
      fermer();
    }
  }

  function surTouche(evenement) {
    if (evenement.key === 'Escape') demanderFermeture();
  }

  fond.addEventListener('click', function (evenement) {
    if (evenement.target === fond) demanderFermeture();
  });
  fond.querySelector('.modale-fermer').addEventListener('click', demanderFermeture);
  boutonAnnuler.addEventListener('click', demanderFermeture);
  document.addEventListener('keydown', surTouche);

  boutonRetour.addEventListener('click', function () {
    if (etat.etape <= 1) return;
    // Retour en arrière : un éventuel brouillon en échec est SUPPRIMÉ
    // du registre (CR-1 : pas d'orphelin), on repartira d'une écriture neuve
    purgerEcritureEnCours();
    etat.etape -= 1;
    rendreEtape();
  });

  boutonContinuer.addEventListener('click', function () {
    if (!etapeComplete()) return;
    if (etat.etape < 6) {
      etat.etape += 1;
      rendreEtape();
    } else {
      finaliser();
    }
  });

  /* ----------------------------------------------------------
     Rendu du bandeau d'étapes et du pied
     ---------------------------------------------------------- */

  function rendrePastilles() {
    const libelles = libellesEtapes();
    etapesEl.innerHTML = libelles.map(function (libelle, indice) {
      const numero = indice + 1;
      const classe = numero === etat.etape ? ' active'
        : numero < etat.etape ? ' faite' : '';
      return '<div class="wizard-etape' + classe + '">'
        + '<span class="wizard-pastille">' + numero + '</span>'
        + '<span class="wizard-etape-libelle">' + esc(libelle) + '</span>'
        + '</div>';
    }).join('');
  }

  function majPied() {
    boutonRetour.disabled = etat.etape <= 1 || finalisationEnCours;
    boutonAnnuler.disabled = finalisationEnCours;
    boutonContinuer.disabled = !etapeComplete();
    if (etat.etape < 6) {
      boutonContinuer.textContent = 'Continuer';
    } else if (finalisationEnCours) {
      boutonContinuer.textContent = 'Enregistrement…';
    } else {
      boutonContinuer.textContent = peutValider
        ? 'Valider le mouvement'
        : 'Soumettre pour validation';
    }
  }

  /* ----------------------------------------------------------
     Étape 1 — Type & technicien
     ---------------------------------------------------------- */

  function rendreEtape1() {
    const cartes = CARTES_TYPE.map(function (carte) {
      const classe = etat.carteType === carte.id ? ' selectionnee' : '';
      return '<button type="button" class="carte-choix' + classe + '"'
        + ' data-carte-type="' + esc(carte.id) + '">'
        + '<span class="choix-titre">' + (ICONES[carte.icone] || '')
        + esc(carte.titre) + '</span>'
        + '<span class="choix-detail">' + esc(carte.detail) + '</span>'
        + '</button>';
    }).join('');

    // Interrupteur contextuel sous la grille
    let interrupteur = '';
    if (etat.carteType === 'charge') {
      interrupteur = '<label class="wizard-interrupteur">'
        + '<input type="checkbox" id="wizard-interrupteur-choix"'
        + (etat.premiereCharge ? ' checked' : '') + '>'
        + '<span>Première charge de l’équipement (mise en service)</span>'
        + '</label>';
    } else if (etat.carteType === 'recuperation') {
      interrupteur = '<label class="wizard-interrupteur">'
        + '<input type="checkbox" id="wizard-interrupteur-choix"'
        + (etat.demantelement ? ' checked' : '') + '>'
        + '<span>Démantèlement de l’équipement (récupération totale)</span>'
        + '</label>';
    }

    // Select « Technicien intervenant »
    const choix = technicienChoisi();
    const optionsTechniciens = ['<option value="">— Choisir un technicien —</option>']
      .concat(techniciens.map(function (p) {
        const role = LIBELLES_ROLES[p.roleApp] || p.roleApp;
        const selectionne = p.id === etat.technicienId ? ' selected' : '';
        return '<option value="' + esc(p.id) + '"' + selectionne + '>'
          + esc(p.prenom + ' ' + p.nom + ' (' + role + ')') + '</option>';
      })).join('');

    const bandeauEleve = (choix && choix.roleApp === 'ELEVE')
      ? '<div class="wizard-bloc">'
        + bandeauAvertissement('Élève en formation : validation par un '
          + 'référent obligatoire.')
        + '</div>'
      : '';

    corpsEl.innerHTML =
      '<div class="wizard-grille-choix">' + cartes + '</div>'
      + interrupteur
      + '<div class="wizard-bloc champ">'
      + '<label for="wizard-technicien">Technicien intervenant</label>'
      + '<select id="wizard-technicien">' + optionsTechniciens + '</select>'
      + '</div>'
      + bandeauEleve;

    // Sélection d'une carte de type : réinitialise la suite du parcours
    corpsEl.querySelectorAll('[data-carte-type]').forEach(function (bouton) {
      bouton.addEventListener('click', function () {
        const nouveau = bouton.getAttribute('data-carte-type');
        if (nouveau !== etat.carteType) {
          etat.carteType = nouveau;
          etat.machineId = options.machineId || null;
          etat.bouteilleSrcId = null;
          etat.bouteilleDstId = null;
          etat.peseeAvant = '';
          etat.peseeApres = '';
        }
        rendreEtape();
      });
    });

    const caseChoix = corpsEl.querySelector('#wizard-interrupteur-choix');
    if (caseChoix) {
      caseChoix.addEventListener('change', function () {
        if (etat.carteType === 'charge') etat.premiereCharge = caseChoix.checked;
        if (etat.carteType === 'recuperation') etat.demantelement = caseChoix.checked;
      });
    }

    corpsEl.querySelector('#wizard-technicien')
      .addEventListener('change', function (evenement) {
        etat.technicienId = evenement.target.value || null;
        rendreEtape(); // rafraîchit le bandeau élève + le bouton Continuer
      });
  }

  /* ----------------------------------------------------------
     Étape 2 — Machine (ou bouteille source pour un transfert)
     ---------------------------------------------------------- */

  /** Carte cliquable d'une machine. */
  function carteMachine(machine) {
    const classe = etat.machineId === machine.id ? ' selectionnee' : '';
    return '<button type="button" class="carte-choix' + classe + '"'
      + ' data-machine="' + esc(machine.id) + '">'
      + '<span class="choix-ligne">'
      + '<span class="choix-titre">' + esc(machine.code + ' — ' + machine.designation) + '</span>'
      + chipStatut(machine.statut)
      + '</span>'
      + '<span class="choix-mono">' + esc(machine.fluide) + ' · charge '
      + esc(fmtNombre(machine.chargeActuelleKg, 2)) + ' / '
      + esc(fmtNombre(machine.chargeNominaleKg, 2)) + ' kg</span>'
      + '<span class="choix-detail">' + esc(machine.localisation || machine.siteLabel || '') + '</span>'
      + '</button>';
  }

  /** Carte cliquable d'une bouteille. */
  function carteBouteille(bouteille, attribut) {
    const idChoisi = attribut === 'data-bouteille-src'
      ? etat.bouteilleSrcId : etat.bouteilleDstId;
    const classe = idChoisi === bouteille.id ? ' selectionnee' : '';
    return '<button type="button" class="carte-choix' + classe + '"'
      + ' ' + attribut + '="' + esc(bouteille.id) + '">'
      + '<span class="choix-ligne">'
      + '<span class="choix-titre">' + esc(bouteille.code) + '</span>'
      + chipStatut(bouteille.type)
      + '</span>'
      + '<span class="choix-mono">' + esc(bouteille.fluide) + ' · '
      + esc(fmtNombre(bouteille.masseNetteKg, 1)) + ' / '
      + esc(fmtNombre(bouteille.contenanceMaxKg, 1)) + ' kg</span>'
      + '<span class="choix-detail">'
      + esc((bouteille.proprietaire || '—') + (bouteille.lot ? ' · ' + bouteille.lot : ''))
      + '</span>'
      + '</button>';
  }

  function rendreEtape2() {
    if (estTransfert()) {
      // Transfert : choisir la bouteille SOURCE
      const sources = bouteillesSourcesTransfert();
      if (!sources.length) {
        corpsEl.innerHTML = bandeauErreur('Aucune bouteille contenant du '
          + 'fluide n’est disponible : transfert impossible.');
        return;
      }
      corpsEl.innerHTML =
        '<p class="wizard-sens" style="margin:0 0 12px">Choisissez la '
        + 'bouteille source (celle qui se vide).</p>'
        + '<div class="wizard-grille-choix">'
        + sources.map(function (b) { return carteBouteille(b, 'data-bouteille-src'); }).join('')
        + '</div>';
      corpsEl.querySelectorAll('[data-bouteille-src]').forEach(function (bouton) {
        bouton.addEventListener('click', function () {
          const nouveau = bouton.getAttribute('data-bouteille-src');
          if (nouveau !== etat.bouteilleSrcId) {
            etat.bouteilleSrcId = nouveau;
            etat.bouteilleDstId = null;
            etat.peseeAvant = '';
            etat.peseeApres = '';
          }
          rendreEtape();
        });
      });
      return;
    }

    // Charge / récupération : choisir la MACHINE
    const compatibles = machinesCompatibles();
    if (!compatibles.length) {
      corpsEl.innerHTML = bandeauErreur('Aucune machine compatible avec ce '
        + 'type de mouvement dans le parc.');
      return;
    }
    corpsEl.innerHTML = '<div class="wizard-grille-choix">'
      + compatibles.map(carteMachine).join('') + '</div>';
    corpsEl.querySelectorAll('[data-machine]').forEach(function (bouton) {
      bouton.addEventListener('click', function () {
        const nouveau = bouton.getAttribute('data-machine');
        if (nouveau !== etat.machineId) {
          etat.machineId = nouveau;
          etat.bouteilleSrcId = null;
          etat.bouteilleDstId = null;
          etat.peseeAvant = '';
          etat.peseeApres = '';
        }
        rendreEtape();
      });
    });
  }

  /* ----------------------------------------------------------
     Étape 3 — Bouteille (source, destination ou récupération)
     ---------------------------------------------------------- */

  function rendreEtape3() {
    const compatibles = bouteillesEtape3();
    const machine = machineChoisie();

    if (!compatibles.length) {
      let message;
      if (estCharge()) {
        message = 'Aucune bouteille de ' + (machine ? machine.fluide : 'fluide')
          + ' contenant du fluide n’est disponible en stock : charge impossible.';
      } else if (estRecuperation()) {
        message = 'Aucune bouteille de récupération compatible '
          + (machine ? machine.fluide : '') + ' en stock : créez-en une dans '
          + '« Stock bouteilles » avant de récupérer.';
      } else {
        const source = bouteilleSrc();
        message = 'Aucune bouteille de destination compatible '
          + (source ? source.fluide : '') + ' avec de la place disponible : '
          + 'transfert impossible.';
      }
      corpsEl.innerHTML = bandeauErreur(message);
      return;
    }

    const attribut = estCharge() ? 'data-bouteille-src' : 'data-bouteille-dst';
    const consigne = estCharge()
      ? 'Choisissez la bouteille source (celle qui se vide dans la machine).'
      : estRecuperation()
        ? 'Choisissez la bouteille de récupération (celle qui se remplit).'
        : 'Choisissez la bouteille de destination (celle qui se remplit).';

    corpsEl.innerHTML =
      '<p class="wizard-sens" style="margin:0 0 12px">' + esc(consigne) + '</p>'
      + '<div class="wizard-grille-choix">'
      + compatibles.map(function (b) { return carteBouteille(b, attribut); }).join('')
      + '</div>';

    corpsEl.querySelectorAll('[' + attribut + ']').forEach(function (bouton) {
      bouton.addEventListener('click', function () {
        const nouveau = bouton.getAttribute(attribut);
        if (estCharge()) {
          if (nouveau !== etat.bouteilleSrcId) {
            etat.bouteilleSrcId = nouveau;
            etat.peseeAvant = '';
            etat.peseeApres = '';
          }
        } else if (nouveau !== etat.bouteilleDstId) {
          etat.bouteilleDstId = nouveau;
          etat.peseeAvant = '';
          etat.peseeApres = '';
        }
        rendreEtape();
      });
    });
  }

  /* ----------------------------------------------------------
     Étape 4 — Pesées
     ---------------------------------------------------------- */

  function rendreEtape4() {
    const bouteille = bouteillePesee();

    // Préremplissage : la pesée avant part de la masse brute connue
    if (etat.peseeAvant === '' && bouteille) {
      etat.peseeAvant = String(bouteille.masseBruteKg);
    }

    const rappel = estRecuperation()
      ? 'La bouteille ' + (bouteille ? bouteille.code : '') + ' se remplit : '
        + 'la pesée après doit être supérieure à la pesée avant.'
      : 'La bouteille ' + (bouteille ? bouteille.code : '') + ' se vide : '
        + 'la pesée avant doit être supérieure à la pesée après.';

    corpsEl.innerHTML =
      '<div class="grille-form-2">'
      + '<div class="champ">'
      + '<label for="wizard-pesee-avant">Pesée avant</label>'
      + '<div class="champ-unite" data-unite="kg">'
      + '<input type="number" id="wizard-pesee-avant" min="0" step="0.01"'
      + ' inputmode="decimal" value="' + esc(etat.peseeAvant) + '">'
      + '</div>'
      + '</div>'
      + '<div class="champ">'
      + '<label for="wizard-pesee-apres">Pesée après</label>'
      + '<div class="champ-unite" data-unite="kg">'
      + '<input type="number" id="wizard-pesee-apres" min="0" step="0.01"'
      + ' inputmode="decimal" value="' + esc(etat.peseeApres) + '">'
      + '</div>'
      + '</div>'
      + '</div>'
      + '<div class="wizard-encart">'
      + '<span class="wizard-encart-libelle">Quantité</span>'
      + '<span class="wizard-encart-valeur" id="wizard-quantite">—</span>'
      + '</div>'
      + '<p class="wizard-sens">' + esc(rappel) + '</p>'
      + '<div class="wizard-bloc" id="wizard-pesees-erreurs"></div>';

    const champAvant = corpsEl.querySelector('#wizard-pesee-avant');
    const champApres = corpsEl.querySelector('#wizard-pesee-apres');
    const affichageQuantite = corpsEl.querySelector('#wizard-quantite');
    const zoneErreurs = corpsEl.querySelector('#wizard-pesees-erreurs');

    /** Recalcule quantité + erreurs en direct, sans re-rendre l'étape. */
    function majPesees() {
      etat.peseeAvant = champAvant.value;
      etat.peseeApres = champApres.value;
      const controle = verifierPesees();
      affichageQuantite.textContent = controle.quantite !== null
        ? fmtKg(controle.quantite)
        : '—';
      zoneErreurs.innerHTML = controle.erreurs.map(bandeauErreur).join('');
      majPied();
    }

    champAvant.addEventListener('input', majPesees);
    champApres.addEventListener('input', majPesees);
    majPesees();
  }

  /* ----------------------------------------------------------
     Étape 5 — Contrôle d'étanchéité
     ---------------------------------------------------------- */

  function rendreEtape5() {
    const cartes = CARTES_CONTROLE.map(function (carte) {
      const classe = etat.statutControle === carte.id ? ' selectionnee' : '';
      return '<button type="button" class="carte-choix' + classe + '"'
        + ' data-controle="' + esc(carte.id) + '">'
        + '<span class="choix-titre">' + (ICONES[carte.icone] || '')
        + esc(carte.titre) + '</span>'
        + '<span class="choix-detail">' + esc(carte.detail) + '</span>'
        + '</button>';
    }).join('');

    // Select détecteur (uniquement si un contrôle a été réalisé)
    let blocDetecteur = '';
    if (etat.statutControle === 'CONFORME' || etat.statutControle === 'FUITE') {
      if (!detecteurs.length) {
        blocDetecteur = '<div class="wizard-bloc">'
          + bandeauErreur('Aucun détecteur de fuite dans l’outillage : '
            + 'impossible de tracer ce contrôle.')
          + '</div>';
      } else {
        const optionsDetecteurs = ['<option value="">— Choisir un détecteur —</option>']
          .concat(detecteurs.map(function (d) {
            const selectionne = d.id === etat.detecteurId ? ' selected' : '';
            return '<option value="' + esc(d.id) + '"' + selectionne + '>'
              + esc(d.marque + ' ' + d.modele + ' (n° ' + d.numSerie + ')')
              + '</option>';
          })).join('');
        const detecteur = detecteurs.find(function (d) { return d.id === etat.detecteurId; });
        const bandeauExpire = (detecteur && detecteur.statut === 'EXPIRE')
          ? '<div class="wizard-bloc">'
            + bandeauAvertissement('Étalonnage expiré : ce détecteur devait '
              + 'être réétalonné avant le '
              + fmtDate(detecteur.prochaineEcheance) + '.')
            + '</div>'
          : '';
        blocDetecteur = '<div class="wizard-bloc champ">'
          + '<label for="wizard-detecteur">Détecteur utilisé</label>'
          + '<select id="wizard-detecteur">' + optionsDetecteurs + '</select>'
          + '</div>'
          + bandeauExpire;
      }
    }

    corpsEl.innerHTML =
      '<div class="wizard-grille-choix wizard-grille-3">' + cartes + '</div>'
      + blocDetecteur;

    corpsEl.querySelectorAll('[data-controle]').forEach(function (bouton) {
      bouton.addEventListener('click', function () {
        const nouveau = bouton.getAttribute('data-controle');
        if (nouveau !== etat.statutControle) {
          etat.statutControle = nouveau;
          if (nouveau === 'SANS_OBJET') etat.detecteurId = null;
        }
        rendreEtape();
      });
    });

    const selectDetecteur = corpsEl.querySelector('#wizard-detecteur');
    if (selectDetecteur) {
      selectDetecteur.addEventListener('change', function (evenement) {
        etat.detecteurId = evenement.target.value || null;
        rendreEtape(); // rafraîchit le bandeau « étalonnage expiré »
      });
    }
  }

  /* ----------------------------------------------------------
     Étape 6 — Signature & récapitulatif
     ---------------------------------------------------------- */

  /** Une ligne du récapitulatif (valeur en HTML déjà échappé). */
  function ligneRecap(libelle, valeurHtml) {
    return '<div class="wizard-recap-ligne">'
      + '<span class="wizard-recap-libelle">' + esc(libelle) + '</span>'
      + '<span class="wizard-recap-valeur">' + valeurHtml + '</span>'
      + '</div>';
  }

  function rendreEtape6() {
    const type = typeMouvement();
    const machine = machineChoisie();
    const source = bouteilleSrc();
    const destination = bouteilleDst();
    const technicien = technicienChoisi();
    const controlePesees = verifierPesees();
    const quantite = controlePesees.quantite;
    // Convention d'affichage : récupération = quantité négative
    const quantiteSignee = quantite === null ? null
      : (estRecuperation() ? -quantite : quantite);

    const lignes = [];
    lignes.push(ligneRecap('Type', chipType(type)
      + (etat.carteType === 'recuperation' && etat.demantelement
        ? ' <span class="choix-detail">(démantèlement)</span>' : '')));
    if (machine) {
      lignes.push(ligneRecap('Machine',
        esc(machine.code + ' — ' + machine.designation)));
    }
    if (source) {
      lignes.push(ligneRecap(estTransfert() ? 'Bouteille source' : 'Bouteille',
        esc(source.code + ' · ' + source.fluide)));
    }
    if (destination) {
      lignes.push(ligneRecap(
        estRecuperation() ? 'Bouteille de récupération' : 'Bouteille de destination',
        esc(destination.code + ' · ' + destination.fluide)));
    }
    lignes.push(ligneRecap('Pesées',
      '<span class="cellule-mono">' + esc(fmtKg(Number(etat.peseeAvant)))
      + ' → ' + esc(fmtKg(Number(etat.peseeApres))) + '</span>'));
    lignes.push(ligneRecap('Quantité',
      '<span class="cellule-mono '
      + (quantiteSignee !== null && quantiteSignee < 0
        ? 'quantite-negative' : 'quantite-positive') + '">'
      + esc(quantiteSignee !== null ? fmtKgSigne(quantiteSignee) : '—')
      + '</span>'));

    let texteControle = 'Sans objet';
    if (etat.statutControle === 'CONFORME' || etat.statutControle === 'FUITE') {
      const detecteur = detecteurs.find(function (d) { return d.id === etat.detecteurId; });
      texteControle = (etat.statutControle === 'CONFORME' ? 'Conforme' : 'Fuite détectée')
        + (detecteur ? ' · ' + detecteur.marque + ' ' + detecteur.modele : '');
    }
    lignes.push(ligneRecap('Contrôle d’étanchéité', esc(texteControle)));
    if (technicien) {
      const role = LIBELLES_ROLES[technicien.roleApp] || technicien.roleApp;
      lignes.push(ligneRecap('Technicien',
        esc(technicien.prenom + ' ' + technicien.nom + ' (' + role + ')')));
    }

    const bandeauEleve = (technicien && technicien.roleApp === 'ELEVE' && !peutValider)
      ? bandeauAvertissement('Élève en formation : ce mouvement sera soumis '
        + 'pour validation par un référent.')
      : '';

    corpsEl.innerHTML =
      '<div class="wizard-recap">' + lignes.join('') + '</div>'
      + bandeauEleve
      // Le libellé « Signature du technicien » est rendu par creerSignature
      + '<div id="wizard-signature"></div>'
      + '<div class="wizard-bloc" id="wizard-finalisation-erreurs"></div>';

    // Canvas de signature (module développé en parallèle, API stable)
    signature = creerSignature(corpsEl.querySelector('#wizard-signature'));
  }

  /* ----------------------------------------------------------
     Finalisation : créer → soumettre → (valider si possible)
     ---------------------------------------------------------- */

  async function finaliser() {
    if (finalisationEnCours) return;
    const zoneErreurs = corpsEl.querySelector('#wizard-finalisation-erreurs');
    zoneErreurs.innerHTML = '';

    // Signature obligatoire avant l'enregistrement
    if (!signature || signature.estVide()) {
      zoneErreurs.innerHTML = bandeauErreur('Signature obligatoire : signez '
        + 'dans le cadre avant de finaliser le mouvement.');
      return;
    }

    finalisationEnCours = true;
    majPied();

    const technicien = technicienChoisi();

    try {
      // 1. Création du brouillon (sauf nouvel essai après un échec)
      if (!idMouvementCree) {
        const mouvement = await store.creerMouvement({
          type: typeMouvement(),
          mode: 'FORMATION',
          machineId: estTransfert() ? null : etat.machineId,
          bouteilleSrcId: estRecuperation() ? null : etat.bouteilleSrcId,
          bouteilleDstId: estCharge() ? null : etat.bouteilleDstId,
          peseeAvantKg: Number(etat.peseeAvant),
          peseeApresKg: Number(etat.peseeApres),
          causeMouvement: null,
          controle: {
            statutControle: etat.statutControle,
            detecteurId: etat.detecteurId
          },
          signatureDataUrl: signature.dataURL(),
          technicien: technicien ? technicien.prenom + ' ' + technicien.nom : null
        });
        idMouvementCree = mouvement.id;
        numeroMouvementCree = mouvement.numero;
      }

      // 2. Soumission
      if (!mouvementSoumis) {
        await store.soumettreMouvement(idMouvementCree);
        mouvementSoumis = true;
      }

      // 3. Validation si l'utilisateur courant en a le droit
      if (peutValider) {
        await store.validerMouvement(idMouvementCree, utilisateur.id);
        toast('Mouvement ' + numeroMouvementCree
          + ' validé et inscrit au registre.', 'succes');
      } else {
        toast('Mouvement ' + numeroMouvementCree
          + ' soumis pour validation.', 'succes');
      }

      // 4. Reprise aboutie : l'ancien brouillon est remplacé par
      // l'écriture neuve — suppression silencieuse, jamais de doublon.
      // (Tant que la finalisation n'a pas abouti, il reste intact.)
      if (idBrouillonRepris && idBrouillonRepris !== idMouvementCree) {
        try {
          await store.supprimerMouvement(idBrouillonRepris);
        } catch {
          // Déjà supprimé ou statut changé entre-temps : sans gravité
        }
        idBrouillonRepris = null;
      }

      fermer();
      ctx.naviguer('mouvements');

    } catch (erreur) {
      // Erreur du store : affichée SANS fermer le wizard
      finalisationEnCours = false;
      majPied();
      zoneErreurs.innerHTML = bandeauErreur(erreur && erreur.message
        ? erreur.message
        : 'Erreur inattendue lors de l’enregistrement du mouvement.');
    }
  }

  /* ----------------------------------------------------------
     Aiguillage du rendu
     ---------------------------------------------------------- */

  function rendreEtape() {
    rendrePastilles();
    signature = null;
    switch (etat.etape) {
      case 1: rendreEtape1(); break;
      case 2: rendreEtape2(); break;
      case 3: rendreEtape3(); break;
      case 4: rendreEtape4(); break;
      case 5: rendreEtape5(); break;
      case 6: rendreEtape6(); break;
    }
    majPied();
  }

  zone.appendChild(fond);
  requestAnimationFrame(function () { fond.classList.add('visible'); });
  rendreEtape();
}
