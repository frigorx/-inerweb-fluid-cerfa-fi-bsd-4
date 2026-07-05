// ============================================================
// inerWeb Fluide — routeur.js
// Routeur minimal fondé sur le hash de l'URL ('#/dashboard').
// V9.1 : le hash peut porter un paramètre après l'identifiant de vue
// ('#/m/AB12CD3') — cf. lireHash ci-dessous. Un seul niveau de
// paramètre, pas de sous-routes imbriquées.
// ============================================================

const VUE_PAR_DEFAUT = 'dashboard';

/**
 * Extrait l'identifiant de vue et son paramètre éventuel depuis le hash
 * courant. Le premier segment après '#/' est l'identifiant de vue, tout
 * le reste (s'il existe) est le paramètre brut, tel quel.
 * '#/machines'      → { id: 'machines', param: '' }
 * '#/m/AB12CD3'     → { id: 'm',        param: 'AB12CD3' }
 * hash vide         → { id: 'dashboard', param: '' }  (vue par défaut)
 * @returns {{ id: string, param: string }}
 */
function lireHash() {
  const brut = window.location.hash.replace(/^#\/?/, '').trim();
  if (!brut) return { id: VUE_PAR_DEFAUT, param: '' };
  const indexBarre = brut.indexOf('/');
  if (indexBarre === -1) return { id: brut, param: '' };
  return { id: brut.slice(0, indexBarre), param: brut.slice(indexBarre + 1) };
}

/**
 * Crée le routeur de l'application.
 * @param {{ surChangement: (id: string, param: string) => void }} options
 *   surChangement — rappel invoqué à chaque changement de vue, avec
 *   l'identifiant de vue ET son paramètre brut (chaîne vide si absent).
 * @returns {{ naviguer: (hash: string) => void, idCourant: () => string,
 *             paramCourant: () => string }}
 */
export function creerRouteur({ surChangement }) {
  let courant = lireHash();

  window.addEventListener('hashchange', () => {
    const nouveau = lireHash();
    if (nouveau.id === courant.id && nouveau.param === courant.param) return;
    courant = nouveau;
    surChangement(courant.id, courant.param);
  });

  return {
    /**
     * Change de vue par programme (met à jour le hash).
     * Si la vue demandée est déjà affichée, force un nouveau rendu.
     * Accepte soit un identifiant simple ('machines'), soit un hash
     * complet avec paramètre ('m/AB12CD3') — les deux formes cohabitent
     * avec ou sans le préfixe '#/' déjà posé.
     * @param {string} hash — identifiant de vue, avec ou sans paramètre
     */
    naviguer(hash) {
      const cible = String(hash).replace(/^#\/?/, '');
      const indexBarre = cible.indexOf('/');
      const id = indexBarre === -1 ? cible : cible.slice(0, indexBarre);
      const param = indexBarre === -1 ? '' : cible.slice(indexBarre + 1);

      if (id === courant.id && param === courant.param) {
        surChangement(courant.id, courant.param);
      } else {
        window.location.hash = '#/' + cible;
      }
    },

    /** @returns {string} identifiant de la vue courante */
    idCourant() {
      return courant.id;
    },

    /** @returns {string} paramètre brut de la vue courante ('' si absent) */
    paramCourant() {
      return courant.param;
    }
  };
}
