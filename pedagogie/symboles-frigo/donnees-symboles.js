/* Généré automatiquement — ne pas éditer à la main.
   Source : outils/generer-donnees.py  */
const DONNEES = {
 "meta": {
  "titre": "Symboles normalisés des éléments thermodynamiques",
  "source": "Bibliothèque inerWeb Symboles (QElectroTech) + symboles redessinés d'après le document de référence, p. 81 à 89",
  "auteur": "F. Henninot — inerWeb Édu",
  "nb": 53
 },
 "groupes": [
  {
   "cle": "A",
   "nom": "Machines tournantes",
   "couleur": "#1b3a63"
  },
  {
   "cle": "B",
   "nom": "Échangeurs",
   "couleur": "#0e93a3"
  },
  {
   "cle": "C",
   "nom": "Détendeurs",
   "couleur": "#7c3aed"
  },
  {
   "cle": "D",
   "nom": "Filtration et contrôle visuel",
   "couleur": "#b45309"
  },
  {
   "cle": "E",
   "nom": "Vannes et sécurités mécaniques",
   "couleur": "#16a34a"
  },
  {
   "cle": "F",
   "nom": "Réservoirs et accessoires de ligne",
   "couleur": "#dc2626"
  },
  {
   "cle": "G",
   "nom": "Instruments (bulles)",
   "couleur": "#2563eb"
  },
  {
   "cle": "H",
   "nom": "Régulateurs de pression",
   "couleur": "#ff6b35"
  },
  {
   "cle": "I",
   "nom": "Circuits réels (hors document)",
   "couleur": "#0f766e"
  }
 ],
 "regles": [
  {
   "cle": "R1",
   "titre": "Un cercle, c'est une machine qui tourne",
   "texte": "Compresseur, moteur, ventilateur, pompe : tout ce qui tourne est enfermé dans un cercle. Ce qu'on dessine à l'intérieur ne dit pas la fonction — elle est toujours la même — mais la technologie.",
   "exemple": "compresseur_scroll"
  },
  {
   "cle": "R2",
   "titre": "Un rectangle à ailettes avec une hélice, c'est un échangeur à air",
   "texte": "Le peigne représente les ailettes, l'hélice le ventilateur. Le condenseur et l'évaporateur à air ont exactement le même dessin : seules les lettres CD ou EV écrites dedans les distinguent.",
   "exemple": "condenseur_a_air"
  },
  {
   "cle": "R3",
   "titre": "Un zigzag dans un corps fermé, c'est un échange sans contact",
   "texte": "Le zigzag, c'est le fluide frigorigène. La flèche traversante, c'est l'eau. Les deux circulent sans jamais se toucher. Cercle = échangeur à eau, rectangle croisé = échangeur à plaques.",
   "exemple": "condenseur_a_eau"
  },
  {
   "cle": "R4",
   "titre": "Deux triangles pointe contre pointe, c'est une vanne",
   "texte": "Le corps de la vanne est toujours le même. Ce qu'on pose DESSUS dit qui la commande : un volant en H = la main, une bobine = l'électricité, un bulbe = la température, un ressort = la pression.",
   "exemple": "electrovanne"
  },
  {
   "cle": "R5",
   "titre": "Un rectangle barré d'une croix, c'est un filtre",
   "texte": "Trait plein = filtre à huile. Trait pointillé = filtre déshydrateur (le pointillé figure le déshydratant). Le même rectangle avec une cartouche dessinée = filtre d'aspiration.",
   "exemple": "filtre_deshydrateur"
  },
  {
   "cle": "R6",
   "titre": "Une bulle avec des lettres, c'est un instrument",
   "texte": "La 1re lettre dit CE QU'ON MESURE : P = pression, T = température. La lettre suivante dit CE QU'IL FAIT : Z = sécurité (il coupe), S ou C = régulation (il commande), I = indication (il affiche). Les lettres L et H disent le seuil : L = bas (Low), H = haut (High).",
   "exemple": "bulle_PZH"
  },
  {
   "cle": "R7",
   "titre": "La forme du corps dit ce qui se passe dedans",
   "texte": "Un fond pointu vers le bas = quelque chose se sépare et tombe au fond (huile, liquide). Un corps cylindrique lisse = on stocke. Un corps cloisonné = on casse les pulsations.",
   "exemple": "separateur_huile"
  },
  {
   "cle": "R8",
   "titre": "Trait plein = du fluide. Trait pointillé = de l'information",
   "texte": "Sur un schéma, le pointillé ne transporte jamais de fluide : il relie un capteur à l'organe qu'il pilote, ou montre où une pression est prise. Suivre les pointillés, c'est lire la régulation.",
   "exemple": "regulateur_kvr"
  }
 ],
 "pieges": [
  {
   "cle": "P1",
   "titre": "Condenseur à air / Évaporateur à air",
   "texte": "Symbole identique. Seules les lettres CD ou EV écrites dans le rectangle les distinguent. Sur un schéma sans lettres, c'est la position dans le circuit qui tranche : après le compresseur = condenseur, après le détendeur = évaporateur.",
   "paire": [
    "condenseur_a_air",
    "evaporateur_a_air"
   ]
  },
  {
   "cle": "P2",
   "titre": "Échangeurs à eau et à plaques : condenseur ou évaporateur ?",
   "texte": "Les symboles sont rigoureusement identiques dans les deux cas. Seule la place dans le circuit répond.",
   "paire": [
    "condenseur_a_eau",
    "evaporateur_a_eau"
   ]
  },
  {
   "cle": "P3",
   "titre": "Tour ouverte / tour fermée",
   "texte": "Même trapèze, même ventilateur, même douchette. La tour FERMÉE a un serpentin en plus : l'eau du circuit ne touche jamais l'air.",
   "paire": [
    "tour_refroidissement_ouverte",
    "tour_refroidissement_fermee"
   ]
  },
  {
   "cle": "P4",
   "titre": "Les trois détendeurs",
   "texte": "Tous font la même chose : liquide HP → liquide BP. Le capillaire ne se règle pas, le thermostatique se règle par la surchauffe (bulbe), l'électronique est piloté.",
   "paire": [
    "detendeur_thermostatique",
    "detendeur_capillaire"
   ]
  },
  {
   "cle": "P5",
   "titre": "Filtre à huile / filtre déshydrateur",
   "texte": "Même rectangle croisé. Traits PLEINS = filtre à huile (circuit d'huile). Traits POINTILLÉS = filtre déshydrateur (ligne liquide).",
   "paire": [
    "filtre_huile",
    "filtre_deshydrateur"
   ]
  },
  {
   "cle": "P6",
   "titre": "Voyant liquide / voyant huile",
   "texte": "Hublot VIDE = voyant liquide. Hublot avec un POINT au centre = voyant huile.",
   "paire": [
    "voyant_liquide",
    "voyant_huile"
   ]
  },
  {
   "cle": "P7",
   "titre": "Clapet de retenue / soupape de retenue",
   "texte": "Le clapet impose un sens, point. La soupape impose un sens ET s'ouvre à une pression de tarage : le ressort dessiné est la différence.",
   "paire": [
    "clapet_retenue",
    "soupape_retenue"
   ]
  },
  {
   "cle": "P8",
   "titre": "Séparateur d'huile / bouteille anti-coup de liquide",
   "texte": "Même corps pointu vers le bas. Le séparateur d'huile a un FLOTTEUR dessiné à l'intérieur ; la bouteille anti-coup n'en a pas. Et ils ne sont pas au même endroit : séparateur au refoulement, anti-coup à l'aspiration.",
   "paire": [
    "separateur_huile",
    "bouteille_anticoup"
   ]
  },
  {
   "cle": "P9",
   "titre": "Bouteille liquide / réservoir d'huile",
   "texte": "Deux corps lisses. La bouteille liquide est couchée à fonds bombés sur la ligne liquide ; le réservoir d'huile est vertical, sur le circuit d'huile.",
   "paire": [
    "bouteille_liquide",
    "reservoir_huile"
   ]
  },
  {
   "cle": "P10",
   "titre": "Z ou S : sécurité ou régulation ?",
   "texte": "PZL et PZH COUPENT l'installation (sécurité). PSL et PSH la font fonctionner normalement (régulation). Confondre les deux, c'est confondre un organe de sécurité avec un organe de conduite.",
   "paire": [
    "bulle_PZH",
    "bulle_PSH"
   ]
  },
  {
   "cle": "P11",
   "titre": "TC, TZ, TI : trois thermostats ? Non.",
   "texte": "TC/TS régule (il commande). TZ protège (il coupe). TI n'est PAS un thermostat : il indique une température, il ne commande rien.",
   "paire": [
    "bulle_TC",
    "bulle_TI"
   ]
  },
  {
   "cle": "P12",
   "titre": "KVR, KVP, KVC, KVL",
   "texte": "KVR = pression de condensation (côté HP). KVP = pression d'évaporation (côté BP, sortie évaporateur). KVC = capacité (by-pass). KVL = démarrage (bride l'aspiration au lancement).",
   "paire": [
    "regulateur_kvr",
    "regulateur_kvp"
   ]
  }
 ],
 "symboles": [
  {
   "id": "compresseur_piston",
   "nom": "Compresseur à piston",
   "groupe": "A",
   "regle": "R1",
   "page": 81,
   "fonction": "Aspire le fluide frigorigène gazeux en BP et basse température, puis le comprime : il ressort gaz HP et haute température.",
   "indice": "Dans le cercle, un piston vu de profil : une tige et sa tête plate.",
   "role": "Il fait circuler le fluide. C'est le cœur de l'installation.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24.0 -20.0 50 40\" overflow=\"visible\"><circle cx=\"0.0\" cy=\"0.0\" r=\"15.0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-15\" y1=\"0\" x2=\"-16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"15\" y1=\"0\" x2=\"16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-13\" x2=\"13\" y2=\"-7\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"13\" x2=\"13\" y2=\"7\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-4\" y1=\"0\" x2=\"5\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-5\" y1=\"-5\" x2=\"-5\" y2=\"5\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Un bloc lourd, en fonte ou en acier, avec son moteur électrique intégré ou accouplé. Dedans, un ou plusieurs pistons montés sur un vilebrequin — comme dans un moteur de voiture, sauf qu'ici ils compriment un gaz au lieu de le faire exploser.",
   "probleme": "Sans lui, rien ne bouge. Le fluide resterait là où il est et il n'y aurait aucun froid : c'est le seul organe du circuit qui apporte de l'énergie.",
   "ou": "Au point bas du circuit. Il aspire ce qui vient de l'évaporateur et refoule vers le condenseur."
  },
  {
   "id": "compresseur_vis",
   "nom": "Compresseur à vis",
   "groupe": "A",
   "regle": "R1",
   "page": 81,
   "fonction": "Même fonction : aspirer en BP, comprimer, refouler en HP. Technologie à deux rotors hélicoïdaux.",
   "indice": "Dans le cercle, deux chevrons superposés : le filet des vis.",
   "role": "Fortes puissances, fonctionnement continu.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24.0 -20.0 50 40\" overflow=\"visible\"><circle cx=\"0.0\" cy=\"0.0\" r=\"15.0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-15\" y1=\"0\" x2=\"-16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"15\" y1=\"0\" x2=\"16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-13\" x2=\"13\" y2=\"-7\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"13\" x2=\"13\" y2=\"7\" stroke=\"#000\" stroke-width=\"1\"/>\n<polyline points=\"0,-5 5,0 0,5\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<polyline points=\"-4,-5 1,0 -4,5\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Deux rotors hélicoïdaux, comme deux grosses vis imbriquées qui tournent l'une contre l'autre. Le gaz est pris entre les filets et poussé vers la sortie dans un volume qui se réduit.",
   "probleme": "Un piston travaille par à-coups. Une vis tourne en continu, sans pulsation — c'est ce qu'on cherche sur les fortes puissances qui marchent des mois d'affilée.",
   "ou": "Même place que tout compresseur. On le trouve en industrie et sur les grosses centrales."
  },
  {
   "id": "compresseur_scroll",
   "nom": "Compresseur scroll",
   "groupe": "A",
   "regle": "R1",
   "page": 81,
   "fonction": "Même fonction. Compression par deux spirales imbriquées, l'une fixe, l'autre orbitale.",
   "indice": "Dans le cercle, une spirale. Le dessin dit la technologie.",
   "role": "Très répandu en climatisation. Silencieux.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24.0 -20.0 50 40\" overflow=\"visible\"><circle cx=\"0.0\" cy=\"0.0\" r=\"15.0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-15\" y1=\"0\" x2=\"-16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"15\" y1=\"0\" x2=\"16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-13\" x2=\"13\" y2=\"-7\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"13\" x2=\"13\" y2=\"7\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 4.50 A 4.50 4.50 0 0 1 -0.00 -4.50\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 -2.50 A 3.50 3.50 0 0 1 0.00 4.50\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 2.50 A 2.50 2.50 0 0 1 -0.00 -2.50\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 -0.50 A 1.50 1.50 0 0 1 0.00 2.50\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Deux spirales imbriquées. L'une est fixe, l'autre décrit un petit cercle sans tourner sur elle-même. Le gaz est emprisonné entre les spires et poussé vers le centre.",
   "probleme": "Peu de pièces en mouvement, donc peu de bruit et peu d'usure. C'est ce qui l'a imposé en climatisation, là où le matériel est près des gens.",
   "ou": "Même place que tout compresseur. Très répandu en climatisation et en pompe à chaleur."
  },
  {
   "id": "compresseur_rotatif",
   "nom": "Compresseur à piston rotatif",
   "groupe": "A",
   "regle": "R1",
   "page": 81,
   "fonction": "Même fonction. Un rotor excentré balaie le volume de compression.",
   "indice": "Dans le cercle, un rotor décentré et sa palette.",
   "role": "Petites puissances : froid domestique, PAC air/air.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24.0 -20.0 50 40\" overflow=\"visible\"><circle cx=\"0.0\" cy=\"0.0\" r=\"15.0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"0.0\" cy=\"0.0\" r=\"3.5\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"-2\" x2=\"0\" y2=\"2\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"3\" y1=\"0\" x2=\"0\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-15\" y1=\"0\" x2=\"-16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"15\" y1=\"0\" x2=\"16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-13\" x2=\"13\" y2=\"-7\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"13\" x2=\"13\" y2=\"7\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Un rotor décentré qui roule à l'intérieur d'un cylindre, avec une palette coulissante qui sépare le côté aspiration du côté refoulement.",
   "probleme": "Compact et bon marché. C'est ce qu'il faut quand la puissance est faible et la place comptée.",
   "ou": "Froid domestique, petits climatiseurs, PAC air/air."
  },
  {
   "id": "compresseur_centrifuge",
   "nom": "Compresseur centrifuge",
   "groupe": "A",
   "regle": "R1",
   "page": 81,
   "fonction": "Même fonction. La compression est obtenue par la force centrifuge d'une roue à très haute vitesse.",
   "indice": "Dans le cercle, une roue vue de face : un moyeu central et l'ouïe.",
   "role": "Très grosses puissances : groupes d'eau glacée industriels.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -24 48 48\" overflow=\"visible\"><circle cx=\"0\" cy=\"0\" r=\"15\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 0,-15 A 16,16 0 0 1 0,15\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 0,-15 A 16,16 0 0 0 0,15\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><circle cx=\"0\" cy=\"0\" r=\"5.5\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"0\" y1=\"-15\" x2=\"0\" y2=\"-22\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"15\" x2=\"0\" y2=\"22\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Une roue à aubes qui tourne très vite, comme une turbine. Le gaz est projeté vers l'extérieur par la force centrifuge, et cette vitesse se transforme en pression.",
   "probleme": "Il n'y a pas de compresseur à pistons capable d'avaler les débits d'un groupe d'eau glacée industriel. Le centrifuge, si.",
   "ou": "Très grosses puissances : groupes d'eau glacée de bâtiments tertiaires ou industriels."
  },
  {
   "id": "moteur_electrique",
   "nom": "Moteur électrique",
   "groupe": "A",
   "regle": "R1",
   "page": 81,
   "fonction": "Convertit l'énergie électrique en énergie mécanique pour entraîner divers équipements.",
   "indice": "Un cercle et une lettre : la lettre suffit à dire ce que c'est.",
   "role": "Il entraîne le compresseur, le ventilateur ou la pompe.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-20 -20 46 40\" overflow=\"visible\"><circle cx=\"0\" cy=\"0\" r=\"15\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"7\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"20\" font-weight=\"700\" fill=\"#000\">M</text><line x1=\"15\" y1=\"0\" x2=\"24\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un moteur électrique ordinaire, avec son arbre et sa plaque signalétique.",
   "probleme": "Il faut bien quelque chose pour faire tourner le compresseur, le ventilateur ou la pompe.",
   "ou": "Partout où quelque chose tourne. Intégré au compresseur s'il est hermétique, séparé s'il est ouvert."
  },
  {
   "id": "condenseur_a_air",
   "nom": "Condenseur à air",
   "groupe": "B",
   "regle": "R2",
   "page": 82,
   "marque": "CD",
   "fonction": "Refroidit et condense le fluide frigorigène : il le fait passer de gaz HP à liquide HP.",
   "indice": "Un rectangle, un peigne d'ailettes, une hélice. Et surtout : les deux lettres écrites dedans.",
   "role": "Il évacue la chaleur vers l'air extérieur.",
   "piege": "P1",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25.0 -25.0 60 60\" overflow=\"visible\"><rect x=\"-18\" y=\"-20\" width=\"36\" height=\"48\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-14\" y1=\"16\" x2=\"-14\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"7\" y1=\"16\" x2=\"7\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"14\" y1=\"16\" x2=\"14\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"16\" x2=\"-7\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"16\" x2=\"0\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-19\" y1=\"20\" x2=\"19\" y2=\"20\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"0.0\" cy=\"-2.0\" r=\"15.0\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"7\" y1=\"-15\" x2=\"13\" y2=\"5\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -1.00 -2.00 A 1.00 1.00 0 0 1 0.00 -1.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-15\" x2=\"-13\" y2=\"5\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 6.00 5.00 A 6.00 6.00 0 0 1 0.00 -1.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -7.00 4.00 A 6.00 6.00 0 0 1 -1.00 -2.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 -1.00 A 6.00 6.00 0 0 1 -6.00 5.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -6.00 5.00 A 1.00 1.00 0 0 1 -7.00 4.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 1.00 -2.00 A 6.00 6.00 0 0 1 7.00 4.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 -1.00 A 1.00 1.00 0 0 1 1.00 -2.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 7.00 4.00 A 1.00 1.00 0 0 1 6.00 5.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<ellipse cx=\"0.0\" cy=\"-7.0\" rx=\"2.5\" ry=\"4.5\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-19\" cy=\"20\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"19\" cy=\"20\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Une batterie : des tubes de cuivre qui traversent des centaines d'ailettes en aluminium serrées les unes contre les autres, et un ou plusieurs ventilateurs qui soufflent de l'air au travers.",
   "probleme": "La chaleur prise dans la chambre doit bien partir quelque part. Le condenseur la rejette dans l'air extérieur.",
   "ou": "Après le compresseur. Le plus souvent dehors, sur un toit ou une façade."
  },
  {
   "id": "evaporateur_a_air",
   "nom": "Évaporateur à air",
   "groupe": "B",
   "regle": "R2",
   "page": 82,
   "marque": "EV",
   "fonction": "Vaporise le fluide frigorigène en absorbant de la chaleur : il le fait passer de liquide BP à gaz BP.",
   "indice": "Exactement le même dessin que le condenseur à air. Seules les lettres changent.",
   "role": "Il produit le froid dans la chambre ou le local.",
   "piege": "P1",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25.0 -25.0 60 60\" overflow=\"visible\"><rect x=\"-18\" y=\"-20\" width=\"36\" height=\"48\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-14\" y1=\"16\" x2=\"-14\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"7\" y1=\"16\" x2=\"7\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"14\" y1=\"16\" x2=\"14\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"16\" x2=\"-7\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"16\" x2=\"0\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-19\" y1=\"20\" x2=\"19\" y2=\"20\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"0.0\" cy=\"-2.0\" r=\"15.0\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"7\" y1=\"-15\" x2=\"13\" y2=\"5\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -1.00 -2.00 A 1.00 1.00 0 0 1 0.00 -1.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-15\" x2=\"-13\" y2=\"5\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 6.00 5.00 A 6.00 6.00 0 0 1 0.00 -1.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -7.00 4.00 A 6.00 6.00 0 0 1 -1.00 -2.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 -1.00 A 6.00 6.00 0 0 1 -6.00 5.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -6.00 5.00 A 1.00 1.00 0 0 1 -7.00 4.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 1.00 -2.00 A 6.00 6.00 0 0 1 7.00 4.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 -1.00 A 1.00 1.00 0 0 1 1.00 -2.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 7.00 4.00 A 1.00 1.00 0 0 1 6.00 5.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<ellipse cx=\"0.0\" cy=\"-7.0\" rx=\"2.5\" ry=\"4.5\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-19\" cy=\"20\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"19\" cy=\"20\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Exactement la même batterie à ailettes avec ses ventilateurs — mais installée à l'intérieur de la chambre froide ou du local à climatiser.",
   "probleme": "C'est lui qui fait le froid. Il prend la chaleur de l'air du local pour vaporiser le fluide.",
   "ou": "Dans la chambre, généralement en hauteur, orienté pour brasser tout le volume."
  },
  {
   "id": "condenseur_a_eau",
   "nom": "Condenseur à eau",
   "groupe": "B",
   "regle": "R3",
   "page": 82,
   "fonction": "Condense le fluide frigorigène en cédant sa chaleur à un circuit d'eau, sans contact direct entre les deux fluides.",
   "indice": "Un cercle, un zigzag (le fluide frigo) et une flèche traversante (l'eau).",
   "role": "Il transfère la chaleur vers un autre réseau ou un autre lieu.",
   "piege": "P2",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-28 -23 56 46\" overflow=\"visible\"><ellipse cx=\"0\" cy=\"0\" rx=\"17\" ry=\"13\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-26\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"17,-4 25,0 17,4\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><polyline points=\"-8,7 -8,-7 0,0 8,-7 8,7\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"0\" y1=\"-13\" x2=\"0\" y2=\"-21\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"13\" x2=\"0\" y2=\"21\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un corps cylindrique fermé, avec un faisceau de tubes à l'intérieur. Le fluide frigorigène circule d'un côté, l'eau de l'autre — les deux ne se touchent jamais.",
   "probleme": "Quand on ne peut pas rejeter la chaleur dans l'air (pas de place, trop de bruit, chaleur à récupérer), on la passe à un circuit d'eau.",
   "ou": "Après le compresseur, relié à un réseau d'eau ou à une tour de refroidissement."
  },
  {
   "id": "evaporateur_a_eau",
   "nom": "Évaporateur à eau",
   "groupe": "B",
   "regle": "R3",
   "page": 82,
   "fonction": "Vaporise le fluide frigorigène en prenant la chaleur d'un circuit d'eau, sans contact direct.",
   "indice": "Le dessin est identique à celui du condenseur à eau.",
   "role": "Il refroidit l'eau d'un réseau (groupe d'eau glacée).",
   "piege": "P2",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-28 -23 56 46\" overflow=\"visible\"><ellipse cx=\"0\" cy=\"0\" rx=\"17\" ry=\"13\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-26\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"17,-4 25,0 17,4\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><polyline points=\"-8,7 -8,-7 0,0 8,-7 8,7\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"0\" y1=\"-13\" x2=\"0\" y2=\"-21\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"13\" x2=\"0\" y2=\"21\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Le même corps à faisceau de tubes. Ici c'est le fluide frigorigène qui se vaporise et l'eau qui se refroidit.",
   "probleme": "Refroidir de l'eau plutôt que de l'air permet de la distribuer loin, dans tout un bâtiment, avec de simples tuyaux.",
   "ou": "Après le détendeur, sur un groupe d'eau glacée."
  },
  {
   "id": "condenseur_a_plaque",
   "nom": "Condenseur à plaques",
   "groupe": "B",
   "regle": "R3",
   "page": 82,
   "fonction": "Condense le fluide frigorigène. Les plaques empilées offrent une grande surface d'échange dans peu de volume.",
   "indice": "Un rectangle barré en croix : les plaques vues en coupe.",
   "role": "Échange compact, très efficace.",
   "piege": "P2",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-21.0 -15.0 40 40\" overflow=\"visible\"><line x1=\"6\" y1=\"-5\" x2=\"6\" y2=\"14\" stroke=\"#000\" stroke-width=\"0.5\"/>\n<line x1=\"10\" y1=\"-5.82667\" x2=\"10\" y2=\"-10.16\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0.5\" y1=\"-5\" x2=\"0.5\" y2=\"14\" stroke=\"#000\" stroke-width=\"0.5\"/>\n<rect x=\"-16\" y=\"-5\" width=\"30\" height=\"20\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"20\" x2=\"10\" y2=\"15\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"20.1359\" x2=\"-10\" y2=\"15.8746\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-5\" x2=\"-7\" y2=\"14\" stroke=\"#000\" stroke-width=\"0.5\"/>\n<line x1=\"-12\" y1=\"-5\" x2=\"10\" y2=\"15\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"-5\" x2=\"-12\" y2=\"15\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"-5\" x2=\"-10\" y2=\"-10\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-10\" cy=\"-10\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"10\" cy=\"-10\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-10\" cy=\"20\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"10\" cy=\"20\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Un empilement de plaques d'inox gaufrées, brasées ensemble. Les deux fluides circulent en quinconce, une plaque sur deux.",
   "probleme": "Il faut beaucoup de surface d'échange dans très peu de volume. Les plaques donnent ça.",
   "ou": "Après le compresseur, sur les installations compactes."
  },
  {
   "id": "evaporateur_a_plaque",
   "nom": "Évaporateur à plaques",
   "groupe": "B",
   "regle": "R3",
   "page": 82,
   "fonction": "Vaporise le fluide frigorigène. Même construction que le condenseur à plaques.",
   "indice": "Encore une fois : dessin identique au condenseur à plaques.",
   "role": "Refroidissement d'eau ou d'eau glycolée.",
   "piege": "P2",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-21.0 -15.0 40 40\" overflow=\"visible\"><line x1=\"6\" y1=\"-5\" x2=\"6\" y2=\"14\" stroke=\"#000\" stroke-width=\"0.5\"/>\n<line x1=\"10\" y1=\"-5.82667\" x2=\"10\" y2=\"-10.16\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0.5\" y1=\"-5\" x2=\"0.5\" y2=\"14\" stroke=\"#000\" stroke-width=\"0.5\"/>\n<rect x=\"-16\" y=\"-5\" width=\"30\" height=\"20\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"20\" x2=\"10\" y2=\"15\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"20.1359\" x2=\"-10\" y2=\"15.8746\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-5\" x2=\"-7\" y2=\"14\" stroke=\"#000\" stroke-width=\"0.5\"/>\n<line x1=\"-12\" y1=\"-5\" x2=\"10\" y2=\"15\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"-5\" x2=\"-12\" y2=\"15\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"-5\" x2=\"-10\" y2=\"-10\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-10\" cy=\"-10\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"10\" cy=\"-10\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-10\" cy=\"20\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"10\" cy=\"20\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Le même empilement de plaques brasées. Seul son rôle dans le circuit change.",
   "probleme": "Même raison : un échange très efficace dans un encombrement minimal.",
   "ou": "Après le détendeur, sur les groupes d'eau glacée et les PAC."
  },
  {
   "id": "tour_refroidissement_ouverte",
   "nom": "Tour de refroidissement ouverte",
   "groupe": "B",
   "regle": "R2",
   "page": 82,
   "fonction": "Refroidit l'eau chaude issue des échangeurs avant de la réutiliser ou de la rejeter.",
   "indice": "Un trapèze, un ventilateur et une douchette : l'eau est pulvérisée directement dans l'air.",
   "role": "L'eau est en contact direct avec l'air : elle s'évapore en partie.",
   "piege": "P3",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-34 -40 68 74\" overflow=\"visible\"><polygon points=\"-26,-36 26,-36 18,20 -18,20\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><g transform=\"translate(0,-20) scale(0.8667) translate(0,2)\"><circle cx=\"0\" cy=\"-2\" r=\"15\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M -1,-2 A 1,1 0 0 1 0,-1\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 6,5 A 6,6 0 0 1 0,-1\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M -7,4 A 6,6 0 0 1 -1,-2\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 0,-1 A 6,6 0 0 1 -6,5\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M -6,5 A 1,1 0 0 1 -7,4\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 1,-2 A 6,6 0 0 1 7,4\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 0,-1 A 1,1 0 0 1 1,-2\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 7,4 A 1,1 0 0 1 6,5\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/></g><line x1=\"-32\" y1=\"-4\" x2=\"-9\" y2=\"-4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-9\" y1=\"-4\" x2=\"9\" y2=\"-4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-7\" y1=\"-4\" x2=\"-8.5\" y2=\"1\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"-4\" x2=\"-1.5\" y2=\"1\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"7\" y1=\"-4\" x2=\"5.5\" y2=\"1\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-18\" y1=\"20\" x2=\"18\" y2=\"20\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"20\" x2=\"0\" y2=\"30\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Une grande caisse ouverte, avec un ventilateur en haut et une rampe qui pulvérise l'eau. L'eau ruisselle sur un garnissage, une petite partie s'évapore — et c'est cette évaporation qui refroidit tout le reste.",
   "probleme": "Un condenseur à air ne peut pas descendre en dessous de la température de l'air. L'évaporation, si.",
   "ou": "En terrasse ou en extérieur, reliée au condenseur à eau."
  },
  {
   "id": "tour_refroidissement_fermee",
   "nom": "Tour de refroidissement fermée",
   "groupe": "B",
   "regle": "R2",
   "page": 83,
   "fonction": "Même fonction que la tour ouverte : refroidir l'eau chaude issue des échangeurs.",
   "indice": "Même trapèze, même douchette, mais un serpentin en plus à l'intérieur.",
   "role": "Le serpentin isole l'eau du circuit de l'air : pas de contact direct.",
   "piege": "P3",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-34 -40 68 74\" overflow=\"visible\"><polygon points=\"-26,-36 26,-36 18,20 -18,20\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><g transform=\"translate(0,-20) scale(0.8667) translate(0,2)\"><circle cx=\"0\" cy=\"-2\" r=\"15\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M -1,-2 A 1,1 0 0 1 0,-1\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 6,5 A 6,6 0 0 1 0,-1\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M -7,4 A 6,6 0 0 1 -1,-2\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 0,-1 A 6,6 0 0 1 -6,5\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M -6,5 A 1,1 0 0 1 -7,4\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 1,-2 A 6,6 0 0 1 7,4\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 0,-1 A 1,1 0 0 1 1,-2\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 7,4 A 1,1 0 0 1 6,5\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/></g><line x1=\"-9\" y1=\"-6\" x2=\"9\" y2=\"-6\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-7\" y1=\"-6\" x2=\"-8.5\" y2=\"-1\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"-6\" x2=\"-1.5\" y2=\"-1\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"7\" y1=\"-6\" x2=\"5.5\" y2=\"-1\" stroke=\"#000\" stroke-width=\"1\"/><path d=\"M -12,6 h 20 a 3.5,3.5 0 0 1 0,7 h -20\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-32\" y1=\"6\" x2=\"-12\" y2=\"6\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-12\" y1=\"13\" x2=\"-32\" y2=\"13\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"-25,10 -32,13 -25,16\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-18\" y1=\"20\" x2=\"18\" y2=\"20\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"20\" x2=\"0\" y2=\"30\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Même caisse, même ventilateur, même pulvérisation — mais l'eau du circuit passe dans un serpentin arrosé par l'extérieur. Elle ne touche jamais l'air.",
   "probleme": "Dans une tour ouverte, l'eau du circuit s'encrasse, s'entartre et se charge de tout ce que l'air transporte. La tour fermée l'en protège.",
   "ou": "Même place que la tour ouverte."
  },
  {
   "id": "detendeur_thermostatique",
   "nom": "Détendeur thermostatique (TC)",
   "groupe": "C",
   "regle": "R4",
   "page": 83,
   "fonction": "Détend le fluide frigorigène : il entre liquide HP et ressort liquide BP. Le bulbe mesure la surchauffe et pilote l'ouverture.",
   "indice": "Une vanne, et au-dessus un bulbe relié par un capillaire.",
   "role": "Il règle le débit de fluide admis dans l'évaporateur.",
   "piege": "P4",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-19.0 -28.0 40 40\" overflow=\"visible\"><circle cx=\"0.0\" cy=\"-12.00005\" r=\"5.83095\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"-18\" x2=\"0\" y2=\"-20\" stroke=\"#000\" stroke-width=\"1\"/>\n<polygon points=\"2,1 0,3 -2,1 -10,5 -10,-5 10,5 10,-5 -2,1 0,0 0,0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-6\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"0\" x2=\"11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"0\" x2=\"-11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"0\" cy=\"-20\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Une petite vanne en laiton, surmontée d'une membrane sous un chapeau. Un tube capillaire en sort et se termine par un bulbe, qu'on sangle sur le tube de sortie de l'évaporateur.",
   "probleme": "L'évaporateur doit recevoir exactement ce qu'il peut vaporiser. Trop de liquide : il repart vers le compresseur. Pas assez : la chambre ne descend pas.",
   "ou": "Juste avant l'évaporateur, au plus près. Le bulbe se pose à la sortie de l'évaporateur."
  },
  {
   "id": "detendeur_capillaire",
   "nom": "Détendeur capillaire",
   "groupe": "C",
   "regle": "R4",
   "page": 83,
   "fonction": "Détend le fluide frigorigène : il entre liquide HP et ressort liquide BP.",
   "indice": "Une suite de boucles : c'est un long tube très fin, enroulé.",
   "role": "Détente fixe, non réglable. Froid domestique et petites puissances.",
   "piege": "P4",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-26.0 -11.0 50 20\" overflow=\"visible\"><path d=\"M -14.00 -2.30 A 3.00 2.90 0 0 1 -8.00 -2.30\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 11.00 -1.00 A 1.00 1.00 0 0 1 10.00 -2.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"11.7474\" y1=\"-1\" x2=\"17.2737\" y2=\"-1\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 4.00 -2.30 A 3.00 2.90 0 0 1 10.00 -2.30\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 2.00 -1.40 A 1.50 3.60 0 0 1 -1.00 -1.40\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -3.00 -1.40 A 1.50 3.60 0 0 1 -6.00 -1.40\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-21.2526\" y1=\"-1\" x2=\"-15.7263\" y2=\"-1\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -6.00 -2.30 A 4.00 2.90 0 0 1 2.00 -2.30\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -8.00 -1.40 A 1.50 3.60 0 0 1 -11.00 -1.40\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -11.00 -2.30 A 4.00 2.90 0 0 1 -3.00 -2.30\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 7.00 -1.40 A 1.50 3.60 0 0 1 4.00 -1.40\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -1.00 -2.30 A 4.00 2.90 0 0 1 7.00 -2.30\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -14.00 -2.00 A 1.00 1.00 0 0 1 -15.00 -1.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-22\" cy=\"-1\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"18\" cy=\"-1\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Un simple tube de cuivre très fin et très long, souvent enroulé. Aucune pièce mobile, aucun réglage : c'est la longueur et le diamètre qui font tout.",
   "probleme": "Sur une petite machine, un détendeur réglable coûterait plus cher que le reste. Le capillaire ne coûte presque rien et ne tombe jamais en panne.",
   "ou": "Avant l'évaporateur, sur le froid domestique et les petites puissances."
  },
  {
   "id": "detendeur_electrique",
   "nom": "Détendeur électronique (TCE)",
   "groupe": "C",
   "regle": "R4",
   "page": 83,
   "fonction": "Détend le fluide frigorigène. L'ouverture est commandée électroniquement par un régulateur.",
   "indice": "Une vanne surmontée d'un cercle marqué TCE : la commande est électronique.",
   "role": "Détente pilotée, précise, adaptable à la charge.",
   "piege": "P4",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-19.0 -21.0 40 30\" overflow=\"visible\"><circle cx=\"0.0\" cy=\"-12.00005\" r=\"5.83095\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<polygon points=\"2,1 0,3 -2,1 -10,5 -10,-5 10,5 10,-5 -2,1 0,0 0,0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-6\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"0\" x2=\"11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"0\" x2=\"-11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Une vanne dont l'ouverture est commandée par un moteur pas-à-pas ou une bobine, piloté par un régulateur électronique et ses sondes.",
   "probleme": "Un détendeur mécanique réagit à ce qu'il mesure sur place. Un détendeur piloté peut tenir compte de plusieurs mesures et s'adapter beaucoup plus finement.",
   "ou": "Même place que le détendeur thermostatique, avec son régulateur dans le coffret."
  },
  {
   "id": "silencieux",
   "nom": "Silencieux",
   "groupe": "D",
   "regle": "R7",
   "page": 83,
   "fonction": "Réduit le bruit provoqué par les pulsations du gaz dans les conduites de refoulement.",
   "indice": "Un corps allongé, cloisonné à l'intérieur.",
   "role": "Se place au refoulement du compresseur.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-9.0 -22.0 20 40\" overflow=\"visible\"><line x1=\"4.16875\" y1=\"-12.4784\" x2=\"4.16875\" y2=\"7.00201\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -4.44 -12.48 A 4.30 2.00 0 0 1 4.17 -12.48\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 4.17 7.00 A 4.30 2.00 0 0 1 -4.44 7.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-4.4375\" y1=\"-12.4784\" x2=\"-4.4375\" y2=\"7.00201\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"-14\" x2=\"0\" y2=\"-18\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"9\" x2=\"0\" y2=\"13\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"0\" cy=\"-18\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"0\" cy=\"13\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Un corps cylindrique cloisonné à l'intérieur, brasé sur la ligne de refoulement.",
   "probleme": "Un compresseur à pistons envoie le gaz par à-coups. Ces pulsations font vibrer et « chanter » les tuyauteries, et à la longue elles fatiguent les brasures.",
   "ou": "Au refoulement, au plus près du compresseur."
  },
  {
   "id": "filtre_huile",
   "nom": "Filtre à huile",
   "groupe": "D",
   "regle": "R5",
   "page": 83,
   "fonction": "Filtre l'huile sur la ligne de retour d'huile au carter.",
   "indice": "Un rectangle barré d'une croix, en traits pleins.",
   "role": "Il protège le compresseur des impuretés véhiculées par l'huile.",
   "piege": "P5",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -13 48 26\" overflow=\"visible\"><rect x=\"-14\" y=\"-8\" width=\"28\" height=\"16\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-14\" y1=\"-8\" x2=\"14\" y2=\"8\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-14\" y1=\"8\" x2=\"14\" y2=\"-8\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-22\" y1=\"0\" x2=\"-14\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"14\" y1=\"0\" x2=\"22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Une cartouche filtrante dans son corps, montée sur la ligne de retour d'huile.",
   "probleme": "L'huile qui revient a fait tout le tour du circuit. Elle rapporte des particules, et les organes qu'elle traverse ensuite sont des mécanismes fins.",
   "ou": "Sur le circuit d'huile, entre le réservoir et les régulateurs de niveau."
  },
  {
   "id": "filtre_deshydrateur",
   "nom": "Filtre déshydrateur",
   "groupe": "D",
   "regle": "R5",
   "page": 83,
   "fonction": "Enlève toute l'humidité et les impuretés présentes dans le fluide frigorigène.",
   "indice": "Même rectangle barré d'une croix, mais les traits sont en pointillés : le pointillé, c'est le déshydratant.",
   "role": "Se place sur la ligne liquide. L'humidité est l'ennemi n°1 du circuit.",
   "piege": "P5",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -13 48 26\" overflow=\"visible\"><rect x=\"-14\" y=\"-8\" width=\"28\" height=\"16\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-14\" y1=\"-8\" x2=\"14\" y2=\"8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/><line x1=\"-14\" y1=\"8\" x2=\"14\" y2=\"-8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/><line x1=\"-22\" y1=\"0\" x2=\"-14\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"14\" y1=\"0\" x2=\"22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un cylindre métallique brasé sur la ligne liquide, rempli de billes de déshydratant et d'un tamis filtrant. Une flèche gravée dessus indique le sens de montage.",
   "probleme": "L'eau est l'ennemi numéro un d'un circuit frigorifique : elle gèle à l'orifice du détendeur et le bouche, et elle attaque l'huile. Le déshydratant la retient.",
   "ou": "Sur la ligne liquide, après la bouteille et avant le voyant."
  },
  {
   "id": "filtre_cartouche",
   "nom": "Filtre à cartouche (aspiration)",
   "groupe": "D",
   "regle": "R5",
   "page": 85,
   "fonction": "Nettoie le fluide frigorigène à l'état gazeux avant qu'il ne soit aspiré par le compresseur.",
   "indice": "Un corps avec une cartouche démontable dessinée à l'intérieur.",
   "role": "Dernier rempart avant le compresseur.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-26.0 -14.0 40 30\" overflow=\"visible\"><rect x=\"-19\" y=\"-8\" width=\"25\" height=\"16\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-15\" y1=\"-8\" x2=\"-15\" y2=\"7\" stroke=\"#000\" stroke-width=\"0.5\" stroke-dasharray=\"4,2\"/>\n<polyline points=\"2,-8 2,-5 -10,-5 -10,5 2,5 2,8\" fill=\"none\" stroke=\"#000\" stroke-width=\"0.5\" stroke-dasharray=\"4,2\"/>\n<circle cx=\"0\" cy=\"9\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"7\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"0\" cy=\"-9\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-20\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Un corps avec une cartouche démontable à l'intérieur, monté sur la ligne d'aspiration.",
   "probleme": "Après un grillage de moteur ou un chantier, le circuit est plein de saletés. Elles ne doivent pas entrer dans le compresseur.",
   "ou": "Sur l'aspiration, juste avant le compresseur."
  },
  {
   "id": "voyant_liquide",
   "nom": "Voyant liquide",
   "groupe": "D",
   "regle": "R6",
   "page": 84,
   "fonction": "Permet de contrôler l'état et la teneur en humidité du fluide frigorigène.",
   "indice": "Un corps avec un hublot rond, vide.",
   "role": "Des bulles dans le voyant = manque de fluide ou détente prématurée.",
   "piege": "P6",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -12 48 24\" overflow=\"visible\"><rect x=\"-14\" y=\"-7\" width=\"28\" height=\"14\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><circle cx=\"0\" cy=\"0\" r=\"5.5\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-22\" y1=\"0\" x2=\"-14\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"14\" y1=\"0\" x2=\"22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un petit corps en laiton avec un hublot en verre. Au centre, une pastille qui change de couleur selon la teneur en humidité du fluide.",
   "probleme": "Le circuit est fermé et opaque : on ne voit rien de ce qui s'y passe. Le voyant est la seule fenêtre.",
   "ou": "Sur la ligne liquide, juste après le déshydrateur."
  },
  {
   "id": "voyant_huile",
   "nom": "Voyant huile",
   "groupe": "D",
   "regle": "R6",
   "page": 84,
   "fonction": "Permet de contrôler le niveau et l'état de l'huile.",
   "indice": "Le même hublot, mais avec un point au centre.",
   "role": "Il se lit sur le carter du compresseur ou le réservoir d'huile.",
   "piege": "P6",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -12 48 24\" overflow=\"visible\"><rect x=\"-14\" y=\"-7\" width=\"28\" height=\"14\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><circle cx=\"0\" cy=\"0\" r=\"5.5\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-22\" y1=\"0\" x2=\"-14\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"14\" y1=\"0\" x2=\"22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"0\" cy=\"0\" r=\"2.4\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Le même hublot, mais monté sur le carter du compresseur ou sur le circuit d'huile. Souvent avec un repère de niveau.",
   "probleme": "Un compresseur qui manque d'huile se détruit. Encore faut-il pouvoir vérifier sans rien démonter.",
   "ou": "Sur le carter du compresseur, et sur le circuit d'huile après le filtre."
  },
  {
   "id": "vanne_isolement",
   "nom": "Vanne d'isolement",
   "groupe": "E",
   "regle": "R4",
   "page": 84,
   "fonction": "Permet d'ouvrir ou de fermer un réseau fluidique.",
   "indice": "Deux triangles pointe contre pointe, surmontés d'un volant en forme de H.",
   "role": "Le volant = commande manuelle. C'est un homme qui l'ouvre.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -26 48 42\" overflow=\"visible\"><polyline points=\"-11,-6 -11,6 0,0 11,6 11,-6 0,0 -11,-6\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-11\" y1=\"0\" x2=\"-22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-19\" y1=\"-4\" x2=\"-19\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"19\" y1=\"-4\" x2=\"19\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-16\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-9\" y1=\"-16\" x2=\"9\" y2=\"-16\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-9\" y1=\"-22\" x2=\"-9\" y2=\"-16\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"9\" y1=\"-22\" x2=\"9\" y2=\"-16\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un robinet à corps métallique, manœuvré par un volant ou par un carré sous un capuchon vissé qu'il faut retirer avant d'agir.",
   "probleme": "Pour intervenir sur une partie du circuit, il faut pouvoir l'isoler sans vidanger toute l'installation.",
   "ou": "Aux points de coupure utiles : sortie de bouteille, aspiration et refoulement du compresseur."
  },
  {
   "id": "prise_schrader",
   "nom": "Prise Schrader",
   "groupe": "E",
   "regle": "R8",
   "page": 84,
   "fonction": "Permet de lire une pression et d'ajouter ou retirer du fluide frigorigène dans le système.",
   "indice": "Un simple trait surmonté d'un gros chevron plein.",
   "role": "C'est là qu'on branche le manifold.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-16 -24 32 44\" overflow=\"visible\"><line x1=\"0\" y1=\"18\" x2=\"0\" y2=\"-10\" stroke=\"#000\" stroke-width=\"1\"/><polygon points=\"-11,-8 0,-20 11,-8 0,-13\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Exactement la même valve que sur une roue de vélo ou de voiture : un obus poussé par un ressort, sous un bouchon.",
   "probleme": "Il faut pouvoir brancher un manomètre ou transférer du fluide sans ouvrir le circuit ni le vider.",
   "ou": "Sur les vannes de service, et en plusieurs points du circuit pour la mesure."
  },
  {
   "id": "electrovanne",
   "nom": "Électrovanne",
   "groupe": "E",
   "regle": "R4",
   "page": 84,
   "fonction": "Permet d'ouvrir ou de fermer un circuit fluidique.",
   "indice": "Deux triangles pointe contre pointe, surmontés d'un rectangle : la bobine.",
   "role": "La bobine = commande électrique. C'est un contact qui l'ouvre.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-19.0 -21.0 40 30\" overflow=\"visible\"><line x1=\"-3\" y1=\"-13\" x2=\"3\" y2=\"-9\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 3.00 -7.00 A 3.00 3.00 0 0 1 -3.00 -7.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-3\" y1=\"-8\" x2=\"-3\" y2=\"-15\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -3.00 -15.00 A 3.00 3.00 0 0 1 3.00 -15.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"3\" y1=\"-8\" x2=\"3\" y2=\"-15\" stroke=\"#000\" stroke-width=\"1\"/>\n<polygon points=\"2,1 0,3 -2,1 -10,5 -10,-5 10,5 10,-5 -2,1 0,0 0,0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-4\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"0\" x2=\"11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"0\" x2=\"-11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Une vanne surmontée d'une bobine électrique. Sous tension, la bobine attire un noyau qui libère le passage ; hors tension, un ressort le referme.",
   "probleme": "Il faut pouvoir ouvrir et fermer un circuit à distance, depuis une commande électrique — un thermostat, une horloge, un régulateur.",
   "ou": "Sur la ligne liquide au plus près du détendeur. Et sur toute ligne à commander à distance."
  },
  {
   "id": "clapet_retenue",
   "nom": "Clapet de retenue",
   "groupe": "E",
   "regle": "R4",
   "page": 84,
   "fonction": "Permet de garder un sens unique de passage du fluide frigorigène.",
   "indice": "Un battant en travers du tuyau : il ne peut se coucher que d'un côté.",
   "role": "Anti-retour. Il n'a pas de réglage.",
   "piege": "P7",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-19.0 -10.0 40 20\" overflow=\"visible\"><polyline points=\"-10,5 -10,-5 10,5 10,-5\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"0\" x2=\"11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"0\" x2=\"-11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-10.0\" cy=\"-5.0\" r=\"1.5\" fill=\"black\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Un battant, ou une bille poussée par un ressort, enfermé dans un corps de tuyauterie. Il ne peut s'ouvrir que dans un sens.",
   "probleme": "À l'arrêt, la pression pousse le fluide en sens inverse. Il peut alors traverser le compresseur à l'envers, ou remonter vers un autre poste de froid.",
   "ou": "Au refoulement du compresseur, et sur toute jonction où deux circuits pourraient se renvoyer du fluide."
  },
  {
   "id": "soupape_retenue",
   "nom": "Soupape de retenue",
   "groupe": "E",
   "regle": "R4",
   "page": 84,
   "fonction": "Permet de garder un sens unique de passage du fluide frigorigène et s'ouvre à une pression déterminée.",
   "indice": "Un corps de vanne complet, avec un point plein qui marque le siège.",
   "role": "Le document lui donne la même fonction qu'au clapet ; ce qui change, c'est la technologie interne.",
   "piege": "P7",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -18 48 34\" overflow=\"visible\"><polyline points=\"-11,-7 -11,7 0,0 11,7 11,-7 0,0 -11,-7\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><circle cx=\"0\" cy=\"0\" r=\"2.4\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-11\" y1=\"-7\" x2=\"-11\" y2=\"-13\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"-11\" cy=\"-14\" r=\"2.4\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-11\" y1=\"0\" x2=\"-22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-19\" y1=\"-4\" x2=\"-19\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"19\" y1=\"-4\" x2=\"19\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un corps de vanne à siège, qui impose lui aussi un sens unique de passage. La technologie interne diffère du clapet ; la fonction que lui donne le document est la même.",
   "probleme": "Même problème que le clapet : empêcher le fluide de repartir en arrière.",
   "ou": "Sur les lignes où le sens de circulation doit être garanti."
  },
  {
   "id": "v4v",
   "nom": "Vanne 4 voies (V4V)",
   "groupe": "E",
   "regle": "R4",
   "page": 85,
   "fonction": "Permet d'inverser le cycle thermodynamique (mode chaud et mode froid) dans le système.",
   "indice": "Un corps rectangulaire, une voie en haut et trois voies en bas.",
   "role": "C'est elle qui rend une PAC réversible.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-30 -26 60 52\" overflow=\"visible\"><rect x=\"-22\" y=\"-7\" width=\"44\" height=\"14\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><polygon points=\"-5,-20 5,-20 0,-8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><polygon points=\"-19,20 -9,20 -14,8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><polygon points=\"-5,20 5,20 0,8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><polygon points=\"9,20 19,20 14,8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/></svg>",
   "objet": "Un corps massif avec quatre raccords et un tiroir à l'intérieur, déplacé par une petite bobine électrique.",
   "probleme": "Pour qu'une machine fasse du chaud l'hiver et du froid l'été, il faut pouvoir échanger les rôles du condenseur et de l'évaporateur — sans rien démonter.",
   "ou": "Au refoulement du compresseur, sur les installations réversibles."
  },
  {
   "id": "eliminateur_vibration",
   "nom": "Éliminateur de vibrations",
   "groupe": "F",
   "regle": "R7",
   "page": 85,
   "fonction": "Réduit les vibrations et les bruits générés par le compresseur.",
   "indice": "Un tronçon souple dessiné en accordéon entre deux brides.",
   "role": "Se pose au plus près du compresseur.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-26 -14 52 28\" overflow=\"visible\"><line x1=\"-24\" y1=\"0\" x2=\"-12\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-12\" y1=\"-10\" x2=\"-12\" y2=\"10\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-12\" y1=\"10\" x2=\"12\" y2=\"-10\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"12\" y1=\"-10\" x2=\"12\" y2=\"10\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"12\" y1=\"0\" x2=\"24\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un tronçon souple : un soufflet métallique, le plus souvent gainé d'une tresse d'inox.",
   "probleme": "Un compresseur vibre. Ces vibrations se propagent dans les tuyauteries rigides et finissent par fissurer les brasures.",
   "ou": "Au plus près du compresseur, sur l'aspiration et sur le refoulement."
  },
  {
   "id": "separateur_huile",
   "nom": "Séparateur d'huile avec flotteur",
   "groupe": "F",
   "regle": "R7",
   "page": 85,
   "fonction": "Récupère l'huile entraînée par le fluide frigorigène à l'état vapeur, à la sortie du compresseur.",
   "indice": "Un corps pointu vers le bas, avec un flotteur dessiné dedans.",
   "role": "L'huile tombe au fond, le flotteur la renvoie au carter.",
   "piege": "P8",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-14.0 -18.0 30 40\" overflow=\"visible\"><polyline points=\"1,7 6,2 9,2\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"-10\" x2=\"0\" y2=\"-2\" stroke=\"#000\" stroke-width=\"1\"/>\n<polyline points=\"-8,-13 8,-13 8,5 0,13 -8,5 -8,-13\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<ellipse cx=\"0.0\" cy=\"8.0\" rx=\"2.0\" ry=\"1.0\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"0\" cy=\"14\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-9\" cy=\"-10\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"9\" cy=\"-10\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"9\" cy=\"2\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Un corps vertical où le gaz ralentit brutalement. L'huile, plus lourde, se sépare et tombe au fond ; un flotteur ouvre alors le retour vers le carter.",
   "probleme": "L'huile part avec le gaz au refoulement. Si elle ne revient pas, elle s'accumule dans l'évaporateur — qui échange de moins en moins — et le compresseur s'assèche.",
   "ou": "Au refoulement, juste après le compresseur."
  },
  {
   "id": "bouteille_anticoup",
   "nom": "Bouteille anti-coup de liquide",
   "groupe": "F",
   "regle": "R7",
   "page": 85,
   "fonction": "Élimine le risque que le fluide frigorigène arrive encore à l'état liquide au compresseur.",
   "indice": "Le même corps pointu vers le bas, mais sans flotteur.",
   "role": "Se place sur l'aspiration. Le liquide reste au fond, seule la vapeur repart.",
   "piege": "P8",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -22 48 44\" overflow=\"visible\"><polyline points=\"-10,-15 10,-15 10,6 0,17 -10,6 -10,-15\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"0\" y1=\"-11\" x2=\"0\" y2=\"7\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-10\" y1=\"-10\" x2=\"-21\" y2=\"-10\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-18\" y1=\"-14\" x2=\"-18\" y2=\"-6\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"10\" y1=\"-10\" x2=\"21\" y2=\"-10\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"18\" y1=\"-14\" x2=\"18\" y2=\"-6\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un réservoir monté sur la ligne d'aspiration, avec un tube plongeur qui ne reprend le gaz que par le haut. Un petit orifice au fond laisse remonter l'huile, doucement.",
   "probleme": "Un compresseur comprime du gaz, pas du liquide. Un retour de liquide casse les clapets, voire une bielle.",
   "ou": "Sur l'aspiration, avant le compresseur. Indispensable en dégivrage par gaz chauds."
  },
  {
   "id": "bouteille_liquide",
   "nom": "Bouteille (réservoir) liquide",
   "groupe": "F",
   "regle": "R7",
   "page": 85,
   "fonction": "Élimine le risque que le fluide frigorigène soit encore à l'état gazeux en sortie de condenseur.",
   "indice": "Un corps cylindrique couché, à fonds bombés.",
   "role": "Réserve de liquide entre le condenseur et le détendeur.",
   "piege": "P9",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24.0 -14.0 50 30\" overflow=\"visible\"><line x1=\"-17\" y1=\"7\" x2=\"17\" y2=\"7\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-17\" y1=\"-7\" x2=\"17\" y2=\"-7\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 17.50 -7.00 A 2.50 7.00 0 0 1 17.50 7.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -17.50 7.00 A 2.50 7.00 0 0 1 -17.50 -7.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-10\" cy=\"7\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"10\" cy=\"7\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"10\" cy=\"-7\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-10\" cy=\"-7\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"0\" cy=\"-7\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"19\" cy=\"4\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"0\" cy=\"7\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"19\" cy=\"-4\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"20\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-20\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Un réservoir, souvent couché, placé après le condenseur. Un tube plongeur prend le liquide tout au fond, pour qu'il ne parte jamais de gaz vers la ligne liquide.",
   "probleme": "La charge utile varie selon la saison et le régime. Il faut un endroit où le liquide en trop peut attendre — et une garantie que le détendeur soit toujours alimenté en liquide.",
   "ou": "Juste après le condenseur, en tête de ligne liquide."
  },
  {
   "id": "reservoir_huile",
   "nom": "Réservoir d'huile",
   "groupe": "F",
   "regle": "R7",
   "page": 88,
   "fonction": "Stocke l'huile récupérée par le séparateur avant son renvoi aux carters.",
   "indice": "Un simple corps vertical, sans rien dedans.",
   "role": "Présent sur les centrales à plusieurs compresseurs.",
   "piege": "P9",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-18 -24 36 48\" overflow=\"visible\"><rect x=\"-11\" y=\"-18\" width=\"22\" height=\"36\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"0\" y1=\"-18\" x2=\"0\" y2=\"-24\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"18\" x2=\"0\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un réservoir vertical qui stocke l'huile récupérée par le séparateur.",
   "probleme": "Sur une centrale, plusieurs compresseurs réclament de l'huile sans se concerter. Sans réserve commune, le premier qui appelle prend tout.",
   "ou": "Sur le circuit d'huile, entre le séparateur et le filtre."
  },
  {
   "id": "ventilateur",
   "nom": "Ventilateur",
   "groupe": "F",
   "regle": "R1",
   "page": 85,
   "fonction": "Distribue, par convection, le froid et le chaud dans un local ou à l'extérieur.",
   "indice": "Une hélice vue de profil, entraînée par un moteur.",
   "role": "Sans lui, l'échangeur à air n'échange presque rien.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24.0 -20.0 50 40\" overflow=\"visible\"><circle cx=\"0.0\" cy=\"0.0\" r=\"15.0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -1.00 0.00 A 6.00 6.00 0 0 1 -7.00 -6.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -7.00 6.00 A 6.00 6.00 0 0 1 -1.00 0.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 1.00 A 6.00 6.00 0 0 1 -6.00 7.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -6.00 7.00 A 1.00 1.00 0 0 1 -7.00 6.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -6.00 -7.00 A 6.00 6.00 0 0 1 0.00 -1.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -7.00 -6.00 A 1.00 1.00 0 0 1 -6.00 -7.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 -1.00 A 1.00 1.00 0 0 1 -1.00 0.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<ellipse cx=\"4.5\" cy=\"0.0\" rx=\"4.5\" ry=\"2.5\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-15\" y1=\"0\" x2=\"-16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"15\" y1=\"0\" x2=\"16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-13\" x2=\"13\" y2=\"-7\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"13\" x2=\"13\" y2=\"7\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Une hélice et son moteur, montés dans une virole.",
   "probleme": "Sans mouvement d'air, une batterie à ailettes n'échange presque rien : l'air qui la touche se met à sa température et plus rien ne se passe.",
   "ou": "Sur le condenseur à air, sur l'évaporateur à air, et dans les tours de refroidissement."
  },
  {
   "id": "regulateur_flotteur",
   "nom": "Régulateur à flotteur",
   "groupe": "F",
   "regle": "R7",
   "page": 88,
   "fonction": "Maintient un niveau de liquide constant en agissant sur le passage du fluide.",
   "indice": "Une vanne, et à côté une boule : le flotteur qui suit le niveau.",
   "role": "Repère 20 du schéma : il gère le niveau d'huile du carter.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-26 -28 52 44\" overflow=\"visible\"><polyline points=\"-11,-6 -11,6 0,0 11,6 11,-6 0,0 -11,-6\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-11\" y1=\"0\" x2=\"-22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-19\" y1=\"-4\" x2=\"-19\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"19\" y1=\"-4\" x2=\"19\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-14\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"-14\" x2=\"-16\" y2=\"-20\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"-19\" cy=\"-21\" r=\"4\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-9\" y1=\"-19\" x2=\"-9\" y2=\"-13\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Une petite vanne commandée par une boule qui flotte sur l'huile, montée directement sur le carter du compresseur.",
   "probleme": "Chaque compresseur doit se servir tout seul, au bon moment, sans qu'on aille vérifier les niveaux à la main.",
   "ou": "Sur le carter de chaque compresseur d'une centrale."
  },
  {
   "id": "bulle_PZL",
   "nom": "Pressostat BP de sécurité (PZL)",
   "groupe": "G",
   "regle": "R6",
   "page": 86,
   "fonction": "Protège l'installation en cas de pression anormalement basse.",
   "indice": "P = pression · Z = sécurité · L = seuil bas.",
   "role": "Il coupe l'installation. Souvent à réarmement manuel.",
   "piege": "P10",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25 -26 50 46\" overflow=\"visible\"><rect x=\"-22\" y=\"-24\" width=\"44\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">PZL</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un boîtier avec un soufflet relié au circuit par un petit tube. Quand la pression bouge, le soufflet se déforme et bascule un contact électrique.",
   "probleme": "Une pression trop basse veut dire qu'il manque du fluide, ou que quelque chose est bouché. Continuer à tourner dans cet état abîme le compresseur.",
   "ou": "Sur l'aspiration. Souvent à réarmement manuel : il ne redémarre pas tout seul."
  },
  {
   "id": "bulle_PZH",
   "nom": "Pressostat HP de sécurité (PZH)",
   "groupe": "G",
   "regle": "R6",
   "page": 86,
   "fonction": "Protège l'installation en cas de pression anormalement haute.",
   "indice": "P = pression · Z = sécurité · H = seuil haut.",
   "role": "Le dernier rempart avant la rupture. Il coupe.",
   "piege": "P10",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25 -26 50 46\" overflow=\"visible\"><rect x=\"-22\" y=\"-24\" width=\"44\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">PZH</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Le même boîtier à soufflet et contact, raccordé cette fois sur la haute pression.",
   "probleme": "Une pression trop haute, c'est un condenseur bouché, un ventilateur arrêté, ou une vanne fermée. C'est le risque de rupture. Ce pressostat est le dernier rempart.",
   "ou": "Sur le refoulement. À réarmement manuel dans la plupart des cas."
  },
  {
   "id": "bulle_PSL",
   "nom": "Pressostat BP de régulation (PSL)",
   "groupe": "G",
   "regle": "R6",
   "page": 86,
   "fonction": "Régule la pression pour optimiser le fonctionnement du système.",
   "indice": "P = pression · S = commutation (régulation) · L = seuil bas.",
   "role": "Il fait marcher et arrêter le compresseur en fonctionnement normal.",
   "piege": "P10",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25 -26 50 46\" overflow=\"visible\"><rect x=\"-22\" y=\"-24\" width=\"44\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">PSL</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Même appareil que le pressostat de sécurité, mais réglé pour couper et réenclencher tout seul, en fonctionnement normal.",
   "probleme": "Il faut bien quelque chose qui arrête et relance le compresseur au fil de la demande, sans intervention humaine.",
   "ou": "Sur l'aspiration. C'est lui qui termine un pump down."
  },
  {
   "id": "bulle_PSH",
   "nom": "Pressostat HP de régulation (PSH)",
   "groupe": "G",
   "regle": "R6",
   "page": 86,
   "fonction": "Régule la pression pour optimiser le fonctionnement du système.",
   "indice": "P = pression · S = commutation (régulation) · H = seuil haut.",
   "role": "Il enclenche par exemple le second ventilateur du condenseur.",
   "piege": "P10",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25 -26 50 46\" overflow=\"visible\"><rect x=\"-22\" y=\"-24\" width=\"44\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">PSH</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Même appareil, raccordé sur la haute pression, réglé pour piloter et non pour couper.",
   "probleme": "Quand la pression de condensation monte, il faut souffler davantage. Ce pressostat enclenche les ventilateurs supplémentaires.",
   "ou": "Sur le refoulement, relié à la commande des ventilateurs de condenseur."
  },
  {
   "id": "bulle_PZLLHH",
   "nom": "Pressostat combiné (PZLLHH)",
   "groupe": "G",
   "regle": "R6",
   "page": 88,
   "fonction": "Réunit dans un seul appareil la sécurité basse pression et la sécurité haute pression.",
   "indice": "Les lettres se cumulent : LL et HH, deux seuils bas et deux seuils hauts.",
   "role": "Repère 3 du schéma, monté directement sur le compresseur.",
   "piege": "P10",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-36 -26 72 46\" overflow=\"visible\"><rect x=\"-33\" y=\"-24\" width=\"66\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">PZLLHH</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un seul boîtier qui réunit les deux sécurités : basse pression et haute pression, avec deux réglages distincts.",
   "probleme": "Il faut les deux sécurités. Les réunir économise un appareil, un capillaire et de la place dans le coffret.",
   "ou": "Monté directement sur le compresseur, raccordé à l'aspiration et au refoulement."
  },
  {
   "id": "bulle_TC",
   "nom": "Thermostat de régulation (TC / TS)",
   "groupe": "G",
   "regle": "R6",
   "page": 86,
   "fonction": "Contrôle et maintient une température stable dans un lieu.",
   "indice": "T = température · C ou S = contrôle / commutation.",
   "role": "C'est lui qui déclenche et arrête la production de froid.",
   "piege": "P11",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25 -26 50 46\" overflow=\"visible\"><rect x=\"-22\" y=\"-24\" width=\"44\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">TC</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un boîtier avec une sonde ou un bulbe placé dans l'ambiance, et un contact électrique qui bascule selon la température mesurée.",
   "probleme": "C'est la température de la chambre qui compte, pas celle du fluide. Il faut donc quelque chose qui mesure là où sont les produits.",
   "ou": "Dans la chambre froide ou le local, à l'écart des courants d'air et des sources de chaleur."
  },
  {
   "id": "bulle_TZ",
   "nom": "Thermostat de sécurité (TZ)",
   "groupe": "G",
   "regle": "R6",
   "page": 86,
   "fonction": "Empêche un équipement de dépasser une température dangereuse.",
   "indice": "T = température · Z = sécurité.",
   "role": "Il coupe. Il ne régule pas.",
   "piege": "P11",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25 -26 50 46\" overflow=\"visible\"><rect x=\"-22\" y=\"-24\" width=\"44\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">TZ</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Le même type de boîtier à bulbe, mais réglé sur un seuil dangereux, et non sur une consigne de confort.",
   "probleme": "Certains équipements ne doivent jamais dépasser une température : ils se détruiraient, ou deviendraient dangereux.",
   "ou": "Au point à surveiller — refoulement du compresseur, carter, batterie de dégivrage."
  },
  {
   "id": "bulle_TI",
   "nom": "Thermomètre (TI)",
   "groupe": "G",
   "regle": "R6",
   "page": 86,
   "fonction": "Permet de lire une température.",
   "indice": "T = température · I = indication. Il indique, il ne commande rien.",
   "role": "Simple afficheur. Aucun contact électrique.",
   "piege": "P11",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-18 -30 36 48\" overflow=\"visible\"><circle cx=\"0\" cy=\"-13\" r=\"12\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-8.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">TI</text><line x1=\"0\" y1=\"-1\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un cadran à aiguille, ou un afficheur, avec sa sonde ou son capillaire.",
   "probleme": "Pour diagnostiquer, il faut lire. Sans indication de température, on travaille à l'aveugle.",
   "ou": "Aux points de mesure utiles. Il n'est raccordé à aucun contact : il n'agit sur rien."
  },
  {
   "id": "bulle_TSHL",
   "nom": "Thermostat d'ambiance (TSHL)",
   "groupe": "G",
   "regle": "R6",
   "page": 88,
   "fonction": "Maintient la température de la chambre entre un seuil bas et un seuil haut.",
   "indice": "T = température · S = commutation · H et L = les deux seuils.",
   "role": "Repère 16 du schéma : il commande l'électrovanne de ligne liquide.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-28 -26 56 46\" overflow=\"visible\"><rect x=\"-25\" y=\"-24\" width=\"50\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">TSHL</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un thermostat d'ambiance à deux seuils : un pour lancer le froid, un pour l'arrêter.",
   "probleme": "Avec un seuil unique, l'installation démarrerait et s'arrêterait sans arrêt autour de la consigne. Deux seuils créent l'écart nécessaire.",
   "ou": "Dans la chambre. Il commande l'électrovanne de ligne liquide."
  },
  {
   "id": "regulateur_kvr",
   "nom": "Régulateur de pression de condensation KVR",
   "groupe": "H",
   "regle": "R8",
   "page": 87,
   "fonction": "Contrôle la pression de condensation afin d'assurer un fonctionnement stable et efficace.",
   "indice": "Bulle PC = Pression de Condensation. Le pointillé va vers l'amont, côté condenseur.",
   "role": "Utile l'hiver : sans lui, la HP s'effondre et le détendeur ne fonctionne plus.",
   "piege": "P12",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-32 -34 64 26\" overflow=\"visible\"><polyline points=\"-11,-6 -11,6 0,0 11,6 11,-6 0,0 -11,-6\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-11\" y1=\"0\" x2=\"-20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-17\" y1=\"-4\" x2=\"-17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"17\" y1=\"-4\" x2=\"17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-8\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"-4,-9 4,-9 0,-2 -4,-9\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"0\" cy=\"-18\" r=\"8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-14\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"9\" font-weight=\"700\" fill=\"#000\">PC</text><path d=\"M -8,-18 L -22,-18 L -22,-27\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/></svg>",
   "objet": "Une vanne en laiton à vis de réglage, montée sur la ligne liquide. En freinant la sortie du condenseur, elle y fait monter le niveau de liquide.",
   "probleme": "L'hiver, le condenseur refroidit trop et la haute pression s'effondre. Le détendeur n'a alors plus assez d'écart de pression pour alimenter l'évaporateur.",
   "ou": "En sortie de condenseur, avant la bouteille. Toujours accompagné de la vanne différentielle NRD."
  },
  {
   "id": "regulateur_kvp",
   "nom": "Régulateur de pression d'évaporation KVP",
   "groupe": "H",
   "regle": "R8",
   "page": 87,
   "fonction": "Contrôle la pression d'évaporation afin d'assurer un fonctionnement stable et efficace.",
   "indice": "Bulle PA = Pression d'évaporation. Il se monte en sortie d'évaporateur.",
   "role": "Il empêche la BP de descendre trop bas (givrage, produits sensibles).",
   "piege": "P12",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-32 -34 64 26\" overflow=\"visible\"><polyline points=\"-11,-6 -11,6 0,0 11,6 11,-6 0,0 -11,-6\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-11\" y1=\"0\" x2=\"-20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-17\" y1=\"-4\" x2=\"-17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"17\" y1=\"-4\" x2=\"17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-8\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"-4,-9 4,-9 0,-2 -4,-9\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"0\" cy=\"-18\" r=\"8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-14\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"9\" font-weight=\"700\" fill=\"#000\">PA</text><path d=\"M -8,-18 L -22,-18 L -22,-27\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/></svg>",
   "objet": "Une vanne en laiton avec une vis de réglage sous un capuchon vissé. Elle se ferme d'elle-même quand la pression descend trop.",
   "probleme": "Sur une centrale, toutes les chambres partagent la même basse pression. Sans lui, la chambre la plus tempérée descendrait au niveau de la plus froide et gèlerait ses produits.",
   "ou": "Sur l'aspiration, en sortie d'évaporateur de la chambre à protéger."
  },
  {
   "id": "regulateur_kvc",
   "nom": "Régulateur de capacité KVC",
   "groupe": "H",
   "regle": "R8",
   "page": 87,
   "fonction": "Ajuste la charge frigorifique en contrôlant la pression d'aspiration, notamment lors des charges partielles.",
   "indice": "Bulle RC = Régulation de Capacité. Il by-passe du refoulement vers l'aspiration.",
   "role": "Il évite les courts cycles quand la demande de froid baisse.",
   "piege": "P12",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-32 -34 64 26\" overflow=\"visible\"><polyline points=\"-11,-6 -11,6 0,0 11,6 11,-6 0,0 -11,-6\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-11\" y1=\"0\" x2=\"-20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-17\" y1=\"-4\" x2=\"-17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"17\" y1=\"-4\" x2=\"17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-8\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"-4,-9 4,-9 0,-2 -4,-9\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"0\" cy=\"-18\" r=\"8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-14\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"9\" font-weight=\"700\" fill=\"#000\">RC</text><path d=\"M 8,-18 L 22,-18 L 22,-27\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/></svg>",
   "objet": "Une vanne de dérivation en laiton, montée entre le refoulement et l'aspiration.",
   "probleme": "Quand la demande de froid baisse, le compresseur reste dimensionné pour la pleine charge. Il s'arrête et redémarre sans cesse, et ces courts cycles l'usent.",
   "ou": "En by-pass, du refoulement vers l'aspiration."
  },
  {
   "id": "regulateur_kvl",
   "nom": "Régulateur de démarrage KVL",
   "groupe": "H",
   "regle": "R8",
   "page": 87,
   "fonction": "Limite la pression d'aspiration lors du démarrage du compresseur, réduisant les contraintes mécaniques.",
   "indice": "Bulle RD = Régulation de Démarrage. Il bride l'aspiration au lancement.",
   "role": "Il protège le moteur du compresseur au démarrage.",
   "piege": "P12",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-32 -34 64 26\" overflow=\"visible\"><polyline points=\"-11,-6 -11,6 0,0 11,6 11,-6 0,0 -11,-6\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-11\" y1=\"0\" x2=\"-20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-17\" y1=\"-4\" x2=\"-17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"17\" y1=\"-4\" x2=\"17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-8\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"-4,-9 4,-9 0,-2 -4,-9\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"0\" cy=\"-18\" r=\"8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-14\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"9\" font-weight=\"700\" fill=\"#000\">RD</text><path d=\"M 8,-18 L 22,-18 L 22,-27\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/></svg>",
   "objet": "Une vanne en laiton à vis de réglage, montée sur l'aspiration juste avant le compresseur.",
   "probleme": "Au démarrage et après un dégivrage, l'évaporateur est chaud et la basse pression est anormalement haute. Le compresseur avale trop de gaz et son moteur force.",
   "ou": "Sur l'aspiration, au plus près du compresseur."
  },
  {
   "id": "nrd",
   "nom": "Vanne différentielle NRD",
   "groupe": "I",
   "regle": "R8",
   "page": null,
   "fonction": "Dérive du gaz chaud du refoulement vers la bouteille liquide pour y maintenir la pression pendant que le KVR noie le condenseur.",
   "indice": "Une vanne avec DEUX liaisons d'information : elle compare deux pressions (ΔP).",
   "role": "Elle ne va jamais seule : c'est la coéquipière du KVR.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-32 -34 64 26\" overflow=\"visible\"><polyline points=\"-11,-6 -11,6 0,0 11,6 11,-6 0,0 -11,-6\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-11\" y1=\"0\" x2=\"-20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-17\" y1=\"-4\" x2=\"-17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"17\" y1=\"-4\" x2=\"17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-8\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"-4,-9 4,-9 0,-2 -4,-9\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"0\" cy=\"-18\" r=\"8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-14\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"9\" font-weight=\"700\" fill=\"#000\">&#916;P</text><path d=\"M -8,-18 L -22,-18 L -22,-27\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/><path d=\"M 8,-18 L 22,-18 L 22,-27\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/></svg>",
   "objet": "Une vanne qui compare deux pressions et s'ouvre quand l'écart entre elles dépasse son réglage.",
   "probleme": "Quand le KVR noie le condenseur, la bouteille liquide n'est plus alimentée en pression et le liquide n'avance plus. Il faut lui envoyer du gaz chaud pour la remettre sous pression.",
   "ou": "Sur une dérivation entre le refoulement et la bouteille liquide. Toujours avec un KVR."
  },
  {
   "id": "bulle_PDZ",
   "nom": "Pressostat différentiel d'huile (PDZ)",
   "groupe": "I",
   "regle": "R6",
   "page": null,
   "fonction": "Compare la pression d'huile à la pression du carter et coupe le compresseur si l'écart reste insuffisant pendant la temporisation.",
   "indice": "P = pression · D = différentielle · Z = sécurité. La lettre D prolonge la logique des bulles de la page 86, où elle n'apparaît pas.",
   "role": "Sans lui, un compresseur tourne sans huile et se détruit.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-27 -26 54 46\" overflow=\"visible\"><rect x=\"-24\" y=\"-24\" width=\"48\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">PDZ</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>",
   "objet": "Un boîtier raccordé par deux capillaires : un côté pompe à huile, un côté carter. Il compare les deux et intègre une temporisation.",
   "probleme": "Un compresseur qui tourne sans pression d'huile se détruit en quelques minutes. Mais la pression met un instant à s'établir au démarrage — d'où la temporisation.",
   "ou": "Sur le compresseur, raccordé à la pompe à huile et au carter."
  },
  {
   "id": "resistance_degivrage",
   "nom": "Résistance de dégivrage",
   "groupe": "I",
   "regle": "R7",
   "page": null,
   "fonction": "Chauffe la batterie de l'évaporateur pour faire fondre le givre.",
   "indice": "Le zigzag anguleux classique de la résistance électrique.",
   "role": "Se pose dans la batterie, dans l'égouttoir et sur l'écoulement — sinon l'eau regèle.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-29.0 -13.0 70 20\" overflow=\"visible\"><polyline points=\"-20,0 -12,0 -12,-9 -2,-9 -2,0 7,0 7,-9 17,-9 17,0 26,0 26,-9 35,-9 35,0 34,0\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-21\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Des résistances électriques blindées, glissées entre les ailettes de la batterie, posées dans l'égouttoir et déroulées le long du tuyau d'écoulement.",
   "probleme": "Sous zéro, l'humidité de l'air se dépose en givre sur la batterie. Le givre isole : l'échange chute et la machine tire pour rien.",
   "ou": "Dans l'évaporateur. Et surtout aussi dans l'égouttoir et l'écoulement — sinon l'eau y regèle."
  },
  {
   "id": "sonde_temperature",
   "nom": "Sonde de température",
   "groupe": "I",
   "regle": "R8",
   "page": null,
   "fonction": "Mesure une température et transmet l'information au régulateur.",
   "indice": "Un corps sur la ligne, relié par un trait d'information.",
   "role": "C'est elle qui met fin au dégivrage : dès que le givre a fondu, inutile de continuer.",
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-30.0 -14.0 60 40\" overflow=\"visible\"><line x1=\"-20\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<rect x=\"-10\" y=\"-5\" width=\"20\" height=\"10\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<polyline points=\"-10,10 -5,10 5,-10 10,-10\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-20\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"20\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>",
   "objet": "Une petite sonde dans une gaine, reliée au régulateur par deux fils.",
   "probleme": "Terminer un dégivrage sur une durée fixe, c'est soit s'arrêter trop tôt, soit chauffer la chambre pour rien. Une sonde arrête dès que le givre a fondu.",
   "ou": "Dans la batterie de l'évaporateur, au point qui dégivre en dernier."
  }
 ],
 "schema": [
  {
   "n": 1,
   "id": "compresseur_piston",
   "nom": "Compresseur"
  },
  {
   "n": 2,
   "id": "vanne_isolement",
   "nom": "Vanne de service"
  },
  {
   "n": 3,
   "id": "bulle_PZLLHH",
   "nom": "Pressostat combiné"
  },
  {
   "n": 4,
   "id": "bulle_PZL",
   "nom": "Pressostat BP"
  },
  {
   "n": 5,
   "id": "clapet_retenue",
   "nom": "Clapet anti-retour"
  },
  {
   "n": 6,
   "id": "separateur_huile",
   "nom": "Séparateur d'huile"
  },
  {
   "n": 7,
   "id": "reservoir_huile",
   "nom": "Réservoir d'huile"
  },
  {
   "n": 8,
   "id": "filtre_huile",
   "nom": "Filtre d'huile"
  },
  {
   "n": 9,
   "id": "voyant_huile",
   "nom": "Voyant huile"
  },
  {
   "n": 10,
   "id": "condenseur_a_air",
   "nom": "Condenseur"
  },
  {
   "n": 11,
   "id": "bouteille_liquide",
   "nom": "Bouteille liquide"
  },
  {
   "n": 12,
   "id": "filtre_deshydrateur",
   "nom": "Déshydrateur"
  },
  {
   "n": 13,
   "id": "voyant_liquide",
   "nom": "Voyant liquide"
  },
  {
   "n": 14,
   "id": "electrovanne",
   "nom": "Électrovanne"
  },
  {
   "n": 15,
   "id": "detendeur_thermostatique",
   "nom": "Détendeur"
  },
  {
   "n": 16,
   "id": "bulle_TSHL",
   "nom": "Thermostat d'ambiance"
  },
  {
   "n": 17,
   "id": "evaporateur_a_air",
   "nom": "Évaporateur"
  },
  {
   "n": 18,
   "id": "regulateur_kvp",
   "nom": "Régulateur KVP"
  },
  {
   "n": 19,
   "id": "bouteille_anticoup",
   "nom": "Bouteille anti-liquide"
  },
  {
   "n": 20,
   "id": "regulateur_flotteur",
   "nom": "Régulateur à flotteur"
  },
  {
   "n": 21,
   "id": "electrovanne",
   "nom": "Électrovanne huile"
  },
  {
   "n": 22,
   "id": "bulle_PSH",
   "nom": "Pressostat HP régulation"
  }
 ]
};
