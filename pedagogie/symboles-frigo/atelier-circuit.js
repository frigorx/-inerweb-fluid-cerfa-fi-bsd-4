/* Atelier 4 — Le circuit fantôme.
   Le schéma de l'installation complète, vidé de ses 22 symboles.
   L'élève replace chaque organe, puis suit le fluide d'un bout à l'autre. */

(function () {

  /* Implantation : repère → position sur la planche (1060 × 790). */
  const POS = {
    17: [200, 130], 15: [370, 130], 14: [480, 130], 13: [580, 130],
    12: [680, 130], 11: [790, 130], 10: [930, 130],
    16: [480, 18], 22: [930, 18],
    18: [80, 260], 19: [80, 390],
    4:  [250, 452], 1: [390, 540], 3: [390, 430],
    2:  [500, 540], 5: [600, 540], 6: [710, 540],
    7:  [860, 650], 8: [700, 715], 9: [590, 715], 21: [470, 715], 20: [350, 715]
  };

  /* Tuyauteries. Trait plein = fluide, trait pointillé = information. */
  const TUYAUX = [
    { p: [[200, 130], [930, 130]] },                                   // ligne liquide
    { p: [[710, 540], [990, 540], [990, 130], [930, 130]] },           // refoulement → condenseur
    { p: [[390, 540], [710, 540]] },                                   // refoulement
    { p: [[200, 130], [80, 130], [80, 540], [390, 540]] },             // aspiration
    { p: [[250, 540], [250, 496]] },                                   // piquage pressostat BP
    { p: [[390, 500], [390, 474]] },                                   // piquage pressostat combiné
    { p: [[710, 584], [710, 650], [860, 650]] },                       // huile : séparateur → réservoir
    { p: [[860, 694], [860, 715], [700, 715]] },                       // huile : réservoir → filtre
    { p: [[700, 715], [350, 715]] },                                   // huile : filtre → flotteur
    { p: [[350, 715], [350, 590], [390, 590]] },                       // huile : retour au carter
    { p: [[930, 62], [930, 86]], info: true },                         // PZH → condenseur
    { p: [[480, 62], [480, 86]], info: true }                          // TSHL → électrovanne
  ];

  const COTE = 88;    // côté de l'emplacement cliquable
  const MASQUE = 76;  // fond blanc qui interrompt le tuyau sous le symbole

  /* Le parcours du fluide — formulations du module. */
  const PARCOURS = [
    { q: "Entre le compresseur (1) et le condenseur (10), dans quel état se trouve le fluide frigorigène ?",
      c: ["Gaz haute pression, haute température", "Liquide haute pression",
          "Gaz basse pression, basse température", "Liquide basse pression"], b: 0,
      e: "Le compresseur aspire du gaz BP basse température et le refoule en gaz HP haute température." },
    { q: "Entre le condenseur (10) et le détendeur (15), dans quel état se trouve le fluide ?",
      c: ["Liquide haute pression", "Gaz haute pression",
          "Liquide basse pression", "Gaz basse pression"], b: 0,
      e: "Le condenseur fait passer le fluide de l'état gazeux HP à l'état liquide HP. " +
         "C'est pour cela que la bouteille (11), le déshydrateur (12) et le voyant (13) sont sur cette portion : " +
         "on l'appelle la ligne liquide." },
    { q: "À la sortie du détendeur (15), qu'est-ce qui a changé ?",
      c: ["La pression a chuté : le fluide est liquide basse pression",
          "Le fluide est devenu gazeux haute pression",
          "La température a augmenté", "Rien : le détendeur ne fait que filtrer"], b: 0,
      e: "Le fluide entre à l'état liquide haute pression et ressort à l'état liquide basse pression. " +
         "C'est la détente." },
    { q: "Entre l'évaporateur (17) et le compresseur (1), dans quel état se trouve le fluide ?",
      c: ["Gaz basse pression", "Liquide basse pression",
          "Gaz haute pression", "Liquide haute pression"], b: 0,
      e: "L'évaporateur vaporise le fluide en absorbant la chaleur : liquide BP à l'entrée, gaz BP à la sortie. " +
         "C'est cette portion qu'on appelle l'aspiration." },
    { q: "Pourquoi la bouteille anti-coup de liquide (19) est-elle placée sur l'aspiration, et pas ailleurs ?",
      c: ["Parce que c'est là que du liquide risque d'arriver au compresseur",
          "Parce que c'est l'endroit le plus accessible pour la maintenance",
          "Parce que la pression y est la plus élevée",
          "Parce qu'elle sert de réserve de fluide"], b: 0,
      e: "Si l'évaporateur ne vaporise pas tout, du liquide repart vers le compresseur — et un compresseur " +
         "ne comprime pas un liquide. La bouteille le retient au fond et ne laisse repartir que la vapeur." },
    { q: "Le séparateur d'huile (6) est monté juste après le compresseur. Que récupère-t-il ?",
      c: ["L'huile entraînée par le fluide frigorigène à l'état vapeur",
          "L'humidité contenue dans le fluide",
          "Le liquide non vaporisé", "Les impuretés métalliques du condenseur"], b: 0,
      e: "L'huile part avec le gaz au refoulement. Le séparateur la récupère et la renvoie au carter " +
         "par le circuit d'huile : réservoir (7), filtre (8), voyant (9), électrovanne (21), flotteur (20)." }
  ];

  let hote, phase, pioche, placement, selection, verifie, scorePlace, pIndex, scoreParcours;

  function demarrer(el) {
    hote = el;
    phase = 'accueil';
    placement = {}; selection = null; verifie = false; scorePlace = 0;
    pIndex = 0; scoreParcours = 0;
    pioche = APP.melanger(DONNEES.schema.map(function (r, k) {
      return { tok: k, id: r.id };
    }));
    rendre();
  }

  function rendre() {
    if (phase === 'accueil') return accueil();
    if (phase === 'plan') return plan();
    if (phase === 'parcours') return parcours();
    if (phase === 'fin') return fin();
  }

  /* ------------------------------------------------------------- accueil */

  function accueil() {
    let h = '<h2 style="font-size:24px">Atelier 4 — Le circuit fantôme</h2>';
    h += '<p class="intro">Voici une installation frigorifique complète. Tous les symboles ont disparu : ' +
         'il ne reste que les tuyauteries et 22 emplacements numérotés. ' +
         'La liste des organes est donnée — à toi de remettre chaque symbole à sa place.</p>';
    h += '<div class="note"><strong>Méthode :</strong> ne commence pas par le repère 1. ' +
         'Commence par ce que tu reconnais du premier coup — le condenseur, l\'évaporateur, le compresseur — ' +
         'puis avance de proche en proche en suivant les tuyaux. ' +
         'Les emplacements alignés sur la ligne du haut sont sur la ligne liquide ; ' +
         'ceux du bas appartiennent au circuit d\'huile.</div>';
    h += '<div class="barre-actions"><button class="b" id="go">Ouvrir le schéma →</button>' +
         '<button class="b secondaire" data-aller="biblio">Revoir la bibliothèque d\'abord</button></div>';
    hote.innerHTML = h;
    document.getElementById('go').addEventListener('click', function () { phase = 'plan'; rendre(); });
  }

  /* --------------------------------------------------------------- plan */

  /* Le symbole posé et son fond blanc laissent passer le clic : seul le cadre
     `.trou`, dessiné par-dessus, est cliquable — sinon on ne peut plus retirer
     un symbole une fois qu'il est en place. */
  function dimensionner(svgTexte, x, y, cote) {
    return svgTexte.replace('<svg ',
      '<svg x="' + (x - cote / 2) + '" y="' + (y - cote / 2) + '" width="' + cote + '" height="' + cote +
      '" pointer-events="none" ');
  }

  /* mode 'corrige' : on affiche l'installation juste, sans code couleur ni clic.
     C'est celle-là que l'élève doit avoir sous les yeux pour suivre le fluide. */
  function dessinerSchema(mode) {
    let s = '<svg viewBox="0 -46 1060 836" role="img" aria-label="Schéma de l\'installation frigorifique">';

    TUYAUX.forEach(function (t) {
      s += '<polyline class="tuyau' + (t.info ? ' info' : '') + '" points="' +
           t.p.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') + '"/>';
    });

    DONNEES.schema.forEach(function (r) {
      const p = POS[r.n];
      if (!p) return;
      const x = p[0], y = p[1];

      if (mode === 'corrige') {
        s += '<rect x="' + (x - MASQUE / 2) + '" y="' + (y - MASQUE / 2) + '" width="' + MASQUE + '" height="' + MASQUE +
             '" fill="#fff" pointer-events="none"/>';
        s += dimensionner(APP.svgDe(r.id), x, y, COTE - 10);
        s += '<text class="num-repere" x="' + (x - COTE / 2 + 3) + '" y="' + (y - COTE / 2 - 5) + '">' +
             r.n + '</text>';
        return;
      }

      const pose = placement[r.n];
      const juste = verifie && pose && pose.id === r.id;

      if (pose) {
        s += '<rect x="' + (x - MASQUE / 2) + '" y="' + (y - MASQUE / 2) + '" width="' + MASQUE + '" height="' + MASQUE +
             '" fill="#fff" pointer-events="none"/>';
        s += dimensionner(APP.svgDe(pose.id), x, y, COTE - 10);
        s += '<rect class="trou ' + (verifie ? (juste ? 'rempli' : 'errone') : 'pose') +
             '" x="' + (x - COTE / 2) + '" y="' + (y - COTE / 2) + '" width="' + COTE + '" height="' + COTE +
             '" rx="7" data-repere="' + r.n + '"/>';
      } else {
        s += '<rect class="trou' + (verifie ? ' errone' : '') + '" x="' + (x - COTE / 2) + '" y="' + (y - COTE / 2) +
             '" width="' + COTE + '" height="' + COTE + '" rx="7" data-repere="' + r.n + '"/>';
      }
      s += '<text class="num-repere" x="' + (x - COTE / 2 + 3) + '" y="' + (y - COTE / 2 - 5) + '">' +
           r.n + '</text>';
    });

    s += '</svg>';
    return s;
  }

  function plan() {
    const poses = Object.keys(placement).length;
    let h = '<h2 style="font-size:24px">Le circuit fantôme</h2>';
    h += APP.jauge(poses, DONNEES.schema.length);
    h += '<p class="intro">Choisis un symbole dans la réserve, puis touche l\'emplacement où il va. ' +
         'Pour retirer un symbole déjà posé, touche-le.</p>';
    h += '<p style="font-size:16px;color:var(--texte-2);margin:-10px 0 12px">' +
         'Le schéma est large : fais-le glisser latéralement pour le parcourir. ' +
         'Sur téléphone, mets l\'écran en mode paysage.</p>';

    h += '<div class="carte" style="padding:12px 16px"><h3 style="font-size:17px">Les 22 organes de cette installation</h3>' +
         '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">';
    DONNEES.schema.forEach(function (r) {
      // Chip orange = emplacement occupé (pas « juste » : rien n'est corrigé
      // tant que l'élève n'a pas demandé la vérification).
      const pose = placement[r.n];
      h += '<span style="font-size:15px;padding:3px 10px;border-radius:999px;' +
           'background:' + (pose ? 'var(--orange-pale)' : '#eef4f9') + ';' +
           'border:1px solid ' + (pose ? 'var(--orange)' : 'transparent') + ';' +
           'color:var(--marine);font-weight:600">' +
           r.n + ' · ' + APP.echapper(r.nom) + '</span>';
    });
    h += '</div></div>';

    h += '<div id="zone-schema">' + dessinerSchema() + '</div>';

    h += '<h3 style="margin:16px 0 6px;font-size:19px">Réserve — ' +
         pioche.filter(function (t) { return !estPose(t); }).length + ' symbole(s) restant(s)</h3>';
    h += '<div class="pioche" id="pioche"></div>';

    h += '<div class="barre-actions">' +
         '<button class="b" id="verif"' + (poses < DONNEES.schema.length ? ' disabled' : '') + '>Vérifier mon circuit</button>' +
         '<button class="b secondaire" id="vider">Tout retirer</button>' +
         '<button class="b secondaire" data-aller="biblio">Bibliothèque</button></div>';

    hote.innerHTML = h;
    remplirPioche();
    brancherSchema();

    document.getElementById('verif').addEventListener('click', verifier);
    document.getElementById('vider').addEventListener('click', function () {
      placement = {}; selection = null; verifie = false; rendre();
    });
  }

  function estPose(tok) {
    return Object.keys(placement).some(function (n) { return placement[n].tok === tok.tok; });
  }

  function remplirPioche() {
    const z = document.getElementById('pioche');
    pioche.forEach(function (t) {
      if (estPose(t)) return;
      const b = document.createElement('button');
      b.className = 'vignette' + (selection && selection.tok === t.tok ? ' choisi' : '');
      b.type = 'button';
      b.innerHTML = APP.symbole(t.id);
      b.title = 'Symbole à placer';
      b.addEventListener('click', function () {
        selection = (selection && selection.tok === t.tok) ? null : t;
        verifie = false;
        rendre();
      });
      z.appendChild(b);
    });
  }

  function brancherSchema() {
    hote.querySelectorAll('.trou').forEach(function (r) {
      const n = parseInt(r.getAttribute('data-repere'), 10);
      r.addEventListener('click', function () {
        verifie = false;
        if (placement[n]) { delete placement[n]; }
        else if (selection) { placement[n] = selection; selection = null; }
        rendre();
      });
    });
  }

  function verifier() {
    verifie = true;
    scorePlace = 0;
    DONNEES.schema.forEach(function (r) {
      if (placement[r.n] && placement[r.n].id === r.id) scorePlace++;
    });
    const rates = DONNEES.schema.filter(function (r) {
      return !placement[r.n] || placement[r.n].id !== r.id;
    });

    let h = '<h2 style="font-size:24px">Vérification</h2>';
    h += '<div class="carte"><p style="font-size:22px;font-weight:700">' + scorePlace + ' / ' +
         DONNEES.schema.length + ' emplacements justes</p></div>';
    h += '<div id="zone-schema">' + dessinerSchema() + '</div>';
    if (rates.length) {
      h += '<div class="carte"><h3>Les emplacements à revoir</h3><ul class="puces">';
      rates.forEach(function (r) {
        const s = APP.SYM[r.id];
        h += '<li><strong>' + r.n + ' — ' + APP.echapper(r.nom) + '</strong> : ' +
             APP.echapper(s.indice) + '</li>';
      });
      h += '</ul></div>';
    }
    h += '<div class="barre-actions">' +
         '<button class="b" id="suite">Suivre le fluide →</button>' +
         '<button class="b secondaire" id="corriger">Corriger mon circuit</button></div>';
    hote.innerHTML = h;

    document.getElementById('suite').addEventListener('click', function () { phase = 'parcours'; rendre(); });
    document.getElementById('corriger').addEventListener('click', function () { rendre(); });
  }

  /* ------------------------------------------------------------ parcours */

  function parcours() {
    if (pIndex >= PARCOURS.length) { phase = 'fin'; return rendre(); }
    const q = PARCOURS[pIndex];
    let h = '<h2 style="font-size:24px">Le parcours du fluide</h2>';
    h += APP.jauge(pIndex, PARCOURS.length);
    h += '<div id="zone-schema" style="margin-bottom:14px">' + dessinerSchema('corrige') + '</div>';
    h += '<p style="font-size:16px;color:var(--texte-2);margin:-6px 0 12px">' +
         'Le schéma affiché est le schéma corrigé : sers-t\'en pour répondre.</p>';
    h += '<div class="question"><p class="consigne">' + APP.echapper(q.q) + '</p>' +
         '<div class="choix" id="choix"></div><div id="retour"></div></div>';
    hote.innerHTML = h;

    const zone = document.getElementById('choix');
    APP.melanger(q.c.map(function (t, k) { return { t: t, k: k }; })).forEach(function (o) {
      const b = document.createElement('button');
      b.className = 'reponse';
      b.type = 'button';
      b.textContent = o.t;
      b.addEventListener('click', function () {
        const juste = (o.k === q.b);
        if (juste) scoreParcours++;
        zone.querySelectorAll('button').forEach(function (x) {
          x.disabled = true;
          if (x.textContent === q.c[q.b]) x.classList.add('juste');
        });
        if (!juste) b.classList.add('faux');
        const r = document.getElementById('retour');
        r.className = 'retour-info ' + (juste ? 'ok' : 'ko');
        r.innerHTML = '<strong>' + (juste ? 'Exact.' : 'Non.') + '</strong>' + APP.echapper(q.e);
        const d = document.createElement('div');
        d.className = 'barre-actions';
        d.innerHTML = '<button class="b" id="suite">Suivant →</button>';
        hote.querySelector('.question').appendChild(d);
        document.getElementById('suite').addEventListener('click', function () { pIndex++; rendre(); });
      });
      zone.appendChild(b);
    });
  }

  /* ------------------------------------------------------------- clôture */

  function fin() {
    const total = DONNEES.schema.length + PARCOURS.length;
    const score = scorePlace + scoreParcours;
    APP.marquer('circuit', score, total);
    const lignes = [
      'Placement des symboles : ' + scorePlace + ' / ' + DONNEES.schema.length,
      'Parcours du fluide : ' + scoreParcours + ' / ' + PARCOURS.length
    ];
    hote.innerHTML = APP.bilan('Atelier 4 terminé', score, total, lignes,
      '<button class="b" data-aller="blanc">Atelier 5 →</button>' +
      '<button class="b secondaire" data-aller="circuit">Refaire le circuit</button>');
  }

  APP.enregistrer('circuit', 'ec-circuit', demarrer);

})();
