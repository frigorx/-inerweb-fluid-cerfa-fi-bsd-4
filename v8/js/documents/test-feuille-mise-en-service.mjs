// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test de la feuille de mise en service (V9.2)
// Exécution : node v8/js/documents/test-feuille-mise-en-service.mjs
//
// Vérifie, sans avoir besoin de rendre un canvas réel (impossible sous
// Node, même limite que test-etiquette-machine.mjs) :
//  1. Import sans erreur, contenuQR() correct (chemin relatif).
//  2. CF-1 : peutOuvrirFeuilleMiseEnService() — vrai seulement pour un
//     mouvement de type MISE_EN_SERVICE en statut VALIDE ou ANNULE, faux
//     pour tout autre type/statut, faux si mouvement absent.
//  3. Présence des champs pré-remplis (établissement, machine, date).
//  4. Présence des zones vides (pointillés) pour les mesures non calculées.
//  5. Non-génération de la modale si le mouvement n'est pas du bon
//     type/statut (ouvrirFeuilleMiseEnService reste silencieuse, jamais
//     d'exception).
// ============================================================

let nbOk = 0;
let nbEchecs = 0;

function verifier(libelle, condition, detail = '') {
  if (condition) {
    nbOk += 1;
    console.log(`  OK  ${libelle}`);
  } else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

const { installerDocumentFactice } = await import('../core/shim-dom-tests.mjs');
installerDocumentFactice();

let contenuQR;
let peutOuvrirFeuilleMiseEnService;
let ouvrirFeuilleMiseEnService;
try {
  ({ contenuQR, peutOuvrirFeuilleMiseEnService, ouvrirFeuilleMiseEnService } =
    await import('./feuille-mise-en-service.js'));
  verifier('documents/feuille-mise-en-service.js s’importe sans erreur sous Node',
    typeof ouvrirFeuilleMiseEnService === 'function'
    && typeof peutOuvrirFeuilleMiseEnService === 'function'
    && typeof contenuQR === 'function');
} catch (erreur) {
  nbEchecs += 1;
  console.error('ÉCHEC import de documents/feuille-mise-en-service.js : ' + erreur.message);
}

const MACHINE_TEST = {
  id: 'mac-1', code: 'M1', designation: 'Chambre froide test',
  type: 'Chambre froide', marque: 'Bitzer', modele: 'ECOLINE',
  numSerie: 'BZ-77120', fluide: 'R-404A', codePublic: 'ABC123X'
};

const ETABLISSEMENT_TEST = {
  raisonSociale: 'Lycée Professionnel Test',
  adresse: '1 rue de Test, 13000 Marseille'
};

function mouvement(overrides) {
  return Object.assign({
    id: 'mvt-1', type: 'MISE_EN_SERVICE', statut: 'VALIDE',
    machineId: 'mac-1', date: '2026-05-30'
  }, overrides);
}

/* ============================================================
   1. Contenu QR : chemin relatif hors-ligne exact.
   ============================================================ */
{
  const texte = contenuQR(MACHINE_TEST.codePublic);
  verifier('contenuQR() produit exactement « #/m/<code_public> »',
    texte === '#/m/ABC123X', 'obtenu : ' + texte);
  verifier('contenuQR() ne produit jamais une URL absolue/domaine codé en dur',
    !/^https?:\/\//i.test(texte) && !texte.includes('frigorx.github.io'));
}

/* ============================================================
   2. CF-1 : peutOuvrirFeuilleMiseEnService()
   ============================================================ */
{
  verifier('CF-1 : autorisé — MISE_EN_SERVICE + VALIDE',
    peutOuvrirFeuilleMiseEnService(mouvement({ type: 'MISE_EN_SERVICE', statut: 'VALIDE' })) === true);
  verifier('CF-1 : autorisé — MISE_EN_SERVICE + ANNULE',
    peutOuvrirFeuilleMiseEnService(mouvement({ type: 'MISE_EN_SERVICE', statut: 'ANNULE' })) === true);
  verifier('CF-1 : refusé — MISE_EN_SERVICE + BROUILLON',
    peutOuvrirFeuilleMiseEnService(mouvement({ type: 'MISE_EN_SERVICE', statut: 'BROUILLON' })) === false);
  verifier('CF-1 : refusé — MISE_EN_SERVICE + SOUMIS',
    peutOuvrirFeuilleMiseEnService(mouvement({ type: 'MISE_EN_SERVICE', statut: 'SOUMIS' })) === false);
  verifier('CF-1 : refusé — CHARGE_APPOINT + VALIDE (mauvais type)',
    peutOuvrirFeuilleMiseEnService(mouvement({ type: 'CHARGE_APPOINT', statut: 'VALIDE' })) === false);
  verifier('CF-1 : refusé — TRANSFERT + VALIDE (mauvais type)',
    peutOuvrirFeuilleMiseEnService(mouvement({ type: 'TRANSFERT', statut: 'VALIDE' })) === false);
  verifier('CF-1 : refusé — mouvement absent (null)',
    peutOuvrirFeuilleMiseEnService(null) === false);
  verifier('CF-1 : refusé — mouvement absent (undefined)',
    peutOuvrirFeuilleMiseEnService(undefined) === false);
}

/* ============================================================
   3 et 4. Rendu de la modale : champs pré-remplis + zones vides
   ============================================================ */
{
  const store = {
    async getMouvements() { return [mouvement({ type: 'MISE_EN_SERVICE', statut: 'VALIDE' })]; },
    async getMachines() { return [MACHINE_TEST]; },
    async getEtablissement() { return ETABLISSEMENT_TEST; }
  };
  const ctx = { store };

  let exceptionRemontee = null;
  try {
    await ouvrirFeuilleMiseEnService(ctx, 'mvt-1');
  } catch (erreur) {
    exceptionRemontee = erreur;
  }
  verifier('ouvrirFeuilleMiseEnService() ne plante pas (mouvement valide)',
    exceptionRemontee === null,
    exceptionRemontee ? String(exceptionRemontee.message) : '');

  const fond = document.body.querySelector('.modale-fond:last-of-type');
  verifier('la modale de la feuille s’ouvre bien', Boolean(fond));

  const feuille = fond.querySelector('.fmes-feuille');
  verifier('la feuille de mise en service est rendue', Boolean(feuille));

  const texte = feuille.textContent;

  // Champs pré-remplis attendus
  verifier('la raison sociale de l’établissement est pré-remplie',
    texte.includes('Lycée Professionnel Test'));
  verifier('l’adresse de l’établissement est pré-remplie',
    texte.includes('1 rue de Test, 13000 Marseille'));
  verifier('la date du mouvement est pré-remplie (30/05/2026)',
    texte.includes('30/05/2026'));
  verifier('la marque de la machine est pré-remplie',
    texte.includes('Bitzer'));
  verifier('le type de la machine est pré-rempli',
    texte.includes('Chambre froide'));
  verifier('la référence (modèle) de la machine est pré-remplie',
    texte.includes('ECOLINE'));
  verifier('le numéro de série est pré-rempli',
    texte.includes('BZ-77120'));
  verifier('le code_public de la machine est affiché à côté du QR',
    texte.includes('ABC123X'));
  verifier('le fluide de la machine est pré-rempli',
    texte.includes('R-404A'));

  // Zones vides attendues (mesures non calculées par l'appli)
  const nbZonesVides = feuille.querySelectorAll('.fmes-vide').length;
  verifier('des zones vides (pointillés) sont présentes pour les mesures à compléter',
    nbZonesVides > 10, 'trouvé ' + nbZonesVides);

  verifier('le libellé PK (types de fluides) est présent (zone vide)',
    texte.includes('PK'));
  verifier('le libellé « Théta de refoulement du compresseur » est présent',
    texte.includes('Théta de refoulement du compresseur'));
  verifier('le libellé « Théta de l’aspiration du compresseur » est présent',
    texte.includes('Théta de l’aspiration du compresseur'));
  verifier('le libellé « Théta de sortie condenseur (t_scond) » est présent',
    texte.includes('t_scond'));
  verifier('le libellé « Théta de sortie de l’évaporateur (t_b) » est présent',
    texte.includes('t_b'));
  verifier('le libellé « Intensité absorbée par le compresseur » est présent',
    texte.includes('Intensité absorbée par le compresseur'));
  verifier('les pressostats PSL/PZL/PHP sécu sont présents',
    texte.includes('PSL') && texte.includes('PZL') && texte.includes('PHP sécu'));
  verifier('la surchauffe (SCH) est présente',
    texte.includes('SCH'));
  verifier('le sous-refroidissement (SR) est présent',
    texte.includes('SR'));

  // En-tête : logo inerWeb Fluide + 2 emplacements réservés
  verifier('le logo inerWeb Fluide (pictogramme flocon) est présent en en-tête',
    Boolean(feuille.querySelector('.fmes-logo-inerweb .logo-carre')));
  const emplacementsReserves = feuille.querySelectorAll('.fmes-logo-reserve');
  verifier('les 2 emplacements réservés (établissement/groupement) sont présents',
    emplacementsReserves.length === 2, 'trouvé ' + emplacementsReserves.length);
  verifier('les légendes des emplacements réservés sont correctes',
    texte.includes('Logo établissement') && texte.includes('Logo groupement'));

  // Pied de page
  verifier('le pied de page mentionne « Généré par inerWeb Fluide le »',
    texte.includes('Généré par inerWeb Fluide le'));
}

/* ============================================================
   5. Non-génération si le mouvement n'est pas du bon type/statut.
   ============================================================ */
{
  const nbModalesAvant = document.body.querySelectorAll('.modale-fond').length;

  const storeBrouillon = {
    async getMouvements() { return [mouvement({ type: 'MISE_EN_SERVICE', statut: 'BROUILLON' })]; },
    async getMachines() { return [MACHINE_TEST]; },
    async getEtablissement() { return ETABLISSEMENT_TEST; }
  };
  let exceptionRemontee = null;
  try {
    await ouvrirFeuilleMiseEnService({ store: storeBrouillon }, 'mvt-1');
  } catch (erreur) {
    exceptionRemontee = erreur;
  }
  verifier('aucune exception si le mouvement est un BROUILLON (juste ignoré)',
    exceptionRemontee === null);
  verifier('aucune nouvelle modale ouverte pour un mouvement BROUILLON',
    document.body.querySelectorAll('.modale-fond').length === nbModalesAvant);

  const storeMauvaisType = {
    async getMouvements() { return [mouvement({ type: 'CHARGE_APPOINT', statut: 'VALIDE' })]; },
    async getMachines() { return [MACHINE_TEST]; },
    async getEtablissement() { return ETABLISSEMENT_TEST; }
  };
  exceptionRemontee = null;
  try {
    await ouvrirFeuilleMiseEnService({ store: storeMauvaisType }, 'mvt-1');
  } catch (erreur) {
    exceptionRemontee = erreur;
  }
  verifier('aucune exception si le mouvement n’est pas de type MISE_EN_SERVICE',
    exceptionRemontee === null);
  verifier('aucune nouvelle modale ouverte pour un mouvement de mauvais type',
    document.body.querySelectorAll('.modale-fond').length === nbModalesAvant);

  const storeIntrouvable = {
    async getMouvements() { return []; },
    async getMachines() { return [MACHINE_TEST]; },
    async getEtablissement() { return ETABLISSEMENT_TEST; }
  };
  exceptionRemontee = null;
  try {
    await ouvrirFeuilleMiseEnService({ store: storeIntrouvable }, 'mvt-inconnu');
  } catch (erreur) {
    exceptionRemontee = erreur;
  }
  verifier('aucune exception si le mouvement est introuvable',
    exceptionRemontee === null);
}

console.log(`\n${nbOk} test(s) réussi(s), ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
