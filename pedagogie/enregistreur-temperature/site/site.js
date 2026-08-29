/* =====================================================================
   site.js — la navigation du site compagnon
   ---------------------------------------------------------------------
   Sept sections dans une seule page. Pourquoi pas sept fichiers : parce
   qu'une salle d'atelier a un réseau capricieux, et qu'un site qui tient
   en une page s'ouvre une fois puis ne demande plus rien. La règle des
   « trois clics maximum » de la charte est tenue par construction : une
   section est à un clic, tout le reste à deux.
   ===================================================================== */

(() => {
  "use strict";

  const onglets  = Array.from(document.querySelectorAll("nav.onglets button"));
  const sections = Array.from(document.querySelectorAll("section.ecran"));

  function aller(nom) {
    const cible = document.getElementById("ec-" + nom);
    if (!cible) return;
    sections.forEach((s) => s.classList.toggle("actif", s === cible));
    onglets.forEach((o) => o.setAttribute("aria-selected", String(o.dataset.vers === nom)));
    if (location.hash !== "#" + nom) history.replaceState(null, "", "#" + nom);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    cible.focus?.();
  }

  /* Les onglets, et tout bouton du corps qui porte data-vers. */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-vers]");
    if (b) { e.preventDefault(); aller(b.dataset.vers); }
  });

  /* Flèches gauche/droite entre onglets : la navigation au clavier fait
     partie de l'accessibilité, pas des options. */
  document.querySelector("nav.onglets").addEventListener("keydown", (e) => {
    const i = onglets.indexOf(document.activeElement);
    if (i < 0) return;
    let j = -1;
    if (e.key === "ArrowRight") j = (i + 1) % onglets.length;
    if (e.key === "ArrowLeft")  j = (i - 1 + onglets.length) % onglets.length;
    if (j >= 0) { e.preventDefault(); onglets[j].focus(); aller(onglets[j].dataset.vers); }
  });

  const depart = (location.hash || "").replace(/^#/, "");
  if (depart) aller(depart);
})();
