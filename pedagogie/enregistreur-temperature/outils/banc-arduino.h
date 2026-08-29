/* =====================================================================
   banc-arduino.h — LE MINIMUM D'ARDUINO POUR ESSAYER LA LOGIQUE À TERRE
   ---------------------------------------------------------------------
   Ce fichier n'est PAS embarqué. Il sert à `verifier-logique.mjs`, qui
   découpe les fonctions pures du programme final, les compile ici avec
   g++, et compare leurs résultats au tableau de `table-ntc.mjs`.

   POURQUOI SE DONNER CETTE PEINE
     Parce qu'il n'y a pas d'ESP32-C3 dans la machine qui écrit ce
     dossier. Sans ce banc, la seule chose qu'on pourrait dire du code
     serait « il a l'air juste ». Avec lui, on peut dire : la physique,
     le formatage de la trame, la table des piles et l'analyseur de
     commandes sont EXÉCUTÉS et vérifiés — ce sont exactement les
     fonctions du fichier .ino, découpées, jamais recopiées.

     Ce que ce banc NE prouve pas : rien de ce qui touche le matériel.
     Le bus, les convertisseurs, l'écran, le Bluetooth et la
     consommation attendent le prototype (POINTS-OUVERTS.md § B1).
   ===================================================================== */
#pragma once
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <cmath>
#include <string>
#include <vector>
#include <iostream>

using std::isnan;   /* <cmath> range isnan dans std ; Arduino, non. */

/* --- Le temps, pilotable depuis le test. ---------------------------- */
static unsigned long __millis = 0;
inline unsigned long millis() { return __millis; }

/* --- La classe String d'Arduino, réduite à ce que le programme utilise. */
class String {
public:
  std::string s;
  String() {}
  String(const char* p) : s(p ? p : "") {}
  String(const std::string& v) : s(v) {}
  int length() const { return (int)s.size(); }
  const char* c_str() const { return s.c_str(); }
  char charAt(int i) const { return (i >= 0 && i < (int)s.size()) ? s[i] : '\0'; }
  char operator[](int i) const { return charAt(i); }
  bool startsWith(const char* p) const { return s.rfind(p, 0) == 0; }
  String substring(int a) const { return (a >= (int)s.size()) ? String() : String(s.substr(a)); }
  String substring(int a, int b) const {
    if (a >= (int)s.size() || b <= a) return String();
    if (b > (int)s.size()) b = (int)s.size();
    return String(s.substr(a, b - a));
  }
  long  toInt()   const { return strtol(s.c_str(), nullptr, 10); }
  float toFloat() const { return strtof(s.c_str(), nullptr); }
  void  trim() {
    size_t a = s.find_first_not_of(" \t\r\n");
    size_t b = s.find_last_not_of(" \t\r\n");
    s = (a == std::string::npos) ? "" : s.substr(a, b - a + 1);
  }
  String& operator+=(char c) { s += c; return *this; }
  bool operator==(const char* p) const { return s == p; }
};

/* --- Le port série, réduit à ce qu'il faut pour ne rien casser. ------ */
struct FauxSerie {
  void println(const char* t) { (void)t; }
  void println(const String& t) { (void)t; }
  void print(const char* t)   { (void)t; }
  bool available() { return false; }
  int  read() { return -1; }
};
[[maybe_unused]] static FauxSerie Serial;

#define F(x) x

/* --- Ce que le programme final envoie : on le capte au lieu de l'émettre. */
static std::vector<std::string> __emis;
void emettre(const char* ligne) { __emis.push_back(ligne); }
void enregistrerEtalonnage() { /* pas de mémoire flash sur un PC */ }
