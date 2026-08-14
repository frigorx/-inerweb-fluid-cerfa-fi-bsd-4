// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// BORNE DE SCELLEMENT — « ce poste a déjà scellé des écritures »
// (lot L2, posée le 25/07, DÉPLACÉE hors de la base après revue).
//
// À QUOI ELLE SERT. L'import sait reprendre un historique antérieur au
// scellement : quand aucune écriture ne porte d'empreinte, le logiciel
// amorce la chaîne. Ce comportement est légitime (migration d'un ancien
// registre) mais son critère est aux mains de qui fabrique le fichier :
// retirer toutes les empreintes d'un export suffisait à faire re-sceller
// des données falsifiées. La borne dit « non, ce poste a déjà scellé,
// personne ne lui refait son passé ».
//
// POURQUOI ELLE NE VIT PAS DANS LA BASE. Première version : une clé de la
// table `parametres`. La revue adversariale l'a mise en défaut en la
// TIRANT : la restauration d'archive REMPLACE le fichier de base — donc la
// borne avec —, et le blanchiment redevenait possible juste après. Une
// protection contre l'écrasement du registre ne peut pas vivre DANS le
// registre. Elle est donc tenue dans un fichier VOISIN de la base, que ni
// l'import ni la restauration ne touchent.
//
// CE QU'ELLE NE PRÉTEND PAS FAIRE. Elle ne résiste pas à qui a la main sur
// le disque : supprimer ce fichier est aussi facile que supprimer la base.
// Ce n'est pas son sujet — celui qui a le disque est traité par la chaîne
// d'empreintes, les déclencheurs WORM et le témoin de scellement externe.
// La borne ferme le canal IMPORT/RESTAURATION, celui qui passe par
// l'interface et ne laisse, lui, aucune trace visible.
//
// Elle ne DESCEND JAMAIS : on ne retient que le maximum jamais atteint.
// ============================================================

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const NOM_FICHIER = 'borne-scellement.json';

/** Chemin du fichier de borne, à côté de la base ouverte. */
function cheminBorne(cheminBase) {
  if (!cheminBase) return null;
  return path.join(path.dirname(cheminBase), NOM_FICHIER);
}

/**
 * Le plus grand rang de validation jamais scellé sur CE poste (0 si le
 * poste n'a jamais rien scellé, ou si le fichier est illisible — un
 * fichier abîmé ne doit pas bloquer le logiciel, il fait juste retomber
 * sur la garde de second rideau, l'état courant du registre).
 */
function lire(cheminBase) {
  const chemin = cheminBorne(cheminBase);
  if (!chemin) return 0;
  try {
    const brut = JSON.parse(fs.readFileSync(chemin, 'utf8'));
    const valeur = Number(brut?.registreScelleesMax);
    return Number.isFinite(valeur) && valeur > 0 ? valeur : 0;
  } catch {
    return 0;
  }
}

/**
 * Note un rang scellé. Best-effort ABSOLU : si l'écriture échoue (dossier
 * en lecture seule, disque plein), la validation d'une écriture ne doit
 * PAS échouer pour autant — le registre prime sur sa propre protection.
 * @returns {boolean} vrai si la borne a bien été écrite
 */
function noter(cheminBase, rang) {
  const chemin = cheminBorne(cheminBase);
  if (!chemin) return false;
  const valeur = Number(rang);
  if (!Number.isFinite(valeur) || valeur <= 0) return false;
  try {
    const actuel = lire(cheminBase);
    if (valeur <= actuel) return true; // jamais de retour en arrière
    fs.mkdirSync(path.dirname(chemin), { recursive: true });
    fs.writeFileSync(chemin, JSON.stringify({
      registreScelleesMax: valeur,
      note: 'Ce poste a scellé des écritures. Ce fichier empêche qu’un '
        + 'import « sans empreintes » ne refasse son passé. Il ne descend '
        + 'jamais et n’est ni exporté ni restauré.'
    }, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

module.exports = { lire, noter, cheminBorne, NOM_FICHIER };
