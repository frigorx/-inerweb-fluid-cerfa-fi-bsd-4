// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test de la correction automatique du CERFA élève (brique ⑤).
// Exécution : node v8/js/cerfa/test-correction.mjs
//
// Volet A (pur) : normalisation bienveillante (nombres virgule/point,
// dates à 1 chiffre, casse/apostrophes/espaces), rattachement des
// champs aux cadres.
// Volet B (bout en bout, DemoStore réel) : des PDF « élève » sont
// réellement REMPLIS avec pdf-lib depuis le CERFA officiel vierge —
// élève parfait (100 %), élève juste mais maladroit sur la forme
// (100 % quand même), élève fautif (chaque type d'erreur détecté et
// bien classé), formulaire vierge, PDF hors sujet, octets non-PDF.
// Node ≥ 18, sans DOM.
// ============================================================

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  normaliserTexte, nombreDepuisSaisie, dateDepuisSaisie, textesEquivalents,
  cadreDuChamp, TITRES_CADRES, comparerChamps, lireChampsCerfaPdf,
  corrigerCerfaEleve
} from './correction.js';
import { chargerPdfLib, calculerChampsCerfa } from './generateur.js';
import { creerStore } from '../data/datastore.js';

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

// ============================================================
// A. Volet PUR — normalisation et cadres
// ============================================================
console.log('--- A. normalisation (pur) ---');

verifier('normaliserTexte : espaces, casse, apostrophe typographique',
  normaliserTexte('  Détenteur   de l’équipement ')
  === "détenteur de l'équipement");
verifier('nombreDepuisSaisie : « 3,20 » et « 3.2 » et « 12 500,5 »',
  nombreDepuisSaisie('3,20') === 3.2 && nombreDepuisSaisie('3.2') === 3.2
  && nombreDepuisSaisie('12 500,5') === 12500.5
  && nombreDepuisSaisie('abc') === null && nombreDepuisSaisie('') === null);
verifier('dateDepuisSaisie : « 1/7/2026 » → « 01/07/2026 »',
  dateDepuisSaisie('1/7/2026') === '01/07/2026'
  && dateDepuisSaisie('01/07/2026') === '01/07/2026'
  && dateDepuisSaisie('2026-07-01') === null);
verifier('textesEquivalents : nombres équivalents, faux nombre refusé',
  textesEquivalents('3,20', '3.2') === true
  && textesEquivalents('3,20', '3,21') === false
  && textesEquivalents('3,20', 'trois') === false);
verifier('textesEquivalents : dates équivalentes',
  textesEquivalents('01/07/2026', '1/7/2026') === true
  && textesEquivalents('01/07/2026', '02/07/2026') === false);
verifier('textesEquivalents : casse et apostrophes tolérées, fond strict',
  textesEquivalents('Titulaire attestation d’aptitude',
    "titulaire attestation d'aptitude") === true
  && textesEquivalents('Raccord HP', 'Raccord BP') === false);

// ============================================================
// B. Volet BOUT EN BOUT — PDF élève réels
// ============================================================
console.log('--- B. correction de PDF élève réels (DemoStore) ---');

const store = await creerStore();
await store.init();

// Monde : machine + bouteille + mouvement MISE_EN_SERVICE validé.
const referent = await store.createPersonne({
  nom: 'Correcteur', prenom: 'Prof', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
const fluides = await store.getFluides();
const machine = await store.createMachine({
  designation: 'Machine correction CERFA', fluide: fluides[0].code,
  chargeNominaleKg: 8, operateur: 'Prof Correcteur'
});
const source = await store.createBouteille({
  type: 'NEUVE', fluide: fluides[0].code, tareKg: 10, masseBruteKg: 25,
  contenanceMaxKg: 20
});
const mouvement = await store.creerMouvement({
  type: 'MISE_EN_SERVICE', machineId: machine.id, bouteilleSrcId: source.id,
  peseeAvantKg: 15, peseeApresKg: 11, technicien: 'Prof Correcteur'
});
await store.soumettreMouvement(mouvement.id);
await store.validerMouvement(mouvement.id, referent.id);

const cible = { source: 'mouvement', id: mouvement.id };
const attendu = await calculerChampsCerfa(store, cible);

verifier('calculerChampsCerfa : 36 textes + 35 cases + radio = 72 champs',
  Object.keys(attendu.texte).length === 36
  && Object.keys(attendu.cases).length === 35
  && (attendu.radio === '1' || attendu.radio === '2'));
verifier('tous les champs attendus se rattachent à un cadre titré',
  [...Object.keys(attendu.texte), ...Object.keys(attendu.cases), 'Bouton_Oui']
    .every((nom) => TITRES_CADRES[cadreDuChamp(nom)] !== undefined));

// ---- Fabrique de PDF « élève » : remplit le CERFA officiel vierge ----
const PDFLib = await chargerPdfLib();
const octetsVierge = new Uint8Array(await readFile(fileURLToPath(
  new URL('../../cerfa_15497-04_officiel.pdf', import.meta.url))));

async function fabriquerPdfEleve({ texte = {}, cases = {}, radio = null }) {
  const doc = await PDFLib.PDFDocument.load(octetsVierge);
  const form = doc.getForm();
  for (const [nom, valeur] of Object.entries(texte)) {
    form.getTextField(nom).setText(valeur || '');
  }
  for (const [nom, coche] of Object.entries(cases)) {
    if (coche) form.getCheckBox(nom).check();
    else form.getCheckBox(nom).uncheck();
  }
  if (radio) form.getRadioGroup('Bouton_Oui').select(radio);
  return doc.save({ objectsPerTick: Infinity });
}

{
  // ÉLÈVE PARFAIT : recopie exacte des valeurs attendues → 100 %.
  const octets = await fabriquerPdfEleve(attendu);
  const { rapport, numero } = await corrigerCerfaEleve(store, cible, octets);
  verifier('élève parfait : 100 %, zéro erreur/oubli/à tort',
    rapport.pourcentage === 100 && rapport.nbErreurs === 0
    && rapport.nbManquants === 0 && rapport.nbATort === 0,
    `pourcentage=${rapport.pourcentage}, erreurs=${rapport.nbErreurs}, `
    + `manquants=${rapport.nbManquants}, aTort=${rapport.nbATort}`);
  verifier('le numéro de la fiche de référence est rapporté',
    numero === attendu.numero);
}

{
  // ÉLÈVE JUSTE MAIS MALADROIT SUR LA FORME : point décimal, casse,
  // apostrophe droite → toujours 100 % (bienveillance de forme).
  const texte = { ...attendu.texte };
  if (texte['Equipement_Charge']) {
    texte['Equipement_Charge'] = texte['Equipement_Charge'].replace(',', '.');
  }
  texte['Sign_Detenteur_Qualite'] = "DÉTENTEUR DE L'ÉQUIPEMENT";
  const octets = await fabriquerPdfEleve({ ...attendu, texte });
  const { rapport } = await corrigerCerfaEleve(store, cible, octets);
  verifier('élève maladroit sur la forme : 100 % quand même',
    rapport.pourcentage === 100 && rapport.nbErreurs === 0,
    `pourcentage=${rapport.pourcentage}`);
}

{
  // ÉQUITÉ multi-lignes (revue adversariale) : pavé Opérateur recopié
  // dans un AUTRE ordre, « SIRET » sans deux-points et numéro sans
  // espaces, et cadre 14 SANS la mention MODE FORMATION (posée par
  // l'appli, jamais exigée de l'élève) → toujours 100 %.
  const texte = { ...attendu.texte };
  const lignesOperateur = texte['Operateur'].split('\n');
  texte['Operateur'] = [...lignesOperateur].reverse()
    .map((l) => l.replace(/^SIRET\s*:\s*/, 'SIRET ').replace(
      /^(SIRET )(.+)$/, (tout, prefixe, num) => prefixe + num.replace(/\s/g, '')))
    .join('\n');
  texte['14_Observations'] = texte['14_Observations'].split('\n')
    .filter((l) => !l.includes('MODE FORMATION')).join('\n');
  const octets = await fabriquerPdfEleve({ ...attendu, texte });
  const { rapport } = await corrigerCerfaEleve(store, cible, octets);
  verifier('équité : ordre des lignes, SIRET souple, mention FORMATION non exigée → 100 %',
    rapport.pourcentage === 100 && rapport.nbErreurs === 0
    && rapport.nbManquants === 0,
    `pourcentage=${rapport.pourcentage}, erreurs=${rapport.nbErreurs}, `
    + `manquants=${rapport.nbManquants}`);
}

{
  // ÉQUITÉ teqCO2 : l'élève CALCULE — l'arrondi au dixième est juste,
  // une valeur fausse reste fausse.
  const teqAttendue = attendu.texte['Equipement_teqCO2'];
  verifier('(pré-requis du test : la teqCO2 attendue est renseignée)',
    teqAttendue !== '');
  const valeur = Number(teqAttendue.replace(',', '.'));
  const arrondiDixieme = String(Math.round(valeur * 10) / 10).replace('.', ',');
  const fauxNet = String(Math.round(valeur * 0.9 * 100) / 100).replace('.', ',');
  const texteJuste = { ...attendu.texte, 'Equipement_teqCO2': arrondiDixieme };
  const rapportJuste = (await corrigerCerfaEleve(store, cible,
    await fabriquerPdfEleve({ ...attendu, texte: texteJuste }))).rapport;
  verifier(`équité teqCO2 : « ${arrondiDixieme} » accepté pour « ${teqAttendue} »`,
    rapportJuste.lignes.find((l) => l.nom === 'Equipement_teqCO2').statut === 'OK');
  const texteFaux = { ...attendu.texte, 'Equipement_teqCO2': fauxNet };
  const rapportFaux = (await corrigerCerfaEleve(store, cible,
    await fabriquerPdfEleve({ ...attendu, texte: texteFaux }))).rapport;
  verifier(`équité teqCO2 : « ${fauxNet} » (−10 %) reste FAUX`,
    rapportFaux.lignes.find((l) => l.nom === 'Equipement_teqCO2').statut === 'ERREUR');
}

{
  // IDENTIFIANTS STRICTS (revue adversariale) : la bienveillance
  // numérique ne s'applique qu'aux quantités — sur un identifiant,
  // « 007 » n'est PAS « 7 » ; sur un jour d'étalonnage, « 07 » ≡ « 7 ».
  const rapport = comparerChamps(
    { texte: { 'Attestation_no': '007', '11_QA': '3,20', 'Controle_Jour': '07' },
      cases: {}, radio: null },
    { texte: { 'Attestation_no': '7', '11_QA': '3.2', 'Controle_Jour': '7' },
      cases: {}, radio: null });
  const parNom = Object.fromEntries(rapport.lignes.map((l) => [l.nom, l.statut]));
  verifier('identifiant « 007 » ≠ « 7 » (strict) ; quantité « 3,20 » ≡ « 3.2 » ; jour « 07 » ≡ « 7 »',
    parNom['Attestation_no'] === 'ERREUR' && parNom['11_QA'] === 'OK'
    && parNom['Controle_Jour'] === 'OK');
}

{
  // GARDE ANTI-GEL : fichier de plus de 15 Mo refusé avant tout parsing.
  let message = '';
  try { await lireChampsCerfaPdf(new Uint8Array(16 * 1024 * 1024)); }
  catch (e) { message = e.message; }
  verifier('fichier de 16 Mo : refus « trop volumineux » avant parsing',
    message.includes('volumineux'), `message = ${message}`);
}

{
  // CHAMPS INCONNUS : tolérés (le CERFA officiel est complet) mais
  // remontés dans `formulaire.inconnus` — jamais en silence.
  const doc = await PDFLib.PDFDocument.load(octetsVierge);
  const champBidon = doc.getForm().createTextField('champ_bidon_test');
  champBidon.addToPage(doc.getPages()[0], { x: 10, y: 10, width: 80, height: 14 });
  const octets = await doc.save({ objectsPerTick: Infinity });
  const { formulaire } = await corrigerCerfaEleve(store, cible, octets);
  verifier('champ inconnu : correction rendue quand même, inconnu signalé',
    formulaire.conforme === true
    && formulaire.inconnus.includes('champ_bidon_test'));
}

{
  // ÉLÈVE FAUTIF : chaque famille d'erreur détectée et bien classée.
  const texte = { ...attendu.texte };
  const cases = { ...attendu.cases };
  texte['11_QA'] = '9,99';                    // quantité fausse → ERREUR
  texte['Sign_Operateur_Nom'] = '';           // oublié → MANQUANT
  texte['Fuite_Loca_2'] = 'Raccord imaginaire'; // devait rester vide → A_TORT
  cases['Case_MiseService'] = false;          // case oubliée → MANQUANT
  cases['Case_Demantel'] = true;              // case à tort → A_TORT
  const radio = attendu.radio === '1' ? '2' : '1'; // radio faux → ERREUR
  const octets = await fabriquerPdfEleve({ texte, cases, radio });
  const { rapport } = await corrigerCerfaEleve(store, cible, octets);
  const parNom = Object.fromEntries(rapport.lignes.map((l) => [l.nom, l]));
  verifier('quantité fausse : ERREUR sur 11_QA',
    parNom['11_QA'].statut === 'ERREUR');
  verifier('texte oublié : MANQUANT sur Sign_Operateur_Nom',
    parNom['Sign_Operateur_Nom'].statut === 'MANQUANT');
  verifier('champ rempli à tort : A_TORT sur Fuite_Loca_2',
    parNom['Fuite_Loca_2'].statut === 'A_TORT');
  verifier('case oubliée : MANQUANT sur Case_MiseService',
    parNom['Case_MiseService'].statut === 'MANQUANT');
  verifier('case cochée à tort : A_TORT sur Case_Demantel',
    parNom['Case_Demantel'].statut === 'A_TORT');
  verifier('radio faux : ERREUR sur Bouton_Oui',
    parNom['Bouton_Oui'].statut === 'ERREUR');
  verifier('les compteurs recoupent les lignes',
    rapport.nbErreurs === 2 && rapport.nbManquants === 2
    && rapport.nbATort === 2 && rapport.pourcentage < 100,
    `erreurs=${rapport.nbErreurs}, manquants=${rapport.nbManquants}, `
    + `aTort=${rapport.nbATort}`);
  verifier('le regroupement par cadre couvre toutes les lignes actives',
    rapport.parCadre.reduce((somme, c) => somme + c.lignes.length, 0)
    === rapport.lignes.length);
}

{
  // FORMULAIRE VIERGE : tout ce qui était attendu est MANQUANT, zéro à tort.
  const octets = await fabriquerPdfEleve({});
  const { rapport } = await corrigerCerfaEleve(store, cible, octets);
  verifier('formulaire vierge : tous les champs actifs sont MANQUANTS',
    rapport.nbManquants === rapport.nbActifs && rapport.nbOk === 0
    && rapport.nbATort === 0 && rapport.pourcentage === 0);
}

{
  // PDF HORS SUJET (aucun champ) : message clair, pas de rapport.
  const docVide = await PDFLib.PDFDocument.create();
  docVide.addPage();
  const octets = await docVide.save();
  let message = '';
  try { await corrigerCerfaEleve(store, cible, octets); }
  catch (e) { message = e.message; }
  verifier('PDF hors sujet : refus « pas le CERFA officiel » (scan mentionné)',
    message.includes('CERFA 15497*04 officiel') && message.includes('scan'));
}

{
  // OCTETS NON-PDF : message clair.
  let message = '';
  try {
    await corrigerCerfaEleve(store, cible,
      new TextEncoder().encode('ceci n’est pas un pdf'));
  } catch (e) { message = e.message; }
  verifier('octets non-PDF : refus « pas un PDF lisible »',
    message.includes('pas un PDF lisible'), `message = ${message}`);
}

{
  // LECTURE DIRECTE : le PDF généré par l'appli elle-même se relit
  // avec les mêmes valeurs (cohérence générateur ↔ lecteur).
  const { genererCerfaPdf } = await import('./generateur.js');
  const genere = await genererCerfaPdf(store, cible);
  const relu = await lireChampsCerfaPdf(genere.octets);
  const rapport = comparerChamps(attendu, relu);
  verifier('le CERFA généré par l’appli est « corrigé » à 100 % (cohérence)',
    rapport.pourcentage === 100 && rapport.nbErreurs === 0
    && rapport.nbManquants === 0 && rapport.nbATort === 0);
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
