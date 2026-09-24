/* =====================================================================
   app.js — LE CONTACTEUR QUI SE SOUVIENT
   ---------------------------------------------------------------------
   Routeur, progression locale, le simulateur partagé et les quatre
   ateliers : observer · relier · dépanner · compléter.

   Principe pédagogique (méthode Henninot) : l'élève OBSERVE d'abord — les
   questions de l'atelier 1 ne s'ouvrent qu'après trois observations faites
   au pupitre. On NOMME ensuite (atelier 2, les bornes), on EXPLICITE en
   dépannant (atelier 3), on transfère au métier (atelier 4).
   ===================================================================== */
(function () {
  'use strict';

  const CLE = 'automaintien-progression-v1';
  const { stabiliser, CABLAGES } = window.SIMULATION;
  const SCHEMAS = window.SCHEMAS;

  /* ------------------------------------------------------ progression */
  let PROG = charger();
  function charger() { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch (e) { return {}; } }
  function sauver() { try { localStorage.setItem(CLE, JSON.stringify(PROG)); } catch (e) { /* mode privé : tant pis */ } }

  const ATELIERS = [
    { id: 'observer', titre: '1 · Observer — le contacteur qui reste collé', duree: '20 min', seuil: 4, max: 5,
      texte: 'Manœuvre Q1, Marche et Arrêt. Regarde où passe le courant. Trois choses à voir, puis cinq questions.' },
    { id: 'relier', titre: '2 · Relier — de la platine au schéma', duree: '15 min', seuil: 6, max: 8,
      texte: 'Huit bornes du schéma développé à retrouver sur la platine : A1, A2, 13, 14 et les autres.' },
    { id: 'depanner', titre: '3 · Dépanner — sept platines, une seule est bonne', duree: '25 min', seuil: 5, max: 7,
      texte: 'Le câblage est caché. Tu manœuvres, tu observes le contacteur, tu poses ton diagnostic.' },
    { id: 'completer', titre: '4 · Compléter — pour un compresseur', duree: '15 min', seuil: 5, max: 6,
      texte: 'Relais thermique, pressostat HP, second poste, voyant, thermostat : où va chacun ? Un piège à la fin.' }
  ];

  /* ------------------------------------------------------------ outils */
  const $ = (sel, racine) => (racine || document).querySelector(sel);
  function melanger(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function html(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /* Un QCM : la bonne réponse est toujours la première du tableau `r`,
     les propositions sont mélangées au rendu. `apres(juste)` est appelé
     une seule fois. */
  function qcm(hote, item, numero, apres) {
    const ordre = melanger(item.r.map((t, i) => ({ t, i })));
    const bloc = document.createElement('div');
    bloc.className = 'question';
    bloc.innerHTML = `<div class="consigne">${numero ? numero + '. ' : ''}${html(item.q)}</div><div class="choix"></div>`;
    const choix = $('.choix', bloc);
    ordre.forEach(o => {
      const b = document.createElement('button');
      b.className = 'reponse'; b.type = 'button'; b.textContent = o.t;
      b.addEventListener('click', () => {
        const juste = o.i === 0;
        choix.querySelectorAll('button').forEach(x => { x.disabled = true; });
        b.classList.add(juste ? 'juste' : 'faux');
        if (!juste) choix.querySelectorAll('button').forEach(x => { if (x.textContent === item.r[0]) x.classList.add('juste'); });
        const info = document.createElement('div');
        info.className = 'retour-info ' + (juste ? 'ok' : 'ko');
        info.innerHTML = `<strong>${juste ? 'Oui.' : 'Non.'}</strong>${html(item.e)}`;
        bloc.appendChild(info);
        apres(juste);
      });
      choix.appendChild(b);
    });
    hote.appendChild(bloc);
    return bloc;
  }

  function bilan(hote, atelier, score) {
    const a = ATELIERS.find(x => x.id === atelier);
    const fait = score >= a.seuil;
    PROG[atelier] = { score, fait, max: a.max };
    sauver();
    const c = document.createElement('div');
    c.className = 'carte';
    c.innerHTML = `<h3>Bilan de l'atelier</h3>
      <p><span class="pastille ${fait ? 'ok' : 'ko'}">${score} / ${a.max}</span>
      ${fait ? ' — atelier validé.' : ` — il faut ${a.seuil} pour valider. Rejoue-le : la bonne réponse est expliquée à chaque question.`}</p>
      <div class="barre-actions"><button class="b" data-aller="hub">Retour au parcours</button>
      <button class="b secondaire" data-aller="${atelier}">Rejouer l'atelier</button></div>`;
    hote.appendChild(c);
    c.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ========================================================= SIMULATEUR
     o = { cablage, vue: 'deux' | 'platine' | 'developpe', courant, coche,
           pupitre (défaut true), developpe: {serie, maintien, paralleles},
           marques(), surligner(), cablageAffiche, onChange(etat, evt) } */
  function creerSimulateur(hote, o) {
    o = Object.assign({ vue: 'deux', pupitre: true, courant: false, coche: false }, o || {});
    const etat = { q: false, s1: false, s2: false, km: false, bat: false };
    let cablage = o.cablage || 'normal';
    let courant = !!o.courant;
    let reveler = !!o.cablageAffiche;
    const lignes = [];

    hote.innerHTML = `<div class="simulateur">
      <div class="duo-schemas${o.vue !== 'deux' ? ' seul' : ''}">
        ${o.vue !== 'developpe' ? '<div><h4>La platine</h4><div class="z-platine"></div></div>' : ''}
        ${o.vue !== 'platine' ? '<div><h4>Le schéma développé</h4><div class="z-developpe"></div></div>' : ''}
      </div>
      ${o.pupitre ? `<div class="pupitre">
        <button type="button" class="q1">Q1 : coupé</button>
        <button type="button" class="arret">ARRÊT (maintenir)</button>
        <button type="button" class="marche">MARCHE (maintenir)</button>
        <span class="temoin"><i></i><span class="t-txt">KM1 au repos</span></span>
        ${o.coche ? `<label><input type="checkbox" class="c-courant"${courant ? ' checked' : ''}> voir le courant</label>` : ''}
      </div><div class="journal"></div>` : ''}
    </div>`;

    const zPlatine = $('.z-platine', hote), zDev = $('.z-developpe', hote);

    function rendre() {
      const opts = { masquerCourant: !courant, cablage: reveler ? cablage : 'normal' };
      if (zPlatine) zPlatine.innerHTML = SCHEMAS.platine(etat, Object.assign({}, opts, { marques: o.marques && o.marques(), cliquable: !!o.marques }));
      if (zDev) zDev.innerHTML = SCHEMAS.developpe(etat, Object.assign({ puissance: o.vue === 'deux' }, opts, o.developpe || {}, { surligner: o.surligner && o.surligner() }));
      if (o.pupitre) {
        const bq = $('.q1', hote); bq.textContent = etat.q ? 'Q1 : enclenché' : 'Q1 : coupé'; bq.classList.toggle('on', etat.q);
        $('.arret', hote).classList.toggle('appuye', etat.s1);
        $('.marche', hote).classList.toggle('appuye', etat.s2);
        const t = $('.temoin', hote);
        t.className = 'temoin' + (etat.bat ? ' bat' : etat.km ? ' colle' : '');
        $('.t-txt', t).textContent = etat.bat ? 'KM1 bat !' : etat.km ? 'KM1 collé' : 'KM1 au repos';
      }
    }

    function journal(evt) {
      if (!o.pupitre) return;
      const fin = etat.bat ? 'KM1 bat (clac-clac)' : etat.km ? 'KM1 collé' : 'KM1 au repos';
      lignes.unshift(`${evt} → ${fin}`);
      if (lignes.length > 6) lignes.pop();
      $('.journal', hote).innerHTML = lignes.map(l => `<div>${html(l)}</div>`).join('');
    }

    function appliquer(evt, avant) {
      const r = stabiliser(cablage, etat);
      etat.km = r.km; etat.bat = r.bat;
      rendre(); journal(evt);
      if (o.onChange) o.onChange(etat, evt, avant);
    }

    /* `avant` est capturé AVANT la bascule : c'est ce qui permet de
       reconnaître « Q1 réarmé alors que le moteur tournait ». */
    function poser(cle, valeur, evt) {
      if (etat[cle] === valeur) return;
      const avant = { km: etat.km, q: etat.q };
      etat[cle] = valeur;
      appliquer(evt, avant);
    }

    /* Boutons poussoirs : appuyé tant que le doigt reste dessus. */
    function poussoir(el, cle, nom) {
      if (!el) return;
      const on = () => poser(cle, true, `appui ${nom}`), off = () => poser(cle, false, `relâche ${nom}`);
      el.addEventListener('pointerdown', e => { e.preventDefault(); on(); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, off));
      el.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); on(); } });
      el.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') off(); });
      el.addEventListener('blur', off);
    }
    if (o.pupitre) {
      $('.q1', hote).addEventListener('click', () => poser('q', !etat.q, etat.q ? 'Q1 coupé' : 'Q1 enclenché'));
      poussoir($('.arret', hote), 's1', 'Arrêt');
      poussoir($('.marche', hote), 's2', 'Marche');
      const cc = $('.c-courant', hote);
      if (cc) cc.addEventListener('change', () => { courant = cc.checked; rendre(); });
    }
    /* … et les mêmes organes, directement sur la platine. */
    if (zPlatine && o.pupitre) {
      zPlatine.addEventListener('pointerdown', e => {
        const g = e.target.closest('[data-organe]'); if (!g) return;
        const id = g.dataset.organe;
        if (id === 's1' || id === 's2') { e.preventDefault(); poser(id, true, `appui ${id === 's1' ? 'Arrêt' : 'Marche'}`); }
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => zPlatine.addEventListener(ev, () => {
        if (etat.s1) poser('s1', false, 'relâche Arrêt');
        if (etat.s2) poser('s2', false, 'relâche Marche');
      }));
      zPlatine.addEventListener('click', e => {
        const g = e.target.closest('[data-organe]'); if (!g || g.dataset.organe !== 'q1') return;
        poser('q', !etat.q, etat.q ? 'Q1 coupé' : 'Q1 enclenché');
      });
    }

    rendre();
    return {
      etat, rendre, zPlatine, zDev,
      reinitialiser(c) { cablage = c || cablage; reveler = false; etat.q = false; etat.s1 = false; etat.s2 = false; etat.km = false; etat.bat = false; lignes.length = 0; if (o.pupitre) $('.journal', hote).innerHTML = ''; rendre(); },
      reveler() { reveler = true; rendre(); },
      developpe(d) { o.developpe = d; rendre(); }
    };
  }

  /* ================================================ ATELIER 1 : OBSERVER */
  const QUESTIONS_OBSERVER = [
    { q: 'Tu relâches Marche : le contacteur reste collé. Qui alimente la bobine à ce moment-là ?',
      r: ['Le contact 13-14 de KM1, que KM1 a fermé lui-même en collant', 'Le bouton Marche, qui reste enfoncé', 'Le bouton Arrêt, qui est fermé au repos', 'Le disjoncteur Q1, directement'],
      e: "C'est l'auto-maintien : en collant, le contacteur ferme son propre contact 13-14, câblé en parallèle du bouton Marche. Le bouton peut être relâché, le courant passe par 13-14." },
    { q: 'Le contact du bouton Arrêt S1 est un contact…',
      r: ["NC : fermé au repos, il s'ouvre quand on appuie", 'NO : ouvert au repos, il se ferme quand on appuie', "Inverseur : il bascule d'une borne à l'autre", "Temporisé : il s'ouvre après quelques secondes"],
      e: "Un Arrêt doit couper. Il est fermé au repos (NC, bornes 1-2) pour laisser passer le courant, et s'ouvre quand on appuie. Câblé sur un contact NO, il ne pourrait rien couper." },
    { q: "Pourquoi l'Arrêt est-il en série, et la Marche en parallèle du contact 13-14 ?",
      r: ["L'Arrêt doit couper le seul chemin ; la Marche n'a qu'à offrir un chemin de plus, le temps que 13-14 se ferme", 'C\'est une convention de dessin, on pourrait inverser les deux', "Parce que l'Arrêt est rouge et la Marche est verte", 'Pour que les deux boutons voient le même courant'],
      e: "En série, le contact NC de l'Arrêt coupe tout ce qui va vers la bobine, y compris le maintien. En parallèle, la Marche court-circuite le 13-14 une fraction de seconde : c'est tout ce qu'il faut pour que le contacteur colle et prenne le relais." },
    { q: 'Le moteur tourne. Q1 déclenche, puis tu le réarmes. Que fait le moteur ?',
      r: ["Il reste à l'arrêt tant que personne n'appuie sur Marche", 'Il redémarre tout seul dès que Q1 est réarmé', 'Il redémarre après quelques secondes', 'Il démarre en sens inverse'],
      e: "À la coupure, la bobine est retombée et 13-14 s'est ouvert : la mémoire est perdue. Au retour du courant, aucun chemin ne mène à la bobine. C'est voulu : personne ne veut d'une machine qui repart seule après une coupure de courant." },
    { q: 'Sur un contacteur, comment reconnaît-on un contact auxiliaire NO à ses bornes ?',
      r: ['13-14 (ou 23-24, 33-34…) : le second chiffre est 3-4', '21-22 : le second chiffre est 1-2', 'A1-A2', '1/L1 et 2/T1'],
      e: 'Le second chiffre dit la fonction : 3-4 pour un NO, 1-2 pour un NC. Le premier chiffre numérote le contact. 21-22 est donc un NC, A1-A2 la bobine, 1/L1-2/T1 un pôle de puissance.' }
  ];

  function ecranObserver(hote) {
    hote.innerHTML = `<h2>Atelier 1 — Observer</h2>
      <p class="intro">Enclenche Q1. Appuie sur Marche, relâche. Appuie sur Arrêt. Coupe Q1 pendant que ça tourne, puis réarme-le.
      Le courant est en orange : <strong>suis-le</strong> à chaque manœuvre, sur la platine et sur le schéma.</p>
      <div class="z-sim"></div>
      <div class="carte"><h3>Trois choses à avoir vues avant de répondre</h3>
        <ul class="puces">
          <li data-obs="maintien">Je relâche Marche : le contacteur <strong>reste collé</strong>.</li>
          <li data-obs="arret">J'appuie sur Arrêt : le contacteur <strong>retombe</strong>.</li>
          <li data-obs="coupure">Je coupe Q1 pendant la marche, je le réarme : le moteur <strong>ne repart pas seul</strong>.</li>
        </ul>
        <p class="z-etat" style="color:var(--texte-2)">Il te reste 3 observations à faire au pupitre.</p>
      </div>
      <div class="z-questions"></div>`;

    const vues = {};
    let aTourne = false;
    const sim = creerSimulateur($('.z-sim', hote), {
      vue: 'deux', courant: true, coche: true,
      onChange(etat, evt, avant) {
        if (etat.km) aTourne = true;
        if (evt === 'relâche Marche' && etat.km) voir('maintien');
        if (evt === 'appui Arrêt' && avant.km && !etat.km) voir('arret');
        if (evt === 'Q1 enclenché' && aTourne && !etat.km && avant.q === false) voir('coupure');
      }
    });
    void sim;

    function voir(id) {
      if (vues[id]) return;
      vues[id] = true;
      $(`[data-obs="${id}"]`, hote).classList.add('vu');
      const reste = 3 - Object.keys(vues).length;
      $('.z-etat', hote).textContent = reste ? `Il te reste ${reste} observation${reste > 1 ? 's' : ''} à faire au pupitre.` : 'Les trois observations sont faites. Les questions sont ouvertes.';
      if (!reste) questions();
    }

    function questions() {
      const z = $('.z-questions', hote);
      z.innerHTML = '<h3 style="margin:18px 0 10px">Maintenant, nomme ce que tu as vu</h3>';
      let repondu = 0, score = 0;
      melanger(QUESTIONS_OBSERVER).forEach((item, i) => qcm(z, item, i + 1, juste => {
        repondu++; if (juste) score++;
        if (repondu === QUESTIONS_OBSERVER.length) bilan(z, 'observer', score);
      }));
      z.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ================================================== ATELIER 2 : RELIER */
  const RELIER = [
    { borne: 'km-a1', sur: 'bobine', q: 'La bobine KM1 reçoit la commande par sa borne A1. Où est A1 sur la platine ?', e: 'A1 est en haut à gauche du contacteur, à côté des pôles de puissance. Elle reçoit le fil qui vient de la sortie du bouton Marche et du 14.' },
    { borne: 'km-a2', sur: 'bobine', q: 'La bobine retourne au neutre par A2. Où est A2 ?', e: 'A2 est en bas à droite. Le fil bleu la ramène au neutre, sortie de Q1. Sur ce contacteur, A1 et A2 sont en diagonale : c\'est fréquent.' },
    { borne: 'km-13', sur: 'km13', q: "Le contact d'auto-maintien KM1 13-14 : sa borne 13 est reliée au point A, la sortie du bouton Arrêt. Où est la borne 13 ?", e: 'La borne 13 est sur le bornier du haut, à droite des pôles 1/L1, 3/L2, 5/L3. Le fil qui y arrive vient du nœud entre Arrêt et Marche.' },
    { borne: 'km-14', sur: 'km13', q: 'Sa borne 14 rejoint le point B, entrée de la bobine. Où est la borne 14 ?', e: 'La borne 14 est sur le bornier du bas, juste sous la 13. Elle rejoint la sortie du bouton Marche et A1 : c\'est la parallèle.' },
    { borne: 's1-2', sur: 's1', q: 'S1 Arrêt, borne 2 : la sortie du contact NC, qui part vers Marche et vers le 13. Où est cette borne ?', e: 'La borne 2 est sous le bouton Arrêt. Un contact NC porte les numéros 1-2 : 1 entre, 2 sort.' },
    { borne: 's2-3', sur: 's2', q: "S2 Marche, borne 3 : l'entrée du contact NO. Où est-elle ?", e: 'La borne 3 est au-dessus du bouton Marche. Un contact NO porte les numéros 3-4 : 3 entre, 4 sort.' },
    { borne: 'q1-l-out', sur: 'q1', q: 'Q1, borne 2 : la phase protégée qui alimente toute la commande. Où est-elle ?', e: "C'est la borne du bas, pôle droit du disjoncteur. Le pôle gauche, c'est le neutre. Un disjoncteur 2 A suffit : une bobine consomme quelques VA, pas un moteur." },
    { borne: 'q1-n-out', sur: 'q1', q: 'Le neutre après Q1, là où revient le fil bleu de A2. Où est cette borne ?', e: "C'est la borne du bas, pôle gauche. Le neutre passe lui aussi par Q1 : un disjoncteur bipolaire coupe les deux conducteurs, ce qui met la platine hors tension pour de bon." }
  ];

  function ecranRelier(hote) {
    hote.innerHTML = `<h2>Atelier 2 — Relier</h2>
      <p class="intro">Le schéma développé nomme les bornes : A1, A2, 13, 14, 1-2, 3-4. La platine les porte, gravées sur le plastique.
      Pour chaque borne nommée sur le schéma, <strong>clique-la sur la platine</strong>. Une seule chance par borne.</p>
      <div class="z-question"></div>
      <div class="z-sim"></div>
      <div class="z-bilan"></div>`;
    const suite = melanger(RELIER);
    let i = 0, score = 0, verrou = false;
    let marques = {};
    const sim = creerSimulateur($('.z-sim', hote), {
      vue: 'deux', pupitre: false, marques: () => marques, surligner: () => suite[i] && suite[i].sur
    });
    sim.etat.q = true;

    function question() {
      marques = {}; verrou = false;
      const item = suite[i];
      $('.z-question', hote).innerHTML = `<div class="question"><div class="consigne">${i + 1} / ${suite.length} — ${html(item.q)}</div>
        <p style="color:var(--texte-2)">L'organe concerné est surligné sur le schéma développé.</p><div class="z-info"></div></div>`;
      sim.rendre();
    }
    sim.zPlatine.addEventListener('click', e => {
      const g = e.target.closest('[data-borne]'); if (!g || verrou) return;
      verrou = true;
      const item = suite[i], id = g.dataset.borne, juste = id === item.borne;
      if (juste) { score++; marques[id] = 'juste'; } else { marques[id] = 'faux'; marques[item.borne] = 'cible'; }
      sim.rendre();
      const info = $('.z-info', hote);
      info.innerHTML = `<div class="retour-info ${juste ? 'ok' : 'ko'}"><strong>${juste ? 'Oui.' : `Non — tu as cliqué ${html(SCHEMAS.ETIQUETTES[id])}. La bonne borne clignote.`}</strong>${html(item.e)}</div>
        <div class="barre-actions"><button class="b z-suite">${i + 1 < suite.length ? 'Borne suivante' : 'Voir le bilan'}</button></div>`;
      $('.z-suite', info).addEventListener('click', () => { i++; if (i < suite.length) question(); else { $('.z-question', hote).innerHTML = ''; bilan($('.z-bilan', hote), 'relier', score); } });
    });
    question();
  }

  /* ================================================ ATELIER 3 : DÉPANNER */
  const DIAGNOSTICS = {
    normal: { obs: 'Marche à l\'impulsion, maintien, arrêt franc, pas de redémarrage après coupure.', v: "Rien à réparer. Tu peux passer à la mise en service." },
    'sans-maintien': { obs: 'Le contacteur ne colle que tant que tu tiens Marche.', v: 'Hors tension, ohmmètre entre 13 et 14 en enfonçant l\'armature à la main : il faut lire 0 Ω. Puis suivre les deux fils du 13 et du 14.' },
    'maintien-amont': { obs: "Ça démarre, ça se maintient, mais l'Arrêt ne fait plus rien : seul Q1 arrête.", v: 'Suivre le fil qui arrive sur le 13 : il doit partir de la borne 2 de S1, pas de la borne 1. Le maintien pris avant l\'Arrêt contourne l\'Arrêt.' },
    'arret-parallele': { obs: "Ça démarre tout seul à la mise sous tension, et rien ne l'arrête.", v: "Le contact NC de l'Arrêt est en parallèle de la Marche : il alimente la bobine en permanence. Vérifier que la borne 1 de S1 et la borne 3 de S2 ne sont pas sur le même fil." },
    'marche-nc': { obs: "Ça démarre à la mise sous tension. L'Arrêt fonctionne tant qu'on le tient ; on le relâche, ça repart.", v: 'Le bouton Marche a été raccordé sur un bloc contact NC (1-2) au lieu du NO (3-4). Ohmmètre sur S2 au repos : 0 Ω = mauvais bloc.' },
    'auxiliaire-nc': { obs: 'Le contacteur claque sans arrêt : il bat.', v: 'Le maintien est pris sur un contact NC (21-22) : dès que le contacteur colle, il se coupe lui-même, retombe, recolle. Lire les numéros gravés sur le bloc auxiliaire : il faut 13-14.' },
    'bobine-hs': { obs: 'Rien ne bouge, quoi que tu fasses.', v: 'Hors tension, ohmmètre entre A1 et A2 : ∞ = bobine coupée. Sinon contrôler le serrage de A2 : une vis desserrée sur le neutre donne exactement le même symptôme.' }
  };

  function ecranDepanner(hote) {
    hote.innerHTML = `<h2>Atelier 3 — Dépanner</h2>
      <p class="intro">Sept platines te sont présentées, dans le désordre. Le dessin ne montre pas la faute et le courant est invisible,
      comme sur une vraie platine : <strong>seuls le contacteur et tes doigts te renseignent</strong>. Manœuvre, note ce qui se passe, puis pose ton diagnostic.</p>
      <div class="z-titre"></div>
      <div class="z-sim"></div>
      <div class="z-diag"></div>
      <div class="z-bilan"></div>`;
    const suite = melanger(Object.keys(CABLAGES));
    let i = 0, score = 0;
    const sim = creerSimulateur($('.z-sim', hote), { vue: 'deux', courant: false, cablage: suite[0] });

    function platine() {
      sim.reinitialiser(suite[i]);
      $('.z-titre', hote).innerHTML = `<div class="note attention"><strong>Platine ${i + 1} / ${suite.length}.</strong> Enclenche Q1, essaie Marche, Arrêt, une coupure. Que fait KM1 ?</div>`;
      const z = $('.z-diag', hote);
      z.innerHTML = `<div class="question"><div class="consigne">Ton diagnostic</div><div class="choix"></div><div class="z-info"></div></div>`;
      const choix = $('.choix', z);
      Object.keys(CABLAGES).forEach(id => {
        const b = document.createElement('button');
        b.className = 'reponse'; b.type = 'button'; b.textContent = CABLAGES[id].nom;
        b.addEventListener('click', () => reponse(id, choix, b));
        choix.appendChild(b);
      });
    }
    function reponse(id, choix, b) {
      const bon = suite[i], juste = id === bon;
      if (juste) score++;
      choix.querySelectorAll('button').forEach(x => { x.disabled = true; if (x.textContent === CABLAGES[bon].nom) x.classList.add('juste'); });
      if (!juste) b.classList.add('faux');
      sim.reveler();
      const d = DIAGNOSTICS[bon];
      $('.z-info', hote).innerHTML = `<div class="retour-info ${juste ? 'ok' : 'ko'}"><strong>${juste ? 'Bon diagnostic.' : 'Non — c\'était : ' + html(CABLAGES[bon].nom) + '.'}</strong>
        <em>Ce qu'on observe :</em> ${html(d.obs)}<br><em>Comment on le vérifie :</em> ${html(d.v)}<br>
        <span style="color:var(--texte-2)">Le schéma développé montre maintenant le câblage réel de cette platine.</span></div>
        <div class="barre-actions"><button class="b z-suite">${i + 1 < suite.length ? 'Platine suivante' : 'Voir le bilan'}</button></div>`;
      $('.z-suite', hote).addEventListener('click', () => { i++; if (i < suite.length) platine(); else { $('.z-diag', hote).innerHTML = ''; $('.z-titre', hote).innerHTML = ''; bilan($('.z-bilan', hote), 'depanner', score); } });
    }
    platine();
  }

  /* =============================================== ATELIER 4 : COMPLÉTER */
  const CHOIX_PLACE = {
    serie: "En série, dans la ligne d'arrêt (il coupe tout, maintien compris)",
    'parallele-marche': 'En parallèle du bouton Marche (il participe au maintien)',
    'parallele-bobine': 'En parallèle de la bobine, entre A1 et A2 (il ne commande rien, il informe)',
    ailleurs: 'Nulle part dans cette ligne : il commande autre chose'
  };
  const COMPLETER = [
    { id: 'f1', place: 'serie', q: 'Le relais thermique F1 protège le moteur contre la surcharge. Son contact 95-96 est NC et s\'ouvre en défaut. Où le câbler ?', e: "En série dans la ligne d'arrêt : quand 95-96 s'ouvre, la bobine retombe et le maintien tombe avec elle. Après réarmement du thermique, le moteur ne repart pas seul : il faut réappuyer sur Marche. C'est exactement la sécurité qu'on attend." },
    { id: 'hp', place: 'serie', q: 'Le pressostat HP de sécurité, contact NC à réarmement manuel. Où le câbler ?', e: 'Même logique que le thermique : une sécurité coupe le chemin unique. Toutes les sécurités vont en série dans la ligne d\'arrêt, jamais en parallèle de quoi que ce soit.' },
    { id: 's3', place: 'serie', q: "Un second bouton Arrêt S3, pour un poste de commande à l'autre bout de la machine. Où le câbler ?", e: 'Deux Arrêts en série : l\'un ou l\'autre coupe. Un Arrêt en parallèle ne couperait jamais rien, l\'autre chemin resterait fermé.' },
    { id: 's4', place: 'parallele-marche', q: 'Un second bouton Marche S4, pour ce même poste distant. Où le câbler ?', e: "Deux Marches en parallèle : l'un ou l'autre lance, et le 13-14 prend le relais. Règle à retenir : les arrêts en série, les marches en parallèle." },
    { id: 'h1', place: 'parallele-bobine', q: 'Un voyant H1 « moteur en marche ». Où le câbler ?', e: "En parallèle de la bobine, entre A1 et A2 : il est allumé exactement quand la bobine est alimentée. Il ne commande rien, il informe. Un voyant en série ferait chuter la tension de la bobine." },
    { id: 'thermostat', place: 'ailleurs', q: 'Le thermostat de la chambre froide, qui doit démarrer et arrêter le compresseur au fil de la température. Où le câbler ?', e: "Piège. En série dans la ligne maintenue, chaque ouverture du thermostat ferait tomber le maintien : à la remontée de la température, le compresseur ne repartirait jamais seul. Un organe de régulation ne va pas dans une ligne à auto-maintien. Le thermostat commande l'électrovanne de ligne liquide (pump down, atelier 10 du Circuit Fantôme) ou un contacteur sans auto-maintien. L'auto-maintien autorise la marche de l'installation ; la régulation, c'est l'étage d'après." }
  ];

  function ecranCompleter(hote) {
    hote.innerHTML = `<h2>Atelier 4 — Compléter, pour un compresseur</h2>
      <p class="intro">Le circuit de base marche. Sur une vraie installation, il manque des sécurités, un second poste, un voyant.
      Pour chaque organe, dis <strong>où</strong> il se câble. S'il est bien placé, il apparaît sur le schéma, et tu peux le manœuvrer.</p>
      <div class="z-sim"></div>
      <div class="z-questions"></div>`;
    const dev = { serie: ['q1', 's1'], maintien: ['s2', 'km13'], paralleles: [] };
    const sim = creerSimulateur($('.z-sim', hote), { vue: 'developpe', courant: true, developpe: dev });
    let i = 0, score = 0;
    const z = $('.z-questions', hote);

    function suivante() {
      if (i >= COMPLETER.length) { bilan(z, 'completer', score); return; }
      const item = COMPLETER[i];
      const ordre = melanger(Object.keys(CHOIX_PLACE));
      const bloc = document.createElement('div');
      bloc.className = 'question';
      bloc.innerHTML = `<div class="consigne">${i + 1}. ${html(item.q)}</div><div class="choix"></div>`;
      const choix = $('.choix', bloc);
      ordre.forEach(p => {
        const b = document.createElement('button');
        b.className = 'reponse'; b.type = 'button'; b.textContent = CHOIX_PLACE[p];
        b.addEventListener('click', () => {
          const juste = p === item.place;
          if (juste) score++;
          choix.querySelectorAll('button').forEach(x => { x.disabled = true; if (x.textContent === CHOIX_PLACE[item.place]) x.classList.add('juste'); });
          if (!juste) b.classList.add('faux');
          if (item.place === 'serie') dev.serie.splice(1, 0, item.id);
          if (item.place === 'parallele-marche') dev.maintien.splice(dev.maintien.length - 1, 0, item.id);
          if (item.place === 'parallele-bobine') dev.paralleles.push(item.id);
          sim.developpe(dev);
          const info = document.createElement('div');
          info.className = 'retour-info ' + (juste ? 'ok' : 'ko');
          info.innerHTML = `<strong>${juste ? 'Oui.' : 'Non.'}</strong>${html(item.e)}${item.place !== 'ailleurs' ? '<br><span style="color:var(--texte-2)">L\'organe est maintenant sur le schéma.</span>' : ''}
            <div class="barre-actions"><button class="b z-suite">${i + 1 < COMPLETER.length ? 'Organe suivant' : 'Voir le bilan'}</button></div>`;
          bloc.appendChild(info);
          $('.z-suite', info).addEventListener('click', () => { i++; suivante(); });
          $('.z-sim', hote).scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        choix.appendChild(b);
      });
      z.appendChild(bloc);
    }
    suivante();
  }

  /* ============================================================= ROUTEUR */
  const ECRANS = { observer: ecranObserver, relier: ecranRelier, depanner: ecranDepanner, completer: ecranCompleter };

  function aller(id) {
    document.querySelectorAll('.ecran').forEach(s => s.classList.remove('actif'));
    const s = document.getElementById('ec-' + id) || document.getElementById('ec-hub');
    s.classList.add('actif');
    $('#btn-retour').hidden = id === 'hub';
    if (ECRANS[id]) ECRANS[id](s); else hub();
    window.scrollTo(0, 0);
  }

  function hub() {
    const z = $('#ateliers');
    let faits = 0;
    z.innerHTML = ATELIERS.map(a => {
      const p = PROG[a.id];
      if (p && p.fait) faits++;
      const etat = !p ? 'À faire' : p.fait ? `Validé — ${p.score} / ${a.max}` : `En cours — ${p.score} / ${a.max}, rejouer`;
      return `<button class="tuile${p && p.fait ? ' fait' : ''}" data-aller="${a.id}">
        <span class="duree">${a.duree}</span><h3>${html(a.titre)}</h3><p>${html(a.texte)}</p>
        <div class="etat${p && !p.fait ? ' encours' : ''}">${etat}</div></button>`;
    }).join('');
    $('#jauge-globale').style.width = (faits / ATELIERS.length * 100) + '%';
    $('#compteur-global').textContent = `${faits} / ${ATELIERS.length} ateliers validés`;
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-aller]');
    if (b) aller(b.dataset.aller);
  });
  $('#btn-retour').addEventListener('click', () => aller('hub'));
  $('#btn-raz').addEventListener('click', () => {
    if (confirm('Effacer ta progression sur cet appareil ?')) { PROG = {}; sauver(); hub(); }
  });

  hub();
})();

// Mise en cache pour l'usage hors connexion (sans effet en file://).
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () { /* indisponible : tant pis */ });
  });
}
