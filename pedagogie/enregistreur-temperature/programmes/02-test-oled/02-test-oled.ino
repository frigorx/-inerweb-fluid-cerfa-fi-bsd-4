/* =====================================================================
   PROGRAMME 02 — L'ÉCRAN S'ALLUME, ET ON SAIT LEQUEL C'EST
   inerWeb Édu — Enregistreur de températures 6 voies
   ---------------------------------------------------------------------
   CE QUE CE PROGRAMME PROUVE
     1. le bus I²C est câblé (SDA sur GPIO5, SCL sur GPIO6) ;
     2. l'écran est alimenté et répond à son adresse ;
     3. le CONTRÔLEUR de l'écran est le bon.

   LE PIÈGE DU JOUR — et il fait perdre une heure à qui ne le connaît pas.
   Un écran OLED 128 × 64 en I²C existe en deux versions :
       0,96 pouce  -> contrôleur SSD1306, mémoire de 128 colonnes
       1,3  pouce  -> contrôleur SH1106,  mémoire de 132 colonnes
   Le nôtre est un 1,3 pouce : c'est donc, presque toujours, un SH1106.
   Piloté par erreur en SSD1306, il s'allume quand même — mais l'image
   est DÉCALÉE DE DEUX PIXELS, avec une colonne parasite sur un bord.
   Ce n'est pas une panne de câblage. C'est la ligne ci-dessous.

   BIBLIOTHÈQUE À INSTALLER
     U8g2 (Oliver Kraus) — Croquis > Inclure une bibliothèque >
     Gérer les bibliothèques > chercher « U8g2 ».
   ===================================================================== */

#include <Wire.h>
#include <U8g2lib.h>

/* --- LES BROCHES DU BUS ------------------------------------------------
   Surtout PAS GPIO8 et GPIO9, qui sont les broches par défaut de
   l'ESP32-C3 : ce sont aussi ses broches de MODE DE DÉMARRAGE. Un module
   qui tiendrait SDA au niveau bas empêcherait la carte de démarrer, et le
   symptôme n'aurait aucun rapport visible avec la cause.
   Voir 05_Plans_et_schema.md § 5.1.                                     */
const int BROCHE_SDA = 5;
const int BROCHE_SCL = 6;

/* --- LE CONTRÔLEUR ----------------------------------------------------
   UNE seule de ces deux lignes doit être active.
   Écran 1,3 pouce -> laisser SH1106.
   Image décalée de 2 pixels -> vous avez choisi la mauvaise.            */
U8G2_SH1106_128X64_NONAME_F_HW_I2C  ecran(U8G2_R0, U8X8_PIN_NONE);
// U8G2_SSD1306_128X64_NONAME_F_HW_I2C ecran(U8G2_R0, U8X8_PIN_NONE);

void setup() {
  Serial.begin(115200);
  delay(400);

  /* setPins AVANT begin : c'est la seule façon d'imposer nos broches à
     la bibliothèque U8g2, qui appelle Wire.begin() de son côté. */
  Wire.setPins(BROCHE_SDA, BROCHE_SCL);
  Wire.begin();

  Serial.println();
  Serial.println(F("PROGRAMME 02 - test de l'ecran"));
  Serial.print  (F("Bus I2C : SDA=GPIO")); Serial.print(BROCHE_SDA);
  Serial.print  (F("  SCL=GPIO"));         Serial.println(BROCHE_SCL);

  /* On demande d'abord à l'écran s'il est là, AVANT de lui parler.
     Si cette étape échoue, inutile de chercher plus loin : c'est
     l'alimentation ou le câblage, pas le programme. */
  Wire.beginTransmission(0x3C);
  bool trouve3C = (Wire.endTransmission() == 0);
  Wire.beginTransmission(0x3D);
  bool trouve3D = (Wire.endTransmission() == 0);

  if (trouve3C)      Serial.println(F("Ecran trouve a l'adresse 0x3C. Normal."));
  else if (trouve3D) Serial.println(F("Ecran trouve a 0x3D : pontet du module a l'autre position."));
  else {
    Serial.println(F("AUCUN ECRAN SUR LE BUS."));
    Serial.println(F("  1. l'ecran est-il alimente ? (3,3 V sur VCC, mesurer)"));
    Serial.println(F("  2. SDA et SCL ne sont-ils pas croises ?"));
    Serial.println(F("  3. lancer le PROGRAMME 03, il liste tout le bus."));
  }

  if (trouve3D) ecran.setI2CAddress(0x3D * 2);   // U8g2 attend l'adresse decalee

  ecran.begin();
  ecran.setBusClock(400000);
}

void loop() {
  static int etape = 0;

  ecran.clearBuffer();

  if (etape == 0) {
    /* Écran 1 : on lit quelque chose. Le but est de vérifier la police
       et les marges — l'écran est-il lisible à deux mètres ? */
    ecran.setFont(u8g2_font_helvB10_tf);
    ecran.drawStr(0, 12, "inerWeb Edu");
    ecran.setFont(u8g2_font_6x12_tf);
    ecran.drawStr(0, 28, "Enregistreur 6 voies");
    ecran.drawStr(0, 40, "Programme 02");
    ecran.drawStr(0, 56, "Ecran : OK");
  } else if (etape == 1) {
    /* Écran 2 : le CADRE. C'est lui qui révèle un mauvais contrôleur.
       Le cadre doit toucher les quatre bords, sans colonne parasite
       ni bande noire d'un côté. */
    ecran.drawFrame(0, 0, 128, 64);
    ecran.drawLine(0, 0, 127, 63);
    ecran.drawLine(127, 0, 0, 63);
    ecran.setFont(u8g2_font_5x8_tf);
    ecran.drawStr(34, 30, "cadre net ?");
    ecran.drawStr(20, 42, "SH1106 si oui");
  } else {
    /* Écran 3 : la mise en page réelle des 6 températures, en blanc.
       On vérifie MAINTENANT que tout tient, avant d'avoir des valeurs. */
    ecran.setFont(u8g2_font_6x12_tf);
    ecran.drawStr(0, 10, "T1 --.-");   ecran.drawStr(66, 10, "T2 --.-");
    ecran.drawStr(0, 24, "T3 --.-");   ecran.drawStr(66, 24, "T4 --.-");
    ecran.drawStr(0, 38, "T5 --.-");   ecran.drawStr(66, 38, "T6 --.-");
    ecran.drawHLine(0, 44, 128);
    ecran.setFont(u8g2_font_5x8_tf);
    ecran.drawStr(0, 56, "BLE -");
    ecran.drawStr(80, 56, "PILES --%");
  }

  ecran.sendBuffer();
  etape = (etape + 1) % 3;
  delay(2500);
}
