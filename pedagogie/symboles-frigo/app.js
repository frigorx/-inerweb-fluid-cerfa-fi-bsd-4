/* inerWeb Édu — Le Circuit Fantôme
   Noyau : routeur, progression locale, utilitaires partagés. */

const APP = (function () {

  const CLE_STOCKAGE = 'inerweb-circuit-fantome-v1';

  const PARCOURS = [
    {
      cle: 'm1',
      titre: 'Module 1 — Lire un symbole',
      sous: "2 heures. Tu découvres les 8 règles, puis tu les mets à l'épreuve.",
      ateliers: [
        { id: 'decodage', num: 1, duree: '35 min', titre: 'Le décodeur',
          resume: "Huit règles à découvrir toi-même. À la fin, tu sais lire un symbole que tu n'as jamais vu." },
        { id: 'familles', num: 2, duree: '25 min', titre: 'Les huit familles',
          resume: "Memory, puis tri rapide. Tu ranges les symboles et tu accroches le nom au dessin." },
        { id: 'pieges', num: 3, duree: '20 min', titre: 'Les douze duels',
          resume: "Douze paires qui se ressemblent à s'y méprendre. C'est là que se jouent les points." },
        { id: 'circuit', num: 4, duree: '30 min', titre: 'Le circuit fantôme',
          resume: "Une installation complète, 22 emplacements vides. À toi de la remonter." },
        { id: 'blanc', num: 5, duree: '15 min', titre: "L'épreuve blanche",
          resume: "Vingt questions, corrigées à la fin, avec le diagnostic de ce qu'il te reste à revoir." }
      ]
    },
    {
      cle: 'm2',
      titre: 'Module 2 — Construire et lire un circuit réel',
      sous: "2 heures. Tu passes du symbole au métier : ordres de montage, séquences, régulateurs.",
      ateliers: [
        { id: 'ligne-liquide', num: 6, duree: '25 min', titre: 'La ligne liquide',
          resume: "Six organes entre le condenseur et le détendeur. Leur ordre n'est pas une question de goût." },
        { id: 'groupe', num: 7, duree: '20 min', titre: 'Le groupe de condensation',
          resume: "Ce qui arrive monté sur le châssis, et ce qui reste à poser sur site." },
        { id: 'circuit-huile', num: 8, duree: '20 min', titre: "Le circuit d'huile",
          resume: "Du refoulement au carter : la boucle complète, et la sécurité qui la surveille." },
        { id: 'regulateurs', num: 9, duree: '25 min', titre: 'KVP · KVR · KVL · KVC',
          resume: "Quatre régulateurs, une seule question pour les classer tous les quatre." },
        { id: 'pump-down', num: 10, duree: '20 min', titre: "L'arrêt par tirage au vide",
          resume: "Le pump down, étape par étape — et les deux câblages qui le rendent inopérant." },
        { id: 'degivrage-electrique', num: 11, duree: '20 min', titre: 'Le dégivrage électrique',
          resume: "Dix étapes, trois temporisations. Chacune a sa raison d'être." },
        { id: 'degivrage-gaz-chauds', num: 12, duree: '25 min', titre: 'Le dégivrage par gaz chauds',
          resume: "L'évaporateur devient condenseur. Rapide — et risqué pour le compresseur." }
      ]
    }
  ];

  const ATELIERS = PARCOURS.reduce(function (t, p) { return t.concat(p.ateliers); }, []);

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
    const hote = document.getElementById('modules');
    if (!hote) return;
    hote.innerHTML = '';
    let valides = 0;

    PARCOURS.forEach(function (mod) {
      const bloc = document.createElement('section');
      bloc.style.marginBottom = '26px';
      const entete = document.createElement('div');
      entete.innerHTML = '<h3 style="font-size:21px;margin-bottom:2px">' + mod.titre + '</h3>' +
                         '<p style="font-size:16px;color:var(--texte-2);margin-bottom:12px">' +
                         mod.sous + '</p>';
      bloc.appendChild(entete);

      const g = document.createElement('div');
      g.className = 'grille-ateliers';

      mod.ateliers.forEach(function (a) {
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

      bloc.appendChild(g);
      hote.appendChild(bloc);
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

  /* --------------------------------------------------- aperçu d'une fiche

     « C'est quoi ? » doit être à un clic depuis n'importe quel atelier, sans
     jamais faire perdre sa place à l'élève : d'où un voile par-dessus l'écran
     courant plutôt qu'une navigation. */

  function boutonFiche(id, texte) {
    if (!SYM[id]) return '';
    return '<button type="button" class="lien-fiche" data-apercu="' + id + '">' +
           (texte || "C'est quoi, au juste ?") + '</button>';
  }

  function fermerApercu() {
    const v = document.getElementById('voile-fiche');
    if (v) v.remove();
    document.body.style.overflow = '';
  }

  function apercuFiche(id) {
    const s = SYM[id];
    if (!s) return;
    fermerApercu();
    const g = groupeDe(s.groupe);

    function bloc(titre, texte, couleur) {
      return '<div style="border-left:5px solid ' + couleur + ';padding:2px 0 2px 13px;margin-bottom:13px">' +
             '<div style="font-family:\'Trebuchet MS\',sans-serif;font-weight:700;font-size:15px;' +
             'color:' + couleur + ';margin-bottom:2px">' + titre + '</div>' +
             '<p style="font-size:16px">' + echapper(texte) + '</p></div>';
    }

    const v = document.createElement('div');
    v.id = 'voile-fiche';
    v.innerHTML =
      '<div class="fiche-flottante" role="dialog" aria-modal="true" aria-label="Fiche de l\'organe">' +
      '<div class="fiche-entete">' +
      '<div><div style="font-size:14px;opacity:.75;text-transform:uppercase;letter-spacing:.04em">' +
      echapper(g.nom) + '</div>' +
      '<div style="font-family:\'Trebuchet MS\',sans-serif;font-weight:700;font-size:20px">' +
      echapper(s.nom) + '</div></div>' +
      '<button type="button" class="fermer" aria-label="Fermer">✕</button></div>' +
      '<div class="fiche-corps">' +
      '<div style="text-align:center;margin-bottom:12px">' + symbole(s.id, 'grand') + '</div>' +
      bloc("C'est quoi ?", s.objet, 'var(--marine)') +
      bloc("Pourquoi ça existe ?", s.probleme, 'var(--orange)') +
      bloc("Où ça se trouve ?", s.ou, 'var(--vert)') +
      bloc("À quoi ça sert ?", s.fonction, 'var(--marine-clair)') +
      '</div>' +
      '<div class="fiche-pied"><button type="button" class="b" data-fermer>Reprendre l\'atelier</button></div>' +
      '</div>';

    v.addEventListener('click', function (ev) {
      if (ev.target === v || ev.target.closest('.fermer') || ev.target.closest('[data-fermer]')) {
        fermerApercu();
      }
    });
    document.body.appendChild(v);
    document.body.style.overflow = 'hidden';
    const f = v.querySelector('.fermer');
    if (f) f.focus();
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
      const f = ev.target.closest('[data-apercu]');
      if (f) { apercuFiche(f.getAttribute('data-apercu')); return; }
      const b = ev.target.closest('[data-aller]');
      if (b) { fermerApercu(); aller(b.getAttribute('data-aller')); }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') fermerApercu();
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
    PARCOURS: PARCOURS,
    melanger: melanger, piocher: piocher, echapper: echapper,
    jauge: jauge, bilan: bilan, ATELIERS: ATELIERS,
    boutonFiche: boutonFiche, apercuFiche: apercuFiche
  };
})();
