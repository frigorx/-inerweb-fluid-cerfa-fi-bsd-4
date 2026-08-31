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
MARGE_RENVOIS = _R['marge_renvois_mm'] * MM
SEPARATION = _R['separation_mm'] * MM
# Le bord du TEXTE côté tranche : marge extérieure + renvois + séparation.
EXTERIEUR_TEXTE = EXTERIEUR + MARGE_RENVOIS + SEPARATION
# Ligne de base du bandeau, dans la marge haute. À haut_mm − 3 : le sommet
# des capitales reste au-delà des 6,35 mm exigés par KDP, le filet tombe à
# haut_mm − 1, juste au-dessus du texte. (À − 5, le bandeau montait à
# 5,3 mm du bord avec la marge haute de 13 mm : contrôle bloquant.)
HAUT = (_R['haut_mm'] - 3) * MM

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
# Chaque rôle liste ses candidats du plus fidèle au repli : la machine de
# l'auteur (Windows, vraies Trebuchet/Calibri) d'abord, puis Carlito — le
# clone métrique libre de Calibri (paquet fonts-crosextra-carlito) — pour
# toute machine Linux de fabrication. Sans lui, la finition plantait en
# silence : pas de bandeaux, compte impair, kdp.gen.json jamais réécrit.
_CARLITO = '/usr/share/fonts/truetype/crosextra'
_CANDIDATS = {
    'ttitre': ['C:/Windows/Fonts/trebucbd.ttf', f'{_CARLITO}/Carlito-Bold.ttf'],
    'tcorps': ['C:/Windows/Fonts/calibri.ttf',  f'{_CARLITO}/Carlito-Regular.ttf'],
}

def _premier_chemin(candidats):
    for f in candidats:
        if os.path.exists(f):
            return f
    raise SystemExit('finition : aucune police trouvée parmi ' + ', '.join(candidats)
                     + ' — installer fonts-crosextra-carlito.')

# POLICES garde sa forme d'origine — nom → chemin — car le reste du script
# passe ces chemins tels quels à insert_font().
POLICES = {n: _premier_chemin(c) for n, c in _CANDIDATS.items()}
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

# Le marqueur porte la partie, le chapitre, et les codes du référentiel
# que la leçon déclare traiter : « @@D|11;8.01,8.05@@ ».
MARQUEUR = re.compile(r'@@(NUE|LIM|([A-F])\|(\d+)(?:;([\d.,]+))?)@@')
# Chaque ligne du sommaire porte la sienne : « @@SOM|4@@ ».
MARQUEUR_SOM = re.compile(r'@@SOM\|(\d+)@@')
# La marge de renvois : « @@QR|surchauffe-2|l@@ » — le slug de l'alias
# et un type (c chapitre, l leçon, a animation, e entraînement) ; le
# CONTENU du renvoi, lui, vit dans le manifeste qr.gen.json.
# Le slug peut arriver CÉSURÉ à son tiret (« rev-⏎g12 » en fin de titre) :
# le motif tolère le saut de ligne, la pose recolle avant de chercher —
# sans quoi dix-neuf renvois de QCM disparaissaient sans un mot.
MARQUEUR_QR = re.compile(r'@@QR\|([a-z0-9\n-]+)\|([clae])@@')


def contexte_des_pages(doc):
    """Pour chaque page : (genre, info, codes).

    genre vaut 'nue', 'lim' ou 'ch'. `codes` est la liste des codes du
    référentiel que les leçons de CETTE page déclarent traiter — tous les
    marqueurs de la page comptent, pas seulement le premier : une page
    porte souvent la fin d'une leçon et le début de la suivante.

    Un marqueur vaut jusqu'au suivant : une page sans marqueur hérite du
    contexte de la précédente — c'est le cas d'une page de pur texte."""
    courant = ('lim', None)
    codes_courants = []
    sortie = []
    for page in doc:
        texte = page.get_text()
        trouves = MARQUEUR.findall(texte)
        codes_page = []
        for _tag, _partie, _num, liste in trouves:
            for code in (liste or '').split(','):
                if code and code not in codes_page:
                    codes_page.append(code)
        if trouves:
            # Le PREMIER marqueur décide du bandeau : c'est lui qui est en
            # tête de page, donc celui dont le lecteur voit le titre.
            tag, partie, num, _liste = trouves[0]
            if tag == 'NUE':
                courant_page = ('nue', None)
            elif tag == 'LIM':
                courant_page = ('lim', None)
            else:
                courant_page = ('ch', (partie, num))
            courant = courant_page
            # Une page sans code propre garde ceux de la leçon en cours.
            if codes_page:
                codes_courants = codes_page
            elif courant_page[0] != 'ch':
                codes_courants = []
        else:
            courant_page = courant
        sortie.append((courant_page[0], courant_page[1],
                       codes_page or (codes_courants if courant_page[0] == 'ch' else [])))
    return sortie


def finir(chemin):
    doc = fitz.open(chemin)
    contextes = contexte_des_pages(doc)
    largeur = doc[0].rect.width
    PIED = pied_de(doc[0].rect.height)
    # Le LOGO de la marque, pour le pied de CHAQUE page (règle de
    # F. Henninot, 31/08 : une photocopie doit montrer la marque, pas
    # « inerweb.fr » en typo courante). Le PDF vectoriel est préparé par
    # build-html avec les fontes de marque de la machine (marque.mjs) ;
    # show_pdf_page n'embarque qu'UN objet, réutilisé sur tout le livre.
    # Sans lui, le pied garde son ancien texte — la chaîne ne casse pas.
    _logo_chemin = os.path.join(os.path.dirname(chemin), 'logo-pied.pdf')
    logo = fitz.open(_logo_chemin) if os.path.exists(_logo_chemin) else None
    numero = 0
    nues = 0

    inventaire = {}            # code du référentiel -> [pages où il est vu]
    debuts = {}               # numéro de chapitre -> page où il commence
    fins = {}                 # numéro de chapitre -> dernière page vue
    zones_marqueurs = []      # (index de page, rectangles à effacer)

    for i, (page, (genre, info, codes)) in enumerate(zip(doc, contextes)):
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
        MARGE_G = GOUTTIERE if recto else EXTERIEUR_TEXTE
        MARGE_D = EXTERIEUR_TEXTE if recto else GOUTTIERE

        if genre == 'ch':
            partie, num = info
            # La première page où paraît un chapitre est celle que le
            # sommaire doit annoncer, et celle que le signet doit viser.
            if num not in debuts:
                debuts[num] = (numero, i, partie)
            fins[num] = numero
            page.draw_line(fitz.Point(MARGE_G, HAUT + 2 * MM),
                           fitz.Point(largeur - MARGE_D, HAUT + 2 * MM),
                           color=ORANGE, width=1.6)
            page.insert_text(
                fitz.Point(MARGE_G, HAUT),
                'Partie %s · %s' % (partie, PARTIES.get(partie, '').upper()),
                fontname='ttitre', fontsize=8, color=BLEU)
            libelle = 'Chapitre %s' % num
            page.insert_text(
                fitz.Point(largeur - MARGE_D - largeur_de(libelle, 'ttitre', 8), HAUT),
                libelle, fontname='ttitre', fontsize=8, color=ORANGE)

        # Le pied, sur toutes les pages numérotées
        page.draw_line(fitz.Point(MARGE_G, PIED), fitz.Point(largeur - MARGE_D, PIED),
                       color=LIGNE, width=0.6)
        # Le tiret cadratin passe maintenant : Calibri le porte, et elle
        # est intégrée. (Avec les fontes de base il sortait en point médian.)
        # Tout ce qui suit tient entre le filet et la limite d'Amazon : la
        # pastille a été resserrée pour que son bord reste à 7 mm du bord
        # de page. Elle descendait à 3,2 mm — hors zone imprimable.
        if logo:
            l_h = 3.6 * MM
            l_w = l_h * logo[0].rect.width / logo[0].rect.height
            page.show_pdf_page(fitz.Rect(MARGE_G, PIED + 0.7 * MM,
                                         MARGE_G + l_w, PIED + 0.7 * MM + l_h), logo, 0)
            page.insert_text(fitz.Point(MARGE_G + l_w + 1.6 * MM, PIED + 3.2 * MM),
                             '— partie théorique',
                             fontname='tcorps', fontsize=7.6, color=MUT)
            pied_gauche = l_w + 1.6 * MM + largeur_de('— partie théorique', 'tcorps', 7.6)
        else:
            page.insert_text(fitz.Point(MARGE_G, PIED + 3.2 * MM),
                             'inerweb.fr · HAB-FLUIDE — partie théorique',
                             fontname='tcorps', fontsize=7.6, color=MUT)
            pied_gauche = largeur_de('inerweb.fr · HAB-FLUIDE — partie théorique', 'tcorps', 7.6)

        # Les compétences du référentiel travaillées SUR CETTE PAGE. Elles
        # s'écrivent en clair : le lecteur sait ce qu'il vient de couvrir,
        # et le formateur peut pointer sa progression code par code.
        if genre == 'ch' and codes:
            for code in codes:
                inventaire.setdefault(code, []).append(numero)
            libelle_codes = 'Référentiel : ' + ' · '.join(codes)
            largeur_codes = largeur_de(libelle_codes, 'tcorps', 7.6)
            # Le numéro occupe la droite : les codes s'arrêtent avant lui.
            place = largeur - MARGE_D - 9 * MM - largeur_codes
            if place > MARGE_G + pied_gauche + 6 * MM:
                page.insert_text(fitz.Point(place, PIED + 3.2 * MM),
                                 libelle_codes, fontname='tcorps', fontsize=7.6, color=BLEU)
        RAYON = 2.6 * MM
        centre = fitz.Point(largeur - MARGE_D - RAYON, PIED + 2.9 * MM)
        page.draw_circle(centre, RAYON, color=BLEU, fill=BLEU)
        etiquette = str(numero)
        page.insert_text(
            fitz.Point(centre.x - largeur_de(etiquette, 'ttitre', 7) / 2,
                       centre.y + 0.9 * MM),
            etiquette, fontname='ttitre', fontsize=7, color=(1, 1, 1))

    # ---- Le sommaire reçoit ses numéros de page --------------------
    # Ils n'existaient nulle part avant maintenant : la pagination est
    # celle du navigateur, et le sommaire est imprimé bien avant que le
    # premier chapitre ne tombe sur sa page. On les écrit ici, alignés à
    # droite, au bout du trait de conduite.
    poses = 0
    for page in doc:
        texte = page.get_text()
        if '@@SOM|' not in texte:
            continue
        for num in MARQUEUR_SOM.findall(texte):
            if num not in debuts:
                continue
            imprime = debuts[num][0]
            zones = page.search_for('@@SOM|%s@@' % num)
            if not zones:
                continue
            ligne = zones[0]
            # Le numéro se pose à droite de la justification, sur la même
            # ligne de base que le titre du chapitre.
            recto = (page.number % 2 == 0)
            marge_d = EXTERIEUR_TEXTE if recto else GOUTTIERE
            libelle = str(imprime)
            page.insert_font(fontname='ttitre', fontfile=POLICES['ttitre'])
            page.insert_text(
                fitz.Point(page.rect.width - marge_d - largeur_de(libelle, 'ttitre', 10),
                           ligne.y1 - 0.6),
                libelle, fontname='ttitre', fontsize=10, color=BLEU)
            poses += 1

    # ---- La MARGE DE RENVOIS : la colonne numérique du livre --------
    # Le flux sème des marqueurs @@QR|slug|type@@ ; chacun devient un
    # RENVOI posé en regard dans la marge extérieure : le QR (20 mm),
    # le genre (station, leçon narrée, fiche, animation, des questions ?),
    # un titre, une ligne qui dit ce qu'on va trouver, et l'adresse en
    # clair. Les textes viennent du manifeste qr.gen.json — retoucher un
    # libellé se fait là-bas, jamais ici. Maquette 7 × 10 du 30/08.
    QR_DIR = os.path.join(os.path.dirname(__file__), '..', 'qr.gen')
    with open(os.path.join(os.path.dirname(__file__), '..', 'qr.gen.json'),
              encoding='utf-8') as f:
        RENVOIS = {e['slug']: e for e in json.load(f)}
    QR_TAILLE = 20 * MM
    qr_poses, qr_manques, qr_detail = 0, 0, []
    for page, (genre, _info, _codes) in zip(doc, contextes):
        if genre == 'nue':
            continue
        texte = page.get_text()
        if '@@QR|' not in texte:
            continue
        page.insert_font(fontname='ttitre', fontfile=POLICES['ttitre'])
        page.insert_font(fontname='tcorps', fontfile=POLICES['tcorps'])
        recto = (page.number % 2 == 0)
        if recto:
            x0 = page.rect.width - EXTERIEUR - MARGE_RENVOIS
            x_filet = x0 - SEPARATION / 2
        else:
            x0 = EXTERIEUR
            x_filet = x0 + MARGE_RENVOIS + SEPARATION / 2
        x1 = x0 + MARGE_RENVOIS
        haut_util = HAUT + 4 * MM
        bas_util = pied_de(page.rect.height) - 2 * MM
        # Le filet de séparation et l'invite, une fois par page à renvois.
        page.draw_line(fitz.Point(x_filet, haut_util),
                       fitz.Point(x_filet, bas_util), color=LIGNE, width=0.6)
        page.insert_text(fitz.Point(x0, haut_util + 2.6 * MM), 'VOUS VOULEZ',
                         fontname='ttitre', fontsize=6.4, color=ORANGE)
        page.draw_line(fitz.Point(x0, haut_util + 3.9 * MM),
                       fitz.Point(x1, haut_util + 3.9 * MM), color=ORANGE, width=1.2)
        curseur = haut_util + 6.5 * MM
        occupes = []          # les intervalles déjà posés, pour le repli
        # Chaque marqueur de la page, une fois, trié par hauteur.
        a_poser = []
        for brut, type_ in dict.fromkeys(MARQUEUR_QR.findall(texte)):
            slug = brut.replace('\n', '')
            zones = page.search_for('@@QR|%s|%s@@' % (slug, type_))
            if not zones and '\n' in brut:
                # rendu césuré : la needle doit porter le saut tel quel
                zones = page.search_for('@@QR|%s|%s@@' % (brut, type_))
            if zones:
                a_poser.append((zones[0].y0, slug))
        a_poser.sort()
        for y_marqueur, slug in a_poser:
            e = RENVOIS.get(slug)
            if not e:
                # Césure au tiret : l'extraction du PDF peut PERDRE le tiret
                # de fin de ligne (« etancheite-⏎5 » lu « etancheite\n5 »,
                # recollé « etancheite5 »). On rapproche par forme sans
                # tirets — seulement si UNE entrée correspond.
                plat = slug.replace('-', '')
                candidats = [k for k in RENVOIS if k.replace('-', '') == plat]
                if len(candidats) == 1:
                    slug = candidats[0]
                    e = RENVOIS[slug]
            fichier = os.path.join(QR_DIR, slug + '.png')
            if not e or not os.path.exists(fichier):
                qr_manques += 1
                qr_detail.append('%s (p.%d, %s)' % (
                    slug, page.number + 1, 'sans entrée' if not e else 'sans image'))
                continue
            r = e.get('renvoi', {})
            repli = False
            y = max(y_marqueur - 1 * MM, curseur)
            # Le bloc : QR, genre, titre (2 lignes max), quoi (4 lignes
            # max), adresse (2 lignes). Les textbox disent la place prise.
            h_max = QR_TAILLE + 26 * MM
            if y + h_max > bas_util:
                y = bas_util - h_max
                if y < curseur:
                    # Le bas de la marge est plein — cas des fins de
                    # chapitre, où « Entraînez-vous » et le rappel de la
                    # station se disputent le pied. Le bloc se replie dans
                    # le dernier creux assez grand plus haut : moins en
                    # regard, mais présent.
                    y = None
                    bornes = [haut_util + 6.5 * MM]
                    for d, f_ in sorted(occupes):
                        bornes += [d, f_]
                    bornes.append(bas_util)
                    for k in range(0, len(bornes) - 1, 2):
                        if bornes[k + 1] - bornes[k] >= h_max:
                            y = bornes[k + 1] - h_max
                    if y is None:
                        qr_manques += 1   # plus de place dans la marge
                        qr_detail.append('%s (p.%d, sans place)' % (slug, page.number + 1))
                        continue
                    repli = True
            page.insert_image(fitz.Rect(x0, y, x0 + QR_TAILLE, y + QR_TAILLE),
                              filename=fichier)
            y2 = y + QR_TAILLE + 1.6 * MM
            genre_r = (r.get('genre') or 'en ligne').upper()
            page.draw_line(fitz.Point(x0 + 0.3 * MM, y2 - 1.7 * MM),
                           fitz.Point(x0 + 0.3 * MM, y2 + 0.3 * MM),
                           color=ORANGE, width=1.6)
            page.insert_text(fitz.Point(x0 + 1.8 * MM, y2), genre_r,
                             fontname='ttitre', fontsize=6, color=BLEU)
            y2 += 1.2 * MM
            boite = fitz.Rect(x0, y2, x1, y2 + 8 * MM)
            reste = page.insert_textbox(boite, r.get('titre', e.get('titre', '')),
                                        fontname='ttitre', fontsize=7, color=BLEU,
                                        lineheight=1.22)
            y2 += (boite.height - max(reste, 0)) + 0.6 * MM
            boite = fitz.Rect(x0, y2, x1, y2 + 12 * MM)
            reste = page.insert_textbox(boite, r.get('quoi', ''),
                                        fontname='tcorps', fontsize=6.5, color=MUT,
                                        lineheight=1.3)
            y2 += (boite.height - max(reste, 0)) + 0.6 * MM
            page.insert_text(fitz.Point(x0, y2 + 1.6 * MM), 'inerweb.fr/f/',
                             fontname='tcorps', fontsize=5.5, color=MUT)
            fs = 5.5
            if largeur_de(slug, 'ttitre', fs) > MARGE_RENVOIS:
                fs = fs * MARGE_RENVOIS / largeur_de(slug, 'ttitre', fs)
            page.insert_text(fitz.Point(x0, y2 + 3.9 * MM), slug,
                             fontname='ttitre', fontsize=fs, color=BLEU)
            fin = y2 + 6 * MM + 2 * MM
            if not repli:
                curseur = fin
            occupes.append((y, fin))
            qr_poses += 1

    # ---- Les blancs de pied, notés pour le comblement ---------------
    # La maquette du 30/08 veut qu'aucune page ne se termine sur du
    # vide. Avant d'effacer les marqueurs, on note donc, page par page
    # de contenu, le blanc entre le dernier élément de la colonne de
    # texte et le pied, et la dernière ancre @@P|ch-n@@ visible.
    # combler.mjs lira ce relevé pour poser une planche de la réserve
    # à la prochaine fabrication — par sujet, jamais pour boucher.
    MARQUEUR_P = re.compile(r'@@P\|(\d+-\d+)@@')
    blancs = []
    for page, (genre, _info, _codes) in zip(doc, contextes):
        if genre == 'nue':
            continue
        pied_y = pied_de(page.rect.height) - 2 * MM
        recto = (page.number % 2 == 0)
        if recto:
            x0t, x1t = GOUTTIERE, page.rect.width - EXTERIEUR_TEXTE
        else:
            x0t, x1t = EXTERIEUR_TEXTE, page.rect.width - GOUTTIERE
        bas = None
        for b in page.get_text('blocks'):
            r = fitz.Rect(b[:4])
            if r.x1 < x0t + 2 or r.x0 > x1t - 2 or r.y1 > pied_y + 2:
                continue
            bas = r.y1 if bas is None else max(bas, r.y1)
        for info_img in page.get_image_info():
            r = fitz.Rect(info_img['bbox'])
            if r.x1 < x0t + 2 or r.x0 > x1t - 2 or r.y1 > pied_y + 2:
                continue
            bas = r.y1 if bas is None else max(bas, r.y1)
        if bas is None:
            continue
        derniere, y_derniere = None, -1
        for cle in set(MARQUEUR_P.findall(page.get_text())):
            zones = page.search_for('@@P|%s@@' % cle)
            if zones and zones[0].y0 > y_derniere:
                derniere, y_derniere = cle, zones[0].y0
        blancs.append({'page': page.number + 1,
                       'blanc_mm': round((pied_y - bas) / MM, 1),
                       'ancre': derniere})
    with open(os.path.join(os.path.dirname(__file__), '..', 'blancs.gen.json'),
              'w', encoding='utf-8') as f:
        json.dump(blancs, f, ensure_ascii=False, indent=1)

    # ---- Les marqueurs internes quittent la couche texte -----------
    # Ils ont servi : la partie, le chapitre et les codes sont posés. Ils
    # restaient pourtant dans le PDF — invisibles à l'œil (1 pt, blanc sur
    # blanc) mais bien présents à la recherche, au copier-coller et à la
    # synthèse vocale. « @@D|11;8.01@@ » n'a rien à faire dans un livre.
    # L'effacement cherche chaque marqueur COMPLET, jamais des « @@ »
    # appariés deux à deux : à 1 pt, deux marqueurs voisins se touchent,
    # l'ordre géométrique s'embrouille, et l'appariement laissait dix-sept
    # « @@ » orphelins dans le livre. Un motif entier ne s'embrouille pas.
    # Le motif tolère un saut de ligne AU MILIEU du marqueur : en fin de
    # titre, le slug d'un renvoi se césure à son tiret (« securite-⏎3 »),
    # et douze marqueurs restaient dans le livre. search_for cherche à
    # travers les sauts ; on lui redonne alors le texte d'une traite.
    MOTIF_MARQUEUR = re.compile(r'@@[^@]{1,90}@@')
    efface = 0
    for page in doc:
        cibles = set(MOTIF_MARQUEUR.findall(page.get_text()))
        if not cibles:
            continue
        for m in cibles:
            zones = page.search_for(m)
            if not zones and '\n' in m:
                zones = page.search_for(m.replace('\n', ''))
            for boite in zones:
                boite.x1 = min(boite.x1 + 2, page.rect.x1)
                page.add_redact_annot(boite)
                efface += 1
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE,
                              graphics=fitz.PDF_REDACT_LINE_ART_NONE)

    # ---- Les signets : un livre de trois cents pages en a besoin ----
    # Le lecteur d'un PDF navigue par le panneau des signets ; sans eux,
    # il fait défiler. Un signet par chapitre, dans l'ordre des pages.
    if debuts:
        toc = []
        for num in sorted(debuts, key=lambda n: debuts[n][0]):
            imprime, index, partie = debuts[num]
            titre = 'Chapitre %s' % num
            toc.append([1, titre, index + 1])
        doc.set_toc(toc)

    # ---- Ce que le lecteur voit dans les propriétés du fichier ------
    doc.set_metadata({
        'title': 'inerweb.fr HAB-FLUIDE — partie théorique',
        'author': 'F. Henninot',
        'subject': "Préparation à l'épreuve théorique de l'attestation d'aptitude "
                   'fluides frigorigènes — catégories A1, A2, D et E',
        'keywords': 'fluides frigorigènes, attestation d\'aptitude, A1, A2, D, E, '
                    'froid, climatisation, F-Gas, arrêté du 21 novembre 2025',
        'creator': 'inerWeb — chaîne de fabrication livret/build',
    })

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
    if logo:
        logo.close()
    os.replace(chemin + '.tmp', chemin)

    with open(os.path.join(os.path.dirname(__file__), '..', 'inventaire-pages.gen.json'),
              'w', encoding='utf-8') as f:
        json.dump({c: sorted(set(p)) for c, p in sorted(inventaire.items())},
                  f, ensure_ascii=False, indent=1)
    # L'étendue de chaque chapitre, de sa première à sa dernière page vue :
    # la remédiation de l'examen blanc (pages /f/) s'en sert pour dire
    # « à revoir : chapitre 7, pages 96 à 104 » — d'après le tirage réel,
    # jamais d'après une intention.
    with open(os.path.join(os.path.dirname(__file__), '..', 'chapitres-pages.gen.json'),
              'w', encoding='utf-8') as f:
        json.dump({n: [debuts[n][0], fins[n]] for n in sorted(debuts, key=int)},
                  f, ensure_ascii=False, indent=1)
    print('  référentiel : %d codes marqués en pied de page' % len(inventaire))
    print('  nettoyage : %d marqueurs internes effacés · %d signets posés'
          % (efface, len(debuts)))
    print('  sommaire : %d numéros de page écrits' % poses)
    print('  colonne numérique : %d QR posés en marge%s'
          % (qr_poses, ' · %d sans place ou sans image' % qr_manques if qr_manques else ''))
    for d in qr_detail:
        print('    renvoi sauté : %s' % d)
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
