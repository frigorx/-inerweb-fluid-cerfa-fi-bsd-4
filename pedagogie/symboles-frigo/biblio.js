/* Le trousseau — les 53 fiches.

   Avant de savoir lire un symbole, il faut savoir ce qu'est l'objet.
   Chaque fiche répond à quatre questions, dans cet ordre :
     c'est quoi · pourquoi ça existe · où ça se trouve · à quoi ça sert.
   Le fonctionnement détaillé n'y est pas : il viendra plus tard. */

(function () {

  let hote, filtre, recherche, fiche;

  function demarrer(el) {
    hote = el; filtre = null; recherche = ''; fiche = null;
    rendre();
  }

  function liste() {
    let t = DONNEES.symboles;
    if (filtre) t = t.filter(function (s) { return s.groupe === filtre; });
    if (recherche) {
      const r = recherche.toLowerCase();
      t = t.filter(function (s) {
        return (s.nom + ' ' + s.fonction + ' ' + s.objet + ' ' + s.probleme + ' ' + s.ou)
          .toLowerCase().indexOf(r) >= 0;
      });
    }
    return t;
  }

  /* ------------------------------------------------------------ sommaire */

  function rendre() {
    let h = '<h2 style="font-size:24px">Le trousseau — 53 fiches</h2>';
    h += '<p class="intro">Une fiche par organe. Elle ne t\'explique pas encore comment il fonctionne : ' +
         'elle te dit <strong>ce que c\'est</strong>, <strong>pourquoi ça existe</strong> et ' +
         '<strong>où ça se trouve</strong>. C\'est ce qu\'il faut savoir avant tout le reste.</p>';

    h += '<div class="note">Tu peux ouvrir ce trousseau à tout moment, y compris pendant les ateliers. ' +
         'Devant un symbole que tu ne reconnais pas, viens lire sa fiche — puis retourne à l\'atelier.</div>';

    h += '<div class="carte" style="padding:12px 14px">';
    h += '<input type="search" id="rech" placeholder="Chercher un organe, un mot, un problème…" value="' +
         APP.echapper(recherche) + '" style="width:100%;font-family:inherit;font-size:17px;padding:9px 12px;' +
         'border:2px solid var(--bordure);border-radius:9px;margin-bottom:10px">';
    h += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
    h += '<button class="b secondaire" data-fam="" style="font-size:15px;padding:5px 13px' +
         (filtre ? '' : ';background:var(--marine);color:#fff') + '">Tout</button>';
    DONNEES.groupes.forEach(function (g) {
      h += '<button class="b secondaire" data-fam="' + g.cle + '" style="font-size:15px;padding:5px 13px;' +
           (filtre === g.cle ? 'background:' + g.couleur + ';color:#fff' : 'border-left:5px solid ' + g.couleur) +
           '">' + APP.echapper(g.nom) + '</button>';
    });
    h += '</div></div>';

    const t = liste();
    h += '<p style="font-size:16px;color:var(--texte-2);margin:6px 0 10px">' + t.length + ' fiche(s)</p>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:10px" id="grille"></div>';

    h += '<div class="barre-actions">' +
         '<button class="b secondaire" onclick="window.print()">Imprimer le trousseau</button>' +
         '<button class="b secondaire" data-aller="hub">Retour au parcours</button></div>';

    hote.innerHTML = h;

    const g = document.getElementById('grille');
    t.forEach(function (s) {
      const b = document.createElement('button');
      b.className = 'vignette';
      b.type = 'button';
      b.style.borderLeft = '6px solid ' + APP.groupeDe(s.groupe).couleur;
      b.innerHTML = APP.symbole(s.id) + '<span class="nom">' + APP.echapper(s.nom) + '</span>';
      b.addEventListener('click', function () { ouvrir(s); });
      g.appendChild(b);
    });

    const r = document.getElementById('rech');
    r.addEventListener('input', function () {
      recherche = r.value;
      const pos = r.selectionStart;
      rendre();
      const nr = document.getElementById('rech');
      nr.focus(); nr.setSelectionRange(pos, pos);
    });

    hote.querySelectorAll('[data-fam]').forEach(function (b) {
      b.addEventListener('click', function () {
        filtre = b.getAttribute('data-fam') || null;
        rendre();
      });
    });
  }

  /* --------------------------------------------------------------- fiche */

  function bloc(titre, texte, couleur) {
    return '<div style="border-left:5px solid ' + couleur + ';padding:2px 0 2px 14px;margin-bottom:14px">' +
           '<div style="font-family:\'Trebuchet MS\',sans-serif;font-weight:700;font-size:16px;' +
           'color:' + couleur + ';margin-bottom:3px">' + titre + '</div>' +
           '<p style="font-size:17px">' + APP.echapper(texte) + '</p></div>';
  }

  function ouvrir(s) {
    fiche = s;
    const voisins = liste();
    const i = voisins.indexOf(s);
    const regle = DONNEES.regles.filter(function (x) { return x.cle === s.regle; })[0];
    const piege = s.piege ? DONNEES.pieges.filter(function (x) { return x.cle === s.piege; })[0] : null;
    const g = APP.groupeDe(s.groupe);

    let h = '<p style="font-size:15px;color:var(--texte-2);text-transform:uppercase;letter-spacing:.04em">' +
            APP.echapper(g.nom) + (s.page ? ' · page ' + s.page : ' · hors document') + '</p>';
    h += '<h2 style="font-size:26px;margin-bottom:14px">' + APP.echapper(s.nom) + '</h2>';

    h += '<div class="carte" style="display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap;' +
         'border-left:7px solid ' + g.couleur + '">';
    h += '<div style="text-align:center">' + APP.symbole(s.id, 'grand') +
         '<div style="font-size:14px;color:var(--texte-2);margin-top:4px">son symbole</div>' +
         (s.photo ? APP.photoDe(s.id) +
                    '<div style="font-size:14px;color:var(--texte-2);margin-top:4px">en vrai</div>'
                  : '') + '</div>';
    h += '<div style="flex:1;min-width:260px">';
    h += bloc("C'est quoi ?", s.objet, 'var(--marine)');
    h += bloc("Pourquoi ça existe ?", s.probleme, 'var(--orange)');
    h += bloc("Où ça se trouve ?", s.ou, 'var(--vert)');
    h += bloc("À quoi ça sert ?", s.fonction, 'var(--marine-clair)');
    h += '</div></div>';

    h += '<div class="carte"><h3>Reconnaître son symbole</h3>' +
         '<p>' + APP.echapper(s.indice) + '</p>' +
         '<p style="margin-top:8px;color:var(--texte-2)">' + APP.echapper(s.role) + '</p>';
    if (regle) {
      h += '<p style="margin-top:10px;font-size:16px"><strong>Règle ' + regle.cle + '</strong> — ' +
           APP.echapper(regle.titre) + '</p>';
    }
    h += '</div>';

    if (piege) {
      h += '<div class="carte" style="border-left:7px solid var(--rouge)"><h3>⚠ À ne pas confondre</h3>' +
           '<p>' + APP.echapper(piege.texte) + '</p><div class="duel" style="margin-top:12px">' +
           piege.paire.map(function (id) {
             const autre = APP.SYM[id];
             return '<button class="vignette" data-fiche="' + id + '">' + APP.symbole(id) +
                    '<span class="nom">' + APP.echapper(autre.nom) + '</span></button>';
           }).join('') + '</div></div>';
    }

    h += '<div class="barre-actions">';
    if (i > 0) h += '<button class="b secondaire" data-fiche="' + voisins[i - 1].id + '">← ' +
                    APP.echapper(voisins[i - 1].nom) + '</button>';
    if (i >= 0 && i < voisins.length - 1)
      h += '<button class="b secondaire" data-fiche="' + voisins[i + 1].id + '">' +
           APP.echapper(voisins[i + 1].nom) + ' →</button>';
    h += '<button class="b" id="retour-liste">Toutes les fiches</button>' +
         '<button class="b secondaire" data-aller="hub">Retour au parcours</button></div>';

    hote.innerHTML = h;
    document.getElementById('retour-liste').addEventListener('click', function () { fiche = null; rendre(); });
    hote.querySelectorAll('[data-fiche]').forEach(function (b) {
      b.addEventListener('click', function () { ouvrir(APP.SYM[b.getAttribute('data-fiche')]); });
    });
    window.scrollTo(0, 0);
  }

  /* Ouvrir une fiche depuis n'importe quel atelier. */
  APP.ouvrirFiche = function (id) {
    APP.aller('biblio');
    if (APP.SYM[id]) ouvrir(APP.SYM[id]);
  };

  APP.enregistrer('biblio', 'ec-biblio', demarrer);

})();
