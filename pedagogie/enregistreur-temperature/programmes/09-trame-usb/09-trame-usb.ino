/* =====================================================================
   PROGRAMME 09 — LA TRAME, SUR L'USB
   inerWeb Édu — Enregistreur de températures 6 voies
   ---------------------------------------------------------------------
   CE QUE CE PROGRAMME AJOUTE AU 08
     Une LIGNE DE TEXTE par relevé, envoyée sur l'USB, dans le format
     figé au § 26 du dossier maître :

       12:31:05;T1=4.8;T2=-3.2;T3=8.7;T4=52.1;T5=31.4;T6=24.8;BAT=78

     Un point-virgule entre les champs, un signe = dans chaque champ,
     un retour à la ligne à la fin. Rien d'autre.

   POURQUOI CE FORMAT ET PAS DU JSON
     - un élève le lit à l'œil nu et voit tout de suite ce qui cloche ;
     - un tableur l'ouvre directement, séparateur point-virgule, qui est
       celui d'un tableur français ;
     - il tient dans une notification Bluetooth de 20 octets… non : il
       fait 61 caractères, ce qui impose de demander une MTU plus grande
       au programme 10. C'est justement une chose à comprendre.

   LA RÈGLE DES CHAMPS VIDES — une seule règle, pas deux
     Un champ VIDE veut dire « pas de mesure valable ».
       T2=          la sonde 2 est absente, coupée ou en court-circuit
       BAT=         l'appareil n'est pas sur piles (sélecteur sur USB)
     Un tableur affiche une cellule vide, ce qui est exactement juste.

   LA LIGNE D'IDENTITÉ
     Toutes les 60 trames, et à chaque demande, une ligne commençant par
     un dièse :

       #ENR-T6-3A7F;v1.0;VOIES=6;INT=1;VEXC=3.301;ALIM=PILES

     Le dièse est le signe universel du commentaire. Un tableur peut
     l'ignorer, un élève la lit, et l'outil d'acquisition s'en sert pour
     nommer le fichier.

   L'HORLOGE — et c'est un vrai sujet
     Cet appareil n'a pas de pile d'horloge. À la mise sous tension, il
     ne sait pas quelle heure il est. Il compte donc le temps ÉCOULÉ
     depuis le démarrage, à partir de 00:00:00.
     Un enregistreur autonome connaît des DURÉES, pas des dates.
     Le PC ou le téléphone, lui, connaît l'heure : il l'envoie avec la
     commande H= dès qu'il se connecte, et l'appareil s'y range.

   LES COMMANDES (tapées dans le moniteur série, ligne par ligne)
     ?              renvoie la ligne d'identité
     H=14:05:30     règle l'horloge
     I=5            un relevé toutes les 5 secondes (1 a 3600)
   ===================================================================== */

#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <U8g2lib.h>
#include <math.h>

const int BROCHE_SDA = 5;
const int BROCHE_SCL = 6;
const char* VERSION_LOGICIEL = "v1.0";

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

/* --- L'horloge. Un decalage en secondes ajoute au temps ecoule. ------- */
long  decalageHorloge = 0;              // secondes
unsigned long intervalleMs = 1000;      // periode entre deux trames
unsigned long prochainReleve = 0;
unsigned long compteurTrames = 0;

String tampon;                          // ligne de commande en cours

/* Declarations : setup() les appelle avant leur definition. */
void envoyerIdentite();
void traiterCommande(String cmd);

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

  envoyerIdentite();
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

/* --- L'heure, au format hh:mm:ss, bornee a 24 h. ---------------------- */
void heureCourante(char *sortie, size_t taille) {
  long s = (long)(millis() / 1000UL) + decalageHorloge;
  s = ((s % 86400L) + 86400L) % 86400L;
  snprintf(sortie, taille, "%02ld:%02ld:%02ld", s / 3600, (s / 60) % 60, s % 60);
}

/* --- LA TRAME. Une seule fonction, un seul endroit ou le format vit. -- */
void construireTrame(char *sortie, size_t taille) {
  char heure[9];
  heureCourante(heure, sizeof(heure));
  int n = snprintf(sortie, taille, "%s", heure);
  for (int i = 0; i < 6; i++) {
    if (releves[i].etat == MESURE)
      n += snprintf(sortie + n, taille - n, ";T%d=%.1f", i + 1, releves[i].celsius);
    else
      n += snprintf(sortie + n, taille - n, ";T%d=", i + 1);
  }
  if (pourcentPiles >= 0) snprintf(sortie + n, taille - n, ";BAT=%d", pourcentPiles);
  else                    snprintf(sortie + n, taille - n, ";BAT=");
}

void envoyerIdentite() {
  char ligne[96];
  snprintf(ligne, sizeof(ligne), "#%s;%s;VOIES=6;INT=%lu;VEXC=%.3f;ALIM=%s",
           nomAppareil, VERSION_LOGICIEL, intervalleMs / 1000UL, vexc,
           pourcentPiles >= 0 ? "PILES" : "USB");
  Serial.println(ligne);
}

/* --- Les commandes. Une ligne, une action, un accuse de reception. ---- */
void traiterCommande(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  if (cmd == "?") { envoyerIdentite(); return; }

  if (cmd.startsWith("H=") && cmd.length() == 10) {
    int h = cmd.substring(2, 4).toInt();
    int m = cmd.substring(5, 7).toInt();
    int s = cmd.substring(8, 10).toInt();
    if (h < 24 && m < 60 && s < 60) {
      decalageHorloge = (long)h * 3600 + m * 60 + s - (long)(millis() / 1000UL);
      Serial.println(F("#OK;horloge reglee"));
    } else Serial.println(F("#ERREUR;heure invalide"));
    return;
  }

  if (cmd.startsWith("I=")) {
    long n = cmd.substring(2).toInt();
    if (n >= 1 && n <= 3600) {
      intervalleMs = (unsigned long)n * 1000UL;
      Serial.print(F("#OK;intervalle=")); Serial.println(n);
    } else Serial.println(F("#ERREUR;intervalle hors 1..3600"));
    return;
  }

  Serial.print(F("#ERREUR;commande inconnue : ")); Serial.println(cmd);
}

void lireCommandes() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') { traiterCommande(tampon); tampon = ""; }
    else if (tampon.length() < 40) tampon += c;
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
  char heure[9]; heureCourante(heure, sizeof(heure));
  ecran.drawStr(0, 56, heure);
  ecran.drawStr(48, 56, "USB");
  if (pourcentPiles >= 0) {
    snprintf(ligne, sizeof(ligne), "%d%%", pourcentPiles);
    ecran.drawStr(104, 56, ligne);
  }
  ecran.sendBuffer();
}

void loop() {
  lireCommandes();

  if ((long)(millis() - prochainReleve) >= 0) {
    prochainReleve = millis() + intervalleMs;
    balayer();
    afficher();

    char trame[96];
    construireTrame(trame, sizeof(trame));
    Serial.println(trame);

    if (++compteurTrames % 60 == 0) envoyerIdentite();
  }
  delay(5);
}
