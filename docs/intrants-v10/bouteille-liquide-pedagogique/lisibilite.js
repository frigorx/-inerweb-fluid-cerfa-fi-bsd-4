(function initialiseReadingTools() {
  "use strict";
  const actions = Array.from(document.querySelectorAll("[data-font-action]"));
  const status = document.getElementById("reading-status");
  const resetButton = document.querySelector("[data-font-action='reset']");
  const steps = [70, 80, 90, 100, 110, 120, 130, 140, 150, 160];
  let index = steps.indexOf(100);

  function applySize() {
    const value = steps[index];
    document.documentElement.style.setProperty("--font-scale", String(value / 100));
    document.documentElement.dataset.readerSize = String(value);
    if (resetButton) resetButton.textContent = `${value} %`;
    if (status) status.textContent = `Taille du texte : ${value} pour cent.`;
    actions.forEach((button) => {
      if (button.dataset.fontAction === "decrease") button.disabled = index === 0;
      if (button.dataset.fontAction === "increase") button.disabled = index === steps.length - 1;
    });
  }

  actions.forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.fontAction === "decrease") index = Math.max(0, index - 1);
    if (button.dataset.fontAction === "increase") index = Math.min(steps.length - 1, index + 1);
    if (button.dataset.fontAction === "reset") index = steps.indexOf(100);
    applySize();
  }));
  applySize();
})();
