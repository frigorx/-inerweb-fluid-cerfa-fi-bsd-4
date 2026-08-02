/* Atelier 5 — L'épreuve blanche.
   Vingt questions tirées au sort, cinq formes différentes, corrigées à la fin
   avec un diagnostic par famille : l'élève sait quoi réviser avant l'interrogation. */

(function () {

  const NB = 20;
  let hote, phase, questions, index, reponses;

  function demarrer(el) {
    hote = el;
    phase = 'accueil';
    questions = null; index = 0; reponses = [];
    rendre();
  }

  function rendre() {
    if (phase === 'accueil') return accueil();
    if (phase === 'test') return poser();
    if (phase === 'fin') return fin();
  }

  function accueil() {
    let h = '<h2 style="font-size:24px">Atelier 5 — L\'épreuve blanche</h2>';
    h += '<p class="intro">Vingt questions, tirées au sort. <strong>Aucune correction pendant l\'épreuve</strong> : ' +
         'comme le jour de l\'interrogation, tu réponds et tu avances. ' +
         'Le corrigé complet arrive à la fin, avec le diagnostic de ce qu\'il te reste à revoir.</p>';
    h += '<div class="note attention">Ferme la bibliothèque et range ta clé de décodage. ' +
         'Le but n\'est pas d\'avoir 20/20 : c\'est de savoir où tu en es.</div>';
    h += '<div class="barre-actions"><button class="b" id="go">Commencer l\'épreuve →</button></div>';
    hote.innerHTML = h;
    document.getElementById('go').addEventListener('click', function () {
      questions = fabriquer();
      phase = 'test'; index = 0; reponses = [];
      rendre();
    });
  }

  /* --------------------------------------------------- fabrique de sujets */

  function autresNoms(s, n) {
    const memeGroupe = DONNEES.symboles.filter(function (x) {
      return x.groupe === s.groupe && x.id !== s.id;
    });
    const reste = DONNEES.symboles.filter(function (x) {
      return x.groupe !== s.groupe && x.id !== s.id;
    });
    // On privilégie les distracteurs de la même famille : c'est là que ça se joue.
    return APP.piocher(memeGroupe, n).concat(APP.piocher(reste, n)).slice(0, n);
  }

  function qNom(s) {
    const faux = autresNoms(s, 3);
    return {
      type: 'nom', sujet: s,
      enonce: "Comment s'appelle ce symbole ?",
      visuel: APP.symbole(s.id, 'grand'),
      choix: APP.melanger([s].concat(faux)).map(function (x) { return { t: x.nom, ok: x.id === s.id }; }),
      corrige: s.nom + " — " + s.indice
    };
  }

  function qSymbole(s) {
    const faux = autresNoms(s, 3);
    return {
      type: 'symbole', sujet: s,
      enonce: "Quel est le symbole de : « " + s.nom + " » ?",
      visuel: '',
      vignettes: APP.melanger([s].concat(faux)).map(function (x) { return { id: x.id, ok: x.id === s.id }; }),
      corrige: s.indice
    };
  }

  function qFonction(s) {
    const faux = autresNoms(s, 3);
    return {
      type: 'fonction', sujet: s,
      enonce: "À quoi sert cet organe ?",
      visuel: APP.symbole(s.id, 'grand'),
      choix: APP.melanger([s].concat(faux)).map(function (x) { return { t: x.fonction, ok: x.id === s.id }; }),
      corrige: s.nom + " — " + s.fonction
    };
  }

  function qPiege(p) {
    const a = APP.SYM[p.paire[0]], b = APP.SYM[p.paire[1]];
    const cible = Math.random() < 0.5 ? a : b;
    return {
      type: 'piege', sujet: cible,
      enonce: "Lequel de ces deux symboles est celui de : « " + cible.nom + " » ?",
      visuel: '',
      vignettes: APP.melanger([a, b]).map(function (x) { return { id: x.id, ok: x.id === cible.id }; }),
      corrige: p.texte
    };
  }

  function qFamille(s) {
    const autres = APP.piocher(DONNEES.groupes.filter(function (g) { return g.cle !== s.groupe; }), 3);
    const bon = APP.groupeDe(s.groupe);
    return {
      type: 'famille', sujet: s,
      enonce: "Dans quelle famille se range ce symbole ?",
      visuel: APP.symbole(s.id, 'grand'),
      choix: APP.melanger([bon].concat(autres)).map(function (g) { return { t: g.nom, ok: g.cle === s.groupe }; }),
      corrige: s.nom + " — famille : " + bon.nom + "."
    };
  }

  function fabriquer() {
    const s = APP.melanger(DONNEES.symboles);
    const p = APP.melanger(DONNEES.pieges);
    const q = [];
    // 6 « nomme le symbole », 4 « trouve le symbole », 4 « à quoi ça sert »,
    // 4 duels, 2 familles.
    for (let k = 0; k < 6; k++) q.push(qNom(s[k]));
    for (let k = 6; k < 10; k++) q.push(qSymbole(s[k]));
    for (let k = 10; k < 14; k++) q.push(qFonction(s[k]));
    for (let k = 0; k < 4; k++) q.push(qPiege(p[k]));
    for (let k = 14; k < 16; k++) q.push(qFamille(s[k]));
    return APP.melanger(q).slice(0, NB);
  }

  /* ----------------------------------------------------------- passation */

  function poser() {
    if (index >= questions.length) { phase = 'fin'; return rendre(); }
    const q = questions[index];
    let h = '<h2 style="font-size:24px">Épreuve blanche</h2>';
    h += APP.jauge(index, questions.length);
    h += '<div class="question"><p class="consigne">Question ' + (index + 1) + ' — ' + APP.echapper(q.enonce) + '</p>';
    if (q.visuel) h += '<div style="display:flex;justify-content:center;margin-bottom:16px">' + q.visuel + '</div>';
    h += (q.vignettes
          ? '<div class="choix deux" id="choix" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))"></div>'
          : '<div class="choix" id="choix"></div>');
    h += '</div>';
    hote.innerHTML = h;

    const zone = document.getElementById('choix');
    if (q.vignettes) {
      q.vignettes.forEach(function (v) {
        const b = document.createElement('button');
        b.className = 'vignette';
        b.type = 'button';
        b.style.padding = '14px';
        b.innerHTML = APP.symbole(v.id);
        b.addEventListener('click', function () { repondre(q, v.ok); });
        zone.appendChild(b);
      });
    } else {
      q.choix.forEach(function (c) {
        const b = document.createElement('button');
        b.className = 'reponse';
        b.type = 'button';
        b.textContent = c.t;
        b.addEventListener('click', function () { repondre(q, c.ok); });
        zone.appendChild(b);
      });
    }
  }

  function repondre(q, ok) {
    reponses.push({ q: q, ok: ok });
    index++;
    rendre();
  }

  /* ------------------------------------------------------------- corrigé */

  function fin() {
    const score = reponses.filter(function (r) { return r.ok; }).length;
    APP.marquer('blanc', score, questions.length);

    // Diagnostic par famille.
    const parGroupe = {};
    reponses.forEach(function (r) {
      const g = r.q.sujet.groupe;
      parGroupe[g] = parGroupe[g] || { bon: 0, tot: 0 };
      parGroupe[g].tot++;
      if (r.ok) parGroupe[g].bon++;
    });

    const faibles = [];
    Object.keys(parGroupe).forEach(function (g) {
      const p = parGroupe[g];
      if (p.bon < p.tot) {
        faibles.push('<strong>' + APP.echapper(APP.groupeDe(g).nom) + '</strong> : ' +
                     p.bon + ' / ' + p.tot);
      }
    });
    if (!faibles.length) faibles.push('Rien à signaler : toutes les familles sont acquises.');

    let h = APP.bilan("Épreuve blanche — corrigé", score, questions.length, faibles,
      '<button class="b" data-aller="maison">Préparer l\'interrogation à la maison</button>');

    h += '<div class="carte"><h3>Le détail, question par question</h3>';
    reponses.forEach(function (r, k) {
      h += '<div style="display:flex;gap:12px;align-items:flex-start;padding:11px 0;' +
           'border-bottom:1px solid var(--bordure)">' +
           '<span class="pastille ' + (r.ok ? 'ok' : 'ko') + '">' + (k + 1) + '</span>' +
           '<div style="flex:1"><div style="font-weight:700">' + APP.echapper(r.q.enonce) + '</div>' +
           '<div style="font-size:16px;color:var(--texte-2)">' + APP.echapper(r.q.corrige) + '</div></div>' +
           APP.symbole(r.q.sujet.id, 'petit') + '</div>';
    });
    h += '</div>';
    h += '<div class="barre-actions"><button class="b secondaire" data-aller="blanc">Refaire une épreuve (nouveau tirage)</button>' +
         '<button class="b secondaire" data-imprimer>Imprimer mon corrigé</button></div>';
    hote.innerHTML = h;
  }

  APP.enregistrer('blanc', 'ec-blanc', demarrer);

})();
