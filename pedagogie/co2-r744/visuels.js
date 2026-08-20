/* =====================================================================
   visuels.js — CE QUE MONTRE L'ÉCRAN DE GAUCHE
   ---------------------------------------------------------------------
   Deux sortes de visuels, et une seule porte d'entrée `render`.

   1. LES DESSINS, dans visuels-svg.js : repris des parcours Design de
      F. Henninot. On les sert tels quels, `{ type: "svg", nom: "..." }`.
   2. LES COMPOSÉS, décrits en données dans cours.js : cartes, tableau,
      comparatif, pastilles, chaîne. Ils évitent d'écrire un dessin par
      écran là où l'écran n'a rien à dessiner — et ils restent lisibles à
      l'impression, ce qu'une image de texte n'est jamais.

   Un seul visuel est fabriqué ici et nulle part ailleurs : `etat-pt`, le
   diagramme pression-température du CO₂. Il n'existait pas dans la source
   et le chapitre « Carte d'identité » en avait besoin pour montrer les
   trois points remarquables les uns par rapport aux autres. Les points
   tracés sont les valeurs de saturation du R744, pas une allure inventée.
   ===================================================================== */

window.CO2Visuals = (() => {
  "use strict";

  const SVG = window.CO2_SVG || {};

  const echapper = (v) => String(v)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

  /* ---------------------------------------------------------------
     Le diagramme pression-température du R744.
     x : température de −90 à +50 °C · y : pression de 0,5 à 150 bar,
     en échelle logarithmique. Les deux fonctions de placement sont
     écrites ici pour que quiconque relit puisse refaire le calcul :
       x = 90 + (T + 90) × 6,2143
       y = 560 − (log10(P) + 0,30103) × 209,9
     --------------------------------------------------------------- */
  const ETAT_PT = `
<svg viewBox="0 0 1000 620" style="width:100%;height:auto;display:block">
  <rect x="90" y="40" width="870" height="520" fill="#ffffff"></rect>
  <path d="M90,560H960M90,430H960M90,300H960M90,170H960" stroke="#eef1f5" stroke-width="1"></path>
  <path d="M297.5,40 L297.5,346.9 L842,104.7 L842,40 Z" fill="#fff1ea" opacity=".55"></path>
  <path d="M90,40V560H960" stroke="#1b3a63" stroke-width="2.5" fill="none"></path>

  <path d="M121,539 L161,495.6 L214,431.7 L276,369.2 L297.5,346.9"
        fill="none" stroke="#3a8fd6" stroke-width="4" stroke-dasharray="12 7"></path>
  <path d="M297.5,346.9 L338.5,321.6 L400.6,286.3 L462.8,254.3 L525,225 L587.1,198 L649.3,173 L711.4,149.6 L773.6,127.7 L842,104.7"
        fill="none" stroke="#1b3a63" stroke-width="4.5"></path>
  <path d="M297.5,346.9 L312,240 L322,140 L328,40" fill="none" stroke="#8a96a3" stroke-width="3" stroke-dasharray="8 6"></path>

  <path d="M90,104.7H842" stroke="#ff6b35" stroke-width="2.5" stroke-dasharray="10 7"></path>
  <path d="M842,104.7V560" stroke="#ff6b35" stroke-width="2.5" stroke-dasharray="10 7"></path>
  <circle cx="842" cy="104.7" r="10" fill="#ff6b35" stroke="#ffffff" stroke-width="3"></circle>
  <circle cx="842" cy="104.7" r="19" fill="none" stroke="#ff6b35" stroke-width="2.5" class="co2-pulse"></circle>
  <circle cx="297.5" cy="346.9" r="9" fill="#1b3a63" stroke="#ffffff" stroke-width="3"></circle>
  <circle cx="161.4" cy="495.6" r="8" fill="#3a8fd6" stroke="#ffffff" stroke-width="3"></circle>
  <circle cx="773.6" cy="127.7" r="7" fill="#6b7885" stroke="#ffffff" stroke-width="2.5"></circle>

  <g font-family="Trebuchet MS,sans-serif" font-weight="bold" font-size="21" fill="#c9420d">
    <text x="560" y="70">ZONE SUPERCRITIQUE</text>
  </g>
  <g font-family="Trebuchet MS,sans-serif" font-weight="bold" font-size="20" fill="#1b3a63">
    <text x="170" y="130">SOLIDE</text>
    <text x="470" y="150">LIQUIDE</text>
    <text x="640" y="480">VAPEUR</text>
  </g>
  <g font-family="Calibri,sans-serif" font-size="19" fill="#1b3a63">
    <text x="855" y="98" font-weight="bold" fill="#c9420d">Point critique</text>
    <text x="855" y="120" fill="#c9420d">31,0 °C — 73,8 bar</text>
    <text x="310" y="360" font-weight="bold">Point triple</text>
    <text x="310" y="382">−56,6 °C — 5,18 bar</text>
    <text x="175" y="510" font-weight="bold">Sublimation</text>
    <text x="175" y="532">−78,5 °C — 1,013 bar</text>
    <text x="560" y="182" font-size="17" fill="#6b7885">≈ 57 bar à 20 °C : la pression à l’arrêt</text>
  </g>
  <g font-family="Calibri,sans-serif" font-size="17" fill="#8a96a3">
    <text x="80" y="565" text-anchor="end">0,5</text>
    <text x="80" y="435" text-anchor="end">2</text>
    <text x="80" y="305" text-anchor="end">8</text>
    <text x="80" y="175" text-anchor="end">32</text>
    <text x="80" y="50" text-anchor="end">150</text>
    <text x="161" y="583" text-anchor="middle">−78,5</text>
    <text x="297" y="583" text-anchor="middle">−56,6</text>
    <text x="649" y="583" text-anchor="middle">0</text>
    <text x="842" y="583" text-anchor="middle">31</text>
  </g>
  <text x="525" y="608" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">Température (°C)</text>
  <text x="26" y="300" text-anchor="middle" transform="rotate(-90 26 300)" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">Pression (bar, échelle log)</text>
</svg>`;

  /* Les trois destinations de la vapeur de détente, côte à côte. */
  function troisFlash() {
    const vignettes = [
      { svg: SVG.flashSimple, titre: "Booster simple", texte: "détendue jusqu’à 28 bar, à l’aspiration MT" },
      { svg: SVG.flashParallele, titre: "Compression parallèle", texte: "aspirée à 38 bar par un compresseur dédié" },
      { svg: SVG.flashEjecteur, titre: "Éjecteur", texte: "remontée par la détente elle-même" }
    ];
    return `<div class="visual-html"><div class="co2-trio">${vignettes.map((v) => `
      <figure class="co2-vignette">
        ${v.svg || ""}
        <figcaption><strong>${echapper(v.titre)}</strong><span>${echapper(v.texte)}</span></figcaption>
      </figure>`).join("")}</div></div>`;
  }

  /* LES DEUX VUES EN PHASE. Le circuit et le diagramme portent la même
     animation de 16 secondes. Ils sont posés par un seul innerHTML : leurs
     horloges SMIL démarrent donc au même instant et le point qu'on suit dans
     la centrale est celui qu'on voit se déplacer sur le tracé.
     La couleur suit l'ÉTAT du fluide, pas son chemin — c'est le même code
     dans les deux dessins, d'où la légende commune. */
  function boosterDouble() {
    const etats = [
      ["#ff6b35", "gaz haute pression"],
      ["#1b3a63", "liquide, puis détente"],
      ["#9c8fd6", "vapeur de détente"],
      ["#3a8fd6", "basse pression, évaporation"]
    ];
    return `<div class="visual-html co2-large"><div class="co2-double">
      <figure><figcaption>Dans la centrale</figcaption>${SVG.boosterAnime || ""}</figure>
      <figure><figcaption>Sur le diagramme log p/h</figcaption>${SVG.diagrammeBooster || ""}</figure>
    </div>
    <p class="co2-legende">${etats.map(([c, n]) =>
      `<span><i style="background:${c}"></i>${echapper(n)}</span>`).join("")}</p>
    </div>`;
  }

  const TON = { ok: "ok", info: "info", attente: "wait", danger: "danger" };

  function cartes(v) {
    return `<div class="visual-html"><div class="co2-bloc">
      ${v.titre ? `<h3 class="co2-titre">${echapper(v.titre)}</h3>` : ""}
      <div class="co2-cartes">${v.items.map((it) => `
        <article class="mini-card co2-carte" data-ton="${TON[it.ton] || "info"}">
          <h3>${echapper(it.titre)}</h3>
          <p>${echapper(it.texte)}</p>
        </article>`).join("")}</div>
    </div></div>`;
  }

  function pastilles(v) {
    return `<div class="visual-html"><div class="co2-bloc">
      ${v.titre ? `<h3 class="co2-titre">${echapper(v.titre)}</h3>` : ""}
      <div class="co2-pastilles">${v.items.map((it) => `
        <article data-ton="${TON[it.ton] || "info"}">
          <span class="status-pill ${TON[it.ton] === "ok" ? "ok" : TON[it.ton] === "danger" ? "danger" : "info"}">${echapper(it.cle)}</span>
          <p>${echapper(it.texte)}</p>
        </article>`).join("")}</div>
      ${v.note ? `<p class="co2-note">${echapper(v.note)}</p>` : ""}
    </div></div>`;
  }

  function tableau(v) {
    return `<div class="visual-html"><div class="co2-bloc">
      ${v.titre ? `<h3 class="co2-titre">${echapper(v.titre)}</h3>` : ""}
      <table class="co2-table"><tbody>${v.lignes.map((l) => `
        <tr><th scope="row">${echapper(l[0])}</th><td>${echapper(l[1])}</td></tr>`).join("")}</tbody></table>
      ${v.note ? `<p class="co2-note">${echapper(v.note)}</p>` : ""}
    </div></div>`;
  }

  function comparatif(v) {
    return `<div class="visual-html"><div class="co2-bloc">
      ${v.titre ? `<h3 class="co2-titre">${echapper(v.titre)}</h3>` : ""}
      <table class="co2-table co2-table-large">
        <thead><tr>${v.colonnes.map((c) => `<th scope="col">${echapper(c)}</th>`).join("")}</tr></thead>
        <tbody>${v.lignes.map((l) => `<tr>${l.map((c, i) => i === 0
          ? `<th scope="row">${echapper(c)}</th>` : `<td>${echapper(c)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
      ${v.note ? `<p class="co2-note">${echapper(v.note)}</p>` : ""}
    </div></div>`;
  }

  function chaine(v) {
    return `<div class="visual-html"><div class="co2-bloc">
      ${v.titre ? `<h3 class="co2-titre">${echapper(v.titre)}</h3>` : ""}
      <ol class="co2-chaine">${v.etapes.map((e, i) => `
        <li><span>${i + 1}</span>${echapper(e)}</li>`).join("")}</ol>
    </div></div>`;
  }

  /* Une planche du fonds inerWeb, servie telle quelle. Elle porte son propre
     style et ses propres animations : dans une balise <img>, elle s'anime donc
     sans rien devoir à la page. Le texte de remplacement est OBLIGATOIRE — la
     voix lit la légende, mais un lecteur d'écran lit celui-ci. */
  function planche(v) {
    return `<img class="co2-planche" src="illustrations/${echapper(v.fichier)}" alt="${echapper(v.alt || "")}">`;
  }

  function render(v) {
    if (!v) return "";
    if (v.type === "svg") {
      if (v.nom === "etat-pt") return ETAT_PT;
      if (v.nom === "trois-flash") return troisFlash();
      if (v.nom === "booster-double") return boosterDouble();
      if (v.nom === "booster-anime") return SVG.boosterAnime || "";
      if (v.nom === "diagramme-booster") return SVG.diagrammeBooster || "";
      return SVG[v.nom] || "";
    }
    if (v.type === "image") return planche(v);
    if (v.type === "cartes") return cartes(v);
    if (v.type === "pastilles") return pastilles(v);
    if (v.type === "tableau") return tableau(v);
    if (v.type === "comparatif") return comparatif(v);
    if (v.type === "chaine") return chaine(v);
    return "";
  }

  /* L'écran d'une question : on ne montre pas le schéma de la leçon, qui
     donnerait la réponse. On montre où l'on en est. */
  function quiz(index, total, score, chapitre) {
    return `<div class="visual-html"><div class="co2-bloc co2-quiz-visuel">
      <h3 class="co2-titre">${echapper(chapitre)}</h3>
      <p class="co2-quiz-index"><small>question</small><strong>${index + 1}</strong><small>sur ${total}</small></p>
      <p class="co2-quiz-score">${score} bonne${score > 1 ? "s" : ""} réponse${score > 1 ? "s" : ""} pour l’instant</p>
      <p class="co2-note">Le score sert à repérer ce qui est à reprendre. Rien n’est transmis ni enregistré.</p>
    </div></div>`;
  }

  function final(score, total, suivant) {
    const part = total ? score / total : 0;
    const ton = part >= 0.8 ? "ok" : part >= 0.5 ? "wait" : "danger";
    return `<div class="visual-html"><div class="co2-bloc co2-final" data-ton="${ton}">
      <p class="co2-final-score"><strong>${score}</strong><span>sur ${total}</span></p>
      <p class="co2-final-mot">${part >= 0.8 ? "L’escale est acquise." : part >= 0.5 ? "À reprendre en partie." : "À refaire avant de continuer."}</p>
      ${suivant ? `<p class="co2-note">Escale suivante : ${echapper(suivant)}</p>` : ""}
    </div></div>`;
  }

  /* Aucun visuel de cette ligne n'est interactif : rien à câbler. La
     fonction existe pour garder le même contrat que les autres modules
     du pack, où `wire` branche des curseurs et des champs de calcul. */
  function wire() {}

  /* Les définitions communes — la cloche du CO₂ et la grille du diagramme —
     sont posées UNE fois dans la page. Quatre dessins les appellent par
     <use href="#co2dome"> : sans ce bloc, ils s'afficheraient vides. */
  if (SVG.defs) {
    const hote = document.createElement("div");
    hote.setAttribute("aria-hidden", "true");
    hote.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    hote.innerHTML = SVG.defs;
    document.body.appendChild(hote);
  }

  return { render, wire, quiz, final };
})();
