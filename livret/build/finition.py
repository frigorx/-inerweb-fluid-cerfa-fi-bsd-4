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
# Cote tranche, le bandeau et le pied s'alignent sur la colonne de TEXTE,
# pas sur le bord du papier : la marge de renvois et sa gouttiere leur sont
# etrangeres. Sans cela, un filet de pied passerait sous les QR.
EXTERIEUR = (_R['exterieur_mm'] + _R.get('marge_renvois_mm', 0)
             + _R.get('separation_mm', 0)) * MM
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

# Le marqueur porte la partie, le chapitre, et les codes du référentiel
# que la leçon déclare traiter : « @@D|11;8.01,8.05@@ ».
MARQUEUR = re.compile(r'@@(NUE|LIM|([A-F])\|(\d+)(?:;([\d.,]+))?)@@')
# Chaque ligne du sommaire porte la sienne : « @@SOM|4@@ ».
MARQUEUR_SOM = re.compile(r'@@SOM\|(\d+)@@')


# =====================================================================
# LA MARGE DE RENVOIS — « Vous voulez en savoir plus ? »
# ---------------------------------------------------------------------
# Le livre ouvre sur inerweb.fr par une colonne de QR, côté tranche. Elle
# ne peut pas être dessinée par le navigateur : lui ne sait pas, au moment
# où il coule le texte, si un bloc finira sur une page de droite ou de
# gauche — or le code doit toujours tomber du côté de la TRANCHE, jamais
# dans la pliure, sinon le téléphone ne peut pas le lire à plat.
#
# La mise en page laisse donc un marqueur invisible « @@QR|<slug>@@ » à la
# hauteur voulue, et c'est ici, la pagination faite, qu'on le retrouve et
# qu'on dessine. Le marqueur est effacé plus bas, avec les autres.
#
# Quatre genres, une promesse par code — voir `build/qr.mjs`.
# =====================================================================
MARQUEUR_QR = re.compile(r'@@QR\|([a-z0-9-]+)@@')
MANQUANTS = []   # (slug, raison) — un renvoi promis qu'on n'a pas posé

_QR_JSON = os.path.join(os.path.dirname(__file__), '..', 'qr.gen.json')
RENVOIS = {e['slug']: e for e in json.load(open(_QR_JSON, encoding='utf-8'))} \
    if os.path.exists(_QR_JSON) else {}
DOSSIER_QR = os.path.join(os.path.dirname(__file__), '..', 'qr.gen')

TRANCHE = _R['exterieur_mm'] * MM
BANDE = _R.get('marge_renvois_mm', 0) * MM
SEPAR = _R.get('separation_mm', 0) * MM
COTE_QR = 20 * MM

# Ce que le lecteur lit sous le code. Le genre n'est PAS en orange : à
# 6 pt, l'orange aplati en gris par l'impression noir et blanc devient
# illisible. Bleu pour la lettre, filet orange pour la couleur — un filet
# est une surface, il survit au niveau de gris.
GENRES = {
    'station': 'la station',
    'lecon': 'la leçon',
    'animation': 'l’animation',
    'entrainement': 'des questions ?',
}


def poser_renvois(page, recto, largeur, pied_y):
    """Dessine dans la marge extérieure les renvois marqués sur cette page.

    Renvoie le nombre de codes posés. Les renvois s'empilent sans se
    chevaucher : un titre de leçon peut en porter deux (la leçon narrée
    et l'animation de sa planche)."""
    if not BANDE or not RENVOIS:
        return 0
    texte = page.get_text()
    if '@@QR|' not in texte:
        return 0

    x0 = (largeur - TRANCHE - BANDE) if recto else TRANCHE
    poses = 0
    bas_precedent = 0

    trouves = []
    for slug in MARQUEUR_QR.findall(texte):
        e = RENVOIS.get(slug)
        if not e:
            MANQUANTS.append((slug, 'inconnu du manifeste'))
            continue
        zones = page.search_for('@@QR|%s@@' % slug)
        if not zones:
            MANQUANTS.append((slug, 'marqueur illocalisable'))
            continue
        trouves.append((zones[0].y0, e))
    trouves.sort(key=lambda t: t[0])

    for y_voulu, e in trouves:
        y = max(y_voulu, bas_precedent + 4 * MM)

        # Un renvoi mesure environ 40 mm : s'il ne tient plus avant le
        # pied, il remonte plutôt que de déborder dans la marge basse,
        # qu'Amazon contrôle.
        hauteur = COTE_QR + 16 * MM
        if y + hauteur > pied_y - 3 * MM:
            y = pied_y - 3 * MM - hauteur
        if y < 0:
            MANQUANTS.append((e['slug'], 'pas la place dans la marge'))
            continue

        img = os.path.join(DOSSIER_QR, e.get('fichier') or '%s.png' % e['slug'])
        if os.path.exists(img):
            page.insert_image(fitz.Rect(x0, y, x0 + COTE_QR, y + COTE_QR),
                              filename=img)

        curseur = y + COTE_QR + 3.4 * MM
        genre = GENRES.get(e.get('genre'), '')
        if genre:
            page.draw_line(fitz.Point(x0, curseur - 2.2 * MM),
                           fitz.Point(x0, curseur + 0.4 * MM),
                           color=ORANGE, width=1.6)
            page.insert_text(fitz.Point(x0 + 1.4 * MM, curseur),
                             genre.upper(), fontname='ttitre', fontsize=6,
                             color=BLEU)
            curseur += 3.2 * MM

        # Titre et phrase : insert_textbox replie tout seul dans la bande.
        boite = fitz.Rect(x0, curseur - 2.6 * MM, x0 + BANDE, pied_y - 2 * MM)
        reste = page.insert_textbox(boite, e.get('titre', ''),
                                    fontname='ttitre', fontsize=7,
                                    color=BLEU, lineheight=1.15)
        if reste >= 0:
            lignes_titre = boite.height - reste
            boite2 = fitz.Rect(x0, boite.y0 + lignes_titre + 1.2 * MM,
                               x0 + BANDE, pied_y - 2 * MM)
            page.insert_textbox(boite2, e.get('phrase', ''),
                                fontname='tcorps', fontsize=6.4,
                                color=MUT, lineheight=1.2)
            bas_precedent = boite2.y0 + 12 * MM
        else:
            bas_precedent = y + hauteur
        poses += 1

    return poses


# =====================================================================
# LE COMBLEMENT — aucune page ne se termine sur du vide
# ---------------------------------------------------------------------
# Règle de fabrication de F. Henninot : un blanc en bas de page se comble
# par une illustration, jamais par du vide. Le fonds est assez fourni pour
# qu'on n'ait pas à laisser de trou — 93 pages en laissaient 35 mm ou
# plus, jusqu'à 196 mm.
#
# Le comblement ne peut se faire qu'ICI : avant la pagination, personne ne
# sait où tombera une coupure ni combien de place il restera. On mesure
# donc le vide réel, puis on y pose une planche de la RÉSERVE du chapitre
# — celles que `reserve.mjs` a rattachées à son sujet.
#
# ⚠️ ET ON N'EN POSE AUCUNE AUTRE. Une image décorative qui ne traite pas
# le sujet de la page est pire qu'un blanc : elle fait croire à un rapport
# qui n'existe pas. Un chapitre sans réserve garde donc ses blancs, et le
# compte rendu le dit — c'est une information, pas un échec silencieux.
# =====================================================================
_RESERVE_JSON = os.path.join(os.path.dirname(__file__), '..', 'reserve.gen.json')
RESERVE = json.load(open(_RESERVE_JSON, encoding='utf-8')) \
    if os.path.exists(_RESERVE_JSON) else {}
DOSSIER_RESERVE = os.path.join(os.path.dirname(__file__), '..', 'reserve.gen')

# En deçà, le blanc ne se voit pas ; au-delà, la page paraît inachevée.
SEUIL_BLANC = 35 * MM
# Une planche plus étroite que cela ne montre plus rien : mieux vaut le
# blanc, qui au moins ne ment pas sur ce qu'on peut lire.
LARGEUR_MINI = 62 * MM


def bas_du_contenu(page, x0, x1, plafond, plancher):
    """Ordonnée du dernier élément de la COLONNE DE TEXTE.

    On ne regarde que la colonne : la marge de renvois porte ses QR bien
    plus bas, et les compter ferait passer une page trouée pour pleine."""
    bas = None
    for b in page.get_text('blocks'):
        if b[0] >= x1 or b[2] <= x0 or b[3] > plancher or b[3] < plafond:
            continue
        if bas is None or b[3] > bas:
            bas = b[3]
    for i in page.get_image_info():
        r = fitz.Rect(i['bbox'])
        if r.x0 >= x1 or r.x1 <= x0 or r.y1 > plancher or r.y1 < plafond:
            continue
        if bas is None or r.y1 > bas:
            bas = r.y1
    for g in page.get_drawings():
        r = g['rect']
        if r.x0 >= x1 or r.x1 <= x0 or r.y1 > plancher or r.y1 < plafond:
            continue
        if bas is None or r.y1 > bas:
            bas = r.y1
    return bas


ESPACE_LIGNE = 8 * MM


def lignes_notes(page, x0, x1, y, y_max):
    """Des lignes pour ecrire, la ou il ne reste rien a montrer.

    Le trait est pale : il doit s'effacer devant le texte de la page et ne
    se voir que si on cherche a ecrire dessus."""
    page.insert_text(fitz.Point(x0, y + 3 * MM), 'VOS NOTES',
                     fontname='ttitre', fontsize=6, color=LIGNE)
    ligne = y + 3 * MM + ESPACE_LIGNE
    while ligne <= y_max:
        page.draw_line(fitz.Point(x0, ligne), fitz.Point(x1, ligne),
                       color=LIGNE, width=0.5)
        ligne += ESPACE_LIGNE


def combler(doc, contextes, largeur):
    """Pose une planche de la réserve sur chaque page qui finit sur du vide.

    Renvoie (comblées, laissées, sans_reserve, notes)."""
    if not RESERVE:
        return 0, 0, 0, 0
    posees = set()
    combles = laisses = sans_reserve = notes = 0

    for i, (page, (genre, info, _codes)) in enumerate(zip(doc, contextes)):
        if genre in ('nue', 'lim') or not info:
            continue
        num = info[1] if isinstance(info, tuple) else info
        liste = RESERVE.get(str(num)) or []

        hauteur = page.rect.height
        pied_y = pied_de(hauteur)
        recto = (i % 2 == 0)
        x0 = GOUTTIERE if recto else EXTERIEUR
        x1 = largeur - (EXTERIEUR if recto else GOUTTIERE)
        plafond = (_R['haut_mm']) * MM

        # Le filet du pied est trace EXACTEMENT sur pied_y : compte comme
        # contenu, il faisait passer chaque page pour pleine et le
        # comblement ne posait jamais rien.
        bas = bas_du_contenu(page, x0, x1, plafond, pied_y - 2 * MM)
        if bas is None:
            continue
        blanc = pied_y - bas - 4 * MM      # on ne colle pas au filet du pied
        if blanc < SEUIL_BLANC:
            continue

        if not [q for q in liste if q['nom'] not in posees]:
            sans_reserve += 0 if liste else 1

        # On pose TANT QU'IL RESTE de la place. Une planche mesure 60 a
        # 70 mm de haut : seule, elle laissait encore 130 mm sur un trou de
        # 196, et la page restait trouee malgre le comblement.
        curseur = bas + 5 * MM
        pose_ici = 0
        while True:
            reste = pied_y - curseur - 4 * MM
            if reste < SEUIL_BLANC:
                break
            candidats = [q for q in liste if q['nom'] not in posees]
            if not candidats:
                break
            choisie = None
            for q in candidats:
                ratio = q['hauteur'] / q['largeur']
                larg = min(x1 - x0, (reste - 7 * MM) / ratio)
                if larg >= LARGEUR_MINI:
                    choisie = (q, larg, larg * ratio)
                    break
            if not choisie:
                break

            q, larg, haut = choisie
            img = os.path.join(DOSSIER_RESERVE, q['fichier'])
            if not os.path.exists(img):
                posees.add(q['nom'])
                continue

            # Centrée dans la colonne, posée sous ce qui précède.
            gx = x0 + (x1 - x0 - larg) / 2
            page.insert_image(fitz.Rect(gx, curseur, gx + larg, curseur + haut),
                              filename=img)
            page.insert_textbox(
                fitz.Rect(x0, curseur + haut + 1.2 * MM, x1, curseur + haut + 7 * MM),
                q['legende'], fontname='tcorps', fontsize=7.4, color=MUT,
                align=fitz.TEXT_ALIGN_CENTER)
            posees.add(q['nom'])
            curseur += haut + 9 * MM
            pose_ici += 1

        # Reste-t-il du vide ? La reserve du chapitre est epuisee, ou ses
        # planches ne tiennent plus. On ne bouche PAS avec une image hors
        # sujet : on rend la place au lecteur. Dans un livre de formation,
        # des lignes pour annoter valent mieux qu'un blanc, et mieux qu'une
        # illustration qui ne dit rien.
        reste = pied_y - curseur - 4 * MM
        if reste >= SEUIL_BLANC:
            lignes_notes(page, x0, x1, curseur, pied_y - 4 * MM)
            notes += 1

        if pose_ici:
            combles += 1
        else:
            laisses += 1

    return combles, laisses, sans_reserve, notes


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
    numero = 0
    nues = 0
    renvois_poses = 0
    _attendus = set()
    for _p in doc:
        _attendus.update(MARQUEUR_QR.findall(_p.get_text()))

    inventaire = {}            # code du référentiel -> [pages où il est vu]
    debuts = {}               # numéro de chapitre -> page où il commence
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
        MARGE_G = GOUTTIERE if recto else EXTERIEUR
        MARGE_D = EXTERIEUR if recto else GOUTTIERE

        if genre == 'ch':
            partie, num = info
            # La première page où paraît un chapitre est celle que le
            # sommaire doit annoncer, et celle que le signet doit viser.
            if num not in debuts:
                debuts[num] = (numero, i, partie)
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
        page.insert_text(fitz.Point(MARGE_G, PIED + 3.2 * MM),
                         'inerweb.fr · HabFluide, tome 1 — la théorie',
                         fontname='tcorps', fontsize=7.6, color=MUT)

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
            if place > MARGE_G + largeur_de('inerweb.fr · HabFluide, tome 1 — la théorie',
                                            'tcorps', 7.6) + 6 * MM:
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

        poses_ici = poser_renvois(page, recto, largeur, PIED)
        renvois_poses += poses_ici

    # ---- Aucune page ne se termine sur du vide ---------------------
    combles, laisses, sans_res, notes = combler(doc, contextes, largeur)
    if combles or laisses or sans_res or notes:
        print('  blancs : %d pages comblées par une planche du chapitre' % combles)
        if notes:
            print('           %d pages reçoivent des lignes de notes (réserve épuisée)' % notes)
        if laisses:
            print('           %d laissées — réserve du chapitre épuisée ou planche trop grande' % laisses)
        if sans_res:
            print('           %d laissées — ce chapitre n’a aucune planche à son sujet' % sans_res)

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
            marge_d = EXTERIEUR if recto else GOUTTIERE
            libelle = str(imprime)
            page.insert_font(fontname='ttitre', fontfile=POLICES['ttitre'])
            page.insert_text(
                fitz.Point(page.rect.width - marge_d - largeur_de(libelle, 'ttitre', 10),
                           ligne.y1 - 0.6),
                libelle, fontname='ttitre', fontsize=10, color=BLEU)
            poses += 1

    # ---- Les marqueurs internes quittent la couche texte -----------
    # Ils ont servi : la partie, le chapitre et les codes sont posés. Ils
    # restaient pourtant dans le PDF — invisibles à l'œil (1 pt, blanc sur
    # blanc) mais bien présents à la recherche, au copier-coller et à la
    # synthèse vocale. « @@D|11;8.01@@ » n'a rien à faire dans un livre.
    efface = 0
    for page in doc:
        zones = page.search_for('@@')
        if not zones:
            continue
        # Une paire de « @@ » encadre le marqueur : on efface d'un bout
        # à l'autre, en élargissant à peine pour prendre les caractères.
        for j in range(0, len(zones) - 1, 2):
            boite = zones[j] | zones[j + 1]
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
        'title': 'inerweb.fr HabFluide — tome 1 : la théorie',
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
    os.replace(chemin + '.tmp', chemin)

    with open(os.path.join(os.path.dirname(__file__), '..', 'inventaire-pages.gen.json'),
              'w', encoding='utf-8') as f:
        json.dump({c: sorted(set(p)) for c, p in sorted(inventaire.items())},
                  f, ensure_ascii=False, indent=1)
    print('  référentiel : %d codes marqués en pied de page' % len(inventaire))
    print('  marge  : %d renvois posés côté tranche (%d marqués dans le flux)'
          % (renvois_poses, len(_attendus)))
    _tous = set(RENVOIS)
    _perdus = sorted(_tous - _attendus)
    if _perdus:
        json.dump(_perdus, open('renvois-perdus.json', 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=1)
        print('           ⚠ %d renvois du manifeste absents du PDF → renvois-perdus.json'
              % len(_perdus))
    if MANQUANTS:
        from collections import Counter
        for raison, n in Counter(r for _, r in MANQUANTS).most_common():
            print('           ⚠ %d non posés — %s' % (n, raison))
        print('             ex. : %s' % ', '.join(s for s, _ in MANQUANTS[:6]))
    print('  nettoyage : %d marqueurs internes effacés · %d signets posés'
          % (efface, len(debuts)))
    print('  sommaire : %d numéros de page écrits' % poses)
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
