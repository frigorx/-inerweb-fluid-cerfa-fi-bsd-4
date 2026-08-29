/* =====================================================================
   PROGRAMME 01 — LA CARTE RÉPOND
   inerWeb Édu — Enregistreur de températures 6 voies
   ---------------------------------------------------------------------
   CE QUE CE PROGRAMME PROUVE
     1. l'ordinateur voit la carte ;
     2. la carte accepte un programme ;
     3. la carte parle sur l'USB ;
     4. la LED de la carte est bien sur GPIO8 (à vérifier sur VOTRE
        exemplaire : les SuperMini ne sont pas toutes câblées pareil).

   IL NE PROUVE RIEN D'AUTRE. Ni le bus, ni les sondes, ni l'écran.
   C'est volontaire : on ne cherche jamais deux pannes à la fois.

   CE QU'IL FAUT AVOIR FAIT AVANT
     - contrôles 1 à 19 de la fiche du § 11 de 05_Plans_et_schema.md ;
     - sélecteur sur USB ;
     - visa de l'enseignant.

   RÉGLAGES DE L'IDE ARDUINO
     Carte    : « ESP32C3 Dev Module »
     USB CDC On Boot : ACTIVÉ   ← sans ça, le moniteur reste muet
     Vitesse du moniteur série : 115200
   ===================================================================== */

/* La LED de la carte. Sur la plupart des ESP32-C3 SuperMini elle est sur
   GPIO8 et s'allume à l'état BAS (logique inversée). Si la vôtre ne
   clignote pas, essayez 7, puis 10 : c'est l'objet de cette séance. */
const int BROCHE_LED   = 8;
const bool LED_INVERSEE = true;

unsigned long dernierClignotement = 0;
bool allumee = false;
unsigned long compteur = 0;

void ecrireLed(bool etat) {
  digitalWrite(BROCHE_LED, LED_INVERSEE ? !etat : etat);
}

void setup() {
  Serial.begin(115200);

  /* Le port USB de l'ESP32-C3 met environ une seconde à s'énumérer.
     Sans cette attente, les premières lignes partent dans le vide et
     l'élève croit que rien ne marche. */
  unsigned long debut = millis();
  while (!Serial && millis() - debut < 2000) { delay(10); }
  delay(300);

  pinMode(BROCHE_LED, OUTPUT);
  ecrireLed(false);

  Serial.println();
  Serial.println(F("======================================================"));
  Serial.println(F("  inerWeb Edu - Enregistreur de temperatures 6 voies"));
  Serial.println(F("  PROGRAMME 01 - la carte repond"));
  Serial.println(F("======================================================"));
  Serial.print  (F("Puce            : ")); Serial.println(ESP.getChipModel());
  Serial.print  (F("Revision        : ")); Serial.println(ESP.getChipRevision());
  Serial.print  (F("Coeurs          : ")); Serial.println(ESP.getChipCores());
  Serial.print  (F("Frequence (MHz) : ")); Serial.println(getCpuFrequencyMhz());
  Serial.print  (F("Memoire libre   : ")); Serial.print(ESP.getFreeHeap()); Serial.println(F(" octets"));

  /* L'identifiant unique de la carte. Il servira au programme 10 pour
     donner un nom Bluetooth different a chacun des six appareils de la
     classe : sans cela, six appareils identiques dans une salle, et
     personne ne sait auquel il est connecte. */
  uint64_t puce = ESP.getEfuseMac();
  char nom[16];
  snprintf(nom, sizeof(nom), "ENR-T6-%02X%02X",
           (uint8_t)((puce >> 32) & 0xFF), (uint8_t)((puce >> 40) & 0xFF));
  Serial.print(F("Nom de l'appareil : ")); Serial.println(nom);
  Serial.println(F("  -> notez-le, et ecrivez-le sur l'etiquette de facade."));
  Serial.println();
  Serial.println(F("La LED doit clignoter une fois par seconde."));
  Serial.println(F("Si elle ne clignote pas : changez BROCHE_LED (7, 10...)."));
  Serial.println();
}

void loop() {
  if (millis() - dernierClignotement >= 500) {
    dernierClignotement = millis();
    allumee = !allumee;
    ecrireLed(allumee);

    if (allumee) {
      compteur++;
      Serial.print(F("battement "));
      Serial.print(compteur);
      Serial.print(F("   -   ecoule : "));
      Serial.print(millis() / 1000);
      Serial.println(F(" s"));
    }
  }
}
