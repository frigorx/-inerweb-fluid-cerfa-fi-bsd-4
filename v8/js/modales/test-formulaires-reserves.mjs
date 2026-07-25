// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
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
    designation: 'Groupe d’atelier', chargeActuelleKg: 4,
    localisation: 'Atelier froid', dateMiseEnService: '2020-01-05',
    detectionPermanente: true, detectionVerifieeLe: '2026-05-30',
    typeInstallation: 'FIXE', sousTypeInstallation: '',
    hermetiqueScelle: false, hermetiqueEtiquete: false, residentiel: false,
    usageThermique: ''
  };
  const filtre = machineForm.filtrerQualification(saisie, false);
  const reserves = ['typeInstallation', 'sousTypeInstallation',
    'hermetiqueScelle', 'hermetiqueEtiquete', 'residentiel',
    'usageThermique'];
  verifier('rôle sans droit : les 6 champs de qualification sont ABSENTS '
    + '(omis, pas remis à leur défaut)',
  reserves.every((c) => !(c in filtre)),
  JSON.stringify(Object.keys(filtre)));
  verifier('… et la saisie courante est intacte (désignation, charge, '
    + 'localisation, date, détection)',
  filtre.designation === 'Groupe d’atelier' && filtre.chargeActuelleKg === 4
    && filtre.localisation === 'Atelier froid'
    && filtre.dateMiseEnService === '2020-01-05'
    && filtre.detectionPermanente === true
    && filtre.detectionVerifieeLe === '2026-05-30');
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
    usageThermique: 'CLIMATISATION' };
  const verrouille = machineForm.gabaritFormulaire(machine, [], [], false);
  const ouvert = machineForm.gabaritFormulaire(machine, [], [], true);

  const attendus = [
    ['type d’installation', 'name="typeInstallation" disabled>'],
    ['nature de l’équipement mobile', 'name="sousTypeInstallation" disabled>'],
    ['hermétiquement scellé', 'name="hermetiqueScelle" checked disabled>'],
    ['étiquette hermétique', 'name="hermetiqueEtiquete" checked disabled>'],
    ['usage résidentiel', 'name="residentiel" disabled>'],
    ['usage thermique', 'name="usageThermique" disabled>']
  ];
  for (const [libelle, motif] of attendus) {
    verifier(`rôle sans droit : ${libelle} VERROUILLÉ`,
      verrouille.includes(motif), motif);
    verifier(`contre-épreuve : ${libelle} ouvert au responsable`,
      !ouvert.includes(motif));
  }
  verifier('rôle sans droit : l’écran DIT pourquoi (note « réservées au '
    + 'responsable »)',
  verrouille.includes('<p class="mf-note mf-reservee">')
    && verrouille.includes('réservées au responsable'));
  verifier('contre-épreuve : aucune note pour le responsable',
    !ouvert.includes('<p class="mf-note mf-reservee">'));
  verifier('la fiche reste LISIBLE pour tous : les valeurs qualifiées sont '
    + 'toujours affichées', verrouille.includes('value="MOBILE" selected')
    && verrouille.includes('value="CAMION_FRIGORIFIQUE" selected')
    && verrouille.includes('value="CLIMATISATION" selected'));
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

  const attendus = [
    ['rôle applicatif', 'name="roleApp" disabled>'],
    ['catégorie 2008', 'name="categorie2008" disabled>'],
    ['catégorie 2025', 'name="categorie2025" disabled>'],
    ['activités autorisées', 'value="MAINTENANCE" checked disabled>']
  ];
  for (const [libelle, motif] of attendus) {
    verifier(`rôle sans droit : ${libelle} VERROUILLÉ`,
      verrouille.includes(motif), motif);
    verifier(`contre-épreuve : ${libelle} ouvert au responsable`,
      !ouvert.includes(motif));
  }
  // Les champs texte / date portent leur valeur avant l'attribut : on tire
  // le motif complet, valeur comprise.
  const textes = [
    ['n° d’attestation', 'value="ATT-2025-0001" disabled>'],
    ['organisme délivreur', 'value="Organisme réel" disabled>'],
    ['date d’obtention', 'value="2025-09-01" disabled>'],
    ['date de fin de validité', 'value="2032-09-01" disabled>']
  ];
  for (const [libelle, motif] of textes) {
    verifier(`rôle sans droit : ${libelle} VERROUILLÉ`,
      verrouille.includes(motif), motif);
    verifier(`contre-épreuve : ${libelle} ouvert au responsable`,
      !ouvert.includes(motif));
  }
  verifier('rôle sans droit : l’écran DIT pourquoi (note « réservés au '
    + 'responsable »)', verrouille.includes('<p class="pf-reservee">')
    && verrouille.includes('réservés au responsable'));
  verifier('contre-épreuve : aucune note pour le responsable',
    !ouvert.includes('<p class="pf-reservee">'));
  verifier('l’état civil reste OUVERT à tous (prénom, nom, type, courriel '
    + 'jamais verrouillés)',
  !verrouille.includes('name="prenom"') || (
    !verrouille.includes('name="prenom" maxlength="80" disabled')
      && !verrouille.includes('id="pf-email" name="email" maxlength="160" '
        + 'value="" disabled')));
}

// ============================================================
console.log('');
console.log('Écrans réservés (machine + personne) : '
  + `${nbOk} réussies, ${nbEchecs} en échec.`);
if (nbEchecs > 0) process.exit(1);
console.log('Écrans réservés : conformes.');
