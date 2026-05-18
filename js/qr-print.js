/**
 * inerWeb Fluide — Module d'impression d'étiquettes QR
 * ----------------------------------------------------
 * Génère des étiquettes 50x70 mm imprimables (machines, bouteilles, détecteurs)
 * et une planche A4 regroupant l'ensemble du parc.
 *
 * Dépendance : librairie QRCode.js (davidshimjs/qrcodejs) — exposée en global
 * via window.QRCode, chargée AVANT ce fichier dans index.html.
 *
 * API publique :
 *   QRPrint.etiquetteMachine(id)
 *   QRPrint.etiquetteBouteille(id)
 *   QRPrint.etiquetteDetecteur(id)
 *   QRPrint.imprimerTout()
 *   QRPrint.boutonHTML(type, id)
 *
 * Convention : tous les QR codes pointent vers l'URL absolue de l'app PWA
 *   https://frigorx.github.io/-inerweb-fluid-cerfa-fi-bsd-4/?<type>=<id>
 */

(function () {
  'use strict';

  // ====================================================================
  //  CONSTANTES
  // ====================================================================

  // URL absolue de l'application PWA (GitHub Pages, repo officiel inerWeb Fluide)
  const APP_URL = 'https://frigorx.github.io/-inerweb-fluid-cerfa-fi-bsd-4/';

  // Charte graphique inerWeb (cf. CLAUDE.md)
  const COULEUR_BLEU = '#1b3a63';
  const COULEUR_ORANGE = '#ff6b35';
  const COULEUR_ROUGE = '#c62828';
  const COULEUR_NOIR = '#000000';
  const COULEUR_GRIS = '#666666';

  // Taille en pixels du QR rendu par QRCode.js (avant export PNG)
  // Marge de qualité : ~280 px pour un rendu net en 35 mm imprimé
  const QR_PIXELS = 280;

  // Délai avant déclenchement de l'impression (laisse le navigateur peindre)
  const DELAI_IMPRESSION_MS = 600;

  // Seuil d'alerte "étalonnage proche" (en jours)
  const SEUIL_ALERTE_ETALONNAGE_JOURS = 60;

  // ====================================================================
  //  HELPERS INTERNES
  // ====================================================================

  /**
   * Échappe les caractères HTML dangereux pour insertion dans un template.
   */
  function escapeHTML(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Construit l'URL absolue cible d'un QR code.
   * @param {string} type — clé de query string : "machine" | "bouteille" | "detecteur"
   * @param {string} id   — identifiant de l'équipement
   */
  function buildQRUrl(type, id) {
    return APP_URL + '?' + type + '=' + encodeURIComponent(id);
  }

  /**
   * Génère un QR code en dataURL PNG via la librairie QRCode.js (synchrone).
   * Crée un div hors-écran, instancie QRCode, récupère le canvas/img, nettoie.
   *
   * @param {string} url — texte à encoder
   * @returns {string}   — data URL "data:image/png;base64,..." ou chaîne vide en cas d'erreur
   */
  function genererQRDataURL(url) {
    if (typeof window.QRCode === 'undefined') {
      console.error('[QRPrint] Librairie QRCode introuvable (window.QRCode non défini)');
      return '';
    }

    // Container temporaire hors-écran
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = '-9999px';
    div.style.top = '-9999px';
    document.body.appendChild(div);

    let dataURL = '';
    try {
      // Niveau de correction H = ~30% (compense bavure d'impression)
      // eslint-disable-next-line no-new
      new window.QRCode(div, {
        text: url,
        width: QR_PIXELS,
        height: QR_PIXELS,
        colorDark: COULEUR_NOIR,
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.H : 2
      });

      // QRCode.js produit soit un <canvas> (rendu HTML5) soit un <img> (fallback table/img)
      const canvas = div.querySelector('canvas');
      if (canvas) {
        dataURL = canvas.toDataURL('image/png');
      } else {
        const img = div.querySelector('img');
        if (img && img.src) dataURL = img.src;
      }
    } catch (err) {
      console.error('[QRPrint] Erreur génération QR', err);
    } finally {
      // Nettoyage systématique du div temporaire
      document.body.removeChild(div);
    }
    return dataURL;
  }

  /**
   * Formate une date ISO en JJ/MM/AAAA (réutilise UI.formatDate si dispo).
   */
  function formaterDate(iso) {
    if (!iso) return '';
    if (typeof UI !== 'undefined' && typeof UI.formatDate === 'function') {
      return UI.formatDate(iso);
    }
    try {
      return new Date(iso).toLocaleDateString('fr-FR');
    } catch (_e) {
      return String(iso);
    }
  }

  /**
   * Indique si une date d'étalonnage est "proche" (passée ou < SEUIL jours).
   */
  function etalonnageProche(iso) {
    if (!iso) return false;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return false;
    const aujourdhui = new Date();
    const diffJours = (d.getTime() - aujourdhui.getTime()) / (1000 * 60 * 60 * 24);
    return diffJours < SEUIL_ALERTE_ETALONNAGE_JOURS;
  }

  /**
   * Retrouve un détecteur dans State.detecteurs par id OU code.
   */
  function trouverDetecteur(id) {
    if (typeof State === 'undefined' || !Array.isArray(State.detecteurs)) return null;
    return State.detecteurs.find(d => d.id === id || d.code === id) || null;
  }

  // ====================================================================
  //  CONSTRUCTION DES BLOCS HTML "ÉTIQUETTE"
  // ====================================================================

  /**
   * Construit le HTML d'UNE étiquette (50x70 mm).
   * @param {Object} infos
   *   - qrDataURL : image PNG dataURL
   *   - code      : identifiant principal (gros, Trebuchet bold)
   *   - lignes    : tableau de chaînes (1 par ligne sous le code)
   *   - alerte    : booléen — passe la dernière ligne en rouge
   */
  function htmlEtiquette(infos) {
    const lignesHTML = (infos.lignes || [])
      .filter(Boolean)
      .map((ligne, idx, arr) => {
        const estDerniere = idx === arr.length - 1;
        const couleur = (infos.alerte && estDerniere) ? COULEUR_ROUGE : COULEUR_NOIR;
        const poids = (infos.alerte && estDerniere) ? 'bold' : 'normal';
        return '<div class="ligne" style="color:' + couleur + ';font-weight:' + poids + ';">'
          + escapeHTML(ligne) + '</div>';
      })
      .join('');

    return ''
      + '<div class="etiquette">'
      +   '<div class="qr-wrap">'
      +     (infos.qrDataURL
        ? '<img src="' + infos.qrDataURL + '" alt="QR ' + escapeHTML(infos.code) + '">'
        : '<div class="qr-erreur">QR indisponible</div>')
      +   '</div>'
      +   '<div class="code">' + escapeHTML(infos.code || '?') + '</div>'
      +   '<div class="details">' + lignesHTML + '</div>'
      + '</div>';
  }

  /**
   * CSS commun pour fenêtre d'impression (étiquette seule OU planche).
   * @param {boolean} planche — true = grille A4 / false = étiquette unique centrée
   */
  function cssImpression(planche) {
    return ''
      + '@page { size: A4; margin: 8mm; }'
      + '@media print { .no-print { display: none !important; } body { margin: 0; } }'
      + 'html, body { font-family: Calibri, "Segoe UI", Arial, sans-serif; background: #fff; color: ' + COULEUR_NOIR + '; margin: 0; padding: 0; }'
      + '.toolbar { background: ' + COULEUR_BLEU + '; color: #fff; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }'
      + '.toolbar h1 { margin: 0; font-family: "Trebuchet MS", sans-serif; font-size: 16px; font-weight: bold; }'
      + '.toolbar button { background: ' + COULEUR_ORANGE + '; color: #fff; border: none; padding: 8px 16px; font-family: "Trebuchet MS", sans-serif; font-weight: bold; font-size: 13px; cursor: pointer; border-radius: 4px; }'
      + '.toolbar button:hover { opacity: 0.9; }'
      + '.zone { padding: 8mm; }'
      + (planche
        ? '.planche { display: grid; grid-template-columns: repeat(3, 50mm); grid-auto-rows: 70mm; gap: 6mm; justify-content: center; }'
        : '.planche { display: flex; justify-content: center; padding-top: 10mm; }')
      + '.etiquette { width: 50mm; height: 70mm; border: 1px dashed ' + COULEUR_NOIR + '; padding: 2mm; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; page-break-inside: avoid; break-inside: avoid; overflow: hidden; background: #fff; }'
      + '.etiquette .qr-wrap { width: 35mm; height: 35mm; display: flex; align-items: center; justify-content: center; margin-top: 1mm; }'
      + '.etiquette .qr-wrap img { width: 35mm; height: 35mm; display: block; image-rendering: pixelated; }'
      + '.etiquette .qr-erreur { width: 35mm; height: 35mm; display: flex; align-items: center; justify-content: center; border: 1px solid ' + COULEUR_ROUGE + '; color: ' + COULEUR_ROUGE + '; font-size: 9pt; text-align: center; }'
      + '.etiquette .code { font-family: "Trebuchet MS", sans-serif; font-weight: bold; font-size: 12pt; color: ' + COULEUR_BLEU + '; margin-top: 2mm; text-align: center; line-height: 1.1; word-break: break-word; max-width: 46mm; }'
      + '.etiquette .details { font-family: Calibri, Arial, sans-serif; font-size: 9pt; line-height: 1.25; color: ' + COULEUR_NOIR + '; text-align: center; margin-top: 1mm; width: 100%; }'
      + '.etiquette .details .ligne { margin: 0.3mm 0; word-break: break-word; }'
      + '.entete-planche { font-family: "Trebuchet MS", sans-serif; font-weight: bold; font-size: 14pt; color: ' + COULEUR_BLEU + '; margin-bottom: 4mm; text-align: center; }'
      + '.sous-entete { font-family: Calibri, Arial, sans-serif; font-size: 9pt; color: ' + COULEUR_GRIS + '; text-align: center; margin-bottom: 6mm; }';
  }

  /**
   * Ouvre la fenêtre d'impression et y injecte le contenu, déclenche window.print().
   * @param {string} titre        — titre de la fenêtre
   * @param {string} contenuHTML  — HTML interne (sans body)
   * @param {boolean} planche     — true = mode planche, false = étiquette unique
   */
  function ouvrirFenetreImpression(titre, contenuHTML, planche) {
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) {
      if (typeof UI !== 'undefined' && UI.toast) {
        UI.toast('Impossible d\'ouvrir la fenêtre d\'impression (popup bloqué ?)', 'warning');
      } else {
        alert('Impossible d\'ouvrir la fenêtre d\'impression (popup bloqué ?)');
      }
      return;
    }

    const html = ''
      + '<!DOCTYPE html><html lang="fr"><head>'
      + '<meta charset="utf-8">'
      + '<title>' + escapeHTML(titre) + '</title>'
      + '<style>' + cssImpression(planche) + '</style>'
      + '</head><body>'
      + '<div class="toolbar no-print">'
      +   '<h1>' + escapeHTML(titre) + '</h1>'
      +   '<button onclick="window.print()">Imprimer</button>'
      + '</div>'
      + '<div class="zone">' + contenuHTML + '</div>'
      + '</body></html>';

    win.document.open();
    win.document.write(html);
    win.document.close();

    // Petit délai pour laisser le rendu des images se stabiliser
    setTimeout(function () {
      try { win.focus(); win.print(); } catch (_e) { /* silence */ }
    }, DELAI_IMPRESSION_MS);
  }

  // ====================================================================
  //  GÉNÉRATEURS D'ÉTIQUETTES PAR TYPE
  // ====================================================================

  /**
   * Construit l'objet "infos d'étiquette" pour une machine.
   */
  function infosMachine(machine) {
    const code = machine.code || machine.id || '?';
    const designation = machine.nom || machine.designation || '';
    const fluide = machine.fluide || '';
    const charge = (machine.chargeActuelle !== undefined && machine.chargeActuelle !== null)
      ? machine.chargeActuelle
      : (machine.charge !== undefined ? machine.charge : '');
    const chargeTxt = (charge !== '' && charge !== null)
      ? (parseFloat(charge).toFixed(2) + ' kg')
      : '';

    return {
      qrDataURL: genererQRDataURL(buildQRUrl('machine', machine.id || code)),
      code: code,
      lignes: [
        designation,
        fluide && chargeTxt ? (fluide + ' — ' + chargeTxt) : (fluide || chargeTxt)
      ]
    };
  }

  /**
   * Construit l'objet "infos d'étiquette" pour une bouteille.
   */
  function infosBouteille(bouteille) {
    const code = bouteille.code || bouteille.id || '?';
    const fluide = bouteille.fluide || '';
    const lot = bouteille.lot || bouteille.numeroLot || bouteille.numero || '';

    return {
      qrDataURL: genererQRDataURL(buildQRUrl('bouteille', bouteille.id || code)),
      code: code,
      lignes: [
        fluide ? ('Fluide : ' + fluide) : '',
        lot ? ('Lot : ' + lot) : ''
      ]
    };
  }

  /**
   * Construit l'objet "infos d'étiquette" pour un détecteur.
   */
  function infosDetecteur(detecteur) {
    const code = detecteur.code || detecteur.id || '?';
    const marque = detecteur.marque || '';
    const modele = detecteur.modele || '';
    // Le champ "prochain étalonnage" est stocké dans 'prochain' (cf. state/app)
    const prochain = detecteur.prochain || detecteur.prochainEtalonnage || '';
    const alerte = etalonnageProche(prochain);

    return {
      qrDataURL: genererQRDataURL(buildQRUrl('detecteur', detecteur.id || code)),
      code: code,
      alerte: alerte,
      lignes: [
        marque ? ('Marque : ' + marque) : '',
        modele ? ('Modèle : ' + modele) : '',
        prochain ? ('Prochain étalonnage : ' + formaterDate(prochain)) : 'Étalonnage : non renseigné'
      ]
    };
  }

  // ====================================================================
  //  API PUBLIQUE — window.QRPrint
  // ====================================================================

  const QRPrint = {

    /**
     * Imprime UNE étiquette pour une machine donnée.
     */
    etiquetteMachine: function (id) {
      const machine = (typeof State !== 'undefined' && State.getMachineById)
        ? State.getMachineById(id)
        : null;
      if (!machine) {
        if (typeof UI !== 'undefined' && UI.toast) UI.toast('Machine introuvable : ' + id, 'warning');
        return;
      }
      const html = htmlEtiquette(infosMachine(machine));
      ouvrirFenetreImpression('Étiquette QR machine — ' + (machine.code || machine.id),
        '<div class="planche">' + html + '</div>', false);
    },

    /**
     * Imprime UNE étiquette pour une bouteille donnée.
     */
    etiquetteBouteille: function (id) {
      const bouteille = (typeof State !== 'undefined' && State.getBouteilleById)
        ? State.getBouteilleById(id)
        : null;
      if (!bouteille) {
        if (typeof UI !== 'undefined' && UI.toast) UI.toast('Bouteille introuvable : ' + id, 'warning');
        return;
      }
      const html = htmlEtiquette(infosBouteille(bouteille));
      ouvrirFenetreImpression('Étiquette QR bouteille — ' + (bouteille.code || bouteille.id),
        '<div class="planche">' + html + '</div>', false);
    },

    /**
     * Imprime UNE étiquette pour un détecteur donné.
     */
    etiquetteDetecteur: function (id) {
      const detecteur = trouverDetecteur(id);
      if (!detecteur) {
        if (typeof UI !== 'undefined' && UI.toast) UI.toast('Détecteur introuvable : ' + id, 'warning');
        return;
      }
      const html = htmlEtiquette(infosDetecteur(detecteur));
      ouvrirFenetreImpression('Étiquette QR détecteur — ' + (detecteur.code || detecteur.id),
        '<div class="planche">' + html + '</div>', false);
    },

    /**
     * Imprime une planche A4 avec TOUTES les machines + bouteilles + détecteurs.
     * Grille 3 colonnes x 2 lignes = 6 étiquettes par page.
     */
    imprimerTout: function () {
      if (typeof State === 'undefined') {
        alert('État de l\'application non disponible.');
        return;
      }

      const machines = Array.isArray(State.machines) ? State.machines : [];
      const bouteilles = Array.isArray(State.bouteilles) ? State.bouteilles : [];
      const detecteurs = Array.isArray(State.detecteurs) ? State.detecteurs : [];

      const total = machines.length + bouteilles.length + detecteurs.length;
      if (total === 0) {
        if (typeof UI !== 'undefined' && UI.toast) {
          UI.toast('Aucun équipement à imprimer (machines, bouteilles, détecteurs vides)', 'warning');
        } else {
          alert('Aucun équipement à imprimer.');
        }
        return;
      }

      // Génération synchrone de toutes les étiquettes
      const blocs = [];
      machines.forEach(function (m) { blocs.push(htmlEtiquette(infosMachine(m))); });
      bouteilles.forEach(function (b) { blocs.push(htmlEtiquette(infosBouteille(b))); });
      detecteurs.forEach(function (d) { blocs.push(htmlEtiquette(infosDetecteur(d))); });

      const dateImpression = new Date().toLocaleDateString('fr-FR');
      const entete = ''
        + '<div class="entete-planche">Planche QR — Parc fluides frigorigènes</div>'
        + '<div class="sous-entete">Imprimé le ' + escapeHTML(dateImpression)
        + ' — ' + total + ' étiquette' + (total > 1 ? 's' : '')
        + ' (' + machines.length + ' machine' + (machines.length > 1 ? 's' : '')
        + ', ' + bouteilles.length + ' bouteille' + (bouteilles.length > 1 ? 's' : '')
        + ', ' + detecteurs.length + ' détecteur' + (detecteurs.length > 1 ? 's' : '') + ')'
        + '</div>';

      const html = entete + '<div class="planche">' + blocs.join('') + '</div>';
      ouvrirFenetreImpression('Planche QR — inerWeb Fluide', html, true);
    },

    /**
     * Retourne le HTML d'un bouton "QR" à intégrer dans les cartes d'équipement.
     * @param {string} type — "machine" | "bouteille" | "detecteur"
     * @param {string} id   — identifiant de l'équipement
     */
    boutonHTML: function (type, id) {
      const t = String(type || '').toLowerCase();
      return '<button class="btn-qr" data-qr-type="' + escapeHTML(t)
        + '" data-qr-id="' + escapeHTML(id) + '" title="Imprimer l\'étiquette QR">'
        + '\u{1F4F1} QR</button>';
    }
  };

  // Exposition globale
  window.QRPrint = QRPrint;

  // ====================================================================
  //  CÂBLAGE DOM (event delegation + bouton planche)
  // ====================================================================

  function brancherDOM() {
    // Délégation globale : tout clic sur .btn-qr déclenche la bonne méthode
    document.addEventListener('click', function (e) {
      const btn = e.target.closest ? e.target.closest('.btn-qr') : null;
      if (!btn) return;
      const type = (btn.getAttribute('data-qr-type') || '').toLowerCase();
      const id = btn.getAttribute('data-qr-id');
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      switch (type) {
        case 'machine':   QRPrint.etiquetteMachine(id);   break;
        case 'bouteille': QRPrint.etiquetteBouteille(id); break;
        case 'detecteur': QRPrint.etiquetteDetecteur(id); break;
        default:
          console.warn('[QRPrint] type inconnu :', type);
      }
    });

    // Bouton "imprimer tout" (planche A4) — remplace tout binding existant
    const btnTout = document.getElementById('btn-print-qrcodes');
    if (btnTout) {
      // Clone du noeud pour supprimer les listeners précédents éventuels
      const clone = btnTout.cloneNode(true);
      btnTout.parentNode.replaceChild(clone, btnTout);
      clone.addEventListener('click', function (e) {
        e.preventDefault();
        QRPrint.imprimerTout();
      });
    }
  }

  // Câblage au DOMContentLoaded (ou immédiatement si déjà chargé)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', brancherDOM);
  } else {
    brancherDOM();
  }

})();
