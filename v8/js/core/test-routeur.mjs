// ============================================================
// Test du routeur (V9.1 — vague 2 : route paramétrée)
// Exécution : node v8/js/core/test-routeur.mjs
//
// Vérifie que creerRouteur() découpe correctement le hash en
// { id, param }, reste 100% compatible avec les routes existantes
// '#/<id>' (id inchangé, param vide), et que naviguer() accepte un
// hash complet '#/m/<CODE>'.
//
// Shim DOM minimal (pas de dépendance nouvelle) : seul window.location.hash
// et window.addEventListener('hashchange', …) sont utilisés par routeur.js.
// ============================================================

let nbOk = 0;
let nbEchecs = 0;

function verifier(libelle, condition, detail = '') {
  if (condition) {
    nbOk += 1;
    console.log(`  OK  ${libelle}`);
  } else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Fenêtre factice : hash + écouteurs hashchange, rien d'autre. */
function creerFenetreFactice(hashInitial) {
  const ecouteurs = [];
  const window = {
    location: { hash: hashInitial },
    addEventListener(type, gestionnaire) {
      if (type === 'hashchange') ecouteurs.push(gestionnaire);
    }
  };
  // Émule l'affectation window.location.hash = '#/...' déclenchant
  // 'hashchange' de façon asynchrone, comme un vrai navigateur.
  Object.defineProperty(window.location, 'hash', {
    get() { return this._hash ?? hashInitial; },
    set(valeur) {
      this._hash = valeur;
      queueMicrotask(() => ecouteurs.forEach((fn) => fn()));
    }
  });
  return window;
}

const { creerRouteur } = await import('./routeur.js');

// ============================================================
// 1. Compatibilité stricte des routes existantes '#/<id>'
// ============================================================
{
  globalThis.window = creerFenetreFactice('#/dashboard');
  const appels = [];
  const routeur = creerRouteur({ surChangement: (id, param) => appels.push({ id, param }) });

  verifier("idCourant() = 'dashboard' au démarrage", routeur.idCourant() === 'dashboard');
  verifier("paramCourant() = '' au démarrage (route simple)", routeur.paramCourant() === '');
}

{
  globalThis.window = creerFenetreFactice('#/machines');
  const routeur = creerRouteur({ surChangement: () => {} });
  verifier("'#/machines' → idCourant() = 'machines'", routeur.idCourant() === 'machines');
  verifier("'#/machines' → paramCourant() = ''", routeur.paramCourant() === '');
}

{
  // Hash vide → vue par défaut, comme avant l'ajout du paramètre
  globalThis.window = creerFenetreFactice('');
  const routeur = creerRouteur({ surChangement: () => {} });
  verifier("hash vide → idCourant() = 'dashboard' (vue par défaut)",
    routeur.idCourant() === 'dashboard');
  verifier("hash vide → paramCourant() = ''", routeur.paramCourant() === '');
}

// ============================================================
// 2. Route paramétrée '#/m/<CODE>'
// ============================================================
{
  globalThis.window = creerFenetreFactice('#/m/AB12CD3');
  const routeur = creerRouteur({ surChangement: () => {} });
  verifier("'#/m/AB12CD3' → idCourant() = 'm'", routeur.idCourant() === 'm');
  verifier("'#/m/AB12CD3' → paramCourant() = 'AB12CD3'",
    routeur.paramCourant() === 'AB12CD3');
}

// ============================================================
// 3. surChangement(id, param) reçoit bien les DEUX arguments au
//    changement de hash déclenché en cours de vie (hashchange)
// ============================================================
{
  globalThis.window = creerFenetreFactice('#/dashboard');
  const appels = [];
  creerRouteur({ surChangement: (id, param) => appels.push({ id, param }) });

  globalThis.window.location.hash = '#/m/ZZ9XX01';
  await Promise.resolve();
  await Promise.resolve();

  verifier("hashchange vers '#/m/ZZ9XX01' déclenche surChangement('m', 'ZZ9XX01')",
    appels.length === 1 && appels[0].id === 'm' && appels[0].param === 'ZZ9XX01',
    JSON.stringify(appels));
}

// ============================================================
// 4. naviguer() accepte un hash complet avec paramètre
// ============================================================
{
  globalThis.window = creerFenetreFactice('#/dashboard');
  const routeur = creerRouteur({ surChangement: () => {} });
  routeur.naviguer('m/AB12CD3');
  verifier("naviguer('m/AB12CD3') pose le hash '#/m/AB12CD3'",
    globalThis.window.location.hash === '#/m/AB12CD3');
}

{
  // naviguer() avec un identifiant simple reste compatible (route existante)
  globalThis.window = creerFenetreFactice('#/dashboard');
  const routeur = creerRouteur({ surChangement: () => {} });
  routeur.naviguer('machines');
  verifier("naviguer('machines') pose le hash '#/machines'",
    globalThis.window.location.hash === '#/machines');
}

{
  // naviguer() vers la vue déjà affichée force un nouveau rendu (pas de
  // changement de hash, mais surChangement rappelé avec id ET param)
  globalThis.window = creerFenetreFactice('#/m/AB12CD3');
  const appels = [];
  const routeur = creerRouteur({ surChangement: (id, param) => appels.push({ id, param }) });
  routeur.naviguer('m/AB12CD3');
  verifier("naviguer() vers la même route (id+param) force un rendu via surChangement",
    appels.length === 1 && appels[0].id === 'm' && appels[0].param === 'AB12CD3',
    JSON.stringify(appels));
}

// ---- Bilan ----
console.log(`\n${nbOk} test(s) réussi(s), ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
