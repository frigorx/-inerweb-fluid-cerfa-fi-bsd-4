/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — GABARIT A5 : HTML PAGINÉ, PUIS PDF
   ---------------------------------------------------------------------
   La mise en page validée sur maquette (27/08/2026), appliquée au
   livret entier.

   La pagination est celle du navigateur — la seule qui sache couper un
   paragraphe proprement entre deux pages, donc la seule qui remplisse
   vraiment le papier. (Une pagination maison en pages de hauteur fixe a
   été essayée : elle laissait un tiers des pages à moitié vides, faute
   de pouvoir couper un paragraphe. Abandonnée.)

   Ce que le navigateur ne sait pas faire, en revanche, c'est écrire en
   haut de CHAQUE page la partie et le chapitre courants. Chaque bloc
   emporte donc un marqueur invisible, et finition.py lit ces marqueurs
   page à page pour dessiner le bandeau, le pied et le numéro dans les
   marges réservées.

   Ce que le CSS garantit : une planche, un encadré, une question, un
   bloc « À l'écran » ne se coupent jamais ; un titre n'est jamais seul
   en bas de page ; couverture, ouvertures de partie et planche centrale
   occupent leur page entière, sans bandeau.

   Sorties : dist/…-A5.html (autonome, images embarquées — version écran)
             dist/…-A5.pdf  (Chrome headless + finition — version papier)
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { construireFlux, TITRES_PARTIES, TITRES_CHAPITRES } from './pages.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ICI, '..', 'dist');
const SOURCE_PACK = process.env.PILOTE_FLUIDES || 'C:/git/pilote-fluides';

/* ------------------------------------------------------------------
   DEUX ÉDITIONS, UN SEUL GABARIT — `EDITION=dys npm run html`.
   La charte inerWeb impose la lisibilité DYS : police Lexend (la seule
   police embarquée admise, OFL), corps plus grand, interligne ouvert,
   et JAMAIS de texte justifié (les rivières de blanc du texte justifié
   sont l'un des pièges connus de la lecture dyslexique).
   ------------------------------------------------------------------ */
const DYS = process.env.EDITION === 'dys';
/* Le livre s'appelle « inerweb.fr HabFluide » — la marque du livre est
   le SITE, pas le logiciel : c'est lui qu'il fait connaître. */
const NOM = 'inerweb.fr-HabFluide-Tome1-Livret-eleve-7x10' + (DYS ? '-DYS' : '');

const LEXEND = path.join(SOURCE_PACK, 'moteur', 'polices', 'Lexend-variable.woff2');
const POLICE_DYS = fs.existsSync(LEXEND)
  ? `@font-face{font-family:'Lexend';font-weight:100 900;font-display:block;
      src:url(data:font/woff2;base64,${fs.readFileSync(LEXEND).toString('base64')}) format('woff2')}`
  : '';
if (DYS && !POLICE_DYS) {
  console.error(`Lexend introuvable : ${LEXEND}\nL'édition DYS l'exige (charte inerWeb).`);
  process.exit(1);
}

/* ------------------------------------------------------------------
   LES RÉGLAGES DE DENSITÉ — `reglages.json`, à côté du livre.
   Franck les manœuvre au curseur dans `curseurs.html` et recopie le
   résultat ici : la page entière se refabrique sans qu'on touche au code.
   ------------------------------------------------------------------ */
const R = JSON.parse(fs.readFileSync(path.join(ICI, '..', 'reglages.json'), 'utf8'));

/* Corps de texte et interligne, par édition.
   14 pt en standard : c'est le plancher que la charte inerWeb fixe pour
   tout document élève — « Calibri 14 pt MINIMUM, partout, tableaux
   compris, aucune tolérance ». Le livre est plus épais ; il se lit. */
const CORPS_PT = DYS ? R.corps_pt + 1 : R.corps_pt;
const INTERLIGNE = DYS ? R.interligne + 0.3 : R.interligne;
const FAMILLE = DYS
  ? `'Lexend',Calibri,"Segoe UI",system-ui,sans-serif`
  : `Calibri,"Segoe UI",system-ui,sans-serif`;

const CSS = `
${POLICE_DYS && DYS ? POLICE_DYS : ''}
:root{
  --bleu:#1B3A63; --bleu2:#2f5689; --orange:#FF6B35; --logo:#e8914a;
  --txt:#1d2a38; --mut:#5a6b7d; --ligne:#d6dee7; --pale:#F4F7FA;
  --ok:#1e7e54; --ko:#c0392b;
  /* Format Amazon KDP — cotes dans reglages.json (7 × 10 : maquette
     à marge de renvois du 30/08). */
  --page-h:${R.page_h_mm}mm; --page-l:${R.page_l_mm}mm;
  /* Réglages de densité — voir reglages.json. la variable --air multiplie tous les
     blancs entre blocs : c'est le curseur qui décide si la page respire
     ou si elle porte. */
  --air:${R.air};
  --planche-h:${R.planche_h_mm}mm;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:#e7ecf1;color:var(--txt);
  font:${CORPS_PT}pt/${INTERLIGNE} ${FAMILLE};
  -webkit-print-color-adjust:exact;print-color-adjust:exact}

/* ---------- Le flux (écran) ---------- */
#livret{max-width:${R.page_l_mm}mm;margin:0 auto;background:#fff;padding:14mm 16mm;
  box-shadow:0 3px 14px rgba(27,58,99,.16)}
.marq{font-size:1pt;line-height:0;color:#fff}
/* Dans une FIGURE, le marqueur devient un bloc de hauteur nulle : en
   inline devant l'image, il créait une ligne de strut de 5,8 mm par
   planche marquée — deux pages pour quarante planches. En bloc à
   hauteur nulle il ne pèse rien, et son glyphe d'un point reste isolé
   sur sa propre ligne (l'effacement par motif entier ne craint plus
   les voisinages). */
figure .marq{display:block;height:0;line-height:0}
/* Une ANCRE de comblement sans planche pèse UN POINT de haut — pas le
   strut de ligne d'un bloc ordinaire (5,8 mm, soit deux pages pour cent
   ancres), et pas zéro non plus : un glyphe qui déborde d'un bloc à
   hauteur nulle se superpose au bloc suivant, et l'effacement des
   marqueurs, qui apparie les « @@ » deux à deux dans l'ordre du dessin,
   se décale alors et en laisse dans le livre. Vu sur pièce. */
.ancre{line-height:1;font-size:1pt;margin:0;padding:0}

/* Rien ne se coupe au milieu : ni une planche, ni un encadré,
   ni une question et ses réponses, ni un bloc « À l'écran ». */
figure,.duo,.encadre,.q,.rep,.ecran,.tbl,.ch-tete,.note,.voix,.som-partie,
.remplir>.rl,.remplir>.trait{break-inside:avoid;page-break-inside:avoid}
h2,h3,h4,.sect-t,.lecon-t,.page-t,.sect-intro{break-after:avoid;page-break-after:avoid}
.rupture{break-before:page;page-break-before:always}
.seul{break-before:page;break-after:page;page-break-before:always;page-break-after:always}

/* ---------- La page couchée ----------
   Amazon n'accepte qu'un seul format de page dans un intérieur : on ne
   peut pas glisser une feuille paysage. On couche donc le CONTENU d'un
   quart de tour dans une page ordinaire — le lecteur tourne le livre.
   Sens conventionnel en édition : le haut de la planche part vers la
   gauche, on tourne l'ouvrage dans le sens des aiguilles.
   Les cotes se déduisent des marges réglées, jamais écrites en dur. */
.paysage{height:${(R.page_h_mm - R.haut_mm - R.bas_mm).toFixed(1)}mm;position:relative}
.paysage-in{position:absolute;top:50%;left:50%;transform-origin:center center;
  transform:translate(-50%,-50%) rotate(-90deg);
  width:${(R.page_h_mm - R.haut_mm - R.bas_mm).toFixed(1)}mm;
  height:${(R.page_l_mm - R.gouttiere_mm - R.exterieur_mm - R.marge_renvois_mm - R.separation_mm).toFixed(1)}mm;
  display:flex;flex-direction:column}
/* Titre resserré : chaque millimètre rendu ici passe dans la planche. */
.paysage-in .page-t{font-size:16pt;margin:0 0 3mm}
.paysage-in figure{margin:0;flex:1;min-height:0;display:flex;flex-direction:column}
/* La planche prend TOUT le cadre couché, sans déformer ses proportions. */
.paysage-in figure img{max-height:none;width:100%;height:100%;flex:1;min-height:0;object-fit:contain}

/* ---------- Titres et texte ---------- */
.page-t{font:700 25pt/1.1 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0 0 5mm}
/* Jamais justifié : la charte l'interdit, et les rivières de blanc du
   texte justifié gênent la lecture dyslexique. Drapeau à droite. */
.txt{margin:0 0 calc(var(--air) * 2.6mm);text-align:left;hyphens:none}
.txt.petit{font-size:1em;color:var(--mut);margin-bottom:1.8mm}
.txt.attente{color:var(--mut)}
/* Lexique : le terme en vedette, la définition en retrait dessous. */
.lex{margin:0 0 calc(var(--air) * 3mm);break-inside:avoid;page-break-inside:avoid}
.lex b{display:block;color:var(--bleu);font-family:"Trebuchet MS",Calibri,sans-serif}
.lex span{display:block;padding-left:5mm;border-left:1.5pt solid var(--ligne);margin-top:.8mm}
.lex-chapeau{color:var(--mut);font-style:italic}

.ch-tete{display:flex;gap:4.4mm;align-items:flex-start;margin-bottom:calc(var(--air) * 5mm)}
.ch-num{font:700 52pt/.82 "Trebuchet MS",Calibri,sans-serif;color:var(--orange)}
.ch-titre{font:700 24pt/1.1 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0 0 2.4mm}
.ch-objectif{margin:0;font-style:italic;font-size:1em}

.ref{border-left:2.4pt solid var(--bleu);background:var(--pale);
  padding:calc(var(--air) * 3.4mm) 4.4mm;margin:0 0 calc(var(--air) * 5mm);border-radius:0 3px 3px 0}
.ref h3{font:700 13pt/1 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0 0 2.6mm}
.ref-l{break-inside:avoid;page-break-inside:avoid;margin:0 0 calc(var(--air) * 2.2mm);font-size:1em;line-height:1.42;color:#2a3a4a}
.ref-code{display:inline-block;background:var(--bleu);color:#fff;font-weight:700;font-size:9pt;
  padding:.3mm 1.4mm;border-radius:2px;margin-right:1.4mm;vertical-align:.3mm}
.ref-intro{margin:0 0 3mm;font-size:10pt;color:var(--mut);font-style:italic}
.ref-cats{white-space:nowrap}
.ref-cat{display:inline-block;border:.5pt solid var(--bleu2);color:var(--bleu2);
  font-size:9pt;font-weight:700;padding:.2mm 1.2mm;border-radius:2px;margin-left:1mm;
  vertical-align:.3mm}
.ref-cat.prat{border-color:var(--mut);color:var(--mut);font-weight:400;font-style:italic}
/* Hors périmètre pour une AUTRE catégorie (B pour le CO₂, C pour
   l'ammoniac) : ce n'est ni de la pratique, ni un oubli. */
.ref-cat.hors{border-color:var(--mut);color:var(--mut);font-weight:400;font-style:italic}

/* Le QCM d'ouverture commence toujours en haut d'une page — on le voit
   alors comme un tout. On ne lui interdit PAS de couler sur la page
   suivante : le lui interdire laisserait une page blanche derrière lui
   dès qu'il dépasse d'une ligne. Chaque question, elle, reste entière. */
/* Le QCM se VOIT : cadre bleu sur fond pâle, badge case-cochée, chaque
   question dans sa carte blanche, cases franches. (Remarque de
   F. Henninot, 30/08 soir : « ça ne saute pas aux yeux que c'est un
   QCM » — maintenant si.) */
.qcm{break-before:page;page-break-before:always;border:1.4pt solid var(--bleu);
  border-radius:2.5mm;background:var(--pale);padding:4mm 4.5mm 3.4mm}
.qcm-tete{display:flex;justify-content:space-between;align-items:flex-start;gap:4mm}
.qcm-tete .sect-intro{margin-bottom:2.6mm}
.qcm-qr{flex:none;display:flex;gap:2.2mm;align-items:flex-start;background:#fff;
  border:.7pt solid var(--ligne);border-radius:1.6mm;padding:2mm}
.qcm-qr img{width:16mm;height:16mm;display:block}
.qcm-qr-txt{font-size:.68em;line-height:1.4;color:var(--txt);display:flex;flex-direction:column}
.qcm-qr-url{color:var(--bleu);font-weight:700;margin-top:.8mm}
.picto-qcm{width:.95em;height:.95em;color:var(--orange);margin-right:1.6mm;vertical-align:-.12em}
.qcm-note{text-align:right;font-weight:700;margin-top:1mm}
.qcm-note .note-case{display:inline-block;width:9mm;border-bottom:1pt solid var(--bleu);height:1em;vertical-align:-.2em}
.q-c.deux{display:grid;grid-template-columns:1fr 1fr;column-gap:3mm}

.sect-t{display:flex;align-items:center;gap:2.6mm;
  font:700 17pt/1.1 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0 0 2.6mm}
.sect-num{display:inline-flex;align-items:center;justify-content:center;width:8mm;height:8mm;
  border-radius:50%;background:var(--orange);color:#fff;font-size:11pt;flex:none}
.sect-intro{margin:0 0 3.4mm;color:var(--mut);font-size:1em}

.lecon-t{display:flex;align-items:baseline;gap:2.6mm;
  font:700 16pt/1.15 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);
  margin:calc(var(--air) * 3mm) 0 calc(var(--air) * 2.4mm)}
.lecon-n{color:var(--orange);font-size:13pt}

/* ---------- Images ---------- */
/* Une planche est plafonnée en HAUTEUR, pas en largeur : au-delà, elle
   mangerait la moitié de la page et pousserait le texte plus loin qu'il
   ne faut. À 74 mm elle reste large et parfaitement lisible en A5. */
figure{margin:0 0 calc(var(--air) * 3.4mm)}
figure img{width:100%;max-height:var(--planche-h);object-fit:contain;display:block;margin:0 auto;
  border:.6pt solid var(--ligne);border-radius:3px}
figure figcaption{margin-top:1.6mm;text-align:center;font-style:italic;font-size:10pt;color:var(--mut)}
.planche.haute img{width:auto;max-height:${R.planche_haute_h_mm}mm}
/* Le COMBLEMENT (maquette du 30/08 : « aucune page ne se termine sur du
   vide ») : une planche de la réserve, plafonnée par un style en ligne à
   la hauteur du blanc qu'elle vient remplir — elle ne déplace donc jamais
   la pagination. Dans le tirage, une planche comme une autre. */
.comble img{width:auto;max-width:100%}
/* Le QR du bilan : la page Bilan est nue (pas de marge de renvois), le
   code s'imprime donc dans la page, comme un bloc du bilan. */
.bilan-qr{display:flex;gap:6mm;align-items:flex-start;border:.6pt solid var(--ligne);
  border-left:2.4pt solid var(--orange);padding:4mm 5mm;margin:calc(var(--air) * 4mm) 0 0;
  break-inside:avoid;page-break-inside:avoid}
.bilan-qr-img{width:26mm;height:26mm;flex:none}
.bilan-qr-txt{display:flex;flex-direction:column;gap:1.6mm;font-size:.86em;line-height:1.4}
.bilan-qr-url{color:var(--bleu);font-weight:700}
.appoint{width:${R.appoint_pc}%;margin-left:auto;margin-right:auto}
/* Un SYMBOLE normalisé porte peu d'information et beaucoup de blanc :
   à pleine largeur il mangeait 40 % d'une page pour un pictogramme.
   Il se pose donc en vignette, comme dans une nomenclature. */
.symbole{width:46%;margin-left:auto;margin-right:auto}
.symbole img{max-height:38mm}
.appoint img{max-height:52mm}
.duo{display:flex;gap:4mm;margin:0 0 3.4mm}
.duo figure{margin:0;flex:1}
.duo img{max-height:64mm}

/* ---------- Le sommaire du chapitre (maquette du 30/08) ---------- */
.sommaire-ch{border:.6pt solid var(--ligne);background:var(--pale);
  padding:calc(var(--air) * 2.5mm) 3mm;margin:0 0 calc(var(--air) * 4mm);
  break-inside:avoid;page-break-inside:avoid}
.sommaire-t{font:700 10pt/1.2 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);
  text-transform:uppercase;letter-spacing:.4px;margin:0 0 1.5mm}
.sommaire-ch ol{margin:0;padding-left:5.5mm}
.sommaire-ch li{font-size:11pt;line-height:1.4;margin-bottom:.6mm}

/* ---------- Encadrés ---------- */
.encadre{border-left:2.4pt solid var(--bleu);background:var(--pale);
  padding:calc(var(--air) * 3mm) 4mm;margin:0 0 calc(var(--air) * 4mm);border-radius:0 3px 3px 0}
.encadre h4{font:700 13pt/1 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0 0 1.8mm}
.encadre p{margin:0 0 calc(var(--air) * 1.8mm);font-size:1em}
.encadre ol{margin:0;padding-left:5.4mm;font-size:1em}
.encadre li{margin-bottom:1mm}
.encadre.piege{border-left-color:var(--ko);background:#fbe7e4}
.encadre.piege h4{color:var(--ko);display:flex;align-items:center;gap:1.8mm}
/* Le triangle d'avertissement, dessiné : il remplace l'emoji ⚠, que le
   navigateur rendait en bitmap couleur — invendable sur un tirage N&B. */
.picto-piege{width:4.6mm;height:4.2mm;flex:none}

/* ---------- Questions ---------- */
.q{margin-bottom:calc(var(--air) * 2.6mm);background:#fff;border:.7pt solid var(--ligne);border-radius:1.6mm;padding:2.6mm 3mm 2mm}
.q-e{margin:0 0 1.4mm;font-weight:600}
.q-n{display:inline-flex;align-items:center;justify-content:center;width:6mm;height:6mm;
  border:1pt solid var(--bleu);border-radius:50%;color:var(--bleu);font-size:10pt;font-weight:700;
  margin-right:2mm;vertical-align:.3mm}
.q-c{list-style:none;margin:0;padding:0 0 0 6.6mm}
.q-c li{display:flex;align-items:flex-start;gap:1.8mm;margin-bottom:calc(var(--air) * 1.4mm);font-size:1em}
.case{flex:none;width:4.2mm;height:4.2mm;border:1.3pt solid var(--bleu);border-radius:.8mm;background:#fff;margin-top:.5mm}
.lettre{flex:none;font-weight:700;color:var(--bleu);width:3.2mm}

.rep{margin-bottom:calc(var(--air) * 2.8mm)}
.rep-l{margin:0 0 1.2mm;font-size:1em}
.rep-n{display:inline-flex;align-items:center;justify-content:center;width:6mm;height:6mm;
  border-radius:50%;background:var(--ok);color:#fff;font-size:10pt;font-weight:700;
  margin-right:2mm;vertical-align:.3mm}
.rep-lettre{font-weight:700;color:var(--ok);margin-right:1.6mm}
.rep-x{margin:0 0 0 6.6mm;font-size:1em;color:var(--mut)}

.note{margin:4mm 0;border-top:.6pt solid var(--ligne);padding-top:2.4mm;
  font:700 13pt "Trebuchet MS",Calibri,sans-serif;color:var(--bleu)}
.note-case{display:inline-block;width:11mm;border-bottom:1pt dotted var(--mut);margin:0 1.2mm}
.note-desc{font:italic 10pt Calibri,sans-serif;color:var(--mut);margin-left:2.4mm}

/* ---------- À l'écran ---------- */
.ecran{display:flex;gap:3mm;align-items:center;background:#fff;
  border:.6pt solid var(--ligne);border-left:2.4pt solid var(--orange);
  border-radius:0 3px 3px 0;padding:2.2mm 3mm;margin:0 0 calc(var(--air) * 4mm)}
.ecran-qr{width:19mm;height:19mm;flex:none}
.ecran-txt{display:flex;flex-direction:column;gap:.4mm}
.ecran-eti{font:700 8.6pt/1 "Trebuchet MS",Calibri,sans-serif;color:var(--orange);
  letter-spacing:.7px;text-transform:uppercase}
.ecran-url{font-weight:700;color:var(--bleu);font-size:1em}
.ecran-desc{font-size:10pt;color:var(--mut)}

/* ---------- À remplir ---------- */
.remplir{margin:0 0 3mm}
.rl{margin:calc(var(--air) * 3mm) 0 1mm;font-size:1em}
.trait{margin:0 0 calc(var(--air) * 1.8mm);border-bottom:.8pt dotted var(--mut);height:6mm}
.voix{margin:3mm 0 4mm;font-style:italic;font-size:1em}
.voix span{display:block;font:700 7.4pt/1 "Trebuchet MS",Calibri,sans-serif;color:var(--orange);
  letter-spacing:.7px;text-transform:uppercase;margin-bottom:1mm;font-style:normal}

/* ---------- Tableaux ---------- */
.tbl{margin:0 0 4mm}
.tbl h4{font:700 13pt/1 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0 0 2mm}
table{width:100%;border-collapse:collapse;font-size:1em}
th{background:var(--bleu);color:#fff;text-align:left;padding:1.4mm 2mm;font-weight:700}
td{padding:1.2mm 2mm;border-bottom:.5pt solid var(--ligne);vertical-align:top}
tbody tr:nth-child(even) td{background:#F7FAFC}

/* ---------- Sommaire ---------- */
.som-partie{margin-bottom:4mm}
.som-p{margin:0 0 2mm;font-size:13pt}
.som-p b{font-family:"Trebuchet MS",Calibri,sans-serif;color:var(--bleu)}
.som-p span{color:var(--mut);font-style:italic;font-size:8.4pt;margin-left:2mm}
.som-ch{display:flex;align-items:baseline;gap:2mm;margin:0 0 1.4mm 4mm;font-size:1em}
/* La place du numéro de page, que la finition écrira : elle seule le
   connaît. Le trait de conduite mène l'œil jusqu'à lui. */
.som-ch{position:relative}
.som-ch::after{content:'';flex:1;border-bottom:.5pt dotted var(--ligne);margin:0 12mm .8mm 1mm}
.som-n{display:inline-flex;align-items:center;justify-content:center;width:4.6mm;height:4.6mm;flex:none;
  border-radius:50%;background:var(--pale);color:var(--bleu);font-size:7pt;font-weight:700}
.som-url{margin-left:auto;font-size:10pt;color:var(--mut)}

/* ---------- Ouvertures ---------- */
.ouverture{height:172mm;display:flex;flex-direction:column;justify-content:center;
  align-items:center;text-align:center;padding:0 8mm}
.ouv-eti{font:700 11pt "Trebuchet MS",Calibri,sans-serif;color:var(--orange);letter-spacing:2px;
  text-transform:uppercase}
.ouv-t{font:700 30pt/1.1 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:3mm 0 2mm}
.ouv-s{font-style:italic;color:var(--mut);font-size:11pt;margin:0 0 10mm}
.ouv-liste{display:flex;flex-direction:column;gap:2mm;font-size:9.4pt;color:var(--txt)}
.ouv-liste b{color:var(--orange);margin-right:1.4mm}

/* ---------- Couverture ---------- */
.couverture{height:172mm;display:flex;flex-direction:column;align-items:center;text-align:center;
  padding-top:4mm}
.couv-marque{display:flex;align-items:center;gap:1.6mm;margin-bottom:12mm}
.flocon{color:var(--bleu);font-size:14pt}
.iner{font:700 20pt "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);
  border-bottom:1.6pt solid var(--logo)}
.web{font:20pt "Segoe Script","Brush Script MT",cursive;color:var(--bleu);
  border-bottom:1.6pt solid var(--logo);margin-left:-1mm}
.cartouche{background:var(--logo);color:#fff;font:700 10.4pt "Segoe UI",sans-serif;
  padding:1.6mm 3.4mm;border-radius:18px;margin-left:1.6mm}
.couv-titre h1{font:700 33pt/1.02 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0}
.couv-sous{font:700 12.6pt "Trebuchet MS",Calibri,sans-serif;color:var(--orange);margin:3mm 0 0}
.couv-illu{width:86%;margin:8mm 0;border-radius:5px}
.couv-bas{margin-top:auto;padding-bottom:6mm}
.couv-epreuve{margin:0 0 3.4mm;font-size:9.2pt;color:var(--mut);line-height:1.45}
.couv-cats{display:flex;gap:2mm;justify-content:center;margin:0 0 3.4mm}
.couv-cats span{background:var(--bleu);color:#fff;font:700 9.6pt "Trebuchet MS",Calibri,sans-serif;
  padding:1.2mm 3.2mm;border-radius:3px}
.couv-ref{margin:0 0 4mm;font-size:7.8pt;color:var(--mut)}
.couv-auteur{margin:0;font-size:8.8pt}

/* ---------- Impression ----------
   Format Amazon KDP 6 × 9 pouces (152,4 × 228,6 mm).

   Les marges du haut et du bas réservent la place du bandeau et du pied,
   dessinés à la finition. Les marges latérales tiennent compte de la
   RELIURE : KDP exige 19 mm côté intérieur pour un livre de 300 à 500
   pages — sans quoi le texte disparaît dans le pli. La marge extérieure
   réserve en plus la MARGE DE RENVOIS (la colonne numérique) et sa
   séparation : finition.py y pose les QR, en regard du texte. */
@page{size:${R.page_l_mm}mm ${R.page_h_mm}mm;margin:${R.haut_mm}mm ${R.exterieur_mm + R.marge_renvois_mm + R.separation_mm}mm ${R.bas_mm}mm}
/* Marges MIROIR : la reliure mange le bord intérieur, qui change de côté
   selon que la page est de droite (recto) ou de gauche (verso). Chrome
   applique bien @page:left / @page:right — vérifié sur pièce le
   27/08/2026. */
@page:right{margin-left:${R.gouttiere_mm}mm;margin-right:${(R.exterieur_mm + R.marge_renvois_mm + R.separation_mm)}mm}
@page:left{margin-left:${(R.exterieur_mm + R.marge_renvois_mm + R.separation_mm)}mm;margin-right:${R.gouttiere_mm}mm}
@media print{
  body{background:#fff}
  #livret{max-width:none;margin:0;padding:0;box-shadow:none}
}`;

/* ------------------------------------------------------------------
   LE POINT TYPOGRAPHIQUE, RÉTABLI.

   Chrome, en imprimant, rend la page dans son repère de pixels (96 par
   pouce) puis la met à l'échelle du PDF (72 par pouce). Les longueurs en
   MILLIMÈTRES traversent ce passage intactes — la justification mesure
   bien ses 120 mm. Les tailles en POINTS, elles, sont traitées comme des
   pixels et ressortent au trois quarts : le réglage disait 14 pt, le
   livre imprimait 10,7. Le corps du texte, les légendes, les tableaux :
   tout était un quart trop petit, et le réglage mentait à qui le lisait.

   On rétablit donc l'échelle ici, une fois, sur toutes les valeurs en
   `pt` du CSS. `reglages.json` redevient vrai : 12 pt écrits, 12 pt
   imprimés, mesurables au réglet sur le tirage.
   ------------------------------------------------------------------ */
const ECHELLE_PT = 96 / 72;
const cssImprimable = (css) => css.replace(
  /(\d+(?:\.\d+)?)pt(?![a-z])/g,
  (tout, valeur) => `${(Number(valeur) * ECHELLE_PT).toFixed(2)}pt`,
);

/* ------------------------------------------------------------------
   Le marqueur invisible que `finition.py` relit : la partie et le
   chapitre auxquels ce bloc appartient, ou NUE pour les pages qui ne
   veulent ni bandeau ni pied (couverture, ouvertures de partie).
   ------------------------------------------------------------------ */
const marqueur = (b) => {
  if (b.seul) return '<span class="marq">@@NUE@@</span>';
  if (!b.chapitre) return '<span class="marq">@@LIM@@</span>';
  /* Les codes du référentiel voyagent avec le bloc, séparés du chapitre
     par un point-virgule : la finition les imprimera en pied de la page
     où ils tombent, et l'audit les comptera page par page. */
  const codes = (b.codes || []).join(',');
  return `<span class="marq">@@${b.partie}|${b.chapitre}${codes ? ';' + codes : ''}@@</span>`;
};

const flux = construireFlux().filter((b) => b.html && b.html.trim());
const classes = (b) => [b.seul ? 'seul' : '', b.rupture ? 'rupture' : '', b.ancre ? 'ancre' : ''].filter(Boolean).join(' ');

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>HAB-FLUIDE — livre sur l'habilitation des fluides, partie théorique</title>
<style>${cssImprimable(CSS)}</style></head>
<body>
<div id="livret">
${flux.map((b) => `<div class="${classes(b)}">${marqueur(b)}${b.html}</div>`).join('\n')}
</div>
</body></html>`;

fs.mkdirSync(DIST, { recursive: true });
const fichierHtml = path.join(DIST, `${NOM}.html`);
fs.writeFileSync(fichierHtml, html, 'utf8');

/* ---- Le PDF, par Chrome headless : même moteur, même pagination ---- */
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let pdf = '(Chrome absent : pas de PDF)';
if (fs.existsSync(CHROME)) {
  const cible = path.join(DIST, `${NOM}.pdf`);
  /* Le budget de temps virtuel est un PLAFOND, pas une attente : Chrome
     imprime dès que le rendu est stable. À 30 s il coupait avant d'avoir
     décodé les 22 Mo d'images embarquées, et le livre perdait cent pages
     d'une fabrication à l'autre — une pagination qui bouge, c'est un dos
     de couverture faux. Large, la fabrication redevient reproductible. */
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--no-pdf-header-footer',
    `--print-to-pdf=${cible}`, '--virtual-time-budget=600000',
    'file:///' + fichierHtml.replace(/\\/g, '/'),
  ], { stdio: 'ignore', timeout: 900000 });
  /* Bandeaux, pieds et numéros : ce que le navigateur ne sait pas poser. */
  try {
    execFileSync('python', [path.join(ICI, 'finition.py'), cible], { stdio: 'inherit', timeout: 180000 });
  } catch {
    console.warn('  (finition non appliquée : python/pymupdf indisponible)');
  }
  pdf = cible;
}

console.log('Gabarit A5 — livret élève');
console.log(`  ${flux.length} blocs de contenu · images embarquées (${(html.length / 1024 / 1024).toFixed(1)} Mo)`);
console.log(`\n✔ ${path.relative(process.cwd(), fichierHtml)}`);
console.log(`✔ ${pdf.endsWith('.pdf') ? path.relative(process.cwd(), pdf) : pdf}`);
