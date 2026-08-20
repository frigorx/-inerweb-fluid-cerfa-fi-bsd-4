/* =====================================================================
   LISIBILITÉ — taille du texte + police adaptée (DYS), pour tous.
   ---------------------------------------------------------------------
   CONTRAT : script autonome, aucune dépendance au moteur. Il s'ajoute
   sur n'importe quelle page (pack, projection, galerie, expériences) :
     <script src=".../moteur/lisibilite.js"></script>
   Il pose un bouton flottant « Aa » qui ouvre un petit panneau :
     · taille du texte  − / + (70 % → 160 %, zoom global de la page) ;
     · « Police adaptée (DYS) » : bascule vers Lexend, police VARIABLE
       embarquée (moteur/polices/Lexend-variable.woff2, licence OFL) —
       formes de lettres espacées et sans ambiguïté, conçue pour la
       fluidité de lecture. Jamais chargée tant qu'on ne l'active pas.
   Réglages mémorisés en localStorage (clé pilote_lisibilite), partagés
   par toutes les pages servies depuis la même origine.
   PIÈGES : le chemin de la police est déduit du src de CE script — ne
   pas renommer polices/ sans repasser ici. Le widget disparaît à
   l'impression (@media print). Zoom via la propriété CSS `zoom`
   (standardisée, Chrome/Edge/Firefox 126+) : aucune conversion rem.
   ===================================================================== */
(function () {
  "use strict";
  if (window.__piloteLisibilite) return; // double inclusion : inoffensive
  window.__piloteLisibilite = true;

  var CLE = "pilote_lisibilite";
  var MIN = 70, MAX = 160, PAS = 10;

  // Racine du dossier moteur/, déduite de l'adresse de ce script.
  var script = document.currentScript;
  var racine = (script && script.src ? script.src : "").replace(/lisibilite\.js.*$/, "");

  var etat = { taille: 100, dys: false };
  try {
    var lu = JSON.parse(localStorage.getItem(CLE) || "{}");
    if (typeof lu.taille === "number" && lu.taille >= MIN && lu.taille <= MAX) etat.taille = lu.taille;
    if (typeof lu.dys === "boolean") etat.dys = lu.dys;
  } catch (e) { /* localStorage indisponible : réglages de la session seulement */ }

  function memoriser() {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* tant pis */ }
  }

  function appliquer() {
    document.documentElement.style.zoom = etat.taille === 100 ? "" : etat.taille + "%";
    // Les cours projetés tiennent normalement dans 100dvh. Au-delà de 100 %,
    // la lisibilité prime : les feuilles concernées peuvent rendre leur zone
    // centrale déplaçable et garder la navigation accessible en permanence.
    document.documentElement.classList.toggle("lisibilite-agrandie", etat.taille > 100);
    document.documentElement.classList.toggle("police-dys", etat.dys);
    var aff = document.getElementById("lisib-taille");
    if (aff) aff.textContent = etat.taille + " %";
    var coche = document.getElementById("lisib-dys");
    if (coche) coche.checked = etat.dys;
  }

  /* ---- styles : @font-face (déclaré d'emblée, téléchargé seulement à
     la première utilisation réelle par le navigateur) + widget ---- */
  var css =
    "@font-face{font-family:'Lexend';src:url('" + racine + "polices/Lexend-variable.woff2') format('woff2');" +
    "font-weight:100 900;font-display:swap}" +
    /* La bascule DYS : tout le texte, sauf ce qui est volontairement à
       chasse fixe (code, chronomètres, saisies de codes d'accès). */
    "html.police-dys body,html.police-dys body *{font-family:'Lexend',Calibri,'Segoe UI',Arial,sans-serif!important}" +
    "html.police-dys code,html.police-dys pre,html.police-dys kbd," +
    "html.police-dys .chrono,html.police-dys input.code{font-family:Consolas,monospace!important}" +
    "html.police-dys body{letter-spacing:.015em;word-spacing:.06em}" +
    /* Le widget */
    "#lisib-bouton{position:fixed;right:14px;bottom:86px;z-index:58;width:46px;height:46px;border-radius:50%;" +
    "border:2px solid #1B3A63;background:#fff;color:#1B3A63;font:700 17px/1 'Trebuchet MS',Calibri,sans-serif;" +
    "cursor:pointer;box-shadow:0 2px 10px rgba(27,58,99,.25)}" +
    "#lisib-bouton:hover{background:#eef2f6}" +
    "#lisib-panneau{position:fixed;right:14px;bottom:140px;z-index:58;background:#fff;border:2px solid #1B3A63;" +
    "border-radius:12px;padding:14px 16px;box-shadow:0 4px 18px rgba(27,58,99,.3);display:none;min-width:230px;" +
    "font-family:Calibri,'Segoe UI',Arial,sans-serif;font-size:15px;color:#1d2a38}" +
    "#lisib-panneau.ouvert{display:block}" +
    "#lisib-panneau .titre{font-weight:700;color:#1B3A63;margin:0 0 10px;font-family:'Trebuchet MS',Calibri,sans-serif}" +
    "#lisib-panneau .ligne{display:flex;align-items:center;gap:10px;margin:8px 0}" +
    "#lisib-panneau button.pm{width:40px;height:40px;border-radius:8px;border:1px solid #1B3A63;background:#fff;" +
    "color:#1B3A63;font-size:20px;font-weight:700;cursor:pointer}" +
    "#lisib-panneau button.pm:hover{background:#eef2f6}" +
    "#lisib-taille{min-width:52px;text-align:center;font-weight:700}" +
    "#lisib-panneau label{display:flex;align-items:center;gap:8px;cursor:pointer;margin:10px 0 4px}" +
    "#lisib-panneau input[type=checkbox]{width:20px;height:20px}" +
    "#lisib-raz{background:none;border:none;color:#5a6b7d;text-decoration:underline;cursor:pointer;padding:0;font-size:13px}" +
    "@media print{#lisib-bouton,#lisib-panneau{display:none!important}}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  function construire() {
    var b = document.createElement("button");
    b.id = "lisib-bouton";
    b.type = "button";
    b.title = "Lisibilité : taille du texte, police adaptée (DYS)";
    b.setAttribute("aria-label", "Réglages de lisibilité");
    b.setAttribute("aria-expanded", "false");
    b.setAttribute("aria-controls", "lisib-panneau");
    b.textContent = "Aa";

    var p = document.createElement("div");
    p.id = "lisib-panneau";
    p.setAttribute("role", "dialog");
    p.setAttribute("aria-label", "Réglages de lisibilité");
    p.innerHTML =
      '<p class="titre">Lisibilité</p>' +
      '<div class="ligne"><button type="button" class="pm" id="lisib-moins" aria-label="Réduire le texte">−</button>' +
      '<span id="lisib-taille"></span>' +
      '<button type="button" class="pm" id="lisib-plus" aria-label="Agrandir le texte">+</button></div>' +
      '<label><input type="checkbox" id="lisib-dys"> Police adaptée (DYS)</label>' +
      '<button type="button" id="lisib-raz">Réinitialiser</button>';

    document.body.appendChild(b);
    document.body.appendChild(p);

    /* Le bouton annonce son état, le panneau se ferme par Échap, et le
       focus revient à ce qui l'a ouvert : sinon il reste dans le vide,
       et rien ne dit au lecteur d'écran que le panneau est déplié. */
    function basculer(ouvrir) {
      p.classList.toggle("ouvert", ouvrir);
      b.setAttribute("aria-expanded", ouvrir ? "true" : "false");
    }
    b.addEventListener("click", function () {
      var ouvrir = !p.classList.contains("ouvert");
      basculer(ouvrir);
      if (ouvrir) document.getElementById("lisib-moins").focus();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && p.classList.contains("ouvert")) {
        basculer(false);
        b.focus();
      }
    });
    document.getElementById("lisib-moins").addEventListener("click", function () {
      etat.taille = Math.max(MIN, etat.taille - PAS); memoriser(); appliquer();
    });
    document.getElementById("lisib-plus").addEventListener("click", function () {
      etat.taille = Math.min(MAX, etat.taille + PAS); memoriser(); appliquer();
    });
    document.getElementById("lisib-dys").addEventListener("change", function (e) {
      etat.dys = !!e.target.checked; memoriser(); appliquer();
    });
    document.getElementById("lisib-raz").addEventListener("click", function () {
      etat = { taille: 100, dys: false }; memoriser(); appliquer();
    });
    appliquer();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", construire);
  else construire();

  appliquer(); // le zoom et la police, eux, n'attendent pas le DOM complet
})();
