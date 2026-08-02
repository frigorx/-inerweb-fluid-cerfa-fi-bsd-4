/* Atelier 3 — Les douze duels.
   Douze paires de symboles quasi identiques. D'abord le duel commenté,
   ensuite une salve rapide où les deux membres de chaque paire reviennent
   mélangés, sans commentaire. */

(function () {

  const PIEGES = DONNEES.pieges;
  let hote, phase, i, score, salve, sIndex, rates;

  function demarrer(el) {
    hote = el;
    phase = 'accueil'; i = 0; score = 0; rates = [];
    rendre();
  }

  function rendre() {
    if (phase === 'accueil') return accueil();
    if (phase === 'duel') return duel();
    if (phase === 'salve') return rendreSalve();
    if (phase === 'fin') return fin();
  }

  function accueil() {
    let h = '<h2 style="font-size:24px">Atelier 3 — Les douze duels</h2>';
    h += '<p class="intro">Douze paires de symboles qui se ressemblent à s\'y méprendre. ' +
         'Dans une évaluation, c\'est exactement là que se perdent les points. ' +
         'Pour chaque duel, cherche <strong>le détail qui change</strong> — il y en a toujours un, ' +
         'et il est toujours minuscule.</p>';
    h += '<div class="note">Ne devine pas. Regarde le dessin, puis dis-toi à voix basse ce qui diffère. ' +
         'Si tu ne vois rien, c\'est que la différence n\'est pas dans le dessin : elle est dans la ' +
         '<strong>position</strong> de l\'organe sur le circuit.</div>';
    h += '<div class="barre-actions"><button class="b" id="go">Premier duel →</button></div>';
    hote.innerHTML = h;
    document.getElementById('go').addEventListener('click', function () { phase = 'duel'; rendre(); });
  }

  /* --------------------------------------------------------------- duels */

  function duel() {
    if (i >= PIEGES.length) { phase = 'salve'; preparerSalve(); return rendre(); }
    const p = PIEGES[i];
    const a = APP.SYM[p.paire[0]], b = APP.SYM[p.paire[1]];
    const cible = Math.random() < 0.5 ? a : b;

    let h = '<h2 style="font-size:24px">Duel ' + (i + 1) + ' / ' + PIEGES.length +
            ' — ' + APP.echapper(p.titre) + '</h2>';
    h += APP.jauge(i, PIEGES.length);
    h += '<div class="question"><p class="consigne">Lequel des deux est le symbole de : ' +
         '<span style="color:var(--orange)">' + APP.echapper(cible.nom) + '</span> ?</p>';
    h += '<div class="duel" id="duel"></div><div id="retour"></div></div>';
    hote.innerHTML = h;

    const zone = document.getElementById('duel');
    APP.melanger([a, b]).forEach(function (s) {
      const btn = document.createElement('button');
      btn.className = 'vignette';
      btn.type = 'button';
      btn.style.padding = '18px';
      btn.innerHTML = APP.symbole(s.id, 'grand');
      btn.addEventListener('click', function () {
        const juste = (s.id === cible.id);
        if (juste) score++; else rates.push(p);
        zone.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
        btn.classList.add(juste ? 'juste' : 'faux');
        montrerDifference(p, a, b, juste);
      });
      zone.appendChild(btn);
    });
  }

  function montrerDifference(p, a, b, juste) {
    const r = document.getElementById('retour');
    r.className = 'retour-info ' + (juste ? 'ok' : 'ko');
    r.innerHTML = '<strong>' + (juste ? 'Bien vu.' : 'Raté — et c\'est normal, c\'est le but.') + '</strong>' +
                  APP.echapper(p.texte) +
                  '<div>' + APP.boutonFiche(a.id, "C'est quoi, " + a.nom + " ?") + ' ' +
                  APP.boutonFiche(b.id, "C'est quoi, " + b.nom + " ?") + '</div>';

    const d = document.createElement('div');
    d.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">' +
      ['a', 'b'].map(function (k, n) {
        const s = n === 0 ? a : b;
        return '<div class="carte" style="margin:0;text-align:center">' +
               APP.symbole(s.id) +
               '<div style="font-weight:700;margin:6px 0">' + APP.echapper(s.nom) + '</div>' +
               '<div style="font-size:16px;color:var(--texte-2);text-align:left">' +
               APP.echapper(s.indice) + '</div></div>';
      }).join('') + '</div>' +
      '<div class="barre-actions"><button class="b" id="suite">' +
      (i === PIEGES.length - 1 ? 'Passer à la salve rapide →' : 'Duel suivant →') + '</button></div>';
    hote.querySelector('.question').appendChild(d);
    document.getElementById('suite').addEventListener('click', function () { i++; rendre(); });
  }

  /* --------------------------------------------------------------- salve */

  function preparerSalve() {
    // Un tirage par piège, sur l'un ou l'autre des deux symboles.
    salve = APP.melanger(PIEGES.map(function (p) {
      const idx = Math.random() < 0.5 ? 0 : 1;
      return { piege: p, bon: p.paire[idx], autre: p.paire[1 - idx] };
    }));
    sIndex = 0;
  }

  function rendreSalve() {
    if (sIndex >= salve.length) { phase = 'fin'; return rendre(); }
    const q = salve[sIndex];
    const bon = APP.SYM[q.bon], autre = APP.SYM[q.autre];

    let h = '<h2 style="font-size:24px">Salve rapide</h2>';
    h += APP.jauge(sIndex, salve.length);
    h += '<div class="question"><p class="consigne">Qu\'est-ce que c\'est ?</p>';
    h += '<div style="display:flex;justify-content:center;margin-bottom:16px">' +
         APP.symbole(bon.id, 'grand') + '</div>';
    h += '<div class="choix" id="choix"></div><div id="retour"></div></div>';
    hote.innerHTML = h;

    const zone = document.getElementById('choix');
    APP.melanger([bon, autre]).forEach(function (s) {
      const btn = document.createElement('button');
      btn.className = 'reponse';
      btn.type = 'button';
      btn.textContent = s.nom;
      btn.addEventListener('click', function () {
        const juste = (s.id === bon.id);
        if (juste) score++; else rates.push(q.piege);
        zone.querySelectorAll('button').forEach(function (x) {
          x.disabled = true;
          if (x.textContent === bon.nom) x.classList.add('juste');
        });
        if (!juste) btn.classList.add('faux');
        const r = document.getElementById('retour');
        r.className = 'retour-info ' + (juste ? 'ok' : 'ko');
        r.innerHTML = '<strong>' + (juste ? 'Exact.' : 'C\'était : ' + APP.echapper(bon.nom) + '.') +
                      '</strong>' + APP.echapper(bon.indice) +
                      '<div>' + APP.boutonFiche(bon.id) + '</div>';
        const d = document.createElement('div');
        d.className = 'barre-actions';
        d.innerHTML = '<button class="b" id="suite">Suivant →</button>';
        hote.querySelector('.question').appendChild(d);
        document.getElementById('suite').addEventListener('click', function () { sIndex++; rendre(); });
      });
      zone.appendChild(btn);
    });
  }

  /* ------------------------------------------------------------- clôture */

  function fin() {
    const total = PIEGES.length * 2;
    APP.marquer('pieges', score, total);
    const compte = {};
    rates.forEach(function (p) { compte[p.cle] = (compte[p.cle] || 0) + 1; });
    const lignes = Object.keys(compte).map(function (c) {
      const p = PIEGES.filter(function (x) { return x.cle === c; })[0];
      return '<strong>' + APP.echapper(p.titre) + '</strong> — ' + APP.echapper(p.texte);
    });
    if (!lignes.length) lignes.push('Aucun piège ne t\'a eu. Garde ce niveau jusqu\'à l\'interrogation.');
    hote.innerHTML = APP.bilan('Atelier 3 terminé', score, total, lignes,
      '<button class="b" data-aller="circuit">Atelier 4 →</button>' +
      '<button class="b secondaire" data-aller="pieges">Refaire les duels</button>');
  }

  APP.enregistrer('pieges', 'ec-pieges', demarrer);

})();
