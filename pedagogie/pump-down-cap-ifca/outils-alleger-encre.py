#!/usr/bin/env python3
"""Délave les aplats d'une image, sans toucher aux traits.

Les planches tirées du sujet d'origine (plan d'implantation, bornier à câbler)
sont des captures en couleurs saturées : rails orange, barrettes bleues, vertes.
Tirées en seize exemplaires, elles vident une cartouche.

Ce script ne laisse intact que le NOIR ET LE GRIS SOMBRE — les traits, les
repères, les textes. Tout le reste est rapproché du blanc : fort pour les
grands aplats clairs, plus doucement pour les couleurs saturées, qui doivent
rester reconnaissables (un fil bleu reste bleu). Le dessin garde sa lecture, la
page coûte beaucoup moins, et le stylo de l'élève ressort par-dessus.

    python3 outils-alleger-encre.py source.png destination.png [délavage]

Le délavage vaut 0,72 par défaut (0 = rien, 1 = tout blanc). Les images du
dossier assets/ sont DÉJÀ délavées : ne pas repasser dessus, régénérer depuis
le sujet d'origine.
"""
import sys

from PIL import Image

SEUIL_TRAIT = 90      # sombre ET gris : c'est un trait, on n'y touche pas
ECART_GRIS = 40       # au-delà, le pixel est coloré, donc ce n'est pas un trait
DELAVAGE = 0.72       # aplats clairs : on délave franchement
DELAVAGE_COULEUR = 0.45  # couleurs saturées : plus doux, elles doivent se lire
SEUIL_CLAIR = 150


def alleger(entree, sortie, delavage=DELAVAGE):
    im = Image.open(entree).convert('RGB')
    pixels = im.load()
    largeur, hauteur = im.size
    touches = 0
    for y in range(hauteur):
        for x in range(largeur):
            r, v, b = pixels[x, y]
            luminance = 0.299 * r + 0.587 * v + 0.114 * b
            colore = max(r, v, b) - min(r, v, b) >= ECART_GRIS
            if luminance < SEUIL_TRAIT and not colore:
                continue                      # trait noir ou gris foncé
            force = delavage if luminance >= SEUIL_CLAIR else DELAVAGE_COULEUR
            pixels[x, y] = tuple(int(c + (255 - c) * force) for c in (r, v, b))
            touches += 1
    im.save(sortie, optimize=True)
    print('%-34s %d x %d, %d %% des pixels délavés'
          % (sortie, largeur, hauteur, round(100 * touches / (largeur * hauteur))))


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    alleger(sys.argv[1], sys.argv[2],
            float(sys.argv[3]) if len(sys.argv) > 3 else DELAVAGE)
