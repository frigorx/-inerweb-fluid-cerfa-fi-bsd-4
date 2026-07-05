// ============================================================
// inerWeb Fluide — vue « Sauvegarde » (écran n° 7 de VISION §7)
// Coffre-fort de sauvegarde / restauration.
//
// Deux visages selon le mode du magasin de données :
//   • LOCAL (SQLite sur le poste) → écran complet : produire une
//     sauvegarde (snapshot ou archive, chiffrée ou non), lister les
//     sauvegardes du poste, tester et restaurer une archive avec un
//     écran de comparaison AVANT tout écrasement.
//   • DÉMO (données de démonstration en mémoire) → encart pédagogique :
//     le coffre-fort .zip n'existe qu'en mode Local ; on propose en
//     repli l'export / import JSON déjà en place dans la barre latérale.
//
// Les routes /api/sauvegarder|listerSauvegardes|restaurer|testerSauvegarde
// sont HORS du contrat DataStore (le DemoStore n'a ni disque, ni ZIP
// serveur). On les appelle donc par un petit client fetch DÉDIÉ, jamais
// par ctx.store. L'enveloppe { ok, resultat } est désenveloppée comme
// dans data/transport-http.js ; un échec relève le message serveur MOT
// POUR MOT (l'interface s'appuie dessus).
// ============================================================

import { enteteVue, tableau, toast, modale, chipStatut, ICONES } from './communs.js';
import { esc, fmtNombre } from '../core/utils.js';

export const titre = 'Sauvegarde';

/* ============================================================
   Client fetch DÉDIÉ aux routes coffre-fort (hors DataStore)
   ============================================================ */

/**
 * Appelle une route coffre-fort (POST /api/<route>, corps { params }) et
 * désenveloppe { ok, resultat } comme le transport HTTP du LocalStore.
 * Succès → resultat ; échec → throw Error(message serveur mot pour mot).
 * @param {string} route - « sauvegarder », « listerSauvegardes », …
 * @param {object} [params] - corps de la requête
 * @returns {Promise<any>}
 */
async function appelerCoffre(route, params = {}) {
  let reponse;
  try {
    reponse = await fetch('/api/' + route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params })
    });
  } catch (erreur) {
    throw new Error('Serveur local injoignable (' + route + ') : ' + erreur.message);
  }

  let enveloppe;
  try {
    enveloppe = await reponse.json();
  } catch {
    throw new Error('Réponse illisible du serveur local (' + route
      + ', HTTP ' + reponse.status + ').');
  }

  if (enveloppe && enveloppe.ok === true) {
    return enveloppe.resultat;
  }
  throw new Error((enveloppe && enveloppe.erreur)
    || ('Erreur du serveur local (' + route + ', HTTP ' + reponse.status + ').'));
}

/* ============================================================
   Styles propres à la vue — préfixés .vue-sauvegarde.
   Charte claire uniquement (jamais de teinte sombre).
   ============================================================ */

const STYLES_VUE = `
<style>
  .vue-sauvegarde .encart-aide { margin-bottom: 20px; }

  /* Grille des deux grandes actions (sauvegarder / rafraîchir) */
  .vue-sauvegarde .barre-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 22px;
  }

  /* Tous les boutons de la vue : cible confortable (>= 48 px) */
  .vue-sauvegarde .btn { min-height: 48px; }

  /* Cellule d'action par ligne du tableau */
  .vue-sauvegarde .actions-ligne {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .vue-sauvegarde .actions-ligne .btn {
    min-height: 40px;
    padding: 7px 14px;
  }

  /* Cadenas discret pour une sauvegarde chiffrée */
  .vue-sauvegarde .cadenas {
    display: inline-flex;
    align-items: center;
    color: var(--accent-fort);
  }
  .vue-sauvegarde .cadenas svg { width: 18px; height: 18px; }

  /* Ligne d'une sauvegarde illisible : signalée, jamais masquée */
  .vue-sauvegarde tr.ligne-invalide td { color: var(--texte-3); }

  /* Bloc de compteurs de l'écran de comparaison */
  .vue-sauvegarde .comparaison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin: 4px 0 8px;
  }
  @media (max-width: 620px) {
    .vue-sauvegarde .comparaison { grid-template-columns: 1fr; }
  }
  .vue-sauvegarde .comparaison-carte {
    background: var(--fond-3);
    border: 1px solid var(--bordure);
    border-radius: var(--rayon-carte);
    padding: 14px 16px;
  }
  .vue-sauvegarde .comparaison-carte h4 {
    margin: 0 0 10px;
    font-size: 12px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--texte-3);
  }
  .vue-sauvegarde .comparaison-ligne {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 0;
    border-bottom: 1px solid var(--bordure-2);
    font-size: 13.5px;
  }
  .vue-sauvegarde .comparaison-ligne:last-child { border-bottom: 0; }
  .vue-sauvegarde .comparaison-ligne .valeur {
    font-family: var(--police-mono);
    font-weight: 600;
    color: var(--texte);
  }

  /* Choix « type de sauvegarde » (snapshot / archive) : deux pavés */
  .vue-sauvegarde .choix-type {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 4px;
  }
  @media (max-width: 620px) {
    .vue-sauvegarde .choix-type { grid-template-columns: 1fr; }
  }
  .vue-sauvegarde .pave-type {
    display: block;
    text-align: left;
    padding: 14px 16px;
    border: 1.5px solid var(--bordure);
    border-radius: var(--rayon-carte);
    background: var(--carte);
    cursor: pointer;
    min-height: 48px;
  }
  .vue-sauvegarde .pave-type:hover { border-color: var(--accent); }
  .vue-sauvegarde .pave-type input { margin-right: 8px; }
  .vue-sauvegarde .pave-type .pave-titre {
    font-weight: 700;
    color: var(--texte);
  }
  .vue-sauvegarde .pave-type .pave-detail {
    display: block;
    margin-top: 4px;
    font-size: 12.5px;
    color: var(--texte-2);
    padding-left: 24px;
  }

  /* Champs de chiffrement révélés à la coche */
  .vue-sauvegarde .champs-chiffrement { margin-top: 12px; }
  .vue-sauvegarde .interrupteur-chiffrer {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 14px 0 2px;
    font-weight: 600;
    color: var(--texte);
  }
  .vue-sauvegarde .interrupteur-chiffrer input { width: 18px; height: 18px; }
</style>`;

/* ============================================================
   Icône cadenas — locale à la vue (absente de la bibliothèque)
   ============================================================ */

const ICONE_CADENAS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" '
  + 'width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" '
  + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
  + '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/>'
  + '<path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'
  + '<path d="M12 14.5v2.5"/></svg>';

/* ============================================================
   Aides de mise en forme
   ============================================================ */

/**
 * Horodatage ISO → date/heure locale lisible (« 05/07/2026 à 14:32 »).
 * @param {string} iso
 * @returns {string}
 */
function dateLisible(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return esc(String(iso));
  const jj = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const aaaa = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mn = String(d.getMinutes()).padStart(2, '0');
  return jj + '/' + mm + '/' + aaaa + ' à ' + hh + ':' + mn;
}

/** Entier formaté fr, ou « — » si absent. */
function entierOuTiret(n) {
  return (n === null || n === undefined) ? '—' : esc(fmtNombre(n, 0));
}

/* ============================================================
   Mode DÉMO — encart pédagogique + repli export / import JSON
   ============================================================ */

/**
 * Rend l'écran du mode DÉMO : le coffre-fort .zip n'existe qu'en mode
 * Local ; on explique et on propose le repli JSON déjà en place.
 * @param {HTMLElement} conteneur
 * @param {{ store: object }} ctx
 */
function rendreModeDemo(conteneur, ctx) {
  conteneur.innerHTML = '<div class="vue-sauvegarde anim-fade">'
    + STYLES_VUE
    + enteteVue({
      titre: 'Sauvegarde',
      sousTitre: 'Coffre-fort de sauvegarde et de restauration des données'
    })
    + '<div class="encart-aide">'
    + '<strong>Vous êtes en mode démonstration.</strong> '
    + 'Le coffre-fort de sauvegarde — fichier .zip horodaté, chiffrement '
    + 'facultatif et restauration en un clic — n’est disponible qu’en '
    + '<strong>mode Local</strong>, sur le poste où les données sont '
    + 'réellement enregistrées (base SQLite). En démonstration, les données '
    + 'vivent uniquement dans ce navigateur.'
    + '</div>'
    + '<div class="carte" style="padding:20px">'
    + '<h3 style="margin:0 0 6px;font-size:16px;color:var(--texte)">'
    + 'Repli en démonstration : export et import JSON</h3>'
    + '<p style="margin:0 0 16px;font-size:13.5px;color:var(--texte-2)">'
    + 'Pour conserver ou recharger le monde fictif de démonstration, '
    + 'vous pouvez exporter un fichier .json puis le réimporter. '
    + 'C’est le même mécanisme que le bouton « Sauvegarde » de la barre '
    + 'latérale.</p>'
    + '<div class="barre-actions">'
    + '<button type="button" id="btn-export-json" class="btn btn-marine">'
    + ICONES.telecharger + '<span>Exporter une sauvegarde (.json)</span></button>'
    + '<button type="button" id="btn-import-json" class="btn btn-contour">'
    + ICONES.televerser + '<span>Restaurer depuis un fichier (.json)</span></button>'
    + '</div>'
    + '<input id="fichier-json" type="file" accept=".json,application/json" hidden>'
    + '</div>'
    + '</div>';

  const boutonExport = conteneur.querySelector('#btn-export-json');
  const boutonImport = conteneur.querySelector('#btn-import-json');
  const champFichier = conteneur.querySelector('#fichier-json');

  boutonExport.addEventListener('click', async () => {
    try {
      const texte = await ctx.store.exporterJSON();
      const date = new Date().toISOString().slice(0, 10);
      const blob = new Blob([texte], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = 'inerweb-fluide-demo-' + date + '.json';
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
      toast('Sauvegarde exportée.', 'succes');
    } catch (erreur) {
      toast('L’export de la sauvegarde a échoué.', 'erreur');
    }
  });

  boutonImport.addEventListener('click', () => champFichier.click());

  champFichier.addEventListener('change', async () => {
    const fichier = champFichier.files && champFichier.files[0];
    if (!fichier) return;
    try {
      const texte = await fichier.text();
      const reussi = await ctx.store.importerJSON(texte);
      if (reussi) {
        toast('Données restaurées. Rechargement…', 'succes');
        setTimeout(() => window.location.reload(), 900);
      } else {
        toast('Fichier invalide : restauration impossible.', 'erreur');
      }
    } catch (erreur) {
      const message = erreur && erreur.message
        && erreur.message.startsWith('Import refusé')
        ? erreur.message
        : 'La restauration a échoué.';
      toast(message, 'erreur');
    } finally {
      champFichier.value = '';
    }
  });
}

/* ============================================================
   Mode LOCAL — écran complet du coffre-fort
   ============================================================ */

/** Tableau des sauvegardes présentes sur le poste. */
function tableauSauvegardes(liste) {
  const colonnes = [
    { cle: 'date',      libelle: 'Date' },
    { cle: 'type',      libelle: 'Type' },
    { cle: 'machines',  libelle: 'Machines',   align: 'droite' },
    { cle: 'ecritures', libelle: 'Écritures figées', align: 'droite' },
    { cle: 'documents', libelle: 'Documents',  align: 'droite' },
    { cle: 'chaine',    libelle: 'Chaîne',     align: 'centre' },
    { cle: 'chiffre',   libelle: 'Chiffré',    align: 'centre' },
    { cle: 'actions',   libelle: 'Actions',    align: 'droite' }
  ];

  const lignesHtml = liste.map((s, i) => {
    if (!s.valide) {
      // Une sauvegarde illisible est SIGNALÉE, jamais masquée.
      return '<tr class="ligne-invalide">'
        + '<td>' + esc(s.fichier || '?') + '</td>'
        + '<td colspan="6">'
        + '<span class="chip chip-rouge">Illisible</span> '
        + esc(s.erreur || 'Manifeste invalide.')
        + '</td>'
        + '<td class="align-droite">—</td>'
        + '</tr>';
    }
    const c = s.compteurs || {};
    const chaineOk = s.chaineRegistreOk && s.chaineJournalOk;
    const chipChaine = chaineOk
      ? '<span class="chip chip-vert">OK</span>'
      : '<span class="chip chip-rouge">Rompue</span>';
    const marqueChiffre = s.chiffre
      ? '<span class="cadenas" title="Sauvegarde chiffrée">' + ICONE_CADENAS + '</span>'
      : '<span style="color:var(--texte-3)">—</span>';
    // typeMouvement/statut n'ont pas de chip dédiée : on colore le type
    // de sauvegarde par une chip neutre lisible.
    const chipType = s.type === 'ARCHIVE'
      ? '<span class="chip chip-bleu">Archive complète</span>'
      : '<span class="chip chip-teal">Snapshot</span>';

    return '<tr>'
      + '<td>' + dateLisible(s.horodatage) + '</td>'
      + '<td>' + chipType + '</td>'
      + '<td class="align-droite">' + entierOuTiret(c.machines) + '</td>'
      + '<td class="align-droite">' + entierOuTiret(c.mouvementsValides) + '</td>'
      + '<td class="align-droite">' + entierOuTiret(c.documents) + '</td>'
      + '<td class="align-centre">' + chipChaine + '</td>'
      + '<td class="align-centre">' + marqueChiffre + '</td>'
      + '<td class="align-droite">'
      + '<div class="actions-ligne">'
      + '<button type="button" class="btn btn-secondaire" data-action="tester" data-index="' + i + '">'
      + ICONES.controle + '<span>Tester</span></button>'
      + '<button type="button" class="btn btn-contour" data-action="restaurer" data-index="' + i + '">'
      + ICONES.televerser + '<span>Restaurer</span></button>'
      + '</div>'
      + '</td>'
      + '</tr>';
  });

  return tableau({ colonnes, lignesHtml });
}

/** Page complète du mode LOCAL, pour une liste de sauvegardes donnée. */
function construireHtmlLocal(liste) {
  return '<div class="vue-sauvegarde anim-fade">'
    + STYLES_VUE
    + enteteVue({
      titre: 'Sauvegarde',
      sousTitre: 'Coffre-fort local : sauvegarder, tester et restaurer les données du poste'
    })
    + '<div class="encart-aide">'
    + '<strong>Sauvegarde locale du poste.</strong> '
    + 'Un <em>snapshot</em> copie la seule base (rapide, léger) ; une '
    + '<em>archive complète</em> copie la base <strong>et</strong> les '
    + 'documents joints. Le chiffrement (facultatif) protège le fichier par '
    + 'une phrase secrète. La restauration ne remplace jamais les données '
    + 'sans un écran de comparaison et, en cas de perte, une confirmation '
    + 'explicite.'
    + '</div>'
    + '<div class="barre-actions">'
    + '<button type="button" id="btn-sauvegarder" class="btn btn-marine">'
    + ICONES.sauvegarde + '<span>Sauvegarder maintenant</span></button>'
    + '<button type="button" id="btn-rafraichir" class="btn btn-secondaire">'
    + ICONES.echange + '<span>Rafraîchir la liste</span></button>'
    + '</div>'
    + tableauSauvegardes(liste)
    + '</div>';
}

/* ============================================================
   Modale « Sauvegarder maintenant »
   ============================================================ */

/**
 * Ouvre la modale de production d'une sauvegarde : type (snapshot / archive
 * complète), chiffrement facultatif (phrase + indice non secret). Appelle
 * /api/sauvegarder, affiche un toast avec le nom du fichier, puis rafraîchit.
 * @param {() => Promise<void>} rafraichir
 */
function ouvrirModaleSauvegarder(rafraichir) {
  const contenuHtml = ''
    + '<form class="formulaire" id="form-sauvegarder" novalidate>'
    + '<div id="zone-erreur-sauvegarder"></div>'
    + '<div class="choix-type">'
    + '<label class="pave-type">'
    + '<span class="pave-titre"><input type="radio" name="type-sauvegarde" value="SNAPSHOT" checked>'
    + 'Snapshot</span>'
    + '<span class="pave-detail">Base seule. Rapide et léger — le filet du quotidien.</span>'
    + '</label>'
    + '<label class="pave-type">'
    + '<span class="pave-titre"><input type="radio" name="type-sauvegarde" value="ARCHIVE">'
    + 'Archive complète</span>'
    + '<span class="pave-detail">Base et documents joints. Plus lourde — la sauvegarde de référence.</span>'
    + '</label>'
    + '</div>'
    + '<label class="interrupteur-chiffrer">'
    + '<input type="checkbox" id="chk-chiffrer"> Chiffrer cette sauvegarde (phrase secrète)'
    + '</label>'
    + '<div class="champs-chiffrement" id="champs-chiffrement" hidden>'
    + '<div class="champ">'
    + '<label for="champ-phrase">Phrase secrète *</label>'
    + '<input type="password" id="champ-phrase" autocomplete="new-password"'
    + ' placeholder="Une phrase longue, connue de vous seul">'
    + '</div>'
    + '<div class="champ">'
    + '<label for="champ-indice">Indice (facultatif, non secret)</label>'
    + '<input type="text" id="champ-indice" maxlength="120"'
    + ' placeholder="Aide-mémoire pour retrouver la phrase — jamais la phrase elle-même">'
    + '</div>'
    + '</div>'
    + '</form>';

  const actionsHtml = ''
    + '<button type="button" class="btn btn-contour" data-action="annuler">Annuler</button>'
    + '<button type="submit" form="form-sauvegarder" class="btn btn-marine">'
    + ICONES.sauvegarde + '<span>Lancer la sauvegarde</span></button>';

  const instance = modale({
    titre: 'Sauvegarder maintenant',
    contenuHtml,
    actionsHtml
  });

  // Toujours cibler la racine RETOURNÉE par modale() (jamais document) : deux
  // modales peuvent s'empiler et un sélecteur global attraperait la mauvaise.
  const racine = instance.racine;
  const form = racine.querySelector('#form-sauvegarder');
  const zoneErreur = racine.querySelector('#zone-erreur-sauvegarder');
  const chkChiffrer = racine.querySelector('#chk-chiffrer');
  const champsChiffrement = racine.querySelector('#champs-chiffrement');
  const champPhrase = racine.querySelector('#champ-phrase');
  const champIndice = racine.querySelector('#champ-indice');
  let enCours = false;

  function afficherErreur(message) {
    zoneErreur.innerHTML = '<div class="bandeau-erreur">' + ICONES.alerte
      + '<span>' + esc(message) + '</span></div>';
  }

  chkChiffrer.addEventListener('change', () => {
    champsChiffrement.hidden = !chkChiffrer.checked;
    if (chkChiffrer.checked) champPhrase.focus();
  });

  racine.querySelector('[data-action="annuler"]').addEventListener('click', () => {
    instance.fermer();
  });

  form.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    if (enCours) return;
    zoneErreur.innerHTML = '';

    const type = (form.querySelector('input[name="type-sauvegarde"]:checked') || {}).value
      || 'SNAPSHOT';
    const chiffrer = chkChiffrer.checked;
    const phrase = champPhrase.value;
    const indice = champIndice.value.trim();

    if (chiffrer && (!phrase || phrase.length === 0)) {
      afficherErreur('Une phrase secrète est requise pour chiffrer la sauvegarde.');
      champPhrase.focus();
      return;
    }

    enCours = true;
    const boutonEnvoi = racine.querySelector('button[type="submit"]');
    boutonEnvoi.disabled = true;
    try {
      const resultat = await appelerCoffre('sauvegarder', {
        type,
        chiffrer,
        phrase: chiffrer ? phrase : undefined,
        indice: (chiffrer && indice) ? indice : null
      });
      const nomFichier = resultat && resultat.chemin
        ? resultat.chemin.replace(/^.*[\\/]/, '')
        : 'sauvegarde';
      instance.fermer();
      toast('Sauvegarde créée : ' + nomFichier
        + (resultat && resultat.chiffre ? ' (chiffrée).' : '.'), 'succes');
      await rafraichir();
    } catch (erreur) {
      afficherErreur(erreur.message || 'La sauvegarde a échoué.');
      boutonEnvoi.disabled = false;
      enCours = false;
    }
  });
}

/* ============================================================
   Modale « phrase secrète » (test / restauration d'un chiffré)
   ============================================================ */

/**
 * Demande la phrase secrète d'une sauvegarde chiffrée.
 * @param {string} intitule - titre de la modale
 * @param {(phrase: string) => void} onValider - reçoit la phrase saisie
 */
function demanderPhrase(intitule, onValider) {
  const contenuHtml = ''
    + '<form class="formulaire" id="form-phrase" novalidate>'
    + '<div id="zone-erreur-phrase"></div>'
    + '<p style="margin:0 0 4px;font-size:13.5px;color:var(--texte-2)">'
    + 'Cette sauvegarde est chiffrée. Saisissez la phrase secrète pour '
    + 'la lire.</p>'
    + '<div class="champ">'
    + '<label for="champ-phrase-lecture">Phrase secrète *</label>'
    + '<input type="password" id="champ-phrase-lecture" autocomplete="off" required>'
    + '</div>'
    + '</form>';

  const actionsHtml = ''
    + '<button type="button" class="btn btn-contour" data-action="annuler">Annuler</button>'
    + '<button type="submit" form="form-phrase" class="btn btn-marine">'
    + ICONES.coche + '<span>Valider</span></button>';

  const instance = modale({ titre: intitule, contenuHtml, actionsHtml });
  const racine = instance.racine;
  const form = racine.querySelector('#form-phrase');
  const zoneErreur = racine.querySelector('#zone-erreur-phrase');
  const champ = racine.querySelector('#champ-phrase-lecture');

  racine.querySelector('[data-action="annuler"]').addEventListener('click', () => {
    instance.fermer();
  });

  form.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const phrase = champ.value;
    if (!phrase || phrase.length === 0) {
      zoneErreur.innerHTML = '<div class="bandeau-erreur">' + ICONES.alerte
        + '<span>La phrase secrète est obligatoire.</span></div>';
      champ.focus();
      return;
    }
    instance.fermer();
    onValider(phrase);
  });
}

/* ============================================================
   Tester une sauvegarde
   ============================================================ */

/**
 * Teste une sauvegarde (base courante jamais touchée) et affiche le verdict.
 * Si la sauvegarde est chiffrée, demande d'abord la phrase.
 * @param {object} sauvegarde - entrée de listerSauvegardes
 */
function testerSauvegarde(sauvegarde) {
  const lancer = (phrase) => envoyerTest(sauvegarde, phrase);
  if (sauvegarde.chiffre) {
    demanderPhrase('Tester une sauvegarde chiffrée', lancer);
  } else {
    lancer(undefined);
  }
}

/** Envoie /api/testerSauvegarde et présente le verdict VERT / ROUGE. */
async function envoyerTest(sauvegarde, phrase) {
  toast('Test en cours…', 'info');
  try {
    const resultat = await appelerCoffre('testerSauvegarde', {
      chemin: sauvegarde.chemin,
      phrase
    });
    if (resultat && resultat.verdict === 'VERT') {
      toast('Sauvegarde saine : elle est restaurable.', 'succes');
    } else {
      const motif = (resultat && resultat.motif) ? ' — ' + resultat.motif : '';
      toast('Sauvegarde NON restaurable' + motif + '.', 'erreur');
    }
  } catch (erreur) {
    toast(erreur.message || 'Le test a échoué.', 'erreur');
  }
}

/* ============================================================
   Restaurer une sauvegarde (avec écran de comparaison)
   ============================================================ */

/**
 * Point d'entrée de la restauration : demande la phrase si chiffré, puis
 * ouvre l'écran de comparaison avant tout écrasement.
 * @param {object} sauvegarde - entrée de listerSauvegardes
 * @param {() => Promise<void>} rafraichir
 */
function restaurerSauvegarde(sauvegarde, rafraichir) {
  const ouvrir = (phrase) => ouvrirComparaison(sauvegarde, phrase, rafraichir);
  if (sauvegarde.chiffre) {
    demanderPhrase('Restaurer une sauvegarde chiffrée', ouvrir);
  } else {
    ouvrir(undefined);
  }
}

/** Une ligne de compteur pour l'écran de comparaison. */
function ligneCompteur(libelle, valeur) {
  return '<div class="comparaison-ligne"><span>' + esc(libelle) + '</span>'
    + '<span class="valeur">' + entierOuTiret(valeur) + '</span></div>';
}

/**
 * Écran de comparaison AVANT restauration : compteurs de l'archive face à
 * ceux de la base courante. Si l'archive fige MOINS d'écritures que la base,
 * un avertissement net exige une confirmation explicite (confirmePerte).
 * @param {object} sauvegarde
 * @param {string|undefined} phrase
 * @param {() => Promise<void>} rafraichir
 */
function ouvrirComparaison(sauvegarde, phrase, rafraichir) {
  const archive = sauvegarde.compteurs || {};

  // On affiche les compteurs de l'archive (tirés de son manifeste) et on
  // laisse le SERVEUR trancher la régression : /api/restaurer compare avec la
  // base vive et refuse (« … perdrait N ») tant que confirmePerte n'est pas
  // passé. Ce refus est alors transformé en une seconde confirmation explicite
  // (confirmerPerte), avec le détail chiffré repris du message serveur.
  const contenuHtml = ''
    + '<div id="zone-erreur-restaurer"></div>'
    + '<p style="margin:0 0 10px;font-size:13.5px;color:var(--texte-2)">'
    + 'Vous vous apprêtez à restaurer la sauvegarde du '
    + '<strong>' + dateLisible(sauvegarde.horodatage) + '</strong>. '
    + 'Comparez son contenu avec la base actuelle avant de confirmer.</p>'
    + '<div class="comparaison">'
    + '<div class="comparaison-carte">'
    + '<h4>Contenu de la sauvegarde</h4>'
    + ligneCompteur('Machines', archive.machines)
    + ligneCompteur('Bouteilles', archive.bouteilles)
    + ligneCompteur('Mouvements (total)', archive.mouvements)
    + ligneCompteur('Écritures figées', archive.mouvementsValides)
    + ligneCompteur('Documents joints', archive.documents)
    + '</div>'
    + '<div class="comparaison-carte">'
    + '<h4>Type et intégrité</h4>'
    + '<div class="comparaison-ligne"><span>Type</span><span class="valeur">'
    + (sauvegarde.type === 'ARCHIVE' ? 'Archive complète' : 'Snapshot') + '</span></div>'
    + '<div class="comparaison-ligne"><span>Chaîne du registre</span><span>'
    + (sauvegarde.chaineRegistreOk
      ? '<span class="chip chip-vert">OK</span>'
      : '<span class="chip chip-rouge">Rompue</span>') + '</span></div>'
    + '<div class="comparaison-ligne"><span>Chaîne du journal</span><span>'
    + (sauvegarde.chaineJournalOk
      ? '<span class="chip chip-vert">OK</span>'
      : '<span class="chip chip-rouge">Rompue</span>') + '</span></div>'
    + '<div class="comparaison-ligne"><span>Chiffrée</span><span class="valeur">'
    + (sauvegarde.chiffre ? 'Oui' : 'Non') + '</span></div>'
    + '</div>'
    + '</div>'
    + '<div class="bandeau-avertissement" style="margin-top:8px">' + ICONES.alerte
    + '<span>La restauration <strong>remplace intégralement</strong> les données '
    + 'actuelles par celles de la sauvegarde. Un filet de sécurité de l’état '
    + 'actuel est créé automatiquement juste avant.</span></div>';

  const actionsHtml = ''
    + '<button type="button" class="btn btn-contour" data-action="annuler">Annuler</button>'
    + '<button type="button" class="btn btn-marine" data-action="confirmer">'
    + ICONES.televerser + '<span>Restaurer cette sauvegarde</span></button>';

  const instance = modale({
    titre: 'Comparer avant de restaurer',
    contenuHtml,
    actionsHtml
  });
  const racine = instance.racine;
  const zoneErreur = racine.querySelector('#zone-erreur-restaurer');
  const boutonConfirmer = racine.querySelector('[data-action="confirmer"]');
  let enCours = false;

  racine.querySelector('[data-action="annuler"]').addEventListener('click', () => {
    instance.fermer();
  });

  boutonConfirmer.addEventListener('click', async () => {
    if (enCours) return;
    enCours = true;
    boutonConfirmer.disabled = true;
    zoneErreur.innerHTML = '';
    try {
      await lancerRestauration(sauvegarde, phrase, false);
      instance.fermer();
      await rafraichir();
    } catch (erreur) {
      // Le serveur refuse une RÉGRESSION (« Restauration refusée : … perdrait
      // N ») tant que confirmePerte n'est pas passé : on transforme ce refus
      // en confirmation explicite plutôt qu'en simple erreur.
      if (estRefusRegression(erreur.message)) {
        instance.fermer();
        confirmerPerte(sauvegarde, phrase, erreur.message, rafraichir);
      } else {
        zoneErreur.innerHTML = '<div class="bandeau-erreur">' + ICONES.alerte
          + '<span>' + esc(erreur.message || 'La restauration a échoué.')
          + '</span></div>';
        boutonConfirmer.disabled = false;
        enCours = false;
      }
    }
  });
}

/** Vrai si le message serveur signale un refus pour régression (perte). */
function estRefusRegression(message) {
  return typeof message === 'string'
    && message.indexOf('Restauration refusée') !== -1
    && message.indexOf('perdrait') !== -1;
}

/**
 * Seconde confirmation, explicite, quand la restauration ferait PERDRE des
 * écritures figées (l'archive est plus ancienne que la base). On reprend le
 * message chiffré du serveur (« perdrait N ») et on exige un clic net.
 * @param {object} sauvegarde
 * @param {string|undefined} phrase
 * @param {string} messageServeur - le refus « … perdrait N … »
 * @param {() => Promise<void>} rafraichir
 */
function confirmerPerte(sauvegarde, phrase, messageServeur, rafraichir) {
  const contenuHtml = ''
    + '<div id="zone-erreur-perte"></div>'
    + '<div class="bandeau-avertissement">' + ICONES.alerte
    + '<span><strong>Attention : perte de données.</strong> '
    + esc(messageServeur) + '</span></div>'
    + '<p style="margin:12px 0 0;font-size:13.5px;color:var(--texte-2)">'
    + 'Cette sauvegarde est plus ancienne que la base actuelle : des écritures '
    + 'déjà figées seront <strong>définitivement perdues</strong>. Un filet de '
    + 'sécurité de l’état actuel est tout de même créé avant l’opération. '
    + 'Confirmez-vous vouloir continuer malgré la perte ?</p>';

  const actionsHtml = ''
    + '<button type="button" class="btn btn-contour" data-action="renoncer">Renoncer</button>'
    + '<button type="button" class="btn btn-marine" data-action="perdre">'
    + '<span>Restaurer malgré la perte</span></button>';

  const instance = modale({
    titre: 'Confirmer la perte d’écritures',
    contenuHtml,
    actionsHtml
  });
  const racine = instance.racine;
  const zoneErreur = racine.querySelector('#zone-erreur-perte');
  const boutonPerdre = racine.querySelector('[data-action="perdre"]');
  let enCours = false;

  racine.querySelector('[data-action="renoncer"]').addEventListener('click', () => {
    instance.fermer();
  });

  boutonPerdre.addEventListener('click', async () => {
    if (enCours) return;
    enCours = true;
    boutonPerdre.disabled = true;
    zoneErreur.innerHTML = '';
    try {
      await lancerRestauration(sauvegarde, phrase, true);
      instance.fermer();
      await rafraichir();
    } catch (erreur) {
      zoneErreur.innerHTML = '<div class="bandeau-erreur">' + ICONES.alerte
        + '<span>' + esc(erreur.message || 'La restauration a échoué.')
        + '</span></div>';
      boutonPerdre.disabled = false;
      enCours = false;
    }
  });
}

/**
 * Appelle /api/restaurer et présente le verdict par un toast. Relève une
 * erreur en cas d'échec (traité par l'appelant, notamment le refus régression).
 * @param {object} sauvegarde
 * @param {string|undefined} phrase
 * @param {boolean} confirmePerte
 */
async function lancerRestauration(sauvegarde, phrase, confirmePerte) {
  toast('Restauration en cours…', 'info');
  const resultat = await appelerCoffre('restaurer', {
    chemin: sauvegarde.chemin,
    phrase,
    confirmePerte
  });
  if (resultat && resultat.verdict === 'VERT') {
    const apres = resultat.compteursApres || {};
    toast('Données restaurées ('
      + entierOuTiret(apres.mouvementsValides) + ' écriture(s) figée(s)).',
      'succes');
  } else {
    // Verdict ROUGE : la base a été ramenée à l'état d'avant (rollback auto).
    const motif = (resultat && resultat.motif) ? ' — ' + resultat.motif : '';
    toast('Restauration échouée' + motif
      + '. La base a été ramenée à son état précédent.', 'erreur');
  }
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * Rendu de la vue « Sauvegarde ».
 * @param {HTMLElement} conteneur - élément déjà vidé par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  // Aiguillage sur le mode du magasin. LOCAL → coffre-fort complet ;
  // sinon (DÉMO) → encart pédagogique + repli export / import JSON.
  if (!ctx.store || ctx.store.modeLabel !== 'LOCAL') {
    rendreModeDemo(conteneur, ctx);
    return;
  }

  /** Charge la liste des sauvegardes, rend la page, branche les écouteurs. */
  async function chargerEtAfficher() {
    let liste = [];
    let erreurListe = null;
    try {
      liste = await appelerCoffre('listerSauvegardes', {});
    } catch (erreur) {
      erreurListe = erreur.message || 'Lecture des sauvegardes impossible.';
    }
    conteneur.innerHTML = construireHtmlLocal(Array.isArray(liste) ? liste : []);
    if (erreurListe) {
      toast(erreurListe, 'erreur');
    }
    attacherEcouteurs(Array.isArray(liste) ? liste : []);
  }

  /** Branche les deux actions de tête + les actions par ligne. */
  function attacherEcouteurs(liste) {
    const boutonSauvegarder = conteneur.querySelector('#btn-sauvegarder');
    const boutonRafraichir = conteneur.querySelector('#btn-rafraichir');

    boutonSauvegarder.addEventListener('click', () => {
      ouvrirModaleSauvegarder(chargerEtAfficher);
    });
    boutonRafraichir.addEventListener('click', () => {
      chargerEtAfficher();
    });

    conteneur.querySelectorAll('[data-action]').forEach((bouton) => {
      const action = bouton.getAttribute('data-action');
      const index = Number(bouton.getAttribute('data-index'));
      const sauvegarde = liste[index];
      if (!sauvegarde || !sauvegarde.valide) return;
      if (action === 'tester') {
        bouton.addEventListener('click', () => testerSauvegarde(sauvegarde));
      } else if (action === 'restaurer') {
        bouton.addEventListener('click', () =>
          restaurerSauvegarde(sauvegarde, chargerEtAfficher));
      }
    });
  }

  await chargerEtAfficher();
}
