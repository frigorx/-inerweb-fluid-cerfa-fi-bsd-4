/* =====================================================================
   simulation.js — LE MOTEUR DU CIRCUIT DE COMMANDE
   ---------------------------------------------------------------------
   Un seul circuit : Q1 → S1 (arrêt, NC) → [ S2 (marche, NO) ∥ KM1 13-14 ]
   → bobine KM1 (A1-A2) → N.

   L'état d'entrée est ce que l'élève manipule : le disjoncteur Q1, les
   deux boutons, et l'état précédent du contacteur (c'est lui qui fait la
   mémoire). Chaque câblage — le bon et les six fautifs — est une fonction
   qui dit si la bobine est alimentée. `stabiliser` rejoue la fonction
   jusqu'à ce que le contacteur ne bouge plus ; s'il ne se stabilise pas,
   c'est qu'il bat (le cas du contact auxiliaire NC pris pour un NO).

   Aucune dépendance. Le fichier tourne dans le navigateur (window) et sous
   node (globalThis) pour la vérification `node controle-simulation.mjs`.
   ===================================================================== */
(function (racine) {
  'use strict';

  const CABLAGES = {
    normal: {
      nom: 'Câblage conforme',
      bobine: e => e.q && !e.s1 && (e.s2 || e.km)
    },
    'sans-maintien': {
      nom: 'Contact 13-14 non câblé',
      bobine: e => e.q && !e.s1 && e.s2
    },
    'maintien-amont': {
      nom: 'Contact 13-14 pris en amont du bouton Arrêt',
      bobine: e => e.q && ((!e.s1 && e.s2) || e.km)
    },
    'arret-parallele': {
      nom: 'Bouton Arrêt câblé en parallèle du bouton Marche',
      bobine: e => e.q && (!e.s1 || e.s2 || e.km)
    },
    'marche-nc': {
      nom: 'Bouton Marche pris sur un contact NC (1-2) au lieu du NO (3-4)',
      bobine: e => e.q && !e.s1 && (!e.s2 || e.km)
    },
    'auxiliaire-nc': {
      nom: 'Maintien pris sur le contact auxiliaire NC (21-22) au lieu du NO (13-14)',
      bobine: e => e.q && !e.s1 && (e.s2 || !e.km)
    },
    'bobine-hs': {
      nom: 'Bobine coupée ou borne A2 non raccordée',
      bobine: () => false
    }
  };

  /* Rejoue la bobine jusqu'à stabilité. Retourne { km, bat }.
     `bat` = le contacteur claque sans s'arrêter : chaque fermeture provoque
     l'ouverture qui provoque la fermeture… */
  function stabiliser(cablage, e) {
    const f = CABLAGES[cablage].bobine;
    let km = !!e.km;
    for (let i = 0; i < 8; i++) {
      const b = !!f({ q: !!e.q, s1: !!e.s1, s2: !!e.s2, km });
      if (b === km) return { km, bat: false };
      km = b;
    }
    return { km, bat: true };
  }

  /* Segments sous tension, pour le dessin — uniquement pour le câblage
     conforme : en dépannage le courant ne se voit pas, comme sur une vraie
     platine. */
  function segments(e) {
    const amont = !!e.q;
    const a = amont && !e.s1;
    const b = a && (!!e.s2 || !!e.km);
    return { reseau: true, amont, a, b, bobine: b };
  }

  racine.SIMULATION = { CABLAGES, stabiliser, segments };
})(typeof window !== 'undefined' ? window : globalThis);
