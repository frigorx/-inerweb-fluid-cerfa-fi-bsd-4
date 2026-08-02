/* Module 2 — Les régulateurs de pression KVP · KVR · KVL · KVC.

   Quatre phases : découvrir la question qui les classe, trier amont/aval,
   dire où on les monte, puis les reconnaître sur des pannes réelles. */

(function () {

  const R = CIRCUITS.regulateurs;
  let hote, phase, i, score, scenIndex, triRestants, triJuste;

  function demarrer(el) {
    hote = el;
    phase = 'accueil'; i = 0; score = 0; scenIndex = 0;
    triRestants = APP.melanger(R.liste.slice());
    triJuste = 0;
    rendre();
  }

  function rendre() {
    if (phase === 'accueil') return accueil();
    if (phase === 'decouverte') return decouverte();
    if (phase === 'tri') return tri();
    if (phase === 'montage') return montage();
    if (phase === 'scenarios') return scenarios();
    if (phase === 'fin') return fin();
  }

  /* ------------------------------------------------------------- accueil */

  function accueil() {
    let h = '<h2 style="font-size:24px">' + APP.echapper(R.titre) + '</h2>';
    h += '<p style="font-size:17px;color:var(--texte-2);margin-bottom:14px">' +
         APP.echapper(R.sous) + '</p>';
    h += '<div class="carte"><p>' + APP.echapper(R.intro) + '</p></div>';
    h += '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:16px 0">';
    R.liste.forEach(function (r) {
      h += '<div class="vignette" style="cursor:default;width:150px">' + APP.symbole(r.id) +
           '<span class="nom">' + r.sigle + '</span></div>';
    });
    h += '</div>';
    h += '<div class="note">Regarde bien les quatre symboles. Le trait pointillé ne part pas du même côté ' +
         'sur tous les quatre. Ce détail est toute la réponse — tu vas le découvrir maintenant.</div>';
    h += '<div class="barre-actions"><button class="b" id="go">Trouver la règle →</button>' +
         '<button class="b secondaire" data-aller="hub">Retour au parcours</button></div>';
    hote.innerHTML = h;
    document.getElementById('go').addEventListener('click', function () { phase = 'decouverte'; rendre(); });
  }

  /* ---------------------------------------------------------- découverte */

  function decouverte() {
    let h = '<h2 style="font-size:24px">La règle</h2>';
    h += '<div class="question"><p class="consigne">Sur ces deux régulateurs, le trait pointillé ' +
         'ne part pas du même côté. Qu\'est-ce que cela change ?</p>';
    h += '<div class="duel">';
    [['regulateur_kvp', 'KVP'], ['regulateur_kvc', 'KVC']].forEach(function (p) {
      h += '<div style="text-align:center">' + APP.symbole(p[0], 'grand') +
           '<div style="font-weight:700">' + p[1] + '</div></div>';
    });
    h += '</div><div class="choix" id="choix" style="margin-top:14px"></div><div id="retour"></div></div>';
    hote.innerHTML = h;

    const propositions = [
      "Le côté du pointillé dit quelle pression le régulateur surveille : celle de son entrée ou celle de sa sortie.",
      "Le côté du pointillé indique le sens de circulation du fluide.",
      "C'est une convention de dessin, sans signification particulière."
    ];
    const zone = document.getElementById('choix');
    APP.melanger(propositions.map(function (t, k) { return { t: t, k: k }; })).forEach(function (o) {
      const b = document.createElement('button');
      b.className = 'reponse';
      b.type = 'button';
      b.textContent = o.t;
      b.addEventListener('click', function () {
        const juste = (o.k === 0);
        if (juste) score++;
        zone.querySelectorAll('button').forEach(function (x) {
          x.disabled = true;
          if (x.textContent === propositions[0]) x.classList.add('juste');
        });
        if (!juste) b.classList.add('faux');
        const r = document.getElementById('retour');
        r.className = 'retour-info ' + (juste ? 'ok' : 'ko');
        r.innerHTML = '<strong>' + (juste ? 'C\'est exactement ça.' : 'Non — regarde encore.') +
                      '</strong>' + APP.echapper(R.cle.texte);
        const d = document.createElement('div');
        d.innerHTML = '<div class="regle" style="margin-top:14px">' +
          '<span class="cle">La clé</span><h3>' + APP.echapper(R.cle.titre) + '</h3>' +
          '<p>' + APP.echapper(R.cle.texte) + '</p>' +
          '<p style="margin-top:10px;font-weight:700;color:var(--orange)">' +
          APP.echapper(R.mnemo) + '</p></div>' +
          '<div class="barre-actions"><button class="b" id="suite">Mettre la règle à l\'épreuve →</button></div>';
        hote.querySelector('.question').appendChild(d);
        document.getElementById('suite').addEventListener('click', function () {
          phase = 'tri'; rendre();
        });
      });
      zone.appendChild(b);
    });
  }

  /* ----------------------------------------------------------------- tri */

  function tri() {
    if (!triRestants.length) { phase = 'montage'; return rendre(); }
    const r = triRestants[0];

    let h = '<h2 style="font-size:24px">Amont ou aval ?</h2>';
    h += APP.jauge(R.liste.length - triRestants.length, R.liste.length);
    h += '<div class="regle"><span class="cle">Rappel</span><p>' + APP.echapper(R.mnemo) + '</p></div>';
    h += '<div class="question"><p class="consigne">' + r.sigle + ' — ' + APP.echapper(r.nom) +
         '<br><span style="font-weight:400;font-size:17px">Quelle pression surveille-t-il ?</span></p>';
    h += '<div style="display:flex;justify-content:center;margin-bottom:14px">' +
         APP.symbole(r.id, 'grand') + '</div>';
    h += '<div class="choix deux" id="choix"></div><div id="retour"></div></div>';
    hote.innerHTML = h;

    const zone = document.getElementById('choix');
    [['amont', "Sa pression d'ENTRÉE — il protège ce qui est avant lui"],
     ['aval', 'Sa pression de SORTIE — il protège ce qui est après lui']].forEach(function (o) {
      const b = document.createElement('button');
      b.className = 'reponse';
      b.type = 'button';
      b.textContent = o[1];
      b.addEventListener('click', function () {
        const juste = (o[0] === r.surveille);
        if (juste) { score++; triJuste++; }
        zone.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
        b.classList.add(juste ? 'juste' : 'faux');
        const rr = document.getElementById('retour');
        rr.className = 'retour-info ' + (juste ? 'ok' : 'ko');
        rr.innerHTML = '<strong>' + (juste ? 'Exact.' : 'Non : il surveille sa pression ' +
                       (r.surveille === 'amont' ? "d'entrée" : 'de sortie') + '.') + '</strong>' +
                       'Monté ' + APP.echapper(r.monte.toLowerCase()) + '. ' +
                       APP.echapper(r.role) + '. Il protège : ' + APP.echapper(r.protege) + '.';
        const d = document.createElement('div');
        d.className = 'barre-actions';
        d.innerHTML = '<button class="b" id="suite">Suivant →</button>';
        hote.querySelector('.question').appendChild(d);
        document.getElementById('suite').addEventListener('click', function () {
          triRestants.shift(); rendre();
        });
      });
      zone.appendChild(b);
    });
  }

  /* ------------------------------------------------------------- montage */

  function montage() {
    if (i >= R.liste.length) { phase = 'scenarios'; i = 0; return rendre(); }
    const r = R.liste[i];
    const faux = R.liste.filter(function (x) { return x.id !== r.id; });

    let h = '<h2 style="font-size:24px">Où le montes-tu ?</h2>';
    h += APP.jauge(i, R.liste.length);
    h += '<div class="question"><p class="consigne">' + r.sigle + ' — ' + APP.echapper(r.nom) +
         '<br><span style="font-weight:400;font-size:17px">À quel endroit du circuit se monte-t-il ?</span></p>';
    h += '<div style="display:flex;justify-content:center;margin-bottom:14px">' +
         APP.symbole(r.id, 'grand') + '</div>';
    h += '<div class="choix" id="choix"></div><div id="retour"></div></div>';
    hote.innerHTML = h;

    const zone = document.getElementById('choix');
    APP.melanger([r].concat(faux)).forEach(function (x) {
      const b = document.createElement('button');
      b.className = 'reponse';
      b.type = 'button';
      b.textContent = x.monte;
      b.addEventListener('click', function () {
        const juste = (x.id === r.id);
        if (juste) score++;
        zone.querySelectorAll('button').forEach(function (y) {
          y.disabled = true;
          if (y.textContent === r.monte) y.classList.add('juste');
        });
        if (!juste) b.classList.add('faux');
        const rr = document.getElementById('retour');
        rr.className = 'retour-info ' + (juste ? 'ok' : 'ko');
        rr.innerHTML = '<strong>' + (juste ? 'Exact.' : 'Non — ' + APP.echapper(r.monte) + '.') +
                       '</strong>' + APP.echapper(r.quand);
        if (r.coequipier) {
          rr.innerHTML += '<div style="margin-top:8px;display:flex;gap:12px;align-items:flex-start">' +
                          APP.symbole('nrd', 'petit') + '<span>' + APP.echapper(r.coequipier) + '</span></div>';
        }
        const d = document.createElement('div');
        d.className = 'barre-actions';
        d.innerHTML = '<button class="b" id="suite">Suivant →</button>';
        hote.querySelector('.question').appendChild(d);
        document.getElementById('suite').addEventListener('click', function () { i++; rendre(); });
      });
      zone.appendChild(b);
    });
  }

  /* ----------------------------------------------------------- scénarios */

  function scenarios() {
    if (scenIndex >= R.liste.length) { phase = 'fin'; return rendre(); }
    const s = R.liste[scenIndex].scenario;

    let h = '<h2 style="font-size:24px">Sur le terrain</h2>';
    h += APP.jauge(scenIndex, R.liste.length);
    h += '<div class="question"><p class="consigne">' + APP.echapper(s.q) + '</p>' +
         '<div class="choix" id="choix"></div><div id="retour"></div></div>';
    hote.innerHTML = h;

    const zone = document.getElementById('choix');
    APP.melanger(s.c.map(function (t, k) { return { t: t, k: k }; })).forEach(function (o) {
      const b = document.createElement('button');
      b.className = 'reponse';
      b.type = 'button';
      b.textContent = o.t;
      b.addEventListener('click', function () {
        const juste = (o.k === s.b);
        if (juste) score++;
        zone.querySelectorAll('button').forEach(function (x) {
          x.disabled = true;
          if (x.textContent === s.c[s.b]) x.classList.add('juste');
        });
        if (!juste) b.classList.add('faux');
        const r = document.getElementById('retour');
        r.className = 'retour-info ' + (juste ? 'ok' : 'ko');
        r.innerHTML = '<strong>' + (juste ? 'Exact.' : 'Non.') + '</strong>' + APP.echapper(s.e);
        const d = document.createElement('div');
        d.className = 'barre-actions';
        d.innerHTML = '<button class="b" id="suite">Suivant →</button>';
        hote.querySelector('.question').appendChild(d);
        document.getElementById('suite').addEventListener('click', function () { scenIndex++; rendre(); });
      });
      zone.appendChild(b);
    });
  }

  /* ------------------------------------------------------------- clôture */

  function fin() {
    const total = 1 + R.liste.length * 3;
    APP.marquer('regulateurs', score, total);

    let h = APP.bilan('Les régulateurs de pression — terminé', score, total, [], '');
    h += '<div class="carte"><h3>Le tableau à retenir</h3>' +
         '<div style="overflow-x:auto"><table class="bilan">' +
         '<tr><th></th><th>Surveille</th><th>Monté</th><th>Protège</th></tr>';
    R.liste.forEach(function (r) {
      h += '<tr><td style="white-space:nowrap"><strong>' + r.sigle + '</strong></td>' +
           '<td><span class="pastille ' + (r.surveille === 'amont' ? 'ok' : 'moyen') + '">' +
           (r.surveille === 'amont' ? "son entrée" : 'sa sortie') + '</span></td>' +
           '<td>' + APP.echapper(r.monte) + '</td>' +
           '<td>' + APP.echapper(r.protege) + '</td></tr>';
    });
    h += '</table></div>' +
         '<p style="margin-top:12px;font-weight:700;color:var(--orange)">' + APP.echapper(R.mnemo) + '</p>' +
         '<p style="margin-top:10px;font-size:16px;color:var(--texte-2)">' + APP.echapper(R.reserve) + '</p>' +
         '</div>';
    h += '<div class="barre-actions"><button class="b secondaire" onclick="window.print()">Imprimer ce tableau</button>' +
         '<button class="b secondaire" data-aller="regulateurs">Refaire</button>' +
         '<button class="b secondaire" data-aller="hub">Retour au parcours</button></div>';
    hote.innerHTML = h;
  }

  APP.enregistrer('regulateurs', 'ec-regulateurs', demarrer);

})();
