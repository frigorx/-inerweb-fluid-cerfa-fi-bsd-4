// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerNoWeb — la copie HORS LIGNE des ressources pédagogiques
// ============================================================
//
// POURQUOI CET OUTIL EXISTE (constat du 22/09/2026,
// docs/ACCES-RESEAU-ETABLISSEMENT.md).
// Sur les postes du lycée, l'ouverture de inerweb.fr est refusée par
// l'antivirus de l'établissement. Le site, lui, va bien : le refus est
// posé SUR LA MACHINE, par une stratégie que nous ne pilotons pas et
// qui ne va pas se desserrer — quatre responsables informatiques en deux
// ans, un rançongiciel il y a six mois. Attendre une autorisation, c'est
// attendre des années ; la contourner, c'est se mettre en faute.
//
// Reste la troisième voie, la seule qui ne dépende de personne : ne plus
// avoir besoin du réseau. Les ressources sont des pages statiques — HTML,
// CSS, JavaScript, images. Aucune d'elles n'appelle de serveur (vérifié :
// ni fetch, ni XMLHttpRequest, ni module ES, ni fichier JSON chargé à
// l'exécution). Copiées telles quelles, elles s'ouvrent d'un double-clic,
// sans installation, sans droits d'administrateur, sans Internet.
//
// CE QUE FAIT CET OUTIL. Il parcourt le site publié, télécharge tout ce
// qui lui appartient, réécrit les liens pour qu'ils fonctionnent depuis
// un simple dossier (protocole file://), et rend un dossier + un ZIP
// prêts à copier sur une clé USB.
//
//   node outils/fabriquer-inernoweb.mjs            (dossier seul)
//   node outils/fabriquer-inernoweb.mjs --zip      (dossier + inerNoWeb.zip)
//   npm run inernoweb                              (archive complète, voix comprises)
//
// Options : --source <url> (défaut https://inerweb.fr — une adresse plus
//           précise n'emporte que cette branche), --sortie <dossier>, --zip,
//           --zip-seulement (refaire l'archive sans reparcourir), --voix
//           (emporter le fonds de narration, plusieurs centaines de Mo),
//           --max <n> fichiers (défaut 4000), --verbeux.
//
// POUR METTRE À JOUR. Rejouer la même commande : le dossier et le ZIP sont
// refabriqués depuis le site en ligne, donc à jour. C'est l'usage prévu —
// le site évolue, la copie hors ligne se régénère.
//
// CE QU'IL NE PEUT PAS EMPORTER, et le dit. Les vidéos YouTube et tout ce
// qui vit sur un autre domaine restent des liens vers Internet : hors
// ligne, ils ne s'ouvriront pas. L'outil les inventorie et les annonce à
// la fin, plutôt que de laisser la découverte à l'élève en pleine séance.
//
// LIMITES ASSUMÉES DE LA RÉÉCRITURE. Les liens sont réécrits par analyse
// des attributs href/src/srcset/poster et des url() des feuilles de
// style. Une adresse fabriquée à l'exécution par du JavaScript échappe à
// cette analyse : l'outil ne peut pas la voir. Le rapport final relit le
// dossier produit et signale toute cible manquante — c'est ce contrôle,
// pas la réécriture, qui dit si la copie tient debout.
//
// Node ≥ 22, zéro dépendance (fetch intégré, ZIP par server/zip-node.js).
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
const { crc32 } = require('../server/zip-node.js');

// fileURLToPath et non URL.pathname : sous Windows ce dernier rend « /C:/… ».
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------------------
// Arguments
// ------------------------------------------------------------

function lireArguments(argv) {
  const opts = {
    source: 'https://inerweb.fr',
    sortie: path.join(RACINE, 'output', 'inerNoWeb'),
    zip: false,
    max: 4000,
    verbeux: false,
    zipSeulement: false,
    voix: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--source') opts.source = argv[++i];
    else if (a === '--sortie') opts.sortie = path.resolve(argv[++i]);
    else if (a === '--zip') opts.zip = true;
    else if (a === '--zip-seulement') { opts.zip = true; opts.zipSeulement = true; }
    else if (a === '--max') opts.max = Number(argv[++i]);
    else if (a === '--voix') opts.voix = true;
    else if (a === '--verbeux') opts.verbeux = true;
    else if (a === '--aide' || a === '-h') {
      console.log('node outils/fabriquer-inernoweb.mjs [--source <url>] [--sortie <dossier>] [--zip] [--voix] [--max <n>] [--verbeux]');
      process.exit(0);
    } else {
      console.error(`Argument inconnu : ${a}`);
      process.exit(2);
    }
  }
  if (!Number.isFinite(opts.max) || opts.max <= 0) {
    console.error('--max attend un nombre de pages positif.');
    process.exit(2);
  }
  return opts;
}

// ------------------------------------------------------------
// Adresses : de l'URL au fichier du dossier hors ligne
// ------------------------------------------------------------

// Les adresses que Cloudflare fabrique pour masquer les courriels ne sont
// pas des pages : le script email-decode les remplace côté navigateur.
// Les télécharger n'aurait aucun sens — on les laisse telles quelles.
const PREFIXES_IGNORES = ['/cdn-cgi/l/'];

const PROTOCOLES_INERTES = /^(#|mailto:|tel:|javascript:|data:|blob:|sms:)/i;

/**
 * Chemin du fichier local correspondant à une URL du site.
 * Règle : une adresse dont le dernier segment ne porte pas de point est
 * traitée comme un dossier (on y range index.html). Le site n'expose que
 * des dossiers terminés par « / » et des fichiers avec extension, cette
 * règle y est donc exacte.
 */
function cheminLocal(url) {
  let p = decodeURIComponent(url.pathname);
  const dernier = p.split('/').pop();
  if (p.endsWith('/')) p += 'index.html';
  else if (!dernier.includes('.')) p += '/index.html';
  p = p.replace(/^\/+/, '');
  return p === '' ? 'index.html' : p;
}

function relatif(depuis, vers) {
  const r = path.posix.relative(path.posix.dirname(depuis), vers);
  return r === '' ? path.posix.basename(vers) : r;
}

// ------------------------------------------------------------
// Réécriture des références
// ------------------------------------------------------------

const ATTRIBUTS = /(\s(?:href|src|poster|data-src)\s*=\s*)("([^"]*)"|'([^']*)')/gi;
const SRCSET = /(\ssrcset\s*=\s*)("([^"]*)"|'([^']*)')/gi;
const CSS_URL = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
const CSS_IMPORT = /@import\s+(['"])([^'"]+)\1/gi;

/**
 * Réécrit UNE référence. Rend la chaîne à écrire dans le fichier, et
 * signale à l'appelant l'URL à télécharger le cas échéant.
 */
function reecrireReference(brut, pageUrl, fichierPage, origine, contexte) {
  const valeur = brut.trim();
  if (valeur === '' || PROTOCOLES_INERTES.test(valeur)) return valeur;

  let cible;
  try {
    cible = new URL(valeur, pageUrl);
  } catch {
    return valeur;
  }

  if (cible.protocol !== 'http:' && cible.protocol !== 'https:') return valeur;

  if (cible.host !== origine.host) {
    contexte.externes.add(cible.origin + cible.pathname);
    return valeur;
  }

  if (PREFIXES_IGNORES.some((p) => cible.pathname.startsWith(p))) return valeur;

  const fichierCible = cheminLocal(cible);
  contexte.aPrendre.push({ url: cible.origin + cible.pathname + cible.search, fichier: fichierCible });

  // Sur une PAGE, la chaîne de requête porte du sens : « hocourant/?module=M1 »
  // ne désigne pas le même écran que « hocourant/ », et le navigateur la rend
  // bien à location.search, y compris sur file://. On la garde.
  // Sur un ASSET, elle ne sert qu'à casser le cache du serveur (« ?v=… ») :
  // hors ligne elle n'a plus d'objet, et certains navigateurs la digèrent mal.
  const requete = fichierCible.endsWith('.html') ? cible.search : '';
  return relatif(fichierPage, fichierCible) + requete + cible.hash;
}

const BLOC_SCRIPT = /<script\b[^>]*>[\s\S]*?<\/script>/gi;

// Dans un script, une adresse d'image est souvent assemblée à l'exécution :
//   const ASSET = "assets/symboles/";  …  <img src="${ASSET}${file}">
// Deux conséquences, tirées de la relecture du 22/09/2026.
//
// 1. RÉÉCRIRE CE TEXTE LE CASSE. « ${ASSET}${file} » n'est pas une adresse :
//    c'est un gabarit. La première version de cet outil en a fait
//    « ${ASSET}${file}/index.html » — du JavaScript corrompu, en ligne comme
//    hors ligne. Le contenu des <script> est donc rendu TEL QUEL, sans
//    exception.
// 2. MAIS IL FAUT QUAND MÊME EMPORTER CES IMAGES. On lit le script pour y
//    relever, sans rien y changer, les noms de fichiers écrits en clair et
//    les constantes de chemin, et on essaie les combinaisons. Ce sont des
//    PISTES : celle qui ne répond pas n'est pas un échec, juste une
//    supposition écartée.
const BASE_CHEMIN = /(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(['"])([^'"\n]*\/)\1/g;
// La chaîne de requête fait partie du littéral (« moteur/voix.js?v=20260902-1 »)
// et doit être tolérée, sinon la piste est manquée — constaté en ouvrant une
// station dans un vrai navigateur : cinq scripts injectés à l'exécution
// portaient tous un ?v=, et aucun n'avait été emporté.
const LITTERAL_FICHIER = /(['"])([\w./-]+\.(?:svg|png|jpe?g|webp|gif|avif|mp3|mp4|webm|ogg|pdf|woff2?|css|js))(?:\?[^'"\n]*)?\1/gi;

function scannerScript(script, pageUrl, contexte) {
  const bases = new Set(['']);
  for (const m of script.matchAll(BASE_CHEMIN)) bases.add(m[2]);

  const page = new URL(pageUrl);
  const racine = new URL('/', page);

  for (const m of script.matchAll(LITTERAL_FICHIER)) {
    const nom = m[2];
    for (const base of bases) {
      // Une base ne s'applique qu'à un nom nu : « a/b.svg » se suffit.
      if (base !== '' && nom.includes('/')) continue;
      // Deux points de départ, parce qu'un script résout tantôt depuis sa
      // page, tantôt depuis la racine du site : on essaie les deux et on
      // garde ce qui répond.
      for (const depuis of [page, racine]) {
        let cible;
        try {
          cible = new URL(base + nom, depuis);
        } catch {
          continue;
        }
        if (cible.host !== page.host) continue;
        contexte.pistes.push({ url: cible.origin + cible.pathname, fichier: cheminLocal(cible) });
      }
    }
  }
}

function reecrireHtml(texte, pageUrl, fichierPage, origine, contexte) {
  let sortie = '';
  let curseur = 0;
  BLOC_SCRIPT.lastIndex = 0;
  let bloc;
  while ((bloc = BLOC_SCRIPT.exec(texte)) !== null) {
    sortie += reecrireMarquage(texte.slice(curseur, bloc.index), pageUrl, fichierPage, origine, contexte);
    scannerScript(bloc[0], pageUrl, contexte);
    sortie += bloc[0];
    curseur = bloc.index + bloc[0].length;
  }
  sortie += reecrireMarquage(texte.slice(curseur), pageUrl, fichierPage, origine, contexte);
  return sortie;
}

function reecrireMarquage(texte, pageUrl, fichierPage, origine, contexte) {
  let sortie = texte.replace(ATTRIBUTS, (tout, avant, guillemets, doubles, simples) => {
    const valeur = doubles !== undefined ? doubles : simples;
    const q = guillemets[0];
    return `${avant}${q}${reecrireReference(valeur, pageUrl, fichierPage, origine, contexte)}${q}`;
  });

  sortie = sortie.replace(SRCSET, (tout, avant, guillemets, doubles, simples) => {
    const valeur = doubles !== undefined ? doubles : simples;
    const q = guillemets[0];
    const reecrit = valeur
      .split(',')
      .map((morceau) => {
        const t = morceau.trim();
        if (t === '') return '';
        const [adresse, ...descripteurs] = t.split(/\s+/);
        const neuf = reecrireReference(adresse, pageUrl, fichierPage, origine, contexte);
        return [neuf, ...descripteurs].join(' ');
      })
      .filter((m) => m !== '')
      .join(', ');
    return `${avant}${q}${reecrit}${q}`;
  });

  return reecrireCss(sortie, pageUrl, fichierPage, origine, contexte);
}

function reecrireCss(texte, pageUrl, fichierPage, origine, contexte) {
  let sortie = texte.replace(CSS_URL, (tout, guillemets, valeur) => {
    const neuf = reecrireReference(valeur, pageUrl, fichierPage, origine, contexte);
    return `url(${guillemets}${neuf}${guillemets})`;
  });
  sortie = sortie.replace(CSS_IMPORT, (tout, guillemets, valeur) => {
    const neuf = reecrireReference(valeur, pageUrl, fichierPage, origine, contexte);
    return `@import ${guillemets}${neuf}${guillemets}`;
  });
  return sortie;
}

// ------------------------------------------------------------
// Téléchargement
// ------------------------------------------------------------

async function telecharger(url, essais = 4) {
  let derniere;
  for (let i = 0; i < essais; i += 1) {
    try {
      const reponse = await fetch(url, { redirect: 'follow' });
      if (!reponse.ok) {
        const erreur = new Error(`HTTP ${reponse.status}`);
        // Un 4xx est une réponse, pas une panne : la réessayer quatre fois
        // ne ferait que perdre du temps — et les pistes du § scannerScript
        // en produisent beaucoup.
        if (reponse.status >= 400 && reponse.status < 500) erreur.definitif = true;
        throw erreur;
      }
      const type = (reponse.headers.get('content-type') || '').toLowerCase();
      const octets = Buffer.from(await reponse.arrayBuffer());
      return { type, octets, urlFinale: reponse.url || url };
    } catch (erreur) {
      derniere = erreur;
      if (erreur.definitif) break;
      if (i < essais - 1) await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
  throw derniere;
}

function ecrire(racineSortie, fichier, octets) {
  const cible = path.join(racineSortie, fichier);
  fs.mkdirSync(path.dirname(cible), { recursive: true });
  fs.writeFileSync(cible, octets);
}

// ------------------------------------------------------------
// Parcours
// ------------------------------------------------------------

async function parcourir(opts) {
  const origine = new URL(opts.source);
  // On part de l'adresse DONNÉE, pas de la racine : « --source
  // https://inerweb.fr/packs/fluides/res/pressostat-bp-kp1/ » doit emporter
  // cette station-là, et elle seule. La racine reste le défaut.
  const depart = origine;

  const file = [{ url: depart.href, fichier: cheminLocal(depart) }];
  const vus = new Map(); // fichier local -> url prise
  const contexte = { externes: new Set(), aPrendre: [], pistes: [] };
  const echecs = [];
  let pistesRetenues = 0;
  let pistesEcartees = 0;
  let octetsTotal = 0;

  while (file.length > 0) {
    if (vus.size >= opts.max) {
      console.warn(`\n⚠ Plafond de ${opts.max} fichiers atteint — parcours interrompu. Relancer avec --max plus grand.`);
      break;
    }

    const { url, fichier, piste } = file.shift();
    if (vus.has(fichier)) continue;
    vus.set(fichier, url);

    let recu;
    try {
      recu = await telecharger(url);
    } catch (erreur) {
      // Une piste qui ne répond pas est une supposition écartée, pas un
      // manque : elle ne doit ni alarmer ni faire échouer la fabrication.
      if (piste) pistesEcartees += 1;
      else echecs.push({ url, raison: String(erreur.message || erreur) });
      continue;
    }
    if (piste) pistesRetenues += 1;

    const estHtml = recu.type.includes('text/html');
    const estCss = recu.type.includes('text/css');

    let octets = recu.octets;
    if (estHtml || estCss) {
      const texte = octets.toString('utf8');
      contexte.aPrendre = [];
      contexte.pistes = [];
      const reecrit = estHtml
        ? reecrireHtml(texte, url, fichier, origine, contexte)
        : reecrireCss(texte, url, fichier, origine, contexte);
      for (const suite of contexte.aPrendre) {
        if (!vus.has(suite.fichier)) file.push(suite);
      }
      for (const suite of contexte.pistes) {
        if (!vus.has(suite.fichier)) file.push({ ...suite, piste: true });
      }
      octets = Buffer.from(reecrit, 'utf8');
    }

    ecrire(opts.sortie, fichier, octets);
    octetsTotal += octets.length;

    if (opts.verbeux) console.log(`  ${fichier} (${octets.length} o)`);
    else if (vus.size % 25 === 0) process.stdout.write('.');
  }

  return { vus, externes: contexte.externes, echecs, octetsTotal, pistesRetenues, pistesEcartees };
}

// ------------------------------------------------------------
// Le fonds de narration (option --voix)
// ------------------------------------------------------------

// Les cours se lisent à voix haute. Deux sources : le fonds audio fabriqué
// (Piper / Microsoft Neural), indexé par moteur/voix-index.js, et, à défaut,
// la synthèse vocale du navigateur — moteur/voix.js dit lui-même que « le
// cours ne dépend donc jamais du lot audio ». Emporter le fonds n'ajoute donc
// pas la fonction : il en apporte la QUALITÉ, celle qu'entendent les élèves
// en classe. Il pèse plusieurs centaines de Mo : c'est un choix, pas un
// défaut, d'où l'option.
//
// Le dossier n'est pas écrit en dur ici : on le lit dans voix.js, qui le
// calcule par `new URL("…", scriptUrl)`. Si le site déplace ses voix, cet
// outil suit.
const BASE_VOIX = /new URL\(\s*(['"])([^'"]+)\1\s*,\s*scriptUrl\s*\)/;
const ENTREE_VOIX = /"fichier"\s*:\s*"([^"]+)"/g;

async function emporterVoix(opts, vus, racineSortie) {
  const trouver = (suffixe) => {
    for (const [fichier, url] of vus) if (fichier.endsWith(suffixe)) return { fichier, url };
    return null;
  };

  const voixJs = trouver('moteur/voix.js');
  const indexJs = trouver('moteur/voix-index.js');
  if (!voixJs || !indexJs) {
    console.log('  (aucun fonds de narration trouvé sur ce site — rien à emporter)');
    return { pris: 0, octets: 0, rates: 0 };
  }

  const texteVoix = fs.readFileSync(path.join(racineSortie, voixJs.fichier), 'utf8');
  const base = texteVoix.match(BASE_VOIX);
  if (!base) {
    console.log('  (le dossier des voix n\'a pas pu être lu dans voix.js — rien à emporter)');
    return { pris: 0, octets: 0, rates: 0 };
  }
  const racineAudio = new URL(base[2], voixJs.url);

  const texteIndex = fs.readFileSync(path.join(racineSortie, indexJs.fichier), 'utf8');
  const entrees = [...new Set([...texteIndex.matchAll(ENTREE_VOIX)].map((m) => m[1]))];

  console.log(`\n  Fonds de narration : ${entrees.length} fichier(s) depuis ${racineAudio.href}`);

  const aFaire = entrees
    .map((relatif) => {
      try {
        const url = new URL(relatif, racineAudio);
        return url.host === racineAudio.host ? { url: url.origin + url.pathname, fichier: cheminLocal(url) } : null;
      } catch {
        return null;
      }
    })
    .filter((e) => e !== null && !vus.has(e.fichier))
    .slice(0, Math.max(0, opts.max - vus.size));

  let pris = 0;
  let octets = 0;
  let rates = 0;
  let suivant = 0;

  // Huit de front : le fonds compte des milliers de fichiers, un par un cela
  // prendrait une heure. Au-delà, on fatigue l'hébergeur pour rien.
  const ouvriers = Array.from({ length: 8 }, async () => {
    for (;;) {
      const i = suivant;
      suivant += 1;
      if (i >= aFaire.length) return;
      const { url, fichier } = aFaire[i];
      try {
        const recu = await telecharger(url, 3);
        ecrire(racineSortie, fichier, recu.octets);
        vus.set(fichier, url);
        pris += 1;
        octets += recu.octets.length;
      } catch {
        rates += 1;
      }
      if ((i + 1) % 100 === 0) process.stdout.write('.');
    }
  });
  await Promise.all(ouvriers);
  console.log('');

  return { pris, octets, rates };
}

// ------------------------------------------------------------
// Contrôle : le dossier produit tient-il debout tout seul ?
// ------------------------------------------------------------

function listerFichiers(racine, prefixe = '') {
  const sortie = [];
  for (const entree of fs.readdirSync(path.join(racine, prefixe), { withFileTypes: true })) {
    const relatifEntree = prefixe ? `${prefixe}/${entree.name}` : entree.name;
    if (entree.isDirectory()) sortie.push(...listerFichiers(racine, relatifEntree));
    else sortie.push(relatifEntree);
  }
  return sortie;
}

/**
 * Relit le dossier produit et cherche les références locales qui ne
 * pointent sur rien. C'est ce contrôle qui dit si la copie fonctionne
 * hors ligne — la réécriture, seule, ne le prouve pas.
 */
function controler(racineSortie, fichiers) {
  const presents = new Set(fichiers);
  const manquants = [];

  for (const fichier of fichiers) {
    if (!/\.(html?|css)$/i.test(fichier)) continue;
    let texte = fs.readFileSync(path.join(racineSortie, fichier), 'utf8');
    // Le contenu des <script> n'est pas du marquage : « src="${ASSET}${file}" »
    // y est un gabarit, pas une adresse. Le juger comme une référence ferait
    // crier le contrôle à chaque page interactive, et ce bruit finirait par
    // couvrir les vrais manques.
    if (/\.html?$/i.test(fichier)) texte = texte.replace(BLOC_SCRIPT, '');
    const references = new Set();

    // Les attributs href/src n'ont de sens que dans du HTML. Les chercher
    // dans une feuille de style fait prendre pour une référence un exemple
    // écrit en commentaire — « href="…/moteur/impression.css" » — et le
    // contrôle accuse alors un manque qui n'existe pas.
    const estHtml = /\.html?$/i.test(fichier);
    if (estHtml) {
      for (const m of texte.matchAll(ATTRIBUTS)) references.add(m[3] !== undefined ? m[3] : m[4]);
    }
    for (const m of texte.matchAll(CSS_URL)) references.add(m[2]);
    if (estHtml) for (const m of texte.matchAll(SRCSET)) {
      const valeur = m[3] !== undefined ? m[3] : m[4];
      for (const morceau of valeur.split(',')) {
        const t = morceau.trim();
        if (t !== '') references.add(t.split(/\s+/)[0]);
      }
    }

    for (const reference of references) {
      if (!reference || PROTOCOLES_INERTES.test(reference)) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(reference) || reference.startsWith('//')) continue;
      // Les adresses que la réécriture laisse volontairement intactes ne sont
      // pas des manques : les signaler noierait les vrais défauts.
      if (PREFIXES_IGNORES.some((prefixe) => reference.startsWith(prefixe))) continue;
      if (reference.startsWith('/')) { manquants.push({ fichier, reference, raison: 'chemin absolu' }); continue; }
      const sansAncre = reference.split('#')[0].split('?')[0];
      if (sansAncre === '') continue;
      const cible = path.posix.normalize(path.posix.join(path.posix.dirname(fichier), sansAncre));
      if (!presents.has(cible)) manquants.push({ fichier, reference, raison: 'cible absente' });
    }
  }
  return manquants;
}

// ------------------------------------------------------------
// LISEZ-MOI et ZIP
// ------------------------------------------------------------

function ecrireLisezMoi(racineSortie, resume) {
  const texte = `inerNoWeb — les ressources inerWeb, sans Internet
=================================================

Fabriqué le ${resume.date} depuis ${resume.source}.
${resume.fichiers} fichiers, ${resume.taille}.

COMMENT S'EN SERVIR
-------------------
Copier ce dossier entier sur une cle USB, puis ouvrir « index.html »
d'un double-clic. C'est tout : aucune installation, aucun droit
d'administrateur, aucune connexion. Les pages s'ouvrent dans le
navigateur depuis la cle.

Garder le dossier ENTIER. Deplacer ou renommer un sous-dossier casse les
liens entre les pages : c'est un site, pas une collection de fichiers
independants.

CE QUI NE MARCHE PAS HORS LIGNE, ET C'EST NORMAL
------------------------------------------------
Les videos YouTube et les liens vers d'autres sites ont besoin
d'Internet. Hors ligne, ils ne s'ouvriront pas. ${resume.externes} adresse(s)
exterieure(s) recensee(s) dans cette copie.

Les formulaires qui demandent un acces ou activent une licence parlent a
un serveur : ils ne fonctionnent pas non plus depuis la cle.

LA LECTURE A VOIX HAUTE
-----------------------
${resume.voix}

METTRE A JOUR
-------------
Le site evolue ; cette copie, non. Pour la refaire a partir du site en
ligne, depuis le depot du logiciel, sur un poste connecte :

    node outils/fabriquer-inernoweb.mjs --zip

Le dossier et l'archive inerNoWeb.zip sont refabriques a neuf. Ecraser
l'ancienne copie de la cle par la nouvelle.

`;
  fs.writeFileSync(path.join(racineSortie, 'LISEZ-MOI.txt'), texte, 'utf8');
}

// Le ZIP du coffre-fort (server/zip-node.js) est « stored », sans
// compression : c'est voulu là-bas, où il sert à sceller des bases déjà
// compactes. Ici l'archive voyage sur une clé et pèse surtout du texte —
// HTML, CSS, JavaScript — qui se comprime de trois à cinq fois. On écrit
// donc une archive DÉFLATÉE (méthode 8), en réutilisant le CRC-32 déjà
// éprouvé du coffre. server/zip-node.js n'est pas touché : sa fidélité
// octet à octet au ZIP du front doit rester intacte.
function versDateDos(date) {
  const annee = Math.max(1980, date.getFullYear());
  return {
    dateDos: ((annee - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    heureDos: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_FIN = 0x06054b50;
const METHODE_DEFLATE = 8;
const BIT_UTF8 = 0x0800;

function fabriquerZip(racineSortie, fichiers, destination, horodatage = new Date()) {
  const { dateDos, heureDos } = versDateDos(horodatage);
  const corps = [];
  const repertoire = [];
  let decalage = 0;

  for (const fichier of fichiers) {
    const nom = Buffer.from(`inerNoWeb/${fichier}`, 'utf8');
    const brut = fs.readFileSync(path.join(racineSortie, fichier));
    const comprime = zlib.deflateRawSync(brut, { level: 9 });
    const crc = crc32(brut);

    const entete = Buffer.alloc(30);
    entete.writeUInt32LE(SIG_LOCAL, 0);
    entete.writeUInt16LE(20, 4);
    entete.writeUInt16LE(BIT_UTF8, 6);
    entete.writeUInt16LE(METHODE_DEFLATE, 8);
    entete.writeUInt16LE(heureDos, 10);
    entete.writeUInt16LE(dateDos, 12);
    entete.writeUInt32LE(crc, 14);
    entete.writeUInt32LE(comprime.length, 18);
    entete.writeUInt32LE(brut.length, 22);
    entete.writeUInt16LE(nom.length, 26);
    entete.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(SIG_CENTRAL, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(BIT_UTF8, 8);
    central.writeUInt16LE(METHODE_DEFLATE, 10);
    central.writeUInt16LE(heureDos, 12);
    central.writeUInt16LE(dateDos, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comprime.length, 20);
    central.writeUInt32LE(brut.length, 24);
    central.writeUInt16LE(nom.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(decalage, 42);

    corps.push(entete, nom, comprime);
    repertoire.push(central, nom);
    decalage += entete.length + nom.length + comprime.length;
  }

  const octetsRepertoire = Buffer.concat(repertoire);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(SIG_FIN, 0);
  fin.writeUInt16LE(0, 4);
  fin.writeUInt16LE(0, 6);
  fin.writeUInt16LE(fichiers.length, 8);
  fin.writeUInt16LE(fichiers.length, 10);
  fin.writeUInt32LE(octetsRepertoire.length, 12);
  fin.writeUInt32LE(decalage, 16);
  fin.writeUInt16LE(0, 20);

  const octets = Buffer.concat([...corps, octetsRepertoire, fin]);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, octets);
  return octets.length;
}

// ------------------------------------------------------------
// Programme
// ------------------------------------------------------------

function lisible(octets) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

async function principal() {
  const opts = lireArguments(process.argv.slice(2));

  console.log('inerNoWeb — fabrication de la copie hors ligne');
  console.log(`  source : ${opts.source}`);
  console.log(`  sortie : ${opts.sortie}`);
  console.log('');

  if (opts.zipSeulement) {
    // Refaire l'archive depuis un dossier déjà construit, sans reparcourir
    // le site : utile quand seule la forme de l'archive change.
    const fichiersDeja = listerFichiers(opts.sortie);
    const cible = path.join(path.dirname(opts.sortie), 'inerNoWeb.zip');
    const poids = fabriquerZip(opts.sortie, fichiersDeja, cible);
    console.log(`  ZIP refait depuis le dossier existant : ${cible} (${lisible(poids)}, ${fichiersDeja.length} fichiers)`);
    return;
  }

  if (fs.existsSync(opts.sortie)) fs.rmSync(opts.sortie, { recursive: true, force: true });
  fs.mkdirSync(opts.sortie, { recursive: true });

  const debut = Date.now();
  const { vus, externes, echecs, octetsTotal, pistesRetenues, pistesEcartees } = await parcourir(opts);
  console.log('');

  let voix = { pris: 0, octets: 0, rates: 0 };
  if (opts.voix) voix = await emporterVoix(opts, vus, opts.sortie);
  const octetsAvecVoix = octetsTotal + voix.octets;

  const fichiers = listerFichiers(opts.sortie);

  ecrireLisezMoi(opts.sortie, {
    date: new Date().toISOString().slice(0, 10),
    source: opts.source,
    fichiers: fichiers.length,
    taille: lisible(octetsAvecVoix),
    externes: externes.size,
    voix: opts.voix
      ? `${voix.pris} narration(s) enregistree(s) sont dans cette copie : la
lecture a voix haute garde la voix du site, sans Internet.`
      : `Le fonds audio n'est PAS dans cette copie. Le bouton de lecture
fonctionne quand meme : il passe a la synthese vocale du navigateur,
plus mecanique mais disponible hors ligne. Pour emporter les vraies
voix : refaire la copie avec l'option --voix (plusieurs centaines de Mo).`,
  });

  const manquants = controler(opts.sortie, listerFichiers(opts.sortie));

  console.log(`  ${vus.size} adresse(s) prise(s), ${lisible(octetsAvecVoix)}, en ${((Date.now() - debut) / 1000).toFixed(1)} s`);
  console.log(`  ${externes.size} adresse(s) hors du site (elles resteront hors ligne)`);
  console.log(`  ${pistesRetenues} image(s) assemblée(s) en JavaScript retrouvée(s) — ${pistesEcartees} piste(s) écartée(s)`);
  if (opts.voix) console.log(`  ${voix.pris} narration(s) emportée(s) (${lisible(voix.octets)})${voix.rates ? ` — ${voix.rates} en échec` : ''}`);
  else console.log('  narrations NON emportées (option --voix) : hors ligne, la lecture à voix haute passera par la synthèse du navigateur');

  if (echecs.length > 0) {
    console.log(`\n  ⚠ ${echecs.length} téléchargement(s) en échec :`);
    for (const e of echecs.slice(0, 20)) console.log(`     ${e.url} — ${e.raison}`);
    if (echecs.length > 20) console.log(`     … et ${echecs.length - 20} autre(s)`);
  }

  if (manquants.length > 0) {
    console.log(`\n  ⚠ ${manquants.length} référence(s) locale(s) sans cible dans le dossier :`);
    for (const m of manquants.slice(0, 20)) console.log(`     ${m.fichier} → ${m.reference} (${m.raison})`);
    if (manquants.length > 20) console.log(`     … et ${manquants.length - 20} autre(s)`);
  } else {
    console.log('  ✔ aucune référence locale ne pointe dans le vide');
  }

  if (opts.zip) {
    const destination = path.join(path.dirname(opts.sortie), 'inerNoWeb.zip');
    const taille = fabriquerZip(opts.sortie, listerFichiers(opts.sortie), destination);
    console.log(`\n  ZIP : ${destination} (${lisible(taille)})`);
  }

  console.log(`\n  Dossier prêt : ${opts.sortie}`);
  console.log('  Ouvrir index.html d\'un double-clic — aucune installation.');

  // Un échec de téléchargement ou une cible manquante rend un code non nul :
  // la copie existe mais elle est incomplète, et cela doit se voir.
  process.exitCode = echecs.length > 0 || manquants.length > 0 ? 1 : 0;
}

principal().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
