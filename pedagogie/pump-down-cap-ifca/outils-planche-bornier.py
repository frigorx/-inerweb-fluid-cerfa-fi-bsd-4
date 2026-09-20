"""Planches du bornier, fabriquées depuis le folio 3/12 du fonds établissement.

Le folio 3/12 (« Schéma PUMP DOWN le plus simple du monde », F. Henninot) porte le
bornier câblé au complet. On en tire deux planches :

  assets/bornier-a-tracer.svg   les fils de couleur retirés — l'élève les trace
  assets/bornier-corrige.svg    les fils gardés — le corrigé du professeur

Dans les deux cas les barrettes du bornier sont délavées : économie d'encre, et
le tracé de l'élève ressort par-dessus. Les fils du corrigé, eux, gardent leur
couleur pleine — ce sont des traits fins, et ils doivent se lire.

Le tri est fait sur la couleur du TRAIT : un fil est un tracé dont le contour est
vert, bleu ou rouge pur. Les barrettes colorées du bornier, elles, sont des
remplissages sans contour : elles restent.

    python3 outils-planche-bornier.py
"""
import pymupdf

SRC = '/root/.claude/uploads/d0e3a17c-1275-5586-8d7c-6b2285edd9bd/9d121f56-Sch_ma_PUMP_DOWN_le_plus_simple_du_monde_2.pdf'
FILS = {(0.0, 1.0, 0.0), (0.0, 0.0, 1.0), (1.0, 0.0, 0.0)}   # vert, bleu, rouge purs

# Économie d'encre : les barrettes du bornier sont de grands aplats saturés
# (orange, bleu, vert, jaune, gris). On les délave vers le blanc — le code
# couleur reste lisible, la page coûte trois fois moins, et le stylo de
# l'élève ressort par-dessus. Le NOIR (traits, repères, textes) ne bouge pas.
DELAVAGE = 0.72


def delaver(c):
    """Rapproche un remplissage du blanc, sauf s'il est noir ou déjà pâle."""
    if c is None:
        return None
    if max(c) < 0.25:            # noir et gris très foncés : les traits
        return c
    return tuple(v + (1.0 - v) * DELAVAGE for v in c)


def arrondi(c):
    return None if c is None else tuple(round(v, 3) for v in c)


def est_un_fil(dr):
    return arrondi(dr.get('color')) in FILS and dr['type'] in ('s', 'fs')


def rebatir(pno, clip, sortie, garder_fils=False):
    src = pymupdf.open(SRC)
    page = src[pno]
    out = pymupdf.open()
    new = out.new_page(width=clip.width, height=clip.height)
    dx, dy = -clip.x0, -clip.y0
    sh = new.new_shape()
    gardes = 0
    for dr in page.get_drawings():
        if not garder_fils and est_un_fil(dr):
            continue
        if not dr['rect'].intersects(clip):
            continue
        for it in dr['items']:
            try:
                if it[0] == 'l':
                    sh.draw_line(it[1] + (dx, dy), it[2] + (dx, dy))
                elif it[0] == 're':
                    sh.draw_rect(it[1] + (dx, dy, dx, dy))
                elif it[0] == 'qu':
                    q = it[1]
                    sh.draw_quad(pymupdf.Quad(q.ul + (dx, dy), q.ur + (dx, dy),
                                              q.ll + (dx, dy), q.lr + (dx, dy)))
                elif it[0] == 'c':
                    sh.draw_bezier(it[1] + (dx, dy), it[2] + (dx, dy),
                                   it[3] + (dx, dy), it[4] + (dx, dy))
            except Exception:
                pass
        remplissage = delaver(dr.get('fill'))
        sh.finish(fill=remplissage, color=dr.get('color'),
                  width=dr.get('width') or 0.6, closePath=dr.get('closePath', False),
                  even_odd=dr.get('even_odd', False), dashes=dr.get('dashes'),
                  fill_opacity=dr.get('fill_opacity') or 1,
                  stroke_opacity=dr.get('stroke_opacity') or 1)
        gardes += 1
    sh.commit()
    textes = 0
    for b in page.get_text('dict')['blocks']:
        if b['type'] != 0:
            continue
        for li in b['lines']:
            for sp in li['spans']:
                p = pymupdf.Point(sp['origin'][0] + dx, sp['origin'][1] + dy)
                if not clip.contains(pymupdf.Point(sp['origin'])):
                    continue
                gras = 'bold' in sp['font'].lower()
                col = tuple((sp['color'] >> s & 255) / 255 for s in (16, 8, 0))
                horiz = abs(li['dir'][0]) > abs(li['dir'][1])
                try:
                    new.insert_text(p, sp['text'], fontsize=sp['size'],
                                    fontname='hebo' if gras else 'helv', color=col,
                                    rotate=0 if horiz else 90)
                    textes += 1
                except Exception:
                    pass
    # Le folio source n'étiquette pas le PSL (oubli du document d'origine) :
    # on replace le repère à sa place, au même corps que ses voisins.
    new.insert_text(pymupdf.Point(352.0 + dx, 507.2 + dy), 'PSL',
                    fontsize=7.5, fontname='helv', color=(0, 0, 0))
    if sortie.endswith('.svg'):
        open(sortie, 'w').write(new.get_svg_image(text_as_path=True))
    else:
        out.save(sortie)
    print('%s : %d tracés, %d textes' % (sortie, gardes, textes))


CLIP = pymupdf.Rect(85, 25, 660, 516)
rebatir(2, CLIP, 'assets/bornier-a-tracer.svg', garder_fils=False)
rebatir(2, CLIP, 'assets/bornier-corrige.svg', garder_fils=True)
