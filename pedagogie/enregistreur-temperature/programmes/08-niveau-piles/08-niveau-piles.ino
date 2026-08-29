/* =====================================================================
   PROGRAMME 08 — LE NIVEAU DES PILES
   inerWeb Édu — Enregistreur de températures 6 voies
   ---------------------------------------------------------------------
   CE QUE CE PROGRAMME AJOUTE AU 07
     La huitième et dernière voie du montage : la tension du pack de
     piles, divisée par deux, sur l'entrée A3 du second convertisseur.

   TROIS CHOSES QU'IL FAUT DIRE AUX ÉLÈVES AVANT

   1. LE POURCENTAGE EST UNE ESTIMATION, PAS UNE MESURE.
      Une pile alcaline ne se vide pas en ligne droite. Sa tension reste
      longtemps sur un plateau, puis s'effondre. Convertir une tension en
      pourcentage demande une courbe, et cette courbe dépend du courant,
      de la marque et de la température. La table ci-dessous est
      indicative. Elle est fausse de quelques pour cent, et elle le dit.

   2. LE MONTAGE SAIT S'IL EST SUR PILES OU SUR USB, TOUT SEUL.
      Le pont de mesure est câblé APRÈS le sélecteur (05_Plans § 8.4).
      En position 0 ou USB, il lit 0 V. Ce n'est pas une panne : c'est
      l'information « je ne suis pas sur piles ».

   3. LA VRAIE COURBE, C'EST UNE SÉANCE.
      Laisser un appareil tourner sur piles neuves, relever la tension
      toutes les heures jusqu'à l'arrêt, tracer. On obtient LA courbe de
      CE montage, et on corrige la table. C'est du travail de métrologie,
      et ça se fait en tâche de fond pendant d'autres séances.
   ===================================================================== */

#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <U8g2lib.h>
#include <math.h>

const int BROCHE_SDA = 5;
const int BROCHE_SCL = 6;

Adafruit_ADS1115 a2, a3;
U8G2_SH1106_128X64_NONAME_F_HW_I2C ecran(U8G2_R0, U8X8_PIN_NONE);
// U8G2_SSD1306_128X64_NONAME_F_HW_I2C ecran(U8G2_R0, U8X8_PIN_NONE);

const float R_REF = 10000.0f, R25 = 10000.0f, BETA = 3950.0f, T0_KELVIN = 298.15f;
const float RAPPORT_VEXC  = 2.0f;    // R7 = R8 = 10 kohm 0,1 %
const float RAPPORT_PILES = 2.0f;    // R9 = R10 = 100 kohm 1 %
const uint8_t VOIE_VEXC  = 2;
const uint8_t VOIE_PILES = 3;

/* En dessous de ce seuil, il n'y a pas de piles derriere le selecteur. */
const float SEUIL_PRESENCE_PILES = 1.00f;   // volts au pack

/* --- LA TABLE. Tension du pack de 3 elements -> pourcentage restant.
   Forme caracteristique d'une alcaline : long plateau, puis genou.
   VALEURS INDICATIVES, a corriger apres une decharge reelle.          */
struct PointPile { float volts; int pourcent; };
const PointPile COURBE[] = {
  { 4.65f, 100 },
  { 4.35f,  80 },
  { 4.05f,  55 },
  { 3.75f,  30 },
  { 3.45f,  12 },
  { 3.15f,   3 },
  { 2.85f,   0 }
};
const int NB_POINTS = sizeof(COURBE) / sizeof(COURBE[0]);

struct Voie { const char* nom; Adafruit_ADS1115* circuit; uint8_t entree; };
Voie VOIES[6];
enum Etat { MESURE, ABSENTE, COURT_CIRCUIT };
struct Releve { Etat etat; float volts; float celsius; };
Releve releves[6];

float vexc = 3.30f;
float vPiles = 0.0f;
int   pourcentPiles = -1;     // -1 = pas sur piles

void setup() {
  Serial.begin(115200);
  delay(400);
  Wire.setPins(BROCHE_SDA, BROCHE_SCL);
  Wire.begin();
  ecran.begin();
  ecran.setBusClock(400000);

  bool ok = a2.begin(0x48, &Wire);
  ok = a3.begin(0x49, &Wire) && ok;
  if (!ok) { Serial.println(F("ADS1115 absent - programme 03.")); while (true) delay(1000); }
  a2.setGain(GAIN_ONE);  a2.setDataRate(RATE_ADS1115_128SPS);
  a3.setGain(GAIN_ONE);  a3.setDataRate(RATE_ADS1115_128SPS);

  VOIES[0] = { "T1", &a2, 0 };  VOIES[1] = { "T2", &a2, 1 };
  VOIES[2] = { "T3", &a2, 2 };  VOIES[3] = { "T4", &a2, 3 };
  VOIES[4] = { "T5", &a3, 0 };  VOIES[5] = { "T6", &a3, 1 };

  Serial.println(F("PROGRAMME 08 - niveau des piles"));
}

/* --- LA PHYSIQUE DU MONTAGE, EN UNE FONCTION PURE.
   Elle ne parle a aucun circuit : elle prend deux tensions et rend des
   degres. C'est ce qui la rend verifiable hors de la carte, par
   `node outils/verifier-logique.mjs`, qui la compile et la compare au
   tableau de reference de `outils/table-ntc.mjs`.
     pont :  Rntc = Rref x V / (Vexc - V)
     NTC  :  1/T  = 1/T0 + ln(Rntc / R25) / B                          */
float temperatureDepuisVolts(float v, float vexc) {
  float r = R_REF * v / (vexc - v);
  return 1.0f / (1.0f / T0_KELVIN + logf(r / R25) / BETA) - 273.15f;
}

float lireVolts(Adafruit_ADS1115 &c, uint8_t v) {
  long s = 0;
  for (int i = 0; i < 4; i++) s += c.readADC_SingleEnded(v);
  return c.computeVolts((int16_t)(s / 4));
}

/* --- Interpolation lineaire entre deux points de la table. ------------- */
int pourcentDepuisVolts(float v) {
  if (v >= COURBE[0].volts) return 100;
  if (v <= COURBE[NB_POINTS - 1].volts) return 0;
  for (int i = 0; i < NB_POINTS - 1; i++) {
    if (v <= COURBE[i].volts && v > COURBE[i + 1].volts) {
      float part = (v - COURBE[i + 1].volts) / (COURBE[i].volts - COURBE[i + 1].volts);
      return (int)lroundf(COURBE[i + 1].pourcent + part * (COURBE[i].pourcent - COURBE[i + 1].pourcent));
    }
  }
  return 0;
}

void balayer() {
  vexc   = lireVolts(a3, VOIE_VEXC)  * RAPPORT_VEXC;
  vPiles = lireVolts(a3, VOIE_PILES) * RAPPORT_PILES;
  pourcentPiles = (vPiles < SEUIL_PRESENCE_PILES) ? -1 : pourcentDepuisVolts(vPiles);

  for (int i = 0; i < 6; i++) {
    float v = lireVolts(*VOIES[i].circuit, VOIES[i].entree);
    releves[i].volts = v;
    if (v > 0.97f * vexc)      { releves[i].etat = ABSENTE;       releves[i].celsius = NAN; }
    else if (v < 0.01f * vexc) { releves[i].etat = COURT_CIRCUIT; releves[i].celsius = NAN; }
    else {
      releves[i].etat = MESURE;
      releves[i].celsius = temperatureDepuisVolts(v, vexc);
    }
  }
}

/* --- Le formatage d'affichage. TOUJOURS 5 caracteres, signe compris :
   c'est ce qui empeche les colonnes de danser d'un rafraichissement a
   l'autre. Au-dela de 99,9 degres on laisse tomber la decimale plutot
   que d'elargir la colonne.
   `sortie` doit pouvoir recevoir au moins 8 octets.                    */
void formater(const Releve &r, char *sortie) {
  if (r.etat == ABSENTE)            strcpy(sortie, " ----");
  else if (r.etat == COURT_CIRCUIT) strcpy(sortie, "  -CC");
  else if (r.celsius > 999.0f || r.celsius < -999.0f)   strcpy(sortie, " HORS");
  else if (r.celsius >= 100.0f || r.celsius <= -100.0f) snprintf(sortie, 8, "%+5.0f", r.celsius);
  else                                                  snprintf(sortie, 8, "%+5.1f", r.celsius);
}

void afficher() {
  char texte[8], ligne[24];
  ecran.clearBuffer();
  ecran.setFont(u8g2_font_6x12_tf);
  for (int i = 0; i < 6; i++) {
    formater(releves[i], texte);
    snprintf(ligne, sizeof(ligne), "%s %s", VOIES[i].nom, texte);
    ecran.drawStr((i % 2 == 0) ? 0 : 66, 11 + (i / 2) * 13, ligne);
  }
  ecran.drawHLine(0, 44, 128);

  ecran.setFont(u8g2_font_5x8_tf);
  snprintf(ligne, sizeof(ligne), "%.2fV", vexc);
  ecran.drawStr(0, 56, ligne);

  if (pourcentPiles < 0) {
    ecran.drawStr(78, 56, "USB");
  } else {
    snprintf(ligne, sizeof(ligne), "%d%%", pourcentPiles);
    ecran.drawStr(108, 56, ligne);
    /* Le petit dessin de pile. Un pourcentage se lit, une jauge se voit. */
    ecran.drawFrame(78, 49, 26, 8);
    ecran.drawBox(104, 51, 2, 4);
    int plein = (int)lroundf(24.0f * pourcentPiles / 100.0f);
    if (plein > 0) ecran.drawBox(79, 50, plein, 6);
  }
  ecran.sendBuffer();
}

void loop() {
  unsigned long depart = millis();
  balayer();
  afficher();

  Serial.print(F("Vexc=")); Serial.print(vexc, 3);
  Serial.print(F(" V  Piles="));
  if (pourcentPiles < 0) Serial.print(F("(sur USB)"));
  else { Serial.print(vPiles, 2); Serial.print(F(" V -> ")); Serial.print(pourcentPiles); Serial.print('%'); }
  Serial.println();

  while (millis() - depart < 1000) delay(5);
}
