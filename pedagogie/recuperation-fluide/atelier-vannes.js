/* Atelier « L'ordre des vannes » — récupération de fluide sur MINIMAX-E.
   inerWeb Édu — F. Henninot.

   Trois écrans : deux remises en ordre (récupération, vidange) puis dix pièges
   en vrai/faux. Aucun gestionnaire onclick dans le HTML, aucune requête sortante,
   aucun stockage : la page est autonome et se remet à zéro au rechargement.

   Contenu construit d'après la notice constructeur MINIMAX-E
   (Advanced Test Products Europe, rév. 3 — 2008), diffusée par ERM Automatismes.
   Aucun passage du manuel n'est reproduit. */

'use strict';

/* ------------------------------------------------------------------ données */

const ORDRE_RECUPERATION = [
  "Vérifier que le filtre d'entrée est en place et repéré au bon fluide",
  "Retirer les obus Schrader et monter un flexible 3/8\" court à l'aspiration",
  "Poser la bouteille sur la balance et relever la masse brute avant",
  "Vérifier : inverseur noir sur RÉCUPÉRATION, vanne bleue et vanne rouge fermées",
  "Ouvrir lentement les vannes liquide et vapeur de l'installation",
  "Ouvrir la vanne liquide de la bouteille, puis la vanne rouge de sortie",
  "Mettre sous tension, puis appuyer 1 seconde sur Démarrage",
  "Ouvrir progressivement la vanne bleue d'entrée, en écoutant le compresseur"
];

const ORDRE_VIDANGE = [
  "Fermer les vannes liquide et vapeur de l'installation",
  "Fermer la vanne d'entrée bleue (CLOSED)",
  "Arrêter la machine",
  "Basculer l'inverseur noir sur VIDANGE",
  "Redémarrer et descendre au niveau de vide voulu",
  "Fermer les vannes de la bouteille, puis arrêter la machine",
  "Fermer la vanne rouge, remettre l'inverseur sur RÉCUPÉRATION"
];

const PIEGES = [
  {
    texte: "On peut basculer l'inverseur noir pendant que la machine tourne, à condition d'aller vite.",
    vrai: false,
    pourquoi: "Non. Basculer l'inverseur en marche met brutalement la HP en communication et fait couper le pressostat de sécurité taré à 38,5 bar. L'ordre est imposé : vanne bleue fermée → arrêt → inverseur → redémarrage."
  },
  {
    texte: "Une bouteille de récupération peut être remplie à 90 % en liquide s'il fait froid dans l'atelier.",
    vrai: false,
    pourquoi: "Non. La limite est de 80 % en liquide, quelle que soit la température au moment du remplissage. Une bouteille remplie à 90 % à 16 °C atteint 100 % dès 54 °C : elle n'a plus de volume d'expansion."
  },
  {
    texte: "Si le pressostat HP coupe pendant le remplissage, la première chose à vérifier est si la bouteille est sur-remplie.",
    vrai: true,
    pourquoi: "Oui. C'est la cause la plus fréquente, et la plus dangereuse. On arrête, on ferme, on cherche la cause. Le réarmement vient en dernier, jamais en premier."
  },
  {
    texte: "On peut utiliser une bouteille de fluide neuf comme bouteille de récupération.",
    vrai: false,
    pourquoi: "Non. Les bouteilles de fluide neuf ne sont pas conçues ni éprouvées pour cet usage. Seules des bouteilles de récupération éprouvées et dans leur validité sont autorisées."
  },
  {
    texte: "Un même filtre d'entrée peut servir pour le R134a puis pour le R404A.",
    vrai: false,
    pourquoi: "Non. Un filtre par fluide, repéré. Sinon on mélange les fluides — et un fluide mélangé n'est plus identifiable ni exploitable."
  },
  {
    texte: "Retirer les obus Schrader avant la récupération accélère l'opération.",
    vrai: true,
    pourquoi: "Oui. L'obus crée une perte de charge qui effondre le débit. Avec un flexible fin et long en plus, une récupération de quelques minutes peut durer des heures."
  },
  {
    texte: "La station de l'atelier, telle que sa notice la décrit, accepte le R32.",
    vrai: false,
    pourquoi: "Non. La notice de l'atelier (rév. 2008) ne liste que des fluides A1 et interdit les gaz inflammables ; le R32 est A2L. Des versions plus récentes de la machine sont annoncées A1/A2/A2L : on ne suppose pas, on lit la plaque et la notice de SA machine."
  },
  {
    texte: "Sans balance, on peut estimer la quantité récupérée à partir de la charge de plaque.",
    vrai: false,
    pourquoi: "Non. La charge de plaque est ce que le constructeur a prévu, pas ce qu'il y a réellement dans la machine le jour de l'intervention. Seule la pesée fait foi — et c'est elle qui part au registre."
  },
  {
    texte: "Refroidir la bouteille pour descendre plus bas en vide ne fonctionne que s'il y a déjà du liquide dedans.",
    vrai: true,
    pourquoi: "Oui. Il faut au moins 2,5 kg de fluide liquide dans la bouteille : c'est lui qui s'évapore et refroidit. Sur une bouteille sans liquide, la méthode ne donne rien ; il faut alors une bouteille tirée au vide."
  },
  {
    texte: "Il est acceptable de laisser s'échapper le fluide resté dans les flexibles au moment de la dépose.",
    vrai: false,
    pourquoi: "Non. Le rejet volontaire à l'atmosphère est interdit, quelle que soit la quantité. C'est aussi ce qui explique une partie de l'écart entre la charge de plaque et la quantité pesée."
  }
];

/* ------------------------------------------------------------- utilitaires */

const app = document.getElementById('app');

function vider(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function creer(balise, classe, texte) {
  const el = document.createElement(balise);
  if (classe) el.className = classe;
  if (texte !== undefined) el.textContent = texte;
  return el;
}

/* Mélange déterministe : même ordre de départ à chaque ouverture, pour que
   l'enseignant retrouve le même écran d'une classe à l'autre. */
function melangeFixe(liste) {
  const copie = liste.slice();
  const pas = [5, 2, 7, 1, 6, 3, 8, 4, 9, 0];
  const sortie = [];
  let i = 0;
  while (copie.length) {
    const k = pas[i % pas.length] % copie.length;
    sortie.push(copie.splice(k, 1)[0]);
    i += 1;
  }
  return sortie;
}

/* -------------------------------------------------------------- état global */

const etat = {
  ecran: 0,          // 0 et 1 = remises en ordre, 2 = pièges, 3 = bilan
  choix: [],         // remise en ordre courante
  corrige: false,
  piege: 0,
  reponduPiege: false,
  points: { ordre1: null, ordre2: null, pieges: 0 }
};

const ECRANS_ORDRE = [
  { titre: "1 · Mettre en route la récupération",
    consigne: "Clique les opérations dans l'ordre où tu les ferais. Clique une opération de ta liste pour la retirer.",
    cle: 'ordre1', liste: ORDRE_RECUPERATION },
  { titre: "2 · Vidanger la station",
    consigne: "Même principe. Attention : trois opérations d'affilée décident si le pressostat coupe ou non.",
    cle: 'ordre2', liste: ORDRE_VIDANGE }
];

/* ------------------------------------------------------ écrans « remise en ordre » */

function rendreOrdre() {
  const conf = ECRANS_ORDRE[etat.ecran];
  const melange = melangeFixe(conf.liste);

  vider(app);
  const carte = creer('div', 'carte');
  carte.appendChild(creer('h2', null, conf.titre));
  carte.appendChild(creer('p', 'progression', 'Écran ' + (etat.ecran + 1) + ' sur 3'));
  carte.appendChild(creer('div', 'consigne', conf.consigne));

  /* la liste construite par l'élève */
  carte.appendChild(creer('h3', null, 'Ma séquence'));
  const maListe = creer('div', 'pile');
  if (!etat.choix.length) {
    maListe.appendChild(creer('p', 'vide', 'Rien pour l\'instant. Commence par la première opération.'));
  }
  etat.choix.forEach(function (texte, index) {
    const b = creer('button', 'item');
    b.type = 'button';
    b.appendChild(creer('span', 'rang', String(index + 1) + '.'));
    b.appendChild(creer('span', null, texte));
    if (etat.corrige) {
      b.disabled = true;
      b.classList.add(texte === conf.liste[index] ? 'juste' : 'faux');
    } else {
      b.addEventListener('click', function () {
        etat.choix.splice(index, 1);
        rendreOrdre();
      });
    }
    maListe.appendChild(b);
  });
  carte.appendChild(maListe);

  /* les opérations restantes */
  if (!etat.corrige) {
    carte.appendChild(creer('h3', null, 'Opérations disponibles'));
    const dispo = creer('div', 'pile');
    melange.forEach(function (texte) {
      const b = creer('button', 'item');
      b.type = 'button';
      b.appendChild(creer('span', null, texte));
      if (etat.choix.indexOf(texte) !== -1) {
        b.disabled = true;
      } else {
        b.addEventListener('click', function () {
          etat.choix.push(texte);
          rendreOrdre();
        });
      }
      dispo.appendChild(b);
    });
    carte.appendChild(dispo);
  }

  /* retour de correction */
  if (etat.corrige) {
    const bons = etat.choix.filter(function (t, i) { return t === conf.liste[i]; }).length;
    const total = conf.liste.length;
    const retour = creer('div', 'retour ' + (bons === total ? 'ok' : 'ko'));
    retour.appendChild(creer('p', 'score', bons + ' opération(s) bien placée(s) sur ' + total));
    if (bons < total) {
      retour.appendChild(creer('p', null, 'La séquence attendue :'));
      const ol = document.createElement('ol');
      ol.style.margin = '6px 0 0 22px';
      conf.liste.forEach(function (t) { ol.appendChild(creer('li', null, t)); });
      retour.appendChild(ol);
    }
    if (conf.cle === 'ordre2') {
      retour.appendChild(creer('p', null,
        'À retenir : fermer la vanne bleue, arrêter la machine, puis seulement basculer l\'inverseur. ' +
        'Dans un autre ordre, le pressostat 38,5 bar coupe.'));
    }
    carte.appendChild(retour);
  }

  /* boutons */
  const actions = creer('div', 'actions');
  if (!etat.corrige) {
    const valider = creer('button', 'cta', 'Vérifier ma séquence');
    valider.type = 'button';
    valider.disabled = etat.choix.length !== conf.liste.length;
    valider.addEventListener('click', function () {
      etat.corrige = true;
      etat.points[conf.cle] = etat.choix.filter(function (t, i) { return t === conf.liste[i]; }).length;
      rendreOrdre();
    });
    actions.appendChild(valider);

    const raz = creer('button', 'cta secondaire', 'Tout effacer');
    raz.type = 'button';
    raz.disabled = !etat.choix.length;
    raz.addEventListener('click', function () { etat.choix = []; rendreOrdre(); });
    actions.appendChild(raz);
  } else {
    const suite = creer('button', 'cta', etat.ecran === 0 ? 'Écran suivant' : 'Passer aux pièges');
    suite.type = 'button';
    suite.addEventListener('click', function () {
      etat.ecran += 1;
      etat.choix = [];
      etat.corrige = false;
      rendre();
    });
    actions.appendChild(suite);

    const refaire = creer('button', 'cta secondaire', 'Refaire cet écran');
    refaire.type = 'button';
    refaire.addEventListener('click', function () {
      etat.choix = [];
      etat.corrige = false;
      etat.points[conf.cle] = null;
      rendreOrdre();
    });
    actions.appendChild(refaire);
  }
  carte.appendChild(actions);

  app.appendChild(carte);
}

/* ------------------------------------------------------------ écran « pièges » */

function rendrePieges() {
  const item = PIEGES[etat.piege];

  vider(app);
  const carte = creer('div', 'carte');
  carte.appendChild(creer('h2', null, '3 · Les pièges'));
  carte.appendChild(creer('p', 'progression',
    'Affirmation ' + (etat.piege + 1) + ' sur ' + PIEGES.length + ' · ' + etat.points.pieges + ' bonne(s) réponse(s)'));
  carte.appendChild(creer('div', 'consigne', 'Vrai ou faux ? Réponds, puis lis l\'explication avant de continuer.'));
  carte.appendChild(creer('p', 'affirmation', '« ' + item.texte + ' »'));

  const zone = creer('div', 'vf');
  [['VRAI', true], ['FAUX', false]].forEach(function (paire) {
    const b = creer('button', 'vf-btn', paire[0]);
    b.type = 'button';
    if (etat.reponduPiege) {
      b.disabled = true;
    } else {
      b.addEventListener('click', function () {
        etat.reponduPiege = true;
        etat.derniereReponse = paire[1];
        if (paire[1] === item.vrai) etat.points.pieges += 1;
        rendrePieges();
      });
    }
    zone.appendChild(b);
  });
  carte.appendChild(zone);

  if (etat.reponduPiege) {
    const juste = etat.derniereReponse === item.vrai;
    const retour = creer('div', 'retour ' + (juste ? 'ok' : 'ko'));
    retour.appendChild(creer('p', 'score', juste ? 'Bonne réponse' : 'Réponse fausse'));
    retour.appendChild(creer('p', null, item.pourquoi));
    carte.appendChild(retour);

    const actions = creer('div', 'actions');
    const suite = creer('button', 'cta', etat.piege === PIEGES.length - 1 ? 'Voir mon bilan' : 'Affirmation suivante');
    suite.type = 'button';
    suite.addEventListener('click', function () {
      if (etat.piege === PIEGES.length - 1) { etat.ecran = 3; }
      else { etat.piege += 1; }
      etat.reponduPiege = false;
      rendre();
    });
    actions.appendChild(suite);
    carte.appendChild(actions);
  }

  app.appendChild(carte);
}

/* -------------------------------------------------------------- écran bilan */

function rendreBilan() {
  vider(app);
  const carte = creer('div', 'carte');
  carte.appendChild(creer('h2', null, 'Bilan'));

  const o1 = etat.points.ordre1 === null ? 0 : etat.points.ordre1;
  const o2 = etat.points.ordre2 === null ? 0 : etat.points.ordre2;
  const total = o1 + o2 + etat.points.pieges;
  const max = ORDRE_RECUPERATION.length + ORDRE_VIDANGE.length + PIEGES.length;

  carte.appendChild(creer('p', 'score', total + ' / ' + max));
  const ul = document.createElement('ul');
  ul.style.margin = '6px 0 12px 22px';
  ul.appendChild(creer('li', null, 'Mise en route : ' + o1 + ' / ' + ORDRE_RECUPERATION.length));
  ul.appendChild(creer('li', null, 'Vidange de la station : ' + o2 + ' / ' + ORDRE_VIDANGE.length));
  ul.appendChild(creer('li', null, 'Pièges : ' + etat.points.pieges + ' / ' + PIEGES.length));
  carte.appendChild(ul);

  const message = total === max
    ? "Séquences maîtrisées. Reste le vrai test : le faire, en atelier, avec les EPI et la balance."
    : (total >= max * 0.7
      ? "Bonne base. Reprends les écrans où tu as perdu des points avant la séance."
      : "À reprendre. Relis la notice de la station, puis refais l'atelier : ces séquences ne s'improvisent pas devant la machine.");
  carte.appendChild(creer('div', 'retour ' + (total >= max * 0.7 ? 'ok' : 'ko'), message));

  const rappel = creer('div', 'consigne');
  rappel.appendChild(creer('p', null,
    'Les trois chiffres de la séance : 80 % de remplissage maximal · 38,5 bar au pressostat HP · ' +
    '0 gramme qu\'on a le droit de rejeter à l\'atmosphère.'));
  carte.appendChild(rappel);

  const actions = creer('div', 'actions');
  const recommencer = creer('button', 'cta', 'Tout recommencer');
  recommencer.type = 'button';
  recommencer.addEventListener('click', function () {
    etat.ecran = 0; etat.choix = []; etat.corrige = false;
    etat.piege = 0; etat.reponduPiege = false;
    etat.points = { ordre1: null, ordre2: null, pieges: 0 };
    rendre();
  });
  actions.appendChild(recommencer);
  carte.appendChild(actions);

  app.appendChild(carte);
}

/* ------------------------------------------------------------------ routeur */

function rendre() {
  if (etat.ecran < 2) rendreOrdre();
  else if (etat.ecran === 2) rendrePieges();
  else rendreBilan();
  window.scrollTo(0, 0);
}

rendre();
