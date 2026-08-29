/* =====================================================================
   PROGRAMME 06 — LES SIX VOIES
   inerWeb Édu — Enregistreur de températures 6 voies
   ---------------------------------------------------------------------
   CE QUE CE PROGRAMME AJOUTE AU 05
     - les six voies, réparties sur les deux convertisseurs ;
     - un TABLEAU des voies plutôt que six copies du même code ;
     - l'état de chaque voie affiché en clair.

   LA LEÇON DE PROGRAMMATION DU JOUR
     Six fois le même calcul avec six noms de variables différents, c'est
     six fois plus de fautes de frappe possibles. Un tableau et une
     boucle : une seule fois le calcul, six fois la boucle. C'est ce qui
     rend le programme final lisible.

   L'EXPÉRIENCE À FAIRE (séance 3A)
     Brancher UNE sonde, et la déplacer de T1 à T6 en notant à chaque
     fois. Les six voies doivent lire la même chose à 0,3 K près. Un
     écart plus grand sur une voie = une résistance de pont hors valeur,
     ou une soudure froide (contrôle n° 6 de la fiche).
   ===================================================================== */

#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <math.h>

const int BROCHE_SDA = 5;
const int BROCHE_SCL = 6;

Adafruit_ADS1115 a2;    // 0x48
Adafruit_ADS1115 a3;    // 0x49

const float R_REF     = 10000.0f;
const float R25       = 10000.0f;
const float BETA      = 3950.0f;
const float T0_KELVIN = 298.15f;
const float RAPPORT_VEXC = 2.0f;

const uint8_t VOIE_VEXC = 2;    // sur a3

/* --- LE PLAN DES VOIES. Six lignes, et le câblage du § 4.2 est décrit.
   Changer une sonde de place, c'est changer une ligne ici.             */
struct Voie { const char* nom; Adafruit_ADS1115* circuit; uint8_t entree; };
Voie VOIES[6];
const int NB = 6;

/* --- L'état d'une voie. Une température seule ne suffit pas : il faut
   savoir si on peut y croire.                                         */
enum Etat { MESURE, ABSENTE, COURT_CIRCUIT };
struct Releve { Etat etat; float volts; float ohms; float celsius; };

void setup() {
  Serial.begin(115200);
  delay(400);
  Wire.setPins(BROCHE_SDA, BROCHE_SCL);
  Wire.begin();

  Serial.println();
  Serial.println(F("PROGRAMME 06 - les six voies"));

  bool ok = true;
  if (!a2.begin(0x48, &Wire)) { Serial.println(F("A2 (0x48) absent.")); ok = false; }
  if (!a3.begin(0x49, &Wire)) { Serial.println(F("A3 (0x49) absent.")); ok = false; }
  if (!ok) { Serial.println(F("Relancer le programme 03.")); while (true) delay(1000); }

  a2.setGain(GAIN_ONE);  a2.setDataRate(RATE_ADS1115_128SPS);
  a3.setGain(GAIN_ONE);  a3.setDataRate(RATE_ADS1115_128SPS);

  VOIES[0] = { "T1", &a2, 0 };
  VOIES[1] = { "T2", &a2, 1 };
  VOIES[2] = { "T3", &a2, 2 };
  VOIES[3] = { "T4", &a2, 3 };
  VOIES[4] = { "T5", &a3, 0 };
  VOIES[5] = { "T6", &a3, 1 };

  Serial.println(F("Six voies armees. Un balayage par seconde."));
  Serial.println();
}

float lireVolts(Adafruit_ADS1115 &c, uint8_t voie) {
  long somme = 0;
  for (int i = 0; i < 4; i++) somme += c.readADC_SingleEnded(voie);
  return c.computeVolts((int16_t)(somme / 4));
}

float temperatureDepuisVolts(float v, float vexc) {
  float r = R_REF * v / (vexc - v);
  return 1.0f / (1.0f / T0_KELVIN + logf(r / R25) / BETA) - 273.15f;
}

Releve lireVoie(const Voie &voie, float vexc) {
  Releve r;
  r.volts = lireVolts(*voie.circuit, voie.entree);
  if (r.volts > 0.97f * vexc)       { r.etat = ABSENTE;       r.ohms = NAN; r.celsius = NAN; }
  else if (r.volts < 0.01f * vexc)  { r.etat = COURT_CIRCUIT; r.ohms = NAN; r.celsius = NAN; }
  else {
    r.etat    = MESURE;
    r.ohms    = R_REF * r.volts / (vexc - r.volts);
    r.celsius = temperatureDepuisVolts(r.volts, vexc);
  }
  return r;
}

void loop() {
  unsigned long depart = millis();
  float vexc = lireVolts(a3, VOIE_VEXC) * RAPPORT_VEXC;

  Serial.print(F("Vexc = ")); Serial.print(vexc, 3); Serial.println(F(" V"));

  for (int i = 0; i < NB; i++) {
    Releve r = lireVoie(VOIES[i], vexc);
    Serial.print(F("  ")); Serial.print(VOIES[i].nom); Serial.print(F(" : "));
    switch (r.etat) {
      case ABSENTE:
        Serial.print(F("sonde absente        ("));
        Serial.print(r.volts, 3); Serial.println(F(" V)"));
        break;
      case COURT_CIRCUIT:
        Serial.print(F("COURT-CIRCUIT        ("));
        Serial.print(r.volts, 3); Serial.println(F(" V)"));
        break;
      default:
        if (r.celsius >= 0) Serial.print('+');
        Serial.print(r.celsius, 1); Serial.print(F(" C   "));
        Serial.print(r.ohms / 1000.0f, 2); Serial.print(F(" kohm   "));
        Serial.print(r.volts, 3); Serial.println(F(" V"));
    }
  }

  /* La duree du balayage. Elle doit rester sous 400 ms : au-dela, il
     faut baisser le nombre de moyennes ou monter la cadence. */
  Serial.print(F("  (balayage : ")); Serial.print(millis() - depart);
  Serial.println(F(" ms)"));
  Serial.println();

  while (millis() - depart < 1000) delay(5);
}
