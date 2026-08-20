/* =====================================================================
   cours.js — LE CONTENU DE LA LIGNE CO₂ / R744
   ---------------------------------------------------------------------
   Source : parcours « CO₂ / R744 » composé par F. Henninot sur Claude
   Design (9 étapes, 35 à 45 minutes d'un seul tenant). Ici il est
   redécoupé en HUIT CHAPITRES qui s'ouvrent chacun seul — une escale de
   moins de dix minutes se termine, un module de quarante s'abandonne en
   route. Chaque chapitre porte ses écrans, ses questions et son bilan.

   ADOSSEMENT. Les codes cités sont ceux de l'annexe II de l'arrêté du
   21 novembre 2025, transcrite dans packs/fluides/referentiel-2025.json.
   Le R-744 relève de la CATÉGORIE B et du groupe G13, pas de la
   catégorie D qui ne couvre que la récupération des gaz fluorés.

   RÈGLE DE RÉDACTION DES QUESTIONS. La bonne réponse ne doit se deviner
   ni à sa place ni à sa longueur : les positions sont réparties et la
   plus longue proposition n'est pas systématiquement la bonne.
   Contrôle : node outils/controle-quiz.mjs
   ===================================================================== */

window.__INERWEB_COURSE__ = {
  product: "inerWeb Édu — CO₂ / R744",
  version: "1.0.0-brouillon",
  status: "Relecture métier à faire",
  soustitre: "BAC PRO MFER · TP BE CVC · formation continue",
  /* DEUX GROUPES D'ESCALES. Le fluide et ses lois d'un côté, les machines qui
     l'emploient de l'autre — décision de F. Henninot le 20/08 : « il y a trop
     de choses pour le CO₂, on va faire une branche centrale ». C'est le motif
     de la famille KV, éclatée en branche le même jour. Un seul fichier :
     `branche` ne fait que grouper, il ne duplique rien. */
  branches: {
    fluide: { nom: "Le fluide", sous: "ce que le R744 impose" },
    centrales: { nom: "Les centrales", sous: "les machines qui l’emploient" }
  },
  chapitres: [

/* ------------------------------------------------------------------ 1 */
{
  id: "pourquoi",
  branche: "fluide",
  court: "Pourquoi le CO₂",
  titre: "Pourquoi le CO₂ revient dans nos installations",
  minutes: 6,
  resume: "La réglementation, la sécurité, et le prix à payer.",
  lessons: [
    {
      id: "reglement",
      short: "Réglementation",
      kicker: "Ce qui pousse le changement",
      title: "Les fluides à PRP élevé deviennent rares et chers",
      lead: "Le R744 n'est pas un fluide nouveau : il servait déjà à la fin du XIXᵉ siècle, il a été abandonné vers 1950, et c'est la réglementation qui le remet en service.",
      bullets: [
        "Le règlement (UE) 2024/573 accélère la réduction progressive des HFC mis sur le marché.",
        "Un R404A à 3 922 de PRP ou un R410A à 2 088 se raréfient et coûtent de plus en plus cher.",
        "Le R744 a un PRP de 1 et un ODP de 0 : il n'entre dans aucun quota."
      ],
      callout: { type: "key", title: "Le PRP de référence", text: "Le PRP du CO₂ vaut 1 parce que c'est LUI la référence : tous les autres PRP se comptent en multiples de son effet." },
      visual: { type: "comparatif", titre: "Ce que pèsent quelques fluides",
        colonnes: ["Fluide", "PRP", "Classe"],
        lignes: [["R744", "1", "A1"], ["R290", "3", "A3"], ["R32", "675", "A2L"], ["R410A", "2 088", "A1"], ["R404A", "3 922", "A1"]],
        note: "Valeurs des tables réglementaires en vigueur ; à recouper avec l'étiquette de la machine." },
      caption: "Le R744 et quatre fluides courants : PRP et classe de sécurité."
    },
    {
      id: "securite",
      short: "Sécurité",
      kicker: "Ce que le R744 apporte",
      title: "Classé A1 : faible toxicité, non inflammable",
      lead: "Sur le plan de la classification NF EN 378, le CO₂ est dans la case la plus favorable. Cela ne veut pas dire qu'il est sans danger.",
      bullets: [
        "A1 : faible toxicité et pas de propagation de flamme.",
        "Pas de limite de charge liée à l'inflammabilité, contrairement au R290 qui est A3 — et non A2L.",
        "Les risques du R744 sont ailleurs : la pression, et l'asphyxie en local fermé."
      ],
      callout: { type: "warning", title: "Le piège du R290", text: "Le propane est A3, inflammable. Le confondre avec un A2L fait sous-estimer la charge admissible et le matériel exigé." },
      visual: { type: "pastilles", titre: "Lire une classe NF EN 378",
        items: [
          { ton: "ok", cle: "A1", texte: "faible toxicité, non inflammable — R744, R410A, R404A" },
          { ton: "attente", cle: "A2L", texte: "faible toxicité, faiblement inflammable — R32, R1234yf" },
          { ton: "danger", cle: "A3", texte: "faible toxicité, inflammable — R290, R600a" }
        ],
        note: "La lettre dit la toxicité, le chiffre dit l'inflammabilité." },
      caption: "Trois classes qu'on rencontre en atelier, et où se range le R744."
    },
    {
      id: "contrepartie",
      short: "Contrepartie",
      kicker: "Ce que le R744 coûte",
      title: "Des pressions que le matériel HFC ne supporte pas",
      lead: "Tout ce que le CO₂ fait gagner d'un côté se paie de l'autre : en pression, en matériel et en méthode.",
      bullets: [
        "Côté haute pression, on rencontre des pressions de service de l'ordre de 120 bar en transcritique.",
        "Au-dessus de 31 °C, la condensation classique n'existe plus : le condenseur ne condense plus.",
        "Manifold, flexibles, manomètres, raccords et détection sont spécifiques."
      ],
      callout: { type: "warning", title: "À vérifier sur la machine", text: "Les 120 bar sont un ordre de grandeur. La pression maximale admissible se lit sur la plaque de l'installation et dans la documentation du constructeur, jamais dans un cours." },
      visual: { type: "image", fichier: "co2-risques.svg",
        alt: "La carte du R-744 classé A1 — peu toxique, ne brûle pas — et trois flèches vers les risques que cette classe ne couvre pas : la pression, sans commune mesure avec les autres fluides ; le froid, avec la neige carbonique vers −78,5 °C ; et l'effet physiologique en local fermé." },
      caption: "La classe A1 ne parle que du poison et du feu. Les trois risques du R744 sont ailleurs : la pression, le froid, et l'air qu'il prend."
    },
    {
      id: "fil",
      short: "Le fil",
      kicker: "Le fil conducteur de la ligne",
      title: "Une seule idée commande tout le reste",
      lead: "Le point critique du CO₂ est très bas. Refroidisseur de gaz, détendeur haute pression, bouteille flash, réglage de la HP : tout cela n'est qu'une conséquence de ce seul fait.",
      bullets: [
        "Chapitre 2 et 3 : les points remarquables du fluide, et ce que le point critique interdit.",
        "Chapitre 4 à 6 : les deux régimes de fonctionnement, et la haute pression qui devient un réglage.",
        "Chapitre 7 et 8 : la centrale du supermarché, puis l'intervention en sécurité."
      ],
      callout: { type: "note", title: "Comment travailler cette ligne", text: "Chaque escale se suffit à elle-même et dure moins de dix minutes. Vous pouvez en faire une entre deux séances, dans l'ordre ou non." },
      visual: { type: "chaine", titre: "De la cause aux conséquences",
        etapes: ["Point critique bas", "Plus de condensation l'été", "Refroidisseur de gaz", "La HP se règle", "Bouteille flash et booster"] },
      caption: "L'enchaînement des causes, du fluide jusqu'à l'architecture de la centrale."
    }
  ],
  quiz: [
    {
      id: "p-q1",
      question: "À quelle classe de sécurité NF EN 378 appartient le R744 ?",
      choices: ["A2L", "A1", "A3", "B2L"],
      answer: 1,
      explanation: "Le R744 est A1 : faible toxicité, non inflammable. C'est le R290 qui est A3."
    },
    {
      id: "p-q2",
      question: "Pourquoi le R744 n'est-il soumis à aucun quota F-Gaz ?",
      choices: [
        "Parce que sa charge est toujours inférieure à trois kilogrammes",
        "Parce que ce n'est pas un gaz à effet de serre fluoré",
        "Parce qu'il est classé A1 et donc dispensé de suivi réglementaire"
      ],
      answer: 1,
      explanation: "Les quotas portent sur les gaz fluorés. Le dioxyde de carbone n'en est pas un. Sa classe A1 et sa charge n'ont rien à voir avec cette question."
    }
  ],
  final: {
    id: "p-bilan",
    short: "Bilan",
    kicker: "Escale terminée",
    title: "Vous savez pourquoi le CO₂ revient, et ce qu'il impose",
    lead: "Un fluide sans quota et non inflammable, mais qui travaille à des pressions bien plus hautes et qui perd la condensation dès qu'il fait chaud.",
    bullets: [
      "PRP 1, ODP 0, classe A1, hors quota.",
      "Pressions de l'ordre de 120 bar en haute pression, matériel spécifique.",
      "Référentiel travaillé : 11.01 et 11.04 — connaître les technologies de remplacement et peser leurs avantages. En appui : 1.00 et 2.02."
    ],
    callout: { type: "key", title: "Escale suivante", text: "La carte d'identité du R744 : les trois points remarquables qu'on retrouve sur tous les chantiers." },
    visual: { type: "chaine", titre: "Ce qui est acquis",
      etapes: ["Hors quota", "Non inflammable", "Haute pression", "Plus de condensation l'été"] },
    caption: "Bilan de l'escale « Pourquoi le CO₂ »."
  }
},

/* ------------------------------------------------------------------ 2 */
{
  id: "identite",
  branche: "fluide",
  court: "Carte d'identité",
  titre: "La carte d'identité du R744",
  minutes: 7,
  resume: "Trois points remarquables à connaître par cœur.",
  lessons: [
    {
      id: "fiche",
      short: "La fiche",
      kicker: "Ce qui est à mémoriser",
      title: "Les valeurs qu'on retrouve sur tous les chantiers",
      lead: "Trois points remarquables suffisent à expliquer presque tout le comportement du CO₂ : le point critique, le point triple, et la sublimation à la pression atmosphérique.",
      bullets: [
        "Point critique : 31,0 °C et 73,8 bar.",
        "Point triple : −56,6 °C et 5,18 bar.",
        "Sublimation à 1,013 bar : −78,5 °C, c'est la neige carbonique."
      ],
      callout: { type: "key", title: "À retenir absolument", text: "Un ambiant d'été à 32 °C est déjà au-dessus du point critique. En France, une installation R744 travaille donc en transcritique une bonne partie de l'année." },
      visual: { type: "tableau", titre: "R744 — dioxyde de carbone, CO₂",
        lignes: [
          ["Classe de sécurité", "A1 — faible toxicité, non inflammable (NF EN 378)"],
          ["PRP / ODP", "1 / 0 — c'est la référence du PRP"],
          ["Point critique", "31,0 °C — 73,8 bar"],
          ["Point triple", "−56,6 °C — 5,18 bar"],
          ["Sublimation à 1,013 bar", "−78,5 °C — neige carbonique"],
          ["Pression à l'arrêt (20 °C)", "≈ 57 bar"],
          ["Puissance frigorifique volumétrique", "très élevée → petits diamètres"]
        ] },
      caption: "Carte d'identité du R744, valeurs de référence du fluide."
    },
    {
      id: "diagramme-etat",
      short: "Trois points",
      kicker: "Sur le diagramme d'état",
      title: "Où se placent ces trois points l'un par rapport à l'autre",
      lead: "La courbe de saturation du CO₂ commence au point triple et s'arrête net au point critique. En dessous du point triple, il n'y a plus de liquide du tout.",
      bullets: [
        "Entre −56,6 °C et 31,0 °C : liquide et vapeur coexistent, la relation pression-température fonctionne.",
        "Au-dessus de 31,0 °C : la courbe s'arrête, il n'y a plus de couple pression-température.",
        "Sous 5,18 bar : le liquide n'existe pas, le solide passe directement en vapeur."
      ],
      callout: { type: "note", title: "Comparez avec ce que vous connaissez", text: "Un R404A a son point critique à 72 °C environ : on ne le rencontre jamais en service. Celui du CO₂ est à 31 °C, donc on le franchit tous les étés." },
      visual: { type: "svg", nom: "etat-pt" },
      caption: "Diagramme pression-température du CO₂ : point triple, courbe de saturation, point critique."
    },
    {
      id: "arret",
      short: "À l'arrêt",
      kicker: "Machine éteinte",
      title: "Une installation à l'arrêt reste à 57 bar environ",
      lead: "Quand la machine s'arrête, la température du fluide rejoint celle du local et la pression suit la courbe de saturation. À 20 °C, cela fait environ 57 bar dans tout le circuit.",
      bullets: [
        "Une installation éteinte n'est pas une installation détendue.",
        "Beaucoup de centrales portent un groupe de maintien qui empêche la pression de monter jusqu'au tarage des soupapes.",
        "Après une longue coupure de courant, la soupape peut lâcher du fluide : le local doit rester ventilé et surveillé."
      ],
      callout: { type: "warning", title: "Avant d'ouvrir quoi que ce soit", text: "Sur une machine à l'arrêt, la pression n'est pas tombée. La procédure de dépressurisation du constructeur s'applique intégralement." },
      visual: { type: "cartes", titre: "Trois états, trois pressions",
        items: [
          { ton: "info", titre: "En marche, hiver", texte: "Subcritique : la HP correspond à une vraie température de condensation." },
          { ton: "attente", titre: "En marche, été", texte: "Transcritique : la HP est un réglage, jusqu'à 120 bar environ." },
          { ton: "danger", titre: "À l'arrêt, 20 °C", texte: "≈ 57 bar dans tout le circuit, sans que rien ne tourne." }
        ] },
      caption: "La pression du circuit dans les trois situations rencontrées."
    },
    {
      id: "volumetrique",
      short: "Petits tubes",
      kicker: "Une conséquence visible",
      title: "Beaucoup de froid dans peu de volume",
      lead: "À froid produit égal, le CO₂ occupe bien moins de volume que les HFC. C'est ce qui explique l'allure d'une installation R744 quand on la découvre.",
      bullets: [
        "Compresseurs plus petits et tuyauteries de faible diamètre à puissance égale.",
        "Des épaisseurs de paroi plus fortes, pour tenir la pression.",
        "Un litre de fluide en fuite représente donc davantage de froid perdu qu'avec un HFC."
      ],
      callout: { type: "note", title: "Ce que ça change à l'œil", text: "Une centrale CO₂ ne ressemble pas à une centrale HFC de même puissance : les tubes sont plus fins et les raccords plus massifs." },
      visual: { type: "cartes", titre: "Petit volume, forte pression",
        items: [
          { ton: "info", titre: "Diamètres", texte: "Plus faibles à puissance égale." },
          { ton: "info", titre: "Épaisseurs", texte: "Plus fortes, matériaux et raccords qualifiés pour la pression." },
          { ton: "attente", titre: "Conséquence", texte: "On ne remplace jamais un composant par un équivalent HFC." }
        ] },
      caption: "Ce que la forte puissance volumétrique change sur l'installation."
    }
  ],
  quiz: [
    {
      id: "i-q1",
      question: "Quel couple correspond au point critique du CO₂ ?",
      choices: ["−56,6 °C et 5,18 bar", "31,0 °C et 73,8 bar", "20 °C et 57 bar", "−78,5 °C et 1,013 bar"],
      answer: 1,
      explanation: "31,0 °C et 73,8 bar. Le premier couple est le point triple, le troisième la pression à l'arrêt à 20 °C, le quatrième la sublimation à la pression atmosphérique."
    },
    {
      id: "i-q2",
      question: "Une centrale R744 est à l'arrêt depuis la veille, le local est à 20 °C. Quelle pression trouve-t-on dans le circuit ?",
      choices: ["Environ 57 bar", "La pression atmosphérique", "Environ 5 bar", "Environ 120 bar"],
      answer: 0,
      explanation: "À l'arrêt, le fluide se met à la température du local et la pression suit la courbe de saturation : environ 57 bar à 20 °C. Une machine éteinte reste sous pression."
    },
    {
      id: "i-q3",
      question: "Que signifie « il n'existe plus de liquide sous 5,18 bar » ?",
      choices: [
        "Que le fluide reste liquide mais devient plus froid qu'ailleurs dans le circuit",
        "Que la pression ne peut jamais descendre sous cette valeur dans une installation",
        "Que sous cette pression, le CO₂ passe directement du solide à la vapeur"
      ],
      answer: 2,
      explanation: "C'est le point triple. Sous 5,18 bar, la phase liquide n'existe pas : le solide se sublime. La pression, elle, peut très bien descendre plus bas — c'est justement le problème."
    }
  ],
  final: {
    id: "i-bilan",
    short: "Bilan",
    kicker: "Escale terminée",
    title: "Vous connaissez les trois points remarquables du R744",
    lead: "Ces trois valeurs suffisent à prévoir le comportement du fluide dans presque toutes les situations de chantier.",
    bullets: [
      "31,0 °C et 73,8 bar : au-dessus, plus de changement d'état.",
      "−56,6 °C et 5,18 bar : en dessous, plus de liquide.",
      "≈ 57 bar à 20 °C : une machine à l'arrêt reste sous pression.",
      "Référentiel travaillé : 13.15 — l'importance de la haute pression au point triple. En appui : 1.02 et 1.03."
    ],
    callout: { type: "key", title: "Escale suivante", text: "Le point critique sur le diagramme log p/h, et ce qu'il fait disparaître." },
    visual: { type: "svg", nom: "etat-pt" },
    caption: "Bilan de l'escale « Carte d'identité »."
  }
},

/* ------------------------------------------------------------------ 3 */
{
  id: "point-critique",
  branche: "fluide",
  court: "Le point critique",
  titre: "Le point critique : la notion qui commande tout",
  minutes: 7,
  resume: "Ce que le sommet de la cloche fait disparaître.",
  lessons: [
    {
      id: "cloche",
      short: "La cloche",
      kicker: "Sur le diagramme log p/h",
      title: "Le sommet de la cloche est très bas",
      lead: "Sur un diagramme pression-enthalpie, la cloche délimite la zone où liquide et vapeur coexistent. Son sommet est le point critique. Pour le CO₂, ce sommet est à 73,8 bar seulement.",
      bullets: [
        "À gauche de la cloche : liquide. À droite : vapeur. Dessous : le mélange des deux.",
        "Le palier de changement d'état est horizontal tant qu'on reste sous le sommet.",
        "Au-dessus du sommet, la cloche n'existe plus : le fluide ne change plus d'état."
      ],
      callout: { type: "note", title: "Un diagramme pédagogique", text: "Le tracé montré ici sert à comprendre la forme. Pour relever des valeurs, utilisez un diagramme R744 officiel ou un logiciel de propriétés du fluide." },
      visual: { type: "svg", nom: "cloche" },
      caption: "Diagramme log p/h du CO₂ : la cloche, son sommet à 31,0 °C et 73,8 bar, et la zone transcritique au-dessus."
    },
    {
      id: "ce-qui-disparait",
      short: "Ce qui disparaît",
      kicker: "Au-dessus du point critique",
      title: "Quatre repères de métier cessent d'exister",
      lead: "Ce ne sont pas des détails de théorie : ce sont exactement les repères sur lesquels vous travaillez tous les jours sur une machine HFC.",
      bullets: [
        "Plus de palier de changement d'état : il n'y a plus de condensation.",
        "Plus de relation pression-température : lire la HP ne donne plus une température.",
        "Le condenseur devient un refroidisseur de gaz, appelé aussi gas cooler.",
        "Plus de sous-refroidissement à mesurer côté haute pression."
      ],
      callout: { type: "warning", title: "La réglette P/T devient inutile côté HP", text: "Au-dessus de 73,8 bar, aucune table de saturation ne donne de température correspondante. Chercher quand même une température de condensation conduit à un faux diagnostic." },
      visual: { type: "pastilles", titre: "Ce qui reste, ce qui tombe",
        items: [
          { ton: "ok", cle: "Reste", texte: "La surchauffe à l'évaporateur : la basse pression, elle, est toujours sous la cloche." },
          { ton: "danger", cle: "Tombe", texte: "Le sous-refroidissement côté HP, et la lecture d'une température par la pression." },
          { ton: "attente", cle: "Remplace", texte: "La température de sortie du refroidisseur de gaz devient le repère HP." }
        ] },
      caption: "Les repères de mesure qui survivent au passage en transcritique, et ceux qui disparaissent."
    },
    {
      id: "gas-cooler",
      short: "Gas cooler",
      kicker: "Le mot juste",
      title: "Un refroidisseur de gaz n'est pas un condenseur",
      lead: "Le composant ressemble à un condenseur et se pose au même endroit, mais il ne fait pas le même travail : il refroidit un fluide qui reste dans le même état.",
      bullets: [
        "Le fluide y perd de la chaleur sans jamais changer d'état.",
        "Sa température de sortie est le paramètre qu'on surveille, avec la haute pression.",
        "Plus l'air extérieur est frais, plus la sortie est froide, et meilleure est l'installation."
      ],
      callout: { type: "key", title: "Le même échangeur, deux métiers", text: "En hiver, l'échangeur condense vraiment : il redevient un condenseur. C'est le régime de fonctionnement qui décide du nom, pas la pièce elle-même." },
      visual: { type: "cartes", titre: "Condenseur ou refroidisseur de gaz",
        items: [
          { ton: "info", titre: "Sous 73,8 bar", texte: "Condensation réelle, palier horizontal, sous-refroidissement mesurable." },
          { ton: "attente", titre: "Au-dessus", texte: "Refroidissement seul, pas de palier, on relève la température de sortie." },
          { ton: "ok", titre: "Le repère", texte: "C'est la haute pression du moment qui dit dans quel cas on se trouve." }
        ] },
      caption: "Le même échangeur selon qu'on est au-dessus ou en dessous du point critique."
    },
    {
      id: "point-triple",
      short: "Point triple",
      kicker: "L'autre extrémité",
      title: "Sous 5,18 bar, il se forme de la neige carbonique",
      lead: "Le point triple est le piège symétrique du point critique. Il ne se rencontre pas en fonctionnement normal, mais pendant les interventions.",
      bullets: [
        "Sous 5,18 bar, le CO₂ liquide n'existe pas : il se forme du solide à −78,5 °C.",
        "Cette neige carbonique bouche le circuit, bloque une vanne et fausse l'opération en cours.",
        "Le risque apparaît au tirage au vide et lors d'une dépressurisation trop rapide."
      ],
      callout: { type: "warning", title: "Dépressuriser lentement", text: "Une ouverture brutale fait chuter la pression sous le point triple et fabrique de la glace carbonique dans la tuyauterie. La procédure du constructeur fixe le débit et les paliers." },
      visual: { type: "chaine", titre: "Comment on fabrique un bouchon de glace",
        etapes: ["Ouverture brutale", "Chute sous 5,18 bar", "Formation de solide à −78,5 °C", "Circuit bouché"] },
      caption: "L'enchaînement qui conduit au bouchon de neige carbonique."
    }
  ],
  quiz: [
    {
      id: "c-q1",
      question: "En fonctionnement transcritique, comment appelle-t-on l'échangeur haute pression ?",
      choices: ["Le refroidisseur de gaz", "Le condenseur, comme sur une machine au R404A", "L'économiseur", "Le désurchauffeur"],
      answer: 0,
      explanation: "Au-dessus du point critique il n'y a plus de condensation : le fluide se refroidit sans changer d'état. L'échangeur est un refroidisseur de gaz, ou gas cooler."
    },
    {
      id: "c-q2",
      question: "Vous lisez 95 bar à la haute pression d'une centrale R744 en été. Que vaut la température de condensation ?",
      choices: [
        "Environ 35 °C, en lisant la table de saturation du R744",
        "Il n'y en a pas : au-dessus de 73,8 bar, le fluide ne condense pas",
        "Environ 31 °C, la température du point critique"
      ],
      answer: 1,
      explanation: "Au-dessus du point critique, aucune température de condensation n'existe. On relève la température de sortie du refroidisseur de gaz, pas une température déduite de la pression."
    },
    {
      id: "c-q3",
      question: "Pourquoi dépressuriser lentement une installation R744 ?",
      choices: [
        "Pour éviter de descendre sous 5,18 bar et de former de la neige carbonique",
        "Pour laisser à l'huile le temps de revenir au carter du compresseur",
        "Pour que la haute pression et la basse pression s'équilibrent d'elles-mêmes"
      ],
      answer: 0,
      explanation: "Sous le point triple, le CO₂ passe à l'état solide : le bouchon de glace carbonique bloque le circuit. Les deux autres raisons ne sont pas celles du point triple."
    }
  ],
  final: {
    id: "c-bilan",
    short: "Bilan",
    kicker: "Escale terminée",
    title: "Vous savez lire la cloche du R744 et ses deux extrémités",
    lead: "Le point critique en haut fait disparaître la condensation, le point triple en bas fait apparaître le solide. Entre les deux, tout se passe comme vous en avez l'habitude.",
    bullets: [
      "Au-dessus de 73,8 bar : plus de palier, plus de relation pression-température, plus de sous-refroidissement.",
      "Sous 5,18 bar : plus de liquide, de la neige carbonique.",
      "Référentiel travaillé : 13.15 — haute pression au point triple et formation de glace carbonique. En appui : 1.02, 1.03 et 11.06."
    ],
    callout: { type: "key", title: "Escale suivante", text: "Le point triple : l’autre extrémité de la courbe, et ce qu’elle impose à la mise en service." },
    visual: { type: "svg", nom: "cloche" },
    caption: "Bilan de l'escale « Le point critique »."
  }
},

/* ------------------------------------------------------------------ 4 */
{
  id: "point-triple",
  branche: "fluide",
  court: "Le point triple",
  titre: "Le point triple, et la mise en service",
  minutes: 8,
  resume: "Pourquoi la charge commence toujours en phase gazeuse.",
  lessons: [
    {
      id: "trois-etats",
      short: "Trois états",
      kicker: "L'autre extrémité de la courbe",
      title: "Le seul point où solide, liquide et vapeur coexistent",
      lead: "Le point critique ferme la courbe de saturation par le haut. Le point triple la ferme par le bas : −56,6 °C et 5,18 bar. C'est le seul couple pression-température où les trois états du CO₂ existent en même temps.",
      bullets: [
        "Au-dessus de 5,18 bar : liquide et vapeur, la relation pression-température fonctionne normalement.",
        "En dessous : le liquide n'existe plus du tout. Il ne reste que du solide et de la vapeur.",
        "Le solide ne fond pas, il se sublime : il passe directement à l'état vapeur."
      ],
      callout: { type: "key", title: "Ce n'est pas une curiosité de laboratoire", text: "5,18 bar, c'est une pression qu'on traverse à chaque mise en service et à chaque récupération. C'est la limite basse de tout ce qu'on fait sur une installation R744." },
      visual: { type: "svg", nom: "etat-pt" },
      caption: "Le point triple ferme la courbe de saturation par le bas, comme le point critique la ferme par le haut."
    },
    {
      id: "neige",
      short: "Neige carbonique",
      kicker: "Ce qui se forme, et ce que ça bloque",
      title: "Sous 5,18 bar, le liquide se transforme en neige carbonique",
      lead: "Détendre du R744 liquide vers une pression inférieure au point triple ne donne pas de la vapeur : cela donne du solide à −78,5 °C, dans le tuyau où ça se produit.",
      bullets: [
        "Ce bouchon se forme là où la pression chute : flexible de charge, filtre, détendeur, siège de vanne.",
        "Il ne fond pas — il se sublime. Il faut réchauffer doucement et attendre.",
        "Une vanne prise dans la glace carbonique donne exactement la sensation d'une vanne grippée."
      ],
      callout: { type: "warning", title: "Ne jamais forcer", text: "Forcer sur un organe bloqué par de la glace carbonique casse l'organe, pas le bouchon. Et chauffer une partie de circuit encore sous pression ne s'improvise pas : c'est la procédure du constructeur qui dit comment." },
      visual: { type: "chaine", titre: "Comment naît un bouchon de glace",
        etapes: ["Liquide sous pression", "Détente sous 5,18 bar", "Solide à −78,5 °C", "Organe bouché"] },
      caption: "L'enchaînement qui conduit au bouchon de neige carbonique, à la charge comme à la récupération."
    },
    {
      id: "premiere-charge",
      short: "Première charge",
      kicker: "Le piège de la mise en service",
      title: "Un circuit qui vient d'être tiré au vide est très en dessous du point triple",
      lead: "Après le tirage au vide, il reste quelques millibars dans l'installation. Y envoyer directement du R744 liquide, c'est le détendre sous 5,18 bar : il se solidifie dans le tuyau de charge avant même d'entrer dans la machine.",
      bullets: [
        "La charge commence donc en phase GAZEUSE, et seulement en phase gazeuse.",
        "On monte la pression du circuit jusqu'à dépasser franchement le point triple.",
        "Une fois cette pression atteinte, on peut passer en phase liquide pour finir la charge.",
        "Le même raisonnement vaut après une intervention qui a vidé une partie du circuit."
      ],
      callout: { type: "key", title: "Le seuil, et la vraie valeur", text: "Le seuil physique est le point triple, 5,18 bar. En pratique on monte plus haut avant de basculer en liquide, avec une marge : c'est la procédure du constructeur qui donne la valeur à atteindre, pas un cours." },
      visual: { type: "chaine", titre: "L'ordre des opérations à la mise en service",
        etapes: ["Tirage au vide", "Charge en phase gazeuse", "Pression au-dessus du point triple", "Passage en phase liquide", "Charge terminée"] },
      caption: "L'ordre de la première charge : le gaz d'abord, le liquide seulement ensuite."
    },
    {
      id: "double-vanne",
      short: "Double vanne",
      kicker: "Sur la bouteille",
      title: "Deux prises, et une seule est bonne au démarrage",
      lead: "Une bouteille de R744 porte une prise en phase gazeuse et une prise en phase liquide. Se tromper de prise au moment de la première charge, c'est exactement envoyer du liquide dans un circuit vide.",
      bullets: [
        "Première charge : prise en phase gazeuse, bouteille debout.",
        "Fin de charge : prise en phase liquide, selon la procédure et le mode de pesée.",
        "Le marquage des prises et le sens de la bouteille se lisent avant de raccorder, pas après."
      ],
      callout: { type: "note", title: "Ce que dit le référentiel", text: "Les codes 13.03 et 13.11 portent exactement là-dessus : les exigences des cylindres et des doubles vannes, et la charge du système en R744 à l'état gazeux." },
      visual: { type: "image", fichier: "bouteille-deux-robinets.svg",
        alt: "Une bouteille en coupe, debout : la vapeur en haut, le liquide en bas. Le robinet vapeur prélève directement dans la partie haute ; le robinet liquide est relié à un tube plongeur qui descend jusqu'au fond. Une seule pression dans la bouteille, deux phases prélevées." },
      caption: "La bouteille en coupe : le robinet du haut prélève de la vapeur, celui relié au tube plongeur prélève du liquide. Une seule pression, deux phases."
    },
    {
      id: "autre-sens",
      short: "Dans l'autre sens",
      kicker: "À la récupération",
      title: "Le même piège quand la pression descend",
      lead: "Tout ce qui fait chuter la pression sous 5,18 bar alors qu'il reste du liquide dans le circuit fabrique du solide. La récupération et la dépressurisation sont donc les deux autres moments à risque.",
      bullets: [
        "On dépressurise lentement, par paliers, en suivant la procédure du site.",
        "Un circuit qui refuse de se vider alors qu'il le devrait est peut-être bouché par de la glace.",
        "Une purge à l'air libre expose en plus à la brûlure et charge le local en CO₂."
      ],
      callout: { type: "warning", title: "Trois moments, un seul seuil", text: "Première charge, dépressurisation, récupération : à chaque fois, la question est la même — la pression risque-t-elle de passer sous 5,18 bar avec du liquide encore présent ?" },
      visual: { type: "pastilles", titre: "Où le point triple se rappelle à vous",
        items: [
          { ton: "danger", cle: "Charge", texte: "Circuit sous vide : commencer en phase gazeuse." },
          { ton: "attente", cle: "Dépressurisation", texte: "Descendre lentement, par paliers." },
          { ton: "danger", cle: "Récupération", texte: "Surveiller la pression tant qu'il reste du liquide." }
        ] },
      caption: "Les trois moments d'une intervention où la pression peut passer sous le point triple."
    }
  ],
  quiz: [
    {
      id: "y-q1",
      question: "Pourquoi commence-t-on toujours la charge d'un circuit R744 en phase gazeuse ?",
      choices: [
        "Parce que le compresseur ne doit jamais recevoir de liquide au démarrage de l'installation",
        "Parce que le circuit vide est sous le point triple : le liquide s'y transformerait en neige carbonique",
        "Parce que la bouteille se viderait trop vite et fausserait la pesée de la charge"
      ],
      answer: 1,
      explanation: "Un circuit tiré au vide est à quelques millibars, très en dessous des 5,18 bar du point triple. Le liquide qu'on y enverrait se solidifierait dans le flexible et le premier organe rencontré."
    },
    {
      id: "y-q2",
      question: "Que trouve-t-on au point triple du CO₂ ?",
      choices: [
        "Les trois états ensemble : solide, liquide et vapeur",
        "Le passage du liquide à l'état supercritique",
        "La pression maximale admissible du circuit"
      ],
      answer: 0,
      explanation: "Solide, liquide et vapeur coexistent, à −56,6 °C et 5,18 bar. L'état supercritique, lui, commence au point CRITIQUE, à 31,0 °C et 73,8 bar."
    },
    {
      id: "y-q3",
      question: "Une vanne refuse de s'ouvrir après une dépressurisation rapide. Quelle est la bonne réaction ?",
      choices: [
        "Forcer progressivement sur la commande jusqu'à ce qu'elle cède",
        "Chauffer la vanne au chalumeau pour libérer le passage rapidement",
        "Suspecter un bouchon de glace carbonique et suivre la procédure de réchauffage"
      ],
      answer: 2,
      explanation: "La neige carbonique donne exactement la sensation d'une vanne grippée. Forcer casse l'organe ; chauffer une partie de circuit sous pression ne s'improvise pas."
    }
  ],
  final: {
    id: "y-bilan",
    short: "Bilan",
    kicker: "Escale terminée",
    title: "Vous savez pourquoi la première charge se fait en gaz",
    lead: "Le point triple n'est pas une valeur à réciter : c'est le seuil qui commande l'ordre des gestes à la mise en service et à la récupération.",
    bullets: [
      "5,18 bar et −56,6 °C : en dessous, le liquide n'existe pas, il se forme du solide à −78,5 °C.",
      "Circuit sous vide : charge en phase gazeuse d'abord, phase liquide seulement après.",
      "Dépressuriser lentement, et ne jamais forcer un organe bloqué.",
      "Référentiel travaillé : 13.15 — l'importance de la haute pression au point triple et la formation de glace carbonique. En appui : 13.03, 13.11 et 5.02."
    ],
    callout: { type: "key", title: "Escale suivante", text: "Le cycle subcritique : celui qui ressemble encore à ce que vous connaissez." },
    visual: { type: "chaine", titre: "L'ordre des opérations à la mise en service",
      etapes: ["Tirage au vide", "Charge en phase gazeuse", "Pression au-dessus du point triple", "Passage en phase liquide", "Charge terminée"] },
    caption: "Bilan de l'escale « Le point triple et la mise en service »."
  }
},

/* ------------------------------------------------------------------ 5 */
{
  id: "subcritique",
  branche: "fluide",
  court: "Cycle subcritique",
  titre: "Le cycle subcritique, quand il fait frais",
  minutes: 6,
  resume: "Le cycle qui ressemble encore à ce que vous connaissez.",
  lessons: [
    {
      id: "trace",
      short: "Le tracé",
      kicker: "Régime d'hiver et de mi-saison",
      title: "Tant qu'on reste sous le point critique, il y a une vraie condensation",
      lead: "Quand la haute pression reste sous 73,8 bar, le cycle du CO₂ se lit exactement comme celui d'un HFC : compression, condensation, détente, évaporation.",
      bullets: [
        "Le palier de condensation est horizontal : la température y reste constante.",
        "On mesure un vrai sous-refroidissement, en général de 4 à 8 K.",
        "On mesure une vraie surchauffe en sortie d'évaporateur, en général de 5 à 10 K."
      ],
      callout: { type: "note", title: "L'exemple tracé", text: "Évaporation à −10 °C et condensation à 25 °C, soit 64,3 bar à la haute pression. Ce sont des valeurs d'illustration : les vôtres viennent de la machine." },
      visual: { type: "svg", nom: "subcritique" },
      caption: "Cycle subcritique du R744 sur le diagramme log p/h, avec son palier de condensation."
    },
    {
      id: "familier",
      short: "Ce qui reste",
      kicker: "Vos réflexes fonctionnent",
      title: "Les mesures habituelles gardent leur sens",
      lead: "En régime subcritique, la réglette pression-température du R744 s'utilise des deux côtés, et les surchauffes et sous-refroidissements se calculent comme d'habitude.",
      bullets: [
        "Surchauffe = température mesurée en sortie d'évaporateur moins température de saturation lue à la BP.",
        "Sous-refroidissement = température de saturation lue à la HP moins température mesurée en sortie de condenseur.",
        "Un manque de charge, un encrassement ou un détendeur mal réglé se lisent de la même manière qu'en HFC."
      ],
      callout: { type: "key", title: "La réglette doit être celle du R744", text: "Chaque fluide a sa propre relation pression-température. Une réglette R404A appliquée au CO₂ donne des valeurs fausses." },
      visual: { type: "cartes", titre: "Les deux mesures de base",
        items: [
          { ton: "ok", titre: "Surchauffe", texte: "Côté basse pression, 5 à 10 K en usage courant." },
          { ton: "ok", titre: "Sous-refroidissement", texte: "Côté haute pression, 4 à 8 K en usage courant." },
          { ton: "info", titre: "Les plages", texte: "Ce sont des ordres de grandeur : le cahier des charges de la machine prime." }
        ] },
      caption: "Surchauffe et sous-refroidissement en régime subcritique."
    },
    {
      id: "change-deja",
      short: "Ce qui change",
      kicker: "Même en subcritique",
      title: "Les pressions sont cinq à six fois plus hautes",
      lead: "Le cycle a la même forme, mais il ne se déroule pas du tout aux mêmes pressions : c'est le premier écart avec les habitudes prises sur un R404A.",
      bullets: [
        "Pour les mêmes températures, les pressions du R744 valent cinq à six fois celles d'un R404A.",
        "La cloche est étroite : près du point critique, la chaleur latente du CO₂ devient faible.",
        "Une cloche étroite veut dire qu'une détente produit beaucoup de vapeur — on le paiera en transcritique."
      ],
      callout: { type: "warning", title: "Ne jamais transposer un réglage", text: "Une consigne de haute pression, un tarage de soupape ou une valeur de pressostat pris sur une machine HFC n'ont aucun sens sur une machine R744." },
      visual: { type: "comparatif", titre: "Pression de saturation, R744 et R404A",
        colonnes: ["Température", "R744", "R404A"],
        lignes: [["−10 °C", "≈ 26 bar", "≈ 4,4 bar"], ["0 °C", "≈ 34 bar", "≈ 6,4 bar"], ["25 °C", "≈ 64 bar", "≈ 11,6 bar"]],
        note: "Pressions absolues arrondies, données d'illustration. À recouper avec la réglette du fluide." },
      caption: "Le même écart de température, à des pressions sans commune mesure."
    }
  ],
  quiz: [
    {
      id: "s-q1",
      question: "En régime subcritique, que mesure-t-on en sortie de condenseur ?",
      choices: ["La surchauffe, comme en sortie d'évaporateur", "Un vrai sous-refroidissement", "Le titre de vapeur"],
      answer: 1,
      explanation: "Sous le point critique, la condensation est réelle : le sous-refroidissement existe et se mesure, en général 4 à 8 K."
    },
    {
      id: "s-q2",
      question: "Une machine R744 évapore à −10 °C. Quel ordre de grandeur pour la basse pression ?",
      choices: ["Environ 4 bar, comme un R404A à la même température", "Environ 26 bar", "Environ 60 bar"],
      answer: 1,
      explanation: "Environ 26 bar. Les 4 bar correspondraient à un R404A à la même température : les pressions du CO₂ sont cinq à six fois plus élevées."
    }
  ],
  final: {
    id: "s-bilan",
    short: "Bilan",
    kicker: "Escale terminée",
    title: "Le cycle subcritique se lit avec vos réflexes habituels",
    lead: "Tant que la haute pression reste sous 73,8 bar, rien ne change dans la méthode : seules les valeurs de pression sont sans rapport avec celles des HFC.",
    bullets: [
      "Palier de condensation, sous-refroidissement et surchauffe existent tous les trois.",
      "Les pressions valent cinq à six fois celles d'un R404A aux mêmes températures.",
      "Référentiel travaillé : 1.02 et 1.03 — théorie élémentaire et lecture du diagramme. En appui : 1.01."
    ],
    callout: { type: "key", title: "Escale suivante", text: "Le cycle transcritique, quand le palier de condensation disparaît." },
    visual: { type: "svg", nom: "subcritique" },
    caption: "Bilan de l'escale « Cycle subcritique »."
  }
},

/* ------------------------------------------------------------------ 6 */
{
  id: "transcritique",
  branche: "fluide",
  court: "Cycle transcritique",
  titre: "Le cycle transcritique, quand il fait chaud",
  minutes: 8,
  resume: "Le cœur du sujet : le palier de condensation disparaît.",
  lessons: [
    {
      id: "trace-trans",
      short: "Le tracé",
      kicker: "Régime d'été",
      title: "Au-dessus de 73,8 bar, le refoulement sort de la cloche",
      lead: "Le point de fin de compression passe au-dessus du sommet de la cloche. Le fluide se refroidit ensuite en restant dans le même état : il n'y a plus de palier.",
      bullets: [
        "La ligne 2 → 3 est horizontale mais elle ne traverse plus la cloche.",
        "Il n'y a plus de changement d'état : le fluide perd seulement de l'enthalpie.",
        "Le point 4, en fin de détente, tombe haut dans la cloche."
      ],
      callout: { type: "note", title: "L'exemple tracé", text: "Évaporation à −10 °C, haute pression à 90 bar, sortie du refroidisseur de gaz à 35 °C. Valeurs d'illustration." },
      visual: { type: "svg", nom: "transcritique" },
      caption: "Cycle transcritique du R744 : la ligne haute pression passe au-dessus de la cloche."
    },
    {
      id: "consequences",
      short: "Conséquences",
      kicker: "Sur le chantier",
      title: "Quatre conséquences directes pour l'intervenant",
      lead: "Ce ne sont pas des conséquences théoriques : elles changent les gestes de mesure et de diagnostic.",
      bullets: [
        "La haute pression ne se lit plus comme une température de condensation.",
        "On relève la température de sortie du refroidisseur de gaz, à la place du sous-refroidissement.",
        "La haute pression devient un paramètre à régler, et non une conséquence subie.",
        "Il y a beaucoup de vapeur de détente à gérer en sortie du détendeur haute pression."
      ],
      callout: { type: "warning", title: "Le faux diagnostic classique", text: "Vouloir « faire baisser la HP » comme sur une machine HFC : en transcritique, une HP trop basse effondre la production de froid. C'est le sujet de l'escale suivante." },
      visual: { type: "pastilles", titre: "Ce que vous relevez sur une machine transcritique",
        items: [
          { ton: "ok", cle: "BP", texte: "Pression et surchauffe, comme d'habitude : la BP reste sous la cloche." },
          { ton: "attente", cle: "HP", texte: "Pression de consigne, et température de sortie du refroidisseur de gaz." },
          { ton: "danger", cle: "Jamais", texte: "Une température de condensation déduite de la HP : elle n'existe pas." }
        ] },
      caption: "Les grandeurs relevées côté basse et haute pression en transcritique."
    },
    {
      id: "flash",
      short: "Flash gas",
      kicker: "Ce que produit la détente",
      title: "Une grande partie du débit arrive en vapeur à l'évaporateur",
      lead: "La cloche du CO₂ est étroite : quand on détend depuis la haute pression, une part importante du fluide se vaporise immédiatement. Cette vapeur ne produit aucun froid.",
      bullets: [
        "Sur l'exemple tracé, le titre de vapeur au point 4 dépasse 0,40.",
        "Plus de 40 % du débit masse entre donc dans l'évaporateur déjà à l'état vapeur.",
        "Cette vapeur occupe de la place, provoque des pertes de charge, et ne refroidit rien."
      ],
      callout: { type: "key", title: "C'est le problème que résout la centrale", text: "Bouteille flash, dérivation de gaz de détente et éjecteur n'existent que pour traiter cette vapeur. On les étudie à l'escale « Centrale booster »." },
      visual: { type: "chaine", titre: "Le sort de la vapeur de détente",
        etapes: ["Détente depuis la HP", "40 % du débit en vapeur", "Séparation en bouteille flash", "Renvoi à l'aspiration"] },
      caption: "D'où vient la vapeur de détente, et ce qu'on en fait."
    },
    {
      id: "mesures",
      short: "Mesurer",
      kicker: "La méthode",
      title: "Ce qu'on relève, et dans quel ordre",
      lead: "Sur une machine transcritique, un relevé complet ne comporte pas les mêmes lignes que sur une machine HFC.",
      bullets: [
        "Basse pression et surchauffe des évaporateurs : inchangés.",
        "Haute pression réelle, et consigne de haute pression affichée par le régulateur.",
        "Température de sortie du refroidisseur de gaz, et température de l'air extérieur.",
        "Pression et niveau de la bouteille intermédiaire, quand la centrale en a une."
      ],
      callout: { type: "note", title: "Sans la consigne, le relevé ne veut rien dire", text: "Une haute pression n'est ni bonne ni mauvaise en soi : elle se juge par rapport à la consigne calculée par le régulateur pour la température de sortie du moment." },
      visual: { type: "tableau", titre: "Feuille de relevé — machine transcritique",
        lignes: [
          ["Basse pression", "et surchauffe à l'évaporateur"],
          ["Haute pression", "mesurée, et consigne affichée"],
          ["Sortie du refroidisseur de gaz", "température, avec l'air extérieur"],
          ["Bouteille intermédiaire", "pression et niveau"],
          ["Ce qu'on ne relève pas", "la température de condensation : elle n'existe pas"]
        ] },
      caption: "Les lignes d'un relevé sur machine transcritique."
    }
  ],
  quiz: [
    {
      id: "t-q1",
      question: "En transcritique, que relève-t-on côté haute pression à la place du sous-refroidissement ?",
      choices: [
        "La surchauffe au refoulement du compresseur",
        "Le sous-refroidissement, comme sur une machine au R404A ou au R134a",
        "La température de sortie du refroidisseur de gaz"
      ],
      answer: 2,
      explanation: "Sans changement d'état, le sous-refroidissement n'a plus de sens. On pilote sur la température de sortie du refroidisseur de gaz et sur la haute pression."
    },
    {
      id: "t-q2",
      question: "Qu'appelle-t-on la vapeur de détente, ou flash gas ?",
      choices: [
        "La vapeur formée pendant la détente, qui entre à l'évaporateur sans produire de froid",
        "La vapeur surchauffée qui sort du compresseur avant le refroidisseur de gaz",
        "La vapeur qui s'échappe par la soupape de sécurité quand la centrale est à l'arrêt"
      ],
      answer: 0,
      explanation: "Elle se forme à la détente, faute de chaleur latente disponible près du point critique. Elle occupe de la place et ne refroidit rien."
    },
    {
      id: "t-q3",
      question: "La ligne 2 → 3 d'un cycle transcritique est horizontale et se situe au-dessus de la cloche. Que s'y passe-t-il ?",
      choices: [
        "Le fluide condense à température constante, comme dans un condenseur",
        "Le fluide se refroidit sans changer d'état",
        "Le fluide se détend à enthalpie constante"
      ],
      answer: 1,
      explanation: "Hors de la cloche, il n'y a pas de changement d'état : le fluide perd de l'enthalpie et sa température baisse. La détente à enthalpie constante, c'est la ligne 3 → 4."
    }
  ],
  final: {
    id: "t-bilan",
    short: "Bilan",
    kicker: "Escale terminée",
    title: "Vous savez ce que le régime transcritique change dans vos mesures",
    lead: "Le palier de condensation disparaît, le sous-refroidissement avec lui, et la haute pression devient une valeur qu'on impose.",
    bullets: [
      "On relève la température de sortie du refroidisseur de gaz, jamais une température de condensation.",
      "La détente produit beaucoup de vapeur inutile, qu'il faudra traiter.",
      "Référentiel travaillé : 11.06 — les différences de conception des systèmes au R744. En appui : 1.02, 1.03 et 3.02."
    ],
    callout: { type: "key", title: "Escale suivante", text: "La haute pression optimale : pourquoi il existe une bonne valeur, et une seule." },
    visual: { type: "svg", nom: "transcritique" },
    caption: "Bilan de l'escale « Cycle transcritique »."
  }
},

/* ------------------------------------------------------------------ 7 */
{
  id: "hp-optimale",
  branche: "fluide",
  court: "La HP optimale",
  titre: "La haute pression optimale : un réglage, pas une fatalité",
  minutes: 7,
  resume: "Pourquoi il existe une bonne haute pression, et une seule.",
  lessons: [
    {
      id: "pourquoi-optimum",
      short: "L'optimum",
      kicker: "Deux effets contraires",
      title: "Monter la HP coûte du travail, mais rapporte du froid",
      lead: "En transcritique, augmenter la haute pression fait travailler davantage le compresseur ; en même temps, cela refroidit mieux le fluide et augmente l'effet frigorifique. Les deux effets ne varient pas au même rythme.",
      bullets: [
        "Trop bas : le fluide entre chaud dans la détente, l'effet frigorifique s'effondre.",
        "Trop haut : le compresseur consomme pour rien.",
        "Entre les deux, il existe une pression qui donne le meilleur COP."
      ],
      callout: { type: "key", title: "C'est ce qui rend le CO₂ particulier", text: "Sur une machine HFC, la haute pression est une conséquence de la condensation. Ici, c'est une consigne : quelqu'un doit la choisir, et c'est le régulateur qui la calcule." },
      visual: { type: "svg", nom: "cop" },
      caption: "COP en fonction de la haute pression, pour trois températures de sortie du refroidisseur de gaz."
    },
    {
      id: "lire-courbe",
      short: "Lire",
      kicker: "Sur le graphique",
      title: "Chaque température de sortie a sa propre pression optimale",
      lead: "Le régulateur ne choisit pas une valeur une fois pour toutes : il recalcule la consigne en permanence, à partir de la température de sortie du refroidisseur de gaz.",
      bullets: [
        "Chaque courbe correspond à une température de sortie du refroidisseur de gaz.",
        "Chaque courbe passe par un maximum : c'est la haute pression optimale de ce point de fonctionnement.",
        "Plus il fait chaud, plus ce maximum se décale vers la droite, et plus le COP baisse.",
        "Le régulateur pilote le détendeur haute pression pour tenir cette consigne.",
        "Attention : le maximum de COP et le maximum de puissance frigorifique ne sont pas à la même pression."
      ],
      callout: { type: "key", title: "Deux maximums, pas un", text: "Sur les relevés publiés, la puissance frigorifique continue de monter un peu après que le COP a atteint son sommet. Monter la haute pression au-delà de l'optimum donne donc encore du froid — mais chaque bar en plus se paie en consommation. Le régulateur, lui, vise le COP." },
      visual: { type: "cartes", titre: "Ce que fait le régulateur, en boucle",
        items: [
          { ton: "info", titre: "Il mesure", texte: "La température de sortie du refroidisseur de gaz." },
          { ton: "info", titre: "Il calcule", texte: "La haute pression qui donne le meilleur COP à cette température." },
          { ton: "ok", titre: "Il agit", texte: "Il ouvre ou ferme le détendeur haute pression pour tenir cette valeur." }
        ] },
      caption: "La boucle de régulation de la haute pression."
    },
    {
      id: "detendeur-hp",
      short: "Détendeur HP",
      kicker: "Le bon rôle du bon organe",
      title: "Le détendeur haute pression fixe la HP, il ne règle pas la surchauffe",
      lead: "C'est une confusion fréquente, et elle conduit à dérégler une machine qui fonctionnait bien.",
      bullets: [
        "Le détendeur haute pression contrôle la pression en amont : c'est lui qui fixe la HP.",
        "Les détendeurs des évaporateurs, eux, règlent la surchauffe de leur meuble.",
        "Ce sont deux organes différents, avec deux consignes différentes."
      ],
      callout: { type: "warning", title: "L'erreur à ne pas faire", text: "Sur une machine transcritique, ne jamais faire baisser la haute pression par réflexe comme sur une installation HFC : trop bas, l'effet frigorifique s'effondre et les meubles remontent en température." },
      visual: { type: "comparatif", titre: "Deux détendeurs, deux missions",
        colonnes: ["Organe", "Ce qu'il règle", "Sa consigne"],
        lignes: [
          ["Détendeur haute pression", "la haute pression", "calculée par le régulateur"],
          ["Détendeur d'évaporateur", "la surchauffe du meuble", "fixée par le besoin du meuble"]
        ] },
      caption: "Le détendeur haute pression et les détendeurs d'évaporateur ne font pas le même travail."
    },
    {
      id: "energie",
      short: "Énergie",
      kicker: "Ce qui se joue à l'entretien",
      title: "Un refroidisseur de gaz encrassé coûte immédiatement du COP",
      lead: "Puisque la pression optimale dépend de la température de sortie, tout ce qui dégrade l'échange haute pression fait monter la consigne et chuter le rendement.",
      bullets: [
        "Un refroidisseur de gaz encrassé, c'est une sortie plus chaude, donc une consigne plus haute.",
        "Un ventilateur en défaut produit le même effet, sans alarme visible côté froid.",
        "Nettoyer l'échangeur et vérifier les ventilateurs fait partie du maintien du rendement."
      ],
      callout: { type: "key", title: "Le geste utile", text: "Sur une machine à haute pression, l'entretien de l'échangeur haute pression a un effet direct et mesurable sur la consommation." },
      visual: { type: "chaine", titre: "L'effet d'un échangeur sale",
        etapes: ["Échangeur encrassé", "Sortie plus chaude", "Consigne HP plus haute", "COP dégradé"] },
      caption: "La chaîne qui relie la propreté de l'échangeur à la consommation."
    }
  ],
  quiz: [
    {
      id: "h-q1",
      question: "Quel est le rôle principal du détendeur haute pression d'une centrale transcritique ?",
      choices: [
        "Régler la surchauffe des évaporateurs",
        "Fixer la haute pression au point de meilleur COP",
        "Séparer le liquide de la vapeur",
        "Limiter le débit d'huile vers les compresseurs basse température"
      ],
      answer: 1,
      explanation: "Le détendeur haute pression fixe la HP. La surchauffe est réglée par les détendeurs d'évaporateur, et la séparation est faite par la bouteille flash."
    },
    {
      id: "h-q2",
      question: "Il fait plus chaud dehors : la température de sortie du refroidisseur de gaz monte. Que devient la haute pression optimale ?",
      choices: ["Elle monte", "Elle ne change pas", "Elle descend"],
      answer: 0,
      explanation: "Le maximum de COP se décale vers les pressions plus élevées quand la sortie se réchauffe. Le COP, lui, baisse."
    }
  ],
  final: {
    id: "h-bilan",
    short: "Bilan",
    kicker: "Escale terminée",
    title: "La haute pression est une consigne, calculée en permanence",
    lead: "Il existe une haute pression optimale pour chaque température de sortie du refroidisseur de gaz : c'est le régulateur qui la calcule, et le détendeur haute pression qui la tient.",
    bullets: [
      "Trop basse, la production de froid s'effondre ; trop haute, on consomme pour rien.",
      "Un échangeur encrassé fait monter la consigne et chuter le rendement.",
      "Référentiel travaillé : 13.17 — maintenir l'efficacité énergétique des équipements à haute pression. En appui : 11.06 et 11.04."
    ],
    callout: { type: "key", title: "Escale suivante", text: "Sécurité et intervention : les trois risques du R744, et le cadre réglementaire. C’est la dernière escale de la ligne du fluide." },
    visual: { type: "svg", nom: "cop" },
    caption: "Bilan de l'escale « La HP optimale »."
  }
},

/* ------------------------------------------------------------------ 8 */
{
  id: "securite",
  branche: "fluide",
  court: "Sécurité",
  titre: "Sécurité et intervention sur une installation R744",
  minutes: 9,
  resume: "Trois risques, un cadre réglementaire, une catégorie B.",
  lessons: [
    {
      id: "risque-pression",
      short: "Pression",
      kicker: "Premier risque",
      title: "La pression, jusqu'à 120 bar côté haute pression",
      lead: "Le R744 est A1 : il ne brûle pas et n'est pas toxique au sens de la classification. Le premier danger est purement mécanique.",
      bullets: [
        "Manifold, flexibles et manomètres doivent être prévus pour le CO₂ : un manifold HFC n'est pas adapté.",
        "Un raccord ou un flexible non prévu pour la pression de service peut éclater.",
        "La pression maximale admissible se lit sur la plaque de l'installation."
      ],
      callout: { type: "warning", title: "Vérification avant branchement", text: "Contrôler le marquage de pression de chaque élément du kit de mesure avant de le raccorder. Un flexible marqué pour du R404A n'a rien à faire sur une centrale CO₂." },
      visual: { type: "cartes", titre: "Le matériel de mesure",
        items: [
          { ton: "danger", titre: "Interdit", texte: "Manifold, flexibles et manomètres HFC standard." },
          { ton: "ok", titre: "Exigé", texte: "Matériel marqué pour la pression de service du R744." },
          { ton: "info", titre: "À relever", texte: "La pression maximale admissible portée sur la plaque." }
        ] },
      caption: "Le matériel de mesure admis et refusé sur une installation R744."
    },
    {
      id: "risque-asphyxie",
      short: "Asphyxie",
      kicker: "Deuxième risque",
      title: "Le CO₂ est plus lourd que l'air et s'accumule en point bas",
      lead: "C'est le risque qui tue. Une fuite dans un local technique enterré, une cave ou une fosse remplit le volume par le bas, là où se trouve l'intervenant.",
      bullets: [
        "Détection CO₂ et ventilation du local technique selon NF EN 378.",
        "Ne jamais intervenir seul dans un local machine confiné.",
        "Vérifier avant d'entrer que la détection est en service et que l'alarme n'est pas déjà déclenchée."
      ],
      callout: { type: "warning", title: "Un masque à cartouche ne protège de rien ici", text: "Il ne filtre pas le CO₂ et ne fabrique pas d'oxygène. Face à une atmosphère appauvrie en oxygène, seuls l'évacuation et la ventilation protègent." },
      visual: { type: "image", fichier: "co2-point-bas.svg",
        alt: "Un local en contrebas : le CO₂, plus lourd que l'air, s'écoule vers le bas et la nappe monte depuis le sol. Un technicien descend l'escalier et entre dans la nappe. L'air reste respirable à hauteur de visage alors qu'il est déjà mortel en bas des marches." },
      caption: "Le gaz ne monte pas : il remplit le local par le bas. Respirable à hauteur de visage, mortel en bas de l'escalier."
    },
    {
      id: "protection-locale",
      short: "Protéger",
      kicker: "Dans quel ordre",
      title: "On protège d'abord le local, ensuite soi-même",
      lead: "Face à une atmosphère qui peut devenir irrespirable, ce qui protège vient d'abord de l'installation du local — pas de ce qu'on porte sur soi.",
      bullets: [
        "Détection fixe du CO₂ en partie basse, là où le gaz s'accumule : un capteur en hauteur voit l'alerte trop tard.",
        "Alarme sonore et lumineuse, à l'intérieur ET à l'extérieur du local, pour empêcher quelqu'un d'entrer.",
        "Ventilation commandée par la détection.",
        "L'organisation ensuite : jamais seul, consignes d'évacuation connues. La protection individuelle vient en dernier."
      ],
      callout: { type: "key", title: "Collective avant individuelle", text: "Une protection collective protège même celui qui n'y pense pas, et même le collègue qui vient vous chercher. C'est pour cela qu'elle passe devant." },
      visual: { type: "image", fichier: "co2-protection.svg",
        alt: "Le dispositif de protection d'un local au CO₂ : la concentration monte depuis le sol, le capteur fixe placé en partie basse la voit, son afficheur se remplit, la préalarme puis l'alarme se déclenchent à l'intérieur et à l'extérieur, et la ventilation démarre." },
      caption: "La chaîne de détection : capteur en bas, afficheur, préalarme, alarme dedans et dehors, ventilation."
    },
    {
      id: "risque-froid",
      short: "Froid extrême",
      kicker: "Troisième risque",
      title: "À l'air libre, le CO₂ produit de la neige carbonique à −78,5 °C",
      lead: "Toute détente à l'air libre — purge, ouverture de raccord, soupape qui lâche — fabrique du solide extrêmement froid.",
      bullets: [
        "Brûlure cryogénique immédiate au contact : gants adaptés et lunettes systématiques.",
        "La neige carbonique peut boucher un circuit et bloquer une vanne.",
        "En sublimant, elle libère un volume de gaz important dans le local."
      ],
      callout: { type: "warning", title: "Deux dangers en un", text: "Une purge à l'air libre expose à la brûlure ET fait monter la teneur en CO₂ du local. Elle ne se fait jamais « pour voir »." },
      visual: { type: "chaine", titre: "Ce que produit une détente à l'air libre",
        etapes: ["Ouverture", "Chute sous 5,18 bar", "Neige carbonique à −78,5 °C", "Brûlure et gaz dans le local"] },
      caption: "Les conséquences d'une détente de R744 à l'air libre."
    },
    {
      id: "bouteilles",
      short: "Bouteilles",
      kicker: "Récipients et étiquetage",
      title: "Une bouteille de R744 ne se manipule pas comme une bouteille de HFC",
      lead: "Les récipients sous pression de CO₂ ont leurs exigences propres, et le prélèvement ne se fait pas dans la même phase selon le modèle.",
      bullets: [
        "Étiquetage du fluide sur les récipients et sur les parties de l'installation qui en contiennent.",
        "Bouteilles à double vanne : une prise en phase liquide, une prise en phase gazeuse — voir l'escale « Le point triple ».",
        "La charge se fait en phase gazeuse tant que le circuit est sous le point triple.",
        "Un récipient ne se remplit jamais à ras : il faut un volume libre pour que le liquide puisse se dilater."
      ],
      callout: { type: "note", title: "Ce que dit le référentiel", text: "Les codes 13.01 et 13.03 portent exactement là-dessus : prescriptions d'étiquetage, exigences des cylindres et des doubles vannes, extraction des gaz." },
      visual: { type: "image", fichier: "secu-bouteille.svg",
        alt: "Deux bouteilles comparées. À gauche, remplie à ras : quand la température monte, le liquide se dilate sans avoir de place et la pression grimpe très vite jusqu'à la rupture. À droite, un volume libre est laissé au-dessus du liquide, qui a où se dilater." },
      caption: "Pourquoi une bouteille ne se remplit jamais à ras : sans volume libre, le liquide qui se dilate fait monter la pression jusqu'à la rupture."
    },
    {
      id: "arret-securite",
      short: "À l'arrêt",
      kicker: "Machine éteinte",
      title: "Le groupe de maintien, et ce qui se passe sans lui",
      lead: "À l'arrêt, la pression remonte à la pression de saturation du local, environ 57 bar à 20 °C. Beaucoup de centrales portent un petit groupe qui l'empêche d'atteindre le tarage des soupapes.",
      bullets: [
        "Ce groupe de maintien fonctionne même quand la centrale est arrêtée.",
        "En cas de coupure de courant prolongée, il s'arrête aussi : la pression monte.",
        "La soupape peut alors lâcher du fluide : c'est prévu, mais le local doit être ventilé et détecté."
      ],
      callout: { type: "warning", title: "Après une coupure longue", text: "Ne pas entrer dans le local machine sans avoir vérifié la ventilation et la détection : de la vapeur de CO₂ a pu s'accumuler en partie basse pendant l'arrêt." },
      visual: { type: "cartes", titre: "Trois situations à l'arrêt",
        items: [
          { ton: "ok", titre: "Groupe en service", texte: "La pression reste sous le tarage des soupapes." },
          { ton: "attente", titre: "Coupure courte", texte: "La pression monte lentement, sans atteindre le tarage." },
          { ton: "danger", titre: "Coupure longue", texte: "La soupape lâche : local à ventiler avant d'entrer." }
        ] },
      caption: "Le comportement de l'installation à l'arrêt, selon la durée de la coupure."
    },
    {
      id: "categorie-b",
      short: "Catégorie B",
      kicker: "Le cadre réglementaire",
      title: "Le R744 relève d'une catégorie d'attestation qui lui est propre",
      lead: "Le régime F-Gas III a réorganisé les attestations d'aptitude. Le dioxyde de carbone n'est plus traité au milieu des gaz fluorés : il a sa catégorie.",
      bullets: [
        "Catégorie B : toutes les activités de l'article 4, pour le dioxyde de carbone R-744.",
        "Elle s'appuie sur un groupe de compétences dédié, le groupe 13, qui n'est évalué que dans cette catégorie.",
        "La catégorie D, elle, ne couvre que la récupération des gaz à effet de serre fluorés — donc pas le CO₂.",
        "Le R744 n'étant pas un gaz fluoré, il n'entre dans aucun quota ; les règles de sécurité de la NF EN 378 s'appliquent pleinement."
      ],
      callout: { type: "key", title: "La source", text: "Arrêté du 21 novembre 2025, annexe II, transcrit dans le référentiel du pack. Il remplace le régime de l'arrêté du 29 février 2016, qui ne connaissait pas de catégorie CO₂." },
      visual: { type: "comparatif", titre: "Les catégories du régime F-Gas III",
        colonnes: ["Catégorie", "Périmètre"],
        lignes: [
          ["A1", "toutes activités, gaz fluorés et hydrocarbures"],
          ["A2", "idem, limité aux faibles charges"],
          ["B", "toutes activités, dioxyde de carbone R-744"],
          ["C", "toutes activités, ammoniac R-717"],
          ["D", "récupération des gaz fluorés seulement"],
          ["E", "contrôles d'étanchéité sans accès au circuit"]
        ],
        note: "Extrait du référentiel du pack, arrêté du 21 novembre 2025." },
      caption: "Les six catégories d'attestation, et la place du R744."
    }
  ],
  quiz: [
    {
      id: "z-q1",
      question: "Une fuite de CO₂ dans un local technique enterré : où le gaz s'accumule-t-il ?",
      choices: ["En partie haute, comme la plupart des gaz de fuite", "En partie basse, car il est plus lourd que l'air", "Il se disperse uniformément dans tout le volume du local"],
      answer: 1,
      explanation: "Le CO₂ est plus lourd que l'air : il remplit le local par le bas, là où se trouve l'intervenant. C'est pourquoi la détection fixe se pose en partie basse."
    },
    {
      id: "z-q2",
      question: "Quelle catégorie d'attestation d'aptitude correspond aux installations au R-744 ?",
      choices: ["La catégorie D", "La catégorie A2", "La catégorie B", "La catégorie E"],
      answer: 2,
      explanation: "La catégorie B est celle du dioxyde de carbone. La catégorie D ne couvre que la récupération des gaz fluorés, et ne concerne donc pas le CO₂."
    },
    {
      id: "z-q3",
      question: "Un masque à cartouche protège-t-il d'une atmosphère chargée en CO₂ ?",
      choices: [
        "Oui, à condition de choisir une cartouche adaptée au dioxyde de carbone",
        "Non : il ne filtre pas le CO₂ et ne fournit pas d'oxygène",
        "Oui, mais seulement le temps de rejoindre la sortie du local"
      ],
      answer: 1,
      explanation: "Aucune cartouche ne retient le CO₂ et aucune ne fabrique d'oxygène. Seules la ventilation et l'évacuation protègent."
    },
    {
      id: "z-q4",
      question: "Vous arrivez sur une centrale R744 arrêtée depuis trois jours, après une coupure de courant. Quel est le premier réflexe ?",
      choices: [
        "Raccorder le manifold pour relever la pression du circuit",
        "Vérifier la ventilation et la détection du local avant d'entrer",
        "Redémarrer la centrale pour faire redescendre la pression"
      ],
      answer: 1,
      explanation: "Le groupe de maintien s'est arrêté avec le courant : la soupape a pu lâcher du fluide dans le local. On sécurise l'atmosphère avant toute autre chose."
    }
  ],
  final: {
    id: "z-bilan",
    short: "Bilan",
    kicker: "La ligne du fluide est bouclée",
    title: "Vous savez ce qui rend une intervention R744 différente",
    lead: "Trois risques qui ne sont ni l'inflammabilité ni la toxicité, du matériel spécifique, et une catégorie d'attestation qui lui est propre.",
    bullets: [
      "Pression : matériel de mesure marqué pour le CO₂, plaque de l'installation relevée.",
      "Asphyxie : détection en partie basse, ventilation, jamais seul.",
      "Froid extrême : gants et lunettes, aucune détente à l'air libre sans nécessité.",
      "Référentiel travaillé : 13.04, 13.16 et 13.01 · 13.03 pour les récipients. En appui : 11.03 et 13.14."
    ],
    callout: { type: "note", title: "Ce que ce module ne remplace pas", text: "Les codes 13.06 à 13.14 sont des épreuves pratiques : analyse de risques, épreuve de pression, tirage au vide, charge, contrôle d'étanchéité, rapport d'intervention. Ils se travaillent sur installation, pas sur écran." },
    visual: { type: "pastilles", titre: "Les trois risques du R744",
      items: [
        { ton: "danger", cle: "Pression", texte: "Jusqu'à 120 bar environ, matériel spécifique." },
        { ton: "danger", cle: "Asphyxie", texte: "Plus lourd que l'air, s'accumule en point bas." },
        { ton: "danger", cle: "Froid", texte: "Neige carbonique à −78,5 °C à la détente." }
      ] },
    caption: "Bilan de l'escale « Sécurité et intervention »."
  }
},

/* ------------------------------------------------------------------ 9 */
{
  id: "booster",
  branche: "centrales",
  court: "Centrale booster",
  titre: "La centrale booster CO₂ en supermarché",
  minutes: 8,
  resume: "Chaque organe en plus répond à un problème déjà vu.",
  lessons: [
    {
      id: "architecture",
      short: "L'architecture",
      kicker: "Ce que vous rencontrerez",
      title: "Deux niveaux de froid, une seule haute pression",
      lead: "C'est l'architecture la plus répandue en grande distribution. Elle sert le froid négatif et le froid positif avec un seul circuit de fluide.",
      bullets: [
        "Les compresseurs basse température alimentent l'aspiration moyenne température.",
        "Les compresseurs moyenne température refoulent vers le refroidisseur de gaz.",
        "Entre les deux, la bouteille flash sépare le liquide de la vapeur de détente."
      ],
      callout: { type: "note", title: "Lire le schéma avant d'intervenir", text: "Le schéma de tuyauterie et d'instrumentation de la centrale dit où sont les vannes d'isolement, les soupapes et les points de mesure. C'est la première pièce à demander." },
      visual: { type: "svg", nom: "booster" },
      caption: "Schéma de principe d'une centrale booster CO₂ : deux étages, bouteille flash et refroidisseur de gaz."
    },
    {
      id: "bouteille-flash",
      short: "Bouteille flash",
      kicker: "Premier organe",
      title: "Pourquoi une bouteille intermédiaire",
      lead: "La détente depuis la haute pression produit beaucoup de vapeur. Envoyer ce mélange directement dans les meubles reviendrait à leur envoyer de la vapeur qui ne refroidit rien.",
      bullets: [
        "La bouteille reçoit le mélange liquide et vapeur sortant du détendeur haute pression.",
        "Seul le liquide part vers les détendeurs des meubles.",
        "La vapeur reste en partie haute de la bouteille, en attente d'être reprise."
      ],
      callout: { type: "key", title: "Une pression intermédiaire", text: "La bouteille travaille à une pression intermédiaire, entre la haute pression et l'aspiration moyenne température. C'est un troisième niveau de pression à repérer sur le schéma." },
      visual: { type: "cartes", titre: "Ce qui entre, ce qui sort",
        items: [
          { ton: "info", titre: "Entrée", texte: "Mélange liquide et vapeur, sortant du détendeur haute pression." },
          { ton: "ok", titre: "Sortie basse", texte: "Liquide seul, vers les détendeurs des meubles." },
          { ton: "attente", titre: "Sortie haute", texte: "Vapeur, vers la dérivation de gaz de détente." }
        ] },
      caption: "Les trois raccordements de la bouteille flash."
    },
    {
      id: "bypass",
      short: "Gaz de détente",
      kicker: "Deuxième organe",
      title: "La vapeur retourne directement à l'aspiration",
      lead: "La vapeur séparée doit bien repartir quelque part. Une vanne la renvoie à l'aspiration moyenne température, sans passer par les évaporateurs.",
      bullets: [
        "La vanne de gaz de détente court-circuite les meubles : cette vapeur n'a rien à y faire.",
        "Elle règle en même temps la pression de la bouteille intermédiaire.",
        "Si elle reste ouverte en grand, la centrale consomme sans produire de froid."
      ],
      callout: { type: "warning", title: "Un symptôme à connaître", text: "Une vanne de gaz de détente bloquée ouverte fait tourner les compresseurs moyenne température sans effet sur les meubles. Le défaut ne se voit pas côté meuble, mais sur la consommation." },
      visual: { type: "chaine", titre: "Le trajet de la vapeur",
        etapes: ["Détendeur HP", "Bouteille flash", "Vanne de gaz de détente", "Aspiration moyenne température"] },
      caption: "Le chemin de la vapeur de détente, du détendeur haute pression jusqu'à l'aspiration."
    },
    {
      id: "deux-etages",
      short: "Booster",
      kicker: "Troisième organe",
      title: "Pourquoi on dit « booster »",
      lead: "Les compresseurs du froid négatif ne refoulent pas vers la haute pression : ils refoulent dans l'aspiration du froid positif. Les deux étages travaillent en série.",
      bullets: [
        "Un seul étage devrait comprimer de la basse température jusqu'à la haute pression : le taux de compression serait énorme.",
        "En deux étages, chaque compresseur travaille dans une plage raisonnable.",
        "Le refoulement des compresseurs basse température est repris par les compresseurs moyenne température."
      ],
      callout: { type: "note", title: "Conséquence pratique", text: "Un défaut sur l'étage moyenne température affecte immédiatement l'étage basse température, qui refoule dans son aspiration. L'inverse n'est pas vrai." },
      visual: { type: "chaine", titre: "Les deux étages en série",
        etapes: ["Meubles négatifs", "Compresseurs BT", "Aspiration MT", "Compresseurs MT", "Refroidisseur de gaz"] },
      caption: "Le trajet du fluide dans une centrale booster, des meubles négatifs jusqu'à la haute pression."
    },
  ],
  quiz: [
    {
      id: "b-q1",
      question: "À quoi sert la bouteille flash d'une centrale booster ?",
      choices: [
        "À stocker la réserve de fluide de l'installation",
        "À séparer le liquide de la vapeur formée à la détente",
        "À maintenir la pression du circuit quand la centrale est à l'arrêt"
      ],
      answer: 1,
      explanation: "Elle sépare : le liquide part vers les meubles, la vapeur repart vers l'aspiration. Le maintien de pression à l'arrêt est le rôle du groupe de maintien."
    },
    {
      id: "b-q2",
      question: "Dans une centrale booster, où refoulent les compresseurs basse température ?",
      choices: [
        "Dans le refroidisseur de gaz, comme les compresseurs moyenne température",
        "Dans la bouteille flash",
        "Dans l'aspiration des compresseurs moyenne température"
      ],
      answer: 2,
      explanation: "C'est ce qui fait le mot « booster » : deux étages en série, chacun avec un taux de compression raisonnable."
    },
    {
      id: "b-q3",
      question: "La vanne de gaz de détente d'une centrale reste bloquée grande ouverte. Quel effet attendre ?",
      choices: [
        "Les meubles négatifs dégivrent en permanence et remontent en température",
        "La centrale consomme sans produire davantage de froid",
        "La haute pression tombe sous le point triple"
      ],
      answer: 1,
      explanation: "La vapeur court-circuite les évaporateurs : les compresseurs travaillent, mais ce débit ne refroidit aucun meuble."
    }
  ],
  final: {
    id: "b-bilan",
    short: "Bilan",
    kicker: "Escale terminée",
    title: "Vous savez à quel problème répond chaque organe de la centrale",
    lead: "La bouteille flash sépare, la vanne de gaz de détente évacue la vapeur, les deux étages partagent le travail de compression.",
    bullets: [
      "Trois niveaux de pression à repérer : haute pression, pression intermédiaire, aspiration.",
      "Un défaut sur l'étage moyenne température se répercute sur l'étage basse température.",
      "Référentiel travaillé : 13.02 — lire et comprendre les schémas de tuyauterie et d'instrumentation d'un système R744. En appui : 11.06 et 6.01."
    ],
    callout: { type: "key", title: "Escale suivante", text: "La même centrale suivie en même temps sur le schéma et sur le diagramme." },
    visual: { type: "svg", nom: "booster" },
    caption: "Bilan de l'escale « Centrale booster »."
  }
},

/* ------------------------------------------------------------------ 10 */
{
  id: "booster-diagramme",
  branche: "centrales",
  court: "Sur le diagramme",
  titre: "Le booster, schéma et diagramme en parallèle",
  minutes: 8,
  resume: "Suivre le fluide dans la centrale et sur le diagramme, en même temps.",
  lessons: [
    {
      id: "double-vue",
      short: "Les deux vues",
      kicker: "La synthèse de la ligne",
      title: "Trois particules partent ensemble et se séparent à la bouteille",
      lead: "Le débit qui sort du refoulement moyenne température se sépare en trois à la bouteille flash : du liquide vers les meubles positifs, du liquide vers les meubles négatifs, et de la vapeur vers la dérivation.",
      bullets: [
        "À gauche, le trajet dans la centrale. À droite, le même trajet sur le diagramme log p/h.",
        "La couleur suit l'état du fluide, pas son chemin : chaud et comprimé, liquide sous pression, en évaporation, ou vapeur de détente.",
        "Le même code de couleur est utilisé dans les deux vues."
      ],
      callout: { type: "note", title: "L'exemple suivi", text: "Basse température −32 °C (13,4 bar), moyenne température −8 °C (28,2 bar), pression intermédiaire 38 bar, haute pression 90 bar, sortie du refroidisseur de gaz 35 °C. Valeurs d'illustration." },
      large: true,
      visual: { type: "svg", nom: "booster-double" },
      caption: "À gauche le trajet dans la centrale, à droite le même trajet sur le diagramme log p/h. Les deux animations tournent en phase : le point suivi dans le circuit est celui qui se déplace sur le tracé. Le bouton ⛶ de la barre du haut agrandit les deux vues."
    },
    {
      id: "separation",
      short: "La séparation",
      kicker: "Le point B du diagramme",
      title: "La détente haute pression amène le fluide en plein milieu de la cloche",
      lead: "C'est le point le plus important du tracé : après le détendeur haute pression, une grande partie du débit est déjà de la vapeur.",
      bullets: [
        "Sur cet exemple, près de 40 % du débit masse est vapeur au point B.",
        "La bouteille sépare : la vapeur part en D, sans produire le moindre froid.",
        "Le liquide part en C, vers les deux niveaux de température."
      ],
      callout: { type: "key", title: "Pourquoi ce point décide de tout", text: "Plus le fluide entre chaud dans la détente, plus le point B se décale vers la droite et plus il y a de vapeur inutile. C'est pour cela que la température de sortie du refroidisseur de gaz compte autant." },
      visual: { type: "svg", nom: "diagramme-booster" },
      caption: "Cycle booster sur le diagramme log p/h : les points A à K, et la séparation en B."
    },
    {
      id: "melange-mt",
      short: "Le mélange",
      kicker: "À l'aspiration moyenne température",
      title: "Trois débits se rejoignent avant le compresseur",
      lead: "Le point d'aspiration réel du compresseur moyenne température n'est pas la sortie des évaporateurs : c'est un mélange, et il est plus chaud.",
      bullets: [
        "La vapeur des évaporateurs moyenne température, au point F.",
        "Le refoulement des compresseurs basse température, au point I.",
        "La vapeur de détente venant de la bouteille, au point D."
      ],
      callout: { type: "key", title: "Ce que ça explique", text: "C'est ce mélange qui donne les températures de refoulement élevées qu'on relève sur les machines R744. Une aspiration plus chaude ressort plus chaude." },
      visual: { type: "chaine", titre: "Ce qui arrive à l'aspiration MT",
        etapes: ["Évaporateurs MT (F)", "Refoulement BT (I)", "Vapeur de détente (D)", "Aspiration réelle, plus chaude"] },
      caption: "Les trois débits qui se mélangent avant le compresseur moyenne température."
    },
    {
      id: "exercice",
      short: "Exercice",
      kicker: "TP BE CVC",
      title: "Ce qui se calcule à partir de ce tracé",
      lead: "Le même schéma sert de support d'exercice en section supérieure : les points A à K sont relevés sur un diagramme officiel, puis exploités.",
      bullets: [
        "Relever les enthalpies aux points A à K sur un diagramme R744 officiel.",
        "Calculer le titre de vapeur au point B, puis le débit masse dérivé en vapeur de détente.",
        "Calculer la puissance frigorifique moyenne température, la puissance basse température, et le COP global.",
        "Refaire le calcul pour un fonctionnement subcritique à 25 °C, et comparer."
      ],
      callout: { type: "note", title: "Pourquoi un diagramme officiel", text: "Le tracé montré ici est schématique : il sert à comprendre la forme du cycle, pas à relever des valeurs. Tout calcul se fait sur un diagramme R744 publié ou avec un logiciel de propriétés." },
      visual: { type: "tableau", titre: "Le point de fonctionnement de l'exercice",
        lignes: [
          ["Basse température", "−32 °C, soit 13,4 bar"],
          ["Moyenne température", "−8 °C, soit 28,2 bar"],
          ["Pression intermédiaire", "38 bar (bouteille flash)"],
          ["Haute pression", "90 bar"],
          ["Sortie du refroidisseur de gaz", "35 °C"]
        ] },
      caption: "Les données du point de fonctionnement servant de base à l'exercice."
    }
  ],
  quiz: [
    {
      id: "d-q1",
      question: "Sur le diagramme, que représente le point B, juste après le détendeur haute pression ?",
      choices: [
        "Un mélange de liquide et de vapeur, à environ 40 % de vapeur",
        "Du liquide sous-refroidi prêt à partir vers les meubles",
        "De la vapeur surchauffée avant l'aspiration du compresseur"
      ],
      answer: 0,
      explanation: "La détente amène le fluide en plein milieu de la cloche. C'est justement ce mélange que la bouteille flash doit séparer."
    },
    {
      id: "d-q2",
      question: "Pourquoi le point d'aspiration réel du compresseur moyenne température est-il plus chaud que la sortie des évaporateurs ?",
      choices: [
        "Parce que la conduite d'aspiration n'est jamais parfaitement isolée",
        "Parce qu'il s'y mélange le refoulement des compresseurs BT et la vapeur de détente",
        "Parce que le compresseur réchauffe le gaz avant de l'aspirer"
      ],
      answer: 1,
      explanation: "Trois débits se rejoignent : évaporateurs MT, refoulement BT et vapeur de détente. Le mélange est plus chaud que le seul retour des meubles."
    }
  ],
  final: {
    id: "d-bilan",
    short: "Bilan",
    kicker: "Escale terminée",
    title: "Vous savez relier la centrale à son tracé",
    lead: "Chaque organe du schéma correspond à un segment du diagramme, et la séparation en bouteille se lit d'un seul coup d'œil.",
    bullets: [
      "Le point B porte la vapeur de détente ; la bouteille en tire le liquide au point C.",
      "L'aspiration moyenne température est un mélange de trois débits.",
      "Référentiel travaillé : 13.02 — lire les schémas de tuyauterie et d'instrumentation. En appui : 1.03 et 11.06."
    ],
    callout: { type: "key", title: "Escale suivante", text: "Les familles d'architecture : ce qui distingue vraiment une centrale CO₂ d'une autre." },
    visual: { type: "svg", nom: "diagramme-booster" },
    caption: "Bilan de l'escale « Le booster sur le diagramme »."
  }
},

/* ------------------------------------------------------------------ 11 */
{
  id: "familles",
  branche: "centrales",
  court: "Les architectures",
  titre: "Les familles d'architecture CO₂",
  minutes: 7,
  resume: "Quatre familles, une seule question : que fait-on de la vapeur de détente ?",
  lessons: [
    {
      id: "cinq-familles",
      short: "Quatre familles",
      kicker: "« Centrale CO₂ » ne veut pas dire grand-chose",
      title: "Ce qui distingue une architecture d'une autre",
      lead: "Les architectures se différencient sur deux points seulement : la façon d'étager la compression, et ce qu'elles font de la vapeur de détente.",
      bullets: [
        "Cascade : le CO₂ ne travaille qu'en subcritique, condensé par un circuit d'ammoniac ou de HFC.",
        "Booster simple : compression étagée sur un seul fluide, c'est le standard en supermarché.",
        "Booster avec compression parallèle : un compresseur reprend la vapeur à la pression intermédiaire.",
        "Booster avec éjecteurs : la détente sert elle-même à remonter la vapeur."
      ],
      callout: { type: "note", title: "Où se trouve chaque famille", text: "La cascade se rencontre en entrepôt frigorifique et en agroalimentaire, pour les fortes puissances négatives. Le booster est le standard du supermarché." },
      visual: { type: "comparatif", titre: "Les quatre familles",
        colonnes: ["Architecture", "Ce qui la caractérise", "Terrain"],
        lignes: [
          ["Cascade", "CO₂ subcritique seul, pas de HP à réguler", "entrepôts, agroalimentaire"],
          ["Booster simple", "deux étages, vapeur détendue jusqu'à la BP MT", "supermarché"],
          ["Compression parallèle", "un compresseur reprend la vapeur à 38 bar", "supermarché, climat chaud"],
          ["Éjecteurs", "la détente remonte elle-même la vapeur", "centrales récentes"]
        ],
        note: "Le refroidissement adiabatique ne figure pas dans ce tableau : ce n'est pas une architecture de circuit." },
      caption: "Les quatre familles d'installations au CO₂ et leur terrain d'emploi."
    },
    {
      id: "cascade",
      short: "Cascade",
      kicker: "La famille à part",
      title: "En cascade, le CO₂ ne dépasse jamais son point critique",
      lead: "Un circuit haut, à l'ammoniac ou au HFC, condense le CO₂ dans un échangeur. Le CO₂ reste donc toujours sous la cloche.",
      bullets: [
        "Il n'y a ni refroidisseur de gaz, ni haute pression à réguler.",
        "Tout ce qui a été vu sur le transcritique ne s'applique pas à cette famille.",
        "En revanche, la pression à l'arrêt et le risque d'asphyxie restent identiques."
      ],
      callout: { type: "warning", title: "Ne pas confondre les deux mondes", text: "Sur une cascade, chercher une consigne de haute pression optimale n'a aucun sens : il n'y en a pas. C'est le circuit haut qui fixe la condensation du CO₂." },
      visual: { type: "cartes", titre: "Cascade et transcritique",
        items: [
          { ton: "info", titre: "Cascade", texte: "CO₂ subcritique seul, condensé par un circuit haut." },
          { ton: "attente", titre: "Transcritique", texte: "Refroidisseur de gaz et haute pression régulée." },
          { ton: "ok", titre: "Commun aux deux", texte: "57 bar à l'arrêt, risque d'asphyxie, matériel spécifique." }
        ] },
      caption: "Ce qui sépare une cascade d'une centrale transcritique, et ce qu'elles partagent."
    },
    {
      id: "ou-part-le-flash",
      short: "Trois réponses",
      kicker: "La seule vraie différence",
      title: "Où part la vapeur de détente : trois réponses possibles",
      lead: "Entre les trois architectures transcritiques, tout le reste est identique. Seule change la destination de la vapeur sortie de la bouteille.",
      bullets: [
        "Booster simple : la vanne la détend jusqu'à l'aspiration moyenne température, à 28 bar.",
        "Compression parallèle : un compresseur l'aspire directement à 38 bar et la refoule à la haute pression.",
        "Éjecteur : la détente du fluide moteur la remonte vers la bouteille, sans compresseur."
      ],
      callout: { type: "key", title: "Pourquoi la compression parallèle fait gagner", text: "Elle supprime la détente de 38 à 28 bar, donc le travail de recompression qui allait avec. Le gain est surtout net en période chaude, quand la vapeur de détente est la plus abondante." },
      visual: { type: "svg", nom: "trois-flash" },
      caption: "Les trois destinations possibles de la vapeur de détente, schématisées côte à côte."
    },
    {
      id: "adiabatique",
      short: "L'adiabatique",
      kicker: "Un complément, pas une famille",
      title: "Le refroidissement adiabatique ne change pas le circuit : il refroidit l'air",
      lead: "Ce n'est pas une architecture. C'est un système ajouté sur le refroidisseur de gaz — ou sur le condenseur en subcritique — qui pulvérise de l'eau en micro-gouttelettes dans l'air aspiré. En s'évaporant, cette eau prend de la chaleur à l'air : l'air entre plus froid dans l'échangeur.",
      bullets: [
        "Le circuit frigorifique, lui, n'est pas modifié : ni organe en plus, ni étage en plus.",
        "Il se pose aussi bien sur une cascade que sur un booster ou une centrale à éjecteurs.",
        "L'effet se voit en période chaude, quand l'air extérieur limite l'échange.",
        "Il consomme de l'eau et demande son propre entretien : buses, filtration, traitement du calcaire."
      ],
      callout: { type: "key", title: "Ce qu'il faut retenir de la distinction", text: "Cascade, booster, compression parallèle et éjecteur répondent à la question « que fait-on de la vapeur de détente ». L'adiabatique ne répond pas à cette question du tout : il fait baisser la température de l'air, donc celle de la sortie du refroidisseur de gaz — et c'est par là qu'il fait redescendre la consigne de haute pression (escale « La HP optimale »)." },
      visual: { type: "chaine", titre: "L'effet du refroidissement adiabatique",
        etapes: ["Eau pulvérisée en micro-gouttelettes", "L'eau s'évapore et refroidit l'air", "L'air entre plus froid dans l'échangeur", "Sortie du refroidisseur de gaz plus froide", "Consigne HP plus basse, COP meilleur"] },
      caption: "La chaîne d'effets du refroidissement adiabatique : elle commence dans l'air, pas dans le circuit."
    }
  ],
  quiz: [
    {
      id: "f-q1",
      question: "Que fait un compresseur parallèle sur une centrale booster ?",
      choices: [
        "Il double le compresseur de tête en cas de panne",
        "Il aspire la vapeur de détente directement à la pression intermédiaire",
        "Il comprime l'air du refroidisseur de gaz pour améliorer l'échange"
      ],
      answer: 1,
      explanation: "Il reprend la vapeur à environ 38 bar au lieu de la laisser se détendre jusqu'à 28 bar : on supprime le travail de recompression correspondant."
    },
    {
      id: "f-q2",
      question: "Sur une installation en cascade NH₃/CO₂, comment règle-t-on la haute pression optimale du CO₂ ?",
      choices: [
        "Avec le détendeur haute pression, comme sur une centrale transcritique",
        "Elle se règle automatiquement par la vanne de gaz de détente",
        "La question ne se pose pas : le CO₂ y reste subcritique"
      ],
      answer: 2,
      explanation: "En cascade, le CO₂ est condensé par le circuit haut. Il n'y a ni refroidisseur de gaz ni haute pression transcritique à optimiser."
    },
    {
      id: "f-q3",
      question: "Le refroidissement adiabatique, c'est quoi exactement ?",
      choices: [
        "Une cinquième famille d'architecture, à côté de la cascade et du booster",
        "Un système ajouté qui pulvérise de l'eau dans l'air entrant dans l'échangeur",
        "Un mode de régulation du détendeur haute pression par temps chaud"
      ],
      answer: 1,
      explanation: "Ce n'est pas une architecture : le circuit frigorifique n'est pas modifié. L'eau pulvérisée s'évapore, l'air entre plus froid dans l'échangeur, la sortie est plus froide et la consigne de haute pression redescend."
    }
  ],
  final: {
    id: "f-bilan",
    short: "Bilan",
    kicker: "Escale terminée",
    title: "Vous savez classer une installation CO₂ en arrivant dessus",
    lead: "Deux questions suffisent : le CO₂ passe-t-il au-dessus de son point critique, et que fait-on de la vapeur de détente ?",
    bullets: [
      "Cascade : jamais de transcritique, pas de haute pression à régler.",
      "Booster simple, compression parallèle, éjecteur : trois destinations pour la même vapeur.",
      "Le refroidissement adiabatique n'entre pas dans ce classement : il agit sur l'air, pas sur le circuit.",
      "Référentiel travaillé : 11.06 — différences de conception, compresseurs parallèles, éjecteurs, noyage partiel. En appui : 11.01 et 11.04."
    ],
    callout: { type: "key", title: "Escale suivante", text: "Les compresseurs et leur pilotage : en R744, la vitesse n'est pas un confort, c'est un organe de régulation." },
    visual: { type: "svg", nom: "trois-flash" },
    caption: "Bilan de l'escale « Les familles d'architecture »."
  }
},

/* ------------------------------------------------------------------ 12 */
{
  id: "compresseurs",
  branche: "centrales",
  court: "Compresseurs",
  titre: "Compresseurs et pilotage moteur",
  minutes: 6,
  resume: "Pourquoi la variation de vitesse est ici un organe de régulation.",
  lessons: [
    {
      id: "technologies",
      short: "Technologies",
      kicker: "Ce qu'on rencontre",
      title: "Le piston semi-hermétique domine le transcritique",
      lead: "Toutes les technologies de compresseur ne tiennent pas les pressions du CO₂, et toutes ne couvrent pas les mêmes puissances.",
      bullets: [
        "Piston semi-hermétique : la technologie dominante en transcritique, pour sa tenue en pression et sa gamme de puissance.",
        "Scroll : plutôt les petites puissances et les applications subcritiques.",
        "Vis : les fortes puissances, surtout en cascade et en subcritique."
      ],
      callout: { type: "note", title: "À vérifier avant de l'affirmer", text: "La disponibilité réelle dépend de la gamme du constructeur. Le catalogue fait foi, pas une règle générale." },
      visual: { type: "comparatif", titre: "Les trois technologies",
        colonnes: ["Technologie", "Emploi courant en R744"],
        lignes: [
          ["Piston semi-hermétique", "transcritique, toutes puissances courantes"],
          ["Scroll", "petites puissances, subcritique"],
          ["Vis", "fortes puissances, cascade et subcritique"]
        ] },
      caption: "Les technologies de compresseur employées au R744 et leur domaine."
    },
    {
      id: "pilotage",
      short: "Pilotage",
      kicker: "Comment on module la puissance",
      title: "Vitesse fixe, variateur, ou moteur à aimants permanents",
      lead: "En R744, la haute pression doit être tenue en permanence. La manière dont on module la puissance des compresseurs fait donc partie de la régulation, pas du confort.",
      bullets: [
        "Vitesse fixe, tout ou rien : plusieurs compresseurs en parallèle, mis en service par paliers. Simple, mais paliers grossiers et démarrages fréquents.",
        "Variation de fréquence sur un compresseur de tête : réglage fin, moins de démarrages, basse pression plus stable.",
        "Moteur à aimants permanents : meilleur rendement à charge partielle, présent sur les gammes récentes.",
        "En pratique, une centrale associe souvent un compresseur à variateur et des compresseurs à vitesse fixe, par niveau de température."
      ],
      callout: { type: "key", title: "Pourquoi cela compte davantage ici", text: "Sur une machine HFC, un palier de puissance un peu grossier se traduit par un cyclage. Ici, il déstabilise en plus la haute pression, donc le point de fonctionnement tout entier." },
      visual: { type: "pastilles", titre: "Trois façons de moduler",
        items: [
          { ton: "info", cle: "Fixe", texte: "Paliers grossiers, démarrages fréquents, montage simple." },
          { ton: "ok", cle: "Variateur", texte: "Réglage fin, basse pression stable, moins de démarrages." },
          { ton: "ok", cle: "Aimants", texte: "Meilleur rendement quand la machine tourne à charge réduite." }
        ] },
      caption: "Les trois modes de pilotage des compresseurs et ce qu'ils apportent."
    },
    {
      id: "consequence-entretien",
      short: "À l'entretien",
      kicker: "Ce que ça change pour vous",
      title: "Un compresseur à variateur ne se contrôle pas comme un compresseur fixe",
      lead: "Le relevé doit dire à quelle vitesse tournait la machine, sinon les valeurs mesurées ne veulent rien dire.",
      bullets: [
        "Noter la fréquence ou le pourcentage de charge au moment du relevé.",
        "Comparer deux relevés faits à des vitesses différentes n'a pas de sens.",
        "Un défaut de variateur se manifeste souvent par une basse pression instable avant tout autre symptôme."
      ],
      callout: { type: "note", title: "Sur la fiche d'intervention", text: "Une ligne suffit : quel compresseur tournait, à quelle vitesse, et quelle était la consigne de haute pression au même instant." },
      visual: { type: "tableau", titre: "Ce que doit porter le relevé",
        lignes: [
          ["Compresseurs en service", "lesquels, et à quel niveau de température"],
          ["Vitesse", "fréquence ou pourcentage de charge du compresseur de tête"],
          ["Consigne HP", "valeur calculée par le régulateur à cet instant"],
          ["Conditions", "température d'air extérieur et sortie du refroidisseur de gaz"]
        ] },
      caption: "Les lignes qui rendent un relevé exploitable sur une machine à vitesse variable."
    }
  ],
  quiz: [
    {
      id: "k-q1",
      question: "Quelle technologie domine sur les centrales R744 transcritiques ?",
      choices: ["Le compresseur à vis, pour les fortes puissances", "Le compresseur à piston semi-hermétique", "Le compresseur scroll"],
      answer: 1,
      explanation: "Le piston semi-hermétique, pour sa tenue en pression et sa gamme de puissance. Le scroll se rencontre surtout en petites puissances subcritiques, la vis en cascade."
    },
    {
      id: "k-q2",
      question: "Pourquoi la variation de vitesse compte-t-elle davantage sur une centrale R744 ?",
      choices: [
        "Parce que les compresseurs CO₂ ne supportent pas les démarrages directs",
        "Parce qu'un palier de puissance trop grossier déstabilise aussi la haute pression",
        "Parce que le variateur remplace le détendeur haute pression"
      ],
      answer: 1,
      explanation: "La haute pression est une consigne à tenir en permanence : la modulation de puissance participe directement à la régulation du point de fonctionnement."
    }
  ],
  final: {
    id: "k-bilan",
    short: "Bilan",
    kicker: "Escale terminée",
    title: "Vous savez pourquoi le pilotage moteur fait partie de la régulation",
    lead: "Piston semi-hermétique pour la pression, variateur pour la finesse : sur une machine R744, ces choix agissent directement sur la stabilité du fonctionnement.",
    bullets: [
      "Un relevé sans la vitesse du compresseur n'est pas exploitable.",
      "Une basse pression instable oriente vers le pilotage avant d'orienter vers la charge.",
      "Référentiel travaillé : 6.01 — expliquer le principe de fonctionnement d’un compresseur. En appui : 11.06 et 13.17."
    ],
    callout: { type: "key", title: "Escale suivante", text: "L'éjecteur : une tuyère sans pièce mobile, qui récupère l'énergie de la détente." },
    visual: { type: "pastilles", titre: "Ce qui est acquis",
      items: [
        { ton: "ok", cle: "Technologie", texte: "Piston semi-hermétique en transcritique." },
        { ton: "ok", cle: "Pilotage", texte: "Variateur sur le compresseur de tête, fixes en appoint." },
        { ton: "info", cle: "Relevé", texte: "Vitesse et consigne HP notées ensemble." }
      ] },
    caption: "Bilan de l'escale « Compresseurs et pilotage »."
  }
},

/* ------------------------------------------------------------------ 13 */
{
  id: "ejecteur",
  branche: "centrales",
  court: "L'éjecteur",
  titre: "L'éjecteur : récupérer l'énergie de la détente",
  minutes: 7,
  resume: "Une tuyère, aucune pièce mobile, de l'énergie reprise.",
  lessons: [
    {
      id: "principe",
      short: "Le principe",
      kicker: "Ni moteur, ni pièce mobile",
      title: "Une tuyère transforme la pression en vitesse, puis la vitesse en pression",
      lead: "L'éjecteur n'a rien d'un compresseur : c'est un tube profilé. Le fluide moteur haute pression y accélère, sa pression chute, et cette dépression aspire un second débit.",
      bullets: [
        "Détente dans la tuyère : le fluide moteur accélère, sa pression tombe sous la pression d'aspiration.",
        "Entraînement : la dépression aspire la vapeur basse pression par l'orifice latéral, les deux débits se mélangent.",
        "Recompression : dans le diffuseur, la vitesse retombe et la pression remonte jusqu'à la pression intermédiaire."
      ],
      callout: { type: "key", title: "Le point clé", text: "C'est la vitesse au col de la tuyère qui crée la dépression. Aucun moteur n'intervient : l'énergie vient du fluide haute pression lui-même." },
      visual: { type: "svg", nom: "ejecteur" },
      caption: "Coupe schématique d'un éjecteur : tuyère, col, chambre de mélange, diffuseur, et l'allure de la pression le long du parcours."
    },
    {
      id: "sur-le-cycle",
      short: "Sur le cycle",
      kicker: "Ce que ça change",
      title: "Une partie du débit remonte de 28 à 38 bar sans compresseur",
      lead: "Ce que l'éjecteur remonte, le compresseur n'a plus à le comprimer. Le travail économisé est celui qui, en booster simple, était détruit dans le détendeur haute pression.",
      bullets: [
        "Le compresseur moyenne température voit passer moins de débit.",
        "Il comprime aussi sur une plus faible amplitude de pression.",
        "L'énergie récupérée était auparavant intégralement perdue à la détente."
      ],
      callout: { type: "note", title: "Presque toujours avec la compression parallèle", text: "L'éjecteur remplit la bouteille de vapeur, et le compresseur parallèle la reprend. Les deux dispositifs se complètent plus qu'ils ne se remplacent." },
      visual: { type: "chaine", titre: "Ce que l'éjecteur économise",
        etapes: ["Vapeur BP à 28 bar", "Entraînée par le fluide moteur", "Remontée à 38 bar", "Compresseur soulagé"] },
      caption: "Le trajet de la vapeur entraînée, et le travail de compression évité."
    },
    {
      id: "en-pratique",
      short: "En pratique",
      kicker: "Sur une centrale réelle",
      title: "Un bloc de plusieurs éjecteurs, ouverts un par un",
      lead: "On n'installe presque jamais un éjecteur seul : le débit à traiter varie beaucoup dans la journée, et un éjecteur ne se règle pas.",
      bullets: [
        "Le bloc comporte plusieurs éjecteurs, mis en service un par un selon la charge.",
        "Aucune pièce mobile dans l'éjecteur lui-même : la maintenance porte sur les vannes de commande et les sondes.",
        "Le taux d'entraînement découle de la géométrie : il ne se règle pas."
      ],
      callout: { type: "warning", title: "Ce qu'on ne peut pas affirmer", text: "Le gain dépend fortement du point de fonctionnement : important en été, marginal en hiver. Ne jamais citer un pourcentage de gain sans nommer la source et les conditions." },
      visual: { type: "cartes", titre: "Ce qui se contrôle sur un bloc d'éjecteurs",
        items: [
          { ton: "info", titre: "L'éjecteur", texte: "Rien de mobile : on ne le règle pas, on le remplace." },
          { ton: "ok", titre: "Les vannes", texte: "Ce sont elles qui ouvrent ou ferment chaque éjecteur." },
          { ton: "ok", titre: "Les sondes", texte: "Elles renseignent le régulateur qui décide de la mise en service." }
        ] },
      caption: "Les organes réellement contrôlables sur un bloc multi-éjecteurs."
    }
  ],
  quiz: [
    {
      id: "e-q1",
      question: "Dans un éjecteur, qu'est-ce qui aspire la vapeur basse pression ?",
      choices: [
        "Un petit moteur électrique intégré au corps de l'éjecteur",
        "La différence de densité entre le liquide et la vapeur",
        "La dépression créée au col de la tuyère par l'accélération du fluide moteur"
      ],
      answer: 2,
      explanation: "La vitesse au col fait chuter la pression sous celle de l'aspiration : c'est cette dépression qui entraîne le second débit. Il n'y a aucune pièce mobile."
    },
    {
      id: "e-q2",
      question: "Que devient la vapeur entraînée par l'éjecteur en sortie de diffuseur ?",
      choices: [
        "Elle repart vers les évaporateurs basse température",
        "Elle est refoulée à la pression intermédiaire, vers la bouteille",
        "Elle est envoyée directement au refroidisseur de gaz"
      ],
      answer: 1,
      explanation: "Le diffuseur retransforme la vitesse en pression : le mélange ressort à la pression intermédiaire, celle de la bouteille flash."
    }
  ],
  final: {
    id: "e-bilan",
    short: "Bilan",
    kicker: "Escale terminée",
    title: "Vous savez ce que fait un éjecteur, et ce qu'il ne fait pas",
    lead: "Il récupère une partie de l'énergie de la détente, sans moteur ni pièce mobile. Il ne se règle pas, et son gain dépend de la saison.",
    bullets: [
      "Trois temps : détente dans la tuyère, entraînement, recompression dans le diffuseur.",
      "La maintenance porte sur les vannes de commande et les sondes, pas sur l'éjecteur.",
      "Référentiel travaillé : 11.06 — technologie des éjecteurs, éjecteur de liquide et de gaz. En appui : 11.04 et 13.17."
    ],
    callout: { type: "note", title: "Fin de la branche", text: "C’est la dernière escale des centrales. La ligne du fluide, elle, se termine sur l’escale « Sécurité et intervention »." },
    visual: { type: "svg", nom: "ejecteur" },
    caption: "Bilan de l'escale « L'éjecteur »."
  }
}

  ]
};
