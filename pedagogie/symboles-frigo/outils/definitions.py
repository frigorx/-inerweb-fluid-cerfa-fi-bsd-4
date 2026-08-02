# -*- coding: utf-8 -*-
"""Définitions des 53 organes — la couche qui manquait.

Avant de savoir lire un symbole, l'élève doit savoir CE QU'EST l'objet.
Trois champs par organe, et trois seulement :

  objet     — c'est quoi, physiquement, dans la main
  probleme  — pourquoi ça existe : ce qui se passerait sans lui
  ou        — où on le trouve sur l'installation

On s'arrête là volontairement. Le FONCTIONNEMENT détaillé (courbes,
réglages, diagnostic) relève des séances suivantes : ici on plante la
définition et le rôle, rien de plus.

Aucune valeur chiffrée : ni dimension, ni pression, ni température.
Importé par outils/generer-donnees.py.
"""

DEFINITIONS = {

# ---------------------------------------------------------- A. Machines
'compresseur_piston': dict(
    objet="Un bloc lourd, en fonte ou en acier, avec son moteur électrique intégré ou accouplé. "
          "Dedans, un ou plusieurs pistons montés sur un vilebrequin — comme dans un moteur de voiture, "
          "sauf qu'ici ils compriment un gaz au lieu de le faire exploser.",
    probleme="Sans lui, rien ne bouge. Le fluide resterait là où il est et il n'y aurait aucun froid : "
             "c'est le seul organe du circuit qui apporte de l'énergie.",
    ou="Au point bas du circuit. Il aspire ce qui vient de l'évaporateur et refoule vers le condenseur."),

'compresseur_vis': dict(
    objet="Deux rotors hélicoïdaux, comme deux grosses vis imbriquées qui tournent l'une contre l'autre. "
          "Le gaz est pris entre les filets et poussé vers la sortie dans un volume qui se réduit.",
    probleme="Un piston travaille par à-coups. Une vis tourne en continu, sans pulsation — c'est ce qu'on "
             "cherche sur les fortes puissances qui marchent des mois d'affilée.",
    ou="Même place que tout compresseur. On le trouve en industrie et sur les grosses centrales."),

'compresseur_scroll': dict(
    objet="Deux spirales imbriquées. L'une est fixe, l'autre décrit un petit cercle sans tourner sur "
          "elle-même. Le gaz est emprisonné entre les spires et poussé vers le centre.",
    probleme="Peu de pièces en mouvement, donc peu de bruit et peu d'usure. C'est ce qui l'a imposé "
             "en climatisation, là où le matériel est près des gens.",
    ou="Même place que tout compresseur. Très répandu en climatisation et en pompe à chaleur."),

'compresseur_rotatif': dict(
    objet="Un rotor décentré qui roule à l'intérieur d'un cylindre, avec une palette coulissante qui "
          "sépare le côté aspiration du côté refoulement.",
    probleme="Compact et bon marché. C'est ce qu'il faut quand la puissance est faible et la place comptée.",
    ou="Froid domestique, petits climatiseurs, PAC air/air."),

'compresseur_centrifuge': dict(
    objet="Une roue à aubes qui tourne très vite, comme une turbine. Le gaz est projeté vers l'extérieur "
          "par la force centrifuge, et cette vitesse se transforme en pression.",
    probleme="Il n'y a pas de compresseur à pistons capable d'avaler les débits d'un groupe d'eau glacée "
             "industriel. Le centrifuge, si.",
    ou="Très grosses puissances : groupes d'eau glacée de bâtiments tertiaires ou industriels."),

'moteur_electrique': dict(
    objet="Un moteur électrique ordinaire, avec son arbre et sa plaque signalétique.",
    probleme="Il faut bien quelque chose pour faire tourner le compresseur, le ventilateur ou la pompe.",
    ou="Partout où quelque chose tourne. Intégré au compresseur s'il est hermétique, séparé s'il est ouvert."),

# --------------------------------------------------------- B. Échangeurs
'condenseur_a_air': dict(
    objet="Une batterie : des tubes de cuivre qui traversent des centaines d'ailettes en aluminium "
          "serrées les unes contre les autres, et un ou plusieurs ventilateurs qui soufflent de l'air "
          "au travers.",
    probleme="La chaleur prise dans la chambre doit bien partir quelque part. Le condenseur la rejette "
             "dans l'air extérieur.",
    ou="Après le compresseur. Le plus souvent dehors, sur un toit ou une façade."),

'evaporateur_a_air': dict(
    objet="Exactement la même batterie à ailettes avec ses ventilateurs — mais installée à l'intérieur "
          "de la chambre froide ou du local à climatiser.",
    probleme="C'est lui qui fait le froid. Il prend la chaleur de l'air du local pour vaporiser le fluide.",
    ou="Dans la chambre, généralement en hauteur, orienté pour brasser tout le volume."),

'condenseur_a_eau': dict(
    objet="Un corps cylindrique fermé, avec un faisceau de tubes à l'intérieur. Le fluide frigorigène "
          "circule d'un côté, l'eau de l'autre — les deux ne se touchent jamais.",
    probleme="Quand on ne peut pas rejeter la chaleur dans l'air (pas de place, trop de bruit, chaleur "
             "à récupérer), on la passe à un circuit d'eau.",
    ou="Après le compresseur, relié à un réseau d'eau ou à une tour de refroidissement."),

'evaporateur_a_eau': dict(
    objet="Le même corps à faisceau de tubes. Ici c'est le fluide frigorigène qui se vaporise et l'eau "
          "qui se refroidit.",
    probleme="Refroidir de l'eau plutôt que de l'air permet de la distribuer loin, dans tout un bâtiment, "
             "avec de simples tuyaux.",
    ou="Après le détendeur, sur un groupe d'eau glacée."),

'condenseur_a_plaque': dict(
    objet="Un empilement de plaques d'inox gaufrées, brasées ensemble. Les deux fluides circulent en "
          "quinconce, une plaque sur deux.",
    probleme="Il faut beaucoup de surface d'échange dans très peu de volume. Les plaques donnent ça.",
    ou="Après le compresseur, sur les installations compactes."),

'evaporateur_a_plaque': dict(
    objet="Le même empilement de plaques brasées. Seul son rôle dans le circuit change.",
    probleme="Même raison : un échange très efficace dans un encombrement minimal.",
    ou="Après le détendeur, sur les groupes d'eau glacée et les PAC."),

'tour_refroidissement_ouverte': dict(
    objet="Une grande caisse ouverte, avec un ventilateur en haut et une rampe qui pulvérise l'eau. "
          "L'eau ruisselle sur un garnissage, une petite partie s'évapore — et c'est cette évaporation "
          "qui refroidit tout le reste.",
    probleme="Un condenseur à air ne peut pas descendre en dessous de la température de l'air. "
             "L'évaporation, si.",
    ou="En terrasse ou en extérieur, reliée au condenseur à eau."),

'tour_refroidissement_fermee': dict(
    objet="Même caisse, même ventilateur, même pulvérisation — mais l'eau du circuit passe dans un "
          "serpentin arrosé par l'extérieur. Elle ne touche jamais l'air.",
    probleme="Dans une tour ouverte, l'eau du circuit s'encrasse, s'entartre et se charge de tout ce "
             "que l'air transporte. La tour fermée l'en protège.",
    ou="Même place que la tour ouverte."),

# -------------------------------------------------------- C. Détendeurs
'detendeur_thermostatique': dict(
    objet="Une petite vanne en laiton, surmontée d'une membrane sous un chapeau. Un tube capillaire "
          "en sort et se termine par un bulbe, qu'on sangle sur le tube de sortie de l'évaporateur.",
    probleme="L'évaporateur doit recevoir exactement ce qu'il peut vaporiser. Trop de liquide : "
             "il repart vers le compresseur. Pas assez : la chambre ne descend pas.",
    ou="Juste avant l'évaporateur, au plus près. Le bulbe se pose à la sortie de l'évaporateur."),

'detendeur_capillaire': dict(
    objet="Un simple tube de cuivre très fin et très long, souvent enroulé. Aucune pièce mobile, "
          "aucun réglage : c'est la longueur et le diamètre qui font tout.",
    probleme="Sur une petite machine, un détendeur réglable coûterait plus cher que le reste. "
             "Le capillaire ne coûte presque rien et ne tombe jamais en panne.",
    ou="Avant l'évaporateur, sur le froid domestique et les petites puissances."),

'detendeur_electrique': dict(
    objet="Une vanne dont l'ouverture est commandée par un moteur pas-à-pas ou une bobine, "
          "piloté par un régulateur électronique et ses sondes.",
    probleme="Un détendeur mécanique réagit à ce qu'il mesure sur place. Un détendeur piloté peut "
             "tenir compte de plusieurs mesures et s'adapter beaucoup plus finement.",
    ou="Même place que le détendeur thermostatique, avec son régulateur dans le coffret."),

# --------------------------------- D. Filtration et contrôle visuel
'silencieux': dict(
    objet="Un corps cylindrique cloisonné à l'intérieur, brasé sur la ligne de refoulement.",
    probleme="Un compresseur à pistons envoie le gaz par à-coups. Ces pulsations font vibrer et "
             "« chanter » les tuyauteries, et à la longue elles fatiguent les brasures.",
    ou="Au refoulement, au plus près du compresseur."),

'filtre_huile': dict(
    objet="Une cartouche filtrante dans son corps, montée sur la ligne de retour d'huile.",
    probleme="L'huile qui revient a fait tout le tour du circuit. Elle rapporte des particules, "
             "et les organes qu'elle traverse ensuite sont des mécanismes fins.",
    ou="Sur le circuit d'huile, entre le réservoir et les régulateurs de niveau."),

'filtre_deshydrateur': dict(
    objet="Un cylindre métallique brasé sur la ligne liquide, rempli de billes de déshydratant "
          "et d'un tamis filtrant. Une flèche gravée dessus indique le sens de montage.",
    probleme="L'eau est l'ennemi numéro un d'un circuit frigorifique : elle gèle à l'orifice du "
             "détendeur et le bouche, et elle attaque l'huile. Le déshydratant la retient.",
    ou="Sur la ligne liquide, après la bouteille et avant le voyant."),

'filtre_cartouche': dict(
    objet="Un corps avec une cartouche démontable à l'intérieur, monté sur la ligne d'aspiration.",
    probleme="Après un grillage de moteur ou un chantier, le circuit est plein de saletés. "
             "Elles ne doivent pas entrer dans le compresseur.",
    ou="Sur l'aspiration, juste avant le compresseur."),

'voyant_liquide': dict(
    objet="Un petit corps en laiton avec un hublot en verre. Au centre, une pastille qui change de "
          "couleur selon la teneur en humidité du fluide.",
    probleme="Le circuit est fermé et opaque : on ne voit rien de ce qui s'y passe. Le voyant est "
             "la seule fenêtre.",
    ou="Sur la ligne liquide, juste après le déshydrateur."),

'voyant_huile': dict(
    objet="Le même hublot, mais monté sur le carter du compresseur ou sur le circuit d'huile. "
          "Souvent avec un repère de niveau.",
    probleme="Un compresseur qui manque d'huile se détruit. Encore faut-il pouvoir vérifier "
             "sans rien démonter.",
    ou="Sur le carter du compresseur, et sur le circuit d'huile après le filtre."),

# ------------------------------ E. Vannes et sécurités mécaniques
'vanne_isolement': dict(
    objet="Un robinet à corps métallique, manœuvré par un volant ou par un carré sous un capuchon "
          "vissé qu'il faut retirer avant d'agir.",
    probleme="Pour intervenir sur une partie du circuit, il faut pouvoir l'isoler sans vidanger "
             "toute l'installation.",
    ou="Aux points de coupure utiles : sortie de bouteille, aspiration et refoulement du compresseur."),

'prise_schrader': dict(
    objet="Exactement la même valve que sur une roue de vélo ou de voiture : un obus poussé par un "
          "ressort, sous un bouchon.",
    probleme="Il faut pouvoir brancher un manomètre ou transférer du fluide sans ouvrir le circuit "
             "ni le vider.",
    ou="Sur les vannes de service, et en plusieurs points du circuit pour la mesure."),

'electrovanne': dict(
    objet="Une vanne surmontée d'une bobine électrique. Sous tension, la bobine attire un noyau "
          "qui libère le passage ; hors tension, un ressort le referme.",
    probleme="Il faut pouvoir ouvrir et fermer un circuit à distance, depuis une commande électrique — "
             "un thermostat, une horloge, un régulateur.",
    ou="Sur la ligne liquide au plus près du détendeur. Et sur toute ligne à commander à distance."),

'clapet_retenue': dict(
    objet="Un battant, ou une bille poussée par un ressort, enfermé dans un corps de tuyauterie. "
          "Il ne peut s'ouvrir que dans un sens.",
    probleme="À l'arrêt, la pression pousse le fluide en sens inverse. Il peut alors traverser le "
             "compresseur à l'envers, ou remonter vers un autre poste de froid.",
    ou="Au refoulement du compresseur, et sur toute jonction où deux circuits pourraient se renvoyer du fluide."),

'soupape_retenue': dict(
    objet="Un corps de vanne à siège, qui impose lui aussi un sens unique de passage. "
          "La technologie interne diffère du clapet ; la fonction que lui donne le document est la même.",
    probleme="Même problème que le clapet : empêcher le fluide de repartir en arrière.",
    ou="Sur les lignes où le sens de circulation doit être garanti."),

'v4v': dict(
    objet="Un corps massif avec quatre raccords et un tiroir à l'intérieur, déplacé par une petite "
          "bobine électrique.",
    probleme="Pour qu'une machine fasse du chaud l'hiver et du froid l'été, il faut pouvoir échanger "
             "les rôles du condenseur et de l'évaporateur — sans rien démonter.",
    ou="Au refoulement du compresseur, sur les installations réversibles."),

# ------------------------ F. Réservoirs et accessoires de ligne
'eliminateur_vibration': dict(
    objet="Un tronçon souple : un soufflet métallique, le plus souvent gainé d'une tresse d'inox.",
    probleme="Un compresseur vibre. Ces vibrations se propagent dans les tuyauteries rigides "
             "et finissent par fissurer les brasures.",
    ou="Au plus près du compresseur, sur l'aspiration et sur le refoulement."),

'separateur_huile': dict(
    objet="Un corps vertical où le gaz ralentit brutalement. L'huile, plus lourde, se sépare et "
          "tombe au fond ; un flotteur ouvre alors le retour vers le carter.",
    probleme="L'huile part avec le gaz au refoulement. Si elle ne revient pas, elle s'accumule dans "
             "l'évaporateur — qui échange de moins en moins — et le compresseur s'assèche.",
    ou="Au refoulement, juste après le compresseur."),

'bouteille_anticoup': dict(
    objet="Un réservoir monté sur la ligne d'aspiration, avec un tube plongeur qui ne reprend le gaz "
          "que par le haut. Un petit orifice au fond laisse remonter l'huile, doucement.",
    probleme="Un compresseur comprime du gaz, pas du liquide. Un retour de liquide casse les clapets, "
             "voire une bielle.",
    ou="Sur l'aspiration, avant le compresseur. Indispensable en dégivrage par gaz chauds."),

'bouteille_liquide': dict(
    objet="Un réservoir, souvent couché, placé après le condenseur. Un tube plongeur prend le liquide "
          "tout au fond, pour qu'il ne parte jamais de gaz vers la ligne liquide.",
    probleme="La charge utile varie selon la saison et le régime. Il faut un endroit où le liquide "
             "en trop peut attendre — et une garantie que le détendeur soit toujours alimenté en liquide.",
    ou="Juste après le condenseur, en tête de ligne liquide."),

'reservoir_huile': dict(
    objet="Un réservoir vertical qui stocke l'huile récupérée par le séparateur.",
    probleme="Sur une centrale, plusieurs compresseurs réclament de l'huile sans se concerter. "
             "Sans réserve commune, le premier qui appelle prend tout.",
    ou="Sur le circuit d'huile, entre le séparateur et le filtre."),

'ventilateur': dict(
    objet="Une hélice et son moteur, montés dans une virole.",
    probleme="Sans mouvement d'air, une batterie à ailettes n'échange presque rien : l'air qui la "
             "touche se met à sa température et plus rien ne se passe.",
    ou="Sur le condenseur à air, sur l'évaporateur à air, et dans les tours de refroidissement."),

'regulateur_flotteur': dict(
    objet="Une petite vanne commandée par une boule qui flotte sur l'huile, montée directement "
          "sur le carter du compresseur.",
    probleme="Chaque compresseur doit se servir tout seul, au bon moment, sans qu'on aille "
             "vérifier les niveaux à la main.",
    ou="Sur le carter de chaque compresseur d'une centrale."),

# --------------------------------------- G. Instruments (bulles)
'bulle_PZL': dict(
    objet="Un boîtier avec un soufflet relié au circuit par un petit tube. Quand la pression bouge, "
          "le soufflet se déforme et bascule un contact électrique.",
    probleme="Une pression trop basse veut dire qu'il manque du fluide, ou que quelque chose est bouché. "
             "Continuer à tourner dans cet état abîme le compresseur.",
    ou="Sur l'aspiration. Souvent à réarmement manuel : il ne redémarre pas tout seul."),

'bulle_PZH': dict(
    objet="Le même boîtier à soufflet et contact, raccordé cette fois sur la haute pression.",
    probleme="Une pression trop haute, c'est un condenseur bouché, un ventilateur arrêté, ou une "
             "vanne fermée. C'est le risque de rupture. Ce pressostat est le dernier rempart.",
    ou="Sur le refoulement. À réarmement manuel dans la plupart des cas."),

'bulle_PSL': dict(
    objet="Même appareil que le pressostat de sécurité, mais réglé pour couper et réenclencher tout "
          "seul, en fonctionnement normal.",
    probleme="Il faut bien quelque chose qui arrête et relance le compresseur au fil de la demande, "
             "sans intervention humaine.",
    ou="Sur l'aspiration. C'est lui qui termine un pump down."),

'bulle_PSH': dict(
    objet="Même appareil, raccordé sur la haute pression, réglé pour piloter et non pour couper.",
    probleme="Quand la pression de condensation monte, il faut souffler davantage. Ce pressostat "
             "enclenche les ventilateurs supplémentaires.",
    ou="Sur le refoulement, relié à la commande des ventilateurs de condenseur."),

'bulle_PZLLHH': dict(
    objet="Un seul boîtier qui réunit les deux sécurités : basse pression et haute pression, "
          "avec deux réglages distincts.",
    probleme="Il faut les deux sécurités. Les réunir économise un appareil, un capillaire et "
             "de la place dans le coffret.",
    ou="Monté directement sur le compresseur, raccordé à l'aspiration et au refoulement."),

'bulle_TC': dict(
    objet="Un boîtier avec une sonde ou un bulbe placé dans l'ambiance, et un contact électrique "
          "qui bascule selon la température mesurée.",
    probleme="C'est la température de la chambre qui compte, pas celle du fluide. Il faut donc "
             "quelque chose qui mesure là où sont les produits.",
    ou="Dans la chambre froide ou le local, à l'écart des courants d'air et des sources de chaleur."),

'bulle_TZ': dict(
    objet="Le même type de boîtier à bulbe, mais réglé sur un seuil dangereux, et non sur une consigne "
          "de confort.",
    probleme="Certains équipements ne doivent jamais dépasser une température : ils se détruiraient, "
             "ou deviendraient dangereux.",
    ou="Au point à surveiller — refoulement du compresseur, carter, batterie de dégivrage."),

'bulle_TI': dict(
    objet="Un cadran à aiguille, ou un afficheur, avec sa sonde ou son capillaire.",
    probleme="Pour diagnostiquer, il faut lire. Sans indication de température, on travaille à l'aveugle.",
    ou="Aux points de mesure utiles. Il n'est raccordé à aucun contact : il n'agit sur rien."),

'bulle_TSHL': dict(
    objet="Un thermostat d'ambiance à deux seuils : un pour lancer le froid, un pour l'arrêter.",
    probleme="Avec un seuil unique, l'installation démarrerait et s'arrêterait sans arrêt autour "
             "de la consigne. Deux seuils créent l'écart nécessaire.",
    ou="Dans la chambre. Il commande l'électrovanne de ligne liquide."),

# --------------------------------------- H. Régulateurs de pression
'regulateur_kvp': dict(
    objet="Une vanne en laiton avec une vis de réglage sous un capuchon vissé. "
          "Elle se ferme d'elle-même quand la pression descend trop.",
    probleme="Sur une centrale, toutes les chambres partagent la même basse pression. Sans lui, "
             "la chambre la plus tempérée descendrait au niveau de la plus froide et gèlerait ses produits.",
    ou="Sur l'aspiration, en sortie d'évaporateur de la chambre à protéger."),

'regulateur_kvr': dict(
    objet="Une vanne en laiton à vis de réglage, montée sur la ligne liquide. En freinant la sortie "
          "du condenseur, elle y fait monter le niveau de liquide.",
    probleme="L'hiver, le condenseur refroidit trop et la haute pression s'effondre. Le détendeur "
             "n'a alors plus assez d'écart de pression pour alimenter l'évaporateur.",
    ou="En sortie de condenseur, avant la bouteille. Toujours accompagné de la vanne différentielle NRD."),

'regulateur_kvc': dict(
    objet="Une vanne de dérivation en laiton, montée entre le refoulement et l'aspiration.",
    probleme="Quand la demande de froid baisse, le compresseur reste dimensionné pour la pleine charge. "
             "Il s'arrête et redémarre sans cesse, et ces courts cycles l'usent.",
    ou="En by-pass, du refoulement vers l'aspiration."),

'regulateur_kvl': dict(
    objet="Une vanne en laiton à vis de réglage, montée sur l'aspiration juste avant le compresseur.",
    probleme="Au démarrage et après un dégivrage, l'évaporateur est chaud et la basse pression est "
             "anormalement haute. Le compresseur avale trop de gaz et son moteur force.",
    ou="Sur l'aspiration, au plus près du compresseur."),

# ------------------------------------------- I. Circuits réels
'nrd': dict(
    objet="Une vanne qui compare deux pressions et s'ouvre quand l'écart entre elles dépasse "
          "son réglage.",
    probleme="Quand le KVR noie le condenseur, la bouteille liquide n'est plus alimentée en pression "
             "et le liquide n'avance plus. Il faut lui envoyer du gaz chaud pour la remettre sous pression.",
    ou="Sur une dérivation entre le refoulement et la bouteille liquide. Toujours avec un KVR."),

'bulle_PDZ': dict(
    objet="Un boîtier raccordé par deux capillaires : un côté pompe à huile, un côté carter. "
          "Il compare les deux et intègre une temporisation.",
    probleme="Un compresseur qui tourne sans pression d'huile se détruit en quelques minutes. "
             "Mais la pression met un instant à s'établir au démarrage — d'où la temporisation.",
    ou="Sur le compresseur, raccordé à la pompe à huile et au carter."),

'resistance_degivrage': dict(
    objet="Des résistances électriques blindées, glissées entre les ailettes de la batterie, "
          "posées dans l'égouttoir et déroulées le long du tuyau d'écoulement.",
    probleme="Sous zéro, l'humidité de l'air se dépose en givre sur la batterie. Le givre isole : "
             "l'échange chute et la machine tire pour rien.",
    ou="Dans l'évaporateur. Et surtout aussi dans l'égouttoir et l'écoulement — sinon l'eau y regèle."),

'sonde_temperature': dict(
    objet="Une petite sonde dans une gaine, reliée au régulateur par deux fils.",
    probleme="Terminer un dégivrage sur une durée fixe, c'est soit s'arrêter trop tôt, soit chauffer "
             "la chambre pour rien. Une sonde arrête dès que le givre a fondu.",
    ou="Dans la batterie de l'évaporateur, au point qui dégivre en dernier."),

}
