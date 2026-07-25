// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// MOTEUR RÉGLEMENTAIRE UNIQUE — cadre 7 F-Gas (seuils + fréquence
// de contrôle d'étanchéité). SOURCE DE VÉRITÉ : ce module remplace
// les logiques auparavant dupliquées dans plaque-fgas.js,
// cerfa/generateur.js et server/api.js.
//
// Règles validées (Franck 15/07/2026, cf. docs/TABLE-REGLEMENTAIRE-FLUIDES.md),
// établies sur sources officielles :
//
//   A. Un fluide contenant du HFC se traite comme un HFC (seuils en
//      tonnes équivalent CO₂), MÊME s'il contient aussi du HFO.
//      → on teste donc HFC/PFC AVANT HFO (la notice du CERFA 15497*04
//      cite R-455A nommément : « considéré comme relevant de la
//      catégorie des HFC »).
//   B. Les HFO PURS ont des seuils en KILOGRAMMES (1/10/100 kg),
//      nouveauté du règlement UE 2024/573 (F-Gas III) art. 5, en
//      vigueur depuis le 11/03/2024 — AVANT cette date, les HFO purs
//      n'étaient pas soumis au contrôle d'étanchéité (voir
//      DEBUT_CONTROLE_HFO et le paramètre optionnel dateIntervention).
//   C. La charge de référence est la charge NOMINALE / totale déclarée
//      de l'équipement (valeur fixe marquée à demeure), PAS la quantité
//      momentanément présente (FAQ DGPR). Ce module reçoit donc la
//      charge nominale ; ne jamais lui passer chargeActuelleKg.
//
// FICHE EXPLICITE PAR FLUIDE (migration 21) : quand la fiche du
// référentiel porte une catégorie explicite (champ categorieCadre7 :
// HFC / HFO / HCFC / AUCUNE, peuplé depuis la table validée de
// docs/TABLE-REGLEMENTAIRE-FLUIDES.md), elle L'EMPORTE sur la
// dérivation du libellé de famille. La dérivation par includes() ne
// reste qu'un REPLI pour un fluide ajouté localement sans fiche.
//
// Familles hors périmètre du contrôle d'étanchéité fluoré : CO₂ (R-744),
// HC (R-290/propane), NH₃ (hors CERFA) → aucune fréquence exigée.
// ============================================================

// Entrée en vigueur du contrôle d'étanchéité des HFO purs (règl. UE
// 2024/573, F-Gas III, art. 5). Avant : HFO purs non contrôlés.
export const DEBUT_CONTROLE_HFO = '2024-03-11';

// Seuils par catégorie réglementaire, du palier le plus HAUT au plus BAS
// (le premier palier atteint l'emporte → niveau le plus élevé applicable).
// HFC/PFC : valeur comparée = tonnes éq. CO₂ (charge × PRP / 1000).
// HFO / HCFC : valeur comparée = charge en kg bruts.
const SEUILS = {
  HFC: {
    unite: 'teqCO2',
    paliers: [
      { min: 500, niveau: 3, caseSeuil: 'Case_HFC_500' },
      { min: 50, niveau: 2, caseSeuil: 'Case_HFC_50' },
      { min: 5, niveau: 1, caseSeuil: 'Case_HFC_5' }
    ]
  },
  HFO: {
    unite: 'kg',
    paliers: [
      { min: 100, niveau: 3, caseSeuil: 'Case_HFO_100' },
      { min: 10, niveau: 2, caseSeuil: 'Case_HFO_10' },
      { min: 1, niveau: 1, caseSeuil: 'Case_HFO_1' }
    ]
  },
  HCFC: {
    unite: 'kg',
    paliers: [
      { min: 300, niveau: 3, caseSeuil: 'Case_HCFC_300' },
      { min: 30, niveau: 2, caseSeuil: 'Case_HCFC_30' },
      { min: 2, niveau: 1, caseSeuil: 'Case_HCFC_2' }
    ]
  }
};

// Fréquence (en mois) et case CERFA par niveau, croisée avec la présence
// d'un système de détection permanente des fuites (cadre 6).
const FREQUENCE = {
  1: { sans: 12, avec: 24, caseSans: 'Case_Sans_12m', caseAvec: 'Case_Avec_24m' },
  2: { sans: 6, avec: 12, caseSans: 'Case_Sans_6m', caseAvec: 'Case_Avec_12m' },
  3: { sans: 3, avec: 6, caseSans: 'Case_Sans_3m', caseAvec: 'Case_Avec_6m' }
};

/**
 * Catégorie réglementaire d'un fluide au sens du cadre 7 (F-Gas).
 * 1. Fiche EXPLICITE d'abord : si le fluide porte un champ
 *    categorieCadre7 (HFC / HFO / HCFC / AUCUNE — 'AUCUNE' = hors
 *    périmètre acté), c'est LUI qui fait foi (migration 21, valeurs de
 *    la table validée). Une valeur inconnue est ignorée (repli).
 * 2. REPLI sinon : dérivation du libellé de famille, Règle A — HFC/PFC
 *    testés AVANT HFO, un mélange contenant du HFC (ex. R-455A,
 *    famille « HFC/HFO ») relève de la catégorie HFC.
 * @param {{ famille?: string, categorieCadre7?: string }|null|undefined} fluideRef
 * @returns {'HFC'|'HFO'|'HCFC'|null} null = hors périmètre (CO₂, HC, NH₃…)
 */
export function categorieCadre7(fluideRef) {
  const explicite = String(fluideRef?.categorieCadre7 || '').toUpperCase();
  if (explicite === 'AUCUNE') return null;
  if (explicite === 'HFC' || explicite === 'HFO' || explicite === 'HCFC') {
    return explicite;
  }
  const f = String(fluideRef?.famille || '').toUpperCase();
  if (f.includes('HFC') || f.includes('PFC')) return 'HFC';
  if (f.includes('HFO')) return 'HFO';
  if (f.includes('HCFC')) return 'HCFC';
  return null;
}

/**
 * Évalue l'obligation de contrôle d'étanchéité d'un équipement.
 * @param {{ famille?: string, gwpAr4?: number, categorieCadre7?: string
 *   }|null|undefined} fluideRef
 * @param {number} chargeNominaleKg — charge NOMINALE totale déclarée (Règle C)
 * @param {boolean} detectionPermanente — cadre 6
 * @param {string} [dateIntervention] — date ISO de l'intervention. Les HFO
 *   PURS ne sont soumis au contrôle que depuis le 11/03/2024 (F-Gas III) :
 *   avant, aucun niveau ni fréquence (la catégorie reste 'HFO'). Omise ou
 *   non ISO → régime courant (post-2024). Sans effet sur HFC/HCFC.
 * @returns {{ categorie: 'HFC'|'HFO'|'HCFC'|null, niveau: 1|2|3|null,
 *   caseSeuil: string|null, caseFrequence: string|null, frequenceMois: number|null }}
 */
export function evaluerControle(fluideRef, chargeNominaleKg,
  detectionPermanente, dateIntervention) {
  const categorie = categorieCadre7(fluideRef);
  const charge = Number(chargeNominaleKg) || 0;

  // Portée temporelle de la Règle B : HFO pur + intervention datée AVANT
  // le 11/03/2024 → pas encore de contrôle exigé. Une date non ISO est
  // ignorée (on ne désactive jamais un contrôle sur une date illisible).
  const date = typeof dateIntervention === 'string'
    && /^\d{4}-\d{2}-\d{2}/.test(dateIntervention)
    ? dateIntervention.slice(0, 10) : null;
  const hfoAvantRegime = categorie === 'HFO'
    && date !== null && date < DEBUT_CONTROLE_HFO;

  let niveau = null;
  let caseSeuil = null;
  if (categorie && !hfoAvantRegime) {
    const { unite, paliers } = SEUILS[categorie];
    const valeur = unite === 'teqCO2'
      ? charge * (Number(fluideRef?.gwpAr4) || 0) / 1000
      : charge;
    const palier = paliers.find((p) => valeur >= p.min);
    if (palier) {
      niveau = palier.niveau;
      caseSeuil = palier.caseSeuil;
    }
  }

  let caseFrequence = null;
  let frequenceMois = null;
  if (niveau) {
    const f = FREQUENCE[niveau];
    frequenceMois = detectionPermanente ? f.avec : f.sans;
    caseFrequence = detectionPermanente ? f.caseAvec : f.caseSans;
  }

  return { categorie, niveau, caseSeuil, caseFrequence, frequenceMois };
}

// ============================================================
// P1-2 — ADMINISTRATION DU RÉFÉRENTIEL (écran d'édition des gaz)
// Le référent saisit lui-même ses fluides : ces règles gardent la
// saisie. Elles sont PURES et recopiées en littéral dans server/api.js
// (parité prouvée par test-referentiel-fluides, joué demo ET local).
// ============================================================

/** Classes de sécurité admises — CHECK du schéma (NF EN 378 / ASHRAE 34). */
export const CLASSES_SECURITE =
  ['A1', 'A2L', 'A2', 'A3', 'B1', 'B2L', 'B2', 'B3'];

/** Statuts réglementaires admis — CHECK du schéma. */
export const STATUTS_REGLEMENTAIRES = ['AUTORISE', 'RESTREINT', 'INTERDIT'];

/** Catégories du cadre 7 saisissables — CHECK de la migration 21. */
export const CATEGORIES_CADRE7 = ['HFC', 'HFO', 'HCFC', 'AUCUNE'];

/**
 * Impact environnemental AFFICHÉ, dérivé du PRP (décision D3, 23/07).
 * Bornes 150 / 750 / 2500 = celles que le règlement F-Gas utilise déjà
 * pour ses interdictions de mise sur le marché. C'est un affichage, pas
 * une règle opposable : aucun moteur n'en dépend. Avant P1-2, `impact`
 * n'existait QUE dans le monde démo — avec le serveur, la colonne de la
 * vue était vide, et un fluide saisi localement n'en aurait jamais eu.
 * @param {number|string|null|undefined} prp
 * @returns {'FAIBLE'|'MODERE'|'ELEVE'|'TRES_ELEVE'|null} null = PRP illisible
 */
export function impactDepuisPrp(prp) {
  // ⚠️ Number(null) et Number('') valent 0 : un PRP ABSENT serait classé
  // « FAIBLE », c'est-à-dire rassurant à tort. On les écarte d'abord.
  if (prp === null || prp === undefined || prp === '') return null;
  const valeur = Number(prp);
  if (!Number.isFinite(valeur)) return null;
  // Un PRP NÉGATIF est aberrant. La saisie le refuse, mais l'import d'une
  // sauvegarde ne passe pas par la garde de saisie : il ne doit alors pas
  // ressortir « FAIBLE », c'est-à-dire rassurant à tort (constat TIRÉ à la
  // revue du 23/07). Aucun impact affiché : la valeur est illisible.
  if (valeur < 0) return null;
  if (valeur < 150) return 'FAIBLE';
  if (valeur < 750) return 'MODERE';
  if (valeur < 2500) return 'ELEVE';
  return 'TRES_ELEVE';
}

/**
 * Code de fluide normalisé pour la COMPARAISON d'unicité : sans espaces
 * ni tirets, en majuscules. « r 32 », « R-32 » et « R32 » désignent le
 * même gaz. La CASSE SAISIE, elle, est conservée telle quelle (R-1234yf
 * s'écrit avec des minuscules — la majusculiser serait une faute).
 * @param {string|null|undefined} code
 * @returns {string}
 */
export function codeFluideNormalise(code) {
  return String(code ?? '').replace(/[\s.-]/g, '').toUpperCase();
}

/**
 * Garde de saisie d'une fiche fluide (création ET modification : la
 * modification fusionne l'existant et le patch AVANT d'appeler, si bien
 * qu'une seule règle vaut pour les deux). LÈVE une Error au premier
 * défaut, message canonique identique des deux côtés.
 *
 * Cohérence du cadre 7 (D6) : elle ne bloque que les contradictions
 * MANIFESTES, celles qui rendraient la fiche mensongère au regard du
 * moteur. Les champs contientHfc / contientHfo sont documentaires (aucun
 * moteur ne les lit : categorieCadre7 puis famille font foi) — d'où une
 * garde volontairement légère. Un contient* nul vaut « non » : le
 * tri-état ne sert qu'à distinguer « fiche absente » (catégorie nulle,
 * repli du moteur sur la famille), et dans ce cas rien n'est vérifié.
 *
 * @param {{ code?, famille?, gwpAr4?, classeSecurite?, statutReglementaire?,
 *   categorieCadre7?, contientHfc?, contientHfo? }} fiche — fiche COMPLÈTE
 * @throws {Error} message canonique
 */
export function verifierFicheFluide(fiche) {
  const f = fiche || {};

  if (!String(f.code ?? '').trim()) {
    throw new Error('Code du fluide obligatoire (ex. R-449A).');
  }
  if (!String(f.famille ?? '').trim()) {
    throw new Error('Famille du fluide obligatoire (ex. HFC, HFO, HC, CO2).');
  }
  const prp = Number(f.gwpAr4);
  if (!Number.isFinite(prp) || prp < 0) {
    throw new Error('PRP invalide : nombre positif ou nul attendu '
      + '(le NH₃ vaut 0, le R-290 vaut 0,02).');
  }
  if (!CLASSES_SECURITE.includes(String(f.classeSecurite ?? ''))) {
    throw new Error('Classe de sécurité inconnue : '
      + `${CLASSES_SECURITE.join(', ')}.`);
  }
  // Statut réglementaire et catégorie du cadre 7 : facultatifs (une fiche
  // ancienne ou un fluide sans fiche les laissent vides) — vérifiés
  // SEULEMENT s'ils sont renseignés.
  const statut = f.statutReglementaire;
  if (statut != null && String(statut) !== ''
      && !STATUTS_REGLEMENTAIRES.includes(String(statut))) {
    throw new Error('Statut réglementaire inconnu : '
      + `${STATUTS_REGLEMENTAIRES.join(', ')}.`);
  }
  const categorie = f.categorieCadre7;
  if (categorie == null || String(categorie) === '') return;
  if (!CATEGORIES_CADRE7.includes(String(categorie))) {
    throw new Error('Catégorie du cadre 7 inconnue : '
      + `${CATEGORIES_CADRE7.join(', ')}.`);
  }
  const hfc = Boolean(f.contientHfc);
  const hfo = Boolean(f.contientHfo);
  if (categorie === 'HFC' && !hfc) {
    throw new Error('Fiche incohérente : la catégorie HFC suppose un fluide '
      + 'qui contient du HFC.');
  }
  if (categorie === 'HFO' && (!hfo || hfc)) {
    throw new Error('Fiche incohérente : la catégorie HFO suppose un fluide '
      + 'qui contient du HFO et pas de HFC — un mélange contenant du HFC '
      + 'relève de la catégorie HFC (règle A).');
  }
  if ((categorie === 'HCFC' || categorie === 'AUCUNE') && (hfc || hfo)) {
    throw new Error(`Fiche incohérente : la catégorie ${categorie} exclut `
      + 'un fluide contenant du HFC ou du HFO.');
  }
  // ⭐ L2 (25/07), corrigé par la revue — LE PRP CONTREDIT LA FICHE.
  // La cohérence ci-dessus se contentait des deux drapeaux `contient*` :
  // en les remettant à faux DANS LE MÊME patch, on pouvait déclarer
  // « AUCUNE » (hors périmètre F-Gas) un fluide comme le R-410A → TOUT le
  // parc qui y tourne sortait du contrôle d'étanchéité, sans fréquence,
  // sans échéance, sans alerte.
  //
  // Première tentative : croiser avec le libellé de FAMILLE. Mauvaise idée,
  // et la revue l'a prouvé deux fois — le libellé est du texte libre, donc
  // (a) il se réécrit dans le même patch, la garde tombe ; (b) il refusait
  // des fiches légitimes, « Ammoniac (NH3) — naturel, hors HFC » contenant
  // les trois lettres H, F, C. Une garde qui lit une phrase ne garde rien.
  //
  // Le PRP, lui, n'est pas du texte : les fluides réellement hors périmètre
  // sont des gaz naturels de PRP quasi nul (CO₂ = 1, propane = 3, ammoniac
  // = 0). Au-delà de 150 — la première borne du règlement, déjà utilisée
  // pour l'impact affiché — « hors périmètre » n'est plus une description,
  // c'est une erreur ou une manœuvre.
  const prpFiche = Number(f.gwpAr4);
  if (categorie === 'AUCUNE' && Number.isFinite(prpFiche) && prpFiche >= 150) {
    throw new Error('Fiche incohérente : un fluide de PRP ' + prpFiche
      + ' ne peut pas être déclaré hors périmètre F-Gas (catégorie AUCUNE). '
      + 'Les fluides hors périmètre sont les gaz naturels — CO₂, '
      + 'hydrocarbures, ammoniac — dont le PRP est quasi nul.');
  }
}
