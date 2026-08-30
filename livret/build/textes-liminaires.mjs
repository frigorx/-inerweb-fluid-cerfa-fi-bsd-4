/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — TEXTES DES PAGES LIMINAIRES ET DE FIN
   ---------------------------------------------------------------------
   La SEULE rédaction neuve du livret : tout le reste est extrait de la
   source éditoriale. Ces pages-là n'existent nulle part ailleurs —
   elles présentent le livret, pas le métier. Relecture de F. Henninot
   attendue avant impression (bon à tirer).

   Chaque entrée est rangée par l'`id` de la page dans le plan.
   Les paragraphes acceptent <b> et <i>, rien d'autre.
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* Le nombre de renvois imprimés, compté sur le manifeste — le même chiffre
   que la couverture annonce. Écrit en dur, il mentirait dès le premier
   chapitre ajouté. */
const _ICI = path.dirname(fileURLToPath(import.meta.url));
const _QR = path.join(_ICI, '..', 'qr.gen.json');
const RENVOIS = fs.existsSync(_QR)
  ? JSON.parse(fs.readFileSync(_QR, 'utf8')).length : 0;

export const TEXTES_LIMINAIRES = {
  /* Page de copyright — la page technique de tout livre édité. Le millésime
     et l'ISBN se remplissent au dépôt Amazon ; le reste est définitif. */
  'copyright': [
    `<b>inerweb.fr HabFluide — tome 1 : la théorie</b>`,
    `Préparation à l'épreuve théorique de l'attestation d'aptitude à la manipulation des fluides ` +
    `frigorigènes, catégories A1, A2, D et E.`,
    `Support de révision indépendant : cet ouvrage ne remplace ni une formation, ni l'évaluation ` +
    `par un organisme certifié — seul un organisme évaluateur certifié délivre l'attestation, ` +
    `après réussite de l'évaluation (arrêté du 21 novembre 2025, art. 1).`,
    `Auteur : Franck Henninot, enseignant en filière froid et climatisation.`,
    `Édition : inerWeb — <b>inerweb.fr</b> — contact : inerweb.fh@gmail.com`,
    /* La clause protège ce que le droit permet de protéger : la copie, la
       diffusion numérique, la modification. PAS la revente de l'exemplaire
       acheté — le droit de distribution s'épuise à la première vente dans
       l'EEE (CPI, art. L122-3-1) : interdire la revente d'occasion d'un
       livre papier serait sans effet et décrédibiliserait la page. */
    `© 2026 Franck Henninot. Tous droits réservés. Toute reproduction, représentation, ` +
    `traduction ou adaptation, intégrale ou partielle, ainsi que toute diffusion sous forme ` +
    `numérique de cet ouvrage, sont interdites sans l'accord écrit de l'auteur ` +
    `(Code de la propriété intellectuelle, art. L122-4). La revente de l'exemplaire papier ` +
    `acquis n'est pas concernée.`,
    `Schémas techniques, illustrations et QR codes : bibliothèque inerWeb. Cet ouvrage ne contient ` +
    `aucun document pédagogique tiers.`,
    `Textes réglementaires cités : arrêté du 21 novembre 2025 (NOR TECP2532494A) et règlement (UE) ` +
    `2024/573. Ce sont des textes officiels, librement consultables ; leur citation ici ne vaut pas ` +
    `publication officielle. <b>En cas de divergence, le texte officiel fait foi.</b>`,
    `Ouvrage conçu, dirigé et vérifié par l'auteur. Fabrication assistée par des outils ` +
    `d'intelligence artificielle grand public, sous sa relecture. Voir l'avant-propos.`,
    `<i>ISBN et dépôt légal : voir la quatrième de couverture.</i>`,
  ],

  /* L'avant-propos est de la main de F. Henninot : c'est sa voix, elle ne
     se reformule pas. Seules la typographie et la signature suivent le
     reste du livre. */
  'avant-propos': [
    `Bienvenue dans ce parcours consacré à la manipulation des fluides frigorigènes.`,
    `Cet ouvrage est né d'une conviction simple : pour apprendre durablement, il faut pouvoir ` +
    `lire, comprendre, voir, essayer et se questionner. Il associe donc les notions théoriques ` +
    `essentielles à des schémas, des animations, des modules interactifs et des corrections ` +
    `détaillées, accessibles par <b>${RENVOIS} QR codes</b> sur <b>inerweb.fr</b>.`,
    `Mon expérience professionnelle d'ancien technicien, puis mon regard actuel d'enseignant ` +
    `dans la filière froid et climatisation, m'ont montré que le métier évolue rapidement. Les ` +
    `réglementations changent, de nouveaux fluides et de nouvelles technologies apparaissent, ` +
    `et les exigences de sécurité restent essentielles.`,
    `Face à ces évolutions, il m'a paru important de reprendre les fondamentaux : comprendre le ` +
    `circuit, lire une étiquette, mesurer les risques, maîtriser les gestes et savoir pourquoi ` +
    `chaque étape compte. Ce livre ne cherche donc pas seulement à préparer une épreuve ; il ` +
    `propose de remettre les connaissances à plat afin de mieux s'adapter aux réalités actuelles ` +
    `et futures du métier.`,
    `J'ai cherché à rendre ce parcours aussi clair et accessible que possible. Les explications ` +
    `vont à l'essentiel, les mots techniques sont repris et les situations sont illustrées pour ` +
    `permettre à chacun de comprendre progressivement. Quel que soit votre niveau de départ, ` +
    `votre diplôme ou votre expérience, l'objectif est de vous accompagner vers les connaissances ` +
    `nécessaires à la réussite de l'évaluation théorique liée à la manipulation des fluides ` +
    `frigorigènes.`,
    `Ce livre a été conçu avec l'aide d'<b>outils d'intelligence artificielle grand public</b>. ` +
    `Ils m'ont aidé à organiser, ` +
    `synthétiser, reformuler et enrichir certaines étapes de conception. Les choix pédagogiques, ` +
    `les vérifications métier et la responsabilité du contenu restent toutefois humains.`,
    `Ce livre ne remplace ni la pratique accompagnée, ni les consignes de sécurité, ni ` +
    `l'évaluation officielle. Il a vocation à vous aider à comprendre, à vous préparer et à ` +
    `progresser.`,
    `Je vous souhaite une excellente lecture, de bonnes explorations interactives, et beaucoup ` +
    `de réussite dans votre parcours professionnel.`,
    `<b>F. Henninot</b><br>Enseignant en filière froid et climatisation`,
  ],

  'a-quoi-sert': [
    `Ce livret prépare à l'<b>attestation d'aptitude fluides frigorigènes</b>. Il rassemble, ` +
    `sur papier, la théorie qui se présente à l'épreuve : dix-neuf chapitres, du risque au fluide, ` +
    `du fluide à la machine, de la machine aux opérations.`,
    `Il se lit <b>avant</b> la formation pour arriver préparé, <b>pendant</b> pour garder une trace, ` +
    `et <b>après</b> pour réviser jusqu'à l'épreuve. Chaque chapitre commence par ce que le ` +
    `<b>référentiel officiel</b> exige, puis par des <b>questions type examen</b> — répondez-y avant de ` +
    `lire : vous saurez tout de suite ce que vous savez déjà. La <b>correction est en ligne</b>, ` +
    `derrière le code de fin de chapitre : chaque réponse y est expliquée, et renvoie vers la page ` +
    `ou la leçon qui la fonde. ` +
    `Ce livret s'écrit autant qu'il se lit.`,
    `Le geste professionnel — manipuler, braser, récupérer en atelier — fera l'objet d'un <b>tome 2</b>. ` +
    `Ici, on comprend ; là-bas, on fait.`,
  ],
  'lire-qr': [
    `Chaque chapitre porte un <b>QR code</b>. Scannez-le avec l'appareil photo du téléphone : ` +
    `il ouvre la version interactive du chapitre sur <b>inerweb.fr</b> — le cours raconté à voix ` +
    `haute quand il existe, les schémas animés, les questions corrigées.`,
    `L'adresse est aussi écrite <b>en toutes lettres</b> sous chaque code (par exemple ` +
    `<b>inerweb.fr/f/securite</b>) : sans téléphone, tapez-la simplement dans un navigateur. ` +
    `L'index complet des adresses se trouve en fin de livret.`,
    `Rien d'obligatoire : le livret se suffit. L'écran ajoute le son, le mouvement et la correction ` +
    `automatique — trois choses que le papier ne sait pas faire.`,
  ],
  'parcours': [
    `L'ordre des chapitres n'est pas celui d'un catalogue : c'est celui du métier. ` +
    `<b>On se protège d'abord</b> (partie A), on apprend le cadre légal (B), on comprend le fluide ` +
    `et la machine (C et D), on étudie les opérations (E), et on finit par les fluides qui ` +
    `demandent plus que les autres (F).`,
    `Chaque chapitre suit le même chemin : des leçons courtes, une activité à remplir, une phrase ` +
    `à dire à voix haute, des questions. La dernière page de chaque chapitre vous donne une note ` +
    `sur six — reportez-la au bilan de fin de livret pour voir où revenir.`,
    `<b>En bas de chaque page, à côté du numéro, vous lisez « Référentiel : » suivi de codes.</b> ` +
    `Ce sont les compétences de l'arrêté du 21 novembre 2025 que la page travaille — celles-là ` +
    `mêmes que l'épreuve peut vous demander. Elles ne sont pas décoratives : la page « Index des ` +
    `codes du référentiel », en fin de livret, dit pour chaque code où le retrouver. Un code que ` +
    `vous ne comprenez pas encore est une page à relire, et vous savez laquelle.`,
  ],
  'statut': [
    `Ce livret <b>prépare</b> à l'attestation d'aptitude. Il <b>ne la délivre pas</b> : seul un ` +
    `organisme évaluateur certifié fait passer l'épreuve et délivre l'attestation.`,
    `Il couvre l'<b>épreuve théorique</b> des catégories <b>A1, A2, D et E</b> — chaque code théorique ` +
    `exigé par le référentiel pour ces catégories est traité, la vérification est refaite à chaque ` +
    `édition. La catégorie V (climatisation automobile) et les catégories B (CO₂) et C (ammoniac) ne ` +
    `sont pas préparées ici ; CO₂ et ammoniac sont abordés en information, pour savoir les reconnaître. ` +
    `La partie <b>pratique</b> — gestes, manipulations, atelier — fera l'objet d'un tome 2.`,
    `Les valeurs réglementaires citées (catégories, durées d'épreuve, dates) sont extraites de ` +
    `l'arrêté du 21 novembre 2025 et vérifiables en fin de livret, page « Sources ». En cas de ` +
    `doute entre ce livret et un texte officiel, <b>le texte officiel a toujours raison</b>.`,
    `Les questions d'entraînement de ce livret sont des questions <b>d'entraînement</b> : aucune ` +
    `question officielle d'examen n'y figure.`,
  ],
  'point-depart': [
    `Avant le premier chapitre, posez-vous trois minutes. Personne ne corrige cette page : ` +
    `elle est à vous. Vous y reviendrez à la fin — c'est là qu'on mesure le chemin.`,
  ],
  'categories-coup-oeil': [
    `Sept catégories d'attestation existent. Repérez la vôtre dès maintenant : le chapitre 4 ` +
    `les détaille, et votre catégorie décide de ce que l'épreuve vous demandera.`,
    /* Même en coup d'œil, A1 ne peut pas se résumer « tout, sans limite » :
       lu isolément, ça laisse croire qu'A1 couvre le CO₂ et l'ammoniac. */
    `<b>A1</b> : toutes les opérations sur les fluides <b>fluorés et les hydrocarbures</b>, sans ` +
    `limite de charge — jamais le CO₂ ni l'ammoniac. <b>A2</b> : les mêmes, en petite charge. <b>B</b> : le CO₂. ` +
    `<b>C</b> : l'ammoniac. <b>D</b> : récupérer seulement. <b>E</b> : contrôler l'étanchéité ` +
    `sans ouvrir. <b>V</b> : la climatisation des véhicules.`,
  ],
};

export const TEXTES_FIN = {
  'banque': [
    `Les questions des chapitres se posaient AVANT la lecture, pour vous situer. ` +
    `Celles-ci se posent APRÈS : elles balaient tout le livre, dans le désordre, ` +
    `comme le fait l'épreuve. Quatre-vingt-neuf questions, tirées de la même source ` +
    `que les précédentes et jamais déjà posées ailleurs dans ce livre.`,
    `Le numéro de chapitre est indiqué devant chaque question : une erreur vous dit ` +
    `immédiatement quelle page relire. Les réponses sont sur les pages suivantes.`,
  ],
  'banque-corrige': [
    `Corrigez-vous question par question. Une seule règle : notez le CHAPITRE des ` +
    `questions manquées, pas seulement le nombre de fautes. Trois erreurs dans le ` +
    `même chapitre valent plus qu'une erreur dans trois chapitres différents.`,
  ],
  'bilan': [
    `Reportez ici la note de fin de chaque chapitre. Trois notes faibles dans la même partie ? ` +
    `C'est la partie à relire — pas seulement les chapitres un par un.`,
  ],
  'diplome': [
    `Ce livret prépare une attestation professionnelle, mais son contenu croise largement les ` +
    `référentiels des diplômes du froid : CAP Installateur Froid et Conditionnement d'Air, ` +
    `Bac Pro Métiers du Froid et des Énergies Renouvelables, BTS. Les codes cités en tête de ` +
    `chaque chapitre sont ceux du référentiel d'évaluation de l'attestation — l'index en fin ` +
    `de livret les rassemble tous.`,
  ],
  'sources': [
    `Ce livret est extrait d'une source éditoriale unique, maintenue et versionnée : le pack ` +
    `« Habilitation fluides frigorigènes » d'inerWeb (dépôt frigorx/pilote-fluides). ` +
    `Aucun chiffre n'y est inventé : toute valeur non sourcée y est marquée « selon documentation ` +
    `constructeur ou norme, à faire valider ».`,
  ],
  'credits': [
    `<b>HabFluide — Habilitation à la manipulation des fluides frigorigènes.</b> ` +
    `Tome 1 : la théorie.`,
    `© 2026 Franck Henninot — inerWeb. Tous droits réservés. Contact : inerweb.fh@gmail.com.`,
    `Conçu, dirigé et vérifié par F. Henninot, enseignant en filière froid et climatisation. ` +
    `Fabrication assistée par des outils d'intelligence artificielle grand public, sous la ` +
    `relecture de l'auteur. Voir l'avant-propos.`,
    `Les schémas techniques et illustrations proviennent de la bibliothèque inerWeb. ` +
    `Ce livret ne contient aucun document pédagogique tiers.`,
    /* Attribution exigée par la licence CC BY 3.0 — le registre des droits
       (registre-visuels.mjs) FAIT ÉCHOUER la fabrication si elle manque. */
    `Certains symboles fluidiques sont issus de la collection QElectroTech ` +
    `(github.com/qelectrotech/qelectrotech-elements), sous licence CC BY 3.0 ; sélection, ` +
    `mise à la charte inerWeb et repères de bornes par F. Henninot.`,
    `Toute reproduction, modification ou diffusion numérique de cet ouvrage est interdite sans ` +
    `l'accord écrit de l'auteur. La revente de l'exemplaire papier acquis n'est pas concernée.`,
  ],
  'engagement': [
    `La théorie est lue ; reste à la tenir. Trois engagements, à écrire de votre main — on tient ` +
    `mieux ce qu'on a écrit soi-même.`,
  ],
};

/* Les lignes à remplir des pages qui en portent. */
export const LIGNES_FIN = {
  'point-depart': [
    'Ce que je fais aujourd hui (métier, formation) : ______',
    'Ce que je sais déjà du froid : ______',
    'La catégorie que je vise, si je la connais : ______',
    'Ce que je viens chercher dans cette formation : ______',
  ],
  'engagement': [
    'Avant d intervenir, je m engage à : ______',
    'Face à un fluide que je ne connais pas, je m engage à : ______',
    'Pour l environnement, je m engage à : ______',
    'Fait à ______, le ______ — signature :',
  ],
};
