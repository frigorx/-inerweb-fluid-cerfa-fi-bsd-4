/* L'entraînement maison — répétition espacée (système de Leitner à 5 boîtes).
   Un symbole raté redescend en boîte 1 et revient dès le lendemain ;
   un symbole su monte d'une boîte et s'éloigne dans le temps.
   Tout est stocké sur l'appareil de l'élève : aucun envoi, aucun compte. */

(function () {

  const INTERVALLES = [0, 1, 2, 4, 7, 14];   // en jours, indexés par n° de boîte
  const PAR_SEANCE = 15;

  let hote, phase, file, k, vue, bilanSeance;

  function jour() { return Math.floor(Date.now() / 86400000); }

  function etatMaison() {
    if (!APP.etat.maison) {
      APP.etat.maison = { cartes: {}, seances: 0, dernier: null };
      DONNEES.symboles.forEach(function (s) {
        APP.etat.maison.cartes[s.id] = { boite: 1, du: jour() };
      });
      APP.sauver();
    }
    // Un symbole ajouté après coup entre naturellement en boîte 1.
    DONNEES.symboles.forEach(function (s) {
      if (!APP.etat.maison.cartes[s.id]) APP.etat.maison.cartes[s.id] = { boite: 1, du: jour() };
    });
    return APP.etat.maison;
  }

  function dues() {
    const m = etatMaison(), j = jour();
    return DONNEES.symboles.filter(function (s) { return m.cartes[s.id].du <= j; });
  }

  function demarrer(el) {
    hote = el; phase = 'accueil';
    rendre();
  }

  function rendre() {
    if (phase === 'accueil') return accueil();
    if (phase === 'seance') return carte();
    if (phase === 'fin') return fin();
  }

  /* ------------------------------------------------------------- accueil */

  function accueil() {
    const m = etatMaison();
    const d = dues();
    const parBoite = [0, 0, 0, 0, 0, 0];
    DONNEES.symboles.forEach(function (s) { parBoite[m.cartes[s.id].boite]++; });

    let h = '<h2 style="font-size:24px">L\'entraînement maison</h2>';
    h += '<p class="intro">Quelques minutes par jour, sept jours de suite. ' +
         'Chaque symbole que tu sais s\'éloigne dans le temps ; chaque symbole que tu rates revient dès demain. ' +
         'C\'est le seul moyen connu de retenir 49 symboles sans y passer des heures.</p>';

    h += '<div class="carte"><h3>Où tu en es</h3><div class="boites">';
    for (let b = 1; b <= 5; b++) {
      h += '<div class="boite"><div class="n">' + parBoite[b] + '</div>' +
           '<div class="l">Boîte ' + b + '<br><span style="font-size:13px">revient dans ' +
           INTERVALLES[b] + ' j</span></div></div>';
    }
    h += '</div>';
    h += '<p style="margin-top:14px;font-size:17px"><strong>' + d.length + '</strong> symbole(s) à revoir aujourd\'hui' +
         (m.seances ? ' · ' + m.seances + ' séance(s) déjà faite(s)' : '') + '.</p>';
    h += '</div>';

    if (!d.length) {
      h += '<div class="note">Rien à réviser aujourd\'hui : tout est à jour. ' +
           'Reviens demain — ou lance quand même une séance libre pour t\'entretenir.</div>';
    }

    h += '<div class="barre-actions">';
    h += '<button class="b" id="go">' + (d.length ? 'Réviser ' + Math.min(d.length, PAR_SEANCE) + ' symboles' : 'Séance libre') + '</button>';
    h += '<button class="b secondaire" id="raz">Repartir de zéro</button>';
    h += '<button class="b secondaire" data-aller="hub">Retour au parcours</button></div>';

    h += '<div class="carte"><h3>Hors connexion</h3>' +
         '<p style="font-size:16px;color:var(--texte-2)">Une fois cette page ouverte une première fois, ' +
         'elle fonctionne sans internet. Sur téléphone, utilise « Ajouter à l\'écran d\'accueil » : ' +
         'l\'entraînement s\'ouvre alors comme une application.</p></div>';

    hote.innerHTML = h;

    document.getElementById('go').addEventListener('click', function () {
      const src = d.length ? d : DONNEES.symboles;
      file = APP.piocher(src, Math.min(PAR_SEANCE, src.length));
      k = 0; vue = false;
      bilanSeance = { su: 0, rate: 0, rates: [] };
      phase = 'seance'; rendre();
    });
    document.getElementById('raz').addEventListener('click', function () {
      if (confirm('Remettre toutes les boîtes à zéro ?')) {
        APP.etat.maison = null; APP.sauver(); rendre();
      }
    });
  }

  /* -------------------------------------------------------------- séance */

  function carte() {
    if (k >= file.length) { phase = 'fin'; return rendre(); }
    const s = file[k];
    const m = etatMaison();

    let h = '<h2 style="font-size:24px">Séance du jour</h2>';
    h += APP.jauge(k, file.length);
    h += '<div class="question" style="text-align:center">';
    h += '<div style="display:flex;justify-content:center">' + APP.symbole(s.id, 'grand') + '</div>';

    if (!vue) {
      h += '<p class="consigne" style="margin-top:14px">Comment s\'appelle ce symbole, et à quoi sert-il ?</p>';
      h += '<p style="color:var(--texte-2);font-size:16px">Réponds à voix haute, puis retourne la carte.</p>';
      h += '<div class="barre-actions" style="justify-content:center">' +
           '<button class="b" id="retourner">Retourner la carte</button></div>';
    } else {
      h += '<p style="font-size:22px;font-weight:700;font-family:\'Trebuchet MS\',sans-serif;margin-top:12px">' +
           APP.echapper(s.nom) + '</p>';
      h += '<p style="margin-top:8px;text-align:left">' + APP.echapper(s.fonction) + '</p>';
      h += '<p style="margin-top:8px;text-align:left;color:var(--texte-2);font-size:16px">' +
           APP.echapper(s.indice) + '</p>';
      h += '<p style="margin-top:10px;font-size:15px;color:var(--texte-2)">Boîte actuelle : ' +
           m.cartes[s.id].boite + ' / 5</p>';
      h += '<p class="consigne" style="margin-top:14px">Tu le savais ?</p>';
      h += '<div class="barre-actions" style="justify-content:center">' +
           '<button class="b" id="oui">Oui — je le savais</button>' +
           '<button class="b secondaire" id="non">Non — à revoir</button></div>';
    }
    h += '</div>';
    hote.innerHTML = h;

    if (!vue) {
      document.getElementById('retourner').addEventListener('click', function () { vue = true; rendre(); });
    } else {
      document.getElementById('oui').addEventListener('click', function () { noter(s, true); });
      document.getElementById('non').addEventListener('click', function () { noter(s, false); });
    }
  }

  function noter(s, su) {
    const m = etatMaison();
    const c = m.cartes[s.id];
    if (su) { c.boite = Math.min(5, c.boite + 1); bilanSeance.su++; }
    else { c.boite = 1; bilanSeance.rate++; bilanSeance.rates.push(s); }
    c.du = jour() + INTERVALLES[c.boite];
    APP.sauver();
    k++; vue = false;
    rendre();
  }

  function fin() {
    const m = etatMaison();
    m.seances++; m.dernier = jour();
    APP.sauver();

    let h = '<h2 style="font-size:24px">Séance terminée</h2>';
    h += '<div class="carte"><p style="font-size:20px"><strong>' + bilanSeance.su + '</strong> su · <strong>' +
         bilanSeance.rate + '</strong> à revoir.</p>';
    h += '<p style="margin-top:8px;color:var(--texte-2)">Les symboles ratés reviennent demain. ' +
         'Les autres s\'éloignent : c\'est exactement ce qu\'il faut.</p></div>';

    if (bilanSeance.rates.length) {
      h += '<div class="carte"><h3>À revoir demain</h3>' +
           '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:10px">';
      bilanSeance.rates.forEach(function (s) {
        h += '<div class="vignette" style="cursor:default">' + APP.symbole(s.id) +
             '<span class="nom">' + APP.echapper(s.nom) + '</span></div>';
      });
      h += '</div></div>';
    }
    h += '<div class="barre-actions"><button class="b" id="encore">Nouvelle séance</button>' +
         '<button class="b secondaire" data-aller="hub">Retour au parcours</button></div>';
    hote.innerHTML = h;
    document.getElementById('encore').addEventListener('click', function () { phase = 'accueil'; rendre(); });
  }

  APP.enregistrer('maison', 'ec-maison', demarrer);

})();
