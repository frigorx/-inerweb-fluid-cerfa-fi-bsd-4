(() => {
  'use strict';

  const levels = [1, 1.15, 1.3];
  const storageKey = 'inerweb-marketing-font-scale';
  const button = document.getElementById('readability-toggle');

  if (!button) return;

  const saved = Number.parseFloat(localStorage.getItem(storageKey));
  let index = levels.includes(saved) ? levels.indexOf(saved) : 0;

  function apply() {
    const scale = levels[index];
    document.documentElement.style.setProperty('--font-scale', String(scale));
    button.textContent = scale === 1 ? 'Aa' : `Aa ${Math.round(scale * 100)} %`;
    button.style.width = scale === 1 ? '48px' : '88px';
    button.setAttribute('aria-label', scale === 1.3 ? 'Revenir à la taille normale' : 'Agrandir le texte');
    localStorage.setItem(storageKey, String(scale));
  }

  button.addEventListener('click', () => {
    index = (index + 1) % levels.length;
    apply();
  });

  apply();
})();
