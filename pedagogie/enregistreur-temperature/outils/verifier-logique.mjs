/* =====================================================================
   verifier-logique.mjs — LE PROGRAMME FINAL, EXÉCUTÉ ET CONTRÔLÉ
   ---------------------------------------------------------------------
   Découpe les fonctions PURES de `11-version-finale.ino`, les compile
   avec g++ à côté d'un banc d'essai, et vérifie que :

     1. la température calculée par le firmware est celle du modèle de
        `table-ntc.mjs`, sur les 16 points du tableau du dossier ;
     2. la trame est exactement au format du § 26 du dossier maître ;
     3. les champs vides veulent bien dire « pas de mesure valable » ;
     4. la table des piles est monotone et bornée ;
     5. l'analyseur de commandes accepte ce qu'il doit accepter et
        refuse ce qu'il doit refuser — étalonnage compris.

   LE CODE TESTÉ EST LE CODE EMBARQUÉ : il est extrait du .ino à chaque
   exécution, jamais recopié. Si quelqu'un modifie le firmware et casse
   la physique, ce contrôle tombe.

   Usage :  node verifier-logique.mjs
   ===================================================================== */

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { HYPOTHESES, tableau, resistanceNTC, tensionPont } from "./table-ntc.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(ICI, "..", "programmes", "11-version-finale", "11-version-finale.ino");

/* --- Le découpage. Une fonction commence à sa signature et se termine
   à la première accolade fermante en colonne 1. C'est vrai de tout le
   fichier, parce qu'il est écrit comme ça.                            */
function extraireFonction(src, signature) {
  /* On cherche la DEFINITION (signature suivie d'une accolade), jamais la
     declaration anticipee du haut du fichier — sinon on emporterait la
     classe qui la suit. */
  const i = src.indexOf(signature + " {");
  if (i < 0) throw new Error("fonction introuvable : " + signature);
  const j = src.indexOf("\n}", i);
  if (j < 0) throw new Error("fin de fonction introuvable : " + signature);
  return src.slice(i, j + 2);
}

function extraireBloc(src, debut, fin) {
  const i = src.indexOf(debut);
  const j = src.indexOf(fin, i);
  if (i < 0 || j < 0) throw new Error("bloc introuvable : " + debut);
  return src.slice(i, j + fin.length);
}

const src = readFileSync(SOURCE, "utf8");

const morceaux = [
  extraireBloc(src, "const float R_REF", "const float SEUIL_ABSENTE = 0.97f, SEUIL_COURT = 0.01f;"),
  extraireBloc(src, "struct PointPile", "const int NB_POINTS = sizeof(COURBE) / sizeof(COURBE[0]);"),
  "enum Etat { MESURE, ABSENTE, COURT_CIRCUIT, HORS_SERVICE };",
  "struct Releve { Etat etat; float volts; float celsius; };",
  "Releve releves[6];",
  "float decalage[6] = {0,0,0,0,0,0};",
  "float mini[6], maxi[6];",
  "bool extremaArmes = false;",
  "float vexc = 3.30f; int pourcentPiles = -1;",
  "long decalageHorloge = 0; unsigned long intervalleMs = 1000;",
  "void envoyerIdentite() { emettre(\"#IDENTITE\"); }",
  extraireFonction(src, "bool etalonnageActif()"),
  extraireFonction(src, "float temperatureDepuisVolts(float v, float vexc)"),
  extraireFonction(src, "int pourcentDepuisVolts(float v)"),
  extraireFonction(src, "void heureCourante(char *sortie, size_t taille)"),
  extraireFonction(src, "void construireTrame(char *sortie, size_t taille)"),
  extraireFonction(src, "void formater(const Releve &r, char *sortie)"),
  extraireFonction(src, "void listerEtalonnage()"),
  extraireFonction(src, "void listerExtrema()"),
  extraireFonction(src, "void traiterCommande(String cmd)")
];

/* --- Le petit programme d'essai qui exerce tout ça. ------------------ */
const ESSAI = `
int echecs = 0;
void verifier(bool ok, const char* quoi) {
  if (!ok) { printf("ECHEC ; %s\\n", quoi); echecs++; }
}
int main(int argc, char** argv) {
  if (argc > 1 && std::string(argv[1]) == "--temperatures") {
    // Une ligne "volts;vexc" par entree standard -> une temperature par ligne.
    double v, ve;
    while (scanf("%lf;%lf", &v, &ve) == 2) printf("%.6f\\n", temperatureDepuisVolts((float)v, (float)ve));
    return 0;
  }
  if (argc > 1 && std::string(argv[1]) == "--piles") {
    double v; while (scanf("%lf", &v) == 1) printf("%d\\n", pourcentDepuisVolts((float)v));
    return 0;
  }

  char t[128];

  /* --- LA TRAME, cas nominal du paragraphe 26 du dossier maitre ----- */
  __millis = 0; decalageHorloge = 12L*3600 + 31*60 + 5;
  float valeurs[6] = { 4.8f, -3.2f, 8.7f, 52.1f, 31.4f, 24.8f };
  for (int i = 0; i < 6; i++) { releves[i].etat = MESURE; releves[i].celsius = valeurs[i]; }
  pourcentPiles = 78;
  construireTrame(t, sizeof(t));
  verifier(std::string(t) == "12:31:05;T1=4.8;T2=-3.2;T3=8.7;T4=52.1;T5=31.4;T6=24.8;BAT=78",
           "trame nominale du paragraphe 26");

  /* --- CHAMPS VIDES : sonde absente, court-circuit, hors service ----- */
  releves[1].etat = ABSENTE;
  releves[3].etat = COURT_CIRCUIT;
  releves[5].etat = HORS_SERVICE;
  pourcentPiles = -1;
  construireTrame(t, sizeof(t));
  verifier(std::string(t) == "12:31:05;T1=4.8;T2=;T3=8.7;T4=;T5=31.4;T6=;BAT=",
           "champs vides pour toute voie sans mesure valable");

  /* --- L'HORLOGE tourne et repasse a zero a minuit ------------------- */
  __millis = 0; decalageHorloge = 23L*3600 + 59*60 + 59;
  heureCourante(t, sizeof(t)); verifier(std::string(t) == "23:59:59", "horloge 23:59:59");
  __millis = 2000;
  heureCourante(t, sizeof(t)); verifier(std::string(t) == "00:00:01", "passage de minuit");

  /* --- L'AFFICHAGE fait toujours 5 caracteres ----------------------- */
  Releve r;
  r.etat = MESURE;       r.celsius =   4.8f; formater(r, t); verifier(std::string(t) == " +4.8", "affichage +4,8");
  r.etat = MESURE;       r.celsius =  -3.2f; formater(r, t); verifier(std::string(t) == " -3.2", "affichage -3,2");
  r.etat = MESURE;       r.celsius = 152.1f; formater(r, t); verifier(std::string(t) == " +152", "affichage 152,1 sans decimale, toujours 5 caracteres");
  r.etat = ABSENTE;                          formater(r, t); verifier(std::string(t) == " ----", "affichage sonde absente");
  r.etat = COURT_CIRCUIT;                    formater(r, t); verifier(std::string(t) == "  -CC", "affichage court-circuit");
  r.etat = HORS_SERVICE;                     formater(r, t); verifier(std::string(t) == "  -HS", "affichage circuit hors service");
  r.etat = MESURE;       r.celsius = -120.0f; formater(r, t); verifier(std::string(t) == " -120", "affichage negatif a trois chiffres");
  r.etat = MESURE;       r.celsius = 2500.0f; formater(r, t); verifier(std::string(t) == " HORS", "affichage hors plage");
  for (int i = 0; i < 6; i++) { Releve q; q.etat = MESURE; q.celsius = -99.9f + i * 40.0f; formater(q, t);
    verifier(strlen(t) == 5, "toute valeur mesurable tient en 5 caracteres"); }

  /* --- LES COMMANDES ------------------------------------------------- */
  __emis.clear(); traiterCommande(String("I=5"));
  verifier(intervalleMs == 5000, "commande I=5 change l'intervalle");
  __emis.clear(); traiterCommande(String("I=0"));
  verifier(intervalleMs == 5000 && __emis.size() && __emis[0].rfind("#ERREUR", 0) == 0, "I=0 refuse");
  __emis.clear(); traiterCommande(String("I=99999"));
  verifier(intervalleMs == 5000 && __emis.size() && __emis[0].rfind("#ERREUR", 0) == 0, "I=99999 refuse");

  __millis = 0;
  __emis.clear(); traiterCommande(String("H=14:05:30"));
  heureCourante(t, sizeof(t)); verifier(std::string(t) == "14:05:30", "commande H= regle l'horloge");
  __emis.clear(); traiterCommande(String("H=25:00:00"));
  verifier(__emis.size() && __emis[0].rfind("#ERREUR", 0) == 0, "H=25:00:00 refuse");

  /* --- L'ETALONNAGE, tel qu'il se fait en classe --------------------- */
  for (int i = 0; i < 6; i++) decalage[i] = 0.0f;
  releves[2].etat = MESURE; releves[2].celsius = 0.4f;      // la voie 3 lit +0,4
  __emis.clear(); traiterCommande(String("ZC3=0.0"));        // bain d'eau glacee
  verifier(fabsf(decalage[2] - (-0.4f)) < 0.001f, "ZC3=0.0 pose le bon decalage");
  verifier(__emis.size() && __emis[0].rfind("#OK", 0) == 0, "ZC3 accuse reception");
  verifier(etalonnageActif(), "l'etalonnage est signale actif");

  releves[2].celsius = 0.4f + decalage[2];                   // la voie lit maintenant 0,0
  __emis.clear(); traiterCommande(String("ZC3=0.0"));
  verifier(fabsf(decalage[2] - (-0.4f)) < 0.001f, "un second etalonnage au meme point ne derive pas");

  __emis.clear(); traiterCommande(String("ZC9=0.0"));
  verifier(__emis.size() && __emis[0].rfind("#ERREUR", 0) == 0, "voie 9 refusee");
  releves[4].etat = ABSENTE;
  __emis.clear(); traiterCommande(String("ZC5=0.0"));
  verifier(__emis.size() && __emis[0].rfind("#ERREUR", 0) == 0, "etalonner une voie sans sonde est refuse");

  releves[0].etat = MESURE; releves[0].celsius = 50.0f;
  __emis.clear(); traiterCommande(String("ZC1=0.0"));
  verifier(__emis.size() && __emis[0].rfind("#ERREUR", 0) == 0, "ecart superieur a 10 K refuse");

  __emis.clear(); traiterCommande(String("Z2=+0.35"));
  verifier(fabsf(decalage[1] - 0.35f) < 0.001f, "Z2=+0,35 impose le decalage");
  __emis.clear(); traiterCommande(String("Z2=12.0"));
  verifier(fabsf(decalage[1] - 0.35f) < 0.001f, "decalage hors bornes refuse");

  __emis.clear(); traiterCommande(String("ZR"));
  verifier(!etalonnageActif(), "ZR efface tous les decalages");

  __emis.clear(); traiterCommande(String("Z?"));
  verifier(__emis.size() && __emis[0].rfind("#ETAL", 0) == 0, "Z? renvoie la liste");
  __emis.clear(); traiterCommande(String("nimportequoi"));
  verifier(__emis.size() && __emis[0].rfind("#ERREUR", 0) == 0, "commande inconnue refusee");

  if (echecs == 0) printf("OK\\n");
  return echecs == 0 ? 0 : 1;
}
`;

const dossier = mkdtempSync(join(tmpdir(), "enr-t6-"));
const fichier = join(dossier, "essai.cpp");
writeFileSync(fichier,
  `#include "${join(ICI, "banc-arduino.h")}"\n\n` + morceaux.join("\n\n") + "\n" + ESSAI);

const binaire = join(dossier, "essai");
const echecs = [];
function dire(ok, quoi) {
  console.log((ok ? "  OK   " : "  ECHEC") + "  " + quoi);
  if (!ok) echecs.push(quoi);
}

console.log("Contrôle de la logique embarquée — 11-version-finale.ino");
console.log("(le code testé est extrait du .ino, jamais recopié)\n");

try {
  const bruit = execFileSync("g++", ["-std=c++17", "-O1", "-Wall", "-Wextra", "-o", binaire, fichier],
                             { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  const avertissements = (bruit || "").split("\n").filter((l) => l.includes("warning:"));
  dire(true, "le firmware compile");
  if (avertissements.length) {
    dire(false, `${avertissements.length} avertissement(s) du compilateur`);
    avertissements.slice(0, 8).forEach((l) => console.log("         " + l.trim()));
  } else {
    dire(true, "aucun avertissement du compilateur (-Wall -Wextra)");
  }
} catch (e) {
  const sortie = (e.stderr || "").toString();
  console.log(sortie);
  dire(false, "compilation du firmware");
  process.exit(1);
}

/* --- 1. LA PHYSIQUE, point par point, contre le modèle de référence. */
const points = tableau();
const entree = points.map((p) => `${p.volts.toFixed(6)};${HYPOTHESES.V_EXC.toFixed(6)}`).join("\n") + "\n";
const rendues = execFileSync(binaire, ["--temperatures"], { input: entree })
  .toString().trim().split("\n").map(Number);

let pireEcart = 0, pireOu = 0;
points.forEach((p, i) => {
  const ecart = Math.abs(rendues[i] - p.celsius);
  if (ecart > pireEcart) { pireEcart = ecart; pireOu = p.celsius; }
});
dire(pireEcart < 0.01,
  `température du firmware = modèle de référence sur 16 points (écart max ${pireEcart.toFixed(4)} K, à ${pireOu} °C)`);

/* --- 2. Le firmware doit tenir même hors du tableau. ---------------- */
const extremes = [-36, -35, 90, 150, 180];
const entree2 = extremes.map((t) => `${tensionPont(resistanceNTC(t)).toFixed(6)};${HYPOTHESES.V_EXC.toFixed(6)}`).join("\n") + "\n";
const rendues2 = execFileSync(binaire, ["--temperatures"], { input: entree2 })
  .toString().trim().split("\n").map(Number);
const okExtremes = extremes.every((t, i) => Math.abs(rendues2[i] - t) < 0.02);
dire(okExtremes, "température juste aussi aux deux bouts de la fenêtre (−36 °C à +180 °C)");

/* --- 3. La table des piles : bornée, monotone, sans trou. ----------- */
const tensions = [];
for (let v = 5.0; v >= 2.5; v -= 0.05) tensions.push(v.toFixed(3));
const pourcents = execFileSync(binaire, ["--piles"], { input: tensions.join("\n") + "\n" })
  .toString().trim().split("\n").map(Number);
const bornee   = pourcents.every((p) => p >= 0 && p <= 100);
const monotone = pourcents.every((p, i) => i === 0 || p <= pourcents[i - 1]);
dire(bornee,   "pourcentage de piles toujours entre 0 et 100");
dire(monotone, "pourcentage de piles décroissant avec la tension (jamais de remontée)");

/* --- 4. Le reste : trame, affichage, commandes, étalonnage. --------- */
try {
  const sortie = execFileSync(binaire, [], { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
  dire(sortie === "OK", "trame, horloge, affichage, commandes et étalonnage");
} catch (e) {
  console.log((e.stdout || "").toString());
  dire(false, "trame, horloge, affichage, commandes et étalonnage");
}

console.log("");
if (echecs.length === 0) {
  console.log("TOUT VERT. La logique embarquée fait ce que le dossier annonce.");
  console.log("Reste ce qu'aucun PC ne peut prouver : le bus, l'écran, le BLE,");
  console.log("la consommation. Voir POINTS-OUVERTS.md § B1.");
} else {
  console.log(`${echecs.length} contrôle(s) en échec.`);
  process.exit(1);
}
