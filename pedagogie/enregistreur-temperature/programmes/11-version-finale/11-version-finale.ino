/* =====================================================================
   PROGRAMME 11 — VERSION FINALE
   inerWeb Édu — Enregistreur de températures 6 voies
   ---------------------------------------------------------------------
   C'est le programme qui reste dans l'appareil.

   CE QU'IL AJOUTE AU PROGRAMME 10
     1. L'ÉTALONNAGE. Un décalage par voie, réglé par commande, conservé
        dans la mémoire de la carte. Il survit à la coupure et au
        rechargement du programme.
     2. LES EXTREMA. Le mini et le maxi de chaque voie depuis la dernière
        remise à zéro — c'est ce qu'on regarde après un démarrage de
        machine frigorifique.
     3. LA GESTION DES PANNES. Un convertisseur qui ne répond plus est
        détecté, annoncé à l'écran, et l'appareil retente de le joindre
        toutes les cinq secondes au lieu de se figer.
     4. DEUX PAGES D'ÉCRAN, qui alternent toutes les huit secondes.

   ─────────────────────────────────────────────────────────────────────
   RÉGLAGE DE L'IDE — À NE PAS OUBLIER
     Outils > Schéma de partition > « Huge APP (3MB No OTA/1MB SPIFFS) »
     Le Bluetooth pèse lourd. Avec le schéma par défaut, la compilation
     échoue sur « text section exceeds available space ». Ce n'est pas
     une erreur de programme : c'est un réglage.
   ─────────────────────────────────────────────────────────────────────

   L'ÉTALONNAGE EN CLASSE — séance 3B
     La sonde est plongée dans un bain d'eau glacée fondante, en excès de
     glace et remuée : ce bain vaut 0,0 °C à un dixième près, gratuitement,
     et c'est le seul point fixe qu'un lycée possède sans rien acheter.
     Une fois la lecture stabilisée (compter une minute), on envoie :

         ZC1=0.0

     L'appareil calcule lui-même l'écart et le retient. On recommence
     pour les six sondes. Deux minutes par sonde, et l'appareil est
     étalonné pour l'année.

   TOUTES LES COMMANDES
     ?              ligne d'identité
     H=14:05:30     règle l'horloge
     I=5            intervalle en secondes, de 1 à 3600
     Z?             liste les six décalages d'étalonnage
     Z3=-0.4        impose un décalage à la voie 3
     ZC3=0.0        étalonne la voie 3 : « en ce moment, elle voit 0,0 »
     ZR             remet les six décalages à zéro
     M?             mini et maxi de chaque voie
     MR             remet les extrema à zéro
   ===================================================================== */

#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <U8g2lib.h>
#include <Preferences.h>
#include <math.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

const int BROCHE_SDA = 5;
const int BROCHE_SCL = 6;
const char* VERSION_LOGICIEL = "v1.0";

#define SERVICE_NUS "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CARAC_RX    "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define CARAC_TX    "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

const uint8_t ADRESSE_A2 = 0x48;
const uint8_t ADRESSE_A3 = 0x49;

Adafruit_ADS1115 a2, a3;
U8G2_SH1106_128X64_NONAME_F_HW_I2C ecran(U8G2_R0, U8X8_PIN_NONE);
// U8G2_SSD1306_128X64_NONAME_F_HW_I2C ecran(U8G2_R0, U8X8_PIN_NONE);
Preferences memoire;

/* --- Les constantes du montage (05_Plans_et_schema.md § 9). ----------- */
const float R_REF = 10000.0f, R25 = 10000.0f, BETA = 3950.0f, T0_KELVIN = 298.15f;
const float RAPPORT_VEXC = 2.0f, RAPPORT_PILES = 2.0f;
const uint8_t VOIE_VEXC = 2, VOIE_PILES = 3;
const float SEUIL_PRESENCE_PILES = 1.00f;
const float SEUIL_ABSENTE = 0.97f, SEUIL_COURT = 0.01f;

struct PointPile { float volts; int pourcent; };
const PointPile COURBE[] = {
  { 4.65f, 100 }, { 4.35f, 80 }, { 4.05f, 55 }, { 3.75f, 30 },
  { 3.45f, 12 },  { 3.15f,  3 }, { 2.85f,  0 }
};
const int NB_POINTS = sizeof(COURBE) / sizeof(COURBE[0]);

struct Voie { const char* nom; Adafruit_ADS1115* circuit; uint8_t adresse; uint8_t entree; };
Voie VOIES[6];
enum Etat { MESURE, ABSENTE, COURT_CIRCUIT, HORS_SERVICE };
struct Releve { Etat etat; float volts; float celsius; };
Releve releves[6];

float decalage[6] = { 0, 0, 0, 0, 0, 0 };       // etalonnage, en kelvins
float mini[6], maxi[6];
bool  extremaArmes = false;

float vexc = 3.30f, vPiles = 0.0f;
int   pourcentPiles = -1;
char  nomAppareil[16] = "ENR-T6-0000";
long  decalageHorloge = 0;
unsigned long intervalleMs = 1000, prochainReleve = 0, compteurTrames = 0;
String tamponSerie;

bool a2Vivant = false, a3Vivant = false;
unsigned long prochainSecours = 0;

BLECharacteristic *caracTx = nullptr;
bool clientConnecte = false, clientPrecedent = false;

void envoyerIdentite();
void traiterCommande(String cmd);
void emettre(const char *ligne);

/* ====================================================================
   1. LE BLUETOOTH
   ==================================================================== */
class Connexion : public BLEServerCallbacks {
  void onConnect(BLEServer*)    override { clientConnecte = true; }
  void onDisconnect(BLEServer*) override { clientConnecte = false; }
};

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

void envoyerBLE(const char *texte) {
  if (!clientConnecte || caracTx == nullptr) return;
  size_t reste = strlen(texte);
  const char *p = texte;
  while (reste > 0) {
    size_t bout = reste > 20 ? 20 : reste;      // voir programme 10
    caracTx->setValue((uint8_t*)p, bout);
    caracTx->notify();
    p += bout; reste -= bout;
    delay(6);
  }
}

void emettre(const char *ligne) {
  Serial.println(ligne);
  char avecFin[160];
  snprintf(avecFin, sizeof(avecFin), "%s\n", ligne);
  envoyerBLE(avecFin);
}

/* ====================================================================
   2. LA MÉMOIRE D'ÉTALONNAGE
   ==================================================================== */
void chargerEtalonnage() {
  memoire.begin("enr-t6", true);          // true = lecture seule
  for (int i = 0; i < 6; i++) {
    char cle[4]; snprintf(cle, sizeof(cle), "z%d", i);
    decalage[i] = memoire.getFloat(cle, 0.0f);
  }
  memoire.end();
}

void enregistrerEtalonnage() {
  memoire.begin("enr-t6", false);
  for (int i = 0; i < 6; i++) {
    char cle[4]; snprintf(cle, sizeof(cle), "z%d", i);
    memoire.putFloat(cle, decalage[i]);
  }
  memoire.end();
}

bool etalonnageActif() {
  for (int i = 0; i < 6; i++) if (fabsf(decalage[i]) > 0.001f) return true;
  return false;
}

/* ====================================================================
   3. LA MESURE
   ==================================================================== */
bool circuitRepond(uint8_t adresse) {
  Wire.beginTransmission(adresse);
  return Wire.endTransmission() == 0;
}

void tenterReprise() {
  if (!a2Vivant && circuitRepond(ADRESSE_A2) && a2.begin(ADRESSE_A2, &Wire)) {
    a2.setGain(GAIN_ONE); a2.setDataRate(RATE_ADS1115_128SPS);
    a2Vivant = true; emettre("#OK;A2 revenu");
  }
  if (!a3Vivant && circuitRepond(ADRESSE_A3) && a3.begin(ADRESSE_A3, &Wire)) {
    a3.setGain(GAIN_ONE); a3.setDataRate(RATE_ADS1115_128SPS);
    a3Vivant = true; emettre("#OK;A3 revenu");
  }
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
  /* Un circuit muet est constate AVANT d'etre interroge : sinon la
     bibliotheque rend 0 et l'appareil affiche une temperature fausse
     au lieu d'une panne. C'est la faute a ne pas commettre.           */
  a2Vivant = circuitRepond(ADRESSE_A2);
  a3Vivant = circuitRepond(ADRESSE_A3);

  if (a3Vivant) {
    vexc   = lireVolts(a3, VOIE_VEXC)  * RAPPORT_VEXC;
    vPiles = lireVolts(a3, VOIE_PILES) * RAPPORT_PILES;
    pourcentPiles = (vPiles < SEUIL_PRESENCE_PILES) ? -1 : pourcentDepuisVolts(vPiles);
  }

  for (int i = 0; i < 6; i++) {
    bool vivant = (VOIES[i].adresse == ADRESSE_A2) ? a2Vivant : a3Vivant;
    if (!vivant) { releves[i].etat = HORS_SERVICE; releves[i].celsius = NAN; continue; }

    float v = lireVolts(*VOIES[i].circuit, VOIES[i].entree);
    releves[i].volts = v;
    if (v > SEUIL_ABSENTE * vexc)     { releves[i].etat = ABSENTE;       releves[i].celsius = NAN; }
    else if (v < SEUIL_COURT * vexc)  { releves[i].etat = COURT_CIRCUIT; releves[i].celsius = NAN; }
    else {
      releves[i].etat = MESURE;
      releves[i].celsius = temperatureDepuisVolts(v, vexc) + decalage[i];   // etalonnage ICI
      if (!extremaArmes) { mini[i] = maxi[i] = releves[i].celsius; }
      else {
        if (releves[i].celsius < mini[i]) mini[i] = releves[i].celsius;
        if (releves[i].celsius > maxi[i]) maxi[i] = releves[i].celsius;
      }
    }
  }
  extremaArmes = true;
}

/* ====================================================================
   4. LA TRAME
   ==================================================================== */
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
  char ligne[128];
  snprintf(ligne, sizeof(ligne), "#%s;%s;VOIES=6;INT=%lu;VEXC=%.3f;ALIM=%s;ETAL=%d",
           nomAppareil, VERSION_LOGICIEL, intervalleMs / 1000UL, vexc,
           pourcentPiles >= 0 ? "PILES" : "USB", etalonnageActif() ? 1 : 0);
  emettre(ligne);
}

/* ====================================================================
   5. LES COMMANDES
   ==================================================================== */
void listerEtalonnage() {
  char ligne[128];
  int n = snprintf(ligne, sizeof(ligne), "#ETAL");
  for (int i = 0; i < 6; i++) n += snprintf(ligne + n, sizeof(ligne) - n, ";Z%d=%+.2f", i + 1, decalage[i]);
  emettre(ligne);
}

void listerExtrema() {
  char ligne[160];
  int n = snprintf(ligne, sizeof(ligne), "#EXTREMA");
  for (int i = 0; i < 6; i++) {
    if (releves[i].etat == MESURE || !isnan(mini[i]))
      n += snprintf(ligne + n, sizeof(ligne) - n, ";T%d=%.1f/%.1f", i + 1, mini[i], maxi[i]);
    else
      n += snprintf(ligne + n, sizeof(ligne) - n, ";T%d=/", i + 1);
  }
  emettre(ligne);
}

void traiterCommande(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;
  char reponse[96];

  if (cmd == "?")  { envoyerIdentite();  return; }
  if (cmd == "Z?") { listerEtalonnage(); return; }
  if (cmd == "M?") { listerExtrema();    return; }

  if (cmd == "MR") {
    extremaArmes = false;
    emettre("#OK;extrema remis a zero");
    return;
  }

  if (cmd == "ZR") {
    for (int i = 0; i < 6; i++) decalage[i] = 0.0f;
    enregistrerEtalonnage();
    emettre("#OK;etalonnage efface");
    listerEtalonnage();
    return;
  }

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
      snprintf(reponse, sizeof(reponse), "#OK;intervalle=%ld", n);
      emettre(reponse);
    } else emettre("#ERREUR;intervalle hors 1..3600");
    return;
  }

  /* --- ZCn=valeur : « en ce moment, cette voie voit exactement ceci ».
     C'est l'etalonnage tel qu'on le fait en classe.                   */
  if (cmd.startsWith("ZC") && cmd.length() > 4 && cmd.charAt(3) == '=') {
    int voie = cmd.charAt(2) - '0';
    float reference = cmd.substring(4).toFloat();
    if (voie < 1 || voie > 6) { emettre("#ERREUR;voie hors 1..6"); return; }
    if (releves[voie - 1].etat != MESURE) { emettre("#ERREUR;voie sans mesure valable"); return; }
    float brut = releves[voie - 1].celsius - decalage[voie - 1];
    float nouveau = reference - brut;
    if (fabsf(nouveau) > 9.99f) { emettre("#ERREUR;ecart > 10 K : verifier la sonde"); return; }
    decalage[voie - 1] = nouveau;
    enregistrerEtalonnage();
    snprintf(reponse, sizeof(reponse), "#OK;voie %d etalonnee : brut %.2f -> %.2f (Z=%+.2f)",
             voie, brut, reference, nouveau);
    emettre(reponse);
    return;
  }

  /* --- Zn=valeur : on impose directement le decalage. ---------------- */
  if (cmd.startsWith("Z") && cmd.length() > 3 && cmd.charAt(2) == '=') {
    int voie = cmd.charAt(1) - '0';
    float z = cmd.substring(3).toFloat();
    if (voie < 1 || voie > 6) { emettre("#ERREUR;voie hors 1..6"); return; }
    if (fabsf(z) > 9.99f)     { emettre("#ERREUR;decalage hors -9,99..+9,99"); return; }
    decalage[voie - 1] = z;
    enregistrerEtalonnage();
    snprintf(reponse, sizeof(reponse), "#OK;Z%d=%+.2f", voie, z);
    emettre(reponse);
    return;
  }

  emettre("#ERREUR;commande inconnue (essayer ?)");
}

void lireCommandesSerie() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') { traiterCommande(tamponSerie); tamponSerie = ""; }
    else if (tamponSerie.length() < 40) tamponSerie += c;
  }
}

/* ====================================================================
   6. L'AFFICHAGE — deux pages
   ==================================================================== */
/* --- Le formatage d'affichage. TOUJOURS 5 caracteres, signe compris :
   c'est ce qui empeche les colonnes de danser d'un rafraichissement a
   l'autre. Au-dela de 99,9 degres on laisse tomber la decimale plutot
   que d'elargir la colonne.
   `sortie` doit pouvoir recevoir au moins 8 octets.                    */
void formater(const Releve &r, char *sortie) {
  if (r.etat == ABSENTE)            strcpy(sortie, " ----");
  else if (r.etat == COURT_CIRCUIT) strcpy(sortie, "  -CC");
  else if (r.etat == HORS_SERVICE)  strcpy(sortie, "  -HS");
  else if (r.celsius > 999.0f || r.celsius < -999.0f)   strcpy(sortie, " HORS");
  else if (r.celsius >= 100.0f || r.celsius <= -100.0f) snprintf(sortie, 8, "%+5.0f", r.celsius);
  else                                                  snprintf(sortie, 8, "%+5.1f", r.celsius);
}

void pageTemperatures() {
  char texte[8], ligne[24];
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
  if (pourcentPiles >= 0) { snprintf(ligne, sizeof(ligne), "%d%%", pourcentPiles); ecran.drawStr(104, 56, ligne); }
  else ecran.drawStr(104, 56, "USB");
}

void pageSysteme() {
  char ligne[28];
  ecran.setFont(u8g2_font_6x12_tf);
  ecran.drawStr(0, 11, nomAppareil);
  ecran.setFont(u8g2_font_5x8_tf);
  snprintf(ligne, sizeof(ligne), "Vexc %.3f V", vexc);            ecran.drawStr(0, 24, ligne);
  if (pourcentPiles >= 0) snprintf(ligne, sizeof(ligne), "Piles %.2f V  %d %%", vPiles, pourcentPiles);
  else                    snprintf(ligne, sizeof(ligne), "Alimente par l'USB");
  ecran.drawStr(0, 34, ligne);
  snprintf(ligne, sizeof(ligne), "Intervalle %lu s", intervalleMs / 1000UL); ecran.drawStr(0, 44, ligne);
  snprintf(ligne, sizeof(ligne), "Etalonnage %s", etalonnageActif() ? "OUI" : "non"); ecran.drawStr(0, 54, ligne);
  snprintf(ligne, sizeof(ligne), "A2 %s  A3 %s", a2Vivant ? "ok" : "HS", a3Vivant ? "ok" : "HS");
  ecran.drawStr(0, 63, ligne);
}

void afficher() {
  ecran.clearBuffer();
  bool pageDeux = ((millis() / 8000UL) % 4UL) == 3UL;   // 8 s sur 32
  if (pageDeux) pageSysteme(); else pageTemperatures();
  ecran.sendBuffer();
}

/* ====================================================================
   7. MISE EN ROUTE
   ==================================================================== */
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

  a2Vivant = a2.begin(ADRESSE_A2, &Wire);
  a3Vivant = a3.begin(ADRESSE_A3, &Wire);
  if (a2Vivant) { a2.setGain(GAIN_ONE); a2.setDataRate(RATE_ADS1115_128SPS); }
  if (a3Vivant) { a3.setGain(GAIN_ONE); a3.setDataRate(RATE_ADS1115_128SPS); }

  VOIES[0] = { "T1", &a2, ADRESSE_A2, 0 };  VOIES[1] = { "T2", &a2, ADRESSE_A2, 1 };
  VOIES[2] = { "T3", &a2, ADRESSE_A2, 2 };  VOIES[3] = { "T4", &a2, ADRESSE_A2, 3 };
  VOIES[4] = { "T5", &a3, ADRESSE_A3, 0 };  VOIES[5] = { "T6", &a3, ADRESSE_A3, 1 };
  for (int i = 0; i < 6; i++) { mini[i] = NAN; maxi[i] = NAN; }

  chargerEtalonnage();

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

  ecran.clearBuffer();
  ecran.setFont(u8g2_font_6x12_tf);
  ecran.drawStr(0, 12, "inerWeb Edu");
  ecran.setFont(u8g2_font_helvB10_tf);
  ecran.drawStr(0, 34, nomAppareil);
  ecran.setFont(u8g2_font_5x8_tf);
  ecran.drawStr(0, 50, etalonnageActif() ? "Etalonnage : en memoire" : "Etalonnage : aucun");
  ecran.drawStr(0, 62, "6 voies - BLE actif");
  ecran.sendBuffer();
  delay(2500);

  envoyerIdentite();
  listerEtalonnage();
}

void loop() {
  lireCommandesSerie();

  if (clientConnecte && !clientPrecedent) { delay(200); envoyerIdentite(); listerEtalonnage(); }
  if (!clientConnecte && clientPrecedent) { delay(400); BLEDevice::startAdvertising(); }
  clientPrecedent = clientConnecte;

  /* Un circuit tombe : on retente, sans bloquer le reste. */
  if ((!a2Vivant || !a3Vivant) && (long)(millis() - prochainSecours) >= 0) {
    prochainSecours = millis() + 5000;
    tenterReprise();
  }

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
