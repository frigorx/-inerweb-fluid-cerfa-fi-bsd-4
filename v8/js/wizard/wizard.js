// ============================================================
// inerWeb Fluide v8 — assistant « Nouveau mouvement de fluide »
// Modale large en 6 étapes : Type · Machine · Bouteille ·
// Pesées · Contrôle · Signature. Les règles métier du store
// sont MIROITÉES en direct (pesées, croisements, dépassements)
// pour guider l'utilisateur avant la validation réelle.
// Aucun accès DOM à l'import du module.
// ============================================================

import { toast, chipStatut, chipType, modale, ICONES, confirmer } from '../views/communs.js';
import { esc, fmtNombre, fmtKg, fmtKgSigne, fmtDate, nombreFr } from '../core/utils.js';
import { creerSignature } from './signature.js';
import { ouvrirFormMachine } from '../modales/machine-form.js';
import { ouvrirFormBouteille } from '../modales/bouteille-form.js';

/** Rôles autorisés à valider une écriture (contrat Phase B). */
const ROLES_VALIDEURS = ['REFERENT', 'ENSEIGNANT', 'ADMIN'];

/** Libellés courts des rôles applicatifs pour le select technicien. */
const LIBELLES_ROLES = {
  ADMIN: 'Admin',
  REFERENT: 'Référent',
  ENSEIGNANT: 'Enseignant',
  ELEVE: 'Élève'
};

/** Les 5 grandes cartes de l'étape 1 (IM-15 : « Autre intervention »). */
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
  },
  {
    id: 'autre',
    icone: 'engrenage',
    titre: 'Autre intervention',
    detail: 'Assemblage, modification ou autre intervention avec charge de fluide.'
  }
];

/**
 * IM-15 : natures d'intervention de la carte « Autre intervention ».
 * Le registre ne connaissant que 5 types de mouvements, l'écriture
 * est enregistrée en CHARGE_APPOINT (mêmes effets stocks) et la
 * nature réelle est tracée dans causeMouvement (cadre 14 du CERFA).
 */
const NATURES_AUTRE = {
  ASSEMBLAGE: {
    court: 'Assemblage',
    libelle: 'Assemblage (tuyauteries, raccordements)'
  },
  MODIFICATION: {
    court: 'Modification / transformation',
    libelle: 'Modification / transformation de l’équipement'
  },
  AUTRE: {
    court: 'Autre',
    libelle: 'Autre intervention (préciser)'
  }
};

/** IM-14 : causes de mouvement proposées (cadre 14 du CERFA). */
const CAUSES_MOUVEMENT = {
  FUITE: 'Fuite',
  MAINTENANCE: 'Maintenance',
  REMPLACEMENT_COMPOSANT: 'Remplacement de composant',
  MISE_AU_REBUT: 'Mise au rebut',
  EXERCICE_PEDAGOGIQUE: 'Exercice pédagogique',
  AUTRE: 'Autre (préciser)'
};

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
 * @param {{ machineId?: string, brouillonId?: string, typeInitial?: string,
 *           retour?: string }} [options]
 *   machineId — préciblage d'une machine ;
 *   brouillonId — CR-1 : reprise d'un mouvement resté en BROUILLON
 *   (l'assistant est préchargé avec ses données ; à la validation,
 *   une écriture neuve remplace l'ancien brouillon, jamais de doublon) ;
 *   typeInitial — préselection de la carte type de l'étape 1 (ex. 'appoint'
 *   pour « Complément de charge ») ; ignorée si elle ne correspond à aucune
 *   carte connue, et toujours modifiable ensuite par l'utilisateur ;
 *   retour — vue à ouvrir après une finalisation réussie (par défaut
 *   'mouvements').
 * @returns {Promise<void>}
 */
export async function ouvrirWizard(ctx, options = {}) {
  const { store } = ctx;

  // ---- Instantané des données (le store rend des copies) ----
  // Utilisateur courant : lu à part et tolérant à l'échec (base fraîche,
  // session absente...) — un utilisateur null dégrade proprement le
  // wizard (pas de validateur pressenti) plutôt que de le faire planter.
  let utilisateur = null;
  try {
    utilisateur = await store.getUtilisateurCourant();
  } catch {
    // Aucun utilisateur courant : la validation restera fermée (peutValider = false)
  }

  const [personnel, machines, bouteilles, outillage] =
    await Promise.all([
      store.getPersonnel(),
      store.getMachines(),
      store.getBouteilles(),
      store.getOutillage()
    ]);

  const techniciens = personnel.filter((p) => p.actif);
  const detecteurs = outillage.filter((o) => o.typeOutil === 'DETECTEUR');
  const peutValider = Boolean(utilisateur && ROLES_VALIDEURS.includes(utilisateur.roleApp));

  /**
   * Recharge l'instantané des machines depuis le store en le mutant
   * EN PLACE (le tableau reste la même référence : les fonctions qui
   * l'ont capturé continuent de lire les valeurs à jour).
   */
  async function rechargerMachines() {
    const fraiches = await store.getMachines();
    machines.length = 0;
    machines.push(...fraiches);
  }

  /** Idem pour les bouteilles (voir rechargerMachines). */
  async function rechargerBouteilles() {
    const fraiches = await store.getBouteilles();
    bouteilles.length = 0;
    bouteilles.push(...fraiches);
  }

  // Préselection de la carte type (ex. « Compléter la charge » depuis la
  // fiche machine) : n'a d'effet que si la valeur correspond à une carte
  // réelle de l'étape 1 ; sinon ignorée silencieusement (pas de crash sur
  // une valeur inattendue). L'utilisateur peut toujours changer de carte.
  const carteTypeInitiale = CARTES_TYPE.some((c) => c.id === options.typeInitial)
    ? options.typeInitial
    : null;

  // ---- État du wizard ----
  const etat = {
    etape: 1,
    carteType: carteTypeInitiale, // 'charge' | 'appoint' | 'recuperation' | 'transfert' | 'autre'
    premiereCharge: false,  // interrupteur de la carte Charge / Mise en service
    demantelement: false,   // interrupteur de la carte Récupération
    natureAutre: null,      // IM-15 : 'ASSEMBLAGE' | 'MODIFICATION' | 'AUTRE'
    natureAutreDetail: '',  // IM-15 : texte libre si natureAutre === 'AUTRE'
    causeMouvement: null,   // IM-14 : clé de CAUSES_MOUVEMENT (facultatif)
    causeDetail: '',        // IM-14 : texte libre si causeMouvement === 'AUTRE'
    technicienId: null,
    machineId: options.machineId || null,
    bouteilleSrcId: null,
    bouteilleDstId: null,
    peseeAvant: '',         // chaînes brutes des champs (kg)
    peseeApres: '',
    statutControle: null,   // 'SANS_OBJET' | 'CONFORME' | 'FUITE'
    detecteurId: null,
    localisationFuite: ''   // R5 : localisation saisie si statutControle === 'FUITE'
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
      etat.localisationFuite = brouillon.controle?.localisationFuite ?? '';
      // IM-14 : la cause du brouillon (texte libre) est conservée telle
      // quelle via le choix « Autre » du select de l'étape 6
      if (brouillon.causeMouvement) {
        etat.causeMouvement = 'AUTRE';
        etat.causeDetail = String(brouillon.causeMouvement);
      }
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
  } else if (options.machineId) {
    // V9.1 : machine préréglée depuis la fiche machine (sans reprise de
    // brouillon) — même idiome de saut que la reprise CR-1 ci-dessus.
    // Tant que l'étape 1 (type + technicien) n'est pas complétée par
    // l'utilisateur, la boucle ne peut pas dépasser l'étape 1 : le saut
    // de l'étape 2 (choix machine, déjà connu via etat.machineId) ne
    // devient effectif qu'une fois l'étape 1 franchie.
    while (etat.etape < 6 && etapeComplete()) etat.etape += 1;
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
    // IM-15 : « Autre intervention » (assemblage, modification…) —
    // le registre n'admet que 5 types : l'écriture prend les effets
    // d'un complément de charge et la nature réelle part dans
    // causeMouvement (cadre 14 du CERFA).
    if (etat.carteType === 'autre') return 'CHARGE_APPOINT';
    return null;
  }

  function estTransfert() { return etat.carteType === 'transfert'; }
  function estRecuperation() { return etat.carteType === 'recuperation'; }
  function estCharge() {
    return etat.carteType === 'charge' || etat.carteType === 'appoint'
      || etat.carteType === 'autre';
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

  /**
   * IM-6 : miroir de verifierBouteilleEnStock (store) — une bouteille
   * sortie du stock (retournée, déchet…) ne participe plus à aucun
   * mouvement, ni comme source, ni comme destination.
   */
  function bouteilleDisponible(b) {
    return b.statut === 'EN_STOCK' || b.statut === 'EN_SERVICE';
  }

  /**
   * IM-6 : miroir de verifierSourceDeCharge (store) — une source de
   * charge ou de transfert doit contenir du fluide UTILISABLE : jamais
   * un fluide déclaré déchet ni en attente d'analyse ; pour un fluide
   * de récupération-réemploi, la décision « réutilisable » est requise.
   */
  function sourceUtilisable(b) {
    if (!bouteilleDisponible(b) || b.masseNetteKg <= 0) return false;
    if (b.etatFluide === 'DECHET' || b.decisionFluide === 'DECHET'
        || b.decisionFluide === 'A_ANALYSER') return false;
    if (b.etatFluide === 'RECUPERE' && b.decisionFluide !== 'REUTILISABLE') {
      return false;
    }
    return true;
  }

  /** Bouteilles sources possibles pour un transfert (étape 2). */
  function bouteillesSourcesTransfert() {
    return bouteilles.filter(sourceUtilisable);
  }

  /** Bouteilles proposées à l'étape 3 selon le contexte. */
  function bouteillesEtape3() {
    if (estCharge()) {
      const machine = machineChoisie();
      if (!machine) return [];
      // R2 : une bouteille MELANGE (contenu incertain) ne recharge jamais
      // une installation — miroir du garde-fou store (appliquerEffets).
      return bouteilles.filter((b) =>
        b.fluide === machine.fluide && sourceUtilisable(b) &&
        b.etatFluide !== 'MELANGE');
    }
    if (estRecuperation()) {
      const machine = machineChoisie();
      if (!machine) return [];
      // IM-6 : encore en stock et avec de la place restante.
      // R2 : une bouteille MELANGE accepte aussi un fluide différent de
      // son étiquette (on n'est pas sûr du contenu).
      return bouteilles.filter((b) =>
        b.type === 'RECUPERATION' &&
        (b.fluide === machine.fluide || b.etatFluide === 'MELANGE') &&
        bouteilleDisponible(b) &&
        arrondir(b.contenanceMaxKg - b.masseNetteKg) > 0);
    }
    // Transfert : destination de même fluide, différente de la source,
    // encore en stock (IM-6), avec de la place restante.
    // R2 : une bouteille RÉCUPÉRATION marquée MELANGE accepte aussi un
    // fluide différent (croisement relâché UNIQUEMENT vers elle) ; une
    // SOURCE MELANGE ne se transfère que vers une autre MELANGE
    // (confinement du mélange).
    // R1 : jamais vers une bouteille NEUVE (même non-vierge) ni VIERGE
    // depuis un fluide non-vierge (miroir du garde-fou store —
    // appliquerEffets TRANSFERT).
    const source = bouteilleSrc();
    if (!source) return [];
    return bouteilles.filter((b) =>
      b.id !== source.id &&
      (b.fluide === source.fluide ||
        (b.type === 'RECUPERATION' && b.etatFluide === 'MELANGE')) &&
      !((b.etatFluide === 'VIERGE' || b.type === 'NEUVE') &&
        source.etatFluide !== 'VIERGE') &&
      (source.etatFluide !== 'MELANGE' || b.etatFluide === 'MELANGE') &&
      bouteilleDisponible(b) &&
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
    // nombreFr : « 13,9 » (virgule décimale fr-FR) comme « 13.9 »
    // deviennent 13.9 — Number('13,9') vaudrait NaN (blocage silencieux).
    const avant = nombreFr(etat.peseeAvant);
    const apres = nombreFr(etat.peseeApres);
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
          + `que ${fmtNombre(machine.chargeActuelleKg, 2)} kg de fluide, `
          + `or vous récupérez ${fmtNombre(quantite, 2)} kg.`);
      }
      if (destination) {
        const nouvelleNette = arrondir(destination.masseNetteKg + quantite);
        if (nouvelleNette > destination.contenanceMaxKg) {
          erreurs.push(`Débordement : la bouteille ${destination.code} `
            + `contient déjà ${fmtNombre(destination.masseNetteKg, 2)} kg ; `
            + `y ajouter ${fmtNombre(quantite, 2)} kg donnerait `
            + `${fmtNombre(nouvelleNette, 2)} kg, au-delà de sa contenance `
            + `de ${fmtNombre(destination.contenanceMaxKg, 2)} kg.`);
        }
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
        + `contient que ${fmtNombre(source.masseNetteKg, 2)} kg, or vous `
        + `prélevez ${fmtNombre(quantite, 2)} kg.`);
    }
    if (estCharge() && machine) {
      const plafond = arrondir(machine.chargeNominaleKg * 1.05);
      const nouvelleCharge = arrondir(machine.chargeActuelleKg + quantite);
      if (nouvelleCharge > plafond) {
        erreurs.push(`Surcharge : la machine ${machine.code} contient déjà `
          + `${fmtNombre(machine.chargeActuelleKg, 2)} kg ; ajouter `
          + `${fmtNombre(quantite, 2)} kg donnerait `
          + `${fmtNombre(nouvelleCharge, 2)} kg, au-delà de la limite de `
          + `${fmtNombre(plafond, 2)} kg (charge nominale `
          + `${fmtNombre(machine.chargeNominaleKg, 2)} kg + 5 % de tolérance).`);
      }
    }
    if (estTransfert()) {
      const destination = bouteilleDst();
      if (destination) {
        const nouvelleNette = arrondir(destination.masseNetteKg + quantite);
        if (nouvelleNette > destination.contenanceMaxKg) {
          erreurs.push(`Débordement : la bouteille ${destination.code} `
            + `contient déjà ${fmtNombre(destination.masseNetteKg, 2)} kg ; `
            + `y ajouter ${fmtNombre(quantite, 2)} kg donnerait `
            + `${fmtNombre(nouvelleNette, 2)} kg, au-delà de sa contenance `
            + `de ${fmtNombre(destination.contenanceMaxKg, 2)} kg.`);
        }
      }
    }
    return { ok: erreurs.length === 0, quantite, erreurs };
  }

  /** L'étape courante est-elle complète (Continuer actif) ? */
  function etapeComplete() {
    switch (etat.etape) {
      case 1:
        if (!etat.carteType || !etat.technicienId) return false;
        // IM-15 : la carte « Autre intervention » exige une nature
        // (et son détail en texte libre pour « Autre »)
        if (etat.carteType === 'autre') {
          if (!etat.natureAutre) return false;
          if (etat.natureAutre === 'AUTRE'
              && !etat.natureAutreDetail.trim()) return false;
        }
        return true;
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
        // IM-14 : « Autre » comme cause exige le texte libre
        if (etat.causeMouvement === 'AUTRE'
            && !etat.causeDetail.trim()) return false;
        return !finalisationEnCours;
      default:
        return false;
    }
  }

  /** Des données ont-elles été saisies (confirmation avant abandon) ? */
  function donneesSaisies() {
    return Boolean(
      (etat.carteType && etat.carteType !== carteTypeInitiale) || etat.technicienId
      || etat.bouteilleSrcId || etat.bouteilleDstId
      || etat.peseeAvant !== '' || etat.peseeApres !== ''
      || etat.statutControle || etat.causeMouvement
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
  const idTitreWizard = 'wizard-titre-' + Math.random().toString(36).slice(2, 9);
  const fond = document.createElement('div');
  fond.className = 'modale-fond';
  fond.innerHTML =
    '<div class="modale modale-wizard" role="dialog" aria-modal="true"'
    + ' aria-labelledby="' + idTitreWizard + '">'
    + '<div class="modale-entete">'
    + '<h3 class="modale-titre" id="' + idTitreWizard + '">' + esc(titreWizard) + '</h3>'
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
  async function demanderFermeture() {
    if (finalisationEnCours) return;
    if (!donneesSaisies()
        || await confirmer({
          titre: 'Abandonner ce mouvement',
          message: 'Abandonner ce mouvement ? Les informations saisies seront perdues.',
          libelleConfirmer: 'Abandonner',
          danger: true
        })) {
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
      // V9.1 : machine préréglée (options.machineId, hors transfert où
      // l'étape 2 choisit une BOUTEILLE source, pas une machine) —
      // l'étape 2 est déjà acquise dès qu'on l'atteint : sautée, comme
      // à l'ouverture (CR-1). Portée volontairement restreinte à cette
      // seule étape (pas une boucle générale) pour ne jamais sauter une
      // étape du parcours normal par simple coïncidence d'un état déjà
      // rempli (ex. pesées conservées après un retour en arrière).
      if (etat.etape === 2 && options.machineId && !estTransfert() && etapeComplete()) {
        etat.etape += 1;
      }
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
    } else if (etat.carteType === 'autre') {
      // IM-15 : sous-choix de la nature d'intervention
      const optionsNature = ['<option value="">— Choisir la nature —</option>']
        .concat(Object.keys(NATURES_AUTRE).map(function (cle) {
          const selectionne = cle === etat.natureAutre ? ' selected' : '';
          return '<option value="' + esc(cle) + '"' + selectionne + '>'
            + esc(NATURES_AUTRE[cle].libelle) + '</option>';
        })).join('');
      interrupteur = '<div class="wizard-bloc champ">'
        + '<label for="wizard-nature-autre">Nature de l’intervention</label>'
        + '<select id="wizard-nature-autre">' + optionsNature + '</select>'
        + '</div>'
        + (etat.natureAutre === 'AUTRE'
          ? '<div class="wizard-bloc champ">'
            + '<label for="wizard-nature-detail">Préciser l’intervention</label>'
            + '<input type="text" id="wizard-nature-detail" maxlength="120"'
            + ' value="' + esc(etat.natureAutreDetail) + '"'
            + ' placeholder="Ex. : remplacement d’un flexible de liaison">'
            + '</div>'
          : '')
        + '<p class="wizard-sens">L’intervention est tracée au registre '
        + 'comme un mouvement de fluide (la bouteille source se vide dans '
        + 'la machine) ; sa nature est reportée sur la fiche d’intervention.</p>';
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
          etat.natureAutre = null;
          etat.natureAutreDetail = '';
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

    // IM-15 : nature de l'intervention « Autre »
    const selectNature = corpsEl.querySelector('#wizard-nature-autre');
    if (selectNature) {
      selectNature.addEventListener('change', function (evenement) {
        etat.natureAutre = evenement.target.value || null;
        rendreEtape(); // affiche/retire le champ « Préciser »
      });
    }
    const champNatureDetail = corpsEl.querySelector('#wizard-nature-detail');
    if (champNatureDetail) {
      champNatureDetail.addEventListener('input', function (evenement) {
        etat.natureAutreDetail = evenement.target.value;
        majPied();
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

  /**
   * Carte « + Créer… » en tête de liste (machine ou bouteille). Réutilise
   * la charte .carte-choix ; l'attribut porté (sans valeur) sert de cible
   * au gestionnaire de clic.
   * @param {string} attribut - ex. « data-nouvelle-machine »
   * @param {string} libelle - ex. « Nouvelle machine »
   */
  function carteAjout(attribut, libelle) {
    return '<button type="button" class="carte-choix carte-choix-ajout" '
      + attribut + '>'
      + '<span class="choix-titre">' + (ICONES.plus || '+')
      + esc(libelle) + '</span>'
      + '<span class="choix-detail">Créer sans quitter l’assistant, '
      + 'puis continuer avec cet élément présélectionné.</span>'
      + '</button>';
  }

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
    // R2 : avertissement visuel — cette bouteille accepte un croisement
    // de fluides, son étiquette n'est que le gaz majoritaire.
    const chipMelange = bouteille.etatFluide === 'MELANGE'
      ? '<span class="chip chip-ambre">Mélange</span>' : '';
    return '<button type="button" class="carte-choix' + classe + '"'
      + ' ' + attribut + '="' + esc(bouteille.id) + '">'
      + '<span class="choix-ligne">'
      + '<span class="choix-titre">' + esc(bouteille.code) + '</span>'
      + chipStatut(bouteille.type) + chipMelange
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
        corpsEl.innerHTML = bandeauErreur('Aucune bouteille au fluide '
          + 'utilisable n’est disponible en stock : transfert impossible. '
          + 'Sont exclues les bouteilles sorties du stock (retournées, '
          + 'déchet) et les fluides récupérés sans décision « réutilisable ».');
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
    // La carte « + Nouvelle machine » précède toujours la liste :
    // même quand le parc est vide, on peut en créer une sans quitter.
    const messageVide = compatibles.length ? '' : bandeauErreur(
      estRecuperation()
        ? 'Aucune machine contenant du fluide à récupérer dans le parc. '
          + 'Créez-en une ci-dessous ou revenez en arrière.'
        : 'Aucune machine dans le parc. Créez-en une ci-dessous.');
    corpsEl.innerHTML = messageVide
      + '<div class="wizard-grille-choix">'
      + carteAjout('data-nouvelle-machine', 'Nouvelle machine')
      + compatibles.map(carteMachine).join('') + '</div>';

    corpsEl.querySelector('[data-nouvelle-machine]')
      .addEventListener('click', creerMachineALaVolee);

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

  /**
   * Ouvre le formulaire de création d'une machine SANS quitter le
   * wizard. À la création réussie : recharge l'instantané, présélectionne
   * la machine créée puis re-rend l'étape (l'utilisateur continue).
   */
  async function creerMachineALaVolee() {
    const idCree = await ouvrirFormMachine(ctx);
    if (!idCree) return; // annulation : rien ne change
    await rechargerMachines();
    // Présélection : la machine créée devient le choix courant
    if (etat.machineId !== idCree) {
      etat.machineId = idCree;
      etat.bouteilleSrcId = null;
      etat.bouteilleDstId = null;
      etat.peseeAvant = '';
      etat.peseeApres = '';
    }
    rendreEtape();
  }

  /* ----------------------------------------------------------
     Étape 3 — Bouteille (source, destination ou récupération)
     ---------------------------------------------------------- */

  function rendreEtape3() {
    const compatibles = bouteillesEtape3();
    const machine = machineChoisie();

    // Encart GUIDANT quand aucune bouteille n'est éligible (retour terrain :
    // ne pas gronder, dire le besoin) : la carte « + Nouvelle bouteille »
    // reste proposée juste en dessous — le parcours n'est jamais bloqué.
    let messageVide = '';
    if (!compatibles.length) {
      let message;
      if (estCharge()) {
        message = 'Vous avez besoin d’une bouteille de '
          + (machine ? machine.fluide : 'ce fluide')
          + ' avec du fluide utilisable. Créez-la en un clic ci-dessous.';
      } else if (estRecuperation()) {
        message = 'Vous avez besoin d’une bouteille de récupération '
          + (machine ? machine.fluide : '')
          + ' avec de la place restante. Créez-la en un clic ci-dessous.';
      } else {
        const source = bouteilleSrc();
        message = 'Vous avez besoin d’une bouteille de destination '
          + (source ? source.fluide : '')
          + ' avec de la place disponible. Créez-la en un clic ci-dessous.';
      }
      messageVide = bandeauAvertissement(message);
    }

    const attribut = estCharge() ? 'data-bouteille-src' : 'data-bouteille-dst';
    const consigne = estCharge()
      ? 'Choisissez la bouteille source (celle qui se vide dans la machine).'
      : estRecuperation()
        ? 'Choisissez la bouteille de récupération (celle qui se remplit).'
        : 'Choisissez la bouteille de destination (celle qui se remplit).';

    corpsEl.innerHTML =
      messageVide
      + '<p class="wizard-sens" style="margin:0 0 12px">' + esc(consigne) + '</p>'
      + '<div class="wizard-grille-choix">'
      + carteAjout('data-nouvelle-bouteille', 'Nouvelle bouteille')
      + compatibles.map(function (b) { return carteBouteille(b, attribut); }).join('')
      + '</div>';

    corpsEl.querySelector('[data-nouvelle-bouteille]')
      .addEventListener('click', creerBouteilleALaVolee);

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

  /**
   * Ouvre le formulaire de création d'une bouteille SANS quitter le
   * wizard. À la création réussie : recharge l'instantané et présélectionne
   * la bouteille créée SI elle passe le filtre de compatibilité (fluide,
   * type, place restante) de l'étape courante ; sinon la liste est
   * simplement rafraîchie et l'utilisateur voit pourquoi elle n'apparaît pas.
   */
  async function creerBouteilleALaVolee() {
    const idCree = await ouvrirFormBouteille(ctx);
    if (!idCree) return; // annulation : rien ne change
    await rechargerBouteilles();
    // Le filtre de compatibilité est conservé : on ne présélectionne que
    // si la bouteille créée est réellement éligible à l'étape courante.
    const eligible = bouteillesEtape3().some(function (b) { return b.id === idCree; });
    if (eligible) {
      if (estCharge()) {
        etat.bouteilleSrcId = idCree;
      } else {
        etat.bouteilleDstId = idCree;
      }
      etat.peseeAvant = '';
      etat.peseeApres = '';
    }
    rendreEtape();
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

    // R5 : localisation de la fuite (comme controle-form.js), visible
    // uniquement quand statutControle === 'FUITE'.
    let blocLocalisation = '';
    if (etat.statutControle === 'FUITE') {
      blocLocalisation = '<div class="wizard-bloc champ">'
        + '<label for="wizard-localisation-fuite">Localisation de la fuite</label>'
        + '<input type="text" id="wizard-localisation-fuite" '
        + 'value="' + esc(etat.localisationFuite) + '" '
        + 'placeholder="Ex. : raccord détendeur">'
        + '</div>';
    }

    corpsEl.innerHTML =
      '<div class="wizard-grille-choix wizard-grille-3">' + cartes + '</div>'
      + blocDetecteur
      + blocLocalisation;

    corpsEl.querySelectorAll('[data-controle]').forEach(function (bouton) {
      bouton.addEventListener('click', function () {
        const nouveau = bouton.getAttribute('data-controle');
        if (nouveau !== etat.statutControle) {
          etat.statutControle = nouveau;
          if (nouveau === 'SANS_OBJET') etat.detecteurId = null;
          if (nouveau !== 'FUITE') etat.localisationFuite = '';
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

    const champLocalisation = corpsEl.querySelector('#wizard-localisation-fuite');
    if (champLocalisation) {
      // SANS re-rendu (le focus serait perdu à chaque frappe).
      champLocalisation.addEventListener('input', function (evenement) {
        etat.localisationFuite = evenement.target.value;
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
        ? ' <span class="choix-detail">(démantèlement)</span>' : '')
      // IM-15 : nature réelle d'une « Autre intervention »
      + (etat.carteType === 'autre' && etat.natureAutre
        ? ' <span class="choix-detail">('
          + esc(etat.natureAutre === 'AUTRE'
            ? etat.natureAutreDetail.trim().toLowerCase() || 'autre'
            : NATURES_AUTRE[etat.natureAutre].court.toLowerCase())
          + ')</span>'
        : '')));
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
      '<span class="cellule-mono">' + esc(fmtKg(nombreFr(etat.peseeAvant)))
      + ' → ' + esc(fmtKg(nombreFr(etat.peseeApres))) + '</span>'));

    if (estRecuperation() && quantite !== null) {
      // Clarté : une récupération a DEUX flux opposés (la machine se vide,
      // la bouteille se remplit du même montant) — les afficher tous les
      // deux évite de croire que la bouteille perd du fluide.
      const libelleMachine = machine ? machine.code : 'Machine';
      const libelleBouteille = destination ? destination.code : 'Bouteille';
      lignes.push(ligneRecap('Quantité',
        '<span class="cellule-mono quantite-negative">'
        + esc(libelleMachine + ' : ' + fmtKgSigne(-quantite)) + '</span>'
        + '<br>'
        + '<span class="cellule-mono quantite-positive">'
        + esc(libelleBouteille + ' : ' + fmtKgSigne(quantite)) + '</span>'));
    } else {
      lignes.push(ligneRecap('Quantité',
        '<span class="cellule-mono '
        + (quantiteSignee !== null && quantiteSignee < 0
          ? 'quantite-negative' : 'quantite-positive') + '">'
        + esc(quantiteSignee !== null ? fmtKgSigne(quantiteSignee) : '—')
        + '</span>'));
    }

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

    // IM-14 : cause du mouvement (cadre 14 du CERFA), facultative
    const optionsCause = ['<option value="">— Non précisée —</option>']
      .concat(Object.keys(CAUSES_MOUVEMENT).map(function (cle) {
        const selectionne = cle === etat.causeMouvement ? ' selected' : '';
        return '<option value="' + esc(cle) + '"' + selectionne + '>'
          + esc(CAUSES_MOUVEMENT[cle]) + '</option>';
      })).join('');
    const blocCause = '<div class="wizard-bloc champ">'
      + '<label for="wizard-cause">Cause du mouvement</label>'
      + '<select id="wizard-cause">' + optionsCause + '</select>'
      + '</div>'
      + '<div class="wizard-bloc champ" id="wizard-bloc-cause-detail"'
      + (etat.causeMouvement === 'AUTRE' ? '' : ' style="display:none"') + '>'
      + '<label for="wizard-cause-detail">Préciser la cause</label>'
      + '<input type="text" id="wizard-cause-detail" maxlength="200"'
      + ' value="' + esc(etat.causeDetail) + '"'
      + ' placeholder="Ex. : casse d’un bouchon fusible">'
      + '</div>';

    corpsEl.innerHTML =
      '<div class="wizard-recap">' + lignes.join('') + '</div>'
      + bandeauEleve
      + blocCause
      // Le libellé « Signature du technicien » est rendu par creerSignature
      + '<div id="wizard-signature"></div>'
      + '<div class="wizard-bloc" id="wizard-finalisation-erreurs"></div>';

    // IM-14 : listeneurs SANS re-rendu (le canvas de signature serait
    // effacé) — bascule d'affichage directe du champ « Préciser »
    const selectCause = corpsEl.querySelector('#wizard-cause');
    const blocCauseDetail = corpsEl.querySelector('#wizard-bloc-cause-detail');
    const champCauseDetail = corpsEl.querySelector('#wizard-cause-detail');
    selectCause.addEventListener('change', function (evenement) {
      etat.causeMouvement = evenement.target.value || null;
      blocCauseDetail.style.display =
        etat.causeMouvement === 'AUTRE' ? '' : 'none';
      majPied();
    });
    champCauseDetail.addEventListener('input', function (evenement) {
      etat.causeDetail = evenement.target.value;
      majPied();
    });

    // Canvas de signature (module développé en parallèle, API stable)
    signature = creerSignature(corpsEl.querySelector('#wizard-signature'));
  }

  /**
   * IM-14 + IM-15 : texte transmis au champ causeMouvement du store
   * (repris dans les observations du cadre 14 du CERFA). Nature de
   * l'intervention (carte « Autre ») puis cause choisie, ou null.
   */
  function texteCause() {
    const parties = [];
    if (etat.carteType === 'autre' && etat.natureAutre) {
      parties.push('Intervention : '
        + (etat.natureAutre === 'AUTRE'
          ? etat.natureAutreDetail.trim()
          : NATURES_AUTRE[etat.natureAutre].court));
    }
    if (etat.causeMouvement) {
      parties.push(etat.causeMouvement === 'AUTRE'
        ? etat.causeDetail.trim()
        : 'Cause : ' + CAUSES_MOUVEMENT[etat.causeMouvement]);
    }
    return parties.length ? parties.join(' · ') : null;
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
          peseeAvantKg: nombreFr(etat.peseeAvant),
          peseeApresKg: nombreFr(etat.peseeApres),
          causeMouvement: texteCause(), // IM-14 (+ nature IM-15)
          // R5 : localisation de la fuite (propagée jusqu'au contrôle
          // enregistré à la validation — CR-3 — puis au CERFA cadre 10).
          // La clé localisationFuite n'est émise QUE renseignée : l'objet
          // controle entre dans l'empreinte SHA-256 du registre et sa
          // forme doit rester identique au round-trip SQL (une clé à null
          // casserait la chaîne à l'échange démo ↔ local).
          controle: (etat.statutControle === 'FUITE'
            && etat.localisationFuite.trim()
            ? {
              statutControle: etat.statutControle,
              detecteurId: etat.detecteurId,
              localisationFuite: etat.localisationFuite.trim()
            }
            : {
              statutControle: etat.statutControle,
              detecteurId: etat.detecteurId
            }),
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
      let proposerDemantelement = false;
      if (peutValider) {
        const valide = await store.validerMouvement(idMouvementCree, utilisateur.id);
        // IM-4 : le store signale une machine vidée par la
        // récupération-démantèlement — proposition, rien d'appliqué
        proposerDemantelement = Boolean(valide && valide.proposerDemantelement);
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
      // V9.1 : depuis la fiche machine, revient sur la fiche plutôt que
      // sur la vue Mouvements — comportement par défaut inchangé sinon.
      ctx.naviguer(options.retour || 'mouvements');

      // IM-4 : machine vide de fluide → proposer le démantèlement
      const machineVidee = machineChoisie();
      if (proposerDemantelement && machineVidee) {
        ouvrirPropositionDemantelement(machineVidee);
      }

    } catch (erreur) {
      // Erreur du store : affichée SANS fermer le wizard
      finalisationEnCours = false;
      majPied();
      zoneErreurs.innerHTML = bandeauErreur(erreur && erreur.message
        ? erreur.message
        : 'Erreur inattendue lors de l’enregistrement du mouvement.');
    }
  }

  /**
   * IM-4 : après une récupération-démantèlement validée qui vide la
   * machine, propose de la déclarer démantelée (définitif). Ouverte
   * APRÈS la fermeture du wizard, au-dessus de la vue Mouvements.
   * @param {object} machine - machine de l'instantané du wizard
   */
  function ouvrirPropositionDemantelement(machine) {
    const instance = modale({
      titre: 'Machine vide de fluide',
      contenuHtml: '<p class="modale-intro">La machine <strong>'
        + esc(machine.code + ' — ' + machine.designation)
        + '</strong> est vide de fluide. La déclarer démantelée ?</p>'
        + '<p class="wizard-sens">Le démantèlement est définitif : la '
        + 'machine sort du parc suivi (statut « Démantelée »).</p>'
        + '<div id="wizard-erreur-demantelement"></div>',
      actionsHtml: '<button type="button" class="btn btn-secondaire"'
        + ' data-action="conserver">Non, la conserver</button>'
        + '<button type="button" class="btn btn-primaire"'
        + ' data-action="demanteler">Oui, la déclarer démantelée</button>'
    });
    const racine = document.getElementById('zone-modales') || document.body;
    racine.querySelector('[data-action="conserver"]')
      .addEventListener('click', function () { instance.fermer(); });
    racine.querySelector('[data-action="demanteler"]')
      .addEventListener('click', async function () {
        try {
          const libelleAuteur = utilisateur
            ? (utilisateur.prenom + ' ' + utilisateur.nom)
            : null;
          await store.demantelerMachine(machine.id, libelleAuteur);
          toast('Machine ' + machine.code + ' déclarée démantelée.', 'succes');
          instance.fermer();
          ctx.naviguer('mouvements'); // rafraîchit la vue courante
        } catch (erreur) {
          const zoneErreur = racine.querySelector('#wizard-erreur-demantelement');
          if (zoneErreur) {
            zoneErreur.innerHTML = bandeauErreur(erreur && erreur.message
              ? erreur.message
              : 'Impossible de démanteler cette machine.');
          }
        }
      });
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
