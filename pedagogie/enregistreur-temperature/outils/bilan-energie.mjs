/* =====================================================================
   bilan-energie.mjs — L'AUTONOMIE, CALCULÉE À PARTIR D'HYPOTHÈSES DITES
   ---------------------------------------------------------------------
   Le dossier maître demande, en étape 8 de la production : « mesurer sa
   consommation réelle » puis « valider l'autonomie ». Tant que le
   prototype n°1 n'existe pas, PERSONNE ne connaît ce chiffre.

   Ce script ne le fabrique donc pas : il pose des hypothèses, les
   affiche, et calcule ce qui en découle. Chaque hypothèse porte sa
   source et son statut. Quand Franck aura branché le voltampèremètre
   USB, il remplace la valeur, relance, et le dossier se met à jour.

   Un chiffre « MESURÉ » remplace un chiffre « À MESURER ». Jamais
   l'inverse.

   Usage :  node bilan-energie.mjs
   ===================================================================== */

import { HYPOTHESES, resistanceNTC } from "./table-ntc.mjs";

/* --- Les piles. Là, les chiffres sont ceux des fabricants. ---------- */
export const PILES = {
  nombre: 3,
  type: "AA alcaline LR6",
  // 2,6 Ah est la capacité annoncée par les fabricants pour un débit de
  // ~50 mA jusqu'à 0,9 V/élément. Sous forte pointe (émission BLE), la
  // capacité utile chute : on retient volontairement 2,2 Ah.
  capaciteAh: 2.2,
  tensionMoyenneParElement: 1.25,     // V, moyenne sur la décharge
  statut: "constructeur, marge prise"
};

/* --- Les consommateurs. Statut de chaque ligne, en clair. ---------- */
export const CONSOMMATEURS = [
  {
    nom: "ESP32-C3 — BLE actif, écran rafraîchi 1 fois/s",
    mA: 30,
    statut: "À MESURER — ordre de grandeur d'après la fiche Espressif (modem actif)"
  },
  {
    nom: "Écran OLED 128×64 — affichage texte, ~25 % de pixels allumés",
    mA: 8,
    statut: "À MESURER — dépend fortement du nombre de pixels allumés"
  },
  {
    nom: "2 × ADS1115 — conversion continue",
    mA: 0.30,
    statut: "fiche technique Texas Instruments, 150 µA par circuit"
  },
  {
    nom: "6 ponts diviseurs NTC — permanents",
    mA: null,                            // calculé plus bas
    statut: "CALCULÉ — dépend de la température des sondes"
  },
  {
    nom: "Pont de mesure des piles (2 × 100 kΩ)",
    mA: 4.5 / 200000 * 1000,
    statut: "CALCULÉ"
  }
];

/* Les ponts consomment plus quand il fait FROID : la NTC monte en
   résistance… non : plus la NTC est chaude, plus sa résistance chute,
   plus le courant monte. Le cas le plus consommateur est donc le point
   chaud. On calcule les deux bornes.                                   */
export function courantPonts(tCelsius, h = HYPOTHESES) {
  const R = resistanceNTC(tCelsius, h);
  return 6 * (h.V_EXC / (R + h.R_REF)) * 1000;   // mA
}

export function bilan(tCelsius = 20) {
  const lignes = CONSOMMATEURS.map((c) =>
    c.mA === null ? { ...c, mA: courantPonts(tCelsius) } : { ...c });
  const totalMa = lignes.reduce((s, c) => s + c.mA, 0);

  const energieWh = PILES.nombre * PILES.tensionMoyenneParElement * PILES.capaciteAh;
  // Le convertisseur ne rend pas tout : 85 % est une valeur courante pour
  // un abaisseur-élévateur de cette gamme, à confirmer sur l'exemplaire.
  const rendement = 0.85;
  const energieUtileWh = energieWh * rendement;
  const puissanceW = totalMa / 1000 * 3.3;
  const heures = energieUtileWh / puissanceW;

  return { tCelsius, lignes, totalMa, energieWh, rendement, energieUtileWh, puissanceW, heures };
}

const fr = (n, d) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

if (import.meta.url === "file://" + process.argv[1]) {
  const b = bilan(20);
  console.log("BILAN D'ÉNERGIE — sondes à 20 °C\n");
  console.log("| Consommateur | Courant | Statut du chiffre |");
  console.log("|---|---:|---|");
  for (const l of b.lignes) console.log(`| ${l.nom} | ${fr(l.mA, 2)} mA | ${l.statut} |`);
  console.log(`| **Total** | **${fr(b.totalMa, 1)} mA** | |`);
  console.log("");
  console.log(`Énergie embarquée   : ${PILES.nombre} × ${PILES.type}, ${fr(b.energieWh, 1)} Wh`);
  console.log(`Rendement retenu    : ${fr(b.rendement * 100, 0)} %  → ${fr(b.energieUtileWh, 1)} Wh utiles`);
  console.log(`Puissance appelée   : ${fr(b.puissanceW, 2)} W sous 3,3 V`);
  console.log(`AUTONOMIE CALCULÉE  : ${fr(b.heures, 0)} h, soit ${fr(b.heures / 24, 1)} jours`);
  console.log("");
  console.log("Courant des 6 ponts selon la température des sondes :");
  for (const t of [-20, 0, 20, 50, 80]) {
    console.log(`  ${String(t).padStart(3)} °C → ${fr(courantPonts(t), 2)} mA`);
  }
  console.log("");
  console.log("⚠  Ce chiffre n'est PAS une mesure. Il tombe dès que le");
  console.log("   prototype n°1 passe au voltampèremètre USB (étape 8 du");
  console.log("   dossier maître). Ne pas l'annoncer aux élèves comme un fait.");
}
