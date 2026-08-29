/* =====================================================================
   verifier-module.mjs — LE FILET DU MODULE
   ---------------------------------------------------------------------
   Même esprit que `outils/lancer-tests.mjs` du logiciel : ce qu'une
   machine peut vérifier, elle le vérifie, pour qu'une relecture humaine
   se consacre à ce qu'elle seule sait faire.

   CE QUE CE FILET CONTRÔLE
     1. les onze programmes sont là, se suivent, et partagent leurs
        constantes de montage (une seule vérité pour R_REF, BETA, les
        broches et les adresses) ;
     2. la trame du § 26 est écrite pareil dans le firmware, dans le
        dossier et dans l'outil d'acquisition ;
     3. le tableau NTC du dossier est bien celui que le calcul donne ;
     4. les liens du site et des dossiers tombent sur des fichiers qui
        existent ;
     5. la charte inerWeb Édu est tenue : fond clair, AUCUNE règle de
        mode sombre, police de corps suffisante ;
     6. l'analyseur de trame de la page d'acquisition rend bien ce que
        le firmware émet — les deux bouts de la liaison, confrontés ;
     7. rien ne sort du navigateur : la politique de sécurité des pages
        interdit toute requête réseau.

   CE QU'IL NE CONTRÔLE PAS : le matériel. Voir POINTS-OUVERTS.md § B1.

   Usage :  node verifier-module.mjs
   ===================================================================== */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tableau, HYPOTHESES } from "./table-ntc.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, "..");
const lire = (...p) => readFileSync(join(RACINE, ...p), "utf8");

/* Un commentaire n'est pas du code. Chercher « Wire.begin() » ou
   « prefers-color-scheme » sans dépouiller les commentaires, c'est
   accuser un fichier de faire ce qu'il explique justement ne pas faire.
   (Les deux premières versions de ce filet s'y sont laissé prendre.) */
const sansCommentaires = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^\s*\/\/.*$/gm, " ");

const echecs = [];
let total = 0;
function verifier(ok, quoi, detail) {
  total++;
  console.log((ok ? "  OK    " : "  ECHEC ") + quoi + (ok || !detail ? "" : "\n          " + detail));
  if (!ok) echecs.push(quoi);
}
function titre(t) { console.log("\n── " + t + " " + "─".repeat(Math.max(0, 60 - t.length))); }

/* ══════════════════════════════════════════════════════════════════
   1. LES ONZE PROGRAMMES
   ══════════════════════════════════════════════════════════════════ */
titre("Les onze programmes");

const ATTENDUS = [
  "01-test-carte", "02-test-oled", "03-scanner-i2c", "04-lire-une-voie",
  "05-lire-une-ntc", "06-lire-six-sondes", "07-afficher", "08-niveau-piles",
  "09-trame-usb", "10-bluetooth-ble", "11-version-finale"
];
const dossiers = readdirSync(join(RACINE, "programmes"), { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => e.name).sort();

verifier(JSON.stringify(dossiers) === JSON.stringify(ATTENDUS),
  "les 11 dossiers de programme sont là et se suivent",
  "trouvé : " + dossiers.join(", "));

const source = {};
for (const d of ATTENDUS) {
  const f = join(RACINE, "programmes", d, d + ".ino");
  const ok = existsSync(f);
  if (ok) source[d] = readFileSync(f, "utf8");
  verifier(ok, `${d}/${d}.ino existe`);
}

/* Une seule vérité pour les constantes du montage : si un programme
   dérive, la classe mesure faux sans que personne ne le voie. */
titre("Les constantes du montage, partout les mêmes");

const CONSTANTES = [
  { motif: /const int BROCHE_SDA = (\d+);/,  attendu: "5",     quoi: "SDA sur GPIO5" },
  { motif: /const int BROCHE_SCL = (\d+);/,  attendu: "6",     quoi: "SCL sur GPIO6" },
  { motif: /const float R_REF\s*=\s*([\d.]+)f?/, attendu: "10000.0", quoi: "R_REF = 10 kΩ" },
  { motif: /BETA\s*=\s*([\d.]+)f/,           attendu: "3950.0", quoi: "BETA = 3950" },
  { motif: /R25\s*=\s*([\d.]+)f/,            attendu: "10000.0", quoi: "R25 = 10 kΩ" },
  { motif: /T0_KELVIN\s*=\s*([\d.]+)f/,      attendu: "298.15", quoi: "T0 = 298,15 K" }
];
for (const c of CONSTANTES) {
  const vus = new Set();
  for (const [nom, src] of Object.entries(source)) {
    const m = src.match(c.motif);
    if (m) vus.add(m[1] + " (" + nom + ")");
  }
  const valeurs = new Set(Array.from(vus).map((v) => v.split(" ")[0]));
  verifier(valeurs.size <= 1 && (valeurs.size === 0 || valeurs.has(c.attendu)),
    `${c.quoi} — même valeur dans tous les programmes`,
    Array.from(vus).join(" · "));
}

/* Les broches de démarrage de l'ESP32-C3 ne doivent JAMAIS porter le bus. */
for (const [nom, src] of Object.entries(source)) {
  const fautif = /BROCHE_SDA = (8|9)\b|BROCHE_SCL = (8|9)\b/.test(src);
  if (fautif) verifier(false, `${nom} : le bus I²C est sur une broche de démarrage (GPIO8/9)`);
}
verifier(!Object.values(source).some((s) => /BROCHE_SD[AL] = [89]\b/.test(s)),
  "aucun programme ne met le bus I²C sur GPIO8 ou GPIO9");

/* Les adresses I²C. */
verifier(Object.entries(source).every(([n, s]) =>
    !/ADS1115|ads\.begin|a2\.begin/.test(s) || /0x48/.test(s) || n.startsWith("01") || n.startsWith("02")),
  "les programmes qui parlent aux convertisseurs citent 0x48");
verifier(/0x49/.test(source["11-version-finale"]) && /0x48/.test(source["11-version-finale"]),
  "le programme final utilise les deux adresses 0x48 et 0x49");

/* Le calibre. */
verifier(Object.values(source).filter((s) => /setGain/.test(s)).every((s) => /GAIN_ONE/.test(s)),
  "tous les programmes règlent le calibre sur ±4,096 V (GAIN_ONE)");

/* Le contrôleur d'écran : SH1106 actif, SSD1306 en commentaire. */
const avecEcran = Object.entries(source).filter(([, s]) => /U8G2_S[HS]/.test(s));
verifier(avecEcran.every(([, s]) => /^U8G2_SH1106_128X64_NONAME_F_HW_I2C/m.test(s)),
  "les programmes avec écran sont réglés sur SH1106 (le 1,3 pouce)");
verifier(avecEcran.every(([, s]) => /^\/\/ U8G2_SSD1306/m.test(s)),
  "la variante SSD1306 est présente en commentaire, prête à décommenter");

/* Wire.setPins avant Wire.begin : sans ça, U8g2 reprend les broches par défaut. */
verifier(Object.entries(source).map(([n, s]) => [n, sansCommentaires(s)])
    .filter(([, s]) => /Wire\.begin\(\)/.test(s))
    .every(([, s]) => s.indexOf("Wire.setPins") >= 0 && s.indexOf("Wire.setPins") < s.indexOf("Wire.begin()")),
  "Wire.setPins() est appelé AVANT Wire.begin() partout");

/* ══════════════════════════════════════════════════════════════════
   2. LA TRAME — écrite pareil aux trois endroits
   ══════════════════════════════════════════════════════════════════ */
titre("La trame du § 26, aux trois endroits");

const TRAME_EXEMPLE = "12:31:05;T1=4.8;T2=-3.2;T3=8.7;T4=52.1;T5=31.4;T6=24.8;BAT=78";
const endroits = {
  "le dossier maître":          lire("00_Dossier_maitre.md"),
  "06_Programmes":              lire("06_Programmes_et_telechargements.md"),
  "le site compagnon":          lire("site", "index.html"),
  "l'outil d'acquisition (js)": lire("site", "exploitation.js")
};
for (const [nom, texte] of Object.entries(endroits)) {
  verifier(texte.includes(TRAME_EXEMPLE) || texte.includes("12:31:05;T1=4.8"),
    `la trame d'exemple figure dans ${nom}`);
}
verifier(/;T%d=%.1f/.test(source["11-version-finale"]) && /;T%d=/.test(source["11-version-finale"]),
  "le firmware construit la trame au format exact, champs vides compris");
verifier(/6e400001-b5a3-f393-e0a9-e50e24dcca9e/i.test(source["11-version-finale"]) &&
         /6e400001-b5a3-f393-e0a9-e50e24dcca9e/i.test(lire("site", "exploitation.js")),
  "le service BLE est le même dans le firmware et dans la page");
verifier(/reste > 20 \? 20 : reste/.test(source["11-version-finale"]),
  "le firmware découpe ses notifications BLE en 20 octets");
verifier(/indexOf\("\\n"\)/.test(lire("site", "exploitation.js")),
  "la page recolle les morceaux jusqu'au retour à la ligne");

/* ══════════════════════════════════════════════════════════════════
   3. LE TABLEAU NTC DU DOSSIER = LE CALCUL
   ══════════════════════════════════════════════════════════════════ */
titre("Le tableau R(T) du dossier");

const plans = lire("05_Plans_et_schema.md");
let lignesJustes = 0, lignesVues = 0;
for (const l of tableau()) {
  const signe = l.celsius > 0 ? "+" : "";
  const motif = new RegExp("\\|\\s*" + signe.replace("+", "\\+") + l.celsius + "\\s*\\|([^|]+)\\|([^|]+)\\|");
  const m = plans.match(motif);
  if (!m) continue;
  lignesVues++;
  const ohmsDoc = m[1].replace(/\s|kΩ|Ω/g, "").replace(",", ".");
  const voltsDoc = parseFloat(m[2].replace(/\s|V/g, "").replace(",", "."));
  const ohmsAttendu = l.ohms >= 1000 ? l.ohms / 1000 : l.ohms;
  const ecartR = Math.abs(parseFloat(ohmsDoc) - ohmsAttendu) / ohmsAttendu;
  const ecartV = Math.abs(voltsDoc - l.volts);
  if (ecartR < 0.005 && ecartV < 0.002) lignesJustes++;
}
verifier(lignesVues >= 16, `les 16 points du tableau sont dans 05_Plans_et_schema.md (${lignesVues} vus)`);
verifier(lignesJustes === lignesVues,
  `les ${lignesVues} lignes du tableau correspondent au calcul (${lignesJustes} justes)`);
verifier(plans.includes("125,0 µV") || plans.includes("125,0 µV"),
  "le pas du convertisseur annoncé (125,0 µV) est celui du calibre ±4,096 V");
verifier(Math.abs(HYPOTHESES.LSB * 1e6 - 125.0) < 0.1, "le pas calculé vaut bien 125,0 µV");

/* ══════════════════════════════════════════════════════════════════
   4. LES LIENS
   ══════════════════════════════════════════════════════════════════ */
titre("Les liens et les fichiers cités");

const docs = readdirSync(RACINE).filter((f) => f.endsWith(".md"));
let liensCasses = [];
for (const d of docs) {
  const texte = lire(d);
  for (const m of texte.matchAll(/\]\((?!https?:)([^)#]+)\)/g)) {
    const cible = join(RACINE, m[1]);
    if (!existsSync(cible)) liensCasses.push(`${d} → ${m[1]}`);
  }
}
verifier(liensCasses.length === 0, "tous les liens des dossiers pointent sur un fichier existant",
  liensCasses.join(" · "));

const pages = ["site/index.html", "site/exploitation.html"];
let refsCassees = [];
for (const p of pages) {
  const texte = lire(...p.split("/"));
  for (const m of texte.matchAll(/(?:src|href)="(?!https?:|#)([^"]+)"/g)) {
    const cible = resolve(RACINE, "site", m[1]);
    if (!existsSync(cible)) refsCassees.push(`${p} → ${m[1]}`);
  }
}
verifier(refsCassees.length === 0, "toutes les ressources du site existent", refsCassees.join(" · "));

/* ══════════════════════════════════════════════════════════════════
   5. LA CHARTE inerWeb Édu
   ══════════════════════════════════════════════════════════════════ */
titre("La charte inerWeb Édu");

const cssBrut = [lire("site", "styles.css"), lire("site", "exploitation.css")].join("\n");
const css = sansCommentaires(cssBrut);
verifier(!/prefers-color-scheme/.test(css),
  "AUCUNE règle de mode sombre — la charte l'interdit sans exception");
verifier(/Calibri/.test(css), "le corps de texte est en Calibri");
verifier(/Trebuchet MS/.test(css), "les titres sont en Trebuchet MS");
verifier(/#1b3a63/i.test(css) && /#ff6b35/i.test(css),
  "le bleu #1b3a63 et l'orange #ff6b35 de la charte sont là");
const corps = css.match(/body\s*\{[^}]*font-size:\s*(\d+)px/);
verifier(corps && Number(corps[1]) >= 17,
  `le corps de texte fait au moins 17 px (≈ 13 pt), ici ${corps ? corps[1] : "?"} px`);
verifier(!/text-align:\s*justify/.test(css), "aucun texte justifié (pénible en lecture DYS)");

for (const p of pages) {
  const texte = lire(...p.split("/"));
  verifier(/connect-src 'self'/.test(texte), `${p} interdit toute requête réseau sortante`);
  verifier(/script-src 'self'/.test(texte), `${p} n'exécute que ses propres scripts`);
}
for (const f of ["chaine-acquisition", "pont-diviseur", "cablage-une-voie",
                 "schema-general", "alimentation", "gabarit-percage", "face-avant"]) {
  const svg = lire("illustrations", f + ".svg");
  verifier(/<title/.test(svg) && /<desc/.test(svg),
    `illustrations/${f}.svg porte un titre et une description (lecteur d'écran)`);
}
for (const f of ["gabarit-percage", "face-avant"]) {
  const svg = lire("illustrations", f + ".svg");
  verifier(/width="210mm"\s+height="297mm"/.test(svg) && /viewBox="0 0 210 297"/.test(svg),
    `illustrations/${f}.svg est bien à l'échelle 1:1 sur A4`);
  verifier(/50,0 mm/.test(svg), `illustrations/${f}.svg porte son carré de contrôle de 50 mm`);
}

/* ══════════════════════════════════════════════════════════════════
   6. LES DEUX BOUTS DE LA LIAISON, CONFRONTÉS
   ══════════════════════════════════════════════════════════════════ */
titre("L'analyseur de la page face à ce que le firmware émet");

/* On extrait `analyser()` de exploitation.js et on la fait tourner sur
   des trames écrites au format du firmware. Si l'un des deux dérive,
   ceci tombe — c'est le seul contrôle qui tient les deux bouts. */
const js = lire("site", "exploitation.js");
const debut = js.indexOf("function analyser(ligne) {");
const fin = js.indexOf("\n  }", debut) + 4;
const analyser = new Function(js.slice(debut, fin) + "\nreturn analyser;")();

const cas = [
  { trame: "12:31:05;T1=4.8;T2=-3.2;T3=8.7;T4=52.1;T5=31.4;T6=24.8;BAT=78",
    v: [4.8, -3.2, 8.7, 52.1, 31.4, 24.8], bat: 78, quoi: "trame nominale" },
  { trame: "00:00:01;T1=4.8;T2=;T3=8.7;T4=;T5=31.4;T6=;BAT=",
    v: [4.8, null, 8.7, null, 31.4, null], bat: null, quoi: "champs vides = pas de mesure valable" },
  { trame: "23:59:59;T1=-40.0;T2=180.5;T3=0.0;T4=0.0;T5=0.0;T6=0.0;BAT=0",
    v: [-40, 180.5, 0, 0, 0, 0], bat: 0, quoi: "valeurs extrêmes et zéros" }
];
for (const c of cas) {
  const r = analyser(c.trame);
  const ok = r && JSON.stringify(r.v) === JSON.stringify(c.v) && r.bat === c.bat;
  verifier(ok, `l'analyseur rend bien : ${c.quoi}`,
    ok ? "" : "obtenu " + JSON.stringify(r));
}
verifier(analyser("#ENR-T6-3A7F;v1.0;VOIES=6")?.commentaire !== undefined,
  "l'analyseur reconnaît une ligne de commentaire (#)");
verifier(analyser("n'importe quoi") === null && analyser("") === null,
  "l'analyseur refuse ce qui n'est pas une trame");

/* ══════════════════════════════════════════════════════════════════
   7. LA PROMESSE ET LA RÉSERVE
   ══════════════════════════════════════════════════════════════════ */
titre("Ce que le dossier promet, et ce qu'il réserve");

const readme = lire("README.md");
const ouverts = lire("POINTS-OUVERTS.md");
verifier(/Prototype à réaliser|n'existe pas|N'EXISTE PAS/i.test(readme),
  "le README dit que le prototype n'existe pas");
verifier(/À MESURER/.test(ouverts) && /BLOQUANT/.test(ouverts),
  "POINTS-OUVERTS distingue ce qui bloque de ce qui reste à mesurer");
verifier(/À MESURER/.test(lire("outils", "bilan-energie.mjs")),
  "le bilan d'énergie porte le statut de chacun de ses chiffres");
/* On cherche une PROMESSE CHIFFRÉE d'exactitude, pas le mot « garantit »
   employé à propos d'une diode. Une tolérance de composant (0,1 %) et une
   plage de mesure ne sont pas des promesses d'exactitude. */
const promesses = [...lire("site", "index.html")
  .matchAll(/(?:±|\+\/-)\s*\d+(?:[.,]\d+)?\s*(?:K|°C)|précision de\s+\d|précis à\s+\d/gi)]
  .map((m) => m[0]);
verifier(promesses.length === 0,
  "le site ne promet aucune exactitude chiffrée qu'on n'a pas mesurée",
  promesses.join(" · "));
verifier(/comparatif|pas un appareil de métrologie/i.test(lire("site", "index.html")),
  "le site dit explicitement que l'appareil est comparatif, pas un instrument raccordé");

/* ══════════════════════════════════════════════════════════════════ */
console.log("\n" + "═".repeat(66));
if (echecs.length === 0) {
  console.log(`TOUT VERT — ${total} contrôles passés.`);
  console.log("Reste ce qu'aucune machine ne peut prouver : le bus, l'écran,");
  console.log("le Bluetooth, la consommation. POINTS-OUVERTS.md § B1.");
} else {
  console.log(`${echecs.length} contrôle(s) en échec sur ${total} :`);
  echecs.forEach((e) => console.log("  · " + e));
  process.exit(1);
}
