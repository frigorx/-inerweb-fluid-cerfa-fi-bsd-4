// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés.
import { esc } from '../core/utils.js';
import { modale } from './communs.js';

export function ouvrirNettoyageFormation(ctx, rafraichir) {
  const demo = ctx.store.modeLabel !== 'LOCAL';
  const { racine, fermer } = modale({
    titre: 'Examiner les anciennes données de formation',
    contenuHtml: '<p>Choisissez la date retenue par votre établissement. Aucune durée légale n’est déduite automatiquement. '
      + 'Seuls les brouillons de formation antérieurs à cette date peuvent être sélectionnés.</p>'
      + '<div class="champ"><label for="nettoyage-date">Écritures antérieures au</label>'
      + '<input type="date" id="nettoyage-date" class="champ-saisie"></div>'
      + '<button type="button" class="btn btn-secondaire" id="nettoyage-apercu">Afficher l’aperçu</button>'
      + '<p id="nettoyage-erreur" role="alert"></p><div id="nettoyage-resultats"></div>',
    actionsHtml: '<button type="button" class="btn btn-secondaire" id="nettoyage-fermer">Fermer</button>'
  });
  const erreur = racine.querySelector('#nettoyage-erreur');
  const date = racine.querySelector('#nettoyage-date');
  const resultats = racine.querySelector('#nettoyage-resultats');
  const bouton = racine.querySelector('#nettoyage-apercu');
  racine.querySelector('#nettoyage-fermer').addEventListener('click', fermer);
  date.addEventListener('input', () => { resultats.innerHTML = ''; erreur.textContent = ''; });
  bouton.addEventListener('click', async () => {
    bouton.disabled = true; erreur.textContent = ''; resultats.innerHTML = ''; resultats.oninput = null;
    const avant = date.value;
    try {
      const revue = await ctx.store.previsualiserNettoyageFormation(avant);
      if (date.value !== avant) return;
      resultats.innerHTML = '<p><strong>' + revue.supprimables + ' brouillon(s) admissible(s)</strong> ; '
        + revue.protegees + ' trace(s) protégée(s) ou à examiner.</p>'
        + (demo ? '<p class="encart-aide">Démonstration : aperçu seulement. Le nettoyage nécessite le poste local et un compte référent ou administrateur.</p>' : '')
        + '<div class="tableau-defilement"><table class="tableau"><thead><tr><th>Choix / référence</th>'
        + '<th>Date / statut</th><th>Contenu associé</th><th>Traitement</th></tr></thead><tbody>'
        + revue.lignes.map(l => '<tr><td>' + (l.supprimable && !demo
          ? '<label><input type="checkbox" class="nettoyage-case" value="' + esc(l.id) + '"> ' + esc(l.numero) + '</label>'
          : esc(l.numero)) + '</td><td>' + esc(l.date || 'Date inconnue') + '<br>' + esc(l.statut)
          + '</td><td>' + l.pieces + ' pièce(s), ' + l.signatures + ' signature(s)</td><td>'
          + esc(l.motif || 'Brouillon supprimable après confirmation') + '</td></tr>').join('')
        + '</tbody></table></div>'
        + '<p class="encart-aide"><strong>Ce nettoyage n’efface pas toute la personne.</strong> '
        + 'Les fiches du personnel, le coffre, les journaux, les écritures scellées, les copies téléchargées '
        + 'et les sauvegardes restent à traiter séparément. Des fragments peuvent aussi subsister sur le support de stockage.</p>'
        + '<details><summary>Sauvegardes gérées à examiner : '
        + (revue.sauvegardes === null ? 'inventaire indisponible' : revue.sauvegardes.length) + '</summary>'
        + '<p>Inventaire limité aux dossiers de sauvegarde configurés. Ces copies ne sont ni supprimées ni réécrites ici. '
        + 'Une restauration peut réintroduire les données nettoyées.</p>'
        + (revue.sauvegardes || []).map(s => '<p>' + esc(s.fichier) + ' — ' + esc(s.date || 'date inconnue')
          + (s.valide ? '' : ' — fichier à vérifier') + '</p>').join('') + '</details>'
        + '<button type="button" class="btn btn-secondaire" id="nettoyage-export">Télécharger cet aperçu</button>'
        + (!demo && revue.supprimables ? '<p id="nettoyage-compteur" aria-live="polite">0 brouillon sélectionné.</p>'
          + '<div class="champ"><label for="nettoyage-motif">Motif de la décision (10 à 500 caractères, sans nom d’élève)</label>'
          + '<textarea id="nettoyage-motif" class="champ-saisie" minlength="10" maxlength="500"></textarea></div>'
          + '<p><label><input type="checkbox" id="nettoyage-copies"> J’ai pris en compte les copies restantes et les obligations de conservation.</label></p>'
          + '<div class="champ"><label for="nettoyage-confirmation">Saisissez SUPPRIMER suivi du nombre sélectionné</label>'
          + '<input id="nettoyage-confirmation" class="champ-saisie" autocomplete="off" placeholder="SUPPRIMER 2"></div>'
          + '<button type="button" class="btn btn-secondaire" id="nettoyage-supprimer" disabled>Supprimer les brouillons sélectionnés</button>' : '');
      resultats.querySelector('#nettoyage-export').addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify({
          application: 'inerWeb Fluide', dateRevue: new Date().toISOString(),
          avertissement: 'Aperçu seulement, aucune suppression prouvée. Références potentiellement personnelles. Copies externes non inventoriées.',
          ...revue
        }, null, 2)], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = `revue-formation-${avant}.json`;
        a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
      const supprimer = resultats.querySelector('#nettoyage-supprimer');
      if (!supprimer) return;
      const selection = () => [...resultats.querySelectorAll('.nettoyage-case:checked')].map(c => c.value);
      const maj = () => {
        const n = selection().length;
        resultats.querySelector('#nettoyage-compteur').textContent = `${n} brouillon(s) sélectionné(s), maximum 200.`;
        supprimer.disabled = n < 1 || n > 200
          || resultats.querySelector('#nettoyage-confirmation').value !== `SUPPRIMER ${n}`
          || resultats.querySelector('#nettoyage-motif').value.trim().length < 10
          || !resultats.querySelector('#nettoyage-copies').checked;
      };
      resultats.oninput = maj;
      supprimer.addEventListener('click', async () => {
        supprimer.disabled = true; bouton.disabled = true; date.disabled = true;
        const options = { avant, ids: selection(), empreinte: revue.empreinte,
          confirmation: resultats.querySelector('#nettoyage-confirmation').value,
          motif: resultats.querySelector('#nettoyage-motif').value,
          copiesExternes: resultats.querySelector('#nettoyage-copies').checked };
        // Désactive la confirmation pendant l'appel pour empêcher un double envoi.
        resultats.querySelectorAll('input, textarea, button').forEach(e => { e.disabled = true; });
        try {
          const r = await ctx.store.nettoyerBrouillonsFormation(options);
          resultats.innerHTML = '<p role="status"><strong>' + r.supprimes + ' brouillon(s) supprimé(s) de la base active.</strong> '
            + r.pieces + ' pièce(s) et ' + r.signatures + ' signature(s) retirées.</p>'
            + (r.fichiersEnAttente ? '<p role="alert">' + r.fichiersEnAttente + ' fichier(s) restent sur disque : suppression en attente, reprise au démarrage.</p>' : '')
            + '<p>Les journaux, sauvegardes et autres copies restent à examiner. Ce résultat ne vaut pas effacement global.</p>';
          rafraichir();
        } catch (e) {
          resultats.innerHTML = '<p>Refaites l’aperçu avant toute nouvelle tentative.</p>';
          erreur.textContent = e.message;
        } finally { bouton.disabled = false; date.disabled = false; }
      });
    } catch (e) { erreur.textContent = e.message; }
    finally { bouton.disabled = false; }
  });
}
