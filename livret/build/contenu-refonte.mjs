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

/* ------------------------------------------------------------------
   L'EFFICACITÉ ÉNERGÉTIQUE — SEPT CODES.
   6.08, 7.10, 8.11, 9.10 et 12.14 sont nouveaux en 2025 ; 11.02 et 11.04
   ne le sont pas. Tous demandent de connaître les mesures d'amélioration
   ou de maintien de l'efficacité, composant par composant. Le livre
   définissait le COP en une phrase et n'écrivait nulle part
   « coefficient de performance » en toutes lettres : sept codes sur
   trente-neuf reposaient sur une ligne. C'est le trou le plus grave que
   la matrice ait relevé, et le niveau visé ici est celui de l'épreuve :
   non pas savoir que l'efficacité compte, mais savoir de quoi elle
   dépend, dans quel sens, et avec quelles limites.
   ------------------------------------------------------------------ */
export const LECONS_EFFICACITE = [
  {
    t: 'COP, EER : ce que le chiffre dit, et à quelles conditions',
    ecrit: true,
    codes: ['11.02', '6.08'],
    visuels: ['svg:quatre-leviers-energie', 'leg:impact-tewi/part-indirecte'],
    legendes: ['Les quatre leviers du rendement', 'Ce que la machine consomme sur sa vie'],
    paras: [
      'Une machine frigorifique ne fabrique pas de froid : elle déplace de la chaleur d\'un endroit froid vers un endroit chaud. Ce déplacement coûte du travail, fourni par le compresseur. L\'efficacité mesure le rapport entre ce que l\'on obtient et ce que l\'on paie.',
      'Le <b>COP</b> — <i>coefficient of performance</i>, coefficient de performance — est ce rapport. On divise la puissance utile par la puissance absorbée. Les deux sont en watts, le résultat n\'a donc pas d\'unité.',
      'Un COP de 3 signifie que la machine déplace trois kilowatts de chaleur en consommant un kilowatt électrique. Ce n\'est pas un rendement au sens habituel : il dépasse 1, et c\'est normal, puisque l\'énergie utile n\'est pas produite mais transportée.',
      'L\'usage réserve souvent le mot <b>COP</b> au fonctionnement en pompe à chaleur, où l\'utile est la chaleur rejetée au condenseur, et le mot <b>EER</b> — <i>energy efficiency ratio</i> — au fonctionnement en froid, où l\'utile est la chaleur prise à l\'évaporateur. Le calcul est le même ; ce qui change, c\'est ce que l\'on compte comme utile.',
      'Un chiffre d\'efficacité ne veut rien dire sans ses <b>conditions</b>. Une même machine annoncée à 3,5 peut fonctionner à 2,1 sur site. Le COP dépend d\'abord des températures de fonctionnement, et celles-ci changent avec la saison, la charge et l\'état de l\'installation.',
      'C\'est pourquoi les valeurs saisonnières existent. Le <b>SEER</b> et le <b>SCOP</b> intègrent le fonctionnement sur toute une saison, à charge variable, et non un point unique de laboratoire. Ils sont plus proches de la réalité et servent aux étiquettes énergie.',
      'Retenez la position professionnelle : un COP se cite toujours avec ses températures. « COP de 3,2 » ne veut rien dire. « COP de 3,2 pour une évaporation à −10 °C et une condensation à +45 °C » est une information.',
    ],
    blocs: [
      { type: 'cle', t: 'Le calcul, et ce qu\'il faut dire avec',
        html: '<p>COP = puissance utile ÷ puissance absorbée. Exemple : un groupe absorbe 4 kW et enlève 12 kW à la chambre froide. L\'EER vaut 12 ÷ 4 = 3. Complétez toujours par les conditions : le fluide, la température d\'évaporation, la température de condensation, et le point de mesure de la puissance absorbée — compresseur seul, ou machine complète avec ventilateurs et dégivrage.</p>' },
      { type: 'piege', t: 'Comparer deux COP mesurés autrement',
        html: '<p>Un COP « compresseur seul » et un COP « machine complète » ne se comparent pas : le second inclut les ventilateurs, les résistances de dégivrage, les auxiliaires. L\'écart peut dépasser vingt pour cent. Quand un catalogue annonce un chiffre flatteur, la question n\'est pas « est-il vrai » mais « qu\'a-t-on mis au dénominateur ».</p>' },
    ],
  },
  {
    t: 'Le levier principal : l\'écart entre condensation et évaporation',
    ecrit: true,
    codes: ['11.02', '6.08', '7.10', '8.11'],
    visuels: ['svg:condenseur-ecart-encrassement', 'svg:diagramme-logph'],
    legendes: ['Ce que l écart coûte au compresseur', 'Le cycle qui s étire quand l écart grandit'],
    paras: [
      'Si vous ne deviez retenir qu\'une chose de tout ce chapitre, ce serait celle-ci : <b>l\'efficacité d\'une machine frigorifique dépend avant tout de l\'écart entre sa température de condensation et sa température d\'évaporation</b>. Plus cet écart est grand, plus le compresseur travaille, plus le COP chute.',
      'Regardez-le sur le diagramme. Quand la condensation monte, le palier haut du cycle se déplace vers le haut : le compresseur doit atteindre une pression de refoulement plus élevée, donc fournir davantage de travail pour le même effet frigorifique. Quand l\'évaporation baisse, le palier bas descend : le fluide aspiré est moins dense, le compresseur avale moins de masse à chaque tour, et sa puissance frigorifique s\'effondre.',
      'Les ordres de grandeur usuels dans la profession situent le gain autour de <b>deux à trois pour cent de COP par kelvin</b> gagné, dans un sens comme dans l\'autre. Traitez cette fourchette comme un repère de raisonnement, pas comme une constante : la valeur exacte dépend du fluide, du compresseur et du point de fonctionnement, et la documentation constructeur prime toujours.',
      'Ce repère suffit pourtant à hiérarchiser vos gestes. Un condenseur encrassé qui fait monter la condensation de dix kelvins coûte de l\'ordre de vingt à trente pour cent de performance. Aucun réglage fin ne rattrapera cela.',
      'Du côté de l\'évaporation, la logique est la même en sens inverse. Un évaporateur givré, un débit d\'air réduit, un dégivrage insuffisant font descendre la température d\'évaporation. La machine tourne plus longtemps pour le même service et consomme davantage.',
      'De là découle la règle de conduite : <b>ne jamais faire travailler la machine avec plus d\'écart que nécessaire</b>. Le premier levier n\'est pas un réglage savant, c\'est la propreté des échangeurs et le débit du fluide caloporteur, air ou eau.',
      'Le second levier est la <b>condensation flottante</b>. Une régulation à haute pression fixe oblige la machine à condenser à une température élevée même quand il fait froid dehors, alors que l\'air disponible permettrait de condenser bien plus bas. Laisser la pression de condensation descendre avec la température extérieure récupère un gain important sur l\'année.',
      'Cette liberté a une limite, et elle est physique : le détendeur a besoin d\'une pression différentielle suffisante pour alimenter correctement l\'évaporateur. Descendre trop bas fait manquer d\'alimentation. Le point de consigne minimal se règle donc selon le détendeur, la ligne liquide et la documentation constructeur, jamais au jugé.',
    ],
    blocs: [
      { type: 'cle', t: 'Les quatre gestes qui rendent le plus',
        html: '<p><ol><li><b>Nettoyer le condenseur</b> et rétablir le débit d\'air ou d\'eau : c\'est le geste au meilleur rapport temps/gain.</li><li><b>Rétablir l\'échange à l\'évaporateur</b> : dégivrage réglé, ailettes propres, ventilateurs sains.</li><li><b>Abaisser la condensation quand l\'ambiance le permet</b> — condensation flottante, dans les limites du détendeur.</li><li><b>Vérifier la charge</b> : ni manque, qui fait chuter l\'évaporation, ni excès, qui noie le condenseur et fait monter la haute pression.</li></ol></p>' },
      { type: 'piege', t: 'Baisser la consigne de la chambre « pour aller plus vite »',
        html: '<p>Abaisser la consigne d\'une chambre froide pour descendre plus vite en température fait baisser l\'évaporation, donc le COP, donc allonge le temps de fonctionnement et augmente la facture. Le froid n\'arrive pas plus vite : la machine est simplement moins efficace. Le seul gain de temps réel vient d\'un échange rétabli, pas d\'une consigne abaissée.</p>' },
    ],
  },
  {
    t: 'Organe par organe : ce que le référentiel attend de vous',
    ecrit: true,
    codes: ['6.08', '7.10', '8.11', '9.10'],
    visuels: ['svg:compresseurs-comparatif', 'svg:givre-isole-machine-force'],
    legendes: ['Adapter la puissance à la demande', 'Le givre isole et force la machine'],
    paras: [
      'Le référentiel ne demande pas une culture générale sur l\'énergie. Il demande, pour <b>chaque organe</b>, les mesures d\'amélioration ou de maintien de l\'efficacité lors de l\'installation et de la maintenance. Voici ce que cela recouvre, organe par organe.',
      'Au <b>compresseur</b> (code 6.08), l\'efficacité se joue sur l\'adaptation de la puissance à la demande. Un compresseur qui démarre et s\'arrête sans cesse consomme en pure perte à chaque démarrage et fatigue ses organes. La variation de vitesse, l\'étagement, la mise en cascade de plusieurs machines permettent de suivre la charge réelle plutôt que de fonctionner en tout ou rien.',
      'S\'y ajoutent la surchauffe à l\'aspiration, qui ne doit être ni insuffisante — risque de retour liquide — ni excessive, car elle élève la température de refoulement et dégrade le rendement, et le bon retour d\'huile, une huile qui reste dans le circuit isolant les échangeurs et diminuant l\'échange.',
      'Au <b>condenseur</b> (code 7.10), tout se joue sur l\'échange et sur les incondensables. Un échangeur propre, un débit d\'air ou d\'eau conforme, des ventilateurs en bon état maintiennent la condensation basse. La présence d\'<b>incondensables</b> — de l\'air entré par une fuite ou un tirage au vide bâclé — occupe une partie du volume, fait monter la pression de condensation et pénalise directement le COP.',
      'À l\'<b>évaporateur</b> (code 8.11), l\'ennemi est le givre et le mauvais échange. Un dégivrage déclenché trop rarement laisse la glace isoler la batterie ; déclenché trop souvent, il apporte de la chaleur dans l\'enceinte que la machine devra ensuite retirer. Le réglage juste est celui qui dégivre quand c\'est nécessaire, et pas selon une horloge posée une fois pour toutes.',
      'Au <b>détendeur</b> (code 9.10), l\'efficacité tient à la qualité de l\'alimentation. Un détendeur bien réglé maintient une surchauffe stable et utilise toute la surface de l\'évaporateur. Trop fermé, il sous-alimente : une partie de la batterie ne sert plus, l\'évaporation chute. Trop ouvert, il laisse passer du liquide vers le compresseur. Le détendeur électronique tient une surchauffe plus basse et plus stable qu\'un thermostatique, et c\'est là que se trouve son gain.',
      'Avec les <b>fluides inflammables</b> (code 12.14), les mêmes leviers valent, mais deux contraintes s\'ajoutent. La charge admissible étant limitée, la machine dispose de moins de fluide pour le même service : elle est plus sensible à toute perte d\'échange, et un condenseur encrassé y coûte plus cher qu\'ailleurs. Et chaque intervention devant être conduite selon les règles propres à ces fluides, l\'entretien courant doit être planifié plutôt que subi.',
      'Un mot enfin sur la <b>récupération de chaleur</b>. La chaleur rejetée au condenseur n\'est pas un déchet : elle peut préchauffer de l\'eau sanitaire ou un local. Ce n\'est pas une amélioration du COP de la machine — elle continue de consommer autant — mais une valorisation de ce qu\'elle rejette, et le bilan global du site s\'en trouve amélioré.',
    ],
    blocs: [
      { type: 'cle', t: 'Ce qu\'on vous demandera de savoir dire',
        html: '<p><ol><li><b>Compresseur</b> — adapter la puissance à la demande ; surchauffe juste ; retour d\'huile assuré.</li><li><b>Condenseur</b> — échange propre, débit conforme, pas d\'incondensables, condensation aussi basse que le détendeur l\'autorise.</li><li><b>Évaporateur</b> — dégivrage réglé sur le besoin réel, ailettes propres, ventilation assurée.</li><li><b>Détendeur</b> — surchauffe stable, toute la batterie alimentée, réglage conforme au constructeur.</li></ol></p>' },
      { type: 'piege', t: 'Les incondensables ne se purgent pas au hasard',
        html: '<p>Une haute pression anormale peut venir d\'incondensables, mais aussi d\'un condenseur encrassé, d\'un ventilateur arrêté, d\'une surcharge de fluide ou d\'une ambiance trop chaude. Purger « pour voir » libère du fluide dans l\'atmosphère — ce qui est interdit — et ne traite souvent pas la cause. Départagez d\'abord les hypothèses par la mesure : sous-refroidissement, écart entre la température de condensation lue et l\'ambiance, état de l\'échangeur.</p>' },
    ],
  },
  {
    t: 'Choisir un fluide : ce que l\'application et le climat imposent',
    ecrit: true,
    codes: ['11.04', '11.01', '11.02'],
    visuels: ['leg:impact-tewi/balance-tewi', 'leg:impact-tewi/piege-machine-gourmande'],
    legendes: ['Les deux plateaux du bilan', 'Une machine sobre qui fuit, une machine propre qui consomme'],
    paras: [
      'Le code 11.04 vous demande de comprendre les avantages et les inconvénients des fluides de substitution <b>en fonction de l\'application prévue et des conditions climatiques</b>. Ce n\'est pas une question de préférence : c\'est une question de point de fonctionnement.',
      'Un fluide n\'a pas une efficacité en soi. Il a une efficacité <b>à un régime donné</b>. Le même fluide peut être excellent en climatisation, où l\'évaporation reste haute et l\'écart modéré, et médiocre en froid négatif, où l\'écart devient considérable.',
      'Trois grandeurs commandent ce comportement. La <b>pression de fonctionnement</b> décide de la mécanique nécessaire et de la densité du fluide aspiré. La <b>température de refoulement</b> limite le taux de compression admissible : un fluide qui chauffe trop au refoulement ne peut pas descendre bas sans injection ou sans étagement. Le <b>glissement</b> des mélanges zéotropes complique le réglage et la charge, et il interdit de compléter une installation en phase vapeur.',
      'Le climat entre ensuite. Sous climat chaud, la condensation est haute une grande partie de l\'année : un fluide dont la température de refoulement s\'emballe y sera pénalisé, et le gain annoncé en laboratoire tempéré ne se retrouvera pas. Sous climat froid, la condensation flottante devient un levier majeur, et le fluide doit permettre d\'en profiter.',
      'C\'est ici que se noue le raisonnement complet, et c\'est ce que l\'épreuve attend d\'un candidat sérieux. Le fluide au PRP le plus bas n\'est pas automatiquement le meilleur choix : s\'il impose une machine moins efficace dans l\'application visée, la part indirecte augmentera plus que la part directe n\'aura diminué.',
      'L\'inverse est tout aussi vrai. Une machine très efficace chargée d\'un fluide à PRP élevé peut voir tout son bénéfice annulé par une seule fuite. C\'est le sens des deux plateaux du <b>TEWI</b> : la part directe des émissions de fluide, la part indirecte de l\'énergie consommée.',
      'La conclusion professionnelle est donc une conclusion prudente : <b>on ne choisit pas un fluide, on choisit un couple fluide-machine pour une application et un climat</b>, et l\'on vérifie ce choix auprès du constructeur. Aucun remplacement direct ne se décide sur la seule comparaison de deux PRP.',
    ],
    blocs: [
      { type: 'cle', t: 'Les six questions avant de valider un fluide',
        html: '<p><ol><li>Quelle <b>application</b> — climatisation, froid positif, froid négatif, pompe à chaleur ?</li><li>Quel <b>climat</b>, et donc quelle plage de condensation sur l\'année ?</li><li>Quelle <b>pression de fonctionnement</b>, et la machine est-elle dimensionnée pour ?</li><li>Quelle <b>température de refoulement</b> au régime le plus défavorable ?</li><li>Y a-t-il un <b>glissement</b>, et l\'installation le supporte-t-elle ?</li><li>Quelle <b>classe de sécurité</b>, quelle charge admissible dans ce local ?</li></ol></p>' },
      { type: 'piege', t: 'Le remplacement direct qui n\'existe pas',
        html: '<p>Un fluide présenté comme substitut direct d\'un autre reste un changement de point de fonctionnement. Huile, joints, réglage du détendeur, pressostats, charge : tout est à revérifier. La seule validation qui vous protège est celle du constructeur de la machine, écrite. Sans elle, vous engagez votre responsabilité sur une installation que vous avez modifiée.</p>' },
    ],
  },
];

/* ------------------------------------------------------------------
   LE REGISTRE ET LES COMPTES RENDUS — SEPT CODES.
   3.05, 4.09 et 5.07 (consigner au registre) ; 6.07, 7.09, 8.10 et 9.09
   (rédiger un rapport d'état, organe par organe, en signalant ce qui
   mènera à une fuite faute de mesure). Ce sont des compétences
   d'écriture professionnelle, évaluées à l'épreuve, et le livre les
   traitait en annexe. Elles trouvent ici leur lieu commun : distinguer
   ce que l'on a observé, ce que l'on suppose, et ce que l'on conclut.
   ------------------------------------------------------------------ */
export const LECONS_REGISTRE = [
  {
    t: 'Le registre : ce qui s\'écrit, quand, et pourquoi cela vous protège',
    ecrit: true,
    codes: ['3.05', '4.09', '5.07', '4.02'],
    visuels: ['leg:dechets-responsabilites/registre-producteur', 'svg:points-de-fuite'],
    legendes: ['Ce que le registre garde', 'Ce qu il faut avoir regardé avant d écrire'],
    paras: [
      'Le registre de l\'équipement n\'est pas un cahier de politesse administrative. C\'est la mémoire de l\'installation, et c\'est la seule pièce qui prouve ce que vous avez fait.',
      'Quatre codes du référentiel portent sur lui, et ils décrivent un cycle complet. Le code <b>4.02</b> demande de le <b>consulter avant</b> tout contrôle d\'étanchéité. Les codes <b>3.05</b>, <b>4.09</b> et <b>5.07</b> demandent d\'y <b>consigner après</b> : les essais et contrôles effectués, le résultat du contrôle d\'étanchéité, le fluide récupéré ou ajouté.',
      'Commençons par la consultation, parce que c\'est l\'étape que l\'on saute. Ouvrir le registre avant d\'intervenir vous apprend trois choses qu\'aucune mesure ne vous donnera : les <b>problèmes récurrents</b>, les <b>parties du système qui ont déjà fui</b>, et les <b>quantités ajoutées</b> lors des interventions précédentes.',
      'Cette dernière information est la plus parlante. Une installation qu\'on recharge de deux kilogrammes chaque année ne consomme pas du fluide : elle fuit. Le registre transforme une série d\'interventions isolées en un diagnostic que personne ne pouvait faire sur une seule visite.',
      'Vient ensuite ce que l\'on écrit. Un enregistrement utile porte au minimum : la <b>date</b>, l\'<b>identité</b> de l\'intervenant et de l\'entreprise, la <b>nature</b> de l\'opération, la <b>méthode</b> employée et l\'instrument utilisé, le <b>résultat</b>, et les <b>quantités</b> de fluide ajoutées ou récupérées avec leur nature.',
      'Sur les quantités, une exigence de rigueur : on écrit ce que la <b>balance</b> a mesuré, pas ce que l\'on estime avoir mis. Une charge « au manomètre » n\'est pas une donnée de registre.',
      'Deux mentions sont trop souvent oubliées. La première est le <b>contrôle après réparation</b> : réparer une fuite sans consigner la vérification qui a suivi laisse le dossier incomplet. La seconde est la <b>destination du fluide récupéré</b> — recyclé, régénéré ou destiné au traitement — avec la trace de sa remise.',
      'Enfin, la question de fond : à quoi cela sert-il ? Le registre sert au client, qui suit son parc. Il sert au contrôleur, qui vérifie la conformité. Et il vous sert, vous, le jour où l\'on vous demandera ce que vous avez fait sur cette machine il y a dix-huit mois. Ce jour-là, votre mémoire ne vaudra rien ; votre écriture vaudra tout.',
    ],
    blocs: [
      { type: 'cle', t: 'Avant, pendant, après',
        html: '<p><ol><li><b>Avant</b> — consulter : historique des fuites, parties problématiques, quantités déjà ajoutées.</li><li><b>Pendant</b> — noter au fil de l\'intervention, pas de mémoire le soir venu.</li><li><b>Après</b> — consigner : date, intervenant, opération, méthode et instrument, résultat, quantités pesées, destination du fluide récupéré, contrôle après réparation.</li></ol></p>' },
      { type: 'piege', t: '« J\'ai complété la charge » n\'est pas un enregistrement',
        html: '<p>Une ligne qui dit « appoint de fluide » sans quantité, sans nature de fluide et sans mention de recherche de fuite ne prouve rien et n\'aide personne. Elle laisse même penser que l\'on a rechargé une installation qui fuit sans chercher d\'où. C\'est exactement ce qu\'un contrôleur relèvera.</p>' },
    ],
  },
  {
    t: 'Rédiger un compte rendu d\'état : fait, hypothèse, conclusion',
    ecrit: true,
    codes: ['6.07', '7.09', '8.10', '9.09'],
    visuels: ['svg:manifold-lecture', 'svg:mesures-surchauffe-sous-refroidissement'],
    legendes: ['Lire avant d écrire', 'Les mesures qui fondent un compte rendu'],
    paras: [
      'Quatre codes du référentiel — un par organe principal — vous demandent la même chose dans les mêmes termes : rédiger un rapport sur l\'état de l\'organe, <b>en indiquant tout problème de fonctionnement susceptible d\'endommager le système et d\'entraîner à terme, faute de mesure, des fuites ou des émissions</b>.',
      'Lisez bien cette formulation. On ne vous demande pas de dire si l\'organe est bon ou mauvais. On vous demande d\'anticiper : ce qui, aujourd\'hui, n\'est pas encore une fuite, mais le deviendra si personne n\'agit.',
      'Un compte rendu qui tient cette exigence se construit en trois étages, et le principal défaut des comptes rendus de terrain est de les mélanger.',
      'Le premier étage est le <b>fait</b>. C\'est ce que vous avez observé ou mesuré, avec sa valeur, son unité, son point de mesure et son instrument. « Surchauffe mesurée à 12 K en sortie d\'évaporateur, sonde de contact, après trente minutes de fonctionnement stabilisé. » Un fait est vérifiable par un autre technicien.',
      'Le deuxième étage est l\'<b>hypothèse</b>. C\'est ce que le fait suggère, et il en suggère presque toujours plusieurs. « Cette surchauffe élevée peut venir d\'une sous-alimentation par le détendeur, d\'un manque de charge, ou d\'une perte de charge sur la ligne liquide. » Une hypothèse s\'écrit au conditionnel et elle n\'est jamais seule.',
      'Le troisième étage est la <b>conclusion</b>, et elle ne vient qu\'après un contrôle qui a départagé les hypothèses. « Le sous-refroidissement mesuré à 2 K et les bulles au voyant écartent l\'hypothèse du réglage seul et orientent vers un manque de charge, à confirmer par une recherche de fuite. »',
      'Ce qui sépare un technicien d\'un exécutant tient dans cette discipline. Écrire « manque de gaz » en tête d\'un compte rendu, c\'est présenter une hypothèse comme un fait. Le client rechargera, la fuite continuera, et la responsabilité sera partagée avec celui qui l\'a écrit.',
      'Terminez toujours par ce que le référentiel réclame vraiment : la <b>conséquence à terme</b> et la <b>mesure à prendre</b>. « En l\'état, le compresseur fonctionne avec un retour d\'huile insuffisant ; sans intervention, l\'usure conduira à une fuite au niveau du presse-étoupe. Contrôle du séparateur d\'huile et de la vitesse dans la ligne d\'aspiration à programmer. »',
    ],
    blocs: [
      { type: 'cle', t: 'Le gabarit qui tient devant n\'importe quel lecteur',
        html: '<p><ol><li><b>Ce que j\'ai relevé</b> — valeurs, unités, points de mesure, instruments, conditions.</li><li><b>Ce que cela peut signifier</b> — deux ou trois hypothèses, au conditionnel.</li><li><b>Ce qui les départage</b> — le contrôle discriminant réalisé, et son résultat.</li><li><b>Ce que je conclus</b> — la cause retenue, et ce qui reste à confirmer.</li><li><b>Ce qui arrivera sans intervention</b> — le risque de fuite ou de casse, et la mesure proposée.</li></ol></p>' },
      { type: 'piege', t: 'Le compte rendu qui rassure au lieu d\'informer',
        html: '<p>« RAS, installation conforme » sur une machine dont on n\'a mesuré que la basse pression n\'est pas un compte rendu : c\'est une signature au bas d\'une page blanche. S\'il n\'y a rien à signaler, écrivez ce que vous avez contrôlé pour pouvoir le dire. Un compte rendu se juge à ce qu\'il permet de vérifier, pas à ce qu\'il affirme.</p>' },
    ],
  },
];

/* ------------------------------------------------------------------
   SECOND CHAPITRE TÉMOIN — « Raisonner sans diagnostiquer trop vite ».
   Le cadrage le désigne avec le chapitre ozone/climat pour valider la
   profondeur et la voix. Il n'existait pas : le livre passait de la
   mesure à la conclusion sans l'étape qui les sépare. C'est pourtant ce
   que l'épreuve distingue le mieux entre un candidat qui a appris des
   symptômes et un candidat qui sait conduire un raisonnement.
   Il porte 1.03 (lire les tables et graphiques dans le cadre d'un
   contrôle indirect) et fédère les quatre codes de compte rendu.
   ------------------------------------------------------------------ */
export const LECONS_DIAGNOSTIC = [
  {
    t: 'Une mesure produit des hypothèses, jamais une certitude',
    ecrit: true,
    codes: ['1.03', '1.02'],
    visuels: ['svg:manifold-lecture', 'svg:lecture-table'],
    legendes: ['Ce que le manifold donne, et ce qu il ne donne pas', 'La table traduit une pression en température'],
    paras: [
      'Un technicien pressé regarde une basse pression trop faible et annonce un manque de fluide. Il a raison une fois sur trois, et les deux autres fois il recharge une installation qui n\'en avait pas besoin, ou il laisse une fuite continuer.',
      'La méthode professionnelle tient en quatre temps, et l\'ordre compte : <b>observer</b>, <b>mesurer</b>, <b>formuler plusieurs hypothèses</b>, puis <b>choisir le contrôle qui les départage</b>. La conclusion ne vient qu\'après.',
      'L\'<b>observation</b> précède la mesure. Avant de brancher quoi que ce soit : que fait la machine ? Depuis quand ? Le compresseur tourne-t-il en continu ou cycle-t-il ? Y a-t-il du givre là où il ne devrait pas y en avoir ? Le condenseur est-il propre ? Que dit le registre des interventions précédentes ?',
      'Vient la <b>mesure</b>, et elle n\'a de valeur qu\'à trois conditions. Que la machine ait atteint un régime stabilisé — une mesure prise deux minutes après le démarrage ne veut rien dire. Que l\'instrument soit adapté et vérifié. Et que le point de mesure soit le bon, car une surchauffe se lit au bulbe, pas au hasard de la ligne.',
      'Le manomètre affiche une <b>pression</b>. Pour raisonner, il vous faut une <b>température</b> : celle de saturation correspondante. C\'est le rôle de la table du fluide, et c\'est là qu\'intervient le code 1.03 du référentiel.',
      'Trois pièges guettent ici, et chacun fausse tout ce qui suit. Le premier : <b>un fluide, une table</b>. La table du R-134a ne dit rien du R-404A. Le second : <b>pression relative ou absolue</b>, il faut savoir laquelle la table utilise, l\'écart est d\'environ un bar. Le troisième, pour les mélanges zéotropes : <b>bulle ou rosée</b>. On lit au point de <b>bulle</b> pour le sous-refroidissement au condenseur, au point de <b>rosée</b> pour la surchauffe à l\'évaporateur. Se tromper de colonne fausse le résultat du <b>glissement</b> entier.',
      'Alors seulement viennent les <b>hypothèses</b>. Et la règle est simple : s\'il ne vous en vient qu\'une, c\'est que vous n\'avez pas cherché. Une basse pression faible admet au minimum cinq explications : manque de charge, détendeur sous-alimentant, filtre déshydrateur colmaté, charge thermique insuffisante à l\'évaporateur, ou sonde et réglage en cause.',
    ],
    blocs: [
      { type: 'cle', t: 'Les quatre temps, dans l\'ordre',
        html: '<p><ol><li><b>J\'observe</b> — l\'installation, son comportement, son registre.</li><li><b>Je mesure</b> — régime stabilisé, instrument vérifié, point de mesure juste.</li><li><b>Je formule</b> — plusieurs hypothèses, jamais une seule.</li><li><b>Je départage</b> — le contrôle qui élimine, puis la conclusion.</li></ol></p>' },
      { type: 'piege', t: 'La mesure prise trop tôt',
        html: '<p>Une installation qui vient de démarrer, qui sort d\'un dégivrage ou dont la chambre est encore chaude ne donne aucune valeur exploitable. Attendre la stabilisation n\'est pas une perte de temps : c\'est ce qui rend la mesure lisible. Notez d\'ailleurs le temps de fonctionnement dans votre compte rendu — un lecteur saura ce que vaut votre chiffre.</p>' },
    ],
  },
  {
    t: 'Le contrôle discriminant : celui qui élimine une hypothèse',
    ecrit: true,
    codes: ['1.03', '4.01'],
    visuels: ['svg:mesures-surchauffe-sous-refroidissement', 'svg:points-de-fuite'],
    legendes: ['Deux mesures qui départagent', 'Là où il faut aller regarder'],
    paras: [
      'Un bon contrôle n\'est pas celui qui confirme ce que vous pensez. C\'est celui dont le résultat <b>change</b> selon l\'hypothèse vraie. On l\'appelle un contrôle discriminant, et savoir le choisir est le cœur du métier.',
      'Prenons le cas d\'école : la basse pression est trop faible. Les cinq hypothèses citées ont toutes le même symptôme. Deux mesures suffisent pourtant à les trier.',
      'La première est le <b>sous-refroidissement</b>, en sortie de condenseur. S\'il est faible ou nul, il manque du fluide dans la partie haute : l\'hypothèse du manque de charge remonte fortement. S\'il est normal ou élevé, le fluide est là, et le problème se situe en aval.',
      'La seconde est la <b>surchauffe</b>, en sortie d\'évaporateur. Élevée, elle dit que l\'évaporateur est mal alimenté. Basse ou nulle, elle dit qu\'il l\'est trop, et l\'hypothèse du manque de charge s\'effondre.',
      'Croisez les deux et le tableau se lit presque seul. Sous-refroidissement faible et surchauffe élevée : la charge manque, et il faut chercher la fuite avant de recharger. Sous-refroidissement normal et surchauffe élevée : la charge est là mais n\'arrive pas — détendeur, filtre, ligne liquide. Sous-refroidissement élevé et surchauffe basse : on est plutôt du côté de la surcharge ou d\'un condenseur qui n\'évacue pas.',
      'Un troisième contrôle sépare le détendeur du filtre colmaté : la <b>température de part et d\'autre du filtre déshydrateur</b>. Un filtre qui se refroidit à sa sortie crée une détente parasite ; c\'est une perte de charge, et elle se voit au toucher comme au thermomètre.',
      'Et pour la charge thermique, la question est presque triviale mais on l\'oublie : que demande-t-on à cette machine en ce moment ? Une chambre vide, une porte fermée depuis huit heures, un local froid : la machine n\'a plus rien à retirer, l\'évaporation descend, et rien n\'est en panne.',
      'Deux avertissements pour finir. D\'abord, une valeur repère n\'est pas une norme : les plages de surchauffe et de sous-refroidissement <b>dépendent de l\'installation</b>, et la valeur du constructeur prime toujours sur toute règle apprise. Ensuite, si vos hypothèses restent à égalité après vos contrôles, ne tranchez pas : écrivez-le. Un compte rendu qui dit « deux causes restent possibles, voici le contrôle qui reste à faire » vaut infiniment mieux qu\'une conclusion inventée.',
    ],
    blocs: [
      { type: 'cle', t: 'Le tableau à deux entrées qu\'il faut savoir refaire',
        html: '<p><ol><li><b>Sous-refroidissement faible + surchauffe élevée</b> → manque de charge. Chercher la fuite, ne pas recharger sans cela.</li><li><b>Sous-refroidissement normal + surchauffe élevée</b> → alimentation entravée : détendeur, filtre, ligne liquide.</li><li><b>Sous-refroidissement élevé + surchauffe basse</b> → surcharge, ou condensation qui n\'évacue pas.</li><li><b>Tout normal, évaporation basse</b> → charge thermique insuffisante : la machine n\'a rien à faire.</li></ol></p>' },
      { type: 'piege', t: 'Recharger pour voir',
        html: '<p>Ajouter du fluide pour observer si « ça va mieux » est le contraire d\'un contrôle discriminant : cela modifie l\'installation avant d\'avoir compris, cela masque le symptôme quelques semaines, et si la machine fuyait, le fluide ajouté part dans l\'atmosphère. C\'est un geste interdit dans son principe même : recharger sans avoir recherché la fuite, c\'est émettre en connaissance de cause.</p>' },
    ],
  },
];

/* ------------------------------------------------------------------
   LES UNITÉS ET LES GRANDEURS — codes 1.01, 1.02, 1.04.
   1.01 exige les unités normalisées ISO pour la température, la
   pression, la masse, la densité et l'énergie ; 1.04 la fonction des
   principales composantes et les transformations thermodynamiques du
   fluide. Le livre les traitait en 452 mots pour les deux.
   ------------------------------------------------------------------ */
export const LECONS_UNITES = [
  {
    t: 'Les unités que l\'on vous demandera de manier sans hésiter',
    ecrit: true,
    codes: ['1.01', '1.02'],
    visuels: ['svg:pression-absolue-relative', 'sym:manometres'],
    legendes: ['Le décalage d environ un bar', 'Ce que l aiguille indique vraiment'],
    paras: [
      'Le référentiel ouvre la partie théorique par les unités, et ce n\'est pas une formalité. La plupart des erreurs de calcul en épreuve viennent d\'une unité mal convertie, pas d\'un raisonnement faux.',
      'La <b>température</b> se mesure en kelvins (K) dans le système international, en degrés Celsius (°C) dans l\'usage. Un écart de un kelvin vaut un écart de un degré Celsius : c\'est l\'origine qui change, pas la graduation. Le zéro absolu est à environ −273,15 °C.',
      'De là une règle d\'écriture que les correcteurs relèvent : une <b>température</b> s\'exprime en °C, un <b>écart</b> de température s\'exprime en K. Une surchauffe de 8 K, une évaporation à −10 °C. Ce n\'est pas du purisme : cela évite d\'additionner ce qui ne s\'additionne pas.',
      'La <b>pression</b> se mesure en pascals (Pa) dans le système international, mais la profession travaille en <b>bars</b>. Un bar vaut cent mille pascals, soit 100 kPa. Un mégapascal vaut dix bars.',
      'Le point qui coûte le plus de points à l\'examen est ailleurs : la distinction entre pression <b>absolue</b> et pression <b>relative</b>. Un manomètre ordinaire indique la pression relative, c\'est-à-dire l\'écart avec l\'atmosphère. Zéro au manomètre ne signifie pas le vide : cela signifie la pression atmosphérique.',
      'Pour passer de l\'une à l\'autre, on ajoute environ un bar à la pression relative pour obtenir l\'absolue. On écrit souvent bar(g) pour la relative et bar(a) pour l\'absolue. <b>Les tables de saturation travaillent en absolu</b> : lire une table avec une valeur relative fausse la température de saturation, donc la surchauffe, donc le diagnostic.',
      'La <b>masse</b> se mesure en kilogrammes (kg). C\'est l\'unité de la charge d\'une installation, et c\'est la seule qui compte pour le registre et pour le calcul en tonnes équivalent CO₂. La <b>masse volumique</b> se mesure en kilogrammes par mètre cube (kg/m³) : elle explique pourquoi un fluide plus lourd que l\'air s\'accumule en point bas.',
      'L\'<b>énergie</b> se mesure en joules (J), et la <b>puissance</b> en watts (W), un watt valant un joule par seconde. Le kilowattheure (kWh) est une énergie, pas une puissance : c\'est ce que consomme un appareil de 1 kW pendant une heure. L\'<b>enthalpie massique</b>, elle, se lit en kilojoules par kilogramme (kJ/kg) — c\'est l\'axe horizontal du diagramme.',
    ],
    blocs: [
      { type: 'cle', t: 'Les conversions à connaître par cœur',
        html: '<p><ol><li>1 bar = 100 000 Pa = 100 kPa = 0,1 MPa.</li><li>Pression absolue ≈ pression relative + 1 bar.</li><li>Un écart de 1 K = un écart de 1 °C.</li><li>1 kW pendant 1 h = 1 kWh.</li><li>L\'enthalpie massique se lit en kJ/kg ; multipliée par un débit en kg/s, elle donne une puissance en kW.</li></ol></p>' },
      { type: 'piege', t: 'Lire une table avec une pression relative',
        html: '<p>C\'est l\'erreur la plus fréquente, et elle est invisible : le résultat reste plausible. Un manomètre affichant 2 bar(g) correspond à environ 3 bar(a). Lire la table à 2 bar donne une température de saturation trop basse d\'environ six kelvins selon le fluide — et une surchauffe calculée fausse d\'autant. Vérifiez toujours ce que votre manomètre affiche et ce que votre table attend.</p>' },
    ],
  },
];

/* ------------------------------------------------------------------
   LES FLUIDES — codes 1.06 et 1.07.
   1.06 : comportement, paramètres physiques, déviances de TOUS les
   réfrigérants de substitution ; 1.07 (nouveau 2025) : caractéristiques
   des hydrocarbures, du CO2 et du NH3 par rapport aux fluorés.
   443 mots dans le livre pour ces deux codes.
   ------------------------------------------------------------------ */
export const LECONS_FLUIDES = [
  {
    t: 'Corps purs, azéotropes, zéotropes : ce que le glissement change',
    ecrit: true,
    codes: ['1.06', '1.02'],
    visuels: ['svg:familles-fluides', 'svg:lecture-table'],
    legendes: ['Ce que trois atomes décident', 'Bulle et rosée sur la même ligne'],
    paras: [
      'Un fluide frigorigène peut être un <b>corps pur</b> — une seule molécule, comme le R-134a ou le R-32 — ou un <b>mélange</b> de plusieurs corps purs. Cette distinction commande une grande partie du comportement de l\'installation.',
      'Un corps pur change d\'état à température constante sous une pression donnée. Vous lisez une pression, la table vous donne une température, et c\'est la même à l\'entrée et à la sortie de l\'échangeur.',
      'Un mélange <b>azéotropique</b> se comporte à peu près comme un corps pur : ses composants s\'évaporent ensemble. La série des R-5xx en compte plusieurs. Pour le technicien, la lecture reste simple.',
      'Un mélange <b>zéotropique</b> — la série des R-4xx, dont le R-407C et le R-404A — se comporte autrement. Ses composants n\'ont pas la même volatilité : le plus volatil s\'évapore en premier. La température monte donc pendant l\'évaporation, à pression constante.',
      'Cet écart s\'appelle le <b>glissement</b>. Il conduit à distinguer deux températures pour une même pression : le point de <b>bulle</b>, où la première bulle de vapeur apparaît dans le liquide, et le point de <b>rosée</b>, où la dernière goutte de liquide disparaît.',
      'Trois conséquences pratiques en découlent, et l\'examen les attend. Pour le <b>sous-refroidissement</b>, on lit au point de bulle. Pour la <b>surchauffe</b>, on lit au point de rosée. Se tromper de colonne fausse le calcul de la valeur entière du glissement.',
      'Deuxième conséquence : un mélange zéotrope se charge <b>en phase liquide</b>. Prélever en phase vapeur dans la bouteille appauvrit le mélange en composant volatil, et ce qui entre dans la machine n\'a plus la composition annoncée. Une fuite importante produit le même effet dans l\'installation : le fluide restant n\'a plus la bonne composition, et compléter ne le répare pas.',
      'Troisième conséquence : le glissement gêne certaines applications. Sur un échangeur à contre-courant bien conçu, il peut être exploité. Sur d\'autres montages, il dégrade l\'échange et complique la régulation de surchauffe.',
    ],
    blocs: [
      { type: 'cle', t: 'Le réflexe devant un mélange',
        html: '<p><ol><li>Quel type — corps pur, azéotrope, zéotrope ?</li><li>Quel <b>glissement</b>, selon la documentation du fluide ?</li><li><b>Bulle</b> pour le sous-refroidissement, <b>rosée</b> pour la surchauffe.</li><li>Charge en <b>phase liquide</b>.</li><li>Après une fuite importante : la composition a changé, on ne complète pas, on statue avec le constructeur.</li></ol></p>' },
      { type: 'piege', t: 'Déduire le comportement du numéro',
        html: '<p>Le nombre qui nomme un fluide décrit sa molécule ou sa famille, jamais son comportement en machine. Un R-4xx est un mélange, mais son glissement peut aller de quasi nul à plusieurs kelvins. Aucune règle mentale ne remplace la lecture de la fiche du fluide : ni pour le glissement, ni pour la compatibilité de l\'huile, ni pour le PRP.</p>' },
    ],
  },
  {
    t: 'Hydrocarbures, CO₂, NH₃ : ce qui les sépare des fluorés',
    ecrit: true,
    codes: ['1.07', '1.06'],
    visuels: ['svg:co2-nh3-compare', 'svg:lie-domaine'],
    legendes: ['Deux fluides naturels, deux risques opposés', 'Le domaine d explosivité des hydrocarbures'],
    paras: [
      'Le code 1.07 est nouveau en 2025, et il demande précisément ce que les fluides non fluorés ont de différent. Ce n\'est pas une question de culture générale : ces fluides sont ceux vers lesquels le marché se déplace.',
      'Les <b>hydrocarbures</b> — propane R-290, isobutane R-600a, propylène R-1270 — ont d\'excellentes propriétés thermodynamiques et un PRP de l\'ordre de quelques unités. Leur défaut est unique et majeur : ils sont <b>inflammables</b>, classés A3. Il ne s\'agit pas d\'une inflammabilité marginale mais franche.',
      'Deux notions commandent alors la sécurité. La <b>LIE</b>, limite inférieure d\'explosivité, est la concentration en dessous de laquelle le mélange avec l\'air ne s\'enflamme pas. La <b>LSE</b>, limite supérieure, celle au-dessus de laquelle il est trop riche pour brûler. Entre les deux, une source d\'ignition suffit.',
      'La conséquence dimensionne tout le reste : la <b>charge admissible</b> dans un local dépend de son volume et de son occupation, et c\'est pour cela que les machines aux hydrocarbures sont conçues à faible charge, souvent compactes et monoblocs.',
      'Le <b>CO₂</b>, R-744, a un PRP de 1 et aucune inflammabilité. Ce qui le distingue, ce sont ses <b>pressions</b>, sans commune mesure avec celles des fluorés, y compris à l\'arrêt : une installation hors tension voit sa pression monter avec la température ambiante, ce qui impose des dispositions de maintien à l\'arrêt.',
      'Son second caractère est thermodynamique : son point critique est bas, ce qui conduit à des cycles <b>transcritiques</b> où le fluide n\'est plus condensé mais refroidi à l\'état supercritique. Le raisonnement change, et le diagramme aussi.',
      'Son risque propre enfin : le CO₂ est <b>plus lourd que l\'air</b> et s\'accumule en point bas. Il n\'a ni odeur ni couleur. À concentration élevée, il agit comme un asphyxiant et un toxique, et la détection fixe en partie basse n\'est pas un luxe mais la seule alerte disponible.',
      'L\'<b>ammoniac</b>, R-717, a un PRP nul et des performances remarquables. Son caractère dominant est la <b>toxicité</b>, classée B, et une inflammabilité faible mais réelle. Son odeur perçante est perceptible très en dessous des concentrations dangereuses : c\'est une alerte que les fluorés n\'offrent pas.',
      'Deux points achèvent de le distinguer : il <b>attaque le cuivre</b> et ses alliages, ce qui impose l\'acier pour toute la tuyauterie et une robinetterie spécifique ; et il est <b>plus léger que l\'air</b>, donc il s\'accumule en partie haute — l\'inverse du CO₂.',
      'Une dernière chose, et elle est réglementaire. Le CO₂ relève de la catégorie B, l\'ammoniac de la catégorie C. Ce que vous apprenez ici sert à les <b>reconnaître</b>, à comprendre leurs caractéristiques générales et à savoir vous arrêter. Ce n\'est pas une préparation à intervenir sur ces installations.',
    ],
    blocs: [
      { type: 'cle', t: 'Trois fluides, trois risques dominants',
        html: '<p><ol><li><b>Hydrocarbures</b> — inflammabilité franche (A3), charge admissible limitée, sources d\'ignition à maîtriser.</li><li><b>CO₂ (R-744)</b> — pressions élevées y compris à l\'arrêt, cycles transcritiques, accumulation en <b>point bas</b>, asphyxie et toxicité.</li><li><b>NH₃ (R-717)</b> — toxicité (classe B), incompatible avec le cuivre, accumulation en <b>partie haute</b>, odeur d\'alerte.</li></ol></p>' },
      { type: 'piege', t: 'Croire qu\'un fluide naturel est un fluide sans risque',
        html: '<p>« Naturel » qualifie l\'origine, jamais la dangerosité. Le propane est excellent pour le climat et franchement inflammable. L\'ammoniac est excellent pour le climat et toxique. Le CO₂ est le gaz de référence du PRP et il asphyxie en point bas. Un fluide à faible impact climatique demande souvent <b>plus</b> de précautions qu\'un fluoré, pas moins.</p>' },
    ],
  },
];

/* ------------------------------------------------------------------
   LA CROIX DU FRIGORISTE — code 1.04, et les principes de fonctionnement
   6.01, 7.01, 8.01, 9.01. Le cadrage en fait le chapitre d'ouverture du
   second volume : compresseur à droite, condenseur en haut, détendeur à
   gauche, évaporateur en bas. C'est la charpente sur laquelle tout le
   reste se raccroche, et le livre la traitait en 452 mots.
   ------------------------------------------------------------------ */
export const LECONS_CROIX = [
  {
    t: 'Quatre organes, quatre lignes, et ce que le fluide devient',
    ecrit: true,
    codes: ['1.04', '1.02'],
    visuels: ['svg:croix-frigoriste-etats', 'svg:circuit-complet-manifold'],
    legendes: ['Chaque coin de la croix, chaque état du fluide', 'Le circuit complet, manifold branché'],
    paras: [
      'La croix du frigoriste est la carte du métier. Elle place quatre organes toujours au même endroit, et cette convention n\'est pas décorative : elle vous permet de raisonner sur n\'importe quelle installation, quelle que soit la façon dont elle est câblée dans son local.',
      'Le <b>compresseur</b> est à droite. Le <b>condenseur</b> est en haut. Le <b>détendeur</b> est à gauche. L\'<b>évaporateur</b> est en bas. Le fluide tourne dans le sens des aiguilles d\'une montre.',
      'Cette disposition sépare la machine en deux moitiés qu\'il faut avoir constamment en tête. La moitié <b>haute</b> est du côté de la haute pression : elle va du refoulement du compresseur jusqu\'au détendeur. La moitié <b>basse</b> est du côté de la basse pression : elle va de la sortie du détendeur jusqu\'à l\'aspiration.',
      'Les quatre lignes portent des noms qu\'il faut employer avec exactitude. Le <b>refoulement</b> va du compresseur au condenseur : le fluide y est vapeur, chaude, à haute pression. La <b>ligne liquide</b> va du condenseur au détendeur : liquide, haute pression. L\'<b>alimentation de l\'évaporateur</b> va du détendeur à l\'évaporateur : mélange liquide et vapeur, basse pression. L\'<b>aspiration</b> revient à droite : vapeur, basse pression.',
      'Suivons maintenant le fluide, parce que c\'est ce que le code 1.04 demande vraiment : la fonction des organes <b>et</b> les transformations du fluide.',
      'Au <b>compresseur</b>, la vapeur basse pression est comprimée. Sa pression monte, sa température monte fortement — c\'est la chaleur de compression. Le compresseur ne fabrique pas de froid : il crée l\'écart de pression qui permet au fluide de prendre la chaleur en bas et de la rendre en haut.',
      'Au <b>condenseur</b>, la vapeur chaude cède sa chaleur à l\'air ou à l\'eau. Trois zones s\'y succèdent : la désurchauffe, où la vapeur refroidit sans changer d\'état ; la condensation proprement dite, à température constante pour un corps pur ; puis le sous-refroidissement, où le liquide descend encore de quelques kelvins. Ce sous-refroidissement n\'est pas un détail : il garantit que le détendeur est alimenté en liquide pur.',
      'Au <b>détendeur</b>, le liquide haute pression traverse un passage étroit. Sa pression chute brutalement. Une petite partie s\'évapore aussitôt et refroidit le reste : c\'est ce qui produit le mélange froid qui entre dans l\'évaporateur. Aucune chaleur n\'est échangée avec l\'extérieur pendant cette détente.',
      'À l\'<b>évaporateur</b>, le liquide restant s\'évapore en prenant de la chaleur au milieu à refroidir. C\'est là, et seulement là, que se produit l\'effet frigorifique. En fin de parcours, la vapeur se réchauffe encore un peu au-dessus de sa température d\'évaporation : c\'est la surchauffe, et elle protège le compresseur du retour de liquide.',
      'Le cycle est bouclé. Une dernière précision, qui sépare l\'école du terrain : ce que l\'on vient de décrire est le <b>cycle idéalisé</b>. La machine réelle subit des pertes de charge dans les lignes, des échanges parasites avec l\'ambiance, une compression qui n\'est pas parfaite. Le cycle réel est toujours moins bon que le modèle, et connaître le modèle sert justement à mesurer l\'écart.',
    ],
    blocs: [
      { type: 'cle', t: 'Ce que vous devez pouvoir dessiner de mémoire',
        html: '<p><ol><li><b>Compresseur à droite</b> — la vapeur monte en pression et en température.</li><li><b>Condenseur en haut</b> — désurchauffe, condensation, sous-refroidissement ; la chaleur part.</li><li><b>Détendeur à gauche</b> — la pression chute, une partie s\'évapore et refroidit le reste.</li><li><b>Évaporateur en bas</b> — le liquide s\'évapore en prenant la chaleur ; puis la surchauffe.</li></ol></p>' },
      { type: 'piege', t: '« Le compresseur fabrique le froid »',
        html: '<p>Il ne fabrique rien du tout : il déplace. Le froid apparaît à l\'évaporateur, où le fluide prend de la chaleur ; le compresseur ne fait que créer les conditions de pression qui rendent ce transfert possible, et il ajoute au passage sa propre chaleur de compression, qu\'il faudra évacuer au condenseur. Cette confusion mène à chercher les pannes au mauvais endroit.</p>' },
    ],
  },
  {
    t: 'Les quatre organes, ce qui les use et ce qui les fait fuir',
    ecrit: true,
    codes: ['6.01', '7.01', '8.01', '9.01'],
    visuels: ['svg:compresseurs', 'svg:condenseur-trois-zones'],
    legendes: ['La coupe du compresseur à piston', 'Les trois zones du condenseur'],
    paras: [
      'Quatre codes du référentiel demandent, pour chaque organe, d\'expliquer son principe de fonctionnement <b>et les risques de fuite qui y sont associés</b>. Les deux moitiés de la phrase comptent autant.',
      'Le <b>compresseur</b> (6.01) aspire, comprime, refoule. Les technologies diffèrent par la manière : le piston alternatif par un mouvement de va-et-vient, la vis par deux rotors qui réduisent progressivement le volume, la spirale par deux volutes dont l\'une décrit un mouvement orbital. Le référentiel demande aussi le <b>réglage de la puissance</b> et le <b>circuit de lubrification</b>.',
      'La lubrification mérite qu\'on s\'y arrête. L\'huile circule avec le fluide dans tout le circuit et doit revenir au compresseur. Si elle reste piégée dans un évaporateur ou une remontée mal dimensionnée, deux choses arrivent ensemble : le compresseur manque d\'huile et s\'use, et l\'huile déposée dans l\'échangeur diminue l\'échange.',
      'Les points de fuite du compresseur sont connus : le presse-étoupe des machines ouvertes, les joints de culasse et de plaque à clapets, les raccords des vannes de service, et les prises de pression des pressostats. Une usure interne ne fuit pas directement, mais elle mène à la casse, et la casse, elle, libère la charge.',
      'Le <b>condenseur</b> (7.01) évacue la chaleur. À air, il dépend de la propreté des ailettes et du bon fonctionnement des ventilateurs ; à eau, du débit, de l\'entartrage et de la qualité de l\'eau. Ses fuites viennent des collets, des coudes soumis aux vibrations, des points de corrosion — le sel en bord de mer, les condensats acides en toiture — et des raccords de la ligne liquide.',
      'L\'<b>évaporateur</b> (8.01) produit le froid, et le référentiel y adjoint expressément le <b>dégivrage</b>. Le givre se forme dès que la surface passe sous zéro et que l\'air contient de l\'humidité. Il isole, réduit le passage de l\'air, fait chuter l\'évaporation. Le dégivrage le retire : à l\'air ambiant quand la température le permet, par résistances électriques, ou par inversion de cycle en gaz chaud.',
      'Les fuites d\'évaporateur sont particulières : la batterie est souvent en zone humide, exposée aux chocs de manutention, aux résistances de dégivrage qui la font travailler thermiquement, et à la corrosion par les condensats. C\'est aussi l\'organe le plus difficile à contrôler visuellement, souvent caché dans une enceinte.',
      'Le <b>détendeur</b> (9.01) règle le débit. Le <b>capillaire</b> est un tube calibré, sans réglage : simple, mais il n\'admet ni variation de charge ni variation de conditions. Le <b>thermostatique</b> module le débit selon la surchauffe mesurée par un bulbe placé sur l\'aspiration ; son égalisation peut être interne ou externe, l\'externe étant nécessaire dès que la perte de charge dans l\'évaporateur devient sensible. L\'<b>électronique</b> mesure pression et température par sondes et pilote une vanne : il tient une surchauffe plus basse et plus stable.',
      'Ses fuites viennent des raccords, du passage du bulbe et de son capillaire — fragile, souvent plié ou pincé lors d\'une intervention — et de l\'égalisation externe, une ligne de petit diamètre que l\'on oublie facilement.',
    ],
    blocs: [
      { type: 'cle', t: 'Où regarder, organe par organe',
        html: '<p><ol><li><b>Compresseur</b> — presse-étoupe, joints de culasse, vannes de service, prises de pression.</li><li><b>Condenseur</b> — collets, coudes vibrants, corrosion, raccords de ligne liquide.</li><li><b>Évaporateur</b> — zone humide, chocs, résistances de dégivrage, condensats corrosifs.</li><li><b>Détendeur</b> — raccords, capillaire du bulbe, ligne d\'égalisation externe.</li></ol></p>' },
      { type: 'piege', t: 'Le bulbe déplacé « pour passer la clé »',
        html: '<p>Un bulbe desserré puis remis approximativement ne mesure plus la bonne température : mauvais contact, mauvaise position sur la circonférence du tube, isolation oubliée. Le détendeur régule alors sur une information fausse, la surchauffe dérive, et l\'on cherchera la panne partout sauf là. Repositionner un bulbe est un geste précis, pas un remontage.</p>' },
    ],
  },
];

/* ------------------------------------------------------------------
   RÉCUPÉRATION, STOCKAGE, TRANSPORT — codes 5.08 et 5.09.
   5.09 est nouveau en 2025 et porte spécifiquement sur les
   hydrocarbures et leurs huiles. Le livre traitait les deux en 568 mots.
   ------------------------------------------------------------------ */
export const LECONS_RECUPERATION = [
  {
    t: 'Récupérer, stocker, transporter : la chaîne complète du fluide',
    ecrit: true,
    codes: ['5.08', '5.07'],
    visuels: ['svg:recuperation-securisee', 'svg:secu-bouteille'],
    legendes: ['La station et l ordre des vannes', 'La bouteille : ce qu elle porte et ce qu elle exige'],
    paras: [
      'Le code 5.08 demande les prescriptions et procédures de <b>gestion, réutilisation, récupération, stockage et transport</b> des réfrigérants et des huiles fluorés, <b>y compris lorsqu\'ils sont contaminés</b>. C\'est une chaîne complète, et chaque maillon a ses règles.',
      'Le principe qui commande tout : <b>aucun rejet volontaire dans l\'atmosphère</b>. Ce n\'est pas une recommandation de bonne pratique, c\'est une interdiction. Toute opération qui ouvre un circuit commence donc par la récupération.',
      'La <b>récupération</b> se fait avec une station dédiée, vers une bouteille prévue pour cela. Trois exigences en découlent. La bouteille doit être <b>adaptée au fluide</b> — on ne récupère pas dans n\'importe quel contenant. Elle doit être <b>identifiée</b> : un fluide récupéré dans une bouteille mal étiquetée devient un mélange inconnu, donc un déchet, alors qu\'il aurait pu être régénéré. Et elle ne doit jamais être <b>remplie au-delà du taux admissible</b> selon les prescriptions applicables, car un liquide qui se dilate dans un volume plein fait éclater le contenant.',
      'C\'est pourquoi l\'on pèse. La <b>balance</b> est l\'instrument de la récupération comme elle est celui de la charge : elle dit ce qui est sorti, ce qui reste, et ce que l\'on inscrira au registre.',
      'Vient ensuite le devenir du fluide, et il faut employer les bons mots. Un fluide <b>recyclé</b> a subi un nettoyage de base et peut être remis sur la même installation ou le même parc. Un fluide <b>régénéré</b> a été retraité pour retrouver des caractéristiques équivalentes au neuf, dans une installation prévue à cet effet. Un fluide <b>destiné au traitement</b> est un déchet : il part en destruction.',
      'Un fluide dont on ne connaît pas la composition — mélange de récupérations successives, contamination — ne peut pas être remis en service. Le doute impose le traitement.',
      'Les <b>huiles</b> suivent le même raisonnement. Une huile qui a circulé avec un fluide fluoré est une huile contaminée : elle relève des déchets dangereux, avec contenant dédié, étiquetage et bordereau. On ne la verse pas au bidon d\'huile de vidange.',
      'Le <b>stockage</b> obéit à des règles simples et strictes : bouteilles arrimées et debout, local ventilé, à l\'abri des sources de chaleur et du rayonnement solaire, séparation des pleines et des vides, robinets protégés par leur chapeau.',
      'Le <b>transport</b>, enfin, relève de la réglementation des marchandises dangereuses. Les bouteilles voyagent arrimées, dans un véhicule ventilé, avec les documents exigés. Une bouteille qui roule libre dans un fourgon est un projectile, et son robinet la première chose qui cède.',
    ],
    blocs: [
      { type: 'cle', t: 'Les mots à ne pas confondre',
        html: '<p><ol><li><b>Recyclé</b> — nettoyage de base, réemploi sur le même parc.</li><li><b>Régénéré</b> — retraité en installation dédiée, caractéristiques équivalentes au neuf.</li><li><b>Traitement</b> — le fluide est un déchet, il part en destruction.</li><li><b>Contaminé ou de composition inconnue</b> — jamais remis en service : traitement.</li></ol></p>' },
      { type: 'piege', t: 'La bouteille « qui traîne » dans le camion',
        html: '<p>Une bouteille non identifiée, remplie de récupérations successives, est le pire scénario : son contenu n\'est plus un fluide mais un mélange inconnu, invendable, non régénérable, et coûteux à détruire. Une bouteille de récupération se dédie à un fluide, s\'étiquette dès la première utilisation et se pèse à chaque opération.</p>' },
    ],
  },
  {
    t: 'Le cas des hydrocarbures : ce que le code 5.09 ajoute',
    ecrit: true,
    codes: ['5.09', '12.01', '11.05'],
    visuels: ['svg:r290-zone-intervention', 'leg:dechets-sept-flux/dechets-dangereux-a-part'],
    legendes: ['La zone d intervention sur une machine au R-290', 'Les dechets dangereux se separent'],
    paras: [
      'Le code 5.09 est nouveau en 2025. Il reprend les mêmes verbes que le 5.08 — gestion, remplissage, récupération, stockage, transport — mais pour les <b>hydrocarbures</b> et leurs huiles, et il y ajoute l\'installation des équipements qui en dépendent.',
      'Tout ce qui vaut pour les fluorés continue de valoir. Ce qui change, c\'est qu\'une atmosphère explosive peut se former, et cela reconfigure chaque geste.',
      'Le <b>remplissage</b> et la récupération se conduisent avec un matériel adapté à ces fluides : station qualifiée, flexibles compatibles, absence de source d\'ignition dans le périmètre. Un matériel prévu pour les fluorés n\'est pas transposable par principe.',
      'La <b>zone d\'intervention</b> se délimite avant de commencer. On écarte les sources d\'ignition — flammes, meuleuses, appareils électriques non adaptés, téléphones —, on ventile, et l\'on s\'assure qu\'aucun point bas ne peut piéger le gaz, car les hydrocarbures usuels sont plus lourds que l\'air.',
      'Le <b>stockage</b> ajoute ses propres exigences : local ventilé, absence de source d\'ignition, séparation d\'avec les comburants, signalisation. Les quantités stockées sont surveillées, car elles conditionnent le classement du local.',
      'L\'<b>étiquetage</b> (code 12.01) devient une information de sécurité à part entière. La machine porte les marquages qui préviennent de la présence d\'un fluide inflammable ; les bouteilles portent les leurs, et leur raccordement obéit à des prescriptions spéciales — le filetage à gauche des gaz inflammables n\'est pas une curiosité, c\'est un détrompeur.',
      'Les <b>huiles</b> ayant circulé avec un hydrocarbure retiennent du fluide dissous. Une huile de vidange ouverte à l\'air peut dégazer : elle se manipule comme un produit inflammable, dans un contenant fermé, et elle part en déchet dangereux.',
      'La règle qui tient tout ensemble, et qu\'il faut savoir énoncer : <b>le livre explique et prépare, l\'atelier démontre et évalue le geste</b>. Aucune de ces procédures ne s\'apprend en lisant. Ce que vous devez savoir ici, c\'est ce qui les commande, pourquoi elles diffèrent, et à quel moment il faut s\'arrêter pour demander.',
    ],
    blocs: [
      { type: 'cle', t: 'Ce qui change avec un hydrocarbure',
        html: '<p><ol><li><b>Matériel</b> — station, flexibles et détecteurs adaptés aux inflammables.</li><li><b>Zone</b> — délimitée, ventilée, sans source d\'ignition, points bas surveillés.</li><li><b>Stockage</b> — local ventilé, séparation, signalisation, quantités suivies.</li><li><b>Étiquetage</b> — marquage de la machine, raccords détrompés des bouteilles.</li><li><b>Huiles</b> — dégazage possible : contenant fermé, déchet dangereux.</li></ol></p>' },
      { type: 'piege', t: 'Utiliser sa station habituelle « juste pour cette fois »',
        html: '<p>Une station de récupération non qualifiée pour les fluides inflammables contient des composants électriques qui peuvent devenir des sources d\'ignition, et son circuit interne n\'est pas prévu pour ces fluides. Le raccordement se fera sans obstacle et l\'opération semblera se dérouler normalement. C\'est précisément ce qui rend ce raccourci dangereux.</p>' },
    ],
  },
];

/* ------------------------------------------------------------------
   LA RECHERCHE DE FUITE — codes 4.01, 4.02, 4.09 et 3.05.
   Quatre des six codes les moins dotés du livre après la première passe
   de refonte. Ils forment pourtant un ensemble cohérent : consulter,
   chercher, vérifier, consigner. C'est le cycle complet d'un contrôle
   d'étanchéité, et l'épreuve l'attend dans cet ordre.
   ------------------------------------------------------------------ */
export const LECONS_ETANCHEITE = [
  {
    t: 'Méthode indirecte, méthode directe : deux outils, deux moments',
    ecrit: true,
    codes: ['4.01', '4.02'],
    visuels: ['svg:points-de-fuite', 'svg:balayage-detecteur'],
    legendes: ['Les points de fuite les plus frequents', 'Le balayage, lentement et au bon endroit'],
    paras: [
      'Chercher une fuite ne commence pas avec un détecteur à la main. Cela commence par le registre, puis par une méthode qui a un nom, un ordre et des limites.',
      'La <b>méthode indirecte</b> consiste à déduire l\'existence d\'une fuite sans la localiser. On observe les paramètres de fonctionnement : pressions, températures, sous-refroidissement, niveau au voyant, courant absorbé, déclenchements de sécurités. On compare aux valeurs attendues et à l\'historique.',
      'Son intérêt est qu\'elle s\'applique sans ouvrir ni approcher : elle dit « cette installation a perdu du fluide » avant que l\'on sache où. Sa limite est symétrique : elle ne localise rien, et plusieurs causes autres qu\'une fuite produisent les mêmes écarts.',
      'La <b>méthode directe</b> localise. Détecteur électronique adapté au fluide, solution moussante, traceur fluorescent selon le cas. C\'est elle qui désigne le point à réparer.',
      'L\'ordre logique est donc : le registre, puis l\'indirect qui oriente, puis le direct qui localise. Commencer par balayer une installation entière au détecteur sans avoir rien lu ni rien déduit revient à chercher une aiguille sans savoir dans quelle botte.',
      'Le <b>choix de l\'instrument</b> n\'est pas indifférent. Un détecteur répond aux gaz pour lesquels il est conçu : un appareil à fluides fluorés ne verra pas un hydrocarbure, et un détecteur d\'oxygène surveille l\'asphyxie, pas la fuite. L\'appareil doit en outre être <b>vérifié avant emploi</b> — sur une source connue —, faute de quoi un résultat négatif ne prouve rien du tout.',
      'Le <b>geste</b> compte autant que l\'appareil. On balaye lentement, sonde proche de la surface, en suivant les points de fuite probables : raccords mécaniques, brasures, presse-étoupe, prises de pression, vannes de service, points soumis aux vibrations et à la corrosion. On progresse du bas vers le haut pour les fluides plus lourds que l\'air, et l\'on se méfie des courants d\'air qui dispersent le gaz.',
      'Une dernière exigence, souvent négligée et pourtant décisive : le <b>contrôle après réparation</b>. Une fuite réparée n\'est pas une fuite prouvée arrêtée. Le contrôle qui suit la réparation fait partie de l\'obligation, et son absence est ce qu\'un contrôleur relèvera en premier.',
    ],
    blocs: [
      { type: 'cle', t: 'L\'ordre qui ne change pas',
        html: '<p><ol><li><b>Le registre</b> — problèmes récurrents, parties déjà problématiques, quantités déjà ajoutées.</li><li><b>L\'indirect</b> — les paramètres de fonctionnement disent s\'il manque du fluide.</li><li><b>Le direct</b> — le détecteur adapté, vérifié, localise le point.</li><li><b>La réparation</b>, puis <b>le contrôle qui la vérifie</b>.</li><li><b>Le registre</b>, de nouveau : méthode, instrument, résultat, quantités.</li></ol></p>' },
      { type: 'piege', t: 'Le détecteur qui ne dit rien',
        html: '<p>Un détecteur non vérifié, mal réglé en sensibilité, ou passé trop vite ne trouve rien — et l\'on conclut qu\'il n\'y a pas de fuite. C\'est une conclusion tirée d\'une absence de preuve, pas d\'une preuve d\'absence. Si l\'indirect dit qu\'il manque du fluide et que le direct ne trouve rien, c\'est le direct qu\'il faut refaire, pas la conclusion qu\'il faut inverser.</p>' },
    ],
  },
  {
    t: 'Ce que le registre doit contenir, et ce qu\'un contrôleur y cherche',
    ecrit: true,
    codes: ['4.09', '3.05', '4.02'],
    visuels: ['leg:dechets-responsabilites/registre-producteur', 'svg:recuperation'],
    legendes: ['Ce que la trace ecrite doit porter', 'La quantite qui sort se pese'],
    paras: [
      'Trois codes du référentiel demandent de consigner : après un contrôle d\'étanchéité, après un essai de mise en service, après un mouvement de fluide. Ils n\'attendent pas la même chose, mais ils partagent une exigence : que l\'écrit permette de <b>refaire le raisonnement</b> sans avoir été là.',
      'Un enregistrement complet porte huit éléments. La <b>date</b>. L\'<b>intervenant</b> et son entreprise. L\'<b>identification de l\'équipement</b> — sans elle, tout le reste flotte. La <b>nature de l\'opération</b>. La <b>méthode</b> et l\'<b>instrument</b> employés. Le <b>résultat</b>. Les <b>quantités</b>, pesées, ajoutées ou récupérées, avec la nature du fluide. Et la <b>suite donnée</b> : réparation, contrôle de vérification, ou prochaine échéance.',
      'Arrêtons-nous sur deux d\'entre eux, parce que ce sont ceux qui manquent le plus souvent.',
      'La <b>méthode et l\'instrument</b>. « Étanchéité contrôlée : conforme » ne dit ni comment, ni avec quoi, ni à quelle sensibilité. Un autre technicien ne peut pas savoir si le contrôle valait quelque chose. Écrire « contrôle direct au détecteur électronique, vérifié sur source de référence avant emploi » prend dix secondes et rend l\'enregistrement opposable.',
      'Les <b>quantités</b>. On écrit ce que la balance a mesuré, pas ce que l\'on estime avoir mis. Une charge appréciée au manomètre n\'est pas une donnée de registre, et une ligne « appoint de fluide » sans quantité ni nature ne prouve rien — elle laisse même penser que l\'on a rechargé une installation qui fuit sans chercher d\'où.',
      'Ce qu\'un contrôleur regarde, ensuite, tient en trois questions. La <b>continuité</b> : y a-t-il des trous dans l\'historique, des interventions sans trace ? La <b>cohérence</b> : les quantités ajoutées correspondent-elles aux fuites déclarées et réparées ? Et la <b>boucle fermée</b> : chaque fuite trouvée a-t-elle sa réparation, et chaque réparation son contrôle de vérification ?',
      'C\'est cette troisième question qui piège le plus. Un registre peut être parfaitement tenu et rester incomplet parce que les vérifications après réparation n\'y figurent pas. La fuite est alors documentée, la réparation aussi, et rien ne prouve que l\'installation est étanche.',
      'Un mot enfin sur ce que le registre vous apporte à vous. Le jour où l\'on vous demandera ce que vous avez fait sur cette machine il y a dix-huit mois, votre mémoire ne vaudra rien et votre écriture vaudra tout. Le registre n\'est pas une contrainte administrative : c\'est la seule pièce qui vous protège.',
    ],
    blocs: [
      { type: 'cle', t: 'Les huit éléments d\'un enregistrement complet',
        html: '<p><ol><li>Date.</li><li>Intervenant et entreprise.</li><li>Identification de l\'équipement.</li><li>Nature de l\'opération.</li><li>Méthode et instrument.</li><li>Résultat.</li><li>Quantités pesées et nature du fluide.</li><li>Suite donnée : réparation, contrôle de vérification, prochaine échéance.</li></ol></p>' },
      { type: 'piege', t: 'Le registre parfait mais sans boucle fermée',
        html: '<p>Fuite consignée, réparation consignée, et rien après. C\'est le défaut le plus fréquent et le plus facile à éviter : il manque la ligne qui dit que le contrôle postérieur a été fait et qu\'il était négatif. Sans elle, le dossier montre une fuite traitée, pas une installation étanche.</p>' },
    ],
  },
];

/* ------------------------------------------------------------------
   LA POLITIQUE INTERNATIONALE — code 2.01.
   CCNUCC, Montréal, Kyoto, Paris, Kigali. Le livre les traitait en
   quelques lignes chacun, sans dire ce qui les distingue ni pourquoi
   deux traités coexistent sur des sujets voisins.
   ------------------------------------------------------------------ */
export const LECONS_TRAITES = [
  {
    t: 'Deux traités, deux problèmes : pourquoi Montréal et la CCNUCC coexistent',
    ecrit: true,
    codes: ['2.01'],
    visuels: ['leg:impact-montreal-kigali/frise-trois-temps', 'leg:impact-montreal-kigali/montreal-1987'],
    legendes: ['Trois temps, trois reponses', 'Ce que Montreal a organise'],
    paras: [
      'Deux constructions juridiques internationales encadrent votre métier, et l\'on croit souvent qu\'il n\'y en a qu\'une. Elles ne traitent pas du même problème et n\'ont pas eu le même succès.',
      'La première est le <b>protocole de Montréal</b>, signé en 1987. Son objet est la <b>couche d\'ozone</b>. Il organise l\'élimination progressive des substances qui l\'appauvrissent : d\'abord les CFC, puis les HCFC, avec des calendriers différenciés selon les pays.',
      'Montréal est considéré comme l\'accord environnemental international le plus efficace jamais conclu. Deux raisons à cela, et elles sont instructives. Le problème était clairement attribuable à quelques familles de molécules produites par un petit nombre d\'industriels. Et des substituts techniquement praticables existaient.',
      'La seconde construction est la <b>CCNUCC</b>, convention-cadre des Nations unies sur les changements climatiques, adoptée en 1992. Son objet est le <b>climat</b>. Une convention-cadre pose des principes ; ce sont les textes pris sous son autorité qui fixent les obligations.',
      'Le <b>protocole de Kyoto</b>, en 1997, en est le premier : il impose des objectifs chiffrés de réduction à un ensemble de pays industrialisés, et inscrit les HFC parmi les gaz visés. L\'<b>accord de Paris</b>, en 2015, change de logique : chaque État annonce sa contribution, avec un mécanisme de révision périodique.',
      'Reste à comprendre pourquoi les HFC ont fini par revenir dans le giron de Montréal alors qu\'ils relèvent du climat. C\'est l\'objet de l\'<b>amendement de Kigali</b>, adopté en 2016.',
      'La raison est pragmatique. Les HFC n\'existent massivement que parce que Montréal a fait sortir les CFC et les HCFC : ils sont le produit direct de son succès. Et Montréal disposait déjà de ce qui manquait ailleurs — un mécanisme de réduction par étapes, un secteur industriel identifié, une institution qui fonctionne. Kigali greffe donc la réduction des HFC sur un dispositif éprouvé, plutôt que d\'en créer un autre.',
      'C\'est ce que traduit la réglementation européenne que vous appliquez. Le règlement sur les gaz fluorés met en œuvre ces engagements par des quotas, des interdictions de mise sur le marché et des obligations de confinement. Quand vous consignez une charge au registre, vous êtes au bout de cette chaîne : une décision internationale devenue un geste de terrain.',
    ],
    blocs: [
      { type: 'cle', t: 'Les cinq textes, et ce que chacun fait',
        html: '<p><ol><li><b>Montréal (1987)</b> — couche d\'ozone : élimination des CFC puis des HCFC.</li><li><b>CCNUCC (1992)</b> — convention-cadre climat : pose les principes.</li><li><b>Kyoto (1997)</b> — objectifs chiffrés pour les pays industrialisés ; les HFC y figurent.</li><li><b>Paris (2015)</b> — contributions nationales, révisées périodiquement.</li><li><b>Kigali (2016)</b> — amendement à Montréal : réduction des HFC, greffée sur le dispositif qui marche.</li></ol></p>' },
      { type: 'piege', t: 'Confondre l\'ozone et le climat dans les traités',
        html: '<p>Montréal traite l\'ozone, la CCNUCC traite le climat. Kigali est l\'exception qui déroute : c\'est un amendement à Montréal — traité de l\'ozone — dont l\'objet est climatique. Ce n\'est pas une incohérence, c\'est un choix d\'efficacité : on a utilisé l\'outil qui fonctionnait plutôt que d\'en construire un nouveau.</p>' },
    ],
  },
];
