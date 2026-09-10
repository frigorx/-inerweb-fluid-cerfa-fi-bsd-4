// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés.
import { estSeanceFictive, LIEN_SEANCE_FICTIVE } from '../data/seance-fictive.js';
import { confirmer } from './communs.js';

export function carteSeanceFictive() {
  return '<section class="carte" style="padding:18px;margin:14px 0;background:#FFFDF8">'
    + '<h3 style="color:#1B3A63;margin-top:0">Former sans alimenter le registre</h3>'
    + '<p>Ouvrez une séance sur le parc fictif fourni. Les saisies et les pièces jointes restent '
    + 'en mémoire dans cet onglet : une actualisation recommence la séance. Aucun ancien exercice '
    + 'ni aucune donnée du registre ne sont copiés au démarrage.</p>'
    + '<a class="btn btn-primaire" href="' + LIEN_SEANCE_FICTIVE + '" target="_blank" rel="noopener">'
    + 'Ouvrir une séance fictive temporaire</a>'
    + '<p class="texte-secondaire">Nouvel onglet. Utilisez des identités fictives. Les fichiers téléchargés restent sur disque.</p></section>';
}

export function poserBandeauSeanceFictive() {
  if (!estSeanceFictive()) return;
  const bandeau = document.createElement('aside');
  bandeau.className = 'bandeau-seance-fictive no-print';
  bandeau.setAttribute('aria-label', 'Séance fictive temporaire');
  bandeau.style.cssText = 'background:#F7F1E7;color:#1B3A63;border-bottom:3px solid #C9451A;padding:12px;display:flex;flex-wrap:wrap;align-items:center;gap:12px';
  bandeau.innerHTML = '<div style="flex:1;min-width:min(100%,220px)"><strong>SÉANCE FICTIVE — EN MÉMOIRE</strong>'
    + '<p style="margin:4px 0">Aucune écriture au registre. Une actualisation recommence la séance. '
    + 'Les téléchargements et impressions restent à votre charge. N’utilisez pas de données personnelles réelles.</p></div>'
    + '<button type="button" class="btn btn-secondaire" data-seance="recommencer">Recommencer</button>'
    + '<button type="button" class="btn btn-secondaire" data-seance="quitter">Quitter la séance</button>';
  bandeau.addEventListener('click', async e => {
    const geste = e.target?.dataset?.seance;
    if (!geste) return;
    const ok = await confirmer({ titre: geste === 'quitter' ? 'Quitter la séance' : 'Recommencer la séance',
      message: 'Le travail en mémoire sera perdu. Les fichiers téléchargés et les impressions resteront disponibles.',
      libelleConfirmer: geste === 'quitter' ? 'Quitter' : 'Recommencer', danger: true });
    if (!ok) return;
    if (geste === 'recommencer') window.location.reload();
    else window.location.assign('./#/dashboard');
  });
  document.body.insertBefore(bandeau, document.body.firstChild);
  // Un retour arrière ne doit pas réafficher le travail mémorisé par le bfcache.
  window.addEventListener('pageshow', e => { if (e.persisted) window.location.reload(); });
}
