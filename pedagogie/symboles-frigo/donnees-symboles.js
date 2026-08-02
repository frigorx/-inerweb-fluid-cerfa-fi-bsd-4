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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24.0 -20.0 50 40\" overflow=\"visible\"><circle cx=\"0.0\" cy=\"0.0\" r=\"15.0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-15\" y1=\"0\" x2=\"-16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"15\" y1=\"0\" x2=\"16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-13\" x2=\"13\" y2=\"-7\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"13\" x2=\"13\" y2=\"7\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-4\" y1=\"0\" x2=\"5\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-5\" y1=\"-5\" x2=\"-5\" y2=\"5\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24.0 -20.0 50 40\" overflow=\"visible\"><circle cx=\"0.0\" cy=\"0.0\" r=\"15.0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-15\" y1=\"0\" x2=\"-16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"15\" y1=\"0\" x2=\"16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-13\" x2=\"13\" y2=\"-7\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"13\" x2=\"13\" y2=\"7\" stroke=\"#000\" stroke-width=\"1\"/>\n<polyline points=\"0,-5 5,0 0,5\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<polyline points=\"-4,-5 1,0 -4,5\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24.0 -20.0 50 40\" overflow=\"visible\"><circle cx=\"0.0\" cy=\"0.0\" r=\"15.0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-15\" y1=\"0\" x2=\"-16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"15\" y1=\"0\" x2=\"16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-13\" x2=\"13\" y2=\"-7\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"13\" x2=\"13\" y2=\"7\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 4.50 A 4.50 4.50 0 0 1 -0.00 -4.50\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 -2.50 A 3.50 3.50 0 0 1 0.00 4.50\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 2.50 A 2.50 2.50 0 0 1 -0.00 -2.50\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 -0.50 A 1.50 1.50 0 0 1 0.00 2.50\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24.0 -20.0 50 40\" overflow=\"visible\"><circle cx=\"0.0\" cy=\"0.0\" r=\"15.0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"0.0\" cy=\"0.0\" r=\"3.5\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"-2\" x2=\"0\" y2=\"2\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"3\" y1=\"0\" x2=\"0\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-15\" y1=\"0\" x2=\"-16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"15\" y1=\"0\" x2=\"16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-13\" x2=\"13\" y2=\"-7\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"13\" x2=\"13\" y2=\"7\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -24 48 48\" overflow=\"visible\"><circle cx=\"0\" cy=\"0\" r=\"15\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 0,-15 A 16,16 0 0 1 0,15\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 0,-15 A 16,16 0 0 0 0,15\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><circle cx=\"0\" cy=\"0\" r=\"5.5\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"0\" y1=\"-15\" x2=\"0\" y2=\"-22\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"15\" x2=\"0\" y2=\"22\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-20 -20 46 40\" overflow=\"visible\"><circle cx=\"0\" cy=\"0\" r=\"15\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"7\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"20\" font-weight=\"700\" fill=\"#000\">M</text><line x1=\"15\" y1=\"0\" x2=\"24\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25.0 -25.0 60 60\" overflow=\"visible\"><rect x=\"-18\" y=\"-20\" width=\"36\" height=\"48\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-14\" y1=\"16\" x2=\"-14\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"7\" y1=\"16\" x2=\"7\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"14\" y1=\"16\" x2=\"14\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"16\" x2=\"-7\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"16\" x2=\"0\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-19\" y1=\"20\" x2=\"19\" y2=\"20\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"0.0\" cy=\"-2.0\" r=\"15.0\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"7\" y1=\"-15\" x2=\"13\" y2=\"5\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -1.00 -2.00 A 1.00 1.00 0 0 1 0.00 -1.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-15\" x2=\"-13\" y2=\"5\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 6.00 5.00 A 6.00 6.00 0 0 1 0.00 -1.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -7.00 4.00 A 6.00 6.00 0 0 1 -1.00 -2.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 -1.00 A 6.00 6.00 0 0 1 -6.00 5.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -6.00 5.00 A 1.00 1.00 0 0 1 -7.00 4.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 1.00 -2.00 A 6.00 6.00 0 0 1 7.00 4.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 -1.00 A 1.00 1.00 0 0 1 1.00 -2.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 7.00 4.00 A 1.00 1.00 0 0 1 6.00 5.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<ellipse cx=\"0.0\" cy=\"-7.0\" rx=\"2.5\" ry=\"4.5\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-19\" cy=\"20\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"19\" cy=\"20\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25.0 -25.0 60 60\" overflow=\"visible\"><rect x=\"-18\" y=\"-20\" width=\"36\" height=\"48\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-14\" y1=\"16\" x2=\"-14\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"7\" y1=\"16\" x2=\"7\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"14\" y1=\"16\" x2=\"14\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"16\" x2=\"-7\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"16\" x2=\"0\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-19\" y1=\"20\" x2=\"19\" y2=\"20\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"0.0\" cy=\"-2.0\" r=\"15.0\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"7\" y1=\"-15\" x2=\"13\" y2=\"5\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -1.00 -2.00 A 1.00 1.00 0 0 1 0.00 -1.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-15\" x2=\"-13\" y2=\"5\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 6.00 5.00 A 6.00 6.00 0 0 1 0.00 -1.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -7.00 4.00 A 6.00 6.00 0 0 1 -1.00 -2.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 -1.00 A 6.00 6.00 0 0 1 -6.00 5.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -6.00 5.00 A 1.00 1.00 0 0 1 -7.00 4.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 1.00 -2.00 A 6.00 6.00 0 0 1 7.00 4.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 -1.00 A 1.00 1.00 0 0 1 1.00 -2.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 7.00 4.00 A 1.00 1.00 0 0 1 6.00 5.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<ellipse cx=\"0.0\" cy=\"-7.0\" rx=\"2.5\" ry=\"4.5\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-19\" cy=\"20\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"19\" cy=\"20\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-28 -23 56 46\" overflow=\"visible\"><ellipse cx=\"0\" cy=\"0\" rx=\"17\" ry=\"13\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-26\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"17,-4 25,0 17,4\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><polyline points=\"-8,7 -8,-7 0,0 8,-7 8,7\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"0\" y1=\"-13\" x2=\"0\" y2=\"-21\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"13\" x2=\"0\" y2=\"21\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-28 -23 56 46\" overflow=\"visible\"><ellipse cx=\"0\" cy=\"0\" rx=\"17\" ry=\"13\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-26\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"17,-4 25,0 17,4\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><polyline points=\"-8,7 -8,-7 0,0 8,-7 8,7\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"0\" y1=\"-13\" x2=\"0\" y2=\"-21\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"13\" x2=\"0\" y2=\"21\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-21.0 -15.0 40 40\" overflow=\"visible\"><line x1=\"6\" y1=\"-5\" x2=\"6\" y2=\"14\" stroke=\"#000\" stroke-width=\"0.5\"/>\n<line x1=\"10\" y1=\"-5.82667\" x2=\"10\" y2=\"-10.16\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0.5\" y1=\"-5\" x2=\"0.5\" y2=\"14\" stroke=\"#000\" stroke-width=\"0.5\"/>\n<rect x=\"-16\" y=\"-5\" width=\"30\" height=\"20\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"20\" x2=\"10\" y2=\"15\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"20.1359\" x2=\"-10\" y2=\"15.8746\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-5\" x2=\"-7\" y2=\"14\" stroke=\"#000\" stroke-width=\"0.5\"/>\n<line x1=\"-12\" y1=\"-5\" x2=\"10\" y2=\"15\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"-5\" x2=\"-12\" y2=\"15\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"-5\" x2=\"-10\" y2=\"-10\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-10\" cy=\"-10\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"10\" cy=\"-10\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-10\" cy=\"20\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"10\" cy=\"20\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-21.0 -15.0 40 40\" overflow=\"visible\"><line x1=\"6\" y1=\"-5\" x2=\"6\" y2=\"14\" stroke=\"#000\" stroke-width=\"0.5\"/>\n<line x1=\"10\" y1=\"-5.82667\" x2=\"10\" y2=\"-10.16\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0.5\" y1=\"-5\" x2=\"0.5\" y2=\"14\" stroke=\"#000\" stroke-width=\"0.5\"/>\n<rect x=\"-16\" y=\"-5\" width=\"30\" height=\"20\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"20\" x2=\"10\" y2=\"15\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"20.1359\" x2=\"-10\" y2=\"15.8746\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-5\" x2=\"-7\" y2=\"14\" stroke=\"#000\" stroke-width=\"0.5\"/>\n<line x1=\"-12\" y1=\"-5\" x2=\"10\" y2=\"15\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"-5\" x2=\"-12\" y2=\"15\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"-5\" x2=\"-10\" y2=\"-10\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-10\" cy=\"-10\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"10\" cy=\"-10\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-10\" cy=\"20\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"10\" cy=\"20\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-34 -40 68 74\" overflow=\"visible\"><polygon points=\"-26,-36 26,-36 18,20 -18,20\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><g transform=\"translate(0,-20) scale(0.8667) translate(0,2)\"><circle cx=\"0\" cy=\"-2\" r=\"15\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M -1,-2 A 1,1 0 0 1 0,-1\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 6,5 A 6,6 0 0 1 0,-1\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M -7,4 A 6,6 0 0 1 -1,-2\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 0,-1 A 6,6 0 0 1 -6,5\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M -6,5 A 1,1 0 0 1 -7,4\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 1,-2 A 6,6 0 0 1 7,4\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 0,-1 A 1,1 0 0 1 1,-2\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 7,4 A 1,1 0 0 1 6,5\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/></g><line x1=\"-32\" y1=\"-4\" x2=\"-9\" y2=\"-4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-9\" y1=\"-4\" x2=\"9\" y2=\"-4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-7\" y1=\"-4\" x2=\"-8.5\" y2=\"1\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"-4\" x2=\"-1.5\" y2=\"1\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"7\" y1=\"-4\" x2=\"5.5\" y2=\"1\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-18\" y1=\"20\" x2=\"18\" y2=\"20\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"20\" x2=\"0\" y2=\"30\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-34 -40 68 74\" overflow=\"visible\"><polygon points=\"-26,-36 26,-36 18,20 -18,20\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><g transform=\"translate(0,-20) scale(0.8667) translate(0,2)\"><circle cx=\"0\" cy=\"-2\" r=\"15\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M -1,-2 A 1,1 0 0 1 0,-1\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 6,5 A 6,6 0 0 1 0,-1\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M -7,4 A 6,6 0 0 1 -1,-2\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 0,-1 A 6,6 0 0 1 -6,5\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M -6,5 A 1,1 0 0 1 -7,4\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 1,-2 A 6,6 0 0 1 7,4\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 0,-1 A 1,1 0 0 1 1,-2\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><path d=\"M 7,4 A 1,1 0 0 1 6,5\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/></g><line x1=\"-9\" y1=\"-6\" x2=\"9\" y2=\"-6\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-7\" y1=\"-6\" x2=\"-8.5\" y2=\"-1\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"-6\" x2=\"-1.5\" y2=\"-1\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"7\" y1=\"-6\" x2=\"5.5\" y2=\"-1\" stroke=\"#000\" stroke-width=\"1\"/><path d=\"M -12,6 h 20 a 3.5,3.5 0 0 1 0,7 h -20\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-32\" y1=\"6\" x2=\"-12\" y2=\"6\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-12\" y1=\"13\" x2=\"-32\" y2=\"13\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"-25,10 -32,13 -25,16\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-18\" y1=\"20\" x2=\"18\" y2=\"20\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"20\" x2=\"0\" y2=\"30\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-19.0 -28.0 40 40\" overflow=\"visible\"><circle cx=\"0.0\" cy=\"-12.00005\" r=\"5.83095\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"-18\" x2=\"0\" y2=\"-20\" stroke=\"#000\" stroke-width=\"1\"/>\n<polygon points=\"2,1 0,3 -2,1 -10,5 -10,-5 10,5 10,-5 -2,1 0,0 0,0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-6\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"0\" x2=\"11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"0\" x2=\"-11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"0\" cy=\"-20\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-26.0 -11.0 50 20\" overflow=\"visible\"><path d=\"M -14.00 -2.30 A 3.00 2.90 0 0 1 -8.00 -2.30\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 11.00 -1.00 A 1.00 1.00 0 0 1 10.00 -2.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"11.7474\" y1=\"-1\" x2=\"17.2737\" y2=\"-1\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 4.00 -2.30 A 3.00 2.90 0 0 1 10.00 -2.30\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 2.00 -1.40 A 1.50 3.60 0 0 1 -1.00 -1.40\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -3.00 -1.40 A 1.50 3.60 0 0 1 -6.00 -1.40\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-21.2526\" y1=\"-1\" x2=\"-15.7263\" y2=\"-1\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -6.00 -2.30 A 4.00 2.90 0 0 1 2.00 -2.30\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -8.00 -1.40 A 1.50 3.60 0 0 1 -11.00 -1.40\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -11.00 -2.30 A 4.00 2.90 0 0 1 -3.00 -2.30\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 7.00 -1.40 A 1.50 3.60 0 0 1 4.00 -1.40\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -1.00 -2.30 A 4.00 2.90 0 0 1 7.00 -2.30\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -14.00 -2.00 A 1.00 1.00 0 0 1 -15.00 -1.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-22\" cy=\"-1\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"18\" cy=\"-1\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-19.0 -21.0 40 30\" overflow=\"visible\"><circle cx=\"0.0\" cy=\"-12.00005\" r=\"5.83095\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<polygon points=\"2,1 0,3 -2,1 -10,5 -10,-5 10,5 10,-5 -2,1 0,0 0,0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-6\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"0\" x2=\"11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"0\" x2=\"-11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-9.0 -22.0 20 40\" overflow=\"visible\"><line x1=\"4.16875\" y1=\"-12.4784\" x2=\"4.16875\" y2=\"7.00201\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -4.44 -12.48 A 4.30 2.00 0 0 1 4.17 -12.48\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 4.17 7.00 A 4.30 2.00 0 0 1 -4.44 7.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-4.4375\" y1=\"-12.4784\" x2=\"-4.4375\" y2=\"7.00201\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"-14\" x2=\"0\" y2=\"-18\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"9\" x2=\"0\" y2=\"13\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"0\" cy=\"-18\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"0\" cy=\"13\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -13 48 26\" overflow=\"visible\"><rect x=\"-14\" y=\"-8\" width=\"28\" height=\"16\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-14\" y1=\"-8\" x2=\"14\" y2=\"8\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-14\" y1=\"8\" x2=\"14\" y2=\"-8\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-22\" y1=\"0\" x2=\"-14\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"14\" y1=\"0\" x2=\"22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -13 48 26\" overflow=\"visible\"><rect x=\"-14\" y=\"-8\" width=\"28\" height=\"16\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-14\" y1=\"-8\" x2=\"14\" y2=\"8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/><line x1=\"-14\" y1=\"8\" x2=\"14\" y2=\"-8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/><line x1=\"-22\" y1=\"0\" x2=\"-14\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"14\" y1=\"0\" x2=\"22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-26.0 -14.0 40 30\" overflow=\"visible\"><rect x=\"-19\" y=\"-8\" width=\"25\" height=\"16\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-15\" y1=\"-8\" x2=\"-15\" y2=\"7\" stroke=\"#000\" stroke-width=\"0.5\" stroke-dasharray=\"4,2\"/>\n<polyline points=\"2,-8 2,-5 -10,-5 -10,5 2,5 2,8\" fill=\"none\" stroke=\"#000\" stroke-width=\"0.5\" stroke-dasharray=\"4,2\"/>\n<circle cx=\"0\" cy=\"9\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"7\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"0\" cy=\"-9\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-20\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -12 48 24\" overflow=\"visible\"><rect x=\"-14\" y=\"-7\" width=\"28\" height=\"14\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><circle cx=\"0\" cy=\"0\" r=\"5.5\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-22\" y1=\"0\" x2=\"-14\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"14\" y1=\"0\" x2=\"22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -12 48 24\" overflow=\"visible\"><rect x=\"-14\" y=\"-7\" width=\"28\" height=\"14\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><circle cx=\"0\" cy=\"0\" r=\"5.5\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-22\" y1=\"0\" x2=\"-14\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"14\" y1=\"0\" x2=\"22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"0\" cy=\"0\" r=\"2.4\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -26 48 42\" overflow=\"visible\"><polyline points=\"-11,-6 -11,6 0,0 11,6 11,-6 0,0 -11,-6\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-11\" y1=\"0\" x2=\"-22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-19\" y1=\"-4\" x2=\"-19\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"19\" y1=\"-4\" x2=\"19\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-16\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-9\" y1=\"-16\" x2=\"9\" y2=\"-16\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-9\" y1=\"-22\" x2=\"-9\" y2=\"-16\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"9\" y1=\"-22\" x2=\"9\" y2=\"-16\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-16 -24 32 44\" overflow=\"visible\"><line x1=\"0\" y1=\"18\" x2=\"0\" y2=\"-10\" stroke=\"#000\" stroke-width=\"1\"/><polygon points=\"-11,-8 0,-20 11,-8 0,-13\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-19.0 -21.0 40 30\" overflow=\"visible\"><line x1=\"-3\" y1=\"-13\" x2=\"3\" y2=\"-9\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 3.00 -7.00 A 3.00 3.00 0 0 1 -3.00 -7.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-3\" y1=\"-8\" x2=\"-3\" y2=\"-15\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -3.00 -15.00 A 3.00 3.00 0 0 1 3.00 -15.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"3\" y1=\"-8\" x2=\"3\" y2=\"-15\" stroke=\"#000\" stroke-width=\"1\"/>\n<polygon points=\"2,1 0,3 -2,1 -10,5 -10,-5 10,5 10,-5 -2,1 0,0 0,0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-4\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"0\" x2=\"11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"0\" x2=\"-11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-19.0 -10.0 40 20\" overflow=\"visible\"><polyline points=\"-10,5 -10,-5 10,5 10,-5\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"10\" y1=\"0\" x2=\"11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-10\" y1=\"0\" x2=\"-11\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-10.0\" cy=\"-5.0\" r=\"1.5\" fill=\"black\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"11\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -18 48 34\" overflow=\"visible\"><polyline points=\"-11,-7 -11,7 0,0 11,7 11,-7 0,0 -11,-7\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><circle cx=\"0\" cy=\"0\" r=\"2.4\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-11\" y1=\"-7\" x2=\"-11\" y2=\"-13\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"-11\" cy=\"-14\" r=\"2.4\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-11\" y1=\"0\" x2=\"-22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-19\" y1=\"-4\" x2=\"-19\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"19\" y1=\"-4\" x2=\"19\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-30 -26 60 52\" overflow=\"visible\"><rect x=\"-22\" y=\"-7\" width=\"44\" height=\"14\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><polygon points=\"-5,-20 5,-20 0,-8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><polygon points=\"-19,20 -9,20 -14,8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><polygon points=\"-5,20 5,20 0,8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><polygon points=\"9,20 19,20 14,8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-26 -14 52 28\" overflow=\"visible\"><line x1=\"-24\" y1=\"0\" x2=\"-12\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-12\" y1=\"-10\" x2=\"-12\" y2=\"10\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-12\" y1=\"10\" x2=\"12\" y2=\"-10\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"12\" y1=\"-10\" x2=\"12\" y2=\"10\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"12\" y1=\"0\" x2=\"24\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-14.0 -18.0 30 40\" overflow=\"visible\"><polyline points=\"1,7 6,2 9,2\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"0\" y1=\"-10\" x2=\"0\" y2=\"-2\" stroke=\"#000\" stroke-width=\"1\"/>\n<polyline points=\"-8,-13 8,-13 8,5 0,13 -8,5 -8,-13\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<ellipse cx=\"0.0\" cy=\"8.0\" rx=\"2.0\" ry=\"1.0\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"0\" cy=\"14\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-9\" cy=\"-10\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"9\" cy=\"-10\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"9\" cy=\"2\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24 -22 48 44\" overflow=\"visible\"><polyline points=\"-10,-15 10,-15 10,6 0,17 -10,6 -10,-15\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"0\" y1=\"-11\" x2=\"0\" y2=\"7\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-10\" y1=\"-10\" x2=\"-21\" y2=\"-10\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-18\" y1=\"-14\" x2=\"-18\" y2=\"-6\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"10\" y1=\"-10\" x2=\"21\" y2=\"-10\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"18\" y1=\"-14\" x2=\"18\" y2=\"-6\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24.0 -14.0 50 30\" overflow=\"visible\"><line x1=\"-17\" y1=\"7\" x2=\"17\" y2=\"7\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-17\" y1=\"-7\" x2=\"17\" y2=\"-7\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 17.50 -7.00 A 2.50 7.00 0 0 1 17.50 7.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -17.50 7.00 A 2.50 7.00 0 0 1 -17.50 -7.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-10\" cy=\"7\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"10\" cy=\"7\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"10\" cy=\"-7\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-10\" cy=\"-7\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"0\" cy=\"-7\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"19\" cy=\"4\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"0\" cy=\"7\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"19\" cy=\"-4\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"20\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-20\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-18 -24 36 48\" overflow=\"visible\"><rect x=\"-11\" y=\"-18\" width=\"22\" height=\"36\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"0\" y1=\"-18\" x2=\"0\" y2=\"-24\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"18\" x2=\"0\" y2=\"24\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-24.0 -20.0 50 40\" overflow=\"visible\"><circle cx=\"0.0\" cy=\"0.0\" r=\"15.0\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -1.00 0.00 A 6.00 6.00 0 0 1 -7.00 -6.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -7.00 6.00 A 6.00 6.00 0 0 1 -1.00 0.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 1.00 A 6.00 6.00 0 0 1 -6.00 7.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -6.00 7.00 A 1.00 1.00 0 0 1 -7.00 6.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -6.00 -7.00 A 6.00 6.00 0 0 1 0.00 -1.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M -7.00 -6.00 A 1.00 1.00 0 0 1 -6.00 -7.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<path d=\"M 0.00 -1.00 A 1.00 1.00 0 0 1 -1.00 0.00\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<ellipse cx=\"4.5\" cy=\"0.0\" rx=\"4.5\" ry=\"2.5\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-15\" y1=\"0\" x2=\"-16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"15\" y1=\"0\" x2=\"16\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"-13\" x2=\"13\" y2=\"-7\" stroke=\"#000\" stroke-width=\"1\"/>\n<line x1=\"-7\" y1=\"13\" x2=\"13\" y2=\"7\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"-16\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-26 -28 52 44\" overflow=\"visible\"><polyline points=\"-11,-6 -11,6 0,0 11,6 11,-6 0,0 -11,-6\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-11\" y1=\"0\" x2=\"-22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-19\" y1=\"-4\" x2=\"-19\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"22\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"19\" y1=\"-4\" x2=\"19\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-14\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"-14\" x2=\"-16\" y2=\"-20\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"-19\" cy=\"-21\" r=\"4\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-9\" y1=\"-19\" x2=\"-9\" y2=\"-13\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25 -26 50 46\" overflow=\"visible\"><rect x=\"-22\" y=\"-24\" width=\"44\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">PZL</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25 -26 50 46\" overflow=\"visible\"><rect x=\"-22\" y=\"-24\" width=\"44\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">PZH</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25 -26 50 46\" overflow=\"visible\"><rect x=\"-22\" y=\"-24\" width=\"44\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">PSL</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25 -26 50 46\" overflow=\"visible\"><rect x=\"-22\" y=\"-24\" width=\"44\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">PSH</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-36 -26 72 46\" overflow=\"visible\"><rect x=\"-33\" y=\"-24\" width=\"66\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">PZLLHH</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25 -26 50 46\" overflow=\"visible\"><rect x=\"-22\" y=\"-24\" width=\"44\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">TC</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-25 -26 50 46\" overflow=\"visible\"><rect x=\"-22\" y=\"-24\" width=\"44\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">TZ</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-18 -30 36 48\" overflow=\"visible\"><circle cx=\"0\" cy=\"-13\" r=\"12\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-8.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">TI</text><line x1=\"0\" y1=\"-1\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-28 -26 56 46\" overflow=\"visible\"><rect x=\"-25\" y=\"-24\" width=\"50\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">TSHL</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-32 -34 64 26\" overflow=\"visible\"><polyline points=\"-11,-6 -11,6 0,0 11,6 11,-6 0,0 -11,-6\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-11\" y1=\"0\" x2=\"-20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-17\" y1=\"-4\" x2=\"-17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"17\" y1=\"-4\" x2=\"17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-8\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"-4,-9 4,-9 0,-2 -4,-9\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"0\" cy=\"-18\" r=\"8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-14\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"9\" font-weight=\"700\" fill=\"#000\">PC</text><path d=\"M -8,-18 L -22,-18 L -22,-27\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-32 -34 64 26\" overflow=\"visible\"><polyline points=\"-11,-6 -11,6 0,0 11,6 11,-6 0,0 -11,-6\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-11\" y1=\"0\" x2=\"-20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-17\" y1=\"-4\" x2=\"-17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"17\" y1=\"-4\" x2=\"17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-8\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"-4,-9 4,-9 0,-2 -4,-9\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"0\" cy=\"-18\" r=\"8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-14\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"9\" font-weight=\"700\" fill=\"#000\">PA</text><path d=\"M -8,-18 L -22,-18 L -22,-27\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-32 -34 64 26\" overflow=\"visible\"><polyline points=\"-11,-6 -11,6 0,0 11,6 11,-6 0,0 -11,-6\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-11\" y1=\"0\" x2=\"-20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-17\" y1=\"-4\" x2=\"-17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"17\" y1=\"-4\" x2=\"17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-8\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"-4,-9 4,-9 0,-2 -4,-9\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"0\" cy=\"-18\" r=\"8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-14\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"9\" font-weight=\"700\" fill=\"#000\">RC</text><path d=\"M 8,-18 L 22,-18 L 22,-27\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-32 -34 64 26\" overflow=\"visible\"><polyline points=\"-11,-6 -11,6 0,0 11,6 11,-6 0,0 -11,-6\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-11\" y1=\"0\" x2=\"-20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-17\" y1=\"-4\" x2=\"-17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"17\" y1=\"-4\" x2=\"17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-8\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"-4,-9 4,-9 0,-2 -4,-9\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"0\" cy=\"-18\" r=\"8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-14\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"9\" font-weight=\"700\" fill=\"#000\">RD</text><path d=\"M 8,-18 L 22,-18 L 22,-27\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-32 -34 64 26\" overflow=\"visible\"><polyline points=\"-11,-6 -11,6 0,0 11,6 11,-6 0,0 -11,-6\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><line x1=\"-11\" y1=\"0\" x2=\"-20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"-17\" y1=\"-4\" x2=\"-17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"11\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"17\" y1=\"-4\" x2=\"17\" y2=\"4\" stroke=\"#000\" stroke-width=\"1\"/><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"-8\" stroke=\"#000\" stroke-width=\"1\"/><polyline points=\"-4,-9 4,-9 0,-2 -4,-9\" fill=\"#000\" stroke=\"#000\" stroke-width=\"1\"/><circle cx=\"0\" cy=\"-18\" r=\"8\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-14\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"9\" font-weight=\"700\" fill=\"#000\">&#916;P</text><path d=\"M -8,-18 L -22,-18 L -22,-27\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/><path d=\"M 8,-18 L 22,-18 L 22,-27\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\" stroke-dasharray=\"3,2.5\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-27 -26 54 46\" overflow=\"visible\"><rect x=\"-24\" y=\"-24\" width=\"48\" height=\"20\" rx=\"10\" stroke=\"#000\" stroke-width=\"1\" fill=\"none\"/><text x=\"0\" y=\"-9.5\" text-anchor=\"middle\" font-family=\"Arial,Helvetica,sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#000\">PDZ</text><line x1=\"0\" y1=\"-4\" x2=\"0\" y2=\"16\" stroke=\"#000\" stroke-width=\"1\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-29.0 -13.0 70 20\" overflow=\"visible\"><polyline points=\"-20,0 -12,0 -12,-9 -2,-9 -2,0 7,0 7,-9 17,-9 17,0 26,0 26,-9 35,-9 35,0 34,0\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-21\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>"
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
   "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-30.0 -14.0 60 40\" overflow=\"visible\"><line x1=\"-20\" y1=\"0\" x2=\"20\" y2=\"0\" stroke=\"#000\" stroke-width=\"1\"/>\n<rect x=\"-10\" y=\"-5\" width=\"20\" height=\"10\" fill=\"white\" stroke=\"#000\" stroke-width=\"1\"/>\n<polyline points=\"-10,10 -5,10 5,-10 10,-10\" fill=\"none\" stroke=\"#000\" stroke-width=\"1\"/>\n<circle cx=\"-20\" cy=\"0\" r=\"1.5\" fill=\"#000\"/>\n<circle cx=\"20\" cy=\"0\" r=\"1.5\" fill=\"#000\"/></svg>"
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
