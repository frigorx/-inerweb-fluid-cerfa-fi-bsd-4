// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// LOT B2 — REMISE EN FILIÈRE DÉCHETS, DOUBLÉE demo/local.
//
// B2-2 « LE NUMÉRO RÉEL A SA PLACE » : le numéro du bordereau
// dématérialisé OFFICIEL est un champ à part (`bordereauExterne`,
// porté par la colonne lien_trackdechets du socle v1 — aucune
// migration), jamais confondu avec le numéro du SUIVI INTERNE.
// Il survit à l'export/import et n'entre au cadre 11 du CERFA que
// s'il a été réellement reporté (jamais le numéro interne).
//
// Exécution : node v8/js/data/test-remise-filiere.mjs [demo|local]
// ============================================================

const NOM_STORE = process.argv[2] ?? 'demo';

async function fabriquerStore(nom) {
  switch (nom) {
    case 'demo': {
      const { creerStore } = await import('./datastore.js');
      return await creerStore();
    }
    case 'local': {
      const { creerStoreDeTest } =
        await import('../../../server/harnais-contrat.mjs');
      return await creerStoreDeTest();
    }
    default:
      console.error(`Store inconnu : « ${nom} » (demo ou local).`);
      process.exit(2);
  }
}

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

const store = await fabriquerStore(NOM_STORE);
if (store.init) await store.init();
console.log(`\n=== Remise en filière déchets — store « ${NOM_STORE} » ===\n`);

/** Prépare une bouteille de récupération déclarée DÉCHET. */
async function bouteilleDechet(masseKg) {
  const b = await store.createBouteille({
    type: 'RECUPERATION', fluide: 'R-410A', etatFluide: 'RECUPERE',
    tareKg: 10, masseBruteKg: 10 + masseKg, contenanceMaxKg: 50,
    proprietaire: 'Lycée'
  });
  await store.deciderFluideRecupere(b.id, 'DECHET', 'testeur');
  return (await store.getBouteilles()).find((x) => x.id === b.id);
}

// ============================================================
// A. Le numéro du bordereau OFFICIEL est enregistré à part
// ============================================================
{
  const b = await bouteilleDechet(6);
  const suivi = await store.createBsff({
    bouteilleId: b.id, numeroBsff: 'SIF-2026-0001',
    bordereauExterne: '  FF-2026-000123  ',
    transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 6, dateRemise: '2026-07-24', operateur: 'testeur'
  });
  verifier('le numéro du bordereau officiel est conservé, espaces retirés',
    suivi.bordereauExterne === 'FF-2026-000123', String(suivi.bordereauExterne));
  verifier('il ne se confond pas avec le numéro du suivi interne',
    suivi.numeroBsff === 'SIF-2026-0001'
    && suivi.numeroBsff !== suivi.bordereauExterne);

  const relu = (await store.getBsff()).find((x) => x.id === suivi.id);
  verifier('relu depuis le magasin : les deux numéros sont là',
    relu.numeroBsff === 'SIF-2026-0001'
    && relu.bordereauExterne === 'FF-2026-000123');
}

// ============================================================
// B. Bordereau non encore établi : absence ENREGISTRÉE, pas devinée
// ============================================================
{
  const b = await bouteilleDechet(4);
  const suivi = await store.createBsff({
    bouteilleId: b.id, numeroBsff: 'SIF-2026-0002',
    transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 4, dateRemise: '2026-07-24', operateur: 'testeur'
  });
  verifier('bordereau non reporté → null (jamais le numéro interne recopié)',
    suivi.bordereauExterne === null, String(suivi.bordereauExterne));
  const vide = await store.createBsff({
    bouteilleId: (await bouteilleDechet(2)).id, numeroBsff: 'SIF-2026-0003',
    bordereauExterne: '   ', transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 2, dateRemise: '2026-07-24', operateur: 'testeur'
  });
  verifier('chaîne d’espaces → null (une saisie vide ne vaut pas un numéro)',
    vide.bordereauExterne === null, String(vide.bordereauExterne));
}

// ============================================================
// B bis. B2-3 — FORME ET UNICITÉ DU NUMÉRO INTERNE
// (attaques tirées : numéro fantaisiste accepté, doublon accepté)
// ============================================================
{
  const b = await bouteilleDechet(9);
  // Numérotation LOCALE, sans réseau : le logiciel attribue le suivant.
  const auto = await store.createBsff({
    bouteilleId: b.id, transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 1, dateRemise: '2026-07-24', operateur: 'testeur'
  });
  verifier('numéro absent → attribué au format SIF-AAAA-NNNN',
    /^SIF-2026-\d{4}$/.test(auto.numeroBsff), String(auto.numeroBsff));
  const auto2 = await store.createBsff({
    bouteilleId: b.id, transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 1, dateRemise: '2026-07-24', operateur: 'testeur'
  });
  verifier('deux attributions successives ne se marchent pas dessus',
    auto2.numeroBsff !== auto.numeroBsff
    && Number(auto2.numeroBsff.slice(-4)) === Number(auto.numeroBsff.slice(-4)) + 1,
    `${auto.numeroBsff} puis ${auto2.numeroBsff}`);

  let msgForme = null;
  try {
    await store.createBsff({
      bouteilleId: b.id, numeroBsff: 'nimportequoi-42',
      transporteur: 'Collecteur agréé',
      installationDestination: 'Centre de traitement agréé',
      masseRemiseKg: 1, dateRemise: '2026-07-24', operateur: 'testeur'
    });
  } catch (e) { msgForme = e.message; }
  verifier('numéro fantaisiste REFUSÉ, message canonique',
    msgForme !== null && msgForme.includes('attribué par le logiciel')
    && msgForme.includes('SIF-AAAA-NNNN'), String(msgForme));

  // ⚠ UNE DATE EST UNE DATE (doctrine L2) : l'année du numéro se dérive de
  // la date de remise. Sans contrôle, « 24/07/2026 » faisait attribuer
  // « SIF-24/0-0001 » — un numéro que la garde du logiciel refuse elle-même,
  // écrit au registre et exporté dans le dossier d'audit scellé.
  let msgDate = null;
  try {
    await store.createBsff({
      bouteilleId: b.id, transporteur: 'Collecteur agréé',
      installationDestination: 'Centre de traitement agréé',
      masseRemiseKg: 1, dateRemise: '24/07/2026', operateur: 'testeur'
    });
  } catch (e) { msgDate = e.message; }
  verifier('date de remise illisible REFUSÉE (aucun numéro difforme émis)',
    msgDate !== null && msgDate.includes('Date de remise invalide'),
    String(msgDate));
  verifier('aucun suivi hors forme n’a été écrit au registre',
    (await store.getBsff()).every(
      (s) => /^SIF-\d{4}-\d{4}$/.test(String(s.numeroBsff))),
    (await store.getBsff()).map((s) => s.numeroBsff).join(', '));

  let msgDoublon = null;
  try {
    await store.createBsff({
      bouteilleId: b.id, numeroBsff: auto.numeroBsff.toLowerCase(),
      transporteur: 'Collecteur agréé',
      installationDestination: 'Centre de traitement agréé',
      masseRemiseKg: 1, dateRemise: '2026-07-24', operateur: 'testeur'
    });
  } catch (e) { msgDoublon = e.message; }
  verifier('doublon REFUSÉ, casse comprise (« sif-… » = « SIF-… »)',
    msgDoublon !== null && msgDoublon.includes('déjà utilisé'),
    String(msgDoublon));

  const suivis = await store.getBsff();
  const cles = suivis.map((s) => String(s.numeroBsff).toUpperCase());
  verifier('aucun numéro de suivi en double au registre',
    new Set(cles).size === cles.length, cles.join(', '));
}

// ============================================================
// B ter. Le doublon ne passe pas non plus PAR L'IMPORT
// ============================================================
{
  const paquet = JSON.parse(await store.exporterJSON());
  const donnees = paquet.donnees ?? paquet;
  const premier = donnees.bsff[0];
  donnees.bsff.push({ ...premier, id: `${premier.id}-copie` });
  const cible = await fabriquerStore(NOM_STORE);
  if (cible.init) await cible.init();
  let msgImport = null;
  try {
    await cible.importerJSON(JSON.stringify(paquet));
  } catch (e) { msgImport = e.message; }
  verifier('import d’un registre à numéro dupliqué REFUSÉ',
    msgImport !== null && msgImport.includes('numéro en double'),
    String(msgImport));
}

// ============================================================
// C. Le numéro officiel survit à l'export → import
// ============================================================
{
  const cible = await fabriquerStore(NOM_STORE);
  if (cible.init) await cible.init();
  const ok = await cible.importerJSON(await store.exporterJSON());
  verifier('import du registre exporté : accepté', ok !== false);
  const relus = await cible.getBsff();
  verifier('après import : le numéro du bordereau officiel a voyagé',
    relus.some((x) => x.numeroBsff === 'SIF-2026-0001'
      && x.bordereauExterne === 'FF-2026-000123'),
    JSON.stringify(relus.map((x) => [x.numeroBsff, x.bordereauExterne])));
}

// ============================================================
// C bis. B2-4 (corrigé après revue) — LA PIÈCE MANQUANTE EST SIGNALÉE,
// LA MASSE RESTE DÉCLARÉE.
// La première version sortait la masse des rubriques 8 et 9 tant qu'aucune
// pièce n'était jointe : une masse réellement détruite disparaissait de la
// déclaration faite à l'autorité (sous-déclaration). On ne fait JAMAIS
// disparaître un kilo ; on dit que la pièce manque.
// ============================================================
{
  const b = await bouteilleDechet(8);
  const suivi = await store.createBsff({
    bouteilleId: b.id, transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 8, dateRemise: '2026-07-24', operateur: 'testeur'
  });
  await store.attesterIssueBsff(suivi.id, {
    issueTraitement: 'DESTRUCTION',
    installationTraitement: 'Installation inventée SA',
    certificatTraitement: null, operateur: 'testeur'
  });
  verifier('la saisie de l’issue reste POSSIBLE (on n’empêche pas la réalité)',
    (await store.getBsff()).find((x) => x.id === suivi.id)
      .issueTraitement === 'DESTRUCTION');

  const avant = await store.getDeclarationAnnuelle(2026);
  const ligneAvant = avant.lignes.find((l) => l.fluide === 'R-410A');
  verifier('AUCUNE pièce jointe : la masse est TOUT DE MÊME en rubrique 9',
    ligneAvant.destructionKg >= 8, String(ligneAvant.destructionKg));
  verifier('l’installation de traitement est reportée avec la masse',
    ligneAvant.destructionInstallations.includes('Installation inventée SA'));
  verifier('le compteur d’anomalie chiffre la masse non appuyée',
    ligneAvant.remisIssueSansPieceKg >= 8,
    String(ligneAvant.remisIssueSansPieceKg));
  verifier('anomalie BSFF_ISSUE_SANS_PIECE levée, déclaration incomplète',
    avant.anomalies.some((a) => a.code === 'BSFF_ISSUE_SANS_PIECE'
      && a.fluide === 'R-410A') && avant.complet === false);

  // La PIÈCE arrive : l'anomalie tombe, la masse n'a jamais bougé.
  await store.ajouterPieceJointe({
    entiteType: 'BSFF', entiteId: suivi.id, categorie: 'CERTIFICAT',
    nomFichier: 'certificat.png', mimeType: 'image/png',
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk'
      + 'YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  });
  const apres = await store.getDeclarationAnnuelle(2026);
  const ligneApres = apres.lignes.find((l) => l.fluide === 'R-410A');
  verifier('pièce déposée : la rubrique 9 est INCHANGÉE (aucun kilo n’a bougé)',
    Math.abs(ligneApres.destructionKg - ligneAvant.destructionKg) < 1e-9,
    `${ligneAvant.destructionKg} → ${ligneApres.destructionKg}`);
  verifier('pièce déposée : le compteur d’anomalie retombe pour ce suivi',
    ligneApres.remisIssueSansPieceKg < ligneAvant.remisIssueSansPieceKg,
    `${ligneAvant.remisIssueSansPieceKg} → ${ligneApres.remisIssueSansPieceKg}`);
}

// ============================================================
// C ter. B2-5 — LA BALANCE CESSE DE POUVOIR MENTIR
// (attaque tirée : après une remise déclarée, un simple
//  updateBouteille { masseBruteKg } re-gonfle la bouteille — HTTP 200,
//  et RIEN ne rapproche les deux faits)
// ============================================================
{
  const b = await bouteilleDechet(10);
  const suivi = await store.createBsff({
    bouteilleId: b.id, transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 5, dateRemise: '2026-07-24', operateur: 'testeur'
  });
  verifier('la masse restante est FIGÉE au suivi (repère du rapprochement)',
    Math.abs(suivi.masseBouteilleApresKg - 5) < 1e-6,
    String(suivi.masseBouteilleApresKg));

  const sansEcart = (await store.getAlertes())
    .filter((a) => a.id === `alr-remise-filiere-${b.id}`);
  verifier('aucune alerte tant que la bouteille reste à son reliquat',
    sansEcart.length === 0);

  // LA RE-INFLATION : la bouteille repasse de 5 à 10 kg par un patch.
  await store.updateBouteille(b.id, { masseBruteKg: 20 });
  const apres = (await store.getBouteilles()).find((x) => x.id === b.id);
  verifier('la modification RESTE possible (on n’empêche pas la réalité)',
    Math.abs(apres.masseNetteKg - 10) < 1e-6, String(apres.masseNetteKg));

  const alerte = (await store.getAlertes())
    .find((a) => a.id === `alr-remise-filiere-${b.id}`);
  verifier('le rapprochement est SIGNALÉ (alerte dédiée, niveau IMPORTANT)',
    Boolean(alerte) && alerte.niveau === 'IMPORTANT');
  verifier('l’alerte chiffre l’écart et cite le suivi concerné',
    Boolean(alerte) && alerte.detail.includes('5') && alerte.detail
      .includes(suivi.numeroBsff), alerte ? alerte.detail : 'aucune');

  // ⚠ L'ALERTE NE S'ÉTEINT PAS D'UN CLIC (2e attaque de la revue) :
  // émettre un nouveau suivi bidon réécrivait le repère sur l'état gonflé,
  // et rien ne permet de retirer ce suivi. Le repère d'origine tient.
  const bidon = await store.createBsff({
    bouteilleId: b.id, transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 0.001, dateRemise: '2026-07-25', operateur: 'testeur'
  });
  const encore = (await store.getAlertes())
    .find((a) => a.id === `alr-remise-filiere-${b.id}`);
  verifier('un suivi bidon posté après coup n’éteint PAS l’alerte',
    Boolean(encore), 'alerte disparue');
  verifier('l’alerte cite toujours le repère d’ORIGINE, pas le suivi bidon',
    Boolean(encore) && encore.detail.includes(suivi.numeroBsff)
    && !encore.detail.includes(bidon.numeroBsff),
    encore ? encore.detail : 'aucune');
}

// ============================================================
// C quater. LE LOGICIEL N'ACCUSE PAS UNE ÉCRITURE LÉGITIME.
// Tir de la revue : après une remise partielle, un TRANSFERT ENTRANT
// validé (regroupement de déchets avant enlèvement) était dénoncé
// « aucune écriture du registre ne l'explique » — alors que l'écriture
// existe, qu'elle est valide, et qu'elle explique exactement la masse.
// Chemin ENTIÈREMENT légitime : la décision « réutilisable » est
// réversible (IM-7) et remet la bouteille en stock.
// ============================================================
{
  const referentT = await store.createPersonne({
    nom: 'Transfert', prenom: 'Référent', typePersonne: 'ENSEIGNANT',
    roleApp: 'REFERENT'
  });
  const cible = await bouteilleDechet(10);
  const suivi = await store.createBsff({
    bouteilleId: cible.id, transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 5, dateRemise: '2026-07-24', operateur: 'testeur'
  });
  // Le fluide restant est finalement jugé réutilisable : retour en stock.
  await store.deciderFluideRecupere(cible.id, 'REUTILISABLE', 'testeur');
  const source = await store.createBouteille({
    type: 'RECUPERATION', fluide: 'R-410A', etatFluide: 'RECUPERE',
    tareKg: 10, masseBruteKg: 14, contenanceMaxKg: 50, proprietaire: 'Lycée'
  });
  const transfert = await store.creerMouvement({
    type: 'TRANSFERT', bouteilleSrcId: source.id, bouteilleDstId: cible.id,
    peseeAvantKg: 14, peseeApresKg: 12, technicien: 'Testeur B2',
    causeMouvement: 'Regroupement avant enlèvement'
  });
  await store.soumettreMouvement(transfert.id);
  await store.validerMouvement(transfert.id, referentT.id);

  const apres = (await store.getBouteilles()).find((x) => x.id === cible.id);
  verifier('le transfert entrant a bien rempli la bouteille (5 → 7 kg)',
    Math.abs(apres.masseNetteKg - 7) < 1e-6, String(apres.masseNetteKg));
  const accusation = (await store.getAlertes())
    .find((a) => a.id === `alr-remise-filiere-${cible.id}`);
  verifier('AUCUNE alerte : l’écriture du registre explique la masse',
    accusation === undefined,
    accusation ? accusation.detail : '');
  verifier('le repère du suivi est intact (le suivi n’a pas été retouché)',
    (await store.getBsff()).find((x) => x.id === suivi.id)
      .masseBouteilleApresKg === 5);
}

{
  const { calculerChampsCerfa } = await import('../cerfa/generateur.js');
  const referent = await store.createPersonne({
    nom: 'Filiere', prenom: 'Référent', typePersonne: 'ENSEIGNANT',
    roleApp: 'REFERENT'
  });
  const machine = await store.createMachine({
    designation: 'Vitrine B2', fluide: 'R-410A', chargeNominaleKg: 10,
    chargeActuelleKg: 10, operateur: 'testeur'
  });
  const bidon = await store.createBouteille({
    type: 'RECUPERATION', fluide: 'R-410A', etatFluide: 'RECUPERE',
    tareKg: 10, masseBruteKg: 10, contenanceMaxKg: 50
  });
  const mvt = await store.creerMouvement({
    type: 'RECUPERATION_MAINTENANCE', machineId: machine.id,
    bouteilleDstId: bidon.id, peseeAvantKg: 10, peseeApresKg: 13,
    technicien: 'Testeur B2', causeMouvement: 'Essai remise en filière'
  });
  await store.soumettreMouvement(mvt.id);
  await store.validerMouvement(mvt.id, referent.id);
  await store.deciderFluideRecupere(bidon.id, 'DECHET', 'testeur');

  const sans = await calculerChampsCerfa(store,
    { source: 'mouvement', id: mvt.id });
  verifier('cadre 11 vide tant qu’aucun bordereau officiel n’existe',
    sans.texte['11_BSFF'] === '', String(sans.texte['11_BSFF']));

  await store.createBsff({
    bouteilleId: bidon.id, numeroBsff: 'SIF-2026-0011',
    transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 1, dateRemise: '2026-07-24', operateur: 'testeur'
  });
  const interne = await calculerChampsCerfa(store,
    { source: 'mouvement', id: mvt.id });
  verifier('un suivi INTERNE seul ne remplit PAS le cadre 11 du CERFA',
    interne.texte['11_BSFF'] === '', String(interne.texte['11_BSFF']));

  await store.createBsff({
    bouteilleId: bidon.id, numeroBsff: 'SIF-2026-0012',
    bordereauExterne: 'FF-2026-000999',
    transporteur: 'Collecteur agréé',
    installationDestination: 'Centre de traitement agréé',
    masseRemiseKg: 1, dateRemise: '2026-07-25', operateur: 'testeur'
  });
  const avec = await calculerChampsCerfa(store,
    { source: 'mouvement', id: mvt.id });
  verifier('le cadre 11 porte le numéro du bordereau OFFICIEL reporté',
    avec.texte['11_BSFF'] === 'FF-2026-000999', String(avec.texte['11_BSFF']));
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
