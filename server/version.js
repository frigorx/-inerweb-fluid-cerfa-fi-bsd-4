// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// LA source unique de version (revue du 14/08/2026 : « 8.0.0-dev » était
// recopié dans trois modules avec un commentaire demandant de les tenir
// alignés — c'est exactement ce qu'une source unique supprime).
//
// - VERSION_LOGICIEL : la version du produit. package.json porte la même
//   valeur ; outils/fabriquer-paquet.mjs REFUSE de fabriquer si elles
//   divergent (le dépôt de développement peut, lui, démarrer quand même).
// - NODE_VALIDE : la version EXACTE de Node.js validée pour être embarquée
//   dans les paquets portables — pas une borne basse : la version que le
//   filet et les bancs ont réellement prouvée.
//
// Les versions du CONTRAT et du SCHÉMA ont leurs propres sources :
// v8/js/data/contrat.js (VERSION_CONTRAT) et server/migrations.js (la
// dernière migration du registre) — on ne les recopie pas ici.
// ============================================================
'use strict';

const VERSION_LOGICIEL = '8.0.0-dev';
const NODE_VALIDE = '24.19.0';

module.exports = { VERSION_LOGICIEL, NODE_VALIDE };
