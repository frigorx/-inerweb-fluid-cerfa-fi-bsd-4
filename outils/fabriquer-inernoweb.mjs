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
//           --navigateur (embarquer Firefox ESR 115, la dernière lignée
//           Windows 7, ~215 Mo), --max <n> fichiers (défaut 4000), --verbeux.
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
import { spawnSync } from 'node:child_process';

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
    navigateur: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--source') opts.source = argv[++i];
    else if (a === '--sortie') opts.sortie = path.resolve(argv[++i]);
    else if (a === '--zip') opts.zip = true;
    else if (a === '--zip-seulement') { opts.zip = true; opts.zipSeulement = true; }
    else if (a === '--max') opts.max = Number(argv[++i]);
    else if (a === '--voix') opts.voix = true;
    else if (a === '--navigateur') opts.navigateur = true;
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
// Le navigateur embarqué (option --navigateur)
// ------------------------------------------------------------

// POURQUOI. Les postes visés tournent sous Windows 7. Or les pages
// utilisent l'accès optionnel (« a?.b », relevé dans 541 fichiers de la
// copie) et Array.at (55 fichiers) : Internet Explorer 11, seul navigateur
// garanti sur un Windows 7 d'origine, rend une page blanche. Il faut au
// moins Chrome 92 ou Firefox 90.
//
// CE QU'ON EMBARQUE. Firefox ESR 115 — la dernière lignée que Mozilla
// maintient pour Windows 7, et elle vit toujours. Mozilla ne publie AUCUNE
// version portable : seulement un .exe et un .msi. Mais l'installeur est une
// archive 7-Zip auto-extractible ; ouverte, elle rend un dossier « core »
// qui se lance tel quel, sans installation ni droits d'administrateur. C'est
// cette ouverture que l'on fait ici, à la fabrication, une fois pour toutes.
// Les binaires ne sont pas modifiés : Mozilla autorise la redistribution de
// Firefox non modifié.
//
// À SAVOIR AVANT DE S'EN SERVIR. Lancer un navigateur depuis une clé USB sur
// un poste d'établissement est très souvent BLOQUÉ, et à bon droit : c'est
// le schéma classique d'une attaque. Sur un parc verrouillé après un
// rançongiciel, il faut s'attendre à ce que la stratégie d'application ou
// l'antivirus le refuse — et à ce que la tentative laisse une trace au nom
// de celui qui l'a faite. La page EST-CE-QUE-CA-MARCHE.html est à essayer
// EN PREMIER : si le navigateur déjà présent sur le poste convient, ce
// dossier-ci ne sert à rien.
const VERSIONS_ESR = /115\.\d+\.\d+esr/g;

async function derniereEsr115() {
  const reponse = await fetch('https://ftp.mozilla.org/pub/firefox/releases/');
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status} en listant les versions`);
  const texte = await reponse.text();
  const versions = [...new Set(texte.match(VERSIONS_ESR) || [])];
  if (versions.length === 0) throw new Error('aucune version ESR 115 trouvée');
  versions.sort((a, b) => {
    const na = a.replace('esr', '').split('.').map(Number);
    const nb = b.replace('esr', '').split('.').map(Number);
    for (let i = 0; i < 3; i += 1) if (na[i] !== nb[i]) return na[i] - nb[i];
    return 0;
  });
  return versions[versions.length - 1];
}

function septZipDisponible() {
  // Sous Windows, 7-Zip s'installe dans « Program Files » SANS se mettre dans
  // le PATH : ne chercher que dans le PATH, c'est le déclarer absent chez la
  // plupart de ceux qui l'ont. On regarde donc aussi où il se range.
  const candidats = ['7z', '7za'];
  for (const dossier of [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], 'C:\\Program Files', 'C:\\Program Files (x86)']) {
    if (!dossier) continue;
    for (const nom of ['7-Zip', 'NanaZip']) {
      candidats.push(path.join(dossier, nom, '7z.exe'));
    }
  }
  for (const outil of candidats) {
    const essai = spawnSync(outil, ['i'], { stdio: 'ignore' });
    if (!essai.error) return outil;
  }
  return null;
}

// Le chemin de secours quand 7-Zip manque : l'installeur de Firefox sait
// lui-même se déposer où on lui dit, pour l'utilisateur courant, SANS droits
// d'administrateur (« -ms » silencieux et « /InstallDirectoryPath= », deux
// options que Mozilla documente pour les déploiements). On écrit donc un
// second lanceur, qui ne demande rien d'autre que ce qui est déjà dans la
// clé. C'est aussi la bonne route pour installer POUR DE BON un navigateur
// sur un poste qu'on administre et qui n'en a pas.
function ecrireLanceur(racineSortie) {
  // Sans accent et en CRLF : un .bat est lu par l'invite de commandes de
  // Windows, qui n'est pas en UTF-8 et afficherait des caracteres abimes.
  // Antislashs assembles par concatenation, jamais par gabarit (voir la note
  // de ecrireInstalleurNavigateur).
  const bs = '\\';
  const nav = '"%RACINE%navigateur' + bs + 'Firefox' + bs + 'firefox.exe"';
  const profil = '"%RACINE%navigateur' + bs + 'profil"';
  const lignes = [
    '@echo off',
    'setlocal',
    'set "RACINE=%~dp0"',
    'set "URL=%RACINE:' + bs + '=/%"',
    'if not exist ' + nav + ' (',
    '  echo.',
    '  echo   Le navigateur embarque n est pas dans cette copie.',
    '  echo   Ouvrez index.html avec le navigateur du poste,',
    '  echo   ou lisez d abord EST-CE-QUE-CA-MARCHE.html',
    '  echo.',
    '  pause',
    '  exit /b 1',
    ')',
    'if not exist ' + profil + ' mkdir ' + profil,
    'start "" ' + nav + ' -profile ' + profil + ' -no-remote "file:///%URL%index.html"',
  ];
  fs.writeFileSync(path.join(racineSortie, 'OUVRIR-INERNOWEB.bat'), lignes.join('\r\n') + '\r\n', 'latin1');
}

function ecrireInstalleurNavigateur(racineSortie, nomInstalleur) {
  // Concaténation et non gabarit : ces lignes sont pleines d'antislashs de
  // chemins Windows, et un gabarit y lirait « \F » comme une échappée. La
  // première version de ce lanceur est sortie avec « navigateurFirefox » et
  // un saut de page au milieu du chemin — illisible par cmd.exe.
  const bs = '\\';
  const ff = '"%RACINE%navigateur' + bs + 'Firefox' + bs + 'firefox.exe"';
  const lignes = [
    '@echo off',
    'setlocal',
    'set "RACINE=%~dp0"',
    'echo.',
    'echo   Depot de Firefox dans la cle. Cela prend une minute.',
    'echo   Aucun droit d administrateur n est demande.',
    'echo.',
    '"%RACINE%navigateur' + bs + nomInstalleur + '" -ms /InstallDirectoryPath="%RACINE%navigateur' + bs + 'Firefox"',
    'if exist ' + ff + ' (',
    '  echo   Termine. Lancez maintenant OUVRIR-INERNOWEB.bat',
    ') else (',
    '  echo   Echec. Autre route : installer 7-Zip sur le poste qui FABRIQUE',
    '  echo   la copie, puis rejouer la fabrication avec --navigateur.',
    ')',
    'echo.',
    'pause',
  ];
  fs.writeFileSync(path.join(racineSortie, 'INSTALLER-LE-NAVIGATEUR.bat'), lignes.join('\r\n') + '\r\n', 'latin1');
}

async function emporterNavigateur(racineSortie) {
  const version = await derniereEsr115();
  const nom = `Firefox Setup ${version}.exe`;
  const adresse = `https://ftp.mozilla.org/pub/firefox/releases/${version}/win32/fr/${encodeURIComponent(nom)}`;

  console.log(`\n  Navigateur : Firefox ESR ${version} (win32, fr) — dernière lignée Windows 7`);

  const dossier = path.join(racineSortie, 'navigateur');
  fs.mkdirSync(dossier, { recursive: true });
  const installeur = path.join(dossier, nom);

  const recu = await telecharger(adresse, 3);
  fs.writeFileSync(installeur, recu.octets);
  console.log(`  Téléchargé : ${lisible(recu.octets.length)}`);

  const outil = septZipDisponible();
  if (!outil) {
    console.log('  ⚠ 7-Zip introuvable sur cette machine : le dossier n\'est pas ouvert ici.');
    console.log('    Ce n\'est PAS bloquant — INSTALLER-LE-NAVIGATEUR.bat, écrit dans la copie,');
    console.log('    le dépose lui-même dans la clé, sans droits d\'administrateur.');
    ecrireLanceur(racineSortie);
    ecrireInstalleurNavigateur(racineSortie, nom);
    return { version, octets: recu.octets.length, portable: false };
  }

  const temporaire = path.join(dossier, '_ouverture');
  fs.rmSync(temporaire, { recursive: true, force: true });
  const extraction = spawnSync(outil, ['x', '-y', `-o${temporaire}`, installeur], { stdio: 'ignore' });
  const coeur = path.join(temporaire, 'core');
  if (extraction.status !== 0 || !fs.existsSync(coeur)) {
    console.log('  ⚠ L\'ouverture de l\'installeur a échoué : il est laissé tel quel.');
    fs.rmSync(temporaire, { recursive: true, force: true });
    ecrireLanceur(racineSortie);
    return { version, octets: recu.octets.length, portable: false };
  }

  const cible = path.join(dossier, 'Firefox');
  fs.rmSync(cible, { recursive: true, force: true });
  fs.renameSync(coeur, cible);
  fs.rmSync(temporaire, { recursive: true, force: true });
  fs.mkdirSync(path.join(dossier, 'profil'), { recursive: true });
  ecrireLanceur(racineSortie);
  // L'installeur RESTE dans la copie, même quand l'ouverture a réussi : sur un
  // poste qu'on administre et qui n'a plus de navigateur, l'installer pour de
  // bon vaut mieux que le lancer depuis une clé. Cinquante-cinq mégaoctets
  // pour garder cette porte ouverte, c'est bon marché.
  ecrireInstalleurNavigateur(racineSortie, nom);

  let poids = 0;
  for (const f of listerFichiers(cible)) poids += fs.statSync(path.join(cible, f)).size;
  console.log(`  Ouvert et prêt : navigateur/Firefox/firefox.exe (${lisible(poids)})`);
  return { version, octets: poids, portable: true };
}

// ------------------------------------------------------------
// La page qui dit si CE poste peut lire le kit
// ------------------------------------------------------------

// Écrite en JavaScript de 2010 — var, function, pas de fléchée, pas de
// gabarit — pour une raison précise : elle doit s'afficher MÊME sur le
// navigateur qu'elle va recaler. Une page de diagnostic écrite en syntaxe
// moderne ne s'ouvre pas sur un vieux navigateur : elle rend une page
// blanche, et l'enseignant reste sans réponse devant sa classe.
//
// Ce qu'elle teste est ce que le site utilise vraiment, relevé dans la
// copie : l'accès optionnel (« ?. », 541 fichiers), le coalescent « ?? »,
// Array.at (55 fichiers), String.replaceAll, et la grille CSS.
function ecrirePageDiagnostic(racineSortie) {
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Est-ce que ce PC peut lire inerNoWeb ?</title>
<style>
  body { font-family: Segoe UI, Tahoma, Arial, sans-serif; margin: 0; padding: 24px;
         background: #f4f6f8; color: #14212b; line-height: 1.5; }
  .carte { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 10px;
           padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,.12); }
  h1 { font-size: 22px; margin: 0 0 18px; }
  #verdict { font-size: 26px; font-weight: 700; padding: 20px; border-radius: 8px;
             text-align: center; margin: 0 0 20px; }
  .oui { background: #e3f6e9; color: #14612f; border: 2px solid #2e9e57; }
  .non { background: #fdeaea; color: #8c1c1c; border: 2px solid #c93b3b; }
  table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 15px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #e1e6ea; }
  .ok { color: #14612f; font-weight: 700; }
  .ko { color: #8c1c1c; font-weight: 700; }
  .ua { font-size: 12px; color: #5a6b78; word-break: break-all;
        background: #f0f3f5; padding: 10px; border-radius: 6px; }
  p.suite { font-size: 15px; }
</style>
</head>
<body>
<div class="carte">
  <h1>Est-ce que ce PC peut lire inerNoWeb ?</h1>
  <div id="verdict" class="non">Test en cours&hellip;</div>
  <table id="details"><tbody></tbody></table>
  <p class="suite" id="suite"></p>
  <p class="ua" id="ua"></p>
</div>
<script>
(function () {
  function essayer(code) {
    try { eval(code); return true; } catch (e) { return false; }
  }

  var tests = [
    { nom: "Acces optionnel ( a?.b )", ok: essayer("var o={}; o?.b") },
    { nom: "Operateur ?? ", ok: essayer("var v = null ?? 1") },
    { nom: "Array.at()", ok: typeof Array.prototype.at === "function" },
    { nom: "String.replaceAll()", ok: typeof String.prototype.replaceAll === "function" },
    { nom: "Grille CSS", ok: !!(window.CSS && CSS.supports && CSS.supports("display", "grid")) },
    { nom: "Lecture audio", ok: !!window.Audio },
    { nom: "Synthese vocale (lecture a voix haute)", ok: !!window.speechSynthesis }
  ];

  var corps = document.getElementById("details").getElementsByTagName("tbody")[0];
  var bloquants = 0;
  var confort = [];

  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    // Les deux derniers sont du confort : leur absence ne recale pas le poste.
    var estConfort = i >= 5;
    if (!t.ok) { if (estConfort) { confort.push(t.nom); } else { bloquants++; } }
    var tr = document.createElement("tr");
    var td1 = document.createElement("td");
    td1.appendChild(document.createTextNode(t.nom));
    var td2 = document.createElement("td");
    td2.className = t.ok ? "ok" : "ko";
    td2.appendChild(document.createTextNode(t.ok ? "OK" : (estConfort ? "absent" : "MANQUE")));
    tr.appendChild(td1); tr.appendChild(td2); corps.appendChild(tr);
  }

  var verdict = document.getElementById("verdict");
  var suite = document.getElementById("suite");

  if (bloquants === 0) {
    verdict.className = "oui";
    verdict.innerHTML = "OUI — ce PC lit inerNoWeb";
    var mot = "Ouvrez index.html a la racine de la cle : tout doit fonctionner.";
    if (confort.length) {
      mot += " Manquent seulement, sans gravite : " + confort.join(", ") + ".";
    }
    suite.innerHTML = mot;
  } else {
    verdict.className = "non";
    verdict.innerHTML = "NON — le navigateur de ce PC est trop ancien";
    suite.innerHTML = "Il manque " + bloquants + " element(s) indispensable(s)."
      + " Les pages s'ouvriront mais resteront vides ou figees."
      + " Il faut un navigateur plus recent sur ce poste :"
      + " Chrome 92 ou plus, ou Firefox 90 ou plus."
      + " Sous Windows 7, la derniere version utilisable est Firefox ESR 115.";
  }

  document.getElementById("ua").innerHTML = "Navigateur declare : " + navigator.userAgent;
})();
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(racineSortie, 'EST-CE-QUE-CA-MARCHE.html'), html, 'utf8');
}

// ------------------------------------------------------------
// LISEZ-MOI et ZIP
// ------------------------------------------------------------

function ecrireLisezMoi(racineSortie, resume) {
  const texte = `inerNoWeb — les ressources inerWeb, sans Internet
=================================================

Fabriqué le ${resume.date} depuis ${resume.source}.
${resume.fichiers} fichiers, ${resume.taille}.

A FAIRE EN PREMIER, SUR CHAQUE PC
---------------------------------
Ouvrir « EST-CE-QUE-CA-MARCHE.html ». Cette page dit en cinq secondes si
le navigateur de CE poste sait lire inerNoWeb. Elle s'affiche meme sur un
navigateur trop vieux — c'est fait pour.

Il faut au minimum Chrome 92 ou Firefox 90. Internet Explorer 11, seul
navigateur garanti sur un Windows 7 d'origine, NE CONVIENT PAS : les
pages s'ouvriront vides.

COMMENT S'EN SERVIR
-------------------
Copier ce dossier entier sur une cle USB, puis ouvrir « index.html »
d'un double-clic. C'est tout : aucune installation, aucun droit
d'administrateur, aucune connexion. Les pages s'ouvrent dans le
navigateur depuis la cle.

${resume.navigateur}

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

  // GARDE-FOU. La ligne suivante EFFACE le dossier de sortie. C'est voulu — une
  // copie se refait à neuf — mais cet outil est fait pour viser directement une
  // clé USB (« --sortie E:\\inerNoWeb »). Une lettre de trop, « --sortie E:\\ »,
  // et on efface la clé entière. Deux refus, donc, avant d'effacer quoi que ce
  // soit.
  if (path.dirname(opts.sortie) === opts.sortie) {
    console.error(`\n  REFUS : « ${opts.sortie} » est la racine d'un disque.`);
    console.error('  Cet outil efface son dossier de sortie avant de le refaire.');
    console.error('  Donnez-lui un sous-dossier, par exemple E:\\inerNoWeb.');
    process.exit(2);
  }
  if (fs.existsSync(opts.sortie)) {
    const deja = listerFichiers(opts.sortie);
    const estUneCopie = deja.some((f) => f === 'LISEZ-MOI.txt' || f === 'index.html');
    if (deja.length > 0 && !estUneCopie) {
      console.error(`\n  REFUS : « ${opts.sortie} » contient ${deja.length} fichier(s) et ne ressemble`);
      console.error('  pas à une copie inerNoWeb (ni LISEZ-MOI.txt, ni index.html).');
      console.error('  Cet outil effacerait ce dossier. Visez un dossier vide ou un nom neuf.');
      process.exit(2);
    }
    fs.rmSync(opts.sortie, { recursive: true, force: true });
  }
  fs.mkdirSync(opts.sortie, { recursive: true });

  const debut = Date.now();
  const { vus, externes, echecs, octetsTotal, pistesRetenues, pistesEcartees } = await parcourir(opts);
  console.log('');

  let voix = { pris: 0, octets: 0, rates: 0 };
  if (opts.voix) voix = await emporterVoix(opts, vus, opts.sortie);

  let navigateur = null;
  if (opts.navigateur) {
    try {
      navigateur = await emporterNavigateur(opts.sortie);
    } catch (erreur) {
      console.log(`  ⚠ Navigateur non emporté : ${erreur.message}`);
    }
  }

  const octetsAvecVoix = octetsTotal + voix.octets + (navigateur ? navigateur.octets : 0);

  const fichiers = listerFichiers(opts.sortie);

  ecrireLisezMoi(opts.sortie, {
    date: new Date().toISOString().slice(0, 10),
    source: opts.source,
    fichiers: fichiers.length,
    taille: lisible(octetsAvecVoix),
    externes: externes.size,
    navigateur: navigateur
      ? `SI LE PC N'A PAS DE NAVIGATEUR ASSEZ RECENT\n------------------------------------------\nFirefox ESR ${navigateur.version} est dans cette copie (dossier « navigateur »).\nC'est la derniere lignee qui tourne sous Windows 7. Deux routes.\n\n1. LE POSTE EST A VOUS, ET N'A PLUS DE NAVIGATEUR (Internet Explorer\n   seul, par exemple) : lancez INSTALLER-LE-NAVIGATEUR.bat. Firefox\n   s'installe pour l'utilisateur courant, SANS droits d'administrateur.\n   Sur une machine qu'on administre, c'est la bonne route : le poste\n   garde son navigateur meme quand la cle repart.\n\n2. VOUS NE FAITES QUE PASSER : ${navigateur.portable ? 'lancez OUVRIR-INERNOWEB.bat. Firefox\n   part de la cle, avec son profil range dedans, et n ecrit rien dans le\n   PC.' : 'jouez d abord INSTALLER-LE-NAVIGATEUR.bat,\n   puis OUVRIR-INERNOWEB.bat.'}\n\nSUR UN POSTE GERE PAR L'ETABLISSEMENT, c'est autre chose : lancer un\nnavigateur depuis une cle USB y est souvent bloque, et a bon droit —\nc'est le schema classique d'une attaque. Sur un parc verrouille apres un\nrancongiciel, attendez-vous a un refus, et a une trace au nom de celui\nqui a essaye. La, on demande d'abord, on essaie ensuite.`
      : `SI LE PC N'A PAS DE NAVIGATEUR ASSEZ RECENT\n------------------------------------------\nAucun navigateur n'est embarque dans cette copie. Pour en ajouter un :\nrefaire la copie avec l'option --navigateur (Firefox ESR 115, la\nderniere lignee qui tourne sous Windows 7, environ 215 Mo).`,
    voix: opts.voix
      ? `${voix.pris} narration(s) enregistree(s) sont dans cette copie : la
lecture a voix haute garde la voix du site, sans Internet.`
      : `Le fonds audio n'est PAS dans cette copie. Le bouton de lecture
fonctionne quand meme : il passe a la synthese vocale du navigateur,
plus mecanique mais disponible hors ligne. Pour emporter les vraies
voix : refaire la copie avec l'option --voix (plusieurs centaines de Mo).`,
  });

  ecrirePageDiagnostic(opts.sortie);

  const manquants = controler(opts.sortie, listerFichiers(opts.sortie));

  console.log(`  ${vus.size} adresse(s) prise(s), ${lisible(octetsAvecVoix)}, en ${((Date.now() - debut) / 1000).toFixed(1)} s`);
  console.log(`  ${externes.size} adresse(s) hors du site (elles resteront hors ligne)`);
  console.log(`  ${pistesRetenues} image(s) assemblée(s) en JavaScript retrouvée(s) — ${pistesEcartees} piste(s) écartée(s)`);
  if (opts.voix) console.log(`  ${voix.pris} narration(s) emportée(s) (${lisible(voix.octets)})${voix.rates ? ` — ${voix.rates} en échec` : ''}`);
  else console.log('  narrations NON emportées (option --voix) : hors ligne, la lecture à voix haute passera par la synthèse du navigateur');
  if (navigateur && navigateur.portable) console.log(`  navigateur embarqué : Firefox ESR ${navigateur.version}, lancé par OUVRIR-INERNOWEB.bat`);
  else if (navigateur) console.log(`  navigateur : installeur Firefox ESR ${navigateur.version} déposé, à ouvrir à la main`);

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
