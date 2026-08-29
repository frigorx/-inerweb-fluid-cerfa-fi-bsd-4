/* =====================================================================
   PROGRAMME 05 — LA PREMIÈRE TEMPÉRATURE
   inerWeb Édu — Enregistreur de températures 6 voies
   ---------------------------------------------------------------------
   C'EST LE PROGRAMME CENTRAL DU PROJET. Tout ce qui suit n'en est
   qu'une multiplication par six, un affichage et une transmission.

   LA CHAÎNE, EN QUATRE LIGNES DE CALCUL
        tension mesuree            (le convertisseur l'a donnee)
     -> resistance de la NTC       (on renverse le pont diviseur)
     -> temperature en kelvins     (on renverse la loi de la NTC)
     -> temperature en degres      (on retire 273,15)

   LES DEUX FORMULES, ET ELLES TIENNENT SUR UNE LIGNE CHACUNE

     Le pont :        V = Vexc x Rntc / (Rntc + Rref)
     donc             Rntc = Rref x V / (Vexc - V)

     La NTC (loi B) : 1/T = 1/T0 + (1/B) x ln(Rntc / R25)

   L'ASTUCE QUI VAUT UN DEMI-DEGRÉ
     Vexc n'est pas supposee : elle est MESUREE, sur la voie A2 du second
     convertisseur. Comme les deux lectures passent par le meme
     convertisseur, son erreur de gain se simplifie dans le rapport
     V / (Vexc - V) et disparait completement.
     Demonstration en trois lignes : 05_Plans_et_schema.md § 4.3.

   L'EXPÉRIENCE À FAIRE (séance 3A, 20 minutes)
     - sonde a l'air libre        -> temperature d'atelier
     - sonde serree dans la main  -> monte vers 30-33 degres, lentement
     - sonde dans l'eau glacee    -> descend vers 0 degre
     Chronometrer la descente : elle prend une minute. Ce n'est pas une
     panne, c'est l'INERTIE de la gaine inox.
   ===================================================================== */

#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <math.h>

const int BROCHE_SDA = 5;
const int BROCHE_SCL = 6;

Adafruit_ADS1115 a2;    // 0x48 : T1 a T4
Adafruit_ADS1115 a3;    // 0x49 : T5, T6, Vexc, piles

/* --- LES CONSTANTES DU MONTAGE. Elles sont ici, en clair, et nulle part
   ailleurs. Changer la sonde ou la resistance, c'est changer ces
   quatre lignes — rien d'autre.                                        */
const float R_REF      = 10000.0f;   // ohms, resistance fixe du pont, 0,1 %
const float R25        = 10000.0f;   // ohms, NTC a 25 degres
const float BETA       = 3950.0f;    // kelvins, coefficient B de la sonde
const float T0_KELVIN  = 298.15f;    // 25 degres en kelvins

/* Le diviseur qui ramene Vexc dans les rails du convertisseur.
   Deux resistances EGALES : le rapport vaut 2. */
const float RAPPORT_VEXC = 2.0f;

const uint8_t VOIE_T1   = 0;   // sur a2
const uint8_t VOIE_VEXC = 2;   // sur a3

void setup() {
  Serial.begin(115200);
  delay(400);
  Wire.setPins(BROCHE_SDA, BROCHE_SCL);
  Wire.begin();

  Serial.println();
  Serial.println(F("PROGRAMME 05 - la premiere temperature"));

  bool ok = true;
  if (!a2.begin(0x48, &Wire)) { Serial.println(F("A2 (0x48) absent.")); ok = false; }
  if (!a3.begin(0x49, &Wire)) { Serial.println(F("A3 (0x49) absent.")); ok = false; }
  if (!ok) { Serial.println(F("Relancer le programme 03.")); while (true) delay(1000); }

  a2.setGain(GAIN_ONE);  a2.setDataRate(RATE_ADS1115_128SPS);
  a3.setGain(GAIN_ONE);  a3.setDataRate(RATE_ADS1115_128SPS);

  Serial.println(F("Les deux convertisseurs repondent."));
  Serial.println();
  Serial.println(F("Vexc ; V(T1) ; R(T1) ; T1"));
}

/* --- Moyenne de 4 lectures. Le condensateur de 100 nF filtre le materiel,
   ces quatre lectures filtrent ce qui reste. Cout : 34 ms.             */
float lireVolts(Adafruit_ADS1115 &c, uint8_t voie) {
  long somme = 0;
  for (int i = 0; i < 4; i++) somme += c.readADC_SingleEnded(voie);
  return c.computeVolts((int16_t)(somme / 4));
}

/* --- Le pont diviseur, renverse. -------------------------------------- */
float resistanceNTC(float volts, float vexc) {
  if (vexc - volts < 0.001f) return NAN;      // division par zero evitee
  return R_REF * volts / (vexc - volts);
}

/* --- La loi de la NTC, renversee. ------------------------------------- */
float temperatureNTC(float resistance) {
  if (isnan(resistance) || resistance <= 0.0f) return NAN;
  float inverseT = 1.0f / T0_KELVIN + logf(resistance / R25) / BETA;
  return 1.0f / inverseT - 273.15f;
}

void loop() {
  /* 1. la tension d'excitation, mesuree et non supposee */
  float vexc = lireVolts(a3, VOIE_VEXC) * RAPPORT_VEXC;

  /* 2. la tension du pont n1 */
  float v1 = lireVolts(a2, VOIE_T1);

  Serial.print(vexc, 4); Serial.print(F(" V ; "));
  Serial.print(v1, 4);   Serial.print(F(" V ; "));

  /* 3. l'etat de la voie AVANT tout calcul : une sonde absente ne
     produit pas une temperature farfelue, elle produit un message.   */
  if (v1 > 0.97f * vexc) {
    Serial.println(F("- ; SONDE ABSENTE"));
  } else if (v1 < 0.01f * vexc) {
    Serial.println(F("- ; COURT-CIRCUIT"));
  } else {
    float r = resistanceNTC(v1, vexc);
    float t = temperatureNTC(r);
    Serial.print(r, 0);  Serial.print(F(" ohms ; "));
    Serial.print(t, 2);  Serial.println(F(" degres"));
  }

  delay(1000);
}
