/* Atelier 2 — Les huit familles.
   Deux jeux : un memory symbole ↔ nom, manche par manche, puis un tri rapide
   où l'élève doit ranger un symbole dans sa famille. */

(function () {

  const MANCHES = [
    { titre: 'Les machines tournantes', groupes: ['A'] },
    { titre: 'Les échangeurs', groupes: ['B'] },
    { titre: 'Détendre, filtrer, voir', groupes: ['C', 'D'] },
    { titre: 'Vannes, réservoirs et accessoires', groupes: ['E', 'F'] },
    { titre: 'Instruments et régulateurs', groupes: ['G', 'H'] }
  ];
  const PAR_MANCHE = 6;
  const NB_TRI = 20;

  let hote, phase, manche, cartes, retournees, trouvees, erreurs, scoreMemory;
  let triListe, triIndex, scoreTri, triRates;

  function demarrer(el) {
    hote = el;
    phase = 'accueil';
    manche = 0; scoreMemory = 0;
    scoreTri = 0; triRates = [];
    rendre();
  }

  function rendre() {
    if (phase === 'accueil') return accueil();
    if (phase === 'memory') return rendreMemory();
    if (phase === 'transition') return transition();
    if (phase === 'tri') return rendreTri();
    if (phase === 'fin') return fin();
  }

  /* ------------------------------------------------------------- accueil */

  function accueil() {
    let h = '<h2 style="font-size:24px">Atelier 2 — Les huit familles</h2>';
    h += '<p class="intro">Deux jeux. D\'abord un memory, pour accrocher le nom au dessin. ' +
         'Ensuite un tri rapide, pour vérifier que tu sais ranger.</p>';
    h += '<div class="carte"><h3>Les huit familles</h3><div class="boites">';
    DONNEES.groupes.forEach(function (g) {
      const n = DONNEES.symboles.filter(function (s) { return s.groupe === g.cle; }).length;
      h += '<div class="boite" style="border-left:7px solid ' + g.couleur + '">' +
           '<div class="n">' + n + '</div><div class="l">' + APP.echapper(g.nom) + '</div></div>';
    });
    h += '</div></div>';
    h += '<div class="barre-actions"><button class="b" id="go">Commencer le memory →</button></div>';
    hote.innerHTML = h;
    document.getElementById('go').addEventListener('click', function () {
      phase = 'memory'; preparerMemory(); rendre();
    });
  }

  /* -------------------------------------------------------------- memory */

  function preparerMemory() {
    const m = MANCHES[manche];
    const pool = DONNEES.symboles.filter(function (s) { return m.groupes.indexOf(s.groupe) >= 0; });
    const choisis = APP.piocher(pool, PAR_MANCHE);
    cartes = [];
    choisis.forEach(function (s, k) {
      cartes.push({ paire: k, id: s.id, type: 'sym' });
      cartes.push({ paire: k, id: s.id, type: 'nom' });
    });
    cartes = APP.melanger(cartes);
    retournees = []; trouvees = 0; erreurs = 0;
  }

  function rendreMemory() {
    const m = MANCHES[manche];
    let h = '<h2 style="font-size:24px">Memory — ' + APP.echapper(m.titre) + '</h2>';
    h += APP.jauge(manche, MANCHES.length + 1);
    h += '<p class="intro">Retourne les cartes deux par deux : un symbole et son nom. ' +
         'Chaque erreur te coûte un point sur cette manche.</p>';
    h += '<div id="plateau" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px"></div>';
    h += '<p style="margin-top:12px;font-size:16px;color:var(--texte-2)">Erreurs : <b id="err">0</b></p>';
    hote.innerHTML = h;

    const p = document.getElementById('plateau');
    cartes.forEach(function (c, k) {
      const b = document.createElement('button');
      b.className = 'vignette';
      b.type = 'button';
      b.dataset.k = k;
      b.style.minHeight = '128px';
      b.innerHTML = '<span style="font-size:30px;color:var(--marine-clair)">❄</span>';
      b.addEventListener('click', function () { cliquer(k, b); });
      p.appendChild(b);
    });
  }

  function faceCarte(c) {
    return c.type === 'sym'
      ? APP.symbole(c.id, 'petit')
      : '<span class="nom">' + APP.echapper(APP.SYM[c.id].nom) + '</span>';
  }

  function cliquer(k, b) {
    const c = cartes[k];
    if (c.ok || retournees.length === 2) return;
    if (retournees.some(function (r) { return r.k === k; })) return;

    b.innerHTML = faceCarte(c);
    b.classList.add('choisi');
    retournees.push({ k: k, b: b });

    if (retournees.length < 2) return;

    const a = cartes[retournees[0].k], z = cartes[retournees[1].k];
    if (a.paire === z.paire && a.type !== z.type) {
      retournees.forEach(function (r) {
        r.b.classList.remove('choisi');
        r.b.classList.add('juste');
        r.b.disabled = true;
        cartes[r.k].ok = true;
      });
      retournees = [];
      trouvees++;
      if (trouvees === PAR_MANCHE) finManche();
    } else {
      erreurs++;
      document.getElementById('err').textContent = erreurs;
      retournees.forEach(function (r) { r.b.classList.add('faux'); });
      const aRemettre = retournees;
      retournees = [];
      // On bloque le plateau le temps de l'aller-retour.
      const tous = hote.querySelectorAll('#plateau button:not(:disabled)');
      tous.forEach(function (x) { x.style.pointerEvents = 'none'; });
      setTimeout(function () {
        aRemettre.forEach(function (r) {
          r.b.classList.remove('choisi', 'faux');
          r.b.innerHTML = '<span style="font-size:30px;color:var(--marine-clair)">❄</span>';
        });
        tous.forEach(function (x) { x.style.pointerEvents = ''; });
      }, 950);
    }
  }

  function finManche() {
    const pts = Math.max(0, PAR_MANCHE - erreurs);
    scoreMemory += pts;
    setTimeout(function () { phase = 'transition'; rendre(); }, 500);
    hote.dataset.pts = pts;
  }

  function transition() {
    const pts = hote.dataset.pts;
    const derniere = (manche === MANCHES.length - 1);
    let h = '<h2 style="font-size:24px">Manche réussie</h2>';
    h += '<div class="carte"><p style="font-size:20px"><b>' + pts + ' / ' + PAR_MANCHE + '</b> ' +
         'sur « ' + APP.echapper(MANCHES[manche].titre) +' » — ' + erreurs + ' erreur(s).</p>';
    if (erreurs >= 4) {
      h += '<p style="margin-top:8px;color:var(--texte-2)">Beaucoup d\'erreurs sur cette famille. ' +
           'Ouvre la bibliothèque et regarde-la calmement avant de continuer : deux minutes maintenant, ' +
           'dix de gagnées plus tard.</p>';
    }
    h += '</div>';
    h += '<div class="barre-actions">' +
         '<button class="b" id="go">' + (derniere ? 'Passer au tri rapide →' : 'Manche suivante →') + '</button>' +
         '<button class="b secondaire" data-aller="biblio">Voir la bibliothèque</button></div>';
    hote.innerHTML = h;
    document.getElementById('go').addEventListener('click', function () {
      if (derniere) { phase = 'tri'; preparerTri(); }
      else { manche++; phase = 'memory'; preparerMemory(); }
      rendre();
    });
  }

  /* ---------------------------------------------------------- tri rapide */

  function preparerTri() {
    triListe = APP.piocher(DONNEES.symboles, NB_TRI);
    triIndex = 0;
  }

  function rendreTri() {
    if (triIndex >= triListe.length) { phase = 'fin'; return rendre(); }
    const s = triListe[triIndex];
    let h = '<h2 style="font-size:24px">Tri rapide</h2>';
    h += APP.jauge(triIndex, NB_TRI);
    h += '<div class="question"><p class="consigne">Dans quelle famille ranges-tu ce symbole ?</p>';
    h += '<div style="display:flex;justify-content:center;margin-bottom:8px">' + APP.symbole(s.id, 'grand') + '</div>';
    h += '<p style="text-align:center;font-size:19px;font-weight:700;margin-bottom:16px">' +
         APP.echapper(s.nom) + '</p>';
    h += '<div class="choix deux" id="choix"></div><div id="retour"></div></div>';
    hote.innerHTML = h;

    const zone = document.getElementById('choix');
    DONNEES.groupes.forEach(function (g) {
      const b = document.createElement('button');
      b.className = 'reponse';
      b.type = 'button';
      b.style.borderLeft = '7px solid ' + g.couleur;
      b.textContent = g.nom;
      b.addEventListener('click', function () {
        const juste = (g.cle === s.groupe);
        zone.querySelectorAll('button').forEach(function (x) {
          x.disabled = true;
          if (x.textContent === APP.groupeDe(s.groupe).nom) x.classList.add('juste');
        });
        if (!juste) { b.classList.add('faux'); triRates.push(s); }
        else scoreTri++;
        const r = document.getElementById('retour');
        r.className = 'retour-info ' + (juste ? 'ok' : 'ko');
        r.innerHTML = '<strong>' + (juste ? 'Rangé.' : 'Non — famille : ' +
                      APP.echapper(APP.groupeDe(s.groupe).nom) + '.') + '</strong>' +
                      APP.echapper(s.indice) +
                      '<div>' + APP.boutonFiche(s.id) + '</div>';
        const d = document.createElement('div');
        d.className = 'barre-actions';
        d.innerHTML = '<button class="b" id="suite">Suivant →</button>';
        hote.querySelector('.question').appendChild(d);
        document.getElementById('suite').addEventListener('click', function () {
          triIndex++; rendre();
        });
      });
      zone.appendChild(b);
    });
  }

  /* ------------------------------------------------------------- clôture */

  function fin() {
    const total = MANCHES.length * PAR_MANCHE + NB_TRI;
    const score = scoreMemory + scoreTri;
    APP.marquer('familles', score, total);
    const lignes = [];
    if (triRates.length) {
      const noms = triRates.map(function (s) {
        return APP.echapper(s.nom) + ' <span style="color:var(--texte-2)">(' +
               APP.echapper(APP.groupeDe(s.groupe).nom) + ')</span>';
      });
      lignes.push('Symboles mal rangés : ' + noms.join(' · '));
    }
    lignes.push('Memory : ' + scoreMemory + ' / ' + (MANCHES.length * PAR_MANCHE) +
                ' — Tri : ' + scoreTri + ' / ' + NB_TRI);
    hote.innerHTML = APP.bilan('Atelier 2 terminé', score, total, lignes,
      '<button class="b" data-aller="pieges">Atelier 3 →</button>' +
      '<button class="b secondaire" data-aller="familles">Refaire l\'atelier</button>');
  }

  APP.enregistrer('familles', 'ec-familles', demarrer);

})();
