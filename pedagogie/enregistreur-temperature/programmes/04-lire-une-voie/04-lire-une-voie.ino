/* =====================================================================
   PROGRAMME 04 — UNE TENSION, EN VOLTS
   inerWeb Édu — Enregistreur de températures 6 voies
   ---------------------------------------------------------------------
   CE QUE CE PROGRAMME PROUVE
     Que le convertisseur A2 (0x48) convertit vraiment, et qu'on sait
     traduire son résultat en volts.

   PAS ENCORE DE TEMPÉRATURE. On lit une TENSION, et on la compare au
   multimètre. C'est l'étape que les élèves veulent sauter, et c'est
   celle qui évite deux heures de recherche plus tard : si les volts
   sont faux, les degrés le seront aussi, et on ne saura pas pourquoi.

   L'EXPÉRIENCE À FAIRE (10 minutes, séance 3A)
     1. brancher une sonde sur T1 ;
     2. lire la tension à l'écran du moniteur ;
     3. mesurer la MÊME tension au multimètre, entre le point milieu du
        pont 1 et la masse ;
     4. les deux doivent coïncider à 5 mV près ;
     5. serrer la sonde dans la main : la tension DESCEND.

   POURQUOI ELLE DESCEND : la NTC est du côté de la masse. Elle chauffe,
   sa résistance chute, elle « tire » le point milieu vers le bas.

   BIBLIOTHÈQUE À INSTALLER
     Adafruit ADS1X15 (elle installe Adafruit BusIO avec elle).
   ===================================================================== */

#include <Wire.h>
#include <Adafruit_ADS1X15.h>

const int BROCHE_SDA = 5;
const int BROCHE_SCL = 6;

Adafruit_ADS1115 convertisseur;

/* Le CALIBRE. GAIN_ONE = pleine echelle ±4,096 V, soit 125,0 µV par pas.
   C'est le plus petit calibre qui contient les 3,3 V de notre pont.
   Le calibre inferieur (±2,048 V) ecreterait tout ce qui est sous 5 °C ;
   le calibre superieur gaspillerait un bit. Voir 05_Plans § 4.4.       */
const adsGain_t CALIBRE = GAIN_ONE;

/* La voie observee. 0 = A0 = point milieu du pont T1. */
const uint8_t VOIE = 0;

void setup() {
  Serial.begin(115200);
  delay(400);
  Wire.setPins(BROCHE_SDA, BROCHE_SCL);
  Wire.begin();

  Serial.println();
  Serial.println(F("PROGRAMME 04 - lecture d'une voie en volts"));

  if (!convertisseur.begin(0x48, &Wire)) {
    Serial.println(F("ADS1115 0x48 INTROUVABLE. Relancer le programme 03."));
    while (true) delay(1000);
  }
  convertisseur.setGain(CALIBRE);
  convertisseur.setDataRate(RATE_ADS1115_128SPS);

  Serial.println(F("Convertisseur A2 (0x48) pret."));
  Serial.println(F("Calibre +/-4,096 V   -   un pas = 125,0 uV"));
  Serial.println();
  Serial.println(F("code brut ; tension ; ce que cela veut dire"));
}

void loop() {
  int16_t brut = convertisseur.readADC_SingleEnded(VOIE);
  float volts  = convertisseur.computeVolts(brut);

  Serial.print(brut);
  Serial.print(F(" ; "));
  Serial.print(volts, 4);
  Serial.print(F(" V ; "));

  /* Le commentaire en clair. Un nombre seul n'apprend rien ; un nombre
     accompagne de ce qu'il signifie, si.
     Les deux seuils viennent de 05_Plans_et_schema.md § 3.6.           */
  if (volts > 0.97f * 3.30f) {
    Serial.println(F("proche du 3,3 V -> SONDE ABSENTE ou fil coupe"));
  } else if (volts < 0.01f * 3.30f) {
    Serial.println(F("proche de 0 V -> COURT-CIRCUIT (fiche mal enfoncee ?)"));
  } else if (volts > 1.75f) {
    Serial.println(F("sonde plus FROIDE que 22 degres environ"));
  } else if (volts < 1.55f) {
    Serial.println(F("sonde plus CHAUDE que 28 degres environ"));
  } else {
    Serial.println(F("temperature ambiante d'atelier"));
  }

  delay(500);
}
