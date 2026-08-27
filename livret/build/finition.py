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
#   python build/finition.py <fichier.pdf>
# =====================================================================

import re
import sys
import fitz

BLEU = (0x1B / 255, 0x3A / 255, 0x63 / 255)
ORANGE = (0xFF / 255, 0x6B / 255, 0x35 / 255)
MUT = (0x5A / 255, 0x6B / 255, 0x7D / 255)
LIGNE = (0xD6 / 255, 0xDE / 255, 0xE7 / 255)

MM = 72 / 25.4          # 1 mm en points
MARGE = 19 * MM         # marge latérale, celle du CSS (reliure KDP)
HAUT = 13 * MM          # ligne de base du bandeau, dans la marge du haut

# Le filet du pied se calcule sur la HAUTEUR RÉELLE de la page, jamais en
# dur : le livret est passé de l'A5 au 6 x 9 et un pied figé se serait
# retrouvé au milieu du texte.
BAS_CONTENU = 16        # marge basse du CSS, en mm
def pied_de(hauteur_pt):
    return hauteur_pt - (BAS_CONTENU - 3.4) * MM

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

    for page, (genre, info) in zip(doc, contextes):
        if genre == 'nue':
            nues += 1
            continue
        numero += 1

        if genre == 'ch':
            partie, num = info
            page.draw_line(fitz.Point(MARGE, HAUT + 2 * MM),
                           fitz.Point(largeur - MARGE, HAUT + 2 * MM),
                           color=ORANGE, width=1.6)
            page.insert_text(
                fitz.Point(MARGE, HAUT),
                'Partie %s · %s' % (partie, PARTIES.get(partie, '').upper()),
                fontname='hebo', fontsize=7.4, color=BLEU)
            libelle = 'Chapitre %s' % num
            page.insert_text(
                fitz.Point(largeur - MARGE - fitz.get_text_length(
                    libelle, fontname='hebo', fontsize=7.4), HAUT),
                libelle, fontname='hebo', fontsize=7.4, color=ORANGE)

        # Le pied, sur toutes les pages numérotées
        page.draw_line(fitz.Point(MARGE, PIED), fitz.Point(largeur - MARGE, PIED),
                       color=LIGNE, width=0.6)
        # Pas de tiret cadratin ici : les polices de base du PDF ne le
        # portent pas et il ressort en point médian. On l'écrit tel quel.
        page.insert_text(fitz.Point(MARGE, PIED + 4 * MM),
                         'inerweb.fr · HabFluide, tome 1 · la théorie',
                         fontname='helv', fontsize=6.8, color=MUT)
        centre = fitz.Point(largeur - MARGE - 3.2 * MM, PIED + 3.2 * MM)
        page.draw_circle(centre, 3.2 * MM, color=BLEU, fill=BLEU)
        etiquette = str(numero)
        page.insert_text(
            fitz.Point(centre.x - fitz.get_text_length(etiquette, fontname='hebo', fontsize=7.6) / 2,
                       centre.y + 1.1 * MM),
            etiquette, fontname='hebo', fontsize=7.6, color=(1, 1, 1))

    doc.saveIncr()
    print('  finition : %d pages numérotées, %d pages nues (couverture, ouvertures)'
          % (numero, nues))


if __name__ == '__main__':
    finir(sys.argv[1])
