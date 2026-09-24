/* =====================================================================
   schemas.js — LES DEUX DESSINS DU TP
   ---------------------------------------------------------------------
   1. `developpe` — le schéma développé normalisé (repères Q1, S1, S2, KM1,
      bornes 1-2 / 3-4 / 13-14 / A1-A2), rails L1 en haut et N en bas.
   2. `platine`   — la platine de câblage vue de face : disjoncteur de
      commande, contacteur avec ses borniers, les deux boutons, les fils.

   Les deux dessins sont des fonctions de l'état (Q1, S1, S2, KM1) : on les
   régénère à chaque manœuvre. Rien n'est copié d'une image existante — les
   proportions viennent des catalogues constructeurs, les symboles de la
   NF EN 60617. Fond clair, couleurs de la charte inerWeb Édu.

   Options communes :
     masquerCourant  ne colore aucun segment (mode dépannage)
     vierge          fiche élève : repères et bornes laissés à compléter
     cablage         identifiant d'un câblage fautif (voir simulation.js)
   ===================================================================== */
window.SCHEMAS = (function () {
  'use strict';

  const MARINE = '#1b3a63', ORANGE = '#ff6b35', BLEU = '#1d6fd6',
        GRIS = '#8a94a0', BRUN = '#7b4a12', FIL = '#3b4a5a', ROUGE = '#c8102e', VERT = '#16a34a';

  const POLICE_T = "font-family=\"'Trebuchet MS',Tahoma,sans-serif\" font-weight=\"700\"";
  const POLICE_C = "font-family=\"Calibri,Carlito,'Segoe UI',sans-serif\"";

  /* ---------------------------------------------------------- outils */
  function trait(x1, y1, x2, y2, sousTension, couleur) {
    const c = sousTension ? ORANGE : (couleur || MARINE);
    const w = sousTension ? 3.4 : 2.2;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${sousTension ? ' class="flux"' : ''}/>`;
  }
  function texte(x, y, s, taille, opts) {
    opts = opts || {};
    return `<text x="${x}" y="${y}" font-size="${taille}" fill="${opts.fill || MARINE}" ${opts.titre ? POLICE_T : POLICE_C}${opts.ancre ? ` text-anchor="${opts.ancre}"` : ''}>${s}</text>`;
  }
  /* Un repère laissé à compléter sur la fiche élève. */
  function blanc(x, y, largeur, ancre) {
    const x1 = ancre === 'end' ? x - largeur : x;
    return `<line x1="${x1}" y1="${y + 3}" x2="${x1 + largeur}" y2="${y + 3}" stroke="${MARINE}" stroke-width="1" stroke-dasharray="2 3"/>`;
  }
  /* Le halo de l'atelier « relier » : l'organe dont on cherche les bornes. */
  function halo(x, y1, y2, large, droite) {
    const g = droite ? 20 : (large ? 74 : 50);
    return `<rect x="${x - g}" y="${y1 + 4}" width="${droite ? 130 : g + 40}" height="${y2 - y1 - 8}" rx="10" fill="#fff1eb" stroke="#ff6b35" stroke-width="2" stroke-dasharray="6 4"/>`;
  }
  function noeud(x, y, sousTension) {
    return `<circle cx="${x}" cy="${y}" r="4" fill="${sousTension ? ORANGE : MARINE}"/>`;
  }

  /* Un contact vertical entre (x, y1) et (x, y2), NF EN 60617.
     d = { type: 'NO' | 'NC' | 'disj', ferme, repere, sous, bornes: [haut, bas],
           poussoir, tIn, tOut, vierge, lampe } */
  function contact(x, y1, y2, d) {
    const ya = y1 + 16, yb = y2 - 16;      // extrémités des amenées
    let s = trait(x, y1, x, ya, d.tIn) + trait(x, yb, x, y2, d.tOut);
    const tLame = d.tIn && d.ferme;
    if (d.type === 'NC') {
      // pied du contact fixe, à gauche ; la lame le croise quand le contact est fermé
      s += trait(x - 11, ya + 3, x, ya + 3, d.tIn);
      s += d.ferme ? trait(x, yb, x - 8, ya - 4, tLame) : trait(x, yb, x - 20, ya + 10, false);
    } else {
      // NO (et disjoncteur) : la lame ne touche l'amenée du haut que fermée
      s += d.ferme ? trait(x, yb, x, ya, tLame) : trait(x, yb, x - 14, ya + 4, false);
      if (d.type === 'disj') {
        // la croix du pouvoir de coupure, et le trait du déclencheur
        const cx = d.ferme ? x : x - 12, cy = d.ferme ? ya - 2 : ya + 2;
        s += `<path d="M${cx - 5},${cy - 5} l10,10 M${cx + 5},${cy - 5} l-10,10" stroke="${MARINE}" stroke-width="2"/>`;
      }
    }
    // organe de commande : bouton poussoir
    if (d.poussoir) {
      const ym = (ya + yb) / 2;
      const xl = d.ferme === (d.type === 'NC') ? x - 8 : x - 12;
      s += `<line x1="${xl}" y1="${ym}" x2="${x - 30}" y2="${ym}" stroke="${MARINE}" stroke-width="1.6" stroke-dasharray="4 3"/>`;
      const appuye = d.type === 'NC' ? !d.ferme : d.ferme;
      s += `<path d="M${x - 30},${ym} h-8 M${x - 38},${ym - 7} v14" stroke="${appuye ? ORANGE : MARINE}" stroke-width="${appuye ? 3.2 : 2.2}" stroke-linecap="round"/>`;
    }
    // repère et bornes — à droite pour une branche parallèle, sinon le
    // libellé traverserait la branche voisine
    const xr = d.droite ? x + 24 : (d.poussoir ? x - 48 : x - 22);
    const ancre = d.droite ? 'start' : 'end';
    if (d.vierge && d.aCompleter) {
      s += blanc(xr, y1 + 26, 34, ancre);
      s += blanc(x + 8, ya - 4, 22) + blanc(x + 8, yb + 12, 22);
    } else {
      s += texte(xr, y1 + 30, d.repere, 16, { titre: true, ancre });
      if (d.sous) s += texte(xr, y1 + 46, d.sous, 12, { ancre, fill: '#5a6472' });
      if (d.bornes) {
        s += texte(x + 7, ya - 4, d.bornes[0], 12, { fill: '#5a6472' });
        s += texte(x + 7, yb + 13, d.bornes[1], 12, { fill: '#5a6472' });
      }
    }
    return s;
  }

  /* La bobine du contacteur entre (x, y1) et (x, y2). */
  function bobine(x, y1, y2, d) {
    const h = 34, yr = (y1 + y2) / 2 - h / 2;
    let s = trait(x, y1, x, yr, d.tIn) + trait(x, yr + h, x, y2, d.tIn, d.coupee ? MARINE : null);
    s += `<rect x="${x - 16}" y="${yr}" width="32" height="${h}" fill="${d.tIn && !d.coupee ? '#fff1eb' : '#fff'}" stroke="${d.tIn && !d.coupee ? ORANGE : MARINE}" stroke-width="${d.tIn && !d.coupee ? 3 : 2.2}"/>`;
    if (d.coupee) s += `<path d="M${x - 9},${yr + 8} l18,18 M${x + 9},${yr + 8} l-18,18" stroke="${ROUGE}" stroke-width="2.6"/>`;
    if (d.vierge) {
      s += blanc(x - 22, y1 + 22, 34, 'end');
      s += blanc(x + 20, yr - 4, 22) + blanc(x + 20, yr + h + 14, 22);
    } else {
      s += texte(x - 22, y1 + 26, d.repere || 'KM1', 16, { titre: true, ancre: 'end' });
      s += texte(x - 22, y1 + 42, 'bobine', 12, { ancre: 'end', fill: '#5a6472' });
      s += texte(x + 20, yr - 4, 'A1', 12, { fill: '#5a6472' });
      s += texte(x + 20, yr + h + 14, 'A2', 12, { fill: '#5a6472' });
    }
    return s;
  }

  /* Un voyant en parallèle de la bobine. */
  function lampe(x, y1, y2, d) {
    const r = 14, yc = (y1 + y2) / 2;
    let s = trait(x, y1, x, yc - r, d.tIn) + trait(x, yc + r, x, y2, d.tIn);
    s += `<circle cx="${x}" cy="${yc}" r="${r}" fill="${d.tIn ? '#fff1eb' : '#fff'}" stroke="${d.tIn ? ORANGE : MARINE}" stroke-width="2.2"/>`;
    const k = r * 0.7;
    s += `<path d="M${x - k},${yc - k} L${x + k},${yc + k} M${x + k},${yc - k} L${x - k},${yc + k}" stroke="${d.tIn ? ORANGE : MARINE}" stroke-width="2"/>`;
    s += texte(x + 22, yc + 5, d.repere || 'H1', 16, { titre: true });
    s += texte(x + 22, yc + 20, 'voyant marche', 12, { fill: '#5a6472' });
    return s;
  }

  /* ---------------------------------------------- catalogue des organes */
  function organe(id, e, cab) {
    switch (id) {
      case 'q1': return { type: 'disj', repere: 'Q1', sous: 'disj. commande', bornes: ['1', '2'], ferme: !!e.q, aCompleter: true };
      case 'f1': return { type: 'NC', repere: 'F1', sous: 'relais thermique', bornes: ['95', '96'], ferme: true };
      case 'hp': return { type: 'NC', repere: 'HP', sous: 'pressostat sécurité', bornes: ['1', '2'], ferme: true };
      case 's3': return { type: 'NC', repere: 'S3', sous: 'Arrêt poste 2', bornes: ['1', '2'], poussoir: true, ferme: true };
      case 's1': return { type: 'NC', repere: 'S1', sous: 'Arrêt', bornes: ['1', '2'], poussoir: true, ferme: !e.s1, aCompleter: true };
      case 's2':
        if (cab === 'marche-nc') return { type: 'NC', repere: 'S2', sous: 'Marche (NC !)', bornes: ['1', '2'], poussoir: true, ferme: !e.s2 };
        return { type: 'NO', repere: 'S2', sous: 'Marche', bornes: ['3', '4'], poussoir: true, ferme: !!e.s2, aCompleter: true };
      case 's4': return { type: 'NO', repere: 'S4', sous: 'Marche poste 2', bornes: ['3', '4'], poussoir: true, ferme: false };
      case 'km13':
        if (cab === 'auxiliaire-nc') return { type: 'NC', repere: 'KM1', sous: 'auxiliaire (NC !)', bornes: ['21', '22'], ferme: !e.km };
        return { type: 'NO', repere: 'KM1', sous: 'auto-maintien', bornes: ['13', '14'], ferme: !!e.km, aCompleter: true };
    }
    return null;
  }

  /* ============================================== le schéma développé */
  function developpe(e, opts) {
    opts = opts || {};
    const cab = opts.cablage || 'normal';
    const vierge = !!opts.vierge;
    const courant = !opts.masquerCourant && cab === 'normal' && !vierge;
    const seg = courant ? window.SIMULATION.segments(e) : { reseau: false, amont: false, a: false, b: false, bobine: false };
    if (vierge) e = { q: true, s1: false, s2: false, km: false };

    let serie = (opts.serie || ['q1', 's1']).slice();
    let branches = (opts.maintien || ['s2', 'km13']).slice();
    const paralleles = (opts.paralleles || []).slice();   // en parallèle de la bobine
    if (cab === 'sans-maintien') branches = branches.filter(b => b !== 'km13');
    if (cab === 'arret-parallele') { serie = serie.filter(s => s !== 's1'); branches = ['s1'].concat(branches); }
    const pontAmont = cab === 'maintien-amont';
    if (pontAmont) branches = branches.filter(b => b !== 'km13');

    const X = 170, H = 64, HB = 96, HC = 96, PAS = 84;
    const yRail = 30;
    const ySerie = yRail + 14;
    const yA = ySerie + serie.length * H;       // nœud A : entrée du bloc maintien
    const yB = yA + HB;                          // nœud B : entrée de la bobine
    const yN = yB + HC;                          // rail N
    const nbColonnes = Math.max(branches.length + (pontAmont ? 1 : 0), 1 + paralleles.length);
    const largeurCommande = X + 60 + (nbColonnes - 1) * PAS + 40;
    const largeur = opts.puissance ? largeurCommande + 300 : largeurCommande;
    const hauteur = yN + 34;

    let s = '';
    // rails
    s += trait(60, yRail, largeurCommande - 30, yRail, seg.reseau, BRUN);
    s += texte(20, yRail + 5, 'L1', 15, { titre: true });
    s += trait(60, yN, largeurCommande - 30, yN, false, BLEU);
    s += texte(20, yN + 5, 'N', 15, { titre: true });

    // la série
    let t = seg.reseau;
    let y = ySerie;
    s += trait(X, yRail, X, ySerie, t);
    let yApresQ1 = null;
    serie.forEach(id => {
      const d = organe(id, e, cab);
      if (opts.surligner === id) s += halo(X, y, y + H, d.poussoir);
      const tOut = courant ? (t && d.ferme) : false;
      s += contact(X, y, y + H, Object.assign(d, { tIn: courant && t, tOut, vierge }));
      t = tOut;
      y += H;
      if (id === 'q1') yApresQ1 = y;
    });
    const tA = courant && t;
    s += noeud(X, yA, tA);

    // le bloc maintien : autant de branches en parallèle
    const tB = courant ? seg.b : false;
    branches.forEach((id, i) => {
      const x = X + i * PAS;
      const d = organe(id, e, cab);
      if (i > 0) { s += trait(X + (i - 1) * PAS, yA, x, yA, tA); s += trait(X + (i - 1) * PAS, yB, x, yB, tB); }
      if (opts.surligner === id) s += halo(x, yA, yB, d.poussoir, i > 0);
      s += contact(x, yA, yB, Object.assign(d, { tIn: tA, tOut: tB, vierge, droite: i > 0 }));
    });
    if (pontAmont) {
      // la faute : le contact 13-14 va chercher la phase avant le bouton Arrêt
      const x = X + branches.length * PAS;
      const d = organe('km13', e, cab);
      s += noeud(X, yApresQ1, false);
      s += trait(X, yApresQ1, x, yApresQ1, false) + trait(x, yApresQ1, x, yA + 10, false);
      s += trait(X + (branches.length - 1) * PAS, yB, x, yB, false);
      s += contact(x, yA + 10, yB, Object.assign(d, { tIn: false, tOut: false, vierge, droite: true }));
    }
    s += noeud(X, yB, tB);

    // la bobine et ce qui est en parallèle
    if (opts.surligner === 'bobine') s += halo(X, yB, yN, false);
    s += bobine(X, yB, yN, { tIn: tB, coupee: cab === 'bobine-hs', vierge });
    paralleles.forEach((id, i) => {
      const x = X + (i + 1) * PAS;
      s += trait(X + i * PAS, yB, x, yB, tB) + trait(X + i * PAS, yN, x, yN, false, BLEU);
      s += noeud(X + i * PAS, yB, tB);
      if (id === 'h1') s += lampe(x, yB, yN, { tIn: tB });
    });

    // le circuit de puissance, en grisé : ce n'est pas l'objet du TP
    if (opts.puissance) {
      const x0 = largeurCommande + 30, xs = [x0 + 40, x0 + 90, x0 + 140];
      const g = GRIS;
      s += `<rect x="${x0}" y="${yRail - 16}" width="230" height="${hauteur - yRail + 4}" fill="none" stroke="${g}" stroke-width="1.4" stroke-dasharray="6 5" rx="8"/>`;
      s += texte(x0 + 115, yRail - 2, 'Puissance — pas câblée dans ce TP', 11, { fill: g, ancre: 'middle' });
      const yk1 = yRail + 40, yk2 = yk1 + 56, yf = yk2 + 30, yM = yN - 30;
      xs.forEach((x, i) => {
        s += texte(x - 8, yRail + 24, 'L' + (i + 1), 12, { fill: g });
        s += `<line x1="${x}" y1="${yRail + 28}" x2="${x}" y2="${yk1 + 16}" stroke="${g}" stroke-width="2"/>`;
        s += e.km && !vierge
          ? `<line x1="${x}" y1="${yk2 - 16}" x2="${x}" y2="${yk1 + 16}" stroke="${g}" stroke-width="2"/>`
          : `<line x1="${x}" y1="${yk2 - 16}" x2="${x - 12}" y2="${yk1 + 20}" stroke="${g}" stroke-width="2"/>`;
        s += `<line x1="${x}" y1="${yk2 - 16}" x2="${x}" y2="${yf}" stroke="${g}" stroke-width="2"/>`;
        s += `<rect x="${x - 7}" y="${yf}" width="14" height="22" fill="none" stroke="${g}" stroke-width="1.8"/>`;
        s += `<line x1="${x}" y1="${yf + 22}" x2="${x}" y2="${yM - 30}" stroke="${g}" stroke-width="2"/>`;
        s += texte(x + 5, yk1 + 12, String(2 * i + 1), 10, { fill: g });
        s += texte(x + 5, yk2 - 2, String(2 * i + 2), 10, { fill: g });
      });
      // liaison mécanique des trois pôles
      s += `<line x1="${xs[0] - 6}" y1="${(yk1 + yk2) / 2}" x2="${xs[2] - 6}" y2="${(yk1 + yk2) / 2}" stroke="${g}" stroke-width="1.4" stroke-dasharray="4 3"/>`;
      s += texte(xs[2] + 12, (yk1 + yk2) / 2 + 4, 'KM1', 12, { fill: g, titre: true });
      s += texte(xs[2] + 12, yf + 16, 'F1', 12, { fill: g, titre: true });
      s += `<path d="M${xs[0]},${yM - 30} L${xs[1]},${yM - 30} L${xs[2]},${yM - 30}" stroke="${g}" stroke-width="2" fill="none"/>`;
      s += `<circle cx="${xs[1]}" cy="${yM}" r="26" fill="${e.km && courant ? '#fff1eb' : '#fff'}" stroke="${e.km && courant ? ORANGE : g}" stroke-width="2.2"/>`;
      s += texte(xs[1], yM + 2, 'M', 18, { fill: e.km && courant ? ORANGE : g, ancre: 'middle', titre: true });
      s += texte(xs[1], yM + 18, '3~', 12, { fill: e.km && courant ? ORANGE : g, ancre: 'middle' });
      s += texte(xs[1], yM + 44, e.km && courant ? 'tourne' : 'à l’arrêt', 12, { fill: e.km && courant ? ORANGE : g, ancre: 'middle' });
    }

    return `<svg viewBox="0 0 ${largeur} ${hauteur}" class="schema developpe" role="img" aria-label="Schéma développé du circuit de commande à auto-maintien">${s}</svg>`;
  }

  /* ===================================================== la platine */
  /* Bornes cliquables : chaque cercle porte data-borne. */
  const BORNES = {
    'q1-n-in': [88, 48], 'q1-l-in': [142, 48], 'q1-n-out': [88, 182], 'q1-l-out': [142, 182],
    's1-1': [485, 62], 's1-2': [485, 188], 's2-3': [485, 292], 's2-4': [485, 418],
    'km-a1': [62, 285], 'km-1': [112, 285], 'km-3': [162, 285], 'km-5': [212, 285], 'km-13': [270, 285],
    'km-2': [112, 445], 'km-4': [162, 445], 'km-6': [212, 445], 'km-14': [270, 445], 'km-a2': [308, 445]
  };
  const ETIQUETTES = {
    'q1-n-in': 'N', 'q1-l-in': '1', 'q1-n-out': 'N', 'q1-l-out': '2',
    's1-1': '1', 's1-2': '2', 's2-3': '3', 's2-4': '4',
    'km-a1': 'A1', 'km-1': '1/L1', 'km-3': '3/L2', 'km-5': '5/L3', 'km-13': '13 NO',
    'km-2': '2/T1', 'km-4': '4/T2', 'km-6': '6/T3', 'km-14': '14 NO', 'km-a2': 'A2'
  };
  const A_COMPLETER = ['km-a1', 'km-a2', 'km-13', 'km-14', 's1-1', 's1-2', 's2-3', 's2-4'];

  function borne(id, opts) {
    const [x, y] = BORNES[id];
    const marque = opts.marques && opts.marques[id];
    const cls = 'borne' + (marque ? ' ' + marque : '') + (opts.cliquable ? ' cliquable' : '');
    let s = `<g class="${cls}" data-borne="${id}"><circle cx="${x}" cy="${y}" r="9" fill="#e9ecef" stroke="${MARINE}" stroke-width="2"/><path d="M${x - 4},${y - 4} l8,8 M${x + 4},${y - 4} l-8,8" stroke="${MARINE}" stroke-width="1.4"/></g>`;
    const haut = y < 300 && !/q1-.-out|s1-2|s2-4/.test(id);
    const dy = /^km-|^q1-/.test(id) ? (haut ? -14 : 24) : (haut ? -14 : 24);
    const ex = (id === 'km-a1') ? x - 12 : (id === 'km-a2') ? x + 20 : x;
    if (opts.vierge && A_COMPLETER.includes(id)) s += blanc(ex - 12, y + dy - 6, 24);
    else s += texte(ex, y + dy, ETIQUETTES[id], 12, { ancre: 'middle', fill: MARINE, titre: /a1|a2|13|14/.test(id) });
    return s;
  }

  function fil(d, sousTension, couleur) {
    const c = sousTension ? ORANGE : (couleur || FIL);
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${sousTension ? 5 : 4}" stroke-linecap="round" stroke-linejoin="round"${sousTension ? ' class="flux"' : ''}/>`;
  }

  function platine(e, opts) {
    opts = opts || {};
    const vierge = !!opts.vierge;
    const courant = !opts.masquerCourant && !vierge && (opts.cablage || 'normal') === 'normal';
    const seg = courant ? window.SIMULATION.segments(e) : { reseau: false, amont: false, a: false, b: false, bobine: false };
    if (vierge) e = { q: true, s1: false, s2: false, km: false };

    let s = '';
    // ------------------------------------------------ les fils (dessous)
    s += fil('M0,12 H142 V40', seg.reseau, BRUN);                                    // phase réseau
    s += fil('M0,28 H88 V40', false, BLEU);                                          // neutre réseau
    s += fil('M142,191 V228 H395 V40 H485 V53', seg.amont);                          // Q1 → S1 borne 1
    s += fil('M485,197 V283', seg.a);                                                // S1 borne 2 → S2 borne 3
    s += fil('M485,240 H270 V276', seg.a);                                           // nœud → KM 13
    s += fil('M485,427 V488 H270 V454', seg.b);                                      // S2 borne 4 → KM 14
    s += fil('M270,488 H22 V285 H53', seg.b);                                        // → KM A1
    s += fil('M308,454 V504 H350 V262 H276 a6,6 0 0 0 -12,0 H88 V191', false, BLEU); // KM A2 → Q1 neutre
    if (courant) {
      s += noeud(485, 240, seg.a) + noeud(270, 488, seg.b);
    }

    // ------------------------------------------------- le disjoncteur Q1
    s += `<g class="q1${e.q ? ' enclenche' : ''}" data-organe="q1">`;
    s += `<rect x="60" y="40" width="110" height="150" rx="6" fill="#fafafa" stroke="${MARINE}" stroke-width="2.2"/>`;
    s += `<rect x="62" y="96" width="106" height="40" fill="#f0f2f4"/>`;
    s += `<rect x="78" y="${e.q ? 100 : 112}" width="74" height="22" rx="4" fill="${e.q ? ROUGE : '#b0b8c0'}" stroke="${MARINE}" stroke-width="1.6"/>`;
    s += texte(115, 84, 'Q1', 15, { ancre: 'middle', titre: true });
    s += texte(115, 156, e.q ? 'I  enclenché' : 'O  coupé', 11, { ancre: 'middle', fill: '#5a6472' });
    s += texte(115, 172, '2 A · courbe C', 11, { ancre: 'middle', fill: '#5a6472' });
    s += '</g>';

    // ------------------------------------------------- le contacteur KM1
    const colle = e.km && !vierge;
    s += `<g class="km${colle ? ' colle' : ''}${e.bat ? ' bat' : ''}" data-organe="km">`;
    s += `<rect x="40" y="275" width="290" height="180" rx="8" fill="#2b2f36" stroke="${MARINE}" stroke-width="2.2"/>`;
    s += `<rect x="40" y="275" width="290" height="180" rx="8" fill="#fafafa" stroke="${MARINE}" stroke-width="2.2" opacity="${vierge ? 1 : 0}"/>`;
    s += `<rect x="52" y="300" width="266" height="130" rx="6" fill="#f2f4f6" stroke="#c7ccd2"/>`;
    // la fenêtre de l'armature : elle descend quand le contacteur colle
    s += `<rect x="128" y="${colle ? 352 : 340}" width="114" height="26" rx="4" fill="${colle ? ORANGE : '#3b6fc9'}" stroke="${MARINE}" stroke-width="1.6"/>`;
    s += texte(185, colle ? 370 : 358, colle ? 'COLLÉ' : 'repos', 12, { ancre: 'middle', fill: '#fff', titre: true });
    s += texte(185, 328, 'KM1', 18, { ancre: 'middle', titre: true });
    s += texte(185, 400, e.bat ? 'clac-clac-clac…' : (colle ? 'contacts 1-2 · 3-4 · 5-6 fermés' : 'contacts 1-2 · 3-4 · 5-6 ouverts'), 11, { ancre: 'middle', fill: e.bat ? ROUGE : '#5a6472' });
    s += texte(185, 416, 'AC-3 · bobine 230 V ~', 11, { ancre: 'middle', fill: '#5a6472' });
    s += '</g>';

    // ------------------------------------------------- les deux boutons
    function bouton(x, y, couleur, appuye, repere, libelle, sous, id) {
      let b = `<g class="bouton${appuye ? ' appuye' : ''}" data-organe="${id}">`;
      b += `<rect x="${x - 45}" y="${y - 55}" width="90" height="110" rx="8" fill="#fafafa" stroke="${MARINE}" stroke-width="2.2"/>`;
      b += `<circle cx="${x}" cy="${y}" r="34" fill="#dfe3e8" stroke="${MARINE}" stroke-width="1.6"/>`;
      b += `<circle cx="${x}" cy="${y + (appuye ? 3 : 0)}" r="${appuye ? 25 : 27}" fill="${couleur}" stroke="${appuye ? ORANGE : MARINE}" stroke-width="${appuye ? 4 : 2}"/>`;
      b += texte(x, y - 40, repere, 15, { ancre: 'middle', titre: true });
      b += texte(x, y + 48, libelle, 12, { ancre: 'middle', fill: '#5a6472' });
      b += texte(x + 56, y - 8, sous, 11, { fill: '#5a6472' });
      b += '</g>';
      return b;
    }
    s += bouton(485, 125, ROUGE, e.s1, 'S1', 'Arrêt', vierge ? '' : 'contact NC', 's1');
    s += bouton(485, 355, VERT, e.s2, 'S2', 'Marche', vierge ? '' : 'contact NO', 's2');

    // ------------------------------------------------- les bornes (dessus)
    Object.keys(BORNES).forEach(id => { s += borne(id, opts); });
    s += texte(0, 8, 'L', 11, { fill: BRUN, titre: true }) + texte(0, 40, 'N', 11, { fill: BLEU, titre: true });

    return `<svg viewBox="-4 0 610 520" class="schema platine" role="img" aria-label="Platine de câblage : disjoncteur, contacteur, boutons Arrêt et Marche">${s}</svg>`;
  }

  return { developpe, platine, BORNES, ETIQUETTES };
})();
