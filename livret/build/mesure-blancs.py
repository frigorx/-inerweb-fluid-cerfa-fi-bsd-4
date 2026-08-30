# =====================================================================
# LIVRET « HABILITATION FLUIDE » — LA MESURE DES BLANCS
# ---------------------------------------------------------------------
# Règle de fabrication : aucune page ne doit se terminer sur du vide.
# Un blanc en bas de page se comble par une illustration, une planche,
# un schéma — le fonds est assez fourni pour qu'on n'ait jamais à
# laisser un trou.
#
# Ce script mesure ce blanc sur le PDF RÉEL, page par page : la distance
# entre le bas du dernier élément de contenu et le haut du pied de page.
# À l'œil, on croit toujours qu'il n'y a « que deux ou trois pages » ;
# la mesure dit combien il y en a vraiment, et de quelle hauteur.
#
#   python build/mesure-blancs.py dist/kdp/<interieur>.pdf [seuil_mm]
#
# Le seuil (35 mm par défaut) est la hauteur en dessous de laquelle un
# blanc passe inaperçu à la lecture. Au-dessus, la page paraît inachevée.
# =====================================================================

import json
import os
import sys

import fitz

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

MM = 72 / 25.4

_R = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'reglages.json'),
                    encoding='utf-8'))
_SUF = '%gx%g' % (round(_R['page_l_mm'] / 25.4, 2), round(_R['page_h_mm'] / 25.4, 2))
_DEFAUT = 'dist/kdp/inerweb.fr-HabFluide-Tome1-Livret-eleve-%s.pdf' % _SUF

chemin = sys.argv[1] if len(sys.argv) > 1 else _DEFAUT
seuil = float(sys.argv[2]) if len(sys.argv) > 2 else 35.0

doc = fitz.open(chemin)

# Le pied de page occupe le bas : on ne le compte pas comme du contenu,
# sinon aucune page ne paraîtrait vide. Idem pour le bandeau du haut.
PIED = 22 * MM   # marge basse + hauteur du pied, généreusement
BANDEAU = 18 * MM

mesures = []
for n, page in enumerate(doc, start=1):
    h = page.rect.height
    limite = h - PIED

    bas = None
    for b in page.get_text('blocks'):
        y1 = b[3]
        if y1 <= limite and (bas is None or y1 > bas):
            bas = y1
    for info in page.get_image_info():
        y1 = fitz.Rect(info['bbox']).y1
        if y1 <= limite and (bas is None or y1 > bas):
            bas = y1
    for d in page.get_drawings():
        y1 = d['rect'].y1
        if y1 <= limite and (bas is None or y1 > bas):
            bas = y1

    if bas is None:
        # Page sans aucun contenu au-dessus du pied : entièrement vide.
        mesures.append((n, (limite - BANDEAU) / MM, True))
    else:
        mesures.append((n, (limite - bas) / MM, False))

vides = [m for m in mesures if m[2]]
trous = [m for m in mesures if not m[2] and m[1] >= seuil]
trous.sort(key=lambda m: -m[1])

total = sum(m[1] for m in mesures)
print()
print('━━━ Mesure des blancs de bas de page ━━━')
print(f'  fichier : {chemin.split("/")[-1]}')
print(f'  pages   : {len(doc)}')
print(f'  seuil   : {seuil:.0f} mm')
print()
print(f'  Pages entièrement vides        : {len(vides)}')
print(f'  Pages avec un blanc ≥ {seuil:.0f} mm    : {len(trous)}  ({100 * len(trous) / len(doc):.0f} % du livre)')
print(f'  Blanc cumulé                   : {total / 1000:.2f} m de hauteur, '
      f'soit ~{total / (203):.0f} pages de contenu perdues')
print()

if trous:
    print('  Les vingt pires :')
    for n, mm, _ in trous[:20]:
        barre = '█' * int(mm / 5)
        print(f'    p.{n:<4} {mm:5.0f} mm  {barre}')
if vides:
    print()
    print(f'  Pages vides : {", ".join(str(m[0]) for m in vides[:40])}')

print()
tranche = [0, 0, 0, 0]
for _, mm, _ in mesures:
    if mm < 15:
        tranche[0] += 1
    elif mm < 35:
        tranche[1] += 1
    elif mm < 70:
        tranche[2] += 1
    else:
        tranche[3] += 1
print('  Répartition :')
print(f'    moins de 15 mm (page pleine)   : {tranche[0]:4}')
print(f'    15 à 35 mm (acceptable)        : {tranche[1]:4}')
print(f'    35 à 70 mm (à combler)         : {tranche[2]:4}')
print(f'    plus de 70 mm (trou franc)     : {tranche[3]:4}')
print()
