// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test du bon d'intervention (V9.2)
// Exécution : node v8/js/documents/test-bon-intervention.mjs
// Patron repris de test-etiquette-machine.mjs : mini-DOM factice
// partagé (core/shim-dom-tests.mjs), pas de rendu canvas réel sous
// Node (le rendu QR réel se valide en navigateur), mais toutes les
// garanties structurelles et de contenu sont vérifiées ici.
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
let ouvrirBonIntervention;
try {
  ({ contenuQR, ouvrirBonIntervention } = await import('./bon-intervention.js'));
  verifier('documents/bon-intervention.js s’importe sans erreur sous Node',
    typeof ouvrirBonIntervention === 'function' && typeof contenuQR === 'function');
} catch (erreur) {
  nbEchecs += 1;
  console.error('ÉCHEC import de documents/bon-intervention.js : ' + erreur.message);
  console.log(`\n${nbOk} test(s) réussi(s), ${nbEchecs} échec(s).`);
  process.exit(1);
}

const MACHINE_TEST = {
  id: 'mac-1', code: 'M1', designation: 'Chambre froide test',
  fluide: 'R404A', codePublic: 'ABC123X', clientId: 'cli-1'
};

const CLIENT_TEST = {
  id: 'cli-1', raisonSociale: 'Lycée Vidal', adresse: '12 rue de la Formation, Nîmes'
};

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
   2. Machine avec client connu : pré-remplissage + structure complète.
   ============================================================ */
{
  const ctx = {
    store: {
      async getMachines() { return [MACHINE_TEST]; },
      async getClients() { return [CLIENT_TEST]; }
    }
  };

  let exceptionRemontee = null;
  try {
    await ouvrirBonIntervention(ctx, 'mac-1');
  } catch (erreur) {
    exceptionRemontee = erreur;
  }
  verifier('ouvrirBonIntervention() ne plante pas même sans bibliothèque QR disponible',
    exceptionRemontee === null,
    exceptionRemontee ? String(exceptionRemontee.message) : '');

  const fond = document.body.querySelector('.modale-fond');
  verifier('la modale du bon d’intervention s’ouvre bien', Boolean(fond));

  const doc = fond.querySelector('.bi-document');
  verifier('le document bi-document est bien rendu', Boolean(doc));

  verifier('le titre « Bon d\'intervention » est présent',
    /Bon d.intervention/.test(fond.innerHTML));

  // Logo inerWeb Fluide (patron app.js) présent
  verifier('le logo inerWeb Fluide (sidebar-logo/logo-carre) est présent en en-tête',
    Boolean(fond.querySelector('.bi-doc-entete .sidebar-logo'))
    && Boolean(fond.querySelector('.bi-doc-entete .logo-carre')));

  // Deux emplacements réservés vides
  const reserves = fond.querySelectorAll('.bi-doc-reserve');
  verifier('les deux emplacements réservés (établissement/groupement) sont présents',
    reserves.length === 2);
  verifier('les légendes des emplacements réservés sont correctes',
    /Logo établissement/.test(fond.innerHTML) && /Logo groupement/.test(fond.innerHTML));

  // Client pré-rempli
  verifier('le client est pré-rempli (raison sociale)',
    fond.innerHTML.includes('Lycée Vidal'));
  verifier('l’adresse du client est pré-remplie',
    fond.innerHTML.includes('12 rue de la Formation, Nîmes'));

  // Cases à cocher type d'intervention (3, non cochées)
  const cases = fond.querySelectorAll('.bi-case');
  verifier('les 3 cases de type d’intervention sont présentes (Dépannage/Entretien/Mise en service)',
    cases.length === 3);
  verifier('les libellés des types d’intervention sont corrects',
    /Dépannage/.test(fond.innerHTML) && /Entretien/.test(fond.innerHTML)
    && /Mise en service/.test(fond.innerHTML));

  // Zones vides à compléter à la main : technicien, dates, heures
  verifier('les champs technicien(s) vides sont présents',
    /Prénom\(s\)/.test(fond.innerHTML) && /Heure d.arrivée/.test(fond.innerHTML)
    && /Heure de départ/.test(fond.innerHTML) && /Temps passé/.test(fond.innerHTML));

  // Zones de texte libre (descriptif, commentaire)
  verifier('la zone « Descriptif de la mission » est présente',
    /Descriptif de la mission/.test(fond.innerHTML));
  verifier('la zone « Commentaire / observations / valeur de réglages » est présente',
    /Commentaire \/ observations \/ valeur de réglages/.test(fond.innerHTML));

  // Bas de page 2 colonnes : signatures
  verifier('le bloc bas de page (2 colonnes signatures) est présent',
    /Fait à/.test(fond.innerHTML) && /Signature du Technicien/.test(fond.innerHTML)
    && /Remarques client/.test(fond.innerHTML) && /Signature client/.test(fond.innerHTML));

  // Machine concernée en marge (traçabilité)
  const zoneQR = fond.querySelector('#bi-machine-qr');
  verifier('la zone QR de traçabilité machine est rendue (non vide)',
    Boolean(zoneQR) && zoneQR.innerHTML.length > 0);
  verifier('la désignation et le code_public de la machine apparaissent en marge',
    fond.innerHTML.includes('Chambre froide test') && fond.innerHTML.includes('ABC123X'));

  // Pied de page
  verifier('le pied de page mentionne « Généré par inerWeb Fluide le »',
    /Généré par inerWeb Fluide le/.test(fond.innerHTML));

  fond.remove();
}

/* ============================================================
   3. Machine SANS client (clientId absent) : champs client vides,
   pas d'exception, document toujours généré.
   ============================================================ */
{
  const MACHINE_SANS_CLIENT = { ...MACHINE_TEST, clientId: null };
  const ctx = {
    store: {
      async getMachines() { return [MACHINE_SANS_CLIENT]; },
      async getClients() { return [CLIENT_TEST]; }
    }
  };

  let exceptionRemontee = null;
  try {
    await ouvrirBonIntervention(ctx, 'mac-1');
  } catch (erreur) {
    exceptionRemontee = erreur;
  }
  verifier('sans client rattaché, ouvrirBonIntervention() ne plante pas',
    exceptionRemontee === null,
    exceptionRemontee ? String(exceptionRemontee.message) : '');

  const fond = document.body.querySelector('.modale-fond');
  verifier('la modale s’ouvre bien même sans client rattaché', Boolean(fond));
  verifier('le nom du client (Lycée Vidal) n’apparaît pas quand la machine n’a pas de clientId',
    !fond.innerHTML.includes('Lycée Vidal'));

  fond.remove();
}

/* ============================================================
   4. Machine introuvable : aucune exception, aucune modale ouverte.
   ============================================================ */
{
  const ctx = {
    store: {
      async getMachines() { return [MACHINE_TEST]; },
      async getClients() { return [CLIENT_TEST]; }
    }
  };

  const nbModalesAvant = document.body.querySelectorAll('.modale-fond').length;
  let exceptionRemontee = null;
  try {
    await ouvrirBonIntervention(ctx, 'id-inexistant');
  } catch (erreur) {
    exceptionRemontee = erreur;
  }
  verifier('machine introuvable : aucune exception levée',
    exceptionRemontee === null);
  const nbModalesApres = document.body.querySelectorAll('.modale-fond').length;
  verifier('machine introuvable : aucune modale ouverte',
    nbModalesApres === nbModalesAvant);
}

/* ============================================================
   Lot D carte blanche (13/08) : LE PAPIER PORTE TOUT LE DOCUMENT.
   L'ancien bloc d'impression clouait `.bi-document` en position: fixed
   sur la première feuille — mesuré au lot 1 : 138 caractères sur le
   papier, fin du document ABSENTE. Ce que cette section garde, c'est le
   patron ÉPROUVÉ du justificatif de régularisation (lot 1), appliqué ici.
   ============================================================ */
{
  const { CSS_IMPRESSION_BON } = await import('./bon-intervention.js');

  verifier('impression : le bloc masque tout le reste de la page',
    /@media print[\s\S]*body \* \{ visibility: hidden; \}/
      .test(CSS_IMPRESSION_BON));
  verifier('impression : le document ET SES DESCENDANTS restent visibles',
    /\.bi-document,\s*\n?\s*\.bi-document \* \{ visibility: visible; \}/
      .test(CSS_IMPRESSION_BON));
  verifier('⭐ le document reste DANS LE FLUX (plus jamais position: fixed '
    + '— c’est lui qui clouait tout à la première feuille)',
  /\.bi-document \{[^}]*position: relative;/.test(CSS_IMPRESSION_BON)
    && !/\.bi-document \{[^}]*position: fixed/.test(CSS_IMPRESSION_BON));
  for (const classe of ['modale-fond', 'modale', 'modale-corps',
    'bi-doc-apercu']) {
    verifier(`⭐ l’ancêtre .${classe} est remis à plat à l’impression`,
      new RegExp(`\\.${classe}[,\\s]`).test(CSS_IMPRESSION_BON));
  }
  for (const propriete of ['position: static', 'overflow: visible',
    'max-height: none', 'backdrop-filter: none']) {
    verifier(`⭐ … et la remise à plat porte « ${propriete} »`,
      CSS_IMPRESSION_BON.includes(propriete));
  }
  verifier('⭐ le transform de la modale est réécrit à la MÊME spécificité '
    + 'que composants.css',
  /\.modale-fond\.visible \.modale \{ transform: none; \}/
    .test(CSS_IMPRESSION_BON));
  verifier('⭐ rien de l’application ne prend de place sur la feuille',
    /body > \* \{ display: none !important; \}/.test(CSS_IMPRESSION_BON)
    && /body > #zone-modales/.test(CSS_IMPRESSION_BON));
  verifier('un champ manuscrit ne se coupe pas entre deux pages',
    /\.bi-doc-champ,[\s\S]*?break-inside: avoid/.test(CSS_IMPRESSION_BON));
}

// ---- Bilan ----
console.log('\nÀ VALIDER EN NAVIGATEUR (non testable sous Node) : le rendu '
  + 'canvas réel du QR et le rendu d’impression (@media print) — voir '
  + 'v8/js/lib/qrcode-vendor.js et v8/index.html.');
console.log(`\n${nbOk} test(s) réussi(s), ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
