// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — vue « Protection des données » (lot E ③, RGPD)
//
// NOTICE D'INFORMATION des personnes concernées (RGPD art. 13/14) affichée
// DANS l'application : qui traite les données, lesquelles, pourquoi, sur
// quelle base légale, combien de temps, où, et quels sont les droits des
// personnes + comment les exercer. Le contenu suit le registre de conformité
// RGPD.md (source de vérité), reformulé pour les personnes concernées
// (personnel, élèves, contacts des détenteurs).
//
// Vue STATIQUE (aucune écriture) : le seul appel au store est getEtablissement
// pour nommer le responsable de traitement quand il est renseigné ; tout échec
// (pas de session, mode dégradé) retombe sur une formulation générique.
// La relecture par le DPD reste un geste HORS code (gate E④).
// ============================================================

import { enteteVue, ICONES, modale, toast } from './communs.js';
import { esc } from '../core/utils.js';

export const titre = 'Protection des données';

/* ============================================================
   Coffre des identités (lot E2) — la section OPÉRATIONNELLE de la
   vue : compteur, candidats pré-cochés, les 5 gestes. Le store reste
   SEUL juge (rôles, phrase, verrous) : la vue affiche ses refus.
   ============================================================ */

/** HTML de la section coffre (état déjà lu) ; null si état inaccessible. */
function gabaritCoffre(etat, enDemo) {
  const bandeauDemo = enDemo
    ? '<p class="encart-aide rgpd-note">Mode démonstration : chiffrement '
      + 'SIMULÉ sur données fictives. N\'utilisez jamais ici votre vraie '
      + 'phrase de coffre — prenez une phrase d\'exercice (elle est oubliée '
      + 'au rechargement de la page).</p>'
    : '';
  const bandeauCandidats = etat.candidats.length > 0
    ? '<p class="encart-aide rgpd-note">' + etat.candidats.length
      + ' fiche(s) d\'élève(s) désactivée(s) attendent la mise à l\'abri '
      + '(durée annoncée : année scolaire en cours + la suivante).</p>'
    : '';
  const lignes = etat.identites.map((i) =>
    '<tr><td>' + esc(i.pseudonyme) + '</td>'
    + '<td>' + esc((i.dateMiseALabri || '').slice(0, 10)) + '</td></tr>')
    .join('');
  const tableau = etat.identites.length > 0
    ? '<div class="tableau-defilement"><table class="tableau"><thead><tr>'
      + '<th>Pseudonyme</th><th>Mise à l\'abri le</th></tr></thead>'
      + '<tbody>' + lignes + '</tbody></table></div>'
    : '<p class="rgpd-note">Aucune identité au coffre pour le moment.</p>';
  return '<section class="rgpd-section" id="section-coffre">'
    + '<h3 class="rgpd-titre">Coffre des identités</h3>'
    + '<p>Minimisation RÉVERSIBLE : l\'identité d\'un élève parti est '
    + 'chiffrée dans le coffre, sa fiche n\'affiche plus qu\'un pseudonyme '
    + '(« Élève 2026-01 »), et votre code la rouvre en cas de besoin légal — '
    + 'chaque ouverture est journalisée de façon inaltérable au sein de '
    + 'l\'application.</p>'
    + bandeauDemo + bandeauCandidats
    + '<p><strong>' + etat.nombreAuCoffre + '</strong> identité(s) au coffre'
    + (etat.coffreCree ? '' : ' — le coffre sera créé au premier geste (une '
      + 'phrase NEUVE dédiée, 14 caractères minimum ; conseil : 4 ou 5 mots '
      + 'choisis au hasard, notés sur papier sous pli scellé au coffre de '
      + 'l\'établissement — <strong>code perdu = identités définitivement '
      + 'illisibles</strong>, le registre continue de fonctionner)') + '.</p>'
    + '<div class="entete-vue-actions" style="flex-wrap:wrap;gap:8px">'
    + '<button type="button" id="coffre-mettre" class="btn btn-primaire">'
    + 'Mettre à l\'abri…</button>'
    + '<button type="button" id="coffre-verifier" class="btn btn-secondaire"'
    + (etat.coffreCree ? '' : ' disabled') + '>Vérifier mon code</button>'
    + '<button type="button" id="coffre-consulter" class="btn btn-secondaire"'
    + (etat.nombreAuCoffre ? '' : ' disabled') + '>Consulter une identité…</button>'
    + '<button type="button" id="coffre-restaurer" class="btn btn-secondaire"'
    + (etat.nombreAuCoffre ? '' : ' disabled') + '>Restaurer une identité…</button>'
    + '<button type="button" id="coffre-phrase" class="btn btn-secondaire"'
    + (etat.coffreCree ? '' : ' disabled') + '>Changer la phrase…</button>'
    + '</div>'
    + tableau
    + '</section>';
}

/** Choix « identité au coffre » (select) + phrase + motif — HTML commun. */
function gabaritChoixIdentite(etat, avecMotif) {
  const options = etat.identites.map((i) =>
    '<option value="' + esc(i.personnelId) + '">' + esc(i.pseudonyme)
    + '</option>').join('');
  return '<div class="champ"><label>Identité</label>'
    + '<select id="coffre-cible" class="champ-saisie">' + options
    + '</select></div>'
    + '<div class="champ"><label>Phrase du coffre</label>'
    + '<input type="password" id="coffre-saisie-phrase" class="champ-saisie" '
    + 'autocomplete="off"></div>'
    + (avecMotif
      ? '<div class="champ"><label>Motif (obligatoire, journalisé)</label>'
        + '<input type="text" id="coffre-saisie-motif" class="champ-saisie">'
        + '</div>'
      : '')
    + '<p id="coffre-erreur" class="rgpd-note" style="color:var(--danger,#c00)"></p>';
}

/** Branche les 5 gestes de la section coffre. */
function brancherCoffre(conteneur, ctx, etat, rafraichir) {
  const erreurDans = (racine, message) => {
    const zone = racine.querySelector('#coffre-erreur');
    if (zone) zone.textContent = message;
  };

  // ---- Mettre à l'abri (liste à cocher, candidats pré-cochés) ----
  conteneur.querySelector('#coffre-mettre')
    .addEventListener('click', async function () {
      let personnel = [];
      try { personnel = await ctx.store.getPersonnel(); } catch { return; }
      const inactifs = personnel.filter((p) => p.actif === false
        && !etat.identites.some((i) => i.personnelId === p.id));
      if (inactifs.length === 0) {
        toast('Aucune fiche désactivée à mettre à l\'abri.', 'erreur');
        return;
      }
      const cases = inactifs.map((p) =>
        '<label style="display:block;margin:4px 0">'
        + '<input type="checkbox" class="coffre-case" value="' + esc(p.id) + '"'
        + (etat.candidats.includes(p.id) ? ' checked' : '') + '> '
        + esc(p.prenom + ' ' + p.nom)
        + ' <span class="rgpd-note">(' + esc(p.typePersonne) + ')</span>'
        + '</label>').join('');
      const premierGeste = !etat.coffreCree;
      const { fermer, racine } = modale({
        titre: 'Mettre des identités à l\'abri',
        contenuHtml:
          '<p>Les fiches cochées seront pseudonymisées et leurs identités '
          + 'chiffrées au coffre. Une archive complète vérifiée est exigée '
          + '(produite automatiquement au besoin).</p>' + cases
          + '<div class="champ"><label>'
          + (premierGeste ? 'Phrase du coffre (nouvelle, ≥ 14 caractères)'
            : 'Phrase du coffre') + '</label>'
          + '<input type="password" id="coffre-saisie-phrase" '
          + 'class="champ-saisie" autocomplete="off"></div>'
          + (premierGeste
            ? '<div class="champ"><label>Confirmez la phrase</label>'
              + '<input type="password" id="coffre-saisie-phrase2" '
              + 'class="champ-saisie" autocomplete="off"></div>'
              + '<p class="encart-aide rgpd-note">Code perdu = identités '
              + 'définitivement illisibles (le registre, lui, continue de '
              + 'fonctionner). Notez la phrase sur papier, sous pli scellé, '
              + 'au coffre de l\'établissement — imprimez directement, '
              + 'n\'enregistrez jamais la phrase dans un fichier.</p>'
            : '')
          + '<p id="coffre-erreur" class="rgpd-note" '
          + 'style="color:var(--danger,#c00)"></p>',
        actionsHtml:
          '<button type="button" id="coffre-annuler" class="btn btn-secondaire">'
          + 'Annuler</button>'
          + '<button type="button" id="coffre-valider" class="btn btn-primaire">'
          + 'Mettre à l\'abri</button>'
      });
      racine.querySelector('#coffre-annuler')
        .addEventListener('click', function () { fermer(); });
      racine.querySelector('#coffre-valider')
        .addEventListener('click', async function () {
          const ids = [...racine.querySelectorAll('.coffre-case:checked')]
            .map((c) => c.value);
          const phrase = racine.querySelector('#coffre-saisie-phrase').value;
          if (ids.length === 0) {
            erreurDans(racine, 'Cochez au moins une fiche.'); return;
          }
          if (premierGeste) {
            const phrase2 =
              racine.querySelector('#coffre-saisie-phrase2').value;
            if (phrase !== phrase2) {
              erreurDans(racine, 'Les deux saisies ne correspondent pas.');
              return;
            }
          }
          this.disabled = true;
          try {
            const resultat = await ctx.store.mettreAuCoffre(ids, phrase);
            toast(resultat.misAuCoffre.length
              + ' identité(s) mise(s) à l\'abri.', 'succes');
            fermer();
            rafraichir();
          } catch (erreur) {
            erreurDans(racine, erreur.message || 'Mise à l\'abri impossible.');
            this.disabled = false;
          }
        });
    });

  // ---- Vérifier mon code ----
  conteneur.querySelector('#coffre-verifier')
    .addEventListener('click', function () {
      const { fermer, racine } = modale({
        titre: 'Vérifier mon code',
        contenuHtml:
          '<div class="champ"><label>Phrase du coffre</label>'
          + '<input type="password" id="coffre-saisie-phrase" '
          + 'class="champ-saisie" autocomplete="off"></div>'
          + '<p id="coffre-erreur" class="rgpd-note" '
          + 'style="color:var(--danger,#c00)"></p>',
        actionsHtml:
          '<button type="button" id="coffre-annuler" class="btn btn-secondaire">'
          + 'Fermer</button>'
          + '<button type="button" id="coffre-valider" class="btn btn-primaire">'
          + 'Vérifier</button>'
      });
      racine.querySelector('#coffre-annuler')
        .addEventListener('click', function () { fermer(); });
      racine.querySelector('#coffre-valider')
        .addEventListener('click', async function () {
          try {
            await ctx.store.verifierCodeCoffre(
              racine.querySelector('#coffre-saisie-phrase').value);
            toast('Code vérifié : le coffre s\'ouvre avec cette phrase.',
              'succes');
            fermer();
          } catch (erreur) {
            erreurDans(racine, erreur.message || 'Vérification impossible.');
          }
        });
    });

  // ---- Consulter une identité (éphémère, motif obligatoire) ----
  conteneur.querySelector('#coffre-consulter')
    .addEventListener('click', function () {
      const { fermer, racine } = modale({
        titre: 'Consulter une identité',
        contenuHtml: gabaritChoixIdentite(etat, true),
        actionsHtml:
          '<button type="button" id="coffre-annuler" class="btn btn-secondaire">'
          + 'Annuler</button>'
          + '<button type="button" id="coffre-valider" class="btn btn-primaire">'
          + 'Consulter</button>'
      });
      racine.querySelector('#coffre-annuler')
        .addEventListener('click', function () { fermer(); });
      racine.querySelector('#coffre-valider')
        .addEventListener('click', async function () {
          try {
            const personnelId = racine.querySelector('#coffre-cible').value;
            const identite = await ctx.store.consulterIdentiteCoffre(
              personnelId,
              racine.querySelector('#coffre-saisie-phrase').value,
              racine.querySelector('#coffre-saisie-motif').value);
            fermer();
            const pjs = (identite.piecesJointes || []).map((pj, i) =>
              '<li><a download="' + esc(pj.nomFichier) + '" '
              + 'href="data:' + esc(pj.mimeType) + ';base64,'
              + (pj.base64 || '') + '">' + esc(pj.nomFichier) + '</a></li>')
              .join('');
            const { fermer: fermerResultat, racine: racineResultat } = modale({
              titre: 'Identité consultée (rien n\'est réécrit)',
              contenuHtml:
                '<p><strong>' + esc((identite.prenom || '') + ' '
                + (identite.nom || '')) + '</strong></p>'
                + '<p>Courriel : ' + esc(identite.email || '—') + '<br>'
                + 'Attestation : ' + esc(identite.numAttestationAptitude || '—')
                + ' (' + esc(identite.organismeDelivreur || '—') + ')<br>'
                + 'Identifiant de connexion : '
                + esc(identite.identifiantConnexion || '—') + '</p>'
                + (pjs ? '<p>Pièces :</p><ul>' + pjs + '</ul>' : ''),
              actionsHtml:
                '<button type="button" id="coffre-fermer-resultat" '
                + 'class="btn btn-primaire">Fermer</button>'
            });
            racineResultat.querySelector('#coffre-fermer-resultat')
              .addEventListener('click', function () { fermerResultat(); });
          } catch (erreur) {
            erreurDans(racine, erreur.message || 'Consultation impossible.');
          }
        });
    });

  // ---- Restaurer une identité (complète, motif obligatoire) ----
  conteneur.querySelector('#coffre-restaurer')
    .addEventListener('click', function () {
      const { fermer, racine } = modale({
        titre: 'Restaurer une identité',
        contenuHtml:
          '<p>La fiche redevient exactement ce qu\'elle était (pièces '
          + 'comprises) et sort du coffre. Le pseudonyme n\'est jamais '
          + 'réattribué.</p>' + gabaritChoixIdentite(etat, true),
        actionsHtml:
          '<button type="button" id="coffre-annuler" class="btn btn-secondaire">'
          + 'Annuler</button>'
          + '<button type="button" id="coffre-valider" class="btn btn-primaire">'
          + 'Restaurer</button>'
      });
      racine.querySelector('#coffre-annuler')
        .addEventListener('click', function () { fermer(); });
      racine.querySelector('#coffre-valider')
        .addEventListener('click', async function () {
          try {
            const fiche = await ctx.store.restaurerIdentiteCoffre(
              racine.querySelector('#coffre-cible').value,
              racine.querySelector('#coffre-saisie-phrase').value,
              racine.querySelector('#coffre-saisie-motif').value);
            toast('Identité restaurée : ' + fiche.prenom + ' ' + fiche.nom
              + (fiche.piecesAlterees
                ? ' — ' + fiche.piecesAlterees.length
                  + ' pièce(s) altérée(s) non restituée(s)' : '') + '.',
            fiche.piecesAlterees ? 'erreur' : 'succes');
            fermer();
            rafraichir();
          } catch (erreur) {
            erreurDans(racine, erreur.message || 'Restauration impossible.');
          }
        });
    });

  // ---- Changer la phrase ----
  conteneur.querySelector('#coffre-phrase')
    .addEventListener('click', function () {
      const { fermer, racine } = modale({
        titre: 'Changer la phrase du coffre',
        contenuHtml:
          '<div class="champ"><label>Phrase ACTUELLE</label>'
          + '<input type="password" id="coffre-ancienne" class="champ-saisie" '
          + 'autocomplete="off"></div>'
          + '<div class="champ"><label>Nouvelle phrase (≥ 14 caractères)</label>'
          + '<input type="password" id="coffre-nouvelle" class="champ-saisie" '
          + 'autocomplete="off"></div>'
          + '<div class="champ"><label>Confirmez la nouvelle phrase</label>'
          + '<input type="password" id="coffre-nouvelle2" class="champ-saisie" '
          + 'autocomplete="off"></div>'
          + '<p id="coffre-erreur" class="rgpd-note" '
          + 'style="color:var(--danger,#c00)"></p>',
        actionsHtml:
          '<button type="button" id="coffre-annuler" class="btn btn-secondaire">'
          + 'Annuler</button>'
          + '<button type="button" id="coffre-valider" class="btn btn-primaire">'
          + 'Changer la phrase</button>'
      });
      racine.querySelector('#coffre-annuler')
        .addEventListener('click', function () { fermer(); });
      racine.querySelector('#coffre-valider')
        .addEventListener('click', async function () {
          const nouvelle = racine.querySelector('#coffre-nouvelle').value;
          if (nouvelle !== racine.querySelector('#coffre-nouvelle2').value) {
            erreurDans(racine, 'Les deux saisies ne correspondent pas.');
            return;
          }
          try {
            const bilan = await ctx.store.changerPhraseCoffre(
              racine.querySelector('#coffre-ancienne').value, nouvelle);
            toast(bilan.nombreRechiffre
              + ' enveloppe(s) re-scellée(s) sous la nouvelle phrase.',
            'succes');
            fermer();
          } catch (erreur) {
            erreurDans(racine, erreur.message || 'Changement impossible.');
          }
        });
    });
}

/** Nom du responsable de traitement, si l'établissement est renseigné. */
async function nomEtablissement(ctx) {
  try {
    const etab = await ctx.store.getEtablissement();
    return (etab && (etab.raisonSociale || etab.nom || etab.designation)) || '';
  } catch {
    return '';
  }
}

export async function render(conteneur, ctx) {
  const etablissement = await nomEtablissement(ctx);
  const responsable = etablissement
    ? esc(etablissement)
    : 'votre établissement (lycée ou entreprise utilisatrice)';

  // Lot E2 : état du coffre — section opérationnelle si accessible (niveau
  // VALIDEUR côté serveur), encart informatif sinon.
  let etatCoffre = null;
  try {
    etatCoffre = await ctx.store.etatCoffre();
  } catch {
    etatCoffre = null;
  }
  const enDemo = String(ctx.store.modeLabel || '').toUpperCase() !== 'LOCAL';
  const sectionCoffre = etatCoffre
    ? gabaritCoffre(etatCoffre, enDemo)
    : '<section class="rgpd-section"><h3 class="rgpd-titre">Coffre des '
      + 'identités</h3><p class="rgpd-note">La gestion du coffre est '
      + 'réservée aux valideurs (référent, enseignant, administrateur).'
      + '</p></section>';

  conteneur.innerHTML =
    enteteVue({
      titre: 'Protection des données personnelles',
      sousTitre: 'Information des personnes concernées (RGPD, articles 13 et 14)',
      actionsHtml:
        '<button type="button" id="rgpd-imprimer" class="btn btn-secondaire">'
        + ICONES.imprimer + '<span>Imprimer</span></button>'
    })
    + '<div class="rgpd-notice">'
    + sectionCoffre

    + '<p class="rgpd-intro">inerWeb Fluide est un logiciel <strong>local</strong> '
    + 'de traçabilité des fluides frigorigènes (réglementation F-Gas). Il ne '
    + 'transmet aucune donnée à son auteur ni à un tiers. Cette page informe les '
    + 'personnes dont des données sont enregistrées (personnel, élèves, contacts '
    + 'des détenteurs d’équipements) de la manière dont elles sont traitées.</p>'

    + section('1. Qui est responsable',
      '<p>Le responsable de traitement est <strong>' + responsable + '</strong> : '
      + 'c’est lui qui décide des finalités, crée les comptes, saisit et héberge '
      + 'les données. Le logiciel n’est qu’un outil mis à sa disposition. '
      + 'L’établissement inscrit ce traitement à son registre des activités '
      + '(article 30 du RGPD) et en informe son délégué à la protection des '
      + 'données (DPD, généralement mutualisé au niveau académique pour les '
      + 'lycées publics).</p>')

    + section('2. Quelles données sont traitées',
      tableauDeux(
        ['Catégorie', 'Données'],
        [
          ['Registre du personnel',
            'Nom, prénom, adresse électronique, type de personne, rôle dans '
            + 'l’application, numéro d’attestation d’aptitude, organisme, dates '
            + 'de validité, scan de l’attestation, image de signature, statut '
            + 'actif/inactif.'],
          ['Détenteurs d’équipements',
            'Raison sociale, adresse, SIRET, coordonnées de contact.'],
          ['Interventions et registre',
            'Fiches d’intervention (CERFA), mouvements de fluide, contrôles '
            + 'd’étanchéité, avec l’identité du technicien et du validateur.'],
          ['Comptes et journal',
            'Identifiants de connexion (mot de passe haché, jamais en clair), '
            + 'journal d’audit (qui, quoi, quand).']
        ])
      + '<p class="encart-aide rgpd-note">Aucune donnée sensible au sens de l’article 9 du '
      + 'RGPD (santé, opinions, biométrie…) n’est traitée. Les données se '
      + 'limitent à ce qu’exige la réglementation F-Gas et le fonctionnement de '
      + 'l’application (principe de minimisation).</p>')

    + section('3. Pourquoi (finalités)',
      '<ul>'
      + '<li><strong>Tenir le registre réglementaire</strong> de traçabilité des '
      + 'fluides frigorigènes et du personnel autorisé à intervenir (Code de '
      + 'l’environnement, réglementation européenne F-Gas).</li>'
      + '<li><strong>Former</strong> les élèves des filières froid et '
      + 'climatisation, en mode formation strictement séparé du mode officiel.</li>'
      + '</ul>')

    + section('4. Sur quelle base légale',
      '<ul>'
      + '<li><strong>Obligation légale</strong> (art. 6.1.c) pour la tenue du '
      + 'registre de traçabilité et du personnel.</li>'
      + '<li><strong>Mission d’intérêt public</strong> (art. 6.1.e) pour le volet '
      + 'formation, au titre de la mission d’enseignement.</li>'
      + '</ul>')

    + section('5. Combien de temps sont-elles conservées',
      tableauDeux(
        ['Données', 'Durée de conservation'],
        [
          ['Fiches d’intervention (CERFA) et mouvements',
            '5 ans minimum à compter de leur établissement (obligation F-Gas).'],
          ['Registre du personnel, attestations',
            'Durée d’activité de la personne, puis conservation avec le registre '
            + 'auquel elles se rattachent.'],
          ['Comptes utilisateurs',
            'Désactivés au départ de la personne, puis supprimés lorsque plus '
            + 'aucun enregistrement conservé ne s’y réfère.'],
          ['Journal d’audit',
            'Conservé avec le registre (même durée), non modifiable.'],
          ['Identité de la fiche d’un élève parti',
            'Année scolaire en cours et l’année suivante au plus, puis MISE '
            + 'À L’ABRI CHIFFRÉE : la fiche n’affiche plus qu’un pseudonyme, '
            + 'l’identité reste rouvrable en cas de besoin légal (chaque '
            + 'ouverture est journalisée).'],
          ['Écritures d’intervention du mode formation',
            'Conservées avec le registre (elles partagent sa chaîne '
            + 'd’intégrité), sous pseudonyme à l’affichage.']
        ])
      + '<p class="encart-aide rgpd-note">Les écritures validées du registre officiel ne sont '
      + 'ni modifiables ni effaçables (corrections par contre-écriture '
      + 'uniquement) : c’est une exigence d’intégrité du registre réglementaire, '
      + 'compatible avec le RGPD au titre de l’obligation légale.</p>')

    // A18 (26/07) — la notice annonçait « ou, en mode Cloud, dans un hébergement
    // situé dans l'Union européenne ». Ce mode N'EXISTE PAS : la promesse a été
    // retirée partout ailleurs le 23/07 (P2-4/P2-5) et celle-ci avait été
    // oubliée. C'est la pire surface où l'oublier — la notice d'information est
    // précisément le document sur lequel une personne concernée se fonde.
    + section('6. Où sont stockées vos données',
      '<p><strong>Sur le poste de l’établissement</strong>, et nulle part '
      + 'ailleurs : la base et les documents vivent dans le dossier de '
      + 'l’application. <strong>Rien ne sort de l’établissement</strong> — '
      + 'aucun service distant, aucun hébergement tiers, aucun transfert. '
      + 'Les sauvegardes sont faites par l’établissement lui-même, sur ses '
      + 'propres supports. Le mode Démonstration, lui, n’utilise que des '
      + 'données fictives.</p>')

    + section('7. Vos droits',
      '<p>Vous disposez des droits d’<strong>accès</strong>, de '
      + '<strong>rectification</strong>, d’<strong>effacement</strong> (dans les '
      + 'limites des obligations légales de conservation), de '
      + '<strong>limitation</strong> et d’<strong>opposition</strong>.</p>'
      + '<ul>'
      + '<li><strong>Accès / portabilité</strong> : l’administrateur ou le '
      + 'référent peut éditer l’export des données vous concernant depuis la '
      + 'fiche du personnel (bouton « Exporter (RGPD) »).</li>'
      + '<li><strong>Rectification</strong> : correction de votre fiche depuis '
      + 'l’écran Personnel ; les écritures validées sont corrigées par '
      + 'contre-écriture.</li>'
      + '<li><strong>Effacement / limitation</strong> : désactivation du compte, '
      + 'puis MISE À L’ABRI CHIFFRÉE de l’identité une fois la durée annoncée '
      + 'échue (coffre des identités, ci-dessus) — pseudonymisation réversible, '
      + 'compatible avec les obligations légales de conservation du registre.</li>'
      + '</ul>'
      + '<p>Vous exercez ces droits auprès de <strong>' + responsable + '</strong> '
      + '(chef d’établissement ou délégué à la protection des données).</p>')

    + section('8. Cas particulier des élèves',
      '<ul>'
      + '<li>Les élèves n’utilisent que le <strong>mode formation</strong> : '
      + 'ils ne peuvent jamais produire de document d’apparence officielle, et '
      + 'toute écriture est validée par un enseignant.</li>'
      + '<li>Les données d’élèves sont <strong>minimales</strong> : nom, prénom, '
      + 'compte, et le cas échéant numéro d’attestation préparée en formation. '
      + 'Aucune note, aucune donnée de vie scolaire.</li>'
      + '<li>L’<strong>information des familles</strong> est recommandée '
      + '(règlement de l’atelier, carnet de liaison), conformément aux '
      + 'recommandations de la CNIL en milieu scolaire.</li>'
      + '</ul>')

    + '<p class="rgpd-pied">Pour toute question relative à vos données, '
    + 'adressez-vous au responsable de traitement (' + responsable + ') ou à son '
    + 'délégué à la protection des données.</p>'

    + '</div>';

  const boutonImprimer = conteneur.querySelector('#rgpd-imprimer');
  if (boutonImprimer) {
    boutonImprimer.addEventListener('click', function () { window.print(); });
  }

  // Lot E2 : gestes du coffre (rafraîchir = re-rendre la vue entière).
  if (etatCoffre && conteneur.querySelector('#section-coffre')) {
    brancherCoffre(conteneur, ctx, etatCoffre,
      function () { render(conteneur, ctx); });
  }
}

/** Bloc de section titré (contenu déjà en HTML sûr / échappé). */
function section(titreSection, contenuHtml) {
  return '<section class="rgpd-section">'
    + '<h3 class="rgpd-titre">' + esc(titreSection) + '</h3>'
    + contenuHtml
    + '</section>';
}

/** Tableau à deux colonnes (style partagé `.tableau`) ; cellules échappées. */
function tableauDeux(entetes, lignes) {
  return '<div class="tableau-defilement"><table class="tableau"><thead><tr>'
    + entetes.map(function (e) { return '<th>' + esc(e) + '</th>'; }).join('')
    + '</tr></thead><tbody>'
    + lignes.map(function (ligne) {
      return '<tr>'
        + ligne.map(function (cellule) {
          return '<td>' + esc(cellule) + '</td>';
        }).join('')
        + '</tr>';
    }).join('')
    + '</tbody></table></div>';
}
