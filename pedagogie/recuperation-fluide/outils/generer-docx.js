/* Génère les deux documents Word imprimables du module « Récupération de fluide ».
 *
 *   TP-recuperation-MINIMAX-E.docx   sujet élève + corrigé enseignant (page séparée)
 *   FICHE-SEANCE-recuperation.docx   fiche de séance enseignant
 *
 * Charte inerWeb Édu : A4 portrait, marges 2 cm, Calibri 14 pt, interligne 1,5,
 * titres Trebuchet MS bold, bleu #1b3a63 et orange #ff6b35, fond clair.
 *
 * Usage :  node outils/generer-docx.js
 * Requiert : npm i docx   ·  outils/schema-raccordement.png
 *
 * Les .docx produits sont GÉNÉRÉS : ne pas les éditer à la main, la
 * modification serait perdue à la génération suivante. Le contenu de référence
 * est TP-RECUPERATION.md et FICHE-SEANCE.md.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, PageBreak,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  AlignmentType, Header, Footer, PageNumber, VerticalAlign
} = require('docx');

/* ------------------------------------------------------------- constantes */

const BLEU = '1B3A63';
const ORANGE = 'FF6B35';
const GRIS = '5A6472';
const VERT = '16A34A';
const BORDURE = 'B9C2CC';

const CORPS = 'Calibri';
const TITRE = 'Trebuchet MS';

const LARGEUR = 9638;          // A4 (11906) − 2 × marge 2 cm (1134)
const INTERLIGNE = { line: 360 }; // 1,5

const RACINE = path.join(__dirname, '..');

/* ------------------------------------------------------------- fabriques */

function p(texte, o = {}) {
  const morceaux = Array.isArray(texte) ? texte : [texte];
  return new Paragraph({
    alignment: o.centre ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: Object.assign({}, INTERLIGNE, { after: o.apres === undefined ? 80 : o.apres }),
    indent: o.retrait ? { left: 340 } : undefined,
    children: morceaux.map(function (m) {
      if (typeof m !== 'string') return m;
      return new TextRun({
        text: m, font: CORPS, size: o.taille || 28,
        color: o.couleur || BLEU, bold: !!o.gras, italics: !!o.italique
      });
    })
  });
}

function gras(t, couleur) {
  return new TextRun({ text: t, font: CORPS, size: 28, bold: true, color: couleur || BLEU });
}
function normal(t, couleur) {
  return new TextRun({ text: t, font: CORPS, size: 28, color: couleur || BLEU });
}

function h1(texte) {
  return new Paragraph({
    spacing: { before: 120, after: 160, line: 300 },
    children: [new TextRun({ text: texte, font: TITRE, size: 38, bold: true, color: BLEU })]
  });
}

/* Bandeau de section : titre blanc sur fond bleu, pleine largeur. */
function h2(texte, fond) {
  return new Table({
    columnWidths: [LARGEUR],
    width: { size: LARGEUR, type: WidthType.DXA },
    borders: contour('FFFFFF', BorderStyle.NONE),
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: LARGEUR, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: fond || BLEU },
        margins: { top: 90, bottom: 90, left: 160, right: 160 },
        children: [new Paragraph({
          spacing: { line: 260 },
          children: [new TextRun({ text: texte, font: TITRE, size: 30, bold: true, color: 'FFFFFF' })]
        })]
      })]
    })]
  });
}

function h3(texte) {
  return new Paragraph({
    spacing: { before: 160, after: 80, line: 280 },
    children: [new TextRun({ text: texte, font: TITRE, size: 26, bold: true, color: BLEU })]
  });
}

function contour(couleur, style) {
  const b = { style: style || BorderStyle.SINGLE, size: 6, color: couleur };
  return { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b };
}

/* Encadré pleine largeur : barre de couleur à gauche, fond pâle. */
function encadre(paragraphes, o = {}) {
  const barre = o.barre || BLEU;
  return new Table({
    columnWidths: [LARGEUR],
    width: { size: LARGEUR, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.SINGLE, size: 24, color: barre },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    },
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: LARGEUR, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: o.fond || 'EEF4F9' },
        margins: { top: 110, bottom: 110, left: 200, right: 160 },
        children: paragraphes
      })]
    })]
  });
}

/* Encadré « notion » : cadre orange complet, texte centré. */
function encadreNotion(lignes) {
  return new Table({
    columnWidths: [LARGEUR],
    width: { size: LARGEUR, type: WidthType.DXA },
    borders: contour(ORANGE),
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: LARGEUR, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: 'FFF8F5' },
        margins: { top: 160, bottom: 160, left: 200, right: 200 },
        children: lignes.map(function (l) {
          return new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: 300 },
            children: [new TextRun({ text: l, font: TITRE, size: 26, bold: true, color: BLEU })]
          });
        })
      })]
    })]
  });
}

/* Ligne de réponse pointillée. */
function ligne(n) {
  const sortie = [];
  for (let i = 0; i < (n || 1); i += 1) {
    sortie.push(new Paragraph({
      spacing: { before: 140, after: 60 },
      border: { bottom: { style: BorderStyle.DOTTED, size: 6, color: BLEU } },
      children: [new TextRun({ text: '', font: CORPS, size: 28 })]
    }));
  }
  return sortie;
}

/* Bloc de calcul à trous, en chasse fixe. */
function calcul(lignes) {
  return new Table({
    columnWidths: [LARGEUR],
    width: { size: LARGEUR, type: WidthType.DXA },
    borders: contour(BORDURE),
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: LARGEUR, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: 'F7F9FB' },
        margins: { top: 110, bottom: 110, left: 160, right: 160 },
        children: lignes.map(function (l) {
          return new Paragraph({
            spacing: { line: 280 },
            children: [new TextRun({ text: l, font: 'Consolas', size: 22, color: BLEU })]
          });
        })
      })]
    })]
  });
}

/* Tableau générique. `entetes` peut être null (tableau sans ligne d'en-tête). */
function tableau(entetes, lignes, largeurs, o = {}) {
  const total = largeurs.reduce(function (a, b) { return a + b; }, 0);
  const colonnes = largeurs.map(function (l) { return Math.round(l / total * LARGEUR); });
  /* corrige l'arrondi pour que la somme fasse exactement la largeur utile */
  colonnes[colonnes.length - 1] += LARGEUR - colonnes.reduce(function (a, b) { return a + b; }, 0);

  function cellule(contenu, i, entete) {
    const vide = contenu === '';
    return new TableCell({
      width: { size: colonnes[i], type: WidthType.DXA },
      shading: entete ? { type: ShadingType.CLEAR, fill: 'EEF4F9' } : undefined,
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 70, bottom: 70, left: 120, right: 120 },
      children: [new Paragraph({
        spacing: { line: 260 },
        children: [new TextRun({
          text: vide ? '' : contenu,
          font: entete ? TITRE : CORPS,
          size: entete ? 22 : (o.taille || 24),
          bold: !!entete,
          color: BLEU
        })]
      })]
    });
  }

  const rows = [];
  if (entetes) {
    rows.push(new TableRow({
      tableHeader: true,      // l'en-tête se répète en haut de chaque page
      cantSplit: true,
      children: entetes.map(function (t, i) { return cellule(t, i, true); })
    }));
  }
  lignes.forEach(function (l) {
    rows.push(new TableRow({
      cantSplit: true,        // une ligne ne se coupe jamais en travers d'un saut de page
      height: o.hauteur ? { value: o.hauteur, rule: 'atLeast' } : undefined,
      children: l.map(function (t, i) { return cellule(t, i, false); })
    }));
  });

  return new Table({
    columnWidths: colonnes,
    width: { size: LARGEUR, type: WidthType.DXA },
    borders: contour(BORDURE),
    rows: rows
  });
}

function espace(apres) {
  return new Paragraph({ spacing: { after: apres || 120 }, children: [new TextRun({ text: '', size: 12 })] });
}

function sautDePage() {
  return new Paragraph({ children: [new PageBreak()] });
}

/* ------------------------------------------------------ en-tête / pied de page */

function entete(sousTitre) {
  return new Header({
    children: [
      new Paragraph({
        spacing: { after: 60 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: BLEU } },
        children: [
          new TextRun({ text: '❄ ', font: CORPS, size: 26, color: BLEU }),
          new TextRun({ text: 'inerWeb ', font: TITRE, size: 26, bold: true, color: BLEU }),
          new TextRun({ text: ' Édu ', font: TITRE, size: 22, bold: true, color: 'FFFFFF', shading: { type: ShadingType.CLEAR, fill: ORANGE } }),
          new TextRun({ text: '   ' + sousTitre, font: CORPS, size: 20, color: GRIS }),
          new TextRun({ text: '\tpar F. Henninot', font: CORPS, size: 20, color: GRIS })
        ]
      })
    ]
  });
}

function pied() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60 },
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: BORDURE } },
        children: [
          new TextRun({ text: 'LP Privé Jacques Raynaud — Campus ÉQUATIO   ·   page ', font: CORPS, size: 18, color: GRIS }),
          new TextRun({ children: [PageNumber.CURRENT], font: CORPS, size: 18, color: GRIS }),
          new TextRun({ text: ' / ', font: CORPS, size: 18, color: GRIS }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: CORPS, size: 18, color: GRIS })
        ]
      })
    ]
  });
}

function pageA4(sousTitre, enfants) {
  return {
    properties: {
      page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } }
    },
    headers: { default: entete(sousTitre) },
    footers: { default: pied() },
    children: enfants
  };
}

/* ============================================================ DOCUMENT 1 — TP */

function documentTP() {
  const image = fs.readFileSync(path.join(__dirname, 'schema-raccordement.png'));
  const c = [];

  c.push(h1('TP — Récupérer un fluide et le prouver'));
  c.push(p([normal('Station de récupération MINIMAX-E · rotation sur 3 postes · passerelle registre')],
    { couleur: GRIS, taille: 22 }));

  c.push(tableau(null, [
    ['NOM : ........................', 'Prénom : ....................', 'Classe : ................'],
    ['Poste :   A   ·   B   ·   C', 'Date : ...... / ...... / ........', 'Trinôme : ...............']
  ], [37, 35, 28], { hauteur: 520 }));
  c.push(espace());

  c.push(encadre([
    p([gras('4 heures. Trinôme. Rotation sur 3 postes. '),
      normal('La notice de la station est posée sur ton poste : '),
      gras('elle est autorisée, elle est même obligatoire.')], { taille: 24, apres: 60 }),
    p([normal('Rôles à tenir, à changer à chaque rotation : '), gras('opérateur'), normal(' · '),
      gras('sécurité / notice'), normal(' · '), gras('scribe'), normal('. Seul le rôle « sécurité / notice » a le droit de dire '),
      gras('STOP'), normal('. Il l\'exerce sans demander l\'avis de personne.')], { taille: 24, apres: 0 })
  ]));
  c.push(espace());

  c.push(encadreNotion([
    'Récupérer, ce n\'est pas « vider une machine ».',
    'C\'est déplacer une masse de fluide — et prouver au gramme près où elle est passée.'
  ]));
  c.push(espace());

  /* --- 1 sécurité */
  c.push(h2('1 · Sécurité — à lire avant de toucher quoi que ce soit'));
  c.push(espace(80));
  [
    ['Froid.', 'Le fluide qui se détend à l\'air libre brûle la peau et l\'œil. Lunettes et gants pendant toute la manipulation, y compris pour dévisser un flexible que tu crois vide.'],
    ['Pression.', 'La station est protégée par un pressostat haute pression à réarmement manuel taré à 38,5 bar. S\'il coupe pendant un remplissage, c\'est un signal de danger : la bouteille est probablement trop pleine. On arrête, on cherche la cause. On ne réarme jamais « pour voir ».'],
    ['Remplissage.', 'Une bouteille remplie à 100 % de liquide n\'a plus de volume d\'expansion : elle peut éclater si la température monte. Maximum 80 % en liquide. La balance n\'est pas un accessoire, c\'est l\'instrument de sécurité de l\'opération.'],
    ['Fluide et machine.', 'Avant tout raccordement : lis la plaque et la notice de TA station et vérifie que ton fluide y figure. Aucun R32, R454B, R1234yf ou R290 sur ce poste sans validation écrite de l\'enseignant.'],
    ['Incident.', 'Projection dans l\'œil → lave-œil 15 min, alerte enseignant, appel du 15. Fuite importante → arrêt, évacuation, ventilation. Trousse de secours : mur nord.']
  ].forEach(function (bloc) {
    c.push(encadre([p([gras(bloc[0] + ' '), normal(bloc[1])], { taille: 24, apres: 0 })],
      { barre: ORANGE, fond: 'FFF1EB' }));
    c.push(espace(60));
  });

  /* --- 2 observation */
  c.push(h2('2 · Observation — avant de brancher'));
  c.push(espace(80));
  c.push(p([gras('Sans ouvrir la notice'), normal(', écris ta phrase :')]));
  c.push(p('« Pour moi, récupérer un fluide, c\'est …'));
  ligne(2).forEach(function (l) { c.push(l); });
  c.push(espace());
  c.push(p([gras('Maintenant ouvre la notice'), normal(' et trouve ces quatre informations.')]));
  c.push(tableau(['À trouver', 'Page / partie', 'Ce que j\'ai relevé'], [
    ['La liste des fluides admis par la machine', '', ''],
    ['Le tarage du pressostat haute pression', '', ''],
    ['Le taux de remplissage maximal d\'une bouteille', '', ''],
    ['Ce qu\'il faut faire AVANT de basculer l\'inverseur noir', '', '']
  ], [46, 22, 32], { hauteur: 560 }));

  /* --- 3 schéma */
  c.push(sautDePage());
  c.push(h2('3 · Schéma de raccordement'));
  c.push(espace(80));
  c.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new ImageRun({ data: image, type: 'png', transformation: { width: 600, height: 250 } })]
  }));
  c.push(p([gras('E'), normal(' = vanne d\'entrée bleue · '), gras('I'), normal(' = inverseur noir (RÉCUPÉRATION / VIDANGE) · '),
    gras('S'), normal(' = vanne de sortie rouge. Schéma de principe : reporte-toi à la notice de ta station pour le raccordement exact.')],
    { taille: 22, couleur: GRIS }));
  c.push(espace());

  /* --- 4 relevés */
  c.push(h2('4 · Feuille de relevés'));
  c.push(h3('4.1 — Identification'));
  c.push(tableau(null, [
    ['Fluide de l\'installation', '', 'Classe NF EN 378', ''],
    ['Charge nominale de plaque (kg)', '', 'N° de bouteille', ''],
    ['Filtre d\'entrée repéré au fluide ?', '', 'Température ambiante (°C)', '']
  ], [30, 20, 28, 22], { hauteur: 460 }));

  c.push(h3('4.2 — Pesées'));
  c.push(tableau(['Mesure', 'Valeur (kg)'], [
    ['Tare de la bouteille (étiquette)', ''],
    ['Masse brute AVANT opération', ''],
    ['Masse nette AVANT = brute avant − tare', ''],
    ['Masse brute APRÈS opération', ''],
    ['Masse nette APRÈS = brute après − tare', ''],
    ['Quantité récupérée = nette après − nette avant', '']
  ], [66, 34], { hauteur: 440 }));

  c.push(h3('4.3 — Suivi en cours de récupération (un point toutes les 2 min)'));
  const suivi = [];
  for (let i = 0; i < 6; i += 1) suivi.push(['', '', '', '', '']);
  c.push(tableau(['Heure', 'BP (bar)', 'HP (bar)', 'Masse brute (kg)', 'Bruit du compresseur'], suivi, [14, 15, 15, 22, 34], { hauteur: 420 }));

  c.push(h3('4.4 — Vidange de la station : coche dans l\'ordre où tu l\'as fait'));
  [
    'Fermer les vannes de l\'installation',
    'Fermer la vanne d\'entrée bleue (CLOSED)',
    'Arrêter la machine',
    'Basculer l\'inverseur noir sur VIDANGE',
    'Redémarrer, descendre au vide voulu',
    'Fermer les vannes de la bouteille, arrêter, fermer la vanne rouge',
    'Remettre l\'inverseur sur RÉCUPÉRATION, déposer les flexibles, bouchons neufs'
  ].forEach(function (t) { c.push(p('☐   ' + t, { retrait: true, apres: 40 })); });

  /* --- 5 questions */
  c.push(sautDePage());
  c.push(h2('5 · Questions'));
  c.push(espace(80));

  function question(num, contenu, nbLignes) {
    c.push(p([new TextRun({ text: num + '  ', font: TITRE, size: 28, bold: true, color: ORANGE })].concat(contenu),
      { apres: 20 }));
    ligne(nbLignes).forEach(function (l) { c.push(l); });
    c.push(espace(60));
  }

  question('Q1.', [normal('Quels fluides la notice de '), gras('ta'), normal(' station admet-elle ? Recopie la liste.')], 3);
  question('Q2.', [normal('Peut-on récupérer du R32 avec cette station ? Justifie avec la classe de sécurité du R32 '), gras('et'), normal(' avec ce qu\'écrit la notice.')], 3);
  question('Q3.', [normal('Pourquoi retire-t-on les obus Schrader, et pourquoi un flexible court et gros à l\'aspiration ?')], 2);
  question('Q4.', [normal('Pourquoi un filtre à l\'entrée de la station — et pourquoi '), gras('un filtre par fluide'), normal(' ?')], 2);
  question('Q5.', [normal('Qu\'as-tu entendu quand la vanne bleue était trop ouverte ? Qu\'est-ce que cela signifie physiquement ? Qu\'as-tu fait ?')], 3);
  question('Q6.', [normal('Quel niveau de vide faut-il atteindre ? '), gras('Cite ta source'), normal(' (document, page). Une valeur sans source ne compte pas.')], 2);
  question('Q7.', [normal('Pourquoi faut-il arrêter la machine '), gras('avant'), normal(' de basculer l\'inverseur noir sur VIDANGE ?')], 2);
  question('Q8.', [normal('La pression lue dans la bouteille au repos est-elle cohérente avec la table pression / température à la température ambiante ? Que conclus-tu ? Que fais-tu ?')], 3);

  c.push(p([new TextRun({ text: 'Q9.  ', font: TITRE, size: 28, bold: true, color: ORANGE }),
    normal('Quelle masse de fluide as-tu récupérée ? Pose le calcul.')], { apres: 60 }));
  c.push(calcul([
    'Masse nette AVANT  = ............ − ............ = ............ kg',
    'Masse nette APRÈS  = ............ − ............ = ............ kg',
    'Quantité récupérée = ............ − ............ = ............ kg'
  ]));
  c.push(espace());

  c.push(p([new TextRun({ text: 'Q10.  ', font: TITRE, size: 28, bold: true, color: ORANGE }),
    normal('Quel est le taux de remplissage de la bouteille ? Est-il acceptable ?')], { apres: 20 }));
  c.push(p('Donnée : masse volumique du liquide R134a à 25 °C ≈ 1 206 kg/m³ (à confirmer sur la fiche de données de sécurité du fournisseur).',
    { taille: 22, couleur: GRIS }));
  c.push(calcul([
    'Volume utile à 80 %   = 12 L × 0,80        = ............ L',
    'Masse maximale admise = ............ × 1,206  = ............ kg',
    'Taux de remplissage   = ............ / ............ = ............ %'
  ]));
  ligne(1).forEach(function (l) { c.push(l); });
  c.push(espace());

  question('Q11.', [normal('Quelle case du cadre 4 du CERFA 15497*04 ce mouvement alimente-t-il ? Pourquoi '), gras('pas'), normal(' la case « Démantèlement » ?')], 2);
  question('Q12.', [normal('Écart entre la quantité récupérée et la charge de plaque : combien, et pourquoi ? Donne '), gras('deux'), normal(' explications.')], 3);

  /* --- 6 synthèse */
  c.push(h2('6 · Synthèse — 5 à 10 lignes'));
  c.push(espace(80));
  c.push(encadre([p([gras('Si l\'enseignant te demandait demain de prouver où sont passés les kilos récupérés aujourd\'hui, que montrerais-tu ?')],
    { taille: 24, apres: 0 })]));
  ligne(8).forEach(function (l) { c.push(l); });
  c.push(espace());

  /* --- 7 auto-positionnement */
  c.push(h2('7 · Auto-positionnement — je coche avant la correction'));
  c.push(espace(80));
  c.push(tableau(['Ce que je sais faire', 'Acquis', 'En cours', 'Non acquis'], [
    ['J\'ai vérifié la compatibilité fluide / machine dans la notice avant de brancher', '', '', ''],
    ['J\'ai gardé mes EPI du début à la fin', '', '', ''],
    ['Je n\'ai laissé échapper aucun gramme de fluide à l\'atmosphère', '', '', ''],
    ['J\'ai respecté l\'ordre d\'ouverture des vannes', '', '', ''],
    ['J\'ai exécuté la vidange de la station dans l\'ordre imposé', '', '', ''],
    ['J\'ai calculé la quantité récupérée et le taux de remplissage', '', '', ''],
    ['J\'ai saisi le mouvement dans le registre, avec sa pièce jointe', '', '', ''],
    ['Je sais dire quelle case du CERFA est alimentée, et pourquoi', '', '', '']
  ], [58, 14, 14, 14], { hauteur: 420 }));

  /* ================================================== corrigé enseignant */
  c.push(sautDePage());
  c.push(h1('Corrigé enseignant'));
  c.push(encadre([
    p([gras('Ne pas distribuer. '), normal('Les valeurs numériques correspondent au jeu de données de référence (groupe froid positif R134a, charge de plaque 1,20 kg, bouteille 12 L, tare 12,000 kg). À ajuster au matériel réel.')],
      { taille: 24, apres: 0 })
  ], { barre: VERT, fond: 'F2FBF5' }));
  c.push(espace());
  c.push(encadreNotion([
    'Le critère central de correction :',
    'l\'élève sait-il dire combien, et où c\'est écrit ?'
  ]));
  c.push(espace());

  c.push(h2('Réponses attendues', VERT));
  c.push(espace(80));

  function reponse(num, blocs) {
    c.push(p([new TextRun({ text: num + '  ', font: TITRE, size: 28, bold: true, color: VERT })].concat(blocs),
      { taille: 24, apres: 140 }));
  }

  reponse('Q1.', [normal('Liste recopiée de la notice posée sur le poste. La notice en atelier (rév. 2008) ne liste que des fluides '),
    gras('A1'), normal(' : R11, R12, R22, R13B1, R123, R134a, R141b, R401A/B, R402A/B, R404A, R407A/B/C, R408A, R409A, R410A, R500, R502, R503, R507. Recopie partielle acceptée si l\'emplacement est cité.')]);
  reponse('Q2.', [normal('Non. Le R32 est '), gras('A2L'), normal(' (faiblement inflammable), la notice interdit les gaz inflammables et le R32 n\'est pas dans la liste. Vigilance : des versions récentes de cette machine sont annoncées A1/A2/A2L. La bonne réponse n\'est donc pas « cette machine ne fait jamais d\'A2L » mais « la machine de ce poste, telle que sa notice la décrit, ne le fait pas ». Valoriser l\'élève qui va vérifier la plaque plutôt que celui qui récite.')]);
  reponse('Q3.', [normal('Obus Schrader et flexible long et fin = '), gras('perte de charge'), normal(' qui effondre le débit. Notice : 3/8" ou plus, le plus court possible (≈ 90 cm). Conséquence concrète : une récupération de quelques minutes peut passer à plusieurs heures.')]);
  reponse('Q4.', [normal('Le filtre protège le compresseur de la station des corps étrangers ; son absence annule la garantie. Un filtre '),
    gras('par fluide'), normal(', repéré, évite le mélange — un fluide mélangé n\'est plus identifiable ni exploitable. Compresseur grillé : deux filtres antiacide en série, puis rinçage et tirage au vide de la station.')]);
  reponse('Q5.', [normal('Bruit métallique / régime qui change = '), gras('entrée de liquide en excès'),
    normal(' (coup de liquide) ou pression en bouteille inférieure à la pression d\'entrée. Geste attendu : refermer lentement la vanne bleue jusqu\'au retour d\'un bruit normal. Ne jamais ouvrir à fond en phase liquide.')]);
  reponse('Q6.', [normal('Attendu : '), gras('une valeur citée avec sa source'),
    normal(' (notice et/ou texte réglementaire consulté en séance). Une réponse sans source est comptée « En cours », même si le chiffre est juste — c\'est l\'objet de la question. Le critère de terrain (descendre jusqu\'à stabilisation de la BP, vérifier au vacuomètre) est accepté en complément.')]);
  reponse('Q7.', [normal('Basculer l\'inverseur machine en marche met brutalement la HP en communication et provoque une '),
    gras('coupure du pressostat 38,5 bar'), normal('. Ordre imposé : vanne bleue fermée → arrêt → inverseur → redémarrage. « Pour ne pas casser la machine » = En cours ; réponse citant la sécurité HP = Acquis.')]);
  reponse('Q8.', [normal('Bouteille au repos 24 h → lecture de la pression → mesure de la température ambiante → comparaison à la table P/T. Si la pression lue est nettement supérieure à celle de la table : '),
    gras('incondensables'), normal('. Purge très lente par la vanne vapeur jusqu\'à la valeur de table majorée de 0,3 à 0,35 bar, repos 10 min, nouvelle mesure, répéter si besoin. Faire verbaliser : ce n\'est pas un dégazage de fluide, et cela ne sert jamais de prétexte à en faire un.')]);

  c.push(p([new TextRun({ text: 'Q9.', font: TITRE, size: 28, bold: true, color: VERT })], { apres: 60 }));
  c.push(calcul([
    'Tare bouteille ............................. 12,000 kg',
    'Masse brute AVANT .......................... 13,400 kg',
    'Masse nette AVANT ..... 13,400 − 12,000 =    1,400 kg',
    'Masse brute APRÈS .......................... 14,550 kg',
    'Masse nette APRÈS ..... 14,550 − 12,000 =    2,550 kg',
    'Quantité récupérée .... 2,550 − 1,400   =    1,150 kg'
  ]));
  c.push(espace(60));
  c.push(p('Erreur fréquente : oublier la masse nette avant et annoncer 2,55 kg. La traiter comme une erreur de registre, pas de calcul — c\'est exactement ce qui fausse une balance matière annuelle.',
    { taille: 24 }));
  c.push(espace());

  c.push(p([new TextRun({ text: 'Q10.', font: TITRE, size: 28, bold: true, color: VERT })], { apres: 60 }));
  c.push(calcul([
    'Volume utile à 80 % ... 12 L × 0,80      =  9,6 L',
    'Masse maximale admise . 9,6 × 1,206      ≈ 11,6 kg',
    'Taux de remplissage ... 2,550 / 11,6     ≈ 22 %'
  ]));
  c.push(espace(60));
  c.push(p([normal('Conclusion : très en dessous de la limite, la bouteille peut recevoir d\'autres récupérations de R134a. À faire ressortir : le taux se calcule sur la '),
    gras('masse admissible'), normal(', pas sur le volume. La limite des 80 % existe parce que le liquide se dilate : une bouteille remplie à 80 % à 16 °C est à 94 % à 66 °C ; remplie à 90 % à 16 °C, elle atteint '),
    gras('100 % dès 54 °C'), normal('.')], { taille: 24 }));
  c.push(espace());

  reponse('Q11.', [normal('Cadre 4, case '), gras('« Entretien / réparation (récupération) »'),
    normal(' — type interne RECUPERATION_MAINTENANCE dans inerWeb Fluide. Pas « Démantèlement » : l\'équipement reste en service et sera rechargé.')]);
  reponse('Q12.', [normal('Écart attendu : 1,200 − 1,150 = '), gras('0,050 kg (50 g)'),
    normal('. Au moins deux explications parmi : fluide dissous dans l\'huile ; fluide resté dans les flexibles et le manifold ; niveau de vide final non atteint ; charge réelle différente de la charge de plaque (appoints antérieurs non tracés). Non recevable : « la balance est fausse » — la réponse professionnelle est de vérifier sa date d\'étalonnage dans le registre de l\'outillage, ce que l\'application signale par une alerte bloquante quand elle est expirée.')]);
  reponse('Synthèse.', [normal('Attendu : la fiche de mouvement du registre, l\'étiquette de bouteille, la photo de pesée en pièce jointe, et le fait que l\'écriture est validée par l\'enseignant référent puis scellée par empreinte. L\'élève qui répond « la bouteille » a la moitié de la réponse : la bouteille prouve qu\'il y a du fluide, pas d\'où il vient.')]);

  c.push(h2('Grille de positionnement', VERT));
  c.push(espace(80));
  c.push(tableau(['Compétence', 'Indicateur observable', 'A', 'EC', 'NA'], [
    ['C4 Organiser et sécuriser', 'EPI portés du début à la fin, sans rappel', '', '', ''],
    ['C4 Organiser et sécuriser', 'Compatibilité fluide / machine vérifiée dans la notice avant raccordement', '', '', ''],
    ['C6 Réaliser de manière éco-responsable', 'Aucun rejet à l\'atmosphère, y compris à la dépose des flexibles', '', '', ''],
    ['C6 Réaliser de manière éco-responsable', 'Filtre d\'entrée présent et repéré au bon fluide', '', '', ''],
    ['C9 Maintenance préventive', 'Ordre d\'ouverture des vannes respecté, ouverture progressive', '', '', ''],
    ['C9 Maintenance préventive', 'Vidange exécutée dans l\'ordre imposé (vanne → arrêt → inverseur)', '', '', ''],
    ['C9 Maintenance préventive', 'Taux de remplissage calculé et comparé aux 80 %', '', '', ''],
    ['C11 Consigner', 'Mouvement saisi dans le registre, complet, avec pièce jointe', '', '', ''],
    ['C11 Consigner', 'Case CERFA correctement identifiée et justifiée', '', '', ''],
    ['C12 Communiquer', 'Écart quantité / charge de plaque annoncé et expliqué en synthèse', '', '', '']
  ], [26, 50, 8, 8, 8], { taille: 22, hauteur: 400 }));
  c.push(espace());

  c.push(encadre([p([gras('Éliminatoire de séance '),
    normal('(reprise obligatoire, sans note punitive) : rejet volontaire de fluide à l\'atmosphère · réarmement du pressostat HP sans recherche de cause · bouteille laissée sur la balance au-delà de 80 %.')],
    { taille: 24, apres: 0 })], { barre: ORANGE, fond: 'FFF1EB' }));
  c.push(espace());

  c.push(p('Source des données techniques : notice constructeur MINIMAX-E, Advanced Test Products Europe, rév. 3 (2008), diffusée par ERM Automatismes. Aucun passage du manuel n\'est reproduit.',
    { taille: 20, couleur: GRIS, italique: true }));

  return new Document({
    creator: 'inerWeb Édu — F. Henninot',
    title: 'TP — Récupérer un fluide et le prouver (MINIMAX-E)',
    description: 'TP de récupération de fluide frigorigène sur station MINIMAX-E, sujet élève et corrigé enseignant.',
    sections: [pageA4('TP Récupération MINIMAX-E', c)]
  });
}

/* ================================================ DOCUMENT 2 — FICHE DE SÉANCE */

function documentFiche() {
  const c = [];

  c.push(h1('Fiche de séance — Récupération de fluide sur MINIMAX-E'));
  c.push(p([gras('Document enseignant. '),
    normal('Déroulé minute par minute, préparation, incidents prévisibles, plan B.')], { taille: 24 }));
  c.push(espace(60));

  c.push(tableau(null, [
    ['Classe', 'BAC PRO MFER — 1re (adaptation CAP IFCA 2e année en fin de fiche)'],
    ['Durée', '4 h'],
    ['Effectif cible', '9 à 12 élèves — 3 trinômes ou 3 groupes de 4'],
    ['Salle', 'Plateau technique froid, 3 paillasses équipées'],
    ['Encadrement', '1 enseignant. Au-delà de 12 élèves, prévoir un second adulte.']
  ], [24, 76]));
  c.push(espace());

  c.push(h2('1 · Ce que la séance doit laisser'));
  c.push(espace(80));
  c.push(p('Une seule phrase, écrite au tableau dès la 20ᵉ minute et jamais effacée :'));
  c.push(encadreNotion([
    'Récupérer, c\'est déplacer une masse de fluide',
    '— et prouver au gramme près où elle est passée.'
  ]));
  c.push(espace(80));
  c.push(p('Si en fin de séance un élève sait faire tourner la station mais ne sait pas dire combien il a récupéré ni où c\'est écrit, la séance a manqué son objet.'));
  c.push(espace());

  c.push(h2('2 · Préparation — la veille (45 min)'));
  c.push(espace(80));
  [
    'Les 3 stations MINIMAX-E sont sous tension et démarrent. Tester le ventilateur et le bouton Démarrage à vide.',
    'Filtres d\'entrée : un par station, repéré au fluide. Sans filtre, on ne lance pas le poste.',
    'Notices papier : une par poste, posées à plat. Pas de notice = pas de séance.',
    'Bouteilles de récupération repérées, dans leur date d\'épreuve, tare relevée et notée sur l\'étiquette avant l\'arrivée des élèves.',
    'Balances : vérifier la date d\'étalonnage au registre de l\'outillage. Hors validité, la saisie en mode Formation est bloquée — c\'est voulu, mais il faut le savoir avant.',
    'Groupes froid positif chargés, charge de plaque relevée et notée.',
    'Une bouteille laissée au repos depuis 24 h pour l\'étude des incondensables (poste B). À préparer l\'avant-veille.',
    'Poste informatique : inerWeb Fluide ouvert, mode Formation, comptes élèves créés, enseignant identifié comme validateur.',
    'Impression du sujet × 1 par élève. Ne pas imprimer la page corrigé.',
    'Affiches A3 des consignes de poste (une consigne par poste, gros caractères).'
  ].forEach(function (t) { c.push(p('☐   ' + t, { retrait: true, taille: 24, apres: 60 })); });
  c.push(espace());

  c.push(h2('3 · Déroulé minute par minute'));
  c.push(espace(80));
  c.push(tableau(['Horaire', 'Durée', 'Phase', 'Ce que fait l\'enseignant', 'Ce que font les élèves'], [
    ['0:00', '10 min', 'Accueil, EPI', 'Vérifie lunettes / gants / chaussures. Refuse l\'entrée au poste sans EPI.', 'S\'équipent, s\'installent'],
    ['0:10', '20 min', 'Observation', 'Distribue les notices, ne répond à aucune question technique', 'Écrivent leur phrase, cherchent les 4 informations'],
    ['0:30', '10 min', 'Mise en commun', 'Écrit la phrase-notion au tableau, corrige les 4 informations', 'Notent'],
    ['0:40', '10 min', 'Lancement', 'Distribue les rôles (opérateur / sécurité-notice / scribe)', 'Rejoignent leur poste'],
    ['0:50', '50 min', 'Rotation 1', 'Circule. Priorité au poste A, le plus risqué.', 'Postes A · B · C'],
    ['1:40', '15 min', 'Pause', 'Postes laissés en sécurité, vannes fermées', ''],
    ['1:55', '50 min', 'Rotation 2', 'Change les rôles dans chaque trinôme', 'Postes B · C · A'],
    ['2:45', '50 min', 'Rotation 3', 'Prépare la synthèse', 'Postes C · A · B'],
    ['3:35', '30 min', 'Synthèse', '3 min par trinôme, puis les trois chiffres de la séance', 'Présentent, comparent leurs écarts'],
    ['4:05', '10 min', 'Rangement', 'Contrôle vannes fermées, stations vidées, bouchons remis', 'Rangent, rendent le dossier']
  ], [13, 12, 17, 31, 27], { taille: 20, hauteur: 380 }));
  c.push(espace(80));
  c.push(encadre([p([normal('Le rangement n\'est pas du temps mort : la station '), gras('doit être vidée de son fluide résiduel'),
    normal(' après usage, et les bouchons de vanne doivent être remis neufs. C\'est un critère de la grille (C6).')],
    { taille: 24, apres: 0 })]));
  c.push(espace());

  c.push(h2('4 · Rotation — tableau à afficher'));
  c.push(espace(80));
  c.push(tableau(['', 'Rotation 1', 'Rotation 2', 'Rotation 3'], [
    ['Trinôme 1', 'Poste A', 'Poste B', 'Poste C'],
    ['Trinôme 2', 'Poste B', 'Poste C', 'Poste A'],
    ['Trinôme 3', 'Poste C', 'Poste A', 'Poste B']
  ], [25, 25, 25, 25], { hauteur: 400 }));
  c.push(espace(80));
  c.push(p([normal('Rôles à changer à chaque rotation : '), gras('opérateur'), normal(' (manipule) · '),
    gras('sécurité / notice'), normal(' (lit, surveille, arrête) · '), gras('scribe'),
    normal(' (remplit la feuille de relevés, ne touche à rien). Le rôle « sécurité / notice » est le seul autorisé à dire STOP. Le lui dire explicitement : c\'est un pouvoir, pas une punition.')],
    { taille: 24 }));
  c.push(espace());

  c.push(sautDePage());
  c.push(h2('5 · Incidents prévisibles et conduite à tenir'));
  c.push(espace(80));
  c.push(tableau(['Ce qui va arriver', 'Pourquoi', 'Ce que vous faites'], [
    ['Coupure du pressostat HP', 'Vanne rouge restée fermée, bouteille trop pleine, ou inverseur basculé machine en marche', 'On n\'apprend pas à réarmer, on apprend à chercher. Arrêt, vannes fermées, débranchement, recherche de cause à trois. Le réarmement se fait devant tout le monde, en dernier.'],
    ['Compresseur qui « claque »', 'Vanne bleue ouverte à fond en phase liquide', 'Faire refermer lentement par l\'élève lui-même. C\'est l\'expérience centrale du poste A — ne pas la court-circuiter.'],
    ['Récupération interminable', 'Obus Schrader oubliés, flexible 1/4" long', 'Ne pas corriger tout de suite. Laisser constater 5 min, puis renvoyer à Q3.'],
    ['Élève qui dévisse un flexible « vide » sans lunettes', 'Toujours', 'Arrêt du poste. Rappel du point sécurité n° 1. Reprise.'],
    ['Saisie du mouvement refusée par l\'application', 'Balance ou détecteur hors validité d\'étalonnage', 'Excellent incident. Montrer l\'alerte, expliquer qu\'en officiel elle bloque l\'opération. À exploiter en synthèse.'],
    ['Écart quantité / charge de plaque « bizarre »', 'Appoints antérieurs non tracés', 'C\'est le vrai sujet du TP. Ne pas lisser : faire chercher.']
  ], [24, 26, 50], { taille: 20, hauteur: 380 }));
  c.push(espace());

  c.push(h2('6 · Plan B — si une seule station fonctionne'));
  c.push(espace(80));
  c.push(p('Cela arrive. Le TP reste jouable :', { taille: 24 }));
  [
    'Poste A devient une démonstration commentée de 25 min, enseignant aux commandes, élèves scribes. Chaque élève remplit quand même la feuille de relevés.',
    'Poste B est réduit à la seule étude des incondensables, qui ne demande qu\'une bouteille au repos et un manomètre.',
    'Poste C est maintenu intégralement — c\'est celui qui porte C11 et C12, et il ne dépend pas de la station.',
    'La séance passe de 4 h à 3 h.'
  ].forEach(function (t) { c.push(p('•   ' + t, { retrait: true, taille: 24, apres: 60 })); });
  c.push(espace(60));
  c.push(encadre([p([normal('Ce qu\'on ne sacrifie jamais : '), gras('la phase d\'observation'), normal(' et '), gras('le poste C'), normal('.')],
    { taille: 24, apres: 0 })], { barre: ORANGE, fond: 'FFF1EB' }));
  c.push(espace());

  c.push(h2('7 · Adaptation CAP IFCA 2e année'));
  c.push(espace(80));
  [
    'Séance ramenée à 3 h, deux postes au lieu de trois : A puis C.',
    'Poste B en démonstration, sans l\'étude des incondensables.',
    'Q6, Q8 et l\'extension « aller plus loin » retirées du sujet.',
    'Q9 et Q10 fournies avec les opérations déjà posées, valeurs à compléter.',
    'Recentrer le discours sur la catégorie II (charge < 2 kg) : les groupes de l\'atelier y sont, le dire explicitement rassure et cadre.',
    'Grille d\'évaluation : conserver les 4 premières lignes et les 3 dernières, retirer celles qui portent sur la vidange de station.'
  ].forEach(function (t) { c.push(p('•   ' + t, { retrait: true, taille: 24, apres: 60 })); });
  c.push(espace());

  c.push(h2('8 · Après la séance'));
  c.push(espace(80));
  [
    'Corriger les dossiers avec la grille de positionnement.',
    'Remonter les positionnements par compétence (C4, C6, C9, C11, C12).',
    'Vérifier dans inerWeb Fluide que les mouvements élèves sont bien en brouillon ou soumis, et les valider ou les rejeter nominativement : c\'est la démonstration concrète du rôle de validateur.',
    'Laisser le fluide récupéré en bouteille et noter la date limite de garde. Une séance suivante peut s\'appuyer dessus : décision réutilisable / à analyser / déchet, puis BSFF.'
  ].forEach(function (t) { c.push(p('•   ' + t, { retrait: true, taille: 24, apres: 60 })); });
  c.push(espace());

  c.push(h2('9 · Prolongements possibles'));
  c.push(espace(80));
  c.push(tableau(['Séance suivante', 'Objet'], [
    ['Tirage au vide et recharge', 'Procédures ERM n° 4, 5, 6 — refermer le cycle sur le même groupe'],
    ['Devenir du fluide récupéré', 'Décision, délai de garde, BSFF, retour fournisseur'],
    ['Balance matière annuelle', 'Ouvrir l\'écran bilan matière de l\'application et faire chercher l\'écart'],
    ['Fluides A2L', 'Ce que change le R32 : machine, raccords, ventilation, détection'],
    ['Contrôle d\'étanchéité', 'Fréquences selon tCO₂eq, cadre 10 du CERFA']
  ], [32, 68], { hauteur: 400 }));

  return new Document({
    creator: 'inerWeb Édu — F. Henninot',
    title: 'Fiche de séance — Récupération de fluide sur MINIMAX-E',
    description: 'Déroulé minute par minute, préparation, incidents prévisibles, plan B.',
    sections: [pageA4('Fiche de séance — Récupération MINIMAX-E', c)]
  });
}

/* ------------------------------------------------------------------ écriture */

function ecrire(doc, nom) {
  return Packer.toBuffer(doc).then(function (buffer) {
    const cible = path.join(RACINE, nom);
    fs.writeFileSync(cible, buffer);
    console.log('écrit : ' + nom + ' (' + Math.round(buffer.length / 1024) + ' Ko)');
  });
}

ecrire(documentTP(), 'TP-recuperation-MINIMAX-E.docx')
  .then(function () { return ecrire(documentFiche(), 'FICHE-SEANCE-recuperation.docx'); })
  .catch(function (e) { console.error(e); process.exit(1); });
