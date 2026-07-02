// ============================================================
// inerWeb Fluide — routeur.js
// Routeur minimal fondé sur le hash de l'URL ('#/dashboard').
// ============================================================

const VUE_PAR_DEFAUT = 'dashboard';

/**
 * Extrait l'identifiant de vue depuis le hash courant.
 * '#/machines' → 'machines' ; hash vide → vue par défaut.
 * @returns {string}
 */
function lireHash() {
  const brut = window.location.hash.replace(/^#\/?/, '').trim();
  return brut || VUE_PAR_DEFAUT;
}

/**
 * Crée le routeur de l'application.
 * @param {{ surChangement: (id: string) => void }} options
 *   surChangement — rappel invoqué à chaque changement de vue.
 * @returns {{ naviguer: (id: string) => void, idCourant: () => string }}
 */
export function creerRouteur({ surChangement }) {
  let courant = lireHash();

  window.addEventListener('hashchange', () => {
    const nouveau = lireHash();
    if (nouveau === courant) return;
    courant = nouveau;
    surChangement(courant);
  });

  return {
    /**
     * Change de vue par programme (met à jour le hash).
     * Si la vue demandée est déjà affichée, force un nouveau rendu.
     * @param {string} id — identifiant de la vue (ex. 'machines')
     */
    naviguer(id) {
      if (id === courant) {
        surChangement(courant);
      } else {
        window.location.hash = '#/' + id;
      }
    },

    /** @returns {string} identifiant de la vue courante */
    idCourant() {
      return courant;
    }
  };
}
