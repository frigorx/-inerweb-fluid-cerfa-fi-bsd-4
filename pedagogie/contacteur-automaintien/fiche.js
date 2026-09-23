/* fiche.js — remplit les emplacements de schémas de la fiche élève.
   Les dessins viennent de schemas.js, en mode « vierge » : repères et
   bornes sont laissés à compléter, contacts au repos, aucun courant. */
(function () {
  'use strict';
  const repos = { q: true, s1: false, s2: false, km: false };
  document.querySelectorAll('[data-schema]').forEach(el => {
    const genre = el.dataset.schema;
    if (genre === 'developpe-vierge') el.innerHTML = window.SCHEMAS.developpe(repos, { vierge: true });
    if (genre === 'platine-vierge') el.innerHTML = window.SCHEMAS.platine(repos, { vierge: true });
    if (genre === 'developpe-base') el.innerHTML = window.SCHEMAS.developpe(repos, { masquerCourant: true });
    if (genre === 'developpe-complet') el.innerHTML = window.SCHEMAS.developpe(repos, { masquerCourant: true, serie: ['q1', 'f1', 'hp', 's3', 's1'], maintien: ['s2', 's4', 'km13'], paralleles: ['h1'] });
    if (genre === 'platine-base') el.innerHTML = window.SCHEMAS.platine(repos, { masquerCourant: true });
  });
})();
