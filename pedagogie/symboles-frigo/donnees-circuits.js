/* Module 2 — Construire et lire un circuit réel.
   Contenu pédagogique : chaînes d'organes, séquences de commande,
   classement des régulateurs de pression, groupe de condensation.

   Ce fichier est rédigé à la main (contrairement à donnees-symboles.js).
   Aucune valeur de réglage n'y figure volontairement : les seuils, plages et
   temporisations dépendent du constructeur et de l'installation. Partout où
   un réglage est en jeu, le texte renvoie à la documentation constructeur. */

const CIRCUITS = {

/* ==========================================================================
   1. LES CHAÎNES — un ordre de montage, et le pourquoi de chaque position
   ========================================================================== */
chaines: [

{
  id: 'ligne-liquide',
  titre: 'La ligne liquide',
  sous: 'Du condenseur au détendeur',
  duree: '25 min',
  intro:
    "Entre le condenseur et le détendeur, le fluide est liquide et sous haute pression. " +
    "Cette portion s'appelle la ligne liquide. Six organes s'y succèdent, et leur ordre " +
    "n'est pas une question de goût : chaque position se justifie. " +
    "Un ordre faux, et l'installation fonctionne quand même — mal, et sans qu'on sache pourquoi.",
  depart: { id: 'condenseur_a_air', nom: 'Condenseur' },
  arrivee: { id: 'evaporateur_a_air', nom: 'Évaporateur' },
  elements: [
    { id: 'bouteille_liquide', nom: 'Bouteille (réservoir) de liquide',
      pourquoi:
        "Elle vient en premier parce qu'elle doit recevoir tout le liquide qui sort du condenseur. " +
        "Elle sert de réserve et de garde de liquide : elle garantit que la ligne reste pleine de liquide, " +
        "même quand la charge du circuit varie. Placée plus loin, elle ne joue plus ce rôle.",
      indice: "Elle se remplit par gravité : elle se monte au niveau ou en dessous de la sortie du condenseur." },
    { id: 'vanne_isolement', nom: "Vanne d'isolement (départ liquide)",
      pourquoi:
        "Juste après la bouteille, elle permet de consigner toute la ligne liquide sans vidanger le circuit. " +
        "C'est elle qu'on ferme pour faire un tirage au vide de service, ou pour remplacer le déshydrateur.",
      indice: "Le volant en H : c'est une commande manuelle, donc un organe de maintenance." },
    { id: 'filtre_deshydrateur', nom: 'Filtre déshydrateur',
      pourquoi:
        "Il retient l'humidité et les impuretés avant qu'elles n'atteignent le détendeur. " +
        "L'humidité gèle à l'orifice du détendeur et le bouche ; les impuretés le rayent. " +
        "Il se place donc en amont de tout ce qui est fragile.",
      indice: "Il est le premier organe de la ligne à s'encrasser — et il perd alors de la charge." },
    { id: 'voyant_liquide', nom: 'Voyant liquide',
      pourquoi:
        "Il vient APRÈS le déshydrateur, jamais avant. C'est un instrument de diagnostic : placé après, " +
        "il dit si le déshydrateur fait son travail. Des bulles = manque de charge ou perte de charge excessive. " +
        "Pastille d'humidité qui change de couleur = déshydrateur saturé. Placé avant, il n'apprend rien.",
      indice: "Il se lit en régime établi — jamais au démarrage, jamais pendant un dégivrage." },
    { id: 'electrovanne', nom: 'Électrovanne de ligne liquide',
      pourquoi:
        "Au plus près du détendeur. C'est elle qui ferme la ligne pour le pump down : tout le liquide " +
        "resté entre elle et le détendeur partira dans l'évaporateur au moment de la fermeture. " +
        "Plus cette portion est courte, mieux le pump down est fait.",
      indice: "Elle est commandée par le thermostat d'ambiance — jamais par le contacteur du compresseur." },
    { id: 'detendeur_thermostatique', nom: 'Détendeur',
      pourquoi:
        "Dernier organe de la ligne liquide, et au plus près de l'évaporateur. " +
        "Toute perte de charge après lui est perdue pour la détente, et l'alimentation des passes " +
        "de l'évaporateur doit rester homogène.",
      indice: "Le bulbe se pose sur la sortie d'évaporateur : c'est lui qui mesure la surchauffe." }
  ],
  regles: [
    { titre: "L'ennemi de la ligne liquide s'appelle le flash-gas",
      texte:
        "Si le fluide se met à bouillir dans la ligne liquide, le détendeur reçoit un mélange liquide + vapeur. " +
        "Son débit s'effondre, la surchauffe explose, la puissance frigorifique chute. " +
        "Le voyant plein de bulles en régime établi est le symptôme." },
    { titre: "Quatre causes, et une seule à la fois suffit",
      texte:
        "Sous-refroidissement insuffisant en sortie de condenseur · pertes de charge (longueur, coudes, " +
        "déshydrateur encrassé) · remontée verticale · échauffement de la ligne qui traverse un local chaud." },
    { titre: "Toute remontée verticale coûte de la pression",
      texte:
        "Une colonne de liquide qu'il faut monter fait perdre Δp = ρ × g × h. " +
        "Plus le fluide est dense et plus la hauteur est grande, plus la perte est forte. " +
        "Calculer avec la masse volumique du liquide à la température de la ligne — jamais de valeur toute faite." },
    { titre: "Le sous-refroidissement est la marge de sécurité",
      texte:
        "C'est lui qui permet au liquide d'encaisser les pertes de charge sans se vaporiser. " +
        "Plage usuelle : 4 à 8 K en sortie de condenseur. À confirmer avec la documentation constructeur " +
        "de la machine considérée." }
  ],
  qcm: [
    { q: "Le voyant liquide est plein de bulles en régime établi. Que regardes-tu en premier ?",
      c: ["La charge en fluide et l'état du déshydrateur",
          "Le réglage du pressostat HP",
          "Le sens de rotation du ventilateur du condenseur",
          "Le niveau d'huile du carter"], b: 0,
      e: "Des bulles = du gaz dans la ligne liquide. Les deux causes les plus courantes sont un manque " +
         "de charge et un déshydrateur encrassé qui perd trop de charge." },
    { q: "Pourquoi ne met-on jamais le voyant AVANT le déshydrateur ?",
      c: ["Parce qu'il ne dirait alors rien de l'état du déshydrateur",
          "Parce qu'il se salirait plus vite",
          "Parce qu'il gênerait le passage du liquide",
          "Parce que le déshydrateur doit toujours être le dernier organe"], b: 0,
      e: "Le voyant est un instrument de diagnostic. Sa seule position utile est en aval du déshydrateur." },
    { q: "L'électrovanne de ligne liquide est montée à 4 mètres du détendeur. Quelle conséquence ?",
      c: ["Le pump down laisse 4 mètres de liquide qui partiront dans l'évaporateur",
          "Le détendeur ne pourra plus réguler la surchauffe",
          "Le compresseur ne pourra plus démarrer",
          "Aucune : la position de l'électrovanne est indifférente"], b: 0,
      e: "Tout le liquide contenu entre l'électrovanne et le détendeur passe dans l'évaporateur à la " +
         "fermeture. C'est autant de liquide qui risque de revenir au compresseur." }
  ]
},

{
  id: 'circuit-huile',
  titre: "Le circuit d'huile",
  sous: 'Du refoulement au carter',
  duree: '20 min',
  intro:
    "L'huile ne reste pas dans le carter : elle part avec le gaz au refoulement. " +
    "Sur une centrale à plusieurs compresseurs, il faut donc la récupérer et la ramener — " +
    "et il faut surtout s'assurer qu'elle est bien revenue. " +
    "C'est le rôle d'une boucle complète, montée en parallèle du circuit frigorifique.",
  depart: { id: 'compresseur_piston', nom: 'Refoulement du compresseur' },
  arrivee: { id: 'compresseur_piston', nom: 'Carter du compresseur' },
  elements: [
    { id: 'separateur_huile', nom: "Séparateur d'huile à flotteur",
      pourquoi:
        "Au refoulement, parce que c'est là que l'huile est entraînée par le gaz chaud. " +
        "Le gaz ralentit dans le corps, l'huile plus lourde tombe au fond, et le flotteur ouvre le retour " +
        "quand elle s'accumule.",
      indice: "Corps pointu vers le bas + flotteur dessiné dedans : les deux à la fois." },
    { id: 'reservoir_huile', nom: "Réservoir d'huile",
      pourquoi:
        "Il tamponne. Sur une centrale, il alimente plusieurs carters qui ne réclament pas de l'huile " +
        "en même temps. Sans réservoir, le premier carter qui appelle prend tout.",
      indice: "Corps vertical lisse : on stocke, on ne sépare rien." },
    { id: 'filtre_huile', nom: "Filtre d'huile",
      pourquoi:
        "Avant le voyant et avant les régulateurs de niveau. L'huile qui revient a traversé tout le " +
        "circuit frigorifique : elle rapporte des particules. On les arrête avant les organes de régulation, " +
        "qui sont des mécanismes fins.",
      indice: "Rectangle croisé en traits PLEINS — le déshydrateur, lui, est en pointillés." },
    { id: 'voyant_huile', nom: "Voyant d'huile",
      pourquoi:
        "Après le filtre, pour contrôler une huile déjà nettoyée. Il permet de vérifier d'un coup d'œil " +
        "que l'huile circule et qu'elle n'est pas chargée.",
      indice: "Hublot avec un POINT au centre. Sans le point, c'est un voyant liquide." },
    { id: 'electrovanne', nom: "Électrovanne d'huile",
      pourquoi:
        "Elle isole l'alimentation en huile d'un compresseur — à l'arrêt, en maintenance, ou sur " +
        "commande de la régulation de la centrale.",
      indice: "Corps de vanne surmonté d'une bobine." },
    { id: 'regulateur_flotteur', nom: 'Régulateur de niveau à flotteur',
      pourquoi:
        "Monté directement sur le carter de chaque compresseur. Le flotteur suit le niveau : il ouvre " +
        "quand l'huile baisse, il ferme quand le niveau est bon. Chaque compresseur se sert tout seul.",
      indice: "Une vanne, et à côté une boule montée sur son levier." }
  ],
  regles: [
    { titre: "Le pressostat différentiel d'huile est la vraie sécurité",
      texte:
        "Il compare la pression fournie par la pompe à huile à la pression régnant dans le carter. " +
        "Si l'écart reste insuffisant pendant la temporisation, il coupe le compresseur. " +
        "Un compresseur qui tourne sans pression d'huile se détruit en quelques minutes. " +
        "Seuil et temporisation : documentation constructeur, jamais de valeur de mémoire." },
    { titre: "Le circuit d'huile n'est pas le circuit frigorifique",
      texte:
        "Il lui est parallèle. Sur un schéma, on le repère parce qu'il part du séparateur (au refoulement) " +
        "et qu'il revient au carter, sans jamais passer par le condenseur ni l'évaporateur." },
    { titre: "Un séparateur n'est jamais parfait",
      texte:
        "Une partie de l'huile continue de circuler dans le circuit frigorifique. C'est pour cela que les " +
        "lignes d'aspiration se dimensionnent aussi pour garantir une vitesse de retour d'huile, " +
        "et que les remontées d'aspiration demandent un traitement particulier." }
  ],
  qcm: [
    { q: "Où se monte le séparateur d'huile, et pourquoi ?",
      c: ["Au refoulement, parce que c'est là que l'huile est entraînée par le gaz",
          "Sur l'aspiration, pour protéger le compresseur",
          "Sur la ligne liquide, après la bouteille",
          "À la sortie du détendeur"], b: 0,
      e: "L'huile part avec le gaz comprimé. On la récupère au plus près, avant qu'elle ne se disperse " +
         "dans tout le circuit." },
    { q: "Le pressostat différentiel d'huile coupe le compresseur. Que mesure-t-il exactement ?",
      c: ["L'écart entre la pression de la pompe à huile et celle du carter",
          "La pression absolue de l'huile dans le réservoir",
          "La différence entre la HP et la BP du circuit frigorifique",
          "Le niveau d'huile dans le carter"], b: 0,
      e: "C'est bien une différence de pression, pas un niveau ni une pression absolue. " +
         "La pompe doit vaincre la pression du carter pour graisser." },
    { q: "Pourquoi le filtre d'huile est-il placé avant les régulateurs de niveau ?",
      c: ["Parce que les régulateurs à flotteur sont des mécanismes fins que les particules bloquent",
          "Parce que le filtre doit toujours être au point le plus bas du circuit",
          "Parce que l'huile est plus froide à cet endroit",
          "Parce que le voyant doit être le dernier organe"], b: 0,
      e: "On filtre toujours en amont de ce qu'on veut protéger. C'est vrai du déshydrateur devant le " +
         "détendeur, c'est vrai du filtre d'huile devant les flotteurs." }
  ]
}

],

/* ==========================================================================
   2. LES SÉQUENCES — remettre les étapes dans l'ordre, et comprendre pourquoi
   ========================================================================== */
sequences: [

{
  id: 'pump-down',
  titre: "L'arrêt par tirage au vide (pump down)",
  sous: 'La séquence que tout frigoriste doit savoir réciter',
  duree: '20 min',
  intro:
    "À l'arrêt, le fluide frigorigène migre vers le point le plus froid de l'installation — " +
    "et c'est très souvent le carter du compresseur. Au démarrage suivant : coup de liquide, " +
    "huile diluée, moussage, bielles marquées. " +
    "Le pump down consiste à vider l'évaporateur et la ligne d'aspiration AVANT d'arrêter le compresseur.",
  organes:
    "Ce qu'il faut pour faire un pump down : une électrovanne de ligne liquide, " +
    "un pressostat BP de RÉGULATION (pas de sécurité), et un thermostat d'ambiance " +
    "qui commande l'électrovanne — pas le contacteur du compresseur.",
  etapes: [
    { t: "La chambre atteint sa consigne : le thermostat d'ambiance ouvre son contact", org: 'bulle_TSHL' },
    { t: "L'électrovanne de ligne liquide se ferme : plus de liquide n'entre dans l'évaporateur", org: 'electrovanne' },
    { t: "Le compresseur continue de tourner et aspire ce qui reste dans l'évaporateur", org: 'compresseur_piston' },
    { t: "Le fluide aspiré est refoulé et stocké dans le condenseur et la bouteille liquide", org: 'bouteille_liquide' },
    { t: "La pression d'aspiration descend progressivement", org: 'bulle_PSL' },
    { t: "Le pressostat BP de régulation atteint son seuil bas et arrête le compresseur", org: 'bulle_PSL' },
    { t: "La température de la chambre remonte : le thermostat referme son contact", org: 'bulle_TSHL' },
    { t: "L'électrovanne s'ouvre, le liquide entre à nouveau dans l'évaporateur", org: 'electrovanne' },
    { t: "La pression d'aspiration remonte", org: 'bulle_PSL' },
    { t: "Le pressostat BP enclenche le compresseur : le cycle recommence", org: 'compresseur_piston' }
  ],
  pieges: [
    { titre: "Le câblage qui tue le pump down",
      texte:
        "Câbler le thermostat directement sur le contacteur du compresseur : le compresseur s'arrête " +
        "en même temps que la demande de froid, l'évaporateur reste plein de liquide, et il n'y a plus " +
        "aucun pump down. C'est l'erreur la plus fréquente." },
    { titre: "Les courts cycles (short cycling)",
      texte:
        "Si l'électrovanne ou le clapet de retenue fuit, la pression d'aspiration remonte toute seule à " +
        "l'arrêt et le pressositat BP redémarre le compresseur sans qu'aucun froid ne soit demandé. " +
        "Un compteur de démarrages anormalement élevé est le signe à chercher." },
    { titre: "Pressostat de régulation, pas de sécurité",
      texte:
        "Le pump down se termine sur un pressostat BP de RÉGULATION (PSL), qui réenclenche tout seul. " +
        "Un pressostat de sécurité (PZL) coupe et attend un réarmement : il n'a rien à faire dans cette " +
        "boucle. Confondre les deux, c'est bloquer l'installation à chaque cycle." }
  ],
  qcm: [
    { q: "Dans un pump down, qu'est-ce que le thermostat d'ambiance commande directement ?",
      c: ["L'électrovanne de ligne liquide", "Le contacteur du compresseur",
          "Les ventilateurs de l'évaporateur", "Le pressostat HP"], b: 0,
      e: "Il commande l'électrovanne, et c'est le pressostat BP qui arrête ensuite le compresseur. " +
         "Toute la logique du pump down tient dans cette chaîne." },
    { q: "Le compresseur démarre et s'arrête toutes les deux minutes, chambre à température. Piste ?",
      c: ["Une fuite au travers de l'électrovanne ou du clapet de retenue",
          "Un manque de charge en fluide", "Un condenseur encrassé",
          "Un déshydrateur saturé"], b: 0,
      e: "La BP remonte toute seule à l'arrêt : quelque chose laisse passer. Électrovanne ou clapet." },
    { q: "Pourquoi vide-t-on l'évaporateur avant d'arrêter le compresseur ?",
      c: ["Pour éviter que le fluide ne migre vers le carter pendant l'arrêt",
          "Pour économiser de l'énergie", "Pour dégivrer l'évaporateur",
          "Pour éviter que le condenseur ne se noie"], b: 0,
      e: "À l'arrêt, le fluide va vers le point froid. S'il ne reste rien dans l'évaporateur, " +
         "il n'y a rien qui puisse migrer." }
  ]
},

{
  id: 'degivrage-electrique',
  titre: 'Le dégivrage électrique',
  sous: 'Chambres négatives — la séquence complète',
  duree: '20 min',
  intro:
    "Sous 0 °C, l'humidité de l'air se dépose en givre sur la batterie de l'évaporateur. " +
    "Le givre isole : l'échange chute, la BP descend, le rendement s'effondre. " +
    "Il faut donc dégivrer périodiquement — et une séquence de dégivrage n'est pas " +
    "« on allume les résistances » : c'est dix étapes, dont trois temporisations qui ont chacune sa raison.",
  organes:
    "Résistances de dégivrage dans la batterie, dans l'égouttoir ET sur l'écoulement · " +
    "sonde de fin de dégivrage · électrovanne de ligne liquide · horloge ou régulateur de dégivrage.",
  etapes: [
    { t: "Déclenchement du dégivrage (horloge, cumul de temps de marche, ou écart de température)", org: 'sonde_temperature' },
    { t: "Fermeture de l'électrovanne de ligne liquide : on vide l'évaporateur", org: 'electrovanne' },
    { t: "Arrêt du compresseur une fois l'évaporateur tiré au vide", org: 'compresseur_piston' },
    { t: "Arrêt des ventilateurs de l'évaporateur", org: 'ventilateur' },
    { t: "Mise sous tension des résistances de dégivrage", org: 'resistance_degivrage' },
    { t: "Fin de dégivrage sur la sonde — ou sur la sécurité de temps maximal", org: 'sonde_temperature' },
    { t: "Coupure des résistances", org: 'resistance_degivrage' },
    { t: "Temporisation d'égouttage : l'eau finit de s'écouler", org: 'sonde_temperature' },
    { t: "Réouverture de l'électrovanne et redémarrage du compresseur", org: 'compresseur_piston' },
    { t: "Temporisation, puis redémarrage des ventilateurs de l'évaporateur", org: 'ventilateur' }
  ],
  pieges: [
    { titre: "Pourquoi les ventilateurs s'arrêtent pendant le dégivrage",
      texte:
        "S'ils tournaient, ils souffleraient l'air réchauffé par les résistances directement dans la chambre. " +
        "On chaufferait les produits au lieu de fondre le givre." },
    { titre: "Pourquoi l'égouttage n'est pas optionnel",
      texte:
        "Si on relance le froid immédiatement, l'eau encore présente sur la batterie regèle sur place. " +
        "Au dégivrage suivant, il y a plus de glace qu'avant — et la batterie finit par se prendre en bloc." },
    { titre: "Pourquoi les ventilateurs redémarrent en retard",
      texte:
        "Ils projetteraient les gouttelettes restantes et l'air encore chaud sur les produits. " +
        "On attend que la batterie soit redescendue en température." },
    { titre: "La sonde de fin de dégivrage vaut mieux que l'horloge",
      texte:
        "Terminer sur la sonde, c'est s'arrêter dès que le givre a fondu. Terminer sur le temps, " +
        "c'est continuer à chauffer la chambre pour rien. Le temps ne sert que de sécurité maximale." },
    { titre: "Les résistances d'égouttoir et d'écoulement",
      texte:
        "L'eau de dégivrage traverse une chambre à température négative. Sans résistance dans l'égouttoir " +
        "et le long de l'écoulement, elle regèle dans le tuyau et le bouche." }
  ],
  qcm: [
    { q: "Pourquoi arrête-t-on les ventilateurs de l'évaporateur pendant un dégivrage électrique ?",
      c: ["Pour ne pas souffler l'air réchauffé par les résistances dans la chambre",
          "Pour économiser l'électricité", "Pour éviter de casser les pales prises dans le givre",
          "Pour que la sonde de fin de dégivrage mesure correctement"], b: 0,
      e: "Ventilateurs en marche = on chauffe la chambre au lieu de fondre le givre." },
    { q: "Après quelques semaines, la batterie se prend en bloc de glace. Quelle temporisation soupçonner ?",
      c: ["L'égouttage, trop court ou absent", "Le retard au redémarrage des ventilateurs",
          "La temporisation du pressostat HP", "La temporisation du pressostat différentiel d'huile"], b: 0,
      e: "L'eau qui reste sur la batterie regèle sur place à chaque cycle, et la glace s'accumule." },
    { q: "L'écoulement des condensats est bouché par la glace. Que vérifies-tu ?",
      c: ["La résistance de l'égouttoir et celle de l'écoulement",
          "La charge en fluide frigorigène", "Le réglage du détendeur",
          "Le sens de rotation des ventilateurs"], b: 0,
      e: "L'eau traverse une chambre négative : sans traçage chauffant, elle regèle dans le tuyau." }
  ]
},

{
  id: 'degivrage-gaz-chauds',
  titre: 'Le dégivrage par gaz chauds',
  sous: "Quand c'est le circuit lui-même qui fournit la chaleur",
  duree: '25 min',
  intro:
    "Plutôt que de chauffer avec des résistances, on dérive le gaz chaud du refoulement " +
    "directement dans l'évaporateur. Le temps du dégivrage, l'évaporateur devient un condenseur : " +
    "le gaz y cède sa chaleur au givre et s'y condense. " +
    "C'est plus rapide et plus économe — mais cela crée un risque que le dégivrage électrique n'a pas : " +
    "du liquide qui repart vers le compresseur.",
  organes:
    "Électrovanne de gaz chauds · ligne de by-pass depuis le refoulement vers l'entrée d'évaporateur · " +
    "clapet de retenue pour empêcher le gaz chaud de repartir vers les autres évaporateurs · " +
    "bouteille anti-coup de liquide sur l'aspiration, dimensionnée pour le dégivrage. " +
    "Le tracé exact des piquages varie selon le constructeur : se reporter au schéma de l'installation.",
  etapes: [
    { t: "Déclenchement du dégivrage", org: 'sonde_temperature' },
    { t: "Fermeture de l'électrovanne de ligne liquide : on vide l'évaporateur", org: 'electrovanne' },
    { t: "Arrêt des ventilateurs de l'évaporateur", org: 'ventilateur' },
    { t: "Ouverture de l'électrovanne de gaz chauds : le refoulement est dérivé vers l'évaporateur", org: 'electrovanne' },
    { t: "Le gaz chaud cède sa chaleur au givre et se condense dans la batterie", org: 'evaporateur_a_air' },
    { t: "Le condensat repart vers l'aspiration et est retenu par la bouteille anti-coup de liquide", org: 'bouteille_anticoup' },
    { t: "Fin de dégivrage sur la sonde (ou sur la sécurité de temps maximal)", org: 'sonde_temperature' },
    { t: "Fermeture de l'électrovanne de gaz chauds", org: 'electrovanne' },
    { t: "Temporisation d'égouttage", org: 'sonde_temperature' },
    { t: "Réouverture de l'électrovanne de ligne liquide", org: 'electrovanne' },
    { t: "Temporisation, puis redémarrage des ventilateurs de l'évaporateur", org: 'ventilateur' }
  ],
  pieges: [
    { titre: "La bouteille anti-coup de liquide devient obligatoire",
      texte:
        "Le gaz chaud se condense dans l'évaporateur : il en ressort du liquide, qui part droit vers " +
        "l'aspiration. Sans bouteille anti-coup correctement dimensionnée, c'est le compresseur qui le reçoit." },
    { titre: "Il faut une source de gaz chaud",
      texte:
        "Le gaz chaud vient du refoulement — donc d'un compresseur en marche. Sur une centrale, cela " +
        "suppose qu'au moins un autre poste de froid fonctionne pendant le dégivrage. " +
        "On ne dégivre jamais tous les postes en même temps." },
    { titre: "Le clapet de retenue n'est pas un détail",
      texte:
        "Sans lui, le gaz chaud injecté part aussi vers les évaporateurs voisins, qu'il réchauffe " +
        "au lieu de dégivrer celui qu'on visait." },
    { titre: "Ne pas confondre avec l'inversion de cycle",
      texte:
        "Le dégivrage par gaz chauds dérive une partie du refoulement par un by-pass. " +
        "L'inversion de cycle, elle, retourne complètement le circuit avec une vanne 4 voies : " +
        "l'évaporateur devient condenseur et le condenseur devient évaporateur. " +
        "Deux principes différents, deux schémas différents." }
  ],
  qcm: [
    { q: "Quel organe devient indispensable en dégivrage par gaz chauds, et pas en dégivrage électrique ?",
      c: ["La bouteille anti-coup de liquide sur l'aspiration",
          "Le filtre déshydrateur", "Le voyant liquide", "Le séparateur d'huile"], b: 0,
      e: "Le gaz chaud se condense dans l'évaporateur : du liquide repart vers le compresseur." },
    { q: "Sur une centrale, pourquoi ne dégivre-t-on jamais tous les postes en même temps ?",
      c: ["Parce qu'il faut au moins un compresseur en marche pour produire le gaz chaud",
          "Parce que le disjoncteur général ne tiendrait pas",
          "Parce que la HP deviendrait dangereuse",
          "Parce que le déshydrateur ne suivrait pas"], b: 0,
      e: "Le gaz chaud vient du refoulement. Plus personne ne refoule, plus de dégivrage." },
    { q: "Quelle est la différence entre dégivrage par gaz chauds et inversion de cycle ?",
      c: ["Le gaz chaud est un by-pass ; l'inversion retourne tout le circuit avec une vanne 4 voies",
          "Ce sont deux noms du même montage",
          "L'inversion de cycle n'existe que sur les chambres positives",
          "Le gaz chaud n'a pas besoin d'électrovanne"], b: 0,
      e: "Dans l'inversion de cycle, l'évaporateur devient condenseur et le condenseur devient évaporateur. " +
         "Ce n'est pas une dérivation, c'est un retournement." }
  ]
}

],

/* ==========================================================================
   3. LES RÉGULATEURS DE PRESSION — le classement amont / aval
   ========================================================================== */
regulateurs: {
  titre: 'Les régulateurs de pression',
  sous: 'KVP · KVR · KVL · KVC — le classement qui règle tout',
  duree: '25 min',
  intro:
    "Quatre régulateurs, quatre sigles, et beaucoup d'élèves qui les confondent jusqu'à l'examen. " +
    "Pourtant ils se classent avec une seule question.",
  cle: {
    titre: "La seule question à se poser",
    texte:
      "Un régulateur de pression se lit par LA PRESSION QU'IL SURVEILLE. " +
      "S'il surveille la pression à son entrée, il protège ce qui est AVANT lui. " +
      "S'il surveille la pression à sa sortie, il protège ce qui est APRÈS lui. " +
      "Sur le symbole, le trait pointillé montre où la prise de pression est faite : c'est écrit sur le dessin."
  },
  mnemo:
    "KVP et KVR regardent en arrière : ils protègent l'amont. " +
    "KVL et KVC regardent devant : ils protègent l'aval.",
  liste: [
    { id: 'regulateur_kvp', sigle: 'KVP', nom: "Régulateur de pression d'évaporation",
      surveille: 'amont',
      monte: "Sur l'aspiration, en sortie d'évaporateur",
      role: "Empêche la pression d'évaporation de descendre sous une valeur réglée",
      protege: "L'évaporateur — et les produits sensibles au givrage",
      quand: "Plusieurs chambres à températures différentes sur un même compresseur : " +
             "le KVP tient la chambre la plus chaude au-dessus de la BP commune.",
      scenario: { q: "Sur une chambre à légumes reliée à la même centrale qu'une chambre à viande, " +
                     "le KVP est bloqué grand ouvert. Que se passe-t-il ?",
                  c: ["La chambre à légumes descend trop bas en température et les produits gèlent",
                      "La chambre à viande ne descend plus en température",
                      "Le compresseur ne démarre plus",
                      "La HP devient excessive"], b: 0,
                  e: "Le KVP n'empêche plus la pression d'évaporation de descendre : la chambre suit " +
                     "la BP de la centrale, calée sur la chambre la plus froide." } },
    { id: 'regulateur_kvr', sigle: 'KVR', nom: 'Régulateur de pression de condensation',
      surveille: 'amont',
      monte: "Sur la ligne liquide, en sortie de condenseur",
      role: "Maintient la pression de condensation quand il fait froid dehors, en noyant le condenseur",
      protege: "La HP — donc le bon fonctionnement du détendeur",
      quand: "Installation extérieure en hiver. Sans lui, la HP s'effondre, l'écart de pression aux " +
             "bornes du détendeur devient insuffisant et le détendeur n'alimente plus l'évaporateur.",
      coequipier: "Le KVR ne va presque jamais seul : la vanne différentielle NRD dérive du gaz chaud " +
                  "du refoulement vers la bouteille liquide pour y maintenir la pression pendant que " +
                  "le condenseur est noyé.",
      scenario: { q: "Installation extérieure, − 5 °C dehors. La HP s'effondre et l'évaporateur " +
                     "n'est plus alimenté. Quel organe manque ou est mal réglé ?",
                  c: ["Le KVR (régulation de pression de condensation)",
                      "Le KVL (régulateur de démarrage)",
                      "Le pressostat HP de sécurité",
                      "Le séparateur d'huile"], b: 0,
                  e: "Sans HP suffisante, le détendeur n'a plus l'écart de pression nécessaire pour " +
                     "faire passer le débit. C'est exactement le problème que le KVR traite." } },
    { id: 'regulateur_kvl', sigle: 'KVL', nom: 'Régulateur de pression de carter (démarrage)',
      surveille: 'aval',
      monte: "Sur l'aspiration, juste avant le compresseur",
      role: "Limite la pression d'aspiration vue par le compresseur",
      protege: "Le moteur du compresseur, contre la surintensité",
      quand: "Au démarrage et après un dégivrage : la BP est alors anormalement haute, " +
             "le compresseur avale un débit massique trop élevé et le moteur force.",
      scenario: { q: "Après chaque dégivrage, le compresseur déclenche sur surintensité. " +
                     "Quel régulateur est en cause ?",
                  c: ["Le KVL, absent ou mal réglé", "Le KVP", "Le KVR", "Le NRD"], b: 0,
                  e: "Après dégivrage, l'évaporateur est chaud et la BP est haute. Le KVL bride " +
                     "l'aspiration le temps que la pression redescende." } },
    { id: 'regulateur_kvc', sigle: 'KVC', nom: 'Régulateur de capacité',
      surveille: 'aval',
      monte: "En by-pass, du refoulement vers l'aspiration",
      role: "Maintient la pression d'aspiration en injectant du gaz chaud quand la demande baisse",
      protege: "Le compresseur, contre les courts cycles et les BP trop basses",
      quand: "Charges partielles : la demande de froid tombe mais le compresseur reste dimensionné " +
             "pour la pleine charge.",
      scenario: { q: "En charge partielle, le compresseur enchaîne les démarrages courts. " +
                     "Quel régulateur traite ce problème ?",
                  c: ["Le KVC (régulateur de capacité)", "Le KVR", "Le KVP", "Le pressostat HP"], b: 0,
                  e: "Le KVC injecte du gaz chaud à l'aspiration pour maintenir la BP : " +
                     "le compresseur reste en marche au lieu de s'arrêter et redémarrer sans cesse." } }
  ],
  reserve:
    "Les plages de réglage, les tarages et les correspondances de modèles se lisent dans la " +
    "documentation Danfoss de l'appareil considéré. Aucune valeur n'est donnée ici : elles dépendent " +
    "du fluide, de la puissance et du régime de l'installation."
},

/* ==========================================================================
   4. LE GROUPE DE CONDENSATION — ce qui est dedans, ce qui n'y est pas
   ========================================================================== */
groupe: {
  titre: 'Le groupe de condensation',
  sous: "Ce qui est monté sur le châssis, et ce qui reste à faire sur site",
  duree: '20 min',
  intro:
    "Un groupe de condensation, c'est la moitié « chaude » de l'installation, livrée montée sur un " +
    "châssis : le compresseur, le condenseur et tout ce qui les entoure. " +
    "L'autre moitié — évaporateur, détendeur, ligne liquide — se monte sur site. " +
    "Savoir ce qui est déjà dans le groupe évite de commander deux fois le même organe, " +
    "et surtout d'en oublier un.",
  dedans: [
    { id: 'compresseur_piston', nom: 'Compresseur', note: "Le cœur du groupe." },
    { id: 'moteur_electrique', nom: "Moteur d'entraînement", note: "Intégré au compresseur (hermétique) ou séparé (ouvert)." },
    { id: 'condenseur_a_air', nom: 'Condenseur', note: "À air le plus souvent, avec son ou ses ventilateurs." },
    { id: 'ventilateur', nom: 'Ventilateur de condenseur', note: "Souvent piloté en cascade ou en vitesse variable." },
    { id: 'bouteille_liquide', nom: 'Bouteille (réservoir) de liquide', note: "Réserve et garde de liquide en sortie de condenseur." },
    { id: 'vanne_isolement', nom: 'Vannes de service aspiration et refoulement', note: "Pour consigner le groupe sans vidanger l'installation." },
    { id: 'bulle_PZLLHH', nom: 'Pressostat combiné HP / BP', note: "Sécurité haute et basse pression en un seul appareil." },
    { id: 'bulle_PSH', nom: 'Pressostat HP de régulation', note: "Enclenche les ventilateurs du condenseur." },
    { id: 'filtre_cartouche', nom: "Filtre d'aspiration", note: "Dernier rempart avant le compresseur." },
    { id: 'eliminateur_vibration', nom: 'Éliminateur de vibrations', note: "Au plus près du compresseur, aspiration et refoulement." },
    { id: 'separateur_huile', nom: "Séparateur d'huile", note: "Sur les groupes de forte puissance et les centrales." },
    { id: 'clapet_retenue', nom: 'Clapet de retenue au refoulement', note: "Empêche le retour de gaz vers le compresseur à l'arrêt." },
    { id: 'prise_schrader', nom: 'Prises de pression', note: "Pour le branchement du manifold." }
  ],
  dehors: [
    { id: 'evaporateur_a_air', nom: 'Évaporateur', note: "Il est dans la chambre, pas sur le châssis." },
    { id: 'detendeur_thermostatique', nom: 'Détendeur', note: "Monté au plus près de l'évaporateur." },
    { id: 'filtre_deshydrateur', nom: 'Filtre déshydrateur', note: "Sur la ligne liquide, montée sur site." },
    { id: 'voyant_liquide', nom: 'Voyant liquide', note: "Après le déshydrateur, sur site." },
    { id: 'electrovanne', nom: 'Électrovanne de ligne liquide', note: "Au plus près du détendeur, sur site." },
    { id: 'bulle_TSHL', nom: "Thermostat d'ambiance", note: "Dans la chambre." },
    { id: 'resistance_degivrage', nom: 'Résistances de dégivrage', note: "Dans la batterie de l'évaporateur." }
  ],
  qcm: [
    { q: "Tu réceptionnes un groupe de condensation. Lequel de ces organes n'est PAS dessus ?",
      c: ["Le détendeur", "La bouteille liquide", "Le pressostat combiné", "Le clapet de retenue"], b: 0,
      e: "Le détendeur se monte au plus près de l'évaporateur, donc dans la chambre — jamais sur le châssis." },
    { q: "Quel organe du groupe empêche le gaz de refluer vers le compresseur à l'arrêt ?",
      c: ["Le clapet de retenue au refoulement", "Le filtre d'aspiration",
          "L'éliminateur de vibrations", "La bouteille liquide"], b: 0,
      e: "Sans lui, la HP se vide à travers le compresseur à chaque arrêt et le fait tourner à l'envers." },
    { q: "À quoi sert le pressostat HP de RÉGULATION sur un groupe ?",
      c: ["À enclencher les ventilateurs du condenseur", "À couper l'installation en cas de surpression",
          "À commander l'électrovanne de ligne liquide", "À protéger le circuit d'huile"], b: 0,
      e: "Régulation, pas sécurité : il fait marcher les ventilateurs. C'est le pressostat HP de " +
         "sécurité (PZH) qui coupe." }
  ]
}

};
