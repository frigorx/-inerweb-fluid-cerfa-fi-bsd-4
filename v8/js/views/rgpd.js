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

import { enteteVue, ICONES } from './communs.js';
import { esc } from '../core/utils.js';

export const titre = 'Protection des données';

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

  conteneur.innerHTML =
    enteteVue({
      titre: 'Protection des données personnelles',
      sousTitre: 'Information des personnes concernées (RGPD, articles 13 et 14)',
      actionsHtml:
        '<button type="button" id="rgpd-imprimer" class="btn btn-secondaire">'
        + ICONES.imprimer + '<span>Imprimer</span></button>'
    })
    + '<div class="rgpd-notice">'

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
            'Identifiants de connexion (mot de passe chiffré, jamais en clair), '
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
          ['Données du mode formation (élèves)',
            'Année scolaire en cours et l’année suivante au plus, puis '
            + 'suppression (aucune obligation réglementaire).']
        ])
      + '<p class="encart-aide rgpd-note">Les écritures validées du registre officiel ne sont '
      + 'ni modifiables ni effaçables (corrections par contre-écriture '
      + 'uniquement) : c’est une exigence d’intégrité du registre réglementaire, '
      + 'compatible avec le RGPD au titre de l’obligation légale.</p>')

    + section('6. Où sont stockées vos données',
      '<p>Selon le mode d’utilisation : <strong>sur le poste de '
      + 'l’établissement</strong> (base locale et documents dans le dossier de '
      + 'l’application) — rien ne sort de l’établissement — ou, en mode Cloud, '
      + 'dans un hébergement situé dans <strong>l’Union européenne</strong> '
      + '(aucun transfert hors UE). Le mode Démonstration n’utilise que des '
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
      + 'puis suppression une fois les durées légales échues.</li>'
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
