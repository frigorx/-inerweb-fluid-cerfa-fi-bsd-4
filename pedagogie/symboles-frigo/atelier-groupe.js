/* Module 2 — Le groupe de condensation.

   Un seul geste, répété : pour chaque organe, dire s'il est livré sur le
   châssis ou s'il reste à monter sur site. C'est la question qu'on se pose
   réellement en réceptionnant un groupe. */

(function () {

  const G = CIRCUITS.groupe;
  let hote, phase, file, k, score, rates, qIndex, scoreQ;

  function demarrer(el) {
    hote = el;
    phase = 'accueil';
    file = APP.melanger(
      G.dedans.map(function (o) { return { o: o, dedans: true }; })
        .concat(G.dehors.map(function (o) { return { o: o, dedans: false }; })));
    k = 0; score = 0; rates = []; qIndex = 0; scoreQ = 0;
    rendre();
  }

  function rendre() {
    if (phase === 'accueil') return accueil();
    if (phase === 'tri') return tri();
    if (phase === 'recap') return recap();
    if (phase === 'qcm') return qcm();
    if (phase === 'fin') return fin();
  }

  function accueil() {
    let h = '<h2 style="font-size:24px">' + APP.echapper(G.titre) + '</h2>';
    h += '<p style="font-size:17px;color:var(--texte-2);margin-bottom:14px">' + APP.echapper(G.sous) + '</p>';
    h += '<div class="carte"><p>' + APP.echapper(G.intro) + '</p></div>';
    h += '<div class="note"><strong>Le test :</strong> ' + file.length + ' organes vont défiler. ' +
         'Pour chacun, une seule question — <strong>est-il déjà sur le châssis, ou faut-il le monter ' +
         'sur site ?</strong> C\'est exactement ce que tu te demanderas en préparant ta commande.</div>';
    h += '<div class="barre-actions"><button class="b" id="go">Commencer →</button>' +
         '<button class="b secondaire" data-aller="hub">Retour au parcours</button></div>';
    hote.innerHTML = h;
    document.getElementById('go').addEventListener('click', function () { phase = 'tri'; rendre(); });
  }

  function tri() {
    if (k >= file.length) { phase = 'recap'; return rendre(); }
    const e = file[k];

    let h = '<h2 style="font-size:24px">Sur le châssis, ou sur site ?</h2>';
    h += APP.jauge(k, file.length);
    h += '<div class="question"><div style="display:flex;justify-content:center">' +
         APP.symbole(e.o.id, 'grand') + '</div>';
    h += '<p class="consigne" style="text-align:center;margin-top:10px">' + APP.echapper(e.o.nom) + '</p>';
    h += '<div class="choix deux" id="choix"></div><div id="retour"></div></div>';
    hote.innerHTML = h;

    const zone = document.getElementById('choix');
    [[true, 'Livré sur le châssis du groupe'], [false, 'À monter sur site']].forEach(function (o) {
      const b = document.createElement('button');
      b.className = 'reponse';
      b.type = 'button';
      b.textContent = o[1];
      b.addEventListener('click', function () {
        const juste = (o[0] === e.dedans);
        if (juste) score++; else rates.push(e);
        zone.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
        b.classList.add(juste ? 'juste' : 'faux');
        const r = document.getElementById('retour');
        r.className = 'retour-info ' + (juste ? 'ok' : 'ko');
        r.innerHTML = '<strong>' + (juste ? 'Exact.' :
                      (e.dedans ? 'Non — il est sur le châssis.' : 'Non — il se monte sur site.')) +
                      '</strong>' + APP.echapper(e.o.note) +
                      '<div>' + APP.boutonFiche(e.o.id) + '</div>';
        const d = document.createElement('div');
        d.className = 'barre-actions';
        d.innerHTML = '<button class="b" id="suite">Suivant →</button>';
        hote.querySelector('.question').appendChild(d);
        document.getElementById('suite').addEventListener('click', function () { k++; rendre(); });
      });
      zone.appendChild(b);
    });
  }

  function colonne(titre, liste, couleur) {
    let h = '<div class="carte" style="border-left:7px solid ' + couleur + '"><h3>' + titre + '</h3>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:10px">';
    liste.forEach(function (o) {
      h += '<div class="vignette" style="cursor:default">' + APP.symbole(o.id, 'petit') +
           '<span class="nom">' + APP.echapper(o.nom) + '</span></div>';
    });
    return h + '</div></div>';
  }

  function recap() {
    let h = '<h2 style="font-size:24px">Le groupe, en entier</h2>';
    h += colonne('Sur le châssis — ' + G.dedans.length + ' organes', G.dedans, 'var(--vert)');
    h += colonne('À monter sur site — ' + G.dehors.length + ' organes', G.dehors, 'var(--orange)');
    h += '<div class="note"><strong>Le repère à garder :</strong> tout ce qui touche à l\'évaporateur — ' +
         'détendeur, électrovanne, déshydrateur, voyant, thermostat, résistances — est du côté « site ». ' +
         'Tout ce qui touche au compresseur et au condenseur est sur le châssis.</div>';
    h += '<div class="barre-actions"><button class="b" id="go">Passer aux questions →</button></div>';
    hote.innerHTML = h;
    document.getElementById('go').addEventListener('click', function () { phase = 'qcm'; rendre(); });
  }

  function qcm() {
    if (qIndex >= G.qcm.length) { phase = 'fin'; return rendre(); }
    const q = G.qcm[qIndex];
    let h = '<h2 style="font-size:24px">Sur le terrain</h2>';
    h += APP.jauge(qIndex, G.qcm.length);
    h += '<div class="question"><p class="consigne">' + APP.echapper(q.q) + '</p>' +
         '<div class="choix" id="choix"></div><div id="retour"></div></div>';
    hote.innerHTML = h;

    const zone = document.getElementById('choix');
    APP.melanger(q.c.map(function (t, n) { return { t: t, k: n }; })).forEach(function (o) {
      const b = document.createElement('button');
      b.className = 'reponse';
      b.type = 'button';
      b.textContent = o.t;
      b.addEventListener('click', function () {
        const juste = (o.k === q.b);
        if (juste) scoreQ++;
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
        document.getElementById('suite').addEventListener('click', function () { qIndex++; rendre(); });
      });
      zone.appendChild(b);
    });
  }

  function fin() {
    const total = file.length + G.qcm.length;
    const pts = score + scoreQ;
    APP.marquer('groupe', pts, total);
    const lignes = [];
    if (rates.length) {
      lignes.push('Organes mal placés : ' + rates.map(function (e) {
        return APP.echapper(e.o.nom) + ' <span style="color:var(--texte-2)">(' +
               (e.dedans ? 'châssis' : 'site') + ')</span>';
      }).join(' · '));
    }
    hote.innerHTML = APP.bilan('Le groupe de condensation — terminé', pts, total, lignes,
      '<button class="b secondaire" data-aller="groupe">Refaire</button>');
  }

  APP.enregistrer('groupe', 'ec-groupe', demarrer);

})();
