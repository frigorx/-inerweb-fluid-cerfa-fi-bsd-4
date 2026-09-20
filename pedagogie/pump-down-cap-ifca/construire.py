#!/usr/bin/env python3
"""Construit les deux PDF de la séance 2CAP26-S39-02 à partir des sources HTML.

  python3 construire.py

Sortie :
  Lundi-21-09-2026-Apres-midi-ELEVE.pdf      (fiche de cours + TP-02-B + ressource)
  Lundi-21-09-2026-Apres-midi-PROFESSEUR.pdf (fiche de séance + TP-02-B professeur)

Dépendances : un Chromium/Chrome en ligne de commande + pymupdf.
Polices attendues : Calibri (ou Carlito) et Trebuchet MS.
"""
import os, shutil, subprocess, sys, tempfile

import pymupdf

ICI = os.path.dirname(os.path.abspath(__file__))

DOCUMENTS = {
    "Lundi-21-09-2026-Apres-midi-ELEVE.pdf": ["fiche-cours-eleve.html", "tp-02-b-eleve.html"],
    "Lundi-21-09-2026-Apres-midi-PROFESSEUR.pdf": ["seance-professeur.html", "tp-02-b-professeur.html"],
}

CHROMES = [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    shutil.which("chromium"), shutil.which("chromium-browser"),
    shutil.which("google-chrome"), shutil.which("chrome"),
]


def chrome():
    for c in CHROMES:
        if c and os.path.exists(c):
            return c
    sys.exit("Aucun Chromium trouvé : installez-en un ou complétez la liste CHROMES.")


def rendre(html, sortie, navigateur):
    subprocess.run([
        navigateur, "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
        "--run-all-compositor-stages-before-draw", "--virtual-time-budget=20000",
        "--no-pdf-header-footer", "--print-to-pdf=" + sortie,
        "file://" + os.path.join(ICI, html),
    ], check=True, capture_output=True)


def main():
    navigateur = chrome()
    with tempfile.TemporaryDirectory() as tmp:
        for pdf, pages in DOCUMENTS.items():
            final = pymupdf.open()
            presents = [h for h in pages if os.path.exists(os.path.join(ICI, h))]
            if not presents:
                print("%-46s ignoré (aucune source présente)" % pdf)
                continue
            if len(presents) < len(pages):
                manquants = [h for h in pages if h not in presents]
                print("   note : source(s) absente(s), non incluse(s) : " + ", ".join(manquants))
            for html in presents:
                morceau = os.path.join(tmp, html + ".pdf")
                rendre(html, morceau, navigateur)
                final.insert_pdf(pymupdf.open(morceau))
            final.set_metadata({
                "title": pdf.replace(".pdf", "").replace("-", " "),
                "author": "F. Henninot — LPP Jacques Raynaud, Campus ÉQUATIO",
                "subject": "CAP IFCA 2A · séance 2CAP26-S39-02 · le pump-down simple",
                "keywords": "pump-down, bornier, CAP IFCA, inerWeb Édu",
                "creator": "inerWeb Édu",
            })
            chemin = os.path.join(ICI, pdf)
            final.save(chemin, garbage=4, deflate=True)
            print("%-46s %2d pages  %6.0f Ko" % (pdf, final.page_count, os.path.getsize(chemin) / 1024))
            final.close()


if __name__ == "__main__":
    main()
