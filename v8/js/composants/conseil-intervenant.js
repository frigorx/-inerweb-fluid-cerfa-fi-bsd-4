// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — CONSEIL D'INTERVENANT (chantier B2, briques 3-4)
//
// « La PREMIÈRE chose avant toute intervention = identifier le
// technicien » (Franck, 14/07). Ce composant relie le MOTEUR pur
// verifierDroitIntervention (v8/js/data/habilitations.js) aux écrans :
// fiche machine (synthèse « qui intervient ? ») et étape 1 du wizard
// (verdict pour l'opération choisie). CONSEIL, jamais blocage.
//
// Fonctions PURES (chaînes en entrée/sortie, zéro accès DOM au
// chargement) : testables sous Node (test-conseil-intervenant.mjs).
// Seule injecterStylesConseil() touche le document, à l'usage.
// ============================================================

import { esc } from '../core/utils.js';
import { ICONES } from '../core/icones.js';
import { verifierDroitIntervention, familleDuFluide, jetonsMentionsActives }
  from '../data/habilitations.js';
import { hermetiqueOpposable } from '../data/equipement.js';

/** Vrai si la ligne est en cours de validité à la date donnée (AAAA-MM-JJ).
 * Sans date de référence ou sans échéance : toujours valide (le moteur reste
 * sans horloge — la date vient de l'APPELANT, jamais d'ici). */
export function estEnCoursDeValidite(ligne, dateReference) {
  return !dateReference || !ligne.dateFin || ligne.dateFin >= dateReference;
}

/** Habilitations ACTIVES (et non échues) d'une personne (getHabilitations). */
export function habilitationsActivesDe(personneId, habilitations, dateReference = null) {
  return (Array.isArray(habilitations) ? habilitations : [])
    .filter((h) => h && h.actif && h.personneId === personneId
      && estEnCoursDeValidite(h, dateReference));
}

/** Jetons de mention ACTIFS (et non échus) d'une personne (getMentions). */
export function mentionsActivesDe(personneId, mentions, dateReference = null) {
  return jetonsMentionsActives((Array.isArray(mentions) ? mentions : [])
    .filter((m) => m && m.personneId === personneId
      && estEnCoursDeValidite(m, dateReference)));
}

/**
 * Verdict de conseil pour un intervenant. Sans machine : synthèse générale
 * de compétence (mode « identifier le technicien »). Avec machine : verdict
 * sur SON fluide et SA charge nominale — la charge de l'installation, celle
 * des seuils réglementaires ; la synthèse comme le verdict d'opération en
 * tiennent compte (cas Pierre « cette installation en contient 10 kg »).
 * `operation` = type de mouvement du registre ou null (synthèse).
 * `dateReference` (AAAA-MM-JJ) écarte les habilitations/mentions échues.
 *
 * @returns {{autorise:boolean, gravite:'OK'|'CONSEIL'|'REFUS', motif:string, conseil:string}}
 */
export function verdictPourIntervenant({
  personne, habilitations, mentions, machine = null, operation = null,
  dateReference = null
}) {
  const nominale = machine ? machine.chargeNominaleKg : null;
  return verifierDroitIntervention({
    habilitations: habilitationsActivesDe(personne.id, habilitations, dateReference),
    mentions: mentionsActivesDe(personne.id, mentions, dateReference),
    operation,
    fluide: machine ? machine.fluide : null,
    familleFluide: machine ? familleDuFluide(machine.fluide) : null,
    // Garde stricte : la colonne SQL est nullable — un null deviendrait 0
    // via Number() et fabriquerait un faux refus (constat de revue).
    chargeKg: typeof nominale === 'number' && Number.isFinite(nominale)
      && nominale > 0 ? nominale : null,
    // Depuis P1-1, la machine PORTE le caractère hermétique : même vérité que
    // les deux cadreFicheOfficiel (scellé ET étiqueté — hermetiqueOpposable).
    // L'ancien défaut `false` en dur faisait diverger conseil et Officiel
    // sur la même machine (L1a, 24/07/2026).
    hermetiqueScelle: hermetiqueOpposable(machine)
  });
}

/** Date du jour locale AAAA-MM-JJ (pour dateReference — même convention
 * que les stores : jamais toISOString, le fuseau ferait glisser le jour). */
export function dateDuJour() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-`
    + String(d.getDate()).padStart(2, '0');
}

/**
 * Encart HTML du conseil (chaîne échappée, zéro emoji) :
 * OK → encart vert (succès), CONSEIL → bandeau ambre, REFUS → bandeau
 * rouge. Toujours le nom de la personne + la phrase du moteur.
 */
export function encartConseil(personne, verdict) {
  const nom = esc(personne.prenom + ' ' + personne.nom);
  const texte = esc(verdict.conseil || verdict.motif);
  if (verdict.gravite === 'OK') {
    return '<div class="conseil-intervenant conseil-intervenant-ok">'
      + ICONES.coche
      + '<span><strong>' + nom + '</strong> — ' + texte + '</span></div>';
  }
  const classe = verdict.gravite === 'REFUS'
    ? 'bandeau-erreur' : 'bandeau-avertissement';
  return '<div class="conseil-intervenant ' + classe + '">' + ICONES.alerte
    + '<span><strong>' + nom + '</strong> — ' + texte + '</span></div>';
}

/** Styles propres au composant (le vert « succès » n'existe pas en bandeau). */
const STYLES_CONSEIL =
  '.conseil-intervenant { display:flex; align-items:flex-start; gap:10px;'
  + ' padding:11px 14px; border-radius:var(--rayon-bouton); font-size:13px;'
  + ' line-height:1.45; }'
  + '.conseil-intervenant-ok { background:var(--succes-fond);'
  + ' color:var(--succes); }'
  + '.conseil-intervenant svg { width:16px; height:16px; flex-shrink:0;'
  + ' margin-top:1px; }';

/** Injecte les styles une seule fois (garde par id, patron EXACT du wizard). */
export function injecterStylesConseil() {
  if (document.getElementById('styles-conseil-intervenant')) return;
  const style = document.createElement('style');
  style.id = 'styles-conseil-intervenant';
  style.textContent = STYLES_CONSEIL;
  document.head.appendChild(style);
}
