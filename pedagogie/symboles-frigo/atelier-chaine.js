/* Module 2 — moteur commun aux chaînes d'organes et aux séquences de commande.

   Même mécanique dans les deux cas : l'élève construit l'ordre pas à pas.
   À chaque étape il choisit l'élément suivant parmi ceux qui restent, et il
   obtient tout de suite la justification de la position. Construire une fois
   dans le bon ordre en comprenant pourquoi vaut mieux que réordonner dix fois
   au hasard. */

(function () {

  function moteur(config) {
    // config : { source(), estSequence, ecranId, titreAtelier }
    let hote, phase, restants, poses, index, score, rates, qIndex, scoreQ, sujet;

    function items() {
      return config.estSequence ? sujet.etapes : sujet.elements;
    }

    function libelle(it) {
      return config.estSequence ? it.t : it.nom;
    }

    function demarrer(el) {
      hote = el;
      sujet = config.source();
      phase = 'accueil';
      restants = APP.melanger(items().map(function (it, k) { return { it: it, k: k }; }));
      poses = []; index = 0; score = 0; rates = [];
      qIndex = 0; scoreQ = 0;
      rendre();
    }

    function rendre() {
      if (phase === 'accueil') return accueil();
      if (phase === 'construction') return construire();
      if (phase === 'lecons') return lecons();
      if (phase === 'qcm') return qcm();
      if (phase === 'fin') return fin();
    }

    /* ----------------------------------------------------------- accueil */

    function accueil() {
      let h = '<h2 style="font-size:24px">' + APP.echapper(sujet.titre) + '</h2>';
      h += '<p style="font-size:17px;color:var(--texte-2);margin-bottom:14px">' +
           APP.echapper(sujet.sous) + '</p>';
      h += '<div class="carte"><p>' + APP.echapper(sujet.intro) + '</p></div>';
      if (sujet.organes) {
        h += '<div class="note"><strong>Ce qu\'il faut sur l\'installation :</strong> ' +
             APP.echapper(sujet.organes) + '</div>';
      }
      if (!config.estSequence) {
        h += '<div class="carte" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
             '<div style="text-align:center">' + APP.symbole(sujet.depart.id) +
             '<div style="font-weight:700;font-size:15px">' + APP.echapper(sujet.depart.nom) + '</div></div>' +
             '<div style="font-size:26px;color:var(--orange)">→ … ' + items().length + ' organes … →</div>' +
             '<div style="text-align:center">' + APP.symbole(sujet.arrivee.id) +
             '<div style="font-weight:700;font-size:15px">' + APP.echapper(sujet.arrivee.nom) + '</div></div></div>';
      }
      h += '<div class="barre-actions"><button class="b" id="go">' +
           (config.estSequence ? 'Dérouler la séquence →' : 'Monter la ligne →') + '</button>' +
           '<button class="b secondaire" data-aller="hub">Retour au parcours</button></div>';
      hote.innerHTML = h;
      document.getElementById('go').addEventListener('click', function () {
        phase = 'construction'; rendre();
      });
    }

    /* ------------------------------------------------------ construction */

    function fil() {
      let h = '<div class="carte" style="padding:12px 14px"><h3 style="font-size:17px">' +
              (config.estSequence ? 'La séquence, jusqu\'ici' : 'La ligne, jusqu\'ici') + '</h3>';
      if (!config.estSequence) {
        h += '<div class="fil">' + vignetteFil(sujet.depart, 'depart');
        poses.forEach(function (p) { h += vignetteFil(p.it, p.juste ? 'ok' : 'ko'); });
        // Les emplacements encore vides restent visibles : l'élève voit
        // combien d'organes il lui reste à placer.
        for (let n = 0; n < restants.length; n++) {
          h += '<div class="maillon vide">?</div>';
        }
        h += vignetteFil(sujet.arrivee, 'depart') + '</div>';
      } else {
        h += '<ol class="etapes">';
        poses.forEach(function (p) {
          h += '<li class="' + (p.juste ? 'ok' : 'ko') + '">' + APP.echapper(p.it.t) + '</li>';
        });
        if (!poses.length) h += '<li class="vide">Quelle est la première étape ?</li>';
        h += '</ol>';
      }
      return h + '</div>';
    }

    function vignetteFil(it, cls) {
      return '<div class="maillon ' + cls + '">' + APP.symbole(it.id, 'petit') +
             '<span>' + APP.echapper(it.nom) + '</span></div>';
    }

    function construire() {
      if (!restants.length) { phase = 'lecons'; return rendre(); }

      let h = '<h2 style="font-size:24px">' + APP.echapper(sujet.titre) + '</h2>';
      h += APP.jauge(poses.length, items().length);
      h += fil();
      h += '<div class="question"><p class="consigne">' +
           (config.estSequence
             ? (poses.length ? 'Et ensuite, que se passe-t-il ?' : 'Par quoi commence la séquence ?')
             : (poses.length ? 'Quel organe vient ensuite ?' : 'Quel est le premier organe après le condenseur ?')) +
           '</p><div class="choix" id="choix"></div><div id="retour"></div></div>';
      hote.innerHTML = h;

      const zone = document.getElementById('choix');
      restants.forEach(function (r) {
        const b = document.createElement('button');
        b.className = config.estSequence ? 'reponse' : 'vignette';
        b.type = 'button';
        if (config.estSequence) {
          b.textContent = r.it.t;
        } else {
          b.style.flexDirection = 'row';
          b.style.gap = '12px';
          b.style.justifyContent = 'flex-start';
          b.innerHTML = APP.symbole(r.it.id, 'petit') +
                        '<span class="nom" style="text-align:left">' + APP.echapper(r.it.nom) + '</span>';
        }
        b.addEventListener('click', function () { choisir(r, zone, b); });
        zone.appendChild(b);
      });
    }

    function choisir(r, zone, bouton) {
      const attendu = index;
      const juste = (r.k === attendu);
      const bon = items()[attendu];

      zone.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
      bouton.classList.add(juste ? 'juste' : 'faux');

      if (juste) { score++; }
      else {
        rates.push(bon);
        zone.querySelectorAll('button').forEach(function (x) {
          if (x.textContent.indexOf(libelle(bon)) >= 0) x.classList.add('juste');
        });
      }

      // Dans tous les cas on avance avec le bon élément : la chaîne construite
      // doit rester juste, sinon la suite n'a plus de sens.
      poses.push({ it: bon, juste: juste });
      restants = restants.filter(function (x) { return x.k !== attendu; });
      index++;

      const retour = document.getElementById('retour');
      retour.className = 'retour-info ' + (juste ? 'ok' : 'ko');
      retour.innerHTML = '<strong>' +
        (juste ? 'Exact.' : 'Non — c\'était : ' + APP.echapper(libelle(bon)) + '.') + '</strong>' +
        APP.echapper(bon.pourquoi || bon.t);
      if (bon.indice) {
        retour.innerHTML += '<div style="margin-top:8px;font-size:16px;opacity:.85">' +
                            APP.echapper(bon.indice) + '</div>';
      }

      const d = document.createElement('div');
      d.className = 'barre-actions';
      d.innerHTML = '<button class="b" id="suite">' +
                    (restants.length ? 'Suivant →' : 'Voir les règles du métier →') + '</button>';
      hote.querySelector('.question').appendChild(d);
      document.getElementById('suite').addEventListener('click', function () { rendre(); });
    }

    /* ---------------------------------------------------------- les leçons */

    function lecons() {
      const blocs = config.estSequence ? sujet.pieges : sujet.regles;
      let h = '<h2 style="font-size:24px">' +
              (config.estSequence ? 'Ce qui fait rater une séquence' : 'Les règles du métier') + '</h2>';
      h += fil();
      blocs.forEach(function (b) {
        h += '<div class="regle"><h3>' + APP.echapper(b.titre) + '</h3><p>' +
             APP.echapper(b.texte) + '</p></div>';
      });
      h += '<div class="barre-actions"><button class="b" id="go">Passer aux questions →</button></div>';
      hote.innerHTML = h;
      document.getElementById('go').addEventListener('click', function () { phase = 'qcm'; rendre(); });
    }

    /* ------------------------------------------------------------- le QCM */

    function qcm() {
      if (qIndex >= sujet.qcm.length) { phase = 'fin'; return rendre(); }
      const q = sujet.qcm[qIndex];
      let h = '<h2 style="font-size:24px">Sur le terrain</h2>';
      h += APP.jauge(qIndex, sujet.qcm.length);
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

    /* ------------------------------------------------------------ clôture */

    function fin() {
      const total = items().length + sujet.qcm.length;
      const pts = score + scoreQ;
      APP.marquer(sujet.id, pts, total);
      const lignes = [];
      if (rates.length) {
        lignes.push('Positions trouvées seulement après coup : ' +
                    rates.map(function (r) { return APP.echapper(libelle(r)); }).join(' · '));
      }
      lignes.push((config.estSequence ? 'Séquence' : 'Ordre de montage') + ' : ' +
                  score + ' / ' + items().length + ' — Questions : ' + scoreQ + ' / ' + sujet.qcm.length);
      let h = APP.bilan(APP.echapper(sujet.titre) + ' — terminé', pts, total, lignes,
        '<button class="b secondaire" data-aller="' + sujet.id + '">Refaire</button>');
      h += '<div class="carte"><h3>' +
           (config.estSequence ? 'La séquence, en entier' : 'La ligne, en entier') + '</h3>' +
           fil().replace('<div class="carte" style="padding:12px 14px">', '').replace(/<\/div>$/, '') + '</div>';
      hote.innerHTML = h;
    }

    return demarrer;
  }

  /* -------------------------------------------------------- enregistrement */

  CIRCUITS.chaines.forEach(function (c) {
    APP.enregistrer(c.id, 'ec-chaine', moteur({
      estSequence: false,
      source: function () { return c; }
    }));
  });

  CIRCUITS.sequences.forEach(function (s) {
    APP.enregistrer(s.id, 'ec-sequence', moteur({
      estSequence: true,
      source: function () { return s; }
    }));
  });

})();
