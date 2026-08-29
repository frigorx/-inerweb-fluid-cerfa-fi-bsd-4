/* =====================================================================
   PROGRAMME 03 — QUI EST SUR LE BUS ?
   inerWeb Édu — Enregistreur de températures 6 voies
   ---------------------------------------------------------------------
   CE QUE CE PROGRAMME PROUVE
     Que les TROIS circuits attendus sont présents, chacun à SON adresse :
         0x3C  l'écran OLED
         0x48  le convertisseur A2 (broche ADDR reliée à la MASSE)
         0x49  le convertisseur A3 (broche ADDR reliée au 3,3 V)

   C'EST LE PROGRAMME DE DÉPANNAGE DU PROJET.
   On y revient à chaque fois que quelque chose ne répond plus. Il ne
   fabrique rien : il pose une question à chacune des 127 adresses
   possibles et note qui répond. Un circuit qui ne répond pas est soit
   mal alimenté, soit mal câblé — jamais mal programmé.

   LES QUATRE DIAGNOSTICS QU'IL DONNE
     - rien du tout        -> le bus lui-même (SDA/SCL croisés, coupés)
     - un seul ADS1115     -> les deux ADDR sont au même potentiel
     - 0x48 mais pas 0x49  -> ADDR de A3 n'est pas relié au 3,3 V
     - pas d'ecran         -> alimentation de l'écran, ou adresse 0x3D
   ===================================================================== */

#include <Wire.h>

const int BROCHE_SDA = 5;
const int BROCHE_SCL = 6;

/* Ce que l'on S'ATTEND à trouver. Le programme compare et commente. */
struct Attendu { uint8_t adresse; const char* nom; };
const Attendu ATTENDUS[] = {
  { 0x3C, "Ecran OLED" },
  { 0x48, "ADS1115 n1 (A2) - voies T1 a T4" },
  { 0x49, "ADS1115 n2 (A3) - voies T5, T6, Vexc, piles" }
};
const int NB_ATTENDUS = sizeof(ATTENDUS) / sizeof(ATTENDUS[0]);

void setup() {
  Serial.begin(115200);
  delay(400);
  Wire.setPins(BROCHE_SDA, BROCHE_SCL);
  Wire.begin();
  Wire.setClock(100000);          // 100 kHz : le plus tolerant au cablage
  Serial.println();
  Serial.println(F("PROGRAMME 03 - scanner du bus I2C"));
  Serial.print  (F("SDA=GPIO")); Serial.print(BROCHE_SDA);
  Serial.print  (F("  SCL=GPIO")); Serial.println(BROCHE_SCL);
}

void loop() {
  Serial.println();
  Serial.println(F("--- balayage des adresses 0x08 a 0x77 ---"));

  bool present[128] = { false };
  int trouves = 0;

  for (uint8_t a = 8; a < 120; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      present[a] = true;
      trouves++;
      Serial.print(F("  repond a 0x"));
      if (a < 16) Serial.print('0');
      Serial.print(a, HEX);
      Serial.println();
    }
  }

  Serial.print(F("Total : ")); Serial.print(trouves); Serial.println(F(" circuit(s)."));
  Serial.println();

  /* --- Le commentaire. C'est lui qui transforme une liste en diagnostic. */
  Serial.println(F("--- controle de ce qui est attendu ---"));
  int manquants = 0;
  for (int i = 0; i < NB_ATTENDUS; i++) {
    Serial.print(F("  0x")); Serial.print(ATTENDUS[i].adresse, HEX);
    Serial.print(F("  ")); Serial.print(ATTENDUS[i].nom);
    if (present[ATTENDUS[i].adresse]) {
      Serial.println(F("   ... PRESENT"));
    } else {
      Serial.println(F("   ... ABSENT"));
      manquants++;
    }
  }
  Serial.println();

  if (manquants == 0) {
    Serial.println(F("TOUT EST LA. Passer au programme 04."));
  } else if (trouves == 0) {
    Serial.println(F("AUCUN circuit ne repond. Le probleme est le BUS :"));
    Serial.println(F("  1. SDA et SCL sont-ils croises ? (controle n10)"));
    Serial.println(F("  2. y a-t-il 3,3 V sur VDD des modules ? (controles 11 a 13)"));
    Serial.println(F("  3. la masse des modules est-elle reliee ?"));
  } else {
    if (present[0x48] && !present[0x49]) {
      Serial.println(F("A2 repond, pas A3 : la broche ADDR de A3 n'est pas au 3,3 V."));
      Serial.println(F("  -> controle n14. Deux ADS1115 a la meme adresse = un seul visible."));
    }
    if (!present[0x48] && present[0x49]) {
      Serial.println(F("A3 repond, pas A2 : la broche ADDR de A2 n'est pas a la MASSE."));
    }
    if (!present[0x3C] && present[0x3D]) {
      Serial.println(F("L'ecran est en 0x3D. Adapter setI2CAddress dans les programmes."));
    } else if (!present[0x3C]) {
      Serial.println(F("Ecran absent : alimentation de l'ecran (controle n13)."));
    }
  }

  delay(5000);
}
