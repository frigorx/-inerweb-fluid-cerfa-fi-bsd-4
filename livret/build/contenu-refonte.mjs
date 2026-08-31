/* =====================================================================
   CONTENU ÉCRIT POUR LE LIVRE — refonte éditoriale du 31/08/2026
   ---------------------------------------------------------------------
   Le livre tirait tout son texte des cartes de `pilote-fluides`. C'était
   juste tant que le livre suivait le découpage du site. La refonte le
   déborde : elle approfondit des codes du référentiel que les cartes ne
   couvrent pas — l'écoconception (27 mots dans le livre), les PFAS (une
   phrase), l'ODP (99 mots), l'efficacité énergétique (une phrase pour
   sept codes). Ce texte-là vit ici, dans le livret, et entre dans la
   chaîne par les leçons `ecrit: true` du plan.

   RÈGLES D'ÉCRITURE (cadrage §8) :
   — une information principale par phrase, le mot technique expliqué à
     sa première apparition, un exemple après chaque définition ;
   — distinguer l'observation, l'hypothèse et la conclusion ;
   — aucune valeur réglementaire sans sa source et sa date ;
   — les absolus sont réservés aux interdictions de sécurité réelles.

   Seuls <b> et <i> franchissent le rendu : pas d'autre balise dans les
   paragraphes. Les blocs sont { type: 'cle' | 'piege', t, html }.
   ===================================================================== */

/* ------------------------------------------------------------------
   CHAPITRE TÉMOIN — « Ozone, effet de serre, ODP et PRP »
   Codes portés : 2.02 (principal), 2.01 (secondaire).
   Le cadrage le désigne comme l'un des deux chapitres témoins : c'est
   lui qui valide la profondeur, la voix et l'accessibilité avant
   généralisation. Il traitait 206 mots sous le code 2.02, exigé pour
   les quatre catégories.
   ------------------------------------------------------------------ */
export const LECONS_OZONE_CLIMAT = [
  {
    t: 'Deux problèmes, et non un seul',
    ecrit: true,
    codes: ['2.01', '2.02'],
    visuels: ['leg:impact-montreal-kigali/ozone-vers-climat', 'leg:impact-prp-odp/deux-echelles'],
    legendes: ['Un problème réglé, un autre ouvert', 'Deux échelles qui ne mesurent pas la même chose'],
    paras: [
      'Vous entendrez souvent dire qu\'un fluide frigorigène est « mauvais pour l\'environnement ». La formule est trop courte pour être utile. Elle mélange deux problèmes distincts, qui n\'ont ni la même cause, ni la même échelle de mesure, ni le même calendrier.',
      'Le premier problème est celui de la <b>couche d\'ozone</b>. Il concerne une couche de gaz située très haut dans l\'atmosphère, qui filtre une partie du rayonnement solaire. Certains fluides la détruisent. Ce problème a été identifié dans les années 1970 et traité par le protocole de Montréal en 1987.',
      'Le second problème est celui du <b>climat</b>. Il concerne l\'effet de serre, c\'est-à-dire la capacité de certains gaz à retenir la chaleur près du sol. Beaucoup de fluides frigorigènes y contribuent. Ce problème est plus récent dans les textes, et il n\'est pas réglé.',
      'Ces deux problèmes se mesurent avec deux grandeurs différentes. L\'<b>ODP</b> mesure l\'atteinte à la couche d\'ozone. Le <b>PRP</b> mesure l\'effet sur le climat. Un fluide peut être excellent sur l\'une et catastrophique sur l\'autre.',
      'C\'est exactement ce qui s\'est passé. Pour sauver la couche d\'ozone, l\'industrie a remplacé les CFC par des HFC. Les HFC ne détruisent pas l\'ozone : leur ODP vaut zéro. Mais leur effet de serre est considérable. Le premier problème a donc été résolu en aggravant le second.',
      'Retenez cette phrase, elle vous évitera la plupart des erreurs de raisonnement du métier : <b>un ODP nul ne dit rien du climat</b>.',
    ],
    blocs: [
      { type: 'cle', t: 'Les deux questions à poser devant un fluide',
        html: '<p><ol><li><b>Détruit-il l\'ozone ?</b> La réponse est son ODP. Aujourd\'hui, pour les fluides que vous manipulerez en A1, A2, D et E, la réponse est presque toujours non.</li><li><b>Réchauffe-t-il le climat ?</b> La réponse est son PRP. C\'est là que se jouent les interdictions, les quotas et vos obligations de contrôle.</li></ol></p>' },
      { type: 'piege', t: 'Le piège du « fluide écologique »',
        html: '<p>Un commercial vous annonce un fluide « sans impact sur la couche d\'ozone ». C\'est vrai, et cela ne vous apprend rien : depuis l\'arrêt des HCFC, c\'est le cas de tous les fluides que vous rencontrerez. La seule question qui distingue encore les fluides entre eux, c\'est le PRP.</p>' },
    ],
  },
  {
    t: 'La couche d\'ozone, et ce que mesure l\'ODP',
    ecrit: true,
    codes: ['2.01', '2.02'],
    visuels: ['leg:impact-prp-odp/mecanisme-odp', 'leg:impact-prp-odp/piege-odp-nul'],
    legendes: ['Ce que le chlore fait en altitude', 'ODP nul ne veut pas dire sans effet'],
    paras: [
      'L\'ozone est une molécule faite de trois atomes d\'oxygène. On la trouve en quantité dans la <b>stratosphère</b>, entre quinze et trente kilomètres d\'altitude environ. À cette hauteur, elle absorbe une partie des ultraviolets émis par le Soleil.',
      'Cette absorption protège la vie au sol. Sans elle, une part beaucoup plus grande des ultraviolets atteindrait la surface — avec pour conséquences des cancers de la peau, des atteintes oculaires et des dommages aux cultures.',
      'Les CFC et les HCFC contiennent du <b>chlore</b>. Ces molécules sont très stables : elles ne se détruisent pas dans l\'air que nous respirons. Elles montent lentement jusqu\'à la stratosphère, où le rayonnement solaire les casse enfin et libère leur chlore.',
      'Un atome de chlore libéré détruit une molécule d\'ozone, puis se retrouve disponible pour en détruire une autre. Il agit comme un catalyseur : il n\'est pas consommé par la réaction. Un seul atome peut ainsi détruire un très grand nombre de molécules d\'ozone avant d\'être neutralisé.',
      'L\'<b>ODP</b> (de l\'anglais <i>ozone depletion potential</i>, potentiel d\'appauvrissement de la couche d\'ozone) mesure cette capacité de destruction. C\'est un nombre sans unité, qui compare le fluide au R-11, pris comme référence et fixé à 1.',
      'Un R-12 a un ODP de 1 environ : il détruit l\'ozone autant que la référence. Un R-22 a un ODP de l\'ordre de 0,05 : il détruit vingt fois moins, mais il détruit. Un HFC comme le R-134a a un ODP nul : il ne contient pas de chlore.',
      'C\'est pour cette raison que les CFC ont été interdits, puis les HCFC. Le protocole de Montréal, signé en 1987, a organisé cette sortie. Il est aujourd\'hui considéré comme l\'accord environnemental international le plus efficace jamais conclu : la couche d\'ozone se reconstitue.',
    ],
    blocs: [
      { type: 'cle', t: 'Ce que vous devez savoir dire',
        html: '<p><ol><li>L\'ozone stratosphérique filtre les ultraviolets. Il protège la vie au sol.</li><li>C\'est le <b>chlore</b> des CFC et des HCFC qui le détruit, en altitude, par réaction en chaîne.</li><li>L\'<b>ODP</b> mesure cette destruction, sur une échelle où le R-11 vaut 1.</li><li>Les HFC, les HFO et les fluides naturels ont un ODP nul : ils ne contiennent pas de chlore.</li></ol></p>' },
      { type: 'piege', t: 'Ne pas confondre les deux ozones',
        html: '<p>L\'ozone de la stratosphère nous protège, et il faut le préserver. L\'ozone que l\'on mesure au sol l\'été, dans les pics de pollution, est un polluant respiratoire qu\'il faut au contraire réduire. Même molécule, deux altitudes, deux jugements opposés. Ce n\'est pas une contradiction : c\'est une question d\'endroit.</p>' },
    ],
  },
  {
    t: 'L\'effet de serre, et ce que mesure le PRP',
    ecrit: true,
    codes: ['2.02'],
    visuels: ['leg:impact-prp-odp/mecanisme-prp', 'svg:prp-echelle'],
    legendes: ['Pourquoi la chaleur reste en bas', 'Les ordres de grandeur comparés'],
    paras: [
      'L\'effet de serre est un phénomène naturel, et il est indispensable. Le Soleil chauffe le sol ; le sol renvoie cette chaleur vers le ciel sous forme de rayonnement infrarouge ; certains gaz de l\'atmosphère absorbent ce rayonnement et en renvoient une partie vers le bas. Sans eux, la température moyenne de la Terre serait très inférieure à ce qu\'elle est, et l\'eau liquide y serait rare.',
      'Le problème n\'est donc pas l\'effet de serre. Le problème est son <b>renforcement</b> : en ajoutant dans l\'atmosphère des gaz qui absorbent l\'infrarouge, on retient davantage de chaleur qu\'auparavant.',
      'Les fluides frigorigènes fluorés sont, molécule pour molécule, des gaz à effet de serre extrêmement puissants. Bien plus que le dioxyde de carbone. Deux raisons à cela : ils absorbent fortement dans des longueurs d\'onde où l\'atmosphère laissait jusque-là passer la chaleur, et ils persistent longtemps avant de se décomposer.',
      'Le <b>PRP</b> (potentiel de réchauffement planétaire ; en anglais <i>GWP</i>, <i>global warming potential</i>) met ces deux effets dans un seul nombre. Il répond à la question : sur une durée donnée, un kilogramme de ce gaz réchauffe combien de fois plus qu\'un kilogramme de CO₂ ?',
      'La durée retenue par la réglementation est de <b>cent ans</b>. C\'est une convention, et il faut le savoir : sur vingt ans, le classement des fluides entre eux n\'est pas le même, parce que les gaz de courte durée de vie pèsent alors beaucoup plus lourd.',
      'Les ordres de grandeur méritent d\'être connus, car ils expliquent toute la réglementation actuelle. Un R-404A dépasse 3 900. Un R-410A avoisine 2 100. Un R-134a est de l\'ordre de 1 400. Un R-32 tourne autour de 675. Le propane R-290 est à 3, le CO₂ à 1, l\'ammoniac à 0.',
      'Ces valeurs sont des <b>valeurs réglementaires</b>, publiées à l\'annexe I du règlement (UE) 2024/573. Elles ne sont pas des constantes physiques que l\'on pourrait recalculer soi-même, et elles ont déjà changé d\'un texte à l\'autre. Citez toujours la source et sa date, et vérifiez-la avant de vous en servir dans un document officiel.',
      'Comparez maintenant les deux extrémités. Un kilogramme de R-404A relâché dans l\'atmosphère pèse autant, pour le climat, que près de quatre tonnes de CO₂. Un kilogramme de propane en pèse trois. Le rapport est de plus de mille.',
    ],
    blocs: [
      { type: 'cle', t: 'Pourquoi cent ans, et pourquoi c\'est une convention',
        html: '<p>Un gaz qui disparaît en quinze ans et un gaz qui persiste trois siècles n\'ont pas le même effet selon la fenêtre d\'observation. Sur cent ans, le second domine. Sur vingt ans, le premier remonte fortement. La réglementation a retenu cent ans pour comparer les fluides sur une base unique. Ce choix est raisonnable, il n\'est pas neutre, et un professionnel doit savoir qu\'il existe.</p>' },
      { type: 'piege', t: 'Le PRP ne se déduit pas du numéro du fluide',
        html: '<p>Le nombre qui nomme un fluide décrit sa molécule, pas son impact. R-32 et R-410A ne se rangent pas dans l\'ordre de leurs chiffres. Le R-410A <i>contient</i> du R-32, et son PRP est pourtant trois fois plus élevé, parce qu\'il est mélangé à du R-125. Aucun raccourci : la valeur se lit dans l\'annexe du règlement, jamais dans le nom.</p>' },
    ],
  },
  {
    t: 'La tonne équivalent CO₂ : le calcul qui déclenche vos obligations',
    ecrit: true,
    codes: ['2.02'],
    visuels: ['leg:impact-prp-odp/cas-chambre-froide', 'leg:impact-prp-odp/repere-deux-axes'],
    legendes: ['Deux installations, deux régimes de contrôle', 'La charge seule ne dit rien'],
    paras: [
      'Le PRP ne sert pas qu\'à classer les fluides. Il sert à calculer une grandeur qui décide, très concrètement, de ce que vous devrez faire sur une installation : la <b>tonne équivalent CO₂</b>, notée teqCO₂.',
      'Le calcul tient en une ligne. On multiplie la charge de fluide, exprimée en tonnes, par le PRP du fluide.',
      'Prenons une installation chargée de 5 kg de R-404A. Cinq kilogrammes valent 0,005 tonne. Multiplié par un PRP d\'environ 3 900, cela donne à peu près <b>19,5 teqCO₂</b>.',
      'Prenons maintenant une installation chargée des mêmes 5 kg, mais de R-134a. Le PRP est de l\'ordre de 1 400. Le résultat tombe à <b>7 teqCO₂</b> environ, soit près de trois fois moins, pour exactement la même quantité de fluide dans la machine.',
      'C\'est cette valeur, et non le poids de fluide, qui détermine la périodicité des contrôles d\'étanchéité et plusieurs autres obligations. Deux machines identiques, chargées du même nombre de kilogrammes, peuvent donc relever de régimes différents selon le fluide qu\'elles contiennent.',
      'Vous devez savoir faire ce calcul sans hésiter, dans les deux sens. On vous donnera une charge et un fluide, et l\'on vous demandera le régime applicable. On vous donnera un seuil, et l\'on vous demandera la charge maximale admissible.',
      'Un dernier point de méthode. Les seuils, eux, sont fixés par les textes en vigueur et ils ont changé plusieurs fois. Retenez le <b>calcul</b>, qui ne change pas ; allez chercher le <b>seuil</b> dans le texte applicable au jour de l\'intervention.',
    ],
    blocs: [
      { type: 'cle', t: 'Le calcul, pas à pas',
        html: '<p><ol><li>Relevez la charge sur la <b>plaque</b> de l\'appareil, en kilogrammes.</li><li>Convertissez en tonnes : divisez par mille.</li><li>Relevez le <b>PRP</b> du fluide dans l\'annexe I du règlement (UE) 2024/573.</li><li>Multipliez. Le résultat est en teqCO₂.</li><li>Comparez au seuil du texte en vigueur pour connaître le régime applicable.</li></ol></p>' },
      { type: 'piege', t: 'La charge de la plaque, pas celle que vous supposez',
        html: '<p>La charge à retenir est celle de l\'installation, telle que la plaque ou la documentation constructeur la donne — pas le contenu de votre bouteille, pas une estimation au jugé. Une installation modifiée peut porter une charge différente de sa plaque d\'origine : dans ce cas, c\'est le registre qui fait foi, et son absence est en soi une anomalie à signaler.</p>' },
    ],
  },
  {
    t: 'Ce que le PRP ne dit pas : décomposition et PFAS',
    ecrit: true,
    codes: ['2.02'],
    visuels: ['leg:impact-prp-odp/quatre-situations', 'leg:impact-montreal-kigali/nouveau-probleme-prp'],
    legendes: ['Quatre fluides, quatre profils', 'Chaque solution ouvre une question'],
    paras: [
      'Le PRP répond à une seule question : combien ce gaz réchauffe-t-il, s\'il est relâché tel quel ? Il ne dit rien de ce que la molécule devient ensuite, ni de ce qu\'elle produit en se décomposant.',
      'C\'est précisément ce qui est reproché à certains fluides récents. Les HFO ont été conçus pour se décomposer vite dans l\'atmosphère : c\'est ce qui leur donne un PRP très bas. Mais se décomposer, c\'est produire autre chose.',
      'La décomposition atmosphérique de plusieurs fluides fluorés conduit à des composés stables, parmi lesquels l\'<b>acide trifluoroacétique</b> (TFA). Ce composé est très persistant dans l\'environnement et on le retrouve dans les eaux.',
      'Le TFA appartient à la famille des <b>PFAS</b>, terme qui désigne un très large ensemble de substances per- et polyfluoroalkylées, parfois appelées « polluants éternels » en raison de leur persistance.',
      'Il faut être prudent dans ce que l\'on affirme ici, et cette prudence fait partie du professionnalisme. Les effets à long terme du TFA font l\'objet de travaux scientifiques et de discussions réglementaires en cours. Des restrictions à l\'échelle européenne sont à l\'étude sur les PFAS. Ce dossier n\'est pas clos.',
      'Ce que vous devez retenir n\'est donc pas une conclusion, mais une méthode : <b>chaque génération de fluides a résolu le problème de la précédente en en ouvrant un autre</b>. Les CFC ont réglé la toxicité des premiers frigorigènes et ouvert la question de l\'ozone. Les HFC ont réglé l\'ozone et ouvert celle du climat. Les HFO répondent au climat et ouvrent celle de leurs produits de décomposition.',
      'Un professionnel qui connaît cette histoire ne promet jamais qu\'un fluide est « propre ». Il dit ce que le fluide résout, ce qu\'il coûte, et ce que l\'on ignore encore.',
    ],
    blocs: [
      { type: 'cle', t: 'La formule prudente, et juste',
        html: '<p>« Ce fluide a un PRP très bas. Sa décomposition dans l\'atmosphère produit des composés persistants, dont le TFA, qui font l\'objet de travaux en cours au niveau européen. C\'est un progrès pour le climat ; ce n\'est pas une absence d\'impact. » Cette phrase est défendable devant un client, devant un inspecteur et devant un jury.</p>' },
      { type: 'piege', t: 'Deux erreurs symétriques',
        html: '<p>La première est de présenter les HFO comme sans conséquence : c\'est faux, et cela se retourne contre vous dès que le sujet des PFAS arrive. La seconde est de les rejeter en bloc au nom des PFAS : leur bénéfice climatique est réel et mesuré. Entre les deux, il y a la position professionnelle : nommer le gain, nommer la question ouverte, et citer sa source.</p>' },
    ],
  },
];

/* ------------------------------------------------------------------
   CODE 1.00 — législation UE et nationale, DEEE, écoconception.
   Exigé au titre théorique pour les QUATRE catégories, nouveau en 2025,
   et l'un des plus faibles du livre : l'écoconception y tenait en
   27 mots, les DEEE en 98, sur la seule filière carcasse. Le pack
   contient pourtant huit planches d'écoconception et quarante sur les
   déchets, jamais imprimées.
   ------------------------------------------------------------------ */
export const LECONS_LEGISLATION = [
  {
    t: 'Deux étages de règles, et deux papiers',
    ecrit: true,
    codes: ['1.00'],
    visuels: ['svg:deux-etages-deux-papiers', 'leg:aptitude-capacite/deux-papiers'],
    legendes: ['Le règlement européen, l arrêté français', 'L aptitude est à vous, la capacité est à l entreprise'],
    paras: [
      'Les règles qui encadrent votre métier viennent de deux étages, et les confondre est la source d\'erreurs la plus courante en examen comme sur le terrain.',
      'L\'étage européen est celui des <b>règlements</b>. Un règlement de l\'Union européenne s\'applique directement dans tous les États membres, sans qu\'aucune loi nationale ait besoin de le reprendre. Le règlement (UE) 2024/573 sur les gaz à effet de serre fluorés est de ceux-là.',
      'L\'étage français est celui du <b>code de l\'environnement</b> et des <b>arrêtés</b> qui le précisent. C\'est à cet étage que l\'on trouve les modalités de délivrance des attestations d\'aptitude : l\'arrêté du 21 novembre 2025 en fixe le contenu et l\'évaluation.',
      'À côté de ces textes obligatoires vivent deux autres familles de documents, qu\'il ne faut surtout pas mettre au même rang.',
      'Les <b>normes</b>, comme la NF EN 378, ne sont pas la loi. Ce sont des documents techniques élaborés par des organismes de normalisation. Elles deviennent contraignantes seulement lorsqu\'un texte réglementaire les rend obligatoires, ou lorsqu\'un contrat s\'y réfère.',
      'La <b>documentation constructeur</b> n\'est pas la loi non plus. Mais elle engage votre responsabilité : intervenir contre les prescriptions du fabricant vous expose, même si aucun texte réglementaire ne vous l\'interdit explicitement.',
      'Retenez la hiérarchie dans cet ordre : le règlement européen, puis le code et l\'arrêté français, puis la norme si un texte la rend obligatoire, puis la documentation constructeur, qui reste toujours à respecter.',
      'Deux papiers, enfin, et ils ne se ressemblent pas. L\'<b>attestation d\'aptitude</b> est délivrée à une <b>personne</b> : elle atteste que vous avez été évalué. L\'<b>attestation de capacité</b> est délivrée à une <b>entreprise</b> : elle atteste qu\'elle dispose du personnel, de l\'outillage et des procédures. Vous pouvez être apte dans une entreprise qui n\'a pas la capacité ; l\'entreprise ne peut alors pas intervenir.',
    ],
    blocs: [
      { type: 'cle', t: 'Règlement, arrêté, norme, notice — la question à se poser',
        html: '<p>Devant une exigence, demandez-vous toujours d\'où elle vient. « C\'est le règlement » : elle s\'impose partout en Europe. « C\'est l\'arrêté » : elle s\'impose en France. « C\'est la norme » : elle s\'impose si un texte l\'a rendue obligatoire, sinon elle fait référence professionnelle. « C\'est le constructeur » : elle engage votre responsabilité et la garantie du matériel.</p>' },
      { type: 'piege', t: 'Mon attestation ne m\'autorise pas à elle seule',
        html: '<p>Une attestation d\'aptitude en poche ne suffit pas à intervenir légalement. Il faut aussi que l\'entreprise pour laquelle vous intervenez détienne l\'attestation de capacité correspondante. Les deux documents sont nécessaires ; aucun ne remplace l\'autre.</p>' },
    ],
  },
  {
    t: 'Les déchets : sept flux, et une chaîne de responsabilité',
    ecrit: true,
    codes: ['1.00'],
    visuels: ['leg:dechets-sept-flux/rangee-bennes-matiere', 'leg:dechets-responsabilites/chaine-producteur-detenteur'],
    legendes: ['Trier à la source, par matière', 'Du producteur jusqu à l élimination'],
    paras: [
      'Une intervention produit des déchets. Du cuivre, de l\'acier, des cartons d\'emballage, des isolants, parfois de l\'huile usagée, parfois un appareil entier à évacuer. La réglementation vous demande de les trier, et pas seulement pour la forme.',
      'Le <b>tri à la source</b> impose de séparer les principales matières sur le chantier lui-même, plutôt que de tout mélanger dans une benne unique qu\'un centre devra ensuite démêler. Un cuivre trié se recycle ; un cuivre noyé dans les gravats est perdu.',
      'Les <b>déchets dangereux</b> suivent un régime à part. Une huile de compresseur usagée, un fluide récupéré, un absorbant souillé ne partent pas avec les métaux. Ils exigent un contenant adapté, un étiquetage et une traçabilité écrite.',
      'La <b>chaîne de responsabilité</b> est le point que les techniciens sous-estiment le plus. En droit des déchets, celui qui produit un déchet en reste responsable jusqu\'à son élimination effective. Remettre un fût à un transporteur ne vous décharge pas : il faut que le destinataire soit autorisé, et que la remise laisse une trace.',
      'Cette trace est le <b>bordereau</b>. Il accompagne le déchet dangereux et se remplit à chaque étape. Un bordereau qui ne revient jamais signé est un problème, pas une formalité oubliée.',
      'Les équipements électriques et électroniques en fin de vie relèvent de la filière <b>DEEE</b>. Un groupe frigorifique déposé n\'est pas de la ferraille : c\'est un DEEE, et il doit être dépollué avant broyage — le fluide récupéré, l\'huile retirée, les mousses traitées.',
      'Vous êtes ici au point de jonction de deux obligations qui se renforcent. Récupérer le fluide avant de déposer l\'appareil, c\'est à la fois l\'obligation « fluides frigorigènes » qui vous interdit tout rejet, et l\'obligation « DEEE » qui impose la dépollution avant traitement.',
    ],
    blocs: [
      { type: 'cle', t: 'Ce qui part, et par quelle voie',
        html: '<p><ol><li><b>Métaux</b> — cuivre, acier, aluminium : triés par matière, valorisés.</li><li><b>Emballages</b> — cartons, films, palettes : filière emballages.</li><li><b>Déchets dangereux</b> — huiles usagées, absorbants souillés, fluides : contenant dédié, étiquetage, bordereau.</li><li><b>Appareil complet</b> — filière DEEE, après dépollution.</li></ol></p>' },
      { type: 'piege', t: 'La benne unique coûte plus cher qu\'elle ne fait gagner',
        html: '<p>Tout jeter dans la même benne fait gagner dix minutes sur le chantier. Elle est facturée en déchets non triés, au tarif le plus élevé, et le cuivre qu\'elle contenait est perdu pour la valorisation. Le tri à la source n\'est pas une contrainte administrative : c\'est la seule opération qui préserve la valeur de ce que vous déposez.</p>' },
    ],
  },
  {
    t: 'L\'écoconception : ce qu\'elle demande au fabricant, ce qu\'elle change pour vous',
    ecrit: true,
    codes: ['1.00'],
    visuels: ['leg:impact-ecoconception/concevoir-pour-durer', 'leg:impact-ecoconception/etiquette-energie'],
    legendes: ['Durer, réparer, consommer moins', 'Ce que l étiquette dit et ne dit pas'],
    paras: [
      'L\'écoconception est le principe selon lequel les exigences environnementales entrent dès la <b>conception</b> du produit, et non à sa fin de vie. Elle vise le fabricant plus que l\'installateur. Mais elle change trois choses dans votre travail quotidien.',
      'La première est la <b>durée de vie</b>. Un matériel conçu pour durer utilise des composants remplaçables plutôt que soudés en bloc. Vous le constatez à l\'entretien : un ventilateur qui se change seul, un échangeur démontable, un compresseur accessible.',
      'La deuxième est la <b>réparabilité</b>. L\'écoconception impose progressivement la disponibilité des pièces détachées et de la documentation technique pendant une durée minimale après la fin de commercialisation. Concrètement : vous devez pouvoir obtenir une pièce, et vous devez pouvoir obtenir la notice.',
      'La troisième est la <b>consommation en fonctionnement</b>. Un appareil est jugé sur son efficacité réelle, mesurée sur un cycle représentatif, et non sur une performance de laboratoire à un point unique.',
      'C\'est là qu\'intervient l\'<b>étiquette énergie</b>, qui traduit cette performance en une classe lisible par le client. Elle est un outil de comparaison utile, à condition de savoir ce qu\'elle compare : deux appareils ne sont comparables que dans la même catégorie et à la même échelle de mesure.',
      'Il faut aussi comprendre pourquoi tout cela concerne le climat autant que le fluide lui-même. L\'impact d\'une installation frigorifique se divise en deux parts. La part <b>directe</b> vient des fuites de fluide. La part <b>indirecte</b> vient de l\'électricité consommée pendant toute sa vie.',
      'Sur beaucoup d\'installations, la part indirecte dépasse largement la part directe. Un appareil sobre chargé d\'un fluide à PRP élevé peut peser moins, au total, qu\'un appareil énergivore chargé d\'un fluide à PRP nul. C\'est ce raisonnement que résume l\'indicateur <b>TEWI</b>, qui additionne les deux parts.',
      'La conséquence pratique vous concerne directement : chaque geste d\'entretien qui restaure l\'efficacité — un condenseur propre, une charge juste, un dégivrage réglé — est une mesure de protection du climat, au même titre que l\'absence de fuite.',
    ],
    blocs: [
      { type: 'cle', t: 'Direct et indirect : les deux parts d\'une installation',
        html: '<p>La part <b>directe</b> est ce qui s\'échappe : fuites, purges, pertes à l\'intervention. Elle se compte en teqCO₂. La part <b>indirecte</b> est ce qui se consomme : l\'électricité de toute la vie de la machine, convertie en CO₂ selon le mix électrique. Le TEWI les additionne. Un professionnel qui ne regarde que la première passe à côté de la plus grosse.</p>' },
      { type: 'piege', t: 'Le piège du prix le plus bas',
        html: '<p>Le matériel le moins cher à l\'achat est fréquemment le plus cher sur sa durée de vie : rendement médiocre, pièces non disponibles, remplacement anticipé. C\'est précisément ce que l\'écoconception cherche à corriger. Quand un client vous demande votre avis, le seul chiffre honnête est celui du coût sur la durée, pas celui de la facture d\'achat.</p>' },
    ],
  },
];

/* ------------------------------------------------------------------
   CODE 1.05 — les organes annexes et leur rôle dans la prévention et la
   DÉTECTION des fuites. Le libellé officiel énumère neuf familles
   (a à i) ; le livre leur consacrait 193 mots, le plus faible score de
   tout le référentiel. Le code demande explicitement de tenir compte des
   fluides très inflammables ou toxiques et de ceux à haute pression.
   ------------------------------------------------------------------ */
export const LECONS_ORGANES_ANNEXES = [
  {
    t: 'Neuf familles d\'organes, une seule question : par où ça fuit ?',
    ecrit: true,
    codes: ['1.05'],
    visuels: ['svg:nomenclature', 'svg:points-de-fuite'],
    legendes: ['Chaque organe a un nom et une place', 'Les points de fuite les plus fréquents'],
    paras: [
      'Le référentiel ne vous demande pas seulement de savoir à quoi servent les organes annexes. Il vous demande de connaître <b>leur rôle dans la prévention et la détection des fuites</b>. C\'est une formulation précise, et elle change la façon de les apprendre.',
      'Un organe annexe n\'est pas un accessoire. Chacun est soit un point de fuite potentiel, soit un moyen de voir venir une anomalie, soit les deux à la fois.',
      'Les <b>vannes et robinets</b> — robinets à boule, à diaphragme, à soupape — ferment, isolent, permettent d\'intervenir sans vidanger tout le circuit. Ils sont aussi la première source de fuite du circuit : presse-étoupe, siège, bouchon de protection oublié.',
      'Les <b>contrôles de température et de pression</b> — pressostats, thermostats, sondes — protègent la machine et arrêtent avant la casse. Un pressostat basse pression qui déclenche de plus en plus souvent raconte une histoire : le circuit se vide.',
      'Le <b>voyant liquide et son indicateur d\'humidité</b> sont votre œil dans le circuit. Des bulles à pleine charge signalent un manque de fluide ou une perte de charge. La pastille qui change de couleur signale de l\'eau dans le circuit, donc une entrée d\'air, donc probablement une fuite ou un tirage au vide insuffisant.',
      'Les <b>contrôles de dégivrage</b> évitent qu\'un évaporateur se prenne en glace. Un dégivrage mal réglé ne provoque pas de fuite directement, mais il fait travailler la machine dans des conditions extrêmes, et c\'est là que les assemblages fatiguent.',
      'Les <b>protecteurs du système</b> — soupapes de sécurité, disques de rupture, limiteurs — sont conçus pour s\'ouvrir plutôt que laisser éclater. Leur ouverture est une émission de fluide : elle n\'est pas une fuite accidentelle, elle est un événement à consigner et à comprendre.',
      'Les <b>instruments de mesure</b> — thermomètres, manomètres, manifold — ne font pas partie du circuit, mais chaque branchement est une occasion de perdre du fluide. Un raccord automatique et une purge maîtrisée valent mieux qu\'un geste rapide.',
      'Les <b>systèmes de contrôle de l\'huile</b> — séparateur, réservoir, régulateur de niveau — assurent que l\'huile revienne au compresseur. Ils ajoutent des raccords, donc des points de fuite, et leur défaillance tue le compresseur à petit feu.',
      'Les <b>réservoirs</b> et les <b>séparateurs de liquide et d\'huile</b> stockent et protègent. Un réservoir est un volume sous pression : sa présence augmente la charge de l\'installation, donc sa tonne équivalent CO₂, donc ses obligations de contrôle.',
    ],
    blocs: [
      { type: 'cle', t: 'Trois rôles, à retenir pour chaque organe',
        html: '<p><ol><li><b>Ce qu\'il fait</b> — sa fonction dans le circuit.</li><li><b>Ce qu\'il révèle</b> — le signe qu\'il donne quand quelque chose ne va pas : bulles au voyant, pastille rose, pressostat qui déclenche, niveau d\'huile qui baisse.</li><li><b>Ce qu\'il risque</b> — le point de fuite qu\'il ajoute : un raccord, un presse-étoupe, un joint, une soudure.</li></ol></p>' },
      { type: 'piege', t: 'Le voyant qui bulle n\'annonce pas toujours un manque de fluide',
        html: '<p>Des bulles au voyant sont une <b>observation</b>, pas un diagnostic. Elles peuvent venir d\'un manque de charge, mais aussi d\'un filtre déshydrateur colmaté, d\'un sous-refroidissement insuffisant ou d\'une perte de charge sur la ligne liquide. Ajouter du fluide sans avoir départagé ces hypothèses, c\'est surcharger une machine qui n\'en manquait pas.</p>' },
    ],
  },
  {
    t: 'Les organes face aux fluides à risque',
    ecrit: true,
    codes: ['1.05', '11.05'],
    visuels: ['svg:regulateurs-pression', 'svg:co2-protection'],
    legendes: ['Ce qui régule la pression', 'Le CO2 impose sa propre mécanique'],
    paras: [
      'Le libellé du référentiel ajoute une exigence que l\'on oublie souvent : connaître ces organes <b>en tenant compte des spécificités</b> des fluides très inflammables ou toxiques, et de ceux qui fonctionnent à haute pression.',
      'Avec un <b>hydrocarbure</b> comme le R-290, tout organe électrique devient une source d\'ignition potentielle. Un pressostat à contact sec, un thermostat mécanique, un ventilateur : chacun doit être adapté à la zone. Les composants sont marqués en conséquence, et l\'on ne remplace pas un organe par un équivalent non marqué.',
      'La charge admissible est aussi plus faible, ce qui pousse à réduire les volumes. Un gros réservoir de liquide devient un problème et non une sécurité : il augmente la charge, donc le risque.',
      'Avec le <b>CO₂</b>, ce sont les pressions qui commandent. Les organes sont dimensionnés pour des niveaux sans commune mesure avec ceux d\'une installation classique, y compris à l\'arrêt : une installation au CO₂ laissée hors tension voit sa pression monter avec la température ambiante.',
      'C\'est pourquoi ces installations disposent de moyens de maintien de pression à l\'arrêt, et pourquoi une soupape peut s\'ouvrir sur une machine pourtant éteinte. Un organe prévu pour une installation au R-134a n\'a rien à faire sur un circuit au CO₂.',
      'Avec l\'<b>ammoniac</b>, la toxicité domine et la compatibilité des matériaux devient déterminante : l\'ammoniac attaque le cuivre et ses alliages. Les organes sont en acier, la robinetterie est spécifique, et l\'odeur perçante joue un rôle d\'alerte que les fluides fluorés n\'ont pas.',
      'La règle générale tient en une phrase : <b>un organe se remplace par son équivalent qualifié pour ce fluide et cette pression</b>, jamais par ce qui traîne dans le camion. La documentation constructeur fait foi.',
    ],
    blocs: [
      { type: 'cle', t: 'La question avant de remplacer un organe',
        html: '<p>« Pour quel fluide, quelle pression et quelle classe de sécurité cet organe est-il qualifié ? » Si la réponse n\'est pas écrite sur la pièce ou dans sa documentation, l\'organe ne se monte pas. Ce n\'est pas de la prudence excessive : c\'est la seule position tenable devant un client, un contrôleur ou un assureur.</p>' },
      { type: 'piege', t: 'L\'équivalent qui n\'en est pas un',
        html: '<p>Deux organes de même fonction, de même raccordement et de même apparence peuvent différer par leur pression maximale de service, leur compatibilité avec l\'huile, ou leur qualification en zone à risque d\'explosion. Le montage se fera sans difficulté. La défaillance viendra plus tard, et elle sera de votre fait.</p>' },
    ],
  },
];
