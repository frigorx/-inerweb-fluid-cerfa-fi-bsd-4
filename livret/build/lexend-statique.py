# -*- coding: utf-8 -*-
"""
LEXEND — INSTANCES STATIQUES POUR L'IMPRESSION
------------------------------------------------------------------
Lexend n'existe dans le pack qu'en fonte VARIABLE (`Lexend-variable.woff2`,
axe `wght` de 100 a 900). A l'ecran, Chrome la gere parfaitement.

A l'impression, non : il l'instancie glyphe par glyphe et ecrit le corps
du livre en polices de TYPE 3 — des dessins vectoriels dupliques au lieu
d'une police embarquee. Mesure sur le PDF : 1 058 caracteres de Type 3
sur une page de texte courant, sur 25 polices Type 3 au total.

Ce n'est pas bloquant pour Amazon, qui les accepte des lors qu'elles sont
embarquees. C'est mauvais pour l'impression : le fichier gonfle, et les
chaines de prepresse traitent mal ce format.

La reparation consiste a produire deux instances STATIQUES — regulier
(400) et gras (700) — que Chrome embarque comme n'importe quelle police.

Usage :  python build/lexend-statique.py
Sortie :  livret/fontes/Lexend-400.woff2 et Lexend-700.woff2

Les fichiers produits sont commis : ils sont derives d'une police sous
licence SIL OFL (voir LICENCE-LEXEND.txt dans le pack), qui autorise la
modification et la redistribution. Le nom « Lexend » est conserve, comme
l'OFL l'autorise pour une instance non modifiee autrement que par
l'instanciation d'un axe.
"""
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

try:
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont
except ImportError:
    print("fontTools est requis :  pip install fonttools brotli")
    sys.exit(1)

ICI = os.path.dirname(os.path.abspath(__file__))
PACK = os.environ.get('PILOTE_FLUIDES', 'C:/git/pilote-fluides')
SOURCE = os.path.join(PACK, 'moteur', 'polices', 'Lexend-variable.woff2')
SORTIE = os.path.join(ICI, '..', 'fontes')

if not os.path.exists(SOURCE):
    print("Lexend introuvable : %s" % SOURCE)
    print("Verifier PILOTE_FLUIDES.")
    sys.exit(1)

os.makedirs(SORTIE, exist_ok=True)

for poids in (400, 700):
    f = TTFont(SOURCE)
    instantiateVariableFont(f, {'wght': poids}, inplace=True, updateFontNames=True)
    f.flavor = 'woff2'
    cible = os.path.join(SORTIE, 'Lexend-%d.woff2' % poids)
    f.save(cible)
    print("  ✔ %s  (%d Ko)" % (os.path.basename(cible), os.path.getsize(cible) // 1024))

print("Instances statiques ecrites dans livret/fontes/.")
