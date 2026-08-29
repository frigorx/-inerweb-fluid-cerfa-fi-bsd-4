/* =====================================================================
   table-ntc.mjs — LES CHIFFRES DU DOSSIER, CALCULÉS ET NON RECOPIÉS
   ---------------------------------------------------------------------
   Toute valeur numérique citée dans 05_Plans_et_schema.md et dans le
   dossier élève sort d'ici. Personne ne recopie un tableau trouvé sur
   internet : on donne le modèle, ses hypothèses, et la machine calcule.

   Un élève doit pouvoir refaire le calcul à la main sur une ligne.
   L'enseignant doit pouvoir changer B, R25 ou R_ref et voir le tableau
   bouger — c'est ce qui rend le pont diviseur compréhensible.

   Usage :  node table-ntc.mjs            → le tableau du dossier
            node table-ntc.mjs --csv      → le même en CSV
            node table-ntc.mjs --json     → pour les pages du site
   ===================================================================== */

/* --- Les hypothèses. Elles sont ici, en clair, et nulle part ailleurs. */
export const HYPOTHESES = {
  R25: 10000,        // ohms  — résistance nominale de la NTC à 25 °C
  B: 3950,           // kelvin — coefficient B (B25/50), gravé sur la sonde
  T0: 298.15,        // kelvin — 25 °C, la température de référence du B
  R_REF: 10000,      // ohms  — résistance fixe du pont diviseur (0,1 %)
  V_EXC: 3.30,       // volts — tension d'excitation nominale du pont
  LSB: 4.096 / 32768 // volts — un pas de l'ADS1115 en calibre ±4,096 V
};

/* --- Le modèle β. Une seule ligne, et c'est toute la physique du TP.
   1/T = 1/T0 + (1/B)·ln(R/R25)  →  R = R25 · exp(B·(1/T − 1/T0))       */
export const resistanceNTC = (tCelsius, h = HYPOTHESES) =>
  h.R25 * Math.exp(h.B * (1 / (tCelsius + 273.15) - 1 / h.T0));

/* --- Le chemin inverse, celui que le microcontrôleur emprunte. */
export const temperatureNTC = (r, h = HYPOTHESES) =>
  1 / (1 / h.T0 + Math.log(r / h.R25) / h.B) - 273.15;

/* --- Le pont : NTC côté masse, résistance fixe côté 3,3 V.
   V = V_EXC · R_ntc / (R_ntc + R_REF)                                  */
export const tensionPont = (rNtc, h = HYPOTHESES) =>
  h.V_EXC * rNtc / (rNtc + h.R_REF);

/* --- Et son inverse, celui du programme 05. La mesure de V_EXC entre
   ici : c'est elle qui annule l'erreur de gain de l'ADS1115.           */
export const resistanceDepuisTension = (v, vExc, h = HYPOTHESES) =>
  h.R_REF * v / (vExc - v);

/* --- Sensibilité : combien de volts par kelvin autour de T ?
   Dérivée analytique, pas une différence finie approximative.
     dR/dT = −R·B/T²      dV/dR = V_EXC·R_REF/(R+R_REF)²                */
export function sensibilite(tCelsius, h = HYPOTHESES) {
  const T = tCelsius + 273.15;
  const R = resistanceNTC(tCelsius, h);
  const dRdT = -R * h.B / (T * T);
  const dVdR = h.V_EXC * h.R_REF / Math.pow(R + h.R_REF, 2);
  const dVdT = dRdT * dVdR;
  return { R, dRdT, dVdT, kelvinParLSB: Math.abs(h.LSB / dVdT) };
}

/* --- Auto-échauffement : la sonde chauffée par sa propre mesure.
   P = V_ntc² / R_ntc, et l'échauffement vaut P / δ (δ = constante de
   dissipation de la sonde, en mW/K, donnée par le fabricant).         */
export function autoEchauffement(tCelsius, deltaMilliWattParK, h = HYPOTHESES) {
  const R = resistanceNTC(tCelsius, h);
  const V = tensionPont(R, h);
  const pMilliWatt = (V * V / R) * 1000;
  return { pMilliWatt, kelvin: pMilliWatt / deltaMilliWattParK };
}

const POINTS = [-30, -20, -10, -5, 0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100];

export function tableau(h = HYPOTHESES) {
  return POINTS.map((t) => {
    const R = resistanceNTC(t, h);
    const V = tensionPont(R, h);
    const s = sensibilite(t, h);
    return {
      celsius: t,
      ohms: R,
      volts: V,
      codeADS: Math.round(V / h.LSB),
      milliVoltParK: Math.abs(s.dVdT) * 1000,
      kelvinParLSB: s.kelvinParLSB
    };
  });
}

/* --- Rendus ------------------------------------------------------- */
const fr = (n, d) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

function rendreTexte() {
  const h = HYPOTHESES;
  const lignes = [];
  lignes.push("NTC 10 kΩ B3950 — pont diviseur 10 kΩ 0,1 % sous " + fr(h.V_EXC, 2) + " V");
  lignes.push("ADS1115 calibre ±4,096 V — un pas = " + fr(h.LSB * 1e6, 1) + " µV");
  lignes.push("");
  lignes.push("| °C | R_NTC | V mesurée | code ADS | sensibilité | °C par pas |");
  lignes.push("|---:|---:|---:|---:|---:|---:|");
  for (const l of tableau(h)) {
    lignes.push(
      "| " + (l.celsius > 0 ? "+" : "") + l.celsius +
      " | " + (l.ohms >= 1000 ? fr(l.ohms / 1000, 2) + " kΩ" : fr(l.ohms, 0) + " Ω") +
      " | " + fr(l.volts, 3) + " V" +
      " | " + l.codeADS.toLocaleString("fr-FR") +
      " | " + fr(l.milliVoltParK, 1) + " mV/K" +
      " | " + fr(l.kelvinParLSB, 4) + " |"
    );
  }
  return lignes.join("\n");
}

if (import.meta.url === "file://" + process.argv[1]) {
  const mode = process.argv[2] || "";
  if (mode === "--json") {
    console.log(JSON.stringify({ hypotheses: HYPOTHESES, tableau: tableau() }, null, 2));
  } else if (mode === "--csv") {
    console.log("celsius;ohms;volts;codeADS;mV_par_K;K_par_pas");
    for (const l of tableau()) {
      console.log([l.celsius, l.ohms.toFixed(1), l.volts.toFixed(4), l.codeADS,
        l.milliVoltParK.toFixed(2), l.kelvinParLSB.toFixed(5)].join(";"));
    }
  } else {
    console.log(rendreTexte());
  }
}
