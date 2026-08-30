/* =====================================================================
   LIVRET « inerweb.fr HabFluide » — LE LEXIQUE
   ---------------------------------------------------------------------
   Les trois pages de lexique annoncées par le plan. Elles ne pouvaient
   pas être extraites : la source explique les notions dans le fil du
   cours, elle ne les définit pas en entrées séparées. Elles sont donc
   RÉDIGÉES — et c'est, avec les pages liminaires, la seule rédaction
   neuve du livre.

   Deux règles tenues mot à mot :
   · aucun chiffre qui ne soit déjà autorisé par la source éditoriale
     (surchauffe 5-10 K, sous-refroidissement 4-8 K, P absolue =
     P relative + ~1 bar, R-290 = A3, CO₂ = A1 et PRP 1, NH₃ = B2L,
     R-32 et R-1234yf = A2L). Tout le reste renvoie à la doc ou à la
     norme ;
   · le vocabulaire reste celui de l'atelier : on explique un mot par
     des mots plus simples que lui, jamais par un mot plus savant.

   ⚠ RELECTURE MÉTIER DE F. HENNINOT ATTENDUE avant le bon à tirer.
   ===================================================================== */

export const LEXIQUE = {
  'lexique-1': {
    titre: 'Le fluide et la machine',
    entrees: [
      ['Fluide frigorigène', 'Le liquide-gaz qui circule en boucle fermée dans la machine. Il prend la chaleur à un endroit et la rejette à un autre, en changeant d’état. Il ne se consomme pas : s’il baisse, c’est qu’il fuit.'],
      ['Croix du frigoriste', 'La façon de dessiner le circuit qui fait convention : détendeur à gauche, compresseur à droite, condenseur en haut, évaporateur en bas. Toujours dans cet ordre, sur tous les schémas du métier.'],
      ['Compresseur', 'Le seul organe actif du cycle. Il aspire la vapeur basse pression et la refoule à haute pression. C’est lui qui fait circuler le fluide.'],
      ['Condenseur', 'L’échangeur du haut. Il évacue vers l’extérieur la chaleur prise dans l’évaporateur : la vapeur chaude y redevient liquide.'],
      ['Détendeur', 'L’organe de gauche. Il fait chuter la pression et dose le débit de liquide envoyé à l’évaporateur. Thermostatique, électronique ou capillaire.'],
      ['Évaporateur', 'L’échangeur du bas. Il absorbe la chaleur du milieu à refroidir : le liquide y devient vapeur. C’est là que le froid se produit.'],
      ['Haute pression (HP)', 'La moitié du circuit qui va du refoulement du compresseur jusqu’au détendeur. C’est le côté où l’on rejette la chaleur.'],
      ['Basse pression (BP)', 'La moitié qui va du détendeur jusqu’à l’aspiration du compresseur. C’est le côté où l’on produit le froid.'],
      ['Chaleur sensible', 'La chaleur qui fait changer la température, et que le thermomètre voit monter ou descendre.'],
      ['Chaleur latente', 'La chaleur qui fait changer l’état sans changer la température. C’est elle qui fait tout le travail dans une machine frigorifique.'],
      ['Palier', 'Le moment où le fluide change d’état : la température reste immobile pendant que la chaleur, elle, continue d’entrer ou de sortir.'],
      ['Glissement', 'Sur un mélange, le palier n’est pas plat : la température se déplace un peu entre le début et la fin du changement d’état. C’est le glissement.'],
      ['Courbe de bulle', 'Le flanc gauche de la cloche du diagramme : la première bulle de vapeur apparaît dans le liquide.'],
      ['Courbe de rosée', 'Le flanc droit : la dernière goutte de liquide disparaît, tout est devenu vapeur.'],
      ['Surchauffe', 'Les degrés gagnés par la vapeur au-delà du point où elle est devenue entièrement vapeur. On la mesure côté aspiration, avec un manomètre ET un thermomètre. Plage repère : 5 à 10 K — la documentation du constructeur fait foi.'],
      ['Sous-refroidissement', 'Les degrés perdus par le liquide en dessous du point où il est devenu entièrement liquide. Il garantit du liquide pur au détendeur. Plage repère : 4 à 8 K — la documentation du constructeur fait foi.'],
      ['Pression relative', 'Ce que lit le manomètre : la pression comptée à partir de la pression de l’air ambiant. C’est zéro sur le cadran quand le circuit est ouvert.'],
      ['Pression absolue', 'La pression comptée à partir du vide. En ordre de grandeur : pression relative + environ 1 bar. C’est elle qu’utilisent les tables et les diagrammes.'],
      ['Diagramme log p-h', 'Le dessin du cycle : la pression en hauteur, l’énergie du fluide en largeur. Une cloche partage la feuille en liquide, mélange, vapeur.'],
      ['Table de saturation', 'Le même renseignement que le diagramme, mais en chiffres : pour un fluide donné, à quelle température il change d’état sous telle pression. Une table par fluide, jamais de mémoire.'],
      ['Incondensables', 'De l’air entré dans le circuit lors d’une intervention mal faite. Il ne se liquéfie pas, fait monter la haute pression et se purge à l’arrêt.'],
      ['Huile frigorifique', 'Elle lubrifie, refroidit et assure l’étanchéité interne du compresseur. Elle voyage avec le fluide et doit revenir : c’est la pente des tubes et la vitesse du gaz qui la ramènent.'],
    ],
  },

  'lexique-2': {
    titre: 'Les opérations',
    entrees: [
      ['Récupération', 'Retirer le fluide de l’installation et le mettre en bouteille, sans en laisser partir dans l’air. Jamais à l’atmosphère, jamais à l’égout.'],
      ['Tirage au vide', 'Faire le vide dans le circuit avant de charger. Ce n’est pas « faire propre » : c’est extraire l’air et l’humidité, qui font monter la pression et abîment le circuit.'],
      ['Vacuomètre', 'L’instrument qui mesure le vide obtenu. Un manomètre ordinaire ne sait pas le lire.'],
      ['Épreuve de résistance', 'Mettre le circuit en pression pour vérifier que l’assemblage tient. À l’azote seul — jamais à l’oxygène ni à l’air comprimé.'],
      ['Épreuve d’étanchéité', 'Vérifier, une fois en pression, que la pression ne descend pas. Attention : la température de l’atelier fait elle aussi bouger l’aiguille, sans qu’il y ait de fuite.'],
      ['Azote', 'Le gaz de mise en pression et de balayage. Incolore, inodore, sans alerte : dans un local fermé, il chasse l’oxygène et tue sans prévenir.'],
      ['Balayage à l’azote', 'Faire passer un filet d’azote dans le tube pendant qu’on brase. Sans lui, la flamme fabrique à l’intérieur des oxydes qui partiront ensuite boucher le circuit.'],
      ['Brasage', 'L’assemblage au métal d’apport fondu. Jamais sur un circuit qui contient encore du fluide : on récupère, on inerte à l’azote, puis on chauffe.'],
      ['Manifold', 'Le jeu de manomètres et de flexibles qui relie le technicien au circuit. Il se purge avant branchement, sous peine d’y introduire de l’air.'],
      ['Méthode directe', 'Chercher la fuite là où elle est : détecteur électronique, eau savonneuse, traceur. Pour la catégorie E, sans accéder au circuit.'],
      ['Méthode indirecte', 'Ne pas ouvrir le circuit : comparer ce qu’on mesure à ce que la machine devrait donner, et en déduire qu’il manque du fluide.'],
      ['Détecteur de fuite', 'Il réagit aux molécules de fluide dans l’air. Il se contrôle lui-même, périodiquement — un appareil dérivé ne détecte plus rien et l’on ne s’en aperçoit pas.'],
      ['Détecteur d’oxygène', 'Ce n’est PAS un détecteur de fuite. Il dit s’il reste assez d’oxygène pour respirer. Devant une installation au CO₂, il ne suffit pas : il faut mesurer le CO₂ lui-même.'],
      ['Pesée', 'Charger ou récupérer en pesant la bouteille. C’est la seule façon de savoir la quantité réellement mise ou reprise — et de la porter au registre.'],
      ['Pressostat BP / HP', 'Les sécurités de pression. Le BP arrête sur pression trop basse, le HP sur pression trop haute. Un pressostat de sécurité n’est pas un régulateur : il coupe.'],
      ['Régulateur de pression', 'Il ne coupe rien : il module en continu pour tenir une pression, par exemple la haute pression quand il fait froid dehors.'],
      ['Consignation', 'Mettre l’installation hors tension et s’en assurer, en cinq étapes : séparer, condamner, identifier, vérifier l’absence de tension, mettre à la terre si nécessaire.'],
      ['Inertage', 'Remplacer ce qu’il y a dans le circuit par de l’azote, pour qu’il n’y ait plus rien d’inflammable avant d’approcher une flamme.'],
      ['Rapport d’intervention', 'Ce qu’on écrit après : ce qui a été fait, ce qui a été mesuré, ce qu’on recommande. Une intervention non écrite n’a pas de preuve.'],
    ],
  },

  'lexique-3': {
    titre: 'Le cadre réglementaire',
    entrees: [
      ['Attestation d’aptitude', 'Le papier de la PERSONNE. Il dit ce que vous avez le droit de faire, selon la catégorie obtenue.'],
      ['Attestation de capacité', 'Le papier de l’ENTREPRISE. Une personne attestée qui travaille pour une entreprise sans capacité n’est pas en règle.'],
      ['Catégories A1, A2, D, E', 'A1 : toutes les activités sur les fluides FLUORÉS et les HYDROCARBURES, sans limite de charge — jamais le CO₂ ni l’ammoniac. A2 : les mêmes, sur les équipements de faible charge. D : la récupération seule. E : le contrôle d’étanchéité, sans accéder au circuit.'],
      ['Catégories B et C', 'B pour le dioxyde de carbone (CO₂, R-744), C pour l’ammoniac (NH₃, R-717). Elles ne sont pas préparées par ce livre : il apprend à les reconnaître et à ne pas intervenir sans elles.'],
      ['Registre', 'Le carnet de l’équipement. Charge, fluide, contrôles, fuites, interventions : tout s’y écrit. On le lit AVANT de commencer, pas après.'],
      ['PRP', 'Potentiel de réchauffement planétaire : combien un kilo de ce fluide réchauffe le climat, comparé à un kilo de CO₂. Le CO₂ vaut 1 par définition.'],
      ['Tonne équivalent CO₂', 'La charge de l’équipement multipliée par le PRP du fluide. C’est cette valeur, et non les kilos, qui décide de la fréquence des contrôles d’étanchéité.'],
      ['F-Gas', 'Le nom courant du règlement européen sur les gaz fluorés. Le texte en vigueur est le règlement (UE) 2024/573, qui a remplacé le 517/2014.'],
      ['Règlement / arrêté', 'Un règlement européen s’applique directement dans tous les pays. Un arrêté est un texte français, signé par un ministre, qui précise comment on applique le règlement chez nous.'],
      ['NF EN 378', 'La norme qui classe les fluides selon leur danger : une lettre pour la toxicité (A faible, B plus élevée), un chiffre pour l’inflammabilité (1 non propagateur, 2L faiblement, 2 puis 3 de plus en plus).'],
      ['Classe A3', 'Très inflammable. C’est la classe du R-290 (propane) — jamais A2L, l’erreur coûte cher.'],
      ['Classe A2L', 'Faiblement inflammable et peu toxique. C’est la classe du R-32 et du R-1234yf.'],
      ['Classe B2L', 'Toxique et faiblement inflammable : la classe de l’ammoniac (R-717).'],
      ['LIE / LSE', 'Les deux bornes du domaine d’explosivité. En dessous de la LIE, le mélange est trop pauvre pour s’enflammer ; au-dessus de la LSE, trop riche. Entre les deux, une étincelle suffit.'],
      ['FDS', 'Fiche de données de sécurité. C’est le document qui donne, pour un fluide précis, ses dangers, ses seuils et les protections à prendre. On y va, on ne devine pas.'],
      ['DEEE', 'La filière des déchets d’équipements électriques et électroniques : là où part la machine en fin de vie, après récupération du fluide.'],
      ['Drop-in', 'Remplacer un fluide par un autre sans changer les composants. Cela ne s’improvise pas : c’est le constructeur qui le dit.'],
      ['Retrofit', 'Remplacer le fluide ET adapter la machine (huile, détendeur, joints). C’est un chantier, pas un remplissage.'],
      ['Écoconception', 'L’obligation faite aux fabricants de concevoir des appareils qui consomment moins et se réparent. Elle agit avant même que la machine arrive sur le chantier.'],
      ['Remise à niveau', 'Ponctuelle : le passage des anciennes catégories I à IV vers les nouvelles. Périodique : le maintien des compétences sous le nouveau régime. Les dates figurent au chapitre 4.'],
    ],
  },
};
