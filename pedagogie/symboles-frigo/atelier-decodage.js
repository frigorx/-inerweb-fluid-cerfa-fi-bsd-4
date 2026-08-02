/* Atelier 1 — Le décodeur.
   L'élève ne reçoit aucune règle : il l'observe, la formule, puis l'applique
   à un symbole qu'il n'a jamais vu. La règle n'est révélée qu'après. */

(function () {

  const ETAPES = [
    {
      cle: 'R1',
      exemples: ['compresseur_piston', 'compresseur_scroll', 'moteur_electrique', 'ventilateur'],
      question: "Voici quatre symboles, avec leur nom. Qu'ont-ils en commun ?",
      choix: [
        "Ils sont tous enfermés dans un cercle — et ce sont tous des machines qui tournent.",
        "Ils servent tous à produire du froid.",
        "Ils sont tous montés sur le circuit d'huile."
      ],
      bonne: 0,
      explique: "Le cercle n'est pas décoratif : c'est la marque des machines tournantes. " +
                "Ce qu'on dessine à l'intérieur ne change pas la fonction, il précise la technologie.",
      appliId: 'compresseur_vis',
      appliQ: "Ce symbole-là, tu ne l'as pas encore vu. Que peux-tu déjà affirmer ?",
      appliChoix: [
        "C'est une machine tournante ; le dessin intérieur dit laquelle.",
        "C'est un filtre monté sur la ligne liquide.",
        "C'est un instrument de mesure."
      ],
      appliBonne: 0,
      appliExplique: "Compresseur à vis. Les deux chevrons sont le filet des rotors — la fonction, elle, " +
                     "reste celle de tous les compresseurs : aspirer en BP, refouler en HP."
    },
    {
      cle: 'R2',
      exemples: ['condenseur_a_air', 'evaporateur_a_air'],
      question: "Un condenseur à air et un évaporateur à air. Observe attentivement : qu'est-ce qui les distingue ?",
      choix: [
        "Rien dans le dessin. Seules les lettres CD et EV changent.",
        "Le condenseur a davantage d'ailettes.",
        "L'hélice n'est pas orientée dans le même sens."
      ],
      bonne: 0,
      explique: "Deux organes aux rôles opposés — l'un rejette la chaleur, l'autre l'absorbe — " +
                "et pourtant un seul et même dessin. C'est le premier vrai piège du chapitre.",
      appliId: 'evaporateur_a_air',
      appliQ: "Sur un schéma où les lettres ont été effacées, comment tranches-tu entre condenseur et évaporateur ?",
      appliChoix: [
        "Par sa place dans le circuit : après le compresseur c'est le condenseur, après le détendeur c'est l'évaporateur.",
        "C'est impossible à savoir sans les lettres.",
        "Le condenseur est toujours dessiné plus grand."
      ],
      appliBonne: 0,
      appliExplique: "Retiens ce réflexe : quand le dessin ne suffit pas, c'est la position dans la boucle qui répond. " +
                     "Tu t'en serviras à l'atelier 4."
    },
    {
      cle: 'R3',
      exemples: ['condenseur_a_eau', 'evaporateur_a_eau', 'condenseur_a_plaque'],
      question: "Dans ces trois échangeurs, que représentent le zigzag et la flèche qui traverse ?",
      choix: [
        "Le zigzag, c'est le fluide frigorigène ; la flèche, c'est l'eau. Ils échangent leur chaleur sans jamais se toucher.",
        "Le zigzag, c'est une résistance chauffante.",
        "La flèche indique le sens de rotation de l'appareil."
      ],
      bonne: 0,
      explique: "Un corps fermé, deux fluides dessinés séparément : le symbole dit « échange sans contact ». " +
                "Cercle = échangeur à eau, rectangle croisé = échangeur à plaques.",
      appliId: 'evaporateur_a_plaque',
      appliQ: "Et celui-ci ? Que t'apprend son dessin ?",
      appliChoix: [
        "Deux fluides échangent leur chaleur à travers des plaques empilées, sans contact.",
        "C'est un filtre à plaques.",
        "C'est un compresseur à plaques."
      ],
      appliBonne: 0,
      appliExplique: "Échangeur à plaques. Comme pour les échangeurs à air : condenseur et évaporateur " +
                     "partagent exactement le même symbole."
    },
    {
      cle: 'R4',
      exemples: ['vanne_isolement', 'electrovanne', 'detendeur_thermostatique', 'soupape_retenue'],
      question: "Le corps est identique dans les quatre cas : deux triangles pointe contre pointe. Qu'est-ce qui change ?",
      choix: [
        "Ce qui est posé au-dessus du corps — et cela dit qui commande la vanne.",
        "La taille des triangles.",
        "Le sens de passage du fluide."
      ],
      bonne: 0,
      explique: "Un volant en H = la main. Une bobine = l'électricité. Un bulbe = la température. " +
                "Un point sur le siège = un tarage. Le corps ne dit que « c'est une vanne » ; " +
                "le chapeau dit tout le reste.",
      appliId: 'detendeur_electrique',
      appliQ: "Cette vanne-là, qui la commande ?",
      appliChoix: [
        "Un régulateur électronique : la bulle marquée TCE est posée dessus.",
        "La main de l'opérateur, avec un volant.",
        "La pression du fluide, et rien d'autre."
      ],
      appliBonne: 0,
      appliExplique: "Détendeur électronique. Même corps de vanne que le détendeur thermostatique, " +
                     "mais commandé par un signal, pas par un bulbe."
    },
    {
      cle: 'R5',
      exemples: ['filtre_huile', 'filtre_deshydrateur'],
      question: "Ces deux filtres ne diffèrent que par un détail. Lequel ?",
      choix: [
        "Les traits de la croix : pleins pour l'un, pointillés pour l'autre.",
        "La largeur du rectangle.",
        "Le nombre de raccords."
      ],
      bonne: 0,
      explique: "Traits pleins : filtre à huile, sur le circuit d'huile. Traits pointillés : filtre déshydrateur, " +
                "sur la ligne liquide. Le pointillé figure le déshydratant.",
      appliId: 'filtre_deshydrateur',
      appliQ: "Sur la ligne liquide, juste après la bouteille, tu vois ce rectangle croisé en pointillés. C'est quoi ?",
      appliChoix: [
        "Un filtre déshydrateur : il retire l'humidité et les impuretés du fluide frigorigène.",
        "Un filtre à huile.",
        "Un voyant de liquide."
      ],
      appliBonne: 0,
      appliExplique: "Bonne lecture. L'humidité dans un circuit frigorifique, c'est du gel au détendeur " +
                     "et de l'acide dans l'huile : le déshydrateur n'est pas un accessoire."
    },
    {
      cle: 'R6',
      exemples: ['bulle_PZH', 'bulle_PSL', 'bulle_TI'],
      question: "Ces bulles portent des lettres. Comment se lisent-elles ?",
      choix: [
        "1re lettre = la grandeur mesurée · lettre suivante = ce que l'appareil fait · L ou H = le seuil (bas ou haut).",
        "Ce sont les initiales du fabricant de l'appareil.",
        "C'est un numéro de repère propre au schéma."
      ],
      bonne: 0,
      explique: "P = pression, T = température. Puis Z = sécurité (il coupe), S ou C = régulation (il commande), " +
                "I = indication (il affiche seulement). Enfin L = Low (bas), H = High (haut). " +
                "Trois lettres, et tu as l'appareil entier.",
      appliId: 'bulle_TZ',
      appliQ: "TZ. Sans avoir jamais lu sa définition : que fait cet appareil ?",
      appliChoix: [
        "Il surveille une température et coupe si elle devient dangereuse.",
        "Il affiche une température sur un cadran.",
        "Il règle une pression d'aspiration."
      ],
      appliBonne: 0,
      appliExplique: "T = température, Z = sécurité. Thermostat de sécurité. " +
                     "Tu viens de lire un symbole sans l'avoir appris : c'est exactement le but de cet atelier."
    },
    {
      cle: 'R7',
      exemples: ['separateur_huile', 'bouteille_anticoup', 'bouteille_liquide', 'reservoir_huile'],
      question: "Deux de ces corps se terminent en pointe vers le bas, deux autres non. Pourquoi cette pointe ?",
      choix: [
        "Parce que quelque chose s'y sépare et tombe au fond : de l'huile, ou du liquide.",
        "Pour que l'appareil tienne debout sur son support.",
        "C'est purement décoratif, sans signification."
      ],
      bonne: 0,
      explique: "Fond pointu : on sépare. Corps lisse : on stocke. Corps cloisonné : on casse les pulsations. " +
                "La forme du contenant raconte ce qui se passe dedans.",
      appliId: 'separateur_huile',
      appliQ: "Juste après le refoulement du compresseur, un corps pointu avec un flotteur dessiné dedans. C'est quoi ?",
      appliChoix: [
        "Un séparateur d'huile : l'huile tombe au fond et le flotteur la renvoie au carter.",
        "Une bouteille anti-coup de liquide.",
        "Un réservoir de liquide."
      ],
      appliBonne: 0,
      appliExplique: "Le flotteur et la position (au refoulement) font la différence. " +
                     "Le même corps, sans flotteur et monté sur l'aspiration, serait une bouteille anti-coup de liquide."
    },
    {
      cle: 'R8',
      exemples: ['regulateur_kvr', 'regulateur_kvc'],
      question: "Sur ces deux régulateurs, un trait est dessiné en pointillés. À quoi sert-il ?",
      choix: [
        "Il ne transporte aucun fluide : il relie l'appareil à l'endroit où il mesure, ou à l'organe qu'il commande.",
        "C'est une conduite de secours, utilisée seulement en cas de panne.",
        "C'est un tuyau souple, par opposition au tuyau rigide."
      ],
      bonne: 0,
      explique: "Trait plein = du fluide. Trait pointillé = de l'information. " +
                "Sur un schéma, suivre les pointillés, c'est lire la régulation ; suivre les traits pleins, " +
                "c'est suivre le fluide frigorigène.",
      appliId: 'bulle_TSHL',
      appliQ: "Un pointillé relie ce thermostat d'ambiance à une électrovanne de ligne liquide. Que se passe-t-il ?",
      appliChoix: [
        "Le thermostat commande l'ouverture et la fermeture de l'électrovanne.",
        "Le fluide frigorigène circule du thermostat vers l'électrovanne.",
        "Les deux appareils sont simplement posés côte à côte, sans lien."
      ],
      appliBonne: 0,
      appliExplique: "C'est la chaîne de régulation : la chambre est à température → le thermostat ouvre le contact " +
                     "→ l'électrovanne se ferme → le circuit se vide (pump-down)."
    }
  ];

  let i, phase, score, hote;

  function demarrer(el) {
    hote = el;
    i = 0; phase = 'observe'; score = 0;
    rendre();
  }

  function entete() {
    return '<h2 style="font-size:24px">Atelier 1 — Le décodeur</h2>' +
           APP.jauge(i, ETAPES.length);
  }

  function rendre() {
    if (i >= ETAPES.length) { fin(); return; }
    const e = ETAPES[i];
    if (phase === 'observe') rendreObserve(e);
    else rendreApplique(e);
  }

  /* --------------------------------------------------------- observation */

  function rendreObserve(e) {
    let h = entete();
    h += '<div class="question">';
    h += '<p class="consigne">' + e.question + '</p>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px">';
    e.exemples.forEach(function (id) {
      const s = APP.SYM[id];
      h += '<div class="vignette" style="cursor:default;width:150px">' +
           APP.symbole(id) + '<span class="nom">' + APP.echapper(s.nom) + '</span></div>';
    });
    h += '</div><div class="choix" id="choix"></div><div id="retour"></div></div>';
    hote.innerHTML = h;
    poserChoix(e.choix, e.bonne, function (juste) {
      if (juste) score++;
      const r = document.getElementById('retour');
      r.className = 'retour-info ' + (juste ? 'ok' : 'ko');
      r.innerHTML = '<strong>' + (juste ? 'Trouvé.' : 'Pas tout à fait.') + '</strong>' +
                    APP.echapper(e.explique);
      revelerRegle(e.cle);
    });
  }

  function revelerRegle(cle) {
    const r = DONNEES.regles.filter(function (x) { return x.cle === cle; })[0];
    APP.debloquerRegle(cle);
    const d = document.createElement('div');
    d.innerHTML =
      '<div class="regle" style="margin-top:16px">' +
      '<span class="cle">Règle ' + r.cle + ' — débloquée</span>' +
      '<h3>' + APP.echapper(r.titre) + '</h3>' +
      '<p>' + APP.echapper(r.texte) + '</p></div>' +
      '<div class="barre-actions"><button class="b" id="suite">Mettre la règle à l\'épreuve →</button></div>';
    hote.querySelector('.question').appendChild(d);
    document.getElementById('suite').addEventListener('click', function () {
      phase = 'applique'; rendre();
    });
  }

  /* --------------------------------------------------------- application */

  function rendreApplique(e) {
    const r = DONNEES.regles.filter(function (x) { return x.cle === e.cle; })[0];
    let h = entete();
    h += '<div class="regle"><span class="cle">Règle ' + r.cle + '</span>' +
         '<h3>' + APP.echapper(r.titre) + '</h3></div>';
    h += '<div class="question">';
    h += '<p class="consigne">' + e.appliQ + '</p>';
    h += '<div style="display:flex;justify-content:center;margin-bottom:16px">' +
         APP.symbole(e.appliId, 'grand') + '</div>';
    h += '<div class="choix" id="choix"></div><div id="retour"></div></div>';
    hote.innerHTML = h;
    poserChoix(e.appliChoix, e.appliBonne, function (juste) {
      if (juste) score++;
      const rr = document.getElementById('retour');
      rr.className = 'retour-info ' + (juste ? 'ok' : 'ko');
      rr.innerHTML = '<strong>' + (juste ? 'Exact.' : 'Non — relis la règle au-dessus.') + '</strong>' +
                     APP.echapper(e.appliExplique);
      const d = document.createElement('div');
      d.className = 'barre-actions';
      d.innerHTML = '<button class="b" id="suite">' +
        (i === ETAPES.length - 1 ? 'Voir ma clé de décodage →' : 'Règle suivante →') + '</button>';
      hote.querySelector('.question').appendChild(d);
      document.getElementById('suite').addEventListener('click', function () {
        i++; phase = 'observe'; rendre();
      });
    });
  }

  /* -------------------------------------------------------------- commun */

  function poserChoix(liste, bonne, apres) {
    const zone = document.getElementById('choix');
    const ordre = APP.melanger(liste.map(function (t, k) { return { t: t, k: k }; }));
    ordre.forEach(function (o) {
      const b = document.createElement('button');
      b.className = 'reponse';
      b.type = 'button';
      b.textContent = o.t;
      b.addEventListener('click', function () {
        const juste = (o.k === bonne);
        zone.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
        b.classList.add(juste ? 'juste' : 'faux');
        if (!juste) {
          zone.querySelectorAll('button').forEach(function (x) {
            if (x.textContent === liste[bonne]) x.classList.add('juste');
          });
        }
        apres(juste);
      });
      zone.appendChild(b);
    });
  }

  /* ------------------------------------------------------------- clôture */

  function fin() {
    const total = ETAPES.length * 2;
    APP.marquer('decodage', score, total);
    const rates = [];
    let h = APP.bilan("Atelier 1 terminé — ta clé de décodage est complète", score, total, rates,
      '<button class="b" data-aller="cle">Voir et imprimer ma clé</button>' +
      '<button class="b" data-aller="familles">Atelier 2 →</button>');
    h += '<div class="note"><strong>Ce que tu viens de gagner :</strong> tu n\'as plus 49 dessins à retenir, ' +
         'mais 8 règles. Devant un symbole inconnu, pose-toi les questions dans l\'ordre : ' +
         'quelle forme ? qu\'y a-t-il dedans ? qu\'y a-t-il posé dessus ? le trait est-il plein ou pointillé ?</div>';
    hote.innerHTML = h;
  }

  APP.enregistrer('decodage', 'ec-decodage', demarrer);

  /* ------------------------------------- écran « clé de décodage » (fiche) */

  APP.enregistrer('cle', 'ec-cle', function (el) {
    const acquises = APP.etat.regles;
    let h = '<h2 style="font-size:24px">Ma clé de décodage</h2>' +
            '<p class="intro">Huit règles. Elles suffisent à lire n\'importe quel symbole du chapitre — ' +
            'y compris ceux que tu n\'as jamais vus.</p>';
    if (acquises.length < DONNEES.regles.length) {
      h += '<div class="note attention">Tu as débloqué ' + acquises.length + ' règle(s) sur ' +
           DONNEES.regles.length + '. Les autres se débloquent à l\'atelier 1, en les trouvant toi-même.</div>';
    }
    DONNEES.regles.forEach(function (r) {
      const ok = acquises.indexOf(r.cle) >= 0;
      h += '<div class="regle' + (ok ? '' : ' verrouille') + '">' +
           '<span class="cle">' + r.cle + '</span>' +
           '<h3>' + APP.echapper(r.titre) + '</h3>' +
           (ok ? '<div style="display:flex;gap:14px;align-items:flex-start;margin-top:8px">' +
                 APP.symbole(r.exemple, 'petit') + '<p>' + APP.echapper(r.texte) + '</p></div>'
               : '<p>🔒 À découvrir à l\'atelier 1.</p>') +
           '</div>';
    });
    h += '<div class="barre-actions"><button class="b" onclick="window.print()">Imprimer cette fiche</button>' +
         '<button class="b secondaire" data-aller="hub">Retour au parcours</button></div>';
    el.innerHTML = h;
  });

})();
