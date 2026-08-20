/* =====================================================================
   moteur.js — LA MÉCANIQUE DE LA LIGNE CO₂
   ---------------------------------------------------------------------
   Repris du moteur des modules pressostats (même charte, même voix, même
   contrat d'impression), avec une seule différence de fond : ce module
   n'est pas un parcours d'un seul tenant, c'est une LIGNE D'ESCALES.

   POURQUOI. Le parcours d'origine durait 35 à 45 minutes. Un module long
   s'abandonne en cours de route ; une escale de sept minutes se termine.
   Chaque chapitre porte donc ses écrans, ses questions et son bilan, et
   s'ouvre seul par `index.html?e=<identifiant>` — c'est ce qui permet à
   la carte du site de poser une station par escale sans dupliquer un
   octet de code.

   LA VOIX PASSE AVANT LE RESTE. « Écouter » arme la lecture suivie, elle
   enchaîne les écrans d'elle-même jusqu'à « Stop ». Elle lit le texte, la
   légende de ce qui est affiché, et les réponses du quiz numérotées :
   sans cela, un élève qui ne lit pas entend la question sans pouvoir
   choisir.
   ===================================================================== */

(() => {
  "use strict";

  const COURSE = window.__INERWEB_COURSE__;
  const VISUALS = window.CO2Visuals;
  const $ = (id) => document.getElementById(id);
  const ui = {
    stage: $("visualStage"), caption: $("visualCaption"), kicker: $("lessonKicker"),
    title: $("lessonTitle"), lead: $("lessonLead"), list: $("lessonList"),
    callout: $("lessonCallout"), quiz: $("quizArea"), feedback: $("feedback"),
    back: $("backButton"), next: $("nextButton"), navState: $("navState"),
    progressLabel: $("progressLabel"), progressTrack: $("progressTrack"),
    progressFill: $("progressFill"), progressCount: $("progressCount"),
    speak: $("speakButton"), stop: $("stopButton"), speed: $("speedSelect"),
    reading: $("readingButton"), fullscreen: $("fullscreenButton"),
    escales: $("escales"), courseName: $("courseName"), grid: $("lessonGrid")
  };

  const CHAPITRES = COURSE.chapitres;

  /* --- Où l'on est : un chapitre, un écran dans ce chapitre. --------- */
  let chap = 0;
  let screen = 0;
  let reponses = [];
  let ordres = [];
  let speechRun = 0;
  let speaking = false;
  let lectureSuivie = false;

  const echapper = (v) => String(v)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

  const courant = () => CHAPITRES[chap];
  const total = () => courant().lessons.length + courant().quiz.length + 1;

  function score() {
    return reponses.reduce((s, r, i) => s + (r === courant().quiz[i].answer ? 1 : 0), 0);
  }

  function kind() {
    const c = courant();
    if (screen < c.lessons.length) return "lesson";
    if (screen < c.lessons.length + c.quiz.length) return "quiz";
    return "final";
  }

  /* --- L'adresse de l'escale, pour que la carte du site pointe dessus. */
  function lireAdresse() {
    const p = new URLSearchParams(window.location.search);
    const demande = p.get("e") || p.get("escale") || (window.location.hash || "").replace(/^#/, "");
    if (!demande) return 0;
    const i = CHAPITRES.findIndex((c) => c.id === demande);
    if (i >= 0) return i;
    const n = Number(demande);
    return Number.isInteger(n) && n >= 1 && n <= CHAPITRES.length ? n - 1 : 0;
  }

  function ecrireAdresse() {
    const url = new URL(window.location.href);
    url.searchParams.set("e", courant().id);
    url.hash = "";
    window.history.replaceState(null, "", url);
  }

  /* --- La barre des escales : la ligne entière, toujours visible. ---- */
  /* La barre montre la ligne entière, mais elle sépare visiblement les deux
     groupes : le fluide, puis les machines. Sans ce repère, treize escales
     d'affilée se lisent comme une liste — et c'est justement ce que le
     découpage en branche cherche à éviter. */
  function poserEscales() {
    const BR = COURSE.branches || {};
    let precedente = null;
    ui.escales.innerHTML = CHAPITRES.map((c, i) => {
      const tete = c.branche && c.branche !== precedente && BR[c.branche]
        ? `<span class="escales-groupe" aria-hidden="true">${echapper(BR[c.branche].nom)}</span>` : "";
      precedente = c.branche;
      return tete + `
      <button type="button" data-i="${i}" data-branche="${echapper(c.branche || "")}" title="${echapper(c.titre)} — ${c.minutes} min">
        <span>${i + 1}</span>${echapper(c.court)}
      </button>`;
    }).join("");
    ui.escales.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      allerAuChapitre(Number(b.dataset.i));
    }));
  }

  function marquerEscale() {
    ui.escales.querySelectorAll("button").forEach((b) => {
      const ici = Number(b.dataset.i) === chap;
      b.setAttribute("aria-current", ici ? "true" : "false");
      if (ici) b.scrollIntoView({ block: "nearest", inline: "center" });
    });
  }

  function allerAuChapitre(i) {
    if (i < 0 || i >= CHAPITRES.length) return;
    chap = i;
    screen = 0;
    reponses = Array(courant().quiz.length).fill(null);
    ordres = [];
    ecrireAdresse();
    marquerEscale();
    render();
  }

  function stopSpeech() {
    speechRun += 1;
    speaking = false;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    ui.speak.setAttribute("aria-pressed", "false");
    ui.speak.innerHTML = "▶ <span>Écouter</span>";
    ui.stop.disabled = true;
  }

  function resetContent() {
    stopSpeech();
    ui.quiz.hidden = true;
    ui.quiz.innerHTML = "";
    ui.feedback.hidden = true;
    ui.feedback.className = "feedback";
    ui.feedback.textContent = "";
    ui.callout.hidden = true;
    ui.callout.removeAttribute("data-type");
    ui.callout.innerHTML = "";
  }

  function fillText(item) {
    ui.kicker.textContent = item.kicker || "";
    ui.title.textContent = item.title;
    ui.lead.textContent = item.lead;
    ui.list.innerHTML = (item.bullets || []).map((b) => `<li>${echapper(b)}</li>`).join("");
    ui.caption.textContent = item.caption || "";
    if (item.callout) {
      ui.callout.hidden = false;
      ui.callout.dataset.type = item.callout.type || "note";
      ui.callout.innerHTML = `<strong>${echapper(item.callout.title)}</strong><span>${echapper(item.callout.text)}</span>`;
    }
  }

  function poserVisuel(item) {
    /* Un écran « large » empile dessin et texte au lieu de les mettre côte à
       côte : c'est ce qui rend lisibles les deux vues du booster ensemble. */
    ui.grid.classList.toggle("large", !!item.large);
    ui.stage.innerHTML = VISUALS.render(item.visual);
    ui.stage.setAttribute("role", "img");
    ui.stage.setAttribute("aria-label", item.caption || "Schéma pédagogique");
    VISUALS.wire(item.visual);
  }

  function renderLesson() {
    const item = courant().lessons[screen];
    fillText(item);
    poserVisuel(item);
    ui.next.disabled = false;
    ui.next.textContent = screen === courant().lessons.length - 1 ? "Passer aux questions →" : "Continuer →";
    ui.navState.textContent = `Escale ${chap + 1} · écran ${screen + 1} sur ${courant().lessons.length}`;
  }

  /* LES PROPOSITIONS SONT MÉLANGÉES. Sans cela, la bonne réponse reste à
     la place où elle a été écrite : sur un module importé le 31/07/2026,
     sept bonnes réponses sur dix étaient en première position et cliquer
     la première case suffisait à valider le quiz sans rien lire.

     LE MÉLANGE EST DÉTERMINISTE, tiré de l'identifiant de la question et
     non du hasard. Deux raisons : l'élève retrouve le même écran s'il
     revient en arrière ou rouvre l'escale, et surtout la VOIX ENREGISTRÉE
     reste possible — un ordre tiré au sort à chaque affichage changerait
     le texte lu, donc sa clé, et aucun fichier son ne pourrait plus lui
     correspondre. Ce qu'on cherche n'est pas l'imprévisibilité : c'est que
     la place à l'écran ne soit pas celle de la rédaction.

     `data-choice` porte toujours l'indice d'ORIGINE, c'est lui qui est
     comparé à la bonne réponse. */

  function graine(texte) {
    let h = 0x811c9dc5;
    for (let i = 0; i < texte.length; i += 1) {
      h ^= texte.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function ordreDe(i, nb) {
    if (!ordres[i]) {
      let g = graine(courant().quiz[i].id + "·" + courant().id);
      const idx = Array.from({ length: nb }, (_, j) => j);
      for (let k = nb - 1; k > 0; k -= 1) {
        g = (Math.imul(g ^ (g >>> 15), 1 | g) >>> 0);
        [idx[k], idx[g % (k + 1)]] = [idx[g % (k + 1)], idx[k]];
      }
      ordres[i] = idx;
    }
    return ordres[i];
  }

  function markQuiz(i) {
    const choisi = reponses[i];
    if (choisi === null) return;
    const q = courant().quiz[i];
    ui.quiz.querySelectorAll(".quiz-choice").forEach((b) => {
      const origine = Number(b.dataset.choice);
      b.disabled = true;
      b.classList.toggle("correct", origine === q.answer);
      b.classList.toggle("incorrect", origine === choisi && choisi !== q.answer);
    });
    const juste = choisi === q.answer;
    ui.feedback.hidden = false;
    ui.feedback.className = `feedback ${juste ? "correct" : "incorrect"}`;
    ui.feedback.textContent = `${juste ? "Bonne réponse. " : "À reprendre. "}${q.explanation}`;
  }

  function renderQuiz() {
    ui.grid.classList.remove("large");
    const i = screen - courant().lessons.length;
    const q = courant().quiz[i];
    ui.kicker.textContent = `Questions · escale ${chap + 1}`;
    ui.title.textContent = q.question;
    ui.lead.textContent = "Choisissez, puis lisez l’explication.";
    ui.list.innerHTML = "";
    ui.caption.textContent = "Aucune donnée n’est transmise : le score reste dans ce navigateur.";
    ui.stage.innerHTML = VISUALS.quiz(i, courant().quiz.length, score(), courant().titre);
    ui.stage.setAttribute("role", "img");
    ui.stage.setAttribute("aria-label", `Question ${i + 1} sur ${courant().quiz.length}`);
    ui.quiz.hidden = false;
    ui.quiz.innerHTML = ordreDe(i, q.choices.length).map((j) =>
      `<button class="quiz-choice" type="button" data-choice="${j}">${echapper(q.choices[j])}</button>`).join("");
    ui.quiz.querySelectorAll(".quiz-choice").forEach((b) => b.addEventListener("click", () => {
      if (reponses[i] !== null) return;
      reponses[i] = Number(b.dataset.choice);
      markQuiz(i);
      ui.next.disabled = false;
      ui.next.focus({ preventScroll: true });
      if (lectureSuivie) speak(pourLaVoix(ui.feedback.textContent));
    }));
    markQuiz(i);
    ui.next.disabled = reponses[i] === null;
    ui.next.textContent = i === courant().quiz.length - 1 ? "Voir le bilan →" : "Question suivante →";
    ui.navState.textContent = `Questions · ${i + 1} sur ${courant().quiz.length}`;
  }

  function renderFinal() {
    const item = courant().final;
    const suivant = CHAPITRES[chap + 1];
    fillText(item);
    ui.stage.innerHTML = VISUALS.final(score(), courant().quiz.length, suivant ? suivant.titre : "");
    ui.stage.setAttribute("role", "img");
    ui.stage.setAttribute("aria-label", `Bilan : ${score()} bonnes réponses sur ${courant().quiz.length}`);
    ui.next.disabled = !suivant;
    ui.next.textContent = suivant ? `Escale suivante : ${suivant.court} →` : "Ligne terminée";
    ui.navState.textContent = `Bilan · ${score()} / ${courant().quiz.length}`;
  }

  function render() {
    resetContent();
    const k = kind();
    if (k === "lesson") renderLesson();
    else if (k === "quiz") renderQuiz();
    else renderFinal();
    const pourcent = Math.round(((screen + 1) / total()) * 100);
    ui.progressFill.style.width = `${pourcent}%`;
    ui.progressTrack.setAttribute("aria-valuenow", String(pourcent));
    ui.progressCount.textContent = `${screen + 1} / ${total()}`;
    ui.progressLabel.textContent = k === "lesson" ? courant().lessons[screen].short : k === "quiz" ? "Questions" : "Bilan";
    ui.courseName.textContent = `${chap + 1} · ${courant().titre}`;
    ui.back.disabled = chap === 0 && screen === 0;
    document.title = `${courant().court} — CO₂ / R744 — inerWeb Édu`;
    if (lectureSuivie) speak();
  }

  function move(pas) {
    if (pas > 0 && kind() === "quiz" && ui.next.disabled) return;
    const suivant = screen + pas;
    if (suivant < 0) {
      if (chap === 0) return;
      chap -= 1;
      reponses = Array(courant().quiz.length).fill(null);
      ordres = [];
      screen = total() - 1;
      ecrireAdresse(); marquerEscale(); render();
      return;
    }
    if (suivant >= total()) {
      if (chap >= CHAPITRES.length - 1) return;
      allerAuChapitre(chap + 1);
      return;
    }
    screen = suivant;
    render();
  }

  /* ------------------------------------------------------------------
     CE QUE LA VOIX DOIT DIRE, ET COMMENT.
     Une synthèse vocale lit les symboles au pied de la lettre : « CO₂ »
     devient « C O deux », « HP » devient « hache pé », « −56,6 » devient
     « tiret 56,6 » et « 40 % » ne se prononce pas. Pour un élève qui ne
     lit pas, un symbole mal dit est une information perdue.
     Les règles ci-dessous sont celles de la chaîne d'enregistrement du
     dépôt (`build/voix/generer-audios-piper.py`, fonction `oraliser`),
     reprises à l'identique et complétées de ce qui est propre au CO₂ :
     les deux niveaux de température MT et BT, et le COP.
     L'ORDRE COMPTE : les formules chimiques passent avant les lettres
     isolées, sinon « CO₂ » serait déjà découpé quand on arrive à « C ».
     ------------------------------------------------------------------ */
  const ORALISER = [
    /* « la fin du XIXᵉ siècle » se prononçait « X A X » — le Louis Croix-V-Bâton
       des Inconnus, relevé à l'écoute le 20/08. Le défaut venait du `\b` final :
       après « ᵉ », qui n'est pas un caractère de mot, il ne peut pas y avoir de
       frontière de mot, donc la règle ne s'appliquait jamais. */
    [/\bXIX[ᵉe]?/g, "dix-neuvième"],
    [/\bF[\s\u2011-]?Gas\s+III\b/gi, "F gaz trois"],
    [/\bF[\s\u2011-]?Gas\b/gi, "F gaz"],
    [/\bTP BE CVC\b/g, "T P, B E, C V C"],
    /* Les milliers s'écrivent avec une espace — « 3 922 » — et la voix y entend
       deux nombres : « trois, neuf cent vingt-deux ». On les recolle pour elle. */
    [/(\d)[\u202f\u00a0 ](\d{3})\b/g, "$1$2"],
    [/\bCO[₂2]\s?[ée]q\b/gi, "équivalent dioxyde de carbone"],
    [/CO₂/g, "dioxyde de carbone"],
    [/NH₃/g, "ammoniac"],
    [/\bR[\s-]?(\d+[A-Za-z]*)\b/g, "R $1"],
    [/\bA[\s-]?2[\s-]?L\b/g, "A deux L"],
    [/\bB[\s-]?2[\s-]?L\b/g, "B deux L"],
    [/\bA[\s-]?1\b/g, "A un"],
    [/\bA[\s-]?2\b/g, "A deux"],
    [/\bA[\s-]?3\b/g, "A trois"],
    [/\bB[\s-]?1\b/g, "B un"],
    [/\bHP\b/g, "haute pression"],
    [/\bBP\b/g, "basse pression"],
    [/\bMT\b/g, "moyenne température"],
    [/\bBT\b/g, "basse température"],
    [/\bCOP\b/g, "C O P"],
    [/\bPRP\b/g, "potentiel de réchauffement planétaire"],
    [/\bODP\b/g, "potentiel d’appauvrissement de la couche d’ozone"],
    [/\bEPI\b/g, "équipements de protection individuelle"],
    [/\bNF EN 378\b/g, "norme N F E N 378"],
    [/⛶/g, "plein écran"],
    [/\bHFC\b/g, "H F C"],
    [/\bHCFC\b/g, "H C F C"],
    [/\bXIX[ᵉe]\b/g, "dix-neuvième"],
    [/\(UE\)\s?(\d{4})\/(\d{3})/g, "U E $1 barre $2"],
    [/\bUE\b/g, "Union européenne"],
    [/log\s?p\s?\/\s?h/gi, "log P H"],
    [/°\s?C\b/g, " degrés Celsius"],
    [/(\d)\s?K\b/g, "$1 kelvins"],
    [/\bkWh\b/g, "kilowattheures"],
    [/\bkW\b/g, "kilowatts"],
    [/\bkg\b/g, "kilogrammes"],
    [/%/g, " pour cent"],
    [/−/g, " moins "],
    [/×/g, " fois "],
    [/≈/g, " environ "],
    [/≥/g, " au moins "],
    [/=/g, " égale "],
    [/·/g, ", "],
    [/→/g, " vers "],
    [/(\d)\s*[–—]\s*(\d)/g, "$1 à $2"],
    [/\.\s*\./g, "."],
    [/\s{2,}/g, " "]
  ];

  function pourLaVoix(texte) {
    return ORALISER.reduce((s, [motif, remplacement]) => s.replace(motif, remplacement), String(texte)).trim();
  }

  function texteParle() {
    const parts = [ui.kicker.textContent, ui.title.textContent, ui.lead.textContent,
      ...Array.from(ui.list.querySelectorAll("li"), (li) => li.textContent)];
    if (!ui.callout.hidden) {
      const t = ui.callout.querySelector("strong");
      const c = ui.callout.querySelector("span");
      parts.push(t ? `${t.textContent} : ${c ? c.textContent : ""}` : ui.callout.textContent);
    }
    /* Ce que montre l'écran doit s'entendre, sinon le schéma n'existe que
       pour qui voit ET lit. */
    if (ui.caption.textContent) parts.push("Ce que montre le schéma. " + ui.caption.textContent);
    if (!ui.quiz.hidden) {
      Array.from(ui.quiz.querySelectorAll(".quiz-choice")).forEach((b, i) => {
        parts.push(`Réponse ${i + 1}. ${b.textContent}`);
      });
    }
    if (!ui.feedback.hidden) parts.push(ui.feedback.textContent);
    return pourLaVoix(parts.filter(Boolean).join(". "));
  }

  /* LA MEILLEURE VOIX DISPONIBLE, ET ELLE DOIT ÊTRE LOCALE.
     Les voix « Natural » et « Multilingual » de Windows sont très
     au-dessus des voix historiques ; on les prend en premier quand le
     navigateur les expose. Le tri privilégie toujours `localService` :
     les voix distantes (Google, dans Chrome) envoient le texte lu à un
     tiers à chaque phrase, ce qu'un module donné comme fonctionnant hors
     ligne ne peut pas faire. Elles ne servent qu'en dernier recours,
     s'il n'existe aucune voix française installée sur la machine. */
  const VOIX_SOIGNEES = /natural|multilingual|denise|henri|r[ée]my|paul|julie/i;

  function voixFrancaise() {
    if (!("speechSynthesis" in window)) return null;
    const fr = window.speechSynthesis.getVoices().filter((x) => /^fr/i.test(x.lang));
    const locales = fr.filter((x) => x.localService);
    return locales.find((x) => VOIX_SOIGNEES.test(x.name)) || locales[0]
      || fr.find((x) => VOIX_SOIGNEES.test(x.name)) || fr[0] || null;
  }

  /* `texteImpose` sert au retour d'une question : une fois la réponse
     donnée, relire l'écran entier ferait réentendre la question et les
     quatre propositions avant la correction. On ne lit que la correction. */
  function speak(texteImpose) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      ui.navState.textContent = "Voix indisponible sur ce navigateur";
      return;
    }
    stopSpeech();
    const run = speechRun;
    const u = new SpeechSynthesisUtterance(texteImpose || texteParle());
    u.lang = "fr-FR";
    u.rate = Number(ui.speed.value);
    u.pitch = 1;
    const v = voixFrancaise();
    if (v) u.voice = v;
    u.onstart = () => {
      if (run !== speechRun) return;
      speaking = true;
      ui.speak.setAttribute("aria-pressed", "true");
      ui.speak.innerHTML = "❚❚ <span>Pause</span>";
      ui.stop.disabled = false;
    };
    const fin = () => {
      if (run !== speechRun) return;
      speaking = false;
      ui.speak.setAttribute("aria-pressed", "false");
      ui.speak.innerHTML = "▶ <span>Écouter</span>";
      ui.stop.disabled = true;
      /* La lecture suivie enchaîne d'elle-même : l'élève n'a pas à
         retrouver le bouton à chaque écran. Elle s'arrête au bilan et
         devant une question sans réponse — sinon on lui lirait la suite
         pendant qu'il réfléchit. */
      if (!lectureSuivie) return;
      const k = kind();
      if (k === "final") return;
      if (k === "quiz" && reponses[screen - courant().lessons.length] === null) return;
      window.setTimeout(() => { if (lectureSuivie) move(1); }, 900);
    };
    u.onend = fin;
    u.onerror = fin;
    window.speechSynthesis.speak(u);
  }

  ui.back.addEventListener("click", () => move(-1));
  ui.next.addEventListener("click", () => move(1));
  ui.speak.addEventListener("click", () => {
    if (speaking && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause(); speaking = false;
      ui.speak.setAttribute("aria-pressed", "false");
      ui.speak.innerHTML = "▶ <span>Reprendre</span>";
    } else if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume(); speaking = true;
      ui.speak.setAttribute("aria-pressed", "true");
      ui.speak.innerHTML = "❚❚ <span>Pause</span>";
    } else { lectureSuivie = true; speak(); }
  });
  ui.stop.addEventListener("click", () => { lectureSuivie = false; stopSpeech(); });
  ui.reading.addEventListener("click", () => {
    const actif = document.body.classList.toggle("reading-mode");
    ui.reading.setAttribute("aria-pressed", String(actif));
  });
  ui.fullscreen.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch { ui.navState.textContent = "Plein écran refusé par le navigateur"; }
  });
  document.addEventListener("keydown", (e) => {
    if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName)) return;
    if (e.key === "ArrowRight") move(1);
    if (e.key === "ArrowLeft") move(-1);
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { lectureSuivie = false; stopSpeech(); } });
  window.addEventListener("beforeunload", stopSpeech);

  /* LE ZOOM DE LISIBILITÉ ET LA COQUILLE PLEIN ÉCRAN.
     `moteur/lisibilite.js` agrandit toute la page jusqu'à 160 %. La coquille,
     elle, tient dans une hauteur d'écran sans défilement — et la barre
     « Retour / Continuer » sortait alors de l'écran : l'élève qui grossit le
     texte ne pouvait plus avancer. On marque donc le corps de page dès que le
     zoom dépasse 1, et le style rend la page défilable dans ce seul cas. */
  function suivreZoom() {
    const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    document.body.classList.toggle("zoome", z > 1.01);
  }
  new MutationObserver(suivreZoom).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
  suivreZoom();

  poserEscales();
  chap = lireAdresse();
  reponses = Array(courant().quiz.length).fill(null);
  ordres = [];
  marquerEscale();
  render();
})();
