# =====================================================================
# LIVRET « HABILITATION FLUIDE » — LE CONTRÔLE AVANT TÉLÉVERSEMENT
# ---------------------------------------------------------------------
# Amazon KDP ne discute pas : il accepte ou il refuse, et il refuse
# après le téléversement, sur des critères qu'on ne voit pas à l'œil.
# Ce script les vérifie sur le fichier RÉEL, celui qu'on va envoyer.
#
# Il sort en erreur si un critère bloquant saute : la livraison ne peut
# pas être déclarée prête sur une impression favorable.
#
#   python build/verifier-kdp.py dist/kdp/<interieur>.pdf [<couverture>.pdf]
# =====================================================================

import json
import os
import sys

import fitz

# La console Windows parle cp1252 : sans cela, le script s'arrête sur son
# propre premier titre — et la chaîne conclurait à un paquet refusé.
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

MM = 72 / 25.4
PO = 72.0

# Les fontes « base 14 » du PDF ne sont jamais embarquées : le lecteur va
# les chercher dans le système. KDP les refuse.
BASE14 = {'Helvetica', 'Courier', 'Times-Roman', 'Symbol', 'ZapfDingbats'}

blocages = []
reserves = []


def bloque(m):
    blocages.append(m)


def reserve(m):
    reserves.append(m)


def controler_interieur(chemin):
    doc = fitz.open(chemin)
    pages = doc.page_count
    print('  fichier : %s (%.1f Mo)' % (os.path.basename(chemin),
                                        os.path.getsize(chemin) / 1e6))

    # ---- 1. Un seul format, et c'est le format déclaré ----
    formats = {(round(p.rect.width, 1), round(p.rect.height, 1)) for p in doc}
    if len(formats) > 1:
        bloque('plusieurs formats de page dans le même fichier : %s' % formats)
    l, h = doc[0].rect.width, doc[0].rect.height
    print('  format  : %.4f x %.4f pouces (%.1f x %.1f mm)'
          % (l / PO, h / PO, l / MM, h / MM))
    _r = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'reglages.json'),
                       encoding='utf-8'))
    attendu_l, attendu_h = _r['page_l_mm'] / 25.4, _r['page_h_mm'] / 25.4
    if abs(l / PO - attendu_l) > 0.01 or abs(h / PO - attendu_h) > 0.01:
        bloque('le format n’est pas %g x %g pouces' % (attendu_l, attendu_h))

    # ---- 2. Pagination ----
    print('  pages   : %d' % pages)
    if pages % 2:
        bloque('nombre de pages impair : l’imprimeur ajoutera une page qu’on ne maîtrise pas')
    if not 24 <= pages <= 828:
        bloque('hors des bornes KDP (24 à 828 pages en broché noir et blanc)')

    # ---- 3. Toutes les polices embarquées ----
    absentes, type3 = set(), set()
    for p in doc:
        for xref, ext, typ, nom, *_ in p.get_fonts(full=True):
            if typ == 'Type3':
                type3.add(xref)
            elif ext == 'n/a' or nom.split('+')[-1] in BASE14:
                absentes.add(nom or '(sans nom)')
    if absentes:
        bloque('polices NON embarquées : %s' % ', '.join(sorted(absentes)))
    else:
        print('  polices : toutes embarquées')
    if type3:
        reserve('%d police(s) Type 3 (glyphes dessinés dans le fichier) : '
                'embarquées, mais souvent issues d’un emoji couleur — à regarder' % len(type3))

    # ---- 3 bis. Aucun marqueur de fabrication dans la couche texte ----
    # Les « @@…@@ » guident bandeaux, renvois et comblement, puis la
    # finition les efface. Invisibles à l'œil (1 pt, blanc), ils restent
    # lisibles à la recherche et à la synthèse vocale : douze ont déjà
    # survécu à une césure de slug. On refuse le fichier qui en garde un.
    restes = sum(len(p.search_for('@@')) for p in doc)
    if restes:
        bloque('%d marqueur(s) de fabrication « @@ » restés dans la couche texte' % restes)
    else:
        print('  marqueurs : couche texte propre')

    # ---- 4. Rien ne sort de la zone imprimable ----
    # Sans fond perdu, KDP exige 0,25 pouce de blanc sur les trois bords
    # extérieurs. On mesure la boîte de ce qui est réellement dessiné.
    marge = 0.25 * PO
    debords = []
    for i, p in enumerate(doc):
        boite = None
        for b in p.get_text('blocks'):
            r = fitz.Rect(b[:4])
            boite = r if boite is None else boite | r
        for bloc_img in p.get_image_info():
            r = fitz.Rect(bloc_img['bbox'])
            boite = r if boite is None else boite | r
        if boite is None or boite.is_empty:
            continue
        if (boite.x0 < marge - 1 or boite.y0 < marge - 1
                or boite.x1 > l - marge + 1 or boite.y1 > h - marge + 1):
            debords.append(i + 1)
    if debords:
        bloque('contenu à moins de 6,35 mm du bord sur %d page(s) : %s%s'
               % (len(debords), debords[:12], ' …' if len(debords) > 12 else ''))
    else:
        print('  marges  : aucun contenu à moins de 6,35 mm du bord')

    # ---- 5. Définition des images ----
    # KDP demande 300 ppp. On mesure la définition EFFECTIVE : pixels de
    # l'image rapportés à la taille à laquelle elle est posée sur la page.
    faibles = []
    for i, p in enumerate(doc):
        for info in p.get_image_info(xrefs=True):
            r = fitz.Rect(info['bbox'])
            if r.width < 2 or r.height < 2:
                continue
            ppp = min(info['width'] / (r.width / PO), info['height'] / (r.height / PO))
            if ppp < 300:
                faibles.append((i + 1, round(ppp)))
    if faibles:
        pire = min(f[1] for f in faibles)
        reserve('%d image(s) sous 300 ppp (la plus faible : %d ppp) — '
                'acceptées par KDP, mais moins nettes' % (len(faibles), pire))
    else:
        print('  images  : toutes à 300 ppp ou plus')

    # ---- 6. La fiche de cotes dit-elle la vérité ? ----
    fiche = os.path.join(os.path.dirname(__file__), '..', 'kdp.gen.json')
    if os.path.exists(fiche):
        k = json.load(open(fiche, encoding='utf-8'))
        if k['pages'] != pages:
            bloque('kdp.gen.json annonce %d pages, le fichier en a %d : '
                   'le dos de la couverture serait faux' % (k['pages'], pages))
        else:
            print('  dos     : %.2f mm, calculé sur ces %d pages' % (k['dos_mm'], pages))
        if k['reliure_reglee_mm'] < k['reliure_exigee_mm']:
            bloque('marge de reliure %.1f mm alors que KDP en exige %.2f à %d pages'
                   % (k['reliure_reglee_mm'], k['reliure_exigee_mm'], pages))
    doc.close()


def controler_couverture(chemin):
    doc = fitz.open(chemin)
    print('\n  couverture : %s' % os.path.basename(chemin))
    if doc.page_count != 1:
        bloque('la couverture doit tenir en UNE page, elle en a %d' % doc.page_count)
    fiche = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'kdp.gen.json'),
                           encoding='utf-8'))
    attendu_l, attendu_h = fiche['couverture_mm']
    reel_l, reel_h = doc[0].rect.width / MM, doc[0].rect.height / MM
    print('  format     : %.2f x %.2f mm (attendu %.2f x %.2f)'
          % (reel_l, reel_h, attendu_l, attendu_h))
    if abs(reel_l - attendu_l) > 0.5 or abs(reel_h - attendu_h) > 0.5:
        bloque('la couverture ne fait pas les cotes exigées pour %d pages' % fiche['pages'])
    absentes = set()
    for p in doc:
        for xref, ext, typ, nom, *_ in p.get_fonts(full=True):
            if typ != 'Type3' and (ext == 'n/a' or nom.split('+')[-1] in BASE14):
                absentes.add(nom or '(sans nom)')
    if absentes:
        bloque('couverture : polices non embarquées : %s' % ', '.join(sorted(absentes)))
    doc.close()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit('usage : python build/verifier-kdp.py <interieur.pdf> [couverture.pdf]')
    print('\n━━━ Contrôle avant téléversement Amazon KDP ━━━')
    controler_interieur(sys.argv[1])
    if len(sys.argv) > 2 and os.path.exists(sys.argv[2]):
        controler_couverture(sys.argv[2])
    else:
        reserve('couverture non contrôlée : le PDF n’a pas été fourni')

    print()
    for m in reserves:
        print('  ⚠ %s' % m)
    if blocages:
        for m in blocages:
            print('  ✖ %s' % m)
        sys.exit('\n✖ %d critère(s) bloquant(s) : le fichier n’est PAS prêt.' % len(blocages))
    print('✔ Le fichier passe tous les critères bloquants d’Amazon KDP.')
