// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test du wizard (V9.1 — vague 3 : préselection machineId + retour)
// Exécution : node v8/js/wizard/test-wizard.mjs
//
// Vérifie :
//  1. options.machineId fourni → l'étape 2 (choix machine) est sautée,
//     le wizard démarre plus loin dans le parcours (étape 3 ou au-delà
//     selon ce qui est déjà connu), machineId n'est jamais perdu.
//  2. Sans machineId → comportement inchangé (démarre étape 1, machineId
//     null tant que l'étape 2 n'a pas été franchie).
//  3. options.retour respecté à la finalisation (naviguer(retour) au lieu
//     de naviguer('mouvements')).
//
// Aucune dépendance nouvelle : le mini-DOM maison partagé
// core/test-shim-dom.mjs (parseur HTML très simple + querySelector/
// querySelectorAll basiques sur #id/.classe/[attribut]) suffit pour
// dérouler ouvrirWizard() jusqu'à l'étape affichée SANS jamais
// atteindre l'étape 6 (signature → canvas 2D, hors de portée d'un
// shim sans dépendance : non testé ici, couvert manuellement en
// navigateur réel comme documenté dans le rapport).
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
const { document } = installerDocumentFactice();

const { ouvrirWizard } = await import('./wizard.js');

/* ============================================================
   Store factice minimal — assez pour instancier le wizard sans
   toucher au registre réel (aucune finalisation testée ici, la
   signature exigeant un canvas hors de portée du shim).
   ============================================================ */

function creerStoreFactice({ machines = [], bouteilles = [],
  habilitations = [], mentions = [], outillage = [] } = {}) {
  return {
    async getPersonnel() {
      return [{ id: 'p1', prenom: 'Jean', nom: 'Dupont', actif: true, roleApp: 'REFERENT' }];
    },
    async getMachines() { return machines.slice(); },
    async getBouteilles() { return bouteilles.slice(); },
    async getOutillage() { return outillage.slice(); },
    async getUtilisateurCourant() { return { id: 'u1', prenom: 'Jean', nom: 'Dupont', roleApp: 'REFERENT' }; },
    async getMouvements() { return []; },
    // Chantier B2 : nourrit le conseil d'intervenant de l'étape 1.
    async getHabilitations() { return habilitations.slice(); },
    async getMentions() { return mentions.slice(); }
  };
}

const MACHINE_TEST = {
  id: 'mac-1', code: 'M1', designation: 'Chambre froide test',
  fluide: 'R404A', statut: 'EN_SERVICE',
  chargeActuelleKg: 5, chargeNominaleKg: 10,
  codePublic: 'ABC123X'
};

/* ============================================================
   1. options.machineId fourni → l'étape 2 (choix machine) est
      sautée : le wizard démarre à l'étape 3 (bouteille), machineId
      reste bien celui fourni.
   ============================================================ */
{
  const store = creerStoreFactice({ machines: [MACHINE_TEST], bouteilles: [] });
  const appelsNaviguer = [];
  const ctx = { store, naviguer: (v) => appelsNaviguer.push(v) };

  await ouvrirWizard(ctx, { machineId: 'mac-1' });

  // Le wizard vient de s'ouvrir : la modale est accrochée à zone-modales/body
  const fond = document.body.querySelector('.modale-fond');
  verifier('la modale du wizard est bien montée dans le DOM', Boolean(fond));

  // L'étape affichée doit être > 2 (2 = choix machine, sauté puisque
  // machineId est déjà connu et qu'aucun technicien n'est encore choisi
  // à l'étape 1 → en réalité le saut ne peut dépasser l'étape 1 tant que
  // le technicien n'est pas choisi : etapeComplete()(1) est fausse sans
  // technicien, donc le wizard reste correctement à l'étape 1, PAS 2.
  const pastilleActive = fond.querySelector('.wizard-etape.active .wizard-pastille');
  verifier('sans technicien choisi, le wizard reste à l’étape 1 (ne saute pas '
    + 'au-delà de ce qui est réellement complet)',
    pastilleActive && pastilleActive.textContent === '1',
    'pastille active = ' + (pastilleActive && pastilleActive.textContent));
}

/* ============================================================
   2. Même scénario mais avec un technicien et un type déjà choisis
      "en amont" : on simule la présélection complète de l'étape 1
      pour vérifier que l'étape 2 (machine) est bien sautée quand
      machineId est fourni. On appelle directement la mécanique de
      saut en pilotant l'état via les cartes rendues (étape 1),
      puis on vérifie l'étape affichée après le clic Continuer.
   ============================================================ */
{
  const store = creerStoreFactice({
    machines: [MACHINE_TEST],
    bouteilles: [{
      id: 'bou-1', code: 'B1', fluide: 'R404A', type: 'BOUTEILLE',
      masseNetteKg: 8, contenanceMaxKg: 20, statut: 'EN_STOCK',
      etatFluide: 'VIERGE', decisionFluide: null
    }]
  });
  const ctx = { store, naviguer: () => {} };

  await ouvrirWizard(ctx, { machineId: 'mac-1' });
  const fond = document.body.querySelectorAll('.modale-fond').at(-1);

  // Étape 1 : choisir la carte "appoint" puis le technicien
  fond.querySelector('[data-carte-type="appoint"]').declencher('click');
  const selectTechnicien = fond.querySelector('#wizard-technicien');
  selectTechnicien.value = 'p1';
  selectTechnicien.declencher('change');

  // Continuer : l'étape 1 est complète (carteType + technicien), le
  // wizard doit passer à l'étape 3 (bouteille) en sautant l'étape 2
  // (machine) puisque machineId est déjà fourni et machinesCompatibles
  // n'a plus besoin d'être consultée.
  fond.querySelector('#wizard-continuer').declencher('click');

  const pastilleActive = fond.querySelector('.wizard-etape.active .wizard-pastille');
  verifier('machineId préréglé : après l’étape 1 complétée, le wizard saute '
    + 'directement à l’étape 3 (bouteille), sans repasser par l’étape 2 (machine)',
    pastilleActive && pastilleActive.textContent === '3',
    'pastille active = ' + (pastilleActive && pastilleActive.textContent));

  // La bouteille compatible (même fluide R404A) doit apparaître à
  // l'étape 3 : preuve que la machine choisie est bien restée mac-1.
  const carteBouteille = fond.querySelector('[data-bouteille-src="bou-1"]');
  verifier('la bouteille compatible avec la machine préréglée (R404A) est '
    + 'bien proposée à l’étape 3 : machineId n’a pas été perdu au saut',
    Boolean(carteBouteille));
}

/* ============================================================
   3. Sans machineId : comportement inchangé, le parcours démarre
      à l'étape 1 et passe bien par l'étape 2 (choix machine).
   ============================================================ */
{
  const store = creerStoreFactice({ machines: [MACHINE_TEST], bouteilles: [] });
  const ctx = { store, naviguer: () => {} };

  await ouvrirWizard(ctx, {});
  const fond = document.body.querySelectorAll('.modale-fond').at(-1);

  fond.querySelector('[data-carte-type="appoint"]').declencher('click');
  const selectTechnicien = fond.querySelector('#wizard-technicien');
  selectTechnicien.value = 'p1';
  selectTechnicien.declencher('change');
  fond.querySelector('#wizard-continuer').declencher('click');

  const pastilleActive = fond.querySelector('.wizard-etape.active .wizard-pastille');
  verifier('sans machineId, le parcours normal passe bien par l’étape 2 (machine) '
    + '— comportement inchangé',
    pastilleActive && pastilleActive.textContent === '2',
    'pastille active = ' + (pastilleActive && pastilleActive.textContent));

  const carteMachine = fond.querySelector('[data-machine="mac-1"]');
  verifier('la carte machine est bien proposée à l’étape 2 (parcours normal)',
    Boolean(carteMachine));
}

/* ============================================================
   4. options.retour : vérifié au niveau du contrat de finalisation
      SANS dérouler la signature (hors de portée du shim). On
      inspecte directement le code source de wizard.js pour
      s'assurer que la finalisation utilise bien options.retour
      quand il est fourni, et 'mouvements' par défaut sinon — un
      test de comportement complet (bout en bout, signature réelle)
      reste à faire manuellement en navigateur (documenté au rapport).
   ============================================================ */
{
  const fs = await import('node:fs');
  const source = fs.readFileSync(new URL('./wizard.js', import.meta.url), 'utf8');
  verifier('finaliser() navigue vers options.retour quand il est fourni, '
    + 'sinon vers \'mouvements\' par défaut',
    /naviguer\(\s*options\.retour\s*\|\|\s*'mouvements'\s*\)/.test(source)
    || /options\.retour[\s\S]{0,80}naviguer/.test(source),
    'motif options.retour introuvable dans finaliser()');
}

/* ============================================================
   5. E5 (finition) : getUtilisateurCourant() qui lève (base fraîche
      sans référent ni session) n'empêche PAS l'ouverture du wizard.
      L'assistant s'ouvre en dégradé : pas de validateur pressenti
      (peutValider = false), donc la finalisation ira en simple
      soumission plutôt qu'en validation directe — vérifié ici
      seulement au niveau de l'ouverture (pas de crash), la
      finalisation réelle exigeant la signature (canvas), hors de
      portée du shim comme documenté plus haut.
   ============================================================ */
{
  const store = creerStoreFactice({ machines: [MACHINE_TEST], bouteilles: [] });
  store.getUtilisateurCourant = async function () {
    throw new Error('Aucun référent dans le personnel.');
  };
  const ctx = { store, naviguer: () => {} };

  let leve = false;
  try {
    await ouvrirWizard(ctx, {});
  } catch {
    leve = true;
  }
  verifier('un utilisateur courant en échec (base fraîche) n’empêche pas '
    + 'l’ouverture du wizard : aucune exception ne remonte',
    !leve);

  const fond = document.body.querySelectorAll('.modale-fond').at(-1);
  verifier('le wizard est bien monté dans le DOM malgré l’échec de '
    + 'getUtilisateurCourant()', Boolean(fond));
}

/* ============================================================
   6. V9.2 : options.typeInitial='appoint' (bouton « Compléter la
      charge » de la fiche machine) — la carte « Complément de
      charge » doit être présélectionnée dès l'ouverture (classe
      « selectionnee »), et combiné à machineId, le choix du
      technicien à l'étape 1 doit suffire à sauter directement
      l'étape 2 (machine déjà connue) jusqu'à l'étape 3 (bouteille).
   ============================================================ */
{
  const store = creerStoreFactice({
    machines: [MACHINE_TEST],
    bouteilles: [{
      id: 'bou-1', code: 'B1', fluide: 'R404A', type: 'BOUTEILLE',
      masseNetteKg: 8, contenanceMaxKg: 20, statut: 'EN_STOCK',
      etatFluide: 'VIERGE', decisionFluide: null
    }]
  });
  const ctx = { store, naviguer: () => {} };

  await ouvrirWizard(ctx, { machineId: 'mac-1', typeInitial: 'appoint' });
  const fond = document.body.querySelectorAll('.modale-fond').at(-1);

  const carteAppoint = fond.querySelector('[data-carte-type="appoint"]');
  verifier('typeInitial="appoint" : la carte « Complément de charge » est '
    + 'présélectionnée dès l’ouverture (classe "selectionnee")',
    Boolean(carteAppoint) && carteAppoint.className.includes('selectionnee'),
    'className = ' + (carteAppoint && carteAppoint.className));

  // L'étape 1 reste affichée tant que le technicien n'est pas choisi
  // (etapeComplete(1) exige carteType ET technicienId), comme pour
  // machineId seul (cas 1 ci-dessus) : la présélection de la carte ne
  // suffit pas à elle seule à faire sauter une étape.
  let pastilleActive = fond.querySelector('.wizard-etape.active .wizard-pastille');
  verifier('typeInitial seul (sans technicien choisi) ne fait pas sauter '
    + 'l’étape 1 : il en manque encore le technicien',
    pastilleActive && pastilleActive.textContent === '1',
    'pastille active = ' + (pastilleActive && pastilleActive.textContent));

  // Le technicien est choisi (la carte reste "appoint", déjà acquise) :
  // l'étape 1 devient complète, machineId fait sauter l'étape 2.
  const selectTechnicien = fond.querySelector('#wizard-technicien');
  selectTechnicien.value = 'p1';
  selectTechnicien.declencher('change');
  fond.querySelector('#wizard-continuer').declencher('click');

  pastilleActive = fond.querySelector('.wizard-etape.active .wizard-pastille');
  verifier('typeInitial="appoint" + machineId : après avoir choisi le '
    + 'technicien (carte déjà présélectionnée), le wizard saute directement '
    + 'à l’étape 3 (bouteille), sans repasser par l’étape 2 (machine)',
    pastilleActive && pastilleActive.textContent === '3',
    'pastille active = ' + (pastilleActive && pastilleActive.textContent));

  // L'utilisateur garde la main : la carte reste changeable (elle est
  // rendue comme un bouton cliquable ordinaire, pas verrouillée).
  verifier('la carte présélectionnée reste un bouton cliquable ordinaire '
    + '(pas de verrouillage : l’utilisateur peut toujours en changer)',
    carteAppoint.tagName === 'BUTTON' || carteAppoint.getAttribute('type') === 'button');
}

/* ============================================================
   7. Sans typeInitial : comportement STRICTEMENT inchangé — aucune
      carte présélectionnée à l'étape 1, et une valeur invalide/inconnue
      passée en typeInitial est ignorée sans erreur (dégradation propre).
   ============================================================ */
{
  const store = creerStoreFactice({ machines: [MACHINE_TEST], bouteilles: [] });
  const ctx = { store, naviguer: () => {} };

  await ouvrirWizard(ctx, {});
  let fond = document.body.querySelectorAll('.modale-fond').at(-1);
  let carteSelectionnee = fond.querySelector('.carte-choix.selectionnee');
  verifier('sans typeInitial, aucune carte n’est présélectionnée à '
    + 'l’étape 1 (comportement inchangé)',
    !carteSelectionnee);

  // Valeur inconnue : ignorée silencieusement, pas de présélection ni
  // d'exception (dégradation propre comme documenté dans ouvrirWizard).
  let leve = false;
  try {
    await ouvrirWizard(ctx, { typeInitial: 'valeur-inconnue-xyz' });
  } catch {
    leve = true;
  }
  verifier('un typeInitial invalide/inconnu n’empêche pas l’ouverture du '
    + 'wizard (ignoré silencieusement)', !leve);

  fond = document.body.querySelectorAll('.modale-fond').at(-1);
  carteSelectionnee = fond.querySelector('.carte-choix.selectionnee');
  verifier('un typeInitial invalide/inconnu ne présélectionne aucune carte',
    !carteSelectionnee);
}

/* ============================================================
   8. Chantier B2 (brique 4) : conseil d'intervenant à l'étape 1.
      Le technicien factice p1 détient un IV (2008) = contrôle
      d'étanchéité SEUL. Sans carte choisie → synthèse de compétence
      (bandeau CONSEIL) ; carte « appoint » (= MAINTENANCE) → REFUS
      de conseil (bandeau rouge, jamais bloquant : Continuer marche).
   ============================================================ */
{
  const store = creerStoreFactice({
    machines: [MACHINE_TEST],
    habilitations: [{ id: 'h1', personneId: 'p1', regime: '2008',
      categorie: 'IV', actif: true }]
  });
  const ctx = { store, naviguer: () => {} };

  await ouvrirWizard(ctx, { machineId: 'mac-1' });
  const fond = document.body.querySelectorAll('.modale-fond').at(-1);

  verifier('étape 1 sans technicien choisi : aucun encart de conseil',
    !fond.querySelector('.conseil-intervenant'));

  // Technicien choisi, AUCUNE carte : synthèse de compétence (cas Bachir).
  const selectTechnicien = fond.querySelector('#wizard-technicien');
  selectTechnicien.value = 'p1';
  selectTechnicien.declencher('change');

  let encart = fond.querySelector('.conseil-intervenant');
  verifier('technicien choisi : l’encart de conseil apparaît (synthèse)',
    Boolean(encart));
  verifier('IV (2008) sans opération choisie → synthèse « étanchéité uniquement »',
    encart && /étanchéité uniquement/i.test(encart.textContent || ''));

  // Carte « appoint » (MAINTENANCE) : hors du champ d'un IV → REFUS rouge.
  fond.querySelector('[data-carte-type="appoint"]').declencher('click');
  encart = fond.querySelector('.conseil-intervenant');
  verifier('IV (2008) sur un complément de charge → REFUS de conseil (rouge)',
    encart && String(encart.className).includes('bandeau-erreur'));
  verifier('le refus conseille de confier la charge à un titulaire habilité',
    encart && /confiez/i.test(encart.textContent || ''));

  // JAMAIS bloquant : l'étape 1 complète laisse continuer malgré le refus.
  fond.querySelector('#wizard-continuer').declencher('click');
  const pastilleActive = fond.querySelector('.wizard-etape.active .wizard-pastille');
  verifier('le REFUS de conseil ne bloque PAS : le wizard continue (étape 3)',
    pastilleActive && pastilleActive.textContent === '3',
    'pastille active = ' + (pastilleActive && pastilleActive.textContent));
}

/* ============================================================
   9. Chantier B2 (brique 4) : executeParId au creerMouvement — motif
      source (patron du bloc 4 : la finalisation exige la signature,
      hors de portée du shim ; le store, lui, est déjà prouvé par
      test-habilitations.mjs qui crée des mouvements avec les rôles).
   ============================================================ */
{
  const fs = await import('node:fs');
  const source = fs.readFileSync(new URL('./wizard.js', import.meta.url), 'utf8');
  verifier('creerMouvement reçoit executeParId = l’id du technicien choisi',
    /executeParId:\s*etat\.technicienId/.test(source),
    'motif executeParId: etat.technicienId introuvable dans finaliser()');
}

/* ============================================================
   10. Brique 2 (outils multiples) : cases à cocher « Outils
       utilisés » à l'étape 5 (Contrôle) — rendu, libellé, bandeau
       de conseil réactif (jamais bloquant).
   ============================================================ */
{
  const OUTIL_BALANCE = { id: 'out-1', typeOutil: 'BALANCE', marque: 'Sauter',
    modele: 'FK-50', numSerie: 'SN1', statut: 'CONFORME' };
  const OUTIL_DETECTEUR = { id: 'out-2', typeOutil: 'DETECTEUR', marque: 'Inficon',
    modele: 'D-TEK', numSerie: 'SN2', statut: 'EXPIRE' };
  const store = creerStoreFactice({
    machines: [MACHINE_TEST],
    bouteilles: [{
      id: 'bou-1', code: 'B1', fluide: 'R404A', type: 'BOUTEILLE',
      masseNetteKg: 8, contenanceMaxKg: 20, statut: 'EN_STOCK',
      etatFluide: 'VIERGE', decisionFluide: null
    }],
    outillage: [OUTIL_BALANCE, OUTIL_DETECTEUR]
  });
  const ctx = { store, naviguer: () => {} };

  await ouvrirWizard(ctx, { machineId: 'mac-1' });
  const fond = document.body.querySelectorAll('.modale-fond').at(-1);

  // Étape 1 : type + technicien (machineId préréglé saute l'étape 2)
  fond.querySelector('[data-carte-type="appoint"]').declencher('click');
  const selectTechnicien = fond.querySelector('#wizard-technicien');
  selectTechnicien.value = 'p1';
  selectTechnicien.declencher('change');
  fond.querySelector('#wizard-continuer').declencher('click'); // -> étape 3

  // Étape 3 : bouteille source
  fond.querySelector('[data-bouteille-src="bou-1"]').declencher('click');
  fond.querySelector('#wizard-continuer').declencher('click'); // -> étape 4

  // Étape 4 : pesées valides (8 kg -> 6 kg, quantité 2 kg)
  const champAvant = fond.querySelector('#wizard-pesee-avant');
  const champApres = fond.querySelector('#wizard-pesee-apres');
  champAvant.value = '8';
  champAvant.declencher('input');
  champApres.value = '6';
  champApres.declencher('input');
  fond.querySelector('#wizard-continuer').declencher('click'); // -> étape 5

  let pastilleActive = fond.querySelector('.wizard-etape.active .wizard-pastille');
  verifier('la séquence de test atteint bien l’étape 5 (Contrôle)',
    pastilleActive && pastilleActive.textContent === '5',
    'pastille active = ' + (pastilleActive && pastilleActive.textContent));

  // « Sans objet » : complète l'étape 5 sans nécessiter de détecteur —
  // ne concerne QUE le détecteur du contrôle, jamais les outils déclarés.
  fond.querySelector('[data-controle="SANS_OBJET"]').declencher('click');
  verifier('« Sans objet » suffit à rendre Continuer actionnable',
    !fond.querySelector('#wizard-continuer').disabled);

  const caseBalance = fond.querySelector('[data-outil="out-1"]');
  const caseDetecteur = fond.querySelector('[data-outil="out-2"]');
  verifier('les 2 outils de l’outillage apparaissent en cases à cocher à l’étape 5',
    Boolean(caseBalance) && Boolean(caseDetecteur));

  const labelBalance = caseBalance && caseBalance.parent;
  verifier('le libellé d’un outil est « TYPE — Marque Modèle (n° série) »',
    labelBalance && labelBalance.textContent.includes('Balance — Sauter FK-50 (n° SN1)'),
    labelBalance && labelBalance.textContent);

  verifier('aucune case n’est cochée par défaut',
    !caseBalance.hasAttribute('checked') && !caseDetecteur.hasAttribute('checked'));
  verifier('aucun bandeau de conseil tant qu’aucun outil non conforme n’est coché',
    !fond.querySelector('#wizard-outils-avertissement .bandeau-avertissement'));

  // Cocher le détecteur EXPIRE : bandeau CONSEIL, jamais bloquant.
  caseDetecteur.checked = true;
  caseDetecteur.declencher('change');
  verifier('cocher un outil EXPIRE affiche le bandeau de conseil',
    Boolean(fond.querySelector('#wizard-outils-avertissement .bandeau-avertissement')));
  verifier('Continuer reste actionnable malgré l’outil non conforme coché '
    + '(conseil, jamais blocage)',
    !fond.querySelector('#wizard-continuer').disabled);

  // Décocher : le bandeau disparaît.
  caseDetecteur.checked = false;
  caseDetecteur.declencher('change');
  verifier('décocher l’outil fait disparaître le bandeau de conseil',
    !fond.querySelector('#wizard-outils-avertissement .bandeau-avertissement'));
}

/* ============================================================
   11. Brique 2 : reprise d'un brouillon — les outils déjà déclarés
       (getOutilsMouvement) préchargent etat.outilsIds et précochent
       la case correspondante.
   ============================================================ */
{
  const OUTIL_BALANCE = { id: 'out-1', typeOutil: 'BALANCE', marque: 'Sauter',
    modele: 'FK-50', numSerie: 'SN1', statut: 'CONFORME' };
  const store = creerStoreFactice({
    machines: [MACHINE_TEST],
    bouteilles: [{
      id: 'bou-1', code: 'B1', fluide: 'R404A', type: 'BOUTEILLE',
      masseNetteKg: 8, contenanceMaxKg: 20, statut: 'EN_STOCK',
      etatFluide: 'VIERGE', decisionFluide: null
    }],
    outillage: [OUTIL_BALANCE]
  });
  store.getMouvements = async () => [{
    id: 'mv-brouillon-1', numero: 'FI-2026-099', statut: 'BROUILLON',
    type: 'CHARGE_APPOINT', machineId: 'mac-1', bouteilleSrcId: 'bou-1',
    peseeAvantKg: 8, peseeApresKg: 6, technicien: 'Jean Dupont'
  }];
  let idDemande = null;
  store.getOutilsMouvement = async (id) => {
    idDemande = id;
    return [{ outillageId: 'out-1', typeOutil: 'BALANCE', marque: 'Sauter',
      modele: 'FK-50', numSerie: 'SN1', statutFige: null, echeanceFigee: null }];
  };
  const ctx = { store, naviguer: () => {} };

  await ouvrirWizard(ctx, { brouillonId: 'mv-brouillon-1' });

  verifier('la reprise du brouillon interroge getOutilsMouvement avec son id',
    idDemande === 'mv-brouillon-1');

  const fond = document.body.querySelectorAll('.modale-fond').at(-1);
  const pastilleActive = fond.querySelector('.wizard-etape.active .wizard-pastille');
  verifier('la reprise s’arrête à l’étape 5 (contrôle non renseigné sur ce brouillon)',
    pastilleActive && pastilleActive.textContent === '5',
    'pastille active = ' + (pastilleActive && pastilleActive.textContent));

  const caseBalance = fond.querySelector('[data-outil="out-1"]');
  verifier('l’outil déjà déclaré sur le brouillon est précoché à la reprise',
    Boolean(caseBalance) && caseBalance.hasAttribute('checked'));
}

/* ============================================================
   12. Brique 2 : le payload creerMouvement transmet outilsIds
       (motif source, comme executeParId — cf. test 9).
   ============================================================ */
{
  const fs = await import('node:fs');
  const source = fs.readFileSync(new URL('./wizard.js', import.meta.url), 'utf8');
  verifier('creerMouvement reçoit outilsIds = etat.outilsIds',
    /outilsIds:\s*etat\.outilsIds/.test(source),
    'motif outilsIds: etat.outilsIds introuvable dans finaliser()');
}

// ---- Bilan ----
console.log(`\n${nbOk} test(s) réussi(s), ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
