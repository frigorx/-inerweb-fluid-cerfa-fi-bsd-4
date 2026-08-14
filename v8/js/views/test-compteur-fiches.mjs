// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// CONSTAT A02 — LE COMPTEUR DE FICHES NE MENT PLUS (résidu
// présentationnel de l'audit externe).
//
// Le numéro de fiche est posé dans TOUS les modes (Formation comprise) :
// le compteur nbCerfa compte donc aussi les exercices d'élèves. Affiché
// sous un libellé « CERFA générés » (tableau de bord) ou « CERFA générés
// en <année> » (audit en 5 minutes), ce total faisait lire à un auditeur
// un nombre de CERFA qui inclut des fiches d'exercice. Le mode Formation
// est un choix assumé (les élèves interviennent sur le parc réel) — c'est
// l'AFFICHAGE qui est corrigé : le total est libellé pour ce qu'il est
// (fiches d'intervention) et la part opposable (mode OFFICIEL) est
// distinguée de la part d'exercice.
//
// PIÈGE ÉPROUVÉ ICI : la part officielle se lit au MODE scellé de
// l'écriture, JAMAIS au préfixe du numéro — le monde de démonstration
// numérote « FI-2026-NNNN » des fiches dont le mode est FORMATION. Une
// implémentation au préfixe compterait 7 « CERFA officiels » là où il y
// en a ZÉRO.
//
// Cette suite TIRE les surfaces réelles (rendu HTML de la vue, HTML de
// la modale), pas le code source.
// Exécution : node v8/js/views/test-compteur-fiches.mjs
// ============================================================

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

const { installerDocumentFactice } = await import('../core/shim-dom-tests.mjs');
const { document } = installerDocumentFactice();

const { creerStore } = await import('../data/datastore.js');
const { render: renderDashboard } = await import('./dashboard.js');
const { render: renderBilan } = await import('./bilan.js');

const store = await creerStore();
if (store.init) await store.init();

const ctx = { store, naviguer() {}, rafraichir() {} };

/** Valeur de la carte KPI dont le libellé est donné (rendu réel). */
function valeurKpi(html, libelle) {
  const i = html.indexOf(libelle);
  if (i === -1) return null;
  const m = /<div class="kpi-valeur">([^<]*)<\/div>/.exec(html.slice(i));
  return m ? m[1] : null;
}

/** Valeur de la ligne « audit en 5 minutes » dont le libellé est donné. */
function valeurLigneAudit(html, libelle) {
  const i = html.indexOf(libelle);
  if (i === -1) return null;
  const m = /<span class="audit5min-ligne-valeur[^"]*">([^<]*)<\/span>/
    .exec(html.slice(i));
  return m ? m[1] : null;
}

/** Déclenche les écouteurs « click » en ATTENDANT les asynchrones. */
async function cliquer(el) {
  for (const fn of ((el && el.ecouteurs && el.ecouteurs.click) || [])) {
    await fn({ target: el, preventDefault() {} });
  }
}

/** La DERNIÈRE modale posée dans le document. */
function derniereModale() {
  const zone = document.getElementById('zone-modales') || document.body;
  const fonds = zone.querySelectorAll('.modale-fond');
  return fonds[fonds.length - 1] || null;
}

// ============================================================
// Décor : le monde de démonstration porte LE piège — des fiches
// numérotées « FI- » dont le mode est FORMATION, et AUCUNE officielle.
// ============================================================
console.log('\n--- Décor : le monde de démonstration ---');

const mouvements = await store.getMouvements();
const numerotees = mouvements.filter((mv) => mv.cerfaNumero);
const officielles = numerotees.filter((mv) => mv.mode === 'OFFICIEL');

verifier('décor : des fiches numérotées existent', numerotees.length >= 1,
  String(numerotees.length));
verifier('décor : AUCUNE n’est en mode OFFICIEL (verrou de livraison fermé)',
  officielles.length === 0, String(officielles.length));
verifier('décor : au moins une fiche FORMATION porte un numéro « FI- » '
  + '(le préfixe MENT, seul le mode dit la vérité)',
numerotees.some((mv) =>
  mv.mode === 'FORMATION' && String(mv.cerfaNumero).startsWith('FI-')));

// ============================================================
// A. TABLEAU DE BORD — la carte KPI dit ce qu'elle compte
// ============================================================
console.log('\n--- A. Tableau de bord ---');

const conteneurTdb = document.createElement('div');
await renderDashboard(conteneurTdb, ctx);
const htmlTdb = conteneurTdb.innerHTML;

verifier('plus aucun libellé « CERFA générés » au tableau de bord',
  !htmlTdb.includes('CERFA générés'));
verifier('la carte s’appelle « Fiches d’intervention »',
  htmlTdb.includes('Fiches d’intervention'));
verifier('sa valeur est le nombre de fiches numérotées (total assumé)',
  valeurKpi(htmlTdb, 'Fiches d’intervention') === String(numerotees.length),
  `affiché « ${valeurKpi(htmlTdb, 'Fiches d’intervention')} » pour `
    + `${numerotees.length} fiches`);
verifier('⭐ la part officielle affichée est ZÉRO — malgré les numéros '
  + '« FI- », aucune fiche Formation ne passe pour un CERFA',
htmlTdb.includes('0 CERFA officiel'));
verifier('la part d’exercice est dite pour ce qu’elle est (mode Formation)',
  htmlTdb.includes(numerotees.length + ' en mode Formation'));

// ============================================================
// B. CONTRE-ÉPREUVE — une écriture réellement OFFICIELLE compte, elle
// (store espion : on ne peut pas en créer une, le verrou est fermé —
// c'est exactement pour cela que le compteur doit se lire au MODE).
// ============================================================
console.log('\n--- B. Une fiche OFFICIELLE compte comme CERFA ---');

const mouvementOfficiel = {
  id: 'mvt-test-officiel',
  numero: 'FI-2026-0099',
  date: '2026-07-01',
  mode: 'OFFICIEL',
  type: 'CHARGE_APPOINT',
  machineId: 'M1',
  machineLabel: 'Machine de test',
  fluide: 'R-32',
  quantiteKg: 0.5,
  technicien: 'Testeur',
  statut: 'VALIDE',
  cerfaNumero: 'FI-2026-0099'
};

const storeEspion = Object.create(store);
storeEspion.getMouvements = async function () {
  return [mouvementOfficiel, ...(await store.getMouvements())];
};

const conteneurTdb2 = document.createElement('div');
await renderDashboard(conteneurTdb2,
  { store: storeEspion, naviguer() {}, rafraichir() {} });
const htmlTdb2 = conteneurTdb2.innerHTML;

verifier('avec UNE écriture officielle : « 1 CERFA officiel »',
  htmlTdb2.includes('1 CERFA officiel'));
verifier('… le total monte d’une fiche',
  valeurKpi(htmlTdb2, 'Fiches d’intervention')
    === String(numerotees.length + 1));
verifier('… et la part Formation ne bouge pas',
  htmlTdb2.includes(numerotees.length + ' en mode Formation'));

// ============================================================
// C. AUDIT EN 5 MINUTES — le document remis à l'auditeur
// ============================================================
console.log('\n--- C. Audit en 5 minutes ---');

const conteneurBilan = document.createElement('div');
await renderBilan(conteneurBilan, ctx);
await cliquer(conteneurBilan.querySelector('#btn-audit-5min'));

const fond = derniereModale();
const htmlAudit = fond ? fond.innerHTML : '';
verifier('la modale « Audit en 5 minutes » est bien posée', Boolean(fond));

// L'année auditée est celle du bilan courant : on la lit dans la page.
const anneeAudit = (/Audit en 5 minutes — (\d{4})/.exec(htmlAudit) || [])[1];
verifier('l’année auditée se lit dans la page', Boolean(anneeAudit),
  htmlAudit.slice(0, 200));
const fichesAnnee = numerotees.filter((mv) =>
  mv.date.startsWith(anneeAudit + '-'));

verifier('plus aucun « CERFA générés en <année> » dans le document',
  !htmlAudit.includes('CERFA générés en'));
verifier('la section s’appelle « Fiches d’intervention »',
  htmlAudit.includes('Fiches d’intervention'));
verifier('le total de l’année est libellé « Fiches numérotées »',
  valeurLigneAudit(htmlAudit, 'Fiches numérotées en ' + anneeAudit)
    === String(fichesAnnee.length),
  `affiché « ${valeurLigneAudit(htmlAudit, 'Fiches numérotées en ' + anneeAudit)} » `
    + `pour ${fichesAnnee.length}`);
verifier('⭐ « CERFA officiels (mode Officiel) » affiche ZÉRO — un auditeur '
  + 'ne lit plus les exercices d’élèves comme des CERFA',
valeurLigneAudit(htmlAudit, 'CERFA officiels (mode Officiel)') === '0',
String(valeurLigneAudit(htmlAudit, 'CERFA officiels (mode Officiel)')));
verifier('la part d’exercice est dite « Fiches d’exercice (mode Formation) »',
  valeurLigneAudit(htmlAudit, 'Fiches d’exercice (mode Formation)')
    === String(fichesAnnee.length));

// ============================================================
// D. CONTRE-ÉPREUVE côté audit : l'écriture officielle y compte aussi
// ============================================================
console.log('\n--- D. L’audit compte la fiche officielle ---');

const conteneurBilan2 = document.createElement('div');
await renderBilan(conteneurBilan2,
  { store: storeEspion, naviguer() {}, rafraichir() {} });
await cliquer(conteneurBilan2.querySelector('#btn-audit-5min'));
const htmlAudit2 = derniereModale() ? derniereModale().innerHTML : '';
const anneeAudit2 = (/Audit en 5 minutes — (\d{4})/.exec(htmlAudit2) || [])[1];

if (anneeAudit2 === '2026') {
  verifier('avec UNE écriture officielle de 2026 : la ligne CERFA passe à 1',
    valeurLigneAudit(htmlAudit2, 'CERFA officiels (mode Officiel)') === '1',
    String(valeurLigneAudit(htmlAudit2, 'CERFA officiels (mode Officiel)')));
} else {
  // L'année auditée n'est pas celle de la fiche fabriquée : le zéro reste
  // exact — on vérifie seulement que rien ne s'appelle plus « CERFA générés ».
  verifier('année auditée ≠ 2026 : aucun libellé « CERFA générés » quand même',
    !htmlAudit2.includes('CERFA générés en'), anneeAudit2);
}

// ============================================================
// E. LOT 1 BRANCHE A — UNE CONTRE-ÉCRITURE NE COMPTE PLUS COMME UNE
//    FICHE NUMÉROTÉE.
//
// Depuis le 27/07/2026, une écriture d'annulation ne donne plus lieu à
// une fiche CERFA : les nouvelles naissent avec `cerfaNumero = null`.
// Mais les ANCIENNES gardent le leur, scellé dans l'empreinte v2 — on ne
// réécrit pas le passé. Un compteur basé sur le seul `cerfaNumero`
// continuerait donc d'annoncer une fiche que le logiciel ne sait plus
// produire : le tableau de bord et le document diraient deux choses
// différentes. Le compteur se lit sur le MÊME critère que le refus du
// générateur — `contreEcritureDe`.
//
// Le monde de démonstration ne contient aucune contre-écriture ancienne
// et le store n'en produit plus : le store espion est le seul moyen de
// tirer le cas sans forger une base.
// ============================================================
console.log('\n--- E. Une contre-écriture ne compte pas comme une fiche ---');

const contreEcritureAncienne = {
  id: 'mvt-test-contre-ancienne',
  numero: 'FI-2026-0098',
  date: '2026-07-01',
  mode: 'FORMATION',
  type: 'CHARGE_APPOINT',
  machineId: 'M1',
  machineLabel: 'Machine de test',
  fluide: 'R-32',
  quantiteKg: -0.5,
  technicien: 'Testeur',
  statut: 'VALIDE',
  // L'ANCIENNE forme : numéro de fiche scellé ET lien d'annulation.
  cerfaNumero: 'FI-2026-0098',
  contreEcritureDe: 'mvt-quelconque'
};

const storeEspionContre = Object.create(store);
storeEspionContre.getMouvements = async function () {
  return [contreEcritureAncienne, ...(await store.getMouvements())];
};

const conteneurTdb3 = document.createElement('div');
await renderDashboard(conteneurTdb3,
  { store: storeEspionContre, naviguer() {}, rafraichir() {} });
const htmlTdb3 = conteneurTdb3.innerHTML;

verifier('⭐ le total de fiches numérotées NE MONTE PAS d’une contre-écriture',
  valeurKpi(htmlTdb3, 'Fiches d’intervention') === String(numerotees.length),
  `affiché « ${valeurKpi(htmlTdb3, 'Fiches d’intervention')} » pour `
    + `${numerotees.length} fiches attendues`);
verifier('… et la part d’exercice ne bouge pas non plus',
  htmlTdb3.includes(numerotees.length + ' en mode Formation'));
verifier('… la part officielle reste à zéro',
  htmlTdb3.includes('0 CERFA officiel'));
verifier('… et aucun bouton CERFA ne lui est offert au tableau de bord',
  !htmlTdb3.includes('data-id="mvt-test-contre-ancienne">CERFA<'),
  'un bouton CERFA sur une contre-écriture produirait une erreur');
verifier('… c’est « Justificatif » qui lui est offert à la place',
  htmlTdb3.includes('tdb-btn-justificatif')
  && htmlTdb3.includes('data-id="mvt-test-contre-ancienne">Justificatif<'));

const conteneurBilan3 = document.createElement('div');
await renderBilan(conteneurBilan3,
  { store: storeEspionContre, naviguer() {}, rafraichir() {} });
await cliquer(conteneurBilan3.querySelector('#btn-audit-5min'));
const htmlAudit3 = derniereModale() ? derniereModale().innerHTML : '';
const anneeAudit3 = (/Audit en 5 minutes — (\d{4})/.exec(htmlAudit3) || [])[1];
if (anneeAudit3 === '2026') {
  verifier('⭐ l’audit en 5 minutes ne la compte pas non plus',
    valeurLigneAudit(htmlAudit3, 'CERFA officiels (mode Officiel)') === '0',
    String(valeurLigneAudit(htmlAudit3, 'CERFA officiels (mode Officiel)')));
} else {
  verifier('année auditée ≠ 2026 : la ligne officielle reste à zéro',
    valeurLigneAudit(htmlAudit3, 'CERFA officiels (mode Officiel)') === '0',
    anneeAudit3);
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
