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

export const TEXTES_LIMINAIRES = {
  'a-quoi-sert': [
    `Ce livret prépare à l'<b>attestation d'aptitude fluides frigorigènes</b>. Il rassemble, ` +
    `sur papier, la théorie qui se présente à l'épreuve : dix-neuf chapitres, du risque au fluide, ` +
    `du fluide à la machine, de la machine aux opérations.`,
    `Il se lit <b>avant</b> la formation pour arriver préparé, <b>pendant</b> pour garder une trace, ` +
    `et <b>après</b> pour réviser jusqu'à l'épreuve. Chaque chapitre se termine par une activité ` +
    `à remplir et des questions d'entraînement : ce livret s'écrit autant qu'il se lit.`,
    `Le geste professionnel — manipuler, braser, récupérer en atelier — fait l'objet du <b>tome 2</b>. ` +
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
  ],
  'statut': [
    `Ce livret <b>prépare</b> à l'attestation d'aptitude. Il <b>ne la délivre pas</b> : seul un ` +
    `organisme évaluateur certifié fait passer l'épreuve et délivre l'attestation.`,
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
    `<b>A1</b> : tout, sans limite. <b>A2</b> : tout, en petite charge. <b>B</b> : le CO₂. ` +
    `<b>C</b> : l'ammoniac. <b>D</b> : récupérer seulement. <b>E</b> : contrôler l'étanchéité ` +
    `sans ouvrir. <b>V</b> : la climatisation des véhicules.`,
  ],
};

export const TEXTES_FIN = {
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
    `<b>Habilitation Fluide — livret élève, tome 1 : la théorie.</b>`,
    `© 2026 Franck Henninot — inerWeb. Tous droits réservés. Contact : inerweb.fh@gmail.com.`,
    `Conçu, dirigé et vérifié par F. Henninot, enseignant en filière froid et climatisation. ` +
    `Fabrication assistée par intelligence artificielle (Claude, Anthropic), sous sa relecture.`,
    `Les schémas techniques et illustrations proviennent de la bibliothèque inerWeb. ` +
    `Ce livret ne contient aucun document pédagogique tiers.`,
    `Ce document ne peut être ni revendu, ni modifié, ni diffusé sans l'accord écrit de l'auteur.`,
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
