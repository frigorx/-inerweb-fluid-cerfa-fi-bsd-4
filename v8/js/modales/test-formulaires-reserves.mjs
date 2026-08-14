// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Test B1 — LES ÉCRANS SUIVENT LA RÈGLE DU STORE.
// Exécution : node v8/js/modales/test-formulaires-reserves.mjs
//
// POURQUOI CETTE SUITE EXISTE.
// Piège ergonomique déjà payé par la revue L2 : fermer l'API sans toucher
// à l'écran, c'est laisser l'élève remplir tout un bloc pour prendre un
// 403 à la fin — l'écran devient MORT pour lui. Deux exigences, donc :
//   1. les blocs réservés sont AFFICHÉS (la fiche reste lisible) mais
//      VERROUILLÉS quand le rôle ne les porte pas ;
//   2. la charge utile OMET ces champs — elle ne renvoie surtout pas une
//      valeur par défaut, qui ferait voir un changement au store (« FIXE »
//      posté sur une machine MOBILE) et vaudrait le 403 qu'on évite.
// Le miroir SERVEUR de ces deux listes est prouvé ailleurs
// (server/test-securite-negative.mjs, D4 ter et D4 sexies).
//
// Node ≥ 18, mini-DOM maison (shim-dom-tests) : les gabarits sont de
// simples chaînes, aucun navigateur requis.
// ============================================================

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

const { installerDocumentFactice } = await import('../core/shim-dom-tests.mjs');
installerDocumentFactice();

const machineForm = await import('./machine-form.js');
const personneForm = await import('./personne-form.js');

// ------------------------------------------------------------
// ⭐⭐ REVUE B1, constat important n°4 — NE PLUS CHERCHER DES MOTIFS DE
// TEXTE FIGÉS. Les assertions de la première version cherchaient des
// chaînes du genre « name="prenom" maxlength="80" disabled » : le gabarit
// place l'attribut APRÈS `value="…"`, ce motif ne pouvait donc JAMAIS
// apparaître — et l'assertion ne pouvait JAMAIS échouer. Un test qui ne
// peut pas mordre est un mensonge (tiré : verrou posé sur prénom ET nom,
// la suite restait verte).
// On lit désormais la BALISE elle-même.
// ------------------------------------------------------------

/** Toutes les balises du gabarit qui portent `name="<champ>"`. */
function balisesDuChamp(html, champ) {
  const balises = [];
  const marque = 'name="' + champ + '"';
  let depuis = 0;
  for (;;) {
    const trouve = html.indexOf(marque, depuis);
    if (trouve === -1) return balises;
    const ouverture = html.lastIndexOf('<', trouve);
    const fermeture = html.indexOf('>', trouve);
    if (ouverture === -1 || fermeture === -1) return balises;
    balises.push(html.slice(ouverture, fermeture + 1));
    depuis = fermeture + 1;
  }
}

/**
 * Le champ existe-t-il dans le gabarit, et TOUTES ses balises portent-elles
 * l'attribut de verrouillage ? Un champ ABSENT rend `false` : sans cela,
 * renommer un champ rendrait l'assertion verte pour de mauvaises raisons.
 */
function champVerrouille(html, champ, attribut = 'disabled') {
  const balises = balisesDuChamp(html, champ);
  const motif = new RegExp('\\s' + attribut + '(\\s|>|=)');
  return balises.length > 0 && balises.every((b) => motif.test(b));
}

/**
 * Le morceau de gabarit qui va de `data-champ="<champ>"` jusqu'au champ
 * SUIVANT — c'est-à-dire ce que l'utilisateur voit AUTOUR de ce champ.
 * Sert à prouver qu'une note explicative est bien LÀ, et pas ailleurs.
 */
function blocDuChamp(html, champ) {
  const debut = html.indexOf('data-champ="' + champ + '"');
  if (debut === -1) return '';
  const suivant = html.indexOf('data-champ="', debut + 12);
  return html.slice(debut, suivant === -1 ? html.length : suivant);
}

/** Le champ existe et AUCUNE de ses balises n'est verrouillée. */
function champOuvert(html, champ) {
  const balises = balisesDuChamp(html, champ);
  return balises.length > 0
    && balises.every((b) => !/\s(disabled|readonly)(\s|>|=)/.test(b));
}

// ============================================================
// A. Machine — qualification réglementaire
// ============================================================
console.log('--- A. machine-form : qui qualifie un équipement ---');

verifier('REFERENT, ENSEIGNANT et ADMIN qualifient',
  ['REFERENT', 'ENSEIGNANT', 'ADMIN']
    .every((r) => machineForm.peutQualifierEquipement({ roleApp: r })));
verifier('ÉLÈVE et TECHNICIEN ne qualifient pas',
  ['ELEVE', 'TECHNICIEN']
    .every((r) => !machineForm.peutQualifierEquipement({ roleApp: r })));
verifier('aucun utilisateur courant : ne qualifie pas (défaut le plus '
  + 'strict)', machineForm.peutQualifierEquipement(null) === false
  && machineForm.peutQualifierEquipement({}) === false);

console.log('--- A bis. machine-form : la charge utile OMET la '
  + 'qualification ---');
{
  const saisie = {
    designation: 'Groupe d’atelier', chargeNominaleKg: 60,
    chargeActuelleKg: 4, localisation: 'Atelier froid',
    dateMiseEnService: '2020-01-05',
    detectionPermanente: true, detectionVerifieeLe: '2026-05-30',
    detectionReference: 'SAV imaginaire',
    typeInstallation: 'FIXE', sousTypeInstallation: '',
    hermetiqueScelle: false, hermetiqueEtiquete: false, residentiel: false,
    usageThermique: ''
  };
  const filtre = machineForm.filtrerQualification(saisie, false);
  // ⭐ Revue B1 — la liste est passée de 6 à 10 : la charge NOMINALE (elle
  // fait sortir du périmètre F-Gas) et la triplette de DÉTECTION (elle
  // divise par deux la fréquence des contrôles) déplacent un seuil, donc
  // elles suivent la même règle que l'hermétique.
  const reserves = ['typeInstallation', 'sousTypeInstallation',
    'hermetiqueScelle', 'hermetiqueEtiquete', 'residentiel',
    'usageThermique', 'chargeNominaleKg', 'detectionPermanente',
    'detectionVerifieeLe', 'detectionReference'];
  verifier('rôle sans droit : les 10 champs de qualification sont ABSENTS '
    + '(omis, pas remis à leur défaut)',
  reserves.every((c) => !(c in filtre)),
  JSON.stringify(Object.keys(filtre)));
  verifier('⚠️ NUANCE : la charge ACTUELLE (la pesée du jour) passe '
    + 'toujours — c’est le geste même du TP',
  filtre.chargeActuelleKg === 4 && !('chargeNominaleKg' in filtre));
  verifier('… et le reste de la saisie courante est intacte (désignation, '
    + 'localisation, date de mise en service)',
  filtre.designation === 'Groupe d’atelier'
    && filtre.localisation === 'Atelier froid'
    && filtre.dateMiseEnService === '2020-01-05');
  verifier('contre-épreuve : le responsable envoie la fiche ENTIÈRE',
    reserves.every((c) => c in machineForm.filtrerQualification(saisie, true)));
  verifier('… et l’objet d’origine n’est jamais modifié',
    'typeInstallation' in saisie);
}

console.log('--- A ter. machine-form : le bloc est affiché, verrouillé ---');
{
  const machine = { designation: 'Camion', typeInstallation: 'MOBILE',
    sousTypeInstallation: 'CAMION_FRIGORIFIQUE', hermetiqueScelle: true,
    hermetiqueEtiquete: true, residentiel: false,
    usageThermique: 'CLIMATISATION', chargeNominaleKg: 60,
    chargeActuelleKg: 47.5, detectionPermanente: true,
    detectionVerifieeLe: '2026-05-30',
    detectionReference: 'SAV Daikin — bon n° 4412' };
  const verrouille = machineForm.gabaritFormulaire(machine, [], [], false);
  const ouvert = machineForm.gabaritFormulaire(machine, [], [], true);

  const attendus = [
    ['type d’installation', 'typeInstallation', 'disabled'],
    ['nature de l’équipement mobile', 'sousTypeInstallation', 'disabled'],
    ['hermétiquement scellé', 'hermetiqueScelle', 'disabled'],
    ['étiquette hermétique', 'hermetiqueEtiquete', 'disabled'],
    ['usage résidentiel', 'residentiel', 'disabled'],
    ['usage thermique', 'usageThermique', 'disabled'],
    // ⭐ Revue B1 — les deux familles ajoutées par la revue.
    ['charge NOMINALE (périmètre F-Gas)', 'chargeNominaleKg', 'readonly'],
    ['détection permanente (fréquence ÷ 2)', 'detectionPermanente',
      'disabled'],
    ['date de vérification de la détection', 'detectionVerifieeLe',
      'disabled'],
    ['référence de la détection', 'detectionReference', 'disabled']
  ];
  for (const [libelle, champ, attribut] of attendus) {
    verifier(`rôle sans droit : ${libelle} VERROUILLÉ`,
      champVerrouille(verrouille, champ, attribut),
      JSON.stringify(balisesDuChamp(verrouille, champ)));
    verifier(`contre-épreuve : ${libelle} ouvert au responsable`,
      champOuvert(ouvert, champ),
      JSON.stringify(balisesDuChamp(ouvert, champ)));
  }
  // ⚠️ NUANCE À TENIR — la charge ACTUELLE (la pesée du jour) reste OUVERTE
  // à tous, dans les deux gabarits : c'est le geste même du TP.
  verifier('⚠️ la charge ACTUELLE reste OUVERTE, même sans droit de '
    + 'qualification', champOuvert(verrouille, 'chargeActuelleKg')
    && champOuvert(ouvert, 'chargeActuelleKg'),
  JSON.stringify(balisesDuChamp(verrouille, 'chargeActuelleKg')));
  verifier('rôle sans droit : l’écran DIT pourquoi (note « réservées au '
    + 'responsable »)',
  verrouille.includes('<p class="mf-note mf-reservee">')
    && verrouille.includes('réservées au responsable'));
  verifier('contre-épreuve : aucune note pour le responsable',
    !ouvert.includes('<p class="mf-note mf-reservee">'));
  // ⭐⭐ REVUE B1, constat mineur n°3 — UNE NOTE SE LIT LÀ OÙ EST LE
  // VERROU. Le sélecteur « type d'installation » est grisé ici, mais la
  // seule note qui l'expliquait vivait plus bas, dans le fieldset
  // « Nature de l'équipement » ; celle du sous-type, elle, est dans un
  // bloc masqué pour un équipement FIXE. Une note ailleurs ne dit rien.
  verifier('⭐ rôle sans droit : le type d’installation porte SA PROPRE '
    + 'note, dans le même bloc que le verrou',
  blocDuChamp(verrouille, 'typeInstallation').includes('mf-reservee'),
  blocDuChamp(verrouille, 'typeInstallation').slice(0, 200));
  verifier('contre-épreuve : aucune note dans ce bloc pour le responsable',
    !blocDuChamp(ouvert, 'typeInstallation').includes('mf-reservee'));
  verifier('la fiche reste LISIBLE pour tous : les valeurs qualifiées sont '
    + 'toujours affichées', verrouille.includes('value="MOBILE" selected')
    && verrouille.includes('value="CAMION_FRIGORIFIQUE" selected')
    && verrouille.includes('value="CLIMATISATION" selected')
    && verrouille.includes('value="60"'));
  // ⭐ Lot G carte blanche (13/08, 4e relecture) : le champ FLUIDE porte
  // la règle « une fiche = UN circuit » — une cascade déclarée dans UNE
  // fiche au fluide du circuit CO2 sortait tout l'équipement du contrôle
  // d'étanchéité (le circuit HFC disparaissait avec son obligation,
  // tiré). La note vaut pour TOUS les rôles : le piège ignore les droits.
  verifier('⭐ le champ fluide porte la règle « une fiche = un seul '
    + 'circuit » (cascade, dans le bloc du champ)',
  blocDuChamp(ouvert, 'fluide').includes('un seul circuit')
    && blocDuChamp(ouvert, 'fluide').includes('circuit par circuit'),
  blocDuChamp(ouvert, 'fluide').slice(0, 200));
  verifier('… pour le rôle sans droit aussi',
    blocDuChamp(verrouille, 'fluide').includes('un seul circuit'));
}

console.log('--- A quater. machine-form : la CRÉATION est annoncée fermée, '
  + 'jamais un formulaire mort ---');
{
  // ⭐⭐ Revue B1 — la charge nominale étant réservée ET obligatoire, un
  // rôle sans droit ne peut plus créer de fiche d'équipement. Le piège
  // déjà payé deux fois par ce dépôt serait d'ouvrir quand même vingt
  // champs pour un 403 à la fin : la modale ne doit PAS s'ouvrir.
  // `toast` écrit dans #zone-toasts (views/communs.js) : sans cette zone,
  // le message part dans le vide et l'assertion ne prouverait rien.
  const zoneToasts = document.createElement('div');
  zoneToasts.id = 'zone-toasts';
  document.body.appendChild(zoneToasts);
  const machinesFactices = [];
  const ctxPour = (roleApp) => ({
    store: {
      getMachines: async () => machinesFactices,
      getFluides: async () => [],
      getClients: async () => [],
      getEtablissement: async () => ({ raisonSociale: 'Lycée' }),
      getUtilisateurCourant: async () => ({ roleApp })
    }
  });
  const refusEleve = await machineForm.ouvrirFormMachine(ctxPour('ELEVE'));
  verifier('rôle sans droit : la création rend un refus (aucune modale '
    + 'ouverte)', refusEleve === false, JSON.stringify(refusEleve));
  verifier('… et l’écran a DIT pourquoi (message affiché)',
    zoneToasts.textContent.includes('réservé au responsable'),
    zoneToasts.textContent.slice(0, 200));
}

// ============================================================
// B. Personne — gouvernance et preuves
// ============================================================
console.log('--- B. personne-form : qui tient la gouvernance ---');

verifier('REFERENT, ENSEIGNANT et ADMIN tiennent la fiche',
  ['REFERENT', 'ENSEIGNANT', 'ADMIN']
    .every((r) => personneForm.peutTenirFichePersonne({ roleApp: r })));
verifier('ÉLÈVE et TECHNICIEN ne la tiennent pas',
  ['ELEVE', 'TECHNICIEN']
    .every((r) => !personneForm.peutTenirFichePersonne({ roleApp: r })));
verifier('aucun utilisateur courant : ne la tient pas',
  personneForm.peutTenirFichePersonne(null) === false);

console.log('--- B bis. personne-form : la charge utile OMET gouvernance '
  + 'et preuves ---');
{
  const saisie = {
    prenom: 'Un', nom: 'Élève', typePersonne: 'ELEVE',
    email: 'eleve@exemple.fr', roleApp: 'ADMIN',
    numAttestationAptitude: 'ATT-INVENTEE', organismeDelivreur: 'Chez moi',
    dateObtention: '2026-01-01', dateFinValidite: '2031-01-01',
    categorie2008: 'I', categorie2025: 'A1',
    activitesAutorisees: ['MAINTENANCE']
  };
  const filtre = personneForm.filtrerFichePersonne(saisie, false);
  const reserves = ['roleApp', 'numAttestationAptitude', 'organismeDelivreur',
    'dateObtention', 'dateFinValidite', 'categorie2008', 'categorie2025',
    'activitesAutorisees'];
  verifier('rôle sans droit : les 8 champs réservés sont ABSENTS',
    reserves.every((c) => !(c in filtre)),
    JSON.stringify(Object.keys(filtre)));
  verifier('… et l’ÉTAT CIVIL passe toujours (un élève inscrit son '
    + 'camarade de TP)',
  filtre.prenom === 'Un' && filtre.nom === 'Élève'
    && filtre.typePersonne === 'ELEVE'
    && filtre.email === 'eleve@exemple.fr');
  verifier('contre-épreuve : le responsable envoie la fiche ENTIÈRE',
    reserves.every((c) =>
      c in personneForm.filtrerFichePersonne(saisie, true)));
}

console.log('--- B ter. personne-form : les blocs réservés sont '
  + 'verrouillés ---');
{
  const personne = { prenom: 'Professeur', nom: 'Titulaire',
    typePersonne: 'ENSEIGNANT', roleApp: 'ENSEIGNANT',
    numAttestationAptitude: 'ATT-2025-0001',
    organismeDelivreur: 'Organisme réel', dateObtention: '2025-09-01',
    dateFinValidite: '2032-09-01', categorie2025: 'A2',
    activitesAutorisees: ['MAINTENANCE'] };
  const verrouille = personneForm.gabaritFormulaire(personne, true, false);
  const ouvert = personneForm.gabaritFormulaire(personne, true, true);

  // ⭐⭐ Revue B1, constat n°4 — assertions refondues sur la BALISE. Les
  // motifs figés d'avant (« value="ATT-2025-0001" disabled> ») dépendaient
  // de l'ORDRE des attributs dans le gabarit : celui de l'état civil ne
  // pouvait jamais apparaître, donc son assertion ne pouvait jamais mordre.
  const reserves = ['roleApp', 'categorie2008', 'categorie2025',
    'activitesAutorisees', 'numAttestationAptitude', 'organismeDelivreur',
    'dateObtention', 'dateFinValidite'];
  for (const champ of reserves) {
    verifier(`rôle sans droit : ${champ} VERROUILLÉ`,
      champVerrouille(verrouille, champ),
      JSON.stringify(balisesDuChamp(verrouille, champ)));
    verifier(`contre-épreuve : ${champ} ouvert au responsable`,
      champOuvert(ouvert, champ),
      JSON.stringify(balisesDuChamp(ouvert, champ)));
  }
  verifier('rôle sans droit : l’écran DIT pourquoi (note « réservés au '
    + 'responsable »)', verrouille.includes('<p class="pf-reservee">')
    && verrouille.includes('réservés au responsable'));
  verifier('contre-épreuve : aucune note pour le responsable',
    !ouvert.includes('<p class="pf-reservee">'));

  // ⚠️ L'ASSERTION QUI DOIT MORDRE. Un élève inscrit son camarade de TP :
  // si l'état civil se verrouillait, l'écran deviendrait mort pour lui.
  // Chacun des quatre champs est vérifié SÉPARÉMENT — un libellé qui cite
  // quatre champs et n'en teste qu'un est un mensonge.
  for (const champ of ['prenom', 'nom', 'typePersonne', 'email']) {
    verifier(`l’état civil reste OUVERT à tous : ${champ} jamais verrouillé`,
      champOuvert(verrouille, champ) && champOuvert(ouvert, champ),
      JSON.stringify(balisesDuChamp(verrouille, champ)));
  }
  // … y compris sur la fiche d'un ÉLÈVE, où le bloc « attestation » est
  // masqué (constat mineur n°3 : la note y était invisible).
  {
    const ficheEleve = personneForm.gabaritFormulaire(
      { prenom: 'Un', nom: 'Élève', typePersonne: 'ELEVE', roleApp: 'ELEVE' },
      true, false);
    for (const champ of ['prenom', 'nom', 'typePersonne', 'email']) {
      verifier(`fiche d’ÉLÈVE : ${champ} reste ouvert`,
        champOuvert(ficheEleve, champ),
        JSON.stringify(balisesDuChamp(ficheEleve, champ)));
    }
    verifier('fiche d’ÉLÈVE : le rôle applicatif est bien verrouillé',
      champVerrouille(ficheEleve, 'roleApp'),
      JSON.stringify(balisesDuChamp(ficheEleve, 'roleApp')));

    // ⭐⭐ REVUE B1, constat mineur n°3 — LA NOTE ÉTAIT ENFERMÉE. Elle
    // vivait dans #pf-bloc-attestation, qui porte `hidden` dès que la
    // personne est un ÉLÈVE : le sélecteur ci-dessus était donc grisé
    // SANS un mot d'explication. Une note qui ne s'affiche pas ne dit
    // rien — elle doit être HORS de tout bloc conditionnel.
    const debutBlocMasque = ficheEleve.indexOf('id="pf-bloc-attestation"');
    verifier('décor : sur une fiche d’ÉLÈVE, le bloc des preuves est bien '
      + 'MASQUÉ', /id="pf-bloc-attestation"\s+hidden/.test(ficheEleve),
    ficheEleve.slice(debutBlocMasque, debutBlocMasque + 60));
    const posNote = ficheEleve.indexOf('<p class="pf-reservee">');
    verifier('⭐ fiche d’ÉLÈVE : la note qui explique le verrou est HORS du '
      + 'bloc masqué (elle est donc VUE)',
    posNote !== -1 && debutBlocMasque !== -1 && posNote < debutBlocMasque,
    `note à ${posNote}, bloc masqué à ${debutBlocMasque}`);
  }
}

// ============================================================
console.log('');
console.log('Écrans réservés (machine + personne) : '
  + `${nbOk} réussies, ${nbEchecs} en échec.`);
if (nbEchecs > 0) process.exit(1);
console.log('Écrans réservés : conformes.');
