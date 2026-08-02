/* Bibliothèque de référence — les 49 symboles, consultables et imprimables.
   Sert de « cahier » pendant les ateliers 1 à 4 ; se ferme pour l'atelier 5. */

(function () {

  let hote, filtre, recherche, detail;

  function demarrer(el) {
    hote = el; filtre = null; recherche = ''; detail = null;
    rendre();
  }

  function liste() {
    let t = DONNEES.symboles;
    if (filtre) t = t.filter(function (s) { return s.groupe === filtre; });
    if (recherche) {
      const r = recherche.toLowerCase();
      t = t.filter(function (s) {
        return (s.nom + ' ' + s.fonction + ' ' + s.indice).toLowerCase().indexOf(r) >= 0;
      });
    }
    return t;
  }

  function rendre() {
    let h = '<h2 style="font-size:24px">La bibliothèque — 49 symboles</h2>';
    h += '<p class="intro">Tirés de la bibliothèque de symboles normalisés inerWeb, ' +
         'complétés par les symboles redessinés d\'après le document de référence (pages 81 à 89).</p>';

    h += '<div class="carte" style="padding:12px 14px">';
    h += '<input type="search" id="rech" placeholder="Chercher un symbole, une fonction…" value="' +
         APP.echapper(recherche) + '" style="width:100%;font-family:inherit;font-size:17px;padding:9px 12px;' +
         'border:2px solid var(--bordure);border-radius:9px;margin-bottom:10px">';
    h += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
    h += '<button class="b secondaire" data-fam="" style="font-size:15px;padding:5px 13px">Toutes</button>';
    DONNEES.groupes.forEach(function (g) {
      h += '<button class="b secondaire" data-fam="' + g.cle + '" style="font-size:15px;padding:5px 13px;' +
           (filtre === g.cle ? 'background:' + g.couleur + ';color:#fff' : 'border-left:5px solid ' + g.couleur) +
           '">' + APP.echapper(g.nom) + '</button>';
    });
    h += '</div></div>';

    const t = liste();
    h += '<p style="font-size:16px;color:var(--texte-2);margin:6px 0 10px">' + t.length + ' symbole(s)</p>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px" id="grille"></div>';

    h += '<div class="barre-actions"><button class="b secondaire" onclick="window.print()">Imprimer la bibliothèque</button>' +
         '<button class="b secondaire" data-aller="hub">Retour au parcours</button></div>';

    hote.innerHTML = h;

    const g = document.getElementById('grille');
    t.forEach(function (s) {
      const b = document.createElement('button');
      b.className = 'vignette';
      b.type = 'button';
      b.style.borderLeft = '6px solid ' + APP.groupeDe(s.groupe).couleur;
      b.innerHTML = APP.symbole(s.id) + '<span class="nom">' + APP.echapper(s.nom) + '</span>';
      b.addEventListener('click', function () { detail = s; afficherDetail(s); });
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

  function afficherDetail(s) {
    const regle = DONNEES.regles.filter(function (x) { return x.cle === s.regle; })[0];
    const piege = s.piege ? DONNEES.pieges.filter(function (x) { return x.cle === s.piege; })[0] : null;

    let h = '<h2 style="font-size:24px">' + APP.echapper(s.nom) + '</h2>';
    h += '<div class="carte" style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap">';
    h += '<div>' + APP.symbole(s.id, 'grand') + '</div>';
    h += '<div style="flex:1;min-width:240px">';
    h += '<p style="font-size:15px;color:var(--texte-2);text-transform:uppercase;letter-spacing:.04em">' +
         APP.echapper(APP.groupeDe(s.groupe).nom) + ' · page ' + s.page + '</p>';
    h += '<p style="margin-top:8px"><strong>Fonction.</strong> ' + APP.echapper(s.fonction) + '</p>';
    h += '<p style="margin-top:8px"><strong>Comment le reconnaître.</strong> ' + APP.echapper(s.indice) + '</p>';
    h += '<p style="margin-top:8px"><strong>Ce qu\'il faut retenir.</strong> ' + APP.echapper(s.role) + '</p>';
    h += '</div></div>';

    if (regle) {
      h += '<div class="regle"><span class="cle">Règle ' + regle.cle + '</span>' +
           '<h3>' + APP.echapper(regle.titre) + '</h3><p>' + APP.echapper(regle.texte) + '</p></div>';
    }
    if (piege) {
      h += '<div class="carte" style="border-left:7px solid var(--rouge)"><h3>⚠ Piège — ' +
           APP.echapper(piege.titre) + '</h3><p>' + APP.echapper(piege.texte) + '</p>' +
           '<div class="duel" style="margin-top:12px">' +
           piege.paire.map(function (id) {
             return '<div style="text-align:center">' + APP.symbole(id) +
                    '<div style="font-weight:700;font-size:16px">' + APP.echapper(APP.SYM[id].nom) + '</div></div>';
           }).join('') + '</div></div>';
    }

    h += '<div class="barre-actions"><button class="b secondaire" id="retour-biblio">← Retour à la bibliothèque</button>' +
         '<button class="b secondaire" data-aller="hub">Retour au parcours</button></div>';
    hote.innerHTML = h;
    document.getElementById('retour-biblio').addEventListener('click', function () { detail = null; rendre(); });
  }

  APP.enregistrer('biblio', 'ec-biblio', demarrer);

})();
