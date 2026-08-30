# =====================================================================
# LIVRET — MESURE DES BLANCS DE BAS DE PAGE
# ---------------------------------------------------------------------
# La règle de la maquette du 30/08 : « aucune page ne se termine sur du
# vide ». Ce script mesure, page par page, la distance entre le dernier
# contenu de la colonne de texte et le filet du pied — le blanc perdu.
# Il ne corrige rien : il DÉSIGNE les pages où une planche de la réserve
# (les SVG du pack qu'aucune page n'utilise) mérite d'être posée, par
# sujet, jamais pour boucher.
#
#   python build/mesure-blancs.py dist/<livre>.pdf [seuil_mm]
# =====================================================================
import json
import os
import sys

import fitz

MM = 72 / 25.4
_R = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'reglages.json'),
                    encoding='utf-8'))


def mesurer(chemin, seuil_mm=35):
    doc = fitz.open(chemin)
    pied_y = doc[0].rect.height - _R['bas_mm'] * MM
    marge_bloc = (_R['exterieur_mm'] + _R['marge_renvois_mm'] + _R['separation_mm']) * MM
    creux = []
    total = 0.0
    for i, page in enumerate(doc):
        recto = (i % 2 == 0)
        # La colonne de TEXTE seule : la marge de renvois ne compte pas,
        # un renvoi en marge ne remplit pas la page.
        if recto:
            x0, x1 = _R['gouttiere_mm'] * MM, page.rect.width - marge_bloc
        else:
            x0, x1 = marge_bloc, page.rect.width - _R['gouttiere_mm'] * MM
        bas = None
        for b in page.get_text('blocks'):
            r = fitz.Rect(b[:4])
            if r.x1 < x0 + 2 or r.x0 > x1 - 2 or r.y1 > pied_y + 2:
                continue
            bas = r.y1 if bas is None else max(bas, r.y1)
        for info in page.get_image_info():
            r = fitz.Rect(info['bbox'])
            if r.x1 < x0 + 2 or r.x0 > x1 - 2 or r.y1 > pied_y + 2:
                continue
            bas = r.y1 if bas is None else max(bas, r.y1)
        if bas is None:
            continue   # page nue ou blanche : hors sujet
        blanc = (pied_y - bas) / MM
        total += max(blanc, 0)
        if blanc >= seuil_mm:
            creux.append((i + 1, round(blanc)))
    nb_pages = doc.page_count
    doc.close()
    print('blanc cumulé sous le texte : %.2f m sur %d pages' % (total / 1000, nb_pages))
    print('%d page(s) laissent %d mm ou plus :' % (len(creux), seuil_mm))
    for num, mm in creux:
        print('  p.%3d — %d mm' % (num, mm))
    return creux


if __name__ == '__main__':
    mesurer(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 35)
