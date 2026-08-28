# =====================================================================
# LIVRET « HABILITATION FLUIDE » — FINITION DU PDF
# ---------------------------------------------------------------------
# Le navigateur pagine (lui seul sait couper un paragraphe proprement),
# mais il ne sait pas écrire en haut de CHAQUE page la partie et le
# chapitre courants. Ce script le fait : il relit les marqueurs
# invisibles semés par `build-html.mjs`, puis dessine dans les marges
# réservées le bandeau, le pied et le numéro de page.
#
# Les pages marquées NUE (couverture, ouvertures de partie, planche
# centrale) restent nues : elles se suffisent.
#
# Il ferme aussi le livre pour l'imprimeur : nombre de pages PAIR (une
# feuille porte deux pages ; un compte impair fait ajouter par Amazon une
# page blanche qu'on ne contrôle pas), et la fiche `kdp.gen.json` écrite
# sur la pagination RÉELLE — c'est elle qui donne son dos à la couverture.
#
#   python build/finition.py <fichier.pdf>
# =====================================================================

import re
import sys
import fitz

BLEU = (0x1B / 255, 0x3A / 255, 0x63 / 255)
ORANGE = (0xFF / 255, 0x6B / 255, 0x35 / 255)
MUT = (0x5A / 255, 0x6B / 255, 0x7D / 255)
LIGNE = (0xD6 / 255, 0xDE / 255, 0xE7 / 255)

import json
import os

MM = 72 / 25.4          # 1 mm en points

# Les réglages viennent du même fichier que le CSS : bandeau et pied se
# posent exactement dans les marges que la mise en page a réservées.
_R = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'reglages.json'),
                    encoding='utf-8'))
GOUTTIERE = _R['gouttiere_mm'] * MM
EXTERIEUR = _R['exterieur_mm'] * MM
HAUT = (_R['haut_mm'] - 5) * MM   # ligne de base du bandeau, dans la marge haute

# Le filet du pied se calcule sur la HAUTEUR RÉELLE de la page, jamais en
# dur : le livret est passé de l'A5 au 6 x 9 et un pied figé se serait
# retrouvé au milieu du texte.
BAS_CONTENU = _R['bas_mm']   # marge basse du CSS, en mm
# Le filet se pose juste sous le texte, dans la marge. Il ne descend pas
# plus bas : au-dessous de lui logent le pied et le numéro, et Amazon
# refuse tout ce qui approche à moins de 6,35 mm du bord de page.
def pied_de(hauteur_pt):
    return hauteur_pt - (BAS_CONTENU - 0.4) * MM

# ---------------------------------------------------------------------
# LES POLICES DU BANDEAU — INTÉGRÉES, SANS EXCEPTION
# ---------------------------------------------------------------------
# Amazon KDP refuse un PDF dont une police n'est pas embarquée. Les
# fontes « de base » de PyMuPDF (helv, hebo) ne le sont jamais : elles
# renvoient au lecteur. Le bandeau, le pied et le numéro s'écrivaient
# avec elles — 374 pages sur 383 auraient fait rejeter le fichier.
# On charge donc les vrais fichiers, ceux-là mêmes que le navigateur
# intègre déjà pour le corps du texte : même charte, une seule fonte.
POLICES = {
    'ttitre': 'C:/Windows/Fonts/trebucbd.ttf',   # Trebuchet MS Bold — titres, charte inerWeb
    'tcorps': 'C:/Windows/Fonts/calibri.ttf',    # Calibri — texte courant
}
_FONTES = {n: fitz.Font(fontfile=f) for n, f in POLICES.items()}


def largeur_de(texte, nom, corps):
    """Largeur d'une chaîne dans une police intégrée. `fitz.get_text_length`
    ne sait mesurer que les fontes de base : il aurait décalé tous les
    calages à droite."""
    return _FONTES[nom].text_length(texte, fontsize=corps)

PARTIES = {
    'A': 'Se protéger', 'B': 'Le cadre', 'C': 'Savoir',
    'D': 'Les organes', 'E': 'Les opérations', 'F': 'Fluides à risque et avenir',
}

MARQUEUR = re.compile(r'@@(NUE|LIM|([A-F])\|(\d+))@@')


def contexte_des_pages(doc):
    """Pour chaque page : ('nue', None) | ('lim', None) | ('ch', (partie, num)).

    Un marqueur vaut jusqu'au suivant : une page sans marqueur hérite du
    contexte de la précédente — c'est le cas d'une page de pur texte."""
    courant = ('lim', None)
    sortie = []
    for page in doc:
        texte = page.get_text()
        trouves = MARQUEUR.findall(texte)
        if trouves:
            # Le PREMIER marqueur de la page décide : c'est lui qui est
            # en tête, donc celui dont le bandeau doit parler.
            tag, partie, num = trouves[0]
            if tag == 'NUE':
                courant_page = ('nue', None)
                courant = courant_page
            elif tag == 'LIM':
                courant_page = ('lim', None)
                courant = courant_page
            else:
                courant_page = ('ch', (partie, num))
                courant = courant_page
        else:
            courant_page = courant
        sortie.append(courant_page)
    return sortie


def finir(chemin):
    doc = fitz.open(chemin)
    contextes = contexte_des_pages(doc)
    largeur = doc[0].rect.width
    PIED = pied_de(doc[0].rect.height)
    numero = 0
    nues = 0

    for i, (page, (genre, info)) in enumerate(zip(doc, contextes)):
        if genre == 'nue':
            nues += 1
            continue
        numero += 1

        # Les polices s'attachent page par page : un PDF n'a pas de
        # ressource globale, chaque page déclare les siennes.
        for nom, fichier in POLICES.items():
            page.insert_font(fontname=nom, fontfile=fichier)

        # Page de droite (recto, indice pair) : reliure à gauche.
        # Page de gauche (verso, indice impair) : reliure à droite.
        recto = (i % 2 == 0)
        MARGE_G = GOUTTIERE if recto else EXTERIEUR
        MARGE_D = EXTERIEUR if recto else GOUTTIERE

        if genre == 'ch':
            partie, num = info
            page.draw_line(fitz.Point(MARGE_G, HAUT + 2 * MM),
                           fitz.Point(largeur - MARGE_D, HAUT + 2 * MM),
                           color=ORANGE, width=1.6)
            page.insert_text(
                fitz.Point(MARGE_G, HAUT),
                'Partie %s · %s' % (partie, PARTIES.get(partie, '').upper()),
                fontname='ttitre', fontsize=7.4, color=BLEU)
            libelle = 'Chapitre %s' % num
            page.insert_text(
                fitz.Point(largeur - MARGE_D - largeur_de(libelle, 'ttitre', 7.4), HAUT),
                libelle, fontname='ttitre', fontsize=7.4, color=ORANGE)

        # Le pied, sur toutes les pages numérotées
        page.draw_line(fitz.Point(MARGE_G, PIED), fitz.Point(largeur - MARGE_D, PIED),
                       color=LIGNE, width=0.6)
        # Le tiret cadratin passe maintenant : Calibri le porte, et elle
        # est intégrée. (Avec les fontes de base il sortait en point médian.)
        # Tout ce qui suit tient entre le filet et la limite d'Amazon : la
        # pastille a été resserrée pour que son bord reste à 7 mm du bord
        # de page. Elle descendait à 3,2 mm — hors zone imprimable.
        page.insert_text(fitz.Point(MARGE_G, PIED + 3.2 * MM),
                         'inerweb.fr · HabFluide, tome 1 — la théorie',
                         fontname='tcorps', fontsize=6.8, color=MUT)
        RAYON = 2.6 * MM
        centre = fitz.Point(largeur - MARGE_D - RAYON, PIED + 2.9 * MM)
        page.draw_circle(centre, RAYON, color=BLEU, fill=BLEU)
        etiquette = str(numero)
        page.insert_text(
            fitz.Point(centre.x - largeur_de(etiquette, 'ttitre', 7) / 2,
                       centre.y + 0.9 * MM),
            etiquette, fontname='ttitre', fontsize=7, color=(1, 1, 1))

    # ---- Le compte doit être PAIR ----------------------------------
    # Une feuille imprimée porte deux pages. Sur un compte impair, Amazon
    # ajoute lui-même une page blanche en fin d'ouvrage : autant la poser
    # nous-mêmes, elle reste alors dans le fichier qu'on a relu.
    ajoutee = 0
    if doc.page_count % 2 == 1:
        doc.new_page(width=doc[0].rect.width, height=doc[0].rect.height)
        ajoutee = 1

    # Le fichier est réécrit en entier plutôt qu'en incrémental : les
    # polices ajoutées et la page blanche doivent entrer dans la table
    # des objets, et le nettoyage rend au passage une bonne part du poids.
    doc.save(chemin + '.tmp', garbage=3, deflate=True)
    doc.close()
    os.replace(chemin + '.tmp', chemin)

    print('  finition : %d pages numérotées, %d nues%s'
          % (numero, nues, ', 1 blanche de fin (compte pair)' if ajoutee else ''))
    # L'édition DYS est plus aérée, donc plus longue : elle ne doit pas
    # écrire la fiche de cotes, sinon la couverture prendrait son dos à
    # elle pour un livre qui n'est pas celui qu'on vend.
    if 'DYS' not in os.path.basename(chemin).upper():
        fiche_kdp(chemin)
    else:
        print('  (édition DYS : la fiche de cotes reste celle du livre vendu)')


def fiche_kdp(chemin):
    """Écrit `kdp.gen.json` sur la pagination RÉELLE du fichier fini.

    Cette fiche n'était renseignée à la main nulle part et portait 406
    pages pour un livre qui en faisait 383 : le dos de la couverture
    était faux de plus d'un millimètre. Elle se calcule ici, une fois le
    PDF fermé, parce qu'ici seulement la pagination est définitive."""
    doc = fitz.open(chemin)
    pages = doc.page_count
    l_po, h_po = doc[0].rect.width / 72, doc[0].rect.height / 72
    doc.close()

    DOS_PAR_PAGE = 0.002252   # pouce par page, papier blanc, intérieur N&B
    FOND_PERDU = 0.125        # pouce sur chaque bord extérieur de la couverture
    dos_po = pages * DOS_PAR_PAGE
    cout = 0.60 + 0.012 * pages     # broché N&B, impression et distribution Europe

    # La marge de reliure exigée par Amazon dépend de la pagination.
    for plafond, exigee in ((150, 0.375), (300, 0.5), (500, 0.625), (700, 0.75), (828, 0.875)):
        if pages <= plafond:
            reliure_po = exigee
            break
    else:
        reliure_po = 0.875

    fiche = {
        '_doc': "Écrit par build/finition.py à chaque fabrication, jamais à la main. "
                "C'est cette fiche qui donne son dos à la couverture.",
        'pages': pages,
        'dos_mm': round(dos_po * 25.4, 2),
        'couverture_mm': [round((2 * l_po + dos_po + 2 * FOND_PERDU) * 25.4, 2),
                          round((h_po + 2 * FOND_PERDU) * 25.4, 2)],
        'format': '%g x %g pouces' % (l_po, h_po),
        'reliure_exigee_mm': round(reliure_po * 25.4, 2),
        'reliure_reglee_mm': _R['gouttiere_mm'],
        'cout_impression_estime_eur': round(cout, 2),
        'prix_minimum_eur': round(cout / 0.6 + 0.005, 2),   # redevance 60 %, seuil KDP
    }
    with open(os.path.join(os.path.dirname(__file__), '..', 'kdp.gen.json'),
              'w', encoding='utf-8') as f:
        json.dump(fiche, f, ensure_ascii=False, indent=1)
    print('  fiche KDP : %d pages · dos %.2f mm · couverture %.2f x %.2f mm'
          % (pages, fiche['dos_mm'], *fiche['couverture_mm']))
    if _R['gouttiere_mm'] < reliure_po * 25.4:
        print('  ⚠ reliure réglée à %g mm, Amazon en exige %.2f pour %d pages'
              % (_R['gouttiere_mm'], reliure_po * 25.4, pages))


if __name__ == '__main__':
    finir(sys.argv[1])
