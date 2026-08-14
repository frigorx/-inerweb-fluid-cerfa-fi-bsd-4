// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — LECTURE RÉELLE D'UNE IMAGE PNG (module PUR)
// Lot B3 (« ne plus mentir »), brique 1.
//
// Pourquoi ce module : jusqu'ici le logiciel se contentait de comparer
// les 8 premiers octets d'un tampon aux nombres magiques PNG, puis sa
// LONGUEUR à deux bornes. Un bloc de texte de 2 Ko préfixé des 8 bons
// octets passait donc pour « signature valide ». Ici on DÉCODE : en-tête
// IHDR, parcours des chunks, CRC-32 de chacun, présence d'IDAT, IEND
// final — puis, si l'image est d'un format que l'on sait lire, ses
// PIXELS (décompression zlib/deflate écrite à la main : le dépôt n'a
// aucune dépendance tierce et n'en prendra pas pour cela).
//
// Deux questions, deux réponses honnêtes :
//   - verifierStructurePng : est-ce VRAIMENT un PNG ?
//   - analyseEncre : y a-t-il quelque chose de tracé dessus ?
//     ENCRE (au moins deux pixels VUS différemment — l'alpha est
//     composé et la palette résolue, sinon on crierait « encre » sur
//     une image entièrement transparente) · VIDE (image
//     rigoureusement uniforme : la case est restée vierge) ·
//     INDETERMINABLE (format que l'on ne sait pas lire : on ne conclut
//     JAMAIS au vide sur un doute — le doute retire l'allègement,
//     jamais l'obligation ; ici, refuser SERAIT l'allègement du logiciel).
//
// Aucun seuil de densité, aucun pourcentage, aucune boîte englobante :
// la frontière est « rien du tout » contre « quelque chose » (décision
// du propriétaire du 25/07 : c'est le signataire qui juge son tracé).
//
// Aucune I/O, aucune dépendance. Dupliqué en littéral CommonJS côté
// serveur (server/png.js) — parité prouvée par server/test-png.mjs :
// ne jamais toucher l'un sans l'autre.
// ============================================================

/** Les 8 octets d'en-tête d'un fichier PNG (norme ISO 15948, § 5.2). */
const MAGIQUES_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Profondeurs de bits admises par la norme. */
const PROFONDEURS_ADMISES = [1, 2, 4, 8, 16];

/** Nombre de canaux par type de couleur (index = type de couleur). */
const CANAUX_PAR_TYPE = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** Profondeurs admises pour chaque type de couleur (norme, tableau 11.1). */
const PROFONDEURS_PAR_TYPE = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16]
};

/**
 * Plafond DÉFENSIF de la surface décompressée (octets bruts). Un PNG
 * d'1 Mo peut déclarer 20 000 × 20 000 pixels : on ne décompresse pas
 * ce que l'on n'a pas les moyens de tenir en mémoire. Au-delà, la
 * réponse est INDETERMINABLE (jamais un refus).
 */
const SURFACE_MAX_OCTETS = 32 * 1024 * 1024;

// ------------------------------------------------------------
// CRC-32 (IEEE 802.3) — le même que celui du format ZIP (core/zip.js) ;
// recopié ici pour garder le module autonome.
// ------------------------------------------------------------

/** Table des 256 restes de division polynomiale du CRC-32. */
const TABLE_CRC32 = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 d'une tranche d'octets [debut, fin[. */
function crc32Tranche(octets, debut, fin) {
  let crc = 0xffffffff;
  for (let i = debut; i < fin; i += 1) {
    crc = TABLE_CRC32[(crc ^ octets[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Entier 32 bits gros-boutiste lu à la position donnée. */
function lireU32(octets, position) {
  return ((octets[position] << 24) | (octets[position + 1] << 16)
    | (octets[position + 2] << 8) | octets[position + 3]) >>> 0;
}

// ------------------------------------------------------------
// Structure : parcours des chunks, CRC vérifiés
// ------------------------------------------------------------

/**
 * Vérifie qu'un tampon est VRAIMENT un PNG : en-tête, chaîne de chunks
 * bien formée, CRC-32 de chaque chunk, IHDR en tête et cohérent, au
 * moins un IDAT, IEND en fin, rien après.
 * @param {?Uint8Array} octets contenu binaire
 * @returns {{ok: boolean, motif: ?string, entete: ?object,
 *   idat: ?Array<{debut: number, fin: number}>,
 *   plte: ?{debut: number, fin: number}, nbPlte: number,
 *   trns: ?{debut: number, fin: number}, nbTrns: number}}
 */
function verifierStructurePng(octets) {
  const refus = (motif) => ({
    ok: false, motif, entete: null, idat: null,
    plte: null, nbPlte: 0, trns: null, nbTrns: 0
  });
  if (!octets || octets.length < 8) return refus('tampon vide ou tronqué');
  for (let i = 0; i < MAGIQUES_PNG.length; i += 1) {
    if (octets[i] !== MAGIQUES_PNG[i]) return refus('en-tête PNG absent');
  }
  let position = 8;
  let entete = null;
  let vuIend = false;
  let nbChunks = 0;
  const idat = [];
  // PLTE et tRNS sont RETENUS : sans eux, une image en palette ne peut
  // pas être jugée (deux index différents peuvent désigner la MÊME
  // couleur — l'image est alors un aplat). Leur NOMBRE est compté : la
  // norme n'en admet qu'un, et un fichier qui en porte deux ne se lit
  // pas de façon univoque (on ne conclura donc rien sur son encre).
  let plte = null;
  let nbPlte = 0;
  let trns = null;
  let nbTrns = 0;
  while (position < octets.length) {
    if (vuIend) return refus('octets après IEND');
    if (position + 8 > octets.length) return refus('chunk tronqué (en-tête)');
    const taille = lireU32(octets, position);
    if (taille > 0x7fffffff) return refus('taille de chunk déraisonnable');
    const finDonnees = position + 8 + taille;
    if (finDonnees + 4 > octets.length) return refus('chunk tronqué (données)');
    let type = '';
    for (let i = 0; i < 4; i += 1) {
      const code = octets[position + 4 + i];
      // Un type de chunk est fait de 4 lettres ASCII (norme § 5.4).
      if (!(code >= 65 && code <= 90) && !(code >= 97 && code <= 122)) {
        return refus('type de chunk illégal');
      }
      type += String.fromCharCode(code);
    }
    const crcCalcule = crc32Tranche(octets, position + 4, finDonnees);
    const crcDeclare = lireU32(octets, finDonnees);
    if (crcCalcule !== crcDeclare) return refus(`CRC-32 faux sur ${type}`);
    if (nbChunks === 0 && type !== 'IHDR') return refus('IHDR absent en tête');
    if (type === 'IHDR') {
      if (nbChunks !== 0) return refus('IHDR en double');
      if (taille !== 13) return refus('IHDR de taille invalide');
      const d = position + 8;
      const largeur = lireU32(octets, d);
      const hauteur = lireU32(octets, d + 4);
      const profondeur = octets[d + 8];
      const typeCouleur = octets[d + 9];
      const compression = octets[d + 10];
      const filtre = octets[d + 11];
      const entrelacement = octets[d + 12];
      if (largeur === 0 || hauteur === 0) return refus('dimension nulle');
      if (!PROFONDEURS_ADMISES.includes(profondeur)) {
        return refus('profondeur de bits illégale');
      }
      if (!Object.prototype.hasOwnProperty.call(CANAUX_PAR_TYPE, typeCouleur)) {
        return refus('type de couleur illégal');
      }
      if (!PROFONDEURS_PAR_TYPE[typeCouleur].includes(profondeur)) {
        return refus('profondeur illégale pour ce type de couleur');
      }
      if (compression !== 0) return refus('méthode de compression inconnue');
      if (filtre !== 0) return refus('méthode de filtrage inconnue');
      if (entrelacement !== 0 && entrelacement !== 1) {
        return refus('mode d’entrelacement inconnu');
      }
      entete = {
        largeur, hauteur, profondeur, typeCouleur, entrelacement,
        canaux: CANAUX_PAR_TYPE[typeCouleur]
      };
    }
    if (type === 'PLTE') {
      nbPlte += 1;
      plte = { debut: position + 8, fin: finDonnees };
    }
    if (type === 'tRNS') {
      nbTrns += 1;
      trns = { debut: position + 8, fin: finDonnees };
    }
    if (type === 'IDAT') idat.push({ debut: position + 8, fin: finDonnees });
    if (type === 'IEND') {
      if (taille !== 0) return refus('IEND non vide');
      vuIend = true;
    }
    position = finDonnees + 4;
    nbChunks += 1;
  }
  if (!entete) return refus('IHDR absent');
  if (!idat.length) return refus('aucune donnée d’image (IDAT)');
  if (!vuIend) return refus('IEND absent');
  return { ok: true, motif: null, entete, idat, plte, nbPlte, trns, nbTrns };
}

// ------------------------------------------------------------
// Décompression DEFLATE (RFC 1951) enveloppée zlib (RFC 1950)
// Écrite à la main : aucune dépendance tierce, même code des deux côtés.
// ------------------------------------------------------------

const LONGUEURS_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27,
  31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LONGUEURS_SUPPL = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3,
  3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DISTANCES_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129,
  193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289,
  16385, 24577];
const DISTANCES_SUPPL = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7,
  8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const ORDRE_LONGUEURS_CODE = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3,
  13, 2, 14, 1, 15];

/** Erreur interne de décompression (jamais montrée à l'utilisateur). */
class ErreurDeflate extends Error {}

/** Lecteur de bits, poids faible d'abord (RFC 1951 § 3.1.1). */
function lecteurDeBits(octets, debut) {
  return {
    octets,
    position: debut,
    tampon: 0,
    nbBits: 0,
    bits(nombre) {
      while (this.nbBits < nombre) {
        if (this.position >= this.octets.length) {
          throw new ErreurDeflate('flux tronqué');
        }
        this.tampon |= this.octets[this.position] << this.nbBits;
        this.position += 1;
        this.nbBits += 8;
      }
      const valeur = this.tampon & ((1 << nombre) - 1);
      this.tampon >>>= nombre;
      this.nbBits -= nombre;
      return valeur;
    },
    aligner() {
      this.tampon = 0;
      this.nbBits = 0;
    }
  };
}

/** Table de Huffman canonique à partir des longueurs de code. */
function construireHuffman(longueurs) {
  const compte = new Array(16).fill(0);
  for (let i = 0; i < longueurs.length; i += 1) {
    compte[longueurs[i]] += 1;
  }
  compte[0] = 0;
  const decalages = new Array(17).fill(0);
  for (let l = 1; l <= 15; l += 1) decalages[l + 1] = decalages[l] + compte[l];
  const symboles = new Array(longueurs.length).fill(0);
  for (let s = 0; s < longueurs.length; s += 1) {
    if (longueurs[s]) {
      symboles[decalages[longueurs[s]]] = s;
      decalages[longueurs[s]] += 1;
    }
  }
  return { compte, symboles };
}

/** Décodage d'un symbole, bit à bit (méthode « puff », RFC 1951). */
function decoderSymbole(lecteur, table) {
  let code = 0;
  let premier = 0;
  let index = 0;
  for (let longueur = 1; longueur <= 15; longueur += 1) {
    code |= lecteur.bits(1);
    const nb = table.compte[longueur];
    if (code - premier < nb) return table.symboles[index + (code - premier)];
    index += nb;
    premier = (premier + nb) << 1;
    code <<= 1;
  }
  throw new ErreurDeflate('code de Huffman invalide');
}

/** Les deux tables FIXES (RFC 1951 § 3.2.6), construites une seule fois. */
const TABLES_FIXES = (() => {
  const longueursLitteraux = new Array(288);
  for (let i = 0; i < 144; i += 1) longueursLitteraux[i] = 8;
  for (let i = 144; i < 256; i += 1) longueursLitteraux[i] = 9;
  for (let i = 256; i < 280; i += 1) longueursLitteraux[i] = 7;
  for (let i = 280; i < 288; i += 1) longueursLitteraux[i] = 8;
  const longueursDistances = new Array(30).fill(5);
  return {
    litteraux: construireHuffman(longueursLitteraux),
    distances: construireHuffman(longueursDistances)
  };
})();

/**
 * Décompresse un flux DEFLATE brut dans une sortie de taille CONNUE
 * (la surface d'un PNG l'est toujours) : borne naturelle de mémoire.
 */
function inflateBrut(octets, debut, tailleAttendue) {
  const sortie = new Uint8Array(tailleAttendue);
  let ecrit = 0;
  const lecteur = lecteurDeBits(octets, debut);
  let dernier = 0;
  do {
    dernier = lecteur.bits(1);
    const type = lecteur.bits(2);
    if (type === 0) {
      lecteur.aligner();
      if (lecteur.position + 4 > octets.length) {
        throw new ErreurDeflate('bloc stocké tronqué');
      }
      const taille = octets[lecteur.position] | (octets[lecteur.position + 1] << 8);
      const complement = octets[lecteur.position + 2]
        | (octets[lecteur.position + 3] << 8);
      lecteur.position += 4;
      if ((taille ^ 0xffff) !== complement) {
        throw new ErreurDeflate('LEN/NLEN incohérents');
      }
      if (lecteur.position + taille > octets.length) {
        throw new ErreurDeflate('bloc stocké tronqué');
      }
      if (ecrit + taille > tailleAttendue) {
        throw new ErreurDeflate('sortie plus grande que la surface déclarée');
      }
      for (let i = 0; i < taille; i += 1) {
        sortie[ecrit] = octets[lecteur.position + i];
        ecrit += 1;
      }
      lecteur.position += taille;
    } else if (type === 1 || type === 2) {
      let tables = TABLES_FIXES;
      if (type === 2) {
        const nbLitteraux = lecteur.bits(5) + 257;
        const nbDistances = lecteur.bits(5) + 1;
        const nbCodes = lecteur.bits(4) + 4;
        const longueursCode = new Array(19).fill(0);
        for (let i = 0; i < nbCodes; i += 1) {
          longueursCode[ORDRE_LONGUEURS_CODE[i]] = lecteur.bits(3);
        }
        const tableCode = construireHuffman(longueursCode);
        const longueurs = new Array(nbLitteraux + nbDistances).fill(0);
        let i = 0;
        while (i < longueurs.length) {
          const symbole = decoderSymbole(lecteur, tableCode);
          if (symbole < 16) {
            longueurs[i] = symbole;
            i += 1;
          } else if (symbole === 16) {
            if (i === 0) throw new ErreurDeflate('répétition sans précédent');
            const precedent = longueurs[i - 1];
            let repetitions = 3 + lecteur.bits(2);
            while (repetitions > 0 && i < longueurs.length) {
              longueurs[i] = precedent;
              i += 1;
              repetitions -= 1;
            }
          } else if (symbole === 17) {
            let repetitions = 3 + lecteur.bits(3);
            while (repetitions > 0 && i < longueurs.length) {
              longueurs[i] = 0;
              i += 1;
              repetitions -= 1;
            }
          } else {
            let repetitions = 11 + lecteur.bits(7);
            while (repetitions > 0 && i < longueurs.length) {
              longueurs[i] = 0;
              i += 1;
              repetitions -= 1;
            }
          }
        }
        tables = {
          litteraux: construireHuffman(longueurs.slice(0, nbLitteraux)),
          distances: construireHuffman(longueurs.slice(nbLitteraux))
        };
      }
      for (;;) {
        const symbole = decoderSymbole(lecteur, tables.litteraux);
        if (symbole === 256) break;
        if (symbole < 256) {
          if (ecrit >= tailleAttendue) {
            throw new ErreurDeflate('sortie plus grande que la surface déclarée');
          }
          sortie[ecrit] = symbole;
          ecrit += 1;
        } else {
          const indexLongueur = symbole - 257;
          if (indexLongueur >= LONGUEURS_BASE.length) {
            throw new ErreurDeflate('code de longueur illégal');
          }
          const longueur = LONGUEURS_BASE[indexLongueur]
            + lecteur.bits(LONGUEURS_SUPPL[indexLongueur]);
          const indexDistance = decoderSymbole(lecteur, tables.distances);
          if (indexDistance >= DISTANCES_BASE.length) {
            throw new ErreurDeflate('code de distance illégal');
          }
          const distance = DISTANCES_BASE[indexDistance]
            + lecteur.bits(DISTANCES_SUPPL[indexDistance]);
          if (distance > ecrit) throw new ErreurDeflate('distance hors fenêtre');
          if (ecrit + longueur > tailleAttendue) {
            throw new ErreurDeflate('sortie plus grande que la surface déclarée');
          }
          for (let i = 0; i < longueur; i += 1) {
            sortie[ecrit] = sortie[ecrit - distance];
            ecrit += 1;
          }
        }
      }
    } else {
      throw new ErreurDeflate('type de bloc réservé');
    }
  } while (!dernier);
  if (ecrit !== tailleAttendue) {
    throw new ErreurDeflate('surface décompressée incomplète');
  }
  return sortie;
}

/** Décompresse un flux zlib (RFC 1950) : en-tête contrôlé puis DEFLATE. */
function inflateZlib(octets, tailleAttendue) {
  if (octets.length < 2) throw new ErreurDeflate('flux zlib tronqué');
  const cmf = octets[0];
  const flg = octets[1];
  if ((cmf & 0x0f) !== 8) throw new ErreurDeflate('méthode zlib inconnue');
  if (((cmf << 8) + flg) % 31 !== 0) {
    throw new ErreurDeflate('somme de contrôle zlib fausse');
  }
  if (flg & 0x20) throw new ErreurDeflate('dictionnaire zlib non pris en charge');
  return inflateBrut(octets, 2, tailleAttendue);
}

// ------------------------------------------------------------
// Pixels : dé-filtrage des lignes puis question de l'encre
// ------------------------------------------------------------

/** Prédicteur de Paeth (norme PNG § 9.4). */
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Y a-t-il quelque chose de tracé sur cette image ?
 *   'ENCRE'          au moins deux pixels différents ;
 *   'VIDE'           image RIGOUREUSEMENT uniforme (case restée vierge) ;
 *   'INDETERMINABLE' format que ce module ne sait pas lire — on ne
 *                    conclut jamais au vide sur un doute.
 * @param {?Uint8Array} octets contenu binaire d'un PNG
 * @returns {'ENCRE'|'VIDE'|'INDETERMINABLE'}
 */
function analyseEncre(octets) {
  return encreDeStructure(octets, verifierStructurePng(octets));
}

/**
 * Les DEUX questions du module en UN SEUL passage : est-ce un PNG, et
 * y a-t-il quelque chose dessus. Elles partagent le même décodage —
 * les poser l'une après l'autre faisait relire le fichier deux fois
 * sur le chemin qui juge les signatures (revue du 25/07, MINEUR 6).
 * Aucune valeur n'est reçue de l'appelant : la structure rendue est
 * TOUJOURS celle des octets fournis, on ne peut pas lui mentir.
 * @param {?Uint8Array} octets contenu binaire d'un PNG
 * @returns {{structure: object, encre: 'ENCRE'|'VIDE'|'INDETERMINABLE'}}
 */
function lireImagePng(octets) {
  const structure = verifierStructurePng(octets);
  return { structure, encre: encreDeStructure(octets, structure) };
}

/** Le corps de l'analyse d'encre, sur une structure DÉJÀ lue. */
function encreDeStructure(octets, structure) {
  if (!structure.ok) return 'INDETERMINABLE';
  const { largeur, hauteur, profondeur, entrelacement, canaux, typeCouleur } =
    structure.entete;
  // Entrelacement Adam7 et profondeurs sous-octet : hors de ce que l'on
  // sait relire (un canvas n'en produit jamais). On ne conclut pas.
  if (entrelacement !== 0) return 'INDETERMINABLE';
  if (profondeur < 8) return 'INDETERMINABLE';
  const octetsParEchantillon = profondeur / 8;
  const octetsParPixel = canaux * octetsParEchantillon;
  const octetsParLigne = largeur * octetsParPixel;
  const surface = hauteur * (octetsParLigne + 1);
  if (surface > SURFACE_MAX_OCTETS) return 'INDETERMINABLE';
  // ⚠️ Revue du 25/07 — deux familles d'images RIGOUREUSEMENT invisibles
  // étaient déclarées « ENCRE » avec assurance parce que l'on comparait
  // les octets BRUTS, canal par canal :
  //   · alpha nul PARTOUT, couleurs qui varient : rien ne se voit, et le
  //     module criait « il y a de l'encre » sur une case blanche ;
  //   · palette dont TOUTES les entrées sont de la même couleur : les
  //     index varient, l'image est un aplat.
  // On compose donc l'alpha (alpha nul = pixel invisible, quelle que
  // soit sa couleur) et on RÉSOUT la palette avant de comparer.
  const avecAlpha = typeCouleur === 4 || typeCouleur === 6;
  let plteDebut = 0;
  let nbEntreesPalette = 0;
  let trnsDebut = 0;
  let nbAlphasPalette = 0;
  if (typeCouleur === 3) {
    // Sans palette lisible (absente, en double, taille non multiple de 3)
    // ou avec deux tRNS, on ne sait PAS ce qui est affiché : doute assumé.
    if (!structure.plte || structure.nbPlte !== 1) return 'INDETERMINABLE';
    if (structure.nbTrns > 1) return 'INDETERMINABLE';
    const taillePlte = structure.plte.fin - structure.plte.debut;
    if (taillePlte === 0 || taillePlte % 3 !== 0) return 'INDETERMINABLE';
    plteDebut = structure.plte.debut;
    nbEntreesPalette = taillePlte / 3;
    if (structure.trns) {
      trnsDebut = structure.trns.debut;
      nbAlphasPalette = structure.trns.fin - structure.trns.debut;
    }
  }
  // Les types SANS canal alpha (gris, RVB) n'ont pas besoin de tRNS ici :
  // il n'y désigne qu'UNE seule valeur transparente, donc deux pixels
  // d'octets différents restent deux rendus différents.
  // Les IDAT forment UN SEUL flux zlib, à recoller bout à bout.
  let total = 0;
  for (const bloc of structure.idat) total += bloc.fin - bloc.debut;
  const flux = new Uint8Array(total);
  let curseur = 0;
  for (const bloc of structure.idat) {
    for (let i = bloc.debut; i < bloc.fin; i += 1) {
      flux[curseur] = octets[i];
      curseur += 1;
    }
  }
  let brut;
  try {
    brut = inflateZlib(flux, surface);
  } catch {
    return 'INDETERMINABLE';
  }
  // Dé-filtrage ligne à ligne, en comparant au fur et à mesure au tout
  // premier pixel : dès qu'un pixel VU DIFFÉREMMENT apparaît, il y a de
  // l'encre.
  const ligne = new Uint8Array(octetsParLigne);
  const precedente = new Uint8Array(octetsParLigne);
  const tailleCle = typeCouleur === 3 ? 4 : octetsParPixel;
  const cle = new Uint8Array(tailleCle);
  const premier = new Uint8Array(tailleCle);
  let premierLu = false;
  let encre = false;
  for (let y = 0; y < hauteur; y += 1) {
    const debut = y * (octetsParLigne + 1);
    const filtre = brut[debut];
    if (filtre > 4) return 'INDETERMINABLE';
    for (let x = 0; x < octetsParLigne; x += 1) {
      const valeur = brut[debut + 1 + x];
      const a = x >= octetsParPixel ? ligne[x - octetsParPixel] : 0;
      const b = precedente[x];
      const c = x >= octetsParPixel ? precedente[x - octetsParPixel] : 0;
      let reconstitue;
      if (filtre === 0) reconstitue = valeur;
      else if (filtre === 1) reconstitue = valeur + a;
      else if (filtre === 2) reconstitue = valeur + b;
      else if (filtre === 3) reconstitue = valeur + ((a + b) >> 1);
      else reconstitue = valeur + paeth(a, b, c);
      ligne[x] = reconstitue & 0xff;
    }
    if (!encre) {
      for (let p = 0; p < largeur; p += 1) {
        const base = p * octetsParPixel;
        if (typeCouleur === 3) {
          const index = ligne[base];
          // Un index hors palette n'est pas affichable : on ne conclut pas.
          if (index >= nbEntreesPalette) return 'INDETERMINABLE';
          const alpha = index < nbAlphasPalette ? octets[trnsDebut + index] : 255;
          if (alpha === 0) {
            cle[0] = 0; cle[1] = 0; cle[2] = 0; cle[3] = 0;
          } else {
            cle[0] = octets[plteDebut + (index * 3)];
            cle[1] = octets[plteDebut + (index * 3) + 1];
            cle[2] = octets[plteDebut + (index * 3) + 2];
            cle[3] = alpha;
          }
        } else {
          // Alpha nul (tous ses octets à zéro) : pixel RIGOUREUSEMENT
          // invisible — sa couleur ne se voit pas, elle ne compte pas.
          let invisible = avecAlpha;
          if (invisible) {
            for (let i = octetsParPixel - octetsParEchantillon;
              i < octetsParPixel; i += 1) {
              if (ligne[base + i] !== 0) { invisible = false; break; }
            }
          }
          for (let i = 0; i < octetsParPixel; i += 1) {
            cle[i] = invisible ? 0 : ligne[base + i];
          }
        }
        if (!premierLu) {
          premier.set(cle);
          premierLu = true;
        } else {
          for (let i = 0; i < tailleCle; i += 1) {
            if (cle[i] !== premier[i]) { encre = true; break; }
          }
          if (encre) break;
        }
      }
    }
    precedente.set(ligne);
  }
  return encre ? 'ENCRE' : 'VIDE';
}

export {
  MAGIQUES_PNG,
  SURFACE_MAX_OCTETS,
  verifierStructurePng,
  analyseEncre,
  lireImagePng
};
