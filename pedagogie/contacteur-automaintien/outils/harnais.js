/* Harnais de test : rejoue les quatre ateliers par événements DOM. */
(function () {
  const erreurs = [];
  window.addEventListener('error', e => erreurs.push(e.message + ' @' + e.filename + ':' + e.lineno));
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const log = [];
  const ok = (cond, msg) => log.push((cond ? 'ok   ' : 'FAUX ') + msg);
  const clic = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const presse = el => { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); };
  const relache = el => { el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); };
  const mode = location.hash.slice(1) || 'test';

  try {
  ok($$('#ateliers .tuile').length === 4, 'hub : 4 tuiles');

  // ---------- atelier 1
  clic($('[data-aller="observer"]'));
  const ec1 = $('#ec-observer');
  ok($('svg.platine', ec1) && $('svg.developpe', ec1), 'observer : deux dessins');
  clic($('.q1', ec1));
  presse($('.marche', ec1)); ok($('.temoin', ec1).classList.contains('colle'), 'observer : KM1 collé Marche tenu');
  relache($('.marche', ec1)); ok($('.temoin', ec1).classList.contains('colle'), 'observer : KM1 reste collé relâché');
  ok($$('.flux', ec1).length > 0, 'observer : courant dessiné');
  presse($('.arret', ec1)); ok(!$('.temoin', ec1).classList.contains('colle'), 'observer : Arrêt fait retomber');
  relache($('.arret', ec1));
  presse($('.marche', ec1)); relache($('.marche', ec1));
  clic($('.q1', ec1)); clic($('.q1', ec1));
  ok(!$('.temoin', ec1).classList.contains('colle'), 'observer : pas de redémarrage après Q1');
  ok($$('li.vu', ec1).length === 3, 'observer : 3 observations vues');
  // manœuvre sur la platine elle-même
  presse($('[data-organe="s2"]', ec1)); ok($('.temoin', ec1).classList.contains('colle'), 'observer : bouton de la platine');
  relache($('[data-organe="s2"]', ec1));
  if (mode === 'observer') throw new Error('stop-observer');
  const qs = $$('.question', ec1);
  ok(qs.length === 5, 'observer : 5 questions ouvertes');
  qs.forEach(q => clic($$('button.reponse', q)[0]));
  ok($('.pastille', ec1), 'observer : bilan affiché');
  ok(JSON.parse(localStorage.getItem('automaintien-progression-v1')).observer, 'observer : progression enregistrée');

  // ---------- atelier 2
  clic($('[data-aller="relier"]'));
  const ec2 = $('#ec-relier');
  ok($$('.borne.cliquable', ec2).length === 18, 'relier : 18 bornes cliquables');
  ok($('rect[stroke-dasharray="6 4"]', ec2), 'relier : halo sur le schéma');
  for (let i = 0; i < 8; i++) {
    clic($('[data-borne="km-a1"] circle', ec2));
    ok($('.retour-info', ec2), 'relier : retour ' + (i + 1));
    clic($('.z-suite', ec2));
  }
  ok($('.pastille', ec2), 'relier : bilan');
  if (mode === 'relier') throw new Error('stop-relier');

  // ---------- atelier 3
  clic($('[data-aller="depanner"]'));
  const ec3 = $('#ec-depanner');
  let bats = 0;
  for (let i = 0; i < 7; i++) {
    ok($$('.reponse', ec3).length === 7, 'dépanner : 7 diagnostics platine ' + (i + 1));
    ok($$('.flux', ec3).length === 0, 'dépanner : courant invisible');
    clic($('.q1', ec3)); presse($('.marche', ec3)); relache($('.marche', ec3));
    if ($('.temoin', ec3).classList.contains('bat')) bats++;
    clic($$('.reponse', ec3)[0]);
    ok($('.retour-info', ec3), 'dépanner : retour');
    clic($('.z-suite', ec3));
  }
  ok(bats === 1, 'dépanner : une platine bat (' + bats + ')');
  ok($('.pastille', ec3), 'dépanner : bilan');
  if (mode === 'depanner') throw new Error('stop-depanner');

  // ---------- atelier 4
  clic($('[data-aller="completer"]'));
  const ec4 = $('#ec-completer');
  ok(!$('svg.platine', ec4) && $('svg.developpe', ec4), 'compléter : schéma seul');
  const avant = $('svg.developpe', ec4).outerHTML.length;
  for (let i = 0; i < 6; i++) { clic($$('.reponse', ec4).filter(b => !b.disabled)[0]); clic($('.z-suite', ec4)); }
  ok($('svg.developpe', ec4).outerHTML.length > avant, 'compléter : le schéma a grandi');
  ok($('.pastille', ec4), 'compléter : bilan');
  clic($('[data-aller="hub"]'));
  ok($$('#ateliers .tuile').length === 4, 'hub : retour');
  } catch (e) { log.push('EXCEPTION ' + e.message + '\n' + e.stack); }
  fin();

  function fin() {
    const pre = document.createElement('pre'); pre.id = 'resultats';
    pre.textContent = log.join('\n') + '\nerreurs JS : ' + (erreurs.length ? erreurs.join(' | ') : 'aucune');
    document.body.appendChild(pre);
  }
})();
