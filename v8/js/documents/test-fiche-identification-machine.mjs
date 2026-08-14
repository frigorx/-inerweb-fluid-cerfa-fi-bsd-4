// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Test de la fiche d'identification machine (A4) (V9.2)
// Exécution : node v8/js/documents/test-fiche-identification-machine.mjs
// Patron repris de test-etiquette-machine.mjs / test-bon-intervention.mjs.
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
let ouvrirFicheIdentification;
try {
  ({ contenuQR, ouvrirFicheIdentification } = await import('./fiche-identification-machine.js'));
  verifier('documents/fiche-identification-machine.js s’importe sans erreur sous Node',
    typeof ouvrirFicheIdentification === 'function' && typeof contenuQR === 'function');
} catch (erreur) {
  nbEchecs += 1;
  console.error('ÉCHEC import de documents/fiche-identification-machine.js : ' + erreur.message);
  console.log(`\n${nbOk} test(s) réussi(s), ${nbEchecs} échec(s).`);
  process.exit(1);
}

const MACHINE_TEST = {
  id: 'mac-1', code: 'M1', designation: 'Chambre froide test',
  type: 'Chambre froide négative', marque: 'Copeland', modele: 'ZX45',
  numSerie: 'SN-778899', localisation: 'Atelier 2', siteLabel: null,
  clientId: 'cli-1', fluide: 'R404A', codePublic: 'ABC123X',
  chargeNominaleKg: 12.5, chargeActuelleKg: 11.8,
  detectionPermanente: true, dateMiseEnService: '2021-03-15'
};

const FLUIDE_TEST = { code: 'R404A', famille: 'HFC', gwpAr4: 3922, classeSecurite: 'A1' };
const CLIENT_TEST = { id: 'cli-1', raisonSociale: 'Lycée Vidal', adresse: '12 rue de la Formation, Nîmes' };

/* ============================================================
   1. Contenu QR : chemin relatif hors-ligne, jamais une URL absolue.
   ============================================================ */
{
  const texte = contenuQR(MACHINE_TEST.codePublic);
  verifier('contenuQR() produit exactement « #/m/<code_public> »',
    texte === '#/m/ABC123X', 'obtenu : ' + texte);
  verifier('contenuQR() ne produit jamais une URL absolue/domaine codé en dur',
    !/^https?:\/\//i.test(texte) && !texte.includes('frigorx.github.io'));
}

/* ============================================================
   2. Rendu complet, machine avec fluide et client connus.
   ============================================================ */
{
  const ctx = {
    store: {
      async getMachines() { return [MACHINE_TEST]; },
      async getFluides() { return [FLUIDE_TEST]; },
      async getClients() { return [CLIENT_TEST]; }
    }
  };

  let exceptionRemontee = null;
  try {
    await ouvrirFicheIdentification(ctx, 'mac-1');
  } catch (erreur) {
    exceptionRemontee = erreur;
  }
  verifier('ouvrirFicheIdentification() ne plante pas même sans bibliothèque QR disponible',
    exceptionRemontee === null,
    exceptionRemontee ? String(exceptionRemontee.message) : '');

  const fond = document.body.querySelector('.modale-fond');
  verifier('la modale de la fiche d’identification s’ouvre bien', Boolean(fond));

  const doc = fond.querySelector('.fim-document');
  verifier('le document fim-document est bien rendu', Boolean(doc));

  verifier('le titre « Fiche d\'identification équipement » est présent',
    /Fiche d.identification équipement/.test(fond.innerHTML));

  // Logo inerWeb Fluide + deux emplacements réservés (classes fim-doc-*)
  verifier('le logo inerWeb Fluide est présent en en-tête',
    Boolean(fond.querySelector('.fim-doc-entete .sidebar-logo'))
    && Boolean(fond.querySelector('.fim-doc-entete .logo-carre')));
  const reserves = fond.querySelectorAll('.fim-doc-reserve');
  verifier('les deux emplacements réservés (établissement/groupement) sont présents',
    reserves.length === 2);
  verifier('les légendes des emplacements réservés sont correctes',
    /Logo établissement/.test(fond.innerHTML) && /Logo groupement/.test(fond.innerHTML));

  // Données d'identité et techniques reprises
  verifier('la désignation de la machine est présente',
    fond.innerHTML.includes('Chambre froide test'));
  verifier('la marque et le modèle sont présents',
    fond.innerHTML.includes('Copeland') && fond.innerHTML.includes('ZX45'));
  verifier('le numéro de série est présent',
    fond.innerHTML.includes('SN-778899'));
  verifier('la localisation est présente',
    fond.innerHTML.includes('Atelier 2'));
  verifier('le client est présent',
    fond.innerHTML.includes('Lycée Vidal'));
  verifier('le fluide et sa famille sont présents',
    fond.innerHTML.includes('R404A') && fond.innerHTML.includes('HFC'));
  verifier('la charge nominale et actuelle sont présentes (formatage kg)',
    /12,5\s*kg|12\.5\s*kg/.test(fond.innerHTML) || fond.innerHTML.includes('kg'));
  verifier('la détection permanente affiche « Oui »',
    /Détection permanente/.test(fond.innerHTML) && /Oui/.test(fond.innerHTML));
  verifier('la fréquence de contrôle est présente',
    /Fréquence de contrôle/.test(fond.innerHTML));

  // QR en grand
  const zoneQR = fond.querySelector('#fim-qr');
  verifier('la zone QR est rendue (non vide)',
    Boolean(zoneQR) && zoneQR.innerHTML.length > 0);
  verifier('le code_public est affiché à côté du QR',
    /Code ABC123X/.test(fond.innerHTML));

  // Espace pose/signature
  verifier('l’espace « Date de pose » est présent',
    /Date de pose/.test(fond.innerHTML));
  verifier('l’espace « Signature technicien » est présent',
    /Signature technicien/.test(fond.innerHTML));

  // Pied de page
  verifier('le pied de page mentionne « Généré par inerWeb Fluide le »',
    /Généré par inerWeb Fluide le/.test(fond.innerHTML));

  fond.remove();
}

/* ============================================================
   3. Machine sans fluide connu au référentiel ni client rattaché :
   pas d'exception, valeurs de repli « — ».
   ============================================================ */
{
  const MACHINE_MINIMALE = {
    id: 'mac-2', code: 'M2', designation: 'Vitrine test',
    type: null, marque: null, modele: null, numSerie: null,
    localisation: null, siteLabel: null, clientId: null,
    fluide: 'R290', codePublic: 'ZZZ999Y',
    chargeNominaleKg: 0, chargeActuelleKg: 0,
    detectionPermanente: false, dateMiseEnService: null
  };
  const ctx = {
    store: {
      async getMachines() { return [MACHINE_MINIMALE]; },
      async getFluides() { return [FLUIDE_TEST]; },
      async getClients() { return [CLIENT_TEST]; }
    }
  };

  let exceptionRemontee = null;
  try {
    await ouvrirFicheIdentification(ctx, 'mac-2');
  } catch (erreur) {
    exceptionRemontee = erreur;
  }
  verifier('machine minimale (sans fluide référencé, sans client) : pas d’exception',
    exceptionRemontee === null,
    exceptionRemontee ? String(exceptionRemontee.message) : '');

  const fond = document.body.querySelector('.modale-fond');
  verifier('la modale s’ouvre bien pour une machine minimale', Boolean(fond));
  fond.remove();
}

/* ============================================================
   4. Machine introuvable : aucune exception, aucune modale ouverte.
   ============================================================ */
{
  const ctx = {
    store: {
      async getMachines() { return [MACHINE_TEST]; },
      async getFluides() { return [FLUIDE_TEST]; },
      async getClients() { return [CLIENT_TEST]; }
    }
  };

  const nbModalesAvant = document.body.querySelectorAll('.modale-fond').length;
  let exceptionRemontee = null;
  try {
    await ouvrirFicheIdentification(ctx, 'id-inexistant');
  } catch (erreur) {
    exceptionRemontee = erreur;
  }
  verifier('machine introuvable : aucune exception levée',
    exceptionRemontee === null);
  const nbModalesApres = document.body.querySelectorAll('.modale-fond').length;
  verifier('machine introuvable : aucune modale ouverte',
    nbModalesApres === nbModalesAvant);
}

// ---- Bilan ----
console.log('\nÀ VALIDER EN NAVIGATEUR (non testable sous Node) : le rendu '
  + 'canvas réel du QR et le rendu d’impression (@media print) — voir '
  + 'v8/js/lib/qrcode-vendor.js et v8/index.html.');
console.log(`\n${nbOk} test(s) réussi(s), ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
