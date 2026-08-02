/* inerWeb Édu — Le Circuit Fantôme
   Noyau : routeur, progression locale, utilitaires partagés. */

const APP = (function () {

  const CLE_STOCKAGE = 'inerweb-circuit-fantome-v1';

  const ATELIERS = [
    { id: 'decodage', ecran: 'ec-decodage', num: 1, duree: '35 min',
      titre: 'Le décodeur',
      resume: "Huit règles à découvrir toi-même. À la fin, tu sais lire un symbole que tu n'as jamais vu." },
    { id: 'familles', ecran: 'ec-familles', num: 2, duree: '25 min',
      titre: 'Les huit familles',
      resume: "Memory, puis tri rapide. Tu ranges les 49 symboles et tu accroches le nom au dessin." },
    { id: 'pieges', ecran: 'ec-pieges', num: 3, duree: '20 min',
      titre: 'Les douze duels',
      resume: "Douze paires de symboles qui se ressemblent à s'y méprendre. C'est là que se jouent les points." },
    { id: 'circuit', ecran: 'ec-circuit', num: 4, duree: '30 min',
      titre: 'Le circuit fantôme',
      resume: "Une installation complète, 22 emplacements vides. À toi de la remonter." },
    { id: 'blanc', ecran: 'ec-blanc', num: 5, duree: '15 min',
      titre: "L'épreuve blanche",
      resume: "Vingt questions, corrigées à la fin, avec le diagnostic de ce qu'il te reste à revoir." }
  ];

  let etat = charger();

  /* ------------------------------------------------------------ stockage */

  function charger() {
    try {
      const brut = localStorage.getItem(CLE_STOCKAGE);
      if (brut) return JSON.parse(brut);
    } catch (e) { /* stockage indisponible : on continue en mémoire */ }
    return { ateliers: {}, regles: [], maison: null };
  }

  function sauver() {
    try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat)); }
    catch (e) { /* mode privé : la session reste utilisable */ }
  }

  function marquer(idAtelier, score, total) {
    const p = etat.ateliers[idAtelier] || {};
    p.score = score;
    p.total = total;
    p.taux = total ? Math.round(100 * score / total) : 0;
    p.valide = p.taux >= 70;
    p.vu = true;
    etat.ateliers[idAtelier] = p;
    sauver();
    majHub();
  }

  function ouvrir(idAtelier) {
    const p = etat.ateliers[idAtelier] || {};
    p.vu = true;
    etat.ateliers[idAtelier] = p;
    sauver();
  }

  function debloquerRegle(cle) {
    if (!etat.regles.includes(cle)) { etat.regles.push(cle); sauver(); }
  }

  /* -------------------------------------------------------------- routeur */

  const MODULES = {};   // rempli par chaque atelier-*.js
  let courant = 'hub';

  function enregistrer(id, ecranId, demarrer) {
    MODULES[id] = { ecranId: ecranId, demarrer: demarrer };
  }

  function aller(id) {
    courant = id;
    document.querySelectorAll('.ecran').forEach(function (e) { e.classList.remove('actif'); });
    const cible = (id === 'hub') ? 'ec-hub' : (MODULES[id] ? MODULES[id].ecranId : 'ec-hub');
    const el = document.getElementById(cible);
    if (el) el.classList.add('actif');
    document.getElementById('btn-retour').hidden = (id === 'hub');
    if (id !== 'hub' && MODULES[id]) {
      ouvrir(id);
      MODULES[id].demarrer(el);
    }
    if (id === 'hub') majHub();
    window.scrollTo(0, 0);
    location.hash = (id === 'hub') ? '' : id;
  }

  /* ------------------------------------------------------------------ hub */

  function majHub() {
    const g = document.getElementById('grille-ateliers');
    if (!g) return;
    g.innerHTML = '';
    let valides = 0;

    ATELIERS.forEach(function (a) {
      const p = etat.ateliers[a.id] || {};
      if (p.valide) valides++;
      const b = document.createElement('button');
      b.className = 'tuile' + (p.valide ? ' fait' : '');
      b.type = 'button';
      let etatTxte = 'Pas encore commencé';
      let cls = '';
      if (p.valide) { etatTxte = '✓ Validé — ' + p.score + ' / ' + p.total; }
      else if (p.vu && p.total) { etatTxte = 'À reprendre — ' + p.score + ' / ' + p.total; cls = ' encours'; }
      else if (p.vu) { etatTxte = 'Commencé'; cls = ' encours'; }
      b.innerHTML =
        '<span class="duree">Atelier ' + a.num + ' · ' + a.duree + '</span>' +
        '<h3>' + a.titre + '</h3>' +
        '<p>' + a.resume + '</p>' +
        '<div class="etat' + cls + '">' + etatTxte + '</div>';
      b.addEventListener('click', function () { aller(a.id); });
      g.appendChild(b);
    });

    const pct = Math.round(100 * valides / ATELIERS.length);
    document.getElementById('jauge-globale').style.width = pct + '%';
    document.getElementById('compteur-global').textContent =
      valides + ' / ' + ATELIERS.length + ' ateliers validés';
  }

  /* ------------------------------------------------------- outils communs */

  const SYM = {};
  DONNEES.symboles.forEach(function (s) { SYM[s.id] = s; });

  /** SVG du symbole, avec le marquage CD / EV quand le document en porte un :
      condenseur et évaporateur à air ne se distinguent que par ces deux lettres. */
  function svgDe(id) {
    const s = SYM[id];
    if (!s) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>';
    if (!s.marque) return s.svg;
    // Le fond blanc ménage une trouée dans le peigne d'ailettes, comme sur
    // le document : les lettres doivent rester lisibles.
    return s.svg.replace('</svg>',
      '<rect x="-11" y="15" width="22" height="13" fill="#fff"/>' +
      '<text x="0" y="25.5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" ' +
      'font-size="11" font-weight="700" fill="#000">' + s.marque + '</text></svg>');
  }

  function symbole(id, classe) {
    return '<span class="symbole ' + (classe || '') + '">' + svgDe(id) + '</span>';
  }

  function groupeDe(cle) {
    return DONNEES.groupes.filter(function (g) { return g.cle === cle; })[0];
  }

  function melanger(t) {
    const a = t.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function piocher(t, n) { return melanger(t).slice(0, n); }

  function echapper(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** Barre de progression réutilisable. */
  function jauge(fait, total) {
    const pct = total ? Math.round(100 * fait / total) : 0;
    return '<div class="progression"><div class="jauge"><span style="width:' + pct + '%"></span></div>' +
           '<span class="compteur">' + fait + ' / ' + total + '</span></div>';
  }

  /** Écran de bilan commun à tous les ateliers. */
  function bilan(titre, score, total, lignes, actions) {
    const taux = total ? Math.round(100 * score / total) : 0;
    const cls = taux >= 85 ? 'ok' : (taux >= 70 ? 'moyen' : 'ko');
    const verdict = taux >= 85 ? "C'est solide."
                  : (taux >= 70 ? "C'est validé, mais il reste des trous."
                                : "Pas encore. Reprends l'atelier : tu vas gagner du temps sur l'interrogation.");
    let h = '<h2 style="font-size:24px">' + titre + '</h2>';
    h += '<div class="carte"><p style="font-size:22px;font-weight:700">' +
         score + ' / ' + total + ' &nbsp; <span class="pastille ' + cls + '">' + taux + ' %</span></p>' +
         '<p style="margin-top:6px;color:var(--texte-2)">' + verdict + '</p></div>';
    if (lignes && lignes.length) {
      h += '<div class="carte"><h3>Ce qu\'il te reste à revoir</h3><ul class="puces">';
      lignes.forEach(function (l) { h += '<li>' + l + '</li>'; });
      h += '</ul></div>';
    }
    h += '<div class="barre-actions">' + (actions || '') +
         '<button class="b secondaire" data-aller="hub">Retour au parcours</button></div>';
    return h;
  }

  /* --------------------------------------------------------------- amorce */

  function demarrer() {
    majHub();

    document.getElementById('btn-retour').addEventListener('click', function () { aller('hub'); });

    document.addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-aller]');
      if (b) { aller(b.getAttribute('data-aller')); }
    });

    document.getElementById('btn-raz').addEventListener('click', function () {
      if (confirm("Effacer toute ta progression sur cet appareil ?\nCette action est définitive.")) {
        etat = { ateliers: {}, regles: [], maison: null };
        sauver();
        majHub();
      }
    });

    // Bouton « Précédent » du navigateur : sans cela, revenir en arrière
    // ne fait rien du tout et l'élève croit l'application bloquée.
    window.addEventListener('hashchange', function () {
      const c = location.hash.replace('#', '') || 'hub';
      if (c !== courant) aller(MODULES[c] || c === 'hub' ? c : 'hub');
    });

    const h = location.hash.replace('#', '');
    if (h && (MODULES[h] || h === 'hub')) aller(h); else aller('hub');
  }

  return {
    demarrer: demarrer, aller: aller, enregistrer: enregistrer,
    marquer: marquer, debloquerRegle: debloquerRegle,
    get etat() { return etat; }, sauver: sauver,
    SYM: SYM, symbole: symbole, svgDe: svgDe, groupeDe: groupeDe,
    melanger: melanger, piocher: piocher, echapper: echapper,
    jauge: jauge, bilan: bilan, ATELIERS: ATELIERS
  };
})();
