/* =====================================================================
   LIVRET « inerweb.fr HabFluide » — LE PAQUET DE TÉLÉVERSEMENT
   ---------------------------------------------------------------------
   Dernier maillon. Il rassemble dans `dist/kdp/` les DEUX fichiers
   qu'Amazon demande, et rien d'autre, avec la fiche qui dit quoi taper
   dans chaque écran du formulaire.

   Le reste de `dist/` (le Word éditable, l'édition DYS, le corrigé
   formateur, le HTML autonome) n'a rien à faire chez Amazon : il reste
   dehors, pour ne pas téléverser le mauvais fichier un soir de fatigue.

   `node build/paquet-kdp.mjs`
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const DIST = path.join(LIVRET, 'dist');
const KDP_DIR = path.join(DIST, 'kdp');
const K = JSON.parse(fs.readFileSync(path.join(LIVRET, 'kdp.gen.json'), 'utf8'));
const QR = JSON.parse(fs.readFileSync(path.join(LIVRET, 'qr.gen.json'), 'utf8'));
const CHOISIES = JSON.parse(fs.readFileSync(path.join(LIVRET, 'questions-choisies.gen.json'), 'utf8'));

const INTERIEUR = 'inerweb.fr-HabFluide-Tome1-Livret-eleve-6x9.pdf';
const COUVERTURE = 'inerweb.fr-HabFluide-Tome1-Couverture-6x9.pdf';

for (const f of [INTERIEUR, COUVERTURE]) {
  if (!fs.existsSync(path.join(DIST, f))) {
    console.error(`\n✖ ${f} manque : lancez « npm run tout » avant le paquet.`);
    process.exit(1);
  }
}

fs.mkdirSync(KDP_DIR, { recursive: true });
for (const f of [INTERIEUR, COUVERTURE]) {
  fs.copyFileSync(path.join(DIST, f), path.join(KDP_DIR, f));
}

/* Le prix. Amazon retient 40 % du prix de vente et le coût d'impression ;
   ce qui reste est la redevance. Le prix plancher est celui où elle
   tombe à zéro. */
const cout = K.cout_impression_estime_eur;
const plancher = K.prix_minimum_eur;
const conseille = 24.90;
const redevance = (p) => (p * 0.6 - cout);

const nbQuestions = Object.values(CHOISIES).reduce((n, l) => n + l.length, 0);

const fiche = `# inerweb.fr HabFluide, tome 1 — à téléverser sur Amazon KDP

Fabriqué le ${new Date().toISOString().slice(0, 10)} par la chaîne \`livret/build/\`.
Ce dossier ne contient QUE les deux fichiers qu'Amazon demande.

| Fichier | Où il va |
|---|---|
| \`${INTERIEUR}\` | écran « Contenu du livre » → **Charger le manuscrit** |
| \`${COUVERTURE}\` | écran « Contenu du livre » → **Charger une couverture** (PDF prêt à imprimer) |

---

## Les cotes, à recopier telles quelles

| Réglage Amazon | Valeur | Pourquoi |
|---|---|---|
| Format | **6 × 9 pouces** (15,24 × 22,86 cm) | le fichier est à cette taille exacte, sur ses ${K.pages} pages |
| Type de papier | **Blanc** | le dos et le coût sont calculés dessus |
| Intérieur | **Noir et blanc** | aucune couleur n'est nécessaire à la lecture |
| Fond perdu | **Sans fond perdu** pour l'intérieur, **avec** pour la couverture | rien ne touche le bord dans l'intérieur |
| Pages | **${K.pages}** | nombre pair : aucune page blanche ajoutée par l'imprimeur |
| Dos | **${K.dos_mm} mm** | ${K.pages} × 0,002252 pouce — déjà appliqué à la couverture fournie |

⚠️ **Si la pagination change, tout change.** Refaire \`npm run tout\` :
le dos, les cotes de couverture et cette fiche se recalculent seuls.

---

## Ce qu'il reste à décider (F. Henninot)

**L'ISBN.** Deux voies :
- *gratuit chez KDP* — rien à payer, mais l'ISBN appartient à Amazon et
  l'ouvrage ne peut pas être diffusé ailleurs sous ce numéro ;
- *acheté* (AFNIL, environ 20 € l'unité en France) — le titre reste à son
  auteur, et le même ISBN sert chez un autre diffuseur plus tard.
  À privilégier si le tome 2 et une diffusion hors Amazon sont envisagés.

**Le prix de vente.**

| | Montant |
|---|---|
| Coût d'impression (${K.pages} pages, N&B, papier blanc) | ${cout.toFixed(2)} € |
| Prix plancher accepté par Amazon | ${plancher.toFixed(2)} € |
| Prix conseillé | **${conseille.toFixed(2)} €** |
| Redevance à ce prix | ${redevance(conseille).toFixed(2)} € par exemplaire |

Le prix conseillé se tient : un manuel technique de ${K.pages} pages avec
${QR.length} ressources en ligne se compare à un ouvrage professionnel, pas à un
livre de poche. À 19,90 € la redevance tomberait à ${redevance(19.9).toFixed(2)} €.

---

## Les métadonnées, écran par écran

**Titre** — inerweb.fr HabFluide
**Sous-titre** — Tome 1 : la théorie de l'attestation d'aptitude fluides frigorigènes (catégories A1, A2, D et E) — support de révision indépendant
**Auteur** — F. Henninot
**Mention** — Enseignant en filière froid et climatisation

**Description** (à coller telle quelle) :

> **Support de révision indépendant** : ce livre ne remplace ni une formation,
> ni l'évaluation par un organisme certifié — seul un organisme évaluateur
> certifié délivre l'attestation, après réussite de l'évaluation.
>
> Toute la théorie de l'attestation d'aptitude à la manipulation des fluides
> frigorigènes, pour les catégories A1, A2, D et E, selon l'arrêté du
> 21 novembre 2025 et le règlement (UE) 2024/573.
>
> Dix-neuf chapitres conduisent du risque au fluide, du fluide à la machine,
> de la machine aux opérations. Chaque chapitre s'ouvre sur ce que le
> référentiel exige — code par code, catégorie par catégorie — puis pose des
> questions type examen AVANT la lecture : on se situe d'abord, on lit
> ensuite, on se corrige à la fin. ${nbQuestions} questions corrigées en tout.
>
> Plus de cent schémas techniques, des encadrés « à retenir » et « geste
> interdit », des pages à remplir, un lexique de 61 mots du métier expliqués
> avec des mots plus simples qu'eux.
>
> ${QR.length} QR codes ouvrent les cours animés et racontés à voix haute
> d'inerweb.fr : schémas en mouvement, questions corrigées, capsules audio.
> Les adresses sont aussi imprimées en clair — un navigateur suffit.
>
> Ce livre prépare l'épreuve théorique ; il ne délivre aucune attestation,
> seul un organisme évaluateur certifié le fait. Les gestes professionnels et
> l'épreuve pratique font l'objet du tome 2. Aucune question officielle
> d'examen n'y figure.

**Mots-clés** (7, un par champ) :
fluides frigorigènes · attestation d'aptitude · catégorie A1 A2 · froid et
climatisation · réglementation F-Gas · frigoriste · préparation examen

**Catégories** (3 au plus) :
- Technique et ingénierie → Mécanique
- Aides à l'étude → Formation professionnelle
- Technique et ingénierie → Environnement

**Public** — adultes. **Langue** — français. **DRM** — au choix ; sans DRM
n'a pas d'effet sur un broché.

---

## La déclaration de contenu IA (écran « Contenu du livre »)

KDP demande si le livre contient du contenu **généré par IA** (texte, images),
même substantiellement retravaillé. Les faits, pour répondre honnêtement :

- **Texte** : conçu, dirigé et vérifié par F. Henninot ; la rédaction est
  produite par IA sous sa direction, à partir de ses choix pédagogiques et du
  référentiel officiel. Au sens KDP, c'est du contenu **généré par IA avec
  révision substantielle** → répondre **« Oui »** pour le texte.
- **Images** : les planches techniques sont dessinées sous direction de
  F. Henninot ; les illustrations de la bibliothèque sont des images générées
  par IA sous sa direction → répondre **« Oui »** pour les images.

Cette déclaration est interne à Amazon (elle n'apparaît pas sur la fiche) et
n'empêche pas la publication. La mention imprimée en page crédits
(« fabrication assistée par intelligence artificielle, sous sa relecture »)
dit la même chose au lecteur.

## Les droits d'images : la preuve est jointe

\`registre-visuels.md\` (dans ce dossier) liste **chaque visuel du livre** avec
son fichier source, son auteur et sa licence — lu dans les métadonnées des
fichiers, régénéré à chaque fabrication. Deux symboles viennent de la
collection QElectroTech (CC BY 3.0) : leur attribution est imprimée en page
crédits, et la fabrication échoue si elle en disparaît.

## Avant de cliquer sur « Publier »

1. \`npm run verifier\` doit finir sur **« passe tous les critères bloquants »**.
2. Dans l'aperçu Amazon, vérifier **le dos** : le titre doit y tenir sans
   toucher les plis.
3. Commander **un exemplaire de contrôle** (« Épreuve imprimée ») avant la
   mise en vente : c'est le seul moyen de juger le gris des planches et la
   lisibilité des QR codes sur le vrai papier.
4. Scanner trois QR codes sur cette épreuve, dont un après photocopie.
5. Les ${QR.length} adresses \`inerweb.fr/f/…\` doivent être **en ligne** avant la mise
   en vente, sinon les QR imprimés mènent à une page d'erreur.
`;

fs.writeFileSync(path.join(KDP_DIR, 'A-LIRE-AVANT-DE-TELEVERSER.md'), fiche, 'utf8');

const mo = (f) => (fs.statSync(path.join(KDP_DIR, f)).size / 1e6).toFixed(1);
console.log('Paquet Amazon KDP');
console.log(`  ${K.pages} pages · dos ${K.dos_mm} mm · impression ${cout.toFixed(2)} € · prix conseillé ${conseille.toFixed(2)} €`);
console.log(`✔ dist/kdp/${INTERIEUR} (${mo(INTERIEUR)} Mo)`);
console.log(`✔ dist/kdp/${COUVERTURE} (${mo(COUVERTURE)} Mo)`);
console.log('✔ dist/kdp/A-LIRE-AVANT-DE-TELEVERSER.md');
