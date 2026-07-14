// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — correction automatique du CERFA élève (brique ⑤)
//
// L'élève remplit NUMÉRIQUEMENT le CERFA 15497*04 officiel vierge
// (champs AcroForm) ; le professeur importe le PDF ; on compare champ
// par champ aux VALEURS ATTENDUES — celles que le générateur aurait
// posées pour le même mouvement/contrôle (calculerChampsCerfa :
// une seule vérité de calcul, celle du générateur).
//
// v1 ASSUMÉE : PDF remplis à l'ordinateur uniquement (pas de scan,
// pas d'écriture manuscrite — un PDF scanné n'a plus de champs).
//
// Comparaison BIENVEILLANTE sur la forme, stricte sur le fond :
// espaces/casse/apostrophes tolérés, « 3,2 » vaut « 3,20 », les
// dates 1/7/2026 et 01/07/2026 sont équivalentes — mais une valeur
// fausse est fausse. Les champs attendus VIDES comptent aussi :
// remplir une case qui devait rester vide est une erreur (l'élève
// doit savoir ce qui ne le concerne PAS).
// ============================================================

import {
  chargerPdfLib, calculerChampsCerfa, MENTION_FORMATION
} from './generateur.js';

// ------------------------------------------------------------
// Typage des champs pour une comparaison ÉQUITABLE (revue
// adversariale) : la bienveillance numérique ne vaut que pour les
// QUANTITÉS — sur un identifiant (n° d'attestation, BSFF, contenant),
// « 007 » n'est PAS « 7 », les zéros comptent.
// ------------------------------------------------------------

/** Quantités : virgule/point tolérés, valeur quasi exacte exigée. */
const CHAMPS_QUANTITE = new Set(['Equipement_Charge', '11_Quantite',
  '11_QA', '11_QB', '11_QC', '11_QD', '11_QE', '11_QDE']);

/** Équivalent CO₂ : l'élève le CALCULE lui-même → tolérance d'arrondi
 *  (±1 % ou ±0,05 t) : « 15,4 » vaut « 15,39 », pas « 14 ». */
const CHAMPS_TEQ = new Set(['Equipement_teqCO2']);

/** Dates complètes JJ/MM/AAAA (1 chiffre toléré). */
const CHAMPS_DATE = new Set(['Sign_Operateur_Date', 'Sign_Detenteur_Date']);

/** Jour/mois/année séparés : « 7 » vaut « 07 ». */
const CHAMPS_JMA = new Set(['Controle_Jour', 'Controle_Mois',
  'Controle_Annee']);

/** Pavés multi-lignes : comparés LIGNE À LIGNE sans ordre imposé,
 *  « SIRET : » toléré avec ou sans deux-points, et la mention
 *  « MODE FORMATION » (posée par l'appli, pas par l'élève) ignorée
 *  des deux côtés. */
const CHAMPS_MULTILIGNES = new Set(['Operateur', 'Detenteur',
  'Equipement_ID', '13_Instal', '14_Observations']);

// ------------------------------------------------------------
// Cadres du CERFA : rattachement et libellés français
// ------------------------------------------------------------

/** Titres des cadres officiels (pour le rapport, groupé par cadre). */
export const TITRES_CADRES = {
  'entete': 'En-tête',
  '1': 'Cadre 1 — Opérateur',
  '2': 'Cadre 2 — Détenteur',
  '3': 'Cadre 3 — Équipement',
  '4': 'Cadre 4 — Nature de l’intervention',
  '5': 'Cadre 5 — Détecteur manuel de fuite',
  '6': 'Cadre 6 — Détection permanente',
  '7': 'Cadre 7 — Seuil et fréquence de contrôle',
  '10': 'Cadre 10 — Résultat du contrôle d’étanchéité',
  '11': 'Cadre 11 — Quantités de fluide',
  '12': 'Cadre 12 — Transport',
  '13': 'Cadre 13 — Installation de destination',
  '14': 'Cadre 14 — Observations',
  'signatures': 'Signatures'
};

/** Cadre officiel d'un champ AcroForm (par motif de nom). */
export function cadreDuChamp(nom) {
  if (nom === 'Fiche_no') return 'entete';
  if (nom === 'Operateur' || nom === 'Attestation_no') return '1';
  if (nom === 'Detenteur') return '2';
  if (nom.startsWith('Equipement_')) return '3';
  if (nom.startsWith('Case_') && ['Case_Assemblage', 'Case_MiseService',
    'Case_Modif', 'Case_Maintenance', 'Case_CtrlPerio', 'Case_CtrlNonPerio',
    'Case_Demantel', 'Case_Autre'].includes(nom)) return '4';
  if (nom === 'Autre') return '4';
  if (nom === 'Detecteur_ID' || nom.startsWith('Controle_')) return '5';
  if (nom === 'Bouton_Oui') return '6';
  if (/^Case_(HCFC|HFC|HFO|Sans|Avec)_/.test(nom)) return '7';
  if (nom.startsWith('Case_Fuite_') || nom.startsWith('Case_Rep_')
    || nom.startsWith('Fuite_Loca_')) return '10';
  if (nom.startsWith('11_')) return '11';
  if (nom.startsWith('Case_12_') || nom.startsWith('Autre-FF')) return '12';
  if (nom === '13_Instal') return '13';
  if (nom === '14_Observations') return '14';
  if (nom.startsWith('Sign_')) return 'signatures';
  return 'entete';
}

/** Libellés français lisibles des champs (repli : le nom technique). */
const LIBELLES_CHAMPS = {
  'Fiche_no': 'Numéro de fiche',
  'Operateur': 'Opérateur (entreprise)',
  'Attestation_no': 'N° attestation de capacité',
  'Detenteur': 'Détenteur de l’équipement',
  'Equipement_ID': 'Identification de l’équipement',
  'Equipement_Fluide': 'Fluide (sans préfixe R-)',
  'Equipement_Charge': 'Charge nominale (kg)',
  'Equipement_teqCO2': 'Équivalent CO₂ (t)',
  'Autre': 'Autre intervention (préciser)',
  'Detecteur_ID': 'Détecteur (marque, modèle, n°)',
  'Controle_Jour': 'Étalonnage — jour',
  'Controle_Mois': 'Étalonnage — mois',
  'Controle_Annee': 'Étalonnage — année',
  'Bouton_Oui': 'Détection permanente (Oui/Non)',
  'Fuite_Loca_1': 'Localisation de fuite (ligne 1)',
  'Fuite_Loca_2': 'Localisation de fuite (ligne 2)',
  'Fuite_Loca_3': 'Localisation de fuite (ligne 3)',
  '11_Denom': 'Dénomination du fluide',
  '11_Quantite': 'Quantité nominale (kg)',
  '11_QA': 'Quantité A — fluide vierge',
  '11_QB': 'Quantité B — fluide recyclé',
  '11_QC': 'Quantité C — fluide régénéré',
  '11_QD': 'Quantité D — fluide en déchet',
  '11_QE': 'Quantité E — fluide réutilisé',
  '11_QDE': 'Quantité D+E récupérée',
  '11_Contenant_ID': 'Identification du contenant',
  '11_BSFF': 'N° de BSFF',
  'Autre-FF-NON-inflammable': 'Autre déchet non inflammable',
  'Autre-FF-inflammable': 'Autre déchet inflammable',
  '13_Instal': 'Installation de destination',
  '14_Observations': 'Observations',
  'Sign_Operateur_Nom': 'Signature opérateur — nom',
  'Sign_Operateur_Qualite': 'Signature opérateur — qualité',
  'Sign_Operateur_Date': 'Signature opérateur — date',
  'Sign_Detenteur_Nom': 'Signature détenteur — nom',
  'Sign_Detenteur_Qualite': 'Signature détenteur — qualité',
  'Sign_Detenteur_Date': 'Signature détenteur — date',
  'Case_Assemblage': 'Assemblage',
  'Case_MiseService': 'Mise en service',
  'Case_Modif': 'Modification',
  'Case_Maintenance': 'Maintenance',
  'Case_CtrlPerio': 'Contrôle périodique',
  'Case_CtrlNonPerio': 'Contrôle non périodique',
  'Case_Demantel': 'Démantèlement',
  'Case_Autre': 'Autre intervention',
  'Case_Fuite_Oui': 'Fuite détectée : OUI',
  'Case_Fuite_Non': 'Fuite détectée : NON',
  'Case_Rep_Fuite1_realisee': 'Réparation fuite 1 réalisée',
  'Case_Rep_Fuite1_AFaire': 'Réparation fuite 1 à faire',
  'Case_Rep_Fuite2_realisee': 'Réparation fuite 2 réalisée',
  'Case_Rep_Fuite2_AFaire': 'Réparation fuite 2 à faire',
  'Case_Rep_Fuite3_realisee': 'Réparation fuite 3 réalisée',
  'Case_Rep_Fuite3_AFaire': 'Réparation fuite 3 à faire',
  'Case_12_UN1078': 'Transport UN 1078 (non inflammable)',
  'Case_12_UN3161': 'Transport UN 3161 (inflammable)',
  'Case_12_Autre140601': 'Déchet 14 06 01 (non inflammable)',
  'Case_12_Autre160504': 'Déchet 16 05 04 (inflammable)'
};

/** Libellé français d'un champ (cases de seuil/fréquence : dérivé). */
export function libelleDuChamp(nom) {
  if (LIBELLES_CHAMPS[nom]) return LIBELLES_CHAMPS[nom];
  const seuil = /^Case_(HCFC|HFC|HFO)_(\d+)$/.exec(nom);
  if (seuil) return `Seuil ${seuil[1]} ≥ ${seuil[2]}`;
  const freq = /^Case_(Sans|Avec)_(\d+)m$/.exec(nom);
  if (freq) {
    return `Contrôle tous les ${freq[2]} mois `
      + `(${freq[1] === 'Avec' ? 'avec' : 'sans'} détection permanente)`;
  }
  return nom;
}

// ------------------------------------------------------------
// Normalisation bienveillante des saisies
// ------------------------------------------------------------

/** Chaîne comparable : espaces réduits, apostrophes unifiées, minuscules. */
export function normaliserTexte(valeur) {
  return String(valeur ?? '')
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Nombre depuis une saisie française OU anglaise ; null si pas un nombre. */
export function nombreDepuisSaisie(valeur) {
  const texte = String(valeur ?? '').trim()
    .replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/.test(texte)) return null;
  return Number(texte);
}

/** Date j/m/aaaa (1 ou 2 chiffres tolérés) → « JJ/MM/AAAA » ; null sinon. */
export function dateDepuisSaisie(valeur) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(valeur ?? '').trim());
  if (!m) return null;
  return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
}

/**
 * Deux saisies TEXTE sont-elles équivalentes ? (version GÉNÉRIQUE :
 * espaces, casse, apostrophes, virgule/point décimal, dates à
 * 1 chiffre — la comparaison PAR CHAMP du rapport passe par
 * equivalentsPourChamp, qui ne tolère le numérique que sur les
 * quantités.)
 */
export function textesEquivalents(attendue, saisie) {
  const a = normaliserTexte(attendue);
  const s = normaliserTexte(saisie);
  if (a === s) return true;
  const nombreAttendu = nombreDepuisSaisie(attendue);
  if (nombreAttendu !== null) {
    const nombreSaisi = nombreDepuisSaisie(saisie);
    return nombreSaisi !== null
      && Math.abs(nombreAttendu - nombreSaisi) < 0.005;
  }
  const dateAttendue = dateDepuisSaisie(attendue);
  if (dateAttendue !== null) {
    return dateDepuisSaisie(saisie) === dateAttendue;
  }
  return false;
}

/** Mention système du cadre 14, jamais exigée de l'élève. */
const MENTION_FORMATION_NORMALISEE = normaliserTexte(MENTION_FORMATION);

/**
 * Ligne normalisée d'un pavé multi-lignes : « SIRET : » unifié (avec
 * ou sans deux-points), numéro SIRET comparé sans ses espaces de
 * groupement.
 */
function normaliserLigne(ligne) {
  let n = normaliserTexte(ligne);
  const siret = /^siret\s*:?\s*(.*)$/.exec(n);
  if (siret) n = 'siret ' + siret[1].replace(/\s/g, '');
  return n;
}

/**
 * Pavé multi-lignes → ensemble trié de lignes normalisées (lignes
 * vides et mention MODE FORMATION écartées des deux côtés).
 */
function lignesComparables(valeur) {
  return String(valeur ?? '').split('\n')
    .map(normaliserLigne)
    .filter((l) => l !== '' && l !== MENTION_FORMATION_NORMALISEE)
    .sort();
}

/** Pavés multi-lignes équivalents : mêmes lignes, ordre libre. */
export function lignesEquivalentes(attendue, saisie) {
  const a = lignesComparables(attendue);
  const s = lignesComparables(saisie);
  return a.length === s.length && a.every((ligne, i) => ligne === s[i]);
}

/**
 * Équivalence PAR CHAMP (celle du rapport) : la bienveillance dépend
 * de la nature du champ — quantités (virgule/point, quasi exact),
 * teqCO₂ (tolérance d'arrondi ±1 % ou ±0,05), dates, jour/mois/année
 * (« 7 » ≡ « 07 »), pavés multi-lignes (ordre libre, SIRET souple) ;
 * tout le reste (identifiants compris) : texte normalisé STRICT.
 */
export function equivalentsPourChamp(nom, attendue, saisie) {
  if (CHAMPS_MULTILIGNES.has(nom)) {
    return lignesEquivalentes(attendue, saisie);
  }
  const a = normaliserTexte(attendue);
  const s = normaliserTexte(saisie);
  if (a === s) return true;
  if (CHAMPS_QUANTITE.has(nom) || CHAMPS_JMA.has(nom)) {
    const nombreAttendu = nombreDepuisSaisie(attendue);
    const nombreSaisi = nombreDepuisSaisie(saisie);
    return nombreAttendu !== null && nombreSaisi !== null
      && Math.abs(nombreAttendu - nombreSaisi) < 0.005;
  }
  if (CHAMPS_TEQ.has(nom)) {
    const nombreAttendu = nombreDepuisSaisie(attendue);
    const nombreSaisi = nombreDepuisSaisie(saisie);
    return nombreAttendu !== null && nombreSaisi !== null
      && Math.abs(nombreAttendu - nombreSaisi)
        <= Math.max(0.05, 0.01 * Math.abs(nombreAttendu));
  }
  if (CHAMPS_DATE.has(nom)) {
    const dateAttendue = dateDepuisSaisie(attendue);
    return dateAttendue !== null
      && dateDepuisSaisie(saisie) === dateAttendue;
  }
  return false;
}

// ------------------------------------------------------------
// Lecture du PDF de l'élève
// ------------------------------------------------------------

/**
 * Lit les champs AcroForm d'un PDF (le CERFA rempli par l'élève).
 * @param {Uint8Array} octets
 * @returns {Promise<{texte: Object<string,string>,
 *   cases: Object<string,boolean>, radio: string|null,
 *   nomsChamps: string[]}>}
 */
export async function lireChampsCerfaPdf(octets) {
  // Garde anti-gel (revue adversariale) : le CERFA officiel rempli
  // numériquement pèse ~1 Mo ; au-delà de 15 Mo c'est un scan ou un
  // fichier hostile — refus AVANT tout parsing sur le fil d'interface.
  if (octets && octets.length > 15 * 1024 * 1024) {
    throw new Error('Fichier trop volumineux (plus de 15 Mo) : le CERFA '
      + 'rempli à l’ordinateur pèse environ 1 Mo — un scan n’a plus '
      + 'de champs et ne peut pas être corrigé.');
  }
  const PDFLib = await chargerPdfLib();
  let doc;
  try {
    doc = await PDFLib.PDFDocument.load(octets, { ignoreEncryption: true });
  } catch {
    throw new Error('Ce fichier n’est pas un PDF lisible.');
  }
  const form = doc.getForm();
  const texte = {};
  const cases = {};
  let radio = null;
  const nomsChamps = [];
  // ⚠️ pdf-lib est embarqué MINIFIÉ : constructor.name est broyé —
  // le type d'un champ se teste par instanceof sur les classes
  // exportées de l'espace de noms, jamais par son nom de classe.
  for (const champ of form.getFields()) {
    const nom = champ.getName();
    nomsChamps.push(nom);
    if (champ instanceof PDFLib.PDFTextField) {
      texte[nom] = champ.getText() ?? '';
    } else if (champ instanceof PDFLib.PDFCheckBox) {
      cases[nom] = champ.isChecked();
    } else if (champ instanceof PDFLib.PDFRadioGroup
      && nom === 'Bouton_Oui') {
      radio = champ.getSelected() ?? null;
    }
  }
  return { texte, cases, radio, nomsChamps };
}

/**
 * Le PDF importé est-il bien le CERFA officiel (mêmes champs) ?
 * @param {string[]} nomsChamps - champs trouvés dans le PDF élève
 * @param {string[]} nomsAttendus - champs de la référence (générateur)
 * @returns {{conforme: boolean, manquants: string[], inconnus: string[]}}
 */
export function verifierFormulaireCerfa(nomsChamps, nomsAttendus) {
  const presents = new Set(nomsChamps);
  const attendus = new Set(nomsAttendus);
  const manquants = nomsAttendus.filter((n) => !presents.has(n));
  const inconnus = nomsChamps.filter((n) => !attendus.has(n));
  return { conforme: manquants.length === 0, manquants, inconnus };
}

// ------------------------------------------------------------
// Comparaison attendu ↔ saisi (PUR)
// ------------------------------------------------------------

/** Statuts d'une ligne de correction. */
export const STATUTS_CORRECTION = {
  OK: 'Juste',
  ERREUR: 'Faux',
  MANQUANT: 'Oublié',
  A_TORT: 'Rempli à tort',
  VIDE: 'Vide (correct)'
};

/**
 * Compare les valeurs attendues (calculerChampsCerfa) aux valeurs
 * saisies par l'élève (lireChampsCerfaPdf). Fonction PURE.
 * @returns {{lignes: Array, parCadre: Array, nbActifs: number,
 *   nbOk: number, nbErreurs: number, nbManquants: number,
 *   nbATort: number, pourcentage: number}}
 */
export function comparerChamps(attendu, saisi) {
  const lignes = [];

  for (const [nom, valeurAttendue] of Object.entries(attendu.texte)) {
    const valeurSaisie = saisi.texte[nom] ?? '';
    // Vacuité : pour un pavé multi-lignes, un contenu réduit à la
    // mention système MODE FORMATION compte comme VIDE (l'élève n'a
    // pas à la recopier — équité de la revue adversariale).
    const estVide = (v) => CHAMPS_MULTILIGNES.has(nom)
      ? lignesComparables(v).length === 0
      : String(v ?? '').trim() === '';
    const attendueVide = estVide(valeurAttendue);
    const saisieVide = estVide(valeurSaisie);
    let statut;
    if (attendueVide && saisieVide) statut = 'VIDE';
    else if (attendueVide) statut = 'A_TORT';
    else if (saisieVide) statut = 'MANQUANT';
    else statut = equivalentsPourChamp(nom, valeurAttendue, valeurSaisie)
      ? 'OK' : 'ERREUR';
    lignes.push({
      nom, type: 'texte', cadre: cadreDuChamp(nom),
      libelle: libelleDuChamp(nom),
      attendu: valeurAttendue ?? '', saisi: valeurSaisie ?? '', statut
    });
  }

  for (const [nom, cocheAttendue] of Object.entries(attendu.cases)) {
    const cocheSaisie = Boolean(saisi.cases[nom]);
    let statut;
    if (cocheAttendue && cocheSaisie) statut = 'OK';
    else if (cocheAttendue) statut = 'MANQUANT';
    else if (cocheSaisie) statut = 'A_TORT';
    else statut = 'VIDE';
    lignes.push({
      nom, type: 'case', cadre: cadreDuChamp(nom),
      libelle: libelleDuChamp(nom),
      attendu: cocheAttendue ? 'cochée' : 'décochée',
      saisi: cocheSaisie ? 'cochée' : 'décochée',
      statut
    });
  }

  {
    const radioAttendu = attendu.radio ?? null;
    const radioSaisi = saisi.radio ?? null;
    const enTexte = (v) => v === '1' ? 'Oui' : v === '2' ? 'Non'
      : 'non renseigné';
    let statut;
    if (radioAttendu === radioSaisi) statut = radioAttendu ? 'OK' : 'VIDE';
    else if (radioAttendu === null) statut = 'A_TORT';
    else if (radioSaisi === null) statut = 'MANQUANT';
    else statut = 'ERREUR';
    lignes.push({
      nom: 'Bouton_Oui', type: 'radio', cadre: '6',
      libelle: libelleDuChamp('Bouton_Oui'),
      attendu: enTexte(radioAttendu), saisi: enTexte(radioSaisi), statut
    });
  }

  // Champs ACTIFS = ceux que l'élève devait renseigner (attendus non
  // vides / cochés / radio posé). Les « à tort » s'y ajoutent : remplir
  // ce qui devait rester vide est une erreur évaluée.
  const compter = (s) => lignes.filter((l) => l.statut === s).length;
  const nbOk = compter('OK');
  const nbErreurs = compter('ERREUR');
  const nbManquants = compter('MANQUANT');
  const nbATort = compter('A_TORT');
  const nbActifs = nbOk + nbErreurs + nbManquants + nbATort;

  const ordreCadres = Object.keys(TITRES_CADRES);
  const parCadre = ordreCadres
    .map((cadre) => {
      const dedans = lignes.filter((l) => l.cadre === cadre);
      const actives = dedans.filter((l) => l.statut !== 'VIDE');
      return {
        cadre,
        titre: TITRES_CADRES[cadre],
        lignes: dedans,
        nbActifs: actives.length,
        nbOk: actives.filter((l) => l.statut === 'OK').length
      };
    })
    .filter((c) => c.lignes.length > 0);

  return {
    lignes, parCadre,
    nbActifs, nbOk, nbErreurs, nbManquants, nbATort,
    pourcentage: nbActifs > 0 ? Math.round(100 * nbOk / nbActifs) : 100
  };
}

// ------------------------------------------------------------
// Orchestration : corriger le PDF d'un élève contre une cible
// ------------------------------------------------------------

/**
 * Corrige le CERFA rempli par un élève contre les valeurs attendues
 * du mouvement/contrôle de référence.
 * @param {object} store - magasin de données v8
 * @param {{source: 'mouvement'|'controle', id: string}} cible
 * @param {Uint8Array} octetsEleve - le PDF importé
 * @returns {Promise<{rapport: object, numero: string, mode: string,
 *   formulaire: {conforme: boolean, manquants: string[], inconnus: string[]}}>}
 */
export async function corrigerCerfaEleve(store, cible, octetsEleve) {
  const attendu = await calculerChampsCerfa(store, cible);
  const saisi = await lireChampsCerfaPdf(octetsEleve);

  const nomsAttendus = [
    ...Object.keys(attendu.texte),
    ...Object.keys(attendu.cases),
    'Bouton_Oui'
  ];
  const formulaire = verifierFormulaireCerfa(saisi.nomsChamps, nomsAttendus);
  if (!formulaire.conforme) {
    throw new Error('Ce PDF n’est pas le CERFA 15497*04 officiel : '
      + formulaire.manquants.length + ' champ(s) attendu(s) absent(s) '
      + '(l’élève doit partir du PDF vierge officiel et le '
      + 'remplir à l’ordinateur — un scan n’a plus de champs).');
  }

  return {
    rapport: comparerChamps(attendu, saisi),
    numero: attendu.numero,
    mode: attendu.mode,
    formulaire
  };
}
