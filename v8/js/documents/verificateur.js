// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — vérificateur AUTONOME de dossier scellé (brique ④)
//
// Objectif : qu'un auditeur puisse prouver l'intégrité d'un dossier
// ZIP scellé SANS le logiciel — un simple fichier HTML embarqué dans
// chaque archive (99-VERIFICATEUR.html), qui fonctionne hors ligne,
// dans n'importe quel navigateur moderne, ouvert depuis le disque.
//
// Ce module fournit :
//  - NOYAU_SOURCE : le code de vérification EMBARQUÉ tel quel dans le
//    HTML (analyseur ZIP « stored » + lecture du manifeste + SHA-256
//    via Web Crypto). Les tests Node évaluent CETTE MÊME source :
//    ce qui est prouvé en test est exactement ce qui part en archive.
//  - construireVerificateurHtml() : la page autonome (français, sobre,
//    zéro ressource externe ; les noms de fichiers issus du ZIP sont
//    affichés via textContent — un ZIP falsifié est une donnée
//    HOSTILE, jamais interprétée comme du HTML).
//  - construireCertificatHtml(...) : le certificat de scellement
//    imprimable (empreinte globale + consignes de conservation et de
//    vérification), téléchargé À CÔTÉ du ZIP (l'empreinte globale ne
//    peut pas vivre DANS le fichier qu'elle scelle).
//
// ⚠️ Aucune évaluation dynamique ICI (CSP de l'application) : la
// source n'est évaluée que dans la page autonome (contexte propre)
// et dans les tests Node.
// ============================================================

/**
 * Source du noyau de vérification, embarquée dans la page autonome.
 * Fonctions PURES, zéro dépendance, français. Conventions du format
 * produit par core/zip.js : méthode 0 (« stored »), noms UTF-8.
 */
export const NOYAU_SOURCE = `
/** Lit un entier 16 bits petit-boutiste. */
function u16(octets, position) {
  return octets[position] | (octets[position + 1] << 8);
}

/** Lit un entier 32 bits petit-boutiste (non signé). */
function u32(octets, position) {
  return (octets[position] | (octets[position + 1] << 8)
    | (octets[position + 2] << 16) | (octets[position + 3] << 24)) >>> 0;
}

/**
 * Analyse une archive ZIP « stored » (méthode 0, celle des dossiers
 * inerWeb Fluide) : fin de répertoire central (EOCD), répertoire
 * central, puis données de chaque entrée via son en-tête local.
 * Une entrée compressée (autre méthode) est signalée ILLISIBLE au
 * lieu de faire échouer toute la vérification.
 * @param {Uint8Array} octets
 * @returns {Array<{nom: string, octets: Uint8Array|null, methode: number}>}
 */
function analyserZip(octets) {
  if (!octets || octets.length < 22) {
    throw new Error("Ce fichier n'est pas une archive ZIP lisible.");
  }
  // EOCD : signature 0x06054b50, cherchée depuis la fin (le commentaire
  // de fin d'archive peut occuper jusqu'à 65 535 octets).
  let finRepertoire = -1;
  const borne = Math.max(0, octets.length - 22 - 65535);
  for (let i = octets.length - 22; i >= borne; i -= 1) {
    if (u32(octets, i) === 0x06054b50) { finRepertoire = i; break; }
  }
  if (finRepertoire < 0) {
    throw new Error("Ce fichier n'est pas une archive ZIP lisible (fin de répertoire absente).");
  }
  const nbEntrees = u16(octets, finRepertoire + 10);
  const debutRepertoire = u32(octets, finRepertoire + 16);
  // Gardes anti-abus : une archive forgée peut déclarer des dizaines de
  // milliers d'entrées pointant vers les mêmes octets et figer le
  // navigateur pendant le hachage. Aucun dossier inerWeb Fluide
  // n'approche ces bornes.
  if (nbEntrees > 10000) {
    throw new Error('Archive anormale : ' + nbEntrees
      + ' entrées déclarées (limite de vérification : 10 000).');
  }

  const decodeur = new TextDecoder('utf-8');
  const entrees = [];
  let position = debutRepertoire;
  let cumulDeclare = 0;
  for (let n = 0; n < nbEntrees; n += 1) {
    if (u32(octets, position) !== 0x02014b50) {
      throw new Error('Répertoire central corrompu (entrée ' + (n + 1) + ').');
    }
    const methode = u16(octets, position + 10);
    const tailleComprimee = u32(octets, position + 20);
    cumulDeclare += tailleComprimee;
    if (cumulDeclare > 1024 * 1024 * 1024) {
      throw new Error('Archive anormale : plus de 1 Go de données déclarées, '
        + 'vérification refusée (protection contre les archives forgées).');
    }
    const longueurNom = u16(octets, position + 28);
    const longueurExtra = u16(octets, position + 30);
    const longueurCommentaire = u16(octets, position + 32);
    const decalageLocal = u32(octets, position + 42);
    const nom = decodeur.decode(
      octets.subarray(position + 46, position + 46 + longueurNom));

    if (!nom.endsWith('/')) {
      let contenu = null;
      if (methode === 0) {
        if (u32(octets, decalageLocal) !== 0x04034b50) {
          throw new Error('En-tête local corrompu pour « ' + nom + ' ».');
        }
        const nomLocal = u16(octets, decalageLocal + 26);
        const extraLocal = u16(octets, decalageLocal + 28);
        const debutDonnees = decalageLocal + 30 + nomLocal + extraLocal;
        contenu = octets.subarray(debutDonnees, debutDonnees + tailleComprimee);
      }
      entrees.push({ nom: nom, octets: contenu, methode: methode });
    }
    position += 46 + longueurNom + longueurExtra + longueurCommentaire;
  }
  return entrees;
}

/**
 * Lit le manifeste 01-EMPREINTES-SHA256.txt : une ligne
 * « <64 hexadécimaux>  <nom de fichier> » par entrée scellée.
 * @param {string} texte
 * @returns {Array<{empreinte: string, nom: string}>}
 */
function analyserManifeste(texte) {
  const attendus = [];
  for (const ligne of String(texte).split(/\\r?\\n/)) {
    const correspondance = /^([0-9a-f]{64})\\s+(.+)$/.exec(ligne.trim());
    if (correspondance) {
      attendus.push({ empreinte: correspondance[1], nom: correspondance[2] });
    }
  }
  return attendus;
}

/** Empreinte SHA-256 (hexadécimal minuscule) via Web Crypto. */
async function calculerSha256Hex(octets) {
  const resume = await globalThis.crypto.subtle.digest('SHA-256', octets);
  const vue = new Uint8Array(resume);
  let hex = '';
  for (let i = 0; i < vue.length; i += 1) {
    hex += vue[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/** Fichiers non listés au manifeste MAIS attendus (scellés par
 *  l'empreinte GLOBALE du .zip, conservée hors du dossier). */
var HORS_MANIFESTE_ATTENDUS = ['01-EMPREINTES-SHA256.txt', '99-VERIFICATEUR.html'];

/**
 * Vérifie une archive complète : recalcule l'empreinte de CHAQUE
 * fichier et la compare au manifeste embarqué, plus l'empreinte
 * GLOBALE du .zip (à comparer à la valeur conservée hors du dossier).
 * @param {Uint8Array} octetsZip
 * @returns {Promise<{empreinteGlobale: string, fichiers: Array,
 *   manquants: string[], nbConformes: number, nbAlteres: number,
 *   nbInattendus: number, nbIllisibles: number, integriteInterne: boolean}>}
 */
async function verifierArchive(octetsZip) {
  const empreinteGlobale = await calculerSha256Hex(octetsZip);
  const entrees = analyserZip(octetsZip);

  const manifesteEntree = entrees.find(function (e) {
    return e.nom === '01-EMPREINTES-SHA256.txt';
  });
  if (!manifesteEntree) {
    throw new Error('Manifeste 01-EMPREINTES-SHA256.txt introuvable : '
      + "ce fichier n'est pas un dossier scellé inerWeb Fluide.");
  }
  if (!manifesteEntree.octets) {
    throw new Error('Manifeste 01-EMPREINTES-SHA256.txt présent mais '
      + 'COMPRESSÉ : illisible par ce vérificateur (les dossiers inerWeb '
      + 'Fluide ne compressent pas leurs entrées — archive suspecte).');
  }
  const attendus = analyserManifeste(
    new TextDecoder('utf-8').decode(manifesteEntree.octets));
  const parNom = {};
  for (const a of attendus) { parNom[a.nom] = a.empreinte; }

  const fichiers = [];
  const nomsPresents = {};
  for (const entree of entrees) {
    nomsPresents[entree.nom] = true;
    if (entree.octets === null) {
      fichiers.push({ nom: entree.nom, attendu: parNom[entree.nom] || null,
        calcule: null, etat: 'ILLISIBLE' });
      continue;
    }
    const calcule = await calculerSha256Hex(entree.octets);
    const attendu = parNom[entree.nom];
    if (attendu) {
      fichiers.push({ nom: entree.nom, attendu: attendu, calcule: calcule,
        etat: attendu === calcule ? 'CONFORME' : 'ALTERE' });
    } else if (HORS_MANIFESTE_ATTENDUS.indexOf(entree.nom) >= 0) {
      fichiers.push({ nom: entree.nom, attendu: null, calcule: calcule,
        etat: 'SCELLE_GLOBAL' });
    } else {
      fichiers.push({ nom: entree.nom, attendu: null, calcule: calcule,
        etat: 'INATTENDU' });
    }
  }

  const manquants = attendus
    .filter(function (a) { return !nomsPresents[a.nom]; })
    .map(function (a) { return a.nom; });

  const compter = function (etat) {
    return fichiers.filter(function (f) { return f.etat === etat; }).length;
  };
  const nbAlteres = compter('ALTERE');
  const nbInattendus = compter('INATTENDU');
  const nbIllisibles = compter('ILLISIBLE');
  return {
    empreinteGlobale: empreinteGlobale,
    fichiers: fichiers,
    manquants: manquants,
    nbConformes: compter('CONFORME'),
    nbAlteres: nbAlteres,
    nbInattendus: nbInattendus,
    nbIllisibles: nbIllisibles,
    integriteInterne: nbAlteres === 0 && nbIllisibles === 0
      && nbInattendus === 0 && manquants.length === 0
  };
}
`;

/** Libellés et couleurs des états, partagés entre la page et sa légende. */
const ETATS_PAGE = `
var LIBELLES_ETAT = {
  CONFORME: 'Conforme',
  ALTERE: 'ALTÉRÉ',
  INATTENDU: 'Inattendu (absent du manifeste)',
  ILLISIBLE: 'Illisible (compression non prise en charge)',
  SCELLE_GLOBAL: 'Scellé par l\\'empreinte globale'
};
`;

/** Script d'interface de la page autonome (câblage DOM, zéro donnée en HTML). */
const INTERFACE_SOURCE = `
function elt(id) { return document.getElementById(id); }

function afficherRapport(rapport) {
  elt('resultats').hidden = false;
  elt('empreinte-globale').textContent = rapport.empreinteGlobale;
  comparerReference();

  var verdict = elt('verdict-interne');
  if (rapport.integriteInterne) {
    // Honnêteté (revue adversariale) : le manifeste vit DANS l'archive,
    // un faussaire peut régénérer les deux ensemble — seule la
    // comparaison à l'empreinte de référence externe prouve l'origine.
    verdict.textContent = 'Cohérence interne : les ' + rapport.nbConformes
      + ' fichiers scellés correspondent tous au manifeste. Attention : '
      + "ceci ne prouve PAS l'authenticité de l'archive — seule la "
      + "comparaison à l'empreinte de référence conservée hors du dossier "
      + '(étape 2 ci-dessus) le prouve.';
    verdict.className = 'verdict bon';
  } else {
    var problemes = [];
    if (rapport.nbAlteres) problemes.push(rapport.nbAlteres + ' fichier(s) ALTÉRÉ(S)');
    if (rapport.manquants.length) problemes.push(rapport.manquants.length + ' fichier(s) MANQUANT(S)');
    if (rapport.nbInattendus) problemes.push(rapport.nbInattendus + ' fichier(s) INATTENDU(S)');
    if (rapport.nbIllisibles) problemes.push(rapport.nbIllisibles + ' fichier(s) illisible(s)');
    verdict.textContent = 'ANOMALIES : ' + problemes.join(', ') + '.';
    verdict.className = 'verdict mauvais';
  }

  var corps = elt('corps-fichiers');
  corps.textContent = '';
  rapport.fichiers.forEach(function (f) {
    var ligne = document.createElement('tr');
    var nom = document.createElement('td');
    nom.textContent = f.nom;                    // donnée HOSTILE : jamais en HTML
    var etat = document.createElement('td');
    etat.textContent = LIBELLES_ETAT[f.etat] || f.etat;
    etat.className = 'etat-' + f.etat.toLowerCase();
    ligne.appendChild(nom); ligne.appendChild(etat);
    corps.appendChild(ligne);
  });
  rapport.manquants.forEach(function (nomManquant) {
    var ligne = document.createElement('tr');
    var nom = document.createElement('td');
    nom.textContent = nomManquant;
    var etat = document.createElement('td');
    etat.textContent = 'MANQUANT (listé au manifeste, absent de l\\'archive)';
    etat.className = 'etat-altere';
    ligne.appendChild(nom); ligne.appendChild(etat);
    corps.appendChild(ligne);
  });
}

function comparerReference() {
  var saisie = elt('empreinte-reference').value.trim().toLowerCase();
  var calculee = elt('empreinte-globale').textContent;
  var verdict = elt('verdict-global');
  if (!saisie) { verdict.textContent = ''; verdict.className = 'verdict'; return; }
  if (!calculee) { return; }
  if (saisie === calculee) {
    verdict.textContent = 'IDENTIQUE : le fichier .zip est exactement celui qui a été scellé.';
    verdict.className = 'verdict bon';
  } else {
    verdict.textContent = 'DIFFÉRENTE : ce .zip N\\'EST PAS le fichier scellé d\\'origine (ou l\\'empreinte de référence est erronée).';
    verdict.className = 'verdict mauvais';
  }
}

async function traiterFichier(fichier) {
  var erreur = elt('erreur');
  erreur.textContent = '';
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    erreur.textContent = 'Web Crypto indisponible : ouvrez ce fichier '
      + 'directement depuis votre disque (double-clic), pas via un site non sécurisé.';
    return;
  }
  try {
    elt('nom-archive').textContent = fichier.name + ' (' + fichier.size + ' octets)';
    var octets = new Uint8Array(await fichier.arrayBuffer());
    var rapport = await verifierArchive(octets);
    afficherRapport(rapport);
  } catch (e) {
    elt('resultats').hidden = true;
    erreur.textContent = e && e.message ? e.message : String(e);
  }
}

elt('choix-fichier').addEventListener('change', function (evt) {
  if (evt.target.files && evt.target.files[0]) traiterFichier(evt.target.files[0]);
});
elt('zone-depot').addEventListener('dragover', function (evt) {
  evt.preventDefault();
  elt('zone-depot').classList.add('survol');
});
elt('zone-depot').addEventListener('dragleave', function () {
  elt('zone-depot').classList.remove('survol');
});
elt('zone-depot').addEventListener('drop', function (evt) {
  evt.preventDefault();
  elt('zone-depot').classList.remove('survol');
  if (evt.dataTransfer.files && evt.dataTransfer.files[0]) {
    traiterFichier(evt.dataTransfer.files[0]);
  }
});
elt('empreinte-reference').addEventListener('input', comparerReference);

// Point d'accès de contrôle (tests navigateur) : mêmes fonctions que l'interface.
globalThis.__verificateur = {
  analyserZip: analyserZip,
  analyserManifeste: analyserManifeste,
  verifierArchive: verifierArchive,
  traiterFichier: traiterFichier
};
`;

/**
 * Page HTML AUTONOME de vérification (99-VERIFICATEUR.html) : hors
 * ligne, zéro ressource externe, français. Elle vit dans un contexte
 * à elle (fichier ouvert depuis le disque) : la CSP de l'application
 * ne s'y applique pas, le script inline y est légitime.
 */
export function construireVerificateurHtml() {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vérificateur de dossier scellé — inerWeb Fluide</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    margin: 0; background: #f4f6f8; color: #16283c; }
  main { max-width: 860px; margin: 0 auto; padding: 28px 20px 60px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sous-titre { color: #51637a; margin: 0 0 22px; font-size: 14px; }
  section { background: #fff; border: 1px solid #d8e0e8; border-radius: 10px;
    padding: 18px 20px; margin-bottom: 18px; }
  h2 { font-size: 15px; margin: 0 0 10px; }
  p { font-size: 14px; line-height: 1.5; }
  #zone-depot { border: 2px dashed #9db1c4; border-radius: 10px;
    padding: 26px; text-align: center; color: #51637a; cursor: pointer; }
  #zone-depot.survol { border-color: #12b5c9; background: #eefafc; }
  code, .mono { font-family: ui-monospace, Consolas, monospace; }
  #empreinte-globale { display: block; word-break: break-all; background: #f0f3f6;
    border-radius: 6px; padding: 10px; font-size: 13px; margin: 8px 0; }
  #empreinte-reference { width: 100%; box-sizing: border-box; padding: 9px 10px;
    border: 1px solid #c3cfdb; border-radius: 6px; font-size: 13px;
    font-family: ui-monospace, Consolas, monospace; }
  .verdict { font-weight: 600; font-size: 14px; margin-top: 10px; }
  .verdict.bon { color: #1d7a44; }
  .verdict.mauvais { color: #b3261e; }
  #erreur { color: #b3261e; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #e4eaf0;
    word-break: break-all; }
  .etat-conforme { color: #1d7a44; font-weight: 600; }
  .etat-altere, .etat-inattendu { color: #b3261e; font-weight: 700; }
  .etat-illisible { color: #a05a00; font-weight: 600; }
  .etat-scelle_global { color: #51637a; }
  footer { color: #7b8b9d; font-size: 12px; margin-top: 24px; }
  @media print { #zone-depot, input, footer { display: none; } body { background: #fff; } }
</style>
</head>
<body>
<main>
  <h1>Vérificateur de dossier scellé</h1>
  <p class="sous-titre">inerWeb Fluide — vérification d'intégrité hors ligne,
    sans logiciel ni connexion. Ce fichier est embarqué dans chaque archive scellée.</p>

  <section>
    <h2>1. Choisissez l'archive .zip à vérifier</h2>
    <div id="zone-depot">
      <p>Déposez ici le fichier <span class="mono">.zip</span> du dossier scellé,<br>
      ou <label for="choix-fichier" style="text-decoration:underline;cursor:pointer">cliquez pour le choisir</label>.</p>
      <input type="file" id="choix-fichier" accept=".zip" style="display:none">
    </div>
    <p id="nom-archive" class="mono" style="color:#51637a"></p>
    <p id="erreur"></p>
  </section>

  <section id="resultats" hidden>
    <h2>2. Empreinte SHA-256 globale de l'archive</h2>
    <code id="empreinte-globale"></code>
    <p>Comparez-la à l'empreinte conservée <strong>hors du dossier</strong>
      (certificat de scellement, impression, courriel) — collez-la ici :</p>
    <input type="text" id="empreinte-reference" placeholder="Empreinte de référence (64 caractères)">
    <p id="verdict-global" class="verdict"></p>

    <h2 style="margin-top:22px">3. Cohérence interne (fichiers ↔ manifeste)</h2>
    <p id="verdict-interne" class="verdict"></p>
    <table>
      <thead><tr><th>Fichier</th><th>État</th></tr></thead>
      <tbody id="corps-fichiers"></tbody>
    </table>
  </section>

  <footer>
    <p>Rappel : l'empreinte globale prouve que le fichier .zip est celui
    d'origine ; le manifeste interne prouve qu'aucun document du dossier n'a
    été modifié. Les deux vérifications sont indépendantes. Vous pouvez aussi
    recalculer l'empreinte avec un outil standard, par exemple sous Windows :
    <span class="mono">Get-FileHash dossier.zip -Algorithm SHA256</span>.</p>
  </footer>
</main>
<script>
${NOYAU_SOURCE}
${ETATS_PAGE}
${INTERFACE_SOURCE}
</script>
</body>
</html>
`;
}

/** Échappement HTML minimal pour le certificat (valeurs de l'application). */
function echapper(texte) {
  return String(texte ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Certificat de scellement imprimable, téléchargé À CÔTÉ de l'archive
 * (l'empreinte globale ne peut pas vivre dans le fichier qu'elle scelle).
 * @param {{ titre: string, nomFichier: string, empreinte: string,
 *           nbDocuments: number, dateTexte: string }} p
 * @returns {string} document HTML autonome
 */
export function construireCertificatHtml(
  { titre, nomFichier, empreinte, nbDocuments, dateTexte }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Certificat de scellement — ${echapper(nomFichier)}</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #16283c; margin: 0; }
  main { max-width: 720px; margin: 0 auto; padding: 48px 24px; }
  .cadre { border: 2px solid #0e2a47; border-radius: 12px; padding: 32px 36px; }
  h1 { font-size: 20px; margin: 0 0 2px; color: #0e2a47; }
  .sous-titre { color: #51637a; font-size: 13px; margin: 0 0 24px; }
  dl { font-size: 14px; }
  dt { font-weight: 600; color: #51637a; text-transform: uppercase;
    font-size: 11px; letter-spacing: .04em; margin-top: 14px; }
  dd { margin: 2px 0 0; }
  .empreinte { font-family: ui-monospace, Consolas, monospace; font-size: 14px;
    word-break: break-all; background: #f0f3f6; padding: 12px;
    border-radius: 8px; margin-top: 4px; }
  .consignes { font-size: 13px; color: #37485c; line-height: 1.55;
    border-top: 1px solid #d8e0e8; margin-top: 26px; padding-top: 16px; }
  .mono { font-family: ui-monospace, Consolas, monospace; }
  footer { color: #7b8b9d; font-size: 11px; margin-top: 18px; }
</style>
</head>
<body>
<main>
  <div class="cadre">
    <h1>Certificat de scellement</h1>
    <p class="sous-titre">inerWeb Fluide — traçabilité des fluides frigorigènes</p>
    <dl>
      <dt>Dossier</dt><dd>${echapper(titre)}</dd>
      <dt>Archive</dt><dd class="mono">${echapper(nomFichier)}</dd>
      <dt>Documents scellés</dt><dd>${echapper(nbDocuments)} fichiers</dd>
      <dt>Scellé le</dt><dd>${echapper(dateTexte)}</dd>
      <dt>Empreinte SHA-256 de l'archive</dt>
      <dd class="empreinte">${echapper(empreinte)}</dd>
    </dl>
    <div class="consignes">
      <p><strong>Conservez ce certificat hors du dossier</strong> (impression,
      courriel, coffre) : il fait foi. Un fichier .zip dont l'empreinte SHA-256
      recalculée est identique à celle ci-dessus est, octet pour octet, le
      dossier scellé d'origine.</p>
      <p><strong>Pour vérifier</strong> : ouvrez le fichier
      <span class="mono">99-VERIFICATEUR.html</span> contenu dans l'archive
      (double-clic, aucune installation) et déposez-y le .zip — ou recalculez
      l'empreinte avec un outil standard, par exemple sous Windows&nbsp;:
      <span class="mono">Get-FileHash dossier.zip -Algorithm SHA256</span>.</p>
    </div>
    <footer>Certificat généré par inerWeb Fluide. Ce document ne contient
    aucune donnée nominative.</footer>
  </div>
</main>
</body>
</html>
`;
}
