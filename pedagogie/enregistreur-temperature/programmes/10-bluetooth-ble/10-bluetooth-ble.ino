/* =====================================================================
   PROGRAMME 10 — LA MÊME TRAME, EN BLUETOOTH
   inerWeb Édu — Enregistreur de températures 6 voies
   ---------------------------------------------------------------------
   CE QUE CE PROGRAMME AJOUTE AU 09
     Le Bluetooth BLE. La trame part maintenant par DEUX chemins à la
     fois : le câble USB et les ondes. Exactement la même trame — c'est
     ce qui permet de déboguer le sans-fil avec le fil.

   LE SERVICE CHOISI : « NUS », NORDIC UART SERVICE
     Ce n'est pas une norme officielle, c'est une convention devenue
     universelle : un service qui fait passer du texte, dans les deux
     sens, comme un câble série. On le choisit parce qu'il est lisible
     par TOUT ce qu'un lycée a sous la main, sans rien installer :
       - une page web (Web Bluetooth, sur Chrome Android ou PC) ;
       - nRF Connect, gratuit, sur Android ;
       - les terminaux série BLE du commerce.
     Un service normalisé « Environmental Sensing » serait plus
     orthodoxe. Il serait aussi illisible à l'œil nu par un élève qui
     débogue. Arbitrage O3 de POINTS-OUVERTS.md.

   LE PIÈGE DES 20 OCTETS — et c'est LA notion BLE de la séance
     Une notification BLE transporte par défaut 20 octets utiles. Notre
     trame en fait 61. Sans précaution, le PC recevrait « 12:31:05;T1=4.8
     ;T2 » et rien d'autre : la trame serait COUPÉE.
     On peut demander au téléphone d'agrandir le tuyau (négociation de
     MTU), mais on ne peut pas l'y obliger. On DÉCOUPE donc la trame en
     morceaux de 20 octets et on la termine par un retour à la ligne :
     le récepteur recolle les morceaux jusqu'au retour à la ligne.
     C'est ainsi que fonctionne un port série depuis toujours.

   L'APPAREIL S'APPELLE PAR SON NOM
     Six appareils identiques dans une salle, c'est six fois la même
     annonce Bluetooth et personne ne sait à qui il parle. Le nom est
     donc tiré de l'identifiant unique de la puce : ENR-T6-3A7F.
     Il s'affiche à l'écran au démarrage. IL DOIT ÊTRE ÉCRIT SUR
     L'ÉTIQUETTE DE FAÇADE — c'est une consigne de montage, pas un détail.

   BIBLIOTHÈQUE : aucune à installer. Le Bluetooth est fourni avec le
   support ESP32 de l'IDE. La structure suit l'exemple « BLE_uart »
   livré avec ce support.
   ===================================================================== */

#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <U8g2lib.h>
#include <math.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

const int BROCHE_SDA = 5;
const int BROCHE_SCL = 6;
const char* VERSION_LOGICIEL = "v1.0";

/* --- Les identifiants du service NUS. Ils ne s'inventent pas : ce sont
   ceux que tout le monde utilise, sinon rien ne se reconnaît.          */
#define SERVICE_NUS "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CARAC_RX    "6e400002-b5a3-f393-e0a9-e50e24dcca9e"   // PC -> appareil
#define CARAC_TX    "6e400003-b5a3-f393-e0a9-e50e24dcca9e"   // appareil -> PC

Adafruit_ADS1115 a2, a3;
U8G2_SH1106_128X64_NONAME_F_HW_I2C ecran(U8G2_R0, U8X8_PIN_NONE);
// U8G2_SSD1306_128X64_NONAME_F_HW_I2C ecran(U8G2_R0, U8X8_PIN_NONE);

const float R_REF = 10000.0f, R25 = 10000.0f, BETA = 3950.0f, T0_KELVIN = 298.15f;
const float RAPPORT_VEXC = 2.0f, RAPPORT_PILES = 2.0f;
const uint8_t VOIE_VEXC = 2, VOIE_PILES = 3;
const float SEUIL_PRESENCE_PILES = 1.00f;

struct PointPile { float volts; int pourcent; };
const PointPile COURBE[] = {
  { 4.65f, 100 }, { 4.35f, 80 }, { 4.05f, 55 }, { 3.75f, 30 },
  { 3.45f, 12 },  { 3.15f,  3 }, { 2.85f,  0 }
};
const int NB_POINTS = sizeof(COURBE) / sizeof(COURBE[0]);

struct Voie { const char* nom; Adafruit_ADS1115* circuit; uint8_t entree; };
Voie VOIES[6];
enum Etat { MESURE, ABSENTE, COURT_CIRCUIT };
struct Releve { Etat etat; float volts; float celsius; };
Releve releves[6];

float vexc = 3.30f, vPiles = 0.0f;
int   pourcentPiles = -1;
char  nomAppareil[16] = "ENR-T6-0000";
long  decalageHorloge = 0;
unsigned long intervalleMs = 1000, prochainReleve = 0, compteurTrames = 0;
String tamponSerie;

BLECharacteristic *caracTx = nullptr;
bool clientConnecte = false;
bool clientPrecedent = false;

void envoyerIdentite();
void traiterCommande(String cmd);

/* --- Ce qui arrive quand un PC ou un telephone se connecte. ----------- */
class Connexion : public BLEServerCallbacks {
  void onConnect(BLEServer*)    override { clientConnecte = true; }
  void onDisconnect(BLEServer*) override { clientConnecte = false; }
};

/* --- Ce qui arrive quand le PC nous ECRIT quelque chose. -------------- */
class Reception : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    String recu = c->getValue().c_str();
    int debut = 0;
    for (int i = 0; i <= (int)recu.length(); i++) {
      if (i == (int)recu.length() || recu[i] == '\n' || recu[i] == '\r') {
        if (i > debut) traiterCommande(recu.substring(debut, i));
        debut = i + 1;
      }
    }
  }
};

/* --- L'envoi BLE, decoupe en morceaux de 20 octets. ------------------- */
void envoyerBLE(const char *texte) {
  if (!clientConnecte || caracTx == nullptr) return;
  size_t reste = strlen(texte);
  const char *p = texte;
  while (reste > 0) {
    size_t bout = reste > 20 ? 20 : reste;
    caracTx->setValue((uint8_t*)p, bout);
    caracTx->notify();
    p += bout; reste -= bout;
    delay(6);              // le temps qu'une notification parte vraiment
  }
}

/* --- Tout ce qui sort, sort par les deux chemins. --------------------- */
void emettre(const char *ligne) {
  Serial.println(ligne);
  char avecFin[128];
  snprintf(avecFin, sizeof(avecFin), "%s\n", ligne);
  envoyerBLE(avecFin);
}

void setup() {
  Serial.begin(115200);
  delay(400);
  Wire.setPins(BROCHE_SDA, BROCHE_SCL);
  Wire.begin();
  ecran.begin();
  ecran.setBusClock(400000);

  uint64_t puce = ESP.getEfuseMac();
  snprintf(nomAppareil, sizeof(nomAppareil), "ENR-T6-%02X%02X",
           (uint8_t)((puce >> 32) & 0xFF), (uint8_t)((puce >> 40) & 0xFF));

  bool ok = a2.begin(0x48, &Wire);
  ok = a3.begin(0x49, &Wire) && ok;
  if (!ok) { Serial.println(F("#ERREUR;ADS1115 absent - programme 03")); while (true) delay(1000); }
  a2.setGain(GAIN_ONE);  a2.setDataRate(RATE_ADS1115_128SPS);
  a3.setGain(GAIN_ONE);  a3.setDataRate(RATE_ADS1115_128SPS);

  VOIES[0] = { "T1", &a2, 0 };  VOIES[1] = { "T2", &a2, 1 };
  VOIES[2] = { "T3", &a2, 2 };  VOIES[3] = { "T4", &a2, 3 };
  VOIES[4] = { "T5", &a3, 0 };  VOIES[5] = { "T6", &a3, 1 };

  /* --- Le Bluetooth. Six lignes, et l'appareil est visible. ---------- */
  BLEDevice::init(nomAppareil);
  BLEServer *serveur = BLEDevice::createServer();
  serveur->setCallbacks(new Connexion());

  BLEService *service = serveur->createService(SERVICE_NUS);

  caracTx = service->createCharacteristic(CARAC_TX, BLECharacteristic::PROPERTY_NOTIFY);
  /* Le descripteur qui autorise les notifications. Si une version
     recente du support ESP32 refuse BLE2902, commenter cette ligne :
     elle cree alors le descripteur d'elle-meme. */
  caracTx->addDescriptor(new BLE2902());

  BLECharacteristic *caracRx = service->createCharacteristic(
      CARAC_RX, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  caracRx->setCallbacks(new Reception());

  service->start();

  BLEAdvertising *annonce = BLEDevice::getAdvertising();
  annonce->addServiceUUID(SERVICE_NUS);
  annonce->setScanResponse(true);
  BLEDevice::startAdvertising();

  /* --- L'ecran d'accueil : le nom Bluetooth, en grand, 3 secondes.
     C'est CE nom qu'on ecrit sur l'etiquette de facade.               */
  ecran.clearBuffer();
  ecran.setFont(u8g2_font_6x12_tf);
  ecran.drawStr(0, 12, "Bluetooth actif");
  ecran.setFont(u8g2_font_helvB10_tf);
  ecran.drawStr(0, 34, nomAppareil);
  ecran.setFont(u8g2_font_5x8_tf);
  ecran.drawStr(0, 52, "A recopier sur l'etiquette");
  ecran.drawStr(0, 62, "de facade de l'appareil.");
  ecran.sendBuffer();
  Serial.print(F("#BLE annonce sous le nom : ")); Serial.println(nomAppareil);
  delay(3000);
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

int pourcentDepuisVolts(float v) {
  if (v >= COURBE[0].volts) return 100;
  if (v <= COURBE[NB_POINTS - 1].volts) return 0;
  for (int i = 0; i < NB_POINTS - 1; i++)
    if (v <= COURBE[i].volts && v > COURBE[i + 1].volts) {
      float p = (v - COURBE[i + 1].volts) / (COURBE[i].volts - COURBE[i + 1].volts);
      return (int)lroundf(COURBE[i + 1].pourcent + p * (COURBE[i].pourcent - COURBE[i + 1].pourcent));
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

void heureCourante(char *sortie, size_t taille) {
  long s = (long)(millis() / 1000UL) + decalageHorloge;
  s = ((s % 86400L) + 86400L) % 86400L;
  snprintf(sortie, taille, "%02ld:%02ld:%02ld", s / 3600, (s / 60) % 60, s % 60);
}

void construireTrame(char *sortie, size_t taille) {
  char heure[9];
  heureCourante(heure, sizeof(heure));
  int n = snprintf(sortie, taille, "%s", heure);
  for (int i = 0; i < 6; i++) {
    if (releves[i].etat == MESURE) n += snprintf(sortie + n, taille - n, ";T%d=%.1f", i + 1, releves[i].celsius);
    else                           n += snprintf(sortie + n, taille - n, ";T%d=", i + 1);
  }
  if (pourcentPiles >= 0) snprintf(sortie + n, taille - n, ";BAT=%d", pourcentPiles);
  else                    snprintf(sortie + n, taille - n, ";BAT=");
}

void envoyerIdentite() {
  char ligne[96];
  snprintf(ligne, sizeof(ligne), "#%s;%s;VOIES=6;INT=%lu;VEXC=%.3f;ALIM=%s",
           nomAppareil, VERSION_LOGICIEL, intervalleMs / 1000UL, vexc,
           pourcentPiles >= 0 ? "PILES" : "USB");
  emettre(ligne);
}

void traiterCommande(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;
  if (cmd == "?") { envoyerIdentite(); return; }
  if (cmd.startsWith("H=") && cmd.length() == 10) {
    int h = cmd.substring(2, 4).toInt(), m = cmd.substring(5, 7).toInt(), s = cmd.substring(8, 10).toInt();
    if (h < 24 && m < 60 && s < 60) {
      decalageHorloge = (long)h * 3600 + m * 60 + s - (long)(millis() / 1000UL);
      emettre("#OK;horloge reglee");
    } else emettre("#ERREUR;heure invalide");
    return;
  }
  if (cmd.startsWith("I=")) {
    long n = cmd.substring(2).toInt();
    if (n >= 1 && n <= 3600) {
      intervalleMs = (unsigned long)n * 1000UL;
      char r[40]; snprintf(r, sizeof(r), "#OK;intervalle=%ld", n); emettre(r);
    } else emettre("#ERREUR;intervalle hors 1..3600");
    return;
  }
  char r[64]; snprintf(r, sizeof(r), "#ERREUR;commande inconnue"); emettre(r);
}

void lireCommandesSerie() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') { traiterCommande(tamponSerie); tamponSerie = ""; }
    else if (tamponSerie.length() < 40) tamponSerie += c;
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
  ecran.drawStr(0, 56, "BLE");
  if (clientConnecte) ecran.drawBox(22, 50, 6, 6); else ecran.drawFrame(22, 50, 6, 6);
  char heure[9]; heureCourante(heure, sizeof(heure));
  ecran.drawStr(36, 56, heure);
  if (pourcentPiles >= 0) {
    snprintf(ligne, sizeof(ligne), "%d%%", pourcentPiles);
    ecran.drawStr(104, 56, ligne);
  } else ecran.drawStr(104, 56, "USB");
  ecran.sendBuffer();
}

void loop() {
  lireCommandesSerie();

  /* Un client vient d'arriver : on se presente. Il vient de partir : on
     se remet a annoncer, sinon plus personne ne nous trouve. */
  if (clientConnecte && !clientPrecedent) { delay(200); envoyerIdentite(); }
  if (!clientConnecte && clientPrecedent) { delay(400); BLEDevice::startAdvertising(); }
  clientPrecedent = clientConnecte;

  if ((long)(millis() - prochainReleve) >= 0) {
    prochainReleve = millis() + intervalleMs;
    balayer();
    afficher();
    char trame[96];
    construireTrame(trame, sizeof(trame));
    emettre(trame);
    if (++compteurTrames % 60 == 0) envoyerIdentite();
  }
  delay(5);
}
