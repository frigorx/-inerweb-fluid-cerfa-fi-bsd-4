/* =====================================================================
   PROGRAMME 07 — LES SIX TEMPÉRATURES À L'ÉCRAN
   inerWeb Édu — Enregistreur de températures 6 voies
   ---------------------------------------------------------------------
   CE QUE CE PROGRAMME AJOUTE AU 06
     L'affichage local. À partir d'ici, l'appareil se suffit à lui-même :
     on peut débrancher l'USB et il continue de servir.

   LA CONTRAINTE D'AFFICHAGE, ET ELLE EST SÉVÈRE
     128 x 64 pixels. Six valeurs, un état de liaison, un niveau de
     piles. La mise en page du § 5 du dossier maître donne deux colonnes
     de trois lignes, et une ligne d'état en bas.

     ┌──────────────────────────────┐
     │ T1 +04.8      T2 -03.2       │
     │ T3 +08.7      T4 +52.1       │
     │ T5 +31.4      T6 +24.8       │
     │ ──────────────────────────── │
     │ BLE .          PILES 78 %    │
     └──────────────────────────────┘

   POURQUOI UNE POLICE À CHASSE FIXE POUR LES VALEURS
     Avec une police proportionnelle, « 111.1 » est plus étroit que
     « 888.8 » : les colonnes dansent à chaque rafraîchissement et
     l'écran devient illisible à deux mètres. Une chasse fixe cloue
     chaque chiffre à sa place.

   L'EXPÉRIENCE À FAIRE
     Poser l'appareil au fond de la salle et le lire depuis le bureau.
     S'il n'est pas lisible, ce n'est pas l'élève qui a un problème de
     vue : c'est la mise en page.
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
const float RAPPORT_VEXC = 2.0f;
const uint8_t VOIE_VEXC = 2;

struct Voie { const char* nom; Adafruit_ADS1115* circuit; uint8_t entree; };
Voie VOIES[6];
enum Etat { MESURE, ABSENTE, COURT_CIRCUIT };
struct Releve { Etat etat; float volts; float celsius; };
Releve releves[6];
float vexc = 3.30f;

void setup() {
  Serial.begin(115200);
  delay(400);
  Wire.setPins(BROCHE_SDA, BROCHE_SCL);
  Wire.begin();

  ecran.begin();
  ecran.setBusClock(400000);
  ecran.clearBuffer();
  ecran.setFont(u8g2_font_6x12_tf);
  ecran.drawStr(0, 20, "inerWeb Edu");
  ecran.drawStr(0, 36, "demarrage...");
  ecran.sendBuffer();

  bool ok = a2.begin(0x48, &Wire);
  ok = a3.begin(0x49, &Wire) && ok;
  if (!ok) {
    ecran.clearBuffer();
    ecran.setFont(u8g2_font_6x12_tf);
    ecran.drawStr(0, 14, "ADS1115 absent");
    ecran.drawStr(0, 30, "Lancer prog. 03");
    ecran.sendBuffer();
    while (true) delay(1000);
  }
  a2.setGain(GAIN_ONE);  a2.setDataRate(RATE_ADS1115_128SPS);
  a3.setGain(GAIN_ONE);  a3.setDataRate(RATE_ADS1115_128SPS);

  VOIES[0] = { "T1", &a2, 0 };  VOIES[1] = { "T2", &a2, 1 };
  VOIES[2] = { "T3", &a2, 2 };  VOIES[3] = { "T4", &a2, 3 };
  VOIES[4] = { "T5", &a3, 0 };  VOIES[5] = { "T6", &a3, 1 };

  Serial.println(F("PROGRAMME 07 - affichage des six temperatures"));
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

void balayer() {
  vexc = lireVolts(a3, VOIE_VEXC) * RAPPORT_VEXC;
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
    int x = (i % 2 == 0) ? 0 : 66;
    int y = 11 + (i / 2) * 13;
    ecran.drawStr(x, y, ligne);
  }

  ecran.drawHLine(0, 44, 128);

  ecran.setFont(u8g2_font_5x8_tf);
  snprintf(ligne, sizeof(ligne), "Vexc %.2f V", vexc);
  ecran.drawStr(0, 56, ligne);
  ecran.drawStr(90, 56, "USB");        // les piles arrivent au programme 08

  ecran.sendBuffer();
}

void loop() {
  unsigned long depart = millis();
  balayer();
  afficher();

  for (int i = 0; i < 6; i++) {
    char t[8]; formater(releves[i], t);
    Serial.print(VOIES[i].nom); Serial.print('='); Serial.print(t); Serial.print(' ');
  }
  Serial.println();

  while (millis() - depart < 1000) delay(5);
}
