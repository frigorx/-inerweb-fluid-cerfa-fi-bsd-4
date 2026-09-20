#!/usr/bin/env python3
"""Construit les deux PDF du TP « pump-down le plus simple du monde ».

  python3 construire.py

Sortie :
  TP-pump-down-le-plus-simple-ELEVE.pdf      (8 pages, fiche d'activité élève)
  TP-pump-down-le-plus-simple-PROFESSEUR.pdf (4 pages, déroulé + corrigés)

Dépendances : un Chromium/Chrome en ligne de commande + pymupdf.
Polices attendues : Calibri (ou Carlito) et Trebuchet MS.
"""
import os, shutil, subprocess, sys, tempfile

import pymupdf

ICI = os.path.dirname(os.path.abspath(__file__))

DOCUMENTS = {
    "TP-pump-down-le-plus-simple-ELEVE.pdf": ["tp-pump-down-eleve.html"],
    "TP-pump-down-le-plus-simple-PROFESSEUR.pdf": ["tp-pump-down-professeur.html"],
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
                "subject": "CAP IFCA · le pump-down le plus simple du monde · câblage du bornier",
                "keywords": "pump-down, bornier, câblage, CAP IFCA, inerWeb Édu",
                "creator": "inerWeb Édu",
            })
            chemin = os.path.join(ICI, pdf)
            final.save(chemin, garbage=4, deflate=True)
            print("%-46s %2d pages  %6.0f Ko" % (pdf, final.page_count, os.path.getsize(chemin) / 1024))
            final.close()


if __name__ == "__main__":
    main()
