(function initialiseLiquidReceiverCourse() {
  "use strict";

  const STORAGE_RATE = "inerweb-bouteille-liquide-rate";
  const RATE_VALUES = [0.8, 0.95, 1.1, 1.25];
  const ui = {
    stepper: document.getElementById("stepper"),
    kicker: document.getElementById("lesson-kicker"),
    title: document.getElementById("lesson-title"),
    intro: document.getElementById("lesson-intro"),
    detail: document.getElementById("lesson-detail"),
    takeaway: document.getElementById("lesson-takeaway"),
    visualTitle: document.getElementById("visual-title"),
    visualHint: document.getElementById("visual-hint"),
    controls: document.getElementById("visual-controls"),
    root: document.getElementById("visual-root"),
    caption: document.getElementById("visual-caption"),
    previous: document.getElementById("previous-button"),
    next: document.getElementById("next-button"),
    progressLabel: document.getElementById("progress-label"),
    progressBar: document.getElementById("progress-bar"),
    voiceButton: document.getElementById("voice-button"),
    voiceRate: document.getElementById("voice-rate"),
    sourceButton: document.getElementById("source-button"),
    sourcesDialog: document.getElementById("sources-dialog"),
    status: document.getElementById("app-status")
  };

  let current = 0;
  let furthest = 0;
  let speechRun = 0;
  let speaking = false;
  let paused = false;
  let selectedVoice = null;
  let voiceRate = readRate();

  const quiz = { index: 0, score: 0, answered: false, complete: false };
  const quizQuestions = [
    {
      prompt: "Quelle est la fonction principale de la bouteille liquide ?",
      answers: ["Régler la surchauffe", "Stocker du liquide et absorber les variations de répartition", "Séparer l’huile du refoulement"],
      correct: 1,
      why: "La bouteille constitue une réserve disponible pour la ligne liquide ; la charge totale reste la même pendant le fonctionnement normal."
    },
    {
      prompt: "Pourquoi la sortie utilise-t-elle souvent un tube plongeur ?",
      answers: ["Pour prélever le liquide près du fond", "Pour envoyer les vapeurs en premier", "Pour mesurer la température"],
      correct: 0,
      why: "Le tube plongeur maintient une garde liquide à la sortie lorsque le niveau varie."
    },
    {
      prompt: "Quel est le rôle de la vanne de départ liquide ?",
      answers: ["Détendre le fluide", "Régler le débit en permanence", "Isoler la ligne liquide et permettre certaines opérations de service"],
      correct: 2,
      why: "C’est une vanne d’isolement, pas un organe de détente ni de régulation."
    },
    {
      prompt: "Sur la plaque d’une bouteille liquide, que signifie PS ?",
      answers: ["La pression maximale admissible", "La pression instantanée mesurée", "Le poids du fluide stocké"],
      correct: 0,
      why: "PS est la pression maximale admissible de l’équipement. Ce n’est ni une lecture instantanée ni une consigne à modifier."
    },
    {
      prompt: "Comment connaître la communication exacte de la prise de service ?",
      answers: ["Lire la notice du modèle et identifier la position de la tige", "Se fier seulement à la couleur du capuchon", "Toujours laisser la tige à mi-course"],
      correct: 0,
      why: "La construction varie : la notice et l’identification du matériel restent prioritaires."
    },
    {
      prompt: "Sur la vanne Rotalock étudiée, quelle prise reçoit le manifold ?",
      answers: ["P, près du carré de manœuvre", "P1, à l’opposé du carré", "Le raccord du pressostat, sans vérifier"],
      correct: 0,
      why: "P est la voie de service temporaire près du carré. P1 est réservée au pressostat et peut rester sous pression."
    }
  ];

  const lessons = [
    {
      short: "Reconnaître",
      kicker: "Écran 1 · Observer",
      title: "Reconnaître la bouteille liquide",
      intro: "C’est un réservoir sous pression placé sur le côté haute pression du circuit.",
      detail: `<div class="fact"><strong>À repérer :</strong> une enveloppe cylindrique, une entrée venant du condenseur et une sortie vers la ligne liquide.</div>
        <div class="warning-box"><strong>Vocabulaire :</strong> on dit aussi « réservoir de liquide ».</div>`,
      takeaway: "Je reconnais un réservoir, pas un filtre ni un séparateur d’aspiration.",
      visualTitle: "La forme générale",
      visualHint: "Révèle les quatre repères.",
      caption: "Schéma générique original inerWeb — aucune marque ni dimension constructeur.",
      render: renderRecognise
    },
    {
      short: "Placer",
      kicker: "Écran 2 · Circuit",
      title: "Après le condenseur, avant le filtre",
      intro: "Le fluide condensé rejoint la bouteille avant d’alimenter la ligne liquide.",
      detail: `<div class="fact"><strong>Parcours étudié :</strong> condenseur → bouteille → vanne de départ → filtre-déshydrateur → voyant liquide → électrovanne → entrée du détendeur.</div>
        <p><strong>Raccordement illustré :</strong> arrivée sur une borne haute, départ sur une borne basse. Les piquages réels varient selon le modèle vertical ou horizontal.</p>`,
      takeaway: "Je raccorde les conduites sur les bornes du symbole ; je ne traverse jamais les organes.",
      visualTitle: "Retrouver sa place",
      visualHint: "Choisis le bon emplacement.",
      caption: "Symboles validés inerWeb ; la notice et le schéma réel restent prioritaires.",
      render: renderPlacement
    },
    {
      short: "Stocker",
      kicker: "Écran 3 · Fonction",
      title: "Une réserve qui absorbe les variations",
      intro: "La quantité de liquide présente dans les échangeurs varie avec le fonctionnement.",
      detail: `<div class="key-box"><strong>La clé :</strong> la bouteille offre un volume de réserve entre le condenseur et le détendeur.</div>
        <p>Elle peut aussi recevoir la charge lors d’un pump-down si l’installation est conçue pour cela.</p>`,
      takeaway: "Le niveau peut varier ; la sortie doit pourtant rester alimentée en liquide.",
      visualTitle: "Faire varier le niveau",
      visualHint: "Compare trois situations pédagogiques.",
      caption: "Les niveaux sont illustratifs : ils ne donnent aucune consigne de remplissage.",
      render: renderStorage
    },
    {
      short: "Ouvrir",
      kicker: "Écran 4 · Coupe",
      title: "Voir ce qui se passe à l’intérieur",
      intro: "La vapeur occupe la partie supérieure ; le liquide se rassemble dans la partie basse.",
      detail: `<ul><li><strong>Enveloppe :</strong> récipient sous pression.</li>
        <li><strong>Volume liquide :</strong> réserve disponible.</li>
        <li><strong>Tube plongeur :</strong> conduit la sortie vers le bas.</li>
        <li><strong>Vanne de départ :</strong> isole la ligne liquide.</li></ul>`,
      takeaway: "Le tube plongeur et la vanne de départ travaillent ensemble.",
      visualTitle: "Cliquer un élément",
      visualHint: "Relie le nom à sa fonction.",
      caption: "Coupe de principe originale ; la géométrie réelle dépend du fabricant.",
      render: renderInside
    },
    {
      short: "Plongeur",
      kicker: "Écran 5 · Prélèvement",
      title: "Le tube plongeur va chercher le liquide",
      intro: "Une sortie placée en hauteur ne doit pas aspirer la vapeur située au-dessus du niveau.",
      detail: `<div class="fact"><strong>Principe :</strong> le tube descend près du fond pour conserver une garde liquide à son entrée.</div>
        <div class="warning-box"><strong>Attention :</strong> une bouteille presque vide peut tout de même laisser passer de la vapeur.</div>`,
      takeaway: "Le tube plongeur prélève en bas et remonte le liquide vers la sortie.",
      visualTitle: "Suivre le trajet réel",
      visualHint: "Lance le déplacement du liquide.",
      caption: "Le mouvement bleu représente le trajet, pas une vitesse mesurée.",
      render: renderDipTube
    },
    {
      short: "Entrée / sortie",
      kicker: "Écran 6 · Raccordements",
      title: "Ne pas confondre entrée et départ liquide",
      intro: "L’entrée reçoit le fluide condensé. La sortie alimente la ligne liquide.",
      detail: `<div class="fact"><strong>Entrée :</strong> liaison venant du condenseur, souvent sans tube plongeur de sortie.</div>
        <div class="fact"><strong>Départ liquide :</strong> liaison associée au prélèvement en partie basse.</div>`,
      takeaway: "Je vérifie le marquage et la documentation avant tout raccordement.",
      visualTitle: "Comparer les deux côtés",
      visualHint: "Sélectionne entrée ou départ.",
      caption: "La position physique des piquages varie selon les modèles verticaux ou horizontaux.",
      render: renderConnections
    },
    {
      short: "Vanne départ",
      kicker: "Écran 7 · Isolement",
      title: "La vanne de départ n’est pas un détendeur",
      intro: "Elle ouvre ou ferme le passage entre la bouteille et la ligne liquide.",
      detail: `<div class="key-box"><strong>Fonction :</strong> isoler la ligne et permettre les opérations prévues par la conception de l’installation.</div>
        <div class="warning-box"><strong>Le piège :</strong> ne pas l’utiliser comme une vanne de réglage laissée étranglée.</div>`,
      takeaway: "Ouverte pour le passage, fermée pour l’isolement : jamais réglée au hasard.",
      visualTitle: "Trois représentations de position",
      visualHint: "Observe la circulation et la prise de service.",
      caption: "Principe générique : la communication exacte dépend de la vanne réelle.",
      render: renderValvePositions
    },
    {
      short: "Prise service",
      kicker: "Écran 8 · Accès",
      title: "P près du carré, P1 à l’opposé",
      intro: "La vanne Rotalock étudiée possède deux raccords qui n’ont pas la même fonction.",
      detail: `<div class="key-box"><strong>P · près du carré :</strong> prise de service prévue pour le flexible du manifold ou le manomètre temporaire.</div>
        <div class="warning-box"><strong>P1 · à l’opposé :</strong> raccord permanent du pressostat, pouvant rester sous pression. Ne jamais le desserrer sur une installation chargée.</div>`,
      takeaway: "Pour le manifold, j’identifie P près du carré ; je ne confonds jamais avec P1.",
      visualTitle: "Distinguer les deux bouchons",
      visualHint: "Sélectionne P, P1 ou le carré.",
      caption: "Repérage du type de vanne validé ; vérifier la notice du modèle réel.",
      render: renderServicePort
    },
    {
      short: "Pump-down",
      kicker: "Écran 9 · Principe",
      title: "Rassembler la charge côté condenseur",
      intro: "Un pump-down retire le fluide de la partie basse pression et le stocke côté haute pression.",
      detail: `<div class="fact"><strong>Principe conceptuel :</strong> fermer l’électrovanne liquide, laisser le compresseur transférer le fluide, puis l’arrêter par la commande prévue.</div>
        <div class="warning-box"><strong>Ce n’est pas une procédure chantier :</strong> capacité du réservoir, pressions et automatismes doivent être vérifiés.</div>`,
      takeaway: "Le niveau monte dans la bouteille pendant que la basse pression se vide.",
      visualTitle: "Suivre le fluide pendant le pump-down",
      visualHint: "Avance étape par étape.",
      caption: "Vert animé = circulation ; rouge tireté = fermé. Animation conceptuelle sans valeur de pression.",
      render: renderPumpDown
    },
    {
      short: "Variations",
      kicker: "Écran 10 · Régime",
      title: "La charge se répartit autrement",
      intro: "La température extérieure et la demande de l’évaporateur déplacent le fluide dans le circuit.",
      detail: `<div class="key-box"><strong>Point essentiel :</strong> la charge totale ne change pas ; sa répartition entre condenseur, bouteille et évaporateur change.</div>
        <p>Le curseur d’ouverture représente une demande thermique, pas un réglage chantier du détendeur.</p>`,
      takeaway: "La bouteille compense les variations d’inventaire liquide du circuit.",
      visualTitle: "Faire varier le régime",
      visualHint: "Agis sur l’extérieur et sur la demande de l’évaporateur.",
      caption: "Modèle qualitatif : aucune masse de fluide ni valeur de réglage n’est calculée.",
      render: renderVariations
    },
    {
      short: "Dimensionner",
      kicker: "Écran 11 · Capacité",
      title: "Une bouteille ne se remplit pas au hasard",
      intro: "Elle doit garder un volume libre pour les variations et la dilatation du liquide.",
      detail: `<div class="warning-box"><strong>Dimensionnement :</strong> utiliser la capacité admissible, le fluide, la température et la notice du fabricant.</div>
        <p>Le volume géométrique inscrit sur un récipient n’est pas automatiquement la charge de service autorisée.</p>`,
      takeaway: "Je dimensionne avec les données constructeur, jamais avec un pourcentage mémorisé au hasard.",
      visualTitle: "Comprendre le volume libre",
      visualHint: "Déplace la simulation sans en faire une consigne.",
      caption: "Simulation qualitative uniquement ; aucune limite réglementaire n’est fixée ici.",
      render: renderSizing
    },
    {
      short: "Monter",
      kicker: "Écran 12 · Construction",
      title: "Verticale ou horizontale : suivre sa conception",
      intro: "Il existe des bouteilles verticales et horizontales, avec des prises adaptées à leur orientation.",
      detail: `<div class="fact"><strong>Fixation :</strong> employer les supports et le sens prévus par le fabricant.</div>
        <div class="warning-box"><strong>Pourquoi :</strong> retourner un récipient modifie la position du liquide et du tube de prélèvement.</div>`,
      takeaway: "L’orientation fait partie de la conception du récipient.",
      visualTitle: "Comparer deux architectures",
      visualHint: "Bascule entre modèle vertical et horizontal.",
      caption: "Deux architectures de principe, pas un même récipient que l’on retournerait.",
      render: renderMounting
    },
    {
      short: "Sécuriser",
      kicker: "Écran 13 · Pression",
      title: "DESP et protection contre la surpression",
      intro: "La bouteille est un équipement sous pression : sa plaque et ses accessoires de sécurité font partie du contrôle.",
      detail: `<div class="warning-box"><strong>Danger :</strong> liquide piégé, échauffement ou incendie peuvent dépasser les limites admissibles.</div>
        <p><strong>Mini-TP :</strong> relever sur la bouteille réelle PS, TS, V, son identification et les marquages avant de consulter son dossier.</p>
        <p><strong>DESP 2014/68/UE :</strong> elle encadre la conception et la conformité des équipements dont la PS dépasse 0,5 bar.</p>`,
      takeaway: "Je lis PS, TS et V sur la plaque, puis je distingue les protections.",
      visualTitle: "Lire la plaque, comparer les protections",
      visualHint: "Commence par la plaque, puis sélectionne un dispositif.",
      caption: "Démonstration qualitative : aucune pression de tarage n’est donnée.",
      render: renderSafety
    },
    {
      short: "Défi",
      kicker: "Écran 14 · Vérifier",
      title: "Décider sans confondre les organes",
      intro: "Six situations vérifient la fonction, le prélèvement, la vanne et la lecture de la plaque.",
      detail: `<div class="key-box"><strong>Objectif :</strong> obtenir au moins 5 bonnes réponses sur 6.</div>
        <p>Chaque réponse est corrigée immédiatement.</p>`,
      takeaway: "Je peux expliquer la bouteille, sa vanne et ses données de sécurité.",
      visualTitle: "Défi final",
      visualHint: "Une seule réponse par situation.",
      caption: "Quiz formatif : recommence autant de fois que nécessaire.",
      render: renderQuiz
    }
  ];

  function receiverSvg(options = {}) {
    const level = Math.max(8, Math.min(88, Number(options.level ?? 55)));
    const liquidHeight = 238 * level / 100;
    const liquidY = 358 - liquidHeight;
    const labels = options.labels !== false;
    const valveState = options.valveState || "open";
    const title = options.title || "Bouteille liquide verticale en coupe";
    const labelMarkup = labels ? `<g id="labels-layer">
      <line class="label-line" x1="267" y1="150" x2="154" y2="112"/><text class="svg-label" x="34" y="106">Enveloppe</text>
      <line class="label-line" x1="380" y1="248" x2="596" y2="276"/><text class="svg-label" x="601" y="283">Tube plongeur</text>
      <line class="label-line" x1="326" y1="${Math.round(liquidY + 24)}" x2="145" y2="305"/><text class="svg-label" x="34" y="312">Liquide</text>
      <line class="label-line" x1="412" y1="76" x2="548" y2="43"/><text class="svg-label" x="553" y="47">Vanne de départ</text>
    </g>` : "";
    const closed = valveState === "closed" ? `<path class="valve-shutter" d="M321 65 L339 91"/><circle class="valve-stop" cx="330" cy="78" r="19"/><path class="valve-stop-mark" d="M318 66 L342 90"/>` : "";
    const service = options.service ? `<g class="service-port" aria-label="Prise de service protégée">
      <path d="M365 62 V42"/><rect x="352" y="28" width="26" height="16" rx="5"/><path d="M356 33 H374"/>
    </g>` : "";
    return `<div class="diagram ${options.flowing ? "flowing" : ""}" role="img" aria-label="${title}">
      <svg viewBox="0 0 760 420" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        <defs><clipPath id="receiver-clip"><rect x="260" y="115" width="240" height="245" rx="58"/></clipPath></defs>
        <path class="pipe" d="M70 170 H260"/><polygon points="229,155 256,170 229,185" fill="#3d7fca"/>
        <text class="svg-small" x="70" y="199">depuis le condenseur</text>
        <rect class="receiver-shell" x="260" y="115" width="240" height="245" rx="58"/>
        <rect class="liquid" x="260" y="${liquidY.toFixed(1)}" width="240" height="${liquidHeight.toFixed(1)}" clip-path="url(#receiver-clip)"/>
        <path class="receiver-shine" d="M300 132 Q282 180 294 278 L318 278 Q308 180 332 132 Z"/>

        <path id="dip-tube-path" class="dip-tube" d="M420 344 H400 Q380 344 380 324 V91"/>
        <g id="receiver-outlet-neck" aria-label="Raccord continu entre le tube plongeur et la vanne">
          <rect class="receiver-neck" x="363" y="91" width="34" height="37" rx="7"/>
          <path class="receiver-neck-line" d="M380 91 V122"/>
        </g>

        <g id="service-valve-group" class="service-valve valve-${valveState}" aria-label="Vanne de service de départ liquide montée au-dessus de la bouteille">
          <path class="pipe outlet-pipe" d="M70 78 H294"/>
          <polygon class="flow-arrow" points="100,63 72,78 100,93"/>
          <text class="svg-small" x="70" y="53">vers filtre et détendeur</text>
          <rect class="valve-union" x="276" y="65" width="35" height="26" rx="7"/>
          <path class="valve-body" d="M305 59 H414 L441 78 L414 97 H305 L287 78 Z"/>
          <path class="valve-bore" d="M296 78 H430 M380 78 V105"/>
          <path class="valve-rotalock" d="M348 93 H412 L422 108 L412 123 H348 L338 108 Z"/>
          <path class="valve-stem" d="M421 78 H454"/>
          <rect class="valve-cap-band" x="442" y="57" width="23" height="42" rx="8"/>
          <path class="valve-cap" d="M460 54 H501 L516 65 V91 L501 102 H460 Z"/>
          <path class="valve-cap-ribs" d="M474 57 V99 M486 57 V99 M498 59 V97"/>
          ${service}${closed}
        </g>
        <path class="flow-trace" d="M420 344 H400 Q380 344 380 324 V78 H72"/>
        ${labelMarkup}
      </svg>
    </div>`;
  }

  function horizontalReceiverSvg() {
    return `<div class="diagram" role="img" aria-label="Bouteille liquide horizontale conçue avec un tube de prélèvement bas">
      <svg viewBox="0 0 760 400" aria-hidden="true">
        <defs><clipPath id="horizontal-clip"><rect x="130" y="135" width="500" height="190" rx="88"/></clipPath></defs>
        <text class="svg-title" x="380" y="32" text-anchor="middle">Modèle horizontal conçu ainsi</text>
        <rect class="receiver-shell" x="130" y="135" width="500" height="190" rx="88"/>
        <rect class="liquid" x="130" y="235" width="500" height="90" clip-path="url(#horizontal-clip)"/>
        <path class="pipe" d="M205 135 V82"/><text class="svg-small" x="138" y="68">entrée</text>
        <path class="dip-tube" d="M555 104 V293 H520"/>
        <rect class="receiver-neck" x="543" y="105" width="24" height="36" rx="6"/>
        <g class="service-valve" aria-label="Vanne de départ au-dessus de la bouteille horizontale">
          <path class="valve-body" d="M507 83 H594 L610 98 L594 113 H507 L491 98 Z"/>
          <path class="valve-bore" d="M498 98 H603 M555 98 V112"/>
          <path class="pipe outlet-pipe" d="M605 98 H690"/>
          <path class="valve-stem" d="M492 98 H470"/>
          <rect class="valve-cap-band" x="456" y="82" width="18" height="32" rx="6"/>
          <path class="valve-cap" d="M421 80 H458 V116 H421 L410 107 V89 Z"/>
          <path class="service-port" d="M558 84 V61 H578 V84"/>
        </g>
        <line class="label-line" x1="535" y1="283" x2="610" y2="354"/><text class="svg-label" x="613" y="360">Prélèvement bas</text>
        <path d="M180 326 V360 H270 V326 M490 326 V360 H580 V326" fill="none" stroke="#1b3a63" stroke-width="7"/>
      </svg>
    </div>`;
  }

  function setControls(html) { ui.controls.innerHTML = html; }
  function markActive(selector, activeButton) {
    ui.controls.querySelectorAll(selector).forEach((button) => {
      const selected = button === activeButton;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }
  function announce(message) { ui.status.textContent = ""; window.setTimeout(() => { ui.status.textContent = message; }, 10); }
  function setReadout(message) {
    const target = document.getElementById("visual-readout");
    if (target) target.innerHTML = message;
    announce(message.replace(/<[^>]+>/g, " "));
  }

  function renderRecognise() {
    setControls(`<button type="button" class="action-button primary" id="reveal-parts">Révéler les repères</button>`);
    ui.root.innerHTML = receiverSvg({ labels: false, level: 54 }) + `<div class="readout" id="visual-readout">Observe d’abord la forme sans les légendes.</div>`;
    document.getElementById("reveal-parts").addEventListener("click", () => {
      ui.root.innerHTML = receiverSvg({ labels: true, level: 54 }) + `<div class="readout" id="visual-readout"><strong>Repères :</strong> enveloppe, liquide, tube plongeur et vanne de départ.</div>`;
      announce("Repères révélés : enveloppe, liquide, tube plongeur et vanne de départ.");
    });
  }

  function renderPlacement() {
    setControls(`<button class="choice-button" data-place="before">Avant le condenseur</button><button class="choice-button" data-place="correct">Après le condenseur</button><button class="choice-button" data-place="after">Après le détendeur</button>`);
    ui.root.innerHTML = `<div class="diagram library-line" role="img" aria-label="Schéma fluidique raccordé aux bornes : le condenseur alimente une borne haute de la bouteille, une borne basse rejoint la vanne de départ Rotalock, puis le filtre, le voyant, l’électrovanne et le détendeur"><svg viewBox="0 0 980 340" aria-hidden="true">
      <text class="svg-title" x="490" y="34" text-anchor="middle">Repérage de la ligne liquide</text>
      <rect class="liquid-line-zone" x="381" y="62" width="435" height="186" rx="22"/>
      <text class="liquid-line-title" x="390" y="88">LIGNE LIQUIDE</text>
      <text class="liquid-line-subtitle" x="390" y="108">après la vanne de départ · jusqu’à l’entrée du détendeur</text>

      <path class="connector-pipe" d="M103 170H154V127H186"/>
      <path class="connector-pipe" d="M244 168V196H336V175"/>
      <path class="connector-pipe" d="M378 146H386V155H396"/>
      <path class="connector-pipe" d="M469 155H507"/>
      <path class="connector-pipe" d="M574 154H621"/>
      <path class="connector-pipe" d="M672 154H837"/>
      <path class="connector-flow flow-pass mobile" d="M103 170H154V127H186 M244 168V196H336V175 M378 146H386V155H396 M469 155H507 M574 154H621 M672 154H837"/>

      <g class="library-symbol"><image href="assets/symboles/echangeur_a_air.svg" x="28" y="93" width="102" height="102"/><text class="symbol-name" x="79" y="224">CONDENSEUR</text></g>
      <g class="library-symbol receiver-location"><image href="assets/symboles/bouteille_liquide.svg" x="145" y="106" width="145" height="88"/><text class="connection-word inlet-word" x="169" y="116">ARRIVÉE HAUTE</text><text class="connection-word outlet-word" x="266" y="195">DÉPART BAS</text><text class="symbol-name" x="217" y="224">BOUTEILLE</text></g>
      <g class="validated-symbol"><image href="assets/symboles/vanne_depart_rotalock.svg" x="288" y="112" width="96" height="67"/><text class="symbol-name" x="336" y="216">VANNE DE DÉPART</text><text class="symbol-subname" x="336" y="232">type Rotalock représenté</text></g>
      <g class="library-symbol"><image href="assets/symboles/filtre_deshydrateur.svg" x="382" y="126" width="100" height="56"/><text class="symbol-name" x="432" y="224">FILTRE</text></g>
      <g class="library-symbol"><image href="assets/symboles/voyant_liquide.svg" x="493" y="128" width="96" height="53"/><text class="symbol-name" x="541" y="224">VOYANT</text></g>
      <g class="library-symbol"><image href="assets/symboles/electrovanne_frigo.svg" x="603" y="105" width="92" height="70"/><text class="symbol-name" x="649" y="224">ÉLECTROVANNE</text></g>
      <g class="library-symbol"><image href="assets/symboles/detendeur_thermo_ext.svg" x="818" y="87" width="96" height="112"/><text class="symbol-name" x="866" y="224">DÉTENDEUR</text></g>

      <path class="zone-bracket" d="M374 258 V278 H810 V258"/>
      <text class="zone-bracket-label" x="592" y="304">ENSEMBLE DES ORGANES DE LA LIGNE LIQUIDE</text>
    </svg></div><div class="readout" id="visual-readout">Où place-t-on normalement la bouteille dans ce parcours ?</div>`;
    ui.controls.querySelectorAll("[data-place]").forEach((button) => button.addEventListener("click", () => {
      ui.controls.querySelectorAll("[data-place]").forEach((item) => item.classList.remove("correct", "wrong"));
      const correct = button.dataset.place === "correct";
      button.classList.add(correct ? "correct" : "wrong");
      ui.root.querySelector(".receiver-location")?.classList.toggle("symbol-correct", correct);
      setReadout(correct ? "<strong>Correct :</strong> le condenseur rejoint une borne haute ; le départ bas alimente la vanne puis la ligne liquide." : "<strong>À revoir :</strong> le liquide condensé doit rejoindre la bouteille avant la ligne liquide.");
    }));
  }

  function renderLevelSelector(items, initialKey, readouts) {
    const activate = (key) => {
      const item = items[key];
      const active = ui.controls.querySelector(`[data-level="${key}"]`);
      markActive("[data-level]", active);
      ui.root.innerHTML = receiverSvg({ level: item.level, labels: true }) + `<div class="readout" id="visual-readout">${readouts[key]}</div>`;
      announce(readouts[key].replace(/<[^>]+>/g, " "));
    };
    ui.controls.querySelectorAll("[data-level]").forEach((button) => button.addEventListener("click", () => activate(button.dataset.level)));
    activate(initialKey);
  }

  function renderStorage() {
    setControls(`<button class="choice-button" data-level="low">Réserve basse</button><button class="choice-button" data-level="normal">Réserve moyenne</button><button class="choice-button" data-level="high">Réserve haute</button>`);
    renderLevelSelector({ low: { level: 30 }, normal: { level: 54 }, high: { level: 76 } }, "normal", {
      low: "La réserve diminue, mais l’entrée du tube plongeur reste encore noyée dans cette illustration.",
      normal: "La bouteille conserve simultanément une réserve liquide et un volume libre.",
      high: "Le liquide occupe davantage de volume ; la capacité admissible doit rester respectée."
    });
  }

  function renderInside() {
    const info = {
      shell: "<strong>Enveloppe :</strong> elle résiste à la pression dans les limites prévues par le fabricant.",
      liquid: "<strong>Liquide :</strong> il se rassemble dans la zone basse sous l’effet de la gravité.",
      tube: "<strong>Tube plongeur :</strong> il conduit la sortie vers une prise située près du fond.",
      valve: "<strong>Vanne de départ :</strong> elle ouvre ou isole la liaison avec la ligne liquide."
    };
    setControls(Object.keys(info).map((key) => `<button class="choice-button" data-part="${key}">${({shell:"Enveloppe",liquid:"Liquide",tube:"Tube plongeur",valve:"Vanne"})[key]}</button>`).join(""));
    ui.root.innerHTML = receiverSvg({ labels: true, level: 58, service: true }) + `<div class="readout" id="visual-readout">Choisis un élément pour expliquer son rôle.</div>`;
    ui.controls.querySelectorAll("[data-part]").forEach((button) => button.addEventListener("click", () => {
      markActive("[data-part]", button);
      setReadout(info[button.dataset.part]);
    }));
  }

  function renderDipTube() {
    setControls(`<button type="button" class="action-button primary" id="run-flow">Lancer le trajet</button>`);
    ui.root.innerHTML = receiverSvg({ labels: true, level: 52, flowing: false }) + `<div class="readout" id="visual-readout">Le départ visible en haut est relié à une prise située en bas.</div>`;
    document.getElementById("run-flow").addEventListener("click", () => {
      const diagram = ui.root.querySelector(".diagram");
      diagram.classList.remove("flowing");
      void diagram.offsetWidth;
      diagram.classList.add("flowing");
      setReadout("Le liquide entre dans le tube près du fond, remonte, traverse la vanne puis rejoint la ligne liquide.");
    });
  }

  function renderConnections() {
    setControls(`<button class="choice-button" data-side="inlet">Entrée</button><button class="choice-button" data-side="outlet">Départ liquide</button>`);
    ui.root.innerHTML = receiverSvg({ labels: true, level: 56 }) + `<div class="readout" id="visual-readout">Sélectionne un côté.</div>`;
    ui.controls.querySelectorAll("[data-side]").forEach((button) => button.addEventListener("click", () => {
      markActive("[data-side]", button);
      setReadout(button.dataset.side === "inlet" ? "<strong>Entrée :</strong> elle reçoit le fluide venant du condenseur." : "<strong>Départ liquide :</strong> il est relié au prélèvement bas et à la vanne d’isolement.");
    }));
  }

  function renderValvePositions() {
    const states = {
      open: { label: "Ouverte", message: "<strong>Ouverte :</strong> le passage principal alimente la ligne liquide.", state: "open" },
      service: { label: "Position de service", message: "<strong>Position de service :</strong> sur certains modèles, une position intermédiaire met la prise en communication. Vérifier la notice.", state: "service" },
      closed: { label: "Fermée", message: "<strong>Fermée :</strong> le passage principal est isolé. Du liquide reste sous pression dans la bouteille.", state: "closed" }
    };
    setControls(Object.entries(states).map(([key, value]) => `<button class="choice-button" data-valve="${key}">${value.label}</button>`).join(""));
    const activate = (key) => {
      const state = states[key];
      const active = ui.controls.querySelector(`[data-valve="${key}"]`);
      markActive("[data-valve]", active);
      ui.root.innerHTML = receiverSvg({ labels: true, level: 58, service: true, valveState: state.state, title: `Vanne ${state.label.toLowerCase()}` }) + `<div class="readout" id="visual-readout">${state.message}</div>`;
      announce(state.message.replace(/<[^>]+>/g, " "));
    };
    ui.controls.querySelectorAll("[data-valve]").forEach((button) => button.addEventListener("click", () => activate(button.dataset.valve)));
    activate("open");
  }

  function renderServicePort() {
    const notes = {
      p: "<strong>P · SERVICE :</strong> c’est la prise la plus proche du carré de manœuvre. Elle reçoit le flexible du manifold ou un manomètre temporaire, selon la procédure applicable.",
      p1: "<strong>P1 · PRESSOSTAT :</strong> cette voie opposée au carré peut rester en communication avec la pression. Ne jamais desserrer son bouchon ou son raccord sur une installation chargée : un appareil branché au mauvais endroit ne pourrait pas être retiré sans rejet de fluide.",
      square: "<strong>CARRÉ :</strong> il manœuvre la tige. Sa proximité permet d’identifier P sur le type de vanne étudié ; la notice réelle reste prioritaire."
    };
    setControls(`<button class="choice-button" data-port="p">P · Manifold</button><button class="choice-button" data-port="p1">P1 · Pressostat</button><button class="choice-button" data-port="square">Carré</button>`);
    const activate = (key) => {
      const active = ui.controls.querySelector(`[data-port="${key}"]`);
      markActive("[data-port]", active);
      ui.root.innerHTML = `<div class="diagram service-valve-map" role="img" aria-label="Vanne Rotalock : P près du carré pour le manifold ; P1 à l’opposé pour le pressostat et restant sous pression"><svg viewBox="0 0 760 380" aria-hidden="true">
        <text class="svg-title" x="380" y="31" text-anchor="middle">Repérage des deux prises de la vanne étudiée</text>
        <path class="service-map-body" d="M90 164 Q90 132 124 132 H636 Q670 132 670 164 V232 Q670 264 636 264 H124 Q90 264 90 232 Z"/>
        <path class="service-map-cavity" d="M108 198 H612"/>
        <path class="service-map-stem" d="M360 198 H625"/>
        <path class="service-map-pointer" d="M354 177 L326 198 L354 219 Z"/>
        <rect class="service-map-square ${key === "square" ? "is-selected" : ""}" x="620" y="169" width="65" height="58" rx="12"/>
        <path class="square-mark" d="M636 184 L669 212 M669 184 L636 212"/>

        <path class="service-map-port" d="M278 132 V82 H340 V132"/>
        <rect class="service-map-cap" x="270" y="67" width="78" height="18" rx="7"/>
        <g class="port-box port-p1 ${key === "p1" ? "is-selected" : ""}" transform="translate(170 37)"><rect width="180" height="62" rx="15"/><text class="port-code" x="20" y="27">P1</text><text class="port-role" x="70" y="27">PRESSOSTAT</text><text class="port-note" x="20" y="49">PERMANENT · SOUS PRESSION</text></g>

        <path class="service-map-port" d="M500 132 V82 H562 V132"/>
        <rect class="service-map-cap" x="492" y="67" width="78" height="18" rx="7"/>
        <g class="port-box port-p ${key === "p" ? "is-selected" : ""}" transform="translate(450 37)"><rect width="180" height="62" rx="15"/><text class="port-code" x="20" y="27">P</text><text class="port-role" x="58" y="27">SERVICE</text><text class="port-note" x="20" y="49">MANIFOLD · TEMPORAIRE</text></g>

        <g class="square-label ${key === "square" ? "is-selected" : ""}" transform="translate(555 286)"><rect width="150" height="52" rx="14"/><text x="75" y="23">CARRÉ</text><text x="75" y="42">DE MANŒUVRE</text></g>
        <path class="near-square" d="M540 106 C588 112 622 132 645 166"/><text class="near-square-text" x="568" y="119">P est près du carré</text>
      </svg></div><div class="readout" id="visual-readout">${notes[key]}</div>`;
      announce(notes[key].replace(/<[^>]+>/g, " "));
    };
    ui.controls.querySelectorAll("[data-port]").forEach((button) => button.addEventListener("click", () => activate(button.dataset.port)));
    activate("p");
  }

  function systemCircuitSvg({ id, level, previousLevel = level, stage = "variation", opening = null, ariaLabel }) {
    const safeLevel = Math.max(12, Math.min(88, Number(level)));
    const safePrevious = Math.max(12, Math.min(88, Number(previousLevel)));
    const levelHeight = 34 * safeLevel / 100;
    const levelY = 117 - levelHeight;
    const previousHeight = 34 * safePrevious / 100;
    const previousY = 117 - previousHeight;
    const pumpStage = Number.isFinite(Number(stage)) ? Number(stage) : null;
    const running = pumpStage === null || pumpStage < 3;
    const valveClosed = pumpStage !== null && pumpStage > 0;
    const highClass = running ? "flow-pass mobile" : "flow-stopped";
    const lowClass = pumpStage === 0 || pumpStage === null ? "flow-pass mobile" : pumpStage < 3 ? "flow-draining mobile" : "flow-stopped";
    const liquidClass = valveClosed ? "flow-blocked" : "flow-pass mobile";
    const status = pumpStage === null
      ? "PASSAGE OUVERT · fluide en circulation"
      : pumpStage === 0 ? "DEMANDE DE FROID · électrovanne ouverte"
      : pumpStage === 1 ? "THERMOSTAT SATISFAIT · électrovanne fermée"
      : pumpStage === 2 ? "RAVALAGE · le niveau monte dans la bouteille"
      : "PRESSOSTAT BP · compresseur arrêté";
    const statusClass = valveClosed ? "status-blocked" : "status-open";
    const openingValue = opening === null ? null : Math.max(0, Math.min(100, Number(opening)));
    const flowSpeed = openingValue === null ? 1.1 : Math.max(0.55, 1.7 - openingValue / 100);
    return `<div class="diagram refrigeration-circuit" style="--flow-speed:${flowSpeed.toFixed(2)}s" role="img" aria-label="${ariaLabel}"><svg viewBox="0 0 820 430" aria-hidden="true">
      <defs>
        <clipPath id="${id}-receiver-clip"><rect x="204" y="80" width="93" height="38" rx="10"/></clipPath>
      </defs>
      <path class="circuit-pipe" d="M738 238H790V112H433 M357 112H333V80H277 M277 118V155H136 M90 155V281 M136 281H225V384H342 M418 384H590V238H668"/>
      <path class="circuit-flow ${highClass}" d="M738 238H790V112H433 M357 112H333V80H277"/>
      <path class="circuit-flow ${liquidClass}" d="M277 118V155H136 M90 155V281"/>
      <path class="circuit-flow ${lowClass}" d="M136 281H225V384H342 M418 384H590V238H668"/>

      <g class="library-symbol"><image href="assets/symboles/echangeur_a_air.svg" x="345" y="22" width="120" height="120"/><text class="circuit-label" x="405" y="27">CONDENSEUR</text></g>
      <g class="library-symbol">
        <rect class="circuit-level" x="204" y="${levelY.toFixed(2)}" width="93" height="${levelHeight.toFixed(2)}" clip-path="url(#${id}-receiver-clip)">
          <animate attributeName="y" from="${previousY.toFixed(2)}" to="${levelY.toFixed(2)}" dur=".7s" fill="freeze"/>
          <animate attributeName="height" from="${previousHeight.toFixed(2)}" to="${levelHeight.toFixed(2)}" dur=".7s" fill="freeze"/>
        </rect>
        <image href="assets/symboles/bouteille_liquide.svg" x="185" y="61" width="135" height="81"/>
        <text class="circuit-label" x="252" y="153">BOUTEILLE</text>
        <path class="level-pointer" d="M252 160 V190"/><text class="level-word" x="252" y="207">NIVEAU ${safeLevel < 40 ? "BAS" : safeLevel > 68 ? "HAUT" : "MOYEN"}</text>
      </g>
      <g class="library-symbol"><image href="assets/symboles/electrovanne_frigo.svg" x="74" y="112" width="82" height="62"/><text class="circuit-label" x="115" y="190">ÉLECTROVANNE</text></g>
      <g class="library-symbol"><image href="assets/symboles/detendeur_thermo_ext.svg" x="74" y="222" width="82" height="86"/><text class="circuit-label" x="115" y="322">DÉTENDEUR</text></g>
      ${openingValue === null ? "" : `<g class="opening-gauge" transform="translate(164 231)"><rect width="22" height="72" rx="8"/><rect class="opening-fill" x="4" y="${(66 - openingValue * .62).toFixed(1)}" width="14" height="${(openingValue * .62).toFixed(1)}" rx="5"/><text x="11" y="91" text-anchor="middle">${Math.round(openingValue)} %</text></g>`}
      <g class="library-symbol"><image href="assets/symboles/echangeur_a_air.svg" x="330" y="294" width="120" height="120"/><text class="circuit-label" x="390" y="421">ÉVAPORATEUR</text></g>
      <g class="library-symbol"><image href="assets/symboles/compresseur_general.svg" x="650" y="194" width="110" height="88"/><text class="circuit-label" x="705" y="300">COMPRESSEUR</text></g>

      ${pumpStage !== null ? `<g class="control-badge thermostat-control ${pumpStage > 0 ? "is-active" : ""}" transform="translate(16 20)"><rect width="176" height="48" rx="14"/><text x="88" y="20">THERMOSTAT</text><text x="88" y="39">${pumpStage > 0 ? "SATISFAIT · COUPE" : "DEMANDE · MARCHE"}</text></g><path class="control-signal ${pumpStage > 0 ? "is-active" : ""}" d="M104 68 V105 Q104 113 112 116"/>
      <g class="bp-control ${pumpStage === 3 ? "is-active" : ""}"><image href="assets/symboles/pressostat_bp.svg" x="540" y="278" width="58" height="58"/><text x="569" y="350">PRESSOSTAT BP</text><path class="control-signal ${pumpStage === 3 ? "is-active" : ""}" d="M569 330 V338 M598 294 C626 292 650 301 678 318"/></g>` : ""}

      ${valveClosed ? `<g class="blocked-marker" aria-label="Électrovanne fermée"><circle cx="68" cy="145" r="17"/><path d="M57 134 L79 156"/><text x="26" y="116">FERMÉ</text></g>` : `<g class="open-marker" aria-label="Électrovanne ouverte"><path d="M48 132 L67 145 L48 158"/><text x="23" y="116">OUVERT</text></g>`}
      ${pumpStage === 3 ? `<g class="compressor-stop"><circle cx="705" cy="238" r="30"/><path d="M685 218 L725 258"/><text x="664" y="184">ARRÊTÉ</text></g>` : ""}
      <g class="circuit-status ${statusClass}" transform="translate(235 224)"><rect width="350" height="48" rx="15"/><text x="175" y="30" text-anchor="middle">${status}</text></g>
    </svg></div>`;
  }

  function pumpDownDiagram(stage, previousLevel) {
    const levels = [44, 57, 74, 84];
    const messages = [
      "Demande de froid : le thermostat maintient l’électrovanne ouverte et le fluide parcourt le circuit.",
      "Consigne atteinte : le thermostat ferme l’électrovanne. La ligne liquide ne nourrit plus le détendeur.",
      "Le compresseur ravale les vapeurs de la basse pression ; elles sont refoulées, condensées, puis le niveau monte dans la bouteille.",
      "Quand la basse pression est suffisamment descendue, le pressostat BP arrête le compresseur. La charge est rassemblée côté condenseur et bouteille."
    ];
    return `${systemCircuitSvg({ id: "pump", level: levels[stage], previousLevel, stage, ariaLabel: messages[stage] })}<div class="readout" id="visual-readout"><strong>Temps ${stage} :</strong> ${messages[stage]}</div>`;
  }

  function renderPumpDown() {
    let stage = 0;
    let previousLevel = 44;
    setControls(`<button type="button" class="action-button primary" id="pump-next">Fermer l’électrovanne</button><button type="button" class="action-button" id="pump-reset">Reprendre</button>`);
    ui.root.innerHTML = pumpDownDiagram(stage, previousLevel);
    const update = () => {
      const levels = [44, 57, 74, 84];
      ui.root.innerHTML = pumpDownDiagram(stage, previousLevel);
      previousLevel = levels[stage];
      const next = document.getElementById("pump-next");
      next.textContent = ["Fermer l’électrovanne", "Ravaler le fluide", "Arrêt par pressostat BP", "Animation terminée"][stage];
      next.disabled = stage >= 3;
      announce(stage === 0 ? "Séquence réinitialisée." : `Temps ${stage} du pump-down conceptuel.`);
    };
    document.getElementById("pump-next").addEventListener("click", () => { stage = Math.min(3, stage + 1); update(); });
    document.getElementById("pump-reset").addEventListener("click", () => { previousLevel = [44, 57, 74, 84][stage]; stage = 0; update(); });
  }

  function renderVariations() {
    setControls("");
    ui.root.innerHTML = `<div class="variation-lab">
      <div class="variation-controls">
        <label for="ambient-range"><span>Température extérieure</span><output id="ambient-output">15 °C</output><input id="ambient-range" type="range" min="-5" max="40" value="15"></label>
        <label for="demand-range"><span>Ouverture du détendeur</span><output id="demand-output">55 %</output><input id="demand-range" type="range" min="20" max="100" value="55"></label>
      </div>
      <div class="variation-circuit" id="variation-circuit"></div>
      <div class="variation-status" id="variation-status" aria-live="polite"></div>
    </div>`;
    const ambient = document.getElementById("ambient-range");
    const demand = document.getElementById("demand-range");
    const circuit = document.getElementById("variation-circuit");
    let previousLevel = 54;
    const update = () => {
      const ambientValue = Number(ambient.value);
      const demandValue = Number(demand.value);
      const ambientRatio = (ambientValue + 5) / 45;
      const openingRatio = (demandValue - 20) / 80;
      const level = Math.round(Math.max(22, Math.min(86, 84 - ambientRatio * 30 - openingRatio * 32)));
      const condenserWords = ambientValue >= 28 ? "la température extérieure augmente la charge thermique représentée" : ambientValue <= 8 ? "la température extérieure réduit la charge thermique représentée" : "la température extérieure correspond à une charge thermique moyenne";
      const demandWords = demandValue >= 70 ? "le détendeur est largement ouvert et davantage de fluide circule vers l’évaporateur" : demandValue <= 35 ? "le détendeur est peu ouvert et la réserve revient vers la bouteille" : "le détendeur présente une ouverture moyenne";
      const levelWords = level < 40 ? "réserve basse" : level > 68 ? "réserve haute" : "réserve moyenne";
      document.getElementById("ambient-output").textContent = `${ambientValue} °C`;
      document.getElementById("demand-output").textContent = `${demandValue} %`;
      circuit.innerHTML = systemCircuitSvg({ id: "variation", level, previousLevel, stage: "variation", opening: demandValue, ariaLabel: `Circuit en fonctionnement : ${condenserWords}, ${demandWords}, ${levelWords} dans la bouteille.` });
      document.getElementById("variation-status").innerHTML = `<strong>Charge totale constante.</strong> Dans cette animation, ${condenserWords} ; ${demandWords} ; la bouteille compense avec une <strong>${levelWords}</strong>.`;
      previousLevel = level;
      announce(`Simulation qualitative. ${condenserWords}. ${demandWords}. Bouteille : ${levelWords}.`);
    };
    ambient.addEventListener("input", update);
    demand.addEventListener("input", update);
    update();
  }

  function renderSizing() {
    setControls("");
    ui.root.innerHTML = `<div class="range-panel"><div class="level-meter"><div class="level-fill" id="capacity-fill"></div><span id="capacity-value">55</span></div>
      <label for="capacity-range"><strong>Variation de charge représentée</strong><input id="capacity-range" type="range" min="20" max="85" value="55"></label>
      <div class="neutral-box"><strong>Simulation pédagogique :</strong> ce curseur ne définit ni le remplissage admissible ni le dimensionnement réel.</div></div>`;
    const range = document.getElementById("capacity-range");
    const update = () => {
      document.getElementById("capacity-fill").style.height = `${range.value}%`;
      document.getElementById("capacity-value").textContent = `${range.value} %`;
      announce(`Volume liquide représenté : ${range.value} pour cent. Simulation sans valeur de dimensionnement.`);
    };
    range.addEventListener("input", update);
    update();
  }

  function renderMounting() {
    setControls(`<button class="choice-button" data-mount="vertical">Modèle vertical</button><button class="choice-button" data-mount="horizontal">Modèle horizontal</button>`);
    const activate = (type) => {
      const active = ui.controls.querySelector(`[data-mount="${type}"]`);
      markActive("[data-mount]", active);
      ui.root.innerHTML = (type === "vertical" ? receiverSvg({ labels: true, level: 55, title: "Modèle vertical conçu ainsi" }) : horizontalReceiverSvg()) + `<div class="readout" id="visual-readout">${type === "vertical" ? "Le prélèvement descend dans une bouteille prévue pour rester verticale." : "Le tube et les supports sont conçus spécifiquement pour l’orientation horizontale."}</div>`;
      announce(type === "vertical" ? "Modèle vertical." : "Modèle horizontal conçu avec ses propres supports et prises.");
    };
    ui.controls.querySelectorAll("[data-mount]").forEach((button) => button.addEventListener("click", () => activate(button.dataset.mount)));
    activate("vertical");
  }

  function safetyVesselSvg(mode) {
    if (mode === "desp") {
      return `<div class="diagram safety-vessel mode-desp" role="img" aria-label="Exemple pédagogique de plaque d’identification d’une bouteille liquide avec les champs PS, TS, volume, identification, année, fluide et marquage"><svg viewBox="0 0 760 380" aria-hidden="true">
        <text class="plate-main-title" x="380" y="25">PLAQUE D’IDENTIFICATION · EXEMPLE DE LECTURE</text>
        <g class="detailed-nameplate">
          <rect class="plate-frame" x="32" y="43" width="510" height="285" rx="12"/>
          <path class="plate-header" d="M44 43 H530 Q542 43 542 55 V82 H32 V55 Q32 43 44 43 Z"/>
          <text class="plate-header-text" x="287" y="67">EXEMPLE PÉDAGOGIQUE · RELEVER, NE PAS RÉGLER</text>
          <line class="plate-rule" x1="48" y1="126" x2="526" y2="126"/>
          <line class="plate-rule" x1="48" y1="170" x2="526" y2="170"/>
          <line class="plate-rule" x1="48" y1="214" x2="526" y2="214"/>
          <line class="plate-rule" x1="48" y1="258" x2="526" y2="258"/>
          <line class="plate-rule" x1="287" y1="82" x2="287" y2="304"/>

          <g class="plate-field"><text class="plate-field-label" x="52" y="102">ÉQUIPEMENT / TYPE</text><text class="plate-field-value" x="52" y="120">[référence de la bouteille]</text></g>
          <g class="plate-field"><text class="plate-field-label" x="302" y="102">N° · ANNÉE</text><text class="plate-field-value" x="302" y="120">[identifiant] · [année]</text></g>
          <g class="plate-field plate-field-critical"><text class="plate-field-label" x="52" y="146">PS · PRESSION MAX. ADMISSIBLE</text><text class="plate-field-value" x="52" y="164">[valeur de la plaque] bar</text></g>
          <g class="plate-field plate-field-critical"><text class="plate-field-label" x="302" y="146">TS MIN / MAX</text><text class="plate-field-value" x="302" y="164">[valeurs] °C</text></g>
          <g class="plate-field"><text class="plate-field-label" x="52" y="190">V · VOLUME INTERNE</text><text class="plate-field-value" x="52" y="208">[valeur] L</text></g>
          <g class="plate-field"><text class="plate-field-label" x="302" y="190">FLUIDE / GROUPE</text><text class="plate-field-value" x="302" y="208">[désignation / groupe]</text></g>
          <g class="plate-field"><text class="plate-field-label" x="52" y="234">PT / DATE · SI INDIQUÉES</text><text class="plate-field-value" x="52" y="252">[épreuve] bar · [date]</text></g>
          <g class="plate-field"><text class="plate-field-label" x="302" y="234">MARQUAGE / CATÉGORIE</text><text class="plate-field-value" x="302" y="252">[marquages applicables]</text></g>
          <g class="plate-alert"><rect x="48" y="269" width="478" height="35" rx="7"/><text x="287" y="292">PS ≠ pression mesurée · TS ≠ température ambiante</text></g>
        </g>
        <g class="plate-receiver" transform="translate(565 48)">
          <rect class="safety-shell" x="20" y="55" width="132" height="224" rx="45"/>
          <path class="safety-liquid" d="M24 189 H148 V235 Q148 275 108 275 H64 Q24 275 24 235 Z"/>
          <rect class="safety-neck" x="73" y="35" width="26" height="31" rx="5"/>
          <rect class="receiver-plate-mark" x="56" y="120" width="60" height="43" rx="5"/>
          <text class="receiver-plate-text" x="86" y="138">PLAQUE</text><text class="receiver-plate-text" x="86" y="153">À CONTRÔLER</text>
          <path class="plate-pointer" d="M118 140 H170"/><path class="plate-pointer-head" d="M119 140 L132 132 V148 Z"/>
          <text class="plate-pointer-label" x="86" y="311">sur le récipient</text>
        </g>
      </svg></div>`;
    }
    const modeMarkup = {
      relief: `<g class="relief-device"><image href="assets/symboles/vanne_securite.svg" x="345" y="18" width="72" height="100"/><path class="safety-discharge mobile" d="M382 45 C462 26 532 46 574 88"/><text class="danger-word" x="510" y="112">OUVERTURE TARÉE</text><text class="safety-small" x="510" y="133">décharge vers un dispositif prévu</text></g>`,
      rupture: `<g class="rupture-devices"><g transform="translate(245 44)"><circle class="rupture-disc" cx="55" cy="42" r="30"/><path class="rupture-break mobile" d="M40 20 L50 36 L43 47 L61 58 L70 70"/><text x="55" y="92">DISQUE</text><text class="safety-small" x="55" y="111">pression · usage unique</text></g><g transform="translate(420 44)"><path class="fusible-plug" d="M28 68 H82 L72 25 H38 Z"/><path class="flame mobile" d="M55 17 C39 5 49 -10 59 -18 C59 -5 75 0 70 17 Z"/><text x="55" y="92">BOUCHON FUSIBLE</text><text class="safety-small" x="55" y="111">chaleur / incendie</text></g></g>`
    }[mode];
    return `<div class="diagram safety-vessel mode-${mode}" role="img" aria-label="Bouteille liquide sous pression : ${mode === "desp" ? "lecture de la plaque DESP" : mode === "relief" ? "soupape de sécurité à ouverture tarée" : "comparaison du disque de rupture et du bouchon fusible"}"><svg viewBox="0 0 760 380" aria-hidden="true">
      <rect class="safety-shell" x="280" y="108" width="200" height="235" rx="62"/>
      <path class="safety-liquid" d="M284 245 H476 V282 Q476 339 419 339 H341 Q284 339 284 282 Z"/>
      <rect class="safety-neck" x="365" y="83" width="30" height="35" rx="6"/>
      <path class="pressure-wave mobile" d="M315 222 Q380 188 445 222 M323 244 Q380 214 437 244"/>
      <g class="danger-badge" transform="translate(35 270)"><rect width="210" height="60" rx="16"/><text x="105" y="25">DANGER · SURPRESSION</text><text x="105" y="47">limites PS à respecter</text></g>
      ${modeMarkup}
    </svg></div>`;
  }

  function renderSafety() {
    const notes = {
      desp: "<strong>LECTURE DE PLAQUE :</strong> PS = pression maximale admissible ; TS = limites minimale et maximale de température ; V = volume interne. Relever aussi l’identification, l’année, le fluide ou groupe et les marquages. Une mention PMS peut exister selon le matériel, mais la donnée DESP de référence reste PS. PT, si elle figure, est une pression d’épreuve : ce n’est pas une pression de service.",
      relief: "<strong>SOUPAPE :</strong> elle s’ouvre à une pression réglée pour limiter la surpression et peut se refermer après décharge. Son tarage, son débit et l’évacuation sont déterminés par la conception ; aucune valeur universelle n’est donnée ici.",
      rupture: "<strong>NE PAS CONFONDRE :</strong> un disque de rupture cède sous l’effet de la pression et doit être remplacé. Le bouchon fusible réagit à une température élevée, notamment lors d’un incendie ; il ne constitue pas à lui seul une protection primaire contre toute surpression."
    };
    setControls(`<button class="choice-button" data-safety="desp">DESP · plaque</button><button class="choice-button" data-safety="relief">Soupape tarée</button><button class="choice-button" data-safety="rupture">Disque / fusible</button>`);
    const activate = (key) => {
      const active = ui.controls.querySelector(`[data-safety="${key}"]`);
      markActive("[data-safety]", active);
      ui.root.innerHTML = `${safetyVesselSvg(key)}<div class="readout" id="visual-readout">${notes[key]}</div>`;
      announce(notes[key].replace(/<[^>]+>/g, " "));
    };
    ui.controls.querySelectorAll("[data-safety]").forEach((button) => button.addEventListener("click", () => activate(button.dataset.safety)));
    activate("desp");
  }

  function renderQuiz() {
    if (quiz.complete) {
      setControls(`<button type="button" class="action-button primary" id="restart-quiz">Refaire le défi</button>`);
      const success = quiz.score >= 5;
      ui.root.innerHTML = `<div class="quiz-result"><span class="quiz-score">${quiz.score}/6</span><strong>${success ? "Objectif atteint" : "Encore un passage utile"}</strong><p>${success ? "Tu peux expliquer la bouteille, sa vanne et les principales données de plaque." : "Relis les corrections puis recommence."}</p></div>`;
      document.getElementById("restart-quiz").addEventListener("click", resetQuiz);
      updateNavigation();
      return;
    }
    const question = quizQuestions[quiz.index];
    setControls(quiz.answered ? `<button type="button" class="action-button primary" id="next-question">${quiz.index === quizQuestions.length - 1 ? "Voir le bilan" : "Question suivante"}</button>` : "");
    ui.root.innerHTML = `<div class="quiz-shell"><div class="quiz-meta"><span>Question ${quiz.index + 1} sur ${quizQuestions.length}</span><span>Score : ${quiz.score}</span></div><h3 class="quiz-prompt">${question.prompt}</h3><div class="quiz-answers">${question.answers.map((answer, index) => `<button type="button" class="quiz-choice" data-answer="${index}">${answer}</button>`).join("")}</div><div class="quiz-feedback" id="quiz-feedback">Choisis une réponse.</div></div>`;
    ui.root.querySelectorAll("[data-answer]").forEach((button) => button.addEventListener("click", () => answerQuiz(Number(button.dataset.answer))));
    if (quiz.answered) restoreAnsweredQuiz(question);
  }

  function answerQuiz(answerIndex) {
    if (quiz.answered) return;
    quiz.answered = true;
    const question = quizQuestions[quiz.index];
    if (answerIndex === question.correct) quiz.score += 1;
    ui.root.querySelectorAll("[data-answer]").forEach((button, index) => {
      button.disabled = true;
      if (index === question.correct) button.classList.add("good");
      if (index === answerIndex && index !== question.correct) button.classList.add("bad");
    });
    const correct = answerIndex === question.correct;
    document.getElementById("quiz-feedback").innerHTML = `<strong>${correct ? "✓ Correct." : "✗ À revoir."}</strong> ${question.why}`;
    announce(`${correct ? "Correct." : "À revoir."} ${question.why}`);
    setControls(`<button type="button" class="action-button primary" id="next-question">${quiz.index === quizQuestions.length - 1 ? "Voir le bilan" : "Question suivante"}</button>`);
    document.getElementById("next-question").addEventListener("click", nextQuizQuestion);
  }

  function restoreAnsweredQuiz(question) {
    ui.root.querySelectorAll("[data-answer]").forEach((button, index) => {
      button.disabled = true;
      if (index === question.correct) button.classList.add("good");
    });
    document.getElementById("quiz-feedback").innerHTML = `<strong>Réponse enregistrée.</strong> ${question.why}`;
    const next = document.getElementById("next-question");
    if (next) next.addEventListener("click", nextQuizQuestion);
  }

  function nextQuizQuestion() {
    if (quiz.index >= quizQuestions.length - 1) quiz.complete = true;
    else { quiz.index += 1; quiz.answered = false; }
    renderQuiz();
  }

  function resetQuiz() {
    quiz.index = 0; quiz.score = 0; quiz.answered = false; quiz.complete = false;
    renderQuiz(); updateNavigation();
  }

  function renderLesson(index, focusTitle = false) {
    stopSpeech();
    current = Math.max(0, Math.min(lessons.length - 1, index));
    furthest = Math.max(furthest, current);
    const lesson = lessons[current];
    ui.kicker.textContent = lesson.kicker;
    ui.title.textContent = lesson.title;
    ui.intro.textContent = lesson.intro;
    ui.detail.innerHTML = lesson.detail;
    ui.takeaway.textContent = lesson.takeaway;
    ui.visualTitle.textContent = lesson.visualTitle;
    ui.visualHint.textContent = lesson.visualHint;
    ui.caption.textContent = lesson.caption;
    setControls("");
    ui.root.innerHTML = "";
    lesson.render();
    updateStepper();
    updateNavigation();
    if (focusTitle) ui.title.focus?.({ preventScroll: true });
  }

  function buildStepper() {
    ui.stepper.style.setProperty("--step-count", lessons.length);
    ui.stepper.innerHTML = lessons.map((lesson, index) => `<button type="button" class="step-button" data-step="${index}" aria-label="Étape ${index + 1} : ${lesson.short}"><span class="step-number">${index + 1}</span><span class="step-name">${lesson.short}</span></button>`).join("");
    ui.stepper.querySelectorAll("[data-step]").forEach((button) => button.addEventListener("click", () => renderLesson(Number(button.dataset.step))));
  }

  function updateStepper() {
    ui.stepper.querySelectorAll("[data-step]").forEach((button, index) => {
      button.classList.toggle("active", index === current);
      button.classList.toggle("reached", index <= furthest);
      if (index === current) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
    });
  }

  function updateNavigation() {
    ui.previous.disabled = current === 0;
    const finalStep = current === lessons.length - 1;
    ui.next.disabled = finalStep && !quiz.complete;
    ui.next.textContent = finalStep ? (quiz.complete ? "Recommencer →" : "Terminer le défi") : "Continuer →";
    ui.progressLabel.textContent = `Étape ${current + 1} sur ${lessons.length}`;
    ui.progressBar.style.width = `${((current + 1) / lessons.length) * 100}%`;
  }

  function nextLesson() {
    if (current === lessons.length - 1) {
      if (!quiz.complete) return;
      resetQuiz(); furthest = 0; renderLesson(0); return;
    }
    renderLesson(current + 1);
  }

  function previousLesson() { if (current > 0) renderLesson(current - 1); }

  function readRate() {
    try {
      const stored = Number(localStorage.getItem(STORAGE_RATE));
      return RATE_VALUES.includes(stored) ? stored : 0.95;
    } catch (_) { return 0.95; }
  }

  function storeRate(value) { try { localStorage.setItem(STORAGE_RATE, String(value)); } catch (_) { /* fonctionnement sans stockage */ } }
  function chooseVoice() {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    selectedVoice = voices.find((voice) => /^fr-FR$/i.test(voice.lang)) || voices.find((voice) => /^fr/i.test(voice.lang)) || null;
  }
  function spokenText() {
    const lesson = lessons[current];
    const temporary = document.createElement("div");
    temporary.innerHTML = lesson.detail;
    return `${lesson.title}. ${lesson.intro} ${temporary.textContent || ""} À retenir : ${lesson.takeaway}`.replace(/\s+/g, " ").trim();
  }
  function startSpeech() {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { announce("La lecture vocale n’est pas disponible sur cet appareil."); return; }
    if (speaking && paused) { window.speechSynthesis.resume(); paused = false; updateVoiceButton(); return; }
    if (speaking) { window.speechSynthesis.pause(); paused = true; updateVoiceButton(); return; }
    stopSpeech();
    const run = ++speechRun;
    const utterance = new SpeechSynthesisUtterance(spokenText());
    utterance.lang = "fr-FR";
    utterance.rate = voiceRate;
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onstart = () => { if (run !== speechRun) return; speaking = true; paused = false; updateVoiceButton(); };
    utterance.onend = utterance.onerror = () => { if (run !== speechRun) return; speaking = false; paused = false; updateVoiceButton(); };
    window.speechSynthesis.speak(utterance);
  }
  function stopSpeech() {
    speechRun += 1;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    speaking = false; paused = false; updateVoiceButton();
  }
  function updateVoiceButton() {
    ui.voiceButton.classList.toggle("playing", speaking && !paused);
    ui.voiceButton.innerHTML = speaking && !paused ? "Ⅱ <span>Pause</span>" : (paused ? "▶ <span>Reprendre</span>" : "▶ <span>Écouter</span>");
    ui.voiceButton.setAttribute("aria-label", speaking && !paused ? "Mettre la lecture en pause" : (paused ? "Reprendre la lecture" : "Écouter l’écran"));
  }

  ui.previous.addEventListener("click", previousLesson);
  ui.next.addEventListener("click", nextLesson);
  ui.voiceButton.addEventListener("click", startSpeech);
  ui.voiceRate.value = String(voiceRate);
  ui.voiceRate.addEventListener("change", () => {
    const value = Number(ui.voiceRate.value);
    if (RATE_VALUES.includes(value)) { voiceRate = value; storeRate(value); if (speaking || paused) { stopSpeech(); startSpeech(); } }
  });
  ui.sourceButton.addEventListener("click", () => {
    if (typeof ui.sourcesDialog.showModal === "function") ui.sourcesDialog.showModal(); else ui.sourcesDialog.setAttribute("open", "");
  });
  document.addEventListener("keydown", (event) => {
    if (ui.sourcesDialog.open) return;
    const target = event.target;
    if (target && /INPUT|SELECT|TEXTAREA|BUTTON/.test(target.tagName)) return;
    if (event.key === "ArrowRight") nextLesson();
    if (event.key === "ArrowLeft") previousLesson();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopSpeech(); });
  window.addEventListener("pagehide", stopSpeech);
  if (window.speechSynthesis) {
    chooseVoice();
    window.speechSynthesis.addEventListener?.("voiceschanged", chooseVoice);
  } else {
    ui.voiceButton.disabled = true;
  }

  buildStepper();
  renderLesson(0);
})();
